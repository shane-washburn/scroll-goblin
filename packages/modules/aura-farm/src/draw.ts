/**
 * Canvas renderer for Aura Farm. Pure vector drawing — no assets.
 *
 * Two scenes share one canvas:
 *   - build/harvesting: a glass jar holding the growing aura orb + particles.
 *   - dancing: the goblin, tinted by the harvested aura, performing its dance.
 *
 * The goblin is a small articulated rig (torso, head, two arms, two legs). Each
 * dance is a pure function `(t) => Pose` of joint angles & body offsets; a
 * single `drawGoblin` turns a Pose into pixels. That keeps adding dances cheap.
 */

import {
  W,
  H,
  orbCenter,
  orbRadius,
  type World,
} from "./engine";
import { brightness, mixToRgb, rgbStr, type DanceId } from "./aura";

const OUTLINE = "#15130f";
const GOBLIN_SKIN: [number, number, number] = [126, 176, 84];

function blend(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/* ------------------------------------------------------------------ *
 * Pose rig
 * ------------------------------------------------------------------ */

/** Which face to render — "default" goblin, a special meme face, or a
 * downward-facing side profile (used for prone, belly-down dances). */
type FaceStyle = "default" | "sigma" | "profile";

interface Pose {
  bodyX: number;
  bodyY: number;
  tilt: number; // torso lean, radians (+ = lean right/forward)
  squash: number; // 1 = normal height
  headTilt: number;
  headBob: number;
  /**
   * Absolute head rotation (radians). When null the head rotates with the body
   * (`tilt + headTilt`). Setting it decouples how the head/face is oriented
   * from where the head is placed — e.g. a prone goblin whose head juts out
   * sideways but whose face still points down at the ground.
   */
  headRot: number | null;
  /** Face rendering style for this dance. */
  face: FaceStyle;
  /** [shoulderAbsAngle, elbowRelAngle] — angles from straight-down, +=right. */
  larm: [number, number];
  rarm: [number, number];
  lleg: [number, number];
  rleg: [number, number];
  /**
   * Optional IK hand targets in unit space (scaled by `s` at draw time, same
   * frame as the shoulders/hips). When set, the arm bends to put its hand on
   * the target instead of using the angle pair — used for precise gestures.
   */
  larmTo: [number, number] | null;
  rarmTo: [number, number] | null;
  /** 0 = upright; 1 = collapse shoulder/hip width into a side-lying profile. */
  flat: number;
  /** When true, arms inverse-reach so the hands land on the feet (bow pose). */
  grab: boolean;
  /**
   * Force both arms to render in front of the head/torso for the whole dance.
   * Use when the hands hover near the head height and the automatic depth pick
   * would otherwise flicker (e.g. arms stretched forward in the worm).
   */
  armsFront: boolean;
}

const BASE: Pose = {
  bodyX: 0,
  bodyY: 0,
  tilt: 0,
  squash: 1,
  headTilt: 0,
  headBob: 0,
  headRot: null,
  face: "default",
  larm: [-0.2, 0.1],
  rarm: [0.2, -0.1],
  lleg: [-0.12, 0.06],
  rleg: [0.12, 0.06],
  larmTo: null,
  rarmTo: null,
  flat: 0,
  grab: false,
  armsFront: false,
};

function pose(p: Partial<Pose>): Pose {
  return { ...BASE, ...p };
}

/** All dance choreography lives here. `t` is seconds since the dance began. */
function poseFor(dance: DanceId, t: number): Pose {
  switch (dance) {
    case "sway": {
      const s = Math.sin(t * 2);
      return pose({
        tilt: s * 0.12,
        bodyX: s * 6,
        headTilt: s * 0.1,
        larm: [-0.25 + s * 0.2, 0.15],
        rarm: [0.25 + s * 0.2, -0.15],
      });
    }
    case "jump": {
      const air = Math.abs(Math.sin(t * 5));
      const up = Math.sin(t * 5) > 0;
      return pose({
        bodyY: -air * 40,
        squash: up ? 1.04 : 0.92,
        larm: [-2.3 - air * 0.3, 0.2],
        rarm: [2.3 + air * 0.3, -0.2],
        lleg: [-0.1 - air * 0.3, air * 0.7],
        rleg: [0.1 + air * 0.3, air * 0.7],
        headBob: -air * 4,
      });
    }
    case "floss": {
      const sw = Math.sin(t * 6);
      return pose({
        bodyX: -sw * 12,
        tilt: -sw * 0.12,
        larm: [sw * 0.8, sw * 0.2],
        rarm: [sw * 0.8, sw * 0.2],
        lleg: [-0.16, 0.05],
        rleg: [0.16, 0.05],
      });
    }
    case "seaLion": {
      // Prone "bow" pose: belly down, head/chest lifted but the snout points at
      // the floor (side profile), legs arc up and back, hands grab the feet.
      const bounce = Math.abs(Math.sin(t * 4));
      return pose({
        tilt: Math.PI / 2, // lie flat, head to the right
        flat: 1, // thin side-on profile
        grab: true, // hands reach onto the feet
        squash: 0.82, // keep a real torso, just curled into a bow
        face: "profile", // downward side-profile face
        headRot: 0.22 + bounce * 0.14, // muzzle points down at the ground, nodding
        bodyY: 16 - bounce * 22,
        headTilt: -0.5 - bounce * 0.12,
        lleg: [2.3 - bounce * 0.12, 0.12],
        rleg: [2.34 - bounce * 0.12, 0.14],
      });
    }
    case "worm": {
      // Belly-down on the floor; a sine wave rolls head-to-tail along the body.
      // The crest reaches the head/arms first, then the torso, then the hips —
      // staggered phases sell the wave travelling through a rigid spine.
      const k = t * 5; // wave travel speed
      const front = Math.sin(k); // crest at the head & out-stretched arms
      const mid = Math.sin(k - 0.9); // crest at the torso (delayed)
      const back = Math.sin(k - 1.8); // crest at the hips & trailing legs
      return pose({
        tilt: Math.PI / 2 + mid * 0.38, // torso arches hard as the crest passes through
        flat: 1, // thin side-on profile
        squash: 0.82,
        armsFront: true, // hands reach forward by the head — keep them in front
        face: "profile", // downward side-profile face
        headRot: 0.16 + front * 0.2, // face stays down, nodding on the front crest
        headTilt: 0, // head juts straight forward (to the right)
        bodyY: 30 - Math.max(0, mid) * 60, // body rears up into a tall crest, then flattens
        // arms stretch forward along the floor (overhead), riding the front crest
        larm: [Math.PI / 2 + front * 0.22, 0.08],
        rarm: [Math.PI / 2 + front * 0.22, 0.08],
        // legs trail behind along the floor, riding the back crest
        lleg: [-Math.PI / 2 + back * 0.22, 0.08],
        rleg: [-Math.PI / 2 + back * 0.22, 0.08],
      });
    }
    case "breakdance": {
      const sp = Math.sin(t * 6);
      return pose({
        tilt: sp * 0.5,
        bodyY: -Math.abs(Math.cos(t * 6)) * 8,
        larm: [1.5, 0.2],
        rarm: [-2.4 + sp * 0.4, 0.3],
        lleg: [sp * 0.9, 0.2],
        rleg: [-sp * 0.9, 0.6],
        headTilt: sp * 0.3,
      });
    }
    case "moonwalk": {
      const p = Math.sin(t * 5);
      return pose({
        tilt: -0.12,
        bodyX: -Math.sin(t * 1.4) * 10,
        larm: [-0.4 + p * 0.25, 0.2],
        rarm: [0.4 - p * 0.25, -0.2],
        lleg: [p * 0.45, Math.max(0, -p) * 0.6],
        rleg: [-p * 0.45, Math.max(0, p) * 0.6],
        headTilt: -0.08,
      });
    }
    case "tRex": {
      const stomp = Math.sin(t * 6);
      const up = stomp > 0;
      return pose({
        tilt: 0.26 + Math.abs(stomp) * 0.05,
        larm: [-0.3, 2.0],
        rarm: [0.3, 2.0],
        lleg: [-0.14, up ? 0.5 : 0.05],
        rleg: [0.14, up ? 0.05 : 0.5],
        headTilt: 0.12,
        bodyY: -Math.abs(stomp) * 4,
      });
    }
    case "narutoRun": {
      const run = Math.sin(t * 11);
      return pose({
        tilt: 0.5,
        larm: [2.7 + run * 0.1, 0.15],
        rarm: [2.7 - run * 0.1, 0.15],
        lleg: [run * 0.8, Math.max(0, run) * 0.5 + 0.2],
        rleg: [-run * 0.8, Math.max(0, -run) * 0.5 + 0.2],
        bodyY: -Math.abs(run) * 4,
        headTilt: 0.2,
      });
    }
    case "disco": {
      const beat = Math.sin(t * 3);
      const sway = Math.sin(t * 6) * 8;
      const rightUp = beat > 0;
      return pose({
        bodyX: sway,
        tilt: Math.sin(t * 6) * 0.08,
        larm: rightUp ? [0.5, 1.7] : [-2.4, 0.2],
        rarm: rightUp ? [2.4, 0.2] : [-0.5, 1.7],
        lleg: [-0.16, 0.06],
        rleg: [0.16, 0.06],
        headTilt: beat * 0.12,
      });
    }
    case "wizard": {
      const f = Math.sin(t * 2);
      const cast = Math.sin(t * 3);
      return pose({
        bodyY: -6 + f * -6,
        tilt: f * 0.06,
        larm: [-1.9 + cast * 0.3, 0.4],
        rarm: [1.9 - cast * 0.3, -0.4],
        lleg: [-0.1, 0.3],
        rleg: [0.1, 0.3],
        headTilt: f * 0.12,
      });
    }
    case "hippie": {
      const s = Math.sin(t * 1.6);
      return pose({
        tilt: s * 0.2,
        bodyX: s * 8,
        larm: [-2.4 + s * 0.25, 0.2],
        rarm: [2.4 + s * 0.25, -0.2],
        headTilt: s * 0.15,
      });
    }
    case "heroPose": {
      const flex = Math.max(0, Math.sin(t * 1.5));
      return pose({
        tilt: -0.1,
        squash: 1.02 + flex * 0.03,
        larm: [1.15, 1.35],
        rarm: [-1.15, 1.35],
        lleg: [-0.22, 0.05],
        rleg: [0.22, 0.05],
        headBob: -flex * 2,
      });
    }
    case "gremlin": {
      return pose({
        bodyX: Math.sin(t * 15) * 6,
        bodyY: Math.sin(t * 12) * 5,
        tilt: Math.sin(t * 8) * 0.3,
        headTilt: Math.sin(t * 10) * 0.45,
        larm: [Math.sin(t * 9) * 1.7, Math.sin(t * 13) * 1.1],
        rarm: [Math.sin(t * 11 + 2) * 1.7, Math.sin(t * 7 + 1) * 1.1],
        lleg: [Math.sin(t * 14) * 0.5 - 0.1, Math.abs(Math.sin(t * 16)) * 0.5],
        rleg: [Math.sin(t * 13 + 1) * 0.5 + 0.1, Math.abs(Math.sin(t * 17)) * 0.5],
      });
    }
    case "sigma": {
      // "Sigma Boy" dance — a looping mix of the "no rizz" cutthroat slash,
      // stiff robotic Chad flex holds, and fluid arm swings on the fast beat.
      // Snappy, hold-then-snap phasing keeps the stoic sigma face throughout.
      const P = 3.2; // loop length (seconds)
      const phase = (t % P) / P; // 0..1 over the loop
      const groove = Math.sin(t * 2.2);
      const bounce = Math.abs(Math.sin(t * 4.4));

      // Shared body groove (small two-step + beat bounce).
      const base = {
        face: "sigma" as const,
        bodyX: groove * 7,
        bodyY: -bounce * 5,
        tilt: groove * 0.06,
        headTilt: groove * 0.08,
        headBob: -bounce * 2.5,
        larm: [-0.3, 0.2] as [number, number],
        rarm: [0.3, 0.2] as [number, number],
        lleg: [-0.18 + Math.max(0, groove) * 0.12, bounce * 0.1] as [number, number],
        rleg: [0.18 + Math.min(0, groove) * 0.12, bounce * 0.1] as [number, number],
      };

      if (phase < 0.25) {
        // Phase 1 — right hand drags across the throat (the "no rizz" slash).
        const u = phase / 0.25;
        return pose({ ...base, larm: [-0.25, 0.15], rarmTo: [-26 + u * 52, -78] });
      }
      if (phase < 0.5) {
        // Phase 2 — robotic double-flex Chad hold (hands up by the head).
        return pose({ ...base, larmTo: [-30, -74], rarmTo: [30, -74], bodyY: -bounce * 2 });
      }
      if (phase < 0.75) {
        // Phase 3 — mirror: left hand drags across the throat.
        const u = (phase - 0.5) / 0.25;
        return pose({ ...base, rarm: [0.25, 0.15], larmTo: [26 - u * 52, -78] });
      }
      // Phase 4 — fluid alternating arm swings riding the fast beat.
      const swing = Math.sin(t * 5.5);
      return pose({
        ...base,
        larm: [-0.6 + swing * 1.2, 0.4],
        rarm: [0.6 + swing * 1.2, 0.4],
      });
    }
    case "headbang": {
      const bang = Math.sin(t * 7);
      return pose({
        tilt: 0.12 + Math.max(0, bang) * 0.4,
        headTilt: Math.max(0, bang) * 0.5,
        bodyY: -Math.abs(bang) * 5,
        larm: [-2.5, 0.3],
        rarm: [2.5, -0.3],
        lleg: [-0.2, 0.05],
        rleg: [0.2, 0.05],
      });
    }
  }
}

/* ------------------------------------------------------------------ *
 * Goblin renderer
 * ------------------------------------------------------------------ */

function limb(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  absAng: number,
  len1: number,
  relAng: number,
  len2: number,
  width: number
): { hx: number; hy: number } {
  const e1x = ox + Math.sin(absAng) * len1;
  const e1y = oy + Math.cos(absAng) * len1;
  const a2 = absAng + relAng;
  const hx = e1x + Math.sin(a2) * len2;
  const hy = e1y + Math.cos(a2) * len2;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(e1x, e1y);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  return { hx, hy };
}

/**
 * Two-segment limb that bends to put its hand on a target point (simple 2-bone
 * IK via the law of cosines). Used for "grab" poses where the hands must meet
 * the feet regardless of exact joint angles. `bend` (+1/-1) picks the elbow
 * side. Returns the hand position actually drawn.
 */
function reachLimb(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  l1: number,
  l2: number,
  width: number,
  bend: number
): { hx: number; hy: number } {
  const dx = tx - sx;
  const dy = ty - sy;
  const d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const a = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const ang = base + bend * a;
  const ex = sx + Math.cos(ang) * l1;
  const ey = sy + Math.sin(ang) * l1;
  const hx = sx + Math.cos(base) * d;
  const hy = sy + Math.sin(base) * d;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  return { hx, hy };
}

/**
 * The "What the Sigma?" face — a stoic, chiseled Handsome-Squidward riff drawn
 * over the goblin head. Assumes we're already inside the head-local transform
 * (origin at head centre, +y down). `R` is the head radius.
 */
function drawSigmaFace(
  ctx: CanvasRenderingContext2D,
  R: number,
  skin: [number, number, number],
  skinStr: string,
  s: number
): void {
  const shade = rgbStr(blend(skin, [0, 0, 0], 0.16));
  const deep = rgbStr(blend(skin, [0, 0, 0], 0.28));

  // --- long chiseled jaw extending below the head circle ---
  ctx.fillStyle = skinStr;
  ctx.beginPath();
  ctx.moveTo(-R * 0.72, R * 0.69);
  ctx.lineTo(-R * 0.4, R * 1.22);
  ctx.quadraticCurveTo(0, R * 1.4, R * 0.4, R * 1.22);
  ctx.lineTo(R * 0.72, R * 0.69);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-R * 0.72, R * 0.69);
  ctx.lineTo(-R * 0.4, R * 1.22);
  ctx.quadraticCurveTo(0, R * 1.4, R * 0.4, R * 1.22);
  ctx.lineTo(R * 0.72, R * 0.69);
  ctx.stroke();

  // --- gaunt cheek hollows (chisel) ---
  ctx.strokeStyle = shade;
  ctx.lineWidth = 2.2 * s;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * R * 0.62, R * 0.12);
    ctx.quadraticCurveTo(dir * R * 0.42, R * 0.7, dir * R * 0.14, R * 0.98);
    ctx.stroke();
  }

  // --- heavy-lidded eyes ---
  for (const dir of [-1, 1]) {
    const ex = dir * R * 0.36;
    const ey = -R * 0.08;
    // white almond
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(ex, ey, R * 0.27, R * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // iris (gazing forward & down)
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.arc(ex - dir * R * 0.03, ey + R * 0.05, R * 0.11, 0, Math.PI * 2);
    ctx.fill();
    // heavy upper lid (skin) covering the top half
    ctx.fillStyle = skinStr;
    ctx.beginPath();
    ctx.ellipse(ex, ey - R * 0.19, R * 0.31, R * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    // almond outline + lid crease
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.8 * s;
    ctx.beginPath();
    ctx.ellipse(ex, ey, R * 0.27, R * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    // tired eye-bag below
    ctx.strokeStyle = shade;
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.arc(ex, ey + R * 0.04, R * 0.24, 0.35, Math.PI - 0.35);
    ctx.stroke();
  }

  // --- heavy lowered brows (furrowed, stern), drawn over the lids ---
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 3.4 * s;
  ctx.lineCap = "round";
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * R * 0.66, -R * 0.46);
    ctx.quadraticCurveTo(dir * R * 0.4, -R * 0.4, dir * R * 0.14, -R * 0.28);
    ctx.stroke();
  }

  // --- long straight nose ---
  ctx.strokeStyle = shade;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(R * 0.02, -R * 0.16);
  ctx.lineTo(-R * 0.06, R * 0.46);
  ctx.stroke();
  ctx.fillStyle = deep;
  ctx.beginPath();
  ctx.ellipse(-R * 0.04, R * 0.5, R * 0.15, R * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();

  // --- smug, faintly downturned mouth ---
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.4 * s;
  ctx.beginPath();
  ctx.moveTo(-R * 0.26, R * 0.88);
  ctx.quadraticCurveTo(0, R * 0.8, R * 0.26, R * 0.9);
  ctx.stroke();

  // --- chin cleft ---
  ctx.lineWidth = 1.8 * s;
  ctx.beginPath();
  ctx.moveTo(0, R * 1.05);
  ctx.lineTo(0, R * 1.18);
  ctx.stroke();
}

/**
 * A downward-facing side profile of the goblin — one visible eye and a snout
 * jutting toward local +y (which, at `headRot ≈ 0`, points at the ground).
 * Used for prone, belly-down dances so it reads as "lying on its stomach".
 * Assumes the head-local transform (origin at head centre, +y down). `R` is the
 * head radius.
 */
function drawProfileFace(
  ctx: CanvasRenderingContext2D,
  R: number,
  skin: [number, number, number],
  skinStr: string,
  s: number
): void {
  const shade = rgbStr(blend(skin, [0, 0, 0], 0.24));

  // --- snout / muzzle pushing down-and-forward toward the floor ---
  ctx.fillStyle = skinStr;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(-R * 0.26, R * 0.52);
  ctx.quadraticCurveTo(R * 0.2, R * 0.66, R * 0.5, R * 0.88); // bridge → front
  ctx.quadraticCurveTo(R * 0.64, R * 1.12, R * 0.34, R * 1.2); // rounded tip
  ctx.quadraticCurveTo(R * 0.06, R * 1.06, -R * 0.16, R * 0.86); // underside back to jaw
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // --- nostril near the snout tip ---
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(R * 0.4, R * 1.0, R * 0.07, R * 0.05, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // --- mouth line along the underside of the snout ---
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8 * s;
  ctx.beginPath();
  ctx.moveTo(R * 0.32, R * 1.14);
  ctx.quadraticCurveTo(R * 0.04, R * 1.0, -R * 0.16, R * 0.82);
  ctx.stroke();

  // --- single visible eye (side view), gazing down toward the ground ---
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(R * 0.1, R * 0.14, R * 0.22, R * 0.17, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6 * s;
  ctx.stroke();
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(R * 0.2, R * 0.26, R * 0.085, 0, Math.PI * 2);
  ctx.fill();

  // --- brow over the eye ---
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(-R * 0.14, -R * 0.02);
  ctx.quadraticCurveTo(R * 0.16, -R * 0.14, R * 0.42, R * 0.02);
  ctx.stroke();
}

function drawGoblin(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  p: Pose,
  color: [number, number, number]
): void {
  const skin = blend(GOBLIN_SKIN, color, 0.45);
  const skinStr = rgbStr(skin);
  const limbStr = rgbStr(blend(skin, [0, 0, 0], 0.18));
  // Arms get a distinctly lighter, warmer tone than the body/legs so their
  // movement is easy to follow against the dark background during a dance.
  const armStr = rgbStr(blend(skin, [255, 244, 214], 0.55));

  ctx.save();
  ctx.translate(cx + p.bodyX, cy + p.bodyY);

  // Ground shadow (in world space, not offset by bodyY bounce).
  ctx.save();
  ctx.translate(0, -p.bodyY);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 6 * s, 46 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const shoulderH = 64 * s * p.squash;
  const sx = Math.sin(p.tilt) * shoulderH;
  const sy = -Math.cos(p.tilt) * shoulderH;
  const px = Math.cos(p.tilt);
  const py = Math.sin(p.tilt);
  // Lying flat collapses how far the shoulders/hips spread (so limbs originate
  // near the spine) but keeps a thicker torso so the belly stays visible.
  const flatLimb = 1 - p.flat * 0.8;
  const flatTorso = 1 - p.flat * 0.34;
  const shW = 17 * s * flatLimb;
  const lSh = { x: sx - px * shW, y: sy - py * shW };
  const rSh = { x: sx + px * shW, y: sy + py * shW };
  const hipW = 13 * s * flatLimb;
  const lHipP = { x: -hipW, y: 0 };
  const rHipP = { x: hipW, y: 0 };

  const upper = 24 * s;
  const fore = 22 * s;
  const thigh = 30 * s;
  const shin = 28 * s;
  const armW = 9 * s;
  const legW = 11 * s;
  const headR = 22 * s;

  // --- legs (behind torso) ---
  ctx.strokeStyle = limbStr;
  const lFoot = limb(ctx, lHipP.x, lHipP.y, p.lleg[0], thigh, p.lleg[1], shin, legW);
  const rFoot = limb(ctx, rHipP.x, rHipP.y, p.rleg[0], thigh, p.rleg[1], shin, legW);

  // --- torso ---
  ctx.fillStyle = skinStr;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  const torsoW = 26 * s * flatTorso;
  ctx.moveTo(lHipP.x, lHipP.y);
  ctx.quadraticCurveTo(-torsoW, sy * 0.5, lSh.x, lSh.y);
  ctx.lineTo(rSh.x, rSh.y);
  ctx.quadraticCurveTo(torsoW, sy * 0.5, rHipP.x, rHipP.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw a single arm (IK target / grab onto foot / angle pair) plus its hand.
  const drawArm = (
    sh: { x: number; y: number },
    armTo: [number, number] | null,
    ang: [number, number],
    foot: { hx: number; hy: number },
    bend: number
  ): void => {
    ctx.strokeStyle = armStr;
    let hand: { hx: number; hy: number };
    if (armTo) {
      hand = reachLimb(ctx, sh.x, sh.y, armTo[0] * s, armTo[1] * s, upper, fore, armW, bend);
    } else if (p.grab) {
      hand = reachLimb(ctx, sh.x, sh.y, foot.hx, foot.hy, upper, fore, armW, bend);
    } else {
      hand = limb(ctx, sh.x, sh.y, ang[0], upper, ang[1], fore, armW);
    }
    ctx.fillStyle = armStr;
    ctx.beginPath();
    ctx.arc(hand.hx, hand.hy, armW * 0.6, 0, Math.PI * 2);
    ctx.fill();
  };

  // Resolve where each hand lands so we can pick the draw order: a hand raised
  // up by the head must render in front of the head, otherwise the arm sits in
  // front of the torso but behind the head.
  const handY = (
    armTo: [number, number] | null,
    ang: [number, number],
    foot: { hx: number; hy: number }
  ): number => {
    if (armTo) return armTo[1] * s;
    if (p.grab) return foot.hy;
    const e1y = sy + Math.cos(ang[0]) * upper;
    return e1y + Math.cos(ang[0] + ang[1]) * fore;
  };
  const frontLine = sy - headR * 0.2; // above the shoulders ⇒ in front of head
  const lFront = p.armsFront || handY(p.larmTo, p.larm, lFoot) < frontLine;
  const rFront = p.armsFront || handY(p.rarmTo, p.rarm, rFoot) < frontLine;

  // --- arms that stay behind the head (still in front of the torso) ---
  if (!lFront) drawArm(lSh, p.larmTo, p.larm, lFoot, 1);
  if (!rFront) drawArm(rSh, p.rarmTo, p.rarm, rFoot, -1);

  // --- head ---
  const neck = { x: sx, y: sy };
  const hx = neck.x + Math.sin(p.tilt + p.headTilt) * (headR + 6 * s);
  const hy = neck.y - Math.cos(p.tilt + p.headTilt) * (headR + 6 * s) + p.headBob;

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(p.headRot ?? p.tilt + p.headTilt);

  // ears (pointy)
  ctx.fillStyle = skinStr;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2 * s;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(dir * headR * 0.7, -headR * 0.1);
    ctx.lineTo(dir * headR * 1.7, -headR * 0.7);
    ctx.lineTo(dir * headR * 0.8, headR * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // head
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (p.face === "sigma") {
    drawSigmaFace(ctx, headR, skin, skinStr, s);
  } else if (p.face === "profile") {
    drawProfileFace(ctx, headR, skin, skinStr, s);
  } else {
    // nose
    ctx.fillStyle = rgbStr(blend(skin, [0, 0, 0], 0.25));
    ctx.beginPath();
    ctx.ellipse(0, headR * 0.25, headR * 0.22, headR * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = "#fff";
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * headR * 0.38, -headR * 0.18, headR * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = OUTLINE;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * headR * 0.38, -headR * 0.16, headR * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // --- arms raised up by the head render in front of everything ---
  if (lFront) drawArm(lSh, p.larmTo, p.larm, lFoot, 1);
  if (rFront) drawArm(rSh, p.rarmTo, p.rarm, rFoot, -1);

  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * Particles
 * ------------------------------------------------------------------ */

function drawParticles(ctx: CanvasRenderingContext2D, world: World): void {
  for (const p of world.particles) {
    const a = 1 - p.life / p.maxLife;
    ctx.fillStyle = rgbStr(p.color, a * 0.9);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ------------------------------------------------------------------ *
 * Scenes
 * ------------------------------------------------------------------ */

function drawJarScene(
  ctx: CanvasRenderingContext2D,
  world: World,
  now: number
): void {
  const color = mixToRgb(world.mix);
  const c = orbCenter();
  const r = orbRadius(world.growth);
  const pulse = 1 + world.pulse * 0.08 + Math.sin(now / 380) * 0.03;

  // Pedestal
  ctx.fillStyle = "#2a2520";
  ctx.fillRect(c.x - 120, c.y + 150, 240, 26);
  ctx.fillStyle = "#3a332b";
  ctx.fillRect(c.x - 132, c.y + 170, 264, 16);

  // Orb glow
  const glow = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r * 2.4 * pulse);
  glow.addColorStop(0, rgbStr(color, 0.5));
  glow.addColorStop(1, rgbStr(color, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 2.4 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Orb body
  const og = ctx.createRadialGradient(
    c.x - r * 0.3,
    c.y - r * 0.3,
    r * 0.1,
    c.x,
    c.y,
    r * pulse
  );
  og.addColorStop(0, rgbStr(blend(color, [255, 255, 255], 0.5)));
  og.addColorStop(0.6, rgbStr(color));
  og.addColorStop(1, rgbStr(blend(color, [0, 0, 0], 0.25)));
  ctx.fillStyle = og;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(
    c.x - r * 0.32,
    c.y - r * 0.4,
    r * 0.22,
    r * 0.13,
    -0.5,
    0,
    Math.PI * 2
  );
  ctx.fill();

  drawParticles(ctx, world);

  // Glass potion bottle — a spherical bulb that holds the orb, a narrow neck,
  // and a cork stopper. The bulb is sized to comfortably contain the orb at
  // full growth (orbRadius maxes near 130).
  const bulbR = 140;
  const neckHalf = 30; // half-width of the neck where it meets the bulb
  const rimHalf = 40; // half-width of the flared lip
  const neckTopY = c.y - bulbR - 60; // top of the neck / lip
  // Where the neck walls meet the bulb (points on the bulb circle at ±neckHalf).
  const shoulderDY = -Math.sqrt(bulbR * bulbR - neckHalf * neckHalf);
  const rAng = Math.atan2(shoulderDY, neckHalf); // right shoulder angle
  const lAng = Math.atan2(shoulderDY, -neckHalf); // left shoulder angle

  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(c.x - neckHalf, c.y + shoulderDY); // left shoulder on the bulb
  ctx.lineTo(c.x - neckHalf, neckTopY + 14); // up the left neck wall
  ctx.quadraticCurveTo(c.x - rimHalf, neckTopY + 4, c.x - rimHalf, neckTopY); // flare to lip
  ctx.lineTo(c.x + rimHalf, neckTopY); // across the lip
  ctx.quadraticCurveTo(c.x + rimHalf, neckTopY + 4, c.x + neckHalf, neckTopY + 14); // down to right wall
  ctx.lineTo(c.x + neckHalf, c.y + shoulderDY); // right shoulder on the bulb
  ctx.arc(c.x, c.y, bulbR, rAng, lAng + Math.PI * 2, false); // around the bulb
  ctx.closePath();
  ctx.stroke();

  // glass sheen on the bulb's upper-left
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(c.x, c.y, bulbR - 16, Math.PI * 0.78, Math.PI * 1.1);
  ctx.stroke();
  ctx.lineCap = "butt";

  // cork stopper seated in the neck
  ctx.fillStyle = "#6b4f2a";
  const corkW = rimHalf * 2 - 4;
  ctx.fillRect(c.x - corkW / 2, neckTopY - 18, corkW, 26);
  ctx.fillStyle = "#85673a";
  ctx.fillRect(c.x - corkW / 2 - 5, neckTopY - 30, corkW + 10, 14);
}

function drawDanceScene(ctx: CanvasRenderingContext2D, world: World): void {
  const aura = world.aura;
  if (!aura) return;
  const color = mixToRgb(world.mix);
  const t = world.danceT;

  // Aura glow behind goblin
  const gx = W / 2;
  const gy = H * 0.66;
  const glow = ctx.createRadialGradient(gx, gy - 40, 20, gx, gy - 40, 260);
  glow.addColorStop(0, rgbStr(color, 0.55));
  glow.addColorStop(1, rgbStr(color, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // floating aura motes
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + t * 0.6;
    const rad = 150 + Math.sin(t * 1.5 + i) * 40;
    const mx = gx + Math.cos(a) * rad;
    const my = gy - 40 + Math.sin(a) * rad * 0.6;
    ctx.fillStyle = rgbStr(color, 0.5);
    ctx.beginPath();
    ctx.arc(mx, my, 3 + Math.sin(t * 3 + i) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ground line
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W * 0.2, gy + 12);
  ctx.lineTo(W * 0.8, gy + 12);
  ctx.stroke();

  const p = poseFor(aura.dance, t);
  drawGoblin(ctx, gx, gy, 2.0, p, color);

  drawParticles(ctx, world);
}

function drawBackground(ctx: CanvasRenderingContext2D, world: World): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (world.phase === "dancing" && world.aura) {
    const c = mixToRgb(world.mix);
    const dark = blend(c, [12, 10, 16], 0.82);
    g.addColorStop(0, rgbStr(blend(c, [20, 18, 28], 0.6)));
    g.addColorStop(1, rgbStr(dark));
  } else {
    g.addColorStop(0, "#1d2330");
    g.addColorStop(1, "#11141d");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  now: number
): void {
  ctx.save();
  if (world.shake > 0.3) {
    ctx.translate(
      (Math.random() - 0.5) * world.shake,
      (Math.random() - 0.5) * world.shake
    );
  }

  drawBackground(ctx, world);

  if (world.phase === "dancing") {
    drawDanceScene(ctx, world);
  } else {
    drawJarScene(ctx, world, now);
    if (world.phase === "harvesting") {
      // A small goblin silhouette receiving the aura at the bottom.
      const color = mixToRgb(world.mix);
      drawGoblin(ctx, W / 2, H * 0.86, 1.1, poseFor("heroPose", now / 1000), color);
      // White flash overlay.
      const f = Math.sin(Math.min(1, world.flash) * Math.PI);
      ctx.fillStyle = `rgba(255,255,255,${f * 0.6})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  ctx.restore();

  // brightness-based vignette keeps light auras readable on the dark stage
  if (world.phase === "dancing" && world.aura) {
    const b = brightness(mixToRgb(world.mix));
    if (b > 0.7) {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(0, 0, W, H);
    }
  }
}
