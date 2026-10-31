/** Verify a fresh Hedgeling extraction and its browser delivery without model calls.
 * CODE_GOBLIN_CATALOG: JSON catalog or engine artifact from the fresh extraction.
 * CODE_GOBLIN_BASE_URL: running dev/preview server; PLAYWRIGHT_MODULE is optional.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const catalogPath = process.env.CODE_GOBLIN_CATALOG;
assert.ok(catalogPath, 'Set CODE_GOBLIN_CATALOG to a fresh extracted catalog or engine artifact.');
const artifact = JSON.parse(await readFile(catalogPath, 'utf8'));
const entries = artifact.catalog?.entries ?? artifact.entries;
const lessons = JSON.parse(await readFile(new URL('../packages/modules/code-goblin/src/lessons.json', import.meta.url), 'utf8'));
const sources = new Set(entries.map(entry => entry.source));
const prose = new Set(lessons.flatMap(lesson => [lesson.title, lesson.subtitle, lesson.storyIntro,
  ...lesson.concepts, lesson.reference.label, ...lesson.challenges.flatMap(c => [c.prompt, c.hint, c.explanation])]));
assert.deepEqual([...prose].filter(text => !sources.has(text)), [], 'All lesson prose must be extracted.');
for (const label of ['Start the new lesson', 'Save & return to map', 'Before you cast', 'Check my spell',
  'A little hint', '{completed} / {total} lessons complete']) assert.ok(sources.has(label), `Missing UI message: ${label}`);
const code = new Set(lessons.flatMap(l => [l.example, ...l.challenges.flatMap(c =>
  [c.codeSnippet, ...(c.tokens ?? []), ...(c.options ?? []), c.answer, ...(c.acceptedAnswers ?? []), c.before, c.after].flat())]).filter(Boolean));
for (const text of code) if (!prose.has(text)) assert.ok(!sources.has(text), `Code must not be translated: ${text}`);
assert.equal((artifact.diagnostics ?? []).filter(d => d.severity === 'required').length, 0, 'Resolve required extraction diagnostics.');
console.log(`PASS catalog: ${prose.size} unique lesson/reference strings, UI labels, code exclusions, required diagnostics`);

// Synthetic Russian-locale copy proves delivery, not linguistic quality. Nothing
// is written into the real bundle, translation jobs, or persistent project data.
const locale = 'ru-RU';
const prefix = 'Тест: ';
const translations = Object.fromEntries(entries.map(e => [e.key, prefix + e.source]));
const countSource = '{completed} / {total} lessons complete';
for (const entry of entries) if (entry.source === countSource) translations[entry.key] = 'Завершено {completed} из {total} уроков';
const bundle = { schemaVersion: 1, [locale]: translations };
const sourceMap = { schemaVersion: 1, bySource: Object.fromEntries(entries.map(e => [e.source, e.key])), sources: entries.map(e => ({ source: e.source, key: e.key })) };
const { chromium, expect } = await import(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
const base = process.env.CODE_GOBLIN_BASE_URL || 'http://127.0.0.1:5173';
const key = 'scroll-goblin-code-goblin-v1';
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(locale => localStorage.setItem('hedgeling.locale', locale), locale);
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.origin !== new URL(base).origin) return route.abort();
  if (url.pathname === '/hedgeling-bundle.json') return route.fulfill({ json: bundle });
  if (url.pathname === '/hedgeling-source-key-map.json') return route.fulfill({ json: sourceMap });
  if (url.pathname.startsWith('/stats/')) return route.fulfill({ json: { ok: true } });
  return route.continue();
});
const page = await context.newPage();
const errors = []; page.on('pageerror', error => errors.push(error.message));
const translated = (selector, source) => expect(page.locator(selector)).toHaveText(prefix + source);
try {
  await page.goto(`${base}/apps/code-goblin`);
  await expect(page.locator('.cg-app')).toHaveAttribute('lang', locale);
  await expect(page.locator('.cg-section-heading .cg-small').first()).toHaveText(`Завершено 0 из ${lessons.length} уроков`);
  await translated('.cg-node strong >> nth=0', lessons[0].title);
  const fresh = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const completed = Object.fromEntries(lessons.map(l => [l.nodeId, { stars: 3, completedAt: new Date().toISOString() }]));
  const load = async progress => {
    await page.evaluate(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), { key, progress });
    await page.reload(); await expect(page.locator('.cg-hero')).toBeVisible();
  };
  // Each of the 33 stories must translate after navigation, while examples stay exact.
  for (const lesson of lessons) {
    await load({ ...fresh, selectedTrack: lesson.trackId, completed });
    await page.locator('.cg-node').filter({ hasText: prefix + lesson.title }).click();
    await translated('.cg-story-content h1', lesson.title);
    await translated('.cg-story-intro', lesson.storyIntro);
    await expect(page.locator('.cg-teaching li')).toHaveText(lesson.concepts.map(text => prefix + text));
    await translated('.cg-teaching h3', 'Before you cast');
    await translated('.cg-lesson-toolbar button', 'Save & return to map');
    assert.equal(await page.locator('.cg-story-content pre').textContent(), lesson.example);
  }
  console.log(`PASS browser: all ${lessons.length} stories, concepts, heading labels; examples unchanged`);
  // New lesson confirmation and all challenge types, including asynchronously shown hints/feedback.
  await load(fresh);
  await page.locator('.cg-node').first().click();
  await page.locator('.cg-lesson-toolbar button').click();
  await page.locator('.cg-track-java').click(); await page.locator('.cg-node').first().click();
  await translated('.cg-modal .cg-primary', 'Start the new lesson');
  for (const type of ['word_bank', 'linter_trap', 'rosetta', 'micro_caster']) {
    const lesson = lessons.find(l => l.challenges.some(c => c.type === type));
    const index = lesson.challenges.findIndex(c => c.type === type), challenge = lesson.challenges[index];
    await load({ ...fresh, completed, selectedTrack: lesson.trackId, run: { nodeId: lesson.nodeId, practice: true,
      phase: 'challenge', index, mistakes: 0, answer: null, feedback: null, hintUsed: false, deadline: null, timed: false } });
    await page.locator('.cg-hero .cg-primary').click();
    await translated('.cg-challenge h1', challenge.prompt);
    await page.locator('.cg-check-row .cg-text-button').click();
    await translated('.cg-hint', challenge.hint);
    if (type === 'word_bank') {
      const used = new Set();
      for (const token of challenge.correctSequence) {
        const i = challenge.tokens.findIndex((t, i) => t === token && !used.has(i)); used.add(i);
        await page.locator('.cg-word-bank button').nth(i).click();
      }
      assert.equal(await page.locator('.cg-live-code').textContent(), challenge.correctSequence.join(''));
    } else if (type === 'linter_trap') {
      assert.deepEqual(await page.locator('.cg-linter code').allTextContents(), challenge.codeSnippet.map(line => line || ' '));
      await page.locator('.cg-linter button').nth(challenge.correctLineIndex).click();
    } else if (type === 'rosetta') {
      assert.deepEqual(await page.locator('.cg-options code').allTextContents(), challenge.options);
      await page.locator('.cg-options button').nth(challenge.correctOptionIndex).click();
    } else await page.locator('.cg-typing').fill(challenge.answer);
    await page.locator('.cg-check-row .cg-primary').click();
    await translated('.cg-feedback p', challenge.explanation);
  }
  console.log('PASS browser: confirmation, four challenge types, hints, explanations; answers and code unchanged');
  await load({ ...fresh, completed }); await page.locator('.cg-hero .cg-primary').click();
  await page.locator('#cg-certificate-name').fill('Pip <great> & friends');
  const downloadEvent = page.waitForEvent('download');
  await page.locator('.cg-certificate-controls .cg-primary').click();
  const download = await downloadEvent;
  const svg = await readFile(await download.path(), 'utf8');
  assert.ok(svg.includes(prefix + 'Certificate of Wizardry'));
  assert.ok(svg.includes('Pip &lt;great&gt; &amp; friends'));
  assert.ok(svg.includes(prefix + `${lessons.length} lessons · ${lessons.reduce((n,l)=>n+l.challenges.length,0)} challenges · ${lessons.length * 3} stars earned`));
  assert.deepEqual(errors, []);
  console.log('PASS browser: translated certificate download, dynamic counts, escaping, no runtime errors');
} finally { await browser.close(); }
