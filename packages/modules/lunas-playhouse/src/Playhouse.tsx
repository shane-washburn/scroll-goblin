import { t } from '@hedgeling/i18n/runtime';
import { useEffect, useState } from 'react';
import { isMuted, toggleMuted, subscribeMuted } from '@scroll-goblin/ui';
import Room from './Room';
import { items, nodes, place, sanitize, sanitizeRotations, SAVE, ROTATIONS, type Placements, type Rotations } from './model';
import './playhouse.css';
import { playCue } from './sounds';
export default function Playhouse(){
 const [placements,setPlacements]=useState<Placements>(()=>{try{return sanitize(JSON.parse(localStorage.getItem(SAVE)||'{}'));}catch{return {};}});
 const [rotations,setRotations]=useState<Rotations>(()=>{try{return sanitizeRotations(JSON.parse(localStorage.getItem(ROTATIONS)||'{}'));}catch{return {};}});
 const [moving,setMoving]=useState(false),[lastPlaced,setLastPlaced]=useState<string|null>(null);
 const [selected,setSelected]=useState<string|null>(null),[angle,setAngle]=useState(0),[event,setEvent]=useState(0),[thumbs,setThumbs]=useState<Record<string,string>>({});
 const [cue,setCue]=useState<{id:number;kind:'place'|'return'|'hello'}|null>(null);
 const [filter,setFilter]=useState<string>('all');
 useEffect(()=>{if(!cue)return;const timer=setTimeout(()=>setCue(null),1800);return()=>clearTimeout(timer);},[cue]);
 const feedback=(kind:'place'|'return'|'hello')=>{setCue({id:performance.now(),kind});void playCue(kind);};
 const soundToggle=()=>{toggleMuted();if(!isMuted())feedback('hello');};
 const [muted,setMute]=useState(isMuted),[notice,setNotice]=useState(''),[saveFailed,setSaveFailed]=useState(false);
 useEffect(()=>subscribeMuted(()=>setMute(isMuted())),[]);
 useEffect(()=>{try{localStorage.setItem(SAVE,JSON.stringify(placements));localStorage.setItem(ROTATIONS,JSON.stringify(rotations));setSaveFailed(false);}catch{setSaveFailed(true);}},[placements,rotations]);
 const dismiss=()=>{setSelected(null);setMoving(false);};
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')dismiss();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const choose=(id:string)=>{if(selected===id){dismiss();return;}setSelected(id);setMoving(!placements[id]);void playCue('pick');setNotice(placements[id]?'Choose move, rotate, or return to basket.':t('{name} selected. Choose a glowing spot.', { name: t(items.find(i=>i.id===id)!.name) }));};
 const rotate=(direction:number)=>{if(!selected)return;setRotations(r=>({...r,[selected]:((r[selected]??0)+direction+4)%4}));void playCue('pick');setNotice('Turned a quarter turn.');};
 const put=(node:string)=>{if(!selected)return;const next=place(placements,selected,node);if(next===placements){setNotice('That area is full. Choose another glowing spot.');return;}setPlacements(next);const facing=nodes.find(n=>n.id===next[selected])?.facing;if(facing!==undefined)setRotations(r=>({...r,[selected]:facing}));setLastPlaced(selected);setMoving(false);setEvent(e=>e+1);feedback('place');setNotice(t('{name} placed. Mia and Luna are coming to see!', { name: t(items.find(i=>i.id===selected)!.name) }));};
 const returnToPile=()=>{if(!selected)return;const next={...placements};delete next[selected];setPlacements(next);feedback('return');setNotice('Back in the toy basket.');dismiss();};
 const current=items.find(i=>i.id===selected);
 return <main className="lp">
  <header className="lp-header"><div><span className="lp-kicker">A LITTLE ROOM. A WHOLE WORLD.</span><h1>Luna’s Playhouse <span aria-hidden="true">✿</span></h1></div><button aria-label={muted?'Turn sound on':'Mute sound'} aria-pressed={muted} onClick={soundToggle}>{muted?'🔇':'🔊'}</button></header>
  <section className="lp-house" aria-label="Decorate the playhouse">
   <Room placements={placements} rotations={rotations} lastPlaced={lastPlaced} selected={moving?selected:null} onDismiss={dismiss} angle={angle} event={event} onNode={put} onItem={choose} onThumbs={setThumbs}/>
   {cue&&<div key={cue.id} className={`lp-feedback lp-feedback-${cue.kind}`} aria-hidden="true"><span>{cue.kind==='place'?'🌟':cue.kind==='return'?'🧺':'🎵'}</span><span>{cue.kind==='place'?'✨ 💖 ✨':cue.kind==='return'?'↙ ✨':'♫ ♪ ♫'}</span></div>}
   <div className="lp-turns"><button aria-label="Turn room left" onClick={()=>setAngle(a=>a-1)}>↶</button><span aria-hidden="true">🏡</span><button aria-label="Turn room right" onClick={()=>setAngle(a=>a+1)}>↷</button></div>
   <div className="lp-friends" aria-hidden="true"><span>🤠 <b>Mia</b></span><span>🎀 <b>Luna</b></span></div>
   {current&&<div className="lp-selection"><img src={thumbs[current.id]} alt=""/>{moving?<span aria-hidden="true">→ ✨</span>:<button aria-label={`Move ${current.name}`} onClick={()=>setMoving(true)}>✥</button>}{placements[current.id]&&!current.categories.includes('wall')&&<><button aria-label={`Rotate ${current.name} left`} onClick={()=>rotate(-1)}>↶</button><button aria-label={`Rotate ${current.name} right`} onClick={()=>rotate(1)}>↷</button></>}<button aria-label={`Return ${current.name} to the basket`} onClick={returnToPile}>🧺</button><button aria-label="Done decorating this item" onClick={dismiss}>✓</button></div>}
   {saveFailed&&<span className="lp-save-warning" role="status" title="Your browser cannot save this room. It will last until you close the page.">⚠️</span>}
   <div className="lp-keyboard" aria-label="Keyboard placement controls">{current&&moving&&nodes.filter(n=>current.categories.includes(n.category)&&(n.wall===undefined||Math.cos(Math.PI/4+angle*Math.PI/2-n.wall*Math.PI/2)<0)).map(n=><button key={n.id} onClick={()=>put(n.id)} aria-label={`Place ${current.name} at ${t(({floor:'Floor',surface:'Surface',wall:'Wall',ceiling:'Ceiling'})[n.category])} spot ${n.id}`}>✨</button>)}</div>
  </section>
  <nav className="lp-filters" aria-label="Choose objects by placement area">{[['all','🧺','All objects'],['floor','🪑','Furniture and floor objects'],['surface','🫖','Tabletop objects'],['wall','🖼️','Paintings and wall decorations'],['ceiling','⭐','Hanging decorations']].map(([id,icon,label])=><button key={id} aria-label={label} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{icon}</button>)}</nav>
  <section className="lp-inventory" aria-label="Toy basket"><span className="lp-basket" aria-hidden="true">🧺</span><div className="lp-ribbon">{items.filter(item=>filter==='all'||item.categories.some(c=>c===filter)).map(item=><button key={item.id} className={`${selected===item.id?'chosen':''} ${placements[item.id]?'placed':''}`} aria-label={placements[item.id] ? t('{name}, in the room', { name: t(item.name) }) : t(item.name)} aria-pressed={selected===item.id} onClick={()=>choose(item.id)}>{thumbs[item.id]?<img src={thumbs[item.id]} alt=""/>:<span aria-hidden="true">{item.icon}</span>}{placements[item.id]&&<small aria-hidden="true">✓</small>}</button>)}</div></section>
  <p className="lp-sr" role="status">{notice}</p>
 </main>;
}
