import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse } from 'espree';
import { CONTENT_IDS, getContentDefinition } from '../src/constants/sukimakunContents.js';
import { createLogHistory, getReviewLookupKeys, isReviewQuestionUnresolved, parseLogHistory } from '../src/utils/reviewHistory.js';
import { addStudentSessionToken } from '../src/utils/studentSession.js';
import { formatKanjiInk, getEmptyKanjiFrames, getKanjiCandidates, getKanjiCharacters } from '../src/utils/kanjiWriting.js';
import { getPrepositionModeLabel } from '../src/utils/prepositionQuiz.js';
import { classifyBatchGradingError, createBatchGradingRequestId, formatBatchGradingErrorMessage, parseBatchGeminiResults } from '../src/utils/batchGradingDiagnostics.js';

// Execute real React handlers with queued setters. Every transport is an in-memory
// stub; these tests neither read credentials nor start a server or contact an API.
// This verifies handler behavior, not browser rendering or real GAS persistence.
const sources = Object.fromEntries(['App', 'components/CampView', 'components/KanjiTestView']
  .map((file) => [file, readFileSync(new URL(`../src/${file}.jsx`, import.meta.url), 'utf8')]));
const ast = (source) => parse(source, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } });
const appTree = ast(sources.App);
const appBody = appTree.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === 'App').body.body;
const campBody = ast(sources['components/CampView']).body.find((node) => node.type === 'FunctionDeclaration').body.body;
const declaration = (body, name) => {
  const node = body.find((entry) => entry.type === 'VariableDeclaration' && entry.declarations.some((d) => d.id.name === name));
  assert.ok(node, `Missing actual declaration: ${name}`);
  return node;
};
const button = (source, label) => {
  let handler;
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'JSXElement' && node.openingElement.name.name === 'button'
      && source.slice(node.openingElement.end, node.closingElement.start).includes(label)) {
      handler = node.openingElement.attributes.find((attr) => attr.name?.name === 'onClick')?.value.expression;
    }
    Object.values(node).forEach((value) => {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    });
  };
  visit(ast(source));
  assert.ok(handler, `Missing actual button: ${label}`);
  return source.slice(handler.start, handler.end);
};
const plain = (value) => JSON.parse(JSON.stringify(value));
const camps = ['camp_science_qa', 'camp_social_qa', 'camp_kagawa_kanji'];
const makeItems = (contentId, count) => Array.from({ length: count }, (_, i) => ({
  id: `fixture_${i}`, en: `問題${i}`, ja: `答え${i}`, question: `問題${i}`, answer: `答え${i}`,
  subject: ['歴史', '地理', '公民'][i % 3], genre: `分野${i % 2}`, textName: '模擬教材', page: 'p1'
}));
const log = (contentId, key, result) => ({ contentId, history: `[1]${key}(${result})` });
const keyOf = (contentId, item) => `${contentId}::${item.id}`;

