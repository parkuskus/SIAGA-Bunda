# Perbaikan UAT TP-03 dan TP-04 — Rencana Implementasi

> **Untuk pelaksana:** Baca permintaan klien, gambar yang menyertainya, dan `docs/UAT/Laporan_Hasil_UAT_Usability_SIAGA_Bunda.md` sebelum mengubah UI. Rencana ini **belum merupakan persetujuan untuk mengubah aturan klinis**.

**Tujuan:** Membuat formulir skrining lebih mudah dipahami dan menjelaskan tujuan P4K tanpa mengubah perhitungan, data tersimpan, atau perilaku keselamatan.

**Pendekatan:** Ganti teks yang tampil bagi pengguna pada titik pemakaian; pertahankan key, tipe, dan skor. Tambahkan satu kartu petunjuk di daftar skrining dan satu banner pengantar di atas ringkasan P4K, menggunakan pola visual yang sudah ada. Rilis setelah pemeriksaan pakar terhadap ketepatan istilah yang berisiko mengubah pemahaman klinis.

**Teknologi:** React/TypeScript, Tailwind v4, aset WebP yang sudah ada; tanpa dependensi, migrasi database, atau perubahan Edge Function.

**Dasar:** Permintaan klien pada percakapan 28 November 2026; temuan TP-03 (10/10 perlu bantuan, SEQ 4,9/7) dan TP-04 (10/10 mandiri, SEQ 6,4/7) pada laporan UAT.

## Batas dan keputusan yang harus dikonfirmasi

1. **Dikonfirmasi klien: “Hamil ke” berarti urutan kehamilan (gravida), bukan paritas.** Saat ini `RiskFactorScreen.tsx` memetakan pilihan “Hamil pertama / ke 2 sampai 3 / ke 4 atau lebih” ke `paritas` 0/1/4, tetapi `riskFactorForm.ts:12` dan `poedjiRochjati.ts:5` memakai `paritas` untuk skor risiko. Pisahkan keduanya: tampilkan dan simpan urutan kehamilan sebagai `gravida` (profil sudah memiliki `gravida` dan `para`), sedangkan skor tetap memakai nilai paritas/para yang terpisah dan tervalidasi. Jangan menyamakan gravida dengan para, jangan hitung ulang skor menggunakan gravida, dan jangan diam-diam mengubah data skrining lama. Pakar tetap perlu memvalidasi sumber nilai para untuk skor Poedji dan redaksi awam untuk pertanyaan paritas.
2. **Luka perineum dan bekas operasi bukan lokasi yang sama.** Untuk label yang kini berbunyi “Luka perineum atau bekas operasi bengkak atau bernanah”, usulkan “Jahitan jalan lahir atau bekas operasi bengkak atau bernanah”; untuk faktor risiko yang tersimpan selanjutnya, selaraskan redaksinya. Mintakan pemeriksaan bidan: apakah istilah “jahitan” menyingkirkan ibu yang mempunyai luka tanpa jahitan? Jika iya, pakai redaksi awam yang mencakup keduanya, bukan mengganti makna klinis.
3. Teks klien dipertahankan utuh, termasuk sebutan “buku KIA”. Sesuaikan hanya kapitalisasi menurut aturan produk sebelum rilis jika disetujui klien. Banner adalah bantuan memahami alur, **bukan** bukti bahwa pengisian mandiri menggantikan pemeriksaan.
4. Permintaan ini mencakup label, bantuan pengguna, dan konsistensi teks hasil. **Di luar cakupan:** autofil lintas skrining, dukungan banyak bayi, pergantian model chatbot, ambang/rumus klinis, dan penggantian semua istilah “hipertensi” pada materi ilmiah/indeks pencarian. Usulan UAT tersebut dapat direncanakan secara terpisah setelah cakupan klinisnya jelas.

## Peta lokasi perubahan

