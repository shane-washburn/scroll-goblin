import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

type Shape =
  | "button"
  | "header"
  | "body"
  | "link"
  | "label"
  | "placeholder"
  | "tooltip"
  | "alert";

type Location = {
  file: string;
  line: number;
  kind: string;
};

type Occurrence = {
  key: string;
  source: string;
  shape: Shape;
  purpose: string;
  visualContext: string;
  location: Location;
};

type Context = {
  shape: Shape;
  purpose: string;
  visualContext: string;
  locations: Location[];
};

type Entry = {
  key: string;
  source: string;
  contexts: Context[];
};

const sourceLocale = "en-US";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(webRoot, "../..");
const outDir = path.join(webRoot, "i18n");

const scanRoots = [
  path.join(webRoot, "index.html"),
  path.join(webRoot, "src"),
  path.join(webRoot, "scripts"),
  path.join(repoRoot, "packages/modules"),
  path.join(repoRoot, "packages/ui/src"),
  path.join(repoRoot, "packages/shared/src"),
];

const sourceExtensions = new Set([".tsx", ".ts", ".mts", ".html"]);
const ignoredDirs = new Set([
  ".git",
  ".hedgeling",
  "build",
  "dist",
  "node_modules",
]);

const propShapes: Record<string, { shape: Shape; kind: string; purpose: string }> = {
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
  blurb: {
    shape: "body",
    kind: "component-blurb",
    purpose: "short descriptive copy passed to a UI component",
  },
  buttonLabel: {
    shape: "button",
    kind: "component-button-label",
    purpose: "button label passed to a UI component",
  },
  revokeLabel: {
    shape: "label",
    kind: "component-revoke-label",
    purpose: "permission name shown in revoke instructions",
  },
  title: {
    shape: "tooltip",
    kind: "title-attribute",
    purpose: "tooltip text shown for additional context",
  },
};

const objectFieldShapes: Record<
  string,
  { shape: Shape; kind: string; purpose: string }
> = {
  answer: {
    shape: "body",
    kind: "object-answer",
    purpose: "answer copy shown in informational content",
  },
  blurb: {
    shape: "body",
    kind: "object-blurb",
    purpose: "short descriptive copy for an option or item",
  },
  description: {
    shape: "body",
    kind: "object-description",
    purpose: "descriptive copy shown in UI or page metadata",
  },
  fallMessage: {
    shape: "body",
    kind: "object-fall-message",
    purpose: "status message shown when a Pushy Paws shelf object is knocked off the shelf",
  },
  danceName: {
    shape: "label",
    kind: "object-dance-name",
    purpose: "user-facing dance name shown for an unlocked aura",
  },
  card: {
    shape: "body",
    kind: "object-card",
    purpose: "chapter or state card copy shown in the user interface",
  },
  goal: {
    shape: "body",
    kind: "object-goal",
    purpose: "gameplay goal or objective shown to the user",
  },
  hint: {
    shape: "tooltip",
    kind: "object-hint",
    purpose: "short hint explaining what an option does",
  },
  label: {
    shape: "label",
    kind: "object-label",
    purpose: "short user-facing label for a UI value or option",
  },
  name: {
    shape: "label",
    kind: "object-name",
    purpose: "user-facing name for an item or option",
  },
  question: {
    shape: "header",
    kind: "object-question",
    purpose: "question heading shown in informational content",
  },
  lesson: {
    shape: "body",
    kind: "object-lesson",
    purpose: "short lesson or takeaway shown in the user interface",
  },
  note: {
    shape: "body",
    kind: "object-note",
    purpose: "explanatory note shown below an inferred browser or device signal",
  },
  rarity: {
    shape: "label",
    kind: "object-rarity",
    purpose: "rarity label shown for a collectible item",
  },
  short: {
    shape: "label",
    kind: "object-short-label",
    purpose: "short user-facing name for an item or option",
  },
  shortTitle: {
    shape: "header",
    kind: "object-short-title",
    purpose: "short title shown for a UI item",
  },
  title: {
    shape: "header",
    kind: "object-title",
    purpose: "title shown for a page, module, card, or UI section",
  },
  value: {
    shape: "label",
    kind: "object-value",
    purpose: "user-facing value shown for a UI field or inferred attribute",
  },
};

