import { identifyHits } from "../ecmascript/identify.js";
// Adapter: non-JSX ECMAScript files (.ts/.mts/.cts/.js/.mjs/.cjs). Uses the same
// shared engine as react-ts for detection, but is EXTRACTION-ONLY — there is no
// JSX to auto-wrap in a plain module, so strings found here (value-position
// literals, interpolated templates) are applied at runtime by the DOM injector.
// This keeps generic JS/TS out of the React-specific adapter.
export const jsTsAdapter = {
    name: "js-ts",
    extensions: [".ts", ".mts", ".cts", ".js", ".mjs", ".cjs"],
    identify: identifyHits,
};
