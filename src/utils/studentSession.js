export const STUDENT_SESSION_STORAGE_KEY = 'sukimakun.studentSessionToken';
export const STUDENT_SESSION_TOUCH_INTERVAL_MS = 30 * 60 * 1000;

export const readStudentSessionToken = (storage = globalThis.sessionStorage) => {
  try {
    return String(storage?.getItem(STUDENT_SESSION_STORAGE_KEY) || '').trim();
  } catch {
    return '';
  }
};

export const storeStudentSessionToken = (token, storage = globalThis.sessionStorage) => {
  const normalized = String(token || '').trim();
  if (!normalized) return '';
  storage?.setItem(STUDENT_SESSION_STORAGE_KEY, normalized);
  return normalized;
};

export const clearStudentSessionToken = (storage = globalThis.sessionStorage) => {
  try {
    storage?.removeItem(STUDENT_SESSION_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser modes; local state is still cleared.
  }
};

export const getStudentSessionTokenFromResponse = (data) =>
  String(data?.studentSessionToken || '').trim();

export const isExplicitStudentSessionInvalid = (data) =>
  ['STUDENT_SESSION_INVALID', 'STUDENT_SESSION_EXPIRED', 'STUDENT_SESSION_REVOKED']
    .includes(String(data?.code || ''));

export const buildStudentSessionPayload = (action, token, extra = {}) => ({
  action,
  studentSessionToken: String(token || '').trim(),
  ...extra
});

export const addStudentSessionToken = (payload, token) => {
  const normalized = String(token || '').trim();
  return normalized ? { ...payload, studentSessionToken: normalized } : { ...payload };
};

export const selectStudentAuthBootstrap = ({ uid, tk, storedToken }) => {
  if (uid && tk) return 'sso';
  if (storedToken) return 'session';
  return 'login';
};
