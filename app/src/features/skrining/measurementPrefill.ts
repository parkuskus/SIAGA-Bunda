import type { ScreeningResult, WeightEntry } from "@/data/db"

export type MeasurementPrefill = {
  bbPreKg?: number
  bbPreKgTanggal?: string
  tbCm?: number
  tbCmTanggal?: string
  bbSekarangKg?: { value: number; tanggal: string }
}

function validNumber(value: unknown, min: number, max: number): value is number {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN
  return Number.isFinite(number) && number >= min && number <= max
}

export function measurementPrefill(results: ScreeningResult[], weights: WeightEntry[]): MeasurementPrefill {
  const relevant = results
    .filter((row) => ["imt_lila", "dmg", "poedji_rochjati"].includes(row.tipe))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const firstValid = (key: "bbPreKg" | "tbCm", min: number, max: number) => {
    for (const row of relevant) {
      const tanggal = typeof row.createdAt === "string" ? row.createdAt.slice(0, 10) : ""
      const [year, month, day] = tanggal.split("-").map(Number)
      const sourceDate = new Date(Date.UTC(year, month - 1, day))
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || sourceDate.toISOString().slice(0, 10) !== tanggal) continue
      const value = row.detail[key] ?? (key === "bbPreKg" ? row.detail.bbKg : undefined)
      if (validNumber(value, min, max)) return { value: Number(value), tanggal }
    }
    return undefined
  }
  const latestWeight = weights
    .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.tanggal) && validNumber(row.beratKg, 20, 250))
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0]

  const bbPreKg = firstValid("bbPreKg", 20, 200)
  const tbCm = firstValid("tbCm", 100, 200)
  return {
    ...(bbPreKg ? { bbPreKg: bbPreKg.value, bbPreKgTanggal: bbPreKg.tanggal } : {}),
    ...(tbCm ? { tbCm: tbCm.value, tbCmTanggal: tbCm.tanggal } : {}),
    ...(latestWeight ? { bbSekarangKg: { value: latestWeight.beratKg, tanggal: latestWeight.tanggal } } : {}),
  }
}
