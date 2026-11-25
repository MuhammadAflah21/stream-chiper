# Product Requirements Document (PRD) & Panduan Teknis
## Aplikasi Simulasi dan Visualisasi Stream Cipher Berbasis LFSR

| Atribut Dokumen | Keterangan |
| :--- | :--- |
| **Nama Proyek** | LFSR Stream Cipher Visual Simulator |
| **Versi Dokumen** | 1.0 |
| **Tujuan Utama** | Media pembelajaran & simulasi interaktif enkripsi/dekripsi stream cipher berbasis LFSR dari level bit hingga teks |
| **Asumsi Platform** | Agnostik terhadap bahasa pemrograman; **direkomendasikan berbasis Web Interaktif (HTML5, CSS3/Tailwind CSS, Vanilla JavaScript atau React)** karena mendukung manipulasi elemen visual kotak register dan animasi pergeseran bit secara *real-time* di sisi klien (*client-side*) |

---

## 1. Ringkasan Proyek & Tujuan

### 1.1 Latar Belakang
Algoritma *stream cipher* bekerja dengan memproses data bit demi bit menggunakan operasi logika XOR terhadap deretan kunci acak semu (*keystream*). Pemula di bidang kriptografi sering mengalami kesulitan membayangkan bagaimana teks biasa diubah menjadi deretan biner, bagaimana *Linear Feedback Shift Register* (LFSR) menggeser bit dan menghitung umpan balik (*feedback*), serta bagaimana proses XOR membalikkan pesan secara simetris.

### 1.2 Tujuan Produk
1. Menyediakan simulasi transparan dari seluruh siklus kriptografi *stream cipher* LFSR: **Konversi Teks ke Biner $\rightarrow$ Pembangkitan Keystream LFSR $\rightarrow$ Enkripsi/Dekripsi XOR**.
2. Memvisualisasikan pergerakan internal register LFSR di setiap detak waktu (*clock cycle*) baik secara langkah demi langkah (*step-by-step*) maupun otomatis (*auto-play*).
3. Menjadi sarana verifikasi hitungan manual untuk kebutuhan praktikum maupun presentasi mata kuliah kriptografi.

### 1.3 Target Pengguna
* Mahasiswa dan dosen pengampu mata kuliah Kriptografi / Keamanan Informasi.
* Pembelajar mandiri yang ingin memahami mekanisme *bitwise* pada kriptografi simetris aliran.

---

## 2. Ruang Lingkup & Daftar Fitur Utama

### 2.1 Ruang Lingkup (*Scope*)
* **Dalam Ruang Lingkup (*In-Scope*):**
  * Konversi *plaintext* ke representasi desimal (ASCII/UTF-8) dan biner 8-bit per karakter.
  * Konfigurasi panjang register LFSR ($n$-bit, rentang $3 \le n \le 16$), nilai awal (*seed*), dan pemilihan posisi *tap* (*feedback polynomial*).
  * Visualisasi diagram kotak register geser, jalur umpan balik XOR, dan pengumpulan *keystream*.
  * Enkripsi dan dekripsi *bitwise* XOR dengan keluaran format Biner, Hexadecimal, dan Teks ASCII.
  * Kontrol pemutaran simulasi (Maju 1 *clock*, Mundur 1 *clock*, Lompat 1 byte / 8 *clock*, *Auto-Play*, dan *Reset*).
* **Di Luar Ruang Lingkup (*Out-of-Scope*):**
  * Manajemen akun pengguna, autentikasi, atau penyimpanan database *server-side*.
  * Penggunaan LFSR ini untuk pengamanan data produksi (*production-grade security*), mengingat LFSR tunggal bersifat linear dan rentan terhadap serangan aljabar (*Berlekamp-Massey*).

### 2.2 Kebutuhan Fungsional (*Functional Requirements*)

