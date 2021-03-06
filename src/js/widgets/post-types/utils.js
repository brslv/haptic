import { $ } from "../../utils";

export default function createPostTypesUtil() {
  const $allTriggers = $("[data-post-type-trigger]");
  const $postTypesContainer = $("[data-post-types-container]");

  function openPostType($postType, $focusableElement) {
    $postTypesContainer.removeClass("p-2").addClass("p-4 ");
    $postType.removeClass("hidden");
    if ($focusableElement && typeof $focusableElement.trigger === "function") {
      $focusableElement.trigger("focus");
    }

    $allTriggers.each(function (i, btn) {
      const $btn = $(btn);
      if ($btn.data("post-type-trigger-no-hide") !== undefined) return;
      $btn.addClass("hidden");
    });
  }

  function closePostType($postType, $trigger) {
    $postTypesContainer.removeClass("p-4").addClass("p-2");
    $trigger.removeClass("bg-gray-100");
    $allTriggers.removeClass("hidden");
    $postType.addClass("hidden");
  }

  return {
    openPostType,
    closePostType,
  };
}
