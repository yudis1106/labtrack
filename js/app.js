// =========================================================
// LabTrack - app.js
// Isi: navigasi, dashboard, inventaris, peminjaman, pengembalian, riwayat.
// =========================================================

// 1. Ambil semua tombol menu dan semua halaman dari HTML
const tombolMenu = document.querySelectorAll(".menu-tombol");
const semuaHalaman = document.querySelectorAll(".halaman");

// 2. Fungsi untuk menampilkan satu halaman dan menyembunyikan yang lain
function tampilkanHalaman(idHalaman) {
  // Halaman: beri class "aktif" hanya pada halaman yang dipilih
  semuaHalaman.forEach(function (halaman) {
    halaman.classList.toggle("aktif", halaman.id === idHalaman);
  });

  // Tombol menu: tandai tombol yang sedang dipilih
  tombolMenu.forEach(function (tombol) {
    const sedangDipilih = tombol.dataset.target === idHalaman;
    tombol.classList.toggle("aktif", sedangDipilih);

    if (sedangDipilih) {
      tombol.setAttribute("aria-current", "page");
    } else {
      tombol.removeAttribute("aria-current");
    }
  });

  // Gulir kembali ke atas setiap pindah halaman
  window.scrollTo(0, 0);
}

// 3. Pasang "pendengar klik" di setiap tombol menu
tombolMenu.forEach(function (tombol) {
  tombol.addEventListener("click", function () {
    tampilkanHalaman(tombol.dataset.target);
  });
});

// =========================================================
// FUNGSI PEMBANTU
// =========================================================
const namaBulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// "2026-10-05" -> "5 Okt 2026"
function formatTanggal(tanggal) {
  if (!tanggal) return "-";
  const bagian = tanggal.split("-");
  return Number(bagian[2]) + " " + namaBulan[Number(bagian[1]) - 1] + " " + bagian[0];
}

// Tanggal hari ini dalam format YYYY-MM-DD
function hariIni() {
  const n = new Date();
  const dua = function (x) { return String(x).padStart(2, "0"); };
  return n.getFullYear() + "-" + dua(n.getMonth() + 1) + "-" + dua(n.getDate());
}

function cariAlat(id) {
  return daftarAlat.find(function (a) { return a.id === id; });
}

// Mengamankan teks ketikan pengguna sebelum dimasukkan ke HTML
function aman(teks) {
  const d = document.createElement("div");
  d.textContent = teks;
  return d.innerHTML;
}

function labelStatus(status) {
  const warna = status === "Dipinjam" ? "label-biru" : "label-abu";
  return '<span class="label ' + warna + '">' + status + "</span>";
}

function kelasKondisi(kondisi) {
  return kondisi === "Baik" ? "label-hijau" : "label-kuning";
}

// Peminjaman diurutkan dari yang terbaru
function urutkanTerbaru(daftar) {
  return daftar.slice().sort(function (a, b) {
    return b.tanggalPinjam.localeCompare(a.tanggalPinjam) || b.id - a.id;
  });
}

// =========================================================
// INVENTARIS: tabel, pencarian, filter, detail
// =========================================================
function tampilkanInventaris() {
  const kata = document.getElementById("cari-alat").value.trim().toLowerCase();
  const kategori = document.getElementById("filter-kategori").value;

  const hasil = daftarAlat.filter(function (a) {
    const cocokNama = a.nama.toLowerCase().includes(kata);
    const cocokKategori = kategori === "" || a.kategori === kategori;
    return cocokNama && cocokKategori;
  });

  let html = "";
  hasil.forEach(function (a) {
    const kelasStok = a.tersedia === 0 ? "stok-habis" : "";
    html += `
      <tr>
        <td class="nama-alat">${a.nama}</td>
        <td>${a.kategori}</td>
        <td class="angka">${a.total}</td>
        <td class="angka ${kelasStok}">${a.tersedia}</td>
        <td><span class="label ${kelasKondisi(a.kondisi)}">${a.kondisi}</span></td>
        <td><button class="tombol tombol-garis tombol-kecil" data-detail="${a.id}">Detail</button></td>
      </tr>`;
  });

  if (hasil.length === 0) {
    html = '<tr><td colspan="6" class="kosong">Tidak ada alat yang cocok. Coba kata kunci atau kategori lain.</td></tr>';
  }
  document.getElementById("isi-inventaris").innerHTML = html;
}

