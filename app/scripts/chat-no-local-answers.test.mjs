import assert from 'node:assert/strict'
import * as chatPolicy from '../../supabase/functions/_shared/chatPolicy.ts'
import * as personality from '../src/features/chatbot/personality.ts'

assert.equal('quickChatReply' in chatPolicy, false, 'online answers should not be short-circuited by canned replies')
assert.equal('FAQ' in personality, false, 'the client should not contain offline health FAQs')
assert.match(personality.JAWABAN_OFFLINE, /koneksi/i)
assert.doesNotMatch(personality.JAWABAN_OFFLINE, /mual|pusing|perdarahan|bayi kuning/i)
assert.equal(chatPolicy.shouldEscalate('Saya mengalami perdarahan saat hamil'), true)
