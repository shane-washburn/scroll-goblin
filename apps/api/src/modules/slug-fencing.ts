import { Hono } from "hono";
import {
  SlugCreateRoomRequestSchema,
  SlugInputRequestSchema,
  SlugRoomIdSchema,
  SlugStateRequestSchema,
  type SlugGuestInput,
  type SlugRoomSnapshot,
} from "@scroll-goblin/shared";
import { getRedis } from "../redis.js";

/**
 * Slug Fencing multiplayer rooms. Mounted under `/slug-fencing`, so production
 * paths are `/api/slug-fencing/v1/rooms...`.
 *
 * Design (host-authoritative, race-free):
 *  - One Redis HASH per room. The host is the sole writer of the `snapshot`
 *    field; the guest is the sole writer of the `input` field. Because writers
 *    never touch the same field, there are no lost-update races even though
 *    both poll concurrently.
 *  - Every sync refreshes a short TTL, so abandoned and finished rooms expire
 *    on their own. Nothing is persisted long-term — match state is transient.
 *  - Tokens are unguessable per-role secrets; the guest never receives the
 *    host token (or vice-versa), and snapshots returned to clients omit both.
 */
export const slugFencingRouter = new Hono();

const ROOM_TTL_SECONDS = 120;
/**
 * Re-issue EXPIRE at most this often (ms) rather than on every sync, to conserve
 * Redis commands. Must stay comfortably under ROOM_TTL_SECONDS so a live room's
 * key never lapses between refreshes.
 */
const TTL_REFRESH_MS = 30_000;
const ROOM_ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const roomKey = (id: string) => `slug-fencing:room:${id}`;
const rateKey = (ip: string, bucket: number) =>
  `slug-fencing:rate:${ip}:${bucket}`;

const RATE_WINDOW_SECONDS = 60 * 10;
const MAX_ROOMS_PER_WINDOW = 30;

interface RoomHash {
  hostToken: string;
  /** Empty string until a guest joins. */
  guestToken: string;
  snapshot: SlugRoomSnapshot;
  input: SlugGuestInput;
  /** Epoch ms of the last EXPIRE refresh, so syncs can throttle it. */
  ttlAt: number;
}

type RedisClient = NonNullable<ReturnType<typeof getRedis>>;

function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}

function newRoomId(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ROOM_ID_ALPHABET[b % ROOM_ID_ALPHABET.length]).join(
    ""
  );
}

