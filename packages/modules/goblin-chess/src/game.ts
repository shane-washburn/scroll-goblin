import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
export type Mode = 'easy' | 'medium' | 'hard' | 'chaos';
export type Faction = 'goblins' | 'hedgelings';
export type Piece = { square: Square; type: PieceSymbol; color: Color };
export type ChaosAction = { kind: 'move' | 'teleport' | 'resurrect' | 'transform' | 'declare'; from?: string; to?: string; piece?: PieceSymbol; comment?: string };
export type ChaosState = { pieces: Piece[]; captured: Piece[]; turn: Color; ply: number; cheats: number };
export const names: Record<Faction, Record<PieceSymbol, string>> = {
  goblins: { k: 'Goblin King', q: 'Master Weaver', b: 'Potion Mixer', n: 'Scroll Rider', r: 'Spellbook Stack', p: 'Scroll Grunt' },
  hedgelings: { k: 'Elder Sage', q: 'Chief Forager', b: 'Acorn Bombardier', n: 'Frog Rider', r: 'Stump Tower', p: 'Defensive Hoglet' },
};
export const roles: Record<PieceSymbol, string> = { k: 'King', q: 'Queen', b: 'Bishop', n: 'Knight', r: 'Rook', p: 'Pawn' };
export const glyphs: Record<PieceSymbol, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
export const tiers: Record<Mode, { label: string; goblins: string; hedgelings: string; description: string; undos: number }> = {
  easy: { label: 'Easy', goblins: 'Trainee Scribe', hedgelings: 'Lost Hoglet', description: 'A gentle first adventure. Three takebacks and optional danger warnings.', undos: 3 },
  medium: { label: 'Medium', goblins: 'Potion Mixer', hedgelings: 'Acorn Bombardier', description: 'A little cunning. A little mercy. One takeback.', undos: 1 },
  hard: { label: 'Hard', goblins: 'Goblin King', hedgelings: 'Elder Sage', description: 'Full-strength NNUE Stockfish, five seconds per move. No takebacks.', undos: 0 },
  chaos: { label: 'Chaos', goblins: 'The Mad Alchemist', hedgelings: 'The Wandering Spirit', description: 'A cheating LLM, three cheats of your own, and the Universe as referee.', undos: 0 },
};
export const opposite = (c: Color): Color => c === 'w' ? 'b' : 'w';
export const otherFaction = (f: Faction): Faction => f === 'goblins' ? 'hedgelings' : 'goblins';
export function piecesOf(chess: Chess): Piece[] { return chess.board().flat().filter((p): p is NonNullable<typeof p> => !!p).map(({ square, type, color }) => ({ square, type, color })); }
export function initialChaos(): ChaosState { return { pieces: piecesOf(new Chess()), captured: [], turn: 'w', ply: 0, cheats: 3 }; }
const xy = (s: string) => [s.charCodeAt(0) - 97, Number(s[1]) - 1];
const squareOK = (s?: string): s is Square => !!s && /^[a-h][1-8]$/.test(s);
/** Chaos still uses ordinary movement for the human, but check is advisory.
 * Castling and en passant are disabled in chaos because arbitrary edits erase
 * their historical preconditions. King capture ends through the Universe. */
export function canMove(state: ChaosState, from: string, to: string): boolean {
  if (!squareOK(from) || !squareOK(to) || from === to) return false;
  const p = state.pieces.find(p => p.square === from), target = state.pieces.find(p => p.square === to);
  if (!p || p.color !== state.turn || target?.color === p.color) return false;
  const [x, y] = xy(from), [tx, ty] = xy(to), dx = tx - x, dy = ty - y;
  if (p.type === 'n') return Math.abs(dx * dy) === 2;
  if (p.type === 'k') return Math.max(Math.abs(dx), Math.abs(dy)) === 1;
  if (p.type === 'p') {
    const d = p.color === 'w' ? 1 : -1;
    if (Math.abs(dx) === 1 && dy === d) return !!target;
    if (dx || target) return false;
    if (dy === d) return true;
    return y === (p.color === 'w' ? 1 : 6) && dy === 2 * d && !state.pieces.some(p => p.square === `${from[0]}${y + d + 1}`);
  }
  if (p.type === 'b' && Math.abs(dx) !== Math.abs(dy)) return false;
  if (p.type === 'r' && dx !== 0 && dy !== 0) return false;
  if (p.type === 'q' && dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return false;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 1; i < steps; i++) {
    const s = `${String.fromCharCode(97 + x + Math.sign(dx) * i)}${y + Math.sign(dy) * i + 1}`;
    if (state.pieces.some(p => p.square === s)) return false;
  }
  return true;
}
export function applyChaos(state: ChaosState, action: ChaosAction, human: boolean): ChaosState {
  if (action.kind === 'declare') return state;
  const next: ChaosState = structuredClone(state);
  const cheat = action.kind !== 'move';
  if (human && cheat && state.cheats <= 0) throw new Error('All three cheats have been used.');
  const piece = next.pieces.find(p => p.square === action.from && p.color === state.turn);
  if (action.kind === 'move' || action.kind === 'teleport') {
    if (!piece || !squareOK(action.to) || action.to === action.from) throw new Error('Choose one of your pieces and a different destination.');
    if (human && action.kind === 'move' && !canMove(state, piece.square, action.to)) throw new Error('That move needs a teleport cheat.');
    const target = next.pieces.find(p => p.square === action.to);
    if (target?.color === piece.color) throw new Error('That square already belongs to one of your pieces.');
    if (target) { next.captured.push({ ...target }); next.pieces = next.pieces.filter(p => p !== target); }
    piece.square = action.to;
    if (piece.type === 'p' && /[18]$/.test(action.to)) piece.type = action.piece && 'qrbn'.includes(action.piece) ? action.piece : 'q';
  } else if (action.kind === 'resurrect') {
    if (!squareOK(action.to) || next.pieces.some(p => p.square === action.to)) throw new Error('Resurrect onto an empty square.');
    const index = next.captured.findIndex(p => p.color === state.turn && p.type === action.piece && p.type !== 'k');
    if (index < 0) throw new Error('Choose one of your captured non-king pieces.');
    next.pieces.push({ ...next.captured.splice(index, 1)[0], square: action.to });
  } else if (action.kind === 'transform') {
    if (!piece || piece.type === 'k' || !action.piece || !'qrbnp'.includes(action.piece) || action.piece === piece.type) throw new Error('Transform a non-king into a different non-king piece.');
    piece.type = action.piece;
  } else { throw new Error('Unknown action.'); }
  next.turn = opposite(state.turn); next.ply++;
  if (human && cheat) next.cheats--;
  return next;
}
export function normalEnding(chess: Chess): string | null {
  if (chess.isCheckmate()) return `${chess.turn() === 'w' ? 'Black' : 'White'} wins by checkmate.`;
  if (chess.isStalemate()) return 'Draw by stalemate.';
  if (chess.isThreefoldRepetition()) return 'Draw by threefold repetition.';
  if (chess.isInsufficientMaterial()) return 'Draw by insufficient material.';
  if (chess.isDrawByFiftyMoves()) return 'Draw by the fifty-move rule.';
  return null;
}

