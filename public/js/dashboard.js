document.addEventListener("DOMContentLoaded", function domLoaded() {
  var createBtn = document.getElementById("create-product-btn");
  var modal = document.querySelector(
    '[data-modal-name="create-product-modal"]'
  );
  var close = document.querySelector(
    '[data-modal-name="create-product-modal"] [data-modal-close]'
  );
  var form = document.getElementById("create-product-form");
  var productNameEl = document.getElementById("product-name");

  if (createBtn && modal) {
    createBtn.addEventListener("click", function onCreate() {
      modal.classList.remove("hidden");
      if (productNameEl) productNameEl.focus();
    });
  }

  if (close && modal) {
    close.addEventListener("click", function onClose() {
      modal.classList.add("hidden");
    });
  }

  if (form) {
    (function() {
      var productSlugEl = document.getElementById("product-slug");
      var submitBtn = document.querySelector(
        '#create-product-form button[type="submit"]'
      );
      var genSlugBtn = document.querySelector(
        "#create-product-form button[data-form-gen-slug-btn]"
      );

      genSlugBtn.addEventListener("click", function productNameElBlur() {
        var productName = productNameEl.value;
        submitBtn.setAttribute("disabled", "disabled");
        axios
          .post("/product-slug", { name: productName })
          .then(function getProductSlug(result) {
            if (result.data.ok) {
              productSlugEl.value = result.data.details.slug;
            }
            submitBtn.removeAttribute("disabled");
          });
      });

      function validation(e) {
        if (productNameEl.value.length && productSlugEl.value.length) {
          submitBtn.removeAttribute("disabled");
        } else {
          submitBtn.setAttribute("disabled", "disabled");
        }

        if (productNameEl.value.length) {
          genSlugBtn.removeAttribute("disabled");
          productSlugEl.removeAttribute("disabled");
        } else {
          genSlugBtn.setAttribute("disabled", "disabled");
          productSlugEl.setAttribute("disabled", "disabled");
        }
      }

      productNameEl.addEventListener("blur", validation);
      productSlugEl.addEventListener("blur", validation);
      productNameEl.addEventListener("input", validation);
      productSlugEl.addEventListener("input", validation);

      form.addEventListener("submit", function asyncFormSubmit(e) {
        e.preventDefault();
        var productName = productNameEl.value;
        var productSlug = productSlugEl.value;

        function submit() {
          axios
            .post("/product", { name: productName, slug: productSlug })
            .then(function createProduct(result) {
              var slug = result.data.details.slug;
              window.location.href = "/dashboard/product/" + slug + "/settings";
            })
            .catch((err) => {
              var errorEl = document.querySelector(
                "#create-product-form [data-form-error]"
              );
              errorEl.classList.remove("hidden");
              errorEl.innerHTML = err.response.data.err;
            });
        }

        setTimeout(submit, 0);
      });
    })();
  }
});
