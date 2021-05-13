import { $, turbo, req } from "../utils";

export default function collect() {
  function onBtnClick(slug, e) {
    const csrf = $('meta[name="csrf"]').attr("content");
    req(
      `/p/${slug}/collect`,
      { csrf },
      {
        method: "post",
        ok: function() {
          $(document).trigger("haptic:add-toast", {
            content: "Product collected",
            type: "success",
          });
        },
        fail: function(err) {
          $(document).trigger("haptic:add-toast", {
            content: err.response.data.err,
            type: "error",
          });
        },
      }
    );
  }

  function load($els) {
    if (!$els.$btn) return;

    const slug = $els.$btn.data("product-slug");
    const disabled = $els.$btn.data("disabled");
    if (disabled !== undefined) return;

    $els.$btn.on("click", onBtnClick.bind(null, slug));
  }

  let $els = {};
  turbo.load(() => {
    $els = {
      $btn: $("[data-product-collect-btn]"),
    };

    load($els);
  });
}
