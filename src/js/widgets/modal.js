import { $, turbo } from "../utils";

export default function modal() {
  const triggerSelector = "[data-modal-trigger]";

  function openModal($modal, modalName) {
    $modal.removeClass("hidden");
    $(document).trigger("haptic:modal-open", { $modal, modalName });
  }

  function closeModal($modal, modalName) {
    $modal.addClass("hidden");
    $(document).trigger("haptic:modal-close", { $modal, modalName });
  }

  function onKeyUp(trigger, e) {
    if (e.key === "Escape") {
      const $modal = $(`[data-modal-name="${trigger}"]`);
      closeModal($modal, trigger);
      $(this).off("keyup");
    }
  }

  function onTriggerClick($triggerEl) {
    const trigger = $triggerEl.data("modal-trigger");
    const $modal = $(`[data-modal-name="${trigger}"]`);
    const $close = $("[data-modal-close]", $modal);

    openModal($modal, trigger);

    // handle close
    $close.one("click", closeModal.bind(null, $modal, trigger));
    $(window).on("keyup", onKeyUp.bind(null, trigger));
  }

  function closeAllModals($triggerEl) {
    const trigger = $triggerEl.data("modal-trigger");
    const $modal = $(`[data-modal-name="${trigger}"]`);
    closeModal($modal, trigger);
  }

  turbo.load(() => {
    $(triggerSelector).on("click", function() {
      onTriggerClick($(this));
    });
  });

  turbo.beforeCache(() => {
    // before turbo caches the page, close the modals.
    $(triggerSelector).each(function() {
      closeAllModals($(this));
    });
  });
}