| Kode | Nama Fitur | Deskripsi Spesifikasi |
| :--- | :--- | :--- |
| **FR-01** | **Konversi Input ke Biner** | Sistem wajib memecah string *plaintext* menjadi karakter individual, menampilkan kode angka (ASCII/UTF-8), dan mengonversinya menjadi blok 8-bit biner secara berdampingan. |
| **FR-02** | **Konfigurasi Parameter LFSR** | Pengguna dapat mengatur panjang register $n$ (misal 4-bit, 8-bit, atau kustom), mengisi *seed* biner sepanjang $n$-bit (atau memakai tombol *Random Seed*), serta memilih posisi *tap* melalui kotak centang atau *preset* polinomial primitif. |
| **FR-03** | **Mesin Keystream LFSR** | Sistem menjalankan siklus *clock* sebanyak total bit pesan ($8 \times \text{jumlah byte}$). Pada setiap *clock*, sistem mengambil bit keluaran (*output bit*), menghitung bit umpan balik baru lewat operasi XOR pada bit *tap*, dan menggeser seluruh isi register. |
| **FR-04** | **Enkripsi & Dekripsi XOR** | Sistem melakukan operasi $C_i = P_i \oplus K_i$ saat mode Enkripsi dan $P_i = C_i \oplus K_i$ saat mode Dekripsi. Hasil enkripsi ditampilkan dalam format Biner dan Hexadecimal agar aman dari karakter kontrol tak terlihat. |
| **FR-05** | **Visualisasi 3 Tahap** | Antarmuka wajib menampilkan tiga panel visual yang tersinkronisasi: (1) Peta Karakter ke Biner, (2) Diagram Register Geser LFSR & Gerbang XOR, dan (3) Matriks Perbandingan Bit-demi-Bit XOR. |
| **FR-06** | **Kontrol Eksekusi Simulasi** | Pengguna dapat menjalankan simulasi per 1 bit (*Step Forward* / *Step Backward*), menjalankan otomatis dengan pengaturan kecepatan (*speed slider*), atau langsung melompat ke hasil akhir (*Instant Result*). |

### 2.3 Kebutuhan Non-Fungsional (*Non-Functional Requirements*)
* **NFR-01 (Kejelasan Visual):** Setiap perubahan nilai bit pada register harus memiliki indikator warna yang kontras (misalnya penanda khusus untuk posisi *tap*, bit yang keluar, dan bit baru yang masuk).
* **NFR-02 (Responsivitas & Performa):** Transisi antar-langkah (*step*) pada simulasi manual harus merespons dalam waktu $< 50\text{ ms}$.
* **NFR-03 (Determinisme):** Dengan *seed*, posisi *tap*, dan *plaintext* yang sama, urutan *keystream* dan *ciphertext* yang dihasilkan harus selalu identik di setiap pengujian.

---

## 3. Alur Kerja Pengguna (*User Flow*)

```text
[Mulai] 
   │
   ▼
[1. Pilih Mode Operasi] ──► Enkripsi (Input Teks) ATAU Dekripsi (Input Hex/Biner)
   │
   ▼
[2. Konfigurasi LFSR] ───► Atur Panjang Register (n) ──► Isi Seed (n-bit) ──► Pilih Posisi Tap
   │
   ▼
[3. Masukkan Pesan] ─────► Ketik Plaintext (misal: "HI") atau Ciphertext Hex (misal: "D2B8")
   │
   ▼
[4. Inisialisasi Mesin] ─► Sistem memvalidasi input & merender:
   │                        • Tahap 1: Peta Huruf → ASCII → Biner 8-bit
   │                        • Tahap 2: Kotak Register Awal (Clock = 0)
   │                        • Tahap 3: Matriks XOR kosong yang siap diisi
   ▼
[5. Eksekusi Simulasi] ──► Pengguna menekan [Step +1], [Step -1], atau [Auto-Play]
   │                        • Sorot bit pada posisi Tap
   │                        • Tampilkan hitungan bit umpan balik baru
   │                        • Geser bit register & dorong 1 bit ke Keystream
   │                        • Hitung 1 bit hasil XOR pada matriks
   ▼
[6. Hasil Akhir] ────────► Seluruh bit selesai diproses; tampilkan ringkasan Ciphertext (Hex & Biner)
                           atau Plaintext hasil dekripsi + tombol "Salin ke Mode Dekripsi"
```

---

