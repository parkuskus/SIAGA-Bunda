import assert from 'node:assert/strict'
import { chatAuthorizationHeaders } from '../../supabase/functions/_shared/chatContext.ts'

assert.deepEqual(chatAuthorizationHeaders('test-user-access-token'), {
  Authorization: 'Bearer test-user-access-token',
})
console.log('Chat database requests carry the authenticated caller token for RLS-protected RAG')
