import { useEffect, useRef, useState } from "react"
import { ChevronLeft, CircleAlert, Eye, EyeOff, LogIn, Mail, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { supabase } from "@/data/supabase"
import { activateDemoAccount, DEMO_EMAIL, DEMO_OTP, DEMO_PASSWORD } from "@/features/onboarding/demoAccount"
import { disablePushNotifications } from "@/services/pushNotifications"
import { loginWithPassword, maskEmail, verifyMfa } from "@/features/onboarding/authFlow"

type Props = { onBack: () => void; onSuccess: () => void; onToRegister: () => void }

export default function LoginScreen({ onBack, onSuccess, onToRegister }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loginWarning, setLoginWarning] = useState<"credentials" | "email" | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"form" | "otp" | "recovery">("form")
  const [recoverySent, setRecoverySent] = useState(false)
  const [otp, setOtp] = useState("")
  const [otpErr, setOtpErr] = useState<string | null>(null)
  const [otpLoading, setOtpLoading] = useState(false)
  const [emailForOtp, setEmailForOtp] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!resendCooldown) return
    const timer = window.setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [resendCooldown])

  const updateOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, "").slice(-1)
    setOtp((current) => {
      const next = current.padEnd(6, " ").split("")
      next[index] = digit
      return next.join("").trimEnd()
    })
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const pasteOtp = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6)
    if (!pasted) return
    event.preventDefault()
    setOtp(pasted)
    otpRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  const handleRequestOtp = async () => {
    const resending = step === "otp"
    setErr(null)
    setOtpErr(null)
    const normalizedEmail = (resending ? emailForOtp : email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      if (resending) setOtpErr("Alamat email tidak valid")
      else setLoginWarning("email")
      return
    }

    if (!resending && normalizedEmail === DEMO_EMAIL) {
      if (password !== DEMO_PASSWORD) {
        setLoginWarning("credentials")
        setPassword("")
        return
      }
      setEmailForOtp(DEMO_EMAIL)
      setOtp("")
      setResendCooldown(0)
      setPassword("")
      setStep("otp")
      return
    }

    if (!navigator.onLine) {
      const message = "Koneksi internet diperlukan untuk masuk. Coba lagi setelah terhubung."
      if (resending) setOtpErr(message)
      else setErr(message)
      return
    }

    setLoading(true)
    if (resending) setResendCooldown(60)
    try {
      if (resending) {
        const { error } = await supabase.functions.invoke("mfa-start", { method: "POST" })
        if (error) throw error
      } else {
        await loginWithPassword(
          supabase.auth,
          () => supabase.functions.invoke("mfa-start", { method: "POST" }),
          normalizedEmail,
          password,
        )
        setResendCooldown(60)
        setEmailForOtp(normalizedEmail)
        setOtp("")
        setStep("otp")
      }
    } catch (error) {
      if (!resending) setResendCooldown(0)
      if (!resending && error instanceof Error && error.message === "Email atau sandi tidak cocok") {
        setLoginWarning("credentials")
        setPassword("")
        return
      }
      const message = resending ? "Kode belum dapat dikirim. Tunggu sebentar lalu coba lagi." : "Kode verifikasi belum dapat dikirim. Coba lagi."
      if (resending) setOtpErr(message)
      else setErr(message)
    } finally {
      if (!resending) setPassword("")
      setLoading(false)
    }
  }

  const handleRequestRecovery = async () => {
    setErr(null)
    setRecoverySent(false)
    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErr("Masukkan alamat email yang valid")
      return
    }
    if (!navigator.onLine) {
      setErr("Koneksi internet diperlukan untuk memulihkan sandi")
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/`,
      })
      if (error) throw error
      setRecoverySent(true)
    } catch {
      setErr("Permintaan belum dapat dikirim. Periksa koneksi lalu coba lagi.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setOtpErr(null)
    if (otp.trim().length < 6) {
      setOtpErr("Kode 6 digit wajib diisi")
      return
    }
    if (emailForOtp === DEMO_EMAIL) {
      if (otp.trim() !== DEMO_OTP) {
        setOtpErr("Kode demo tidak cocok")
        return
      }
      setOtpLoading(true)
      try {
        await disablePushNotifications()
        const { error } = await supabase.auth.signOut({ scope: "local" })
        if (error) throw error
        await activateDemoAccount()
        onSuccess()
      } catch (e) {
        const message = e instanceof Error ? e.message : "Gagal membuka akun demo"
        setOtpErr(message)
      } finally {
        setOtpLoading(false)
      }
      return
    }
    setOtpLoading(true)
    try {
      const { access_token } = await verifyMfa(
        supabase.auth,
        (code) => supabase.functions.invoke("mfa-verify", { body: { code } }),
        otp.trim(),
      )
      const { data, error } = await supabase.auth.getUser(access_token)
      if (error) throw error
      try {
        localStorage.removeItem("siaga_demo_user_id")
        if (data.user) localStorage.setItem("siaga_active_user_id", data.user.id)
      } catch { /* Validasi login tetap berjalan tanpa storage lokal. */ }
      onSuccess()
    } catch (e: unknown) {
      setOtpErr(e instanceof Error ? e.message : "Kode salah atau kedaluwarsa")
    } finally {
      setOtpLoading(false)
    }
  }

  if (step === "otp") {
    return (
      <div className="min-h-[100dvh] bg-[#FFFCF6] flex flex-col">
        <div className="mx-auto flex h-[128px] w-full max-w-[480px] shrink-0 items-center gap-2.5 rounded-b-[32px] bg-[#4A6E54] px-6 pb-[30px] pt-7">
          <button onClick={() => setStep("form")} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-[#4A6E54]">
            <ChevronLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1 text-white">
            <h1 className="text-lg font-bold leading-normal">Masukkan kode OTP</h1>
            <p className="text-xs leading-normal">Langkah 2 dari 2</p>
          </div>
          <span className="grid size-[52px] shrink-0 place-items-center rounded-[26px] bg-white/95 text-[#DB2777]">
            <Mail className="size-7" />
          </span>
        </div>
        <div className="mx-auto w-full max-w-[480px] flex-1 space-y-3.5 px-6 pb-6 pt-6">
           <p className="text-[13px] leading-normal text-[#33443F]">{emailForOtp === DEMO_EMAIL ? `Akun Dummy memakai kode ${DEMO_OTP}. Tidak perlu menunggu OTP dari email.` : `Kode 6 digit dikirim ke ${maskEmail(emailForOtp)}.`}</p>
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 6 }, (_, index) => {
              const digit = otp[index] ?? ""
              const filled = Boolean(digit)
              return (
                <input
                  key={index}
                  ref={(element) => { otpRefs.current[index] = element }}
                  value={digit}
                  onChange={(event) => updateOtpDigit(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && !digit && index > 0) otpRefs.current[index - 1]?.focus()
                  }}
                  onPaste={pasteOtp}
                  inputMode="numeric"
                  maxLength={1}
                  aria-label={`Digit ${index + 1}`}
                  className={`h-[52px] w-11 rounded-[14px] border text-center text-xl font-bold outline-none transition-colors focus:ring-2 focus:ring-[#4A6E54] ${filled ? "border-[#7AAE9A] bg-[#DFF0EA] text-[#4A6E54]" : "border-[#D9E7E2] bg-white text-[#33443F]"}`}
                />
              )
            })}
          </div>
          {otpErr && <p role="alert" className="text-center text-xs text-[#E57373]">{otpErr}</p>}
          <Button onClick={handleVerifyOtp} disabled={otpLoading} className="w-full rounded-full bg-[#4A6E54] px-4 py-5 mt-3 text-base font-bold text-white hover:bg-[#3D5C46]">
            {otpLoading ? "Memeriksa" : "Verifikasi"}
          </Button>
          {emailForOtp !== DEMO_EMAIL && <button onClick={handleRequestOtp} disabled={loading || otpLoading || resendCooldown > 0} className="w-full text-center text-sm font-medium leading-normal text-[#33443F] disabled:opacity-50">
            {loading ? "Mengirim kode" : resendCooldown > 0 ? `Kirim ulang dalam ${resendCooldown} detik` : "Kirim ulang kode"}
          </button>}
        </div>
        <div className="relative mx-auto mt-auto w-full max-w-[480px]">
          <img src="/illu/illu-11-florist-2.webp" alt="" aria-hidden className="pointer-events-none w-full select-none object-cover" />
        </div>
      </div>
    )
  }

  if (step === "recovery") {
    return (
      <div className="min-h-[100dvh] bg-[#FFFCF6] flex flex-col">
        <div className="mx-auto flex w-full max-w-[480px] items-center gap-2.5 rounded-b-[32px] bg-[#4A6E54] px-6 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))]">
          <button onClick={() => { setStep("form"); setErr(null); setRecoverySent(false) }} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-[#4A6E54]">
            <ChevronLeft className="size-5" />
          </button>
          <div className="min-w-0 flex-1 text-white">
            <h1 className="text-lg font-bold leading-normal">Lupa sandi</h1>
            <p className="text-xs leading-normal">Pulihkan akses akun Bunda</p>
          </div>
          <span className="grid size-[52px] shrink-0 place-items-center rounded-[26px] bg-white/95 text-[#DB2777]"><Mail className="size-6" /></span>
        </div>
        <div className="mx-auto w-full max-w-[480px] flex-1 space-y-3.5 px-6 pb-6 pt-6">
          <p className="text-[13px] leading-normal text-[#33443F]">Masukkan email akun untuk menerima tautan pemulihan.</p>
          <Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" aria-label="Email" className="h-12 rounded-2xl border-[#D9E7E2] bg-white px-3.5 text-sm" />
          {err && <p role="alert" className="text-center text-xs text-[#E57373]">{err}</p>}
          {recoverySent && <p role="status" className="text-center text-xs text-[#4A6E54]">Jika email terdaftar, tautan pemulihan akan dikirim.</p>}
          <Button onClick={handleRequestRecovery} disabled={loading} className="w-full rounded-full bg-[#4A6E54] px-4 py-5 text-base font-bold text-white hover:bg-[#3D5C46]">
            {loading ? "Mengirim" : "Kirim tautan"}
          </Button>
        </div>
        <div className="relative mx-auto mt-auto w-full max-w-[480px]">
          <img src="/illu/illu-11-florist-2.webp" alt="" aria-hidden className="pointer-events-none w-full select-none object-cover" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#FFFCF6] flex flex-col">
      <div className="mx-auto flex w-full max-w-[480px] items-center gap-2.5 rounded-b-[32px] bg-[#4A6E54] px-6 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))]">
        <button onClick={onBack} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-[#4A6E54]">
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1 text-white">
          <h1 className="text-lg font-bold leading-normal">Login Akun</h1>
          <p className="text-xs leading-normal">Lanjut Pantau Kesehatan Bunda</p>
        </div>
        <span className="grid size-[52px] shrink-0 place-items-center rounded-[26px] bg-white/95 text-[#DB2777]">
          <LogIn className="size-[26px]" />
        </span>
      </div>

      <div className="mx-auto w-full max-w-[480px] px-6 pb-6 pt-6">
        <Card className="rounded-[24px] border-0 bg-[#EAF4F0] shadow-none">
          <CardContent className="space-y-2.5 p-3.5">
            <p className="text-[13px] leading-normal text-[#33443F]">Email</p>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" aria-label="Email" className="h-12 rounded-2xl border-[#D9E7E2] bg-white px-3.5 text-sm mt-2" />

            <div className="space-y-1.5 pt-1">
              <p className="text-[13px] leading-normal text-[#33443F]">Password</p>
              <div className="relative">
                <Input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-2xl border-[#D9E7E2] bg-white pr-12 text-sm" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#4A6E54]">
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            {err && <p role="alert" className="text-center text-xs text-[#E57373]">{err}</p>}

            <Button onClick={handleRequestOtp} disabled={loading} className="w-full rounded-full bg-[#4A6E54] px-4 py-5 text-base font-bold text-white hover:bg-[#3D5C46]">
                {loading ? "Memeriksa" : "Masuk"}
            </Button>

            <button onClick={() => { setPassword(""); setErr(null); setStep("recovery") }} className="w-full text-right text-sm font-medium text-[#4A6E54] underline underline-offset-2">
              Lupa sandi?
            </button>

            <button onClick={onToRegister} className="w-full text-center text-sm font-medium leading-normal text-[#33443F]">
              Belum punya akun? <span className="underline underline-offset-2">Daftar di sini</span>
            </button>
          </CardContent>
        </Card>
        <div className="mt-3.5 flex items-center justify-center gap-2 text-[#33443F]">
          <ShieldCheck className="size-[18px] shrink-0 text-[#138A7A]" />
          <p className="text-xs leading-normal">Masuk dengan sandi dan kode email</p>
        </div>
      </div>
      <div className="relative mx-auto mt-auto w-full max-w-[480px]">
        <img src="/illu/illu-11-florist-2.webp" alt="" aria-hidden className="pointer-events-none w-full select-none object-cover" />
      </div>
      <Dialog open={loginWarning !== null} onOpenChange={(open) => { if (!open) setLoginWarning(null) }}>
        <DialogContent showCloseButton={false} className="w-[calc(100%-2rem)] max-w-[360px] gap-0 rounded-[24px] border-0 bg-[#FFFCF6] p-5 text-center ring-1 ring-[#D9E7E2]">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#FDE7E5] text-[#B5473C]">
            <CircleAlert className="size-7" aria-hidden="true" />
          </span>
          <DialogTitle className="mt-4 text-lg font-bold text-[#1D2B29]">
            {loginWarning === "email" ? "Email tidak valid" : "Email atau sandi tidak sesuai"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-relaxed text-[#33443F]">
            {loginWarning === "email"
              ? "Masukkan alamat email dengan format yang benar, lalu coba lagi."
              : "Periksa kembali email dan sandi, lalu coba masuk lagi."}
          </DialogDescription>
          <Button onClick={() => setLoginWarning(null)} className="mt-5 min-h-11 w-full rounded-full bg-[#4A6E54] font-bold text-white hover:bg-[#3D5C46]">
            {loginWarning === "email" ? "Perbaiki email" : "Coba lagi"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
