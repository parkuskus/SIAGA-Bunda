import { useState } from "react"
import { ChevronDown, ChevronLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"
import { getCurrentUserId } from "@/data/currentUser"
import { upsertSupplement } from "@/features/tracker/supplementForm"

const BENTUK = ["Tablet", "Kapsul", "Sendok teh", "Sendok makan", "Tetes", "Supositoria", "Semprot", "Sachet"]
const DOSIS_UNIT = ["Tablet", "Kapsul", "Sendok teh", "Sendok makan", "Tetes", "Supositoria", "Semprot", "Puf", "Ampul", "Sachet", "Pesarium", "Butir"]
const FREK = [
  { v: "harian1", l: "1 kali sehari" },
  { v: "harian2", l: "2 kali sehari" },
  { v: "harian3", l: "3 kali sehari" },
  { v: "mingguan", l: "Hari tertentu tiap minggu" },
]
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
const HARI_HURUF = ["S", "S", "S", "R", "K", "J", "S"]

function ringkasHari(hari: number[]): string {
  if (hari.length === 7) return "Setiap hari"
  if (!hari.length) return "Belum dipilih"
  return `Setiap ${[...hari].sort((a, b) => a - b).map((i) => HARI[i]).join(", ")}`
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[#1D2B29]/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px] rounded-t-[28px] bg-[#FFFCF6] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold text-[#1D2B29]">{title}</p>
          <button onClick={onClose} aria-label="Tutup" className="grid size-11 place-items-center rounded-full bg-white text-[#4A6E54] ring-1 ring-[#D9E7E2]">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const todayStr = () => new Date().toISOString().slice(0, 10)
const plusDays = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function MedForm({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [nama, setNama] = useState("")
  const [bentuk, setBentuk] = useState("Tablet")
  const [mulai, setMulai] = useState(todayStr())
  const [selesai, setSelesai] = useState(plusDays(30))
  const [jumlah, setJumlah] = useState("30")
  const [dosis, setDosis] = useState("Tablet")
  const [frek, setFrek] = useState("harian1")
  const [hari, setHari] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [times, setTimes] = useState<string[]>(["19:00"])
  const [sheet, setSheet] = useState<"bentuk" | "frek" | "dosis" | "hari" | null>(null)
  const [hariTmp, setHariTmp] = useState<number[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const setFrekCount = (v: string) => {
    setFrek(v)
    const n = v === "harian2" ? 2 : v === "harian3" ? 3 : 1
    setTimes((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? "19:00"))
    if (v === "mingguan" && !hari.length) setHari([0, 1, 2, 3, 4, 5, 6])
    setSheet(null)
  }

  const handleDone = async () => {
    setErr(null)
    if (!nama.trim()) return setErr("Isi nama obat")
    if (!mulai || !selesai) return setErr("Isi tanggal mulai dan selesai")
    if (mulai > selesai) return setErr("Tanggal selesai sebelum mulai")
    if (times.some((t) => !t)) return setErr("Isi semua jam minum")
    if (frek === "mingguan" && !hari.length) return setErr("Pilih minimal 1 hari")
    setLoading(true)
    try {
      await upsertSupplement({
        id: `m-${Date.now()}`,
        userId: await getCurrentUserId(),
        namaSuplemen: nama,
        waktu: times[0],
        statusAktif: true,
        bentuk,
        dosis,
        jumlah: jumlah ? Number(jumlah) : undefined,
        tanggalMulai: mulai,
        tanggalSelesai: selesai,
        frekuensi: frek,
        hari: frek === "mingguan" ? hari : undefined,
        waktuList: times,
      })
      onDone()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan")
    } finally {
      setLoading(false)
    }
  }

  const frekLabel = FREK.find((f) => f.v === frek)?.l ?? frek

  return (
    <div className="-mx-4 -mt-5">
      <header className="rounded-b-[32px] bg-[#4A6E54] px-6 pb-6 pt-[max(1.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-[#4A6E54] transition-transform active:scale-95">
            <ChevronLeft className="size-5" />
          </button>
          <div>
            <h1 className="!m-0 text-lg font-bold leading-tight">Tambah Obat</h1>
            <p className="mt-0.5 text-xs text-white/90">Atur jadwal suplemen Bunda</p>
          </div>
        </div>
      </header>

      <div className="space-y-3.5 px-4 pb-6 pt-5">
        <section className="space-y-3 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Informasi obat</h2>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#33443F]">Nama obat</Label>
            <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama obat" className="h-11 rounded-[14px] border-[#D9E7E2] bg-white px-3 placeholder:text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#33443F]">Bentuk sediaan</Label>
            <button type="button" onClick={() => setSheet("bentuk")} className="flex min-h-11 w-full items-center justify-between rounded-[14px] bg-white px-3 text-left ring-1 ring-[#D9E7E2]">
              <span className="text-sm font-medium text-[#1D2B29]">{bentuk}</span><ChevronDown className="size-4 text-[#536961]" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#33443F]">Kuantitas</Label>
              <Input type="number" value={jumlah} onChange={(e) => setJumlah(e.target.value)} className="h-11 rounded-[14px] border-[#D9E7E2] bg-white px-3" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#33443F]">Dosis</Label>
              <button type="button" onClick={() => setSheet("dosis")} className="flex min-h-11 w-full items-center justify-between rounded-[14px] bg-white px-3 text-left ring-1 ring-[#D9E7E2]">
                <span className="text-sm font-medium text-[#1D2B29]">{dosis || "Pilih dosis"}</span><ChevronDown className="size-4 text-[#536961]" />
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Jadwal konsumsi</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs font-medium text-[#33443F]">Tanggal mulai</Label>
              <DateInput value={mulai} onChange={setMulai} aria-label="Tanggal mulai" className="h-11 rounded-[14px] border-[#D9E7E2] bg-white px-3 text-sm text-[#33443F]" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs font-medium text-[#33443F]">Tanggal selesai</Label>
              <DateInput value={selesai} onChange={setSelesai} aria-label="Tanggal selesai" className="h-11 rounded-[14px] border-[#D9E7E2] bg-white px-3 text-sm text-[#33443F]" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#33443F]">Frekuensi</Label>
            <button type="button" onClick={() => setSheet("frek")} className="flex min-h-11 w-full items-center justify-between rounded-[14px] bg-white px-3 text-left ring-1 ring-[#D9E7E2]">
              <span className="text-sm font-medium text-[#1D2B29]">{frekLabel}</span><ChevronDown className="size-4 text-[#536961]" />
            </button>
          </div>
          {frek === "mingguan" && (
            <button type="button" onClick={() => { setHariTmp(hari); setSheet("hari") }} className="flex min-h-11 w-full items-center justify-between rounded-[14px] bg-white px-3 text-left ring-1 ring-[#D9E7E2]">
              <span className="text-sm font-medium text-[#1D2B29]">Hari minum</span><span className="flex items-center gap-1 text-xs font-semibold text-[#4A6E54]">{ringkasHari(hari)} <ChevronDown className="size-4" /></span>
            </button>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#33443F]">Jam minum</Label>
            {times.map((time, index) => (
              <Input key={index} type="time" aria-label={`Jam minum ${index + 1}`} value={time} onChange={(e) => setTimes((previous) => previous.map((value, i) => i === index ? e.target.value : value))} className="h-11 rounded-[14px] border-[#D9E7E2] bg-white px-3" />
            ))}
          </div>
        </section>

        {err && <p role="alert" className="text-center text-xs text-[#C62828]">{err}</p>}
        <Button className="min-h-12 w-full rounded-full bg-[#4A6E54] text-base font-bold text-white hover:bg-[#3D5C46]" disabled={loading} onClick={() => void handleDone()}>
          {loading ? "Menyimpan" : "Simpan pengingat"}
        </Button>
      </div>

      {sheet === "bentuk" && (
        <Sheet title="Bentuk sediaan" onClose={() => setSheet(null)}>
          <div className="space-y-1">
            {BENTUK.map((b) => (
              <button key={b} onClick={() => { setBentuk(b); setSheet(null) }} className={`min-h-11 w-full rounded-[16px] px-3 text-left text-sm ring-1 transition-colors ${bentuk === b ? "bg-[#4A6E54] font-semibold text-white ring-[#4A6E54]" : "bg-white text-[#1D2B29] ring-[#D9E7E2]"}`}>
                {b}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === "frek" && (
        <Sheet title="Frekuensi" onClose={() => setSheet(null)}>
          <div className="space-y-1">
            {FREK.map((f) => (
              <button key={f.v} onClick={() => setFrekCount(f.v)} className={`min-h-11 w-full rounded-[16px] px-3 text-left text-sm ring-1 transition-colors ${frek === f.v ? "bg-[#4A6E54] font-semibold text-white ring-[#4A6E54]" : "bg-white text-[#1D2B29] ring-[#D9E7E2]"}`}>
                {f.l}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === "dosis" && (
        <Sheet title="Dosis" onClose={() => setSheet(null)}>
          <div className="max-h-[50vh] space-y-1 overflow-y-auto">
            {DOSIS_UNIT.map((u) => (
              <button key={u} onClick={() => { setDosis(u); setSheet(null) }} className={`min-h-11 w-full rounded-[14px] px-3 text-left text-sm transition-colors ${dosis === u ? "bg-[#4A6E54] font-semibold text-white" : "text-[#1D2B29] hover:bg-[#EAF4F0]"}`}>
                {u}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === "hari" && (
        <Sheet title="Pilih Hari" onClose={() => setSheet(null)}>
          <p className="text-sm text-[#33443F]">Hari tertentu tiap minggu</p>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {HARI.map((h, i) => (
              <button
                key={h}
                type="button"
                onClick={() => setHariTmp((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))}
                className={`min-h-11 rounded-[14px] text-sm font-semibold ring-1 transition-colors ${hariTmp.includes(i) ? "bg-[#4A6E54] text-white ring-[#4A6E54]" : "bg-white text-[#1D2B29] ring-[#D9E7E2]"}`}
              >
                {HARI_HURUF[i]}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-[#33443F]">{ringkasHari(hariTmp)}</p>
          <Button className="mt-4 min-h-12 w-full rounded-full bg-[#4A6E54] text-sm font-bold text-white hover:bg-[#3D5C46]" onClick={() => { setHari(hariTmp); setSheet(null) }}>
            Selesai
          </Button>
        </Sheet>
      )}
    </div>
  )
}
