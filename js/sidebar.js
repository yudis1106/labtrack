// Kontrol buka/tutup sidebar LabTrack.
(function () {
  const body = document.body;
  const sidebar = document.getElementById("sidebar-menu");
  const tombolTutup = document.getElementById("sidebar-close");
  const tombolBuka = document.getElementById("sidebar-open");

  if (!sidebar || !tombolTutup || !tombolBuka) return;

  function simpanStatus(tertutup) {
    try {
      localStorage.setItem("labtrack-sidebar-tertutup", tertutup ? "1" : "0");
    } catch (_) {
      // Jika penyimpanan browser tidak tersedia, sidebar tetap berfungsi.
    }
  }

  function aturSidebar(tertutup, simpan) {
    body.classList.toggle("sidebar-tertutup", tertutup);
    sidebar.setAttribute("aria-hidden", tertutup ? "true" : "false");
    tombolTutup.setAttribute("aria-expanded", tertutup ? "false" : "true");
    tombolBuka.setAttribute("aria-expanded", tertutup ? "false" : "true");
    tombolBuka.hidden = !tertutup;

    if (simpan !== false) simpanStatus(tertutup);
  }

  let statusAwal = false;
  try {
    statusAwal = localStorage.getItem("labtrack-sidebar-tertutup") === "1";
  } catch (_) {}

  aturSidebar(statusAwal, false);

  tombolTutup.addEventListener("click", function () {
    aturSidebar(true, true);
    tombolBuka.focus();
  });

  tombolBuka.addEventListener("click", function () {
    aturSidebar(false, true);
    tombolTutup.focus();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !body.classList.contains("sidebar-tertutup")) {
      aturSidebar(true, true);
      tombolBuka.focus();
    }
  });

  document.querySelectorAll(".menu-tombol").forEach(function (tombol) {
    tombol.addEventListener("click", function () {
      if (window.matchMedia("(max-width: 800px)").matches) {
        aturSidebar(true, true);
      }
    });
  });
})();
