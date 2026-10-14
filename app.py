from datetime import date
from pathlib import Path
from uuid import uuid4

from flask import Response, jsonify, request, send_from_directory

from python import labtrack as core

app = core.app
ROOT = Path(__file__).resolve().parent


# Sajikan logo LabTrack terbaru melalui endpoint tetap agar nama file dengan spasi
# tidak membuat pemanggilan asset bermasalah di browser/Vercel.
def serve_labtrack_logo():
    return send_from_directory(
        ROOT / "assets",
        "Glossy Teal PLC Automation Icon.png",
        mimetype="image/png",
    )


app.view_functions["logo_labtrack_image"] = serve_labtrack_logo


# Sisipkan fitur persetujuan tanpa mengubah struktur HTML utama.
def halaman_utama_dengan_persetujuan():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    html = html.replace(
        "Catat peminjaman, deadline pengembalian, dan foto KTM.",
        "Ajukan peminjaman, tunggu persetujuan admin, lalu alat dapat dipinjam.",
    )
    html = html.replace(
        '<button type="submit" class="tombol">Pinjam</button>',
        '<button type="submit" class="tombol">Ajukan Peminjaman</button>',
    )
    html = html.replace(
        '<script src="js/app.js"></script>',
        '<script src="js/app.js"></script>\n  <script src="js/approval.js"></script>',
    )
    return Response(html, mimetype="text/html")


app.view_functions["halaman_utama"] = halaman_utama_dengan_persetujuan


def _hapus_ktm(path_foto):
    if not path_foto:
        return
    core.supabase.storage.from_(core.BUCKET_KTM).remove([path_foto])


def _response_sukses(pesan):
    return jsonify({"berhasil": True, "pesan": pesan, "data": core.ambil_semua_data()})


# Override endpoint pengajuan: data pertama kali berstatus Diajukan dan stok belum
# berkurang sampai admin menyetujui pengajuan.
def pinjam_alat_dengan_persetujuan():
    path_foto = None
    foto_sudah_diunggah = False
    pinjaman_sudah_disimpan = False
    try:
        core.pastikan_database()
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
            return core.response_error("ID alat dan jumlah harus berupa angka.")

        if not nama or not nim or not keperluan or not tanggal or not deadline:
            return core.response_error("Semua kolom wajib diisi.")
        if not nim.isdigit():
            return core.response_error("NIM hanya boleh berisi angka.")
        if jumlah < 1:
            return core.response_error("Jumlah harus minimal 1.")

        try:
            tanggal_pinjam = date.fromisoformat(tanggal)
            tanggal_deadline = date.fromisoformat(deadline)
        except ValueError:
            return core.response_error("Format tanggal tidak valid.")

        if tanggal_deadline < tanggal_pinjam:
            return core.response_error("Deadline pengembalian tidak boleh sebelum tanggal peminjaman.")

        ekstensi, tipe_file, error_foto = core.validasi_foto_ktm(foto_ktm)
        if error_foto:
            return core.response_error(error_foto)

        alat = core.cari_alat(alat_id)
        if alat is None or alat.get("aktif") is False:
            return core.response_error("Alat tidak ditemukan atau sudah dinonaktifkan.", 404)

        tersedia = int(alat.get("tersedia") or 0)
        if jumlah > tersedia:
            return core.response_error(f"Stok {alat.get('nama', 'alat')} hanya tersisa {tersedia}.")

        path_foto = f"aktif/{uuid4().hex}{ekstensi}"
        isi_foto = foto_ktm.read()
        core.supabase.storage.from_(core.BUCKET_KTM).upload(
            path=path_foto,
            file=isi_foto,
            file_options={"content-type": tipe_file, "cache-control": "0", "upsert": "false"},
        )
        foto_sudah_diunggah = True

        hasil_insert = core.supabase.table("pinjaman").insert({
            "nama_peminjam": nama,
            "nim": nim,
            "alat_id": alat_id,
            "jumlah": jumlah,
            "tanggal_pinjam": tanggal,
            "deadline_pengembalian": deadline,
            "tanggal_kembali": None,
            "keperluan": keperluan,
            "foto_ktm": path_foto,
            "status": "Diajukan",
        }).execute()
        pinjaman_sudah_disimpan = True

        if hasil_insert.data:
            row = hasil_insert.data[0]
            if not row.get("kode_transaksi"):
                kode = f"LT-{tanggal_pinjam.year}-{int(row['id']):05d}"
                core.supabase.table("pinjaman").update({"kode_transaksi": kode}).eq("id", row["id"]).execute()

        return _response_sukses("Pengajuan peminjaman berhasil dikirim. Menunggu persetujuan admin.")
    except Exception as error:
        print("Gagal mengajukan peminjaman:", error)
        if foto_sudah_diunggah and path_foto and not pinjaman_sudah_disimpan:
            try:
                _hapus_ktm(path_foto)
            except Exception as error_hapus:
                print("Gagal membersihkan foto KTM setelah error:", error_hapus)
        return core.response_error("Gagal mengajukan peminjaman ke Supabase.", 500)


app.view_functions["pinjam_alat"] = pinjam_alat_dengan_persetujuan


