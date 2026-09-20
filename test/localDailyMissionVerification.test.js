import test from 'node:test';
import assert from 'node:assert/strict';

import { CONTENT_IDS } from '../src/constants/sukimakunContents.js';
import {
  createLocalDailyMissionVerificationStore,
  getLocalDailyMissionProgress,
  isLocalDailyMissionVerificationEnabled,
  recordLocalDailyMissionCompletion
} from '../src/utils/localDailyMissionVerification.js';

const allowedContentIds = [
  CONTENT_IDS.kakitan,
  CONTENT_IDS.junior_english_quiz,
  CONTENT_IDS.irregular_verbs,
  CONTENT_IDS.kanji_test
];

const record = (store, contentId, attemptId, isReview = false) =>
  recordLocalDailyMissionCompletion({
    store,
    payload: { studentId: 'student-1', contentId, attemptId, isReview }
  });

test('local mission verification is development-only', () => {
  assert.equal(isLocalDailyMissionVerificationEnabled({ DEV: true }), true);
  assert.equal(isLocalDailyMissionVerificationEnabled({ DEV: false }), false);
});

test('kanji progresses from 1/3 to 3/3 and stays achieved', () => {
  const store = createLocalDailyMissionVerificationStore();
  for (let count = 1; count <= 4; count += 1) {
    assert.equal(record(store, CONTENT_IDS.kanji_test, `kanji-${count}`).recorded, true);
    const mission = getLocalDailyMissionProgress({ store, allowedContentIds }).missions
      .find(({ id }) => id === 'kanji');
    assert.equal(mission.completedCount, count);
    assert.equal(mission.achieved, count >= 3);
  }
});

test('three English targets share one total', () => {
  const store = createLocalDailyMissionVerificationStore();
  record(store, CONTENT_IDS.kakitan, 'english-1');
  record(store, CONTENT_IDS.junior_english_quiz, 'english-2');
  record(store, CONTENT_IDS.irregular_verbs, 'english-3');
  const mission = getLocalDailyMissionProgress({ store, allowedContentIds }).missions
    .find(({ id }) => id === 'english_vocabulary');
  assert.equal(mission.completedCount, 3);
  assert.equal(mission.achieved, true);
});

test('review, duplicate attempts, and non-target content do not increment', () => {
  const store = createLocalDailyMissionVerificationStore();
  assert.equal(record(store, CONTENT_IDS.kanji_test, '', false).reason, 'missing-attempt');
  assert.equal(record(store, CONTENT_IDS.kanji_test, 'review', true).reason, 'review');
  assert.equal(record(store, CONTENT_IDS.kanji_test, 'same').recorded, true);
  assert.equal(record(store, CONTENT_IDS.kanji_test, 'same').reason, 'duplicate');
  assert.equal(record(store, CONTENT_IDS.junior_kobun, 'other').reason, 'not-target');
  const mission = getLocalDailyMissionProgress({ store, allowedContentIds }).missions
    .find(({ id }) => id === 'kanji');
  assert.equal(mission.completedCount, 1);
});
