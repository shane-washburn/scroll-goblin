export declare const SHAPES: readonly ["button", "header", "body", "link", "label", "placeholder", "tooltip", "alert"];
export type Shape = (typeof SHAPES)[number];
export declare function clampShape(shape: unknown, fallback?: Shape): Shape;
export type ShapeInfo = {
    shape: Shape;
    kind: string;
    purpose: string;
};
export declare const propShapes: Record<string, ShapeInfo>;
