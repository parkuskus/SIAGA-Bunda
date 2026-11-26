import { db, type Profile } from '@/data/db'
import { syncProfile } from '@/data/sync'
import { calcHPL, weeksFromHpht, trimester, progressPercent } from '@/clinical-rules/ukHpl'

// S-01: RegisterScreen — form-only logic (FE belum fix, UI menyusul)

export type RegisterInput = {
  nama: string
  email: string
  tanggalLahir: string // YYYY-MM-DD
  noHp: string
  gravida: number
  para: number
  abortus: number
  hpht: string // YYYY-MM-DD
  fasyankes: string
  namaBidan: string
}

export function formatGPA(g: number, p: number, a: number): string {
  return `G${g}P${p}A${a}`
}

export function validateRegisterInput(v: RegisterInput): Record<string, string> {
  const e: Record<string, string> = {}
  if (!v.nama.trim()) e.nama = 'Nama wajib'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'Alamat email tidak valid'
  if (!v.tanggalLahir) e.tanggalLahir = 'Tanggal lahir wajib'
  if (!/^08\d{8,11}$/.test(v.noHp.replace(/[^0-9]/g, ''))) e.noHp = 'Nomor telepon tidak valid'
  if (v.gravida < 1) e.gravida = 'Gravida ≥1'
  if (v.para < 0 || v.para > v.gravida) e.para = 'Para 0..gravida'
  if (v.abortus < 0 || v.abortus > v.gravida) e.abortus = 'Abortus 0..gravida'
  if (!v.hpht) e.hpht = 'HPHT wajib'
  if (v.hpht && new Date(v.hpht) > new Date()) e.hpht = 'HPHT tidak boleh di masa depan'
  if (!v.fasyankes.trim()) e.fasyankes = 'Fasyankes wajib'
  if (!v.namaBidan.trim()) e.namaBidan = 'Nama bidan wajib'
  return e
}

export async function submitRegister(input: RegisterInput, userId?: string): Promise<{ profile: Profile; uk: number; hpl: string; tri: 1|2|3; progress: number }> {
  const errs = validateRegisterInput(input)
  if (Object.keys(errs).length) throw Object.assign(new Error('validasi gagal'), { errs })

  const uk = weeksFromHpht(input.hpht)
  const hpl = calcHPL(input.hpht)
  const tri = trimester(uk)
  const progress = progressPercent(uk)
  const id = userId ?? globalThis.crypto?.randomUUID?.() ?? ("demo-" + Date.now() + "-" + Math.random().toString(36).slice(2,8))

  const profile: Profile = {
    id,
    nama: input.nama.trim(),
    email: input.email.trim().toLowerCase(),
    tanggal_lahir: input.tanggalLahir,
    noHp: input.noHp.replace(/[^0-9]/g, ''),
    hpht: input.hpht,
    gravida: input.gravida,
    para: input.para,
    abortus: input.abortus,
    fasyankes: input.fasyankes.trim(),
    nama_bidan: input.namaBidan.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await db.profiles.put(profile)
  if (await syncProfile(profile) !== 'synced') {
    throw new Error('Profil belum tersimpan di cloud. Periksa koneksi, lalu tekan Verifikasi lagi.')
  }
  return { profile, uk, hpl, tri, progress }
}
