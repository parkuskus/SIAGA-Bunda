# Laporan Evaluasi Live Chatbot SIAGA Bunda

**Tanggal laporan:** 8 November 2026  
**Lingkungan:** Supabase staging `gjizoreqciqelmkakluz`  
**Model:** `google/gemini-3.8-flash` melalui OpenRouter  
**Run yang dirinci:** 5 prompt sintetis, satu kali per prompt

## Ringkasan

Transport dan pemanggilan chatbot berhasil pada kelima kasus. Namun, **kelengkapan jawaban gagal pada kelima kasus**: empat jawaban berhenti jelas di tengah kalimat, dan jawaban kelima juga berakhir menggantung. Evaluator saat ini menganggap jawaban nonkosong sebagai sukses, sehingga status 5/5 adalah keberhasilan teknis, bukan kelulusan kualitas.

| Metrik | Hasil |
|---|---:|
| Kasus | 5 |
| Respons HTTP/SSE berhasil | 5/5 |
| Kegagalan transport | 0 |
| Jawaban utuh | 0/5 |
| First output median | 7.682 ms |
| First output rata-rata | 7.723 ms |
| First output rentang | 7.584–7.930 ms |
| First output p95 | 7.930 ms |
| Waktu selesai median | 8.023 ms |
| Waktu selesai rata-rata | 8.274 ms |
| Waktu selesai rentang | 7.800–9.555 ms |
| Waktu selesai p95 | 9.555 ms |
| Jeda rata-rata dari first output sampai selesai | 550 ms |
| Respons dengan hasil retrieval dan sumber | 3/5 |

Persentil p95 memakai metode **nearest-rank**. Dengan hanya lima sampel, p95 sama dengan nilai maksimum. Semua metrik adalah waktu dari CLI/server, bukan pengukuran pada perangkat pengguna.

## Hasil per kasus

### 1. Istirahat selama kehamilan

**Pertanyaan**  
Apa beberapa cara sederhana mengatur waktu istirahat selama kehamilan?

**Jawaban yang diterima**  
> Mengatur waktu istirahat saat hamil sangat penting agar tubuh Bunda tidak mudah kelelahan

**Metrik:** first output 7.930 ms; selesai 8.129 ms; 89 karakter.  
**Retrieval:** terverifikasi; sumber `Guideline Chatbot SIAGA` halaman 10 dan 81.  
**Catatan:** relevan, tetapi berhenti sebelum memberikan cara atau langkah praktis.

### 2. Aktivitas harian selama kehamilan

**Pertanyaan**  
Bagaimana memilih aktivitas harian yang nyaman saat hamil?

**Jawaban yang diterima**  
> Pilihlah kegiatan yang ringan hingga sedang dan selalu dengarkan sinyal tubuh Bunda. Men

**Metrik:** first output 7.584 ms; selesai 7.861 ms; 88 karakter.  
**Retrieval:** tidak terverifikasi; tidak ada sumber.  
**Catatan:** arah jawaban relevan, tetapi teks terputus dan belum menjawab cara memilih aktivitas secara utuh.

### 3. Persiapan konsultasi kehamilan

**Pertanyaan**  
Apa yang sebaiknya saya catat sebelum konsultasi kehamilan berikutnya?

**Jawaban yang diterima**  
> Menyiapkan catatan sebelum periksa kehamilan sangat membantu agar Bunda tidak lupa menyampaikan hal penting kepada

**Metrik:** first output 7.825 ms; selesai 8.023 ms; 114 karakter.  
**Retrieval:** tidak terverifikasi; tidak ada sumber.  
**Catatan:** pertanyaan meminta contoh hal yang perlu dicatat; jawaban terputus sebelum menyebutkannya.

### 4. Dukungan keluarga pada masa nifas

**Pertanyaan**  
Bagaimana keluarga bisa membantu ibu mengatur waktu istirahat setelah melahirkan?

**Jawaban yang diterima**  
> Dukungan keluarga sangat berarti agar ibu punya cukup waktu memulihkan tenaga dan menjaga produksi ASI setelah

**Metrik:** first output 7.682 ms; selesai 7.800 ms; 110 karakter.  
**Retrieval:** terverifikasi; sumber `Guideline Chatbot SIAGA` halaman 58 dan 47.  
**Catatan:** topik sesuai, tetapi tidak memberi contoh bantuan keluarga dan kalimatnya menggantung.

### 5. Pertanyaan untuk kunjungan nifas

