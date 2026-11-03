import type { ModuleManifest } from '@scroll-goblin/ui';

export const manifest: ModuleManifest = {
  id: 'hotdog-or-not',
  title: 'Hot Dog or Not',
  description: 'Peek under the tiles and call it: hot dog or not? The less you peek, the more you score.',
  emoji: '🌭',
  path: '/apps/hotdog-or-not',
  status: 'beta',
  load: () => import('./HotdogPage'),
};
