// LabTrack - tampilan berbeda untuk Mahasiswa dan Admin.
(function () {
  let akun = null;
  let dataRole = { alat: [], peminjaman: [] };
  let sedangMenerapkan = false;

  function aman(teks) {
    const div = document.createElement("div");
    div.textContent = teks ?? "";
    return div.innerHTML;
  }

  function namaAlat(id) {
    const alat = dataRole.alat.find((item) => Number(item.id) === Number(id));
    return alat?.nama || "Alat";
  }

  function formatTanggal(nilai) {
    if (!nilai) return "-";
    const d = new Date(`${nilai}T00:00:00`);
    if (Number.isNaN(d.getTime())) return nilai;
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d);
  }

  function statusBadge(status) {
    const kelas = String(status || "").toLowerCase().replace(/\s+/g, "-");
    return `<span class="status role-status ${aman(kelas)}">${aman(status || "-")}</span>`;
  }

  async function jsonFetch(url, opsi) {
    const respons = await fetch(url, opsi);
    const hasil = await respons.json();
    if (!respons.ok || hasil.berhasil === false) throw new Error(hasil.pesan || "Permintaan gagal.");
    return hasil;
  }

  function buatMenuProfil() {
    if (document.querySelector('.menu-tombol[data-target="profil"]')) return;
    const menu = document.querySelector(".menu");
    const konten = document.querySelector(".konten");
    if (!menu || !konten) return;

    const tombol = document.createElement("button");
    tombol.className = "menu-tombol role-profile-menu";
    tombol.dataset.target = "profil";
    tombol.textContent = "Profil";
    tombol.addEventListener("click", function () {
      if (typeof window.tampilkanHalaman === "function") window.tampilkanHalaman("profil");
      else {
        document.querySelectorAll(".halaman").forEach((el) => el.classList.remove("aktif"));
        document.getElementById("profil")?.classList.add("aktif");
      }
    });
    menu.appendChild(tombol);

    const section = document.createElement("section");
    section.id = "profil";
    section.className = "halaman role-profile-page";
    section.innerHTML = `
      <div class="judul-baris role-profile-heading">
        <div>
          <h2>Profil Mahasiswa</h2>
          <p class="subjudul">Kelola data akun dan keamanan password.</p>
        </div>
      </div>
      <div class="role-profile-layout">
        <aside class="role-profile-summary">
          <div class="role-profile-avatar" aria-hidden="true">M</div>
          <strong id="role-profile-summary-name">Mahasiswa</strong>
          <span id="role-profile-summary-nim">-</span>
          <span class="role-chip">Mahasiswa</span>
        </aside>
        <form id="role-profile-form" class="form-kartu role-profile-form" novalidate>
          <div class="form-grid">
            <label>Nama lengkap<input id="role-profile-nama" type="text" autocomplete="name" required></label>
            <label>NIM<input id="role-profile-nim" type="text" readonly></label>
            <label class="penuh">Email<input id="role-profile-email" type="email" autocomplete="email" required></label>
          </div>
          <div class="role-profile-divider"><span>Ganti password</span><small>Kosongkan jika tidak ingin mengganti password</small></div>
          <div class="form-grid">
            <label>Password lama<input id="role-password-lama" type="password" autocomplete="current-password"></label>
            <label>Password baru<input id="role-password-baru" type="password" autocomplete="new-password" minlength="6"></label>
            <label class="penuh">Konfirmasi password baru<input id="role-password-konfirmasi" type="password" autocomplete="new-password" minlength="6"></label>
          </div>
          <div class="role-profile-actions">
            <button type="submit" class="tombol">Simpan Perubahan</button>
          </div>
          <p id="role-profile-message" class="pesan" role="status"></p>
        </form>
      </div>`;
    konten.appendChild(section);

    section.querySelector("#role-profile-form").addEventListener("submit", simpanProfil);
  }

  function isiProfil() {
    if (!akun || akun.role !== "mahasiswa") return;
    const nama = document.getElementById("role-profile-nama");
    const nim = document.getElementById("role-profile-nim");
    const email = document.getElementById("role-profile-email");
    if (!nama || !nim || !email) return;
    nama.value = akun.nama || "";
    nim.value = akun.nim || "";
    email.value = akun.email || "";
    document.getElementById("role-profile-summary-name").textContent = akun.nama || "Mahasiswa";
    document.getElementById("role-profile-summary-nim").textContent = akun.nim || "-";
  }

  async function simpanProfil(event) {
    event.preventDefault();
    const pesan = document.getElementById("role-profile-message");
    pesan.textContent = "Menyimpan perubahan...";
    pesan.className = "pesan berhasil";
    try {
      const hasil = await jsonFetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: document.getElementById("role-profile-nama").value.trim(),
          email: document.getElementById("role-profile-email").value.trim(),
          passwordLama: document.getElementById("role-password-lama").value,
          passwordBaru: document.getElementById("role-password-baru").value,
          konfirmasiPassword: document.getElementById("role-password-konfirmasi").value,
        }),
      });
      akun = { ...akun, ...(hasil.akun || {}) };
      isiProfil();
      ["role-password-lama", "role-password-baru", "role-password-konfirmasi"].forEach((id) => {
        document.getElementById(id).value = "";
      });
      pesan.textContent = hasil.pesan || "Profil berhasil diperbarui.";
      pesan.className = "pesan berhasil";
    } catch (error) {
      pesan.textContent = error.message;
      pesan.className = "pesan gagal";
    }
  }

  function dashboardMahasiswa() {
    document.body.classList.add("mode-mahasiswa");
    document.body.classList.remove("mode-admin");

    const judul = document.querySelector("#dashboard .judul-baris h2");
    const sub = document.querySelector("#dashboard .judul-baris .subjudul");
    if (judul) judul.textContent = `Halo, ${akun.nama?.split(" ")[0] || "Mahasiswa"}`;
    if (sub) sub.textContent = "Pantau pengajuan, alat yang sedang dipinjam, dan deadline milikmu.";

    const transaksi = dataRole.peminjaman || [];
    const hitung = (status) => transaksi.filter((item) => item.status === status).length;
    const cards = [
      ["kartu-total", hitung("Diajukan"), "Pengajuan"],
      ["kartu-tersedia", hitung("Disetujui"), "Disetujui"],
      ["kartu-dipinjam", hitung("Dipinjam"), "Sedang dipinjam"],
      ["kartu-periksa", hitung("Dikembalikan"), "Selesai"],
      ["kartu-terlambat", 0, "Terlambat"],
    ];

    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);
    let terlambat = 0;
    transaksi.forEach((item) => {
      if (item.status === "Dipinjam" && item.deadlinePengembalian) {
        const d = new Date(`${item.deadlinePengembalian}T00:00:00`);
        if (d < hariIni) terlambat += 1;
      }
    });
    cards[4][1] = terlambat;

    cards.forEach(([id, angka, label]) => {
      const angkaEl = document.getElementById(id);
      const kartu = angkaEl?.closest(".kartu-ringkas");
      if (angkaEl) angkaEl.textContent = angka;
      const labelEl = kartu?.querySelector(".kartu-label");
      if (labelEl) labelEl.textContent = label;
    });

    const deadline = document.getElementById("peringatan-deadline");
    if (deadline) {
      const aktif = transaksi
        .filter((item) => ["Disetujui", "Dipinjam"].includes(item.status) && item.deadlinePengembalian)
        .sort((a, b) => String(a.deadlinePengembalian).localeCompare(String(b.deadlinePengembalian)))
        .slice(0, 4);
      deadline.innerHTML = aktif.length
        ? `<div class="role-section-title"><div><h3>Deadline saya</h3><p>Prioritas pengembalian terdekat.</p></div></div>` + aktif.map((item) => {
            const d = new Date(`${item.deadlinePengembalian}T00:00:00`);
            const sisa = Math.ceil((d - hariIni) / 86400000);
            const teks = sisa < 0 ? `Terlambat ${Math.abs(sisa)} hari` : sisa === 0 ? "Hari ini" : `${sisa} hari lagi`;
            return `<div class="role-deadline-row ${sisa < 0 ? "late" : ""}"><div><strong>${aman(namaAlat(item.alatId))}</strong><span>${aman(item.kodeTransaksi)}</span></div><div><span>${formatTanggal(item.deadlinePengembalian)}</span><strong>${teks}</strong></div></div>`;
          }).join("")
        : `<div class="role-empty"><strong>Tidak ada deadline aktif</strong><span>Kamu belum memiliki alat yang perlu dikembalikan.</span></div>`;
    }

    let panel = document.getElementById("role-student-loans");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "role-student-loans";
      panel.className = "panel-dashboard role-student-loans";
      const target = document.querySelector("#dashboard .dashboard-dua-kolom");
      target?.before(panel);
    }
    const terbaru = [...transaksi].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 5);
    panel.innerHTML = `<div class="role-section-title"><div><h3>Aktivitas peminjaman saya</h3><p>Status terbaru dari pengajuan sampai pengembalian.</p></div><button type="button" class="role-link-button" id="role-go-history">Lihat riwayat</button></div>
      <div class="role-loan-list">${terbaru.length ? terbaru.map((item) => `<article class="role-loan-item"><div class="role-loan-icon">${aman((namaAlat(item.alatId)[0] || "A").toUpperCase())}</div><div class="role-loan-main"><strong>${aman(namaAlat(item.alatId))}</strong><span>${aman(item.kodeTransaksi)} • ${item.jumlah} unit</span></div><div class="role-loan-meta">${statusBadge(item.status)}<small>${formatTanggal(item.tanggalPinjam)}</small></div></article>`).join("") : `<div class="role-empty"><strong>Belum ada transaksi</strong><span>Ajukan peminjaman alat untuk mulai menggunakan LabTrack.</span></div>`}</div>`;
    panel.querySelector("#role-go-history")?.addEventListener("click", () => window.tampilkanHalaman?.("riwayat"));
  }

  function riwayatMahasiswa() {
    const judul = document.querySelector("#riwayat h2");
    const sub = document.querySelector("#riwayat .subjudul");
    if (judul) judul.textContent = "Riwayat Saya";
    if (sub) sub.textContent = "Hanya menampilkan transaksi yang terhubung dengan akun mahasiswa ini.";

    const toolbar = document.querySelector("#riwayat .toolbar-riwayat");
    if (toolbar) toolbar.hidden = true;

    const tbody = document.getElementById("isi-riwayat");
    if (!tbody) return;
    const rows = [...(dataRole.peminjaman || [])].sort((a, b) => Number(b.id) - Number(a.id));
    tbody.innerHTML = rows.length ? rows.map((item) => `<tr>
      <td>${aman(item.kodeTransaksi)}</td><td>${aman(item.namaPeminjam)}</td><td>${aman(item.nim)}</td>
      <td>${aman(namaAlat(item.alatId))}</td><td class="angka">${Number(item.jumlah) || 0}</td>
      <td>${formatTanggal(item.tanggalPinjam)}</td><td>${formatTanggal(item.deadlinePengembalian)}</td>
      <td>${formatTanggal(item.tanggalKembali)}</td><td>${aman(item.kondisiPengembalian || "-")}</td><td>${statusBadge(item.status)}</td>
    </tr>`).join("") : `<tr><td colspan="10" class="role-table-empty">Belum ada riwayat peminjaman.</td></tr>`;
  }

  function dashboardAdmin() {
    document.body.classList.add("mode-admin");
    document.body.classList.remove("mode-mahasiswa");
    document.querySelector("#riwayat .toolbar-riwayat")?.removeAttribute("hidden");

    let panel = document.getElementById("role-admin-insights");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "role-admin-insights";
      panel.className = "role-admin-insights";
      const deadline = document.getElementById("peringatan-deadline");
      deadline?.after(panel);
    }

    const transaksi = dataRole.peminjaman || [];
    const sekarang = new Date();
    const prefix = `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, "0")}`;
    const bulanIni = transaksi.filter((x) => String(x.tanggalPinjam || "").startsWith(prefix) && x.status !== "Ditolak").length;
    const menunggu = transaksi.filter((x) => x.status === "Diajukan").length;
    const aktif = transaksi.filter((x) => x.status === "Dipinjam").length;
    const terlambat = transaksi.filter((x) => x.status === "Dipinjam" && x.deadlinePengembalian && new Date(`${x.deadlinePengembalian}T00:00:00`) < sekarang).length;

    const frekuensi = {};
    transaksi.filter((x) => ["Dipinjam", "Dikembalikan"].includes(x.status)).forEach((x) => {
      frekuensi[x.nim] = (frekuensi[x.nim] || 0) + 1;
    });
    const nimAktif = Object.entries(frekuensi).sort((a, b) => b[1] - a[1])[0];
    const mahasiswaAktif = nimAktif ? transaksi.find((x) => x.nim === nimAktif[0])?.namaPeminjam : "Belum ada";

    panel.innerHTML = `<div class="role-section-title"><div><h3>Ringkasan admin</h3><p>Angka operasional yang perlu diperhatikan hari ini.</p></div></div>
      <div class="role-admin-grid">
        <article><span>Menunggu persetujuan</span><strong>${menunggu}</strong><small>pengajuan</small></article>
        <article><span>Peminjaman aktif</span><strong>${aktif}</strong><small>transaksi</small></article>
        <article class="${terlambat ? "danger" : ""}"><span>Terlambat</span><strong>${terlambat}</strong><small>transaksi</small></article>
        <article><span>Bulan ini</span><strong>${bulanIni}</strong><small>transaksi</small></article>
      </div>
      <div class="role-admin-highlight"><span>Mahasiswa paling aktif</span><strong>${aman(mahasiswaAktif || "Belum ada")}</strong><small>${nimAktif ? `${nimAktif[1]} transaksi tercatat` : "Belum ada data"}</small></div>`;
  }

  async function muatRole() {
    if (sedangMenerapkan) return;
    sedangMenerapkan = true;
    try {
      akun = await jsonFetch("/api/auth/status", { method: "GET" });
      if (!akun.authenticated) return;
      dataRole = await jsonFetch("/api/auth/data", { method: "GET" });

      if (akun.role === "mahasiswa") {
        buatMenuProfil();
        isiProfil();
        dashboardMahasiswa();
        riwayatMahasiswa();
      } else if (akun.role === "admin") {
        dashboardAdmin();
      }
    } catch (error) {
      console.warn("Fitur role LabTrack gagal dimuat:", error);
    } finally {
      sedangMenerapkan = false;
    }
  }

  function jadwalkanMuatUlang() {
    window.clearTimeout(jadwalkanMuatUlang.timer);
    jadwalkanMuatUlang.timer = window.setTimeout(muatRole, 180);
  }

  window.addEventListener("DOMContentLoaded", function () {
    muatRole();

    // Setelah fungsi render utama tersedia, bungkus agar tampilan khusus role
    // diterapkan kembali setelah data berubah (misalnya selesai meminjam).
    window.setTimeout(function () {
      if (typeof window.renderSemua === "function" && !window.renderSemua.__roleWrapped) {
        const asli = window.renderSemua;
        const bungkus = function () {
          const hasil = asli.apply(this, arguments);
          jadwalkanMuatUlang();
          return hasil;
        };
        bungkus.__roleWrapped = true;
        window.renderSemua = bungkus;
      }
    }, 0);
  });
})();
