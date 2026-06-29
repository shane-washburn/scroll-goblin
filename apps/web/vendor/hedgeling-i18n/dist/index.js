// @hedgeling/i18n — batteries-included entry. Re-exports the framework-agnostic
// core AND imports ./adapters, which registers the built-in adapters (react-ts,
// html) into the registry. Consumers who want a bare core with custom adapters
// can import "@hedgeling/i18n/core" and register their own instead.
export * from "./core/index.js";
export * from "./adapters/index.js";
