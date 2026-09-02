export const STREAK_REWARD_TABLE = Object.freeze([5, 5, 10, 10, 15, 15, 30]);
export const LEVEL_REWARD_POINTS = Object.freeze({ 10: 100, 30: 200, 50: 300, 70: 400, 90: 500 });

export const getStreakRewardForDay = (streakDay) => {
  const day = Math.trunc(Number(streakDay) || 0);
  return day > 0 ? STREAK_REWARD_TABLE[(day - 1) % STREAK_REWARD_TABLE.length] : 0;
};

export const getThirtyDayRewardCycle = (streakDay) => {
  const day = Math.trunc(Number(streakDay) || 0);
  return day > 0 && day % 30 === 0 ? day / 30 : null;
};

const toUtcDayNumber = (dateText) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateText || ''));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = Date.UTC(year, month - 1, day) / 86400000;
  const verified = new Date(value * 86400000);
  return verified.getUTCFullYear() === year && verified.getUTCMonth() === month - 1 && verified.getUTCDate() === day
    ? value
    : null;
};

export const differenceInLearningDays = (fromDate, toDate) => {
  const from = toUtcDayNumber(fromDate);
  const to = toUtcDayNumber(toDate);
  return from === null || to === null ? null : to - from;
};

export const updateStreakForLearningDate = (progress, learningDate) => {
  const previous = progress || {};
  const lastLearningDate = previous.lastLearningDate || null;
  const difference = lastLearningDate ? differenceInLearningDays(lastLearningDate, learningDate) : null;
  if (difference === 0) return Object.freeze({ ...previous, changed: false });
  if (difference !== null && difference < 0) return Object.freeze({ ...previous, changed: false, reason: 'OUT_OF_ORDER_DATE' });
  const continued = difference === 1;
  const currentStreak = continued ? (Number(previous.currentStreak) || 0) + 1 : 1;
  return Object.freeze({
    ...previous,
    currentStreak,
    longestStreak: Math.max(Number(previous.longestStreak) || 0, currentStreak),
    streakStartedDate: continued ? (previous.streakStartedDate || learningDate) : learningDate,
    lastLearningDate: learningDate,
    changed: true,
    reason: null
  });
};

export const getCrossedLevelRewards = (previousLevel, nextLevel) => {
  const from = Math.max(1, Math.trunc(Number(previousLevel) || 1));
  const to = Math.max(from, Math.trunc(Number(nextLevel) || from));
  return Object.keys(LEVEL_REWARD_POINTS).map(Number).filter((level) => level > from && level <= to);
};
