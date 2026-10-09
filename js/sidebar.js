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

    if (simpan !== false) simpanStatusDesktop(tertutup);
  }

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

  document.querySelectorAll(".menu-tombol").forEach(function (tombol) {
    tombol.addEventListener("click", function () {
      if (mediaHp.matches) {
        aturSidebar(true, true);
      }
    });
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
