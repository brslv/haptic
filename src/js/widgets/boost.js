import { $, turbo, req, onFrameLoaded } from "../utils";
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

    const csrf = $('meta[name="csrf"]').attr("content");
    req(
      `/post/${postId}/boost`,
      { csrf },
      { method: "post", ok: onOk, fail: onFail }
    );
  }

  function onProductBoostClick($el, $els) {
    const $counter = $("[data-product-boost-counter]");
    const $slug = $("[data-product-slug]");
    const $boostsCounter = $("[data-product-boosts-count]");
    const csrf = $('meta[name="csrf"]').attr("content");
    const slug = $slug.data("product-slug");
    const boostsCount = $boostsCounter.data("product-boosts-count");
    if (!slug) return;

    function onOk(response) {
      const newCount = isNaN(boostsCount) ? 0 : Number(boostsCount) + 1;
      $counter.text(newCount);
      $boostsCounter.data("product-boosts-count", newCount);
    }

    function onFail(err) {
      const data = err.response.data;
      $(document).trigger("haptic:add-toast", {
        content: data.err,
        type: "error",
      });
    }

    req(
      `/p/${slug}/boost`,
      { csrf },
      {
        method: "post",
        ok: onOk,
        fail: onFail,
      }
    );
  }

  function load(type = null) {
    const $els = {
      $postBoostBtns: $("[data-post-boost-btn]"),
      $productBoostBtn: $("[data-product-boost-btn]"),
    };
    if (!type || type === "posts")
      $els.$postBoostBtns.on("click", function(e) {
        const $this = $(this);
        if ($this.data("disabled") !== undefined) return;
        e.preventDefault();
        onPostBoostClick($this, $els);
      });

    if (!type || type === "product")
      $els.$productBoostBtn.on("click", function(e) {
        const $this = $(this);
        if ($this.data("disabled") !== undefined) return;
        e.preventDefault();
        onProductBoostClick($this, $els);
      });
  }

  turbo.load(() => {
    load();
    onFrameLoaded("browse-posts-list", load);
    onFrameLoaded("product", load.bind(null, "posts"));
  });
}
