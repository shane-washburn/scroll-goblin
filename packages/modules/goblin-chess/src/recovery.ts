import { applyChaos, canMove, type ChaosAction, type ChaosState } from './game';

/** An actual board action, with no fabricated LLM comment or human cheat cost. */
export function backupChaosAction(state: ChaosState): ChaosAction {
  const own = state.pieces.filter(p => p.color === state.turn);
  const squares = Array.from({ length: 64 }, (_, i) => `${String.fromCharCode(97 + i % 8)}${1 + Math.floor(i / 8)}`);
  for (const piece of own) for (const to of squares) {
    if (canMove(state, piece.square, to)) return { kind: 'move', from: piece.square, to };
  }
  const to = squares.find(square => !own.some(p => p.square === square));
  if (own.length && to) return { kind: 'teleport', from: own[0].square, to };
  const piece = own.find(p => p.type !== 'k');
  if (piece) return { kind: 'transform', from: piece.square, piece: piece.type === 'q' ? 'n' : 'q' };
  // A malformed/exhausted position has no movable piece; the Universe can adjudicate.
  return { kind: 'declare' };
}

export async function recoverChaosTurn(
  state: ChaosState,
  request: (lastError?: string) => Promise<ChaosAction>,
  cancelled: () => boolean,
): Promise<ChaosAction | null> {
  let lastError: string | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (cancelled()) return null;
    // Service errors remain distinct from invalid board actions (no rate-limit loops).
    const action = await request(lastError);
    if (cancelled()) return null;
    try { applyChaos(state, action, false); return action; }
    catch (error) { lastError = (error as Error).message; }
  }
  if (cancelled()) return null;
  const action = backupChaosAction(state);
  applyChaos(state, action, false);
  return action;
}
