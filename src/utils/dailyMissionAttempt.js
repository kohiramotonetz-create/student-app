import { isDailyMissionContent } from '../constants/dailyMissions.js';

export const createDailyMissionAttempt = (
  contentId,
  isReview,
  uuidFactory = () => crypto.randomUUID()
) => {
  if (!isDailyMissionContent(contentId)) return null;

  return Object.freeze({
    attemptId: uuidFactory(),
    contentId,
    isReview: isReview === true
  });
};
