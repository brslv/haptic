import { $, turbo, req } from "../utils";

export default function contextMenu() {
  let $triggers;
  let openedMenus = [];
  let $actions;

  function detectOutsideClick($menu, $trigger, e) {
    if (!$menu[0].contains(e.target) && !$trigger[0].contains(e.target)) {
      clear();
    } else {
      e.preventDefault();
    }
  }

  function onCtxActionClick() {
    const $this = $(this);
    $(document).trigger("haptic:context-menu-action", {
      name: $this.data("ctx-action"),
      $el: $this,
    });
  }

  function load() {
    $triggers = $("[data-ctx-menu-trigger]");

    $triggers.on("click", function handleTriggerClick(e) {
      // reset all ctx menu containers to the native z-index
      // we set z-10 to the container on open, because there might be other elements
      // that might hide the menu
      $("[data-ctx-menu-container]").removeClass("relative z-10");

      openedMenus.forEach(($menu) => {
        $menu.addClass("hidden");
        clear();
      });
      e.preventDefault();
      e.stopPropagation();
      const $this = $(this);
      const name = $this.data("ctx-menu-trigger");
      const $menu = $(`[data-ctx-menu="${name}"]`);
      if (!$menu) {
        return console.warn(`No context menu found: [${name}]`);
      }

      // we set z-10 to the containers on open.
      $menu
        .removeClass("hidden")
        .parents("[data-ctx-menu-container]")
        .addClass("relative z-10");

      openedMenus.push($menu);
      $(document).on("click", detectOutsideClick.bind(null, $menu, $this));

      $actions = $menu.find("[data-ctx-action]");
      $actions.on("click", onCtxActionClick);
      $(document).trigger("haptic:context-menu-open", { name });
    });
  }

  function clear() {
    if ($actions && $actions.length) {
      $actions.off("click", onCtxActionClick);
    }
    openedMenus.forEach(($menu) => $menu.addClass("hidden"));
  }

  function clearTriggers() {
    $triggers.off("click");
    $(document).off("click", detectOutsideClick);
  }

  turbo.load(() => {
    load();
  });

  turbo.beforeCache(() => {
    clear();
    clearTriggers();
  });
}

export function postContextMenu() {
  function deletePost(postId, $el) {
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

          $post.remove();
          $(document).trigger("haptic:add-toast", {
            content: "Post deleted successfully",
            type: "success",
          });
        },
      }
    );
  }

  function onOpen(e, data) {
    if (data.name === "delete-post") {
      var ok = window.confirm(
        "Deleting a post is irreversible. Delete post anyway?"
      );
      if (ok) deletePost(data.$el.data("post-id"));
    }
  }

  function load() {
    $(document).on("haptic:context-menu-action", onOpen);
  }

  function clear() {
    $(document).off("haptic:context-menu-action", onOpen);
  }

  turbo.load(() => {
    load();
  });

  turbo.beforeCache(clear);
}

export function collectionContextMenu() {
  function onOk($el) {
    const $parents = $el.parents("[data-collected-product-root]");
    $parents.remove();
    $(document).trigger("haptic:collected-item-removed");
    turbo.actions.visit(window.location.href);
  }

  function onFail(err) {
    console.error(err);
  }

  function deleteCollectedItem($el) {
    const slug = $el.data("product-slug");
    const csrf = $('meta[name="csrf"]').attr("content");

    req(
      `/p/${slug}/collect`,
      { data: { csrf } },
      {
        method: "delete",
        ok: onOk.bind(null, $el),
        fail: onFail,
      }
    );
  }

  function onAction(e, data) {
    if (data.name === "delete-collected-item") {
      deleteCollectedItem(data.$el);
    }
  }

  function load() {
    $(document).on("haptic:context-menu-action", onAction);
  }

  function clear() {
    $(document).off("haptic:context-menu-action", onAction);
  }

  turbo.load(() => {
    load();
  });

  turbo.beforeCache(clear);
}
