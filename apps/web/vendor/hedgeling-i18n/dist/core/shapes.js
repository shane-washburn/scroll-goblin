export const SHAPES = [
    "button",
    "header",
    "body",
    "link",
    "label",
    "placeholder",
    "tooltip",
    "alert",
];
export function clampShape(shape, fallback = "body") {
    if (typeof shape === "string" && SHAPES.includes(shape)) {
        return shape;
    }
    return fallback;
}
// JSX/HTML attribute names that carry translatable text.
export const propShapes = {
    "aria-label": {
        shape: "label",
        kind: "aria-label",
        purpose: "accessibility label for an interactive or visual element",
    },
    alt: {
        shape: "label",
        kind: "alt-text",
        purpose: "alternative text for an image or visual element",
    },
    label: {
        shape: "label",
        kind: "component-label",
        purpose: "label passed to a UI component",
    },
    placeholder: {
        shape: "placeholder",
        kind: "placeholder",
        purpose: "placeholder text shown inside an input before the user enters content",
    },
    title: {
        shape: "tooltip",
        kind: "title-attribute",
        purpose: "tooltip text shown for additional context",
    },
    buttonLabel: {
        shape: "button",
        kind: "component-button-label",
        purpose: "button label passed to a UI component",
    },
    blurb: {
        shape: "body",
        kind: "component-blurb",
        purpose: "short descriptive copy passed to a UI component",
    },
};
