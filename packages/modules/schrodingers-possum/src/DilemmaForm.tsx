import { useState, type FormEvent } from 'react';
import { t } from '@hedgeling/i18n/runtime';
import { DilemmaSchema, type Dilemma, type PossumTone } from '@scroll-goblin/shared';

const examples: Dilemma[] = [
  { question: 'What does my evening need?', optionA: 'One more side quest', optionB: 'An aggressively early bedtime', tone: 'feral' },
  { question: 'How should I spend my Saturday?', optionA: 'Wander somewhere new', optionB: 'Make my home extra cozy', tone: 'mystical' },
  { question: 'Which tiny adventure should I choose?', optionA: 'Try a new recipe', optionB: 'Visit the little bookshop', tone: 'sincere' },
];
const tones: { id: PossumTone; icon: string; label: string }[] = [
  { id: 'feral', icon: 'ϟ', label: 'Feral' },
  { id: 'mystical', icon: '✧', label: 'Mystical' },
  { id: 'sincere', icon: '♡', label: 'Sincere' },
];

export default function DilemmaForm({ initial, disabled, onSubmit }: {
  initial: Dilemma; disabled: boolean; onSubmit: (value: Dilemma) => void;
}) {
  const [value, setValue] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [example, setExample] = useState(0);
  function change(key: keyof Dilemma, next: string) {
    setValue(previous => ({ ...previous, [key]: next }));
    setErrors(previous => ({ ...previous, [key]: '' }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = DilemmaSchema.safeParse(value);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      const first = String(parsed.error.issues[0].path[0]);
      document.getElementById(`sp-${first}`)?.focus();
      return;
    }
    onSubmit(parsed.data);
  }
  return <form className="sp-form" onSubmit={submit} noValidate>
    <fieldset disabled={disabled}>
      <div className="sp-form-heading"><span className="sp-eyebrow">01 / THE DILEMMA</span>
        <button type="button" className="sp-example" onClick={() => {
          const next = examples[example % examples.length];
          setValue({ ...next, question: t(next.question), optionA: t(next.optionA), optionB: t(next.optionB) });
          setExample(example + 1); setErrors({});
        }}>Try an example ↗</button></div>
      <h2>A little indecisive?</h2>
      <p className="sp-form-intro">Put it in the paws of a professional.<br />He is not a professional.</p>
      <label htmlFor="sp-question">What should I do?</label>
      <textarea id="sp-question" name="question" rows={2} maxLength={500}
        placeholder="A big evening? A small adventure?" value={value.question}
        onChange={event => change('question', event.target.value)}
        aria-invalid={!!errors.question} aria-describedby={errors.question ? 'sp-question-error' : undefined} />
      {errors.question && <p className="sp-field-error" id="sp-question-error">{t(errors.question)}</p>}
      <div className="sp-option-input sp-option-a"><label htmlFor="sp-optionA"><span>A</span> The blue portal</label>
        <input id="sp-optionA" name="optionA" maxLength={100} placeholder="One possibility…" value={value.optionA}
          onChange={event => change('optionA', event.target.value)}
          aria-invalid={!!errors.optionA} aria-describedby={errors.optionA ? 'sp-optionA-error' : undefined} />
        {errors.optionA && <p className="sp-field-error" id="sp-optionA-error">{t(errors.optionA)}</p>}
      </div>
      <div className="sp-option-input sp-option-b"><label htmlFor="sp-optionB"><span>B</span> The red portal</label>
        <input id="sp-optionB" name="optionB" maxLength={100} placeholder="The other possibility…" value={value.optionB}
          onChange={event => change('optionB', event.target.value)}
          aria-invalid={!!errors.optionB} aria-describedby={errors.optionB ? 'sp-optionB-error' : undefined} />
        {errors.optionB && <p className="sp-field-error" id="sp-optionB-error">{t(errors.optionB)}</p>}
      </div>
      <fieldset className="sp-vibe"><legend>{t('Percy’s vibe')}</legend><div className="sp-tone-options">
        {tones.map(tone => <label key={tone.id} className={value.tone === tone.id ? 'is-selected' : ''}>
          <input type="radio" name="tone" value={tone.id} checked={value.tone === tone.id}
            onChange={() => change('tone', tone.id)} /><span className="sp-tone-icon" aria-hidden="true">{tone.icon}</span><span className="sp-tone-label">{t(tone.label)}</span>
        </label>)}
      </div></fieldset>
      <button type="submit" className="sp-primary">Open the portals <span aria-hidden="true">↗</span></button>
      <p className="sp-small sp-form-note">Two possibilities. One very questionable lab coat.</p>
    </fieldset>
  </form>;
}
