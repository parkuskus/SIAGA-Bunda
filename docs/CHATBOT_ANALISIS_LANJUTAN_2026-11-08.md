# Analisis Lanjutan dan Rencana Perbaikan Chatbot

Tanggal 8 November 2026. Analisis menggunakan kode lokal, data run awal di `docs/CHATBOT_STAGING_EVALUATION_2026-11-08.md`, lima uji embedding/RPC pada project staging `gjizoreqciqelmkakluz`, sembilan panggilan langsung sintetis ke OpenRouter, dan empat pemeriksaan lokal. Tidak ada deploy, perubahan konfigurasi, atau akses data produksi. Panggilan provider langsung menimbulkan biaya; enam panggilan nonstream melaporkan total sekitar **USD 0,0175**, di luar biaya tiga panggilan stream dan lima embedding yang tidak dirinci di sini.

## Ringkasan eksekutif

1. **Penyebab utama jawaban terpotong teridentifikasi pada pengujian provider:** `max_tokens: 480` mencakup token penalaran model. Pada dua dari tiga pengujian nonstream, provider melaporkan `finish_reason=length` dengan 437 dan 461 token penalaran; teks berakhir tanpa tanda akhir. Streaming langsung juga menghasilkan `length` pada dua dari tiga pengujian. Ini menjelaskan pola yang diamati, tetapi finish reason dari lima respons run awal tidak direkam sehingga tidak bisa dipastikan secara retrospektif untuk masing-masing kasus.
2. **Run awal tidak layak disebut 5/5 berhasil secara kualitas.** Evaluator memeriksa output nonkosong, bukan penyelesaian generasi. Fungsi chat mengabaikan `finish_reason` dan mengirim event `done` untuk teks tidak kosong meski provider berhenti karena batas token.
3. **Bottleneck first output belum bisa diatribusikan secara presisi.** Pengukuran terpisah menunjukkan embedding 785–860 ms dan RPC retrieval 328–772 ms; panggilan provider langsung streaming memperlihatkan first content 3.662–6.008 ms. Pengukuran ini bukan trace permintaan yang sama dan tidak boleh dijumlahkan sebagai breakdown pasti. Buffer keamanan 48 karakter juga dapat menunda output pertama yang terlihat pengguna.
4. **Retrieval bukan selalu gagal:** RPC berhasil 5/5 dan mengembalikan lima kandidat per kasus, tetapi filter menerima kandidat hanya pada 3/5 kasus. Relevansi klinis kandidat belum dinilai, sehingga penurunan threshold belum terbukti aman.

## Metode dan batasan

- Kasus provider langsung memakai tiga prompt pertama dari `app/scripts/chat-eval-cases.json`, system prompt lokal yang sama, temperatur 0,2 dan **tanpa konteks RAG**. Setiap prompt dijalankan sekali pada masing-masing batas 480 dan 1.200 token, nonstream; provider yang sama juga diuji tiga kali dengan streaming dan batas 480. Ini bukan uji berpasangan deterministik: output dan routing dapat berubah.
- Uji RAG memakai akun sintetis staging, embedding model dari env staging dan JWT akun tersebut. Setiap prompt diuji sekali; tidak ada teks prompt atau jawaban dalam log uji.
- First content provider diukur dari awal request langsung sampai delta teks pertama; first output aplikasi diukur dari request CLI sampai delta yang sudah melewati buffer keselamatan. Keduanya bukan metrik yang identik.
- Perbandingan pertama dari laporan sebelumnya adalah run staging terpisah dengan lima prompt; hasil provider langsung tidak membuktikan finish reason run tersebut. Tidak ada penilaian klinis pakar atau uji perangkat.

## Hasil pengujian

### Provider langsung: pengaruh batas token

| Kasus | Batas | Status akhir | Token completion | Token penalaran | Karakter | Waktu total |
|---|---:|---|---:|---:|---:|---:|
| 1 | 480 | length | 476 | 437 | 182 | 6.357 ms |
| 2 | 480 | stop | 445 | 244 | 881 | 10.065 ms |
| 3 | 480 | length | 476 | 461 | 78 | 6.291 ms |
| 1 | 1.200 | stop | 417 | 231 | 874 | 5.370 ms |
| 2 | 1.200 | stop | 717 | 552 | 770 | 9.379 ms |
| 3 | 1.200 | stop | 840 | 689 | 724 | 8.295 ms |

