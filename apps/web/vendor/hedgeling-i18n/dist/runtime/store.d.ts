export type Bundle = Record<string, Record<string, string>>;
export type SourceKeyMap = {
    bySource: Record<string, string>;
};
export type TranslationValue = string | number | boolean | null | undefined;
export type TranslationValues = Record<string, TranslationValue>;
export declare function subscribe(listener: () => void): () => void;
export declare function getLocale(): string;
export declare function getSourceLocale(): string;
export declare function setSourceLocale(locale: string): void;
export declare function setLocale(locale: string): void;
export declare function setTranslationData(nextBundle: Bundle, nextSourceKeyMap: SourceKeyMap): void;
export declare function normalizeSourceText(value: string): string;
export declare function interpolate(source: string, values?: TranslationValues): string;
export declare function translate(source: string, values?: TranslationValues): string;