function harness(contentId, { items = makeItems(contentId, 35), logs = [], index = 0 } = {}) {
  const requests = [], alerts = [], errors = [], updates = [];
  const state = {
    Math: Object.assign(Object.create(Math), { random: () => 0.5 }),
    console: { error: (message) => errors.push(String(message)) },
    alert: (message) => alerts.push(message), CONTENT_IDS, getContentDefinition,
    createLogHistory, getReviewLookupKeys, isReviewQuestionUnresolved, parseLogHistory,
    addStudentSessionToken, getPrepositionModeLabel,
    formatKanjiInk, getEmptyKanjiFrames, getKanjiCandidates, getKanjiCharacters,
    kanjiActionRef: { current: null },
    classifyBatchGradingError, createBatchGradingRequestId, formatBatchGradingErrorMessage, parseBatchGeminiResults,
    activeContentId: contentId, contentId, isSocial: contentId === 'camp_social_qa',
    content: getContentDefinition(contentId), data: items,
    questionCount: 20, randomAllCount: contentId === 'camp_kagawa_kanji' ? 20 : null,
    keepWrongHistory: contentId === 'camp_kagawa_kanji',
    mainStep: contentId === 'camp_kagawa_kanji' ? 'camp-kanji-main' : 'kanji-main',
    selectedReviewSubjects: [], genres: ['歴史', '地理', '公民'],
    selectedGenre: '歴史', selectedGenres: ['分野0'], selectedFields: ['分野0'],
    canStartContent: () => state.allowed, isContentAllowed: () => state.allowed, allowed: true,
    school: '模擬', userName: '模擬', userId: 'mock-student', studentSessionToken: 'mock-session-only',
    LOG_GAS_URL: '/mock-log', GAS_URL: '/mock-auth', API_KEY: '', BATCH_GRADING_TIMEOUT_MS: 90000,
    isLocalPrepositionVerification: false, localPrepositionLogsRef: { current: [] },
    qIndex: index, quizItems: [], quizAnswers: [], currentInput: '', practice: '', quizReview: { visible: false },
    campDraftAnswers: [], isCampGrading: false, isCampReviewMode: false, isPrepositionReviewMode: false,
    isCampBatchQuiz: contentId === 'camp_science_qa' || contentId === 'camp_social_qa',
    campNavigationLockRef: { current: false }, strokes: [], canvasRef: { current: null },
    wrongWordsList: [], showWrongList: false, mode: 'en-ja', step: 'setup',
    selectedBook: { name: '模擬教材', data: [], contentId }, selectedParts: [],
    startNo: 1, endNo: 20, isKobunMode: false, isFukisokuMode: false,
    selectedText: '模擬教材', startPage: 'p1', endPage: 'p1', kanjiMode: 'page',
    kanjiList: items, campKanjiData: items, selectedKanjiIds: [],
    axios: { post: async (url, body) => {
      const payload = JSON.parse(body);
      requests.push({ url, payload });
      if (url === '/mock-log' && payload.action === 'getLogs') return { data: logs };
      if (url === '/mock-auth' && payload.action === 'checkAnswersWithGemini') return { data: {
        result: 'success', requestId: payload.requestId,
        results: payload.answers.map(({ index }) => ({ index, isCorrect: true }))
      } };
      throw new Error('Unexpected transport: no real transport is available');
    } },
    fetch: async (url, options) => {
      const payload = JSON.parse(options.body);
      requests.push({ url, payload, options });
      if (url === '/mock-log' && payload.action === 'saveLog') {
        logs.unshift({ contentId: payload.contentId, history: payload.history });
        return {};
      }
      if (url.startsWith('https://inputtools.google.com/request')) {
        return { ok: true, json: async () => ['SUCCESS', [['mock', [state.quizItems[state.qIndex].en]]]] };
      }
      throw new Error('Unexpected transport: no real transport is available');
    }
  };
  const setters = {
    setQIndex: 'qIndex', setQuizAnswers: 'quizAnswers', setQuizItems: 'quizItems', setStrokes: 'strokes',
    setCurrentInput: 'currentInput', setPractice: 'practice', setQuizReview: 'quizReview',
    setCampDraftAnswers: 'campDraftAnswers', setIsCampGrading: 'isCampGrading',
    setIsCampReviewMode: 'isCampReviewMode', setShowWrongList: 'showWrongList', setWrongWordsList: 'wrongWordsList',
    setStep: 'step', setLoading: 'loading', setMode: 'mode', setSelectedBook: 'selectedBook',
    setSelectedReviewSubjects: 'selectedReviewSubjects'
  };
  Object.entries(setters).forEach(([setter, key]) => {
    state[setter] = (value) => updates.push(() => { state[key] = typeof value === 'function' ? value(state[key]) : value; });
  });
  const context = vm.createContext(state);
  for (const name of ['normalizeQuizAnswer', 'removeAnswerSupplement', 'isLocallyCorrect']) {
    const node = declaration(appTree.body, name);
    vm.runInContext(sources.App.slice(node.start, node.end), context);
  }
  for (const name of ['resetQuizState', 'fetchAndFilterWrongWords', 'sendResultToGAS', 'startKanjiTest', 'clearKanjiCanvas', 'gradeCampQuiz', 'beginKanjiAction', 'finalizeKanjiAnswer', 'judgeKanji']) {
    const node = declaration(appBody, name);
    vm.runInContext(sources.App.slice(node.start, node.end), context);
  }
  for (const name of ['toggleSelection', 'startQuiz']) {
    const node = declaration(campBody, name);
    vm.runInContext(sources['components/CampView'].slice(node.start, node.end), context);
  }
  const handlers = {
    qaFetch: button(sources['components/CampView'], '過去の間違えたものリスト'),
    qaRetry: button(sources['components/CampView'], '間違えた問題のみトライ'),
    selectAll: button(sources['components/CampView'], '復習ジャンルを全選択'),
    selectNone: button(sources['components/CampView'], '復習ジャンルを全解除'),
    kanjiFetch: button(sources['components/KanjiTestView'], '過去の間違えたものリスト'),
    kanjiRetry: button(sources['components/KanjiTestView'], '間違えた問題のみトライ')
  };
  Object.entries(handlers).forEach(([name, body]) => vm.runInContext(`const ${name} = ${body};`, context));
  const target = declaration(campBody, 'target').declarations[0].init;
  vm.runInContext(`const normalTarget = () => (${sources['components/CampView'].slice(target.start, target.end)});`, context);
  const flush = () => { while (updates.length) updates.shift()(); };
  const run = async (code) => { const value = await vm.runInContext(code, context); flush(); return value; };
  return {
    state, requests, alerts, errors, logs, run,
    async fetchReview() {
      // React onClick does not await this request. Flush the stub's async continuation.
      await run(contentId === 'camp_kagawa_kanji' || contentId === 'kanji_test' ? 'kanjiFetch()' : 'qaFetch()');
      await Promise.resolve(); flush();
    },
    retry: () => run(contentId === 'camp_kagawa_kanji' || contentId === 'kanji_test' ? 'kanjiRetry()' : 'qaRetry()')
  };
}

