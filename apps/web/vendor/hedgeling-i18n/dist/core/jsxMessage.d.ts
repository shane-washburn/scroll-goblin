import ts from "typescript";
export type RichMessage = {
    message: string;
    componentTexts: string[];
    valueNames: string[];
    hasElements: boolean;
};
/**
 * Serialize a JSX element's children into a single translatable message that
 * preserves inline markup as indexed placeholders. Returns null when the content
 * is not safely serializable (deep nesting, complex expressions, fragments).
 *
 * Supports one level of inline element nesting (e.g. <a>, <strong>) whose own
 * children are text / {identifier} only.
 */
export declare function buildJsxMessage(node: ts.JsxElement, sourceFile: ts.SourceFile): RichMessage | null;
