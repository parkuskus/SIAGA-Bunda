import { useState } from "react"
import { ChevronLeft, Eye, EyeOff, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/data/supabase"
import { completePasswordReset } from "@/features/onboarding/authFlow"

type Props = { onBack: () => void }

export default function PasswordResetScreen({ onBack }: Props) {
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      await completePasswordReset(supabase.auth, password, confirmation)
      setPassword("")
      setConfirmation("")
      onBack()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal memperbarui sandi. Coba lagi.")
    } finally {
      setPassword("")
      setConfirmation("")
      setLoading(false)
    }
  }

  const handleBack = async () => {
    await supabase.auth.signOut({ scope: "local" })
    onBack()
  }

  return (
    <div className="min-h-[100dvh] bg-[#FFFCF6] flex flex-col">
      <div className="mx-auto flex w-full max-w-[480px] items-center gap-2.5 rounded-b-[32px] bg-[#4A6E54] px-6 pb-12 pt-[max(1.75rem,env(safe-area-inset-top))]">
        <button onClick={handleBack} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-[#4A6E54]">
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1 text-white">
          <h1 className="text-lg font-bold leading-normal">Buat sandi baru</h1>
          <p className="text-xs leading-normal">Perbarui keamanan akun Bunda</p>
        </div>
        <span className="grid size-[52px] shrink-0 place-items-center rounded-[26px] bg-white/95 text-[#DB2777]">
          <ShieldCheck className="size-6" />
        </span>
      </div>

      <div className="mx-auto w-full max-w-[480px] flex-1 space-y-4 px-6 pb-6 pt-6">
        <div className="space-y-1.5">
          <Label htmlFor="reset-password" className="text-xs text-[#33443F]">Sandi baru</Label>
          <div className="relative">
            <Input id="reset-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-2xl border-[#D9E7E2] bg-white pr-12" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#4A6E54]">
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          <p className="text-xs text-[#52645D]">Minimal 8 karakter</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reset-password-confirm" className="text-xs text-[#33443F]">Ulangi sandi baru</Label>
          <div className="relative">
            <Input id="reset-password-confirm" type={showConfirmation ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-12 rounded-2xl border-[#D9E7E2] bg-white pr-12" />
            <button type="button" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? "Sembunyikan sandi" : "Tampilkan sandi"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-[#4A6E54]">
              {showConfirmation ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>

        {error && <p role="alert" className="text-center text-xs text-[#E57373]">{error}</p>}
        <Button onClick={handleSubmit} disabled={loading} className="w-full rounded-full bg-[#4A6E54] px-4 py-5 text-base font-bold text-white hover:bg-[#3D5C46]">
          {loading ? "Menyimpan" : "Simpan sandi"}
        </Button>
      </div>
      <div className="relative mx-auto mt-auto w-full max-w-[480px]">
        <img src="/illu/illu-11-florist-2.webp" alt="" aria-hidden className="pointer-events-none w-full select-none object-cover" />
      </div>
    </div>
  )
}