for (const contentId of camps) {
  for (const count of [0, 1, 20, 21, 35]) {
    test(`${contentId}: ${count} unresolved items are listed; retry has at most 20`, async () => {
      const items = makeItems(contentId, Math.max(1, count));
      const h = harness(contentId, { items, logs: items.slice(0, count).map((item) => log(contentId, keyOf(contentId, item), '×')) });
      h.state.selectedReviewSubjects = ['歴史', '地理', '公民'];
      await h.fetchReview();
      assert.equal(h.errors.length, 0);
      assert.equal(h.state.wrongWordsList.length, count);
      if (!count) {
        assert.deepEqual(h.alerts, ['現在、間違えた問題はありません。']);
        return;
      }
      await h.retry();
      assert.equal(h.state.quizItems.length, Math.min(20, count));
      assert.equal(new Set(h.state.quizItems.map(({ id }) => id)).size, h.state.quizItems.length);
      assert.equal(h.state.isCampReviewMode, true);
      assert.equal(h.state.quizItems.every(({ id }) => items.some((item) => item.id === id)), true);
      if (contentId === 'camp_kagawa_kanji') {
        assert.equal(h.state.quizItems[0].ja, items[0].question);
        assert.equal(h.state.quizItems[0].en, items[0].answer);
      }
    });
  }

  test(`${contentId}: review succeeds once, normal correct does not resolve, failure registers again`, async () => {
    const [item] = makeItems(contentId, 1);
    const key = keyOf(contentId, item);
    const h = harness(contentId, { items: [item], logs: [log(contentId, key, '×')] });
    h.state.selectedReviewSubjects = ['歴史'];
    await h.fetchReview();
    assert.equal(h.state.wrongWordsList.length, 1);
    h.state.final = [{ q: item.en, ok: true, rawItem: item }];
    await h.run('sendResultToGAS(final, content.logSheetName)');
    await h.fetchReview();
    assert.equal(h.state.wrongWordsList.length, 1);
    await h.retry();
    await h.run('sendResultToGAS(final, content.logSheetName)');
    assert.match(h.logs[0].history, /\(◎\)$/);
    await h.fetchReview();
    assert.equal(h.state.wrongWordsList.length, 0);
    await h.run('resetQuizState()');
    assert.equal(h.state.isCampReviewMode, false);
    await h.run('sendResultToGAS(final, content.logSheetName)');
    assert.match(h.logs[0].history, /\(○\)$/);
    await h.fetchReview();
    assert.equal(h.state.wrongWordsList.length, 0);
    h.state.final[0].ok = false;
    await h.run('sendResultToGAS(final, content.logSheetName)');
    await h.fetchReview();
    assert.equal(h.state.wrongWordsList.length, 1);
    assert.match(h.logs[0].history, /\(×\)$/);
  });

  test(`${contentId}: mixed stable/legacy keys follow input log order without date inference`, async () => {
    const [item] = makeItems(contentId, 1);
    const key = keyOf(contentId, item);
    for (const [entries, expected] of [
      [[[key, '◎'], [item.en, '×']], 0],
      [[[item.en, '×'], [key, '◎']], 1],
      [[[key, '○'], [item.en, '×']], 1],
      [[[item.en, '○'], [key, '◎'], [item.en, '×']], 0],
      [[[key, '×'], [item.en, '○'], [key, '◎']], 1]
    ]) {
      const h = harness(contentId, { items: [item], logs: entries.map(([key, result], i) => ({
        ...log(contentId, key, result), date: i % 2 ? '2099-01-01' : 'invalid-date'
      })) });
      h.state.selectedReviewSubjects = ['歴史'];
      await h.fetchReview();
      assert.equal(h.state.wrongWordsList.length, expected, JSON.stringify(entries));
    }
  });
}

