import { useEffect, useState } from "react"
import { useLatestScreeningDraft } from "@/features/skrining/useLatestScreeningDraft"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { submitNifas } from "@/features/skrining/nifas/nifasForm"
import SkriningFormShell from "@/features/skrining/components/SkriningFormShell"
import EmergencyOverlay from "@/shared/components/EmergencyOverlay"
import { warnaMEOWS } from "@/clinical-rules/meows"
import ScreeningValidationSheet, { ScreeningMarker } from "../components/ScreeningValidationSheet"
import useScreeningValidation from "../components/useScreeningValidation"
import { isOutsideReferenceRange, numericOrMissing } from "../components/screeningValidationUI"
import ReferenceHint from "../components/ReferenceHint"
import { db } from "@/data/db"
import { postpartumDayFromBirthDate } from "./postpartumDay"

type NifasResult = { kategori: "HIJAU" | "KUNING" | "MERAH"; warna: string; meows: string; faktorRisiko: string[]; faktorAman: string[] }

export default function NifasScreen({
  onBack,
  onSuccess,
}: {
  onBack: () => void
  onSuccess: (r: NifasResult) => void
}) {
  const { loading: draftLoading, userId, detail } = useLatestScreeningDraft("nifas")
  const [birthDate, setBirthDate] = useState<string | null>(null)
  const [form, setForm] = useState({
    hariKe: "",
    suhu: "",
    sistolik: "",
    diastolik: "",
    nadi: "",
    spo2: "",
    perdarahanMl: "",
    lochiaBau: false,
    nyeriUterus: false,
    lukaBengkak: false,
    nyeriSkala: "",
    produksiASI: null as "ada" | "sedikit" | "tidak" | null,
    mood: null as 1 | 2 | 3 | 4 | 5 | null,
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({})
  const [keluhanDitinjau, setKeluhanDitinjau] = useState(false)
  const [emergencyOpen, setEmergencyOpen] = useState(false)

  useEffect(() => {
    if (!userId) return
    void db.bblProfiles.get(userId).then((baby) => setBirthDate(baby?.dataLahir?.slice(0, 10) ?? null)).catch(() => setBirthDate(null))
  }, [userId])

  /* eslint-disable react-hooks/set-state-in-effect -- Apply the recorded baby birth date after the Dexie lookup resolves. */
  useEffect(() => {
    if (draftLoading || !birthDate || form.hariKe || detail?.hariKe != null) return
    const day = postpartumDayFromBirthDate(birthDate)
    if (day !== null) setForm((current) => current.hariKe ? current : { ...current, hariKe: String(day) })
  }, [birthDate, detail, draftLoading, form.hariKe])
  /* eslint-enable react-hooks/set-state-in-effect */
  const validation = useScreeningValidation("nifas", {
    userId, ...form, hariKe: numericOrMissing(form.hariKe), suhu: numericOrMissing(form.suhu),
    sistolik: numericOrMissing(form.sistolik), diastolik: numericOrMissing(form.diastolik),
    perdarahanMl: numericOrMissing(form.perdarahanMl), nyeriSkala: numericOrMissing(form.nyeriSkala),
    nadi: form.nadi.trim() ? numericOrMissing(form.nadi) : undefined,
    spo2: form.spo2.trim() ? numericOrMissing(form.spo2) : undefined, keluhanDitinjau,
  }, {
    hariKe: "Hari nifas", suhu: "Suhu tubuh", sistolik: "Sistolik", diastolik: "Diastolik",
    perdarahanMl: "Perdarahan", nyeriSkala: "Skala nyeri", produksiASI: "Produksi ASI", mood: "Suasana hati",
    keluhanDitinjau: "Keluhan nifas", nadi: "Nadi", spo2: "SpO2",
  })
  const vital = (value: string) => value.trim() && Number.isFinite(Number(value)) ? Number(value) : undefined
  const partialRed = warnaMEOWS({
    sistolik: vital(form.sistolik) ?? 120, diastolik: vital(form.diastolik) ?? 80,
    suhu: vital(form.suhu) ?? 37, nadi: vital(form.nadi), spo2: vital(form.spo2),
    perdarahanMl: vital(form.perdarahanMl),
    adaDemamNyeriUterus: (vital(form.suhu) ?? 0) > 38 && form.nyeriUterus && form.lochiaBau,
  }) === "MERAH"
  const { setOpen: setValidationOpen } = validation
  /* eslint-disable react-hooks/set-state-in-effect -- A computed red flag must immediately open emergency guidance. */
  useEffect(() => { if (partialRed) { setValidationOpen(false); setEmergencyOpen(true) } }, [partialRed, setValidationOpen])
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- Restore the user's saved postpartum screening draft after Dexie loads it. */
  useEffect(() => {
    if (!draftLoading && detail) {
      setKeluhanDitinjau(detail.validasiKelengkapan === 1 && detail.keluhanDitinjau === true)
      setForm((current) => ({
        ...current,
        hariKe: String(detail.hariKe ?? ""),
        suhu: String(detail.suhu ?? ""),
        sistolik: String(detail.sistolik ?? ""),
        diastolik: String(detail.diastolik ?? ""),
        nadi: detail.nadi == null ? "" : String(detail.nadi),
        spo2: detail.spo2 == null ? "" : String(detail.spo2),
        perdarahanMl: detail.perdarahanMl == null ? "" : String(detail.perdarahanMl),
        lochiaBau: detail.lochiaBau === true,
        nyeriUterus: detail.nyeriUterus === true,
        lukaBengkak: detail.lukaBengkak === true,
        nyeriSkala: detail.nyeriSkala == null ? "" : String(detail.nyeriSkala),
        produksiASI: detail.produksiASI === "ada" || detail.produksiASI === "sedikit" || detail.produksiASI === "tidak" ? detail.produksiASI : null,
        mood: typeof detail.mood === "number" && detail.mood >= 1 && detail.mood <= 5 ? detail.mood as 1 | 2 | 3 | 4 | 5 : null,
      }))
    }
  }, [draftLoading, detail])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handle = async () => {
    setErr(null)
    setFieldErrs({})
    if (!validation.check()) return
    setLoading(true)
    try {
      const res = await submitNifas({
        userId,
        hariKe: Number(form.hariKe),
        suhu: Number(form.suhu),
        sistolik: Number(form.sistolik),
        diastolik: Number(form.diastolik),
        nadi: form.nadi ? Number(form.nadi) : undefined,
        spo2: form.spo2 ? Number(form.spo2) : undefined,
        perdarahanMl: form.perdarahanMl ? Number(form.perdarahanMl) : undefined,
        lochiaBau: form.lochiaBau,
        nyeriUterus: form.nyeriUterus,
        lukaBengkak: form.lukaBengkak,
        nyeriSkala: form.nyeriSkala ? Number(form.nyeriSkala) : undefined,
        produksiASI: form.produksiASI!,
        mood: form.mood!,
        keluhanDitinjau,
      })
      onSuccess(res as NifasResult)
    } catch (e: unknown) {
      const errObj = e as { errs?: Record<string, string>; message?: string }
      if (errObj.errs) setFieldErrs(errObj.errs)
      else setErr(errObj.message ?? "Gagal menyimpan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SkriningFormShell title="Masa Nifas" subtitle="Cek kesehatan ibu setelah melahirkan" onBack={onBack} illustration="/illu/illu-52-skrining-nifas.webp" loading={draftLoading}>
      <div className="space-y-3.5">
        <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Pemantauan ibu</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { key: "hariKe", label: "Hari nifas (hari)", value: form.hariKe },
              { key: "suhu", label: "Suhu tubuh (°C)", value: form.suhu, step: "0.1" },
              { key: "sistolik", label: "Sistolik (mmHg)", value: form.sistolik },
              { key: "diastolik", label: "Diastolik (mmHg)", value: form.diastolik },
              { key: "nadi", label: "Nadi (kali per menit)", value: form.nadi },
              { key: "spo2", label: "SpO2 (%)", value: form.spo2 },
              { key: "perdarahanMl", label: "Perdarahan (mL)", value: form.perdarahanMl },
              { key: "nyeriSkala", label: "Skala nyeri (0–10)", value: form.nyeriSkala },
            ].map((field) => (
              <div key={field.key} data-screening-field={field.key} className="rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
                <label className="block text-xs text-[#33443F]">{field.label}<ScreeningMarker id={`nifas-${field.key}-error`} error={validation.errors[field.key]} /></label>
                <Input
                  type="number"
                  step={"step" in field ? field.step : undefined}
                  aria-label={field.label}
                  aria-invalid={!!validation.errors[field.key]}
                  aria-describedby={validation.errors[field.key] ? `nifas-${field.key}-error` : undefined}
                  value={field.value}
                  onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                  className="h-auto border-0 bg-transparent p-0 text-base font-bold text-[#DB2777] shadow-none focus-visible:ring-0"
                />
                {fieldErrs[field.key] && <p className="text-[11px] text-[#C62828]">{fieldErrs[field.key]}</p>}
                {field.key === "suhu" && <ReferenceHint text="Rentang acuan: 36,5–37,5 °C." warning={isOutsideReferenceRange(numericOrMissing(field.value), { min: 36.5, max: 37.5 })} />}
                {field.key === "sistolik" && <ReferenceHint text="Rentang acuan aman: di bawah 140 mmHg." warning={isOutsideReferenceRange(numericOrMissing(field.value), { max: 140, maxInclusive: false })} />}
                {field.key === "diastolik" && <ReferenceHint text="Rentang acuan aman: di bawah 90 mmHg." warning={isOutsideReferenceRange(numericOrMissing(field.value), { max: 90, maxInclusive: false })} />}
                {field.key === "nadi" && <ReferenceHint text="Rentang acuan: 60–100 kali per menit." warning={isOutsideReferenceRange(numericOrMissing(field.value), { min: 60, max: 100 })} />}
                {field.key === "spo2" && <ReferenceHint text="Rentang acuan: 95–100%." warning={isOutsideReferenceRange(numericOrMissing(field.value), { min: 95, max: 100 })} />}
                {field.key === "perdarahanMl" && <ReferenceHint text="Rentang acuan: kurang dari 500 mL." warning={isOutsideReferenceRange(numericOrMissing(field.value), { max: 500, maxInclusive: false })} />}
                {["nadi", "spo2"].includes(field.key) && <span className="text-[11px] text-[#6C757D]">Opsional</span>}
              </div>
            ))}
          </div>
        </section>

        <section role="group" aria-labelledby="nifas-asi-label" aria-invalid={!!validation.errors.produksiASI} aria-describedby={validation.errors.produksiASI ? "nifas-asi-error" : undefined} className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
           <h2 id="nifas-asi-label" data-screening-field="produksiASI" className="!m-0 text-sm font-bold text-[#1D2B29]">Produksi ASI<ScreeningMarker id="nifas-asi-error" error={validation.errors.produksiASI} /></h2>
          <div className="grid grid-cols-3 gap-2">
            {(["ada", "sedikit", "tidak"] as const).map((value) => (
                <button key={value} type="button" aria-pressed={form.produksiASI === value} onClick={() => setForm((current) => ({ ...current, produksiASI: value }))} className={`min-h-11 rounded-[14px] px-2 text-xs font-semibold transition-colors ${form.produksiASI === value ? "bg-[#4A6E54] text-white" : "bg-white text-[#33443F] ring-1 ring-[#D9E7E2]"}`}>
                {value === "ada" ? "Ada" : value === "sedikit" ? "Sedikit" : "Tidak ada"}
              </button>
            ))}
          </div>
        </section>

        <section role="group" aria-labelledby="nifas-mood-label" aria-invalid={!!validation.errors.mood} aria-describedby={validation.errors.mood ? "nifas-mood-error" : undefined} className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
           <h2 id="nifas-mood-label" data-screening-field="mood" className="!m-0 text-sm font-bold text-[#1D2B29]">Suasana hati hari ini<ScreeningMarker id="nifas-mood-error" error={validation.errors.mood} /></h2>
          <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" aria-label={`Suasana hati ${value}`} aria-pressed={form.mood === value} onClick={() => setForm((current) => ({ ...current, mood: value as 1 | 2 | 3 | 4 | 5 }))} className={`min-h-11 rounded-[14px] text-sm font-bold transition-colors ${form.mood === value ? "bg-[#4A6E54] text-white" : "bg-white text-[#33443F] ring-1 ring-[#D9E7E2]"}`}>
                {value}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-[#33443F]"><span>Sangat buruk</span><span>Sangat baik</span></div>
        </section>

        <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Keluhan lain</h2>
          {[
            { key: "lochiaBau", label: "Cairan nifas berbau tidak sedap" },
            { key: "nyeriUterus", label: "Nyeri tekan di perut bawah" },
            { key: "lukaBengkak", label: "Luka perineum atau bekas operasi bengkak atau bernanah" },
          ].map((item) => {
            const checked = form[item.key as keyof typeof form] as boolean
            return (
              <button key={item.key} type="button" aria-pressed={checked} onClick={() => setForm((current) => ({ ...current, [item.key]: !checked }))} className={`flex min-h-11 w-full items-center gap-3 rounded-[16px] px-3 text-left text-[13px] transition-colors ${checked ? "bg-[#4A6E54] font-semibold text-white" : "bg-white text-[#1D2B29] ring-1 ring-[#D9E7E2]"}`}>
                <span className={`grid size-5 shrink-0 place-items-center rounded-[6px] ring-1 ${checked ? "bg-white ring-white" : "bg-white ring-[#C2C8CB]"}`}>
                  {checked && <span className="size-2.5 rounded-[3px] bg-[#4A6E54]" />}
                </span>
                <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
              </button>
            )
          })}
        </section>

        {err && <p role="alert" className="text-center text-xs text-[#C62828]">{err}</p>}
        {partialRed && <button type="button" className="min-h-11 w-full rounded-xl bg-[#FDECEC] p-3 text-sm font-bold text-[#8E1F1F]" onClick={() => setEmergencyOpen(true)}>Tanda bahaya nifas terlapor. Cari bantuan meski formulir belum lengkap.</button>}
        {emergencyOpen && <div className="fixed inset-0 z-50"><EmergencyOverlay description="Tanda bahaya nifas dilaporkan. Skrining belum lengkap. Segera ke bidan atau IGD; jangan menunggu koneksi internet." mapsQuery="IGD atau Puskesmas terdekat" onShare={() => window.open(`https://wa.me/?text=${encodeURIComponent('Saya melaporkan tanda bahaya nifas. Skrining SIAGA Bunda belum lengkap. Mohon bantuan segera.')}`, '_blank', 'noopener,noreferrer')} onDismiss={() => setEmergencyOpen(false)} /></div>}
         <label data-screening-field="keluhanDitinjau" className="flex min-h-11 items-center gap-2 text-sm text-[#33443F]"><input type="checkbox" aria-invalid={!!validation.errors.keluhanDitinjau} checked={keluhanDitinjau} onChange={(event) => setKeluhanDitinjau(event.target.checked)} />Saya sudah meninjau keluhan di atas. Yang tidak dipilih berarti Tidak.<ScreeningMarker error={validation.errors.keluhanDitinjau} /></label>
         <ScreeningValidationSheet issues={validation.issues} open={validation.open && !emergencyOpen} onOpenChange={validation.setOpen} onComplete={() => { validation.setOpen(false); validation.focus(validation.issues[0]?.key) }} />
        <Button className="min-h-12 w-full rounded-full bg-[#4A6E54] text-base font-bold text-white hover:bg-[#3D5C46]" disabled={loading} onClick={handle}>
          {loading ? "Menyimpan" : "Lihat hasil"}
        </Button>
      </div>
    </SkriningFormShell>
  )
}