## 4. Spesifikasi Teknis & Logika Algoritma

### 4.1 Model Matematis

#### A. Konversi Teks ke Aliran Bit
Untuk pesan dengan panjang $m$ byte, setiap byte karakter ke-$k$ ($0 \le k < m$) diubah menjadi representasi biner 8-bit (*Big-Endian* / MSB ke LSB):
$$B_k = (b_{k,7}, b_{k,6}, \dots, b_{k,0})_2 \quad \text{dengan} \quad \text{Nilai Byte} = \sum_{r=0}^{7} b_{k,r} \cdot 2^r$$
Seluruh blok 8-bit digabungkan secara berurutan menjadi deretan bit *plaintext* $P = (P_0, P_1, \dots, P_{L-1})$ dengan total panjang $L = 8m$ bit.

#### B. Mekanisme Pergeseran LFSR (Konvensi *Right-Shift*)
Misalkan register berukuran $n$-bit pada waktu ke-$t$ dinyatakan sebagai vektor state:
$$R^{(t)} = \left[ r_{n-1}^{(t)}, r_{n-2}^{(t)}, \dots, r_1^{(t)}, r_0^{(t)} \right]$$
di mana $r_{n-1}$ adalah bit paling kiri (*Most Significant Bit* / MSB) dan $r_0$ adalah bit paling kanan (*Least Significant Bit* / LSB).

Pada setiap detak waktu (*clock*) ke-$t$ ($t = 0, 1, \dots, L-1$):
1. **Bit Keluaran (*Keystream Bit*):** Bit paling kanan dikeluarkan sebagai bit *keystream* ke-$t$:
   $$K_t = r_0^{(t)}$$
2. **Bit Umpan Balik (*Feedback Bit*):** Dihitung dengan meng-XOR-kan seluruh bit yang berada pada himpunan indeks *tap* $T \subseteq \{0, 1, \dots, n-1\}$:
   $$b_{\text{new}}^{(t)} = \bigoplus_{j \in T} r_j^{(t)}$$
   *(Catatan: Dalam notasi polinomial $P(x) = x^n + \sum_{j \in T} c_j x^j$, jika $P(x)$ merupakan polinomial primitif atas $GF(2)$, maka LFSR akan menghasilkan periode siklus maksimum sepanjang $T_{\max} = 2^n - 1$ sebelum pola bit berulang).*
3. **Transisi Pergeseran (*Shift Transition*):** Seluruh bit bergeser 1 posisi ke kanan, dan $b_{\text{new}}^{(t)}$ masuk ke posisi paling kiri:
   $$r_{n-1}^{(t+1)} = b_{\text{new}}^{(t)}, \qquad r_j^{(t+1)} = r_{j+1}^{(t)} \quad \text{untuk } j = 0, 1, \dots, n-2$$

#### C. Enkripsi dan Dekripsi Bitwise XOR
Operasi XOR ($\oplus$) didefinisikan sebagai penjumlahan modulo 2 ($a \oplus b = (a + b) \bmod 2$):
* **Enkripsi:** $C_t = P_t \oplus K_t$
* **Dekripsi:** $P_t = C_t \oplus K_t$

---

### 4.2 Pseudocode Implementasi Setiap Tahap

#### Modul 1: Konversi Teks, Biner, dan Hexadecimal
```text
FUNCTION textToBinaryStream(plaintext):
    bytes = encodeUTF8(plaintext)
    charMappings = []
    fullBitStream = []

    FOR EACH byte IN bytes:
        binString = padLeft(toBinary(byte), 8, '0')
        bitsArray = splitToIntArray(binString) // array berisi delapan angka 0 atau 1
        APPEND {
            char: toDisplayChar(byte),
            decimal: byte,
            binary: binString,
            bits: bitsArray
        } TO charMappings
        CONCATENATE bitsArray INTO fullBitStream

    RETURN { charMappings, fullBitStream }
END FUNCTION

FUNCTION bitsToHex(bitArray):
    hexResult = ""
    FOR i = 0 TO length(bitArray) - 1 STEP 4:
        nibble = slice(bitArray, i, i + 4)
        decVal = binaryArrayToInt(nibble)
        hexResult = hexResult + toUpperHexChar(decVal)
    RETURN hexResult
END FUNCTION
```

