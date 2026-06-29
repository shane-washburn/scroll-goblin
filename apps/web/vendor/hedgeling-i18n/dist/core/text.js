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
// Common single-word Tailwind/CSS utility classes (no hyphen/colon, so the
// separated-utility shape can't catch them). Only used to confirm a class cluster
// that ALSO contains a separated/variant token, so these never flag prose alone.
const BARE_UTILITY_CLASSES = new Set([
    "hidden",
    "block",
    "inline",
    "flex",
    "grid",
    "table",
    "contents",
    "none",
    "static",
    "fixed",
    "absolute",
    "relative",
    "sticky",
    "visible",
    "invisible",
    "collapse",
    "italic",
    "underline",
    "overline",
    "truncate",
    "uppercase",
    "lowercase",
    "capitalize",
    "antialiased",
    "container",
    "isolate",
    "group",
    "peer",
    "border",
    "rounded",
    "shadow",
    "ring",
    "outline",
    "transition",
    "transform",
    "grow",
    "shrink",
]);
// Heuristic: a message that is really machine syntax (URL, cookie, CSS, SVG path,
// inline style, bare unit, locale tag, namespace key) rather than UI copy. Such
// strings must be kept out of the translation path: they get interpolated/rendered
// as-is, and a translator rewriting "rotate"/a color keyword would break layout or
// logic. Shared by every adapter (JS/TS, HTML, Vue, C#, XAML) so noise filtering is
// uniform across languages.
export function looksTechnical(raw) {
    const trimmed = raw.trim();
    if (/:\/\//.test(raw))
        return true; // protocol URLs
    if (/[?&][\w-]*=/.test(raw))
        return true; // query params
    if (/^\.\.?\//.test(trimmed))
        return true; // relative module/asset path ("./X", "../x")
    if (/^[A-Za-z]:[\\/]/.test(trimmed))
        return true; // Windows drive path ("C:\\temp", "D:/x")
    if (/^\\\\[^\\]/.test(trimmed))
        return true; // UNC path ("\\\\server\\share")
    if (/^(?:[\w.\- ]+\\)+[\w.\- ]+$/.test(trimmed))
        return true; // backslash path ("dir\\file.ext")
    // SQL statement: a leading DML/DDL keyword plus the matching clause keyword, so
    // prose starting with "Select"/"Update" (e.g. "Select a file") is left alone.
    if (/^\s*(?:SELECT\b[\s\S]*\bFROM\b|INSERT\s+INTO\b|UPDATE\b[\s\S]*\bSET\b|DELETE\s+FROM\b|CREATE\s+(?:TABLE|INDEX|VIEW|DATABASE|PROCEDURE)\b|ALTER\s+TABLE\b|DROP\s+(?:TABLE|INDEX|VIEW|DATABASE)\b|TRUNCATE\s+TABLE\b)/i.test(trimmed)) {
        return true;
    }
    if (/^\(\s*[a-z-]+\s*:\s*[^)]+\)$/i.test(trimmed))
        return true; // CSS media query
    if (/^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+$/.test(trimmed))
        return true; // snake_case identifier/const
    // BCP-47 locale tag ("en-US", "nl-NL", "zh-Hant", "zh-Hant-TW"): an internal
    // identifier, never UI copy. Requires a subtag so hyphenated prose ("co-op")
    // is left alone — region must be uppercase / script must be Titlecase.
    if (/-/.test(trimmed) &&
        /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?$/.test(trimmed)) {
        return true;
    }
    // Dotted namespace identifier ("hedgeling.locale", "feature.flag.name"): a
    // config/storage key, never UI copy. Lowercase segments only; length guard
    // skips abbreviations like "e.g"/"i.e".
    if (trimmed.length >= 5 && /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/.test(trimmed)) {
        return true;
    }
    if (/#[0-9a-fA-F]{3,8}\b/.test(raw))
        return true; // hex colors (shadows, palettes)
    if (/^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(trimmed))
        return true; // HTTP verbs
    if (/^(?:application|text|image|audio|video|font|model|multipart)\/[a-z0-9.+-]+(?:\s*;\s*[a-z0-9.+=-]+)*$/i.test(trimmed)) {
        return true; // MIME types, incl. parameters ("audio/webm;codecs=opus")
    }
    if (/^(?:Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific|Etc)\/[A-Za-z]+(?:[_/][A-Za-z]+)*$/.test(trimmed)) {
        return true; // IANA timezone ("America/Chicago", "Asia/Tokyo")
    }
    // Canvas/CSS font shorthand with a quoted or generic family: "16px 'Arial'",
    // "bold 16px sans-serif" (the family check avoids matching copy like "16px wide").
    if (/^(?:(?:normal|italic|oblique|bold|bolder|lighter|small-caps|\d{3})\s+)*\d+(?:\.\d+)?(?:px|pt|em|rem)\s+(?:['"]|serif\b|sans-serif\b|monospace\b|cursive\b|fantasy\b)/i.test(trimmed)) {
        return true;
    }
    // Tailwind / utility class clusters: "bg-brand-bg text-brand-text", "sm:px-4",
    // "top-[110px] sm:h-[17rem]", "hidden sm:inline-flex" (lowercase only). A cluster
    // is flagged when every token is a utility AND at least one is a separated/variant
    // token (-, :, []) — so lowercase prose (even "well-being tips") is never dropped.
    const tokens = trimmed.split(/\s+/);
    const isSeparatedUtility = (t) => /^!?-?[a-z0-9]+(?:[-:/](?:\[[^\]]+\]|[a-z0-9.]+))+$/.test(t);
    const isUtilityClass = (t) => isSeparatedUtility(t) || BARE_UTILITY_CLASSES.has(t);
    if (tokens.length >= 2 && tokens.every(isUtilityClass) && tokens.some(isSeparatedUtility)) {
        return true;
    }
    if (tokens.length === 1 &&
        isSeparatedUtility(tokens[0]) &&
        (tokens[0].match(/[-:/]/g) || []).length >= 2) {
        return true;
    }
    // CSS / canvas functional notation (color, transform, gradient, filter, calc).
    if (/\b(?:hsla?|rgba?|translate(?:3d|x|y|z)?|rotate[xyz]?|scale[xyz]?|skew[xy]?|matrix3?d?|perspective|calc|var|url|(?:linear|radial|conic)-gradient|cubic-bezier|drop-shadow|blur|brightness|saturate|grayscale)\s*\(/i.test(raw)) {
        return true;
    }
    // Placeholders -> a sentinel so we can pattern-match the surrounding syntax.
    const s = raw.replace(/\{[^}]*\}/g, "\u0000").trim();
    if (!s)
        return false;
    if (/^[/?#]/.test(s))
        return true; // path / query / hash
    // Slash-separated path with no spaces (e.g. {base}/{id}/join) — a URL/route,
    // even when it starts with a placeholder. Require a placeholder or 2+ segments
    // so ordinary copy like "and/or" or "him/her" is left alone.
    if (/^[\u0000\w.-]*(?:\/[\u0000\w.-]+)+$/.test(s) &&
        (s.includes("\u0000") || (s.match(/\//g) || []).length >= 2)) {
        return true;
    }
    if (/^[a-z-]+:\S/i.test(s))
        return true; // css declaration / id ref e.g. clip:x
    if (/[a-z-]+\s*:\s*[^;]+;/i.test(s))
        return true; // inline style "prop: value;"
    if (/(?:^|[;\s])(?:path|max-age|samesite|domain|expires|secure|httponly)\b/i.test(s)) {
        return true; // cookie attributes
    }
    // Bare unit value: "{n}px", "-{n}ms", "{n}%", "{n}s" with no real words.
    if (/^[\u0000\d\s.,+-]*(?:px|ms|deg|rad|turn|em|rem|vh|vw|fr|pt|%|s)$/i.test(s))
        return true;
    // SVG path data: only command letters + numbers/placeholders.
    if (/^[MLHVCSQTAZ][\u0000\d\s.,+-]*$/i.test(s))
        return true;
    // CSS animation/transition shorthand: a timing token plus an easing keyword.
    if (/(?:\d|\u0000)(?:\.\d+)?m?s\b/.test(s) &&
        /\b(?:linear|ease(?:-in|-out|-in-out)?|forwards|backwards|infinite|alternate|steps)\b/i.test(s)) {
        return true;
    }
    return false;
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
