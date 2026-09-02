import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceLocalLearningDays,
  createLocalXpVerificationStore,
  getLocalPlayerProgress,
  recordLocalQuizXp
} from '../src/utils/localXpVerification.js';

const payload = (attemptId, learningDate, score = 5) => ({
  studentId: 'student-1', attemptId, learningDate, contentId: 'kanji_test',
  isReview: false, score, total: 5
});

test('Day0からDay6までconditionが進みgame overは冪等', () => {
  const store = createLocalXpVerificationStore({ withActiveCharacter: true });
  const expected = ['healthy', 'faded', 'weak', 'hospitalized', 'critical', 'game_over'];
  for (let day = 1; day <= 6; day += 1) {
    const progress = advanceLocalLearningDays({ store, studentId: 'student-1', days: 1, learn: false });
    assert.equal(progress.activeCharacter.condition, expected[day - 1]);
    assert.equal(progress.activeCharacter.inactiveDays, day);
  }
  const endedAt = store.activeCharacter.endedAt;
  assert.equal(store.activeCharacter.status, 'game_over');
  assert.equal(store.activeCharacter.endReason, 'inactivity');
  getLocalPlayerProgress(store);
  assert.equal(store.activeCharacter.endedAt, endedAt);
});

test('Day5の通常学習でhealthyへ回復しgame overしない', () => {
  const store = createLocalXpVerificationStore({ withActiveCharacter: true });
  advanceLocalLearningDays({ store, studentId: 'student-1', days: 5, learn: false });
  assert.equal(getLocalPlayerProgress(store).activeCharacter.condition, 'critical');
  recordLocalQuizXp({ store, payload: payload('recover', store.verificationLearningDate) });
  const progress = getLocalPlayerProgress(store);
  assert.equal(progress.activeCharacter.condition, 'healthy');
  assert.equal(progress.activeCharacter.status, 'active');
});

test('game over後のXPは旧キャラでなくpendingXpへ入りptは保持する', () => {
  const store = createLocalXpVerificationStore({ withActiveCharacter: true });
  store.pointBalance = 15;
  store.ledger.set('pt', { eventKey: 'pt', currency: 'PT', amount: 15 });
  advanceLocalLearningDays({ store, studentId: 'student-1', days: 6, learn: false });
  const oldXp = store.activeCharacter.totalXp;
  recordLocalQuizXp({ store, payload: payload('after-game-over', store.verificationLearningDate) });
  const progress = getLocalPlayerProgress(store);
  assert.equal(progress.activeCharacter.totalXp, oldXp);
  assert.equal(progress.pendingXp, 5);
  assert.equal(progress.pointBalance, 20);
  assert.equal(progress.currentStreak, 1);
});
