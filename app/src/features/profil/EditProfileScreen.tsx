import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"
import { db } from "@/data/db"
import { syncProfile } from "@/data/sync"
import type { Profile } from "@/data/db"

// S-08: email dan nomor telepon ditampilkan sebagai identitas akun.
export default function EditProfileScreen({ profile, onBack, onSaved }: { profile: Profile; onBack: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    nama: profile.nama,
    tanggal_lahir: profile.tanggal_lahir,
    hpht: profile.hpht,
    gravida: profile.gravida,
    para: profile.para,
    abortus: profile.abortus,
    fasyankes: profile.fasyankes,
    nama_bidan: profile.nama_bidan,
  })
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setErr(null)
    if (!form.nama.trim()) return setErr("Nama wajib diisi")
    if (!form.hpht) return setErr("HPHT wajib diisi")
    if (new Date(form.hpht) > new Date()) return setErr("HPHT tidak boleh di masa depan")
    if (form.para > form.gravida) return setErr("Para tidak boleh lebih dari gravida")
    setLoading(true)
    try {
      const now = new Date().toISOString()
      const row: Profile = { ...profile, nama: form.nama.trim(), tanggal_lahir: form.tanggal_lahir, hpht: form.hpht, gravida: Number(form.gravida), para: Number(form.para), abortus: Number(form.abortus), fasyankes: form.fasyankes, nama_bidan: form.nama_bidan, updatedAt: now }
      await db.profiles.put(row)
      await syncProfile(row)
      onSaved()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="-mx-4 -mt-5">
      <header className="rounded-b-[32px] bg-[#4A6E54] px-6 pb-6 pt-[max(1.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} aria-label="Kembali" className="grid size-11 shrink-0 place-items-center rounded-full bg-white/95 text-[#4A6E54] transition-transform active:scale-95">
            <ChevronLeft className="size-5" />
          </button>
          <div>
            <h1 className="!m-0 text-lg font-bold leading-tight">Ubah Profil</h1>
            <p className="mt-0.5 text-xs text-white/90">Perbarui Informasi Bunda</p>
          </div>
        </div>
      </header>

      <div className="space-y-3.5 px-4 pb-6 pt-5">
        <section className="space-y-3 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-lg font-bold text-[#1D2B29]">Data Diri</h2>
          <div className="space-y-1.5 mt-2">
            <Label className="text-xs font-medium text-[#33443F]">Nama Bunda</Label>
            <Input value={form.nama} onChange={(e) => setForm((s) => ({ ...s, nama: e.target.value }))} className="h-11 rounded-[14px] border-[#D9E7E2] bg-white px-3" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label className="text-xs font-medium text-[#33443F]">Email</Label>
            <Input type="email" value={profile.email || "Belum diisi"} disabled aria-label="Email akun terkunci" className="h-11 rounded-[14px] border-[#D9E7E2] bg-[#F1F5F2] px-3 text-sm text-[#6C757D] disabled:opacity-100" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs font-medium text-[#33443F]">Tanggal lahir</Label>
              <DateInput value={form.tanggal_lahir} onChange={(value) => setForm((s) => ({ ...s, tanggal_lahir: value }))} aria-label="Tanggal lahir" className="h-11 rounded-[14px] border-[#D9E7E2] bg-white px-3 text-sm text-[#33443F]" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label className="text-xs font-medium text-[#33443F]">Nomor telepon</Label>
              <Input type="tel" value={profile.noHp || "Belum diisi"} disabled aria-label="Nomor telepon" className="h-11 rounded-[14px] border-[#D9E7E2] bg-[#F1F5F2] px-3 text-sm text-[#6C757D] disabled:opacity-100" />
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-lg font-bold text-[#1D2B29]">Data Kehamilan</h2>
          <div className="space-y-1.5 mt-2">
            <Label className="text-xs font-medium text-[#33443F]">HPHT</Label>
            <DateInput value={form.hpht} onChange={(value) => setForm((s) => ({ ...s, hpht: value }))} aria-label="Hari pertama haid terakhir" className="h-11 rounded-[14px] border-[#D9E7E2] bg-white px-3 text-sm text-[#33443F]" />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { key: "gravida", label: "Gravida", value: form.gravida },
              { key: "para", label: "Para", value: form.para },
              { key: "abortus", label: "Abortus", value: form.abortus },
            ].map((field) => (
              <div key={field.key} className="min-w-0 space-y-1.5">
                <Label className="text-xs font-medium text-[#33443F]">{field.label}</Label>
                <Input type="number" value={field.value} onChange={(e) => setForm((s) => ({ ...s, [field.key]: Number(e.target.value) }))} aria-label={field.label} className="h-11 rounded-[14px] border-[#D9E7E2] bg-white px-2 text-center text-sm" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <h2 className="!m-0 text-lg font-bold text-[#1D2B29]">Pendamping</h2>
          <div className="space-y-1.5 mt-2">
            <Label className="text-xs font-medium text-[#33443F]">Fasilitas kesehatan</Label>
            <Input value={form.fasyankes} onChange={(e) => setForm((s) => ({ ...s, fasyankes: e.target.value }))} placeholder="Nama puskesmas atau klinik" className="h-11 rounded-[14px] border-[#D9E7E2] bg-white px-3" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-[#33443F]">Nama bidan</Label>
            <Input value={form.nama_bidan} onChange={(e) => setForm((s) => ({ ...s, nama_bidan: e.target.value }))} placeholder="Nama bidan pendamping" className="h-11 rounded-[14px] border-[#D9E7E2] bg-white px-3" />
          </div>
        </section>

        {err && <p role="alert" className="text-center text-xs text-[#C62828]">{err}</p>}
        <Button className="min-h-12 w-full rounded-full bg-[#4A6E54] text-base font-bold text-white hover:bg-[#3D5C46]" disabled={loading} onClick={() => void handleSave()}>
          {loading ? "Menyimpan" : "Simpan perubahan"}
        </Button>
      </div>
    </div>
  )
}
