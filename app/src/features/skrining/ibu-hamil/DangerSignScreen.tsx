import { useEffect, useState } from "react"
import { Activity, Baby, Droplets, Eye, Hand, Thermometer, Wind, Waves, Zap, type LucideIcon } from "lucide-react"
import { useLatestScreeningDraft } from "@/features/skrining/useLatestScreeningDraft"
import { Button } from "@/components/ui/button"
import { submitDangerSign } from "@/features/skrining/ibu-hamil/dangerSignForm"
import SkriningFormShell from "@/features/skrining/components/SkriningFormShell"
import EmergencyOverlay from "@/shared/components/EmergencyOverlay"
import { kategoriDanger } from "./dangerSignForm"
import ScreeningValidationSheet, { ScreeningMarker } from "../components/ScreeningValidationSheet"
import useScreeningValidation from "../components/useScreeningValidation"

const GEJALA: { k: string; l: string; Icon: LucideIcon; tint?: boolean; hint?: string }[] = [
  { k: "perdarahan", l: "Perdarahan per vagina", Icon: Droplets, tint: true },
  { k: "nyeriKepalaHebat", l: "Nyeri kepala hebat", Icon: Zap },
  { k: "pandanganKabur", l: "Pandangan kabur", Icon: Eye },
  { k: "demamTinggi", l: "Demam tinggi (di atas 38 °C)", Icon: Thermometer, hint: "Suhu tubuh lebih dari 38 °C" },
  { k: "ketubanPecah", l: "Ketuban pecah dini", Icon: Waves, hint: "Cairan merembes sebelum waktunya" },
  { k: "nyeriAbdomenHebat", l: "Nyeri perut hebat menetap", Icon: Activity },
  { k: "bengkakWajahTangan", l: "Bengkak wajah dan tangan", Icon: Hand },
  { k: "gerakanJaninBerkurang", l: "Gerakan janin berkurang", Icon: Baby, hint: "Kurang dari 10 kali dalam 2 jam" },
  { k: "sesakNapas", l: "Sesak napas mendadak", Icon: Wind },
]

