# TP-03 Poin 3–5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kurangi pengisian berulang, sediakan jalan kembali ke daftar skrining dari hasil, dan dukung pencatatan skrining untuk lebih dari satu bayi. Klien menyetujui implementasi pada 28 November 2026.

**Architecture:** Pertahankan form klinis dan perhitungan yang ada. Isi otomatis hanya nilai yang dapat ditautkan ke sumber tepercaya, tetap dapat diperiksa dan diubah, serta pisahkan hasil/draf bayi berdasarkan ID bayi. Tambahkan navigasi hasil tanpa mengubah perilaku tombol Ulangi, Beranda, atau overlay MERAH.

**Tech Stack:** React 19, TypeScript, Dexie, Supabase, Tailwind v4, skrip tes Node yang sudah digunakan proyek.

**Spec:** Temuan TP-03 poin 3–5 pada masukan UAT 28 November 2026 dan `docs/UAT/Laporan_Hasil_UAT_Usability_SIAGA_Bunda.md` bagian 7–8.

## Global Constraints

- Nilai yang diisi otomatis harus tampak jelas, bisa dikoreksi, dan tidak diperlakukan sebagai data terkonfirmasi.
- Jangan mengubah ambang, rumus, kategori, atau eskalasi klinis.
- Hasil dan draf lokal/cloud tetap terikat ke pemilik akun; hasil MERAH tidak boleh bisa terhapus lewat navigasi baru.
- Gunakan pola SIAGA Bunda dan target sentuh minimal 44 × 44 px.
- Perubahan skema Supabase hanya dilakukan bila skema `bbl_profiles` yang ada terbukti tidak mencukupi.

## Review Focus

- Data otomatis tidak valid atau berasal dari pemeriksaan yang sudah lama: kosongkan atau tampilkan sumber/tanggal, jangan mengubahnya diam-diam.
- Pengguna mengedit nilai otomatis: pastikan nilai edit itulah yang dihitung dan disimpan.
- Hasil MERAH: tombol daftar tidak boleh menutup atau melewati overlay rujukan.
- Bayi kembar dengan tanggal lahir sama: hasil dan draft kedua bayi tetap terpisah.
- Akun dengan data lama tanpa ID bayi: pertahankan akses dan jangan menggandakan atau menghilangkan riwayat.

---

### Task 1: Gunakan ulang pengukuran yang pernah dimasukkan

**Files:**
- Create: `app/src/features/skrining/measurementPrefill.ts`
- Modify: `app/src/features/skrining/ibu-hamil/RiskFactorScreen.tsx`
- Modify: `app/src/features/skrining/ibu-hamil/GiziScreen.tsx`
- Modify: `app/src/features/skrining/ibu-hamil/DmgScreen.tsx`
- Test: `app/scripts/measurement-prefill.test.mjs`

**Interfaces:**
- `measurementPrefill(results: ScreeningResult[], weights: WeightEntry[]): { bbPreKg?: number; tbCm?: number; bbSekarangKg?: { value: number; tanggal: string } }`.
- Untuk `bbPreKg` dan `tbCm`, pilih nilai terbaru yang lolos validasi field dari hasil `imt_lila`, `dmg`, atau `poedji_rochjati`; untuk `bbSekarangKg`, pilih `WeightEntry` terbaru dan sertakan tanggal.
- Jangan menambah kolom profil atau migrasi hanya untuk cache formulir; pengguna tetap dapat mengubah nilai sebelum submit.

- [ ] Tulis tes gagal di `measurement-prefill.test.mjs` untuk pemilihan nilai terbaru yang valid, menolak nilai tidak valid, dan tidak mengisi BB kini tanpa tanggal.
- [ ] Jalankan tes baru untuk memastikan gagal sebelum perubahan.
- [ ] Implementasikan pengisian awal hanya untuk field yang memiliki sumber terukur; jangan mengisi LILA atau nilai klinis yang tidak punya sumber.
- [ ] Pastikan submit memakai nilai yang tampil setelah pengguna mengoreksinya dan nilai lama tetap bisa dipulihkan dari draft.
- [ ] Jalankan tes terkait dan `npm run build` di `app/`.

### Task 2: Kembali ke daftar skrining dari halaman hasil

**Files:**
- Modify: `app/src/features/skrining/SkriningPage.tsx`
- Modify: `app/src/features/skrining/components/SkriningResultScreen.tsx`
- Test: `app/scripts/` tes hasil/navigasi skrining

**Interfaces:**
- Tambahkan callback `onDaftarSkrining: () => void` pada layar hasil.
- Callback menutup hasil dan kembali ke daftar skrining dengan kategori yang terakhir dipilih; jangan pindah ke Beranda.

