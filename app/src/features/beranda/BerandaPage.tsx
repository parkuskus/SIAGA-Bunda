import { useEffect, useState } from "react"
import { Bell, Smile, ChevronRight, X, ClipboardList } from "lucide-react"
import { liveQuery } from "dexie"
import { db } from "@/data/db"
import { needsRepeat } from "@/features/skrining/screeningCompleteness"
import { getCurrentProfile, getCurrentUserId } from "@/data/currentUser"
import { weeksFromHpht, calcHPL, progressPercent } from "@/clinical-rules/ukHpl"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { Profile, ScreeningResult } from "@/data/db"
import ProfileCard from "./components/ProfileCard"
import QuickActionGrid from "./components/QuickActionGrid"
import LastCheckCard from "./components/LastCheckCard"
import TodayReminderCard from "./components/TodayReminderCard"
import ProfileAvatar from "@/features/profil/ProfileAvatar"
import FetalDevelopmentCard from "./components/FetalDevelopmentCard"
import BirthPlanScreen from "./BirthPlanScreen"
import { daysUntil, medicineTimes, normalizeTime } from "../../../../supabase/functions/_shared/reminderSchedule"

type Props = {
  uk: number
  progress: number
  countdown: number
  isPostpartum: boolean
  setIsPostpartum: (v: boolean) => void
  setShowBirth: (v: boolean) => void
  setTab: (t: "beranda" | "skrining" | "edukasi" | "tracker" | "profil") => void
  setShowBottomNav: (visible: boolean) => void
  onOpenFetalEducation: () => void
}

function formatHpl(hpht: string): string {
  const hpl = calcHPL(hpht)
  return new Date(hpl).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}
