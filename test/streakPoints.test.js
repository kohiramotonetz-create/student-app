import test from 'node:test';
import assert from 'node:assert/strict';
import {
  differenceInLearningDays,
  getCrossedLevelRewards,
  getStreakRewardForDay,
  getThirtyDayRewardCycle,
  updateStreakForLearningDate
} from '../src/utils/streakPoints.js';

test('週間streak報酬は7日周期で繰り返す', () => {
  assert.deepEqual([1,2,3,4,5,6,7,8,14,15].map(getStreakRewardForDay), [5,5,10,10,15,15,30,5,30,5]);
});

test('30日単位だけが連続ボーナスcycleになる', () => {
  assert.equal(getThirtyDayRewardCycle(29), null);
  assert.equal(getThirtyDayRewardCycle(30), 1);
  assert.equal(getThirtyDayRewardCycle(31), null);
  assert.equal(getThirtyDayRewardCycle(60), 2);
});

test('YYYY-MM-DDをtimezone非依存で比較する', () => {
  assert.equal(differenceInLearningDays('2026-09-01', '2026-09-02'), 1);
  assert.equal(differenceInLearningDays('2026-02-28', '2026-03-01'), 1);
  assert.equal(differenceInLearningDays('invalid', '2026-09-01'), null);
});

test('streakは同日不変・翌日継続・空白日後に1へ戻る', () => {
  const day1 = updateStreakForLearningDate({}, '2026-09-01');
  const sameDay = updateStreakForLearningDate(day1, '2026-09-01');
  const day2 = updateStreakForLearningDate(day1, '2026-09-02');
  const reset = updateStreakForLearningDate(day2, '2026-09-04');
  assert.equal(day1.currentStreak, 1);
  assert.equal(sameDay.changed, false);
  assert.equal(day2.currentStreak, 2);
  assert.equal(reset.currentStreak, 1);
  assert.equal(reset.longestStreak, 2);
  assert.equal(reset.streakStartedDate, '2026-09-04');
});

test('Lv節目は今回跨いだ10/30/50/70/90だけを返す', () => {
  assert.deepEqual(getCrossedLevelRewards(9, 10), [10]);
  assert.deepEqual(getCrossedLevelRewards(9, 31), [10, 30]);
  assert.deepEqual(getCrossedLevelRewards(30, 31), []);
  assert.deepEqual(getCrossedLevelRewards(49, 71), [50, 70]);
  assert.deepEqual(getCrossedLevelRewards(99, 100), []);
});
