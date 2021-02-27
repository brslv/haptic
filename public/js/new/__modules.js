document.addEventListener("DOMContentLoaded", function handleDomLoaded() {
  window._hpt = window._hpt || {};
  var m = (window._hpt.modules = window._hpt.modules || {});

  // utils ------------------------------------------------------------

  var utils = (window._hpt.utils = window._hpt.utils || {
    validateImageFiletype: function validateImageFiletype(image) {
      var filetypeWhitelist = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/gif",
      ];
      return filetypeWhitelist.includes(image.type);
    },
    req: function req(url, data, opts) {
      if (opts === undefined && data !== undefined) opts = data;
      var method = opts.method || "get";
      return axios[method]
        .call(null, url, data)
        .then(function handleSuccess(response) {
          if (!opts.ok) {
            return console.error(
              "Cannot execute request without success handler."
            );
          }
          opts.ok.call(null, response);
        })
        .catch(function handleFail(error) {
          if (typeof opts.fail === "function") opts.fail.call(null, error);
          else console.error(error);
        });
    },
  });

  // emitter ------------------------------------------------------------

  var emitter = (window._hpt.emitter =
    window._hpt.emitter ||
    (function emitter() {
      var handlers = {};
      function _registerEvent(eventName, handler) {
        if (handlers[eventName] && handlers[eventName].length) {
          handlers[eventName].push(handler);
        } else {
          handlers[eventName] = [handler];
        }
      }
      function on(eventName, handler) {
        // eventName could be array
        if (eventName instanceof Array) {
          eventName.forEach(function(en) {
            _registerEvent(en, handler);
          });
        } else {
          _registerEvent(eventName, handler);
        }
      }
      function off(eventName, handler) {
        if (!handlers[eventName]) return;
        var idx = handlers[eventName].indexOf(handler);
        if (idx === -1) return;
        handlers[eventName].splice(idx, 1);
      }
      function emit(eventName, data) {
        console.log("emitting", eventName, data);
        if (eventName === undefined) {
          return console.warn("Invalid event name: " + eventName);
        }
        if (handlers[eventName] === undefined) {
          return console.warn(
            "emitter: No listeners for this event name -> " + eventName
          );
        }
        handlers[eventName].forEach(function execHandler(handler) {
          handler.call(null, data);
        });
      }
      return { on, off, emit };
    })());
  emitter.events = {
    newPostAdded: "newPostAdded",
    imageUploaded: "imageUploaded",
    ctxMenuItemClicked: "ctxMenuItemClicked",
    postRemoved: "postRemoved",
  };

  // updateTypeButtons ------------------------------------------------------------

  m.updateTypeButtons = m.updateTypeButtons || {
    register: function register() {
      var sel = {
        text: "[data-bind=text]",
        youtube: "[data-bind=youtube]",
        survey: "[data-bind=survey]",
        milestone: "[data-bind=milestone]",
        roadmap: "[data-bind=roadmap]",
      };

      // get the btn elements
      var btnEls = Object.values(sel).map(function(sel) {
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
        // open all btnEls
        [].forEach.call(btnEls, function(btn) {
          var closeBtn = btn.querySelector("[data-close]");
          btn.classList.remove("hidden");
          if (closeBtn) closeBtn.classList.add("hidden");
        });
      }

      function handleBtnClick(e) {
        if (e.currentTarget.dataset.disabled !== undefined) {
          return;
        }

        // hide the other buttons and their bindings.
        btnEls.forEach(function hideBtn(_btn) {
          var closeBtn = _btn.querySelector("[data-close]");
          if (closeBtn) {
            closeBtn.addEventListener("click", handleCloseBtnClick);
          }

          // skip the clicked button -> it should stay open
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

        // show the form that's bound to the button
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
      }

      btnEls.forEach(function(btn) {
        if (!btn) return;
        btn.addEventListener("click", handleBtnClick);
      });
    },
  };

  // updateTypes ------------------------------------------------------------
  m.updateTypes = m.updateTypes || {
    textAndImage: {
      register: function register() {
        var rootEl = document.querySelector('[data-show="text"]');
        var formEl = rootEl.querySelector("form");
        var submitBtnEl = rootEl.querySelector('button[type="submit"]');
        var uploadImgBtnEl = rootEl.querySelector("[data-upload-image-btn]");
        var textEl = rootEl.querySelector("[data-text]");
        var uploadedImageEl = rootEl.querySelector("[data-uploaded]");
        var imgUploadLoaderEl = rootEl.querySelector(
          "[data-image-upload-loader]"
        );
        var previewEl = rootEl.querySelector("[data-upload-image-preview]");
        var fileUploadEl = rootEl.querySelector("[data-upload-file]");
        var textErrorEl = rootEl.querySelector("[data-error]");
        var postsContainerEl = document.querySelector("[data-posts-container]");
        var noPostsMsgEl = document.querySelector("[data-no-posts-msg]");
        var productIdInputEl = formEl.querySelector("input[name=id]");
        var tplEl = document.querySelector("[data-post-tpl]");

        // abort. Cannot do anything without product id.
        if (!productIdInputEl) {
          console.error("Couldn't find product id. 👀");
          return;
        }

        // Register text ------------------------------------------------------------
        function registerText() {
          emitter.on(emitter.events.newPostAdded, function handleNewPostAdded(
            data
          ) {
            textEl.value = "";
            var imgContainer = document.getElementById("img-container");
            if (imgContainer) imgContainer.remove();
            uploadedImageEl.value = "";
          });

          function extractFormValues() {
            var text = textEl.value;
            var uploadedImage = uploadedImageEl.value;
            var productId = productIdInputEl.value;
            return {
              text: text,
              image: uploadedImage,
              productId: productId,
            };
          }

          function validateFormValues(formValues) {
            var errors = {};
            if (formValues.text.length < 2) {
              errors.text = "Text is too short. You can do much better! 🤓";
            }
            if (isNaN(formValues.productId)) {
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

          function request(data, opts) {
            return window._hpt.utils.req(
              "/post/" + data.productId + "/text",
              data,
              Object.assign(opts, { method: "post" })
            );
          }

          function renderNewPost(post) {
            var clone = tplEl.cloneNode(true);

            // update data-post-id attribute and the link to the post
            var elsWithDataPostIdAttr = clone.content.querySelectorAll(
              "[data-post-id]"
            );
            elsWithDataPostIdAttr.forEach(function updateDataPostIdAttrs(el) {
              el.dataset.postId = post.id;
            });
            var link = clone.content.querySelector("[data-post-link]");
            link.href = link.href.replace("-1", post.id);

            var contentEl = clone.content.querySelector("[data-content]");

            contentEl.innerHTML = new showdown.Converter({
              noHeaderId: true,
              simplifiedAutoLink: true,
              tasklists: true,
              openLinksInNewWindow: true,
              emoji: true,
            }).makeHtml(post.text);
            var imageEl = clone.content.querySelector("[data-image]");
            if (post.image_url) {
              imageEl.src = post.image_url;
              imageEl.classList.remove("hidden");
              imageEl.parentElement.classList.remove("hidden");
            }

            emitter.emit(emitter.events.newPostAdded, {
              el: clone.content,
            });
            postsContainerEl.parentNode.prepend(clone.content);
          }

          function handleFormSubmit(e) {
            e.preventDefault();
            var formValues = extractFormValues();
            var errors = validateFormValues(formValues);

            // handle errors
            hideErrors();
            if (Object.keys(errors).length) return showErrors(errors);

            request(formValues, {
              ok: function ok(response) {
                var data = response.data;
                var details = data.details;
                if (data.ok) {
                  console.warn("data submitted successfully ", data);
                  var post = details.post;
                  renderNewPost(post);
                }
              },
            });
          }

          formEl.addEventListener("submit", handleFormSubmit);
        }

        // Register image ------------------------------------------------------------
        function registerImage() {
          if (!uploadImgBtnEl) return;

          emitter.on(emitter.events.imageUploaded, function handleImageUploaded(
            response
          ) {
            // first, check if there's already uploaded image preview.
            // Remove it, as a new image has been uploaded.
            var uploadedImagePreview = document.getElementById("img-container");
            if (uploadedImagePreview) {
              uploadedImagePreview.remove();
            }

            var url = response.data.details.url;
            uploadedImageEl.value = url;
            if (imgUploadLoaderEl) imgUploadLoaderEl.classList.add("hidden");
            if (submitBtnEl) submitBtnEl.removeAttribute("disabled");
            uploadImgBtnEl.removeAttribute("disabled");
            previewImage(url, previewEl);
          });

          function handleFileSelected() {
            var image = this.files[0];

            if (!utils.validateImageFiletype(image))
              return alert("Invalid file format.");

            uploadImgBtnEl.setAttribute("disabled", "disabled");
            if (submitBtnEl) submitBtnEl.setAttribute("disabled", "disabled");
            if (imgUploadLoaderEl) imgUploadLoaderEl.classList.remove("hidden");

            uploadImageToServer(image, {
              ok: function ok(data) {
                emitter.emit(emitter.events.imageUploaded, data);
              },
            });
          }

          function previewImage(url, previewEl) {
            var imgContainer = document.createElement("div");
            var rmBtn = document.createElement("button");
            var img = document.createElement("img");

            imgContainer.className += "flex items-center";
            imgContainer.id = "img-container";

            rmBtn.className += "ml-2 btn btn-danger btn-text text-xs";
            rmBtn.innerHTML = "Remove image";
            rmBtn.addEventListener("click", function rmBtnClick(e) {
              imgContainer.remove();
              uploadedImageEl.value = "";
            });

            img.className = "inline-block";
            img.style = "max-height: 35px;";
            img.src = url;
            img.dataset.zoomable = "data-zoomable";

            imgContainer.appendChild(img);
            imgContainer.appendChild(rmBtn);
            imgContainer.appendChild(img);
            imgContainer.appendChild(rmBtn);
            previewEl.appendChild(imgContainer);
          }

          function uploadImageToServer(image, opts) {
            var formData = new FormData();
            formData.append("image", image);
            return utils.req(
              "/upload-image",
              formData,
              Object.assign(
                {
                  method: "post",
                  headers: {
                    "Content-Type": "multipart/form-data",
                  },
                },
                opts
              )
            );
          }

          function handleUploadImageBtnClick() {
            fileUploadEl.click();
          }

          uploadImgBtnEl.addEventListener("click", handleUploadImageBtnClick);
          fileUploadEl.addEventListener("change", handleFileSelected, false);
        }

        registerText();
        registerImage();
      },
    },
  };

  // post boosts ------------------------------------------------------------
  m.postBoosts = m.postBoosts || {
    register: function register() {
      var boostBtns = document.querySelectorAll("[data-post-boost-btn]");

      function handleBoostPostClick(btn, e) {
        e.preventDefault();

        var postId = btn.dataset.postId;

        utils.req("/post/" + postId + "/boost", {
          method: "post",
          ok: function ok(response) {
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
          },
          fail: function fail(error) {
            if (error.response && error.response.data) {
              var msg = error.response.data.err;
              alert(msg);
            }
            console.error(error);
          },
        });
      }

      boostBtns.forEach(function registerBoostPostBtn(btn) {
        if (btn.dataset.disabled !== undefined) return; // skip listening
        btn.addEventListener("click", handleBoostPostClick.bind(null, btn));
      });
    },
  };

  // product boosts ------------------------------------------------------------

  m.productBoosts = m.productBoosts || {
    register: function register() {
      var btnEl = document.querySelector("[data-product-boost-btn]");
      var counterEl = document.querySelector("[data-product-boost-counter]");
      var slugEl = document.querySelector("[data-product-slug]");
      var boostsCountEl = document.querySelector("[data-product-boosts-count]");
      var slug = slugEl.dataset.productSlug;
      var boostsCount = boostsCountEl.dataset.productBoostsCount;
      if (!btnEl || !slug) return;

      btnEl.addEventListener("click", function productBoostBtnElClick() {
        utils.req("/p/" + slug + "/boost", {
          method: "post",
          ok: function ok(response) {
            var newCount;
            if (isNaN(boostsCount)) {
              newCount = 0;
            } else {
              newCount = Number(boostsCount) + 1;
            }

            counter.innerHTML = newCount;
            boostsCountEl.dataset.productBoostsCount = newCount;
          },
          fail: function boostProductResponseError(err) {
            var data = err.response.data;
            alert(data.err);
          },
        });
      });
    },
  };

  // ctxMenus ------------------------------------------------------------

  m.ctxMenus = m.ctxMenus || {
    register: function register() {
      emitter.on(emitter.events.newPostAdded, function(data) {
        const el = data.el.querySelectorAll("[data-ctx-menu-trigger]");
        setupListeners(el);
      });

      function setupListeners(triggers) {
        triggers.forEach(function mapCtxMenuTriggers(triggerEl) {
          triggerEl.addEventListener("click", function ctxMenuClick(e) {
            var menu = document.querySelector(
              '[data-ctx-menu="' + e.currentTarget.dataset.ctxMenuTrigger + '"]'
            );
            var actions = menu.querySelectorAll("[data-ctx-action]");
            var closeEls = menu.querySelectorAll("[data-ctx-menu-close]");

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

            function handleActionClick(e) {
              var action = e.currentTarget.dataset.ctxAction;
              emitter.emit(emitter.events.ctxMenuItemClicked, {
                ctx: menu,
                action: action,
                clickedEl: e.currentTarget,
              });
            }

            // register ctx btn handlers
            actions.forEach(function(action) {
              action.addEventListener("click", handleActionClick);
            });

            function closeCtxMenu(e) {
              menu.classList.add("hidden");
              menu.parentElement.classList.remove("z-10");
              document.body.removeEventListener("click", closeCtxMenu);
              actions.forEach(function(actionEl) {
                actionEl.removeEventListener("click", handleActionClick);
              });
              closeEls.forEach(function(closeEl) {
                closeEl.removeEventListener("click", closeCtxMenu);
              });
            }

            // register ctx close btn handlers
            closeEls.forEach(function(closeEl) {
              closeEl.addEventListener("click", function(e) {
                closeCtxMenu(e);
              });
            });

            // register outside click handlers
            document.body.addEventListener("click", function(e) {
              if (menu.contains(e.target) || triggerEl.contains(e.target))
                return;

              closeCtxMenu(e);
            });
          });
        });
      }

      setupListeners(document.querySelectorAll("[data-ctx-menu-trigger]"));
    },
  };

  m.postActions = m.postActions || {
    register: function register() {
      function deletePost(postId) {
        utils.req("/post/" + postId, {
          method: "delete",
          ok: function postDelResponse(response) {
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
            emitter.emit(emitter.events.postRemoved, {
              el: post,
              postId: postId,
              response: response,
            });
          },
        });
      }

      emitter.on(emitter.events.ctxMenuItemClicked, function(data) {
        console.log(data);
        if (data.action) {
          switch (data.action) {
            case "delete":
              var ok = window.confirm(
                "Deleting a post is irreversible. Delete post anyway?"
              );
              if (ok) deletePost(data.clickedEl.dataset.postId);
              break;
          }
        }
      });
    },
  };

  m.postsWall = m.postsWall || {
    register: function register() {
      var postsContainerEl = document.querySelector("[data-posts-container]");
      var noPostsMsgEl = document.querySelector("[data-no-posts-msg]");

      emitter.on(emitter.events.postRemoved, function(data) {
        if (!postsContainerEl.childNodes.length) {
          noPostsMsgEl.classList.remove("hidden");
        }
      });

      emitter.on(emitter.events.newPostAdded, function(data) {
        noPostsMsgEl.classList.add("hidden");
      });
    },
  };

  // medium zoom ------------------------------------------------------------
  // autoloaded, no need to register it.
  m.mediumZoom =
    m.mediumZoom ||
    (function() {
      var mz = mediumZoom("[data-zoomable]", {
        margin: 50,
        background: `rgba(0,0,0,0.5)`,
      });

      function reload() {
        mz.detach();
        mz.attach(document.querySelectorAll("[data-zoomable]"));
      }

      emitter.on(
        [emitter.events.imageUploaded, emitter.events.newPostAdded],
        reload
      );
    })();
});
