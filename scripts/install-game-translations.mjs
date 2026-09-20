// Install validated review drafts without replacing existing site translations.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readState, writeState, compileBundle, compileSourceKeyMap } from '@hedgeling/i18n/translate';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.execPath, [path.join(root, 'scripts/check-game-translations.mjs')], { stdio: 'inherit' });
const read = async p => JSON.parse(await fs.readFile(path.join(root, p), 'utf8'));
const catalog = await read('apps/web/i18n/games/source.json');
const state = await readState(root);
const filename = 'apps/web/i18n/games/source.json';
const file = state.files[filename] ??= { entries: {}, sourceIndex: {}, updatedAt: new Date().toISOString() };
const drafts = Object.fromEntries(await Promise.all(catalog.locales.map(async locale => [locale, await read(`apps/web/i18n/games/${locale}.json`)])));
for (const item of catalog.entries) {
  const existing = Object.entries(state.files).filter(([name]) => name !== filename).map(([, f]) => f.entries[item.key]).find(Boolean);
  const entry = existing ?? (file.entries[item.key] ??= { sourceText: item.source, shape: item.contexts[0]?.shape ?? 'body', purpose: item.contexts[0]?.purpose ?? 'Game interface', limit: Math.ceil(item.source.length * 1.8), translations: {} });
  for (const locale of catalog.locales) {
    const previous = entry.translations[locale];
    if (previous && (existing || previous.source === 'human' || previous.humanStatus === 'verified')) continue;
    const text = drafts[locale].translations[item.key].text;
    if (previous?.text === text) continue;
    entry.translations[locale] = { text, source: 'gemini', mtStatus: 'ready', humanStatus: 'pending', updatedAt: new Date().toISOString() };
  }
  if (!existing) file.sourceIndex[item.key] = { key: item.key, shape: entry.shape, purpose: entry.purpose };
}
state.locales = [...new Set([...state.locales, ...catalog.locales])];
// Keep older runtime entries that may not yet be in the local state snapshot.
const bundle = await read('apps/web/public/hedgeling-bundle.json');
const compiled = compileBundle(state);
for (const locale of catalog.locales) {
  bundle[locale] ??= {};
  for (const item of catalog.entries) if (compiled[locale]?.[item.key]) bundle[locale][item.key] = compiled[locale][item.key];
}
const oldMap = await read('apps/web/public/hedgeling-source-key-map.json');
const bySource = { ...oldMap.bySource };
const compiledMap = compileSourceKeyMap(state).bySource;
for (const item of catalog.entries) if (compiledMap[item.source]) bySource[item.source] = compiledMap[item.source];
const map = { ...oldMap, bySource, sources: Object.entries(bySource).sort(([a], [b]) => a.localeCompare(b)).map(([source, key]) => ({ source, key })) };
await writeState(root, state);
for (const p of ['hedgeling-bundle.json', 'apps/web/public/hedgeling-bundle.json']) await fs.writeFile(path.join(root,p), JSON.stringify(bundle,null,2)+'\n');
for (const p of ['.hedgeling/source-key-map.json', 'apps/web/public/hedgeling-source-key-map.json']) await fs.writeFile(path.join(root,p), JSON.stringify(map,null,2)+'\n');
console.log(`Installed ${catalog.entries.length} game messages in ${catalog.locales.length} locales (review drafts).`);
