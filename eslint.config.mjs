import js from "@eslint/js";
import globals from "globals";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["src/uniter.js", "src/ruby2.js", "src/novnc.js"]),
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: {...globals.browser, ...globals.node, nw: "readonly", uniter: "readonly", Ruby2JS: "readonly", noVNC: "readonly", chrome: "readonly"} }, rules: {"no-empty": "off", "no-fallthrough": "off"} },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
]);
