import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  MuteButton,
  ShareButton,
  consumeShareSnapshot,
  trackStat,
  useTranslation,
  useMobileGameFit,
} from "@scroll-goblin/ui";
import {
  FALL_SOUND_MS,
  playBreak,
  playFall,
  playLevelUp,
  playTap,
  playVictoryMusic,
  preloadVictoryMusic,
  stopVictoryMusic,
  type SoundKind,
} from "./sounds";

type ItemKind =
  | SoundKind
  | "cauldron"
  | "anvil"
  | "safe"
  | "tax-code"
  | "government-urn";

interface ShelfItem {
  id: string;
  name: string;
  short: string;
  fallMessage?: string;
  kind: ItemKind;
  soundKind?: SoundKind;
  weight: number;
  points: number;
  rarity: number;
  color: string;
  minLevel?: number;
  boss?: boolean;
}

interface ActiveItem extends ShelfItem {
  nonce: number;
  x: number;
  progress: number;
  falling: boolean;
}

interface ShareState {
  pushed: number;
  score: number;
  level: number;
}

const MODULE_ID = "pushy-paws";
const SHARE_VERSION = 1;
const BOSS_LEVEL = 30;
const PUSHY_PAWS_MESSAGES = [
  "A shared shelf awaits further judgment.",
  "Tap the object once for each cat swat. Heavier targets need more paws.",
  "Fwump. Deeply unsatisfying.",
  "Squeak. The cat looks personally betrayed.",
  "The rune stone detonates. Worth it.",
  "The chalice rings forever. Beautiful.",
  "The Government Urn has appeared. Ten clean paws decide everything.",
  "Government has been toppled!",
  "Shelf liberated.",
];

const ITEMS: ShelfItem[] = [
  {
    id: "potion",
    name: "Bubbling Potion Flask",
    short: "Potion",
    fallMessage: "Bubbling Potion Flask leaves the shelf.",
    kind: "potion",
    weight: 42,
    points: 2,
    rarity: 6,
    color: "#2dd4bf",
  },
  {
    id: "crystal",
    name: "Heavy Crystal Ball",
    short: "Crystal",
    fallMessage: "Heavy Crystal Ball leaves the shelf.",
    kind: "crystal",
    weight: 78,
    points: 4,
    rarity: 4,
    color: "#a78bfa",
  },
  {
    id: "scroll",
    name: "Ancient Magic Scroll",
    short: "Scroll",
    fallMessage: "Ancient Magic Scroll leaves the shelf.",
    kind: "scroll",
    weight: 24,
    points: 1,
    rarity: 7,
    color: "#fde68a",
  },
  {
    id: "wand",
    name: "Enchanted Wand",
    short: "Wand",
    fallMessage: "Enchanted Wand leaves the shelf.",
    kind: "wand",
    weight: 34,
    points: 2,
    rarity: 6,
    color: "#8b5a2b",
  },
  {
    id: "mug",
    name: "Ceramic Mug",
    short: "Ceramic mug",
    fallMessage: "Ceramic Mug leaves the shelf.",
    kind: "mug",
    weight: 50,
    points: 2,
    rarity: 8,
    color: "#f8fafc",
  },
  {
    id: "plant",
    name: "Potted Mandrake",
    short: "Plant",
    fallMessage: "Potted Mandrake leaves the shelf.",
    kind: "plant",
    weight: 66,
    points: 3,
    rarity: 6,
    color: "#22c55e",
  },
  {
    id: "books",
    name: "Stack of Heavy Spellbooks",
    short: "Stack of books",
    fallMessage: "Stack of Heavy Spellbooks leaves the shelf.",
    kind: "books",
    weight: 86,
    points: 4,
    rarity: 5,
    color: "#ef4444",
  },
  {
    id: "portrait",
    name: "Framed Portrait",
    short: "Portrait",
    fallMessage: "Framed Portrait leaves the shelf.",
    kind: "portrait",
    weight: 58,
    points: 3,
    rarity: 5,
    color: "#f59e0b",
  },
  {
    id: "chalice",
    name: "The Golden Chalice",
    short: "Chalice",
    kind: "chalice",
    weight: 72,
    points: 9,
    rarity: 2,
    color: "#facc15",
  },
  {
    id: "rune",
    name: "Volatile Rune Stone",
    short: "Rune",
    kind: "rune",
    weight: 62,
    points: 5,
    rarity: 2,
    color: "#38bdf8",
  },
  {
    id: "mouse",
    name: "Rubber Mouse Toy",
    short: "Mouse",
    kind: "mouse",
    weight: 18,
    points: -2,
    rarity: 3,
    color: "#94a3b8",
  },
  {
    id: "cauldron",
    name: "Overfilled Iron Cauldron",
    short: "Cauldron",
    fallMessage: "Overfilled Iron Cauldron leaves the shelf.",
    kind: "cauldron",
    soundKind: "plant",
    weight: 138,
    points: 8,
    rarity: 4,
    color: "#334155",
    minLevel: 10,
  },
  {
    id: "tax-code",
    name: "Unabridged Tax Code",
    short: "Tax code",
    fallMessage: "Unabridged Tax Code leaves the shelf.",
    kind: "tax-code",
    soundKind: "books",
    weight: 164,
    points: 10,
    rarity: 3,
    color: "#0f766e",
    minLevel: 16,
  },
  {
    id: "anvil",
    name: "Tiny Decorative Anvil",
    short: "Anvil",
    fallMessage: "Tiny Decorative Anvil leaves the shelf.",
    kind: "anvil",
    soundKind: "crystal",
    weight: 190,
    points: 12,
    rarity: 3,
    color: "#64748b",
    minLevel: 22,
  },
  {
    id: "safe",
    name: "Suspicious Little Safe",
    short: "Safe",
    fallMessage: "Suspicious Little Safe leaves the shelf.",
    kind: "safe",
    soundKind: "books",
    weight: 235,
    points: 16,
    rarity: 2,
    color: "#475569",
    minLevel: 26,
  },
];

