# LabTrack Advanced Features Preview

Branch: `feature/labtrack-complete`

Branch ini disiapkan untuk mencoba fitur lanjutan tanpa mengubah website production di branch `main`.

## Fitur yang disiapkan

1. Notifikasi deadline dan kartu jumlah keterlambatan.
2. Kondisi alat saat pengembalian + catatan pengembalian.
3. QR Code per alat yang membuka detail alat.
4. Tambah, edit, dan nonaktifkan inventaris melalui website (admin only).
5. Dashboard lebih lengkap: tren 6 bulan dan alat paling sering dipinjam.
6. Pencarian riwayat berdasarkan nama, NIM, dan nomor transaksi.
7. Filter riwayat berdasarkan alat dan keterlambatan.
8. Detail alat dengan stok, kondisi, QR, dan riwayat peminjaman.
9. Nomor transaksi otomatis `LT-YYYY-xxxxx`.
10. Login admin dengan session Flask.

## Belum diterapkan ke production

- Migration database pada `supabase/migrations/20261013_labtrack_complete.sql` **belum dijalankan**.
- Environment variable admin **belum perlu ditambahkan** sebelum fitur disetujui.
- Branch ini **jangan di-merge ke `main`** sebelum pengujian selesai.

## Environment variable yang dibutuhkan saat nanti diterapkan

- `FLASK_SECRET_KEY` — string acak panjang untuk menandatangani session.
- `ADMIN_USERNAME` — username admin.
- `ADMIN_PASSWORD_HASH` — hash password Werkzeug, bukan password asli.

Contoh membuat hash secara lokal:

```bash
python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash(input('Password admin: ')))"
```

Jangan commit password atau secret ke GitHub.

## Urutan penerapan nanti

1. Review branch ini.
2. Jalankan migration Supabase.
3. Tambahkan environment variable admin di Vercel.
4. Test preview deployment.
5. Setelah disetujui, merge branch ke `main`.
