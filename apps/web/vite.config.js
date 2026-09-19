import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { hedgelingI18n } from "@hedgeling/i18n/vite";
var here = dirname(fileURLToPath(import.meta.url));
var workspaceRoot = resolve(here, "..", "..");
// Transform our own source (.tsx/.jsx for JSX auto-wrap + <Trans/>, and .ts for
// canvas fillText/strokeText auto-wrap), but never node_modules or declaration
// files.
function includeForI18n(id) {
    var _a;
    var clean = (_a = id.split("?")[0]) !== null && _a !== void 0 ? _a : id;
    if (clean.includes("node_modules"))
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
        // Ensure one React instance (Hedgeling runtime uses React hooks).
        dedupe: ["react", "react-dom"],
    },
    server: {
        port: 5173,
    },
});
