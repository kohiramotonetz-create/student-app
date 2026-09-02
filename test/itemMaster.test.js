import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_MASTER } from '../src/constants/itemMaster.js';

test('ItemMasterは重複なしの29商品と正式価格を持つ', () => {
  assert.equal(ITEM_MASTER.length, 29);
  assert.equal(new Set(ITEM_MASTER.map(({ itemId }) => itemId)).size, 29);
  assert.ok(ITEM_MASTER.every(({ price }) => Number.isInteger(price) && price > 0));
  assert.equal(ITEM_MASTER.find(({ itemId }) => itemId === 'round_glasses').price, 100);
  assert.equal(ITEM_MASTER.find(({ itemId }) => itemId === 'classroom_background').price, 1000);
  assert.equal(ITEM_MASTER.find(({ itemId }) => itemId === 'silver_spoon').characterTypes[0], 'pudding');
  assert.equal(ITEM_MASTER.filter(({ itemType }) => itemType === 'common').length, 20);
  assert.equal(ITEM_MASTER.filter(({ itemType }) => itemType === 'character_specific').length, 9);
});

test('ItemMasterは性能差を持たず表示・購入条件だけを定義する', () => {
  for (const item of ITEM_MASTER) {
    assert.ok(['common', 'character_specific'].includes(item.itemType));
    assert.equal(item.ownershipScope, 'player');
    assert.equal('xpMultiplier' in item, false);
    assert.equal('stats' in item, false);
    assert.equal('ability' in item, false);
  }
});
