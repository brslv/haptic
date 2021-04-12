import { $, turbo } from "../utils";

export default function cookieConsent() {
  function load() {
    const consentAccepted = localStorage.getItem("cookies-consent");

    function showConsent() {
      if (consentAccepted === "true") {
        $els.$cookiesConsent.addClass("hidden");
        return;
      }
      $els.$cookiesConsent.removeClass("hidden");
      $els.$consentOKButton.on("click", onConsentBtnClick.bind(null, $els));
    }

    showConsent();
  }

  function onConsentBtnClick($els) {
    localStorage.setItem("cookies-consent", "true");
    $els.$cookiesConsent.addClass("hidden");
  }

  function clear($els) {
    $els.$consentOKButton.off("click");
  }

  let $els = {};
  turbo.load(() => {
    $els = {
      $cookiesConsent: $("#cookies-consent"),
      $consentOKButton: $("#cookies-consent-ok-btn"),
    };

    load($els);
  });

  turbo.beforeCache(() => {
    clear($els);
  });
}
