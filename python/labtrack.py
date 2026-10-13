# LabTrack Web App
# Backend Python menggunakan Flask + Supabase.

import base64
from datetime import date, datetime
from functools import wraps
from io import BytesIO
import os
from pathlib import Path
import re
import secrets
from uuid import uuid4
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request, send_from_directory, session
import qrcode
from supabase import create_client
from werkzeug.security import check_password_hash

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
app = Flask(__name__)

app.config["MAX_CONTENT_LENGTH"] = 6 * 1024 * 1024
app.secret_key = os.getenv("FLASK_SECRET_KEY") or "labtrack-preview-only-change-before-production"
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=bool(os.getenv("VERCEL")),
)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")

BUCKET_KTM = "ktm"
MAKS_FOTO_KTM = 5 * 1024 * 1024
TIPE_FOTO_KTM = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}
KONDISI_ALAT = {"Baik", "Rusak Ringan", "Rusak", "Perlu Diperiksa"}
LOGO_SVG_PATH = ROOT / "assets" / "labtrack-logo-exact.svg"


def hari_ini_wib():
    return datetime.now(ZoneInfo("Asia/Jakarta")).date()


def pastikan_database():
    if supabase is None:
        raise RuntimeError("SUPABASE_URL atau SUPABASE_KEY belum diatur.")


def response_error(pesan, status=400):
    return jsonify({"berhasil": False, "pesan": pesan}), status


def admin_terkonfigurasi():
    return bool(ADMIN_USERNAME and ADMIN_PASSWORD_HASH and os.getenv("FLASK_SECRET_KEY"))


def admin_login():
    return bool(session.get("labtrack_admin"))


def wajib_admin(fungsi):
    @wraps(fungsi)
    def pembungkus(*args, **kwargs):
        if not admin_login():
            return response_error("Akses admin diperlukan.", 401)
        return fungsi(*args, **kwargs)
    return pembungkus


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
        "aktif": row.get("aktif") is not False,
    }


