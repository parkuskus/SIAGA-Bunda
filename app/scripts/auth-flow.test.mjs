import assert from 'node:assert/strict'
import * as authFlow from '../src/features/onboarding/authFlow.ts'

let signInCalls = 0
const userId = await authFlow.loginWithPassword({
  signInWithPassword: async (credentials) => {
    signInCalls++
    assert.deepEqual(credentials, { email: 'bunda@example.id', password: 'sandirahasia' })
    return { data: { session: { user: { id: 'user-1' } } }, error: null }
  },
}, 'bunda@example.id', 'sandirahasia')
assert.equal(signInCalls, 1)
assert.equal(userId, 'user-1')

await assert.rejects(
  authFlow.loginWithPassword({ signInWithPassword: async () => ({ error: new Error('invalid') }) }, 'bunda@example.id', 'salah'),
  /Email atau sandi tidak cocok/,
)

let verified
await authFlow.verifyPasswordRecoveryOtp({
  verifyOtp: async (input) => {
    verified = input
    return { data: { session: { access_token: 'recovery-token' } }, error: null }
  },
}, 'bunda@example.id', '123456')
assert.deepEqual(verified, { email: 'bunda@example.id', token: '123456', type: 'recovery' })

await assert.rejects(
  authFlow.verifyPasswordRecoveryOtp({ verifyOtp: async () => ({ error: new Error('expired') }) }, 'bunda@example.id', '000000'),
  /Kode salah atau kedaluwarsa/,
)

console.log('Password login skips MFA and recovery OTP uses Supabase recovery verification')
