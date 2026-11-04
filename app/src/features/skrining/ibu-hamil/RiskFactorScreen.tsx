import { useEffect, useState } from "react"
import { ageFromProfile, ukFromProfile, useLatestScreeningDraft } from "@/features/skrining/useLatestScreeningDraft"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { submitRiskFactor } from "@/features/skrining/ibu-hamil/riskFactorForm"
import SkriningFormShell from "@/features/skrining/components/SkriningFormShell"
import ScreeningValidationSheet, { ScreeningMarker } from "../components/ScreeningValidationSheet"
import useScreeningValidation from "../components/useScreeningValidation"
import { isOutsideReferenceRange, numericOrMissing, type ScreeningIssue } from "../components/screeningValidationUI"
import ReferenceHint from "../components/ReferenceHint"

type Result = { skor: number; kategori: string; warna: string; faktorRisiko: string[]; faktorAman: string[] }

type Paritas = "primi" | "multi" | "grande" | null
type Jarak = "lt2" | "gte2" | "belum" | null

function RadioRow({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-[16px] px-3 text-left text-sm ring-1 transition-colors active:scale-[0.99] ${
        selected ? "bg-[#4A6E54] font-semibold text-white ring-[#4A6E54]" : "bg-white text-[#1E2326] ring-[#EAE6E0] hover:bg-[#FFFCF6]"
      }`}
    >
      <span className={`grid size-4 shrink-0 place-items-center rounded-full ring-1 ${selected ? "bg-white ring-white" : "bg-white ring-[#C2C8CB]"}`}>
        {selected && <span className="size-2 rounded-full bg-[#1E2326]" />}
      </span>
      <span className="leading-tight">{label}</span>
    </button>
  )
}

function CheckRow({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex min-h-11 w-full items-center gap-3 rounded-[16px] px-3 text-left text-sm ring-1 transition-colors active:scale-[0.99] ${
        checked ? "bg-[#4A6E54] font-semibold text-white ring-[#4A6E54]" : "bg-white text-[#1E2326] ring-[#EAE6E0] hover:bg-[#FFFCF6]"
      }`}
    >
      <span className={`grid size-4 shrink-0 place-items-center rounded-[5px] ring-1 ${checked ? "bg-white ring-white" : "bg-white ring-[#C2C8CB]"}`}>
        {checked && (
          <svg viewBox="0 0 10 8" className="size-2.5 fill-none stroke-[#1E2326] stroke-2">
            <path d="M1 4l2.5 2.5L9 1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="leading-tight">{label}</span>
    </button>
  )
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex shrink-0 gap-1.5">
      {[true, false].map((choice) => (
        <button
          key={String(choice)}
          type="button"
          aria-pressed={value === choice}
          onClick={() => onChange(choice)}
          className={`min-h-11 min-w-11 rounded-[14px] px-2.5 text-xs font-semibold transition-colors ${value === choice ? "bg-[#4A6E54] text-white" : "bg-white text-[#33443F] ring-1 ring-[#D9E7E2]"}`}
        >
          {choice ? "Ya" : "Tidak"}
        </button>
      ))}
    </div>
  )
}

