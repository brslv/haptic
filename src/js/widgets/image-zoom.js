import { $, turbo, onFrameLoaded } from "../utils";

export default function imageZoom() {
  let $container, $imageContainer;

  function loadImageZoom() {
    const $imgs = $("[data-zoomable]");
    $imgs.on("click", function zoomImage() {
      const $this = $(this);
      const src = $this.attr("src");
      $container = $(
        `<div data-zoom-container class="cursor-pointer bg-white w-screen h-screen flex items-center fixed top-0 left-0 z-10"><div class="flex items-center justify-center relative w-full h-full" data-zoom-image-container></div></div>`
      );
      const $img = $(
        `<img src=${src} style="max-width: 90%; max-height: 90%;" class="p-1.5 border border-gray-300 rounded-md" />`
      );
      $imageContainer = $container.find("[data-zoom-image-container]");
      $imageContainer.one("click", function() {
        close();
      });
      $imageContainer.append($img);

      $(document.body).addClass("overflow-hidden");
      $(document.body).append($container);
      $(document).one("keyup", escHandler);
    });
  }

  function escHandler(e) {
    if (e.key === "Escape") {
      close();
    }
  }

  function close() {
    $container.remove();
    $(document.body).removeClass("overflow-hidden");
  }

  function clean() {
    if ($container && $imageContainer) {
      $(document.body).removeClass("overflow-hidden");
      $imageContainer.off("click");
      $container.remove();
      $(document).off("keyup", escHandler);
    }
  }

  turbo.load(() => {
    loadImageZoom();
    onFrameLoaded("browse-posts-list", loadImageZoom);
    onFrameLoaded("product", loadImageZoom);
  });
  turbo.beforeCache(() => {
    clean();
  });
}
