import { ChevronLeft } from "lucide-react"

export default function SkriningFormShell({
  title,
  subtitle,
  onBack,
  illustration,
  loading = false,
  children,
}: {
  title: string
  subtitle: string
  onBack: () => void
  illustration?: string
  loading?: boolean
  children: React.ReactNode
}) {
  return (
      <div className="-mx-4 -mt-5 flex min-h-[100dvh] flex-col bg-[#FFFCF6]">
      {illustration ? (
        <header className="relative isolate mx-auto min-h-[196px] w-full max-w-[480px] shrink-0 overflow-hidden rounded-b-[34px] bg-[#4A6E54] px-5 pb-9 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div aria-hidden="true" className="absolute -right-5 bottom-5 z-0 size-40 rounded-full bg-[#EAF4F0]" />
          <div aria-hidden="true" className="absolute right-5 top-16 z-0 size-24 rounded-full border border-[#FFE2E2]/80" />
          <div className="relative z-20 flex h-11 items-center">
            <button onClick={onBack} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#4A6E54] ring-1 ring-white/30 transition-transform active:scale-95">
              <ChevronLeft className="size-5" />
            </button>
          </div>
          <div className="relative z-20 mt-4 max-w-[52%] text-white">
            <h1 className="!m-0 text-xl font-bold leading-tight">{title}</h1>
            <p className="mt-1 text-xs leading-relaxed text-white/90">{subtitle}</p>
          </div>
          <img src={illustration} alt="" aria-hidden="true" className="pointer-events-none absolute bottom-1 right-0 z-10 w-[47%] max-w-[190px] select-none object-contain" />
        </header>
      ) : (
        <header className="mx-auto flex w-full max-w-[480px] shrink-0 items-center gap-2.5 rounded-b-[32px] bg-[#4A6E54] px-6 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))]">
          <button onClick={onBack} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-[#4A6E54] transition-transform active:scale-95">
            <ChevronLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1 text-white">
            <h1 className="!m-0 text-lg font-bold leading-tight">{title}</h1>
            <p className="mt-0.5 text-xs leading-normal">{subtitle}</p>
          </div>
        </header>
      )}
      <div className={`relative z-20 mx-auto flex w-full max-w-[480px] flex-1 flex-col pb-5 ${illustration ? "rounded-t-[30px] bg-[#FFFCF6] px-5 pt-5" : "px-6 pt-5"}`}>
        {loading ? <p role="status" aria-live="polite" className="py-8 text-center text-sm text-[#33443F]">Memuat data skrining terakhir</p> : children}
      </div>
      <div className="relative mx-auto mt-auto w-full max-w-[480px]">
        <img src="/illu/illu-11-florist-2.webp" alt="" aria-hidden className="pointer-events-none w-full select-none object-cover" />
      </div>
    </div>
  )
}