function hariIniLabel(): string {
  return new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

// S-02 Beranda — stage sage + hero illu-12 + sheet (ikut Figma 23:1098)
export default function BerandaPage({ uk: ukProp, progress: progressProp, countdown: countdownProp, isPostpartum, setIsPostpartum, setShowBirth, setTab, setShowBottomNav, onOpenFetalEducation }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [hariNifas, setHariNifas] = useState(1)
  const [beratLahir, setBeratLahir] = useState<number | null>(null)
  const [panjangLahir, setPanjangLahir] = useState<number | null>(null)
  const [last, setLast] = useState<ScreeningResult | null>(null)
  const [meds, setMeds] = useState<{ nama: string; waktu: string[] }[]>([])
  const [nextAncLabel, setNextAncLabel] = useState<string | null>(null)
  const [showReminders, setShowReminders] = useState(false)
  const [confirmBackToPregnant, setConfirmBackToPregnant] = useState(false)
  const [clock, setClock] = useState(() => Date.now())
  const [showBirthPlan, setShowBirthPlan] = useState(false)
  const [birthPlanUserId, setBirthPlanUserId] = useState("")

  useEffect(() => {
    setShowBottomNav(!showBirthPlan)
    return () => setShowBottomNav(true)
  }, [showBirthPlan, setShowBottomNav])

  useEffect(() => {
    void (async () => {
      const p = await getCurrentProfile()
      if (p) setProfile(p)
      const uid = p?.id ?? (await getCurrentUserId())
      const birth = await db.bblProfiles.get(uid)
      if (birth?.dataLahir) {
        const elapsed = Math.floor((Date.now() - new Date(birth.dataLahir).getTime()) / 86400000)
        if (Number.isFinite(elapsed)) setHariNifas(Math.min(42, Math.max(1, elapsed + 1)))
      }
      const birthEntry = (await db.nifasScreenings.where("userId").equals(uid).toArray())
        .filter((entry) => entry.status === "lahir")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
      const birthValues = birthEntry?.parameterVital
      if (typeof birthValues?.bb === "number") setBeratLahir(birthValues.bb)
      if (typeof birthValues?.pb === "number") setPanjangLahir(birthValues.pb)
      const all = await db.screeningResults.where("userId").equals(uid).toArray()
      // ponytail: entri timbangan (tipe weight) bukan skrining — jangan tampil sebagai Cek Terakhir
      const skr = all.filter((r) => r.tipe !== "weight")
      if (skr.length) {
        skr.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        setLast(skr[0])
      }
    })()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!profile) return
    const current = new Date(clock)
    const date = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`
    const subscription = liveQuery(async () => {
      const [medicines, logs, visits] = await Promise.all([
        db.supplementReminders.where("userId").equals(profile.id).toArray(),
        db.doseLogs.where("userId").equals(profile.id).filter((item) => item.tanggal === date).toArray(),
        db.ancVisits.where("userId").equals(profile.id).toArray(),
      ])
      const completed = new Set(logs.filter((item) => item.status !== "none").map((item) => `${item.suplemenId}|${normalizeTime(item.waktu)}`))
      const medications = medicines.map((medicine) => ({
        nama: medicine.namaSuplemen,
        waktu: medicineTimes(medicine, date).filter((time) => !completed.has(`${medicine.id}|${time}`)),
      })).filter((item) => item.waktu.length).sort((a, b) => a.waktu[0].localeCompare(b.waktu[0]))
      const nextVisit = visits.filter((item) => !item.statusSelesai && item.tanggalTerjadwal >= date)
        .sort((a, b) => a.tanggalTerjadwal.localeCompare(b.tanggalTerjadwal))[0]
      const daysLeft = nextVisit ? daysUntil(date, nextVisit.tanggalTerjadwal) : null
      const visitLabel = nextVisit
        ? `${daysLeft === 0 ? "Hari ini" : daysLeft === 1 ? "Besok" : `${daysLeft} hari lagi`} pada ${new Date(`${nextVisit.tanggalTerjadwal}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} di ${nextVisit.catatan || "Puskesmas"}`
        : null
      return { medications, visitLabel }
    }).subscribe({
      next: ({ medications, visitLabel }) => { setMeds(medications); setNextAncLabel(visitLabel) },
      error: () => { setMeds([]); setNextAncLabel(null) },
    })
    return () => subscription.unsubscribe()
  }, [profile, clock])

  const hpht = profile?.hpht?.trim() || ""
  const reminderCount = meds.reduce((sum, med) => sum + med.waktu.length, 0) + (nextAncLabel ? 1 : 0)
  const hasHpht = Boolean(hpht)
  const uk = hasHpht ? weeksFromHpht(hpht) : profile ? null : ukProp
  const progress = hasHpht ? progressPercent(uk!) : profile ? null : progressProp
  const hpl = hasHpht ? calcHPL(hpht) : null
  const hplLabel = hpl ? formatHpl(hpht) : profile ? "Belum diisi" : "19 Nov 2026"
  const countdown = hpl ? Math.max(0, Math.ceil((new Date(hpl).getTime() - new Date().getTime()) / 86400000)) : profile ? null : countdownProp
  const gpa = profile ? `G${profile.gravida}P${profile.para}A${profile.abortus}` : "G2P1A0"
  const nama = profile?.nama ? profile.nama.split(" ")[0] : "Siti"
  const lastLabel = last ? `${needsRepeat(last) ? last.kategori === "MERAH" ? "Bahaya, perlu pemeriksaan ulang" : "Perlu pemeriksaan ulang" : last.kategori === "HIJAU" ? "Kondisi aman" : last.kategori === "KUNING" ? "Skrining Terakhir (Waspada)" : "Skrining Terakhir (Bahaya)"}` : "Belum ada skrining"
  const lastDate = last ? new Date(last.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "Lakukan skrining pertama"

  if (showBirthPlan) return <BirthPlanScreen userId={birthPlanUserId} onClose={() => setShowBirthPlan(false)} />

  return (
    <div>
      <div data-tour="home-header" className="-mx-4 -mt-5 rounded-b-[32px] bg-[#4A6E54] px-6 pb-6 pt-7 text-white">
        <div className="flex items-center gap-2.5">
          <p className="flex-1 text-xl font-bold">SIAGA Bunda</p>
          <button onClick={() => setShowReminders(true)} aria-label={`Notifikasi pengingat, ${reminderCount} jadwal`} className="relative grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#4A6E54] transition-transform active:scale-95">
            <Bell className="size-5" />
            {reminderCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-[#DB2777] px-1 text-[10px] font-bold leading-4 text-white">{Math.min(9, reminderCount)}</span>}
          </button>
          <button onClick={() => setTab("profil")} aria-label="Buka profil" className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[#4A6E54]"><ProfileAvatar profile={profile} /></button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[17px] text-white/90">{hariIniLabel()}</p>
            <h1 className="text-[30px] font-extrabold tracking-tight leading-none" style={{ color: "#fff", margin: 0, marginTop: 10 }}>Halo, {nama}</h1>
            <p className="text-[14px] leading-relaxed text-white/90" style={{ margin: 0, marginTop: 15}}>Yuk, jaga kesehatan diri dan si kecil di setiap tahap kehamilan</p>
          </div>
          <img src="/illu/illu-12-hero-2.webp" alt="Bunda hamil" className="h-[170px] w-[130px] shrink-0 rounded-[20px] object-cover" />
        </div>
        
      </div>

      <div className="space-y-3.5 pb-6 pt-5">
        {!isPostpartum && (
          <FetalDevelopmentCard
            gestationalWeek={profile && hpht && Number.isFinite(weeksFromHpht(hpht)) ? weeksFromHpht(hpht) : null}
            onOpenEducation={onOpenFetalEducation}
            onOpenProfile={() => setTab("profil")}
          />
        )}
        <div data-tour="pregnancy-summary" className="mt-1">
          <ProfileCard
            isPostpartum={isPostpartum}
            hariNifas={hariNifas}
            beratLahir={beratLahir}
            panjangLahir={panjangLahir}
            uk={uk}
            progress={progress}
            countdown={countdown}
            hplLabel={hplLabel}
            gpa={gpa}
            onShowBirth={() => setShowBirth(true)}
            onBackToPregnant={() => setConfirmBackToPregnant(true)}
          />
        </div>
        <div data-tour="quick-actions">
          <QuickActionGrid
            onSkrining={() => setTab("skrining")}
            onCatatBB={() => setTab("tracker")}
            onReminder={() => setTab("tracker")}
            onEdukasi={() => setTab("edukasi")}
          />
        </div>
        {!isPostpartum && <button onClick={() => { void getCurrentUserId().then((id) => { setBirthPlanUserId(id); setShowBirthPlan(true) }) }} className="flex w-full items-center gap-3 rounded-[24px] bg-white p-4 text-left ring-1 ring-[#D9E7E2] transition active:scale-[0.99]">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#FFF1E8] text-[#9A5B00]"><ClipboardList className="size-6" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-[#1D2B29]">Birth Plan dan Persiapan Persalinan (P4K)</span>
            <span className="block text-xs text-[#536961]">Rencanakan persalinan dan checklist P4K</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-[#536961]" />
        </button>}
        <p className="text-[15px] font-bold py-2 text-[#1D2B29]">Skrining Kesehatan</p>
        <div data-tour="last-check">
          <LastCheckCard label={lastLabel} dateLabel={lastDate} kategori={last && needsRepeat(last) && last.kategori !== "MERAH" ? "PERLU_ULANG" : last?.kategori} onLihat={() => setTab("skrining")} />
        </div>
        <button onClick={() => setTab("tracker")} className="flex w-full items-center gap-3 rounded-[24px] bg-white p-4 text-left ring-2 ring-[#FFCFCF] active:scale-[0.99] transition">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#FFE2E2] text-[#DB2777]"><Smile className="size-7" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-[#1D2B29]">Cek Kesehatan Mental</span>
            <span className="block text-xs text-[#33443F]">Lakukan cek ini untuk mencegah depresi!</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-[#1D2B29]" />
        </button>
        {meds.length > 0 && (
          <>
            <p className="text-[15px] font-bold py-2 text-[#1D2B29]">Pengingat Harian</p>
            <TodayReminderCard meds={meds.slice(0, 3).map((med) => ({ nama: med.nama, waktu: med.waktu.map((time) => time.replace(":", ".")).join(" dan ") }))} nextAncLabel={nextAncLabel} onOpen={() => setTab("tracker")} />
          </>
        )}
      </div>

      <Dialog open={confirmBackToPregnant} onOpenChange={setConfirmBackToPregnant}>
        <DialogContent showCloseButton={false} className="w-[calc(100%-2rem)] max-w-[360px] gap-0 rounded-[24px] border-0 bg-[#FFFCF6] p-5 ring-1 ring-[#D9E7E2]">
          <DialogTitle className="text-lg font-bold text-[#1D2B29]">Kembali ke mode hamil</DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-relaxed text-[#33443F]">
            Anda yakin akan kembali ke mode hamil? Data kelahiran tetap tersimpan.
          </DialogDescription>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmBackToPregnant(false)} className="min-h-11 rounded-full bg-white px-3 text-sm font-semibold text-[#33443F] ring-1 ring-[#D9E7E2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6E54]">
              Batal
            </button>
            <button type="button" onClick={() => { setIsPostpartum(false); setConfirmBackToPregnant(false) }} className="min-h-11 rounded-full bg-[#4A6E54] px-3 text-sm font-semibold text-white hover:bg-[#3D5C46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D2B29]">
              Ya, kembali
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReminders} onOpenChange={setShowReminders}>
        <DialogContent showCloseButton={false} className="fixed inset-x-auto bottom-0 left-1/2 top-auto flex max-h-[75dvh] w-full max-w-[480px] -translate-x-1/2 translate-y-0 flex-col gap-0 overflow-y-auto rounded-t-[28px] rounded-b-none border-0 bg-[#FFFCF6] p-5 ring-0 sm:max-w-[480px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="!m-0 text-lg font-bold text-[#1D2B29]">Pengingat terdekat</DialogTitle>
              <DialogDescription className="mt-1 text-xs text-[#536961]">Obat dan jadwal pemeriksaan Bunda</DialogDescription>
            </div>
            <button onClick={() => setShowReminders(false)} aria-label="Tutup notifikasi" className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#4A6E54] ring-1 ring-[#D9E7E2]">
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-4 space-y-2.5">
            {meds.map((med) => (
              <div key={med.nama} className="flex items-center gap-3 rounded-[18px] bg-white p-3 ring-1 ring-[#D9E7E2]">
                <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[#EAF4F0] text-[#4A6E54]"><Bell className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#1D2B29]">{med.nama}</p>
                  <p className="text-xs text-[#536961]">Jadwal hari ini pukul {med.waktu.map((time) => time.replace(":", ".")).join(" dan ")}</p>
                </div>
              </div>
            ))}
            {nextAncLabel && (
              <div className="flex items-center gap-3 rounded-[18px] bg-white p-3 ring-1 ring-[#D9E7E2]">
                <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[#FFE2E2] text-[#9D2553]"><ChevronRight className="size-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#1D2B29]">Pemeriksaan berikutnya</p>
                  <p className="truncate text-xs text-[#536961]">{nextAncLabel}</p>
                </div>
              </div>
            )}
            {!meds.length && !nextAncLabel && <p className="rounded-[18px] bg-[#EAF4F0] p-4 text-center text-sm text-[#536961]">Belum ada pengingat obat atau jadwal periksa.</p>}
          </div>
          <button onClick={() => { setShowReminders(false); setTab("tracker") }} className="mt-4 min-h-11 w-full rounded-full bg-[#4A6E54] text-sm font-bold text-white">Buka Pengingat</button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
