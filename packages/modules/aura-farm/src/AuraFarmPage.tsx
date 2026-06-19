import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Lightbulb,
  Lock,
  Moon,
  Music,
  RefreshCw,
  Sparkles,
  Sun,
  Wand2,
  Zap,
} from "lucide-react";
import {
  Card,
  MuteButton,
  ShareButton,
  consumeShareSnapshot,
  getAudioBus,
  trackStat,
  useTranslation,
  useMobileGameFit,
} from "@scroll-goblin/ui";
import {
  AURAS,
  STAGE_LABEL,
  brightness,
  mixToRgb,
  rgbStr,
  stageFor,
  type AuraDef,
  type Care,
  type Channel,
  type Mix,
} from "./aura";
import {
  W,
  H,
  addColor,
  careAction,
  createWorld,
  harvest,
  loadShared,
  playAura,
  reseed,
  stepWorld,
  type CareKind,
  type World,
} from "./engine";
import { drawWorld } from "./draw";
import {
  playCare,
  playDrop,
  playHarvest,
  playMature,
  startGroove,
  type Groove,
} from "./sounds";

const MODULE_ID = "aura-farm";
const SHARE_VERSION = 1;
const DEX_KEY = "scroll-goblin:aura-farm:dex";

interface ShareState {
  mix: Mix;
  care: Care;
  /**
   * When the link is shared while a dance is active, this pins the exact aura
   * (and therefore its dance) so the recipient performs the same one instead of
   * re-deriving it from the mix/care. Only this aura is unlocked for them.
   */
  auraId?: string;
}

type View = "build" | "harvesting" | "dancing";

/**
 * Care actions. `delta` is the color a care action contributes to the mix (so
 * the button is tinted that color); `null` means it provides no color of its
 * own — Feed just intensifies whatever's dominant, Chaos is random.
 */
const CARE_BUTTONS: {
  kind: CareKind;
  label: string;
  icon: typeof Sun;
  hint: string;
  delta: Mix | null;
}[] = [
  { kind: "feed", label: "Feed", icon: Lightbulb, hint: "Inspiration — intensifies the dominant color", delta: null },
  { kind: "sun", label: "Sunlight", icon: Sun, hint: "Warms it up, grows fastest", delta: { r: 0.25, y: 0.6, b: 0 } },
  { kind: "rest", label: "Rest", icon: Moon, hint: "Calms toward balance, grows slowly", delta: { r: 0.35, y: 0.35, b: 1 } },
  { kind: "music", label: "Music", icon: Music, hint: "Too much and you'll get a Disco Aura", delta: { r: 0.3, y: 0, b: 0.55 } },
  { kind: "story", label: "Stories", icon: BookOpen, hint: "Pulls it cosmic & purple", delta: { r: 0.45, y: 0, b: 0.6 } },
  { kind: "chaos", label: "Chaos", icon: Zap, hint: "Scrambles everything. Anything can happen.", delta: null },
];

const COLOR_BUTTONS: { ch: Channel; label: string; mix: Mix }[] = [
  { ch: "r", label: "Red", mix: { r: 1, y: 0, b: 0 } },
  { ch: "y", label: "Yellow", mix: { r: 0, y: 1, b: 0 } },
  { ch: "b", label: "Blue", mix: { r: 0, y: 0, b: 1 } },
];

/** The actual contributed color of a primary/care button (or null = neutral). */
function buttonTint(delta: Mix | null): { bg?: string; light: boolean } {
  if (!delta) return { light: false };
  const c = mixToRgb(delta);
  return { bg: rgbStr(c), light: brightness(c) <= 0.55 };
}

