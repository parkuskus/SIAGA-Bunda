import assert from 'node:assert/strict'
import { createChatTelemetry } from '../src/services/chatTelemetry.ts'

let clock = 100
const logs = []
const originalInfo = console.info
console.info = (...args) => logs.push(args)

try {
  const telemetry = createChatTelemetry(() => clock)
  clock = 145
  assert.equal(telemetry.firstOutput('stream'), true)
  clock = 170
  assert.equal(telemetry.firstOutput('stream'), false, 'first output is recorded once')
  telemetry.complete()
} finally {
  console.info = originalInfo
}

assert.deepEqual(logs, [
  ['[kira] first_output_ms', { duration_ms: 45, mode: 'stream' }],
  ['[kira] response_complete_ms', { duration_ms: 70 }],
])
assert.equal(JSON.stringify(logs).includes('content'), false, 'telemetry must not include message content')
console.log('Chat timing records first visible output once without message content')