test('social review uses one, several, or all selected subjects, capped in total', async () => {
  const contentId = 'camp_social_qa';
  const items = makeItems(contentId, 105);
  for (const selected of [['歴史'], ['地理'], ['公民'], ['歴史', '公民'], ['歴史', '地理', '公民']]) {
    const h = harness(contentId, { items, logs: items.map((item) => log(contentId, keyOf(contentId, item), '×')) });
    h.state.selectedReviewSubjects = selected;
    await h.fetchReview();
    assert.equal(h.state.wrongWordsList.length, selected.length * 35);
    assert.equal(h.state.wrongWordsList.every(({ rawItem }) => selected.includes(rawItem.subject)), true);
    await h.retry();
    assert.equal(h.state.quizItems.length, 20);
    assert.equal(h.state.quizItems.every(({ subject }) => selected.includes(subject)), true);
    if (selected.length === 3) {
      assert.deepEqual(Object.fromEntries(selected.map((subject) => [subject,
        h.state.quizItems.filter((item) => item.subject === subject).length
      ])), { 歴史: 7, 地理: 7, 公民: 6 });
    }
  }
});

test('social review requires a subject; changing all/none hides the stale review list', async () => {
  const h = harness('camp_social_qa');
  await h.fetchReview();
  assert.equal(h.requests.length, 0);
  assert.deepEqual(h.alerts, ['復習するジャンルを最低1件選択してください。']);
  h.state.showWrongList = true;
  await h.run('selectAll()');
  assert.deepEqual(plain(h.state.selectedReviewSubjects), ['歴史', '地理', '公民']);
  assert.equal(h.state.showWrongList, false);
  h.state.showWrongList = true;
  await h.run('selectNone()');
  assert.deepEqual(plain(h.state.selectedReviewSubjects), []);
  assert.equal(h.state.showWrongList, false);
});

test('science review ignores normal genre selection; normal QA selection and maximum stay unchanged', async () => {
  for (const contentId of ['camp_science_qa', 'camp_social_qa']) {
    const items = makeItems(contentId, 105);
    const h = harness(contentId, { items, logs: items.map((item) => log(contentId, keyOf(contentId, item), '×')) });
    if (contentId === 'camp_science_qa') {
      await h.fetchReview();
      assert.equal(h.state.wrongWordsList.length, 105);
    }
    h.state.isCampReviewMode = true;
    await h.run('startQuiz(normalTarget())');
    assert.equal(h.state.isCampReviewMode, false);
    assert.equal(h.state.quizItems.length, contentId === 'camp_science_qa' ? 20 : 18);
    assert.equal(h.state.quizItems.every(({ genre }) => genre === '分野0'), true);
    if (contentId === 'camp_social_qa') assert.equal(h.state.quizItems.every(({ subject }) => subject === '歴史'), true);
  }
});

test('camp kanji normal start remains capped at 20 and resets the review marker', async () => {
  const h = harness('camp_kagawa_kanji');
  h.state.isCampReviewMode = true;
  await h.run('startKanjiTest()');
  assert.equal(h.state.quizItems.length, 20);
  assert.equal(h.state.isCampReviewMode, false);
  assert.equal(h.state.quizItems[0].id, h.state.campKanjiData[0].id);
});

