import { useEffect, useState } from "react"
import { useLatestScreeningDraft } from "@/features/skrining/useLatestScreeningDraft"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { submitHipotiroid } from "@/features/skrining/bbl/hipotiroidForm"
import SkriningFormShell from "@/features/skrining/components/SkriningFormShell"
import ScreeningValidationSheet, { ScreeningMarker } from "../components/ScreeningValidationSheet"
import useScreeningValidation from "../components/useScreeningValidation"
import { numericOrMissing } from "../components/screeningValidationUI"

type Result = { kategori: "HIJAU" | "KUNING" | "MERAH"; warna: string; faktorRisiko: string[]; faktorAman: string[] }

const choiceClass = (selected: boolean) => `min-h-11 rounded-[14px] px-3 text-xs font-semibold transition-colors ${selected ? "bg-[#4A6E54] text-white" : "bg-white text-[#33443F] ring-1 ring-[#D9E7E2]"}`

export default function HipotiroidScreen({
  onBack,
  onSuccess,
  babyId,
}: {
  onBack: () => void
  onSuccess: (r: Result) => void
  babyId: string
}) {
  const { loading: draftLoading, userId, detail } = useLatestScreeningDraft("hipotiroid", false, babyId)
  const [form, setForm] = useState({
    sudahTSH: null as boolean | null,
    usiaBayiHari: "",
    gejala: {
      ikterusLama: false,
      konstipasi: false,
      tangisanSerak: false,
      aktivitasKurang: false,
      lidahBesar: false,
    },
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [gejalaDitinjau, setGejalaDitinjau] = useState(false)
  const validation = useScreeningValidation("hipotiroid", {
    userId, ...form, usiaBayiHari: numericOrMissing(form.usiaBayiHari), gejalaDitinjau,
  }, { sudahTSH: "Pemeriksaan TSH", usiaBayiHari: "Usia bayi", gejala: "Gejala bayi", gejalaDitinjau: "Peninjauan gejala bayi" })

  /* eslint-disable react-hooks/set-state-in-effect -- Restore the user's saved screening draft after Dexie loads it. */
  useEffect(() => {
    if (!draftLoading && detail) {
      setGejalaDitinjau(detail.validasiKelengkapan === 1 && detail.gejalaDitinjau === true)
      const gejala = detail.gejala as Record<string, unknown> | undefined
      setForm({
        sudahTSH: typeof detail.sudahTSH === "boolean" ? detail.sudahTSH : null,
        usiaBayiHari: detail.usiaBayiHari == null ? "" : String(detail.usiaBayiHari),
        gejala: {
          ikterusLama: gejala?.ikterusLama === true,
          konstipasi: gejala?.konstipasi === true,
          tangisanSerak: gejala?.tangisanSerak === true,
          aktivitasKurang: gejala?.aktivitasKurang === true,
          lidahBesar: gejala?.lidahBesar === true,
        },
      })
    }
  }, [draftLoading, detail])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handle = async () => {
    setErr(null)
    if (!validation.check()) return
    setLoading(true)
    try {
      const res = await submitHipotiroid({
        userId,
        babyId,
        sudahTSH: form.sudahTSH!,
        usiaBayiHari: Number(form.usiaBayiHari),
        gejala: form.gejala,
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
    <SkriningFormShell title="Hipotiroid Kongenital" subtitle="Cek TSH dan gejala pada bayi" onBack={onBack} illustration="/illu/illu-55-skrining-hipotiroid.webp" loading={draftLoading}>
      <div className="space-y-3.5">
        <section role="group" aria-labelledby="tsh-label" aria-invalid={!!validation.errors.sudahTSH} aria-describedby={validation.errors.sudahTSH ? "tsh-error" : undefined} className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
           <h2 id="tsh-label" data-screening-field="sudahTSH" className="!m-0 text-sm font-bold text-[#1D2B29]">Pemeriksaan TSH<ScreeningMarker id="tsh-error" error={validation.errors.sudahTSH} /></h2>
          <p className="text-xs leading-relaxed text-[#33443F]">Tes skrining bayi baru lahir ideal dilakukan pada usia bayi (2 sampai 3 hari).</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ value: true, label: "Sudah" }, { value: false, label: "Belum" }].map((option) => (
              <button key={String(option.value)} type="button" aria-pressed={form.sudahTSH === option.value} onClick={() => setForm((current) => ({ ...current, sudahTSH: option.value }))} className={choiceClass(form.sudahTSH === option.value)}>
                {option.label}
              </button>
            ))}
          </div>
          {form.sudahTSH !== null && (
             <div data-screening-field="usiaBayiHari" className="rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
               <label className="block text-xs text-[#33443F]">Usia bayi (hari)<ScreeningMarker id="hipotiroid-usia-error" error={validation.errors.usiaBayiHari} /></label>
               <Input type="number" aria-label="Usia bayi (hari)" aria-invalid={!!validation.errors.usiaBayiHari} aria-describedby={validation.errors.usiaBayiHari ? "hipotiroid-usia-error" : undefined} value={form.usiaBayiHari} onChange={(event) => setForm((current) => ({ ...current, usiaBayiHari: event.target.value }))} className="h-auto border-0 bg-transparent p-0 text-base font-bold text-[#DB2777] shadow-none focus-visible:ring-0" />
            </div>
          )}
        </section>

        <section className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-3.5">
           <h2 data-screening-field="gejala" className="!m-0 text-sm font-bold text-[#1D2B29]">Gejala yang mungkin ada<ScreeningMarker error={validation.errors.gejala} /></h2>
          {[
            { key: "ikterusLama", label: "Kuning menetap (lebih dari 2 minggu)" },
            { key: "konstipasi", label: "Sembelit" },
            { key: "tangisanSerak", label: "Tangisan serak" },
            { key: "aktivitasKurang", label: "Aktivitas kurang" },
            { key: "lidahBesar", label: "Lidah besar" },
          ].map((item) => {
            const checked = form.gejala[item.key as keyof typeof form.gejala]
            return (
              <button key={item.key} type="button" aria-pressed={checked} onClick={() => setForm((current) => ({ ...current, gejala: { ...current.gejala, [item.key]: !checked } }))} className={`flex min-h-11 w-full items-center gap-3 rounded-[16px] px-3 text-left text-[13px] transition-colors ${checked ? "bg-[#4A6E54] font-semibold text-white" : "bg-white text-[#1D2B29] ring-1 ring-[#D9E7E2]"}`}>
                <span className={`grid size-5 shrink-0 place-items-center rounded-[6px] ring-1 ${checked ? "bg-white ring-white" : "bg-white ring-[#C2C8CB]"}`}>
                  {checked && <span className="size-2.5 rounded-[3px] bg-[#4A6E54]" />}
                </span>
                <span className="min-w-0 flex-1 leading-snug">{item.label}</span>
              </button>
            )
          })}
        </section>

        {err && <p role="alert" className="text-center text-xs text-[#C62828]">{err}</p>}
         <label data-screening-field="gejalaDitinjau" className="flex min-h-11 items-center gap-2 text-sm text-[#33443F]"><input type="checkbox" aria-invalid={!!validation.errors.gejalaDitinjau} checked={gejalaDitinjau} onChange={(event) => setGejalaDitinjau(event.target.checked)} />Saya sudah meninjau seluruh gejala. Yang tidak dipilih berarti Tidak.<ScreeningMarker error={validation.errors.gejalaDitinjau} /></label>
         <ScreeningValidationSheet issues={validation.issues} open={validation.open} onOpenChange={validation.setOpen} onComplete={() => { validation.setOpen(false); validation.focus(validation.issues[0]?.key) }} />
        <Button className="min-h-12 w-full rounded-full bg-[#4A6E54] text-base font-bold text-white hover:bg-[#3D5C46]" disabled={loading} onClick={handle}>
          {loading ? "Menyimpan" : "Lihat hasil"}
        </Button>
      </div>
    </SkriningFormShell>
  )
}