const contextOverrides: Record<
  string,
  Partial<Pick<Occurrence, "shape" | "purpose" | "visualContext">>
> = {
  Audio: {
    shape: "button",
    purpose:
      "label on the site-wide audio toggle button; means sound effects are enabled",
    visualContext: "Lucide volume icon beside the label in the global mute/unmute control",
  },
  Muted: {
    shape: "button",
    purpose:
      "label on the site-wide audio toggle button; means sound effects are currently muted",
    visualContext: "Lucide muted-volume icon beside the label in the global mute/unmute control",
  },
  "Mute sound effects": {
    shape: "tooltip",
    purpose:
      "tooltip for the site-wide audio toggle button when clicking it will disable sound effects",
    visualContext: "Lucide volume icon button used to control game sound effects",
  },
  "Unmute sound effects": {
    shape: "tooltip",
    purpose:
      "tooltip for the site-wide audio toggle button when clicking it will enable sound effects",
    visualContext: "Lucide muted-volume icon button used to control game sound effects",
  },
  "Matches ~{share} of people": {
    purpose:
      "fingerprint rarity label; means approximately this percentage of people have the same browser/device signal value",
    visualContext:
      "Small stat tile in Goblin Surveillance Mirror showing how common the user's device signal is",
  },
  "Delete browser storage": {
    shape: "button",
    purpose:
      "button that deletes the browser Local Storage data saved by this page; Local Storage is the browser storage API",
    visualContext: "Trash/delete experiment section in Goblin Surveillance Mirror",
  },
  "Local Storage": {
    purpose:
      "browser storage API name shown in Goblin Surveillance Mirror; translate as web/browser local storage where natural",
    visualContext: "Database icon section about browser persistence after visits",
  },
  "Browser storage erased ✓": {
    purpose:
      "button completion state after browser Local Storage data saved by this page has been deleted",
    visualContext: "Trash/delete experiment section in Goblin Surveillance Mirror",
  },
  "Ceramic Mug": {
    purpose:
      "name of a physical ceramic drinking mug/cup object in Pushy Paws, not a face",
    visualContext:
      "SVG depicts a white ceramic cup with a handle and blue liquid line",
  },
  "Ceramic mug": {
    purpose:
      "short label for a physical ceramic drinking mug/cup object in Pushy Paws, not a face",
    visualContext:
      "SVG depicts a white ceramic cup with a handle and blue liquid line",
  },
  "Ceramic Mug leaves the shelf.": {
    purpose:
      "status message when the ceramic drinking mug/cup object falls off the shelf in Pushy Paws",
    visualContext:
      "SVG depicts a white ceramic cup with a handle and blue liquid line",
  },
  "Tap the object once for each cat swat. Heavier targets need more paws.": {
    shape: "body",
    purpose:
      "short Pushy Paws instruction explaining that each tap makes the cat swat once and heavier shelf objects require more taps",
    visualContext:
      "Shown in the Pushy Paws status panel before the user starts swatting shelf objects",
  },
  "Fwump. Deeply unsatisfying.": {
    shape: "body",
    purpose:
      "short Pushy Paws status message after the ancient magic scroll falls from the shelf with an unimpressive sound",
    visualContext:
      "SVG depicts a rolled parchment scroll object falling from a shelf",
  },
  "{points} chaos": {
    purpose:
      "score delta label in Pushy Paws; chaos is the game's score currency and should be translated naturally",
    visualContext: "Compact current-target stat showing points gained or lost and object weight",
  },
  "+{points} chaos": {
    purpose:
      "positive score delta label in Pushy Paws; chaos is the game's score currency and should be translated naturally",
    visualContext: "Compact current-target stat showing points gained or lost and object weight",
  },
  "Heavy Crystal Ball": {
    purpose: "name of a heavy glass crystal ball object in Pushy Paws",
    visualContext:
      "SVG depicts a round purple crystal ball on a gray base",
  },
  Crystal: {
    purpose: "short label for a heavy glass crystal ball object in Pushy Paws",
    visualContext:
      "SVG depicts a round purple crystal ball on a gray base",
  },
  "Heavy Crystal Ball leaves the shelf.": {
    purpose:
      "status message when the heavy glass crystal ball object falls off the shelf in Pushy Paws",
    visualContext:
      "SVG depicts a round purple crystal ball on a gray base",
  },
  Righty: {
    shape: "button",
    purpose:
      "compact handedness toggle label in Slug Fencing; means right-handed player, not the direction right",
    visualContext:
      "Shown beside a right-hand emoji on the button that swaps the player's slug side for right-handed play",
  },
  Lefty: {
    shape: "button",
    purpose:
      "compact handedness toggle label in Slug Fencing; means left-handed player, not the direction left",
    visualContext:
      "Shown beside a left-hand emoji on the button that swaps the player's slug side for left-handed play",
  },
  "Stack of books": {
    purpose:
      "short singular collective label for a stack of books object in Pushy Paws",
    visualContext: "SVG depicts a stacked pile of three books",
  },
  "Stack of Heavy Spellbooks": {
    purpose: "name of a stacked pile of books object in Pushy Paws",
    visualContext: "SVG depicts a stacked pile of three books",
  },
  "Stack of Heavy Spellbooks leaves the shelf.": {
    purpose:
      "status message when the stacked pile of books object falls off the shelf in Pushy Paws",
    visualContext: "SVG depicts a stacked pile of three books",
  },
  "No device signal reveals these. Advertisers only 'know' them by buying your cross-site history from data brokers — which this page never has.": {
    purpose:
      "privacy explanation that age, gender, and income cannot be inferred from this page's local device signals",
    visualContext:
      "Goblin Surveillance Mirror inference card for Age / Gender / Income with no-confidence badge",
  },
  "Morning browsing": {
    purpose: "browser activity time-of-day label inferred from the local clock",
    visualContext: "Goblin Surveillance Mirror inference card for browsing time",
  },
};

