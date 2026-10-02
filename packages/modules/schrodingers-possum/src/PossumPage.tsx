import { useEffect, useRef, useState } from 'react';
import { getLocale, t } from '@hedgeling/i18n/runtime';
import { trackStat } from '@scroll-goblin/ui';
import { type Dilemma, type PossumDecision } from '@scroll-goblin/shared';
import DilemmaForm from './DilemmaForm';
import SuperpositionAnimation from './SuperpositionAnimation';
import ChewedParchment from './ChewedParchment';
import { DecisionError, forgetDecision, measureDecision, narrateDecision, readDecision, saveDecision } from './decision';
import { narrationUrl, quantumUrl } from './config';
import type { ScenePhase } from './PercyScene';
import './possum.css';

const blank: Dilemma = { question: '', optionA: '', optionB: '', tone: 'feral' };
function readSaved() { try { return readDecision(localStorage); } catch { return null; } }
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

export default function PossumPage() {
  const [decision, setDecision] = useState<PossumDecision | null>(readSaved);
  const [initial, setInitial] = useState<Dilemma>(decision?.dilemma ?? blank);
  const [phase, setPhase] = useState<ScenePhase>(decision?.narration ? 'resolved' : 'idle');
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const active = useRef<AbortController | null>(null);
  const sceneColumn = useRef<HTMLDivElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const revealRequested = useRef(false);
  const busy = phase === 'superposition' || phase === 'collapse';

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => { query.removeEventListener('change', update); active.current?.abort(); };
  }, []);

  useEffect(() => {
    if (phase !== 'resolved' || !revealRequested.current) return;
    revealRequested.current = false;
    if (matchMedia('(max-width: 740px)').matches) {
      controls.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
    }
  }, [phase, reducedMotion]);

  function remember(next: PossumDecision) {
    setDecision(next);
    try { saveDecision(next, localStorage); setStorageWarning(false); }
    catch { setStorageWarning(true); }
  }

  async function run(next: PossumDecision) {
    if (active.current) return;
    const controller = new AbortController(); active.current = controller;
    const { signal } = controller;
    const start = performance.now();
    setError(''); setPhase('superposition');
    revealRequested.current = true;
    if (matchMedia('(max-width: 740px)').matches) {
      sceneColumn.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
    }
    remember(next);
    try {
      if (!next.measurement) {
        const measurement = await measureDecision(next.id, quantumUrl, signal);
        signal.throwIfAborted();
        next = { ...next, measurement };
        remember(next); // Commit before doing anything that can fail in narration.
        trackStat('schrodingers-possum', 'decisions');
      }
      if (!next.narration) {
        const narration = await narrateDecision(next, narrationUrl, getLocale(), signal);
        signal.throwIfAborted();
        next = { ...next, narration };
        remember(next);
      }
      await wait(Math.max(0, (reducedMotion ? 300 : 2600) - (performance.now() - start)), signal);
      setPhase('collapse');
      await wait(reducedMotion ? 100 : 1500, signal);
      setPhase('resolved');
    } catch (cause) {
      if (signal.aborted) return;
      setError(cause instanceof DecisionError ? cause.message : 'The portal got tangled. Try this same experiment again.');
      setPhase('idle');
    } finally { if (active.current === controller) active.current = null; }
  }

  async function retryStory() {
    if (!decision?.measurement || active.current) return;
    const controller = new AbortController(); active.current = controller;
    setRetrying(true);
    try {
      const narration = await narrateDecision(decision, narrationUrl, getLocale(), controller.signal);
      if (!controller.signal.aborted) remember({ ...decision, narration });
    } catch { /* Navigation cancels narration without touching the decision. */ }
    finally {
      if (active.current === controller) { active.current = null; setRetrying(false); }
    }
  }

  function reset(dilemma: Dilemma) {
    active.current?.abort(); active.current = null;
    setInitial(dilemma); setDecision(null); setPhase('idle'); setError('');
    setRetrying(false); setFormVersion(value => value + 1);
    try { forgetDecision(localStorage); setStorageWarning(false); } catch { setStorageWarning(true); }
  }

  // Hedgeling's build-time React translations own this subtree. The DOM injector
  // can otherwise restore stale text when an unchanged English translation is edited.
  return <div className="sp-app" translate="no"><div className="sp-shell">
    <header className="sp-header"><div><p className="sp-eyebrow"><span aria-hidden="true">✳</span> THE DEPARTMENT OF QUESTIONABLE DECISIONS</p>
      {/* Build-time i18n translates this whole title. Keep the DOM injector from mistaking ’s for seconds. */}
      <h1 translate="no">Schrödinger’s <span>Possum.</span></h1>
      <p>Two choices. One deeply unqualified possum.</p></div>
      <div className="sp-header-seal" aria-hidden="true"><span>50 / 50</span><small>{t('FATE HAS LITTLE HANDS')}</small></div></header>
    <main className="sp-workbench">
      <div className="sp-scene-column" ref={sceneColumn}><SuperpositionAnimation phase={phase}
        measurement={phase === 'resolved' ? decision?.measurement : undefined}
        winner={phase === 'collapse' || phase === 'resolved' ? decision?.measurement?.result : undefined}
        optionA={decision?.dilemma.optionA ?? ''} optionB={decision?.dilemma.optionB ?? ''} reducedMotion={reducedMotion} />
        <div className="sp-lab-note"><span aria-hidden="true">↳</span><p>Real quantum measurements when available.<br />A clearly labeled classical coin flip when the universe is busy.</p></div>
      </div>
      <div className="sp-controls" ref={controls} aria-busy={busy || retrying}>
        {phase === 'resolved' && decision?.narration ? <ChewedParchment decision={decision} retrying={retrying} onRetry={retryStory}
          onNew={() => reset({ ...blank, tone: decision.dilemma.tone })} />
          : busy ? <section className="sp-waiting"><span className="sp-eyebrow">02 / PLEASE HOLD REALITY</span>
            <div className="sp-wait-orbit" aria-hidden="true"><span>Ψ</span><i /><i /></div>
            <h2>{phase === 'collapse' ? t('A choice has escaped.') : t('Somewhere, something is happening.')}</h2>
            <p>{phase === 'collapse' ? t('Percy is bringing you the paperwork.') : t('Percy is considering both possibilities with absolutely no qualifications.')}</p>
            <div className="sp-wait-options" translate="no"><span dir="auto"><b>A</b>{decision?.dilemma.optionA}</span><span dir="auto"><b>B</b>{decision?.dilemma.optionB}</span></div>
            <p className="sp-small">You may experience a brief sense of cosmic indecision.</p>
          </section>
          : decision ? <section className="sp-resume"><span className="sp-eyebrow">AN UNFINISHED EXPERIMENT</span><h2>Right where you left Percy.</h2>
            <p dir="auto" translate="no">{decision.dilemma.question}</p>
            {decision.measurement && <p>Your choice is saved. Percy just needs to finish the note.</p>}
            <button className="sp-primary" onClick={() => void run(decision)}>{decision.measurement ? t('Finish the note') : t('Continue this dilemma')} <span aria-hidden="true">↗</span></button>
            <button className="sp-text-button" onClick={() => reset(decision.dilemma)}>Edit the dilemma</button>
          </section>
          : <DilemmaForm key={formVersion} initial={initial} disabled={busy} onSubmit={dilemma => void run({ id: crypto.randomUUID(), dilemma, createdAt: Date.now() })} />}
        {error && <p className="sp-error" role="alert">{t(error)}</p>}
        {storageWarning && <p className="sp-small" role="status">This browser cannot save your result. Keep this tab open to preserve it.</p>}
      </div>
    </main>
    <footer className="sp-footer"><div><b>01</b><span>Offer two possibilities.</span></div><div><b>02</b><span>Let a tiny bit of fate decide.</span></div><div><b>03</b><span>Meet the timeline you kept.</span></div>
      <p>A little nudge, not a prophecy. The final say is always yours.</p></footer>
  </div></div>;
}
