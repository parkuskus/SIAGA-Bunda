# Arsitektur dan Cara Kerja Chatbot Kira

> Catatan pembelajaran AI Engineering berdasarkan implementasi SIAGA Bunda. Dokumen ini menjelaskan alur kode yang ada, bukan validasi klinis atau audit keamanan menyeluruh.

## Gambaran singkat

Kira bukan satu model AI yang melakukan semuanya. Sistemnya menggabungkan aturan deterministik, FAQ lokal, pencarian panduan kesehatan, dan LLM. Ini pola yang bagus untuk dipelajari karena banyak AI Engineering justru berkaitan dengan merancang sistem di sekitar model, bukan sekadar memanggil API.

```text
ChatbotPage (UI)
      │
      ▼
tanyaChatbot (router dan kebijakan)
      ├── salam / tanda bahaya → jawaban aturan langsung
      ├── topik FAQ cocok       → jawaban lokal
      ├── offline               → fallback lokal
      └── online + izin         → Supabase Edge Function
                                      │
                                      ├── autentikasi dan validasi
                                      ├── samarkan email / nomor telepon
                                      ├── cari potongan panduan (RAG)
                                      ├── panggil LLM
                                      ├── stream jawaban ke UI
                                      └── simpan percakapan online
```

## Komponen utama

| Komponen | Tanggung jawab |
|---|---|
| `app/src/features/chatbot/ChatbotPage.tsx` | UI chat, state percakapan di sesi berjalan, persetujuan AI eksternal, tampilan stream, dan overlay darurat. |
| `app/src/features/chatbot/personality.ts` | Persona Kira, sapaan, FAQ lokal, dan jawaban fallback. |
| `app/src/services/chatService.ts` | Router antara aturan lokal, FAQ, mode offline, dan layanan online. |
| `app/src/services/chatStream.ts` | Membaca event stream dari Edge Function dan meneruskan potongan jawaban ke UI. |
| `supabase/functions/chat/index.ts` | Validasi server, retrieval panduan, pemanggilan LLM, penyaringan output, streaming, dan penyimpanan pesan online. |
| `supabase/functions/_shared/chatPolicy.ts` | Aturan jawaban cepat, deteksi tanda bahaya, eskalasi, dan istilah pencarian. |
| `supabase/functions/_shared/chatRequest.ts` | Batas ukuran request, validasi pesan dan riwayat, penyamaran email/nomor telepon, dan validasi izin. |
| `supabase/functions/_shared/chatContext.ts` | Merakit pesan system, riwayat, pertanyaan terbaru, dan potongan panduan untuk LLM. |

## Cara kerja dari sudut pandang pengguna

### 1. UI menampung percakapan sementara

`ChatbotPage.tsx` menyimpan pesan di state React. Ketika pengguna mengirim pesan, UI mengambil paling banyak enam giliran percakapan terakhir sebagai riwayat agar Kira bisa memahami rujukan seperti “yang tadi”. Riwayat ini berasal dari state sesi UI, bukan hasil pemuatan ulang riwayat database.

### 2. Pesan masuk ke router, bukan langsung ke LLM

`chatService.ts` memeriksa pesan secara berurutan:

1. Aturan cepat di `chatPolicy.ts` menangani sapaan dan sebagian tanda bahaya.
2. Jika kata kunci cocok dengan FAQ, jawaban lokal digunakan.
3. Jika perangkat offline, Kira memakai FAQ atau pesan fallback.
4. Jika membutuhkan jawaban online, pengguna perlu memberi izin pemrosesan eksternal.

Dengan begitu, sebagian pesan tidak memerlukan pemanggilan model sama sekali.

### 3. Edge Function menjadi gerbang layanan AI

`supabase/functions/chat/index.ts` menerima request dan melakukan pemeriksaan server, termasuk:

- memverifikasi token dan pengguna Supabase;
- memastikan klaim MFA tersedia;
- memvalidasi ukuran dan bentuk request;
- memastikan persetujuan pemrosesan eksternal;
- menerapkan rate limit per pengguna.

API key model berada di secret server dan tidak ditaruh di aplikasi klien.

### 4. Sistem mencari konteks sebelum bertanya ke model

Edge Function membuat embedding dari pesan, lalu mencari potongan panduan melalui fungsi database `match_guideline_hybrid`. Pencarian ini hybrid: menggabungkan kemiripan vektor dan kecocokan kata. Potongan yang memenuhi ambang relevansi dipilih, maksimal empat potongan, kemudian dibatasi panjangnya.

Jika embedding atau retrieval gagal, kode dapat melanjutkan tanpa konteks panduan. Jadi retrieval membantu model, tetapi bukan jaminan setiap jawaban memiliki sumber.

### 5. LLM menyusun jawaban

Prompt yang dikirim terdiri dari:

- **system prompt**, yang menjelaskan persona Kira, gaya bahasa, cakupan, serta batas klinis;
- **riwayat percakapan singkat**;
- **pertanyaan terbaru**;
- **potongan panduan** yang dinilai relevan, jika ada.

Model dipanggil melalui endpoint yang kompatibel dengan format OpenAI. Kode mengatur `temperature: 0.2`, batas token, dan streaming.

