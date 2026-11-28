import { useState } from "react"
import { Baby, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"

export default function BirthDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (data: { tanggal: string; jam: string; bb: number; pb: number }) => Promise<void> | void
}) {
  const [tanggal, setTanggal] = useState("2026-08-30")
  const [jam, setJam] = useState("02:15")
  const [bb, setBb] = useState("3200")
  const [pb, setPb] = useState("49")
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const bbNum = Number(bb)
    const pbNum = Number(pb)
    if (!tanggal) return setErr("Tanggal lahir wajib diisi")
    if (bbNum < 1000 || bbNum > 6000) return setErr("Berat lahir (gram) harus 1.000–6.000")
    if (pbNum < 30 || pbNum > 60) return setErr("Panjang lahir (cm) harus 30–60")
    setErr(null)
    setSaving(true)
    try {
      await onSave({ tanggal, jam, bb: bbNum, pb: pbNum })
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Data bayi belum tersimpan. Coba lagi.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-24px)] max-w-[400px] gap-0 overflow-hidden rounded-[24px] border-0 bg-white p-0 ring-1 ring-black/10">
        <DialogHeader className="bg-[#EAF4F0] p-5 pb-3 text-left">
          <DialogTitle className="flex items-center gap-2 pr-8 text-[17px] font-bold leading-tight text-[#1D2B29]">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[#4A6E54]"><Baby className="size-[18px]" /></span>
            Sudah melahirkan
          </DialogTitle>
          <div className="mt-2 flex min-h-[96px] items-center gap-2">
            <DialogDescription className="min-w-0 flex-1 text-[13px] leading-relaxed text-[#33443F]">
              Isi tanggal dan data bayi agar kami dapat membuka cek nifas dan bayi.
            </DialogDescription>
            <img src="/illu/illu-09-dialog.webp" alt="Ibu memeluk bayi dengan hangat" className="h-[104px] w-[44%] shrink-0 object-contain object-center" />
          </div>
        </DialogHeader>
        <div className="space-y-3.5 p-5 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-[13px] font-medium text-[#33443F]">Tanggal lahir</Label>
              <DateInput value={tanggal} onChange={setTanggal} aria-label="Tanggal lahir, format tanggal bulan tahun" className="h-10 rounded-[14px] border-[#D9E7E2] bg-[#FFFEFC] px-3 text-sm text-[#33443F] focus-within:ring-2 focus-within:ring-[#7AAE9A]/40" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-[13px] font-medium text-[#33443F]">Jam lahir</Label>
              <Input type="time" value={jam} onChange={(e) => setJam(e.target.value)} className="h-10 rounded-[14px] border-[#D9E7E2] bg-[#FFFEFC] px-3 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-[13px] font-medium text-[#33443F]">Berat lahir (gram)</Label>
              <Input type="number" value={bb} onChange={(e) => setBb(e.target.value)} className="h-10 rounded-[14px] border-[#D9E7E2] bg-[#FFFEFC] px-3 text-sm" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-[13px] font-medium text-[#33443F]">Panjang lahir (cm)</Label>
              <Input type="number" value={pb} onChange={(e) => setPb(e.target.value)} className="h-10 rounded-[14px] border-[#D9E7E2] bg-[#FFFEFC] px-3 text-sm" />
            </div>
          </div>
          {err && <p className="text-xs text-[#E57373] text-center">{err}</p>}
        </div>
        <div className="flex gap-2.5 border-t border-[#E6EEEA] bg-white p-4">
          <Button variant="outline" disabled={saving} className="h-10 flex-1 rounded-full border-[#D9E7E2] bg-white text-[#33443F] hover:bg-[#F7FAF8]" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={saving} className="h-10 flex-1 gap-1.5 rounded-full bg-[#4A6E54] text-white hover:bg-[#3D5C46]" onClick={() => void handleSave()}>
            {saving ? "Menyimpan" : "Simpan"} <Check className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
