/**
 * Presentational screens for the Slug Duel state machine: mode select, solo &
 * multiplayer setup, the multiplayer lobby, the 3-2-1 countdown overlay, and
 * the victory screen. No engine or network coupling — everything arrives via
 * props so these stay easy to reason about and restyle.
 */
import { useState } from "react";
import { Confetti } from "./Confetti";
import { DIFFICULTY_ORDER, PERSONALITIES, type Difficulty } from "./personalities";
import type { Accessory } from "./titles";

export type Hand = "right" | "left";

const BTN =
  "rounded-neobrutal border-thin border-brand-border bg-brand-background px-3 py-1.5 text-sm font-bold shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed";
const BTN_PRIMARY =
  "rounded-neobrutal border-thick border-brand-border bg-brand-primary px-5 py-2.5 font-heading uppercase text-brand-text shadow-neo transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed disabled:opacity-50";

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-neobrutal border-thick border-brand-border bg-brand-surface p-6 shadow-neo-lg">
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`${BTN} ${active ? "!bg-brand-warning" : ""}`}
    >
      {children}
    </button>
  );
}

function HandToggle({ hand, onChange }: { hand: Hand; onChange: (h: Hand) => void }) {
    return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase text-brand-text">
        {"Dominant hand"}
      </p>
      <div className="flex gap-2">
        <Pill active={hand === "right"} onClick={() => onChange("right")}>
          🫱 {"Right"}
        </Pill>
        <Pill active={hand === "left"} onClick={() => onChange("left")}>
          🫲 {"Left"}
        </Pill>
      </div>
      <p className="mt-1 text-xs font-bold text-brand-text opacity-70">
        {"Your slug always fights on your dominant side."}
      </p>
    </div>
  );
}

function ScorePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
    const presets = [3, 5, 10];
  const isCustom = !presets.includes(value);
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase text-brand-text">
        {"Play to"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((n) => (
          <Pill key={n} active={value === n} onClick={() => onChange(n)}>
            {n}
          </Pill>
        ))}
        <Pill active={isCustom} onClick={() => onChange(7)}>
          {"Custom"}
        </Pill>
        {isCustom ? (
          <input
            type="number"
            min={1}
            max={50}
            value={value}
            onChange={(e) =>
              onChange(Math.max(1, Math.min(50, Number(e.target.value) || 1)))
            }
            className="w-20 rounded-neobrutal border-thin border-brand-border bg-brand-background px-2 py-1.5 text-sm font-bold shadow-neo-sm"
          />
        ) : null}
      </div>
    </div>
  );
}

export function ModeScreen({
  onSolo,
  onMultiplayer,
}: {
  onSolo: () => void;
  onMultiplayer: () => void;
}) {
    return (
    <Panel>
      <h2 className="mb-1 font-heading text-3xl uppercase text-brand-text">
        🐌 {"Slug Duel"}
      </h2>
      <p className="mb-5 text-sm font-bold text-brand-text opacity-80">
        {"Choose your mode"}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={onSolo} className={`${BTN_PRIMARY} !bg-brand-secondary`}>
          {"Solo"}
        </button>
        <button onClick={onMultiplayer} className={`${BTN_PRIMARY} !bg-brand-pink`}>
          {"Multiplayer"}
        </button>
      </div>
    </Panel>
  );
}