#### Modul 2: Inisialisasi & Siklus Clock LFSR
```text
FUNCTION stepLFSR(currentRegister, tapIndices):
    // currentRegister indeks 0 adalah MSB (kiri), indeks n-1 adalah LSB (kanan)
    // Atau gunakan indeks matematis b_{n-1} ... b_0 secara konsisten
    n = length(currentRegister)
    
    // 1. Ambil bit paling kanan (LSB) sebagai output keystream
    outputBit = currentRegister[n - 1]
    
    // 2. Hitung bit feedback dari posisi tap yang aktif
    feedbackBit = 0
    tapValues = []
    FOR EACH tapPos IN tapIndices:
        // Misal tapPos menggunakan notasi b_k (0 = LSB, n-1 = MSB)
        arrayIdx = (n - 1) - tapPos
        bitVal = currentRegister[arrayIdx]
        feedbackBit = feedbackBit XOR bitVal
        APPEND { tapPos, bitVal } TO tapValues

    // 3. Geser seluruh bit ke kanan 1 langkah dan masukkan feedbackBit di kiri
    nextRegister = new Array(n)
    nextRegister[0] = feedbackBit
    FOR i = 1 TO n - 1:
        nextRegister[i] = currentRegister[i - 1]

    RETURN {
        previousRegister: copy(currentRegister),
        outputBit: outputBit,
        tapValues: tapValues,
        feedbackBit: feedbackBit,
        nextRegister: nextRegister
    }
END FUNCTION
```

#### Modul 3: Eksekusi Penuh & Perekaman Riwayat (*State History*) untuk Visualisasi
```text
FUNCTION runSimulation(inputBits, seedBits, tapIndices):
    registerState = copy(seedBits)
    history = []
    keystreamBits = []
    outputBits = []

    FOR clock = 0 TO length(inputBits) - 1:
        stepResult = stepLFSR(registerState, tapIndices)
        kBit = stepResult.outputBit
        inBit = inputBits[clock]
        outBit = inBit XOR kBit

        APPEND kBit TO keystreamBits
        APPEND outBit TO outputBits

        // Simpan snapshot setiap clock agar tombol "Step Backward" bekerja instan
        APPEND {
            clockNumber: clock + 1,
            registerBefore: stepResult.previousRegister,
            tapDetails: stepResult.tapValues,
            feedbackBit: stepResult.feedbackBit,
            registerAfter: stepResult.nextRegister,
            inputBit: inBit,
            keystreamBit: kBit,
            xorResultBit: outBit
        } TO history

        registerState = stepResult.nextRegister

    RETURN { history, keystreamBits, outputBits }
END FUNCTION
```

---

### 4.3 Contoh Simulasi Perhitungan Manual (Acuan Unit Test)

Gunakan kasus uji (*test case*) berikut untuk memverifikasi keakuratan kode program yang dibangun:

* **Parameter Konfigurasi:**
  * **Plaintext:** `"HI"` (2 karakter = 16 bit)
  * **Panjang Register ($n$):** $4\text{-bit}$ dengan susunan kotak $[b_3, b_2, b_1, b_0]$
  * **Nilai Awal (*Seed*):** `1001` ($b_3=1, b_2=0, b_1=0, b_0=1$)
  * **Polinomial Umpan Balik:** $P(x) = x^4 + x + 1 \implies$ posisi *tap* aktif pada **$b_1$ dan $b_0$**, sehingga:
    $$b_{\text{new}} = b_1 \oplus b_0$$

#### Tahap 1: Konversi Plaintext ke Biner
* Karakter `'H'` $\rightarrow$ ASCII `72` $\rightarrow$ Biner **`01001000`**
* Karakter `'I'` $\rightarrow$ ASCII `73` $\rightarrow$ Biner **`01001001`**
* Gabungan Aliran Bit Plaintext ($P$): `01001000 01001001`

#### Tahap 2: Pembangkitan 16-bit Keystream (16 Siklus Clock)