Semua enam request HTTP berhasil. Pada 480, 2/3 berhenti `length`; pada 1.200, 3/3 berhenti `stop`. Ini mendukung pengujian batas lebih tinggi sebagai kandidat, bukan jaminan kelengkapan, keamanan, latensi atau biaya. `stop` menandakan penghentian normal provider, bukan penilaian kualitas isi.

### Provider langsung: streaming, batas 480

| Kasus | Header | First content | Selesai | Finish | Completion / penalaran |
|---|---:|---:|---:|---|---:|
| 1 | 2.454 ms | 3.662 ms | 5.308 ms | stop | 410 / 226 |
| 2 | 3.272 ms | 6.008 ms | 6.353 ms | length | 476 / 456 |
| 3 | 2.552 ms | 4.242 ms | 4.708 ms | length | 476 / 378 |

Ketiganya mengirim `[DONE]`, termasuk kedua respons yang mencapai batas. Oleh karena itu penerimaan `[DONE]` sendiri tidak membuktikan jawaban utuh. Asumsi sebelumnya bahwa mayoritas waktu sebelum first output harus terjadi sebelum token pertama provider perlu dikoreksi: buffer keselamatan juga menunda keluaran yang terlihat; pengukuran fase sepasang diperlukan.

### Embedding dan retrieval staging

| Kasus | Embedding | RPC | Kandidat dikembalikan | Lolos filter |
|---|---:|---:|---:|---:|
| 1 | 831 ms | 772 ms | 5 | 2 |
| 2 | 860 ms | 389 ms | 5 | 0 |
| 3 | 828 ms | 328 ms | 5 | 0 |
| 4 | 785 ms | 354 ms | 5 | 2 |
| 5 | 813 ms | 508 ms | 5 | 2 |

Embedding median **828 ms** dan RPC median **389 ms**; RPC mencakup perjalanan jaringan dari CLI, bukan waktu database saja. Kasus 2 memiliki kemiripan terbaik sekitar 0,548, di bawah filter 0,55, dan skor leksikal 1 di bawah syarat 3. Kasus 3 memiliki kandidat teratas dengan skor di bawah kedua syarat. Ambang bukan kesimpulan validitas isi: relevansi kandidat perlu ditinjau terhadap PDF.

### Pemeriksaan lokal

Empat pemeriksaan terarah lulus: `chat-eval-metrics.test.mjs`, `chat-auth-context.test.mjs`, `chat-telemetry.test.mjs`, dan `check-chat-privacy.mjs`. Ini tidak menguji apakah jawaban klinis benar, stream provider terpotong, atau sistem siap produksi.

## Penelusuran kode dan risiko

- `supabase/functions/chat/index.ts:173–179` mengirim `max_tokens: 480`. Pada baris 195–201 parser mengambil hanya `delta.content`, tanpa memeriksa `finish_reason`; baris 238–254 menyimpan dan mengirim jawaban nonkosong sebagai `done`.
- `app/scripts/eval-chat-live.mjs:55–67` menerima jawaban nonkosong dan delta sebagai `ok`. Ini menjelaskan keberhasilan semu, bukan menilai kelengkapan atau kesesuaian jawaban.
- `supabase/functions/chat/index.ts:210–215` menahan 48 karakter demi keamanan. Menghapus buffer untuk mempercepat tampilan dapat membocorkan penanda internal dan tidak direkomendasikan tanpa desain dan tes keamanan setara.
- Embedding gagal menyebabkan retrieval dilewati (`index.ts:138–153`); pengujian ini belum membuktikan perilaku fallback leksikal ketika embedding gagal.
- Label `verified` menunjukkan kandidat melewati filter, bukan jaminan jawaban didukung sumber atau disetujui tenaga kesehatan. Tidak ada penilaian manual terhadap halaman yang dikembalikan pada pengujian ini.
- Koreksi laporan awal: empat jawaban jelas terputus di tengah kalimat; jawaban pertama berupa satu kalimat tanpa tanda akhir dan gagal menjawab permintaan secara substantif. Klaim **0/5 menjawab lengkap secara substantif** layak sebagai penilaian manual, tetapi tidak dapat dipastikan bahwa kelimanya terpotong secara teknis tanpa finish reason.

## Rencana perbaikan yang diusulkan — belum diterapkan

### P0 — Jangan anggap output terpotong sebagai selesai

