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
  'revokeStudentSession', 'getLogs', 'saveLog'
]);
const savedGrowth = JSON.stringify({ character: 'saved-test-character', xp: 1200, points: 900, album: ['saved'] });
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

async function assertGrowthHidden(page) {
  assert.equal(await page.locator('[data-local-xp-verification], [data-local-character-selection], [data-local-character-album], [data-local-shop], [role="dialog"]').count(), 0);
  assert.equal(await page.getByRole('button', { name: /キャラクター|ショップ|育成|XP|ポイント|翌日|休む/ }).count(), 0);
  assert.equal(await page.getByText(/所持ポイント|累計 .* XP|獲得.*XP|連続学習/).count(), 0);
  assert.equal(await page.locator('.student-home__character-preparing img').count(), 0);
}

async function newSession(browser, baseUrl, response = authResponse(), { restore = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const requests = [];
  const blocked = [];
  const errors = [];
  const logs = [{ contentId: 'preposition_test', history: '[1]preposition_test::prep_at__en_ja(×)' }];
  await context.addInitScript(({ savedGrowth, restore }) => {
    // The app currently keeps growth stores in memory. This sentinel also detects accidental
    // blanket browser-storage clearing while exercising login, learning, restoration and logout.
    localStorage.setItem('home-test.saved-growth', savedGrowth);
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
  }, { savedGrowth, restore });
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
      const result = payload.action === 'getLogs' ? logs : response;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
      return;
    }
    await route.continue();
  });
  const page = await context.newPage();
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
      assert.equal(await page.evaluate(() => localStorage.getItem('home-test.saved-growth')), savedGrowth);
      // Session keepalive is existing authentication behavior, not a growth timer.
      assert.ok((await page.evaluate(() => window.__homeIntervals)).every((delay) => delay === 30 * 60 * 1000));
    }
  };
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
          await assertGrowthHidden(session.page);
          assert.equal(await session.page.locator('.student-home__subject').count(), 1);
          assert.equal(await session.page.getByRole('button', { name: /高校生モード/ }).count(), 0);
          const headings = await session.page.locator('.student-home__main h2').allTextContents();
          assert.deepEqual(headings, ['今日のミッション', '学習をはじめる', 'キャラクター育成', '最近の学習・復習']);
          assert.match(await session.page.locator('.student-home__mission').innerText(), /準備中/);
          assert.doesNotMatch(await session.page.locator('.student-home__mission').innerText(), /(?:^|\s)0\s*\//);
          await session.page.screenshot({ path: path.join(artifacts, `${mode}-home-desktop.png`), fullPage: true });
          await session.page.setViewportSize({ width: 390, height: 844 });
          assert.equal(await session.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'Narrow home must not overflow horizontally');
          await session.page.screenshot({ path: path.join(artifacts, `${mode}-home-narrow.png`), fullPage: true });
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
          await assertGrowthHidden(session.page);
          assert.equal(await session.page.locator('.student-home__subject').count(), 5);
          assert.deepEqual(await session.page.locator('.student-home__mission-progress b').allTextContents(), ['-- / 3', '-- / 3']);
          assert.equal(await session.page.evaluate(() => [...document.images].some((image) => !image.complete || image.naturalWidth === 0)), false);
          await session.page.screenshot({ path: path.join(artifacts, `${mode}-home-all-desktop.png`), fullPage: true });
          await session.page.setViewportSize({ width: 390, height: 844 });
          assert.equal(await session.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
          await session.page.screenshot({ path: path.join(artifacts, `${mode}-home-all-narrow.png`), fullPage: true });
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
          await assertGrowthHidden(session.page);
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
          await assertGrowthHidden(session.page);
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

      await t.test('restored unpublished UI state and direct disallowed navigation remain blocked', async () => {
        const session = await newSession(browser, baseUrl);
        try {
          await session.login();
          const restored = await session.page.evaluate(() => {
            const find = (fiber) => {
              if (!fiber) return null;
              if (fiber.memoizedProps?.onSelectLocalCharacter) return fiber;
              return find(fiber.child) || find(fiber.sibling);
            };
            const menu = find(window.__homeReactRoot?.current);
            if (!menu) throw new Error('Menu component was not available for restoration regression check');
            let app = menu.return;
            while (app && (typeof app.type !== 'function' || !app.memoizedState)) app = app.return;
            if (!app) throw new Error('App state was not available');
            const hooks = [];
            for (let hook = app.memoizedState; hook; hook = hook.next) hooks.push(hook);
            const refs = hooks.filter(({ memoizedState }) => memoizedState && Object.hasOwn(memoizedState, 'current'));
            if (refs[1].memoizedState.current !== null || refs[2].memoizedState.current !== null) throw new Error('Growth stores were initialized');
            const missionRef = refs[1].memoizedState;
            const growthRef = refs[2].memoizedState;
            missionRef.current = { savedMission: 2 };
            growthRef.current = { savedCharacter: 'unchanged', totalXp: 1200, points: 900 };
            window.__homeSavedRefs = { missionRef, growthRef, before: JSON.stringify([missionRef.current, growthRef.current]) };
            // Restore a legacy local-development state; the release flag must still win.
            hooks[15].queue.dispatch(true);
            hooks[12].queue.dispatch({ activeCharacter: { characterType: 'cat', level: 99 }, pointBalance: 900 });
            const denied = menu.memoizedProps.openContent('kanji_test', 'kanji-setup');
            // Simulate all previously open growth views, including pending confirmation.
            let state = menu.memoizedState;
            const values = [null, true, { characterType: 'cat', requestId: 'mock' }, true, true, true];
            for (const value of values) {
              if (!state?.queue?.dispatch) throw new Error('Menu state signature changed');
              state.queue.dispatch(value);
              state = state.next;
            }
            return denied;
          });
          assert.equal(restored, false);
          await session.page.waitForFunction(() => {
            const find = (fiber) => fiber && (fiber.memoizedProps?.onSelectLocalCharacter ? fiber : find(fiber.child) || find(fiber.sibling));
            let app = find(window.__homeReactRoot?.current)?.return;
            while (app && (typeof app.type !== 'function' || !app.memoizedState)) app = app.return;
            let localFlag = app?.memoizedState;
            for (let index = 0; index < 15 && localFlag; index += 1) localFlag = localFlag.next;
            return localFlag?.memoizedState === true;
          });
          assert.equal(await session.page.evaluate(() => {
            const find = (fiber) => fiber && (fiber.memoizedProps?.onSelectLocalCharacter ? fiber : find(fiber.child) || find(fiber.sibling));
            const props = find(window.__homeReactRoot.current).memoizedProps;
            props.onSelectLocalCharacter('cat', 'mock-selection');
            props.onSetLocalCharacterXp(15000);
            props.onAdvanceLocalStreak(30, false);
            props.onCompleteLocalCareLearning();
            props.onPurchaseLocalItem('mock-item', 'mock-purchase');
            props.onAddLocalShopPoints();
            props.onEquipLocalItem('mock-item');
            props.onUnequipLocalSlot('background');
            props.onSelectLocalVisualBranch('mock-branch');
            props.onCompleteLocalCharacter();
            const { missionRef, growthRef, before } = window.__homeSavedRefs;
            return JSON.stringify([missionRef.current, growthRef.current]) === before;
          }), true, 'Disabled growth callbacks must preserve saved in-memory growth data');
          await session.page.getByRole('alert').waitFor();
          await waitForHome(session.page);
          await assertGrowthHidden(session.page);
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
