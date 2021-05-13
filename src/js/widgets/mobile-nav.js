import { $, turbo } from "../utils";

export default function modal() {
  function load($els) {
    $els.$open.on("click", onOpen.bind(null, $els));
    $els.$close.on("click", onClose.bind(null, $els));
    $(document).on("keyup", onKeyUp.bind(null, $els));
  }

  function onKeyUp($els, e) {
    if (e.key === "Escape") {
      onClose($els);
    }
  }

  function onOpen($els) {
    $els.$mobileNav.removeClass("hidden");
    $("body").addClass("overflow-hidden");
  }

  function onClose($els) {
    $els.$mobileNav.addClass("hidden");
    $("body").removeClass("overflow-hidden");
  }

  function clear($els) {
    onClose($els);
    $(document).off("keyup");
  }

  let $els = {};
  turbo.load(() => {
    $els = {
      $mobileNav: $("[data-mobile-nav]"),
      $open: $("[data-mobile-nav-open]"),
      $close: $("[data-mobile-nav-close]"),
    };

    load($els);
  });

  turbo.beforeCache(() => {
    // before turbo caches the page, close the modals.
    clear($els);
  });
}
