import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DAILY_MISSIONS,
  getHomeDailyMissionModels,
  getVisibleDailyMissions
} from '../src/constants/dailyMissions.js';

test('default daily missions contain only the confirmed contents and settings', () => {
  const english = DEFAULT_DAILY_MISSIONS.find(({ id }) => id === 'english_vocabulary');
  const kanji = DEFAULT_DAILY_MISSIONS.find(({ id }) => id === 'kanji');

  assert.deepEqual(english.targetContentIds, ['kakitan', 'junior_english_quiz', 'irregular_verbs']);
  assert.deepEqual(kanji.targetContentIds, ['kanji_test']);
  assert.equal(english.requiredCount, 3);
  assert.equal(kanji.requiredCount, 3);
  for (const mission of DEFAULT_DAILY_MISSIONS) {
    assert.equal(Object.hasOwn(mission, 'rewardXp'), false);
    assert.equal(Object.hasOwn(mission, 'rewardPoints'), false);
  }
});

test('missions remain at three sets and hide only when no target content is allowed', () => {
  const visible = getVisibleDailyMissions((contentId) => contentId === 'kakitan');
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, 'english_vocabulary');
  assert.equal(visible[0].requiredCount, 3);
  assert.deepEqual(getVisibleDailyMissions(() => false), []);
});

test('home mission models use definitions, permissions, and preparing progress safely', () => {
  const allowed = new Set(['kakitan', 'kanji_test']);
  const models = getHomeDailyMissionModels({
    permissionsInitialized: true,
    isContentAllowed: (contentId) => allowed.has(contentId)
  });

  assert.equal(models.length, 2);
  assert.equal(models[0].requiredCount, 3);
  assert.deepEqual(models[0].availableContentIds, ['kakitan']);
  assert.deepEqual(models[0].targetLabels, ['書き単']);
  assert.equal(Object.hasOwn(models[0], 'progress'), false);
});

test('home missions cover english-only, kanji-only, none, and uninitialized permissions', () => {
  const createModels = (ids, permissionsInitialized = true) => getHomeDailyMissionModels({
    permissionsInitialized,
    isContentAllowed: (contentId) => ids.includes(contentId)
  });

  assert.deepEqual(createModels(['irregular_verbs']).map(({ id }) => id), ['english_vocabulary']);
  assert.deepEqual(createModels(['kanji_test']).map(({ id }) => id), ['kanji']);
  assert.deepEqual(createModels(['target_1900', 'camp_kagawa_kanji', 'junior_kobun']), []);
  assert.deepEqual(createModels(['kakitan', 'kanji_test'], false), []);
  assert.equal(createModels(['junior_english_quiz'])[0].requiredCount, 3);
});

test('home goals do not accept live progress or expose reward settings', () => {
  const models = getHomeDailyMissionModels({
    permissionsInitialized: true,
    isContentAllowed: () => true,
    progressByMissionId: { english_vocabulary: { completedCount: 3, achieved: true } }
  });
  assert.equal(models.length, 2);
  for (const model of models) {
    assert.equal(model.requiredCount, 3);
    assert.equal(Object.hasOwn(model, 'progress'), false);
    assert.equal(Object.hasOwn(model, 'rewardXp'), false);
    assert.equal(Object.hasOwn(model, 'rewardPoints'), false);
  }
});
