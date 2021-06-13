import { $, turbo, req } from "../../../utils";

export default function pollVote() {
  console.log("loading poll vote module");

  function load($els) {
    $els.$checkboxes.on("click", onCheckboxClick.bind(null, $els));
  }

  function onCheckboxClick($els, e) {
    const $target = $(e.currentTarget);
    const optionId = $target.val();
    const postId = $target.data("post-id");

    // send request to the backend
    function ok(response) {
      console.log(response);
    }

    function fail(err) {
      $(document).trigger("haptic:add-toast", {
        content: err.response.data.err,
        type: "error",
      });
    }

    req(
      "/vote",
      {
        csrf: $('meta[name="csrf"]').attr("content"),
        option_id: optionId,
        post_id: postId,
      },
      { method: "post", ok, fail }
    );
  }

  let $els = {};
  turbo.load(() => {
    const $poll = $("[data-poll]");
    $els = {
      $checkboxes: $poll.find(".checkbox"),
    };
    load($els);
  });
}
