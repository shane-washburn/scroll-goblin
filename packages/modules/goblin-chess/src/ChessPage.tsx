import { recoverChaosTurn } from './recovery';
import { localizeError } from './messages';
import { t } from '@hedgeling/i18n/runtime';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type PieceSymbol, type Square } from 'chess.js';
import Board from './Board';
import Ending, { type Outcome } from './Ending';
import FactionCoin from './FactionCoin';
import { Engine } from './stockfish';
import { assign, verdict, llmMove, simulatorEnabled, type Assignment, type Proof } from './api';
import { rememberChaos, readChaosMemory, chaosVerdictRequest, type ChaosMemory, applyChaos, canMove, initialChaos, names, normalEnding, opposite, otherFaction, piecesOf, roles, tiers, glyphs, type ChaosAction, type ChaosState, type Mode } from './game';
import './chess.css';

type OpponentMove = { from?: string; to?: string; label: string };
type Match = { memory?: ChaosMemory; outcome?: Outcome; quantumProof?: Proof; lastOpponent?: OpponentMove; assignment: Assignment; mode: Mode; pgn: string; chaos: ChaosState; undos: number; log: string[]; result: string | null; seq: number; pending: { round: number; declaration: boolean } | null };
const SAVE = 'scroll-goblins-chess-v1';
function readSave(): Match | null {
  try { const m = JSON.parse(localStorage.getItem(SAVE) || 'null'); if (!m || !tiers[m.mode as Mode] || !m.assignment?.session || !m.chaos?.pieces || !Array.isArray(m.log)) return null; const c = new Chess(); c.loadPgn(m.pgn); return m; } catch { return null; }
}
function chessOf(m: Match) { const c = new Chess(); if (m.pgn) c.loadPgn(m.pgn); return c; }
function afterChaos(m: Match, action: ChaosAction, human: boolean): Match {
  const chaos = applyChaos(m.chaos, action, human);
  const pending = chaosVerdictRequest(chaos, action);
  const memory = rememberChaos(m.memory, m.chaos, action, human);
  const text = action.comment || t('{actor}: {action} {from} → {to}', { actor: human ? t('You') : t('Opponent'), action: t(({ move: 'Move', teleport: 'Teleport', resurrect: 'Revive', transform: 'Transform', declare: 'Declare victory' })[action.kind]), from: action.from ?? (action.piece ? t(roles[action.piece]) : ''), to: action.to ?? '' });
  const actor = action.from ? m.chaos.pieces.find(p => p.square === action.from) : undefined;
  const pieceName = t(names[otherFaction(m.assignment.faction)][actor?.type ?? action.piece ?? 'p']);
  const label = action.kind === 'declare' ? 'Opponent declared victory — the Universe will decide.'
    : action.kind === 'transform' ? `Opponent transformed ${pieceName} on ${action.from} into ${t(roles[action.piece!])}.`
    : action.kind === 'resurrect' ? `Opponent resurrected ${pieceName} on ${action.to}.`
    : `Opponent ${action.kind === 'teleport' ? t('teleported') : t('moved')} ${pieceName}: ${action.from} → ${action.to}.`;
  return { ...m, memory, lastOpponent: human ? undefined : { from: action.from, to: action.to ?? action.from, label }, chaos, pending, log: [...m.log, text, ...(pending?.declaration && action.kind !== 'declare' ? [chaos.pieces.filter(p=>p.type==='k').length === 2 ? 'Checkmate! The Universe will decide who actually wins.' : 'A king has fallen. The Universe will decide who actually wins.'] : [])] };
}
export default function ChessPage() {
  const journal = useRef<HTMLDivElement>(null), followJournal = useRef(true);
  const [chronicleOpen, setChronicleOpen] = useState(() => window.matchMedia('(min-width: 901px)').matches);
  const [reviewEnding, setReviewEnding] = useState(false);
  const [saved, setSaved] = useState(readSave);
  const [match, setMatch] = useState<Match | null>(null), [assignment, setAssignment] = useState<Assignment | null>(null);
  const [mode, setMode] = useState<Mode>('easy'), [selected, setSelected] = useState<Square | null>(null);
  const [cheat, setCheat] = useState<'move' | 'teleport' | 'resurrect' | 'transform'>('move'), [cheatPiece, setCheatPiece] = useState<PieceSymbol>('q');
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0), [danger, setDanger] = useState(true), [confirmNew, setConfirmNew] = useState(false);
  const session = useRef(crypto.randomUUID()), engine = useRef<Engine | null>(null);
  const chess = useMemo(() => match ? chessOf(match) : new Chess(), [match?.pgn]);
  const pieces = useMemo(() => match?.mode === 'chaos' ? match.chaos.pieces : piecesOf(chess), [match?.chaos, match?.mode, chess]);
  const player = match?.assignment.color ?? assignment?.color ?? 'w';
  const faction = match?.assignment.faction ?? assignment?.faction ?? 'goblins';
  const quantumProof = match?.quantumProof ?? (match?.assignment ?? assignment)?.proof;
  const simulated = quantumProof ? quantumProof.source === 'simulator' : simulatorEnabled;
  const turn = match?.mode === 'chaos' ? match.chaos.turn : chess.turn();
  const locked = !match || busy || !!match.result || !!match.pending || turn !== player;
  const checkedKings = useMemo(() => pieces.filter(p => p.type === 'k' && (
    match?.mode === 'chaos'
      ? pieces.some(attacker => attacker.color !== p.color && canMove({ ...match.chaos, turn: attacker.color }, attacker.square, p.square))
      : chess.isAttacked(p.square, opposite(p.color))
  )).map(p => p.square), [pieces, match?.mode, match?.chaos, chess]);
  const selectedPiece = pieces.find(p => p.square === selected);
  const targets = useMemo(() => {
    if (!match || locked) return [];
    if (match.mode === 'chaos') {
      const all = Array.from({ length: 64 }, (_, i) => `${String.fromCharCode(97 + i % 8)}${1 + Math.floor(i / 8)}`);
      if (cheat === 'resurrect') return all.filter(s => !pieces.some(p => p.square === s));
      if (!selected) return [];
      if (cheat === 'teleport') return all.filter(s => !pieces.some(p => p.square === s && p.color === player));
      if (cheat === 'transform') return [];
      return all.filter(s => canMove(match.chaos, selected, s));
    }
    return selected ? chess.moves({ square: selected, verbose: true }).map(m => m.to) : [];
  }, [match, locked, cheat, selected, chess, pieces, player]);
  useEffect(() => {
    if (match) try { localStorage.setItem(SAVE, JSON.stringify(match)); } catch { /* Private mode: play continues without persistence. */ }
  }, [match]);
  useEffect(() => () => { engine.current?.dispose(); engine.current = null; }, []);
  useEffect(() => {
    if (!match || match.result) return;
    let cancelled = false;
    let pause: ReturnType<typeof setTimeout> | undefined;
    async function act() {
      const m = match!;
      if (!m.pending && turn === player) return;
      setBusy(true); setError('');
      try {
        if (!m.pending) {
          await new Promise<void>(resolve => { pause = setTimeout(resolve, 1000); });
          if (cancelled) return;
        }
        if (m.pending) {
          const result = await verdict(m.assignment.session, m.seq + 1, m.pending.round, m.pending.declaration, (m.quantumProof ?? m.assignment.proof).source);
          if (cancelled) return;
          const outcome = result.ended ? `The Universe declares ${result.winner === player ? t('you') : t('your opponent')} the winner. Cosmic paperwork is final.` : 'The Universe allows this nonsense to continue.';
          setMatch({ ...m, quantumProof: result.proof, seq: m.seq + 1, pending: null, result: result.ended ? outcome : null, outcome: result.ended ? result.winner === player ? 'win' : 'loss' : undefined, log: [...m.log, outcome] });
        } else if (m.mode === 'chaos') {
          const action = await recoverChaosTurn(m.chaos,
            lastError => llmMove(m.chaos, otherFaction(m.assignment.faction), lastError, { ...readChaosMemory(m.memory), human_cheats_remaining: m.chaos.cheats }),
            () => cancelled);
          if (action && !cancelled) setMatch(afterChaos(m, action, false));
        } else {
          if (!engine.current) engine.current = new Engine(m.mode);
          const uci = await engine.current.move(chessOf(m).fen());
          if (cancelled) return;
          const c = chessOf(m); const move = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
          setMatch({ ...m, lastOpponent: { from: move.from, to: move.to, label: `Opponent moved ${t(names[otherFaction(m.assignment.faction)][move.piece])}: ${move.from} → ${move.to}${move.san.includes('O-O') ? ' (castling)' : ''}${move.promotion ? ` · promoted to ${roles[move.promotion]}` : ''}.` }, pgn: c.pgn(), result: normalEnding(c), log: [...m.log, `${move.color === 'w' ? 'White' : 'Black'} · ${move.san}`] });
        }
      } catch (e) { if (!cancelled) { setError((e as Error).message); engine.current?.dispose(); engine.current = null; } }
      finally { if (!cancelled) setBusy(false); }
    }
    void act();
    return () => { cancelled = true; clearTimeout(pause); };
  }, [match, retry]);
  async function summon() {
    setBusy(true); setError('');
    try {
      const [result] = await Promise.all([assign(session.current), new Promise<void>(resolve => setTimeout(resolve, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1250))]);
      setAssignment(result);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function begin() {
    if (!assignment) return;
    setError(''); setSaved(null); setSelected(null); engine.current?.dispose(); engine.current = null;
    setMatch({ assignment, mode, pgn: '', chaos: initialChaos(), undos: tiers[mode].undos, log: ['The Universe has chosen your faction and color.'], result: null, seq: 0, pending: null });
  }
  function moveNormal(from: Square, to: Square, promote?: PieceSymbol) {
    if (!match) return;
    try {
      const c = chessOf(match); const move = c.move({ from, to, promotion: promote });
      setMatch({ ...match, lastOpponent: undefined, pgn: c.pgn(), result: normalEnding(c), log: [...match.log, `${move.color === 'w' ? 'White' : 'Black'} · ${move.san}`] });
      setSelected(null); setPromotion(null); setError('');
    } catch { setError('Choose one of the highlighted legal squares.'); }
  }
  function chaosAction(action: ChaosAction) {
    if (!match) return;
    try { setMatch(afterChaos(match, action, true)); setSelected(null); setCheat('move'); setError(''); } catch (e) { setError((e as Error).message); }
  }
  function onSquare(square: Square) {
    if (locked || promotion) return;
    const target = pieces.find(p => p.square === square);
    if (match!.mode === 'chaos' && cheat === 'resurrect') { chaosAction({ kind: 'resurrect', to: square, piece: cheatPiece }); return; }
    if (target?.color === player) { setSelected(selected === square ? null : square); return; }
    if (!selected || (match!.mode === 'chaos' && cheat === 'transform')) return;
    if (match!.mode === 'chaos') { chaosAction({ kind: cheat, from: selected, to: square, piece: cheatPiece }); return; }
    if (selectedPiece?.type === 'p' && /[18]$/.test(square) && targets.includes(square)) { setPromotion({ from: selected, to: square }); return; }
    moveNormal(selected, square);
  }
  function undo() {
    if (!match || locked || !match.undos || match.mode === 'chaos') return;
    const c = chessOf(match); if (c.history().length < (player === 'w' ? 2 : 3)) return;
    c.undo(); if (c.turn() !== player) c.undo();
    setMatch({ ...match, lastOpponent: undefined, pgn: c.pgn(), undos: match.undos - 1, result: null, log: [...match.log, 'A takeback: the previous decision is yours again.'] }); setSelected(null);
  }
  function reset() { setReviewEnding(false); engine.current?.dispose(); engine.current = null; setMatch(null); setAssignment(null); setSaved(null); setSelected(null); setError(''); setBusy(false); setConfirmNew(false); session.current = crypto.randomUUID(); try { localStorage.removeItem(SAVE); } catch {} }
  const endingOutcome: Outcome = match?.outcome ?? (chess.isCheckmate()
    ? chess.turn() === player ? 'loss' : 'win'
    : match?.mode !== 'chaos' && chess.isDraw() ? 'draw'
    : match?.result?.includes('declares you the winner') ? 'win' : 'loss');
  const latestBanter = match?.mode === 'chaos' ? readChaosMemory(match.memory).recent_banter.at(-1) : undefined;
  useEffect(() => { if (journal.current && followJournal.current) journal.current.scrollTop = journal.current.scrollHeight; }, [match?.log.length, chronicleOpen]);
  const threatened = match?.mode === 'easy' && danger && selected && selectedPiece?.color === player && chess.isAttacked(selected, opposite(player));
  return <div className={`gc ${match ? 'gc-in-match' : ''}`}><div className="gc-shell">
    <header className="gc-header"><div><p className="gc-eyebrow">A SMALL WAR. A VERY STRANGE UNIVERSE.</p><h1>Scroll Goblins <span>vs</span> Hedgelings</h1><p>Choose your courage. Fate chooses your side.</p></div><span className="gc-seal">♟<small>{t('WOODLAND')}<br />{t('CHESS CLUB')}</small></span></header>
    {simulated && <div className="gc-simulator" role="status"><strong>SIMULATED UNIVERSE</strong><span>This match uses simulated quantum measurements. Play continues even when hardware results are unavailable.</span></div>}
    {!match ? <>
      <section className="gc-intro"><div><span className="gc-pill">{simulated ? 'SIMULATED QUANTUM FATE · UNTIMED CHESS' : 'REAL QUANTUM FATE · UNTIMED CHESS'}</span><h2>Some battles are<br />written in the stars.</h2><p>This one is mostly written on stolen scrolls. Command a woodland army against Stockfish—or a spirit with a questionable understanding of chess.</p>
      {!assignment ? <button className="gc-primary" disabled={busy} onClick={summon}>{busy ? 'Consulting the Universe…' : 'Let the Universe choose my side ↗'}</button> : <div className="gc-assignment"><small>{t('THE UNIVERSE HAS SPOKEN')}</small><h3>{assignment.faction === 'goblins' ? 'The Scroll Goblins' : 'The Hedgelings'}</h3><p>{assignment.color === 'w' ? 'You play white · you move first.' : 'You play black · your opponent moves first.'}</p></div>}
      {saved && <button className="gc-secondary" onClick={() => { setMatch(saved); setSaved(null); }}>Resume your woodland battle</button>}
      </div><FactionCoin faction={assignment?.faction} busy={busy} onFlip={summon} /></section>
      {assignment && <section className="gc-choose"><p className="gc-eyebrow">02 / CHOOSE YOUR OPPONENT</p><div className="gc-tiers">{(Object.keys(tiers) as Mode[]).map(t => <button key={t} className={`gc-tier ${mode === t ? 'active' : ''}`} onClick={() => setMode(t)} aria-pressed={mode === t}><small>{tiers[t].label}</small><h3>{tiers[t][otherFaction(faction)]}</h3><p>{tiers[t].description}</p><span>{t === 'chaos' ? '✦ RULES ARE OPTIONAL' : '♟ STOCKFISH 19'}</span></button>)}</div><button className="gc-primary" onClick={begin}>Deploy the board →</button>{mode === 'hard' && <p className="gc-fine">The full NNUE engine downloads about 95 MB once, then runs on your device.</p>}</section>}
      {error && <p className="gc-error" role="alert">{localizeError(error)} <button disabled={busy} onClick={summon}>Try again</button></p>}
    </> : <>
      <div className="gc-matchbar"><div><small>{t('YOUR ALLEGIANCE')}</small><strong>{faction === 'goblins' ? 'Scroll Goblins' : 'Hedgelings'} <span> / {player === 'w' ? 'White' : 'Black'}</span></strong></div><div><small>{t('YOUR OPPONENT')}</small><strong>{tiers[match.mode][otherFaction(faction)]}</strong></div><button onClick={() => setConfirmNew(true)}>New match</button></div>
      <div className="gc-play"><div className="gc-table-column">
      {match.mode === 'chaos' && <section className="gc-banter" aria-label="Opponent’s latest comment"><div className="gc-banter-avatar" aria-hidden="true">{otherFaction(faction)==='goblins'?'⚗':'✧'}</div><div><p className="gc-banter-name">{tiers.chaos[otherFaction(faction)]}<span>{turn!==player && busy ? 'plotting…' : 'says'}</span></p><p className="gc-banter-quote" aria-live="polite">{latestBanter || 'Your opponent’s next outrageous remark will appear here.'}</p></div></section>}
      <Board checkedKings={checkedKings} lastMove={match.lastOpponent} pieces={pieces} player={player} faction={faction} selected={selected} targets={targets} onSquare={onSquare} disabled={locked || !!promotion} />
      <p className="gc-last-move" role="status">{match.lastOpponent?.label}</p>
      <div className="gc-piece-info">{selectedPiece ? <><strong>{names[selectedPiece.color === player ? faction : otherFaction(faction)][selectedPiece.type]}</strong><span>{roles[selectedPiece.type]} · {selected}{threatened ? ' · This piece is under attack!' : ''}</span></> : <span>Every little creature has a role. Select one to meet it.</span>}</div>
      </div><aside className="gc-sidebar">
        <section className="gc-panel gc-command-dock" aria-label="Game controls"><p className="gc-eyebrow">{match.result ? 'THE FINAL WORD' : match.pending ? 'COSMIC DELIBERATION' : 'AT THE TABLE'}</p><h2 aria-live="polite">{match.result ? 'The battle is over.' : match.pending ? 'The Universe is deciding…' : turn === player ? 'Your move.' : 'A scheme is brewing…'}</h2><p>{(match.result ? t(match.result) : '') || (match.mode !== 'chaos' && chess.isCheck() ? 'Check! Protect your king.' : busy ? match.mode === 'hard' ? 'Loading / thinking with full NNUE Stockfish…' : 'A little patience. Great nonsense takes time.' : 'Take your time.')}</p>
        {match.mode !== 'chaos' && <button disabled={locked || !match.undos || chess.history().length < (player === 'w' ? 2 : 3)} onClick={undo}>{t('↶ Undo decision')} <span>{t('{count, plural, one {# undo left} other {# undos left}}', { count: match.undos })}</span></button>}
        {match.mode === 'easy' && <label className="gc-checkbox"><input type="checkbox" checked={danger} onChange={e => setDanger(e.target.checked)} /> {t('Warn about attacked pieces')}</label>}
        {match.mode === 'chaos' && !match.result && <><p className="gc-cheat-count">{t('✦ {count, plural, one {# cheat remaining} other {# cheats remaining}}', { count: match.chaos.cheats })}</p><div className="gc-action-picker" role="group" aria-label="Choose action">{([['move','♟','Move'],['teleport','↗','Teleport'],['resurrect','✦','Revive'],['transform','✧','Transform']] as const).map(([id,icon,label])=><button key={id} aria-pressed={cheat===id} disabled={locked || (id!=='move'&&!match.chaos.cheats)} onClick={()=>{setCheat(id);setSelected(null);}}><span aria-hidden="true">{icon}</span>{label}</button>)}</div>
        {(cheat === 'transform' || cheat === 'resurrect') && <select aria-label="Piece type" value={cheatPiece} disabled={locked} onChange={e => setCheatPiece(e.target.value as PieceSymbol)}>{(['q', 'r', 'b', 'n', 'p'] as PieceSymbol[]).map(p => <option key={p} value={p}>{roles[p]}</option>)}</select>}
        {cheat === 'transform' && <button disabled={locked || !selected || !match.chaos.cheats} onClick={() => chaosAction({ kind: 'transform', from: selected!, piece: cheatPiece })}>Transform selected piece</button>}
        <p className="gc-fine">{cheat === 'resurrect' ? 'Choose a captured type, then an empty square.' : cheat === 'transform' ? 'Select your non-king piece, choose its new type, then transform.' : cheat === 'teleport' ? 'Select your piece, then any empty or enemy square.' : selected ? 'Choose a highlighted square to move your piece.' : 'Select a piece, then its destination. Cheats each use one turn.'}</p></>}
        {error && <div className="gc-error" role="alert">{localizeError(error)}{(turn !== player || match.pending) && <button disabled={busy} onClick={() => setRetry(x => x + 1)}>Retry this turn</button>}</div>}
        {!match.result && <button className="gc-quiet" disabled={busy || !!match.pending} onClick={() => { setMatch({ ...match, outcome: 'loss', result: 'You resigned. Your opponent wins.' }); }}>Resign</button>}
        {match.result && <><button className="gc-primary" onClick={reset}>Another little war →</button><button onClick={() => setReviewEnding(false)}>View result</button></>}
        </section>

        <details className="gc-panel gc-journal" open={chronicleOpen} onToggle={e=>setChronicleOpen(e.currentTarget.open)}><summary>{t('Battle chronicle')} <span>{t('{count, plural, one {# event} other {# events}}', { count: match.log.length })}</span></summary><p className="gc-journal-intro">Every move. Every dubious claim.</p><div ref={journal} role="log" aria-label="Battle history" onScroll={()=>{const el=journal.current!;followJournal.current=el.scrollHeight-el.scrollTop-el.clientHeight<48;}}>{match.log.map((line, i) => <p key={i} className={line===latestBanter?'gc-journal-banter':''}><small>{String(i+1).padStart(2,'0')}</small>{t(line)}</p>)}</div><button className="gc-journal-latest" onClick={()=>{followJournal.current=true;journal.current?.scrollTo({top:journal.current.scrollHeight,behavior:'instant'});}}>Latest event ↓</button></details>
      </aside></div>
      {match.result && !reviewEnding && <Ending outcome={endingOutcome} reason={match.result} faction={faction} onReview={() => setReviewEnding(true)} onRestart={reset} />}
      {promotion && <div className="gc-dialog" role="dialog" aria-modal="true" aria-label="Choose promotion"><div className="gc-panel"><h2>A grunt earns a promotion.</h2><p>Choose its new role.</p>{(['q', 'r', 'b', 'n'] as PieceSymbol[]).map(p => <button key={p} onClick={() => moveNormal(promotion.from, promotion.to, p)}>{glyphs[p]} {roles[p]}</button>)}<button onClick={() => setPromotion(null)}>Cancel</button></div></div>}
      {confirmNew && <div className="gc-dialog" role="dialog" aria-modal="true" aria-label="Start new match"><div className="gc-panel"><h2>Leave this battle?</h2><p>A new match replaces your saved game.</p><button className="gc-primary" onClick={reset}>Start fresh</button><button onClick={() => setConfirmNew(false)}>Keep playing</button></div></div>}
    </>}
    <details className="gc-rules"><summary>{t('FIELD NOTES / Rules, pieces & quantum provenance')}</summary><div className="gc-rules-grid"><div><h3>How the table works</h3><p>All games are untimed. White moves first. Easy gives three takebacks; medium gives one. Each takeback rewinds your move and the reply. Normal chess includes castling, en passant, promotion and draws.</p><p>Chaos: check can be ignored, but ordinary checkmate, capturing a king, or an LLM victory declaration calls the Universe. Cheats do not count as checkmate escapes. Castling and en passant are disabled. You get three cheats, each using a turn. After round five, the Universe may end any completed round and choose either side as winner.</p></div><div><h3>Meet your army</h3>{(Object.keys(roles) as PieceSymbol[]).map(p => <p key={p}><b>{glyphs[p]} {roles[p]}</b> · {names.goblins[p]} / {names.hedgelings[p]}</p>)}</div><div><h3>{simulated ? "Simulated Universe" : "Real hardware. Strange fate."}</h3>{simulated && <p>This match uses an ideal eight-qubit state-vector simulation. Measurements are sampled on your computer and saved so retries cannot reroll results. No hardware shots or AWS credits are consumed.</p>}<p>In hardware mode, measurements are made on Amazon Braket quantum hardware in advance, then used once. The target probabilities are ideal; physical hardware has noise. If hardware results are unavailable, the match switches to the simulator and stays there. New matches try real hardware first.</p>{quantumProof && <p className="gc-proof">{t('Latest measurement · Device:')} {quantumProof.deviceArn}<br />{t('Task:')} {quantumProof.taskArn}<br />{t('Measured:')} {quantumProof.measuredAt}<br />{t('Shot:')} {quantumProof.shot}</p>}<a href="/chess/engine/COPYING.txt">Stockfish GPL license</a> · <a href="/chess/stockfish-source.tar.gz">Engine source</a></div></div></details>
    <footer className="gc-footer">{t('NO CLOCKS. NO CROWNS GUARANTEED.')} <span>♧</span> {t('MADE FOR A LITTLE ESCAPE.')}</footer>
  </div></div>;
}