document.getElementById("cari-alat").addEventListener("input", tampilkanInventaris);
document.getElementById("filter-kategori").addEventListener("change", tampilkanInventaris);

const dialogDetail = document.getElementById("dialog-detail");

document.getElementById("isi-inventaris").addEventListener("click", function (e) {
  const tombol = e.target.closest("[data-detail]");
  if (!tombol) return;
  const a = cariAlat(Number(tombol.dataset.detail));
  document.getElementById("isi-detail").innerHTML = `
    <h3>${a.nama}</h3>
    <dl class="detail">
      <dt>Kategori</dt><dd>${a.kategori}</dd>
      <dt>Lokasi</dt><dd>${a.lokasi}</dd>
      <dt>Total</dt><dd>${a.total}</dd>
      <dt>Tersedia</dt><dd>${a.tersedia}</dd>
      <dt>Kondisi</dt><dd>${a.kondisi}</dd>
      <dt>Deskripsi</dt><dd>${a.deskripsi}</dd>
    </dl>`;
  dialogDetail.showModal();
});

document.getElementById("tutup-detail").addEventListener("click", function () { dialogDetail.close(); });
// Klik di luar kotak popup juga menutupnya
dialogDetail.addEventListener("click", function (e) { if (e.target === dialogDetail) dialogDetail.close(); });

// =========================================================
// DASHBOARD
// =========================================================
function tampilkanDashboard() {
  let total = 0, tersedia = 0, dipinjam = 0, periksa = 0;
  daftarAlat.forEach(function (a) {
    total += a.total;
    tersedia += a.tersedia;
    if (a.kondisi === "Perlu Diperiksa") periksa++;
  });
  daftarPeminjaman.forEach(function (p) {
    if (p.status === "Dipinjam") dipinjam += p.jumlah;
  });

  document.getElementById("kartu-total").textContent = total;
  document.getElementById("kartu-tersedia").textContent = tersedia;
  document.getElementById("kartu-dipinjam").textContent = dipinjam;
  document.getElementById("kartu-periksa").textContent = periksa;

  let html = "";
  urutkanTerbaru(daftarPeminjaman).slice(0, 5).forEach(function (p) {
    html += `
      <tr>
        <td>${aman(p.namaPeminjam)}</td>
        <td>${cariAlat(p.alatId).nama}</td>
        <td class="angka">${p.jumlah}</td>
        <td>${formatTanggal(p.tanggalPinjam)}</td>
        <td>${labelStatus(p.status)}</td>
      </tr>`;
  });
  if (html === "") {
    html = '<tr><td colspan="5" class="kosong">Belum ada peminjaman. Catat peminjaman pertama di menu Peminjaman.</td></tr>';
  }
  document.getElementById("isi-dashboard").innerHTML = html;
}

// =========================================================
// PEMINJAMAN: pilihan alat, tabel, formulir, pengembalian
// =========================================================
function isiPilihanAlat() {
  const pilih = document.getElementById("input-alat");
  const pilihanLama = pilih.value;
  let html = '<option value="">Pilih alat...</option>';
  daftarAlat.forEach(function (a) {
    const nonaktif = a.tersedia === 0 ? "disabled" : "";
    html += `<option value="${a.id}" ${nonaktif}>${a.nama} (stok: ${a.tersedia})</option>`;
  });
  pilih.innerHTML = html;
  pilih.value = pilihanLama;
}

function tampilkanPeminjaman() {
  let html = "";
  urutkanTerbaru(daftarPeminjaman).forEach(function (p) {
    // Tombol Kembalikan hanya ada pada data yang masih Dipinjam
    const aksi = p.status === "Dipinjam"
      ? `<button class="tombol tombol-garis tombol-kecil" data-kembali="${p.id}">Kembalikan</button>`
      : "-";
    html += `
      <tr>
        <td>${aman(p.namaPeminjam)}</td>
        <td>${aman(p.nim)}</td>
        <td>${cariAlat(p.alatId).nama}</td>
        <td class="angka">${p.jumlah}</td>
        <td>${formatTanggal(p.tanggalPinjam)}</td>
        <td>${aman(p.keperluan)}</td>
        <td>${labelStatus(p.status)}</td>
        <td>${aksi}</td>
      </tr>`;
  });
  if (html === "") {
    html = '<tr><td colspan="8" class="kosong">Belum ada data peminjaman. Isi formulir di atas untuk mencatat peminjaman.</td></tr>';
  }
  document.getElementById("isi-peminjaman").innerHTML = html;
}

