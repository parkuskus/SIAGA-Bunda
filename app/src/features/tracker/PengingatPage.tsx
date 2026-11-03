import { useEffect, useState } from "react"
import { CalendarDays } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { db } from "@/data/db"
import { getCurrentUserId, getCurrentProfile } from "@/data/currentUser"
import { moveANC, reconcileANC, toggleANC } from "@/features/tracker/ancForm"
import { submitDiary } from "@/features/tracker/diaryForm"
import { getTimeline } from "@/features/tracker/timelineForm"
import { weeksFromHpht } from "@/clinical-rules/ukHpl"
import { calcIMT, kategoriIMT } from "@/clinical-rules/imtLila"
import SupplementSection from "@/features/tracker/SupplementSection"
import ANCCalendar from "@/features/tracker/ANCCalendar"
import WeightChart from "@/features/tracker/WeightChart"
import WeightFormSheet from "@/features/tracker/WeightFormSheet"
import WeightHistory from "@/features/tracker/WeightHistory"
import DiaryHistory from "@/features/tracker/DiaryHistory"
import MedForm from "@/features/tracker/MedForm"
import type { WeightEntry, ANCVisit, DiaryEntry } from "@/data/db"
import { WEIGHT_GAIN_REFERENCE } from "@/features/tracker/weightGainReference"

const DEMO_HPHT = "2026-02-12"

