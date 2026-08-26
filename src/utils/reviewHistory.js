export const buildQuestionHistoryKey = (contentId, questionId) => {
  if (!contentId || !questionId) return null;
  return `${contentId}::${questionId}`;
};

export const getReviewLookupKeys = (item, { contentId = null, isKanji = false } = {}) => {
  const legacyQuestionKey = isKanji ? (item.question || item.ja) : item.en;
  const stableKey = buildQuestionHistoryKey(contentId, item.id);
  return [...new Set([stableKey, legacyQuestionKey].filter(Boolean))];
};

export const parseLogHistory = (history) => String(history || '')
  .split(', ')
  .map((entry) => {
    const match = entry.match(/\](.+?)\((○|×|◎)\)/);
    return match ? { key: match[1].trim(), result: match[2] } : null;
  })
  .filter(Boolean);

export const isReviewQuestionUnresolved = (results) => {
  for (const result of results) {
    if (result === '×') return true;
    if (result === '◎') return false;
  }
  return false;
};

export const createLogHistory = (answers, contentId, { isReviewMode = false } = {}) => {
  const usesStableQuestionIds = contentId?.startsWith('camp_') || contentId === 'preposition_test';

  return answers.map((answer, index) => {
    const key = usesStableQuestionIds
      ? buildQuestionHistoryKey(contentId, answer.rawItem?.id)
      : answer.q;

    if (!key) {
      throw new Error(`Missing questionId for ${contentId || 'unknown content'}`);
    }

    const result = answer.ok && contentId === 'preposition_test' && isReviewMode
      ? '◎'
      : (answer.ok ? '○' : '×');
    return `[${index + 1}]${key}(${result})`;
  }).join(', ');
};
