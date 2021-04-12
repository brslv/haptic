import { $, turbo, req } from "../utils";

export default function waitlistForm() {
  function load($els) {
    $els.$form.on("submit", onSubmit.bind(undefined, $els));
  }

  function onSubmit($els, e) {
    e.preventDefault();

    const $form = $(e.currentTarget);
    const $input = $form.find("input");

    if (!$input.length) return;

    const email = $input.val();

    if (!email) {
      return;
    }
    req(
      "/sub",
      { email },
      {
        method: "post",
        ok: function(response) {
          if (response.data.ok) {
            $(document).trigger("haptic:add-toast", {
              content: response.data.details.msg,
              type: "success",
            });
            $input.val("");
          }
        },
        fail: function(err) {
          if (err.response && err.response.data && err.response.data.err)
            $(document).trigger("haptic:add-toast", {
              content: err.response.data.err,
              type: "error",
            });
        },
      }
    );
  }

  function clear($els) {
    $els.$form.off("submit");
  }

  let $els = {};
  turbo.load(() => {
    $els = {
      $form: $("[data-waitlist-form]"),
    };

    load($els);
  });

  turbo.beforeCache(() => {
    clear($els);
  });
}
