import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Linter } from 'eslint';
import { SINGLE_GRADING_TIMEOUT_MS, SINGLE_GRADING_MESSAGES, parseSingleGradingResult, getSingleGradingErrorMessage } from '../src/utils/singleGrading.js';
import { CONTENT_IDS, getContentDefinition } from '../src/constants/sukimakunContents.js';
import { createLogHistory } from '../src/utils/reviewHistory.js';
import { addStudentSessionToken } from '../src/utils/studentSession.js';
import { isPrepositionAnswerCorrect } from '../src/utils/prepositionQuiz.js';

// Execute the production handlers with in-memory state and injected I/O. No server,
// browser, environment files, student account, or real network client is used.
const handlerNames = [
  'normalizeQuizAnswer', 'resetQuizState', 'sendResultToGAS',
  'proceedToNext', 'callAiJudge', 'submitQuizAnswer', 'finishPractice'
];
const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const handlers = new Map();
const messages = new Linter().verify(source, [{
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: {
    capture: { rules: { handlers: {
      create: () => ({
        VariableDeclarator(node) {
          if (handlerNames.includes(node.id.name)) {
            handlers.set(node.id.name, source.slice(...node.init.range));
          }
        }
      })
    } } }
  },
  rules: { 'capture/handlers': 'error' }
}]);
assert.deepEqual(messages, []);
assert.equal(handlers.size, handlerNames.length);

const timeoutMessage = SINGLE_GRADING_MESSAGES.timeout;
const networkMessage = SINGLE_GRADING_MESSAGES.network;

for (const result of ['not true', 'true error', '通信エラー: true...', 'not false', 'false error',
  'TRUE', 'FALSE', '', '  ', null, true, false, 0, 1, [], {}, undefined]) {
  test(`invalid result ${JSON.stringify(result)} stays ungraded and can retry`, async () => {
    const quiz = createQuiz((_payload, attempt) => ({ data: { result: attempt === 1 ? result : 'false' } }));
    await quiz.render().submitQuizAnswer();
    assert.equal(quiz.state.currentInput, '別の訳');
    assert.equal(quiz.state.qIndex, 0);
    assert.deepEqual(quiz.state.quizAnswers, []);
    assert.equal(quiz.state.quizReview.visible, false);
    assert.equal(quiz.state.loading, false);
    assert.equal(quiz.logs.length, 0);
    assert.deepEqual(quiz.alerts, [SINGLE_GRADING_MESSAGES.invalid]);
    assert.equal(quiz.requests.length, 1);
    await quiz.render().submitQuizAnswer();
    assert.equal(quiz.state.quizAnswers.length, 1);
    assert.equal(quiz.state.quizAnswers[0].ok, false);
    assert.equal(quiz.requests.length, 2);
    assert.deepEqual(Object.keys(quiz.requests[0].payload).sort(), ['action', 'apiKey', 'correct', 'userAns', 'word']);
  });
}

for (const data of ['{broken JSON', 'true', null, [], {},
  { result: 'error', message: 'synthetic private detail' },
  { result: 'Googleからのエラー詳細: true false' }]) {
  test(`invalid response envelope ${JSON.stringify(data)} keeps existing answers`, async () => {
    const prior = { q: 'book', a: '本', correct: '本', ok: true };
    const quiz = createQuiz(() => ({ data }), {
      qIndex: 1, quizItems: [{ en: 'book', ja: '本' }, { en: 'apple', ja: 'りんご' }],
      quizAnswers: [prior]
    });
    await quiz.render().submitQuizAnswer();
    assert.deepEqual(quiz.state.quizAnswers, [prior]);
    assert.equal(quiz.state.qIndex, 1);
    assert.equal(quiz.state.currentInput, '別の訳');
    assert.equal(quiz.logs.length, 0);
    assert.deepEqual(quiz.alerts, [SINGLE_GRADING_MESSAGES.invalid]);
  });
}

test('JSON transform failure is an abnormal response, without exposing exception details', async () => {
  const quiz = createQuiz(() => { throw new SyntaxError('synthetic private detail'); });
  await quiz.render().submitQuizAnswer();
  assert.deepEqual(quiz.alerts, [SINGLE_GRADING_MESSAGES.invalid]);
  assert.deepEqual(quiz.state.quizAnswers, []);
  assert.equal(quiz.logs.length, 0);
});

