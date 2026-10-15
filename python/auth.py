# LabTrack - autentikasi Mahasiswa dan Admin.

import re
import secrets

from flask import request, session
from werkzeug.security import check_password_hash, generate_password_hash

from python import labtrack as core

app = core.app
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def cari_mahasiswa_nim(nim):
    core.pastikan_database()
    hasil = core.supabase.table("mahasiswa").select("*").eq("nim", nim).limit(1).execute()
    return hasil.data[0] if hasil.data else None


def cari_mahasiswa_id(id_mahasiswa):
    core.pastikan_database()
    hasil = core.supabase.table("mahasiswa").select("*").eq("id", id_mahasiswa).limit(1).execute()
    return hasil.data[0] if hasil.data else None


def data_mahasiswa_aman(row):
    return {
        "id": row["id"],
        "nama": row.get("nama") or "",
        "nim": row.get("nim") or "",
        "email": row.get("email") or "",
        "role": "mahasiswa",
    }


def mahasiswa_session():
    if session.get("labtrack_role") != "mahasiswa":
        return None
    id_mahasiswa = session.get("labtrack_mahasiswa_id")
    if not id_mahasiswa:
        return None
    try:
        mahasiswa = cari_mahasiswa_id(id_mahasiswa)
    except Exception:
        return None
    if mahasiswa is None or mahasiswa.get("aktif") is False:
        return None
    return mahasiswa


def autentikasi_status():
    if core.admin_login() or session.get("labtrack_role") == "admin":
        return {
            "authenticated": True,
            "role": "admin",
            "nama": "Admin",
            "nim": "",
            "email": "",
        }

    mahasiswa = mahasiswa_session()
    if mahasiswa:
        data = data_mahasiswa_aman(mahasiswa)
        data["authenticated"] = True
        return data

    return {
        "authenticated": False,
        "role": None,
        "nama": "",
        "nim": "",
        "email": "",
    }


@app.get("/api/auth/status")
def status_auth():
    return core.jsonify({"berhasil": True, **autentikasi_status()})


@app.get("/api/auth/data")
def data_berdasarkan_role():
    """Data aplikasi yang disesuaikan dengan akun aktif.

    Admin menerima seluruh data. Mahasiswa hanya menerima transaksi dengan NIM
    miliknya, sehingga dashboard dan riwayat pribadi tidak perlu mengambil data
    transaksi mahasiswa lain.
    """
    status = autentikasi_status()
    if not status.get("authenticated"):
        return core.response_error("Login diperlukan.", 401)

    try:
        data = core.ambil_semua_data()
        if status.get("role") == "mahasiswa":
            nim = str(status.get("nim") or "")
            data["peminjaman"] = [
                item for item in data.get("peminjaman", [])
                if str(item.get("nim") or "") == nim
            ]
        return core.jsonify({"berhasil": True, "role": status.get("role"), **data})
    except Exception as error:
        print("Gagal mengambil data sesuai role:", error)
        return core.response_error("Gagal mengambil data akun.", 500)


@app.patch("/api/auth/profile")
def ubah_profile_mahasiswa():
    mahasiswa = mahasiswa_session()
    if mahasiswa is None:
        return core.response_error("Login sebagai mahasiswa diperlukan.", 401)

    try:
        isi = request.get_json(silent=True) or {}
        nama = str(isi.get("nama", mahasiswa.get("nama") or "")).strip()
        email = str(isi.get("email", mahasiswa.get("email") or "")).strip().lower()
        password_lama = str(isi.get("passwordLama", ""))
        password_baru = str(isi.get("passwordBaru", ""))
        konfirmasi = str(isi.get("konfirmasiPassword", ""))

        if not nama:
            return core.response_error("Nama tidak boleh kosong.")
        if not EMAIL_RE.match(email):
            return core.response_error("Format email tidak valid.")

        email_ada = (
            core.supabase.table("mahasiswa")
            .select("id")
            .eq("email", email)
            .neq("id", mahasiswa["id"])
            .limit(1)
            .execute()
        )
        if email_ada.data:
            return core.response_error("Email sudah digunakan akun lain.", 409)

        perubahan = {"nama": nama, "email": email}

        if password_baru or password_lama or konfirmasi:
            if not password_lama:
                return core.response_error("Masukkan password lama untuk mengganti password.")
            if len(password_baru) < 6:
                return core.response_error("Password baru minimal 6 karakter.")
            if password_baru != konfirmasi:
                return core.response_error("Konfirmasi password baru tidak sama.")
            try:
                lama_benar = check_password_hash(mahasiswa.get("password_hash") or "", password_lama)
            except (ValueError, TypeError):
                lama_benar = False
            if not lama_benar:
                return core.response_error("Password lama salah.", 401)
            perubahan["password_hash"] = generate_password_hash(password_baru)

        hasil = (
            core.supabase.table("mahasiswa")
            .update(perubahan)
            .eq("id", mahasiswa["id"])
            .execute()
        )
        row = hasil.data[0] if hasil.data else cari_mahasiswa_id(mahasiswa["id"])
        return core.jsonify({
            "berhasil": True,
            "pesan": "Profil berhasil diperbarui.",
            "akun": data_mahasiswa_aman(row),
        })
    except Exception as error:
        print("Gagal memperbarui profil mahasiswa:", error)
        return core.response_error("Gagal memperbarui profil.", 500)


