import { useEffect, useState } from "react"
import { ageFromProfile, ukFromProfile, useLatestScreeningDraft } from "@/features/skrining/useLatestScreeningDraft"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { submitDMG } from "@/features/skrining/ibu-hamil/dmgForm"
import SkriningFormShell from "@/features/skrining/components/SkriningFormShell"
import { calcIMT } from "@/clinical-rules/imtLila"
import ScreeningValidationSheet, { ScreeningMarker } from "../components/ScreeningValidationSheet"
import useScreeningValidation from "../components/useScreeningValidation"
import { numericOrMissing } from "../components/screeningValidationUI"

export default function DmgScreen({ onBack, onSuccess }: { onBack: () => void; onSuccess: (r: Awaited<ReturnType<typeof submitDMG>>) => void }) {
  const { loading: draftLoading, userId, detail, profile } = useLatestScreeningDraft("dmg")
  const [form, setForm] = useState({ usia: "", bbPreKg: "", tbCm: "", ukMinggu: "", riwayatDMG: false, riwayatMakrosomia: false, riwayatDMKeluarga: false, glikosuria: null as boolean | null, pcos: false, etnisRisiko: false })
  const [faktorDitinjau, setFaktorDitinjau] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect -- Restore the user's saved screening draft after Dexie loads it. */
  useEffect(() => {
    if (draftLoading) return
    if (detail) {
      setForm({
        usia: String(detail.usia ?? ""),
        bbPreKg: String(detail.bbPreKg ?? ""),
        tbCm: String(detail.tbCm ?? ""),
        ukMinggu: String(detail.ukMinggu ?? ""),
        riwayatDMG: detail.riwayatDMG === true,
        riwayatMakrosomia: detail.riwayatMakrosomia === true,
        riwayatDMKeluarga: detail.riwayatDMKeluarga === true,
        glikosuria: typeof detail.glikosuria === "boolean" && detail.validasiKelengkapan === 1 ? detail.glikosuria : null,
        pcos: detail.pcos === true,
        etnisRisiko: detail.etnisRisiko === true,
      })
      setFaktorDitinjau(detail.validasiKelengkapan === 1 && detail.faktorDitinjau === true)
      return
    }
    setForm((current) => ({ ...current, usia: ageFromProfile(profile), ukMinggu: ukFromProfile(profile) }))
  }, [draftLoading, detail, profile])
  /* eslint-enable react-hooks/set-state-in-effect */

  const bbPreKg = Number(form.bbPreKg)
  const tbCm = Number(form.tbCm)
  const validUkuran = Number.isFinite(bbPreKg) && bbPreKg > 0 && Number.isFinite(tbCm) && tbCm > 0
  const imtPre = validUkuran ? calcIMT(bbPreKg, tbCm) : null
  const validation = useScreeningValidation("dmg", {
    userId, ...form, usia: numericOrMissing(form.usia), bbPreKg: numericOrMissing(form.bbPreKg), tbCm: numericOrMissing(form.tbCm),
    ukMinggu: numericOrMissing(form.ukMinggu), imtPre, faktorDitinjau,
  }, { usia: "Usia ibu", bbPreKg: "BB sebelum hamil", tbCm: "Tinggi badan", ukMinggu: "Usia kehamilan", imtPre: "BB dan tinggi badan untuk IMT", glikosuria: "Gula dalam urine", faktorDitinjau: "Faktor risiko" })

  const handle = async () => {
    setError(null)
    if (!validation.check()) return
    setLoading(true)
    try {
      const res = await submitDMG({ userId, usia: Number(form.usia), bbPreKg, tbCm, imtPre: imtPre!, ukMinggu: Number(form.ukMinggu), riwayatDMG: form.riwayatDMG, riwayatMakrosomia: form.riwayatMakrosomia, riwayatDMKeluarga: form.riwayatDMKeluarga, glikosuria: form.glikosuria === true, pcos: form.pcos, etnisRisiko: form.etnisRisiko, faktorDitinjau })
      onSuccess(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SkriningFormShell title="Diabetes Kehamilan" subtitle="Skrining risiko gula darah" onBack={onBack} illustration="/illu/illu-50-skrining-dmg.webp" loading={draftLoading}>
      <div className="space-y-3.5">
        <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Data Ibu</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { key: "usia", label: "Usia (tahun)", value: form.usia },
              { key: "bbPreKg", label: "BB sebelum hamil (kg)", value: form.bbPreKg },
              { key: "tbCm", label: "Tinggi badan (cm)", value: form.tbCm },
              { key: "ukMinggu", label: "Usia kehamilan (minggu)", value: form.ukMinggu },
            ].map((field) => {
              const fieldError = validation.errors[field.key] ?? ((field.key === "bbPreKg" || field.key === "tbCm") ? validation.errors.imtPre : undefined)
              return (
              <div key={field.key} data-screening-field={field.key} className="rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
               <label className="block text-xs text-[#33443F]">{field.label}<ScreeningMarker id={`dmg-${field.key}-error`} error={fieldError} /></label>
               <Input type="number" step="any" aria-label={field.label} aria-invalid={!!fieldError} aria-describedby={fieldError ? `dmg-${field.key}-error` : undefined} value={field.value} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} className="h-auto border-0 bg-transparent p-0 text-base font-bold text-[#DB2777] shadow-none focus-visible:ring-0" />
              </div>
              )
            })}
            <div data-screening-field="imtPre" className="rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
              <label htmlFor="dmg-imt-pre" className="block text-xs text-[#33443F]">IMT sebelum hamil<ScreeningMarker error={validation.errors.imtPre} /></label>
              <Input id="dmg-imt-pre" type="text" readOnly value={imtPre === null ? "" : imtPre.toFixed(1)} placeholder="Terisi otomatis" className="h-auto border-0 bg-transparent p-0 text-base font-bold text-[#4A6E54] shadow-none placeholder:text-[#536961] focus-visible:ring-0" />
            </div>
          </div>
        </section>

        <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Faktor Risiko</h2>
          {[
            { key: "riwayatDMG", label: "Pernah diabetes saat hamil sebelumnya" },
            { key: "riwayatMakrosomia", label: "Riwayat melahirkan bayi besar (makrosomia, lebih dari 4 kg)" },
            { key: "riwayatDMKeluarga", label: "Riwayat keluarga ada diabetes" },
            { key: "pcos", label: "Riwayat PCOS (polisistik ovarium)" },
            { key: "etnisRisiko", label: "Etnis berisiko tinggi (Asia/Afrika)" },
          ].map((item) => {
            const checked = form[item.key as keyof typeof form] as boolean
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={checked}
                onClick={() => setForm((current) => ({ ...current, [item.key]: !checked }))}
                className={`flex min-h-11 w-full items-center gap-3 rounded-[16px] px-3 text-left text-[13px] transition-colors ${checked ? "bg-[#4A6E54] font-semibold text-white" : "bg-white text-[#1D2B29] ring-1 ring-[#D9E7E2]"}`}
              >
                <span className={`grid size-5 shrink-0 place-items-center rounded-[6px] ring-1 ${checked ? "bg-white ring-white" : "bg-white ring-[#C2C8CB]"}`}>
                  {checked && <span className="size-2.5 rounded-[3px] bg-[#4A6E54]" />}
                </span>
                <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
              </button>
            )
          })}
          <div data-screening-field="glikosuria" className="rounded-[16px] bg-white p-3 text-sm text-[#33443F]"><p>Gula dalam pemeriksaan urine (glikosuria)<ScreeningMarker error={validation.errors.glikosuria} /></p><div className="mt-2 flex gap-2">{[true, false].map((value) => <button key={String(value)} type="button" aria-pressed={form.glikosuria === value} aria-invalid={!!validation.errors.glikosuria} onClick={() => setForm((current) => ({ ...current, glikosuria: value }))} className={`min-h-11 flex-1 rounded-[14px] px-3 ${form.glikosuria === value ? "bg-[#4A6E54] text-white" : "bg-[#EAF4F0] text-[#33443F]"}`}>{value ? "Ya" : "Tidak"}</button>)}</div><p className="mt-2 text-xs">Belum diperiksa? Lengkapi pemeriksaan sebelum melihat hasil.</p></div>
          <label data-screening-field="faktorDitinjau" className="flex min-h-11 items-center gap-2 text-sm text-[#33443F]"><input type="checkbox" aria-invalid={!!validation.errors.faktorDitinjau} checked={faktorDitinjau} onChange={(event) => setFaktorDitinjau(event.target.checked)} />Saya sudah meninjau seluruh faktor risiko. Yang tidak dipilih berarti Tidak.<ScreeningMarker error={validation.errors.faktorDitinjau} /></label>
        </section>

        {error && <p role="alert" className="text-center text-xs text-[#C62828]">{error}</p>}
        <ScreeningValidationSheet issues={validation.issues.map((issue) => issue.key === "imtPre" ? { ...issue, instruction: `${issue.instruction}. Periksa BB sebelum hamil dan tinggi badan yang diisikan` } : issue)} open={validation.open} onOpenChange={validation.setOpen} onComplete={() => { validation.setOpen(false); validation.focus(validation.issues[0]?.key === "imtPre" ? "bbPreKg" : validation.issues[0]?.key) }} />
        <Button className="min-h-12 w-full rounded-full bg-[#4A6E54] text-base font-bold text-white hover:bg-[#3D5C46]" disabled={loading} onClick={handle}>
          {loading ? "Menyimpan" : "Lihat hasil"}
        </Button>
      </div>
    </SkriningFormShell>
  )
}
