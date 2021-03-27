// we use __requiredModulesCache__ as we need to keep track of
// the required modules in order to skip re-attaching events, etc.
var __requiredModulesCache__ = [];

document.addEventListener("turbo:load", function handleTurboLoad() {
  Turbo.setProgressBarDelay(0);

  var requiredModulesSet = window.__requiredModulesSet__;
  // console.log({ requiredModulesSet });
  function base(registered) {
    window._hpt.modules.textAreaAutoresize.register(registered);
  }
  function collections(registered) {
    base(registered);
    window._hpt.modules.ctxMenus.register(registered);
    window._hpt.modules.collectionItemActions.register(registered);
    window._hpt.modules.collectionList.register(registered);
  }
  function dashboard(registered) {
    base(registered);
    window._hpt.modules.createProduct.register(registered);
    window._hpt.modules.feedback.register(registered);
  }
  function post(registered) {
    base(registered);
    window._hpt.modules.postBoosts.register(registered);
    window._hpt.modules.ctxMenus.register(registered);
  }
  function posts(registered) {
    base(registered);
    window._hpt.modules.updateTypeButtons.register(registered);
    window._hpt.modules.updateTypes.textAndImage.register(registered);
    window._hpt.modules.ctxMenus.register(registered);
    window._hpt.modules.postActions.register(registered);
    window._hpt.modules.postsWall.register(registered);
    window._hpt.modules.productTools.register(registered);
  }
  function product(registered) {
    base(registered);
    window._hpt.modules.postBoosts.register(registered);
    window._hpt.modules.productBoosts.register(registered);
    window._hpt.modules.ctxMenus.register(registered);
    window._hpt.modules.collect.register(registered);
  }
  function settings(registered) {
    base(registered);
    window._hpt.modules.deleteProduct.register(registered);
  }
  const moduleSet = {
    base: base,
    collections: collections,
    dashboard: dashboard,
    post: post,
    posts: posts,
    product: product,
    settings: settings,
  };

  if (!requiredModulesSet) return;

  const setFn = moduleSet[requiredModulesSet];
  if (typeof setFn !== "function") {
    throw Error(
      "Required module set (" + requiredModulesSet + ") must be a function."
    );
  }

  setFn(__requiredModulesCache__.includes(requiredModulesSet));
  __requiredModulesCache__.push(requiredModulesSet);
});

function loading() {
  var meTarget = document.getElementById("me-target");
  var me = document.getElementById("me");
  var joinBtn = document.getElementById("join-btn");
  var emailInput = document.getElementById("email");

  meTarget.addEventListener("click", function mouseEnter(e) {
    e.stopPropagation();
    me.classList.remove("invisible");
  });

  document.body.addEventListener("click", function bodyClick(e) {
    // close the "me" popup
    if (!me.contains(e.target) && !me.classList.contains("invisible")) {
      me.classList.add("invisible");
    }
  });

  joinBtn.addEventListener("click", function joinBtnClick() {
    emailInput.classList.add("shake");
    setTimeout(function() {
      emailInput.focus();
    }, 0);
    setTimeout(function() {
      emailInput.classList.remove("shake");
    }, 3000);
  });

  var subsForm = document.getElementById("subs-form");
  var email = document.getElementById("email");
  var acceptEmails = document.getElementById("accept-emails");
  var formMsg = document.getElementById("form-msg");
  subsForm.addEventListener("submit", function subsFormSubtmi(e) {
    e.preventDefault();
    var values = {
      email: email.value,
      accept_emails: acceptEmails.checked,
    };
    var pattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;

    if (pattern.test(values.email)) {
      axios
        .post("/sub", values)
        .then(function handleSubResponse(result) {
          var msg;
          if (result.data.ok) {
            msg = result.data.details.msg;
            formMsg.innerHTML = `<span class="py-2 px-4 text-white bg-green-500 rounded-full">${msg}</span>`;
          } else {
            msg = result.data.err;
            formMsg.innerHTML = `<span class="py-2 px-4 text-white bg-red-400 rounded-full">${msg}</span>`;
          }
        })
        .catch(function handleSubError(err) {
          var msg = err.response.data.err;
          formMsg.innerHTML = `<span class="py-2 px-4 text-white bg-red-400 rounded-full">${msg}</span>`;
        });
    } else {
      formMsg.innerHTML = `<span class="py-2 px-4 text-white bg-yellow-400 rounded-full">Is that even an email? 🤔</span>`;
    }
  });
}
