import { $, turbo, req } from "../utils";

export default function tools() {
  function load($els) {
    registerRemoveButtons($els);
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
    $els.$input.trigger("focus");
    $els.$closeBtn.on("click", closeForm.bind(null, $els));
    $els.$form.on("submit", onFormSubmit.bind(null, $els));
  }

  let submitting = false;
  function onFormSubmit($els, e) {
    e.preventDefault();

    if (submitting) return;

    submitting = true;

    const text = $els.$input.val();

    if (!text.length) return;

    const slug = $els.$root.data("product-tools-product-slug");

    req(
      `/product/${slug}/tool`,
      { text },
      {
        method: "post",
        ok: function(response) {
          submitting = false;
          $els.$input.val("");
          addToolElement($els, response.data.details.tool);
        },
      }
    );
  }

  function addToolElement($els, tool) {
    const $tplRoot = $($els.$tpl.html());
    $els.$container.append($tplRoot);
    $els.$container.addClass("mb-2");
    $tplRoot.find("[data-text-container]").html(tool.text);
    $tplRoot.data("product-tool-id", tool.id);
    registerRemoveButtons($els);
  }

  function registerRemoveButtons($els) {
    $els.$root
      .find("[data-product-tools-remove-btn]")
      .on("click", onRemoveBtnClick.bind(null, $els));
  }

  function onRemoveBtnClick($els, e) {
    const $target = $(e.currentTarget).parents("[data-product-tool-id]");
    const id = $target.data("product-tool-id");
    const slug = $els.$root.data("product-tools-product-slug");
    req(`/product/${slug}/tool/${id}`, {
      method: "delete",
      ok: function(result) {
        if (result.data.ok) {
          $target.remove();
        }
      },
    });
  }

  function closeForm($els) {
    $els.$form.addClass("hidden");
    $els.$form.off("submit");
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
