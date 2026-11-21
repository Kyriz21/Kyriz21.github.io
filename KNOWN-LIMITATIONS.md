# Known limitations — Complete Review Build v1.0

Dokumen ini sengaja mencatat keterbatasan yang harus diperiksa saat review. Build ini bukan klaim bahwa semua skenario sudah lulus pengujian produksi.

## Infrastruktur gratis

1. Tidak ada Cloud Storage atau Cloud Functions.
2. Tidak ada TURN relay. WebRTC STUN-only dapat gagal pada sebagian jaringan. Manual Transfer dan Solo/abort fallback tersedia.
3. Realtime Database hanya menyimpan state/metadata kecil. Jangan mengunggah foto, canvas screenshot, atau base64 ke RTDB.
4. Tidak ada backend tepercaya untuk anti-cheat. Game kasual, bukan kompetisi berhadiah.
5. TTL 24 jam adalah expiry logis; cleanup fisik best-effort, tidak ada scheduled cleanup pada Spark.

## Photobooth

- Couple P2P perlu diuji dari dua jaringan dan browser nyata. Lingkungan container tidak dapat membuktikan konektivitas WebRTC.
- Manual Transfer mengharuskan kedua pemain memilih file yang persis sama dan urutan identik; pemeriksaan SHA-256 akan menolak set berbeda.
- Private Gallery berada di IndexedDB per browser/perangkat; tidak disinkronkan.
- Shared Editor saat ini mengatur posisi/ukuran elemen dengan kontrol arah dan tombol ukuran, bukan drag gesture bebas.
- Couple memiliki mutual full retake. Retake satu baris/pasangan foto secara individual belum diimplementasikan dalam review build ini.
- Filter dan ukuran hasil dibatasi kemampuan memori perangkat/browser.

## Game

- Validasi jawaban rahasia dan beberapa resolusi game dilakukan oleh client yang memegang peran terkait. Ini tidak setara dengan server authoritative.
- Custom Library disimpan secara lokal per browser. Untuk berbagi ke room, setiap pemain harus memilih/share konten saat setup; backup koleksi dilakukan dengan Export/Import JSON.
- Custom photo deck Memory Card memerlukan file sama, hash sama, dan urutan sama pada kedua perangkat. Gambar tidak disinkronkan otomatis dari server.
- Isi preset bank di dalam source build merupakan set awal untuk pengujian; jumlah/variasi konten bisa diperluas setelah gameplay diuji.
- Pengujian dua pemain secara simultan, koneksi lambat, refresh saat setiap fase game, dan berbagai ukuran HP tetap harus dilakukan di perangkat nyata.

## Test status

- Unit tests Node.js: hasil terakhir 12/12 lulus.
- JavaScript syntax check: jalankan ulang sebelum upload.
- JSON parse untuk Firebase Rules: jalankan ulang sebelum upload.
- Live Firebase Rules/Emulator tests: belum diverifikasi dalam container.
- End-to-end laptop + HP: belum diverifikasi.
- WebRTC P2P dan kamera perangkat nyata: belum diverifikasi.
- Photobooth Solo saat ini menyediakan retake seluruh strip; alur retake satu slot foto belum dipisahkan menjadi kontrol khusus.
- Photobooth belum menyediakan crop/zoom manual per foto. Foto di-fit ke layout export.
- Retensi file sementara IndexedDB bersifat best-effort dan pembersihan dilakukan ketika Photobooth dibuka kembali; TTL dihitung dari waktu lokal terakhir file disimpan/diperbarui, bukan jaminan penghapusan tepat 24 jam setelah sesi berakhir pada perangkat yang offline.
- Undo pada Shared Editor saat ini menghapus elemen terakhir yang dibuat oleh pemain tersebut; belum ada riwayat undo untuk setiap langkah transformasi.
- Draw & Guess mengirim stroke setelah pointer-up (per stroke), bukan mengalirkan setiap gerakan pointer secara kontinu. Respons real-time perlu dinilai saat uji jaringan.
