import { useEffect, useState } from "react"
import { BookOpen, Check, TriangleAlert, OctagonAlert, Share2, RotateCcw, Home, MessageCircleHeart, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import EmergencyOverlay from "@/shared/components/EmergencyOverlay"

type Warna = "HIJAU" | "KUNING" | "MERAH"

type Props = {
  tipeLabel: string
  warna: Warna
  kategori: string
  skor?: number | string
  skorLabel?: string
  faktorRisiko: string[]
  faktorAman?: string[]
  rekomendasi: string[]
  urgensiLabel: string
  waktuISO: string
  perluTinjauGizi?: boolean
  mapsQuery?: string
  midwifeName?: string
  facilityName?: string
  educationTitle?: string
  onOpenEducation?: () => void
  onOpenChat: () => void
  onUlangi: () => void
  onBeranda: () => void
  onDaftarSkrining: () => void
  onBagikan: () => void
}

const status: Record<Warna, {
  title: string
  badge: string
  icon: typeof Check
  factorTitle: string
  factorCard: string
  factorDot: string
  number: string
}> = {
  HIJAU: {
    title: "Hasil skrining",
    badge: "HIJAU",
    icon: Check,
    factorTitle: "Yang dinilai",
    factorCard: "bg-[#EDF6EF] ring-[#7ACB8A]/50",
    factorDot: "bg-[#2E7D32]",
    number: "bg-[#4A6E54]",
  },
  KUNING: {
    title: "Perlu perhatian",
    badge: "WASPADA",
    icon: TriangleAlert,
    factorTitle: "Faktor ditemukan",
    factorCard: "bg-[#FFF8EC] ring-[#F5C16C]",
    factorDot: "bg-[#B7791F]",
    number: "bg-[#4A6E54]",
  },
  MERAH: {
    title: "Perlu rujukan segera",
    badge: "BAHAYA",
    icon: OctagonAlert,
    factorTitle: "Tanda bahaya ditemukan",
    factorCard: "bg-[#FDECEC] ring-[#E57373]",
    factorDot: "bg-[#C62828]",
    number: "bg-[#C62828]",
  },
}

export default function SkriningResultScreen({
  tipeLabel,
  warna,
  kategori,
  skor,
  skorLabel,
  faktorRisiko,
  faktorAman = [],
  rekomendasi,
  urgensiLabel,
  waktuISO,
  perluTinjauGizi = false,
  mapsQuery,
  midwifeName = "",
  facilityName = "",
  educationTitle,
  onOpenEducation,
  onOpenChat,
  onUlangi,
  onBeranda,
  onDaftarSkrining,
  onBagikan,
}: Props) {
  const [emergencyOpen, setEmergencyOpen] = useState(warna === "MERAH")
  const cfg = status[perluTinjauGizi && warna === "HIJAU" ? "KUNING" : warna]
  const Icon = cfg.icon
  const factors = perluTinjauGizi && warna === "HIJAU"
    ? (faktorRisiko.length ? faktorRisiko : ["Kenaikan BB perlu ditinjau bersama tenaga kesehatan."])
    : warna === "HIJAU"
    ? (faktorAman.length ? faktorAman : ["Tidak ada faktor tambahan yang teridentifikasi dari jawaban ini."])
    : (faktorRisiko.length ? faktorRisiko : [warna === "MERAH" ? "Tanda bahaya memerlukan pemeriksaan segera." : "Hasil perlu dipantau lebih lanjut."])
  const checkedDate = new Date(waktuISO).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
  const score = skorLabel
    ? skorLabel.replace(/\s*·\s*/, " (") + (skorLabel.includes("·") ? ")" : "")
    : skor !== undefined ? `Skor ${skor} (${kategori})` : kategori

  useEffect(() => {
    if (warna !== "MERAH") return
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("SIAGA Bunda: perlu rujukan segera", { body: `${tipeLabel} — ${kategori}. Segera ke fasyankes.` })
      }
    } catch { /* Berbagi tetap opsional jika API browser tidak tersedia. */ }
  }, [warna, tipeLabel, kategori])

  return (
    <div className="relative -mx-4 -mt-5 flex min-h-[100dvh] flex-col bg-[#FFFCF6]">
      <header className="mx-auto flex w-full max-w-[480px] shrink-0 flex-col items-center rounded-b-[32px] bg-[#4A6E54] px-6 pb-6 pt-6 text-center text-white">
        <h1 className="!m-0 text-xl font-bold leading-tight">Hasil Skrining</h1>
        <div className="mt-2.5 grid size-[120px] place-content-center gap-1 rounded-full bg-white text-[#33443F]">
          <Icon className={`mx-auto size-8 ${perluTinjauGizi && warna === "HIJAU" ? "text-[#B7791F]" : warna === "HIJAU" ? "text-[#2E7D32]" : warna === "KUNING" ? "text-[#B7791F]" : "text-[#C62828]"}`} strokeWidth={2.2} />
          <span className={`text-xs font-extrabold ${perluTinjauGizi && warna === "HIJAU" ? "text-[#8A5B0A]" : warna === "HIJAU" ? "text-[#2E7D32]" : warna === "KUNING" ? "text-[#8A5B0A]" : "text-[#C62828]"}`}>{perluTinjauGizi && warna === "HIJAU" ? "TINJAU BB" : cfg.badge}</span>
        </div>
        <p className="mt-2 text-sm font-bold leading-normal">{score}</p>
        <p className="text-xs leading-normal text-white/90">{tipeLabel}</p>
      </header>

      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-3.5 px-6 pb-5 pt-5">
        {perluTinjauGizi && warna !== "MERAH" && (
          <section role="alert" className="rounded-[24px] bg-[#FFF8EC] p-3.5 ring-1 ring-[#F5C16C]">
            <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Kenaikan BB perlu ditinjau</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#33443F]">Perhitungan menunjukkan kenaikan BB lebih dari perkiraan aplikasi. Warna hasil belum menilai apakah kenaikan ini aman untuk Anda. Bawa hasil ini saat berkonsultasi dengan bidan atau dokter.</p>
          </section>
        )}
        <section className={`rounded-[24px] p-3.5 ring-1 ${cfg.factorCard}`}>
          <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">{cfg.factorTitle}</h2>
          <ul className="mt-2 space-y-1.5">
            {factors.map((factor) => (
              <li key={factor} className="flex gap-2 text-xs leading-relaxed text-[#33443F]">
                <span className={`mt-[5px] size-2 shrink-0 rounded-full ${cfg.factorDot}`} />
                <span className="min-w-0">{factor}</span>
              </li>
            ))}
          </ul>
          {warna !== "HIJAU" && faktorAman.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {faktorAman.map((factor) => (
                <li key={factor} className="flex gap-2 text-xs leading-relaxed text-[#33443F]">
                  <span className={`mt-[5px] size-2 shrink-0 rounded-full ${cfg.factorDot}`} />
                  <span className="min-w-0">{factor}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Langkah berikutnya</h2>
          <p className="mt-1 text-xs font-semibold text-[#33443F]">{urgensiLabel}</p>
          <ol className="mt-3 space-y-2.5">
            {rekomendasi.map((step, index) => (
              <li key={`${index}-${step}`} className="flex items-start gap-2.5">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${cfg.number}`}>{index + 1}</span>
                <p className="min-w-0 flex-1 pt-1 text-xs leading-relaxed text-[#33443F]">{step}</p>
              </li>
            ))}
          </ol>

        </section>

        <section className="space-y-2 rounded-[20px] bg-white p-3.5 ring-1 ring-[#D9E7E2]">
          <div>
            <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Bidan pendamping Anda</h2>
            <p className="mt-1 text-sm font-semibold text-[#1D2B29]">{midwifeName || "Nama bidan belum diisi"}</p>
            <p className="text-xs text-[#33443F]">{facilityName || "Tempat layanan belum diisi"}</p>
            <p className="text-[11px] leading-relaxed text-[#536961]">Nama dan tempat layanan mengikuti data di Profil.</p>
          </div>
          {(!midwifeName || !facilityName) && <p className="text-xs leading-relaxed text-[#536961]">Lengkapi data bidan dan tempat layanan di Profil.</p>}
          <Button onClick={onBagikan} className="min-h-11 w-full rounded-full bg-[#4A6E54] font-bold text-white hover:bg-[#3D5C46]">
            <Share2 className="size-4" /> Bagikan ringkasan
          </Button>
        </section>

        {onOpenEducation && educationTitle && (
          <section className="space-y-2 rounded-[20px] bg-[#EAF4F0] p-3.5">
            <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Materi terkait</h2>
            <p className="text-xs leading-relaxed text-[#33443F]">{educationTitle}</p>
            <Button variant="outline" onClick={onOpenEducation} className="min-h-11 w-full rounded-full border-[#D9E7E2] bg-white font-bold text-[#33443F]">
              <BookOpen className="size-4" /> Baca materi
            </Button>
          </section>
        )}

        <section className="space-y-2 rounded-[20px] bg-[#EAF4F0] p-3.5">
          <p className="text-xs leading-relaxed text-[#33443F]">Kira dapat memberi informasi awal tentang hasil ini. Hasil skrining bukan diagnosis. Untuk diagnosis yang valid, perlu pemeriksaan langsung oleh tenaga kesehatan.</p>
          <Button variant="outline" onClick={onOpenChat} className="min-h-11 w-full rounded-full border-[#D9E7E2] bg-white font-bold text-[#33443F]">
            <MessageCircleHeart className="size-4" aria-hidden="true" /> Tanya Kira tentang hasil ini
          </Button>
        </section>

        <p className="px-1 text-sm leading-relaxed text-[#33443F]">Hasil ini hanya berdasarkan data yang diisi dan diperiksa pada skrining {tipeLabel.toLowerCase()}, serta tidak menilai kondisi lain yang belum diperiksa. Jika muncul keluhan atau tanda bahaya, segera hubungi tenaga kesehatan.</p>

        <p className="px-1 text-xs text-[#6C757D]">Diperiksa {checkedDate}</p>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" onClick={onUlangi} className="min-h-[46px] rounded-full border-[#D9E7E2] bg-white text-[#33443F]">
            <RotateCcw className="size-4" /> Ulangi
          </Button>
          <Button onClick={onBeranda} className="min-h-[46px] rounded-full bg-[#4A6E54] font-bold text-white hover:bg-[#3D5C46]">
            <Home className="size-4" /> Beranda
          </Button>
        </div>
        <Button
          variant="outline"
          aria-label="Daftar skrining"
          disabled={warna === "MERAH" && emergencyOpen}
          onClick={onDaftarSkrining}
          className="min-h-[46px] w-full rounded-full border-[#D9E7E2] bg-white text-[#33443F]"
        >
          <ClipboardList className="size-4" /> Daftar skrining
        </Button>
      </main>

      <div className="relative mx-auto mt-auto w-full max-w-[480px]">
        <img src="/illu/illu-11-florist-2.webp" alt="" aria-hidden className="pointer-events-none w-full select-none object-cover" />
      </div>
      {emergencyOpen && (
        <EmergencyOverlay
          description={`Hasil skrining ${tipeLabel} masuk kategori MERAH. Segera ke IGD atau puskesmas PONED terdekat. Bawa KTP, buku KIA, dan hasil ini.`}
          mapsQuery={mapsQuery || "Puskesmas atau Praktik Mandiri Bidan (PMB) terdekat"}
          onShare={onBagikan}
          onDismiss={() => setEmergencyOpen(false)}
        />
      )}
    </div>
  )
}
