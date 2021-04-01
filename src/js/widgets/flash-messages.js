import { $, turbo } from "../utils";

export default function modal() {
  turbo.beforeCache(() => {
    const $flashMsgs = $("[data-flash-msg]");
    $flashMsgs.remove();
  });
}
