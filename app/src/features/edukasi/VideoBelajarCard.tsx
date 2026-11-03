import { useState } from "react"
import { Play, Video } from "lucide-react"

type Props = { judul: string; deskripsi: string; thumbnail: string; sumber: string }

export default function VideoBelajarCard({ judul, deskripsi, thumbnail, sumber }: Props) {
  const [terbuka, setTerbuka] = useState(false)

  return (
    <section className="overflow-hidden rounded-[22px] bg-[#EAF4F0]">
      <div className="grid min-h-[154px] grid-cols-[minmax(0,1.15fr)_minmax(112px,0.85fr)] items-center gap-1 p-3.5 sm:min-h-[170px] sm:p-4">
        <div className="relative z-10 py-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1.5 text-[11px] font-semibold leading-none text-[#33443F]">
            <Video className="size-3.5" aria-hidden="true" /> Pelajari lewat video
          </span>
          <p className="mt-2 text-[13px] leading-snug text-[#33443F]">{deskripsi}</p>
          <button
            type="button"
            aria-expanded={terbuka}
            onClick={() => setTerbuka((value) => !value)}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#4A6E54] px-3.5 text-xs font-bold text-white transition-colors hover:bg-[#3D5C46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D2B29] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EAF4F0]"
          >
            <Play className="size-3.5 fill-current" aria-hidden="true" />
            {terbuka ? "Tutup video" : "Tonton Video"}
          </button>
        </div>
        <img src={thumbnail} alt="" aria-hidden="true" className="h-[124px] w-full rounded-[16px] object-contain sm:h-[140px]" />
      </div>
      {terbuka && (
        <div className="border-t border-[#D9E7E2] bg-white p-3">
          <p className="mb-2 text-sm font-bold text-[#1D2B29]">{judul}</p>
          <video key={sumber} controls playsInline preload="none" poster={thumbnail} className="w-full rounded-[14px] bg-black" aria-label={judul}>
            <source src={sumber} type="video/mp4" />
            Browser Bunda tidak mendukung pemutaran video.
          </video>
        </div>
      )}
    </section>
  )
}
