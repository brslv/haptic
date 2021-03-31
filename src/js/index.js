import * as Turbo from "@hotwired/turbo";
import { $, turbo } from "./utils";
import modal from "./widgets/modal";
import toasts from "./widgets/toasts";
import createProduct from "./widgets/create-product";
import feedback from "./widgets/feedback";
import shortUpdate from "./widgets/short-update";
import textareaAutoresize from "./widgets/textarea-autoresize";
import imageZoom from "./widgets/image-zoom";
import contextMenu from "./widgets/context-menu";

turbo.load(() => {
  Turbo.setProgressBarDelay(0);
});
modal();
toasts();
createProduct();
feedback();
shortUpdate();
textareaAutoresize();
imageZoom();
contextMenu();
