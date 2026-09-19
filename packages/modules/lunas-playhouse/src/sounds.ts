import { getAudioBus, isMuted } from '@scroll-goblin/ui';
export type Cue = 'pick' | 'place' | 'return' | 'hello';
// Unlock on the first tap and wait for the context before scheduling notes.
// Otherwise a newly resumed context can miss a short first chime on mobile.
export async function playCue(cue:Cue){
 try {
  if(isMuted())return;
  const {ctx,out}=getAudioBus();
  if(ctx.state!=='running')await ctx.resume();
  if(isMuted()||ctx.state!=='running')return;
  const notes=cue==='pick'?[660,880]:cue==='return'?[659,523,392]:cue==='hello'?[523,659,784,1047]:[523,659,784,1047];
  notes.forEach((hz,i)=>{
   const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+.035+i*(cue==='pick'?.05:.105);
   o.type='triangle';o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(hz*(cue==='pick'?1.12:1),t+.09);
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(cue==='pick'?.11:.17,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.38);
   o.connect(g);g.connect(out);o.start(t);o.stop(t+.4);o.onended=()=>{o.disconnect();g.disconnect();};
  });
 }catch{/* The visible cue remains available if browser audio is unavailable. */}
}