@app.post("/api/peminjaman/<int:id_peminjaman>/setujui")
@core.wajib_admin
def setujui_peminjaman(id_peminjaman):
    try:
        pinjaman = core.cari_pinjaman(id_peminjaman)
        if pinjaman is None:
            return core.response_error("Data pengajuan tidak ditemukan.", 404)
        if pinjaman.get("status") != "Diajukan":
            return core.response_error("Hanya pengajuan berstatus Diajukan yang dapat disetujui.")

        alat = core.cari_alat(pinjaman.get("alat_id"))
        if alat is None or alat.get("aktif") is False:
            return core.response_error("Alat tidak tersedia atau sudah dinonaktifkan.", 404)

        jumlah = int(pinjaman.get("jumlah") or 0)
        tersedia = int(alat.get("tersedia") or 0)
        if jumlah > tersedia:
            return core.response_error(f"Stok {alat.get('nama', 'alat')} hanya tersisa {tersedia}.")

        # Stok langsung direservasi saat disetujui agar dua pengajuan tidak
        # menggunakan unit yang sama.
        core.supabase.table("alat").update({"tersedia": tersedia - jumlah}).eq("id", alat["id"]).execute()
        core.supabase.table("pinjaman").update({"status": "Disetujui"}).eq("id", id_peminjaman).execute()
        return _response_sukses("Pengajuan disetujui. Stok sudah direservasi untuk peminjam.")
    except Exception as error:
        print("Gagal menyetujui pengajuan:", error)
        return core.response_error("Gagal menyetujui pengajuan.", 500)


@app.post("/api/peminjaman/<int:id_peminjaman>/mulai")
@core.wajib_admin
def mulai_peminjaman(id_peminjaman):
    try:
        pinjaman = core.cari_pinjaman(id_peminjaman)
        if pinjaman is None:
            return core.response_error("Data peminjaman tidak ditemukan.", 404)
        if pinjaman.get("status") != "Disetujui":
            return core.response_error("Peminjaman harus berstatus Disetujui sebelum alat diserahkan.")

        core.supabase.table("pinjaman").update({"status": "Dipinjam"}).eq("id", id_peminjaman).execute()
        return _response_sukses("Alat telah diserahkan. Status berubah menjadi Dipinjam.")
    except Exception as error:
        print("Gagal memulai peminjaman:", error)
        return core.response_error("Gagal mengubah status menjadi Dipinjam.", 500)


@app.post("/api/peminjaman/<int:id_peminjaman>/tolak")
@core.wajib_admin
def tolak_peminjaman(id_peminjaman):
    try:
        pinjaman = core.cari_pinjaman(id_peminjaman)
        if pinjaman is None:
            return core.response_error("Data pengajuan tidak ditemukan.", 404)
        status = pinjaman.get("status")
        if status not in {"Diajukan", "Disetujui"}:
            return core.response_error("Pengajuan ini tidak dapat ditolak pada status sekarang.")

        alat = core.cari_alat(pinjaman.get("alat_id"))
        if status == "Disetujui" and alat is not None:
            jumlah = int(pinjaman.get("jumlah") or 0)
            tersedia = int(alat.get("tersedia") or 0)
            total = int(alat.get("total") or 0)
            core.supabase.table("alat").update({"tersedia": min(total, tersedia + jumlah)}).eq("id", alat["id"]).execute()

        path_foto = pinjaman.get("foto_ktm")
        if path_foto:
            _hapus_ktm(path_foto)

        core.supabase.table("pinjaman").update({
            "status": "Ditolak",
            "foto_ktm": None,
            "catatan_pengembalian": "Pengajuan ditolak oleh admin.",
        }).eq("id", id_peminjaman).execute()
        return _response_sukses("Pengajuan ditolak dan foto KTM telah dihapus.")
    except Exception as error:
        print("Gagal menolak pengajuan:", error)
        return core.response_error("Gagal menolak pengajuan.", 500)


# Pengembalian kini juga harus dilakukan oleh admin agar alur status tidak dapat
# dilewati oleh pengguna biasa.
_kembalikan_asli = app.view_functions["kembalikan_alat"]


@core.wajib_admin
def kembalikan_alat_admin(id_peminjaman):
    return _kembalikan_asli(id_peminjaman)


app.view_functions["kembalikan_alat"] = kembalikan_alat_admin


# Cegah alat dinonaktifkan jika masih direservasi atau sedang dipinjam.
def hapus_alat_dengan_reservasi(id_alat):
    if not core.admin_login():
        return core.response_error("Akses admin diperlukan.", 401)
    try:
        alat = core.cari_alat(id_alat)
        if alat is None:
            return core.response_error("Alat tidak ditemukan.", 404)

        aktif = (
            core.supabase.table("pinjaman")
            .select("id")
            .eq("alat_id", id_alat)
            .in_("status", ["Disetujui", "Dipinjam"])
            .limit(1)
            .execute()
        )
        if aktif.data:
            return core.response_error("Alat tidak dapat dinonaktifkan karena masih direservasi atau dipinjam.")

        core.supabase.table("alat").update({"aktif": False}).eq("id", id_alat).execute()
        return _response_sukses("Alat dinonaktifkan dari inventaris tanpa menghapus riwayat.")
    except Exception as error:
        print("Gagal menonaktifkan alat:", error)
        return core.response_error("Gagal menonaktifkan alat.", 500)


app.view_functions["hapus_alat"] = hapus_alat_dengan_reservasi


if __name__ == "__main__":
    app.run(debug=True)
