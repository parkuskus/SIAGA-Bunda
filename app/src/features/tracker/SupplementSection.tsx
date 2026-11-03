import { useEffect, useState } from "react"
import { Bell, Check, CircleHelp, Plus, Trash2, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { db } from "@/data/db"
import { getCurrentUserId } from "@/data/currentUser"
import { deleteSupplement, getDoseMap, setDoseStatus } from "@/features/tracker/supplementForm"
import type { DoseLog, SupplementReminder } from "@/data/db"
const HARI_PENDEK = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]

const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const startOfWeek = (d: Date) => {
  const c = new Date(d)
  c.setDate(c.getDate() - c.getDay())
  c.setHours(0, 0, 0, 0)
  return c
}

type Dose = { med: SupplementReminder; waktu: string; status: DoseLog["status"] }

// Ikon dosis menggantikan gambar obat supaya status bisa dikenali sekilas.
function MedImage({ status }: { status: DoseLog["status"] }) {
  const Icon = status === "taken" ? Check : status === "skip" ? X : CircleHelp
  const style = status === "taken"
    ? "bg-[#EDF6EF] text-[#2E7D32] ring-[#7ACB8A]"
    : status === "skip"
      ? "bg-[#FDECEC] text-[#C62828] ring-[#E57373]"
      : "bg-[#F2F4F2] text-[#8A8F93] ring-[#D9E7E2]"
  return (
    <span className={`grid size-12 shrink-0 place-items-center rounded-[16px] ring-2 ${style}`}>
      <Icon className="size-6" strokeWidth={2.75} aria-hidden="true" />
    </span>
  )
}