test('review save keeps the existing payload fields, fixed IDs, and transport', async () => {
  const h = harness('camp_social_qa');
  h.state.isCampReviewMode = true;
  h.state.final = [{ q: '模擬問題', a: '模擬回答', correct: '模擬解答', ok: true, rawItem: { id: 'fixed' } }];
  await h.run('sendResultToGAS(final, content.logSheetName)');
  const saved = h.requests.find(({ payload }) => payload.action === 'saveLog');
  assert.deepEqual(Object.keys(saved.payload).sort(), [
    'action', 'contentId', 'sheetName', 'school', 'studentId', 'userName', 'testRange', 'mode',
    'score', 'total', 'percentage', 'history', 'studentSessionToken'
  ].sort());
  assert.equal(saved.payload.history, '[1]camp_social_qa::fixed(◎)');
  assert.equal(saved.payload.testRange, 'No.1～20');
  assert.equal(saved.payload.score, 1);
  assert.equal(saved.payload.total, 1);
  assert.equal(saved.payload.percentage, '100%');
  assert.equal(saved.options.mode, 'no-cors');
  assert.equal(saved.options.keepalive, true);
});

test('preposition and normal kanji history rules remain unchanged', async () => {
  for (const [sequence, expected] of [[['○', '×'], 1], [['○', '○', '×'], 0], [['×', '○'], 1], [['○'], 0]]) {
    const [item] = makeItems('kanji_test', 1);
    const h = harness('kanji_test', { items: [item], logs: sequence.map((result) => log('kanji_test', item.question, result)) });
    await h.fetchReview();
    assert.equal(h.state.wrongWordsList.length, expected);
    h.state.isCampReviewMode = true;
    h.state.final = [{ q: item.question, ok: true, rawItem: item }];
    await h.run('sendResultToGAS(final, content.logSheetName)');
    assert.equal(h.logs[0].history, '[1]問題0(○)');
  }
  const contentId = 'preposition_test';
  const item = { id: 'prep_by__en_ja', en: 'by', ja: 'までに' };
  const key = keyOf(contentId, item);
  const h = harness(contentId, { items: [item], logs: [log(contentId, key, '◎'), log(contentId, key, '×')] });
  await h.run('fetchAndFilterWrongWords(content.logSheetName, data, { contentId, resolveWithReviewSuccess: true })');
  assert.equal(h.state.wrongWordsList.length, 0);
  h.state.isPrepositionReviewMode = true;
  h.state.final = [{ q: 'by', a: 'までに', correct: 'までに', ok: true, rawItem: item }];
  await h.run('sendResultToGAS(final, content.logSheetName)');
  assert.equal(h.logs[0].history, '[1]preposition_test::prep_by__en_ja(◎)');
  const saved = h.requests.find(({ payload }) => payload.action === 'saveLog').payload;
  assert.deepEqual(plain(saved.answerDetails), [{ questionId: item.id, question: 'by', answer: 'までに', correctAnswer: 'までに', isCorrect: true }]);
  assert.equal(saved.studentSessionToken, 'mock-session-only');
  assert.equal(Object.hasOwn(saved, 'attemptId'), false);
});

test('real batch grading still excludes local successes and blanks; one batch produces review markers', async () => {
  const items = [
    { id: 'formula', en: '化学式', ja: 'H₂O' },
    { id: 'blank', en: '空欄の問題', ja: '答え' },
    { id: 'judge', en: '模擬問題', ja: '別の答え' }
  ];
  const h = harness('camp_science_qa', { items });
  h.state.quizItems = items;
  h.state.campDraftAnswers = [' Ｈ2Ｏ ', '', '別表現'];
  h.state.qIndex = 2;
  h.state.currentInput = '別表現';
  h.state.isCampReviewMode = true;
  await h.run('gradeCampQuiz()');
  assert.equal(h.errors.length, 0);
  const batches = h.requests.filter(({ payload }) => payload.action === 'checkAnswersWithGemini');
  assert.equal(batches.length, 1);
  assert.deepEqual(batches[0].payload.answers.map(({ index }) => index), [2]);
  assert.deepEqual(plain(h.state.quizAnswers.map(({ ok }) => ok)), [true, false, true]);
  const saves = h.requests.filter(({ payload }) => payload.action === 'saveLog');
  assert.equal(saves.length, 1);
  assert.equal(saves[0].payload.history, '[1]camp_science_qa::formula(◎), [2]camp_science_qa::blank(×), [3]camp_science_qa::judge(◎)');
});

