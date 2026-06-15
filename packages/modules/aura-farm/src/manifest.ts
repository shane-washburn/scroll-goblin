import type { ModuleManifest } from "@scroll-goblin/ui";

export const manifest: ModuleManifest = {
  id: "aura-farm",
  title: "Goblin Aura Farm",
  description:
    "Mix colored energy into a jarred aura blob, raise it with feeding, rest, sunlight, music and pure chaos, then harvest it onto your goblin — who erupts into a dance picked by your color. Sneaky color-theory lessons, extremely dumb dances.",
  emoji: "🔮",
  path: "/apps/aura-farm",
  status: "active",
  load: () => import("./AuraFarmPage"),
};
