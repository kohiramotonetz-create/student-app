import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEM_MASTER } from '../src/constants/itemMaster.js';

test('ItemMasterは重複なしの通常29商品と進化限定15商品を持つ', () => {
  assert.equal(ITEM_MASTER.length, 44);
  assert.equal(new Set(ITEM_MASTER.map(({ itemId }) => itemId)).size, 44);
  assert.ok(ITEM_MASTER.every(({ price }) => Number.isInteger(price) && price > 0));
  assert.equal(ITEM_MASTER.find(({ itemId }) => itemId === 'round_glasses').price, 100);
  assert.equal(ITEM_MASTER.find(({ itemId }) => itemId === 'classroom_background').price, 1000);
  assert.equal(ITEM_MASTER.find(({ itemId }) => itemId === 'silver_spoon').characterTypes[0], 'pudding');
  assert.equal(ITEM_MASTER.filter(({ itemType }) => itemType === 'common').length, 20);
  assert.equal(ITEM_MASTER.filter(({ itemType }) => itemType === 'character_specific').length, 9);
  assert.equal(ITEM_MASTER.filter(({ itemType }) => itemType === 'evolution_limited').length, 15);
});

test('ItemMasterは性能差を持たず表示・購入条件だけを定義する', () => {
  for (const item of ITEM_MASTER) {
    assert.ok(['common', 'character_specific', 'evolution_limited'].includes(item.itemType));
    assert.ok(['head', 'face', 'neck', 'body', 'handheld', 'background', 'effect'].includes(item.slot));
    assert.ok(item.assetKey.startsWith('item-'));
    assert.equal(item.ownershipScope, item.itemType === 'evolution_limited' ? 'character_instance' : 'player');
    assert.equal('xpMultiplier' in item, false);
    assert.equal('stats' in item, false);
    assert.equal('ability' in item, false);
  }
});
