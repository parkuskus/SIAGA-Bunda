import assert from 'node:assert/strict'
import { summarizeChatEval } from '../src/services/chatEvalMetrics.ts'

assert.deepEqual(summarizeChatEval([
  { status: 'ok', firstOutputMs: 100 },
  { status: 'ok', firstOutputMs: 300 },
  { status: 'ok', firstOutputMs: 200 },
]), { count: 3, failures: 0, medianMs: 200, p95Ms: 300 })

assert.equal(summarizeChatEval([
  { status: 'ok', firstOutputMs: 10 },
  { status: 'ok', firstOutputMs: 20 },
]).medianMs, 15, 'even-sized samples average the middle pair')

const p95 = summarizeChatEval(Array.from({ length: 20 }, (_, index) => ({ status: 'ok', firstOutputMs: index + 1 })))
assert.equal(p95.p95Ms, 19, 'p95 uses nearest-rank')

assert.deepEqual(summarizeChatEval([
  { status: 'ok', firstOutputMs: 50 },
  { status: 'failed', firstOutputMs: null },
]), { count: 2, failures: 1, medianMs: 50, p95Ms: 50 })
assert.deepEqual(summarizeChatEval([]), { count: 0, failures: 0, medianMs: null, p95Ms: null })
console.log('Chat evaluation metrics cover median, p95, failures, and empty input')
