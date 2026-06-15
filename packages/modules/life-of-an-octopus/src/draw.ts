/**
 * Canvas renderer for Life of an Octopus. Pure vector drawing — no assets.
 * Reads the mutable World and paints one frame. Kept separate from the
 * simulation so the game loop stays readable.
 */

import {
  bgColorAt,
  clamp,
  lerp,
  CHAPTERS,
  FLOOR_Y,
  SURFACE_Y,
  W,
  H,
  type Creature,
  type World,
} from "./engine";

const OCTO_BASE: [number, number, number] = [156, 64, 140];

function rgb(c: [number, number, number], a = 1) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}
function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Deterministic pseudo-random for static scenery (rocks, kelp). */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function drawWorld(ctx: CanvasRenderingContext2D, world: World, now: number) {
  ctx.save();
  if (world.shake > 0.2) {
    ctx.translate(
      (Math.random() - 0.5) * world.shake,
      (Math.random() - 0.5) * world.shake
    );
  }

  drawBackground(ctx, world, now);
  drawSeafloor(ctx, world);

  // Den in den/guardian chapters.
  if (world.chapter === 3 || world.chapter === 5) drawDen(ctx, world, now);

  for (const c of world.creatures) {
    if (!c.alive && c.kind !== "egg") continue;
    drawCreature(ctx, c, now);
  }

  drawInk(ctx, world, now);
  drawOctopus(ctx, world, now);

  // Mate success heart animation
  if (world.mateSuccess) {
    drawMateHearts(ctx, world, now);
  }

  // Surface shimmer overlay near the top.
  drawSurface(ctx, now);
  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, world: World, now: number) {
  const def = CHAPTERS[world.chapter];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgb(def.topColor));
  g.addColorStop(1, rgb(def.bottomColor));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Light rays from the surface.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const x = ((i * 197 + now * 0.01) % (W + 200)) - 100;
    const sway = Math.sin(now * 0.0004 + i) * 30;
    ctx.beginPath();
    ctx.moveTo(x + sway, 0);
    ctx.lineTo(x + 60 + sway, 0);
    ctx.lineTo(x + 160, H * 0.7);
    ctx.lineTo(x + 40, H * 0.7);
    ctx.closePath();
    ctx.fillStyle = `rgba(255,255,255,${0.04 - world.chapter * 0.004})`;
    ctx.fill();
  }
  ctx.restore();

  // Drifting motes.
  const m = rng(11);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  for (let i = 0; i < 40; i++) {
    const bx = m() * W;
    const by = (m() * H + now * (0.004 + m() * 0.01)) % H;
    const r = m() * 1.6 + 0.4;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSurface(ctx: CanvasRenderingContext2D, now: number) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= W; x += 20) {
    const y = SURFACE_Y - 16 + Math.sin(x * 0.05 + now * 0.002) * 5;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();
  ctx.restore();
}

