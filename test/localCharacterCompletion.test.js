import test from 'node:test';
import assert from 'node:assert/strict';
import {
  completeLocalCharacter,
  createLocalCharacterInstance,
  createLocalXpVerificationStore,
  getLocalCharacterAlbum,
  getLocalPlayerProgress,
  recordLocalQuizXp,
  setLocalXpForVerification
} from '../src/utils/localXpVerification.js';

const studentId = 'local-student';
const createCharacter = (store, characterType = 'pudding', requestId = `select-${characterType}-0001`) => createLocalCharacterInstance({
  store, studentId, characterType, selectionRequestId: requestId, createId: () => `instance-${requestId}`
});

test('Lv100だけがcompletionReadyになり、明示完了でcompletedと500ptを一度だけ反映する', () => {
  const store = createLocalXpVerificationStore();
  createCharacter(store);
  setLocalXpForVerification({ store, studentId, targetXp: 13859, requestId: 'xp-before-100' });
  assert.equal(getLocalPlayerProgress(store).activeCharacter.completionReady, false);
  assert.equal(completeLocalCharacter({ store, studentId, completionRequestId: 'complete-too-early' }).reason, 'CHARACTER_NOT_READY');

  setLocalXpForVerification({ store, studentId, targetXp: 13860, requestId: 'xp-at-100' });
  assert.equal(getLocalPlayerProgress(store).activeCharacter.completionReady, true);
  const before = getLocalPlayerProgress(store).pointBalance;
  const first = completeLocalCharacter({ store, studentId, completionRequestId: 'complete-request-1' });
  const endedAt = store.activeCharacter.endedAt;
  const duplicate = completeLocalCharacter({ store, studentId, completionRequestId: 'complete-request-2' });
  const progress = getLocalPlayerProgress(store);
  assert.equal(first.completed, true);
  assert.equal(duplicate.duplicate, true);
  assert.equal(progress.activeCharacter.status, 'completed');
  assert.equal(progress.activeCharacter.endReason, 'completed');
  assert.equal(progress.activeCharacter.endedAt, endedAt);
  assert.equal(progress.pointBalance, before + 500);
  assert.equal([...store.ledger.values()].filter(({ type }) => type === 'character_complete').length, 1);
});

test('完了partial failureは再送で不足側だけを修復する', () => {
  const ledgerFirst = createLocalXpVerificationStore();
  createCharacter(ledgerFirst);
  setLocalXpForVerification({ store: ledgerFirst, studentId, targetXp: 13860, requestId: 'xp-ledger-first' });
  completeLocalCharacter({ store: ledgerFirst, studentId, completionRequestId: 'partial-ledger', skipStatusWrite: true });
  assert.equal(ledgerFirst.activeCharacter.status, 'active');
  completeLocalCharacter({ store: ledgerFirst, studentId, completionRequestId: 'repair-status' });
  assert.equal(ledgerFirst.activeCharacter.status, 'completed');
  assert.equal([...ledgerFirst.ledger.values()].filter(({ type }) => type === 'character_complete').length, 1);

  const statusFirst = createLocalXpVerificationStore();
  createCharacter(statusFirst);
  setLocalXpForVerification({ store: statusFirst, studentId, targetXp: 13860, requestId: 'xp-status-first' });
  completeLocalCharacter({ store: statusFirst, studentId, completionRequestId: 'partial-status', skipLedgerWrite: true });
  assert.equal(statusFirst.activeCharacter.status, 'completed');
  completeLocalCharacter({ store: statusFirst, studentId, completionRequestId: 'repair-ledger' });
  assert.equal([...statusFirst.ledger.values()].filter(({ type }) => type === 'character_complete').length, 1);
});

test('completed後のXPはpendingへ入り、次キャラへ移管して旧キャラをアルバムに残す', () => {
  const store = createLocalXpVerificationStore();
  createCharacter(store, 'pudding', 'select-pudding-0001');
  store.activeCharacter.visualBranch = 'fruit';
  store.activeCharacter.equipment.face = 'round_glasses';
  setLocalXpForVerification({ store, studentId, targetXp: 13860, requestId: 'xp-complete' });
  completeLocalCharacter({ store, studentId, completionRequestId: 'complete-pudding' });
  recordLocalQuizXp({ store, payload: { studentId, attemptId: 'after-complete-attempt', contentId: 'kanji_test', isReview: false, score: 20, total: 20, learningDate: '2026-09-02' } });
  assert.equal(getLocalPlayerProgress(store).pendingXp, 20);

  const next = createCharacter(store, 'penguin', 'select-penguin-0002');
  const progress = getLocalPlayerProgress(store);
  assert.equal(next.created, true);
  assert.equal(progress.activeCharacter.characterType, 'penguin');
  assert.equal(progress.activeCharacter.totalXp, 20);
  assert.equal(progress.activeCharacter.equipment.face, null);
  assert.equal(progress.pendingXp, 0);
  const album = getLocalCharacterAlbum(store);
  assert.equal(album.length, 1);
  assert.equal(album[0].characterType, 'pudding');
  assert.equal(album[0].visualBranch, 'fruit');
  assert.equal(album[0].equipment.face, 'round_glasses');
});

test('game_over後も次キャラを作成でき、終了日時順のアルバムになる', () => {
  const store = createLocalXpVerificationStore();
  createCharacter(store, 'sun', 'select-sun-000001');
  Object.assign(store.activeCharacter, { status: 'game_over', endedAt: '2026-09-07T00:00:00+09:00', endReason: 'inactivity' });
  createCharacter(store, 'penguin', 'select-penguin-0003');
  Object.assign(store.activeCharacter, { status: 'game_over', endedAt: '2026-09-08T00:00:00+09:00', endReason: 'inactivity' });
  const album = getLocalCharacterAlbum(store);
  assert.deepEqual(album.map(({ characterType }) => characterType), ['penguin', 'sun']);
  assert.equal(getLocalPlayerProgress(store).canSelectNextCharacter, true);
});

test('activeおよびcompletionReadyでは次キャラを作れない', () => {
  const store = createLocalXpVerificationStore();
  createCharacter(store);
  assert.equal(createCharacter(store, 'sun', 'select-sun-active').reason, 'ACTIVE_CHARACTER_EXISTS');
  setLocalXpForVerification({ store, studentId, targetXp: 13860, requestId: 'xp-ready' });
  assert.equal(createCharacter(store, 'sun', 'select-sun-ready').reason, 'ACTIVE_CHARACTER_EXISTS');
});