test('real camp kanji recognition handler still saves the stable ID and review marker once', async () => {
  const h = harness('camp_kagawa_kanji', { items: makeItems('camp_kagawa_kanji', 1) });
  h.state.quizItems = [{ id: 'fixed', ja: 'モンダイ', en: '問題' }];
  h.state.strokes = getKanjiCharacters('問題').map(() => [[{ x: 10, y: 20 }, { x: 30, y: 40 }]]);
  h.state.isCampReviewMode = true;
  await h.run('judgeKanji()');
  assert.equal(h.errors.length, 0);
  assert.equal(h.requests.filter(({ url }) => url.startsWith('https://inputtools.google.com/request')).length, 1);
  const saves = h.requests.filter(({ payload }) => payload.action === 'saveLog');
  assert.equal(saves.length, 1);
  assert.equal(saves[0].payload.history, '[1]camp_kagawa_kanji::fixed(◎)');
});

test('other content IDs and unknown keys do not affect camp review; denied starts do not change mode', async () => {
  const contentId = 'camp_science_qa';
  const [item] = makeItems(contentId, 1);
  const h = harness(contentId, { items: [item], logs: [
    log('camp_social_qa', keyOf(contentId, item), '×'),
    log(contentId, `${contentId}::unknown`, '×')
  ] });
  await h.fetchReview();
  assert.equal(h.state.wrongWordsList.length, 0);
  h.state.allowed = false;
  h.state.wrongWordsList = [{ rawItem: item }];
  await h.retry();
  assert.equal(h.state.isCampReviewMode, false);
  assert.equal(h.state.quizItems.length, 0);
});

test('identical legacy question text does not merge fixed IDs or resolve another fixed question', async () => {
  const contentId = 'camp_science_qa';
  const items = makeItems(contentId, 2).map((item) => ({ ...item, en: '同じ旧問題文' }));
  const h = harness(contentId, { items, logs: [
    log(contentId, keyOf(contentId, items[0]), '◎'),
    { history: '[1]同じ旧問題文(×)' }
  ] });
  await h.fetchReview();
  assert.deepEqual(plain(h.state.wrongWordsList.map(({ rawItem }) => rawItem.id)), [items[1].id]);
  // Existing exact-text compatibility remains. No guessed correspondence is made
  // between two distinct fixed IDs, nor are dates/other log shapes interpreted.
  h.logs.unshift(log(contentId, keyOf(contentId, items[1]), '◎'));
  await h.fetchReview();
  assert.equal(h.state.wrongWordsList.length, 0);
});

test('camp batch grading double invocation while pending sends and saves only once', async () => {
  const h = harness('camp_science_qa', { items: makeItems('camp_science_qa', 1) });
  h.state.quizItems = h.state.data;
  h.state.currentInput = '模擬の別表現';
  h.state.isCampReviewMode = true;
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const original = h.state.axios.post;
  h.state.axios.post = async (...args) => { await pending; return original(...args); };
  const first = h.run('gradeCampQuiz()');
  await h.run('gradeCampQuiz()');
  assert.equal(h.requests.length, 0);
  release(); await first;
  assert.equal(h.requests.filter(({ payload }) => payload.action === 'checkAnswersWithGemini').length, 1);
  assert.equal(h.requests.filter(({ payload }) => payload.action === 'saveLog').length, 1);
});

for (const contentId of camps) {
  test(`${contentId}: 35 unresolved minus 16 review successes leaves exactly 19`, async () => {
    const items = makeItems(contentId, 35);
    const h = harness(contentId, { items, logs: items.map((item) => log(contentId, keyOf(contentId, item), '×')) });
    h.state.selectedReviewSubjects = ['歴史', '地理', '公民'];
    await h.fetchReview();
    assert.equal(h.state.wrongWordsList.length, 35);
    await h.retry();
    assert.equal(h.state.quizItems.length, 20);
    h.state.final = h.state.quizItems.map((item, index) => ({
      q: contentId === 'camp_kagawa_kanji' ? item.ja : item.en,
      a: index < 16 ? '模擬正解' : '', correct: item.en, ok: index < 16, rawItem: item
    }));
    await h.run('sendResultToGAS(final, content.logSheetName)');
    await h.fetchReview();
    assert.equal(h.state.wrongWordsList.length, 19);
    assert.equal(h.requests.filter(({ payload }) => payload.action === 'saveLog').length, 1);
  });
}
