import type { ModuleManifest } from '@scroll-goblin/ui';
export const manifest: ModuleManifest = {
  id: 'goblin-chess', title: 'Scroll Goblins vs Hedgelings',
  description: 'Woodland chess, real quantum fate, and an opponent who thinks the rules are a suggestion. Command your faction in 3D.',
  emoji: '♟️', path: '/apps/goblin-chess', status: 'beta',
  load: () => import('./ChessPage'),
};
