import { useEffect, useRef, useState } from "react";
import {
  Card,
  MuteButton,
  ShareButton,
  consumeShareSnapshot,
  trackStat,
  useMobileGameFit,
} from "@scroll-goblin/ui";
import {
  CHAPTERS,
  H,
  INK_COOLDOWN_MS,
  W,
  clamp,
  createWorld,
  setupChapter,
  stepWorld,
  tryInk,
  type Creature,
  type Stats,
  type World,
} from "./engine";
import { drawWorld } from "./draw";
import {
  playChapter,
  playDeath,
  playEat,
  playHatch,
  playHeart,
  playHurt,
  playInk,
  playPickup,
} from "./sounds";

const MODULE_ID = "life-of-an-octopus";
const SHARE_VERSION = 1;

type View = "intro" | "playing" | "chapterCard" | "ending" | "dead" | "complete";

type ShareState = Stats;

const STAT_LABELS: [keyof Stats, string][] = [
  ["ageReached", "Age Reached"],
  ["predatorsEscaped", "Predators Escaped"],
  ["preyCaught", "Prey Caught"],
  ["densBuilt", "Dens Built"],
  ["eggsProtected", "Eggs Protected"],
  ["inkUsed", "Times Inked"],
];

export default function LifeOfAnOctopusPage() {
  const gameCardRef = useMobileGameFit<HTMLDivElement>({ align: "top" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>(createWorld());

  // HUD elements updated imperatively each frame (kept out of React state).
  const healthRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLDivElement>(null);
  const ageRef = useRef<HTMLSpanElement>(null);
  const camoRef = useRef<HTMLSpanElement>(null);

  // Input state lives in refs so the rAF loop reads fresh values.
  const displaying = useRef(false);
  const keys = useRef<Set<string>>(new Set());
  const gesture = useRef({ x: 0, y: 0, t: 0, moved: false });

  const shared = useRef(
    consumeShareSnapshot<ShareState>(MODULE_ID, SHARE_VERSION)
  ).current;

  const [view, setView] = useState<View>(shared ? "complete" : "intro");
  const [chapterIdx, setChapterIdx] = useState(0);
  const [message, setMessage] = useState("");
  const [finalStats, setFinalStats] = useState<Stats | null>(shared ?? null);
  const [showDisplayHint, setShowDisplayHint] = useState(false);

  // View kept in a ref so the loop branches without re-subscribing.
  const viewRef = useRef<View>(view);
  viewRef.current = view;
  const endStart = useRef(0);
  const lastSiblingSound = useRef(0);

  const setMsg = (m: string) => setMessage(m);

  /* --- transitions --- */
  const beginLife = () => {
    world.current = createWorld();
    setFinalStats(null);
    startChapter(0);
  };

  const startChapter = (idx: number) => {
    setupChapter(world.current, idx, performance.now());
    setChapterIdx(idx);
    setShowDisplayHint(idx === 4);
    setView("playing");
    setMsg(CHAPTERS[idx].goal);
  };

  const advanceFromChapter = (completed: number) => {
    if (completed >= CHAPTERS.length - 1) {
      beginEnding();
    } else {
      setChapterIdx(completed + 1);
      setView("chapterCard");
      playChapter();
    }
  };

  const beginEnding = () => {
    const wld = world.current;
    wld.phase = "ending";
    endStart.current = performance.now();
    // Hatch a cloud of babies from the eggs.
    const eggs = wld.creatures.find((c) => c.kind === "egg");
    const ex = eggs ? eggs.x : wld.den.x;
    const ey = eggs ? eggs.y : wld.den.y;
    for (let i = 0; i < 36; i++) {
      const baby: Creature = {
        id: 10000 + i,
        kind: "baby",
        x: ex + (Math.random() - 0.5) * 60,
        y: ey + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 20,
        vy: -(20 + Math.random() * 40),
        r: 3 + Math.random() * 2,
        baseSpeed: 0,
        behavior: "wander",
        detect: 0,
        alive: true,
        hue: 200,
        wobble: Math.random() * 6,
        dirX: 1,
        stun: 0,
        tx: 0,
        ty: 0,
        species: "Hatchling",
      };
      wld.creatures.push(baby);
    }
    setView("ending");
    setMsg("Your eggs are hatching...");
    playHatch();
    setTimeout(() => playDeath(), 1800);
  };

  const finishLife = () => {
    setFinalStats({ ...world.current.stats });
    setView("complete");
  };

  const die = () => {
    setFinalStats({ ...world.current.stats });
    setView("dead");
    playDeath();
  };

  /* --- main loop --- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const wld = world.current;
      const v = viewRef.current;

      if (v === "playing") {
        // Keyboard movement vector.
        let kx = 0;
        let ky = 0;
        const k = keys.current;
        if (k.has("a") || k.has("arrowleft")) kx -= 1;
        if (k.has("d") || k.has("arrowright")) kx += 1;
        if (k.has("w") || k.has("arrowup")) ky -= 1;
        if (k.has("s") || k.has("arrowdown")) ky += 1;
        wld.keyX = kx;
        wld.keyY = ky;

        if (displaying.current)
          wld.octo.flash = Math.min(1, wld.octo.flash + dt * 1.5);

        const ev = stepWorld(wld, dt, now);
        if (ev.hurt) playHurt();
        if (ev.ate) playEat();
        if (ev.pickup) playPickup();
        if (ev.siblingEaten && now - lastSiblingSound.current > 120) {
          lastSiblingSound.current = now;
          playEat();
        }
        if (ev.escaped) setMsg("It lost you in your camouflage.");
        if (ev.died) {
          die();
        } else if (ev.chapterComplete) {
          if (ev.heart) playHeart();
          advanceFromChapter(wld.chapter);
        }
      } else if (v === "ending") {
        // Babies drift upward; the parent fades.
        for (const c of wld.creatures) {
          if (c.kind !== "baby") continue;
          c.wobble += dt * 6;
          c.vy += -6 * dt;
          c.x += c.vx * dt + Math.sin(c.wobble) * 6 * dt;
          c.y += c.vy * dt;
        }
        wld.octo.health = Math.max(0, wld.octo.health - dt * 24);
        if (now - endStart.current > 6500) finishLife();
      }

      drawWorld(ctx, wld, now);
      updateHud(wld);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateHud(wld: World) {
    if (healthRef.current)
      healthRef.current.style.width = `${clamp(wld.octo.health, 0, 100)}%`;
    if (progressRef.current)
      progressRef.current.style.width = `${clamp(
        (wld.goalProgress / wld.goalTarget) * 100,
        0,
        100
      )}%`;
    if (inkRef.current) {
      const remain = Math.max(0, wld.inkReadyAt - performance.now());
      inkRef.current.style.width = `${100 - (remain / INK_COOLDOWN_MS) * 100}%`;
    }
    if (ageRef.current) ageRef.current.textContent = `${wld.age}`;
    if (camoRef.current)
      camoRef.current.style.opacity = wld.octo.camo > 0.5 ? "1" : "0";
  }

  /* --- pointer input (canvas coords) --- */
  const toCanvas = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * W,
      y: ((clientY - rect.top) / rect.height) * H,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toCanvas(e.clientX, e.clientY);
    world.current.target = { x: p.x, y: p.y, active: true };
    const g = gesture.current;
    if (Math.abs(e.clientX - g.x) > 14 || Math.abs(e.clientY - g.y) > 14)
      g.moved = true;
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== "touch") {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* non-fatal */
      }
    }
    const p = toCanvas(e.clientX, e.clientY);
    world.current.target = { x: p.x, y: p.y, active: true };
    gesture.current = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
  };
  const onPointerUp = () => {
    const g = gesture.current;
    if (!g.moved && performance.now() - g.t < 500) doInk();
    if (world.current.target) world.current.target.active = false;
  };
  const onPointerLeave = () => {
    if (world.current.target) world.current.target.active = false;
  };

  const doInk = () => {
    if (viewRef.current !== "playing") return;
    if (tryInk(world.current, performance.now())) {
      playInk();
      trackStat(MODULE_ID, "ink");
    }
  };

  /* --- keyboard --- */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key))
        e.preventDefault();
      if (key === " " || key === "f") doInk();
      else if (key === "e") displaying.current = true;
      else keys.current.add(key);
    };
    const up = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "e") displaying.current = false;
      keys.current.delete(key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chapter = CHAPTERS[chapterIdx];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-bento grid gap-bento sm:grid-cols-[1fr_1fr]">
        <div className="rounded-neobrutal border-thick border-brand-border bg-brand-secondary p-5 shadow-neo-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-neobrutal border-thin border-brand-border bg-brand-background px-3 py-1 text-xs font-bold uppercase shadow-neo-sm">
            🐙 Life of an Octopus
          </div>
          <h1 className="font-heading text-4xl uppercase leading-none text-brand-text sm:text-5xl">
            A whole life, in minutes
          </h1>
        </div>
        <p className="rounded-neobrutal border-thick border-brand-border bg-brand-surface p-5 text-sm font-bold leading-relaxed shadow-neo-lg">
          Drag (or use WASD / arrows) to swim. Stay still to{" "}
          <strong>camouflage</strong> — predators see you from closer when
          you're hidden. Tap, click, or press <strong>Space</strong> to release{" "}
          <strong>ink</strong> and escape. Survive your way from hatchling to
          guardian.
        </p>
      </header>

      <Card ref={gameCardRef} className="overflow-hidden bg-brand-background">
        {/* HUD */}
        <div className="grid grid-cols-3 gap-2 border-b-thick border-brand-border bg-brand-surface p-3 text-xs font-bold uppercase text-brand-text">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span>Health</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-neobrutal border-thin border-brand-border bg-brand-background">
              <div ref={healthRef} className="h-full bg-brand-pink" style={{ width: "100%" }} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-1">
              <span>Goal</span>
              <span className="truncate text-[10px] text-brand-text/70">
                {chapter.hint}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-neobrutal border-thin border-brand-border bg-brand-background">
              <div ref={progressRef} className="h-full bg-brand-primary" style={{ width: "0%" }} />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span>Ink</span>
              <span>Age <span ref={ageRef}>0</span> mo</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-neobrutal border-thin border-brand-border bg-brand-background">
              <div ref={inkRef} className="h-full bg-brand-warning" style={{ width: "100%" }} />
            </div>
          </div>
        </div>

        {/* Stage */}
        <div className="relative bg-[#0b3b66]">
          {/* Camouflage indicator — surfaces only while you're actually hidden. */}
          <span
            ref={camoRef}
            className="pointer-events-none absolute left-3 top-3 z-10 rounded-neobrutal border-thin border-brand-border bg-black/45 px-2 py-1 text-[10px] font-bold uppercase text-white shadow-neo-sm transition-opacity duration-200"
            style={{ opacity: 0 }}
          >
            🫥 Camouflaged
          </span>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerLeave}
            onPointerLeave={onPointerLeave}
            className="block w-full cursor-crosshair touch-none select-none"
            style={{ aspectRatio: `${W} / ${H}` }}
          />

          {/* Overlays */}
          {view === "intro" && (
            <Overlay>
              <h2 className="font-heading text-3xl uppercase text-white sm:text-4xl">
                Life of an Octopus
              </h2>
              <p className="mt-4 max-w-sm text-sm font-bold leading-relaxed text-white/90">
                You will hatch.<br />
                You will hunt.<br />
                You will hide.<br />
                You will love.<br />
                You will die.
              </p>
              <p className="mt-3 text-xs font-bold text-white/70">
                Most octopuses never reach adulthood. Can you?
              </p>
              <PrimaryButton onClick={beginLife}>Hatch →</PrimaryButton>
            </Overlay>
          )}

          {view === "chapterCard" && (
            <Overlay>
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                Chapter {chapter.no} · {chapter.age === 0 ? "Newly hatched" : `Age ${chapter.age} months`}
              </p>
              <h2 className="mt-2 font-heading text-3xl uppercase text-white sm:text-4xl">
                {chapter.title}
              </h2>
              <p className="mt-4 max-w-md text-sm font-bold leading-relaxed text-white/90">
                {chapter.card}
              </p>
              <PrimaryButton onClick={() => startChapter(chapterIdx)}>
                Continue →
              </PrimaryButton>
            </Overlay>
          )}

          {view === "ending" && (
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-black/40 pb-10 transition-all duration-1000">
              <p className="px-6 text-center font-heading text-xl uppercase text-white/90 sm:text-2xl">
                Thousands hatch. Few survive.
              </p>
            </div>
          )}

          {view === "dead" && (
            <Overlay>
              <h2 className="font-heading text-3xl uppercase text-white">
                You did not survive
              </h2>
              <p className="mt-3 max-w-sm text-sm font-bold text-white/80">
                Most octopuses are eaten long before adulthood. That's the
                ocean — and it's biologically honest.
              </p>
              <p className="mt-3 text-xs font-bold uppercase text-white/60">
                Reached: {chapter.title} · Age {finalStats?.ageReached ?? 0} months
              </p>
              <div className="mt-5 flex gap-3">
                <PrimaryButton onClick={() => startChapter(world.current.chapter)}>
                  Try this chapter again
                </PrimaryButton>
                <SecondaryButton onClick={beginLife}>Restart life</SecondaryButton>
              </div>
            </Overlay>
          )}

          {view === "complete" && finalStats && (
            <Overlay>
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">
                Life of an Octopus — Complete
              </p>
              <h2 className="mt-1 font-heading text-2xl uppercase text-white sm:text-3xl">
                {shared && view === "complete" && !world.current.stats.ageReached
                  ? "A friend's octopus lived this life"
                  : "An octopus lives only once"}
              </h2>
              <div className="mt-4 grid w-full max-w-sm grid-cols-2 gap-2 text-left">
                {STAT_LABELS.map(([key, label]) => (
                  <div
                    key={key}
                    className="rounded-neobrutal border-thin border-white/30 bg-white/10 px-3 py-2"
                  >
                    <p className="text-[10px] font-bold uppercase text-white/60">
                      {label}
                    </p>
                    <p className="font-heading text-lg text-white">
                      {finalStats[key].toLocaleString()}
                      {key === "ageReached" ? " mo" : ""}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs font-bold text-white/70">
                Your offspring hatched successfully.
              </p>
              <div className="mt-4">
                <PrimaryButton onClick={beginLife}>Live again →</PrimaryButton>
              </div>
            </Overlay>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex flex-col gap-3 border-t-thick border-brand-border bg-brand-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-brand-text">
            {view === "playing" ? message : "🐙 " + chapter.title}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-brand-text">
            {view === "playing" && (
              <button
                onClick={doInk}
                className="rounded-neobrutal border-thin border-brand-border bg-brand-background px-3 py-1.5 shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed"
              >
                🖤 Ink
              </button>
            )}
            {view === "playing" && showDisplayHint && (
              <button
                onPointerDown={() => (displaying.current = true)}
                onPointerUp={() => (displaying.current = false)}
                onPointerLeave={() => (displaying.current = false)}
                className="rounded-neobrutal border-thin border-brand-border bg-brand-secondary px-3 py-1.5 shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed"
              >
                🌈 Hold to display
              </button>
            )}
            <MuteButton />
            <ShareButton
              moduleId={MODULE_ID}
              version={SHARE_VERSION}
              getState={(): ShareState => ({
                ...(finalStats ?? world.current.stats),
              })}
              className="!px-3 !py-1.5 !shadow-neo-sm"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/60 to-black/75 px-6 text-center backdrop-blur-[2px]">
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mt-6 rounded-neobrutal border-thick border-brand-border bg-brand-primary px-6 py-3 font-heading text-lg uppercase text-brand-text shadow-neo-md transition-[transform,box-shadow] duration-100 active:translate-x-1 active:translate-y-1 active:shadow-neo-pressed"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="mt-6 rounded-neobrutal border-thick border-brand-border bg-brand-surface px-6 py-3 font-heading text-lg uppercase text-brand-text shadow-neo-md transition-[transform,box-shadow] duration-100 active:translate-x-1 active:translate-y-1 active:shadow-neo-pressed"
    >
      {children}
    </button>
  );
}
