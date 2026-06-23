import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  MuteButton,
  trackStat,
  useMobileGameFit,
  useTranslation,
} from "@scroll-goblin/ui";
import type { SlugRoomSnapshot } from "@scroll-goblin/shared";
import {
  advanceLungeLifecycle,
  applyMovement,
  BOTTOM_Y,
  clamp,
  ENERGY_MAX,
  LEFT_X,
  LUNGE_COST,
  LUNGE_MS,
  lungeOffset,
  makeAiState,
  makeFencer,
  MID_X,
  MID_Y,
  MOVE_SPEED,
  resolveLunges,
  RIGHT_X,
  stepAi,
  TOP_Y,
  tryLunge,
  VH,
  VW,
  type AiState,
  type Fencer,
} from "./engine";
import { PERSONALITIES, type Difficulty } from "./personalities";
import { randomAccessory, randomAura, randomEmote, randomTitle, type Accessory } from "./titles";
import { Slug } from "./Slug";
import {
  CountdownOverlay,
  LobbyScreen,
  ModeScreen,
  MultiplayerSetupScreen,
  SoloSetupScreen,
  VictoryScreen,
  type Hand,
} from "./screens";
import { playGotHit, playHit, playLunge, playMiss, playReady, playTired, playVictory } from "./sounds";
import { useRoomSync } from "./useRoomSync";
import {
  ACTIVE_POLL_MS,
  createRoom,
  IDLE_POLL_MS,
  joinRoom,
  type GuestInputMsg,
  type HostState,
  type RoomTransport,
} from "./transport";

const MODULE_ID = "slug-fencing";
const SIDE_KEY = "slug-fencing:side";
/** Lead time before a point begins, covering the 3-2-1-SLUG countdown. */
const COUNTDOWN_LEAD_MS = 3600;

type Phase =
  | "menu"
  | "solo-setup"
  | "mp-setup"
  | "lobby"
  | "countdown"
  | "playing"
  | "victory";
type Mode = "solo" | "mp";

function fencerToState(f: Fencer, now: number) {
  const phase =
    f.lungeStart === 0 ? 0 : clamp((now - f.lungeStart) / LUNGE_MS, 0, 1);
  return { y: f.y, energy: f.energy, lungePhase: phase };
}

function loadHand(): Hand {
  try {
    return localStorage.getItem(SIDE_KEY) === "left" ? "left" : "right";
  } catch {
    return "right";
  }
}

