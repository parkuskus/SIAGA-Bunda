import { useEffect, useState } from "react"
import { useLatestScreeningDraft } from "@/features/skrining/useLatestScreeningDraft"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { submitLaktasi } from "@/features/skrining/nifas/laktasiForm"
import SkriningFormShell from "@/features/skrining/components/SkriningFormShell"
import ScreeningValidationSheet, { ScreeningMarker } from "../components/ScreeningValidationSheet"
import useScreeningValidation from "../components/useScreeningValidation"
import { isOutsideReferenceRange, numericOrMissing } from "../components/screeningValidationUI"
import ReferenceHint from "../components/ReferenceHint"

type Result = { warna: "HIJAU" | "KUNING" | "MERAH"; kategori: string; masalah?: string; faktorRisiko: string[]; faktorAman: string[] }

const choiceClass = (selected: boolean) => `min-h-11 rounded-[14px] px-2.5 text-xs font-semibold transition-colors ${selected ? "bg-[#4A6E54] text-white" : "bg-white text-[#33443F] ring-1 ring-[#D9E7E2]"}`

export default function LaktasiScreen({
  onBack,
  onSuccess,
}: {
  onBack: () => void
  onSuccess: (r: Result) => void
}) {
  const { loading: draftLoading, userId, detail } = useLatestScreeningDraft("laktasi")
  const [form, setForm] = useState({
    usiaBayiHari: "",
    frekuensiMenyusuPerHari: "",
    durasiMenyusuMenit: "",
    kondisiPuting: null as "normal" | "nyeri" | "luka" | "masuk" | null,
    kondisiPayudara: null as "normal" | "bengkak" | "keras" | "merah" | null,
    volumeASI: null as "cukup" | "sedikit" | "tidak ada" | null,
    bbBayiTren: null as "naik" | "stagnan" | "turun" | null,
    bakPerHari: "",
    urin: null as "jernih" | "kuning" | "gelap" | null,
    demam: null as boolean | null,
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const validation = useScreeningValidation("laktasi", {
    userId, ...form, usiaBayiHari: numericOrMissing(form.usiaBayiHari), frekuensiMenyusuPerHari: numericOrMissing(form.frekuensiMenyusuPerHari),
    bakPerHari: numericOrMissing(form.bakPerHari), durasiMenyusuMenit: form.durasiMenyusuMenit.trim() ? numericOrMissing(form.durasiMenyusuMenit) : undefined,
  }, {
    usiaBayiHari: "Usia bayi", frekuensiMenyusuPerHari: "Frekuensi menyusu", bakPerHari: "BAK bayi",
    durasiMenyusuMenit: "Durasi menyusu", kondisiPuting: "Kondisi puting", kondisiPayudara: "Kondisi payudara",
    volumeASI: "Volume ASI", bbBayiTren: "Perubahan berat bayi", urin: "Warna urin", demam: "Demam",
  })

  /* eslint-disable react-hooks/set-state-in-effect -- Restore the user's saved lactation screening draft after Dexie loads it. */
  useEffect(() => {
    if (!draftLoading && detail) {
      setForm({
        usiaBayiHari: String(detail.usiaBayiHari ?? ""),
        frekuensiMenyusuPerHari: String(detail.frekuensiMenyusuPerHari ?? ""),
        durasiMenyusuMenit: detail.durasiMenyusuMenit == null ? "" : String(detail.durasiMenyusuMenit),
        kondisiPuting: detail.kondisiPuting === "normal" || detail.kondisiPuting === "nyeri" || detail.kondisiPuting === "luka" || detail.kondisiPuting === "masuk" ? detail.kondisiPuting : null,
        kondisiPayudara: detail.kondisiPayudara === "normal" || detail.kondisiPayudara === "bengkak" || detail.kondisiPayudara === "keras" || detail.kondisiPayudara === "merah" ? detail.kondisiPayudara : null,
        volumeASI: detail.volumeASI === "cukup" || detail.volumeASI === "sedikit" || detail.volumeASI === "tidak ada" ? detail.volumeASI : null,
        bbBayiTren: detail.bbBayiTren === "naik" || detail.bbBayiTren === "stagnan" || detail.bbBayiTren === "turun" ? detail.bbBayiTren : null,
        bakPerHari: String(detail.bakPerHari ?? ""),
        urin: detail.urin === "jernih" || detail.urin === "kuning" || detail.urin === "gelap" ? detail.urin : null,
        demam: typeof detail.demam === "boolean" ? detail.demam : null,
      })
    }
  }, [draftLoading, detail])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handle = async () => {
    setErr(null)
    if (!validation.check()) return
    setLoading(true)
    try {
      const res = await submitLaktasi({
        userId,
        usiaBayiHari: Number(form.usiaBayiHari),
        frekuensiMenyusuPerHari: Number(form.frekuensiMenyusuPerHari),
        durasiMenyusuMenit: form.durasiMenyusuMenit ? Number(form.durasiMenyusuMenit) : undefined,
        kondisiPuting: form.kondisiPuting!,
        kondisiPayudara: form.kondisiPayudara!,
        volumeASI: form.volumeASI!,
        bbBayiTren: form.bbBayiTren!,
        bakPerHari: Number(form.bakPerHari),
        urin: form.urin!,
        demam: form.demam!,
      })
      onSuccess(res as Result)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SkriningFormShell title="Laktasi dan Menyusui" subtitle="Cek kecukupan ASI dan kondisi bayi" onBack={onBack} illustration="/illu/illu-53-skrining-laktasi.webp" loading={draftLoading}>
      <div className="space-y-3.5">
        <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Pola menyusu</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { key: "usiaBayiHari", label: "Usia bayi (hari)", value: form.usiaBayiHari },
              { key: "frekuensiMenyusuPerHari", label: "Menyusu (kali per hari)", value: form.frekuensiMenyusuPerHari },
              { key: "durasiMenyusuMenit", label: "Durasi per sesi (menit)", value: form.durasiMenyusuMenit },
              { key: "bakPerHari", label: "BAK bayi (kali per hari)", value: form.bakPerHari },
            ].map((field) => (
              <div key={field.key} data-screening-field={field.key} className="rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
                <label className="block text-xs text-[#33443F]">{field.label}<ScreeningMarker id={`laktasi-${field.key}-error`} error={validation.errors[field.key]} /></label>
                <Input type="number" aria-label={field.label} aria-invalid={!!validation.errors[field.key]} aria-describedby={validation.errors[field.key] ? `laktasi-${field.key}-error` : undefined} value={field.value} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} className="h-auto border-0 bg-transparent p-0 text-base font-bold text-[#DB2777] shadow-none focus-visible:ring-0" />
                {field.key === "frekuensiMenyusuPerHari" && <ReferenceHint text="Rentang acuan: 8–12 kali per 24 jam." warning={isOutsideReferenceRange(numericOrMissing(field.value), { min: 8, max: 12 })} />}
                {field.key === "bakPerHari" && <ReferenceHint text="Rentang acuan: lebih dari 5 kali per hari." warning={isOutsideReferenceRange(numericOrMissing(field.value), { min: 5, minInclusive: false })} />}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Kondisi ibu</h2>
          <div data-screening-field="demam" className="flex items-center justify-between gap-3 rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
            <p className="text-[13px] font-medium text-[#1D2B29]">Demam pada ibu<ScreeningMarker error={validation.errors.demam} /></p>
            <div className="flex gap-1.5">
              {[true, false].map((value) => (
                <button key={String(value)} type="button" aria-pressed={form.demam === value} onClick={() => setForm((current) => ({ ...current, demam: value }))} className={`min-h-11 min-w-11 rounded-[14px] px-2.5 text-xs font-semibold ${form.demam === value ? "bg-[#4A6E54] text-white" : "bg-white text-[#33443F] ring-1 ring-[#D9E7E2]"}`}>
                  {value ? "Ya" : "Tidak"}
                </button>
              ))}
            </div>
          </div>
          <div data-screening-field="kondisiPuting" className="space-y-1.5">
            <p className="text-xs font-medium text-[#33443F]">Kondisi puting<ScreeningMarker error={validation.errors.kondisiPuting} /></p>
            <div className="grid grid-cols-2 gap-2">
              {(["normal", "nyeri", "luka", "masuk"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={form.kondisiPuting === value} onClick={() => setForm((current) => ({ ...current, kondisiPuting: value }))} className={choiceClass(form.kondisiPuting === value)}>
                  {value === "normal" ? "Normal" : value === "nyeri" ? "Nyeri" : value === "luka" ? "Luka" : "Masuk"}
                </button>
              ))}
            </div>
          </div>
          <div data-screening-field="kondisiPayudara" className="space-y-1.5">
            <p className="text-xs font-medium text-[#33443F]">Kondisi payudara<ScreeningMarker error={validation.errors.kondisiPayudara} /></p>
            <div className="grid grid-cols-2 gap-2">
              {(["normal", "bengkak", "keras", "merah"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={form.kondisiPayudara === value} onClick={() => setForm((current) => ({ ...current, kondisiPayudara: value }))} className={choiceClass(form.kondisiPayudara === value)}>
                  {value === "normal" ? "Normal" : value === "bengkak" ? "Bengkak" : value === "keras" ? "Keras" : "Merah"}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Kecukupan ASI</h2>
          <div data-screening-field="volumeASI" className="space-y-1.5">
            <p className="text-xs font-medium text-[#33443F]">Volume ASI<ScreeningMarker error={validation.errors.volumeASI} /></p>
            <div className="grid grid-cols-3 gap-2">
              {(["cukup", "sedikit", "tidak ada"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={form.volumeASI === value} onClick={() => setForm((current) => ({ ...current, volumeASI: value }))} className={choiceClass(form.volumeASI === value)}>
                  {value === "cukup" ? "Cukup" : value === "sedikit" ? "Sedikit" : "Tidak ada"}
                </button>
              ))}
            </div>
          </div>
          <div data-screening-field="bbBayiTren" className="space-y-1.5">
            <p className="text-xs font-medium text-[#33443F]">Tren berat bayi<ScreeningMarker error={validation.errors.bbBayiTren} /></p>
            <div className="grid grid-cols-3 gap-2">
              {(["naik", "stagnan", "turun"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={form.bbBayiTren === value} onClick={() => setForm((current) => ({ ...current, bbBayiTren: value }))} className={choiceClass(form.bbBayiTren === value)}>
                  {value === "naik" ? "Naik" : value === "stagnan" ? "Tetap" : "Turun"}
                </button>
              ))}
            </div>
          </div>
          <div data-screening-field="urin" className="space-y-1.5">
            <p className="text-xs font-medium text-[#33443F]">Warna urin bayi<ScreeningMarker error={validation.errors.urin} /></p>
            <div className="grid grid-cols-3 gap-2">
              {(["jernih", "kuning", "gelap"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={form.urin === value} onClick={() => setForm((current) => ({ ...current, urin: value }))} className={choiceClass(form.urin === value)}>
                  {value === "jernih" ? "Jernih" : value === "kuning" ? "Kuning" : "Gelap pekat"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {err && <p role="alert" className="text-center text-xs text-[#C62828]">{err}</p>}
        <ScreeningValidationSheet issues={validation.issues} open={validation.open} onOpenChange={validation.setOpen} onComplete={() => { validation.setOpen(false); validation.focus(validation.issues[0]?.key) }} />
        <Button className="min-h-12 w-full rounded-full bg-[#4A6E54] text-base font-bold text-white hover:bg-[#3D5C46]" disabled={loading} onClick={handle}>
          {loading ? "Menyimpan" : "Lihat hasil"}
        </Button>
      </div>
    </SkriningFormShell>
  )
}
