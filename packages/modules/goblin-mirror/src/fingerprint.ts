/**
 * Real, honest device fingerprinting — all client-side, nothing leaves the
 * browser.
 *
 * Uniqueness method: each signal carries a BASE entropy (bits) drawn from
 * published browser-fingerprinting research (EFF Panopticlick, AmIUnique),
 * scaled by a coarse "commonness" factor in [0,1] — the more your value
 * matches the popular default, the less it adds. Blocked/unavailable signals
 * contribute nothing. The summed bits give a "1 in 2^bits" estimate.
 *
 * This is a transparent heuristic, NOT a measured population statistic — a
 * true figure would require comparing against a live dataset of real
 * visitors (which would mean sending data off-device). The UI labels it as
 * an estimate.
 */

export interface FingerprintSignal {
  /** Human-readable label, e.g. "Browser". */
  label: string;
  /** Resolved value shown to the user. */
  value: string;
  /**
   * Estimated fraction of people who share this exact value (0-1). Lower =
   * rarer = more identifying. Rough global estimate (calibrated against
   * AmIUnique-style population stats), not a measured live statistic.
   */
  share: number;
  /**
   * Entropy (in bits) this signal contributes, derived as -log2(share).
   * Higher = more identifying.
   */
  bits: number;
  /**
   * Display grouping only (does NOT affect entropy): "primary" signals are
   * human-meaningful and shown up front; "technical" ones are tucked behind a
   * details toggle but still count toward uniqueness.
   */
  tier: "primary" | "technical";
}

export interface Fingerprint {
  /** Short stable hash of all signals combined, e.g. "a3f9c1d2". */
  hash: string;
  /** The individual signals, for display. */
  signals: FingerprintSignal[];
  /** Total estimated entropy in bits. */
  totalBits: number;
  /** Estimated "1 in N" uniqueness derived from totalBits. */
  oneInN: number;
  /** Coarse label: "Common" | "Moderately Unique" | "Highly Unique". */
  rarity: "Common" | "Moderately Unique" | "Highly Unique";
}

/** FNV-1a 32-bit hash → 8-char hex string. Deterministic, no deps. */
function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/chrome|chromium|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Unknown";
}

function detectOS(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown";
}

function timezoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
  } catch {
    return "Unknown";
  }
}

/**
 * Renders a small canvas with text + shapes and hashes the pixel output.
 * Subtle differences in GPU, drivers, fonts, and anti-aliasing make this
 * value vary between devices — the backbone of fingerprinting.
 */
function canvasSignal(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-canvas";
    ctx.textBaseline = "top";
    ctx.font = "16px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(10, 10, 100, 30);
    ctx.fillStyle = "#069";
    ctx.fillText("Goblin sees you 🧌", 12, 14);
    ctx.strokeStyle = "rgba(120,200,50,0.7)";
    ctx.beginPath();
    ctx.arc(180, 30, 20, 0, Math.PI * 2);
    ctx.stroke();
    return hashString(canvas.toDataURL());
  } catch {
    return "blocked";
  }
}

/** Reads the GPU vendor/renderer string via WebGL's debug extension. */
function webglSignal(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "no-webgl";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (!dbg) return "no-debug";
    const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string;
    return renderer || "unknown";
  } catch {
    return "blocked";
  }
}

/** Resolved-timezone strings shared by a large share of visitors. */
const COMMON_TIMEZONES = new Set([
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Moscow",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
]);

/** Popular desktop + mobile screen resolutions (width\u00d7height). */
const COMMON_RESOLUTIONS = new Set([
  "1920\u00d71080",
  "1366\u00d7768",
  "1536\u00d7864",
  "1440\u00d7900",
  "1280\u00d7720",
  "2560\u00d71440",
  "1280\u00d7800",
  "375\u00d7667",
  "390\u00d7844",
  "393\u00d7873",
  "414\u00d7896",
  "360\u00d7800",
  "412\u00d7915",
]);

// The functions below return an estimated GLOBAL population SHARE (0-1) for a
// value: the fraction of people whose value matches. Lower = rarer = more
// identifying. Figures are rough, calibrated against public fingerprinting
// stats (AmIUnique, browser/OS market share) — for display, not precision.

function browserShare(b: string): number {
  switch (b) {
    case "Chrome":
      return 0.64;
    case "Safari":
      return 0.18;
    case "Edge":
      return 0.05;
    case "Firefox":
      return 0.03;
    case "Opera":
      return 0.02;
    default:
      return 0.02;
  }
}

function osShare(o: string): number {
  switch (o) {
    case "Android":
      return 0.43;
    case "Windows":
      return 0.29;
    case "iOS":
      return 0.17;
    case "macOS":
      return 0.09;
    case "Linux":
      return 0.01;
    default:
      return 0.01;
  }
}

