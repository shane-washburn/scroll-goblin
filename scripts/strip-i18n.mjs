// One-shot codemod: strip Hedgeling i18n t() wrapping from Scroll Goblin.
//
//   node scripts/strip-i18n.mjs            # dry run: report only
//   node scripts/strip-i18n.mjs --apply    # rewrite files
//
// Rules for each `t(...)` call (t from useTranslation):
//   t("literal")                 -> "literal"            (string literal)
//   t("Hi {name}", { name })     -> `Hi ${name}`         (template literal)
//   t(expr) / t(item.title)      -> expr                 (unwrap dynamic)
// Then removes `const { t } = useTranslation()` bindings and the now-unused
// `useTranslation` import specifiers.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const APPLY = process.argv.includes("--apply");

function loadTs() {
  for (const base of [path.join(repoRoot, "apps", "web"), repoRoot]) {
    try {
      return createRequire(path.join(base, "package.json"))("typescript");
    } catch {
      /* try next */
    }
  }
  throw new Error("Could not resolve the 'typescript' package.");
}
const ts = loadTs();

const SCAN_DIRS = [
  "apps/web/src",
  "packages/ui/src",
  "packages/shared/src",
  "packages/modules",
];
const IGNORE = /(\\|\/)(node_modules|dist|build)(\\|\/)/;
const SKIP_FILES = new Set([path.join(repoRoot, "packages", "ui", "src", "i18n.tsx")]);

function collect(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (IGNORE.test(full + path.sep)) continue;
    if (entry.isDirectory()) collect(full, out);
    else if (/\.(tsx|ts)$/.test(entry.name) && !SKIP_FILES.has(full)) out.push(full);
  }
}

