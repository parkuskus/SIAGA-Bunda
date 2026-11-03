import { useMemo, useState } from "react"
import { Check, ChevronLeft, Scale } from "lucide-react"
import type { WeightEntry } from "@/data/db"

type Props = {
  entries: WeightEntry[]
  onBack: () => void
  onEdit: (e: WeightEntry) => void
}

const fmtDay = (t: string) => {
  const d = new Date(`${t}T00:00:00`)
  return isNaN(d.getTime()) ? t : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}
const fmtMonth = (y: number, m: number) => new Date(y, m, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })
const mondayOf = (t: string) => {
  const d = new Date(`${t}T00:00:00`)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d
}
const fmtRange = (a: Date, b: Date) => {
  const sameMonth = a.getMonth() === b.getMonth()
  const f = (d: Date, withMonth: boolean) => `${d.getDate()}${withMonth ? ` ${d.toLocaleDateString("id-ID", { month: "short" })}` : ""}`
  return `${f(a, !sameMonth)}–${f(b, true)} ${b.getFullYear()}`
}

// S-07: riwayat BB tab Minggu/Bulan — ketuk entri untuk ubah (error checking)
export default function WeightHistory({ entries, onBack, onEdit }: Props) {
  const [tab, setTab] = useState<"minggu" | "bulan">("minggu")

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || (a.createdAt ?? "").localeCompare(b.createdAt ?? "")),
    [entries],
  )
  const deltaOf = useMemo(() => {
    const map = new Map<string, number | null>()
    sorted.forEach((e, i) => {
      map.set(e.id, i === 0 ? null : Math.round((e.beratKg - sorted[i - 1].beratKg) * 10) / 10)
    })
    return map
  }, [sorted])

  const groups = useMemo(() => {
    const map = new Map<string, { title: string; items: WeightEntry[] }>()
    for (const e of [...sorted].reverse()) {
      const d = new Date(`${e.tanggal}T00:00:00`)
      const key = tab === "minggu" ? mondayOf(e.tanggal).toISOString().slice(0, 10) : `${d.getFullYear()}-${d.getMonth()}`
      const title =
        tab === "minggu"
          ? (() => {
              const mon = mondayOf(e.tanggal)
              const sun = new Date(mon)
              sun.setDate(sun.getDate() + 6)
              return `Minggu ${fmtRange(mon, sun)}`
            })()
          : fmtMonth(d.getFullYear(), d.getMonth())
      if (!map.has(key)) map.set(key, { title, items: [] })
      map.get(key)!.items.push(e)
    }
    return [...map.values()]
  }, [sorted, tab])

  const jamOf = (e: WeightEntry) => e.createdAt?.slice(11, 16) || ""

  return (
    <div className="-mx-4 -mt-5">
      <header className="rounded-b-[32px] bg-[#4A6E54] px-6 pb-6 pt-[max(1.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-[#4A6E54] transition-transform active:scale-95"><ChevronLeft className="size-5" /></button>
          <div>
            <h1 className="!m-0 text-lg font-bold leading-tight">Riwayat Berat</h1>
            <p className="mt-0.5 text-xs text-white/90">{entries.length} catatan tersimpan</p>
          </div>
        </div>
      </header>

      <div className="space-y-4 px-4 pb-6 pt-5">
        <div className="grid grid-cols-2 gap-2 rounded-[20px] bg-[#EAF4F0] p-1.5">
          {(["minggu", "bulan"] as const).map((period) => (
            <button key={period} onClick={() => setTab(period)} aria-pressed={tab === period} className={`flex min-h-11 items-center justify-center gap-1.5 rounded-[16px] text-sm font-semibold transition-colors ${tab === period ? "bg-[#4A6E54] text-white" : "text-[#33443F] hover:bg-white/70"}`}>
              {tab === period && <Check className="size-4" strokeWidth={3} />}
              {period === "minggu" ? "Minggu" : "Bulan"}
            </button>
          ))}
        </div>

        {groups.length ? (
          groups.map((group) => {
            const values = group.items.map((entry) => entry.beratKg)
            const average = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
            return (
              <section key={group.title} className="space-y-2.5">
                <div className="px-1">
                  <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">{group.title}</h2>
                  <p className="mt-0.5 text-xs text-[#536961]">{group.items.length} entri. Rata-rata {average} kg. Rentang {Math.min(...values)} sampai {Math.max(...values)} kg</p>
                </div>
                <div className="space-y-2 rounded-[24px] bg-[#EAF4F0] p-2.5">
                  {group.items.map((entry) => {
                    const delta = deltaOf.get(entry.id)
                    return (
                      <button key={entry.id} onClick={() => onEdit(entry)} className="flex min-h-[64px] w-full items-center gap-3 rounded-[18px] bg-white px-3.5 py-2.5 text-left transition-colors hover:bg-[#F9FCFA] active:scale-[0.99]">
                        <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[#EAF4F0] text-[#4A6E54]"><Scale className="size-[18px]" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs text-[#536961]">{fmtDay(entry.tanggal)}{jamOf(entry) ? `, ${jamOf(entry)}` : ""}</span>
                          <span className="mt-0.5 block text-[15px] font-bold text-[#1D2B29]">{entry.beratKg} kg</span>
                        </span>
                        {delta !== null && delta !== undefined && <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${delta > 0 ? "bg-[#EDF6EF] text-[#2E7D32]" : delta < 0 ? "bg-[#FFF8EC] text-[#8A6D00]" : "bg-[#F1EFE9] text-[#6C757D]"}`}>{delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "±0"} kg</span>}
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })
        ) : (
          <section className="rounded-[24px] bg-[#EAF4F0] px-5 py-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-white text-[#4A6E54]"><Scale className="size-5" /></span>
            <p className="mt-3 text-sm font-bold text-[#1D2B29]">Belum ada catatan berat</p>
            <p className="mt-1 text-xs leading-relaxed text-[#536961]">Tambahkan pengukuran berat dari halaman Ingat untuk melihat perubahannya.</p>
          </section>
        )}
      </div>
    </div>
  )
}
