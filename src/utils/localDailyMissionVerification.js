import { DEFAULT_DAILY_MISSIONS } from '../constants/dailyMissions.js';

export const isLocalDailyMissionVerificationEnabled = (env) => env.DEV === true;

export const createLocalDailyMissionVerificationStore = () => ({
  processedAttemptKeys: new Set(),
  completedCounts: new Map()
});

export const recordLocalDailyMissionCompletion = ({ store, payload, definitions = DEFAULT_DAILY_MISSIONS }) => {
  if (!store || !payload?.attemptId || payload.isReview === true) {
    return { recorded: false, reason: payload?.isReview === true ? 'review' : 'missing-attempt' };
  }
  const mission = definitions.find(({ enabled, targetContentIds }) =>
    enabled && targetContentIds.includes(payload.contentId)
  );
  if (!mission) return { recorded: false, reason: 'not-target' };

  const attemptKey = `${payload.studentId || ''}::${payload.attemptId}`;
  if (store.processedAttemptKeys.has(attemptKey)) return { recorded: false, reason: 'duplicate' };

  store.processedAttemptKeys.add(attemptKey);
  store.completedCounts.set(mission.id, (store.completedCounts.get(mission.id) || 0) + 1);
  return { recorded: true, missionId: mission.id };
};

export const getLocalDailyMissionProgress = ({ store, allowedContentIds, definitions = DEFAULT_DAILY_MISSIONS }) => ({
  result: 'success',
  missionDate: 'local-e2e',
  missions: definitions
    .filter(({ enabled, targetContentIds }) =>
      enabled && targetContentIds.some((contentId) => allowedContentIds.includes(contentId))
    )
    .map((mission) => {
      const completedCount = store?.completedCounts.get(mission.id) || 0;
      return {
        ...mission,
        completedCount,
        achieved: completedCount >= mission.requiredCount,
        missionDate: 'local-e2e'
      };
    })
});
