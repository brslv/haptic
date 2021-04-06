import { $, turbo, req } from "../utils";

export default function payments() {
  function load($els) {
    createCustomerForm($els);
  }

  function createCustomerForm($els) {
    $els.$createCustomerForm.on(
      "submit",
      onCreateCustomerFormSubmit.bind(null, $els)
    );
  }

  function onCreateCustomerFormSubmit($els, e) {
    e.preventDefault();
    const email = $els.$email.val();
    const method = $els.$createCustomerForm.attr("method").toLowerCase();
    const action = $els.$createCustomerForm.attr("action");

    $els.$submit.attr("disabled", "disabled");

    req(
      action,
      { email },
      {
        method,
        ok: function(response) {
          $els.$createCustomerForm.removeAttr("disabled");

          turbo.actions.visit(window.location.href, { action: "replace" });
        },
        fail: function(err) {
          console.error(err);
        },
      }
    );
  }

  const $els = {};
  turbo.load(() => {
    const $createCustomerForm = $("[data-create-customer-form]"),
      $els = {
        $createCustomerForm,
        $email: $createCustomerForm.find("[data-create-customer-email]"),
        $submit: $createCustomerForm.find('button[type="submit"]'),
      };

    load($els);
  });
}
