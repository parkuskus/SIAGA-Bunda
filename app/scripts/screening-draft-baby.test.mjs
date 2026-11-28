import assert from 'node:assert/strict'
import { latestScreeningDraft } from '../src/features/skrining/screeningDraftUtils.ts'

const rows = [
  { userId: 'user-1', tipe: 'ikterus', createdAt: '2026-11-01', detail: { usiaBayiHari: 2 } },
  { userId: 'user-1', tipe: 'ikterus', createdAt: '2026-11-02', detail: { babyId: 'baby-2', usiaBayiHari: 3 } },
]

assert.deepEqual(latestScreeningDraft(rows, 'user-1', 'ikterus', 'user-1'), { usiaBayiHari: 2 })
assert.deepEqual(latestScreeningDraft(rows, 'user-1', 'ikterus', 'baby-2'), { babyId: 'baby-2', usiaBayiHari: 3 })
