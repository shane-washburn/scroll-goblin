import type { ModuleManifest } from "@scroll-goblin/ui";
export const manifest: ModuleManifest = {
  id: "bubble-blast-brawl-0d321662",
  title: "Bubble Blast Brawl",
  description: "Inflate and pop bubbles to trap and defeat your bubbly bot rival in a bouncy, chaotic arena!",
  emoji: "👺",
  path: "/apps/bubble-blast-brawl-0d321662",
  status: "active",
  load: () => import("./GamePage"),
};
