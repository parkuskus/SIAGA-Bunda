import { useEffect, useState } from "react"
import { Bell, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCurrentUserId } from "@/data/currentUser"
import { disablePushNotifications, enablePushNotifications, isPushConfigured, isPushLinked, supportsPush } from "@/services/pushNotifications"

export default function NotificationSettingScreen({ onBack }: { onBack: () => void }) {
  const [notifPerm, setNotifPerm] = useState<string>(supportsPush() ? Notification.permission : "unsupported")
  const [userId, setUserId] = useState("")
  const [pushLinked, setPushLinked] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    void getCurrentUserId().then((id) => {
      setUserId(id)
      return isPushLinked(id)
    }).then(setPushLinked).catch(() => setPushLinked(false))
  }, [])

  const handleNotif = async () => {
    setWorking(true)
    setError("")
    try {
      await enablePushNotifications(userId)
      setNotifPerm(Notification.permission)
      setPushLinked(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengaktifkan notifikasi")
      if (typeof Notification !== "undefined") setNotifPerm(Notification.permission)
    } finally {
      setWorking(false)
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
            <h1 className="!m-0 text-lg font-bold leading-tight">Notifikasi</h1>
            <p className="mt-0.5 text-xs text-white/90">Pengingat suplemen dan jadwal periksa</p>
          </div>
        </div>
      </header>

      <div className="space-y-3.5 px-4 pb-6 pt-5">
        <section className="space-y-3 rounded-[24px] bg-[#EAF4F0] p-3.5">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-white text-[#4A6E54] ring-1 ring-[#D9E7E2]"><Bell className="size-5" /></span>
            <div className="min-w-0 flex-1">
            <h2 className="!m-0 text-sm font-bold text-[#1D2B29]">Izin notifikasi</h2>
              <p className="mt-0.5 text-xs text-[#33443F]">Pengingat suplemen dan jadwal periksa</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${pushLinked ? "bg-[#EDF6EF] text-[#2E7D32]" : notifPerm === "denied" ? "bg-[#FDECEC] text-[#C62828]" : "bg-white text-[#536961]"}`}>
              {pushLinked ? "Aktif" : notifPerm === "denied" ? "Izin ditolak" : notifPerm === "unsupported" ? "Tidak tersedia" : "Belum aktif"}
            </span>
          </div>

          <p className="rounded-[16px] bg-white p-3 text-xs leading-relaxed text-[#33443F]">
            {userId === "demo-dummy"
              ? "Saat notifikasi diaktifkan, jadwal dikirim ke akun lewat internet. Perangkat perlu terhubung saat itu."
              : pushLinked
              ? "Pengingat sudah aktif di perangkat ini."
              : !isPushConfigured()
                ? "Pengingat otomatis belum tersedia. Jadwal tetap bisa dilihat di halaman Pengingat."
                : notifPerm === "granted"
                  ? "Izin notifikasi sudah diberikan. Aktifkan pengingat agar tetap diterima saat aplikasi ditutup."
              : notifPerm === "denied"
                ? "Izin notifikasi ditolak. Ubah izinnya melalui pengaturan browser."
                : notifPerm === "unsupported"
                  ? "Browser ini belum bisa menampilkan notifikasi. Jadwal tetap bisa dilihat di halaman Pengingat."
                  : "Aktifkan notifikasi agar mendapat pengingat minum suplemen dan jadwal periksa. Di iPhone atau iPad, tambahkan aplikasi ke layar utama terlebih dahulu."}
          </p>
          {error && <p role="alert" className="rounded-[14px] bg-[#FDECEC] p-3 text-xs text-[#C62828]">{error}</p>}

          {(userId === "demo-dummy" || !userId.startsWith("demo-")) && !pushLinked && isPushConfigured() && notifPerm !== "denied" && notifPerm !== "unsupported" && (
            <div className="pt-3">
              <Button disabled={working || !userId} className="min-h-12 w-full rounded-full bg-[#4A6E54] text-sm font-bold text-white hover:bg-[#3D5C46]" onClick={() => void handleNotif()}>
                {working ? "Mengaktifkan" : notifPerm === "granted" ? "Aktifkan pengingat" : "Aktifkan notifikasi"}
              </Button>
            </div>
          )}
          {pushLinked && <Button disabled={working} variant="outline" className="min-h-12 w-full rounded-full" onClick={async () => {
            setWorking(true)
            try { await disablePushNotifications(); setPushLinked(false) }
            catch { setError("Pengingat belum bisa dimatikan. Periksa koneksi internet, lalu coba lagi.") }
            finally { setWorking(false) }
          }}>Matikan pengingat</Button>}
          <p className="text-xs leading-relaxed text-[#33443F]">Pengingat obat muncul pada jam minum. Jadwal periksa diingatkan dua hari dan satu hari sebelumnya pada pukul 09.00, mengikuti waktu di perangkat.</p>
        </section>
      </div>
    </div>
  )
}
