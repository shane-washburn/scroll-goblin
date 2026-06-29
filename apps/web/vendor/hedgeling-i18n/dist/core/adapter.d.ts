import type { SourceAdapter } from "./types.js";
export declare const reactTsAdapter: SourceAdapter;
export declare const htmlAdapter: SourceAdapter;
export declare const DEFAULT_ADAPTERS: SourceAdapter[];
export declare function pickAdapter(fileName: string, adapters?: SourceAdapter[]): SourceAdapter | null;