export default function SupplementSection({ onAdd }: { onAdd: () => void }) {
  const [meds, setMeds] = useState<SupplementReminder[]>([])
  const [doseMap, setDoseMap] = useState<Record<string, DoseLog["status"]>>({})
  const [uid, setUid] = useState("")
  const [weekOffset, setWeekOffset] = useState(0)
  const [selected, setSelected] = useState(toISODate(new Date()))
  const [sheetDose, setSheetDose] = useState<Dose | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    const id = await getCurrentUserId()
    setUid(id)
    const all = await db.supplementReminders.where("userId").equals(id).toArray()
    setMeds(all.filter((m) => m.statusAktif))
    setDoseMap(await getDoseMap(id, selected))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reload the selected user's reminders from Dexie.
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  const weekStart = startOfWeek(new Date(new Date().setDate(new Date().getDate() + weekOffset * 7)))
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
  const todayISO = toISODate(new Date())
  const selDate = new Date(`${selected}T00:00:00`)
  const title = selected === todayISO ? "Hari ini" : NAMA_HARI[selDate.getDay()]

  // jadwal hari terpilih
  const doses: Dose[] = []
  for (const med of meds) {
    if (med.tanggalMulai && selected < med.tanggalMulai) continue
    if (med.tanggalSelesai && selected > med.tanggalSelesai) continue
    if ((med.frekuensi ?? "harian1") === "mingguan" && med.hari && !med.hari.includes(selDate.getDay())) continue
    const times = med.waktuList?.length ? med.waktuList : [med.waktu]
    for (const t of times) {
      doses.push({ med, waktu: t, status: doseMap[`${med.id}|${t}`] ?? "none" })
    }
  }
  doses.sort((a, b) => a.waktu.localeCompare(b.waktu))

  const frekLabel = (med: SupplementReminder) =>
    (med.frekuensi ?? "harian1") === "mingguan" ? "Mingguan" : `${{ harian1: "1", harian2: "2", harian3: "3" }[med.frekuensi ?? "harian1"] ?? "1"}x sehari`

  const handleStatus = async (status: DoseLog["status"]) => {
    if (!sheetDose) return
    await setDoseStatus({ userId: uid, suplemenId: sheetDose.med.id, tanggal: selected, waktu: sheetDose.waktu, status })
    setSheetDose(null)
    await load()
  }

  const handleDelete = async () => {
    if (!sheetDose) return
    if (!window.confirm(`Hapus pengingat ${sheetDose.med.namaSuplemen}?`)) return
    setDeleting(true)
    try {
      const id = sheetDose.med.id
      await deleteSupplement(id)
      setMeds((current) => current.filter((medicine) => medicine.id !== id))
      setDoseMap((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${id}|`))))
      setSheetDose(null)
    } catch {
      window.alert("Pengingat belum berhasil dihapus. Coba lagi.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="!m-0 text-[15px] font-bold tracking-tight text-[#1D2B29]">Pengingat Obat</h2>
      </div>

      <Card className="rounded-[24px] border-0 bg-[#EAF4F0] ring-0 shadow-none overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-bold tracking-tight text-[#1D2B29]">{title}</p>
            <div className="flex gap-1">
              <button onClick={() => setWeekOffset((o) => o - 1)} aria-label="Minggu lalu" className="grid size-11 place-items-center rounded-full bg-white text-[#4A6E54] ring-1 ring-[#D9E7E2]">‹</button>
              <button onClick={() => { setWeekOffset(0); setSelected(todayISO) }} className="min-h-11 rounded-full bg-white px-3 text-xs font-semibold text-[#4A6E54] ring-1 ring-[#D9E7E2]">Hari ini</button>
              <button onClick={() => setWeekOffset((o) => o + 1)} aria-label="Minggu depan" className="grid size-11 place-items-center rounded-full bg-white text-[#4A6E54] ring-1 ring-[#D9E7E2]">›</button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1">
            {weekDays.map((d, i) => {
              const iso = toISODate(d)
              const active = iso === selected
              const isToday = iso === todayISO
              return (
                <button
                  key={iso}
                  onClick={() => setSelected(iso)}
                  className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-[16px] py-1.5 transition-colors ${active ? "bg-[#4A6E54] text-white" : "text-[#1D2B29] hover:bg-white"}`}
                >
                  <span className={`text-[10px] ${active ? "text-white/85" : "text-[#8A8F93]"}`}>{HARI_PENDEK[i]}</span>
                  <span className={`text-sm font-bold leading-none ${isToday && !active ? "text-[#7AAE9A]" : ""}`}>{d.getDate()}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 space-y-3">
            {doses.length ? (
              doses.map((dose) => (
                <div key={`${dose.med.id}|${dose.waktu}`}>
                  <p className="flex items-center gap-1.5 px-1 text-xs font-bold text-[#4A6E54]">
                    <Bell className="size-3.5" /> {dose.waktu}
                  </p>
                  <button onClick={() => setSheetDose(dose)} className="mt-1.5 flex w-full items-center gap-3 rounded-[18px] bg-white px-3 py-3 text-left ring-1 ring-[#D9E7E2] active:scale-[0.99] transition">
                    <MedImage status={dose.status} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[#1D2B29]">{dose.med.namaSuplemen}</span>
                      <span className="mt-0.5 block text-xs text-[#8A8F93]">
                        {frekLabel(dose.med)} · {dose.med.dosis ?? dose.med.bentuk ?? "Tablet"}
                        {dose.status === "taken" ? " · Sudah diminum" : dose.status === "skip" ? " · Terlewat" : ""}
                      </span>
                    </span>
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center px-4 py-8 text-center">
                <span className="grid size-14 place-items-center rounded-full bg-white text-[#4A6E54] ring-1 ring-[#D9E7E2]">
                  <Bell className="size-6" />
                </span>
                <p className="mt-3 text-sm font-bold text-[#1D2B29]">Belum ada pengingat</p>
                <p className="mt-1 max-w-[26ch] text-xs leading-relaxed text-[#8A8F93]">Tambah obat agar tidak lupa minum sesuai jadwal.</p>
                <button onClick={onAdd} className="mt-4 min-h-11 rounded-full bg-[#4A6E54] px-6 text-sm font-semibold text-white active:scale-[0.98] transition">
                  Tambah pengingat
                </button>
              </div>
            )}
          </div>

          {doses.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={onAdd}
                aria-label="Tambah obat"
                className="flex min-h-11 items-center gap-1.5 rounded-full bg-[#4A6E54] pl-4 pr-5 text-sm font-bold text-white active:scale-[0.97] transition"
              >
                <Plus className="size-4" strokeWidth={3} /> Tambah
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {sheetDose && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetDose(null)} />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px] rounded-t-[24px] bg-[#FFFCF6] p-5 pb-8 shadow-xl">
              <p className="text-[15px] font-bold text-[#1D2B29]">Ubah status {sheetDose.med.namaSuplemen}</p>
            <p className="mt-0.5 text-xs text-[#8A8F93]">{sheetDose.waktu} · ketuk untuk menandai</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <button onClick={() => void handleStatus("taken")} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-[18px] bg-[#EAF4F0] py-3 active:scale-[0.97] transition">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#DFF0E4] text-[#2E7D32]"><Check className="size-5" strokeWidth={3} /></span>
                <span className="text-xs font-semibold text-[#1E2326]">Sudah minum</span>
              </button>
              <button onClick={() => void handleStatus("skip")} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-[18px] bg-[#FDECEC] py-3 active:scale-[0.97] transition">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#F8D9D9] text-[#C62828]"><X className="size-5" strokeWidth={3} /></span>
                <span className="text-xs font-semibold text-[#1E2326]">Lewat</span>
              </button>
              <button onClick={() => void handleStatus("none")} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-[18px] bg-white py-3 ring-1 ring-[#D9E7E2] active:scale-[0.97] transition">
                <span className="grid size-11 place-items-center rounded-2xl bg-[#EDEBE4] text-[#8A8F93]"><span className="text-xl font-bold leading-none">?</span></span>
                <span className="text-xs font-semibold text-[#1E2326]">Tanpa status</span>
              </button>
            </div>
            <button disabled={deleting} onClick={() => void handleDelete()} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-xs font-semibold text-[#C62828] ring-1 ring-[#EAE6E0] disabled:opacity-50">
              <Trash2 className="size-3.5" /> Hapus pengingat ini
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
