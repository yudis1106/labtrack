// LabTrack - JavaScript frontend
// JavaScript mengatur tampilan dan meminta data dari Python Flask.

const tombolMenu = document.querySelectorAll(".menu-tombol");
const semuaHalaman = document.querySelectorAll(".halaman");
let daftarAlat = [];
let daftarPeminjaman = [];

function tampilkanHalaman(idHalaman) {
  semuaHalaman.forEach(function (halaman) {
    halaman.classList.toggle("aktif", halaman.id === idHalaman);
  });
  tombolMenu.forEach(function (tombol) {
    const sedangDipilih = tombol.dataset.target === idHalaman;
    tombol.classList.toggle("aktif", sedangDipilih);
    if (sedangDipilih) tombol.setAttribute("aria-current", "page");
    else tombol.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
}

tombolMenu.forEach(function (tombol) {
  tombol.addEventListener("click", function () {
    tampilkanHalaman(tombol.dataset.target);
  });
});

const namaBulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function formatTanggal(tanggal) {
  if (!tanggal) return "-";
  const bagian = tanggal.split("-");
  if (bagian.length !== 3) return tanggal;
  return Number(bagian[2]) + " " + namaBulan[Number(bagian[1]) - 1] + " " + bagian[0];
}

function hariIni() {
  const n = new Date();
  const dua = function (x) { return String(x).padStart(2, "0"); };
  return n.getFullYear() + "-" + dua(n.getMonth() + 1) + "-" + dua(n.getDate());
}

function nilaiTanggalUTC(tanggal) {
  if (!tanggal) return null;
  const bagian = tanggal.split("-").map(Number);
  if (bagian.length !== 3) return null;
  return Date.UTC(bagian[0], bagian[1] - 1, bagian[2]);
}

function infoStatus(p) {
  let status = p.status || "";
  let terlambatHari = 0;

  if (p.deadlinePengembalian) {
    const batas = nilaiTanggalUTC(p.deadlinePengembalian);
    const acuanTanggal = p.status === "Dikembalikan" && p.tanggalKembali
      ? p.tanggalKembali
      : hariIni();
    const acuan = nilaiTanggalUTC(acuanTanggal);

    if (batas !== null && acuan !== null && acuan > batas) {
      terlambatHari = Math.floor((acuan - batas) / 86400000);
      if (p.status === "Dipinjam") status = "Terlambat";
    }
  }

  return { status: status, terlambatHari: terlambatHari };
}

function cariAlat(id) {
  return daftarAlat.find(function (a) { return a.id === id; });
}

function aman(teks) {
  const d = document.createElement("div");
  d.textContent = teks ?? "";
  return d.innerHTML;
}

function labelStatusPinjaman(p) {
  const info = infoStatus(p);
  let warna = "label-abu";

  if (info.status === "Dipinjam") warna = "label-biru";
  else if (info.status === "Terlambat") warna = "label-kuning";
  else if (info.status === "Dikembalikan") warna = "label-hijau";

  let teks = info.status;
  if (info.status === "Terlambat" && info.terlambatHari > 0) {
    teks += " (" + info.terlambatHari + " hari)";
  } else if (info.status === "Dikembalikan" && info.terlambatHari > 0) {
    teks += " - terlambat " + info.terlambatHari + " hari";
  }

  return '<span class="label ' + warna + '">' + aman(teks) + "</span>";
}

function kelasKondisi(kondisi) {
  return kondisi === "Baik" ? "label-hijau" : "label-kuning";
}

function urutkanTerbaru(daftar) {
  return daftar.slice().sort(function (a, b) {
    return b.tanggalPinjam.localeCompare(a.tanggalPinjam) || b.id - a.id;
  });
}

async function bacaJsonAman(respons) {
  const teks = await respons.text();
  try {
    return JSON.parse(teks);
  } catch {
    throw new Error("Server mengembalikan respons yang tidak valid.");
  }
}

async function ambilData() {
  const respons = await fetch("/api/data");
  const hasil = await bacaJsonAman(respons);
  if (!respons.ok) throw new Error(hasil.pesan || "Gagal mengambil data dari server.");
  daftarAlat = hasil.alat;
  daftarPeminjaman = hasil.peminjaman;
}

async function prosesAPI(url, opsi) {
  const respons = await fetch(url, opsi);
  const hasil = await bacaJsonAman(respons);
  if (!respons.ok || !hasil.berhasil) throw new Error(hasil.pesan || "Terjadi kesalahan.");
  daftarAlat = hasil.data.alat;
  daftarPeminjaman = hasil.data.peminjaman;
  return hasil;
}

function tampilkanInventaris() {
  const kata = document.getElementById("cari-alat").value.trim().toLowerCase();
  const kategori = document.getElementById("filter-kategori").value;
  const hasil = daftarAlat.filter(function (a) {
    return a.nama.toLowerCase().includes(kata) && (kategori === "" || a.kategori === kategori);
  });

  let html = "";
  hasil.forEach(function (a) {
    const kelasStok = a.tersedia === 0 ? "stok-habis" : "";
    html += `<tr>
      <td class="nama-alat">${aman(a.nama)}</td>
      <td>${aman(a.kategori)}</td>
      <td class="angka">${a.total}</td>
      <td class="angka ${kelasStok}">${a.tersedia}</td>
      <td><span class="label ${kelasKondisi(a.kondisi)}">${aman(a.kondisi)}</span></td>
      <td><button class="tombol tombol-garis tombol-kecil" data-detail="${a.id}">Detail</button></td>
    </tr>`;
  });
  if (hasil.length === 0) html = '<tr><td colspan="6" class="kosong">Tidak ada alat yang cocok. Coba kata kunci atau kategori lain.</td></tr>';
  document.getElementById("isi-inventaris").innerHTML = html;
}

document.getElementById("cari-alat").addEventListener("input", tampilkanInventaris);
document.getElementById("filter-kategori").addEventListener("change", tampilkanInventaris);

const dialogDetail = document.getElementById("dialog-detail");

document.getElementById("isi-inventaris").addEventListener("click", function (e) {
  const tombol = e.target.closest("[data-detail]");
  if (!tombol) return;
  const a = cariAlat(Number(tombol.dataset.detail));
  if (!a) return;
  document.getElementById("isi-detail").innerHTML = `<h3>${aman(a.nama)}</h3>
    <dl class="detail">
      <dt>Kategori</dt><dd>${aman(a.kategori)}</dd>
      <dt>Lokasi</dt><dd>${aman(a.lokasi)}</dd>
      <dt>Total</dt><dd>${a.total}</dd>
      <dt>Tersedia</dt><dd>${a.tersedia}</dd>
      <dt>Kondisi</dt><dd>${aman(a.kondisi)}</dd>
      <dt>Deskripsi</dt><dd>${aman(a.deskripsi)}</dd>
    </dl>`;
  dialogDetail.showModal();
});

document.getElementById("tutup-detail").addEventListener("click", function () { dialogDetail.close(); });
dialogDetail.addEventListener("click", function (e) { if (e.target === dialogDetail) dialogDetail.close(); });

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
    const alat = cariAlat(p.alatId);
    html += `<tr><td>${aman(p.namaPeminjam)}</td><td>${alat ? aman(alat.nama) : "-"}</td>
      <td class="angka">${p.jumlah}</td><td>${formatTanggal(p.tanggalPinjam)}</td>
      <td>${formatTanggal(p.deadlinePengembalian)}</td><td>${labelStatusPinjaman(p)}</td></tr>`;
  });
  if (html === "") html = '<tr><td colspan="6" class="kosong">Belum ada peminjaman. Catat peminjaman pertama di menu Peminjaman.</td></tr>';
  document.getElementById("isi-dashboard").innerHTML = html;
}

