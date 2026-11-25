import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, TriangleAlert } from "lucide-react"
import { weeksFromHpht } from "@/clinical-rules/ukHpl"
import { getCurrentProfile } from "@/data/currentUser"
import { janinIllustrationPath, janinWeeks, nearestJaninWeek } from "./janinWeekData"
import VideoBelajarCard from "./VideoBelajarCard"
import EdukasiDetailHeader from "./EdukasiDetailHeader"

const trimesterList = [
  { id: 1, label: "Trimester 1", weeks: janinWeeks.filter((item) => item.trimester === 1) },
  { id: 2, label: "Trimester 2", weeks: janinWeeks.filter((item) => item.trimester === 2) },
  { id: 3, label: "Trimester 3", weeks: janinWeeks.filter((item) => item.trimester === 3) },
] as const

export default function JaninWeekScreen({ onBack }: { onBack: () => void }) {
  const [mingguAktif, setMingguAktif] = useState(8)
  const [usiaKehamilan, setUsiaKehamilan] = useState<number | null>(null)
  const [trimesterAktif, setTrimesterAktif] = useState<1 | 2 | 3>(1)
  const [memuatProfil, setMemuatProfil] = useState(true)
  const minggu = janinWeeks.find((item) => item.week === mingguAktif) ?? janinWeeks[3]
  const trimester = trimesterList.find((item) => item.id === trimesterAktif) ?? trimesterList[0]
  const posisiMinggu = janinWeeks.findIndex((item) => item.week === mingguAktif)

  useEffect(() => {
    let mounted = true

    void (async () => {
      try {
        const profile = await getCurrentProfile()
        if (!mounted || !profile?.hpht?.trim()) return
        const currentWeek = weeksFromHpht(profile.hpht)
        if (!Number.isFinite(currentWeek)) return

        const record = nearestJaninWeek(currentWeek) ?? janinWeeks[3]
        setUsiaKehamilan(currentWeek)
        setMingguAktif(record.week)
        setTrimesterAktif(record.trimester)
      } catch {
        // Materi tetap dapat dibuka dan dipilih manual jika profil belum tersedia.
      } finally {
        if (mounted) setMemuatProfil(false)
      }
    })()

    return () => { mounted = false }
  }, [])

  function pilihTrimester(id: 1 | 2 | 3) {
    setTrimesterAktif(id)
    const items = trimesterList.find((item) => item.id === id)?.weeks
    if (items?.length) setMingguAktif(items[0].week)
  }

  function pilihMinggu(value: number) {
    const record = janinWeeks.find((item) => item.week === value)
    if (!record) return
    setMingguAktif(record.week)
    setTrimesterAktif(record.trimester)
  }

  return (
    <div className="-mx-4 -mt-5">
      <EdukasiDetailHeader nomor={2} label="Perkembangan Janin" judul="Perkembangan Janin per Minggu" deskripsi="Lihat perubahan si Kecil dari minggu ke minggu." teksBagikan="Baca materi Perkembangan Janin per Minggu di SIAGA Bunda." onBack={onBack} />

      <main className="relative mx-4 rounded-[32px] bg-[#FFFCF6] px-5 pb-36 pt-6">
        <VideoBelajarCard
          judul="Perkembangan Janin per Minggu"
          deskripsi="Lihat bagaimana si Kecil tumbuh dan berkembang dari minggu ke minggu."
          thumbnail="/s-06/s-06b/Thumbnail.webp"
          sumber="/s-06/s-06b/S-06b%20-%20Perkembangan%20Janin.mp4"
        />

        <div className="mb-4 mt-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#1D2B29]">Pilih minggu</h2>
            <div className="mt-1 text-sm leading-relaxed text-[#536961]">
              {memuatProfil
                ? "Mencocokkan usia kehamilan Bunda."
                : usiaKehamilan === null
                  ? "Pilih minggu yang ingin Bunda pelajari."
                  : `Usia kehamilan Bunda saat ini ${usiaKehamilan} minggu.`}
            </div>
          </div>
          {usiaKehamilan !== null && usiaKehamilan !== mingguAktif && (
            <span className="shrink-0 rounded-full bg-[#EAF4F0] px-3 py-1.5 text-xs font-bold text-[#4A6E54]">Materi terdekat</span>
          )}
        </div>

        {usiaKehamilan !== null && usiaKehamilan !== mingguAktif && (
          <div className="mb-4 rounded-[16px] bg-[#EAF4F0] px-3.5 py-3 text-xs leading-relaxed text-[#33443F]">
            Ilustrasi tersedia tiap dua minggu. Minggu ini menampilkan materi terdekat, yaitu minggu ke-{mingguAktif}.
          </div>
        )}

        <div role="tablist" aria-label="Pilih trimester" className="grid grid-cols-3 rounded-full bg-[#EAF4F0] p-1">
          {trimesterList.map((item) => {
            const active = item.id === trimesterAktif
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => pilihTrimester(item.id)}
                className={`min-h-11 rounded-full px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6E54] ${active ? "bg-[#4A6E54] text-white" : "text-[#33443F] hover:bg-white/70"}`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]" role="group" aria-label={`${trimester.label}, pilih usia kehamilan`}>
          {trimester.weeks.map((item) => {
            const active = item.week === mingguAktif
            return (
              <button
                key={item.week}
                type="button"
                aria-pressed={active}
                aria-label={`Minggu ke-${item.week}`}
                onClick={() => pilihMinggu(item.week)}
                className={`min-h-11 min-w-12 shrink-0 rounded-full px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6E54] ${active ? "bg-[#FFE2E2] text-[#9D2553] ring-1 ring-[#FFCFCF]" : "bg-white text-[#33443F] ring-1 ring-[#D9E7E2] hover:bg-[#EAF4F0]"}`}
              >
                {item.week}
              </button>
            )
          })}
        </div>

        <section aria-live="polite" className="mt-3 overflow-hidden rounded-[24px] bg-white ring-1 ring-[#D9E7E2]">
          <div className="px-4 pt-4">
            <div className="text-xs font-semibold text-[#536961]">Trimester {minggu.trimester}</div>
            <h2 className="mt-1 text-xl font-extrabold leading-tight text-[#1D2B29]">Minggu ke-{minggu.week}</h2>
            <div className="mt-1 text-xs font-semibold text-[#4A6E54]">Sebesar {minggu.fruit}</div>
          </div>
          <div className="mt-3 bg-[#FFFDEC]">
            <img
              src={janinIllustrationPath(minggu.week)}
              alt={`Ilustrasi perkembangan janin minggu ke-${minggu.week}, dibandingkan dengan ${minggu.fruit.toLowerCase()}`}
              className="h-[220px] w-full object-contain sm:h-[260px]"
            />
          </div>
          <div className="grid grid-cols-2 divide-x divide-[#D9E7E2] border-t border-[#D9E7E2]">
            <div className="px-4 py-3">
              <div className="text-xs text-[#536961]">Panjang</div>
              <div className="mt-0.5 text-sm font-bold text-[#1D2B29]">{minggu.length}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs text-[#536961]">Berat</div>
              <div className="mt-0.5 text-sm font-bold text-[#1D2B29]">{minggu.weight}</div>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <h2 className="text-lg font-bold text-[#1D2B29]">Perkembangan minggu ini</h2>
          <ul className="mt-3 space-y-3">
            {minggu.milestones.map((milestone) => (
              <li key={milestone} className="flex items-start gap-3 text-sm leading-relaxed text-[#33443F]">
                <span className="mt-2 size-2 shrink-0 rounded-full bg-[#7AAE9A]" />
                <span>{milestone}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-7 rounded-[20px] bg-white p-4 ring-1 ring-[#D9E7E2]">
          <h2 className="text-base font-bold text-[#1D2B29]">Yang mungkin Bunda rasakan</h2>
          <div className="mt-2 text-sm leading-relaxed text-[#33443F]">{minggu.mom}</div>
        </section>

        <section className="mt-5 rounded-[20px] bg-[#FFF1E8] p-4">
          <div className="flex items-center gap-2 text-[#7A4310]">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            <h2 className="text-sm font-bold">Perhatikan</h2>
          </div>
          <div className="mt-2 text-sm leading-relaxed text-[#5E452E]">{minggu.alert}</div>
        </section>

        <section className="mt-5 rounded-[20px] bg-[#EAF4F0] p-4">
          <h2 className="text-sm font-bold text-[#1D2B29]">Tips minggu ini</h2>
          <div className="mt-2 text-sm leading-relaxed text-[#33443F]">{minggu.tip}</div>
        </section>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => pilihMinggu(janinWeeks[Math.max(0, posisiMinggu - 1)].week)}
            disabled={posisiMinggu === 0}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[#33443F] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6E54] disabled:opacity-40"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Minggu sebelumnya
          </button>
          <button
            type="button"
            onClick={() => pilihMinggu(janinWeeks[Math.min(janinWeeks.length - 1, posisiMinggu + 1)].week)}
            disabled={posisiMinggu === janinWeeks.length - 1}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#4A6E54] px-4 text-sm font-bold text-white transition-colors hover:bg-[#3D5C46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6E54] focus-visible:ring-offset-2 disabled:opacity-40"
          >
            Minggu berikutnya <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 text-center text-xs leading-relaxed text-[#536961]">
          Ilustrasi dan ringkasan mengikuti minggu yang tersedia pada materi edukasi.
        </div>
      </main>
    </div>
  )
}
