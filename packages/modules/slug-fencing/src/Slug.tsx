/**
 * The slug sprite, drawn in local coordinates (body centred at the origin,
 * facing right). Optional brainrot accessories ride along for the victory
 * celebration. Pure presentational SVG — no state, no engine coupling.
 */
import type { Accessory } from "./titles";

interface SlugProps {
  fill: string;
  shade: string;
  accessory?: Accessory | null;
}

export function Slug({ fill, shade, accessory = null }: SlugProps) {
  return (
    <>
      {/* Trail shadow on the ground */}
      <ellipse cx={-6} cy={26} rx={52} ry={8} fill="#00000020" />
      {/* Body */}
      <path
        d="M-54 8 Q-58 -14 -34 -16 Q-10 -18 6 -20 Q34 -24 46 -6 Q54 6 44 16 Q20 22 -10 22 Q-44 22 -54 8 Z"
        fill={fill}
        stroke="#1F2937"
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {/* Belly highlight */}
      <path
        d="M-44 14 Q-6 20 38 12"
        fill="none"
        stroke={shade}
        strokeWidth={5}
        strokeLinecap="round"
        opacity={0.7}
      />
      {accessory === "chain" ? <GoldChain /> : null}
      {/* Head bump */}
      <circle cx={42} cy={-2} r={16} fill={fill} stroke="#1F2937" strokeWidth={4} />
      {/* Eye stalks */}
      <g stroke="#1F2937" strokeWidth={3.5} strokeLinecap="round">
        <line x1={46} y1={-14} x2={52} y2={-34} />
        <line x1={36} y1={-14} x2={40} y2={-32} />
      </g>
      <circle cx={53} cy={-37} r={5.5} fill="#fff" stroke="#1F2937" strokeWidth={2.5} />
      <circle cx={41} cy={-35} r={5.5} fill="#fff" stroke="#1F2937" strokeWidth={2.5} />
      <circle cx={54} cy={-37} r={2.2} fill="#1F2937" />
      <circle cx={42} cy={-35} r={2.2} fill="#1F2937" />
      {/* Mouth */}
      <path
        d="M48 6 Q54 8 56 4"
        fill="none"
        stroke="#1F2937"
        strokeWidth={3}
        strokeLinecap="round"
      />
      {accessory === "shades" ? <Shades /> : null}
      {accessory === "crown" ? <Crown /> : null}
    </>
  );
}

/** Sunglasses sitting over both eye-stalk tips. */
function Shades() {
  return (
    <g stroke="#1F2937" strokeWidth={2.5} strokeLinejoin="round">
      <rect x={36} y={-42} width={12} height={9} rx={2} fill="#111827" />
      <rect x={49} y={-42} width={12} height={9} rx={2} fill="#111827" />
      <line x1={48} y1={-38} x2={49} y2={-38} />
      <line x1={36} y1={-39} x2={31} y2={-40} />
    </g>
  );
}

/** Tiny goblin crown perched above the eyes. */
function Crown() {
  return (
    <g stroke="#1F2937" strokeWidth={2.5} strokeLinejoin="round">
      <path
        d="M34 -44 L37 -54 L42 -47 L47 -56 L52 -47 L57 -54 L60 -44 Z"
        fill="#FACC15"
      />
      <circle cx={47} cy={-52} r={1.8} fill="#EF4444" stroke="none" />
    </g>
  );
}

/** Gold chain across the body. */
function GoldChain() {
  return (
    <path
      d="M-34 6 Q-10 26 16 6"
      fill="none"
      stroke="#FACC15"
      strokeWidth={5}
      strokeLinecap="round"
      strokeDasharray="2 4"
    />
  );
}
