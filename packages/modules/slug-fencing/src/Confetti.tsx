/**
 * Hand-rolled confetti for the victory screen — no external dependency, in
 * keeping with the suite's zero-heavy-deps ethos. Renders a burst of falling,
 * spinning paper using a single injected keyframe.
 */
import { useMemo } from "react";

const COLORS = [
  "#22C55E",
  "#EC4899",
  "#FACC15",
  "#3B82F6",
  "#A855F7",
  "#F97316",
];

interface ConfettiProps {
  /** Number of pieces. Keep modest on mobile. */
  count?: number;
}

export function Confetti({ count = 90 }: ConfettiProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.8,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 360,
        drift: Math.random() * 60 - 30,
      })),
    [count]
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <style>{CONFETTI_KEYFRAMES}</style>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: "-12px",
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `slugConfettiFall ${p.duration}s linear ${p.delay}s forwards`,
            ["--slug-confetti-drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

const CONFETTI_KEYFRAMES = `
@keyframes slugConfettiFall {
  0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
  100% {
    transform: translate(var(--slug-confetti-drift, 0), 110vh) rotate(720deg);
    opacity: 0.9;
  }
}`;
