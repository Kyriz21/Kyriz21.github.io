# Review Build QA checklist — DiRi / LDR Playroom v1.0

Gunakan dua perangkat/browser profile berbeda. Tandai hanya setelah diuji secara nyata.

## A. Publish and room foundation

- [ ] Anonymous Auth aktif.
- [ ] Domain GitHub Pages terdaftar di Firebase Authorized domains.
- [ ] Database URL pada `js/firebase.js` cocok dengan Console.
- [ ] `firebase-database.rules.json` berhasil dipublikasikan.
- [ ] Website terbuka pada laptop dan HP melalui HTTPS.
- [ ] Host membuat room dan kode enam karakter tampil.
- [ ] Guest bergabung dan kedua nama/status terlihat di kedua perangkat.
- [ ] Pemain ketiga tidak dapat mengambil kursi Guest.
- [ ] Pilihan game tersinkron dan harus cocok.
- [ ] Ready dari satu pemain saja tidak mengaktifkan Start.
- [ ] Kedua Ready mengaktifkan Start untuk Host.
- [ ] Perubahan pilihan mereset kedua status Ready.
- [ ] Guest Leave membebaskan slot tanpa menutup room.
- [ ] Host Leave menutup room untuk kedua pemain.
- [ ] Refresh pada UID sama memulihkan room.
- [ ] Reconnect guest diuji sebelum dan setelah grace period 5 menit.
- [ ] Room expired setelah TTL logis 24 jam (uji dengan data waktu pada environment test, jangan tunggu pada penggunaan biasa).

## B. Tic Tac Toe

- [ ] Simbol Host/Guest berbeda dan papan 3×3 sama di kedua perangkat.
- [ ] Starter acak.
- [ ] Pemain di luar giliran tidak dapat bergerak.
- [ ] Double click/aksi ganda tidak menempatkan dua simbol.
- [ ] Win horizontal, vertical, diagonal terdeteksi.
- [ ] Draw terdeteksi dan counter draw bertambah.
- [ ] Refresh memulihkan board/turn.
- [ ] Rematch menunggu persetujuan kedua pemain.

## C. Love Quiz

- [ ] Kedua mode tampil: How Well You Know Me dan How Compatible Are We.
- [ ] Setup hanya mulai setelah kedua pemain approve.
- [ ] Question count divalidasi 1–30; default 10.
- [ ] Empat opsi tersedia per pertanyaan.
- [ ] Jawaban lawan tidak terlihat sebelum kedua submit.
- [ ] HWM berjalan dua sesi target (Host lalu Guest).
- [ ] Compatibility menampilkan match points/percentage.
- [ ] Next memerlukan kedua pemain.
- [ ] Custom library Export/Import berhasil.
- [ ] Rematch memerlukan kedua pemain.

## D. This or That

- [ ] Sumber DiRi, Custom, dan gabungan.
- [ ] Kategori dapat dipilih.
- [ ] Count 1–30, default 10.
- [ ] Kedua pemain menerima dua opsi yang sama.
- [ ] Hidden Reveal berjalan.
- [ ] Match percentage dan streak benar.
- [ ] Next dan Rematch memerlukan kedua pemain.
- [ ] Custom Library Export/Import berhasil.

## E. Truth or Dare

- [ ] Mode Self Selection dan Partner Challenge.
- [ ] Initiator bergantian.
- [ ] Kartu Truth dan Dare tampil sesuai sumber/kategori/intensitas.
- [ ] Setiap pemain mulai dengan tiga Skip.
- [ ] Skip hanya mengurangi token target.
- [ ] Jawaban Truth dan Done Dare tersinkron.
- [ ] Pemain dapat keluar/pause jika tidak nyaman.
- [ ] Statistik sesi dan Rematch bekerja.

## F. Memory Card

- [ ] Duel dan Together Mode tersedia.
- [ ] Easy 4×4, Medium 4×6, Hard 6×6.
- [ ] Kartu terkocok dan setiap pasangan punya dua kartu.
- [ ] Duel match memberi poin dan extra turn.
- [ ] Duel mismatch menutup kartu dan berpindah turn.
- [ ] Together menghitung attempts/moves/time.
- [ ] Custom image: kedua perangkat impor file yang sama, hash/order sama.
- [ ] Refresh/reconnect memulihkan board.
- [ ] Rematch memerlukan persetujuan kedua pemain.

