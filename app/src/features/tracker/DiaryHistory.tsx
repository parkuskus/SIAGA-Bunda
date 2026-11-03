import { BookOpen, ChevronLeft } from "lucide-react"
import type { DiaryEntry } from "@/data/db"

// S-07c: riwayat diary — judul jadi judul card
export default function DiaryHistory({ entries, onBack }: { entries: DiaryEntry[]; onBack: () => void }) {
  return (
    <div className="-mx-4 -mt-5">
      <header className="rounded-b-[32px] bg-[#4A6E54] px-6 pb-6 pt-[max(1.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-[#4A6E54] transition-transform active:scale-95"><ChevronLeft className="size-5" /></button>
          <div>
            <h1 className="!m-0 text-lg font-bold leading-tight">Riwayat Diary</h1>
            <p className="mt-0.5 text-xs text-white/90">{entries.length} catatan tersimpan</p>
          </div>
        </div>
      </header>

      <div className="space-y-3.5 px-4 pb-6 pt-5">
        {entries.length ? (
          <div className="space-y-2.5 rounded-[24px] bg-[#EAF4F0] p-2.5">
            {entries.map((entry) => (
              <article key={entry.id} className="rounded-[18px] bg-white p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#1D2B29]">{entry.judul || "Tanpa judul"}</p>
                    <p className="text-xs text-[#536961]">{new Date(`${entry.tanggal}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                </div>
                <p className="mt-2.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#33443F]">{entry.teks}</p>
              </article>
            ))}
          </div>
        ) : (
          <section className="rounded-[24px] bg-[#EAF4F0] px-5 py-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-white text-[#4A6E54]"><BookOpen className="size-5" /></span>
            <p className="mt-3 text-sm font-bold text-[#1D2B29]">Belum ada catatan diary</p>
            <p className="mt-1 text-xs leading-relaxed text-[#536961]">Catatan yang Bunda simpan di Ingat akan muncul di sini.</p>
          </section>
        )}
      </div>
    </div>
  )
}
