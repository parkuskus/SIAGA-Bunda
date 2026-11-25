import { Home, ClipboardList, BookOpen, Bell, User } from "lucide-react"

type Tab = "beranda" | "skrining" | "edukasi" | "tracker" | "profil"

export default function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-30 border border-[#D9E7E2] bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-[76px] max-w-[480px] items-center justify-between gap-1 px-4">
        {[
          { id: "beranda", label: "Beranda", icon: Home },
          { id: "skrining", label: "Skrining", icon: ClipboardList },
          { id: "edukasi", label: "Belajar", icon: BookOpen },
          { id: "tracker", label: "Ingat", icon: Bell },
          { id: "profil", label: "Saya", icon: User },
        ].map((it) => {
          const isActive = active === (it.id as Tab)
          return (
            <button
              key={it.id}
              data-tour={`nav-${it.id}`}
              onClick={() => onChange(it.id as Tab)}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-11 items-center justify-center rounded-[20px] transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7AAE9A] focus-visible:ring-offset-2 motion-reduce:transition-none ${isActive ? "shrink-0 gap-1.5 bg-[#4A6E54] px-3.5 py-3 text-white" : "min-w-0 flex-1 flex-col gap-0.5 px-1 py-1.5 text-[#33443F] hover:bg-[#EAF4F0]"}`}
            >
              <it.icon className={`shrink-0 ${isActive ? "size-5 text-white" : "size-[22px] text-[#7AAE9A]"}`} strokeWidth={isActive ? 2 : 1.8} />
              <span className={`whitespace-nowrap text-xs leading-normal ${isActive ? "font-bold" : "font-normal"}`}>{it.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
