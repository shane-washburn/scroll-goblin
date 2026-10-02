/** Exercise every active Hedgeling locale with saved fixtures and no paid calls. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { writtenPossumStory } from '../packages/shared/dist/index.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = new URL('../', import.meta.url);
const read = async name => JSON.parse(await fs.readFile(new URL(name, root), 'utf8'));
const config = await read('.hedgeling/extract.config.json');
const bundle = await read('apps/web/public/hedgeling-bundle.json');
const keyMap = (await read('apps/web/public/hedgeling-source-key-map.json')).bySource;
const output = process.env.POSSUM_SCREENSHOTS || '/private/tmp/possum-locales';
await fs.mkdir(output, { recursive: true });
const base = process.env.POSSUM_BASE_URL || 'http://127.0.0.1:5173';
const normalize = text => text.replace(/\s+/g, ' ').trim();
const plain = text => normalize(text.replace(/<\/?\d+\s*\/?>/g, ''));
const notes = [
  "A literal subatomic particle was forced to collapse its state just because you couldn't make up your mind. Here is the receipt.",
  'This decision was pulled from a real quantum computer by a possum with zero safety training. No refunds.',
  'Percy gnawed on the data stream, but we managed to salvage the raw telemetry of your existential crisis.',
];
const browser = await chromium.launch({ headless: true });
const errors = [];
let paidRequests = 0;
let activePage;
try {
  for (const locale of config.locales) {
    const translate = source => {
      const translated = bundle[locale]?.[keyMap[source]];
      assert.ok(translated, `${locale}: missing ${source}`);
      return translated;
    };
    const context = await browser.newContext({ locale, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(language => {
      localStorage.setItem('hedgeling.locale', language);
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (String(type).startsWith('webgl')) return null;
        return original.call(this, type, ...args);
      };
    }, locale);
    await context.route(/\/oracle$|\/schrodingers-possum\/v1\/narrate$/, route => {
      paidRequests++;
      return route.fulfill({ status: 503, json: { error: 'Unexpected service call during fixture checks' } });
    });
    await context.route('**/stats/**', route => route.fulfill({ json: { ok: true } }));
    const page = await context.newPage();
    activePage = page;
    page.on('pageerror', error => errors.push(`${locale}: ${error.message}`));
    page.setDefaultTimeout(15000);
    await page.goto(`${base}/apps/schrodingers-possum`);
    await page.waitForFunction(label => document.querySelector('.sp-vibe legend')?.textContent === label, translate('Percy’s vibe'));
    assert.equal(normalize(await page.locator('.sp-header h1').textContent()), plain(translate('Schrödinger’s <0>Possum.</0>')));
    assert.equal(await page.locator('html').getAttribute('dir'), locale === 'ar-SA' ? 'rtl' : 'ltr');
    assert.equal(await page.locator('.sp-portal-labels').getAttribute('dir'), 'ltr');
    const portals = await page.locator('.sp-flat-portal').evaluateAll(elements => elements.map(el => el.getBoundingClientRect().x));
    assert.equal(portals.length, 2);
    assert.ok(portals[0] < portals[1], `${locale}: blue portal must stay left of red portal`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale}: input overflow`);
    await page.locator('.sp-form .sp-primary').click();
    for (const [field, source] of [['question', 'Give Percy a dilemma.'], ['optionA', 'Add option A.'], ['optionB', 'Give the two timelines different options.']]) {
      assert.equal(await page.locator(`#sp-${field}-error`).textContent(), translate(source));
    }
    await page.locator('#sp-optionA').fill('Alex');
    await page.locator('.sp-form .sp-primary').click();
    await page.waitForFunction(text => document.querySelector('#sp-optionB-error')?.textContent === text, translate('Add option B.'));
    assert.equal(await page.locator('#sp-optionB-error').textContent(), translate('Add option B.'));
    await page.locator('.sp-example').click();
    assert.equal(await page.locator('#sp-question').inputValue(), translate('What does my evening need?'));
    assert.equal(await page.locator('#sp-optionA').inputValue(), translate('One more side quest'));
    if (['ru-RU', 'ar-SA', 'hi-IN', 'fr-CA'].includes(locale)) {
      await page.screenshot({ path: `${output}/${locale}-input.png`, fullPage: true });
    }

    const narration = writtenPossumStory('sincere');
    const saved = {
      id: '9a3756e9-4f2f-482b-bbf8-1cb1b4fe9258', createdAt: Date.now(),
      dilemma: { question: 'What should I do?', optionA: 'One more side quest', optionB: 'Alex', tone: 'sincere' },
      measurement: { source: 'hardware', result: 0,
        taskArn: 'arn:aws:braket:eu-north-1:123:quantum-task/2e78be12-87ae-4228-a37b-67f5eadf5145',
        deviceArn: 'arn:aws:braket:eu-north-1::device/qpu/iqm/Garnet', shot: 17, batchShots: 1000,
        bitIndex: 0, circuitQubits: 8, measuredAt: '2026-10-01T12:00:00Z' },
      narration,
    };
    await page.evaluate(value => localStorage.setItem('scroll-goblin-possum-v1', JSON.stringify(value)), saved);
    await page.reload();
    await page.waitForFunction(text => document.querySelector('.sp-wisdom')?.textContent === text, translate(narration.wisdom));
    assert.equal(await page.locator('.sp-alternate p').textContent(), translate(narration.alternate_timeline));
    assert.equal(await page.locator('.sp-result-question').textContent(), saved.dilemma.question);
    assert.equal(await page.locator('.sp-parchment h2').textContent(), saved.dilemma.optionA);
    const expectedReceipt = {
      source: 'Amazon Braket QPU', device: 'iqm / Garnet', taskId: '2e78be12-87ae-4228-a37b-67f5eadf5145',
      measuredAt: saved.measurement.measuredAt, batchShots: 1000, shotIndex: 17, circuitQubits: 8,
      selectedQubit: 0, consumedShots: 1, result: 0, option: 'A',
    };
    for (const [index, note] of notes.entries()) {
      await page.locator('.sp-proof-button').click();
      const modal = page.locator('.sp-clipboard-modal[open]');
      await modal.waitFor();
      assert.equal(await modal.locator('h2').textContent(), translate('Proof of Chaos'));
      assert.equal(await modal.locator('.sp-clipboard-note').textContent(), translate(note));
      assert.equal(await modal.locator('pre').textContent(), JSON.stringify(expectedReceipt, null, 2));
      assert.equal(await modal.locator('pre').getAttribute('dir'), 'ltr');
      assert.equal(await modal.locator('pre').getAttribute('aria-label'), translate('Decision provenance'));
      assert.equal(await modal.locator('.sp-clipboard-paper').evaluate(el => el.scrollWidth > el.clientWidth), false, `${locale}: clipboard overflow`);
      if (index === 0 && ['ru-RU', 'ar-SA', 'hi-IN', 'fr-CA'].includes(locale)) {
        await page.screenshot({ path: `${output}/${locale}-clipboard.png` });
      }
      await page.keyboard.press('Escape');
      await modal.waitFor({ state: 'hidden' });
    }
    await page.locator('.sp-result-actions .sp-primary').click();
    for (const field of ['question', 'optionA', 'optionB']) assert.equal(await page.locator(`#sp-${field}`).inputValue(), '');
    assert.equal(await page.locator('input[value=sincere]').isChecked(), true);
    if (['ru-RU', 'ar-SA'].includes(locale)) {
      await page.setViewportSize({ width: 320, height: 740 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale}: 320px input overflow`);
      assert.equal(await page.locator('.sp-tone-label').evaluateAll(elements => elements.some(el => {
        const text = el.getBoundingClientRect();
        const button = el.closest('label').getBoundingClientRect();
        return text.left < button.left || text.right > button.right || el.scrollWidth > el.clientWidth;
      })), false, `${locale}: 320px tone label overflow`);
      await page.screenshot({ path: `${output}/${locale}-320.png`, fullPage: true });
    }
    console.log(`PASS ${locale}: translated form, validation, examples, fallback story and clipboard; user text/JSON unchanged; fresh dilemma cleared`);
    await context.close();
  }
  assert.equal(paidRequests, 0);
  assert.deepEqual(errors, []);
  console.log(`PASS all ${config.locales.length} locales; no paid calls or browser errors. Screenshots: ${output}`);
} catch (error) {
  console.error('Browser errors:', errors);
  await activePage?.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally { await browser.close(); }