| Clock ($t$) | Register Awal ($b_3 b_2 b_1 b_0$) | Nilai Tap ($b_1, b_0$) | Hitungan $b_{\text{new}} = b_1 \oplus b_0$ | Bit Keluar ($K_t = b_0$) | Register Setelah Geser |
| :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | `1001` | $0, 1$ | $0 \oplus 1 = 1$ | **`1`** | `1100` |
| 2 | `1100` | $0, 0$ | $0 \oplus 0 = 0$ | **`0`** | `0110` |
| 3 | `0110` | $1, 0$ | $1 \oplus 0 = 1$ | **`0`** | `1011` |
| 4 | `1011` | $1, 1$ | $1 \oplus 1 = 0$ | **`1`** | `0101` |
| 5 | `0101` | $0, 1$ | $0 \oplus 1 = 1$ | **`1`** | `1010` |
| 6 | `1010` | $1, 0$ | $1 \oplus 0 = 1$ | **`0`** | `1101` |
| 7 | `1101` | $0, 1$ | $0 \oplus 1 = 1$ | **`1`** | `1110` |
| 8 | `1110` | $1, 0$ | $1 \oplus 0 = 1$ | **`0`** | `1111` |
| 9 | `1111` | $1, 1$ | $1 \oplus 1 = 0$ | **`1`** | `0111` |
| 10 | `0111` | $1, 1$ | $1 \oplus 1 = 0$ | **`1`** | `0011` |
| 11 | `0011` | $1, 1$ | $1 \oplus 1 = 0$ | **`1`** | `0001` |
| 12 | `0001` | $0, 1$ | $0 \oplus 1 = 1$ | **`1`** | `1000` |
| 13 | `1000` | $0, 0$ | $0 \oplus 0 = 0$ | **`0`** | `0100` |
| 14 | `0100` | $0, 0$ | $0 \oplus 0 = 0$ | **`0`** | `0010` |
| 15 | `0010` | $1, 0$ | $1 \oplus 0 = 1$ | **`0`** | `1001` *(Siklus penuh $2^4-1$)* |
| 16 | `1001` | $0, 1$ | $0 \oplus 1 = 1$ | **`1`** | `1100` |

* **Keystream Byte 1 (Clock 1–8):** `10011010` (Desimal `154` / Hex `0x9A`)
* **Keystream Byte 2 (Clock 9–16):** `11110001` (Desimal `241` / Hex `0xF1`)

#### Tahap 3: Operasi Enkripsi & Dekripsi XOR
* **Enkripsi Byte 1 (`'H'`):**
  $$\begin{aligned}
  P_{\text{byte 1}} &= 01001000 \\
  K_{\text{byte 1}} &= 10011010 \quad (\oplus) \\
  \hline
  C_{\text{byte 1}} &= \mathbf{11010010} \quad (\text{Desimal } 210 \text{ / Hex } \texttt{D2})
  \end{aligned}$$
* **Enkripsi Byte 2 (`'I'`):**
  $$\begin{aligned}
  P_{\text{byte 2}} &= 01001001 \\
  K_{\text{byte 2}} &= 11110001 \quad (\oplus) \\
  \hline
  C_{\text{byte 2}} &= \mathbf{10111000} \quad (\text{Desimal } 184 \text{ / Hex } \texttt{B8})
  \end{aligned}$$
* **Output Ciphertext Akhir:** Hex **`D2 B8`** | Biner **`11010010 10111000`**.
* **Verifikasi Dekripsi:** Meng-XOR-kan kembali `11010010 10111000` dengan *keystream* yang sama menghasilkan `01001000 01001001` $\rightarrow$ **`"HI"`**.

---

## 5. Spesifikasi Antarmuka & Komponen Visualisasi

### 5.1 Tata Letak Wireframe Antarmuka

