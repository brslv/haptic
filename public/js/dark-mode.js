document.addEventListener("DOMContentLoaded", function domLoaded() {
  var toggle = document.querySelector("[data-dark-mode-toggle]");
  var htmlEl = document.getElementsByTagName("html")[0];
  var isDark = localStorage.getItem("dark-mode");

  if (isDark === "true") {
    htmlEl.classList.add("dark");
  } else {
    htmlEl.classList.remove("dark");
  }

  toggle.addEventListener("click", function toggleDarkMode() {
    htmlEl.classList.toggle("dark");
    var isDark = htmlEl.classList.contains("dark");
    localStorage.setItem("dark-mode", isDark);
  });
});
