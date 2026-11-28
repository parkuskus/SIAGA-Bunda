import { useEffect, useState } from "react"
import { useLatestScreeningDraft } from "@/features/skrining/useLatestScreeningDraft"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { submitIkterus } from "@/features/skrining/bbl/ikterusForm"
import SkriningFormShell from "@/features/skrining/components/SkriningFormShell"
import EmergencyOverlay from "@/shared/components/EmergencyOverlay"
import { kategoriKramer } from "@/clinical-rules/kramerZone"
import ScreeningValidationSheet, { ScreeningMarker } from "../components/ScreeningValidationSheet"
import useScreeningValidation from "../components/useScreeningValidation"
import { numericOrMissing } from "../components/screeningValidationUI"

type Result = { status: string; kategori: "HIJAU" | "KUNING" | "MERAH"; warna: string; faktorRisiko: string[]; faktorAman: string[] }

const choiceClass = (selected: boolean) => `min-h-11 rounded-[14px] px-2.5 text-xs font-semibold transition-colors ${selected ? "bg-[#4A6E54] text-white" : "bg-white text-[#33443F] ring-1 ring-[#D9E7E2]"}`

export default function IkterusScreen({
  onBack,
  onSuccess,
  babyId,
}: {
  onBack: () => void
  onSuccess: (r: Result) => void
  babyId: string
}) {
  const { loading: draftLoading, userId, detail } = useLatestScreeningDraft("ikterus", false, babyId)
  const [form, setForm] = useState({
    usiaBayiHari: "",
    zona: null as 1 | 2 | 3 | 4 | 5 | null,
    onsetJam: "",
    fesesDempul: false,
    aktivitas: null as "aktif" | "mengantuk" | "tidak mau minum" | null,
    prematur: false,
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [gejalaDitinjau, setGejalaDitinjau] = useState(false)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const validation = useScreeningValidation("ikterus", {
    userId, ...form, usiaBayiHari: numericOrMissing(form.usiaBayiHari), onsetJam: numericOrMissing(form.onsetJam), gejalaDitinjau,
  }, { usiaBayiHari: "Usia bayi", onsetJam: "Usia saat kuning muncul", zona: "Zona Kramer", aktivitas: "Aktivitas bayi", gejalaDitinjau: "Feses dan prematuritas", fesesDempul: "Feses bayi", prematur: "Prematuritas" })
  const onset = form.onsetJam.trim() ? Number(form.onsetJam) : undefined
  const kramerRed = form.fesesDempul || (onset !== undefined && Number.isFinite(onset) && onset >= 0 && onset < 24) || (form.zona !== null && kategoriKramer({ zona: form.zona, onsetJam: onset ?? 24 }).warna === "MERAH")
  const partialRed = kramerRed || (form.prematur && form.zona === 3) || (form.aktivitas === "tidak mau minum" && (form.zona === 3 || (onset !== undefined && Number.isFinite(onset) && onset >= 0 && onset < 24)))
  const { setOpen: setValidationOpen } = validation
  /* eslint-disable react-hooks/set-state-in-effect -- A computed red flag must immediately open emergency guidance. */
  useEffect(() => { if (partialRed) { setValidationOpen(false); setEmergencyOpen(true) } }, [partialRed, setValidationOpen])
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- Restore the user's saved screening draft after Dexie loads it. */
  useEffect(() => {
    if (!draftLoading && detail) {
      setGejalaDitinjau(detail.validasiKelengkapan === 1 && detail.gejalaDitinjau === true)
      setForm({
        usiaBayiHari: String(detail.usiaBayiHari ?? ""),
        zona: [1, 2, 3, 4, 5].includes(Number(detail.zona)) ? Number(detail.zona) as 1 | 2 | 3 | 4 | 5 : null,
        onsetJam: String(detail.onsetJam ?? ""),
        fesesDempul: detail.fesesDempul === true,
        aktivitas: detail.aktivitas === "aktif" || detail.aktivitas === "mengantuk" || detail.aktivitas === "tidak mau minum" ? detail.aktivitas : null,
        prematur: detail.prematur === true,
      })
    }
  }, [draftLoading, detail])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handle = async () => {
    setErr(null)
    if (!validation.check()) return
    setLoading(true)
    try {
      const res = await submitIkterus({
        userId,
        babyId,
        usiaBayiHari: Number(form.usiaBayiHari),
        zona: form.zona!,
        onsetJam: Number(form.onsetJam),
        fesesDempul: form.fesesDempul,
        aktivitas: form.aktivitas!,
        prematur: form.prematur,
        gejalaDitinjau,
      })
      onSuccess(res as Result)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SkriningFormShell title="Ikterus Neonatal" subtitle="Cek kuning pada bayi" onBack={onBack} illustration="/illu/illu-54-skrining-ikterus.webp" loading={draftLoading}>
      <div className="space-y-3.5">
        <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Waktu dan usia bayi</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
               <label className="block text-xs text-[#33443F]">Usia bayi (hari)<ScreeningMarker id="ikterus-usia-error" error={validation.errors.usiaBayiHari} /></label>
               <Input type="number" data-screening-field="usiaBayiHari" aria-label="Usia bayi (hari)" aria-invalid={!!validation.errors.usiaBayiHari} aria-describedby={validation.errors.usiaBayiHari ? "ikterus-usia-error" : undefined} value={form.usiaBayiHari} onChange={(event) => setForm((current) => ({ ...current, usiaBayiHari: event.target.value }))} className="h-auto border-0 bg-transparent p-0 text-base font-bold text-[#DB2777] shadow-none focus-visible:ring-0" />
            </div>
            <div className="rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
               <label className="block text-xs text-[#33443F]">Usia saat kuning muncul (jam)<ScreeningMarker id="ikterus-onset-error" error={validation.errors.onsetJam} /></label>
               <Input type="number" data-screening-field="onsetJam" aria-label="Usia saat kuning muncul (jam)" aria-invalid={!!validation.errors.onsetJam} aria-describedby={validation.errors.onsetJam ? "ikterus-onset-error" : undefined} value={form.onsetJam} onChange={(event) => setForm((current) => ({ ...current, onsetJam: event.target.value }))} className="h-auto border-0 bg-transparent p-0 text-base font-bold text-[#DB2777] shadow-none focus-visible:ring-0" />
            </div>
          </div>
        </section>

        <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
           <h2 data-screening-field="zona" className="!m-0 text-sm font-bold text-[#1D2B29]">Zona Kramer<ScreeningMarker error={validation.errors.zona} /></h2>
          <div className="grid grid-cols-5 gap-2">
            {([1, 2, 3, 4, 5] as const).map((zone) => (
              <button key={zone} type="button" aria-pressed={form.zona === zone} onClick={() => setForm((current) => ({ ...current, zona: zone }))} className={choiceClass(form.zona === zone)}>
                {zone}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-[#33443F]">1 kepala dan leher, 2 dada, 3 perut, 4 tangan dan kaki, 5 telapak</p>
        </section>

        <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
           <h2 data-screening-field="aktivitas" className="!m-0 text-sm font-bold text-[#1D2B29]">Kondisi bayi<ScreeningMarker error={validation.errors.aktivitas} /></h2>
          <div className="grid grid-cols-3 gap-2">
            {(["aktif", "mengantuk", "tidak mau minum"] as const).map((activity) => (
              <button key={activity} type="button" aria-pressed={form.aktivitas === activity} onClick={() => setForm((current) => ({ ...current, aktivitas: activity }))} className={choiceClass(form.aktivitas === activity)}>
                {activity === "aktif" ? "Aktif" : activity === "mengantuk" ? "Mengantuk" : "Tidak mau minum"}
              </button>
            ))}
          </div>
          {[
            { key: "fesesDempul", label: "Feses pucat dempul" },
            { key: "prematur", label: "Bayi prematur" },
          ].map((item) => {
            const checked = form[item.key as "fesesDempul" | "prematur"]
            return (
              <button key={item.key} type="button" aria-pressed={checked} onClick={() => setForm((current) => ({ ...current, [item.key]: !checked }))} className={`flex min-h-11 w-full items-center gap-3 rounded-[16px] px-3 text-left text-[13px] transition-colors ${checked ? "bg-[#4A6E54] font-semibold text-white" : "bg-white text-[#1D2B29] ring-1 ring-[#D9E7E2]"}`}>
                <span className={`grid size-5 shrink-0 place-items-center rounded-[6px] ring-1 ${checked ? "bg-white ring-white" : "bg-white ring-[#C2C8CB]"}`}>
                  {checked && <span className="size-2.5 rounded-[3px] bg-[#4A6E54]" />}
                </span>
                {item.label}
              </button>
            )
          })}
        </section>

        {err && <p role="alert" className="text-center text-xs text-[#C62828]">{err}</p>}
        {partialRed && <button type="button" className="min-h-11 w-full rounded-xl bg-[#FDECEC] p-3 text-sm font-bold text-[#8E1F1F]" onClick={() => setEmergencyOpen(true)}>Tanda bahaya bayi terlapor. Segera cari bantuan meski formulir belum lengkap.</button>}
        {emergencyOpen && <div className="fixed inset-0 z-50"><EmergencyOverlay description="Tanda bahaya bayi dilaporkan. Skrining belum lengkap. Segera hubungi bidan atau IGD; jangan menunggu koneksi internet." mapsQuery="IGD atau Puskesmas terdekat" onShare={() => window.open(`https://wa.me/?text=${encodeURIComponent('Saya melaporkan tanda bahaya pada bayi. Skrining SIAGA Bunda belum lengkap. Mohon bantuan segera.')}`, '_blank', 'noopener,noreferrer')} onDismiss={() => setEmergencyOpen(false)} /></div>}
         <label data-screening-field="gejalaDitinjau" className="flex min-h-11 items-center gap-2 text-sm text-[#33443F]"><input type="checkbox" aria-invalid={!!validation.errors.gejalaDitinjau} checked={gejalaDitinjau} onChange={(event) => setGejalaDitinjau(event.target.checked)} />Saya sudah meninjau feses dan prematuritas bayi. Yang tidak dipilih berarti Tidak.<ScreeningMarker error={validation.errors.gejalaDitinjau} /></label>
         <ScreeningValidationSheet issues={validation.issues} open={validation.open && !emergencyOpen} onOpenChange={validation.setOpen} onComplete={() => { validation.setOpen(false); validation.focus(validation.issues[0]?.key) }} />
        <Button className="min-h-12 w-full rounded-full bg-[#4A6E54] text-base font-bold text-white hover:bg-[#3D5C46]" disabled={loading} onClick={handle}>
          {loading ? "Menyimpan" : "Lihat hasil"}
        </Button>
      </div>
    </SkriningFormShell>
  )
}
