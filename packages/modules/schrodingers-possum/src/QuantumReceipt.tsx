import { useEffect, useId, useRef, useState } from 'react';
import { t } from '@hedgeling/i18n/runtime';
import type { PossumMeasurement } from '@scroll-goblin/shared';

const quantumNotes = [
  "A literal subatomic particle was forced to collapse its state just because you couldn't make up your mind. Here is the receipt.",
  'This decision was pulled from a real quantum computer by a possum with zero safety training. No refunds.',
  'Percy gnawed on the data stream, but we managed to salvage the raw telemetry of your existential crisis.',
];
const classicalNotes = [
  'The quantum computer was unavailable, so Percy borrowed your browser’s cryptographic coin. Same indecision. Different paperwork.',
  'This decision was pulled from your browser’s random generator by a possum with zero safety training. No refunds.',
  quantumNotes[2],
];

export function MeasurementSource({ measurement }: { measurement: PossumMeasurement }) {
  return <div className={`sp-source ${measurement.source === 'hardware' ? 'is-quantum' : 'is-classical'}`}>
    <span className="sp-source-dot" aria-hidden="true" />
    {measurement.source === 'hardware' ? t('Quantum measurement · Amazon Braket') : t('Classical randomness · quantum pool unavailable')}
  </div>;
}

function receiptPayload(measurement: PossumMeasurement) {
  const hardware = measurement.source === 'hardware';
  return hardware ? {
    source: 'Amazon Braket QPU', device: measurement.deviceArn.split('/').slice(-2).join(' / '),
    taskId: measurement.taskArn.split('/').at(-1), measuredAt: measurement.measuredAt,
    batchShots: measurement.batchShots ?? 'Not recorded in this older batch',
    shotIndex: measurement.shot, circuitQubits: measurement.circuitQubits,
    selectedQubit: measurement.bitIndex, consumedShots: 1, result: measurement.result,
    option: measurement.result === 0 ? 'A' : 'B',
  } : {
    source: 'Classical randomness · Web Crypto', reason: measurement.reason,
    generatedAt: measurement.measuredAt, result: measurement.result,
    option: measurement.result === 0 ? 'A' : 'B',
  };
}

export default function QuantumReceipt({ measurement }: { measurement?: PossumMeasurement }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(0);
  const nextNote = useRef(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const backdropPress = useRef(false);
  const titleId = useId();
  const noteId = useId();
  const provenanceLabel = t('Decision provenance');
  const hardware = measurement?.source === 'hardware';

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    if (!element) return;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      trigger.current?.focus({ preventScroll: true });
    };
  }, [open]);

  function showReceipt() {
    if (!measurement) return;
    setNote(nextNote.current);
    nextNote.current = (nextNote.current + 1) % quantumNotes.length;
    setOpen(true);
  }

  return <>
    <button ref={trigger} type="button" className="sp-proof-button" disabled={!measurement}
      aria-haspopup="dialog" onClick={showReceipt}
      title={!measurement ? t('Your receipt appears after the portals choose.') : undefined}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M8 5H5l-1 16 15 1 1-16h-4M8 3l8 1-.3 4-8-.5L8 3Z" /><path d="m8 12 7 1m-7 3 5 .5" />
      </svg>
      {t('Proof of Chaos')} <span aria-hidden="true">↗</span>
    </button>
    <dialog ref={dialog} className="sp-clipboard-modal" aria-labelledby={titleId} aria-describedby={noteId}
      onCancel={event => { event.preventDefault(); setOpen(false); }}
      onClose={() => setOpen(false)}
      onPointerDown={event => { backdropPress.current = event.target === event.currentTarget; }}
      onClick={event => { if (backdropPress.current && event.target === event.currentTarget) setOpen(false); }}>
      {open && measurement && <div className="sp-clipboard">
        <div className="sp-clipboard-clip" aria-hidden="true"><i /><i /></div>
        <button ref={closeButton} type="button" className="sp-clipboard-close" onClick={() => setOpen(false)} aria-label={t('Close Proof of Chaos')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="m5 4 14 15M19 5 5 20" /></svg>
        </button>
        <div className="sp-clipboard-paper">
          <p className="sp-clipboard-kicker">PERCY’S QUANTUM LAB / EVIDENCE DEPARTMENT</p>
          <h2 id={titleId}>Proof of Chaos</h2>
          <MeasurementSource measurement={measurement} />
          <p id={noteId} className="sp-clipboard-note">{t((hardware ? quantumNotes : classicalNotes)[note])}</p>
          <pre tabIndex={0} aria-label={provenanceLabel} dir="ltr" translate="no" data-hl-skip>{JSON.stringify(receiptPayload(measurement), null, 2)}</pre>
          <div className="sp-clipboard-filed" aria-hidden="true">FILED UNDER: QUESTIONABLE</div>
          <p className="sp-clipboard-disclaimer">{hardware
            ? t('Physical hardware can have measurement bias; equal odds are the ideal target.')
            : t('The quantum service was unavailable, so this decision used your browser’s cryptographic random generator. No quantum measurement is claimed.')}</p>
        </div>
      </div>}
    </dialog>
  </>;
}
