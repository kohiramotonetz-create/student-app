export const PREPOSITION_MODES = Object.freeze({
  EN_TO_JA: 'en-ja',
  JA_TO_EN: 'ja-en'
});

export const PREPOSITION_QUESTION_COUNT = 20;

export const buildPrepositionQuestionId = (baseId, mode) => `${baseId}__${mode.replace('-', '_')}`;

export const preparePrepositionItems = (items, mode) => items.map((item) => ({
  ...item,
  baseId: item.id,
  id: buildPrepositionQuestionId(item.id, mode)
}));

export const selectPrepositionItems = (items, limit = PREPOSITION_QUESTION_COUNT) =>
  [...items].sort(() => 0.5 - Math.random()).slice(0, Math.min(limit, items.length));

export const normalizePrepositionEnglish = (value) => String(value || '')
  .normalize('NFKC')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase();

export const normalizePrepositionJapanese = (value) => String(value || '')
  .normalize('NFKC')
  .replace(/[～〜~ー-]/g, '')
  .replace(/[/／、。\s]/g, '')
  .trim();

export const isPrepositionAnswerCorrect = (userAnswer, correctAnswer, mode) => {
  if (mode === PREPOSITION_MODES.JA_TO_EN) {
    const normalized = normalizePrepositionEnglish(userAnswer);
    return Boolean(normalized) && normalized === normalizePrepositionEnglish(correctAnswer);
  }

  const normalized = normalizePrepositionJapanese(userAnswer);
  return Boolean(normalized) && String(correctAnswer || '')
    .split(/[／/]/)
    .some((candidate) => normalized === normalizePrepositionJapanese(candidate));
};

export const getPrepositionModeLabel = (mode) =>
  mode === PREPOSITION_MODES.JA_TO_EN ? '日本語 → 英語' : '英語 → 日本語';
