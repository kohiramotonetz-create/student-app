import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseLogHistory } from '../src/utils/reviewHistory.js';

// Explicitly opt in: npm run test:home-browser. No dependency download or live API access.
// Resolve an installed Playwright, or set PLAYWRIGHT_MODULE_PATH to an existing installation.
const enabled = process.argv.includes('--run-browser');
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const allowedActions = new Set([
  'login', 'validateToken', 'validateStudentSession', 'touchStudentSession',
  'revokeStudentSession', 'getLogs', 'saveLog', 'checkWithGemini', 'checkAnswersWithGemini'
]);
const storageSentinel = 'preserved-unrelated-local-state';
const authResponse = (allowedContentIds = ['preposition_test']) => ({
  result: 'success', userId: 'mock-student', name: 'ローカル確認', school: 'ローカル',
  studentSessionToken: 'mock-session-only', allowedContentIds, permissionsInitialized: true
});

async function waitForHome(page) {
  await page.getByRole('heading', { name: '学習をはじめる', exact: true }).waitFor();
  await page.locator('.loading-overlay').waitFor({ state: 'detached' });
  await page.getByText('作成中・・・', { exact: true }).waitFor();
  assert.equal(await page.locator('vite-error-overlay').count(), 0);
}

async function assertLearningOnlyHome(page) {
  assert.equal(await page.locator('[data-local-xp-verification], [data-local-character-selection], [data-local-character-album], [data-local-shop], [role="dialog"]').count(), 0);
  assert.equal(await page.getByRole('button', { name: /キャラクター|ショップ|育成|XP|ポイント|翌日|休む/ }).count(), 0);
  assert.equal(await page.getByText(/所持ポイント|累計 .* XP|獲得.*XP|連続学習/).count(), 0);
  assert.equal(await page.locator('.student-home__character-preparing img').count(), 0);
  if (await page.locator('.student-home').count()) {
    assert.deepEqual(await page.locator('.student-home__glass-nav button').allTextContents(), ['ホーム', '記録', 'ランキング', '設定']);
    assert.equal(await page.locator('.student-home__glass-nav button:disabled').count(), 3);
  }
}

async function newSession(browser, baseUrl, response = authResponse(), { restore = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const requests = [];
  const blocked = [];
  const errors = [];
  const logs = [{ contentId: 'preposition_test', history: '[1]preposition_test::prep_at__en_ja(×)' }];
  await context.addInitScript(({ storageSentinel, restore }) => {
    // Detect accidental clearing of unrelated browser storage during authentication and learning.
    localStorage.setItem('home-test.saved-state', storageSentinel);
    if (restore) sessionStorage.setItem('sukimakun.studentSessionToken', 'mock-session-only');
    window.__homeIntervals = [];
    const originalInterval = window.setInterval.bind(window);
    window.setInterval = (callback, delay, ...args) => {
      // Vite HMR owns its development websocket heartbeat; only app timers matter here.
      if (!new Error().stack.includes('/@vite/client')) window.__homeIntervals.push(delay);
      return originalInterval(callback, delay, ...args);
    };
    // A test-only devtools hook observes real App props/state without modifying application code.
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      renderers: new Map(),
      inject(renderer) { this.renderers.set(1, renderer); return 1; },
      onCommitFiberRoot(_id, fiberRoot) { window.__homeReactRoot = fiberRoot; },
      onCommitFiberUnmount() {}
    };
  }, { storageSentinel, restore });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname !== '127.0.0.1') {
      blocked.push(url.hostname);
      await route.abort('blockedbyclient');
      return;
    }
    if (url.pathname === '/__mock-auth' || url.pathname === '/__mock-log') {
      const payload = JSON.parse(request.postData() || '{}');
      requests.push(payload);
      const result = payload.action === 'getLogs' ? logs
        : payload.action === 'checkWithGemini' ? { result: true }
        : payload.action === 'checkAnswersWithGemini' ? {
          result: 'success', requestId: payload.requestId,
          results: payload.answers.map(({ index }) => ({ index, isCorrect: true }))
        } : response;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
      return;
    }
    await route.continue();
  });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  page.on('pageerror', () => errors.push('uncaught browser exception'));
  page.on('console', (message) => { if (message.type() === 'error') errors.push('browser console error'); });
  page.on('dialog', (dialog) => dialog.dismiss());
  page.setDefaultTimeout(15000);
  return {
    context, page, requests, logs,
    async open(query = '') { await page.goto(`${baseUrl}/${query}`); },
    async login() {
      await this.open();
      await page.getByPlaceholder('生徒番号').fill('mock-student');
      await page.getByPlaceholder('パスワード(初期:1234)').fill('mock-password-only');
      await page.getByRole('button', { name: 'ログイン', exact: true }).click();
      await waitForHome(page);
    },
    async verify() {
      assert.deepEqual(blocked, [], 'No external endpoint should even be attempted');
      assert.deepEqual(errors, [], 'Browser should have no runtime/console errors');
      assert.deepEqual(requests.filter(({ action }) => !allowedActions.has(action)).map(({ action }) => action), [], 'Growth API calls must not occur');
      assert.equal(await page.evaluate(() => localStorage.getItem('home-test.saved-state')), storageSentinel);
      // Session keepalive is existing authentication behavior, not a growth timer.
      assert.ok((await page.evaluate(() => window.__homeIntervals)).every((delay) => delay === 30 * 60 * 1000));
    }
  };
}

