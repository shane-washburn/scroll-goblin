import type { SourceAdapter } from "./types.js";
export declare function registerAdapter(adapter: SourceAdapter): void;
export declare function getAdapters(): readonly SourceAdapter[];
export declare function clearAdapters(): void;
export declare function selectAdapters(names: readonly string[] | undefined, adapters?: readonly SourceAdapter[]): readonly SourceAdapter[];
export declare function pickAdapter(fileName: string, adapters?: readonly SourceAdapter[]): SourceAdapter | null;
