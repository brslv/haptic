import { $, turbo, req } from "../utils";

const getQueryParam = (name) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
};

export default function collect() {
  function load($els) {
    // if (!$els.$contentTypePicker) return;

    $els.$contentTypePicker.on("change", (e) => onTypePick(e, $els));
    $els.$boostsBtn.on("click", (e) => onBtnClick("boosts", e, $els));
    $els.$newestBtn.on("click", (e) => onBtnClick("newest", e, $els));
  }

  function onBtnClick(ord, e, $els) {
    const type = getQueryParam("type");

    let qs = `?ord=${ord}`;
    if (type) {
      qs = `?ord=${ord}&type=${type}`;
    }

    const url = window.location.pathname + qs;
    turbo.actions.visit(url);
  }

  function onTypePick(e, $els) {
    const value = e.currentTarget.value;
    const ord = getQueryParam("ord");

    let qs = `?ord=newest&type=posts`;
    if (value === "products") {
      qs = `?ord=boosts&type=products`;
    }

    const url = window.location.pathname + qs;
    turbo.actions.visit(url);
  }

  function clear($els) {
    if ($els.$contentTypePicker) {
      $els.$contentTypePicker.off("change");
    }

    $els.$boostsBtn.off("click");
    $els.$newestBtn.off("click");
  }

  let $els = {};
  turbo.load(() => {
    $els = {
      $boostsBtn: $("[data-browse-ord-boosts]"),
      $newestBtn: $("[data-browse-ord-newest]"),
      $contentTypePicker: $("[data-browse-content-type-picker]"),
    };

    load($els);
  });

  turbo.beforeCache(() => clear($els));
}
