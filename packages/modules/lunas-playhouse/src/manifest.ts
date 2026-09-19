import type { ModuleManifest } from '@scroll-goblin/ui';
export const manifest: ModuleManifest = { id: 'lunas-playhouse', title: "Luna’s Playhouse", description: 'A little room, a world of treasures. Decorate and play with Mia and Luna.', emoji: '🏡', path: '/apps/lunas-playhouse', status: 'beta', load: () => import('./Playhouse') };
