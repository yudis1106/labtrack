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
    if (mediaHp.matches) return;
    try {
      localStorage.setItem("labtrack-sidebar-tertutup", tertutup ? "1" : "0");
    } catch (_) {}
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

    if (backdrop) backdrop.hidden = !sedangDiHp || tertutup;

    sinkronkanLogout();
    if (simpan !== false) simpanStatusDesktop(tertutup);
  }

  const observerLogout = new MutationObserver(function () {
    sinkronkanLogout();
  });
  observerLogout.observe(body, { childList: true });

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
      if (mediaHp.matches) aturSidebar(true, true);
    });
  });

  // Profil dibuat dinamis setelah app.js membaca menu awal.
  // Delegasi ini memastikan hanya satu menu dan satu halaman yang aktif.
  document.addEventListener("click", function (event) {
    const tombol = event.target.closest(".menu-tombol[data-target]");
    if (!tombol || !sidebar.contains(tombol)) return;

    const target = tombol.dataset.target;
    if (!target) return;

    window.requestAnimationFrame(function () {
      document.querySelectorAll(".halaman").forEach(function (halaman) {
        halaman.classList.toggle("aktif", halaman.id === target);
      });

      document.querySelectorAll(".menu-tombol[data-target]").forEach(function (item) {
        const aktif = item.dataset.target === target;
        item.classList.toggle("aktif", aktif);
        if (aktif) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
      });

      window.scrollTo(0, 0);
    });

    if (mediaHp.matches && !body.classList.contains("sidebar-tertutup")) {
      aturSidebar(true, true);
    }
  });

  mediaHp.addEventListener("change", function (event) {
    if (event.matches) aturSidebar(true, false);
    else aturSidebar(ambilStatusDesktop(), false);
  });
})();
