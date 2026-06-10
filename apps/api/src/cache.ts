import { createHash } from "node:crypto";
import type { TranslateRequest, TranslateResponse } from "@emoji/shared";

/**
 * Minimal in-memory LRU-ish cache for identical requests.
 * Identical (input + direction + targetLanguage) costs zero tokens on repeat.
 * Swap this module for Upstash Redis in production without touching callers.
 */
const MAX_ENTRIES = 500;
const store = new Map<string, TranslateResponse>();

export function cacheKey(req: TranslateRequest): string {
  return createHash("sha256")
    .update(`${req.direction}|${req.targetLanguage}|${req.input}`)
    .digest("hex");
}

export function getCached(key: string): TranslateResponse | undefined {
  const hit = store.get(key);
  if (hit) {
    // refresh recency
    store.delete(key);
    store.set(key, hit);
  }
  return hit;
}

export function setCached(key: string, value: TranslateResponse): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, value);
}
