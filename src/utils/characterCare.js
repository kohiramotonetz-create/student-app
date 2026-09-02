import { differenceInLearningDays } from './streakPoints.js';

export const CHARACTER_CONDITIONS = Object.freeze({
  HEALTHY: 'healthy',
  FADED: 'faded',
  WEAK: 'weak',
  HOSPITALIZED: 'hospitalized',
  CRITICAL: 'critical',
  GAME_OVER: 'game_over'
});

export const getEffectiveCareBaselineDate = (careStartedDate, lastLearningDate) => {
  if (!careStartedDate) return lastLearningDate || null;
  if (!lastLearningDate) return careStartedDate;
  const difference = differenceInLearningDays(careStartedDate, lastLearningDate);
  return difference !== null && difference > 0 ? lastLearningDate : careStartedDate;
};

export const getInactiveLearningDays = (baselineDate, currentDate) => {
  const difference = differenceInLearningDays(baselineDate, currentDate);
  return difference === null ? 0 : Math.max(0, difference);
};

export const getCharacterCondition = (inactiveDays) => {
  const days = Math.max(0, Math.trunc(Number(inactiveDays) || 0));
  if (days >= 6) return CHARACTER_CONDITIONS.GAME_OVER;
  if (days === 5) return CHARACTER_CONDITIONS.CRITICAL;
  if (days === 4) return CHARACTER_CONDITIONS.HOSPITALIZED;
  if (days === 3) return CHARACTER_CONDITIONS.WEAK;
  if (days === 2) return CHARACTER_CONDITIONS.FADED;
  return CHARACTER_CONDITIONS.HEALTHY;
};

export const evaluateCharacterCareState = ({
  careStartedDate,
  lastLearningDate,
  currentDate,
  status = 'active'
}) => {
  const baselineDate = getEffectiveCareBaselineDate(careStartedDate, lastLearningDate);
  const inactiveDays = getInactiveLearningDays(baselineDate, currentDate);
  return Object.freeze({
    baselineDate,
    inactiveDays,
    condition: status === 'game_over'
      ? CHARACTER_CONDITIONS.GAME_OVER
      : getCharacterCondition(inactiveDays)
  });
};
