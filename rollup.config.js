import { nodeResolve } from "@rollup/plugin-node-resolve";
import css from "rollup-plugin-import-css";
import injectProcessEnv from "rollup-plugin-inject-process-env";

export default {
  input: "./src/js/index.js",
  output: {
    file: "./public/js/bundle.js",
    name: "bundle.js",
    format: "iife",
  },
  plugins: [
    nodeResolve(),
    css(),
    injectProcessEnv({
      NODE_ENV: "production",
    }),
  ],
};
