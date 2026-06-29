// Framework-agnostic translation store. The Vite-injected __hlT() reads from here,
// so it works in any scope (including inline JSX) without a React hook.
import { formatMessage, simpleInterpolate } from "./icu.js";
let sourceLocale = "en-US";
let currentLocale = "en-US";
let bundle = {};
let sourceKeyMap = { bySource: {} };
const listeners = new Set();
function emit() {
    for (const listener of listeners)
        listener();
}
export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
export function getLocale() {
    return currentLocale;
}
export function getSourceLocale() {
    return sourceLocale;
}
export function setSourceLocale(locale) {
    sourceLocale = locale;
}
export function setLocale(locale) {
    if (locale === currentLocale)
        return;
    currentLocale = locale;
    emit();
}
export function setTranslationData(nextBundle, nextSourceKeyMap) {
    bundle = nextBundle ?? {};
    sourceKeyMap = nextSourceKeyMap ?? { bySource: {} };
    emit();
}
export function normalizeSourceText(value) {
    return value.replace(/\s+/g, " ").trim();
}
export function interpolate(source, values = {}) {
    return simpleInterpolate(source, values);
}
export function translate(source, values) {
    const normalized = normalizeSourceText(source);
    if (currentLocale === sourceLocale)
        return formatMessage(normalized, values, currentLocale);
    const key = sourceKeyMap.bySource[normalized];
    const translated = key ? bundle[currentLocale]?.[key] : undefined;
    return formatMessage(translated ?? normalized, values, currentLocale);
}
