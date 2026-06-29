import fs from "node:fs";
import path from "node:path";
import { getAdapters, pickAdapter, selectAdapters } from "./registry.js";
import { keyFor } from "./hash.js";
import { escapeHtml } from "./text.js";
function toPosix(p) {
    return p.split(path.sep).join("/");
}
function collectFiles(target, exts, ignored) {
    const files = [];
    if (!fs.existsSync(target))
        return files;
    if (fs.statSync(target).isFile()) {
        if (exts.has(path.extname(target)))
            files.push(target);
        return files;
    }
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                if (!ignored.has(entry.name))
                    walk(path.join(dir, entry.name));
                continue;
            }
            const file = path.join(dir, entry.name);
            if (exts.has(path.extname(file)))
                files.push(file);
        }
    };
    walk(target);
    return files;
}
function hitToOccurrence(hit, file) {
    return {
        key: keyFor(hit.text),
        source: hit.text,
        shape: hit.shape,
        purpose: hit.purpose,
        visualContext: hit.visualContext,
        location: { file, line: hit.line, kind: hit.kind },
    };
}
function mergeEntries(occurrences) {
    const entries = new Map();
    for (const occ of occurrences) {
        const entry = entries.get(occ.key) ?? { key: occ.key, source: occ.source, contexts: [] };
        const contextKey = [occ.shape, occ.purpose, occ.visualContext].join("\u0000");
        let context = entry.contexts.find((c) => [c.shape, c.purpose, c.visualContext].join("\u0000") === contextKey);
        if (!context) {
            context = { shape: occ.shape, purpose: occ.purpose, visualContext: occ.visualContext, locations: [] };
            entry.contexts.push(context);
        }
        if (!context.locations.some((l) => l.file === occ.location.file && l.line === occ.location.line && l.kind === occ.location.kind)) {
            context.locations.push(occ.location);
        }
        entries.set(occ.key, entry);
    }
    return [...entries.values()].sort((a, b) => a.source.localeCompare(b.source));
}
/** Scan all configured roots and return occurrences, merged entries, and a flat string list. */
export function extractFromWorkspace(workspaceRoot, config) {
    // Honor config.adapters (opt into a subset/order); empty means all registered.
    const adapters = selectAdapters(config.adapters, getAdapters());
    // Files to scan = union of the ENABLED adapters' extensions, so registering an
    // adapter is enough to have its files collected (no parallel list to maintain).
    // config.sourceExtensions, when non-empty, narrows that set (intersection) for
    // projects that want to scan only a subset.
    const adapterExts = new Set(adapters.flatMap((a) => a.extensions));
    const exts = config.sourceExtensions.length > 0
        ? new Set([...adapterExts].filter((e) => config.sourceExtensions.includes(e)))
        : adapterExts;
    const ignored = new Set(config.ignoredDirs);
    const files = config.scanRoots
        .flatMap((root) => collectFiles(path.resolve(workspaceRoot, root), exts, ignored))
        .sort();
    const occurrences = [];
    for (const file of files) {
        const adapter = pickAdapter(file, adapters);
        if (!adapter)
            continue;
        const rel = toPosix(path.relative(workspaceRoot, file));
        const sourceText = fs.readFileSync(file, "utf8");
        const hits = adapter.identify(sourceText, {
            fileName: file,
            contextOverrides: config.contextOverrides,
            translationFunctionNames: config.translationFunctionNames,
            objectFields: config.objectFields,
        });
        for (const hit of hits)
            occurrences.push(hitToOccurrence(hit, rel));
    }
    const entries = mergeEntries(occurrences);
    // De-duplicate strings by source for the MCP batch (context is preserved in source.json).
    const seen = new Map();
    for (const occ of occurrences) {
        if (seen.has(occ.source))
            continue;
        seen.set(occ.source, {
            text: occ.source,
            shape: occ.shape,
            purpose: occ.purpose,
            visualContext: occ.visualContext || undefined,
        });
    }
    return { occurrences, entries, strings: [...seen.values()] };
}
export function renderSourceHtml(occurrences, sourceLocale) {
    // One row per unique source string — this mirrors exactly what the translation
    // service receives (it keys by source text, so the same string used in many
    // places, e.g. "Crab" x7, is translated once). The first occurrence (by file +
    // line) supplies the displayed context.
    const seen = new Set();
    const rows = [...occurrences]
        .sort((a, b) => a.location.file.localeCompare(b.location.file) ||
        a.location.line - b.location.line ||
        a.source.localeCompare(b.source))
        .filter((occ) => {
        if (seen.has(occ.source))
            return false;
        seen.add(occ.source);
        return true;
    })
        .map((occ) => `      <p data-i18n-shape="${occ.shape}" data-i18n-purpose="${escapeHtml(occ.purpose).replace(/\n/g, " ")}" data-i18n-visual-context="${escapeHtml(occ.visualContext).replace(/\n/g, " ")}">${escapeHtml(occ.source)}</p>`)
        .join("\n");
    return `<!doctype html>
<html lang="${sourceLocale}">
  <body>
    <main data-i18n-source-locale="${sourceLocale}">
${rows}
    </main>
  </body>
</html>
`;
}
/** Write source.html + source.json into config.outputDir, returning the catalog file path. */
export function writeSourceCatalog(workspaceRoot, config, result) {
    const outDir = path.resolve(workspaceRoot, config.outputDir);
    fs.mkdirSync(outDir, { recursive: true });
    const sourceHtmlPath = path.join(outDir, "source.html");
    const sourceJsonPath = path.join(outDir, "source.json");
    fs.writeFileSync(sourceHtmlPath, renderSourceHtml(result.occurrences, config.sourceLocale), "utf8");
    fs.writeFileSync(sourceJsonPath, `${JSON.stringify({ sourceLocale: config.sourceLocale, entries: result.entries }, null, 2)}\n`, "utf8");
    return {
        sourceHtmlRel: toPosix(path.relative(workspaceRoot, sourceHtmlPath)),
        sourceJsonRel: toPosix(path.relative(workspaceRoot, sourceJsonPath)),
    };
}
