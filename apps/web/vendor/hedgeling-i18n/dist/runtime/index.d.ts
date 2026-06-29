import { type ReactNode } from "react";
import { type TranslationValues } from "./store.js";
export declare function __hlT(source: string, values?: TranslationValues): string;
export declare const t: typeof __hlT;
export { translate } from "./store.js";
export { Trans } from "./Trans.js";
type I18nContextValue = {
    locale: string;
    t: (source: string, values?: TranslationValues) => string;
    setLocale: (locale: string) => void;
};
export declare function resolvePreferredLocale({ preferredLocales, supportedLocales, sourceLocale, }: {
    preferredLocales: readonly string[];
    supportedLocales: readonly string[];
    sourceLocale?: string;
}): string;
export declare function HedgelingProvider({ children, sourceLocale, languageStorageKey, supportedLocales, bundleUrl, sourceKeyMapUrl, }: {
    children: ReactNode;
    sourceLocale?: string;
    languageStorageKey?: string;
    supportedLocales?: readonly string[];
    bundleUrl?: string;
    sourceKeyMapUrl?: string;
}): import("react").JSX.Element;
export declare function useTranslation(): I18nContextValue;
