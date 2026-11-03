import type { ReactNode } from 'react';

/**
 * Every subject is drawn procedurally into a 300x200 viewBox — no image
 * assets, no network. The `variant` (0–3) nudges palettes and garnish so a
 * repeated subject never looks identical, and the per-round transform
 * (rotate/flip/zoom/pan) is applied by the stage on top of this.
 */
export type DrawFn = (variant: number) => ReactNode;

const pick = <T,>(options: T[], variant: number) => options[variant % options.length];

const BUNS = ['#e0a964', '#d89f57', '#e6b273', '#d2964b'];
const SAUSAGES = ['#b5452c', '#a93f26', '#c04f33', '#9e3a22'];

function Bun({ variant, children }: { variant: number; children?: ReactNode }) {
  const bun = pick(BUNS, variant);
  return <g>
    <rect x="45" y="104" width="214" height="44" rx="22" fill={bun} />
    <rect x="45" y="104" width="214" height="16" rx="8" fill="#00000014" />
    <rect x="34" y="88" width="232" height="38" rx="19" fill={pick(SAUSAGES, variant)} />
    <rect x="38" y="92" width="224" height="10" rx="5" fill="#ffffff2e" />
    <rect x="52" y="52" width="200" height="50" rx="25" fill={bun} />
    <rect x="58" y="56" width="188" height="16" rx="8" fill="#ffffff38" />
    {children}
  </g>;
}

const mustardZigzag = (y: number) => {
  let d = `M 62 ${y}`;
  for (let i = 0; i < 9; i++) d += ` q 10 ${i % 2 ? 16 : -16} 20 0`;
  return d;
};

const classicDog: DrawFn = variant => <Bun variant={variant}>
  {variant % 2 === 1 && <path d={mustardZigzag(105)} fill="none" stroke="#e8b429" strokeWidth="7" strokeLinecap="round" />}
</Bun>;

const mustardDog: DrawFn = variant => <Bun variant={variant}>
  <path d={mustardZigzag(103)} fill="none" stroke="#e8b429" strokeWidth="8" strokeLinecap="round" />
  {variant >= 2 && <path d={mustardZigzag(112)} fill="none" stroke="#c0392b" strokeWidth="6" strokeLinecap="round" />}
</Bun>;

const loadedDog: DrawFn = variant => <Bun variant={variant}>
  {Array.from({ length: 12 }, (_, i) => <path key={i} transform={`translate(${64 + i * 15} ${98 + (i % 3) * 5}) rotate(${(i * 53 + variant * 31) % 70 - 35})`}
    d="M -7 0 L 7 0" stroke={i % 2 ? '#7cb342' : '#f4e04d'} strokeWidth="5" strokeLinecap="round" />)}
  <path d={mustardZigzag(108)} fill="none" stroke="#e8b429" strokeWidth="5" strokeLinecap="round" />
</Bun>;

