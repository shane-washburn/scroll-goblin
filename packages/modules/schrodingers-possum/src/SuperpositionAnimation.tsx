import { useEffect, useState } from 'react';
import { t } from '@hedgeling/i18n/runtime';
import type { PossumMeasurement } from '@scroll-goblin/shared';
import PercyScene, { type ScenePhase } from './PercyScene';
import QuantumReceipt from './QuantumReceipt';

const statuses = ['Consulting the multiverse…', 'Aligning qubits…', 'Dodging traffic in Timeline B…', 'Untangling a very theoretical tail…', 'Locating the least chewed paperwork…'];

export default function SuperpositionAnimation({ phase, winner, optionA, optionB, reducedMotion, measurement }: {
  phase: ScenePhase; winner?: 0 | 1; optionA: string; optionB: string; reducedMotion: boolean; measurement?: PossumMeasurement;
}) {
  const [status, setStatus] = useState(0);
  useEffect(() => {
    setStatus(0);
    if (phase !== 'superposition') return;
    const interval = window.setInterval(() => setStatus(value => (value + 1) % statuses.length), 2700);
    return () => window.clearInterval(interval);
  }, [phase]);
  return <section className={`sp-stage sp-stage-${phase}`} aria-label="Percy’s quantum laboratory">
    <div className="sp-stage-top"><span><i aria-hidden="true" /> {t('PERCY’S QUANTUM LAB')}</span><span>EST. IN ANOTHER TIMELINE</span></div>
    <div className="sp-equation" dir="ltr" translate="no" data-hl-skip aria-hidden="true">|Ψ⟩ = <span>α</span>|0⟩ + <span>β</span>|1⟩</div>
    <PercyScene phase={phase} winner={winner} reducedMotion={reducedMotion} />
    <div className="sp-portal-labels" dir="ltr" aria-hidden="true"><div className={winner === 0 && phase === 'resolved' ? 'is-winning' : ''}><b translate="no">A</b><span dir="auto" translate="no">{optionA || t('A possibility')}</span></div>
      <div className={winner === 1 && phase === 'resolved' ? 'is-winning' : ''}><b translate="no">B</b><span dir="auto" translate="no">{optionB || t('Another possibility')}</span></div></div>
    <div className="sp-stage-caption" role="status" aria-live="polite">
      <span className="sp-stage-state">{phase === 'superposition' ? t('SUPERPOSITION IN PROGRESS') : phase === 'collapse' ? t('REALITY IS SETTLING') : phase === 'resolved' ? t('ONE TIMELINE. FRESHLY CHEWED.') : t('BOTH POSSIBLE. EQUALLY SUSPICIOUS.')}</span>
      <p>{phase === 'superposition' ? t(statuses[status]) : phase === 'collapse' ? t('Percy is making an entrance…') : phase === 'resolved' ? t('The universe has spoken. Percy has added footnotes.') : t('A small possum. An unreasonable amount of responsibility.')}</p>
    </div>
    <QuantumReceipt measurement={measurement} />
  </section>;
}
