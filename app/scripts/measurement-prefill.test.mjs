import assert from 'node:assert/strict'
import { measurementPrefill } from '../src/features/skrining/measurementPrefill.ts'

const screening = (tipe, createdAt, detail) => ({
  id: `${tipe}-${createdAt}`,
  userId: 'user-1',
  tipe,
  skor: 0,
  kategori: 'HIJAU',
  detail,
  createdAt,
})

const reusable = measurementPrefill([
  screening('imt_lila', '2026-10-01T00:00:00.000Z', { bbPreKg: 58, tbCm: 158 }),
  screening('dmg', '2026-11-01T00:00:00.000Z', { bbPreKg: 61, tbCm: 159 }),
  screening('poedji_rochjati', '2026-11-10T00:00:00.000Z', { bbPreKg: 301, tbCm: 160 }),
], [
  { id: 'old-weight', userId: 'user-1', tanggal: '2026-11-01', beratKg: 66 },
  { id: 'latest-weight', userId: 'user-1', tanggal: '2026-11-12', beratKg: 67 },
])

assert.deepEqual(reusable, {
  bbPreKg: 61,
  bbPreKgTanggal: '2026-11-01',
  tbCm: 160,
  tbCmTanggal: '2026-11-10',
  bbSekarangKg: { value: 67, tanggal: '2026-11-12' },
})
assert.deepEqual(measurementPrefill([], []), {})
assert.deepEqual(measurementPrefill([], [
  { id: 'undated-weight', userId: 'user-1', tanggal: '', beratKg: 67 },
]), {})
assert.deepEqual(measurementPrefill([
  screening('dmg', '', { bbPreKg: 61, tbCm: 159 }),
], []), {})
assert.deepEqual(measurementPrefill([
  screening('dmg', undefined, { bbPreKg: 61, tbCm: 159 }),
], []), {})
