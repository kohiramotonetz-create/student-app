import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STUDENT_SESSION_STORAGE_KEY,
  addStudentSessionToken,
  buildStudentSessionPayload,
  clearStudentSessionToken,
  getStudentSessionTokenFromResponse,
  isExplicitStudentSessionInvalid,
  readStudentSessionToken,
  selectStudentAuthBootstrap,
  storeStudentSessionToken
} from '../src/utils/studentSession.js';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
};

test('normal login and SSO responses use the same session token storage path', () => {
  const storage = createStorage();
  const normalToken = getStudentSessionTokenFromResponse({ studentSessionToken: 'ss1.normal' });
  storeStudentSessionToken(normalToken, storage);
  assert.equal(readStudentSessionToken(storage), 'ss1.normal');

  const ssoToken = getStudentSessionTokenFromResponse({ studentSessionToken: 'ss1.sso' });
  storeStudentSessionToken(ssoToken, storage);
  assert.equal(storage.getItem(STUDENT_SESSION_STORAGE_KEY), 'ss1.sso');
});

test('logout and invalid sessions clear sessionStorage without exposing the token', () => {
  const storage = createStorage();
  storeStudentSessionToken('ss1.secret', storage);
  clearStudentSessionToken(storage);
  assert.equal(readStudentSessionToken(storage), '');
  assert.equal(isExplicitStudentSessionInvalid({ code: 'STUDENT_SESSION_REVOKED' }), true);
  assert.equal(isExplicitStudentSessionInvalid({ code: 'NETWORK_ERROR' }), false);
});

test('authenticated log payloads keep the existing identity contract', () => {
  assert.deepEqual(buildStudentSessionPayload('getLogs', 'ss1.token'), {
    action: 'getLogs', studentSessionToken: 'ss1.token'
  });
});

test('URL SSO takes priority over stored session and saveLog adds token only when present', () => {
  assert.equal(selectStudentAuthBootstrap({ uid: 's1', tk: '123456', storedToken: 'ss1.old' }), 'sso');
  assert.equal(selectStudentAuthBootstrap({ uid: '', tk: '', storedToken: 'ss1.saved' }), 'session');
  assert.equal(selectStudentAuthBootstrap({ uid: '', tk: '', storedToken: '' }), 'login');
  assert.deepEqual(addStudentSessionToken({ action: 'saveLog', studentId: 's1' }, 'ss1.token'), {
    action: 'saveLog', studentId: 's1', studentSessionToken: 'ss1.token'
  });
  assert.deepEqual(addStudentSessionToken({ action: 'saveLog' }, ''), { action: 'saveLog' });
});
