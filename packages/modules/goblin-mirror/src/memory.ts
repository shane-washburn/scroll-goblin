/**
 * The Goblin's "memory" — real cookie + localStorage state that genuinely
 * persists across visits, so a returning user sees real, growing numbers.
 * Nothing here is sent anywhere; it lives only in the visitor's browser.
 */

const COOKIE_VISITS = "goblin_visit_count";
const COOKIE_FIRST_SEEN = "goblin_first_seen";
const LS_TIME_WASTED = "goblin_total_time_ms";
const LS_LAST_SESSION = "goblin_last_session";

const COOKIE_KEYS = [COOKIE_VISITS, COOKIE_FIRST_SEEN];
const LS_KEYS = [LS_TIME_WASTED, LS_LAST_SESSION];

const DAY_MS = 24 * 60 * 60 * 1000;

export interface MemoryState {
  /** Number of recorded visits (cookie). */
  visits: number;
  /** Epoch ms of first recorded visit (cookie), or null if brand new. */
  firstSeen: number | null;
  /** Accumulated time spent across visits in ms (localStorage). */
  totalTimeMs: number;
  /** Whether cookies are currently present. */
  hasCookies: boolean;
  /** Whether localStorage entries are currently present. */
  hasLocalStorage: boolean;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeDays = 365): void {
  const maxAge = Math.round(maxAgeDays * 24 * 60 * 60);
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage may be disabled/full; ignore */
  }
}

/** Read the current memory state without mutating anything. */
export function readMemory(): MemoryState {
  const visitsRaw = readCookie(COOKIE_VISITS);
  const firstSeenRaw = readCookie(COOKIE_FIRST_SEEN);
  const timeRaw = lsGet(LS_TIME_WASTED);

  const cookieKeysPresent = COOKIE_KEYS.some((k) => readCookie(k) !== null);
  const lsKeysPresent = LS_KEYS.some((k) => lsGet(k) !== null);

  return {
    visits: visitsRaw ? Number(visitsRaw) || 0 : 0,
    firstSeen: firstSeenRaw ? Number(firstSeenRaw) || null : null,
    totalTimeMs: timeRaw ? Number(timeRaw) || 0 : 0,
    hasCookies: cookieKeysPresent,
    hasLocalStorage: lsKeysPresent,
  };
}

/**
 * Record a new visit: increments the cookie visit counter and stamps
 * first-seen if absent. Returns the updated state.
 */
export function recordVisit(): MemoryState {
  const current = readMemory();
  const visits = current.visits + 1;
  const firstSeen = current.firstSeen ?? Date.now();
  writeCookie(COOKIE_VISITS, String(visits));
  writeCookie(COOKIE_FIRST_SEEN, String(firstSeen));
  lsSet(LS_LAST_SESSION, String(Date.now()));
  // Ensure the time key exists so localStorage "memory" is visibly present.
  if (lsGet(LS_TIME_WASTED) === null) lsSet(LS_TIME_WASTED, "0");
  return readMemory();
}

/** Persist additional elapsed session time into the running total. */
export function addTimeSpent(ms: number): void {
  const current = Number(lsGet(LS_TIME_WASTED)) || 0;
  lsSet(LS_TIME_WASTED, String(current + Math.max(0, Math.round(ms))));
}

/** Wipe only the Goblin's cookies. Returns the resulting state. */
export function clearCookies(): MemoryState {
  COOKIE_KEYS.forEach(deleteCookie);
  return readMemory();
}

/** Wipe only the Goblin's localStorage entries. Returns the resulting state. */
export function clearLocalStorage(): MemoryState {
  try {
    LS_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  return readMemory();
}

/** "14 days ago" style relative label for the first-seen timestamp. */
export function relativeFirstSeen(firstSeen: number | null): string {
  if (!firstSeen) return "Just now";
  const diff = Date.now() - firstSeen;
  if (diff < 60_000) return "Just now";
  if (diff < DAY_MS) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return hours <= 1 ? "Earlier today" : `${hours} hours ago`;
  }
  const days = Math.floor(diff / DAY_MS);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

/** Exact local datetime, e.g. "Jun 3, 2026, 4:12 PM". */
export function exactFirstSeen(firstSeen: number | null): string {
  if (!firstSeen) return "moments ago";
  try {
    return new Date(firstSeen).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return new Date(firstSeen).toLocaleString();
  }
}

/** "2h 17m" style duration label. */
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