export default function DangerSignScreen({ onBack, onSuccess }: { onBack: () => void; onSuccess: (r: Awaited<ReturnType<typeof submitDangerSign>>) => void }) {
  const { loading: draftLoading, userId, detail } = useLatestScreeningDraft("danger_sign")
  const [form, setForm] = useState<Record<string, boolean | null>>({
    perdarahan: null,
    pandanganKabur: null,
    nyeriAbdomenHebat: null,
    bengkakWajahTangan: null,
    gerakanJaninBerkurang: null,
    demamTinggi: null,
    ketubanPecah: null,
    sesakNapas: null,
  })
  const [nyeriSkala, setNyeriSkala] = useState<number | null>(null)
  const [tdTinggi, setTdTinggi] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const validation = useScreeningValidation("danger_sign", {
    userId, ...form, nyeriKepalaHebat: (nyeriSkala ?? 0) >= 4,
    nyeriKepalaSkala: nyeriSkala, tdTinggi,
  }, { ...Object.fromEntries(GEJALA.map((item) => [item.k, item.l])), nyeriKepalaSkala: "Skala nyeri kepala", tdTinggi: "Tekanan darah tinggi" })
  const redKnown = kategoriDanger({ ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === true])), nyeriKepalaHebat: (nyeriSkala ?? 0) >= 4, nyeriKepalaSkala: nyeriSkala ?? 0, tdTinggi: tdTinggi === true } as never) === "MERAH"
  const { setOpen: setValidationOpen } = validation
  /* eslint-disable react-hooks/set-state-in-effect -- A computed red flag must immediately open emergency guidance. */
  useEffect(() => { if (redKnown) { setValidationOpen(false); setEmergencyOpen(true) } }, [redKnown, setValidationOpen])
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- Restore the user's saved screening draft after Dexie loads it. */
  useEffect(() => {
    if (!draftLoading && detail) {
      setForm({
        perdarahan: typeof detail.perdarahan === "boolean" ? detail.perdarahan : null,
        pandanganKabur: typeof detail.pandanganKabur === "boolean" ? detail.pandanganKabur : null,
        nyeriAbdomenHebat: typeof detail.nyeriAbdomenHebat === "boolean" ? detail.nyeriAbdomenHebat : null,
        bengkakWajahTangan: typeof detail.bengkakWajahTangan === "boolean" ? detail.bengkakWajahTangan : null,
        gerakanJaninBerkurang: typeof detail.gerakanJaninBerkurang === "boolean" ? detail.gerakanJaninBerkurang : null,
        demamTinggi: typeof detail.demamTinggi === "boolean" ? detail.demamTinggi : null,
        ketubanPecah: typeof detail.ketubanPecah === "boolean" ? detail.ketubanPecah : null,
        sesakNapas: typeof detail.sesakNapas === "boolean" ? detail.sesakNapas : null,
      })
      setNyeriSkala(typeof detail.nyeriKepalaSkala === "number" ? detail.nyeriKepalaSkala : detail.nyeriKepalaHebat === true ? 4 : null)
      setTdTinggi(typeof detail.tdTinggi === "boolean" ? detail.tdTinggi : null)
    }
  }, [draftLoading, detail])
  /* eslint-enable react-hooks/set-state-in-effect */

  const answer = (k: string, value: boolean) => {
    if (k === "nyeriKepalaHebat") {
      setNyeriSkala(value ? 4 : 0)
      return
    }
    setForm((current) => ({ ...current, [k]: value }))
    if (k === "bengkakWajahTangan" && !value) setTdTinggi(null)
  }

  const handle = async () => {
    setError(null)
    if (!validation.check()) return
    setLoading(true)
    try {
      const res = await submitDangerSign({
        userId,
        ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value === true])) as Record<string, boolean>,
        nyeriKepalaHebat: (nyeriSkala ?? 0) >= 4,
        nyeriKepalaSkala: nyeriSkala ?? 0,
        tdTinggi: form.bengkakWajahTangan ? tdTinggi : undefined,
      } as never)
      onSuccess(res)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SkriningFormShell title="Tanda Bahaya" subtitle="Cek mandiri tanda bahaya" onBack={onBack} illustration="/illu/illu-48-skrining-bahaya.webp" loading={draftLoading}>
      <div className="space-y-2.5">
        <p className="px-1 text-[13px] text-[#33443F]">Tandai gejala yang Bunda rasakan</p>
        {GEJALA.map((item, index) => {
          const selected = item.k === "nyeriKepalaHebat" ? nyeriSkala === null ? null : nyeriSkala >= 4 : form[item.k]
          const Icon = item.Icon
          return (
            <div key={item.k} data-screening-field={item.k === "nyeriKepalaHebat" ? "nyeriKepalaSkala" : item.k}>
              <div className="flex min-h-16 items-center gap-2.5 rounded-[20px] bg-[#EAF4F0] px-2.5 py-2">
                <span className={`grid size-10 shrink-0 place-items-center rounded-[14px] ${item.tint ? "bg-[#FFE2E2] text-[#DB2777]" : "bg-white text-[#7AAE9A]"}`}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold leading-tight text-[#1D2B29]">{item.l}<ScreeningMarker error={item.k === "nyeriKepalaHebat" ? validation.errors.nyeriKepalaSkala : validation.errors[item.k]} /></span>
                  {item.hint && <span className="mt-0.5 block text-[11px] leading-tight text-[#33443F]">{item.hint}</span>}
                </span>
                <div className="flex shrink-0 gap-1.5">
                  {[true, false].map((choice) => (
                    <button
                      key={String(choice)}
                      type="button"
                      aria-pressed={selected === choice}
                      aria-invalid={!!(item.k === "nyeriKepalaHebat" ? validation.errors.nyeriKepalaSkala : validation.errors[item.k])}
                      onClick={() => selected !== choice && answer(item.k, choice)}
                      className={`min-h-11 min-w-11 rounded-[14px] px-2 text-xs font-semibold transition-colors active:scale-95 ${selected === choice ? "bg-[#4A6E54] text-white" : "bg-white text-[#33443F] ring-1 ring-[#D9E7E2]"}`}
                    >
                      {choice ? "Ya" : "Tidak"}
                    </button>
                  ))}
                </div>
              </div>
              {item.k === "bengkakWajahTangan" && selected === true && (
                <div data-screening-field="tdTinggi" className="mt-2 flex items-center justify-between gap-2 rounded-[18px] bg-white p-3 ring-1 ring-[#D9E7E2]">
                  <p className="text-xs font-semibold text-[#1D2B29]">Tekanan darah 140/90 atau lebih?<ScreeningMarker error={validation.errors.tdTinggi} /></p>
                  <div className="flex gap-1.5">
                      {[true, false].map((choice) => (
                      <button key={String(choice)} type="button" aria-pressed={tdTinggi === choice} onClick={() => setTdTinggi(choice)} className={`min-h-11 min-w-11 rounded-[14px] px-2 text-xs font-semibold ${tdTinggi === choice ? "bg-[#4A6E54] text-white" : "bg-white text-[#33443F] ring-1 ring-[#D9E7E2]"}`}>
                        {choice ? "Ya" : "Tidak"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {index === 4}
            </div>
          )
        })}
        {error && <p role="alert" className="text-center text-xs text-[#C62828]">{error}</p>}
        <ScreeningValidationSheet issues={validation.issues} open={validation.open && !emergencyOpen} onOpenChange={validation.setOpen} onComplete={() => { validation.setOpen(false); validation.focus(validation.issues[0]?.key) }} />
        {redKnown && <button type="button" className="min-h-11 w-full rounded-xl bg-[#FDECEC] p-3 text-sm font-bold text-[#8E1F1F]" onClick={() => setEmergencyOpen(true)}>Tanda bahaya terlapor. Segera cari bantuan meski formulir belum lengkap.</button>}
        {emergencyOpen && <div className="fixed inset-0 z-50"><EmergencyOverlay description="Tanda bahaya dilaporkan. Skrining belum lengkap. Segera hubungi bidan atau fasilitas kesehatan; jangan menunggu semua jawaban terisi, termasuk jika sedang offline." mapsQuery="Puskesmas atau Praktik Mandiri Bidan (PMB) terdekat" onShare={() => { window.open(`https://wa.me/?text=${encodeURIComponent('Saya melaporkan tanda bahaya kehamilan. Skrining SIAGA Bunda belum lengkap. Mohon bantuan segera.')}`, '_blank', 'noopener,noreferrer') }} onDismiss={() => setEmergencyOpen(false)} /></div>}
        <Button className="min-h-12 w-full rounded-full bg-[#4A6E54] text-base font-bold text-white hover:bg-[#3D5C46]" disabled={loading} onClick={handle}>
          {loading ? "Menyimpan" : "Lihat hasil"}
        </Button>
        <p className="pb-1 text-xs text-[#33443F]">Satu tanda Ya langsung status bahaya</p>
      </div>
    </SkriningFormShell>
  )
}
