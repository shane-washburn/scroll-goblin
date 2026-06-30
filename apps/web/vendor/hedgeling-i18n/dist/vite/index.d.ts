import "../adapters/index.js";
type VitePlugin = {
    name: string;
    enforce?: "pre" | "post";
    transform?: (code: string, id: string) => {
        code: string;
        map: null;
    } | null | undefined;
};
export type HedgelingViteOptions = {
    /** Workspace root used to locate .hedgeling/extract.config.json. Defaults to process.cwd(). */
    workspaceRoot?: string;
    /** Module specifier the injected runtime imports (__hlT, Trans) resolve to. */
    runtimeModule?: string;
    /** Override which files are transformed. Defaults to JS/TS source outside node_modules. */
    include?: (id: string) => boolean;
};
/**
 * Vite plugin that auto-wraps user-facing strings at build time so developers never
 * write t() by hand:
 *  - JSX text + known attributes -> __hlT("...")
 *  - inline markup (e.g. <p>Click <a>here</a></p>) -> <Trans message="<0>..</0>" .../>
 * It delegates to the shared react-ts adapter, so the rewrite uses the exact same
 * detection as Hedgeling's extractor and keys always line up.
 */
export declare function hedgelingI18n(options?: HedgelingViteOptions): VitePlugin;
export default hedgelingI18n;
