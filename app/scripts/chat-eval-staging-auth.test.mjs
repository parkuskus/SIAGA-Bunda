import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sql = await readFile('../supabase/staging/enable-chat-eval-claim.sql', 'utf8')

assert.match(sql, /method\s+text\s*:=\s*event\s*->>\s*'authentication_method'/i, 'hook reads the server-provided authentication method')
assert.match(sql, /if\s+method\s+in\s*\(\s*'password'\s*,\s*'token_refresh'\s*\)/i, 'test claim is limited to password login and its session refreshes')
assert.match(sql, /raw_app_meta_data\s*->>\s*'chat_eval_bypass'\s*=\s*'true'/i, 'claim requires server-managed app metadata')
assert.doesNotMatch(sql, /(?:create|drop)\s+policy/i, 'staging hook must not alter RLS policies')
console.log('Staging auth bypass is password-only, app-metadata-gated, and preserves RLS')