function normalizeText(source: string): string {
  return decodeHtmlEntities(source).replace(/\s+/g, " ").trim();
}

function keyFor(source: string): string {
  return createHash("md5").update(normalizeText(source)).digest("hex");
}

function rel(file: string): string {
  return path.relative(repoRoot, file).split(path.sep).join("/");
}

function lineFor(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function isProbablyTranslatable(source: string): boolean {
  const text = normalizeText(source);
  if (!text) return false;
  if (text.length < 2) return false;
  if (!/\p{L}/u.test(text)) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (/^\/[a-z0-9/_-]+$/i.test(text)) return false;
  if (/^[a-z0-9_-]+:[a-z0-9:_-]+$/i.test(text)) return false;
  if (/^[a-z]+(?:[A-Z][a-z0-9]*)+$/.test(text)) return false;
  if (/^[.#]?[a-z0-9_-]+$/i.test(text) && !/[A-Z]/.test(text)) return false;
  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function attr(value: string): string {
  return escapeHtml(value).replace(/\n/g, " ");
}

function collectFiles(target: string): string[] {
  const files: string[] = [];
  if (!existsSync(target)) return files;

  if (statSync(target).isFile()) {
    if (sourceExtensions.has(path.extname(target))) files.push(target);
    return files;
  }

  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) walk(path.join(dir, entry.name));
        continue;
      }
      const file = path.join(dir, entry.name);
      if (sourceExtensions.has(path.extname(file))) files.push(file);
    }
  }

  walk(target);
  return files;
}

