import { $, turbo, req } from "../../utils";
import * as shortUpdateUtils from "./utils";

export default function shortUpdateCreate() {
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

    shortUpdateUtils.registerForm({
      $form: $els.$form,
      $uploadImgBtn: $els.$uploadImgBtn,
      $fileUpload: $els.$fileUpload,
      onFormSubmit: shortUpdateUtils.onFormSubmit.bind(null, {
        formValuesExtractorFn: shortUpdateUtils.extractFormValues.bind(null, {
          $text: $els.$text,
          $uploadedImg: $els.$uploadedImg,
          $productIdInput: $els.$productIdInput,
          $csrf: $els.$csrf,
        }),
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
            window._keepShortUpdateOpen = true;
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
      imageUploadedEventName: "haptic:short-update:img-uploaded-create",
    });
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
    shortUpdateUtils.clearImagePreview($els);
    shortUpdateUtils.unregisterForm({
      $form: $els.$form,
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
    const $allTriggers = $("[data-post-type-trigger]");
    const $root = $(`[data-post-type="short-update-create"]`);
    const $trigger = $(`[data-post-type-trigger="short-update-create"]`);
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
