document.addEventListener("DOMContentLoaded", function domLoaded() {
  var createBtn = document.getElementById("create-product-btn");
  var modal = document.querySelector(
    '[data-modal-name="create-product-modal"]'
  );
  var close = document.querySelector(
    '[data-modal-name="create-product-modal"] [data-modal-close]'
  );
  var form = document.getElementById("create-product-form");

  if (createBtn && modal) {
    createBtn.addEventListener("click", function onCreate() {
      modal.classList.remove("hidden");
    });
  }

  if (close && modal) {
    close.addEventListener("click", function onClose() {
      modal.classList.add("hidden");
    });
  }

  if (form) {
    (function() {
      var productNameEl = document.getElementById("product-name");
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

      productNameEl.addEventListener("input", function productNameElInput(e) {
        if (productNameEl.value.length) {
          genSlugBtn.removeAttribute("disabled");
          productSlugEl.removeAttribute("disabled");
          submitBtn.removeAttribute("disabled");
        } else {
          genSlugBtn.setAttribute("disabled", "disabled");
          productSlugEl.setAttribute("disabled", "disabled");
          submitBtn.setAttribute("disabled", "disabled");
        }
      });

      form.addEventListener("submit", function asyncFormSubmit(e) {
        e.preventDefault();
        var productName = productNameEl.value;
        var productSlug = productSlugEl.value;

        function submit() {
          axios
            .post("/product", { name: productName, slug: productSlug })
            .then(function createProduct(result) {
              var slug = result.data.details.slug;
              window.location.href = "/dashboard/product/" + slug;
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
