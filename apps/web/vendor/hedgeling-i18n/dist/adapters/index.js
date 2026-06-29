import { registerAdapter } from "../core/registry.js";
import { reactTsAdapter } from "./react-ts/index.js";
import { jsTsAdapter } from "./js-ts/index.js";
import { htmlAdapter } from "./html/index.js";
import { vueAdapter } from "./vue/index.js";
import { csharpAdapter } from "./csharp/index.js";
import { xamlAdapter } from "./xaml/index.js";
// Importing this module registers the built-in adapters into the core registry.
// The top-level package barrel (src/index.ts) imports it for batteries-included
// behaviour; pure-core consumers can skip it and register their own adapters.
// Order matters only for diagnostics; routing is by disjoint file extension.
registerAdapter(reactTsAdapter); // .tsx/.jsx  (identify + auto-wrap)
registerAdapter(jsTsAdapter); //    .ts/.js/.mjs/... (identify only)
registerAdapter(htmlAdapter); //    .html/.htm (identify only)
registerAdapter(vueAdapter); //     .vue (identify only)
registerAdapter(csharpAdapter); //  .cs (identify only)
registerAdapter(xamlAdapter); //    .xaml/.axaml (identify only)
export const DEFAULT_ADAPTERS = [
    reactTsAdapter,
    jsTsAdapter,
    htmlAdapter,
    vueAdapter,
    csharpAdapter,
    xamlAdapter,
];
export { reactTsAdapter, jsTsAdapter, htmlAdapter, vueAdapter, csharpAdapter, xamlAdapter };
export * from "./react-ts/index.js";
export * from "./js-ts/index.js";
export * from "./html/index.js";
export * from "./vue/index.js";
export * from "./csharp/index.js";
export * from "./xaml/index.js";
