# Scroll Goblins vs Hedgelings

Route: `/apps/goblin-chess`. A new lazy-loaded module; existing modules are
unchanged. React, Three.js, chess.js 1.4, and Stockfish.js 19.

## Play

Quantum assignment selects faction and color independently, then the player
chooses a tier and deploys the board. All matches are untimed. Easy uses lite
Stockfish at depth 1 and skill 0; medium uses depth 5 / 1.2 seconds and skill 5;
hard uses the full NNUE single-threaded engine at skill 20 with five seconds
per move. Hard's engine is about 95 MB, loaded on demand. Strength is constrained
by the player's device and per-move time, not an advertised Elo rating.

Normal chess includes castling, en passant, underpromotion, checkmate and draws.
Easy provides three complete-decision takebacks and optional attacked-piece
warnings; medium provides one takeback; hard provides none. Legal destinations
and role explanations are available to everyone. Games persist in localStorage.

Chaos uses its own board, because illegal edits invalidate normal chess state.
The LLM can teleport, resurrect captured non-kings, transform non-kings, capture
kings, and declare victory. It chooses moves through the existing backend Gemini
integration. Each request includes the exact last human action, remaining human
cheats, and the last four accepted opponent comments. This rolling context is
saved locally with the match; older saves begin with empty memory. Rejected
actions never enter banter history. The Mad Alchemist and Wandering Spirit have
distinct chemistry-obsessed and ethereal/passive-aggressive persona prompts.
Humans get three cheats (each spends a turn). Normal human moves
obey movement geometry, while check is advisory. Castling and en passant are
intentionally disabled in chaos. Pawn arrivals on the last rank promote (queen
by default in chaos). Friendly-square collisions and off-board coordinates are
rejected; invalid LLM edits get one corrective retry, then a visible retry button.
Ordinary checkmate, king capture, or declaration requests a forced quantum ending
for either side. Cheats are not counted as checkmate escapes; the Universe can
choose either winner regardless of who delivered mate. Otherwise the
Universe checks after each completed round starting with round six. A player
can still resign voluntarily.

The board uses locally generated 3D miniatures inspired by the user's reference
images, not full-detail imported character models. The introduction has a two-sided interactive faction coin. Its first spin
reveals the quantum assignment; later spins are cosmetic and keep that result.
Goblins wear emerald and violet; Hedgelings use ivory, copper, and red. The back
rank is larger, with taller kings and jeweled queen tiaras for clear silhouettes. There is an accessible 2D button board and a WebGL
fallback. No external 3D asset service is required.

## Run and deploy

From the repository root:

```sh
corepack pnpm install
corepack pnpm dev
```

If `pnpm` is not on PATH, enable Corepack's shims with `corepack enable` or place
shims in a writable directory with `corepack enable --install-directory <dir>`
and add that directory to PATH.

`VITE_QUANTUM_API_URL` optionally overrides the deployed AWS oracle URL. The
frontend calls this public rate-limited API directly; it contains no AWS keys.
New matches try hardware first, falling back to an explicitly labeled browser
state-vector simulator on network errors, timeouts (6 seconds), or server failures.
Validation errors and rate limits are not bypassed. Mid-match hardware failures
continue from the last accepted event without changing faction, color, or board.
Once switched, the match stays simulated, including after reload, to avoid mixing
late hardware responses with simulated results. Retries reuse saved outcomes.
The simulator applies eight Hadamard gates and samples Born probabilities; it
uses no AWS credits and is not physical quantum randomness. It is available in
production. `VITE_QUANTUM_SIMULATOR=true` forces simulation in local development.
The LLM service is separate and must still be reachable for chaos turns.

The existing API needs its normal `GOOGLE_GENERATIVE_AI_API_KEY` and
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. Chaos is rate-limited to
12 requests/IP/minute through Redis and refuses production calls if Redis is
unconfigured. The frontend's `VITE_API_BASE_URL` must point to the updated Hono
API (`/api` suffix in production). Deploy **both** existing Vercel projects to
publish the game and its new `/goblin-chess/v1/chaos` route. The AWS deployment
alone does not publish the web app or the Gemini route.

The build copies pinned Stockfish assets locally. The source archive and GPL
license are distributed alongside them; engine files are generated and ignored
by git. No COOP/COEP headers are needed for single-threaded WASM.

## Verification

```sh
corepack pnpm --filter @scroll-goblin/web exec node --import tsx --test ../../packages/modules/goblin-chess/src/game.test.ts
corepack pnpm --filter @scroll-goblin/api exec tsc --noEmit
corepack pnpm build
```

See `infra/quantum/README.md` for AWS deployment, replenishment, and tests.
