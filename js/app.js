// LabTrack - frontend lengkap (branch feature/labtrack-complete)

const tombolMenu = document.querySelectorAll(".menu-tombol");
const semuaHalaman = document.querySelectorAll(".halaman");
let daftarAlat = [];
let daftarPeminjaman = [];
let statusAdmin = { configured: false, loggedIn: false };

const namaBulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

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
  if (idHalaman === "dashboard") window.setTimeout(gambarGrafikPeminjaman, 0);
}

tombolMenu.forEach(function (tombol) {
  tombol.addEventListener("click", function () {
    tampilkanHalaman(tombol.dataset.target);
  });
});

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
  if (bagian.length !== 3 || bagian.some(Number.isNaN)) return null;
  return Date.UTC(bagian[0], bagian[1] - 1, bagian[2]);
}

function selisihHari(tanggalA, tanggalB) {
  const a = nilaiTanggalUTC(tanggalA);
  const b = nilaiTanggalUTC(tanggalB);
  if (a === null || b === null) return null;
  return Math.round((a - b) / 86400000);
}

function infoStatus(p) {
  let status = p.status || "";
  let terlambatHari = 0;
  if (p.deadlinePengembalian) {
    const batas = nilaiTanggalUTC(p.deadlinePengembalian);
    const acuanTanggal = p.status === "Dikembalikan" && p.tanggalKembali ? p.tanggalKembali : hariIni();
    const acuan = nilaiTanggalUTC(acuanTanggal);
    if (batas !== null && acuan !== null && acuan > batas) {
      terlambatHari = Math.floor((acuan - batas) / 86400000);
      if (p.status === "Dipinjam") status = "Terlambat";
    }
  }
  return { status: status, terlambatHari: terlambatHari };
}

function infoDeadline(p) {
  if (!p.deadlinePengembalian || p.status !== "Dipinjam") return null;
  const sisa = selisihHari(p.deadlinePengembalian, hariIni());
  if (sisa === null) return null;
  if (sisa < 0) return { hari: sisa, teks: "Terlambat " + Math.abs(sisa) + " hari", kelas: "urgent" };
  if (sisa === 0) return { hari: 0, teks: "Jatuh tempo hari ini", kelas: "urgent" };
  if (sisa === 1) return { hari: 1, teks: "Besok jatuh tempo", kelas: "warning" };
  if (sisa <= 3) return { hari: sisa, teks: sisa + " hari lagi", kelas: "warning" };
  return { hari: sisa, teks: sisa + " hari lagi", kelas: "safe" };
}

function cariAlat(id) {
  return daftarAlat.find(function (a) { return Number(a.id) === Number(id); });
}

function alatAktif() {
  return daftarAlat.filter(function (a) { return a.aktif !== false; });
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
  else if (info.status === "Terlambat") warna = "label-merah";
  else if (info.status === "Dikembalikan") warna = "label-hijau";
  let teks = info.status;
  if (info.status === "Terlambat" && info.terlambatHari > 0) teks += " (" + info.terlambatHari + " hari)";
  else if (info.status === "Dikembalikan" && info.terlambatHari > 0) teks += " - terlambat " + info.terlambatHari + " hari";
  return '<span class="label ' + warna + '">' + aman(teks) + "</span>";
}

function kelasKondisi(kondisi) {
  if (kondisi === "Baik") return "label-hijau";
  if (kondisi === "Rusak") return "label-merah";
  return "label-kuning";
}

function urutkanTerbaru(daftar) {
  return daftar.slice().sort(function (a, b) {
    return String(b.tanggalPinjam || "").localeCompare(String(a.tanggalPinjam || "")) || Number(b.id) - Number(a.id);
  });
}

async function bacaJsonAman(respons) {
  const teks = await respons.text();
  try { return JSON.parse(teks); }
  catch { throw new Error("Server mengembalikan respons yang tidak valid."); }
}

