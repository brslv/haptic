import { $, turbo, onFrameLoaded } from "../utils";

export default function modal() {
  const triggerSelector = "[data-modal-trigger]";

  function load() {
    $(triggerSelector).on("click", function() {
      onTriggerClick($(this));
    });
  }

  function openModal($modal, modalName, $triggerEl) {
    $modal.removeClass("hidden");
    $(document).trigger("haptic:modal-open", { $modal, modalName, $triggerEl });
    $(document).one("haptic:close-modals", closeAllModals);
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

    openModal($modal, trigger, $triggerEl);

    // handle close
    $close.one("click", closeModal.bind(null, $modal, trigger));
    $(window).on("keyup", onKeyUp.bind(null, trigger));
  }

  function closeAllModals() {
    const $modals = $(`[data-modal-name]`);
    $modals.each((i, modal) => {
      const $modal = $(modal);
      closeModal($modal, $modal.data("modal-name"));
    });
  }

  turbo.load(() => {
    load();
    onFrameLoaded("browse-posts-list", load);
    onFrameLoaded("product", load);
  });

  turbo.beforeCache(() => {
    // before turbo caches the page, close the modals.
    closeAllModals();
  });
}
