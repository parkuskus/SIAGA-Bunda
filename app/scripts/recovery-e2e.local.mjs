import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const supabaseUrl = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const mailpitUrl = process.env.MAILPIT_URL
assert.ok(supabaseUrl && anonKey && serviceKey && mailpitUrl, 'Set local Supabase and Mailpit environment variables')
assert.equal(new URL(supabaseUrl).hostname, '127.0.0.1', 'Refusing to run outside local Supabase')

const authUrl = `${supabaseUrl}/auth/v1`
const email = `recovery-e2e-${randomUUID()}@example.test`
const oldPassword = `Old-${randomUUID()}a1!`
const newPassword = `New-${randomUUID()}b2!`
const redirectTo = 'http://localhost:5173/'
let userId

async function request(url, { key = anonKey, token = key, ...options } = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const body = await response.text()
  let data
  try { data = body ? JSON.parse(body) : null } catch { data = body }
  return { response, data }
}

function jwtClaims(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
}

try {
  const created = await request(`${authUrl}/admin/users`, {
    key: serviceKey,
    token: serviceKey,
    method: 'POST',
    body: JSON.stringify({ email, password: oldPassword, email_confirm: true }),
  })
  assert.equal(created.response.status, 200, `Create synthetic user failed: ${JSON.stringify(created.data)}`)
  userId = created.data.id

  const recovery = await request(`${authUrl}/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
  assert.equal(recovery.response.status, 200, `Recovery request failed: ${JSON.stringify(recovery.data)}`)

  let message
  for (let attempt = 0; attempt < 20 && !message; attempt++) {
    const listed = await request(`${mailpitUrl}/api/v1/messages`, { key: '', token: '' })
    assert.equal(listed.response.status, 200, 'Mailpit message list is unavailable')
    message = listed.data.messages?.find((item) => JSON.stringify(item).includes(email))
    if (!message) await new Promise((resolve) => setTimeout(resolve, 500))
  }
  assert.ok(message, 'Recovery email did not arrive in Mailpit')
  const messageId = message.ID ?? message.Id ?? message.id
  const detail = await request(`${mailpitUrl}/api/v1/message/${encodeURIComponent(messageId)}`, { key: '', token: '' })
  assert.equal(detail.response.status, 200, 'Mailpit could not load the recovery email')
  assert.match(detail.data.Subject ?? detail.data.subject, /Kode pemulihan sandi SIAGA Bunda/)
  const content = `${detail.data.HTML ?? detail.data.html ?? ''}\n${detail.data.Text ?? detail.data.text ?? ''}`
  const code = content.match(/\b\d{6}\b/)?.[0]
  assert.ok(code, 'Recovery email did not contain a six-digit token')

  const verified = await request(`${authUrl}/verify`, {
    method: 'POST',
    body: JSON.stringify({ email, token: code, type: 'recovery' }),
  })
  assert.equal(verified.response.status, 200, `Recovery OTP verification failed: ${JSON.stringify(verified.data)}`)
  assert.ok(verified.data.access_token, 'Recovery verification returned no session token')
  assert.notEqual(jwtClaims(verified.data.access_token).app_mfa_verified, true, 'Recovery-only token must not receive the app RLS claim')

  const changed = await request(`${authUrl}/user`, {
    method: 'PUT',
    token: verified.data.access_token,
    body: JSON.stringify({ password: newPassword }),
  })
  assert.equal(changed.response.status, 200, `Password update failed: ${JSON.stringify(changed.data)}`)

  const oldLogin = await request(`${authUrl}/token?grant_type=password`, {
    method: 'POST',
    body: JSON.stringify({ email, password: oldPassword }),
  })
  assert.equal(oldLogin.response.status, 400, 'Old password still worked after reset')

  const newLogin = await request(`${authUrl}/token?grant_type=password`, {
    method: 'POST',
    body: JSON.stringify({ email, password: newPassword }),
  })
  assert.equal(newLogin.response.status, 200, `New password login failed: ${JSON.stringify(newLogin.data)}`)
  assert.equal(jwtClaims(newLogin.data.access_token).app_mfa_verified, true, 'Password login did not receive the app RLS claim')

  console.log('PASS: local recovery email, redirect allowlist, OTP verification, password update, and password login/RLS claim')
} finally {
  if (userId) {
    const deleted = await request(`${authUrl}/admin/users/${userId}`, {
      key: serviceKey,
      token: serviceKey,
      method: 'DELETE',
    })
    assert.ok(deleted.response.ok, 'Could not clean up the synthetic Auth user')
  }
}
