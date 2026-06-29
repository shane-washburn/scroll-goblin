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
export type ExtractResult = {
    occurrences: Occurrence[];
    entries: Entry[];
    strings: Array<{
        text: string;
        shape: Shape;
        purpose: string;
        visualContext?: string;
    }>;
};
/** Scan all configured roots and return occurrences, merged entries, and a flat string list. */
export declare function extractFromWorkspace(workspaceRoot: string, config: ExtractConfig): ExtractResult;
export declare function renderSourceHtml(occurrences: Occurrence[], sourceLocale: string): string;
/** Write source.html + source.json into config.outputDir, returning the catalog file path. */
export declare function writeSourceCatalog(workspaceRoot: string, config: ExtractConfig, result: ExtractResult): {
    sourceHtmlRel: string;
    sourceJsonRel: string;
};
