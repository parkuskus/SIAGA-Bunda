import type { Profile } from "../../data/db.ts"

export function createMissingProfileDraft(user: { id: string; email?: string }): Profile {
  const now = new Date().toISOString()
  return {
    id: user.id, email: user.email ?? "", nama: "", tanggal_lahir: "", noHp: "",
    hpht: "", gravida: 1, para: 0, abortus: 0, fasyankes: "", nama_bidan: "",
    createdAt: now, updatedAt: now,
  }
}
