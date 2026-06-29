import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, } from "react";
import { getLocale, setLocale as storeSetLocale, setSourceLocale, setTranslationData, subscribe, translate, } from "./store.js";
// The function the Vite plugin injects calls to. Works in any scope because it
// reads from the module-level store rather than a React hook.
export function __hlT(source, values) {
    return translate(source, values);
}
// Convenience alias for manual/dynamic use in app code.
export const t = __hlT;
export { translate } from "./store.js";
export { Trans } from "./Trans.js";
const I18nContext = createContext({
    locale: getLocale(),
    t: __hlT,
    setLocale: storeSetLocale,
});
function baseLanguage(locale) {
    return locale.toLowerCase().split("-")[0] ?? "";
}
export function resolvePreferredLocale({ preferredLocales, supportedLocales, sourceLocale = "en-US", }) {
    const supportedByLower = new Map(supportedLocales.map((l) => [l.toLowerCase(), l]));
    for (const locale of preferredLocales) {
        const exact = supportedByLower.get(locale.toLowerCase());
        if (exact)
            return exact;
    }
    const sourceBase = baseLanguage(sourceLocale);
    for (const locale of preferredLocales) {
        const preferredBase = baseLanguage(locale);
        if (!preferredBase || preferredBase === sourceBase)
            continue;
        const match = supportedLocales.find((l) => baseLanguage(l) === preferredBase);
        if (match)
            return match;
    }
    return sourceLocale;
}
function browserPreferredLocales() {
    if (typeof window === "undefined")
        return [];
    return navigator.languages?.length
        ? [...navigator.languages]
        : navigator.language
            ? [navigator.language]
            : [];
}
function initialLocale({ sourceLocale, languageStorageKey, supportedLocales, }) {
    if (typeof window === "undefined")
        return sourceLocale;
    const stored = window.localStorage.getItem(languageStorageKey);
    return resolvePreferredLocale({
        preferredLocales: stored ? [stored, ...browserPreferredLocales()] : browserPreferredLocales(),
        supportedLocales,
        sourceLocale,
    });
}
export function HedgelingProvider({ children, sourceLocale = "en-US", languageStorageKey = "hedgeling.locale", supportedLocales = [sourceLocale], bundleUrl = "/hedgeling-bundle.json", sourceKeyMapUrl = "/hedgeling-source-key-map.json", }) {
    // Re-render the whole subtree whenever the store locale or data changes so that
    // inline __hlT() calls pick up the new values.
    const locale = useSyncExternalStore(subscribe, getLocale, () => sourceLocale);
    const [ready, setReady] = useState(false);
    // Initialize source locale + preferred locale once.
    useEffect(() => {
        setSourceLocale(sourceLocale);
        storeSetLocale(initialLocale({ sourceLocale, languageStorageKey, supportedLocales }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sourceLocale, languageStorageKey]);
    // Load bundle + source key map.
    useEffect(() => {
        let cancelled = false;
        async function load() {
            const [bundleRes, mapRes] = await Promise.all([fetch(bundleUrl), fetch(sourceKeyMapUrl)]);
            if (!bundleRes.ok || !mapRes.ok)
                return;
            const [nextBundle, nextMap] = (await Promise.all([bundleRes.json(), mapRes.json()]));
            if (!cancelled) {
                setTranslationData(nextBundle, nextMap);
                setReady(true);
            }
        }
        load().catch((error) => console.warn("Hedgeling translations failed to load", error));
        return () => {
            cancelled = true;
        };
    }, [bundleUrl, sourceKeyMapUrl]);
    const setLocale = useCallback((next) => {
        if (typeof window !== "undefined")
            window.localStorage.setItem(languageStorageKey, next);
        storeSetLocale(next);
    }, [languageStorageKey]);
    const value = useMemo(() => ({ locale, t: __hlT, setLocale }), [locale, setLocale]);
    // `ready` is referenced to avoid an unused-var lint and to allow future gating.
    void ready;
    return _jsx(I18nContext.Provider, { value: value, children: children });
}
export function useTranslation() {
    return useContext(I18nContext);
}
