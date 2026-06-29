import ts from "typescript";
// Prefer the variable's own name for the placeholder (Lingui-style); fall back to
// the trailing identifier of a property access. Anything else is positional.
function deriveName(expr) {
    if (ts.isIdentifier(expr))
        return expr.text;
    if (ts.isPropertyAccessExpression(expr))
        return expr.name.text;
    return null;
}
/**
 * Convert a TemplateExpression (`\`${count} unlocked\``) into a translatable
 * message ("{count} unlocked") plus the values needed to reconstruct it at
 * runtime. Identical expressions collapse to a single placeholder; name
 * collisions (or non-identifier expressions) fall back to positional names.
 */
export function buildTemplateMessage(node, sourceFile) {
    const values = [];
    const byExpr = new Map();
    const used = new Set();
    let positional = 0;
    let raw = node.head.text;
    for (const span of node.templateSpans) {
        const exprText = span.expression.getText(sourceFile);
        let name = byExpr.get(exprText) ?? null;
        if (name === null) {
            const derived = deriveName(span.expression);
            if (derived && !used.has(derived)) {
                name = derived;
            }
            else {
                do {
                    name = `value${positional++}`;
                } while (used.has(name));
            }
            used.add(name);
            byExpr.set(exprText, name);
            values.push({ name, expr: exprText });
        }
        raw += `{${name}}${span.literal.text}`;
    }
    return { raw, values };
}
