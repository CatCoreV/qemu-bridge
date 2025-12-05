import js from "@eslint/js";
import globals from "globals";
import babelParser from "@babel/eslint-parser";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: {...globals.browser, ...globals.node, CatCore: "readonly"}, parser: babelParser, parserOptions: { requireConfigFile: false, ecmaVersion: "latest", sourceType: "module" } }, rules: {"no-empty": "off", "no-fallthrough": "off"} },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
]);
