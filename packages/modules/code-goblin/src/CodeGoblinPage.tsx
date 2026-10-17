import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, ChevronRight, Clock3, Code2, Download, Flame,
  FlaskConical, Heart, Leaf, Lightbulb, LockKeyhole, Map, RotateCcw, Settings2, ShieldCheck,
  Sparkles, Star, Volume2, VolumeX, WandSparkles, X } from 'lucide-react';
import { getAudioBus } from '@scroll-goblin/ui';
import { CHALLENGE_COUNT, CHALLENGE_NAMES, CHAMBERS, LESSONS, TIER_NAMES, TRACKS, lessonsFor } from './curriculum';
import { CAST_SECONDS, MAX_HEARTS, SAVE_KEY, canEquip, correctAnswer, currentStreak, earnedStars,
  freshProgress, latestCompletion, nextCampaignLesson, readProgress, starsTotal, transition, unlocked, xpTotal, type Action } from './engine';
import type { Answer, Challenge, Character, Lesson, Progress, Run, TrackId, Trinket } from './types';
import worldArt from './assets/world.jpg';
import './code-goblin.css';

type View = 'map' | 'lesson' | 'guide' | 'loot' | 'certificate';
const CHARACTER_NAMES = { pip: 'Pip the Byte-Goblin', pythia: 'Arch-Mage Pythia', brak: 'Iron-Smith Brak', percy: 'Schrödinger’s Percy', imp: 'The Glitch Imp' };
const TRINKETS: { id: Trinket; title: string; description: string; requirement: string; icon: string }[] = [
  { id: 'none', title: 'The trusty satchel', description: 'Everything an apprentice needs. Mostly sticky notes.', requirement: 'Yours from the beginning', icon: '✉' },
  { id: 'scarf', title: 'The Indentation Scarf', description: 'Four stitches. Always four stitches.', requirement: 'Earn 9 stars', icon: '≋' },
  { id: 'hammer', title: 'The Byte-Forged Hammer', description: 'For particularly stubborn semicolons.', requirement: 'Earn 24 stars', icon: '⚒' },
  { id: 'tail', title: 'Percy’s Cosmic Possum Tail', description: 'A little stardust for a very long journey.', requirement: `Complete all ${lessonsFor('nether').length} Nether lessons`, icon: '☄' },
];

