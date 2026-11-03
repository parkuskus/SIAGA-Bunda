import { useEffect, useState } from "react"
import { Activity } from "lucide-react"
import { ageFromProfile, ukFromProfile, useLatestScreeningDraft } from "@/features/skrining/useLatestScreeningDraft"
import { calcMAP, kategoriMAP } from "@/clinical-rules/mapCalculator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { submitPreeklamsia } from "@/features/skrining/ibu-hamil/preeklamsiaForm"
import SkriningFormShell from "@/features/skrining/components/SkriningFormShell"
import EmergencyOverlay from "@/shared/components/EmergencyOverlay"
import { kategoriTD } from "@/clinical-rules/mapCalculator"
import ScreeningValidationSheet, { ScreeningMarker } from "../components/ScreeningValidationSheet"
import useScreeningValidation from "../components/useScreeningValidation"
import { isOutsideReferenceRange, numericOrMissing } from "../components/screeningValidationUI"
import ReferenceHint from "../components/ReferenceHint"

type PECheck = "pe" | "ht" | "ginjal" | "dm" | "autoimun" | "keluarga"

function CheckRow({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex min-h-11 w-full items-center gap-3 rounded-[16px] px-3 text-left text-sm ring-1 transition-colors active:scale-[0.99] ${
        checked ? "bg-[#4A6E54] font-semibold text-white ring-[#4A6E54]" : "bg-white text-[#1D2B29] ring-[#D9E7E2] hover:bg-[#FFFCF6]"
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

function RadioRow({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-[16px] px-3 text-left text-sm ring-1 transition-colors active:scale-[0.99] ${
        selected ? "bg-[#4A6E54] font-semibold text-white ring-[#4A6E54]" : "bg-white text-[#1D2B29] ring-[#D9E7E2] hover:bg-[#FFFCF6]"
      }`}
    >
      <span className={`grid size-4 shrink-0 place-items-center rounded-full ring-1 ${selected ? "bg-white ring-white" : "bg-white ring-[#C2C8CB]"}`}>
        {selected && <span className="size-2 rounded-full bg-[#1E2326]" />}
      </span>
      <span className="leading-tight">{label}</span>
    </button>
  )
}

export default function PreeklamsiaScreen({ onBack, onSuccess }: { onBack: () => void; onSuccess: (r: Awaited<ReturnType<typeof submitPreeklamsia>>) => void }) {
  const { loading: draftLoading, userId, detail, profile } = useLatestScreeningDraft("preeklamsia")
  const [step, setStep] = useState<1 | 2>(1)
  const [sistolik, setSistolik] = useState("")
  const [diastolik, setDiastolik] = useState("")
  const [ukMinggu, setUkMinggu] = useState("")
  const [proteinuria, setProteinuria] = useState<boolean | null>(null)
  const [riwayat, setRiwayat] = useState<PECheck[]>([])
  const [gemeli, setGemeli] = useState(false)
  const [anakPertama, setAnakPertama] = useState(false)
  const [faktorDitinjau, setFaktorDitinjau] = useState(false)
  const [imtPre, setImtPre] = useState("")
  const [usia, setUsia] = useState("")
  const [jarak, setJarak] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const validation = useScreeningValidation("preeklamsia", {
    userId, sistolik: numericOrMissing(sistolik), diastolik: numericOrMissing(diastolik), ukMinggu: numericOrMissing(ukMinggu),
    usia: numericOrMissing(usia), imtPre: numericOrMissing(imtPre), jarakTahun: anakPertama ? undefined : numericOrMissing(jarak),
    proteinuria, riwayatPE: riwayat.includes("pe"), htKronik: riwayat.includes("ht"), ginjalKronik: riwayat.includes("ginjal"),
    diabetesMelitus: riwayat.includes("dm"), autoimun: riwayat.includes("autoimun"), riwayatKeluargaPE: riwayat.includes("keluarga"),
    kehamilanGanda: gemeli, nullipara: anakPertama, faktorDitinjau,
  }, { sistolik: "Sistolik (mmHg)", diastolik: "Diastolik (mmHg)", ukMinggu: "Usia kehamilan", usia: "Usia ibu", imtPre: "IMT sebelum hamil", jarakTahun: "Jarak kehamilan", proteinuria: "Protein urine", faktorDitinjau: "Riwayat dan kondisi kehamilan" })
  const tekananTerisi = sistolik.trim() !== "" && diastolik.trim() !== "" && Number.isFinite(Number(sistolik)) && Number.isFinite(Number(diastolik))
  const tekananMerah = (sistolik.trim() !== "" && Number(sistolik) >= 160) || (diastolik.trim() !== "" && Number(diastolik) >= 110)
  const partialRed = tekananMerah || (tekananTerisi && (kategoriMAP(calcMAP(Number(sistolik), Number(diastolik))) === "MERAH" || (proteinuria === true && Number(ukMinggu) >= 20 && ukMinggu.trim() !== "" && kategoriTD(Number(sistolik), Number(diastolik)) !== "HIJAU")))
  const { setOpen: setValidationOpen } = validation
  /* eslint-disable react-hooks/set-state-in-effect -- A computed red flag must immediately open emergency guidance. */
  useEffect(() => { if (partialRed) { setValidationOpen(false); setEmergencyOpen(true) } }, [partialRed, setValidationOpen])
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleRiwayat = (id: PECheck) => {
    setRiwayat((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  /* eslint-disable react-hooks/set-state-in-effect -- Restore fields from the saved screening or profile after Dexie loads. */
  useEffect(() => {
    if (draftLoading) return
    if (!detail) {
      setUsia(ageFromProfile(profile))
      setUkMinggu(ukFromProfile(profile))
      return
    }
    setSistolik(String(detail.sistolik ?? ""))
    setDiastolik(String(detail.diastolik ?? ""))
    setUkMinggu(String(detail.ukMinggu ?? ukFromProfile(profile)))
    setProteinuria(typeof detail.proteinuria === "boolean" ? detail.proteinuria : null)
    setUsia(String(detail.usia ?? ageFromProfile(profile)))
    setImtPre(detail.imtPre == null ? "" : String(detail.imtPre))
    setJarak(detail.jarakTahun == null ? "" : String(detail.jarakTahun))
    setRiwayat(([
      ["riwayatPE", "pe"], ["htKronik", "ht"], ["ginjalKronik", "ginjal"],
      ["diabetesMelitus", "dm"], ["autoimun", "autoimun"], ["riwayatKeluargaPE", "keluarga"],
    ] as const).filter(([field]) => detail[field] === true).map(([, key]) => key))
    setGemeli(detail.kehamilanGanda === true)
    setAnakPertama(detail.nullipara === true)
    setFaktorDitinjau(detail.validasiKelengkapan === 1 && detail.faktorDitinjau === true)
  }, [draftLoading, detail, profile])
  /* eslint-enable react-hooks/set-state-in-effect */

  const nextFrom1 = () => {
    setErr(null)
    if (!validation.check(["sistolik", "diastolik", "ukMinggu", "usia", "imtPre", "proteinuria"])) return
    setStep(2)
  }

  const handle = async () => {
    setErr(null)
    setFieldErrs({})
    if (!validation.check()) return
    setLoading(true)
    try {
      const res = await submitPreeklamsia({
        userId,
        sistolik: Number(sistolik),
        diastolik: Number(diastolik),
        ukMinggu: Number(ukMinggu),
        proteinuria: proteinuria === true,
        riwayatPE: riwayat.includes("pe"),
        htKronik: riwayat.includes("ht"),
        ginjalKronik: riwayat.includes("ginjal"),
        diabetesMelitus: riwayat.includes("dm"),
        autoimun: riwayat.includes("autoimun"),
        riwayatKeluargaPE: riwayat.includes("keluarga"),
        faktorDitinjau,
        kehamilanGanda: gemeli,
        nullipara: anakPertama,
        imtPre: imtPre ? Number(imtPre) : undefined,
        usia: usia ? Number(usia) : undefined,
        jarakTahun: !anakPertama && jarak ? Number(jarak) : undefined,
      })
      onSuccess(res)
    } catch (e: unknown) {
      const errObj = e as { errs?: Record<string, string>; message?: string }
      if (errObj.errs) setFieldErrs(errObj.errs)
      else setErr(errObj.message ?? "Gagal")
    } finally {
      setLoading(false)
    }
  }

  const pct = step === 1 ? 50 : 100
  const validBP = Number(sistolik) >= 70 && Number(sistolik) <= 250 && Number(diastolik) >= 40 && Number(diastolik) <= 150
  const map = validBP ? calcMAP(Number(sistolik), Number(diastolik)) : null
  const mapKat = map === null ? null : kategoriMAP(map)
  const back = () => step === 1 ? onBack() : setStep(1)

  return (
    <SkriningFormShell title="Preeklamsia" subtitle="Tekanan darah dan faktor risiko" onBack={back} illustration="/illu/illu-49-skrining-preeklamsia.webp" loading={draftLoading}>
      <div className="space-y-3.5">
        <div className="px-1">
          <div className="flex items-center justify-between text-xs text-[#33443F]">
            <span>Langkah {step} dari 2</span>
            <span className="font-semibold text-[#DB2777]">{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#FFE2E2]">
            <div className="h-full rounded-full bg-[#4A6E54] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-3.5">
            <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
              <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Tekanan Darah dan Data Kehamilan</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { key: "sistolik", label: "Sistolik (mmHg)", value: sistolik, set: setSistolik },
                  { key: "diastolik", label: "Diastolik (mmHg)", value: diastolik, set: setDiastolik },
                  { key: "ukMinggu", label: "Usia kehamilan (minggu)", value: ukMinggu, set: setUkMinggu },
                  { key: "usia", label: "Usia ibu (tahun)", value: usia, set: setUsia },
                  { key: "imtPre", label: "IMT pra-hamil", value: imtPre, set: setImtPre },
                  { key: "jarakTahun", label: "Jarak kehamilan sebelumnya (tahun)", value: jarak, set: setJarak },
                ].map((field) => (
                    <div key={field.key} data-screening-field={field.key} className="rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
                      <label className="block text-xs text-[#33443F]">{field.label}<ScreeningMarker id={`pe-${field.key}-error`} error={validation.errors[field.key]} /></label>
                      <Input type="number" aria-label={field.label} aria-invalid={!!validation.errors[field.key]} aria-describedby={validation.errors[field.key] ? `pe-${field.key}-error` : undefined} value={field.value} onChange={(event) => field.set(event.target.value)} className="h-auto border-0 bg-transparent p-0 text-base font-bold text-[#DB2777] shadow-none focus-visible:ring-0" />
                    {field.key === "sistolik" && <ReferenceHint text="Rentang acuan aman: di bawah 140 mmHg." warning={isOutsideReferenceRange(numericOrMissing(field.value), { max: 140, maxInclusive: false })} />}
                    {field.key === "diastolik" && <ReferenceHint text="Rentang acuan aman: di bawah 90 mmHg." warning={isOutsideReferenceRange(numericOrMissing(field.value), { max: 90, maxInclusive: false })} />}
                    {(field.label === "Usia kehamilan (minggu)" || field.label === "Usia ibu (tahun)") && <span className="text-[11px] text-[#33443F]">Otomatis dari profil</span>}
                  </div>
                ))}
              </div>
            </section>

            {map !== null && mapKat && (
              <section className="flex min-h-[72px] items-center gap-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
                <span className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-white text-[#4A6E54]"><Activity className="size-6" /></span>
                <div>
                  <p className="text-[13px] font-bold text-[#1D2B29]">MAP {map} (mmHg)</p>
                  <p className="text-xs text-[#33443F]">{mapKat === "HIJAU" ? "Normal" : mapKat === "KUNING" ? "Waspada" : "Risiko tinggi"}</p>
                </div>
              </section>
            )}

            <section role="group" aria-labelledby="pe-protein-label" aria-invalid={!!validation.errors.proteinuria} aria-describedby={validation.errors.proteinuria ? "pe-protein-error" : undefined} className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
              <h2 id="pe-protein-label" data-screening-field="proteinuria" className="!m-0 text-[13px] font-bold text-[#1D2B29]">Protein urine positif (dipstik)<ScreeningMarker id="pe-protein-error" error={validation.errors.proteinuria} /></h2>
              {[true, false].map((choice) => (
                <RadioRow key={String(choice)} selected={proteinuria === choice} label={choice ? "Ya" : "Tidak"} onClick={() => setProteinuria(choice)} />
              ))}
            </section>
          </div>
        ) : (
          <div className="space-y-3.5">
            <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
              <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Riwayat dan penyakit penyerta</h2>
              <CheckRow checked={riwayat.includes("pe")} label="Pernah preeklamsia sebelumnya" onToggle={() => toggleRiwayat("pe")} />
              <CheckRow checked={riwayat.includes("ht")} label="Hipertensi kronik" onToggle={() => toggleRiwayat("ht")} />
              <CheckRow checked={riwayat.includes("ginjal")} label="Penyakit ginjal" onToggle={() => toggleRiwayat("ginjal")} />
              <CheckRow checked={riwayat.includes("dm")} label="Diabetes melitus" onToggle={() => toggleRiwayat("dm")} />
              <CheckRow checked={riwayat.includes("autoimun")} label="Autoimun (APS/SLE)" onToggle={() => toggleRiwayat("autoimun")} />
              <CheckRow checked={riwayat.includes("keluarga")} label="Keluarga ada preeklamsia" onToggle={() => toggleRiwayat("keluarga")} />
            </section>
            <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
              <h2 className="!m-0 text-[13px] font-bold text-[#1D2B29]">Kondisi kehamilan ini</h2>
              <CheckRow checked={gemeli} label="Hamil kembar" onToggle={() => setGemeli((value) => !value)} />
              <CheckRow checked={anakPertama} label="Anak pertama (nullipara)" onToggle={() => setAnakPertama((value) => !value)} />
            </section>
             <label data-screening-field="faktorDitinjau" className="flex min-h-11 items-center gap-2 text-sm text-[#33443F]"><input type="checkbox" checked={faktorDitinjau} onChange={(event) => setFaktorDitinjau(event.target.checked)} />Saya sudah meninjau semua faktor di atas. Yang tidak dipilih berarti Tidak.<ScreeningMarker error={validation.errors.faktorDitinjau} /></label>
          </div>
        )}

        {Object.keys(fieldErrs).length > 0 && <p role="alert" className="text-center text-xs text-[#C62828]">{Object.values(fieldErrs)[0]}</p>}
        {err && <p role="alert" className="text-center text-xs text-[#C62828]">{err}</p>}
        <ScreeningValidationSheet issues={validation.issues} open={validation.open && !emergencyOpen} onOpenChange={validation.setOpen} onComplete={() => { const key = validation.issues[0]?.key; validation.setOpen(false); if (key && ["sistolik", "diastolik", "ukMinggu", "usia", "imtPre", "proteinuria", "jarakTahun"].includes(key)) setStep(1); validation.focus(key) }} />
        {partialRed && <button type="button" className="min-h-11 w-full rounded-xl bg-[#FDECEC] p-3 text-sm font-bold text-[#8E1F1F]" onClick={() => setEmergencyOpen(true)}>Tekanan darah atau tanda bahaya dilaporkan. Segera cari bantuan.</button>}
        {emergencyOpen && <div className="fixed inset-0 z-50"><EmergencyOverlay description="Tanda bahaya preeklamsia dilaporkan. Skrining belum lengkap. Segera periksa ke bidan atau IGD tanpa menunggu koneksi internet." mapsQuery="IGD atau Puskesmas terdekat" onShare={() => window.open(`https://wa.me/?text=${encodeURIComponent('Saya melaporkan tanda bahaya preeklamsia. Skrining SIAGA Bunda belum lengkap. Mohon bantuan segera.')}`, '_blank', 'noopener,noreferrer')} onDismiss={() => setEmergencyOpen(false)} /></div>}
        <div className="flex gap-2">
          {step === 1 ? (
            <>
              <Button variant="outline" className="min-h-[46px] flex-1 rounded-full border-[#D9E7E2] bg-white text-[#33443F]" onClick={onBack}>Batal</Button>
              <Button className="min-h-[46px] flex-1 rounded-full bg-[#4A6E54] font-bold text-white hover:bg-[#3D5C46]" onClick={nextFrom1}>Lanjut</Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="min-h-[46px] flex-1 rounded-full border-[#D9E7E2] bg-white text-[#33443F]" onClick={() => setStep(1)}>Kembali</Button>
              <Button className="min-h-[46px] flex-1 rounded-full bg-[#4A6E54] font-bold text-white hover:bg-[#3D5C46]" disabled={loading} onClick={handle}>
                {loading ? "Menyimpan" : "Lihat hasil"}
              </Button>
            </>
          )}
        </div>
      </div>
    </SkriningFormShell>
  )
}