function languageShare(lang: string): number {
  const l = lang.toLowerCase();
  if (l === "en-us") return 0.34;
  if (l.startsWith("en")) return 0.16;
  return 0.04;
}

function platformShare(p: string): number {
  if (/win/i.test(p)) return 0.36;
  if (/mac/i.test(p)) return 0.16;
  if (/linux/i.test(p)) return 0.02;
  if (/arm|iphone|ipad|android/i.test(p)) return 0.2;
  return 0.1;
}

function coresShare(c: string): number {
  switch (c) {
    case "0":
      return 0.3; // hidden by the browser
    case "2":
      return 0.1;
    case "4":
      return 0.26;
    case "6":
      return 0.12;
    case "8":
      return 0.3;
    case "12":
      return 0.08;
    case "16":
      return 0.1;
    default:
      return 0.05;
  }
}

function memoryShare(m: string): number {
  if (m === "Hidden") return 0.45;
  if (m === "8 GB") return 0.3;
  if (m === "4 GB") return 0.22;
  if (m === "2 GB") return 0.08;
  const n = parseInt(m, 10);
  if (!Number.isNaN(n) && n >= 16) return 0.03;
  return 0.1;
}

function mediaMatch(query: string): boolean {
  try {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia(query).matches
    );
  } catch {
    return false;
  }
}

/**
 * Detects which of a probe list of fonts are installed by comparing the
 * rendered width of a test string against generic-family baselines. The
 * specific SET of present fonts is highly identifying; we display the count
 * but hash the full set.
 */
function detectFonts(): { value: string; key: string; available: boolean } {
  try {
    const baseFonts = ["monospace", "sans-serif", "serif"];
    const probes = [
      "Arial",
      "Courier New",
      "Georgia",
      "Times New Roman",
      "Verdana",
      "Comic Sans MS",
      "Impact",
      "Trebuchet MS",
      "Tahoma",
      "Palatino Linotype",
      "Segoe UI",
      "Calibri",
      "Cambria",
      "Consolas",
      "Garamond",
      "Menlo",
      "Helvetica Neue",
    ];
    const testString = "mmmmmmmmmmlli";
    const testSize = "72px";
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return { value: "blocked", key: "blocked", available: false };
    const baseWidths: Record<string, number> = {};
    for (const b of baseFonts) {
      ctx.font = `${testSize} ${b}`;
      baseWidths[b] = ctx.measureText(testString).width;
    }
    const present: string[] = [];
    for (const f of probes) {
      for (const b of baseFonts) {
        ctx.font = `${testSize} '${f}',${b}`;
        if (ctx.measureText(testString).width !== baseWidths[b]) {
          present.push(f);
          break;
        }
      }
    }
    return {
      value: `${present.length}/${probes.length} detected`,
      key: present.join(","),
      available: true,
    };
  } catch {
    return { value: "blocked", key: "blocked", available: false };
  }
}

export function isTouchDevice(): boolean {
  return (
    "ontouchstart" in window ||
    (navigator.maxTouchPoints ?? 0) > 0 ||
    /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
  );
}

