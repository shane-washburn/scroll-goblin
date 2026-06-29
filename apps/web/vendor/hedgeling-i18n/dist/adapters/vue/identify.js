import { isProbablyTranslatable, normalizeText } from "../../core/text.js";
// Map a Vue/HTML template tag to a translatable shape. Kept local to the Vue
// adapter so it stays independent of the HTML/React adapters.
function shapeForTag(tag) {
    const lower = tag.toLowerCase();
    if (lower === "button")
        return "button";
    if (lower === "a" || lower === "router-link" || lower === "nuxt-link")
        return "link";
    if (lower === "label")
        return "label";
    if (/^h[1-6]$/.test(lower))
        return "header";
    return "body";
}
// Translatable attribute names (static only; bound `:attr`/`v-bind:` are dynamic).
const ATTR_SHAPES = {
    placeholder: {
        shape: "placeholder",
        kind: "placeholder",
        purpose: "placeholder text shown inside an input before the user enters content",
    },
    title: { shape: "tooltip", kind: "title-attribute", purpose: "tooltip text shown for additional context" },
    "aria-label": {
        shape: "label",
        kind: "aria-label",
        purpose: "accessibility label for an interactive or visual element",
    },
    alt: { shape: "label", kind: "alt-text", purpose: "alternative text for an image or visual element" },
    label: { shape: "label", kind: "component-label", purpose: "label passed to a UI component" },
};
// Convert Vue mustache interpolation to an ICU-style placeholder, matching the
// rest of the pipeline ("Hello {{ user.name }}" -> "Hello {name}"). Pure-dynamic
// text (only a mustache, no words) is filtered out later by isProbablyTranslatable.
function mustacheToPlaceholder(text) {
    return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, expr) => {
        const trimmed = String(expr).trim();
        // Trailing identifier of a path/expression: user.name -> name, count -> count.
        const match = trimmed.match(/([A-Za-z_$][\w$]*)\s*$/);
        return `{${match ? match[1] : "value"}}`;
    });
}
// True when the message has real words outside {name} placeholders, so a
// pure-interpolation node like {{ onlyDynamic }} ("{onlyDynamic}") is skipped.
function hasWordsOutsidePlaceholders(message) {
    return /\p{L}/u.test(message.replace(/\{[a-zA-Z0-9_]+\}/g, ""));
}
// Extraction-only adapter for Vue Single-File Components. Scans the top-level
// <template> block for element text and static translatable attributes. Detection
// only — Vue strings are applied at runtime by the DOM injector.
export function identifyVueHits(source) {
    const hits = [];
    // Restrict to the <template> block; <script>/<style> are not UI copy.
    const templateMatch = source.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i);
    if (!templateMatch)
        return hits;
    const template = templateMatch[1];
    const templateOffset = templateMatch.index + templateMatch[0].indexOf(template);
    const lineFor = (index) => source.slice(0, templateOffset + index).split(/\r?\n/).length;
    const push = (rawText, shape, kind, purpose, index) => {
        const text = normalizeText(mustacheToPlaceholder(rawText));
        if (!isProbablyTranslatable(text))
            return;
        if (!hasWordsOutsidePlaceholders(text))
            return; // pure {{ }} interpolation
        hits.push({ text, shape, purpose, visualContext: "", kind, line: lineFor(index) });
    };
    // Element text content for translatable tags (one level; no nested element children).
    const tagTextPattern = /<(h[1-6]|button|a|label|p|li|span|div|router-link|nuxt-link)\b[^>]*>([^<]*\p{L}[^<]*)<\/\1>/giu;
    for (const match of template.matchAll(tagTextPattern)) {
        const tag = match[1].toLowerCase();
        push(match[2], shapeForTag(tag), `vue-${tag}-text`, "text shown to users in a Vue template", match.index ?? 0);
    }
    // Static translatable attributes. Negative lookbehind rejects bound attributes
    // (`:title`, `v-bind:title`) whose value is a JS expression, not copy.
    const attrPattern = /(?<![:\w-])(placeholder|title|aria-label|alt|label)\s*=\s*"([^"]*\p{L}[^"]*)"/giu;
    for (const match of template.matchAll(attrPattern)) {
        const info = ATTR_SHAPES[match[1].toLowerCase()];
        if (!info)
            continue;
        push(match[2], info.shape, `vue-${info.kind}`, info.purpose, match.index ?? 0);
    }
    return hits;
}
