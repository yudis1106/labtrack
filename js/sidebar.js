// Kontrol buka/tutup sidebar LabTrack.
(function () {
  const body = document.body;
  const sidebar = document.getElementById("sidebar-menu");
  const tombolTutup = document.getElementById("sidebar-close");
  const tombolBuka = document.getElementById("sidebar-open");
  const backdrop = document.getElementById("sidebar-backdrop");
  const mediaHp = window.matchMedia("(max-width: 800px)");

  if (!sidebar || !tombolTutup || !tombolBuka) return;

  function simpanStatusDesktop(tertutup) {
    // Di HP sidebar selalu dimulai tertutup agar layar tidak penuh oleh menu.
    // Status hanya disimpan untuk tampilan desktop.
    if (mediaHp.matches) return;
    try {
      localStorage.setItem("labtrack-sidebar-tertutup", tertutup ? "1" : "0");
    } catch (_) {
      // Jika penyimpanan browser tidak tersedia, sidebar tetap berfungsi.
    }
  }

  function ambilStatusDesktop() {
    try {
      return localStorage.getItem("labtrack-sidebar-tertutup") === "1";
    } catch (_) {
      return false;
    }
  }

  function sinkronkanLogout() {
    const logout = document.getElementById("auth-logout-global");
    if (!logout) return;

    // Di homepage tombol logout tetap boleh terlihat.
    // Di dalam aplikasi, tombol logout hanya tampil saat sidebar terbuka.
    const sembunyikan = body.classList.contains("sidebar-tertutup") && !body.classList.contains("home-terbuka");
    logout.style.display = sembunyikan ? "none" : "";
  }

  function aturSidebar(tertutup, simpan) {
    const sedangDiHp = mediaHp.matches;

    body.classList.toggle("sidebar-tertutup", tertutup);
    sidebar.setAttribute("aria-hidden", tertutup ? "true" : "false");
    tombolTutup.setAttribute("aria-expanded", tertutup ? "false" : "true");
    tombolBuka.setAttribute("aria-expanded", tertutup ? "false" : "true");
    tombolBuka.hidden = !tertutup;

    if (backdrop) {
      backdrop.hidden = !sedangDiHp || tertutup;
    }

    sinkronkanLogout();
    if (simpan !== false) simpanStatusDesktop(tertutup);
  }

  function bukaHalamanDinamis(idHalaman, tombolDipilih) {
    // app.js menyimpan NodeList halaman saat pertama kali dimuat. Halaman Profil
    // dibuat sesudahnya, jadi navigasi dinamis perlu membaca DOM terbaru.
    document.querySelectorAll(".halaman").forEach(function (halaman) {
      halaman.classList.toggle("aktif", halaman.id === idHalaman);
    });

    document.querySelectorAll(".menu-tombol").forEach(function (tombol) {
      const aktif = tombol === tombolDipilih || tombol.dataset.target === idHalaman;
      tombol.classList.toggle("aktif", aktif);
      if (aktif) tombol.setAttribute("aria-current", "page");
      else tombol.removeAttribute("aria-current");
    });

    window.scrollTo(0, 0);
  }

  // Jika tombol logout dibuat setelah sidebar.js berjalan, sinkronkan lagi otomatis.
  const observerLogout = new MutationObserver(function () {
    sinkronkanLogout();
  });
  observerLogout.observe(body, { childList: true });

  // Di HP selalu mulai dalam keadaan tertutup supaya konten langsung terlihat.
  const statusAwal = mediaHp.matches ? true : ambilStatusDesktop();
  aturSidebar(statusAwal, false);

  tombolTutup.addEventListener("click", function () {
    aturSidebar(true, true);
    tombolBuka.focus();
  });

  tombolBuka.addEventListener("click", function () {
    aturSidebar(false, true);
    tombolTutup.focus();
  });

  if (backdrop) {
    backdrop.addEventListener("click", function () {
      aturSidebar(true, true);
      tombolBuka.focus();
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !body.classList.contains("sidebar-tertutup")) {
      aturSidebar(true, true);
      tombolBuka.focus();
    }
  });

  // Delegasi dipakai supaya menu yang ditambahkan setelah halaman dimuat
  // (contohnya Profil mahasiswa) tetap bekerja dan ikut menutup drawer di HP.
  document.addEventListener("click", function (event) {
    const tombol = event.target.closest(".menu-tombol");
    if (!tombol || !sidebar.contains(tombol)) return;

    const target = tombol.dataset.target;
    if (target === "profil") {
      bukaHalamanDinamis(target, tombol);
    }

    if (mediaHp.matches) {
      aturSidebar(true, true);
    }
  });

  // Jika ukuran layar berubah, sesuaikan perilaku sidebar secara otomatis.
  mediaHp.addEventListener("change", function (event) {
    if (event.matches) {
      aturSidebar(true, false);
    } else {
      aturSidebar(ambilStatusDesktop(), false);
    }
  });
})();