async function ambilData() {
  const respons = await fetch("/api/data");
  const hasil = await bacaJsonAman(respons);
  if (!respons.ok) throw new Error(hasil.pesan || "Gagal mengambil data dari server.");
  daftarAlat = hasil.alat || [];
  daftarPeminjaman = hasil.peminjaman || [];
}

async function ambilStatusAdmin() {
  try {
    const respons = await fetch("/api/admin/status");
    const hasil = await bacaJsonAman(respons);
    if (respons.ok) statusAdmin = { configured: Boolean(hasil.configured), loggedIn: Boolean(hasil.loggedIn) };
  } catch (_) {
    statusAdmin = { configured: false, loggedIn: false };
  }
}

async function kirimAPI(url, opsi) {
  const respons = await fetch(url, opsi);
  const hasil = await bacaJsonAman(respons);
  if (!respons.ok || hasil.berhasil === false) throw new Error(hasil.pesan || "Terjadi kesalahan.");
  if (hasil.data) {
    daftarAlat = hasil.data.alat || [];
    daftarPeminjaman = hasil.data.peminjaman || [];
  }
  return hasil;
}

function tampilkanDashboard() {
  let total = 0, tersedia = 0, dipinjam = 0, periksa = 0, terlambat = 0;
  alatAktif().forEach(function (a) {
    total += Number(a.total || 0);
    tersedia += Number(a.tersedia || 0);
    if (a.kondisi === "Perlu Diperiksa" || a.kondisi === "Rusak" || a.kondisi === "Rusak Ringan") periksa++;
  });
  daftarPeminjaman.forEach(function (p) {
    if (p.status === "Dipinjam") dipinjam += Number(p.jumlah || 0);
    if (infoStatus(p).status === "Terlambat") terlambat++;
  });
  document.getElementById("kartu-total").textContent = total;
  document.getElementById("kartu-tersedia").textContent = tersedia;
  document.getElementById("kartu-dipinjam").textContent = dipinjam;
  document.getElementById("kartu-periksa").textContent = periksa;
  document.getElementById("kartu-terlambat").textContent = terlambat;
  tampilkanPeringatanDeadline();
  tampilkanAlatPopuler();
  let html = "";
  urutkanTerbaru(daftarPeminjaman).slice(0, 6).forEach(function (p) {
    const alat = cariAlat(p.alatId);
    html += `<tr><td>${aman(p.kodeTransaksi || "-")}</td><td>${aman(p.namaPeminjam)}</td><td>${alat ? aman(alat.nama) : "-"}</td><td class="angka">${p.jumlah}</td><td>${formatTanggal(p.tanggalPinjam)}</td><td>${formatTanggal(p.deadlinePengembalian)}</td><td>${labelStatusPinjaman(p)}</td></tr>`;
  });
  if (!html) html = '<tr><td colspan="7" class="kosong">Belum ada peminjaman.</td></tr>';
  document.getElementById("isi-dashboard").innerHTML = html;
  window.setTimeout(gambarGrafikPeminjaman, 0);
}

function tampilkanPeringatanDeadline() {
  const target = document.getElementById("peringatan-deadline");
  const daftar = daftarPeminjaman.map(function (p) { return { pinjaman: p, info: infoDeadline(p) }; }).filter(function (x) { return x.info && x.info.hari <= 7; }).sort(function (a, b) { return a.info.hari - b.info.hari; });
  if (!daftar.length) {
    target.innerHTML = '<div class="info-box" style="border-color: var(--garis); background: var(--kartu); color: var(--teks-pudar);">Tidak ada deadline dalam 7 hari ke depan.</div>';
    return;
  }
  let html = '<h3>Perlu perhatian</h3><div class="deadline-list">';
  daftar.slice(0, 5).forEach(function (x) {
    const p = x.pinjaman;
    const alat = cariAlat(p.alatId);
    html += `<div class="deadline-item ${x.info.kelas}"><div><div class="deadline-nama">${aman(p.namaPeminjam)}</div><div class="deadline-meta">${aman(p.nim)} · ${aman(p.kodeTransaksi || "-")}</div></div><div>${alat ? aman(alat.nama) : "-"} · ${p.jumlah} unit</div><div class="deadline-waktu">${aman(x.info.teks)}</div></div>`;
  });
  target.innerHTML = html + "</div>";
}

