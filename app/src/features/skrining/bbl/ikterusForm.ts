import { db } from '@/data/db'
import { syncScreening } from '@/data/sync'
import { kategoriKramer } from '@/clinical-rules/kramerZone'
import { validateScreening } from '../screeningCompleteness'

// S-05a: IkterusScreen — spec S-05a:328-333 — wrap kramerZone.ts
export type IkterusInput = {
  userId: string
  babyId: string
  usiaBayiHari: number
  zona: 1 | 2 | 3 | 4 | 5
  onsetJam: number
  fesesDempul?: boolean
  aktivitas?: 'aktif' | 'mengantuk' | 'tidak mau minum'
  prematur?: boolean
  gejalaDitinjau?: boolean
}

export async function submitIkterus(input: IkterusInput) {
  if (!input.babyId) throw new Error('ID bayi wajib')
  const baby = await db.bblProfiles.get(input.babyId)
  if (!baby || baby.userId !== input.userId) throw new Error('Data bayi tidak ditemukan untuk akun ini')
  const errs = validateScreening('ikterus', input as unknown as Record<string, unknown>)
  if (Object.keys(errs).length) throw Object.assign(new Error(Object.values(errs)[0]), { errs })
  const { status, warna } = kategoriKramer({ zona: input.zona, onsetJam: input.onsetJam, fesesDempul: input.fesesDempul })
  // zona 4-5 atau onset<24 sudah MERAH via kramerZone; prematur + zona3 → eskalasi
  let kategori: 'HIJAU' | 'KUNING' | 'MERAH' = warna
  if (input.prematur && input.zona >= 3 && kategori === 'KUNING') kategori = 'MERAH'
  // ponytail: bayi kuning + tidak mau minum = tanda bahaya menyusu → eskalasi satu tingkat
  if (input.aktivitas === 'tidak mau minum' && kategori !== 'MERAH') kategori = kategori === 'HIJAU' ? 'KUNING' : 'MERAH'

  const faktorRisiko: string[] = []
  if (input.fesesDempul) faktorRisiko.push('Feses pucat dempul — curiga sumbatan empedu, segera rujuk')
  else if (input.onsetJam < 24) faktorRisiko.push(`Kuning muncul jam ke-${input.onsetJam} (<24 jam) — patologis`)
  else if (input.zona >= 4) faktorRisiko.push(`Kuning zona ${input.zona} sampai telapak — perlu fototerapi`)
  else if (input.zona === 3) faktorRisiko.push(`Kuning zona ${input.zona} sampai perut — pantau ketat`)
  if (input.prematur) faktorRisiko.push('Bayi prematur — ambang rujuk lebih rendah')
  if (input.aktivitas === 'tidak mau minum') faktorRisiko.push('Bayi tidak mau minum — tanda bahaya menyusu')
  else if (input.aktivitas === 'mengantuk') faktorRisiko.push('Bayi mengantuk — pantau frekuensi menyusu')

  const faktorAman: string[] = []
  if (kategori === 'HIJAU') {
    faktorAman.push(`Kuning zona ${input.zona} (${status.toLowerCase()}) — pantau di rumah`)
    if (input.aktivitas === 'aktif') faktorAman.push('Bayi aktif menyusu baik')
  }

  const row = { id: globalThis.crypto?.randomUUID?.() ?? ("demo-" + Date.now() + "-" + Math.random().toString(36).slice(2,8)), userId: input.userId, tipe: 'ikterus', skor: input.zona, kategori, detail: { ...input, statusKramer: status, faktorRisiko, validasiKelengkapan: 1 }, createdAt: new Date().toISOString() }
  await db.screeningResults.put(row)
  syncScreening(row as never)
  return { status, kategori, warna: kategori, faktorRisiko, faktorAman }
}
