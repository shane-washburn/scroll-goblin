import { identifyHtmlHits } from "./identify.js";
// Adapter: HTML. Extraction only; applied at runtime by the DOM injector.
export const htmlAdapter = {
    name: "html",
    extensions: [".html", ".htm"],
    identify: (source) => identifyHtmlHits(source),
};
export * from "./identify.js";
