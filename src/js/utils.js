import $ from "cash-dom";

const turbo = {
  load(fn) {
    document.addEventListener("turbo:load", fn);
  },
  beforeCache(fn) {
    document.addEventListener("turbo:before-cache", fn);
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

export { $, turbo, req };
