import { $, turbo, req } from "../utils";

export default function createProduct() {
  function onOpen(data, $els) {
    function validate() {
      const name = $els.$name.val();
      const slug = $els.$slug.val();
      if (name.length && slug.length) $submit.removeAttr("disabled");
      else $els.$submit.attr("disabled", "disabled");

      if (name.length) {
        $els.$slug.removeAttr("disabled");
        $els.$slugBtn.removeAttr("disabled");
      } else {
        $els.$slug.attr("disabled", "disabled");
        $els.$slugBtn.attr("disabled", "disabled");
      }
    }

    $els.$name.on({ input: validate, blur: validate });
    $els.$slug.on({ input: validate, blur: validate });
    $els.$slugBtn.on("click", onSlugBtnClick.bind(null, $els));
    $els.$form.on("submit", onFormSubmit.bind(null, $els));

    $els.$name.trigger("focus");
  }

  function onClose(data, $els) {
    $els.$form.off("submit");
  }

  function onSlugBtnClick($els) {
    const $form = $("[dta-create-product-form]");
    const $name = $("[data-product-name-input]", $form);
    const $slug = $("[data-product-slug-input]", $form);
    const $submit = $(`button[type="submit"]`, $form);

    $submit.attr("disabled", "disabled");

    const name = $name.val();

    req(
      "/product-slug",
      { name },
      {
        method: "post",
        ok: function(result) {
          if (result.data.ok) {
            $slug.val(result.data.details.slug);
          }
          $submit.removeAttr("disabled");
        },
      }
    );
  }

  function onFormSubmit($els, e) {
    e.preventDefault();
    const name = $els.$name.val();
    const slug = $els.$slug.val();

    req(
      "/product",
      { name, slug },
      {
        method: "post",
        ok: (result) => {
          const slug = result.data.details.slug;
          const redirectTo = `/dashboard/product/${slug}/settings`;
          Turbo.visit(redirectTo);
        },
      }
    );
  }

  function onBeforeCache($els) {
    // reset the form
    $els.$name.val("");
    $els.$slug.val("");

    // to fire up the onOpen.validate,
    // which will properly reset the disabled attributes
    $els.$name.trigger("input");
  }

  let $els = {};
  turbo.load(() => {
    const $form = $("[data-create-product-form]");
    $els = {
      $form,
      $name: $("[data-product-name-input]", $form),
      $slug: $("[data-product-slug-input]", $form),
      $slugBtn: $("[data-product-slug-btn]", $form),
      $submit: $(`button[type="submit"]`, $form),
    };

    $(document).on("haptic:modal-open", function(e, data) {
      if (data.modalName === "new-product") {
        onOpen(data, $els);
      }
    });
    $(document).on("haptic:modal-close", function(e, data) {
      if (data.modalName === "new-product") {
        onClose(data, $els);
      }
    });
  });

  turbo.beforeCache(() => {
    $(document).off("haptic:modal-open");
    onBeforeCache($els);
  });
}
