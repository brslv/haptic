document.addEventListener("DOMContentLoaded", function domLoaded() {
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
          var succMsg = result.data.details.msg;
          formMsg.innerHTML = `<span class="py-2 px-4 text-white bg-green-500 rounded-full">${succMsg}</span>`;
        })
        .catch(function handleSubError(err) {
          var errMsg = err.response.data.err;
          formMsg.innerHTML = `<span class="py-2 px-4 text-white bg-red-400 rounded-full">${errMsg}</span>`;
        });
    } else {
      formMsg.innerHTML = `<span class="py-2 px-4 text-white bg-yellow-400 rounded-full">Is that even an email? 🤔</span>`;
    }
  });
});
