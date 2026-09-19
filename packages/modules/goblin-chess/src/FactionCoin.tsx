import { useEffect, useState } from 'react';
import type { Faction } from './game';

function Face({ hedgehog }: { hedgehog: boolean }) {
  return <svg viewBox="0 0 240 240" aria-hidden="true" className="gc-coin-portrait">
    <circle cx="120" cy="120" r="106" fill={hedgehog ? '#753d29' : '#253c43'} stroke="#e8c476" strokeWidth="2" />
    <circle cx="120" cy="120" r="98" fill="none" stroke="#e8c476" strokeWidth="1" strokeDasharray="2 7" />
    <path d="M45 154 Q26 114 49 79 M195 154 Q214 114 191 79" fill="none" stroke="#c9a458" strokeWidth="3" />
    {[0, 1, 2, 3].map(i => <g key={i} fill="#c9a458"><ellipse cx={40 - i % 2 * 3} cy={92 + i * 15} rx="4" ry="8" transform={`rotate(-30 40 ${92 + i * 15})`} /><ellipse cx={200 + i % 2 * 3} cy={92 + i * 15} rx="4" ry="8" transform={`rotate(30 200 ${92 + i * 15})`} /></g>)}
    {hedgehog ? <>
      <path d="M60 142 50 122 64 119 51 98 70 98 65 74 83 83 86 58 102 72 119 46 130 71 151 53 151 79 174 67 168 93 191 92 178 114 192 126 179 142Z" fill="#b16e3c" stroke="#f3cb89" strokeWidth="3" strokeLinejoin="round" />
      <path d="m77 108-4-16 20 9-1-23 20 15 9-23 12 23 19-13-1 22 20-4-8 20" fill="none" stroke="#e3a764" strokeWidth="4" strokeLinejoin="round" />
      <ellipse cx="83" cy="121" rx="14" ry="17" fill="#f3d2a0" /><ellipse cx="157" cy="121" rx="14" ry="17" fill="#f3d2a0" />
      <path d="M81 124 Q81 95 107 111 L120 123 134 111 Q161 94 162 127 Q159 163 120 173 Q80 161 81 124" fill="#fff0cc" />
      <ellipse cx="101" cy="134" rx="7" ry="9" fill="#382925" /><ellipse cx="140" cy="134" rx="7" ry="9" fill="#382925" />
      <circle cx="103" cy="131" r="2" fill="white" /><circle cx="142" cy="131" r="2" fill="white" />
      <path d="M110 151 Q120 145 130 151 Q125 162 120 161 Q115 161 110 151" fill="#382925" />
      <path d="M107 166 Q119 173 133 166" fill="none" stroke="#925340" strokeWidth="2" strokeLinecap="round" />
    </> : <>
      <path d="M83 107 Q59 78 44 92 Q48 121 80 136 M157 107 Q181 78 196 92 Q192 121 160 136" fill="#57b99b" stroke="#a5e1b3" strokeWidth="3" />
      <path d="m53 99 26 15-2 10 M187 99l-26 15 2 10" fill="none" stroke="#287b72" strokeWidth="4" strokeLinecap="round" />
      <path d="M78 97 Q77 67 120 68 Q163 68 163 104 L155 149 Q144 176 120 177 Q92 173 82 148Z" fill="#6bc8a4" stroke="#bce4bb" strokeWidth="2" />
      <path d="M76 102 Q67 79 87 69 L86 55 109 66 127 48 138 64 154 59 Q173 82 163 106 L148 87 133 94 113 79 96 96 91 83Z" fill="#746099" stroke="#b4a0d1" strokeWidth="2" strokeLinejoin="round" />
      <path d="m88 114 20 4 M132 118l19-6" stroke="#265b50" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="101" cy="126" rx="11" ry="9" fill="#fff0d1" /><ellipse cx="141" cy="126" rx="11" ry="9" fill="#fff0d1" />
      <ellipse cx="103" cy="126" rx="5" ry="7" fill="#233633" /><ellipse cx="139" cy="126" rx="5" ry="7" fill="#233633" />
      <circle cx="104" cy="123" r="2" fill="white" /><circle cx="140" cy="123" r="2" fill="white" />
      <path d="m120 125-6 20 13-1" fill="none" stroke="#2b8d75" strokeWidth="3" strokeLinecap="round" />
      <path d="M99 153 Q120 167 143 150" fill="#275a4d" stroke="#275a4d" strokeWidth="3" strokeLinecap="round" />
      <path d="m104 154 5 11 4-8 M135 154l-3 10-4-7" fill="#fff1d0" />
      <circle cx="67" cy="134" r="6" fill="none" stroke="#edc571" strokeWidth="4" />
    </>}
    <path d="m113 28 7-8 7 8-7 8Z" fill="#efcc80" />
  </svg>;
}
export default function FactionCoin({ faction, busy, onFlip }: { faction?: Faction; busy: boolean; onFlip: () => void }) {
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    if (busy) setRotation(r => r + 1080);
    else if (faction) setRotation(r => Math.ceil(r / 360) * 360 + (faction === 'hedgelings' ? 180 : 0));
  }, [busy, faction]);
  function spin() {
    if (faction) setRotation(r => r + 1080);
    else onFlip();
  }
  return <div className="gc-coin-stage">
    <span className="gc-coin-orbit" aria-hidden="true" />
    <span className="gc-coin-star gc-coin-star-one" aria-hidden="true">✦</span><span className="gc-coin-star gc-coin-star-two" aria-hidden="true">✧</span>
    <p className="gc-eyebrow">ONE COIN. TWO LITTLE KINGDOMS.</p>
    <button type="button" className="gc-coin-button" aria-label={faction ? 'Spin the faction coin again' : 'Spin the coin to choose your faction'} disabled={busy} onClick={spin} aria-describedby="gc-coin-caption">
      <span className="gc-coin-rotor" style={{ transform: `rotateY(${rotation}deg)` }}>
        <span className="gc-coin-face gc-coin-front"><Face hedgehog={false} /><span>SCROLL GOBLINS</span></span>
        <span className="gc-coin-face gc-coin-back"><Face hedgehog /><span>THE HEDGELINGS</span></span>
      </span>
    </button>
    <span className="gc-coin-shadow" aria-hidden="true" />
    <p id="gc-coin-caption" className="gc-coin-caption" aria-live="polite">{busy ? 'Fate is turning…' : faction ? 'Your allegiance is sealed. Spin again for a little luck.' : 'Give fate a little nudge. Click the coin to spin.'}</p>
  </div>;
}
