import type { ModuleManifest } from "@scroll-goblin/ui";

export const manifest: ModuleManifest = {
  id: "goblin-mirror",
  title: "Goblin Surveillance Mirror",
  description:
    "What does the internet know about you? A goblin scans your device, remembers your visits, and infers who you are — then proves that deleting cookies isn't enough. Educational, slightly unsettling, runs entirely on your device.",
  emoji: "🪞",
  path: "/apps/goblin-mirror",
  status: "beta",
  load: () => import("./GoblinMirrorPage"),
};
