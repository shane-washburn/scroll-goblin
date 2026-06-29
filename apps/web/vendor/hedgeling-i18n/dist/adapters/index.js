import { registerAdapter } from "../core/registry.js";
import { reactTsAdapter } from "./react-ts/index.js";
import { jsTsAdapter } from "./js-ts/index.js";
import { htmlAdapter } from "./html/index.js";
import { vueAdapter } from "./vue/index.js";
// Importing this module registers the built-in adapters into the core registry.
// The top-level package barrel (src/index.ts) imports it for batteries-included
// behaviour; pure-core consumers can skip it and register their own adapters.
// Order matters only for diagnostics; routing is by disjoint file extension.
registerAdapter(reactTsAdapter); // .tsx/.jsx  (identify + auto-wrap)
registerAdapter(jsTsAdapter); //    .ts/.js/.mjs/... (identify only)
registerAdapter(htmlAdapter); //    .html/.htm (identify only)
registerAdapter(vueAdapter); //     .vue (identify only)
export const DEFAULT_ADAPTERS = [reactTsAdapter, jsTsAdapter, htmlAdapter, vueAdapter];
export { reactTsAdapter, jsTsAdapter, htmlAdapter, vueAdapter };
export * from "./react-ts/index.js";
export * from "./js-ts/index.js";
export * from "./html/index.js";
export * from "./vue/index.js";
