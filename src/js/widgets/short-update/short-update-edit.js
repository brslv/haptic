import { $, turbo, req } from "../../utils";
import * as shortUpdateUtils from "./utils";

export default function shortUpdateEdit() {
  function activate($els) {
    console.log("activating short update create");

    shortUpdateUtils.registerForm({
      $form: $els.$form,
      $uploadImgBtn: $els.$uploadImgBtn,
      $fileUpload: $els.$fileUpload,
      onFormSubmit: onFormSubmit.bind(null, $els), // @Todo
      onUploadImageBtnClick: onUploadImageBtnClick.bind(null, $els), // @Todo
      onFileSelected: onFileSelected, // @Todo
      onImageUploaded: onImageUploaded.bind(null, $els), // @Todo
    });
  }

  function clear($els) {
    console.log("clearing short update edit");
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
      $text: $root.find("[data-text]"),
      $textError: $root.find("[data-error]"),
      $uploadedImg: $root.find("[data-uploaded]"),
      $loader: $root.find("[data-image-upload-loader]"),
      $preview: $root.find("[data-upload-image-preview]"),
      $fileUpload: $root.find("[data-upload-file]"),
      $postsContainer: $root.find("[data-posts-container]"),
      $noPostsMsg: $root.find("[data-no-posts-msg]"),
      $productIdInput: $root.find("input[name=id]"),
    };

    activate($els);
  });

  turbo.beforeCache(() => {
    clear($els);
  });
}
