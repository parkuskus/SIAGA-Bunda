import { db } from '@/data/db'
import { syncScreening } from '@/data/sync'
import { validateScreening } from '../screeningCompleteness'

// S-05b: HipotiroidScreen — spec S-05b:340-344
export type HipotiroidInput = {
  userId: string
  babyId: string
  sudahTSH: boolean
  usiaBayiHari?: number
  gejala?: { ikterusLama?: boolean; konstipasi?: boolean; tangisanSerak?: boolean; aktivitasKurang?: boolean; lidahBesar?: boolean }
  gejalaDitinjau?: boolean
}

const GEJALA_LABEL: Record<string, string> = {
  ikterusLama: 'Kuning lebih dari 2 minggu',
  konstipasi: 'Sembelit',
  tangisanSerak: 'Tangisan serak',
  aktivitasKurang: 'Aktivitas kurang',
  lidahBesar: 'Lidah besar',
}

export function kategoriHipotiroid(v: HipotiroidInput): 'HIJAU' | 'KUNING' | 'MERAH' {
  if (v.sudahTSH) {
    const g = v.gejala
    if (g && (g.lidahBesar || g.aktivitasKurang)) return 'MERAH'
    // ponytail: gejala ringan + TSH sudah → tetap pantau (KUNING), bukan HIJAU
    if (g && (g.ikterusLama || g.konstipasi || g.tangisanSerak)) return 'KUNING'
    return 'HIJAU'
  }
  // belum TSH
  if (v.usiaBayiHari !== undefined && v.usiaBayiHari > 3) return 'KUNING' // lewat window 48-72 jam
  return 'KUNING'
}

export async function submitHipotiroid(input: HipotiroidInput) {
  if (!input.babyId) throw new Error('ID bayi wajib')
  const baby = await db.bblProfiles.get(input.babyId)
  if (!baby || baby.userId !== input.userId) throw new Error('Data bayi tidak ditemukan untuk akun ini')
  const errs = validateScreening('hipotiroid', input as unknown as Record<string, unknown>)
  if (Object.keys(errs).length) throw Object.assign(new Error(Object.values(errs)[0]), { errs })
  const kategori = kategoriHipotiroid(input)

  const gejalaAktif = Object.entries(input.gejala ?? {}).filter(([, v]) => v).map(([k]) => GEJALA_LABEL[k] ?? k)
  const faktorRisiko: string[] = []
  if (!input.sudahTSH) {
    faktorRisiko.push(`Belum tes TSH hari ke-${input.usiaBayiHari ?? '?'} (window 48–72 jam)`)
  }
  for (const g of gejalaAktif) faktorRisiko.push(g)

  const faktorAman: string[] = []
  if (kategori === 'HIJAU') {
    faktorAman.push('TSH sudah diperiksa; hasil laboratorium perlu dikonfirmasi')
    faktorAman.push('Tanpa gejala mencurigakan')
  }

  const row = { id: globalThis.crypto?.randomUUID?.() ?? ("demo-" + Date.now() + "-" + Math.random().toString(36).slice(2,8)), userId: input.userId, tipe: 'hipotiroid', skor: input.sudahTSH ? 1 : 0, kategori, detail: { ...input, faktorRisiko, validasiKelengkapan: 1 }, createdAt: new Date().toISOString() }
  await db.screeningResults.put(row)
  syncScreening(row as never)
  return { kategori, warna: kategori, faktorRisiko, faktorAman }
}
