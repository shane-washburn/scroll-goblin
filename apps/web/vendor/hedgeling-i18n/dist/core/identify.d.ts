import type { AdapterOptions, AdapterTransformResult, Hit } from "./types.js";
declare const IMPORT_MARKER = "/* @hedgeling/i18n: auto-wrap */";
/**
 * Walk a single TS/TSX source file and return every translatable string hit,
 * with the metadata needed both for extraction and for Vite auto-wrapping.
 */
export declare function identifyHits(sourceText: string, options: AdapterOptions): Hit[];
/**
 * Build-time auto-wrap for TS/React source. Rewrites:
 *  - JSX text children      -> {__hlT("...")}
 *  - known attribute values -> attr={__hlT("...")}
 *  - inline-markup children -> <Trans message="<0>..</0>" components={[...]} />
 * Returns null when nothing needs wrapping. The required runtime imports are
 * returned so the caller (Vite plugin) can inject a single import statement.
 */
export declare function transformSource(sourceText: string, options: AdapterOptions): AdapterTransformResult | null;
export { IMPORT_MARKER };
