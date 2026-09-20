import { t } from '@hedgeling/i18n/runtime';
import { useEffect, useRef } from 'react';
import type { Faction } from './game';
export type Outcome = 'win' | 'loss' | 'draw';
export default function Ending({ outcome, reason, faction, onReview, onRestart }: {
  outcome: Outcome; reason: string; faction: Faction; onReview: () => void; onRestart: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current!; const previous = document.activeElement as HTMLElement | null;
    el.showModal();
    return () => { el.close(); previous?.focus(); };
  }, []);
  const win = outcome === 'win', loss = outcome === 'loss';
  const army = faction === 'goblins' ? 'Scroll Goblins' : 'Hedgelings';
  const confetti = faction === 'goblins' ? ['✦', '📜', '✧', '💜'] : ['✦', '🍂', '🌰', '✧'];
  return <dialog ref={dialog} className={`gc-ending gc-ending-${outcome}`} aria-labelledby="gc-ending-title" aria-describedby="gc-ending-reason" onCancel={e => { e.preventDefault(); onReview(); }}>
    {win && <div className="gc-confetti" aria-hidden="true">{Array.from({ length: 36 }, (_, i) => <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${-(i % 8) * .43}s`, animationDuration: `${3.3 + (i % 5) * .36}s` }}>{confetti[i % confetti.length]}</span>)}</div>}
    <div className="gc-ending-content">
      <p className="gc-eyebrow">{win ? 'LET THE WOODLANDS REJOICE' : loss ? 'A MOMENT FOR THE FALLEN' : 'PEACE IN THE CLEARING'}</p>
      <div className="gc-ending-emblem" aria-hidden="true">{win ? '♛' : loss ? '🥀' : '❧'}</div>
      <h2 id="gc-ending-title">{win ? 'Victory is yours!' : loss ? 'The forest falls quiet.' : 'An honorable draw.'}</h2>
      <p className="gc-ending-story">{win ? `The ${army} raise a cheer. Their commander has earned a very splendid crown.` : loss ? `The ${army} lower their banners. Rest, regroup, and live to cause mischief another day.` : 'Both armies lay down their crowns. Some battles end with a shared cup of tea.'}</p>
      <p id="gc-ending-reason">{t(reason)}</p>
      <div className="gc-ending-actions"><button className="gc-primary" onClick={onRestart}>Play again →</button><button onClick={onReview}>Review the board</button></div>
    </div>
  </dialog>;
}
