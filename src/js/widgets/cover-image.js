import { $, req, turbo } from "../utils";

export default function coverImage() {
  function load($els) {
    $els.$chooseCoverBtn.on("click", onChooseCoverClick.bind(null, $els));
    $els.$chooseCoverInput.on("change", onFileSelected.bind(null, $els));
    $els.$predefinedCoverImageBtn.on(
      "click",
      onPredefinedCoverImageClick.bind(null, $els)
    );
    $els.$closeCoverImagePickerBtn.on(
      "click",
      onCloseCoverImagePicker.bind(null, $els)
    );
    $els.$uploadBtn.on("click", onUploadClick.bind(null, $els));
  }

  function onChooseCoverClick($els, e) {
    $els.$chooseCoverBtn.addClass("hidden");
    $els.$coverImagePickerContainer.removeClass("hidden");
  }

  function onPredefinedCoverImageClick($els, e) {
    const clicked = e.currentTarget;
    const imageUrl = $(clicked).data("image-url");
    const productSlug = $(clicked).data("product-slug");
    setBg($els, imageUrl);

    req(
      "/choose-predefined-cover",
      {
        url: imageUrl,
        slug: productSlug,
      },
      {
        method: "post",
      }
    );
  }

  function setBg($els, url) {
    $els.$coverImageContainer.css({
      backgroundImage: `url("${url}")`,
      backgroundRepeat: "initial",
      backgroundSize: "cover",
      backgroundPosition: "center",
    });
  }

  function onUploadClick($els, e) {
    $els.$chooseCoverInput.trigger("click");
  }

  function onFileSelected($els, e) {
    const file = e.currentTarget.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("slug", $(e.currentTarget).data("product-slug"));
    formData.append("image", file);

    $els.$loader.removeClass("hidden");
    $els.$uploadBtn.attr("disabled", "disabled");
    $els.$closeCoverImagePickerBtn.attr("disabled", "disabled");

    return req("/upload-cover", formData, {
      method: "post",
      headers: {
        "Content-Type": "multipart/form-data",
      },
      ok: function ok(response) {
        $els.$loader.addClass("hidden");
        const url = response.data.details.url;
        setBg($els, url);
        $els.$uploadBtn.removeAttr("disabled");
        $els.$closeCoverImagePickerBtn.removeAttr("disabled");
        return $(document).trigger("haptic:add-toast", {
          content: "Cover updated",
          type: "success",
        });
      },
      fail: function fail(err) {
        $els.$loader.addClass("hidden");
        $els.$uploadBtn.removeAttr("disabled");
        $els.$closeCoverImagePickerBtn.removeAttr("disabled");
        return $(document).trigger("haptic:add-toast", {
          content: err.response.data.err,
          type: "error",
        });
      },
    });
  }

  function onCloseCoverImagePicker($els, e) {
    $els.$chooseCoverBtn.removeClass("hidden");
    $els.$coverImagePickerContainer.addClass("hidden");
  }

  function clean($els) {
    $els.$chooseCoverBtn.off("click");
    $els.$chooseCoverInput.off("change");
    $els.$predefinedCoverImageBtn.off("click");
    $els.$closeCoverImagePickerBtn.off("click");
    $els.$uploadBtn.off("click");
    onCloseCoverImagePicker($els);
  }

  let $els = {};
  turbo.load(() => {
    $els = {
      $loader: $("[data-cover-image-upload-loader]"),
      $coverImageContainer: $("[data-cover-image-container]"),
      $chooseCoverInput: $("[data-choose-cover-input]"),
      $uploadBtn: $("[data-cover-image-upload-btn]"),
      $coverImageUrlInput: $("[data-upload-cover-url-input]"),
      $chooseCoverBtn: $("[data-choose-cover-btn]"),
      $coverImagePickerContainer: $("[data-cover-image-picker-container]"),
      $predefinedCoverImageBtn: $("[data-predefined-cover-btn]"),
      $closeCoverImagePickerBtn: $("[data-close-cover-image-picker-btn]"),
    };

    load($els);
  });

  turbo.beforeCache(() => {
    clean($els);
  });
}
