import { useEffect, useState } from "react"
import { Baby, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"
import { validateBabyProfile } from "@/features/skrining/bblProfiles"

export type BabyProfileInput = {
  nama: string
  dataLahir: string
  beratLahirGr: number
  panjangLahirCm: number
}

export default function BabyProfileDialog({
  open,
  onOpenChange,
  defaultLabel,
  defaultDate,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultLabel: string
  defaultDate: string
  onSave: (input: BabyProfileInput) => Promise<void> | void
}) {
  const [nama, setNama] = useState(defaultLabel)
  const [dataLahir, setDataLahir] = useState(defaultDate)
  const [berat, setBerat] = useState("")
  const [panjang, setPanjang] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setNama(defaultLabel)
    setDataLahir(defaultDate)
    setBerat("")
    setPanjang("")
    setError(null)
  }, [open, defaultLabel, defaultDate])

  const save = async () => {
    const beratLahirGr = Number(berat)
    const panjangLahirCm = Number(panjang)
    const validationError = validateBabyProfile({ nama, dataLahir, beratLahirGr, panjangLahirCm })
    if (validationError) return setError(validationError)
    setError(null)
    setSaving(true)
    try {
      await onSave({ nama: nama.trim(), dataLahir, beratLahirGr, panjangLahirCm })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Data belum tersimpan di perangkat. Coba lagi.")
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
            Tambah data bayi
          </DialogTitle>
          <DialogDescription className="mt-2 text-[13px] leading-relaxed text-[#33443F]">Data ini disimpan terpisah agar hasil skrining setiap bayi tidak tertukar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3.5 p-5 pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-baby-name" className="text-[13px] font-medium text-[#33443F]">Nama atau panggilan</Label>
            <Input id="new-baby-name" value={nama} onChange={(event) => setNama(event.target.value)} className="h-11 rounded-[14px] border-[#D9E7E2]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-[#33443F]">Tanggal lahir</Label>
            <DateInput value={dataLahir} onChange={setDataLahir} aria-label="Tanggal lahir bayi" className="h-11 rounded-[14px] border-[#D9E7E2]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-baby-weight" className="text-[13px] font-medium text-[#33443F]">Berat lahir (gram)</Label>
              <Input id="new-baby-weight" type="number" min={1} step={1} value={berat} onChange={(event) => setBerat(event.target.value)} className="h-11 rounded-[14px] border-[#D9E7E2]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-baby-length" className="text-[13px] font-medium text-[#33443F]">Panjang lahir (cm)</Label>
              <Input id="new-baby-length" type="number" min={0.1} step={0.1} value={panjang} onChange={(event) => setPanjang(event.target.value)} className="h-11 rounded-[14px] border-[#D9E7E2]" />
            </div>
          </div>
          {error && <p role="alert" className="text-center text-xs text-[#C62828]">{error}</p>}
        </div>
        <div className="flex gap-2.5 border-t border-[#E6EEEA] bg-white p-4">
          <Button variant="outline" disabled={saving} className="min-h-11 flex-1 rounded-full border-[#D9E7E2] bg-white text-[#33443F]" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={saving} className="min-h-11 flex-1 gap-1.5 rounded-full bg-[#4A6E54] text-white hover:bg-[#3D5C46]" onClick={() => void save()}>{saving ? "Menyimpan" : "Simpan"} <Check className="size-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
