# Laporan Hasil UAT dan Pengujian Usability SIAGA Bunda

**Tanggal laporan:** 25 November 2026  
**Cakupan:** pengujian berbasis tugas, Single Ease Question (SEQ), penilaian QPM, System Usability Scale (SUS), Net Promoter Score (NPS), dan masukan kualitatif.  
**Kerahasiaan:** identitas responden tidak dicantumkan. Hasil diringkas secara agregat.

## 1. Ringkasan Eksekutif

Pengujian mencakup **10 responden**, masing-masing mengerjakan **8 tugas**, sehingga terdapat **80 percobaan tugas**. Sebanyak 69 percobaan diselesaikan tanpa bantuan dan 11 diselesaikan dengan bantuan. Tidak ada tugas yang dicatat gagal. Dengan demikian, tingkat keberhasilan mandiri adalah **86,3%**, sedangkan tingkat penyelesaian jika keberhasilan dengan bantuan turut dihitung adalah **100%**.

Skor rata-rata SUS adalah **71,25 dari 100**, atau 3,25 poin di atas angka pembanding 68 yang tercantum pada lembar olah data. Skor rata-rata NPS adalah **+50**, berdasarkan 6 promoter, 3 passive, dan 1 detractor.

Hasil tugas menunjukkan bahwa alur masuk, beranda, pengingat, edukasi, dan ekspor profil umumnya dapat diselesaikan dengan mudah. Hambatan paling kuat muncul pada **skrining kesehatan**: seluruh responden menyelesaikannya dengan bantuan, rata-rata memerlukan 140,7 detik, mencatat 20 error atau salah klik, dan mendapat skor SEQ terendah, yaitu 4,9 dari 7. Masukan paling sering pada tugas ini menyebut istilah medis yang sulit dipahami.

Pada tugas chatbot, seluruh responden berhasil mengakses dan mengirim pertanyaan, tetapi skor ketersediaan informasi QPM paling rendah, yaitu **3,2 dari 5**. Catatan responden menunjukkan bahwa beberapa keluhan tidak mendapat jawaban yang dianggap memadai. Keberhasilan membuka atau menggunakan chatbot tidak membuktikan akurasi maupun keamanan klinis jawabannya.

Temuan UAT ini bersifat deskriptif dan **bukan validasi klinis, uji efektivitas, atau bukti bahwa SIAGA Bunda aman digunakan untuk pengambilan keputusan medis**. Ukuran sampel kecil, metadata pelaksanaan tidak lengkap, dan sebagian lembar format tidak sesuai dengan alur aplikasi yang diuji.

## 2. Tujuan dan Sumber Data

Laporan disusun dari tiga berkas berikut:

1. [Format Pengujian SEQ dan QPM](Task%20Pengujian%20SEQ%20QPM%20SIAGA%20Bunda.xlsx), khususnya lembar `Pengujian Bumil`.
2. [Kuesioner Usability Testing SUS dan NPS](Kuesioner%20Usability%20Testing%20SUS%20NPS%20SIAGA%20Bunda.docx).
3. [Hasil Pengujian dan Olah Data](Done_Usability%20Testing%20SIAGA%20Bunda_Olah%20Data%20(1).xlsx).

Tujuan analisis adalah merangkum kemudahan penyelesaian tugas, hambatan penggunaan, persepsi usability, kecenderungan merekomendasikan aplikasi, dan masukan yang dapat ditindaklanjuti.

### 2.1 Instrumen dan metrik

- **Status tugas:** berhasil, berhasil dengan bantuan, atau gagal.
- **Waktu:** durasi penyelesaian dalam detik.
- **Error atau salah klik:** jumlah yang dicatat evaluator pada setiap tugas.
- **SEQ:** skor pada skala 1–7 untuk tiap tugas.
- **QPM:** empat penilaian berskala 1–5, yaitu ketersediaan informasi, kesesuaian alur, tata letak komponen, serta metafora dan kejelasan.
- **SUS:** 10 pernyataan dengan skala jawaban 1–5.
- **NPS:** satu penilaian kemungkinan merekomendasikan aplikasi dengan skor 1–10. Kategori dihitung menggunakan pembagian standar: detractor 0–6, passive 7–8, dan promoter 9–10.

