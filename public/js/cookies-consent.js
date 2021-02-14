document.addEventListener("DOMContentLoaded", function domLoaded() {
  var cookiesConsentEl = document.getElementById("cookies-consent");
  var consentAccepted = localStorage.getItem("cookies-consent");

  function showConsent() {
    if (consentAccepted === "true") return;

    var consentOkButton = document.getElementById("cookies-consent-ok-btn");
    cookiesConsentEl.classList.remove("hidden");

    consentOkButton.addEventListener("click", function consentBtnClick() {
      localStorage.setItem("cookies-consent", "true");
      cookiesConsentEl.classList.add("hidden");
    });
  }

  showConsent();
});
