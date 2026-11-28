import { useEffect, useState } from "react"
import { Activity, Apple, Baby, Brain, ClipboardList, Droplets, HeartPulse, ShieldCheck, Sun, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import RiskFactorScreen from "@/features/skrining/ibu-hamil/RiskFactorScreen"
import GiziScreen from "@/features/skrining/ibu-hamil/GiziScreen"
import DangerSignScreen from "@/features/skrining/ibu-hamil/DangerSignScreen"
import PreeklamsiaScreen from "@/features/skrining/ibu-hamil/PreeklamsiaScreen"
import DmgScreen from "@/features/skrining/ibu-hamil/DmgScreen"
import MentalScreen from "@/features/skrining/ibu-hamil/MentalScreen"
import NifasScreen from "@/features/skrining/nifas/NifasScreen"
import LaktasiScreen from "@/features/skrining/nifas/LaktasiScreen"
import IkterusScreen from "@/features/skrining/bbl/IkterusScreen"
import HipotiroidScreen from "@/features/skrining/bbl/HipotiroidScreen"
import SkriningResultScreen from "@/features/skrining/components/SkriningResultScreen"
import { getEducationLinkForResult } from "@/features/edukasi/resultTopics"
import type { ResultEducationTopic } from "@/features/edukasi/resultTopics"
import { db } from "@/data/db"
import { getCurrentProfile, getCurrentUserId } from "@/data/currentUser"
import { shareViaWA } from "@/services/exportService"
import { needsRepeat } from "@/features/skrining/screeningCompleteness"
import { needsGiziReview } from "@/features/skrining/giziReview"

type SkriningTab = "hamil" | "nifas" | "bbl"
type ActiveForm = null | "risk" | "gizi" | "danger" | "preeklamsia" | "dmg" | "mental" | "nifas" | "laktasi" | "ikterus" | "hipotiroid"
type AnyResult = { warna: string; kategori?: string; skor?: number; extra?: string; perluUlang?: boolean; perluTinjauGizi?: boolean }

export default function SkriningPage({
  setTab,
  setShowBirth,
  isPostpartum = false,
  setShowBottomNav,
  initialForm = null,
  onInitialFormConsumed,
  onOpenEducationTopic,
  onOpenChat,
}: {
  setTab: (t: "beranda" | "skrining" | "edukasi" | "tracker" | "profil") => void
  setShowBirth: (v: boolean) => void
  isPostpartum?: boolean
  setShowBottomNav: (v: boolean) => void
  initialForm?: ActiveForm
  onInitialFormConsumed?: () => void
  onOpenEducationTopic: (topic: ResultEducationTopic) => void
  onOpenChat: () => void
}) {
  const [skriningTab, setSkriningTab] = useState<SkriningTab>("hamil")
  const [activeForm, setActiveForm] = useState<ActiveForm>(initialForm)
  const [bidanPendamping, setBidanPendamping] = useState<{ nama: string; fasyankes: string }>({ nama: "", fasyankes: "" })
  const [results, setResults] = useState<Record<string, AnyResult & { createdAt?: string }>>({})
  const [activeResult, setActiveResult] = useState<null | {
    tipeKey: string
    tipeLabel: string
    warna: "HIJAU" | "KUNING" | "MERAH"
    kategori: string
    skor?: number | string
    skorLabel?: string
    faktorRisiko: string[]
    faktorAman: string[]
    rekomendasi: string[]
    urgensiLabel: string
    waktuISO: string
    perluTinjauGizi?: boolean
  }>(null)

  const isToday = (iso?: string) => {
    if (!iso) return true
    try {
      const a = new Date(iso).toLocaleDateString("en-CA")
      const b = new Date().toLocaleDateString("en-CA")
      return a === b
    } catch { return true }
  }

  // ponytail: testing mode — ikuti isPostpartum saja, tanpa cek 42 hari
  const isNifasActive = isPostpartum

  const HAMIL_KEYS = ["risk", "gizi", "danger", "preeklamsia", "dmg", "mental"] as const
  const NIFAS_BBL_KEYS = ["nifas", "laktasi", "ikterus", "hipotiroid"] as const

  const relevantKeys = isNifasActive ? (NIFAS_BBL_KEYS as unknown as string[]) : (HAMIL_KEYS as unknown as string[])
  const doneCount = relevantKeys.filter((k) => results[k] && !results[k].perluUlang && isToday((results[k] as { createdAt?: string }).createdAt)).length
  const totalForMode = relevantKeys.length
  const progressPct = totalForMode ? Math.round((doneCount / totalForMode) * 100) : 0

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep the active screening category consistent when postpartum mode changes.
    if (isNifasActive && skriningTab === "hamil") setSkriningTab("nifas")
  }, [isNifasActive, skriningTab])

  useEffect(() => {
    if (initialForm) onInitialFormConsumed?.()
  }, [initialForm, onInitialFormConsumed])

  useEffect(() => {
    setShowBottomNav(activeForm === null && activeResult === null)
  }, [activeForm, activeResult, setShowBottomNav])

  useEffect(() => () => setShowBottomNav(true), [setShowBottomNav])

  useEffect(() => {
    void (async () => {
      try {
        const uid = await getCurrentUserId()
        void getCurrentProfile().then((profile) => {
          setBidanPendamping({ nama: profile?.nama_bidan ?? "", fasyankes: profile?.fasyankes ?? "" })
        }).catch(() => {})
        const all = await db.screeningResults.where("userId").equals(uid).toArray()
        const map: Record<string, AnyResult & { createdAt?: string }> = {}
        const tipeToKey: Record<string, string> = {
          poedji_rochjati: "risk",
          imt_lila: "gizi",
          danger_sign: "danger",
          preeklamsia: "preeklamsia",
          dmg: "dmg",
          epds: "mental",
          nifas: "nifas",
          laktasi: "laktasi",
          ikterus: "ikterus",
          hipotiroid: "hipotiroid",
        }
        for (const r of all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
          const k = tipeToKey[r.tipe] ?? r.tipe
          if (!map[k]) map[k] = { warna: r.kategori, kategori: r.kategori, skor: r.skor, extra: String(r.skor), createdAt: r.createdAt, perluUlang: needsRepeat(r), perluTinjauGizi: needsGiziReview(r) }
        }
        setResults((current) => {
          const latest = { ...map }
          for (const [key, result] of Object.entries(current)) {
            if (!latest[key] || (result.createdAt ?? "") > (latest[key].createdAt ?? "")) latest[key] = result
          }
          return latest
        })
      } catch { /* Hasil terbaru tetap di state lokal sesi ini. */ }
    })()
  }, [])

  const rekomFor = (warna: "HIJAU" | "KUNING" | "MERAH", tipeLabel: string): string[] => {
    const base: Record<string, string[]> = {
      HIJAU: [
        `Lanjutkan kontrol rutin sesuai jadwal ANC di ${tipeLabel.toLowerCase().includes("gizi") ? "posyandu" : "puskesmas"}`,
        "Pantau kondisi harian dan catat keluhan jika muncul",
        "Jaga gizi seimbang, istirahat cukup, dan minum suplemen sesuai anjuran",
      ],
      KUNING: [
        "Hubungi bidan pendamping dalam 24 jam untuk evaluasi lanjutan",
        "Pantau tanda bahaya setiap hari dan catat di buku KIA",
        "Datang ke puskesmas sesuai saran bidan, bawa hasil skrining ini",
      ],
      MERAH: [
        "Segera ke IGD atau puskesmas PONED terdekat, jangan tunda",
        "Hubungi bidan pendamping sekarang dan informasikan hasil skrining",
        "Bawa KTP, buku KIA, dan hasil skrining ini saat rujukan",
      ],
    }
    return base[warna]
  }

  const urgensiFor = (warna: "HIJAU" | "KUNING" | "MERAH") => (warna === "HIJAU" ? "Pantau mandiri" : warna === "KUNING" ? "Kunjungi bidan" : "Segera ke IGD")

  const handleSuccess = (key: string, r: AnyResult, meta?: { tipeLabel: string; faktorRisiko?: string[]; faktorAman?: string[]; skor?: number | string; kategori?: string; skorLabel?: string; rekomendasiTambahan?: string[]; perluTinjauGizi?: boolean }) => {
    const withDate = { ...r, perluUlang: false, createdAt: new Date().toISOString() } as AnyResult & { createdAt: string }
    setResults((prev) => ({ ...prev, [key]: withDate }))
    setActiveForm(null)
    if (meta) {
      const warna = r.warna as "HIJAU" | "KUNING" | "MERAH"
      setActiveResult({
        tipeKey: key,
        tipeLabel: meta.tipeLabel,
        warna,
        kategori: meta.kategori ?? r.kategori ?? warna,
        skor: meta.skor ?? r.skor,
        skorLabel: meta.skorLabel,
        faktorRisiko: meta.faktorRisiko ?? (r.extra ? [r.extra] : []),
        faktorAman: meta.faktorAman ?? (warna === "HIJAU" ? ["Tidak ada tanda bahaya terdeteksi", "Kondisi umum baik"] : []),
        rekomendasi: [...(meta.perluTinjauGizi ? ["Konsultasikan hasil pengukuran berat badan dengan bidan atau dokter"] : []), ...(meta.rekomendasiTambahan ?? []), ...rekomFor(warna, meta.tipeLabel)],
        urgensiLabel: meta.perluTinjauGizi ? "Kenaikan BB perlu ditinjau" : urgensiFor(warna),
        waktuISO: new Date().toISOString(),
        perluTinjauGizi: meta.perluTinjauGizi,
      })
    }
  }

  const handleBagikan = async () => {
    try {
      const uid = await getCurrentUserId()
      await shareViaWA(uid)
    } catch { /* Berbagi tidak wajib untuk meninjau hasil skrining. */ }
  }



  if (activeForm === "risk") {
    return (
      <div className="space-y-4">
        <RiskFactorScreen
          onBack={() => setActiveForm(null)}
          onSuccess={(r) => handleSuccess("risk", { warna: r.warna, kategori: r.kategori, skor: r.skor, extra: r.faktorRisiko.join(", ") }, { tipeLabel: "Faktor Risiko Kehamilan", kategori: r.kategori, skor: r.skor, skorLabel: `Skor ${r.skor} · ${r.kategori}`, faktorRisiko: r.faktorRisiko, faktorAman: (r as { faktorAman?: string[] }).faktorAman ?? [] })}
        />
      </div>
    )
  }
  if (activeForm === "gizi") {
    return (
      <div className="space-y-4">
        <GiziScreen onBack={() => setActiveForm(null)} onOpenProfile={() => { setActiveForm(null); setTab("profil") }} onSuccess={(r) => handleSuccess("gizi", { warna: r.warna, kategori: r.imtKat, extra: `${r.kenaikanAktual} kg, ${r.trajectory}`, perluTinjauGizi: needsGiziReview({ tipe: "imt_lila", kategori: r.warna, detail: { trajectory: r.trajectory } }) }, { tipeLabel: "Status Gizi", kategori: r.imtKat, skor: r.imt.toFixed(1), skorLabel: `IMT ${r.imt.toFixed(1)} · ${r.imtKat}`, faktorRisiko: r.warna === "HIJAU" && r.trajectory !== "lebih" ? [] : [`IMT ${r.imtKat}, LILA ${r.lilaKat}, kenaikan BB ${r.trajectory}`], faktorAman: r.warna === "HIJAU" && r.trajectory !== "lebih" ? [`IMT ${r.imtKat} dan LILA ${r.lilaKat}`, `Kenaikan BB ${r.kenaikanAktual} kg dinilai ${r.trajectory} oleh aplikasi`] : [`Kenaikan BB tercatat ${r.kenaikanAktual} kg`], perluTinjauGizi: needsGiziReview({ tipe: "imt_lila", kategori: r.warna, detail: { trajectory: r.trajectory } }) })} />
      </div>
    )
  }
  if (activeForm === "danger") {
    return (
      <div className="space-y-4">
        <DangerSignScreen onBack={() => setActiveForm(null)} onSuccess={(r) => handleSuccess("danger", { warna: r.kategori }, { tipeLabel: "Tanda Bahaya Kehamilan", kategori: r.kategori, faktorRisiko: r.faktorRisiko, faktorAman: r.faktorAman })} />
      </div>
    )
  }
  if (activeForm === "preeklamsia") {
    return (
      <div className="space-y-4">
        <PreeklamsiaScreen onBack={() => setActiveForm(null)} onSuccess={(r) => handleSuccess("preeklamsia", { warna: r.kategori, extra: `MAP ${r.map}` }, { tipeLabel: "Preeklamsia", kategori: r.kategori, skor: r.map, skorLabel: `MAP ${r.map}`, faktorRisiko: r.faktorRisiko, faktorAman: r.faktorAman, rekomendasiTambahan: r.perluAspirin ? ["Konsultasikan aspirin dosis rendah 75–150 mg ke dokter atau bidan (anjuran tenaga kesehatan bila usia kehamilan di bawah 16 minggu)"] : [] })} />
      </div>
    )
  }
  if (activeForm === "dmg") {
    return (
      <div className="space-y-4">
        <DmgScreen onBack={() => setActiveForm(null)} onSuccess={(r) => handleSuccess("dmg", { warna: r.kategori, extra: r.perluTTGO ? "Perlu TTGO" : "Tidak perlu TTGO" }, { tipeLabel: "Diabetes Kehamilan", kategori: r.kategori, faktorRisiko: r.faktorRisiko, faktorAman: r.faktorAman, rekomendasiTambahan: r.perluTTGO ? ["Lakukan tes TTGO pada UK 24–28 minggu di fasyankes"] : [] })} />
      </div>
    )
  }
  if (activeForm === "mental") {
    return (
      <div className="space-y-4">
        <MentalScreen onBack={() => setActiveForm(null)} onSuccess={(r) => handleSuccess("mental", { warna: r.kategori, skor: r.total }, { tipeLabel: "Kesehatan Mental (EPDS)", kategori: r.kategori, skor: r.total, skorLabel: `EPDS ${r.total}`, faktorRisiko: r.kategori !== "HIJAU" ? [`Skor EPDS ${r.total} — ${r.kategori}`] : [], faktorAman: r.kategori === "HIJAU" ? ["Suasana hati dalam batas normal"] : [] })} />
      </div>
    )
  }
  if (activeForm === "nifas") {
    return (
      <div className="space-y-4">
        <NifasScreen
          onBack={() => setActiveForm(null)}
          onSuccess={(r) => handleSuccess("nifas", { warna: r.warna, kategori: r.kategori, extra: r.warna }, { tipeLabel: "Masa Nifas (MEOWS)", kategori: r.kategori, faktorRisiko: (r as { faktorRisiko?: string[] }).faktorRisiko ?? [], faktorAman: (r as { faktorAman?: string[] }).faktorAman ?? [] })}
        />
      </div>
    )
  }
  if (activeForm === "laktasi") {
    return (
      <div className="space-y-4">
        <LaktasiScreen
          onBack={() => setActiveForm(null)}
          onSuccess={(r) => handleSuccess("laktasi", { warna: r.warna, kategori: r.kategori, extra: r.warna }, { tipeLabel: "Laktasi & Menyusui", kategori: r.kategori, faktorRisiko: (r as { faktorRisiko?: string[] }).faktorRisiko ?? [], faktorAman: (r as { faktorAman?: string[] }).faktorAman ?? [] })}
        />
      </div>
    )
  }
  if (activeForm === "ikterus") {
    return (
      <div className="space-y-4">
        <IkterusScreen
          onBack={() => setActiveForm(null)}
          onSuccess={(r) => handleSuccess("ikterus", { warna: r.warna, kategori: r.kategori, extra: r.warna }, { tipeLabel: "Ikterus Neonatal (Kramer)", kategori: r.kategori, faktorRisiko: (r as { faktorRisiko?: string[] }).faktorRisiko ?? [], faktorAman: (r as { faktorAman?: string[] }).faktorAman ?? [] })}
        />
      </div>
    )
  }
  if (activeForm === "hipotiroid") {
    return (
      <div className="space-y-4">
        <HipotiroidScreen
          onBack={() => setActiveForm(null)}
          onSuccess={(r) => handleSuccess("hipotiroid", { warna: r.warna, kategori: r.kategori, extra: r.warna }, { tipeLabel: "Hipotiroid Kongenital", kategori: r.kategori, faktorRisiko: (r as { faktorRisiko?: string[] }).faktorRisiko ?? [], faktorAman: (r as { faktorAman?: string[] }).faktorAman ?? [] })}
        />
      </div>
    )
  }

  if (activeResult) {
    const relatedEducation = getEducationLinkForResult(activeResult.tipeKey)
    return (
      <SkriningResultScreen
        tipeLabel={activeResult.tipeLabel}
        warna={activeResult.warna}
        kategori={activeResult.kategori}
        skor={activeResult.skor}
        skorLabel={activeResult.skorLabel}
        faktorRisiko={activeResult.faktorRisiko}
        faktorAman={activeResult.faktorAman}
        rekomendasi={activeResult.rekomendasi}
        urgensiLabel={activeResult.urgensiLabel}
        waktuISO={activeResult.waktuISO}
        perluTinjauGizi={activeResult.perluTinjauGizi}
        midwifeName={bidanPendamping.nama}
        facilityName={bidanPendamping.fasyankes}
        educationTitle={relatedEducation?.title}
        mapsQuery="Puskesmas atau Praktik Mandiri Bidan (PMB) terdekat"
        onOpenEducation={relatedEducation ? () => onOpenEducationTopic(relatedEducation.topic) : undefined}
        onOpenChat={onOpenChat}
        onUlangi={() => {
          const k = activeResult.tipeKey as ActiveForm
          setActiveResult(null)
          setActiveForm(k)
        }}
        onBeranda={() => {
          setActiveResult(null)
          setTab("beranda")
        }}
        onBagikan={handleBagikan}
      />
    )
  }

  const menuItems = skriningTab === "hamil" && !isNifasActive
    ? [
        { key: "risk", title: "Skrining Faktor Risiko Kehamilan", sub: "Skrining untuk menilai risiko dari riwayat hamil", icon: <ShieldCheck className="size-6 text-[#DB2777]" />, iconBg: "bg-[#FFE2E2]" },
        { key: "gizi", title: "Skrining Status Gizi", sub: "Skrining untuk memantau gizi Bunda dan janin", icon: <Apple className="size-6 text-[#9A5B00]" />, iconBg: "bg-[#FFF1E8]" },
        { key: "danger", title: "Skrining Tanda Bahaya Kehamilan", sub: "Skrining untuk mengenali tanda yang perlu segera diperiksa", icon: <TriangleAlert className="size-6 text-[#16685C]" />, iconBg: "bg-[#DFF0EA]" },
        { key: "preeklamsia", title: "Skrining Preeklamsia", sub: "Skrining untuk deteksi dini tekanan darah tinggi", icon: <HeartPulse className="size-6 text-[#16685C]" />, iconBg: "bg-[#DFF0EA]" },
        { key: "dmg", title: "Skrining Diabetes Kehamilan", sub: "Skrining untuk cek risiko gula darah saat hamil", icon: <Droplets className="size-6 text-[#9A5B00]" />, iconBg: "bg-[#FFF1E8]" },
        { key: "mental", title: "Suasana Kesehatan Mental", sub: "Skrining untuk memantau suasana hati Bunda", icon: <Brain className="size-6 text-[#DB2777]" />, iconBg: "bg-[#FFE2E2]" },
      ]
    : skriningTab === "nifas" && isPostpartum
      ? [
          { key: "nifas", title: "Skrining Masa Nifas", sub: "Cek harian 0 sampai 42 hari setelah lahiran", icon: <HeartPulse className="size-6 text-[#DB2777]" />, iconBg: "bg-[#FFE2E2]" },
          { key: "laktasi", title: "Skrining Laktasi dan Menyusui", sub: "Cek kecukupan ASI dan masalah menyusui", icon: <Baby className="size-6 text-[#16685C]" />, iconBg: "bg-[#DFF0EA]" },
        ]
      : skriningTab === "bbl" && isPostpartum
        ? [
            { key: "ikterus", title: "Skrining Ikterus Neonatal", sub: "Cek kuning pada bayi dengan zona Kramer", icon: <Sun className="size-6 text-[#9A5B00]" />, iconBg: "bg-[#FFF1E8]" },
            { key: "hipotiroid", title: "Skrining Hipotiroid Kongenital", sub: "Cek TSH dan gejala hipotiroid pada bayi", icon: <Activity className="size-6 text-[#16685C]" />, iconBg: "bg-[#DFF0EA]" },
          ]
        : []

  const emptyMessage = skriningTab === "nifas"
    ? { image: "/illu/illu-06-nifas.webp", alt: "Ibu dan bayi pada masa nifas", title: "Cek nifas akan terbuka setelah melahirkan" }
    : { image: "/illu/illu-07-bayi.webp", alt: "Bayi baru lahir", title: "Cek bayi akan terbuka setelah melahirkan" }

  return (
    <div className="-mx-4 -mt-5">
      <header className="rounded-b-[32px] bg-[#4A6E54] px-6 pb-7 pt-7 text-white">
        <h1 className="text-3xl font-bold leading-normal">Skrining Kesehatan</h1>
        <p className="mt-1 text-xs leading-normal">Jawab singkat hasil warna mudah dipahami</p>
        <div className="mt-2.5 flex items-center gap-2.5 rounded-[20px] bg-white px-3.5 py-2.5 text-[#1D2B29]">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#FFE2E2] text-[#DB2777]"><ClipboardList className="size-[26px]" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold leading-normal">Progress Skrining</p>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#E2EFEA]">
              <div className="h-full rounded-full bg-[#4A6E54] transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs leading-normal py-2">{doneCount} dari {totalForMode} skrining sudah selesai</p>
          </div>
        </div>
      </header>

      <section className="space-y-3.5 rounded-t-[32px] bg-[#FFFCF6] px-6 pb-6 pt-5">
        <div className="flex w-full items-center" role="group" aria-label="Pilihan jenis skrining">
          {(["hamil", "nifas", "bbl"] as SkriningTab[]).map((t) => {
            const lockedHamil = isNifasActive && t === "hamil"
            return (
              <button
                key={t}
                type="button"
                disabled={lockedHamil}
                onClick={() => !lockedHamil && setSkriningTab(t)}
                aria-pressed={skriningTab === t}
                className={`min-h-11 flex-1 rounded-[20px] px-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D2B29] ${skriningTab === t ? "bg-[#4A6E54] font-bold text-white" : "bg-[#EAF4F0] text-[#33443F]"} ${lockedHamil ? "cursor-not-allowed opacity-40" : ""}`}
                title={lockedHamil ? "Terkunci selama masa nifas (42 hari)" : undefined}
              >
                {t === "hamil" ? "Hamil" : t === "nifas" ? "Nifas" : "Bayi"}
              </button>
            )
          })}
        </div>

        <aside aria-label="Petunjuk mengisi formulir" className="rounded-[20px] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#33443F] ring-1 ring-[#D9E7E2]">
          Formulir ini dapat diisi mandiri berdasarkan kondisi Bunda atau buku KIA. Apabila ada bagian yang kurang dipahami, silakan konsultasikan kepada bidan saat pemeriksaan.
        </aside>

        <div className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-2">
          {menuItems.length ? menuItems.map((item) => {
            const result = results[item.key]
            const statusClass = !result
              ? "border border-[#D9E7E2] bg-white text-[#33443F]"
               : result.warna === "MERAH"
                 ? "bg-[#FDECEC] text-[#C62828]"
                 : result.perluUlang
                   ? "bg-[#F7F2EB] text-[#545C59]"
                  : result.perluTinjauGizi || result.warna === "KUNING"
                  ? "bg-[#FFF8EC] text-[#7A5F00]"
                  : "bg-[#EDF6EF] text-[#2E7D32]"
              const statusText = !result ? "Belum" : result.warna === "MERAH" ? "Perlu rujuk" : result.perluUlang ? "Perlu cek ulang" : result.perluTinjauGizi ? "Tinjau BB" : result.warna === "KUNING" ? "Waspada" : "Selesai"
            return (
              <button
                key={item.key}
                onClick={() => setActiveForm(item.key as ActiveForm)}
                className="flex w-full items-center gap-2.5 rounded-[18px] bg-white px-3 py-2.5 text-left transition-colors hover:bg-[#FFFCF6]"
              >
                <span className={`grid size-[46px] shrink-0 place-items-center rounded-[15px] ${item.iconBg}`}>{item.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold leading-tight text-[#1D2B29]">{item.title}</span>
                   <span className="block text-xs leading-tight text-[#33443F]">{item.sub}</span>
                   {result?.perluUlang && <span className="block text-xs font-semibold text-[#8E2424]">Perlu pemeriksaan ulang</span>}
                </span>
                <span className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-bold leading-normal ${statusClass}`}>{statusText}</span>
              </button>
            )
          }) : skriningTab === "hamil" ? (
            <div className="flex flex-col items-center p-6 text-center">
              <p className="text-sm font-semibold text-[#1E2326]">Skrining hamil terkunci</p>
              <p className="mt-2 max-w-[28ch] text-xs leading-relaxed text-[#8A8F93]">Mode nifas aktif. Ubah ke hamil dari tombol Kembali di Beranda untuk testing.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center p-6 text-center">
              <img src={emptyMessage.image} alt={emptyMessage.alt} className="h-32 w-auto object-contain" />
              <p className="mt-4 max-w-[22ch] text-sm font-semibold text-[#1E2326]">{emptyMessage.title}</p>
              <p className="mt-2 max-w-[30ch] text-xs leading-relaxed text-[#8A8F93]">Ketuk Sudah melahirkan di Beranda untuk membuka cek nifas dan bayi.</p>
              <Button size="sm" className="mt-4 rounded-full bg-[#4A6E54] px-6 text-white hover:bg-[#3D5C46]" onClick={() => { setTab("beranda"); setTimeout(() => setShowBirth(true), 200) }}>
                Buka cek
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