export function SoloSetupScreen({
  difficulty,
  setDifficulty,
  scoreToWin,
  setScoreToWin,
  hand,
  setHand,
  onStart,
  onBack,
}: {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  scoreToWin: number;
  setScoreToWin: (n: number) => void;
  hand: Hand;
  setHand: (h: Hand) => void;
  onStart: () => void;
  onBack: () => void;
}) {
    return (
    <Panel>
      <h2 className="mb-4 font-heading text-2xl uppercase text-brand-text">
        🐌 {"Solo Match"}
      </h2>
      <div className="mb-5">
        <p className="mb-2 text-xs font-bold uppercase text-brand-text">
          {"Difficulty"}
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {DIFFICULTY_ORDER.map((d) => {
            const p = PERSONALITIES[d];
            const active = difficulty === d;
            return (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`rounded-neobrutal border-thin border-brand-border p-3 text-left shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed ${
                  active ? "bg-brand-warning" : "bg-brand-background"
                }`}
              >
                <span className="block font-heading text-sm uppercase">
                  {p.emoji} {p.name}
                </span>
                <span className="mt-1 block text-xs font-bold opacity-75">
                  {p.blurb}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mb-5">
        <ScorePicker value={scoreToWin} onChange={setScoreToWin} />
      </div>
      <div className="mb-6">
        <HandToggle hand={hand} onChange={setHand} />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onBack} className={BTN}>
          ← {"Back"}
        </button>
        <button onClick={onStart} className={BTN_PRIMARY}>
          {"Start Match"}
        </button>
      </div>
    </Panel>
  );
}

export function MultiplayerSetupScreen({
  scoreToWin,
  setScoreToWin,
  hand,
  setHand,
  onCreate,
  onBack,
  creating,
  error,
}: {
  scoreToWin: number;
  setScoreToWin: (n: number) => void;
  hand: Hand;
  setHand: (h: Hand) => void;
  onCreate: () => void;
  onBack: () => void;
  creating: boolean;
  error: string | null;
}) {
    return (
    <Panel>
      <h2 className="mb-4 font-heading text-2xl uppercase text-brand-text">
        🐌🐌 {"Multiplayer Match"}
      </h2>
      <div className="mb-5">
        <ScorePicker value={scoreToWin} onChange={setScoreToWin} />
      </div>
      <div className="mb-6">
        <HandToggle hand={hand} onChange={setHand} />
      </div>
      {error ? (
        <p className="mb-4 rounded-neobrutal border-thin border-brand-border bg-brand-pink px-3 py-2 text-sm font-bold">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className={BTN}>
          ← {"Back"}
        </button>
        <button onClick={onCreate} disabled={creating} className={BTN_PRIMARY}>
          {creating ? "Creating…" : "Create Match"}
        </button>
      </div>
    </Panel>
  );
}

export function LobbyScreen({
  role,
  scoreToWin,
  guestJoined,
  joinUrl,
  hand,
  setHand,
  onCancel,
}: {
  role: "host" | "guest";
  scoreToWin: number;
  guestJoined: boolean;
  joinUrl: string;
  hand: Hand;
  setHand: (h: Hand) => void;
  onCancel: () => void;
}) {
    const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the link is still visible to copy manually */
    }
  };
  return (
    <Panel>
      <h2 className="mb-4 font-heading text-2xl uppercase text-brand-text">
        {"Slug Arena"}
      </h2>
      {role === "host" ? (
        <div className="mb-5">
          <p className="mb-2 text-xs font-bold uppercase text-brand-text">
            {"Share this link"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-all rounded-neobrutal border-thin border-brand-border bg-brand-background px-3 py-2 text-sm font-bold">
              {joinUrl}
            </code>
            <button onClick={copy} className={BTN}>
              {copied ? `✓ ${"Copied"}` : "Copy"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-5 grid gap-2">
        <PlayerRow label={"Host"} ready joined />
        <PlayerRow label={"Opponent"} ready={guestJoined} joined={guestJoined} />
        <p className="text-sm font-bold text-brand-text">
          {"Play to"}: <span className="bg-brand-secondary px-1">{scoreToWin}</span>
        </p>
      </div>

      <div className="mb-6">
        <HandToggle hand={hand} onChange={setHand} />
      </div>

      <p className="mb-4 text-sm font-bold text-brand-text">
        {guestJoined ? "Both slugs ready. Starting…" : "Waiting for opponent…"}
      </p>
      <button onClick={onCancel} className={BTN}>
        {"Leave Arena"}
      </button>
    </Panel>
  );
}

function PlayerRow({
  label,
  ready,
  joined,
}: {
  label: string;
  ready: boolean;
  joined: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-bold text-brand-text">
      <span>{joined ? "✓" : "⌛"}</span>
      <span>{label}</span>
      <span className="opacity-70">{ready ? "" : ""}</span>
    </div>
  );
}

export function CountdownOverlay({ count }: { count: number }) {
    const label = count > 0 ? String(count) : "SLUG!";
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <span
        key={count}
        className="font-heading text-7xl uppercase text-brand-text drop-shadow-[4px_4px_0_rgba(0,0,0,0.2)]"
        style={{ animation: "slugCountPop 0.5s ease-out" }}
      >
        {label}
      </span>
      <style>{`@keyframes slugCountPop{0%{transform:scale(0.4);opacity:0}40%{transform:scale(1.15);opacity:1}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

export function VictoryScreen({
  youWon,
  title,
  aura,
  score1,
  score2,
  youAreP1,
  isMultiplayer,
  rematchPending,
  opponentWantsRematch,
  onRematch,
  onNewMatch,
  showConfetti = true,
}: {
  youWon: boolean;
  title: string;
  accessory: Accessory;
  aura: number;
  score1: number;
  score2: number;
  youAreP1: boolean;
  isMultiplayer: boolean;
  rematchPending: boolean;
  opponentWantsRematch: boolean;
  onRematch: () => void;
  onNewMatch: () => void;
  showConfetti?: boolean;
}) {
    const yourScore = youAreP1 ? score1 : score2;
  const theirScore = youAreP1 ? score2 : score1;
  return (
    <div className="relative overflow-hidden">
      {youWon && showConfetti ? <Confetti /> : null}
      <Panel>
        <div className="relative text-center">
          {youWon ? (
            <>
              <p className="font-heading text-4xl uppercase text-brand-text">
                🏆 {title} 🏆
              </p>
              <p className="mt-2 text-sm font-bold text-brand-text">
                {"Your slug has ascended."}
              </p>
              <p className="mt-1 font-heading text-2xl uppercase text-brand-primary">
                +{aura.toLocaleString()} {"Aura"}
              </p>
            </>
          ) : (
            <>
              <p className="font-heading text-3xl uppercase text-brand-text">
                {"Defeated"} 🏋️
              </p>
              <p className="mt-2 text-sm font-bold text-brand-text">
                {"Your slug will train harder. Here's a tiny dumbbell."}
              </p>
            </>
          )}
          <p className="mt-4 font-heading text-5xl leading-none text-brand-text">
            {yourScore} <span className="opacity-40">–</span> {theirScore}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button onClick={onRematch} disabled={rematchPending} className={BTN_PRIMARY}>
              {rematchPending ? "Waiting for opponent…" : "Rematch"}
            </button>
            <button onClick={onNewMatch} className={BTN}>
              {"New Match"}
            </button>
          </div>
          {isMultiplayer && opponentWantsRematch && !rematchPending ? (
            <p className="mt-3 text-sm font-bold text-brand-secondary">
              {"Opponent wants a rematch!"}
            </p>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
