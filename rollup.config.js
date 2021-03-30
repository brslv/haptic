import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  input: "./src/js/index.js",
  output: {
    file: "./public/js/bundle.js",
    name: "bundle.js",
    format: "iife",
  },
  plugins: [nodeResolve()],
};
