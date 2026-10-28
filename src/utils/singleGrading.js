// The deployed GAS returns JSON with a string result, never a boolean result.
export const SINGLE_GRADING_TIMEOUT_MS = 10000; // User-approved client wait limit; does not stop GAS execution.
export const SINGLE_GRADING_MESSAGES = Object.freeze({
  timeout: '採点に時間がかかっています。もう一度『回答する』を押してください。',
  network: '通信エラーが発生しました。もう一度『回答する』を押してください。',
  invalid: '採点が正常にできませんでした。もう一度『回答する』を押してください。'
});

export const parseSingleGradingResult = (data) => {
  if (data && typeof data === 'object' && !Array.isArray(data)
    && typeof data.result === 'string') {
    const result = data.result.trim();
    if (result === 'true') return true;
    if (result === 'false') return false;
  }
  const error = new Error(SINGLE_GRADING_MESSAGES.invalid);
  error.code = 'SINGLE_GRADING_INVALID_RESPONSE';
  throw error;
};

export const getSingleGradingErrorMessage = (error) => {
  if (error?.code === 'ETIMEDOUT'
    || (error?.code === 'ECONNABORTED' && error?.message === SINGLE_GRADING_MESSAGES.timeout)) {
    return SINGLE_GRADING_MESSAGES.timeout;
  }
  if (error?.code === 'SINGLE_GRADING_INVALID_RESPONSE' || error instanceof SyntaxError) {
    return SINGLE_GRADING_MESSAGES.invalid;
  }
  return SINGLE_GRADING_MESSAGES.network;
};
