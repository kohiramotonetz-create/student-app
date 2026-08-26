export const isLocalPrepositionVerificationEnabled = (env) =>
  env.DEV === true && env.VITE_ENABLE_LOCAL_PREPOSITION_TEST === 'true';

export const createLocalPrepositionLog = ({ contentId, history, mode, testRange }) => ({
  contentId,
  history,
  mode,
  range: testRange,
  date: new Date().toISOString()
});
