import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';
import { build, createServer, preview } from 'vite';
import react from '@vitejs/plugin-react';
import Papa from 'papaparse';
import { ALL_CONTENT_IDS, getContentDefinition } from '../src/constants/sukimakunContents.js';

// Reuses B/C's isolated verification approach. Never reads .env or uses live
// credentials. Only this explicit entry point substitutes recognition in memory.
const root = fileURLToPath(new URL('../', import.meta.url));
const port = 5193;
const contents = ['kanji_test', 'camp_science_qa', 'camp_social_qa', 'camp_kagawa_kanji'];
const rows = Object.fromEntries(await Promise.all(contents.map(async (id) => [id,
  Papa.parse(await readFile(path.join(root, 'public', getContentDefinition(id).dataFile), 'utf8'), {
    header: true, skipEmptyLines: true
  }).data.filter((row) => id === 'kanji_test' ? row['答え'] : row.id)
])));
let logs, saved, counts;
let mode = 'correct';
const reset = (count) => {
  logs = contents.map((contentId) => {
    const chosen = contentId === 'camp_social_qa'
      ? ['歴史', '地理', '公民'].flatMap((subject) => rows[contentId].filter((row) => row['歴史or地理'] === subject).slice(0, count))
      : rows[contentId].slice(0, count);
    return { contentId, history: chosen.map((row, index) =>
      `[${index + 1}]${contentId === 'kanji_test' ? row['問題'] : `${contentId}::${row.id}`}(×)`).join(', ') };
  });
  saved = [];
  counts = { recognition: 0, batch: 0, single: 0, save: 0, getLogs: 0, login: 0, sso: 0, restore: 0 };
};
reset(35);
const session = {
  result: 'success', userId: 'local-abc', name: '統合版ローカル確認', school: '模擬',
  studentSessionToken: 'abc-mock-session-only', allowedContentIds: ALL_CONTENT_IDS, permissionsInitialized: true
};
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self' data:; worker-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";
const first = rows.kanji_test[0];
const panel = `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>スキマ君 A・B・C統合版 ローカル確認</title>
<style>body{margin:0;font:14px sans-serif;background:#f2f5fa}header{padding:12px;background:#fff}button,select,a{padding:5px;margin:3px}p{margin:7px 0}iframe{width:100%;height:78vh;border:0}#status{white-space:pre-wrap;font-size:12px}</style>
<header><strong>スキマ君 A・B・C統合版／外部API遮断モック</strong>
<p>模擬ID <b>local-abc</b> ／ パスワード <b>mock-only</b>。Version 4.3.0。実アカウントは使わないでください。</p>
<label>誤答件数 <select id="count">${[0, 1, 3, 20, 21, 35].map((n) => `<option${n === 35 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
<button id="reset">模擬履歴を初期化</button><label>模擬採点 <select id="mode"><option value="correct">正解</option><option value="wrong">誤答</option></select></label>
<button id="refresh">保存状況を更新</button><a href="/" target="_blank">アプリを別タブで開く</a><a href="/?uid=local-abc&tk=mock-sso-only" target="_blank">模擬SSO</a>
<p>通常漢字は国語→定期テスト漢字。教材「${first['テキスト']}」の${first['ページ']}から模擬誤答があります。1～3問の確認には件数を変更後「模擬履歴を初期化」を押し、アプリで復習一覧を再取得してください。</p>
<p>理科・合宿漢字は指定件数、社会は歴史・地理・公民それぞれ指定件数の模擬誤答を用意します。社会の復習は複数選択の合計で最大20問。合宿結果から3教材の合宿メニューに戻ることも確認してください。</p>
<p>漢字は全枠に線を書くと模擬採点へ進みます。「覚えていない」は認識なしで×。理科・社会はReact一次判定を維持し、別表現だけ模擬Geminiへ送ります。手書き認識精度・実GAS保存成功の検証にはなりません。</p><p id="status"></p></header>
<iframe src="/" title="スキマ君統合版アプリ"></iframe><script>
async function status(){const s=await(await fetch('/__mock/status')).json();document.querySelector('#status').textContent='模擬保存 '+s.savedCount+'件 ／ 認識 '+s.counts.recognition+'回 ／ 一括採点 '+s.counts.batch+'回\\n最新: '+(s.latestHistory||'保存なし')+'\\n社会の最新出題内訳: '+JSON.stringify(s.latestSocialSubjects);}
async function control(data){await fetch('/__mock/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});await status();}
document.querySelector('#reset').onclick=()=>control({count:Number(document.querySelector('#count').value)});
document.querySelector('#mode').onchange=e=>control({mode:e.target.value});document.querySelector('#refresh').onclick=status;status();
</script></html>`;
const json = (res, data, status = 200) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
};
const body = async (req) => {
  let input = '';
  for await (const chunk of req) {
    input += chunk;
    if (input.length > 100000) throw new Error('Mock body too large');
  }
  return JSON.parse(input || '{}');
};
const middleware = async (req, res, next) => {
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('Cache-Control', 'no-store');
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pathname === '/__abc') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(panel); return;
  }
  if (!pathname.startsWith('/__mock')) { next(); return; }
  try {
    if (pathname === '/__mock/status' && req.method === 'GET') {
      const social = saved.findLast((log) => log.contentId === 'camp_social_qa');
      const latestSocialSubjects = Object.fromEntries(['歴史', '地理', '公民'].map((subject) => [subject,
        social ? rows.camp_social_qa.filter((row) => row['歴史or地理'] === subject && social.history.includes(`camp_social_qa::${row.id}(`)).length : 0
      ]));
      // Never expose credentials/session fields in the diagnostic panel.
      json(res, { mode, counts, savedCount: saved.length, latestHistory: saved.at(-1)?.history || null, latestSocialSubjects,
        saved: saved.map(({ contentId, history, score, total, answerDetails }) => ({ contentId, history, score, total, answerDetails })) }); return;
    }
    if (req.method !== 'POST') { json(res, { error: 'POST only' }, 405); return; }
    const payload = await body(req);
    if (pathname === '/__mock/control') {
      if ([0, 1, 3, 20, 21, 35].includes(payload.count)) reset(payload.count);
      if (['correct', 'wrong'].includes(payload.mode)) mode = payload.mode;
      json(res, { result: 'success' }); return;
    }
    if (pathname === '/__mock-recognition') {
      if (typeof payload.__mockExpectedAnswer !== 'string' || !payload.__mockExpectedAnswer) throw new Error('Missing mock answer');
      counts.recognition++;
      json(res, ['SUCCESS', [['mock', [mode === 'correct' ? payload.__mockExpectedAnswer : '模擬誤答']]]]); return;
    }
    if (pathname === '/__mock-auth') {
      if (payload.action === 'login') {
        counts.login++;
        json(res, payload.userId === session.userId && payload.password === 'mock-only' ? session : { result: 'error', message: '模擬IDを使用してください' }); return;
      }
      if (payload.action === 'validateToken' && payload.userId === session.userId && payload.token === 'mock-sso-only') {
        counts.sso++; json(res, session); return;
      }
      if (['validateStudentSession', 'touchStudentSession', 'revokeStudentSession'].includes(payload.action)
        && payload.studentSessionToken === session.studentSessionToken) {
        if (payload.action === 'validateStudentSession') counts.restore++;
        json(res, session); return;
      }
      if (payload.action === 'checkAnswersWithGemini' && Array.isArray(payload.answers)) {
        counts.batch++;
        json(res, { result: 'success', requestId: payload.requestId,
          results: payload.answers.map(({ index }) => ({ index, isCorrect: mode === 'correct' })) }); return;
      }
      if (payload.action === 'checkWithGemini') {
        counts.single++; json(res, { result: mode === 'correct' ? 'true' : 'false' }); return;
      }
    }
    if (pathname === '/__mock-log' && payload.studentSessionToken === session.studentSessionToken) {
      if (payload.action === 'getLogs') {
        counts.getLogs++;
        const contentId = payload.contentId || ALL_CONTENT_IDS.find((id) => getContentDefinition(id).logSheetName === payload.sheetName);
        json(res, logs.filter((log) => log.contentId === contentId)); return;
      }
      if (payload.action === 'saveLog' && ALL_CONTENT_IDS.includes(payload.contentId) && payload.studentId === session.userId) {
        if ('attemptId' in payload) throw new Error('Unexpected attemptId');
        counts.save++; saved.push(payload); logs.unshift({ contentId: payload.contentId, history: payload.history });
        json(res, { result: 'success' }); return;
      }
    }
    json(res, { error: 'Unsupported mock request' }, 400);
  } catch { json(res, { error: 'Invalid mock request' }, 400); }
};
const transformApp = (code) => {
  const endpoint = /fetch\((['"])https:\/\/inputtools\.google\.com\/request[^'"]*\1/g;
  if ([...code.matchAll(endpoint)].length !== 1 || code.split('app_version: 0.4,').length !== 2) {
    throw new Error('Recognition source changed; refusing to enable mock');
  }
  return code.replace(endpoint, "fetch('/__mock-recognition'")
    .replace('app_version: 0.4,', 'app_version: 0.4, __mockExpectedAnswer: quizItems[qIndex]?.en,');
};
const scratch = await mkdtemp(path.join(tmpdir(), 'student-abc-mock-'));
const config = {
  root, configFile: false, envDir: false, envPrefix: '__ABC_MOCK_NO_ENV__', cacheDir: path.join(scratch, 'cache'),
  plugins: [{ name: 'abc-local-mock', enforce: 'pre',
    transform(code, id) {
      if (id.split('?')[0].replaceAll('\\', '/').endsWith('/src/App.jsx')) return transformApp(code);
    },
    configureServer(vite) { vite.middlewares.use(middleware); },
    configurePreviewServer(vite) { vite.middlewares.use(middleware); }
  }, react()],
  define: {
    'import.meta.env.VITE_GAS_URL': JSON.stringify('/__mock-auth'),
    'import.meta.env.VITE_LOG_GAS_URL': JSON.stringify('/__mock-log'),
    'import.meta.env.VITE_API_KEY': JSON.stringify('')
  },
  server: { host: '127.0.0.1', port, strictPort: true, hmr: false },
  preview: { host: '127.0.0.1', port, strictPort: true },
  build: { outDir: path.join(scratch, 'dist'), emptyOutDir: true },
  logLevel: 'error'
};
if (process.argv.includes('--check')) {
  new Script(panel.match(/<script>([\s\S]*?)<\/script>/)[1]);
  const request = async (url, payload) => {
    let text, status;
    const headers = {};
    const req = Readable.from(payload ? [JSON.stringify(payload)] : []);
    Object.assign(req, { url, method: payload ? 'POST' : 'GET' });
    const res = { statusCode: 200, setHeader: (key, value) => { headers[key] = value; }, end: (value) => { text = value; status = res.statusCode; } };
    await middleware(req, res, () => { throw new Error('Unexpected fallthrough'); });
    assert.equal(headers['Content-Security-Policy'], csp);
    return { status, data: JSON.parse(text) };
  };
  for (const count of [0, 1, 3, 20, 21, 35]) {
    await request('/__mock/control', { count });
    for (const contentId of contents) {
      const result = await request('/__mock-log', { action: 'getLogs', contentId, studentSessionToken: session.studentSessionToken });
      assert.equal(result.data[0].history ? result.data[0].history.split(', ').length : 0, count * (contentId === 'camp_social_qa' ? 3 : 1));
    }
  }
  assert.equal((await request('/__mock-auth', { action: 'login', userId: 'invalid', password: 'invalid' })).data.result, 'error');
  assert.equal((await request('/__mock-auth', { action: 'login', userId: session.userId, password: 'mock-only' })).data.result, 'success');
  assert.equal((await request('/__mock-auth', { action: 'validateToken', userId: session.userId, token: 'mock-sso-only' })).data.result, 'success');
  assert.equal((await request('/__mock-auth', { action: 'validateStudentSession', studentSessionToken: session.studentSessionToken })).data.result, 'success');
  for (const mode of ['correct', 'wrong']) {
    await request('/__mock/control', { mode });
    assert.equal((await request('/__mock-recognition', { __mockExpectedAnswer: '問題' })).data[1][0][1][0], mode === 'correct' ? '問題' : '模擬誤答');
    const result = await request('/__mock-auth', { action: 'checkAnswersWithGemini', requestId: 'mock-only', answers: [{ index: 2 }] });
    assert.equal(result.data.results[0].isCorrect, mode === 'correct');
  }
  await request('/__mock-log', { action: 'saveLog', contentId: 'camp_kagawa_kanji', studentId: session.userId,
    studentSessionToken: session.studentSessionToken, history: '[1]camp_kagawa_kanji::mock(◎)', score: 1, total: 1 });
  assert.equal((await request('/__mock/status')).data.savedCount, 1);
  assert.equal((await request('/__mock-auth', { action: 'unknown' })).status, 400);
  assert.equal((await request('/__mock-log', { action: 'getLogs', studentSessionToken: 'invalid' })).status, 400);
  assert.doesNotMatch(transformApp(await readFile(path.join(root, 'src/App.jsx'), 'utf8')), /https:\/\/inputtools\.google\.com/);
  const server = await createServer(config);
  try {
    const transformed = await server.transformRequest('/src/App.jsx');
    for (const destination of ['__mock-recognition', '__mock-auth', '__mock-log']) assert.ok(transformed.code.includes(destination));
    assert.equal(transformed.code.includes('https://inputtools.google.com'), false);
  } finally { await server.close(); }
  await build(config);
  console.log('PASS: mock fixtures, auth/login/SSO/session, batch/recognition/save, CSP, substituted destinations, isolated build. No live API contacted.');
} else {
  await build(config);
  const server = await preview(config);
  console.log(`A・B・C統合モック起動: http://127.0.0.1:${port}/__abc`);
  console.log('模擬ID local-abc / mock-only。外部APIはCSPで遮断。ブラウザ到達・操作は別途確認。停止 Ctrl+C。');
  const close = () => server.httpServer.close(() => process.exit(0));
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}
