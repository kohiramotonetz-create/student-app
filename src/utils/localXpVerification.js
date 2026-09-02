import { MAX_CHARACTER_XP, createCharacterProgress, isXpEligibleContent, validateLearningScore } from './experienceProgress.js';
import { getCharacterDefinition } from '../constants/characterMaster.js';
import {
  LEVEL_REWARD_POINTS,
  getCrossedLevelRewards,
  getStreakRewardForDay,
  getThirtyDayRewardCycle,
  updateStreakForLearningDate
} from './streakPoints.js';
import { evaluateCharacterCareState } from './characterCare.js';

const createLocalId = () => globalThis.crypto?.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const createLocalSelectionRequestId = () => createLocalId();

export const createLocalXpVerificationStore = ({ withActiveCharacter = false } = {}) => ({
  ledger: new Map(),
  characterCreationRequests: new Map(),
  completedAttempts: new Set(),
  learningDates: new Set(),
  pendingXp: 0,
  pointBalance: 0,
  currentStreak: 0,
  longestStreak: 0,
  streakStartedDate: null,
  lastLearningDate: null,
  verificationLearningDate: '2026-09-01',
  activeCharacter: withActiveCharacter ? {
    instanceId: 'local-pudding', characterType: 'pudding', totalXp: 0,
    ...createCharacterProgress(0), status: 'active', totalCorrectCount: 0, totalEarnedXp: 0,
    careStartedDate: '2026-09-01', endedAt: null, endReason: null
  } : null
});

const evaluateLocalCharacterCare = (store, currentDate = store?.verificationLearningDate) => {
  if (!store?.activeCharacter) return null;
  const character = store.activeCharacter;
  const state = evaluateCharacterCareState({
    careStartedDate: character.careStartedDate,
    lastLearningDate: store.lastLearningDate,
    currentDate,
    status: character.status
  });
  if (character.status === 'active' && state.condition === 'game_over') {
    character.status = 'game_over';
    character.endedAt = character.endedAt || `${currentDate}T00:00:00+09:00`;
    character.endReason = character.endReason || 'inactivity';
    character.updatedAt = 'local-e2e';
  }
  return { ...state, condition: character.status === 'game_over' ? 'game_over' : state.condition };
};

