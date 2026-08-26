import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLocalPrepositionLog,
  isLocalPrepositionVerificationEnabled
} from '../src/utils/localPrepositionVerification.js';

test('local verification requires both DEV and the explicit flag', () => {
  assert.equal(isLocalPrepositionVerificationEnabled({ DEV: true, VITE_ENABLE_LOCAL_PREPOSITION_TEST: 'true' }), true);
  assert.equal(isLocalPrepositionVerificationEnabled({ DEV: false, VITE_ENABLE_LOCAL_PREPOSITION_TEST: 'true' }), false);
  assert.equal(isLocalPrepositionVerificationEnabled({ DEV: true, VITE_ENABLE_LOCAL_PREPOSITION_TEST: 'false' }), false);
  assert.equal(isLocalPrepositionVerificationEnabled({ DEV: true }), false);
});

test('local log keeps the existing getLogs-compatible fields', () => {
  const log = createLocalPrepositionLog({
    contentId: 'preposition_test',
    history: '[1]preposition_test::prep_by__ja_en(×)',
    mode: 'ja-en',
    testRange: '日本語 → 英語 / 通常テスト'
  });
  assert.equal(log.contentId, 'preposition_test');
  assert.equal(log.mode, 'ja-en');
  assert.match(log.history, /prep_by__ja_en\(×\)/);
  assert.equal(Number.isNaN(Date.parse(log.date)), false);
});
