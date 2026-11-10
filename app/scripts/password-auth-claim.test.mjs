import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

const files = (await readdir('../supabase/migrations')).filter((file) => file.endsWith('.sql'))
const sql = (await Promise.all(files.map((file) => readFile(`../supabase/migrations/${file}`, 'utf8')))).join('\n')

assert.match(sql, /create table if not exists private\.password_authenticated_sessions/i)
assert.match(sql, /insert into private\.password_authenticated_sessions/i)
assert.match(sql, /method\s+in\s*\(\s*'email\/signup'\s*,\s*'password'\s*\)/i)
assert.match(sql, /method\s*=\s*'token_refresh'[\s\S]*password_authenticated_sessions/i)
assert.match(sql, /delete from private\.password_authenticated_sessions/i)

console.log('Password and confirmed-signup sessions retain RLS access; untrusted sessions are not granted')
