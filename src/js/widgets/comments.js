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
    const content = $submittedForm.find("textarea").val();
    const postId = $submittedForm.data("post-id");
    const authorName = $submittedForm.data("comment-author-name");
    const authorSlug = $submittedForm.data("comment-author-slug");
    const authorImage = $submittedForm.data("comment-author-img");
    const $commentsContainer = $(
      `[data-comments-container][data-post-id="${postId}"]`
    );
    console.log($commentsContainer);

    console.log("submitting comment", content, postId);

    req(
      "/comment",
      { csrf, content, postId },
      {
        method: "post",
        ok: function commentOk(response) {
          const data = response.data;
          const details = data.details;
          const $comment = $(`
            <div class="flex items-start mt-4 -mb-4 -mx-4 p-4 border-t border-gray-200 bg-gray-50">
              <img src=${authorImage} class="w-10 h-10 rounded-full mr-2" />

              <div>
                <a href="/u/${authorSlug}" class="font-bold mb-2 underline hover:no-underline">${authorName}</a>
                <p>${details.content}</p>
              </div>
            </div>
          `);
          $commentsContainer.append($comment);
        },
        fail: function commentFail(response) {
          console.log("comment response fail", response);
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
