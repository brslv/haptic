import * as Turbo from "@hotwired/turbo";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import { $, turbo, frameLoaded, registerFrame, unregisterFrame } from "./utils";
import modal from "./widgets/modal";
import toasts from "./widgets/toasts";
import tooltip from "./widgets/tooltip";
import createProduct from "./widgets/create-product";
import feedback from "./widgets/feedback";
import shortUpdateCreate from "./widgets/post-types/short-update/short-update-create";
import shortUpdateEdit from "./widgets/post-types/short-update/short-update-edit";
import pollForm from "./widgets/post-types/poll/poll-form";
import pollVote from "./widgets/post-types/poll/poll-vote";
import textareaAutoresize from "./widgets/textarea-autoresize";
import imageZoom from "./widgets/image-zoom";
import contextMenu, { collectionContextMenu } from "./widgets/context-menu";
import tools from "./widgets/tools";
import deleteProduct from "./widgets/delete-product";
import flashMessages from "./widgets/flash-messages";
import boost from "./widgets/boost";
import collect from "./widgets/collect";
import cookieConsent from "./widgets/cookie-consent";
import waitlistForm from "./widgets/waitlist-form";
import mobileNav from "./widgets/mobile-nav";
import postActions from "./widgets/post-actions";
import browse from "./widgets/browse";
import comments from "./widgets/comments";
import twitter from "./widgets/twitter";
import products from "./widgets/products";
import coverImage from "./widgets/cover-image";
import productLogo from "./widgets/product-logo";

turbo.beforeFetchResponse(() => {
  registerFrame("browse-posts-list");
});

turbo.beforeFetchRequest(() => {
  unregisterFrame("browse-posts-list");
});

turbo.load(() => {
  Turbo.setProgressBarDelay(0);
});

modal();
tooltip();
toasts();
createProduct();
feedback();
shortUpdateCreate();
shortUpdateEdit();
textareaAutoresize();
imageZoom();
contextMenu();
tools();
deleteProduct();
flashMessages();
boost();
collect();
collectionContextMenu();
cookieConsent();
waitlistForm();
mobileNav();
postActions();
browse();
comments();
twitter();
products();
coverImage();
productLogo();
pollForm();
pollVote();
