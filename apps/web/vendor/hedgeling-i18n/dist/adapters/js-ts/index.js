import { identifyHits, transformSource } from "../ecmascript/identify.js";
// Adapter: non-JSX ECMAScript files (.ts/.mts/.cts/.js/.mjs/.cjs). Uses the same
// shared engine as react-ts for detection. There is no JSX to auto-wrap in a
// plain module, so value-position literals and data fields stay EXTRACTION-ONLY
// (applied at runtime by the DOM injector). The transform only fires for the
// build-safe, non-JSX wraps that the shared engine emits here:
//   - canvas text:  ctx.fillText("HOME")  ->  ctx.fillText(__hlT("HOME"))
//   - function-scope interpolations: `${n} pts` -> __hlT("{n} pts", { n })
// Canvas text in particular has no DOM node, so build-time wrapping is the only
// way to translate it without hand-editing source.
export const jsTsAdapter = {
    name: "js-ts",
    extensions: [".ts", ".mts", ".cts", ".js", ".mjs", ".cjs"],
    identify: identifyHits,
    transform: transformSource,
};
