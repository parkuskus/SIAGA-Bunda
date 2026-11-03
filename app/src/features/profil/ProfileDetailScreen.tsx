import { CalendarDays, Check, ChevronLeft, ChevronRight } from "lucide-react"
import type { Profile } from "@/data/db"

function Row({ label, value, verified }: { label: string; value: string; verified?: boolean }) {
  return (
    <div className="border-b border-[#D9E7E2] py-2.5 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[#536961]">{label}</p>
        {verified && <span className="flex items-center gap-1 text-[11px] font-semibold text-[#2E7D32]"><Check className="size-3.5" strokeWidth={3} /> Terverifikasi</span>}
      </div>
      <p className="mt-1 break-words text-[15px] font-semibold leading-snug text-[#1D2B29]">{value || "Belum diisi"}</p>
    </div>
  )
}

// Profil Saya menampilkan identitas autentikasi dan data SIAGA.
function hitungUsia(tglLahir?: string): number | null {
  if (!tglLahir) return null
  const b = new Date(tglLahir)
  const t = new Date()
  let u = t.getFullYear() - b.getFullYear()
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) u--
  return u
}

export default function ProfileDetailScreen({
  profile,
  uk,
  hplLabel,
  gpa,
  verified,
  onBack,
  onEdit,
  onDeleteAccount,
}: {
  profile: Profile
  uk: number | null
  hplLabel: string
  gpa: string
  verified: boolean
  onBack: () => void
  onEdit: () => void
  onDeleteAccount: () => void
}) {
  const usia = hitungUsia(profile.tanggal_lahir)
  const tglLahir = profile.tanggal_lahir
    ? profile.tanggal_lahir.split("-").reverse().join("/")
    : "-"
  const hpht = profile.hpht ? profile.hpht.split("-").reverse().join("/") : "-"

  return (
    <div className="-mx-4 -mt-5">
      <header className="rounded-b-[32px] bg-[#4A6E54] px-6 pb-6 pt-[max(1.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-[#4A6E54] transition-transform active:scale-95">
            <ChevronLeft className="size-5" />
          </button>
          <div>
            <h1 className="!m-0 text-lg font-bold leading-tight">Profil Saya</h1>
            <p className="mt-0.5 text-xs text-white/90">Informasi akun dan kehamilan</p>
          </div>
        </div>
      </header>

      <div className="space-y-3.5 px-4 pb-6 pt-5">
        <section className="rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-lg font-bold text-[#1D2B29]">Data Diri</h2>
          <div className="mt-1">
            <Row label="Nama" value={profile.nama} />
            <Row label="Email" value={profile.email} verified={verified} />
            <Row label="Nomor telepon" value={profile.noHp} />
            <Row label="Usia" value={usia ? `${usia} tahun` : "-"} />
          </div>
        </section>

        <section className="rounded-[24px] bg-[#EAF4F0] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="!m-0 text-lg font-bold text-[#1D2B29]">Data Kehamilan</h2>
            <button onClick={onEdit} className="min-h-11 rounded-full bg-white px-4 text-xs font-bold text-[#4A6E54] ring-1 ring-[#D9E7E2] transition-colors hover:bg-[#F7FAF8]">Ubah</button>
          </div>
          <div className="mt-1">
            <Row label="GPA" value={`${gpa} (Gravida ${profile.gravida}, Para ${profile.para}, Abortus ${profile.abortus})`} />
            <Row label="Tanggal lahir" value={tglLahir} />
            <Row label="HPHT" value={hpht} />
          </div>
          <div className="mt-2 flex items-start gap-2.5 rounded-[16px] bg-white p-3">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-[#4A6E54]" />
            <div className="min-w-0">
              <p className="text-xs text-[#536961]">Usia kehamilan dan HPL</p>
               <p className="mt-1 text-[15px] font-semibold leading-snug text-[#1D2B29]">{uk === null ? "Usia kehamilan belum tersedia" : `Minggu ke-${uk}`}</p>
              <p className="text-sm text-[#33443F]">HPL {hplLabel}</p>
            </div>
          </div>
          <div className="mt-1">
            <Row label="Fasyankes" value={profile.fasyankes} />
            <Row label="Bidan pendamping" value={profile.nama_bidan} />
          </div>
        </section>

        <button onClick={onDeleteAccount} className="flex min-h-12 w-full items-center justify-between rounded-[18px] bg-[#FDECEC] px-4 text-left transition-colors hover:bg-[#FADDDD]">
          <span className="text-sm font-bold text-[#C62828]">Hapus akun</span>
          <ChevronRight className="size-4 text-[#C62828]" />
        </button>
      </div>
    </div>
  )
}
