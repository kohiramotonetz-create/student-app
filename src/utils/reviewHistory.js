export const CAMP_REVIEW_EMPTY_MESSAGE = '現在、間違えた問題はありません。';

export const buildQuestionHistoryKey = (contentId, questionId) => {
  if (!contentId || !questionId) return null;
  return `${contentId}::${questionId}`;
};

export const parseLogHistory = (history) => String(history || '')
  .split(', ')
  .map((entry) => {
    const match = entry.match(/\](.+?)\((○|×|◎)\)/);
    return match ? { key: match[1].trim(), result: match[2] } : null;
  })
  .filter(Boolean);

export const isCampQuestionUnresolved = (results) => {
  // getLogs results are consumed newest first. Normal successes do not resolve
  // prior failures; only a review success (◎) does.
  for (const result of results) {
    if (result === '×') return true;
    if (result === '◎') return false;
  }
  return false;
};

export const getReviewLookupKeys = (item, { contentId = null, isKanji = false } = {}) => {
  const legacyQuestionKey = isKanji ? (item.question || item.ja) : item.en;
  const stableKey = buildQuestionHistoryKey(contentId, item.id);
  return [...new Set([stableKey, legacyQuestionKey].filter(Boolean))];
};

export const createLogHistory = (answers, contentId, { isReviewMode = false } = {}) => {
  const usesStableQuestionIds = contentId?.startsWith('camp_');

  return answers.map((answer, index) => {
    const key = usesStableQuestionIds
      ? buildQuestionHistoryKey(contentId, answer.rawItem?.id)
      : answer.q;

    if (!key) {
      throw new Error(`Missing questionId for ${contentId || 'unknown content'}`);
    }

    const result = answer.ok && usesStableQuestionIds && isReviewMode
      ? '◎'
      : (answer.ok ? '○' : '×');
    return `[${index + 1}]${key}(${result})`;
  }).join(', ');
};
