import { $, turbo, req } from "../utils";
export default function boost() {
  function onPostBoostClick($el, $els) {
    const postId = $el.data("post-id");

    function onOk(response) {
      const boostsCount = Number($el.data("boosts-count"));
      const $boostsCounter = $el.find("[data-post-boost-counter]");
      const newCount = isNaN(boostsCount) ? 0 : boostsCount + 1;
      $el.data("boosts-count", newCount);
      $boostsCounter.text(newCount);
    }

    function onFail(err) {
      if (err.response && err.response.data) {
        const msg = err.response.data.err;
        $(document).trigger("haptic:add-toast", {
          content: msg,
          type: "error",
        });
      }
      console.log(err);
    }

    req(`/post/${postId}/boost`, { method: "post", ok: onOk, fail: onFail });
  }

  function load($els) {
    $els.$postBoostBtns.on("click", function(e) {
      e.preventDefault();
      const $this = $(this);
      if ($this.data("disabled") !== undefined) return;
      onPostBoostClick($this, $els);
    });
  }

  let $els = {};
  turbo.load(() => {
    $els = {
      $postBoostBtns: $("[data-post-boost-btn]"),
    };

    load($els);
  });
}
