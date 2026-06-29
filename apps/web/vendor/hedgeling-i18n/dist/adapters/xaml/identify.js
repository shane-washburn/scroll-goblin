import { isProbablyTranslatable, looksTechnical, normalizeText } from "../../core/text.js";
// Translatable attribute -> shape. Attribute names are matched case-sensitively
// (XAML is case-sensitive); namespaced forms like AutomationProperties.Name are
// included explicitly.
const ATTR_SHAPES = {
    Text: { shape: "body", kind: "xaml-text", purpose: "text shown to users in a XAML control" },
    Header: { shape: "header", kind: "xaml-header", purpose: "header text of a XAML control or group" },
    Title: { shape: "header", kind: "xaml-title", purpose: "title shown in a window or page" },
    Caption: { shape: "header", kind: "xaml-caption", purpose: "caption shown on a control" },
    ToolTip: { shape: "tooltip", kind: "xaml-tooltip", purpose: "tooltip shown on hover for extra context" },
    Watermark: { shape: "placeholder", kind: "xaml-watermark", purpose: "placeholder text shown inside an empty input" },
    PlaceholderText: {
        shape: "placeholder",
        kind: "xaml-placeholder",
        purpose: "placeholder text shown inside an empty input",
    },
    Description: { shape: "body", kind: "xaml-description", purpose: "descriptive copy shown to the user" },
    Label: { shape: "label", kind: "xaml-label", purpose: "label for an interactive or visual element" },
    "AutomationProperties.Name": {
        shape: "label",
        kind: "xaml-automation-name",
        purpose: "accessibility name for a control",
    },
    "AutomationProperties.HelpText": {
        shape: "tooltip",
        kind: "xaml-automation-help",
        purpose: "accessibility help text for a control",
    },
};
// `Content` is shape-resolved from the owning tag (a Button's content is a button
// label, a Label's is a label, etc.). Handled separately from ATTR_SHAPES.
function contentShape(tag) {
    const t = tag.toLowerCase();
    if (t.endsWith("button"))
        return { shape: "button", kind: "xaml-button-content", purpose: "button label" };
    if (t === "hyperlink" || t === "hyperlinkbutton")
        return { shape: "link", kind: "xaml-link-content", purpose: "hyperlink text" };
    if (t === "label")
        return { shape: "label", kind: "xaml-label-content", purpose: "label text" };
    return { shape: "body", kind: "xaml-content", purpose: "content shown in a XAML control" };
}
// Tags whose inline text content is user copy.
const TEXT_TAGS = new Set(["textblock", "run", "label", "textbox"]);
// A markup-extension value ("{Binding ...}", "{StaticResource ...}", "{x:Static
// ...}") is never copy. The "{}" prefix is XAML's literal-brace escape, so a value
// that begins with "{}" IS literal text.
function isMarkupExtension(value) {
    const v = value.trimStart();
    return v.startsWith("{") && !v.startsWith("{}");
}
function stripLiteralBraceEscape(value) {
    const v = value.trimStart();
    return v.startsWith("{}") ? v.slice(2) : value;
}
export function identifyXamlHits(source) {
    const hits = [];
    const lineFor = (index) => source.slice(0, index).split(/\r?\n/).length;
    const push = (rawText, info, index) => {
        const text = normalizeText(stripLiteralBraceEscape(rawText));
        if (!isProbablyTranslatable(text))
            return;
        if (looksTechnical(text))
            return;
        hits.push({ text, shape: info.shape, purpose: info.purpose, visualContext: "", kind: info.kind, line: lineFor(index) });
    };
    // Opening tags (incl. self-closing). Comments <!-- --> are skipped first.
    const withoutComments = source.replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length));
    const tagPattern = /<([A-Za-z_][\w.:]*)((?:[^>"']|"[^"]*"|'[^']*')*?)\/?>/g;
    const attrPattern = /([\w.:]+)\s*=\s*"([^"]*)"/g;
    for (const tagMatch of withoutComments.matchAll(tagPattern)) {
        const tag = tagMatch[1];
        const attrs = tagMatch[2] ?? "";
        const attrsOffset = (tagMatch.index ?? 0) + tagMatch[0].indexOf(attrs, tag.length + 1);
        for (const attrMatch of attrs.matchAll(attrPattern)) {
            const name = attrMatch[1];
            const value = attrMatch[2];
            if (isMarkupExtension(value))
                continue;
            const info = name === "Content" ? contentShape(tag) : ATTR_SHAPES[name];
            if (!info)
                continue;
            push(value, info, attrsOffset + (attrMatch.index ?? 0));
        }
    }
    // Inline text content for a few text-bearing elements: <TextBlock>Hello</TextBlock>.
    const textPattern = /<([A-Za-z_][\w.:]*)\b[^>]*>([^<]*\p{L}[^<]*)<\/\1>/giu;
    for (const match of withoutComments.matchAll(textPattern)) {
        if (!TEXT_TAGS.has(match[1].toLowerCase()))
            continue;
        push(match[2], { shape: "body", kind: `xaml-${match[1].toLowerCase()}-text`, purpose: "inline text shown to users in a XAML element" }, match.index ?? 0);
    }
    return hits;
}
