import type { Shape } from "./shapes.js";
export type Location = {
    file: string;
    line: number;
    kind: string;
};
export type ContextOverride = Partial<Pick<Hit, "shape" | "purpose" | "visualContext">>;
export type Hit = {
    text: string;
    shape: Shape;
    purpose: string;
    visualContext: string;
    kind: string;
    line: number;
};
export type IdentifyOptions = {
    fileName: string;
    contextOverrides?: Record<string, ContextOverride>;
    translationFunctionNames?: readonly string[];
    objectFields?: readonly string[];
};
export type Context = {
    shape: Shape;
    purpose: string;
    visualContext: string;
    locations: Location[];
};
export type Entry = {
    key: string;
    source: string;
    contexts: Context[];
};
export type ExtractConfig = {
    sourceLocale: string;
    locales: string[];
    scanRoots: string[];
    outputDir: string;
    ignoredDirs: string[];
    sourceExtensions: string[];
    translationFunctionNames: string[];
    objectFields: string[];
    contextOverrides: Record<string, ContextOverride>;
    adapters: string[];
    resourceFormats: string[];
    resourceDir: string;
};
export type AdapterOptions = {
    fileName: string;
    contextOverrides?: Record<string, ContextOverride>;
    translationFunctionNames?: readonly string[];
    objectFields?: readonly string[];
};
export type AdapterTransformResult = {
    code: string;
    imports: string[];
};
export interface SourceAdapter {
    name: string;
    extensions: string[];
    identify(source: string, options: AdapterOptions): Hit[];
    transform?(source: string, options: AdapterOptions): AdapterTransformResult | null;
}
