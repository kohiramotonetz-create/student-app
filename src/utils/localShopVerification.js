import { ITEM_MASTER, createEmptyEquipment, getItemDefinition } from '../constants/itemMaster.js';
import { getCharacterDefinition } from '../constants/characterMaster.js';

const recalculatePointBalance = (store) => {
  store.pointBalance = [...store.ledger.values()]
    .filter(({ currency, status = 'COMPLETED' }) => currency === 'PT' && status === 'COMPLETED')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  return store.pointBalance;
};

const ownershipKeyFor = (studentId, item, character = null) => item.ownershipScope === 'character_instance'
  ? `${character?.instanceId || ''}::${item.itemId}`
  : `${studentId}::${item.itemId}`;

const evolutionReason = (item, character) => {
  if (item.itemType !== 'evolution_limited') return null;
  if (!character || character.status !== 'active' || !item.characterTypes.includes(character.characterType)) return 'character_required';
  if (character.level < item.requiredLevel) return 'level_locked';
  if (item.nextEvolutionLevel && character.level >= item.nextEvolutionLevel) return 'evolution_expired';
  return null;
};

export const getLocalShopItems = ({ store, studentId }) => ITEM_MASTER
  .map((item) => {
    const ownershipKey = ownershipKeyFor(studentId, item, store.activeCharacter);
    const owned = store.ownedItems.has(ownershipKey);
    const activeCharacter = store.activeCharacter;
    const characterMatched = item.itemType === 'common' || item.itemType === 'evolution_limited'
      || (activeCharacter?.status === 'active' && item.characterTypes.includes(activeCharacter.characterType));
    const enoughPoints = recalculatePointBalance(store) >= item.price;
    let reason = null;
    if (owned) reason = 'already_owned';
    else if (evolutionReason(item, activeCharacter)) reason = evolutionReason(item, activeCharacter);
    else if (!characterMatched) reason = 'character_required';
    else if (!enoughPoints) reason = 'insufficient_points';
    return { ...item, owned, purchasable: reason === null, reason };
  });

export const grantLocalPointsForVerification = ({ store, studentId, amount = 500, requestId = 'shop-seed' }) => {
  const normalized = Math.max(0, Math.trunc(Number(amount) || 0));
  const eventKey = `local_shop_points::${studentId || ''}::${requestId}`;
  if (!store.ledger.has(eventKey) && normalized > 0) {
    store.ledger.set(eventKey, { eventKey, currency: 'PT', type: 'local_shop_seed', amount: normalized, status: 'COMPLETED' });
  }
  return recalculatePointBalance(store);
};

export const purchaseLocalShopItem = ({
  store,
  studentId,
  itemId,
  purchaseRequestId,
  skipOwnershipWrite = false
}) => {
  if (!store || !purchaseRequestId) return { result: 'error', reason: 'invalid_request' };
  const item = getItemDefinition(itemId);
  if (!item || !item.enabled) return { result: 'error', reason: 'invalid_item' };
  const eventKey = `purchase::${studentId || ''}::${purchaseRequestId}`;
  const ownershipKey = ownershipKeyFor(studentId, item, store.activeCharacter);
  const existingLedger = store.ledger.get(eventKey);
  if (existingLedger) {
    if (!store.ownedItems.has(ownershipKey) && !skipOwnershipWrite) {
      store.ownedItems.set(ownershipKey, existingLedger.ownership);
    }
    return { result: 'success', duplicate: true, alreadyOwned: true, item, pointBalance: recalculatePointBalance(store) };
  }
  if (store.ownedItems.has(ownershipKey)) {
    return { result: 'success', duplicate: false, alreadyOwned: true, item, pointBalance: recalculatePointBalance(store) };
  }
  const activeCharacter = store.activeCharacter;
  const evolutionError = evolutionReason(item, activeCharacter);
  if (evolutionError) return { result: 'error', reason: evolutionError, pointBalance: recalculatePointBalance(store) };
  if (item.itemType === 'character_specific'
    && (!activeCharacter || activeCharacter.status !== 'active' || !item.characterTypes.includes(activeCharacter.characterType))) {
    return { result: 'error', reason: 'character_required', pointBalance: recalculatePointBalance(store) };
  }
  const balance = recalculatePointBalance(store);
  if (balance < item.price) return { result: 'error', reason: 'insufficient_points', pointBalance: balance };
  const ownership = {
    ownershipKey, userId: studentId, itemId: item.itemId, characterInstanceId: item.ownershipScope === 'character_instance' ? activeCharacter.instanceId : '',
    ownershipScope: item.ownershipScope, acquiredAt: 'local-e2e', source: 'purchase',
    sourceId: purchaseRequestId, pricePaid: item.price, status: 'owned',
    createdAt: 'local-e2e', updatedAt: 'local-e2e'
  };
  store.ledger.set(eventKey, {
    eventKey, currency: 'PT', type: 'item_purchase', sourceId: item.itemId,
    amount: -item.price, status: 'COMPLETED', ownership
  });
  recalculatePointBalance(store);
  if (!skipOwnershipWrite) store.ownedItems.set(ownershipKey, ownership);
  return { result: 'success', duplicate: false, alreadyOwned: false, item, pointBalance: store.pointBalance };
};

