import { identifyHits, transformSource } from "../ecmascript/identify.js";
// Adapter: non-JSX ECMAScript files (.ts/.mts/.cts/.js/.mjs/.cjs). Uses the same
// shared engine as react-ts for detection and build-time wrapping. Module-scope
// UI object fields are rewritten as lazy getters so translation happens when the
// value is read, not when the module is imported.
export const jsTsAdapter = {
    name: "js-ts",
    extensions: [".ts", ".mts", ".cts", ".js", ".mjs", ".cjs"],
    identify: identifyHits,
    transform: transformSource,
};
