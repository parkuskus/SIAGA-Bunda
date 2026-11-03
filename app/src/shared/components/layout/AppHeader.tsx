import { Bell } from "lucide-react"

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#EAE6E0] bg-white/90 backdrop-blur-[10px]">
      <div className="mx-auto flex h-[56px] max-w-[480px] items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/logo-siaga-transparent.webp" alt="Logo SIAGA Bunda" className="size-8 rounded-xl bg-white p-1 ring-1 ring-black/5 object-contain" />
          <div className="min-w-0">
            <p className="text-[14px] font-bold leading-none tracking-tight text-[#1E2326]">SIAGA Bunda</p>
            <p className="text-[11px] leading-none text-[#8A8F93] hidden sm:block">Siaga menjaga Bunda</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-[#FFFCF6] text-[#7AAE9A] ring-1 ring-[#EAE6E0]">
            <Bell className="size-4" />
          </span>
          <div className="size-8 rounded-full bg-[#EAF2EC] ring-1 ring-[#7AAE9A]/15 grid place-items-center text-sm font-semibold text-[#5A8A7A]">S</div>
        </div>
      </div>
    </header>
  )
}
