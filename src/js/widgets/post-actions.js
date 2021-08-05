import { $, turbo, req, onFrameLoaded } from "../utils";

export default function postActions() {
  function load() {
    $els = {
      $delBtn: $("[data-post-action-delete]"),
    };
    $els.$delBtn.on("click", confirmDelete.bind(undefined, $els));
  }

  function confirmDelete($els, e) {
    console.log("delete", e);
    const ok = window.confirm(
      "Deleting a post is irreversible. Delete post anyway?"
    );

    const btn = e.currentTarget;
    const postId = $(btn).data("post-id");

    if (ok) deletePost(postId);
  }

  function deletePost(postId) {
    const data = { csrf: $('meta[name="csrf"]').attr("content") };
    req(
      "/post/" + postId,
      { data },
      {
        method: "delete",
        ok: function postDelResponse(response) {
          // remove the post element
          const $post = $('[data-post-id="' + postId + '"]');
          if (!$post) {
            console.warn("No post with post_id" + postId + " to remove.");
            return;
          }

          $(document).trigger("haptic:add-toast", {
            content: "Post deleted successfully",
            type: "success",
          });

          if (window.location.pathname.startsWith("/p/")) {
            turbo.actions.visit("/");
          } else {
            $post.remove();
          }
        },
      }
    );
  }

  function clear($els) {
    $els.$delBtn.off("click");
  }

  let $els = {};
  turbo.load(() => {
    $els = {
      $delBtn: $("[data-post-action-delete]"),
    };
    load();
    onFrameLoaded("browse-posts-list", load);
    onFrameLoaded("product", load);
  });

  turbo.beforeCache(() => {
    clear($els);
  });
}

/**

  

*/
