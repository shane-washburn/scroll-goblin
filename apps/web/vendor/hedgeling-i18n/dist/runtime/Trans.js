import { cloneElement, createElement, Fragment, isValidElement, useSyncExternalStore, } from "react";
import { getLocale, getSourceLocale, subscribe, translate } from "./store.js";
// Paired indexed placeholders emitted by the build, e.g. "Click <0>here</0> now".
const TAG_RE = /<(\d+)>([\s\S]*?)<\/\1>/;
const VALUE_RE = /\{([a-zA-Z0-9_]+)\}/g;
function interpolateValues(text, values) {
    const out = [];
    let last = 0;
    for (const match of text.matchAll(VALUE_RE)) {
        const index = match.index ?? 0;
        if (index > last)
            out.push(text.slice(last, index));
        const name = match[1];
        out.push(name in values ? values[name] : match[0]);
        last = index + match[0].length;
    }
    if (last < text.length)
        out.push(text.slice(last));
    return out;
}
function renderMessage(message, components, values) {
    const nodes = [];
    let rest = message;
    let key = 0;
    while (rest.length > 0) {
        const match = TAG_RE.exec(rest);
        if (!match) {
            nodes.push(...interpolateValues(rest, values));
            break;
        }
        const before = rest.slice(0, match.index);
        if (before)
            nodes.push(...interpolateValues(before, values));
        const componentIndex = Number(match[1]);
        const innerNodes = interpolateValues(match[2], values);
        const component = components[componentIndex];
        if (isValidElement(component)) {
            nodes.push(cloneElement(component, { key: key++ }, ...innerNodes));
        }
        else {
            nodes.push(...innerNodes);
        }
        rest = rest.slice(match.index + match[0].length);
    }
    return nodes;
}
/**
 * Renders a translatable message that contains inline markup. The Vite plugin
 * emits this automatically for elements like <p>Click <a>here</a></p>; developers
 * never write it by hand. Translators translate the message (keeping the <0>..</0>
 * placeholders), and the original elements are reused via cloneElement.
 */
export function Trans({ message, components = [], values = {}, }) {
    // Re-render on locale change.
    useSyncExternalStore(subscribe, getLocale, getSourceLocale);
    const translated = translate(message);
    return createElement(Fragment, null, ...renderMessage(translated, components, values));
}
