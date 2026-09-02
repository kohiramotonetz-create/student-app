import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT_IDS } from '../src/constants/sukimakunContents.js';
import {
  JUNIOR_SCORED_LEARNING_CONTENT_IDS,
  cancelLearningAttempt,
  completeLearningAttempt,
  createLearningAttempt,
  getLearningAttemptPayload,
  isJuniorScoredLearningContent
} from '../src/utils/learningAttempt.js';

const EXPECTED_CONTENT_IDS = [
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
];

test('採点結果を持つ小中学生10教材だけを共通attempt対象にする', () => {
  assert.deepEqual(JUNIOR_SCORED_LEARNING_CONTENT_IDS, EXPECTED_CONTENT_IDS);
  EXPECTED_CONTENT_IDS.forEach((contentId) => assert.equal(isJuniorScoredLearningContent(contentId), true));
  assert.equal(isJuniorScoredLearningContent(CONTENT_IDS.paper_english_test), false);
  assert.equal(isJuniorScoredLearningContent('unknown_content'), false);
});

test('通常と復習を明示し、セットごとに別のattemptIdを発行する', () => {
  let sequence = 0;
  const uuidFactory = () => `attempt-${++sequence}`;
  const nowFactory = () => '2026-09-02T00:00:00.000Z';
  const normal = createLearningAttempt(CONTENT_IDS.chemistry_formulas, false, uuidFactory, nowFactory);
  const review = createLearningAttempt(CONTENT_IDS.camp_science_qa, true, uuidFactory, nowFactory);

  assert.equal(normal.attemptId, 'attempt-1');
  assert.equal(normal.isReview, false);
  assert.equal(normal.completedAtClient, null);
  assert.equal(review.attemptId, 'attempt-2');
  assert.equal(review.isReview, true);
  assert.notEqual(normal.attemptId, review.attemptId);
});

test('setupだけでは対象外attemptを作らず、紙テストも対象外にする', () => {
  assert.equal(createLearningAttempt(CONTENT_IDS.paper_english_test, false, () => 'unused'), null);
  assert.equal(cancelLearningAttempt(), null);
});

test('正常完了後も同じattemptIdを保持し、再完了で作り直さない', () => {
  const started = createLearningAttempt(
    CONTENT_IDS.preposition_test,
    true,
    () => 'attempt-stable',
    () => '2026-09-02T00:00:00.000Z'
  );
  const completed = completeLearningAttempt(
    started,
    CONTENT_IDS.preposition_test,
    () => '2026-09-02T00:10:00.000Z'
  );
  const repeated = completeLearningAttempt(
    completed,
    CONTENT_IDS.preposition_test,
    () => '2026-09-02T00:20:00.000Z'
  );

  assert.equal(completed.attemptId, started.attemptId);
  assert.equal(completed.completedAtClient, '2026-09-02T00:10:00.000Z');
  assert.equal(repeated, completed);
  assert.deepEqual(getLearningAttemptPayload(completed, CONTENT_IDS.preposition_test), {
    attemptId: 'attempt-stable',
    isReview: true
  });
});

test('別教材の完了やpayloadへattemptを流用しない', () => {
  const attempt = createLearningAttempt(CONTENT_IDS.kanji_test, false, () => 'attempt-kanji');
  assert.equal(completeLearningAttempt(attempt, CONTENT_IDS.junior_kobun), null);
  assert.equal(getLearningAttemptPayload(attempt, CONTENT_IDS.junior_kobun), null);
});