@app.post("/api/auth/register")
def daftar_mahasiswa():
    try:
        core.pastikan_database()
        isi = request.get_json(silent=True) or {}
        nama = str(isi.get("nama", "")).strip()
        nim = str(isi.get("nim", "")).strip()
        email = str(isi.get("email", "")).strip().lower()
        password = str(isi.get("password", ""))
        konfirmasi = str(isi.get("konfirmasiPassword", ""))

        if not nama or not nim or not email or not password or not konfirmasi:
            return core.response_error("Semua data pendaftaran wajib diisi.")
        if not nim.isdigit():
            return core.response_error("NIM hanya boleh berisi angka.")
        if not EMAIL_RE.match(email):
            return core.response_error("Format email tidak valid.")
        if len(password) < 6:
            return core.response_error("Password minimal 6 karakter.")
        if password != konfirmasi:
            return core.response_error("Konfirmasi password tidak sama.")

        nim_ada = core.supabase.table("mahasiswa").select("id").eq("nim", nim).limit(1).execute()
        if nim_ada.data:
            return core.response_error("NIM sudah terdaftar.", 409)

        email_ada = core.supabase.table("mahasiswa").select("id").eq("email", email).limit(1).execute()
        if email_ada.data:
            return core.response_error("Email sudah terdaftar.", 409)

        hasil = core.supabase.table("mahasiswa").insert({
            "nama": nama,
            "nim": nim,
            "email": email,
            "password_hash": generate_password_hash(password),
            "role": "mahasiswa",
            "aktif": True,
        }).execute()

        if not hasil.data:
            return core.response_error("Akun mahasiswa gagal dibuat.", 500)

        mahasiswa = hasil.data[0]
        session.clear()
        session["labtrack_role"] = "mahasiswa"
        session["labtrack_mahasiswa_id"] = mahasiswa["id"]

        return core.jsonify({
            "berhasil": True,
            "pesan": "Pendaftaran berhasil. Kamu sudah login sebagai mahasiswa.",
            "akun": data_mahasiswa_aman(mahasiswa),
        })
    except Exception as error:
        print("Gagal mendaftarkan mahasiswa:", error)
        return core.response_error("Gagal membuat akun mahasiswa.", 500)


@app.post("/api/auth/login")
def login_auth():
    isi = request.get_json(silent=True) or {}
    identitas = str(isi.get("identitas", "")).strip()
    password = str(isi.get("password", ""))

    if not identitas or not password:
        return core.response_error("NIM dan password wajib diisi.")

    # Admin tetap menggunakan kredensial environment variable yang sudah ada.
    if core.admin_terkonfigurasi():
        username_benar = secrets.compare_digest(identitas, core.ADMIN_USERNAME)
        password_benar = False
        try:
            password_benar = check_password_hash(core.ADMIN_PASSWORD_HASH, password)
        except (ValueError, TypeError):
            pass
        if username_benar and password_benar:
            session.clear()
            session["labtrack_admin"] = True
            session["labtrack_role"] = "admin"
            return core.jsonify({
                "berhasil": True,
                "pesan": "Login admin berhasil.",
                "akun": {"role": "admin", "nama": "Admin", "nim": "", "email": ""},
            })

    try:
        mahasiswa = cari_mahasiswa_nim(identitas)
    except Exception as error:
        print("Gagal mencari mahasiswa saat login:", error)
        return core.response_error("Gagal mengakses data akun.", 500)

    if mahasiswa is None or mahasiswa.get("aktif") is False:
        return core.response_error("NIM atau password salah.", 401)

    try:
        password_benar = check_password_hash(mahasiswa.get("password_hash") or "", password)
    except (ValueError, TypeError):
        password_benar = False

    if not password_benar:
        return core.response_error("NIM atau password salah.", 401)

    session.clear()
    session["labtrack_role"] = "mahasiswa"
    session["labtrack_mahasiswa_id"] = mahasiswa["id"]

    return core.jsonify({
        "berhasil": True,
        "pesan": "Login mahasiswa berhasil.",
        "akun": data_mahasiswa_aman(mahasiswa),
    })


@app.post("/api/auth/logout")
def logout_auth():
    session.clear()
    return core.jsonify({"berhasil": True, "pesan": "Logout berhasil."})


# Homepage tetap memakai tampilan yang sudah ada, lalu form autentikasi ditambahkan
# melalui auth.js agar login menjadi pintu masuk utama aplikasi.
_halaman_utama_asli = app.view_functions["halaman_utama"]


def halaman_utama_dengan_auth():
    respons = app.make_response(_halaman_utama_asli())
    html = respons.get_data(as_text=True)

    if "css/auth.css" not in html:
        html = html.replace("</head>", '  <link rel="stylesheet" href="css/auth.css">\n  <link rel="stylesheet" href="css/role-features.css">\n</head>')

    if "js/auth.js" not in html:
        html = html.replace(
            '<script src="js/home.js"></script>',
            '<script src="js/auth.js"></script>\n  <script src="js/role-features.js"></script>\n  <script src="js/home.js"></script>',
        )

    respons.set_data(html)
    return respons


app.view_functions["halaman_utama"] = halaman_utama_dengan_auth


# Peminjaman hanya boleh diajukan oleh mahasiswa yang sudah login.
_pinjam_alat_asli = app.view_functions["pinjam_alat"]


def pinjam_alat_terautentikasi():
    mahasiswa = mahasiswa_session()
    if mahasiswa is None:
        return core.response_error("Login sebagai mahasiswa diperlukan untuk mengajukan peminjaman.", 401)

    nim_form = str(request.form.get("nim", "")).strip()
    nama_form = str(request.form.get("namaPeminjam", "")).strip()
    if nim_form != str(mahasiswa.get("nim") or "") or nama_form != str(mahasiswa.get("nama") or "").strip():
        return core.response_error("Identitas peminjam harus sesuai dengan akun mahasiswa yang sedang login.", 403)

    return _pinjam_alat_asli()


app.view_functions["pinjam_alat"] = pinjam_alat_terautentikasi
