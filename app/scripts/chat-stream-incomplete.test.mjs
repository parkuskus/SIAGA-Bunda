import assert from 'node:assert/strict'
import { consumeChatStream } from '../src/services/chatStream.ts'

function response(events) {
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(''), { headers: { 'content-type': 'text/event-stream' } })
}

const deltas = []
await assert.rejects(consumeChatStream(response([{ type: 'delta', text: 'partial' }, { type: 'error', message: 'Jawaban belum lengkap' }]), (text) => deltas.push(text)), /belum lengkap/)
assert.deepEqual(deltas, ['partial'])
await assert.rejects(consumeChatStream(response([{ type: 'delta', text: 'partial' }]), () => {}), /sebelum jawaban selesai/)
assert.equal((await consumeChatStream(response([{ type: 'done', answer: 'ok' }]), () => {})).answer, 'ok')
assert.deepEqual((await consumeChatStream(response([{ type: 'done', answer: 'ok', diagnostics: { requestId: 'r1', timings: { embedding: 10 } } }]), () => {})).diagnostics, { requestId: 'r1', timings: { embedding: 10 } })
