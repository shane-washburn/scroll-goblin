/**
 * Multiplayer transport for Slug Fencing.
 *
 * All realtime I/O goes through the `RoomTransport` interface so the engine and
 * UI never call `fetch` directly. Today the only implementation is
 * `PollingTransport` (HTTP polling against our Hono API, ~250ms). If we ever
 * need true sub-100ms play, a `SocketTransport` (PartyKit/Ably/etc.) can drop
 * in behind the same interface without touching the game or screens.
 */
import type {
  SlugFencerState,
  SlugRoomSnapshot,
  SlugPhase,
} from "@scroll-goblin/shared";

// This source-shipped package is compiled by the consuming app's Vite build,
// which injects import.meta.env; the cast avoids needing vite types here.
const viteEnv = (import.meta as unknown as { env?: Record<string, string> })
  .env;
const API_BASE_URL = (
  viteEnv?.VITE_API_BASE_URL ?? "http://localhost:8787"
).replace(/\/+$/, "");
const ROOMS_URL = `${API_BASE_URL}/slug-fencing/v1/rooms`;

export type Role = "host" | "guest";

/** Authoritative gameplay fields the host pushes each sync. */
export interface HostState {
  scoreToWin: number;
  phase: SlugPhase;
  startAt: number | null;
  score1: number;
  score2: number;
  p1: SlugFencerState;
  p2: SlugFencerState;
  winner: number | null;
  rematchHost: boolean;
  seq: number;
}

/** The guest input the host receives back from a host sync. */
export interface GuestInputMsg {
  targetY: number;
  lungeSeq: number;
  joined: boolean;
  rematch: boolean;
}

export interface RoomTransport {
  readonly role: Role;
  readonly roomId: string;
  /** Host: persist authoritative state; resolves with the latest guest input. */
  pushHostState(state: HostState): Promise<GuestInputMsg | null>;
  /** Guest: send input; resolves with the latest authoritative snapshot. */
  pushGuestInput(input: {
    targetY: number;
    lungeSeq: number;
    rematch?: boolean;
  }): Promise<SlugRoomSnapshot | null>;
  /** Either role: a passive read of the latest snapshot (lobby / pre-play). */
  fetchSnapshot(): Promise<SlugRoomSnapshot | null>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new TransportError(
      (detail as { error?: string }).error ?? `Request failed (${res.status})`,
      res.status
    );
  }
  return (await res.json()) as T;
}

export class TransportError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TransportError";
    this.status = status;
  }
}

class PollingTransport implements RoomTransport {
  constructor(
    readonly role: Role,
    readonly roomId: string,
    private readonly token: string
  ) {}

  async pushHostState(state: HostState): Promise<GuestInputMsg | null> {
    try {
      const { input } = await postJson<{ input: GuestInputMsg }>(
        `${ROOMS_URL}/${this.roomId}/host-sync`,
        { token: this.token, ...state }
      );
      return input;
    } catch (err) {
      if (err instanceof TransportError && err.status === 404) throw err;
      return null; // transient: keep simulating, retry next tick
    }
  }

  async pushGuestInput(input: {
    targetY: number;
    lungeSeq: number;
    rematch?: boolean;
  }): Promise<SlugRoomSnapshot | null> {
    try {
      const { snapshot } = await postJson<{ snapshot: SlugRoomSnapshot }>(
        `${ROOMS_URL}/${this.roomId}/guest-sync`,
        { token: this.token, ...input }
      );
      return snapshot;
    } catch (err) {
      if (err instanceof TransportError && err.status === 404) throw err;
      return null;
    }
  }

  async fetchSnapshot(): Promise<SlugRoomSnapshot | null> {
    try {
      const res = await fetch(`${ROOMS_URL}/${this.roomId}`);
      if (!res.ok) return null;
      const { snapshot } = (await res.json()) as { snapshot: SlugRoomSnapshot };
      return snapshot;
    } catch {
      return null;
    }
  }
}

/** Create a new room as host. */
export async function createRoom(
  scoreToWin: number
): Promise<{ transport: RoomTransport; snapshot: SlugRoomSnapshot }> {
  const { roomId, hostToken, snapshot } = await postJson<{
    roomId: string;
    hostToken: string;
    snapshot: SlugRoomSnapshot;
  }>(ROOMS_URL, { scoreToWin });
  return {
    transport: new PollingTransport("host", roomId, hostToken),
    snapshot,
  };
}

/** Join an existing room as guest. */
export async function joinRoom(
  roomId: string
): Promise<{ transport: RoomTransport; snapshot: SlugRoomSnapshot }> {
  const { guestToken, snapshot } = await postJson<{
    guestToken: string;
    snapshot: SlugRoomSnapshot;
  }>(`${ROOMS_URL}/${roomId}/join`, {});
  return {
    transport: new PollingTransport("guest", roomId, guestToken),
    snapshot,
  };
}

/** Read a room snapshot without joining (used to preview the lobby). */
export async function peekRoom(
  roomId: string
): Promise<SlugRoomSnapshot | null> {
  try {
    const res = await fetch(`${ROOMS_URL}/${roomId}`);
    if (!res.ok) return null;
    const { snapshot } = (await res.json()) as { snapshot: SlugRoomSnapshot };
    return snapshot;
  } catch {
    return null;
  }
}

/**
 * How often the client polls during a live point (ms).
 *
 * Balances latency against Upstash Free's 500k commands/month budget. At 120ms
 * each match costs ~50 cmds/s (both players), and combined with the server's
 * throttled TTL refresh that lands at a few hundred free matches/month. Lower
 * it for snappier play (more commands) or raise it to stretch the budget.
 */
export const ACTIVE_POLL_MS = 120;
/** Slower cadence for lobby / countdown / victory, where latency doesn't matter. */
export const IDLE_POLL_MS = 500;
