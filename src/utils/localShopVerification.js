import { ITEM_MASTER, getItemDefinition } from '../constants/itemMaster.js';

const recalculatePointBalance = (store) => {
  store.pointBalance = [...store.ledger.values()]
    .filter(({ currency, status = 'COMPLETED' }) => currency === 'PT' && status === 'COMPLETED')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  return store.pointBalance;
};

const ownershipKeyFor = (studentId, item) => item.ownershipScope === 'character_instance'
  ? `${studentId}::${item.itemId}`
  : `${studentId}::${item.itemId}`;

export const getLocalShopItems = ({ store, studentId }) => ITEM_MASTER
  .filter(({ itemType }) => itemType !== 'evolution_limited')
  .map((item) => {
    const ownershipKey = ownershipKeyFor(studentId, item);
    const owned = store.ownedItems.has(ownershipKey);
    const activeCharacter = store.activeCharacter;
    const characterMatched = item.itemType === 'common'
      || (activeCharacter?.status === 'active' && item.characterTypes.includes(activeCharacter.characterType));
    const enoughPoints = recalculatePointBalance(store) >= item.price;
    let reason = null;
    if (owned) reason = 'already_owned';
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
  if (!item || !item.enabled || item.itemType === 'evolution_limited') return { result: 'error', reason: 'invalid_item' };
  const eventKey = `purchase::${studentId || ''}::${purchaseRequestId}`;
  const ownershipKey = ownershipKeyFor(studentId, item);
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
  if (item.itemType === 'character_specific'
    && (!activeCharacter || activeCharacter.status !== 'active' || !item.characterTypes.includes(activeCharacter.characterType))) {
    return { result: 'error', reason: 'character_required', pointBalance: recalculatePointBalance(store) };
  }
  const balance = recalculatePointBalance(store);
  if (balance < item.price) return { result: 'error', reason: 'insufficient_points', pointBalance: balance };
  const ownership = {
    ownershipKey, userId: studentId, itemId: item.itemId, characterInstanceId: '',
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
