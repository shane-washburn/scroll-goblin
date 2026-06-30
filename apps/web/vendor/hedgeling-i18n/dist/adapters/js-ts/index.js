import { identifyHits, transformSource } from "../ecmascript/identify.js";
// Adapter: non-JSX ECMAScript files (.ts/.mts/.cts/.js/.mjs/.cjs). Uses the same
// shared engine as react-ts for detection and build-time wrapping. The transform
// only fires for build-safe, non-JSX wraps that the shared engine emits here:
//   - canvas text:  ctx.fillText("HOME")  ->  ctx.fillText(__hlT("HOME"))
//   - function-scope interpolations: `${n} pts` -> __hlT("{n} pts", { n })
//   - function-scope values: "Stop" -> __hlT("Stop")
//   - module-scope UI object fields: title: "..." -> get title() { return __hlT("..."); }
export const jsTsAdapter = {
    name: "js-ts",
    extensions: [".ts", ".mts", ".cts", ".js", ".mjs", ".cjs"],
    identify: identifyHits,
    transform: transformSource,
};
