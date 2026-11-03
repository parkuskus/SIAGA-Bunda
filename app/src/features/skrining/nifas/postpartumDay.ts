export function postpartumDayFromBirthDate(birthDate: string, today = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!match) return null
  const [, year, month, day] = match
  const birth = new Date(Number(year), Number(month) - 1, Number(day))
  if (birth.getFullYear() !== Number(year) || birth.getMonth() !== Number(month) - 1 || birth.getDate() !== Number(day)) return null
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const elapsed = Math.floor((current.getTime() - birth.getTime()) / 86_400_000)
  return elapsed >= 0 && elapsed <= 42 ? elapsed : null
}
