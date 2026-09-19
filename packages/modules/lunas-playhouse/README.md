# Luna’s Playhouse

Local-first decorating sandbox at `/apps/lunas-playhouse`. Uses existing React,
Three.js and shared audio; no Firebase, AWS, account, network API, or new engine.

Select a miniature in the basket, then tap a glowing spot. Tap a placed object
(or its checked inventory thumbnail) to open move, quarter-turn, basket and done
controls. Moving is explicit; placement automatically hides the glowing spots.
Empty-space taps, a second tap on the selected item, or Escape dismiss controls. The basket button returns it;
each of the 26 objects exists once. All eleven PRD items are represented, with
the zarape as a floor blanket. Extra furniture, framed paintings, a houseplant, tea set, books, fruit bowl,
slippers, blocks, cushion, flowers and cloud mobile provide more choices. Icon
filters group floor, tabletop, wall and hanging objects. Original procedural miniatures, not imported assets.

The arrow icons rotate the orthographic camera 90 degrees. Wall visibility uses
camera-facing normals. Attached decorations and placement targets follow wall
visibility. Inventory thumbnails render the same 3D models used in the room.

`model.ts` owns node coordinates/categories, collision fallback, save validation,
and BFS character paths. Floor nodes are spaced 1.05 units. Invalid item categories
are rejected; occupied nodes choose the closest free node of that category on the
same wall. Furniture and non-flat floor items block walking. Mia and Luna approach
new items automatically and celebrate; after ten idle seconds they wave.

Placements save to `lunas-playhouse-v1` in localStorage; orientations use
`lunas-playhouse-rotations-v1`, keeping older rooms compatible. Wall-side floor
spots face objects inward automatically and enforce clearance from nearby nodes. Invalid or duplicate saved
nodes are dropped. Storage failure shows a warning icon but does not stop play.
Sound respects Scroll Goblin’s shared mute. Turning sound on plays a test melody;
selection, placement and basket returns have distinct synthesized cues. Audio
waits for browser resume before scheduling notes, with larger visual celebrations
that also work while muted. Reduced motion removes sparkles and
character bounce. Icon controls have accessible names; tabbing after selection
reveals keyboard placement buttons. WebGL failure has a readable fallback message.

Playtest focus: node spacing, 44px magnetic tap radius, camera views, returning
items, and character approach distances. Adjust these in `model.ts` / `Room.tsx`.
Current interaction is tap-select/tap-place rather than free dragging. Characters
use lightweight grid paths and simple procedural celebration animations.

Tests: `pnpm --filter @scroll-goblin/web exec node --import tsx --test ../../packages/modules/lunas-playhouse/src/model.test.ts`
