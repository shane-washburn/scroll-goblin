import type { ModuleManifest } from '@scroll-goblin/ui';

export const manifest: ModuleManifest = {
  id: 'schrodingers-possum', title: 'Schrödinger’s Possum',
  description: 'Two choices. One deeply unqualified possum. Let quantum fate pick a path, then peek into the timeline you left behind.',
  emoji: '🌀', path: '/apps/schrodingers-possum', status: 'beta',
  load: () => import('./PossumPage'),
};
