import * as Turbo from "@hotwired/turbo";
import $ from "cash-dom";

const mdConverter = new window.showdown.Converter({
  noHeaderId: true,
  simplifiedAutoLink: true,
  tasklists: true,
  openLinksInNewWindow: true,
  emoji: true,
});

const turbo = {
  actions: {
    visit(...data) {
      Turbo.visit(...data);
    },
    clearCache() {
      Turbo.clearCache();
    },
  },
  load(fn) {
    document.addEventListener("turbo:load", fn);
  },
  beforeFetchResponse(fn) {
    document.addEventListener("turbo:before-fetch-response", fn);
  },
  beforeFetchRequest(fn) {
    document.addEventListener("turbo:before-fetch-request", fn);
  },
  beforeCache(fn) {
    document.addEventListener("turbo:before-cache", fn);
  },
  beforeVisit(fn) {
    document.addEventListener("turbo:before-visit", fn);
  },
  beforeRender(fn) {
    document.addEventListener("turbo:before-render", fn);
  },
};

function req(url, data, opts) {
  if (opts === undefined && data !== undefined) opts = data;
  var method = opts.method || "get";
  return axios[method]
    .call(null, url, data)
    .then(function handleSuccess(response) {
      if (!opts.ok) {
        return console.error("Cannot execute request without success handler.");
      }
      opts.ok.call(null, response);
    })
    .catch(function handleFail(error) {
      if (error.response) {
        if (typeof opts.fail === "function") opts.fail.call(null, error);
        else console.error(error);
      }
      console.error(error);
    });
}

function registerFrame(id) {
  const frame = $("#" + id);
  if (frame.get(0)) frame.get(0).loaded.then(() => frameLoaded(id));
}

function unregisterFrame(id) {
  $(document).off("haptic:frame-loaded:" + id);
}

function frameLoaded(id) {
  $(document).trigger("haptic:frame-loaded:" + id);
}

function onFrameLoaded(id, fn) {
  $(document).on("haptic:frame-loaded:" + id, fn);
}

$(document).on("haptic:turbo-visit", (e) => {
  console.log(e);
  turbo.actions.visit(e.detail.path);
});

export {
  $,
  turbo,
  req,
  mdConverter,
  registerFrame,
  unregisterFrame,
  frameLoaded,
  onFrameLoaded,
};
