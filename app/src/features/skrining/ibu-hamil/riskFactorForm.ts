import { db } from '@/data/db'
import { syncScreening } from '@/data/sync'
import { scorePoedji } from '@/clinical-rules/poedjiRochjati'
import { validateScreening } from '../screeningCompleteness'

// S-03a: RiskFactorScreen — form-only (FE menyusul) — spec S-03a:171, SK01

export type RiskFactorInput = {
  userId: string
  usia: number // tahun
  ukMinggu?: number
  gravida: number // urutan kehamilan
  paritas: number // jumlah persalinan sebelumnya
  jarakTahun?: number
  riwayatKomplikasi?: boolean // +4, jika SC +8 via riwayatSC
  riwayatSC?: boolean
  riwayatPE?: boolean
  penyakitKronik?: boolean // HT/DM/Jantung/Ginjal/SLE +8
  kehamilanGanda?: boolean
  hidramnion?: boolean
  kelainanLetak?: boolean
  // field tambahan spec (TB/BB/TD/TRB) disimpan di detail tapi tidak ubah skor Poedji inti
  sistolik?: number
  diastolik?: number
  tbCm?: number
  bbPreKg?: number
  trb?: boolean // teknik reproduksi berbantu
  jawabanForm?: { gravida: number; jarak: string | null; riwayatKomplikasi: string[]; penyakitKronik: string[]; gemeli: boolean | null; trb: boolean | null; letak: boolean | null; hidramnion: boolean | null }
}

export function validateRiskFactor(v: RiskFactorInput): Record<string, string> {
  const e: Record<string, string> = validateScreening('poedji_rochjati', v as unknown as Record<string, unknown>)
  if (!v.userId) e.userId = 'userId wajib'
  if (v.usia < 10 || v.usia > 60) e.usia = 'Usia (tahun) harus 10–60'
  if (!Number.isSafeInteger(v.gravida) || v.gravida < 1) e.gravida = 'Urutan kehamilan harus berupa angka bulat minimal 1'
  if (!Number.isSafeInteger(v.paritas) || v.paritas < 0 || v.paritas > 15 || v.paritas > v.gravida) e.paritas = 'Jumlah persalinan sebelumnya harus 0–15 dan tidak melebihi urutan kehamilan'
  if (v.jarakTahun !== undefined && (v.jarakTahun < 0 || v.jarakTahun > 20)) e.jarakTahun = 'Jarak kehamilan (tahun) harus 0–20'
  if (v.ukMinggu !== undefined && (v.ukMinggu < 0 || v.ukMinggu > 45)) e.ukMinggu = 'Usia kehamilan (minggu) harus 0–45'
  if (v.sistolik !== undefined && (v.sistolik < 70 || v.sistolik > 250)) e.sistolik = 'Tekanan darah atas (mmHg) harus 70–250'
  if (v.diastolik !== undefined && (v.diastolik < 40 || v.diastolik > 150)) e.diastolik = 'Tekanan darah bawah (mmHg) harus 40–150'
  if (v.tbCm !== undefined && (v.tbCm < 100 || v.tbCm > 200)) e.tbCm = 'Tinggi (cm) harus 100–200'
  if (v.bbPreKg !== undefined && (v.bbPreKg < 20 || v.bbPreKg > 250)) e.bbPreKg = 'BB sebelum hamil (kg) harus 20–250'
  return e
}

export async function submitRiskFactor(input: RiskFactorInput) {
  const errs = validateRiskFactor(input)
  if (Object.keys(errs).length) throw Object.assign(new Error('validasi gagal'), { errs })

  const { skor, kategori, warna } = scorePoedji({
    usia: input.usia,
    paritas: input.paritas,
    jarakTahun: input.jarakTahun,
    riwayatKomplikasi: input.riwayatKomplikasi,
    riwayatSC: input.riwayatSC,
    riwayatPE: input.riwayatPE,
    penyakitKronik: input.penyakitKronik,
    kehamilanGanda: input.kehamilanGanda,
    hidramnion: input.hidramnion,
    kelainanLetak: input.kelainanLetak,
  })

  const faktorRisiko: string[] = []
  if (input.usia < 20 || input.usia > 35) faktorRisiko.push('Usia berisiko (<20/>35)')
  if (input.paritas >= 4) faktorRisiko.push('Grande multipara (4+ persalinan)')
  if (input.paritas > 4) faktorRisiko.push('Terlalu banyak persalinan (>4)')
  if (input.jarakTahun !== undefined && input.jarakTahun < 2) faktorRisiko.push('Jarak <2th')
  if (input.riwayatKomplikasi) faktorRisiko.push('Riwayat komplikasi kehamilan')
  if (input.riwayatSC) faktorRisiko.push('Riwayat operasi caesar')
  if (input.riwayatPE) faktorRisiko.push('Riwayat preeklamsia')
  if (input.penyakitKronik) faktorRisiko.push('Penyakit kronik (HT/DM/Jantung/Ginjal)')
  if (input.kehamilanGanda) faktorRisiko.push('Kehamilan ganda')
  if (input.hidramnion) faktorRisiko.push('Air ketuban banyak (hidramnion)')
  if (input.kelainanLetak) faktorRisiko.push('Kelainan letak (sungsang/lintang)')
  if (input.trb) faktorRisiko.push('Hamil dengan bantuan reproduksi (TRB) — info, tidak tambah skor')

  const faktorAman: string[] = []
  if (input.usia >= 20 && input.usia <= 35) faktorAman.push('Usia 20–35 tahun (rentang aman)')
  if (input.paritas >= 1 && input.paritas <= 3) faktorAman.push('Jumlah persalinan 1–3 (tidak grande)')
  if (input.jarakTahun !== undefined && input.jarakTahun >= 2) faktorAman.push('Jarak kehamilan ≥2 tahun')
  if (!input.riwayatSC && !input.riwayatKomplikasi) faktorAman.push('Tidak ada riwayat komplikasi/SC')
  if (!input.riwayatPE) faktorAman.push('Tidak ada riwayat preeklamsia')
  if (!input.penyakitKronik) faktorAman.push('Tidak ada penyakit kronik')
  if (!input.kehamilanGanda) faktorAman.push('Kehamilan tunggal')
  if (input.sistolik !== undefined && input.diastolik !== undefined) {
    if (input.sistolik < 140 && input.diastolik < 90) faktorAman.push(`TD ${input.sistolik}/${input.diastolik} normal`)
  }

  const id = globalThis.crypto?.randomUUID?.() ?? `rf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const createdAt = new Date().toISOString()
  const row = {
    id,
    userId: input.userId,
    tipe: 'poedji_rochjati',
    skor,
    kategori: warna, // HIJAU=HRR KRR, KUNING=KRS, MERAH=KRT — mapping ke traffic light
    detail: { ...input, kategoriPoedji: kategori, faktorRisiko, trb: input.trb, validasiKelengkapan: 1 },
    createdAt,
  }
  await db.screeningResults.put(row)
  syncScreening(row as never)

  return { skor, kategori, warna, faktorRisiko, faktorAman }
}
