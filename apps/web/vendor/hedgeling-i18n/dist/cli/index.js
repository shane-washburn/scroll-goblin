#!/usr/bin/env node
// Hedgeling i18n CLI — the supported entry point for *subscribing projects* to
// invoke Hedgeling's tooling independently, without depending on the Hedgeling
// source checkout. It compiles into dist/cli/index.js, so it ships both:
//   - as an npm bin:        npx @hedgeling/i18n <command>
//   - via a vendored dist:  node vendor/hedgeling-i18n/dist/cli/index.js <command>
//
// It reads the project's .hedgeling/extract.config.json (falling back to sane
// defaults) and drives the same core functions the build/test pipeline uses, so
// the CLI can never drift from library behavior.
import path from "node:path";
import process from "node:process";
import { configExists, CONFIG_RELATIVE_PATH, extractFromWorkspace, groupDiagnostics, loadExtractConfig, writeSourceCatalog, } from "../index.js";
// Resolve the workspace root: an explicit positional arg wins; otherwise walk up
// from the current directory to the nearest .hedgeling/extract.config.json so the
// CLI "just works" when invoked from a subfolder (e.g. an apps/web package script
// in a monorepo whose config lives at the repo root). Falls back to cwd.
function resolveProjectDir(arg) {
    if (arg)
        return path.resolve(arg);
    let dir = process.cwd();
    for (;;) {
        if (configExists(dir))
            return dir;
        const parent = path.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return process.cwd();
}
function parseArgs(argv) {
    const positionals = [];
    let write = false;
    let json = false;
    let help = false;
    let limit = 25;
    let maxRequired = 0;
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        switch (arg) {
            case "--write":
                write = true;
                break;
            case "--json":
                json = true;
                break;
            case "--help":
            case "-h":
                help = true;
                break;
            case "--limit":
                limit = Number(argv[(i += 1)] ?? limit);
                break;
            case "--max-required":
                maxRequired = Number(argv[(i += 1)] ?? maxRequired);
                break;
            default:
                if (arg.startsWith("--"))
                    break; // ignore unknown flags
                positionals.push(arg);
        }
    }
    return {
        command: positionals[0],
        projectDir: resolveProjectDir(positionals[1]),
        write,
        json,
        limit: Number.isFinite(limit) ? limit : 25,
        maxRequired: Number.isFinite(maxRequired) ? maxRequired : 0,
        help,
    };
}
const USAGE = `Hedgeling i18n CLI

Usage:
  hedgeling <command> [projectDir] [options]

Commands:
  extract       Generate the translation catalog (source.html, source.json) and diagnostics.json.
  diagnostics   Print i18n diagnostics only (what needs attention, grouped by severity).
  check         Run diagnostics and exit non-zero if unresolved "required" gaps remain (for CI).

Arguments:
  projectDir            Workspace root to scan. Defaults to the current directory.
                        Reads ${CONFIG_RELATIVE_PATH} (scanRoots, outputDir, locales, ...).

Options:
  --write               Write source.html, source.json, and diagnostics.json to the configured outputDir.
  --json                (diagnostics) Print the raw diagnostics JSON instead of a formatted summary.
  --limit <n>           Number of sample rows/diagnostics to print (default 25; 0 = none).
  --max-required <n>    (check) Allowed number of "required" diagnostics before failing (default 0).
  -h, --help            Show this help.

Examples:
  hedgeling extract --write                 # regenerate catalog + diagnostics
  hedgeling diagnostics                      # review what needs manual t() wraps
  hedgeling check --max-required 0           # fail CI if any required gaps remain
`;
const SECTIONS = [
    ["required", 'ACTION REQUIRED — wrap in a manual t() call (interpolation/ref; never auto-translates)'],
    ["definite", "DEFINITELY PROBLEMATIC — program logic, not UI copy (do NOT translate)"],
    ["potential", "POTENTIALLY PROBLEMATIC — review; wrap with t() if canvas/transformed/state"],
    ["safe", "LIKELY SAFE — DOM injector translates these automatically"],
];
function printDiagnostics(diagnostics, limit) {
    const grouped = groupDiagnostics(diagnostics);
    console.log(`\nDiagnostics — strings not auto-wrapped at build time (required ${grouped.required.length}, definite ${grouped.definite.length}, potential ${grouped.potential.length}, safe ${grouped.safe.length}):`);
    for (const [severity, heading] of SECTIONS) {
        const list = grouped[severity];
        console.log(`\n  ${heading}: ${list.length}`);
        const show = limit > 0 ? list.slice(0, limit) : list;
        for (const d of show) {
            console.log(`    ${d.file}:${d.line}  ${JSON.stringify(d.text)}`);
            if (d.suggestion)
                console.log(`      fix: ${d.suggestion}`);
        }
        if (list.length > show.length) {
            console.log(`    … and ${list.length - show.length} more (pass --write to emit diagnostics.json)`);
        }
    }
}
function warnIfNoConfig(projectDir) {
    if (!configExists(projectDir)) {
        console.warn(`! No ${CONFIG_RELATIVE_PATH} found in ${projectDir} — using defaults. ` +
            `Create one to set scanRoots/outputDir/locales.`);
    }
}
function runExtract(args) {
    warnIfNoConfig(args.projectDir);
    const config = loadExtractConfig(args.projectDir);
    console.log(`Hedgeling extractor — ${args.projectDir}`);
    console.log(`scanRoots: ${JSON.stringify(config.scanRoots)}  outputDir: ${config.outputDir}`);
    const result = extractFromWorkspace(args.projectDir, config);
    console.log(`\nUnique strings: ${result.strings.length}  Entries: ${result.entries.length}  Occurrences: ${result.occurrences.length}`);
    printDiagnostics(result.diagnostics, args.limit);
    if (args.write) {
        const out = writeSourceCatalog(args.projectDir, config, result);
        console.log(`\nWrote:\n  ${out.sourceHtmlRel}\n  ${out.sourceJsonRel}\n  ${out.diagnosticsRel}`);
    }
    else {
        console.log(`\n(dry run — pass --write to emit source.html / source.json / diagnostics.json)`);
    }
    return 0;
}
function runDiagnostics(args) {
    warnIfNoConfig(args.projectDir);
    const config = loadExtractConfig(args.projectDir);
    const result = extractFromWorkspace(args.projectDir, config);
    if (args.json) {
        const grouped = groupDiagnostics(result.diagnostics);
        console.log(JSON.stringify({
            sourceLocale: config.sourceLocale,
            summary: {
                required: grouped.required.length,
                definite: grouped.definite.length,
                potential: grouped.potential.length,
                safe: grouped.safe.length,
                total: result.diagnostics.length,
            },
            ...grouped,
        }, null, 2));
    }
    else {
        printDiagnostics(result.diagnostics, args.limit);
    }
    if (args.write) {
        const out = writeSourceCatalog(args.projectDir, config, result);
        console.log(`\nWrote ${out.diagnosticsRel}`);
    }
    return 0;
}
function runCheck(args) {
    warnIfNoConfig(args.projectDir);
    const config = loadExtractConfig(args.projectDir);
    const result = extractFromWorkspace(args.projectDir, config);
    const grouped = groupDiagnostics(result.diagnostics);
    const required = grouped.required;
    if (args.write)
        writeSourceCatalog(args.projectDir, config, result);
    if (required.length > args.maxRequired) {
        console.error(`\n✖ i18n check failed: ${required.length} "required" gap(s) need a manual t() wrap (allowed: ${args.maxRequired}).`);
        for (const d of required) {
            console.error(`    ${d.file}:${d.line}  ${JSON.stringify(d.text)}`);
            if (d.suggestion)
                console.error(`      fix: ${d.suggestion}`);
        }
        return 1;
    }
    console.log(`✔ i18n check passed: 0 unresolved "required" gaps (allowed: ${args.maxRequired}).`);
    return 0;
}
function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help || !args.command) {
        console.log(USAGE);
        process.exitCode = args.command ? 0 : args.help ? 0 : 1;
        return;
    }
    switch (args.command) {
        case "extract":
            process.exitCode = runExtract(args);
            break;
        case "diagnostics":
            process.exitCode = runDiagnostics(args);
            break;
        case "check":
            process.exitCode = runCheck(args);
            break;
        default:
            console.error(`Unknown command: ${args.command}\n`);
            console.log(USAGE);
            process.exitCode = 1;
    }
}
main();
