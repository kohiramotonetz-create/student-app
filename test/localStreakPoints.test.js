import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLocalCharacterInstance,
  createLocalXpVerificationStore,
  getLocalPlayerProgress,
  recordLocalLearningDay,
  recordLocalQuizXp,
  repairLocalXpCache,
  setLocalXpForVerification
} from '../src/utils/localXpVerification.js';

test('Day1〜8は週間ptを1日1回だけ付与する', () => {
  const store = createLocalXpVerificationStore();
  const expected = [5, 10, 20, 30, 45, 60, 90, 95];
  for (let day = 1; day <= 8; day += 1) {
    const date = `2026-09-${String(day).padStart(2, '0')}`;
    recordLocalLearningDay({ store, studentId: 's', learningDate: date });
    recordLocalLearningDay({ store, studentId: 's', learningDate: date });
    assert.equal(getLocalPlayerProgress(store).pointBalance, expected[day - 1]);
  }
  assert.equal(getLocalPlayerProgress(store).currentStreak, 8);
});

test('30日・60日は週間報酬と100ptを両方付与し再送でも増えない', () => {
  const store = createLocalXpVerificationStore();
  for (let day = 1; day <= 60; day += 1) {
    const date = new Date(Date.UTC(2026, 0, day)).toISOString().slice(0, 10);
    recordLocalLearningDay({ store, studentId: 's', learningDate: date });
  }
  const before = getLocalPlayerProgress(store).pointBalance;
  recordLocalLearningDay({ store, studentId: 's', learningDate: '2026-03-01' });
  assert.equal(before, 950);
  assert.equal(getLocalPlayerProgress(store).pointBalance, before);
  assert.equal([...store.ledger.values()].filter(({ type }) => type === 'streak_30days').length, 2);
});

test('学習が途切れるとstreakは1へ戻りlongestは保持する', () => {
  const store = createLocalXpVerificationStore();
  recordLocalLearningDay({ store, studentId: 's', learningDate: '2026-09-01' });
  recordLocalLearningDay({ store, studentId: 's', learningDate: '2026-09-02' });
  recordLocalLearningDay({ store, studentId: 's', learningDate: '2026-09-04' });
  const progress = getLocalPlayerProgress(store);
  assert.equal(progress.currentStreak, 1);
  assert.equal(progress.longestStreak, 2);
  assert.equal(progress.streakStartedDate, '2026-09-04');
});

test('通常attemptだけが学習日になり、復習と同一attempt再送は除外する', () => {
  const store = createLocalXpVerificationStore();
  const base = { studentId: 's', contentId: 'kanji_test', score: 0, total: 1 };
  recordLocalQuizXp({ store, payload: { ...base, attemptId: 'review', isReview: true, learningDate: '2026-09-01' } });
  assert.equal(getLocalPlayerProgress(store).currentStreak, 0);
  recordLocalQuizXp({ store, payload: { ...base, attemptId: 'normal', isReview: false, learningDate: '2026-09-01' } });
  recordLocalQuizXp({ store, payload: { ...base, attemptId: 'normal', isReview: false, learningDate: '2026-09-02' } });
  assert.equal(getLocalPlayerProgress(store).currentStreak, 1);
  assert.equal(getLocalPlayerProgress(store).pointBalance, 5);
});

test('Lv節目・複数跨ぎ・キャラ作成時pendingXp報酬を一度だけ付与する', () => {
  const store = createLocalXpVerificationStore({ withActiveCharacter: true });
  setLocalXpForVerification({ store, studentId: 's', targetXp: 2031, requestId: 'to31' });
  assert.equal(getLocalPlayerProgress(store).pointBalance, 300);
  setLocalXpForVerification({ store, studentId: 's', targetXp: 2031, requestId: 'same' });
  assert.equal(getLocalPlayerProgress(store).pointBalance, 300);

  const pendingStore = createLocalXpVerificationStore();
  setLocalXpForVerification({ store: pendingStore, studentId: 's', targetXp: 2100, requestId: 'pending' });
  const input = { store: pendingStore, studentId: 's', characterType: 'pudding', selectionRequestId: 'selection', createId: () => 'character-1' };
  createLocalCharacterInstance(input);
  createLocalCharacterInstance(input);
  assert.equal(getLocalPlayerProgress(pendingStore).pointBalance, 300);
});

test('PT台帳からpointBalance不足を修復する', () => {
  const store = createLocalXpVerificationStore();
  recordLocalLearningDay({ store, studentId: 's', learningDate: '2026-09-01' });
  store.pointBalance = 0;
  repairLocalXpCache(store);
  assert.equal(getLocalPlayerProgress(store).pointBalance, 5);
});
