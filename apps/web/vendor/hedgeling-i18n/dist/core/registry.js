import path from "node:path";
// Mutable registry of source adapters. Core ships EMPTY so it carries no
// language/framework dependency (e.g. typescript). Adapter packages — or the
// builtin barrel (src/adapters/index.ts) — call registerAdapter to add themselves.
const registry = [];
// Register (or replace, by name) an adapter. Idempotent: registering the same
// name twice keeps a single entry, so importing the builtins repeatedly is safe.
export function registerAdapter(adapter) {
    const existing = registry.findIndex((a) => a.name === adapter.name);
    if (existing >= 0)
        registry[existing] = adapter;
    else
        registry.push(adapter);
}
export function getAdapters() {
    return registry;
}
export function clearAdapters() {
    registry.length = 0;
}
// Restrict a set of adapters to the names in `names` (in registry order). An
// empty/undefined list means "all". Unknown names are ignored.
export function selectAdapters(names, adapters = registry) {
    if (!names || names.length === 0)
        return adapters;
    const wanted = new Set(names);
    return adapters.filter((a) => wanted.has(a.name));
}
// Pick the adapter whose extension list covers the file. `adapters` defaults to
// the global registry; pass an explicit list (e.g. config-filtered) to scope it.
export function pickAdapter(fileName, adapters = registry) {
    const ext = path.extname(fileName).toLowerCase();
    return adapters.find((adapter) => adapter.extensions.includes(ext)) ?? null;
}
