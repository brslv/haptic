import { $, turbo, req } from "../utils";

export default function payments() {
  function loadCreateCustomerForm($els) {
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

  function loadPaymentForm($els) {
    if (!window.___spk___) {
      $(document).trigger("haptic:add-toast", {
        content: "Invalid/missing spk.",
        type: "error",
      });
      console.error("Invalid/missing spk.");
      return;
    }

    function updateErrors($els, e) {
      $els.$errorsContainer.text(e.error ? e.error.message : "");
    }

    // create the stripe elements
    let stripe = window.Stripe(window.___spk___);
    let elements = stripe.elements();
    let card = elements.create("card", {
      classes: { base: "input px-4 py-4" },
      style: {
        base: { fontSize: `16px` },
      },
    });

    card.on("change", updateErrors.bind(null, $els));
    card.mount("#card-element");
  }

  // setup ---------------------------------------------------------------------

  let $createCustomerFormEls = {};
  let $paymentFormEls = {};
  turbo.load(() => {
    if (window.location.pathname !== "/checkout") return;

    const $createCustomerForm = $("[data-create-customer-form]");
    $createCustomerFormEls = {
      $createCustomerForm,
      $email: $createCustomerForm.find("[data-create-customer-email]"),
      $submit: $createCustomerForm.find('button[type="submit"]'),
    };

    loadCreateCustomerForm($createCustomerFormEls);

    if (!$createCustomerForm.length) {
      $paymentFormEls = {
        $errorsContainer: $("#card-element-errors"),
      };
      loadPaymentForm($paymentFormEls);
    }
  });
}
