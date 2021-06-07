import { $, req, turbo } from "../utils";

export default function productLogo() {
  function load($els) {
    $els.$uploadLogoInput.on("change", onFileSelected.bind(null, $els));
    $els.$uploadBtn.on("click", onUploadClick.bind(null, $els));
  }

  // function onPredefinedCoverImageClick($els, e) {
  //   const clicked = e.currentTarget;
  //   const imageUrl = $(clicked).data("image-url");
  //   const productSlug = $(clicked).data("product-slug");
  //   setBg($els, imageUrl);

  //   req(
  //     "/choose-predefined-cover",
  //     {
  //       url: imageUrl,
  //       slug: productSlug,
  //     },
  //     {
  //       method: "post",
  //     }
  //   );
  // }

  function onUploadClick($els, e) {
    $els.$uploadLogoInput.trigger("click");
  }

  function onFileSelected($els, e) {
    const file = e.currentTarget.files[0];
    if (!file) return;

    const $oldUploadedImage = $els.$uploadBtn.find("img");
    const formData = new FormData();
    formData.append("slug", $(e.currentTarget).data("product-slug"));
    formData.append("image", file);

    $oldUploadedImage.hide();
    $els.$loader.removeClass("hidden");
    $els.$uploadBtnLabel.addClass("hidden");
    $els.$uploadBtn.attr("disabled", "disabled");

    return req("/upload-logo", formData, {
      method: "post",
      headers: {
        "Content-Type": "multipart/form-data",
      },
      ok: function ok(response) {
        $els.$loader.addClass("hidden");
        const url = response.data.details.url;
        setLogo($els, url);
        $oldUploadedImage.remove();
        $els.$uploadBtn.removeAttr("disabled");
        return $(document).trigger("haptic:add-toast", {
          content: "Logo uploaded. Make sure to hit Save.",
          type: "success",
        });
      },
      fail: function fail(err) {
        $oldUploadedImage.show();
        $els.$loader.addClass("hidden");
        $els.$uploadBtn.removeAttr("disabled");
        $els.$uploadBtnLabel.removeClass("hidden");
        return $(document).trigger("haptic:add-toast", {
          content: err.response.data.err,
          type: "error",
        });
      },
    });
  }

  function setLogo($els, url) {
    const $img = $(`<img src="${url}" />`);
    $img.style = {
      width: "100%",
      height: "100%",
    };
    $els.$uploadBtn.append($img);
    $els.$uploadedLogoInput.val(url);
  }

  function clean($els) {
    $els.$uploadLogoInput.off("change");
    $els.$uploadBtn.off("click");
  }

  let $els = {};
  turbo.load(() => {
    $els = {
      $loader: $("[data-upload-logo-loader]"),
      $uploadLogoInput: $("[data-upload-logo-input]"),
      $uploadedLogoInput: $("[data-uploaded-logo-input]"),
      $uploadBtn: $("[data-upload-logo-btn]"),
      $uploadBtnLabel: $("[data-upload-logo-label"),
    };

    load($els);
  });

  turbo.beforeCache(() => {
    clean($els);
  });
}
