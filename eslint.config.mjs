import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next already registers the `jsx-a11y` plugin and pulls in its
// recommended ruleset. Importing eslint-plugin-jsx-a11y again here was causing
// "Cannot redefine plugin 'jsx-a11y'" and broke `npm run lint` entirely.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
    "*.config.mjs",
    "*.config.ts",
  ]),
]);

export default eslintConfig;