function drawSeafloor(ctx: CanvasRenderingContext2D, world: World) {
  ctx.save();
  const base = bgColorAt(world, FLOOR_Y);
  const r = rng(7);

  // Sand mound with texture.
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y + 30);
  for (let x = 0; x <= W; x += 40) {
    const y = FLOOR_Y + 8 + Math.sin(x * 0.02) * 8;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = rgb(mix(base, [45, 38, 30], 0.5));
  ctx.fill();

  // Sand patches - lighter areas for contrast.
  for (let i = 0; i < 5; i++) {
    const x = 40 + r() * (W - 80);
    const y = FLOOR_Y + 20 + r() * 40;
    const rad = 30 + r() * 50;
    ctx.beginPath();
    ctx.ellipse(x, y, rad, rad * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgb(mix(base, [65, 58, 48], 0.4), 0.6);
    ctx.fill();
  }

  // Varied rocks for hiding spots / camo cues - different colors and sizes.
  const rockColors = [
    [20, 24, 30],   // dark grey
    [35, 40, 45],   // medium grey
    [50, 42, 38],   // brownish
    [28, 32, 38],   // blue-grey
    [42, 38, 35],   // warm grey
  ];
  for (let i = 0; i < 12; i++) {
    const x = 50 + r() * (W - 100);
    const rad = 18 + r() * 35;
    const y = FLOOR_Y - rad * 0.2 + r() * 15;
    const color = rockColors[i % rockColors.length];
    ctx.beginPath();
    ctx.ellipse(x, y, rad, rad * (0.6 + r() * 0.3), r() * 0.5, Math.PI, Math.PI * 2);
    ctx.fillStyle = rgb(mix(base, color as [number, number, number], 0.5 + r() * 0.3), 0.95);
    ctx.fill();
  }

  // Colorful coral patches - great for showcasing camouflage with vibrant colors.
  const coralColors = [
    [255, 120, 100],  // coral pink
    [255, 180, 80],   // orange
    [200, 100, 160],  // purple
    [100, 180, 160],  // teal
    [240, 200, 100],  // yellow
    [180, 80, 80],    // red
  ];
  for (let i = 0; i < 8; i++) {
    const x = 60 + r() * (W - 120);
    const y = FLOOR_Y - 5 + r() * 20;
    const size = 8 + r() * 16;
    const color = coralColors[i % coralColors.length];

    // Coral branches.
    ctx.save();
    ctx.translate(x, y);
    for (let b = 0; b < 3 + Math.floor(r() * 3); b++) {
      const angle = -Math.PI / 2 + (r() - 0.5) * 1.5;
      const len = size * (0.8 + r() * 0.6);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(
        Math.cos(angle) * len * 0.5 + (r() - 0.5) * size * 0.5,
        Math.sin(angle) * len * 0.5,
        Math.cos(angle) * len,
        Math.sin(angle) * len
      );
      ctx.strokeStyle = rgb(color as [number, number, number], 0.85);
      ctx.lineWidth = 2 + r() * 2;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.restore();
  }

  // Seaweed / kelp strands.
  const seaweedColors = [
    [40, 100, 60],   // green
    [50, 120, 80],   // lighter green
    [35, 80, 50],    // dark green
    [60, 100, 70],   // olive
  ];
  for (let i = 0; i < 10; i++) {
    const x = 30 + r() * (W - 60);
    const y = FLOOR_Y + 10;
    const height = 30 + r() * 60;
    const color = seaweedColors[i % seaweedColors.length];

    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 8; s++) {
      const sy = y - (s / 8) * height;
      const sway = Math.sin(s * 0.8) * (2 + s * 0.5);
      ctx.lineTo(x + sway, sy);
    }
    ctx.strokeStyle = rgb(color as [number, number, number], 0.7);
    ctx.lineWidth = 2 + r() * 2;
    ctx.stroke();
  }

  // Small pebbles and details.
  ctx.fillStyle = rgb(mix(base, [60, 55, 50], 0.5), 0.8);
  for (let i = 0; i < 25; i++) {
    const x = r() * W;
    const y = FLOOR_Y + 15 + r() * 50;
    const size = 2 + r() * 4;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawDen(ctx: CanvasRenderingContext2D, world: World, now: number) {
  const { x, y } = world.den;
  ctx.save();

  // Glowing halo so the den reads as a special place, not just another rock.
  const glow = ctx.createRadialGradient(x, y - 6, 4, x, y - 6, 78);
  glow.addColorStop(0, "rgba(120,225,235,0.35)");
  glow.addColorStop(1, "rgba(120,225,235,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y - 6, 78, 0, Math.PI * 2);
  ctx.fill();

  // A distinct purple-rock arch with a bright rim — clearly not grey scenery.
  ctx.beginPath();
  ctx.moveTo(x - 48, y + 26);
  ctx.quadraticCurveTo(x - 56, y - 46, x, y - 50);
  ctx.quadraticCurveTo(x + 56, y - 46, x + 48, y + 26);
  ctx.closePath();
  ctx.fillStyle = "#3a2c5c";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#86e8e4";
  ctx.stroke();

  // Dark cavity mouth.
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 30, 27, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fill();

  // Collected shells stacked along the base as the den is built.
  const placed = world.chapter === 3 ? world.goalProgress : 3;
  const spots: [number, number][] = [
    [-30, 18],
    [0, 24],
    [30, 18],
  ];
  for (let i = 0; i < Math.min(placed, 3); i++) {
    drawShellShape(ctx, x + spots[i][0], y + spots[i][1], 11, 30);
  }

  // A bobbing "HOME" marker while the den still needs shells.
  if (world.chapter === 3 && world.goalProgress < world.goalTarget) {
    const by = y - 70 + Math.sin(now * 0.005) * 4;
    ctx.fillStyle = "#86e8e4";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HOME", x, by);
    ctx.beginPath();
    ctx.moveTo(x - 8, by + 6);
    ctx.lineTo(x + 8, by + 6);
    ctx.lineTo(x, by + 16);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawShellShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hue: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.bezierCurveTo(r, r, r, -r * 0.4, 0, -r);
  ctx.bezierCurveTo(-r, -r * 0.4, -r, r, 0, r);
  ctx.fillStyle = `hsl(${hue},45%,72%)`;
  ctx.fill();
  ctx.strokeStyle = `hsl(${hue},40%,45%)`;
  ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(0, r);
    ctx.lineTo(i * r * 0.4, -r * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCreature(ctx: CanvasRenderingContext2D, c: Creature, now: number) {
  switch (c.kind) {
    case "predator":
      drawFish(ctx, c, now);
      break;
    case "prey":
      if (c.species === "Crab") drawCrab(ctx, c);
      else drawShrimp(ctx, c);
      break;
    case "shell":
      drawShellShape(ctx, c.x, c.y, c.r, c.hue);
      break;
    case "mate":
      drawMate(ctx, c, now);
      break;
    case "egg":
      drawEggs(ctx, c, now);
      break;
    case "baby":
      drawBaby(ctx, c, now);
      break;
  }
}

function drawFish(ctx: CanvasRenderingContext2D, c: Creature, now: number) {
  const r = c.r;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(c.dirX, 1);
  const wag = Math.sin(c.wobble) * 0.4;
  const stunned = now < c.stun;
  // Body.
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
  const bodyHue = c.species === "Small shark" ? 210 : c.species === "Moray eel" ? 90 : 200;
  const light = c.species === "Moray eel" ? "45%" : "60%";
  ctx.fillStyle = stunned ? "#8a8f96" : `hsl(${bodyHue},35%,${light})`;
  ctx.fill();
  // Tail.
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(-r - r * 0.7, -r * 0.5 + wag * r);
  ctx.lineTo(-r - r * 0.7, r * 0.5 + wag * r);
  ctx.closePath();
  ctx.fillStyle = stunned ? "#7a7f86" : `hsl(${bodyHue},35%,${c.behavior === "hunt" ? "48%" : "52%"})`;
  ctx.fill();
  // Top fin.
  ctx.beginPath();
  ctx.moveTo(r * 0.1, -r * 0.5);
  ctx.lineTo(-r * 0.3, -r);
  ctx.lineTo(-r * 0.4, -r * 0.45);
  ctx.closePath();
  ctx.fill();
  // Eye — red ring when hunting.
  ctx.beginPath();
  ctx.arc(r * 0.55, -r * 0.12, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.58, -r * 0.12, r * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = c.behavior === "hunt" && !stunned ? "#d11" : "#111";
  ctx.fill();
  ctx.restore();
}

function drawShrimp(ctx: CanvasRenderingContext2D, c: Creature) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(c.dirX, 1);
  ctx.beginPath();
  ctx.ellipse(0, 0, c.r, c.r * 0.55, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${c.hue},70%,72%)`;
  ctx.fill();
  ctx.strokeStyle = `hsl(${c.hue},60%,50%)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(c.r * 0.6, -c.r * 0.2);
  ctx.lineTo(c.r * 1.2, -c.r * 0.6);
  ctx.moveTo(c.r * 0.6, -c.r * 0.2);
  ctx.lineTo(c.r * 1.2, -c.r * 0.1);
  ctx.stroke();
  ctx.restore();
}

function drawCrab(ctx: CanvasRenderingContext2D, c: Creature) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.beginPath();
  ctx.ellipse(0, 0, c.r, c.r * 0.7, 0, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${c.hue},65%,52%)`;
  ctx.fill();
  ctx.strokeStyle = `hsl(${c.hue},60%,38%)`;
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * c.r * 0.7, 0);
    ctx.lineTo(s * c.r * 1.5, -c.r * 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(-c.r * 0.3, -c.r * 0.4, 2, 0, Math.PI * 2);
  ctx.arc(c.r * 0.3, -c.r * 0.4, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draw a soft octopus silhouette (shared by player + mate + babies). */
function octoShape(
  ctx: CanvasRenderingContext2D,
  size: number,
  now: number,
  color: [number, number, number],
  facing: number,
  legPhase: number,
  eyeAlpha = 1
) {
  ctx.save();
  ctx.scale(facing, 1);
  // Tentacles.
  ctx.fillStyle = rgb(color);
  for (let i = 0; i < 6; i++) {
    const a = -0.9 + (i / 5) * 1.8;
    const len = size * 2.2;
    const wave = Math.sin(now * 0.005 + i + legPhase) * size * 0.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * size * 0.5, size * 0.4);
    ctx.quadraticCurveTo(
      Math.cos(a) * size * 1.2 + wave,
      size * 0.4 + len * 0.6,
      Math.cos(a) * size * 0.7 + wave,
      size * 0.4 + len
    );
    ctx.lineWidth = size * 0.55;
    ctx.strokeStyle = rgb(color);
    ctx.lineCap = "round";
    ctx.stroke();
  }
  // Head/mantle.
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.2, size, size * 1.25, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgb(color);
  ctx.fill();
  // Eyes — faded out as camouflage strengthens so they don't give you away.
  ctx.save();
  ctx.globalAlpha = eyeAlpha;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-size * 0.4, -size * 0.4, size * 0.28, 0, Math.PI * 2);
  ctx.arc(size * 0.4, -size * 0.4, size * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#101820";
  ctx.beginPath();
  ctx.arc(-size * 0.36, -size * 0.4, size * 0.13, 0, Math.PI * 2);
  ctx.arc(size * 0.44, -size * 0.4, size * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawOctopus(ctx: CanvasRenderingContext2D, world: World, now: number) {
  const o = world.octo;
  const bg = bgColorAt(world, o.y);
  // Blend body toward background by camo amount.
  let color = mix(OCTO_BASE, bg, o.camo * 0.97);

  // Senescence: an aging octopus visibly drains of colour, fading toward a
  // washed-out grey as the end approaches.
  if (world.weakening > 0)
    color = mix(color, [126, 128, 134], world.weakening * 0.85);

  ctx.save();
  ctx.translate(o.x, o.y);

  // Courtship display: pulsing warm glow + color shift. Only in the courtship
  // chapter — elsewhere the octopus should never look "powered up".
  if (world.chapter === 4 && o.flash > 0.02) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.02);
    color = mix(color, [255, 170, 60], o.flash * (0.4 + pulse * 0.4));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.arc(0, 0, o.size * (2.4 + pulse), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,150,40,${0.25 * o.flash})`;
    ctx.fill();
    ctx.restore();
  }

  // Hurt flash.
  if (o.invuln > 0 && Math.floor(o.invuln * 12) % 2 === 0) {
    color = mix(color, [255, 60, 60], 0.5);
  }

  octoShape(ctx, o.size, now, color, o.facing, 0, 1 - o.camo * 0.88);

  // Carried shell.
  if (o.carrying > 0) drawShellShape(ctx, 0, o.size * 1.6, o.size * 0.5, 30);

  ctx.restore();
}

function drawMate(ctx: CanvasRenderingContext2D, c: Creature, now: number) {
  ctx.save();
  ctx.translate(c.x, c.y);
  const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
  octoShape(ctx, c.r, now, mix([200, 90, 150], [255, 140, 80], pulse * 0.4), c.dirX, 2, 1);
  ctx.restore();
}

function drawEggs(ctx: CanvasRenderingContext2D, c: Creature, now: number) {
  ctx.save();
  ctx.translate(c.x, c.y);
  // Hanging strands of eggs.
  const r = rng(31);
  for (let s = 0; s < 5; s++) {
    const sx = (s - 2) * 9;
    ctx.strokeStyle = "rgba(255,240,220,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, -c.r);
    const sway = Math.sin(now * 0.003 + s) * 4;
    for (let e = 0; e < 6; e++) {
      const ey = -c.r + e * 7;
      ctx.lineTo(sx + sway * (e / 6), ey);
    }
    ctx.stroke();
    for (let e = 0; e < 6; e++) {
      const ey = -c.r + e * 7;
      ctx.beginPath();
      ctx.arc(sx + sway * (e / 6), ey, 3 + r() * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,238,200,0.92)";
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawBaby(ctx: CanvasRenderingContext2D, c: Creature, now: number) {
  ctx.save();
  ctx.translate(c.x, c.y);
  octoShape(ctx, c.r, now, [180, 200, 220], 1, c.wobble, 1);
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Ink cloud expanding + fading. */
function drawInk(ctx: CanvasRenderingContext2D, world: World, now: number) {
  if (!world.ink.active) return;
  const t = clamp((now - world.ink.t) / 1800, 0, 1);
  const r = 30 + t * 130;
  ctx.save();
  ctx.globalAlpha = (1 - t) * 0.8;
  const grad = ctx.createRadialGradient(
    world.ink.x,
    world.ink.y,
    0,
    world.ink.x,
    world.ink.y,
    r
  );
  grad.addColorStop(0, "rgba(15,10,25,0.95)");
  grad.addColorStop(1, "rgba(15,10,25,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(world.ink.x, world.ink.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Heart animation between octopuses during successful courtship. */
function drawMateHearts(ctx: CanvasRenderingContext2D, world: World, now: number) {
  const mate = world.creatures.find((c) => c.kind === "mate");
  if (!mate) return;

  const elapsed = now - world.mateSuccessTime;
  const duration = 2500;
  const progress = clamp(elapsed / duration, 0, 1);

  const midX = (world.octo.x + mate.x) / 2;
  const midY = (world.octo.y + mate.y) / 2 - 30;

  ctx.save();

  // Multiple hearts floating up
  for (let i = 0; i < 3; i++) {
    const heartOffset = i * 150;
    const heartProgress = clamp((elapsed - heartOffset) / 1000, 0, 1);
    if (heartProgress <= 0) continue;

    const floatY = heartProgress * 40;
    const alpha = (1 - heartProgress) * (1 - progress);
    const scale = 1 + heartProgress * 0.5;

    ctx.save();
    ctx.translate(midX, midY - floatY);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    // Draw heart shape
    ctx.fillStyle = "#ff4466";
    ctx.beginPath();
    const heartSize = 12;
    ctx.moveTo(0, heartSize * 0.3);
    ctx.bezierCurveTo(-heartSize, -heartSize * 0.5, -heartSize, -heartSize, 0, -heartSize * 0.8);
    ctx.bezierCurveTo(heartSize, -heartSize, heartSize, -heartSize * 0.5, 0, heartSize * 0.3);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}
