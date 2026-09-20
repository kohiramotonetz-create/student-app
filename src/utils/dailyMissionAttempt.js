import { isDailyMissionContent } from '../constants/dailyMissions.js';
import { createLearningAttempt } from './learningAttempt.js';

// 既存のデイリーミッション専用APIは対象教材だけを返す互換性を維持する。
export const createDailyMissionAttempt = (contentId, isReview = false, uuidFactory) => {
  if (!isDailyMissionContent(contentId)) return null;
  const attempt = createLearningAttempt(contentId, isReview, uuidFactory);
  return Object.freeze({
    attemptId: attempt.attemptId,
    contentId: attempt.contentId,
    isReview: attempt.isReview
  });
};
