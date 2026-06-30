import fs from "node:fs";
import path from "node:path";
import { getAdapters, pickAdapter, selectAdapters } from "./registry.js";
import { keyFor } from "./hash.js";
import { escapeHtml } from "./text.js";
// Kinds emitted purely to drive `required` diagnostics. They are NEVER added to the
// catalog (entries / strings / source.html): the real key is created later, when the
// developer writes the t() call and re-runs extraction (a translation-call hit). The
// synthesized placeholder names here are suggestions and may differ from what the dev
// writes, so pre-seeding the catalog would create stale, unmatched keys.
const DIAGNOSTIC_ONLY_KINDS = new Set(["manual-t:interpolation", "manual-t:ref-adjacent"]);
function isDiagnosticOnly(kind) {
    return DIAGNOSTIC_ONLY_KINDS.has(kind);
}
// Distinct placeholder names ({n}, {count}, …) in their order of first appearance.
function placeholderNames(message) {
    const names = [];
    for (const match of message.matchAll(/\{([A-Za-z0-9_]+)\}/g)) {
        if (!names.includes(match[1]))
            names.push(match[1]);
    }
    return names;
}
// Build the copy-pasteable JSX fix, e.g. {t("Age {n} mo", { n })}.
function manualTSuggestion(message) {
    const names = placeholderNames(message);
    const values = names.length ? `, { ${names.join(", ")} }` : "";
    return `{t(${JSON.stringify(message)}${values})}`;
}
// Map a value-literal kind (optionally role-suffixed by the ECMAScript adapter)
// to a severity tier plus tailored guidance. Returns null for kinds that are
// build-wrapped (jsx-*, canvas-text, *-interpolated, *-rich, data-field:*) or
// already developer-wrapped (translation-call): those translate regardless of how
// they render, so they are never flagged.
function classifyDiagnostic(kind) {
    switch (kind) {
        case "manual-t:interpolation":
            return {
                severity: "required",
                reason: "Static words are interpolated with a dynamic value as separate JSX children, so no single translatable message exists -- the words are never extracted and never translate, and their order can't be localized.",
                hint: "Wrap the whole phrase in ONE t() call so a translator controls word order (see `suggestion`). The interpolated value must be a prop/state so the component re-renders.",
            };
        case "manual-t:ref-adjacent":
            return {
                severity: "required",
                reason: "Static words sit next to a value rendered imperatively through a ref/handler child, so the words are orphaned (never extracted) and the order can't be localized.",
                hint: "Replace the ref-updated node with ONE t() call driven by React state (see `suggestion`), and remove the imperative textContent/innerText update.",
            };
        case "value-literal:logic":
            return {
                severity: "definite",
                reason: "Used in a comparison/branch -- this is program logic, not UI copy.",
                hint: "It will not render to the DOM and should not be translated. Replace the literal with an enum/const (or exclude it); do NOT wrap it with t().",
            };
        case "value-literal:assign":
            return {
                severity: "potential",
                reason: "Assigned to a property -- may be displayed text or internal app state.",
                hint: "If it renders as plain DOM text it is translated automatically. If it is drawn to <canvas>, transformed before display, or compared as state, wrap it with t() or move it to an objectFields/resource catalog.",
            };
        case "value-literal:call":
            return {
                severity: "potential",
                reason: "Passed as a function argument -- may be rendered text or a logic/config value.",
                hint: "If the callee renders it to the DOM it is translated automatically. If it is painted to <canvas>, transformed, or used as a key/flag, wrap it with t().",
            };
        case "value-literal":
            return {
                severity: "safe",
                reason: "Plain value position (array/object value, return, variable, or inline segment).",
                hint: "Most likely rendered as DOM text and translated automatically by the injector. No action needed unless it is drawn to <canvas> or transformed before display.",
            };
        default:
            return null;
    }
}
const SEVERITY_RANK = {
    required: 0,
    definite: 1,
    potential: 2,
    safe: 3,
};
function toDiagnostics(occurrences) {
    const seen = new Set();
    const diagnostics = [];
    for (const occ of occurrences) {
        const cls = classifyDiagnostic(occ.location.kind);
        if (!cls)
            continue;
        const dedupeKey = `${occ.location.file}\u0000${occ.location.line}\u0000${occ.source}`;
        if (seen.has(dedupeKey))
            continue;
        seen.add(dedupeKey);
        diagnostics.push({
            severity: cls.severity,
            text: occ.source,
            file: occ.location.file,
            line: occ.location.line,
            kind: occ.location.kind,
            reason: cls.reason,
            hint: cls.hint,
            ...(cls.severity === "required" ? { suggestion: manualTSuggestion(occ.source) } : {}),
        });
    }
    return diagnostics.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
        a.file.localeCompare(b.file) ||
        a.line - b.line ||
        a.text.localeCompare(b.text));
}
/** Group diagnostics into severity sections, preserving sorted order. */
export function groupDiagnostics(diagnostics) {
    return {
        required: diagnostics.filter((d) => d.severity === "required"),
        definite: diagnostics.filter((d) => d.severity === "definite"),
        potential: diagnostics.filter((d) => d.severity === "potential"),
        safe: diagnostics.filter((d) => d.severity === "safe"),
    };
}
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
        if (isDiagnosticOnly(occ.location.kind))
            continue; // never seed the catalog
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
        if (isDiagnosticOnly(occ.location.kind))
            continue; // diagnostics-only, not a catalog string
        if (seen.has(occ.source))
            continue;
        seen.set(occ.source, {
            text: occ.source,
            shape: occ.shape,
            purpose: occ.purpose,
            visualContext: occ.visualContext || undefined,
        });
    }
    return { occurrences, entries, strings: [...seen.values()], diagnostics: toDiagnostics(occurrences) };
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
        if (isDiagnosticOnly(occ.location.kind))
            return false; // diagnostics-only, not catalog text
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
/** Write source.html + source.json + diagnostics.json into config.outputDir, returning their paths. */
export function writeSourceCatalog(workspaceRoot, config, result) {
    const outDir = path.resolve(workspaceRoot, config.outputDir);
    fs.mkdirSync(outDir, { recursive: true });
    const sourceHtmlPath = path.join(outDir, "source.html");
    const sourceJsonPath = path.join(outDir, "source.json");
    const diagnosticsPath = path.join(outDir, "diagnostics.json");
    fs.writeFileSync(sourceHtmlPath, renderSourceHtml(result.occurrences, config.sourceLocale), "utf8");
    fs.writeFileSync(sourceJsonPath, `${JSON.stringify({ sourceLocale: config.sourceLocale, entries: result.entries }, null, 2)}\n`, "utf8");
    const grouped = groupDiagnostics(result.diagnostics);
    fs.writeFileSync(diagnosticsPath, `${JSON.stringify({
        sourceLocale: config.sourceLocale,
        summary: {
            required: grouped.required.length,
            definite: grouped.definite.length,
            potential: grouped.potential.length,
            safe: grouped.safe.length,
            total: result.diagnostics.length,
        },
        required: grouped.required,
        definite: grouped.definite,
        potential: grouped.potential,
        safe: grouped.safe,
    }, null, 2)}\n`, "utf8");
    return {
        sourceHtmlRel: toPosix(path.relative(workspaceRoot, sourceHtmlPath)),
        sourceJsonRel: toPosix(path.relative(workspaceRoot, sourceJsonPath)),
        diagnosticsRel: toPosix(path.relative(workspaceRoot, diagnosticsPath)),
    };
}
