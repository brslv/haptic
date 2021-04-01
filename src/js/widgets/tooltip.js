import { turbo } from "../utils";

export default function tooltip() {
  let instance;

  turbo.load(() => {
    instance = tippy("[data-tippy-content]", {
      arrow: false,
      animation: "fade",
      delay: [150, 0],
      inlinePositioning: true,
      placement: "bottom",
      theme: "haptic",
    });
  });

  turbo.beforeCache(() => {
    instance = null;
  });
}