function dataEnamBulan() {
  const sekarang = new Date();
  const bulan = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
    bulan.push({ tahun: d.getFullYear(), bulan: d.getMonth(), label: namaBulan[d.getMonth()], jumlah: 0 });
  }
  daftarPeminjaman.forEach(function (p) {
    if (!p.tanggalPinjam) return;
    const bagian = p.tanggalPinjam.split("-").map(Number);
    bulan.forEach(function (b) { if (bagian[0] === b.tahun && bagian[1] - 1 === b.bulan) b.jumlah++; });
  });
  return bulan;
}

function gambarGrafikPeminjaman() {
  const canvas = document.getElementById("grafik-peminjaman");
  if (!canvas || !canvas.closest(".halaman")?.classList.contains("aktif")) return;
  const data = dataEnamBulan();
  const lebarCss = Math.max(300, Math.floor(canvas.getBoundingClientRect().width || 560));
  const tinggiCss = 190;
  const rasio = window.devicePixelRatio || 1;
  canvas.width = lebarCss * rasio;
  canvas.height = tinggiCss * rasio;
  canvas.style.height = tinggiCss + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(rasio, rasio);
  ctx.clearRect(0, 0, lebarCss, tinggiCss);
  const kiri = 26, kanan = 10, atas = 15, bawah = 28;
  const areaW = lebarCss - kiri - kanan;
  const areaH = tinggiCss - atas - bawah;
  const maksimum = Math.max(1, ...data.map(function (x) { return x.jumlah; }));
  const slot = areaW / data.length;
  const barW = Math.min(42, slot * .55);
  ctx.font = "12px IBM Plex Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#5b747b";
  ctx.strokeStyle = "#d8e3e6";
  ctx.beginPath(); ctx.moveTo(kiri, atas + areaH + .5); ctx.lineTo(kiri + areaW, atas + areaH + .5); ctx.stroke();
  data.forEach(function (x, i) {
    const h = (x.jumlah / maksimum) * (areaH - 20);
    const cx = kiri + slot * i + slot / 2;
    ctx.fillStyle = "#0f8b8d"; ctx.fillRect(cx - barW / 2, atas + areaH - h, barW, h);
    ctx.fillStyle = "#14323a"; ctx.fillText(String(x.jumlah), cx, Math.max(12, atas + areaH - h - 6));
    ctx.fillStyle = "#5b747b"; ctx.fillText(x.label, cx, tinggiCss - 7);
  });
}

function tampilkanAlatPopuler() {
  const jumlah = new Map();
  daftarPeminjaman.forEach(function (p) { jumlah.set(Number(p.alatId), (jumlah.get(Number(p.alatId)) || 0) + Number(p.jumlah || 0)); });
  const daftar = Array.from(jumlah.entries()).map(function ([id, total]) { return { alat: cariAlat(id), total: total }; }).filter(function (x) { return x.alat; }).sort(function (a, b) { return b.total - a.total; }).slice(0, 5);
  document.getElementById("alat-populer").innerHTML = daftar.length ? daftar.map(function (x) { return `<div class="populer-item"><span class="populer-nama">${aman(x.alat.nama)}</span><span class="populer-jumlah">${x.total} unit</span></div>`; }).join("") : '<div class="kosong">Belum ada data.</div>';
}

