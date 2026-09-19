/** Ideal eight-qubit state-vector simulation of H on every qubit, then measurement.
 * This is classical simulation, not physical quantum randomness. */
export function hadamardProbabilities(qubits = 8): number[] {
  if (!Number.isInteger(qubits) || qubits < 1 || qubits > 12) throw new Error('Invalid qubit count');
  const state = new Float64Array(2 ** qubits); state[0] = 1;
  for (let q = 0; q < qubits; q++) {
    const stride = 2 ** q;
    for (let base = 0; base < state.length; base += stride * 2) {
      for (let j = base; j < base + stride; j++) {
        const a = state[j], b = state[j + stride];
        state[j] = (a + b) / Math.SQRT2;
        state[j + stride] = (a - b) / Math.SQRT2;
      }
    }
  }
  return Array.from(state, amplitude => amplitude * amplitude);
}
const probabilities = hadamardProbabilities();
export function measure(random: number): number[] {
  if (random < 0 || random >= 1 || !Number.isFinite(random)) throw new Error('Invalid sample');
  let cumulative = 0, outcome = probabilities.length - 1;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (random < cumulative) { outcome = i; break; }
  }
  return Array.from({ length: 8 }, (_, q) => (outcome >> q) & 1);
}
type Request = { action: 'start' | 'verdict'; session: string; seq: number; round?: number; declaration?: boolean };
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
type Proof = { source: 'simulator'; taskArn: string; deviceArn: string; shot: number; measuredAt: string };
type Result = { session?: string; faction?: 'goblins' | 'hedgelings'; color?: 'w' | 'b'; ended?: boolean; winner?: 'w' | 'b' | null; proof: Proof };
type Session = { seq: number; round: number; ended: boolean; results: Record<string, Result> };
export function hasSimulation(session: string, storage: Storage = localStorage): boolean {
  return storage.getItem(`scroll-goblins-simulator-v1:${session}`) !== null;
}
/** Continue from the last accepted hardware event without rerolling allegiance. */
export function continueInSimulator(session: string, previousSeq: number, storage: Storage = localStorage): void {
  if (!Number.isInteger(previousSeq) || previousSeq < 0 || previousSeq >= 250) throw new Error('Invalid simulator checkpoint.');
  if (!hasSimulation(session, storage)) storage.setItem(`scroll-goblins-simulator-v1:${session}`,
    JSON.stringify({ seq: previousSeq, round: 0, ended: false, results: {} }));
}
export function simulateOracle(request: Request, storage: Storage = localStorage, sample = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32): Result {
  const key = `scroll-goblins-simulator-v1:${request.session}`;
  const raw = storage.getItem(key), state: Session | null = raw ? JSON.parse(raw) : null;
  if (!Number.isInteger(request.seq) || request.seq < 0 || request.seq > 250) throw new Error('Invalid simulator event.');
  if (state?.results[String(request.seq)]) return state.results[String(request.seq)];
  if (request.action === 'start') {
    if (state || request.seq !== 0) throw new Error('Invalid simulator initialization.');
  } else {
    if (!state || state.ended || request.seq !== state.seq + 1) throw new Error('Simulator event is out of sequence. Start a new match if local data was cleared.');
    if (!Number.isInteger(request.round) || request.round! < state.round) throw new Error('Invalid round.');
    if (!request.declaration && (request.round! < 6 || request.round! <= state.round)) throw new Error('The Universe checks after round five, once per completed round.');
  }
  const bits = measure(sample());
  const proof: Proof = { source: 'simulator', taskArn: `local-simulation:${request.session}:${request.seq}`, deviceArn: 'Local ideal state-vector simulator · 8 qubits', shot: request.seq, measuredAt: new Date().toISOString() };
  const ended = request.action === 'verdict' && (!!request.declaration || bits.slice(0, 3).every(bit => bit === 0));
  const result: Result = request.action === 'start'
    ? { session: request.session, faction: bits[0] === 0 ? 'goblins' : 'hedgelings', color: bits[1] === 0 ? 'w' : 'b', proof }
    : { ended, winner: ended ? bits[3] === 0 ? 'w' : 'b' : null, proof };
  // Persist before returning so reloading or retrying cannot reroll fate.
  storage.setItem(key, JSON.stringify({ seq: request.seq, round: request.round ?? 0, ended, results: { ...state?.results, [String(request.seq)]: result } }));
  return result;
}
