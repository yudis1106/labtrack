# =========================================================
# LabTrack (versi teks) - labtrack.py
# Sistem inventaris dan peminjaman alat laboratorium.
# Jalankan dengan:  python labtrack.py
#
# Konsep dasar yang dipakai:
#   variabel, list, dictionary, looping (for, while),
#   if-else, dan fungsi.
# =========================================================

from datetime import date  # untuk mengambil tanggal hari ini

# ---------------------------------------------------------
# 1. DATA (variabel bertipe list berisi dictionary)
# Satu alat = satu dictionary. Semua alat ada di satu list.
# Isinya sama dengan data.js di website.
# ---------------------------------------------------------
daftar_alat = [
    {"id": 1,  "nama": "Multimeter Digital",   "kategori": "Alat Ukur",            "total": 10,  "tersedia": 10,  "kondisi": "Baik"},
    {"id": 2,  "nama": "Osiloskop",            "kategori": "Alat Ukur",            "total": 4,   "tersedia": 4,   "kondisi": "Baik"},
    {"id": 3,  "nama": "Power Supply",         "kategori": "Peralatan",            "total": 6,   "tersedia": 6,   "kondisi": "Perlu Diperiksa"},
    {"id": 4,  "nama": "Solder",               "kategori": "Peralatan",            "total": 8,   "tersedia": 8,   "kondisi": "Baik"},
    {"id": 5,  "nama": "Arduino Uno",          "kategori": "Mikrokontroler",       "total": 12,  "tersedia": 12,  "kondisi": "Baik"},
    {"id": 6,  "nama": "Sensor Ultrasonik",    "kategori": "Sensor",               "total": 15,  "tersedia": 15,  "kondisi": "Baik"},
    {"id": 7,  "nama": "Sensor Suhu DHT11",    "kategori": "Sensor",               "total": 10,  "tersedia": 10,  "kondisi": "Perlu Diperiksa"},
    {"id": 8,  "nama": "Breadboard",           "kategori": "Komponen Elektronika", "total": 20,  "tersedia": 20,  "kondisi": "Baik"},
    {"id": 9,  "nama": "Resistor",             "kategori": "Komponen Elektronika", "total": 100, "tersedia": 100, "kondisi": "Baik"},
    {"id": 10, "nama": "Kapasitor",            "kategori": "Komponen Elektronika", "total": 60,  "tersedia": 60,  "kondisi": "Baik"},
]

# Awalnya kosong. Diisi saat ada peminjaman.
daftar_peminjaman = []


# ---------------------------------------------------------
# 2. FUNGSI PEMBANTU
# ---------------------------------------------------------
def cari_alat(id_alat):
    """Mencari alat berdasarkan id. Hasilnya None kalau tidak ada."""
    for alat in daftar_alat:
        if alat["id"] == id_alat:
            return alat
    return None


def baca_angka(pesan):
    """Meminta input angka. Mengulang terus sampai pengguna mengetik angka."""
    while True:
        teks = input(pesan).strip()
        if teks.isdigit():
            return int(teks)
        print("  Masukkan angka saja.")


def garis():
    print("-" * 70)


# ---------------------------------------------------------
# 3. FITUR UTAMA (masing-masing satu fungsi)
# ---------------------------------------------------------
def tampilkan_ringkasan():
    """Seperti Dashboard di website: empat angka ringkasan."""
    total = 0
    tersedia = 0
    perlu_diperiksa = 0
    for alat in daftar_alat:           # looping: jumlahkan semua alat
        total += alat["total"]
        tersedia += alat["tersedia"]
        if alat["kondisi"] == "Perlu Diperiksa":
            perlu_diperiksa += 1

    dipinjam = 0
    for p in daftar_peminjaman:        # looping: hitung yang masih dipinjam
        if p["status"] == "Dipinjam":
            dipinjam += p["jumlah"]

    garis()
    print("RINGKASAN")
    print(f"Total alat         : {total}")
    print(f"Tersedia           : {tersedia}")
    print(f"Sedang dipinjam    : {dipinjam}")
    print(f"Perlu diperiksa    : {perlu_diperiksa}")
    garis()


def tampilkan_inventaris(kata=""):
    """Menampilkan daftar alat. Kalau kata diisi, hanya alat yang namanya cocok."""
    garis()
    print(f"{'ID':<4}{'Nama':<22}{'Kategori':<24}{'Total':>6}{'Sedia':>7}  Kondisi")
    garis()
    ditemukan = 0
    for alat in daftar_alat:
        if kata.lower() in alat["nama"].lower():   # pencarian tidak peka huruf besar-kecil
            print(f"{alat['id']:<4}{alat['nama']:<22}{alat['kategori']:<24}"
                  f"{alat['total']:>6}{alat['tersedia']:>7}  {alat['kondisi']}")
            ditemukan += 1
    if ditemukan == 0:
        print("Tidak ada alat yang cocok.")
    garis()


