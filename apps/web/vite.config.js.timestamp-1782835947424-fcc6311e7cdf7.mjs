// vite.config.js
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "file:///C:/Users/u1088292/CascadeProjects/scroll-goblin/node_modules/.pnpm/vite@5.4.21_@types+node@22.19.21/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/u1088292/CascadeProjects/scroll-goblin/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21_@types+node@22.19.21_/node_modules/@vitejs/plugin-react/dist/index.js";

// vendor/hedgeling-i18n/dist/core/config.js
import fs from "node:fs";
import path from "node:path";
var CONFIG_RELATIVE_PATH = path.join(".hedgeling", "extract.config.json");
var DEFAULT_CONFIG = {
  sourceLocale: "en-US",
  locales: [],
  scanRoots: ["src", "index.html"],
  outputDir: "apps/web/i18n",
  ignoredDirs: [".git", ".hedgeling", "build", "dist", "node_modules"],
  // Empty = derive scanned extensions from the enabled adapters (recommended).
  // Set explicitly to narrow scanning to a subset of those extensions.
  sourceExtensions: [],
  translationFunctionNames: ["t", "__hlT"],
  objectFields: [
    "title",
    "subtitle",
    "shortTitle",
    "heading",
    "subheading",
    "description",
    "label",
    "caption",
    "blurb",
    "cta",
    "message",
    "tooltip",
    "placeholder",
    "name",
    "text",
    "content",
    "summary",
    "body",
    "prompt",
    "question",
    "answer",
    "hint",
    "goal",
    "note",
    "card",
    "lesson",
    "error"
  ],
  contextOverrides: {},
  adapters: [],
  resourceFormats: [],
  resourceDir: "i18n/resources"
};
function asStringArray(value, fallback) {
  if (!Array.isArray(value))
    return fallback;
  const out = value.filter((item) => typeof item === "string");
  return out.length > 0 ? out : fallback;
}
function loadExtractConfig(workspaceRoot2) {
  const configPath = path.join(workspaceRoot2, CONFIG_RELATIVE_PATH);
  let parsed = {};
  try {
    parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    parsed = {};
  }
  const overrides = parsed.contextOverrides && typeof parsed.contextOverrides === "object" && !Array.isArray(parsed.contextOverrides) ? parsed.contextOverrides : DEFAULT_CONFIG.contextOverrides;
  return {
    sourceLocale: typeof parsed.sourceLocale === "string" ? parsed.sourceLocale : DEFAULT_CONFIG.sourceLocale,
    locales: asStringArray(parsed.locales, DEFAULT_CONFIG.locales),
    scanRoots: asStringArray(parsed.scanRoots, DEFAULT_CONFIG.scanRoots),
    outputDir: typeof parsed.outputDir === "string" ? parsed.outputDir : DEFAULT_CONFIG.outputDir,
    ignoredDirs: asStringArray(parsed.ignoredDirs, DEFAULT_CONFIG.ignoredDirs),
    sourceExtensions: asStringArray(parsed.sourceExtensions, DEFAULT_CONFIG.sourceExtensions),
    translationFunctionNames: asStringArray(parsed.translationFunctionNames, DEFAULT_CONFIG.translationFunctionNames),
    objectFields: asStringArray(parsed.objectFields, DEFAULT_CONFIG.objectFields),
    contextOverrides: overrides,
    adapters: asStringArray(parsed.adapters, DEFAULT_CONFIG.adapters),
    resourceFormats: asStringArray(parsed.resourceFormats, DEFAULT_CONFIG.resourceFormats),
    resourceDir: typeof parsed.resourceDir === "string" ? parsed.resourceDir : DEFAULT_CONFIG.resourceDir
  };
}

// vendor/hedgeling-i18n/dist/core/registry.js
import path2 from "node:path";
var registry = [];
function registerAdapter(adapter) {
  const existing = registry.findIndex((a) => a.name === adapter.name);
  if (existing >= 0)
    registry[existing] = adapter;
  else
    registry.push(adapter);
}
function getAdapters() {
  return registry;
}
function selectAdapters(names, adapters = registry) {
  if (!names || names.length === 0)
    return adapters;
  const wanted = new Set(names);
  return adapters.filter((a) => wanted.has(a.name));
}
function pickAdapter(fileName, adapters = registry) {
  const ext = path2.extname(fileName).toLowerCase();
  return adapters.find((adapter) => adapter.extensions.includes(ext)) ?? null;
}

// vendor/hedgeling-i18n/dist/adapters/ecmascript/identify.js
import ts3 from "file:///C:/Users/u1088292/CascadeProjects/scroll-goblin/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/typescript.js";

// vendor/hedgeling-i18n/dist/adapters/ecmascript/jsxMessage.js
import ts from "file:///C:/Users/u1088292/CascadeProjects/scroll-goblin/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/typescript.js";

// vendor/hedgeling-i18n/dist/core/text.js
function decodeHtmlEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"'
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) {
      const code = Number.parseInt(lower.slice(2), 16);
      return codePointOrOriginal(code, match);
    }
    if (lower.startsWith("#")) {
      const code = Number.parseInt(lower.slice(1), 10);
      return codePointOrOriginal(code, match);
    }
    return named[lower] ?? match;
  });
}
function codePointOrOriginal(code, original) {
  if (!Number.isFinite(code) || code < 0 || code > 1114111)
    return original;
  try {
    return String.fromCodePoint(code);
  } catch {
    return original;
  }
}
function normalizeText(source) {
  return decodeHtmlEntities(source).replace(/\s+/g, " ").trim();
}
var BARE_UTILITY_CLASSES = /* @__PURE__ */ new Set([
  "hidden",
  "block",
  "inline",
  "flex",
  "grid",
  "table",
  "contents",
  "none",
  "static",
  "fixed",
  "absolute",
  "relative",
  "sticky",
  "visible",
  "invisible",
  "collapse",
  "italic",
  "underline",
  "overline",
  "truncate",
  "uppercase",
  "lowercase",
  "capitalize",
  "antialiased",
  "container",
  "isolate",
  "group",
  "peer",
  "border",
  "rounded",
  "shadow",
  "ring",
  "outline",
  "transition",
  "transform",
  "grow",
  "shrink"
]);
function looksTechnical(raw) {
  const trimmed = raw.trim();
  if (/:\/\//.test(raw))
    return true;
  if (/[?&][\w-]*=/.test(raw))
    return true;
  if (/^\.\.?\//.test(trimmed))
    return true;
  if (/^[A-Za-z]:[\\/]/.test(trimmed))
    return true;
  if (/^\\\\[^\\]/.test(trimmed))
    return true;
  if (/^(?:[\w.\- ]+\\)+[\w.\- ]+$/.test(trimmed))
    return true;
  if (/^\s*(?:SELECT\b[\s\S]*\bFROM\b|INSERT\s+INTO\b|UPDATE\b[\s\S]*\bSET\b|DELETE\s+FROM\b|CREATE\s+(?:TABLE|INDEX|VIEW|DATABASE|PROCEDURE)\b|ALTER\s+TABLE\b|DROP\s+(?:TABLE|INDEX|VIEW|DATABASE)\b|TRUNCATE\s+TABLE\b)/i.test(trimmed)) {
    return true;
  }
  if (/^\(\s*[a-z-]+\s*:\s*[^)]+\)$/i.test(trimmed))
    return true;
  if (/^[A-Za-z][A-Za-z0-9]*(?:_[A-Za-z0-9]+)+$/.test(trimmed))
    return true;
  if (/-/.test(trimmed) && /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?$/.test(trimmed)) {
    return true;
  }
  if (trimmed.length >= 5 && /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/.test(trimmed)) {
    return true;
  }
  if (/#[0-9a-fA-F]{3,8}\b/.test(raw))
    return true;
  if (/^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(trimmed))
    return true;
  if (/^(?:application|text|image|audio|video|font|model|multipart)\/[a-z0-9.+-]+(?:\s*;\s*[a-z0-9.+=-]+)*$/i.test(trimmed)) {
    return true;
  }
  if (/^(?:Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific|Etc)\/[A-Za-z]+(?:[_/][A-Za-z]+)*$/.test(trimmed)) {
    return true;
  }
  if (/^(?:(?:normal|italic|oblique|bold|bolder|lighter|small-caps|\d{3})\s+)*\d+(?:\.\d+)?(?:px|pt|em|rem)\s+(?:['"]|serif\b|sans-serif\b|monospace\b|cursive\b|fantasy\b)/i.test(trimmed)) {
    return true;
  }
  const tokens = trimmed.split(/\s+/);
  const isSeparatedUtility = (t) => /^!?-?[a-z0-9]+(?:[-:/](?:\[[^\]]+\]|[a-z0-9.]+))+$/.test(t);
  const isUtilityClass = (t) => isSeparatedUtility(t) || BARE_UTILITY_CLASSES.has(t);
  if (tokens.length >= 2 && tokens.every(isUtilityClass) && tokens.some(isSeparatedUtility)) {
    return true;
  }
  if (tokens.length === 1 && isSeparatedUtility(tokens[0]) && (tokens[0].match(/[-:/]/g) || []).length >= 2) {
    return true;
  }
  if (/\b(?:hsla?|rgba?|translate(?:3d|x|y|z)?|rotate[xyz]?|scale[xyz]?|skew[xy]?|matrix3?d?|perspective|calc|var|url|(?:linear|radial|conic)-gradient|cubic-bezier|drop-shadow|blur|brightness|saturate|grayscale)\s*\(/i.test(raw)) {
    return true;
  }
  const s = raw.replace(/\{[^}]*\}/g, "\0").trim();
  if (!s)
    return false;
  if (/^[/?#]/.test(s))
    return true;
  if (/^[\u0000\w.-]*(?:\/[\u0000\w.-]+)+$/.test(s) && (s.includes("\0") || (s.match(/\//g) || []).length >= 2)) {
    return true;
  }
  if (/^[a-z-]+:\S/i.test(s))
    return true;
  if (/[a-z-]+\s*:\s*[^;]+;/i.test(s))
    return true;
  if (/(?:^|[;\s])(?:path|max-age|samesite|domain|expires|secure|httponly)\b/i.test(s)) {
    return true;
  }
  if (/^[\u0000\d\s.,+-]*(?:px|ms|deg|rad|turn|em|rem|vh|vw|fr|pt|%|s)$/i.test(s))
    return true;
  if (/^[MLHVCSQTAZ][\u0000\d\s.,+-]*$/i.test(s))
    return true;
  if (/(?:\d|\u0000)(?:\.\d+)?m?s\b/.test(s) && /\b(?:linear|ease(?:-in|-out|-in-out)?|forwards|backwards|infinite|alternate|steps)\b/i.test(s)) {
    return true;
  }
  return false;
}
function isProbablyTranslatable(source) {
  const text = normalizeText(source);
  if (!text)
    return false;
  if (text.length < 2)
    return false;
  if (!/\p{L}/u.test(text))
    return false;
  if (/^https?:\/\//i.test(text))
    return false;
  if (/^\/[a-z0-9/_-]+$/i.test(text))
    return false;
  if (/^[a-z0-9_-]+:[a-z0-9:_-]+$/i.test(text))
    return false;
  if (/^[a-z]+(?:[A-Z][a-z0-9]*)+$/.test(text))
    return false;
  if (/^[.#]?[a-z0-9_-]+$/i.test(text) && !/[A-Z]/.test(text))
    return false;
  return true;
}

// vendor/hedgeling-i18n/dist/adapters/ecmascript/shapes.js
function jsxElementInfo(tag) {
  if (tag === "button" || tag === "Button" || tag === "PrimaryButton" || tag === "SecondaryButton") {
    return {
      shape: "button",
      kind: "button-text",
      purpose: "button text for an action the user can take"
    };
  }
  if (tag === "a" || tag === "Link") {
    return { shape: "link", kind: "link-text", purpose: "link text for navigation" };
  }
  if (/^h[1-6]$/i.test(tag)) {
    return {
      shape: "header",
      kind: "heading-text",
      purpose: "heading text for a page or UI section"
    };
  }
  if (tag === "label") {
    return {
      shape: "label",
      kind: "label-text",
      purpose: "label for a form control or UI value"
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
function isInlineTextTag(tag) {
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
    "wbr"
  ].includes(tag);
}

// vendor/hedgeling-i18n/dist/adapters/ecmascript/jsxMessage.js
function elementTagName(node) {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  const name = opening.tagName;
  if (ts.isIdentifier(name))
    return name.text;
  if (ts.isPropertyAccessExpression(name))
    return name.name.text;
  return name.getText();
}
function hasTranslatableText(message) {
  const bare = message.replace(/<\/?\d+>/g, "").replace(/\{[a-zA-Z0-9_]+\}/g, "");
  return /\p{L}/u.test(bare);
}
function literalText(expr) {
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr))
    return expr.text;
  return null;
}
function buildJsxMessage(node, sourceFile) {
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
          continue;
        const literal = literalText(child.expression);
        if (literal !== null) {
          out += literal;
        } else if (ts.isIdentifier(child.expression)) {
          valueNames.push(child.expression.text);
          out += `{${child.expression.text}}`;
        } else {
          ok = false;
        }
        continue;
      }
      if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
        if (depth > 0) {
          ok = false;
          break;
        }
        if (!isInlineTextTag(elementTagName(child))) {
          ok = false;
          break;
        }
        const attrs = ts.isJsxElement(child) ? child.openingElement.attributes : child.attributes;
        for (const attr of attrs.properties) {
          if (ts.isJsxSpreadAttribute(attr)) {
            ok = false;
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
        if (!/\S/.test(inner)) {
          ok = false;
          break;
        }
        hasElements = true;
        componentTexts.push(child.getText(sourceFile));
        out += `<${index}>${inner}</${index}>`;
        continue;
      }
      ok = false;
    }
    return out;
  };
  const raw = serialize(node.children, 0);
  if (!ok)
    return null;
  const message = normalizeText(raw);
  if (!message)
    return null;
  if (!hasTranslatableText(message))
    return null;
  return { message, componentTexts, valueNames, hasElements };
}

// vendor/hedgeling-i18n/dist/adapters/ecmascript/templateMessage.js
import ts2 from "file:///C:/Users/u1088292/CascadeProjects/scroll-goblin/node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/typescript.js";
function deriveName(expr) {
  if (ts2.isIdentifier(expr))
    return expr.text;
  if (ts2.isPropertyAccessExpression(expr))
    return expr.name.text;
  return null;
}
function buildTemplateMessage(node, sourceFile) {
  const values = [];
  const byExpr = /* @__PURE__ */ new Map();
  const used = /* @__PURE__ */ new Set();
  let positional = 0;
  let raw = node.head.text;
  for (const span of node.templateSpans) {
    const exprText = span.expression.getText(sourceFile);
    let name = byExpr.get(exprText) ?? null;
    if (name === null) {
      const derived = deriveName(span.expression);
      if (derived && !used.has(derived)) {
        name = derived;
      } else {
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

// vendor/hedgeling-i18n/dist/core/shapes.js
var propShapes = {
  "aria-label": {
    shape: "label",
    kind: "aria-label",
    purpose: "accessibility label for an interactive or visual element"
  },
  alt: {
    shape: "label",
    kind: "alt-text",
    purpose: "alternative text for an image or visual element"
  },
  label: {
    shape: "label",
    kind: "component-label",
    purpose: "label passed to a UI component"
  },
  placeholder: {
    shape: "placeholder",
    kind: "placeholder",
    purpose: "placeholder text shown inside an input before the user enters content"
  },
  title: {
    shape: "tooltip",
    kind: "title-attribute",
    purpose: "tooltip text shown for additional context"
  },
  buttonLabel: {
    shape: "button",
    kind: "component-button-label",
    purpose: "button label passed to a UI component"
  },
  blurb: {
    shape: "body",
    kind: "component-blurb",
    purpose: "short descriptive copy passed to a UI component"
  }
};

// vendor/hedgeling-i18n/dist/adapters/ecmascript/identify.js
function hasWordsOutsidePlaceholders(message) {
  return /\p{L}/u.test(message.replace(/\{[a-zA-Z0-9_]+\}/g, ""));
}
var DEFAULT_TRANSLATION_FNS = ["t", "__hlT"];
var IMPORT_MARKER = "/* @hedgeling/i18n: auto-wrap */";
function propertyName(name) {
  if (ts3.isIdentifier(name))
    return name.text;
  if (ts3.isStringLiteral(name))
    return name.text;
  return null;
}
function jsxTagName(node) {
  const name = node.tagName;
  if (ts3.isIdentifier(name))
    return name.text;
  if (ts3.isPropertyAccessExpression(name))
    return name.name.text;
  return name.getText();
}
function stringLiteralValue(node) {
  if (!node)
    return null;
  if (ts3.isStringLiteral(node) || ts3.isNoSubstitutionTemplateLiteral(node))
    return node.text;
  if (ts3.isJsxExpression(node) && node.expression)
    return stringLiteralValue(node.expression);
  return null;
}
function stringLiteralWrap(node, sourceFile) {
  if (!node)
    return null;
  if (ts3.isStringLiteral(node) || ts3.isNoSubstitutionTemplateLiteral(node)) {
    return {
      text: node.text,
      start: node.getStart(sourceFile),
      end: node.getEnd()
    };
  }
  return null;
}
function pureTextChildren(children) {
  const parts = [];
  let sawText = false;
  for (const child of children) {
    if (ts3.isJsxText(child)) {
      parts.push(child.text);
      if (child.text.trim())
        sawText = true;
      continue;
    }
    if (ts3.isJsxExpression(child)) {
      if (!child.expression)
        continue;
      const literal = stringLiteralValue(child.expression);
      if (literal === null)
        return null;
      parts.push(literal);
      sawText = true;
      continue;
    }
    return null;
  }
  return sawText ? parts.join("") : null;
}
function detectManualTNeed(children) {
  let out = "";
  let sawWords = false;
  let sawDynamic = false;
  let refDriven = false;
  let anon = 0;
  const anonName = () => {
    anon += 1;
    return anon === 1 ? "value" : `value${anon}`;
  };
  const exprName = (expr) => {
    if (ts3.isIdentifier(expr))
      return expr.text;
    if (ts3.isPropertyAccessExpression(expr))
      return expr.name.text;
    return anonName();
  };
  for (const child of children) {
    if (ts3.isJsxText(child)) {
      out += child.text;
      if (/\p{L}/u.test(child.text))
        sawWords = true;
      continue;
    }
    if (ts3.isJsxExpression(child)) {
      if (!child.expression)
        continue;
      const literal = stringLiteralValue(child.expression);
      if (literal !== null) {
        out += literal;
        if (/\p{L}/u.test(literal))
          sawWords = true;
        continue;
      }
      out += `{${exprName(child.expression)}}`;
      sawDynamic = true;
      continue;
    }
    if (ts3.isJsxElement(child) || ts3.isJsxSelfClosingElement(child)) {
      const opening = ts3.isJsxElement(child) ? child.openingElement : child;
      if (!isInlineTextTag(jsxTagName(opening)))
        return null;
      let refName = null;
      let behavioral = false;
      for (const attr of opening.attributes.properties) {
        if (ts3.isJsxSpreadAttribute(attr)) {
          behavioral = true;
          continue;
        }
        if (ts3.isJsxAttribute(attr) && ts3.isIdentifier(attr.name)) {
          const attrName = attr.name.text;
          if (attrName === "ref") {
            behavioral = true;
            const init = attr.initializer;
            if (init && ts3.isJsxExpression(init) && init.expression && ts3.isIdentifier(init.expression)) {
              refName = init.expression.text.replace(/Ref$/, "") || null;
            }
          } else if (/^on[A-Z]/.test(attrName)) {
            behavioral = true;
          }
        }
      }
      if (!behavioral)
        return null;
      out += `{${refName ?? anonName()}}`;
      sawDynamic = true;
      refDriven = true;
      continue;
    }
    return null;
  }
  const message = normalizeText(out);
  if (!sawWords || !sawDynamic || !message)
    return null;
  if (!/\{[A-Za-z0-9_]+\}/.test(message))
    return null;
  if (looksTechnical(message))
    return null;
  return { message, refDriven };
}
function callName(node) {
  if (ts3.isIdentifier(node))
    return node.text;
  if (ts3.isPropertyAccessExpression(node))
    return node.name.text;
  return null;
}
var CANVAS_TEXT_METHODS = /* @__PURE__ */ new Set(["fillText", "strokeText"]);
function isCanvasTextArg(node) {
  const parent = node.parent;
  if (!parent || !ts3.isCallExpression(parent))
    return false;
  if (parent.arguments[0] !== node)
    return false;
  return ts3.isPropertyAccessExpression(parent.expression) && CANVAS_TEXT_METHODS.has(parent.expression.name.text);
}
var DENY_CALLEES = /* @__PURE__ */ new Set([
  "t",
  "__hlT",
  "log",
  "warn",
  "error",
  "info",
  "debug",
  "trace",
  "assert",
  "group",
  "groupEnd",
  "getItem",
  "setItem",
  "removeItem",
  "getElementById",
  "querySelector",
  "querySelectorAll",
  "createElement",
  "getAttribute",
  "setAttribute",
  "removeAttribute",
  "getContext",
  "getExtension",
  "addEventListener",
  "removeEventListener",
  "dispatchEvent",
  "matchMedia",
  "postMessage",
  "createObjectURL",
  "revokeObjectURL",
  "require",
  "import",
  "glob",
  "fetch",
  "open",
  "track",
  "gtag",
  "ga",
  "identify",
  "capture",
  "logEvent",
  "Error",
  "TypeError",
  "RangeError",
  "URL",
  "URLSearchParams",
  "Worker",
  "EventSource",
  "WebSocket"
]);
function isExtractableValueLiteral(node) {
  const parent = node.parent;
  if (!parent)
    return false;
  if (ts3.isPropertyAssignment(parent) && parent.name === node)
    return false;
  if (ts3.isComputedPropertyName(parent))
    return false;
  if (ts3.isImportDeclaration(parent) || ts3.isExportDeclaration(parent))
    return false;
  if (ts3.isImportEqualsDeclaration(parent) || ts3.isExternalModuleReference(parent))
    return false;
  if (ts3.isModuleDeclaration(parent))
    return false;
  if (ts3.isJsxAttribute(parent))
    return false;
  if (ts3.isJsxExpression(parent))
    return false;
  if (ts3.isJsxExpression(parent) && parent.parent && ts3.isJsxAttribute(parent.parent))
    return false;
  if (ts3.isLiteralTypeNode(parent))
    return false;
  if (ts3.isEnumMember(parent))
    return false;
  if (ts3.isCaseClause(parent))
    return false;
  if (ts3.isElementAccessExpression(parent))
    return false;
  if (ts3.isPropertyAccessExpression(parent) && parent.expression === node)
    return false;
  const directTemplateSpanLiteral = ts3.isTemplateSpan(parent) && parent.expression === node;
  if (!directTemplateSpanLiteral) {
    for (let p = parent; p && !ts3.isSourceFile(p); p = p.parent) {
      if (ts3.isTemplateExpression(p) || ts3.isTemplateSpan(p))
        return false;
    }
  }
  if (ts3.isCallExpression(parent) && parent.expression.kind === ts3.SyntaxKind.ImportKeyword) {
    return false;
  }
  if (ts3.isBinaryExpression(parent) && parent.operatorToken.kind === ts3.SyntaxKind.EqualsToken && parent.right === node && ts3.isPropertyAccessExpression(parent.left) && ASSIGN_DENY_PROPS.has(parent.left.name.text)) {
    return false;
  }
  if (ts3.isBinaryExpression(parent) && (parent.operatorToken.kind === ts3.SyntaxKind.EqualsEqualsEqualsToken || parent.operatorToken.kind === ts3.SyntaxKind.ExclamationEqualsEqualsToken || parent.operatorToken.kind === ts3.SyntaxKind.EqualsEqualsToken || parent.operatorToken.kind === ts3.SyntaxKind.ExclamationEqualsToken)) {
    const other = parent.left === node ? parent.right : parent.left;
    if (ts3.isPropertyAccessExpression(other) && KEY_EVENT_PROPS.has(other.name.text)) {
      return false;
    }
  }
  if (ts3.isArrayLiteralExpression(parent)) {
    for (const el of parent.elements) {
      const v = ts3.isStringLiteral(el) || ts3.isNoSubstitutionTemplateLiteral(el) ? el.text.trim().toLowerCase() : "";
      if (GENERIC_FONT_FAMILIES.has(v))
        return false;
    }
  }
  if ((ts3.isCallExpression(parent) || ts3.isNewExpression(parent)) && parent.expression) {
    const callee = callName(parent.expression);
    if (callee && DENY_CALLEES.has(callee))
      return false;
  }
  return true;
}
function valueLiteralRole(node) {
  const parent = node.parent;
  if (parent && ts3.isBinaryExpression(parent)) {
    const op = parent.operatorToken.kind;
    if (op === ts3.SyntaxKind.EqualsEqualsEqualsToken || op === ts3.SyntaxKind.ExclamationEqualsEqualsToken || op === ts3.SyntaxKind.EqualsEqualsToken || op === ts3.SyntaxKind.ExclamationEqualsToken || op === ts3.SyntaxKind.LessThanToken || op === ts3.SyntaxKind.GreaterThanToken || op === ts3.SyntaxKind.LessThanEqualsToken || op === ts3.SyntaxKind.GreaterThanEqualsToken) {
      return "logic";
    }
    if (op === ts3.SyntaxKind.EqualsToken && parent.right === node)
      return "assign";
  }
  if (parent && (ts3.isCallExpression(parent) || ts3.isNewExpression(parent)))
    return "call";
  return "value";
}
var KEY_EVENT_PROPS = /* @__PURE__ */ new Set(["key", "code", "keyCode", "which", "charCode"]);
var ASSIGN_DENY_PROPS = /* @__PURE__ */ new Set([
  "name",
  "displayName",
  "font",
  "textBaseline",
  "textAlign",
  "fillStyle",
  "strokeStyle",
  "lineCap",
  "lineJoin",
  "cursor",
  "id",
  "className",
  "htmlFor",
  "type"
]);
var GENERIC_FONT_FAMILIES = /* @__PURE__ */ new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math"
]);
function isInFunctionScope(node) {
  let p = node.parent;
  while (p) {
    if (ts3.isFunctionDeclaration(p) || ts3.isFunctionExpression(p) || ts3.isArrowFunction(p) || ts3.isMethodDeclaration(p) || ts3.isConstructorDeclaration(p) || ts3.isGetAccessorDeclaration(p) || ts3.isSetAccessorDeclaration(p)) {
      return true;
    }
    if (ts3.isSourceFile(p))
      return false;
    p = p.parent;
  }
  return false;
}
function isExtractableTemplatePosition(node) {
  const parent = node.parent;
  if (!parent)
    return false;
  if (ts3.isJsxExpression(parent))
    return false;
  if (ts3.isTaggedTemplateExpression(parent))
    return false;
  for (let p = parent; p && !ts3.isSourceFile(p); p = p.parent) {
    if (ts3.isTemplateExpression(p) || ts3.isTemplateSpan(p))
      return false;
  }
  if (ts3.isComputedPropertyName(parent))
    return false;
  if (ts3.isLiteralTypeNode(parent))
    return false;
  if (ts3.isCaseClause(parent))
    return false;
  if ((ts3.isCallExpression(parent) || ts3.isNewExpression(parent)) && parent.expression) {
    const callee = callName(parent.expression);
    if (callee && DENY_CALLEES.has(callee))
      return false;
  }
  return true;
}
function identifyHits(sourceText, options) {
  const { fileName } = options;
  const overrides = options.contextOverrides ?? {};
  const translationFns = /* @__PURE__ */ new Set([
    ...DEFAULT_TRANSLATION_FNS,
    ...options.translationFunctionNames ?? []
  ]);
  const objectFields = new Set(options.objectFields ?? []);
  const scriptKind = fileName.endsWith(".tsx") ? ts3.ScriptKind.TSX : fileName.endsWith(".jsx") ? ts3.ScriptKind.JSX : fileName.endsWith(".mts") || fileName.endsWith(".ts") ? ts3.ScriptKind.TS : ts3.ScriptKind.TSX;
  const sourceFile = ts3.createSourceFile(fileName, sourceText, ts3.ScriptTarget.Latest, true, scriptKind);
  const hits = [];
  const lineFor = (node) => sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const push = (rawText, shape, kind, purpose, line, wrap) => {
    const text = normalizeText(rawText);
    if (!isProbablyTranslatable(text))
      return;
    const override = overrides[text];
    hits.push({
      text,
      shape: override?.shape ?? shape,
      purpose: override?.purpose ?? purpose,
      visualContext: override?.visualContext ?? "",
      kind,
      line,
      wrap
    });
  };
  const pushTemplate = (tmpl, shape, kind, purpose, start, end, line, jsx) => {
    if (!hasWordsOutsidePlaceholders(tmpl.raw))
      return;
    if (looksTechnical(tmpl.raw))
      return;
    const text = normalizeText(tmpl.raw);
    if (!isProbablyTranslatable(text))
      return;
    const override = overrides[text];
    hits.push({
      text,
      shape: override?.shape ?? shape,
      purpose: override?.purpose ?? purpose,
      visualContext: override?.visualContext ?? "",
      kind,
      line,
      wrap: { type: "template", start, end, values: tmpl.values, jsx }
    });
  };
  const collectRichLiteralSegments = (children) => {
    for (const child of children) {
      if (ts3.isJsxExpression(child) && child.expression) {
        const literal = stringLiteralValue(child.expression);
        if (literal !== null && !looksTechnical(literal)) {
          push(literal, "body", "value-literal", "UI text in a value position, applied at runtime by the DOM injector", lineFor(child), { type: "none" });
        }
      } else if (ts3.isJsxElement(child)) {
        collectRichLiteralSegments(child.children);
      }
    }
  };
  const visit = (node) => {
    if (ts3.isJsxElement(node)) {
      const tag = jsxTagName(node.openingElement);
      const info = jsxElementInfo(tag);
      if (info) {
        const text = pureTextChildren(node.children);
        if (text !== null) {
          push(text, info.shape, info.kind, info.purpose, lineFor(node), {
            type: "jsx-text",
            start: node.openingElement.getEnd(),
            end: node.closingElement.getStart()
          });
        } else {
          const rich = buildJsxMessage(node, sourceFile);
          if (rich && rich.hasElements) {
            push(rich.message, info.shape, `${info.kind}-rich`, info.purpose, lineFor(node), {
              type: "jsx-trans",
              start: node.getStart(sourceFile),
              end: node.getEnd(),
              componentTexts: rich.componentTexts,
              valueNames: rich.valueNames
            });
            collectRichLiteralSegments(node.children);
            return;
          }
          const manual = detectManualTNeed(node.children);
          if (manual) {
            push(manual.message, info.shape, manual.refDriven ? "manual-t:ref-adjacent" : "manual-t:interpolation", info.purpose, lineFor(node), { type: "none" });
          }
          for (const child of node.children) {
            if (ts3.isJsxExpression(child) && child.expression) {
              const literal = stringLiteralValue(child.expression);
              if (literal !== null && !looksTechnical(literal)) {
                push(literal, info.shape, "jsx-expr-text", info.purpose, lineFor(child), {
                  type: "none"
                });
              }
            }
          }
        }
      }
    }
    if (ts3.isJsxFragment(node)) {
      for (const child of node.children) {
        if (ts3.isJsxExpression(child) && child.expression) {
          const literal = stringLiteralValue(child.expression);
          if (literal !== null && !looksTechnical(literal)) {
            push(literal, "body", "jsx-expr-text", "inline UI text rendered as a DOM text node", lineFor(child), {
              type: "none"
            });
          }
        }
      }
      const manual = detectManualTNeed(node.children);
      if (manual) {
        push(manual.message, "body", manual.refDriven ? "manual-t:ref-adjacent" : "manual-t:interpolation", "inline UI text rendered as a DOM text node", lineFor(node), { type: "none" });
      }
    }
    if (ts3.isJsxExpression(node) && node.expression && ts3.isTemplateExpression(node.expression) && node.parent && (ts3.isJsxElement(node.parent) || ts3.isJsxFragment(node.parent))) {
      const tmpl = buildTemplateMessage(node.expression, sourceFile);
      pushTemplate(tmpl, "body", "jsx-text-interpolated", "interpolated UI text rendered inline", node.getStart(sourceFile), node.getEnd(), lineFor(node), true);
    }
    if (ts3.isPropertyAssignment(node)) {
      const name = propertyName(node.name);
      if (name && objectFields.has(name)) {
        const value = stringLiteralWrap(node.initializer, sourceFile);
        if (value !== null) {
          push(value.text, "body", `data-field:${name}`, "data-driven UI text rendered dynamically from app data", lineFor(node), {
            type: "object-getter",
            start: node.getStart(sourceFile),
            end: node.getEnd(),
            name: node.name.getText(sourceFile)
          });
        }
      }
    }
    if (ts3.isJsxAttribute(node)) {
      const info = propShapes[node.name.getText()];
      const init = node.initializer;
      if (info && init) {
        if (ts3.isStringLiteral(init)) {
          push(init.text, info.shape, info.kind, info.purpose, lineFor(node), {
            type: "jsx-attribute",
            valueStart: init.getStart(sourceFile),
            valueEnd: init.getEnd()
          });
        } else if (ts3.isJsxExpression(init) && init.expression) {
          if (ts3.isTemplateExpression(init.expression)) {
            const tmpl = buildTemplateMessage(init.expression, sourceFile);
            pushTemplate(tmpl, info.shape, info.kind, info.purpose, init.getStart(sourceFile), init.getEnd(), lineFor(node), true);
          } else {
            const value = stringLiteralValue(init.expression);
            if (value !== null) {
              push(value, info.shape, info.kind, info.purpose, lineFor(node), {
                type: "jsx-attribute",
                valueStart: init.getStart(sourceFile),
                valueEnd: init.getEnd()
              });
            }
          }
        }
      }
    }
    if (ts3.isCallExpression(node)) {
      const name = callName(node.expression);
      if (name && translationFns.has(name)) {
        const value = stringLiteralValue(node.arguments[0]);
        if (value !== null) {
          push(value, "body", "translation-call", "source string passed to the runtime translation helper", lineFor(node), { type: "none" });
        }
      }
    }
    if ((ts3.isStringLiteral(node) || ts3.isNoSubstitutionTemplateLiteral(node)) && isCanvasTextArg(node) && !looksTechnical(node.text)) {
      push(node.text, "body", "canvas-text", "text painted to a <canvas>, wrapped with __hlT at build time", lineFor(node), { type: "call-arg", valueStart: node.getStart(sourceFile), valueEnd: node.getEnd() });
    }
    if ((ts3.isStringLiteral(node) || ts3.isNoSubstitutionTemplateLiteral(node)) && isExtractableValueLiteral(node) && !isCanvasTextArg(node)) {
      const parent = node.parent;
      const fieldName = ts3.isPropertyAssignment(parent) && parent.initializer === node ? propertyName(parent.name) : null;
      if (!(fieldName && objectFields.has(fieldName)) && !looksTechnical(node.text)) {
        const role = valueLiteralRole(node);
        push(node.text, "body", role === "value" ? "value-literal" : `value-literal:${role}`, "UI text in a value position", lineFor(node), { type: "none" });
      }
    }
    if (ts3.isTemplateExpression(node) && isExtractableTemplatePosition(node) && isInFunctionScope(node)) {
      const tmpl = buildTemplateMessage(node, sourceFile);
      pushTemplate(tmpl, "body", "value-interpolated", "interpolated UI text built in a value position", node.getStart(sourceFile), node.getEnd(), lineFor(node), false);
    }
    ts3.forEachChild(node, visit);
  };
  visit(sourceFile);
  return hits;
}
function buildTransElement(hit, message) {
  const components = `[${hit.componentTexts.join(", ")}]`;
  const uniqueValues = [...new Set(hit.valueNames)];
  const values = uniqueValues.length > 0 ? ` values={{ ${uniqueValues.join(", ")} }}` : "";
  return `<Trans message={${JSON.stringify(message)}} components={${components}}${values} />`;
}
function transformSource(sourceText, options) {
  if (sourceText.includes(IMPORT_MARKER))
    return null;
  const hits = identifyHits(sourceText, options);
  const replacements = [];
  const imports = /* @__PURE__ */ new Set();
  for (const hit of hits) {
    if (hit.wrap.type === "jsx-text") {
      replacements.push({
        start: hit.wrap.start,
        end: hit.wrap.end,
        text: `{__hlT(${JSON.stringify(hit.text)})}`
      });
      imports.add("__hlT");
    } else if (hit.wrap.type === "jsx-attribute") {
      replacements.push({
        start: hit.wrap.valueStart,
        end: hit.wrap.valueEnd,
        text: `{__hlT(${JSON.stringify(hit.text)})}`
      });
      imports.add("__hlT");
    } else if (hit.wrap.type === "call-arg") {
      replacements.push({
        start: hit.wrap.valueStart,
        end: hit.wrap.valueEnd,
        text: `__hlT(${JSON.stringify(hit.text)})`
      });
      imports.add("__hlT");
    } else if (hit.wrap.type === "template") {
      const parts = hit.wrap.values.map((v) => v.name === v.expr ? v.name : `${v.name}: ${v.expr}`);
      const valuesArg = parts.length > 0 ? `, { ${parts.join(", ")} }` : "";
      const call = `__hlT(${JSON.stringify(hit.text)}${valuesArg})`;
      replacements.push({
        start: hit.wrap.start,
        end: hit.wrap.end,
        text: hit.wrap.jsx ? `{${call}}` : call
      });
      imports.add("__hlT");
    } else if (hit.wrap.type === "jsx-trans") {
      replacements.push({
        start: hit.wrap.start,
        end: hit.wrap.end,
        text: buildTransElement(hit.wrap, hit.text)
      });
      imports.add("Trans");
    } else if (hit.wrap.type === "value") {
      replacements.push({
        start: hit.wrap.start,
        end: hit.wrap.end,
        text: `__hlT(${JSON.stringify(hit.text)})`
      });
      imports.add("__hlT");
    } else if (hit.wrap.type === "object-getter") {
      replacements.push({
        start: hit.wrap.start,
        end: hit.wrap.end,
        text: `get ${hit.wrap.name}() { return __hlT(${JSON.stringify(hit.text)}); }`
      });
      imports.add("__hlT");
    }
  }
  if (replacements.length === 0)
    return null;
  replacements.sort((a, b) => b.start - a.start);
  let code = sourceText;
  for (const r of replacements) {
    code = code.slice(0, r.start) + r.text + code.slice(r.end);
  }
  return { code, imports: [...imports] };
}

// vendor/hedgeling-i18n/dist/adapters/react-ts/index.js
var reactTsAdapter = {
  name: "react-ts",
  extensions: [".tsx", ".jsx"],
  identify: identifyHits,
  transform: transformSource
};

// vendor/hedgeling-i18n/dist/adapters/js-ts/index.js
var jsTsAdapter = {
  name: "js-ts",
  extensions: [".ts", ".mts", ".cts", ".js", ".mjs", ".cjs"],
  identify: identifyHits,
  transform: transformSource
};

// vendor/hedgeling-i18n/dist/adapters/html/identify.js
function shapeFromHtmlTag(tag) {
  const lower = tag.toLowerCase();
  if (lower === "button")
    return "button";
  if (lower === "a")
    return "link";
  if (lower === "label")
    return "label";
  if (lower === "title" || /^h[1-6]$/.test(lower))
    return "header";
  return "body";
}
function identifyHtmlHits(html) {
  const hits = [];
  const tagTextPattern = /<(title|h[1-6]|button|a|label|p|li|span)\b[^>]*>([^<]*\p{L}[^<]*)<\/\1>/giu;
  const attrPattern = /\b(aria-label|title|alt|placeholder)="([^"]*\p{L}[^"]*)"/giu;
  const lineFor = (index) => html.slice(0, index).split(/\r?\n/).length;
  const push = (rawText, shape, kind, purpose, index) => {
    const text = normalizeText(rawText);
    if (!isProbablyTranslatable(text))
      return;
    hits.push({ text, shape, purpose, visualContext: "", kind, line: lineFor(index) });
  };
  for (const match of html.matchAll(tagTextPattern)) {
    const tag = match[1].toLowerCase();
    push(match[2], shapeFromHtmlTag(tag), `html-${tag}-text`, tag === "title" ? "document title shown in browser tabs and search results" : "static HTML text shown to users", match.index ?? 0);
  }
  for (const match of html.matchAll(attrPattern)) {
    const info = propShapes[match[1].toLowerCase()];
    if (!info)
      continue;
    push(match[2], info.shape, `html-${info.kind}`, info.purpose, match.index ?? 0);
  }
  return hits;
}

// vendor/hedgeling-i18n/dist/adapters/html/index.js
var htmlAdapter = {
  name: "html",
  extensions: [".html", ".htm"],
  identify: (source) => identifyHtmlHits(source)
};

// vendor/hedgeling-i18n/dist/adapters/vue/identify.js
function shapeForTag(tag) {
  const lower = tag.toLowerCase();
  if (lower === "button")
    return "button";
  if (lower === "a" || lower === "router-link" || lower === "nuxt-link")
    return "link";
  if (lower === "label")
    return "label";
  if (/^h[1-6]$/.test(lower))
    return "header";
  return "body";
}
var ATTR_SHAPES = {
  placeholder: {
    shape: "placeholder",
    kind: "placeholder",
    purpose: "placeholder text shown inside an input before the user enters content"
  },
  title: { shape: "tooltip", kind: "title-attribute", purpose: "tooltip text shown for additional context" },
  "aria-label": {
    shape: "label",
    kind: "aria-label",
    purpose: "accessibility label for an interactive or visual element"
  },
  alt: { shape: "label", kind: "alt-text", purpose: "alternative text for an image or visual element" },
  label: { shape: "label", kind: "component-label", purpose: "label passed to a UI component" }
};
function mustacheToPlaceholder(text) {
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, expr) => {
    const trimmed = String(expr).trim();
    const match = trimmed.match(/([A-Za-z_$][\w$]*)\s*$/);
    return `{${match ? match[1] : "value"}}`;
  });
}
function hasWordsOutsidePlaceholders2(message) {
  return /\p{L}/u.test(message.replace(/\{[a-zA-Z0-9_]+\}/g, ""));
}
function identifyVueHits(source) {
  const hits = [];
  const templateMatch = source.match(/<template\b[^>]*>([\s\S]*?)<\/template>/i);
  if (!templateMatch)
    return hits;
  const template = templateMatch[1];
  const templateOffset = templateMatch.index + templateMatch[0].indexOf(template);
  const lineFor = (index) => source.slice(0, templateOffset + index).split(/\r?\n/).length;
  const push = (rawText, shape, kind, purpose, index) => {
    const text = normalizeText(mustacheToPlaceholder(rawText));
    if (!isProbablyTranslatable(text))
      return;
    if (!hasWordsOutsidePlaceholders2(text))
      return;
    hits.push({ text, shape, purpose, visualContext: "", kind, line: lineFor(index) });
  };
  const tagTextPattern = /<(h[1-6]|button|a|label|p|li|span|div|router-link|nuxt-link)\b[^>]*>([^<]*\p{L}[^<]*)<\/\1>/giu;
  for (const match of template.matchAll(tagTextPattern)) {
    const tag = match[1].toLowerCase();
    push(match[2], shapeForTag(tag), `vue-${tag}-text`, "text shown to users in a Vue template", match.index ?? 0);
  }
  const attrPattern = /(?<![:\w-])(placeholder|title|aria-label|alt|label)\s*=\s*"([^"]*\p{L}[^"]*)"/giu;
  for (const match of template.matchAll(attrPattern)) {
    const info = ATTR_SHAPES[match[1].toLowerCase()];
    if (!info)
      continue;
    push(match[2], info.shape, `vue-${info.kind}`, info.purpose, match.index ?? 0);
  }
  return hits;
}

// vendor/hedgeling-i18n/dist/adapters/vue/index.js
var vueAdapter = {
  name: "vue",
  extensions: [".vue"],
  identify: (source) => identifyVueHits(source)
};

// vendor/hedgeling-i18n/dist/adapters/csharp/lexer.js
function placeholderName(expr) {
  let e = expr.trim();
  e = e.replace(/,\s*-?\d+\s*$/, "");
  e = e.replace(/:[^:{}()]*$/, "");
  const match = e.match(/([A-Za-z_$][\w$]*)\s*$/);
  return match ? match[1] : "value";
}
function decodeEscapes(body) {
  return body.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{1,4}|.)/g, (whole, esc) => {
    const c = esc[0];
    if (c === "u" || c === "x") {
      const code = Number.parseInt(esc.slice(1), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    switch (c) {
      case "n":
        return "\n";
      case "t":
        return "	";
      case "r":
        return "\r";
      case "0":
        return "\0";
      case "\\":
        return "\\";
      case '"':
        return '"';
      case "'":
        return "'";
      default:
        return c;
    }
  });
}
function lexCSharpStrings(source) {
  const out = [];
  const len = source.length;
  let i = 0;
  const lineCommentEnd = (from) => {
    const nl = source.indexOf("\n", from);
    return nl === -1 ? len : nl;
  };
  while (i < len) {
    const c = source[i];
    if (c === "/" && i + 1 < len) {
      if (source[i + 1] === "/") {
        i = lineCommentEnd(i + 2);
        continue;
      }
      if (source[i + 1] === "*") {
        const close = source.indexOf("*/", i + 2);
        i = close === -1 ? len : close + 2;
        continue;
      }
    }
    if (c === "'") {
      let j = i + 1;
      while (j < len) {
        if (source[j] === "\\") {
          j += 2;
          continue;
        }
        if (source[j] === "'") {
          j += 1;
          break;
        }
        if (source[j] === "\n")
          break;
        j += 1;
      }
      i = j;
      continue;
    }
    if (c === '"' || c === "$" || c === "@") {
      const parsed = tryReadString(source, i);
      if (parsed) {
        out.push(parsed);
        i = parsed.end;
        continue;
      }
    }
    i += 1;
  }
  return out;
}
function tryReadString(source, start) {
  const len = source.length;
  let i = start;
  let interpolated = false;
  let verbatim = false;
  while (i < len && (source[i] === "$" || source[i] === "@")) {
    if (source[i] === "$")
      interpolated = true;
    else
      verbatim = true;
    i += 1;
  }
  if (i >= len || source[i] !== '"')
    return null;
  let quoteRun = 0;
  let q = i;
  while (q < len && source[q] === '"') {
    quoteRun += 1;
    q += 1;
  }
  if (quoteRun >= 3) {
    return readRaw(source, start, i, quoteRun, interpolated);
  }
  const bodyStart = i + 1;
  return verbatim ? readVerbatim(source, start, bodyStart, interpolated) : readRegular(source, start, bodyStart, interpolated);
}
function readRegular(source, start, bodyStart, interpolated) {
  const len = source.length;
  let i = bodyStart;
  let raw = "";
  while (i < len) {
    const ch = source[i];
    if (ch === "\\") {
      raw += source.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (ch === '"') {
      const value = interpolated ? convertInterpolations(decodeEscapes(raw), false) : decodeEscapes(raw);
      return { value, start, end: i + 1, interpolated };
    }
    if (ch === "\n")
      return null;
    raw += ch;
    i += 1;
  }
  return null;
}
function readVerbatim(source, start, bodyStart, interpolated) {
  const len = source.length;
  let i = bodyStart;
  let raw = "";
  while (i < len) {
    const ch = source[i];
    if (ch === '"') {
      if (source[i + 1] === '"') {
        raw += '"';
        i += 2;
        continue;
      }
      const value = interpolated ? convertInterpolations(raw, true) : raw;
      return { value, start, end: i + 1, interpolated };
    }
    raw += ch;
    i += 1;
  }
  return null;
}
function readRaw(source, start, openQuoteStart, quoteRun, interpolated) {
  const len = source.length;
  const delimiter = '"'.repeat(quoteRun);
  const bodyStart = openQuoteStart + quoteRun;
  const close = source.indexOf(delimiter, bodyStart);
  if (close === -1)
    return null;
  let raw = source.slice(bodyStart, close);
  raw = raw.replace(/^\r?\n/, "").replace(/\r?\n[ \t]*$/, "");
  const value = interpolated ? convertInterpolations(raw, true) : raw;
  return { value, start, end: close + quoteRun, interpolated };
}
function convertInterpolations(body, _verbatim) {
  let out = "";
  let i = 0;
  const len = body.length;
  while (i < len) {
    const ch = body[i];
    if (ch === "{") {
      if (body[i + 1] === "{") {
        out += "{";
        i += 2;
        continue;
      }
      let depth = 1;
      let j = i + 1;
      let expr = "";
      while (j < len && depth > 0) {
        const cj = body[j];
        if (cj === "{") {
          depth += 1;
          expr += cj;
          j += 1;
          continue;
        }
        if (cj === "}") {
          depth -= 1;
          if (depth === 0) {
            j += 1;
            break;
          }
          expr += cj;
          j += 1;
          continue;
        }
        if (cj === '"' || cj === "'") {
          const quote = cj;
          expr += cj;
          j += 1;
          while (j < len && body[j] !== quote) {
            if (body[j] === "\\") {
              expr += body.slice(j, j + 2);
              j += 2;
              continue;
            }
            expr += body[j];
            j += 1;
          }
          if (j < len) {
            expr += body[j];
            j += 1;
          }
          continue;
        }
        expr += cj;
        j += 1;
      }
      out += `{${placeholderName(expr)}}`;
      i = j;
      continue;
    }
    if (ch === "}") {
      if (body[i + 1] === "}") {
        out += "}";
        i += 2;
        continue;
      }
      out += "}";
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

// vendor/hedgeling-i18n/dist/adapters/csharp/identify.js
var DEFAULT_SHAPE = {
  shape: "body",
  kind: "csharp-string",
  purpose: "string literal that appears to be user-facing copy"
};
var PROP_SHAPES = {
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
    purpose: "placeholder text shown inside an empty input"
  },
  Placeholder: { shape: "placeholder", kind: "csharp-placeholder", purpose: "placeholder text shown inside an empty input" },
  Prompt: { shape: "placeholder", kind: "csharp-prompt", purpose: "prompt text guiding the user's input" },
  Label: { shape: "label", kind: "csharp-label", purpose: "label for an interactive or visual element" },
  GroupName: { shape: "label", kind: "csharp-group", purpose: "name of a group of related controls" },
  Message: { shape: "body", kind: "csharp-message", purpose: "message shown to the user" },
  Description: { shape: "body", kind: "csharp-description", purpose: "descriptive copy shown to the user" }
};
var PROP_ASSIGN = /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*$/;
var CALL_RULES = [
  {
    pattern: /\bMessageBox\.Show(?:Async)?\s*\(\s*$/,
    info: { shape: "alert", kind: "csharp-messagebox", purpose: "message shown in a dialog box" }
  },
  {
    pattern: /\bConsole\.(?:WriteLine|Write)\s*\(\s*$/,
    info: { shape: "body", kind: "csharp-console", purpose: "text printed to the console for the user" }
  }
];
var ATTR_RULES = [
  {
    pattern: /\[(?:System\.ComponentModel\.DataAnnotations\.)?Display\s*\([^\])]*\b(?:Name|Prompt|GroupName|Description|ShortName)\s*=\s*$/,
    info: { shape: "label", kind: "csharp-display-attr", purpose: "display name shown for a model field" }
  },
  {
    pattern: /\[(?:System\.ComponentModel\.)?DisplayName\s*\(\s*$/,
    info: { shape: "label", kind: "csharp-displayname-attr", purpose: "display name shown for a member" }
  },
  {
    pattern: /\[(?:System\.ComponentModel\.)?Description\s*\(\s*$/,
    info: { shape: "body", kind: "csharp-description-attr", purpose: "description shown for a member or setting" }
  },
  {
    pattern: /\[(?:System\.ComponentModel\.)?Category\s*\(\s*$/,
    info: { shape: "label", kind: "csharp-category-attr", purpose: "category grouping shown in a property grid" }
  }
];
var DENY_CALLEES2 = /* @__PURE__ */ new Set([
  // logging
  "Log",
  "LogInformation",
  "LogWarning",
  "LogError",
  "LogDebug",
  "LogTrace",
  "LogCritical",
  "LogFormat",
  "LogException",
  "Assert",
  "Fail",
  // reflection / metadata
  "GetType",
  "GetMethod",
  "GetProperty",
  "GetField",
  "GetCustomAttribute",
  "GetManifestResourceStream",
  // parsing
  "Parse",
  "TryParse",
  // config / environment / storage / dictionary keys
  "GetEnvironmentVariable",
  "SetEnvironmentVariable",
  "GetConnectionString",
  "GetSection",
  "GetValue",
  "ContainsKey",
  "TryGetValue",
  "GetValueOrDefault",
  // string comparison / matching (args are tokens, not prose)
  "StartsWith",
  "EndsWith",
  "Contains",
  "IndexOf",
  "LastIndexOf",
  "Equals",
  "CompareTo",
  "Compare",
  "CompareOrdinal",
  "IsMatch",
  "Matches",
  "Split"
]);
var CALLEE_BEFORE = /([A-Za-z_]\w*)\s*\(\s*$/;
var DENY_DIAGNOSTICS = /\b(?:Debug|Trace)\s*\.\s*\w+\s*\(\s*$/;
var DENY_NEW = /\bnew\s+(?:[A-Za-z_][\w.]*Exception|Uri|Regex|Guid|TimeSpan|DateTime|DateTimeOffset|Version|CultureInfo|HttpClient|HttpRequestMessage|SqlCommand|SqlConnection|FileStream|StreamReader|StreamWriter|FileInfo|DirectoryInfo)\s*\(\s*$/;
var DENY_ATTR = /\[(?:assembly\s*:\s*|module\s*:\s*)?(?:Route|Http(?:Get|Post|Put|Delete|Patch|Head|Options)|RegularExpression|RegEx|JsonProperty|JsonPropertyName|JsonInclude|JsonConverter|XmlElement|XmlAttribute|XmlRoot|XmlType|Column|Table|Key|ForeignKey|Index|InverseProperty|Bind|BindProperty|ProducesResponseType|Produces|Consumes|Authorize|DllImport|EditorBrowsable|DebuggerDisplay|TypeConverter|DefaultValue|TemplatePart)\s*\([^\])]*$/;
var DENY_INDEXER = /[A-Za-z_)\]]\s*\[\s*$/;
var DENY_CASE = /\bcase\s+$/;
function hasWordsOutsidePlaceholders3(message) {
  return /\p{L}/u.test(message.replace(/\{[a-zA-Z0-9_]+\}/g, ""));
}
function isDeniedPosition(before) {
  const call = CALLEE_BEFORE.exec(before);
  if (call && DENY_CALLEES2.has(call[1]))
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
function identifyCSharpHits(source) {
  const hits = [];
  const lineFor = (index) => source.slice(0, index).split(/\r?\n/).length;
  for (const literal of lexCSharpStrings(source)) {
    const text = normalizeText(literal.value);
    if (!isProbablyTranslatable(text))
      continue;
    if (looksTechnical(text))
      continue;
    if (literal.interpolated && !hasWordsOutsidePlaceholders3(text))
      continue;
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
      line: lineFor(literal.start)
    });
  }
  return hits;
}

// vendor/hedgeling-i18n/dist/adapters/csharp/index.js
var csharpAdapter = {
  name: "csharp",
  extensions: [".cs"],
  identify: (source) => identifyCSharpHits(source)
};

// vendor/hedgeling-i18n/dist/adapters/xaml/identify.js
var ATTR_SHAPES2 = {
  Text: { shape: "body", kind: "xaml-text", purpose: "text shown to users in a XAML control" },
  Header: { shape: "header", kind: "xaml-header", purpose: "header text of a XAML control or group" },
  Title: { shape: "header", kind: "xaml-title", purpose: "title shown in a window or page" },
  Caption: { shape: "header", kind: "xaml-caption", purpose: "caption shown on a control" },
  ToolTip: { shape: "tooltip", kind: "xaml-tooltip", purpose: "tooltip shown on hover for extra context" },
  Watermark: { shape: "placeholder", kind: "xaml-watermark", purpose: "placeholder text shown inside an empty input" },
  PlaceholderText: {
    shape: "placeholder",
    kind: "xaml-placeholder",
    purpose: "placeholder text shown inside an empty input"
  },
  Description: { shape: "body", kind: "xaml-description", purpose: "descriptive copy shown to the user" },
  Label: { shape: "label", kind: "xaml-label", purpose: "label for an interactive or visual element" },
  "AutomationProperties.Name": {
    shape: "label",
    kind: "xaml-automation-name",
    purpose: "accessibility name for a control"
  },
  "AutomationProperties.HelpText": {
    shape: "tooltip",
    kind: "xaml-automation-help",
    purpose: "accessibility help text for a control"
  }
};
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
var TEXT_TAGS = /* @__PURE__ */ new Set(["textblock", "run", "label", "textbox"]);
function isMarkupExtension(value) {
  const v = value.trimStart();
  return v.startsWith("{") && !v.startsWith("{}");
}
function stripLiteralBraceEscape(value) {
  const v = value.trimStart();
  return v.startsWith("{}") ? v.slice(2) : value;
}
function identifyXamlHits(source) {
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
      const info = name === "Content" ? contentShape(tag) : ATTR_SHAPES2[name];
      if (!info)
        continue;
      push(value, info, attrsOffset + (attrMatch.index ?? 0));
    }
  }
  const textPattern = /<([A-Za-z_][\w.:]*)\b[^>]*>([^<]*\p{L}[^<]*)<\/\1>/giu;
  for (const match of withoutComments.matchAll(textPattern)) {
    if (!TEXT_TAGS.has(match[1].toLowerCase()))
      continue;
    push(match[2], { shape: "body", kind: `xaml-${match[1].toLowerCase()}-text`, purpose: "inline text shown to users in a XAML element" }, match.index ?? 0);
  }
  return hits;
}

// vendor/hedgeling-i18n/dist/adapters/xaml/index.js
var xamlAdapter = {
  name: "xaml",
  extensions: [".xaml", ".axaml"],
  identify: (source) => identifyXamlHits(source)
};

// vendor/hedgeling-i18n/dist/adapters/index.js
registerAdapter(reactTsAdapter);
registerAdapter(jsTsAdapter);
registerAdapter(htmlAdapter);
registerAdapter(vueAdapter);
registerAdapter(csharpAdapter);
registerAdapter(xamlAdapter);

// vendor/hedgeling-i18n/dist/vite/index.js
function defaultInclude(id) {
  const clean = id.split("?")[0] ?? id;
  if (clean.includes("node_modules"))
    return false;
  if (clean.includes("/vendor/hedgeling-i18n/"))
    return false;
  return /\.(tsx|jsx|ts|mts|cts|js|mjs|cjs)$/.test(clean) && !/\.d\.ts$/.test(clean);
}
function hedgelingI18n(options = {}) {
  const workspaceRoot2 = options.workspaceRoot ?? process.cwd();
  const runtimeModule = options.runtimeModule ?? "@hedgeling/i18n/runtime";
  const include = options.include ?? defaultInclude;
  const config = loadExtractConfig(workspaceRoot2);
  const adapters = selectAdapters(config.adapters, getAdapters());
  return {
    name: "hedgeling-i18n",
    enforce: "pre",
    transform(code, id) {
      if (!include(id))
        return null;
      const fileName = id.split("?")[0] ?? id;
      const adapter = pickAdapter(fileName, adapters);
      if (!adapter?.transform)
        return null;
      const result = adapter.transform(code, {
        fileName,
        contextOverrides: config.contextOverrides,
        translationFunctionNames: config.translationFunctionNames,
        objectFields: config.objectFields
      });
      if (!result)
        return null;
      const importLine = `import { ${result.imports.join(", ")} } from ${JSON.stringify(runtimeModule)}; ${IMPORT_MARKER}
`;
      return { code: importLine + result.code, map: null };
    }
  };
}

// vite.config.js
var __vite_injected_original_import_meta_url = "file:///C:/Users/u1088292/CascadeProjects/scroll-goblin/apps/web/vite.config.js";
var here = dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var workspaceRoot = resolve(here, "..", "..");
var runtimeEntry = resolve(here, "vendor/hedgeling-i18n/dist/runtime/index.js");
function includeForI18n(id) {
  var _a;
  var clean = (_a = id.split("?")[0]) !== null && _a !== void 0 ? _a : id;
  if (clean.includes("node_modules"))
    return false;
  if (clean.includes("/vendor/hedgeling-i18n/"))
    return false;
  if (clean.endsWith(".d.ts"))
    return false;
  return /\.(tsx|jsx|ts|mts)$/.test(clean);
}
var vite_config_default = defineConfig({
  plugins: [
    // enforce: "pre" -> auto-wraps JSX text/attributes with __hlT(...), emits
    // <Trans/> for inline markup, and wraps canvas text in .ts draw files BEFORE
    // @vitejs/plugin-react compiles the JSX.
    hedgelingI18n({ workspaceRoot, include: includeForI18n }),
    react()
  ],
  resolve: {
    // The plugin injects `import { __hlT, Trans } from "@hedgeling/i18n/runtime"`;
    // map it to the vendored runtime so there is a single copy.
    alias: {
      "@hedgeling/i18n/runtime": runtimeEntry
    },
    // Ensure one React instance (vendored runtime uses React hooks).
    dedupe: ["react", "react-dom"]
  },
  server: {
    port: 5173
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAidmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvY29yZS9jb25maWcuanMiLCAidmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvY29yZS9yZWdpc3RyeS5qcyIsICJ2ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy9lY21hc2NyaXB0L2lkZW50aWZ5LmpzIiwgInZlbmRvci9oZWRnZWxpbmctaTE4bi9kaXN0L2FkYXB0ZXJzL2VjbWFzY3JpcHQvanN4TWVzc2FnZS5qcyIsICJ2ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9jb3JlL3RleHQuanMiLCAidmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvYWRhcHRlcnMvZWNtYXNjcmlwdC9zaGFwZXMuanMiLCAidmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvYWRhcHRlcnMvZWNtYXNjcmlwdC90ZW1wbGF0ZU1lc3NhZ2UuanMiLCAidmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvY29yZS9zaGFwZXMuanMiLCAidmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvYWRhcHRlcnMvcmVhY3QtdHMvaW5kZXguanMiLCAidmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvYWRhcHRlcnMvanMtdHMvaW5kZXguanMiLCAidmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvYWRhcHRlcnMvaHRtbC9pZGVudGlmeS5qcyIsICJ2ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy9odG1sL2luZGV4LmpzIiwgInZlbmRvci9oZWRnZWxpbmctaTE4bi9kaXN0L2FkYXB0ZXJzL3Z1ZS9pZGVudGlmeS5qcyIsICJ2ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy92dWUvaW5kZXguanMiLCAidmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvYWRhcHRlcnMvY3NoYXJwL2xleGVyLmpzIiwgInZlbmRvci9oZWRnZWxpbmctaTE4bi9kaXN0L2FkYXB0ZXJzL2NzaGFycC9pZGVudGlmeS5qcyIsICJ2ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy9jc2hhcnAvaW5kZXguanMiLCAidmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvYWRhcHRlcnMveGFtbC9pZGVudGlmeS5qcyIsICJ2ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy94YW1sL2luZGV4LmpzIiwgInZlbmRvci9oZWRnZWxpbmctaTE4bi9kaXN0L2FkYXB0ZXJzL2luZGV4LmpzIiwgInZlbmRvci9oZWRnZWxpbmctaTE4bi9kaXN0L3ZpdGUvaW5kZXguanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1MTA4ODI5MlxcXFxDYXNjYWRlUHJvamVjdHNcXFxcc2Nyb2xsLWdvYmxpblxcXFxhcHBzXFxcXHdlYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3UxMDg4MjkyL0Nhc2NhZGVQcm9qZWN0cy9zY3JvbGwtZ29ibGluL2FwcHMvd2ViL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGlybmFtZSwgcmVzb2x2ZSB9IGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tIFwibm9kZTp1cmxcIjtcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XG4vLyBWZW5kb3JlZCBIZWRnZWxpbmcgaTE4biBidWlsZCAoc2VlIGFwcHMvd2ViL3ZlbmRvci9oZWRnZWxpbmctaTE4bikuXG5pbXBvcnQgeyBoZWRnZWxpbmdJMThuIH0gZnJvbSBcIi4vdmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3Qvdml0ZS9pbmRleC5qc1wiO1xudmFyIGhlcmUgPSBkaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XG52YXIgd29ya3NwYWNlUm9vdCA9IHJlc29sdmUoaGVyZSwgXCIuLlwiLCBcIi4uXCIpO1xudmFyIHJ1bnRpbWVFbnRyeSA9IHJlc29sdmUoaGVyZSwgXCJ2ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9ydW50aW1lL2luZGV4LmpzXCIpO1xuLy8gVHJhbnNmb3JtIG91ciBvd24gc291cmNlICgudHN4Ly5qc3ggZm9yIEpTWCBhdXRvLXdyYXAgKyA8VHJhbnMvPiwgYW5kIC50cyBmb3Jcbi8vIGNhbnZhcyBmaWxsVGV4dC9zdHJva2VUZXh0IGF1dG8td3JhcCksIGJ1dCBuZXZlciBub2RlX21vZHVsZXMsIGRlY2xhcmF0aW9uXG4vLyBmaWxlcywgb3IgdGhlIHZlbmRvcmVkIEhlZGdlbGluZyBydW50aW1lIGl0c2VsZi5cbmZ1bmN0aW9uIGluY2x1ZGVGb3JJMThuKGlkKSB7XG4gICAgdmFyIF9hO1xuICAgIHZhciBjbGVhbiA9IChfYSA9IGlkLnNwbGl0KFwiP1wiKVswXSkgIT09IG51bGwgJiYgX2EgIT09IHZvaWQgMCA/IF9hIDogaWQ7XG4gICAgaWYgKGNsZWFuLmluY2x1ZGVzKFwibm9kZV9tb2R1bGVzXCIpKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGNsZWFuLmluY2x1ZGVzKFwiL3ZlbmRvci9oZWRnZWxpbmctaTE4bi9cIikpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICBpZiAoY2xlYW4uZW5kc1dpdGgoXCIuZC50c1wiKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiAvXFwuKHRzeHxqc3h8dHN8bXRzKSQvLnRlc3QoY2xlYW4pO1xufVxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICAgIC8vIGVuZm9yY2U6IFwicHJlXCIgLT4gYXV0by13cmFwcyBKU1ggdGV4dC9hdHRyaWJ1dGVzIHdpdGggX19obFQoLi4uKSwgZW1pdHNcbiAgICAgICAgLy8gPFRyYW5zLz4gZm9yIGlubGluZSBtYXJrdXAsIGFuZCB3cmFwcyBjYW52YXMgdGV4dCBpbiAudHMgZHJhdyBmaWxlcyBCRUZPUkVcbiAgICAgICAgLy8gQHZpdGVqcy9wbHVnaW4tcmVhY3QgY29tcGlsZXMgdGhlIEpTWC5cbiAgICAgICAgaGVkZ2VsaW5nSTE4bih7IHdvcmtzcGFjZVJvb3Q6IHdvcmtzcGFjZVJvb3QsIGluY2x1ZGU6IGluY2x1ZGVGb3JJMThuIH0pLFxuICAgICAgICByZWFjdCgpLFxuICAgIF0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgICAvLyBUaGUgcGx1Z2luIGluamVjdHMgYGltcG9ydCB7IF9faGxULCBUcmFucyB9IGZyb20gXCJAaGVkZ2VsaW5nL2kxOG4vcnVudGltZVwiYDtcbiAgICAgICAgLy8gbWFwIGl0IHRvIHRoZSB2ZW5kb3JlZCBydW50aW1lIHNvIHRoZXJlIGlzIGEgc2luZ2xlIGNvcHkuXG4gICAgICAgIGFsaWFzOiB7XG4gICAgICAgICAgICBcIkBoZWRnZWxpbmcvaTE4bi9ydW50aW1lXCI6IHJ1bnRpbWVFbnRyeSxcbiAgICAgICAgfSxcbiAgICAgICAgLy8gRW5zdXJlIG9uZSBSZWFjdCBpbnN0YW5jZSAodmVuZG9yZWQgcnVudGltZSB1c2VzIFJlYWN0IGhvb2tzKS5cbiAgICAgICAgZGVkdXBlOiBbXCJyZWFjdFwiLCBcInJlYWN0LWRvbVwiXSxcbiAgICB9LFxuICAgIHNlcnZlcjoge1xuICAgICAgICBwb3J0OiA1MTczLFxuICAgIH0sXG59KTtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcY29yZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcY29yZVxcXFxjb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3UxMDg4MjkyL0Nhc2NhZGVQcm9qZWN0cy9zY3JvbGwtZ29ibGluL2FwcHMvd2ViL3ZlbmRvci9oZWRnZWxpbmctaTE4bi9kaXN0L2NvcmUvY29uZmlnLmpzXCI7aW1wb3J0IGZzIGZyb20gXCJub2RlOmZzXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwibm9kZTpwYXRoXCI7XG5leHBvcnQgY29uc3QgQ09ORklHX1JFTEFUSVZFX1BBVEggPSBwYXRoLmpvaW4oXCIuaGVkZ2VsaW5nXCIsIFwiZXh0cmFjdC5jb25maWcuanNvblwiKTtcbmV4cG9ydCBjb25zdCBERUZBVUxUX0NPTkZJRyA9IHtcbiAgICBzb3VyY2VMb2NhbGU6IFwiZW4tVVNcIixcbiAgICBsb2NhbGVzOiBbXSxcbiAgICBzY2FuUm9vdHM6IFtcInNyY1wiLCBcImluZGV4Lmh0bWxcIl0sXG4gICAgb3V0cHV0RGlyOiBcImFwcHMvd2ViL2kxOG5cIixcbiAgICBpZ25vcmVkRGlyczogW1wiLmdpdFwiLCBcIi5oZWRnZWxpbmdcIiwgXCJidWlsZFwiLCBcImRpc3RcIiwgXCJub2RlX21vZHVsZXNcIl0sXG4gICAgLy8gRW1wdHkgPSBkZXJpdmUgc2Nhbm5lZCBleHRlbnNpb25zIGZyb20gdGhlIGVuYWJsZWQgYWRhcHRlcnMgKHJlY29tbWVuZGVkKS5cbiAgICAvLyBTZXQgZXhwbGljaXRseSB0byBuYXJyb3cgc2Nhbm5pbmcgdG8gYSBzdWJzZXQgb2YgdGhvc2UgZXh0ZW5zaW9ucy5cbiAgICBzb3VyY2VFeHRlbnNpb25zOiBbXSxcbiAgICB0cmFuc2xhdGlvbkZ1bmN0aW9uTmFtZXM6IFtcInRcIiwgXCJfX2hsVFwiXSxcbiAgICBvYmplY3RGaWVsZHM6IFtcbiAgICAgICAgXCJ0aXRsZVwiLFxuICAgICAgICBcInN1YnRpdGxlXCIsXG4gICAgICAgIFwic2hvcnRUaXRsZVwiLFxuICAgICAgICBcImhlYWRpbmdcIixcbiAgICAgICAgXCJzdWJoZWFkaW5nXCIsXG4gICAgICAgIFwiZGVzY3JpcHRpb25cIixcbiAgICAgICAgXCJsYWJlbFwiLFxuICAgICAgICBcImNhcHRpb25cIixcbiAgICAgICAgXCJibHVyYlwiLFxuICAgICAgICBcImN0YVwiLFxuICAgICAgICBcIm1lc3NhZ2VcIixcbiAgICAgICAgXCJ0b29sdGlwXCIsXG4gICAgICAgIFwicGxhY2Vob2xkZXJcIixcbiAgICAgICAgXCJuYW1lXCIsXG4gICAgICAgIFwidGV4dFwiLFxuICAgICAgICBcImNvbnRlbnRcIixcbiAgICAgICAgXCJzdW1tYXJ5XCIsXG4gICAgICAgIFwiYm9keVwiLFxuICAgICAgICBcInByb21wdFwiLFxuICAgICAgICBcInF1ZXN0aW9uXCIsXG4gICAgICAgIFwiYW5zd2VyXCIsXG4gICAgICAgIFwiaGludFwiLFxuICAgICAgICBcImdvYWxcIixcbiAgICAgICAgXCJub3RlXCIsXG4gICAgICAgIFwiY2FyZFwiLFxuICAgICAgICBcImxlc3NvblwiLFxuICAgICAgICBcImVycm9yXCIsXG4gICAgXSxcbiAgICBjb250ZXh0T3ZlcnJpZGVzOiB7fSxcbiAgICBhZGFwdGVyczogW10sXG4gICAgcmVzb3VyY2VGb3JtYXRzOiBbXSxcbiAgICByZXNvdXJjZURpcjogXCJpMThuL3Jlc291cmNlc1wiLFxufTtcbmZ1bmN0aW9uIGFzU3RyaW5nQXJyYXkodmFsdWUsIGZhbGxiYWNrKSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHZhbHVlKSlcbiAgICAgICAgcmV0dXJuIGZhbGxiYWNrO1xuICAgIGNvbnN0IG91dCA9IHZhbHVlLmZpbHRlcigoaXRlbSkgPT4gdHlwZW9mIGl0ZW0gPT09IFwic3RyaW5nXCIpO1xuICAgIHJldHVybiBvdXQubGVuZ3RoID4gMCA/IG91dCA6IGZhbGxiYWNrO1xufVxuLy8gUmVhZCBhbmQgbm9ybWFsaXplIC5oZWRnZWxpbmcvZXh0cmFjdC5jb25maWcuanNvbiBmcm9tIGEgd29ya3NwYWNlIHJvb3QuXG4vLyBNaXNzaW5nL2ludmFsaWQgZmllbGRzIGZhbGwgYmFjayB0byBERUZBVUxUX0NPTkZJRy5cbmV4cG9ydCBmdW5jdGlvbiBsb2FkRXh0cmFjdENvbmZpZyh3b3Jrc3BhY2VSb290KSB7XG4gICAgY29uc3QgY29uZmlnUGF0aCA9IHBhdGguam9pbih3b3Jrc3BhY2VSb290LCBDT05GSUdfUkVMQVRJVkVfUEFUSCk7XG4gICAgbGV0IHBhcnNlZCA9IHt9O1xuICAgIHRyeSB7XG4gICAgICAgIHBhcnNlZCA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGNvbmZpZ1BhdGgsIFwidXRmOFwiKSk7XG4gICAgfVxuICAgIGNhdGNoIHtcbiAgICAgICAgcGFyc2VkID0ge307XG4gICAgfVxuICAgIGNvbnN0IG92ZXJyaWRlcyA9IHBhcnNlZC5jb250ZXh0T3ZlcnJpZGVzICYmIHR5cGVvZiBwYXJzZWQuY29udGV4dE92ZXJyaWRlcyA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShwYXJzZWQuY29udGV4dE92ZXJyaWRlcylcbiAgICAgICAgPyBwYXJzZWQuY29udGV4dE92ZXJyaWRlc1xuICAgICAgICA6IERFRkFVTFRfQ09ORklHLmNvbnRleHRPdmVycmlkZXM7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc291cmNlTG9jYWxlOiB0eXBlb2YgcGFyc2VkLnNvdXJjZUxvY2FsZSA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlZC5zb3VyY2VMb2NhbGUgOiBERUZBVUxUX0NPTkZJRy5zb3VyY2VMb2NhbGUsXG4gICAgICAgIGxvY2FsZXM6IGFzU3RyaW5nQXJyYXkocGFyc2VkLmxvY2FsZXMsIERFRkFVTFRfQ09ORklHLmxvY2FsZXMpLFxuICAgICAgICBzY2FuUm9vdHM6IGFzU3RyaW5nQXJyYXkocGFyc2VkLnNjYW5Sb290cywgREVGQVVMVF9DT05GSUcuc2NhblJvb3RzKSxcbiAgICAgICAgb3V0cHV0RGlyOiB0eXBlb2YgcGFyc2VkLm91dHB1dERpciA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlZC5vdXRwdXREaXIgOiBERUZBVUxUX0NPTkZJRy5vdXRwdXREaXIsXG4gICAgICAgIGlnbm9yZWREaXJzOiBhc1N0cmluZ0FycmF5KHBhcnNlZC5pZ25vcmVkRGlycywgREVGQVVMVF9DT05GSUcuaWdub3JlZERpcnMpLFxuICAgICAgICBzb3VyY2VFeHRlbnNpb25zOiBhc1N0cmluZ0FycmF5KHBhcnNlZC5zb3VyY2VFeHRlbnNpb25zLCBERUZBVUxUX0NPTkZJRy5zb3VyY2VFeHRlbnNpb25zKSxcbiAgICAgICAgdHJhbnNsYXRpb25GdW5jdGlvbk5hbWVzOiBhc1N0cmluZ0FycmF5KHBhcnNlZC50cmFuc2xhdGlvbkZ1bmN0aW9uTmFtZXMsIERFRkFVTFRfQ09ORklHLnRyYW5zbGF0aW9uRnVuY3Rpb25OYW1lcyksXG4gICAgICAgIG9iamVjdEZpZWxkczogYXNTdHJpbmdBcnJheShwYXJzZWQub2JqZWN0RmllbGRzLCBERUZBVUxUX0NPTkZJRy5vYmplY3RGaWVsZHMpLFxuICAgICAgICBjb250ZXh0T3ZlcnJpZGVzOiBvdmVycmlkZXMsXG4gICAgICAgIGFkYXB0ZXJzOiBhc1N0cmluZ0FycmF5KHBhcnNlZC5hZGFwdGVycywgREVGQVVMVF9DT05GSUcuYWRhcHRlcnMpLFxuICAgICAgICByZXNvdXJjZUZvcm1hdHM6IGFzU3RyaW5nQXJyYXkocGFyc2VkLnJlc291cmNlRm9ybWF0cywgREVGQVVMVF9DT05GSUcucmVzb3VyY2VGb3JtYXRzKSxcbiAgICAgICAgcmVzb3VyY2VEaXI6IHR5cGVvZiBwYXJzZWQucmVzb3VyY2VEaXIgPT09IFwic3RyaW5nXCIgPyBwYXJzZWQucmVzb3VyY2VEaXIgOiBERUZBVUxUX0NPTkZJRy5yZXNvdXJjZURpcixcbiAgICB9O1xufVxuZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZ0V4aXN0cyh3b3Jrc3BhY2VSb290KSB7XG4gICAgcmV0dXJuIGZzLmV4aXN0c1N5bmMocGF0aC5qb2luKHdvcmtzcGFjZVJvb3QsIENPTkZJR19SRUxBVElWRV9QQVRIKSk7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGNvcmVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGNvcmVcXFxccmVnaXN0cnkuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3UxMDg4MjkyL0Nhc2NhZGVQcm9qZWN0cy9zY3JvbGwtZ29ibGluL2FwcHMvd2ViL3ZlbmRvci9oZWRnZWxpbmctaTE4bi9kaXN0L2NvcmUvcmVnaXN0cnkuanNcIjtpbXBvcnQgcGF0aCBmcm9tIFwibm9kZTpwYXRoXCI7XG4vLyBNdXRhYmxlIHJlZ2lzdHJ5IG9mIHNvdXJjZSBhZGFwdGVycy4gQ29yZSBzaGlwcyBFTVBUWSBzbyBpdCBjYXJyaWVzIG5vXG4vLyBsYW5ndWFnZS9mcmFtZXdvcmsgZGVwZW5kZW5jeSAoZS5nLiB0eXBlc2NyaXB0KS4gQWRhcHRlciBwYWNrYWdlcyBcdTIwMTQgb3IgdGhlXG4vLyBidWlsdGluIGJhcnJlbCAoc3JjL2FkYXB0ZXJzL2luZGV4LnRzKSBcdTIwMTQgY2FsbCByZWdpc3RlckFkYXB0ZXIgdG8gYWRkIHRoZW1zZWx2ZXMuXG5jb25zdCByZWdpc3RyeSA9IFtdO1xuLy8gUmVnaXN0ZXIgKG9yIHJlcGxhY2UsIGJ5IG5hbWUpIGFuIGFkYXB0ZXIuIElkZW1wb3RlbnQ6IHJlZ2lzdGVyaW5nIHRoZSBzYW1lXG4vLyBuYW1lIHR3aWNlIGtlZXBzIGEgc2luZ2xlIGVudHJ5LCBzbyBpbXBvcnRpbmcgdGhlIGJ1aWx0aW5zIHJlcGVhdGVkbHkgaXMgc2FmZS5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckFkYXB0ZXIoYWRhcHRlcikge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gcmVnaXN0cnkuZmluZEluZGV4KChhKSA9PiBhLm5hbWUgPT09IGFkYXB0ZXIubmFtZSk7XG4gICAgaWYgKGV4aXN0aW5nID49IDApXG4gICAgICAgIHJlZ2lzdHJ5W2V4aXN0aW5nXSA9IGFkYXB0ZXI7XG4gICAgZWxzZVxuICAgICAgICByZWdpc3RyeS5wdXNoKGFkYXB0ZXIpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGdldEFkYXB0ZXJzKCkge1xuICAgIHJldHVybiByZWdpc3RyeTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBjbGVhckFkYXB0ZXJzKCkge1xuICAgIHJlZ2lzdHJ5Lmxlbmd0aCA9IDA7XG59XG4vLyBSZXN0cmljdCBhIHNldCBvZiBhZGFwdGVycyB0byB0aGUgbmFtZXMgaW4gYG5hbWVzYCAoaW4gcmVnaXN0cnkgb3JkZXIpLiBBblxuLy8gZW1wdHkvdW5kZWZpbmVkIGxpc3QgbWVhbnMgXCJhbGxcIi4gVW5rbm93biBuYW1lcyBhcmUgaWdub3JlZC5cbmV4cG9ydCBmdW5jdGlvbiBzZWxlY3RBZGFwdGVycyhuYW1lcywgYWRhcHRlcnMgPSByZWdpc3RyeSkge1xuICAgIGlmICghbmFtZXMgfHwgbmFtZXMubGVuZ3RoID09PSAwKVxuICAgICAgICByZXR1cm4gYWRhcHRlcnM7XG4gICAgY29uc3Qgd2FudGVkID0gbmV3IFNldChuYW1lcyk7XG4gICAgcmV0dXJuIGFkYXB0ZXJzLmZpbHRlcigoYSkgPT4gd2FudGVkLmhhcyhhLm5hbWUpKTtcbn1cbi8vIFBpY2sgdGhlIGFkYXB0ZXIgd2hvc2UgZXh0ZW5zaW9uIGxpc3QgY292ZXJzIHRoZSBmaWxlLiBgYWRhcHRlcnNgIGRlZmF1bHRzIHRvXG4vLyB0aGUgZ2xvYmFsIHJlZ2lzdHJ5OyBwYXNzIGFuIGV4cGxpY2l0IGxpc3QgKGUuZy4gY29uZmlnLWZpbHRlcmVkKSB0byBzY29wZSBpdC5cbmV4cG9ydCBmdW5jdGlvbiBwaWNrQWRhcHRlcihmaWxlTmFtZSwgYWRhcHRlcnMgPSByZWdpc3RyeSkge1xuICAgIGNvbnN0IGV4dCA9IHBhdGguZXh0bmFtZShmaWxlTmFtZSkudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gYWRhcHRlcnMuZmluZCgoYWRhcHRlcikgPT4gYWRhcHRlci5leHRlbnNpb25zLmluY2x1ZGVzKGV4dCkpID8/IG51bGw7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXGVjbWFzY3JpcHRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXGVjbWFzY3JpcHRcXFxcaWRlbnRpZnkuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3UxMDg4MjkyL0Nhc2NhZGVQcm9qZWN0cy9zY3JvbGwtZ29ibGluL2FwcHMvd2ViL3ZlbmRvci9oZWRnZWxpbmctaTE4bi9kaXN0L2FkYXB0ZXJzL2VjbWFzY3JpcHQvaWRlbnRpZnkuanNcIjtpbXBvcnQgdHMgZnJvbSBcInR5cGVzY3JpcHRcIjtcbmltcG9ydCB7IGJ1aWxkSnN4TWVzc2FnZSB9IGZyb20gXCIuL2pzeE1lc3NhZ2UuanNcIjtcbmltcG9ydCB7IGpzeEVsZW1lbnRJbmZvLCBpc0lubGluZVRleHRUYWcgfSBmcm9tIFwiLi9zaGFwZXMuanNcIjtcbmltcG9ydCB7IGJ1aWxkVGVtcGxhdGVNZXNzYWdlIH0gZnJvbSBcIi4vdGVtcGxhdGVNZXNzYWdlLmpzXCI7XG5pbXBvcnQgeyBwcm9wU2hhcGVzIH0gZnJvbSBcIi4uLy4uL2NvcmUvc2hhcGVzLmpzXCI7XG5pbXBvcnQgeyBpc1Byb2JhYmx5VHJhbnNsYXRhYmxlLCBsb29rc1RlY2huaWNhbCwgbm9ybWFsaXplVGV4dCB9IGZyb20gXCIuLi8uLi9jb3JlL3RleHQuanNcIjtcbi8vIFRydWUgd2hlbiB0aGUgbWVzc2FnZSBoYXMgcmVhbCB3b3JkcyBvdXRzaWRlIG9mIHtuYW1lfSBwbGFjZWhvbGRlcnMsIHNvIGFcbi8vIHB1cmUtc3Vic3RpdHV0aW9uIHRlbXBsYXRlIGxpa2UgYCR7Y291bnR9YCAoXCJ7Y291bnR9XCIpIGlzIG5vdCBleHRyYWN0ZWQuXG5mdW5jdGlvbiBoYXNXb3Jkc091dHNpZGVQbGFjZWhvbGRlcnMobWVzc2FnZSkge1xuICAgIHJldHVybiAvXFxwe0x9L3UudGVzdChtZXNzYWdlLnJlcGxhY2UoL1xce1thLXpBLVowLTlfXStcXH0vZywgXCJcIikpO1xufVxuY29uc3QgREVGQVVMVF9UUkFOU0xBVElPTl9GTlMgPSBbXCJ0XCIsIFwiX19obFRcIl07XG5jb25zdCBJTVBPUlRfTUFSS0VSID0gXCIvKiBAaGVkZ2VsaW5nL2kxOG46IGF1dG8td3JhcCAqL1wiO1xuZnVuY3Rpb24gcHJvcGVydHlOYW1lKG5hbWUpIHtcbiAgICBpZiAodHMuaXNJZGVudGlmaWVyKG5hbWUpKVxuICAgICAgICByZXR1cm4gbmFtZS50ZXh0O1xuICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwobmFtZSkpXG4gICAgICAgIHJldHVybiBuYW1lLnRleHQ7XG4gICAgcmV0dXJuIG51bGw7XG59XG5mdW5jdGlvbiBqc3hUYWdOYW1lKG5vZGUpIHtcbiAgICBjb25zdCBuYW1lID0gbm9kZS50YWdOYW1lO1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIobmFtZSkpXG4gICAgICAgIHJldHVybiBuYW1lLnRleHQ7XG4gICAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5hbWUpKVxuICAgICAgICByZXR1cm4gbmFtZS5uYW1lLnRleHQ7XG4gICAgcmV0dXJuIG5hbWUuZ2V0VGV4dCgpO1xufVxuZnVuY3Rpb24gc3RyaW5nTGl0ZXJhbFZhbHVlKG5vZGUpIHtcbiAgICBpZiAoIW5vZGUpXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIGlmICh0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkgfHwgdHMuaXNOb1N1YnN0aXR1dGlvblRlbXBsYXRlTGl0ZXJhbChub2RlKSlcbiAgICAgICAgcmV0dXJuIG5vZGUudGV4dDtcbiAgICBpZiAodHMuaXNKc3hFeHByZXNzaW9uKG5vZGUpICYmIG5vZGUuZXhwcmVzc2lvbilcbiAgICAgICAgcmV0dXJuIHN0cmluZ0xpdGVyYWxWYWx1ZShub2RlLmV4cHJlc3Npb24pO1xuICAgIHJldHVybiBudWxsO1xufVxuZnVuY3Rpb24gc3RyaW5nTGl0ZXJhbFdyYXAobm9kZSwgc291cmNlRmlsZSkge1xuICAgIGlmICghbm9kZSlcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbChub2RlKSB8fCB0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKG5vZGUpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0ZXh0OiBub2RlLnRleHQsXG4gICAgICAgICAgICBzdGFydDogbm9kZS5nZXRTdGFydChzb3VyY2VGaWxlKSxcbiAgICAgICAgICAgIGVuZDogbm9kZS5nZXRFbmQoKSxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG4vLyBDb2xsZWN0IHRoZSBwbGFpbi10ZXh0IGNvbnRlbnQgb2YgYSBKU1ggZWxlbWVudCdzIGNoaWxkcmVuLCBidXQgT05MWSB3aGVuIHRoZVxuLy8gY2hpbGRyZW4gYXJlIHNhZmUgdG8gcmVwbGFjZSB3aG9sZXNhbGUgd2l0aCBhIHNpbmdsZSB0KCkgY2FsbC4gSWYgYW55IGNoaWxkIGlzIGFcbi8vIG5lc3RlZCBlbGVtZW50IG9yIGEgZHluYW1pYyBleHByZXNzaW9uLCByZXR1cm4gbnVsbCAoZG8gbm90IGF1dG8td3JhcCkuXG5mdW5jdGlvbiBwdXJlVGV4dENoaWxkcmVuKGNoaWxkcmVuKSB7XG4gICAgY29uc3QgcGFydHMgPSBbXTtcbiAgICBsZXQgc2F3VGV4dCA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pIHtcbiAgICAgICAgaWYgKHRzLmlzSnN4VGV4dChjaGlsZCkpIHtcbiAgICAgICAgICAgIHBhcnRzLnB1c2goY2hpbGQudGV4dCk7XG4gICAgICAgICAgICBpZiAoY2hpbGQudGV4dC50cmltKCkpXG4gICAgICAgICAgICAgICAgc2F3VGV4dCA9IHRydWU7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHMuaXNKc3hFeHByZXNzaW9uKGNoaWxkKSkge1xuICAgICAgICAgICAgaWYgKCFjaGlsZC5leHByZXNzaW9uKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlOyAvLyB7LyogY29tbWVudCAqL30gb3IgZW1wdHlcbiAgICAgICAgICAgIGNvbnN0IGxpdGVyYWwgPSBzdHJpbmdMaXRlcmFsVmFsdWUoY2hpbGQuZXhwcmVzc2lvbik7XG4gICAgICAgICAgICBpZiAobGl0ZXJhbCA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDsgLy8gZHluYW1pYyBleHByZXNzaW9uIC0+IHVuc2FmZVxuICAgICAgICAgICAgcGFydHMucHVzaChsaXRlcmFsKTtcbiAgICAgICAgICAgIHNhd1RleHQgPSB0cnVlO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQW55IGVsZW1lbnQvZnJhZ21lbnQvc2VsZi1jbG9zaW5nIGNoaWxkIG1ha2VzIHdob2xlc2FsZSByZXBsYWNlbWVudCB1bnNhZmUuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gc2F3VGV4dCA/IHBhcnRzLmpvaW4oXCJcIikgOiBudWxsO1xufVxuLy8gRGV0ZWN0IEpTWCBjaGlsZHJlbiB0aGF0IGludGVybGVhdmUgaHVtYW4tcmVhZGFibGUgd29yZHMgd2l0aCBhIERZTkFNSUMgdmFsdWVcbi8vIChhIGB7ZXhwcmVzc2lvbn1gIHNpYmxpbmcsIG9yIGEgdmFsdWUgcmVuZGVyZWQgaW1wZXJhdGl2ZWx5IHRocm91Z2ggYSBjaGlsZCB0aGF0XG4vLyBjYXJyaWVzIGEgcmVmIC8gZXZlbnQgaGFuZGxlcikgeWV0IHByb2R1Y2UgTk8gc2luZ2xlIHRyYW5zbGF0YWJsZSBtZXNzYWdlOlxuLy8gcHVyZVRleHRDaGlsZHJlbiByZWplY3RzIHRoZSBkeW5hbWljIHBhcnQsIGJ1aWxkSnN4TWVzc2FnZSBvbmx5IGVtaXRzIGEgPFRyYW5zPlxuLy8gd2hlbiB0aGVyZSBpcyBpbmxpbmUgKm1hcmt1cCogKGEgdGV4dC1iZWFyaW5nIGVsZW1lbnQpLCBhbmQgcmVmL2hhbmRsZXIgY2hpbGRyZW5cbi8vIGFyZSBkZWxpYmVyYXRlbHkgbGVmdCB1bndyYXBwZWQuIFRoZSBzdGF0aWMgd29yZHMgYXJlIHRoZW4gb3JwaGFuZWQgXHUyMDE0IG5ldmVyXG4vLyBleHRyYWN0ZWQsIG5ldmVyIHRyYW5zbGF0ZWQgXHUyMDE0IGFuZCB0aGVpciBvcmRlciBjYW4ndCBiZSBsb2NhbGl6ZWQuIFRoZSBvbmx5XG4vLyBjb3JyZWN0IGZpeCBpcyBhIGhhbmQtYXV0aG9yZWQgSUNVIG1lc3NhZ2U6IHQoXCJBZ2Uge259IG1vXCIsIHsgbiB9KS4gV2Ugc3VyZmFjZVxuLy8gdGhlc2UgYXMgYWN0aW9uYWJsZSBcInJlcXVpcmVkXCIgZGlhZ25vc3RpY3MgaW5zdGVhZCBvZiBzaWxlbnRseSBkcm9wcGluZyB0aGVtLlxuLy8gUmV0dXJucyB0aGUgc3ludGhlc2l6ZWQgbWVzc2FnZSAod2l0aCB7cGxhY2Vob2xkZXJzfSkgYW5kIHdoZXRoZXIgYSByZWYvaGFuZGxlclxuLy8gdmFsdWUgaXMgaW52b2x2ZWQgKHNvIHRoZSBoaW50IGNhbiBjYWxsIG91dCB0aGUgcmVmIC0+IFJlYWN0IHN0YXRlIGNoYW5nZSkuXG5mdW5jdGlvbiBkZXRlY3RNYW51YWxUTmVlZChjaGlsZHJlbikge1xuICAgIGxldCBvdXQgPSBcIlwiO1xuICAgIGxldCBzYXdXb3JkcyA9IGZhbHNlO1xuICAgIGxldCBzYXdEeW5hbWljID0gZmFsc2U7XG4gICAgbGV0IHJlZkRyaXZlbiA9IGZhbHNlO1xuICAgIGxldCBhbm9uID0gMDtcbiAgICBjb25zdCBhbm9uTmFtZSA9ICgpID0+IHtcbiAgICAgICAgYW5vbiArPSAxO1xuICAgICAgICByZXR1cm4gYW5vbiA9PT0gMSA/IFwidmFsdWVcIiA6IGB2YWx1ZSR7YW5vbn1gO1xuICAgIH07XG4gICAgY29uc3QgZXhwck5hbWUgPSAoZXhwcikgPT4ge1xuICAgICAgICBpZiAodHMuaXNJZGVudGlmaWVyKGV4cHIpKVxuICAgICAgICAgICAgcmV0dXJuIGV4cHIudGV4dDtcbiAgICAgICAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGV4cHIpKVxuICAgICAgICAgICAgcmV0dXJuIGV4cHIubmFtZS50ZXh0O1xuICAgICAgICByZXR1cm4gYW5vbk5hbWUoKTtcbiAgICB9O1xuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pIHtcbiAgICAgICAgaWYgKHRzLmlzSnN4VGV4dChjaGlsZCkpIHtcbiAgICAgICAgICAgIG91dCArPSBjaGlsZC50ZXh0O1xuICAgICAgICAgICAgaWYgKC9cXHB7TH0vdS50ZXN0KGNoaWxkLnRleHQpKVxuICAgICAgICAgICAgICAgIHNhd1dvcmRzID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0cy5pc0pzeEV4cHJlc3Npb24oY2hpbGQpKSB7XG4gICAgICAgICAgICBpZiAoIWNoaWxkLmV4cHJlc3Npb24pXG4gICAgICAgICAgICAgICAgY29udGludWU7IC8vIHsvKiBjb21tZW50ICovfVxuICAgICAgICAgICAgY29uc3QgbGl0ZXJhbCA9IHN0cmluZ0xpdGVyYWxWYWx1ZShjaGlsZC5leHByZXNzaW9uKTtcbiAgICAgICAgICAgIGlmIChsaXRlcmFsICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IGxpdGVyYWw7XG4gICAgICAgICAgICAgICAgaWYgKC9cXHB7TH0vdS50ZXN0KGxpdGVyYWwpKVxuICAgICAgICAgICAgICAgICAgICBzYXdXb3JkcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQgKz0gYHske2V4cHJOYW1lKGNoaWxkLmV4cHJlc3Npb24pfX1gO1xuICAgICAgICAgICAgc2F3RHluYW1pYyA9IHRydWU7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHMuaXNKc3hFbGVtZW50KGNoaWxkKSB8fCB0cy5pc0pzeFNlbGZDbG9zaW5nRWxlbWVudChjaGlsZCkpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wZW5pbmcgPSB0cy5pc0pzeEVsZW1lbnQoY2hpbGQpID8gY2hpbGQub3BlbmluZ0VsZW1lbnQgOiBjaGlsZDtcbiAgICAgICAgICAgIGlmICghaXNJbmxpbmVUZXh0VGFnKGpzeFRhZ05hbWUob3BlbmluZykpKVxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsOyAvLyBsYXlvdXQvY29tcG9uZW50IC0+IHRvbyBjb21wbGV4XG4gICAgICAgICAgICBsZXQgcmVmTmFtZSA9IG51bGw7XG4gICAgICAgICAgICBsZXQgYmVoYXZpb3JhbCA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yIChjb25zdCBhdHRyIG9mIG9wZW5pbmcuYXR0cmlidXRlcy5wcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRzLmlzSnN4U3ByZWFkQXR0cmlidXRlKGF0dHIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGJlaGF2aW9yYWwgPSB0cnVlOyAvLyB7Li4ucHJvcHN9IG1heSBjYXJyeSBhIHJlZi9oYW5kbGVyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodHMuaXNKc3hBdHRyaWJ1dGUoYXR0cikgJiYgdHMuaXNJZGVudGlmaWVyKGF0dHIubmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXR0ck5hbWUgPSBhdHRyLm5hbWUudGV4dDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJOYW1lID09PSBcInJlZlwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBiZWhhdmlvcmFsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGluaXQgPSBhdHRyLmluaXRpYWxpemVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluaXQgJiYgdHMuaXNKc3hFeHByZXNzaW9uKGluaXQpICYmIGluaXQuZXhwcmVzc2lvbiAmJiB0cy5pc0lkZW50aWZpZXIoaW5pdC5leHByZXNzaW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZk5hbWUgPSBpbml0LmV4cHJlc3Npb24udGV4dC5yZXBsYWNlKC9SZWYkLywgXCJcIikgfHwgbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgvXm9uW0EtWl0vLnRlc3QoYXR0ck5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBiZWhhdmlvcmFsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEFuIGlubGluZSBlbGVtZW50IHdpdGggaXRzIG93biB0ZXh0IGFuZCBOTyByZWYvaGFuZGxlciBpcyBnZW51aW5lIG1hcmt1cFxuICAgICAgICAgICAgLy8gKGUuZy4gPGE+aGVyZTwvYT4pOiB0aGF0IGlzIGJ1aWxkSnN4TWVzc2FnZS88VHJhbnM+J3Mgam9iLCBub3QgbWFudWFsIHQoKS5cbiAgICAgICAgICAgIGlmICghYmVoYXZpb3JhbClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIG91dCArPSBgeyR7cmVmTmFtZSA/PyBhbm9uTmFtZSgpfX1gO1xuICAgICAgICAgICAgc2F3RHluYW1pYyA9IHRydWU7XG4gICAgICAgICAgICByZWZEcml2ZW4gPSB0cnVlO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7IC8vIGZyYWdtZW50L290aGVyIC0+IGJhaWxcbiAgICB9XG4gICAgY29uc3QgbWVzc2FnZSA9IG5vcm1hbGl6ZVRleHQob3V0KTtcbiAgICBpZiAoIXNhd1dvcmRzIHx8ICFzYXdEeW5hbWljIHx8ICFtZXNzYWdlKVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICBpZiAoIS9cXHtbQS1aYS16MC05X10rXFx9Ly50ZXN0KG1lc3NhZ2UpKVxuICAgICAgICByZXR1cm4gbnVsbDsgLy8gbmVlZCBhdCBsZWFzdCBvbmUgcGxhY2Vob2xkZXJcbiAgICBpZiAobG9va3NUZWNobmljYWwobWVzc2FnZSkpXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIHJldHVybiB7IG1lc3NhZ2UsIHJlZkRyaXZlbiB9O1xufVxuZnVuY3Rpb24gY2FsbE5hbWUobm9kZSkge1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIobm9kZSkpXG4gICAgICAgIHJldHVybiBub2RlLnRleHQ7XG4gICAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5vZGUpKVxuICAgICAgICByZXR1cm4gbm9kZS5uYW1lLnRleHQ7XG4gICAgcmV0dXJuIG51bGw7XG59XG4vLyBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgdGV4dC1kcmF3aW5nIG1ldGhvZHMuIFRoZWlyIGZpcnN0IGFyZ3VtZW50IGlzIHRleHRcbi8vIHBhaW50ZWQgdG8gYSA8Y2FudmFzPiBcdTIwMTQgdGhlcmUgaXMgbm8gRE9NIG5vZGUsIHNvIGl0IGNhbiBvbmx5IGJlIHRyYW5zbGF0ZWQgYnlcbi8vIHdyYXBwaW5nIHRoZSBhcmd1bWVudCBhdCBidWlsZCB0aW1lICh0aGUgRE9NIGluamVjdG9yIGNhbiBuZXZlciByZWFjaCBpdCkuXG5jb25zdCBDQU5WQVNfVEVYVF9NRVRIT0RTID0gbmV3IFNldChbXCJmaWxsVGV4dFwiLCBcInN0cm9rZVRleHRcIl0pO1xuLy8gVHJ1ZSB3aGVuIGBub2RlYCBpcyB0aGUgdGV4dCAoZmlyc3QpIGFyZ3VtZW50IG9mIGEgY2FudmFzIGZpbGxUZXh0L3N0cm9rZVRleHRcbi8vIGNhbGwsIGUuZy4gY3R4LmZpbGxUZXh0KFwiSE9NRVwiLCB4LCB5KSBvciB0aGlzLmMuc3Ryb2tlVGV4dChgQWdlICR7bn1gLCAuLi4pLlxuZnVuY3Rpb24gaXNDYW52YXNUZXh0QXJnKG5vZGUpIHtcbiAgICBjb25zdCBwYXJlbnQgPSBub2RlLnBhcmVudDtcbiAgICBpZiAoIXBhcmVudCB8fCAhdHMuaXNDYWxsRXhwcmVzc2lvbihwYXJlbnQpKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHBhcmVudC5hcmd1bWVudHNbMF0gIT09IG5vZGUpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHBhcmVudC5leHByZXNzaW9uKSAmJlxuICAgICAgICBDQU5WQVNfVEVYVF9NRVRIT0RTLmhhcyhwYXJlbnQuZXhwcmVzc2lvbi5uYW1lLnRleHQpKTtcbn1cbi8vIENhbGxlZXMgd2hvc2Ugc3RyaW5nIGFyZ3VtZW50cyBhcmUgbmV2ZXIgdXNlci1mYWNpbmcgVUkgY29weS5cbmNvbnN0IERFTllfQ0FMTEVFUyA9IG5ldyBTZXQoW1xuICAgIFwidFwiLFxuICAgIFwiX19obFRcIixcbiAgICBcImxvZ1wiLFxuICAgIFwid2FyblwiLFxuICAgIFwiZXJyb3JcIixcbiAgICBcImluZm9cIixcbiAgICBcImRlYnVnXCIsXG4gICAgXCJ0cmFjZVwiLFxuICAgIFwiYXNzZXJ0XCIsXG4gICAgXCJncm91cFwiLFxuICAgIFwiZ3JvdXBFbmRcIixcbiAgICBcImdldEl0ZW1cIixcbiAgICBcInNldEl0ZW1cIixcbiAgICBcInJlbW92ZUl0ZW1cIixcbiAgICBcImdldEVsZW1lbnRCeUlkXCIsXG4gICAgXCJxdWVyeVNlbGVjdG9yXCIsXG4gICAgXCJxdWVyeVNlbGVjdG9yQWxsXCIsXG4gICAgXCJjcmVhdGVFbGVtZW50XCIsXG4gICAgXCJnZXRBdHRyaWJ1dGVcIixcbiAgICBcInNldEF0dHJpYnV0ZVwiLFxuICAgIFwicmVtb3ZlQXR0cmlidXRlXCIsXG4gICAgXCJnZXRDb250ZXh0XCIsXG4gICAgXCJnZXRFeHRlbnNpb25cIixcbiAgICBcImFkZEV2ZW50TGlzdGVuZXJcIixcbiAgICBcInJlbW92ZUV2ZW50TGlzdGVuZXJcIixcbiAgICBcImRpc3BhdGNoRXZlbnRcIixcbiAgICBcIm1hdGNoTWVkaWFcIixcbiAgICBcInBvc3RNZXNzYWdlXCIsXG4gICAgXCJjcmVhdGVPYmplY3RVUkxcIixcbiAgICBcInJldm9rZU9iamVjdFVSTFwiLFxuICAgIFwicmVxdWlyZVwiLFxuICAgIFwiaW1wb3J0XCIsXG4gICAgXCJnbG9iXCIsXG4gICAgXCJmZXRjaFwiLFxuICAgIFwib3BlblwiLFxuICAgIFwidHJhY2tcIixcbiAgICBcImd0YWdcIixcbiAgICBcImdhXCIsXG4gICAgXCJpZGVudGlmeVwiLFxuICAgIFwiY2FwdHVyZVwiLFxuICAgIFwibG9nRXZlbnRcIixcbiAgICBcIkVycm9yXCIsXG4gICAgXCJUeXBlRXJyb3JcIixcbiAgICBcIlJhbmdlRXJyb3JcIixcbiAgICBcIlVSTFwiLFxuICAgIFwiVVJMU2VhcmNoUGFyYW1zXCIsXG4gICAgXCJXb3JrZXJcIixcbiAgICBcIkV2ZW50U291cmNlXCIsXG4gICAgXCJXZWJTb2NrZXRcIixcbl0pO1xuLy8gUmVjYWxsIHBhc3M6IGEgc3RyaW5nIGxpdGVyYWwgaW4gYSBcInZhbHVlIHBvc2l0aW9uXCIgKGFycmF5IGVsZW1lbnQsIGNhbGwgYXJnLFxuLy8gb2JqZWN0IFZBTFVFLCB0ZXJuYXJ5L2xvZ2ljYWwgYnJhbmNoLCB2YXJpYWJsZSBpbml0aWFsaXplciwgSlNYIGNoaWxkXG4vLyBleHByZXNzaW9uLCByZXR1cm4gdmFsdWUpIGlzIFVJIGNvcHkgd2Ugd2FudCB0byBleHRyYWN0IGZvciB0aGUgRE9NIGluamVjdG9yLlxuLy8gRXhjbHVkZXMgb2JqZWN0IGtleXMsIEpTWCBhdHRyaWJ1dGUgdmFsdWVzLCBpbXBvcnRzLCB0eXBlIGxpdGVyYWxzLCBhbmRcbi8vIGFyZ3VtZW50cyB0byBrbm93biBub24tVUkgY2FsbGVlcy4gRXh0cmFjdGlvbi1vbmx5IChuZXZlciBhdXRvLXdyYXBwZWQpLCBzbyBpdFxuLy8gY2Fubm90IGFsdGVyIG9yIGJyZWFrIHNvdXJjZS5cbmZ1bmN0aW9uIGlzRXh0cmFjdGFibGVWYWx1ZUxpdGVyYWwobm9kZSkge1xuICAgIGNvbnN0IHBhcmVudCA9IG5vZGUucGFyZW50O1xuICAgIGlmICghcGFyZW50KVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRzLmlzUHJvcGVydHlBc3NpZ25tZW50KHBhcmVudCkgJiYgcGFyZW50Lm5hbWUgPT09IG5vZGUpXG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gb2JqZWN0IGtleVxuICAgIGlmICh0cy5pc0NvbXB1dGVkUHJvcGVydHlOYW1lKHBhcmVudCkpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICBpZiAodHMuaXNJbXBvcnREZWNsYXJhdGlvbihwYXJlbnQpIHx8IHRzLmlzRXhwb3J0RGVjbGFyYXRpb24ocGFyZW50KSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0cy5pc0ltcG9ydEVxdWFsc0RlY2xhcmF0aW9uKHBhcmVudCkgfHwgdHMuaXNFeHRlcm5hbE1vZHVsZVJlZmVyZW5jZShwYXJlbnQpKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRzLmlzTW9kdWxlRGVjbGFyYXRpb24ocGFyZW50KSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0cy5pc0pzeEF0dHJpYnV0ZShwYXJlbnQpKVxuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIGhhbmRsZWQgYnkgdGhlIGtub3duLXByb3AgcnVsZVxuICAgIGlmICh0cy5pc0pzeEV4cHJlc3Npb24ocGFyZW50KSlcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBKU1ggY2hpbGQvYXR0cmlidXRlIGV4cHJlc3Npb25zIGFyZSBoYW5kbGVkIGJ5IEpTWCBydWxlc1xuICAgIGlmICh0cy5pc0pzeEV4cHJlc3Npb24ocGFyZW50KSAmJiBwYXJlbnQucGFyZW50ICYmIHRzLmlzSnN4QXR0cmlidXRlKHBhcmVudC5wYXJlbnQpKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRzLmlzTGl0ZXJhbFR5cGVOb2RlKHBhcmVudCkpXG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gVFMgbGl0ZXJhbCB0eXBlXG4gICAgaWYgKHRzLmlzRW51bU1lbWJlcihwYXJlbnQpKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRzLmlzQ2FzZUNsYXVzZShwYXJlbnQpKVxuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIHN3aXRjaCBjYXNlIGxhYmVsXG4gICAgaWYgKHRzLmlzRWxlbWVudEFjY2Vzc0V4cHJlc3Npb24ocGFyZW50KSlcbiAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBvYmpbXCJrZXlcIl1cbiAgICBpZiAodHMuaXNQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24ocGFyZW50KSAmJiBwYXJlbnQuZXhwcmVzc2lvbiA9PT0gbm9kZSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIC8vIEEgc3RyaW5nIGxpdGVyYWwgaW50ZXJwb2xhdGVkIGRpcmVjdGx5IGludG8gYSB0ZW1wbGF0ZSBcdTIwMTQgYCR7XCJSaWdodHlcIn1gIFx1MjAxNCBpcyByZWFsXG4gICAgLy8gVUkgdGV4dCB0aGUgc3Vycm91bmRpbmcgdGVtcGxhdGUgd291bGQgb3RoZXJ3aXNlIGhpZGUsIHNvIGFsbG93IGl0ICh3cmFwOlwibm9uZVwiKS5cbiAgICAvLyBMaXRlcmFscyBuZXN0ZWQgZGVlcGVyIGluc2lkZSBhIHRlbXBsYXRlLWVtYmVkZGVkIGV4cHJlc3Npb24gKGUuZy4gYSB0ZXJuYXJ5IGluXG4gICAgLy8gYCR7Y29uZCA/IFwiQVwiIDogXCJCXCJ9YCkgc3RheSBleGNsdWRlZDogdG9vIGFtYmlndW91cyB0byBhdHRyaWJ1dGUgdG8gVUkgc2FmZWx5LlxuICAgIGNvbnN0IGRpcmVjdFRlbXBsYXRlU3BhbkxpdGVyYWwgPSB0cy5pc1RlbXBsYXRlU3BhbihwYXJlbnQpICYmIHBhcmVudC5leHByZXNzaW9uID09PSBub2RlO1xuICAgIGlmICghZGlyZWN0VGVtcGxhdGVTcGFuTGl0ZXJhbCkge1xuICAgICAgICBmb3IgKGxldCBwID0gcGFyZW50OyBwICYmICF0cy5pc1NvdXJjZUZpbGUocCk7IHAgPSBwLnBhcmVudCkge1xuICAgICAgICAgICAgaWYgKHRzLmlzVGVtcGxhdGVFeHByZXNzaW9uKHApIHx8IHRzLmlzVGVtcGxhdGVTcGFuKHApKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBEeW5hbWljIGltcG9ydCBzcGVjaWZpZXI6IGltcG9ydChcIi4vUGFnZVwiKSBcdTIwMTQgcGFyZW50IGNhbGwncyBjYWxsZWUgaXMgYGltcG9ydGAuXG4gICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24ocGFyZW50KSAmJiBwYXJlbnQuZXhwcmVzc2lvbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkltcG9ydEtleXdvcmQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBBc3NpZ25tZW50IHRvIGEgbm9uLVVJIHByb3BlcnR5OiB0aGlzLm5hbWUgPSBcIlRyYW5zcG9ydEVycm9yXCIsXG4gICAgLy8gQ29tcC5kaXNwbGF5TmFtZSA9IFwiLi4uXCIsIGN0eC5mb250ID0gXCIxNnB4ICdBcmlhbCdcIiwgY3R4LnRleHRCYXNlbGluZSA9IFwidG9wXCIuXG4gICAgaWYgKHRzLmlzQmluYXJ5RXhwcmVzc2lvbihwYXJlbnQpICYmXG4gICAgICAgIHBhcmVudC5vcGVyYXRvclRva2VuLmtpbmQgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzVG9rZW4gJiZcbiAgICAgICAgcGFyZW50LnJpZ2h0ID09PSBub2RlICYmXG4gICAgICAgIHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKHBhcmVudC5sZWZ0KSAmJlxuICAgICAgICBBU1NJR05fREVOWV9QUk9QUy5oYXMocGFyZW50LmxlZnQubmFtZS50ZXh0KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEtleWJvYXJkL2V2ZW50IGNvbXBhcmlzb246IGV2ZW50LmtleSA9PT0gXCJFc2NhcGVcIiwgZS5jb2RlID09PSBcIkVudGVyXCIuXG4gICAgLy8gVGhlIGxpdGVyYWwgaXMgYSBLZXlib2FyZEV2ZW50IHZhbHVlLCBuZXZlciBVSSBjb3B5LlxuICAgIGlmICh0cy5pc0JpbmFyeUV4cHJlc3Npb24ocGFyZW50KSAmJlxuICAgICAgICAocGFyZW50Lm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNFcXVhbHNUb2tlbiB8fFxuICAgICAgICAgICAgcGFyZW50Lm9wZXJhdG9yVG9rZW4ua2luZCA9PT0gdHMuU3ludGF4S2luZC5FeGNsYW1hdGlvbkVxdWFsc0VxdWFsc1Rva2VuIHx8XG4gICAgICAgICAgICBwYXJlbnQub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc0VxdWFsc1Rva2VuIHx8XG4gICAgICAgICAgICBwYXJlbnQub3BlcmF0b3JUb2tlbi5raW5kID09PSB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzVG9rZW4pKSB7XG4gICAgICAgIGNvbnN0IG90aGVyID0gcGFyZW50LmxlZnQgPT09IG5vZGUgPyBwYXJlbnQucmlnaHQgOiBwYXJlbnQubGVmdDtcbiAgICAgICAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG90aGVyKSAmJiBLRVlfRVZFTlRfUFJPUFMuaGFzKG90aGVyLm5hbWUudGV4dCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBGb250LWZhbWlseSBzdGFjazogYW4gYXJyYXkgY29udGFpbmluZyBhIGdlbmVyaWMgZmFtaWx5IGtleXdvcmQgKGUuZy5cbiAgICAvLyBbXCJTcGFjZSBNb25vXCIsIFwiQ291cmllciBOZXdcIiwgXCJtb25vc3BhY2VcIl0pIFx1MjAxNCB0aGUgbmFtZWQgZm9udHMgYXJlbid0IFVJIGNvcHkuXG4gICAgaWYgKHRzLmlzQXJyYXlMaXRlcmFsRXhwcmVzc2lvbihwYXJlbnQpKSB7XG4gICAgICAgIGZvciAoY29uc3QgZWwgb2YgcGFyZW50LmVsZW1lbnRzKSB7XG4gICAgICAgICAgICBjb25zdCB2ID0gdHMuaXNTdHJpbmdMaXRlcmFsKGVsKSB8fCB0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKGVsKVxuICAgICAgICAgICAgICAgID8gZWwudGV4dC50cmltKCkudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgICAgIDogXCJcIjtcbiAgICAgICAgICAgIGlmIChHRU5FUklDX0ZPTlRfRkFNSUxJRVMuaGFzKHYpKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoKHRzLmlzQ2FsbEV4cHJlc3Npb24ocGFyZW50KSB8fCB0cy5pc05ld0V4cHJlc3Npb24ocGFyZW50KSkgJiYgcGFyZW50LmV4cHJlc3Npb24pIHtcbiAgICAgICAgY29uc3QgY2FsbGVlID0gY2FsbE5hbWUocGFyZW50LmV4cHJlc3Npb24pO1xuICAgICAgICBpZiAoY2FsbGVlICYmIERFTllfQ0FMTEVFUy5oYXMoY2FsbGVlKSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59XG4vLyBTdWItY2xhc3NpZnkgYSB2YWx1ZS1wb3NpdGlvbiBsaXRlcmFsIGJ5IEhPVyBpdCBpcyB1c2VkLCBzbyBkaWFnbm9zdGljcyBjYW5cbi8vIHRyaWFnZSBzZXZlcml0eSAob25seSB0aGUgYWRhcHRlciBzZWVzIHRoZSBBU1QgcG9zaXRpb24pLiBcImxvZ2ljXCIgPSBjb21wYXJlZFxuLy8gaW4gYSBicmFuY2ggKHByb2dyYW0gbG9naWMsIG5vdCBVSSBjb3B5KTsgXCJhc3NpZ25cIiA9IHN0b3JlZCBvbiBhIHByb3BlcnR5O1xuLy8gXCJjYWxsXCIgPSBwYXNzZWQgdG8gYSBmdW5jdGlvbjsgXCJ2YWx1ZVwiID0gcGxhaW4gaG9sZGVyIChhcnJheS9vYmplY3QgdmFsdWUsXG4vLyByZXR1cm4sIHZhcmlhYmxlIGluaXQsIHRlcm5hcnkgYnJhbmNoKSBcdTIwMTQgbW9zdCBsaWtlbHkgcmVhbCBVSSB0ZXh0LlxuZnVuY3Rpb24gdmFsdWVMaXRlcmFsUm9sZShub2RlKSB7XG4gICAgY29uc3QgcGFyZW50ID0gbm9kZS5wYXJlbnQ7XG4gICAgaWYgKHBhcmVudCAmJiB0cy5pc0JpbmFyeUV4cHJlc3Npb24ocGFyZW50KSkge1xuICAgICAgICBjb25zdCBvcCA9IHBhcmVudC5vcGVyYXRvclRva2VuLmtpbmQ7XG4gICAgICAgIGlmIChvcCA9PT0gdHMuU3ludGF4S2luZC5FcXVhbHNFcXVhbHNFcXVhbHNUb2tlbiB8fFxuICAgICAgICAgICAgb3AgPT09IHRzLlN5bnRheEtpbmQuRXhjbGFtYXRpb25FcXVhbHNFcXVhbHNUb2tlbiB8fFxuICAgICAgICAgICAgb3AgPT09IHRzLlN5bnRheEtpbmQuRXF1YWxzRXF1YWxzVG9rZW4gfHxcbiAgICAgICAgICAgIG9wID09PSB0cy5TeW50YXhLaW5kLkV4Y2xhbWF0aW9uRXF1YWxzVG9rZW4gfHxcbiAgICAgICAgICAgIG9wID09PSB0cy5TeW50YXhLaW5kLkxlc3NUaGFuVG9rZW4gfHxcbiAgICAgICAgICAgIG9wID09PSB0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuVG9rZW4gfHxcbiAgICAgICAgICAgIG9wID09PSB0cy5TeW50YXhLaW5kLkxlc3NUaGFuRXF1YWxzVG9rZW4gfHxcbiAgICAgICAgICAgIG9wID09PSB0cy5TeW50YXhLaW5kLkdyZWF0ZXJUaGFuRXF1YWxzVG9rZW4pIHtcbiAgICAgICAgICAgIHJldHVybiBcImxvZ2ljXCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wID09PSB0cy5TeW50YXhLaW5kLkVxdWFsc1Rva2VuICYmIHBhcmVudC5yaWdodCA9PT0gbm9kZSlcbiAgICAgICAgICAgIHJldHVybiBcImFzc2lnblwiO1xuICAgIH1cbiAgICBpZiAocGFyZW50ICYmICh0cy5pc0NhbGxFeHByZXNzaW9uKHBhcmVudCkgfHwgdHMuaXNOZXdFeHByZXNzaW9uKHBhcmVudCkpKVxuICAgICAgICByZXR1cm4gXCJjYWxsXCI7XG4gICAgcmV0dXJuIFwidmFsdWVcIjtcbn1cbi8vIEtleWJvYXJkRXZlbnQgcHJvcGVydGllcyBjb21wYXJlZCBhZ2FpbnN0IGEgbGl0ZXJhbCBrZXkgbmFtZSAoZXZlbnQua2V5LFxuLy8gZS5jb2RlLCAuLi4pLiBUaGUgbGl0ZXJhbCBpcyBhIGtleSBpZGVudGlmaWVyLCBub3QgVUkgY29weS5cbmNvbnN0IEtFWV9FVkVOVF9QUk9QUyA9IG5ldyBTZXQoW1wia2V5XCIsIFwiY29kZVwiLCBcImtleUNvZGVcIiwgXCJ3aGljaFwiLCBcImNoYXJDb2RlXCJdKTtcbi8vIE9iamVjdC9pbnN0YW5jZSBwcm9wZXJ0aWVzIHdob3NlIGFzc2lnbmVkIHN0cmluZyBpcyBjb25maWcsIG5vdCBVSSBjb3B5LlxuLy8gRGVsaWJlcmF0ZWx5IGV4Y2x1ZGVzIFVJLWJlYXJpbmcgcHJvcHMgKHRpdGxlLCB0ZXh0Q29udGVudCwgcGxhY2Vob2xkZXIsXG4vLyB2YWx1ZSwgYWx0LCBhcmlhTGFiZWwsIGlubmVyVGV4dCwgaW5uZXJIVE1MKS5cbmNvbnN0IEFTU0lHTl9ERU5ZX1BST1BTID0gbmV3IFNldChbXG4gICAgXCJuYW1lXCIsXG4gICAgXCJkaXNwbGF5TmFtZVwiLFxuICAgIFwiZm9udFwiLFxuICAgIFwidGV4dEJhc2VsaW5lXCIsXG4gICAgXCJ0ZXh0QWxpZ25cIixcbiAgICBcImZpbGxTdHlsZVwiLFxuICAgIFwic3Ryb2tlU3R5bGVcIixcbiAgICBcImxpbmVDYXBcIixcbiAgICBcImxpbmVKb2luXCIsXG4gICAgXCJjdXJzb3JcIixcbiAgICBcImlkXCIsXG4gICAgXCJjbGFzc05hbWVcIixcbiAgICBcImh0bWxGb3JcIixcbiAgICBcInR5cGVcIixcbl0pO1xuY29uc3QgR0VORVJJQ19GT05UX0ZBTUlMSUVTID0gbmV3IFNldChbXG4gICAgXCJzZXJpZlwiLFxuICAgIFwic2Fucy1zZXJpZlwiLFxuICAgIFwibW9ub3NwYWNlXCIsXG4gICAgXCJjdXJzaXZlXCIsXG4gICAgXCJmYW50YXN5XCIsXG4gICAgXCJzeXN0ZW0tdWlcIixcbiAgICBcInVpLXNlcmlmXCIsXG4gICAgXCJ1aS1zYW5zLXNlcmlmXCIsXG4gICAgXCJ1aS1tb25vc3BhY2VcIixcbiAgICBcInVpLXJvdW5kZWRcIixcbiAgICBcImVtb2ppXCIsXG4gICAgXCJtYXRoXCIsXG5dKTtcbi8vIEFuIGludGVycG9sYXRlZCB0ZW1wbGF0ZSBsaXRlcmFsIGlzIG9ubHkgc2FmZSB0byBhdXRvLXdyYXAgd2l0aCBfX2hsVCB3aGVuIGl0IGlzXG4vLyByZS1ldmFsdWF0ZWQgYWZ0ZXIgdGhlIHJ1bnRpbWUgcHJvdmlkZXIgaXMgcmVhZHksIGkuZS4gaW5zaWRlIGEgZnVuY3Rpb24vcmVuZGVyXG4vLyBzY29wZS4gTW9kdWxlLXNjb3BlIHdyYXBwaW5nIHdvdWxkIHJ1biBvbmNlIGF0IGltcG9ydCB0aW1lIChiZWZvcmUgdGhlIGJ1bmRsZVxuLy8gbG9hZHMpIGFuZCBuZXZlciByZWFjdCB0byBsb2NhbGUgY2hhbmdlcywgc28gd2UgbGVhdmUgdGhvc2UgdW50b3VjaGVkLlxuZnVuY3Rpb24gaXNJbkZ1bmN0aW9uU2NvcGUobm9kZSkge1xuICAgIGxldCBwID0gbm9kZS5wYXJlbnQ7XG4gICAgd2hpbGUgKHApIHtcbiAgICAgICAgaWYgKHRzLmlzRnVuY3Rpb25EZWNsYXJhdGlvbihwKSB8fFxuICAgICAgICAgICAgdHMuaXNGdW5jdGlvbkV4cHJlc3Npb24ocCkgfHxcbiAgICAgICAgICAgIHRzLmlzQXJyb3dGdW5jdGlvbihwKSB8fFxuICAgICAgICAgICAgdHMuaXNNZXRob2REZWNsYXJhdGlvbihwKSB8fFxuICAgICAgICAgICAgdHMuaXNDb25zdHJ1Y3RvckRlY2xhcmF0aW9uKHApIHx8XG4gICAgICAgICAgICB0cy5pc0dldEFjY2Vzc29yRGVjbGFyYXRpb24ocCkgfHxcbiAgICAgICAgICAgIHRzLmlzU2V0QWNjZXNzb3JEZWNsYXJhdGlvbihwKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRzLmlzU291cmNlRmlsZShwKSlcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgcCA9IHAucGFyZW50O1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG4vLyBJbnRlcnBvbGF0ZWQgdGVtcGxhdGUgbGl0ZXJhbCBpbiBhIHZhbHVlIHBvc2l0aW9uIHdlIGNhbiBhdXRvLXdyYXAuIEV4Y2x1ZGVzIEpTWFxuLy8gY2hpbGQvYXR0cmlidXRlIHBvc2l0aW9ucyAoaGFuZGxlZCBieSBydWxlcyAxYi8zKSwgbmVzdGVkIHRlbXBsYXRlIHNwYW5zLCB0YWdnZWRcbi8vIHRlbXBsYXRlcyAoc3R5bGVkL2Nzcy9ncWwpLCBjb21wdXRlZCBrZXlzLCB0eXBlIGxpdGVyYWxzLCBhbmQgbm9uLVVJIGNhbGxlZXMuXG5mdW5jdGlvbiBpc0V4dHJhY3RhYmxlVGVtcGxhdGVQb3NpdGlvbihub2RlKSB7XG4gICAgY29uc3QgcGFyZW50ID0gbm9kZS5wYXJlbnQ7XG4gICAgaWYgKCFwYXJlbnQpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICBpZiAodHMuaXNKc3hFeHByZXNzaW9uKHBhcmVudCkpXG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gSlNYIGNoaWxkIG9yIGF0dHJpYnV0ZSAtPiBydWxlcyAxYi8zXG4gICAgaWYgKHRzLmlzVGFnZ2VkVGVtcGxhdGVFeHByZXNzaW9uKHBhcmVudCkpXG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gc3R5bGVkYGAsIGNzc2BgLCBncWxgYFxuICAgIC8vIE5lc3RlZCBpbnNpZGUgYW5vdGhlciB0ZW1wbGF0ZSdzICR7Li4ufSAoZGlyZWN0bHkgb3IgdmlhIGFuIGV4cHJlc3Npb24gbGlrZSBhXG4gICAgLy8gdGVybmFyeSkuIFRoZSBlbmNsb3NpbmcgdGVtcGxhdGUgYWxyZWFkeSBjYXB0dXJlcyB0aGlzIHRleHQgdmVyYmF0aW0sIHNvXG4gICAgLy8gd3JhcHBpbmcgaGVyZSB3b3VsZCBwcm9kdWNlIG92ZXJsYXBwaW5nIHJlcGxhY2VtZW50cy5cbiAgICBmb3IgKGxldCBwID0gcGFyZW50OyBwICYmICF0cy5pc1NvdXJjZUZpbGUocCk7IHAgPSBwLnBhcmVudCkge1xuICAgICAgICBpZiAodHMuaXNUZW1wbGF0ZUV4cHJlc3Npb24ocCkgfHwgdHMuaXNUZW1wbGF0ZVNwYW4ocCkpXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICh0cy5pc0NvbXB1dGVkUHJvcGVydHlOYW1lKHBhcmVudCkpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICBpZiAodHMuaXNMaXRlcmFsVHlwZU5vZGUocGFyZW50KSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGlmICh0cy5pc0Nhc2VDbGF1c2UocGFyZW50KSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGlmICgodHMuaXNDYWxsRXhwcmVzc2lvbihwYXJlbnQpIHx8IHRzLmlzTmV3RXhwcmVzc2lvbihwYXJlbnQpKSAmJiBwYXJlbnQuZXhwcmVzc2lvbikge1xuICAgICAgICBjb25zdCBjYWxsZWUgPSBjYWxsTmFtZShwYXJlbnQuZXhwcmVzc2lvbik7XG4gICAgICAgIGlmIChjYWxsZWUgJiYgREVOWV9DQUxMRUVTLmhhcyhjYWxsZWUpKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cbi8qKlxuICogV2FsayBhIHNpbmdsZSBUUy9UU1ggc291cmNlIGZpbGUgYW5kIHJldHVybiBldmVyeSB0cmFuc2xhdGFibGUgc3RyaW5nIGhpdCxcbiAqIHdpdGggdGhlIG1ldGFkYXRhIG5lZWRlZCBib3RoIGZvciBleHRyYWN0aW9uIGFuZCBmb3IgVml0ZSBhdXRvLXdyYXBwaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaWRlbnRpZnlIaXRzKHNvdXJjZVRleHQsIG9wdGlvbnMpIHtcbiAgICBjb25zdCB7IGZpbGVOYW1lIH0gPSBvcHRpb25zO1xuICAgIGNvbnN0IG92ZXJyaWRlcyA9IG9wdGlvbnMuY29udGV4dE92ZXJyaWRlcyA/PyB7fTtcbiAgICBjb25zdCB0cmFuc2xhdGlvbkZucyA9IG5ldyBTZXQoW1xuICAgICAgICAuLi5ERUZBVUxUX1RSQU5TTEFUSU9OX0ZOUyxcbiAgICAgICAgLi4uKG9wdGlvbnMudHJhbnNsYXRpb25GdW5jdGlvbk5hbWVzID8/IFtdKSxcbiAgICBdKTtcbiAgICBjb25zdCBvYmplY3RGaWVsZHMgPSBuZXcgU2V0KG9wdGlvbnMub2JqZWN0RmllbGRzID8/IFtdKTtcbiAgICBjb25zdCBzY3JpcHRLaW5kID0gZmlsZU5hbWUuZW5kc1dpdGgoXCIudHN4XCIpXG4gICAgICAgID8gdHMuU2NyaXB0S2luZC5UU1hcbiAgICAgICAgOiBmaWxlTmFtZS5lbmRzV2l0aChcIi5qc3hcIilcbiAgICAgICAgICAgID8gdHMuU2NyaXB0S2luZC5KU1hcbiAgICAgICAgICAgIDogZmlsZU5hbWUuZW5kc1dpdGgoXCIubXRzXCIpIHx8IGZpbGVOYW1lLmVuZHNXaXRoKFwiLnRzXCIpXG4gICAgICAgICAgICAgICAgPyB0cy5TY3JpcHRLaW5kLlRTXG4gICAgICAgICAgICAgICAgOiB0cy5TY3JpcHRLaW5kLlRTWDtcbiAgICBjb25zdCBzb3VyY2VGaWxlID0gdHMuY3JlYXRlU291cmNlRmlsZShmaWxlTmFtZSwgc291cmNlVGV4dCwgdHMuU2NyaXB0VGFyZ2V0LkxhdGVzdCwgdHJ1ZSwgc2NyaXB0S2luZCk7XG4gICAgY29uc3QgaGl0cyA9IFtdO1xuICAgIGNvbnN0IGxpbmVGb3IgPSAobm9kZSkgPT4gc291cmNlRmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihub2RlLmdldFN0YXJ0KHNvdXJjZUZpbGUpKS5saW5lICsgMTtcbiAgICBjb25zdCBwdXNoID0gKHJhd1RleHQsIHNoYXBlLCBraW5kLCBwdXJwb3NlLCBsaW5lLCB3cmFwKSA9PiB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBub3JtYWxpemVUZXh0KHJhd1RleHQpO1xuICAgICAgICBpZiAoIWlzUHJvYmFibHlUcmFuc2xhdGFibGUodGV4dCkpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IG92ZXJyaWRlID0gb3ZlcnJpZGVzW3RleHRdO1xuICAgICAgICBoaXRzLnB1c2goe1xuICAgICAgICAgICAgdGV4dCxcbiAgICAgICAgICAgIHNoYXBlOiBvdmVycmlkZT8uc2hhcGUgPz8gc2hhcGUsXG4gICAgICAgICAgICBwdXJwb3NlOiBvdmVycmlkZT8ucHVycG9zZSA/PyBwdXJwb3NlLFxuICAgICAgICAgICAgdmlzdWFsQ29udGV4dDogb3ZlcnJpZGU/LnZpc3VhbENvbnRleHQgPz8gXCJcIixcbiAgICAgICAgICAgIGtpbmQsXG4gICAgICAgICAgICBsaW5lLFxuICAgICAgICAgICAgd3JhcCxcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBjb25zdCBwdXNoVGVtcGxhdGUgPSAodG1wbCwgc2hhcGUsIGtpbmQsIHB1cnBvc2UsIHN0YXJ0LCBlbmQsIGxpbmUsIGpzeCkgPT4ge1xuICAgICAgICBpZiAoIWhhc1dvcmRzT3V0c2lkZVBsYWNlaG9sZGVycyh0bXBsLnJhdykpXG4gICAgICAgICAgICByZXR1cm47IC8vIGUuZy4ganVzdCBgJHtjb3VudH1gXG4gICAgICAgIC8vIEF1dG8td3JhcHBpbmcgaW5zZXJ0cyBfX2hsVCBpbnRvIGNvZGU7IG5ldmVyIHdyYXAgdGVjaG5pY2FsIHN0cmluZ3MgKFVSTHMsXG4gICAgICAgIC8vIGNvb2tpZXMsIHF1ZXJ5IHBhcmFtcykgXHUyMDE0IGEgdHJhbnNsYXRvciBjb3VsZCBtYW5nbGUgdGhlbSBhbmQgYnJlYWsgcnVudGltZS5cbiAgICAgICAgaWYgKGxvb2tzVGVjaG5pY2FsKHRtcGwucmF3KSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY29uc3QgdGV4dCA9IG5vcm1hbGl6ZVRleHQodG1wbC5yYXcpO1xuICAgICAgICBpZiAoIWlzUHJvYmFibHlUcmFuc2xhdGFibGUodGV4dCkpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGNvbnN0IG92ZXJyaWRlID0gb3ZlcnJpZGVzW3RleHRdO1xuICAgICAgICBoaXRzLnB1c2goe1xuICAgICAgICAgICAgdGV4dCxcbiAgICAgICAgICAgIHNoYXBlOiBvdmVycmlkZT8uc2hhcGUgPz8gc2hhcGUsXG4gICAgICAgICAgICBwdXJwb3NlOiBvdmVycmlkZT8ucHVycG9zZSA/PyBwdXJwb3NlLFxuICAgICAgICAgICAgdmlzdWFsQ29udGV4dDogb3ZlcnJpZGU/LnZpc3VhbENvbnRleHQgPz8gXCJcIixcbiAgICAgICAgICAgIGtpbmQsXG4gICAgICAgICAgICBsaW5lLFxuICAgICAgICAgICAgd3JhcDogeyB0eXBlOiBcInRlbXBsYXRlXCIsIHN0YXJ0LCBlbmQsIHZhbHVlczogdG1wbC52YWx1ZXMsIGpzeCB9LFxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8vIEEgcmljaCAoanN4LXRyYW5zKSBtZXNzYWdlIHN1Y2ggYXMgXCJTcXVlZXplczogPDA+e2NvdW50fTwvMD5cIiBjYW4gb25seSBiZVxuICAgIC8vIGFwcGxpZWQgYnkgdGhlIGJ1aWxkLXRpbWUgPFRyYW5zPiBjb21wb25lbnQuIENvbnRlbnQtbWF0Y2ggY29uc3VtZXJzICh0aGVcbiAgICAvLyBET00gaW5qZWN0b3IpIHNlZSB0aGUgc3RhdGljIGxhYmVsIGFzIGl0cyBvd24gc3RhbmRhbG9uZSB0ZXh0IG5vZGUsIHNvIHdlXG4gICAgLy8gYWxzbyBleHRyYWN0IGVhY2ggc3RyaW5nLWxpdGVyYWwgc2VnbWVudCAoZS5nLiB7XCJTcXVlZXplc1wifSkgYXMgYW5cbiAgICAvLyBleHRyYWN0aW9uLW9ubHkgaGl0LiBUaGVzZSBjYXJyeSBubyB3cmFwIHRhcmdldCwgc28gdGhleSBuZXZlciBwYXJ0aWNpcGF0ZVxuICAgIC8vIGluIHRoZSBzb3VyY2UgdHJhbnNmb3JtIGFuZCBjYW5ub3QgY29uZmxpY3Qgd2l0aCB0aGUgPFRyYW5zPiByZXBsYWNlbWVudC5cbiAgICBjb25zdCBjb2xsZWN0UmljaExpdGVyYWxTZWdtZW50cyA9IChjaGlsZHJlbikgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpZiAodHMuaXNKc3hFeHByZXNzaW9uKGNoaWxkKSAmJiBjaGlsZC5leHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGl0ZXJhbCA9IHN0cmluZ0xpdGVyYWxWYWx1ZShjaGlsZC5leHByZXNzaW9uKTtcbiAgICAgICAgICAgICAgICBpZiAobGl0ZXJhbCAhPT0gbnVsbCAmJiAhbG9va3NUZWNobmljYWwobGl0ZXJhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcHVzaChsaXRlcmFsLCBcImJvZHlcIiwgXCJ2YWx1ZS1saXRlcmFsXCIsIFwiVUkgdGV4dCBpbiBhIHZhbHVlIHBvc2l0aW9uLCBhcHBsaWVkIGF0IHJ1bnRpbWUgYnkgdGhlIERPTSBpbmplY3RvclwiLCBsaW5lRm9yKGNoaWxkKSwgeyB0eXBlOiBcIm5vbmVcIiB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0cy5pc0pzeEVsZW1lbnQoY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgY29sbGVjdFJpY2hMaXRlcmFsU2VnbWVudHMoY2hpbGQuY2hpbGRyZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBjb25zdCB2aXNpdCA9IChub2RlKSA9PiB7XG4gICAgICAgIC8vIDEpIEpTWCBlbGVtZW50IGNoaWxkcmVuOiBwbGFpbiB0ZXh0IC0+IGpzeC10ZXh0LCBpbmxpbmUgbWFya3VwIC0+IGpzeC10cmFucy5cbiAgICAgICAgaWYgKHRzLmlzSnN4RWxlbWVudChub2RlKSkge1xuICAgICAgICAgICAgY29uc3QgdGFnID0ganN4VGFnTmFtZShub2RlLm9wZW5pbmdFbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSBqc3hFbGVtZW50SW5mbyh0YWcpO1xuICAgICAgICAgICAgaWYgKGluZm8pIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gcHVyZVRleHRDaGlsZHJlbihub2RlLmNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBwdXNoKHRleHQsIGluZm8uc2hhcGUsIGluZm8ua2luZCwgaW5mby5wdXJwb3NlLCBsaW5lRm9yKG5vZGUpLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImpzeC10ZXh0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogbm9kZS5vcGVuaW5nRWxlbWVudC5nZXRFbmQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogbm9kZS5jbG9zaW5nRWxlbWVudC5nZXRTdGFydCgpLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJpY2ggPSBidWlsZEpzeE1lc3NhZ2Uobm9kZSwgc291cmNlRmlsZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyaWNoICYmIHJpY2guaGFzRWxlbWVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHB1c2gocmljaC5tZXNzYWdlLCBpbmZvLnNoYXBlLCBgJHtpbmZvLmtpbmR9LXJpY2hgLCBpbmZvLnB1cnBvc2UsIGxpbmVGb3Iobm9kZSksIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcImpzeC10cmFuc1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBub2RlLmdldFN0YXJ0KHNvdXJjZUZpbGUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogbm9kZS5nZXRFbmQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUZXh0czogcmljaC5jb21wb25lbnRUZXh0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZU5hbWVzOiByaWNoLnZhbHVlTmFtZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsc28gZXh0cmFjdCB0aGUgc3RhdGljIHN0cmluZy1saXRlcmFsIHNlZ21lbnRzIHNvIGNvbnRlbnQtbWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnN1bWVycyBjYW4gdHJhbnNsYXRlIHRoZSBzdGFuZGFsb25lIGxhYmVsIHRleHQgbm9kZXMuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xsZWN0UmljaExpdGVyYWxTZWdtZW50cyhub2RlLmNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBtZXNzYWdlICsgY29tcG9uZW50cyBjb25zdW1lIHRoaXMgc3VidHJlZTsgZG8gbm90IGRlc2NlbmQgc28gd2VcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRvbid0IGRvdWJsZS1leHRyYWN0IHRoZSBpbmxpbmUgY2hpbGRyZW4uXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gTm8gPFRyYW5zPiBlbWl0dGVkLiBJZiB0aGUgY2hpbGRyZW4gaW50ZXJsZWF2ZSBodW1hbiB3b3JkcyB3aXRoIGFcbiAgICAgICAgICAgICAgICAgICAgLy8gZHluYW1pYyB2YWx1ZSAoYSB7ZXhwcn0gc2libGluZyBvciBhIHJlZi9oYW5kbGVyLWRyaXZlbiBjaGlsZCksIHRoZXJlXG4gICAgICAgICAgICAgICAgICAgIC8vIGlzIG5vIHNpbmdsZSB0cmFuc2xhdGFibGUgbWVzc2FnZSBhbmQgdGhlIHdvcmRzIGFyZSBvcnBoYW5lZC4gU3VyZmFjZVxuICAgICAgICAgICAgICAgICAgICAvLyBpdCBhcyBhIFwicmVxdWlyZWRcIiBtYW51YWwtdCgpIGRpYWdub3N0aWMgKGV4dHJhY3Rpb24tb25seSwgbmV2ZXIgd3JhcHBlZCkuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1hbnVhbCA9IGRldGVjdE1hbnVhbFROZWVkKG5vZGUuY2hpbGRyZW4pO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWFudWFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwdXNoKG1hbnVhbC5tZXNzYWdlLCBpbmZvLnNoYXBlLCBtYW51YWwucmVmRHJpdmVuID8gXCJtYW51YWwtdDpyZWYtYWRqYWNlbnRcIiA6IFwibWFudWFsLXQ6aW50ZXJwb2xhdGlvblwiLCBpbmZvLnB1cnBvc2UsIGxpbmVGb3Iobm9kZSksIHsgdHlwZTogXCJub25lXCIgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gYnVpbGRKc3hNZXNzYWdlIGJhaWxlZCAoZS5nLiBhIGxheW91dCBjb250YWluZXIgbWl4aW5nIGEgbm9uLWlubGluZVxuICAgICAgICAgICAgICAgICAgICAvLyBlbGVtZW50IHdpdGggYSBsaXRlcmFsIGNoaWxkOiA8ZGl2PjxTcGFya2xlcy8+e1wiRGl2aW5lIE9yYWNsZVwifTwvZGl2PikuXG4gICAgICAgICAgICAgICAgICAgIC8vIE5laXRoZXIgcHVyZS10ZXh0IG5vciB0aGUgcmljaCBwYXRoIGNhcHR1cmVkIGl0LCBhbmQgcnVsZSA1IGRlZmVycyBhbGxcbiAgICAgICAgICAgICAgICAgICAgLy8gSlNYLWV4cHJlc3Npb24gbGl0ZXJhbHMgdG8gXCJ0aGUgSlNYIHJ1bGVzXCIgXHUyMDE0IHNvIHRoZSBsYWJlbCBpcyBvcnBoYW5lZC5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2FsdmFnZSB0aGUgRElSRUNUIHN0cmluZy1saXRlcmFsIGV4cHJlc3Npb24gY2hpbGRyZW4gaGVyZSBhcyBydW50aW1lLURPTVxuICAgICAgICAgICAgICAgICAgICAvLyB0ZXh0ICh3cmFwOlwibm9uZVwiKTsgbmVzdGVkIGVsZW1lbnRzIGFyZSBzdGlsbCB2aXNpdGVkIGJ5IGZvckVhY2hDaGlsZC5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHMuaXNKc3hFeHByZXNzaW9uKGNoaWxkKSAmJiBjaGlsZC5leHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGl0ZXJhbCA9IHN0cmluZ0xpdGVyYWxWYWx1ZShjaGlsZC5leHByZXNzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobGl0ZXJhbCAhPT0gbnVsbCAmJiAhbG9va3NUZWNobmljYWwobGl0ZXJhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHVzaChsaXRlcmFsLCBpbmZvLnNoYXBlLCBcImpzeC1leHByLXRleHRcIiwgaW5mby5wdXJwb3NlLCBsaW5lRm9yKGNoaWxkKSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyAxYSkgRnJhZ21lbnRzICg8Plx1MjAyNjwvPikgaGF2ZSBubyB0YWcsIHNvIHRoZSBlbGVtZW50IHJ1bGVzIGFib3ZlIHNraXAgdGhlbS5cbiAgICAgICAgLy8gICAgIFdoZW4gb25lIGdyb3VwcyBhIG5vbi1pbmxpbmUgZWxlbWVudCB3aXRoIGEgbGl0ZXJhbCBjaGlsZFxuICAgICAgICAvLyAgICAgKDw+PENoZWNrLz57XCJMaW5rIGNvcGllZCFcIn08Lz4pLCBzYWx2YWdlIHRoZSBkaXJlY3Qgc3RyaW5nLWxpdGVyYWxcbiAgICAgICAgLy8gICAgIGV4cHJlc3Npb24gY2hpbGRyZW4gYXMgcnVudGltZS1ET00gdGV4dCAod3JhcDpcIm5vbmVcIikuIE5lc3RlZCBlbGVtZW50cyBhcmVcbiAgICAgICAgLy8gICAgIHN0aWxsIHZpc2l0ZWQ7IHRoZSBsaXRlcmFscycgU3RyaW5nTGl0ZXJhbCBub2RlcyBhcmUgZXhjbHVkZWQgYnkgcnVsZSA1LlxuICAgICAgICBpZiAodHMuaXNKc3hGcmFnbWVudChub2RlKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRzLmlzSnN4RXhwcmVzc2lvbihjaGlsZCkgJiYgY2hpbGQuZXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsaXRlcmFsID0gc3RyaW5nTGl0ZXJhbFZhbHVlKGNoaWxkLmV4cHJlc3Npb24pO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGl0ZXJhbCAhPT0gbnVsbCAmJiAhbG9va3NUZWNobmljYWwobGl0ZXJhbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHB1c2gobGl0ZXJhbCwgXCJib2R5XCIsIFwianN4LWV4cHItdGV4dFwiLCBcImlubGluZSBVSSB0ZXh0IHJlbmRlcmVkIGFzIGEgRE9NIHRleHQgbm9kZVwiLCBsaW5lRm9yKGNoaWxkKSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBtYW51YWwgPSBkZXRlY3RNYW51YWxUTmVlZChub2RlLmNoaWxkcmVuKTtcbiAgICAgICAgICAgIGlmIChtYW51YWwpIHtcbiAgICAgICAgICAgICAgICBwdXNoKG1hbnVhbC5tZXNzYWdlLCBcImJvZHlcIiwgbWFudWFsLnJlZkRyaXZlbiA/IFwibWFudWFsLXQ6cmVmLWFkamFjZW50XCIgOiBcIm1hbnVhbC10OmludGVycG9sYXRpb25cIiwgXCJpbmxpbmUgVUkgdGV4dCByZW5kZXJlZCBhcyBhIERPTSB0ZXh0IG5vZGVcIiwgbGluZUZvcihub2RlKSwgeyB0eXBlOiBcIm5vbmVcIiB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyAxYikgSW50ZXJwb2xhdGVkIHRlbXBsYXRlIGxpdGVyYWwgYXMgYSBKU1ggY2hpbGQ6XG4gICAgICAgIC8vICAgICA8c3Bhbj57YCR7Y291bnR9IHVubG9ja2VkYH08L3NwYW4+IC0+IHtfX2hsVChcIntjb3VudH0gdW5sb2NrZWRcIiwgeyBjb3VudCB9KX1cbiAgICAgICAgaWYgKHRzLmlzSnN4RXhwcmVzc2lvbihub2RlKSAmJlxuICAgICAgICAgICAgbm9kZS5leHByZXNzaW9uICYmXG4gICAgICAgICAgICB0cy5pc1RlbXBsYXRlRXhwcmVzc2lvbihub2RlLmV4cHJlc3Npb24pICYmXG4gICAgICAgICAgICBub2RlLnBhcmVudCAmJlxuICAgICAgICAgICAgKHRzLmlzSnN4RWxlbWVudChub2RlLnBhcmVudCkgfHwgdHMuaXNKc3hGcmFnbWVudChub2RlLnBhcmVudCkpKSB7XG4gICAgICAgICAgICBjb25zdCB0bXBsID0gYnVpbGRUZW1wbGF0ZU1lc3NhZ2Uobm9kZS5leHByZXNzaW9uLCBzb3VyY2VGaWxlKTtcbiAgICAgICAgICAgIHB1c2hUZW1wbGF0ZSh0bXBsLCBcImJvZHlcIiwgXCJqc3gtdGV4dC1pbnRlcnBvbGF0ZWRcIiwgXCJpbnRlcnBvbGF0ZWQgVUkgdGV4dCByZW5kZXJlZCBpbmxpbmVcIiwgbm9kZS5nZXRTdGFydChzb3VyY2VGaWxlKSwgbm9kZS5nZXRFbmQoKSwgbGluZUZvcihub2RlKSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gMikgRGF0YS1kcml2ZW4gb2JqZWN0LWZpZWxkIHN0cmluZyBsaXRlcmFscy4gVGhlc2UgYXJlIHJld3JpdHRlbiBhcyBsYXp5XG4gICAgICAgIC8vICAgIGdldHRlcnMgc28gbW9kdWxlLXNjb3BlIGRhdGEgZG9lcyBub3QgZnJlZXplIGJlZm9yZSB0aGUgYnVuZGxlIGxvYWRzLlxuICAgICAgICBpZiAodHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQobm9kZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBwcm9wZXJ0eU5hbWUobm9kZS5uYW1lKTtcbiAgICAgICAgICAgIGlmIChuYW1lICYmIG9iamVjdEZpZWxkcy5oYXMobmFtZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHN0cmluZ0xpdGVyYWxXcmFwKG5vZGUuaW5pdGlhbGl6ZXIsIHNvdXJjZUZpbGUpO1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBwdXNoKHZhbHVlLnRleHQsIFwiYm9keVwiLCBgZGF0YS1maWVsZDoke25hbWV9YCwgXCJkYXRhLWRyaXZlbiBVSSB0ZXh0IHJlbmRlcmVkIGR5bmFtaWNhbGx5IGZyb20gYXBwIGRhdGFcIiwgbGluZUZvcihub2RlKSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJvYmplY3QtZ2V0dGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogbm9kZS5nZXRTdGFydChzb3VyY2VGaWxlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZDogbm9kZS5nZXRFbmQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZS5nZXRUZXh0KHNvdXJjZUZpbGUpLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gMykgSlNYIGF0dHJpYnV0ZSBzdHJpbmcgbGl0ZXJhbHMgb24ga25vd24gcHJvcHMuIEhhbmRsZXMgYm90aFxuICAgICAgICAvLyAgICBwbGFjZWhvbGRlcj1cInhcIiBhbmQgcGxhY2Vob2xkZXI9e1wieFwifSAvIHBsYWNlaG9sZGVyPXtgeGB9OyBza2lwcyBkeW5hbWljXG4gICAgICAgIC8vICAgIGV4cHJlc3Npb24gaW5pdGlhbGl6ZXJzLlxuICAgICAgICBpZiAodHMuaXNKc3hBdHRyaWJ1dGUobm9kZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSBwcm9wU2hhcGVzW25vZGUubmFtZS5nZXRUZXh0KCldO1xuICAgICAgICAgICAgY29uc3QgaW5pdCA9IG5vZGUuaW5pdGlhbGl6ZXI7XG4gICAgICAgICAgICBpZiAoaW5mbyAmJiBpbml0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbChpbml0KSkge1xuICAgICAgICAgICAgICAgICAgICBwdXNoKGluaXQudGV4dCwgaW5mby5zaGFwZSwgaW5mby5raW5kLCBpbmZvLnB1cnBvc2UsIGxpbmVGb3Iobm9kZSksIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFwianN4LWF0dHJpYnV0ZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVTdGFydDogaW5pdC5nZXRTdGFydChzb3VyY2VGaWxlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlRW5kOiBpbml0LmdldEVuZCgpLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHMuaXNKc3hFeHByZXNzaW9uKGluaXQpICYmIGluaXQuZXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHMuaXNUZW1wbGF0ZUV4cHJlc3Npb24oaW5pdC5leHByZXNzaW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gcGxhY2Vob2xkZXI9e2BIZWxsbyAke25hbWV9YH0gLT4gcGxhY2Vob2xkZXI9e19faGxUKFwiSGVsbG8ge25hbWV9XCIsIHsgbmFtZSB9KX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRtcGwgPSBidWlsZFRlbXBsYXRlTWVzc2FnZShpbml0LmV4cHJlc3Npb24sIHNvdXJjZUZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcHVzaFRlbXBsYXRlKHRtcGwsIGluZm8uc2hhcGUsIGluZm8ua2luZCwgaW5mby5wdXJwb3NlLCBpbml0LmdldFN0YXJ0KHNvdXJjZUZpbGUpLCBpbml0LmdldEVuZCgpLCBsaW5lRm9yKG5vZGUpLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gc3RyaW5nTGl0ZXJhbFZhbHVlKGluaXQuZXhwcmVzc2lvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXBsYWNlIHRoZSB3aG9sZSB7XCJ4XCJ9IGV4cHJlc3Npb24gY29udGFpbmVyIHdpdGgge19faGxUKFwieFwiKX0uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHVzaCh2YWx1ZSwgaW5mby5zaGFwZSwgaW5mby5raW5kLCBpbmZvLnB1cnBvc2UsIGxpbmVGb3Iobm9kZSksIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJqc3gtYXR0cmlidXRlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlU3RhcnQ6IGluaXQuZ2V0U3RhcnQoc291cmNlRmlsZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlRW5kOiBpbml0LmdldEVuZCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIDQpIEV4aXN0aW5nIHJ1bnRpbWUgdHJhbnNsYXRpb24gY2FsbHM6IGV4dHJhY3QgZm9yIGtleSBjb3ZlcmFnZSwgbmV2ZXIgcmUtd3JhcC5cbiAgICAgICAgaWYgKHRzLmlzQ2FsbEV4cHJlc3Npb24obm9kZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBjYWxsTmFtZShub2RlLmV4cHJlc3Npb24pO1xuICAgICAgICAgICAgaWYgKG5hbWUgJiYgdHJhbnNsYXRpb25GbnMuaGFzKG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBzdHJpbmdMaXRlcmFsVmFsdWUobm9kZS5hcmd1bWVudHNbMF0pO1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBwdXNoKHZhbHVlLCBcImJvZHlcIiwgXCJ0cmFuc2xhdGlvbi1jYWxsXCIsIFwic291cmNlIHN0cmluZyBwYXNzZWQgdG8gdGhlIHJ1bnRpbWUgdHJhbnNsYXRpb24gaGVscGVyXCIsIGxpbmVGb3Iobm9kZSksIHsgdHlwZTogXCJub25lXCIgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIDYpIENhbnZhcyB0ZXh0OiBjdHguZmlsbFRleHQoXCJIT01FXCIsIC4uLikgLyBzdHJva2VUZXh0KC4uLikuIFRoZSBzdHJpbmcgaXNcbiAgICAgICAgLy8gICAgcGFpbnRlZCB0byBhIDxjYW52YXM+LCBzbyBpdCBoYXMgbm8gRE9NIG5vZGUgYW5kIHRoZSBpbmplY3RvciBjYW4gbmV2ZXJcbiAgICAgICAgLy8gICAgcmVhY2ggaXQ7IHRoZSBvbmx5IHdheSB0byB0cmFuc2xhdGUgaXQgaXMgdG8gd3JhcCB0aGUgbGl0ZXJhbCBhcmd1bWVudFxuICAgICAgICAvLyAgICB3aXRoIF9faGxUIGF0IGJ1aWxkIHRpbWUuIEludGVycG9sYXRlZCBjYW52YXMgdGV4dCAoYEFnZSAke259YCkgaXNcbiAgICAgICAgLy8gICAgY292ZXJlZCBieSBydWxlIDViJ3MgdGVtcGxhdGUgd3JhcC5cbiAgICAgICAgaWYgKCh0cy5pc1N0cmluZ0xpdGVyYWwobm9kZSkgfHwgdHMuaXNOb1N1YnN0aXR1dGlvblRlbXBsYXRlTGl0ZXJhbChub2RlKSkgJiZcbiAgICAgICAgICAgIGlzQ2FudmFzVGV4dEFyZyhub2RlKSAmJlxuICAgICAgICAgICAgIWxvb2tzVGVjaG5pY2FsKG5vZGUudGV4dCkpIHtcbiAgICAgICAgICAgIHB1c2gobm9kZS50ZXh0LCBcImJvZHlcIiwgXCJjYW52YXMtdGV4dFwiLCBcInRleHQgcGFpbnRlZCB0byBhIDxjYW52YXM+LCB3cmFwcGVkIHdpdGggX19obFQgYXQgYnVpbGQgdGltZVwiLCBsaW5lRm9yKG5vZGUpLCB7IHR5cGU6IFwiY2FsbC1hcmdcIiwgdmFsdWVTdGFydDogbm9kZS5nZXRTdGFydChzb3VyY2VGaWxlKSwgdmFsdWVFbmQ6IG5vZGUuZ2V0RW5kKCkgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gNSkgUmVjYWxsIHBhc3M6IGFueSB0cmFuc2xhdGFibGUgc3RyaW5nIGxpdGVyYWwgaW4gYSB2YWx1ZSBwb3NpdGlvbi5cbiAgICAgICAgLy8gICAgRVhUUkFDVElPTi1PTkxZLiBBIHZhbHVlLXBvc2l0aW9uIGxpdGVyYWwgaXMgaW5kaXN0aW5ndWlzaGFibGUgZnJvbSBhXG4gICAgICAgIC8vICAgIGxvZ2ljL2NvbmZpZyB2YWx1ZSAoZS5nLiBgbW9kZSA9PT0gXCJiaWdcImAsIGBmaXNoLmJlaGF2aW9yID0gXCJhZ2dyZXNzaXZlXCJgLFxuICAgICAgICAvLyAgICBgcmV0dXJuIHsgc2l6ZTogXCJzbWFsbFwiIH1gKSwgc28gYXV0by13cmFwcGluZyBpdCB3aXRoIF9faGxUIHdvdWxkIG1ha2UgdGhlXG4gICAgICAgIC8vICAgIHJ1bm5pbmcgcHJvZ3JhbSBjb21wYXJlIGFnYWluc3QgLyBzdG9yZSB0aGUgKnRyYW5zbGF0ZWQqIHN0cmluZyBpbiBhXG4gICAgICAgIC8vICAgIG5vbi1zb3VyY2UgbG9jYWxlLCBzaWxlbnRseSBicmVha2luZyBicmFuY2hlcyBhbmQgY29uZmlnIGxvb2t1cHMuIEdlbnVpbmVcbiAgICAgICAgLy8gICAgVUkgdGV4dCBpbiB0aGVzZSBwb3NpdGlvbnMgaXMgc3RpbGwgdHJhbnNsYXRlZCBhdCBydW50aW1lIGJ5IHRoZSBET01cbiAgICAgICAgLy8gICAgaW5qZWN0b3IgKGNvbnRlbnQgbWF0Y2gpOyBjYW52YXMgdGV4dCBpcyB3cmFwcGVkIGJ5IHJ1bGUgNiBhbmRcbiAgICAgICAgLy8gICAgaW50ZXJwb2xhdGlvbnMgYnkgcnVsZSA1Yi4gU28gdGhlc2Ugc3RheSB3cmFwOlwibm9uZVwiIGFuZCBuZXZlciBhbHRlciBzb3VyY2UuXG4gICAgICAgIGlmICgodHMuaXNTdHJpbmdMaXRlcmFsKG5vZGUpIHx8IHRzLmlzTm9TdWJzdGl0dXRpb25UZW1wbGF0ZUxpdGVyYWwobm9kZSkpICYmXG4gICAgICAgICAgICBpc0V4dHJhY3RhYmxlVmFsdWVMaXRlcmFsKG5vZGUpICYmXG4gICAgICAgICAgICAhaXNDYW52YXNUZXh0QXJnKG5vZGUpKSB7XG4gICAgICAgICAgICAvLyBPYmplY3QgdmFsdWVzIGZvciBrbm93biBmaWVsZHMgYXJlIGFscmVhZHkgZW1pdHRlZCBieSBydWxlIDI7IGRvbid0IGR1cC5cbiAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IG5vZGUucGFyZW50O1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gdHMuaXNQcm9wZXJ0eUFzc2lnbm1lbnQocGFyZW50KSAmJiBwYXJlbnQuaW5pdGlhbGl6ZXIgPT09IG5vZGVcbiAgICAgICAgICAgICAgICA/IHByb3BlcnR5TmFtZShwYXJlbnQubmFtZSlcbiAgICAgICAgICAgICAgICA6IG51bGw7XG4gICAgICAgICAgICBpZiAoIShmaWVsZE5hbWUgJiYgb2JqZWN0RmllbGRzLmhhcyhmaWVsZE5hbWUpKSAmJiAhbG9va3NUZWNobmljYWwobm9kZS50ZXh0KSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvbGUgPSB2YWx1ZUxpdGVyYWxSb2xlKG5vZGUpO1xuICAgICAgICAgICAgICAgIHB1c2gobm9kZS50ZXh0LCBcImJvZHlcIiwgcm9sZSA9PT0gXCJ2YWx1ZVwiID8gXCJ2YWx1ZS1saXRlcmFsXCIgOiBgdmFsdWUtbGl0ZXJhbDoke3JvbGV9YCwgXCJVSSB0ZXh0IGluIGEgdmFsdWUgcG9zaXRpb25cIiwgbGluZUZvcihub2RlKSwgeyB0eXBlOiBcIm5vbmVcIiB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyA1YikgSW50ZXJwb2xhdGVkIHRlbXBsYXRlIGxpdGVyYWxzIGluIHZhbHVlIHBvc2l0aW9ucyAoaGVscGVycywgbWVzc2FnZVxuICAgICAgICAvLyAgICAgc2V0dGVycywgdGVybmFyaWVzKS4gQXV0by13cmFwcGVkIHdpdGggX19obFQgb25seSBpbnNpZGUgYSBmdW5jdGlvblxuICAgICAgICAvLyAgICAgc2NvcGUgc28gdGhleSBzdGF5IHJlYWN0aXZlIGFuZCBuZXZlciBydW4gYmVmb3JlIHRoZSBidW5kbGUgbG9hZHMuXG4gICAgICAgIGlmICh0cy5pc1RlbXBsYXRlRXhwcmVzc2lvbihub2RlKSAmJlxuICAgICAgICAgICAgaXNFeHRyYWN0YWJsZVRlbXBsYXRlUG9zaXRpb24obm9kZSkgJiZcbiAgICAgICAgICAgIGlzSW5GdW5jdGlvblNjb3BlKG5vZGUpKSB7XG4gICAgICAgICAgICBjb25zdCB0bXBsID0gYnVpbGRUZW1wbGF0ZU1lc3NhZ2Uobm9kZSwgc291cmNlRmlsZSk7XG4gICAgICAgICAgICBwdXNoVGVtcGxhdGUodG1wbCwgXCJib2R5XCIsIFwidmFsdWUtaW50ZXJwb2xhdGVkXCIsIFwiaW50ZXJwb2xhdGVkIFVJIHRleHQgYnVpbHQgaW4gYSB2YWx1ZSBwb3NpdGlvblwiLCBub2RlLmdldFN0YXJ0KHNvdXJjZUZpbGUpLCBub2RlLmdldEVuZCgpLCBsaW5lRm9yKG5vZGUpLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgdHMuZm9yRWFjaENoaWxkKG5vZGUsIHZpc2l0KTtcbiAgICB9O1xuICAgIHZpc2l0KHNvdXJjZUZpbGUpO1xuICAgIHJldHVybiBoaXRzO1xufVxuZnVuY3Rpb24gYnVpbGRUcmFuc0VsZW1lbnQoaGl0LCBtZXNzYWdlKSB7XG4gICAgY29uc3QgY29tcG9uZW50cyA9IGBbJHtoaXQuY29tcG9uZW50VGV4dHMuam9pbihcIiwgXCIpfV1gO1xuICAgIGNvbnN0IHVuaXF1ZVZhbHVlcyA9IFsuLi5uZXcgU2V0KGhpdC52YWx1ZU5hbWVzKV07XG4gICAgY29uc3QgdmFsdWVzID0gdW5pcXVlVmFsdWVzLmxlbmd0aCA+IDAgPyBgIHZhbHVlcz17eyAke3VuaXF1ZVZhbHVlcy5qb2luKFwiLCBcIil9IH19YCA6IFwiXCI7XG4gICAgcmV0dXJuIGA8VHJhbnMgbWVzc2FnZT17JHtKU09OLnN0cmluZ2lmeShtZXNzYWdlKX19IGNvbXBvbmVudHM9eyR7Y29tcG9uZW50c319JHt2YWx1ZXN9IC8+YDtcbn1cbi8qKlxuICogQnVpbGQtdGltZSBhdXRvLXdyYXAgZm9yIFRTL1JlYWN0IHNvdXJjZS4gUmV3cml0ZXM6XG4gKiAgLSBKU1ggdGV4dCBjaGlsZHJlbiAgICAgIC0+IHtfX2hsVChcIi4uLlwiKX1cbiAqICAtIGtub3duIGF0dHJpYnV0ZSB2YWx1ZXMgLT4gYXR0cj17X19obFQoXCIuLi5cIil9XG4gKiAgLSBpbmxpbmUtbWFya3VwIGNoaWxkcmVuIC0+IDxUcmFucyBtZXNzYWdlPVwiPDA+Li48LzA+XCIgY29tcG9uZW50cz17Wy4uLl19IC8+XG4gKiBSZXR1cm5zIG51bGwgd2hlbiBub3RoaW5nIG5lZWRzIHdyYXBwaW5nLiBUaGUgcmVxdWlyZWQgcnVudGltZSBpbXBvcnRzIGFyZVxuICogcmV0dXJuZWQgc28gdGhlIGNhbGxlciAoVml0ZSBwbHVnaW4pIGNhbiBpbmplY3QgYSBzaW5nbGUgaW1wb3J0IHN0YXRlbWVudC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybVNvdXJjZShzb3VyY2VUZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKHNvdXJjZVRleHQuaW5jbHVkZXMoSU1QT1JUX01BUktFUikpXG4gICAgICAgIHJldHVybiBudWxsOyAvLyBhbHJlYWR5IHByb2Nlc3NlZFxuICAgIGNvbnN0IGhpdHMgPSBpZGVudGlmeUhpdHMoc291cmNlVGV4dCwgb3B0aW9ucyk7XG4gICAgY29uc3QgcmVwbGFjZW1lbnRzID0gW107XG4gICAgY29uc3QgaW1wb3J0cyA9IG5ldyBTZXQoKTtcbiAgICBmb3IgKGNvbnN0IGhpdCBvZiBoaXRzKSB7XG4gICAgICAgIGlmIChoaXQud3JhcC50eXBlID09PSBcImpzeC10ZXh0XCIpIHtcbiAgICAgICAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgICAgICAgICBzdGFydDogaGl0LndyYXAuc3RhcnQsXG4gICAgICAgICAgICAgICAgZW5kOiBoaXQud3JhcC5lbmQsXG4gICAgICAgICAgICAgICAgdGV4dDogYHtfX2hsVCgke0pTT04uc3RyaW5naWZ5KGhpdC50ZXh0KX0pfWAsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGltcG9ydHMuYWRkKFwiX19obFRcIik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaGl0LndyYXAudHlwZSA9PT0gXCJqc3gtYXR0cmlidXRlXCIpIHtcbiAgICAgICAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgICAgICAgICBzdGFydDogaGl0LndyYXAudmFsdWVTdGFydCxcbiAgICAgICAgICAgICAgICBlbmQ6IGhpdC53cmFwLnZhbHVlRW5kLFxuICAgICAgICAgICAgICAgIHRleHQ6IGB7X19obFQoJHtKU09OLnN0cmluZ2lmeShoaXQudGV4dCl9KX1gLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpbXBvcnRzLmFkZChcIl9faGxUXCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGhpdC53cmFwLnR5cGUgPT09IFwiY2FsbC1hcmdcIikge1xuICAgICAgICAgICAgLy8gUmVwbGFjZSBhIGJhcmUgY2FsbCBhcmd1bWVudCAoZS5nLiBjYW52YXMgZmlsbFRleHQoXCJIT01FXCIpKSB3aXRoIGFcbiAgICAgICAgICAgIC8vIF9faGxUKC4uLikgY2FsbC4gTm8gSlNYIGJyYWNlcyBcdTIwMTQgdGhpcyBpcyBhbiBvcmRpbmFyeSBleHByZXNzaW9uIHBvc2l0aW9uLlxuICAgICAgICAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgICAgICAgICAgIHN0YXJ0OiBoaXQud3JhcC52YWx1ZVN0YXJ0LFxuICAgICAgICAgICAgICAgIGVuZDogaGl0LndyYXAudmFsdWVFbmQsXG4gICAgICAgICAgICAgICAgdGV4dDogYF9faGxUKCR7SlNPTi5zdHJpbmdpZnkoaGl0LnRleHQpfSlgLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpbXBvcnRzLmFkZChcIl9faGxUXCIpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGhpdC53cmFwLnR5cGUgPT09IFwidGVtcGxhdGVcIikge1xuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBoaXQud3JhcC52YWx1ZXMubWFwKCh2KSA9PiB2Lm5hbWUgPT09IHYuZXhwciA/IHYubmFtZSA6IGAke3YubmFtZX06ICR7di5leHByfWApO1xuICAgICAgICAgICAgY29uc3QgdmFsdWVzQXJnID0gcGFydHMubGVuZ3RoID4gMCA/IGAsIHsgJHtwYXJ0cy5qb2luKFwiLCBcIil9IH1gIDogXCJcIjtcbiAgICAgICAgICAgIGNvbnN0IGNhbGwgPSBgX19obFQoJHtKU09OLnN0cmluZ2lmeShoaXQudGV4dCl9JHt2YWx1ZXNBcmd9KWA7XG4gICAgICAgICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IGhpdC53cmFwLnN0YXJ0LFxuICAgICAgICAgICAgICAgIGVuZDogaGl0LndyYXAuZW5kLFxuICAgICAgICAgICAgICAgIHRleHQ6IGhpdC53cmFwLmpzeCA/IGB7JHtjYWxsfX1gIDogY2FsbCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaW1wb3J0cy5hZGQoXCJfX2hsVFwiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChoaXQud3JhcC50eXBlID09PSBcImpzeC10cmFuc1wiKSB7XG4gICAgICAgICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IGhpdC53cmFwLnN0YXJ0LFxuICAgICAgICAgICAgICAgIGVuZDogaGl0LndyYXAuZW5kLFxuICAgICAgICAgICAgICAgIHRleHQ6IGJ1aWxkVHJhbnNFbGVtZW50KGhpdC53cmFwLCBoaXQudGV4dCksXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGltcG9ydHMuYWRkKFwiVHJhbnNcIik7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaGl0LndyYXAudHlwZSA9PT0gXCJ2YWx1ZVwiKSB7XG4gICAgICAgICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICAgICAgICAgICAgc3RhcnQ6IGhpdC53cmFwLnN0YXJ0LFxuICAgICAgICAgICAgICAgIGVuZDogaGl0LndyYXAuZW5kLFxuICAgICAgICAgICAgICAgIHRleHQ6IGBfX2hsVCgke0pTT04uc3RyaW5naWZ5KGhpdC50ZXh0KX0pYCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaW1wb3J0cy5hZGQoXCJfX2hsVFwiKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChoaXQud3JhcC50eXBlID09PSBcIm9iamVjdC1nZXR0ZXJcIikge1xuICAgICAgICAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgICAgICAgICAgIHN0YXJ0OiBoaXQud3JhcC5zdGFydCxcbiAgICAgICAgICAgICAgICBlbmQ6IGhpdC53cmFwLmVuZCxcbiAgICAgICAgICAgICAgICB0ZXh0OiBgZ2V0ICR7aGl0LndyYXAubmFtZX0oKSB7IHJldHVybiBfX2hsVCgke0pTT04uc3RyaW5naWZ5KGhpdC50ZXh0KX0pOyB9YCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaW1wb3J0cy5hZGQoXCJfX2hsVFwiKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgLy8gQXBwbHkgYmFjay10by1mcm9udCBzbyBlYXJsaWVyIG9mZnNldHMgc3RheSB2YWxpZC5cbiAgICByZXBsYWNlbWVudHMuc29ydCgoYSwgYikgPT4gYi5zdGFydCAtIGEuc3RhcnQpO1xuICAgIGxldCBjb2RlID0gc291cmNlVGV4dDtcbiAgICBmb3IgKGNvbnN0IHIgb2YgcmVwbGFjZW1lbnRzKSB7XG4gICAgICAgIGNvZGUgPSBjb2RlLnNsaWNlKDAsIHIuc3RhcnQpICsgci50ZXh0ICsgY29kZS5zbGljZShyLmVuZCk7XG4gICAgfVxuICAgIHJldHVybiB7IGNvZGUsIGltcG9ydHM6IFsuLi5pbXBvcnRzXSB9O1xufVxuZXhwb3J0IHsgSU1QT1JUX01BUktFUiB9O1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1MTA4ODI5MlxcXFxDYXNjYWRlUHJvamVjdHNcXFxcc2Nyb2xsLWdvYmxpblxcXFxhcHBzXFxcXHdlYlxcXFx2ZW5kb3JcXFxcaGVkZ2VsaW5nLWkxOG5cXFxcZGlzdFxcXFxhZGFwdGVyc1xcXFxlY21hc2NyaXB0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1MTA4ODI5MlxcXFxDYXNjYWRlUHJvamVjdHNcXFxcc2Nyb2xsLWdvYmxpblxcXFxhcHBzXFxcXHdlYlxcXFx2ZW5kb3JcXFxcaGVkZ2VsaW5nLWkxOG5cXFxcZGlzdFxcXFxhZGFwdGVyc1xcXFxlY21hc2NyaXB0XFxcXGpzeE1lc3NhZ2UuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3UxMDg4MjkyL0Nhc2NhZGVQcm9qZWN0cy9zY3JvbGwtZ29ibGluL2FwcHMvd2ViL3ZlbmRvci9oZWRnZWxpbmctaTE4bi9kaXN0L2FkYXB0ZXJzL2VjbWFzY3JpcHQvanN4TWVzc2FnZS5qc1wiO2ltcG9ydCB0cyBmcm9tIFwidHlwZXNjcmlwdFwiO1xuaW1wb3J0IHsgbm9ybWFsaXplVGV4dCB9IGZyb20gXCIuLi8uLi9jb3JlL3RleHQuanNcIjtcbmltcG9ydCB7IGlzSW5saW5lVGV4dFRhZyB9IGZyb20gXCIuL3NoYXBlcy5qc1wiO1xuZnVuY3Rpb24gZWxlbWVudFRhZ05hbWUobm9kZSkge1xuICAgIGNvbnN0IG9wZW5pbmcgPSB0cy5pc0pzeEVsZW1lbnQobm9kZSkgPyBub2RlLm9wZW5pbmdFbGVtZW50IDogbm9kZTtcbiAgICBjb25zdCBuYW1lID0gb3BlbmluZy50YWdOYW1lO1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIobmFtZSkpXG4gICAgICAgIHJldHVybiBuYW1lLnRleHQ7XG4gICAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKG5hbWUpKVxuICAgICAgICByZXR1cm4gbmFtZS5uYW1lLnRleHQ7XG4gICAgcmV0dXJuIG5hbWUuZ2V0VGV4dCgpO1xufVxuLy8gVHJ1ZSB3aGVuIHRoZSBtZXNzYWdlIGhhcyBodW1hbi1yZWFkYWJsZSB0ZXh0IG91dHNpZGUgb2YgPDA+Li48LzA+IG1hcmtlcnMgYW5kXG4vLyB7bmFtZX0gcGxhY2Vob2xkZXJzIChzbyBwdXJlLXN0cnVjdHVyZSB3cmFwcGVycyBsaWtlIFwiPDA+e2ljb259PC8wPlwiIGFyZSBza2lwcGVkKS5cbmZ1bmN0aW9uIGhhc1RyYW5zbGF0YWJsZVRleHQobWVzc2FnZSkge1xuICAgIGNvbnN0IGJhcmUgPSBtZXNzYWdlLnJlcGxhY2UoLzxcXC8/XFxkKz4vZywgXCJcIikucmVwbGFjZSgvXFx7W2EtekEtWjAtOV9dK1xcfS9nLCBcIlwiKTtcbiAgICByZXR1cm4gL1xccHtMfS91LnRlc3QoYmFyZSk7XG59XG5mdW5jdGlvbiBsaXRlcmFsVGV4dChleHByKSB7XG4gICAgaWYgKHRzLmlzU3RyaW5nTGl0ZXJhbChleHByKSB8fCB0cy5pc05vU3Vic3RpdHV0aW9uVGVtcGxhdGVMaXRlcmFsKGV4cHIpKVxuICAgICAgICByZXR1cm4gZXhwci50ZXh0O1xuICAgIHJldHVybiBudWxsO1xufVxuLyoqXG4gKiBTZXJpYWxpemUgYSBKU1ggZWxlbWVudCdzIGNoaWxkcmVuIGludG8gYSBzaW5nbGUgdHJhbnNsYXRhYmxlIG1lc3NhZ2UgdGhhdFxuICogcHJlc2VydmVzIGlubGluZSBtYXJrdXAgYXMgaW5kZXhlZCBwbGFjZWhvbGRlcnMuIFJldHVybnMgbnVsbCB3aGVuIHRoZSBjb250ZW50XG4gKiBpcyBub3Qgc2FmZWx5IHNlcmlhbGl6YWJsZSAoZGVlcCBuZXN0aW5nLCBjb21wbGV4IGV4cHJlc3Npb25zLCBmcmFnbWVudHMpLlxuICpcbiAqIFN1cHBvcnRzIG9uZSBsZXZlbCBvZiBpbmxpbmUgZWxlbWVudCBuZXN0aW5nIChlLmcuIDxhPiwgPHN0cm9uZz4pIHdob3NlIG93blxuICogY2hpbGRyZW4gYXJlIHRleHQgLyB7aWRlbnRpZmllcn0gb25seS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkSnN4TWVzc2FnZShub2RlLCBzb3VyY2VGaWxlKSB7XG4gICAgY29uc3QgY29tcG9uZW50VGV4dHMgPSBbXTtcbiAgICBjb25zdCB2YWx1ZU5hbWVzID0gW107XG4gICAgbGV0IGhhc0VsZW1lbnRzID0gZmFsc2U7XG4gICAgbGV0IG9rID0gdHJ1ZTtcbiAgICBjb25zdCBzZXJpYWxpemUgPSAoY2hpbGRyZW4sIGRlcHRoKSA9PiB7XG4gICAgICAgIGxldCBvdXQgPSBcIlwiO1xuICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpZiAoIW9rKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgaWYgKHRzLmlzSnN4VGV4dChjaGlsZCkpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gY2hpbGQudGV4dDtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0cy5pc0pzeEV4cHJlc3Npb24oY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjaGlsZC5leHByZXNzaW9uKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTsgLy8gey8qIGNvbW1lbnQgKi99XG4gICAgICAgICAgICAgICAgY29uc3QgbGl0ZXJhbCA9IGxpdGVyYWxUZXh0KGNoaWxkLmV4cHJlc3Npb24pO1xuICAgICAgICAgICAgICAgIGlmIChsaXRlcmFsICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBsaXRlcmFsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0cy5pc0lkZW50aWZpZXIoY2hpbGQuZXhwcmVzc2lvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVOYW1lcy5wdXNoKGNoaWxkLmV4cHJlc3Npb24udGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBgeyR7Y2hpbGQuZXhwcmVzc2lvbi50ZXh0fX1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb2sgPSBmYWxzZTsgLy8gY29tcGxleCBleHByZXNzaW9uIC0+IG5vdCBzZXJpYWxpemFibGVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHMuaXNKc3hFbGVtZW50KGNoaWxkKSB8fCB0cy5pc0pzeFNlbGZDbG9zaW5nRWxlbWVudChjaGlsZCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVwdGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG9rID0gZmFsc2U7IC8vIG9ubHkgb25lIGxldmVsIG9mIGlubGluZSBuZXN0aW5nIHN1cHBvcnRlZFxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gT25seSBpbmxpbmUtZm9ybWF0dGluZyB0YWdzIGJlbG9uZyBpbiBhIHRleHQtZmxvdyBtZXNzYWdlOyBibG9jayB0YWdzXG4gICAgICAgICAgICAgICAgLy8gKGgxLCBwLCBidXR0b24sIGRpdiwgLi4uKSBtZWFuIHRoaXMgaXMgYSBsYXlvdXQgY29udGFpbmVyLCBzbyBiYWlsIGFuZFxuICAgICAgICAgICAgICAgIC8vIGxldCB0aGUgY2FsbGVyIGV4dHJhY3QgdGhlIGNoaWxkcmVuIGluZGl2aWR1YWxseS5cbiAgICAgICAgICAgICAgICBpZiAoIWlzSW5saW5lVGV4dFRhZyhlbGVtZW50VGFnTmFtZShjaGlsZCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIG9rID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBCZWhhdmlvci1iZWFyaW5nIGVsZW1lbnRzIG11c3Qgbm90IGJlIHJlY29uc3RydWN0ZWQgYnkgPFRyYW5zPjogaXRcbiAgICAgICAgICAgICAgICAvLyByZS1jcmVhdGVzIHRoZW0gdmlhIGNsb25lRWxlbWVudCBhbmQgb3ZlcnJpZGVzIHRoZWlyIGNoaWxkcmVuLCB3aGljaFxuICAgICAgICAgICAgICAgIC8vIGNsb2JiZXJzIHJlZnMgLyBpbXBlcmF0aXZlIERPTSB1cGRhdGVzIChlLmcuIGEgZ2FtZSBsb29wIHdyaXRpbmdcbiAgICAgICAgICAgICAgICAvLyB0ZXh0Q29udGVudCB0aHJvdWdoIGEgcmVmKSBhbmQgZGV0YWNoZXMgZXZlbnQgaGFuZGxlcnMuIEJhaWwgc28gdGhlXG4gICAgICAgICAgICAgICAgLy8gb3JpZ2luYWwgSlNYIGlzIGxlZnQgaW50YWN0IGFuZCB0aGUgRE9NIGluamVjdG9yIHRyYW5zbGF0ZXMgaW5zdGVhZC5cbiAgICAgICAgICAgICAgICBjb25zdCBhdHRycyA9IHRzLmlzSnN4RWxlbWVudChjaGlsZClcbiAgICAgICAgICAgICAgICAgICAgPyBjaGlsZC5vcGVuaW5nRWxlbWVudC5hdHRyaWJ1dGVzXG4gICAgICAgICAgICAgICAgICAgIDogY2hpbGQuYXR0cmlidXRlcztcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGF0dHIgb2YgYXR0cnMucHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHMuaXNKc3hTcHJlYWRBdHRyaWJ1dGUoYXR0cikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9rID0gZmFsc2U7IC8vIHsuLi5wcm9wc30gbWF5IGNhcnJ5IGEgcmVmL2hhbmRsZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0cy5pc0pzeEF0dHJpYnV0ZShhdHRyKSAmJiB0cy5pc0lkZW50aWZpZXIoYXR0ci5uYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXR0ck5hbWUgPSBhdHRyLm5hbWUudGV4dDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRyTmFtZSA9PT0gXCJyZWZcIiB8fCAvXm9uW0EtWl0vLnRlc3QoYXR0ck5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIW9rKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjb25zdCBpbmRleCA9IGNvbXBvbmVudFRleHRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjb25zdCBpbm5lciA9IHRzLmlzSnN4RWxlbWVudChjaGlsZCkgPyBzZXJpYWxpemUoY2hpbGQuY2hpbGRyZW4sIGRlcHRoICsgMSkgOiBcIlwiO1xuICAgICAgICAgICAgICAgIC8vIEEgY2FwdHVyZWQgY29tcG9uZW50IHdpdGggbm8gdGV4dC92YWx1ZSBjb250ZW50IG9mIGl0cyBvd24gaXMgYVxuICAgICAgICAgICAgICAgIC8vIGRlY29yYXRpdmUgZWxlbWVudCAoaWNvbiwgZ3JhZGllbnQgbGF5ZXIsIGRpdmlkZXIpLCBub3QgaW5saW5lIG1hcmt1cFxuICAgICAgICAgICAgICAgIC8vIHdyYXBwaW5nIHRleHQuIDxUcmFucz4gc2hvdWxkIG5vdCBvd24gaXQsIHNvIGJhaWwuXG4gICAgICAgICAgICAgICAgaWYgKCEvXFxTLy50ZXN0KGlubmVyKSkge1xuICAgICAgICAgICAgICAgICAgICBvayA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaGFzRWxlbWVudHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudFRleHRzLnB1c2goY2hpbGQuZ2V0VGV4dChzb3VyY2VGaWxlKSk7XG4gICAgICAgICAgICAgICAgb3V0ICs9IGA8JHtpbmRleH0+JHtpbm5lcn08LyR7aW5kZXh9PmA7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvayA9IGZhbHNlOyAvLyBmcmFnbWVudHMsIGV0Yy5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgY29uc3QgcmF3ID0gc2VyaWFsaXplKG5vZGUuY2hpbGRyZW4sIDApO1xuICAgIGlmICghb2spXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBub3JtYWxpemVUZXh0KHJhdyk7XG4gICAgaWYgKCFtZXNzYWdlKVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAvLyBTa2lwIHB1cmUtc3RydWN0dXJlIHdyYXBwZXJzIHdob3NlIG9ubHkgd29yZHMgbGl2ZSBpbnNpZGUgcGxhY2Vob2xkZXJzL3RhZ3MuXG4gICAgaWYgKCFoYXNUcmFuc2xhdGFibGVUZXh0KG1lc3NhZ2UpKVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4geyBtZXNzYWdlLCBjb21wb25lbnRUZXh0cywgdmFsdWVOYW1lcywgaGFzRWxlbWVudHMgfTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcY29yZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcY29yZVxcXFx0ZXh0LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy91MTA4ODI5Mi9DYXNjYWRlUHJvamVjdHMvc2Nyb2xsLWdvYmxpbi9hcHBzL3dlYi92ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9jb3JlL3RleHQuanNcIjtleHBvcnQgZnVuY3Rpb24gZGVjb2RlSHRtbEVudGl0aWVzKHZhbHVlKSB7XG4gICAgY29uc3QgbmFtZWQgPSB7XG4gICAgICAgIGFtcDogXCImXCIsXG4gICAgICAgIGFwb3M6IFwiJ1wiLFxuICAgICAgICBndDogXCI+XCIsXG4gICAgICAgIGx0OiBcIjxcIixcbiAgICAgICAgbmJzcDogXCIgXCIsXG4gICAgICAgIHF1b3Q6ICdcIicsXG4gICAgfTtcbiAgICByZXR1cm4gdmFsdWUucmVwbGFjZSgvJigjeFswLTlhLWZdK3wjXFxkK3xbYS16XSspOy9naSwgKG1hdGNoLCBlbnRpdHkpID0+IHtcbiAgICAgICAgY29uc3QgbG93ZXIgPSBlbnRpdHkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgaWYgKGxvd2VyLnN0YXJ0c1dpdGgoXCIjeFwiKSkge1xuICAgICAgICAgICAgY29uc3QgY29kZSA9IE51bWJlci5wYXJzZUludChsb3dlci5zbGljZSgyKSwgMTYpO1xuICAgICAgICAgICAgcmV0dXJuIGNvZGVQb2ludE9yT3JpZ2luYWwoY29kZSwgbWF0Y2gpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsb3dlci5zdGFydHNXaXRoKFwiI1wiKSkge1xuICAgICAgICAgICAgY29uc3QgY29kZSA9IE51bWJlci5wYXJzZUludChsb3dlci5zbGljZSgxKSwgMTApO1xuICAgICAgICAgICAgcmV0dXJuIGNvZGVQb2ludE9yT3JpZ2luYWwoY29kZSwgbWF0Y2gpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuYW1lZFtsb3dlcl0gPz8gbWF0Y2g7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBjb2RlUG9pbnRPck9yaWdpbmFsKGNvZGUsIG9yaWdpbmFsKSB7XG4gICAgaWYgKCFOdW1iZXIuaXNGaW5pdGUoY29kZSkgfHwgY29kZSA8IDAgfHwgY29kZSA+IDB4MTBmZmZmKVxuICAgICAgICByZXR1cm4gb3JpZ2luYWw7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ29kZVBvaW50KGNvZGUpO1xuICAgIH1cbiAgICBjYXRjaCB7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbDtcbiAgICB9XG59XG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplVGV4dChzb3VyY2UpIHtcbiAgICByZXR1cm4gZGVjb2RlSHRtbEVudGl0aWVzKHNvdXJjZSkucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGVzY2FwZUh0bWwodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWVcbiAgICAgICAgLnJlcGxhY2UoLyYvZywgXCImYW1wO1wiKVxuICAgICAgICAucmVwbGFjZSgvPC9nLCBcIiZsdDtcIilcbiAgICAgICAgLnJlcGxhY2UoLz4vZywgXCImZ3Q7XCIpXG4gICAgICAgIC5yZXBsYWNlKC9cIi9nLCBcIiZxdW90O1wiKTtcbn1cbi8vIENvbW1vbiBzaW5nbGUtd29yZCBUYWlsd2luZC9DU1MgdXRpbGl0eSBjbGFzc2VzIChubyBoeXBoZW4vY29sb24sIHNvIHRoZVxuLy8gc2VwYXJhdGVkLXV0aWxpdHkgc2hhcGUgY2FuJ3QgY2F0Y2ggdGhlbSkuIE9ubHkgdXNlZCB0byBjb25maXJtIGEgY2xhc3MgY2x1c3RlclxuLy8gdGhhdCBBTFNPIGNvbnRhaW5zIGEgc2VwYXJhdGVkL3ZhcmlhbnQgdG9rZW4sIHNvIHRoZXNlIG5ldmVyIGZsYWcgcHJvc2UgYWxvbmUuXG5jb25zdCBCQVJFX1VUSUxJVFlfQ0xBU1NFUyA9IG5ldyBTZXQoW1xuICAgIFwiaGlkZGVuXCIsXG4gICAgXCJibG9ja1wiLFxuICAgIFwiaW5saW5lXCIsXG4gICAgXCJmbGV4XCIsXG4gICAgXCJncmlkXCIsXG4gICAgXCJ0YWJsZVwiLFxuICAgIFwiY29udGVudHNcIixcbiAgICBcIm5vbmVcIixcbiAgICBcInN0YXRpY1wiLFxuICAgIFwiZml4ZWRcIixcbiAgICBcImFic29sdXRlXCIsXG4gICAgXCJyZWxhdGl2ZVwiLFxuICAgIFwic3RpY2t5XCIsXG4gICAgXCJ2aXNpYmxlXCIsXG4gICAgXCJpbnZpc2libGVcIixcbiAgICBcImNvbGxhcHNlXCIsXG4gICAgXCJpdGFsaWNcIixcbiAgICBcInVuZGVybGluZVwiLFxuICAgIFwib3ZlcmxpbmVcIixcbiAgICBcInRydW5jYXRlXCIsXG4gICAgXCJ1cHBlcmNhc2VcIixcbiAgICBcImxvd2VyY2FzZVwiLFxuICAgIFwiY2FwaXRhbGl6ZVwiLFxuICAgIFwiYW50aWFsaWFzZWRcIixcbiAgICBcImNvbnRhaW5lclwiLFxuICAgIFwiaXNvbGF0ZVwiLFxuICAgIFwiZ3JvdXBcIixcbiAgICBcInBlZXJcIixcbiAgICBcImJvcmRlclwiLFxuICAgIFwicm91bmRlZFwiLFxuICAgIFwic2hhZG93XCIsXG4gICAgXCJyaW5nXCIsXG4gICAgXCJvdXRsaW5lXCIsXG4gICAgXCJ0cmFuc2l0aW9uXCIsXG4gICAgXCJ0cmFuc2Zvcm1cIixcbiAgICBcImdyb3dcIixcbiAgICBcInNocmlua1wiLFxuXSk7XG4vLyBIZXVyaXN0aWM6IGEgbWVzc2FnZSB0aGF0IGlzIHJlYWxseSBtYWNoaW5lIHN5bnRheCAoVVJMLCBjb29raWUsIENTUywgU1ZHIHBhdGgsXG4vLyBpbmxpbmUgc3R5bGUsIGJhcmUgdW5pdCwgbG9jYWxlIHRhZywgbmFtZXNwYWNlIGtleSkgcmF0aGVyIHRoYW4gVUkgY29weS4gU3VjaFxuLy8gc3RyaW5ncyBtdXN0IGJlIGtlcHQgb3V0IG9mIHRoZSB0cmFuc2xhdGlvbiBwYXRoOiB0aGV5IGdldCBpbnRlcnBvbGF0ZWQvcmVuZGVyZWRcbi8vIGFzLWlzLCBhbmQgYSB0cmFuc2xhdG9yIHJld3JpdGluZyBcInJvdGF0ZVwiL2EgY29sb3Iga2V5d29yZCB3b3VsZCBicmVhayBsYXlvdXQgb3Jcbi8vIGxvZ2ljLiBTaGFyZWQgYnkgZXZlcnkgYWRhcHRlciAoSlMvVFMsIEhUTUwsIFZ1ZSwgQyMsIFhBTUwpIHNvIG5vaXNlIGZpbHRlcmluZyBpc1xuLy8gdW5pZm9ybSBhY3Jvc3MgbGFuZ3VhZ2VzLlxuZXhwb3J0IGZ1bmN0aW9uIGxvb2tzVGVjaG5pY2FsKHJhdykge1xuICAgIGNvbnN0IHRyaW1tZWQgPSByYXcudHJpbSgpO1xuICAgIGlmICgvOlxcL1xcLy8udGVzdChyYXcpKVxuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gcHJvdG9jb2wgVVJMc1xuICAgIGlmICgvWz8mXVtcXHctXSo9Ly50ZXN0KHJhdykpXG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBxdWVyeSBwYXJhbXNcbiAgICBpZiAoL15cXC5cXC4/XFwvLy50ZXN0KHRyaW1tZWQpKVxuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gcmVsYXRpdmUgbW9kdWxlL2Fzc2V0IHBhdGggKFwiLi9YXCIsIFwiLi4veFwiKVxuICAgIGlmICgvXltBLVphLXpdOltcXFxcL10vLnRlc3QodHJpbW1lZCkpXG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBXaW5kb3dzIGRyaXZlIHBhdGggKFwiQzpcXFxcdGVtcFwiLCBcIkQ6L3hcIilcbiAgICBpZiAoL15cXFxcXFxcXFteXFxcXF0vLnRlc3QodHJpbW1lZCkpXG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBVTkMgcGF0aCAoXCJcXFxcXFxcXHNlcnZlclxcXFxzaGFyZVwiKVxuICAgIGlmICgvXig/OltcXHcuXFwtIF0rXFxcXCkrW1xcdy5cXC0gXSskLy50ZXN0KHRyaW1tZWQpKVxuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gYmFja3NsYXNoIHBhdGggKFwiZGlyXFxcXGZpbGUuZXh0XCIpXG4gICAgLy8gU1FMIHN0YXRlbWVudDogYSBsZWFkaW5nIERNTC9EREwga2V5d29yZCBwbHVzIHRoZSBtYXRjaGluZyBjbGF1c2Uga2V5d29yZCwgc29cbiAgICAvLyBwcm9zZSBzdGFydGluZyB3aXRoIFwiU2VsZWN0XCIvXCJVcGRhdGVcIiAoZS5nLiBcIlNlbGVjdCBhIGZpbGVcIikgaXMgbGVmdCBhbG9uZS5cbiAgICBpZiAoL15cXHMqKD86U0VMRUNUXFxiW1xcc1xcU10qXFxiRlJPTVxcYnxJTlNFUlRcXHMrSU5UT1xcYnxVUERBVEVcXGJbXFxzXFxTXSpcXGJTRVRcXGJ8REVMRVRFXFxzK0ZST01cXGJ8Q1JFQVRFXFxzKyg/OlRBQkxFfElOREVYfFZJRVd8REFUQUJBU0V8UFJPQ0VEVVJFKVxcYnxBTFRFUlxccytUQUJMRVxcYnxEUk9QXFxzKyg/OlRBQkxFfElOREVYfFZJRVd8REFUQUJBU0UpXFxifFRSVU5DQVRFXFxzK1RBQkxFXFxiKS9pLnRlc3QodHJpbW1lZCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICgvXlxcKFxccypbYS16LV0rXFxzKjpcXHMqW14pXStcXCkkL2kudGVzdCh0cmltbWVkKSlcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIENTUyBtZWRpYSBxdWVyeVxuICAgIGlmICgvXltBLVphLXpdW0EtWmEtejAtOV0qKD86X1tBLVphLXowLTldKykrJC8udGVzdCh0cmltbWVkKSlcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIHNuYWtlX2Nhc2UgaWRlbnRpZmllci9jb25zdFxuICAgIC8vIEJDUC00NyBsb2NhbGUgdGFnIChcImVuLVVTXCIsIFwibmwtTkxcIiwgXCJ6aC1IYW50XCIsIFwiemgtSGFudC1UV1wiKTogYW4gaW50ZXJuYWxcbiAgICAvLyBpZGVudGlmaWVyLCBuZXZlciBVSSBjb3B5LiBSZXF1aXJlcyBhIHN1YnRhZyBzbyBoeXBoZW5hdGVkIHByb3NlIChcImNvLW9wXCIpXG4gICAgLy8gaXMgbGVmdCBhbG9uZSBcdTIwMTQgcmVnaW9uIG11c3QgYmUgdXBwZXJjYXNlIC8gc2NyaXB0IG11c3QgYmUgVGl0bGVjYXNlLlxuICAgIGlmICgvLS8udGVzdCh0cmltbWVkKSAmJlxuICAgICAgICAvXlthLXpdezIsM30oPzotW0EtWl1bYS16XXszfSk/KD86LSg/OltBLVpdezJ9fFxcZHszfSkpPyQvLnRlc3QodHJpbW1lZCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vIERvdHRlZCBuYW1lc3BhY2UgaWRlbnRpZmllciAoXCJoZWRnZWxpbmcubG9jYWxlXCIsIFwiZmVhdHVyZS5mbGFnLm5hbWVcIik6IGFcbiAgICAvLyBjb25maWcvc3RvcmFnZSBrZXksIG5ldmVyIFVJIGNvcHkuIExvd2VyY2FzZSBzZWdtZW50cyBvbmx5OyBsZW5ndGggZ3VhcmRcbiAgICAvLyBza2lwcyBhYmJyZXZpYXRpb25zIGxpa2UgXCJlLmdcIi9cImkuZVwiLlxuICAgIGlmICh0cmltbWVkLmxlbmd0aCA+PSA1ICYmIC9eW2Etel1bYS16MC05XSooPzpcXC5bYS16XVthLXowLTlfXSopKyQvLnRlc3QodHJpbW1lZCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmICgvI1swLTlhLWZBLUZdezMsOH1cXGIvLnRlc3QocmF3KSlcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIGhleCBjb2xvcnMgKHNoYWRvd3MsIHBhbGV0dGVzKVxuICAgIGlmICgvXig/OkdFVHxQT1NUfFBVVHxQQVRDSHxERUxFVEV8SEVBRHxPUFRJT05TKSQvLnRlc3QodHJpbW1lZCkpXG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBIVFRQIHZlcmJzXG4gICAgaWYgKC9eKD86YXBwbGljYXRpb258dGV4dHxpbWFnZXxhdWRpb3x2aWRlb3xmb250fG1vZGVsfG11bHRpcGFydClcXC9bYS16MC05ListXSsoPzpcXHMqO1xccypbYS16MC05Lis9LV0rKSokL2kudGVzdCh0cmltbWVkKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gTUlNRSB0eXBlcywgaW5jbC4gcGFyYW1ldGVycyAoXCJhdWRpby93ZWJtO2NvZGVjcz1vcHVzXCIpXG4gICAgfVxuICAgIGlmICgvXig/OkFmcmljYXxBbWVyaWNhfEFudGFyY3RpY2F8QXJjdGljfEFzaWF8QXRsYW50aWN8QXVzdHJhbGlhfEV1cm9wZXxJbmRpYW58UGFjaWZpY3xFdGMpXFwvW0EtWmEtel0rKD86W18vXVtBLVphLXpdKykqJC8udGVzdCh0cmltbWVkKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gSUFOQSB0aW1lem9uZSAoXCJBbWVyaWNhL0NoaWNhZ29cIiwgXCJBc2lhL1Rva3lvXCIpXG4gICAgfVxuICAgIC8vIENhbnZhcy9DU1MgZm9udCBzaG9ydGhhbmQgd2l0aCBhIHF1b3RlZCBvciBnZW5lcmljIGZhbWlseTogXCIxNnB4ICdBcmlhbCdcIixcbiAgICAvLyBcImJvbGQgMTZweCBzYW5zLXNlcmlmXCIgKHRoZSBmYW1pbHkgY2hlY2sgYXZvaWRzIG1hdGNoaW5nIGNvcHkgbGlrZSBcIjE2cHggd2lkZVwiKS5cbiAgICBpZiAoL14oPzooPzpub3JtYWx8aXRhbGljfG9ibGlxdWV8Ym9sZHxib2xkZXJ8bGlnaHRlcnxzbWFsbC1jYXBzfFxcZHszfSlcXHMrKSpcXGQrKD86XFwuXFxkKyk/KD86cHh8cHR8ZW18cmVtKVxccysoPzpbJ1wiXXxzZXJpZlxcYnxzYW5zLXNlcmlmXFxifG1vbm9zcGFjZVxcYnxjdXJzaXZlXFxifGZhbnRhc3lcXGIpL2kudGVzdCh0cmltbWVkKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8gVGFpbHdpbmQgLyB1dGlsaXR5IGNsYXNzIGNsdXN0ZXJzOiBcImJnLWJyYW5kLWJnIHRleHQtYnJhbmQtdGV4dFwiLCBcInNtOnB4LTRcIixcbiAgICAvLyBcInRvcC1bMTEwcHhdIHNtOmgtWzE3cmVtXVwiLCBcImhpZGRlbiBzbTppbmxpbmUtZmxleFwiIChsb3dlcmNhc2Ugb25seSkuIEEgY2x1c3RlclxuICAgIC8vIGlzIGZsYWdnZWQgd2hlbiBldmVyeSB0b2tlbiBpcyBhIHV0aWxpdHkgQU5EIGF0IGxlYXN0IG9uZSBpcyBhIHNlcGFyYXRlZC92YXJpYW50XG4gICAgLy8gdG9rZW4gKC0sIDosIFtdKSBcdTIwMTQgc28gbG93ZXJjYXNlIHByb3NlIChldmVuIFwid2VsbC1iZWluZyB0aXBzXCIpIGlzIG5ldmVyIGRyb3BwZWQuXG4gICAgY29uc3QgdG9rZW5zID0gdHJpbW1lZC5zcGxpdCgvXFxzKy8pO1xuICAgIGNvbnN0IGlzU2VwYXJhdGVkVXRpbGl0eSA9ICh0KSA9PiAvXiE/LT9bYS16MC05XSsoPzpbLTovXSg/OlxcW1teXFxdXStcXF18W2EtejAtOS5dKykpKyQvLnRlc3QodCk7XG4gICAgY29uc3QgaXNVdGlsaXR5Q2xhc3MgPSAodCkgPT4gaXNTZXBhcmF0ZWRVdGlsaXR5KHQpIHx8IEJBUkVfVVRJTElUWV9DTEFTU0VTLmhhcyh0KTtcbiAgICBpZiAodG9rZW5zLmxlbmd0aCA+PSAyICYmIHRva2Vucy5ldmVyeShpc1V0aWxpdHlDbGFzcykgJiYgdG9rZW5zLnNvbWUoaXNTZXBhcmF0ZWRVdGlsaXR5KSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHRva2Vucy5sZW5ndGggPT09IDEgJiZcbiAgICAgICAgaXNTZXBhcmF0ZWRVdGlsaXR5KHRva2Vuc1swXSkgJiZcbiAgICAgICAgKHRva2Vuc1swXS5tYXRjaCgvWy06L10vZykgfHwgW10pLmxlbmd0aCA+PSAyKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvLyBDU1MgLyBjYW52YXMgZnVuY3Rpb25hbCBub3RhdGlvbiAoY29sb3IsIHRyYW5zZm9ybSwgZ3JhZGllbnQsIGZpbHRlciwgY2FsYykuXG4gICAgaWYgKC9cXGIoPzpoc2xhP3xyZ2JhP3x0cmFuc2xhdGUoPzozZHx4fHl8eik/fHJvdGF0ZVt4eXpdP3xzY2FsZVt4eXpdP3xza2V3W3h5XT98bWF0cml4Mz9kP3xwZXJzcGVjdGl2ZXxjYWxjfHZhcnx1cmx8KD86bGluZWFyfHJhZGlhbHxjb25pYyktZ3JhZGllbnR8Y3ViaWMtYmV6aWVyfGRyb3Atc2hhZG93fGJsdXJ8YnJpZ2h0bmVzc3xzYXR1cmF0ZXxncmF5c2NhbGUpXFxzKlxcKC9pLnRlc3QocmF3KSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8gUGxhY2Vob2xkZXJzIC0+IGEgc2VudGluZWwgc28gd2UgY2FuIHBhdHRlcm4tbWF0Y2ggdGhlIHN1cnJvdW5kaW5nIHN5bnRheC5cbiAgICBjb25zdCBzID0gcmF3LnJlcGxhY2UoL1xce1tefV0qXFx9L2csIFwiXFx1MDAwMFwiKS50cmltKCk7XG4gICAgaWYgKCFzKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKC9eWy8/I10vLnRlc3QocykpXG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBwYXRoIC8gcXVlcnkgLyBoYXNoXG4gICAgLy8gU2xhc2gtc2VwYXJhdGVkIHBhdGggd2l0aCBubyBzcGFjZXMgKGUuZy4ge2Jhc2V9L3tpZH0vam9pbikgXHUyMDE0IGEgVVJML3JvdXRlLFxuICAgIC8vIGV2ZW4gd2hlbiBpdCBzdGFydHMgd2l0aCBhIHBsYWNlaG9sZGVyLiBSZXF1aXJlIGEgcGxhY2Vob2xkZXIgb3IgMisgc2VnbWVudHNcbiAgICAvLyBzbyBvcmRpbmFyeSBjb3B5IGxpa2UgXCJhbmQvb3JcIiBvciBcImhpbS9oZXJcIiBpcyBsZWZ0IGFsb25lLlxuICAgIGlmICgvXltcXHUwMDAwXFx3Li1dKig/OlxcL1tcXHUwMDAwXFx3Li1dKykrJC8udGVzdChzKSAmJlxuICAgICAgICAocy5pbmNsdWRlcyhcIlxcdTAwMDBcIikgfHwgKHMubWF0Y2goL1xcLy9nKSB8fCBbXSkubGVuZ3RoID49IDIpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoL15bYS16LV0rOlxcUy9pLnRlc3QocykpXG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBjc3MgZGVjbGFyYXRpb24gLyBpZCByZWYgZS5nLiBjbGlwOnhcbiAgICBpZiAoL1thLXotXStcXHMqOlxccypbXjtdKzsvaS50ZXN0KHMpKVxuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gaW5saW5lIHN0eWxlIFwicHJvcDogdmFsdWU7XCJcbiAgICBpZiAoLyg/Ol58WztcXHNdKSg/OnBhdGh8bWF4LWFnZXxzYW1lc2l0ZXxkb21haW58ZXhwaXJlc3xzZWN1cmV8aHR0cG9ubHkpXFxiL2kudGVzdChzKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gY29va2llIGF0dHJpYnV0ZXNcbiAgICB9XG4gICAgLy8gQmFyZSB1bml0IHZhbHVlOiBcIntufXB4XCIsIFwiLXtufW1zXCIsIFwie259JVwiLCBcIntufXNcIiB3aXRoIG5vIHJlYWwgd29yZHMuXG4gICAgaWYgKC9eW1xcdTAwMDBcXGRcXHMuLCstXSooPzpweHxtc3xkZWd8cmFkfHR1cm58ZW18cmVtfHZofHZ3fGZyfHB0fCV8cykkL2kudGVzdChzKSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgLy8gU1ZHIHBhdGggZGF0YTogb25seSBjb21tYW5kIGxldHRlcnMgKyBudW1iZXJzL3BsYWNlaG9sZGVycy5cbiAgICBpZiAoL15bTUxIVkNTUVRBWl1bXFx1MDAwMFxcZFxccy4sKy1dKiQvaS50ZXN0KHMpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAvLyBDU1MgYW5pbWF0aW9uL3RyYW5zaXRpb24gc2hvcnRoYW5kOiBhIHRpbWluZyB0b2tlbiBwbHVzIGFuIGVhc2luZyBrZXl3b3JkLlxuICAgIGlmICgvKD86XFxkfFxcdTAwMDApKD86XFwuXFxkKyk/bT9zXFxiLy50ZXN0KHMpICYmXG4gICAgICAgIC9cXGIoPzpsaW5lYXJ8ZWFzZSg/Oi1pbnwtb3V0fC1pbi1vdXQpP3xmb3J3YXJkc3xiYWNrd2FyZHN8aW5maW5pdGV8YWx0ZXJuYXRlfHN0ZXBzKVxcYi9pLnRlc3QocykpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbi8vIEhldXJpc3RpYyBmb3IgXCJpcyB0aGlzIHN0cmluZyB1c2VyLWZhY2luZyBVSSBjb3B5IHdvcnRoIHRyYW5zbGF0aW5nXCIuXG4vLyBQb3J0ZWQgZnJvbSBzY3JvbGwtZ29ibGluJ3MgZXh0cmFjdC1pMThuLm10cyBzbyBiZWhhdmlvdXIgbWF0Y2hlcy5cbmV4cG9ydCBmdW5jdGlvbiBpc1Byb2JhYmx5VHJhbnNsYXRhYmxlKHNvdXJjZSkge1xuICAgIGNvbnN0IHRleHQgPSBub3JtYWxpemVUZXh0KHNvdXJjZSk7XG4gICAgaWYgKCF0ZXh0KVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKHRleHQubGVuZ3RoIDwgMilcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGlmICghL1xccHtMfS91LnRlc3QodGV4dCkpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICBpZiAoL15odHRwcz86XFwvXFwvL2kudGVzdCh0ZXh0KSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGlmICgvXlxcL1thLXowLTkvXy1dKyQvaS50ZXN0KHRleHQpKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKC9eW2EtejAtOV8tXSs6W2EtejAtOTpfLV0rJC9pLnRlc3QodGV4dCkpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICBpZiAoL15bYS16XSsoPzpbQS1aXVthLXowLTldKikrJC8udGVzdCh0ZXh0KSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGlmICgvXlsuI10/W2EtejAtOV8tXSskL2kudGVzdCh0ZXh0KSAmJiAhL1tBLVpdLy50ZXN0KHRleHQpKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXGVjbWFzY3JpcHRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXGVjbWFzY3JpcHRcXFxcc2hhcGVzLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy91MTA4ODI5Mi9DYXNjYWRlUHJvamVjdHMvc2Nyb2xsLWdvYmxpbi9hcHBzL3dlYi92ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy9lY21hc2NyaXB0L3NoYXBlcy5qc1wiOy8vIEpTWC1lbGVtZW50IHNoYXBlIGhldXJpc3RpY3MuIFRoZXNlIG1hcCBjb21wb25lbnQvaW50cmluc2ljIHRhZyBuYW1lcyB0byBhXG4vLyB0cmFuc2xhdGFibGUgc2hhcGUgKyBwdXJwb3NlLiBUaGV5IGxpdmUgaW4gdGhlIFJlYWN0L1RTIGFkYXB0ZXIgYmVjYXVzZSB0aGVcbi8vIHRhZyB2b2NhYnVsYXJ5IChhbmQga25vd24gY29tcG9uZW50IG5hbWVzIGxpa2UgUHJpbWFyeUJ1dHRvbikgaXMgZnJhbWV3b3JrXG4vLyBzcGVjaWZpYzsgdGhlIG5ldXRyYWwgc2hhcGUgdm9jYWJ1bGFyeSBzdGF5cyBpbiBjb3JlL3NoYXBlcy50cy5cbmV4cG9ydCBmdW5jdGlvbiBqc3hFbGVtZW50SW5mbyh0YWcpIHtcbiAgICBpZiAodGFnID09PSBcImJ1dHRvblwiIHx8XG4gICAgICAgIHRhZyA9PT0gXCJCdXR0b25cIiB8fFxuICAgICAgICB0YWcgPT09IFwiUHJpbWFyeUJ1dHRvblwiIHx8XG4gICAgICAgIHRhZyA9PT0gXCJTZWNvbmRhcnlCdXR0b25cIikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2hhcGU6IFwiYnV0dG9uXCIsXG4gICAgICAgICAgICBraW5kOiBcImJ1dHRvbi10ZXh0XCIsXG4gICAgICAgICAgICBwdXJwb3NlOiBcImJ1dHRvbiB0ZXh0IGZvciBhbiBhY3Rpb24gdGhlIHVzZXIgY2FuIHRha2VcIixcbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKHRhZyA9PT0gXCJhXCIgfHwgdGFnID09PSBcIkxpbmtcIikge1xuICAgICAgICByZXR1cm4geyBzaGFwZTogXCJsaW5rXCIsIGtpbmQ6IFwibGluay10ZXh0XCIsIHB1cnBvc2U6IFwibGluayB0ZXh0IGZvciBuYXZpZ2F0aW9uXCIgfTtcbiAgICB9XG4gICAgaWYgKC9eaFsxLTZdJC9pLnRlc3QodGFnKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2hhcGU6IFwiaGVhZGVyXCIsXG4gICAgICAgICAgICBraW5kOiBcImhlYWRpbmctdGV4dFwiLFxuICAgICAgICAgICAgcHVycG9zZTogXCJoZWFkaW5nIHRleHQgZm9yIGEgcGFnZSBvciBVSSBzZWN0aW9uXCIsXG4gICAgICAgIH07XG4gICAgfVxuICAgIGlmICh0YWcgPT09IFwibGFiZWxcIikge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2hhcGU6IFwibGFiZWxcIixcbiAgICAgICAgICAgIGtpbmQ6IFwibGFiZWwtdGV4dFwiLFxuICAgICAgICAgICAgcHVycG9zZTogXCJsYWJlbCBmb3IgYSBmb3JtIGNvbnRyb2wgb3IgVUkgdmFsdWVcIixcbiAgICAgICAgfTtcbiAgICB9XG4gICAgaWYgKHRhZyA9PT0gXCJsaVwiKSB7XG4gICAgICAgIHJldHVybiB7IHNoYXBlOiBcImJvZHlcIiwga2luZDogXCJsaXN0LWl0ZW0tdGV4dFwiLCBwdXJwb3NlOiBcImJvZHkgY29weSBzaG93biBhcyBhIGxpc3QgaXRlbVwiIH07XG4gICAgfVxuICAgIGlmICh0YWcgPT09IFwicFwiKSB7XG4gICAgICAgIHJldHVybiB7IHNoYXBlOiBcImJvZHlcIiwga2luZDogXCJwYXJhZ3JhcGgtdGV4dFwiLCBwdXJwb3NlOiBcImJvZHkgY29weSBzaG93biBpbiB0aGUgdXNlciBpbnRlcmZhY2VcIiB9O1xuICAgIH1cbiAgICBpZiAodGFnID09PSBcImRpdlwiIHx8IHRhZyA9PT0gXCJzcGFuXCIpIHtcbiAgICAgICAgcmV0dXJuIHsgc2hhcGU6IFwiYm9keVwiLCBraW5kOiBgJHt0YWd9LXRleHRgLCBwdXJwb3NlOiBcImJvZHkgY29weSBzaG93biBpbiB0aGUgdXNlciBpbnRlcmZhY2VcIiB9O1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBpc0lubGluZVRleHRUYWcodGFnKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgXCJhXCIsXG4gICAgICAgIFwiYWJiclwiLFxuICAgICAgICBcImJcIixcbiAgICAgICAgXCJiclwiLFxuICAgICAgICBcImNpdGVcIixcbiAgICAgICAgXCJjb2RlXCIsXG4gICAgICAgIFwiZGVsXCIsXG4gICAgICAgIFwiZW1cIixcbiAgICAgICAgXCJpXCIsXG4gICAgICAgIFwiaW5zXCIsXG4gICAgICAgIFwia2JkXCIsXG4gICAgICAgIFwibWFya1wiLFxuICAgICAgICBcInFcIixcbiAgICAgICAgXCJzXCIsXG4gICAgICAgIFwic21hbGxcIixcbiAgICAgICAgXCJzcGFuXCIsXG4gICAgICAgIFwic3Ryb25nXCIsXG4gICAgICAgIFwic3ViXCIsXG4gICAgICAgIFwic3VwXCIsXG4gICAgICAgIFwidGltZVwiLFxuICAgICAgICBcInVcIixcbiAgICAgICAgXCJ3YnJcIixcbiAgICBdLmluY2x1ZGVzKHRhZyk7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXGVjbWFzY3JpcHRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXGVjbWFzY3JpcHRcXFxcdGVtcGxhdGVNZXNzYWdlLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy91MTA4ODI5Mi9DYXNjYWRlUHJvamVjdHMvc2Nyb2xsLWdvYmxpbi9hcHBzL3dlYi92ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy9lY21hc2NyaXB0L3RlbXBsYXRlTWVzc2FnZS5qc1wiO2ltcG9ydCB0cyBmcm9tIFwidHlwZXNjcmlwdFwiO1xuLy8gUHJlZmVyIHRoZSB2YXJpYWJsZSdzIG93biBuYW1lIGZvciB0aGUgcGxhY2Vob2xkZXIgKExpbmd1aS1zdHlsZSk7IGZhbGwgYmFjayB0b1xuLy8gdGhlIHRyYWlsaW5nIGlkZW50aWZpZXIgb2YgYSBwcm9wZXJ0eSBhY2Nlc3MuIEFueXRoaW5nIGVsc2UgaXMgcG9zaXRpb25hbC5cbmZ1bmN0aW9uIGRlcml2ZU5hbWUoZXhwcikge1xuICAgIGlmICh0cy5pc0lkZW50aWZpZXIoZXhwcikpXG4gICAgICAgIHJldHVybiBleHByLnRleHQ7XG4gICAgaWYgKHRzLmlzUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKGV4cHIpKVxuICAgICAgICByZXR1cm4gZXhwci5uYW1lLnRleHQ7XG4gICAgcmV0dXJuIG51bGw7XG59XG4vKipcbiAqIENvbnZlcnQgYSBUZW1wbGF0ZUV4cHJlc3Npb24gKGBcXGAke2NvdW50fSB1bmxvY2tlZFxcYGApIGludG8gYSB0cmFuc2xhdGFibGVcbiAqIG1lc3NhZ2UgKFwie2NvdW50fSB1bmxvY2tlZFwiKSBwbHVzIHRoZSB2YWx1ZXMgbmVlZGVkIHRvIHJlY29uc3RydWN0IGl0IGF0XG4gKiBydW50aW1lLiBJZGVudGljYWwgZXhwcmVzc2lvbnMgY29sbGFwc2UgdG8gYSBzaW5nbGUgcGxhY2Vob2xkZXI7IG5hbWVcbiAqIGNvbGxpc2lvbnMgKG9yIG5vbi1pZGVudGlmaWVyIGV4cHJlc3Npb25zKSBmYWxsIGJhY2sgdG8gcG9zaXRpb25hbCBuYW1lcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVGVtcGxhdGVNZXNzYWdlKG5vZGUsIHNvdXJjZUZpbGUpIHtcbiAgICBjb25zdCB2YWx1ZXMgPSBbXTtcbiAgICBjb25zdCBieUV4cHIgPSBuZXcgTWFwKCk7XG4gICAgY29uc3QgdXNlZCA9IG5ldyBTZXQoKTtcbiAgICBsZXQgcG9zaXRpb25hbCA9IDA7XG4gICAgbGV0IHJhdyA9IG5vZGUuaGVhZC50ZXh0O1xuICAgIGZvciAoY29uc3Qgc3BhbiBvZiBub2RlLnRlbXBsYXRlU3BhbnMpIHtcbiAgICAgICAgY29uc3QgZXhwclRleHQgPSBzcGFuLmV4cHJlc3Npb24uZ2V0VGV4dChzb3VyY2VGaWxlKTtcbiAgICAgICAgbGV0IG5hbWUgPSBieUV4cHIuZ2V0KGV4cHJUZXh0KSA/PyBudWxsO1xuICAgICAgICBpZiAobmFtZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc3QgZGVyaXZlZCA9IGRlcml2ZU5hbWUoc3Bhbi5leHByZXNzaW9uKTtcbiAgICAgICAgICAgIGlmIChkZXJpdmVkICYmICF1c2VkLmhhcyhkZXJpdmVkKSkge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBkZXJpdmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lID0gYHZhbHVlJHtwb3NpdGlvbmFsKyt9YDtcbiAgICAgICAgICAgICAgICB9IHdoaWxlICh1c2VkLmhhcyhuYW1lKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB1c2VkLmFkZChuYW1lKTtcbiAgICAgICAgICAgIGJ5RXhwci5zZXQoZXhwclRleHQsIG5hbWUpO1xuICAgICAgICAgICAgdmFsdWVzLnB1c2goeyBuYW1lLCBleHByOiBleHByVGV4dCB9KTtcbiAgICAgICAgfVxuICAgICAgICByYXcgKz0gYHske25hbWV9fSR7c3Bhbi5saXRlcmFsLnRleHR9YDtcbiAgICB9XG4gICAgcmV0dXJuIHsgcmF3LCB2YWx1ZXMgfTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcY29yZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcY29yZVxcXFxzaGFwZXMuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3UxMDg4MjkyL0Nhc2NhZGVQcm9qZWN0cy9zY3JvbGwtZ29ibGluL2FwcHMvd2ViL3ZlbmRvci9oZWRnZWxpbmctaTE4bi9kaXN0L2NvcmUvc2hhcGVzLmpzXCI7ZXhwb3J0IGNvbnN0IFNIQVBFUyA9IFtcbiAgICBcImJ1dHRvblwiLFxuICAgIFwiaGVhZGVyXCIsXG4gICAgXCJib2R5XCIsXG4gICAgXCJsaW5rXCIsXG4gICAgXCJsYWJlbFwiLFxuICAgIFwicGxhY2Vob2xkZXJcIixcbiAgICBcInRvb2x0aXBcIixcbiAgICBcImFsZXJ0XCIsXG5dO1xuZXhwb3J0IGZ1bmN0aW9uIGNsYW1wU2hhcGUoc2hhcGUsIGZhbGxiYWNrID0gXCJib2R5XCIpIHtcbiAgICBpZiAodHlwZW9mIHNoYXBlID09PSBcInN0cmluZ1wiICYmIFNIQVBFUy5pbmNsdWRlcyhzaGFwZSkpIHtcbiAgICAgICAgcmV0dXJuIHNoYXBlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsbGJhY2s7XG59XG4vLyBKU1gvSFRNTCBhdHRyaWJ1dGUgbmFtZXMgdGhhdCBjYXJyeSB0cmFuc2xhdGFibGUgdGV4dC5cbmV4cG9ydCBjb25zdCBwcm9wU2hhcGVzID0ge1xuICAgIFwiYXJpYS1sYWJlbFwiOiB7XG4gICAgICAgIHNoYXBlOiBcImxhYmVsXCIsXG4gICAgICAgIGtpbmQ6IFwiYXJpYS1sYWJlbFwiLFxuICAgICAgICBwdXJwb3NlOiBcImFjY2Vzc2liaWxpdHkgbGFiZWwgZm9yIGFuIGludGVyYWN0aXZlIG9yIHZpc3VhbCBlbGVtZW50XCIsXG4gICAgfSxcbiAgICBhbHQ6IHtcbiAgICAgICAgc2hhcGU6IFwibGFiZWxcIixcbiAgICAgICAga2luZDogXCJhbHQtdGV4dFwiLFxuICAgICAgICBwdXJwb3NlOiBcImFsdGVybmF0aXZlIHRleHQgZm9yIGFuIGltYWdlIG9yIHZpc3VhbCBlbGVtZW50XCIsXG4gICAgfSxcbiAgICBsYWJlbDoge1xuICAgICAgICBzaGFwZTogXCJsYWJlbFwiLFxuICAgICAgICBraW5kOiBcImNvbXBvbmVudC1sYWJlbFwiLFxuICAgICAgICBwdXJwb3NlOiBcImxhYmVsIHBhc3NlZCB0byBhIFVJIGNvbXBvbmVudFwiLFxuICAgIH0sXG4gICAgcGxhY2Vob2xkZXI6IHtcbiAgICAgICAgc2hhcGU6IFwicGxhY2Vob2xkZXJcIixcbiAgICAgICAga2luZDogXCJwbGFjZWhvbGRlclwiLFxuICAgICAgICBwdXJwb3NlOiBcInBsYWNlaG9sZGVyIHRleHQgc2hvd24gaW5zaWRlIGFuIGlucHV0IGJlZm9yZSB0aGUgdXNlciBlbnRlcnMgY29udGVudFwiLFxuICAgIH0sXG4gICAgdGl0bGU6IHtcbiAgICAgICAgc2hhcGU6IFwidG9vbHRpcFwiLFxuICAgICAgICBraW5kOiBcInRpdGxlLWF0dHJpYnV0ZVwiLFxuICAgICAgICBwdXJwb3NlOiBcInRvb2x0aXAgdGV4dCBzaG93biBmb3IgYWRkaXRpb25hbCBjb250ZXh0XCIsXG4gICAgfSxcbiAgICBidXR0b25MYWJlbDoge1xuICAgICAgICBzaGFwZTogXCJidXR0b25cIixcbiAgICAgICAga2luZDogXCJjb21wb25lbnQtYnV0dG9uLWxhYmVsXCIsXG4gICAgICAgIHB1cnBvc2U6IFwiYnV0dG9uIGxhYmVsIHBhc3NlZCB0byBhIFVJIGNvbXBvbmVudFwiLFxuICAgIH0sXG4gICAgYmx1cmI6IHtcbiAgICAgICAgc2hhcGU6IFwiYm9keVwiLFxuICAgICAgICBraW5kOiBcImNvbXBvbmVudC1ibHVyYlwiLFxuICAgICAgICBwdXJwb3NlOiBcInNob3J0IGRlc2NyaXB0aXZlIGNvcHkgcGFzc2VkIHRvIGEgVUkgY29tcG9uZW50XCIsXG4gICAgfSxcbn07XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXHJlYWN0LXRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1MTA4ODI5MlxcXFxDYXNjYWRlUHJvamVjdHNcXFxcc2Nyb2xsLWdvYmxpblxcXFxhcHBzXFxcXHdlYlxcXFx2ZW5kb3JcXFxcaGVkZ2VsaW5nLWkxOG5cXFxcZGlzdFxcXFxhZGFwdGVyc1xcXFxyZWFjdC10c1xcXFxpbmRleC5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvdTEwODgyOTIvQ2FzY2FkZVByb2plY3RzL3Njcm9sbC1nb2JsaW4vYXBwcy93ZWIvdmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvYWRhcHRlcnMvcmVhY3QtdHMvaW5kZXguanNcIjtpbXBvcnQgeyBpZGVudGlmeUhpdHMsIHRyYW5zZm9ybVNvdXJjZSB9IGZyb20gXCIuLi9lY21hc2NyaXB0L2lkZW50aWZ5LmpzXCI7XG4vLyBBZGFwdGVyOiBSZWFjdCBKU1ggZmlsZXMgb25seSAoLnRzeC8uanN4KS4gVXNlcyB0aGUgc2hhcmVkIEVDTUFTY3JpcHQgZW5naW5lXG4vLyBhbmQgYWRkcyBidWlsZC10aW1lIGF1dG8td3JhcCAoSlNYIHRleHQsIGF0dHJpYnV0ZXMsIGFuZCA8VHJhbnMvPiBmb3IgaW5saW5lXG4vLyBtYXJrdXApIFx1MjAxNCB3aGljaCBvbmx5IG1ha2VzIHNlbnNlIHdoZXJlIHRoZXJlIGlzIEpTWC4gTm9uLUpTWCAudHMvLmpzIGZpbGVzIGFyZVxuLy8gaGFuZGxlZCBieSB0aGUganMtdHMgYWRhcHRlciAoZXh0cmFjdGlvbiBvbmx5KS5cbmV4cG9ydCBjb25zdCByZWFjdFRzQWRhcHRlciA9IHtcbiAgICBuYW1lOiBcInJlYWN0LXRzXCIsXG4gICAgZXh0ZW5zaW9uczogW1wiLnRzeFwiLCBcIi5qc3hcIl0sXG4gICAgaWRlbnRpZnk6IGlkZW50aWZ5SGl0cyxcbiAgICB0cmFuc2Zvcm06IHRyYW5zZm9ybVNvdXJjZSxcbn07XG4vLyBCYWNrLWNvbXBhdDoga2VlcCB0aGUgZW5naW5lJ3MgQVBJIHJlYWNoYWJsZSBmcm9tIHRoZSByZWFjdC10cyBzdWJwYXRoLlxuZXhwb3J0ICogZnJvbSBcIi4uL2VjbWFzY3JpcHQvaW5kZXguanNcIjtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcYWRhcHRlcnNcXFxcanMtdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXGpzLXRzXFxcXGluZGV4LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy91MTA4ODI5Mi9DYXNjYWRlUHJvamVjdHMvc2Nyb2xsLWdvYmxpbi9hcHBzL3dlYi92ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy9qcy10cy9pbmRleC5qc1wiO2ltcG9ydCB7IGlkZW50aWZ5SGl0cywgdHJhbnNmb3JtU291cmNlIH0gZnJvbSBcIi4uL2VjbWFzY3JpcHQvaWRlbnRpZnkuanNcIjtcbi8vIEFkYXB0ZXI6IG5vbi1KU1ggRUNNQVNjcmlwdCBmaWxlcyAoLnRzLy5tdHMvLmN0cy8uanMvLm1qcy8uY2pzKS4gVXNlcyB0aGUgc2FtZVxuLy8gc2hhcmVkIGVuZ2luZSBhcyByZWFjdC10cyBmb3IgZGV0ZWN0aW9uIGFuZCBidWlsZC10aW1lIHdyYXBwaW5nLiBNb2R1bGUtc2NvcGVcbi8vIFVJIG9iamVjdCBmaWVsZHMgYXJlIHJld3JpdHRlbiBhcyBsYXp5IGdldHRlcnMgc28gdHJhbnNsYXRpb24gaGFwcGVucyB3aGVuIHRoZVxuLy8gdmFsdWUgaXMgcmVhZCwgbm90IHdoZW4gdGhlIG1vZHVsZSBpcyBpbXBvcnRlZC5cbmV4cG9ydCBjb25zdCBqc1RzQWRhcHRlciA9IHtcbiAgICBuYW1lOiBcImpzLXRzXCIsXG4gICAgZXh0ZW5zaW9uczogW1wiLnRzXCIsIFwiLm10c1wiLCBcIi5jdHNcIiwgXCIuanNcIiwgXCIubWpzXCIsIFwiLmNqc1wiXSxcbiAgICBpZGVudGlmeTogaWRlbnRpZnlIaXRzLFxuICAgIHRyYW5zZm9ybTogdHJhbnNmb3JtU291cmNlLFxufTtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcYWRhcHRlcnNcXFxcaHRtbFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcYWRhcHRlcnNcXFxcaHRtbFxcXFxpZGVudGlmeS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvdTEwODgyOTIvQ2FzY2FkZVByb2plY3RzL3Njcm9sbC1nb2JsaW4vYXBwcy93ZWIvdmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvYWRhcHRlcnMvaHRtbC9pZGVudGlmeS5qc1wiO2ltcG9ydCB7IHByb3BTaGFwZXMgfSBmcm9tIFwiLi4vLi4vY29yZS9zaGFwZXMuanNcIjtcbmltcG9ydCB7IGlzUHJvYmFibHlUcmFuc2xhdGFibGUsIG5vcm1hbGl6ZVRleHQgfSBmcm9tIFwiLi4vLi4vY29yZS90ZXh0LmpzXCI7XG5leHBvcnQgZnVuY3Rpb24gc2hhcGVGcm9tSHRtbFRhZyh0YWcpIHtcbiAgICBjb25zdCBsb3dlciA9IHRhZy50b0xvd2VyQ2FzZSgpO1xuICAgIGlmIChsb3dlciA9PT0gXCJidXR0b25cIilcbiAgICAgICAgcmV0dXJuIFwiYnV0dG9uXCI7XG4gICAgaWYgKGxvd2VyID09PSBcImFcIilcbiAgICAgICAgcmV0dXJuIFwibGlua1wiO1xuICAgIGlmIChsb3dlciA9PT0gXCJsYWJlbFwiKVxuICAgICAgICByZXR1cm4gXCJsYWJlbFwiO1xuICAgIGlmIChsb3dlciA9PT0gXCJ0aXRsZVwiIHx8IC9eaFsxLTZdJC8udGVzdChsb3dlcikpXG4gICAgICAgIHJldHVybiBcImhlYWRlclwiO1xuICAgIHJldHVybiBcImJvZHlcIjtcbn1cbi8vIExpZ2h0d2VpZ2h0IEhUTUwgZXh0cmFjdG9yIGZvciBpbmRleC5odG1sLXN0eWxlIGZpbGVzLiBEZXRlY3Rpb24gb25seTsgSFRNTCBpc1xuLy8gbm90IGF1dG8td3JhcHBlZCwgc28gdGhlIHJ1bnRpbWUgaW5qZWN0b3IgLyBzb3VyY2UgY2F0YWxvZyBjb3ZlcnMgaXQuXG5leHBvcnQgZnVuY3Rpb24gaWRlbnRpZnlIdG1sSGl0cyhodG1sKSB7XG4gICAgY29uc3QgaGl0cyA9IFtdO1xuICAgIGNvbnN0IHRhZ1RleHRQYXR0ZXJuID0gLzwodGl0bGV8aFsxLTZdfGJ1dHRvbnxhfGxhYmVsfHB8bGl8c3BhbilcXGJbXj5dKj4oW148XSpcXHB7TH1bXjxdKik8XFwvXFwxPi9naXU7XG4gICAgY29uc3QgYXR0clBhdHRlcm4gPSAvXFxiKGFyaWEtbGFiZWx8dGl0bGV8YWx0fHBsYWNlaG9sZGVyKT1cIihbXlwiXSpcXHB7TH1bXlwiXSopXCIvZ2l1O1xuICAgIGNvbnN0IGxpbmVGb3IgPSAoaW5kZXgpID0+IGh0bWwuc2xpY2UoMCwgaW5kZXgpLnNwbGl0KC9cXHI/XFxuLykubGVuZ3RoO1xuICAgIGNvbnN0IHB1c2ggPSAocmF3VGV4dCwgc2hhcGUsIGtpbmQsIHB1cnBvc2UsIGluZGV4KSA9PiB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBub3JtYWxpemVUZXh0KHJhd1RleHQpO1xuICAgICAgICBpZiAoIWlzUHJvYmFibHlUcmFuc2xhdGFibGUodGV4dCkpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGhpdHMucHVzaCh7IHRleHQsIHNoYXBlLCBwdXJwb3NlLCB2aXN1YWxDb250ZXh0OiBcIlwiLCBraW5kLCBsaW5lOiBsaW5lRm9yKGluZGV4KSB9KTtcbiAgICB9O1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgaHRtbC5tYXRjaEFsbCh0YWdUZXh0UGF0dGVybikpIHtcbiAgICAgICAgY29uc3QgdGFnID0gbWF0Y2hbMV0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgcHVzaChtYXRjaFsyXSwgc2hhcGVGcm9tSHRtbFRhZyh0YWcpLCBgaHRtbC0ke3RhZ30tdGV4dGAsIHRhZyA9PT0gXCJ0aXRsZVwiXG4gICAgICAgICAgICA/IFwiZG9jdW1lbnQgdGl0bGUgc2hvd24gaW4gYnJvd3NlciB0YWJzIGFuZCBzZWFyY2ggcmVzdWx0c1wiXG4gICAgICAgICAgICA6IFwic3RhdGljIEhUTUwgdGV4dCBzaG93biB0byB1c2Vyc1wiLCBtYXRjaC5pbmRleCA/PyAwKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBodG1sLm1hdGNoQWxsKGF0dHJQYXR0ZXJuKSkge1xuICAgICAgICBjb25zdCBpbmZvID0gcHJvcFNoYXBlc1ttYXRjaFsxXS50b0xvd2VyQ2FzZSgpXTtcbiAgICAgICAgaWYgKCFpbmZvKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIHB1c2gobWF0Y2hbMl0sIGluZm8uc2hhcGUsIGBodG1sLSR7aW5mby5raW5kfWAsIGluZm8ucHVycG9zZSwgbWF0Y2guaW5kZXggPz8gMCk7XG4gICAgfVxuICAgIHJldHVybiBoaXRzO1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1MTA4ODI5MlxcXFxDYXNjYWRlUHJvamVjdHNcXFxcc2Nyb2xsLWdvYmxpblxcXFxhcHBzXFxcXHdlYlxcXFx2ZW5kb3JcXFxcaGVkZ2VsaW5nLWkxOG5cXFxcZGlzdFxcXFxhZGFwdGVyc1xcXFxodG1sXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1MTA4ODI5MlxcXFxDYXNjYWRlUHJvamVjdHNcXFxcc2Nyb2xsLWdvYmxpblxcXFxhcHBzXFxcXHdlYlxcXFx2ZW5kb3JcXFxcaGVkZ2VsaW5nLWkxOG5cXFxcZGlzdFxcXFxhZGFwdGVyc1xcXFxodG1sXFxcXGluZGV4LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy91MTA4ODI5Mi9DYXNjYWRlUHJvamVjdHMvc2Nyb2xsLWdvYmxpbi9hcHBzL3dlYi92ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy9odG1sL2luZGV4LmpzXCI7aW1wb3J0IHsgaWRlbnRpZnlIdG1sSGl0cyB9IGZyb20gXCIuL2lkZW50aWZ5LmpzXCI7XG4vLyBBZGFwdGVyOiBIVE1MLiBFeHRyYWN0aW9uIG9ubHk7IGFwcGxpZWQgYXQgcnVudGltZSBieSB0aGUgRE9NIGluamVjdG9yLlxuZXhwb3J0IGNvbnN0IGh0bWxBZGFwdGVyID0ge1xuICAgIG5hbWU6IFwiaHRtbFwiLFxuICAgIGV4dGVuc2lvbnM6IFtcIi5odG1sXCIsIFwiLmh0bVwiXSxcbiAgICBpZGVudGlmeTogKHNvdXJjZSkgPT4gaWRlbnRpZnlIdG1sSGl0cyhzb3VyY2UpLFxufTtcbmV4cG9ydCAqIGZyb20gXCIuL2lkZW50aWZ5LmpzXCI7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXHZ1ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcYWRhcHRlcnNcXFxcdnVlXFxcXGlkZW50aWZ5LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy91MTA4ODI5Mi9DYXNjYWRlUHJvamVjdHMvc2Nyb2xsLWdvYmxpbi9hcHBzL3dlYi92ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy92dWUvaWRlbnRpZnkuanNcIjtpbXBvcnQgeyBpc1Byb2JhYmx5VHJhbnNsYXRhYmxlLCBub3JtYWxpemVUZXh0IH0gZnJvbSBcIi4uLy4uL2NvcmUvdGV4dC5qc1wiO1xuLy8gTWFwIGEgVnVlL0hUTUwgdGVtcGxhdGUgdGFnIHRvIGEgdHJhbnNsYXRhYmxlIHNoYXBlLiBLZXB0IGxvY2FsIHRvIHRoZSBWdWVcbi8vIGFkYXB0ZXIgc28gaXQgc3RheXMgaW5kZXBlbmRlbnQgb2YgdGhlIEhUTUwvUmVhY3QgYWRhcHRlcnMuXG5mdW5jdGlvbiBzaGFwZUZvclRhZyh0YWcpIHtcbiAgICBjb25zdCBsb3dlciA9IHRhZy50b0xvd2VyQ2FzZSgpO1xuICAgIGlmIChsb3dlciA9PT0gXCJidXR0b25cIilcbiAgICAgICAgcmV0dXJuIFwiYnV0dG9uXCI7XG4gICAgaWYgKGxvd2VyID09PSBcImFcIiB8fCBsb3dlciA9PT0gXCJyb3V0ZXItbGlua1wiIHx8IGxvd2VyID09PSBcIm51eHQtbGlua1wiKVxuICAgICAgICByZXR1cm4gXCJsaW5rXCI7XG4gICAgaWYgKGxvd2VyID09PSBcImxhYmVsXCIpXG4gICAgICAgIHJldHVybiBcImxhYmVsXCI7XG4gICAgaWYgKC9eaFsxLTZdJC8udGVzdChsb3dlcikpXG4gICAgICAgIHJldHVybiBcImhlYWRlclwiO1xuICAgIHJldHVybiBcImJvZHlcIjtcbn1cbi8vIFRyYW5zbGF0YWJsZSBhdHRyaWJ1dGUgbmFtZXMgKHN0YXRpYyBvbmx5OyBib3VuZCBgOmF0dHJgL2B2LWJpbmQ6YCBhcmUgZHluYW1pYykuXG5jb25zdCBBVFRSX1NIQVBFUyA9IHtcbiAgICBwbGFjZWhvbGRlcjoge1xuICAgICAgICBzaGFwZTogXCJwbGFjZWhvbGRlclwiLFxuICAgICAgICBraW5kOiBcInBsYWNlaG9sZGVyXCIsXG4gICAgICAgIHB1cnBvc2U6IFwicGxhY2Vob2xkZXIgdGV4dCBzaG93biBpbnNpZGUgYW4gaW5wdXQgYmVmb3JlIHRoZSB1c2VyIGVudGVycyBjb250ZW50XCIsXG4gICAgfSxcbiAgICB0aXRsZTogeyBzaGFwZTogXCJ0b29sdGlwXCIsIGtpbmQ6IFwidGl0bGUtYXR0cmlidXRlXCIsIHB1cnBvc2U6IFwidG9vbHRpcCB0ZXh0IHNob3duIGZvciBhZGRpdGlvbmFsIGNvbnRleHRcIiB9LFxuICAgIFwiYXJpYS1sYWJlbFwiOiB7XG4gICAgICAgIHNoYXBlOiBcImxhYmVsXCIsXG4gICAgICAgIGtpbmQ6IFwiYXJpYS1sYWJlbFwiLFxuICAgICAgICBwdXJwb3NlOiBcImFjY2Vzc2liaWxpdHkgbGFiZWwgZm9yIGFuIGludGVyYWN0aXZlIG9yIHZpc3VhbCBlbGVtZW50XCIsXG4gICAgfSxcbiAgICBhbHQ6IHsgc2hhcGU6IFwibGFiZWxcIiwga2luZDogXCJhbHQtdGV4dFwiLCBwdXJwb3NlOiBcImFsdGVybmF0aXZlIHRleHQgZm9yIGFuIGltYWdlIG9yIHZpc3VhbCBlbGVtZW50XCIgfSxcbiAgICBsYWJlbDogeyBzaGFwZTogXCJsYWJlbFwiLCBraW5kOiBcImNvbXBvbmVudC1sYWJlbFwiLCBwdXJwb3NlOiBcImxhYmVsIHBhc3NlZCB0byBhIFVJIGNvbXBvbmVudFwiIH0sXG59O1xuLy8gQ29udmVydCBWdWUgbXVzdGFjaGUgaW50ZXJwb2xhdGlvbiB0byBhbiBJQ1Utc3R5bGUgcGxhY2Vob2xkZXIsIG1hdGNoaW5nIHRoZVxuLy8gcmVzdCBvZiB0aGUgcGlwZWxpbmUgKFwiSGVsbG8ge3sgdXNlci5uYW1lIH19XCIgLT4gXCJIZWxsbyB7bmFtZX1cIikuIFB1cmUtZHluYW1pY1xuLy8gdGV4dCAob25seSBhIG11c3RhY2hlLCBubyB3b3JkcykgaXMgZmlsdGVyZWQgb3V0IGxhdGVyIGJ5IGlzUHJvYmFibHlUcmFuc2xhdGFibGUuXG5mdW5jdGlvbiBtdXN0YWNoZVRvUGxhY2Vob2xkZXIodGV4dCkge1xuICAgIHJldHVybiB0ZXh0LnJlcGxhY2UoL1xce1xce1xccyooW159XSs/KVxccypcXH1cXH0vZywgKF9tLCBleHByKSA9PiB7XG4gICAgICAgIGNvbnN0IHRyaW1tZWQgPSBTdHJpbmcoZXhwcikudHJpbSgpO1xuICAgICAgICAvLyBUcmFpbGluZyBpZGVudGlmaWVyIG9mIGEgcGF0aC9leHByZXNzaW9uOiB1c2VyLm5hbWUgLT4gbmFtZSwgY291bnQgLT4gY291bnQuXG4gICAgICAgIGNvbnN0IG1hdGNoID0gdHJpbW1lZC5tYXRjaCgvKFtBLVphLXpfJF1bXFx3JF0qKVxccyokLyk7XG4gICAgICAgIHJldHVybiBgeyR7bWF0Y2ggPyBtYXRjaFsxXSA6IFwidmFsdWVcIn19YDtcbiAgICB9KTtcbn1cbi8vIFRydWUgd2hlbiB0aGUgbWVzc2FnZSBoYXMgcmVhbCB3b3JkcyBvdXRzaWRlIHtuYW1lfSBwbGFjZWhvbGRlcnMsIHNvIGFcbi8vIHB1cmUtaW50ZXJwb2xhdGlvbiBub2RlIGxpa2Uge3sgb25seUR5bmFtaWMgfX0gKFwie29ubHlEeW5hbWljfVwiKSBpcyBza2lwcGVkLlxuZnVuY3Rpb24gaGFzV29yZHNPdXRzaWRlUGxhY2Vob2xkZXJzKG1lc3NhZ2UpIHtcbiAgICByZXR1cm4gL1xccHtMfS91LnRlc3QobWVzc2FnZS5yZXBsYWNlKC9cXHtbYS16QS1aMC05X10rXFx9L2csIFwiXCIpKTtcbn1cbi8vIEV4dHJhY3Rpb24tb25seSBhZGFwdGVyIGZvciBWdWUgU2luZ2xlLUZpbGUgQ29tcG9uZW50cy4gU2NhbnMgdGhlIHRvcC1sZXZlbFxuLy8gPHRlbXBsYXRlPiBibG9jayBmb3IgZWxlbWVudCB0ZXh0IGFuZCBzdGF0aWMgdHJhbnNsYXRhYmxlIGF0dHJpYnV0ZXMuIERldGVjdGlvblxuLy8gb25seSBcdTIwMTQgVnVlIHN0cmluZ3MgYXJlIGFwcGxpZWQgYXQgcnVudGltZSBieSB0aGUgRE9NIGluamVjdG9yLlxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aWZ5VnVlSGl0cyhzb3VyY2UpIHtcbiAgICBjb25zdCBoaXRzID0gW107XG4gICAgLy8gUmVzdHJpY3QgdG8gdGhlIDx0ZW1wbGF0ZT4gYmxvY2s7IDxzY3JpcHQ+LzxzdHlsZT4gYXJlIG5vdCBVSSBjb3B5LlxuICAgIGNvbnN0IHRlbXBsYXRlTWF0Y2ggPSBzb3VyY2UubWF0Y2goLzx0ZW1wbGF0ZVxcYltePl0qPihbXFxzXFxTXSo/KTxcXC90ZW1wbGF0ZT4vaSk7XG4gICAgaWYgKCF0ZW1wbGF0ZU1hdGNoKVxuICAgICAgICByZXR1cm4gaGl0cztcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHRlbXBsYXRlTWF0Y2hbMV07XG4gICAgY29uc3QgdGVtcGxhdGVPZmZzZXQgPSB0ZW1wbGF0ZU1hdGNoLmluZGV4ICsgdGVtcGxhdGVNYXRjaFswXS5pbmRleE9mKHRlbXBsYXRlKTtcbiAgICBjb25zdCBsaW5lRm9yID0gKGluZGV4KSA9PiBzb3VyY2Uuc2xpY2UoMCwgdGVtcGxhdGVPZmZzZXQgKyBpbmRleCkuc3BsaXQoL1xccj9cXG4vKS5sZW5ndGg7XG4gICAgY29uc3QgcHVzaCA9IChyYXdUZXh0LCBzaGFwZSwga2luZCwgcHVycG9zZSwgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgdGV4dCA9IG5vcm1hbGl6ZVRleHQobXVzdGFjaGVUb1BsYWNlaG9sZGVyKHJhd1RleHQpKTtcbiAgICAgICAgaWYgKCFpc1Byb2JhYmx5VHJhbnNsYXRhYmxlKHRleHQpKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAoIWhhc1dvcmRzT3V0c2lkZVBsYWNlaG9sZGVycyh0ZXh0KSlcbiAgICAgICAgICAgIHJldHVybjsgLy8gcHVyZSB7eyB9fSBpbnRlcnBvbGF0aW9uXG4gICAgICAgIGhpdHMucHVzaCh7IHRleHQsIHNoYXBlLCBwdXJwb3NlLCB2aXN1YWxDb250ZXh0OiBcIlwiLCBraW5kLCBsaW5lOiBsaW5lRm9yKGluZGV4KSB9KTtcbiAgICB9O1xuICAgIC8vIEVsZW1lbnQgdGV4dCBjb250ZW50IGZvciB0cmFuc2xhdGFibGUgdGFncyAob25lIGxldmVsOyBubyBuZXN0ZWQgZWxlbWVudCBjaGlsZHJlbikuXG4gICAgY29uc3QgdGFnVGV4dFBhdHRlcm4gPSAvPChoWzEtNl18YnV0dG9ufGF8bGFiZWx8cHxsaXxzcGFufGRpdnxyb3V0ZXItbGlua3xudXh0LWxpbmspXFxiW14+XSo+KFtePF0qXFxwe0x9W148XSopPFxcL1xcMT4vZ2l1O1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgdGVtcGxhdGUubWF0Y2hBbGwodGFnVGV4dFBhdHRlcm4pKSB7XG4gICAgICAgIGNvbnN0IHRhZyA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHB1c2gobWF0Y2hbMl0sIHNoYXBlRm9yVGFnKHRhZyksIGB2dWUtJHt0YWd9LXRleHRgLCBcInRleHQgc2hvd24gdG8gdXNlcnMgaW4gYSBWdWUgdGVtcGxhdGVcIiwgbWF0Y2guaW5kZXggPz8gMCk7XG4gICAgfVxuICAgIC8vIFN0YXRpYyB0cmFuc2xhdGFibGUgYXR0cmlidXRlcy4gTmVnYXRpdmUgbG9va2JlaGluZCByZWplY3RzIGJvdW5kIGF0dHJpYnV0ZXNcbiAgICAvLyAoYDp0aXRsZWAsIGB2LWJpbmQ6dGl0bGVgKSB3aG9zZSB2YWx1ZSBpcyBhIEpTIGV4cHJlc3Npb24sIG5vdCBjb3B5LlxuICAgIGNvbnN0IGF0dHJQYXR0ZXJuID0gLyg/PCFbOlxcdy1dKShwbGFjZWhvbGRlcnx0aXRsZXxhcmlhLWxhYmVsfGFsdHxsYWJlbClcXHMqPVxccypcIihbXlwiXSpcXHB7TH1bXlwiXSopXCIvZ2l1O1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgdGVtcGxhdGUubWF0Y2hBbGwoYXR0clBhdHRlcm4pKSB7XG4gICAgICAgIGNvbnN0IGluZm8gPSBBVFRSX1NIQVBFU1ttYXRjaFsxXS50b0xvd2VyQ2FzZSgpXTtcbiAgICAgICAgaWYgKCFpbmZvKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIHB1c2gobWF0Y2hbMl0sIGluZm8uc2hhcGUsIGB2dWUtJHtpbmZvLmtpbmR9YCwgaW5mby5wdXJwb3NlLCBtYXRjaC5pbmRleCA/PyAwKTtcbiAgICB9XG4gICAgcmV0dXJuIGhpdHM7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXHZ1ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcYWRhcHRlcnNcXFxcdnVlXFxcXGluZGV4LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy91MTA4ODI5Mi9DYXNjYWRlUHJvamVjdHMvc2Nyb2xsLWdvYmxpbi9hcHBzL3dlYi92ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy92dWUvaW5kZXguanNcIjtpbXBvcnQgeyBpZGVudGlmeVZ1ZUhpdHMgfSBmcm9tIFwiLi9pZGVudGlmeS5qc1wiO1xuLy8gQWRhcHRlcjogVnVlIFNpbmdsZS1GaWxlIENvbXBvbmVudHMuIEV4dHJhY3Rpb24gb25seSAodGVtcGxhdGUgdGV4dCArIHN0YXRpY1xuLy8gYXR0cmlidXRlcyk7IGFwcGxpZWQgYXQgcnVudGltZSBieSB0aGUgRE9NIGluamVjdG9yLCBsaWtlIHRoZSBIVE1MIGFkYXB0ZXIuXG4vLyBEZW1vbnN0cmF0ZXMgdGhlIHNlYW06IGEgbmV3IGZyYW1ld29yayBuZWVkcyBvbmx5IGlkZW50aWZ5KCkgKyBhbiBleHRlbnNpb24uXG5leHBvcnQgY29uc3QgdnVlQWRhcHRlciA9IHtcbiAgICBuYW1lOiBcInZ1ZVwiLFxuICAgIGV4dGVuc2lvbnM6IFtcIi52dWVcIl0sXG4gICAgaWRlbnRpZnk6IChzb3VyY2UpID0+IGlkZW50aWZ5VnVlSGl0cyhzb3VyY2UpLFxufTtcbmV4cG9ydCAqIGZyb20gXCIuL2lkZW50aWZ5LmpzXCI7XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXGNzaGFycFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcYWRhcHRlcnNcXFxcY3NoYXJwXFxcXGxleGVyLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy91MTA4ODI5Mi9DYXNjYWRlUHJvamVjdHMvc2Nyb2xsLWdvYmxpbi9hcHBzL3dlYi92ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy9jc2hhcnAvbGV4ZXIuanNcIjsvLyBBIHNtYWxsLCBkZXBlbmRlbmN5LWZyZWUgQyMgc3RyaW5nIGxleGVyLiBJdCB3YWxrcyB0aGUgc291cmNlIGNoYXJhY3RlciBieVxuLy8gY2hhcmFjdGVyIHNvIHRoYXQgc3RyaW5nIGxpdGVyYWxzIGFyZSByZWNvZ25pc2VkIHN0cnVjdHVyYWxseSBcdTIwMTQgbmV2ZXIgbWF0Y2hlZFxuLy8gaW5zaWRlIGNvbW1lbnRzLCBjaGFyIGxpdGVyYWxzLCBvciBvdGhlciBzdHJpbmdzIFx1MjAxNCB3aGljaCBhIGJhcmUgcmVnZXggY2Fubm90IGRvXG4vLyByZWxpYWJseS4gVGhpcyBpcyB0aGUgXCJyZWFsIHBhcnNlciBlbWl0cyBvdXIgSVJcIiBzZWFtIGZvciBDIzogdGhlIGxleGVyIHlpZWxkc1xuLy8gbm9ybWFsaXplZCBzdHJpbmcgdG9rZW5zIHdpdGggYnl0ZSByYW5nZXMsIGFuZCB0aGUgYWRhcHRlcidzIGlkZW50aWZ5IHBhc3Ncbi8vIGRlY2lkZXMgd2hpY2ggb25lcyBzaXQgaW4gYSB1c2VyLWZhY2luZyBwb3NpdGlvbi5cbi8vXG4vLyBTdXBwb3J0ZWQgbGl0ZXJhbCBmb3JtcyAoQyMgMS4wIC0+IDExKTpcbi8vICAgXCIuLi5cIiAgICAgICAgcmVndWxhciAgICAgICAgIChcXC1lc2NhcGVzKVxuLy8gICBAXCIuLi5cIiAgICAgICB2ZXJiYXRpbSAgICAgICAgKFwiXCIgZXNjYXBlcyBhIHF1b3RlOyBuZXdsaW5lcyBhbGxvd2VkKVxuLy8gICAkXCIuLi5cIiAgICAgICBpbnRlcnBvbGF0ZWQgICAgKHtleHByfSBob2xlczsge3sgfX0gZXNjYXBlIGJyYWNlcylcbi8vICAgJEBcIi4uLlwiICAgICAgaW50ZXJwb2xhdGVkIHZlcmJhdGltIChhbmQgdGhlIEAkXCIuLi5cIiBvcmRlcmluZylcbi8vICAgXCJcIlwiLi4uXCJcIlwiICAgIHJhdyBzdHJpbmcgICAgICAoPj0zIHF1b3Rlczsgbm8gZXNjYXBpbmcpXG4vLyAgICRcIlwiXCIuLi5cIlwiXCIgICByYXcgaW50ZXJwb2xhdGVkXG4vLyBJbnRlcnBvbGF0aW9uIGhvbGVzIGFyZSBjb252ZXJ0ZWQgdG8gSUNVLXN0eWxlIHtuYW1lfSBwbGFjZWhvbGRlcnMgdG8gbWF0Y2ggdGhlXG4vLyByZXN0IG9mIHRoZSBIZWRnZWxpbmcgcGlwZWxpbmUgKGUuZy4gJFwiSGVsbG8ge3VzZXIuTmFtZX0hXCIgLT4gXCJIZWxsbyB7bmFtZX0hXCIpLlxuLy8gRGVyaXZlIGFuIElDVSBwbGFjZWhvbGRlciBuYW1lIGZyb20gYSBDIyBpbnRlcnBvbGF0aW9uIGV4cHJlc3Npb24sIG1pcnJvcmluZ1xuLy8gdGhlIEVjbWFTY3JpcHQgdGVtcGxhdGUgaGFuZGxpbmc6IHRyYWlsaW5nIGlkZW50aWZpZXIgb2YgdGhlIGV4cHJlc3Npb24sIHdpdGggYVxuLy8gYmVzdC1lZmZvcnQgc3RyaXAgb2YgYWxpZ25tZW50IChcIiw1XCIpIGFuZCBmb3JtYXQgKFwiOk4wXCIpIGNvbXBvbmVudHMuIEZhbGxzIGJhY2tcbi8vIHRvIFwidmFsdWVcIiBmb3IgY29tcGxleCBleHByZXNzaW9ucyB3aXRoIG5vIHRyYWlsaW5nIGlkZW50aWZpZXIuXG5mdW5jdGlvbiBwbGFjZWhvbGRlck5hbWUoZXhwcikge1xuICAgIGxldCBlID0gZXhwci50cmltKCk7XG4gICAgZSA9IGUucmVwbGFjZSgvLFxccyotP1xcZCtcXHMqJC8sIFwiXCIpOyAvLyBhbGlnbm1lbnQgY29tcG9uZW50OiBcIiw1XCIgLyBcIiwtMTBcIlxuICAgIGUgPSBlLnJlcGxhY2UoLzpbXjp7fSgpXSokLywgXCJcIik7IC8vIGZvcm1hdCBjb21wb25lbnQ6IFwiOk4wXCIsIFwiOnl5eXktTU0tZGRcIlxuICAgIGNvbnN0IG1hdGNoID0gZS5tYXRjaCgvKFtBLVphLXpfJF1bXFx3JF0qKVxccyokLyk7XG4gICAgcmV0dXJuIG1hdGNoID8gbWF0Y2hbMV0gOiBcInZhbHVlXCI7XG59XG4vLyBSZXNvbHZlIGNvbW1vbiBDIyBlc2NhcGUgc2VxdWVuY2VzIGluIGEgcmVndWxhciAobm9uLXZlcmJhdGltKSBzdHJpbmcgYm9keS5cbmZ1bmN0aW9uIGRlY29kZUVzY2FwZXMoYm9keSkge1xuICAgIHJldHVybiBib2R5LnJlcGxhY2UoL1xcXFwodVswLTlhLWZBLUZdezR9fHhbMC05YS1mQS1GXXsxLDR9fC4pL2csICh3aG9sZSwgZXNjKSA9PiB7XG4gICAgICAgIGNvbnN0IGMgPSBlc2NbMF07XG4gICAgICAgIGlmIChjID09PSBcInVcIiB8fCBjID09PSBcInhcIikge1xuICAgICAgICAgICAgY29uc3QgY29kZSA9IE51bWJlci5wYXJzZUludChlc2Muc2xpY2UoMSksIDE2KTtcbiAgICAgICAgICAgIHJldHVybiBOdW1iZXIuaXNGaW5pdGUoY29kZSkgPyBTdHJpbmcuZnJvbUNvZGVQb2ludChjb2RlKSA6IHdob2xlO1xuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAoYykge1xuICAgICAgICAgICAgY2FzZSBcIm5cIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcXG5cIjtcbiAgICAgICAgICAgIGNhc2UgXCJ0XCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXFx0XCI7XG4gICAgICAgICAgICBjYXNlIFwiclwiOlxuICAgICAgICAgICAgICAgIHJldHVybiBcIlxcclwiO1xuICAgICAgICAgICAgY2FzZSBcIjBcIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcXDBcIjtcbiAgICAgICAgICAgIGNhc2UgXCJcXFxcXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXFxcXFwiO1xuICAgICAgICAgICAgY2FzZSAnXCInOlxuICAgICAgICAgICAgICAgIHJldHVybiAnXCInO1xuICAgICAgICAgICAgY2FzZSBcIidcIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gXCInXCI7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiBjOyAvLyB1bmtub3duIGVzY2FwZSAtPiBrZWVwIHRoZSBlc2NhcGVkIGNoYXJhY3RlclxuICAgICAgICB9XG4gICAgfSk7XG59XG5leHBvcnQgZnVuY3Rpb24gbGV4Q1NoYXJwU3RyaW5ncyhzb3VyY2UpIHtcbiAgICBjb25zdCBvdXQgPSBbXTtcbiAgICBjb25zdCBsZW4gPSBzb3VyY2UubGVuZ3RoO1xuICAgIGxldCBpID0gMDtcbiAgICBjb25zdCBsaW5lQ29tbWVudEVuZCA9IChmcm9tKSA9PiB7XG4gICAgICAgIGNvbnN0IG5sID0gc291cmNlLmluZGV4T2YoXCJcXG5cIiwgZnJvbSk7XG4gICAgICAgIHJldHVybiBubCA9PT0gLTEgPyBsZW4gOiBubDtcbiAgICB9O1xuICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICAgIGNvbnN0IGMgPSBzb3VyY2VbaV07XG4gICAgICAgIC8vIENvbW1lbnRzLlxuICAgICAgICBpZiAoYyA9PT0gXCIvXCIgJiYgaSArIDEgPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChzb3VyY2VbaSArIDFdID09PSBcIi9cIikge1xuICAgICAgICAgICAgICAgIGkgPSBsaW5lQ29tbWVudEVuZChpICsgMik7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc291cmNlW2kgKyAxXSA9PT0gXCIqXCIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjbG9zZSA9IHNvdXJjZS5pbmRleE9mKFwiKi9cIiwgaSArIDIpO1xuICAgICAgICAgICAgICAgIGkgPSBjbG9zZSA9PT0gLTEgPyBsZW4gOiBjbG9zZSArIDI7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2hhciBsaXRlcmFsOiAnYScsICdcXG4nLCAnXFwnJy4gU2tpcCB3aXRob3V0IGVtaXR0aW5nLlxuICAgICAgICBpZiAoYyA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgIGxldCBqID0gaSArIDE7XG4gICAgICAgICAgICB3aGlsZSAoaiA8IGxlbikge1xuICAgICAgICAgICAgICAgIGlmIChzb3VyY2Vbal0gPT09IFwiXFxcXFwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGogKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzb3VyY2Vbal0gPT09IFwiJ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIGogKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzb3VyY2Vbal0gPT09IFwiXFxuXCIpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrOyAvLyB1bnRlcm1pbmF0ZWQ7IGJhaWxcbiAgICAgICAgICAgICAgICBqICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpID0gajtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIFN0cmluZyBsaXRlcmFscywgcG9zc2libHkgd2l0aCAkIC8gQCBwcmVmaXhlcyAoaW4gZWl0aGVyIG9yZGVyKS5cbiAgICAgICAgaWYgKGMgPT09ICdcIicgfHwgYyA9PT0gXCIkXCIgfHwgYyA9PT0gXCJAXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHRyeVJlYWRTdHJpbmcoc291cmNlLCBpKTtcbiAgICAgICAgICAgIGlmIChwYXJzZWQpIHtcbiAgICAgICAgICAgICAgICBvdXQucHVzaChwYXJzZWQpO1xuICAgICAgICAgICAgICAgIGkgPSBwYXJzZWQuZW5kO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQSBsb25lICQgb3IgQCB0aGF0IGlzbid0IGEgc3RyaW5nIHByZWZpeCAoZS5nLiB2ZXJiYXRpbSBpZGVudGlmaWVyXG4gICAgICAgICAgICAvLyBAY2xhc3MpIFx1MjAxNCBmYWxsIHRocm91Z2ggYW5kIGFkdmFuY2Ugb25lIGNoYXIuXG4gICAgICAgIH1cbiAgICAgICAgaSArPSAxO1xuICAgIH1cbiAgICByZXR1cm4gb3V0O1xufVxuLy8gQXR0ZW1wdCB0byByZWFkIGEgc3RyaW5nIGxpdGVyYWwgc3RhcnRpbmcgYXQgYHN0YXJ0YC4gUmV0dXJucyBudWxsIHdoZW4gdGhlXG4vLyBjaGFyYWN0ZXJzIGF0IGBzdGFydGAgYXJlIG5vdCBhY3R1YWxseSBhIHN0cmluZyBvcGVuZXIuXG5mdW5jdGlvbiB0cnlSZWFkU3RyaW5nKHNvdXJjZSwgc3RhcnQpIHtcbiAgICBjb25zdCBsZW4gPSBzb3VyY2UubGVuZ3RoO1xuICAgIGxldCBpID0gc3RhcnQ7XG4gICAgbGV0IGludGVycG9sYXRlZCA9IGZhbHNlO1xuICAgIGxldCB2ZXJiYXRpbSA9IGZhbHNlO1xuICAgIC8vIENvbnN1bWUgbGVhZGluZyAkIC8gQCBwcmVmaXhlcyBpbiBhbnkgb3JkZXIuXG4gICAgd2hpbGUgKGkgPCBsZW4gJiYgKHNvdXJjZVtpXSA9PT0gXCIkXCIgfHwgc291cmNlW2ldID09PSBcIkBcIikpIHtcbiAgICAgICAgaWYgKHNvdXJjZVtpXSA9PT0gXCIkXCIpXG4gICAgICAgICAgICBpbnRlcnBvbGF0ZWQgPSB0cnVlO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICB2ZXJiYXRpbSA9IHRydWU7XG4gICAgICAgIGkgKz0gMTtcbiAgICB9XG4gICAgaWYgKGkgPj0gbGVuIHx8IHNvdXJjZVtpXSAhPT0gJ1wiJylcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgLy8gUmF3IHN0cmluZyBsaXRlcmFsOiBhIHJ1biBvZiA+PSAzIHF1b3Rlcy5cbiAgICBsZXQgcXVvdGVSdW4gPSAwO1xuICAgIGxldCBxID0gaTtcbiAgICB3aGlsZSAocSA8IGxlbiAmJiBzb3VyY2VbcV0gPT09ICdcIicpIHtcbiAgICAgICAgcXVvdGVSdW4gKz0gMTtcbiAgICAgICAgcSArPSAxO1xuICAgIH1cbiAgICBpZiAocXVvdGVSdW4gPj0gMykge1xuICAgICAgICByZXR1cm4gcmVhZFJhdyhzb3VyY2UsIHN0YXJ0LCBpLCBxdW90ZVJ1biwgaW50ZXJwb2xhdGVkKTtcbiAgICB9XG4gICAgLy8gU2luZ2xlLXF1b3RlLW9wZW5lZCBzdHJpbmcgKHJlZ3VsYXIgb3IgdmVyYmF0aW0pLlxuICAgIGNvbnN0IGJvZHlTdGFydCA9IGkgKyAxO1xuICAgIHJldHVybiB2ZXJiYXRpbVxuICAgICAgICA/IHJlYWRWZXJiYXRpbShzb3VyY2UsIHN0YXJ0LCBib2R5U3RhcnQsIGludGVycG9sYXRlZClcbiAgICAgICAgOiByZWFkUmVndWxhcihzb3VyY2UsIHN0YXJ0LCBib2R5U3RhcnQsIGludGVycG9sYXRlZCk7XG59XG4vLyBSZWFkIHVudGlsIGFuIHVuZXNjYXBlZCBjbG9zaW5nIHF1b3RlIG9uIHRoZSBzYW1lIGxvZ2ljYWwgbGluZS5cbmZ1bmN0aW9uIHJlYWRSZWd1bGFyKHNvdXJjZSwgc3RhcnQsIGJvZHlTdGFydCwgaW50ZXJwb2xhdGVkKSB7XG4gICAgY29uc3QgbGVuID0gc291cmNlLmxlbmd0aDtcbiAgICBsZXQgaSA9IGJvZHlTdGFydDtcbiAgICBsZXQgcmF3ID0gXCJcIjtcbiAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgICBjb25zdCBjaCA9IHNvdXJjZVtpXTtcbiAgICAgICAgaWYgKGNoID09PSBcIlxcXFxcIikge1xuICAgICAgICAgICAgcmF3ICs9IHNvdXJjZS5zbGljZShpLCBpICsgMik7XG4gICAgICAgICAgICBpICs9IDI7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2ggPT09ICdcIicpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gaW50ZXJwb2xhdGVkXG4gICAgICAgICAgICAgICAgPyBjb252ZXJ0SW50ZXJwb2xhdGlvbnMoZGVjb2RlRXNjYXBlcyhyYXcpLCBmYWxzZSlcbiAgICAgICAgICAgICAgICA6IGRlY29kZUVzY2FwZXMocmF3KTtcbiAgICAgICAgICAgIHJldHVybiB7IHZhbHVlLCBzdGFydCwgZW5kOiBpICsgMSwgaW50ZXJwb2xhdGVkIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNoID09PSBcIlxcblwiKVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7IC8vIHVudGVybWluYXRlZCByZWd1bGFyIHN0cmluZ1xuICAgICAgICByYXcgKz0gY2g7XG4gICAgICAgIGkgKz0gMTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG4vLyBWZXJiYXRpbSBzdHJpbmc6IFwiXCIgZXNjYXBlcyBhIHF1b3RlOyBldmVyeXRoaW5nIGVsc2UgKGluY2wuIG5ld2xpbmVzKSBsaXRlcmFsLlxuZnVuY3Rpb24gcmVhZFZlcmJhdGltKHNvdXJjZSwgc3RhcnQsIGJvZHlTdGFydCwgaW50ZXJwb2xhdGVkKSB7XG4gICAgY29uc3QgbGVuID0gc291cmNlLmxlbmd0aDtcbiAgICBsZXQgaSA9IGJvZHlTdGFydDtcbiAgICBsZXQgcmF3ID0gXCJcIjtcbiAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgICBjb25zdCBjaCA9IHNvdXJjZVtpXTtcbiAgICAgICAgaWYgKGNoID09PSAnXCInKSB7XG4gICAgICAgICAgICBpZiAoc291cmNlW2kgKyAxXSA9PT0gJ1wiJykge1xuICAgICAgICAgICAgICAgIHJhdyArPSAnXCInO1xuICAgICAgICAgICAgICAgIGkgKz0gMjtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gaW50ZXJwb2xhdGVkID8gY29udmVydEludGVycG9sYXRpb25zKHJhdywgdHJ1ZSkgOiByYXc7XG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZSwgc3RhcnQsIGVuZDogaSArIDEsIGludGVycG9sYXRlZCB9O1xuICAgICAgICB9XG4gICAgICAgIHJhdyArPSBjaDtcbiAgICAgICAgaSArPSAxO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8vIFJhdyBzdHJpbmcgbGl0ZXJhbDogY2xvc2VzIG9uIGEgcnVuIG9mIGV4YWN0bHkgYHF1b3RlUnVuYCBxdW90ZXMuXG5mdW5jdGlvbiByZWFkUmF3KHNvdXJjZSwgc3RhcnQsIG9wZW5RdW90ZVN0YXJ0LCBxdW90ZVJ1biwgaW50ZXJwb2xhdGVkKSB7XG4gICAgY29uc3QgbGVuID0gc291cmNlLmxlbmd0aDtcbiAgICBjb25zdCBkZWxpbWl0ZXIgPSAnXCInLnJlcGVhdChxdW90ZVJ1bik7XG4gICAgY29uc3QgYm9keVN0YXJ0ID0gb3BlblF1b3RlU3RhcnQgKyBxdW90ZVJ1bjtcbiAgICBjb25zdCBjbG9zZSA9IHNvdXJjZS5pbmRleE9mKGRlbGltaXRlciwgYm9keVN0YXJ0KTtcbiAgICBpZiAoY2xvc2UgPT09IC0xKVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICBsZXQgcmF3ID0gc291cmNlLnNsaWNlKGJvZHlTdGFydCwgY2xvc2UpO1xuICAgIC8vIFBlciBzcGVjLCBhIG11bHRpLWxpbmUgcmF3IGxpdGVyYWwgZHJvcHMgdGhlIG9wZW5pbmcvY2xvc2luZyBuZXdsaW5lcyBhbmRcbiAgICAvLyBjb21tb24gaW5kZW50YXRpb24uIEEgbGlnaHQgbm9ybWFsaXphdGlvbiBpcyBlbm91Z2ggZm9yIGV4dHJhY3Rpb24uXG4gICAgcmF3ID0gcmF3LnJlcGxhY2UoL15cXHI/XFxuLywgXCJcIikucmVwbGFjZSgvXFxyP1xcblsgXFx0XSokLywgXCJcIik7XG4gICAgY29uc3QgdmFsdWUgPSBpbnRlcnBvbGF0ZWQgPyBjb252ZXJ0SW50ZXJwb2xhdGlvbnMocmF3LCB0cnVlKSA6IHJhdztcbiAgICByZXR1cm4geyB2YWx1ZSwgc3RhcnQsIGVuZDogY2xvc2UgKyBxdW90ZVJ1biwgaW50ZXJwb2xhdGVkIH07XG59XG4vLyBSZXBsYWNlIGludGVycG9sYXRpb24gaG9sZXMgKHtleHByfSkgd2l0aCB7bmFtZX0gcGxhY2Vob2xkZXJzLiBgdmVyYmF0aW1gXG4vLyBjb250cm9scyBicmFjZS1lc2NhcGUgaGFuZGxpbmc6IGluIGFsbCBpbnRlcnBvbGF0ZWQgZm9ybXMge3sgYW5kIH19IGFyZSBsaXRlcmFsXG4vLyBicmFjZXMuIE5lc3RlZCBicmFjZXMsIHBhcmVudGhlc2VzIGFuZCBpbm5lciBzdHJpbmcgbGl0ZXJhbHMgaW5zaWRlIGEgaG9sZSBhcmVcbi8vIHRyYWNrZWQgc28gd2Ugc3RvcCBhdCB0aGUgbWF0Y2hpbmcgdG9wLWxldmVsIGNsb3NpbmcgYnJhY2UuXG5mdW5jdGlvbiBjb252ZXJ0SW50ZXJwb2xhdGlvbnMoYm9keSwgX3ZlcmJhdGltKSB7XG4gICAgbGV0IG91dCA9IFwiXCI7XG4gICAgbGV0IGkgPSAwO1xuICAgIGNvbnN0IGxlbiA9IGJvZHkubGVuZ3RoO1xuICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICAgIGNvbnN0IGNoID0gYm9keVtpXTtcbiAgICAgICAgaWYgKGNoID09PSBcIntcIikge1xuICAgICAgICAgICAgaWYgKGJvZHlbaSArIDFdID09PSBcIntcIikge1xuICAgICAgICAgICAgICAgIG91dCArPSBcIntcIjtcbiAgICAgICAgICAgICAgICBpICs9IDI7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBTY2FuIHRoZSBob2xlIHRvIGl0cyBtYXRjaGluZyBjbG9zZSBicmFjZS5cbiAgICAgICAgICAgIGxldCBkZXB0aCA9IDE7XG4gICAgICAgICAgICBsZXQgaiA9IGkgKyAxO1xuICAgICAgICAgICAgbGV0IGV4cHIgPSBcIlwiO1xuICAgICAgICAgICAgd2hpbGUgKGogPCBsZW4gJiYgZGVwdGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2ogPSBib2R5W2pdO1xuICAgICAgICAgICAgICAgIGlmIChjaiA9PT0gXCJ7XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVwdGggKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgZXhwciArPSBjajtcbiAgICAgICAgICAgICAgICAgICAgaiArPSAxO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNqID09PSBcIn1cIikge1xuICAgICAgICAgICAgICAgICAgICBkZXB0aCAtPSAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGVwdGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGogKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGV4cHIgKz0gY2o7XG4gICAgICAgICAgICAgICAgICAgIGogKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFNraXAgbmVzdGVkIHN0cmluZyBsaXRlcmFscyBzbyB0aGVpciBicmFjZXMvcXVvdGVzIGRvbid0IGNvbmZ1c2UgdXMuXG4gICAgICAgICAgICAgICAgaWYgKGNqID09PSAnXCInIHx8IGNqID09PSBcIidcIikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBxdW90ZSA9IGNqO1xuICAgICAgICAgICAgICAgICAgICBleHByICs9IGNqO1xuICAgICAgICAgICAgICAgICAgICBqICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChqIDwgbGVuICYmIGJvZHlbal0gIT09IHF1b3RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYm9keVtqXSA9PT0gXCJcXFxcXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHByICs9IGJvZHkuc2xpY2UoaiwgaiArIDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGogKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cHIgKz0gYm9keVtqXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGogKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoaiA8IGxlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwciArPSBib2R5W2pdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaiArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBleHByICs9IGNqO1xuICAgICAgICAgICAgICAgIGogKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSBgeyR7cGxhY2Vob2xkZXJOYW1lKGV4cHIpfX1gO1xuICAgICAgICAgICAgaSA9IGo7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2ggPT09IFwifVwiKSB7XG4gICAgICAgICAgICBpZiAoYm9keVtpICsgMV0gPT09IFwifVwiKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IFwifVwiO1xuICAgICAgICAgICAgICAgIGkgKz0gMjtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dCArPSBcIn1cIjtcbiAgICAgICAgICAgIGkgKz0gMTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIG91dCArPSBjaDtcbiAgICAgICAgaSArPSAxO1xuICAgIH1cbiAgICByZXR1cm4gb3V0O1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1MTA4ODI5MlxcXFxDYXNjYWRlUHJvamVjdHNcXFxcc2Nyb2xsLWdvYmxpblxcXFxhcHBzXFxcXHdlYlxcXFx2ZW5kb3JcXFxcaGVkZ2VsaW5nLWkxOG5cXFxcZGlzdFxcXFxhZGFwdGVyc1xcXFxjc2hhcnBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXGNzaGFycFxcXFxpZGVudGlmeS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvdTEwODgyOTIvQ2FzY2FkZVByb2plY3RzL3Njcm9sbC1nb2JsaW4vYXBwcy93ZWIvdmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvYWRhcHRlcnMvY3NoYXJwL2lkZW50aWZ5LmpzXCI7aW1wb3J0IHsgaXNQcm9iYWJseVRyYW5zbGF0YWJsZSwgbG9va3NUZWNobmljYWwsIG5vcm1hbGl6ZVRleHQgfSBmcm9tIFwiLi4vLi4vY29yZS90ZXh0LmpzXCI7XG5pbXBvcnQgeyBsZXhDU2hhcnBTdHJpbmdzIH0gZnJvbSBcIi4vbGV4ZXIuanNcIjtcbi8vIEdlbmVyaWMgc2hhcGUgZm9yIGEgc3Vydml2aW5nIGxpdGVyYWwgd2hvc2UgY29kZSBwb3NpdGlvbiB3ZSBkb24ndCBzcGVjaWZpY2FsbHlcbi8vIHJlY29nbmlzZSBcdTIwMTQgZXh0cmFjdGlvbi1vbmx5LCBzbyB0aGUgQUkvY2xhc3NpZmljYXRpb24gc3RlcCByZWZpbmVzIGl0IGxhdGVyLlxuY29uc3QgREVGQVVMVF9TSEFQRSA9IHtcbiAgICBzaGFwZTogXCJib2R5XCIsXG4gICAga2luZDogXCJjc2hhcnAtc3RyaW5nXCIsXG4gICAgcHVycG9zZTogXCJzdHJpbmcgbGl0ZXJhbCB0aGF0IGFwcGVhcnMgdG8gYmUgdXNlci1mYWNpbmcgY29weVwiLFxufTtcbi8vIE9iamVjdC9tZW1iZXIvaW5pdGlhbGl6ZXIgcHJvcGVydHkgbmFtZXMgd2hvc2UgYXNzaWduZWQgc3RyaW5nIGlzIFVJIGNvcHkuXG4vLyBNYXRjaGVzIGBsYWJlbC5UZXh0ID0gXCIuLi5cImAsIGBuZXcgQnV0dG9uIHsgQ29udGVudCA9IFwiLi4uXCIgfWAsIFdQRi9XaW5Gb3Jtcy9cbi8vIE1BVUkvVW5pdHkgY29udHJvbCBwcm9wZXJ0aWVzLCBldGMuIENvbXBhcmlzb24gb3BlcmF0b3JzICg9PSwgIT0sID49KSBuZXZlclxuLy8gbWF0Y2ggYmVjYXVzZSB0aGUgcmVnZXggYW5jaG9ycyBhIHNpbmdsZSBgPWAgZGlyZWN0bHkgYWZ0ZXIgdGhlIGlkZW50aWZpZXIuXG5jb25zdCBQUk9QX1NIQVBFUyA9IHtcbiAgICBUZXh0OiB7IHNoYXBlOiBcImJvZHlcIiwga2luZDogXCJjc2hhcnAtdGV4dFwiLCBwdXJwb3NlOiBcInRleHQgZGlzcGxheWVkIHRvIHRoZSB1c2VyIGluIGEgVUkgY29udHJvbFwiIH0sXG4gICAgdGV4dDogeyBzaGFwZTogXCJib2R5XCIsIGtpbmQ6IFwiY3NoYXJwLXVuaXR5LXRleHRcIiwgcHVycG9zZTogXCJ0ZXh0IGRpc3BsYXllZCB0byB0aGUgdXNlciAoVW5pdHkgVUkvVE1QKVwiIH0sXG4gICAgQ29udGVudDogeyBzaGFwZTogXCJib2R5XCIsIGtpbmQ6IFwiY3NoYXJwLWNvbnRlbnRcIiwgcHVycG9zZTogXCJjb250ZW50IHNob3duIGluIGEgVUkgY29udHJvbCAoZS5nLiBhIGJ1dHRvbiBvciBsYWJlbClcIiB9LFxuICAgIEhlYWRlcjogeyBzaGFwZTogXCJoZWFkZXJcIiwga2luZDogXCJjc2hhcnAtaGVhZGVyXCIsIHB1cnBvc2U6IFwiaGVhZGVyIHRleHQgb2YgYSBVSSBjb250cm9sIG9yIGdyb3VwXCIgfSxcbiAgICBIZWFkZXJUZXh0OiB7IHNoYXBlOiBcImhlYWRlclwiLCBraW5kOiBcImNzaGFycC1oZWFkZXJcIiwgcHVycG9zZTogXCJoZWFkZXIgdGV4dCBvZiBhIGNvbHVtbiBvciBjb250cm9sXCIgfSxcbiAgICBUaXRsZTogeyBzaGFwZTogXCJoZWFkZXJcIiwga2luZDogXCJjc2hhcnAtdGl0bGVcIiwgcHVycG9zZTogXCJ0aXRsZSBzaG93biBpbiBhIHdpbmRvdywgZGlhbG9nLCBvciBjb250cm9sXCIgfSxcbiAgICBDYXB0aW9uOiB7IHNoYXBlOiBcImhlYWRlclwiLCBraW5kOiBcImNzaGFycC1jYXB0aW9uXCIsIHB1cnBvc2U6IFwiY2FwdGlvbiBzaG93biBvbiBhIFVJIGVsZW1lbnRcIiB9LFxuICAgIFRvb2xUaXA6IHsgc2hhcGU6IFwidG9vbHRpcFwiLCBraW5kOiBcImNzaGFycC10b29sdGlwXCIsIHB1cnBvc2U6IFwidG9vbHRpcCB0ZXh0IHNob3duIG9uIGhvdmVyIGZvciBleHRyYSBjb250ZXh0XCIgfSxcbiAgICBUb29sVGlwVGV4dDogeyBzaGFwZTogXCJ0b29sdGlwXCIsIGtpbmQ6IFwiY3NoYXJwLXRvb2x0aXBcIiwgcHVycG9zZTogXCJ0b29sdGlwIHRleHQgc2hvd24gb24gaG92ZXIgZm9yIGV4dHJhIGNvbnRleHRcIiB9LFxuICAgIFdhdGVybWFyazogeyBzaGFwZTogXCJwbGFjZWhvbGRlclwiLCBraW5kOiBcImNzaGFycC13YXRlcm1hcmtcIiwgcHVycG9zZTogXCJwbGFjZWhvbGRlciB0ZXh0IHNob3duIGluc2lkZSBhbiBlbXB0eSBpbnB1dFwiIH0sXG4gICAgUGxhY2Vob2xkZXJUZXh0OiB7XG4gICAgICAgIHNoYXBlOiBcInBsYWNlaG9sZGVyXCIsXG4gICAgICAgIGtpbmQ6IFwiY3NoYXJwLXBsYWNlaG9sZGVyXCIsXG4gICAgICAgIHB1cnBvc2U6IFwicGxhY2Vob2xkZXIgdGV4dCBzaG93biBpbnNpZGUgYW4gZW1wdHkgaW5wdXRcIixcbiAgICB9LFxuICAgIFBsYWNlaG9sZGVyOiB7IHNoYXBlOiBcInBsYWNlaG9sZGVyXCIsIGtpbmQ6IFwiY3NoYXJwLXBsYWNlaG9sZGVyXCIsIHB1cnBvc2U6IFwicGxhY2Vob2xkZXIgdGV4dCBzaG93biBpbnNpZGUgYW4gZW1wdHkgaW5wdXRcIiB9LFxuICAgIFByb21wdDogeyBzaGFwZTogXCJwbGFjZWhvbGRlclwiLCBraW5kOiBcImNzaGFycC1wcm9tcHRcIiwgcHVycG9zZTogXCJwcm9tcHQgdGV4dCBndWlkaW5nIHRoZSB1c2VyJ3MgaW5wdXRcIiB9LFxuICAgIExhYmVsOiB7IHNoYXBlOiBcImxhYmVsXCIsIGtpbmQ6IFwiY3NoYXJwLWxhYmVsXCIsIHB1cnBvc2U6IFwibGFiZWwgZm9yIGFuIGludGVyYWN0aXZlIG9yIHZpc3VhbCBlbGVtZW50XCIgfSxcbiAgICBHcm91cE5hbWU6IHsgc2hhcGU6IFwibGFiZWxcIiwga2luZDogXCJjc2hhcnAtZ3JvdXBcIiwgcHVycG9zZTogXCJuYW1lIG9mIGEgZ3JvdXAgb2YgcmVsYXRlZCBjb250cm9sc1wiIH0sXG4gICAgTWVzc2FnZTogeyBzaGFwZTogXCJib2R5XCIsIGtpbmQ6IFwiY3NoYXJwLW1lc3NhZ2VcIiwgcHVycG9zZTogXCJtZXNzYWdlIHNob3duIHRvIHRoZSB1c2VyXCIgfSxcbiAgICBEZXNjcmlwdGlvbjogeyBzaGFwZTogXCJib2R5XCIsIGtpbmQ6IFwiY3NoYXJwLWRlc2NyaXB0aW9uXCIsIHB1cnBvc2U6IFwiZGVzY3JpcHRpdmUgY29weSBzaG93biB0byB0aGUgdXNlclwiIH0sXG59O1xuLy8gUHJvcGVydHktYXNzaWdubWVudCAvIG9iamVjdC1pbml0aWFsaXplciBwb3NpdGlvbjogYDxOYW1lPiA9IFwiLi4uXCJgLlxuY29uc3QgUFJPUF9BU1NJR04gPSAvXFxiKFtBLVphLXpfXVtBLVphLXowLTlfXSopXFxzKj1cXHMqJC87XG4vLyBNZXRob2QtY2FsbCBwb3NpdGlvbnMgd2hvc2UgZmlyc3Qgc3RyaW5nIGFyZ3VtZW50IGlzIFVJIGNvcHkuIEVhY2ggZW50cnkgcGFpcnNcbi8vIGEgcmVnZXggbWF0Y2hpbmcgdGhlIGNhbGwgb3BlbmluZyAoaW1tZWRpYXRlbHkgYmVmb3JlIHRoZSBsaXRlcmFsKSB3aXRoIGEgc2hhcGUuXG5jb25zdCBDQUxMX1JVTEVTID0gW1xuICAgIHtcbiAgICAgICAgcGF0dGVybjogL1xcYk1lc3NhZ2VCb3hcXC5TaG93KD86QXN5bmMpP1xccypcXChcXHMqJC8sXG4gICAgICAgIGluZm86IHsgc2hhcGU6IFwiYWxlcnRcIiwga2luZDogXCJjc2hhcnAtbWVzc2FnZWJveFwiLCBwdXJwb3NlOiBcIm1lc3NhZ2Ugc2hvd24gaW4gYSBkaWFsb2cgYm94XCIgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgICAgcGF0dGVybjogL1xcYkNvbnNvbGVcXC4oPzpXcml0ZUxpbmV8V3JpdGUpXFxzKlxcKFxccyokLyxcbiAgICAgICAgaW5mbzogeyBzaGFwZTogXCJib2R5XCIsIGtpbmQ6IFwiY3NoYXJwLWNvbnNvbGVcIiwgcHVycG9zZTogXCJ0ZXh0IHByaW50ZWQgdG8gdGhlIGNvbnNvbGUgZm9yIHRoZSB1c2VyXCIgfSxcbiAgICB9LFxuXTtcbi8vIEF0dHJpYnV0ZSBwb3NpdGlvbnM6IGBbRGlzcGxheShOYW1lID0gXCIuLi5cIildYCwgYFtEaXNwbGF5TmFtZShcIi4uLlwiKV1gLFxuLy8gYFtEZXNjcmlwdGlvbihcIi4uLlwiKV1gLCBgW0NhdGVnb3J5KFwiLi4uXCIpXWAuIFRoZXNlIHN1cmZhY2UgaW4gVUkgdmlhIGRhdGFcbi8vIGFubm90YXRpb25zIC8gcHJvcGVydHkgZ3JpZHMuXG5jb25zdCBBVFRSX1JVTEVTID0gW1xuICAgIHtcbiAgICAgICAgcGF0dGVybjogL1xcWyg/OlN5c3RlbVxcLkNvbXBvbmVudE1vZGVsXFwuRGF0YUFubm90YXRpb25zXFwuKT9EaXNwbGF5XFxzKlxcKFteXFxdKV0qXFxiKD86TmFtZXxQcm9tcHR8R3JvdXBOYW1lfERlc2NyaXB0aW9ufFNob3J0TmFtZSlcXHMqPVxccyokLyxcbiAgICAgICAgaW5mbzogeyBzaGFwZTogXCJsYWJlbFwiLCBraW5kOiBcImNzaGFycC1kaXNwbGF5LWF0dHJcIiwgcHVycG9zZTogXCJkaXNwbGF5IG5hbWUgc2hvd24gZm9yIGEgbW9kZWwgZmllbGRcIiB9LFxuICAgIH0sXG4gICAge1xuICAgICAgICBwYXR0ZXJuOiAvXFxbKD86U3lzdGVtXFwuQ29tcG9uZW50TW9kZWxcXC4pP0Rpc3BsYXlOYW1lXFxzKlxcKFxccyokLyxcbiAgICAgICAgaW5mbzogeyBzaGFwZTogXCJsYWJlbFwiLCBraW5kOiBcImNzaGFycC1kaXNwbGF5bmFtZS1hdHRyXCIsIHB1cnBvc2U6IFwiZGlzcGxheSBuYW1lIHNob3duIGZvciBhIG1lbWJlclwiIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICAgIHBhdHRlcm46IC9cXFsoPzpTeXN0ZW1cXC5Db21wb25lbnRNb2RlbFxcLik/RGVzY3JpcHRpb25cXHMqXFwoXFxzKiQvLFxuICAgICAgICBpbmZvOiB7IHNoYXBlOiBcImJvZHlcIiwga2luZDogXCJjc2hhcnAtZGVzY3JpcHRpb24tYXR0clwiLCBwdXJwb3NlOiBcImRlc2NyaXB0aW9uIHNob3duIGZvciBhIG1lbWJlciBvciBzZXR0aW5nXCIgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgICAgcGF0dGVybjogL1xcWyg/OlN5c3RlbVxcLkNvbXBvbmVudE1vZGVsXFwuKT9DYXRlZ29yeVxccypcXChcXHMqJC8sXG4gICAgICAgIGluZm86IHsgc2hhcGU6IFwibGFiZWxcIiwga2luZDogXCJjc2hhcnAtY2F0ZWdvcnktYXR0clwiLCBwdXJwb3NlOiBcImNhdGVnb3J5IGdyb3VwaW5nIHNob3duIGluIGEgcHJvcGVydHkgZ3JpZFwiIH0sXG4gICAgfSxcbl07XG4vLyBDYWxsZWUvbWV0aG9kIG5hbWVzIHdob3NlIHN0cmluZyBhcmd1bWVudHMgYXJlIG5ldmVyIHVzZXItZmFjaW5nIGNvcHk6XG4vLyBsb2dnaW5nLCBkaWFnbm9zdGljcywgcmVmbGVjdGlvbiwgcGFyc2luZywgY29uZmlnL3N0b3JhZ2UgYWNjZXNzLCBhbmRcbi8vIGRpY3Rpb25hcnkta2V5IC8gc3RyaW5nLWNvbXBhcmlzb24gaGVscGVycy4gTWF0Y2hlcyB0aGUgcmVjZWl2ZXItdHJhaWxpbmdcbi8vIG1lbWJlciBuYW1lIChlLmcuIGBfbG9nZ2VyLkxvZ0luZm9ybWF0aW9uKGAgLT4gXCJMb2dJbmZvcm1hdGlvblwiKS4gRGVsaWJlcmF0ZWx5XG4vLyBFWENMVURFUyBVSS1iZWFyaW5nIGNhbGxzIChNZXNzYWdlQm94LlNob3csIENvbnNvbGUuV3JpdGVbTGluZV0sIFN0cmluZ0J1aWxkZXJcbi8vIEFwcGVuZC9BcHBlbmRMaW5lLCBzdHJpbmcuRm9ybWF0KSBzbyBnZW51aW5lIGNvcHkgaXMga2VwdC5cbmNvbnN0IERFTllfQ0FMTEVFUyA9IG5ldyBTZXQoW1xuICAgIC8vIGxvZ2dpbmdcbiAgICBcIkxvZ1wiLCBcIkxvZ0luZm9ybWF0aW9uXCIsIFwiTG9nV2FybmluZ1wiLCBcIkxvZ0Vycm9yXCIsIFwiTG9nRGVidWdcIiwgXCJMb2dUcmFjZVwiLFxuICAgIFwiTG9nQ3JpdGljYWxcIiwgXCJMb2dGb3JtYXRcIiwgXCJMb2dFeGNlcHRpb25cIiwgXCJBc3NlcnRcIiwgXCJGYWlsXCIsXG4gICAgLy8gcmVmbGVjdGlvbiAvIG1ldGFkYXRhXG4gICAgXCJHZXRUeXBlXCIsIFwiR2V0TWV0aG9kXCIsIFwiR2V0UHJvcGVydHlcIiwgXCJHZXRGaWVsZFwiLCBcIkdldEN1c3RvbUF0dHJpYnV0ZVwiLFxuICAgIFwiR2V0TWFuaWZlc3RSZXNvdXJjZVN0cmVhbVwiLFxuICAgIC8vIHBhcnNpbmdcbiAgICBcIlBhcnNlXCIsIFwiVHJ5UGFyc2VcIixcbiAgICAvLyBjb25maWcgLyBlbnZpcm9ubWVudCAvIHN0b3JhZ2UgLyBkaWN0aW9uYXJ5IGtleXNcbiAgICBcIkdldEVudmlyb25tZW50VmFyaWFibGVcIiwgXCJTZXRFbnZpcm9ubWVudFZhcmlhYmxlXCIsIFwiR2V0Q29ubmVjdGlvblN0cmluZ1wiLFxuICAgIFwiR2V0U2VjdGlvblwiLCBcIkdldFZhbHVlXCIsIFwiQ29udGFpbnNLZXlcIiwgXCJUcnlHZXRWYWx1ZVwiLCBcIkdldFZhbHVlT3JEZWZhdWx0XCIsXG4gICAgLy8gc3RyaW5nIGNvbXBhcmlzb24gLyBtYXRjaGluZyAoYXJncyBhcmUgdG9rZW5zLCBub3QgcHJvc2UpXG4gICAgXCJTdGFydHNXaXRoXCIsIFwiRW5kc1dpdGhcIiwgXCJDb250YWluc1wiLCBcIkluZGV4T2ZcIiwgXCJMYXN0SW5kZXhPZlwiLCBcIkVxdWFsc1wiLFxuICAgIFwiQ29tcGFyZVRvXCIsIFwiQ29tcGFyZVwiLCBcIkNvbXBhcmVPcmRpbmFsXCIsIFwiSXNNYXRjaFwiLCBcIk1hdGNoZXNcIiwgXCJTcGxpdFwiLFxuXSk7XG5jb25zdCBDQUxMRUVfQkVGT1JFID0gLyhbQS1aYS16X11cXHcqKVxccypcXChcXHMqJC87XG4vLyBgRGVidWcuWHh4KGAgLyBgVHJhY2UuWHh4KGAgXHUyMDE0IGFsbCBkaWFnbm9zdGljcyBvdXRwdXQsIHJlZ2FyZGxlc3Mgb2YgbWV0aG9kIG5hbWUuXG5jb25zdCBERU5ZX0RJQUdOT1NUSUNTID0gL1xcYig/OkRlYnVnfFRyYWNlKVxccypcXC5cXHMqXFx3K1xccypcXChcXHMqJC87XG4vLyBEaWFnbm9zdGljIC8gSU8gLyB0ZWNobmljYWwgY29uc3RydWN0b3JzIHdob3NlIHN0cmluZyBhcmdzIGFyZSBub3QgVUkgY29weS5cbmNvbnN0IERFTllfTkVXID0gL1xcYm5ld1xccysoPzpbQS1aYS16X11bXFx3Ll0qRXhjZXB0aW9ufFVyaXxSZWdleHxHdWlkfFRpbWVTcGFufERhdGVUaW1lfERhdGVUaW1lT2Zmc2V0fFZlcnNpb258Q3VsdHVyZUluZm98SHR0cENsaWVudHxIdHRwUmVxdWVzdE1lc3NhZ2V8U3FsQ29tbWFuZHxTcWxDb25uZWN0aW9ufEZpbGVTdHJlYW18U3RyZWFtUmVhZGVyfFN0cmVhbVdyaXRlcnxGaWxlSW5mb3xEaXJlY3RvcnlJbmZvKVxccypcXChcXHMqJC87XG4vLyBUZWNobmljYWwgYXR0cmlidXRlcyAocm91dGluZywgc2VyaWFsaXphdGlvbiwgT1JNLCBpbnRlcm9wKS4gVUkgYXR0cmlidXRlc1xuLy8gKERpc3BsYXkvRGlzcGxheU5hbWUvRGVzY3JpcHRpb24vQ2F0ZWdvcnkpIGFyZSBpbnRlbnRpb25hbGx5IGFic2VudCBzbyB0aGV5IGFyZVxuLy8gc3RpbGwgZXh0cmFjdGVkIGFuZCBzaGFwZWQuXG5jb25zdCBERU5ZX0FUVFIgPSAvXFxbKD86YXNzZW1ibHlcXHMqOlxccyp8bW9kdWxlXFxzKjpcXHMqKT8oPzpSb3V0ZXxIdHRwKD86R2V0fFBvc3R8UHV0fERlbGV0ZXxQYXRjaHxIZWFkfE9wdGlvbnMpfFJlZ3VsYXJFeHByZXNzaW9ufFJlZ0V4fEpzb25Qcm9wZXJ0eXxKc29uUHJvcGVydHlOYW1lfEpzb25JbmNsdWRlfEpzb25Db252ZXJ0ZXJ8WG1sRWxlbWVudHxYbWxBdHRyaWJ1dGV8WG1sUm9vdHxYbWxUeXBlfENvbHVtbnxUYWJsZXxLZXl8Rm9yZWlnbktleXxJbmRleHxJbnZlcnNlUHJvcGVydHl8QmluZHxCaW5kUHJvcGVydHl8UHJvZHVjZXNSZXNwb25zZVR5cGV8UHJvZHVjZXN8Q29uc3VtZXN8QXV0aG9yaXplfERsbEltcG9ydHxFZGl0b3JCcm93c2FibGV8RGVidWdnZXJEaXNwbGF5fFR5cGVDb252ZXJ0ZXJ8RGVmYXVsdFZhbHVlfFRlbXBsYXRlUGFydClcXHMqXFwoW15cXF0pXSokLztcbi8vIEluZGV4ZXIgLyBlbGVtZW50IGFjY2VzczogYGRpY3RbXCJrZXlcIl1gLCBgcm93W1wiY29sXCJdYCBcdTIwMTQgYSBsb29rdXAga2V5LCBub3QgY29weS5cbmNvbnN0IERFTllfSU5ERVhFUiA9IC9bQS1aYS16XylcXF1dXFxzKlxcW1xccyokLztcbi8vIHN3aXRjaCAvIGdvdG8gY2FzZSBsYWJlbDogYGNhc2UgXCJ4XCI6YCBcdTIwMTQgYSBkaXNjcmltaW5hbnQgdmFsdWUsIG5vdCBjb3B5LlxuY29uc3QgREVOWV9DQVNFID0gL1xcYmNhc2VcXHMrJC87XG4vLyBUcnVlIHdoZW4gdGhlIG1lc3NhZ2UgaGFzIHJlYWwgd29yZHMgb3V0c2lkZSB7bmFtZX0gcGxhY2Vob2xkZXJzLCBzbyBhXG4vLyBwdXJlLXN1YnN0aXR1dGlvbiBzdHJpbmcgbGlrZSAkXCJ7Y291bnR9XCIgKFwie2NvdW50fVwiKSBpcyBub3QgZXh0cmFjdGVkLlxuZnVuY3Rpb24gaGFzV29yZHNPdXRzaWRlUGxhY2Vob2xkZXJzKG1lc3NhZ2UpIHtcbiAgICByZXR1cm4gL1xccHtMfS91LnRlc3QobWVzc2FnZS5yZXBsYWNlKC9cXHtbYS16QS1aMC05X10rXFx9L2csIFwiXCIpKTtcbn1cbi8vIEEgbm9uLVVJIGNvZGUgcG9zaXRpb24gd2hvc2UgbGl0ZXJhbCBzaG91bGQgYmUgZHJvcHBlZCBiZWZvcmUgZXh0cmFjdGlvbi5cbmZ1bmN0aW9uIGlzRGVuaWVkUG9zaXRpb24oYmVmb3JlKSB7XG4gICAgY29uc3QgY2FsbCA9IENBTExFRV9CRUZPUkUuZXhlYyhiZWZvcmUpO1xuICAgIGlmIChjYWxsICYmIERFTllfQ0FMTEVFUy5oYXMoY2FsbFsxXSkpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIGlmIChERU5ZX0RJQUdOT1NUSUNTLnRlc3QoYmVmb3JlKSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgaWYgKERFTllfTkVXLnRlc3QoYmVmb3JlKSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgaWYgKERFTllfQVRUUi50ZXN0KGJlZm9yZSkpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIGlmIChERU5ZX0lOREVYRVIudGVzdChiZWZvcmUpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoREVOWV9DQVNFLnRlc3QoYmVmb3JlKSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuLy8gQXNzaWduIGEgcHJlY2lzZSBzaGFwZSB3aGVuIHRoZSBsaXRlcmFsIHNpdHMgaW4gYSByZWNvZ25pc2VkIFVJIHBvc2l0aW9uO1xuLy8gb3RoZXJ3aXNlIGZhbGwgYmFjayB0byB0aGUgZ2VuZXJpYyBib2R5IHNoYXBlIChzdGlsbCBleHRyYWN0ZWQpLlxuZnVuY3Rpb24gY2xhc3NpZnlTaGFwZShiZWZvcmUpIHtcbiAgICBjb25zdCBwcm9wTWF0Y2ggPSBQUk9QX0FTU0lHTi5leGVjKGJlZm9yZSk7XG4gICAgaWYgKHByb3BNYXRjaCkge1xuICAgICAgICBjb25zdCBpbmZvID0gUFJPUF9TSEFQRVNbcHJvcE1hdGNoWzFdXTtcbiAgICAgICAgaWYgKGluZm8pXG4gICAgICAgICAgICByZXR1cm4gaW5mbztcbiAgICB9XG4gICAgZm9yIChjb25zdCBydWxlIG9mIENBTExfUlVMRVMpXG4gICAgICAgIGlmIChydWxlLnBhdHRlcm4udGVzdChiZWZvcmUpKVxuICAgICAgICAgICAgcmV0dXJuIHJ1bGUuaW5mbztcbiAgICBmb3IgKGNvbnN0IHJ1bGUgb2YgQVRUUl9SVUxFUylcbiAgICAgICAgaWYgKHJ1bGUucGF0dGVybi50ZXN0KGJlZm9yZSkpXG4gICAgICAgICAgICByZXR1cm4gcnVsZS5pbmZvO1xuICAgIHJldHVybiBERUZBVUxUX1NIQVBFO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aWZ5Q1NoYXJwSGl0cyhzb3VyY2UpIHtcbiAgICBjb25zdCBoaXRzID0gW107XG4gICAgY29uc3QgbGluZUZvciA9IChpbmRleCkgPT4gc291cmNlLnNsaWNlKDAsIGluZGV4KS5zcGxpdCgvXFxyP1xcbi8pLmxlbmd0aDtcbiAgICBmb3IgKGNvbnN0IGxpdGVyYWwgb2YgbGV4Q1NoYXJwU3RyaW5ncyhzb3VyY2UpKSB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBub3JtYWxpemVUZXh0KGxpdGVyYWwudmFsdWUpO1xuICAgICAgICAvLyBMYXllciAxICsgMjogbXVzdCBsb29rIGxpa2UgaHVtYW4gY29weSBhbmQgbm90IG1hY2hpbmUgc3ludGF4LlxuICAgICAgICBpZiAoIWlzUHJvYmFibHlUcmFuc2xhdGFibGUodGV4dCkpXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgaWYgKGxvb2tzVGVjaG5pY2FsKHRleHQpKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIGlmIChsaXRlcmFsLmludGVycG9sYXRlZCAmJiAhaGFzV29yZHNPdXRzaWRlUGxhY2Vob2xkZXJzKHRleHQpKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIC8vIExheWVyIDM6IGRyb3AgbGl0ZXJhbHMgaW4gbm9uLVVJIGNvZGUgcG9zaXRpb25zLiAyMDAgY2hhcnMgb2YgcHJlY2VkaW5nXG4gICAgICAgIC8vIHNvdXJjZSBjb21mb3J0YWJseSBjb3ZlcnMgY2FsbC9hdHRyaWJ1dGUvaW5pdGlhbGl6ZXIgcHJlZml4ZXMuXG4gICAgICAgIGNvbnN0IGJlZm9yZSA9IHNvdXJjZS5zbGljZShNYXRoLm1heCgwLCBsaXRlcmFsLnN0YXJ0IC0gMjAwKSwgbGl0ZXJhbC5zdGFydCk7XG4gICAgICAgIGlmIChpc0RlbmllZFBvc2l0aW9uKGJlZm9yZSkpXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgY29uc3QgaW5mbyA9IGNsYXNzaWZ5U2hhcGUoYmVmb3JlKTtcbiAgICAgICAgaGl0cy5wdXNoKHtcbiAgICAgICAgICAgIHRleHQsXG4gICAgICAgICAgICBzaGFwZTogaW5mby5zaGFwZSxcbiAgICAgICAgICAgIHB1cnBvc2U6IGluZm8ucHVycG9zZSxcbiAgICAgICAgICAgIHZpc3VhbENvbnRleHQ6IFwiXCIsXG4gICAgICAgICAgICBraW5kOiBpbmZvLmtpbmQsXG4gICAgICAgICAgICBsaW5lOiBsaW5lRm9yKGxpdGVyYWwuc3RhcnQpLFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGhpdHM7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXGNzaGFycFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcYWRhcHRlcnNcXFxcY3NoYXJwXFxcXGluZGV4LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy91MTA4ODI5Mi9DYXNjYWRlUHJvamVjdHMvc2Nyb2xsLWdvYmxpbi9hcHBzL3dlYi92ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy9jc2hhcnAvaW5kZXguanNcIjtpbXBvcnQgeyBpZGVudGlmeUNTaGFycEhpdHMgfSBmcm9tIFwiLi9pZGVudGlmeS5qc1wiO1xuLy8gQWRhcHRlcjogQyMgc291cmNlICguY3MpLiBFeHRyYWN0aW9uIG9ubHkgKGFwcGxpZWQgdmlhIHRoZSBzb3VyY2UgY2F0YWxvZyAvXG4vLyByZXNvdXJjZSBleHBvcnQsIG5vdCBhdXRvLXdyYXBwZWQpLiBVc2VzIHRoZSBzYW1lIEFHR1JFU1NJVkUgUkVDQUxMICsgUE9TVC1cbi8vIFBST0NFU1MgRklMVEVSSU5HIHN0cmF0ZWd5IGFzIHRoZSBSZWFjdC9UU1ggYWRhcHRlcjogYSByZWFsIHN0cmluZyBsZXhlciB5aWVsZHNcbi8vIGV2ZXJ5IGxpdGVyYWwsIHRoZW4gc2hhcmVkIGZpbHRlcnMgKGlzUHJvYmFibHlUcmFuc2xhdGFibGUsIGxvb2tzVGVjaG5pY2FsKSBwbHVzXG4vLyBhIG5vbi1VSSBwb3NpdGlvbiBkZW55LWxpc3QgKGxvZ2dpbmcsIHJlZmxlY3Rpb24sIHBhcnNpbmcsIGRpY3Rpb25hcnkga2V5cyxcbi8vIGNhc2UgbGFiZWxzLCB0ZWNobmljYWwgYXR0cmlidXRlcykgY3V0IHRoZSBub2lzZS4gRGVtb25zdHJhdGVzIHRoZSBsYW5ndWFnZS1cbi8vIGFnbm9zdGljIHNlYW06IGEgbm9uLXdlYiwgbm9uLUpTIGxhbmd1YWdlIHBsdWdzIGluIHdpdGggYSBsZXhlciArIGlkZW50aWZ5KCkgYW5kXG4vLyByZXVzZXMgdGhlIHNoYXJlZCBwaXBlbGluZSAobm9pc2UgZmlsdGVyaW5nLCBoYXNoaW5nLCBjbGFzc2lmaWNhdGlvbiwgZXhwb3J0KS5cbmV4cG9ydCBjb25zdCBjc2hhcnBBZGFwdGVyID0ge1xuICAgIG5hbWU6IFwiY3NoYXJwXCIsXG4gICAgZXh0ZW5zaW9uczogW1wiLmNzXCJdLFxuICAgIGlkZW50aWZ5OiAoc291cmNlKSA9PiBpZGVudGlmeUNTaGFycEhpdHMoc291cmNlKSxcbn07XG5leHBvcnQgKiBmcm9tIFwiLi9pZGVudGlmeS5qc1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vbGV4ZXIuanNcIjtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcYWRhcHRlcnNcXFxceGFtbFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcYWRhcHRlcnNcXFxceGFtbFxcXFxpZGVudGlmeS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvdTEwODgyOTIvQ2FzY2FkZVByb2plY3RzL3Njcm9sbC1nb2JsaW4vYXBwcy93ZWIvdmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3QvYWRhcHRlcnMveGFtbC9pZGVudGlmeS5qc1wiO2ltcG9ydCB7IGlzUHJvYmFibHlUcmFuc2xhdGFibGUsIGxvb2tzVGVjaG5pY2FsLCBub3JtYWxpemVUZXh0IH0gZnJvbSBcIi4uLy4uL2NvcmUvdGV4dC5qc1wiO1xuLy8gVHJhbnNsYXRhYmxlIGF0dHJpYnV0ZSAtPiBzaGFwZS4gQXR0cmlidXRlIG5hbWVzIGFyZSBtYXRjaGVkIGNhc2Utc2Vuc2l0aXZlbHlcbi8vIChYQU1MIGlzIGNhc2Utc2Vuc2l0aXZlKTsgbmFtZXNwYWNlZCBmb3JtcyBsaWtlIEF1dG9tYXRpb25Qcm9wZXJ0aWVzLk5hbWUgYXJlXG4vLyBpbmNsdWRlZCBleHBsaWNpdGx5LlxuY29uc3QgQVRUUl9TSEFQRVMgPSB7XG4gICAgVGV4dDogeyBzaGFwZTogXCJib2R5XCIsIGtpbmQ6IFwieGFtbC10ZXh0XCIsIHB1cnBvc2U6IFwidGV4dCBzaG93biB0byB1c2VycyBpbiBhIFhBTUwgY29udHJvbFwiIH0sXG4gICAgSGVhZGVyOiB7IHNoYXBlOiBcImhlYWRlclwiLCBraW5kOiBcInhhbWwtaGVhZGVyXCIsIHB1cnBvc2U6IFwiaGVhZGVyIHRleHQgb2YgYSBYQU1MIGNvbnRyb2wgb3IgZ3JvdXBcIiB9LFxuICAgIFRpdGxlOiB7IHNoYXBlOiBcImhlYWRlclwiLCBraW5kOiBcInhhbWwtdGl0bGVcIiwgcHVycG9zZTogXCJ0aXRsZSBzaG93biBpbiBhIHdpbmRvdyBvciBwYWdlXCIgfSxcbiAgICBDYXB0aW9uOiB7IHNoYXBlOiBcImhlYWRlclwiLCBraW5kOiBcInhhbWwtY2FwdGlvblwiLCBwdXJwb3NlOiBcImNhcHRpb24gc2hvd24gb24gYSBjb250cm9sXCIgfSxcbiAgICBUb29sVGlwOiB7IHNoYXBlOiBcInRvb2x0aXBcIiwga2luZDogXCJ4YW1sLXRvb2x0aXBcIiwgcHVycG9zZTogXCJ0b29sdGlwIHNob3duIG9uIGhvdmVyIGZvciBleHRyYSBjb250ZXh0XCIgfSxcbiAgICBXYXRlcm1hcms6IHsgc2hhcGU6IFwicGxhY2Vob2xkZXJcIiwga2luZDogXCJ4YW1sLXdhdGVybWFya1wiLCBwdXJwb3NlOiBcInBsYWNlaG9sZGVyIHRleHQgc2hvd24gaW5zaWRlIGFuIGVtcHR5IGlucHV0XCIgfSxcbiAgICBQbGFjZWhvbGRlclRleHQ6IHtcbiAgICAgICAgc2hhcGU6IFwicGxhY2Vob2xkZXJcIixcbiAgICAgICAga2luZDogXCJ4YW1sLXBsYWNlaG9sZGVyXCIsXG4gICAgICAgIHB1cnBvc2U6IFwicGxhY2Vob2xkZXIgdGV4dCBzaG93biBpbnNpZGUgYW4gZW1wdHkgaW5wdXRcIixcbiAgICB9LFxuICAgIERlc2NyaXB0aW9uOiB7IHNoYXBlOiBcImJvZHlcIiwga2luZDogXCJ4YW1sLWRlc2NyaXB0aW9uXCIsIHB1cnBvc2U6IFwiZGVzY3JpcHRpdmUgY29weSBzaG93biB0byB0aGUgdXNlclwiIH0sXG4gICAgTGFiZWw6IHsgc2hhcGU6IFwibGFiZWxcIiwga2luZDogXCJ4YW1sLWxhYmVsXCIsIHB1cnBvc2U6IFwibGFiZWwgZm9yIGFuIGludGVyYWN0aXZlIG9yIHZpc3VhbCBlbGVtZW50XCIgfSxcbiAgICBcIkF1dG9tYXRpb25Qcm9wZXJ0aWVzLk5hbWVcIjoge1xuICAgICAgICBzaGFwZTogXCJsYWJlbFwiLFxuICAgICAgICBraW5kOiBcInhhbWwtYXV0b21hdGlvbi1uYW1lXCIsXG4gICAgICAgIHB1cnBvc2U6IFwiYWNjZXNzaWJpbGl0eSBuYW1lIGZvciBhIGNvbnRyb2xcIixcbiAgICB9LFxuICAgIFwiQXV0b21hdGlvblByb3BlcnRpZXMuSGVscFRleHRcIjoge1xuICAgICAgICBzaGFwZTogXCJ0b29sdGlwXCIsXG4gICAgICAgIGtpbmQ6IFwieGFtbC1hdXRvbWF0aW9uLWhlbHBcIixcbiAgICAgICAgcHVycG9zZTogXCJhY2Nlc3NpYmlsaXR5IGhlbHAgdGV4dCBmb3IgYSBjb250cm9sXCIsXG4gICAgfSxcbn07XG4vLyBgQ29udGVudGAgaXMgc2hhcGUtcmVzb2x2ZWQgZnJvbSB0aGUgb3duaW5nIHRhZyAoYSBCdXR0b24ncyBjb250ZW50IGlzIGEgYnV0dG9uXG4vLyBsYWJlbCwgYSBMYWJlbCdzIGlzIGEgbGFiZWwsIGV0Yy4pLiBIYW5kbGVkIHNlcGFyYXRlbHkgZnJvbSBBVFRSX1NIQVBFUy5cbmZ1bmN0aW9uIGNvbnRlbnRTaGFwZSh0YWcpIHtcbiAgICBjb25zdCB0ID0gdGFnLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKHQuZW5kc1dpdGgoXCJidXR0b25cIikpXG4gICAgICAgIHJldHVybiB7IHNoYXBlOiBcImJ1dHRvblwiLCBraW5kOiBcInhhbWwtYnV0dG9uLWNvbnRlbnRcIiwgcHVycG9zZTogXCJidXR0b24gbGFiZWxcIiB9O1xuICAgIGlmICh0ID09PSBcImh5cGVybGlua1wiIHx8IHQgPT09IFwiaHlwZXJsaW5rYnV0dG9uXCIpXG4gICAgICAgIHJldHVybiB7IHNoYXBlOiBcImxpbmtcIiwga2luZDogXCJ4YW1sLWxpbmstY29udGVudFwiLCBwdXJwb3NlOiBcImh5cGVybGluayB0ZXh0XCIgfTtcbiAgICBpZiAodCA9PT0gXCJsYWJlbFwiKVxuICAgICAgICByZXR1cm4geyBzaGFwZTogXCJsYWJlbFwiLCBraW5kOiBcInhhbWwtbGFiZWwtY29udGVudFwiLCBwdXJwb3NlOiBcImxhYmVsIHRleHRcIiB9O1xuICAgIHJldHVybiB7IHNoYXBlOiBcImJvZHlcIiwga2luZDogXCJ4YW1sLWNvbnRlbnRcIiwgcHVycG9zZTogXCJjb250ZW50IHNob3duIGluIGEgWEFNTCBjb250cm9sXCIgfTtcbn1cbi8vIFRhZ3Mgd2hvc2UgaW5saW5lIHRleHQgY29udGVudCBpcyB1c2VyIGNvcHkuXG5jb25zdCBURVhUX1RBR1MgPSBuZXcgU2V0KFtcInRleHRibG9ja1wiLCBcInJ1blwiLCBcImxhYmVsXCIsIFwidGV4dGJveFwiXSk7XG4vLyBBIG1hcmt1cC1leHRlbnNpb24gdmFsdWUgKFwie0JpbmRpbmcgLi4ufVwiLCBcIntTdGF0aWNSZXNvdXJjZSAuLi59XCIsIFwie3g6U3RhdGljXG4vLyAuLi59XCIpIGlzIG5ldmVyIGNvcHkuIFRoZSBcInt9XCIgcHJlZml4IGlzIFhBTUwncyBsaXRlcmFsLWJyYWNlIGVzY2FwZSwgc28gYSB2YWx1ZVxuLy8gdGhhdCBiZWdpbnMgd2l0aCBcInt9XCIgSVMgbGl0ZXJhbCB0ZXh0LlxuZnVuY3Rpb24gaXNNYXJrdXBFeHRlbnNpb24odmFsdWUpIHtcbiAgICBjb25zdCB2ID0gdmFsdWUudHJpbVN0YXJ0KCk7XG4gICAgcmV0dXJuIHYuc3RhcnRzV2l0aChcIntcIikgJiYgIXYuc3RhcnRzV2l0aChcInt9XCIpO1xufVxuZnVuY3Rpb24gc3RyaXBMaXRlcmFsQnJhY2VFc2NhcGUodmFsdWUpIHtcbiAgICBjb25zdCB2ID0gdmFsdWUudHJpbVN0YXJ0KCk7XG4gICAgcmV0dXJuIHYuc3RhcnRzV2l0aChcInt9XCIpID8gdi5zbGljZSgyKSA6IHZhbHVlO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGlkZW50aWZ5WGFtbEhpdHMoc291cmNlKSB7XG4gICAgY29uc3QgaGl0cyA9IFtdO1xuICAgIGNvbnN0IGxpbmVGb3IgPSAoaW5kZXgpID0+IHNvdXJjZS5zbGljZSgwLCBpbmRleCkuc3BsaXQoL1xccj9cXG4vKS5sZW5ndGg7XG4gICAgY29uc3QgcHVzaCA9IChyYXdUZXh0LCBpbmZvLCBpbmRleCkgPT4ge1xuICAgICAgICBjb25zdCB0ZXh0ID0gbm9ybWFsaXplVGV4dChzdHJpcExpdGVyYWxCcmFjZUVzY2FwZShyYXdUZXh0KSk7XG4gICAgICAgIGlmICghaXNQcm9iYWJseVRyYW5zbGF0YWJsZSh0ZXh0KSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKGxvb2tzVGVjaG5pY2FsKHRleHQpKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBoaXRzLnB1c2goeyB0ZXh0LCBzaGFwZTogaW5mby5zaGFwZSwgcHVycG9zZTogaW5mby5wdXJwb3NlLCB2aXN1YWxDb250ZXh0OiBcIlwiLCBraW5kOiBpbmZvLmtpbmQsIGxpbmU6IGxpbmVGb3IoaW5kZXgpIH0pO1xuICAgIH07XG4gICAgLy8gT3BlbmluZyB0YWdzIChpbmNsLiBzZWxmLWNsb3NpbmcpLiBDb21tZW50cyA8IS0tIC0tPiBhcmUgc2tpcHBlZCBmaXJzdC5cbiAgICBjb25zdCB3aXRob3V0Q29tbWVudHMgPSBzb3VyY2UucmVwbGFjZSgvPCEtLVtcXHNcXFNdKj8tLT4vZywgKG0pID0+IFwiIFwiLnJlcGVhdChtLmxlbmd0aCkpO1xuICAgIGNvbnN0IHRhZ1BhdHRlcm4gPSAvPChbQS1aYS16X11bXFx3LjpdKikoKD86W14+XCInXXxcIlteXCJdKlwifCdbXiddKicpKj8pXFwvPz4vZztcbiAgICBjb25zdCBhdHRyUGF0dGVybiA9IC8oW1xcdy46XSspXFxzKj1cXHMqXCIoW15cIl0qKVwiL2c7XG4gICAgZm9yIChjb25zdCB0YWdNYXRjaCBvZiB3aXRob3V0Q29tbWVudHMubWF0Y2hBbGwodGFnUGF0dGVybikpIHtcbiAgICAgICAgY29uc3QgdGFnID0gdGFnTWF0Y2hbMV07XG4gICAgICAgIGNvbnN0IGF0dHJzID0gdGFnTWF0Y2hbMl0gPz8gXCJcIjtcbiAgICAgICAgY29uc3QgYXR0cnNPZmZzZXQgPSAodGFnTWF0Y2guaW5kZXggPz8gMCkgKyB0YWdNYXRjaFswXS5pbmRleE9mKGF0dHJzLCB0YWcubGVuZ3RoICsgMSk7XG4gICAgICAgIGZvciAoY29uc3QgYXR0ck1hdGNoIG9mIGF0dHJzLm1hdGNoQWxsKGF0dHJQYXR0ZXJuKSkge1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGF0dHJNYXRjaFsxXTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXR0ck1hdGNoWzJdO1xuICAgICAgICAgICAgaWYgKGlzTWFya3VwRXh0ZW5zaW9uKHZhbHVlKSlcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSBuYW1lID09PSBcIkNvbnRlbnRcIiA/IGNvbnRlbnRTaGFwZSh0YWcpIDogQVRUUl9TSEFQRVNbbmFtZV07XG4gICAgICAgICAgICBpZiAoIWluZm8pXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBwdXNoKHZhbHVlLCBpbmZvLCBhdHRyc09mZnNldCArIChhdHRyTWF0Y2guaW5kZXggPz8gMCkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIElubGluZSB0ZXh0IGNvbnRlbnQgZm9yIGEgZmV3IHRleHQtYmVhcmluZyBlbGVtZW50czogPFRleHRCbG9jaz5IZWxsbzwvVGV4dEJsb2NrPi5cbiAgICBjb25zdCB0ZXh0UGF0dGVybiA9IC88KFtBLVphLXpfXVtcXHcuOl0qKVxcYltePl0qPihbXjxdKlxccHtMfVtePF0qKTxcXC9cXDE+L2dpdTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIHdpdGhvdXRDb21tZW50cy5tYXRjaEFsbCh0ZXh0UGF0dGVybikpIHtcbiAgICAgICAgaWYgKCFURVhUX1RBR1MuaGFzKG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkpKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIHB1c2gobWF0Y2hbMl0sIHsgc2hhcGU6IFwiYm9keVwiLCBraW5kOiBgeGFtbC0ke21hdGNoWzFdLnRvTG93ZXJDYXNlKCl9LXRleHRgLCBwdXJwb3NlOiBcImlubGluZSB0ZXh0IHNob3duIHRvIHVzZXJzIGluIGEgWEFNTCBlbGVtZW50XCIgfSwgbWF0Y2guaW5kZXggPz8gMCk7XG4gICAgfVxuICAgIHJldHVybiBoaXRzO1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1MTA4ODI5MlxcXFxDYXNjYWRlUHJvamVjdHNcXFxcc2Nyb2xsLWdvYmxpblxcXFxhcHBzXFxcXHdlYlxcXFx2ZW5kb3JcXFxcaGVkZ2VsaW5nLWkxOG5cXFxcZGlzdFxcXFxhZGFwdGVyc1xcXFx4YW1sXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1MTA4ODI5MlxcXFxDYXNjYWRlUHJvamVjdHNcXFxcc2Nyb2xsLWdvYmxpblxcXFxhcHBzXFxcXHdlYlxcXFx2ZW5kb3JcXFxcaGVkZ2VsaW5nLWkxOG5cXFxcZGlzdFxcXFxhZGFwdGVyc1xcXFx4YW1sXFxcXGluZGV4LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy91MTA4ODI5Mi9DYXNjYWRlUHJvamVjdHMvc2Nyb2xsLWdvYmxpbi9hcHBzL3dlYi92ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy94YW1sL2luZGV4LmpzXCI7aW1wb3J0IHsgaWRlbnRpZnlYYW1sSGl0cyB9IGZyb20gXCIuL2lkZW50aWZ5LmpzXCI7XG4vLyBBZGFwdGVyOiBYQU1MIG1hcmt1cCAoLnhhbWwgZm9yIFdQRi9XaW5VSS9NQVVJL1VXUCwgLmF4YW1sIGZvciBBdmFsb25pYSkuXG4vLyBFeHRyYWN0aW9uIG9ubHk7IGFwcGxpZWQgYXQgcnVudGltZSB2aWEgdGhlIHNvdXJjZSBjYXRhbG9nIC8gcmVzb3VyY2UgZXhwb3J0LFxuLy8gbGlrZSB0aGUgSFRNTCBhbmQgVnVlIGFkYXB0ZXJzLlxuZXhwb3J0IGNvbnN0IHhhbWxBZGFwdGVyID0ge1xuICAgIG5hbWU6IFwieGFtbFwiLFxuICAgIGV4dGVuc2lvbnM6IFtcIi54YW1sXCIsIFwiLmF4YW1sXCJdLFxuICAgIGlkZW50aWZ5OiAoc291cmNlKSA9PiBpZGVudGlmeVhhbWxIaXRzKHNvdXJjZSksXG59O1xuZXhwb3J0ICogZnJvbSBcIi4vaWRlbnRpZnkuanNcIjtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcYWRhcHRlcnNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHUxMDg4MjkyXFxcXENhc2NhZGVQcm9qZWN0c1xcXFxzY3JvbGwtZ29ibGluXFxcXGFwcHNcXFxcd2ViXFxcXHZlbmRvclxcXFxoZWRnZWxpbmctaTE4blxcXFxkaXN0XFxcXGFkYXB0ZXJzXFxcXGluZGV4LmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy91MTA4ODI5Mi9DYXNjYWRlUHJvamVjdHMvc2Nyb2xsLWdvYmxpbi9hcHBzL3dlYi92ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vZGlzdC9hZGFwdGVycy9pbmRleC5qc1wiO2ltcG9ydCB7IHJlZ2lzdGVyQWRhcHRlciB9IGZyb20gXCIuLi9jb3JlL3JlZ2lzdHJ5LmpzXCI7XG5pbXBvcnQgeyByZWFjdFRzQWRhcHRlciB9IGZyb20gXCIuL3JlYWN0LXRzL2luZGV4LmpzXCI7XG5pbXBvcnQgeyBqc1RzQWRhcHRlciB9IGZyb20gXCIuL2pzLXRzL2luZGV4LmpzXCI7XG5pbXBvcnQgeyBodG1sQWRhcHRlciB9IGZyb20gXCIuL2h0bWwvaW5kZXguanNcIjtcbmltcG9ydCB7IHZ1ZUFkYXB0ZXIgfSBmcm9tIFwiLi92dWUvaW5kZXguanNcIjtcbmltcG9ydCB7IGNzaGFycEFkYXB0ZXIgfSBmcm9tIFwiLi9jc2hhcnAvaW5kZXguanNcIjtcbmltcG9ydCB7IHhhbWxBZGFwdGVyIH0gZnJvbSBcIi4veGFtbC9pbmRleC5qc1wiO1xuLy8gSW1wb3J0aW5nIHRoaXMgbW9kdWxlIHJlZ2lzdGVycyB0aGUgYnVpbHQtaW4gYWRhcHRlcnMgaW50byB0aGUgY29yZSByZWdpc3RyeS5cbi8vIFRoZSB0b3AtbGV2ZWwgcGFja2FnZSBiYXJyZWwgKHNyYy9pbmRleC50cykgaW1wb3J0cyBpdCBmb3IgYmF0dGVyaWVzLWluY2x1ZGVkXG4vLyBiZWhhdmlvdXI7IHB1cmUtY29yZSBjb25zdW1lcnMgY2FuIHNraXAgaXQgYW5kIHJlZ2lzdGVyIHRoZWlyIG93biBhZGFwdGVycy5cbi8vIE9yZGVyIG1hdHRlcnMgb25seSBmb3IgZGlhZ25vc3RpY3M7IHJvdXRpbmcgaXMgYnkgZGlzam9pbnQgZmlsZSBleHRlbnNpb24uXG5yZWdpc3RlckFkYXB0ZXIocmVhY3RUc0FkYXB0ZXIpOyAvLyAudHN4Ly5qc3ggIChpZGVudGlmeSArIGF1dG8td3JhcClcbnJlZ2lzdGVyQWRhcHRlcihqc1RzQWRhcHRlcik7IC8vICAgIC50cy8uanMvLm1qcy8uLi4gKGlkZW50aWZ5ICsgYXV0by13cmFwKVxucmVnaXN0ZXJBZGFwdGVyKGh0bWxBZGFwdGVyKTsgLy8gICAgLmh0bWwvLmh0bSAoaWRlbnRpZnkgb25seSlcbnJlZ2lzdGVyQWRhcHRlcih2dWVBZGFwdGVyKTsgLy8gICAgIC52dWUgKGlkZW50aWZ5IG9ubHkpXG5yZWdpc3RlckFkYXB0ZXIoY3NoYXJwQWRhcHRlcik7IC8vICAuY3MgKGlkZW50aWZ5IG9ubHkpXG5yZWdpc3RlckFkYXB0ZXIoeGFtbEFkYXB0ZXIpOyAvLyAgICAueGFtbC8uYXhhbWwgKGlkZW50aWZ5IG9ubHkpXG5leHBvcnQgY29uc3QgREVGQVVMVF9BREFQVEVSUyA9IFtcbiAgICByZWFjdFRzQWRhcHRlcixcbiAgICBqc1RzQWRhcHRlcixcbiAgICBodG1sQWRhcHRlcixcbiAgICB2dWVBZGFwdGVyLFxuICAgIGNzaGFycEFkYXB0ZXIsXG4gICAgeGFtbEFkYXB0ZXIsXG5dO1xuZXhwb3J0IHsgcmVhY3RUc0FkYXB0ZXIsIGpzVHNBZGFwdGVyLCBodG1sQWRhcHRlciwgdnVlQWRhcHRlciwgY3NoYXJwQWRhcHRlciwgeGFtbEFkYXB0ZXIgfTtcbmV4cG9ydCAqIGZyb20gXCIuL3JlYWN0LXRzL2luZGV4LmpzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9qcy10cy9pbmRleC5qc1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vaHRtbC9pbmRleC5qc1wiO1xuZXhwb3J0ICogZnJvbSBcIi4vdnVlL2luZGV4LmpzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi9jc2hhcnAvaW5kZXguanNcIjtcbmV4cG9ydCAqIGZyb20gXCIuL3hhbWwvaW5kZXguanNcIjtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcdml0ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdTEwODgyOTJcXFxcQ2FzY2FkZVByb2plY3RzXFxcXHNjcm9sbC1nb2JsaW5cXFxcYXBwc1xcXFx3ZWJcXFxcdmVuZG9yXFxcXGhlZGdlbGluZy1pMThuXFxcXGRpc3RcXFxcdml0ZVxcXFxpbmRleC5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvdTEwODgyOTIvQ2FzY2FkZVByb2plY3RzL3Njcm9sbC1nb2JsaW4vYXBwcy93ZWIvdmVuZG9yL2hlZGdlbGluZy1pMThuL2Rpc3Qvdml0ZS9pbmRleC5qc1wiO2ltcG9ydCB7IGxvYWRFeHRyYWN0Q29uZmlnIH0gZnJvbSBcIi4uL2NvcmUvY29uZmlnLmpzXCI7XG5pbXBvcnQgeyBnZXRBZGFwdGVycywgcGlja0FkYXB0ZXIsIHNlbGVjdEFkYXB0ZXJzIH0gZnJvbSBcIi4uL2NvcmUvcmVnaXN0cnkuanNcIjtcbmltcG9ydCB7IElNUE9SVF9NQVJLRVIgfSBmcm9tIFwiLi4vYWRhcHRlcnMvZWNtYXNjcmlwdC9pZGVudGlmeS5qc1wiO1xuLy8gU2lkZS1lZmZlY3QgaW1wb3J0OiByZWdpc3RlcnMgdGhlIGJ1aWx0LWluIGFkYXB0ZXJzIChyZWFjdC10cywganMtdHMsIGh0bWwsXG4vLyB2dWUpIHNvIHRoZSBwbHVnaW4gd29ya3MgZXZlbiB3aGVuIG9ubHkgdGhlIFwiQGhlZGdlbGluZy9pMThuL3ZpdGVcIiBzdWJwYXRoIGlzXG4vLyBpbXBvcnRlZC5cbmltcG9ydCBcIi4uL2FkYXB0ZXJzL2luZGV4LmpzXCI7XG5mdW5jdGlvbiBkZWZhdWx0SW5jbHVkZShpZCkge1xuICAgIGNvbnN0IGNsZWFuID0gaWQuc3BsaXQoXCI/XCIpWzBdID8/IGlkO1xuICAgIGlmIChjbGVhbi5pbmNsdWRlcyhcIm5vZGVfbW9kdWxlc1wiKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChjbGVhbi5pbmNsdWRlcyhcIi92ZW5kb3IvaGVkZ2VsaW5nLWkxOG4vXCIpKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIC9cXC4odHN4fGpzeHx0c3xtdHN8Y3RzfGpzfG1qc3xjanMpJC8udGVzdChjbGVhbikgJiYgIS9cXC5kXFwudHMkLy50ZXN0KGNsZWFuKTtcbn1cbi8qKlxuICogVml0ZSBwbHVnaW4gdGhhdCBhdXRvLXdyYXBzIHVzZXItZmFjaW5nIHN0cmluZ3MgYXQgYnVpbGQgdGltZSBzbyBkZXZlbG9wZXJzIG5ldmVyXG4gKiB3cml0ZSB0KCkgYnkgaGFuZDpcbiAqICAtIEpTWCB0ZXh0ICsga25vd24gYXR0cmlidXRlcyAtPiBfX2hsVChcIi4uLlwiKVxuICogIC0gaW5saW5lIG1hcmt1cCAoZS5nLiA8cD5DbGljayA8YT5oZXJlPC9hPjwvcD4pIC0+IDxUcmFucyBtZXNzYWdlPVwiPDA+Li48LzA+XCIgLi4uLz5cbiAqIEl0IGRlbGVnYXRlcyB0byB0aGUgc2hhcmVkIHJlYWN0LXRzIGFkYXB0ZXIsIHNvIHRoZSByZXdyaXRlIHVzZXMgdGhlIGV4YWN0IHNhbWVcbiAqIGRldGVjdGlvbiBhcyBIZWRnZWxpbmcncyBleHRyYWN0b3IgYW5kIGtleXMgYWx3YXlzIGxpbmUgdXAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBoZWRnZWxpbmdJMThuKG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHdvcmtzcGFjZVJvb3QgPSBvcHRpb25zLndvcmtzcGFjZVJvb3QgPz8gcHJvY2Vzcy5jd2QoKTtcbiAgICBjb25zdCBydW50aW1lTW9kdWxlID0gb3B0aW9ucy5ydW50aW1lTW9kdWxlID8/IFwiQGhlZGdlbGluZy9pMThuL3J1bnRpbWVcIjtcbiAgICBjb25zdCBpbmNsdWRlID0gb3B0aW9ucy5pbmNsdWRlID8/IGRlZmF1bHRJbmNsdWRlO1xuICAgIGNvbnN0IGNvbmZpZyA9IGxvYWRFeHRyYWN0Q29uZmlnKHdvcmtzcGFjZVJvb3QpO1xuICAgIGNvbnN0IGFkYXB0ZXJzID0gc2VsZWN0QWRhcHRlcnMoY29uZmlnLmFkYXB0ZXJzLCBnZXRBZGFwdGVycygpKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBcImhlZGdlbGluZy1pMThuXCIsXG4gICAgICAgIGVuZm9yY2U6IFwicHJlXCIsXG4gICAgICAgIHRyYW5zZm9ybShjb2RlLCBpZCkge1xuICAgICAgICAgICAgaWYgKCFpbmNsdWRlKGlkKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gaWQuc3BsaXQoXCI/XCIpWzBdID8/IGlkO1xuICAgICAgICAgICAgLy8gUmVzb2x2ZSB0aGUgcmVnaXN0ZXJlZCBhZGFwdGVyIGZvciB0aGlzIGZpbGU7IG9ubHkgYWRhcHRlcnMgdGhhdCBzdXBwb3J0XG4gICAgICAgICAgICAvLyBidWlsZC10aW1lIHJld3JpdGluZyAodHJhbnNmb3JtKSBwYXJ0aWNpcGF0ZSBpbiB0aGUgVml0ZSBwYXNzLlxuICAgICAgICAgICAgY29uc3QgYWRhcHRlciA9IHBpY2tBZGFwdGVyKGZpbGVOYW1lLCBhZGFwdGVycyk7XG4gICAgICAgICAgICBpZiAoIWFkYXB0ZXI/LnRyYW5zZm9ybSlcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGFkYXB0ZXIudHJhbnNmb3JtKGNvZGUsIHtcbiAgICAgICAgICAgICAgICBmaWxlTmFtZSxcbiAgICAgICAgICAgICAgICBjb250ZXh0T3ZlcnJpZGVzOiBjb25maWcuY29udGV4dE92ZXJyaWRlcyxcbiAgICAgICAgICAgICAgICB0cmFuc2xhdGlvbkZ1bmN0aW9uTmFtZXM6IGNvbmZpZy50cmFuc2xhdGlvbkZ1bmN0aW9uTmFtZXMsXG4gICAgICAgICAgICAgICAgb2JqZWN0RmllbGRzOiBjb25maWcub2JqZWN0RmllbGRzLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIXJlc3VsdClcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGNvbnN0IGltcG9ydExpbmUgPSBgaW1wb3J0IHsgJHtyZXN1bHQuaW1wb3J0cy5qb2luKFwiLCBcIil9IH0gZnJvbSAke0pTT04uc3RyaW5naWZ5KHJ1bnRpbWVNb2R1bGUpfTsgJHtJTVBPUlRfTUFSS0VSfVxcbmA7XG4gICAgICAgICAgICByZXR1cm4geyBjb2RlOiBpbXBvcnRMaW5lICsgcmVzdWx0LmNvZGUsIG1hcDogbnVsbCB9O1xuICAgICAgICB9LFxuICAgIH07XG59XG5leHBvcnQg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QU10UixJQUFJLE9BQU8sUUFBUSxjQUFjLHdDQUFlLENBQUM7QUFDakQsSUFBSSxnQkFBZ0IsUUFBUSxNQUFNLE1BQU0sSUFBSTtBQUM1QyxJQUFJLGVBQWUsUUFBUSxNQUFNLDZDQUE2QztBQUk5RSxTQUFTLGVBQWUsSUFBSTtBQUN4QixNQUFJO0FBQ0osTUFBSSxTQUFTLEtBQUssR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFDLE9BQU8sUUFBUSxPQUFPLFNBQVMsS0FBSztBQUNyRSxNQUFJLE1BQU0sU0FBUyxjQUFjO0FBQzdCLFdBQU87QUFDWCxNQUFJLE1BQU0sU0FBUyx5QkFBeUI7QUFDeEMsV0FBTztBQUNYLE1BQUksTUFBTSxTQUFTLE9BQU87QUFDdEIsV0FBTztBQUNYLFNBQU8sc0JBQXNCLEtBQUssS0FBSztBQUMzQztBQUNBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLFNBQVM7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUlMLGNBQWMsRUFBRSxlQUE4QixTQUFTLGVBQWUsQ0FBQztBQUFBLElBQ3ZFLE1BQU07QUFBQSxFQUNWO0FBQUEsRUFDQSxTQUFTO0FBQUE7QUFBQTtBQUFBLElBR0wsT0FBTztBQUFBLE1BQ0gsMkJBQTJCO0FBQUEsSUFDL0I7QUFBQTtBQUFBLElBRUEsUUFBUSxDQUFDLFNBQVMsV0FBVztBQUFBLEVBQ2pDO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDSixNQUFNO0FBQUEsRUFDVjtBQUNKLENBQUM7IiwKICAibmFtZXMiOiBbIndvcmtzcGFjZVJvb3QiLCAicGF0aCIsICJwYXRoIiwgInRzIiwgInRzIiwgInRzIiwgInRzIiwgImhhc1dvcmRzT3V0c2lkZVBsYWNlaG9sZGVycyIsICJERU5ZX0NBTExFRVMiLCAiaGFzV29yZHNPdXRzaWRlUGxhY2Vob2xkZXJzIiwgIkFUVFJfU0hBUEVTIiwgIndvcmtzcGFjZVJvb3QiXQp9Cg==