Skor SEQ dan QPM dilaporkan sebagai ringkasan numerik dari data yang tersedia. Berkas tidak mendefinisikan jangkar verbal lengkap untuk setiap nilai SEQ dan QPM, sehingga laporan ini tidak menetapkan ambang lulus atau kategori kualitas untuk keduanya.

## 3. Profil Responden

Data demografis tersedia untuk 10 responden.

| Karakteristik | Hasil |
| --- | --- |
| Jumlah responden | 10 |
| Usia | 25–39 tahun |
| Rata-rata usia | 29,0 tahun |
| Median usia | 28,5 tahun |
| Status reproduksi yang tercatat | 8 responden G2P1A0 dan 2 responden G3P2A0 |
| Pekerjaan | 8 ibu rumah tangga dan 2 guru |
| Pernah menggunakan aplikasi skrining ibu dan bayi | 2 ya dan 8 tidak |

Komposisi ini menunjukkan bahwa sebagian besar responden dalam sampel belum pernah menggunakan aplikasi skrining ibu dan bayi sebelumnya. Hasilnya tidak dapat dianggap mewakili seluruh kelompok pengguna SIAGA Bunda.

## 4. Hasil Pengujian Berbasis Tugas

### 4.1 Hasil keseluruhan

| Metrik | Hasil |
| --- | ---: |
| Jumlah responden | 10 |
| Jumlah tugas per responden | 8 |
| Jumlah percobaan tugas | 80 |
| Berhasil tanpa bantuan | 69 dari 80 (86,3%) |
| Berhasil dengan bantuan | 11 dari 80 (13,8%) |
| Gagal | 0 dari 80 |
| Penyelesaian, termasuk yang dibantu | 80 dari 80 (100%) |
| Rata-rata waktu per percobaan | 74,6 detik |
| Median waktu per percobaan | 54,5 detik |
| Rentang waktu | 19–168 detik |
| Total error atau salah klik | 29 |
| Rata-rata error atau salah klik | 0,36 per percobaan |
| Rata-rata SEQ | 6,48 dari 7 |

### 4.2 Hasil per tugas

| ID dan tugas | Hasil penyelesaian | Rata-rata waktu | Rata-rata error | Rata-rata SEQ |
| --- | --- | ---: | ---: | ---: |
| TP-01. Verifikasi dan masuk akun | 10 berhasil tanpa bantuan | 46,5 detik | 0,2 | 7,0 |
| TP-02. Memahami informasi beranda | 10 berhasil tanpa bantuan | 49,0 detik | 0,0 | 6,5 |
| TP-03. Mengisi kategori skrining kesehatan | 10 berhasil dengan bantuan | 140,7 detik | 2,0 | 4,9 |
| TP-04. Merencanakan persalinan melalui P4K | 10 berhasil tanpa bantuan | 103,5 detik | 0,3 | 6,4 |
| TP-05. Mengatur pengingat suplemen dan ANC | 10 berhasil tanpa bantuan | 46,4 detik | 0,1 | 6,9 |
| TP-06. Menjelajahi media dan modul edukasi | 10 berhasil tanpa bantuan | 132,4 detik | 0,0 | 7,0 |
| TP-07. Berkonsultasi dengan chatbot Kira | 10 berhasil tanpa bantuan | 52,3 detik | 0,0 | 6,1 |
| TP-08. Mengelola profil dan mengekspor PDF | 9 berhasil tanpa bantuan dan 1 dengan bantuan | 26,0 detik | 0,3 | 7,0 |

**Interpretasi utama:**