- [ ] Tulis tes bahwa hasil menyediakan opsi kembali ke daftar selain Ulangi dan Beranda.
- [ ] Jalankan tes baru untuk memastikan gagal sebelum perubahan.
- [ ] Hubungkan callback di `SkriningPage`; tambahkan tombol “Daftar skrining” di layar hasil dengan tata letak responsif.
- [ ] Pastikan tombol tidak mengubah data hasil, hitungan progres, kategori aktif, atau perilaku overlay MERAH.
- [ ] Jalankan tes terkait dan `npm run build` di `app/`.

### Task 3: Skrining untuk beberapa bayi

**Files:**
- Modify: `app/src/data/db.ts` hanya jika tipe/index yang ada tidak memadai
- Modify: `app/src/App.tsx` dan alur `BirthDialog` untuk membuat/menyimpan profil bayi
- Modify: `app/src/features/skrining/SkriningPage.tsx`
- Modify: `app/src/features/skrining/useLatestScreeningDraft.ts` dan `screeningDraftUtils.ts`
- Modify: `app/src/features/skrining/bbl/IkterusScreen.tsx`, `HipotiroidScreen.tsx`, serta `ikterusForm.ts` / `hipotiroidForm.ts`
- Modify: `app/src/features/beranda/BerandaPage.tsx`, `app/src/features/skrining/nifas/NifasScreen.tsx`, dan `app/src/services/exportService.ts` bila pembacaan data bayi perlu disesuaikan
- Modify: `app/src/data/sync.ts`, `app/src/shared/components/layout/BirthDialog.tsx` bila kontrak penyimpanan perlu disesuaikan
- Create: `supabase/migrations/020_bbl_multiple_infants.sql` for per-infant label and birth measurements
- Test: tes seleksi bayi, pemisahan hasil/draft, dan kompatibilitas data lama

**Interfaces:**
- Identitas bayi berupa `babyId` stabil (`BBLProfile.id`), bukan nomor urut atau tanggal lahir; tanggal lahir yang sama tidak boleh menyatukan dua bayi.
- Baca dan verifikasi struktur `bbl_profiles` sebelum menentukan migrasi. Tabel SQL yang ada memiliki `id` dan `user_id`; gunakan banyak baris per pengguna bila batasan aktual mengizinkan.
- Simpan alias bayi, berat lahir, dan panjang lahir pada baris bayi yang sama; migrasi menambah kolom nullable agar baris lama tetap valid. ID unik bayi adalah kunci utama dan ID pengguna tetap menjadi pemilik/RLS.
- Hasil skrining BBL baru menyimpan `babyId` di `detail`; data lama tanpa `babyId` tetap ditampilkan sebagai riwayat bayi lama/default dan tidak disalin ke semua bayi.
- Pilihan bayi berlaku untuk formulir BBL. Formulir nifas ibu tetap terikat ke akun ibu, bukan bayi terpilih.
- Pertahankan baris bayi lama yang saat ini memakai `id === userId` sebagai bayi yang sudah ada; jangan membuat salinan otomatis saat pengguna menambahkan bayi kedua.

- [x] Tulis tes untuk dua bayi dengan tanggal lahir sama, draft terpisah per `babyId`, dan data lama tanpa `babyId`.
- [x] Jalankan tes regresi untuk seleksi/pemisahan bayi dan pastikan kasus owner salah atau ID bayi hilang ditolak.
- [x] Implementasikan daftar/tambah bayi dan pemilihan bayi sebelum membuka skrining BBL; jangan mengubah alur penanda nifas ibu.
- [x] Sertakan `babyId` saat menyimpan serta memulihkan draft/hasil Ikterus dan Hipotiroid; verifikasi payload sinkronisasi serta RLS `own_bbl`.
- [x] Jalankan `npm test` dan `npm run build` di `app/`; uji perangkat kecil, keyboard/pembaca layar, dan sinkronisasi Supabase langsung masih perlu dilakukan pada Task 4.

### Task 4: Verifikasi gabungan dan UAT

- [ ] Jalankan `npm test` dan `npm run build` dari `app/`.
- [ ] Verifikasi tiap poin pada lebar 320, 360, dan 480 px; uji keyboard dan pembaca layar untuk pemilihan bayi/tombol baru.
- [ ] Ulangi skenario TP-03 dengan nilai pengukuran berulang, berpindah dari hasil ke daftar, dan skrining dua bayi; catat bantuan, waktu, kesalahan, dan SEQ.
- [ ] Minta tinjauan bidan untuk memastikan pengisian otomatis tidak memberi kesan pengukuran terkini dan cakupan beberapa bayi sesuai produk.
- [ ] Perbarui `docs/BACKLOG.md` hanya setelah implementasi dan verifikasi; catat validasi klinis/UAT yang masih tertunda.
