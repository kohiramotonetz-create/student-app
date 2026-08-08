import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyBatchGradingError,
  parseBatchGeminiResults
} from '../src/utils/batchGradingDiagnostics.js';

const assertServerCode = (code) => {
  assert.throws(
    () => parseBatchGeminiResults({ result: 'error', code, requestId: 'req-1' }, [0]),
    (error) => error.code === code && error.requestId === 'req-1'
  );
};

test('429 classification is preserved', () => {
  assertServerCode('GEMINI_RATE_LIMIT');
});

test('503 classification is preserved', () => {
  assertServerCode('GEMINI_UNAVAILABLE');
});

test('other Gemini HTTP errors are preserved', () => {
  assertServerCode('GEMINI_HTTP_ERROR');
});

test('Gemini JSON parse errors are preserved', () => {
  assertServerCode('GEMINI_JSON_PARSE_ERROR');
});

test('invalid result JSON shape is rejected', () => {
  assert.throws(
    () => parseBatchGeminiResults('not-json', [0], 'req-2'),
    (error) => error.code === 'GEMINI_INVALID_RESPONSE'
  );
});

test('missing and duplicate indexes are rejected', () => {
  assert.throws(
    () => parseBatchGeminiResults({ result: 'success', results: [{ index: 0, isCorrect: true }] }, [0, 1]),
    (error) => error.code === 'GEMINI_INVALID_RESPONSE'
  );
  assert.throws(
    () => parseBatchGeminiResults({ result: 'success', results: [{ index: 0, isCorrect: true }, { index: 0, isCorrect: false }] }, [0]),
    (error) => error.code === 'GEMINI_INVALID_RESPONSE'
  );
});

test('non-boolean values are rejected', () => {
  assert.throws(
    () => parseBatchGeminiResults({ result: 'success', results: [{ index: 0, isCorrect: 'true' }] }, [0]),
    (error) => error.code === 'GEMINI_INVALID_RESPONSE'
  );
});

test('valid results are returned as an index map', () => {
  const result = parseBatchGeminiResults({
    result: 'success',
    results: [{ index: 1, isCorrect: false }, { index: 3, isCorrect: true }]
  }, [1, 3]);
  assert.deepEqual([...result.entries()], [[1, false], [3, true]]);
});

test('client timeout and network failures are distinguished', () => {
  assert.equal(classifyBatchGradingError({ code: 'ECONNABORTED' }, 'req-3').code, 'CLIENT_TIMEOUT');
  assert.equal(classifyBatchGradingError({ request: {} }, 'req-4').code, 'NETWORK_ERROR');
});
