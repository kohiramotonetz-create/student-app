import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREPOSITION_MODES,
  buildPrepositionQuestionId,
  isPrepositionAnswerCorrect,
  normalizePrepositionEnglish,
  normalizePrepositionJapanese,
  preparePrepositionItems,
  selectPrepositionItems
} from '../src/utils/prepositionQuiz.js';

test('English normalization preserves meaningful word boundaries', () => {
  assert.equal(normalizePrepositionEnglish('  IN   FRONT OF '), 'in front of');
  assert.equal(isPrepositionAnswerCorrect('in to', 'into', PREPOSITION_MODES.JA_TO_EN), false);
  assert.equal(isPrepositionAnswerCorrect(' OUT   OF ', 'out of', PREPOSITION_MODES.JA_TO_EN), true);
});

test('Japanese grading accepts one registered meaning and ignores allowed marks', () => {
  const correct = '～までに／～によって／～のそばに';
  assert.equal(isPrepositionAnswerCorrect('によって', correct, PREPOSITION_MODES.EN_TO_JA), true);
  assert.equal(isPrepositionAnswerCorrect('〜のそばに。', correct, PREPOSITION_MODES.EN_TO_JA), true);
  assert.equal(isPrepositionAnswerCorrect('そば', correct, PREPOSITION_MODES.EN_TO_JA), false);
  assert.equal(normalizePrepositionJapanese(' ーの中へ '), 'の中へ');
});

test('direction is part of the stable question ID', () => {
  assert.equal(buildPrepositionQuestionId('prep_by', 'en-ja'), 'prep_by__en_ja');
  assert.notEqual(buildPrepositionQuestionId('prep_by', 'en-ja'), buildPrepositionQuestionId('prep_by', 'ja-en'));
  assert.equal(preparePrepositionItems([{ id: 'prep_by' }], 'ja-en')[0].baseId, 'prep_by');
});

test('selection is unique and capped at 20', () => {
  const items = Array.from({ length: 44 }, (_, index) => ({ id: `prep_${index}` }));
  const selected = selectPrepositionItems(items);
  assert.equal(selected.length, 20);
  assert.equal(new Set(selected.map(({ id }) => id)).size, 20);
  assert.equal(selectPrepositionItems(items.slice(0, 7)).length, 7);
});