function Portrait({ character = 'pip', mood = 'neutral', equipped = 'none', className = '' }: {
  character?: Character; mood?: 'neutral' | 'happy' | 'worried'; equipped?: Trinket; className?: string;
}) {
  const cell = character === 'pip' ? mood === 'happy' ? 1 : mood === 'worried' ? 2 : equipped === 'scarf' ? 7 : equipped === 'hammer' ? 8 : 0
    : { pythia: 3, brak: 4, percy: 5, imp: 6 }[character];
  return <div role="img" aria-label={`${CHARACTER_NAMES[character]}${character === 'pip' && equipped !== 'none' ? ` · ${TRINKETS.find(t => t.id === equipped)?.title}` : ''}`}
    className={`cg-portrait ${equipped === 'tail' && character === 'pip' ? 'cg-cosmic' : ''} ${className}`}
    style={{ backgroundPosition: `${(cell % 3) * 50}% ${Math.floor(cell / 3) * 50}%` }}>
    {equipped === 'tail' && character === 'pip' && <svg className="cg-tail" viewBox="0 0 100 150" aria-hidden="true">
      <path d="M 10 137 C 81 149 103 103 79 72 C 57 42 28 66 44 88 C 56 104 76 90 63 78" fill="none" stroke="#9574ac" strokeWidth="13" strokeLinecap="round" />
      <path d="M 10 137 C 81 149 103 103 79 72 C 57 42 28 66 44 88 C 56 104 76 90 63 78" fill="none" stroke="#dfbacd" strokeWidth="7" strokeLinecap="round" strokeDasharray="3 4" />
      <path d="m 44 25 3 10 10 3 -10 3 -3 10 -3 -10 -10 -3 10 -3 z M 86 45 l 2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 z" fill="#c9a65d" />
    </svg>}
  </div>;
}
function Code({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <pre className={`cg-code ${className}`} dir="ltr" translate="no" data-hedgeling-ignore="true"><code>{children}</code></pre>;
}
function Stars({ count, label = true }: { count: number; label?: boolean }) {
  return <span className="cg-stars" role={label ? 'img' : undefined} aria-label={label ? `${count} of 3 stars` : undefined} aria-hidden={!label || undefined}>
    {[1, 2, 3].map(i => <Star key={i} size={15} fill={i <= count ? 'currentColor' : 'none'} opacity={i <= count ? 1 : .3} />)}
  </span>;
}
function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = old; previous?.focus(); };
  }, []);
  return <dialog className="cg-modal" ref={ref} aria-labelledby="cg-modal-title" onCancel={close}
    onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}>
    <div className="cg-modal-heading"><h2 id="cg-modal-title">{title}</h2><button className="cg-icon-button" onClick={close} aria-label="Close dialog"><X size={20} /></button></div>
    {children}
  </dialog>;
}
function chime(correct: boolean) {
  try {
    const { ctx, out } = getAudioBus();
    (correct ? [523.25, 659.25, 783.99] : [220, 196]).forEach((frequency, i) => {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      const start = ctx.currentTime + i * .08;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.035, start + .02);
      gain.gain.exponentialRampToValueAtTime(.001, start + .22);
      oscillator.connect(gain); gain.connect(out); oscillator.start(start); oscillator.stop(start + .24);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  } catch { /* Audio is optional; a missing AudioContext never blocks a lesson. */ }
}

function loadSave() {
  try { return { ...readProgress(localStorage.getItem(SAVE_KEY), LESSONS), unavailable: false }; }
  catch { return { progress: freshProgress(), recovered: false, unavailable: true }; }
}

export default function CodeGoblinPage() {
  const [initial] = useState(loadSave);
  const [progress, setProgress] = useState(initial.progress);
  const [view, setView] = useState<View>('map');
  const [saveWarning, setSaveWarning] = useState(initial.unavailable ? 'Browser storage is unavailable. Progress will last for this tab only.' :
    initial.recovered ? 'Some saved data was unreadable. Valid progress was recovered where possible.' : '');
  const [settings, setSettings] = useState(false);
  const [pending, setPending] = useState<{ lesson: Lesson; practice: boolean } | null>(null);
  const focusTarget = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  const lastSaved = useRef<string | null>(null);
  const lastCheckpoint = useRef<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  const run = progress.run;
  const currentLesson = LESSONS.find(l => l.nodeId === run?.nodeId);
  const track = TRACKS[progress.selectedTrack];
  const trackLessons = lessonsFor(progress.selectedTrack);
  const nextLesson = trackLessons.find(l => !progress.completed[l.nodeId] && unlocked(l, progress));
  const nextPathLesson = nextCampaignLesson(progress, LESSONS);
  const netherComplete = lessonsFor('nether').every(l => Boolean(progress.completed[l.nodeId]));
  const stars = starsTotal(progress);
  const dispatch = (action: Action) => {
    // Synchronous ref prevents double clicks from scoring an old snapshot.
    const before = progressRef.current;
    const after = transition(before, action, LESSONS);
    progressRef.current = after;
    setProgress(after);
    if (after.sound && !before.run?.feedback && after.run?.feedback) chime(after.run.feedback === 'correct');
  };
  const persist = useCallback(() => {
    const serialized = JSON.stringify(progressRef.current);
    if (serialized === lastSaved.current) return;
    try { localStorage.setItem(SAVE_KEY, serialized); lastSaved.current = serialized; }
    catch { setSaveWarning('Progress could not be saved. Keep this tab open to continue this session.'); }
  }, []);
  useEffect(() => {
    // Only typing drafts are delayed. Scores, clocks and other choices save immediately.
    const checkpoint = JSON.stringify({ ...progress, run: progress.run && typeof progress.run.answer === 'string'
      ? { ...progress.run, answer: null } : progress.run });
    if (checkpoint !== lastCheckpoint.current) { lastCheckpoint.current = checkpoint; persist(); return; }
    const timer = window.setTimeout(persist, 300);
    return () => window.clearTimeout(timer);
  }, [progress, persist]);
  useEffect(() => { persist(); }, [view, persist]);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') persist(); };
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', onHide);
    return () => { persist(); window.removeEventListener('pagehide', persist); document.removeEventListener('visibilitychange', onHide); };
  }, [persist]);
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const before = progressRef.current;
      setClock(last => before.run?.deadline || Math.floor(last / 60000) !== Math.floor(now / 60000) ? now : last);
      const expired = before.run?.deadline && now >= before.run.deadline;
      const after = transition(before, { type: expired ? 'timeout' : 'refresh' }, LESSONS, new Date(now));
      if (after !== before) { progressRef.current = after; setProgress(after); }
    };
    const timer = window.setInterval(tick, 250);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, []);
  useEffect(() => {
    if (view !== 'lesson') return;
    focusTarget.current?.focus({ preventScroll: true });
    focusTarget.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [view, run?.phase, run?.index]);
  const begin = (lesson: Lesson, practice = false) => {
    if (run && run.phase !== 'complete' && run.nodeId === lesson.nodeId && run.practice === practice) { setView('lesson'); return; }
    if (run && run.phase !== 'complete') { setPending({ lesson, practice }); return; }
    dispatch({ type: 'start', nodeId: lesson.nodeId, practice }); setView('lesson');
  };
  const practice = () => begin(LESSONS.find(l => l.nodeId === run?.nodeId) ?? nextLesson ?? trackLessons.find(l => unlocked(l, progress)) ?? LESSONS[0], true);
  const resume = run && run.phase !== 'complete';
  const topAction = () => {
    if (resume) setView('lesson');
    else if (nextLesson) begin(nextLesson, progress.hearts === 0);
    else if (netherComplete) setView('certificate');
    else if (nextPathLesson) dispatch({ type: 'track', track: nextPathLesson.trackId });
    else setView('guide');
  };
  return <div className="cg-app" lang="en" data-track={progress.selectedTrack}>
    <div className="cg-shell">
      <header className="cg-header">
        <button className="cg-brand" onClick={() => setView('map')} aria-label="Code Goblin adventure map">
          <span className="cg-brand-seal"><Code2 size={25} /></span>
          <span><span className="cg-eyebrow">THE SCROLL GOBLIN GUILD</span><span className="cg-logotype">Code Goblin<span className="cg-brand-star">✦</span></span></span>
        </button>
        <div className="cg-status" aria-label="Your progress">
          <div className="cg-heart-status" title="Five hearts each day. Complete practice to recover one.">
            <span className="cg-heart-icons" role="img" aria-label={`${progress.hearts} of ${MAX_HEARTS} hearts`}>
              {Array.from({ length: 5 }, (_, i) => <Heart key={i} size={19} fill={i < progress.hearts ? 'currentColor' : 'none'} opacity={i < progress.hearts ? 1 : .3} />)}
            </span><small>Daily hearts</small>
          </div>
          <div><span><Flame size={19} />{currentStreak(progress, new Date(clock))}</span><small>Day streak</small></div>
          <div><span><Sparkles size={18} />{xpTotal(progress)}</span><small>Total XP</small></div>
        </div>
      </header>
      <nav className="cg-nav" aria-label="Code Goblin">
        <div>{([{ id: 'map', text: 'Adventure map', icon: Map }, { id: 'guide', text: 'Field guide', icon: BookOpen }, { id: 'loot', text: 'Pip’s satchel', icon: FlaskConical }] as const).map(tab =>
          <button key={tab.id} aria-current={view === tab.id ? 'page' : undefined} onClick={() => setView(tab.id)}><tab.icon size={16} /><span>{tab.text}</span></button>)}</div>
        <div><button className="cg-nav-icon" aria-label={progress.sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={progress.sound}
          onClick={() => dispatch({ type: 'setting', name: 'sound', value: !progress.sound })}>{progress.sound ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
          <button className="cg-nav-icon" aria-label="Learning settings" onClick={() => setSettings(true)}><Settings2 size={17} /></button></div>
      </nav>
      {saveWarning && <p className="cg-notice" role="status">{saveWarning}</p>}
      {view === 'map' && <>
        <section className="cg-hero">
          <img src={worldArt} className="cg-world" alt="An enchanted forest and an iron forge, joined by a winding path toward a distant cosmic portal" fetchPriority="high" />
          <div className="cg-hero-copy"><p className="cg-eyebrow"><span /> YOUR NEXT CHAPTER STARTS HERE</p>
            <h1>Small spells.<br />Extraordinary<br /><em>possibilities.</em></h1>
            <p>Learn to code in a world worth getting<br className="cg-desktop-break" /> a little lost in. Pip saved you a place.</p>
            <button className="cg-button cg-primary" onClick={topAction}>{resume ? 'Continue your lesson' : nextLesson ? Object.keys(progress.completed).length ? 'Continue the adventure' : 'Begin your adventure' : netherComplete ? 'Your certificate awaits' : 'Explore the next path'}<ArrowRight size={17} /></button>
            <span className="cg-hero-footnote">A few minutes. One spell at a time.</span>
          </div>
          <div className="cg-map-caption"><span>✧</span> THE REALMS OF CODE <span>✧</span></div>
        </section>
        <div className="cg-section-heading"><div><p className="cg-eyebrow">TWO PATHS. ONE GRAND ADVENTURE.</p><h2>Choose your craft</h2></div><span className="cg-small">{Object.keys(progress.completed).length} / {LESSONS.length} lessons complete</span></div>
        <div className="cg-tracks" role="group" aria-label="Choose a curriculum track">
          {(Object.keys(TRACKS) as TrackId[]).map(id => {
            const meta = TRACKS[id], nodes = lessonsFor(id), done = nodes.filter(l => progress.completed[l.nodeId]).length;
            const locked = !unlocked(nodes[0], progress);
            return <button className={`cg-track cg-track-${id}`} key={id} aria-pressed={progress.selectedTrack === id} onClick={() => dispatch({ type: 'track', track: id })}>
              <Portrait character={meta.character} /><span className="cg-track-copy"><span className="cg-eyebrow">{meta.language}{locked && <LockKeyhole size={11} />}</span><strong>{meta.title}</strong><small>{meta.description}</small>
                <span className="cg-track-progress"><span style={{ width: `${done / nodes.length * 100}%` }} /></span><span className="cg-track-count">{locked ? 'Complete both language paths to enter' : `${done} of ${nodes.length} spells learned`}</span></span>
              {progress.selectedTrack === id && <span className="cg-track-selected"><Check size={12} /></span>}
            </button>;
          })}
        </div>
        <div className="cg-adventure-grid">
          <section className="cg-roadmap" aria-label={`${track.title} lessons`}>
            {progress.selectedTrack === 'nether' && !unlocked(trackLessons[0], progress) && <div className="cg-notice"><LockKeyhole size={18} /><span>The Nether opens after all {lessonsFor('python').length} Python and all {lessonsFor('java').length} Java lessons. Your two crafts meet here.</span></div>}
            {[1, 2, 3].map(tier => <section className="cg-tier" key={tier}>
              <div className="cg-tier-title"><span className="cg-tier-number">0{tier}</span><div><p className="cg-eyebrow">{progress.selectedTrack === 'nether' ? 'CHAMBER' : 'TIER'} {tier}</p><h3>{progress.selectedTrack === 'nether' ? CHAMBERS[tier - 1] : TIER_NAMES[tier - 1]}</h3></div><span className="cg-tier-rule" /><span className="cg-small">{trackLessons.filter(l => l.tier === tier && progress.completed[l.nodeId]).length} / {trackLessons.filter(l => l.tier === tier).length}</span></div>
              <div className="cg-nodes">{trackLessons.filter(l => l.tier === tier).map(lesson => {
                const done = progress.completed[lesson.nodeId], available = unlocked(lesson, progress), next = nextLesson?.nodeId === lesson.nodeId;
                return <button key={lesson.nodeId} className={`cg-node ${done ? 'cg-node-done' : next ? 'cg-node-next' : ''}`} disabled={!available}
                  title={!available ? `Complete ${lesson.prerequisites.map(id => LESSONS.find(l => l.nodeId === id)?.title).join(' and ')} first` : undefined}
                  onClick={() => begin(lesson, progress.hearts === 0)}>
                  <span className="cg-node-icon">{done ? <Check size={21} /> : available ? <WandSparkles size={20} /> : <LockKeyhole size={17} />}</span>
                  <span><span className="cg-node-label">{done ? 'SPELL LEARNED' : next ? 'YOUR NEXT SPELL' : !available ? 'LOCKED' : 'READY TO EXPLORE'}</span><strong>{lesson.title}</strong><small>{lesson.subtitle}</small><span className="cg-node-meta">{done ? <Stars count={done.stars} /> : <><Clock3 size={12} />{lesson.minutes} min<span>·</span>{lesson.challenges.length} challenges</>}</span></span>
                  {available && <ChevronRight className="cg-node-arrow" size={17} />}
                </button>;
              })}</div>
            </section>)}
          </section>
          <aside className="cg-sidebar">
            <div className="cg-companion"><p className="cg-eyebrow">A NOTE FROM YOUR COMPANION</p><Portrait equipped={progress.equipped} />
              <div className="cg-speech"><p>“{progress.hearts === 0 ? 'Even great spellcasters need a breather. Let’s practice together and get a heart back.' : Object.keys(progress.completed).length ? 'Look at you, collecting spells! One small step today is still a step into the extraordinary.' : 'You don’t need to know all the spells. Just the next one. I’ll be right here.'}”</p></div>
              <strong>Pip the Byte-Goblin</strong><span>Keeper of notes. Believer in you.</span>
            </div>
            <div className="cg-practice-card"><div className="cg-mini-icon"><Heart size={20} /></div><h3>A safe place to stumble</h3><p>Practice any unlocked lesson. No heart loss, no timer. Finish a drill to restore one heart.</p><button className="cg-button cg-secondary" onClick={practice}>Practice a spell<ArrowRight size={15} /></button></div>
            <div className="cg-quiet-note"><ShieldCheck size={17} /><span>Saved in this browser.<br />Your progress stays on this device.</span></div>
          </aside>
        </div>
      </>}
      {view === 'lesson' && run && currentLesson && <div className="cg-lesson-view" ref={focusTarget} tabIndex={-1}>
        <div className="cg-lesson-toolbar"><button className="cg-text-button" onClick={() => setView('map')}><ArrowLeft size={16} />Save & return to map</button><span className="cg-pill">{run.practice ? 'PRACTICE · NO HEART LOSS' : TRACKS[currentLesson.trackId].title}</span></div>
        {run.phase === 'story' ? <section className="cg-story">
          <div className="cg-story-character"><Portrait character={currentLesson.mentor} /><span className="cg-eyebrow">YOUR MENTOR</span><h2>{CHARACTER_NAMES[currentLesson.mentor]}</h2><p>“{currentLesson.trackId === 'python' ? 'Keep it clean. Keep it indented.' : currentLesson.trackId === 'java' ? 'Every great spell needs a sound blueprint.' : 'Be curious. And always check your assumptions.'}”</p></div>
          <div className="cg-story-content"><p className="cg-eyebrow">{TIER_NAMES[currentLesson.tier - 1]} · {currentLesson.minutes} MINUTES</p><h1>{currentLesson.title}</h1><p className="cg-story-intro">{currentLesson.storyIntro}</p>
            <div className="cg-teaching"><h3><BookOpen size={17} />Before you cast</h3><ul>{currentLesson.concepts.map(text => <li key={text}>{text}</li>)}</ul></div>
            <Code>{currentLesson.example}</Code><a className="cg-source" href={currentLesson.reference.url} target="_blank" rel="noreferrer">Read more: {currentLesson.reference.label} ↗</a>
            <div className="cg-story-action"><span>{currentLesson.challenges.length} challenges · hints always available</span><button className="cg-button cg-primary" onClick={() => dispatch({ type: 'begin' })}>Let’s cast<ArrowRight size={16} /></button></div>
          </div>
        </section> : run.phase === 'complete' ? <section className="cg-complete">
          <Portrait mood="happy" equipped={progress.equipped} /><p className="cg-eyebrow">{run.practice ? 'A LITTLE PRACTICE GOES A LONG WAY' : 'ANOTHER PAGE IN YOUR SPELLBOOK'}</p><h1>{run.practice ? 'A heart, restored.' : 'Spell learned!'}</h1><h2>{currentLesson.title}</h2>
          {!run.practice && <Stars count={earnedStars(run.mistakes)} />}
          <p>{run.practice ? 'Your drill is complete. One heart restored, up to five. Practice also counts toward your daily streak.' : 'You earned ' + earnedStars(run.mistakes) + ' stars this run. Your best score is kept, and XP grows when you learn a new spell or improve it.'}</p>
          <div className="cg-complete-stats"><span><Sparkles />{xpTotal(progress)} total XP</span><span><Flame />{currentStreak(progress)} day streak</span><span><Heart />{progress.hearts} / 5 hearts</span></div>
          <div className="cg-button-row"><button className="cg-button cg-secondary" onClick={() => setView('map')}>Back to the map</button>
            {netherComplete ? <button className="cg-button cg-primary" onClick={() => setView('certificate')}>Claim your certificate<Award size={17} /></button> :
              nextLesson && <button className="cg-button cg-primary" onClick={() => begin(nextLesson, progress.hearts === 0)}>Next spell<ArrowRight size={16} /></button>}</div>
        </section> : <div className="cg-challenge-layout">
          <section className="cg-challenge-panel">
            <div className="cg-challenge-progress"><span>{currentLesson.title}</span><span>{run.index + 1} / {currentLesson.challenges.length}</span></div>
            <div className="cg-progress-bar"><span style={{ width: `${(run.index + Number(run.feedback === 'correct')) / currentLesson.challenges.length * 100}%` }} /></div>
            <ChallengeView key={`${run.nodeId}-${run.index}`} challenge={currentLesson.challenges[run.index]} run={run} dispatch={dispatch} clock={clock} hearts={progress.hearts} />
            {run.feedback && <div className={`cg-feedback cg-feedback-${run.feedback}`} role="status">
              <div className="cg-feedback-heading">{run.feedback === 'correct' ? <Check size={20} /> : <Lightbulb size={20} />}<h3>{run.feedback === 'correct' ? 'That’s the spell!' : run.feedback === 'timeout' ? 'The clock ran out. The learning doesn’t.' : 'A useful little mistake.'}</h3></div>
              <p>{currentLesson.challenges[run.index].explanation}</p>
              {run.feedback !== 'correct' && <><span className="cg-eyebrow">THE SPELL TO REMEMBER</span><Code>{correctAnswer(currentLesson.challenges[run.index])}</Code></>}
              {run.feedback === 'correct' ? <button className="cg-button cg-primary" onClick={() => dispatch({ type: 'next' })}>{run.index === currentLesson.challenges.length - 1 ? 'Finish the lesson' : 'Next challenge'}<ArrowRight size={16} /></button> :
                <button className="cg-button cg-secondary" disabled={!run.practice && progress.hearts === 0} onClick={() => dispatch({ type: 'retry' })}>Try the spell again<RotateCcw size={15} /></button>}
            </div>}
            {!run.practice && progress.hearts === 0 && run.feedback !== 'correct' && <div className="cg-notice cg-out-of-hearts"><Heart size={22} /><h3>Your hearts need a little care.</h3><p>Start this lesson as an untimed practice drill to recover one heart. Campaign progress for this lesson will restart. Your completed spells stay saved.</p><button className="cg-button cg-primary" onClick={() => { dispatch({ type: 'start', nodeId: currentLesson.nodeId, practice: true }); }}>Practice to restore a heart<ArrowRight size={16} /></button></div>}
          </section>
          <aside className="cg-lesson-aside"><Portrait character={run.feedback && run.feedback !== 'correct' ? 'imp' : 'pip'} mood={run.feedback === 'correct' ? 'happy' : 'neutral'} equipped={progress.equipped} />
            <div className="cg-speech"><p>“{run.feedback === 'correct' ? 'I knew you had that one in you. Writing it yourself makes it stick.' : run.feedback ? 'You found my little trick! Read the explanation, then show me you’ve got it.' : 'Take your time. Read the spell. A hint is just a sticky note from a friend.'}”</p></div>
            <details className="cg-recap"><summary><BookOpen size={16} />Lesson notes</summary><ul>{currentLesson.concepts.map(text => <li key={text}>{text}</li>)}</ul><Code>{currentLesson.example}</Code></details>
          </aside>
        </div>}
      </div>}
      {view === 'guide' && <FieldGuide progress={progress} onPractice={practice} />}
      {view === 'loot' && <section className="cg-loot"><div className="cg-section-heading"><div><p className="cg-eyebrow">LITTLE TREASURES, WELL EARNED</p><h1>Pip’s satchel</h1></div><span className="cg-star-total"><Star fill="currentColor" size={21} />{stars} stars</span></div>
        <div className="cg-loot-intro"><Portrait equipped={progress.equipped} /><div><h2>A little magic to wear.</h2><p>Stars unlock keepsakes for your companion. Replaying a lesson can improve your best score; practice restores hearts.</p></div></div>
        <div className="cg-trinkets">{TRINKETS.map(item => { const available = canEquip(item.id, progress, LESSONS); return <article key={item.id} className="cg-trinket"><span className="cg-trinket-icon" aria-hidden="true">{item.icon}</span><h3>{item.title}</h3><p>{item.description}</p><small>{item.requirement}</small><button className="cg-button cg-secondary" disabled={!available || progress.equipped === item.id} onClick={() => dispatch({ type: 'equip', trinket: item.id })}>{progress.equipped === item.id ? <><Check size={15} />Equipped</> : available ? 'Equip keepsake' : <><LockKeyhole size={14} />Still a little way to go</>}</button></article>; })}</div>
        <div className="cg-potion"><FlaskConical size={34} /><div><h3>Streak-freeze potions <span>× {progress.freezes}</span></h3><p>Finish a lesson or practice drill on 7 consecutive days to brew a potion. It automatically protects one missed day when you return the following day. Store up to 3; a finished brew waits until there’s room.</p><span className="cg-small">{progress.brewDays === 7 ? 'Brew ready! Safely waiting in the cauldron.' : `${progress.brewDays} / 7 consecutive practice days toward the next brew`}</span></div></div>
        <div className="cg-certificate-callout"><Award size={32} /><div><h3>Certificate of Wizardry</h3><p>Complete both language paths and all three Nether chambers to earn your commemorative diploma.</p></div><button className="cg-button cg-secondary" disabled={!netherComplete} onClick={() => setView('certificate')}>{netherComplete ? 'Open certificate' : 'Awaiting your final spell'}<LockKeyhole size={15} /></button></div>
      </section>}
      {view === 'certificate' && netherComplete && <Certificate progress={progress} />}
      <footer className="cg-footer"><span><Leaf size={14} />Grown by Scroll Goblin. Learned by you.</span><span>{LESSONS.length} lessons · {CHALLENGE_COUNT} challenges · A whole lot of possibility.</span></footer>
    </div>
    {settings && <Modal title="Make room for your kind of learning" close={() => setSettings(false)}>
      <label className="cg-setting"><span><strong>30-second Micro-Caster</strong><small>Turn off for untimed campaign typing. Applies to your next lesson; practice is always untimed.</small></span><input type="checkbox" checked={progress.timed} onChange={e => dispatch({ type: 'setting', name: 'timed', value: e.target.checked })} /></label>
      <label className="cg-setting"><span><strong>Little victory sounds</strong><small>Soft notes after answers. Respects Scroll Goblin’s shared mute setting.</small></span><input type="checkbox" checked={progress.sound} onChange={e => dispatch({ type: 'setting', name: 'sound', value: e.target.checked })} /></label>
      <p className="cg-small">Five hearts refresh at local midnight. Practice restores one heart per completed drill. Progress is stored in this browser; clearing browser data clears it.</p>
    </Modal>}
    {pending && <Modal title="Start a different spell?" close={() => setPending(null)}><p>Your unfinished lesson will restart. Completed lessons, stars, and remaining hearts stay saved.</p><div className="cg-button-row"><button className="cg-button cg-secondary" onClick={() => setPending(null)}>Keep this lesson</button><button className="cg-button cg-primary" onClick={() => { dispatch({ type: 'start', nodeId: pending.lesson.nodeId, practice: pending.practice }); setPending(null); setView('lesson'); }}>Start the new lesson<ArrowRight size={15} /></button></div></Modal>}
  </div>;
}

function ChallengeView({ challenge, run, dispatch, clock, hearts }: { challenge: Challenge; run: Run; dispatch: (action: Action) => void; clock: number; hearts: number }) {
  const input = useRef<HTMLInputElement>(null);
  const locked = Boolean(run.feedback) || !run.practice && hearts === 0;
  const waitingClock = challenge.type === 'micro_caster' && run.timed && !run.deadline && !run.feedback;
  const seconds = run.deadline ? Math.max(0, Math.ceil((run.deadline - clock) / 1000)) : CAST_SECONDS;
  const sequence = Array.isArray(run.answer) ? run.answer : [];
  const addToken = (index: number) => {
    if (!locked && challenge.type === 'word_bank' && index >= 0 && index < challenge.tokens.length &&
      !sequence.includes(index) && sequence.length < challenge.correctSequence.length) dispatch({ type: 'answer', answer: [...sequence, index] });
  };
  const answer = (value: Answer) => dispatch({ type: 'answer', answer: value });
  const ready = challenge.type === 'word_bank' ? sequence.length === challenge.correctSequence.length : challenge.type === 'micro_caster'
    ? typeof run.answer === 'string' && run.answer.trim().length > 0 : typeof run.answer === 'number';
  useEffect(() => { if (challenge.type === 'micro_caster' && run.deadline && !run.feedback) input.current?.focus(); }, [challenge.type, run.deadline, run.feedback]);
  return <div className="cg-challenge">
    <div className="cg-challenge-kind"><span className="cg-eyebrow"><WandSparkles size={15} />{CHALLENGE_NAMES[challenge.type]}</span>{challenge.type === 'micro_caster' && <span className={`cg-timer ${seconds <= 10 ? 'cg-timer-low' : ''}`} aria-label={run.timed ? `${seconds} seconds remaining` : 'Untimed'}><Clock3 size={15} />{run.timed ? `${seconds}s` : 'Untimed'}</span>}</div>
    <h1>{challenge.prompt}</h1>
    {challenge.type === 'word_bank' && <>
      <p className="cg-instruction">Tap or drag chips into the spell. Tap a placed chip to remove it. Each chip includes its displayed spacing.</p>
      <div className="cg-spell-slots" aria-label="Your assembled spell" onDragOver={e => { if (!locked) e.preventDefault(); }} onDrop={e => { e.preventDefault(); const value = e.dataTransfer.getData('text/plain'); if (/^\d+$/.test(value)) addToken(Number(value)); }}>
        {Array.from({ length: challenge.correctSequence.length }, (_, position) => sequence[position] === undefined
          ? <span className="cg-empty-slot" key={position} aria-label={`Slot ${position + 1}`}>{position + 1}</span>
          : <button key={position} className="cg-chip cg-chip-placed" dir="ltr" translate="no" data-hedgeling-ignore="true" disabled={locked}
            aria-label={`Remove chip ${position + 1}: ${challenge.tokens[sequence[position]]}`} onClick={() => answer(sequence.filter((_, i) => i !== position))}>{tokenLabel(challenge.tokens[sequence[position]])}<X size={11} /></button>)}
      </div>
      <Code className="cg-live-code">{sequence.length ? sequence.map(i => challenge.tokens[i]).join('') : '# Your spell will appear here'}</Code>
      <div className="cg-word-bank" aria-label="Available code chips">{challenge.tokens.map((token, i) => <button key={i} className="cg-chip" translate="no" data-hedgeling-ignore="true" dir="ltr"
        draggable={!locked && !sequence.includes(i)} onDragStart={e => e.dataTransfer.setData('text/plain', String(i))} disabled={locked || sequence.includes(i)} onClick={() => addToken(i)}>{tokenLabel(token)}</button>)}</div>
      <button className="cg-text-button" disabled={locked || !sequence.length} onClick={() => answer([])}><RotateCcw size={13} />Clear spell</button>
    </>}
    {challenge.type === 'linter_trap' && <><p className="cg-instruction">Choose the one line described by the question.</p><div className="cg-linter" role="group" aria-label="Code lines" dir="ltr" translate="no" data-hedgeling-ignore="true">
      {challenge.codeSnippet.map((line, index) => <button key={index} className={run.answer === index ? 'cg-selected' : ''} aria-pressed={run.answer === index} disabled={locked} onClick={() => answer(index)} aria-label={`Line ${index + 1}: ${line}`}><span>{String(index + 1).padStart(2, '0')}</span><code>{line || ' '}</code><span className="cg-line-radio">{run.answer === index && <Check size={12} />}</span></button>)}
    </div></>}
    {challenge.type === 'rosetta' && <><span className="cg-code-label">{challenge.sourceLanguage}</span><Code>{challenge.codeSnippet}</Code><p className="cg-instruction">Choose the equivalent in {challenge.targetLanguage}.</p><div className="cg-options" role="group" aria-label="Equivalent code options">
      {challenge.options.map((option, i) => <button key={option} className={`cg-option ${run.answer === i ? 'cg-selected' : ''}`} aria-pressed={run.answer === i} disabled={locked} onClick={() => answer(i)}><span className="cg-option-letter">{String.fromCharCode(65 + i)}</span><Code>{option}</Code></button>)}
    </div></>}
    {challenge.type === 'micro_caster' && <>
      <p className="cg-instruction">Type the missing fragment. Capitalization matters. {run.timed ? 'Read the snippet first; start when ready. Once started, the clock keeps running if you leave or reload. Expiry costs one heart.' : 'Take your time. This cast has no timer.'}</p>
      <Code>{challenge.before}<mark className="cg-code-blank">{typeof run.answer === 'string' && run.answer ? run.answer : '???'}</mark>{challenge.after}</Code>
      {waitingClock ? <button className="cg-button cg-secondary" disabled={locked} onClick={() => dispatch({ type: 'start_clock' })}><Clock3 size={16} />Start 30-second cast</button> : <form onSubmit={e => { e.preventDefault(); if (!locked && ready) dispatch({ type: 'submit' }); }}>
        <label className="cg-answer-label" htmlFor="cg-typed-answer">Your missing fragment</label><input id="cg-typed-answer" ref={input} className="cg-typing" value={typeof run.answer === 'string' ? run.answer : ''} disabled={locked}
          onChange={e => answer(e.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} maxLength={120} dir="ltr" translate="no" data-hedgeling-ignore="true" aria-describedby="cg-type-help" />
        <span id="cg-type-help" className="cg-small">Type from memory. Press Enter or check your spell below.</span>
      </form>}
    </>}
    {!run.feedback && <div className="cg-check-row"><button className="cg-text-button" onClick={() => dispatch({ type: 'hint' })} disabled={run.hintUsed || locked}><Lightbulb size={16} />A little hint</button><button className="cg-button cg-primary" disabled={locked || !ready || waitingClock} onClick={() => dispatch({ type: 'submit' })}>Check my spell<ArrowRight size={16} /></button></div>}
    {run.hintUsed && <p className="cg-hint" role="status"><Lightbulb size={16} />{challenge.hint}</p>}
  </div>;
}
function tokenLabel(token: string) { return /^\s+$/.test(token) ? token.replace(/\n/g, '↵').replace(/ /g, '·') : token.replace(/\n/g, '↵ '); }

function FieldGuide({ progress, onPractice }: { progress: Progress; onPractice: () => void }) {
  return <section className="cg-guide"><div className="cg-section-heading"><div><p className="cg-eyebrow">NOTES FOR THE ROAD</p><h1>Your field guide</h1></div><BookOpen size={36} /></div>
    <p className="cg-lead">Learn a little. Try it yourself. Keep the useful mistakes.</p>
    <div className="cg-guide-grid">{[
      ['Rune Weaver', 'Build a spell from code chips. Tap to place or remove them, or drag them into the answer area. Whitespace and indentation are part of the code.'],
      ['The Linter Trap', 'Read each line and find the one responsible for the problem. Some traps fail to compile or run; others produce the wrong behavior. Read the prompt carefully.'],
      ['Rosetta Altar', 'Read a spell in one language and choose its equivalent in the other. Pay attention to types, loop bounds, equality, and collection methods.'],
      ['Micro-Caster', 'Supply the missing fragment without autocomplete. The 30-second clock starts only when you choose to begin and keeps running after leaving or reloading. Expiry costs one heart. You can disable it in Learning settings before starting a lesson.'],
    ].map(([title, text], i) => <article key={title}><span className="cg-guide-number">0{i + 1}</span><h2>{title}</h2><p>{text}</p></article>)}</div>
    <div className="cg-guide-rules"><h2>The rules of this little realm</h2><ul><li>Campaign mistakes cost one heart. Five hearts refresh at local midnight; completing practice restores one, up to five.</li><li>Stars reward each completed campaign lesson: 3 for no mistakes, 2 for one or two, and 1 after that. Your best score is kept.</li><li>XP equals 30 per learned lesson, plus 10 per best star. Repeats improve rewards only when they improve your best score.</li><li>Finish a lesson or practice drill to count today toward your streak. Hints are free, and practice never costs hearts.</li><li>Lessons teach and check specific snippets. They do not run arbitrary Python or Java. Quantum exercises describe ideal simulation; no hardware is contacted.</li></ul><button className="cg-button cg-secondary" onClick={onPractice}>Try a practice spell<ArrowRight size={16} /></button></div>
    <h2 className="cg-cast-title">A few familiar faces</h2><div className="cg-cast">{(['pip', 'pythia', 'brak', 'imp', 'percy'] as Character[]).map(character => <article key={character}><Portrait character={character} equipped={progress.equipped} /><h3>{CHARACTER_NAMES[character]}</h3><p>{({ pip: 'Your companion, one sticky note at a time.', pythia: 'Python’s patient keeper of forest runes.', brak: 'Java’s exacting master of the forge.', imp: 'A collector of very educational mistakes.', percy: 'Guardian of the Quantum Nether.' })[character]}</p></article>)}</div>
    <p className="cg-scope-note">A playful foundation in syntax, algorithms, vectors, and quantum concepts. This is independent practice, not an accredited course or a guarantee of graduate-program readiness. Examples link to their technical references.</p>
  </section>;
}

function Certificate({ progress }: { progress: Progress }) {
  const [name, setName] = useState('A very determined apprentice');
  const completedAt = latestCompletion(progress, lessonsFor('nether'));
  const date = completedAt ? new Date(completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date unavailable';
  const download = () => {
    const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000"><rect width="1400" height="1000" fill="#f6f0df"/><rect x="35" y="35" width="1330" height="930" rx="8" fill="none" stroke="#294c3b" stroke-width="5"/><rect x="50" y="50" width="1300" height="900" fill="none" stroke="#b49351" stroke-width="2"/><g fill="#294c3b" text-anchor="middle" font-family="Georgia,serif"><text x="700" y="155" font-size="22" letter-spacing="6">THE SCROLL GOBLIN GUILD</text><text x="700" y="270" font-size="68">Certificate of Wizardry</text><text x="700" y="360" font-size="26">Let it be known that</text><text x="700" y="460" font-size="42">${escape(name || 'A very determined apprentice')}</text><text x="700" y="550" font-size="25">has completed the Code Goblin adventure</text><text x="700" y="610" font-size="24">Forest Runes · Dungeon Forging · The Quantum Nether</text><text x="700" y="685" font-size="22">${LESSONS.length} lessons · ${CHALLENGE_COUNT} challenges · ${starsTotal(progress)} stars earned</text><text x="700" y="770" font-size="24">${escape(date)}</text><text x="700" y="850" font-size="22" font-style="italic">Pip, Pythia, Brak &amp; a probably-present Percy</text><text x="700" y="910" font-size="16">Commemorative completion of self-guided syntax practice · Not an accredited qualification</text></g></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const a = document.createElement('a'); a.href = url; a.download = 'code-goblin-certificate.svg'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="cg-certificate-section"><div className="cg-section-heading"><div><p className="cg-eyebrow">YOU MADE IT THROUGH THE PORTAL</p><h1>A story worth keeping</h1></div><Award size={36} /></div>
    <div className="cg-certificate-controls"><label htmlFor="cg-certificate-name">Name on your certificate<input id="cg-certificate-name" value={name} onChange={e => setName(e.target.value)} maxLength={48} autoComplete="name" /></label><button className="cg-button cg-primary" onClick={download}><Download size={17} />Download diploma</button><button className="cg-button cg-secondary" onClick={() => window.print()}>Print / save PDF</button></div>
    <div className="cg-certificate"><span className="cg-eyebrow">THE SCROLL GOBLIN GUILD</span><Award size={50} /><h2>Certificate of Wizardry</h2><p>Let it be known that</p><strong className="cg-certificate-name" translate="no">{name || 'A very determined apprentice'}</strong><p>has completed the Code Goblin adventure</p><div className="cg-certificate-paths">Forest Runes · Dungeon Forging · The Quantum Nether</div><p>{LESSONS.length} lessons · {CHALLENGE_COUNT} challenges · {starsTotal(progress)} stars earned</p><time>{date}</time><p className="cg-signature">Pip, Pythia, Brak & a probably-present Percy</p><small>Commemorative completion of self-guided syntax practice. Not an accredited qualification.</small></div>
  </section>;
}