function WeightGainTargetTable({ imt }: { imt?: number }) {
  const active = imt === undefined ? null : kategoriIMT(imt).kat
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-bold text-[#1D2B29]">Target kenaikan total berdasarkan IMT pra-hamil</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-[11px]" aria-label="Target kenaikan berat badan menurut IMT sebelum hamil">
          <thead><tr className="border-b border-[#D9E7E2] text-[#536961]"><th scope="col" className="w-[29%] py-2 pr-2 font-semibold">IMT sebelum hamil</th><th scope="col" className="w-[35%] px-2 py-2 text-right font-semibold">Total kenaikan selama hamil</th><th scope="col" className="w-[36%] py-2 pl-2 text-right font-semibold">Rata-rata trimester 2 per minggu</th></tr></thead>
          <tbody>{WEIGHT_GAIN_REFERENCE.map(({ key, label, sampleIMT, weeklyKg }) => {
            const { kat, targetKg } = kategoriIMT(sampleIMT)
            return (
              <tr key={key} className={`border-b border-[#D9E7E2] last:border-0 ${kat === active ? "font-bold text-[#1D2B29]" : "text-[#33443F]"}`}>
                <th scope="row" className="py-2 pr-2 font-semibold">{label}</th>
                <td className="px-2 py-2 text-right">{String(targetKg[0]).replace(".", ",")}–{String(targetKg[1]).replace(".", ",")} kg</td>
                <td className="py-2 pl-2 text-right">{weeklyKg[0].toFixed(2).replace(".", ",")}–{weeklyKg[1].toFixed(2).replace(".", ",")} kg</td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
      <p className="text-[11px] leading-snug text-[#536961]">Acuan IOM 2009. Target kenaikan total kehamilan dan rata-rata minggu trimester kedua.</p>
    </div>
  )
}

export default function PengingatPage({ setShowBottomNav }: { setShowBottomNav: (visible: boolean) => void }) {
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [anc, setAnc] = useState<ANCVisit[]>([])
  const [uid, setUid] = useState<string>("demo-siti")
  const [hpht, setHpht] = useState<string>(DEMO_HPHT)
  const [bbPre, setBbPre] = useState<number>(55)
  const [tbCm, setTbCm] = useState<number>(160)
  const [giziBaseline, setGiziBaseline] = useState<{ bbPre: number; tbCm: number } | null>(null)
  const [showWeightSheet, setShowWeightSheet] = useState(false)
  const [showWeightHistory, setShowWeightHistory] = useState(false)
  const [editingWeight, setEditingWeight] = useState<WeightEntry | null>(null)
  const [targetManual, setTargetManual] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem("siaga_bb_target")
      return v ? Number(v) : null
    } catch {
      return null
    }
  })
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetDraft, setTargetDraft] = useState("")
  const [diaryTitle, setDiaryTitle] = useState("")
  const [diaryText, setDiaryText] = useState("")
  const [diaryMsg, setDiaryMsg] = useState<string | null>(null)
  const [diaryList, setDiaryList] = useState<DiaryEntry[]>([])
  const [showDiaryHistory, setShowDiaryHistory] = useState(false)

  const load = async () => {
    const p = await getCurrentProfile()
    const h = p?.hpht?.trim() || DEMO_HPHT
    const id = p?.id ?? (await getCurrentUserId())
    setUid(id)
    setHpht(h)
    // BB pre & TB dari skrining gizi terakhir; tanpa itu pakai data paling lama
    let bbPreLok = 55
    let tbLok = 160
    let dariGizi = false
    try {
      const gizi = await db.screeningResults.where("userId").equals(id).filter((r) => r.tipe === "imt_lila").toArray()
      gizi.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      const d = gizi[0]?.detail as { bbPreKg?: number; tbCm?: number } | undefined
      if (typeof d?.bbPreKg === "number" && Number.isFinite(d.bbPreKg) && d.bbPreKg > 0 && typeof d.tbCm === "number" && Number.isFinite(d.tbCm) && d.tbCm > 0) {
        bbPreLok = d.bbPreKg
        tbLok = d.tbCm
        dariGizi = true
        setGiziBaseline({ bbPre: bbPreLok, tbCm: tbLok })
      } else setGiziBaseline(null)
    } catch { setGiziBaseline(null) /* Pengingat lokal tetap berjalan tanpa data profil tersimpan. */ }
    const w = await db.weightEntries.where("userId").equals(id).toArray()
    w.sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    if (!dariGizi && w.length) bbPreLok = w[0].beratKg
    setBbPre(bbPreLok)
    setTbCm(tbLok)
    setWeights(w)
    const a = await reconcileANC(id, h)
    a.sort((x, y) => x.tanggalTerjadwal.localeCompare(y.tanggalTerjadwal))
    setAnc(a)
    const d = await db.diaryEntries.where("userId").equals(id).toArray()
    d.sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    setDiaryList(d)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load Dexie-backed tracker state on screen entry.
    void load()
  }, [])

  const handleSaveTarget = () => {
    const v = Number(targetDraft)
    if (!v || v < 20 || v > 250) return
    try {
      localStorage.setItem("siaga_bb_target", String(v))
    } catch { /* Penyimpanan target opsional; state layar tetap dipakai. */ }
    setTargetManual(v)
    setEditingTarget(false)
  }

  const handleToggleAnc = async (id: string, done: boolean) => {
    await toggleANC(id, !done)
    await load()
  }

  const handleSaveAncNote = async (id: string, done: boolean, note: string) => {
    await toggleANC(id, done, note.trim() || undefined)
    await load()
  }

  const handleMoveAnc = async (id: string, date: string) => {
    const status = await moveANC(id, date)
    await load()
    return status
  }

  const handleDiary = async () => {
    if (!diaryText.trim()) return
    await submitDiary({ userId: uid, teks: diaryText.trim(), mood: 3, judul: diaryTitle.trim() || undefined })
    setDiaryTitle("")
    setDiaryText("")
    setDiaryMsg("Tersimpan")
    setTimeout(() => setDiaryMsg(null), 1500)
    await load()
  }

  const weightBars = weights.length ? weights.slice(-8) : []
  const lastWeight = weightBars.length ? weightBars[weightBars.length - 1].beratKg : null
  // garis target: manual bila pengguna mengubah, sonst IOM proporsional UK kini
  const targetAbs = (() => {
    if (targetManual !== null && targetManual >= 20 && targetManual <= 250) return targetManual
    try {
      const ukNow = weeksFromHpht(hpht)
      const { targetKg } = kategoriIMT(calcIMT(bbPre, tbCm))
      return Math.round((bbPre + ((targetKg[0] + targetKg[1]) / 2) * (ukNow / 40)) * 10) / 10
    } catch {
      return null
    }
  })()
  const nextAnc = anc.find((a) => !a.statusSelesai)
  const nextAncLabel = nextAnc
    ? new Date(`${nextAnc.tanggalTerjadwal}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "Semua jadwal selesai"

  const [showMedForm, setShowMedForm] = useState(false)

  useEffect(() => {
    setShowBottomNav(!showMedForm && !showDiaryHistory && !showWeightHistory)
  }, [showMedForm, showDiaryHistory, showWeightHistory, setShowBottomNav])

  useEffect(() => () => setShowBottomNav(true), [setShowBottomNav])

  const tl = getTimeline(hpht)
  const hplLabel = new Date(tl.hpl).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  const currentWeek = Number.isFinite(tl.uk) ? Math.min(40, Math.max(0, tl.uk)) : 0
  const progress = Math.min(100, Math.max(0, currentWeek / 40 * 100))
  const trimesterLabel = `Trimester ${tl.trimester}`

  // layar tambah obat penuh (bukan bagian section)
  if (showMedForm) {
    return <MedForm onBack={() => setShowMedForm(false)} onDone={() => setShowMedForm(false)} />
  }

  // layar riwayat diary penuh
  if (showDiaryHistory) {
    return <DiaryHistory entries={diaryList} onBack={() => setShowDiaryHistory(false)} />
  }

  // layar riwayat berat penuh (+ sheet edit ikut dirender di sini)
  if (showWeightHistory) {
    return (
      <div className="space-y-4">
        <WeightHistory
          entries={weights}
          onBack={() => { setShowWeightHistory(false); setEditingWeight(null) }}
          onEdit={(e) => setEditingWeight(e)}
        />
        {editingWeight && (
          <WeightFormSheet
            bbPre={bbPre}
            tbCm={tbCm}
            ukMinggu={weeksFromHpht(hpht)}
            userId={uid}
            initialKg={lastWeight}
            entry={editingWeight}
            onClose={() => setEditingWeight(null)}
            onSaved={() => { setEditingWeight(null); void load() }}
            onDeleted={() => { setEditingWeight(null); void load() }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="-mx-4 -mt-5">
      <header className="relative isolate overflow-hidden rounded-b-[32px] bg-[#4A6E54] px-6 pb-11 pt-7 text-white">
        <div className="relative z-10 max-w-[220px]">
          <h1 className="!m-0 text-[28px] font-extrabold leading-tight">Pengingat</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/90">Cek perjalanan kehamilan, obat, dan jadwal penting lainnya.</p>
        </div>
        <img src="/illu/illu-13-header-pengingat.webp" alt="" aria-hidden="true" className="pointer-events-none absolute -right-2 bottom-0 h-[138px] w-[140px] object-contain object-bottom" />
      </header>

      <div className="space-y-5 px-4 pb-6 pt-5">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <h2 className="!m-0 text-[15px] font-bold text-[#1D2B29]">Perjalanan kehamilan</h2>
              <p className="mt-0.5 text-xs text-[#536961]">Usia kehamilan dan perkiraan lahir</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#EAF4F0] px-3 py-1.5 text-xs font-bold text-[#4A6E54]">{trimesterLabel}</span>
          </div>

          <div className="rounded-[24px] bg-[#EAF4F0] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[#536961]">Usia kehamilan</p>
                <p className="mt-1 text-[24px] font-bold leading-tight tracking-tight text-[#1D2B29]">Minggu ke-{currentWeek}</p>
              </div>
              <span className="rounded-[14px] bg-white px-3 py-2 text-right ring-1 ring-[#D9E7E2]">
                <span className="block text-[11px] text-[#536961]">Menuju HPL</span>
                <span className="block text-sm font-bold text-[#4A6E54]">{tl.hariTersisa} hari</span>
              </span>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-xs text-[#33443F]">
                <span>Perjalanan 40 minggu</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[#4A6E54] transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-[#D9E7E2] pt-3 text-sm">
              <CalendarDays className="size-4 shrink-0 text-[#4A6E54]" />
              <span className="text-xs text-[#536961]">Perkiraan lahir</span>
              <span className="ml-auto text-sm font-semibold text-[#1D2B29]">{hplLabel}</span>
            </div>
          </div>

        </section>

        <SupplementSection onAdd={() => setShowMedForm(true)} />

        <div className="grid gap-4">
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="!m-0 text-[15px] font-bold text-[#1D2B29]">Berat badan</h2>
              <button onClick={() => setShowWeightHistory(true)} className="min-h-11 rounded-full bg-white px-3 text-xs font-semibold text-[#4A6E54] ring-1 ring-[#D9E7E2] active:scale-[0.98] transition">Riwayat</button>
            </div>
          <Card className="rounded-[24px] border-0 bg-[#EAF4F0] ring-0 shadow-none">
            <CardContent className="p-4">
            <div className="mt-1 min-w-0 w-full">
              <WeightChart entries={weightBars} targetAbs={targetAbs} />
            </div>
            <WeightGainTargetTable imt={giziBaseline ? calcIMT(giziBaseline.bbPre, giziBaseline.tbCm) : undefined} />
            <div className="mt-3">
              {editingTarget ? (
                <div className="flex gap-2">
                  <Input type="number" value={targetDraft} onChange={(e) => setTargetDraft(e.target.value)} placeholder="Target (kg)" aria-label="Target berat badan (kg)" className="h-12 flex-1 rounded-[14px] border-[#D9E7E2] bg-white px-4" />
                  <Button className="min-h-11 rounded-full bg-[#4A6E54] px-6 text-white hover:bg-[#3D5C46]" onClick={handleSaveTarget}>Simpan</Button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-[16px] bg-white px-3 py-2.5 ring-1 ring-[#D9E7E2]">
                  <p className="text-xs text-[#536961]">Target {targetManual !== null ? "manual" : "IOM"} <span className="font-bold text-[#1D2B29]">{targetAbs !== null ? `${targetAbs} kg` : "-"}</span></p>
                  <button onClick={() => { setTargetDraft(targetManual !== null ? String(targetManual) : targetAbs !== null ? String(targetAbs) : ""); setEditingTarget(true) }} className="min-h-11 px-2 text-xs font-semibold text-[#4A6E54]">Ubah</button>
                </div>
              )}
            </div>
            <Button className="mt-3 min-h-12 w-full rounded-full bg-[#4A6E54] text-sm font-bold text-white hover:bg-[#3D5C46]" onClick={() => setShowWeightSheet(true)}>
              Tambah berat
            </Button>
            </CardContent>
          </Card>
          </section>

          <section className="space-y-2.5">
            <h2 className="px-1 text-[15px] font-bold text-[#1D2B29]">Jadwal periksa</h2>
            <Card className="rounded-[24px] border-0 bg-[#EAF4F0] ring-0 shadow-none">
              <CardContent className="p-4">
                <p className="text-xs text-[#536961]">{nextAncLabel}</p>
                {!anc.length ? (
                  <p className="mt-3 text-center text-xs text-[#536961]">Memuat jadwal</p>
                ) : (
                  <ANCCalendar
                    anc={anc}
                    hplDate={tl.hpl}
                    onToggle={(id, done) => void handleToggleAnc(id, done)}
                    onSaveNote={(id, done, note) => void handleSaveAncNote(id, done, note)}
                    onMoveDate={handleMoveAnc}
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="!m-0 text-[15px] font-bold text-[#1D2B29]">Diary harian</h2>
                <p className="mt-0.5 text-xs text-[#536961]">Tulis catatan untuk hari ini</p>
              </div>
              <button onClick={() => setShowDiaryHistory(true)} className="min-h-11 rounded-full bg-white px-3.5 text-xs font-semibold text-[#4A6E54] ring-1 ring-[#D9E7E2] active:scale-[0.98] transition">Riwayat</button>
            </div>
            <Card className="rounded-[24px] border-0 bg-[#EAF4F0] ring-0 shadow-none">
              <CardContent className="space-y-2 p-4">
              <Input aria-label="Judul Diary" value={diaryTitle} onChange={(e) => setDiaryTitle(e.target.value)} placeholder="Judul Diary" className="h-11 rounded-[14px] border-[#D9E7E2] bg-white px-4 text-sm font-bold placeholder:text-sm placeholder:font-bold" />
              <textarea value={diaryText} onChange={(e) => setDiaryText(e.target.value)} placeholder="Tulis isi diary Bunda hari ini" className="min-h-[88px] w-full rounded-[14px] bg-white p-3 text-sm ring-1 ring-[#D9E7E2] placeholder:text-[#6C757D] focus:outline-none focus:ring-2 focus:ring-[#7AAE9A]/40" />
              {diaryMsg && <p className="text-xs text-[#2E7D32] text-center">{diaryMsg}</p>}
              <Button className="min-h-11 w-full rounded-full bg-[#4A6E54] font-semibold text-white hover:bg-[#3D5C46]" onClick={() => void handleDiary()}>
                Simpan diary
              </Button>
              </CardContent>
            </Card>
          </section>

      </div>

      {(showWeightSheet || editingWeight) && (
        <WeightFormSheet
          bbPre={bbPre}
          tbCm={tbCm}
          ukMinggu={weeksFromHpht(hpht)}
          userId={uid}
          initialKg={lastWeight}
          entry={editingWeight ?? undefined}
          onClose={() => { setShowWeightSheet(false); setEditingWeight(null) }}
          onSaved={() => { setShowWeightSheet(false); setEditingWeight(null); void load() }}
          onDeleted={() => { setShowWeightSheet(false); setEditingWeight(null); void load() }}
        />
      )}
    </div>
    </div>
  )
}
