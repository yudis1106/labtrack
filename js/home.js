(function () {
  const home = document.getElementById("home-screen");
  const tombolMasuk = document.getElementById("home-enter");
  const tombolDashboard = document.querySelector('.menu-tombol[data-target="dashboard"]');

  if (!home) return;

  document.body.classList.add("home-terbuka");

  function bukaAplikasi() {
    home.classList.add("keluar");
    document.body.classList.remove("home-terbuka");
    tombolDashboard?.click();
    window.setTimeout(function () {
      home.setAttribute("aria-hidden", "true");
    }, 500);
  }

  tombolMasuk?.addEventListener("click", bukaAplikasi);
})();