| Unit | Tanggung jawab |
| --- | --- |
| `app/src/features/skrining/SkriningPage.tsx` | Petunjuk sebelum daftar skrining (gambar 1); nama diabetes pada menu, tipe hasil baru, dan tombol kembali ke daftar bila disetujui sebagai tindak lanjut TP-03. |
| `app/src/features/skrining/ibu-hamil/RiskFactorScreen.tsx` | Field urutan kehamilan “Hamil ke” yang terpisah dari paritas, pilihan penyakit kronis, label tekanan darah, dan label pada sheet validasi; gunakan profil `gravida`/`para` yang sudah ada bila nilainya valid. |
| `app/src/features/skrining/ibu-hamil/PreeklamsiaScreen.tsx` | Label tekanan darah dan hipertensi di formulir terkait agar satuan/istilah tidak berbeda antarform. |
| `app/src/features/skrining/nifas/NifasScreen.tsx` | Label tekanan darah dan keluhan luka; pertahankan opsi bekas operasi. |
| `app/src/features/skrining/ibu-hamil/DmgScreen.tsx` | Judul formulir diabetes kehamilan. |
| `app/src/features/skrining/screeningCompleteness.ts`, `app/src/features/skrining/ibu-hamil/riskFactorForm.ts`, `app/src/features/skrining/ibu-hamil/preeklamsiaForm.ts` | Validasi `gravida` sebagai urutan kehamilan dan `paritas` sebagai input terpisah; perbarui kalimat yang terlihat pengguna. Pertahankan key klinis yang ada dan aturan batas, kecuali perubahan pengambilan nilai para yang sudah disetujui pakar. |
| `app/src/features/skrining/nifas/nifasForm.ts`, `app/src/features/profil/HistoryScreen.tsx` | Konsistensikan faktor risiko baru dan label riwayat diabetes kehamilan; hasil lama tetap disimpan apa adanya. |
| `app/src/features/beranda/BirthPlanScreen.tsx` | Banner pengantar P4K di atas kartu “Rencana Persalinan Saya” (gambar 2), termasuk kondisi lihat-saja; tidak menyentuh autosave/konflik. |
| `app/public/s-06/s-06h/hero-persiapan.webp` | Gambar ibu dan perlengkapan persalinan yang sudah ada; gunakan ulang tanpa membuat atau menyalin aset. |
| `app/scripts/` dan tes yang sudah ada | Pemeriksaan regresi label, validasi, dan perilaku skor; cek nama file skrip uji yang relevan saat eksekusi. |
| `docs/BACKLOG.md` | Catat pelaksanaan **setelah** perubahan benar-benar lulus verifikasi, bukan saat perencanaan. |

## Tahap 1 — Istilah TP-03 (prioritas tinggi)

1. Pada formulir Faktor Risiko, “Hamil ke” harus menanyakan urutan kehamilan. Ganti pilihan yang saat ini salah dipetakan sebagai paritas dengan input urutan kehamilan yang terpisah; isi awal dari `profile.gravida` yang sudah ada dan izinkan pengguna memeriksa/mengoreksinya. Simpan nilai pada draft skrining sebagai `gravida`. Untuk skor Poedji, jangan gunakan `gravida`: ambil `profile.para` hanya bila pakar menyetujui bahwa nilai tersebut sesuai definisi paritas yang dipakai aturan; jika tidak tersedia/valid, minta nilai paritas secara eksplisit dengan bahasa yang disetujui pakar sebelum menghitung skor. Hindari nilai default yang membuat pengguna mengira data sudah terkonfirmasi.
2. Tangani draft lama secara eksplisit: nilai `jawabanForm.paritas` yang lama hanya merekam pilihan kategori terdahulu dan tidak dapat diperlakukan sebagai urutan kehamilan. Pulihkan nilai itu hanya untuk kontinuitas perhitungan/skor sesuai perilaku yang sudah tervalidasi; isi `gravida` dari profil dan tampilkan agar pengguna dapat mengonfirmasi. Jika asal-usul nilai paritas lama tidak dapat dipastikan, jangan mengubah hasil lama diam-diam; minta konfirmasi sebelum menghitung hasil baru.
3. Pada tombol penyakit kronis di Faktor Risiko, tampilkan “Darah tinggi” sebagai ganti “Hipertensi”; nilai tersimpan `hipertensi` tidak diubah. Jika label riwayat pada formulir Preeklamsia ikut diselaraskan, tulis “Darah tinggi menahun” untuk `ht` **hanya sesudah ditinjau pakar**, karena “kronik” menambah makna yang tidak boleh hilang.
4. Pada label input tekanan darah, tulis “Tekanan darah atas (mmHg)” dan “Tekanan darah bawah (mmHg)”. Selaraskan `aria-label`, judul daftar isian yang kurang, dan pesan angka tidak valid di Faktor Risiko, Preeklamsia, serta Nifas. Pertahankan urutan atas/bawah, nilai contoh yang sudah ada, satuan mmHg, rentang validasi, dan eskalasi MERAH.
5. Ubah “Skrining Diabetes Gestasional” menjadi “Skrining Diabetes Kehamilan” pada kartu menu; pada judul form gunakan “Diabetes Kehamilan” agar tidak menjadi “Skrining Skrining ...”. Selaraskan tipe label hasil yang baru dan nama pada riwayat. Biarkan tipe data `dmg` dan label yang sudah tersimpan historis tetap dapat dibaca; hindari migrasi atau pencarian-dan-ganti pada istilah pedoman.
6. Pada Nifas, ubah frasa “Luka perineum” menjadi “Jahitan jalan lahir” dalam keluhan dan faktor risiko baru **hanya setelah keputusan poin 2 di atas**. `lukaBengkak`, aturan MEOWS, dan riwayat lama tidak berubah.
7. Uji regresi: ubah gravida tanpa mengubah skor Poedji; ubah para/paritas tanpa mengubah gravida; cek draft baru dan draft lama, validasi nilai kosong/tidak valid, warna hasil, riwayat, serta label PDF bila berasal dari label hasil. Gunakan tes yang ada bila tersedia dan tambahkan assert kecil untuk pemisahan kedua nilai. Jalankan `npm run build` dari `app/`.

