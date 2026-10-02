/** Browser regression checks. Start pnpm dev first. No real quantum/model calls.
 * PLAYWRIGHT_MODULE may point to an existing Playwright index.mjs installation.
 */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.POSSUM_BASE_URL || 'http://127.0.0.1:5173';
const output = process.env.POSSUM_SCREENSHOTS || '/private/tmp/possum-preview';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1365, height: 1120 }, reducedMotion: 'reduce' });
const noWebGL = process.env.POSSUM_NO_WEBGL === '1';
function disableWebGL() {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (name, ...args) {
    if (String(name).startsWith('webgl')) return null;
    return original.call(this, name, ...args);
  };
}
if (noWebGL) await context.addInitScript(disableWebGL);
const errors = [], requests = [], stories = [];
let quantumStatus = 200, quantumResult = 0, storyStatus = 200, narrationDelay = 0;
const hardware = () => ({ source: 'hardware', result: quantumResult, taskArn: 'arn:aws:braket:eu-north-1:123:quantum-task/browser-fixture',
  deviceArn: 'arn:aws:braket:eu-north-1::device/qpu/iqm/Garnet', shot: 7, batchShots: 1000,
  bitIndex: 0, circuitQubits: 8, measuredAt: '2026-10-01T12:00:00Z' });
await context.route('**/oracle', async route => {
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' } });
  requests.push(route.request().postDataJSON());
  await route.fulfill({ status: quantumStatus, json: quantumStatus === 200 ? hardware() : { error: 'Test failure' } });
});
await context.route('**/schrodingers-possum/v1/narrate', async route => {
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' } });
  const body = route.request().postDataJSON(); stories.push(body);
  if (narrationDelay) await new Promise(resolve => setTimeout(resolve, narrationDelay));
  await route.fulfill({ status: storyStatus, json: storyStatus === 200 ? {
    wisdom: body.result === 0 ? 'One more side quest. Pack a snack and an unreasonable amount of confidence.' : 'Rest is an adventure too. Your pillow has been preparing for this moment.',
    alternate_timeline: body.dilemma.tone === 'sincere' ? 'The other path holds a different ordinary day, with its own small surprises.' : 'Meanwhile, a council of raccoons has called an emergency meeting. You are somehow responsible for the minutes.', source: 'gemini',
  } : { error: 'Test narrator unavailable' } });
});
await context.route('**/stats/**', route => route.fulfill({ json: { ok: true } }));
const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(15000);
const open = () => page.goto(`${base}/apps/schrodingers-possum`);
const chooseExample = () => page.getByRole('button', { name: 'Try an example' }).click();
const submit = () => page.getByRole('button', { name: 'Open the portals' }).click();
const result = () => page.locator('.sp-parchment').waitFor({ timeout: 25000 });
const next = async () => {
  await page.getByRole('button', { name: 'Another dilemma' }).click();
  await chooseExample();
};
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('scroll-goblin-possum-v1')));
try {
  await open(); await page.locator(noWebGL ? '.sp-scene-fallback' : '.sp-scene canvas').waitFor({ timeout: 60000 });
  assert.equal(await page.getByRole('button', { name: 'Proof of Chaos' }).isDisabled(), true);
  await page.screenshot({ path: `${output}/desktop-input.png`, fullPage: true });
  await submit();
  assert.equal(await page.locator('.sp-field-error').count(), 3);
  assert.equal(await page.locator('#sp-question').evaluate(element => element === document.activeElement), true);
  await chooseExample();
  await page.locator('#sp-optionB').fill('ONE MORE SIDE QUEST'); await submit();
  assert.match(await page.locator('#sp-optionB-error').innerText(), /different/);
  assert.equal(requests.length, 0);
  await page.locator('#sp-optionB').fill('An aggressively early bedtime');
  await page.evaluate(() => { const form = document.querySelector('.sp-form'); form.requestSubmit(); form.requestSubmit(); });
  await result();
  assert.equal(requests.length, 1); assert.equal(stories.length, 1);
  assert.equal((await saved()).measurement.result, 0);
  assert.equal(await page.locator('.sp-parchment h2').innerText(), 'One more side quest');
  assert.equal(await page.locator('.sp-parchment h2').evaluate(element => element === document.activeElement), true);
  const proofButton = page.getByRole('button', { name: 'Proof of Chaos', exact: false });
  const clipboard = page.getByRole('dialog', { name: 'Proof of Chaos' });
  const notes = [];
  const expectedReceipt = {
    source: 'Amazon Braket QPU', device: 'iqm / Garnet', taskId: 'browser-fixture', measuredAt: '2026-10-01T12:00:00Z',
    batchShots: 1000, shotIndex: 7, circuitQubits: 8, selectedQubit: 0, consumedShots: 1, result: 0, option: 'A',
  };
  for (let index = 0; index < 4; index++) {
    await proofButton.click(); await clipboard.waitFor();
    notes.push(await clipboard.locator('.sp-clipboard-note').innerText());
    assert.equal(await clipboard.locator('pre').textContent(), JSON.stringify(expectedReceipt, null, 2));
    assert.match(await clipboard.locator('.sp-clipboard-disclaimer').innerText(), /Physical hardware can have measurement bias; equal odds are the ideal target\./);
    assert.doesNotMatch(await clipboard.innerText(), /Goblin Chess|same pool/);
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    const close = clipboard.getByRole('button', { name: 'Close Proof of Chaos' });
    assert.equal(await close.evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await clipboard.locator('pre').evaluate(element => element === document.activeElement), true);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert.equal(await clipboard.evaluate(element => element.contains(document.activeElement)), true);
    if (index === 0) {
      await page.screenshot({ path: `${output}/clipboard-desktop.png`, fullPage: true });
      await page.keyboard.press('Escape');
    } else if (index === 1) {
      await page.mouse.click(8, 8);
    } else await close.click();
    await clipboard.waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.equal(await proofButton.evaluate(element => element === document.activeElement), true);
  }
  assert.equal(new Set(notes.slice(0, 3)).size, 3); assert.equal(notes[3], notes[0]);
  assert.equal(requests.length, 1); assert.equal(stories.length, 1);
  console.log('PASS clipboard payload, flavor cycling, keyboard containment, three dismissal methods, focus restoration, and no new requests');
  await page.screenshot({ path: `${output}/desktop-result.png`, fullPage: true });
  await page.reload(); await result();
  assert.equal(requests.length, 1); assert.equal(stories.length, 1);
  console.log('PASS validation, duplicate-submit prevention, hardware provenance, reload and focus');

  const originalMeasurement = (await saved()).measurement;
  await page.getByRole('button', { name: 'Rewrite the note' }).click();
  await page.waitForFunction(() => document.querySelector('.sp-controls')?.getAttribute('aria-busy') === 'false');
  assert.equal(stories.length, 2); assert.equal(requests.length, 1);
  assert.equal(stories.at(-1).result, 0);
  assert.deepEqual((await saved()).measurement, originalMeasurement);
  await page.reload(); await result();
  assert.equal(stories.length, 2); assert.equal(requests.length, 1);
  assert.deepEqual((await saved()).measurement, originalMeasurement);
  console.log('PASS rewriting a generated note preserves the choice and receipt across reload');

  await next(); quantumResult = 1;
  await page.locator('input[value=sincere]').check(); await submit(); await result();
  assert.equal(stories.at(-1).dilemma.tone, 'sincere');
  assert.equal(await page.locator('.sp-parchment h2').innerText(), 'An aggressively early bedtime');
  assert.match(await page.locator('.sp-alternate p').innerText(), /ordinary day/);
  console.log('PASS other portal and sincere tone');

  await next(); quantumStatus = 503; storyStatus = 503;
  await page.locator('input[value=mystical]').check(); await submit(); await result();
  assert.equal((await saved()).measurement.source, 'classical');
  assert.match(await page.locator('.sp-source').innerText(), /Classical randomness/);
  const before = await saved(), quantumCalls = requests.length;
  await proofButton.click(); await clipboard.waitFor();
  assert.deepEqual(JSON.parse(await clipboard.locator('pre').textContent()), {
    source: 'Classical randomness · Web Crypto', reason: before.measurement.reason,
    generatedAt: before.measurement.measuredAt, result: before.measurement.result,
    option: before.measurement.result === 0 ? 'A' : 'B',
  });
  assert.doesNotMatch(await clipboard.locator('.sp-clipboard-note').innerText(), /real quantum computer|subatomic particle/);
  assert.match(await clipboard.locator('.sp-clipboard-disclaimer').innerText(), /No quantum measurement is claimed/);
  await page.keyboard.press('Escape'); await clipboard.waitFor({ state: 'hidden' });
  storyStatus = 200;
  await page.getByRole('button', { name: 'Retry the story' }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('scroll-goblin-possum-v1')).narration.source === 'gemini');
  assert.equal(requests.length, quantumCalls);
  assert.deepEqual((await saved()).measurement, before.measurement);
  assert.equal(stories.at(-1).dilemma.tone, 'mystical');
  console.log('PASS classical fallback and narration retry without reroll');

  for (const status of [429, 400]) {
    if (await page.locator('.sp-parchment').count()) await next();
    quantumStatus = status; const count = stories.length;
    await submit(); await page.locator('.sp-error').waitFor();
    assert.equal((await saved()).measurement, undefined); assert.equal(stories.length, count);
    const originalId = (await saved()).id;
    await page.reload(); await page.getByRole('button', { name: 'Continue this dilemma' }).waitFor();
    quantumStatus = 200;
    await page.getByRole('button', { name: 'Continue this dilemma' }).click(); await result();
    assert.equal(requests.at(-1).decision, originalId);
  }
  console.log('PASS rate limits, validation refusal and unfinished-experiment recovery');

  await page.setViewportSize({ width: 390, height: 844 }); await next();
  await page.emulateMedia({ reducedMotion: 'no-preference' }); narrationDelay = 2000;
  await submit();
  await page.locator('.sp-stage-superposition').waitFor();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${output}/mobile-superposition.png`, fullPage: true });
  await result(); await page.waitForTimeout(700);
  const top = await page.locator('.sp-parchment').evaluate(element => element.getBoundingClientRect().top);
  assert.ok(top >= 50 && top < 180, `Mobile result should scroll into view; top=${top}`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: `${output}/mobile-result.png`, fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 740 });
    await proofButton.click(); await clipboard.waitFor();
    const bounds = await clipboard.locator('.sp-clipboard').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 740);
    assert.equal(await clipboard.locator('.sp-clipboard-paper').evaluate(element => element.scrollWidth > element.clientWidth), false);
    await clipboard.locator('.sp-clipboard-disclaimer').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/clipboard-mobile-${width}.png`, fullPage: true });
    await clipboard.getByRole('button', { name: 'Close Proof of Chaos' }).click();
    await clipboard.waitFor({ state: 'hidden' });
  }
  console.log('PASS clipboard at 390px and 320px, scrollable paper, readable footer, and reachable close button');
  await page.setViewportSize({ width: 320, height: 740 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  console.log('PASS mobile animation, automatic reveal, and 320px/390px layouts');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const sceneA = await page.locator('.sp-scene').screenshot();
  await page.waitForTimeout(300);
  const sceneB = await page.locator('.sp-scene').screenshot();
  assert.ok(sceneA.equals(sceneB), 'Reduced-motion scene must remain still');
  console.log('PASS reduced motion');

  await context.addInitScript(disableWebGL);
  await page.reload(); await page.locator('.sp-scene-fallback').waitFor();
  assert.ok(await page.locator('.sp-parchment').isVisible());
  await next(); narrationDelay = 0;
  await submit(); await result();
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS WebGL fallback, complete decision flow, and no page errors');
  await page.evaluate(() => localStorage.setItem('hedgeling.locale', 'ru-RU'));
  await page.reload(); await result();
  await page.locator('.sp-proof-button').click(); await page.locator('.sp-clipboard-modal[open]').waitFor();
  assert.equal(await page.locator('.sp-clipboard-paper pre').textContent(), JSON.stringify({ ...expectedReceipt, result: 1, option: 'B' }, null, 2));
  await page.keyboard.press('Escape');
  console.log('PASS Russian locale leaves the raw JSON unchanged');
  console.log(JSON.stringify({ quantumRequests: requests.length, storyRequests: stories.length, screenshots: output }));
} catch (error) {
  console.error('Browser errors:', errors);
  console.error('Page:', (await page.locator('body').innerText()).slice(0, 2000));
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally { await browser.close(); }
