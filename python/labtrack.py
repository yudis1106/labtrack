# LabTrack Web App
# Backend Python menggunakan Flask + Supabase.

from datetime import date, datetime
import os
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
app = Flask(__name__)

# Form berisi foto KTM. Batas request dibuat sedikit di atas batas file 5 MB
# agar masih ada ruang untuk data form lainnya.
app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

BUCKET_KTM = "ktm"
MAKS_FOTO_KTM = 5 * 1024 * 1024
TIPE_FOTO_KTM = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}


def hari_ini_wib():
    return datetime.now(ZoneInfo("Asia/Jakarta")).date()


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
    # Path asli foto KTM tidak dikirim ke browser. Browser hanya diberi tahu
    # apakah foto masih tersimpan atau sudah dihapus.
    return {
        "id": row["id"],
        "namaPeminjam": row.get("nama_peminjam") or "",
        "nim": row.get("nim") or "",
        "alatId": row.get("alat_id"),
        "jumlah": row.get("jumlah") or 0,
        "tanggalPinjam": str(row.get("tanggal_pinjam") or ""),
        "deadlinePengembalian": str(row.get("deadline_pengembalian") or ""),
        "tanggalKembali": str(row.get("tanggal_kembali") or ""),
        "keperluan": row.get("keperluan") or "",
        "status": row.get("status") or "",
        "ktmTersimpan": bool(row.get("foto_ktm")),
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


def validasi_foto_ktm(foto):
    if foto is None or not foto.filename:
        return None, None, "Foto KTM wajib diunggah."

    ekstensi = Path(foto.filename).suffix.lower()
    tipe_yang_diharapkan = TIPE_FOTO_KTM.get(ekstensi)
    tipe_file = (foto.mimetype or "").lower()

    if not tipe_yang_diharapkan or tipe_file != tipe_yang_diharapkan:
        return None, None, "Foto KTM harus berformat JPG, JPEG, atau PNG."

    foto.stream.seek(0, os.SEEK_END)
    ukuran = foto.stream.tell()
    foto.stream.seek(0)

    if ukuran <= 0:
        return None, None, "File foto KTM kosong."
    if ukuran > MAKS_FOTO_KTM:
        return None, None, "Ukuran foto KTM maksimal 5 MB."

    return ekstensi, tipe_file, None


@app.errorhandler(413)
def file_terlalu_besar(_error):
    return response_error("Ukuran upload terlalu besar. Foto KTM maksimal 5 MB.", 413)


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
    path_foto = None
    foto_sudah_diunggah = False
    pinjaman_sudah_disimpan = False

    try:
        pastikan_database()

        nama = str(request.form.get("namaPeminjam", "")).strip()
        nim = str(request.form.get("nim", "")).strip()
        keperluan = str(request.form.get("keperluan", "")).strip()
        tanggal = str(request.form.get("tanggalPinjam", "")).strip()
        deadline = str(request.form.get("deadlinePengembalian", "")).strip()
        foto_ktm = request.files.get("fotoKtm")

        try:
            alat_id = int(request.form.get("alatId"))
            jumlah = int(request.form.get("jumlah"))
        except (TypeError, ValueError):
            return response_error("ID alat dan jumlah harus berupa angka.")

        if not nama or not nim or not keperluan or not tanggal or not deadline:
            return response_error("Semua kolom wajib diisi.")
        if not nim.isdigit():
            return response_error("NIM hanya boleh berisi angka.")
        if jumlah < 1:
            return response_error("Jumlah harus minimal 1.")

        try:
            tanggal_pinjam = date.fromisoformat(tanggal)
            tanggal_deadline = date.fromisoformat(deadline)
        except ValueError:
            return response_error("Format tanggal tidak valid.")

        if tanggal_deadline < tanggal_pinjam:
            return response_error("Deadline pengembalian tidak boleh sebelum tanggal peminjaman.")

        ekstensi, tipe_file, error_foto = validasi_foto_ktm(foto_ktm)
        if error_foto:
            return response_error(error_foto)

        alat = cari_alat(alat_id)
        if alat is None:
            return response_error("Alat tidak ditemukan.", 404)

        tersedia = int(alat.get("tersedia") or 0)
        if jumlah > tersedia:
            return response_error(f"Stok {alat.get('nama', 'alat')} hanya tersisa {tersedia}.")

        # Nama file acak agar NIM/nama mahasiswa tidak muncul pada path Storage.
        path_foto = f"aktif/{uuid4().hex}{ekstensi}"
        supabase.storage.from_(BUCKET_KTM).upload(
            path=path_foto,
            file=foto_ktm.stream,
            file_options={
                "content-type": tipe_file,
                "cache-control": "0",
                "upsert": "false",
            },
        )
        foto_sudah_diunggah = True

        supabase.table("pinjaman").insert({
            "nama_peminjam": nama,
            "nim": nim,
            "alat_id": alat_id,
            "jumlah": jumlah,
            "tanggal_pinjam": tanggal,
            "deadline_pengembalian": deadline,
            "tanggal_kembali": None,
            "keperluan": keperluan,
            "foto_ktm": path_foto,
            "status": "Dipinjam",
        }).execute()
        pinjaman_sudah_disimpan = True

        supabase.table("alat").update(
            {"tersedia": tersedia - jumlah}
        ).eq("id", alat_id).execute()

        return jsonify({
            "berhasil": True,
            "pesan": "Peminjaman berhasil dicatat dan foto KTM tersimpan secara privat.",
            "data": ambil_semua_data(),
        })

    except Exception as error:
        print("Gagal mencatat peminjaman:", error)

        # Jika upload berhasil tetapi penyimpanan data gagal sebelum selesai,
        # coba hapus foto agar tidak menjadi file yatim di Storage.
        if foto_sudah_diunggah and path_foto and not pinjaman_sudah_disimpan:
            try:
                supabase.storage.from_(BUCKET_KTM).remove([path_foto])
            except Exception as error_hapus:
                print("Gagal membersihkan foto KTM setelah error:", error_hapus)

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

        # Foto KTM dihapus lebih dulu. Jika penghapusan gagal, proses
        # pengembalian dihentikan agar foto pribadi tidak tertinggal diam-diam.
        path_foto = pinjaman.get("foto_ktm")
        if path_foto:
            supabase.storage.from_(BUCKET_KTM).remove([path_foto])

        supabase.table("pinjaman").update({
            "status": "Dikembalikan",
            "tanggal_kembali": hari_ini_wib().isoformat(),
            "foto_ktm": None,
        }).eq("id", id_peminjaman).execute()

        supabase.table("alat").update(
            {"tersedia": stok_baru}
        ).eq("id", alat_id).execute()

        return jsonify({
            "berhasil": True,
            "pesan": "Pengembalian dicatat dan foto KTM telah dihapus.",
            "data": ambil_semua_data(),
        })

    except Exception as error:
        print("Gagal mencatat pengembalian:", error)
        return response_error(
            "Gagal mencatat pengembalian. Foto KTM tidak akan dianggap terhapus sampai proses berhasil.",
            500,
        )


if __name__ == "__main__":
    print("LabTrack berjalan di http://127.0.0.1:5000")
    print("Tekan Ctrl+C untuk menghentikan server.")
    app.run(debug=True)
