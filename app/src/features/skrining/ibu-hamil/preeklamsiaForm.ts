import { db } from '@/data/db'
import { syncScreening } from '@/data/sync'
import { calcMAP, kategoriMAP, kategoriTD } from '@/clinical-rules/mapCalculator'
import { validateScreening } from '../screeningCompleteness'

// S-03d: PreeklamsiScreen — spec S-03d:216-222, SK02 (MAP <90 / 90-99 / >99)
export type PreeklamsiaInput = {
  userId: string
  sistolik: number
  diastolik: number
  ukMinggu: number
  proteinuria: boolean
  riwayatPE?: boolean
  kehamilanGanda?: boolean
  imtPre?: number
  nullipara?: boolean
  htKronik?: boolean
  ginjalKronik?: boolean
  diabetesMelitus?: boolean
  autoimun?: boolean // APS/SLE
  usia?: number
  jarakTahun?: number
  riwayatKeluargaPE?: boolean
  faktorDitinjau?: boolean
}

export function validatePreeklamsia(v: PreeklamsiaInput): Record<string, string> {
  const e: Record<string, string> = validateScreening('preeklamsia', v as unknown as Record<string, unknown>)
  if (!v.userId) e.userId = 'userId wajib'
  if (v.sistolik < 70 || v.sistolik > 250) e.sistolik = 'Tekanan darah atas harus 70–250 mmHg'
  if (v.diastolik < 40 || v.diastolik > 150) e.diastolik = 'Tekanan darah bawah harus 40–150 mmHg'
  return e
}

export async function submitPreeklamsia(input: PreeklamsiaInput) {
  const errs = validatePreeklamsia(input)
  if (Object.keys(errs).length) throw Object.assign(new Error('validasi gagal'), { errs })
  const map = calcMAP(input.sistolik, input.diastolik)
  const mapKat = kategoriMAP(map) // HIJAU <90 KUNING 90-99 MERAH >99
  const tdKat = kategoriTD(input.sistolik, input.diastolik)
  // NICE NG133: risiko tinggi bila >=1 mayor (riwayat PE, HT kronik, ginjal, DM, autoimun)
  const risikoTinggi = !!(input.riwayatPE || input.htKronik || input.ginjalKronik || input.diabetesMelitus || input.autoimun)
  // NICE moderat: >=2 dari nullipara, usia>40, IMT>35, jarak>10th, keluarga PE → setara risiko tinggi
  const moderatCount = [input.nullipara, (input.usia ?? 0) > 40, (input.imtPre ?? 0) > 35, (input.jarakTahun ?? 0) > 10, input.riwayatKeluargaPE].filter(Boolean).length
  const risikoTinggiModerat = moderatCount >= 2
  const risikoTinggiEfektif = risikoTinggi || risikoTinggiModerat
  // Preeklamsia = HT (>=140/90) + proteinuria pada UK>=20 → rujuk (konservatif → MERAH)
  const curigaPE = tdKat !== 'HIJAU' && input.proteinuria && input.ukMinggu >= 20
  let kategori: 'HIJAU' | 'KUNING' | 'MERAH' = 'HIJAU'
  if (input.sistolik >= 160 || input.diastolik >= 110 || mapKat === 'MERAH' || curigaPE) kategori = 'MERAH'
  else if (tdKat === 'KUNING' || mapKat === 'KUNING' || risikoTinggiEfektif || input.proteinuria) kategori = 'KUNING'

  const faktorRisiko: string[] = []
  if (input.sistolik >= 160 || input.diastolik >= 110) faktorRisiko.push(`TD krisis ${input.sistolik}/${input.diastolik} (≥160/110)`)
  else if (tdKat === 'KUNING') faktorRisiko.push(`TD tinggi ${input.sistolik}/${input.diastolik}`)
  if (mapKat === 'MERAH') faktorRisiko.push(`MAP ${map} berisiko tinggi (>99)`)
  else if (mapKat === 'KUNING') faktorRisiko.push(`MAP ${map} waspada (90–99)`)
  if (curigaPE) faktorRisiko.push('Curiga preeklamsia (TD tinggi + protein urine)')
  else if (input.proteinuria) faktorRisiko.push('Protein urine positif')
  if (input.riwayatPE) faktorRisiko.push('Riwayat preeklamsia sebelumnya')
  if (input.htKronik) faktorRisiko.push('Darah tinggi menahun')
  if (input.ginjalKronik) faktorRisiko.push('Penyakit ginjal kronik')
  if (input.diabetesMelitus) faktorRisiko.push('Diabetes melitus')
  if (input.autoimun) faktorRisiko.push('Penyakit autoimun (APS/SLE)')
  if (input.kehamilanGanda) faktorRisiko.push('Kehamilan ganda')
  if (risikoTinggiModerat) faktorRisiko.push(`≥2 faktor moderat NICE (${moderatCount} terpenuhi)`)

  const faktorAman: string[] = []
  if (tdKat === 'HIJAU') faktorAman.push(`TD ${input.sistolik}/${input.diastolik} normal`)
  if (mapKat === 'HIJAU') faktorAman.push(`MAP ${map} normal (<90)`)
  if (input.proteinuria === false) faktorAman.push('Protein urine negatif')
  if (!risikoTinggiEfektif) faktorAman.push('Tidak ada faktor risiko tinggi NICE')

  // aspirin profilaksis 75–150mg bila risiko tinggi & UK<16 — anjuran untuk dokter/bidan
  const perluAspirin = risikoTinggiEfektif && input.ukMinggu < 16

  const detail: Record<string, unknown> = { ...input, map, mapKat, tdKat, risikoTinggi: risikoTinggiEfektif, moderatCount, curigaPE, faktorRisiko, perluAspirin, validasiKelengkapan: 1 }
  const row = { id: globalThis.crypto?.randomUUID?.() ?? ("demo-" + Date.now() + "-" + Math.random().toString(36).slice(2,8)), userId: input.userId, tipe: 'preeklamsia', skor: map, kategori, detail, createdAt: new Date().toISOString() }
  await db.screeningResults.put(row)
  syncScreening(row as never)
  return { map, mapKat, tdKat, kategori, risikoTinggi: risikoTinggiEfektif, faktorRisiko, faktorAman, perluAspirin, ukMinggu: input.ukMinggu }
}
