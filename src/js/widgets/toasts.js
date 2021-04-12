import { $, turbo } from "../utils";

export default function toasts() {
  function onAddToast(e, data) {
    const content = data.content;
    const type = data.type || "default";
    const $tpl = $("[data-toast-tpl]");
    if (!$tpl) {
      console.warn("No toast tpl element.");
      return;
    }
    const $root = $($tpl.html());

    var color;
    if (type === "default") color = "bg-blue-400";
    if (type === "success") color = "bg-green-400";
    if (type === "error") color = "bg-red-400";
    $root
      .children()
      .first()
      .addClass(color);

    const randId = Math.random();
    $root.data("toastId", randId);

    const $content = $root.find("[data-toast-content]");
    $content.text(content);

    const $close = $root.find("[data-toast-close-btn]");
    $close.on("click", hideToast.bind(null, { id: randId }));

    setTimeout(function() {
      hideToast({ id: randId });
    }, 4000);

    $els.$toastsContainer.prepend($root);

    function hideToast({ id }) {
      const $el = $els.$toastsContainer.find('[data-toast-id="' + id + '"]');
      if (!$el) return;
      $el.remove();
      $close.off("click");
    }
  }

  let $els = {};
  turbo.load(() => {
    const $toastsContainer = $("[data-toasts]");
    $els = { $toastsContainer };
    if (!$toastsContainer) {
      console.warn("Toasts failed to load. No data-toasts element.");
      return;
    }

    $(document).on("haptic:add-toast", onAddToast.bind($els));
  });

  turbo.beforeCache(() => {
    $(document).off("haptic:add-toast");
  });
}
