import { isProbablyTranslatable, looksTechnical, normalizeText } from "../../core/text.js";
import { lexCSharpStrings } from "./lexer.js";
// Generic shape for a surviving literal whose code position we don't specifically
// recognise — extraction-only, so the AI/classification step refines it later.
const DEFAULT_SHAPE = {
    shape: "body",
    kind: "csharp-string",
    purpose: "string literal that appears to be user-facing copy",
};
// Object/member/initializer property names whose assigned string is UI copy.
// Matches `label.Text = "..."`, `new Button { Content = "..." }`, WPF/WinForms/
// MAUI/Unity control properties, etc. Comparison operators (==, !=, >=) never
// match because the regex anchors a single `=` directly after the identifier.
const PROP_SHAPES = {
    Text: { shape: "body", kind: "csharp-text", purpose: "text displayed to the user in a UI control" },
    text: { shape: "body", kind: "csharp-unity-text", purpose: "text displayed to the user (Unity UI/TMP)" },
    Content: { shape: "body", kind: "csharp-content", purpose: "content shown in a UI control (e.g. a button or label)" },
    Header: { shape: "header", kind: "csharp-header", purpose: "header text of a UI control or group" },
    HeaderText: { shape: "header", kind: "csharp-header", purpose: "header text of a column or control" },
    Title: { shape: "header", kind: "csharp-title", purpose: "title shown in a window, dialog, or control" },
    Caption: { shape: "header", kind: "csharp-caption", purpose: "caption shown on a UI element" },
    ToolTip: { shape: "tooltip", kind: "csharp-tooltip", purpose: "tooltip text shown on hover for extra context" },
    ToolTipText: { shape: "tooltip", kind: "csharp-tooltip", purpose: "tooltip text shown on hover for extra context" },
    Watermark: { shape: "placeholder", kind: "csharp-watermark", purpose: "placeholder text shown inside an empty input" },
    PlaceholderText: {
        shape: "placeholder",
        kind: "csharp-placeholder",
        purpose: "placeholder text shown inside an empty input",
    },
    Placeholder: { shape: "placeholder", kind: "csharp-placeholder", purpose: "placeholder text shown inside an empty input" },
    Prompt: { shape: "placeholder", kind: "csharp-prompt", purpose: "prompt text guiding the user's input" },
    Label: { shape: "label", kind: "csharp-label", purpose: "label for an interactive or visual element" },
    GroupName: { shape: "label", kind: "csharp-group", purpose: "name of a group of related controls" },
    Message: { shape: "body", kind: "csharp-message", purpose: "message shown to the user" },
    Description: { shape: "body", kind: "csharp-description", purpose: "descriptive copy shown to the user" },
};
// Property-assignment / object-initializer position: `<Name> = "..."`.
const PROP_ASSIGN = /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*$/;
// Method-call positions whose first string argument is UI copy. Each entry pairs
// a regex matching the call opening (immediately before the literal) with a shape.
const CALL_RULES = [
    {
        pattern: /\bMessageBox\.Show(?:Async)?\s*\(\s*$/,
        info: { shape: "alert", kind: "csharp-messagebox", purpose: "message shown in a dialog box" },
    },
    {
        pattern: /\bConsole\.(?:WriteLine|Write)\s*\(\s*$/,
        info: { shape: "body", kind: "csharp-console", purpose: "text printed to the console for the user" },
    },
];
// Attribute positions: `[Display(Name = "...")]`, `[DisplayName("...")]`,
// `[Description("...")]`, `[Category("...")]`. These surface in UI via data
// annotations / property grids.
const ATTR_RULES = [
    {
        pattern: /\[(?:System\.ComponentModel\.DataAnnotations\.)?Display\s*\([^\])]*\b(?:Name|Prompt|GroupName|Description|ShortName)\s*=\s*$/,
        info: { shape: "label", kind: "csharp-display-attr", purpose: "display name shown for a model field" },
    },
    {
        pattern: /\[(?:System\.ComponentModel\.)?DisplayName\s*\(\s*$/,
        info: { shape: "label", kind: "csharp-displayname-attr", purpose: "display name shown for a member" },
    },
    {
        pattern: /\[(?:System\.ComponentModel\.)?Description\s*\(\s*$/,
        info: { shape: "body", kind: "csharp-description-attr", purpose: "description shown for a member or setting" },
    },
    {
        pattern: /\[(?:System\.ComponentModel\.)?Category\s*\(\s*$/,
        info: { shape: "label", kind: "csharp-category-attr", purpose: "category grouping shown in a property grid" },
    },
];
// Callee/method names whose string arguments are never user-facing copy:
// logging, diagnostics, reflection, parsing, config/storage access, and
// dictionary-key / string-comparison helpers. Matches the receiver-trailing
// member name (e.g. `_logger.LogInformation(` -> "LogInformation"). Deliberately
// EXCLUDES UI-bearing calls (MessageBox.Show, Console.Write[Line], StringBuilder
// Append/AppendLine, string.Format) so genuine copy is kept.
const DENY_CALLEES = new Set([
    // logging
    "Log", "LogInformation", "LogWarning", "LogError", "LogDebug", "LogTrace",
    "LogCritical", "LogFormat", "LogException", "Assert", "Fail",
    // reflection / metadata
    "GetType", "GetMethod", "GetProperty", "GetField", "GetCustomAttribute",
    "GetManifestResourceStream",
    // parsing
    "Parse", "TryParse",
    // config / environment / storage / dictionary keys
    "GetEnvironmentVariable", "SetEnvironmentVariable", "GetConnectionString",
    "GetSection", "GetValue", "ContainsKey", "TryGetValue", "GetValueOrDefault",
    // string comparison / matching (args are tokens, not prose)
    "StartsWith", "EndsWith", "Contains", "IndexOf", "LastIndexOf", "Equals",
    "CompareTo", "Compare", "CompareOrdinal", "IsMatch", "Matches", "Split",
]);
const CALLEE_BEFORE = /([A-Za-z_]\w*)\s*\(\s*$/;
// `Debug.Xxx(` / `Trace.Xxx(` — all diagnostics output, regardless of method name.
const DENY_DIAGNOSTICS = /\b(?:Debug|Trace)\s*\.\s*\w+\s*\(\s*$/;
// Diagnostic / IO / technical constructors whose string args are not UI copy.
const DENY_NEW = /\bnew\s+(?:[A-Za-z_][\w.]*Exception|Uri|Regex|Guid|TimeSpan|DateTime|DateTimeOffset|Version|CultureInfo|HttpClient|HttpRequestMessage|SqlCommand|SqlConnection|FileStream|StreamReader|StreamWriter|FileInfo|DirectoryInfo)\s*\(\s*$/;
// Technical attributes (routing, serialization, ORM, interop). UI attributes
// (Display/DisplayName/Description/Category) are intentionally absent so they are
// still extracted and shaped.
const DENY_ATTR = /\[(?:assembly\s*:\s*|module\s*:\s*)?(?:Route|Http(?:Get|Post|Put|Delete|Patch|Head|Options)|RegularExpression|RegEx|JsonProperty|JsonPropertyName|JsonInclude|JsonConverter|XmlElement|XmlAttribute|XmlRoot|XmlType|Column|Table|Key|ForeignKey|Index|InverseProperty|Bind|BindProperty|ProducesResponseType|Produces|Consumes|Authorize|DllImport|EditorBrowsable|DebuggerDisplay|TypeConverter|DefaultValue|TemplatePart)\s*\([^\])]*$/;
// Indexer / element access: `dict["key"]`, `row["col"]` — a lookup key, not copy.
const DENY_INDEXER = /[A-Za-z_)\]]\s*\[\s*$/;
// switch / goto case label: `case "x":` — a discriminant value, not copy.
const DENY_CASE = /\bcase\s+$/;
// True when the message has real words outside {name} placeholders, so a
// pure-substitution string like $"{count}" ("{count}") is not extracted.
function hasWordsOutsidePlaceholders(message) {
    return /\p{L}/u.test(message.replace(/\{[a-zA-Z0-9_]+\}/g, ""));
}
// A non-UI code position whose literal should be dropped before extraction.
function isDeniedPosition(before) {
    const call = CALLEE_BEFORE.exec(before);
    if (call && DENY_CALLEES.has(call[1]))
        return true;
    if (DENY_DIAGNOSTICS.test(before))
        return true;
    if (DENY_NEW.test(before))
        return true;
    if (DENY_ATTR.test(before))
        return true;
    if (DENY_INDEXER.test(before))
        return true;
    if (DENY_CASE.test(before))
        return true;
    return false;
}
// Assign a precise shape when the literal sits in a recognised UI position;
// otherwise fall back to the generic body shape (still extracted).
function classifyShape(before) {
    const propMatch = PROP_ASSIGN.exec(before);
    if (propMatch) {
        const info = PROP_SHAPES[propMatch[1]];
        if (info)
            return info;
    }
    for (const rule of CALL_RULES)
        if (rule.pattern.test(before))
            return rule.info;
    for (const rule of ATTR_RULES)
        if (rule.pattern.test(before))
            return rule.info;
    return DEFAULT_SHAPE;
}
export function identifyCSharpHits(source) {
    const hits = [];
    const lineFor = (index) => source.slice(0, index).split(/\r?\n/).length;
    for (const literal of lexCSharpStrings(source)) {
        const text = normalizeText(literal.value);
        // Layer 1 + 2: must look like human copy and not machine syntax.
        if (!isProbablyTranslatable(text))
            continue;
        if (looksTechnical(text))
            continue;
        if (literal.interpolated && !hasWordsOutsidePlaceholders(text))
            continue;
        // Layer 3: drop literals in non-UI code positions. 200 chars of preceding
        // source comfortably covers call/attribute/initializer prefixes.
        const before = source.slice(Math.max(0, literal.start - 200), literal.start);
        if (isDeniedPosition(before))
            continue;
        const info = classifyShape(before);
        hits.push({
            text,
            shape: info.shape,
            purpose: info.purpose,
            visualContext: "",
            kind: info.kind,
            line: lineFor(literal.start),
        });
    }
    return hits;
}
