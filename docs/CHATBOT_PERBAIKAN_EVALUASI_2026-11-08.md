# Hasil Perbaikan dan Evaluasi Chatbot Staging

## Status dan batas

Perubahan Edge Function diterapkan **hanya** pada staging `gjizoreqciqelmkakluz`, versi 5, dengan `verify_jwt=true`. Produksi tidak diubah. Konfigurasi staging menggunakan `google/gemini-3.8-flash` dan `LLM_MAX_TOKENS=1200`; tanpa konfigurasi tersebut default kode tetap 480. Tidak ada perubahan ambang RAG atau aturan klinis.

## Perubahan yang diterapkan

- Stream provider diperiksa untuk `finish_reason=stop` dan penanda `[DONE]`. `length`, finish reason lain/hilang, EOF dini, event rusak, atau error provider tidak dianggap jawaban lengkap. Jawaban parsial tidak disimpan sebagai riwayat jawaban lengkap. Teks yang sempat tampil saat streaming diganti oleh fallback di UI setelah error diterima.
- Budget token dapat dikonfigurasi per lingkungan dan dibatasi 1–4096. Nilai 1200 dipilih untuk staging berdasarkan percobaan awal, bukan sebagai jaminan kelengkapan.
- Log timing untuk respons yang berhasil mencakup ID acak, durasi autentikasi, rate limit, embedding, retrieval, header provider, token provider pertama, delta terlihat pertama, completion, persistence, dan total. Beberapa nilai adalah waktu kumulatif dan tidak boleh semuanya dijumlahkan. Log tidak sengaja memuat prompt, jawaban, identitas, reasoning, atau secret.
- Buffer keselamatan 48 karakter, MFA, RLS, rate limit, dan kebijakan retrieval tetap dipertahankan. Tes regresi mencakup parser provider dan konsumsi stream saat error/EOF.

## Hasil pengujian

Run CLI pertama pada staging memakai lima prompt sintetis: **4 berhasil, 1 gagal**, median first output untuk empat yang berhasil 8.652,5 ms dan p95 13.487 ms. Kegagalan dicatat sebagai `failed`; penyebab spesifiknya tidak ditampilkan oleh evaluator, sehingga tidak boleh diasumsikan sebagai `length`.

Run terpisah memakai lima prompt yang sama menghasilkan lima HTTP 200 dan lima event `done`, dengan waktu total 18.216, 8.803, 8.743, 10.523, dan 10.849 ms. Tiga respons memiliki sumber retrieval, dua tidak. `done` berarti aliran provider memenuhi pemeriksaan protokol, bukan bukti isi benar atau lengkap secara klinis. Ini bukan perbandingan berpasangan terhadap baseline dan sampelnya kecil. Kedua run menimbulkan biaya provider.

Verifikasi lokal: `npm test` 22/22, `npm run build` lulus, dan tes Python konfigurasi ingestion 2/2. Pengujian parser tidak menggantikan uji end-to-end semua jenis error provider, pengujian perangkat, atau evaluasi klinis.

## Pekerjaan yang masih terbuka

- Evaluator belum melaporkan kategori error terpisah, finish reason, penggunaan token/biaya atau ringkasan p50/p95 tiap fase. Log timing staging belum diambil dan dikorelasikan; belum dapat disimpulkan bottleneck terbesar setelah perubahan atau klaim peningkatan latensi.
- Belum ada eksperimen berpasangan 480 vs 1200 dengan konteks RAG yang identik, atau pengujian cold/warm yang cukup. Nilai 1200 masih kandidat staging; biaya dan latensi bisa meningkat.
- Belum dibuat golden set dengan label referensi halaman yang ditinjau bidan/SpOG, belum dihitung recall/precision retrieval, belum dikalibrasi threshold, dan belum ada penilaian klinis atas jawaban. Jangan memakai hasil ini sebagai bukti kesiapan klinis.
- Uji integrasi lengkap untuk safety filter, error provider, fallback embedding dan pemulihan tampilan stream parsial masih perlu dilakukan. Tidak ada deploy produksi atau uji browser/perangkat nyata.

## Praktik evaluasi yang disarankan

Mulai dengan kumpulan kasus sintetis berversi dan rubrik pakar, meliputi kasus umum, tanda bahaya, konteks tanpa sumber yang sesuai, pertanyaan di luar cakupan, percakapan multi-turn dan kasus kegagalan yang pernah ditemukan. Pisahkan pengukuran retrieval, dukungan sumber, kualitas jawaban, keselamatan, latensi dan biaya; lakukan review oleh bidan/SpOG untuk keputusan klinis. Gunakan tes deterministik sebagai gerbang CI dan LLM-as-judge hanya setelah dikalibrasi terhadap label pakar, bukan sebagai pengganti pakar.

[Promptfoo](https://www.promptfoo.dev/docs/guides/evaluate-rag/) cocok untuk eksperimen lokal dan regresi CI; [Langfuse](https://langfuse.com/academy/datasets/designing-great-datasets) cocok bila tim memerlukan dataset, penilaian manusia dan observabilitas terpusat. Mulai dari skrip lokal yang sudah ada, lalu pilih platform bila kebutuhan kolaborasi menuntutnya. Jangan kirim data pasien, prompt, jawaban atau secret ke layanan observabilitas tanpa asesmen privasi, persetujuan dan konfigurasi redaksi/retensi yang sesuai.
