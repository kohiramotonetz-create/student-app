import test from 'node:test';
import assert from 'node:assert/strict';
import { reorderStrokesForKanjiRecognition } from '../src/utils/kanjiRecognition.js';

const stroke = (points) => points.map(([x, y]) => ({ x, y }));

test('reorders horizontally separated characters from left to right', () => {
  const leftCharacter = stroke([[20, 20], [30, 40]]);
  const rightCharacter = stroke([[120, 20], [130, 40]]);

  const reordered = reorderStrokesForKanjiRecognition([rightCharacter, leftCharacter]);
  assert.deepEqual(reordered, [leftCharacter, rightCharacter]);
});

test('reorders vertically separated characters from top to bottom', () => {
  const topCharacter = stroke([[40, 20], [50, 50]]);
  const bottomCharacter = stroke([[40, 140], [50, 180]]);

  const reordered = reorderStrokesForKanjiRecognition([bottomCharacter, topCharacter]);
  assert.deepEqual(reordered, [topCharacter, bottomCharacter]);
});

test('keeps strokes that belong to the same character together', () => {
  const sameCharacterStroke1 = stroke([[20, 20], [40, 40]]);
  const sameCharacterStroke2 = stroke([[35, 25], [45, 55]]);
  const anotherCharacter = stroke([[130, 20], [150, 40]]);

  const reordered = reorderStrokesForKanjiRecognition([
    anotherCharacter,
    sameCharacterStroke1,
    sameCharacterStroke2
  ]);

  assert.deepEqual(reordered, [
    sameCharacterStroke1,
    sameCharacterStroke2,
    anotherCharacter
  ]);
});