### 6. Jawaban dialirkan, diperiksa, dan ditampilkan

Server mengirim jawaban sebagai event stream. `chatStream.ts` membaca event dan `ChatbotPage.tsx` menampilkan teks sedikit demi sedikit. Server juga memeriksa pola tertentu yang terlihat seperti proses berpikir internal atau metadata keselamatan.

Setelah jawaban online selesai, server mencoba menyimpan pesan pengguna dan asisten di `chat_messages`. Jika layanan online gagal, `chatService.ts` mencoba memberi jawaban FAQ/fallback lokal agar pengalaman pengguna tidak langsung terputus.

## Hubungannya dengan konsep AI Engineering

| Konsep | Penerapan di Kira |
|---|---|
| **Orchestration dan routing** | `chatService.ts` memilih jalur aturan, FAQ lokal, offline, atau LLM. Sistem AI adalah alur beberapa komponen, bukan hanya model. |
| **RAG (Retrieval-Augmented Generation)** | Panduan dicari dari database, lalu potongan relevan dimasukkan ke konteks model. Model tidak diandalkan hanya dari pengetahuan internalnya. |
| **Hybrid retrieval** | Pencarian menggabungkan embedding dan kecocokan kata. Ini membantu saat istilah tertentu perlu dicari secara leksikal sekaligus semantis. |
| **Prompt engineering** | System prompt mengatur persona, cakupan, penggunaan panduan, gaya jawaban, dan batas klinis. |
| **Guardrails** | Validasi input, batas ukuran, rate limit, aturan tanda bahaya, persyaratan izin, dan penyaringan output. |
| **Streaming** | Jawaban dikirim bertahap agar pengguna tidak perlu menunggu seluruh generasi selesai. |
| **Data minimization** | Riwayat dibatasi dan teks untuk LLM disamarkan dari pola email serta nomor telepon. |
| **Resilience dan fallback** | Jawaban cepat, FAQ lokal, dan mode offline mengurangi ketergantungan pada layanan model daring. |
| **Observability** | Edge Function mencatat waktu embedding, retrieval, token pertama, penyelesaian, dan total request. Ini metrik awal untuk memantau latensi. |

## Hal penting untuk dipahami

### `verified` tidak selalu berarti ditinjau ahli

Pada jalur online, status `verified` menjadi `true` jika ada potongan panduan yang berhasil diambil. Itu lebih tepat dibaca sebagai **jawaban memiliki konteks panduan**, bukan **jawaban LLM sudah disetujui ahli**. FAQ lokal mempunyai penanda `terverifikasiAhli` tersendiri.

### RAG membantu, tetapi tidak menjamin jawaban benar

Model masih dapat salah memahami konteks, menghasilkan jawaban yang kurang tepat, atau tidak memanfaatkan sumber dengan baik. Kualitas sistem perlu diuji pada tingkat retrieval dan jawaban.

### Deteksi tanda bahaya berbasis teks punya batas

Aturan berbasis pola di `chatPolicy.ts` dapat melewatkan variasi bahasa atau salah menangkap konteks. Aturan tersebut berguna sebagai lapisan keselamatan, tetapi bukan pengganti penilaian tenaga kesehatan.

### Catatan privasi tentang penyimpanan pesan

Teks yang dikirim ke LLM disamarkan dari pola email dan nomor telepon melalui `minimizeExternalText`. Namun, kode penyimpanan `chat_messages` memasukkan `message` asli. Artinya, penyamaran untuk pemrosesan LLM tidak otomatis berarti isi yang tersimpan di database juga disamarkan.

### Riwayat online dan riwayat UI berbeda

Pesan pada UI disimpan di state React untuk sesi berjalan. Jalur online juga mencoba menyimpan pesan di database, tetapi dari kode yang dibaca, riwayat database tersebut tidak dimuat kembali saat chatbot dibuka.

## Peta belajar AI Engineering dari implementasi ini

Urutan belajar yang cocok:

1. **Pemanggilan model dan struktur pesan** — pahami system prompt, user message, riwayat, parameter model, dan respons.
2. **Routing** — pelajari kapan memakai aturan, FAQ, atau LLM dan bagaimana menjaga jalur fallback.
3. **RAG** — pelajari chunking dokumen, embedding, pencarian hybrid, ambang relevansi, serta evaluasi retrieval.
4. **Guardrails dan keselamatan** — validasi input/output, batas penggunaan, keamanan klinis, dan penanganan kegagalan.
5. **Privasi dan tata kelola data** — telusuri data apa yang dikirim ke vendor model, disimpan di database, dan ditampilkan ke pengguna.
6. **Evaluasi dan observability** — ukur kualitas jawaban, kualitas sumber, latensi, kegagalan, dan perilaku fallback.

Untuk chatbot kesehatan, kebijakan keselamatan, privasi, dan batas klaim sama pentingnya dengan kualitas model.

## Batas catatan ini

Dokumen ini merangkum alur berdasarkan kode yang dibaca. Dokumen ini tidak menjalankan aplikasi, memeriksa konfigurasi deployment, melakukan audit keamanan menyeluruh, atau memvalidasi isi klinis. Perilaku aktual juga bergantung pada konfigurasi Supabase dan layanan model.
