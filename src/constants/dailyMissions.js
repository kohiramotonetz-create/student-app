import { CONTENT_IDS, getContentDefinition } from './sukimakunContents.js';

export const DEFAULT_DAILY_MISSIONS = Object.freeze([
  Object.freeze({
    id: 'english_vocabulary',
    label: '英単語',
    targetContentIds: Object.freeze([
      CONTENT_IDS.kakitan,
      CONTENT_IDS.junior_english_quiz,
      CONTENT_IDS.irregular_verbs
    ]),
    requiredCount: 3,
    rewardXp: 30,
    rewardPoints: null,
    enabled: true
  }),
  Object.freeze({
    id: 'kanji',
    label: '漢字',
    targetContentIds: Object.freeze([CONTENT_IDS.kanji_test]),
    requiredCount: 3,
    rewardXp: 30,
    rewardPoints: null,
    enabled: true
  })
]);

export const DAILY_MISSION_CONTENT_IDS = Object.freeze(
  [...new Set(DEFAULT_DAILY_MISSIONS.flatMap(({ targetContentIds }) => targetContentIds))]
);

export const isDailyMissionContent = (contentId) =>
  DAILY_MISSION_CONTENT_IDS.includes(contentId);

export const getVisibleDailyMissions = (isContentAllowed, definitions = DEFAULT_DAILY_MISSIONS) =>
  definitions.filter(({ enabled, targetContentIds }) =>
    enabled && targetContentIds.some((contentId) => isContentAllowed(contentId))
  );

export const getHomeDailyMissionModels = ({
  permissionsInitialized,
  isContentAllowed,
  progressByMissionId = null,
  definitions = DEFAULT_DAILY_MISSIONS
}) => {
  if (permissionsInitialized !== true) return [];

  return getVisibleDailyMissions(isContentAllowed, definitions).map((mission) => {
    const availableContentIds = mission.targetContentIds.filter(isContentAllowed);
    const progress = progressByMissionId?.[mission.id];
    const hasProgress = Number.isInteger(progress?.completedCount)
      && typeof progress?.achieved === 'boolean';
    return {
      ...mission,
      availableContentIds,
      targetLabels: availableContentIds
        .map((contentId) => getContentDefinition(contentId)?.displayName)
        .filter(Boolean),
      progress: hasProgress
        ? Object.freeze({
          status: 'ready',
          completedCount: progress.completedCount,
          achieved: progress.achieved,
          missionDate: progress.missionDate || null
        })
        : Object.freeze({ status: 'preparing', completedCount: null, achieved: null })
    };
  });
};
