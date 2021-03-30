import { $, turbo } from "../utils";

export default function modal() {
  function openModal($modal) {
    $modal.removeClass("hidden");
  }

  function closeModal($modal) {
    $modal.addClass("hidden");
  }

  function onTriggerClick() {
    const $this = $(this);
    const trigger = $this.data("modal-trigger");
    const $modal = $(`[data-modal-name="${trigger}"]`);
    const $close = $("[data-modal-close]", $modal);

    openModal($modal);
    $close.one("click", closeModal.bind(null, $modal));

    $(window).on("keyup", function(e) {
      console.log("keyup");
      if (e.key === "Escape") {
        closeModal($modal);
        $(this).off("keyup");
      }
    });
  }

  turbo.load(() => {
    const selector = "[data-modal-trigger]";
    $(selector).on("click", onTriggerClick);
  });
}
