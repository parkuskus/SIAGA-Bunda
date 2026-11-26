import assert from 'node:assert/strict'
import 'fake-indexeddb/auto'
import { createServer } from 'vite'

Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } })
const server = await createServer({ server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true }, appType: 'custom' })
try {
  const { submitRegister } = await server.ssrLoadModule('/src/features/onboarding/registerForm.ts')
  await assert.rejects(
    submitRegister({
      nama: 'Bunda Uji', email: 'bunda@example.id', tanggalLahir: '1998-01-01',
      noHp: '081234567890', gravida: 1, para: 0, abortus: 0,
      hpht: '2026-09-01', fasyankes: 'Klinik', namaBidan: 'Bidan Uji',
    }, 'a393237a-d293-44af-ab39-3068bf35728a'),
    /profil.*belum.*tersimpan/i,
  )
} finally {
  await server.close()
}
