// LabTrack - autentikasi Mahasiswa dan Admin pada homepage.
(function () {
  const home = document.getElementById("home-screen");
  const homeCenter = document.querySelector(".home-center");
  const tombolMasukDashboard = document.getElementById("home-enter");
  const formPinjam = document.getElementById("form-pinjam");
  const tombolMenuAdmin = document.querySelector('.menu-tombol[data-target="admin"]');
  const sidebar = document.getElementById("sidebar-menu");

  if (!home || !homeCenter || !tombolMasukDashboard) return;

  // QR alat disimpan sementara agar tidak melewati halaman login.
  const urlAwal = new URL(window.location.href);
  const alatQr = urlAwal.searchParams.get("alat");
  if (alatQr) {
    sessionStorage.setItem("labtrack_qr_alat", alatQr);
    urlAwal.searchParams.delete("alat");
    history.replaceState({}, "", urlAwal.pathname + urlAwal.search + urlAwal.hash);
  }

  let akunAktif = null;
  tombolMasukDashboard.hidden = true;

  const panel = document.createElement("div");
  panel.className = "auth-panel";
  panel.innerHTML = `
    <div id="auth-guest">
      <div class="auth-tabs" role="tablist" aria-label="Autentikasi LabTrack">
        <button type="button" class="auth-tab aktif" data-auth-tab="login">Login</button>
        <button type="button" class="auth-tab" data-auth-tab="daftar">Daftar Mahasiswa</button>
      </div>

      <form id="auth-form-login" class="auth-form" novalidate>
        <label>NIM / Username Admin
          <input id="auth-login-identitas" type="text" autocomplete="username" required>
        </label>
        <label>Password
          <input id="auth-login-password" type="password" autocomplete="current-password" required>
        </label>
        <button type="submit" class="home-enter auth-submit">Login</button>
      </form>

      <form id="auth-form-daftar" class="auth-form" hidden novalidate>
        <label>Nama lengkap
          <input id="auth-daftar-nama" type="text" autocomplete="name" required>
        </label>
        <label>NIM
          <input id="auth-daftar-nim" type="text" inputmode="numeric" autocomplete="off" required>
        </label>
        <label>Email
          <input id="auth-daftar-email" type="email" autocomplete="email" required>
        </label>
        <label>Password
          <input id="auth-daftar-password" type="password" autocomplete="new-password" minlength="6" required>
        </label>
        <label>Konfirmasi password
          <input id="auth-daftar-konfirmasi" type="password" autocomplete="new-password" minlength="6" required>
        </label>
        <button type="submit" class="home-enter auth-submit">Daftar</button>
      </form>
      <p id="auth-pesan" class="auth-pesan" role="status"></p>
    </div>

    <div id="auth-sudah-login" class="auth-sudah-login" hidden>
      <span class="auth-role" id="auth-role"></span>
      <strong id="auth-nama"></strong>
      <span id="auth-identitas"></span>
    </div>
  `;

  homeCenter.insertBefore(panel, tombolMasukDashboard);

  const formLogin = document.getElementById("auth-form-login");
  const formDaftar = document.getElementById("auth-form-daftar");
  const pesan = document.getElementById("auth-pesan");
  const guest = document.getElementById("auth-guest");
  const sudahLogin = document.getElementById("auth-sudah-login");

  function pesanAuth(teks, berhasil) {
    pesan.textContent = teks || "";
    pesan.classList.toggle("berhasil", Boolean(berhasil));
    pesan.classList.toggle("gagal", Boolean(teks) && !berhasil);
  }

  async function bacaJson(respons) {
    const teks = await respons.text();
    try { return JSON.parse(teks); }
    catch { throw new Error("Respons server tidak valid."); }
  }

  async function panggilAuth(url, opsi) {
    const respons = await fetch(url, opsi);
    const hasil = await bacaJson(respons);
    if (!respons.ok || hasil.berhasil === false) throw new Error(hasil.pesan || "Autentikasi gagal.");
    return hasil;
  }

  function isiIdentitasPeminjam() {
    const nama = document.getElementById("input-nama");
    const nim = document.getElementById("input-nim");
    if (!nama || !nim) return;

    if (akunAktif?.role === "mahasiswa") {
      nama.value = akunAktif.nama || "";
      nim.value = akunAktif.nim || "";
      nama.readOnly = true;
      nim.readOnly = true;
      nama.title = "Diambil otomatis dari akun mahasiswa";
      nim.title = "Diambil otomatis dari akun mahasiswa";
    } else {
      nama.readOnly = false;
      nim.readOnly = false;
    }
  }

  function perbaruiSidebar() {
    if (!sidebar) return;
    let box = document.getElementById("auth-sidebar-account");
    if (!box) {
      box = document.createElement("div");
      box.id = "auth-sidebar-account";
      box.className = "auth-sidebar-account";
      sidebar.appendChild(box);
    }

    if (!akunAktif?.authenticated) {
      box.hidden = true;
      return;
    }

    box.hidden = false;
    const identitas = akunAktif.role === "mahasiswa" ? akunAktif.nim : "Administrator";
    box.innerHTML = `
      <div><strong>${amanAuth(akunAktif.nama || (akunAktif.role === "admin" ? "Admin" : "Mahasiswa"))}</strong><small>${amanAuth(identitas)}</small></div>
      <button type="button" id="auth-logout" class="tombol tombol-garis tombol-kecil">Logout</button>
    `;
    document.getElementById("auth-logout")?.addEventListener("click", logout);
  }

  function amanAuth(teks) {
    const el = document.createElement("div");
    el.textContent = teks ?? "";
    return el.innerHTML;
  }

  async function sinkronkanAdmin() {
    if (typeof ambilStatusAdmin === "function") {
      try { await ambilStatusAdmin(); } catch (_) {}
    }
    if (typeof renderSemua === "function") {
      try { renderSemua(); } catch (_) {}
    }
  }

  function terapkanAkun(data) {
    akunAktif = data && data.authenticated ? data : null;

    if (!akunAktif) {
      guest.hidden = false;
      sudahLogin.hidden = true;
      tombolMasukDashboard.hidden = true;
      if (tombolMenuAdmin) tombolMenuAdmin.hidden = true;
      perbaruiSidebar();
      isiIdentitasPeminjam();
      return;
    }

    guest.hidden = true;
    sudahLogin.hidden = false;
    tombolMasukDashboard.hidden = false;
    document.getElementById("auth-role").textContent = akunAktif.role === "admin" ? "ADMIN" : "MAHASISWA";
    document.getElementById("auth-nama").textContent = akunAktif.nama || (akunAktif.role === "admin" ? "Admin" : "Mahasiswa");
    document.getElementById("auth-identitas").textContent = akunAktif.role === "mahasiswa" ? "NIM " + akunAktif.nim : "Akses pengelola LabTrack";

    if (tombolMenuAdmin) tombolMenuAdmin.hidden = akunAktif.role !== "admin";
    isiIdentitasPeminjam();
    perbaruiSidebar();
    sinkronkanAdmin();
  }

  document.querySelectorAll("[data-auth-tab]").forEach(function (tombol) {
    tombol.addEventListener("click", function () {
      const tujuan = tombol.dataset.authTab;
      document.querySelectorAll("[data-auth-tab]").forEach(function (x) {
        x.classList.toggle("aktif", x === tombol);
      });
      formLogin.hidden = tujuan !== "login";
      formDaftar.hidden = tujuan !== "daftar";
      pesanAuth("", false);
    });
  });

  formLogin.addEventListener("submit", async function (event) {
    event.preventDefault();
    const identitas = document.getElementById("auth-login-identitas").value.trim();
    const password = document.getElementById("auth-login-password").value;
    if (!identitas || !password) return pesanAuth("NIM/username dan password wajib diisi.", false);

    pesanAuth("Memeriksa akun...", true);
    try {
      const hasil = await panggilAuth("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identitas: identitas, password: password }),
      });
      const status = await panggilAuth("/api/auth/status", { method: "GET" });
      terapkanAkun(status);
      pesanAuth(hasil.pesan || "Login berhasil.", true);
      tombolMasukDashboard.click();
      bukaAlatDariQrSetelahLogin();
    } catch (error) {
      pesanAuth(error.message, false);
    }
  });

  formDaftar.addEventListener("submit", async function (event) {
    event.preventDefault();
    const nama = document.getElementById("auth-daftar-nama").value.trim();
    const nim = document.getElementById("auth-daftar-nim").value.trim();
    const email = document.getElementById("auth-daftar-email").value.trim();
    const password = document.getElementById("auth-daftar-password").value;
    const konfirmasiPassword = document.getElementById("auth-daftar-konfirmasi").value;

    if (!nama || !nim || !email || !password || !konfirmasiPassword) return pesanAuth("Semua data pendaftaran wajib diisi.", false);
    if (!/^\d+$/.test(nim)) return pesanAuth("NIM hanya boleh berisi angka.", false);
    if (password.length < 6) return pesanAuth("Password minimal 6 karakter.", false);
    if (password !== konfirmasiPassword) return pesanAuth("Konfirmasi password tidak sama.", false);

    pesanAuth("Membuat akun mahasiswa...", true);
    try {
      const hasil = await panggilAuth("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, nim, email, password, konfirmasiPassword }),
      });
      const status = await panggilAuth("/api/auth/status", { method: "GET" });
      terapkanAkun(status);
      pesanAuth(hasil.pesan || "Pendaftaran berhasil.", true);
      tombolMasukDashboard.click();
      bukaAlatDariQrSetelahLogin();
    } catch (error) {
      pesanAuth(error.message, false);
    }
  });

  async function logout() {
    try {
      await panggilAuth("/api/auth/logout", { method: "POST" });
    } catch (_) {}
    window.location.href = "/";
  }

  function bukaAlatDariQrSetelahLogin() {
    const id = Number(sessionStorage.getItem("labtrack_qr_alat"));
    if (!id) return;
    sessionStorage.removeItem("labtrack_qr_alat");
    window.setTimeout(function () {
      if (typeof tampilkanHalaman === "function") tampilkanHalaman("inventaris");
      if (typeof bukaDetailAlat === "function") bukaDetailAlat(id);
    }, 150);
  }

  if (formPinjam) {
    formPinjam.addEventListener("submit", function (event) {
      if (akunAktif?.role === "mahasiswa") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (typeof tampilkanPesan === "function") tampilkanPesan("Login sebagai mahasiswa diperlukan untuk mengajukan peminjaman.", false);
      else alert("Login sebagai mahasiswa diperlukan untuk mengajukan peminjaman.");
    }, true);

    formPinjam.addEventListener("reset", function () {
      window.setTimeout(isiIdentitasPeminjam, 0);
    });
  }

  panggilAuth("/api/auth/status", { method: "GET" })
    .then(function (status) { terapkanAkun(status); })
    .catch(function () { terapkanAkun(null); });
})();
