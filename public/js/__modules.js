document.addEventListener("DOMContentLoaded", function handleDomLoaded() {
  window._hpt = window._hpt || {};
  var m = (window._hpt.modules = window._hpt.modules || {});

  // - utils ------------------------------------------------------------

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
          if (error.response) {
            if (typeof opts.fail === "function") opts.fail.call(null, error);
            else console.error(error);
          }
          console.error(error);
        });
    },
    getParents: function getParents(elem, selector) {
      // Element.matches() polyfill
      if (!Element.prototype.matches) {
        Element.prototype.matches =
          Element.prototype.matchesSelector ||
          Element.prototype.mozMatchesSelector ||
          Element.prototype.msMatchesSelector ||
          Element.prototype.oMatchesSelector ||
          Element.prototype.webkitMatchesSelector ||
          function(s) {
            var matches = (
                this.document || this.ownerDocument
              ).querySelectorAll(s),
              i = matches.length;
            while (--i >= 0 && matches.item(i) !== this) {}
            return i > -1;
          };
      }

      // Set up a parent array
      var parents = [];

      // Push each parent element to the array
      for (; elem && elem !== document; elem = elem.parentNode) {
        if (selector) {
          if (elem.matches(selector)) {
            parents.push(elem);
          }
          continue;
        }
        parents.push(elem);
      }

      // Return our parent array
      return parents;
    },
  });

  // - emitter ------------------------------------------------------------

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
        // console.log("emitting", eventName, data);
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
    imagePreviewRendered: "imagePreviewRendered",
    ctxMenuItemClicked: "ctxMenuItemClicked",
    postRemoved: "postRemoved",
    productToolAdded: "productToolAdded",
    productToolMounted: "productToolMounted",
    productCollected: "productCollected",
    collectionItemRemoved: "collectionItemRemoved",
    addToast: "addToast",
  };

  // - updateTypeButtons ------------------------------------------------------------

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

  // - updateTypes ------------------------------------------------------------
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

        // - Register text ------------------------------------------------------------
        function registerText() {
          emitter.on(emitter.events.newPostAdded, function handleNewPostAdded(
            data
          ) {
            textEl.value = "";
            var imgContainer = document.getElementById("img-container");
            if (imgContainer) imgContainer.remove();
            uploadedImageEl.value = "";
          });

          emitter.on(emitter.events.newPostAdded, function() {
            emitter.emit(emitter.events.addToast, {
              content: "Your new post is live! 🎉",
              type: m.toast.types.success,
            });
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

            postsContainerEl.prepend(clone.content);
            emitter.emit(emitter.events.newPostAdded, {
              el: clone.content,
            });
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
                  var post = details.post;
                  renderNewPost(post);
                }
              },
            });
          }

          formEl.addEventListener("submit", handleFormSubmit);
        }

        // - Register image ------------------------------------------------------------
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
            emitter.emit(emitter.events.imagePreviewRendered, {
              previewEl: previewEl,
            });
          });

          function handleFileSelected() {
            var image = this.files[0];

            if (!utils.validateImageFiletype(image)) {
              return emitter.emit(emitter.events.addToast, {
                content: "Invalid file format",
                type: error,
              });
              // return alert("Invalid file format.");
            }

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

  // - post boosts ------------------------------------------------------------
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
              emitter.emit(emitter.events.addToast, {
                content: msg,
                type: m.toast.types.error,
              });
              // alert(msg);
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

  // - product boosts ------------------------------------------------------------

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

            counterEl.innerHTML = newCount;
            boostsCountEl.dataset.productBoostsCount = newCount;
          },
          fail: function boostProductResponseError(err) {
            var data = err.response.data;
            emitter.emit(emitter.events.addToast, {
              content: data.err,
              type: m.toast.types.error,
            });
            // alert(data.err);
          },
        });
      });
    },
  };

  // - ctxMenus ------------------------------------------------------------

  m.ctxMenus = m.ctxMenus || {
    register: function register() {
      emitter.on(emitter.events.newPostAdded, function(data) {
        const el = data.el.querySelectorAll("[data-ctx-menu-trigger]");
        setupListeners(el);
      });

      function setupListeners(triggers) {
        triggers.forEach(function mapCtxMenuTriggers(triggerEl) {
          triggerEl.addEventListener("click", function ctxMenuClick(e) {
            e.stopPropagation();
            e.preventDefault();
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
              e.stopPropagation();
              e.preventDefault();

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
              document.removeEventListener("click", closeCtxMenu);
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
            document.addEventListener("click", function(e) {
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

  // - posts actions ------------------------------------------------------------

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

  // - posts wall ------------------------------------------------------------

  m.postsWall = m.postsWall || {
    register: function register() {
      var postsContainerEl = document.querySelector("[data-posts-container]");
      var noPostsMsgEl = document.querySelector("[data-no-posts-msg]");

      emitter.on(emitter.events.postRemoved, function(data) {
        if (!postsContainerEl.childNodes.length) {
          noPostsMsgEl.classList.remove("hidden");
        }
        emitter.emit(emitter.events.addToast, {
          content: "Post removed",
          type: m.toast.types.success,
        });
      });

      emitter.on(emitter.events.newPostAdded, function(data) {
        noPostsMsgEl.classList.add("hidden");
      });
    },
  };

  // - delete product ------------------------------------------------------------

  m.deleteProduct = m.deleteProduct || {
    register: function register() {
      var delBtnEl = document.querySelector("[data-delete-product-btn]");
      var productDelFormEl = document.getElementById("product-delete-form");
      if (!delBtnEl || !productDelFormEl) return;

      delBtnEl.addEventListener("click", function delBtnElClick(e) {
        e.preventDefault();
        var ok = window.confirm(
          "Deleting a product is irreversible. Delete it anyway?"
        );
        if (ok) deleteProduct(e.currentTarget.dataset.postId);
      });

      function deleteProduct() {
        productDelFormEl.submit();
      }
    },
  };

  // - create product ------------------------------------------------------------

  m.createProduct = m.createProduct || {
    register: function register() {
      var createBtn = document.getElementById("create-product-btn");
      var modal = document.querySelector(
        '[data-modal-name="create-product-modal"]'
      );
      var close = document.querySelector(
        '[data-modal-name="create-product-modal"] [data-modal-close]'
      );
      var form = document.getElementById("create-product-form");
      var productNameEl = document.getElementById("product-name");

      if (createBtn && modal) {
        createBtn.addEventListener("click", function onCreate() {
          modal.classList.remove("hidden");
          if (productNameEl) productNameEl.focus();
        });
      }

      if (close && modal) {
        close.addEventListener("click", function onClose() {
          modal.classList.add("hidden");
        });
      }

      if (form) {
        (function() {
          var productSlugEl = document.getElementById("product-slug");
          var submitBtn = document.querySelector(
            '#create-product-form button[type="submit"]'
          );
          var genSlugBtn = document.querySelector(
            "#create-product-form button[data-form-gen-slug-btn]"
          );

          genSlugBtn.addEventListener("click", function productNameElBlur() {
            var productName = productNameEl.value;
            submitBtn.setAttribute("disabled", "disabled");
            utils.req(
              "/product-slug",
              { name: productName },
              {
                method: "post",
                ok: function getProductSlug(result) {
                  if (result.data.ok) {
                    productSlugEl.value = result.data.details.slug;
                  }
                  submitBtn.removeAttribute("disabled");
                },
              }
            );
          });

          function validation(e) {
            if (productNameEl.value.length && productSlugEl.value.length) {
              submitBtn.removeAttribute("disabled");
            } else {
              submitBtn.setAttribute("disabled", "disabled");
            }

            if (productNameEl.value.length) {
              genSlugBtn.removeAttribute("disabled");
              productSlugEl.removeAttribute("disabled");
            } else {
              genSlugBtn.setAttribute("disabled", "disabled");
              productSlugEl.setAttribute("disabled", "disabled");
            }
          }

          productNameEl.addEventListener("blur", validation);
          productSlugEl.addEventListener("blur", validation);
          productNameEl.addEventListener("input", validation);
          productSlugEl.addEventListener("input", validation);

          form.addEventListener("submit", function asyncFormSubmit(e) {
            e.preventDefault();
            var productName = productNameEl.value;
            var productSlug = productSlugEl.value;

            function submit() {
              utils.req(
                "/product",
                { name: productName, slug: productSlug },
                {
                  method: "post",
                  ok: function createProduct(result) {
                    var slug = result.data.details.slug;
                    window.location.href =
                      "/dashboard/product/" + slug + "/settings";
                  },
                  fail: function fail(err) {
                    var errorEl = document.querySelector(
                      "#create-product-form [data-form-error]"
                    );
                    errorEl.classList.remove("hidden");
                    errorEl.innerHTML = err.response.data.err;
                  },
                }
              );
            }

            setTimeout(submit, 0);
          });
        })();
      }
    },
  };

  // - cookies consent ------------------------------------------------------------

  m.cookiesConsent =
    m.cookiesConsent ||
    (function() {
      var cookiesConsentEl = document.getElementById("cookies-consent");
      var consentAccepted = localStorage.getItem("cookies-consent");

      function showConsent() {
        if (consentAccepted === "true") return;

        var consentOkButton = document.getElementById("cookies-consent-ok-btn");
        cookiesConsentEl.classList.remove("hidden");

        consentOkButton.addEventListener("click", function consentBtnClick() {
          localStorage.setItem("cookies-consent", "true");
          cookiesConsentEl.classList.add("hidden");
        });
      }

      showConsent();
    })();

  // - axios setup ------------------------------------------------------------

  m.axiosSetup =
    m.axiosSetup ||
    (function() {
      axios.interceptors.response.use(
        function(response) {
          return response;
        },
        function(error) {
          if (error.response.status === 401) window.location.href = "/login";
          if (error.response.status === 500) {
            emitter.emit(emitter.events.addToast, {
              content: error.response.data.err,
              type: m.toast.types.error,
            });
          }
          return Promise.reject(error);
        }
      );
    })();

  // - dark mode ------------------------------------------------------------

  m.darkMode = m.darkMode || {
    register: function register() {
      var toggle = document.querySelector("[data-dark-mode-toggle]");
      var htmlEl = document.getElementsByTagName("html")[0];
      var isDark = localStorage.getItem("dark-mode");

      if (isDark === "true") {
        htmlEl.classList.add("dark");
      } else {
        htmlEl.classList.remove("dark");
      }

      toggle.addEventListener("click", function toggleDarkMode() {
        htmlEl.classList.toggle("dark");
        var isDark = htmlEl.classList.contains("dark");
        localStorage.setItem("dark-mode", isDark);
      });
    },
  };

  // - ta autoresize ------------------------------------------------------------

  m.textAreaAutoresize = m.textAreaAutoresize || {
    register: function register() {
      function addAutoResize() {
        document
          .querySelectorAll("[data-autoresize]")
          .forEach(function(element) {
            element.style.boxSizing = "border-box";
            var offset = element.offsetHeight - element.clientHeight;
            element.addEventListener("input", function(event) {
              event.target.style.height = "auto";
              event.target.style.height =
                event.target.scrollHeight + offset + "px";
            });
            element.removeAttribute("data-autoresize");
          });
      }
      addAutoResize();
    },
  };

  // - tooltips ------------------------------------------------------------

  m.tooltips =
    m.tooltips ||
    (function() {
      tippy("[data-tippy-content]", {
        arrow: false,
        animation: "fade",
        delay: [150, 0],
        inlinePositioning: true,
        placement: "bottom",
        theme: "haptic",
      });
    })();

  // - medium zoom ------------------------------------------------------------

  m.mediumZoom =
    m.mediumZoom ||
    (function() {
      var mz = mediumZoom("[data-zoomable]", {
        margin: 50,
        background: `rgba(255,255,255,0.9)`,
      });

      function reload(data) {
        mz.detach();
        mz.attach(document.querySelectorAll("[data-zoomable]"));
      }

      emitter.on(
        [emitter.events.imagePreviewRendered, emitter.events.newPostAdded],
        reload
      );
    })();

  // - product tools ------------------------------------------------------------

  m.productTools = m.productTools || {
    register: function register() {
      var rootEl = document.querySelector("[data-product-tools-root]");
      var addBtnEl = rootEl.querySelector("[data-product-tools-add-btn]");
      var form = rootEl.querySelector("[data-product-tools-form]");
      var inputEl = rootEl.querySelector("[data-product-tools-input]");
      var closeBtn = rootEl.querySelector("[data-product-tools-close-btn]");
      var tpl = document.querySelector("[data-product-tool-tpl]");
      var container = rootEl.querySelector("[data-product-tools-container]");
      var removeToolBtns = rootEl.querySelectorAll(
        "[data-product-tools-remove-btn]"
      );

      if (!rootEl || !rootEl.dataset.productToolsProductSlug) {
        console.error(
          "No product slug found. Missing data-product-tools-product-slug attribute."
        );
        return;
      }

      if (!tpl) {
        console.error(
          "No product tool template found template[data-product-tool-tip]."
        );
        return;
      }

      emitter.on(
        emitter.events.productToolAdded,
        function handleProductToolAdded(tool) {
          addProductToolElement(tool);
        }
      );

      emitter.on(
        emitter.events.productToolMounted,
        function handleProductToolMounted(data) {
          addListenersToMountedTool(data);
        }
      );

      function addProductToolElement(tool) {
        var cloneEl = tpl.cloneNode(true);
        var idEl = cloneEl.content.querySelector("[data-product-tool-id]");
        idEl.dataset.productToolId = tool.id;
        cloneEl.content.querySelector("[data-text-container]").innerHTML =
          tool.text;
        emitter.emit(emitter.events.productToolMounted, {
          el: cloneEl.content,
        });
        container.appendChild(cloneEl.content);
      }

      function addListenersToMountedTool(data) {
        var el = data.el;
        if (!el) return;
        var removeBtnEl = el.querySelector("[data-product-tools-remove-btn");
        removeBtnEl.addEventListener("click", function(e) {
          removeTool(e.currentTarget);
        });
      }

      var productSlug = rootEl.dataset.productToolsProductSlug;

      removeToolBtns.forEach(function handleRemoveTool(removeToolBtnEl) {
        removeToolBtnEl.addEventListener("click", function(e) {
          removeTool(e.currentTarget);
        });
      });

      function removeTool(currentTarget) {
        var parents = utils.getParents(currentTarget, "[data-product-tool-id]");
        if (!parents.length) {
          console.warn(
            "Cannot remove tool. No data-product-tool-id attribute found on any of the parent elements."
          );
          return;
        }

        var id = parents[0].dataset.productToolId;

        utils.req("/product/" + productSlug + "/tool/" + id, {
          method: "delete",
          ok: function ok(result) {
            if (result.data.ok) {
              parents[0].remove();
            }
          },
        });
      }

      addBtnEl.addEventListener("click", function openForm() {
        form.classList.remove("hidden");
        inputEl.focus();
      });

      closeBtn.addEventListener("click", function hideForm() {
        form.classList.add("hidden");
      });

      form.addEventListener("submit", function formSubmit(e) {
        e.preventDefault();
        var value = inputEl.value;
        utils.req(
          "/product/" + productSlug + "/tool",
          {
            text: value,
          },
          {
            method: "post",
            ok: function handleAddTool(response) {
              inputEl.value = "";
              emitter.emit(emitter.events.productToolAdded, {
                ...response.data.details.tool,
              });
            },
          }
        );
      });
    },
  };

  // collect ------------------------------------------------------------

  m.collect = m.collect || {
    register: function register() {
      var collectBtnEl = document.querySelector("[data-product-collect-btn]");
      if (!collectBtnEl) {
        console.warn("No collect btn found on the page.");
        return;
      }
      var slug = collectBtnEl.dataset.productSlug;
      if (!slug) {
        console.warn("No product slug available.");
        return;
      }

      collectBtnEl.addEventListener("click", function handleCollectClick(e) {
        utils.req("/p/" + slug + "/collect", {
          method: "post",
          ok: function ok(response) {
            emitter.emit(emitter.events.productCollected);
            emitter.emit(emitter.events.addToast, {
              content: "Product collected.",
              type: m.toast.types.success,
            });
          },
          fail: function fail(err) {
            emitter.emit(emitter.events.addToast, {
              content: err.response.data.err,
              type: m.toast.types.error,
            });
            // alert(err.response.data.err);
          },
        });
      });
    },
  };

  // collection list ------------------------------------------------------------

  m.collectionList = m.collectionList || {
    register: function register() {
      var listEl = document.querySelector("[data-collections-list]");

      emitter.on(emitter.events.collectionItemRemoved, handleRemove);

      function handleRemove() {
        if (listEl) {
          if (!listEl.firstChild) {
            var noItemsMsgEl = document.querySelector(
              "[data-collections-no-items-msg]"
            );
            noItemsMsgEl.classList.remove("hidden");
            emitter.emit(emitter.events.addToast, {
              content: "Product removed from your collection",
              type: m.toast.types.success,
            });
          }
        }
      }
    },
  };

  // collection item ------------------------------------------------------------

  m.collectionItemActions = m.collectionItemActions || {
    register: function register() {
      emitter.on(emitter.events.ctxMenuItemClicked, handleCtxMenuItemClicked);

      function handleCtxMenuItemClicked(data) {
        switch (data.action) {
          case "delete": {
            deleteCollectionItem(data);
            break;
          }
        }
      }

      function deleteCollectionItem(data) {
        var slug = data.clickedEl.dataset.productSlug;
        if (!slug) {
          console.warn("No available product slug.");
          return;
        }

        utils.req("/p/" + slug + "/collect", {
          method: "delete",
          ok: function ok(response) {
            var parents = utils.getParents(
              data.clickedEl,
              "[data-collected-product-root]"
            );
            if (!parents.length) {
              console.warn(
                "No data-collected-product-root parent found. Delete aborted."
              );
              return;
            }

            var root = parents[0];
            root.remove();
            emitter.emit(emitter.events.collectionItemRemoved);
          },
          fail: function fail(err) {
            console.error(err.response);
          },
        });
      }
    },
  };

  // toast ------------------------------------------------------------

  m.toast =
    m.toast ||
    (function() {
      var toastsEl = document.querySelector("[data-toasts]");

      if (!toastsEl) {
        console.warn("Toasts failed to load. No data-toasts element.");
        return;
      }

      emitter.on(emitter.events.addToast, addToast);

      function addToast(data) {
        var content = data.content;
        var type = data.type || "default";
        var tplEl = document.querySelector("[data-toast-tpl]");

        if (!tplEl) {
          console.warn("No toast tpl element.");
          return;
        }

        var clone = tplEl.cloneNode(true);
        var rootEl = clone.content.querySelector("[data-toast-id]");

        // setup the toast color
        var color;
        if (type === m.toast.types.default) color = "bg-blue-400";
        if (type === m.toast.types.success) color = "bg-green-400";
        if (type === m.toast.types.error) color = "bg-red-400";
        rootEl.firstChild.classList.add(color);

        var randId = Math.random();
        rootEl.dataset.toastId = randId;
        var contentEl = clone.content.querySelector("[data-toast-content]");
        contentEl.innerText = content;

        var closeEl = clone.content.querySelector("[data-toast-close-btn]");
        var closeClickHandler = hideToast.bind(null, { id: randId });
        closeEl.addEventListener("click", closeClickHandler);

        setTimeout(function() {
          hideToast({ id: randId });
        }, 4000);

        toastsEl.prepend(rootEl);

        function hideToast(data) {
          var id = data.id;
          var toastEl = toastsEl.querySelector('[data-toast-id="' + id + '"]');
          if (!toastEl) return;
          toastEl.remove();
          closeEl.removeEventListener("click", closeClickHandler);
        }
      }

      return {
        addToast,
      };
    })();
  m.toast.types = m.toast.types || {
    default: "default",
    success: "success",
    error: "error",
  };
});
