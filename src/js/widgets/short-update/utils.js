import { $, req } from "../../utils";

export function registerForm({
  $form,
  $uploadImgBtn,
  $fileUpload,
  onFormSubmit,
  onUploadImageBtnClick,
  onFileSelected,
  onImageUploaded,
}) {
  $form.on("submit", function(e) {
    e.preventDefault();
    onFormSubmit();
  });
  $uploadImgBtn.on("click", function(e) {
    onUploadImageBtnClick();
  });
  $fileUpload.on("change", onFileSelected);
  $(document).on("haptic:short-update-img-uploaded", onImageUploaded);
}

export function onFormSubmit({
  formValuesExtractorFn,
  validatorFn,
  hideErrorsFn,
  showErrorsFn,
  requestFn,
  onOk,
  onFail,
}) {
  const formValues = formValuesExtractorFn();
  const errors = validatorFn(formValues);

  hideErrorsFn();
  if (Object.keys(errors).length) return showErrorsFn(errors);

  requestFn(formValues, {
    ok: onOk,
    fail: onFail,
  });
}

export function extractFormValues({
  $text,
  $uploadedImg,
  $productIdInput,
  $csrf,
}) {
  const text = $text.val();
  const uploadedImage = $uploadedImg.val();
  const productId = $productIdInput.val();
  const csrf = $csrf.val();
  return {
    text: text,
    image: uploadedImage,
    productId: productId,
    csrf: csrf,
  };
}

export function validateFormValues(formValues) {
  var errors = {};
  if (formValues.text.length < 2) {
    errors.text = "Post is too short";
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

export function hideErrors($els) {
  $els.$text.removeClass("error-field");
  $els.$textError.addClass("hidden");
}

export function showErrors($els, errors) {
  if (errors.text) {
    $els.$text.addClass("error-field");
    $els.$textError.html(errors.text);
    $els.$textError.removeClass("hidden");
  }
}

export function onUploadImageBtnClick($els) {
  $els.$fileUpload.trigger("click");
}

export function onFileSelected($els, e) {
  const image = e.currentTarget.files[0];

  console.log(image);
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
  var filetypeWhitelist = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
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

export function onImageUploaded($els, e, data) {
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

export function clearImagePreview($els) {
  if ($els.$loader) $els.$loader.addClass("hidden");
  if ($els.$submit) $els.$submit.removeAttr("disabled");
  if ($els.$preview) {
    $els.$preview.html("");
    $els.$preview.hide();
  }
  $els.$uploadedImg.val("");
  $els.$uploadImgBtn.removeAttr("disabled");
}
