import React from "react";
import ReactDOM from "react-dom";
import App from "./EditorApp";

document.addEventListener("turbo:load", () => {
  const root = document.querySelector("#react-editor");

  if (!root) return;

  ReactDOM.render(<App />, root);
});

document.addEventListener("turbo:before-cache", () => {
  const root = document.querySelector("#react-editor");

  root.innerHTML = `
    <div class="absolute top-0 left-0 w-full bg-white rounded-md border border-gray-200 animate-pulse mb-4 flex items-center justify-center text-gray-500" style="height: 200px;">
      Loading editor...
    </div>`;
});
