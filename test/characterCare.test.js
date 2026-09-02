import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateCharacterCareState,
  getCharacterCondition,
  getEffectiveCareBaselineDate,
  getInactiveLearningDays
} from '../src/utils/characterCare.js';

test('未学習日数をtimezoneに依存せず日付だけで計算する', () => {
  assert.equal(getInactiveLearningDays('2026-09-01', '2026-09-01'), 0);
  assert.equal(getInactiveLearningDays('2026-09-01', '2026-09-02'), 1);
  assert.equal(getInactiveLearningDays('2026-09-01', '2026-09-07'), 6);
  assert.equal(getInactiveLearningDays('2026-09-01', '2026-09-08'), 7);
  assert.equal(getInactiveLearningDays('invalid', '2026-09-08'), 0);
});

test('未学習0〜6日を正式conditionへ対応付ける', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(getCharacterCondition), [
    'healthy', 'healthy', 'faded', 'weak', 'hospitalized', 'critical', 'game_over', 'game_over'
  ]);
});

test('新キャラ選択日と最終学習日の新しい方をbaselineにする', () => {
  assert.equal(getEffectiveCareBaselineDate('2026-09-06', '2026-09-01'), '2026-09-06');
  assert.equal(getEffectiveCareBaselineDate('2026-09-06', '2026-09-08'), '2026-09-08');
  assert.deepEqual(evaluateCharacterCareState({
    careStartedDate: '2026-09-06', lastLearningDate: '2026-09-01', currentDate: '2026-09-06'
  }), { baselineDate: '2026-09-06', inactiveDays: 0, condition: 'healthy' });
});
