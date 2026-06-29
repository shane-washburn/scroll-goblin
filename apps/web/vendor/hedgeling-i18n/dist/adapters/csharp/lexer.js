// A small, dependency-free C# string lexer. It walks the source character by
// character so that string literals are recognised structurally — never matched
// inside comments, char literals, or other strings — which a bare regex cannot do
// reliably. This is the "real parser emits our IR" seam for C#: the lexer yields
// normalized string tokens with byte ranges, and the adapter's identify pass
// decides which ones sit in a user-facing position.
//
// Supported literal forms (C# 1.0 -> 11):
//   "..."        regular         (\-escapes)
//   @"..."       verbatim        ("" escapes a quote; newlines allowed)
//   $"..."       interpolated    ({expr} holes; {{ }} escape braces)
//   $@"..."      interpolated verbatim (and the @$"..." ordering)
//   """..."""    raw string      (>=3 quotes; no escaping)
//   $"""..."""   raw interpolated
// Interpolation holes are converted to ICU-style {name} placeholders to match the
// rest of the Hedgeling pipeline (e.g. $"Hello {user.Name}!" -> "Hello {name}!").
// Derive an ICU placeholder name from a C# interpolation expression, mirroring
// the EcmaScript template handling: trailing identifier of the expression, with a
// best-effort strip of alignment (",5") and format (":N0") components. Falls back
// to "value" for complex expressions with no trailing identifier.
function placeholderName(expr) {
    let e = expr.trim();
    e = e.replace(/,\s*-?\d+\s*$/, ""); // alignment component: ",5" / ",-10"
    e = e.replace(/:[^:{}()]*$/, ""); // format component: ":N0", ":yyyy-MM-dd"
    const match = e.match(/([A-Za-z_$][\w$]*)\s*$/);
    return match ? match[1] : "value";
}
// Resolve common C# escape sequences in a regular (non-verbatim) string body.
function decodeEscapes(body) {
    return body.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{1,4}|.)/g, (whole, esc) => {
        const c = esc[0];
        if (c === "u" || c === "x") {
            const code = Number.parseInt(esc.slice(1), 16);
            return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
        }
        switch (c) {
            case "n":
                return "\n";
            case "t":
                return "\t";
            case "r":
                return "\r";
            case "0":
                return "\0";
            case "\\":
                return "\\";
            case '"':
                return '"';
            case "'":
                return "'";
            default:
                return c; // unknown escape -> keep the escaped character
        }
    });
}
export function lexCSharpStrings(source) {
    const out = [];
    const len = source.length;
    let i = 0;
    const lineCommentEnd = (from) => {
        const nl = source.indexOf("\n", from);
        return nl === -1 ? len : nl;
    };
    while (i < len) {
        const c = source[i];
        // Comments.
        if (c === "/" && i + 1 < len) {
            if (source[i + 1] === "/") {
                i = lineCommentEnd(i + 2);
                continue;
            }
            if (source[i + 1] === "*") {
                const close = source.indexOf("*/", i + 2);
                i = close === -1 ? len : close + 2;
                continue;
            }
        }
        // Char literal: 'a', '\n', '\''. Skip without emitting.
        if (c === "'") {
            let j = i + 1;
            while (j < len) {
                if (source[j] === "\\") {
                    j += 2;
                    continue;
                }
                if (source[j] === "'") {
                    j += 1;
                    break;
                }
                if (source[j] === "\n")
                    break; // unterminated; bail
                j += 1;
            }
            i = j;
            continue;
        }
        // String literals, possibly with $ / @ prefixes (in either order).
        if (c === '"' || c === "$" || c === "@") {
            const parsed = tryReadString(source, i);
            if (parsed) {
                out.push(parsed);
                i = parsed.end;
                continue;
            }
            // A lone $ or @ that isn't a string prefix (e.g. verbatim identifier
            // @class) — fall through and advance one char.
        }
        i += 1;
    }
    return out;
}
// Attempt to read a string literal starting at `start`. Returns null when the
// characters at `start` are not actually a string opener.
function tryReadString(source, start) {
    const len = source.length;
    let i = start;
    let interpolated = false;
    let verbatim = false;
    // Consume leading $ / @ prefixes in any order.
    while (i < len && (source[i] === "$" || source[i] === "@")) {
        if (source[i] === "$")
            interpolated = true;
        else
            verbatim = true;
        i += 1;
    }
    if (i >= len || source[i] !== '"')
        return null;
    // Raw string literal: a run of >= 3 quotes.
    let quoteRun = 0;
    let q = i;
    while (q < len && source[q] === '"') {
        quoteRun += 1;
        q += 1;
    }
    if (quoteRun >= 3) {
        return readRaw(source, start, i, quoteRun, interpolated);
    }
    // Single-quote-opened string (regular or verbatim).
    const bodyStart = i + 1;
    return verbatim
        ? readVerbatim(source, start, bodyStart, interpolated)
        : readRegular(source, start, bodyStart, interpolated);
}
// Read until an unescaped closing quote on the same logical line.
function readRegular(source, start, bodyStart, interpolated) {
    const len = source.length;
    let i = bodyStart;
    let raw = "";
    while (i < len) {
        const ch = source[i];
        if (ch === "\\") {
            raw += source.slice(i, i + 2);
            i += 2;
            continue;
        }
        if (ch === '"') {
            const value = interpolated
                ? convertInterpolations(decodeEscapes(raw), false)
                : decodeEscapes(raw);
            return { value, start, end: i + 1, interpolated };
        }
        if (ch === "\n")
            return null; // unterminated regular string
        raw += ch;
        i += 1;
    }
    return null;
}
// Verbatim string: "" escapes a quote; everything else (incl. newlines) literal.
function readVerbatim(source, start, bodyStart, interpolated) {
    const len = source.length;
    let i = bodyStart;
    let raw = "";
    while (i < len) {
        const ch = source[i];
        if (ch === '"') {
            if (source[i + 1] === '"') {
                raw += '"';
                i += 2;
                continue;
            }
            const value = interpolated ? convertInterpolations(raw, true) : raw;
            return { value, start, end: i + 1, interpolated };
        }
        raw += ch;
        i += 1;
    }
    return null;
}
// Raw string literal: closes on a run of exactly `quoteRun` quotes.
function readRaw(source, start, openQuoteStart, quoteRun, interpolated) {
    const len = source.length;
    const delimiter = '"'.repeat(quoteRun);
    const bodyStart = openQuoteStart + quoteRun;
    const close = source.indexOf(delimiter, bodyStart);
    if (close === -1)
        return null;
    let raw = source.slice(bodyStart, close);
    // Per spec, a multi-line raw literal drops the opening/closing newlines and
    // common indentation. A light normalization is enough for extraction.
    raw = raw.replace(/^\r?\n/, "").replace(/\r?\n[ \t]*$/, "");
    const value = interpolated ? convertInterpolations(raw, true) : raw;
    return { value, start, end: close + quoteRun, interpolated };
}
// Replace interpolation holes ({expr}) with {name} placeholders. `verbatim`
// controls brace-escape handling: in all interpolated forms {{ and }} are literal
// braces. Nested braces, parentheses and inner string literals inside a hole are
// tracked so we stop at the matching top-level closing brace.
function convertInterpolations(body, _verbatim) {
    let out = "";
    let i = 0;
    const len = body.length;
    while (i < len) {
        const ch = body[i];
        if (ch === "{") {
            if (body[i + 1] === "{") {
                out += "{";
                i += 2;
                continue;
            }
            // Scan the hole to its matching close brace.
            let depth = 1;
            let j = i + 1;
            let expr = "";
            while (j < len && depth > 0) {
                const cj = body[j];
                if (cj === "{") {
                    depth += 1;
                    expr += cj;
                    j += 1;
                    continue;
                }
                if (cj === "}") {
                    depth -= 1;
                    if (depth === 0) {
                        j += 1;
                        break;
                    }
                    expr += cj;
                    j += 1;
                    continue;
                }
                // Skip nested string literals so their braces/quotes don't confuse us.
                if (cj === '"' || cj === "'") {
                    const quote = cj;
                    expr += cj;
                    j += 1;
                    while (j < len && body[j] !== quote) {
                        if (body[j] === "\\") {
                            expr += body.slice(j, j + 2);
                            j += 2;
                            continue;
                        }
                        expr += body[j];
                        j += 1;
                    }
                    if (j < len) {
                        expr += body[j];
                        j += 1;
                    }
                    continue;
                }
                expr += cj;
                j += 1;
            }
            out += `{${placeholderName(expr)}}`;
            i = j;
            continue;
        }
        if (ch === "}") {
            if (body[i + 1] === "}") {
                out += "}";
                i += 2;
                continue;
            }
            out += "}";
            i += 1;
            continue;
        }
        out += ch;
        i += 1;
    }
    return out;
}
