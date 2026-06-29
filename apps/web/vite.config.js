import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Vendored Hedgeling i18n build (see apps/web/vendor/hedgeling-i18n).
import { hedgelingI18n } from "./vendor/hedgeling-i18n/dist/vite/index.js";
var here = dirname(fileURLToPath(import.meta.url));
var workspaceRoot = resolve(here, "..", "..");
var runtimeEntry = resolve(here, "vendor/hedgeling-i18n/dist/runtime/index.js");
// Transform our own source (.tsx/.jsx for JSX auto-wrap + <Trans/>, and .ts for
// canvas fillText/strokeText auto-wrap), but never node_modules, declaration
// files, or the vendored Hedgeling runtime itself.
function includeForI18n(id) {
    var _a;
    var clean = (_a = id.split("?")[0]) !== null && _a !== void 0 ? _a : id;
    if (clean.includes("node_modules"))
        return false;
    if (clean.includes("/vendor/hedgeling-i18n/"))
        return false;
    if (clean.endsWith(".d.ts"))
        return false;
    return /\.(tsx|jsx|ts|mts)$/.test(clean);
}
export default defineConfig({
    plugins: [
        // enforce: "pre" -> auto-wraps JSX text/attributes with __hlT(...), emits
        // <Trans/> for inline markup, and wraps canvas text in .ts draw files BEFORE
        // @vitejs/plugin-react compiles the JSX.
        hedgelingI18n({ workspaceRoot: workspaceRoot, include: includeForI18n }),
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
