import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CHARACTER_XP,
  createCharacterProgress,
  levelFromXp,
  stageFromLevel,
  validateLearningScore,
  xpForLevel,
  xpToNextLevel
} from '../src/utils/experienceProgress.js';
import {
  createLocalXpVerificationStore,
  getLocalPlayerProgress,
  recordLocalMissionXp,
  recordLocalQuizXp,
  repairLocalXpCache
} from '../src/utils/localXpVerification.js';
import { DEFAULT_DAILY_MISSIONS } from '../src/constants/dailyMissions.js';

test('XPカーブの主要Lv境界とLv100 capが正式値になる', () => {
  const expected = new Map([[1, 0], [2, 42], [10, 450], [20, 1140], [30, 2030], [40, 3120], [50, 4410], [60, 5900], [70, 7590], [80, 9480], [90, 11570], [100, 13860]]);
  for (const [level, xp] of expected) {
    assert.equal(xpForLevel(level), xp);
    assert.equal(levelFromXp(xp), level);
  }
  assert.equal(levelFromXp(41), 1);
  assert.equal(levelFromXp(449), 9);
  assert.equal(levelFromXp(1139), 19);
  assert.equal(levelFromXp(13859), 99);
  assert.equal(createCharacterProgress(99999).totalXp, MAX_CHARACTER_XP);
  assert.equal(xpToNextLevel(MAX_CHARACTER_XP), 0);
});

test('stageはLv20/40/60/80/100で進化する', () => {
  for (const [level, stage] of [[19, 1], [20, 2], [39, 2], [40, 3], [59, 3], [60, 4], [79, 4], [80, 5], [99, 5], [100, 6]]) {
    assert.equal(stageFromLevel(level), stage);
  }
});

test('scoreは有限整数かつ0以上total以下だけを受理する', () => {
  for (const [score, total] of [[0, 0], [0, 20], [1, 20], [20, 20]]) assert.equal(validateLearningScore(score, total).valid, true);
  for (const [score, total] of [[-1, 20], [21, 20], [1.5, 20], [1, -1], [Infinity, 20], ['1', 20]]) assert.equal(validateLearningScore(score, total).valid, false);
});

test('通常対象セットだけscore分XPを一度付与し、復習・対象外・異常値を除外する', () => {
  const store = createLocalXpVerificationStore({ withActiveCharacter: true });
  const base = { studentId: 'student', attemptId: 'attempt-1', contentId: 'kanji_test', score: 20, total: 20, isReview: false };
  assert.equal(recordLocalQuizXp({ store, payload: base }).amount, 20);
  assert.equal(recordLocalQuizXp({ store, payload: base }).duplicate, true);
  assert.equal(getLocalPlayerProgress(store).activeCharacter.totalXp, 20);
  assert.equal(recordLocalQuizXp({ store, payload: { ...base, attemptId: 'review', isReview: true } }).reason, 'REVIEW');
  assert.equal(recordLocalQuizXp({ store, payload: { ...base, attemptId: 'paper', contentId: 'paper_english_test' } }).reason, 'NOT_ELIGIBLE');
  assert.equal(recordLocalQuizXp({ store, payload: { ...base, attemptId: 'invalid', score: 21 } }).reason, 'INVALID_SCORE');
});

test('active characterなしではpendingXpへ入り、activeありではLvとstageを更新する', () => {
  const pendingStore = createLocalXpVerificationStore({ withActiveCharacter: false });
  recordLocalQuizXp({ store: pendingStore, payload: { studentId: 's', attemptId: 'a', contentId: 'kakitan', score: 42, total: 42, isReview: false } });
  assert.deepEqual(getLocalPlayerProgress(pendingStore), { activeCharacter: null, pendingXp: 42 });

  const activeStore = createLocalXpVerificationStore({ withActiveCharacter: true });
  recordLocalQuizXp({ store: activeStore, payload: { studentId: 's', attemptId: 'a', contentId: 'kakitan', score: 1140, total: 1140, isReview: false } });
  assert.equal(getLocalPlayerProgress(activeStore).activeCharacter.level, 20);
  assert.equal(getLocalPlayerProgress(activeStore).activeCharacter.stage, 2);
});

test('ミッション達成XPは日付・mission単位で一度だけ付与する', () => {
  const store = createLocalXpVerificationStore({ withActiveCharacter: true });
  const mission = DEFAULT_DAILY_MISSIONS[0];
  const input = { store, studentId: 's', missionDate: '2026-09-02', mission, achievedNow: true };
  recordLocalMissionXp(input);
  recordLocalMissionXp(input);
  assert.equal(getLocalPlayerProgress(store).activeCharacter.totalXp, 30);
  recordLocalMissionXp({ ...input, missionDate: '2026-09-03' });
  assert.equal(getLocalPlayerProgress(store).activeCharacter.totalXp, 60);
});

test('ledger作成後にキャッシュ更新が欠けても再構築でき、XPは二重にならない', () => {
  const store = createLocalXpVerificationStore({ withActiveCharacter: true });
  const payload = { studentId: 's', attemptId: 'a', contentId: 'kanji_test', score: 450, total: 450, isReview: false };
  recordLocalQuizXp({ store, payload });
  store.activeCharacter.totalXp = 0;
  store.activeCharacter.level = 1;
  repairLocalXpCache(store);
  assert.equal(getLocalPlayerProgress(store).activeCharacter.totalXp, 450);
  assert.equal(getLocalPlayerProgress(store).activeCharacter.level, 10);
  recordLocalQuizXp({ store, payload });
  assert.equal(getLocalPlayerProgress(store).activeCharacter.totalXp, 450);
});

test('Lv100到達後も進行用XPは13860を超えない', () => {
  const store = createLocalXpVerificationStore({ withActiveCharacter: true });
  recordLocalQuizXp({ store, payload: { studentId: 's', attemptId: 'max', contentId: 'kanji_test', score: 13860, total: 13860, isReview: false } });
  recordLocalQuizXp({ store, payload: { studentId: 's', attemptId: 'extra', contentId: 'kanji_test', score: 20, total: 20, isReview: false } });
  const character = getLocalPlayerProgress(store).activeCharacter;
  assert.equal(character.totalXp, 13860);
  assert.equal(character.level, 100);
  assert.equal(character.stage, 6);
  assert.equal(character.totalEarnedXp, 13880);
});
