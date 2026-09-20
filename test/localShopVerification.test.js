import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalXpVerificationStore } from '../src/utils/localXpVerification.js';
import {
  getLocalShopItems,
  grantLocalPointsForVerification,
  purchaseLocalShopItem
} from '../src/utils/localShopVerification.js';

const setup = ({ active = false, characterType = 'pudding', status = 'active', points = 500 } = {}) => {
  const store = createLocalXpVerificationStore({ withActiveCharacter: active });
  if (store.activeCharacter) Object.assign(store.activeCharacter, { characterType, status });
  grantLocalPointsForVerification({ store, studentId: 'student', amount: points });
  return store;
};

test('共通商品購入で残高と所有状態を更新し同じrequestを二重課金しない', () => {
  const store = setup();
  const first = purchaseLocalShopItem({ store, studentId: 'student', itemId: 'round_glasses', purchaseRequestId: 'request-1' });
  const duplicate = purchaseLocalShopItem({ store, studentId: 'student', itemId: 'round_glasses', purchaseRequestId: 'request-1' });
  assert.equal(first.pointBalance, 400);
  assert.equal(duplicate.pointBalance, 400);
  assert.equal(duplicate.duplicate, true);
  assert.equal(store.ownedItems.size, 1);
  assert.equal(store.ownedItems.values().next().value.pricePaid, 100);
});

test('残高不足・キャラ不一致・activeなしでは安全に拒否する', () => {
  const poor = setup({ points: 100 });
  assert.equal(purchaseLocalShopItem({ store: poor, studentId: 'student', itemId: 'classroom_background', purchaseRequestId: 'poor' }).reason, 'insufficient_points');
  assert.equal(poor.pointBalance, 100);
  const pudding = setup({ active: true });
  assert.equal(purchaseLocalShopItem({ store: pudding, studentId: 'student', itemId: 'fish', purchaseRequestId: 'wrong' }).reason, 'character_required');
  const noCharacter = setup();
  assert.equal(purchaseLocalShopItem({ store: noCharacter, studentId: 'student', itemId: 'silver_spoon', purchaseRequestId: 'none' }).reason, 'character_required');
});

test('active専用商品とgame over中の共通商品だけを購入できる', () => {
  const pudding = setup({ active: true });
  assert.equal(purchaseLocalShopItem({ store: pudding, studentId: 'student', itemId: 'silver_spoon', purchaseRequestId: 'spoon' }).result, 'success');
  const gameOver = setup({ active: true, status: 'game_over' });
  assert.equal(purchaseLocalShopItem({ store: gameOver, studentId: 'student', itemId: 'silver_spoon', purchaseRequestId: 'ended-specific' }).reason, 'character_required');
  assert.equal(purchaseLocalShopItem({ store: gameOver, studentId: 'student', itemId: 'round_glasses', purchaseRequestId: 'ended-common' }).result, 'success');
});

test('Ledgerだけ成功したpartial failureは再送でOwnedItemsを修復する', () => {
  const store = setup();
  purchaseLocalShopItem({ store, studentId: 'student', itemId: 'book', purchaseRequestId: 'repair', skipOwnershipWrite: true });
  assert.equal(store.pointBalance, 350);
  assert.equal(store.ownedItems.size, 0);
  const repaired = purchaseLocalShopItem({ store, studentId: 'student', itemId: 'book', purchaseRequestId: 'repair' });
  assert.equal(repaired.pointBalance, 350);
  assert.equal(store.ownedItems.size, 1);
});

test('ショップ表示modelは所有・残高・キャラ条件を返す', () => {
  const store = setup({ active: true, characterType: 'penguin', points: 100 });
  const items = getLocalShopItems({ store, studentId: 'student' });
  assert.equal(items.find(({ itemId }) => itemId === 'fish').purchasable, true);
  assert.equal(items.find(({ itemId }) => itemId === 'silver_spoon').reason, 'character_required');
  assert.equal(items.find(({ itemId }) => itemId === 'classroom_background').reason, 'insufficient_points');
});