test('reset invalidates an old request without unlocking or changing a newer request', async () => {
  let oldResolve;
  let newResolve;
  const quiz = createQuiz((_payload, attempt) => new Promise(resolve => {
    if (attempt === 1) oldResolve = resolve; else newResolve = resolve;
  }));
  const old = quiz.render().submitQuizAnswer();
  quiz.render().resetQuizState();
  assert.equal(quiz.state.loading, false);
  quiz.state.currentInput = '再試行の回答';
  const latest = quiz.render().submitQuizAnswer();
  const active = quiz.singleQuizSubmissionRef.current;
  oldResolve({ data: { result: 'false' } });
  await old;
  assert.equal(quiz.singleQuizSubmissionRef.current, active);
  assert.equal(quiz.state.loading, true);
  assert.deepEqual(quiz.state.quizAnswers, []);
  assert.deepEqual(quiz.alerts, []);
  newResolve({ data: { result: 'true' } });
  await latest;
  assert.equal(quiz.state.quizAnswers.length, 1);
  assert.equal(quiz.state.quizAnswers[0].a, '再試行の回答');
  assert.equal(quiz.state.quizAnswers[0].ok, true);
  assert.equal(quiz.logs.length, 0);
});

test('an old failure cannot alert or clear a newer request after reset', async () => {
  let rejectOld;
  let resolveNew;
  const quiz = createQuiz((_payload, attempt) => new Promise((resolve, reject) => {
    if (attempt === 1) rejectOld = reject; else resolveNew = resolve;
  }));
  const old = quiz.render().submitQuizAnswer();
  quiz.render().resetQuizState();
  quiz.state.currentInput = '保持';
  const latest = quiz.render().submitQuizAnswer();
  rejectOld({ code: 'ETIMEDOUT' });
  await old;
  assert.equal(quiz.state.loading, true);
  assert.deepEqual(quiz.alerts, []);
  resolveNew({ data: { result: 'false' } });
  await latest;
  assert.equal(quiz.state.quizAnswers[0].ok, false);
});

function createQuiz(respond, overrides = {}, httpClient = null) {
  const state = {
    step: 'quiz-main', currentInput: '別の訳', qIndex: 0, loading: false,
    quizItems: [{ en: 'apple', ja: 'りんご' }], quizAnswers: [],
    quizReview: { visible: false, record: null }, practice: '', isCampReviewMode: false,
    mode: 'en-ja', activeContentId: CONTENT_IDS.junior_english_quiz,
    selectedBook: { name: 'ローカルテスト' }, ...overrides
  };
  const requests = [];
  const logs = [];
  const alerts = [];
  const singleQuizSubmissionRef = { current: null };
  const campNavigationLockRef = { current: false };
  const setters = Object.fromEntries([
    'step', 'currentInput', 'qIndex', 'loading', 'quizAnswers', 'quizReview',
    'practice', 'campDraftAnswers', 'isCampGrading', 'isCampReviewMode'
  ].map((key) => [`set${key[0].toUpperCase()}${key.slice(1)}`, (value) => {
    state[key] = typeof value === 'function' ? value(state[key]) : value;
  }]));
  const dependencies = {
    ...setters, singleQuizSubmissionRef, campNavigationLockRef,
    SINGLE_GRADING_TIMEOUT_MS, SINGLE_GRADING_MESSAGES, parseSingleGradingResult, getSingleGradingErrorMessage,
    CONTENT_IDS, getContentDefinition, createLogHistory, addStudentSessionToken,
    GAS_URL: '/mock-grading', LOG_GAS_URL: '/mock-log', API_KEY: 'mock-only',
    school: 'ローカル', userId: 'mock-student', userName: 'ローカル確認',
    studentSessionToken: 'mock-session-only', isLocalPrepositionVerification: false,
    isPrepositionReviewMode: false, isKobunMode: false, isFukisokuMode: false,
    startNo: 1, endNo: 1, selectedParts: [],
    isContentAllowed: (contentId) => contentId === state.activeContentId,
    isPrepositionAnswerCorrect,
    alert: (message) => alerts.push(message), console: { log() {}, error() {} },
    axios: { post: async (url, body, config) => {
      const payload = JSON.parse(body);
      requests.push({ url, payload, config });
      return httpClient ? httpClient.post(url, body, config) : respond(payload, requests.length);
    } },
    fetch: async (url, options) => { logs.push({ url, payload: JSON.parse(options.body) }); }
  };
  const render = () => {
    const scope = { ...state, ...dependencies };
    const code = handlerNames.map((name) => `const ${name} = ${handlers.get(name)};`).join('\n');
    return new Function(...Object.keys(scope), `${code}\nreturn { submitQuizAnswer, proceedToNext, resetQuizState, finishPractice };`)(...Object.values(scope));
  };
  return { state, requests, logs, alerts, render, singleQuizSubmissionRef };
}

