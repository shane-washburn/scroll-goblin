import type { ModuleManifest } from "@scroll-goblin/ui";

export const manifest: ModuleManifest = {
  id: "slug-fencing",
  title: "Slug Duel",
  description:
    "A duel of two slimy duelists. Pick solo (vs a Sleepy, Average, or Sigma slug) or send a friend a link. Slide up and down, tap to lunge, and win the match to make your slug ascend into a confetti-soaked sigma champion.",
  emoji: "🐌",
  path: "/apps/slug-fencing",
  status: "active",
  load: () => import("./SlugDuelPage"),
};