async function captureHomeScreenshot(page, outputPath) {
  await page.mouse.move(0, 0);
  await page.screenshot({ path: outputPath, fullPage: true, animations: 'disabled' });
  if (!process.env.HOME_BROWSER_BASELINE_DIR) return;
  const { PNG } = require(process.env.HOME_BROWSER_PNG_MODULE_PATH || 'pngjs');
  const before = PNG.sync.read(await readFile(path.join(process.env.HOME_BROWSER_BASELINE_DIR, path.basename(outputPath))));
  const after = PNG.sync.read(await readFile(outputPath));
  assert.equal(after.width, before.width, 'Home screenshot width must remain unchanged');
  assert.equal(after.height, before.height, 'Home screenshot height must remain unchanged');
  let changedPixels = 0;
  for (let offset = 0; offset < before.data.length; offset += 4) {
    if (before.data.subarray(offset, offset + 4).compare(after.data.subarray(offset, offset + 4)) !== 0) changedPixels += 1;
  }
  assert.equal(changedPixels, 0, path.basename(outputPath) + ': home must match the approved baseline pixel for pixel');
}

async function openPrepositions(page) {
  await page.locator('.student-home__subject.is-blue').click();
  await page.getByRole('button', { name: '前置詞テスト', exact: false }).click();
  await page.getByRole('heading', { name: /前置詞テスト/ }).waitFor();
}

async function answerQuiz(page, answersByEnglish, count) {
  for (let index = 0; index < count; index += 1) {
    await page.getByText(`Q ${index + 1} / ${count}`, { exact: true }).waitFor();
    const question = (await page.locator('.q-word-area').innerText()).trim();
    assert.ok(answersByEnglish.has(question), 'Question must come from the existing CSV');
    await page.getByPlaceholder('答えを入力...').fill(answersByEnglish.get(question));
    await page.getByRole('button', { name: '回答する', exact: true }).click();
    await page.getByText('✅ 正解！', { exact: true }).waitFor();
    await page.getByRole('button', { name: '次へ進む', exact: true }).click();
  }
  await page.getByRole('heading', { name: '結果発表', exact: true }).waitFor();
}

