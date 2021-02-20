document.addEventListener("DOMContentLoaded", function domLoaded() {
  // handling btn types clicks
  var btnSelectors = {
    text: "[data-bind=text]",
    youtube: "[data-bind=youtube]",
    survey: "[data-bind=survey]",
    milestone: "[data-bind=milestone]",
    roadmap: "[data-bind=roadmap]",
  };
  var btns = Object.values(btnSelectors).map(function(sel) {
    return document.querySelector(sel);
  });

  function handleCloseBtnClick(e) {
    e.stopPropagation();
    var form = document.querySelector(
      '[data-show="' + e.currentTarget.dataset.close + '"]'
    );
    if (form) {
      form.classList.add("hidden");
    }
    // open all btns
    [].forEach.call(btns, function(btn) {
      var closeBtn = btn.querySelector("[data-close]");
      btn.classList.remove("hidden");
      if (closeBtn) closeBtn.classList.add("hidden");
    });
  }

  [].forEach.call(btns, function(btn) {
    btn.addEventListener("click", function btnClick(e) {
      if (e.currentTarget.dataset.disabled !== undefined) {
        // the button is disabled, do not open it.
        return;
      }

      // 1. hide the other buttons and their bindings.
      [].forEach.call(btns, function hideBtn(_btn) {
        var closeBtn = _btn.querySelector("[data-close]");
        if (closeBtn) {
          closeBtn.addEventListener("click", handleCloseBtnClick);
        }

        if (e.currentTarget.isEqualNode(_btn)) {
          if (closeBtn) closeBtn.classList.remove("hidden");
          return;
        }

        if (closeBtn) {
          closeBtn.classList.add("hidden");
          closeBtn.removeEventListener("click", handleCloseBtnClick);
        }
        _btn.classList.add("hidden");
      });

      // 2. show the form that's bound to the button
      var form = document.querySelector(
        '[data-show="' + e.currentTarget.dataset.bind + '"]'
      );
      if (form) {
        form.classList.remove("hidden");
      } else {
        console.error(
          "Couldn't find the proper form, bound to " +
            e.currentTarget.dataset.bind +
            " btn."
        );
      }
    });
  });

  // handling text form submit
  var formPostTextEl = document.getElementById("form-post-text");
  var textEl = formPostTextEl.querySelector("#text");
  var textErrorEl = document.getElementById("text-error");
  var postsContainer = document.getElementById("posts-container");
  var noPostsMsg = document.getElementById("no-posts-msg");

  formPostTextEl.addEventListener("submit", function formPostTextSubmit(e) {
    e.preventDefault();

    var text = textEl.value;
    var productIdInputEl = formPostTextEl.querySelector("input[name=id]");
    if (!productIdInputEl) {
      console.error("Couldn't find product id. 👀");
      return;
    }
    var productId = productIdInputEl.value;

    hideErrors(); // hide errors from the ui
    var errors = validate({ text, productId });
    if (Object.keys(errors).length) {
      showErrors(errors); // show errors
      return;
    }

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

          // setup events for the newly added post
          registerCtxMenus([
            tplEl.content.querySelector("[data-ctx-menu-trigger]"),
          ]);
          // update data-post-id attribute
          var elsWithDataPostIdAttr = tplEl.content.querySelectorAll(
            "[data-post-id]"
          );
          elsWithDataPostIdAttr.forEach(function updateDataPostIdAttrs(el) {
            el.dataset.postId = post.id;
          });

          var contentEl = tplEl.content.querySelector("[data-content]");

          contentEl.innerHTML = post.text;

          postsContainer.parentNode.prepend(tplEl.content);

          textEl.value = "";
        }

        // hide the no-posts message
        if (noPostsMsg && !noPostsMsg.classList.contains("hidden")) {
          noPostsMsg.classList.add("hidden");
        }
      });
  });

  function validate({ text, productId }) {
    var errors = {};
    if (text.length < 2) {
      errors.text = "Text is too short. You can do much better! 🤓";
    }
    if (isNaN(productId)) {
      errors.productId = {
        productId:
          "Hmm, it seems like something is broken. There's no productId.",
      };
    }
    return errors;
  }

  function showErrors(errors) {
    if (errors.text) {
      textEl.classList.add("error-field");
      textErrorEl.innerHTML = errors.text;
      textErrorEl.classList.remove("hidden");
    }
  }

  function hideErrors() {
    textEl.classList.remove("error-field");
    textErrorEl.classList.add("hidden");
  }

  // handle ctx menu
  // data-ctx-menu-trigger -> a button which when clicked opens a menu (data-ctx-menu)
  function registerCtxMenus(ctxMenuTriggers) {
    ctxMenuTriggers.forEach(function mapCtxMenuTriggers(triggerEl) {
      triggerEl.addEventListener("click", function ctxMenuClick(e) {
        var menu = e.currentTarget.parentElement.querySelector(
          "[data-ctx-menu]"
        );
        var btns = menu.querySelectorAll("[data-ctx-action]");

        if (!menu) {
          console.log(
            "No ctx menu found for trigger " +
              e.currentTarget.dataset.ctxTrigger
          );
          return;
        }

        // show the ctx menu
        menu.classList.remove("hidden");
        menu.parentElement.classList.add("z-10");

        // btn handlers
        function deletePost(postId) {
          axios
            .delete("/post/" + postId)
            .then(function postDelResponse(response) {
              console.log(response);
              // remove the post element
              var post = document.querySelector(
                '[data-post-id="' + postId + '"]'
              );
              if (!post) {
                console.warn("No post with post_id" + postId + " to remove.");
                return;
              }

              post.remove();

              // show no posts message if needed
              showNoPostsMsg();
            });
        }

        function showNoPostsMsg() {
          var noPostsMsg = document.getElementById("no-posts-msg");
          if (!postsContainer.childNodes.length) {
            noPostsMsg.classList.remove("hidden");
          }
        }

        function handleCtxBtnClick(e) {
          var action = e.currentTarget.dataset.ctxAction;
          switch (action) {
            case "delete": {
              var ok = window.confirm(
                "Deleting a post is irreversible. Delete post anyway?"
              );
              if (ok) deletePost(e.currentTarget.dataset.postId);
              break;
            }
          }
        }

        // register ctx btn handlers
        [].forEach.call(btns, function(ctxBtn) {
          ctxBtn.addEventListener("click", handleCtxBtnClick);
        });

        // listen for outside clicks and clean up event handlers
        function closeCtxMenu(e) {
          if (menu.contains(e.target) || triggerEl.contains(e.target)) return;
          menu.classList.add("hidden");
          menu.parentElement.classList.remove("z-10");
          document.body.removeEventListener("click", closeCtxMenu);
          [].forEach.call(btns, function(ctxBtn) {
            ctxBtn.removeEventListener("click", handleCtxBtnClick);
          });
        }
        document.body.addEventListener("click", closeCtxMenu);
      });
    });
  }

  registerCtxMenus(document.querySelectorAll("[data-ctx-menu-trigger]"));

  // handling images
  var addImgBtnEl = document.getElementById("add-image-btn");
  var fileUploadEl = document.getElementById("image-upload");
  var uploadedImageEl = document.getElementById("uploaded-image");
  var imageInput = document.getElementById("image");
  if (addImgBtnEl) {
    function previewImage(image, previewEl) {
      // for (var i = 0; i < images.length; i++) {
      var file = image;

      if (!file.type.startsWith("image/")) {
        return;
      }

      var imgContainer = document.createElement("div");
      var rmBtn = document.createElement("button");
      rmBtn.className += "ml-2 btn btn-danger btn-text text-xs";
      rmBtn.innerHTML = "Remove image";
      rmBtn.addEventListener("click", function rmBtnClick(e) {
        imgContainer.remove();
        uploadedImageEl.value = "";
      });
      var img = document.createElement("img");

      imgContainer.className += "flex items-center";
      imgContainer.appendChild(img);
      imgContainer.appendChild(rmBtn);
      img.className =
        "w-10 h-10 rounded-xl inline-block border border-gray-300 dark:border-gray-700";
      img.file = file;
      imgContainer.appendChild(img);
      imgContainer.appendChild(rmBtn);
      previewEl.appendChild(imgContainer);

      var reader = new FileReader();
      reader.onload = (function(aImg) {
        return function(e) {
          aImg.src = e.target.result;
        };
      })(img);
      reader.readAsDataURL(file);
      // }
    }

    function uploadImageToServer(image) {
      var formData = new FormData();
      formData.append("image", image);
      return axios.post("/upload-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    }

    addImgBtnEl.addEventListener("click", function addImgBtnClick() {
      fileUploadEl.click();
    });
    fileUploadEl.addEventListener(
      "change",
      function fileUploadElChange() {
        var image = this.files[0];
        if (!image.type.startsWith("image/")) {
          alert("Invalid file format.");
          return;
        }

        var previewEl = document.getElementById("image-upload-preview");
        if (previewEl) {
          previewImage(image, previewEl);
        }

        uploadImageToServer().then(function uploadImageResponse(response) {
          console.log(response);
          uploadedImageEl.value = "test";
        });
      },
      false
    );
  }
});
