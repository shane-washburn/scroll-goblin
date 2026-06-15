import type { ModuleManifest } from "@scroll-goblin/ui";

export const manifest: ModuleManifest = {
  id: "life-of-an-octopus",
  title: "Life of an Octopus",
  description:
    "A playable nature documentary. You will hatch, hunt, hide, love, and die — the whole short, strange life of an octopus in a few minutes. Most never reach adulthood. Can you?",
  emoji: "🐙",
  path: "/apps/life-of-an-octopus",
  status: "active",
  load: () => import("./LifeOfAnOctopusPage"),
};