1. Tulis tes stream untuk `stop`, `length`, provider error, `[DONE]` tanpa finish reason, EOF mendadak, delta kosong, dan filter keselamatan. Pastikan tidak ada data sensitif di log.
2. Tangani finish reason provider secara eksplisit. Untuk `length` atau penyelesaian ambigu, jangan tandai jawaban sebagai sukses lengkap; tentukan fallback aman dan penyimpanan riwayat agar pengguna tidak menerima jawaban parsial seolah final. Karena teks mungkin sudah ter-stream, desain UX harus memperhitungkan bahwa bagian awal tidak bisa ditarik kembali.
3. Pisahkan hasil evaluator menjadi transport, stream/protokol, kelengkapan teknis, dan penilaian isi; jangan menggunakan panjang atau tanda baca sebagai satu-satunya bukti kelengkapan. Tes bahwa `length` meningkatkan hitungan kegagalan.

### P1 — Sesuaikan konfigurasi model secara terukur

1. Bandingkan batas 480 dan 1.200 atau pengaturan reasoning yang didukung provider, dengan set prompt dan konteks RAG yang sama. Tangkap finish reason, penggunaan token, latensi, dan biaya tanpa menyimpan reasoning, prompt, jawaban atau secret di log.
2. Pilih konfigurasi setelah membandingkan kelengkapan, keselamatan dan biaya; uji model alternatif hanya jika diperlukan. Batasi percobaan dan patuhi rate limit. Jangan menganggap kenaikan token otomatis memperbaiki semua kasus.
3. Tambahkan regresi untuk budget token dan fallback; pengaturan staging dan produksi tetap dipisah. Perubahan produksi perlu otorisasi tersendiri.

### P1 — Ukur dan kurangi latensi nyata

1. Tambahkan timing terpisah untuk auth/rate limit, embedding, retrieval, header provider, first provider content, first delta pascabuffer, penyimpanan, dan selesai, dengan ID korelasi acak tanpa identitas atau isi pesan. Hindari metrik bertumpang tindih yang dijumlahkan dua kali.
2. Ukur cold/warm dan beberapa pengulangan pada prompt yang sama. Laporkan median, p95, error dan jumlah sampel; tetapkan target bersama stakeholder sebelum menyimpulkan lulus.
3. Optimalkan komponen terukur yang paling dominan. Evaluasi model/reasoning dan kinerja retrieval; jangan menghapus safety buffer tanpa pengganti yang diuji.

### P2 — Kualitas retrieval dan keselamatan klinis

1. Susun set uji relevansi dengan rujukan halaman dan penilaian bidan/SpOG; hitung recall dan ketepatan sumber, termasuk kasus tanpa bukti. Uji embedding gagal dan sumber tidak relevan.
2. Kalibrasikan threshold/ranking hanya berdasarkan set tersebut dan pastikan tidak menambah klaim sumber palsu; pertahankan fallback aman bila pedoman tidak cocok.
3. Tinjau kegunaan, jawaban utuh, tanda bahaya, risiko diagnosis/dosis dan kesesuaian sumber dengan rubrik terpisah. Selesaikan validasi pakar sebelum penggunaan klinis.

## Kriteria verifikasi usulan

- Tes otomatis mencakup kondisi provider `length` dan EOF; keduanya tidak dilaporkan sebagai jawaban lengkap.
- Benchmark staging melaporkan jumlah run, kegagalan teknis, finish reason, tingkat jawaban lengkap dan p50/p95 setiap fase tanpa isi pesan atau kredensial dalam log.
- Semua penyesuaian melewati uji privasi, MFA/RLS, rate limit, eskalasi dan safety buffer yang ada; jalankan `npm test` dan `npm run build`.
- Uji relevansi dan keselamatan oleh pakar dilakukan terpisah; sampel kecil ini tidak cukup untuk menetapkan persentase kualitas produksi.

## Eksperimen optimasi reasoning — staging

Pada tiga prompt sintetis tanpa RAG, request langsung ke OpenRouter dibandingkan secara bergantian memakai default dan `reasoning.effort: minimal` dengan `exclude: true`, model, system prompt, temperature, dan batas 1.200 token sama. Hasil first token default/minimal: **3,235/1,594 ms**, **16,709/1,672 ms**, **5,869/1,705 ms**; waktu selesai: **4,904/3,110 ms**, **17,634/3,951 ms**, **6,793/3,482 ms**. Biaya yang dilaporkan provider per pasangan: **$0.002345/$0.001490**, **$0.003027/$0.001598**, **$0.002984/$0.001431**. Ini sinyal awal saja: satu ulangan per prompt, tanpa RAG, output model tidak dinilai pakar, dan konfigurasi `low` menghasilkan HTTP 402 pada dua percobaan sehingga tidak dipakai.