def ubah_pinjaman(row):
    return {
        "id": row["id"],
        "kodeTransaksi": row.get("kode_transaksi") or f"LT-{row['id']}",
        "namaPeminjam": row.get("nama_peminjam") or "",
        "nim": row.get("nim") or "",
        "alatId": row.get("alat_id"),
        "jumlah": row.get("jumlah") or 0,
        "tanggalPinjam": str(row.get("tanggal_pinjam") or ""),
        "deadlinePengembalian": str(row.get("deadline_pengembalian") or ""),
        "tanggalKembali": str(row.get("tanggal_kembali") or ""),
        "keperluan": row.get("keperluan") or "",
        "status": row.get("status") or "",
        "kondisiPengembalian": row.get("kondisi_pengembalian") or "",
        "catatanPengembalian": row.get("catatan_pengembalian") or "",
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


def validasi_data_alat(isi, alat_lama=None):
    nama = str(isi.get("nama", alat_lama.get("nama") if alat_lama else "")).strip()
    kategori = str(isi.get("kategori", alat_lama.get("kategori") if alat_lama else "")).strip()
    lokasi = str(isi.get("lokasi", alat_lama.get("lokasi") if alat_lama else "")).strip()
    deskripsi = str(isi.get("deskripsi", alat_lama.get("deskripsi") if alat_lama else "")).strip()
    kondisi = str(isi.get("kondisi", alat_lama.get("kondisi") if alat_lama else "Baik")).strip()
    try:
        total = int(isi.get("total", alat_lama.get("total") if alat_lama else 0))
    except (TypeError, ValueError):
        return None, "Total alat harus berupa angka bulat."
    if not nama or not kategori or not lokasi:
        return None, "Nama, kategori, dan lokasi alat wajib diisi."
    if total < 0:
        return None, "Total alat tidak boleh negatif."
    if kondisi not in KONDISI_ALAT:
        return None, "Kondisi alat tidak valid."
    return {"nama": nama, "kategori": kategori, "lokasi": lokasi, "deskripsi": deskripsi, "kondisi": kondisi, "total": total}, None


@app.errorhandler(413)
def file_terlalu_besar(_error):
    return response_error("Ukuran upload terlalu besar. Foto KTM maksimal 5 MB.", 413)


@app.get("/")
def halaman_utama():
    return send_from_directory(ROOT, "index.html")


@app.get("/assets/labtrack-logo-image")
def logo_labtrack_image():
    try:
        isi_svg = LOGO_SVG_PATH.read_text(encoding="utf-8")
        cocok = re.search(r'href="data:(image/[^;]+);base64,([^\"]+)"', isi_svg)
        if not cocok:
            return Response("Logo tidak ditemukan.", status=404, mimetype="text/plain")
        tipe_gambar = cocok.group(1)
        data_gambar = base64.b64decode(cocok.group(2))
        return Response(data_gambar, mimetype=tipe_gambar, headers={"Cache-Control": "public, max-age=86400"})
    except Exception as error:
        print("Gagal memuat logo LabTrack:", error)
        return Response("Gagal memuat logo.", status=500, mimetype="text/plain")


@app.get("/api/alat/<int:id_alat>/qr")
def qr_alat(id_alat):
    try:
        alat = cari_alat(id_alat)
        if alat is None:
            return Response("Alat tidak ditemukan.", status=404, mimetype="text/plain")
        tujuan = request.url_root.rstrip("/") + "/?alat=" + str(id_alat)
        qr = qrcode.QRCode(version=None, box_size=8, border=2)
        qr.add_data(tujuan)
        qr.make(fit=True)
        gambar = qr.make_image(fill_color="black", back_color="white")
        keluaran = BytesIO()
        gambar.save(keluaran, format="PNG")
        return Response(keluaran.getvalue(), mimetype="image/png", headers={"Cache-Control": "public, max-age=3600"})
    except Exception as error:
        print("Gagal membuat QR alat:", error)
        return Response("Gagal membuat QR.", status=500, mimetype="text/plain")


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


@app.get("/api/admin/status")
def status_admin():
    return jsonify({"berhasil": True, "configured": admin_terkonfigurasi(), "loggedIn": admin_login()})


@app.post("/api/admin/login")
def login_admin():
    if not admin_terkonfigurasi():
        return response_error("Login admin belum dikonfigurasi. Atur FLASK_SECRET_KEY, ADMIN_USERNAME, dan ADMIN_PASSWORD_HASH terlebih dahulu.", 503)
    isi = request.get_json(silent=True) or {}
    username = str(isi.get("username", ""))
    password = str(isi.get("password", ""))
    username_benar = secrets.compare_digest(username, ADMIN_USERNAME)
    password_benar = False
    try:
        password_benar = check_password_hash(ADMIN_PASSWORD_HASH, password)
    except (ValueError, TypeError):
        pass
    if not (username_benar and password_benar):
        return response_error("Username atau password admin salah.", 401)
    session.clear()
    session["labtrack_admin"] = True
    return jsonify({"berhasil": True, "pesan": "Login admin berhasil."})


@app.post("/api/admin/logout")
def logout_admin():
    session.clear()
    return jsonify({"berhasil": True, "pesan": "Logout berhasil."})


@app.post("/api/admin/alat")
@wajib_admin
def tambah_alat():
    try:
        pastikan_database()
        isi = request.get_json(silent=True) or {}
        data, error = validasi_data_alat(isi)
        if error:
            return response_error(error)
        data["tersedia"] = data["total"]
        data["aktif"] = True
        supabase.table("alat").insert(data).execute()
        return jsonify({"berhasil": True, "pesan": "Alat berhasil ditambahkan.", "data": ambil_semua_data()})
    except Exception as error:
        print("Gagal menambah alat:", error)
        return response_error("Gagal menambahkan alat.", 500)


@app.patch("/api/admin/alat/<int:id_alat>")
@wajib_admin
def edit_alat(id_alat):
    try:
        alat = cari_alat(id_alat)
        if alat is None:
            return response_error("Alat tidak ditemukan.", 404)
        isi = request.get_json(silent=True) or {}
        data, error = validasi_data_alat(isi, alat)
        if error:
            return response_error(error)
        total_lama = int(alat.get("total") or 0)
        tersedia_lama = int(alat.get("tersedia") or 0)
        sedang_dipinjam = max(0, total_lama - tersedia_lama)
        if data["total"] < sedang_dipinjam:
            return response_error(f"Total minimal {sedang_dipinjam} karena ada alat yang masih dipinjam.")
        data["tersedia"] = data["total"] - sedang_dipinjam
        supabase.table("alat").update(data).eq("id", id_alat).execute()
        return jsonify({"berhasil": True, "pesan": "Data alat berhasil diperbarui.", "data": ambil_semua_data()})
    except Exception as error:
        print("Gagal mengedit alat:", error)
        return response_error("Gagal memperbarui alat.", 500)


@app.delete("/api/admin/alat/<int:id_alat>")
@wajib_admin
def hapus_alat(id_alat):
    try:
        alat = cari_alat(id_alat)
        if alat is None:
            return response_error("Alat tidak ditemukan.", 404)
        aktif = supabase.table("pinjaman").select("id").eq("alat_id", id_alat).eq("status", "Dipinjam").limit(1).execute()
        if aktif.data:
            return response_error("Alat tidak dapat dihapus karena masih sedang dipinjam.")
        supabase.table("alat").update({"aktif": False}).eq("id", id_alat).execute()
        return jsonify({"berhasil": True, "pesan": "Alat dinonaktifkan dari inventaris tanpa menghapus riwayat.", "data": ambil_semua_data()})
    except Exception as error:
        print("Gagal menghapus alat:", error)
        return response_error("Gagal menonaktifkan alat.", 500)


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
        if alat is None or alat.get("aktif") is False:
            return response_error("Alat tidak ditemukan atau sudah dinonaktifkan.", 404)
        tersedia = int(alat.get("tersedia") or 0)
        if jumlah > tersedia:
            return response_error(f"Stok {alat.get('nama', 'alat')} hanya tersisa {tersedia}.")
        path_foto = f"aktif/{uuid4().hex}{ekstensi}"
        isi_foto = foto_ktm.read()
        supabase.storage.from_(BUCKET_KTM).upload(path=path_foto, file=isi_foto, file_options={"content-type": tipe_file, "cache-control": "0", "upsert": "false"})
        foto_sudah_diunggah = True
        hasil_insert = supabase.table("pinjaman").insert({"nama_peminjam": nama, "nim": nim, "alat_id": alat_id, "jumlah": jumlah, "tanggal_pinjam": tanggal, "deadline_pengembalian": deadline, "tanggal_kembali": None, "keperluan": keperluan, "foto_ktm": path_foto, "status": "Dipinjam"}).execute()
        pinjaman_sudah_disimpan = True
        if hasil_insert.data:
            row = hasil_insert.data[0]
            if not row.get("kode_transaksi"):
                kode = f"LT-{tanggal_pinjam.year}-{int(row['id']):05d}"
                supabase.table("pinjaman").update({"kode_transaksi": kode}).eq("id", row["id"]).execute()
        supabase.table("alat").update({"tersedia": tersedia - jumlah}).eq("id", alat_id).execute()
        return jsonify({"berhasil": True, "pesan": "Peminjaman berhasil dicatat dan foto KTM tersimpan secara privat.", "data": ambil_semua_data()})
    except Exception as error:
        print("Gagal mencatat peminjaman:", error)
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
        isi = request.get_json(silent=True) or {}
        kondisi_pengembalian = str(isi.get("kondisiPengembalian", "Baik")).strip()
        catatan = str(isi.get("catatanPengembalian", "")).strip()
        if kondisi_pengembalian not in KONDISI_ALAT:
            return response_error("Kondisi pengembalian tidak valid.")
        if len(catatan) > 500:
            return response_error("Catatan pengembalian maksimal 500 karakter.")
        alat_id = pinjaman.get("alat_id")
        alat = cari_alat(alat_id)
        if alat is None:
            return response_error("Alat tidak ditemukan.", 404)
        jumlah = int(pinjaman.get("jumlah") or 0)
        tersedia = int(alat.get("tersedia") or 0)
        total = int(alat.get("total") or 0)
        stok_baru = min(total, tersedia + jumlah)
        path_foto = pinjaman.get("foto_ktm")
        if path_foto:
            supabase.storage.from_(BUCKET_KTM).remove([path_foto])
        supabase.table("pinjaman").update({"status": "Dikembalikan", "tanggal_kembali": hari_ini_wib().isoformat(), "foto_ktm": None, "kondisi_pengembalian": kondisi_pengembalian, "catatan_pengembalian": catatan or None}).eq("id", id_peminjaman).execute()
        supabase.table("alat").update({"tersedia": stok_baru, "kondisi": kondisi_pengembalian}).eq("id", alat_id).execute()
        return jsonify({"berhasil": True, "pesan": "Pengembalian dicatat, kondisi alat diperbarui, dan foto KTM telah dihapus.", "data": ambil_semua_data()})
    except Exception as error:
        print("Gagal mencatat pengembalian:", error)
        return response_error("Gagal mencatat pengembalian. Foto KTM tidak akan dianggap terhapus sampai proses berhasil.", 500)


if __name__ == "__main__":
    print("LabTrack berjalan di http://127.0.0.1:5000")
    print("Tekan Ctrl+C untuk menghentikan server.")
    app.run(debug=True)
