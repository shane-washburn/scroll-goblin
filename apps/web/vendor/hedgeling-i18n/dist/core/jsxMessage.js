import ts from "typescript";
import { normalizeText } from "./text.js";
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
                hasElements = true;
                const index = componentTexts.length;
                componentTexts.push(child.getText(sourceFile));
                if (ts.isJsxElement(child)) {
                    out += `<${index}>${serialize(child.children, depth + 1)}</${index}>`;
                }
                else {
                    out += `<${index}></${index}>`;
                }
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
    return { message, componentTexts, valueNames, hasElements };
}