function jsxTagName(node: ts.JsxOpeningLikeElement): string {
  const name = node.tagName;
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isPropertyAccessExpression(name)) return name.name.text;
  return name.getText();
}

function jsxElementInfo(tag: string): { shape: Shape; kind: string; purpose: string } | null {
  if (
    tag === "button" ||
    tag === "Button" ||
    tag === "PrimaryButton" ||
    tag === "SecondaryButton"
  ) {
    return {
      shape: "button",
      kind: "button-text",
      purpose: "button text for an action the user can take",
    };
  }
  if (tag === "a" || tag === "Link") {
    return {
      shape: "link",
      kind: "link-text",
      purpose: "link text for navigation",
    };
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
    return {
      shape: "body",
      kind: "list-item-text",
      purpose: "body copy shown as a list item",
    };
  }
  if (tag === "p") {
    return {
      shape: "body",
      kind: "paragraph-text",
      purpose: "body copy shown in the user interface",
    };
  }
  if (tag === "div" || tag === "span") {
    return {
      shape: "body",
      kind: `${tag}-text`,
      purpose: "body copy shown in the user interface",
    };
  }
  return null;
}

function isInlineTextTag(tag: string): boolean {
  return ["br", "code", "em", "i", "small", "span", "strong"].includes(tag);
}

function jsxVisibleText(node: ts.JsxChild): string | null {
  if (ts.isJsxText(node)) return node.getText();
  if (ts.isJsxExpression(node)) {
    if (!node.expression) return "";
    if (
      ts.isStringLiteral(node.expression) ||
      ts.isNoSubstitutionTemplateLiteral(node.expression)
    ) {
      return node.expression.text;
    }
    return null;
  }
  if (ts.isJsxElement(node)) {
    const tag = jsxTagName(node.openingElement);
    if (/^[A-Z]/.test(tag)) return "";
    if (!isInlineTextTag(tag)) return null;
    return jsxChildrenText(node.children);
  }
  if (ts.isJsxSelfClosingElement(node)) {
    const tag = jsxTagName(node);
    if (/^[A-Z]/.test(tag)) return "";
    return tag === "br" ? " " : null;
  }
  if (ts.isJsxFragment(node)) return jsxChildrenText(node.children);
  return null;
}

function jsxChildrenText(children: ts.NodeArray<ts.JsxChild>): string | null {
  const parts: string[] = [];
  for (const child of children) {
    const text = jsxVisibleText(child);
    if (text === null) return null;
    parts.push(text);
  }
  return parts.join(" ");
}

function literalValue(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isJsxExpression(node) && node.expression) {
    return literalValue(node.expression);
  }
  return null;
}

function propName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function callName(node: ts.Expression): string | null {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  return null;
}

function variableNameForInitializer(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isVariableDeclaration(current) &&
      ts.isIdentifier(current.name)
    ) {
      return current.name.text;
    }
    current = current.parent;
  }
  return null;
}

function addArrayStringOccurrences(
  occurrences: Occurrence[],
  sourceFile: ts.SourceFile,
  node: ts.ArrayLiteralExpression,
  variableName: string
) {
  const upperName = variableName.toUpperCase();
  if (
    !upperName.includes("LABEL") &&
    !upperName.includes("MESSAGE") &&
    !upperName.includes("QUESTION") &&
    !upperName.includes("TITLE") &&
    !upperName.includes("TEXT")
  ) {
    return;
  }

  for (const element of node.elements) {
    const value = literalValue(element);
    if (!value) continue;
    addOccurrence(
      occurrences,
      sourceFile,
      element,
      value,
      upperName.includes("QUESTION") ? "placeholder" : "label",
      "array-string",
      upperName.includes("QUESTION")
        ? "placeholder or example question shown in the user interface"
        : "user-facing string from a UI string array"
    );
  }
}