function bossItem(): ShelfItem {
  const strength = strengthFor(BOSS_LEVEL);
  return {
    id: "government-urn",
    name: "Government Urn",
    short: "Government Urn",
    fallMessage: PUSHY_PAWS_MESSAGES[7],
    kind: "government-urn",
    soundKind: "mug",
    weight: strength * 10,
    points: 100,
    rarity: 0,
    color: "#e5e7eb",
    minLevel: BOSS_LEVEL,
    boss: true,
  };
}

function chooseItem(level: number): ShelfItem {
  const pool = ITEMS.filter((item) => level >= (item.minLevel ?? 1));
  const total = pool.reduce((sum, item) => sum + item.rarity, 0);
  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= item.rarity;
    if (roll <= 0) return item;
  }
  return pool[0] ?? ITEMS[0];
}

function scaledWeight(item: ShelfItem, level: number) {
  if (item.boss) return item.weight;
  const levelScale = 1 + Math.max(0, level - 1) * 0.026;
  const lateGameScale = level >= 20 ? 1.15 : 1;
  return Math.round(item.weight * levelScale * lateGameScale);
}

function makeActive(level = 1, previousId?: string): ActiveItem {
  let base = level >= BOSS_LEVEL ? bossItem() : chooseItem(level);
  if (!base.boss && base.id === previousId && Math.random() < 0.7) {
    base = chooseItem(level);
  }
  return {
    ...base,
    weight: scaledWeight(base, level),
    nonce: Date.now() + Math.random(),
    x: base.boss ? 74 : 48 + Math.random() * 24,
    progress: 0,
    falling: false,
  };
}

function levelFor(pushed: number) {
  return Math.floor(pushed / 6) + 1;
}

function strengthFor(level: number) {
  return 14 + (level - 1) * 5;
}

function soundKindFor(item: ShelfItem): SoundKind {
  return item.soundKind ?? (item.kind as SoundKind);
}

function messageFor(item: ShelfItem) {
  if (item.boss) return item.fallMessage ?? PUSHY_PAWS_MESSAGES[7];
  if (item.kind === "mouse") return PUSHY_PAWS_MESSAGES[3];
  if (item.kind === "rune") return PUSHY_PAWS_MESSAGES[4];
  if (item.kind === "chalice") return PUSHY_PAWS_MESSAGES[5];
  if (item.kind === "scroll") return PUSHY_PAWS_MESSAGES[2];
  return item.fallMessage ?? `${item.name} leaves the shelf.`;
}

