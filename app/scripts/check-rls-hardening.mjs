import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const config = await readFile('../supabase/config.toml', 'utf8')
const migration = await readFile('../supabase/migrations/017_fail_closed_default_privileges.sql', 'utf8').catch(() => '')
const functionMigration = await readFile('../supabase/migrations/018_revoke_global_function_execute.sql', 'utf8').catch(() => '')
const rlsHarness = await readFile('scripts/check-rls-ab.mjs', 'utf8')
const mfaMigration = await readFile('../supabase/migrations/015_email_mfa.sql', 'utf8')
const passwordMigration = await readFile('../supabase/migrations/019_password_login_claim.sql', 'utf8')

assert.match(config, /^auto_expose_new_tables\s*=\s*false\s*$/m, 'local Supabase API must fail closed for new tables')
assert.match(migration, /alter default privileges for role postgres in schema public\s+revoke all on tables from public, anon, authenticated, service_role/i)
assert.match(migration, /alter default privileges for role postgres in schema public\s+revoke all on sequences from public, anon, authenticated, service_role/i)
assert.match(migration, /alter default privileges for role postgres in schema public\s+revoke execute on functions from public, anon, authenticated, service_role/i)
assert.match(functionMigration, /alter default privileges for role postgres\s+revoke execute on functions from public/i, 'global PUBLIC function execution default must be revoked')

for (const policy of [
  ['profiles', 'own_profiles', 'id'],
  ['screening_results', 'own_screening', 'user_id'],
  ['weight_entries', 'own_weight', 'user_id'],
  ['supplement_reminders', 'own_supplement', 'user_id'],
  ['anc_visits', 'own_anc', 'user_id'],
  ['diary_entries', 'own_diary', 'user_id'],
  ['nifas_screenings', 'own_nifas', 'user_id'],
  ['bbl_profiles', 'own_bbl', 'user_id'],
  ['chat_messages', 'own_chat', 'user_id'],
  ['push_subscriptions', 'own_push_subscriptions', 'user_id'],
  ['dose_logs', 'own_dose_logs', 'user_id'],
  ['birth_plans', 'own_birth_plans', 'user_id'],
]) {
  assert.ok(mfaMigration.includes(`('${policy[0]}', '${policy[1]}', '${policy[2]}')`), `${policy[0]} remains in MFA owner-policy migration`)
  assert.ok(policy[0] === 'profiles' ? rlsHarness.includes("from('profiles')") : rlsHarness.includes(`table: '${policy[0]}'`), `${policy[0]} is covered by A/B row-operation tests`)
}

assert.ok(passwordMigration.includes('private.password_authenticated_sessions'), 'password sessions are server-recorded')
assert.ok(rlsHarness.includes('app_mfa_verified'), 'A/B test checks the password login token claim')

console.log('Fail-closed defaults and password-authenticated RLS coverage verified')