function addOccurrence(
  occurrences: Occurrence[],
  sourceFile: ts.SourceFile,
  node: ts.Node,
  rawSource: string,
  shape: Shape,
  kind: string,
  purpose: string,
  visualContext = ""
) {
  const source = normalizeText(rawSource);
  if (!isProbablyTranslatable(source)) return;
  const override = contextOverrides[source];
  occurrences.push({
    key: keyFor(source),
    source,
    shape: override?.shape ?? shape,
    purpose: override?.purpose ?? purpose,
    visualContext: override?.visualContext ?? visualContext,
    location: {
      file: rel(sourceFile.fileName),
      line: lineFor(sourceFile, node),
      kind,
    },
  });
}

function extractTsFile(file: string): Occurrence[] {
  const sourceText = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const occurrences: Occurrence[] = [];

  function visit(node: ts.Node) {
    if (ts.isJsxElement(node)) {
      const tag = jsxTagName(node.openingElement);
      const info = jsxElementInfo(tag);
      const value = info ? jsxChildrenText(node.children) : null;
      if (info && value) {
      addOccurrence(
        occurrences,
        sourceFile,
        node,
          value,
        info.shape,
        info.kind,
        info.purpose
      );
      }
    }

    if (ts.isJsxAttribute(node)) {
      const info = propShapes[node.name.text];
      if (info && node.initializer) {
        const value = literalValue(node.initializer);
        if (value) {
          addOccurrence(
            occurrences,
            sourceFile,
            node,
            value,
            info.shape,
            info.kind,
            info.purpose
          );
        }
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const name = propName(node.name);
      const info = name ? objectFieldShapes[name] : undefined;
      const value = info ? literalValue(node.initializer) : null;
      if (info && value && !isLanguageSelectorLabel(node)) {
        addOccurrence(
          occurrences,
          sourceFile,
          node,
          value,
          info.shape,
          info.kind,
          info.purpose
        );
      }
      if (!info && variableNameForInitializer(node) === "MESSAGES") {
        const messageValue = literalValue(node.initializer);
        if (messageValue) {
          addOccurrence(
            occurrences,
            sourceFile,
            node,
            messageValue,
            "body",
            "message-source",
            "status message shown in the user interface"
          );
        }
      }
      if (!info && variableNameForInitializer(node) === "PROPERTY_LABEL") {
        const labelValue = literalValue(node.initializer);
        if (labelValue) {
          addOccurrence(
            occurrences,
            sourceFile,
            node,
            labelValue,
            "label",
            "property-label",
            "legend label for a category or property"
          );
        }
      }
      if (!info && variableNameForInitializer(node) === "STAT_METRICS") {
        const statLabelValue = literalValue(node.initializer);
        if (statLabelValue) {
          addOccurrence(
            occurrences,
            sourceFile,
            node,
            statLabelValue,
            "label",
            "leaderboard-stat-label",
            "compact leaderboard metric label; keep short for mobile rows"
          );
        }
      }
    }

    if (ts.isArrayLiteralExpression(node)) {
      const variableName = variableNameForInitializer(node);
      if (variableName) {
        addArrayStringOccurrences(occurrences, sourceFile, node, variableName);
      }
    }

    if (ts.isCallExpression(node)) {
      const name = callName(node.expression);
      const value =
        name === "t" || name === "setMessage" || name === "useState"
          ? literalValue(node.arguments[0])
          : null;
      if (value) {
        addOccurrence(
          occurrences,
          sourceFile,
          node,
          value,
          "body",
          "translation-call",
          "source string passed to the runtime translation helper"
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return occurrences;
}

function isLanguageSelectorLabel(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (
      ts.isVariableDeclaration(current) &&
      ts.isIdentifier(current.name) &&
      current.name.text === "LANGUAGES"
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function extractHtmlFile(file: string): Occurrence[] {
  const html = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(file, html, ts.ScriptTarget.Latest, true);
  const occurrences: Occurrence[] = [];
  const tagTextPattern =
    /<(title|h[1-6]|button|a|label|p|li|span)\b[^>]*>([^<]*\p{L}[^<]*)<\/\1>/giu;
  const attrPattern = /\b(aria-label|title|alt|placeholder)="([^"]*\p{L}[^"]*)"/giu;

  for (const match of html.matchAll(tagTextPattern)) {
    const tag = match[1].toLowerCase();
    const text = match[2];
    const pos = match.index ?? 0;
    const node = {
      getStart: () => pos,
    } as ts.Node;
    const shape: Shape =
      tag === "button"
        ? "button"
        : tag === "a"
          ? "link"
          : tag === "label"
            ? "label"
            : tag === "title" || /^h[1-6]$/.test(tag)
              ? "header"
              : "body";
    addOccurrence(
      occurrences,
      sourceFile,
      node,
      text,
      shape,
      `html-${tag}-text`,
      tag === "title"
        ? "document title shown in browser tabs and search results"
        : "static HTML text shown to users"
    );
  }

  for (const match of html.matchAll(attrPattern)) {
    const name = match[1];
    const text = match[2];
    const info = propShapes[name];
    if (!info) continue;
    const pos = match.index ?? 0;
    const node = {
      getStart: () => pos,
    } as ts.Node;
    addOccurrence(
      occurrences,
      sourceFile,
      node,
      text,
      info.shape,
      `html-${info.kind}`,
      info.purpose
    );
  }

  return occurrences;
}

function mergeEntries(occurrences: Occurrence[]): Entry[] {
  const entries = new Map<string, Entry>();

  for (const occurrence of occurrences) {
    const existing = entries.get(occurrence.key);
    const entry =
      existing ??
      ({
        key: occurrence.key,
        source: occurrence.source,
        contexts: [],
      } satisfies Entry);

    const contextKey = [
      occurrence.shape,
      occurrence.purpose,
      occurrence.visualContext,
    ].join("\u0000");
    let context = entry.contexts.find(
      (item) => [item.shape, item.purpose, item.visualContext].join("\u0000") === contextKey
    );
    if (!context) {
      context = {
        shape: occurrence.shape,
        purpose: occurrence.purpose,
        visualContext: occurrence.visualContext,
        locations: [],
      };
      entry.contexts.push(context);
    }
    if (
      !context.locations.some(
        (location) =>
          location.file === occurrence.location.file &&
          location.line === occurrence.location.line &&
          location.kind === occurrence.location.kind
      )
    ) {
      context.locations.push(occurrence.location);
    }
    entries.set(occurrence.key, entry);
  }

  return [...entries.values()].sort((a, b) => a.source.localeCompare(b.source));
}

function renderHtml(occurrences: Occurrence[]): string {
  const rows = occurrences
    .sort((a, b) =>
      a.location.file.localeCompare(b.location.file) ||
      a.location.line - b.location.line ||
      a.source.localeCompare(b.source)
    )
    .map(
      (occurrence) =>
        `      <p data-i18n-shape="${occurrence.shape}" data-i18n-purpose="${attr(
          occurrence.purpose
        )}" data-i18n-visual-context="${attr(
          occurrence.visualContext
        )}">${escapeHtml(occurrence.source)}</p>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="${sourceLocale}">
  <body>
    <main data-i18n-source-locale="${sourceLocale}">
${rows}
    </main>
  </body>
</html>
`;
}

const files = scanRoots.flatMap(collectFiles).sort();
const occurrences = files.flatMap((file) =>
  file.endsWith(".html") ? extractHtmlFile(file) : extractTsFile(file)
);
const entries = mergeEntries(occurrences);

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "source.html"), renderHtml(occurrences));
writeFileSync(
  path.join(outDir, "source.json"),
  `${JSON.stringify(
    {
      sourceLocale,
      entries,
    },
    null,
    2
  )}\n`
);

console.log(
  `[extract-i18n] wrote ${occurrences.length} occurrences, ${entries.length} unique strings to ${rel(
    outDir
  )}`
);
