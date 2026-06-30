import ts from "typescript";
import { normalizeText } from "../../core/text.js";
import { isInlineTextTag } from "./shapes.js";
function elementTagName(node) {
    const opening = ts.isJsxElement(node) ? node.openingElement : node;
    const name = opening.tagName;
    if (ts.isIdentifier(name))
        return name.text;
    if (ts.isPropertyAccessExpression(name))
        return name.name.text;
    return name.getText();
}
// True when the message has human-readable text outside of <0>..</0> markers and
// {name} placeholders (so pure-structure wrappers like "<0>{icon}</0>" are skipped).
function hasTranslatableText(message) {
    const bare = message.replace(/<\/?\d+>/g, "").replace(/\{[a-zA-Z0-9_]+\}/g, "");
    return /\p{L}/u.test(bare);
}
function literalText(expr) {
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr))
        return expr.text;
    return null;
}
/**
 * Serialize a JSX element's children into a single translatable message that
 * preserves inline markup as indexed placeholders. Returns null when the content
 * is not safely serializable (deep nesting, complex expressions, fragments).
 *
 * Supports one level of inline element nesting (e.g. <a>, <strong>) whose own
 * children are text / {identifier} only.
 */
export function buildJsxMessage(node, sourceFile) {
    const componentTexts = [];
    const valueNames = [];
    let hasElements = false;
    let ok = true;
    const serialize = (children, depth) => {
        let out = "";
        for (const child of children) {
            if (!ok)
                break;
            if (ts.isJsxText(child)) {
                out += child.text;
                continue;
            }
            if (ts.isJsxExpression(child)) {
                if (!child.expression)
                    continue; // {/* comment */}
                const literal = literalText(child.expression);
                if (literal !== null) {
                    out += literal;
                }
                else if (ts.isIdentifier(child.expression)) {
                    valueNames.push(child.expression.text);
                    out += `{${child.expression.text}}`;
                }
                else {
                    ok = false; // complex expression -> not serializable
                }
                continue;
            }
            if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
                if (depth > 0) {
                    ok = false; // only one level of inline nesting supported
                    break;
                }
                // Only inline-formatting tags belong in a text-flow message; block tags
                // (h1, p, button, div, ...) mean this is a layout container, so bail and
                // let the caller extract the children individually.
                if (!isInlineTextTag(elementTagName(child))) {
                    ok = false;
                    break;
                }
                // Behavior-bearing elements must not be reconstructed by <Trans>: it
                // re-creates them via cloneElement and overrides their children, which
                // clobbers refs / imperative DOM updates (e.g. a game loop writing
                // textContent through a ref) and detaches event handlers. Bail so the
                // original JSX is left intact and the DOM injector translates instead.
                const attrs = ts.isJsxElement(child)
                    ? child.openingElement.attributes
                    : child.attributes;
                for (const attr of attrs.properties) {
                    if (ts.isJsxSpreadAttribute(attr)) {
                        ok = false; // {...props} may carry a ref/handler
                        break;
                    }
                    if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name)) {
                        const attrName = attr.name.text;
                        if (attrName === "ref" || /^on[A-Z]/.test(attrName)) {
                            ok = false;
                            break;
                        }
                    }
                }
                if (!ok)
                    break;
                const index = componentTexts.length;
                const inner = ts.isJsxElement(child) ? serialize(child.children, depth + 1) : "";
                // A captured component with no text/value content of its own is a
                // decorative element (icon, gradient layer, divider), not inline markup
                // wrapping text. <Trans> should not own it, so bail.
                if (!/\S/.test(inner)) {
                    ok = false;
                    break;
                }
                hasElements = true;
                componentTexts.push(child.getText(sourceFile));
                out += `<${index}>${inner}</${index}>`;
                continue;
            }
            ok = false; // fragments, etc.
        }
        return out;
    };
    const raw = serialize(node.children, 0);
    if (!ok)
        return null;
    const message = normalizeText(raw);
    if (!message)
        return null;
    // Skip pure-structure wrappers whose only words live inside placeholders/tags.
    if (!hasTranslatableText(message))
        return null;
    return { message, componentTexts, valueNames, hasElements };
}