for (const [name, failure, expectedMessage] of [
  ['network failure', { request: {} }, networkMessage],
  ['timeout', { code: 'ECONNABORTED', message: timeoutMessage }, timeoutMessage],
  ['ETIMEDOUT', { code: 'ETIMEDOUT' }, timeoutMessage],
  ['HTTP failure', { response: { status: 503 } }, networkMessage],
  ['request abort', { code: 'ECONNABORTED', message: 'Request aborted' }, networkMessage]
]) {
  test(`${name} retains input and stops grading, history and saving; manual retry succeeds`, async () => {
    const quiz = createQuiz((_payload, attempt) => {
      if (attempt === 1) throw failure;
      return { data: { result: 'true' } };
    });
    const originalItems = quiz.state.quizItems;
    await quiz.render().submitQuizAnswer();
    assert.equal(quiz.state.currentInput, '別の訳');
    assert.equal(quiz.state.qIndex, 0);
    assert.equal(quiz.state.quizItems, originalItems);
    assert.equal(quiz.state.step, 'quiz-main');
    assert.equal(quiz.state.loading, false);
    assert.deepEqual(quiz.state.quizAnswers, []);
    assert.deepEqual(quiz.state.quizReview, { visible: false, record: null });
    assert.equal(quiz.logs.length, 0);
    assert.equal(quiz.requests.length, 1, 'There is no automatic retry');
    assert.equal(quiz.alerts.length, 1);
    assert.equal(quiz.alerts[0], expectedMessage);
    await quiz.render().submitQuizAnswer();
    assert.equal(quiz.requests.length, 2);
    assert.ok(quiz.requests.every(({ config }) => config.timeout === 10000));
    assert.deepEqual(quiz.requests[1].payload, quiz.requests[0].payload);
    assert.equal(quiz.state.quizAnswers.length, 1);
    assert.equal(quiz.state.quizAnswers[0].ok, true);
    assert.equal(quiz.logs.length, 0, 'Grading alone does not save the final log');
    quiz.render().proceedToNext();
    assert.equal(quiz.logs.length, 1);
    assert.equal(quiz.logs[0].payload.score, 1);
    assert.equal(quiz.logs[0].payload.total, 1);
  });
}

test('repeated failures do not accumulate wrong answers or save logs', async () => {
  const quiz = createQuiz(() => { throw new Error('synthetic network error'); });
  for (let attempt = 0; attempt < 3; attempt += 1) await quiz.render().submitQuizAnswer();
  assert.equal(quiz.requests.length, 3);
  assert.equal(quiz.alerts.length, 3);
  assert.equal(quiz.state.currentInput, '別の訳');
  assert.deepEqual(quiz.state.quizAnswers, []);
  assert.equal(quiz.logs.length, 0);
  assert.equal(Boolean(quiz.singleQuizSubmissionRef.current), false);
});

test('rapid submissions share one in-flight request and one answer, even before rendering', async () => {
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  const quiz = createQuiz(() => pending);
  const handlers = quiz.render();
  const first = handlers.submitQuizAnswer();
  await handlers.submitQuizAnswer();
  assert.equal(quiz.requests.length, 1);
  assert.equal(quiz.state.loading, true);
  resolve({ data: { result: 'true' } });
  await first;
  await handlers.submitQuizAnswer();
  await quiz.render().submitQuizAnswer();
  assert.equal(quiz.state.quizAnswers.length, 1);
  assert.equal(quiz.requests.length, 1);
  assert.equal(quiz.logs.length, 0);
});

