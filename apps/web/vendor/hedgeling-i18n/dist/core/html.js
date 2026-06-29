import { propShapes, shapeFromHtmlTag } from "./shapes.js";
import { isProbablyTranslatable, normalizeText } from "./text.js";
// Lightweight HTML extractor for index.html-style files. Detection only; HTML is
// not auto-wrapped (wrap: none), so the runtime injector / source catalog covers it.
export function identifyHtmlHits(html) {
    const hits = [];
    const tagTextPattern = /<(title|h[1-6]|button|a|label|p|li|span)\b[^>]*>([^<]*\p{L}[^<]*)<\/\1>/giu;
    const attrPattern = /\b(aria-label|title|alt|placeholder)="([^"]*\p{L}[^"]*)"/giu;
    const lineFor = (index) => html.slice(0, index).split(/\r?\n/).length;
    const push = (rawText, shape, kind, purpose, index) => {
        const text = normalizeText(rawText);
        if (!isProbablyTranslatable(text))
            return;
        hits.push({ text, shape, purpose, visualContext: "", kind, line: lineFor(index), wrap: { type: "none" } });
    };
    for (const match of html.matchAll(tagTextPattern)) {
        const tag = match[1].toLowerCase();
        push(match[2], shapeFromHtmlTag(tag), `html-${tag}-text`, tag === "title"
            ? "document title shown in browser tabs and search results"
            : "static HTML text shown to users", match.index ?? 0);
    }
    for (const match of html.matchAll(attrPattern)) {
        const info = propShapes[match[1].toLowerCase()];
        if (!info)
            continue;
        push(match[2], info.shape, `html-${info.kind}`, info.purpose, match.index ?? 0);
    }
    return hits;
}