/** Collect every signal and assemble the fingerprint. Pure, synchronous. */
export function collectFingerprint(): Fingerprint {
  const ua = navigator.userAgent;
  const browser = detectBrowser(ua);
  const os = detectOS(ua);
  const tz = timezoneLabel();
  const lang = navigator.language || "unknown";
  const screenRes = `${window.screen.width}\u00d7${window.screen.height}`;
  const pixelRatio = String(window.devicePixelRatio || 1);
  const cores = String(navigator.hardwareConcurrency ?? 0);
  const mem = (navigator as { deviceMemory?: number }).deviceMemory;
  const memory = mem ? `${mem} GB` : "Hidden";
  const touch = isTouchDevice() ? "Touch" : "Pointer";
  const canvas = canvasSignal();
  const webgl = webglSignal();
  const fonts = detectFonts();
  const colorDepth = window.screen.colorDepth || 0;
  const availScreen = `${window.screen.availWidth}\u00d7${window.screen.availHeight}`;
  const platform =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData
      ?.platform ||
    (navigator as { platform?: string }).platform ||
    "Unknown";
  const colorScheme = mediaMatch("(prefers-color-scheme: dark)")
    ? "Dark"
    : "Light";
  const reducedMotion = mediaMatch("(prefers-reduced-motion: reduce)");
  const dnt =
    navigator.doNotTrack === "1" ||
    (window as { doNotTrack?: string }).doNotTrack === "1"
      ? "Enabled"
      : "Off";
  const touchPoints = navigator.maxTouchPoints ?? 0;
  const mobile = isTouchDevice();

  // Each signal carries an estimated population SHARE (0-1). `key` overrides
  // the hashed token when the display value hides detail (e.g. fonts).
  const entries: Array<{
    label: string;
    value: string;
    share: number;
    tier: "primary" | "technical";
    key?: string;
  }> = [
    {
      label: "Browser",
      value: browser,
      share: browserShare(browser),
      tier: "primary",
    },
    {
      label: "Operating System",
      value: os,
      share: osShare(os),
      tier: "primary",
    },
    {
      label: "Timezone",
      value: tz,
      share: COMMON_TIMEZONES.has(tz) ? 0.05 : 0.012,
      tier: "primary",
    },
    {
      label: "Language",
      value: lang,
      share: languageShare(lang),
      tier: "primary",
    },
    {
      label: "Screen",
      value: `${screenRes} @ ${pixelRatio}x`,
      share: COMMON_RESOLUTIONS.has(screenRes) ? 0.06 : 0.02,
      tier: "primary",
    },
    {
      label: "Color Scheme",
      value: colorScheme,
      share: colorScheme === "Dark" ? 0.45 : 0.55,
      tier: "primary",
    },
    {
      label: "Usable Screen",
      value: availScreen,
      share: 0.25,
      tier: "technical",
    },
    {
      label: "Color Depth",
      value: `${colorDepth}-bit`,
      share: colorDepth === 24 ? 0.85 : 0.08,
      tier: "technical",
    },
    {
      label: "CPU Cores",
      value: cores === "0" ? "Hidden" : cores,
      share: coresShare(cores),
      tier: "technical",
    },
    {
      label: "Device Memory",
      value: memory,
      share: memoryShare(memory),
      tier: "technical",
    },
    {
      label: "Platform",
      value: platform,
      share: platformShare(platform),
      tier: "technical",
    },
    {
      label: "Input Type",
      value: `${touch} (${touchPoints} pts)`,
      share: touch === "Touch" ? 0.45 : 0.5,
      tier: "technical",
    },
    {
      label: "Reduced Motion",
      value: reducedMotion ? "On" : "Off",
      share: reducedMotion ? 0.12 : 0.88,
      tier: "technical",
    },
    {
      label: "Do Not Track",
      value: dnt,
      share: dnt === "Enabled" ? 0.18 : 0.72,
      tier: "technical",
    },
    {
      label: "Fonts",
      value: fonts.value,
      // Mobile font lists are standardized per-OS, so far less identifying.
      share: !fonts.available ? 0.5 : mobile ? 0.25 : 0.03,
      tier: "technical",
      key: fonts.key,
    },
    {
      label: "Canvas Render",
      value: canvas,
      // Millions share identical phone models, so mobile canvas is far less
      // unique than desktop canvas (varied GPUs/drivers/fonts).
      share:
        canvas === "blocked" || canvas === "no-canvas"
          ? 0.6
          : mobile
            ? 0.02
            : 0.0008,
      tier: "technical",
    },
    {
      label: "GPU",
      value: webgl,
      // A handful of mobile GPUs are shared by hundreds of millions of phones.
      share: /no-|blocked/.test(webgl) ? 0.4 : mobile ? 0.06 : 0.004,
      tier: "technical",
    },
  ];

  const signals: FingerprintSignal[] = entries.map((e) => {
    const share = Math.min(1, Math.max(1e-6, e.share));
    return {
      label: e.label,
      value: e.value,
      share,
      bits: Math.round(-Math.log2(share) * 100) / 100,
      tier: e.tier,
    };
  });

  const combined = entries
    .map((e) => `${e.label}=${e.key ?? e.value}`)
    .join("|");
  const hash = hashString(combined);
  // Summing signals as if independent badly overstates uniqueness, because
  // many correlate: a given phone model locks its screen, GPU, canvas and
  // fonts together, and UA/platform/OS overlap. We apply a correlation
  // discount (stronger on mobile, where hardware is highly standardized) and
  // cap the result, so the estimate describes a believable TYPE of device
  // rather than claiming "1 in billions" for every visitor.
  const rawBits = signals.reduce((sum, s) => sum + s.bits, 0);
  const correlation = mobile ? 0.4 : 0.6;
  const cap = mobile ? 16 : 22;
  const totalBits = Math.min(rawBits * correlation, cap);
  const oneInN = Math.max(1, Math.round(Math.pow(2, totalBits)));
  const rarity =
    totalBits >= 18
      ? "Highly Unique"
      : totalBits >= 9
        ? "Moderately Unique"
        : "Common";

  return { hash, signals, totalBits, oneInN, rarity };
}

/** Format a "1 in N" number with thousands separators. */
export function formatOneInN(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} billion`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} million`;
  return n.toLocaleString("en-US");
}

/** Human-friendly "shared by ~X%" label for a population fraction. */
export function formatShare(share: number): string {
  const pct = share * 100;
  if (pct < 0.1) return "<0.1%";
  if (pct < 1) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}
