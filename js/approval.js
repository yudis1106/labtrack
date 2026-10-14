// LabTrack - alur persetujuan peminjaman
(function () {
  const formPinjam = document.getElementById("form-pinjam");
  const tabelPeminjaman = document.getElementById("isi-peminjaman");
  if (!formPinjam || !tabelPeminjaman) return;

  const subjudul = document.querySelector("#peminjaman .subjudul");
  if (subjudul) subjudul.textContent = "Ajukan peminjaman, tunggu persetujuan admin, lalu alat dapat dipinjam.";

  const tombolSubmit = formPinjam.querySelector('button[type="submit"]');
  if (tombolSubmit) tombolSubmit.textContent = "Ajukan Peminjaman";

  if (!document.getElementById("alur-persetujuan")) {
    const info = document.createElement("div");
    info.id = "alur-persetujuan";
    info.className = "info-box";
    info.innerHTML = "<strong>Alur peminjaman:</strong> Diajukan → Disetujui → Dipinjam → Dikembalikan. Persetujuan dan penyerahan alat dilakukan oleh admin.";
    formPinjam.parentNode.insertBefore(info, formPinjam);
  }

  labelStatusPinjaman = function (p) {
    const info = infoStatus(p);
    let warna = "label-abu";
    if (info.status === "Diajukan") warna = "label-kuning";
    else if (info.status === "Disetujui") warna = "label-biru";
    else if (info.status === "Dipinjam") warna = "label-biru";
    else if (info.status === "Terlambat") warna = "label-merah";
    else if (info.status === "Dikembalikan") warna = "label-hijau";
    else if (info.status === "Ditolak") warna = "label-merah";

    let teks = info.status;
    if (info.status === "Terlambat" && info.terlambatHari > 0) teks += " (" + info.terlambatHari + " hari)";
    else if (info.status === "Dikembalikan" && info.terlambatHari > 0) teks += " - terlambat " + info.terlambatHari + " hari";
    return '<span class="label ' + warna + '">' + aman(teks) + "</span>";
  };

  teksKtm = function (p) {
    if (p.status === "Dikembalikan" || p.status === "Ditolak") return "Dihapus";
    return p.ktmTersimpan ? "Tersimpan (privat)" : "Tidak ada";
  };

  dataEnamBulan = function () {
    const sekarang = new Date();
    const bulan = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
      bulan.push({ tahun: d.getFullYear(), bulan: d.getMonth(), label: namaBulan[d.getMonth()], jumlah: 0 });
    }
    daftarPeminjaman.forEach(function (p) {
      if (!p.tanggalPinjam || !["Dipinjam", "Dikembalikan"].includes(p.status)) return;
      const bagian = p.tanggalPinjam.split("-").map(Number);
      bulan.forEach(function (b) {
        if (bagian[0] === b.tahun && bagian[1] - 1 === b.bulan) b.jumlah++;
      });
    });
    return bulan;
  };

  tampilkanAlatPopuler = function () {
    const jumlah = new Map();
    daftarPeminjaman.forEach(function (p) {
      if (!["Dipinjam", "Dikembalikan"].includes(p.status)) return;
      jumlah.set(Number(p.alatId), (jumlah.get(Number(p.alatId)) || 0) + Number(p.jumlah || 0));
    });
    const daftar = Array.from(jumlah.entries())
      .map(function ([id, total]) { return { alat: cariAlat(id), total: total }; })
      .filter(function (x) { return x.alat; })
      .sort(function (a, b) { return b.total - a.total; })
      .slice(0, 5);
    document.getElementById("alat-populer").innerHTML = daftar.length
      ? daftar.map(function (x) { return `<div class="populer-item"><span class="populer-nama">${aman(x.alat.nama)}</span><span class="populer-jumlah">${x.total} unit</span></div>`; }).join("")
      : '<div class="kosong">Belum ada data.</div>';
  };

  tampilkanPeminjaman = function () {
    const aktif = urutkanTerbaru(daftarPeminjaman).filter(function (p) {
      return ["Diajukan", "Disetujui", "Dipinjam"].includes(p.status);
    });

    let html = "";
    aktif.forEach(function (p) {
      const alat = cariAlat(p.alatId);
      let aksi = '<span class="teks-kecil">-</span>';

      if (statusAdmin.loggedIn) {
        if (p.status === "Diajukan") {
          aksi = `<div class="aksi-baris"><button class="tombol tombol-kecil" data-setujui="${p.id}">Setujui</button><button class="tombol tombol-bahaya tombol-kecil" data-tolak="${p.id}">Tolak</button></div>`;
        } else if (p.status === "Disetujui") {
          aksi = `<div class="aksi-baris"><button class="tombol tombol-kecil" data-mulai="${p.id}">Serahkan Alat</button><button class="tombol tombol-bahaya tombol-kecil" data-tolak="${p.id}">Batalkan</button></div>`;
        } else if (p.status === "Dipinjam") {
          aksi = `<button class="tombol tombol-garis tombol-kecil" data-kembali="${p.id}">Kembalikan</button>`;
        }
      } else if (p.status === "Diajukan") {
        aksi = '<span class="teks-kecil">Menunggu admin</span>';
      } else if (p.status === "Disetujui") {
        aksi = '<span class="teks-kecil">Menunggu penyerahan</span>';
      }

      html += `<tr><td>${aman(p.kodeTransaksi || "-")}</td><td>${aman(p.namaPeminjam)}</td><td>${aman(p.nim)}</td><td>${alat ? aman(alat.nama) : "-"}</td><td class="angka">${p.jumlah}</td><td>${formatTanggal(p.tanggalPinjam)}</td><td>${formatTanggal(p.deadlinePengembalian)}</td><td>${aman(p.keperluan)}</td><td>${aman(teksKtm(p))}</td><td>${labelStatusPinjaman(p)}</td><td>${aksi}</td></tr>`;
    });

    if (!html) html = '<tr><td colspan="11" class="kosong">Tidak ada pengajuan atau peminjaman aktif.</td></tr>';
    document.getElementById("isi-peminjaman").innerHTML = html;
  };

  async function prosesStatus(url, pesanBerhasil) {
    try {
      await kirimAPI(url, { method: "POST" });
      renderSemua();
      tampilkanPesan(pesanBerhasil, true);
    } catch (error) {
      tampilkanPesan(error.message, false);
    }
  }

  tabelPeminjaman.addEventListener("click", function (event) {
    const setujui = event.target.closest("[data-setujui]");
    const mulai = event.target.closest("[data-mulai]");
    const tolak = event.target.closest("[data-tolak]");
    if (!setujui && !mulai && !tolak) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (setujui) {
      prosesStatus("/api/peminjaman/" + setujui.dataset.setujui + "/setujui", "Pengajuan disetujui. Stok telah direservasi.");
      return;
    }

    if (mulai) {
      prosesStatus("/api/peminjaman/" + mulai.dataset.mulai + "/mulai", "Alat telah diserahkan kepada peminjam.");
      return;
    }

    if (tolak && confirm("Tolak/batalkan pengajuan ini? Foto KTM akan dihapus.")) {
      prosesStatus("/api/peminjaman/" + tolak.dataset.tolak + "/tolak", "Pengajuan berhasil ditolak/dibatalkan.");
    }
  }, true);

  document.addEventListener("submit", async function (event) {
    if (event.target !== formPinjam) return;
    event.preventDefault();
    event.stopImmediatePropagation();

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
    dataForm.append("namaPeminjam", nama);
    dataForm.append("nim", nim);
    dataForm.append("alatId", String(alatId));
    dataForm.append("jumlah", String(jumlah));
    dataForm.append("tanggalPinjam", tanggal);
    dataForm.append("deadlinePengembalian", deadline);
    dataForm.append("keperluan", keperluan);
    dataForm.append("fotoKtm", foto);

    try {
      await kirimAPI("/api/peminjaman", { method: "POST", body: dataForm });
      formPinjam.reset();
      document.getElementById("input-tanggal").value = hariIni();
      document.getElementById("input-jumlah").value = "1";
      aturBatasDeadline();
      renderSemua();
      tampilkanPesan("Pengajuan berhasil dikirim. Menunggu persetujuan admin.", true);
    } catch (error) {
      tampilkanPesan(error.message, false);
    }
  }, true);

  renderSemua();
})();