function loadDex(): Set<string> {
  try {
    const raw = localStorage.getItem(DEX_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

function saveDex(dex: Set<string>): void {
  try {
    localStorage.setItem(DEX_KEY, JSON.stringify([...dex]));
  } catch {
    /* ignore */
  }
}

/**
 * Read the share snapshot exactly once per page load.
 *
 * `consumeShareSnapshot` is impure — it strips the `?s=` param from the URL on
 * read. React StrictMode (and any remount) double-invokes `useState`
 * initializers in dev, so calling it directly there would consume on the first
 * call and then return `null` on the second, losing the shared dance. Memoizing
 * at module scope makes every invocation return the same value.
 */
let sharedSnapshot: ShareState | null | undefined;
function takeSharedSnapshot(): ShareState | null {
  if (sharedSnapshot === undefined) {
    sharedSnapshot = consumeShareSnapshot<ShareState>(MODULE_ID, SHARE_VERSION);
  }
  return sharedSnapshot;
}

export default function AuraFarmPage() {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const [snapshot] = useState(takeSharedSnapshot);

  const gameCardRef = useMobileGameFit<HTMLDivElement>({ align: "top" });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>(createWorld());
  const grooveRef = useRef<Groove | null>(null);

  const [view, setView] = useState<View>("build");
  const [canHarvest, setCanHarvest] = useState(false);
  const [aura, setAura] = useState<AuraDef | null>(null);
  // Opening a share link is an ephemeral visit: the recipient starts with an
  // empty encyclopedia (only the shared dance gets unlocked, the rest stay
  // unlearned) and nothing is persisted, so their own saved progress — and the
  // sender's — is left untouched.
  const [dex, setDex] = useState<Set<string>>(() =>
    snapshot ? new Set<string>() : loadDex()
  );

  // Imperatively-updated build HUD (kept out of React state to avoid churn).
  const growthBarRef = useRef<HTMLDivElement>(null);
  const stageTextRef = useRef<HTMLSpanElement>(null);

  const viewRef = useRef<View>(view);
  viewRef.current = view;

  const stopGroove = () => {
    grooveRef.current?.stop();
    grooveRef.current = null;
  };

  const unlock = (a: AuraDef) => {
    setDex((prev) => {
      if (prev.has(a.id)) return prev;
      const next = new Set(prev);
      next.add(a.id);
      // Don't persist during a shared-link visit — it must not clobber the
      // recipient's real saved progress.
      if (!snapshot) saveDex(next);
      return next;
    });
  };

  const beginDance = (a: AuraDef) => {
    setAura(a);
    setView("dancing");
    unlock(a);
    trackStat(MODULE_ID, "harvests");
    stopGroove();
    grooveRef.current = startGroove(a.dance, world.current.mix);
  };

  // Replay a shared aura straight into the dance.
  useEffect(() => {
    if (!snapshot) return;
    // A link shared mid-dance pins its exact aura; otherwise re-derive from the
    // shared mix/care.
    const pinned = snapshot.auraId ? AURAS[snapshot.auraId] : undefined;
    let a: AuraDef;
    if (pinned) {
      playAura(world.current, pinned);
      a = pinned;
    } else {
      a = loadShared(world.current, snapshot.mix, snapshot.care);
    }
    // A shared link just plays the dance — it isn't "learned" or added to the
    // recipient's encyclopedia.
    setAura(a);
    setView("dancing");
    grooveRef.current = startGroove(a.dance, world.current.mix);

    // A freshly opened tab (e.g. the link in a new/incognito window) starts with
    // a suspended AudioContext that browsers only allow us to resume after a
    // user gesture — so resume it on the first interaction to unmute the music.
    const resumeAudio = () => {
      const { ctx } = getAudioBus();
      if (ctx.state === "suspended") void ctx.resume();
    };
    window.addEventListener("pointerdown", resumeAudio, { once: true });
    window.addEventListener("keydown", resumeAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", resumeAudio);
      window.removeEventListener("keydown", resumeAudio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      const ev = stepWorld(wld, dt);
      if (ev.matured) {
        setCanHarvest(true);
        playMature();
      }
      if (ev.harvestDone && wld.aura) {
        beginDance(wld.aura);
      }

      drawWorld(ctx, wld, now);

      if (viewRef.current === "build") {
        if (growthBarRef.current)
          growthBarRef.current.style.width = `${Math.round(wld.growth * 100)}%`;
        if (stageTextRef.current)
          stageTextRef.current.textContent = tRef.current(
            STAGE_LABEL[stageFor(wld.growth)]
          );
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stopGroove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- actions --- */
  const onColor = (ch: Channel) => {
    if (viewRef.current !== "build") return;
    addColor(world.current, ch, 1);
    playDrop(ch);
    trackStat(MODULE_ID, "drops");
  };

  const onCare = (kind: CareKind) => {
    if (viewRef.current !== "build") return;
    careAction(world.current, kind);
    playCare(kind);
  };

  const onHarvest = () => {
    if (viewRef.current !== "build" || world.current.growth < 1) return;
    const a = harvest(world.current);
    if (!a) return;
    setView("harvesting");
    setCanHarvest(false);
    playHarvest();
  };

  const onNew = () => {
    stopGroove();
    reseed(world.current);
    setAura(null);
    setCanHarvest(false);
    setView("build");
  };

  // Replay a discovered dance straight from the encyclopedia.
  const onReplay = (a: AuraDef) => {
    if (!dex.has(a.id)) return;
    stopGroove();
    playAura(world.current, a);
    setAura(a);
    setCanHarvest(false);
    setView("dancing");
    grooveRef.current = startGroove(a.dance, world.current.mix);
    // Bring the stage into view (the encyclopedia sits below the canvas).
    canvasRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const orbColor = rgbStr(mixToRgb(world.current.mix));
  const total = Object.keys(AURAS).length;

  return (
    <div className="mx-auto max-w-5xl px-0 sm:px-4 py-0 sm:py-12">
      <header className="hidden sm:grid mb-bento gap-bento sm:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-neobrutal border-thick border-brand-border bg-brand-purple p-5 shadow-neo-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-neobrutal border-thin border-brand-border bg-brand-background px-3 py-1 text-xs font-bold uppercase shadow-neo-sm">
            🔮 {t("Goblin Aura Farm")}
          </div>
          <h1 className="font-heading text-4xl uppercase leading-none text-brand-text sm:text-5xl">
            {t("Grow it. Harvest it. Watch it dance")}
          </h1>
        </div>
        <p className="rounded-neobrutal border-thick border-brand-border bg-brand-surface p-5 text-sm font-bold leading-relaxed shadow-neo-lg">
          {t(
            "Drip Red, Yellow & Blue energy into the jar, then raise the blob with care. Warm colors grow fast and dance hard; cool ones stay smooth. Harvest a ripe aura and your goblin erupts into a dance chosen by its color."
          )}
        </p>
      </header>

      <Card
        ref={gameCardRef}
        className="overflow-hidden bg-brand-background rounded-none border-0 sm:rounded-neobrutal sm:border-thick"
      >
        {/* Stage */}
        <div className="relative bg-[#11141d] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block max-h-[calc(100dvh-260px)] w-auto max-w-full select-none object-contain"
          />

          {/* Recipe controls overlaid on the canvas so they stay in frame as
              the aura changes: primaries along the top, raising along the bottom. */}
          {view === "build" && (
            <>
              <div className="pointer-events-none absolute inset-x-0 -top-3 flex justify-center px-2">
                <div className="pointer-events-auto flex gap-2 rounded-neobrutal border-thin border-brand-border bg-black/35 p-1.5 shadow-neo-sm backdrop-blur-sm">
                  {COLOR_BUTTONS.map((c) => {
                    const tint = buttonTint(c.mix);
                    return (
                      <button
                        key={c.ch}
                        onClick={() => onColor(c.ch)}
                        className={`inline-flex items-center gap-1.5 rounded-neobrutal border-thick border-brand-border px-3 py-1.5 text-xs font-bold shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed ${
                          tint.light ? "text-white" : "text-brand-text"
                        }`}
                        style={{ backgroundColor: tint.bg }}
                      >
                        + {t(c.label)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 -bottom-3 flex justify-center px-2">
                <div className="pointer-events-auto flex flex-nowrap justify-center gap-1.5 rounded-neobrutal border-thin border-brand-border bg-black/35 p-1.5 shadow-neo-sm backdrop-blur-sm">
                  {CARE_BUTTONS.map((b) => {
                    const Icon = b.icon;
                    const tint = buttonTint(b.delta);
                    return (
                      <button
                        key={b.kind}
                        onClick={() => onCare(b.kind)}
                        title={t(b.hint)}
                        className={`flex w-[60px] shrink flex-col items-center gap-0.5 rounded-neobrutal border-thin border-brand-border px-1 py-1.5 text-[10px] font-bold shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed ${
                          b.delta
                            ? tint.light
                              ? "text-white"
                              : "text-brand-text"
                            : "bg-brand-surface text-brand-text"
                        }`}
                        style={b.delta ? { backgroundColor: tint.bg } : undefined}
                      >
                        <Icon className="h-4 w-4" />
                        {t(b.label)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Build controls */}
        {view !== "dancing" && (
          <div className="border-t-thick border-brand-border bg-brand-surface p-4">
            {/* Growth meter */}
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase">
                <span>{t("Growth")}</span>
                <span ref={stageTextRef} className="text-brand-muted">
                  {t("Seedling")}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-neobrutal border-thin border-brand-border bg-brand-background">
                <div
                  ref={growthBarRef}
                  className="h-full bg-brand-primary transition-[width] duration-150"
                  style={{ width: "0%" }}
                />
              </div>
            </div>

            {/* Harvest row */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onHarvest}
                disabled={!canHarvest || view === "harvesting"}
                className="inline-flex items-center gap-2 rounded-neobrutal border-thick border-brand-border bg-brand-pink px-5 py-2.5 text-sm font-bold text-brand-text shadow-neo-md transition-[transform,box-shadow] duration-100 active:translate-x-1 active:translate-y-1 active:shadow-neo-pressed disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Wand2 className="h-4 w-4" />
                {canHarvest ? t("Harvest the Aura!") : t("Keep raising it…")}
              </button>
              <button
                onClick={onNew}
                className="inline-flex items-center gap-1.5 rounded-neobrutal border-thin border-brand-border bg-brand-background px-3 py-2 text-xs font-bold shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed"
              >
                <RefreshCw className="h-3.5 w-3.5" /> {t("Empty jar")}
              </button>
              <ShareButton
                moduleId={MODULE_ID}
                version={SHARE_VERSION}
                getState={(): ShareState => ({
                  mix: { ...world.current.mix },
                  care: { ...world.current.care },
                })}
                className="!px-3 !py-1.5 !shadow-neo-sm"
              />
              <MuteButton />
              <span
                className="ml-auto inline-flex h-6 w-6 rounded-full border-thin border-brand-border shadow-neo-sm"
                style={{ backgroundColor: orbColor }}
                aria-hidden
              />
            </div>
          </div>
        )}

        {/* Dance reveal */}
        {view === "dancing" && aura && (
          <div className="border-t-thick border-brand-border bg-brand-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-1 inline-flex items-center gap-2 rounded-neobrutal border-thin border-brand-border bg-brand-background px-2 py-0.5 text-[10px] font-bold uppercase shadow-neo-sm">
                  {t(aura.rarity)}
                </div>
                <h2 className="font-heading text-3xl leading-none">
                  {aura.emoji} {t(aura.name)}
                </h2>
                <p className="mt-1 text-sm font-bold">
                  {t("Now dancing:")} <strong>{t(aura.danceName)}</strong>
                </p>
                <p className="mt-1 text-sm font-bold text-brand-muted">
                  {t(aura.blurb)}
                </p>
                <p className="mt-2 inline-flex items-start gap-1.5 rounded-neobrutal border-thin border-brand-border bg-brand-background px-2.5 py-1.5 text-xs font-bold shadow-neo-sm">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t(aura.lesson)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  onClick={onNew}
                  className="inline-flex items-center gap-2 rounded-neobrutal border-thick border-brand-border bg-brand-primary px-4 py-2.5 text-sm font-bold text-brand-text shadow-neo-md transition-[transform,box-shadow] duration-100 active:translate-x-1 active:translate-y-1 active:shadow-neo-pressed"
                >
                  <RefreshCw className="h-4 w-4" /> {t("Grow another")}
                </button>
                <ShareButton
                  moduleId={MODULE_ID}
                  version={SHARE_VERSION}
                  getState={(): ShareState => ({
                    mix: { ...world.current.mix },
                    care: { ...world.current.care },
                    auraId: aura?.id,
                  })}
                />
                <MuteButton />
              </div>
            </div>
          </div>
        )}

        {/* Dance encyclopedia */}
        <div className="border-t-thick border-brand-border bg-brand-background p-4">
          <p className="mb-2 text-[11px] font-bold uppercase text-brand-muted">
            {t("Dance Encyclopedia")} —{" "}
            {t("{count} unlocked", {
              count: `${dex.size}/${total}`,
            })}
            <span className="ml-1 normal-case text-brand-muted/80">
              {t("(tap a discovered dance to perform it)")}
            </span>
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Object.values(AURAS).map((a) => {
              const got = dex.has(a.id);
              const active = view === "dancing" && aura?.id === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onReplay(a)}
                  disabled={!got}
                  title={got ? t("Perform {dance}", { dance: t(a.danceName) }) : t("Locked")}
                  className={`flex flex-col items-center gap-0.5 rounded-neobrutal border-thin border-brand-border p-2 text-center shadow-neo-sm transition-[transform,box-shadow] duration-100 ${
                    got
                      ? "bg-brand-surface hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed cursor-pointer"
                      : "bg-brand-background opacity-60 cursor-not-allowed"
                  } ${active ? "ring-2 ring-brand-primary ring-offset-1 ring-offset-brand-background" : ""}`}
                >
                  <span className="text-2xl leading-none">
                    {got ? a.emoji : <Lock className="h-5 w-5 text-brand-muted" />}
                  </span>
                  <span className="text-[10px] font-bold leading-tight">
                    {got ? t(a.danceName) : "???"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
