import { MAX_CHARACTER_XP, createCharacterProgress, isXpEligibleContent, validateLearningScore } from './experienceProgress.js';
import { getCharacterDefinition } from '../constants/characterMaster.js';

const createLocalId = () => globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const createLocalSelectionRequestId = () => createLocalId();

export const createLocalXpVerificationStore = ({ withActiveCharacter = false } = {}) => ({
  ledger: new Map(),
  characterCreationRequests: new Map(),
  pendingXp: 0,
  activeCharacter: withActiveCharacter ? {
    instanceId: 'local-pudding', characterType: 'pudding', totalXp: 0,
    ...createCharacterProgress(0), status: 'active', totalCorrectCount: 0, totalEarnedXp: 0
  } : null
});

const rebuildLocalXpCache = (store) => {
  const earnedXp = [...store.ledger.values()].reduce((sum, transaction) => sum + transaction.amount, 0);
  if (!store.activeCharacter) {
    store.pendingXp = earnedXp;
    return;
  }
  const progress = createCharacterProgress(earnedXp);
  Object.assign(store.activeCharacter, progress, {
    totalCorrectCount: [...store.ledger.values()]
      .filter(({ type }) => type === 'quiz_correct')
      .reduce((sum, transaction) => sum + transaction.amount, 0),
    totalEarnedXp: earnedXp
  });
  store.pendingXp = 0;
};

export const recordLocalQuizXp = ({ store, payload }) => {
  if (!store || !payload?.attemptId) return { awarded: false, reason: 'MISSING_ATTEMPT' };
  if (payload.isReview === true) return { awarded: false, reason: 'REVIEW' };
  if (!isXpEligibleContent(payload.contentId)) return { awarded: false, reason: 'NOT_ELIGIBLE' };
  const score = validateLearningScore(payload.score, payload.total);
  if (!score.valid) return { awarded: false, reason: score.reason };
  const eventKey = `quiz_xp::${payload.studentId || ''}::${payload.attemptId}`;
  const duplicate = store.ledger.has(eventKey);
  if (!duplicate && score.score > 0) {
    store.ledger.set(eventKey, { eventKey, currency: 'XP', type: 'quiz_correct', sourceId: payload.attemptId, amount: score.score });
  }
  rebuildLocalXpCache(store);
  return { awarded: !duplicate && score.score > 0, duplicate, eventKey, amount: duplicate ? 0 : score.score };
};

export const recordLocalMissionXp = ({ store, studentId, missionDate, mission, achievedNow }) => {
  if (!store || !mission || achievedNow !== true || !Number.isInteger(mission.rewardXp) || mission.rewardXp <= 0) {
    return { awarded: false };
  }
  const eventKey = `mission_xp::${studentId || ''}::${missionDate}::${mission.id}`;
  const duplicate = store.ledger.has(eventKey);
  if (!duplicate) {
    store.ledger.set(eventKey, { eventKey, currency: 'XP', type: 'daily_mission', sourceId: `${missionDate}::${mission.id}`, amount: mission.rewardXp });
  }
  rebuildLocalXpCache(store);
  return { awarded: !duplicate, duplicate, eventKey, amount: duplicate ? 0 : mission.rewardXp };
};

export const createLocalCharacterInstance = ({
  store,
  studentId,
  characterType,
  selectionRequestId,
  createId = createLocalId
}) => {
  if (!store || !selectionRequestId) return { created: false, reason: 'MISSING_REQUEST_ID' };
  const duplicate = store.characterCreationRequests.get(selectionRequestId);
  if (duplicate) return { created: false, duplicate: true, character: { ...duplicate } };
  if (!getCharacterDefinition(characterType)) return { created: false, reason: 'INVALID_CHARACTER_TYPE' };
  if (store.activeCharacter) return { created: false, reason: 'ACTIVE_CHARACTER_EXISTS' };

  rebuildLocalXpCache(store);
  const earnedXp = store.pendingXp;
  const progress = createCharacterProgress(earnedXp);
  const character = {
    instanceId: createId(), userId: studentId, characterType, ...progress,
    visualBranch: null, status: 'active', startedAt: 'local-e2e', endedAt: null,
    totalCorrectCount: [...store.ledger.values()]
      .filter(({ type }) => type === 'quiz_correct')
      .reduce((sum, transaction) => sum + transaction.amount, 0),
    totalEarnedXp: earnedXp, createdAt: 'local-e2e', updatedAt: 'local-e2e'
  };
  store.activeCharacter = character;
  store.pendingXp = 0;
  store.characterCreationRequests.set(selectionRequestId, character);
  return { created: true, duplicate: false, character: { ...character } };
};

export const setLocalXpForVerification = ({ store, studentId, targetXp, requestId = createLocalId() }) => {
  const current = [...store.ledger.values()].reduce((sum, transaction) => sum + transaction.amount, 0);
  const normalizedTarget = Math.max(current, Math.trunc(Number(targetXp) || 0));
  const amount = normalizedTarget - current;
  if (amount > 0) {
    const eventKey = `local_xp::${studentId || ''}::${requestId}`;
    store.ledger.set(eventKey, { eventKey, currency: 'XP', type: 'local_verification', sourceId: requestId, amount });
  }
  rebuildLocalXpCache(store);
  return getLocalPlayerProgress(store);
};

export const repairLocalXpCache = (store) => {
  rebuildLocalXpCache(store);
  return getLocalPlayerProgress(store);
};

export const getLocalPlayerProgress = (store) => {
  if (!store?.activeCharacter) return { activeCharacter: null, pendingXp: store?.pendingXp || 0 };
  return {
    activeCharacter: { ...store.activeCharacter, totalXp: Math.min(MAX_CHARACTER_XP, store.activeCharacter.totalXp) },
    pendingXp: store.pendingXp
  };
};
