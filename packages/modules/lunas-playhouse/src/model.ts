export type Category = 'floor' | 'surface' | 'wall' | 'ceiling';
export type Item = { id: string; name: string; icon: string; categories: Category[]; color: string };
export const items: Item[] = [
  { id:'chair', name:'Cozy armchair', icon:'🪑', categories:['floor'], color:'#d998b8' },
  { id:'ottoman', name:'Round ottoman', icon:'🛋️', categories:['floor'], color:'#8dc7c1' },
  { id:'bookcase', name:'Little bookcase', icon:'📚', categories:['floor'], color:'#d4a275' },
  { id:'fern', name:'Leafy houseplant', icon:'🌿', categories:['floor'], color:'#6ca779' },
  { id:'sunpainting', name:'Sunshine painting', icon:'🌄', categories:['wall'], color:'#edb15f' },
  { id:'rainbowpainting', name:'Rainbow painting', icon:'🌈', categories:['wall'], color:'#b69cdb' },
  { id:'clock', name:'Daisy wall clock', icon:'🕒', categories:['wall'], color:'#efba73' },
  { id:'teapot', name:'Little tea set', icon:'🫖', categories:['surface'], color:'#9fcbd6' },
  { id:'books', name:'Story books', icon:'📖', categories:['surface'], color:'#df8fab' },
  { id:'fruit', name:'Fruit bowl', icon:'🍎', categories:['surface'], color:'#8dc7c1' },
  { id:'slippers', name:'Bunny slippers', icon:'🐰', categories:['floor'], color:'#f0d4d5' },
  { id:'banig', name:'Banig woven mat', icon:'🧶', categories:['floor'], color:'#e8ab63' },
  { id:'capiz', name:'Capiz shell nightlight', icon:'🐚', categories:['surface'], color:'#fff0be' },
  { id:'carabao', name:'Carabao plush', icon:'🐃', categories:['surface'], color:'#9aa8c2' },
  { id:'parol', name:'Parol star lantern', icon:'⭐', categories:['ceiling'], color:'#ffd451' },
  { id:'talavera', name:'Talavera planter', icon:'🪴', categories:['floor','surface'], color:'#417ee0' },
  { id:'alebrije', name:'Alebrije wooden creature', icon:'🐉', categories:['surface'], color:'#e47bca' },
  { id:'zarape', name:'Zarape-patterned blanket', icon:'🌈', categories:['floor'], color:'#e6778c' },
  { id:'bluebonnet', name:'Bluebonnet window box', icon:'🪻', categories:['wall'], color:'#6678da' },
  { id:'guitar', name:'Acoustic guitar', icon:'🎸', categories:['floor'], color:'#d49454' },
  { id:'boots', name:'Decorative cowboy boots', icon:'👢', categories:['floor'], color:'#df8270' },
  { id:'armadillo', name:'Toy armadillo', icon:'🦔', categories:['surface'], color:'#af98c2' },
  { id:'blocks', name:'Rainbow building blocks', icon:'🧱', categories:['floor'], color:'#58bfb0' },
  { id:'moon', name:'Moon cushion', icon:'🌙', categories:['floor'], color:'#ffd76d' },
  { id:'flowers', name:'Paper flowers', icon:'🌸', categories:['wall'], color:'#ee90b0' },
  { id:'mobile', name:'Cloud mobile', icon:'☁️', categories:['ceiling'], color:'#99dbe7' },
];
export type Node = { id:string; category:Category; x:number; y:number; z:number; wall?:number; facing?:number };
export const nodes: Node[] = [];
for (let x=0;x<5;x++) for(let z=0;z<5;z++) {
  if (z===0 || (z===1 && (x===0 || x===4))) continue;
  nodes.push({id:`f${x}${z}`,category:'floor',x:(x-2)*1.05,y:.04,z:(z-2)*1.05});
}
// Wall-side floor spots keep a furniture back close to the wall, facing inward.
for(const side of [-1,1]) for(const [i,z] of [-.45,.6,1.65].entries()) nodes.push({id:`edge${side}_${i}`,category:'floor',x:side*2.55,y:.04,z,facing:side<0?1:3});
for(const [i,x] of [-1.5,0,1.5].entries()) nodes.push({id:`edgefront${i}`,category:'floor',x,y:.04,z:2.55,facing:2});
nodes.push({id:'edgeback',category:'floor',x:0,y:.04,z:-2.55,facing:0});
for(const [i,x,z] of [[0,-1.8,-1.7],[1,-.9,-1.7],[2,1.25,-1.8],[3,2.05,-1.8]]) nodes.push({id:`s${i}`,category:'surface',x,y:1.08,z});
for(let wall=0;wall<4;wall++) for(let i=0;i<2;i++) {
  const a=wall*Math.PI/2, offset=(i-.5)*2;
  nodes.push({id:`w${wall}${i}`,category:'wall',x:Math.sin(a)*2.86+Math.cos(a)*offset,y:1.9,z:Math.cos(a)*2.86-Math.sin(a)*offset,wall});
}
for(const [i,x,z] of [[0,-1.7,0],[1,1.7,0],[2,0,-1.8],[3,0,1.8]]) nodes.push({id:`c${i}`,category:'ceiling',x,y:2.65,z});
export type Placements = Record<string,string>;
export const SAVE='lunas-playhouse-v1';
export const ROTATIONS='lunas-playhouse-rotations-v1';
export type Rotations=Record<string,number>;
export function sanitizeRotations(value:unknown):Rotations {
 const out:Rotations={};if(!value||typeof value!=='object')return out;
 for(const item of items){const n=(value as Rotations)[item.id];if(Number.isInteger(n))out[item.id]=((n%4)+4)%4;}return out;
}
function overlaps(a:Node,b:Node){return a.id===b.id || (a.category==='floor'&&b.category==='floor'&&Math.hypot(a.x-b.x,a.z-b.z)<.85);}

