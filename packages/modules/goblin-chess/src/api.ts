import { getLocale } from '@hedgeling/i18n/runtime';
import { hasSimulation, simulateOracle, continueInSimulator } from './simulator';
import type { Color } from 'chess.js';
import type { ChaosAction, ChaosState, ChaosMemory, Faction } from './game';
export const simulatorEnabled = import.meta.env.DEV && import.meta.env.VITE_QUANTUM_SIMULATOR === 'true';
export type Proof = { source?: 'simulator' | 'hardware'; taskArn: string; deviceArn: string; shot: number; measuredAt: string };
export type Assignment = { session: string; faction: Faction; color: Color; proof: Proof };
export type Verdict = { ended: boolean; winner: Color | null; proof: Proof };
const quantumUrl = import.meta.env.VITE_QUANTUM_API_URL || 'https://5o1vmqmw04.execute-api.eu-north-1.amazonaws.com/oracle';
class HttpError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
async function post<T>(url: string, body: unknown, timeout = 35000): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(data.error || 'The connection wandered off. Please retry.', res.status);
  return data as T;
}
// Availability failures may use simulation; validation and rate limits must not be bypassed.
function unavailable(error: unknown) {
  return error instanceof HttpError ? error.status >= 500 : error instanceof TypeError || (error instanceof DOMException && ['TimeoutError', 'AbortError'].includes(error.name));
}
export async function assign(session: string): Promise<Assignment> {
  const request = { action: 'start' as const, session, seq: 0 };
  if (simulatorEnabled || hasSimulation(session)) return simulateOracle(request) as Assignment;
  try { return await post<Assignment>(quantumUrl, { ...request, mode: 'chaos' }, 6000); }
  catch (error) {
    if (!unavailable(error)) throw error;
    return simulateOracle(request) as Assignment;
  }
}
export async function verdict(session: string, seq: number, round: number, declaration: boolean, source?: Proof['source']): Promise<Verdict> {
  const request = { action: 'verdict' as const, session, seq, round, declaration };
  if (source === 'simulator' || hasSimulation(session)) return simulateOracle(request) as Verdict;
  try { return await post<Verdict>(quantumUrl, request, 6000); }
  catch (error) {
    if (!unavailable(error)) throw error;
    continueInSimulator(session, seq - 1);
    return simulateOracle(request) as Verdict;
  }
}
export async function llmMove(state: ChaosState, faction: Faction, lastError?: string, context?: ChaosMemory & { human_cheats_remaining: number }) {
  try {
    return await post<ChaosAction>(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'}/goblin-chess/v1/chaos`, { pieces: state.pieces, captured: state.captured, turn: state.turn, faction, round: Math.floor(state.ply / 2), lastError, ...context, locale: getLocale() });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new Error('Could not reach the chaos opponent service. Retry this turn once the connection returns. The Universe simulator handles coin flips and verdicts, not the LLM opponent.');
  }
}