function newToken(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const MID_Y = (72 + 312) / 2;

function freshSnapshot(roomId: string, scoreToWin: number): SlugRoomSnapshot {
  return {
    roomId,
    scoreToWin,
    phase: "lobby",
    startAt: null,
    guestJoined: false,
    score1: 0,
    score2: 0,
    p1: { y: MID_Y, energy: 100, lungePhase: 0 },
    p2: { y: MID_Y, energy: 100, lungePhase: 0 },
    winner: null,
    rematchHost: false,
    rematchGuest: false,
    seq: 0,
    updatedAt: Date.now(),
  };
}

function freshInput(): SlugGuestInput {
  return { targetY: MID_Y, lungeSeq: 0, joined: false, rematch: false };
}

/** Strip server-only secrets before returning a snapshot to any client. */
function publicSnapshot(snapshot: SlugRoomSnapshot): SlugRoomSnapshot {
  return snapshot;
}

/**
 * Read and deserialize a room hash (the Upstash client parses JSON values
 * automatically). Returns null when the room is absent or already expired.
 */
async function readRoom(redis: RedisClient, id: string): Promise<RoomHash | null> {
  const data = await redis.hgetall<Record<string, unknown>>(roomKey(id));
  if (!data || Object.keys(data).length === 0) return null;
  return {
    hostToken: (data.hostToken as string) ?? "",
    guestToken: (data.guestToken as string) || "",
    snapshot: data.snapshot as SlugRoomSnapshot,
    input: (data.input as SlugGuestInput) ?? freshInput(),
    ttlAt: Number(data.ttlAt ?? 0),
  };
}

slugFencingRouter.post("/v1/rooms", async (c) => {
  const redis = getRedis();
  if (!redis) return c.json({ error: "Multiplayer is not configured." }, 503);

  const body = await c.req.json().catch(() => null);
  const parsed = SlugCreateRoomRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  // Rate-limit room creation per IP so nobody can spam thousands of rooms.
  const ip = clientIp(c.req.raw.headers);
  const bucket = Math.floor(Date.now() / (RATE_WINDOW_SECONDS * 1000));
  const rk = rateKey(ip, bucket);
  const count = await redis.incr(rk);
  if (count === 1) await redis.expire(rk, RATE_WINDOW_SECONDS);
  if (count > MAX_ROOMS_PER_WINDOW) {
    return c.json({ error: "Too many rooms created. Try again later." }, 429);
  }

  const roomId = newRoomId();
  const hostToken = newToken();
  const snapshot = freshSnapshot(roomId, parsed.data.scoreToWin);

  try {
    await redis.hset(roomKey(roomId), {
      hostToken,
      guestToken: "",
      snapshot,
      input: freshInput(),
      ttlAt: Date.now(),
    });
    await redis.expire(roomKey(roomId), ROOM_TTL_SECONDS);
  } catch (err) {
    console.error("Slug room create failed:", err);
    return c.json({ error: "Could not create room." }, 502);
  }

  return c.json({ roomId, hostToken, snapshot: publicSnapshot(snapshot) });
});

slugFencingRouter.get("/v1/rooms/:id", async (c) => {
  const id = c.req.param("id");
  if (!SlugRoomIdSchema.safeParse(id).success) {
    return c.json({ error: "Room not found." }, 404);
  }
  const redis = getRedis();
  if (!redis) return c.json({ error: "Multiplayer is not configured." }, 503);

  const room = await readRoom(redis, id);
  if (!room) return c.json({ error: "Room not found." }, 404);
  return c.json({ snapshot: publicSnapshot(room.snapshot) });
});

slugFencingRouter.post("/v1/rooms/:id/join", async (c) => {
  const id = c.req.param("id");
  if (!SlugRoomIdSchema.safeParse(id).success) {
    return c.json({ error: "Room not found." }, 404);
  }
  const redis = getRedis();
  if (!redis) return c.json({ error: "Multiplayer is not configured." }, 503);

  const room = await readRoom(redis, id);
  if (!room) return c.json({ error: "Room not found." }, 404);
  if (room.guestToken) return c.json({ error: "Room is full." }, 409);

  const guestToken = newToken();
  const input: SlugGuestInput = { ...freshInput(), joined: true };
  try {
    await redis.hset(roomKey(id), { guestToken, input, ttlAt: Date.now() });
    await redis.expire(roomKey(id), ROOM_TTL_SECONDS);
  } catch (err) {
    console.error("Slug room join failed:", err);
    return c.json({ error: "Could not join room." }, 502);
  }

  return c.json({ guestToken, snapshot: publicSnapshot(room.snapshot) });
});

slugFencingRouter.post("/v1/rooms/:id/guest-sync", async (c) => {
  const id = c.req.param("id");
  if (!SlugRoomIdSchema.safeParse(id).success) {
    return c.json({ error: "Room not found." }, 404);
  }
  const redis = getRedis();
  if (!redis) return c.json({ error: "Multiplayer is not configured." }, 503);

  const body = await c.req.json().catch(() => null);
  const parsed = SlugInputRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request" }, 400);
  }

  const room = await readRoom(redis, id);
  if (!room) return c.json({ error: "Room not found." }, 404);
  if (room.guestToken !== parsed.data.token) {
    return c.json({ error: "Not authorized for this room." }, 403);
  }

  const input: SlugGuestInput = {
    targetY: parsed.data.targetY,
    lungeSeq: parsed.data.lungeSeq,
    joined: true,
    rematch: parsed.data.rematch ?? false,
  };
  const now = Date.now();
  const refreshTtl = now - room.ttlAt > TTL_REFRESH_MS;
  try {
    await redis.hset(roomKey(id), refreshTtl ? { input, ttlAt: now } : { input });
    if (refreshTtl) await redis.expire(roomKey(id), ROOM_TTL_SECONDS);
  } catch (err) {
    console.error("Slug guest-sync failed:", err);
    return c.json({ error: "Sync failed." }, 502);
  }

  return c.json({ snapshot: publicSnapshot(room.snapshot) });
});

slugFencingRouter.post("/v1/rooms/:id/host-sync", async (c) => {
  const id = c.req.param("id");
  if (!SlugRoomIdSchema.safeParse(id).success) {
    return c.json({ error: "Room not found." }, 404);
  }
  const redis = getRedis();
  if (!redis) return c.json({ error: "Multiplayer is not configured." }, 503);

  const body = await c.req.json().catch(() => null);
  const parsed = SlugStateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const room = await readRoom(redis, id);
  if (!room) return c.json({ error: "Room not found." }, 404);
  if (room.hostToken !== parsed.data.token) {
    return c.json({ error: "Not authorized for this room." }, 403);
  }

  const input = room.input;
  const guestJoined = Boolean(room.guestToken) || input.joined;
  const now = Date.now();

  // Server owns the guest-derived fields so they can't be spoofed by the host.
  const snapshot: SlugRoomSnapshot = {
    roomId: id,
    scoreToWin: parsed.data.scoreToWin,
    phase: parsed.data.phase,
    startAt: parsed.data.startAt,
    guestJoined,
    score1: parsed.data.score1,
    score2: parsed.data.score2,
    p1: parsed.data.p1,
    p2: parsed.data.p2,
    winner: parsed.data.winner,
    rematchHost: parsed.data.rematchHost,
    rematchGuest: input.rematch,
    seq: parsed.data.seq,
    updatedAt: now,
  };

  const refreshTtl = now - room.ttlAt > TTL_REFRESH_MS;
  try {
    await redis.hset(roomKey(id), refreshTtl ? { snapshot, ttlAt: now } : { snapshot });
    if (refreshTtl) await redis.expire(roomKey(id), ROOM_TTL_SECONDS);
  } catch (err) {
    console.error("Slug host-sync failed:", err);
    return c.json({ error: "Sync failed." }, 502);
  }

  return c.json({ input });
});
