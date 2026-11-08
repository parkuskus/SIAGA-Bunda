import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { assertStagingUrl } from './setup-chat-eval-staging.mjs'

assert.doesNotThrow(() => assertStagingUrl('https://gjizoreqciqelmkakluz.supabase.co'))
assert.throws(() => assertStagingUrl('https://sepindjvfvzxchesrtct.supabase.co'), /Refusing non-staging Supabase URL/)
assert.throws(() => assertStagingUrl('not a url'), /Invalid URL/)
const setup = await readFile('./scripts/setup-chat-eval-staging.mjs', 'utf8')
assert.match(setup, /app_metadata\s*:[\s\S]*?chat_eval_bypass\s*:\s*true/, 'only server-managed app metadata enables the staging claim')
assert.doesNotMatch(setup, /user_metadata\s*:[\s\S]*?chat_eval_bypass/, 'client-editable user metadata cannot enable the staging claim')
assert.match(setup, /from\(['"]profiles['"]\)\.upsert/, 'the synthetic account has the profile row required for chat history')
console.log('Staging setup refuses production and malformed Supabase URLs')