export type ChaosMemory = { human_last_action: string; recent_banter: string[] };
export function readChaosMemory(value?: Partial<ChaosMemory>): ChaosMemory {
  return {
    human_last_action: typeof value?.human_last_action === 'string' ? value.human_last_action.slice(0,400) : 'No human action recorded yet.',
    recent_banter: Array.isArray(value?.recent_banter) ? value.recent_banter.filter((v):v is string=>typeof v==='string').slice(-4).map(v=>v.slice(0,300)) : [],
  };
}
export function rememberChaos(memory: Partial<ChaosMemory> | undefined, before: ChaosState, action: ChaosAction, human: boolean): ChaosMemory {
  const next=readChaosMemory(memory);
  if (!human) return { ...next, recent_banter: action.comment?.trim() ? [...next.recent_banter, action.comment.slice(0,300)].slice(-4) : next.recent_banter };
  const actor=before.pieces.find(p=>p.square===action.from);
  const color=before.turn==='w'?'White':'Black';
  const piece=roles[actor?.type ?? action.piece ?? 'p'];
  const target=before.pieces.find(p=>p.square===action.to);
  const detail=action.kind==='transform' ? `transformed ${color} ${piece} on ${action.from} into ${roles[action.piece!]}`
    : action.kind==='resurrect' ? `resurrected ${color} ${roles[action.piece!]} on ${action.to}`
    : action.kind==='declare' ? 'declared victory'
    : `${action.kind==='teleport'?'teleported':'moved'} ${color} ${piece} from ${action.from} to ${action.to}${target?`, capturing ${target.color==='w'?'White':'Black'} ${roles[target.type]}`:''}${actor?.type==='p'&&action.to&&/[18]$/.test(action.to)?`, promoting to ${roles[action.piece&&'qrbn'.includes(action.piece)?action.piece:'q']}`:''}`;
  return { ...next, human_last_action: `Human ${action.kind!=='move'&&action.kind!=='declare'?'used a cheat: ':''}${detail}.` };
}
/** Ordinary checkmate on the current chaos board: no castling/en passant history,
 * and cheats do not count as escapes. King captures are handled separately. */
export function chaosCheckmate(state: ChaosState): boolean {
  const color=state.turn;
  if (!state.pieces.some(p=>p.type==='k'&&p.color===color)||!state.pieces.some(p=>p.type==='k'&&p.color!==color)) return false;
  const attacked=(pieces:Piece[])=>{
    const king=pieces.find(p=>p.type==='k'&&p.color===color)!;
    return pieces.some(p=>p.color!==color&&canMove({...state,pieces,turn:p.color},p.square,king.square));
  };
  if(!attacked(state.pieces))return false;
  for(const p of state.pieces.filter(p=>p.color===color))for(let i=0;i<64;i++){
    const to=`${String.fromCharCode(97+i%8)}${1+Math.floor(i/8)}` as Square;
    if(state.pieces.some(q=>q.square===to&&q.type==='k')||!canMove(state,p.square,to))continue;
    const pieces=state.pieces.filter(q=>q.square!==to).map(q=>q===p?{...q,square:to}:q);
    if(!attacked(pieces))return false;
  }
  return true;
}
export function chaosVerdictRequest(state:ChaosState,action:ChaosAction):{round:number;declaration:boolean}|null {
  const round=Math.floor(state.ply/2);
  const forced=action.kind==='declare'||!state.pieces.some(p=>p.type==='k'&&p.color==='w')||!state.pieces.some(p=>p.type==='k'&&p.color==='b')||chaosCheckmate(state);
  return forced||state.ply%2===0&&round>=6?{round,declaration:forced}:null;
}
