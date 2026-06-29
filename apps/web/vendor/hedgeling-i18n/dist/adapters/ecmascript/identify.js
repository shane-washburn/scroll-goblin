import ts from "typescript";
import { buildJsxMessage } from "./jsxMessage.js";
import { jsxElementInfo } from "./shapes.js";
import { buildTemplateMessage } from "./templateMessage.js";
import { propShapes } from "../../core/shapes.js";
import { isProbablyTranslatable, normalizeText } from "../../core/text.js";
// True when the message has real words outside of {name} placeholders, so a
// pure-substitution template like `${count}` ("{count}") is not extracted.
function hasWordsOutsidePlaceholders(message) {
    return /\p{L}/u.test(message.replace(/\{[a-zA-Z0-9_]+\}/g, ""));
}
const DEFAULT_TRANSLATION_FNS = ["t", "__hlT"];
const IMPORT_MARKER = "/* @hedgeling/i18n: auto-wrap */";
function propertyName(name) {
    if (ts.isIdentifier(name))
        return name.text;
    if (ts.isStringLiteral(name))
        return name.text;
    return null;
}
function jsxTagName(node) {
    const name = node.tagName;
    if (ts.isIdentifier(name))
        return name.text;
    if (ts.isPropertyAccessExpression(name))
        return name.name.text;
    return name.getText();
}
function stringLiteralValue(node) {
    if (!node)
        return null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        return node.text;
    if (ts.isJsxExpression(node) && node.expression)
        return stringLiteralValue(node.expression);
    return null;
}
// Collect the plain-text content of a JSX element's children, but ONLY when the
// children are safe to replace wholesale with a single t() call. If any child is a
// nested element or a dynamic expression, return null (do not auto-wrap).
function pureTextChildren(children) {
    const parts = [];
    let sawText = false;
    for (const child of children) {
        if (ts.isJsxText(child)) {
            parts.push(child.text);
            if (child.text.trim())
                sawText = true;
            continue;
        }
        if (ts.isJsxExpression(child)) {
            if (!child.expression)
                continue; // {/* comment */} or empty
            const literal = stringLiteralValue(child.expression);
            if (literal === null)
                return null; // dynamic expression -> unsafe
            parts.push(literal);
            sawText = true;
            continue;
        }
        // Any element/fragment/self-closing child makes wholesale replacement unsafe.
        return null;
    }
    return sawText ? parts.join("") : null;
}
function callName(node) {
    if (ts.isIdentifier(node))
        return node.text;
    if (ts.isPropertyAccessExpression(node))
        return node.name.text;
    return null;
}
// Heuristic: a message that is really machine syntax (URL, cookie, CSS, SVG path,
// inline style, bare unit) rather than UI copy. Such strings must be kept out of
// the translation path: they get interpolated/rendered as-is, and a translator
// rewriting "rotate"/"path"/a color keyword would break layout or logic.
function looksTechnical(raw) {
    const trimmed = raw.trim();
    if (/:\/\//.test(raw))
        return true; // protocol URLs
    if (/[?&][\w-]*=/.test(raw))
        return true; // query params
    if (/^\.\.?\//.test(trimmed))
        return true; // relative module/asset path ("./X", "../x")
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
// Callees whose string arguments are never user-facing UI copy.
const DENY_CALLEES = new Set([
    "t",
    "__hlT",
    "log",
    "warn",
    "error",
    "info",
    "debug",
    "trace",
    "assert",
    "group",
    "groupEnd",
    "getItem",
    "setItem",
    "removeItem",
    "getElementById",
    "querySelector",
    "querySelectorAll",
    "createElement",
    "getAttribute",
    "setAttribute",
    "removeAttribute",
    "getContext",
    "getExtension",
    "addEventListener",
    "removeEventListener",
    "dispatchEvent",
    "matchMedia",
    "postMessage",
    "createObjectURL",
    "revokeObjectURL",
    "require",
    "import",
    "glob",
    "fetch",
    "open",
    "track",
    "gtag",
    "ga",
    "identify",
    "capture",
    "logEvent",
    "Error",
    "TypeError",
    "RangeError",
    "URL",
    "URLSearchParams",
    "Worker",
    "EventSource",
    "WebSocket",
]);
// Recall pass: a string literal in a "value position" (array element, call arg,
// object VALUE, ternary/logical branch, variable initializer, JSX child
// expression, return value) is UI copy we want to extract for the DOM injector.
// Excludes object keys, JSX attribute values, imports, type literals, and
// arguments to known non-UI callees. Extraction-only (never auto-wrapped), so it
// cannot alter or break source.
function isExtractableValueLiteral(node) {
    const parent = node.parent;
    if (!parent)
        return false;
    if (ts.isPropertyAssignment(parent) && parent.name === node)
        return false; // object key
    if (ts.isComputedPropertyName(parent))
        return false;
    if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent))
        return false;
    if (ts.isImportEqualsDeclaration(parent) || ts.isExternalModuleReference(parent))
        return false;
    if (ts.isModuleDeclaration(parent))
        return false;
    if (ts.isJsxAttribute(parent))
        return false; // handled by the known-prop rule
    if (ts.isJsxExpression(parent) && parent.parent && ts.isJsxAttribute(parent.parent))
        return false;
    if (ts.isLiteralTypeNode(parent))
        return false; // TS literal type
    if (ts.isEnumMember(parent))
        return false;
    if (ts.isCaseClause(parent))
        return false; // switch case label
    if (ts.isElementAccessExpression(parent))
        return false; // obj["key"]
    if (ts.isPropertyAccessExpression(parent) && parent.expression === node)
        return false;
    // Dynamic import specifier: import("./Page") — parent call's callee is `import`.
    if (ts.isCallExpression(parent) && parent.expression.kind === ts.SyntaxKind.ImportKeyword) {
        return false;
    }
    // Assignment to a non-UI property: this.name = "TransportError",
    // Comp.displayName = "...", ctx.font = "16px 'Arial'", ctx.textBaseline = "top".
    if (ts.isBinaryExpression(parent) &&
        parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        parent.right === node &&
        ts.isPropertyAccessExpression(parent.left) &&
        ASSIGN_DENY_PROPS.has(parent.left.name.text)) {
        return false;
    }
    // Keyboard/event comparison: event.key === "Escape", e.code === "Enter".
    // The literal is a KeyboardEvent value, never UI copy.
    if (ts.isBinaryExpression(parent) &&
        (parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
            parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
            parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
            parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken)) {
        const other = parent.left === node ? parent.right : parent.left;
        if (ts.isPropertyAccessExpression(other) && KEY_EVENT_PROPS.has(other.name.text)) {
            return false;
        }
    }
    // Font-family stack: an array containing a generic family keyword (e.g.
    // ["Space Mono", "Courier New", "monospace"]) — the named fonts aren't UI copy.
    if (ts.isArrayLiteralExpression(parent)) {
        for (const el of parent.elements) {
            const v = ts.isStringLiteral(el) || ts.isNoSubstitutionTemplateLiteral(el)
                ? el.text.trim().toLowerCase()
                : "";
            if (GENERIC_FONT_FAMILIES.has(v))
                return false;
        }
    }
    if ((ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.expression) {
        const callee = callName(parent.expression);
        if (callee && DENY_CALLEES.has(callee))
            return false;
    }
    return true;
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
// KeyboardEvent properties compared against a literal key name (event.key,
// e.code, ...). The literal is a key identifier, not UI copy.
const KEY_EVENT_PROPS = new Set(["key", "code", "keyCode", "which", "charCode"]);
// Object/instance properties whose assigned string is config, not UI copy.
// Deliberately excludes UI-bearing props (title, textContent, placeholder,
// value, alt, ariaLabel, innerText, innerHTML).
const ASSIGN_DENY_PROPS = new Set([
    "name",
    "displayName",
    "font",
    "textBaseline",
    "textAlign",
    "fillStyle",
    "strokeStyle",
    "lineCap",
    "lineJoin",
    "cursor",
    "id",
    "className",
    "htmlFor",
    "type",
]);
const GENERIC_FONT_FAMILIES = new Set([
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
    "ui-rounded",
    "emoji",
    "math",
]);
// An interpolated template literal is only safe to auto-wrap with __hlT when it is
// re-evaluated after the runtime provider is ready, i.e. inside a function/render
// scope. Module-scope wrapping would run once at import time (before the bundle
// loads) and never react to locale changes, so we leave those untouched.
function isInFunctionScope(node) {
    let p = node.parent;
    while (p) {
        if (ts.isFunctionDeclaration(p) ||
            ts.isFunctionExpression(p) ||
            ts.isArrowFunction(p) ||
            ts.isMethodDeclaration(p) ||
            ts.isConstructorDeclaration(p) ||
            ts.isGetAccessorDeclaration(p) ||
            ts.isSetAccessorDeclaration(p)) {
            return true;
        }
        if (ts.isSourceFile(p))
            return false;
        p = p.parent;
    }
    return false;
}
// Interpolated template literal in a value position we can auto-wrap. Excludes JSX
// child/attribute positions (handled by rules 1b/3), nested template spans, tagged
// templates (styled/css/gql), computed keys, type literals, and non-UI callees.
function isExtractableTemplatePosition(node) {
    const parent = node.parent;
    if (!parent)
        return false;
    if (ts.isJsxExpression(parent))
        return false; // JSX child or attribute -> rules 1b/3
    if (ts.isTaggedTemplateExpression(parent))
        return false; // styled``, css``, gql``
    // Nested inside another template's ${...} (directly or via an expression like a
    // ternary). The enclosing template already captures this text verbatim, so
    // wrapping here would produce overlapping replacements.
    for (let p = parent; p && !ts.isSourceFile(p); p = p.parent) {
        if (ts.isTemplateExpression(p) || ts.isTemplateSpan(p))
            return false;
    }
    if (ts.isComputedPropertyName(parent))
        return false;
    if (ts.isLiteralTypeNode(parent))
        return false;
    if (ts.isCaseClause(parent))
        return false;
    if ((ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.expression) {
        const callee = callName(parent.expression);
        if (callee && DENY_CALLEES.has(callee))
            return false;
    }
    return true;
}
/**
 * Walk a single TS/TSX source file and return every translatable string hit,
 * with the metadata needed both for extraction and for Vite auto-wrapping.
 */
export function identifyHits(sourceText, options) {
    const { fileName } = options;
    const overrides = options.contextOverrides ?? {};
    const translationFns = new Set([
        ...DEFAULT_TRANSLATION_FNS,
        ...(options.translationFunctionNames ?? []),
    ]);
    const objectFields = new Set(options.objectFields ?? []);
    const scriptKind = fileName.endsWith(".tsx")
        ? ts.ScriptKind.TSX
        : fileName.endsWith(".jsx")
            ? ts.ScriptKind.JSX
            : fileName.endsWith(".mts") || fileName.endsWith(".ts")
                ? ts.ScriptKind.TS
                : ts.ScriptKind.TSX;
    const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, scriptKind);
    const hits = [];
    const lineFor = (node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    const push = (rawText, shape, kind, purpose, line, wrap) => {
        const text = normalizeText(rawText);
        if (!isProbablyTranslatable(text))
            return;
        const override = overrides[text];
        hits.push({
            text,
            shape: override?.shape ?? shape,
            purpose: override?.purpose ?? purpose,
            visualContext: override?.visualContext ?? "",
            kind,
            line,
            wrap,
        });
    };
    const pushTemplate = (tmpl, shape, kind, purpose, start, end, line, jsx) => {
        if (!hasWordsOutsidePlaceholders(tmpl.raw))
            return; // e.g. just `${count}`
        // Auto-wrapping inserts __hlT into code; never wrap technical strings (URLs,
        // cookies, query params) — a translator could mangle them and break runtime.
        if (looksTechnical(tmpl.raw))
            return;
        const text = normalizeText(tmpl.raw);
        if (!isProbablyTranslatable(text))
            return;
        const override = overrides[text];
        hits.push({
            text,
            shape: override?.shape ?? shape,
            purpose: override?.purpose ?? purpose,
            visualContext: override?.visualContext ?? "",
            kind,
            line,
            wrap: { type: "template", start, end, values: tmpl.values, jsx },
        });
    };
    const visit = (node) => {
        // 1) JSX element children: plain text -> jsx-text, inline markup -> jsx-trans.
        if (ts.isJsxElement(node)) {
            const tag = jsxTagName(node.openingElement);
            const info = jsxElementInfo(tag);
            if (info) {
                const text = pureTextChildren(node.children);
                if (text !== null) {
                    push(text, info.shape, info.kind, info.purpose, lineFor(node), {
                        type: "jsx-text",
                        start: node.openingElement.getEnd(),
                        end: node.closingElement.getStart(),
                    });
                }
                else {
                    const rich = buildJsxMessage(node, sourceFile);
                    if (rich && rich.hasElements) {
                        push(rich.message, info.shape, `${info.kind}-rich`, info.purpose, lineFor(node), {
                            type: "jsx-trans",
                            start: node.getStart(sourceFile),
                            end: node.getEnd(),
                            componentTexts: rich.componentTexts,
                            valueNames: rich.valueNames,
                        });
                        // The message + components consume this subtree; do not descend so we
                        // don't double-extract the inline children.
                        return;
                    }
                }
            }
        }
        // 1b) Interpolated template literal as a JSX child:
        //     <span>{`${count} unlocked`}</span> -> {__hlT("{count} unlocked", { count })}
        if (ts.isJsxExpression(node) &&
            node.expression &&
            ts.isTemplateExpression(node.expression) &&
            node.parent &&
            (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
            const tmpl = buildTemplateMessage(node.expression, sourceFile);
            pushTemplate(tmpl, "body", "jsx-text-interpolated", "interpolated UI text rendered inline", node.getStart(sourceFile), node.getEnd(), lineFor(node), true);
        }
        // 2) Data-driven object-field string literals (extraction-only; applied at
        //    runtime by the DOM injector since wrapping at definition would be stale).
        if (ts.isPropertyAssignment(node)) {
            const name = propertyName(node.name);
            if (name && objectFields.has(name)) {
                const value = stringLiteralValue(node.initializer);
                if (value !== null) {
                    push(value, "body", `data-field:${name}`, "data-driven UI text rendered dynamically from app data", lineFor(node), { type: "none" });
                }
            }
        }
        // 3) JSX attribute string literals on known props. Handles both
        //    placeholder="x" and placeholder={"x"} / placeholder={`x`}; skips dynamic
        //    expression initializers.
        if (ts.isJsxAttribute(node)) {
            const info = propShapes[node.name.getText()];
            const init = node.initializer;
            if (info && init) {
                if (ts.isStringLiteral(init)) {
                    push(init.text, info.shape, info.kind, info.purpose, lineFor(node), {
                        type: "jsx-attribute",
                        valueStart: init.getStart(sourceFile),
                        valueEnd: init.getEnd(),
                    });
                }
                else if (ts.isJsxExpression(init) && init.expression) {
                    if (ts.isTemplateExpression(init.expression)) {
                        // placeholder={`Hello ${name}`} -> placeholder={__hlT("Hello {name}", { name })}
                        const tmpl = buildTemplateMessage(init.expression, sourceFile);
                        pushTemplate(tmpl, info.shape, info.kind, info.purpose, init.getStart(sourceFile), init.getEnd(), lineFor(node), true);
                    }
                    else {
                        const value = stringLiteralValue(init.expression);
                        if (value !== null) {
                            // Replace the whole {"x"} expression container with {__hlT("x")}.
                            push(value, info.shape, info.kind, info.purpose, lineFor(node), {
                                type: "jsx-attribute",
                                valueStart: init.getStart(sourceFile),
                                valueEnd: init.getEnd(),
                            });
                        }
                    }
                }
            }
        }
        // 4) Existing runtime translation calls: extract for key coverage, never re-wrap.
        if (ts.isCallExpression(node)) {
            const name = callName(node.expression);
            if (name && translationFns.has(name)) {
                const value = stringLiteralValue(node.arguments[0]);
                if (value !== null) {
                    push(value, "body", "translation-call", "source string passed to the runtime translation helper", lineFor(node), { type: "none" });
                }
            }
        }
        // 5) Recall pass: any translatable string literal in a value position. These
        //    cannot be safely auto-wrapped (definition site may be module scope), so
        //    they are extraction-only and applied at runtime by the DOM injector.
        if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
            isExtractableValueLiteral(node)) {
            // Object values for known fields are already emitted by rule 2; don't dup.
            const parent = node.parent;
            const fieldName = ts.isPropertyAssignment(parent) && parent.initializer === node
                ? propertyName(parent.name)
                : null;
            if (!(fieldName && objectFields.has(fieldName)) && !looksTechnical(node.text)) {
                push(node.text, "body", "value-literal", "UI text in a value position, applied at runtime by the DOM injector", lineFor(node), { type: "none" });
            }
        }
        // 5b) Interpolated template literals in value positions (helpers, message
        //     setters, ternaries). Auto-wrapped with __hlT only inside a function
        //     scope so they stay reactive and never run before the bundle loads.
        if (ts.isTemplateExpression(node) &&
            isExtractableTemplatePosition(node) &&
            isInFunctionScope(node)) {
            const tmpl = buildTemplateMessage(node, sourceFile);
            pushTemplate(tmpl, "body", "value-interpolated", "interpolated UI text built in a value position", node.getStart(sourceFile), node.getEnd(), lineFor(node), false);
        }
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return hits;
}
function buildTransElement(hit, message) {
    const components = `[${hit.componentTexts.join(", ")}]`;
    const uniqueValues = [...new Set(hit.valueNames)];
    const values = uniqueValues.length > 0 ? ` values={{ ${uniqueValues.join(", ")} }}` : "";
    return `<Trans message={${JSON.stringify(message)}} components={${components}}${values} />`;
}
/**
 * Build-time auto-wrap for TS/React source. Rewrites:
 *  - JSX text children      -> {__hlT("...")}
 *  - known attribute values -> attr={__hlT("...")}
 *  - inline-markup children -> <Trans message="<0>..</0>" components={[...]} />
 * Returns null when nothing needs wrapping. The required runtime imports are
 * returned so the caller (Vite plugin) can inject a single import statement.
 */
export function transformSource(sourceText, options) {
    if (sourceText.includes(IMPORT_MARKER))
        return null; // already processed
    const hits = identifyHits(sourceText, options);
    const replacements = [];
    const imports = new Set();
    for (const hit of hits) {
        if (hit.wrap.type === "jsx-text") {
            replacements.push({
                start: hit.wrap.start,
                end: hit.wrap.end,
                text: `{__hlT(${JSON.stringify(hit.text)})}`,
            });
            imports.add("__hlT");
        }
        else if (hit.wrap.type === "jsx-attribute") {
            replacements.push({
                start: hit.wrap.valueStart,
                end: hit.wrap.valueEnd,
                text: `{__hlT(${JSON.stringify(hit.text)})}`,
            });
            imports.add("__hlT");
        }
        else if (hit.wrap.type === "template") {
            const parts = hit.wrap.values.map((v) => v.name === v.expr ? v.name : `${v.name}: ${v.expr}`);
            const valuesArg = parts.length > 0 ? `, { ${parts.join(", ")} }` : "";
            const call = `__hlT(${JSON.stringify(hit.text)}${valuesArg})`;
            replacements.push({
                start: hit.wrap.start,
                end: hit.wrap.end,
                text: hit.wrap.jsx ? `{${call}}` : call,
            });
            imports.add("__hlT");
        }
        else if (hit.wrap.type === "jsx-trans") {
            replacements.push({
                start: hit.wrap.start,
                end: hit.wrap.end,
                text: buildTransElement(hit.wrap, hit.text),
            });
            imports.add("Trans");
        }
    }
    if (replacements.length === 0)
        return null;
    // Apply back-to-front so earlier offsets stay valid.
    replacements.sort((a, b) => b.start - a.start);
    let code = sourceText;
    for (const r of replacements) {
        code = code.slice(0, r.start) + r.text + code.slice(r.end);
    }
    return { code, imports: [...imports] };
}
export { IMPORT_MARKER };
