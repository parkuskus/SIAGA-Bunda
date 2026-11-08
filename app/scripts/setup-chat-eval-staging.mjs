import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const STAGING_REF = 'gjizoreqciqelmkakluz'
const TEST_EMAIL = 'chat-eval@siagabunda.test'

function loadEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, '')]] : []
  }))
}

export function assertStagingUrl(url) {
  if (new URL(url).hostname.split('.')[0] !== STAGING_REF) throw new Error('Refusing non-staging Supabase URL')
}

async function main() {
  const env = loadEnv(await readFile(new URL('../../supabase/.env.staging', import.meta.url), 'utf8'))
  assertStagingUrl(env.SUPABASE_URL ?? '')
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.CHAT_EVAL_PASSWORD) throw new Error('Staging admin key or test password is missing')

  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(`Unable to inspect staging test account (${error.status ?? error.name})`)
  const existing = data.users.find((user) => user.email?.toLowerCase() === TEST_EMAIL)
  const attributes = {
    email: TEST_EMAIL,
    password: env.CHAT_EVAL_PASSWORD,
    email_confirm: true,
    app_metadata: { ...(existing?.app_metadata ?? {}), chat_eval_bypass: true },
    user_metadata: {},
  }
  const result = existing
    ? await admin.auth.admin.updateUserById(existing.id, attributes)
    : await admin.auth.admin.createUser(attributes)
  if (result.error) throw new Error(`Unable to provision staging test account (${result.error.status ?? result.error.name})`)
  const { error: profileError } = await admin.from('profiles').upsert({
    id: result.data.user.id,
    nama: 'Akun Evaluasi',
    email: TEST_EMAIL,
  })
  if (profileError) throw new Error(`Unable to provision staging test profile (${profileError.code ?? profileError.name})`)
  console.log('Staging chat-evaluation account is ready')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Staging account setup failed')
    process.exitCode = 1
  })
}
