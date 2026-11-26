import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const server = await createServer({ cacheDir: 'node_modules/.vite-test-beranda-empty-profile', server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true }, appType: 'custom' })
try {
  const { default: BerandaPage } = await server.ssrLoadModule('/src/features/beranda/BerandaPage.tsx')
  const html = renderToStaticMarkup(
    createElement(BerandaPage, {
      uk: 28, progress: 70, countdown: 82, isPostpartum: false,
      setIsPostpartum: () => {}, setShowBirth: () => {},
      setTab: () => {}, setShowBottomNav: () => {}, onOpenFetalEducation: () => {},
    }),
  )
  assert.match(html, /Profil belum diisi/)
  assert.doesNotMatch(html, /Halo, Siti|G2P1A0|19 Nov 2026/)
} finally {
  await server.close()
}
