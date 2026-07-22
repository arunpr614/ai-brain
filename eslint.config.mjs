import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Throwaway benchmark / spike scripts — intentionally loose typing
    "scripts/**",
    // Frozen design handoff artifacts and UX planning docs are reference
    // material, not production app source.
    "UX_UI_DESIGN_PACKAGE/**",
    "UX_v2/**",
    "docs/feature-council/**/prototype/**",
    "docs/feature-council/**/design/**/dist/**",
    // Vendored, minified libraries used by inert planning prototypes.
    "docs/plans/**/prototype/assets/**/*.min.js",
    // Capacitor Android project — v0.5.0 T-9. Gradle-generated JS
    // (native-bridge.js, etc) ends up under android/app/build/intermediates/
    // and produces spurious warnings; android/ is already .gitignored for
    // build artefacts but ESLint's default globs walk it anyway.
    "android/**",
    // Chrome extension bundle output; source lives under extension/src.
    "extension/dist/**",
  ]),
]);

export default eslintConfig;
