import { $, turbo } from "../utils";

export default function deleteProduct() {
  function load() {
    const $del = $("[data-delete-product-btn]");
    const $delForm = $("[data-delete-product-form]");
    if (!$del || !$delForm) return;

    $del.on("click", function delBtnElClick(e) {
      e.preventDefault();
      const ok = window.confirm(
        "Deleting a product is irreversible. Delete it anyway?"
      );
      if (ok) deleteProduct();
    });

    function deleteProduct() {
      $delForm.trigger("submit");
    }
  }

  function clean() {
    const $del = $("[data-delete-product-btn]");
    $del.off("click");
  }

  turbo.load(() => {
    load();
  });

  turbo.beforeCache(() => {
    clean();
  });
}