export default function RiskFactorScreen({
  onBack,
  onSuccess,
}: {
  onBack: () => void
  onSuccess: (r: Result) => void
}) {
  const { loading: draftLoading, userId, detail, profile } = useLatestScreeningDraft("poedji_rochjati")
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [usia, setUsia] = useState("")
  const [ukMinggu, setUkMinggu] = useState("")
  const [paritas, setParitas] = useState<Paritas>(null)
  const [jarak, setJarak] = useState<Jarak>(null)
  const [kompl, setKompl] = useState<string[]>([])
  const [kronik, setKronik] = useState<string[]>([])
  const [riwayatPE, setRiwayatPE] = useState<boolean | null>(null)
  const [sistolik, setSistolik] = useState("")
  const [diastolik, setDiastolik] = useState("")
  const [tbCm, setTbCm] = useState("")
  const [bbPreKg, setBbPreKg] = useState("")
  const [gemeli, setGemeli] = useState<boolean | null>(null)
  const [trb, setTrb] = useState<boolean | null>(null)
  const [letak, setLetak] = useState<boolean | null>(null)
  const [hidramnion, setHidramnion] = useState<boolean | null>(null)
  const [legacyAnswersIncomplete, setLegacyAnswersIncomplete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({})
  const [stageIssues, setStageIssues] = useState<ScreeningIssue[]>([])
  const [stageOpen, setStageOpen] = useState(false)
  const [stageAttempted, setStageAttempted] = useState(false)
  const [specialAttempted, setSpecialAttempted] = useState(false)

  const input = {
    userId, usia: numericOrMissing(usia), ukMinggu: numericOrMissing(ukMinggu), paritas: paritas === "primi" ? 0 : paritas === "grande" ? 4 : paritas === "multi" ? 1 : NaN,
    jarakTahun: jarak === "lt2" ? 1 : jarak === "gte2" ? 3 : undefined,
    sistolik: sistolik.trim() ? numericOrMissing(sistolik) : undefined, diastolik: diastolik.trim() ? numericOrMissing(diastolik) : undefined,
    tbCm: tbCm.trim() ? numericOrMissing(tbCm) : undefined, bbPreKg: bbPreKg.trim() ? numericOrMissing(bbPreKg) : undefined,
    trb: trb === true, riwayatKomplikasi: kompl.some((x) => ["perdarahan", "prematur", "lainnya", "sc"].includes(x)),
    riwayatSC: kompl.includes("sc"), riwayatPE: riwayatPE === true, penyakitKronik: kronik.some((x) => x !== "tidak"),
    kehamilanGanda: gemeli === true, hidramnion: hidramnion === true, kelainanLetak: letak === true,
    jawabanForm: { paritas, jarak, riwayatKomplikasi: kompl, penyakitKronik: kronik, gemeli, trb, letak, hidramnion },
  }
  const validation = useScreeningValidation("poedji_rochjati", input, {
    usia: "Usia ibu", ukMinggu: "Usia kehamilan", paritas: "Status paritas", jarakTahun: "Jarak kehamilan",
    jawabanForm: "Riwayat dan kondisi kehamilan", sistolik: "Sistolik", diastolik: "Diastolik", tbCm: "Tinggi badan", bbPreKg: "BB sebelum hamil",
  }, {
    paritas: "Pilih Hamil pertama, Hamil ke 2 sampai 3, atau Hamil ke 4 atau lebih",
    jarakTahun: "Pilih Kurang dari 2, 2 atau lebih, atau Belum pernah hamil sebelumnya",
  })
  const stage2Errors = stageAttempted ? { kompl: !kompl.length, kronik: !kronik.length } : { kompl: false, kronik: false }

  /* eslint-disable react-hooks/set-state-in-effect -- Restore fields from the saved screening or profile after Dexie loads. */
  useEffect(() => {
    if (draftLoading) return
    if (!detail) {
      setUsia(ageFromProfile(profile))
      setUkMinggu(ukFromProfile(profile))
      return
    }
    setUsia(String(detail.usia ?? ageFromProfile(profile)))
    setUkMinggu(String(detail.ukMinggu ?? ukFromProfile(profile)))
    setSistolik(detail.sistolik == null ? "" : String(detail.sistolik))
    setDiastolik(detail.diastolik == null ? "" : String(detail.diastolik))
    setTbCm(detail.tbCm == null ? "" : String(detail.tbCm))
    setBbPreKg(detail.bbPreKg == null && detail.bbKg == null ? "" : String(detail.bbPreKg ?? detail.bbKg))
    setRiwayatPE(typeof detail.riwayatPE === "boolean" ? detail.riwayatPE : null)
    const saved = detail.jawabanForm as { paritas?: string; jarak?: string; riwayatKomplikasi?: string[]; penyakitKronik?: string[]; gemeli?: boolean | null; trb?: boolean | null; letak?: boolean | null; hidramnion?: boolean | null } | undefined
    if (saved) {
      setParitas(saved.paritas === "primi" || saved.paritas === "multi" || saved.paritas === "grande" ? saved.paritas : null)
      setJarak(saved.jarak === "lt2" || saved.jarak === "gte2" || saved.jarak === "belum" ? saved.jarak : null)
      setKompl(saved.riwayatKomplikasi ?? [])
      setKronik(saved.penyakitKronik ?? [])
      setGemeli(saved.gemeli ?? null)
      setTrb(saved.trb ?? null)
      setLetak(saved.letak ?? null)
      setHidramnion(saved.hidramnion ?? null)
    } else {
      const parity = Number(detail.paritas)
      setParitas(Number.isFinite(parity) ? parity === 0 ? "primi" : parity >= 4 ? "grande" : "multi" : null)
      setJarak(detail.jarakTahun === undefined ? null : Number(detail.jarakTahun) < 2 ? "lt2" : "gte2")
      setKompl(detail.riwayatSC === true ? ["sc"] : detail.riwayatKomplikasi === true ? ["lainnya"] : [])
      setKronik([])
      setGemeli(typeof detail.kehamilanGanda === "boolean" ? detail.kehamilanGanda : null)
      setTrb(typeof detail.trb === "boolean" ? detail.trb : null)
      setLetak(typeof detail.kelainanLetak === "boolean" ? detail.kelainanLetak : null)
      setHidramnion(typeof detail.hidramnion === "boolean" ? detail.hidramnion : null)
      setLegacyAnswersIncomplete(true)
    }
  }, [draftLoading, detail, profile])
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleKompl = (id: string) => {
    if (id === "pe") setRiwayatPE((value) => value === true ? false : true)
    if (id === "tidak") setRiwayatPE(false)
    setKompl((prev) => {
      if (id === "tidak") return prev.includes("tidak") ? [] : ["tidak"]
      const withoutTidak = prev.filter((x) => x !== "tidak")
      return withoutTidak.includes(id) ? withoutTidak.filter((x) => x !== id) : [...withoutTidak, id]
    })
  }

  const toggleKronik = (id: string) => {
    setKronik((prev) => {
      if (id === "tidak") return prev.includes("tidak") ? [] : ["tidak"]
      const withoutTidak = prev.filter((x) => x !== "tidak")
      return withoutTidak.includes(id) ? withoutTidak.filter((x) => x !== id) : [...withoutTidak, id]
    })
  }

  const setPE = (v: boolean) => {
    setRiwayatPE(v)
    setKompl((prev) => {
      const withoutTidak = prev.filter((x) => x !== "tidak" && x !== "pe")
      return v ? [...withoutTidak] .concat("pe") : withoutTidak
    })
  }

  const nextFrom1 = () => {
    setError(null)
    if (!validation.check(["usia", "ukMinggu", "paritas", "jarakTahun"])) return
    setStep(2)
  }

  const nextFrom2 = () => {
    setError(null)
    setStageAttempted(true)
    const issues = [
      !kompl.length && { key: "kompl", label: "Riwayat komplikasi", instruction: "Pilih riwayat yang dialami atau Tidak ada" },
      !kronik.length && { key: "kronik", label: "Penyakit kronik", instruction: "Pilih penyakit yang dialami atau Tidak ada" },
    ].filter(Boolean) as ScreeningIssue[]
    if (issues.length) { setStageIssues(issues); setStageOpen(true); return }
    setStep(3)
  }

  const handleSubmit = async () => {
    setError(null)
    setFieldErrs({})
    if (!kompl.length || !kronik.length) {
      setStageAttempted(true)
      setStageIssues([
        ...(!kompl.length ? [{ key: "kompl", label: "Riwayat komplikasi", instruction: "Pilih riwayat yang dialami atau Tidak ada" }] : []),
        ...(!kronik.length ? [{ key: "kronik", label: "Penyakit kronik", instruction: "Pilih penyakit yang dialami atau Tidak ada" }] : []),
      ])
      setStageOpen(true)
      return
    }
    setSpecialAttempted(true)
    const specials = [
      ["riwayatPE", "Preeklamsia lalu", riwayatPE], ["gemeli", "Hamil kembar", gemeli],
      ["trb", "Teknik reproduksi berbantu", trb], ["letak", "Bayi sungsang", letak], ["hidramnion", "Ketuban banyak", hidramnion],
    ].filter(([, , value]) => value === null).map(([key, label]) => ({ key: String(key), label: String(label), instruction: "Pilih Ya atau Tidak" }))
    if (specials.length) { setStageIssues(specials); setStageOpen(true); return }
    if (!validation.check()) return
    setSubmitting(true)
    try {
      const res = await submitRiskFactor(input)
      onSuccess(res)
    } catch (e: unknown) {
      const err = e as { errs?: Record<string, string>; message?: string }
      if (err.errs) setFieldErrs(err.errs)
      else setError(err.message ?? "Gagal menyimpan")
    } finally {
      setSubmitting(false)
    }
  }

  const pct = step === 1 ? 33 : step === 2 ? 67 : 100
  const back = () => step === 1 ? onBack() : setStep((step - 1) as 1 | 2 | 3)

  return (
    <SkriningFormShell title="Faktor Risiko" subtitle="Skor Poedji Rochjati" onBack={back} illustration="/illu/illu-46-skrining-risiko.webp" loading={draftLoading}>
      <div className="space-y-3.5">
        {legacyAnswersIncomplete && <p className="rounded-[14px] bg-[#FFF1E8] p-3 text-xs text-[#704500]">Sebagian jawaban skrining sebelumnya belum tersimpan rinci. Periksa kembali isian sebelum menyimpan.</p>}
        <div className="px-1">
          <div className="flex items-center justify-between text-xs text-[#33443F]">
            <span>Langkah {step} dari 3</span>
            <span className="font-semibold text-[#DB2777]">{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#FFE2E2]">
            <div className="h-full rounded-full bg-[#4A6E54] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {step === 1 && (
          <section className="space-y-3.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
            <h2 className="text-sm font-bold text-[#1D2B29]">Data Kehamilan</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
                 <label className="block text-xs text-[#33443F]">Usia ibu (tahun)<ScreeningMarker id="risk-usia-error" error={validation.errors.usia} /></label>
                <div className="flex items-center gap-1">
                   <Input type="number" data-screening-field="usia" aria-label="Usia ibu (tahun)" aria-invalid={!!validation.errors.usia} aria-describedby={validation.errors.usia ? "risk-usia-error" : undefined} value={usia} onChange={(e) => setUsia(e.target.value)} className="h-auto border-0 bg-transparent p-0 text-base font-bold text-[#DB2777] shadow-none focus-visible:ring-0" />
                </div>
              </div>
              <div className="rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
                 <label className="block text-xs text-[#33443F]">Usia kehamilan (minggu)<ScreeningMarker id="risk-uk-error" error={validation.errors.ukMinggu} /></label>
                <div className="flex items-center gap-1">
                   <Input type="number" data-screening-field="ukMinggu" aria-label="Usia kehamilan (minggu)" aria-invalid={!!validation.errors.ukMinggu} aria-describedby={validation.errors.ukMinggu ? "risk-uk-error" : undefined} value={ukMinggu} onChange={(e) => setUkMinggu(e.target.value)} className="h-auto border-0 bg-transparent p-0 text-base font-bold text-[#DB2777] shadow-none focus-visible:ring-0" />
                </div>
              </div>
            </div>

             <div data-screening-field="paritas" className="space-y-2.5">
               <p className="text-[13px] font-bold text-[#1D2B29]">Status Paritas<ScreeningMarker error={validation.errors.paritas} /></p>
              <RadioRow selected={paritas === "primi"} label="Hamil pertama" onClick={() => setParitas("primi")} />
              <RadioRow selected={paritas === "multi"} label="Hamil ke 2 sampai 3" onClick={() => setParitas("multi")} />
              <RadioRow selected={paritas === "grande"} label="Hamil ke 4 atau lebih" onClick={() => setParitas("grande")} />
            </div>

             <div data-screening-field="jarakTahun" className="space-y-2.5">
               <p className="text-[13px] font-bold text-[#1D2B29]">Jarak kehamilan terakhir (tahun)<ScreeningMarker error={validation.errors.jarakTahun} /></p>
              <RadioRow selected={jarak === "lt2"} label="Kurang dari 2" onClick={() => setJarak("lt2")} />
              <RadioRow selected={jarak === "gte2"} label="2 atau lebih" onClick={() => setJarak("gte2")} />
              <RadioRow selected={jarak === "belum"} label="Belum pernah hamil sebelumnya" onClick={() => setJarak("belum")} />
            </div>
          </section>
        )}

        {step === 2 && (
          <div className="space-y-3.5">
             <section data-screening-field="kompl" className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
               <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Riwayat Komplikasi<ScreeningMarker error={stage2Errors.kompl ? "Pilih riwayat atau Tidak ada" : undefined} /></h2>
              <CheckRow checked={kompl.includes("tidak")} label="Tidak ada" onToggle={() => toggleKompl("tidak")} />
              <CheckRow checked={kompl.includes("perdarahan")} label="Perdarahan hamil lalu" onToggle={() => toggleKompl("perdarahan")} />
              <CheckRow checked={kompl.includes("pe")} label="Preeklamsia lalu" onToggle={() => toggleKompl("pe")} />
              <CheckRow checked={kompl.includes("prematur")} label="Lahir prematur" onToggle={() => toggleKompl("prematur")} />
              <CheckRow checked={kompl.includes("sc")} label="Operasi caesar" onToggle={() => toggleKompl("sc")} />
              <CheckRow checked={kompl.includes("lainnya")} label="Komplikasi obstetri lainnya" onToggle={() => toggleKompl("lainnya")} />
            </section>
             <section data-screening-field="kronik" className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
               <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Penyakit Kronik<ScreeningMarker error={stage2Errors.kronik ? "Pilih penyakit atau Tidak ada" : undefined} /></h2>
              <div className="grid grid-cols-6 gap-2">
                <button type="button" onClick={() => toggleKronik("tidak")} className={`col-span-3 min-h-11 rounded-[14px] px-2 text-xs font-semibold ${kronik.includes("tidak") ? "bg-[#4A6E54] text-white" : "bg-white text-[#33443F] ring-1 ring-[#D9E7E2]"}`}>Tidak ada</button>
                <button type="button" onClick={() => toggleKronik("hipertensi")} className={`col-span-3 min-h-11 rounded-[14px] px-2 text-xs font-semibold ${kronik.includes("hipertensi") ? "bg-[#4A6E54] text-white" : "bg-white text-[#33443F] ring-1 ring-[#D9E7E2]"}`}>Hipertensi</button>
                {[["dm", "Diabetes"], ["jantung", "Jantung"], ["ginjal", "Ginjal"]].map(([key, label]) => (
                  <button key={key} type="button" onClick={() => toggleKronik(key)} className={`col-span-2 min-h-11 rounded-[14px] px-2 text-xs font-semibold ${kronik.includes(key) ? "bg-[#4A6E54] text-white" : "bg-white text-[#33443F] ring-1 ring-[#D9E7E2]"}`}>{label}</button>
                ))}
              </div>
            </section>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3.5">
            <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
              <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Pemeriksaan Fisik</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Sistolik (mmHg)", value: sistolik, set: setSistolik, key: "sistolik" },
                  { label: "Diastolik (mmHg)", value: diastolik, set: setDiastolik, key: "diastolik" },
                  { label: "Tinggi (cm)", value: tbCm, set: setTbCm, key: "tbCm" },
                  { label: "BB sebelum hamil (kg)", value: bbPreKg, set: setBbPreKg, key: "bbPreKg" },
                ].map((field) => (
                   <div key={field.key} data-screening-field={field.key} className="rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
                     <label className="block text-xs text-[#33443F]">{field.label}<ScreeningMarker id={`risk-${field.key}-error`} error={validation.errors[field.key]} /></label>
                     <div className="flex items-center gap-1">
                        <Input type="number" aria-label={field.label} aria-invalid={!!validation.errors[field.key]} aria-describedby={validation.errors[field.key] ? `risk-${field.key}-error` : undefined} value={field.value} onChange={(e) => field.set(e.target.value)} className="h-auto border-0 bg-transparent p-0 text-base font-bold text-[#DB2777] shadow-none focus-visible:ring-0" />
                     </div>
                     {field.key === "sistolik" && <ReferenceHint text="Rentang acuan aman: di bawah 140 mmHg." warning={isOutsideReferenceRange(numericOrMissing(field.value), { max: 140, maxInclusive: false })} />}
                     {field.key === "diastolik" && <ReferenceHint text="Rentang acuan aman: di bawah 90 mmHg." warning={isOutsideReferenceRange(numericOrMissing(field.value), { max: 90, maxInclusive: false })} />}
                     {fieldErrs[field.key] && <p className="text-[11px] text-[#E57373]">{fieldErrs[field.key]}</p>}
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
               <h2 data-screening-field="jawabanForm" className="!m-0 text-sm font-bold text-[#1D2B29]">Kondisi khusus<ScreeningMarker error={validation.errors.jawabanForm} /></h2>
              {[
                 { key: "riwayatPE", label: "Preeklamsia lalu", value: riwayatPE, set: setPE },
                 { key: "gemeli", label: "Hamil kembar", value: gemeli, set: setGemeli },
                 { key: "trb", label: "Teknik reproduksi berbantu", value: trb, set: setTrb },
                 { key: "letak", label: "Bayi sungsang", value: letak, set: setLetak },
                 { key: "hidramnion", label: "Ketuban banyak", value: hidramnion, set: setHidramnion },
              ].map((item) => (
                 <div key={item.key} data-screening-field={item.key} className="flex min-h-11 items-center justify-between gap-2">
                   <span className="min-w-0 text-xs text-[#33443F]">{item.label}<ScreeningMarker error={specialAttempted && item.value === null ? "Pilih Ya atau Tidak" : undefined} /></span>
                  <YesNo value={item.value} onChange={item.set} />
                </div>
              ))}
            </section>
          </div>
        )}

        {error && <p role="alert" className="text-center text-xs text-[#C62828]">{error}</p>}
         <ScreeningValidationSheet issues={stageOpen ? stageIssues : validation.issues} open={stageOpen || validation.open} onOpenChange={(open) => { setStageOpen(open); validation.setOpen(open) }} onComplete={() => { const key = (stageOpen ? stageIssues : validation.issues)[0]?.key; setStageOpen(false); validation.setOpen(false); if (key && ["usia", "ukMinggu", "paritas", "jarakTahun"].includes(key)) setStep(1); else if (key === "kompl" || key === "kronik" || key === "jawabanForm") setStep(2); validation.focus(key === "jawabanForm" ? "kompl" : key) }} />
        <div className="mt-1 flex gap-2">
          {step > 1 && <Button variant="outline" className="min-h-[46px] flex-1 rounded-full border-[#D9E7E2] bg-white text-[#33443F]" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>Kembali</Button>}
          {step === 1 && <Button variant="outline" className="min-h-[46px] flex-1 rounded-full border-[#D9E7E2] bg-white text-[#33443F]" onClick={onBack}>Batal</Button>}
          {step < 3 ? (
              <Button className="min-h-[46px] flex-1 rounded-full bg-[#4A6E54] font-bold text-white hover:bg-[#3D5C46]" onClick={step === 1 ? nextFrom1 : nextFrom2}>
              Lanjut
            </Button>
          ) : (
            <Button className="min-h-[46px] flex-1 rounded-full bg-[#4A6E54] font-bold text-white hover:bg-[#3D5C46]" disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Menyimpan" : "Lihat hasil"}
            </Button>
          )}
        </div>
      </div>
    </SkriningFormShell>
  )
}
