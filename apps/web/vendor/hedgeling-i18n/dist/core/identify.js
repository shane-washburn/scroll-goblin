import ts from "typescript";
import { buildJsxMessage } from "./jsxMessage.js";
import { jsxElementInfo, propShapes } from "./shapes.js";
import { isProbablyTranslatable, normalizeText } from "./text.js";
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
        // 3) JSX attribute string literals on known props.
        if (ts.isJsxAttribute(node)) {
            const info = propShapes[node.name.getText()];
            if (info && node.initializer) {
                const value = stringLiteralValue(node.initializer);
                // Only wrap direct string-literal initializers (placeholder="x"); skip
                // expression initializers that are already dynamic.
                if (value !== null && ts.isStringLiteral(node.initializer)) {
                    push(value, info.shape, info.kind, info.purpose, lineFor(node), {
                        type: "jsx-attribute",
                        valueStart: node.initializer.getStart(sourceFile),
                        valueEnd: node.initializer.getEnd(),
                    });
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