function tampilkanInventaris() {
  const kata = document.getElementById("cari-alat").value.trim().toLowerCase();
  const kategori = document.getElementById("filter-kategori").value;
  const hasil = alatAktif().filter(function (a) { return a.nama.toLowerCase().includes(kata) && (kategori === "" || a.kategori === kategori); });
  let html = "";
  hasil.forEach(function (a) {
    const kelasStok = Number(a.tersedia) === 0 ? "stok-habis" : "";
    let aksi = `<button class="tombol tombol-garis tombol-kecil" data-detail="${a.id}">Detail / QR</button>`;
    if (statusAdmin.loggedIn) {
      aksi += ` <button class="tombol tombol-garis tombol-kecil" data-edit-alat="${a.id}">Edit</button>`;
      aksi += ` <button class="tombol tombol-bahaya tombol-kecil" data-hapus-alat="${a.id}">Hapus</button>`;
    }
    html += `<tr><td class="nama-alat">${aman(a.nama)}</td><td>${aman(a.kategori)}</td><td class="angka">${a.total}</td><td class="angka ${kelasStok}">${a.tersedia}</td><td><span class="label ${kelasKondisi(a.kondisi)}">${aman(a.kondisi)}</span></td><td><div class="aksi-baris">${aksi}</div></td></tr>`;
  });
  if (!html) html = '<tr><td colspan="6" class="kosong">Tidak ada alat yang cocok.</td></tr>';
  document.getElementById("isi-inventaris").innerHTML = html;
}

document.getElementById("cari-alat").addEventListener("input", tampilkanInventaris);
document.getElementById("filter-kategori").addEventListener("change", tampilkanInventaris);

const dialogDetail = document.getElementById("dialog-detail");
function bukaDetailAlat(id) {
  const a = cariAlat(Number(id));
  if (!a) return;
  const riwayat = urutkanTerbaru(daftarPeminjaman.filter(function (p) { return Number(p.alatId) === Number(a.id); })).slice(0, 8);
  const riwayatHtml = riwayat.length ? riwayat.map(function (p) { return `<div class="detail-riwayat-item"><div><strong>${aman(p.namaPeminjam)}</strong><div class="teks-kecil">${aman(p.kodeTransaksi || "-")} · ${formatTanggal(p.tanggalPinjam)}</div></div><div>${labelStatusPinjaman(p)}</div></div>`; }).join("") : '<div class="kosong">Belum ada riwayat peminjaman alat ini.</div>';
  document.getElementById("isi-detail").innerHTML = `<div class="detail-grid-lanjut"><div><h3>${aman(a.nama)}</h3><dl class="detail"><dt>Kategori</dt><dd>${aman(a.kategori)}</dd><dt>Lokasi</dt><dd>${aman(a.lokasi)}</dd><dt>Total</dt><dd>${a.total}</dd><dt>Tersedia</dt><dd>${a.tersedia}</dd><dt>Sedang dipinjam</dt><dd>${Math.max(0, Number(a.total) - Number(a.tersedia))}</dd><dt>Kondisi</dt><dd>${aman(a.kondisi)}</dd><dt>Deskripsi</dt><dd>${aman(a.deskripsi)}</dd></dl></div><div class="detail-qr"><img src="/api/alat/${a.id}/qr" alt="QR Code ${aman(a.nama)}"><div class="teks-kecil">Scan untuk membuka detail alat</div></div></div><div class="detail-riwayat"><h3>Riwayat terbaru</h3><div class="detail-riwayat-list">${riwayatHtml}</div></div>`;
  dialogDetail.showModal();
}

document.getElementById("isi-inventaris").addEventListener("click", async function (e) {
  const detail = e.target.closest("[data-detail]");
  if (detail) return bukaDetailAlat(detail.dataset.detail);
  const edit = e.target.closest("[data-edit-alat]");
  if (edit) return bukaFormAlat(Number(edit.dataset.editAlat));
  const hapus = e.target.closest("[data-hapus-alat]");
  if (hapus) {
    const a = cariAlat(Number(hapus.dataset.hapusAlat));
    if (!a || !confirm(`Nonaktifkan ${a.nama} dari inventaris? Riwayat tetap disimpan.`)) return;
    try { await kirimAPI("/api/admin/alat/" + a.id, { method: "DELETE" }); renderSemua(); }
    catch (error) { alert(error.message); }
  }
});

