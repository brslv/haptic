import { $, turbo } from "../utils";

const getQueryParam = (name) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
};

export default function browse() {
  // function clear() {
  //   const $tpl = $("[data-browse-posts-lists-loading-tpl]");
  //   const $frame = $("#browse-posts-list");
  //   if ($frame.get(0)) {
  //     $frame.replaceWith($($tpl.html()));
  //   }
  // }
  // turbo.beforeCache(() => clear());
}
