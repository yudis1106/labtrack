# LabTrack Web App
# Backend Python menggunakan Flask.
# Jalankan dari folder proyek dengan: python python/labtrack.py

from datetime import date
import json
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = Path(__file__).resolve().parent / "data.json"

app = Flask(__name__)

DEFAULT_ALAT = [
    {"id": 1, "nama": "Multimeter Digital", "kategori": "Alat Ukur", "total": 10, "tersedia": 10, "kondisi": "Baik", "deskripsi": "Untuk mengukur tegangan, arus, dan hambatan listrik.", "lokasi": "Rak A1"},
    {"id": 2, "nama": "Osiloskop", "kategori": "Alat Ukur", "total": 4, "tersedia": 4, "kondisi": "Baik", "deskripsi": "Untuk melihat bentuk gelombang sinyal listrik.", "lokasi": "Meja Instrumen 1"},
    {"id": 3, "nama": "Power Supply", "kategori": "Peralatan", "total": 6, "tersedia": 6, "kondisi": "Perlu Diperiksa", "deskripsi": "Sumber tegangan DC yang bisa diatur untuk rangkaian praktikum.", "lokasi": "Rak B2"},
    {"id": 4, "nama": "Solder", "kategori": "Peralatan", "total": 8, "tersedia": 8, "kondisi": "Baik", "deskripsi": "Untuk menyambung komponen ke papan rangkaian (PCB).", "lokasi": "Rak B1"},
    {"id": 5, "nama": "Arduino Uno", "kategori": "Mikrokontroler", "total": 12, "tersedia": 12, "kondisi": "Baik", "deskripsi": "Papan mikrokontroler untuk belajar pemrograman dan elektronika.", "lokasi": "Lemari C1"},
    {"id": 6, "nama": "Sensor Ultrasonik", "kategori": "Sensor", "total": 15, "tersedia": 15, "kondisi": "Baik", "deskripsi": "Sensor jarak berbasis gelombang suara (tipe HC-SR04).", "lokasi": "Lemari C2"},
    {"id": 7, "nama": "Sensor Suhu DHT11", "kategori": "Sensor", "total": 10, "tersedia": 10, "kondisi": "Perlu Diperiksa", "deskripsi": "Sensor suhu dan kelembapan udara.", "lokasi": "Lemari C2"},
    {"id": 8, "nama": "Breadboard", "kategori": "Komponen Elektronika", "total": 20, "tersedia": 20, "kondisi": "Baik", "deskripsi": "Papan untuk merangkai rangkaian tanpa solder.", "lokasi": "Laci D1"},
    {"id": 9, "nama": "Resistor", "kategori": "Komponen Elektronika", "total": 100, "tersedia": 100, "kondisi": "Baik", "deskripsi": "Penghambat arus listrik, berbagai nilai hambatan (1/4 W).", "lokasi": "Laci D2"},
    {"id": 10, "nama": "Kapasitor", "kategori": "Komponen Elektronika", "total": 60, "tersedia": 60, "kondisi": "Baik", "deskripsi": "Penyimpan muatan listrik, berbagai nilai kapasitansi.", "lokasi": "Laci D3"},
]


def simpan_data(data):
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def muat_data():
    if not DATA_FILE.exists():
        data = {"alat": DEFAULT_ALAT, "peminjaman": []}
        simpan_data(data)
        return data
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        data = {"alat": DEFAULT_ALAT, "peminjaman": []}
        simpan_data(data)
        return data


data = muat_data()


def cari_alat(id_alat):
    for alat in data["alat"]:
        if alat["id"] == id_alat:
            return alat
    return None


def response_error(pesan, status=400):
    return jsonify({"berhasil": False, "pesan": pesan}), status


@app.get("/")
def halaman_utama():
    return send_from_directory(ROOT, "index.html")


@app.get("/<path:nama_file>")
def file_website(nama_file):
    return send_from_directory(ROOT, nama_file)


@app.get("/api/data")
def ambil_data():
    return jsonify(data)


@app.post("/api/peminjaman")
def pinjam_alat():
    isi = request.get_json(silent=True) or {}

    nama = str(isi.get("namaPeminjam", "")).strip()
    nim = str(isi.get("nim", "")).strip()
    keperluan = str(isi.get("keperluan", "")).strip()
    tanggal = str(isi.get("tanggalPinjam", "")).strip()

    try:
        alat_id = int(isi.get("alatId"))
        jumlah = int(isi.get("jumlah"))
    except (TypeError, ValueError):
        return response_error("ID alat dan jumlah harus berupa angka.")

    if not nama or not nim or not keperluan or not tanggal:
        return response_error("Semua kolom wajib diisi.")
    if not nim.isdigit():
        return response_error("NIM hanya boleh berisi angka.")
    if jumlah < 1:
        return response_error("Jumlah harus minimal 1.")

    alat = cari_alat(alat_id)
    if alat is None:
        return response_error("Alat tidak ditemukan.")
    if jumlah > alat["tersedia"]:
        return response_error(f"Stok {alat['nama']} hanya tersisa {alat['tersedia']}.")

    id_baru = max([p["id"] for p in data["peminjaman"]], default=0) + 1
    peminjaman = {
        "id": id_baru,
        "namaPeminjam": nama,
        "nim": nim,
        "alatId": alat_id,
        "jumlah": jumlah,
        "tanggalPinjam": tanggal,
        "tanggalKembali": "",
        "keperluan": keperluan,
        "status": "Dipinjam",
    }

    data["peminjaman"].append(peminjaman)
    alat["tersedia"] -= jumlah
    simpan_data(data)

    return jsonify({"berhasil": True, "pesan": "Peminjaman berhasil dicatat.", "data": data})


@app.post("/api/peminjaman/<int:id_peminjaman>/kembali")
def kembalikan_alat(id_peminjaman):
    peminjaman = next((p for p in data["peminjaman"] if p["id"] == id_peminjaman), None)

    if peminjaman is None:
        return response_error("Data peminjaman tidak ditemukan.", 404)
    if peminjaman["status"] != "Dipinjam":
        return response_error("Alat ini sudah dikembalikan.")

    alat = cari_alat(peminjaman["alatId"])
    if alat is None:
        return response_error("Alat tidak ditemukan.", 404)

    peminjaman["status"] = "Dikembalikan"
    peminjaman["tanggalKembali"] = date.today().isoformat()
    alat["tersedia"] += peminjaman["jumlah"]
    simpan_data(data)

    return jsonify({"berhasil": True, "pesan": "Pengembalian dicatat.", "data": data})


if __name__ == "__main__":
    print("LabTrack berjalan di http://127.0.0.1:5000")
    print("Tekan Ctrl+C untuk menghentikan server.")
    app.run(debug=True)
