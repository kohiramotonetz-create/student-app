import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuestionHistoryKey,
  createLogHistory,
  getReviewLookupKeys,
  isReviewQuestionUnresolved,
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

test('civics uses the existing camp social stable question ID history format', () => {
  const civicsId = 'csoc_5b5c7049d6d3489881c63271ea9a3e87';
  const history = createLogHistory([{
    q: '公民の問題文',
    ok: true,
    rawItem: { id: civicsId }
  }], 'camp_social_qa');

  assert.equal(history, `[1]camp_social_qa::${civicsId}(○)`);
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

test('history parser supports existing logs and preposition review-success logs', () => {
  assert.deepEqual(
    parseLogHistory('[1]旧問題文(×), [2]preposition_test::prep_by__en_ja(◎)'),
    [
      { key: '旧問題文', result: '×' },
      { key: 'preposition_test::prep_by__en_ja', result: '◎' }
    ]
  );
});

test('preposition history separates directions and resolves review successes', () => {
  const enToJa = [{ q: 'by', ok: false, rawItem: { id: 'prep_by__en_ja' } }];
  const jaToEn = [{ q: '～までに', ok: false, rawItem: { id: 'prep_by__ja_en' } }];
  assert.equal(createLogHistory(enToJa, 'preposition_test'), '[1]preposition_test::prep_by__en_ja(×)');
  assert.equal(createLogHistory(jaToEn, 'preposition_test'), '[1]preposition_test::prep_by__ja_en(×)');
  assert.equal(
    createLogHistory([{ ...enToJa[0], ok: true }], 'preposition_test', { isReviewMode: true }),
    '[1]preposition_test::prep_by__en_ja(◎)'
  );
  assert.equal(isReviewQuestionUnresolved(['◎', '×']), false);
  assert.equal(isReviewQuestionUnresolved(['×', '◎', '×']), true);
});
