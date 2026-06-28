import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Vendored Hedgeling i18n build (see apps/web/vendor/hedgeling-i18n).
import { hedgelingI18n } from "./vendor/hedgeling-i18n/dist/vite/index.js";
var here = dirname(fileURLToPath(import.meta.url));
var workspaceRoot = resolve(here, "..", "..");
var runtimeEntry = resolve(here, "vendor/hedgeling-i18n/dist/runtime/index.js");
export default defineConfig({
    plugins: [
        // enforce: "pre" -> auto-wraps JSX text/attributes with __hlT(...) and emits
        // <Trans/> for inline markup BEFORE @vitejs/plugin-react compiles the JSX.
        hedgelingI18n({ workspaceRoot: workspaceRoot }),
        react(),
    ],
    resolve: {
        // The plugin injects `import { __hlT, Trans } from "@hedgeling/i18n/runtime"`;
        // map it to the vendored runtime so there is a single copy.
        alias: {
            "@hedgeling/i18n/runtime": runtimeEntry,
        },
        // Ensure one React instance (vendored runtime uses React hooks).
        dedupe: ["react", "react-dom"],
    },
    server: {
        port: 5173,
    },
});