```text
+-----------------------------------------------------------------------------------+
| HEADER: Simulasi & Visualisasi Stream Cipher LFSR         [Mode: Enkripsi/Dekripsi]|
+-----------------------------------------------------------------------------------+
| PANEL KONFIGURASI & INPUT                                                         |
|  [Panjang Register n: 4 v]  [Seed: 1001] [Acak]  [Preset Tap: x^4 + x + 1 v]      |
|  Tap Aktif: [ ] b3   [ ] b2   [x] b1   [x] b0                                     |
|  Input Pesan: [ HI                                          ]  [Mulai / Reset]    |
+-----------------------------------------------------------------------------------+
| TAHAP 1: PEMETAAN KARAKTER KE BINER                                               |
|  +-----------------------+   +-----------------------+                            |
|  | Huruf: 'H' (ASCII 72) |   | Huruf: 'I' (ASCII 73) |                            |
|  | [0][1][0][0][1][0][0][0] | | [0][1][0][0][1][0][0][1] |                          |
|  +-----------------------+   +-----------------------+                            |
+-----------------------------------------------------------------------------------+
| TAHAP 2: VISUALISASI REGISTER GESER LFSR (Clock: 1 / 16)                          |
|                                                                                   |
|      b_new = 1 (Masuk)          Tap: b1(0) XOR b0(1) = 1                          |
|           │                           ▲         ▲                                 |
|           ▼                           │         │                                 |
|      +---------+    +---------+    +---------+    +---------+                     |
|      |  b3: 1  | -> |  b2: 0  | -> |  b1: 0  | -> |  b0: 1  | ──► Out (K1 = 1)    |
|      +---------+    +---------+    +---------+    +---------+                     |
|                                                                                   |
|  Kumpulan Keystream Terbentuk: [ 1 ] _ _ _ _ _ _ _  _ _ _ _ _ _ _ _               |
|  Kontrol: [ |< Reset ]  [ < Mundur ]  [ Maju +1 > ]  [ Auto-Play ]  Speed: [===]  |
+-----------------------------------------------------------------------------------+
| TAHAP 3: MATRIKS PERBANDINGAN BITWISE XOR & OUTPUT AKHIR                          |
|  Plaintext (P)  : [0] 1 0 0 1 0 0 0 | 0 1 0 0 1 0 0 1                             |
|  Keystream (K)  : [1] _ _ _ _ _ _ _ | _ _ _ _ _ _ _ _                             |
|  Operasi        :  ⊕                                                              |
|  Ciphertext (C) : [1] _ _ _ _ _ _ _ | _ _ _ _ _ _ _ _                             |
|                                                                                   |
|  Hasil Ciphertext (Hex): D2 B8        [Salin & Uji Dekripsi ->]                   |
+-----------------------------------------------------------------------------------+
```

### 5.2 Detail Interaktivitas Visual Tiap Komponen
1. **Penyorotan Sinkron (*Synchronized Highlighting*):** Saat simulasi berada pada *clock* ke-$t$, kotak bit ke-$t$ pada Tahap 1 (*Plaintext*), kotak bit ke-$t$ pada deretan *Keystream*, dan kolom ke-$t$ pada matriks XOR Tahap 3 wajib disorot secara bersamaan dengan warna aktif agar pengguna melihat keterkaitan ketiga tahap.
2. **Kode Warna pada Kotak Register LFSR:**
   * **Biru / Netral:** Sel register standar.
   * **Kuning / Oranye:** Sel yang sedang aktif sebagai posisi *Tap* (dilengkapi garis penghubung menuju lencana rumus XOR).
   * **Hijau:** Bit baru ($b_{\text{new}}$) yang masuk di posisi paling kiri ($b_{n-1}$).
   * **Merah / Ungu:** Bit keluaran ($b_0$) yang didorong keluar menuju antrean *Keystream*.
3. **Panel Penjelasan Naratif Otomatis:** Di bawah diagram register, tampilkan 1 kalimat dinamis yang merangkum langkah saat ini (contoh: *"Clock #1: Bit keluar $b_0 = 1$. Umpan balik dihitung dari $b_1(0) \oplus b_0(1) = 1$, seluruh bit bergeser ke kanan, dan $0 \oplus 1$ menghasilkan bit ciphertext $1$."*).

---

## 6. Aturan Validasi & Penanganan *Edge Case*

