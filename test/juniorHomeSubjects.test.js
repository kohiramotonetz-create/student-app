import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_CONTENT_IDS,
  HIGH_SCHOOL_CONTENTS,
  JUNIOR_HOME_SUBJECT_IDS,
  getJuniorHomeContentsBySubject
} from '../src/constants/sukimakunContents.js';

test('junior home subject ids are unique, valid, and exclude high-school contents', () => {
  const subjectIds = Object.values(JUNIOR_HOME_SUBJECT_IDS).flat();
  const highSchoolIds = new Set(HIGH_SCHOOL_CONTENTS.map(({ contentId }) => contentId));

  assert.equal(subjectIds.length, 11);
  assert.equal(new Set(subjectIds).size, subjectIds.length);
  assert.deepEqual(subjectIds.filter((id) => !ALL_CONTENT_IDS.includes(id)), []);
  assert.deepEqual(subjectIds.filter((id) => highSchoolIds.has(id)), []);
});

test('junior home derives counts from allowed content ids only', () => {
  const allowed = new Set(['preposition_test', 'camp_kagawa_kanji', 'camp_science_qa', 'target_1900']);
  const grouped = getJuniorHomeContentsBySubject((contentId) => allowed.has(contentId));

  assert.deepEqual(Object.fromEntries(Object.entries(grouped).map(([key, contents]) => [key, contents.length])), {
    english: 1,
    japanese: 1,
    science: 1,
    social: 0
  });
});

test('junior home returns no content when permissions are empty', () => {
  const grouped = getJuniorHomeContentsBySubject(() => false);
  assert.equal(Object.values(grouped).flat().length, 0);
});
