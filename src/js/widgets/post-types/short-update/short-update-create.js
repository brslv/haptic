import { $, turbo, req } from "../../../utils";
import createPostTypesUtil from "../utils";
import * as shortUpdateUtils from "./utils";

export default function shortUpdateCreate() {
  function activate($els, postTypesUtil) {
    if ($els.$root.hasClass("hidden")) {
      open($els, postTypesUtil);
      registerCancel($els, postTypesUtil);
    }
  }

  function open($els, postTypesUtil) {
    postTypesUtil.openPostType($els.$root, $els.$text);

    const extractorFn = shortUpdateUtils.extractFormValues.bind(null, {
      $text: $els.$text,
      $uploadedImg: $els.$uploadedImg,
      $productIdInput: $els.$productIdInput,
      $csrf: $els.$csrf,
    });

    shortUpdateUtils.registerForm({
      $form: $els.$form,
      $text: $els.$text,
      $previewBtn: $els.$previewBtn,
      $continueEditingBtn: $els.$continueEditingBtn,
      $symbolsCounter: $els.$symbolsCounter,
      $uploadImgBtn: $els.$uploadImgBtn,
      $fileUpload: $els.$fileUpload,
      onFormSubmit: shortUpdateUtils.onFormSubmit.bind(null, {
        formValuesExtractorFn: extractorFn,
        validatorFn: shortUpdateUtils.validateFormValues,
        hideErrorsFn: shortUpdateUtils.hideErrors.bind(null, $els),
        showErrorsFn: shortUpdateUtils.showErrors.bind(null, $els),
        requestFn: request,
        onOk: function ok(response) {
          const data = response.data;
          const details = data.details;
          if (data.ok) {
            const post = details.post;
            // we use this flag to preserve the open state of the short update form
            // after the turbo visit reload of the page.
            window._keepPostTypeOpen = true;
            $(document).trigger("haptic:add-toast", {
              content: "Post published successfully 🎉",
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
        $previewBtn: $els.$previewBtn,
        $continueEditingBtn: $els.$continueEditingBtn,
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
      imageUploadedEventName: "haptic:short-update:img-uploaded-create",
    });
  }

  function registerCancel($els, postTypesUtil) {
    $els.$cancelBtn.on("click", function() {
      close($els, postTypesUtil);
      $(this).off("click");
    });
  }

  function close($els, postTypesUtil) {
    postTypesUtil.closePostType($els.$root, $els.$trigger);

    // el hidden

    $(document).off("haptic:short-update-img-uploaded");
    $els.$form.off("submit");
    $els.$uploadImgBtn.off("click");
    $els.$fileUpload.off("change");
  }

  function clear($els) {
    $els.$text.val("");
    shortUpdateUtils.clearImagePreview($els);
    shortUpdateUtils.unregisterForm({
      $previewBtn: $els.$previewBtn,
      $continueEditingBtn: $els.$continueEditingBtn,
      $form: $els.$form,
      $text: $els.$text,
      $symbolsCounter: $els.$symbolsCounter,
      $uploadImgBtn: $els.$uploadImgBtn,
      $fileUpload: $els.$fileUpload,
      imageUploadedEventName: "haptic:short-update:img-uploaded-create",
    });
  }

  function request(data, opts) {
    return req(
      `/post/${data.productId}/text`,
      data,
      Object.assign(opts, { method: "post" })
    );
  }

  let $els = {};
  turbo.load(() => {
    const postTypesUtil = createPostTypesUtil();
    const $allTriggers = $("[data-post-type-trigger]");
    const $root = $(`[data-post-type="short-update-create"]`);
    const $trigger = $(`[data-post-type-trigger="short-update-create"]`);
    $els = {
      $root,
      $trigger,
      $allTriggers,
      $form: $root.find("form"),
      $symbolsCounter: $root.find("[data-short-update-create-symbols-counter]"),
      $csrf: $root.find('input[name="csrf"]'),
      $submit: $root.find(`button[type="submit"]`),
      $uploadImgBtn: $root.find(`[data-upload-image-btn]`),
      $previewBtn: $root.find(`[data-preview-btn]`),
      $continueEditingBtn: $root.find(`[data-continue-editing-btn]`),
      $previewPost: $root.find(`[data-preview]`),
      $formContents: $root.find(`[data-form-contents]`),
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

    $trigger.on("click", activate.bind(null, $els, postTypesUtil));
    if (window._keepPostTypeOpen) {
      window._keepPostTypeOpen = false;
      activate($els, postTypesUtil);
    }
  });

  turbo.beforeCache(() => {
    const postTypesUtil = createPostTypesUtil();
    clear($els);
    if (!window._keepPostTypeOpen) {
      close($els, postTypesUtil);
    }
  });
}
