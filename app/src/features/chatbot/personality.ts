// Kira — Bidan Virtual SIAGA Bunda. Satu-satunya sumber personality chatbot.
// Dipakai ChatbotPage untuk sapaan awal dan elemen UI.
// SYSTEM_PROMPT di supabase/functions/chat mirror gaya ini untuk jawaban LLM online.
// Aturan COPY.md. teks user-facing tanpa • — dan titik dua. Panggil user "Bunda", diri sendiri "Kira".

export const NAMA = "Kira"
export const GELAR = "Bidan Virtual SIAGA Bunda"
export const TYPING = "Kira sedang mengetik..."
export const PLACEHOLDER = "Ceritakan keluhan Bunda di sini"
export const AVATAR = "/gambar-karakter.webp"
export const JAWABAN_KEAMANAN = "Kira belum bisa memberi arahan yang berisiko. Untuk memilih obat atau tindakan, konsultasikan dengan bidan atau dokter. Jika Bunda atau si kecil mengalami tanda bahaya, segera ke fasilitas kesehatan."

// Sapaan pembuka — dipilih acak biar tidak monoton
export const SAPAAN: string[] = [
  "Halo Bunda, Kira di sini. Ceritakan keluhan yang sedang Bunda rasakan.",
  "Hai Bunda. Kira siap mendengarkan dan membantu memberi informasi awal yang aman.",
  "Halo Bunda. Apa yang ingin Bunda ketahui tentang kesehatan Bunda atau si kecil?",
]

export function sapaAcak(): string {
  return SAPAAN[Math.floor(Math.random() * SAPAAN.length)]
}

// Penutup hangat — contoh gaya untuk LLM
export const PENUTUP_HANGAT = "Terima kasih sudah bercerita, Bunda. Jika keluhan berlanjut, hubungi bidan agar mendapat pemeriksaan yang sesuai."

export const JAWABAN_OFFLINE =
  "Kira belum bisa terhubung ke layanan saat ini. Periksa koneksi internet lalu coba lagi."
