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

  btns.forEach(function(btn) {
    if (!btn) return;
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
  if (formPostTextEl) {
    (function() {
      var textEl = formPostTextEl.querySelector("#text");
      var imageEl = formPostTextEl.querySelector("#uploaded-image");
      var textErrorEl = document.getElementById("text-error");
      var postsContainer = document.getElementById("posts-container");
      var noPostsMsg = document.getElementById("no-posts-msg");

      formPostTextEl.addEventListener("submit", function formPostTextSubmit(e) {
        e.preventDefault();

        var text = textEl.value;
        var image = imageEl.value;
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
            image,
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
              // update data-post-id attribute and the link to the post
              var elsWithDataPostIdAttr = tplEl.content.querySelectorAll(
                "[data-post-id]"
              );
              elsWithDataPostIdAttr.forEach(function updateDataPostIdAttrs(el) {
                el.dataset.postId = post.id;
              });
              var link = tplEl.content.querySelector("[data-post-link]");
              link.href = link.href.replace("-1", post.id);

              var contentEl = tplEl.content.querySelector("[data-content]");

              contentEl.innerHTML = new showdown.Converter({
                noHeaderId: true,
                simplifiedAutoLink: true,
                tasklists: true,
                openLinksInNewWindow: true,
                emoji: true,
              }).makeHtml(post.text);
              var imageEl = tplEl.content.querySelector("[data-image]");
              if (post.image_url) {
                imageEl.src = post.image_url;
                imageEl.classList.remove("hidden");
                imageEl.parentElement.classList.remove("hidden");
              }

              postsContainer.parentNode.prepend(tplEl.content);

              reloadMediumZoom();

              textEl.value = "";

              var imgContainer = document.getElementById("img-container");
              var uploadedImageEl = document.getElementById("uploaded-image");
              if (imgContainer) {
                imgContainer.remove();
              }
              uploadedImageEl.value = "";
            }

            // hide the no-posts message
            if (noPostsMsg && !noPostsMsg.classList.contains("hidden")) {
              noPostsMsg.classList.add("hidden");
            }
          });
      });

      // handling images
      var addImgBtnEl = document.getElementById("add-image-btn");
      var fileUploadEl = document.getElementById("image-upload");
      var uploadedImageEl = document.getElementById("uploaded-image");
      var imageInput = document.getElementById("image");
      var formPostTextSubmitBtnEl = formPostTextEl.querySelector(
        'button[type="submit"]'
      );
      if (addImgBtnEl) {
        function previewImage(image, previewEl) {
          // for (var i = 0; i < images.length; i++) {
          var file = image;

          if (!validateImageFiletype(file)) {
            return;
          }

          var imgContainer = document.createElement("div");
          imgContainer.className += "flex items-center";
          imgContainer.id = "img-container";
          var rmBtn = document.createElement("button");
          rmBtn.className += "ml-2 btn btn-danger btn-text text-xs";
          rmBtn.innerHTML = "Remove image";
          rmBtn.addEventListener("click", function rmBtnClick(e) {
            imgContainer.remove();
            uploadedImageEl.value = "";
          });
          var img = document.createElement("img");

          imgContainer.appendChild(img);
          imgContainer.appendChild(rmBtn);
          img.className = "inline-block";
          img.style = "max-height: 35px;";
          img.file = file;
          img.dataset.zoomable = "data-zoomable";
          imgContainer.appendChild(img);
          imgContainer.appendChild(rmBtn);
          previewEl.appendChild(imgContainer);

          var reader = new FileReader();
          reader.onload = (function(aImg) {
            return function(e) {
              aImg.src = e.target.result;
              reloadMediumZoom();
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

            if (!validateImageFiletype(image)) {
              alert("Invalid file format.");
              return;
            }

            var imgUploadLoaderEl = document.getElementById(
              "image-upload-loader"
            );
            addImgBtnEl.setAttribute("disabled", "disabled");
            if (imgUploadLoaderEl) imgUploadLoaderEl.classList.remove("hidden");
            if (formPostTextSubmitBtnEl)
              formPostTextSubmitBtnEl.setAttribute("disabled", "disabled");

            uploadImageToServer(image).then(function uploadImageResponse(
              response
            ) {
              var uploadedImagePreview = document.getElementById(
                "img-container"
              );
              if (uploadedImagePreview) {
                // there's already uploaded image preview. Remove it, as a new image has been uploaded.
                uploadedImagePreview.remove();
              }

              uploadedImageEl.value = response.data.details.url;
              if (imgUploadLoaderEl) imgUploadLoaderEl.classList.add("hidden");
              if (formPostTextSubmitBtnEl)
                formPostTextSubmitBtnEl.removeAttribute("disabled");
              addImgBtnEl.removeAttribute("disabled");
              var previewEl = document.getElementById("image-upload-preview");
              previewImage(image, previewEl);
            });
          },
          false
        );
      }

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
                  // remove the post element
                  var post = document.querySelector(
                    '[data-post-id="' + postId + '"]'
                  );
                  if (!post) {
                    console.warn(
                      "No post with post_id" + postId + " to remove."
                    );
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
              if (menu.contains(e.target) || triggerEl.contains(e.target))
                return;
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

      function reloadMediumZoom() {
        if (
          window.App.MediumZoom &&
          typeof window.App.MediumZoom.detach === "function" &&
          typeof window.App.MediumZoom.attach === "function"
        ) {
          window.App.MediumZoom.detach();
          window.App.MediumZoom.attach(
            document.querySelectorAll("[data-zoomable]")
          );
        }
      }

      function validateImageFiletype(image) {
        var filetypeWhitelist = [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/gif",
        ];
        return filetypeWhitelist.includes(image.type);
      }
    })(); // end text form context
  }

  // handling post boosts
  (function() {
    var boostBtns = document.querySelectorAll("[data-post-boost-btn]");
    boostBtns.forEach(function registerBoostPostBtn(btn) {
      if (btn.dataset.disabled !== undefined) return; // skip listening
      btn.addEventListener("click", function onBoostPostBtnClick(e) {
        e.preventDefault();
        var postId = btn.dataset.postId;
        axios
          .post("/post/" + postId + "/boost")
          .then(function handleBoostPostResponse(response) {
            var boostsCount = Number(btn.dataset.boostsCount);
            var boostsCounterEl = btn.querySelector(
              "[data-post-boost-counter]"
            );

            var newCount;
            if (isNaN(boostsCount)) {
              newCount = 0;
            } else {
              newCount = boostsCount + 1;
            }

            btn.dataset.boostsCount = newCount;
            boostsCounterEl.innerHTML = newCount;
          })
          .catch(function handleBoostPostFail(error) {
            if (error.response && error.response.data) {
              var msg = error.response.data.err;
              alert(msg);
            }
            console.error(error);
          });
      });
    });
  })();
});
