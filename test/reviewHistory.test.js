import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMP_REVIEW_EMPTY_MESSAGE,
  buildQuestionHistoryKey,
  createLogHistory,
  getReviewLookupKeys,
  isCampQuestionUnresolved,
  parseLogHistory
} from '../src/utils/reviewHistory.js';

test('camp history uses contentId and stable questionId instead of question text', () => {
  const history = createLogHistory([{
    q: '修正前の問題文',
    ok: false,
    rawItem: { id: 'csci_fixed', en: '修正後の問題文' }
  }], 'camp_science_qa');

  assert.equal(history, '[1]camp_science_qa::csci_fixed(×)');
  assert.equal(history.includes('問題文'), false);
});

test('camp history rejects missing questionId instead of falling back to question text', () => {
  assert.throws(
    () => createLogHistory([{ q: '問題文', ok: false, rawItem: {} }], 'camp_social_qa'),
    /Missing questionId/
  );
});

test('review lookup supports stable IDs and legacy question-text logs', () => {
  const keys = getReviewLookupKeys(
    { id: 'ckk_fixed', question: '問題文' },
    { contentId: 'camp_kagawa_kanji', isKanji: true }
  );

  assert.deepEqual(keys, ['camp_kagawa_kanji::ckk_fixed', '問題文']);
  assert.equal(buildQuestionHistoryKey('camp_kagawa_kanji', 'ckk_fixed'), keys[0]);
});

test('existing non-camp history remains question-text based', () => {
  const history = createLogHistory([{ q: 'apple', ok: true, rawItem: {} }], 'junior_english_quiz');
  assert.equal(history, '[1]apple(○)');
});

test('camp review success is stored distinctly from a normal success', () => {
  const answers = [{ q: '問題文', ok: true, rawItem: { id: 'csci_fixed' } }];

  assert.equal(
    createLogHistory(answers, 'camp_science_qa'),
    '[1]camp_science_qa::csci_fixed(○)'
  );
  assert.equal(
    createLogHistory(answers, 'camp_science_qa', { isReviewMode: true }),
    '[1]camp_science_qa::csci_fixed(◎)'
  );
});

test('all camp contents store review successes with the review marker', () => {
  for (const contentId of ['camp_kagawa_kanji', 'camp_science_qa', 'camp_social_qa']) {
    const history = createLogHistory(
      [{ q: '問題文', ok: true, rawItem: { id: 'fixed_001' } }],
      contentId,
      { isReviewMode: true }
    );
    assert.equal(history, `[1]${contentId}::fixed_001(◎)`);
  }
});

test('camp review state follows normal, review, and recurrence transitions', () => {
  // Results are ordered newest first, matching the existing getLogs contract.
  assert.equal(isCampQuestionUnresolved([]), false);
  assert.equal(isCampQuestionUnresolved(['×']), true);
  assert.equal(isCampQuestionUnresolved(['×', '×']), true);
  assert.equal(isCampQuestionUnresolved(['◎', '×']), false);
  assert.equal(isCampQuestionUnresolved(['◎', '×', '×']), false);
  assert.equal(isCampQuestionUnresolved(['×', '◎', '×']), true);
  assert.equal(isCampQuestionUnresolved(['○', '×']), true);
});

test('review failure remains unresolved until a later review success', () => {
  assert.equal(isCampQuestionUnresolved(['×', '×']), true);
  assert.equal(isCampQuestionUnresolved(['◎', '×', '×']), false);
});

test('history parser supports existing logs and review-success logs', () => {
  assert.deepEqual(
    parseLogHistory('[1]旧問題文(×), [2]camp_social_qa::csoc_fixed(◎)'),
    [
      { key: '旧問題文', result: '×' },
      { key: 'camp_social_qa::csoc_fixed', result: '◎' }
    ]
  );
});

test('stable review keys remain isolated by contentId', () => {
  assert.notEqual(
    buildQuestionHistoryKey('camp_science_qa', 'fixed_001'),
    buildQuestionHistoryKey('camp_social_qa', 'fixed_001')
  );
});

test('empty camp review state uses the existing empty-list message', () => {
  assert.equal(isCampQuestionUnresolved([]), false);
  assert.equal(CAMP_REVIEW_EMPTY_MESSAGE, '現在、間違えた問題はありません。');
});