document.getElementById("tutup-detail").addEventListener("click", function () { dialogDetail.close(); });
dialogDetail.addEventListener("click", function (e) { if (e.target === dialogDetail) dialogDetail.close(); });

function isiPilihanAlat() {
  const pilih = document.getElementById("input-alat");
  const pilihanLama = pilih.value;
  let html = '<option value="">Pilih alat...</option>';
  alatAktif().forEach(function (a) { const nonaktif = Number(a.tersedia) === 0 ? "disabled" : ""; html += `<option value="${a.id}" ${nonaktif}>${aman(a.nama)} (stok: ${a.tersedia})</option>`; });
  pilih.innerHTML = html;
  if (pilihanLama && cariAlat(Number(pilihanLama))) pilih.value = pilihanLama;
}

function isiFilterRiwayatAlat() {
  const pilih = document.getElementById("filter-riwayat-alat");
  const lama = pilih.value;
  pilih.innerHTML = '<option value="">Semua alat</option>' + daftarAlat.map(function (a) { return `<option value="${a.id}">${aman(a.nama)}</option>`; }).join("");
  pilih.value = lama;
}

function teksKtm(p) { if (p.status === "Dikembalikan") return "Dihapus"; return p.ktmTersimpan ? "Tersimpan (privat)" : "Tidak ada"; }

function tampilkanPeminjaman() {
  const aktif = urutkanTerbaru(daftarPeminjaman).filter(function (p) { return p.status === "Dipinjam"; });
  let html = "";
  aktif.forEach(function (p) {
    const alat = cariAlat(p.alatId);
    html += `<tr><td>${aman(p.kodeTransaksi || "-")}</td><td>${aman(p.namaPeminjam)}</td><td>${aman(p.nim)}</td><td>${alat ? aman(alat.nama) : "-"}</td><td class="angka">${p.jumlah}</td><td>${formatTanggal(p.tanggalPinjam)}</td><td>${formatTanggal(p.deadlinePengembalian)}</td><td>${aman(p.keperluan)}</td><td>${aman(teksKtm(p))}</td><td>${labelStatusPinjaman(p)}</td><td><button class="tombol tombol-garis tombol-kecil" data-kembali="${p.id}">Kembalikan</button></td></tr>`;
  });
  if (!html) html = '<tr><td colspan="11" class="kosong">Tidak ada peminjaman aktif.</td></tr>';
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
  if (!nama || !nim || !alatId || !tanggal || !deadline || !keperluan || !foto) return tampilkanPesan("Semua kolom termasuk deadline dan foto KTM wajib diisi.", false);
  if (!/^\d+$/.test(nim)) return tampilkanPesan("NIM hanya boleh berisi angka.", false);
  if (!Number.isInteger(jumlah) || jumlah < 1) return tampilkanPesan("Jumlah harus berupa angka bulat minimal 1.", false);
  if (deadline < tanggal) return tampilkanPesan("Deadline tidak boleh sebelum tanggal peminjaman.", false);
  if (!["image/jpeg", "image/png"].includes(foto.type)) return tampilkanPesan("Foto KTM harus JPG, JPEG, atau PNG.", false);
  if (foto.size > 5 * 1024 * 1024) return tampilkanPesan("Ukuran foto KTM maksimal 5 MB.", false);
  const dataForm = new FormData();
  dataForm.append("namaPeminjam", nama); dataForm.append("nim", nim); dataForm.append("alatId", String(alatId)); dataForm.append("jumlah", String(jumlah)); dataForm.append("tanggalPinjam", tanggal); dataForm.append("deadlinePengembalian", deadline); dataForm.append("keperluan", keperluan); dataForm.append("fotoKtm", foto);
  try {
    await kirimAPI("/api/peminjaman", { method: "POST", body: dataForm });
    this.reset(); document.getElementById("input-tanggal").value = hariIni(); document.getElementById("input-jumlah").value = "1"; aturBatasDeadline(); renderSemua(); tampilkanPesan("Peminjaman berhasil dicatat.", true);
  } catch (error) { tampilkanPesan(error.message, false); }
});

