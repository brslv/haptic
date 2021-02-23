document.addEventListener("DOMContentLoaded", function domLoaded() {
  (function handleDeleteClick() {
    var delBtnEl = document.querySelector("[data-delete-product-btn]");
    var productDelFormEl = document.getElementById("product-delete-form");
    if (!delBtnEl || !productDelFormEl) return;

    delBtnEl.addEventListener("click", function delBtnElClick(e) {
      e.preventDefault();
      var ok = window.confirm(
        "Deleting a product is irreversible. Delete it anyway?"
      );
      if (ok) deleteProduct(e.currentTarget.dataset.postId);
    });
    function deleteProduct() {
      productDelFormEl.submit();
    }
  })();
});