- TP-03 merupakan hambatan utama. Tidak ada responden yang tercatat menyelesaikan tugas ini tanpa bantuan. Tugas ini juga memiliki rata-rata error tertinggi dan skor SEQ terendah.
- TP-06 memerlukan waktu rata-rata cukup panjang, tetapi seluruh responden menyelesaikannya tanpa error dan memberikan skor SEQ 7,0. Durasi yang panjang pada tugas ini tidak dengan sendirinya menunjukkan kesulitan.
- TP-07 memiliki keberhasilan penyelesaian tinggi dan tidak mencatat error interaksi, tetapi hasil tersebut hanya menggambarkan akses dan penggunaan chatbot, bukan kepuasan atas isi atau ketepatan klinis jawabannya.
- TP-08 selesai tanpa bantuan oleh 9 responden. Satu responden memerlukan bantuan.

### 4.3 Penilaian QPM

Rata-rata berikut dihitung dari 10 penilaian untuk masing-masing tugas.

| ID tugas | Ketersediaan informasi (1–5) | Kesesuaian alur (1–5) | Tata letak komponen (1–5) | Metafora dan kejelasan (1–5) |
| --- | ---: | ---: | ---: | ---: |
| TP-01 | 5,0 | 5,0 | 4,9 | 5,0 |
| TP-02 | 4,2 | 4,7 | 4,7 | 4,6 |
| TP-03 | 4,1 | 4,4 | 4,6 | 3,6 |
| TP-04 | 4,6 | 4,9 | 4,5 | 4,7 |
| TP-05 | 4,8 | 5,0 | 5,0 | 5,0 |
| TP-06 | 3,9 | 4,8 | 4,9 | 4,9 |
| TP-07 | 3,2 | 4,6 | 4,9 | 4,1 |
| TP-08 | 5,0 | 4,9 | 4,9 | 5,0 |
| **Rata-rata seluruh tugas** | **4,35** | **4,79** | **4,80** | **4,61** |

Ketersediaan informasi memiliki rata-rata terendah dari empat dimensi QPM. Nilai terendah per tugas juga muncul pada ketersediaan informasi chatbot, yaitu 3,2, dan metafora serta kejelasan pada skrining, yaitu 3,6. Pola ini sejalan dengan komentar tentang keterbatasan jawaban chatbot dan istilah skrining yang belum mudah dipahami.

## 5. Hasil System Usability Scale

### 5.1 Skor SUS

| Metrik | Hasil |
| --- | ---: |
| Jumlah respons lengkap | 10 |
| Rata-rata SUS | 71,25 dari 100 |
| Median SUS | 68,75 |
| Simpangan baku sampel | 14,54 |
| Skor minimum | 47,5 |
| Skor maksimum | 100 |
| Pembanding yang tercantum pada lembar olah data | 68 |
| Selisih rata-rata terhadap pembanding | +3,25 poin |

Skor SUS dihitung ulang menggunakan rumus SUS standar: untuk butir ganjil, nilai kontribusi adalah jawaban dikurangi 1; untuk butir genap, kontribusinya adalah 5 dikurangi jawaban; total kontribusi kemudian dikalikan 2,5. Hasil hitung ulang cocok dengan seluruh 10 skor yang tersimpan.

Kategori yang tercatat pada lembar olah data:

| Kategori dalam lembar olah data | Jumlah responden |
| --- | ---: |
| Best Imaginable (Grade A) | 1 |
| Excellent (Grade B) | 3 |
| Good (Grade C) | 5 |
| OK / Marginal (Grade D) | 1 |

Dengan demikian, 9 dari 10 skor berada pada kategori Good atau lebih tinggi menurut klasifikasi yang digunakan di lembar olah data. Kategori ini mengikuti label sumber; hasilnya tetap perlu dibaca sebagai ringkasan deskriptif dari sampel kecil.

### 5.2 Rata-rata jawaban per butir

Nilai berikut adalah rata-rata jawaban mentah pada skala 1–5, sebelum pembalikan skor untuk perhitungan SUS. Untuk pernyataan negatif, nilai yang lebih rendah cenderung lebih mendukung usability.

