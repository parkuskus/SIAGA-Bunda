import assert from 'node:assert/strict'
import 'fake-indexeddb/auto'
import { createServer } from 'vite'

const userId = 'a393237a-d293-44af-ab39-3068bf35728a'
const server = await createServer({
  cacheDir: 'node_modules/.vite-test-bbl-profile-merge',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
  appType: 'custom',
  plugins: [{
    name: 'mock-auth-for-bbl-profile-merge-test',
    enforce: 'pre',
    resolveId(id) {
      return /^\.\/supabase(?:\.ts)?$/.test(id) ? '\0supabase-bbl-profile-merge-test' : null
    },
    load(id) {
      if (id !== '\0supabase-bbl-profile-merge-test') return null
      return 'export const supabase = { auth: { getSession: async () => ({ data: { session: null } }) } }'
    },
  }],
})

try {
  const { mergeAndPersistBblProfiles } = await server.ssrLoadModule('/src/features/skrining/bblProfiles.ts')
  const { db } = await server.ssrLoadModule('/src/data/db.ts')
  const localBaby = {
    id: 'baby-1', userId, nama: 'Bayi A', dataLahir: '2026-11-01',
    beratLahirGr: 900, panjangLahirCm: 28, createdAt: '2026-11-02T12:00:00.000Z',
  }
  const staleCloudBaby = {
    id: 'baby-1', userId, nama: null, dataLahir: '2026-11-01', apgar: 8,
    beratLahirGr: null, panjangLahirCm: null, createdAt: '2026-11-01T12:00:00.000Z',
  }
  await db.bblProfiles.put(localBaby)

  const merged = await mergeAndPersistBblProfiles(userId, [localBaby], [staleCloudBaby])
  const saved = await db.bblProfiles.get('baby-1')

  assert.deepEqual(
    [merged[0].nama, merged[0].beratLahirGr, merged[0].panjangLahirCm, merged[0].apgar],
    ['Bayi A', 900, 28, 8],
  )
  assert.deepEqual(
    [saved.nama, saved.beratLahirGr, saved.panjangLahirCm, saved.apgar],
    ['Bayi A', 900, 28, 8],
  )
} finally {
  await server.close()
}
