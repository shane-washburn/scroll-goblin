import ts from "typescript";
import { buildJsxMessage } from "./jsxMessage.js";
import { jsxElementInfo, isInlineTextTag } from "./shapes.js";
import { buildTemplateMessage } from "./templateMessage.js";
import { propShapes } from "../../core/shapes.js";
import { isProbablyTranslatable, looksTechnical, normalizeText } from "../../core/text.js";
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
function stringLiteralWrap(node, sourceFile) {
    if (!node)
        return null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        return {
            text: node.text,
            start: node.getStart(sourceFile),
            end: node.getEnd(),
        };
    }
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
// Detect JSX children that interleave human-readable words with a DYNAMIC value
// (a `{expression}` sibling, or a value rendered imperatively through a child that
// carries a ref / event handler) yet produce NO single translatable message:
// pureTextChildren rejects the dynamic part, buildJsxMessage only emits a <Trans>
// when there is inline *markup* (a text-bearing element), and ref/handler children
// are deliberately left unwrapped. The static words are then orphaned — never
// extracted, never translated — and their order can't be localized. The only
// correct fix is a hand-authored ICU message: t("Age {n} mo", { n }). We surface
// these as actionable "required" diagnostics instead of silently dropping them.
// Returns the synthesized message (with {placeholders}) and whether a ref/handler
// value is involved (so the hint can call out the ref -> React state change).
function detectManualTNeed(children) {
    let out = "";
    let sawWords = false;
    let sawDynamic = false;
    let refDriven = false;
    let anon = 0;
    const anonName = () => {
        anon += 1;
        return anon === 1 ? "value" : `value${anon}`;
    };
    const exprName = (expr) => {
        if (ts.isIdentifier(expr))
            return expr.text;
        if (ts.isPropertyAccessExpression(expr))
            return expr.name.text;
        return anonName();
    };
    for (const child of children) {
        if (ts.isJsxText(child)) {
            out += child.text;
            if (/\p{L}/u.test(child.text))
                sawWords = true;
            continue;
        }
        if (ts.isJsxExpression(child)) {
            if (!child.expression)
                continue; // {/* comment */}
            const literal = stringLiteralValue(child.expression);
            if (literal !== null) {
                out += literal;
                if (/\p{L}/u.test(literal))
                    sawWords = true;
                continue;
            }
            out += `{${exprName(child.expression)}}`;
            sawDynamic = true;
            continue;
        }
        if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
            const opening = ts.isJsxElement(child) ? child.openingElement : child;
            if (!isInlineTextTag(jsxTagName(opening)))
                return null; // layout/component -> too complex
            let refName = null;
            let behavioral = false;
            for (const attr of opening.attributes.properties) {
                if (ts.isJsxSpreadAttribute(attr)) {
                    behavioral = true; // {...props} may carry a ref/handler
                    continue;
                }
                if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name)) {
                    const attrName = attr.name.text;
                    if (attrName === "ref") {
                        behavioral = true;
                        const init = attr.initializer;
                        if (init && ts.isJsxExpression(init) && init.expression && ts.isIdentifier(init.expression)) {
                            refName = init.expression.text.replace(/Ref$/, "") || null;
                        }
                    }
                    else if (/^on[A-Z]/.test(attrName)) {
                        behavioral = true;
                    }
                }
            }
            // An inline element with its own text and NO ref/handler is genuine markup
            // (e.g. <a>here</a>): that is buildJsxMessage/<Trans>'s job, not manual t().
            if (!behavioral)
                return null;
            out += `{${refName ?? anonName()}}`;
            sawDynamic = true;
            refDriven = true;
            continue;
        }
        return null; // fragment/other -> bail
    }
    const message = normalizeText(out);
    if (!sawWords || !sawDynamic || !message)
        return null;
    if (!/\{[A-Za-z0-9_]+\}/.test(message))
        return null; // need at least one placeholder
    if (looksTechnical(message))
        return null;
    return { message, refDriven };
}
function callName(node) {
    if (ts.isIdentifier(node))
        return node.text;
    if (ts.isPropertyAccessExpression(node))
        return node.name.text;
    return null;
}
// CanvasRenderingContext2D text-drawing methods. Their first argument is text
// painted to a <canvas> — there is no DOM node, so it can only be translated by
// wrapping the argument at build time (the DOM injector can never reach it).
const CANVAS_TEXT_METHODS = new Set(["fillText", "strokeText"]);
// True when `node` is the text (first) argument of a canvas fillText/strokeText
// call, e.g. ctx.fillText("HOME", x, y) or this.c.strokeText(`Age ${n}`, ...).
function isCanvasTextArg(node) {
    const parent = node.parent;
    if (!parent || !ts.isCallExpression(parent))
        return false;
    if (parent.arguments[0] !== node)
        return false;
    return (ts.isPropertyAccessExpression(parent.expression) &&
        CANVAS_TEXT_METHODS.has(parent.expression.name.text));
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
    if (ts.isJsxExpression(parent))
        return false; // JSX child/attribute expressions are handled by JSX rules
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
    // A string literal interpolated directly into a template — `${"Righty"}` — is real
    // UI text the surrounding template would otherwise hide, so allow it (wrap:"none").
    // Literals nested deeper inside a template-embedded expression (e.g. a ternary in
    // `${cond ? "A" : "B"}`) stay excluded: too ambiguous to attribute to UI safely.
    const directTemplateSpanLiteral = ts.isTemplateSpan(parent) && parent.expression === node;
    if (!directTemplateSpanLiteral) {
        for (let p = parent; p && !ts.isSourceFile(p); p = p.parent) {
            if (ts.isTemplateExpression(p) || ts.isTemplateSpan(p))
                return false;
        }
    }
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
// Sub-classify a value-position literal by HOW it is used, so diagnostics can
// triage severity (only the adapter sees the AST position). "logic" = compared
// in a branch (program logic, not UI copy); "assign" = stored on a property;
// "call" = passed to a function; "value" = plain holder (array/object value,
// return, variable init, ternary branch) — most likely real UI text.
function valueLiteralRole(node) {
    const parent = node.parent;
    if (parent && ts.isBinaryExpression(parent)) {
        const op = parent.operatorToken.kind;
        if (op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
            op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
            op === ts.SyntaxKind.EqualsEqualsToken ||
            op === ts.SyntaxKind.ExclamationEqualsToken ||
            op === ts.SyntaxKind.LessThanToken ||
            op === ts.SyntaxKind.GreaterThanToken ||
            op === ts.SyntaxKind.LessThanEqualsToken ||
            op === ts.SyntaxKind.GreaterThanEqualsToken) {
            return "logic";
        }
        if (op === ts.SyntaxKind.EqualsToken && parent.right === node)
            return "assign";
    }
    if (parent && (ts.isCallExpression(parent) || ts.isNewExpression(parent)))
        return "call";
    return "value";
}
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
    // A rich (jsx-trans) message such as "Squeezes: <0>{count}</0>" can only be
    // applied by the build-time <Trans> component. Content-match consumers (the
    // DOM injector) see the static label as its own standalone text node, so we
    // also extract each string-literal segment (e.g. {"Squeezes"}) as an
    // extraction-only hit. These carry no wrap target, so they never participate
    // in the source transform and cannot conflict with the <Trans> replacement.
    const collectRichLiteralSegments = (children) => {
        for (const child of children) {
            if (ts.isJsxExpression(child) && child.expression) {
                const literal = stringLiteralValue(child.expression);
                if (literal !== null && !looksTechnical(literal)) {
                    push(literal, "body", "value-literal", "UI text in a value position, applied at runtime by the DOM injector", lineFor(child), { type: "none" });
                }
            }
            else if (ts.isJsxElement(child)) {
                collectRichLiteralSegments(child.children);
            }
        }
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
                        // Also extract the static string-literal segments so content-match
                        // consumers can translate the standalone label text nodes.
                        collectRichLiteralSegments(node.children);
                        // The message + components consume this subtree; do not descend so we
                        // don't double-extract the inline children.
                        return;
                    }
                    // No <Trans> emitted. If the children interleave human words with a
                    // dynamic value (a {expr} sibling or a ref/handler-driven child), there
                    // is no single translatable message and the words are orphaned. Surface
                    // it as a "required" manual-t() diagnostic (extraction-only, never wrapped).
                    const manual = detectManualTNeed(node.children);
                    if (manual) {
                        push(manual.message, info.shape, manual.refDriven ? "manual-t:ref-adjacent" : "manual-t:interpolation", info.purpose, lineFor(node), { type: "none" });
                    }
                    // buildJsxMessage bailed (e.g. a layout container mixing a non-inline
                    // element with a literal child: <div><Sparkles/>{"Divine Oracle"}</div>).
                    // Neither pure-text nor the rich path captured it, and rule 5 defers all
                    // JSX-expression literals to "the JSX rules" — so the label is orphaned.
                    // Salvage the DIRECT string-literal expression children here as runtime-DOM
                    // text (wrap:"none"); nested elements are still visited by forEachChild.
                    for (const child of node.children) {
                        if (ts.isJsxExpression(child) && child.expression) {
                            const literal = stringLiteralValue(child.expression);
                            if (literal !== null && !looksTechnical(literal)) {
                                push(literal, info.shape, "jsx-expr-text", info.purpose, lineFor(child), {
                                    type: "none",
                                });
                            }
                        }
                    }
                }
            }
        }
        // 1a) Fragments (<>…</>) have no tag, so the element rules above skip them.
        //     When one groups a non-inline element with a literal child
        //     (<><Check/>{"Link copied!"}</>), salvage the direct string-literal
        //     expression children as runtime-DOM text (wrap:"none"). Nested elements are
        //     still visited; the literals' StringLiteral nodes are excluded by rule 5.
        if (ts.isJsxFragment(node)) {
            for (const child of node.children) {
                if (ts.isJsxExpression(child) && child.expression) {
                    const literal = stringLiteralValue(child.expression);
                    if (literal !== null && !looksTechnical(literal)) {
                        push(literal, "body", "jsx-expr-text", "inline UI text rendered as a DOM text node", lineFor(child), {
                            type: "none",
                        });
                    }
                }
            }
            const manual = detectManualTNeed(node.children);
            if (manual) {
                push(manual.message, "body", manual.refDriven ? "manual-t:ref-adjacent" : "manual-t:interpolation", "inline UI text rendered as a DOM text node", lineFor(node), { type: "none" });
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
        // 2) Data-driven object-field string literals. These are rewritten as lazy
        //    getters so module-scope data does not freeze before the bundle loads.
        if (ts.isPropertyAssignment(node)) {
            const name = propertyName(node.name);
            if (name && objectFields.has(name)) {
                const value = stringLiteralWrap(node.initializer, sourceFile);
                if (value !== null) {
                    push(value.text, "body", `data-field:${name}`, "data-driven UI text rendered dynamically from app data", lineFor(node), {
                        type: "object-getter",
                        start: node.getStart(sourceFile),
                        end: node.getEnd(),
                        name: node.name.getText(sourceFile),
                    });
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
        // 6) Canvas text: ctx.fillText("HOME", ...) / strokeText(...). The string is
        //    painted to a <canvas>, so it has no DOM node and the injector can never
        //    reach it; the only way to translate it is to wrap the literal argument
        //    with __hlT at build time. Interpolated canvas text (`Age ${n}`) is
        //    covered by rule 5b's template wrap.
        if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
            isCanvasTextArg(node) &&
            !looksTechnical(node.text)) {
            push(node.text, "body", "canvas-text", "text painted to a <canvas>, wrapped with __hlT at build time", lineFor(node), { type: "call-arg", valueStart: node.getStart(sourceFile), valueEnd: node.getEnd() });
        }
        // 5) Recall pass: any translatable string literal in a value position.
        //    EXTRACTION-ONLY. A value-position literal is indistinguishable from a
        //    logic/config value (e.g. `mode === "big"`, `fish.behavior = "aggressive"`,
        //    `return { size: "small" }`), so auto-wrapping it with __hlT would make the
        //    running program compare against / store the *translated* string in a
        //    non-source locale, silently breaking branches and config lookups. Genuine
        //    UI text in these positions is still translated at runtime by the DOM
        //    injector (content match); canvas text is wrapped by rule 6 and
        //    interpolations by rule 5b. So these stay wrap:"none" and never alter source.
        if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
            isExtractableValueLiteral(node) &&
            !isCanvasTextArg(node)) {
            // Object values for known fields are already emitted by rule 2; don't dup.
            const parent = node.parent;
            const fieldName = ts.isPropertyAssignment(parent) && parent.initializer === node
                ? propertyName(parent.name)
                : null;
            if (!(fieldName && objectFields.has(fieldName)) && !looksTechnical(node.text)) {
                const role = valueLiteralRole(node);
                push(node.text, "body", role === "value" ? "value-literal" : `value-literal:${role}`, "UI text in a value position", lineFor(node), { type: "none" });
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
        else if (hit.wrap.type === "call-arg") {
            // Replace a bare call argument (e.g. canvas fillText("HOME")) with a
            // __hlT(...) call. No JSX braces — this is an ordinary expression position.
            replacements.push({
                start: hit.wrap.valueStart,
                end: hit.wrap.valueEnd,
                text: `__hlT(${JSON.stringify(hit.text)})`,
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
        else if (hit.wrap.type === "value") {
            replacements.push({
                start: hit.wrap.start,
                end: hit.wrap.end,
                text: `__hlT(${JSON.stringify(hit.text)})`,
            });
            imports.add("__hlT");
        }
        else if (hit.wrap.type === "object-getter") {
            replacements.push({
                start: hit.wrap.start,
                end: hit.wrap.end,
                text: `get ${hit.wrap.name}() { return __hlT(${JSON.stringify(hit.text)}); }`,
            });
            imports.add("__hlT");
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
