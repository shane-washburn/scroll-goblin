/**
 * Drives the multiplayer network cadence, decoupled from the 60fps render loop.
 *
 * On an interval (fast during a live point, slow in lobby/victory):
 *  - the HOST pushes its authoritative state and receives the guest's input,
 *  - the GUEST pushes its input and receives the authoritative snapshot.
 *
 * Callbacks are read through refs so changing them never resubscribes the
 * interval, and in-flight requests are guarded so a slow round-trip can't
 * stack up overlapping calls.
 */
import { useEffect, useRef } from "react";
import type { SlugRoomSnapshot } from "@scroll-goblin/shared";
import {
  TransportError,
  type GuestInputMsg,
  type HostState,
  type RoomTransport,
} from "./transport";

interface RoomSyncOptions {
  transport: RoomTransport | null;
  intervalMs: number;
  /** Host only: the authoritative state to push this tick. */
  getHostState?: () => HostState;
  /** Guest only: the input to push this tick. */
  getGuestInput?: () => { targetY: number; lungeSeq: number; rematch?: boolean };
  /** Host only: latest guest input received. */
  onGuestInput?: (input: GuestInputMsg) => void;
  /** Guest only: latest authoritative snapshot received. */
  onSnapshot?: (snapshot: SlugRoomSnapshot) => void;
  /** Called when the room is gone (404) so the UI can bail out. */
  onRoomGone?: () => void;
}

export function useRoomSync(opts: RoomSyncOptions): void {
  const ref = useRef(opts);
  ref.current = opts;

  useEffect(() => {
    const transport = opts.transport;
    if (!transport) return;

    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      const o = ref.current;
      try {
        if (transport.role === "host" && o.getHostState) {
          const input = await transport.pushHostState(o.getHostState());
          if (!cancelled && input) o.onGuestInput?.(input);
        } else if (transport.role === "guest" && o.getGuestInput) {
          const snap = await transport.pushGuestInput(o.getGuestInput());
          if (!cancelled && snap) o.onSnapshot?.(snap);
        }
      } catch (err) {
        if (err instanceof TransportError && err.status === 404) {
          o.onRoomGone?.();
        }
      } finally {
        inFlight = false;
      }
    };

    // Fire immediately so joins/handoffs feel responsive, then on interval.
    void tick();
    const id = setInterval(tick, opts.intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // Resubscribe only when the transport or cadence changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.transport, opts.intervalMs]);
}
