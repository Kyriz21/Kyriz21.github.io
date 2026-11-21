# DiRi / LDR Playroom — Complete Review Build v1.0

Web app multiplayer untuk dua pemain LDR. Paket ini menggabungkan fondasi room, delapan mini-game, dan DiRi Photobooth dalam satu source tree agar dapat diunggah dan direview sebagai satu versi.

> **Status:** Review Build. Kode dan unit test lokal sudah diperiksa, tetapi integrasi Firebase, pengujian dua perangkat nyata, serta WebRTC di berbagai jaringan belum dapat dianggap lulus sebelum diuji pada project Firebase dan GitHub Pages milik pengguna.

## Fitur dalam paket

### Sistem room
- Firebase Anonymous Authentication.
- Create Room dan Join Room dengan kode enam karakter.
- Maksimal dua pemain, Host dan Guest.
- Presence online/offline, reconnect untuk UID yang sama, dan guest grace period 5 menit.
- Pilihan game harus cocok, kedua pemain Ready, lalu Host memulai.
- Host Leave menutup room; Guest Leave membebaskan slot guest.
- Room kedaluwarsa secara logis setelah 24 jam tanpa aktivitas bermakna.

### Delapan game
1. **Tic Tac Toe** — papan 3×3, simbol DiRi, giliran, skor room, draw, dan mutual rematch.
2. **Love Quiz** — How Well You Know Me dan How Compatible Are We, empat opsi, hidden answers, Personal Library lokal, mutual approval/next/rematch.
3. **This or That** — dua opsi, hidden reveal, compatibility percentage, streak, Personal Library lokal, mutual approval/next/rematch.
4. **Truth or Dare** — Self Selection dan Partner Challenge, kategori/intensitas, custom cards, tiga Skip per pemain, ringkasan sesi.
5. **Memory Card** — Memory Duel dan Together Mode; Easy 4×4, Medium 4×6, Hard 6×6; deck preset atau foto lokal yang diimpor dengan hash/order yang sama.
6. **Connect Four** — papan 7×6, token pastel/Heart Theme, random starter, win/draw, dan mutual rematch.
7. **Draw & Guess** — enam ronde, 90 detik, kanvas sentuh/mouse real-time, satu hint, jawaban dan skor sesuai aturan game.
8. **Tebak Kata** — Classic Clue dan Forbidden Words, enam ronde, 90 detik, hint, dua token Skip per pemain, strict answer matching.

### DiRi Photobooth
- Solo dan Couple Photobooth.
- Empat foto per pemain untuk hasil Couple Side by Side (delapan foto total).
- Dua belas frame, delapan preset filter, dan pengaturan manual.
- Kamera atau pemilihan foto dari galeri.
- Shared Filter dan Shared Editor metadata realtime.
- Persetujuan dua pihak sebelum finalisasi dan ekspor PNG/JPEG.
- Private Gallery tersimpan pada perangkat/browser masing-masing melalui IndexedDB.
- Couple mode mencoba WebRTC DataChannel dengan STUN; satu retry, lalu Manual Transfer delapan file dengan verifikasi SHA-256.

## Struktur proyek

```text
ldr-playroom/
├── index.html
├── README.md
├── FIREBASE-SETUP.md
├── SECURITY-NOTES.md
├── KNOWN-LIMITATIONS.md
├── REVIEW-BUILD-QA.md
├── firebase-database.rules.json
├── assets/
├── css/
│   ├── styles.css
│   └── review-build.css
├── js/
│   ├── app.js
│   ├── constants.js
│   ├── firebase.js
│   ├── room-utils.js
│   ├── services/
│   ├── games/
│   └── photobooth/
└── tests/
```

## Teknologi dan batasan biaya
- Hosting statis: GitHub Pages.
- Firebase: Spark plan, Anonymous Auth, Realtime Database.
- Firebase Web SDK modular melalui CDN; tidak perlu npm install atau bundler untuk menjalankan situs.
- IndexedDB untuk Custom Library, media lokal, dan Private Gallery.
- WebRTC + STUN untuk percobaan transfer langsung; tidak memakai TURN berbayar.
- **Tidak memakai Cloud Storage, Cloud Functions, server khusus, atau database tambahan.**

## Cara memasang

1. Backup repository lama.
2. Ekstrak ZIP ini.
3. Periksa project ID dan Database URL di `js/firebase.js` agar sama dengan Firebase Console.
4. Aktifkan Anonymous Authentication dan daftarkan domain GitHub Pages di Authorized domains.
5. Publikasikan isi `firebase-database.rules.json` pada Realtime Database Rules.
6. Salin **isi folder ini** ke root repository GitHub (jangan salin folder pembungkus dan jangan menghapus `.git`).
7. Commit dan push ke branch yang dipakai GitHub Pages (umumnya `main`).
8. Atur GitHub Pages ke `Deploy from a branch` → branch `main` → folder `/(root)`.
9. Uji laptop sebagai Host dan HP sebagai Guest menggunakan checklist `REVIEW-BUILD-QA.md`.

Langkah lengkap tersedia di `FIREBASE-SETUP.md`. Status pemeriksaan source lokal dicatat dalam `BUILD-VERIFICATION.md`; batasan yang belum diselesaikan ada di `KNOWN-LIMITATIONS.md`.

## Pengujian lokal yang tersedia

Jalankan dari folder proyek dengan Node.js:

```bash
npm test
```

Atau:

```bash
node --test
```

Pengujian mencakup helper room, TTL, aturan Start, Tic Tac Toe, Connect Four, normalisasi jawaban, persentase compatibility, dan streak. Unit test tidak menggantikan pengujian Firebase Rules/Emulator atau dua browser nyata.

## Data dan privasi
- RTDB hanya untuk room metadata, state game, signaling WebRTC, dan operasi editor yang kecil.
- Binary foto tidak ditulis ke RTDB.
- Gambar Memory Card custom harus diimpor secara lokal oleh kedua pemain dengan file/hash dan urutan yang sama.
- Galeri pribadi tidak tersinkron ke pasangan dan tidak diunggah ke server.
- Room code adalah kode undangan (bearer token); jangan menyimpan informasi rahasia di room.

Baca `SECURITY-NOTES.md` dan `KNOWN-LIMITATIONS.md` sebelum menguji dengan foto atau data pribadi.

## Hak cipta
© 2026 DiRi. All rights reserved for original DiRi / LDR Playroom project assets and implementation. Firebase, GitHub, browser APIs, and other third-party components remain subject to their respective terms and licenses. See `COPYRIGHT.md`.
