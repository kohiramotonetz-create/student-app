import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse } from 'espree';
import { formatKanjiInk, getEmptyKanjiFrames, getKanjiCandidates, getKanjiCharacters } from '../src/utils/kanjiWriting.js';
import {
  createLogHistory, getReviewLookupKeys, isReviewQuestionUnresolved, parseLogHistory
} from '../src/utils/reviewHistory.js';

// Execute the actual handlers without a browser, credentials, or a network transport.
// Setters flush after a handler, preserving React's state snapshot within that handler.
// Browser rendering and real recognition remain separate checks.
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const view = readFileSync(new URL('../src/components/KanjiTestView.jsx', import.meta.url), 'utf8');
const resultView = readFileSync(new URL('../src/components/QuizPlayView.jsx', import.meta.url), 'utf8');
const parseSource = (source) => parse(source, {
  ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true }
});
const appBody = parseSource(app).body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === 'App').body.body;
const declaration = (name) => appBody.find((node) => node.type === 'VariableDeclaration'
  && node.declarations.some((entry) => entry.id.name === name));
const findButton = (source, label) => {
  let handler;
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXElement' && node.openingElement.name.name === 'button'
      && source.slice(node.openingElement.end, node.closingElement.start).includes(label)) {
      handler = node.openingElement.attributes.find((attr) => attr.name?.name === 'onClick').value.expression;
    }
    Object.values(node).forEach((value) => {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    });
  };
  visit(parseSource(source));
  assert.ok(handler, `Missing real button handler: ${label}`);
  return source.slice(handler.start, handler.end);
};
const reviewHandler = findButton(view, '間違えた問題のみトライ');
const interruptHandler = 'skipKanji';
const resultHandler = findButton(resultView, '合宿メニューへ戻る');
const items = [
  { textName: '模擬教材', page: 'p3', question: 'モンダイを解く', answer: '問題' },
  { textName: '模擬教材', page: 'p3', question: 'カイトウを書く', answer: '回答' },
  { textName: '模擬教材', page: 'p5', question: 'フクシュウする', answer: '復習' }
];

