# Hapus project Firebase lama dan siapkan project baru

Instruksi lengkap ada di `FIREBASE-SETUP-NEW-PROJECT.md`. Ringkasnya:

1. Firebase Console → pilih project lama → Project settings → General → Delete project.
2. Buat project Firebase baru dengan Project ID berbeda. ID lama yang sudah dihapus tidak dapat digunakan ulang.
3. Daftarkan Web App `LDR Playroom Web`; jangan aktifkan Firebase Hosting karena hosting tetap memakai GitHub Pages.
4. Buat Realtime Database di Singapore (`asia-southeast1`) dalam Locked mode.
5. Aktifkan Authentication → Anonymous.
6. Publish seluruh isi `firebase-database.rules.json` ke Realtime Database → Rules.
7. Isi semua placeholder `PASTE_...` dalam `js/firebase.js` menggunakan Web App config baru dan Database URL yang ditampilkan pada halaman Data.
8. Upload isi folder ke root repository GitHub yang sama.

Peringatan: menghapus project menghentikan layanan Firebase/Google Cloud dan menghilangkan akses ke Web App, Authentication, dan database. Firebase Help menyebut pemilik dapat memulihkan project dalam 30 hari melalui Google Cloud Console. Setelah project dihapus permanen, Project ID lama tidak dapat digunakan kembali.
