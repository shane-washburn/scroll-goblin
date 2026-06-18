/**
 * Live behavioral tracking: scroll cadence, pointer/touch activity, and click
 * rate. We expose a tiny imperative tracker plus a React hook that snapshots
 * derived metrics on an interval. Everything stays in-memory and local.
 */

import { useEffect, useRef, useState } from "react";
import { isTouchDevice } from "./fingerprint";

export interface BehaviorMetrics {
  /** Seconds since tracking started. */
  sessionSeconds: number;
  /** Total scroll distance in pixels. */
  scrollDistance: number;
  /** Pointer/touch movement distance in pixels. */
  pointerDistance: number;
  /** Number of clicks/taps. */
  clicks: number;
  /** Number of distinct idle periods (>2s with no input). */
  idlePeriods: number;
  /** Scroll style classification. */
  scrollStyle: "Fast Scroller" | "Careful Reader" | "Still as Stone";
  /** Interaction style classification. */
  interactionStyle: "Explorer" | "Skimmer" | "Lurker";
  /** Whether the device is touch-based (changes labels in UI). */
  touch: boolean;
}

class BehaviorTracker {
  private startedAt = 0;
  private scrollDistance = 0;
  private pointerDistance = 0;
  private clicks = 0;
  private idlePeriods = 0;
  private lastScrollY = 0;
  private lastX: number | null = null;
  private lastY: number | null = null;
  private lastInputAt = 0;
  private bound = false;

  private onScroll = () => {
    const y = window.scrollY;
    this.scrollDistance += Math.abs(y - this.lastScrollY);
    this.lastScrollY = y;
    this.registerInput();
  };

  private onPointer = (e: PointerEvent | MouseEvent) => {
    if (this.lastX !== null && this.lastY !== null) {
      this.pointerDistance += Math.hypot(
        e.clientX - this.lastX,
        e.clientY - this.lastY
      );
    }
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.registerInput();
  };

  private onTouchMove = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    if (this.lastX !== null && this.lastY !== null) {
      this.pointerDistance += Math.hypot(
        t.clientX - this.lastX,
        t.clientY - this.lastY
      );
    }
    this.lastX = t.clientX;
    this.lastY = t.clientY;
    this.registerInput();
  };

  private onClick = () => {
    this.clicks += 1;
    this.registerInput();
  };

  private registerInput() {
    const now = Date.now();
    if (this.lastInputAt && now - this.lastInputAt > 2000) {
      this.idlePeriods += 1;
    }
    this.lastInputAt = now;
  }

  start() {
    if (this.bound) return;
    this.bound = true;
    this.startedAt = Date.now();
    this.lastInputAt = Date.now();
    this.lastScrollY = window.scrollY;
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    window.addEventListener("touchmove", this.onTouchMove, { passive: true });
    window.addEventListener("click", this.onClick, { passive: true });
  }

  stop() {
    if (!this.bound) return;
    this.bound = false;
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("pointermove", this.onPointer);
    window.removeEventListener("touchmove", this.onTouchMove);
    window.removeEventListener("click", this.onClick);
  }

  snapshot(): BehaviorMetrics {
    const touch = isTouchDevice();
    const sessionSeconds = Math.max(
      1,
      Math.floor((Date.now() - this.startedAt) / 1000)
    );
    const scrollPerSec = this.scrollDistance / sessionSeconds;
    const pointerPerSec = this.pointerDistance / sessionSeconds;

    const scrollStyle: BehaviorMetrics["scrollStyle"] =
      this.scrollDistance < 200
        ? "Still as Stone"
        : scrollPerSec > 300
          ? "Fast Scroller"
          : "Careful Reader";

    const activity = pointerPerSec + this.clicks * 20;
    const interactionStyle: BehaviorMetrics["interactionStyle"] =
      activity < 30 ? "Lurker" : activity > 200 ? "Explorer" : "Skimmer";

    return {
      sessionSeconds,
      scrollDistance: Math.round(this.scrollDistance),
      pointerDistance: Math.round(this.pointerDistance),
      clicks: this.clicks,
      idlePeriods: this.idlePeriods,
      scrollStyle,
      interactionStyle,
      touch,
    };
  }
}

/**
 * React hook: starts a behavior tracker on mount and returns a metrics
 * snapshot refreshed every `intervalMs`. Cleans up listeners on unmount.
 */
export function useBehaviorMetrics(intervalMs = 1000): BehaviorMetrics {
  const trackerRef = useRef<BehaviorTracker | null>(null);
  if (trackerRef.current === null) trackerRef.current = new BehaviorTracker();

  const [metrics, setMetrics] = useState<BehaviorMetrics>(() =>
    trackerRef.current!.snapshot()
  );

  useEffect(() => {
    const tracker = trackerRef.current!;
    tracker.start();
    const id = setInterval(() => setMetrics(tracker.snapshot()), intervalMs);
    return () => {
      clearInterval(id);
      tracker.stop();
    };
  }, [intervalMs]);

  return metrics;
}

/** "8m 12s" style label for the live session clock. */
export function formatSessionClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
