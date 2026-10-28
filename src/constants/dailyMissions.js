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
    enabled: true
  }),
  Object.freeze({
    id: 'kanji',
    label: '漢字',
    targetContentIds: Object.freeze([CONTENT_IDS.kanji_test]),
    requiredCount: 3,
    enabled: true
  })
]);

export const getVisibleDailyMissions = (isContentAllowed, definitions = DEFAULT_DAILY_MISSIONS) =>
  definitions.filter(({ enabled, targetContentIds }) =>
    enabled && targetContentIds.some((contentId) => isContentAllowed(contentId))
  );

export const getHomeDailyMissionModels = ({
  permissionsInitialized,
  isContentAllowed,
  definitions = DEFAULT_DAILY_MISSIONS
}) => {
  if (permissionsInitialized !== true) return [];

  return getVisibleDailyMissions(isContentAllowed, definitions).map((mission) => {
    const availableContentIds = mission.targetContentIds.filter(isContentAllowed);
    return {
      ...mission,
      availableContentIds,
      targetLabels: availableContentIds
        .map((contentId) => getContentDefinition(contentId)?.displayName)
        .filter(Boolean)
    };
  });
};
