import ts from "typescript";
export type TemplateValue = {
    name: string;
    expr: string;
};
export type TemplateMessage = {
    raw: string;
    values: TemplateValue[];
};
/**
 * Convert a TemplateExpression (`\`${count} unlocked\``) into a translatable
 * message ("{count} unlocked") plus the values needed to reconstruct it at
 * runtime. Identical expressions collapse to a single placeholder; name
 * collisions (or non-identifier expressions) fall back to positional names.
 */
export declare function buildTemplateMessage(node: ts.TemplateExpression, sourceFile: ts.SourceFile): TemplateMessage;
