export type StoredScreeningDraft = {
  userId: string
  tipe: string
  createdAt: string
  detail: Record<string, unknown>
}

export function latestScreeningDraft(rows: StoredScreeningDraft[], userId: string, tipe: string, babyId?: string) {
  let latest: StoredScreeningDraft | null = null
  for (const row of rows) {
    const savedBabyId = typeof row.detail.babyId === "string" ? row.detail.babyId : userId
    if (row.userId === userId && row.tipe === tipe && (!babyId || savedBabyId === babyId) && (!latest || row.createdAt > latest.createdAt)) latest = row
  }
  return latest?.detail ?? null
}