function harness({ index = 0, contentId = 'kanji_test', logs = [], candidates = ['問題'] } = {}) {
  const requests = [], errors = [], alerts = [], updates = [];
  let context;
  const state = {
    Math: Object.assign(Object.create(Math), { random: () => 0.5 }),
    console: { error: (message) => errors.push(String(message)) },
    formatKanjiInk, getEmptyKanjiFrames, getKanjiCandidates, getKanjiCharacters,
    kanjiActionRef: { current: null }, confirmResult: true,
    alert: (message) => alerts.push(message), window: { confirm: () => state.confirmResult },
    CONTENT_IDS: { kanji_test: 'kanji_test', camp_kagawa_kanji: 'camp_kagawa_kanji', preposition_test: 'preposition_test' },
    contentId, activeContentId: contentId, mainStep: contentId === 'kanji_test' ? 'kanji-main' : 'camp-kanji-main',
    returnStep: 'menu', keepWrongHistory: contentId !== 'kanji_test',
    randomAllCount: contentId === 'camp_kagawa_kanji' ? 20 : null,
    isCampReviewMode: false, isPrepositionReviewMode: false,
    canStartContent: () => true, isContentAllowed: () => true,
    getContentDefinition: (id) => ({ logSheetName: id === 'kanji_test' ? '漢字テスト' : '合宿漢字' }),
    createLogHistory, getReviewLookupKeys, isReviewQuestionUnresolved, parseLogHistory,
    addStudentSessionToken: (payload) => ({ ...payload, studentSessionToken: 'mock-only' }),
    LOG_GAS_URL: 'mock-log', userId: 'mock-student', studentSessionToken: 'mock-only',
    isLocalPrepositionVerification: false, localPrepositionLogsRef: { current: [] },
    school: '模擬', userName: '模擬', mode: 'en-ja', selectedBook: { name: '', data: [] },
    selectedParts: [], isKobunMode: false, isFukisokuMode: false,
    selectedText: '模擬教材', startPage: 'p3', endPage: 'p3', kanjiMode: 'individual',
    kanjiList: items, campKanjiData: [], selectedKanjiIds: [0, 1],
    qIndex: index, quizItems: [], quizAnswers: [], currentInput: 'old', practice: 'old',
    quizReview: { visible: true }, campDraftAnswers: [], isCampGrading: false,
    singleQuizSubmissionRef: { current: null }, campNavigationLockRef: { current: false }, strokes: [], canvasRef: { current: null },
    wrongWordsList: [], showWrongList: false, step: 'kanji-setup',
    axios: { post: async (url, body) => { assert.equal(url, 'mock-log'); requests.push(JSON.parse(body)); return { data: logs }; } },
    fetch: async (url, options) => {
      if (url === 'mock-log') {
        requests.push({ ...JSON.parse(options.body), transport: options });
        return {};
      }
      assert.match(url, /^https:\/\/inputtools\.google\.com\/request/);
      requests.push({ action: 'mock-recognition', body: JSON.parse(options.body) });
      if (context.pendingRecognition) await context.pendingRecognition;
      return { ok: true, json: async () => context.mockResponse || ['SUCCESS', [['mock', candidates]]] };
    }
  };
  const setters = {
    setQIndex: 'qIndex', setQuizAnswers: 'quizAnswers', setCurrentInput: 'currentInput',
    setPractice: 'practice', setQuizReview: 'quizReview', setCampDraftAnswers: 'campDraftAnswers',
    setIsCampGrading: 'isCampGrading', setStrokes: 'strokes', setQuizItems: 'quizItems',
    setShowWrongList: 'showWrongList', setWrongWordsList: 'wrongWordsList',
    setStep: 'step', setLoading: 'loading', setSelectedBook: 'selectedBook',
    setIsCampReviewMode: 'isCampReviewMode'
  };
  Object.entries(setters).forEach(([setter, key]) => {
    state[setter] = (value) => updates.push(() => { context[key] = typeof value === 'function' ? value(context[key]) : value; });
  });
  context = vm.createContext(state);
  for (const name of ['resetQuizState', 'fetchAndFilterWrongWords', 'sendResultToGAS', 'startKanjiTest', 'clearKanjiCanvas', 'beginKanjiAction', 'finalizeKanjiAnswer', 'skipKanji', 'judgeKanji']) {
    const node = declaration(name);
    vm.runInContext(app.slice(node.start, node.end), context);
  }
  vm.runInContext(`const reviewClick = ${reviewHandler}; const interruptClick = ${interruptHandler}; const resultClick = ${resultHandler};`, context);
  const flush = () => { while (updates.length) updates.shift()(); };
  const run = (code) => {
    const result = vm.runInContext(code, context);
    if (result?.then) return result.then((value) => { flush(); return value; });
    flush();
    return result;
  };
  return {
    state: context, requests, errors, alerts,
    run,
    review: (source = items.slice(0, 1)) => {
      context.wrongWordsList = source.map((rawItem) => ({ rawItem }));
      return run('reviewClick()');
    },
    judge: () => { context.strokes = getKanjiCharacters(context.quizItems[context.qIndex].en).map(() => [[{ x: 10, y: 10 }]]); return run('judgeKanji()'); }
  };
}

test('App passes its existing reset function to KanjiTestView', () => {
  const start = app.indexOf('<KanjiTestView');
  assert.match(app.slice(start, app.indexOf('/>', start)), /resetQuizState=\{resetQuizState\}/);
});

