import type { ExtractConfig, Entry, Location } from "./types.js";
import type { Shape } from "./shapes.js";
export type Occurrence = {
    key: string;
    source: string;
    shape: Shape;
    purpose: string;
    visualContext: string;
    location: Location;
};
export type DiagnosticSeverity = "required" | "definite" | "potential" | "safe";
export type Diagnostic = {
    severity: DiagnosticSeverity;
    text: string;
    file: string;
    line: number;
    kind: string;
    reason: string;
    hint: string;
    suggestion?: string;
};
export type ExtractResult = {
    occurrences: Occurrence[];
    entries: Entry[];
    strings: Array<{
        text: string;
        shape: Shape;
        purpose: string;
        visualContext?: string;
    }>;
    diagnostics: Diagnostic[];
};
/** Group diagnostics into severity sections, preserving sorted order. */
export declare function groupDiagnostics(diagnostics: Diagnostic[]): Record<DiagnosticSeverity, Diagnostic[]>;
/** Scan all configured roots and return occurrences, merged entries, and a flat string list. */
export declare function extractFromWorkspace(workspaceRoot: string, config: ExtractConfig): ExtractResult;
export declare function renderSourceHtml(occurrences: Occurrence[], sourceLocale: string): string;
/** Write source.html + source.json + diagnostics.json into config.outputDir, returning their paths. */
export declare function writeSourceCatalog(workspaceRoot: string, config: ExtractConfig, result: ExtractResult): {
    sourceHtmlRel: string;
    sourceJsonRel: string;
    diagnosticsRel: string;
};
