import { CONTENT_IDS } from '../constants/sukimakunContents.js';

// アプリ内で採点結果（score / total）が確定する小・中学生向け教材だけを明示する。
// 紙テスト作成はアプリ内完了イベントを持たないため対象外。
export const JUNIOR_SCORED_LEARNING_CONTENT_IDS = Object.freeze([
  CONTENT_IDS.junior_english_quiz,
  CONTENT_IDS.kakitan,
  CONTENT_IDS.irregular_verbs,
  CONTENT_IDS.preposition_test,
  CONTENT_IDS.junior_kobun,
  CONTENT_IDS.kanji_test,
  CONTENT_IDS.camp_kagawa_kanji,
  CONTENT_IDS.chemistry_formulas,
  CONTENT_IDS.camp_science_qa,
  CONTENT_IDS.camp_social_qa
]);

export const isJuniorScoredLearningContent = (contentId) =>
  JUNIOR_SCORED_LEARNING_CONTENT_IDS.includes(contentId);

export const createLearningAttempt = (
  contentId,
  isReview = false,
  uuidFactory = () => crypto.randomUUID(),
  nowFactory = () => new Date().toISOString()
) => {
  if (!isJuniorScoredLearningContent(contentId)) return null;
  return Object.freeze({
    attemptId: uuidFactory(),
    contentId,
    isReview: isReview === true,
    startedAtClient: nowFactory(),
    completedAtClient: null
  });
};

export const completeLearningAttempt = (attempt, contentId, nowFactory = () => new Date().toISOString()) => {
  if (!attempt || attempt.contentId !== contentId) return null;
  if (attempt.completedAtClient) return attempt;
  return Object.freeze({ ...attempt, completedAtClient: nowFactory() });
};

export const cancelLearningAttempt = () => null;

export const getLearningAttemptPayload = (attempt, contentId) =>
  attempt?.contentId === contentId
    ? Object.freeze({ attemptId: attempt.attemptId, isReview: attempt.isReview })
    : null;
