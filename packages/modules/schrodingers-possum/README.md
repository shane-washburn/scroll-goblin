# Schrödinger’s Possum

Route: `/apps/schrodingers-possum`. React with a procedural Three.js laboratory
and a sculpted Percy based on the supplied reference: gray fur, pale pointed
face, large worried eyes, pink ears/nose/tail, a ragged lab coat and glowing H
pendant. No remote art service is required. The renderer pauses offscreen and
in background tabs, caps resolution/frame rate, disposes resources on exit,
and supports reduced motion and a non-WebGL fallback.

## Decision flow

The form requires a dilemma and two distinct options. A zero selects A, a one
selects B. Percy loops while waiting, tumbles out of the winning portal and
presents readable HTML parchment. Feral is snarky, Mystical is otherworldly,
and Sincere describes a gentle path not taken. Copy result uses the clipboard;
it never publishes the user's dilemma.

The current experiment is saved in localStorage before narration. Reload can
resume an unfinished experiment with its original UUID and accepted winner.
Retrying or rewriting narration never draws another measurement. Generated
notes can be rewritten with **Rewrite the note · keep this choice**. Only an explicit new
experiment creates another UUID. The local record expires after six days,
before the oracle's seven-day record. Storage denial is reported; the current
tab keeps its in-memory result. There is no public decision history.
**Another dilemma** clears the question and both options while keeping the
selected vibe. **Edit the dilemma** preserves the unfinished experiment's inputs.

`POST /schrodingers-possum/v1/narrate` uses the existing Gemini resolver and
AI SDK 4 structured output. Shared Zod schemas validate inputs and prose.
The model receives separate current and alternate scenarios with their selected
and unselected options, plus the dilemma, tone and locale. The alternate story
must first establish its changed action or role assignments before adding a
consequence; it cannot change the measurement. Calls have a 15-second deadline and no
automatic paid retries. Written, tone-specific prose is visibly labeled if
the model fails. Production requires Redis for a 12 requests/IP/minute limit.

## Quantum provenance

The AWS oracle adds `{"action":"flip","decision":"<UUID>"}`. One whole shot
is atomically removed from the **same pool** as Chess. Qubit zero selects the
winner; the other seven bits are discarded. A shot can never serve both games.
Retries return the recorded answer, using a separate namespace from chess
sessions. Public endpoints cannot submit paid jobs. Manual replenishment and
the completion importer remain as before.

The receipt includes the actual device, task ID, measurement timestamp,
zero-based shot index, selected qubit and batch size when known. Old pool
entries work without fabricated batch metadata. This is provenance, not
independently certified randomness. The configured device remains IQM Garnet.

**Proof of Chaos** sits at the laboratory's bottom-right corner and becomes
available after a decision. It opens a wood clipboard with a metal clip,
coffee-stained paper and the original JSON payload. Each opening cycles the
flavor text without making any quantum or narration request. Classical receipts
use their own flavor text and source disclosure. The raw JSON is excluded from
DOM translation; the surrounding copy remains translatable. The native modal
supports Escape, backdrop and close-button dismissal, keeps keyboard focus
inside, restores focus to its trigger and scrolls the paper on small screens.
Hardware receipts retain the measurement-bias note below the data.

Empty pool, network failure or a six-second hardware deadline falls back to
Web Crypto, visibly labeled **Classical randomness**. Validation and rate
limit errors never bypass the oracle. Navigation cancellation does not draw
a fallback bit. Late responses cannot replace an accepted result.

## Run and release

Run `corepack pnpm dev` from the root. The app uses the existing
`VITE_QUANTUM_API_URL` and `VITE_API_BASE_URL`; the API uses its existing Gemini
and Redis credentials. No new secret is needed.

Release order: update AWS with `python3 infra/quantum/deploy.py`, deploy the
Hono API, then the web app. The old oracle rejects the new action rather than
silently falling back. Deployment does not replenish or submit paid jobs.
See `infra/quantum/README.md` for manual replenishment.

Static strings, examples, errors, clipboard flavor text and written emergency
stories use Hedgeling bundles for all 14 active target locales, with US English
as the source. Locale personas and the project glossary guide generation;
translations remain machine drafts for review. Run the existing
`scripts/translate-games.mjs --translate` and `scripts/install-game-translations.mjs`
workflow after copy changes. Gemini uses the selected locale; saved Gemini
stories remain in their original language until rewritten. User text and raw
receipt JSON are excluded from DOM translation. Arabic UI uses RTL while the
physical A/B portal labels, equation and JSON retain their original direction.

## Verify

```sh
corepack pnpm --filter @scroll-goblin/shared build
corepack pnpm --filter @scroll-goblin/web exec tsx --test ../../packages/modules/schrodingers-possum/src/decision.test.ts
corepack pnpm --filter @scroll-goblin/api exec tsx --test src/modules/schrodingers-possum.test.ts
corepack pnpm --filter @scroll-goblin/api exec tsc --noEmit
corepack pnpm build
```

The quantum tests need boto3 and `moto[dynamodb,s3]`, and make no AWS calls:
`cd infra/quantum && python3 -m unittest -v test_handler`.

Browser checks mock the oracle and narrator to avoid pool/model consumption.
Cover both outcomes, all tones, validation, duplicate submission, reload,
pending recovery, narration retry/rewrite without a new flip, 503 fallback, 400/429 refusal, WebGL failure,
reduced motion, keyboard focus, long text, and mobile layout.
Clipboard checks cover the complete unchanged payload, cycling notes, focus
containment/restoration, dismissal, mobile scrolling and Russian-locale JSON.

Run `node scripts/check-possum.mjs` with the dev servers running and Playwright
available, or set `PLAYWRIGHT_MODULE` to an existing installation's absolute
`index.mjs` path. `POSSUM_BASE_URL` overrides localhost:5173 and
`POSSUM_SCREENSHOTS` selects the screenshot directory.
Set `POSSUM_NO_WEBGL=1` to exercise the UI with the scene fallback when a test
browser's software 3D renderer is slow. The clipboard interaction, receipt and
layout checks also pass in this mode; it does not validate 3D rendering.
Run `node scripts/check-possum-locales.mjs` for the all-locale UI checks using
the same Playwright/base-URL/screenshot settings and no provider calls.

Verified locally: 16 mocked AWS regression tests (including Chess), seven
decision tests, six API tests, TypeScript checks, the complete production
build including SEO generation, and the browser checks at 1365, 390 and 320px.
External quantum and Gemini services were mocked during these checks; this
does not establish deployment or live provider availability.

The shared AWS oracle update was subsequently deployed on October 1, 2026.
A live browser check resumed an unfinished dilemma, received a real hardware
measurement and Gemini narration (both HTTP 200), and confirmed that an oracle
retry and page reload preserved the same result. This consumed one existing
pool measurement and did not submit a paid Braket job. The web/API production
deployments remain separate from the working local preview.

Live Gemini checks for the alternate-timeline fix covered both winners of the
Alex/Daniel front-seat dilemma, reversed option order, and train/driving action
choices. Each generated alternate branch used its own selected option; the
front-seat examples explicitly swapped both children's seats. These checks
used narration only and consumed no quantum measurements.