function tampilkanPesan(teks, berhasil) {
  const pesan = document.getElementById("pesan-form");
  pesan.textContent = teks;
  pesan.className = "pesan " + (berhasil ? "pesan-ok" : "pesan-error");
}

document.getElementById("form-pinjam").addEventListener("submit", function (e) {
  e.preventDefault(); // cegah halaman ter-refresh

  const nama = document.getElementById("input-nama").value.trim();
  const nim = document.getElementById("input-nim").value.trim();
  const alat = cariAlat(Number(document.getElementById("input-alat").value));
  const jumlah = Number(document.getElementById("input-jumlah").value);
  const tanggal = document.getElementById("input-tanggal").value;
  const keperluan = document.getElementById("input-keperluan").value.trim();

  // Validasi: berhenti di kesalahan pertama
  if (!nama || !nim || !alat || !tanggal || !keperluan) {
    return tampilkanPesan("Semua kolom wajib diisi.", false);
  }
  if (!/^\d+$/.test(nim)) {
    return tampilkanPesan("NIM hanya boleh berisi angka.", false);
  }
  if (!Number.isInteger(jumlah) || jumlah < 1) {
    return tampilkanPesan("Jumlah harus berupa angka bulat minimal 1.", false);
  }
  if (jumlah > alat.tersedia) {
    return tampilkanPesan("Stok " + alat.nama + " hanya tersisa " + alat.tersedia + ".", false);
  }

  // Semua benar: catat peminjaman dan kurangi stok
  let idBaru = 1;
  daftarPeminjaman.forEach(function (p) { if (p.id >= idBaru) idBaru = p.id + 1; });
  daftarPeminjaman.push({
    id: idBaru, namaPeminjam: nama, nim: nim, alatId: alat.id, jumlah: jumlah,
    tanggalPinjam: tanggal, tanggalKembali: "", keperluan: keperluan, status: "Dipinjam"
  });
  alat.tersedia -= jumlah;

  this.reset();
  document.getElementById("input-tanggal").value = hariIni();
  renderSemua();
  tampilkanPesan("Peminjaman berhasil dicatat.", true);
});

document.getElementById("isi-peminjaman").addEventListener("click", function (e) {
  const tombol = e.target.closest("[data-kembali]");
  if (!tombol) return;

  const p = daftarPeminjaman.find(function (x) { return x.id === Number(tombol.dataset.kembali); });
  // Cek status dulu agar stok tidak bertambah dua kali
  if (!p || p.status !== "Dipinjam") return;
  if (!confirm("Yakin alat ini sudah dikembalikan?")) return;

  p.status = "Dikembalikan";
  p.tanggalKembali = hariIni();
  cariAlat(p.alatId).tersedia += p.jumlah;

  renderSemua();
  tampilkanPesan("Pengembalian dicatat. Data masuk ke Riwayat.", true);
});

// =========================================================
// RIWAYAT
// =========================================================
function tampilkanRiwayat() {
  const selesai = urutkanTerbaru(daftarPeminjaman).filter(function (p) { return p.status === "Dikembalikan"; });
  let html = "";
  selesai.forEach(function (p) {
    html += `
      <tr>
        <td>${aman(p.namaPeminjam)}</td>
        <td>${aman(p.nim)}</td>
        <td>${cariAlat(p.alatId).nama}</td>
        <td class="angka">${p.jumlah}</td>
        <td>${formatTanggal(p.tanggalPinjam)}</td>
        <td>${formatTanggal(p.tanggalKembali)}</td>
        <td>${labelStatus(p.status)}</td>
      </tr>`;
  });
  if (selesai.length === 0) {
    html = '<tr><td colspan="7" class="kosong">Belum ada alat yang dikembalikan.</td></tr>';
  }
  document.getElementById("isi-riwayat").innerHTML = html;
}

// =========================================================
// Menggambar ulang semua tampilan setiap data berubah
// =========================================================
function renderSemua() {
  tampilkanDashboard();
  tampilkanInventaris();
  isiPilihanAlat();
  tampilkanPeminjaman();
  tampilkanRiwayat();
}

// 4. Saat website pertama dibuka, tampilkan Dashboard
document.getElementById("input-tanggal").value = hariIni();
renderSemua();
tampilkanHalaman("dashboard");
