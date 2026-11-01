# Hot Dog or Not 🌭

A quick-fire guessing game: a procedurally drawn picture hides behind a 6×5
grid of tiles. Peek under as few tiles as you dare, then call it — **Hot Dog**
or **Not Hot Dog**.

## Rules

- The guess buttons unlock after the first tile is peeked.
- A correct call is worth `100 − 6 × (extra tiles peeked)` points, floored at
  10 — the first peek is free, so a one-tile guess banks the full 100.
- Consecutive correct calls build a streak multiplier (×1 → ×4 cap). A wrong
  call scores zero and resets it.
- Five rounds per game, always at least two hot dogs and two imposters, then a
  final rank based on total score.

## No assets, no network

Every subject (hot dogs, dachshund, sub sandwich, banana, caterpillar, canoe)
is drawn procedurally as inline SVG in `src/art.tsx`. Each round applies a
random rotation, zoom, flip, and pan plus a color variant, so repeat subjects
never look identical. Nothing is fetched and nothing can fail during a demo.

## Architecture

- `src/engine.ts` — pure, immutable game state (seeded PRNG, reveal, scoring,
  streaks, ranks). No React, fully unit-tested.
- `src/art.tsx` — procedural SVG drawing per subject.
- `src/HotdogPage.tsx` — the single page component.

## Tests

```
corepack pnpm --filter @scroll-goblin/web exec tsx --test ../../packages/modules/hotdog-or-not/src/engine.test.ts
```
