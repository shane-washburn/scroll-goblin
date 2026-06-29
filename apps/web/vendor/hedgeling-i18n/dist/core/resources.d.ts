export type ResourceFormat = "resx" | "po" | "json" | "csv";
export type ResourceEntry = {
    key: string;
    source: string;
    target: string;
};
export type ResourceBundleInput = {
    sourceLocale: string;
    locales: string[];
    sources: Array<{
        source: string;
        key: string;
    }>;
    bundle: Record<string, Record<string, string>>;
};
export type ResourceExportOptions = {
    formats: ResourceFormat[];
    baseName?: string;
    includeUntranslated?: boolean;
};
export type ResourceFile = {
    filename: string;
    content: string;
};
export declare function buildResourceEntries(input: ResourceBundleInput, locale: string, includeUntranslated?: boolean): ResourceEntry[];
export declare function toResx(entries: ResourceEntry[]): string;
export declare function toPo(entries: ResourceEntry[], locale: string, sourceLocale: string): string;
export declare function toJson(entries: ResourceEntry[]): string;
export declare function toCsv(input: ResourceBundleInput): string;
export declare function buildResourceFiles(input: ResourceBundleInput, options: ResourceExportOptions): ResourceFile[];
