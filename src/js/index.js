import * as Turbo from "@hotwired/turbo";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import { $, turbo } from "./utils";
import modal from "./widgets/modal";
import toasts from "./widgets/toasts";
import tooltip from "./widgets/tooltip";
import createProduct from "./widgets/create-product";
import feedback from "./widgets/feedback";
import shortUpdate from "./widgets/short-update";
import textareaAutoresize from "./widgets/textarea-autoresize";
import imageZoom from "./widgets/image-zoom";
import contextMenu, {
  postContextMenu,
  collectionContextMenu,
} from "./widgets/context-menu";
import tools from "./widgets/tools";
import deleteProduct from "./widgets/delete-product";
import flashMessages from "./widgets/flash-messages";
import boost from "./widgets/boost";
import collect from "./widgets/collect";
import cookieConsent from "./widgets/cookie-consent";
import waitlistForm from "./widgets/waitlist-form";

turbo.load(() => {
  Turbo.setProgressBarDelay(0);
});
modal();
tooltip();
toasts();
createProduct();
feedback();
shortUpdate();
textareaAutoresize();
imageZoom();
contextMenu();
postContextMenu();
tools();
deleteProduct();
flashMessages();
boost();
collect();
collectionContextMenu();
cookieConsent();
waitlistForm();
