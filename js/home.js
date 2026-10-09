(function () {
  const home = document.getElementById("home-screen");
  const tombolMasuk = document.getElementById("home-enter");
  const merek = document.querySelector(".merek");
  const tombolDashboard = document.querySelector('.menu-tombol[data-target="dashboard"]');

  if (!home) return;

  document.body.classList.add("home-terbuka");
  merek?.setAttribute("role", "button");
  merek?.setAttribute("tabindex", "0");
  merek?.setAttribute("aria-label", "Kembali ke homepage LabTrack");

  function bukaAplikasi() {
    home.classList.add("keluar");
    document.body.classList.remove("home-terbuka");
    tombolDashboard?.click();
    window.setTimeout(function () {
      home.setAttribute("aria-hidden", "true");
    }, 500);
  }

  function bukaHome() {
    home.removeAttribute("aria-hidden");
    home.classList.remove("keluar");
    document.body.classList.add("home-terbuka");
    tombolMasuk?.focus({ preventScroll: true });
  }

  tombolMasuk?.addEventListener("click", bukaAplikasi);

  merek?.addEventListener("click", bukaHome);
  merek?.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      bukaHome();
    }
  });
})();