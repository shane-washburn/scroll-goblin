export function decodeHtmlEntities(value) {
    const named = {
        amp: "&",
        apos: "'",
        gt: ">",
        lt: "<",
        nbsp: " ",
        quot: '"',
    };
    return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
        const lower = entity.toLowerCase();
        if (lower.startsWith("#x")) {
            const code = Number.parseInt(lower.slice(2), 16);
            return codePointOrOriginal(code, match);
        }
        if (lower.startsWith("#")) {
            const code = Number.parseInt(lower.slice(1), 10);
            return codePointOrOriginal(code, match);
        }
        return named[lower] ?? match;
    });
}
function codePointOrOriginal(code, original) {
    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff)
        return original;
    try {
        return String.fromCodePoint(code);
    }
    catch {
        return original;
    }
}
export function normalizeText(source) {
    return decodeHtmlEntities(source).replace(/\s+/g, " ").trim();
}
export function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
// Heuristic for "is this string user-facing UI copy worth translating".
// Ported from scroll-goblin's extract-i18n.mts so behaviour matches.
export function isProbablyTranslatable(source) {
    const text = normalizeText(source);
    if (!text)
        return false;
    if (text.length < 2)
        return false;
    if (!/\p{L}/u.test(text))
        return false;
    if (/^https?:\/\//i.test(text))
        return false;
    if (/^\/[a-z0-9/_-]+$/i.test(text))
        return false;
    if (/^[a-z0-9_-]+:[a-z0-9:_-]+$/i.test(text))
        return false;
    if (/^[a-z]+(?:[A-Z][a-z0-9]*)+$/.test(text))
        return false;
    if (/^[.#]?[a-z0-9_-]+$/i.test(text) && !/[A-Z]/.test(text))
        return false;
    return true;
}
