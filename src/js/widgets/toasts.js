import { $, turbo } from "../utils"

export default function toasts() {
  function onAddToast(e, data) {
    console.log(e, data)
    const content = data.content
    const type = data.type || "default"
    const $tpl = $("[data-toast-tpl]")
    if (!$tpl) {
      console.warn("No toast tpl element.")
      return
    }
    const $root = $($tpl.html())

    const icon =
      type === "success"
        ? "[data-success-icon]"
        : type === "error"
        ? "[data-error-icon]"
        : null

    if (icon) $root.find(icon).removeClass("hidden")

    const randId = Math.random()
    $root.data("toastId", randId)

    const $content = $root.find("[data-toast-content]")
    $content.text(content)

    const $close = $root.find("[data-toast-close-btn]")
    $close.on("click", hideToast.bind(null, { id: randId }))

    setTimeout(function () {
      hideToast({ id: randId })
    }, 4000)

    $root.addClass("toast")
    $els.$toastsContainer.prepend($root)
    $root.addClass("toast-visible")

    function hideToast({ id }) {
      const $el = $els.$toastsContainer.find('[data-toast-id="' + id + '"]')
      if (!$el) return
      $el.removeClass("toast-visible")
      $close.off("click")
    }

    $root.on("animationend", () => {
      if (!$root.hasClass("toast-visible")) $root.remove()
    })
  }

  let $els = {}
  turbo.load(() => {
    const $toastsContainer = $("[data-toasts]")
    $els = { $toastsContainer }
    if (!$toastsContainer) {
      console.warn("Toasts failed to load. No data-toasts element.")
      return
    }

    $(document).on("haptic:add-toast", onAddToast.bind($els))
  })

  turbo.beforeRender(() => {
    $(document).off("haptic:add-toast")
  })
}
