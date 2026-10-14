# LabTrack

LabTrack adalah website inventaris dan peminjaman alat laboratorium dengan alur persetujuan admin.

## Fitur utama

- Dashboard ringkasan inventaris dan peminjaman
- Inventaris alat, stok, kondisi, lokasi, detail, dan QR Code
- Pengajuan peminjaman dengan foto KTM
- Alur status `Diajukan -> Disetujui -> Dipinjam -> Dikembalikan`
- Penolakan atau pembatalan pengajuan
- Monitoring deadline dan keterlambatan
- Riwayat pengembalian dan kondisi alat
- Login admin untuk tindakan sensitif

## Teknologi

### Frontend

- HTML untuk struktur halaman
- CSS untuk tampilan dan responsivitas
- JavaScript untuk interaksi, validasi, dan komunikasi dengan backend

### Backend

- Python
- Flask
- Supabase Python client
- `qrcode` untuk QR Code alat

### Data

- Supabase PostgreSQL untuk data alat dan peminjaman
- Supabase Storage untuk foto KTM private

### Deployment

- GitHub untuk source code dan version control
- Vercel untuk deployment aplikasi

## Struktur project

```text
labtrack/
├── app.py                 # Entry point production dan workflow approval
├── index.html             # Struktur utama website
├── requirements.txt       # Dependency Python
├── .env.example           # Contoh environment variable
├── assets/                # Logo dan asset gambar
├── css/                   # Styling website
│   ├── style.css
│   ├── home.css
│   ├── sidebar.css
│   ├── mobile.css
│   └── advanced.css
├── js/                    # Logika frontend
│   ├── app.js
│   ├── approval.js
│   ├── home.js
│   └── sidebar.js
├── python/
│   └── labtrack.py        # Backend core Flask
└── supabase/
    └── migrations/        # Migration struktur database
```

## Menjalankan secara lokal

1. Install dependency:

```bash
pip install -r requirements.txt
```

2. Buat file `.env` berdasarkan `.env.example` dan isi environment variable yang diperlukan.

3. Jalankan aplikasi:

```bash
python app.py
```

4. Buka browser:

```text
http://127.0.0.1:5000
```

Gunakan `python app.py` agar fitur approval yang sama dengan production ikut aktif.

## Environment variable

LabTrack menggunakan environment variable berikut:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `FLASK_SECRET_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`

Jangan menyimpan nilai secret asli di source code atau GitHub.

## Cara kerja singkat

Frontend meminta data melalui API Flask. Flask mengambil atau mengubah data di Supabase PostgreSQL lalu mengirim hasil ke frontend dalam format JSON.

Saat mahasiswa mengajukan peminjaman, foto KTM diupload ke Supabase Storage dan transaksi dibuat dengan status `Diajukan`. Admin dapat menyetujui pengajuan sehingga stok direservasi, lalu mengubah status menjadi `Dipinjam` saat alat diserahkan. Saat pengembalian diproses, stok dikembalikan, kondisi alat dicatat, dan foto KTM dihapus dari Storage.
