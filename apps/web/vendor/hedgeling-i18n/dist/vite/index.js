import { loadExtractConfig } from "../core/config.js";
import { getAdapters, pickAdapter, selectAdapters } from "../core/registry.js";
import { IMPORT_MARKER } from "../adapters/ecmascript/identify.js";
// Side-effect import: registers the built-in adapters (react-ts, js-ts, html,
// vue) so the plugin works even when only the "@hedgeling/i18n/vite" subpath is
// imported.
import "../adapters/index.js";
function defaultInclude(id) {
    const clean = id.split("?")[0] ?? id;
    if (clean.includes("node_modules"))
        return false;
    if (clean.includes("/vendor/hedgeling-i18n/"))
        return false;
    return /\.(tsx|jsx|ts|mts|cts|js|mjs|cjs)$/.test(clean) && !/\.d\.ts$/.test(clean);
}
/**
 * Vite plugin that auto-wraps user-facing strings at build time so developers never
 * write t() by hand:
 *  - JSX text + known attributes -> __hlT("...")
 *  - inline markup (e.g. <p>Click <a>here</a></p>) -> <Trans message="<0>..</0>" .../>
 * It delegates to the shared react-ts adapter, so the rewrite uses the exact same
 * detection as Hedgeling's extractor and keys always line up.
 */
export function hedgelingI18n(options = {}) {
    const workspaceRoot = options.workspaceRoot ?? process.cwd();
    const runtimeModule = options.runtimeModule ?? "@hedgeling/i18n/runtime";
    const include = options.include ?? defaultInclude;
    const config = loadExtractConfig(workspaceRoot);
    const adapters = selectAdapters(config.adapters, getAdapters());
    return {
        name: "hedgeling-i18n",
        enforce: "pre",
        transform(code, id) {
            if (!include(id))
                return null;
            const fileName = id.split("?")[0] ?? id;
            // Resolve the registered adapter for this file; only adapters that support
            // build-time rewriting (transform) participate in the Vite pass.
            const adapter = pickAdapter(fileName, adapters);
            if (!adapter?.transform)
                return null;
            const result = adapter.transform(code, {
                fileName,
                contextOverrides: config.contextOverrides,
                translationFunctionNames: config.translationFunctionNames,
                objectFields: config.objectFields,
            });
            if (!result)
                return null;
            const importLine = `import { ${result.imports.join(", ")} } from ${JSON.stringify(runtimeModule)}; ${IMPORT_MARKER}\n`;
            return { code: importLine + result.code, map: null };
        },
    };
}
export default hedgelingI18n;
