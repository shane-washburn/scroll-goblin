import { useState } from 'react';
import { useTranslation } from '@hedgeling/i18n/runtime';
import { SUBJECT_ART } from './art';
import { GRID_COLS, GRID_ROWS, ROUND_COUNT, TILE_COUNT, canGuess, createGame, currentRound,
  isFinished, makeGuess, multiplierFor, nextRound, potentialPoints, rankFor, revealTile } from './engine';
import type { Game } from './types';
import './hotdog-or-not.css';

const CORRECT_QUIPS = [
  { text: 'Impeccable glizzard instincts.' },
  { text: 'The bun never lies to you.' },
  { text: 'A connoisseur of encased meats.' },
  { text: 'You can smell the mustard through the tiles.' },
];
const WRONG_QUIPS = [
  { text: 'The tiles have deceived you.' },
  { text: 'A classic rookie mix-up.' },
  { text: 'Even the condiments are disappointed.' },
  { text: 'Peek a little longer next time.' },
];

function Stage({ game, onReveal }: { game: Game; onReveal: (tile: number) => void }) {
  const { t } = useTranslation();
  const round = currentRound(game);
  const { rotate, scale, flip, dx, dy, variant } = round.transform;
  const guessed = round.guess !== null;
  const tileW = 300 / GRID_COLS;
  const tileH = 200 / GRID_ROWS;
  return <div className="hd-stage">
    <svg viewBox="0 0 300 200" aria-hidden="true">
      <rect width="300" height="200" fill="#fdf4e3" />
      <g transform={`translate(${150 + dx} ${100 + dy}) rotate(${rotate}) scale(${flip ? -scale : scale} ${scale}) translate(-150 -100)`}>
        {SUBJECT_ART[round.subject](variant)}
      </g>
      {/* The cover lives inside the SVG with inline fills so it paints in the
          same frame as the artwork — no flash while the stylesheet loads. */}
      {Array.from({ length: TILE_COUNT }, (_, i) => {
        const open = guessed || round.revealed.includes(i);
        return <rect key={i} className={`hd-cover ${open ? 'hd-open' : ''}`}
          x={(i % GRID_COLS) * tileW} y={Math.floor(i / GRID_COLS) * tileH} width={tileW} height={tileH}
          fill={i % 2 ? '#e2a844' : '#eab055'} stroke="#b8862c" strokeWidth="0.6" />;
      })}
    </svg>
    <div className="hd-grid" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}>
      {Array.from({ length: TILE_COUNT }, (_, i) => {
        const open = guessed || round.revealed.includes(i);
        return <button key={i} type="button" className="hd-tile" disabled={open}
          aria-label={t('Peek behind tile {number}', { number: i + 1 })}
          onClick={() => onReveal(i)} />;
      })}
    </div>
  </div>;
}

export default function HotdogPage() {
  const { t } = useTranslation();
  const [game, setGame] = useState(() => createGame(Date.now() >>> 0));
  const [view, setView] = useState<'play' | 'results'>('play');
  const round = currentRound(game);
  const guessed = round.guess !== null;
  const peeked = round.revealed.length;
  const worth = potentialPoints(Math.max(1, peeked)) * multiplierFor(game.streak);
  const quips = round.correct ? CORRECT_QUIPS : WRONG_QUIPS;
  const quip = quips[(game.index + round.subject.length) % quips.length];
  const restart = () => { setGame(createGame(Date.now() >>> 0)); setView('play'); };

  return <div className="hd-app">
    <header className="hd-header">
      <h1>🌭 {t('Hot Dog or Not')}</h1>
      <p>{t('Peek under as few tiles as you dare, then make the call.')}</p>
    </header>

    {view === 'results' ? <section className="hd-results">
      <p className="hd-rank-label">{t('Final rank')}</p>
      <h2>{t(rankFor(game.score))}</h2>
      <p className="hd-total">{t('{score} points', { score: game.score })}</p>
      <ol className="hd-breakdown">
        {game.rounds.map((r, i) => <li key={i} className={r.correct ? 'hd-good' : 'hd-bad'}>
          <span>{r.correct ? '✓' : '✗'}</span>
          <span>{t('{count} tiles peeked', { count: r.revealed.length })}</span>
          <strong>{t('{points} pts', { points: r.points })}</strong>
        </li>)}
      </ol>
      <button type="button" className="hd-button hd-primary" onClick={restart}>{t('Play again')}</button>
    </section> : <>
      <div className="hd-status">
        <span className="hd-chip">{t('Round {current} of {total}', { current: game.index + 1, total: ROUND_COUNT })}</span>
        <span className="hd-chip">{t('Score: {score}', { score: game.score })}</span>
        <span className="hd-chip">{t('Streak ×{multiplier}', { multiplier: multiplierFor(game.streak) })}</span>
      </div>

      {/* Keyed by round so the cover tiles remount fully opaque each round,
          instead of fade-transitioning back from the previous round's reveal. */}
      <Stage key={game.index} game={game} onReveal={tile => setGame(g => revealTile(g, tile))} />

      {guessed ? <div className={`hd-verdict ${round.correct ? 'hd-good' : 'hd-bad'}`} role="status">
        <strong>{round.correct ? t('Correct!') : t('Wrong!')}</strong>
        <span>{round.kind === 'hotdog' ? t('It was a hot dog all along.') : t('That was never a hot dog.')} {t(quip.text)}</span>
        <strong>{t('+{points} pts', { points: round.points })}</strong>
        <button type="button" className="hd-button hd-primary" onClick={() => (isFinished(game) ? setView('results') : setGame(nextRound))}>
          {isFinished(game) ? t('See results') : t('Next round')}
        </button>
      </div> : <div className="hd-controls">
        <p className="hd-worth" aria-live="polite">
          {peeked === 0 ? t('Peek a tile to unlock your guess.') : t('Guess now for {points} pts', { points: worth })}
        </p>
        <div className="hd-guesses">
          <button type="button" className="hd-button hd-primary" disabled={!canGuess(game)} onClick={() => setGame(g => makeGuess(g, 'hotdog'))}>
            🌭 {t('Hot Dog')}
          </button>
          <button type="button" className="hd-button hd-secondary" disabled={!canGuess(game)} onClick={() => setGame(g => makeGuess(g, 'imposter'))}>
            🚫 {t('Not Hot Dog')}
          </button>
        </div>
      </div>}
    </>}
  </div>;
}
