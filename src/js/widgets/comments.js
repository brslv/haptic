import { $, turbo, req } from "../utils";

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
    const csrf = $('meta[name="csrf"]').attr("content");
    const $content = $submittedForm.find("textarea");
    const content = $content.val();
    const postId = $submittedForm.data("post-id");
    const authorName = $submittedForm.data("comment-author-name");
    const authorSlug = $submittedForm.data("comment-author-slug");
    const authorImage = $submittedForm.data("comment-author-img");
    const postAuthorId = $submittedForm.data("post-author-id");
    const $commentsContainer = $(
      `[data-comments-container][data-post-id="${postId}"]`
    );

    req(
      "/comment",
      { csrf, postAuthorId, content, postId },
      {
        method: "post",
        ok: function commentOk(response) {
          const data = response.data;
          const details = data.details;
          const commentId = `comment_${details.id}`;
          const $comment = $(`
            <div id="${commentId}" class="flex items-start mt-4 p-4 border border-gray-200 rounded-md border-dashed">
              <img src=${authorImage} class="w-10 h-10 rounded-full mr-2" />

              <div>
                <a href="/u/${authorSlug}" class="font-bold mb-2 underline hover:no-underline">${authorName}</a>
                <p>${details.content}</p>
              </div>
            </div>
          `);
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
    };

    load($els);
  });
}
