import { ChevronRight } from "lucide-react"
import { janinIllustrationPath, nearestJaninWeek } from "@/features/edukasi/janinWeekData"

type Props = {
  gestationalWeek: number | null
  onOpenEducation: () => void
  onOpenProfile: () => void
}

export default function FetalDevelopmentCard({ gestationalWeek, onOpenEducation, onOpenProfile }: Props) {
  const material = gestationalWeek === null ? null : nearestJaninWeek(gestationalWeek)

  return (
    <section data-tour="fetal-development" className="overflow-hidden rounded-[24px] bg-white ring-1 ring-[#D9E7E2]">
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <p className="text-xs font-bold text-[#4A6E54]">PERKEMBANGAN JANIN</p>
          {material && (
            <>
              <h2 className="mt-1 text-lg font-extrabold text-[#1D2B29]">Usia kehamilan {gestationalWeek} minggu</h2>
              <p className="text-sm font-semibold text-[#536961]">Materi minggu ke-{material.week}, sebesar {material.fruit}</p>
            </>
          )}
        </div>
        {material && <span className="rounded-full bg-[#EAF4F0] px-3 py-1.5 text-xs font-bold text-[#4A6E54]">Trimester {material.trimester}</span>}
      </div>
      {material ? (
        <>
          <div className="mt-3 bg-[#FFFDEC]">
            <img src={janinIllustrationPath(material.week)} alt={`Ilustrasi perkembangan janin minggu ke-${material.week}`} className="h-44 w-full object-contain" />
          </div>
          <button type="button" onClick={onOpenEducation} className="flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-bold text-[#4A6E54] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4A6E54]">
            Pelajari perkembangan janin <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </>
      ) : (
        <div className="px-4 pb-4 pt-2">
          <p className="text-sm leading-relaxed text-[#536961]">Lengkapi HPHT di profil untuk melihat ilustrasi perkembangan janin yang sesuai.</p>
          <button type="button" onClick={onOpenProfile} className="mt-3 min-h-11 rounded-full bg-[#4A6E54] px-5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D2B29]">
            Lengkapi profil
          </button>
        </div>
      )}
    </section>
  )
}
