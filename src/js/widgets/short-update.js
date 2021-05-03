import { $, turbo, req } from "../utils";

export default function shortUpdate() {
  function activate($els) {
    if ($els.$root.hasClass("hidden")) {
      open($els);
      registerCancel($els);
    }
  }

  function open($els) {
    $els.$postTypesContainer
      .removeClass("p-2 border-yellow-300")
      .addClass("p-4 border-gray-100 shadow-lg");
    $els.$root.removeClass("hidden");
    $els.$text.trigger("focus");
    $els.$allTriggers.each(function(i, btn) {
      const $btn = $(btn);
      if ($btn.data("post-type-trigger-no-hide") !== undefined) return;
      $btn.addClass("hidden");
    });

    $els.$form.on("submit", function(e) {
      e.preventDefault();
      onFormSubmit($els);
    });
    $els.$uploadImgBtn.on("click", function(e) {
      onUploadImageBtnClick($els);
    });
    $els.$fileUpload.on("change", onFileSelected);
    $(document).on(
      "haptic:short-update-img-uploaded",
      onImageUploaded.bind(null, $els)
    );
  }

  function registerCancel($els) {
    $els.$cancelBtn.on("click", function() {
      close($els);
      $(this).off("click");
    });
  }

  function close($els) {
    // el hidden
    $els.$postTypesContainer
      .removeClass("p-4 border-gray-100 shadow-lg")
      .addClass("p-2 border-yellow-300");
    $els.$trigger.removeClass("bg-gray-100");
    $els.$allTriggers.removeClass("hidden");
    $els.$root.addClass("hidden");
    $(document).off("haptic:short-update-img-uploaded");
    $els.$form.off("submit");
    $els.$uploadImgBtn.off("click");
    $els.$fileUpload.off("change");
  }

  function clear($els) {
    $els.$text.val("");
    clearImagePreview($els);
  }

  function clearImagePreview($els) {
    if ($els.$loader) $els.$loader.addClass("hidden");
    if ($els.$submit) $els.$submit.removeAttr("disabled");
    if ($els.$preview) {
      $els.$preview.html("");
      $els.$preview.hide();
    }
    $els.$uploadedImg.val("");
    $els.$uploadImgBtn.removeAttr("disabled");
  }

  function onImageUploaded($els, e, data) {
    clearImagePreview($els);
    const url = data.data.data.details.url;
    const $container = $(
      `<div class="relative flex items-center justify-center"><div data-content></div></div>`
    );
    const $img = $(`<img data-zoomable src=${url} />`).addClass("rounded-md");
    const $rmBtn = $(
      `<button type="button" class="shadow-xl absolute top-1/2 left-1/2 btn btn-danger btn-small text-sm" style="transform: translate(-50%, -50%);">Remove</button>`
    ).on("click", clearImagePreview.bind(null, $els));
    $container
      .find("[data-content]")
      .append($img)
      .append($rmBtn);
    $els.$preview.append($container);
    $els.$preview.show();
    $els.$uploadedImg.val(url);
  }

  function onFormSubmit($els) {
    const formValues = extractFormValues();
    const errors = validateFormValues(formValues);

    hideErrors($els);
    if (Object.keys(errors).length) return showErrors($els, errors);

    request(formValues, {
      ok: function ok(response) {
        const data = response.data;
        const details = data.details;
        if (data.ok) {
          const post = details.post;
          // we use this flag to preserve the open state of the short update form
          // after the turbo visit reload of the page.
          window._keepShortUpdateOpen = true;
          $(document).trigger("haptic:add-toast", {
            content: "Post published successfully 🎉",
            type: "success",
          });
          turbo.actions.visit(window.location.pathname, { action: "replace" });
        }
      },
      fail: function fail(err) {
        if (err.response && err.response.status === 400) {
          $(document).trigger("haptic:add-toast", {
            content: err.response.data.err,
            type: "error",
          });
        }
      },
    });
  }

  function extractFormValues() {
    const text = $els.$text.val();
    const uploadedImage = $els.$uploadedImg.val();
    const productId = $els.$productIdInput.val();
    const csrf = $els.$csrf.val();
    return {
      text: text,
      image: uploadedImage,
      productId: productId,
      csrf: csrf,
    };
  }

  function hideErrors($els) {
    $els.$text.removeClass("error-field");
    $els.$textError.addClass("hidden");
  }

  function showErrors($els, errors) {
    if (errors.text) {
      $els.$text.addClass("error-field");
      $els.$textError.html(errors.text);
      $els.$textError.removeClass("hidden");
    }
  }

  function validateFormValues(formValues) {
    var errors = {};
    if (formValues.text.length < 2) {
      errors.text = "OK, but what's the meaning, tho 🤔";
    }
    if (formValues.text.length > 300) {
      errors.text = "Text is too long. Maximum symbols allowed: 300";
    }
    if (isNaN(formValues.productId)) {
      errors.productId = {
        productId:
          "Hmm, it seems like something is broken. There's no productId.",
      };
    }
    return errors;
  }

  function request(data, opts) {
    return req(
      `/post/${data.productId}/text`,
      data,
      Object.assign(opts, { method: "post" })
    );
  }

  function onUploadImageBtnClick($els) {
    $els.$fileUpload.trigger("click");
  }

  function onFileSelected() {
    const image = this.files[0];
    if (!validateImageFiletype(image)) {
      return $(document).trigger("haptic:add-toast", {
        content: "Invalid file format",
        type: "error",
      });
    }

    $els.$uploadImgBtn.attr("disabled", "disabled");
    $els.$submit.attr("disabled", "disabled");
    if ($els.$loader) $els.$loader.removeClass("hidden");

    uploadImageToServer(image, {
      ok: function ok(data) {
        $(document).trigger("haptic:short-update-img-uploaded", { data });
        // emitter.emit(emitter.events.imageUploaded, data);
      },
      fail: function fail(err) {
        if ($els.$loader) $els.$loader.addClass("hidden");
        if ($els.$subtmi) $els.submit.removeAttr("disabled");
        $els.$uploadImgBtn.removeAttr("disabled");
        return $(document).trigger("haptic:add-toast", {
          content: err.response.data.err,
          type: "error",
        });
      },
    });
  }

  function validateImageFiletype(image) {
    var filetypeWhitelist = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/gif",
    ];
    return filetypeWhitelist.includes(image.type);
  }

  function uploadImageToServer(image, opts) {
    var formData = new FormData();
    formData.append("image", image);
    return req(
      "/upload-image",
      formData,
      Object.assign(
        {
          method: "post",
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
        opts
      )
    );
  }

  let $els = {};
  turbo.load(() => {
    const $allTriggers = $("[data-post-type-trigger]");
    const $root = $(`[data-post-type="short-update"]`);
    const $trigger = $(`[data-post-type-trigger="short-update"]`);
    const $postTypesContainer = $("[data-post-types-container]");
    $els = {
      $root,
      $trigger,
      $allTriggers,
      $postTypesContainer,
      $form: $root.find("form"),
      $csrf: $root.find('input[name="csrf"]'),
      $submit: $root.find(`button[type="submit"]`),
      $uploadImgBtn: $root.find(`[data-upload-image-btn]`),
      $cancelBtn: $root.find(`[data-post-type-cancel]`),
      $text: $root.find("[data-text]"),
      $textError: $root.find("[data-error]"),
      $uploadedImg: $root.find("[data-uploaded]"),
      $loader: $root.find("[data-image-upload-loader]"),
      $preview: $root.find("[data-upload-image-preview]"),
      $fileUpload: $root.find("[data-upload-file]"),
      $postsContainer: $root.find("[data-posts-container]"),
      $noPostsMsg: $root.find("[data-no-posts-msg]"),
      $productIdInput: $root.find("input[name=id]"),
      $postTpl: $("[data-post-tpl]"),
    };

    $trigger.on("click", activate.bind(null, $els));
    if (window._keepShortUpdateOpen) {
      window._keepShortUpdateOpen = false;
      activate($els);
    }
  });

  turbo.beforeCache(() => {
    clear($els);
    if (!window._keepShortUpdateOpen) {
      close($els);
    }
  });
}