## G. Connect Four

- [ ] Papan 7×6.
- [ ] Token jatuh ke slot terbawah yang tersedia.
- [ ] Random starter.
- [ ] Kolom penuh menolak langkah.
- [ ] Win horizontal, vertical, dan diagonal terdeteksi.
- [ ] Draw terdeteksi.
- [ ] Refresh memulihkan board/turn.
- [ ] Rematch memerlukan persetujuan kedua pemain.

## H. Draw & Guess

- [ ] Enam ronde, 90 detik per ronde.
- [ ] Drawer pertama acak dan peran bergantian.
- [ ] Kata rahasia hanya tampil untuk Drawer.
- [ ] Kanvas bisa menggambar via mouse dan touch.
- [ ] Stroke muncul pada perangkat pasangan.
- [ ] Guesser dapat mengirim tebakan.
- [ ] Hint hanya untuk Guesser dan menonaktifkan bonus cepat.
- [ ] Skor +1 Drawer, +1 Guesser, bonus cepat +1 jika benar <=30 detik tanpa hint.
- [ ] Timeout dan reconnect diuji.

## I. Tebak Kata

- [ ] Classic Clue dan Forbidden Words.
- [ ] Enam ronde, 90 detik.
- [ ] Clue giver pertama acak dan peran bergantian.
- [ ] Kata rahasia dan forbidden list hanya pada jalur privat Clue Giver.
- [ ] Hint per ronde.
- [ ] Masing-masing pemain dua token Skip sepanjang match.
- [ ] Strict answer matching; alternatif yang terdaftar diterima.
- [ ] Forbidden whole-word validation diuji (termasuk tanda baca/case).
- [ ] Timeout, Skip Word, Give Up, scoring, reconnect diuji.

## J. Photobooth Solo

- [ ] Mode Solo dapat dibuka.
- [ ] Kamera hanya aktif setelah izin.
- [ ] Gallery upload empat gambar berjalan jika kamera tidak tersedia.
- [ ] Dua belas frame tersedia.
- [ ] Delapan preset filter dan empat adjustment dapat digunakan.
- [ ] Stiker/teks tampil.
- [ ] PNG/JPEG dapat diunduh.
- [ ] Private Gallery menyimpan dan menghapus item lokal.

## K. Photobooth Couple

- [ ] Kedua pemain memilih Couple Photobooth.
- [ ] Kedua pemain memilih frame yang sama.
- [ ] Shared Filter ditampilkan seragam.
- [ ] Empat foto per perangkat dapat diambil/diunggah.
- [ ] Countdown dan progress kedua pemain benar.
- [ ] P2P dicoba pada dua jaringan; foto diterima utuh bila koneksi berhasil.
- [ ] Bila gagal, satu retry terjadi lalu Manual Transfer.
- [ ] Manual Transfer mengharuskan 8 foto dengan urutan Host 1–4 lalu Guest 1–4.
- [ ] SHA-256 menolak set foto/order yang berbeda.
- [ ] Shared Editor menyinkronkan tambah/pilih/move/resize/delete/undo-own.
- [ ] Kedua pemain wajib approve sebelum finalisasi.
- [ ] PNG/JPEG dapat diunduh dan Private Gallery lokal bekerja.
- [ ] Full retake memerlukan dua persetujuan.
- [ ] Foto tidak muncul pada RTDB.

## L. Mobile and regression

- [ ] Uji ukuran layar 320–430 px.
- [ ] Tombol mudah disentuh, keyboard tidak menutupi input.
- [ ] Tidak ada horizontal overflow.
- [ ] Back/Leave/Ready/Submit/Skip semua bekerja.
- [ ] Semua game membuka modul masing-masing, bukan Tic Tac Toe.
- [ ] Refresh tidak menghapus sesi yang seharusnya dapat dipulihkan.
- [ ] Listener dan kamera dibersihkan ketika meninggalkan game.

## Hasil review

Perangkat/browser:

- Host:
- Guest:
- Tanggal:
- Browser:
- Firebase Rules version:

Bug/temuan:

- [ ] Tidak ada P0 blocker
- [ ] P1/P2 dicatat dan diprioritaskan sebelum penggunaan rutin
