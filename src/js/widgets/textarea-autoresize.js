import { turbo, onFrameLoaded } from "../utils";

export default function textareaAutoresize() {
  function load() {
    document.querySelectorAll("[data-autoresize]").forEach(function(element) {
      element.style.boxSizing = "border-box";
      var offset = element.offsetHeight - element.clientHeight;
      element.addEventListener("input", function(event) {
        event.target.style.height = "auto";
        event.target.style.height = event.target.scrollHeight + offset + "px";
      });
      element.removeAttribute("data-autoresize");
    });
  }

  turbo.load(() => {
    load();
    onFrameLoaded("browse-posts-list", load);
    onFrameLoaded("product", load);
  });
}
