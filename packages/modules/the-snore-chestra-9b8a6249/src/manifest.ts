import type { ModuleManifest } from "@scroll-goblin/ui";
export const manifest: ModuleManifest = {
  id: "the-snore-chestra-9b8a6249",
  title: "The Snore-chestra",
  description: "A cacophony of distractions (sirens, barking dogs, phone rings) are trying to keep you up! Your only defense is to gently 'snore' them away.",
  emoji: "👺",
  path: "/apps/the-snore-chestra-9b8a6249",
  status: "active",
  load: () => import("./GamePage"),
};
