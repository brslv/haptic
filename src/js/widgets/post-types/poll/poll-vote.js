import { $, turbo, req, onFrameLoaded } from "../../../utils";

export default function pollVote() {
  function load() {
    const $poll = $("[data-poll]");
    const $els = {
      $checkboxes: $poll.find(".checkbox"),
    };
    $els.$checkboxes.on("click", onCheckboxClick.bind(null, $els));
  }

  function onCheckboxClick($els, e) {
    const $target = $(e.currentTarget);
    const triggersLoginModal = $target.data("modal-trigger") === "login";

    if (triggersLoginModal) {
      $target.get(0).checked = false;
      // the user is guest and click on the input will trigger the login modal
      return;
    }

    const optionId = $target.val();
    const postId = $target.data("post-id");

    // send request to the backend
    function ok(response) {
      const pollData = response.data.details.poll;
      const $optionsList = $target.parents("[data-options-list]");
      $optionsList.children().remove();

      // create options bars and append them to the options list
      pollData.poll_options.forEach((opt) => {
        const text = opt.text;
        const percent = opt.votes_percent;
        const votesCount = opt.votes_count;

        const $bar = $($("[data-option-bar-tpl]").html());
        $bar.find("[data-option-bar]").css({
          width: `${percent}%`,
        });
        $bar.find("[data-votes-percent-label]").text(percent);
        $bar.find("[data-option-text]").text(text);
        $optionsList.append($bar);
      });
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

  turbo.load(() => {
    load();
    onFrameLoaded("browse-posts-list", load);
  });
}
