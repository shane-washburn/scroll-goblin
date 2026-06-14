import type { ModuleManifest } from "@scroll-goblin/ui";

export const manifest: ModuleManifest = {
  id: "musical-dna",
  title: "Musical DNA",
  description:
    "String together amino acids and listen to the song they encode. Same sequence, same tune — every protein gets its own key, mood, and groove.",
  emoji: "🧬",
  path: "/apps/musical-dna",
  status: "active",
  load: () => import("./MusicalDnaPage"),
};
