# CYBER-LFSR — Interactive Stream Cipher Visual Simulator

**CYBER-LFSR** adalah aplikasi web interaktif untuk mensimulasikan dan memvisualisasikan cara kerja algoritma kriptografi *stream cipher* berbasis **LFSR (*Linear Feedback Shift Register*)** secara transparan dari awal hingga akhir. 

Aplikasi ini dibangun menggunakan **HTML5, CSS3, dan Vanilla JavaScript (ES6+)** tanpa *build tools* yang rumit, memadukan antarmuka gelap (*dark-mode*) yang terinspirasi dari sistem desain Spotify dengan animasi berbasis GPU untuk memperlihatkan setiap pergeseran bit, jalur umpan balik (*feedback tap*), dan operasi *bitwise* XOR secara nyata.

---

## Fitur Utama

1. **Konversi Teks ke Biner 8-Bit Transparan:**
   Memecah setiap karakter *plaintext* menjadi kode desimal ASCII/UTF-8, nilai heksadesimal, serta deretan 8-bit biner (*MSB* ke *LSB*).
2. **Visualisasi Register Geser LFSR & Sirkuit Tap SVG:**
   Menampilkan kotak-kotak bit register secara dinamis (mendukung konfigurasi 3-bit hingga 16-bit, dengan fokus pembelajaran standar pada **4-bit**) lengkap dengan jalur kabel SVG yang menyala saat menghitung bit umpan balik baru ($b_{\text{new}}$).
3. **Pemutar Simulasi *Time-Travel* & *Auto-Play*:**
   * Navigasi maju 1 bit (`Step +1`), mundur 1 bit (`Step -1`), maupun lompat 1 karakter (`+8 Bit`).
   * Mode pemutaran otomatis (`Auto-Play`) dengan pengaturan kecepatan (`0.5x` hingga `5x`).
4. **Matriks Perbandingan Bitwise XOR:**
   Menampilkan perbandingan bit demi bit secara sejajar antara *Plaintext* ($P_t$), *Keystream* ($K_t$), dan *Ciphertext* ($C_t$).
5. **Enkripsi & Dekripsi Dua Arah:**
   Dilengkapi konversi output ke format **Biner**, **Hexadecimal**, dan **Teks ASCII**, serta tombol pintas **"Uji Dekripsi Hasil Ini"** untuk memverifikasi bahwa *ciphertext* kembali menjadi pesan asli.

---

## Struktur Direktori Proyek

```text
stream-chiper/
├── index.html              # Struktur utama 4 panel, sirkuit SVG, & impor CDN
├── README.md               # Dokumentasi utama proyek
├── PRD.md                  # Product Requirements Document & spesifikasi teknis
├── DESIGN.md               # Panduan sistem desain antarmuka
├── css/
│   └── theme.css           # Styling dark-mode, tombol pill/circular, & elevasi
└── js/
    ├── lfsr-engine.js      # Mesin logika murni LFSR & konversi biner (decoupled)
    ├── animator.js         # Koreografi animasi GSAP, Anime.js, tsParticles, & Lottie
    └── app.js              # Pengendali state UI, event listener, & validasi input
```

---

## Teknologi & Library

Aplikasi ini berjalan sepenuhnya di sisi klien (*client-side*) menggunakan library yang dimuat melalui CDN:

* **HTML5 & CSS3 (Tailwind CSS + Custom CSS):** Tata letak responsif dan komponen antarmuka gelap akromatik (`#121212` / `#181818`) dengan aksen hijau fungsional (`#1ed760`).
* **Vanilla JavaScript (ES6+):** Pemisahan bersih antara perhitungan matematika (`lfsr-engine.js`) dan manipulasi tampilan (`app.js`).
* **GSAP 3 + Flip Plugin:** Menganimasikan pergeseran kotak bit register ke kanan dan pergerakan bit keluar menuju antrean *keystream*.
* **Anime.js:** Menganimasikan aliran sinyal listrik pada jalur kabel SVG dari posisi *tap* menuju gerbang XOR.
* **tsParticles:** Merender atmosfer partikel biner (`0` dan `1`) pada latar belakang.
* **Lottie-Web & Canvas-Confetti:** Menampilkan status gembok vektor interaktif dan efek visual saat dekripsi berhasil.
* **Lucide Icons:** Ikon kontrol pemutar simulasi.

---

## Cara Menjalankan Aplikasi

Karena tidak memerlukan proses kompilasi (*build*) maupun server *backend*, aplikasi dapat dijalankan dengan salah satu cara berikut:

1. **Buka Langsung di Browser:**
   * Ekstrak arsip proyek (`stream-chiper.zip`).
   * Klik dua kali file **`index.html`** untuk membukanya di browser modern (Chrome, Edge, Firefox, atau Safari).
