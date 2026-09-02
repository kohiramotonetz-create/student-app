import { JUNIOR_SCORED_LEARNING_CONTENT_IDS } from './learningAttempt.js';

export const MAX_CHARACTER_LEVEL = 100;
export const MAX_CHARACTER_XP = 13860;
export const XP_ELIGIBLE_CONTENT_IDS = JUNIOR_SCORED_LEARNING_CONTENT_IDS;

export const xpForLevel = (level) => {
  const normalizedLevel = Math.min(MAX_CHARACTER_LEVEL, Math.max(1, Math.trunc(Number(level) || 1)));
  return (normalizedLevel - 1) * (normalizedLevel + 40);
};

export const levelFromXp = (xp) => {
  const normalizedXp = Math.min(MAX_CHARACTER_XP, Math.max(0, Math.trunc(Number(xp) || 0)));
  let level = 1;
  while (level < MAX_CHARACTER_LEVEL && normalizedXp >= xpForLevel(level + 1)) level += 1;
  return level;
};

export const stageFromLevel = (level) => {
  const normalizedLevel = Math.min(MAX_CHARACTER_LEVEL, Math.max(1, Math.trunc(Number(level) || 1)));
  if (normalizedLevel === 100) return 6;
  return Math.floor(normalizedLevel / 20) + 1;
};

export const xpToNextLevel = (xp) => {
  const normalizedXp = Math.min(MAX_CHARACTER_XP, Math.max(0, Math.trunc(Number(xp) || 0)));
  const level = levelFromXp(normalizedXp);
  return level === MAX_CHARACTER_LEVEL ? 0 : xpForLevel(level + 1) - normalizedXp;
};

export const validateLearningScore = (score, total) => {
  const valid = Number.isFinite(score) && Number.isFinite(total)
    && Number.isInteger(score) && Number.isInteger(total)
    && total >= 0 && score >= 0 && score <= total;
  return valid
    ? Object.freeze({ valid: true, score, total, reason: null })
    : Object.freeze({ valid: false, score: 0, total: 0, reason: 'INVALID_SCORE' });
};

export const isXpEligibleContent = (contentId) => XP_ELIGIBLE_CONTENT_IDS.includes(contentId);

export const createCharacterProgress = (totalXp = 0) => {
  const cappedXp = Math.min(MAX_CHARACTER_XP, Math.max(0, Math.trunc(Number(totalXp) || 0)));
  const level = levelFromXp(cappedXp);
  return Object.freeze({ totalXp: cappedXp, level, stage: stageFromLevel(level), xpToNext: xpToNextLevel(cappedXp) });
};
