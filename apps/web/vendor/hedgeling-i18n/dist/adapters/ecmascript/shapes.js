// JSX-element shape heuristics. These map component/intrinsic tag names to a
// translatable shape + purpose. They live in the React/TS adapter because the
// tag vocabulary (and known component names like PrimaryButton) is framework
// specific; the neutral shape vocabulary stays in core/shapes.ts.
export function jsxElementInfo(tag) {
    if (tag === "button" ||
        tag === "Button" ||
        tag === "PrimaryButton" ||
        tag === "SecondaryButton") {
        return {
            shape: "button",
            kind: "button-text",
            purpose: "button text for an action the user can take",
        };
    }
    if (tag === "a" || tag === "Link") {
        return { shape: "link", kind: "link-text", purpose: "link text for navigation" };
    }
    if (/^h[1-6]$/i.test(tag)) {
        return {
            shape: "header",
            kind: "heading-text",
            purpose: "heading text for a page or UI section",
        };
    }
    if (tag === "label") {
        return {
            shape: "label",
            kind: "label-text",
            purpose: "label for a form control or UI value",
        };
    }
    if (tag === "li") {
        return { shape: "body", kind: "list-item-text", purpose: "body copy shown as a list item" };
    }
    if (tag === "p") {
        return { shape: "body", kind: "paragraph-text", purpose: "body copy shown in the user interface" };
    }
    if (tag === "div" || tag === "span") {
        return { shape: "body", kind: `${tag}-text`, purpose: "body copy shown in the user interface" };
    }
    return null;
}
export function isInlineTextTag(tag) {
    return [
        "a",
        "abbr",
        "b",
        "br",
        "cite",
        "code",
        "del",
        "em",
        "i",
        "ins",
        "kbd",
        "mark",
        "q",
        "s",
        "small",
        "span",
        "strong",
        "sub",
        "sup",
        "time",
        "u",
        "wbr",
    ].includes(tag);
}