| Butir | Pokok pernyataan | Arah pernyataan | Rata-rata |
| --- | --- | --- | ---: |
| Q1 | Ingin menggunakan aplikasi secara rutin | Positif | 3,9 |
| Q2 | Aplikasi terasa rumit | Negatif | 2,0 |
| Q3 | Aplikasi mudah digunakan | Positif | 4,0 |
| Q4 | Membutuhkan bantuan orang lain | Negatif | 2,1 |
| Q5 | Fitur-fitur terhubung dengan baik | Positif | 4,0 |
| Q6 | Banyak hal tidak konsisten | Negatif | 2,4 |
| Q7 | Pengguna lain dapat mempelajari aplikasi dengan cepat | Positif | 4,2 |
| Q8 | Aplikasi membingungkan atau membebani | Negatif | 1,9 |
| Q9 | Merasa percaya diri saat menggunakan aplikasi | Positif | 4,1 |
| Q10 | Harus mempelajari banyak hal terlebih dahulu | Negatif | 3,3 |

Mayoritas rata-rata butir menunjukkan persepsi positif terhadap kemudahan dan rasa percaya diri. Namun, Q10 memiliki rata-rata 3,3 pada pernyataan negatif, sehingga kebutuhan akan orientasi atau penjelasan awal layak ditinjau bersama masukan tentang tutorial.

## 6. Hasil Net Promoter Score

| Kategori NPS | Rentang skor | Jumlah | Persentase |
| --- | ---: | ---: | ---: |
| Promoter | 9–10 | 6 | 60% |
| Passive | 7–8 | 3 | 30% |
| Detractor | 0–6 | 1 | 10% |
| **Total** |  | **10** | **100%** |

Rata-rata skor rekomendasi adalah **8,5 dari 10**. NPS dihitung sebagai persentase promoter dikurangi persentase detractor, yaitu **60% − 10% = +50**. Nilai ini menunjukkan kecenderungan rekomendasi yang positif dalam sampel pengujian, bukan ukuran kepuasan populasi pengguna.

## 7. Temuan Kualitatif

Tema berikut disusun dari kolom temuan, rekomendasi, dan kutipan think-aloud pada lembar tugas. Jumlah merujuk pada catatan responden yang tersedia, bukan jumlah pengguna di luar sampel.

| Tema | Temuan dalam data | Implikasi |
| --- | --- | --- |
| Istilah skrining terlalu medis | 6 dari 10 catatan pada TP-03 menyebut bahasa medis atau istilah yang belum dipahami, termasuk istilah tekanan darah dan keterangan kondisi ketuban. | Informasi klinis perlu dijelaskan dengan bahasa awam tanpa mengubah makna atau ambang klinis. |
| Informasi chatbot belum mencakup sebagian keluhan | 4 dari 10 catatan atau rekomendasi pada TP-07 menyoroti jawaban yang kurang informatif atau keluhan yang belum terjawab. Ada usulan melengkapi panduan dan memperjelas arahan untuk menghubungi bidan. | Perlu meninjau cakupan sumber, penanganan pertanyaan di luar cakupan, dan redaksi fallback. Jangan menjanjikan bahwa chatbot dapat menjawab semua keluhan. |
| Orientasi penggunaan | 2 responden mengusulkan tutorial atau panduan awal pada TP-02. | Tinjau keterlihatan dan manfaat pengenalan fitur bagi pengguna baru. |
| Visual perkembangan janin di beranda | 2 responden mengusulkan visual perkembangan janin pada TP-02. | Evaluasi kebutuhan informasi di beranda dan kesesuaiannya dengan fitur edukasi yang sudah tersedia. |
| Materi edukasi tambahan | 2 responden meminta materi perawatan bayi baru lahir. Masukan lain mencakup nutrisi dan tips kehamilan, parenting, serta persiapan kehamilan. | Prioritaskan materi berdasarkan kebutuhan pengguna dan validasi tenaga kesehatan; jangan menganggap seluruh usulan otomatis masuk cakupan produk. |
| Kehamilan kembar dan skrining bayi | 1 responden menanyakan dukungan skrining untuk lebih dari satu bayi. | Pastikan cakupan produk untuk kehamilan kembar dan beberapa bayi dinyatakan jelas sebelum menambah alur. |
| Navigasi dan pengisian berulang | Masing-masing 1 responden meminta jalan kembali ke daftar skrining dan pengisian otomatis nilai yang pernah dimasukkan. | Tinjau arah navigasi setelah penyimpanan serta pemakaian ulang data yang aman dan relevan. |
| Petunjuk P4K | Catatan menyebut singkatan P4K dan isian kosong belum selalu jelas, termasuk apa yang perlu disiapkan. | Perluas keterangan singkatan dan jelaskan maksud isian kosong serta cara menyiapkannya. |

