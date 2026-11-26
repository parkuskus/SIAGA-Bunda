import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const config = await readFile('../supabase/config.toml', 'utf8')
assert.match(config, /additional_redirect_urls\s*=\s*\[[^\]]*"http:\/\/localhost:5173"[^\]]*"http:\/\/127\.0\.0\.1:5173"/)
assert.match(config, /\[auth\.email\.template\.recovery\][\s\S]*?content_path\s*=\s*"\.\/supabase\/templates\/recovery\.html"/)
assert.match(config, /additional_redirect_urls\s*=\s*\[[^\]]*"https:\/\/siagabunda\.riset-19e\.workers\.dev"/)
const template = await readFile('../supabase/templates/recovery.html', 'utf8')
assert.match(template, /<a\b[^>]*href="\{\{\s*\.ConfirmationURL\s*\}\}"[^>]*>[\s\S]*?<\/a>/)
assert.match(template, /\{\{\s*\.Token\s*\}\}/)

console.log('Password recovery email includes a clickable recovery link and OTP fallback')