test('failure after rapid submissions releases the lock for a manual retry', async () => {
  let reject;
  const pending = new Promise((_resolve, fail) => { reject = fail; });
  const quiz = createQuiz((_payload, attempt) => attempt === 1 ? pending : { data: { result: 'true' } });
  const handlers = quiz.render();
  const first = handlers.submitQuizAnswer();
  await handlers.submitQuizAnswer();
  reject(new Error('synthetic network error'));
  await first;
  assert.equal(quiz.requests.length, 1);
  assert.deepEqual(quiz.state.quizAnswers, []);
  await quiz.render().submitQuizAnswer();
  assert.equal(quiz.requests.length, 2);
  assert.equal(quiz.state.quizAnswers.length, 1);
});

for (const result of ['true', 'false', ' true ', ' false ']) {
  test(`successful response ${JSON.stringify(result)} preserves the existing judgment and save contract`, async () => {
    const quiz = createQuiz(() => ({ data: { result } }));
    await quiz.render().submitQuizAnswer();
    const expected = result.trim() === 'true';
    assert.equal(quiz.state.quizAnswers[0].ok, expected);
    assert.equal(quiz.state.quizReview.record.ok, expected);
    assert.equal(quiz.requests[0].config.timeout, 10000);
    assert.equal(quiz.requests[0].config.timeoutErrorMessage, timeoutMessage);
    assert.equal(quiz.alerts.length, 0);
    assert.equal(quiz.logs.length, 0);
    quiz.render().proceedToNext();
    assert.equal(quiz.logs.length, 1);
    assert.equal(quiz.logs[0].payload.score, Number(expected));
    assert.equal(quiz.logs[0].payload.history, `[1]apple(${expected ? '○' : '×'})`);
    assert.equal(quiz.logs[0].payload.contentId, CONTENT_IDS.junior_english_quiz);
    assert.equal(Object.hasOwn(quiz.logs[0].payload, 'attemptId'), false);
    assert.equal(Object.hasOwn(quiz.logs[0].payload, 'isReview'), false);
  });
}

for (const [name, overrides, expected] of [
  ['local match', { currentInput: 'りんご' }, true],
  ['blank answer', { currentInput: '' }, false],
  ['reverse direction', { mode: 'ja-en', currentInput: 'incorrect' }, false]
]) {
  test(`${name} still skips Gemini`, async () => {
    const quiz = createQuiz(() => { throw new Error('Gemini must not be called'); }, overrides);
    await quiz.render().submitQuizAnswer();
    assert.equal(quiz.requests.length, 0);
    assert.equal(quiz.state.quizAnswers.length, 1);
    assert.equal(quiz.state.quizAnswers[0].ok, expected);
    assert.equal(quiz.alerts.length, 0);
  });
}

test('next question and reset allow a new answer without changing the legacy save order', async () => {
  const quiz = createQuiz(() => ({ data: { result: 'true' } }), {
    quizItems: [{ en: 'apple', ja: 'りんご' }, { en: 'book', ja: '本' }]
  });
  await quiz.render().submitQuizAnswer();
  quiz.render().proceedToNext();
  assert.equal(quiz.state.qIndex, 1);
  assert.equal(quiz.logs.length, 0);
  quiz.state.currentInput = '別の訳';
  await quiz.render().submitQuizAnswer();
  assert.equal(quiz.requests.length, 2);
  assert.equal(quiz.state.quizAnswers.length, 2);
  quiz.render().proceedToNext();
  assert.equal(quiz.logs.length, 1);
  assert.equal(quiz.logs[0].payload.total, 2);
  quiz.render().resetQuizState();
  assert.equal(Boolean(quiz.singleQuizSubmissionRef.current), false);
  assert.deepEqual(quiz.state.quizAnswers, []);
  assert.equal(quiz.state.quizReview.visible, false);
  quiz.state.currentInput = '別の訳';
  await quiz.render().submitQuizAnswer();
  assert.equal(quiz.state.quizAnswers.length, 1);
});

