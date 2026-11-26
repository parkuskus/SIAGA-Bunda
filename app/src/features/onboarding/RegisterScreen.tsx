import { useEffect, useRef, useState } from "react"
import { ChevronRight, Eye, EyeOff, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"
import { saveRegistrationDraft, submitRegister, type RegisterInput, validateRegisterInput } from "@/features/onboarding/registerForm"
import { supabase } from "@/data/supabase"
import { hasVerifiedMfaToken, isDuplicateSignup, maskEmail, verifiedRegistrationUserId } from "@/features/onboarding/authFlow"
import { validatePassword } from "@/features/onboarding/passwordPolicy"

type Props = { onBack: () => void; onSuccess: () => void; onToLogin: () => void }

export default function RegisterScreen({ onBack, onSuccess, onToLogin }: Props) {
  const [form, setForm] = useState({
    nama: "",
    tanggalLahir: "",
    email: "",
    noHp: "",
    gravida: 1,
    para: 0,
    abortus: 0,
    hpht: "",
    fasyankes: "",
    namaBidan: "",
  })
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [globalErr, setGlobalErr] = useState<string | null>(null)
  const [step, setStep] = useState<"form" | "otp">("form")
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const boxRefs = useRef<(HTMLInputElement | null)[]>([])
  const otpValue = digits.join("")
  const setDigit = (i: number, v: string) => {
    const d = v.replace(/[^0-9]/g, "").slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[i] = d
      return next
    })
    if (d && i < 5) boxRefs.current[i + 1]?.focus()
  }
  const handleBoxKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) boxRefs.current[i - 1]?.focus()
  }
  const handleBoxPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const t = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6)
    if (!t) return
    e.preventDefault()
    setDigits(t.padEnd(6, " ").split(""))
    boxRefs.current[Math.min(t.length, 5)]?.focus()
  }
  const [otpErr, setOtpErr] = useState<string | null>(null)
  const [otpLoading, setOtpLoading] = useState(false)
  const [emailForOtp, setEmailForOtp] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const [otpNotice, setOtpNotice] = useState<string | null>(null)

  const registrationInput = (): RegisterInput => ({
    nama: form.nama,
    email: form.email.trim().toLowerCase(),
    tanggalLahir: form.tanggalLahir,
    noHp: form.noHp,
    gravida: Number(form.gravida),
    para: Number(form.para),
    abortus: Number(form.abortus),
    hpht: form.hpht,
    fasyankes: form.fasyankes,
    namaBidan: form.namaBidan,
  })

  useEffect(() => {
    if (!resendCooldown) return
    const timer = window.setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [resendCooldown])

  const set = (k: string, v: string | number) => setForm((s) => ({ ...s, [k]: v }))

  const handleRequestOtp = async () => {
    const resending = step === "otp"
    setGlobalErr(null)
    setOtpErr(null)
    setOtpNotice(null)
    setErrs({})
    const tempErrs = validateRegisterInput(registrationInput())
    if (!resending) {
      const passwordError = validatePassword(password, passwordConfirm)
      if (passwordError) {
        if (password.length < 8) tempErrs.password = passwordError
        else tempErrs.passwordConfirm = passwordError
      }
    }
    if (Object.keys(tempErrs).length) {
      setErrs(tempErrs)
      if (resending) setOtpErr("Periksa kembali data Bunda sebelum meminta kode baru.")
      return
    }
    if (!navigator.onLine) {
      const message = "Koneksi internet diperlukan untuk mengirim kode verifikasi. Data belum disimpan."
      if (resending) setOtpErr("Periksa koneksi internet, lalu coba kirim ulang.")
      else setGlobalErr(message)
      return
    }

    setLoading(true)
    let draftSaveFailed = false
    try {
      const normalizedEmail = form.email.trim().toLowerCase()
      setEmailForOtp(normalizedEmail)
      if (resending) {
        const { error } = await supabase.auth.resend({ type: "signup", email: normalizedEmail })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password })
        if (isDuplicateSignup(data.user, error)) {
          throw new Error("Email sudah terdaftar, silakan masuk atau pulihkan sandi.")
        }
        if (error) throw error
        if (data.session) {
          await supabase.auth.signOut({ scope: "local" })
          throw new Error("Konfirmasi email belum aktif. Hubungi pengelola SIAGA Bunda.")
        }
        if (data.user?.id && data.user.email?.toLowerCase() === normalizedEmail) {
          try {
            await saveRegistrationDraft(registrationInput(), data.user.id)
          } catch {
            draftSaveFailed = true
          }
        }
      }
      setResendCooldown(60)
      setDigits(["", "", "", "", "", ""])
      setStep("otp")
      if (draftSaveFailed) setOtpNotice("Selesaikan verifikasi tanpa menutup halaman. Draf data belum tersimpan di perangkat.")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal mengirim kode OTP"
      const message = msg.toLowerCase().includes("rate limit") ? "Terlalu sering minta kode. Coba lagi beberapa saat." : msg
      if (resending) setOtpErr(message)
      else setGlobalErr(message)
    } finally {
      if (!resending) {
        setPassword("")
        setPasswordConfirm("")
      }
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setOtpErr(null)
    if (otpValue.trim().length < 6) {
      setOtpErr("Kode 6 digit wajib diisi")
      return
    }
    const isOnline = typeof navigator !== "undefined" && navigator.onLine
    if (isOnline) {
      setOtpLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        let userId = verifiedRegistrationUserId(session, emailForOtp)
        if (!userId) {
          const { data, error } = await supabase.auth.verifyOtp({
            email: emailForOtp,
            token: otpValue.trim(),
            type: "signup",
          })
          if (error) throw error
          if (!hasVerifiedMfaToken(data.session?.access_token)) {
            await supabase.auth.signOut({ scope: "local" })
            throw new Error("Verifikasi belum aman. Silakan masuk kembali.")
          }
          userId = data.user?.id ?? data.session?.user?.id ?? null
        }
        if (!userId) throw new Error("Verifikasi berhasil tapi sesi tidak ditemukan")
        const { data: existingProfile, error: profileError } = await supabase.from("profiles")
          .select("id").eq("id", userId).maybeSingle()
        if (profileError) throw profileError
        if (existingProfile) {
          try { localStorage.removeItem("siaga_demo_user_id") } catch { /* Pendaftaran akun tetap lanjut tanpa storage browser. */ }
          onSuccess()
          return
        }
        await submitRegister(registrationInput(), userId)
        try { localStorage.removeItem("siaga_demo_user_id") } catch { /* Pendaftaran akun tetap lanjut tanpa storage browser. */ }
        onSuccess()
        return
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Kode salah atau kadaluarsa"
        setOtpErr(msg)
        return
      } finally {
        setOtpLoading(false)
      }
    }
    setOtpErr("Kode salah atau kadaluarsa.")
  }

  if (step === "otp") {
    return (
      <div className="min-h-[100dvh] bg-[#FFFCF6] flex flex-col">
        <div className="bg-[#4A6E54] px-6 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))] mx-auto w-full max-w-[480px] rounded-b-[32px]">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setStep("form")} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#4A6E54]">
              <ChevronRight className="size-5 rotate-180" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-extrabold tracking-tight text-white">Masukkan kode OTP</h1>
              <p className="text-xs text-white/90">Langkah 2 dari 2</p>
            </div>
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#DB2777]">
              <Mail className="size-5" />
            </span>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[480px] flex-1 px-6 pb-6 -mt-6">
          <p className="text-center text-[13px] text-[#33443F]">Kode 6 digit dikirim ke {maskEmail(emailForOtp)}</p>
          <div className="mt-4 rounded-[24px] bg-[#EAF4F0] p-4 space-y-4">
            <div className="flex items-center justify-center gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    boxRefs.current[i] = el
                  }}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => handleBoxKey(i, e)}
                  onPaste={handleBoxPaste}
                  inputMode="numeric"
                  maxLength={1}
                  aria-label={`Digit ${i + 1}`}
                  className={`size-11 rounded-[14px] text-center text-xl font-bold outline-none transition ${
                    d ? "bg-[#FFE2E2] text-[#9D2553]" : "bg-white text-[#1D2B29] ring-1 ring-[#D9E7E2]"
                  } focus:ring-2 focus:ring-[#4A6E54]`}
                />
              ))}
            </div>
            {otpErr && <p role="alert" className="text-xs text-[#E57373] text-center">{otpErr}</p>}
            {otpNotice && <p role="status" className="text-xs text-[#33443F] text-center">{otpNotice}</p>}
            <p className="text-center text-xs text-[#33443F]">Gunakan kode terbaru sebelum kedaluwarsa</p>
            <Button onClick={handleVerifyOtp} disabled={otpLoading} className="w-full rounded-full bg-[#4A6E54] hover:bg-[#3D5C46] py-3.5 text-sm font-semibold text-white">
              {otpLoading ? "Memeriksa" : "Verifikasi"}
            </Button>
            <button onClick={handleRequestOtp} disabled={loading || otpLoading || resendCooldown > 0} className="w-full text-center text-sm font-medium text-[#33443F] disabled:opacity-50">
              {loading ? "Mengirim kode" : resendCooldown > 0 ? `Kirim ulang dalam ${resendCooldown} detik` : "Kirim ulang kode"}
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-[#33443F]">Periksa kotak masuk dan folder spam</p>
        </div>
        <div className="relative mx-auto mt-auto w-full max-w-[480px]">
          <img src="/illu/illu-11-florist-2.webp" alt="" aria-hidden className="pointer-events-none w-full select-none object-cover" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-[#FFFCF6] flex flex-col">
      <div className="bg-[#4A6E54] px-6 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))] mx-auto w-full max-w-[480px] rounded-b-[32px]">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[#4A6E54]">
            <ChevronRight className="size-5 rotate-180" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold tracking-tight text-white">Daftar Akun Baru</h1>
            <p className="text-xs text-white/90">Langkah 1 dari 2</p>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[480px] flex-1 px-6 pb-6 mt-2 space-y-3.5">
        <div className="rounded-[24px] bg-[#EAF4F0] p-3.5 space-y-3">
          <p className="text-lg font-bold text-[#1D2B29]">Data diri ibu</p>
          <div className="space-y-1.5 mt-2">
            <Label className="text-xs text-[#33443F]">Nama lengkap</Label>
            <Input id="register-name" value={form.nama} onChange={(e) => set("nama", e.target.value)} placeholder="cth Siti Aminah" className="h-11 rounded-2xl bg-white" />
            {errs.nama && <p className="text-xs text-[#E57373]">{errs.nama}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#33443F]">Email</Label>
            <Input id="register-email" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="nama@email.com" className="h-11 rounded-2xl bg-white" />
            {errs.email && <p className="text-xs text-[#E57373]">{errs.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="register-password" className="text-xs text-[#33443F]">Sandi</Label>
            <div className="relative">
              <Input id="register-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-2xl bg-white pr-12" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#4A6E54]">
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            <p className="text-xs text-[#52645D]">Minimal 8 karakter</p>
            {errs.password && <p role="alert" className="text-xs text-[#E57373]">{errs.password}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="register-password-confirm" className="text-xs text-[#33443F]">Ulangi sandi</Label>
            <div className="relative">
              <Input id="register-password-confirm" type={showPasswordConfirm ? "text" : "password"} autoComplete="new-password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className="h-11 rounded-2xl bg-white pr-12" />
              <button type="button" onClick={() => setShowPasswordConfirm((value) => !value)} aria-label={showPasswordConfirm ? "Sembunyikan sandi" : "Tampilkan sandi"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#4A6E54]">
                {showPasswordConfirm ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {errs.passwordConfirm && <p role="alert" className="text-xs text-[#E57373]">{errs.passwordConfirm}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#33443F]">Tanggal lahir</Label>
              <DateInput value={form.tanggalLahir} onChange={(value) => set("tanggalLahir", value)} id="register-birthdate" aria-label="Tanggal lahir" className="h-11 rounded-2xl bg-white" />
              {errs.tanggalLahir && <p className="text-xs text-[#E57373]">{errs.tanggalLahir}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#33443F]">Nomor telepon</Label>
              <Input id="register-phone" type="tel" autoComplete="tel" inputMode="tel" value={form.noHp} onChange={(e) => set("noHp", e.target.value)} placeholder="08xxxxxxxxxx" className="h-11 rounded-2xl bg-white" />
              {errs.noHp && <p className="text-xs text-[#E57373]">{errs.noHp}</p>}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] bg-[#EAF4F0] p-3.5 space-y-3">
          <p className="text-lg font-bold text-[#1D2B29]  ">Data kehamilan</p>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="space-y-1 rounded-2xl bg-white px-2 py-2.5 text-center">
              <Label className="text-xs text-[#33443F]">Hamil ke</Label>
              <Input type="number" value={form.gravida} onChange={(e) => set("gravida", Number(e.target.value))} className="rounded-xl bg-white text-center font-bold" />
              {errs.gravida && <p className="text-xs text-[#E57373]">{errs.gravida}</p>}
            </div>
            <div className="space-y-1 rounded-2xl bg-white px-2 py-2.5 text-center">
              <Label className="text-xs text-[#33443F]">Lahiran</Label>
              <Input type="number" value={form.para} onChange={(e) => set("para", Number(e.target.value))} className="rounded-xl bg-white text-center font-bold" />
              {errs.para && <p className="text-xs text-[#E57373]">{errs.para}</p>}
            </div>
            <div className="space-y-1 rounded-2xl bg-white px-2 py-2.5 text-center">
              <Label className="text-xs text-[#33443F]">Keguguran</Label>
              <Input type="number" value={form.abortus} onChange={(e) => set("abortus", Number(e.target.value))} className="rounded-xl bg-white text-center font-bold" />
              {errs.abortus && <p className="text-xs text-[#E57373]">{errs.abortus}</p>}
            </div>
          </div>

          <div className="rounded-2xl bg-[#4A6E54] px-3.5 py-3">
            <Label className="text-xs text-white/90">Hari pertama haid terakhir</Label>
            <DateInput value={form.hpht} onChange={(value) => set("hpht", value)} aria-label="Hari pertama haid terakhir" className="mt-1 rounded-xl bg-white font-bold" />
            {errs.hpht && <p className="text-xs text-[#FFE2E2]">{errs.hpht}</p>}
          </div>

          <div className="rounded-2xl bg-[#FFF1E8] px-3.5 py-2.5">
            <p className="text-xs font-bold text-[#1D2B29]">Usia dan HPL terhitung otomatis</p>
            <p className="text-xs text-[#33443F]">Terisi setelah tanggal HPHT diisi</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#33443F]">Fasyankes tujuan</Label>
            <Input value={form.fasyankes} onChange={(e) => set("fasyankes", e.target.value)} placeholder="Puskesmas Cibangkong" className="rounded-2xl bg-white" />
            {errs.fasyankes && <p className="text-xs text-[#E57373]">{errs.fasyankes}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#33443F]">Nama bidan</Label>
            <Input value={form.namaBidan} onChange={(e) => set("namaBidan", e.target.value)} placeholder="Bidan Wati" className="rounded-2xl bg-white" />
            {errs.namaBidan && <p className="text-xs text-[#E57373]">{errs.namaBidan}</p>}
          </div>
        </div>

        {globalErr && <p className="text-xs text-[#E57373] text-center">{globalErr}</p>}

        <Button onClick={handleRequestOtp} disabled={loading || resendCooldown > 0} className="w-full rounded-full bg-[#4A6E54] hover:bg-[#3D5C46] py-5.5 text-sm font-semibold text-white">
          {loading ? "Mengirim kode" : resendCooldown > 0 ? `Tunggu ${resendCooldown} detik` : "Daftar dan lanjut"}
        </Button>

        <button onClick={onToLogin} className="w-full rounded-full bg-white py-3 text-center text-sm font-medium text-[#33443F] ring-2 ring-[#FFCFCF]">
          Sudah punya akun? Masuk
        </button>
      </div>
      <div className="relative mx-auto mt-auto w-full max-w-[480px]">
        <img src="/illu/illu-11-florist-2.webp" alt="" aria-hidden className="pointer-events-none w-full select-none object-cover" />
      </div>
    </div>
  )
}
