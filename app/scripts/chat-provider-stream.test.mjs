import assert from 'node:assert/strict'
import { providerStreamEvent, providerStreamComplete } from '../../supabase/functions/_shared/chatProviderStream.ts'

assert.deepEqual(providerStreamEvent('data: {"choices":[{"delta":{"content":"abc"},"finish_reason":null}]}'), { text: 'abc', finish: null, done: false })
assert.deepEqual(providerStreamEvent('data: {"choices":[{"delta":{},"finish_reason":"length"}]}'), { text: '', finish: 'length', done: false })
assert.equal(providerStreamEvent('data: [DONE]').done, true)
assert.equal(providerStreamComplete('stop', true), true)
for (const [reason, done] of [['length', true], [null, true], ['stop', false], ['error', true]]) assert.equal(providerStreamComplete(reason, done), false)
assert.throws(() => providerStreamEvent('data: {"error":{"message":"private"}}'), /provider stream failed/)
assert.throws(() => providerStreamEvent('data: invalid'), /provider stream failed/)