export default function SlugDuelPage() {
  const { t } = useTranslation();
  const gameCardRef = useMobileGameFit<HTMLDivElement>({ align: "top" });

  /* ----------------------------- UI state ----------------------------- */
  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<Mode>("solo");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [scoreToWin, setScoreToWin] = useState(5);
  const [hand, setHand] = useState<Hand>(loadHand);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [countNum, setCountNum] = useState(3);
  const [message, setMessage] = useState("");
  const [emote, setEmote] = useState<string | null>(null);

  // Multiplayer
  const [transport, setTransport] = useState<RoomTransport | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [guestJoined, setGuestJoined] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);
  const [rematchMine, setRematchMine] = useState(false);
  const [rematchOpp, setRematchOpp] = useState(false);

  // Victory
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [victoryTitle, setVictoryTitle] = useState("SIGMA SLUG");
  const [victoryAccessory, setVictoryAccessory] = useState<Accessory>("shades");
  const [victoryAura, setVictoryAura] = useState(3000);

  const role: "host" | "guest" | null = transport?.role ?? null;
  const youAreP1 = mode === "solo" || role === "host";

  /* ------------------------- Simulation refs -------------------------- */
  const p1 = useRef<Fencer>(makeFencer());
  const p2 = useRef<Fencer>(makeFencer());
  const ai = useRef<AiState>(makeAiState());
  const keyDir = useRef(0);
  const localTargetY = useRef(MID_Y);
  const couldLunge = useRef(true);
  const myLungeSeq = useRef(0);
  const gesture = useRef({ x: 0, y: 0, t: 0, moved: false });

  // Guest-side opponent interpolation (the host's slug).
  const oppY = useRef(MID_Y);
  const oppTargetY = useRef(MID_Y);
  const oppEnergy = useRef(ENERGY_MAX);
  const oppLungeStart = useRef(0);
  const oppLastPhase = useRef(0);

  // Host-side latest guest input.
  const guestInput = useRef<GuestInputMsg>({
    targetY: MID_Y,
    lungeSeq: 0,
    joined: false,
    rematch: false,
  });
  const lastGuestSeq = useRef(0);

  // Mirrors so the rAF/network loops read fresh values without resubscribing.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const s1 = useRef(0);
  const s2 = useRef(0);
  const scoreToWinRef = useRef(scoreToWin);
  scoreToWinRef.current = scoreToWin;
  const startAt = useRef<number | null>(null);
  const lungeLockUntil = useRef(0);
  const victoryAt = useRef(0);
  const seq = useRef(0);
  const rematchMineRef = useRef(false);
  rematchMineRef.current = rematchMine;
  const handRef = useRef(hand);
  handRef.current = hand;
  // The rAF loop closure can be stale on `winner` (it isn't a loop dep), so the
  // victory scale-up must read the winner from a ref to size the RIGHT slug.
  const winnerRef = useRef<1 | 2 | null>(null);
  winnerRef.current = winner;

  // SVG element refs for imperative 60fps rendering.
  const svgRef = useRef<SVGSVGElement>(null);
  const myGRef = useRef<SVGGElement>(null);
  const oppGRef = useRef<SVGGElement>(null);
  const myEnergyRef = useRef<HTMLDivElement>(null);
  const oppEnergyRef = useRef<HTMLDivElement>(null);
  const impactRef = useRef<SVGGElement>(null);

  const persistHand = (h: Hand) => {
    setHand(h);
    try {
      localStorage.setItem(SIDE_KEY, h);
    } catch {
      /* private mode — preference just won't persist */
    }
  };

  /* --------------------------- Match control -------------------------- */
  const recenter = useCallback(() => {
    p1.current = makeFencer();
    p2.current = makeFencer();
    ai.current = makeAiState();
    oppY.current = MID_Y;
    oppTargetY.current = MID_Y;
    oppEnergy.current = ENERGY_MAX;
    oppLungeStart.current = 0;
    localTargetY.current = MID_Y;
  }, []);

  const beginCountdown = useCallback(
    (at: number) => {
      recenter();
      startAt.current = at;
      // lungeLockUntil lives in the performance.now() domain (used for the
      // post-point pause), while startAt is an epoch ms used for the synced
      // countdown. Clear the lock so play is unblocked the moment the phase
      // flips to "playing"; do NOT assign the epoch `at` here.
      lungeLockUntil.current = 0;
      setEmote(null);
      setMessage("");
      setPhase("countdown");
    },
    [recenter]
  );

  const endMatch = useCallback(
    (winnerIdx: 1 | 2) => {
      victoryAt.current = performance.now();
      setWinner(winnerIdx);
      setVictoryTitle(randomTitle());
      setVictoryAccessory(randomAccessory());
      setVictoryAura(randomAura());
      setPhase("victory");
      playVictory();
      trackStat(MODULE_ID, "matches");
      const iWon = (winnerIdx === 1) === youAreP1;
      if (iWon && mode === "mp") trackStat(MODULE_ID, "mpWins");
    },
    [mode, youAreP1]
  );

  const awardPoint = useCallback(
    (scorer: 1 | 2) => {
      const next = (scorer === 1 ? s1.current : s2.current) + 1;
      if (scorer === 1) {
        s1.current = next;
        setScore1(next);
      } else {
        s2.current = next;
        setScore2(next);
      }
      const iScored = (scorer === 1) === youAreP1;
      setMessage(iScored ? t("+1 point!") : t("Opponent scores!"));
      setEmote(randomEmote());
      window.setTimeout(() => setEmote(null), 1100);
      // Keep play fluid: no pause or recenter — the duel flows straight on.
      if (next >= scoreToWinRef.current) endMatch(scorer);
    },
    [endMatch, t, youAreP1]
  );

  /* ------------------------------ Inputs ------------------------------ */
  const toSvgY = (clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const scale = Math.min(rect.width / VW, rect.height / VH);
    const offsetY = (rect.height - VH * scale) / 2;
    return clamp((clientY - rect.top - offsetY) / scale, TOP_Y, BOTTOM_Y);
  };

  const myFencer = () => (youAreP1 ? p1.current : p2.current);

  const doLunge = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const now = performance.now();
    if (now < lungeLockUntil.current) return;
    const f = myFencer();
    if (tryLunge(f, now)) {
      myLungeSeq.current += 1;
      setMessage("");
      trackStat(MODULE_ID, "lunges");
      playLunge();
    } else if (f.energy < LUNGE_COST && f.lungeStart === 0) {
      setMessage(t("Too pooped to lunge. Let the meter refill."));
      playTired();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, youAreP1]);

  const DRAG_SLOP = 14;
  const TAP_MS = 500;
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    localTargetY.current = toSvgY(e.clientY);
    const g = gesture.current;
    if (Math.abs(e.clientX - g.x) > DRAG_SLOP || Math.abs(e.clientY - g.y) > DRAG_SLOP) {
      g.moved = true;
    }
  };
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== "touch") {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* capture is an optimisation — never fatal */
      }
    }
    localTargetY.current = toSvgY(e.clientY);
    gesture.current = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
  };
  const onPointerUp = () => {
    const g = gesture.current;
    if (!g.moved && performance.now() - g.t < TAP_MS) doLunge();
  };
  const onPointerCancel = () => {
    gesture.current.moved = true;
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        keyDir.current = -1;
        e.preventDefault();
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        keyDir.current = 1;
        e.preventDefault();
      } else if (e.key === " " || e.key === "Enter") {
        doLunge();
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (
        ((e.key === "ArrowUp" || e.key === "w" || e.key === "W") && keyDir.current === -1) ||
        ((e.key === "ArrowDown" || e.key === "s" || e.key === "S") && keyDir.current === 1)
      ) {
        keyDir.current = 0;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [doLunge]);

  /* --------------------------- The game loop -------------------------- */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const ph = phaseRef.current;

      if (ph === "playing" || ph === "countdown" || ph === "victory") {
        const isGuest = role === "guest";
        const playing = ph === "playing" && now >= lungeLockUntil.current;

        // Steer my slug locally (host, solo, and guest all predict their own).
        stepMine(myFencer(), dt, now, playing);

        if (!isGuest) {
          // The opponent only comes alive once the countdown is over — no
          // moving or lunging during 3-2-1.
          if (playing) {
            if (mode === "solo") {
              stepAi(p2.current, p1.current, dt, now, ai.current, PERSONALITIES[difficulty].tuning);
            } else {
              driveGuestControlledFencer(p2.current, dt, now);
            }
            const r = resolveLunges(p1.current, p2.current, now);
            handleOutcome(r.p1, 1);
            handleOutcome(r.p2, 2);
          }
        } else {
          // Guest: smooth the opponent toward the last authoritative sample.
          const k = Math.min(1, dt * 10);
          oppY.current += (oppTargetY.current - oppY.current) * k;
        }
        render(now);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, difficulty, role]);

  function stepMine(f: Fencer, dt: number, now: number, playing: boolean) {
    if (playing) {
      if (keyDir.current !== 0) {
        f.targetY = clamp(f.targetY + keyDir.current * MOVE_SPEED * dt, TOP_Y, BOTTOM_Y);
      } else {
        f.targetY = localTargetY.current;
      }
    }
    applyMovement(f, dt);
    const ready = f.energy >= LUNGE_COST;
    if (ready && !couldLunge.current) playReady();
    couldLunge.current = ready;
    advanceLungeLifecycle(f, now);
  }

  function driveGuestControlledFencer(f: Fencer, dt: number, now: number) {
    f.targetY = guestInput.current.targetY;
    if (guestInput.current.lungeSeq > lastGuestSeq.current) {
      lastGuestSeq.current = guestInput.current.lungeSeq;
      if (now >= lungeLockUntil.current) tryLunge(f, now);
    }
    applyMovement(f, dt);
    advanceLungeLifecycle(f, now);
  }

  function handleOutcome(outcome: "hit" | "miss" | null, who: 1 | 2) {
    if (outcome === "hit") {
      const dir = handRef.current === "right" ? -1 : 1;
      const iAmScorer = (who === 1) === youAreP1;
      flashImpact(MID_X + (iAmScorer ? 60 : -60) * dir, who === 1 ? p2.current.y : p1.current.y);
      trackStat(MODULE_ID, "hits");
      if (iAmScorer) playHit();
      else playGotHit();
      awardPoint(who);
    } else if (outcome === "miss") {
      playMiss();
    }
  }

  function flashImpact(x: number, y: number) {
    const g = impactRef.current;
    if (!g) return;
    g.style.opacity = "1";
    try {
      const anim = g.animate(
        [
          { transform: `translate(${x}px, ${y}px) scale(0.3)`, opacity: 1 },
          { transform: `translate(${x}px, ${y}px) scale(1.4)`, opacity: 0 },
        ],
        { duration: 320, easing: "ease-out" }
      );
      anim.onfinish = () => {
        g.style.opacity = "0";
      };
    } catch {
      g.style.opacity = "0";
    }
  }

  function render(now: number) {
    const rightHanded = handRef.current === "right";
    const ph = phaseRef.current;
    const w = winnerRef.current;
    const mineWon = w != null && (w === 1) === youAreP1;
    const oppWon = w != null && !mineWon;

    const mine = myFencer();
    drawSlug(myGRef.current, myEnergyRef.current, mine.y, lungeOffset(now, mine.lungeStart), mine.energy, rightHanded, ph === "victory" && mineWon, now);

    if (role === "guest") {
      // Opponent lunge: trigger a smooth local animation on a rising edge.
      drawSlug(oppGRef.current, oppEnergyRef.current, oppY.current, lungeOffset(now, oppLungeStart.current), oppEnergy.current, !rightHanded, ph === "victory" && oppWon, now);
    } else {
      const opp = youAreP1 ? p2.current : p1.current;
      drawSlug(oppGRef.current, oppEnergyRef.current, opp.y, lungeOffset(now, opp.lungeStart), opp.energy, !rightHanded, ph === "victory" && oppWon, now);
    }
  }

  function isMine(w: 1 | 2 | null): boolean {
    if (w == null) return false;
    return (w === 1) === youAreP1;
  }

  function drawSlug(
    g: SVGGElement | null,
    bar: HTMLDivElement | null,
    y: number,
    off: number,
    energy: number,
    sideRight: boolean,
    isWinner: boolean,
    now: number
  ) {
    if (g) {
      const x = sideRight ? RIGHT_X : LEFT_X;
      const dir = sideRight ? -1 : 1;
      let scale = 1;
      let wiggle = 0;
      if (isWinner) {
        scale = 1 + Math.min(1.4, ((now - victoryAt.current) / 600) * 1.4);
        wiggle = Math.sin(now / 110) * 10; // sigma slug dance
      }
      const sx = (sideRight ? -1 : 1) * scale;
      g.setAttribute("transform", `translate(${x + dir * off} ${y + wiggle}) scale(${sx} ${scale})`);
    }
    if (bar) bar.style.width = `${(energy / ENERGY_MAX) * 100}%`;
  }

  /* --------------------------- Countdown ------------------------------ */
  useEffect(() => {
    if (phase !== "countdown" || startAt.current == null) return;
    const id = window.setInterval(() => {
      const remMs = (startAt.current as number) - Date.now();
      setCountNum(Math.max(0, Math.ceil(remMs / 1000)));
      // Host & solo own the transition; the guest follows the host snapshot.
      if (remMs <= -400 && role !== "guest") {
        seq.current += 1;
        setPhase("playing");
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, role]);

  /* ----------------------- Multiplayer plumbing ----------------------- */
  const getHostState = useCallback((): HostState => {
    const now = performance.now();
    return {
      scoreToWin: scoreToWinRef.current,
      phase: phaseRef.current === "lobby" ? "lobby" : (phaseRef.current as HostState["phase"]),
      startAt: startAt.current,
      score1: s1.current,
      score2: s2.current,
      p1: fencerToState(p1.current, now),
      p2: fencerToState(p2.current, now),
      winner,
      rematchHost: rematchMineRef.current,
      seq: seq.current,
    };
  }, [winner]);

  const onGuestInput = useCallback(
    (input: GuestInputMsg) => {
      guestInput.current = input;
      if (input.joined && !guestJoined) {
        setGuestJoined(true);
        if (phaseRef.current === "lobby") beginCountdown(Date.now() + COUNTDOWN_LEAD_MS);
      }
      setRematchOpp(input.rematch);
      // Both accepted a rematch — host restarts the match for everyone.
      if (phaseRef.current === "victory" && rematchMineRef.current && input.rematch) {
        s1.current = 0;
        s2.current = 0;
        setScore1(0);
        setScore2(0);
        setWinner(null);
        setRematchMine(false);
        setRematchOpp(false);
        guestInput.current.rematch = false;
        beginCountdown(Date.now() + COUNTDOWN_LEAD_MS);
      }
    },
    [beginCountdown, guestJoined]
  );

  const onSnapshot = useCallback(
    (snap: SlugRoomSnapshot) => {
      setScoreToWin(snap.scoreToWin);
      scoreToWinRef.current = snap.scoreToWin;
      setGuestJoined(snap.guestJoined);
      setRematchOpp(snap.rematchHost);
      // Opponent (host = p1) authoritative sample.
      oppTargetY.current = snap.p1.y;
      oppEnergy.current = snap.p1.energy;
      if (snap.p1.lungePhase > 0 && oppLastPhase.current === 0) {
        oppLungeStart.current = performance.now();
      }
      oppLastPhase.current = snap.p1.lungePhase;
      // My authoritative score is snap.score2; surface both.
      if (snap.score1 !== s1.current) {
        s1.current = snap.score1;
        setScore1(snap.score1);
      }
      if (snap.score2 !== s2.current) {
        s2.current = snap.score2;
        setScore2(snap.score2);
      }
      // Mirror the host's authoritative phase.
      if (snap.startAt != null) startAt.current = snap.startAt;
      if (snap.phase === "countdown" && phaseRef.current !== "countdown" && phaseRef.current !== "playing") {
        recenter();
        setRematchMine(false);
        setPhase("countdown");
      } else if (snap.phase === "playing" && phaseRef.current === "countdown") {
        setPhase("playing");
      } else if (snap.phase === "victory" && phaseRef.current !== "victory" && snap.winner) {
        endMatch(snap.winner as 1 | 2);
      }
    },
    [endMatch, recenter]
  );

  const getGuestInput = useCallback(
    () => ({
      targetY: localTargetY.current,
      lungeSeq: myLungeSeq.current,
      rematch: rematchMineRef.current,
    }),
    []
  );

  const active = phase === "playing" || phase === "countdown";
  useRoomSync({
    transport,
    intervalMs: active ? ACTIVE_POLL_MS : IDLE_POLL_MS,
    getHostState,
    getGuestInput,
    onGuestInput,
    onSnapshot,
    onRoomGone: () => {
      setMpError(t("The room expired or could not be reached."));
      leaveToMenu();
    },
  });

  /* --------------------------- Flow actions --------------------------- */
  const leaveToMenu = useCallback(() => {
    setTransport(null);
    setRoomId(null);
    setGuestJoined(false);
    setRematchMine(false);
    setRematchOpp(false);
    setWinner(null);
    s1.current = 0;
    s2.current = 0;
    setScore1(0);
    setScore2(0);
    startAt.current = null;
    setPhase("menu");
  }, []);

  const startSolo = () => {
    setMode("solo");
    s1.current = 0;
    s2.current = 0;
    setScore1(0);
    setScore2(0);
    setWinner(null);
    scoreToWinRef.current = scoreToWin;
    beginCountdown(Date.now() + COUNTDOWN_LEAD_MS);
  };

  const handleCreate = async () => {
    setMode("mp");
    setCreating(true);
    setMpError(null);
    try {
      const { transport: tr } = await createRoom(scoreToWin);
      setTransport(tr);
      setRoomId(tr.roomId);
      s1.current = 0;
      s2.current = 0;
      setScore1(0);
      setScore2(0);
      setWinner(null);
      setPhase("lobby");
    } catch {
      setMpError(t("Could not create a match. Try again."));
    } finally {
      setCreating(false);
    }
  };

  // Auto-join when arriving via a share link (?room=ID).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("room");
    if (!id || transport) return;
    setMode("mp");
    joinRoom(id)
      .then(({ transport: tr, snapshot }) => {
        setTransport(tr);
        setRoomId(tr.roomId);
        setScoreToWin(snapshot.scoreToWin);
        scoreToWinRef.current = snapshot.scoreToWin;
        setGuestJoined(true);
        setPhase("lobby");
      })
      .catch(() => setMpError(t("That match link is invalid or full.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestRematch = () => {
    if (mode === "solo") {
      s1.current = 0;
      s2.current = 0;
      setScore1(0);
      setScore2(0);
      setWinner(null);
      beginCountdown(Date.now() + COUNTDOWN_LEAD_MS);
      return;
    }
    setRematchMine(true);
    rematchMineRef.current = true;
    // Host with both flags already set restarts via onGuestInput; if the guest
    // already asked, restart immediately.
    if (role === "host" && rematchOpp) {
      s1.current = 0;
      s2.current = 0;
      setScore1(0);
      setScore2(0);
      setWinner(null);
      setRematchMine(false);
      setRematchOpp(false);
      beginCountdown(Date.now() + COUNTDOWN_LEAD_MS);
    }
  };

  const joinUrl = roomId
    ? `${window.location.origin}/apps/slug-fencing?room=${roomId}`
    : "";

  /* ------------------------------ Render ------------------------------ */
  const showArena = phase === "countdown" || phase === "playing" || phase === "victory";
  const myName = mode === "solo" ? t("You") : t("You");
  const oppName =
    mode === "solo" ? t(PERSONALITIES[difficulty].name) : t("Opponent");
  const myScore = youAreP1 ? score1 : score2;
  const oppScore = youAreP1 ? score2 : score1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-bento rounded-neobrutal border-thick border-brand-border bg-brand-secondary p-5 shadow-neo-lg">
        <h1 className="font-heading text-4xl uppercase leading-none text-brand-text sm:text-5xl">
          🐌 {t("Slug Duel")}
        </h1>
        <p className="mt-2 text-sm font-bold text-brand-text">
          {t("Duel the AI or send a friend a link. First slug to the target score wins.")}
        </p>
      </header>

      {phase === "menu" ? (
        <ModeScreen
          onSolo={() => {
            setMode("solo");
            setPhase("solo-setup");
          }}
          onMultiplayer={() => {
            setMode("mp");
            setMpError(null);
            setPhase("mp-setup");
          }}
        />
      ) : null}

      {phase === "solo-setup" ? (
        <SoloSetupScreen
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          scoreToWin={scoreToWin}
          setScoreToWin={setScoreToWin}
          hand={hand}
          setHand={persistHand}
          onStart={startSolo}
          onBack={() => setPhase("menu")}
        />
      ) : null}

      {phase === "mp-setup" ? (
        <MultiplayerSetupScreen
          scoreToWin={scoreToWin}
          setScoreToWin={setScoreToWin}
          hand={hand}
          setHand={persistHand}
          onCreate={handleCreate}
          onBack={() => setPhase("menu")}
          creating={creating}
          error={mpError}
        />
      ) : null}

      {phase === "lobby" && role ? (
        <LobbyScreen
          role={role}
          scoreToWin={scoreToWin}
          guestJoined={guestJoined}
          joinUrl={joinUrl}
          hand={hand}
          setHand={persistHand}
          onCancel={leaveToMenu}
        />
      ) : null}

      {phase === "victory" ? (
        <VictoryScreen
          youWon={isMine(winner)}
          title={victoryTitle}
          accessory={victoryAccessory}
          aura={victoryAura}
          score1={score1}
          score2={score2}
          youAreP1={youAreP1}
          isMultiplayer={mode === "mp"}
          rematchPending={rematchMine && !rematchOpp}
          opponentWantsRematch={rematchOpp}
          onRematch={requestRematch}
          onNewMatch={leaveToMenu}
        />
      ) : null}

      {showArena ? (
        <Card ref={gameCardRef} className="relative mt-bento overflow-hidden bg-brand-background">
          <div className="grid grid-cols-2 border-b-thick border-brand-border">
            {(hand === "right" ? ["opp", "me"] : ["me", "opp"]).map((who, i) => {
              const isMe = who === "me";
              return (
                <div
                  key={who}
                  className={`p-3 ${isMe ? "bg-brand-primary" : "bg-brand-pink"} ${
                    i === 0 ? "border-r-thick border-brand-border" : "text-right"
                  }`}
                >
                  <p className="text-xs font-bold uppercase text-brand-text">
                    {isMe ? myName : oppName}
                  </p>
                  <p className="font-heading text-3xl leading-none text-brand-text">
                    {isMe ? myScore : oppScore}
                  </p>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-neobrutal border-thin border-brand-border bg-brand-background">
                    <div
                      ref={isMe ? myEnergyRef : oppEnergyRef}
                      className={`h-full bg-brand-warning ${i === 1 ? "ml-auto" : ""}`}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative bg-gradient-to-b from-brand-secondary via-white to-brand-surface">
            {phase === "countdown" ? <CountdownOverlay count={countNum} /> : null}
            {emote ? (
              <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 text-3xl">
                {emote}
              </div>
            ) : null}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VW} ${VH}`}
              onPointerMove={onPointerMove}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              className="h-[360px] w-full cursor-crosshair touch-none select-none"
            >
              <line
                x1={VW / 2}
                y1={TOP_Y - 24}
                x2={VW / 2}
                y2={BOTTOM_Y + 24}
                stroke="#1F2937"
                strokeWidth={3}
                strokeDasharray="8 10"
                opacity={0.4}
              />
              <g ref={myGRef}>
                <Slug
                  fill="#22C55E"
                  shade="#15803D"
                  accessory={phase === "victory" && isMine(winner) ? victoryAccessory : null}
                />
              </g>
              <g ref={oppGRef}>
                <Slug
                  fill="#EC4899"
                  shade="#BE185D"
                  accessory={phase === "victory" && !isMine(winner) ? victoryAccessory : null}
                />
              </g>
              <g ref={impactRef} style={{ opacity: 0 }}>
                <circle r={20} fill="none" stroke="#1F2937" strokeWidth={4} />
                <path
                  d="M-28 0 L-14 0 M28 0 L14 0 M0 -28 L0 -14 M0 28 L0 14 M-20 -20 L-10 -10 M20 20 L10 10 M-20 20 L-10 10 M20 -20 L10 -10"
                  stroke="#1F2937"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              </g>
            </svg>
          </div>

          <div className="flex flex-col gap-3 border-t-thick border-brand-border bg-brand-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-brand-text">
              {message || t("First to {n}", { n: scoreToWin })}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-brand-text">
              <span>
                {t("First to")}: <span className="bg-brand-secondary px-1">{scoreToWin}</span>
              </span>
              <button
                onClick={() => persistHand(hand === "right" ? "left" : "right")}
                className="rounded-neobrutal border-thin border-brand-border bg-brand-background px-3 py-1.5 shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed"
              >
                {hand === "right" ? `🫱 ${t("Righty")}` : `🫲 ${t("Lefty")}`}
              </button>
              {phase !== "victory" ? (
                <button
                  onClick={leaveToMenu}
                  className="rounded-neobrutal border-thin border-brand-border bg-brand-background px-3 py-1.5 shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed"
                >
                  {t("Quit")}
                </button>
              ) : null}
              <MuteButton />
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
