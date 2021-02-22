document.addEventListener("DOMContentLoaded", function domLoaded() {
  // creator icon click
  (function creator() {
    var creatorEl = document.getElementById("creator");
    var creatorDetailsEl = document.getElementById("creator-details");
    var closeCreatorDetailsBtn = document.getElementById(
      "close-creator-details-btn"
    );

    if (!creatorEl || !creatorDetailsEl) {
      console.warn("No creator/creator-details elements.");
      return;
    }

    creatorEl.addEventListener(
      "click",
      function creatorClick(e) {
        if (creatorDetailsEl.contains(e.target)) return;
        creatorDetailsEl.classList.toggle("hidden");
      },
      false
    );

    if (closeCreatorDetailsBtn) {
      closeCreatorDetailsBtn.addEventListener("click", function closeClick() {
        creatorDetailsEl.classList.add("hidden");
      });
    }
  })();

  // boost product
  (function boostProduct() {
    var btnEl = document.querySelector("[data-product-boost-btn]");
    var counter = document.querySelector("[data-product-boost-counter]");
    if (!btnEl || !(App || App.Product || App.Product.Slug)) return;

    btnEl.addEventListener("click", function productBoostBtnElClick() {
      // send /p/slug/boost
      axios
        .post("/p/" + App.Product.slug + "/boost")
        .then(function boostProductResponse(response) {
          var newCount = App.Product.boostCount + 1;
          counter.innerHTML = newCount;
          App.Product.boostCount = newCount;
        })
        .catch(function boostProductResponseError(err) {
          var data = err.response.data;
          alert(data.err);
        });
      // increase the counter by one
    });
  })();
});
