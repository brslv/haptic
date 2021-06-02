import { $, turbo, req, mdConverter } from "../utils";

export default function comments() {
  function load($els) {
    $els.$commentBtn.on("click", (e) => onCommentBtnClick($els, e));
    $els.$form.on("submit", (e) => onFormSubmit($els, e));
  }

  function onCommentBtnClick($els, e) {
    const $btn = $(e.currentTarget);
    const postId = $btn.data("post-id");

    const $formContainer = $(
      `[data-comment-form-container][data-post-id="${postId}"`
    );
    if ($formContainer.hasClass("hidden")) {
      // open
      $formContainer.removeClass("hidden");
      $formContainer.find("form textarea").trigger("focus");
    } else {
      $formContainer.addClass("hidden");
    }
  }

  function onFormSubmit($els, e) {
    e.preventDefault();
    const $submittedForm = $(e.currentTarget);
    const $errorsContainer = $submittedForm.find("[data-comment-errors]");
    const csrf = $('meta[name="csrf"]').attr("content");
    const $content = $submittedForm.find("textarea");
    const content = $content.val();
    const postId = $submittedForm.data("post-id");
    const authorName = $submittedForm.data("comment-author-name");
    const authorTwitterScreenName = $submittedForm.data(
      "comment-author-twitter-screen-name"
    );
    const authorSlug = $submittedForm.data("comment-author-slug");
    const authorImage = $submittedForm.data("comment-author-img");
    const authorType = $submittedForm.data("comment-author-type");
    const postAuthorId = $submittedForm.data("post-author-id");
    const $commentsContainer = $(
      `[data-comments-container][data-post-id="${postId}"]`
    );
    const $comment = $($els.$commentTpl.html());

    $content.removeClass("border border-red-500");
    $errorsContainer.addClass("hidden");
    $errorsContainer.html("");
    if (content.length < 1) {
      $content.addClass("border border-red-500");
      $errorsContainer.removeClass("hidden");
      const $error = $(
        '<p class="text-red-500 text-xs mb-2">Comment is too short</p>'
      );
      $errorsContainer.append($error);
      return;
    }

    req(
      "/comment",
      { csrf, postAuthorId, content, postId },
      {
        method: "post",
        ok: function commentOk(response) {
          const data = response.data;
          const details = data.details;
          const commentId = `comment_${details.id}`;

          $comment.attr("id", commentId);
          $comment
            .find("[data-comment-author-img]")
            .attr("src", authorImage)
            .addClass(
              authorType === 1 ? "border-4 border-double border-yellow-300" : ""
            );
          $comment
            .find("[data-comment-author-link]")
            .attr("href", `/u/${authorSlug}`)
            .text(authorName);
          $comment
            .find("[data-comment-author-twitter-screen-name]")
            .text(authorTwitterScreenName);
          $comment.find("[data-comment-created-at]").text("Now");
          $comment
            .find("[data-comment-content]")
            .html(mdConverter.makeHtml(details.content));
          $commentsContainer.append($comment);

          $content.val("");
          $(document).trigger("haptic:add-toast", {
            content: "Your comment has been published 🙌",
            type: "success",
          });
          document
            .getElementById(commentId)
            .scrollIntoView({ behavior: "smooth" });
        },
        fail: function commentFail(response) {
          $(document).trigger("haptic:add-toast", {
            content: "We had a problem publishing your comment. Please, retry.",
            type: "error",
          });
        },
      }
    );
  }

  let $els = {};
  turbo.load(() => {
    $els = {
      $commentBtn: $("[data-comment-btn]"),
      $form: $("[data-comment-form]"),
      $commentTpl: $("[data-comment-tpl]"),
    };

    load($els);
  });
}
