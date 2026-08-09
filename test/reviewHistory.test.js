import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuestionHistoryKey,
  createLogHistory,
  getReviewLookupKeys
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
