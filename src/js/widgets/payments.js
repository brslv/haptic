import { $, turbo, req } from "../utils";

export default function payments() {
  function loadPaymentForm($els, stripe) {
    if (!window.___spk___ || !window.___selectedPriceId___) {
      $(document).trigger("haptic:add-toast", {
        content: "Invalid payment configuration detected.",
        type: "error",
      });
      console.error("Invalid payment configuration. Missing spk/priceId.");
      $els.$invalidPaymentConfig.removeClass("hidden");
      $els.$form.remove();
      return;
    }

    function updateCardErrors($els, e) {
      $els.$cardErrorsContainer.text(e.error ? e.error.message : "");
    }

    function updateEmailErrors($els, e) {
      const email = $els.$email.val();
      $els.$emailErrorsContainer.text(!email.length ? "Invalid email" : "");
    }

    // create the stripe elements
    const elements = stripe.elements();
    const card = elements.create("card", {
      classes: { base: "input px-4 py-4" },
      style: {
        base: { fontSize: `16px` },
      },
    });

    card.on("change", updateCardErrors.bind(null, $els));
    $els.$email.on("blur", updateEmailErrors.bind(null, $els));
    $els.$form.on("submit", onPaymentFormSubmit.bind(null, card, $els, stripe));

    card.mount("#card-element");
  }

  function onPaymentFormSubmit(card, $els, stripe, e) {
    e.preventDefault();

    const email = $els.$email.val();

    $els.$submit.attr("disabled", "disabled");
    $els.$cardElement.addClass("hidden");
    $els.$submitButtonLabel.addClass("hidden");
    $els.$loaders.removeClass("hidden");

    // core payment flow
    createCustomer($els, card, email)
      .then((data) => createPaymentMethod(stripe, data))
      .then(createSubscription)
      .then((data) => handlePaymentThatRequiresCustomerAction(stripe, data))
      .then(handleRequiresPaymentMethod)
      .then((data) => onSubscriptionComplete($els, data))
      .catch((data) => onSubscriptionFail($els, data))
      .finally(() => {});
  }

  function createCustomer($els, card, email) {
    const method = "post";
    const action = "/create-customer";

    return new Promise((res, rej) => {
      req(
        action,
        { email },
        {
          method,
          ok: function(response) {
            const customer = response.data.details.customer;
            res({ card, customer });
          },
          fail: function(err) {
            rej(err);
          },
        }
      );
    });
  }

  function createPaymentMethod(stripe, { card, customer }) {
    return new Promise((res, rej) => {
      // Set up payment method for recurring usage
      // let billingName = document.querySelector('#name').value;
      const priceId = window.___selectedPriceId___;
      const customerId = customer.id;

      stripe
        .createPaymentMethod({
          type: "card",
          card: card,
          // billing_details: {
          //   name: billingName,
          // },
        })
        .then((result) => {
          if (result.error) {
            rej(result);
          } else {
            res({
              customerId: customerId,
              paymentMethodId: result.paymentMethod.id,
              priceId: priceId,
            });
          }
        });
    });
  }

  function createSubscription({ customerId, paymentMethodId, priceId }) {
    return new Promise((res, rej) => {
      return req(
        "/create-subscription",
        {
          customerId: customerId,
          paymentMethodId: paymentMethodId,
          priceId: priceId,
        },
        {
          method: "post",
          ok: function(result) {
            if (result.error) {
              // The card had an error when trying to attach it to a customer.
              rej(result);
            } else {
              res({
                paymentMethodId: paymentMethodId,
                priceId: priceId,
                subscription: result.data.details.subscription,
              });
            }
          },
          fail: function(err) {
            rej(err);
          },
        }
      );
    });
  }

  function handlePaymentThatRequiresCustomerAction(
    stripe,
    { subscription, invoice, priceId, paymentMethodId, isRetry }
  ) {
    return new Promise((res, rej) => {
      if (subscription && subscription.status === "active") {
        // Subscription is active, no customer actions required.
        return res({
          ok: true,
          subscription,
          priceId,
          paymentMethodId,
        });
      }

      // If it's a first payment attempt, the payment intent is on the subscription latest invoice.
      // If it's a retry, the payment intent will be on the invoice itself.
      let paymentIntent = invoice
        ? invoice.payment_intent
        : subscription.latest_invoice.payment_intent;

      if (
        paymentIntent.status === "requires_action" ||
        (isRetry === true && paymentIntent.status === "requires_payment_method")
      ) {
        stripe
          .confirmCardPayment(paymentIntent.client_secret, {
            payment_method: paymentMethodId,
          })
          .then((result) => {
            if (result.error) {
              return rej(result);
            } else {
              if (result.paymentIntent.status === "succeeded") {
                // All went well
                return res({
                  ok: true, // signal the onSubscriptionComplete that it all went ok
                  priceId: priceId,
                  subscription: subscription,
                  invoice: invoice,
                  paymentMethodId: paymentMethodId,
                });
              }
            }
          });
      } else {
        // No customer action needed.
        return res({ ok: true, subscription, priceId, paymentMethodId });
      }
    });
  }

  function handleRequiresPaymentMethod({
    subscription,
    paymentMethodId,
    priceId,
  }) {
    return new Promise((res, rej) => {
      if (subscription.status === "active") {
        // subscription is active, no customer actions required.
        res({ ok: true, subscription, priceId, paymentMethodId });
      } else if (
        subscription.latest_invoice.payment_intent.status ===
        "requires_payment_method"
      ) {
        // Using localStorage to manage the state of the retry here,
        // feel free to replace with what you prefer.
        // Store the latest invoice ID and status.
        localStorage.setItem("latestInvoiceId", subscription.latest_invoice.id);
        localStorage.setItem(
          "latestInvoicePaymentIntentStatus",
          subscription.latest_invoice.payment_intent.status
        );
        rej({ error: { message: "Your card was declined." } });
      } else {
        res({ ok: true, subscription, priceId, paymentMethodId });
      }
    });
  }

  function onSubscriptionComplete($els, result) {
    turbo.actions.clearCache();
    turbo.actions.visit("/checkout?ok=1", { action: "replace" });
  }

  function onSubscriptionFail($els, err) {
    if (err.error.message) {
      $(document).trigger("haptic:add-toast", {
        content: err.error.message,
        type: "error",
      });
    }

    $els.$submit.removeAttr("disabled");
    $els.$cardElement.removeClass("hidden");
    $els.$submitButtonLabel.removeClass("hidden");
    $els.$loaders.addClass("hidden");
  }

  // setup ---------------------------------------------------------------------

  let $paymentFormEls = {};
  let stripe;
  turbo.load(() => {
    if (
      window.location.pathname !== "/checkout" ||
      window.location.search === "?ok=1"
    )
      return;
    stripe = window.Stripe(window.___spk___);
    $paymentFormEls = {
      $form: $("#payment-form"),
      $submit: $('#payment-form button[type="submit"]'),
      $submitButtonLabel: $("#payment-form [data-submit-button-label]"),
      $loaders: $("#payment-form [data-loader]"),
      $cardElement: $("#card-element"),
      $cardErrorsContainer: $("#card-element-errors"),
      $emailErrorsContainer: $("#email-errors"),
      $email: $("[data-billing-email]"),
      $invalidPaymentConfig: $("[data-invalid-payment-config]"),
    };
    loadPaymentForm($paymentFormEls, stripe);
  });
}
