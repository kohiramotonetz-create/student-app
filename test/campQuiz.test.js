import test from 'node:test';
import assert from 'node:assert/strict';
import { selectQuizItems } from '../src/utils/campQuiz.js';

const buildItems = (count) => Array.from({ length: count }, (_, index) => ({
  id: `item-${index + 1}`,
  en: `問題${index + 1}`,
  ja: `答え${index + 1}`
}));

test('selectQuizItems keeps all items when there are fewer than the limit', () => {
  assert.equal(selectQuizItems(buildItems(8), 20).length, 8);
});

test('selectQuizItems keeps all items when count equals the limit', () => {
  assert.equal(selectQuizItems(buildItems(20), 20).length, 20);
});

test('selectQuizItems caps items at the limit when count exceeds it', () => {
  assert.equal(selectQuizItems(buildItems(21), 20).length, 20);
  assert.equal(selectQuizItems(buildItems(35), 20).length, 20);
});

test('selectQuizItems preserves all items when limit is null', () => {
  assert.equal(selectQuizItems(buildItems(35), null).length, 35);
});
