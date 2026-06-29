// ECMAScript-family engine: a single TypeScript-compiler-based parser shared by
// the react-ts and js-ts adapters. It is NOT an adapter itself (no extensions);
// it exposes identify (extraction) and transform (JSX/template auto-wrap). The
// thin adapters decide which file extensions map to which capabilities.
export * from "./identify.js";
export * from "./jsxMessage.js";
export * from "./templateMessage.js";
export * from "./shapes.js";
