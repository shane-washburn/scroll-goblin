import fs from "node:fs";
import path from "node:path";
export const CONFIG_RELATIVE_PATH = path.join(".hedgeling", "extract.config.json");
export const DEFAULT_CONFIG = {
    sourceLocale: "en-US",
    locales: [],
    scanRoots: ["src", "index.html"],
    outputDir: "apps/web/i18n",
    ignoredDirs: [".git", ".hedgeling", "build", "dist", "node_modules"],
    // Empty = derive scanned extensions from the enabled adapters (recommended).
    // Set explicitly to narrow scanning to a subset of those extensions.
    sourceExtensions: [],
    translationFunctionNames: ["t", "__hlT"],
    objectFields: [
        "title",
        "subtitle",
        "shortTitle",
        "heading",
        "subheading",
        "description",
        "label",
        "caption",
        "blurb",
        "cta",
        "message",
        "tooltip",
        "placeholder",
        "name",
        "text",
        "content",
        "summary",
        "body",
        "prompt",
        "question",
        "answer",
        "hint",
        "goal",
        "note",
        "card",
        "lesson",
        "error",
    ],
    contextOverrides: {},
    adapters: [],
    resourceFormats: [],
    resourceDir: "i18n/resources",
};
function asStringArray(value, fallback) {
    if (!Array.isArray(value))
        return fallback;
    const out = value.filter((item) => typeof item === "string");
    return out.length > 0 ? out : fallback;
}
// Read and normalize .hedgeling/extract.config.json from a workspace root.
// Missing/invalid fields fall back to DEFAULT_CONFIG.
export function loadExtractConfig(workspaceRoot) {
    const configPath = path.join(workspaceRoot, CONFIG_RELATIVE_PATH);
    let parsed = {};
    try {
        parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }
    catch {
        parsed = {};
    }
    const overrides = parsed.contextOverrides && typeof parsed.contextOverrides === "object" && !Array.isArray(parsed.contextOverrides)
        ? parsed.contextOverrides
        : DEFAULT_CONFIG.contextOverrides;
    return {
        sourceLocale: typeof parsed.sourceLocale === "string" ? parsed.sourceLocale : DEFAULT_CONFIG.sourceLocale,
        locales: asStringArray(parsed.locales, DEFAULT_CONFIG.locales),
        scanRoots: asStringArray(parsed.scanRoots, DEFAULT_CONFIG.scanRoots),
        outputDir: typeof parsed.outputDir === "string" ? parsed.outputDir : DEFAULT_CONFIG.outputDir,
        ignoredDirs: asStringArray(parsed.ignoredDirs, DEFAULT_CONFIG.ignoredDirs),
        sourceExtensions: asStringArray(parsed.sourceExtensions, DEFAULT_CONFIG.sourceExtensions),
        translationFunctionNames: asStringArray(parsed.translationFunctionNames, DEFAULT_CONFIG.translationFunctionNames),
        objectFields: asStringArray(parsed.objectFields, DEFAULT_CONFIG.objectFields),
        contextOverrides: overrides,
        adapters: asStringArray(parsed.adapters, DEFAULT_CONFIG.adapters),
        resourceFormats: asStringArray(parsed.resourceFormats, DEFAULT_CONFIG.resourceFormats),
        resourceDir: typeof parsed.resourceDir === "string" ? parsed.resourceDir : DEFAULT_CONFIG.resourceDir,
    };
}
export function configExists(workspaceRoot) {
    return fs.existsSync(path.join(workspaceRoot, CONFIG_RELATIVE_PATH));
}
