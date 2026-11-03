import { useEffect, useState } from "react"
import { ukFromProfile, useLatestScreeningDraft } from "@/features/skrining/useLatestScreeningDraft"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import SkriningFormShell from "@/features/skrining/components/SkriningFormShell"
import { submitGizi } from "@/features/skrining/ibu-hamil/giziForm"
import ScreeningValidationSheet, { ScreeningMarker } from "../components/ScreeningValidationSheet"
import useScreeningValidation from "../components/useScreeningValidation"
import { isOutsideReferenceRange, numericOrMissing, weekFromSavedOrProfile } from "../components/screeningValidationUI"
import ReferenceHint from "../components/ReferenceHint"

type GiziResult = Awaited<ReturnType<typeof submitGizi>>

export default function GiziScreen({ onBack, onSuccess, onOpenProfile }: { onBack: () => void; onSuccess: (r: GiziResult) => void; onOpenProfile: () => void }) {
  const { loading: draftLoading, userId, detail, profile } = useLatestScreeningDraft("imt_lila")
  const [form, setForm] = useState({ bbPreKg: "", tbCm: "", lilaCm: "", bbSekarangKg: "", ukMinggu: "" })
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({})

  /* eslint-disable react-hooks/set-state-in-effect -- Restore the user's saved screening draft after Dexie loads it. */
  useEffect(() => {
    if (draftLoading) return
    if (detail) {
      setForm({
        bbPreKg: String(detail.bbPreKg ?? ""),
        tbCm: String(detail.tbCm ?? ""),
        lilaCm: String(detail.lilaCm ?? ""),
        bbSekarangKg: String(detail.bbSekarangKg ?? ""),
        ukMinggu: weekFromSavedOrProfile(detail.ukMinggu, ukFromProfile(profile)),
      })
      return
    }
    setForm((current) => ({ ...current, ukMinggu: ukFromProfile(profile) }))
  }, [draftLoading, detail, profile])
  /* eslint-enable react-hooks/set-state-in-effect */

  const bbPreKg = numericOrMissing(form.bbPreKg)
  const tbCm = numericOrMissing(form.tbCm)
  const bbSekarangKg = numericOrMissing(form.bbSekarangKg)
  const validation = useScreeningValidation("imt_lila", { userId, bbPreKg, tbCm, bbSekarangKg, lilaCm: numericOrMissing(form.lilaCm), ukMinggu: numericOrMissing(form.ukMinggu) }, {
    bbPreKg: "BB awal (kg)", tbCm: "Tinggi (cm)", lilaCm: "LILA (cm)", bbSekarangKg: "BB kini (kg)", ukMinggu: "Usia kehamilan dari HPHT di Profil",
  })

  const handle = async () => {
    setErr(null)
    setFieldErrs({})
    if (!validation.check()) return
    setLoading(true)
    try {
      const res = await submitGizi({ userId, bbPreKg, tbCm, lilaCm: numericOrMissing(form.lilaCm), bbSekarangKg, ukMinggu: numericOrMissing(form.ukMinggu) })
      onSuccess(res)
    } catch (e: unknown) {
      const err = e as { errs?: Record<string, string>; message?: string }
      if (err.errs) setFieldErrs(err.errs)
      else setErr(err.message ?? "Gagal menyimpan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SkriningFormShell title="Status Gizi" subtitle="IMT LILA dan BB" onBack={onBack} illustration="/illu/illu-47-skrining-gizi.webp" loading={draftLoading}>
      <div className="space-y-3.5">
        <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Pengukuran <ScreeningMarker error={validation.errors.ukMinggu} /></h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { key: "bbPreKg", label: "BB awal (kg)", value: form.bbPreKg },
              { key: "tbCm", label: "Tinggi (cm)", value: form.tbCm },
              { key: "lilaCm", label: "Lingkar Lengan Atas/LILA (cm)", value: form.lilaCm },
              { key: "bbSekarangKg", label: "BB kini (kg)", value: form.bbSekarangKg },
            ].map((field) => (
              <div key={field.key} data-screening-field={field.key} className="rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
                <label className="block text-xs text-[#33443F]">{field.label}<ScreeningMarker id={`gizi-${field.key}-error`} error={validation.errors[field.key]} /></label>
                <Input
                  type="number"
                  aria-label={field.label}
                  aria-invalid={!!validation.errors[field.key]}
                  aria-describedby={validation.errors[field.key] ? `gizi-${field.key}-error` : undefined}
                  value={field.value}
                  onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                  className="h-auto border-0 bg-transparent p-0 text-base font-bold text-[#DB2777] shadow-none focus-visible:ring-0"
                />
                {field.key === "lilaCm" && <ReferenceHint text="Rentang acuan normal ≥23,5 cm." warning={isOutsideReferenceRange(numericOrMissing(field.value), { min: 23.5 })} />}
                {fieldErrs[field.key] && <p className="text-[11px] text-[#C62828]">{fieldErrs[field.key]}</p>}
              </div>
            ))}
          </div>
        </section>

        {err && <p role="alert" className="text-center text-xs text-[#C62828]">{err}</p>}
        <ScreeningValidationSheet issues={validation.issues.map((issue) => issue.key === "ukMinggu" ? { ...issue, instruction: `${issue.instruction}. Isi HPHT di Profil untuk menghitung usia kehamilan` } : issue)} open={validation.open} onOpenChange={validation.setOpen} onComplete={() => {
          if (validation.issues[0]?.key === "ukMinggu") {
            if ([form.bbPreKg, form.tbCm, form.lilaCm, form.bbSekarangKg].some(Boolean) && !window.confirm("Isian skrining ini belum tersimpan. Buka Profil untuk mengisi HPHT?")) return
            validation.setOpen(false)
            onOpenProfile()
          } else { validation.setOpen(false); validation.focus(validation.issues[0]?.key) }
        }} />
        <Button className="min-h-12 w-full rounded-full bg-[#4A6E54] text-base font-bold text-white hover:bg-[#3D5C46]" disabled={loading} onClick={handle}>
          {loading ? "Menyimpan" : "Simpan hasil"}
        </Button>
      </div>
    </SkriningFormShell>
  )
}
