/** Start the web dev server. Uses the installed browser, no external learning services.
 * PLAYWRIGHT_MODULE can point to an existing Playwright installation's index.mjs.
 */
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.CODE_GOBLIN_BASE_URL || 'http://127.0.0.1:5174';
const output = process.env.CODE_GOBLIN_SCREENSHOTS || '/private/tmp/code-goblin-checks';
const lessons = JSON.parse(await readFile(new URL('../packages/modules/code-goblin/src/lessons.json', import.meta.url), 'utf8'));
const key = 'scroll-goblin-code-goblin-v1';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
await context.route('**/stats/**', route => route.fulfill({ json: { ok: true } }));
const errors = [];
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(15000);
const open = () => page.goto(`${base}/apps/code-goblin`);
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const reload = async () => { await page.reload(); await page.locator('.cg-hero').waitFor(); };
const put = async progress => { await page.evaluate(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), { key, progress }); await reload(); };
const map = () => page.getByRole('button', { name: 'Adventure map', exact: true }).click();
const start = async lesson => {
  await map(); await page.locator(`.cg-track-${lesson.trackId}`).click();
  await page.locator('.cg-node').filter({ hasText: lesson.title }).click();
  await page.getByRole('button', { name: 'Let’s cast', exact: true }).click();
};
const solve = async challenge => {
  if (challenge.type === 'word_bank') {
    const used = new Set();
    for (const token of challenge.correctSequence) {
      const index = challenge.tokens.findIndex((t, i) => t === token && !used.has(i)); used.add(index);
      await page.locator('.cg-word-bank button').nth(index).click();
    }
  } else if (challenge.type === 'linter_trap') await page.locator('.cg-linter button').nth(challenge.correctLineIndex).click();
  else if (challenge.type === 'rosetta') await page.locator('.cg-options button').nth(challenge.correctOptionIndex).click();
  else {
    const clock = page.getByRole('button', { name: 'Start 30-second cast' });
    if (await clock.count()) await clock.click();
    await page.getByLabel('Your missing fragment').fill(challenge.answer);
  }
  await page.getByRole('button', { name: 'Check my spell' }).click();
  await page.locator('.cg-feedback-correct').waitFor();
};
const next = async () => { await page.locator('.cg-feedback-correct .cg-button').click(); };
const noOverflow = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, label);
try {
  await open(); await page.locator('.cg-hero').waitFor();
  const fresh = await saved();
  assert.equal(fresh.hearts, 5);
  assert.equal(await page.locator('.cg-node:disabled').count(), 11);
  await page.screenshot({ path: `${output}/map-desktop.png`, fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 }); await noOverflow(`map ${width}`);
    await page.screenshot({ path: `${output}/map-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  // Locked Nether still offers a useful starting practice lesson.
  await page.locator('.cg-track-nether').click();
  await page.getByRole('button', { name: 'Practice a spell' }).click();
  assert.equal((await saved()).run.nodeId, lessons[0].nodeId);
  assert.equal((await saved()).run.practice, true);
  await put(fresh);
  // Settings uses a native focus-trapped dialog and restores its trigger.
  const settings = page.getByRole('button', { name: 'Learning settings' });
  await settings.click();
  assert.ok(await page.getByRole('dialog').isVisible());
  await page.getByLabel('30-second Micro-Caster').uncheck();
  await page.keyboard.press('Escape');
  assert.equal(await settings.evaluate(el => el === document.activeElement), true);
  assert.equal((await saved()).timed, false);
  await put(fresh);
  if (!process.argv.includes('--edges-only')) {
  // Play the entire campaign through the UI; this also verifies every JSON answer.
  const captured = new Set();
  for (const lesson of lessons) {
    await start(lesson);
    for (const challenge of lesson.challenges) {
      if (!captured.has(challenge.type)) {
        await page.screenshot({ path: `${output}/${challenge.type}-desktop.png`, fullPage: true });
        await page.setViewportSize({ width: 320, height: 740 }); await noOverflow(challenge.type);
        await page.screenshot({ path: `${output}/${challenge.type}-mobile.png`, fullPage: true });
        await page.setViewportSize({ width: 1440, height: 1000 }); captured.add(challenge.type);
      }
      await solve(challenge); await next();
    }
    await page.locator('.cg-complete').waitFor();
    assert.equal((await saved()).completed[lesson.nodeId].stars, 3, lesson.nodeId);
    console.log(`PASS ${lesson.nodeId}`);
  }
  const complete = await saved();
  assert.equal(Object.keys(complete.completed).length, 33);
  assert.equal(complete.hearts, 5);
  await page.getByRole('button', { name: 'Claim your certificate' }).click();
  await page.getByLabel('Name on your certificate').fill('Pip <the Great> & Friends');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download diploma' }).click();
  const download = await downloadEvent;
  const svg = await readFile(await download.path(), 'utf8');
  assert.match(svg, /Pip &lt;the Great&gt; &amp; Friends/);
  assert.match(svg, /99 stars earned/);
  await page.screenshot({ path: `${output}/certificate.png`, fullPage: true });
  await page.getByRole('button', { name: 'Pip’s satchel', exact: true }).click();
  await page.locator('.cg-trinket').filter({ hasText: 'The Indentation Scarf' }).getByRole('button').click();
  assert.equal((await saved()).equipped, 'scarf');
  await reload();
  assert.equal((await saved()).equipped, 'scarf');
  console.log('PASS full campaign, both-track gate, all rewards, certificate escaping/download, persistent keepsake');
  }
  // Answer failure, retry, actual drag/drop, saved answer and practice recovery.
  await put(fresh); await start(lessons[0]);
  const first = lessons[0].challenges[0];
  for (const i of [0, 1, 2]) await page.locator('.cg-word-bank button').nth(i).click();
  await page.getByRole('button', { name: 'Check my spell' }).click();
  await page.locator('.cg-feedback-incorrect').waitFor();
  assert.equal((await saved()).hearts, 4);
  await reload();
  await page.getByRole('button', { name: 'Continue your lesson' }).click();
  assert.equal((await saved()).hearts, 4);
  await page.getByRole('button', { name: 'Try the spell again' }).click();
  const firstIndex = first.tokens.indexOf(first.correctSequence[0]);
  await page.locator('.cg-word-bank button').nth(firstIndex).dragTo(page.locator('.cg-spell-slots'));
  assert.equal((await saved()).run.answer.length, 1);
  await reload(); await page.getByRole('button', { name: 'Continue your lesson' }).click();
  assert.equal(await page.locator('.cg-chip-placed').count(), 1);
  await page.getByRole('button', { name: 'Clear spell' }).click();
  await solve(first); await next();
  // Seed the same valid active lesson at its typing challenge with an expired clock.
  const timed = await saved();
  timed.run = { ...timed.run, index: 3, answer: 'True', feedback: null, deadline: Date.now() - 100, timed: true };
  await put(timed); await page.getByRole('button', { name: 'Continue your lesson' }).click();
  await page.locator('.cg-feedback-timeout').waitFor();
  assert.equal((await saved()).hearts, 3);
  await reload(); assert.equal((await saved()).hearts, 3);
  console.log('PASS wrong answer, single heart deduction, reload, saved code chips, real drag/drop, expired-clock recovery');
  await put({ ...fresh, hearts: 0 });
  await page.getByRole('button', { name: 'Practice a spell' }).click();
  await page.getByRole('button', { name: 'Let’s cast' }).click();
  for (const challenge of lessons[0].challenges) { await solve(challenge); await next(); }
  assert.equal((await saved()).hearts, 1); assert.deepEqual((await saved()).completed, {});
  assert.equal((await saved()).streak, 1);
  await reload(); assert.equal((await saved()).hearts, 1);
  console.log('PASS zero-heart practice, no timer, one restored heart, daily streak, no campaign unlock or reward farming');
  // English curriculum code stays byte-for-byte intact under the site's locale switch.
  await put(fresh);
  await page.evaluate(() => localStorage.setItem('hedgeling.locale', 'ru-RU'));
  await reload(); await start(lessons[0]);
  assert.equal(await page.locator('.cg-word-bank button').first().innerText(), first.tokens[0]);
  assert.equal(await page.locator('.cg-word-bank button').first().getAttribute('translate'), 'no');
  assert.equal(await page.locator('.cg-word-bank button').first().getAttribute('data-hedgeling-ignore'), 'true');
  console.log('PASS code chips excluded from DOM translation');
  await page.evaluate(key => localStorage.setItem(key, '{invalid'), key); await reload();
  await page.locator('.cg-notice').filter({ hasText: 'unreadable' }).waitFor();
  assert.equal((await saved()).hearts, 5);
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }); });
  await blocked.route('**/stats/**', route => route.fulfill({ json: { ok: true } }));
  const blockedPage = await blocked.newPage();
  await blockedPage.goto(`${base}/apps/code-goblin`);
  await blockedPage.locator('.cg-notice').waitFor();
  await blockedPage.getByRole('button', { name: 'Begin your adventure' }).click();
  await blockedPage.getByRole('button', { name: 'Let’s cast' }).click();
  await blockedPage.locator('.cg-word-bank').waitFor();
  await blocked.close();
  assert.deepEqual(errors, []);
  console.log('PASS corrupt-save recovery, denied storage, no browser errors');
} catch (error) {
  console.error('Failed UI state:', await saved(), await page.locator('.cg-app').innerText());
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally { await browser.close(); }
