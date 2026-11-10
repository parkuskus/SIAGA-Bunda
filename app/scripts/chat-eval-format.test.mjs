import assert from 'node:assert/strict'
import { formatChatEvalDuration } from '../src/services/chatEvalMetrics.ts'

assert.equal(formatChatEvalDuration(999), '999 ms')
assert.equal(formatChatEvalDuration(1000), '1.000 s')
assert.equal(formatChatEvalDuration(8504), '8.504 s')
assert.equal(formatChatEvalDuration(null), null)
console.log('Chat evaluation durations use seconds at and above one second')