const dialogKembali = document.getElementById("dialog-kembali");
document.getElementById("isi-peminjaman").addEventListener("click", function (e) {
  const tombol = e.target.closest("[data-kembali]");
  if (!tombol) return;
  document.getElementById("kembali-id").value = tombol.dataset.kembali;
  document.getElementById("kembali-kondisi").value = "Baik";
  document.getElementById("kembali-catatan").value = "";
  dialogKembali.showModal();
});

document.getElementById("batal-kembali").addEventListener("click", function () { dialogKembali.close(); });
document.getElementById("form-kembali").addEventListener("submit", async function (e) {
  e.preventDefault();
  const id = document.getElementById("kembali-id").value;
  const kondisi = document.getElementById("kembali-kondisi").value;
  const catatan = document.getElementById("kembali-catatan").value.trim();
  try {
    await kirimAPI("/api/peminjaman/" + id + "/kembali", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kondisiPengembalian: kondisi, catatanPengembalian: catatan }) });
    dialogKembali.close(); renderSemua(); tampilkanPesan("Pengembalian berhasil. Kondisi alat tersimpan dan foto KTM telah dihapus.", true);
  } catch (error) { tampilkanPesan(error.message, false); }
});

function tampilkanRiwayat() {
  const kata = document.getElementById("filter-riwayat-nim").value.trim().toLowerCase();
  const alatId = document.getElementById("filter-riwayat-alat").value;
  const filterStatus = document.getElementById("filter-riwayat-status").value;
  const selesai = urutkanTerbaru(daftarPeminjaman).filter(function (p) {
    if (p.status !== "Dikembalikan") return false;
    const cocokKata = !kata || String(p.namaPeminjam).toLowerCase().includes(kata) || String(p.nim).toLowerCase().includes(kata) || String(p.kodeTransaksi || "").toLowerCase().includes(kata);
    const cocokAlat = !alatId || Number(p.alatId) === Number(alatId);
    const terlambat = infoStatus(p).terlambatHari > 0;
    const cocokStatus = !filterStatus || (filterStatus === "terlambat" ? terlambat : !terlambat);
    return cocokKata && cocokAlat && cocokStatus;
  });
  let html = "";
  selesai.forEach(function (p) {
    const alat = cariAlat(p.alatId);
    html += `<tr><td>${aman(p.kodeTransaksi || "-")}</td><td>${aman(p.namaPeminjam)}</td><td>${aman(p.nim)}</td><td>${alat ? aman(alat.nama) : "-"}</td><td class="angka">${p.jumlah}</td><td>${formatTanggal(p.tanggalPinjam)}</td><td>${formatTanggal(p.deadlinePengembalian)}</td><td>${formatTanggal(p.tanggalKembali)}</td><td>${aman(p.kondisiPengembalian || "-")}</td><td>${labelStatusPinjaman(p)}</td></tr>`;
  });
  if (!html) html = '<tr><td colspan="10" class="kosong">Tidak ada riwayat yang cocok.</td></tr>';
  document.getElementById("isi-riwayat").innerHTML = html;
}

["filter-riwayat-nim", "filter-riwayat-alat", "filter-riwayat-status"].forEach(function (id) { document.getElementById(id).addEventListener(id === "filter-riwayat-nim" ? "input" : "change", tampilkanRiwayat); });

function renderAdmin() {
  const belum = document.getElementById("admin-belum-konfigurasi");
  const form = document.getElementById("form-admin-login");
  const sudah = document.getElementById("admin-sudah-login");
  belum.hidden = statusAdmin.configured;
  form.hidden = !statusAdmin.configured || statusAdmin.loggedIn;
  sudah.hidden = !statusAdmin.loggedIn;
  document.querySelectorAll(".admin-only").forEach(function (el) { el.hidden = !statusAdmin.loggedIn; });
}

