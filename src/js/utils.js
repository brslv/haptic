import $ from "cash-dom";

const turbo = {
  load(fn) {
    document.addEventListener("turbo:load", fn);
  },
  beforeCache(fn) {
    document.addEventListener("turbo:before-cache", fn);
  },
};

export { $, turbo };