## Tahap 2 — Petunjuk mandiri TP-03 (prioritas tinggi)

1. Pada daftar skrining di `SkriningPage.tsx`, letakkan kartu informasi **setelah pilihan Hamil/Nifas/Bayi dan sebelum daftar skrining**, sehingga berada tepat di atas item seperti pada gambar 1. Tampilkan untuk ketiga pilihan selama petunjuk memang berlaku untuk semuanya; tinjau dengan bidan bila formulir bayi memerlukan sumber selain kondisi Bunda/buku KIA. Jangan sisipkan ke dalam progress atau menutupi kartu tugas pertama.
2. Salin teks klien utuh: “Formulir ini dapat diisi mandiri berdasarkan kondisi Bunda atau buku KIA. Apabila ada bagian yang kurang dipahami, silakan konsultasikan kepada bidan saat pemeriksaan.”
3. Gunakan kartu netral yang sudah sesuai palet (`#FFFCF6`, sage lembut, teks gelap), padding yang mudah dibaca, dan tanpa ikon/alarm darurat. Pada lebar 320–480 px, teks harus utuh, tidak terpotong, tidak menggeser tombol tab keluar layar, dan terbaca pembaca layar.
4. Uji bahwa banner tampil saat awal dan ketika berpindah kategori, tidak mengubah hitungan progress atau menahan navigasi; verifikasi di ponsel dan desktop dengan zoom 200%.

## Tahap 3 — Pengantar P4K TP-04 (prioritas menengah)

1. Di `BirthPlanScreen.tsx`, sisipkan banner **di bawah header dan sebelum** ringkasan “Rencana Persalinan Saya” agar pengguna mengerti P4K sebelum melihat 0 dari 25 butir atau daftar “Masih perlu dilengkapi”. Tampilkan pada rencana kosong, sebagian terisi, lengkap, dan mode lihat-saja. Jangan jadikan peringatan merah atau penghalang interaksi.
2. Salin teks klien: “P4K (Program Perencanaan Persalinan dan Pencegahan Komplikasi) adalah catatan rencana persalinan aman bagi Ibu dan keluarga. Lengkapi secara bertahap bersama pasangan atau bidan menjelang hari perkiraan lahir.”
3. Jika banner berilustrasi, gunakan `/s-06/s-06h/hero-persiapan.webp`; tampilkan sebagai dekorasi berukuran terkendali dengan `alt=""`, tanpa menutupi teks. Pada ponsel sempit, teks didahulukan dan ilustrasi boleh mengecil; hindari duplikasi konten yang sudah dijelaskan ringkasan.
4. Pastikan banner tetap tampil saat memuat tanpa memblokir status memuat, autosave, daftar kekurangan, tombol lompat ke isian, dan panel konflik. Periksa kontras, ukuran huruf yang cukup, serta alur keyboard/pembaca layar.

## Tahap 4 — Pemeriksaan dan serah-terima

1. Cek `git diff` agar perubahan sesuai cakupan; jangan mengubah ambang klinis. Penyimpanan `gravida` baru harus mengikuti struktur draft yang sudah ada dan tidak memerlukan migrasi skema jika `detail` JSON mencukupi; pertahankan pembacaan draft/riwayat lama tanpa menafsirkan ulang nilainya.
2. Jalankan tes regresi terkait dan `npm run build` di `app/`; lakukan QA visual pada lebar 320, 360, dan 480 px (form langkah 1–3, daftar tiga kategori, P4K kosong/penuh/lihat-saja, serta konflik).
3. Ulangi TP-03 dan TP-04 dengan skenario UAT yang sama. Catat tanpa bantuan/dengan bantuan, waktu, salah klik, SEQ, dan apakah peserta bisa menjelaskan arti tekanan darah atas/bawah, urutan kehamilan, paritas, serta tujuan P4K. **Target evaluasi**, bukan klaim hasil: lebih banyak peserta menyelesaikan TP-03 tanpa bantuan dan tidak ada penurunan pada TP-04.
4. Minta bidan/SpOG memeriksa pemisahan gravida dan paritas serta sumber para untuk skor, redaksi luka/jahitan dan darah tinggi menahun, dan banner mandiri. Validasi klinis ini terpisah dari keberhasilan UAT; jangan rilis klaim keselamatan hanya karena build atau SEQ lulus.
5. Baru setelah pelaksanaan, catat progres di `docs/BACKLOG.md` beserta apa yang disetujui pakar dan apa yang belum diuji. Tidak perlu deploy backend untuk perubahan copy UI; frontend hanya dideploy bila target dan izin rilis jelas.

**Status:** implementasi frontend selesai pada 28 November 2026. “Hamil ke” dan jumlah persalinan tersimpan terpisah; skor tetap memakai paritas dan ambang yang ada. Petunjuk skrining, banner P4K, dan istilah yang diminta sudah diterapkan; build dan tes lulus. Validasi bidan/SpOG atas sumber para untuk skor serta cakupan frasa luka/jahitan, uji visual perangkat, dan UAT ulang masih diperlukan sebelum penggunaan pada peserta.