const rebuildLocalXpCache = (store) => {
  const transactions = [...store.ledger.values()];
  const earnedXp = transactions.filter(({ currency }) => currency === 'XP')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  store.pointBalance = transactions.filter(({ currency }) => currency === 'PT')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  if (!store.activeCharacter) {
    store.pendingXp = earnedXp;
    return;
  }
  if (store.activeCharacter.status !== 'active') {
    store.pendingXp = Math.max(0, earnedXp - (Number(store.activeCharacter.totalEarnedXp) || 0));
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

const appendLocalPtOnce = (store, transaction) => {
  if (store.ledger.has(transaction.eventKey)) return false;
  store.ledger.set(transaction.eventKey, { ...transaction, currency: 'PT' });
  return true;
};

const awardLocalLevelRewards = ({ store, studentId, characterInstanceId, previousLevel, nextLevel, learningDate }) => {
  const levels = getCrossedLevelRewards(previousLevel, nextLevel);
  for (const level of levels) {
    appendLocalPtOnce(store, {
      eventKey: `level_reward::${characterInstanceId}::${level}`,
      type: 'level_reward', sourceId: String(level), userId: studentId,
      characterInstanceId, amount: LEVEL_REWARD_POINTS[level], learningDate
    });
  }
  return levels;
};

export const recordLocalLearningDay = ({ store, studentId, learningDate }) => {
  if (!store || !/^\d{4}-\d{2}-\d{2}$/.test(String(learningDate || ''))) return { changed: false, reason: 'INVALID_DATE' };
  const previous = {
    currentStreak: store.currentStreak, longestStreak: store.longestStreak,
    streakStartedDate: store.streakStartedDate, lastLearningDate: store.lastLearningDate
  };
  const updated = updateStreakForLearningDate(previous, learningDate);
  if (!updated.changed) {
    rebuildLocalXpCache(store);
    return { changed: false, duplicate: updated.reason !== 'OUT_OF_ORDER_DATE', reason: updated.reason || null };
  }
  store.learningDates.add(learningDate);
  Object.assign(store, {
    currentStreak: updated.currentStreak,
    longestStreak: updated.longestStreak,
    streakStartedDate: updated.streakStartedDate,
    lastLearningDate: updated.lastLearningDate
  });
  appendLocalPtOnce(store, {
    eventKey: `streak_daily::${studentId || ''}::${learningDate}`,
    type: 'streak_daily', sourceId: learningDate, userId: studentId,
    amount: getStreakRewardForDay(updated.currentStreak), learningDate
  });
  const cycle = getThirtyDayRewardCycle(updated.currentStreak);
  if (cycle) appendLocalPtOnce(store, {
    eventKey: `streak_30days::${studentId || ''}::${updated.streakStartedDate}::${cycle}`,
    type: 'streak_30days', sourceId: `${updated.streakStartedDate}::${cycle}`, userId: studentId,
    amount: 100, learningDate
  });
  rebuildLocalXpCache(store);
  return { changed: true, currentStreak: updated.currentStreak, cycle };
};

export const recordLocalQuizXp = ({ store, payload }) => {
  if (!store || !payload?.attemptId) return { awarded: false, reason: 'MISSING_ATTEMPT' };
  if (payload.isReview === true) return { awarded: false, reason: 'REVIEW' };
  if (!isXpEligibleContent(payload.contentId)) return { awarded: false, reason: 'NOT_ELIGIBLE' };
  const score = validateLearningScore(payload.score, payload.total);
  if (!score.valid) return { awarded: false, reason: score.reason };
  const learningDate = payload.learningDate || store.verificationLearningDate;
  evaluateLocalCharacterCare(store, learningDate);
  const eventKey = `quiz_xp::${payload.studentId || ''}::${payload.attemptId}`;
  const duplicate = store.completedAttempts.has(payload.attemptId);
  if (!duplicate) {
    store.completedAttempts.add(payload.attemptId);
    recordLocalLearningDay({ store, studentId: payload.studentId, learningDate });
  }
  const previousLevel = store.activeCharacter?.level || null;
  if (!duplicate && score.score > 0) {
    store.ledger.set(eventKey, { eventKey, currency: 'XP', type: 'quiz_correct', sourceId: payload.attemptId, amount: score.score });
  }
  rebuildLocalXpCache(store);
  if (store.activeCharacter && previousLevel !== null) {
    awardLocalLevelRewards({
      store, studentId: payload.studentId, characterInstanceId: store.activeCharacter.instanceId,
      previousLevel, nextLevel: store.activeCharacter.level, learningDate
    });
    rebuildLocalXpCache(store);
  }
  return { awarded: !duplicate && score.score > 0, duplicate, eventKey, amount: duplicate ? 0 : score.score };
};

export const recordLocalMissionXp = ({ store, studentId, missionDate, mission, achievedNow }) => {
  if (!store || !mission || achievedNow !== true || !Number.isInteger(mission.rewardXp) || mission.rewardXp <= 0) {
    return { awarded: false };
  }
  const eventKey = `mission_xp::${studentId || ''}::${missionDate}::${mission.id}`;
  const duplicate = store.ledger.has(eventKey);
  const previousLevel = store.activeCharacter?.level || null;
  if (!duplicate) {
    store.ledger.set(eventKey, { eventKey, currency: 'XP', type: 'daily_mission', sourceId: `${missionDate}::${mission.id}`, amount: mission.rewardXp });
  }
  rebuildLocalXpCache(store);
  if (store.activeCharacter && previousLevel !== null) {
    awardLocalLevelRewards({
      store, studentId, characterInstanceId: store.activeCharacter.instanceId,
      previousLevel, nextLevel: store.activeCharacter.level, learningDate: missionDate
    });
    rebuildLocalXpCache(store);
  }
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
    careStartedDate: store.verificationLearningDate, endReason: null,
    totalCorrectCount: [...store.ledger.values()]
      .filter(({ type }) => type === 'quiz_correct')
      .reduce((sum, transaction) => sum + transaction.amount, 0),
    totalEarnedXp: earnedXp, createdAt: 'local-e2e', updatedAt: 'local-e2e'
  };
  store.activeCharacter = character;
  store.pendingXp = 0;
  store.characterCreationRequests.set(selectionRequestId, character);
  awardLocalLevelRewards({
    store, studentId, characterInstanceId: character.instanceId,
    previousLevel: 1, nextLevel: character.level, learningDate: store.lastLearningDate
  });
  rebuildLocalXpCache(store);
  return { created: true, duplicate: false, character: { ...character } };
};

export const setLocalXpForVerification = ({ store, studentId, targetXp, requestId = createLocalId() }) => {
  const current = [...store.ledger.values()].filter(({ currency }) => currency === 'XP')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const previousLevel = store.activeCharacter?.level || null;
  const normalizedTarget = Math.max(current, Math.trunc(Number(targetXp) || 0));
  const amount = normalizedTarget - current;
  if (amount > 0) {
    const eventKey = `local_xp::${studentId || ''}::${requestId}`;
    store.ledger.set(eventKey, { eventKey, currency: 'XP', type: 'local_verification', sourceId: requestId, amount });
  }
  rebuildLocalXpCache(store);
  if (store.activeCharacter && previousLevel !== null) {
    awardLocalLevelRewards({
      store, studentId, characterInstanceId: store.activeCharacter.instanceId,
      previousLevel, nextLevel: store.activeCharacter.level, learningDate: store.lastLearningDate
    });
    rebuildLocalXpCache(store);
  }
  return getLocalPlayerProgress(store);
};

export const setLocalVerificationLearningDate = (store, learningDate) => {
  store.verificationLearningDate = learningDate;
  return getLocalPlayerProgress(store);
};

export const advanceLocalLearningDays = ({ store, studentId, days = 1, learn = true }) => {
  const count = Math.max(1, Math.trunc(Number(days) || 1));
  const current = String(store.verificationLearningDate || '2026-09-01');
  const [year, month, day] = current.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + count)).toISOString().slice(0, 10);
  store.verificationLearningDate = nextDate;
  evaluateLocalCharacterCare(store, nextDate);
  if (learn) recordLocalLearningDay({ store, studentId, learningDate: nextDate });
  return getLocalPlayerProgress(store);
};

export const repairLocalXpCache = (store) => {
  rebuildLocalXpCache(store);
  return getLocalPlayerProgress(store);
};

export const getLocalPlayerProgress = (store) => {
  const careState = evaluateLocalCharacterCare(store);
  rebuildLocalXpCache(store);
  const player = {
    pendingXp: store?.pendingXp || 0,
    pointBalance: store?.pointBalance || 0,
    currentStreak: store?.currentStreak || 0,
    longestStreak: store?.longestStreak || 0,
    streakStartedDate: store?.streakStartedDate || null,
    lastLearningDate: store?.lastLearningDate || null,
    verificationLearningDate: store?.verificationLearningDate || null
  };
  if (!store?.activeCharacter) return { activeCharacter: null, ...player };
  return {
    activeCharacter: {
      ...store.activeCharacter,
      totalXp: Math.min(MAX_CHARACTER_XP, store.activeCharacter.totalXp),
      condition: careState?.condition || 'healthy',
      inactiveDays: careState?.inactiveDays || 0
    },
    ...player
  };
};
