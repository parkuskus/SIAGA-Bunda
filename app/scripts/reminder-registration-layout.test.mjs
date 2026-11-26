import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const server = await createServer({ cacheDir: 'node_modules/.vite-test-reminder-layout', server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true }, appType: 'custom' })
try {
  const { default: SupplementSection } = await server.ssrLoadModule('/src/features/tracker/SupplementSection.tsx')
  const reminder = renderToStaticMarkup(createElement(SupplementSection, { onAdd: () => {} }))
  assert.match(reminder, /data-slot="card"[^>]*class="[^"]*\bw-full\b/)

  const { default: RegisterScreen } = await server.ssrLoadModule('/src/features/onboarding/RegisterScreen.tsx')
  const registration = renderToStaticMarkup(createElement(RegisterScreen, { onBack: () => {}, onSuccess: () => {}, onToLogin: () => {} }))
  const inputClass = (id) => {
    const tag = registration.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))
    assert.ok(tag, `missing ${id} field`)
    return tag[0].match(/class="([^"]+)"/)?.[1] ?? ''
  }
  for (const id of ['register-password', 'register-password-confirm']) {
    assert.match(inputClass(id), /\bh-11\b/)
    assert.doesNotMatch(inputClass(id), /\bh-12\b/)
  }
  for (const id of ['register-name', 'register-email', 'register-phone']) {
    assert.match(inputClass(id), /\bh-11\b/)
  }
  assert.match(registration, /class="relative flex min-h-8[^"]*\bh-11\b[^"]*rounded-2xl bg-white"/)
} finally {
  await server.close()
}
