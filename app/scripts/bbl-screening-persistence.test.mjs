import assert from 'node:assert/strict'
import 'fake-indexeddb/auto'
import { createServer } from 'vite'

Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } })
const userId = 'a393237a-d293-44af-ab39-3068bf35728a'
const server = await createServer({
  cacheDir: 'node_modules/.vite-test-bbl-screening-persistence',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
  appType: 'custom',
  plugins: [{
    name: 'mock-auth-for-bbl-persistence-test',
    enforce: 'pre',
    resolveId(id) {
      return /^\.\/supabase(?:\.ts)?$/.test(id) ? '\0supabase-bbl-persistence-test' : null
    },
    load(id) {
      if (id !== '\0supabase-bbl-persistence-test') return null
      return 'export const supabase = { auth: { getSession: async () => ({ data: { session: null } }) } }'
    },
  }],
})

try {
  const { submitIkterus } = await server.ssrLoadModule('/src/features/skrining/bbl/ikterusForm.ts')
  const { submitHipotiroid } = await server.ssrLoadModule('/src/features/skrining/bbl/hipotiroidForm.ts')
  const { syncBbl } = await server.ssrLoadModule('/src/data/sync.ts')
  const { db } = await server.ssrLoadModule('/src/data/db.ts')
  await assert.rejects(
    submitIkterus({
      userId, usiaBayiHari: 2, zona: 1, onsetJam: 24,
      fesesDempul: false, aktivitas: 'aktif', prematur: false, gejalaDitinjau: true,
    }),
    /ID bayi wajib/,
  )
  await db.bblProfiles.bulkPut([
    { id: 'baby-1', userId, nama: 'A', dataLahir: '2026-11-01' },
    { id: 'baby-2', userId, nama: 'B', dataLahir: '2026-11-01' },
    { id: 'baby-foreign', userId: 'other-user', nama: 'C', dataLahir: '2026-11-01' },
  ])
  await assert.rejects(
    submitIkterus({
      userId, babyId: 'baby-foreign', usiaBayiHari: 2, zona: 1, onsetJam: 24,
      fesesDempul: false, aktivitas: 'aktif', prematur: false, gejalaDitinjau: true,
    }),
    /Data bayi tidak ditemukan untuk akun ini/,
  )
  for (const [babyId, usiaBayiHari] of [['baby-1', 2], ['baby-2', 3]]) {
    await submitIkterus({
      userId, babyId, usiaBayiHari, zona: 1, onsetJam: 24,
      fesesDempul: false, aktivitas: 'aktif', prematur: false, gejalaDitinjau: true,
    })
  }
  const results = await db.screeningResults.where('userId').equals(userId).toArray()
  assert.deepEqual(results.map((row) => row.detail.babyId).sort(), ['baby-1', 'baby-2'])
  await submitHipotiroid({
    userId, babyId: 'baby-2', sudahTSH: true, usiaBayiHari: 2,
    gejala: { ikterusLama: false, konstipasi: false, tangisanSerak: false, aktivitasKurang: false, lidahBesar: false },
    gejalaDitinjau: true,
  })
  assert.equal((await db.screeningResults.where('userId').equals(userId).toArray()).find((row) => row.tipe === 'hipotiroid').detail.babyId, 'baby-2')

  const babies = [
    { id: 'baby-1', userId, nama: 'A', dataLahir: '2026-11-01', beratLahirGr: 3000, panjangLahirCm: 48, createdAt: '2026-11-01T10:00:00.000Z' },
    { id: 'baby-2', userId, nama: 'B', dataLahir: '2026-11-01', beratLahirGr: 2500, panjangLahirCm: 47, createdAt: '2026-11-01T10:01:00.000Z' },
  ]
  await db.bblProfiles.bulkPut(babies)
  assert.equal((await db.bblProfiles.where('userId').equals(userId).toArray()).length, 2)
  for (const baby of babies) assert.equal(await syncBbl(baby), 'queued')

  const queued = (await db.syncQueue.where('table').equals('bbl_profiles').toArray()).map((item) => item.payload)
  assert.deepEqual(queued.map(({ id, nama, berat_lahir_gram, panjang_lahir_cm }) => ({ id, nama, berat_lahir_gram, panjang_lahir_cm })), [
    { id: 'baby-1', nama: 'A', berat_lahir_gram: 3000, panjang_lahir_cm: 48 },
    { id: 'baby-2', nama: 'B', berat_lahir_gram: 2500, panjang_lahir_cm: 47 },
  ])
} finally {
  await server.close()
}
