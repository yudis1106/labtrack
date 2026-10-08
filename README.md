# LabTrack

LabTrack adalah website inventaris dan peminjaman alat laboratorium.

## Teknologi

- HTML untuk struktur halaman
- CSS untuk tampilan
- JavaScript untuk interaksi halaman
- Python Flask sebagai backend
- JSON sebagai penyimpanan data sederhana

## Struktur utama

- `index.html` = halaman website
- `css/style.css` = tampilan website
- `js/app.js` = interaksi frontend dan komunikasi dengan Python
- `python/labtrack.py` = backend Python dan API
- `python/data.json` = data alat dan peminjaman yang dibuat otomatis
- `requirements.txt` = library Python yang dibutuhkan

## Cara menjalankan

1. Buka Terminal di folder `labtrack`.
2. Install Flask:

```bash
pip install -r requirements.txt
```

3. Jalankan server:

```bash
python python/labtrack.py
```

4. Buka browser dan masuk ke:

```text
http://127.0.0.1:5000
```

Jangan membuka `index.html` dengan double click. Website harus dibuka melalui server Python supaya JavaScript bisa berkomunikasi dengan Flask.

## Cara kerja

Browser meminta data ke `/api/data`.

Saat pengguna meminjam alat, JavaScript mengirim data ke `/api/peminjaman`.

Python memvalidasi data, mengurangi stok, mencatat peminjaman, lalu menyimpan perubahan ke `python/data.json`.

Saat alat dikembalikan, JavaScript mengirim permintaan ke `/api/peminjaman/<id>/kembali`.

Python mengubah status menjadi `Dikembalikan`, menambah stok, lalu menyimpan perubahan.
