import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_MASTER,
  CHARACTER_STAGE_MIN_LEVELS,
  CHARACTER_TYPES,
  getCharacterStageDefinition
} from '../src/constants/characterMaster.js';
import { stageFromLevel } from '../src/utils/experienceProgress.js';
import {
  createLocalCharacterInstance,
  createLocalXpVerificationStore,
  getLocalPlayerProgress,
  recordLocalQuizXp,
  setLocalXpForVerification
} from '../src/utils/localXpVerification.js';

test('Character Masterは重複のない初期3キャラとstage 1〜6を持つ', () => {
  assert.deepEqual(CHARACTER_TYPES, ['pudding', 'penguin', 'sun']);
  assert.equal(new Set(CHARACTER_TYPES).size, 3);
  for (const character of CHARACTER_MASTER) {
    assert.deepEqual(character.stages.map(({ stage }) => stage), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(character.stages.map(({ minLevel }) => minLevel), CHARACTER_STAGE_MIN_LEVELS);
    for (const stage of character.stages) {
      assert.equal(stageFromLevel(stage.minLevel), stage.stage);
      assert.equal(stage.assetKey, `${character.characterType}-stage${stage.stage}`);
    }
  }
});

test('3キャラを選択でき、不正typeとactive中の2体目を拒否する', () => {
  for (const characterType of CHARACTER_TYPES) {
    const store = createLocalXpVerificationStore();
    const result = createLocalCharacterInstance({
      store, studentId: 's', characterType, selectionRequestId: `request-${characterType}`,
      createId: () => `instance-${characterType}`
    });
    assert.equal(result.created, true);
    assert.equal(result.character.characterType, characterType);
    assert.equal(getCharacterStageDefinition(characterType, 1).stage, 1);
    assert.equal(createLocalCharacterInstance({
      store, studentId: 's', characterType: 'pudding', selectionRequestId: `second-${characterType}`
    }).reason, 'ACTIVE_CHARACTER_EXISTS');
  }
  assert.equal(createLocalCharacterInstance({
    store: createLocalXpVerificationStore(), studentId: 's', characterType: 'unknown', selectionRequestId: 'invalid-type'
  }).reason, 'INVALID_CHARACTER_TYPE');
});

test('pendingXpをCharacterInstanceへ一括反映し、同じrequestは同じ1体を返す', () => {
  const store = createLocalXpVerificationStore();
  recordLocalQuizXp({ store, payload: {
    studentId: 's', attemptId: 'attempt-pending', contentId: 'kanji_test', score: 500, total: 500, isReview: false
  } });
  assert.equal(getLocalPlayerProgress(store).pendingXp, 500);
  const input = {
    store, studentId: 's', characterType: 'pudding', selectionRequestId: 'same-request', createId: () => 'instance-1'
  };
  const created = createLocalCharacterInstance(input);
  const duplicate = createLocalCharacterInstance(input);
  assert.equal(created.character.totalXp, 500);
  assert.equal(created.character.level, 10);
  assert.equal(getLocalPlayerProgress(store).pendingXp, 0);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.character.instanceId, 'instance-1');
});

test('大量pendingXpは進行値をLv100へcapし、監査用獲得XPは保持する', () => {
  const store = createLocalXpVerificationStore();
  setLocalXpForVerification({ store, studentId: 's', targetXp: 14000, requestId: 'huge-pending' });
  const result = createLocalCharacterInstance({
    store, studentId: 's', characterType: 'sun', selectionRequestId: 'sun-request', createId: () => 'sun-1'
  });
  assert.equal(result.character.totalXp, 13860);
  assert.equal(result.character.totalEarnedXp, 14000);
  assert.equal(result.character.level, 100);
  assert.equal(result.character.stage, 6);
});

test('XP境界でキャラ表示stageが自動更新される', () => {
  const store = createLocalXpVerificationStore();
  createLocalCharacterInstance({
    store, studentId: 's', characterType: 'penguin', selectionRequestId: 'penguin-request', createId: () => 'penguin-1'
  });
  for (const [xp, level, stage] of [[1139, 19, 1], [1140, 20, 2], [3119, 39, 2], [3120, 40, 3], [5899, 59, 3], [5900, 60, 4], [9479, 79, 4], [9480, 80, 5], [13859, 99, 5], [13860, 100, 6]]) {
    setLocalXpForVerification({ store, studentId: 's', targetXp: xp, requestId: `xp-${xp}` });
    const character = getLocalPlayerProgress(store).activeCharacter;
    assert.equal(character.level, level);
    assert.equal(character.stage, stage);
  }
});
