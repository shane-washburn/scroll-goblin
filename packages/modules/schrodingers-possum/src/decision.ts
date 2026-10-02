import {
  PossumDecisionSchema, PossumMeasurementSchema, PossumNarrationSchema, writtenPossumStory,
  type PossumDecision, type PossumMeasurement, type PossumNarration,
} from '@scroll-goblin/shared';

const SAVE = 'scroll-goblin-possum-v1';
const MAX_AGE = 6 * 86400 * 1000; // Shorter than the oracle's seven-day idempotency record.
export class DecisionError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function readDecision(storage: Pick<Storage, 'getItem'>): PossumDecision | null {
  try {
    const raw = storage.getItem(SAVE);
    if (!raw || raw.length > 12000) return null;
    const saved = PossumDecisionSchema.safeParse(JSON.parse(raw));
    if (!saved.success || saved.data.createdAt > Date.now() || Date.now() - saved.data.createdAt > MAX_AGE) return null;
    return saved.data;
  } catch { return null; }
}

export function saveDecision(decision: PossumDecision, storage: Pick<Storage, 'setItem'>): void {
  storage.setItem(SAVE, JSON.stringify(decision));
}

export function forgetDecision(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(SAVE);
}

async function post(url: string, body: unknown, signal: AbortSignal, fetcher: typeof fetch) {
  const response = await fetcher(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal });
  if (!response.ok) {
    // Do not surface arbitrary provider payloads or accidentally bypass a rate limit.
    throw new DecisionError(response.status === 429 ? 'Percy needs a breather. Try again in a little while.'
      : response.status < 500 ? 'The portal could not accept this request. Please try again.'
        : 'The quantum pool is resting.', response.status);
  }
  return response.json();
}

/** Caller aborts never turn into a new choice. Only availability failures may fall back. */
export async function measureDecision(id: string, url: string, signal: AbortSignal,
  fetcher: typeof fetch = fetch): Promise<PossumMeasurement> {
  try {
    const data = await post(url, { action: 'flip', decision: id },
      AbortSignal.any([signal, AbortSignal.timeout(6000)]), fetcher);
    const measurement = PossumMeasurementSchema.safeParse(data);
    if (!measurement.success || measurement.data.source !== 'hardware') {
      throw new DecisionError('The portal returned an unreadable receipt. Please try again.', 502);
    }
    signal.throwIfAborted();
    return measurement.data;
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof DecisionError && error.status < 500) throw error;
    const timeout = error instanceof DOMException && error.name === 'TimeoutError';
    const result = (crypto.getRandomValues(new Uint8Array(1))[0] & 1) as 0 | 1;
    return { source: 'classical', result, measuredAt: new Date().toISOString(),
      reason: timeout ? 'timeout' : error instanceof DecisionError ? 'unavailable' : 'network' };
  }
}

export async function narrateDecision(decision: PossumDecision, url: string, locale: string,
  signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<PossumNarration> {
  if (!decision.measurement) throw new Error('A measurement must be saved before narration.');
  try {
    const data = await post(url, { dilemma: decision.dilemma, result: decision.measurement.result, locale },
      AbortSignal.any([signal, AbortSignal.timeout(18000)]), fetcher);
    const narration = PossumNarrationSchema.parse(data);
    signal.throwIfAborted();
    return narration;
  } catch {
    signal.throwIfAborted();
    return writtenPossumStory(decision.dilemma.tone);
  }
}
