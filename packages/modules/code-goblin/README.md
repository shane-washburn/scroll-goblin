# Code Goblin

A self-contained coding adventure at `/apps/code-goblin`. The existing Scroll
Goblin registry supplies the landing card, lazy route, visit tracking and SEO.
No new backend, credentials, upstream endpoints, paid services or environment
variables are needed. The app uses React/TypeScript and the shared audio bus.

## Campaign

`src/lessons.json` contains 33 lessons and 100 challenges, with story introductions,
teaching notes, examples, hints, explanations and primary-reference links:

- **Forest Runes:** 12 Python lessons, from variables and tuples through context
  managers, object contracts, typing, generators and NumPy.
- **Dungeon Forging:** 12 Java lessons, from JVM concepts and primitive types
  through collections, polymorphism, generics and JUnit 5.
- **The Quantum Nether:** 9 lessons covering linked structures, BFS/DFS,
  vectorized layers, vector distances, qubits, Bell states and Qiskit sampling.

Each language starts independently. Lessons unlock sequentially within a track;
the Nether requires both complete language paths. Every node is playable.
Teaching examples are snippets: Java snippets assume their stated containing
method/class and imports. Lesson reference links point to Python, Java, NumPy,
JUnit, Princeton Algorithms, and IBM Quantum documentation.

The four mechanics are token assembly (click, keyboard or drag), selecting a
faulty line, cross-language multiple choice, and typing a missing fragment.
The typing clock starts explicitly, has a 30-second deadline that survives
reload/backgrounding, and can be disabled in settings before the next run.
Practice is always untimed. Code and user-typed fragments are excluded from DOM
translation and maintain left-to-right direction.

This release's curriculum is authored in English. It does not claim translated
lessons, open-ended code execution, accredited assessment, or guaranteed OMSCS
readiness. The optional Pyodide/Java execution sandbox is not implemented.
Quantum lessons use current StatevectorSampler syntax and describe ideal
classical simulation; the game does not run Qiskit or contact quantum hardware.

## Progress and rewards

The versioned browser save is `scroll-goblin-code-goblin-v1`. It includes the
active lesson, partially assembled/typed answer, feedback, deadline, hearts,
stars, streak, potions, selected track, equipped keepsake and settings. Reload
offers to resume. Starting another unfinished lesson requires an in-app choice.
Invalid saves recover valid completed nodes when possible; denied storage is
reported while in-memory play remains available. Saves are local to this browser,
are not an authentication/anti-cheat system, and do not sync between devices.
The shell falls back to source-English rendering when locale storage cannot be
read, because the current Hedgeling provider otherwise throws before modules mount.

- Five hearts reset at local midnight. Incorrect campaign submissions and
  expired typing clocks cost one heart. A feedback screen cannot charge twice.
- At zero hearts, unlimited practice remains available. Finishing a practice
  lesson restores one heart, capped at five, without unlocking campaign nodes.
- Campaign stars are 3 for zero mistakes, 2 for one or two, and 1 thereafter.
  Hints are free. Replays keep the best score. XP is 30 per completed lesson
  plus 10 per best star, so repeating a perfect lesson cannot farm XP.
- A completed campaign/practice lesson counts as activity for the local day.
  Seven actual consecutive active days brew a freeze potion (maximum three).
  Returning after exactly one missed day automatically consumes one potion and
  continues the streak. Longer gaps reset it. Day calculations handle DST.
- Nine stars unlock Pip's scarf; 24 unlock his hammer. Finishing the Nether
  unlocks a cosmic-tail keepsake and the personalized Certificate of Wizardry.
  The diploma downloads as an escaped SVG or prints/saves to PDF. It is explicitly
  commemorative self-guided practice, not an accredited qualification.

Pip, snake-witch Pythia, Brak, the Glitch Imp and Percy use a locally bundled
portrait atlas. The world illustration and atlas were generated with the built-in
imagegen tool, then encoded as JPEG assets. Exact prompts are in
`src/assets/art-prompts.txt`. Nothing depends on the author's imagegen directory.
Motion is limited to short CSS transitions, with reduced-motion support. Sounds
are opt-in and respect the shared Scroll Goblin mute state.

## Extend the curriculum

Edit `src/lessons.json`; Vite reloads it during development, and a production build
bundles the new content. No renderer changes are needed for new lessons using
the four existing challenge types. `src/types.ts` defines the schema;
`validateCurriculum` checks IDs, prerequisites, references and answer structure.
Keep prerequisite lessons earlier in the array. Use stable node IDs to preserve
existing saves. Give every challenge a unique ID and a meaningful hint and
explanation. Word-bank answers must be constructible with the supplied tokens,
including duplicate tokens and significant whitespace. Explicit
`acceptedSequences` / `acceptedAnswers` can allow equivalent solutions. Never
execute lesson content with eval or dynamically generated functions.

`engine.ts` owns all score/life/clock transitions as pure functions. The renderer
does not award progress directly. Completed runs cannot award twice. Curriculum
validation runs on import, so malformed authoring fails visibly during development.

## Run and verify

From the repository root, with dependencies installed:

```sh
corepack pnpm --filter @scroll-goblin/web exec vite --host 127.0.0.1 --port 5174
corepack pnpm --filter @scroll-goblin/module-code-goblin typecheck
corepack pnpm --filter @scroll-goblin/web exec tsx --test ../../packages/modules/code-goblin/src/engine.test.ts
```

Run `pnpm build` for the full shared/API/web production build and SEO generation.
The repository's recursive scripts require `pnpm` on PATH, even when the parent
command is invoked through Corepack.

With the dev server running and Playwright available:

```sh
node scripts/check-code-goblin.mjs
```

`PLAYWRIGHT_MODULE` can point to an existing Playwright `index.mjs` installation.
`CODE_GOBLIN_BASE_URL` changes the local target and `CODE_GOBLIN_SCREENSHOTS`
changes the screenshot directory. `--edges-only` skips the complete campaign
walkthrough when only persistence/accessibility/failure checks need rerunning.
Browser checks mock shared statistics and never call a learning/model provider.

Verification covers all 100 challenge answers through the browser, 320/390px
layouts, actual chip drag/drop, reload/resume, timer expiry, practice restoration,
reward gates, certificate download/escaping, dialog focus, invalid saves and
storage denial. Nine engine tests cover the complete curriculum, score integrity,
dates, streaks, freezes and save recovery. Teaching examples in the Python and
Nether tracks also pass Python's syntax parser; this is not runtime execution of
Java, NumPy or Qiskit examples.
