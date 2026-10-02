import { useEffect, useRef, useState } from 'react';
import { t } from '@hedgeling/i18n/runtime';
import type { PossumDecision } from '@scroll-goblin/shared';
import { MeasurementSource } from './QuantumReceipt';

export default function ChewedParchment({ decision, retrying, onRetry, onNew }: {
  decision: PossumDecision; retrying: boolean; onRetry: () => void; onNew: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [decision.id]);
  useEffect(() => { setCopied(false); setCopyError(false); }, [decision.narration]);
  const { measurement, narration, dilemma } = decision;
  if (!measurement || !narration) return null;
  const winner = measurement.result === 0 ? dilemma.optionA : dilemma.optionB;
  const other = measurement.result === 0 ? dilemma.optionB : dilemma.optionA;
  const wisdom = narration.source === 'written' ? t(narration.wisdom) : narration.wisdom;
  const alternateTimeline = narration.source === 'written' ? t(narration.alternate_timeline) : narration.alternate_timeline;
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${dilemma.question}\n\n${winner}\n${wisdom}\n\n${t('The other timeline')}: ${other}\n${alternateTimeline}\n\n${t('Schrödinger’s Possum')} · ${measurement!.source === 'hardware' ? t('Quantum measurement') : t('Classical randomness')}\nhttps://scrollgoblin.fun/apps/schrodingers-possum`);
      setCopied(true); setCopyError(false);
    } catch { setCopyError(true); }
  }
  return <section className="sp-result" aria-label="Your decision">
    <div className="sp-parchment">
      <div className="sp-parchment-top"><span className="sp-eyebrow">03 / THE COLLAPSE</span><span className="sp-stamp" aria-hidden="true">PERCY<br />APPROVED</span></div>
      <p className="sp-result-question" dir="auto" translate="no">{dilemma.question}</p>
      <p className={`sp-winner-label ${measurement.result === 0 ? 'is-blue' : 'is-red'}`}>{measurement.result === 0 ? t('PORTAL A HAS SPOKEN') : t('PORTAL B HAS SPOKEN')}</p>
      <h2 ref={heading} tabIndex={-1} dir="auto" translate="no">{winner}</h2>
      <p className="sp-wisdom" dir="auto" translate="no">{wisdom}</p>
      <div className="sp-alternate"><span className="sp-eyebrow">MEANWHILE, IN THE OTHER TIMELINE…</span>
        <h3 dir="auto" translate="no">{other}</h3><p dir="auto" translate="no">{alternateTimeline}</p></div>
      <p className="sp-signature">With questionable certainty,<br /><span>Percy</span><span className="sp-paw" aria-hidden="true">✹</span></p>
    </div>
    <div className="sp-narration-note">
      {narration.source === 'written' && <p>Percy’s storyteller is resting. This is a note from his emergency stash.</p>}
      <button type="button" disabled={retrying} onClick={onRetry}>{retrying ? t('Fetching his story…')
        : narration.source === 'written' ? t('Retry the story · keep this choice') : t('Rewrite the note · keep this choice')}</button>
    </div>
    <MeasurementSource measurement={measurement} />
    <div className="sp-result-actions"><button className="sp-primary" onClick={onNew}>Another dilemma <span aria-hidden="true">↗</span></button>
      <button className="sp-copy" onClick={copy}>{copied ? t('Copied ✓') : t('Copy result')}</button></div>
    <span className="sp-small" role="status">{copyError ? t('Could not copy. You can select and copy the note above.') : copied ? t('Your result is ready to paste.') : ''}</span>
  </section>;
}