export function sanitize(value: unknown): Placements {
  const out:Placements={}; if(!value || typeof value!=='object') return out;
  for(const item of items) {const id=(value as Placements)[item.id];const node=nodes.find(n=>n.id===id);if(node && item.categories.includes(node.category) && !Object.values(out).some(id=>overlaps(node,nodes.find(n=>n.id===id)!)))out[item.id]=id;}
  return out;
}
export function place(state:Placements,itemId:string,nodeId:string):Placements {
  const item=items.find(i=>i.id===itemId),target=nodes.find(n=>n.id===nodeId);
  if(!item || !target || !item.categories.includes(target.category))return state;
  const available=nodes.filter(n=>n.category===target.category && (n.wall===target.wall) && !Object.entries(state).some(([id,node])=>id!==itemId&&overlaps(n,nodes.find(v=>v.id===node)!)));
  available.sort((a,b)=>(a.x-target.x)**2+(a.z-target.z)**2-(b.x-target.x)**2-(b.z-target.z)**2);
  return available[0]?{...state,[itemId]:available[0].id}:state;
}
// A small walkable grid avoids furniture and placed floor objects; approach the
// nearest reachable cell rather than walking into an object or through a table.
export function pathTo(from:{x:number;z:number},target:{x:number;z:number},state:Placements):{x:number;z:number}[] {
  const size=11,step=.5;
  const point=(i:number)=>({x:(i%size-5)*step,z:(Math.floor(i/size)-5)*step});
  const blocked=(i:number)=>{const p=point(i);return (p.z < -1.05 && (p.x < -.45 || p.x > .7)) || Object.entries(state).some(([id,n])=>{const v=nodes.find(v=>v.id===n)!;return v.category==='floor'&&!['banig','zarape'].includes(id)&&Math.hypot(v.x-p.x,v.z-p.z)<.53;});};
  const start=Math.max(0,Math.min(10,Math.round(from.z/step)+5))*size+Math.max(0,Math.min(10,Math.round(from.x/step)+5));
  const queue=[start],prev=new Map<number,number>();prev.set(start,-1);let best=start;
  const distance=(i:number)=>{const p=point(i);return Math.hypot(p.x-target.x,p.z-target.z);};
  for(let cursor=0;cursor<queue.length;cursor++){const i=queue[cursor];if(distance(i)<distance(best))best=i;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=i%size+dx,z=Math.floor(i/size)+dz,n=z*size+x;if(x<0||x>=size||z<0||z>=size||prev.has(n)||blocked(n))continue;prev.set(n,i);queue.push(n);}}
  const route=[];for(let i=best;i!==start&&i!==-1;i=prev.get(i)??-1)route.unshift(point(i));return route;
}