def pinjam_alat():
    """Mencatat peminjaman baru, dengan validasi."""
    print("\n--- PINJAM ALAT ---")
    nama = input("Nama peminjam: ").strip()
    if nama == "":
        print("Nama tidak boleh kosong.")
        return

    nim = input("NIM: ").strip()
    if not nim.isdigit():
        print("NIM hanya boleh berisi angka.")
        return

    tampilkan_inventaris()
    alat = cari_alat(baca_angka("ID alat yang dipinjam: "))
    if alat is None:
        print("ID alat tidak ditemukan.")
        return

    jumlah = baca_angka("Jumlah: ")
    if jumlah < 1:
        print("Jumlah minimal 1.")
        return
    elif jumlah > alat["tersedia"]:
        print(f"Stok {alat['nama']} hanya tersisa {alat['tersedia']}.")
        return

    keperluan = input("Keperluan: ").strip()
    if keperluan == "":
        print("Keperluan tidak boleh kosong.")
        return

    # Semua benar: catat peminjaman dan kurangi stok
    daftar_peminjaman.append({
        "id": len(daftar_peminjaman) + 1,
        "nama": nama,
        "nim": nim,
        "alat_id": alat["id"],
        "jumlah": jumlah,
        "tanggal_pinjam": date.today().isoformat(),   # format YYYY-MM-DD
        "tanggal_kembali": "",
        "keperluan": keperluan,
        "status": "Dipinjam",
    })
    alat["tersedia"] -= jumlah
    print("Peminjaman berhasil dicatat.")


def kembalikan_alat():
    """Mengembalikan alat. Status berubah, stok bertambah, data tetap tersimpan."""
    print("\n--- KEMBALIKAN ALAT ---")

    # Tampilkan hanya peminjaman yang masih aktif
    aktif = []
    for p in daftar_peminjaman:
        if p["status"] == "Dipinjam":
            aktif.append(p)

    if len(aktif) == 0:
        print("Tidak ada alat yang sedang dipinjam.")
        return

    for p in aktif:
        nama_alat = cari_alat(p["alat_id"])["nama"]
        print(f"[{p['id']}] {p['nama']} ({p['nim']}) - {nama_alat} x{p['jumlah']}, "
              f"sejak {p['tanggal_pinjam']}")

    id_pilihan = baca_angka("Nomor peminjaman yang dikembalikan: ")
    terpilih = None
    for p in aktif:
        if p["id"] == id_pilihan:
            terpilih = p

    if terpilih is None:
        print("Nomor tidak ditemukan di daftar peminjaman aktif.")
        return

    yakin = input("Yakin alat ini sudah dikembalikan? (y/n): ").strip().lower()
    if yakin != "y":
        print("Dibatalkan.")
        return

    terpilih["status"] = "Dikembalikan"
    terpilih["tanggal_kembali"] = date.today().isoformat()
    cari_alat(terpilih["alat_id"])["tersedia"] += terpilih["jumlah"]
    print("Pengembalian dicatat.")


def tampilkan_riwayat():
    """Menampilkan peminjaman yang sudah dikembalikan."""
    garis()
    print("RIWAYAT PEMINJAMAN")
    garis()
    ada = False
    for p in daftar_peminjaman:
        if p["status"] == "Dikembalikan":
            nama_alat = cari_alat(p["alat_id"])["nama"]
            print(f"{p['nama']} ({p['nim']}) - {nama_alat} x{p['jumlah']}")
            print(f"   Pinjam: {p['tanggal_pinjam']}  Kembali: {p['tanggal_kembali']}  [{p['status']}]")
            ada = True
    if not ada:
        print("Belum ada alat yang dikembalikan.")
    garis()


# ---------------------------------------------------------
# 4. PROGRAM UTAMA: menu yang berulang sampai pengguna keluar
# ---------------------------------------------------------
def main():
    while True:
        print("\n=== LabTrack ===")
        print("1. Ringkasan")
        print("2. Lihat inventaris")
        print("3. Pinjam alat")
        print("4. Kembalikan alat")
        print("5. Riwayat peminjaman")
        print("6. Keluar")
        pilihan = input("Pilih menu: ").strip()

        if pilihan == "1":
            tampilkan_ringkasan()
        elif pilihan == "2":
            kata = input("Cari nama alat (kosongkan untuk semua): ").strip()
            tampilkan_inventaris(kata)
        elif pilihan == "3":
            pinjam_alat()
        elif pilihan == "4":
            kembalikan_alat()
        elif pilihan == "5":
            tampilkan_riwayat()
        elif pilihan == "6":
            print("Sampai jumpa!")
            break
        else:
            print("Pilihan tidak dikenal. Ketik angka 1 sampai 6.")


# Bagian ini membuat main() berjalan hanya saat file dijalankan langsung
if __name__ == "__main__":
    main()
