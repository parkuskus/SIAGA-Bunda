import { validateScreening } from '../screeningCompleteness.ts'

export type ScreeningIssue = { key: string; label: string; instruction: string }

export const numericOrMissing = (value: string): number => value.trim() === '' ? NaN : Number(value)

export function isOutsideReferenceRange(value: number, range: { min?: number; max?: number; minInclusive?: boolean; maxInclusive?: boolean }): boolean {
  if (!Number.isFinite(value)) return false
  return (range.min !== undefined && (range.minInclusive === false ? value <= range.min : value < range.min))
    || (range.max !== undefined && (range.maxInclusive === false ? value >= range.max : value > range.max))
}

export function weekFromSavedOrProfile(saved: unknown, profileWeek: string): string {
  const week = typeof saved === 'number' || typeof saved === 'string' ? numericOrMissing(String(saved)) : NaN
  return validateScreening('imt_lila', { userId: 'draft', ukMinggu: week }).ukMinggu ? profileWeek : String(saved)
}

export function toScreeningIssues(errors: Record<string, string>, labels: Record<string, string>, instructions: Record<string, string> = {}): ScreeningIssue[] {
  return Object.entries(errors)
    .filter(([key]) => key !== 'userId')
    .map(([key, instruction]) => ({
      key,
      label: labels[key] ?? key,
      instruction: instructions[key] ?? (instruction === `Jawab ${key} dengan Ya atau Tidak` && labels[key]
        ? `Pilih Ya atau Tidak untuk ${labels[key]}`
        : labels[key] ? instruction.replaceAll(key, labels[key]) : instruction),
    }))
}