`LLM_REASONING_EFFORT` kini opsional; bila diatur ke `minimal`, diteruskan hanya untuk host OpenRouter. Default tanpa variabel tetap seperti sebelumnya. Nilai `minimal` diaktifkan hanya pada project staging `gjizoreqciqelmkakluz`; Edge Function `chat` aktif versi **7** di staging dan JWT verification tetap aktif. Tidak ada perubahan konfigurasi/deploy produksi.

Benchmark CLI staging dengan lima prompt yang sama setelah deploy: **5/5 sukses**, median first output **4,005 detik** dan p95 **7,720 detik**. Run pembanding sebelumnya: empat sukses dan satu HTTP 500, median first output empat sukses **8,504 detik**. Perbandingan tidak berpasangan dan kecil; indikasi median turun sekitar 53%, bukan bukti kausal atau jaminan mutu/latensi.

Run kecil berikutnya gagal **5/5**; awalnya respons generik Edge terlihat sebagai HTTP 500. Pemeriksaan `GET /api/v1/credits` OpenRouter memastikan kredit akun **$0** dengan usage **$0.182231**. Sisa batas key sekitar **$9.82** bukan saldo akun. Setelah diagnostik dipasang, Edge melaporkan upstream **HTTP 402**; satu request lain gagal di transport jaringan, jadi tidak semua kegagalan harus memiliki sebab sama. Satu request provider langsung yang lebih ringan berhasil HTTP 200, tetapi itu tidak membuktikan request produksi dengan konteks RAG dapat dibayar atau diproses.

Timing dari request Edge yang sama dengan upstream 402: auth **353 ms**, rate check **348 ms**, embedding **1,036 ms**, retrieval **381 ms**, waktu sampai header provider **124 ms**, total di Edge **2,245 ms**; tidak ada token atau jawaban yang dihasilkan. Ini menunjukkan embedding adalah fase terlama sebelum model, tetapi belum cukup untuk mengganti embedding/provider atau mengubah retrieval threshold tanpa uji relevansi. Evaluator kini berhenti setelah upstream 402 agar tidak terus memanggil embedding untuk prompt berikutnya.

Untuk error provider, Edge mengembalikan HTTP **502** (sebelumnya kegagalan provider tersamarkan sebagai 500), request ID, dan timing opt-in pada staging saja. Sukses juga membawa ID/timing fase pada payload evaluasi staging sehingga metrik CLI dapat dicocokkan dengan satu request; konten chat tidak disertakan. Tidak ada isi jawaban, prompt, atau secret yang dicatat. Evaluasi live dihentikan karena saldo akun OpenRouter nol. Tambah kredit hanya bila memang disetujui pemilik akun; jangan mengubah provider atau memakai model gratis sebagai pengganti klinis tanpa persetujuan dan validasi.

Output evaluator sekarang menampilkan durasi >=1 detik dalam detik (tiga angka desimal); milidetik dipertahankan hanya untuk nilai di bawah satu detik. Tes terakhir `npm test` lulus 25/25 dan `npm run build` lulus. Edge Function staging aktif versi 12 dengan `verify_jwt=true`; produksi tidak disentuh. Belum dilakukan penilaian pakar, pengukuran perangkat, atau validasi kualitas jawaban hasil setting `minimal`. Optimasi inferensi berikutnya tertahan sampai layanan provider pulih/kredit disetujui; optimasi jalur embedding memerlukan pengukuran dan validasi retrieval tersendiri.

## Percobaan model gratis — staging

Setelah persetujuan pengguna, secret model staging diganti ke `google/gemma-4-26b-a4b-it:free` (katalog OpenRouter mencantumkan harga input/output $0 dan endpoint Google AI Studio); setting reasoning khusus Gemini dihapus. Produksi tidak diubah. Satu pertanyaan sintetis melalui Edge Function staging berakhir HTTP 502 karena provider upstream memberi HTTP 429 sebelum token pertama. Timing request: auth **296 ms**, rate check **443 ms**, embedding **1,082 ms**, retrieval **392 ms**, provider response headers **331 ms**, total Edge **2,547 ms**; klien menerima hasil dalam **4,075 ms**. Tidak ada jawaban model untuk dinilai. Ini menunjukkan kandidat gratis terdaftar, bukan jaminan endpoint gratis tersedia atau lulus evaluasi. Tidak diulang agar tidak menambah request setelah throttling.
