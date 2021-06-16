import { $, turbo, req } from "../../../utils";
import createPostTypesUtil from "../utils";

export default function pollForm() {
  const detailsToggleClasses =
    "bg-red-50 hover:bg-red-100 border-red-50 hover:border-red-100";
  function activate($els, postTypesUtil) {
    if ($els.$root.hasClass("hidden")) {
      open($els, postTypesUtil);
      registerCancel($els, postTypesUtil);
      registerSubmitEventHooks($els, postTypesUtil);
    }
  }

  function open($els, postTypesUtil) {
    postTypesUtil.openPostType($els.$root, $els.$question);

    $els.$addOptionBtn.on("click", onAddOptionBtnClick.bind(null, $els));
    $els.$addDetailsBtn.on("click", toggleDetails.bind(null, $els));
    $els.$form.on("submit", onFormSubmit.bind(null, $els));
  }

  function toggleDetails($els, e) {
    if ($els.$addDetailsBtn.text() === "Add details") openDetails($els);
    else closeDetails($els);
  }

  function openDetails($els) {
    $els.$detailsContainer.show();
    $els.$details.trigger("focus");
    $els.$addDetailsBtn.text("Remove details");
    $els.$addDetailsBtn.addClass(detailsToggleClasses);
  }

  function closeDetails($els) {
    $els.$detailsContainer.hide();
    $els.$details.val("");
    $els.$addDetailsBtn.text("Add details");
    $els.$addDetailsBtn.removeClass(detailsToggleClasses);
  }

  function onAddOptionBtnClick($els, e) {
    const $option = createOption("");
    const $input = $option.find("input");

    $option.insertBefore($els.$addOptionBtn);
    $input.trigger("focus");
    $input.on("keydown", onOptionInputKey.bind(null, $els));
  }

  function createOption(value) {
    const optionId = Math.random().toString();
    const $option = $(
      `
      <div class="relative flex items-center mb-2" data-option-input-container>
        <input data-option-id=${optionId} class="input" value="${value}" placeholder="..." data-option-input />
        <button type="button" data-delete-option="${optionId}" class="ml-2 py-3 btn bg-red-50 hover:bg-red-100 focus:bg-red-100">Delete</button>
      </div>
      `
    );
    const $delBtn = $option.find("[data-delete-option]");
    $delBtn.on("click", deleteOption.bind(null, $option));

    return $option;
  }

  function deleteOption($option) {
    $option.remove();
  }

  function onOptionInputKey($els, e) {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function onFormSubmit($els, e) {
    e.preventDefault();

    $(document).trigger("haptic:poll-submit-start");

    const csrf = $els.$csrf.val();
    const question = $els.$question.val();
    const details = $els.$details.val();
    const options = $els.$form
      .find("[data-option-input]")
      .map((i, el) => $(el).val())
      .filter((_, v) => v.length > 0)
      .get();

    const data = {
      csrf,
      question,
      details,
      options,
    };

    const errors = {}; // validateInput(data);
    clearErrors();
    if (Object.keys(errors).length) {
      $(document).trigger("haptic:poll-submit-suspended", {
        validationErrors: errors,
      });
      return showErrors($els, errors);
    }

    const reqOpts = {
      method: "post",
      ok: function (response) {
        $(document).trigger("haptic:poll-submit-end", { response });
      },
      fail: function (err) {
        $(document).trigger("haptic:poll-submit-end", { err });
      },
    };

    const productId = $els.$productIdInput.val();
    req(`/post/${productId}/poll`, data, reqOpts);
  }

  function validateInput(data) {
    const errors = {};

    if (data.question.trim().length < 10) {
      errors.question = "Question is too short.";
    }
    if (data.options.length < 2) {
      errors.options = "Make sure your poll has at least 2 vote options.";
    }

    return errors;
  }

  function clearErrors() {
    $("[data-error]").remove();

    $els.$question.removeClass("border-red-500");
  }

  function showErrors($els, errors) {
    // show errors
    function createErrorElem(err) {
      return $(
        `<div data-error class="text-red-500 text-xs mt-1">${err}</div>`
      );
    }

    if (errors.question) {
      // $els.$question.
      $els.$question.addClass("border-red-500");
      createErrorElem(errors.question).appendTo($els.$questionErrors);
    }

    if (errors.options) {
      createErrorElem(errors.options).appendTo($els.$optionsErrors);
    }
  }

  function registerCancel($els, postTypesUtil) {
    $els.$cancelBtn.on("click", function () {
      close($els, postTypesUtil);
      $(this).off("click");
    });
  }

  function registerSubmitEventHooks($els, postTypesUtil) {
    const borderClasses = "border-yellow-300 hover:border-yellow-400";

    const lockInteractions = () => {
      $els.$submitBtn.attr("disabled", "disabled");
      $els.$addDetailsBtn.attr("disabled", "disabled");
      $("[data-option-delete-btn]").attr("disabled", "disabled");
      $els.$submitBtn.removeClass(borderClasses);
    };

    const unlockInteractions = () => {
      $els.$submitBtn.removeAttr("disabled");
      $els.$addDetailsBtn.removeAttr("disabled");
      $("[data-option-delete-btn]").removeAttr("disabled");
      $els.$submitBtn.addClass(borderClasses);
    };

    $(document).on("haptic:poll-submit-start", function (e) {
      lockInteractions();
    });

    $(document).on("haptic:poll-submit-suspended", function (e, data) {
      unlockInteractions();
    });

    $(document).on("haptic:poll-submit-end", function (e, data) {
      unlockInteractions();

      const response = data.response;
      const err = data.err;

      if (response) {
        clearForm($els);
        close($els, postTypesUtil);

        $(document).trigger("haptic:add-toast", {
          content: "Poll created successfully",
          type: "success",
        });
        turbo.actions.visit(window.location.pathname, {
          action: "replace",
        });
      } else if (err) {
        console.log({ err });
      }
    });
  }

  function clearForm($els) {
    $els.$question.val("");
    $("[data-option-input-container]").remove();
    closeDetails($els);
  }

  function close($els, postTypesUtil) {
    postTypesUtil.closePostType($els.$root, $els.$trigger);
    clearForm($els);
    clear($els);
  }

  function clear($els) {
    $("[data-option-input]").off("click");
    $("[data-delete-option]").off("click");
    $els.$addOptionBtn.off("click");
    $els.$addDetailsBtn.off("click");
    $els.$form.off("submit");
  }

  let $els = {};
  turbo.load(() => {
    const postTypesUtil = createPostTypesUtil();
    const $allTriggers = $("[data-post-type-trigger]");
    const $root = $(`[data-post-type="poll"]`);
    const $trigger = $(`[data-post-type-trigger="poll"]`);
    const $form = $root.find("form");
    $els = {
      $root,
      $form,
      $trigger,
      $allTriggers,
      $csrf: $form.find('input[name="csrf"]'),
      $cancelBtn: $root.find(`[data-post-type-cancel]`),
      $question: $form.find("[data-poll-question]"),
      $questionErrors: $form.find("[data-question-errors]"),
      $details: $form.find("[data-poll-details]"),
      $addOptionBtn: $form.find("[data-add-option-btn]"),
      $optionsContainer: $form.find("[data-poll-options-container]"),
      $optionsErrors: $form.find("[data-options-errors]"),
      $detailsContainer: $form.find("[data-details-container]"),
      $addDetailsBtn: $form.find("[data-add-details-btn]"),
      $submitBtn: $form.find('button[type="submit"]'),
      $productIdInput: $form.find('input[name="id"]'),
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
