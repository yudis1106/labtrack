# LabTrack Web App
# Backend Python menggunakan Flask + Supabase.

from datetime import date
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
app = Flask(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None


def pastikan_database():
    if supabase is None:
        raise RuntimeError("SUPABASE_URL atau SUPABASE_KEY belum diatur.")


def response_error(pesan, status=400):
    return jsonify({"berhasil": False, "pesan": pesan}), status


def ubah_alat(row):
    return {
        "id": row["id"],
        "nama": row.get("nama") or "",
        "kategori": row.get("kategori") or "",
        "total": row.get("total") or 0,
        "tersedia": row.get("tersedia") or 0,
        "kondisi": row.get("kondisi") or "",
        "deskripsi": row.get("deskripsi") or "",
        "lokasi": row.get("lokasi") or "",
    }


def ubah_pinjaman(row):
    return {
        "id": row["id"],
        "namaPeminjam": row.get("nama_peminjam") or "",
        "nim": row.get("nim") or "",
        "alatId": row.get("alat_id"),
        "jumlah": row.get("jumlah") or 0,
        "tanggalPinjam": str(row.get("tanggal_pinjam") or ""),
        "tanggalKembali": str(row.get("tanggal_kembali") or ""),
        "keperluan": row.get("keperluan") or "",
        "status": row.get("status") or "",
    }


def ambil_semua_data():
    pastikan_database()
    hasil_alat = supabase.table("alat").select("*").order("id").execute()
    hasil_pinjaman = supabase.table("pinjaman").select("*").order("id").execute()
    return {
        "alat": [ubah_alat(row) for row in (hasil_alat.data or [])],
        "peminjaman": [ubah_pinjaman(row) for row in (hasil_pinjaman.data or [])],
    }


def cari_alat(id_alat):
    pastikan_database()
    hasil = supabase.table("alat").select("*").eq("id", id_alat).limit(1).execute()
    return hasil.data[0] if hasil.data else None


def cari_pinjaman(id_pinjaman):
    pastikan_database()
    hasil = supabase.table("pinjaman").select("*").eq("id", id_pinjaman).limit(1).execute()
    return hasil.data[0] if hasil.data else None


@app.get("/")
def halaman_utama():
    return send_from_directory(ROOT, "index.html")


@app.get("/<path:nama_file>")
def file_website(nama_file):
    return send_from_directory(ROOT, nama_file)


@app.get("/api/data")
def ambil_data():
    try:
        return jsonify(ambil_semua_data())
    except Exception as error:
        print("Gagal mengambil data:", error)
        return response_error("Gagal mengambil data dari Supabase.", 500)


@app.post("/api/peminjaman")
def pinjam_alat():
    try:
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
            return response_error("Alat tidak ditemukan.", 404)

        tersedia = int(alat.get("tersedia") or 0)
        if jumlah > tersedia:
            return response_error(f"Stok {alat.get('nama', 'alat')} hanya tersisa {tersedia}.")

        supabase.table("pinjaman").insert({
            "nama_peminjam": nama,
            "nim": nim,
            "alat_id": alat_id,
            "jumlah": jumlah,
            "tanggal_pinjam": tanggal,
            "tanggal_kembali": None,
            "keperluan": keperluan,
            "status": "Dipinjam",
        }).execute()

        supabase.table("alat").update({"tersedia": tersedia - jumlah}).eq("id", alat_id).execute()

        return jsonify({
            "berhasil": True,
            "pesan": "Peminjaman berhasil dicatat.",
            "data": ambil_semua_data(),
        })

    except Exception as error:
        print("Gagal mencatat peminjaman:", error)
        return response_error("Gagal mencatat peminjaman ke Supabase.", 500)


@app.post("/api/peminjaman/<int:id_peminjaman>/kembali")
def kembalikan_alat(id_peminjaman):
    try:
        pinjaman = cari_pinjaman(id_peminjaman)

        if pinjaman is None:
            return response_error("Data peminjaman tidak ditemukan.", 404)
        if pinjaman.get("status") != "Dipinjam":
            return response_error("Alat ini sudah dikembalikan.")

        alat_id = pinjaman.get("alat_id")
        alat = cari_alat(alat_id)
        if alat is None:
            return response_error("Alat tidak ditemukan.", 404)

        jumlah = int(pinjaman.get("jumlah") or 0)
        tersedia = int(alat.get("tersedia") or 0)
        total = int(alat.get("total") or 0)
        stok_baru = min(total, tersedia + jumlah)

        supabase.table("pinjaman").update({
            "status": "Dikembalikan",
            "tanggal_kembali": date.today().isoformat(),
        }).eq("id", id_peminjaman).execute()

        supabase.table("alat").update({"tersedia": stok_baru}).eq("id", alat_id).execute()

        return jsonify({
            "berhasil": True,
            "pesan": "Pengembalian dicatat.",
            "data": ambil_semua_data(),
        })

    except Exception as error:
        print("Gagal mencatat pengembalian:", error)
        return response_error("Gagal mencatat pengembalian ke Supabase.", 500)


if __name__ == "__main__":
    print("LabTrack berjalan di http://127.0.0.1:5000")
    print("Tekan Ctrl+C untuk menghentikan server.")
    app.run(debug=True)
