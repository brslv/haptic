import { $, turbo, req } from "../../../utils";
import * as shortUpdateUtils from "./utils";

export default function shortUpdateEdit() {
  function activate($els, $triggerEl) {
    const postId = $triggerEl.data("post-id");
    const text = $triggerEl.data("text");
    const img = $triggerEl.data("img");

    // populate the update form
    $els.$text.val(text);
    if (img) $els.$uploadedImg.val(img);
    if (img) shortUpdateUtils.previewImage(img, $els);
    else shortUpdateUtils.clearImagePreview($els);

    const extractorFn = shortUpdateUtils.extractFormValues.bind(null, {
      $text: $els.$text,
      $uploadedImg: $els.$uploadedImg,
      $productIdInput: $els.$productIdInput,
      $csrf: $els.$csrf,
    });

    shortUpdateUtils.registerForm({
      $form: $els.$form,
      $text: $els.$text,
      $symbolsCounter: $els.$symbolsCounter,
      $uploadImgBtn: $els.$uploadImgBtn,
      $previewBtn: $els.$previewBtn,
      $continueEditingBtn: $els.$continueEditingBtn,
      $fileUpload: $els.$fileUpload,
      onFormSubmit: shortUpdateUtils.onFormSubmit.bind(null, {
        formValuesExtractorFn: extractorFn,
        validatorFn: shortUpdateUtils.validateFormValues,
        hideErrorsFn: shortUpdateUtils.hideErrors.bind(null, $els),
        showErrorsFn: shortUpdateUtils.showErrors.bind(null, $els),
        requestFn: request.bind(null, postId),
        onOk: function ok(response) {
          const data = response.data;
          if (data.ok) {
            $(document).trigger("haptic:add-toast", {
              content: "Post updated successfully 🎉",
              type: "success",
            });
            turbo.actions.visit(window.location.pathname, {
              action: "replace",
            });
          }
        },
        onFail: function fail(err) {
          if (err.response && err.response.status === 400) {
            $(document).trigger("haptic:add-toast", {
              content: err.response.data.err,
              type: "error",
            });
          }
        },
      }),
      onUploadImageBtnClick: shortUpdateUtils.onUploadImageBtnClick.bind(
        null,
        $els
      ),
      onFileSelected: shortUpdateUtils.onFileSelected.bind(null, $els),
      onImageUploaded: shortUpdateUtils.onImageUploaded.bind(null, $els),
      onPreview: shortUpdateUtils.onPreview.bind(null, {
        $continueEditingBtn: $els.$continueEditingBtn,
        $previewBtn: $els.$previewBtn,
        formValuesExtractorFn: extractorFn,
        $previewPost: $els.$previewPost,
        $formContents: $els.$formContents,
      }),
      onContinueEditing: shortUpdateUtils.onContinueEditing.bind(null, {
        $previewBtn: $els.$previewBtn,
        $continueEditingBtn: $els.$continueEditingBtn,
        formValuesExtractorFn: extractorFn,
        $previewPost: $els.$previewPost,
        $formContents: $els.$formContents,
      }),
      imageUploadedEventName: "haptic:short-update:img-uploaded-edit",
    });
  }

  function request(postId, data, opts) {
    return req(
      `/post/${postId}`,
      data,
      Object.assign(opts, { method: "post" })
    );
  }

  function clear($els) {
    shortUpdateUtils.unregisterForm({
      $previewBtn: $els.$previewBtn,
      $continueEditingBtn: $els.$continueEditingBtn,
      $form: $els.$form,
      $text: $els.$text,
      $symbolsCounter: $els.$symbolsCounter,
      $uploadImgBtn: $els.$uploadImgBtn,
      $fileUpload: $els.$fileUpload,
      imageUploadedEventName: "haptic:short-update:img-uploaded-edit",
    });
  }

  let $els = {};
  turbo.load(() => {
    const $root = $(`[data-post-type="short-update-edit"]`);
    $els = {
      $root,
      $form: $root.find("form"),
      $csrf: $root.find('input[name="csrf"]'),
      $submit: $root.find(`button[type="submit"]`),
      $uploadImgBtn: $root.find(`[data-upload-image-btn]`),
      $previewBtn: $root.find(`[data-preview-btn]`),
      $continueEditingBtn: $root.find(`[data-continue-editing-btn]`),
      $previewPost: $root.find(`[data-preview]`),
      $formContents: $root.find(`[data-form-contents]`),
      $text: $root.find("[data-text]"),
      $symbolsCounter: $root.find("[data-short-update-edit-symbols-counter]"),
      $textError: $root.find("[data-error]"),
      $uploadedImg: $root.find("[data-uploaded]"),
      $loader: $root.find("[data-image-upload-loader]"),
      $preview: $root.find("[data-upload-image-preview]"),
      $fileUpload: $root.find("[data-upload-file]"),
      $postsContainer: $root.find("[data-posts-container]"),
      $noPostsMsg: $root.find("[data-no-posts-msg]"),
      $productIdInput: $root.find("input[name=id]"),
    };

    $(document).on("haptic:modal-open", function onModalOpen(e, data) {
      const { $modal, $triggerEl, modalName } = data;
      if (modalName === "edit-post") {
        activate($els, $triggerEl);
        if ($els.$text) $els.$text.trigger("focus").trigger("change");
      }
    });

    $(document).on("haptic:modal-close", function onModalClose(e, data) {
      const { $modal, $triggerEl, modalName } = data;
      if (modalName === "edit-post") {
        clear($els, $triggerEl);
      }
    });
  });

  turbo.beforeCache(() => {
    clear($els);
  });
}
