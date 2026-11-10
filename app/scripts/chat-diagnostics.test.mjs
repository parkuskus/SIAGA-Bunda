import assert from 'node:assert/strict'
import { chatDiagnostics } from '../../supabase/functions/_shared/chatDiagnostics.ts'

const timings = { auth: 12, rate: 4, embedding: 820, retrieval: 340, providerHeader: 500, firstToken: 1100, firstVisible: 1400, completion: 2200, persistence: 30, total: 2500 }
assert.deepEqual(chatDiagnostics(false, 'request-1', timings), {})
assert.deepEqual(chatDiagnostics(true, 'request-1', timings), { diagnostics: { requestId: 'request-1', timings } })
assert.deepEqual(chatDiagnostics(true, 'request-1', timings, 402), { diagnostics: { requestId: 'request-1', timings, upstreamStatus: 402 } })
assert.deepEqual(chatDiagnostics(true, 'request-1', timings, undefined, 'network'), { diagnostics: { requestId: 'request-1', timings, providerFailure: 'network' } })
assert.equal(JSON.stringify(chatDiagnostics(true, 'request-1', timings)).includes('message'), false)
console.log('Chat diagnostics are opt-in and contain only request ID and phase durations')
