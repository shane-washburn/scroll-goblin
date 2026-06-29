import { identifyVueHits } from "./identify.js";
// Adapter: Vue Single-File Components. Extraction only (template text + static
// attributes); applied at runtime by the DOM injector, like the HTML adapter.
// Demonstrates the seam: a new framework needs only identify() + an extension.
export const vueAdapter = {
    name: "vue",
    extensions: [".vue"],
    identify: (source) => identifyVueHits(source),
};
export * from "./identify.js";