test('a final-question failure preserves earlier answers and saves only after successful retry and practice', async () => {
  const quiz = createQuiz((_payload, attempt) => {
    if (attempt === 1) throw new Error('synthetic network error');
    return { data: { result: 'false' } };
  }, {
    currentInput: 'りんご',
    quizItems: [{ en: 'apple', ja: 'りんご' }, { en: 'book', ja: '本' }]
  });
  await quiz.render().submitQuizAnswer();
  const firstAnswer = quiz.state.quizAnswers[0];
  quiz.render().proceedToNext();
  quiz.state.currentInput = '別の訳';
  await quiz.render().submitQuizAnswer();
  assert.equal(quiz.state.currentInput, '別の訳');
  assert.equal(quiz.state.qIndex, 1);
  assert.deepEqual(quiz.state.quizAnswers, [firstAnswer]);
  assert.equal(quiz.state.quizReview.visible, false);
  assert.equal(quiz.logs.length, 0);
  await quiz.render().submitQuizAnswer();
  assert.equal(quiz.state.quizAnswers.length, 2);
  assert.equal(quiz.state.quizAnswers[1].ok, false);
  assert.equal(quiz.logs.length, 0);
  quiz.state.practice = '本';
  quiz.render().finishPractice();
  assert.equal(quiz.state.step, 'quiz-result');
  assert.equal(quiz.logs.length, 1);
  assert.equal(quiz.logs[0].payload.score, 1);
  assert.equal(quiz.logs[0].payload.total, 2);
  assert.equal(quiz.logs[0].payload.history, '[1]apple(○), [2]book(×)');
});

test('preposition answers still use their existing local judge without Gemini', async () => {
  const quiz = createQuiz(() => { throw new Error('Gemini must not be called'); }, {
    activeContentId: CONTENT_IDS.preposition_test,
    currentInput: '違う答え', quizItems: [{ id: 'prep_at__en_ja', en: 'at', ja: '～で' }]
  });
  await quiz.render().submitQuizAnswer();
  assert.equal(quiz.requests.length, 0);
  assert.equal(quiz.state.quizAnswers.length, 1);
  assert.equal(quiz.state.quizAnswers[0].ok, false);
  assert.equal(quiz.alerts.length, 0);
});

// Exercise the installed Axios browser adapter with a fake XMLHttpRequest. The
// only "transport" is an in-memory object: no socket, server, or real API exists.
async function withLocalXhr(t, verify) {
  const previousXhr = Object.getOwnPropertyDescriptor(globalThis, 'XMLHttpRequest');
  const sent = [];
  class LocalXhr {
    constructor() {
      this.onloadend = null;
      sent.push(this);
    }
    open(method, url) {
      assert.equal(method, 'POST');
      assert.equal(url, '/mock-grading');
    }
    setRequestHeader() {}
    getAllResponseHeaders() { return 'Content-Type: application/json'; }
    send() {
      this.timer = setTimeout(() => this.ontimeout(), this.timeout);
    }
    respond(result) {
      clearTimeout(this.timer);
      this.status = 200;
      this.statusText = 'OK';
      this.responseText = JSON.stringify({ result });
      this.onloadend();
    }
  }
  Object.defineProperty(globalThis, 'XMLHttpRequest', { configurable: true, writable: true, value: LocalXhr });
  try {
    const { default: axios } = await import('axios');
    t.mock.timers.enable({ apis: ['setTimeout'] });
    await verify({ sent, client: axios.create({ adapter: 'xhr' }) });
  } finally {
    if (previousXhr) Object.defineProperty(globalThis, 'XMLHttpRequest', previousXhr);
    else delete globalThis.XMLHttpRequest;
  }
}

