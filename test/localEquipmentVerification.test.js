import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalXpVerificationStore, setLocalXpForVerification } from '../src/utils/localXpVerification.js';
import { equipLocalItem, grantLocalPointsForVerification, purchaseLocalShopItem, selectLocalVisualBranch, unequipLocalItem } from '../src/utils/localShopVerification.js';

const setup = (levelXp = 0) => {
  const store = createLocalXpVerificationStore({ withActiveCharacter: true });
  grantLocalPointsForVerification({ store, studentId: 'student', amount: 10000 });
  if (levelXp) setLocalXpForVerification({ store, studentId: 'student', targetXp: levelXp });
  return store;
};
const buy = (store, itemId) => purchaseLocalShopItem({ store, studentId: 'student', itemId, purchaseRequestId: `buy-${itemId}` });

test('所有アイテムを装備し同一slotを付け替え解除できる', () => {
  const store = setup();
  buy(store, 'round_glasses'); buy(store, 'sunglasses');
  assert.equal(equipLocalItem({ store, studentId: 'student', itemId: 'round_glasses', equipRequestId: 'equip-0001' }).equipment.face, 'round_glasses');
  assert.equal(equipLocalItem({ store, studentId: 'student', itemId: 'sunglasses', equipRequestId: 'equip-0002' }).equipment.face, 'sunglasses');
  assert.equal(unequipLocalItem({ store, slot: 'face', equipRequestId: 'equip-0003' }).equipment.face, null);
  assert.equal(equipLocalItem({ store, studentId: 'student', itemId: 'book', equipRequestId: 'equip-0004' }).reason, 'not_owned');
});

test('キャラ専用制限と終了キャラの装備固定を守る', () => {
  const store = setup();
  buy(store, 'silver_spoon');
  assert.equal(equipLocalItem({ store, studentId: 'student', itemId: 'silver_spoon', equipRequestId: 'equip-1001' }).result, 'success');
  store.activeCharacter.characterType = 'penguin';
  assert.equal(equipLocalItem({ store, studentId: 'student', itemId: 'silver_spoon', equipRequestId: 'equip-1002' }).reason, 'character_mismatch');
  store.activeCharacter.status = 'game_over';
  assert.equal(unequipLocalItem({ store, slot: 'handheld', equipRequestId: 'equip-1003' }).reason, 'character_not_active');
  assert.equal(store.activeCharacter.equipment.handheld, 'silver_spoon');
});

test('進化限定商品のLv期間と個体所有を検証する', () => {
  const store = setup(1139);
  assert.equal(buy(store, 'pudding_evolution_20').reason, 'level_locked');
  setLocalXpForVerification({ store, studentId: 'student', targetXp: 1140 });
  assert.equal(buy(store, 'pudding_evolution_20').result, 'success');
  assert.ok(store.ownedItems.has(`${store.activeCharacter.instanceId}::pudding_evolution_20`));
  const lateStore = setup(3120);
  assert.equal(purchaseLocalShopItem({ store: lateStore, studentId: 'student', itemId: 'pudding_evolution_20', purchaseRequestId: 'late-0001' }).reason, 'evolution_expired');
  assert.equal(buy(lateStore, 'pudding_evolution_40').result, 'success');
});

test('Lv60商品購入後だけvisualBranchを一度確定できる', () => {
  const store = setup(5900);
  assert.equal(buy(store, 'pudding_evolution_60').result, 'success');
  assert.equal(selectLocalVisualBranch({ store, branch: 'fruit' }).visualBranch, 'fruit');
  assert.equal(selectLocalVisualBranch({ store, branch: 'chocolate' }).reason, 'branch_already_selected');
});
