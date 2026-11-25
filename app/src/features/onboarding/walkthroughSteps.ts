export type WalkthroughTab = "beranda" | "skrining" | "edukasi" | "tracker" | "profil"

export type WalkthroughStep = {
  target: string
  tab: WalkthroughTab
  title: string
  description: string
}

const steps: (WalkthroughStep & { pregnancyOnly?: boolean })[] = [
  { target: "home-header", tab: "beranda", title: "Sapaan dan akses cepat", description: "Lonceng membuka jadwal pengingat. Foto profil membawa Bunda ke data diri." },
  { target: "fetal-development", tab: "beranda", title: "Perkembangan janin", description: "Lihat ilustrasi sesuai usia kehamilan dan buka materi yang tersedia setiap dua minggu.", pregnancyOnly: true },
  { target: "pregnancy-summary", tab: "beranda", title: "Ringkasan kehamilan", description: "Pantau usia kehamilan, progres menuju 40 minggu, dan perkiraan lahir. Pada masa nifas, kartu ini merangkum hari pemulihan dan data bayi." },
  { target: "quick-actions", tab: "beranda", title: "Akses cepat", description: "Buka Skrining, catat berat badan, lihat Pengingat, atau langsung ke materi Edukasi." },
  { target: "last-check", tab: "beranda", title: "Skrining terakhir", description: "Lihat status dan tanggal skrining terakhir. Ketuk kartu untuk membuka pemeriksaan." },
  { target: "nav-skrining", tab: "skrining", title: "Skrining kesehatan", description: "Pilih pemeriksaan sesuai kondisi Bunda. Hasil membantu menentukan langkah berikutnya." },
  { target: "nav-edukasi", tab: "edukasi", title: "Belajar dan bertanya", description: "Pilih materi kesehatan ibu dan bayi. Tombol Kira di atas navigasi membuka ruang tanya jawab." },
  { target: "nav-tracker", tab: "tracker", title: "Pengingat dan catatan", description: "Atur jadwal ANC dan suplemen, catat berat badan, serta tulis diary perjalanan Bunda." },
  { target: "nav-profil", tab: "profil", title: "Profil dan riwayat", description: "Perbarui data diri, lihat riwayat skrining, dan buat ringkasan PDF." },
]

export function getWalkthroughSteps(isPostpartum: boolean): WalkthroughStep[] {
  return steps.filter((step) => !step.pregnancyOnly || !isPostpartum)
}
