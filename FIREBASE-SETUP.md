# Firebase setup — Complete Review Build DiRi / LDR Playroom

Paket ini ditargetkan untuk Firebase **Spark plan**. Jangan aktifkan Billing/Blaze untuk konfigurasi ini.

## 1. Pastikan project dan Web App

1. Buka https://console.firebase.google.com/.
2. Pilih project yang memang dipakai untuk LDR Playroom.
3. Periksa Project ID pada Project settings → General.
4. Buka `js/firebase.js` dan bandingkan `projectId`, `authDomain`, dan `databaseURL` dengan nilai Firebase Console.
5. Database URL harus disalin dari Realtime Database → Data (bagian URL), jangan ditebak dari nama project atau region.

File `js/firebase.js` sudah berisi konfigurasi Web App yang digunakan ketika paket ini dibuat. Jika project di Console berbeda, ubah semua nilai Web App config secara konsisten. Jangan mencampur nilai dari dua project.

Firebase Web API key adalah konfigurasi client-side yang memang digunakan browser; bukan pengganti Security Rules. Jangan pernah menambahkan Admin SDK service-account JSON, private key, atau credential server ke repository.

## 2. Anonymous Authentication

1. Firebase Console → Build → Authentication.
2. Pilih Get started jika belum diinisialisasi.
3. Tab Sign-in method.
4. Pilih Anonymous → Enable → Save.
5. Authentication → Settings → Authorized domains.
6. Pastikan domain GitHub Pages terdaftar: `kyriz21.github.io` (domain saja, tanpa protokol atau path repository).

Jika memakai domain GitHub Pages lain atau custom domain, tambahkan domain yang benar.

## 3. Realtime Database

1. Firebase Console → Build → Realtime Database.
2. Pilih database yang URL-nya cocok dengan `js/firebase.js`.
3. Backup data lama sebelum menghapusnya.
4. Jika ingin memulai bersih, hapus hanya node `/rooms` lama. Jangan hapus database atau Firebase project.
5. Buka tab Rules.
6. Buka file `firebase-database.rules.json` dari paket ini.
7. Salin seluruh JSON dan ganti isi editor Rules.
8. Klik Publish dan pastikan tidak ada error validasi.

Jangan menambahkan `.read: true` atau `.write: true` di root. Jangan menambahkan root-level `.read: false` atau `.write: false` yang dapat menghalangi aturan child path yang sengaja diberikan. Gunakan file Rules secara utuh sebagai satu set.

**Penting:** Rules adalah gerbang akses database tetapi belum membuat client game menjadi backend tepercaya. Baca `SECURITY-NOTES.md`.

## 4. GitHub Pages

1. Upload isi folder proyek ini ke root repository (jangan upload folder pembungkus ZIP).
2. Pastikan `index.html` ada langsung di root repository.
3. GitHub repository → Settings → Pages.
4. Source: `Deploy from a branch`.
5. Branch: `main` (atau branch publikasi yang memang digunakan repository).
6. Folder: `/(root)`.
7. Save.
8. Tunggu deployment selesai di tab Actions.
9. Buka URL Pages melalui HTTPS. Camera API memerlukan secure context (HTTPS atau localhost).

Contoh URL repository saat ini: `https://kyriz21.github.io/ldr-playroom/`.

## 5. Uji dengan dua identitas

- Perangkat A: laptop/desktop sebagai Host.
- Perangkat B: HP sebagai Guest, menggunakan browser profile yang berbeda.
- Jangan memakai dua tab dalam profile browser yang sama untuk mewakili dua pemain; keduanya dapat berbagi UID anonim.
- Buat room di A, join di B, cocokkan game, Ready pada kedua perangkat, lalu Start dari Host.
- Uji Leave, refresh, reconnect, serta semua alur game di `REVIEW-BUILD-QA.md`.

## 6. Kegagalan umum

| Error | Yang perlu diperiksa |
|---|---|
| `auth/unauthorized-domain` | Domain Pages belum ada di Authorized domains. |
| `auth/operation-not-allowed` | Anonymous provider belum diaktifkan. |
| `permission_denied` | Database URL/project tidak cocok atau Rules belum dipublikasikan. |
| Room tidak ditemukan | Kode salah, room ditutup, atau room kedaluwarsa. |
| Guest tidak bisa join | Slot guest masih diisi; tunggu reconnect grace atau host release slot sesuai Rules. |
| Blank page / module error | `index.html` bukan di root, file hilang, atau import path salah. |
| Kamera tidak tersedia | Izin kamera belum diberikan, browser tidak mendukung, atau halaman bukan HTTPS. Gunakan upload gambar sebagai fallback. |

Jangan mengubah Rules menjadi publik untuk “memperbaiki” permission error. Periksa path dan identitas project terlebih dahulu.