test('Axios ends waiting at 10 seconds and ignores late completion before and after a successful manual retry', async (t) => {
  await withLocalXhr(t, async ({ sent, client }) => {
    const quiz = createQuiz(null, {
      qIndex: 1, quizItems: [{ en: 'book', ja: '本' }, { en: 'apple', ja: 'りんご' }],
      quizAnswers: [{ q: 'book', a: '本', correct: '本', ok: true }]
    }, client);
    const priorAnswers = [...quiz.state.quizAnswers];
    const first = quiz.render().submitQuizAnswer();
    assert.equal(sent.length, 1);
    assert.equal(sent[0].timeout, 10000);
    t.mock.timers.tick(9999);
    await quiz.render().submitQuizAnswer();
    assert.equal(quiz.state.loading, true);
    assert.equal(Boolean(quiz.singleQuizSubmissionRef.current), true);
    assert.deepEqual(quiz.alerts, []);
    assert.equal(sent.length, 1);
    t.mock.timers.tick(1);
    await first;
    assert.deepEqual(quiz.alerts, [timeoutMessage]);
    assert.equal(quiz.state.currentInput, '別の訳');
    assert.equal(quiz.state.qIndex, 1);
    assert.equal(quiz.state.step, 'quiz-main');
    assert.deepEqual(quiz.state.quizAnswers, priorAnswers);
    assert.equal(quiz.state.quizReview.visible, false);
    assert.equal(quiz.state.loading, false);
    assert.equal(Boolean(quiz.singleQuizSubmissionRef.current), false);
    assert.equal(quiz.logs.length, 0);
    sent[0].respond('true');
    assert.deepEqual(quiz.state.quizAnswers, priorAnswers);
    assert.equal(quiz.logs.length, 0);

    const retry = quiz.render().submitQuizAnswer();
    assert.equal(sent.length, 2);
    assert.equal(sent[1].timeout, 10000);
    sent[0].respond('false');
    await quiz.render().submitQuizAnswer();
    assert.equal(sent.length, 2);
    assert.equal(quiz.state.loading, true);
    assert.equal(Boolean(quiz.singleQuizSubmissionRef.current), true);
    t.mock.timers.tick(9999);
    assert.equal(quiz.state.loading, true);
    sent[1].respond('true');
    await retry;
    assert.equal(quiz.state.quizAnswers.length, 2);
    assert.equal(quiz.state.quizAnswers[1].ok, true);
    assert.equal(quiz.logs.length, 0);
    sent[0].respond('false');
    assert.equal(quiz.state.quizAnswers.length, 2);
    quiz.render().proceedToNext();
    assert.equal(quiz.logs.length, 1);
    assert.equal(quiz.logs[0].payload.score, 2);
    assert.equal(quiz.logs[0].payload.total, 2);
    sent[0].respond('true');
    assert.equal(quiz.logs.length, 1);
  });
});

test('every manual retry has a fresh 10 second limit and timeout releases the rapid-submission lock', async (t) => {
  await withLocalXhr(t, async ({ sent, client }) => {
    const quiz = createQuiz(null, {}, client);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const request = quiz.render().submitQuizAnswer();
      await quiz.render().submitQuizAnswer();
      assert.equal(sent.length, attempt + 1);
      assert.equal(sent[attempt].timeout, 10000);
      t.mock.timers.tick(10000);
      await request;
      assert.equal(quiz.alerts[attempt], timeoutMessage);
      assert.equal(quiz.state.currentInput, '別の訳');
      assert.deepEqual(quiz.state.quizAnswers, []);
      assert.equal(quiz.state.quizReview.visible, false);
      assert.equal(quiz.state.loading, false);
      assert.equal(Boolean(quiz.singleQuizSubmissionRef.current), false);
      assert.equal(quiz.logs.length, 0);
      sent[attempt].respond('true');
      assert.deepEqual(quiz.state.quizAnswers, []);
    }
    assert.equal(quiz.requests.length, 2, 'Only the two explicit submissions were sent');
    const retry = quiz.render().submitQuizAnswer();
    sent[2].respond('false');
    await retry;
    assert.equal(quiz.state.quizAnswers.length, 1);
    assert.equal(quiz.state.quizAnswers[0].ok, false);
    assert.equal(quiz.logs.length, 0);
    quiz.state.practice = 'りんご';
    quiz.render().finishPractice();
    assert.equal(quiz.logs.length, 1);
    assert.equal(quiz.logs[0].payload.score, 0);
  });
});
