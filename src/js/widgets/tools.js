import { $, turbo } from "../utils";

export default function tools() {
  function load($els) {
    if (!$els.$root) return;
    $els.$addBtn.on("click", function() {
      openForm($els);
    });
  }

  function clean($els) {
    if (!$els.$root) return;
    $els.$input.val("");
    $els.$addBtn.off("click");
    $els.$closeBtn.off("click");
    closeForm($els);
  }

  function openForm($els) {
    $els.$form.removeClass("hidden");
    $els.$closeBtn.on("click", closeForm.bind(null, $els));
  }

  function closeForm($els) {
    $els.$form.addClass("hidden");
  }

  let $els = {};
  turbo.load(() => {
    const $root = $("[data-product-tools-root]");
    const $form = $root.find("[data-product-tools-form]");
    $els = {
      $root,
      $form,
      $addBtn: $root.find("[data-product-tools-add-btn]"),
      $input: $form.find("[data-product-tools-input]"),
      $closeBtn: $root.find("[data-product-tools-close-btn]"),
      $tpl: $("[data-product-tool-tpl]"),
      $container: $root.find("[data-product-tools-container]"),
      $removeToolBtns: $root.find("[data-product-tools-remove-btn]"),
    };

    load($els);
  });

  turbo.beforeCache(() => {
    clean($els);
  });
}
