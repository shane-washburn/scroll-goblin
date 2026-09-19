import * as T from 'three';
import type { Item } from './model';
export function shape(g:T.Group,kind:'ball'|'box'|'tube',color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number){
 const geometry=kind==='ball'?new T.SphereGeometry(1,16,12):kind==='tube'?new T.CylinderGeometry(1,1,1,20):new T.BoxGeometry(1,1,1);
 const o=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.8}));o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;
}
export function star(g:T.Group,color:string,x:number,y:number,z:number,r=.35){
 const s=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,rr=i%2?r*.45:r;i?s.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):s.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}s.closePath();
 const o=new T.Mesh(new T.ExtrudeGeometry(s,{depth:.09,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:2,steps:1}),new T.MeshStandardMaterial({color}));o.position.set(x,y,z);g.add(o);return o;
}
function meshArc(radius:number,color:string){return new T.Mesh(new T.TorusGeometry(radius,.026,8,24,Math.PI),new T.MeshStandardMaterial({color}));}
export function itemArt(item:Item):T.Group {
 const g=new T.Group(),c=item.color;g.userData.item=item.id;
 const ball=(color:string,x:number,y:number,z:number,sx:number,sy=sx,sz=sx)=>shape(g,'ball',color,x,y,z,sx,sy,sz);
 const box=(color:string,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>shape(g,'box',color,x,y,z,sx,sy,sz);
 if(item.id==='chair'){
  box(c,0,.32,0,.7,.24,.6);box(c,0,.67,-.23,.7,.55,.15);for(const x of [-.3,.3]){box(c,x,.48,0,.14,.25,.65);for(const z of [-.2,.2])box('#a37654',x,.11,z,.09,.2,.09);}ball('#f8e3bb',0,.57,-.08,.22,.17,.075);
 }else if(item.id==='ottoman'){
  shape(g,'tube',c,0,.23,0,.36,.38,.36);shape(g,'tube','#c1e2cd',0,.43,0,.37,.07,.37);ball('#6c9c98',0,.47,0,.035,.015,.035);
 }else if(item.id==='bookcase'){
  box(c,0,.08,0,.76,.12,.4);box(c,0,.91,0,.76,.09,.4);box(c,0,.49,0,.76,.07,.4);box(c,0,.5,-.18,.76,.8,.06);for(const x of [-.35,.35])box(c,x,.49,0,.07,.85,.4);
  for(let row=0;row<2;row++)for(let i=0;i<5;i++){box(['#8abdc0','#e7a0ae','#e7c56d','#aaa1d2'][i%4],(i-2)*.11,.27+row*.4,.02,.085,.25+(i%2)*.05,.28);box('#fff0dc',(i-2)*.11,.3+row*.4,.166,.06,.025,.01);}
 }else if(item.id==='fern'){
  shape(g,'tube','#df9d80',0,.19,0,.23,.34,.23);shape(g,'tube','#f4c5a1',0,.35,0,.25,.07,.25);
  for(let i=0;i<9;i++){const a=i*2.4;const leaf=ball(i%2?c:'#92bd78',Math.sin(a)*.18,.57+(i%3)*.12,Math.cos(a)*.18,.09,.28,.065);leaf.rotation.z=-Math.sin(a)*.6;leaf.rotation.x=Math.cos(a)*.6;}
 }else if(item.id.endsWith('painting')){
  box('#d6ac76',0,0,0,.78,.63,.09);box('#fff2dc',0,0,.055,.65,.5,.025);
  if(item.id==='sunpainting'){ball('#efbc62',.16,.11,.08,.09,.09,.02);ball('#8abf9b',-.15,-.19,.085,.26,.15,.015);ball('#83aeba',.2,-.18,.09,.24,.11,.015);}
  else {for(let i=0;i<4;i++){const arc=meshArc(.24-i*.047,['#e69caa','#efc377','#93c4b1','#b2a1d4'][i]);arc.position.set(0,-.1,.085);g.add(arc);}}
 }else if(item.id==='clock'){
  for(let i=0;i<10;i++){const a=i*Math.PI/5;ball('#f4cb7f',Math.sin(a)*.25,Math.cos(a)*.25,0,.1,.1,.04);}ball('#fff7df',0,0,.04,.24,.24,.035);
  box('#775d79',0,.075,.085,.022,.17,.012);const hand=box('#775d79',.07,0,.086,.15,.024,.012);hand.rotation.z=-.2;ball('#d99c8a',0,0,.1,.03);
 }else if(item.id==='teapot'){
  shape(g,'tube','#ecd8ba',0,.025,0,.34,.04,.23);ball(c,-.08,.19,0,.15,.15,.13);ball('#d0e5e2',-.08,.34,0,.12,.025,.11);ball(c,-.08,.38,0,.03);
  const spout=shape(g,'tube',c,.07,.24,0,.038,.18,.038);spout.rotation.z=-.6;const handle=new T.Mesh(new T.TorusGeometry(.085,.025,8,20),new T.MeshStandardMaterial({color:c}));handle.position.set(-.22,.21,0);g.add(handle);shape(g,'tube','#eeb3bf',.2,.095,.07,.065,.11,.065);
 }else if(item.id==='books'){
  for(let i=0;i<3;i++){box(['#91baba',c,'#e3bf6b'][i],0,.055+i*.095,0,.45,.08,.3);box('#fff3d5',0,.055+i*.095,.154,.4,.045,.012);}
 }else if(item.id==='fruit'){
  ball('#e3bb7b',0,.09,0,.25,.09,.2);for(let i=0;i<4;i++){ball(['#e98880','#eebc58','#92b677'][i%3],(i%2-.5)*.2,.19,Math.floor(i/2)*.13-.065,.09);shape(g,'tube','#6e8b57',(i%2-.5)*.2,.285,Math.floor(i/2)*.13-.065,.012,.04,.012);}
 }else if(item.id==='slippers'){
  for(const x of [-.15,.15]){ball(c,x,.09,0,.12,.09,.24);for(const dx of [-.04,.04])ball(c,x+dx,.2,.12,.028,.12,.025);for(const dx of [-.04,.04])ball('#795c70',x+dx,.13,.2,.012);}
 }else if(['banig','zarape'].includes(item.id)){
  box(c,0,.035,0,.83,.065,.78);for(let i=0;i<9;i++){box(['#edc963','#68aa98','#d66686','#7456a0'][i%4],(i-4)*.085,.073,0,.045,.008,.76);if(item.id==='banig')box('#fff1c4',0,.08,(i-4)*.08,.82,.008,.02);}
  for(let i=0;i<9;i++)for(const z of [-.42,.42])box('#f5dbb6',(i-4)*.085,.035,z,.025,.025,.09);
 }else if(['carabao','alebrije','armadillo'].includes(item.id)){
  ball(c,0,.22,0,.26,.19,.18);ball(c,0,.32,.2,.18,.16,.15);
  for(const x of [-.16,.16])for(const z of [-.12,.13])ball(c,x,.09,z,.065,.09,.06);
  for(const x of [-.065,.065]){ball('#272337',x,.37,.326,.02);ball('#fff',x-.006,.377,.341,.007);}
  if(item.id==='carabao'){ball('#c9bdb3',0,.26,.31,.12,.075,.08);for(const side of [-1,1]){const horn=shape(g,'tube','#fff4df',side*.19,.43,.18,.034,.23,.034);horn.rotation.z=-side*.8;ball(c,side*.18,.33,.15,.09,.035,.05);}}
  if(item.id==='alebrije'){for(const x of [-.22,.22]){ball('#68d9c2',x,.38,-.03,.16,.04,.2);star(g,'#ffe267',x,.22,.17,.075);}for(let i=0;i<4;i++)star(g,'#ffd750',0,.4+i*.035,-.14+i*.06,.07);}
  if(item.id==='armadillo'){for(let i=0;i<5;i++){const stripe=shape(g,'tube','#d7c0dc',0,.23,(i-2)*.05,.26,.019,.195);stripe.rotation.x=Math.PI/2;}for(const x of [-.085,.085])ball(c,x,.48,.18,.04,.1,.04);}
 }else if(item.id==='capiz'){
  shape(g,'tube','#c99b50',0,.035,0,.2,.07,.2);for(let row=0;row<3;row++)for(let i=0;i<6;i++){const a=i*Math.PI/3;ball('#fff0c5',Math.sin(a)*.14,.16+row*.1,Math.cos(a)*.14,.09,.09,.035);}
  const light=ball('#fff9cb',0,.27,0,.13,.18,.13);(light.material as T.MeshStandardMaterial).emissive.set('#e6a63b');
 }else if(item.id==='parol'){
  shape(g,'tube','#bd9b66',0,.25,0,.013,.5,.013);star(g,c,0,0,0,.35);star(g,'#f5a4b4',0,0,.12,.17);for(const x of [-.18,.18]){box('#7bd2c3',x,-.4,0,.05,.28,.025);box('#efa4c2',x+.055,-.36,0,.04,.2,.025);}
 }else if(item.id==='talavera'){
  shape(g,'tube','#fdf8e7',0,.2,0,.2,.35,.2);for(let i=0;i<10;i++){const a=i*Math.PI/5;ball(c,Math.sin(a)*.2,.2,Math.cos(a)*.2,.035,.075,.035);}
  shape(g,'tube',c,0,.37,0,.23,.055,.23);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const leaf=ball('#78ad7e',Math.sin(a)*.12,.52,Math.cos(a)*.12,.07,.21,.06);leaf.rotation.z=-Math.sin(a)*.6;}
 }else if(item.id==='bluebonnet'||item.id==='flowers'){
  if(item.id==='bluebonnet')box('#f2bf89',0,0,0,.72,.19,.25);
  for(let i=0;i<5;i++){const x=(i-2)*.13;shape(g,'tube','#548f6d',x,.2,0,.012,.35,.012);for(let j=0;j<4;j++)ball(item.id==='flowers'?['#f39cc0','#f5cb65'][i%2]:c,x,.25+j*.05,.02,.052,.04,.055);}
 }else if(item.id==='guitar'){
  ball(c,0,.3,0,.23,.28,.08);ball(c,0,.55,0,.16,.2,.075);box('#8b593d',0,.82,0,.06,.5,.055);box('#c48b54',0,1.07,0,.12,.15,.055);ball('#573c37',0,.47,.078,.078,.078,.008);for(let i=0;i<4;i++)box('#f5e6c3',(i-1.5)*.012,.67,.09,.004,.73,.006);
 }else if(item.id==='boots'){
  for(const x of [-.15,.15]){box(c,x,.25,0,.19,.45,.19);ball(c,x,.1,.1,.12,.1,.2);box('#805349',x,.025,.07,.21,.04,.32);star(g,'#ffebaa',x,.32,.101,.07);}
 }else if(item.id==='blocks'){
  for(let i=0;i<5;i++){const b=box(['#f1b861','#e291b3','#69b3be'][i%3],((i%3)-1)*.23,.13+Math.floor(i/3)*.23,0,.22,.23,.24);b.rotation.y=i*.18;}
 }else if(item.id==='moon'){
  ball(c,0,.16,0,.32,.14,.3);for(const x of [-.09,.09])ball('#8b633d',x,.25,.15,.025,.025,.015);star(g,'#fff4cf',.19,.25,.05,.08);
 }else if(item.id==='mobile'){
  for(let i=0;i<3;i++)ball('#fff6e7',(i-1)*.18,0,0,.18,.13,.09);
  for(let i=0;i<3;i++){shape(g,'tube','#c3d6cd',(i-1)*.2,-.25,0,.008,.4,.008);star(g,['#ffcf6b','#e9a4ca','#8cd9d5'][i],(i-1)*.2,-.43,0,.11);}
 }
 return g;
}
export function child(mia:boolean){
 const g=new T.Group(),skin=mia?'#bd815e':'#d79976',shirt=mia?'#78c8c0':'#ed8fb2';
 shape(g,'ball',shirt,0,.49,0,.17,.25,.13);shape(g,'ball',skin,0,.9,0,.22,.24,.2);shape(g,'ball','#382f3b',0,1.04,-.055,.225,.17,.19);
 for(const side of [-1,1]){shape(g,'ball','#382f3b',side*.19,.82,-.08,.07,.22,.09);shape(g,'ball','#292338',side*.078,.91,.18,.025,.032,.02);shape(g,'ball','#fff',side*.073,.92,.198,.008,.009,.005);shape(g,'ball','#ef9d94',side*.135,.84,.164,.04,.025,.015);
 const arm=new T.Group();arm.name=side===1?'rightArm':'leftArm';arm.position.set(side*.2,.65,0);g.add(arm);shape(arm,'ball',skin,0,-.12,0,.055,.16,.055);
 shape(g,'tube','#799bb2',side*.085,.22,0,.06,.28,.06);shape(g,'ball',mia?'#a56343':'#f6eacb',side*.085,.08,.055,.08,.08,.13);
 if(!mia){shape(g,'ball','#382f3b',side*.24,.94,-.07,.11,.15,.1);shape(g,'ball','#f5c465',side*.22,1.01,0,.045,.04,.03);}}
 shape(g,'ball','#a25050',0,.8,.19,.035,.015,.009);
 if(mia){shape(g,'ball','#eac486',0,1.13,0,.33,.045,.28);shape(g,'tube','#eac486',0,1.22,0,.18,.18,.16);shape(g,'tube','#b67859',0,1.15,0,.185,.035,.165);}
 return g;
}
export function dispose(root:T.Object3D){root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