function makeSource(text, fileName) {
  return ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

const isTCall = (node) =>
  ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t";

function containsNestedTCall(node) {
  let found = false;
  for (const arg of node.arguments) {
    const walk = (n) => {
      if (found) return;
      if (isTCall(n)) {
        found = true;
        return;
      }
      ts.forEachChild(n, walk);
    };
    walk(arg);
  }
  return found;
}

function applyEdits(text, edits) {
  edits.sort((a, b) => b.start - a.start);
  let out = text;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

// Pass A: unwrap t() calls. Re-runs until no t() remain (handles nesting).
function unwrapTCalls(text, fileName, stats) {
  for (let pass = 0; pass < 8; pass++) {
    const sf = makeSource(text, fileName);
    const edits = [];
    const visit = (node) => {
      if (isTCall(node) && !containsNestedTCall(node)) {
        edits.push({ start: node.getStart(sf), end: node.getEnd(), text: buildReplacement(node, sf, stats) });
        return; // no nested t to descend into
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    if (edits.length === 0) break;
    text = applyEdits(text, edits);
  }
  return text;
}

function buildReplacement(node, sf, stats) {
  const a0 = node.arguments[0];
  const a1 = node.arguments[1];
  const literal =
    a0 && (ts.isStringLiteral(a0) || ts.isNoSubstitutionTemplateLiteral(a0)) ? a0.text : null;

  if (literal !== null && !a1) {
    stats.literal++;
    return JSON.stringify(literal);
  }
  if (literal !== null && a1 && ts.isObjectLiteralExpression(a1)) {
    stats.interp++;
    const map = {};
    for (const p of a1.properties) {
      if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) {
        map[p.name.text] = p.initializer.getText(sf);
      } else if (ts.isShorthandPropertyAssignment(p)) {
        map[p.name.text] = p.name.text;
      }
    }
    // Escape ONLY the literal text (never the inserted value expressions, which
    // may themselves contain backticks for nested template literals).
    const escapedLiteral = literal
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
    const tmpl = escapedLiteral.replace(/\{([a-zA-Z0-9_]+)\}/g, (m, k) =>
      k in map ? "${" + map[k] + "}" : m,
    );
    return "`" + tmpl + "`";
  }
  stats.dynamic++;
  return a0 ? a0.getText(sf) : '""';
}

// Pass B: remove `const { t } = useTranslation()` and unused useTranslation imports.
function cleanupBindings(text, fileName) {
  const sf = makeSource(text, fileName);
  const edits = [];

  const fullStmtRange = (node) => {
    let end = node.getEnd();
    // swallow trailing newline/whitespace for a clean delete
    while (end < text.length && (text[end] === " " || text[end] === "\t")) end++;
    if (text[end] === "\r") end++;
    if (text[end] === "\n") end++;
    return { start: node.getStart(sf), end };
  };

  let usesUseTranslationElsewhere = false;

  const visit = (node) => {
    // const { t, ... } = useTranslation();
    if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.length === 1 &&
      node.declarationList.declarations[0].initializer &&
      ts.isCallExpression(node.declarationList.declarations[0].initializer) &&
      ts.isIdentifier(node.declarationList.declarations[0].initializer.expression) &&
      node.declarationList.declarations[0].initializer.expression.text === "useTranslation"
    ) {
      const decl = node.declarationList.declarations[0];
      const binding = decl.name;
      if (ts.isObjectBindingPattern(binding)) {
        const others = binding.elements.filter((el) => el.name.getText(sf) !== "t");
        if (others.length === 0) {
          const r = fullStmtRange(node);
          edits.push({ start: r.start, end: r.end, text: "" });
        } else {
          // keep the statement but drop the `t` element
          const tEl = binding.elements.find((el) => el.name.getText(sf) === "t");
          if (tEl) {
            const idx = binding.elements.indexOf(tEl);
            const start = idx === 0 ? tEl.getStart(sf) : binding.elements[idx - 1].getEnd();
            edits.push({ start, end: tEl.getEnd(), text: "" });
          }
          usesUseTranslationElsewhere = true;
        }
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  // Remove useTranslation import specifiers (unless still referenced).
  const importVisit = (node) => {
    if (
      ts.isImportDeclaration(node) &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      const els = node.importClause.namedBindings.elements;
      const ut = els.find((e) => e.name.text === "useTranslation");
      if (ut && !usesUseTranslationElsewhere) {
        if (els.length === 1) {
          const r = fullStmtRange(node);
          edits.push({ start: r.start, end: r.end, text: "" });
        } else {
          const idx = els.indexOf(ut);
          const start = idx === 0 ? ut.getStart(sf) : els[idx - 1].getEnd();
          let end = ut.getEnd();
          // also consume a following comma if we removed the first element
          if (idx === 0 && text[end] === ",") end++;
          edits.push({ start, end, text: "" });
        }
      }
    }
    ts.forEachChild(node, importVisit);
  };
  importVisit(sf);

  return applyEdits(text, edits);
}

const files = [];
for (const dir of SCAN_DIRS) collect(path.join(repoRoot, dir), files);

const totals = { literal: 0, interp: 0, dynamic: 0, files: 0 };
const perFile = [];

for (const file of files) {
  const original = fs.readFileSync(file, "utf8");
  // Only touch files that actually use the translation hook, so a stray local
  // identifier named `t` in a utility file is never rewritten.
  if (!/useTranslation/.test(original)) continue;
  const stats = { literal: 0, interp: 0, dynamic: 0 };
  let next = unwrapTCalls(original, file, stats);
  next = cleanupBindings(next, file);
  if (next !== original) {
    totals.files++;
    totals.literal += stats.literal;
    totals.interp += stats.interp;
    totals.dynamic += stats.dynamic;
    perFile.push({ file: file.replace(repoRoot, ""), ...stats });
    if (APPLY) fs.writeFileSync(file, next, "utf8");
  }
}

perFile.sort((a, b) => b.literal + b.interp + b.dynamic - (a.literal + a.interp + a.dynamic));
console.log(`${APPLY ? "APPLIED" : "DRY RUN"} — ${totals.files} files`);
console.log(`literal=${totals.literal} interp=${totals.interp} dynamic=${totals.dynamic}`);
console.log("\nper file (literal/interp/dynamic):");
for (const f of perFile) {
  console.log(`  ${f.literal}/${f.interp}/${f.dynamic}  ${f.file}`);
}
if (!APPLY) console.log("\n(re-run with --apply to write changes)");