Catatan positif pada tugas beranda menyebut tampilan yang tidak terlalu padat, tulisan yang mudah dibaca, dan ikon yang mudah dikenali. Pada tugas edukasi, beberapa responden menyukai penyajian artikel dan video. Pengingat dinilai membantu, sedangkan kolom P4K disebut jelas oleh beberapa responden.

## 8. Rekomendasi Tindak Lanjut

Urutan berikut mempertimbangkan frekuensi temuan, skor tugas, dan konsekuensi jika informasi kesehatan disalahpahami. Rekomendasi ini perlu dibandingkan dengan versi aplikasi yang benar-benar diuji sebelum dianggap sebagai pekerjaan yang belum tersedia.

### Prioritas 1: perjelas bahasa dan alur skrining

1. Tinjau istilah seperti sistolik, diastolik, serta keterangan “ketuban lebih atau kurang”. Tambahkan penjelasan singkat yang mudah dipahami dan tetap sesuai materi klinis yang telah disetujui.
2. Jelaskan apakah isian ditujukan untuk diisi sendiri atau bersama bidan, terutama pada bagian yang memakai istilah teknis.
3. Tinjau alur setelah hasil skrining disimpan, termasuk cara kembali ke daftar skrining tanpa kehilangan data.
4. Evaluasi pengisian ulang nilai yang sudah ada. Nilai yang digunakan kembali harus dapat diperiksa dan diubah pengguna.
5. Putuskan secara eksplisit apakah dukungan kehamilan kembar dan pencatatan lebih dari satu bayi termasuk cakupan produk.

### Prioritas 1: tingkatkan kejelasan dan batas chatbot

1. Tinjau pertanyaan yang dinilai belum terjawab dan apakah materi panduan yang tersedia memang mencakup topik tersebut.
2. Saat panduan tidak cukup, berikan penjelasan yang jelas bahwa Kira belum memiliki informasi yang sesuai dan arahkan pengguna ke bidan atau fasilitas kesehatan bila relevan.
3. Pertahankan batas klinis chatbot. Masukan “menjawab semua keluhan” tidak boleh diterjemahkan menjadi jawaban yang melampaui sumber atau kompetensi sistem.
4. Lakukan evaluasi klinis terpisah terhadap akurasi, keselamatan, eskalasi tanda bahaya, dan kualitas bahasa. Skor QPM atau keberhasilan tugas tidak menggantikan validasi tersebut.

### Prioritas 2: lengkapi orientasi dan edukasi

1. Tinjau apakah pengguna baru dapat menemukan fitur utama dan memahami kartu beranda tanpa bantuan. Uji efektivitas petunjuk atau tutorial yang tersedia pada versi saat ini.
2. Pertimbangkan prioritas materi perawatan bayi baru lahir dan nutrisi ibu, lalu nilai usulan materi parenting dan persiapan kehamilan terhadap sasaran produk.
3. Perjelas singkatan P4K serta tambahkan keterangan kontekstual pada isian yang kosong.

### Prioritas 3: perbaiki pencatatan UAT berikutnya

1. Tetapkan satu versi lembar pengujian yang hanya berisi alur dan tugas SIAGA Bunda yang sedang diuji.
2. Lengkapi tanggal, versi aplikasi, jenis perangkat, metode pengujian, evaluator, dan karakteristik sesi yang relevan.
3. Definisikan jangkar skala SEQ dan QPM secara eksplisit, termasuk arti skor terendah dan tertinggi.
4. Pisahkan kolom temuan, layar bermasalah, jenis error, severity, dan rekomendasi agar setiap informasi dicatat pada kolom yang tepat.
5. Simpan jawaban terbuka kuesioner Bagian D dalam bentuk yang dapat dianalisis tanpa mengungkap identitas responden.

