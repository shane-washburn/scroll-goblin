/** Extract a scoped review catalog; --translate creates resumable machine drafts.
 * Never overwrites the site's reviewed translations or production bundles.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { extractFromWorkspace, loadExtractConfig } from '@hedgeling/i18n';
import { geminiTranslateBatch, localeInstructions } from '@hedgeling/i18n/translate';
import { validateIcuTranslation } from '@hedgeling/i18n/runtime/icu.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'apps/web/i18n/games');
const config = loadExtractConfig(root);
config.scanRoots = [
  ...['Board.tsx', 'ChessPage.tsx', 'Ending.tsx', 'FactionCoin.tsx', 'game.ts', 'manifest.ts'].map(f => `packages/modules/goblin-chess/src/${f}`),
  ...['Playhouse.tsx', 'Room.tsx', 'model.ts', 'manifest.ts'].map(f => `packages/modules/lunas-playhouse/src/${f}`),
];
const extraction = extractFromWorkspace(root, config);
// These are structured English context sent to the opponent, not UI messages.
const protocol = /^(Human |No human action recorded yet\.|resurrected \{color\}|transformed \{color\}|\{value0\} \{color\} \{piece\})/;
const entries = extraction.entries.filter(e => !protocol.test(e.source));
const catalog = { schemaVersion: 1, sourceLocale: config.sourceLocale, locales: config.locales, entries };
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'source.json'), JSON.stringify(catalog, null, 2) + '\n');
await fs.writeFile(path.join(out, 'diagnostics.json'), JSON.stringify(extraction.diagnostics, null, 2) + '\n');
console.log(`${entries.length} game messages; ${config.locales.length} target locales. Catalog written.`);
if (!process.argv.includes('--translate')) process.exit(0);

// Keys stay in the process environment. The game API env is a local convenience.
for (const filename of ['.hedgeling/local.env', 'apps/api/.env']) {
  try {
    const env = parseEnv(await fs.readFile(path.join(root, filename), 'utf8'));
    for (const [key, value] of Object.entries(env)) process.env[key] ??= value;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) process.env.GEMINI_API_KEY ??= process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!process.env.GEMINI_API_KEY && !process.env.HEDGELING_GEMINI_API_KEY) throw new Error('Set GEMINI_API_KEY in .hedgeling/local.env before translating.');
process.env.HEDGELING_GEMINI_MODEL ??= 'gemini-2.5-flash';
process.env.HEDGELING_GEMINI_CACHE_DIR ??= path.join(root, '.hedgeling/gemini-cache');
const brief = 'Use natural, clear language appropriate for the locale. All text must be family-friendly. Luna’s Playhouse is for age 4: simple, warm instructions, never sarcasm, profanity, frightening language, or slang. Chess can be playfully theatrical but controls must stay clear. Preserve Mia and Luna as names. Preserve cultural names Banig, Capiz, Carabao, Parol, Talavera, Alebrije and Zarape (transliteration is allowed in non-Latin scripts); translate their descriptive nouns. Preserve placeholders, ICU plural syntax, numbered markup tags, chess coordinates, and technical product names. Do not invent game mechanics. English regional variants should stay close to source unless local spelling or phrasing warrants a change.\n';
const localeArg = process.argv.find(arg => arg.startsWith('--locales='));
const locales = localeArg ? localeArg.slice('--locales='.length).split(',') : [...config.locales];
if (locales.some(locale => !config.locales.includes(locale))) throw new Error('Unknown target locale.');
let failures = 0;
async function worker() {
  while (locales.length) {
    const locale = locales.shift();
    const filename = path.join(out, `${locale}.json`);
    let draft = { schemaVersion: 1, locale, status: 'machine-draft-needs-review', translations: {} };
    try { draft = JSON.parse(await fs.readFile(filename, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const missing = entries.filter(e => draft.translations[e.key]?.source !== e.source || !draft.translations[e.key]?.text);
    for (let i = 0; i < missing.length; i += 32) {
      const batch = missing.slice(i, i + 32);
      try {
        const result = await geminiTranslateBatch({
          locales: [locale], localeInstructions, personaInstructions: brief,
          glossaryInstructions: brief,
          items: batch.map((e, index) => ({ id: `message-${index}`, sourceText: e.source, shape: e.contexts[0]?.shape || 'body', purpose: e.contexts.map(c => c.purpose).join('; '), visualContext: e.contexts.flatMap(c => c.locations.map(l => l.file)).join(', '), limit: Math.max(40, Math.ceil(e.source.length * 1.8)) })),
        });
        for (const [index, entry] of batch.entries()) {
          const text = result.translations[`message-${index}`]?.[locale];
          if (!text || !validateIcuTranslation(entry.source, text, { locale }).valid) { failures++; continue; }
          draft.translations[entry.key] = { source: entry.source, text, status: 'needs-review' };
        }
        await fs.writeFile(filename + '.tmp', JSON.stringify(draft, null, 2) + '\n');
        await fs.rename(filename + '.tmp', filename);
        console.log(`${locale}: ${Object.keys(draft.translations).length}/${entries.length} drafted`);
      } catch {
        // Provider error bodies may include request URLs: never log credentials.
        failures += batch.length;
        console.error(`${locale}: translation batch failed; rerun to resume.`);
      }
    }
  }
}
await Promise.all([worker(), worker(), worker()]);
if (failures) { console.error(`${failures} slots need retry.`); process.exitCode = 1; }
