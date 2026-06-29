import path from "node:path";
import { identifyHits, transformSource } from "./identify.js";
import { identifyHtmlHits } from "./html.js";
// Adapter #1: TypeScript/JavaScript + React (Vite). Supports extraction AND
// build-time auto-wrap (text, attributes, and <Trans/> for inline markup).
export const reactTsAdapter = {
    name: "react-ts",
    extensions: [".tsx", ".jsx", ".ts", ".mts", ".cts", ".js", ".mjs"],
    identify: identifyHits,
    transform: transformSource,
};
// Adapter #2: HTML. Extraction only; applied at runtime by the DOM injector.
export const htmlAdapter = {
    name: "html",
    extensions: [".html", ".htm"],
    identify: (source) => identifyHtmlHits(source),
};
export const DEFAULT_ADAPTERS = [reactTsAdapter, htmlAdapter];
export function pickAdapter(fileName, adapters = DEFAULT_ADAPTERS) {
    const ext = path.extname(fileName).toLowerCase();
    return adapters.find((adapter) => adapter.extensions.includes(ext)) ?? null;
}
