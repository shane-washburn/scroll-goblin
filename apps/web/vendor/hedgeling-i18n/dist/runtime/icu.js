// Minimal, dependency-free ICU MessageFormat subset for the runtime. Supports the
// cases that matter for UI copy across locales: simple {name} arguments,
// {name, number}, {name, plural/selectordinal, ...} (with =N matches, #, offset),
// and {name, select, ...} with nested messages. Plural categories come from the
// built-in Intl.PluralRules, so Slavic/Arabic plural forms are correct.
//
// Messages WITHOUT complex syntax take the fast simpleInterpolate path, which is
// what the build-time auto-wrap emits ("{count} unlocked"). Full ICU (dates with
// skeletons, nested offsets) is intentionally out of scope.
const COMPLEX_RE = /\{\s*[a-zA-Z0-9_]+\s*,/;
const NAME_RE = /[a-zA-Z0-9_]/;
function skipWs(s, i) {
    while (i < s.length && /\s/.test(s[i]))
        i++;
    return i;
}
function formatNumber(value, locale) {
    try {
        return new Intl.NumberFormat(locale).format(value);
    }
    catch {
        return String(value);
    }
}
// Parse message text into nodes, stopping at an unmatched '}' (used for nested
// option bodies). Returns the cursor position of that '}' (or end of string).
function parseNodes(s, start) {
    const nodes = [];
    let i = start;
    let text = "";
    const flush = () => {
        if (text) {
            nodes.push({ k: "text", v: text });
            text = "";
        }
    };
    while (i < s.length) {
        const c = s[i];
        if (c === "'") {
            // ICU apostrophe escaping: '' -> literal ', '...' -> literal section.
            if (s[i + 1] === "'") {
                text += "'";
                i += 2;
                continue;
            }
            const close = s.indexOf("'", i + 1);
            if (close === -1) {
                text += s.slice(i + 1);
                i = s.length;
            }
            else {
                text += s.slice(i + 1, close);
                i = close + 1;
            }
            continue;
        }
        if (c === "}")
            break;
        if (c === "{") {
            flush();
            const res = parseArgument(s, i);
            nodes.push(res.node);
            i = res.end;
            continue;
        }
        text += c;
        i++;
    }
    flush();
    return { nodes, end: i };
}
function parseArgument(s, start) {
    let i = skipWs(s, start + 1); // skip '{'
    let name = "";
    while (i < s.length && NAME_RE.test(s[i])) {
        name += s[i];
        i++;
    }
    i = skipWs(s, i);
    if (s[i] === "}")
        return { node: { k: "arg", name }, end: i + 1 };
    if (s[i] === ",") {
        i = skipWs(s, i + 1);
        let type = "";
        while (i < s.length && /[a-zA-Z]/.test(s[i])) {
            type += s[i];
            i++;
        }
        i = skipWs(s, i);
        if (type === "number" || type === "date" || type === "time") {
            // Skip an optional style argument up to the closing brace.
            while (i < s.length && s[i] !== "}")
                i++;
            return { node: type === "number" ? { k: "number", name } : { k: "arg", name }, end: i + 1 };
        }
        if (type === "plural" || type === "selectordinal" || type === "select") {
            if (s[i] === ",")
                i = skipWs(s, i + 1);
            const opts = new Map();
            let offset = 0;
            while (i < s.length && s[i] !== "}") {
                if (s.startsWith("offset:", i)) {
                    i += 7;
                    let num = "";
                    while (i < s.length && /[0-9]/.test(s[i])) {
                        num += s[i];
                        i++;
                    }
                    offset = Number(num) || 0;
                    i = skipWs(s, i);
                    continue;
                }
                let sel = "";
                while (i < s.length && !/\s/.test(s[i]) && s[i] !== "{") {
                    sel += s[i];
                    i++;
                }
                i = skipWs(s, i);
                if (s[i] !== "{")
                    break;
                const inner = parseNodes(s, i + 1);
                opts.set(sel, inner.nodes);
                i = inner.end;
                if (s[i] === "}")
                    i++;
                i = skipWs(s, i);
            }
            const end = s[i] === "}" ? i + 1 : i;
            if (type === "select")
                return { node: { k: "select", name, opts }, end };
            return {
                node: { k: "plural", name, ordinal: type === "selectordinal", offset, opts },
                end,
            };
        }
    }
    // Unknown form: skip to '}' and treat as a simple argument.
    while (i < s.length && s[i] !== "}")
        i++;
    return { node: { k: "arg", name }, end: i + 1 };
}
function render(nodes, values, locale, hashValue) {
    let out = "";
    for (const n of nodes) {
        if (n.k === "text") {
            out += hashValue === undefined ? n.v : n.v.replace(/#/g, formatNumber(hashValue, locale));
        }
        else if (n.k === "arg") {
            const v = values[n.name];
            out += v === null || v === undefined ? `{${n.name}}` : String(v);
        }
        else if (n.k === "number") {
            const v = Number(values[n.name]);
            out += Number.isNaN(v) ? `{${n.name}}` : formatNumber(v, locale);
        }
        else if (n.k === "select") {
            const key = String(values[n.name]);
            const opt = n.opts.get(key) ?? n.opts.get("other") ?? [];
            out += render(opt, values, locale, hashValue);
        }
        else {
            const raw = Number(values[n.name]);
            const value = Number.isNaN(raw) ? 0 : raw;
            const adjusted = value - n.offset;
            let opt = n.opts.get(`=${value}`);
            if (!opt) {
                let category = "other";
                try {
                    category = new Intl.PluralRules(locale, {
                        type: n.ordinal ? "ordinal" : "cardinal",
                    }).select(adjusted);
                }
                catch {
                    /* fall back to other */
                }
                opt = n.opts.get(category) ?? n.opts.get("other") ?? [];
            }
            out += render(opt, values, locale, adjusted);
        }
    }
    return out;
}
export function simpleInterpolate(source, values) {
    if (!values)
        return source;
    return source.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
        const value = values[key];
        return value === null || value === undefined ? match : String(value);
    });
}
export function formatMessage(message, values, locale) {
    if (!values || !COMPLEX_RE.test(message))
        return simpleInterpolate(message, values);
    try {
        const { nodes } = parseNodes(message, 0);
        return render(nodes, values, locale);
    }
    catch {
        return simpleInterpolate(message, values);
    }
}