**Pertanyaan**  
Apa saja hal umum yang baik ditanyakan saat kunjungan nifas?

**Jawaban yang diterima**  
> Saat kunjungan nifas, Bunda bisa memanfaatkan waktu untuk memastikan pemulihan tubuh dan perawatan bayi berjalan baik.
>
> Beberapa hal penting yang bisa Bunda tanyakan meliputi kondisi luka jahitan, apakah darah nifas yang keluar masih dalam batas wajar, serta cara mengatasi rasa nyeri yang mungkin masih terasa.
>
> Bunda juga bisa berkonsultasi seputar proses menyusui, seperti pelekatan bayi atau penanganan payudara bengkak dan puting lecet. Selain itu, diskusikan pilihan alat kontrasepsi atau KB yang aman untuk ibu menyusui.
>
> Jangan ragu menceritakan kondisi emosional jika Bunda merasa sangat lelah, cemas, atau sedih berkepanjangan.
>
> Bunda bisa mencatat pertanyaan di

**Metrik:** first output 7.596 ms; selesai 9.555 ms; 673 karakter.  
**Retrieval:** terverifikasi; sumber `Guideline Chatbot SIAGA` halaman 81 dan 61.  
**Catatan:** paling informatif dan tersusun, tetapi tetap terputus. Pernyataan tentang perdarahan nifas dan kontrasepsi perlu ditinjau pakar sebelum dipakai sebagai arahan kesehatan.

## Analisis bottleneck

### Bottleneck terbesar: waktu sebelum keluaran pertama

First output berada pada **7,6–7,9 detik** untuk seluruh prompt. Setelah keluaran pertama muncul, empat kasus selesai dalam **118–277 ms**; kasus kelima memerlukan **1.959 ms** tambahan karena jawabannya jauh lebih panjang. Dengan demikian, latensi dominan terjadi sebelum atau saat token pertama dihasilkan, bukan saat mengirim sisa jawaban.

Jalur yang mungkin berkontribusi meliputi cold start Edge Function, pembuatan embedding, pencarian RAG, koneksi ke OpenRouter, dan waktu first-token model. Run ini tidak menyediakan rincian fase per permintaan, jadi belum cukup bukti untuk menyatakan salah satunya sebagai penyebab tunggal. Perlu korelasi log fase `embedding`, `retrieval`, `firstToken`, dan `completion` untuk memisahkannya.

Kasus kelima juga menunjukkan biaya ekor respons: waktu setelah first output hampir dua detik. Ini lebih kecil dampaknya daripada menunggu sekitar 7,6–7,9 detik untuk token pertama.

## Evaluasi kualitas jawaban

| Aspek | Penilaian |
|---|---|
| Relevansi topik | 5/5 mengarah ke topik yang ditanyakan |
| Kelengkapan | 0/5 utuh; semua output berakhir menggantung |
| Retrieval | 3/5 memperoleh sumber; 2/5 menjawab tanpa sumber |
| Keamanan klinis | Belum tervalidasi. Tidak ada skor klinis yang diuji; beberapa saran nifas perlu pemeriksaan pakar |
| Kegunaan pengguna | Rendah untuk empat jawaban pendek; sedang untuk kasus kelima jika diperbaiki dan diverifikasi |

Label retrieval “terverifikasi” di sini hanya berarti fungsi menemukan potongan pedoman dan mengembalikan sumber. Itu **bukan** bukti bahwa seluruh isi jawaban didukung sumber atau sudah divalidasi secara klinis.

## Kesimpulan dan tindak lanjut

1. Jangan menilai run sebagai 5/5 sukses kualitas. Kriteria sukses evaluator perlu memeriksa bahwa aliran berakhir normal dan jawaban lengkap, bukan hanya nonkosong.
2. Selidiki mengapa model/stream menghasilkan teks yang terputus: catat finish reason dari provider secara aman, pastikan stream selesai normal, dan tandai respons terpotong sebagai kegagalan kualitas.
3. Ambil timing per fase untuk membedakan cold start, embedding, retrieval, dan first-token model. Setelah itu baru optimalkan sumber bottleneck yang terukur.
4. Ulangi benchmark setelah perbaikan, lalu minta bidan/SpOG meninjau isi sebelum menggunakan hasil sebagai materi kesehatan.

**Batasan:** lima prompt adalah sampel kecil dan sintetis; tidak mewakili percakapan pengguna atau validasi klinis. Prompt/jawaban di laporan ini berasal dari akun evaluasi staging dan tidak memuat data pasien.
