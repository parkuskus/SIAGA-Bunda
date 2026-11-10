import { lazy, Suspense, useCallback, useEffect, useState } from "react"
import { MessageCircleHeart } from "lucide-react"
import BottomNav from "@/shared/components/layout/BottomNav"
import BirthDialog from "@/shared/components/layout/BirthDialog"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { supabase } from "@/data/supabase"
import { hasVerifiedMfaToken } from "@/features/onboarding/authFlow"
import { db } from "@/data/db"
import { getCurrentUserId } from "@/data/currentUser"
import SyncStatusNotice from "@/features/sync/SyncStatusNotice"
import type { ResultEducationTopic } from "@/features/edukasi/resultTopics"

const BerandaPage = lazy(() => import("@/features/beranda/BerandaPage"))
const SkriningPage = lazy(() => import("@/features/skrining/SkriningPage"))
const EdukasiPage = lazy(() => import("@/features/edukasi/EdukasiPage"))
const PengingatPage = lazy(() => import("@/features/tracker/PengingatPage"))
const ProfilPage = lazy(() => import("@/features/profil/ProfilPage"))
const ChatbotPage = lazy(() => import("@/features/chatbot/ChatbotPage"))
const SplashScreen = lazy(() => import("@/features/onboarding/SplashScreen"))
const RegisterScreen = lazy(() => import("@/features/onboarding/RegisterScreen"))
const LoginScreen = lazy(() => import("@/features/onboarding/LoginScreen"))
const PasswordResetScreen = lazy(() => import("@/features/onboarding/PasswordResetScreen"))

type Tab = "beranda" | "skrining" | "edukasi" | "tracker" | "profil"
type Onboarding = "splash" | "register" | "login" | "reset-password" | "app"

