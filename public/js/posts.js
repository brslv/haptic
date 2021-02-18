document.addEventListener("DOMContentLoaded", function domLoaded() {
  var formPostTextEl = document.getElementById("form-post-text");
  var postsContainer = document.getElementById("posts-container");
  var noPostsMsg = document.getElementById("no-posts-msg");

  formPostTextEl.addEventListener("submit", function formPostTextSubmit(e) {
    e.preventDefault();

    var textEl = formPostTextEl.querySelector("#text");
    var text = textEl.value;
    var productIdInputEl = formPostTextEl.querySelector("input[name=id]");
    if (!productIdInputEl) {
      console.error("Couldn't find product id. 👀");
      return;
    }

    var productId = productIdInputEl.value;

    axios
      .post(`/post/${productId}/text`, {
        text,
      })
      .then(function handleSuccess(response) {
        var data = response.data;
        var details = data.details;

        if (data.ok) {
          var post = details.post;
          var tplEl = document.querySelector("#post-tpl").cloneNode(true);
          var contentEl = tplEl.content.querySelector("[data-content]");

          contentEl.innerHTML = post.text;
        }

        postsContainer.appendChild(tplEl.content);

        textEl.value = "";

        if (noPostsMsg && !noPostsMsg.classList.contains("hidden")) {
          noPostsMsg.classList.add("hidden");
        }
      });
  });
});