for (const count of [1, 2]) {
  test(`normal kanji review resets stale state and converts ${count} question(s)`, () => {
    const h = harness({ index: 19 });
    h.state.quizAnswers = [{ ok: false }];
    h.state.strokes = [[{ x: 1, y: 1 }]];
    h.review(items.slice(0, count));
    assert.equal(h.state.qIndex, 0);
    assert.equal(h.state.quizItems.length, count);
    assert.equal(h.state.quizItems[0].ja, items[0].question);
    assert.equal(h.state.quizItems[0].en, items[0].answer);
    assert.equal(h.state.quizItems[0].page, items[0].page);
    assert.equal(h.state.quizItems[0].textName, items[0].textName);
    assert.equal(h.state.quizAnswers.length, 0);
    assert.equal(h.state.strokes.length, 0);
    assert.equal(h.state.currentInput, '');
    assert.equal(h.state.quizReview.visible, false);
    assert.equal(h.state.step, 'kanji-main');
    assert.ok(h.state.quizItems[h.state.qIndex]);
  });
}

test('normal start still converts and resets both selection modes', () => {
  for (const mode of ['page', 'individual']) {
    const h = harness({ index: 7 });
    h.state.kanjiMode = mode;
    h.run('startKanjiTest()');
    assert.equal(h.state.qIndex, 0);
    assert.equal(h.state.quizItems.length, 2);
    assert.equal(h.state.quizItems[0].ja, items[0].question);
    assert.equal(h.state.quizItems[0].en, items[0].answer);
  }
});

test('cancelled skip after Q2 then one-question review starts at Q1', () => {
  const h = harness({ index: 1 });
  h.state.confirmResult = false;
  h.run('interruptClick()');
  assert.equal(h.state.qIndex, 1, 'Cancelled skip must not change the question');
  h.review();
  assert.equal(h.state.qIndex, 0);
  assert.ok(h.state.quizItems[h.state.qIndex]);
});

test('correct review recognition produces a normal history and unchanged log contract', async () => {
  const h = harness();
  h.review(); await h.judge();
  assert.equal(h.state.step, 'quiz-result');
  assert.equal(h.state.quizAnswers[0].ok, true);
  assert.equal(h.state.quizAnswers[0].q, items[0].question);
  const saved = h.requests.filter(({ action }) => action === 'saveLog');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].contentId, 'kanji_test');
  assert.equal(saved[0].sheetName, '漢字テスト');
  assert.equal(saved[0].history, `[1]${items[0].question}(○)`);
  assert.equal(saved[0].score, 1); assert.equal(saved[0].total, 1);
  assert.equal(saved[0].transport.mode, 'no-cors');
  assert.equal(saved[0].transport.keepalive, true);
  for (const key of ['isReview', 'attemptId', 'answerDetails']) assert.equal(Object.hasOwn(saved[0], key), false);
  assert.deepEqual(h.errors, []);
});

test('incorrect recognition remains incorrect and results can be followed by another review', async () => {
  const h = harness({ candidates: ['模擬誤答'] });
  h.review(); await h.judge();
  assert.equal(h.state.quizAnswers[0].ok, false);
  assert.equal(h.requests.find(({ action }) => action === 'saveLog').history, `[1]${items[0].question}(×)`);
  h.run('resultClick()');
  assert.equal(h.state.qIndex, 0);
  assert.equal(h.state.step, 'menu');
  h.review();
  assert.equal(h.state.quizAnswers.length, 0);
  assert.equal(h.state.qIndex, 0);
});

test('multiple review questions are graded and logged once without skipping Q1', async () => {
  const h = harness({ candidates: ['問題', '回答'] });
  h.review(items.slice(0, 2));
  await h.judge();
  assert.equal(h.state.qIndex, 1);
  assert.equal(h.requests.filter(({ action }) => action === 'saveLog').length, 0);
  await h.judge();
  const saved = h.requests.filter(({ action }) => action === 'saveLog');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].total, 2); assert.equal(saved[0].score, 2);
  assert.equal(saved[0].history, `[1]${items[0].question}(○), [2]${items[1].question}(○)`);
});

