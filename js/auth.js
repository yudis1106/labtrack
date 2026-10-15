// LabTrack - autentikasi Mahasiswa dan Admin pada homepage.
(function () {
  const home = document.getElementById("home-screen");
  const tombolMasukDashboard = document.getElementById("home-enter");
  const formPinjam = document.getElementById("form-pinjam");
  const tombolMenuAdmin = document.querySelector('.menu-tombol[data-target="admin"]');
  const sidebar = document.getElementById("sidebar-menu");

  if (!home || !tombolMasukDashboard) return;

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
    <div id="auth-guest" class="auth-top-actions">
      <button type="button" class="auth-top-button" data-buka-auth="login">Login</button>
      <button type="button" class="auth-top-button auth-top-button-primary" data-buka-auth="daftar">Daftar Mahasiswa</button>
    </div>

    <div id="auth-modal" class="auth-modal" hidden>
      <div class="auth-modal-backdrop" data-tutup-auth></div>
      <section class="auth-modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <button type="button" class="auth-modal-close" data-tutup-auth aria-label="Tutup">×</button>
        <div class="auth-modal-brand">
          <span class="auth-modal-logo" aria-hidden="true"></span>
          <div>
            <p class="auth-modal-kicker">LabTrack</p>
            <h2 id="auth-modal-title">Login</h2>
            <p id="auth-modal-subtitle">Masuk untuk melanjutkan ke sistem.</p>
          </div>
        </div>

        <div class="auth-modal-tabs" role="tablist" aria-label="Pilih autentikasi">
          <button type="button" class="auth-modal-tab aktif" data-auth-tab="login">Login</button>
          <button type="button" class="auth-modal-tab" data-auth-tab="daftar">Daftar Mahasiswa</button>
        </div>

        <form id="auth-form-login" class="auth-form" novalidate>
          <label>NIM
            <input id="auth-login-identitas" type="text" autocomplete="username" placeholder="Masukkan NIM" required>
          </label>
          <label>Password
            <input id="auth-login-password" type="password" autocomplete="current-password" placeholder="Masukkan password" required>
          </label>
          <button type="submit" class="auth-submit">Masuk</button>
          <p class="auth-switch-text">Belum punya akun? <button type="button" data-auth-link="daftar">Daftar mahasiswa</button></p>
        </form>

        <form id="auth-form-daftar" class="auth-form auth-form-daftar" hidden novalidate>
          <div class="auth-form-grid">
            <label>Nama lengkap
              <input id="auth-daftar-nama" type="text" autocomplete="name" placeholder="Nama lengkap" required>
            </label>
            <label>NIM
              <input id="auth-daftar-nim" type="text" inputmode="numeric" autocomplete="off" placeholder="NIM" required>
            </label>
            <label class="auth-field-full">Email
              <input id="auth-daftar-email" type="email" autocomplete="email" placeholder="nama@email.com" required>
            </label>
            <label>Password
              <input id="auth-daftar-password" type="password" autocomplete="new-password" minlength="6" placeholder="Minimal 6 karakter" required>
            </label>
            <label>Konfirmasi password
              <input id="auth-daftar-konfirmasi" type="password" autocomplete="new-password" minlength="6" placeholder="Ulangi password" required>
            </label>
          </div>
          <button type="submit" class="auth-submit">Daftar</button>
          <p class="auth-switch-text">Sudah punya akun? <button type="button" data-auth-link="login">Login</button></p>
        </form>

        <p id="auth-pesan" class="auth-pesan" role="status"></p>
      </section>
    </div>
  `;
  home.appendChild(panel);

  const guest = document.getElementById("auth-guest");
  const modal = document.getElementById("auth-modal");
  const modalCard = modal.querySelector(".auth-modal-card");
  const formLogin = document.getElementById("auth-form-login");
  const formDaftar = document.getElementById("auth-form-daftar");
  const pesan = document.getElementById("auth-pesan");
  const modalTitle = document.getElementById("auth-modal-title");
  const modalSubtitle = document.getElementById("auth-modal-subtitle");

  function pesanAuth(teks, berhasil) {
    pesan.textContent = teks || "";
    pesan.classList.toggle("berhasil", Boolean(berhasil));
    pesan.classList.toggle("gagal", Boolean(teks) && !berhasil);
  }

  function pilihMode(mode, fokus) {
    const loginAktif = mode === "login";
    formLogin.hidden = !loginAktif;
    formDaftar.hidden = loginAktif;

    modalTitle.textContent = loginAktif ? "Login" : "Daftar Mahasiswa";
    modalSubtitle.textContent = loginAktif
      ? "Masuk menggunakan akun mahasiswa atau admin."
      : "Buat akun mahasiswa untuk menggunakan layanan LabTrack.";

    document.querySelectorAll("[data-auth-tab]").forEach(function (tombol) {
      tombol.classList.toggle("aktif", tombol.dataset.authTab === mode);
    });

    pesanAuth("", false);

    if (fokus !== false) {
      window.setTimeout(function () {
        const target = loginAktif
          ? document.getElementById("auth-login-identitas")
          : document.getElementById("auth-daftar-nama");
        target?.focus();
      }, 50);
    }
  }

  function bukaModal(mode) {
    pilihMode(mode || "login", false);
    modal.hidden = false;
    document.body.classList.add("auth-modal-terbuka");
    window.setTimeout(function () {
      modal.classList.add("terbuka");
      const target = mode === "daftar"
        ? document.getElementById("auth-daftar-nama")
        : document.getElementById("auth-login-identitas");
      target?.focus();
    }, 10);
  }

  function tutupModal() {
    modal.classList.remove("terbuka");
    document.body.classList.remove("auth-modal-terbuka");
    window.setTimeout(function () {
      modal.hidden = true;
      pesanAuth("", false);
    }, 180);
  }

  document.querySelectorAll("[data-buka-auth]").forEach(function (tombol) {
    tombol.addEventListener("click", function () {
      bukaModal(tombol.dataset.bukaAuth);
    });
  });

  document.querySelectorAll("[data-tutup-auth]").forEach(function (tombol) {
    tombol.addEventListener("click", tutupModal);
  });

  document.querySelectorAll("[data-auth-tab]").forEach(function (tombol) {
    tombol.addEventListener("click", function () {
      pilihMode(tombol.dataset.authTab);
    });
  });

  document.querySelectorAll("[data-auth-link]").forEach(function (tombol) {
    tombol.addEventListener("click", function () {
      pilihMode(tombol.dataset.authLink);
    });
  });

  modalCard.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.hidden) tutupModal();
  });

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

  function amanAuth(teks) {
    const el = document.createElement("div");
    el.textContent = teks ?? "";
    return el.innerHTML;
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

    let logoutGlobal = document.getElementById("auth-logout-global");
    if (!logoutGlobal) {
      logoutGlobal = document.createElement("button");
      logoutGlobal.type = "button";
      logoutGlobal.id = "auth-logout-global";
      logoutGlobal.className = "auth-logout-global";
      logoutGlobal.textContent = "Logout";
      logoutGlobal.addEventListener("click", logout);
      document.body.appendChild(logoutGlobal);
    }

    if (!akunAktif?.authenticated) {
      box.hidden = true;
      logoutGlobal.hidden = true;
      return;
    }

    box.hidden = false;
    logoutGlobal.hidden = false;
    const identitas = akunAktif.role === "mahasiswa" ? akunAktif.nim : "Administrator";
    box.innerHTML = `
      <div><strong>${amanAuth(akunAktif.nama || (akunAktif.role === "admin" ? "Admin" : "Mahasiswa"))}</strong><small>${amanAuth(identitas)}</small></div>
    `;
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
      tombolMasukDashboard.hidden = true;
      if (tombolMenuAdmin) tombolMenuAdmin.hidden = true;
      perbaruiSidebar();
      isiIdentitasPeminjam();
      return;
    }

    guest.hidden = true;
    tutupModal();
    tombolMasukDashboard.hidden = false;
    if (tombolMenuAdmin) tombolMenuAdmin.hidden = akunAktif.role !== "admin";
    isiIdentitasPeminjam();
    perbaruiSidebar();
    sinkronkanAdmin();
  }

  formLogin.addEventListener("submit", async function (event) {
    event.preventDefault();
    const identitas = document.getElementById("auth-login-identitas").value.trim();
    const password = document.getElementById("auth-login-password").value;
    if (!identitas || !password) return pesanAuth("NIM dan password wajib diisi.", false);

    pesanAuth("Memeriksa akun...", true);
    try {
      await panggilAuth("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identitas, password }),
      });
      const status = await panggilAuth("/api/auth/status", { method: "GET" });
      terapkanAkun(status);
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
      await panggilAuth("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, nim, email, password, konfirmasiPassword }),
      });
      const status = await panggilAuth("/api/auth/status", { method: "GET" });
      terapkanAkun(status);
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