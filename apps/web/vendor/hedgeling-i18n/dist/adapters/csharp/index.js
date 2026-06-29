import { identifyCSharpHits } from "./identify.js";
// Adapter: C# source (.cs). Extraction only (applied via the source catalog /
// resource export, not auto-wrapped). Uses the same AGGRESSIVE RECALL + POST-
// PROCESS FILTERING strategy as the React/TSX adapter: a real string lexer yields
// every literal, then shared filters (isProbablyTranslatable, looksTechnical) plus
// a non-UI position deny-list (logging, reflection, parsing, dictionary keys,
// case labels, technical attributes) cut the noise. Demonstrates the language-
// agnostic seam: a non-web, non-JS language plugs in with a lexer + identify() and
// reuses the shared pipeline (noise filtering, hashing, classification, export).
export const csharpAdapter = {
    name: "csharp",
    extensions: [".cs"],
    identify: (source) => identifyCSharpHits(source),
};
export * from "./identify.js";
export * from "./lexer.js";