test('normal kanji grading and camp review behavior are preserved', async () => {
  const normal = harness(); normal.state.selectedKanjiIds = [0];
  normal.run('startKanjiTest()'); await normal.judge();
  assert.equal(normal.state.quizAnswers[0].ok, true);
  const camp = harness({ contentId: 'camp_kagawa_kanji', index: 2 });
  const campItem = { ...items[0], id: 'camp_mock' };
  camp.review([campItem]);
  assert.equal(camp.state.qIndex, 0, 'Integrated camp review also resets to Q1');
  assert.equal(camp.state.isCampReviewMode, true);
  assert.equal(camp.state.quizItems[0].id, campItem.id);
  assert.equal(camp.state.quizItems[0].ja, campItem.question);
  assert.equal(camp.state.quizItems[0].en, campItem.answer);
  const freshCamp = harness({ contentId: 'camp_kagawa_kanji' });
  freshCamp.review([campItem]); await freshCamp.judge();
  assert.equal(freshCamp.requests.find(({ action }) => action === 'saveLog').history, '[1]camp_kagawa_kanji::camp_mock(◎)');
});

test('history rules, question-text keys, and selected range are unchanged', async () => {
  for (const [results, unresolved] of [[[], false], [['×'], true], [['○'], false], [['○', '×'], true], [['○', '○', '×'], false], [['×', '○'], true]]) {
    const h = harness({ logs: results.map((result) => ({ history: `[1]${items[0].question}(${result})` })) });
    await h.run('fetchAndFilterWrongWords("漢字テスト", [kanjiList[0]], {isKanji:true})');
    assert.equal(h.state.wrongWordsList.length > 0, unresolved);
  }
  const h = harness({ logs: [{ history: `[1]${items[0].question}(×), [2]${items[2].question}(×)` }] });
  await h.run('fetchAndFilterWrongWords("漢字テスト", [kanjiList[0]], {isKanji:true})');
  assert.equal(h.state.wrongWordsList.length, 1);
  assert.equal(h.state.wrongWordsList[0].rawItem, items[0]);
  assert.equal(h.requests[0].sheetName, '漢字テスト');
  assert.equal(Object.hasOwn(h.requests[0], 'contentId'), false);
});

for (const contentId of ['kanji_test', 'camp_kagawa_kanji']) {
  test(`${contentId}: skip cancellation preserves ink, question, answers and makes no request`, () => {
    const h = harness({ contentId });
    h.review([{ ...items[0], id: 'camp_mock' }]);
    const ink = [[[{ x: 34, y: 56 }]], [[{ x: 78, y: 90 }]]];
    h.state.strokes = ink;
    h.state.confirmResult = false;
    h.run('skipKanji()');
    assert.equal(h.state.strokes, ink);
    assert.equal(h.state.qIndex, 0);
    assert.equal(h.state.quizAnswers.length, 0);
    assert.equal(h.requests.length, 0);
    h.state.confirmResult = true;
    h.run('skipKanji()');
    assert.equal(h.state.quizAnswers.length, 1);
  });

  for (const count of [1, 2, 20]) {
    test(`${contentId}: all ${count} question(s) skipped, one final save, ordinary wrong history`, () => {
      const h = harness({ contentId });
      h.review(Array.from({ length: count }, (_, i) => ({ ...items[i % items.length], id: `mock_${i}` })));
      for (let i = 0; i < count; i++) {
        h.state.strokes = [[[{ x: 1, y: 2 }]]];
        h.run('skipKanji(); skipKanji()'); // Same render snapshot, including a double click.
        assert.equal(h.state.quizAnswers.length, i + 1);
        assert.equal(h.state.strokes.length, 0);
      }
      assert.equal(h.state.step, 'quiz-result');
      const saves = h.requests.filter(({ action }) => action === 'saveLog');
      assert.equal(saves.length, 1);
      assert.equal(h.requests.some(({ action }) => action === 'mock-recognition'), false);
      assert.equal(saves[0].score, 0);
      assert.equal(saves[0].total, count);
      assert.equal(saves[0].history.split('(×)').length - 1, count);
      assert.equal(saves[0].contentId, contentId);
      assert.ok(h.state.quizAnswers.every((answer) => answer.a === '覚えていない' && !answer.ok));
      assert.ok(saves[0].history.includes(contentId === 'kanji_test' ? items[0].question : 'camp_kagawa_kanji::mock_0'));
    });
  }
}

