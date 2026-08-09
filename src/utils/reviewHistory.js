export const buildQuestionHistoryKey = (contentId, questionId) => {
  if (!contentId || !questionId) return null;
  return `${contentId}::${questionId}`;
};

export const getReviewLookupKeys = (item, { contentId = null, isKanji = false } = {}) => {
  const legacyQuestionKey = isKanji ? (item.question || item.ja) : item.en;
  const stableKey = buildQuestionHistoryKey(contentId, item.id);
  return [...new Set([stableKey, legacyQuestionKey].filter(Boolean))];
};

export const createLogHistory = (answers, contentId) => {
  const usesStableQuestionIds = contentId?.startsWith('camp_');

  return answers.map((answer, index) => {
    const key = usesStableQuestionIds
      ? buildQuestionHistoryKey(contentId, answer.rawItem?.id)
      : answer.q;

    if (!key) {
      throw new Error(`Missing questionId for ${contentId || 'unknown content'}`);
    }

    return `[${index + 1}]${key}(${answer.ok ? '○' : '×'})`;
  }).join(', ');
};
