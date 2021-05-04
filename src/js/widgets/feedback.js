import { $, turbo, req } from "../utils";

export default function feedback() {
  function onOpen(data, $els) {
    function validate() {
      const text = $els.$text.val();
      if (!text.length) {
        $els.$submit.attr("disabled", "disabled");
        $els.$submit.addClass("disabled");
      } else {
        $els.$submit.removeAttr("disabled");
        $els.$submit.removeClass("disabled");
      }
    }

    $els.$text.on({ input: validate, blur: validate });
    $els.$form.on("submit", onFormSubmit.bind(null, $els));

    $els.$email.trigger("focus");
  }

  function onClose(data, $els) {
    $els.$form.off("submit");
  }

  function onFormSubmit($els, e) {
    e.preventDefault();
    const email = $els.$email.val();
    const type = $els.$type.val();
    const text = $els.$text.val();
    const csrf = $els.$csrf.val();

    req(
      "/feedback",
      { email, text, type, csrf },
      {
        method: "post",
        ok: (result) => {
          if (result.data.ok) {
            clearForm($els);
            $(document).trigger("haptic:close-modals");
            $(document).trigger("haptic:add-toast", {
              content: "Thank you for the feedback!",
              type: "success",
            });
          }
        },
        fail: function fail(err) {
          console.log("fail", err);
          $(document).trigger("haptic:add-toast", {
            content: "Something went wrong. Please, try again.",
            type: "error",
          });
        },
      }
    );
  }

  function onBeforeCache($els) {
    clearForm($els);
  }

  function clearForm($els) {
    $els.$email.val("");
    $els.$type.val("");
    $els.$text.val("");

    // to fire up the onOpen.validate,
    // which will properly reset the disabled attributes
    $els.$text.trigger("input");
  }

  let $els = {};
  turbo.load(() => {
    const $form = $("[data-feedback-form]");
    $els = {
      $form,
      $email: $("[data-feedback-email-input]", $form),
      $type: $("[data-feedback-type-input]", $form),
      $text: $("[data-feedback-text-input]", $form),
      $submit: $(`button[type="submit"]`, $form),
      $csrf: $('input[name="csrf"]', $form),
    };

    $(document).on("haptic:modal-open", function(e, data) {
      if (data.modalName === "feedback") {
        onOpen(data, $els);
      }
    });
    $(document).on("haptic:modal-close", function(e, data) {
      if (data.modalName === "feedback") {
        onClose(data, $els);
      }
    });
  });

  turbo.beforeCache(() => {
    $(document).off("haptic:modal-open");
    onBeforeCache($els);
  });
}
