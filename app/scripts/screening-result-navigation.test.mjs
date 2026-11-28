import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const server = await createServer({
  cacheDir: 'node_modules/.vite-test-screening-result-navigation',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
  appType: 'custom',
})

try {
  const { default: ResultScreen } = await server.ssrLoadModule('/src/features/skrining/components/SkriningResultScreen.tsx')
  const base = {
    tipeLabel: 'Status Gizi',
    kategori: 'Normal',
    faktorRisiko: [],
    rekomendasi: ['Pantau rutin'],
    urgensiLabel: 'Pantau mandiri',
    waktuISO: '2026-11-28T00:00:00.000Z',
    onOpenChat() {},
    onUlangi() {},
    onBeranda() {},
    onDaftarSkrining() {},
    onBagikan() {},
  }
  const safe = renderToStaticMarkup(createElement(ResultScreen, { ...base, warna: 'HIJAU' }))
  assert.match(safe, /Daftar skrining<\/button>/)
  assert.match(safe, /aria-label="Daftar skrining"/)

  const emergency = renderToStaticMarkup(createElement(ResultScreen, { ...base, warna: 'MERAH' }))
  assert.match(emergency, /aria-label="Daftar skrining"[^>]*disabled/)
} finally {
  await server.close()
}