function pesanAdmin(teks, berhasil) {
  const target = document.getElementById("pesan-admin");
  target.textContent = teks;
  target.className = "pesan " + (berhasil ? "pesan-ok" : "pesan-error");
}

document.getElementById("form-admin-login").addEventListener("submit", async function (e) {
  e.preventDefault();
  const username = document.getElementById("admin-username").value;
  const password = document.getElementById("admin-password").value;
  try { await kirimAPI("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) }); await ambilStatusAdmin(); this.reset(); renderSemua(); pesanAdmin("Login admin berhasil.", true); }
  catch (error) { pesanAdmin(error.message, false); }
});

document.getElementById("admin-logout").addEventListener("click", async function () {
  try { await kirimAPI("/api/admin/logout", { method: "POST" }); await ambilStatusAdmin(); renderSemua(); pesanAdmin("Logout berhasil.", true); }
  catch (error) { pesanAdmin(error.message, false); }
});

const dialogAlat = document.getElementById("dialog-alat");
function bukaFormAlat(id) {
  if (!statusAdmin.loggedIn) return;
  const a = id ? cariAlat(id) : null;
  document.getElementById("judul-form-alat").textContent = a ? "Edit alat" : "Tambah alat";
  document.getElementById("alat-id-edit").value = a ? a.id : "";
  document.getElementById("alat-nama").value = a ? a.nama : "";
  document.getElementById("alat-kategori").value = a ? a.kategori : "";
  document.getElementById("alat-total").value = a ? a.total : "";
  document.getElementById("alat-kondisi").value = a ? a.kondisi : "Baik";
  document.getElementById("alat-lokasi").value = a ? a.lokasi : "";
  document.getElementById("alat-deskripsi").value = a ? a.deskripsi : "";
  dialogAlat.showModal();
}

document.getElementById("tambah-alat").addEventListener("click", function () { bukaFormAlat(null); });
document.getElementById("batal-alat").addEventListener("click", function () { dialogAlat.close(); });
document.getElementById("form-alat").addEventListener("submit", async function (e) {
  e.preventDefault();
  const id = document.getElementById("alat-id-edit").value;
  const data = { nama: document.getElementById("alat-nama").value.trim(), kategori: document.getElementById("alat-kategori").value.trim(), total: Number(document.getElementById("alat-total").value), kondisi: document.getElementById("alat-kondisi").value, lokasi: document.getElementById("alat-lokasi").value.trim(), deskripsi: document.getElementById("alat-deskripsi").value.trim() };
  try { await kirimAPI(id ? "/api/admin/alat/" + id : "/api/admin/alat", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); dialogAlat.close(); renderSemua(); }
  catch (error) { alert(error.message); }
});

function renderSemua() {
  tampilkanDashboard(); tampilkanInventaris(); isiPilihanAlat(); isiFilterRiwayatAlat(); tampilkanPeminjaman(); tampilkanRiwayat(); renderAdmin();
}

async function mulaiWebsite() {
  try {
    await Promise.all([ambilData(), ambilStatusAdmin()]);
    document.getElementById("input-tanggal").value = hariIni();
    aturBatasDeadline();
    tampilkanHalaman("dashboard");
    renderSemua();
    const alatDariQr = Number(new URLSearchParams(window.location.search).get("alat"));
    if (alatDariQr && cariAlat(alatDariQr)) {
      const home = document.getElementById("home-screen");
      home?.classList.add("keluar"); home?.setAttribute("aria-hidden", "true"); document.body.classList.remove("home-terbuka"); tampilkanHalaman("inventaris"); window.setTimeout(function () { bukaDetailAlat(alatDariQr); }, 80);
    }
  } catch (error) {
    tampilkanHalaman("dashboard");
    document.getElementById("isi-dashboard").innerHTML = `<tr><td colspan="7" class="kosong">${aman(error.message)}</td></tr>`;
  }
}

window.addEventListener("resize", function () { if (document.getElementById("dashboard").classList.contains("aktif")) gambarGrafikPeminjaman(); });
mulaiWebsite();