test('partial/empty frames retain the question and ink without recognition or history', () => {
  const h = harness(); h.review();
  const ink = [[[{ x: 10, y: 10 }]], []]; h.state.strokes = ink;
  h.run('judgeKanji()');
  assert.equal(h.state.strokes, ink);
  assert.equal(h.state.qIndex, 0);
  assert.equal(h.state.quizAnswers.length, 0);
  assert.equal(h.requests.length, 0);
  assert.match(h.alerts[0], /2文字目/);
});

test('judge in flight blocks skip and second judge, then final save includes final record once', async () => {
  const h = harness(); h.review();
  let release;
  h.state.pendingRecognition = new Promise((resolve) => { release = resolve; });
  const pending = h.judge();
  h.run('skipKanji()');
  await h.run('judgeKanji()');
  assert.equal(h.requests.length, 1);
  release(); await pending;
  assert.equal(h.state.quizAnswers.length, 1);
  assert.equal(h.requests.filter(({ action }) => action === 'saveLog').length, 1);
});

test('skip first then recognition last produces exactly two answers and one log', async () => {
  const h = harness({ candidates: ['回答'] }); h.review(items.slice(0, 2));
  h.run('skipKanji()'); await h.judge();
  const saved = h.requests.filter(({ action }) => action === 'saveLog');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].score, 1); assert.equal(saved[0].total, 2);
  assert.equal(h.state.quizAnswers[0].a, '覚えていない');
  assert.equal(h.state.quizAnswers[1].ok, true);
});

test('malformed recognition is not scored and permits retry on the same question', async () => {
  const h = harness(); h.review();
  h.state.mockResponse = ['SUCCESS', [['mock', [true]]]];
  await h.judge();
  assert.equal(h.state.quizAnswers.length, 0);
  assert.equal(h.state.qIndex, 0);
  assert.equal(h.state.loading, false);
  assert.equal(h.requests.some(({ action }) => action === 'saveLog'), false);
  h.state.mockResponse = null; await h.judge();
  assert.equal(h.state.quizAnswers.length, 1);
});

test('production UI has one skip confirmation, no new interrupt or quality gate', () => {
  assert.ok(view.includes('onClick={skipKanji}'));
  assert.ok(view.includes('disabled={kanjiBusy}'));
  assert.equal(view.includes('中断してメニュー'), false);
  assert.ok(app.includes('この問題をとばしてもよいですか？'));
  assert.equal(view.includes('threshold'), false);
});

for (const contentId of ['kanji_test', 'camp_kagawa_kanji']) {
  test(`${contentId}: restarting review after advancing and after result starts Q1 with fresh ink and one save per test`, async () => {
    const h = harness({ contentId, candidates: ['問題', '回答'] });
    const pair = items.slice(0, 2).map((item, index) => ({ ...item, id: `restart_${index}` }));
    h.review(pair);
    await h.judge();
    assert.equal(h.state.qIndex, 1);
    h.review(pair);
    assert.equal(h.state.qIndex, 0);
    assert.equal(h.state.quizAnswers.length, 0);
    assert.equal(h.state.strokes.length, 0);
    assert.equal(h.state.isCampReviewMode, contentId === 'camp_kagawa_kanji');
    await h.judge(); await h.judge();
    assert.equal(h.state.step, 'quiz-result');
    h.run('resultClick()');
    assert.equal(h.state.step, contentId === 'camp_kagawa_kanji' ? 'camp-menu' : 'menu');
    h.review([pair[0]]);
    assert.equal(h.state.qIndex, 0);
    await h.judge();
    const saves = h.requests.filter(({ action }) => action === 'saveLog');
    assert.equal(saves.length, 2);
    assert.equal(saves[0].total, 2);
    assert.equal(saves[1].total, 1);
    assert.ok(saves.every(({ history }) => history.includes(contentId === 'camp_kagawa_kanji' ? '(◎)' : '(○)')));
  });
}
