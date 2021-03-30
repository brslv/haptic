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

    req(
      "/feedback",
      { email, text, type },
      {
        method: "post",
        ok: (result) => {
          if (result.data.ok) {
            // emitter.emit(emitter.events.addToast, {
            //   type: "success",
            //   content: "Thank you for your feedback!",
            // });

            // emitter.emit(emitter.events.closeModal, { name: "feedback" });
            clearForm($els);
            $(document).trigger("haptic:close-modals");
          }
        },
        fail: function fail(err) {
          console.log("fail", err);
          // emitter.emit(emitter.events.addToast, {
          //   type: "error",
          //   content: "Oops, something went wrong. Please, try again.",
          // });
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
