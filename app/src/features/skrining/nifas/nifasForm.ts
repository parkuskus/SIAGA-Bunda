import { db } from '@/data/db'
import { syncNifas, syncScreening } from '@/data/sync'
import { warnaMEOWS } from '@/clinical-rules/meows'
import { validateScreening } from '../screeningCompleteness'

// S-04: NifasSkrScreen — spec S-04:271, SK06
export type NifasInput = {
  userId: string
  hariKe: number // 0-42
  suhu: number
  sistolik: number
  diastolik: number
  nadi?: number
  spo2?: number
  perdarahanMl?: number
  lochiaBau?: boolean
  nyeriUterus?: boolean
  lukaBengkak?: boolean
  nyeriSkala?: number
  produksiASI?: 'ada' | 'sedikit' | 'tidak'
  mood?: number // 1 sangat buruk – 5 sangat baik (S-04 suasana hati)
  keluhanDitinjau?: boolean
}

// stadium lochia dari hari ke (S-04): rubra 0-3, serosa 4-10, alba 11-42
export function lochiaStage(hariKe: number): 'rubra' | 'serosa' | 'alba' {
  if (hariKe <= 3) return 'rubra'
  if (hariKe <= 10) return 'serosa'
  return 'alba'
}

export function validateNifas(v: NifasInput): Record<string, string> {
  const e: Record<string, string> = validateScreening('nifas', v as unknown as Record<string, unknown>)
  if (!v.userId) e.userId = 'userId wajib'
  if (v.hariKe < 0 || v.hariKe > 42) e.hariKe = 'Hari nifas (hari) harus 0–42'
  if (v.suhu < 34 || v.suhu > 42) e.suhu = 'Suhu tubuh (°C) harus 34–42'
  return e
}

export async function submitNifas(input: NifasInput) {
  const errs = validateNifas(input)
  if (Object.keys(errs).length) throw Object.assign(new Error('validasi gagal'), { errs })
  const warna = warnaMEOWS({
    sistolik: input.sistolik, diastolik: input.diastolik, suhu: input.suhu,
    nadi: input.nadi, spo2: input.spo2, perdarahanMl: input.perdarahanMl,
    adaDemamNyeriUterus: !!(input.suhu > 38 && input.nyeriUterus && input.lochiaBau),
  })
  // endpoint: lochia berbau + demam sudah MERAH via meows; tambah luka bengkak → KUNING
  let kategori: 'HIJAU' | 'KUNING' | 'MERAH' = warna
  if (input.lukaBengkak && kategori === 'HIJAU') kategori = 'KUNING'
  // ponytail: ambang skrining, bukan diagnosis — nyeri berat & mood buruk butuh evaluasi bidan
  if ((input.nyeriSkala ?? 0) >= 7 && kategori === 'HIJAU') kategori = 'KUNING'
  if ((input.mood ?? 5) <= 2 && kategori !== 'MERAH') kategori = 'KUNING'

  const stage = lochiaStage(input.hariKe)
  const faktorRisiko: string[] = []
  if (warna === 'MERAH') faktorRisiko.push(`MEOWS merah hari ke-${input.hariKe} — tanda vital di luar batas aman`)
  else if (warna === 'KUNING') faktorRisiko.push(`MEOWS kuning hari ke-${input.hariKe} — pantau ketat`)
  if (input.suhu > 38 && input.nyeriUterus && input.lochiaBau) faktorRisiko.push('Curiga infeksi nifas (demam + nyeri perut + cairan berbau)')
  else if (input.lochiaBau) faktorRisiko.push('Cairan nifas berbau — waspada infeksi')
  if ((input.perdarahanMl ?? 0) > 500) faktorRisiko.push(`Perdarahan ${input.perdarahanMl} ml (>500 ml)`)
  if (input.lukaBengkak) faktorRisiko.push('Jahitan jalan lahir atau bekas operasi bengkak atau bernanah')
  if ((input.nyeriSkala ?? 0) >= 7) faktorRisiko.push(`Nyeri skala ${input.nyeriSkala}/10 — perlu evaluasi`)
  if ((input.mood ?? 5) <= 2) faktorRisiko.push('Suasana hati buruk — isi skrining EPDS dan konseling bidan')
  if (input.produksiASI === 'tidak') faktorRisiko.push('ASI belum keluar — cek skrining laktasi')
  else if (input.produksiASI === 'sedikit') faktorRisiko.push('ASI sedikit — pantau kecukupan menyusui')

  const faktorAman: string[] = []
  if (kategori === 'HIJAU') {
    faktorAman.push(`Tanda vital normal (MEOWS hijau) hari ke-${input.hariKe}`)
    if (input.lochiaBau === false) faktorAman.push(`Cairan nifas sesuai fase ${stage}`)
    if (input.lukaBengkak === false) faktorAman.push('Luka sembuh baik')
    if (input.mood !== undefined && input.mood >= 4) faktorAman.push('Suasana hati baik')
  }

  const nifasRow = { id: globalThis.crypto?.randomUUID?.() ?? ("demo-" + Date.now() + "-" + Math.random().toString(36).slice(2,8)), userId: input.userId, hariKe: input.hariKe, parameterVital: { ...input, lochiaStage: stage }, status: kategori, createdAt: new Date().toISOString() }
  await db.nifasScreenings.put(nifasRow)
  syncNifas(nifasRow)
  // juga simpan ringkas ke screeningResults untuk histori S-03g
  const sRow = { id: globalThis.crypto?.randomUUID?.() ?? ("demo-" + Date.now() + "-" + Math.random().toString(36).slice(2,8)), userId: input.userId, tipe: 'nifas', skor: input.hariKe, kategori, detail: { ...input, meows: warna, faktorRisiko, validasiKelengkapan: 1 }, createdAt: new Date().toISOString() }
  await db.screeningResults.put(sRow)
  syncScreening(sRow as never)
  return { kategori, warna: kategori, meows: warna, faktorRisiko, faktorAman }
}
