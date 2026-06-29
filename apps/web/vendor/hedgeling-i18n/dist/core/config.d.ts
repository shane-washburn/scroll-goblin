import type { ExtractConfig } from "./types.js";
export declare const CONFIG_RELATIVE_PATH: string;
export declare const DEFAULT_CONFIG: ExtractConfig;
export declare function loadExtractConfig(workspaceRoot: string): ExtractConfig;
export declare function configExists(workspaceRoot: string): boolean;