| Skenario / *Edge Case* | Aturan Validasi & Solusi Penanganan |
| :--- | :--- |
| **Seed Bernilai Nol Semua (`000...0`)** | **Dilarang keras.** Jika *seed* berisi seluruhnya angka `0`, LFSR terjebak pada keadaan mati (*all-zero lockup*) dan menghasilkan *keystream* `0000...` terus-menerus. Sistem wajib menolak input ini, menampilkan pesan peringatan edukatif, atau menyediakan tombol *"Perbaiki Seed"* otomatis. |
| **Panjang Seed Tidak Sesuai Register ($n$)** | Input *seed* hanya boleh menerima karakter `0` dan `1`. Jika pengguna mengubah ukuran $n$ dari 4 menjadi 8, sistem otomatis memotong atau menambah bit acak pada *seed* agar panjangnya selalu sama dengan $n$. |
| **Tidak Ada Posisi Tap yang Dipilih** | Sistem mewajibkan minimal 1 posisi *tap* aktif. Jika pengguna tidak mencentang satu pun kotak *tap*, tombol jalankan simulasi dinonaktifkan dengan peringatan *"Pilih minimal satu posisi tap umpan balik"*. |
| **Tap Tidak Menghasilkan Periode Maksimal** | Sediakan daftar *preset* polinomial primitif (misal $x^4+x+1$, $x^8+x^4+x^3+x^2+1$) agar pengguna mudah melihat siklus acak terbaik, serta tampilkan indikator info jika siklus register mulai berulang (*period cycle reached*) sebelum pesan selesai. |
| **Karakter Ciphertext Tidak Dapat Dicetak** | Hasil XOR sering menghasilkan byte ASCII non-cetak (kode `0–31` atau `127–255`). Oleh karena itu, input pada **Mode Dekripsi** wajib menggunakan format **Hexadecimal** (validasi regex `/^[0-9A-Fa-f\s]+$/` dengan panjang karakter genap) atau **Biner** (kelipatan 8 bit), bukan teks mentah. |
| **Input Teks Terlalu Panjang** | Untuk menjaga performa rendering diagram kotak bit di layar, batasi panjang input maksimal **32 karakter** (256 bit / 256 *clock*) pada mode visualisasi interaktif. |

---

## 7. Tahapan Pengembangan (*Milestones*)

### Fase 1: Mesin Logika Kriptografi (*Core Engine*)
* Mengimplementasikan fungsi murni konversi Teks $\leftrightarrow$ Biner 8-bit $\leftrightarrow$ Hexadecimal.
* Mengimplementasikan fungsi `stepLFSR()` dan `runSimulation()` yang menghasilkan array riwayat (*state history*) lengkap.
* Melakukan pengujian unit (*unit testing*) menggunakan kasus uji manual kata **`"HI"`** dengan *seed* **`1001`** dan memverifikasi bahwa hasilnya adalah **`D2 B8`**.

### Fase 2: Struktur Antarmuka & Komponen Visual Statis
* Membangun *layout* 4 panel utama (Konfigurasi, Peta Biner, Diagram Register Geser, Matriks XOR).
* Merancang komponen visual kotak bit, panah pergeseran, dan indikator *tap* yang responsif.

### Fase 3: Kontrol Interaktif & Animasi Langkah demi Langkah
* Menghubungkan tombol *Step Forward*, *Step Backward*, *Next Byte (+8)*, dan *Reset* dengan indeks `currentClock` pada array `history`.
* Menambahkan fitur *Auto-Play* menggunakan *timer* (`setInterval` / `requestAnimationFrame`) yang kecepatannya dapat diatur pengguna.
* Menambahkan fitur tombol pintas *"Uji Dekripsi Hasil Ini"* yang otomatis memindahkan *ciphertext* Hex ke mode dekripsi dengan *seed* dan *tap* yang sama.

### Fase 4: Validasi, Preset Edukasi, & Penyempurnaan UX
* Menerapkan seluruh aturan validasi *edge case* (anti-*all-zero seed*, validasi input Hex saat dekripsi, pembatasan panjang karakter).
* Menambahkan *preset* polinomial primitif (4-bit, 5-bit, 8-bit) dan teks penjelasan naratif dinamis di setiap langkah.