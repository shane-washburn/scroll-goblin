import type { ModuleManifest } from "@scroll-goblin/ui";

export const manifest: ModuleManifest = {
  id: "brainrot-button",
  title: "Brainrot Button",
  description:
    "Smash a giant button for instant affirmation, then record your own dramatic version and share it for seven chaotic days.",
  emoji: "🔴",
  path: "/apps/brainrot-button",
  status: "active",
  load: () => import("./BrainrotButtonPage"),
};