async function assertSingleLog(session, expectedCount, questionCount, review = false) {
  await session.page.waitForFunction(() => document.body.innerText.includes('結果発表'));
  // A local route receives fetch asynchronously; wait on a concrete request instead of sleeping.
  for (let index = 0; index < 50 && session.requests.filter(({ action }) => action === 'saveLog').length < expectedCount; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const saved = session.requests.filter(({ action }) => action === 'saveLog');
  assert.equal(saved.length, expectedCount, 'Exactly one normal log is saved per completion');
  const payload = saved.at(-1);
  assert.equal(payload.contentId, 'preposition_test');
  assert.equal(payload.sheetName, '前置詞テスト');
  assert.equal(payload.total, questionCount);
  assert.equal(payload.score, questionCount);
  assert.equal(payload.mode, 'en-ja');
  assert.equal(Object.hasOwn(payload, 'attemptId'), false, 'Unpublished mission/XP processing must not be triggered');
  assert.equal(Object.hasOwn(payload, 'isReview'), false);
  assert.equal(payload.answerDetails.length, questionCount);
  const history = parseLogHistory(payload.history);
  assert.equal(history.length, questionCount);
  assert.ok(history.every(({ key, result }) => key.startsWith('preposition_test::') && result === (review ? '◎' : '○')));
}

for (const mode of ['development', 'production']) {
  test(`home prerelease browser: ${mode}`, { skip: !enabled, timeout: 240000 }, async (t) => {
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
    const { createServer, build, preview } = await import('vite');
    const { default: react } = await import('@vitejs/plugin-react');
    const temp = await mkdtemp(path.join(tmpdir(), 'student-home-browser-'));
    const artifacts = process.env.HOME_BROWSER_ARTIFACTS_DIR || path.join(temp, 'screenshots');
    await mkdir(artifacts, { recursive: true });
    const config = {
      root, configFile: false, envDir: false, envPrefix: '__HOME_TEST_NO_ENV__',
      plugins: [react()], logLevel: 'error',
      define: {
        'import.meta.env.VITE_GAS_URL': JSON.stringify('/__mock-auth'),
        'import.meta.env.VITE_LOG_GAS_URL': JSON.stringify('/__mock-log'),
        'import.meta.env.VITE_API_KEY': JSON.stringify(''),
        'import.meta.env.VITE_ENABLE_LOCAL_PREPOSITION_TEST': JSON.stringify('true')
      },
      server: { host: '127.0.0.1', port: 0 },
      preview: { host: '127.0.0.1', port: 0 },
      build: { outDir: path.join(temp, 'dist'), emptyOutDir: true }
    };
    let server;
    let browser;
    try {
      if (mode === 'production') {
        await build(config);
        server = await preview(config);
      } else {
        server = await createServer(config);
        await server.listen();
      }
      const port = server.httpServer.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;
      browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
      const Papa = (await import('papaparse')).default;
      const rows = Papa.parse(await readFile(path.join(root, 'public/prepositions.csv'), 'utf8'), { header: true, skipEmptyLines: true }).data;
      const answersByEnglish = new Map(rows.map((row) => [row.English, row['日本語'].split(/[／/]/)[0]]));

      await t.test('normal login, desktop/narrow home, permissions, and logout', async () => {
        const session = await newSession(browser, baseUrl);
        try {
          await session.login();
          await assertLearningOnlyHome(session.page);
          assert.equal(await session.page.locator('.student-home__subject').count(), 1);
          assert.equal(await session.page.getByRole('button', { name: /高校生モード/ }).count(), 0);
          const headings = await session.page.locator('.student-home__main h2').allTextContents();
          assert.deepEqual(headings, ['今日のミッション', '学習をはじめる', 'キャラクター育成', '最近の学習・復習']);
          assert.match(await session.page.locator('.student-home__mission').innerText(), /準備中/);
          assert.doesNotMatch(await session.page.locator('.student-home__mission').innerText(), /(?:^|\s)0\s*\//);
          await captureHomeScreenshot(session.page, path.join(artifacts, `${mode}-home-desktop.png`));
          await session.page.setViewportSize({ width: 390, height: 844 });
          assert.equal(await session.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'Narrow home must not overflow horizontally');
          await captureHomeScreenshot(session.page, path.join(artifacts, `${mode}-home-narrow.png`));
          await session.page.setViewportSize({ width: 1440, height: 1000 });
          await session.page.locator('.student-home__subject.is-blue').click();
          assert.deepEqual(await session.page.locator('.student-home__content-button').allTextContents(), ['🧭前置詞テスト']);
          await session.page.getByRole('button', { name: 'ホームへ戻る', exact: true }).click();
          await session.page.getByRole('button', { name: 'ログアウト', exact: true }).click();
          await session.page.getByPlaceholder('生徒番号').waitFor();
          assert.equal(await session.page.evaluate(() => sessionStorage.getItem('sukimakun.studentSessionToken')), null);
          assert.ok(session.requests.some(({ action }) => action === 'revokeStudentSession'));
          await session.verify();
        } finally { await session.context.close(); }
      });

      await t.test('all existing subject entrances and full home layout stay usable', async () => {
        const session = await newSession(browser, baseUrl, authResponse([
          'kakitan', 'junior_english_quiz', 'irregular_verbs', 'preposition_test',
          'kanji_test', 'chemistry_formulas', 'camp_science_qa', 'camp_social_qa', 'target_1900'
        ]));
        try {
          await session.login();
          await assertLearningOnlyHome(session.page);
          assert.equal(await session.page.locator('.student-home__subject').count(), 5);
          assert.deepEqual(await session.page.locator('.student-home__mission-progress b').allTextContents(), ['-- / 3', '-- / 3']);
          assert.equal(await session.page.evaluate(() => [...document.images].some((image) => !image.complete || image.naturalWidth === 0)), false);
          await captureHomeScreenshot(session.page, path.join(artifacts, `${mode}-home-all-desktop.png`));
          await session.page.setViewportSize({ width: 390, height: 844 });
          assert.equal(await session.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
          await captureHomeScreenshot(session.page, path.join(artifacts, `${mode}-home-all-narrow.png`));
          await session.page.setViewportSize({ width: 1440, height: 1000 });
          await session.page.locator('.student-home__subject.is-blue').click();
          await session.page.getByRole('button', { name: /書き単/, exact: false }).click();
          await session.page.getByRole('heading', { name: /書き単 設定/ }).waitFor();
          await session.page.getByRole('button', { name: '戻る', exact: true }).click();
          await waitForHome(session.page);
          await session.page.locator('.student-home__subject.is-rose').click();
          await session.page.getByRole('button', { name: /定期テスト 漢字対策/ }).click();
          await session.page.getByRole('button', { name: '戻る', exact: true }).waitFor();
          assert.ok(await session.page.locator('.quiz-container').isVisible());
          await session.page.getByRole('button', { name: '戻る', exact: true }).click();
          await waitForHome(session.page);
          await session.verify();
        } finally { await session.context.close(); }
      });
      await t.test('normal completion and review preserve one log and history per test without growth', async () => {
        const session = await newSession(browser, baseUrl);
        try {
          await session.login();
          await openPrepositions(session.page);
          await session.page.getByRole('button', { name: 'スタート！', exact: true }).click();
          await answerQuiz(session.page, answersByEnglish, 20);
          await assertSingleLog(session, 1, 20);
          await assertLearningOnlyHome(session.page);
          await session.page.getByRole('button', { name: 'メニューへ戻る', exact: true }).click();
          await waitForHome(session.page);
          assert.equal(session.requests.filter(({ action }) => action === 'saveLog').length, 1);
          await openPrepositions(session.page);
          await session.page.getByRole('button', { name: /間違えた問題を復習/ }).click();
          await session.page.getByRole('button', { name: '復習テストを開始', exact: true }).click();
          await answerQuiz(session.page, answersByEnglish, 1);
          await assertSingleLog(session, 2, 1, true);
          assert.equal(session.requests.filter(({ action }) => action === 'getLogs').length, 1);
          await session.page.getByRole('button', { name: 'メニューへ戻る', exact: true }).click();
          await waitForHome(session.page);
          await session.verify();
        } finally { await session.context.close(); }
      });

      await t.test('SSO and existing high-school/camp routes keep permission filters', async () => {
        const session = await newSession(browser, baseUrl, authResponse(['target_1900', 'camp_science_qa']));
        try {
          await session.open('?uid=mock-student&tk=mock-sso-only');
          await waitForHome(session.page);
          assert.equal(new URL(session.page.url()).search, '');
          assert.ok(session.requests.some(({ action }) => action === 'validateToken'));
          await session.page.getByRole('button', { name: '高校生モードへ', exact: true }).click();
          await session.page.getByRole('heading', { name: /高校生モード/ }).waitFor();
          assert.deepEqual(await session.page.locator('.button-grid button').allTextContents(), ['ターゲット1900']);
          await session.page.getByRole('button', { name: 'ターゲット1900', exact: true }).click();
          await session.page.getByRole('heading', { name: /ターゲット1900/ }).waitFor();
          await session.page.getByRole('button', { name: '戻る', exact: true }).click();
          await session.page.getByRole('button', { name: '戻る', exact: true }).click();
          await waitForHome(session.page);
          await session.page.getByRole('button', { name: /特別モード/ }).click();
          assert.equal(await session.page.locator('.button-grid button').count(), 1);
          await session.page.getByRole('button', { name: /理科\s+一問一答/ }).click();
          await session.page.getByRole('heading', { name: /理科\s+一問一答/ }).waitFor();
          await session.verify();
        } finally { await session.context.close(); }
      });

      await t.test('restored session with zero permissions reaches a usable empty home', async () => {
        const session = await newSession(browser, baseUrl, authResponse([]), { restore: true });
        try {
          await session.open();
          await waitForHome(session.page);
          await session.page.getByText('利用可能なコンテンツがありません。', { exact: true }).waitFor();
          assert.equal(await session.page.locator('.student-home__subject').count(), 0);
          assert.ok(session.requests.some(({ action }) => action === 'validateStudentSession'));
          await assertLearningOnlyHome(session.page);
          await session.verify();
        } finally { await session.context.close(); }
      });

      await t.test('SSO missing permissions fails closed without exposing learning', async () => {
        const response = authResponse();
        delete response.allowedContentIds;
        const session = await newSession(browser, baseUrl, response);
        try {
          await session.open('?uid=mock-student&tk=mock-sso-only');
          await session.page.getByRole('alert').waitFor();
          assert.equal(await session.page.locator('.student-home').count(), 0);
          assert.equal(await session.page.getByRole('button', { name: /スタート|前置詞テスト/ }).count(), 0);
          await session.verify();
        } finally { await session.context.close(); }
      });

      await t.test('direct disallowed content navigation remains blocked', async () => {
        const session = await newSession(browser, baseUrl);
        try {
          await session.login();
          const denied = await session.page.evaluate(() => {
            const find = (fiber) => fiber && (fiber.memoizedProps?.openContent && fiber.memoizedProps?.isContentAllowed ? fiber : find(fiber.child) || find(fiber.sibling));
            const menu = find(window.__homeReactRoot?.current);
            if (!menu) throw new Error('Menu was not available for permission regression check');
            return menu.memoizedProps.openContent('kanji_test', 'kanji-setup');
          });
          assert.equal(denied, false);
          await session.page.getByRole('alert').waitFor();
          await waitForHome(session.page);
          await assertLearningOnlyHome(session.page);
          await session.verify();
        } finally { await session.context.close(); }
      });

      await t.test('all 25 existing content entrances remain usable', async () => {
        const { SUKIMAKUN_CONTENTS, JUNIOR_HOME_SUBJECT_IDS } = await import('../src/constants/sukimakunContents.js');
        assert.equal(SUKIMAKUN_CONTENTS.length, 25);
        const session = await newSession(browser, baseUrl, authResponse(SUKIMAKUN_CONTENTS.map(({ contentId }) => contentId)));
        try {
          await session.login();
          const subjectIndex = { english: 0, japanese: 1, science: 2, social: 3 };
          for (const content of SUKIMAKUN_CONTENTS) {
            if (content.menuGroup.startsWith('highschool-')) {
              await session.page.getByRole('button', { name: '高校生モードへ', exact: true }).click();
              await session.page.getByRole('button', { name: content.displayName, exact: true }).click();
            } else {
              const subject = Object.keys(JUNIOR_HOME_SUBJECT_IDS).find((key) => JUNIOR_HOME_SUBJECT_IDS[key].includes(content.contentId));
              assert.ok(subject, 'Every junior content must remain reachable from a subject');
              await session.page.locator('.student-home__subject').nth(subjectIndex[subject]).click();
              await session.page.locator('.student-home__content-button').filter({ hasText: content.displayName }).click();
            }
            await session.page.getByRole('button', { name: content.contentId === 'chemistry_formulas' ? 'メニューに戻る' : '戻る', exact: true }).first().waitFor();
            assert.equal(await session.page.locator('.student-home').count(), 0, content.contentId + ' must open its setup');
            await session.page.reload();
            await waitForHome(session.page);
          }
          await session.verify();
        } finally { await session.context.close(); }
      });

      await t.test('camp science keeps one Gemini batch and one legacy log without reward fields', async () => {
        const session = await newSession(browser, baseUrl, authResponse(['camp_science_qa']));
        try {
          await session.login();
          await session.page.locator('.student-home__subject').first().click();
          await session.page.locator('.student-home__content-button').click();
          await session.page.getByRole('checkbox').first().check();
          await session.page.getByRole('button', { name: 'スタート！', exact: true }).click();
          const header = await session.page.locator('.q-header').innerText();
          const count = Number(header.split('/')[1].trim());
          assert.ok(count > 0 && count <= 20);
          for (let index = 0; index < count; index += 1) {
            await session.page.getByText('Q ' + (index + 1) + ' / ' + count, { exact: true }).waitFor();
            await session.page.getByPlaceholder('答えを入力...').fill('モック採点用の回答');
            await session.page.getByRole('button', { name: index + 1 === count ? 'テストを終了して採点' : '次へ', exact: true }).click({ delay: 300 });
          }
          await session.page.getByRole('heading', { name: '結果発表', exact: true }).waitFor();
          for (let index = 0; index < 50 && !session.requests.some(({ action }) => action === 'saveLog'); index += 1) await new Promise((resolve) => setTimeout(resolve, 20));
          const batches = session.requests.filter(({ action }) => action === 'checkAnswersWithGemini');
          const logs = session.requests.filter(({ action }) => action === 'saveLog');
          assert.equal(batches.length, 1);
          assert.equal(batches[0].answers.length, count);
          assert.equal(logs.length, 1);
          assert.equal(logs[0].contentId, 'camp_science_qa');
          assert.equal(logs[0].score, count);
          assert.equal(logs[0].total, count);
          assert.equal(Object.hasOwn(logs[0], 'attemptId'), false);
          assert.equal(Object.hasOwn(logs[0], 'isReview'), false);
          await session.verify();
        } finally { await session.context.close(); }
      });
      t.diagnostic(`Screenshots: ${artifacts}`);
    } finally {
      if (browser) await browser.close();
      if (server?.close) await server.close();
      else if (server?.httpServer) await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()));
    }
  });
}
