import assert from 'node:assert/strict'
import 'fake-indexeddb/auto'
import { createServer } from 'vite'

const server = await createServer({
  cacheDir: 'node_modules/.vite-test-bbl-profiles',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
  appType: 'custom',
})

try {
  const { mergeBblProfiles, validateBabyProfile } = await server.ssrLoadModule('/src/features/skrining/bblProfiles.ts')
  const local = [
    { id: 'baby-1', userId: 'user-1', dataLahir: '2026-11-01', nama: 'Bayi A', beratLahirGr: 3000 },
    { id: 'baby-2', userId: 'user-1', dataLahir: '2026-11-01', nama: 'Bayi B', beratLahirGr: 2500 },
  ]
  const remote = [
    { id: 'baby-1', userId: 'user-1', dataLahir: '2026-11-01', nama: 'Lama', beratLahirGr: 2800 },
    { id: 'baby-3', userId: 'user-1', dataLahir: '2026-11-02', nama: 'Bayi C', beratLahirGr: 3200 },
  ]

  assert.deepEqual(
    mergeBblProfiles('user-1', local, remote).map(({ id, nama, beratLahirGr }) => ({ id, nama, beratLahirGr })),
    [
      { id: 'baby-1', nama: 'Bayi A', beratLahirGr: 3000 },
      { id: 'baby-2', nama: 'Bayi B', beratLahirGr: 2500 },
      { id: 'baby-3', nama: 'Bayi C', beratLahirGr: 3200 },
    ],
  )
  assert.equal(mergeBblProfiles('user-1', local, remote.filter((baby) => baby.userId === 'other')).length, 2)
  assert.equal(validateBabyProfile({ nama: 'Bayi B', dataLahir: '2026-11-01', beratLahirGr: 2500, panjangLahirCm: 48 }), null)
  assert.equal(validateBabyProfile({ nama: 'Bayi B', dataLahir: '2026-11-01', beratLahirGr: 900, panjangLahirCm: 28 }), null)
  assert.equal(validateBabyProfile({ nama: 'Bayi B', dataLahir: '2026-02-31', beratLahirGr: 2500, panjangLahirCm: 48 }), 'Tanggal lahir wajib diisi dengan benar')
  assert.equal(validateBabyProfile({ nama: 'Bayi B', dataLahir: '2026-11-01', beratLahirGr: 0, panjangLahirCm: 48 }), 'Berat lahir wajib berupa angka positif')
  assert.equal(validateBabyProfile({ nama: 'Bayi B', dataLahir: '2026-11-01', beratLahirGr: 2500, panjangLahirCm: 0 }), 'Panjang lahir wajib berupa angka positif')
} finally {
  await server.close()
}
