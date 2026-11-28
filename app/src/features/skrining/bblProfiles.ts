import type { BBLProfile } from "@/data/db"
import { db } from "@/data/db"

export function validateBabyProfile(input: { nama: string; dataLahir: string; beratLahirGr: number; panjangLahirCm: number }): string | null {
  if (!input.nama.trim()) return "Nama atau panggilan bayi wajib diisi"
  const [year, month, day] = input.dataLahir.split("-").map(Number)
  const birthDate = new Date(Date.UTC(year, month - 1, day))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dataLahir) || !Number.isFinite(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== input.dataLahir) {
    return "Tanggal lahir wajib diisi dengan benar"
  }
  if (!Number.isInteger(input.beratLahirGr) || input.beratLahirGr <= 0) return "Berat lahir wajib berupa angka positif"
  if (!Number.isFinite(input.panjangLahirCm) || input.panjangLahirCm <= 0) return "Panjang lahir wajib berupa angka positif"
  return null
}

export function mergeBblProfiles(userId: string, local: BBLProfile[], remote: BBLProfile[]): BBLProfile[] {
  const byId = new Map<string, BBLProfile>()
  for (const profile of [...remote, ...local]) {
    if (profile.userId !== userId) continue
    const merged = { ...byId.get(profile.id) }
    for (const [key, value] of Object.entries(profile)) {
      if (value !== undefined && value !== null && value !== "") merged[key as keyof BBLProfile] = value as never
    }
    byId.set(profile.id, merged as BBLProfile)
  }
  return [...byId.values()].sort((a, b) => {
    if (a.id === userId) return -1
    if (b.id === userId) return 1
    return (a.createdAt ?? a.dataLahir).localeCompare(b.createdAt ?? b.dataLahir) || a.id.localeCompare(b.id)
  })
}

export async function mergeAndPersistBblProfiles(userId: string, local: BBLProfile[], remote: BBLProfile[]): Promise<BBLProfile[]> {
  const babies = mergeBblProfiles(userId, local, remote)
  if (remote.length) await db.bblProfiles.bulkPut(babies).catch(() => {})
  return babies
}
