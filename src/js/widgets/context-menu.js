import { $, turbo } from "../utils";

export default function contextMenu() {
  let $triggers;
  let openedMenus = [];
  function detectOutsideClick($menu, $trigger, e) {
    if (!$menu[0].contains(e.target) && !$trigger[0].contains(e.target)) {
      $menu.addClass("hidden");
    }
  }

  function load() {
    $triggers = $("[data-ctx-menu-trigger]");

    $triggers.on("click", function handleTriggerClick(e) {
      openedMenus.forEach(($menu) => $menu.addClass("hidden"));
      e.preventDefault();
      e.stopPropagation();
      const $this = $(this);
      const name = $this.data("ctx-menu-trigger");
      const $menu = $(`[data-ctx-menu="${name}"]`);
      if (!$menu) {
        return console.warn(`No context menu found: [${name}]`);
      }
      $menu.removeClass("hidden");
      openedMenus.push($menu);
      $(document).on("click", detectOutsideClick.bind(null, $menu, $this));
    });
  }

  function clear() {
    $triggers.off("click");
    openedMenus.forEach(($menu) => $menu.addClass("hidden"));
    $(document).off("click", detectOutsideClick);
  }

  turbo.load(() => {
    load();
  });

  turbo.beforeCache(clear);
}
