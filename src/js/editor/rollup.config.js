import { nodeResolve } from "@rollup/plugin-node-resolve";
import css from "rollup-plugin-import-css";
import injectProcessEnv from "rollup-plugin-inject-process-env";
import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "./src/js/editor/index.js",
  output: {
    file: "./public/js/editor/bundle.js",
    name: "bundle.js",
    format: "iife",
  },
  plugins: [
    babel({
      presets: ["@babel/preset-react"],
    }),
    commonjs({
      include: ["node_modules/**"],
    }),
    nodeResolve({
      extensions: [".js", ".jsx"],
    }),
    css(),
    injectProcessEnv({
      NODE_ENV: "production",
    }),
  ],
};