## 9. Batasan dan Catatan Kualitas Data

1. **Ukuran dan cakupan sampel.** Hanya 10 responden yang tercatat. Sampel didominasi ibu rumah tangga dan responden yang belum pernah menggunakan aplikasi skrining sejenis. Temuan tidak dapat digeneralisasi ke seluruh calon pengguna.
2. **Metadata pengujian tidak lengkap.** Berkas hasil tidak mencatat secara memadai tanggal sesi, versi aplikasi, perangkat, metode rekrutmen, atau kondisi jaringan. Konteks yang hilang membatasi reproduksi hasil.
3. **Bukan validasi klinis.** Pengujian mengukur pengalaman menggunakan aplikasi. Hasil ini tidak memvalidasi algoritma skrining, saran chatbot, ambang klinis, atau keamanan penggunaan.
4. **SEQ dan QPM bersifat deskriptif.** Skala mencantumkan rentang angka, tetapi jangkar verbal dan ambang interpretasi tidak tersedia. Karena itu, laporan tidak memberikan label lulus atau gagal berdasarkan skor rata-rata.
5. **Data severity tidak tersedia.** Format tugas mencantumkan severity, tetapi kolom severity tidak tampak pada lembar hasil responden. Tingkat dampak error karena itu tidak dapat dianalisis.
6. **Kategori error dan layar bermasalah tidak dapat diandalkan.** Kolom `Layar Bermasalah` kosong pada catatan yang diperiksa. Beberapa isi pada kolom `Tipe Error` tampak berupa saran yang tidak sesuai dengan tugas atau berasal dari alur lain, sehingga tidak dipakai untuk mengelompokkan jenis error.
7. **Ketidaksesuaian antarlembar format.** Lembar `Pengujian Bumil` berisi 8 tugas yang cocok dengan lembar hasil. Lembar `RESPONDEN` dan `REKAP` pada berkas format memuat persona serta alur lain, seperti BPJS, antrean, telemedisin, dan layanan faskes. Lembar `REKAP` tersebut juga memiliki 19 sel dengan nilai tersimpan `#REF!`. Lembar yang tidak cocok dikecualikan dari analisis.
8. **Satu label user goal tidak selaras.** Pada TP-02, tugasnya adalah memahami informasi beranda, tetapi label user goal pada format menyebut pencarian dan pemilihan faskes. Hasil tugas diringkas berdasarkan skenario dan nama tugas, bukan label goal yang tidak sesuai itu.
9. **Jawaban terbuka kuesioner tidak lengkap sebagai dataset terpisah.** Kuesioner menyediakan Bagian D untuk masukan umum, tetapi berkas olah yang diperiksa tidak menyajikan jawaban bagian tersebut sebagai data tersendiri. Analisis kualitatif di sini menggunakan catatan tugas dan think-aloud yang tersedia.
10. **Skor SUS dan NPS adalah laporan diri.** Keduanya mencerminkan persepsi responden pada sesi pengujian, bukan bukti sebab-akibat atau ukuran kinerja aplikasi pada penggunaan jangka panjang.
11. **Privasi.** Berkas sumber memuat nama responden. Nama dan identitas langsung tidak disalin ke laporan ini.

## 10. Kesimpulan

Secara umum, responden dapat menyelesaikan seluruh tugas yang dicatat, tetapi keberhasilan itu tidak selalu mandiri. Kekuatan yang terlihat adalah kemudahan pada alur masuk, pengingat, navigasi edukasi, dan pengelolaan profil. Area perbaikan paling menonjol adalah pengisian skrining, khususnya pemahaman istilah medis, serta kecukupan informasi chatbot.

Langkah berikut yang paling bernilai adalah menyederhanakan penjelasan skrining tanpa mengubah isi klinis, meninjau kembali alur dan pengisian berulang, serta memperbaiki kejelasan batas dan fallback chatbot. Setelah perbaikan, lakukan UAT ulang dengan lembar yang konsisten dan metadata sesi yang lengkap. Validasi keselamatan klinis harus tetap dilakukan secara terpisah oleh tenaga kesehatan yang berwenang.