function isiPilihanAlat() {
  const pilih = document.getElementById("input-alat");
  const pilihanLama = pilih.value;
  let html = '<option value="">Pilih alat...</option>';
  daftarAlat.forEach(function (a) {
    const nonaktif = a.tersedia === 0 ? "disabled" : "";
    html += `<option value="${a.id}" ${nonaktif}>${aman(a.nama)} (stok: ${a.tersedia})</option>`;
  });
  pilih.innerHTML = html;
  if (pilihanLama && cariAlat(Number(pilihanLama))) pilih.value = pilihanLama;
}

function teksKtm(p) {
  if (p.status === "Dikembalikan") return "Dihapus";
  return p.ktmTersimpan ? "Tersimpan (privat)" : "Tidak ada";
}

function tampilkanPeminjaman() {
  let html = "";
  urutkanTerbaru(daftarPeminjaman).forEach(function (p) {
    const alat = cariAlat(p.alatId);
    const aksi = p.status === "Dipinjam"
      ? `<button class="tombol tombol-garis tombol-kecil" data-kembali="${p.id}">Kembalikan</button>`
      : "-";

    html += `<tr><td>${aman(p.namaPeminjam)}</td><td>${aman(p.nim)}</td><td>${alat ? aman(alat.nama) : "-"}</td>
      <td class="angka">${p.jumlah}</td><td>${formatTanggal(p.tanggalPinjam)}</td>
      <td>${formatTanggal(p.deadlinePengembalian)}</td><td>${aman(p.keperluan)}</td>
      <td>${aman(teksKtm(p))}</td><td>${labelStatusPinjaman(p)}</td><td>${aksi}</td></tr>`;
  });
  if (html === "") html = '<tr><td colspan="10" class="kosong">Belum ada data peminjaman. Isi formulir di atas untuk mencatat peminjaman.</td></tr>';
  document.getElementById("isi-peminjaman").innerHTML = html;
}

function tampilkanPesan(teks, berhasil) {
  const pesan = document.getElementById("pesan-form");
  pesan.textContent = teks;
  pesan.className = "pesan " + (berhasil ? "pesan-ok" : "pesan-error");
}

