import type { ModuleManifest } from '@scroll-goblin/ui';

export const manifest: ModuleManifest = {
  id: 'code-goblin',
  title: 'Code Goblin',
  description: 'Learn Python and Java as ancient spellcraft. Catch bugs, weave code, and journey with Pip into the Quantum Nether.',
  emoji: '📜',
  path: '/apps/code-goblin',
  status: 'beta',
  load: () => import('./CodeGoblinPage'),
};
