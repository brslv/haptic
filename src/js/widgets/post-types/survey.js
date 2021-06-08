import { $, turbo } from "../../utils";
import createPostTypesUtil from "./utils";

export default function survey() {
  let optionsCount = 0;
  function activate($els, postTypesUtil) {
    if ($els.$root.hasClass("hidden")) {
      open($els, postTypesUtil);
      registerCancel($els, postTypesUtil);
    }
  }

  function open($els, postTypesUtil) {
    postTypesUtil.openPostType($els.$root, $els.$title);

    // $els.$addOptionInput.on("keyup", onOptionInputKey.bind(null, $els));
    $els.$addOptionInput.on("keydown", onOptionInputKey.bind(null, $els));
    $els.$addOptionBtn.on("click", onAddOptionBtnClick.bind(null, $els));
    $els.$addDetailsBtn.on("click", toggleDetails.bind(null, $els));
  }

  function toggleDetails($els, e) {
    $els.$detailsContainer.toggle();

    if ($els.$addDetailsBtn.text() === "Add details") {
      $els.$details.trigger("focus");
      $els.$addDetailsBtn.text("Close details");
    } else {
      $els.$addDetailsBtn.text("Add details");
    }
  }

  function onOptionInputKey($els, e) {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      addOption($els.$addOptionInput.val());
      $els.$addOptionInput.val("");
    }
  }

  function addOption(value) {
    const optionId = Math.random().toString();
    $els.$addOptionInput.trigger("focus");
    if (!value) return;

    const $option = $(
      `
      <div class="relative">
        <input data-option-id=${optionId} class="mt-2 input bg-white" value="${value}" data-option-input />
        <button type="button" data-delete-option="${optionId}" class="absolute top-4 right-2 btn btn-danger btn-small">Delete</button>
      </div>
      `
    );
    const $delBtn = $option.find("[data-delete-option]");
    $delBtn.on("click", deleteOption.bind(null, $option));
    $els.$optionsContainer.append($option);
    optionsCount++;

    if (optionsCount > 0) {
      $els.$noOptionsLabel.hide();
    }
  }

  function deleteOption($option) {
    $option.remove();
    optionsCount--;
    if (optionsCount === 0) {
      $els.$noOptionsLabel.show();
    }
  }

  function onAddOptionBtnClick($els, e) {
    const value = $els.$addOptionInput.val();
    addOption(value);
    $els.$addOptionInput.val("");
  }

  function registerCancel($els, postTypesUtil) {
    $els.$cancelBtn.on("click", function() {
      close($els, postTypesUtil);
      $(this).off("click");
    });
  }

  function close($els, postTypesUtil) {
    postTypesUtil.closePostType($els.$root, $els.$trigger);
  }

  function clear($els) {}

  let $els = {};
  turbo.load(() => {
    const postTypesUtil = createPostTypesUtil();
    const $allTriggers = $("[data-post-type-trigger]");
    const $root = $(`[data-post-type="survey"]`);
    const $trigger = $(`[data-post-type-trigger="survey"]`);
    const $form = $root.find("form");
    $els = {
      $root,
      $trigger,
      $allTriggers,
      $cancelBtn: $root.find(`[data-post-type-cancel]`),
      $title: $form.find("[data-survey-title]"),
      $details: $form.find("[data-survey-details]"),
      $addOptionInput: $form.find("[data-add-option-input]"),
      $addOptionBtn: $form.find("[data-add-option-btn]"),
      $optionsContainer: $form.find("[data-survey-options-container]"),
      $noOptionsLabel: $form.find("[data-no-options-label]"),
      $detailsContainer: $form.find("[data-details-container]"),
      $addDetailsBtn: $form.find("[data-add-details-btn]"),
    };

    $trigger.on("click", activate.bind(null, $els, postTypesUtil));
    if (window._keepPostTypeOpen) {
      window._keepPostTypeOpen = false;
      open($els, postTypesUtil);
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