export const createLocalPurchaseRequestId = () => globalThis.crypto?.randomUUID?.()
  || `purchase-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const equipLocalItem = ({ store, studentId, itemId, equipRequestId }) => {
  if (!store?.activeCharacter || store.activeCharacter.status !== 'active') return { result: 'error', reason: 'character_not_active' };
  const item = getItemDefinition(itemId);
  if (!item) return { result: 'error', reason: 'invalid_item' };
  const ownershipKey = ownershipKeyFor(studentId, item, store.activeCharacter);
  if (!store.ownedItems.has(ownershipKey)) return { result: 'error', reason: 'not_owned' };
  if (item.characterTypes.length && !item.characterTypes.includes(store.activeCharacter.characterType)) return { result: 'error', reason: 'character_mismatch' };
  store.equipRequests ||= new Map();
  if (equipRequestId && store.equipRequests.has(equipRequestId)) return { result: 'success', duplicate: true, equipment: { ...store.activeCharacter.equipment } };
  store.activeCharacter.equipment ||= createEmptyEquipment();
  store.activeCharacter.equipment[item.slot] = item.itemId;
  if (equipRequestId) store.equipRequests.set(equipRequestId, { itemId, slot: item.slot });
  return { result: 'success', duplicate: false, equipment: { ...store.activeCharacter.equipment } };
};

export const unequipLocalItem = ({ store, slot, equipRequestId }) => {
  if (!store?.activeCharacter || store.activeCharacter.status !== 'active') return { result: 'error', reason: 'character_not_active' };
  if (!(slot in createEmptyEquipment())) return { result: 'error', reason: 'invalid_slot' };
  store.equipRequests ||= new Map();
  if (equipRequestId && store.equipRequests.has(equipRequestId)) return { result: 'success', duplicate: true, equipment: { ...store.activeCharacter.equipment } };
  store.activeCharacter.equipment ||= createEmptyEquipment();
  store.activeCharacter.equipment[slot] = null;
  if (equipRequestId) store.equipRequests.set(equipRequestId, { slot, itemId: null });
  return { result: 'success', equipment: { ...store.activeCharacter.equipment } };
};

export const selectLocalVisualBranch = ({ store, branch }) => {
  const character = store?.activeCharacter;
  if (!character || character.status !== 'active' || character.level < 60) return { result: 'error', reason: 'level_locked' };
  if (character.visualBranch) return { result: 'error', reason: 'branch_already_selected' };
  const evolutionItem = getItemDefinition(`${character.characterType}_evolution_60`);
  if (!store.ownedItems.has(ownershipKeyFor('', evolutionItem, character))) return { result: 'error', reason: 'evolution_item_required' };
  if (!getCharacterDefinition(character.characterType)?.visualBranches.includes(branch)) return { result: 'error', reason: 'invalid_branch' };
  character.visualBranch = branch;
  return { result: 'success', visualBranch: branch };
};