function ItemArt({ item, governmentLabel }: { item: ShelfItem; governmentLabel: string }) {
  switch (item.kind) {
    case "potion":
      return (
        <svg viewBox="0 0 80 90" className="h-full w-full">
          <path d="M33 6h14v22l20 34c8 14-1 24-27 24S5 76 13 62l20-34z" fill="#99f6e4" stroke="#111827" strokeWidth="4" />
          <path d="M25 58c12 6 26 6 40 0l5 11c-4 10-18 14-31 14-17 0-26-5-29-14z" fill={item.color} />
          <circle cx="31" cy="52" r="4" fill="#ecfeff" />
          <circle cx="48" cy="65" r="3" fill="#ecfeff" />
          <path d="M28 27h24" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "crystal":
      return (
        <svg viewBox="0 0 86 86" className="h-full w-full">
          <circle cx="43" cy="38" r="27" fill="#ddd6fe" stroke="#111827" strokeWidth="4" />
          <path d="M25 21c12-10 31-7 40 6-16-4-28-1-40 16z" fill="#f5f3ff" opacity="0.8" />
          <path d="M21 70h44l8 10H13z" fill="#6b7280" stroke="#111827" strokeWidth="4" />
        </svg>
      );
    case "scroll":
      return (
        <svg viewBox="0 0 94 70" className="h-full w-full">
          <path d="M16 14h62v42H16z" fill="#fde68a" stroke="#111827" strokeWidth="4" />
          <circle cx="16" cy="35" r="12" fill="#fef3c7" stroke="#111827" strokeWidth="4" />
          <circle cx="78" cy="35" r="12" fill="#fef3c7" stroke="#111827" strokeWidth="4" />
          <path d="M34 28h24M32 40h30" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "wand":
      return (
        <svg viewBox="0 0 96 58" className="h-full w-full">
          <path d="M16 42L78 14" stroke="#111827" strokeWidth="9" strokeLinecap="round" />
          <path d="M19 41L76 15" stroke="#8b5a2b" strokeWidth="5" strokeLinecap="round" />
          <path d="M75 8l4 9 10 1-8 6 3 10-9-6-9 6 3-10-8-6 10-1z" fill="#fef08a" stroke="#111827" strokeWidth="3" />
        </svg>
      );
    case "mug":
      return (
        <svg viewBox="0 0 80 78" className="h-full w-full">
          <path d="M16 18h42v45c0 8-7 12-21 12S16 71 16 63z" fill="#f8fafc" stroke="#111827" strokeWidth="4" />
          <path d="M57 28h7c9 0 10 23 0 23h-7" fill="none" stroke="#111827" strokeWidth="5" />
          <path d="M18 31h38" stroke="#60a5fa" strokeWidth="7" />
        </svg>
      );
    case "plant":
      return (
        <svg viewBox="0 0 86 92" className="h-full w-full">
          <path d="M28 47h30l-5 38H33z" fill="#fb923c" stroke="#111827" strokeWidth="4" />
          <path d="M26 47h34" stroke="#111827" strokeWidth="6" strokeLinecap="round" />
          <path d="M43 49C22 37 25 18 43 31c18-16 25 4 2 18z" fill="#22c55e" stroke="#111827" strokeWidth="4" />
          <path d="M43 49c-8-26 17-34 20-12 17-3 18 17-2 18z" fill="#16a34a" stroke="#111827" strokeWidth="4" />
        </svg>
      );
    case "books":
      return (
        <svg viewBox="0 0 90 74" className="h-full w-full">
          <rect x="12" y="45" width="62" height="16" fill="#ef4444" stroke="#111827" strokeWidth="4" />
          <rect x="18" y="29" width="58" height="16" fill="#2563eb" stroke="#111827" strokeWidth="4" />
          <rect x="10" y="13" width="66" height="16" fill="#f59e0b" stroke="#111827" strokeWidth="4" />
          <path d="M25 17v8M33 33v8M30 49v8" stroke="#fef3c7" strokeWidth="3" />
        </svg>
      );
    case "portrait":
      return (
        <svg viewBox="0 0 76 88" className="h-full w-full">
          <rect x="12" y="8" width="52" height="70" fill="#92400e" stroke="#111827" strokeWidth="4" />
          <rect x="20" y="16" width="36" height="54" fill="#bfdbfe" stroke="#111827" strokeWidth="3" />
          <circle cx="38" cy="36" r="10" fill="#86efac" stroke="#111827" strokeWidth="3" />
          <path d="M26 61c5-13 20-13 25 0" fill="#4ade80" stroke="#111827" strokeWidth="3" />
        </svg>
      );
    case "chalice":
      return (
        <svg viewBox="0 0 84 86" className="h-full w-full">
          <path d="M23 10h38v18c0 14-8 22-19 22S23 42 23 28z" fill="#facc15" stroke="#111827" strokeWidth="4" />
          <path d="M42 50v19M25 73h34" stroke="#111827" strokeWidth="7" strokeLinecap="round" />
          <path d="M23 18H9c0 18 8 25 20 23M61 18h14c0 18-8 25-20 23" fill="none" stroke="#111827" strokeWidth="4" />
        </svg>
      );
    case "rune":
      return (
        <svg viewBox="0 0 80 76" className="h-full w-full">
          <path d="M23 9l35 6 13 29-22 25-34-6L7 28z" fill="#475569" stroke="#111827" strokeWidth="4" />
          <path d="M37 20l-8 21h13l-6 17 17-26H40z" fill="#7dd3fc" stroke="#bae6fd" strokeWidth="3" />
        </svg>
      );
    case "mouse":
      return (
        <svg viewBox="0 0 92 56" className="h-full w-full">
          <ellipse cx="42" cy="32" rx="28" ry="16" fill="#cbd5e1" stroke="#111827" strokeWidth="4" />
          <circle cx="66" cy="27" r="9" fill="#cbd5e1" stroke="#111827" strokeWidth="4" />
          <circle cx="69" cy="25" r="2" fill="#111827" />
          <path d="M15 34C3 26 4 17 15 14" fill="none" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
          <path d="M64 36l11 7" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "cauldron":
      return (
        <svg viewBox="0 0 94 82" className="h-full w-full">
          <path d="M18 31h58l-8 36c-2 9-9 13-21 13s-19-4-21-13z" fill="#334155" stroke="#111827" strokeWidth="4" />
          <path d="M20 31c5-14 50-14 56 0" fill="#64748b" stroke="#111827" strokeWidth="4" />
          <path d="M15 39H7M79 39h8" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
          <circle cx="36" cy="25" r="5" fill="#86efac" />
          <circle cx="51" cy="22" r="4" fill="#bbf7d0" />
          <path d="M30 13c5-8 2-10 9-15M53 13c7-6 2-11 10-16" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "tax-code":
      return (
        <svg viewBox="0 0 90 78" className="h-full w-full">
          <rect x="15" y="12" width="56" height="54" rx="3" fill="#0f766e" stroke="#111827" strokeWidth="4" />
          <path d="M27 12v54" stroke="#fef3c7" strokeWidth="5" />
          <path d="M37 28h21M37 39h19M37 50h23" stroke="#ccfbf1" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 20l-7 46h49" fill="none" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "anvil":
      return (
        <svg viewBox="0 0 96 66" className="h-full w-full">
          <path d="M17 21h47c13 0 18-7 22-12v25c-8 1-16 4-22 11H30c-4 0-8-3-8-8V29h-5z" fill="#94a3b8" stroke="#111827" strokeWidth="4" />
          <path d="M35 45h22l6 14H29z" fill="#64748b" stroke="#111827" strokeWidth="4" />
          <path d="M23 58h46" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
          <path d="M28 28h32" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "safe":
      return (
        <svg viewBox="0 0 84 84" className="h-full w-full">
          <rect x="13" y="12" width="58" height="60" rx="7" fill="#475569" stroke="#111827" strokeWidth="4" />
          <rect x="23" y="22" width="38" height="40" rx="4" fill="#64748b" stroke="#111827" strokeWidth="3" />
          <circle cx="42" cy="42" r="12" fill="#cbd5e1" stroke="#111827" strokeWidth="4" />
          <path d="M42 30v24M30 42h24M34 34l16 16M50 34L34 50" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M60 26h5v32h-5" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "government-urn":
      return (
        <svg viewBox="0 0 104 116" className="h-full w-full">
          <path d="M34 7h36v16c0 7-5 12-12 14v5c18 6 29 23 26 45-2 17-14 25-32 25s-30-8-32-25c-3-22 8-39 26-45v-5c-7-2-12-7-12-14z" fill="#e5e7eb" stroke="#111827" strokeWidth="5" />
          <path d="M31 22h42M25 83c12 8 42 8 54 0" stroke="#9ca3af" strokeWidth="5" strokeLinecap="round" />
          <path d="M31 54h42v26H31z" fill="#fef3c7" stroke="#111827" strokeWidth="3" />
          <text
            x="52"
            y="66"
            textAnchor="middle"
            fontSize="6.5"
            fontWeight="900"
            fill="#111827"
            textLength="35"
            lengthAdjust="spacingAndGlyphs"
          >
            {governmentLabel}
          </text>
          <path d="M23 51c-12 2-14 20-1 25M81 51c12 2 14 20 1 25" fill="none" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
  }
}

function CandyConfetti() {
  const candies = [
    "🍭", "🍬", "🍥", "🍡", "🍭", "🍬", "🍥", "🍡", "🍭", "🍬", "🍥", "🍡",
    "🍭", "🍬", "🍥", "🍡", "🍭", "🍬", "🍥", "🍡", "🍭", "🍬", "🍥", "🍡",
    "🍭", "🍬", "🍥", "🍡", "🍭", "🍬", "🍥", "🍡",
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden" aria-hidden="true">
      {candies.map((candy, index) => (
        <span
          key={`${candy}-${index}`}
          className="absolute animate-[pushy-candy-fall_3800ms_cubic-bezier(.16,.68,.24,1)_infinite] text-4xl saturate-150 drop-shadow-[0_3px_0_#ffffff] sm:text-5xl"
          style={{
            left: `${(index * 37) % 100}%`,
            animationDelay: `-${240 + (index % 8) * 430}ms`,
            animationDuration: `${3300 + (index % 5) * 360}ms`,
            transform: `rotate(${index * 23}deg)`,
          }}
        >
          {candy}
        </span>
      ))}
    </div>
  );
}

function Cat({
  level,
  pawing,
  victory = false,
}: {
  level: number;
  pawing: boolean;
  victory?: boolean;
}) {
  const bulk = Math.min(1.38, 1 + (level - 1) * 0.055);
  const muscle = Math.min(1, (level - 1) / 5);
  const bicepRx = 18 + muscle * 22;
  const bicepRy = 13 + muscle * 17;
  const forearmRx = 29 + muscle * 10;
  const forearmRy = 11 + muscle * 4;
  const veinOpacity = muscle <= 0 ? 0 : 0.3 + muscle * 0.55;
  const veinWidth = 1.2 + muscle * 2.4;
  return (
    <svg viewBox="0 0 260 190" className="h-full w-full overflow-visible" aria-hidden="true">
      <g transform={`translate(36 20) scale(${bulk})`}>
        <ellipse cx="82" cy="98" rx="70" ry="48" fill="#f6b35f" stroke="#111827" strokeWidth="5" />
        <path d="M41 70c28 24 72 24 100 0 0 30-20 53-50 53S41 100 41 70z" fill="#ffe3b3" opacity="0.85" />
        {victory && (
          <g strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M44 78c17 14 59 14 76 0M57 94c13 8 37 8 50 0"
              fill="none"
              stroke="#ffe3b3"
              strokeWidth="5"
              opacity="0.55"
            />
            <path
              d="M82 76v42M66 89c8 10 24 10 32 0"
              fill="none"
              stroke="#111827"
              strokeWidth="3"
              opacity="0.42"
            />
          </g>
        )}
        <path d="M19 93c-25 13-16 45 17 36" fill="none" stroke="#f6b35f" strokeWidth="18" strokeLinecap="round" />
        <path d="M19 93c-25 13-16 45 17 36" fill="none" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
        {victory && (
          <g transform="translate(39 58) rotate(-72) scale(-1 1)">
            <ellipse
              cx="-13"
              cy="-2"
              rx={bicepRx * 1.08}
              ry={bicepRy * 1.02}
              fill="#f6b35f"
              stroke="#111827"
              strokeWidth="5"
            />
            <ellipse
              cx="16"
              cy="-37"
              rx={forearmRx * 0.82}
              ry={forearmRy * 1.1}
              fill="#f6b35f"
              stroke="#111827"
              strokeWidth="5"
              transform="rotate(-84 16 -37)"
            />
            <ellipse cx="18" cy="-67" rx="17" ry="14" fill="#ffe3b3" stroke="#111827" strokeWidth="4" />
            <path
              d={`M-${28 + muscle * 5} ${-8 - muscle * 5}c${10 + muscle * 9}-${7 + muscle * 9} ${28 + muscle * 8}-${3 + muscle * 4} ${35 + muscle * 2} 2`}
              fill="none"
              stroke="#ffe3b3"
              strokeWidth={3 + muscle * 2}
              strokeLinecap="round"
              opacity={0.48 + muscle * 0.2}
            />
          </g>
        )}
        {victory && (
          <g transform="translate(125 58) rotate(72)">
            <ellipse
              cx="-13"
              cy="-2"
              rx={bicepRx * 1.08}
              ry={bicepRy * 1.02}
              fill="#f6b35f"
              stroke="#111827"
              strokeWidth="5"
            />
            <ellipse
              cx="16"
              cy="-37"
              rx={forearmRx * 0.82}
              ry={forearmRy * 1.1}
              fill="#f6b35f"
              stroke="#111827"
              strokeWidth="5"
              transform="rotate(-84 16 -37)"
            />
            <ellipse cx="18" cy="-67" rx="17" ry="14" fill="#ffe3b3" stroke="#111827" strokeWidth="4" />
            <path
              d={`M-${28 + muscle * 5} ${-8 - muscle * 5}c${10 + muscle * 9}-${7 + muscle * 9} ${28 + muscle * 8}-${3 + muscle * 4} ${35 + muscle * 2} 2`}
              fill="none"
              stroke="#ffe3b3"
              strokeWidth={3 + muscle * 2}
              strokeLinecap="round"
              opacity={0.48 + muscle * 0.2}
            />
          </g>
        )}
        <g transform={victory ? "translate(84 8)" : "translate(94 19)"}>
          {level >= 20 && (
            <g stroke="#111827" strokeLinecap="round" strokeLinejoin="round">
              <path
                d="M-18 -6L-9 -39 0 -7 9 -43 17 -7 27 -36 30 -3"
                fill="none"
                strokeWidth="12"
              />
              <path
                d="M-18 -6L-9 -39 0 -7 9 -43 17 -7 27 -36 30 -3"
                fill="none"
                stroke="#ec4899"
                strokeWidth="7"
              />
              <path
                d="M-9 -36l7 24M9 -40l6 26M27 -33l1 22"
                fill="none"
                stroke="#fef08a"
                strokeWidth="2.5"
                opacity="0.8"
              />
            </g>
          )}
          <path d="M-30 12l-7-28 25 14z" fill="#f6b35f" stroke="#111827" strokeWidth="5" />
          <path d="M34 12l10-28-27 13z" fill="#f6b35f" stroke="#111827" strokeWidth="5" />
          <circle cx="3" cy="31" r="42" fill="#f6b35f" stroke="#111827" strokeWidth="5" />
          <ellipse cx="-10" cy="43" rx="20" ry="15" fill="#ffe3b3" />
          <ellipse cx="16" cy="43" rx="20" ry="15" fill="#ffe3b3" />
          {level >= 10 && (
            <>
              <path
                d="M-34 11C-18 20 5 21 41 13"
                fill="none"
                stroke="#111827"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <ellipse
                cx="-12"
                cy="24"
                rx="11"
                ry="9"
                fill="#111827"
                stroke="#111827"
                strokeWidth="3"
              />
              <path
                d="M-19 20c4-5 11-5 16 0"
                fill="none"
                stroke="#374151"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </>
          )}
          <circle cx="-12" cy="24" r="4" fill="#111827" />
          <circle cx="17" cy="24" r="4" fill="#111827" />
          <path d="M2 34l-5 5h10z" fill="#fb7185" stroke="#111827" strokeWidth="2" />
          <path d="M-18 2l7 9M24 2l-8 9" stroke="#d97706" strokeWidth="4" strokeLinecap="round" />
        </g>
        {!victory && (
          <g
            className="transition-transform duration-100"
            style={{
              transform: pawing
                ? "translate(128px, 72px) rotate(-6deg)"
                : "translate(88px, 86px) rotate(8deg)",
            }}
          >
            <ellipse
              cx="-15"
              cy="-3"
              rx={bicepRx}
              ry={bicepRy}
              fill="#f6b35f"
              stroke="#111827"
              strokeWidth="5"
            />
            <ellipse
              cx="3"
              cy="2"
              rx={forearmRx}
              ry={forearmRy}
              fill="#f6b35f"
              stroke="#111827"
              strokeWidth="5"
            />
            <path
              d={`M-${28 + muscle * 8} ${-2 - muscle * 8}c${12 + muscle * 9}-${9 + muscle * 10} ${31 + muscle * 12}-${6 + muscle * 7} ${42 + muscle * 3} 3`}
              fill="none"
              stroke="#ffe3b3"
              strokeWidth={3 + muscle * 2}
              strokeLinecap="round"
              opacity={0.42 + muscle * 0.18}
            />
            <path
              d={`M-${25 + muscle * 4} ${8 + muscle * 4}c${9 + muscle * 8} ${7 + muscle * 8} ${27 + muscle * 8} ${8 + muscle * 3} ${39 + muscle * 4}-1`}
              fill="none"
              stroke="#c96b28"
              strokeWidth={2 + muscle * 2}
              strokeLinecap="round"
              opacity={0.2 + muscle * 0.35}
            />
            {muscle > 0 && (
              <g
                fill="none"
                stroke="#38bdf8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={veinWidth}
                opacity={veinOpacity}
              >
                <path d={`M-${30 + muscle * 8} ${-8 - muscle * 7}c9 ${-4 - muscle * 4} 17 ${1 + muscle * 2} 25-5`} />
                <path d={`M-${18 + muscle * 5} ${-9 - muscle * 5}l-${6 + muscle * 4}-${8 + muscle * 5}`} />
                <path d={`M-${15 + muscle * 4} ${-7 - muscle * 4}l${8 + muscle * 5}-${7 + muscle * 4}`} />
                <path d={`M-${25 + muscle * 6} ${3 + muscle * 2}c8 ${-3 - muscle * 3} 18 2 27-4`} />
                <path d={`M-${12 + muscle * 3} ${2 + muscle}l-${5 + muscle * 3} ${8 + muscle * 3}`} />
                <path d={`M-${9 + muscle * 2} ${1}l${7 + muscle * 4} ${6 + muscle * 3}`} />
              </g>
            )}
            <ellipse cx="25" cy="1" rx="18" ry="15" fill="#ffe3b3" stroke="#111827" strokeWidth="4" />
            <path d="M18 7l4 5M28 7l2 6M38 5v6" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
      </g>
    </svg>
  );
}

export default function PushyPawsPage() {
  const { t } = useTranslation();
  const [snapshot] = useState(() =>
    consumeShareSnapshot<ShareState>(MODULE_ID, SHARE_VERSION)
  );
  const gameCardRef = useMobileGameFit<HTMLElement>({ align: "top" });
  const [pushed, setPushed] = useState(snapshot?.pushed ?? 0);
  const [score, setScore] = useState(snapshot?.score ?? 0);
  const [item, setItem] = useState<ActiveItem>(() =>
    makeActive(levelFor(snapshot?.pushed ?? 0))
  );
  const [pawing, setPawing] = useState(false);
  const [shake, setShake] = useState(false);
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState(
    snapshot ? PUSHY_PAWS_MESSAGES[0] : PUSHY_PAWS_MESSAGES[1]
  );
  const pawTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const victoryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const level = levelFor(pushed);
  const strength = strengthFor(level);
  const progressPct = Math.min(100, (item.progress / item.weight) * 100);
  const pushLabel =
    item.points < 0
      ? t("{points} chaos", { points: item.points })
      : t("+{points} chaos", { points: item.points });

  const nextItem = (previous: ShelfItem, nextLevel: number) => {
    const next = makeActive(nextLevel, previous.id);
    if (next.boss) {
      preloadVictoryMusic();
      setMessage(PUSHY_PAWS_MESSAGES[6]);
    }
    setItem(next);
  };

  const restart = () => {
    if (victoryTimer.current) {
      clearTimeout(victoryTimer.current);
      victoryTimer.current = null;
    }
    stopVictoryMusic();
    setPushed(0);
    setScore(0);
    setWon(false);
    setShake(false);
    setPawing(false);
    setMessage(PUSHY_PAWS_MESSAGES[1]);
    setItem(makeActive(1));
  };

  const swat = () => {
    if (item.falling || won) return;
    playTap(strength);
    setPawing(true);
    if (pawTimer.current) clearTimeout(pawTimer.current);
    pawTimer.current = setTimeout(() => setPawing(false), 130);

    const shove = item.boss ? strength : strength * (0.75 + Math.random() * 0.35);
    const nextProgress = item.progress + shove;
    if (nextProgress < item.weight) {
      setItem((current) => ({
        ...current,
        progress: Math.min(current.weight - 1, current.progress + shove),
      }));
      setMessage(t("{item} scoots closer to doom.", { item: t(item.short) }));
      return;
    }

    const nextPushed = pushed + 1;
    const nextLevel = levelFor(nextPushed);
    setItem((current) => ({ ...current, progress: current.weight, falling: true }));
    setPushed(nextPushed);
    setScore((n) => Math.max(0, n + item.points));
    trackStat(MODULE_ID, "pushed");
    const soundKind = soundKindFor(item);
    playFall(soundKind);
    window.setTimeout(() => playBreak(soundKind), FALL_SOUND_MS);
    setMessage(messageFor(item));
    if (item.kind === "rune" || item.boss) {
      setShake(true);
      setTimeout(() => setShake(false), 420);
    }
    if (item.boss) {
      trackStat(MODULE_ID, "wins");
      victoryTimer.current = window.setTimeout(() => {
        playVictoryMusic();
        setWon(true);
        setMessage(PUSHY_PAWS_MESSAGES[8]);
      }, FALL_SOUND_MS + 1000);
      return;
    }
    if (nextLevel > level) playLevelUp();
    window.setTimeout(() => nextItem(item, nextLevel), FALL_SOUND_MS + 360);
  };

  const shareState = useMemo(
    () => () => ({ pushed, score, level }),
    [pushed, score, level]
  );

  useEffect(() => {
    return () => {
      if (pawTimer.current) clearTimeout(pawTimer.current);
      if (victoryTimer.current) clearTimeout(victoryTimer.current);
      stopVictoryMusic();
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 py-3 sm:gap-5 sm:px-4 sm:py-6">
      <header className="grid gap-bento sm:grid-cols-[1fr_1fr]">
        <div className="rounded-neobrutal border-thick border-brand-border bg-brand-secondary p-5 shadow-neo-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-neobrutal border-thin border-brand-border bg-brand-background px-3 py-1 text-xs font-bold uppercase shadow-neo-sm">
            🐾 {t("Pushy Paws")}
          </div>
          <h1 className="font-heading text-4xl uppercase leading-none text-brand-text sm:text-5xl">
            {t("Knock it off")}
          </h1>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-neobrutal border-thick border-brand-border bg-brand-surface p-5 shadow-neo-lg">
          <p className="text-sm font-bold leading-relaxed">
            {t(
              "Tap the objects once for each cat swat. Heavier targets need more paws — shove them off the shelf to rack up chaos and level up your increasingly buff cat."
            )}
          </p>
        </div>
      </header>

      <section
        ref={gameCardRef}
        className={`relative min-h-[430px] overflow-hidden rounded-neobrutal border-thick border-brand-border bg-[#dff3ff] shadow-neo-lg sm:min-h-[520px] ${shake ? "brainrot-expired-alert" : ""}`}
      >
        <div className="absolute inset-0 bg-[linear-gradient(#ffffff_1px,transparent_1px),linear-gradient(90deg,#ffffff_1px,transparent_1px)] bg-[size:42px_42px] opacity-35" />
        <div className="absolute left-0 right-0 top-6 h-20 bg-[#fef3c7] shadow-[0_6px_0_#111827] sm:top-10 sm:h-24" />
        <div className="absolute left-0 right-0 top-[186px] h-12 border-y-thick border-brand-border bg-[#b7794f] sm:top-[216px] sm:h-14" />
        <div className="absolute left-0 right-0 top-[228px] h-8 bg-[#7c4a32] sm:top-[264px] sm:h-9" />

        <button
          key={item.nonce}
          type="button"
          onClick={swat}
          className={`absolute z-50 touch-manipulation select-none transition-transform duration-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary ${
            item.boss
              ? "top-[110px] h-[13.77rem] w-[13.77rem] sm:top-[126px] sm:h-[17.2125rem] sm:w-[17.2125rem]"
              : "top-[158px] h-24 w-24 sm:top-[186px] sm:h-28 sm:w-28"
          } ${
            item.falling ? "pointer-events-none animate-[pushy-fall_760ms_ease-in_forwards]" : "hover:scale-105 active:scale-95"
          }`}
          style={{
            left: `${item.x + progressPct * 0.12}%`,
            transform: `translate(-50%, -50%) rotate(${progressPct / 5}deg)`,
          }}
          aria-label={t("Swat {item}", { item: t(item.name) })}
        >
          <ItemArt item={item} governmentLabel={t("Government")} />
        </button>

        <div className="absolute left-[-24px] top-[16px] z-30 h-[210px] w-[235px] sm:left-[-10px] sm:top-[24px] sm:h-[275px] sm:w-[340px]">
          <Cat level={level} pawing={pawing} victory={won} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-12 border-t-thick border-brand-border bg-[#5b3a29] sm:h-16" />
        <div className="absolute bottom-3 right-2 z-40 w-[min(82vw,350px)] sm:bottom-4 sm:right-4 sm:w-[390px]">
          <Card className="bg-brand-background/95 p-2.5 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-brand-muted">
                  {t("Current target")}
                </p>
                <h2 className="truncate font-heading text-base leading-tight sm:text-xl">
                  {t(item.name)}
                </h2>
                <p className="mt-0.5 text-xs font-bold sm:mt-1 sm:text-sm">
                  {t("{points} / weight {weight}", {
                    points: pushLabel,
                    weight: item.weight,
                  })}
                </p>
              </div>
              <div className="shrink-0 rounded-neobrutal border-thin border-brand-border bg-brand-warning px-2 py-0.5 text-xs font-bold sm:px-3 sm:py-1 sm:text-sm">
                {t("Lv {level}", { level })}
              </div>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-neobrutal border-thin border-brand-border bg-white sm:mt-3 sm:h-5">
              <div className="h-full bg-brand-primary transition-[width] duration-100" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="mt-2 min-h-8 text-xs font-bold leading-snug sm:mt-3 sm:min-h-10 sm:text-sm">
              {t(message)}
            </p>
          </Card>
        </div>

        {won && (
          <>
            <CandyConfetti />
            <div className="absolute inset-0 z-50 bg-brand-text/10">
              <Card className="absolute bottom-3 right-2 w-[min(82vw,350px)] bg-brand-background p-5 text-center shadow-neo-lg sm:bottom-4 sm:right-4 sm:w-[390px]">
                <p className="font-heading text-3xl uppercase leading-none text-brand-text sm:text-4xl">
                  {t("You win")}
                </p>
                <p className="mt-3 text-sm font-bold leading-relaxed">
                  {t("Government has been toppled!")}
                </p>
                <button
                  type="button"
                  onClick={restart}
                  className="mt-4 rounded-neobrutal border-thick border-brand-border bg-brand-primary px-4 py-2 font-heading text-lg uppercase text-brand-text shadow-neo-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {t("I'll do it again 😼")}
                </button>
              </Card>
            </div>
          </>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <MuteButton />
        <ShareButton moduleId={MODULE_ID} version={SHARE_VERSION} getState={shareState} />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="p-2.5 sm:p-4">
          <p className="text-xs font-bold uppercase text-brand-muted">{t("Pushed off")}</p>
          <p className="font-heading text-2xl sm:text-3xl">{pushed}</p>
        </Card>
        <Card className="p-2.5 sm:p-4">
          <p className="text-xs font-bold uppercase text-brand-muted">{t("Chaos score")}</p>
          <p className="font-heading text-2xl sm:text-3xl">{score}</p>
        </Card>
        <Card className="p-2.5 sm:p-4">
          <p className="text-xs font-bold uppercase text-brand-muted">{t("Paw power")}</p>
          <p className="font-heading text-2xl sm:text-3xl">{strength}</p>
        </Card>
      </div>

      <style>{`
        @keyframes pushy-fall {
          0% { opacity: 1; }
          45% { transform: translate(-50%, -50%) translateY(120px) rotate(42deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) translateY(430px) rotate(130deg); opacity: 0; }
        }
        @keyframes pushy-candy-fall {
          0% { opacity: 1; top: -16%; filter: brightness(1.2) saturate(1.5); transform: translateY(0) rotate(0deg) scale(0.82); }
          14% { opacity: 1; }
          82% { opacity: 1; }
          100% { opacity: 0; top: 105%; filter: brightness(1.28) saturate(1.65); transform: translateY(60px) rotate(420deg) scale(1.18); }
        }
      `}</style>
    </div>
  );
}
