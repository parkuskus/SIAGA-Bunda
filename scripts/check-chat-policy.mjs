import assert from 'node:assert/strict'
import { retrievalTerms, shouldEscalate } from '../supabase/functions/_shared/chatPolicy.ts'

assert.equal(shouldEscalate('Saya mengalami perdarahan saat hamil'), true)
assert.equal(shouldEscalate('Apakah perdarahan termasuk tanda bahaya?'), false)
assert.equal(shouldEscalate('Apa arti kategori hijau pada skrining?'), false)
assert.deepEqual(retrievalTerms('Ibu hamil mengalami perdarahan merah segar dan pusing'), ['perdarahan', 'merah', 'segar', 'pusing'])
console.log('Shared escalation and retrieval terms passed.')
