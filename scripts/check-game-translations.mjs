import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateIcuTranslation } from '@hedgeling/i18n/runtime/icu.js';
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../apps/web/i18n/games');
const catalog = JSON.parse(await fs.readFile(path.join(dir, 'source.json'), 'utf8'));
const report = { status: 'machine-drafts-require-language-and-in-browser-review', messages: catalog.entries.length, locales: {}, failures: [] };
const tags = s => (s.match(/<\/?\d+\s*\/?>/g) || []).sort().join('|');
for (const locale of catalog.locales) {
  let draft = { translations: {} };
  try { draft = JSON.parse(await fs.readFile(path.join(dir, `${locale}.json`), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let valid = 0;
  for (const entry of catalog.entries) {
    const record = draft.translations[entry.key];
    let reason;
    if (!record?.text || record.source !== entry.source) reason = 'Missing or stale translation';
    else {
      const icu = validateIcuTranslation(entry.source, record.text, { locale });
      if (!icu.valid) reason = icu.reason;
      else if (tags(entry.source) !== tags(record.text)) reason = 'Numbered markup tags changed';
    }
    if (reason) report.failures.push({ locale, key: entry.key, source: entry.source, reason });
    else valid++;
  }
  report.locales[locale] = { valid, total: catalog.entries.length };
  console.log(`${locale}: ${valid}/${catalog.entries.length} structurally valid`);
}
await fs.writeFile(path.join(dir, 'validation.json'), JSON.stringify(report, null, 2) + '\n');
if (report.failures.length) process.exitCode = 1;
