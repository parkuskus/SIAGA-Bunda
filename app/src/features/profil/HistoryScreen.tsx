import { useState } from "react"
import { ArrowLeft, ChevronDown, Lock, Trash2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { db } from "@/data/db"
import type { ScreeningResult } from "@/data/db"
import { needsRepeat } from "@/features/skrining/screeningCompleteness"
import { needsGiziReview } from "@/features/skrining/giziReview"
import { getScreeningAuditFields, getScreeningGestationalAge } from "./screeningAudit"

const TIPE_LABEL: Record<string, string> = {
  poedji_rochjati: "Faktor Risiko",
  imt_lila: "Status Gizi",
  danger_sign: "Tanda Bahaya",
  preeklamsia: "Preeklamsia",
  dmg: "Diabetes Kehamilan",
  epds: "Kesehatan Mental",
  nifas: "Masa Nifas",
  laktasi: "Laktasi",
  ikterus: "Ikterus",
  hipotiroid: "Hipotiroid",
  weight: "Berat Badan",
}

// S-08a: riwayat kronologis + hasil MERAH dikunci permanen (md:633)
export default function HistoryScreen({ history, onBack, onChanged }: { history: ScreeningResult[]; onBack: () => void; onChanged: () => void }) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const handleDelete = async (r: ScreeningResult) => {
    if (r.kategori === "MERAH") return
    if (!window.confirm(`Hapus riwayat ${TIPE_LABEL[r.tipe] ?? r.tipe}?`)) return
    setDeleting(r.id)
    try {
      // ponytail: hapus lokal saja (syncQueue hanya insert/upsert) — MERAH tidak pernah sampai sini
      await db.screeningResults.delete(r.id)
      onChanged()
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <button onClick={onBack} aria-label="Kembali" className="grid size-11 place-items-center rounded-full bg-white ring-1 ring-[#EAE6E0] text-[#6C757D] hover:bg-[#FFFCF6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6E54] active:scale-[0.98] transition">
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="!m-0 text-[15px] font-bold tracking-tight text-[#1E2326]">Riwayat Skrining</h1>
          <p className="text-xs text-[#8A8F93]">{history.length} cek tersimpan · MERAH terkunci permanen</p>
        </div>
      </div>

      <Card className="rounded-[24px] border-0 bg-white ring-1 ring-black/[0.05] overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="divide-y divide-[#F7F2EB]">
            {history.length ? (
              history.map((r) => {
                const locked = r.kategori === "MERAH"
                const repeat = needsRepeat(r)
                const review = needsGiziReview(r)
                const dot = locked ? "bg-[#E57373]" : repeat ? "bg-[#8A8F93]" : review || r.kategori === "KUNING" ? "bg-[#F5C16C]" : "bg-[#7ACB8A]"
                const badge = locked ? "bg-[#FDECEC] text-[#C62828] ring-[#E57373]/20" : repeat ? "bg-[#F7F2EB] text-[#545C59] ring-[#8A8F93]/25" : review || r.kategori === "KUNING" ? "bg-[#FFF8EC] text-[#8A6D00] ring-[#F5C16C]/20" : "bg-[#EDF6EF] text-[#2E7D32] ring-[#7ACB8A]/20"
                return (
                  <div key={r.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`size-2 shrink-0 rounded-full ${dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#1E2326]">{TIPE_LABEL[r.tipe] ?? r.tipe}</p>
                        <p className="text-xs text-[#8A8F93]">{new Date(r.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · skor {r.skor}</p>
                        {getScreeningGestationalAge(r.detail) && <p className="text-xs text-[#6C757D]">Usia kehamilan {getScreeningGestationalAge(r.detail)}</p>}
                        {repeat && <p className="text-xs font-semibold text-[#8E2424]">Perlu pemeriksaan ulang{locked ? ". Hasil bahaya tetap memerlukan pertolongan." : ""}</p>}
                        {review && !repeat && <p className="text-xs font-semibold text-[#8A5B0A]">Kenaikan BB lebih menurut perkiraan aplikasi. Konsultasikan hasil ini.</p>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${badge}`}>
                        {locked ? "Rujuk" : repeat ? "Cek ulang" : review ? "Tinjau BB" : r.kategori === "KUNING" ? "Waspada" : "Hijau"}
                    </span>
                    {locked ? (
                      <span title="Hasil MERAH tidak dapat dihapus" className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F7F2EB] text-[#8A8F93]">
                        <Lock className="size-3.5" />
                      </span>
                    ) : (
                      <button
                        onClick={() => void handleDelete(r)}
                        disabled={deleting === r.id}
                        aria-label="Hapus riwayat"
                        className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#8A8F93] ring-1 ring-[#EAE6E0] hover:bg-[#FDECEC] hover:text-[#C62828] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6E54] active:scale-[0.98] transition"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      aria-expanded={expanded === r.id}
                      aria-label={`${expanded === r.id ? "Tutup" : "Buka"} data ${TIPE_LABEL[r.tipe] ?? r.tipe}`}
                      className="grid size-11 shrink-0 place-items-center rounded-full text-[#4A6E54] hover:bg-[#EAF4F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6E54]"
                    >
                      <ChevronDown className={`size-4 transition-transform ${expanded === r.id ? "rotate-180" : ""}`} />
                    </button>
                    </div>
                    {expanded === r.id && (
                      <dl className="mt-3 grid gap-2 rounded-2xl bg-[#FFFCF6] p-3 text-xs sm:grid-cols-2">
                        {getScreeningAuditFields(r.detail).map(({ label, value }) => (
                          <div key={label} className="min-w-0">
                            <dt className="font-semibold text-[#6C757D]">{label}</dt>
                            <dd className="break-words text-[#1E2326]">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="p-6 text-center text-sm text-[#8A8F93]">Belum ada riwayat. Lakukan skrining di menu Skrining.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
