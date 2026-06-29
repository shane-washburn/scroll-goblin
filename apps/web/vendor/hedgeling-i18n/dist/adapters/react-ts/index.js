import { identifyHits, transformSource } from "../ecmascript/identify.js";
// Adapter: React JSX files only (.tsx/.jsx). Uses the shared ECMAScript engine
// and adds build-time auto-wrap (JSX text, attributes, and <Trans/> for inline
// markup) — which only makes sense where there is JSX. Non-JSX .ts/.js files are
// handled by the js-ts adapter (extraction only).
export const reactTsAdapter = {
    name: "react-ts",
    extensions: [".tsx", ".jsx"],
    identify: identifyHits,
    transform: transformSource,
};
// Back-compat: keep the engine's API reachable from the react-ts subpath.
export * from "../ecmascript/index.js";
