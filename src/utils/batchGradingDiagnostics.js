export const BATCH_GRADING_ERROR_CODES = Object.freeze({
  GEMINI_RATE_LIMIT: 'GEMINI_RATE_LIMIT',
  GEMINI_UNAVAILABLE: 'GEMINI_UNAVAILABLE',
  GEMINI_HTTP_ERROR: 'GEMINI_HTTP_ERROR',
  GEMINI_JSON_PARSE_ERROR: 'GEMINI_JSON_PARSE_ERROR',
  GEMINI_INVALID_RESPONSE: 'GEMINI_INVALID_RESPONSE',
  GEMINI_TIMEOUT_OR_DELAY: 'GEMINI_TIMEOUT_OR_DELAY',
  CLIENT_TIMEOUT: 'CLIENT_TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
});

const SERVER_ERROR_CODES = new Set(Object.values(BATCH_GRADING_ERROR_CODES)
  .filter((code) => code !== BATCH_GRADING_ERROR_CODES.CLIENT_TIMEOUT
    && code !== BATCH_GRADING_ERROR_CODES.NETWORK_ERROR));

export const createBatchGradingRequestId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `grading-${Date.now().toString(36)}-${randomPart}`;
};

const createDiagnosticError = (code, message, requestId) => {
  const error = new Error(message);
  error.code = code;
  error.requestId = requestId || null;
  return error;
};

export const parseBatchGeminiResults = (data, expectedIndexes, fallbackRequestId = null) => {
  const requestId = data?.requestId || fallbackRequestId;
  if (data?.result === 'error') {
    const code = SERVER_ERROR_CODES.has(data.code)
      ? data.code
      : BATCH_GRADING_ERROR_CODES.INTERNAL_ERROR;
    throw createDiagnosticError(code, data.message || '採点に失敗しました。', requestId);
  }
  if (data?.result !== 'success' || !Array.isArray(data.results)) {
    throw createDiagnosticError(
      BATCH_GRADING_ERROR_CODES.GEMINI_INVALID_RESPONSE,
      'Gemini一括判定のレスポンスが不正です。',
      requestId
    );
  }

  const expected = new Set(expectedIndexes);
  const seen = new Set();
  const parsed = new Map();
  data.results.forEach((item) => {
    const index = Number(item?.index);
    if (!Number.isInteger(index)
      || !expected.has(index)
      || seen.has(index)
      || typeof item?.isCorrect !== 'boolean') {
      throw createDiagnosticError(
        BATCH_GRADING_ERROR_CODES.GEMINI_INVALID_RESPONSE,
        'Gemini一括判定のindexまたは判定値が不正です。',
        requestId
      );
    }
    seen.add(index);
    parsed.set(index, item.isCorrect);
  });
  if (seen.size !== expected.size || expectedIndexes.some((index) => !seen.has(index))) {
    throw createDiagnosticError(
      BATCH_GRADING_ERROR_CODES.GEMINI_INVALID_RESPONSE,
      'Gemini一括判定の結果が不足しています。',
      requestId
    );
  }
  return parsed;
};

export const classifyBatchGradingError = (error, fallbackRequestId = null) => {
  const responseData = error?.response?.data;
  const serverCode = responseData?.code;
  if (responseData?.result === 'error' && SERVER_ERROR_CODES.has(serverCode)) {
    return { code: serverCode, requestId: responseData.requestId || fallbackRequestId };
  }
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return { code: BATCH_GRADING_ERROR_CODES.CLIENT_TIMEOUT, requestId: fallbackRequestId };
  }
  if (SERVER_ERROR_CODES.has(error?.code)) {
    return { code: error.code, requestId: error.requestId || fallbackRequestId };
  }
  if (error?.request && !error?.response) {
    return { code: BATCH_GRADING_ERROR_CODES.NETWORK_ERROR, requestId: fallbackRequestId };
  }
  return { code: BATCH_GRADING_ERROR_CODES.INTERNAL_ERROR, requestId: error?.requestId || fallbackRequestId };
};

const ERROR_MESSAGES = Object.freeze({
  GEMINI_RATE_LIMIT: '採点処理が混み合っています。時間をおいて再度お試しください。',
  GEMINI_UNAVAILABLE: '採点サービスが一時的に利用できません。再度お試しください。',
  GEMINI_HTTP_ERROR: '採点サービスとの通信に失敗しました。時間をおいて再度お試しください。',
  GEMINI_JSON_PARSE_ERROR: '採点結果を正しく受信できませんでした。回答は保持されています。再度採点してください。',
  GEMINI_INVALID_RESPONSE: '採点結果を正しく受信できませんでした。回答は保持されています。再度採点してください。',
  GEMINI_TIMEOUT_OR_DELAY: '採点サービスからの応答に時間がかかっています。回答は保持されています。再度採点してください。',
  CLIENT_TIMEOUT: '採点に時間がかかっています。回答は保持されています。再度採点してください。',
  NETWORK_ERROR: '通信に失敗しました。接続を確認して再度採点してください。',
  INTERNAL_ERROR: '採点処理でエラーが発生しました。回答は保持されています。再度採点してください。'
});

export const formatBatchGradingErrorMessage = (code, requestId) => {
  const message = ERROR_MESSAGES[code] || ERROR_MESSAGES.INTERNAL_ERROR;
  return `${message}\nエラーコード: ${code}${requestId ? `\nrequestId: ${requestId}` : ''}`;
};
