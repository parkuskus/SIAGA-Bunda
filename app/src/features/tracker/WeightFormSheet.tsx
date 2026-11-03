import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"
import { getCurrentUserId } from "@/data/currentUser"
import { deleteWeightEntry, submitWeight, updateWeightEntry } from "@/features/tracker/weightForm"
import type { WeightEntry } from "@/data/db"

const todayStr = () => new Date().toISOString().slice(0, 10)
const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}
const INTS = Array.from({ length: 231 }, (_, i) => 20 + i)
const DECS = Array.from({ length: 10 }, (_, i) => i)

// S-07: bottom-sheet catat/ubah BB — tanggal, jam, timbangan kg (tanpa fitur premium)
export default function WeightFormSheet({
  bbPre,
  tbCm,
  ukMinggu,
  userId,
  initialKg,
  entry,
  onClose,
  onSaved,
  onDeleted,
}: {
  bbPre: number
  tbCm: number
  ukMinggu: number
  userId: string
  initialKg: number | null
  entry?: WeightEntry
  onClose: () => void
  onSaved: () => void
  onDeleted?: () => void
}) {
  const startKg = entry?.beratKg ?? initialKg ?? 60
  const startTanggal = entry?.tanggal ?? todayStr()
  const startJam = entry?.createdAt?.slice(11, 16) || nowTime()
  const [tanggal, setTanggal] = useState(startTanggal)
  const [jam, setJam] = useState(startJam)
  const [intPart, setIntPart] = useState(String(Math.floor(startKg)))
  const [decPart, setDecPart] = useState(String(Math.round((startKg % 1) * 10)))
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isEdit = !!entry

  const handleSave = async () => {
    setErr(null)
    const v = Number(intPart) + Number(decPart) / 10
    if (!tanggal) return setErr("Isi tanggal")
    if (tanggal > todayStr()) return setErr("Tanggal tidak boleh di masa depan")
    if (tanggal === todayStr() && jam > nowTime()) return setErr("Jam tidak boleh lewat dari sekarang")
    if (!v || v < 20 || v > 250) return setErr("Berat (kg) harus 20–250")
    setLoading(true)
    try {
      const uid = userId || (await getCurrentUserId())
      if (entry) {
        await updateWeightEntry(entry.id, { bbKg: Math.round(v * 10) / 10, tanggal, createdAt: `${tanggal}T${jam || "00:00"}` }, { userId: uid, bbPreKg: bbPre, tbCm, ukMinggu })
      } else {
        await submitWeight({
          userId: uid,
          bbKg: Math.round(v * 10) / 10,
          tanggal,
          bbPreKg: bbPre,
          tbCm,
          ukMinggu,
          createdAt: `${tanggal}T${jam || "00:00"}`,
        })
      }
      onSaved()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!entry) return
    if (!window.confirm("Hapus entri berat ini?")) return
    setLoading(true)
    try {
      const uid = userId || (await getCurrentUserId())
      await deleteWeightEntry(entry.id, { userId: uid, bbPreKg: bbPre, tbCm, ukMinggu })
      onDeleted?.()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Gagal menghapus")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px] rounded-t-[24px] bg-[#FFFCF6] p-5 pb-8 shadow-xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#EAE6E0]" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="!m-0 text-[18px] font-bold tracking-tight text-[#1E2326]">{isEdit ? "Ubah berat" : "Catat berat"}</h2>
          <button onClick={onClose} aria-label="Tutup" className="grid size-11 place-items-center rounded-full bg-white text-[#4A6E54] ring-1 ring-[#EAE6E0]">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tanggal</Label>
            <DateInput value={tanggal} max={todayStr()} onChange={setTanggal} aria-label="Tanggal" className="h-12 rounded-2xl bg-white px-4" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Jam</Label>
            <Input type="time" value={jam} max={tanggal === todayStr() ? nowTime() : undefined} onChange={(e) => setJam(e.target.value)} className="h-12 rounded-2xl bg-white px-4" />
          </div>
        </div>

        <div className="mt-4 flex items-stretch justify-center gap-2">
          <select value={intPart} onChange={(e) => setIntPart(e.target.value)} aria-label="Angka utuh berat (kg)" className="h-16 flex-1 rounded-2xl bg-white text-center text-[28px] font-extrabold text-[#1E2326] ring-1 ring-[#EAE6E0] focus:outline-none focus:ring-[#7AAE9A]">
            {INTS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="self-center text-[28px] font-extrabold text-[#1E2326]">.</span>
          <select value={decPart} onChange={(e) => setDecPart(e.target.value)} aria-label="Angka desimal berat (kg)" className="h-16 flex-1 rounded-2xl bg-white text-center text-[28px] font-extrabold text-[#1E2326] ring-1 ring-[#EAE6E0] focus:outline-none focus:ring-[#7AAE9A]">
            {DECS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="self-center text-sm font-semibold text-[#6C757D]">(kg)</span>
        </div>

        {err && <p className="mt-3 text-center text-xs text-[#E57373]">{err}</p>}

        <Button className="mt-4 w-full rounded-full bg-[#4A6E54] hover:bg-[#3D5C46] text-white py-6 text-sm font-semibold" disabled={loading} onClick={() => void handleSave()}>
          {loading ? "Menyimpan" : "Simpan"}
        </Button>
        {isEdit && (
          <Button variant="outline" className="mt-2 w-full rounded-full bg-white py-6 text-sm font-semibold text-[#C62828] ring-1 ring-[#EAE6E0]" disabled={loading} onClick={() => void handleDelete()}>
            Hapus entri
          </Button>
        )}
      </div>
    </div>
  )
}