2. **Menggunakan Local Development Server (Direkomendasikan):**
   * Jika menggunakan VS Code, klik kanan pada `index.html` lalu pilih **Open with Live Server**.
   * Atau jalankan server lokal via terminal di dalam folder proyek:
     ```bash
     # Menggunakan Python 3
     python -m http.server 8000

     # Atau menggunakan PHP
     php -S localhost:8000
     ```
   * Akses melalui browser di alamat `http://localhost:8000`.

---

## Ringkasan Logika Algoritma LFSR (Contoh 4-Bit)

Pada konfigurasi standar **4-bit**, register terdiri dari 4 sel bit $[b_3, b_2, b_1, b_0]$ dengan polinomial umpan balik $x^4 + x + 1$ (posisi *tap* aktif berada pada **$b_1$** dan **$b_0$**).

Dalam setiap 1 siklus detak waktu (*clock* ke-$t$), mesin di dalam `js/lfsr-engine.js` menjalankan 4 langkah berurutan:

1. **Keluarkan Bit Keystream ($K_t$):**
   Bit paling kanan (*Least Significant Bit* / $b_0$) dikeluarkan sebagai 1 bit *keystream*:
   $$K_t = b_0^{(t)}$$

2. **Hitung Bit Umpan Balik ($b_{\text{new}}$):**
   Nilai bit pada posisi *tap* yang aktif dioperasikan menggunakan gerbang logika XOR ($\oplus$):
   $$b_{\text{new}}^{(t)} = b_1^{(t)} \oplus b_0^{(t)}$$

3. **Geser Register ke Kanan (*Right-Shift*):**
   Seluruh isi kotak bergeser satu posisi ke kanan ($b_3 \rightarrow b_2$, $b_2 \rightarrow b_1$, $b_1 \rightarrow b_0$), dan $b_{\text{new}}^{(t)}$ masuk mengisi kotak paling kiri ($b_3$):
   $$[b_3^{(t+1)}, b_2^{(t+1)}, b_1^{(t+1)}, b_0^{(t+1)}] = [b_{\text{new}}^{(t)}, b_3^{(t)}, b_2^{(t)}, b_1^{(t)}]$$

4. **Operasi Bitwise XOR dengan Pesan:**
   * **Enkripsi:** $C_t = P_t \oplus K_t$
   * **Dekripsi:** $P_t = C_t \oplus K_t$

---

## Kasus Uji Verifikasi (*Benchmark*)

Gunakan skenario berikut untuk menguji dan memverifikasi keakuratan simulasi:

* **Mode:** Enkripsi
* **Plaintext:** `HI` (2 karakter = 16 bit: `01001000 01001001`)
* **Panjang Register:** `4-Bit`
* **Seed Awal:** `1001`
* **Tap Aktif:** `b1` dan `b0` ($x^4 + x + 1$)

| Clock ($t$) | Register Awal ($b_3 b_2 b_1 b_0$) | Hitungan Tap ($b_1 \oplus b_0$) | Keystream ($K_t$) | Register Baru | Bit Pesan ($P_t$) | Hasil XOR ($C_t$) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | `1001` | $0 \oplus 1 = 1$ | **`1`** | `1100` | `0` (`'H'`) | **`1`** |
| **2** | `1100` | $0 \oplus 0 = 0$ | **`0`** | `0110` | `1` | **`1`** |
| **3** | `0110` | $1 \oplus 0 = 1$ | **`0`** | `1011` | `0` | **`0`** |
| **4** | `1011` | $1 \oplus 1 = 0$ | **`1`** | `0101` | `0` | **`1`** |
| **5–8** | `0101` $\rightarrow$ `1111` | *(4 siklus berikutnya)* | `1010` | `1111` | `1000` | `0010` |
| **9–16** | `1111` $\rightarrow$ `1100` | *(8 siklus karakter `'I'`)* | `11110001` | `1100` | `01001001` | `10111000` |

* **Output Keystream (Hex):** `9A F1`
* **Output Ciphertext (Hex):** `D2 B8`
* Jika hasil `D2 B8` dimasukkan kembali ke mode **Dekripsi** dengan *seed* `1001` dan *tap* yang sama, sistem akan memulihkan teks asli **`HI`**.

---

## Validasi & Penanganan *Edge Case*

* **Larangan *All-Zero Seed* (`0000`):** Sistem menolak nilai *seed* yang seluruhnya nol karena menghasilkan keadaan macet (*dead-state*) di mana keluaran XOR akan selalu `0`.
* **Validasi Tap Aktif:** Simulasi hanya dapat dijalankan apabila minimal satu posisi *tap* diaktifkan.
* **Validasi Format Dekripsi:** Input *ciphertext* pada mode Dekripsi divalidasi agar hanya menerima karakter *Hexadecimal* yang valid (`0–9`, `A–F`) dengan jumlah digit genap.

---

## Konteks Pengembangan

Proyek ini disusun sebagai media pembelajaran dan demonstrasi mata kuliah **Kriptografi Modern** untuk memvisualisasikan konsep pembangkitan kunci aliran (*keystream generator*) berbasis perangkat keras register geser.