function aturBatasDeadline() {
  const tanggalPinjam = document.getElementById("input-tanggal").value || hariIni();
  const inputDeadline = document.getElementById("input-deadline");
  inputDeadline.min = tanggalPinjam;
  if (inputDeadline.value && inputDeadline.value < tanggalPinjam) inputDeadline.value = "";
}

document.getElementById("input-tanggal").addEventListener("change", aturBatasDeadline);

document.getElementById("form-pinjam").addEventListener("submit", async function (e) {
  e.preventDefault();

  const nama = document.getElementById("input-nama").value.trim();
  const nim = document.getElementById("input-nim").value.trim();
  const alatId = Number(document.getElementById("input-alat").value);
  const jumlah = Number(document.getElementById("input-jumlah").value);
  const tanggal = document.getElementById("input-tanggal").value;
  const deadline = document.getElementById("input-deadline").value;
  const keperluan = document.getElementById("input-keperluan").value.trim();
  const foto = document.getElementById("input-ktm").files[0];

  if (!nama || !nim || !alatId || !tanggal || !deadline || !keperluan || !foto) {
    return tampilkanPesan("Semua kolom termasuk deadline dan foto KTM wajib diisi.", false);
  }
  if (!/^\d+$/.test(nim)) return tampilkanPesan("NIM hanya boleh berisi angka.", false);
  if (!Number.isInteger(jumlah) || jumlah < 1) return tampilkanPesan("Jumlah harus berupa angka bulat minimal 1.", false);
  if (deadline < tanggal) return tampilkanPesan("Deadline tidak boleh sebelum tanggal peminjaman.", false);

  const tipeDiizinkan = ["image/jpeg", "image/png"];
  if (!tipeDiizinkan.includes(foto.type)) return tampilkanPesan("Foto KTM harus JPG, JPEG, atau PNG.", false);
  if (foto.size > 5 * 1024 * 1024) return tampilkanPesan("Ukuran foto KTM maksimal 5 MB.", false);

  const dataForm = new FormData();
  dataForm.append("namaPeminjam", nama);
  dataForm.append("nim", nim);
  dataForm.append("alatId", String(alatId));
  dataForm.append("jumlah", String(jumlah));
  dataForm.append("tanggalPinjam", tanggal);
  dataForm.append("deadlinePengembalian", deadline);
  dataForm.append("keperluan", keperluan);
  dataForm.append("fotoKtm", foto);

  try {
    await prosesAPI("/api/peminjaman", {
      method: "POST",
      body: dataForm
    });

    this.reset();
    document.getElementById("input-tanggal").value = hariIni();
    document.getElementById("input-jumlah").value = "1";
    aturBatasDeadline();
    renderSemua();
    tampilkanPesan("Peminjaman berhasil dicatat. Foto KTM tersimpan secara privat.", true);
  } catch (error) {
    tampilkanPesan(error.message, false);
  }
});

document.getElementById("isi-peminjaman").addEventListener("click", async function (e) {
  const tombol = e.target.closest("[data-kembali]");
  if (!tombol || !confirm("Yakin alat ini sudah dikembalikan? Foto KTM akan dihapus otomatis.")) return;

  try {
    await prosesAPI("/api/peminjaman/" + tombol.dataset.kembali + "/kembali", { method: "POST" });
    renderSemua();
    tampilkanPesan("Pengembalian dicatat. Foto KTM telah dihapus dan data masuk ke Riwayat.", true);
  } catch (error) {
    tampilkanPesan(error.message, false);
  }
});

function tampilkanRiwayat() {
  const selesai = urutkanTerbaru(daftarPeminjaman).filter(function (p) { return p.status === "Dikembalikan"; });
  let html = "";

  selesai.forEach(function (p) {
    const alat = cariAlat(p.alatId);
    html += `<tr><td>${aman(p.namaPeminjam)}</td><td>${aman(p.nim)}</td><td>${alat ? aman(alat.nama) : "-"}</td>
      <td class="angka">${p.jumlah}</td><td>${formatTanggal(p.tanggalPinjam)}</td>
      <td>${formatTanggal(p.deadlinePengembalian)}</td><td>${formatTanggal(p.tanggalKembali)}</td>
      <td>${labelStatusPinjaman(p)}</td></tr>`;
  });

  if (selesai.length === 0) html = '<tr><td colspan="8" class="kosong">Belum ada alat yang dikembalikan.</td></tr>';
  document.getElementById("isi-riwayat").innerHTML = html;
}

function renderSemua() {
  tampilkanDashboard();
  tampilkanInventaris();
  isiPilihanAlat();
  tampilkanPeminjaman();
  tampilkanRiwayat();
}

async function mulaiWebsite() {
  try {
    await ambilData();
    document.getElementById("input-tanggal").value = hariIni();
    aturBatasDeadline();
    renderSemua();
    tampilkanHalaman("dashboard");
  } catch (error) {
    document.getElementById("isi-dashboard").innerHTML = `<tr><td colspan="6" class="kosong">${aman(error.message)}</td></tr>`;
  }
}

mulaiWebsite();