export default function App() {
  const [tab, setTab] = useState<Tab>(() => new URLSearchParams(window.location.search).get("tab") === "tracker" ? "tracker" : "beranda")
  const [isPostpartum, setIsPostpartum] = useState(() => {
    try { return localStorage.getItem("siaga_isPostpartum") === "true" } catch { return false }
  })
  const [showBirth, setShowBirth] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [openMentalFromEdu, setOpenMentalFromEdu] = useState(false)
  const [educationTopic, setEducationTopic] = useState<ResultEducationTopic | null>(null)
  const [onboarding, setOnboarding] = useState<Onboarding>("splash")
  const [showBottomNav, setShowBottomNav] = useState(true)

  const enterApp = useCallback(() => {
    try { localStorage.removeItem("siaga_logged_out") } catch { /* Lanjutkan masuk bila storage browser dibatasi. */ }
    try { setIsPostpartum(localStorage.getItem("siaga_isPostpartum") === "true") } catch { /* Gunakan nilai awal bila storage browser dibatasi. */ }
    setOnboarding("app")
  }, [])
  const consumeMentalDeepLink = useCallback(() => setOpenMentalFromEdu(false), [])
  const openEducationTopic = useCallback((topic: ResultEducationTopic) => {
    setEducationTopic(topic)
    setTab("edukasi")
  }, [])
  const consumeEducationTopic = useCallback(() => setEducationTopic(null), [])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setOnboarding("reset-password")
        return
      }
      if ((event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") && session?.user) {
        if (event === "INITIAL_SESSION" && new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery") {
          setOnboarding("reset-password")
          return
        }
        if (!hasVerifiedMfaToken(session.access_token)) {
          try { localStorage.setItem("siaga_logged_out", "true") } catch { /* RLS tetap menolak sesi tanpa MFA. */ }
          setOnboarding("splash")
          queueMicrotask(() => { void supabase.auth.signOut({ scope: "local" }) })
          return
        }
        try {
          if (localStorage.getItem("siaga_demo_user_id") !== "demo-dummy") {
            localStorage.removeItem("siaga_logged_out")
            localStorage.setItem("siaga_active_user_id", session.user.id)
          }
        } catch { /* Sesi Auth tetap dapat dibuka tanpa localStorage. */ }
        setOnboarding("app")
      }
      if (event === "SIGNED_OUT") {
        try { localStorage.setItem("siaga_logged_out", "true") } catch { /* Auth tetap keluar meski penanda lokal gagal. */ }
        setOnboarding("splash")
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // persist isPostpartum & cek 42 hari nifas selesai → buka kunci hamil lagi
  useEffect(() => {
    try { localStorage.setItem("siaga_isPostpartum", String(isPostpartum)) } catch { /* Status tetap hidup di state aplikasi. */ }
  }, [isPostpartum])

  useEffect(() => {
    // jika nifas sudah lewat 42 hari, otomatis izinkan kembali ke hamil (tapi jangan paksa, biarkan user tap Kembali)
    try {
      const bd = localStorage.getItem("siaga_birth_date")
      if (isPostpartum && bd) {
        const diff = Math.floor((Date.now() - new Date(bd).getTime()) / 86400000)
        if (diff > 42) {
          // biarkan tetap postpartum sampai user konfirmasi, tapi Skrining akan unlock hamil
        }
      }
    } catch { /* Profil lokal bisa tidak tersedia pada mode privat. */ }
  }, [isPostpartum])

  const uk = 28
  const progress = 70
  const countdown = 82
  const hplLabel = "19 Nov 2026"

  if (onboarding === "splash") {
    return (
      <Suspense fallback={null}>
        <SplashScreen
          onAutoMasuk={enterApp}
          onDaftar={() => setOnboarding("register")}
          onMasuk={() => setOnboarding("login")}
        />
      </Suspense>
    )
  }
  if (onboarding === "register") {
    return <Suspense fallback={null}><RegisterScreen onBack={() => setOnboarding("splash")} onSuccess={enterApp} onToLogin={() => setOnboarding("login")} /></Suspense>
  }
  if (onboarding === "login") {
    return <Suspense fallback={null}><LoginScreen onBack={() => setOnboarding("splash")} onSuccess={enterApp} onPasswordRecovery={() => setOnboarding("reset-password")} onToRegister={() => setOnboarding("register")} /></Suspense>
  }
  if (onboarding === "reset-password") {
    return <Suspense fallback={null}><PasswordResetScreen onBack={() => setOnboarding("login")} /></Suspense>
  }

  return (
    <Suspense fallback={null}>
    <div className="min-h-[100dvh] bg-[#FFFCF6] text-[#2E3436]">
      <main className={`mx-auto max-w-[480px] px-4 pt-5 ${showBottomNav ? "pb-28" : "pb-0"}`}>
        <SyncStatusNotice />
        <div className="w-full">
          {tab === "beranda" && (
            <BerandaPage
              uk={uk}
              progress={progress}
              countdown={countdown}
              isPostpartum={isPostpartum}
              setIsPostpartum={setIsPostpartum}
              setShowBirth={setShowBirth}
              setTab={setTab}
              setShowBottomNav={setShowBottomNav}
            />
          )}
          {tab === "skrining" && <SkriningPage setTab={setTab} setShowBirth={setShowBirth} isPostpartum={isPostpartum} setShowBottomNav={setShowBottomNav} initialForm={openMentalFromEdu ? "mental" : null} onInitialFormConsumed={consumeMentalDeepLink} onOpenEducationTopic={openEducationTopic} onOpenChat={() => setShowChat(true)} />}
          {tab === "edukasi" && <EdukasiPage isPostpartum={isPostpartum} initialTopic={educationTopic} onTopicConsumed={consumeEducationTopic} onOpenSkriningMental={() => { if (isPostpartum) return; setOpenMentalFromEdu(true); setTab("skrining") }} />}
          {tab === "tracker" && <PengingatPage setShowBottomNav={setShowBottomNav} />}
          {tab === "profil" && <ProfilPage uk={uk} hplLabel={hplLabel} setShowBottomNav={setShowBottomNav} />}
        </div>
      </main>

      {showBottomNav && <BottomNav active={tab} onChange={setTab} />}

      {/* ponytail: FAB Kira — sheet overlay, BottomNav 5 tab tidak berubah */}
      {showBottomNav && (
        <button
          aria-label="Tanya Kira"
          onClick={() => setShowChat(true)}
          className="fixed bottom-24 right-[max(1rem,calc(50%-240px+1rem))] z-40 grid size-[56px] place-items-center rounded-full bg-[#4A6E54] text-white shadow-lg active:scale-95"
        >
          <MessageCircleHeart className="size-6" />
        </button>
      )}

      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent showCloseButton={false} className="fixed inset-x-auto bottom-0 left-1/2 top-auto flex h-[min(88dvh,760px)] min-h-[420px] w-full max-w-[480px] -translate-x-1/2 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-[28px] rounded-b-none border-0 bg-[#FFFCF6] p-0 ring-0 sm:max-w-[480px]">
          <ChatbotPage onClose={() => setShowChat(false)} />
        </DialogContent>
      </Dialog>

      <BirthDialog
        open={showBirth}
        onOpenChange={setShowBirth}
        onSave={async ({ tanggal, jam, bb, pb }) => {
          const iso = new Date(`${tanggal}T${jam || "00:00"}`).toISOString()
          try { localStorage.setItem("siaga_birth_date", iso) } catch { /* Pencatatan lokal utama tetap dilanjutkan. */ }
          try {
            const uid = await getCurrentUserId()
            await db.bblProfiles.put({ id: uid, userId: uid, dataLahir: iso, apgar: undefined, usiaGestasi: undefined } as never)
            // simpan juga berat/panjang di detail jika ada field
            await db.nifasScreenings.put({ id: `birth-${Date.now()}`, userId: uid, hariKe: 0, parameterVital: { bb, pb, tanggal, jam }, status: "lahir", createdAt: iso } as never)
          } catch { /* UI tetap dapat melanjutkan; kegagalan simpan tidak mengubah alur lama. */ }
          setIsPostpartum(true)
          setShowBirth(false)
          setTab("beranda")
        }}
      />
    </div>
    </Suspense>
  )
}