const chiliDog: DrawFn = variant => <Bun variant={variant}>
  <path d="M 52 102 q 22 -16 44 -4 q 20 12 40 -2 q 22 -14 42 0 q 20 12 40 -1 q 18 -11 32 3 q -8 14 -40 13 q -120 6 -158 -9 z" fill="#8c3a1d" />
  {Array.from({ length: 8 }, (_, i) => <circle key={i} cx={70 + i * 23} cy={100 + ((i + variant) % 3) * 4} r="4" fill="#6b2a12" />)}
  {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M ${76 + i * 25} ${93 + (i % 2) * 5} l 9 4`} stroke="#f6c26b" strokeWidth="4" strokeLinecap="round" />)}
</Bun>;

const DOGS = ['#8a5a33', '#7a4e2b', '#96653c', '#6e452a'];
const dachshund: DrawFn = variant => {
  const coat = pick(DOGS, variant);
  return <g>
    <rect x="48" y="78" width="170" height="52" rx="26" fill={coat} />
    {[78, 108, 168, 198].map(x => <rect key={x} x={x} y="118" width="14" height="38" rx="7" fill={coat} />)}
    <path d="M 52 92 Q 18 74 24 48 Q 40 62 60 76 Z" fill={coat} />
    <circle cx="226" cy="84" r="30" fill={coat} />
    <rect x="244" y="82" width="40" height="22" rx="11" fill={coat} />
    <circle cx="284" cy="93" r="7" fill="#3c2415" />
    <path d="M 214 62 q -16 4 -14 34 q 12 4 20 -4 z" fill="#4e3018" />
    <circle cx="234" cy="76" r="4.5" fill="#241509" />
    <rect x="206" y="104" width="32" height="9" rx="4.5" fill={pick(['#c0392b', '#2e6da4', '#2f8f4e', '#b07d2b'], variant)} />
    <path d="M 118 148 q 26 10 52 0" fill="none" stroke="#00000022" strokeWidth="6" strokeLinecap="round" />
  </g>;
};

const subSandwich: DrawFn = variant => {
  const bun = pick(BUNS, variant);
  return <g>
    <rect x="40" y="110" width="224" height="38" rx="19" fill={bun} />
    <path d="M 44 112 q 14 -14 28 0 q 14 -14 28 0 q 14 -14 28 0 q 14 -14 28 0 q 14 -14 28 0 q 14 -14 28 0 q 14 -14 28 0 l 0 10 l -196 0 z" fill="#5f9e45" />
    {[80, 130, 180, 230].map(x => <circle key={x} cx={x} cy="108" r="11" fill="#c0392b" />)}
    <path d="M 48 104 l 24 -12 l 24 12 l 24 -12 l 24 12 l 24 -12 l 24 12 l 24 -12 l 20 10 l 0 6 l -188 0 z" fill="#f2c14e" />
    <rect x="46" y="54" width="212" height="46" rx="23" fill={bun} />
    <rect x="52" y="58" width="196" height="14" rx="7" fill="#ffffff38" />
    {Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx={74 + i * 20} cy={64 + ((i + variant) % 3) * 7} rx="3.4" ry="2.2"
      transform={`rotate(${(i * 37) % 60 - 30} ${74 + i * 20} ${64 + ((i + variant) % 3) * 7})`} fill="#fdf2d8" />)}
  </g>;
};

const banana: DrawFn = variant => {
  const peel = pick(['#f2d12e', '#edc92b', '#f6d94a', '#e8c125'], variant);
  return <g>
    <path d="M 46 70 Q 70 150 150 158 Q 230 166 258 112 Q 262 102 250 104 Q 226 142 154 136 Q 84 130 62 66 Q 58 56 46 70 Z" fill={peel} />
    <path d="M 60 78 Q 84 136 152 144 Q 212 150 244 116" fill="none" stroke="#d9b21f" strokeWidth="7" strokeLinecap="round" />
    <rect x="42" y="56" width="14" height="18" rx="4" fill="#8a6d1d" />
    <path d="M 248 104 l 14 2 l -8 12 z" fill="#6f5717" />
    {variant >= 2 && <circle cx="150" cy="150" r="3.5" fill="#8a6d1d" />}
  </g>;
};

const caterpillar: DrawFn = variant => {
  const body = pick(['#7cb342', '#69a234', '#8bc34a', '#5e9230'], variant);
  return <g>
    <path d="M 30 150 q 120 24 240 0 q -8 14 -40 14 l -160 0 q -32 0 -40 -14 z" fill="#4e7e2b" />
    {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={210 - i * 29} cy={118 + Math.sin(i * 1.3 + variant) * 8} r="23" fill={body} />)}
    {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={210 - i * 29} cy={110 + Math.sin(i * 1.3 + variant) * 8} r="7" fill="#ffffff30" />)}
    <circle cx="232" cy="106" r="26" fill={body} />
    <circle cx="240" cy="100" r="5" fill="#fff" /><circle cx="241.5" cy="100" r="2.5" fill="#222" />
    <path d="M 244 118 q 8 4 14 0" fill="none" stroke="#2d4a16" strokeWidth="3" strokeLinecap="round" />
    <path d="M 228 84 q -4 -14 -14 -18 M 240 82 q 2 -14 12 -20" fill="none" stroke="#2d4a16" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="214" cy="66" r="4" fill="#2d4a16" /><circle cx="252" cy="62" r="4" fill="#2d4a16" />
  </g>;
};

const canoe: DrawFn = variant => {
  const hull = pick(['#a0522d', '#8b4a26', '#b35f33', '#7d4222'], variant);
  return <g>
    <path d="M 30 92 Q 150 128 270 92 Q 268 136 228 150 L 72 150 Q 32 136 30 92 Z" fill={hull} />
    <path d="M 30 92 Q 150 128 270 92 Q 150 114 30 92 Z" fill="#5c3317" />
    <path d="M 68 118 l 0 24 M 150 124 l 0 26 M 232 118 l 0 24" stroke="#5c3317" strokeWidth="7" strokeLinecap="round" />
    <path d={`M ${variant % 2 ? 196 : 104} 44 l 10 60`} stroke="#c9975b" strokeWidth="7" strokeLinecap="round" />
    <ellipse cx={variant % 2 ? 194 : 102} cy="40" rx="9" ry="16" transform={`rotate(10 ${variant % 2 ? 194 : 102} 40)`} fill="#c9975b" />
    <path d="M 34 96 Q 150 130 266 96" fill="none" stroke="#00000026" strokeWidth="4" />
  </g>;
};

export const SUBJECT_ART: Record<string, DrawFn> = {
  'classic-dog': classicDog,
  'mustard-dog': mustardDog,
  'loaded-dog': loadedDog,
  'chili-dog': chiliDog,
  dachshund,
  'sub-sandwich': subSandwich,
  banana,
  caterpillar,
  canoe,
};
