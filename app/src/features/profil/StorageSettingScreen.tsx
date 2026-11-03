import { useEffect, useState } from "react"
import { ChevronLeft, Database, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { db } from "@/data/db"

export default function StorageSettingScreen({ onBack }: { onBack: () => void }) {
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [estimate, setEstimate] = useState<{ usage?: number; quota?: number } | null>(null)
  const [clearing, setClearing] = useState(false)

  const refreshStorage = async () => {
    try {
      if (navigator.storage?.persisted) setPersisted(await navigator.storage.persisted())
      if (navigator.storage?.estimate) setEstimate(await navigator.storage.estimate())
    } catch { /* Estimasi storage tidak tersedia di semua browser. */ }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Read browser storage estimates on entry; API results update asynchronously.
    void refreshStorage()
  }, [])

  const handlePersist = async () => {
    try {
      if (navigator.storage?.persist) {
        setPersisted(await navigator.storage.persist())
        await refreshStorage()
      }
    } catch { /* Permintaan persist bersifat best-effort menurut browser. */ }
  }

  const handleClear = async () => {
    if (!confirm("Hapus semua data di perangkat ini? Data yang belum dikirim ke akun akan hilang.")) return
    setClearing(true)
    try {
      await db.delete()
      window.location.reload()
    } finally {
      setClearing(false)
    }
  }

  const usageMb = estimate?.usage ? (estimate.usage / 1024 / 1024).toFixed(2) : null
  const quotaMb = estimate?.quota ? (estimate.quota / 1024 / 1024).toFixed(0) : null
  const usagePercent = estimate?.usage && estimate.quota ? Math.min(100, Math.round((estimate.usage / estimate.quota) * 100)) : null
  const canPersist = typeof navigator !== "undefined" && typeof navigator.storage?.persist === "function"

  return (
    <div className="-mx-4 -mt-5">
      <header className="rounded-b-[32px] bg-[#4A6E54] px-6 pb-6 pt-[max(1.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-[#4A6E54] transition-transform active:scale-95">
            <ChevronLeft className="size-5" />
          </button>
          <div>
            <h1 className="!m-0 text-lg font-bold leading-tight">Data di perangkat</h1>
            <p className="mt-0.5 text-xs text-white/90">Penyimpanan dan pengiriman data</p>
          </div>
        </div>
      </header>

      <div className="space-y-3.5 px-4 pb-6 pt-5">
        <section className="space-y-3 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-white text-[#4A6E54] ring-1 ring-[#D9E7E2]"><Database className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Perlindungan data</h2>
              <p className="mt-0.5 text-xs text-[#33443F]">Utamakan penyimpanan di perangkat ini</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${persisted ? "bg-[#EDF6EF] text-[#2E7D32]" : persisted === false ? "bg-[#FFF8EC] text-[#8A6D00]" : "bg-white text-[#536961]"}`}>
              {persisted === null ? "Memeriksa" : persisted ? "Aktif" : "Belum aktif"}
            </span>
          </div>

          <div className="space-y-3 rounded-[16px] bg-white p-3">
            <p className="text-xs leading-relaxed text-[#33443F]">Browser bisa menghapus data lama. Aktifkan perlindungan agar data SIAGA Bunda lebih diprioritaskan.</p>
            {usageMb && (
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#1D2B29]">Ruang dipakai</span>
                  <span className="text-[#33443F]">{usageMb} MB{quotaMb ? ` dari ${quotaMb} MB` : ""}</span>
                </div>
                {usagePercent !== null && <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E2EFEA]"><div className="h-full rounded-full bg-[#4A6E54]" style={{ width: `${usagePercent}%` }} /></div>}
              </div>
            )}
          </div>
          {persisted === false && canPersist && (
            <Button className="min-h-12 w-full rounded-full bg-[#4A6E54] text-sm font-bold text-white hover:bg-[#3D5C46]" onClick={() => void handlePersist()}>
              Aktifkan perlindungan
            </Button>
          )}
          {!canPersist && <p className="text-xs text-[#536961]">Perlindungan penyimpanan tidak tersedia di browser ini.</p>}
        </section>

        <section className="space-y-2.5 rounded-[24px] bg-[#FDECEC] p-3.5">
          <div className="flex items-center gap-2 text-[#8E1F1F]">
            <Trash2 className="size-4" />
            <h2 className="!m-0 text-sm font-bold">Hapus data di perangkat</h2>
          </div>
          <p className="text-xs leading-relaxed text-[#6D2525]">Semua data SIAGA Bunda di perangkat ini akan dihapus, termasuk data yang belum dikirim ke akun. Data yang belum dikirim akan hilang.</p>
          <Button variant="outline" className="min-h-11 w-full rounded-full border-[#E57373] bg-white text-sm font-semibold text-[#C62828] hover:bg-[#FFF8F8]" disabled={clearing} onClick={() => void handleClear()}>
            <Trash2 className="size-4" /> {clearing ? "Menghapus" : "Hapus data di perangkat"}
          </Button>
          <p className="text-[11px] leading-relaxed text-[#6D2525]">Data yang sudah dikirim ke akun tetap tersimpan.</p>
        </section>
      </div>
    </div>
  )
}
