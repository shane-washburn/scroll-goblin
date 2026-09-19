import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { child, dispose, itemArt, shape } from './art';
import { items, nodes, pathTo, type Placements, type Rotations } from './model';
type Props={placements:Placements;rotations:Rotations;lastPlaced:string|null;onDismiss:()=>void;selected:string|null;angle:number;event:number;onNode:(id:string)=>void;onItem:(id:string)=>void;onThumbs:(images:Record<string,string>)=>void};
export default function Room(props:Props){
 const host=useRef<HTMLDivElement>(null),latest=useRef(props);latest.current=props;
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  const el=host.current!;let renderer:T.WebGLRenderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:true});}catch{setFailed(true);return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;el.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#f1e6dc');
  scene.add(new T.HemisphereLight('#fff7e1','#b99ab4',2.6));const sun=new T.DirectionalLight('#fff0d3',3);sun.position.set(2,8,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=sun.shadow.camera.bottom=-5;sun.shadow.camera.right=sun.shadow.camera.top=5;scene.add(sun);
  const camera=new T.OrthographicCamera(-5,5,5,-5,.1,60);
  // Render the actual miniature for inventory thumbnails, without remote assets.
  const thumbs:Record<string,string>={};const thumbScene=new T.Scene();thumbScene.background=new T.Color('#fff9ef');thumbScene.add(new T.HemisphereLight('#fff','#b6a0b8',3));const tl=new T.DirectionalLight('#fff',3);tl.position.set(2,4,3);thumbScene.add(tl);
  const tc=new T.OrthographicCamera(-.8,.8,.8,-.8,.1,10);tc.position.set(1,1.3,2);tc.lookAt(0,.2,0);renderer.setSize(130,130);
  for(const item of items){const g=itemArt(item);thumbScene.add(g);renderer.render(thumbScene,tc);thumbs[item.id]=renderer.domElement.toDataURL();thumbScene.remove(g);dispose(g);}latest.current.onThumbs(thumbs);
  const room=new T.Group();scene.add(room);shape(room,'box','#c89370',0,-.17,0,6.25,.3,6.25);shape(room,'box','#f9dfb9',0,-.005,0,6.05,.06,6.05);
  for(let i=-3;i<=3;i++)shape(room,'box','#eac8a0',i,.03,0,.015,.009,6);
  const walls:T.Group[]=[];
  for(let i=0;i<4;i++){const wall=new T.Group();wall.rotation.y=i*Math.PI/2;room.add(wall);shape(wall,'box',i%2?'#d2e6d7':'#efcbd6',0,1.55,3,6,.0+3.1,.12);shape(wall,'box','#fff6e5',0,.16,2.91,6,.25,.1);
   shape(wall,'box','#fff6e5',0,1.96,2.9,1.15,1.2,.1);shape(wall,'box','#99d0e0',0,1.96,2.83,.99,1.04,.04);shape(wall,'box','#fff6e5',0,1.96,2.78,.045,1.04,.05);shape(wall,'box','#fff6e5',0,1.96,2.78,.99,.045,.05);walls.push(wall);}
  for(const [x,z,width,color] of [[-1.35,-1.7,1.85,'#e8b581'],[1.65,-1.8,1.65,'#9dc2bd']] as const){shape(room,'box',color,x,1,z,width,.16,.8);for(const side of [-1,1])shape(room,'box',color,x+side*(width/2-.13),.5,z,.12,1,.55);}
  const mia=child(true),luna=child(false);mia.position.set(-1,0,1.9);luna.position.set(1,0,1.9);scene.add(mia,luna);
  const objectGroup=new T.Group(),nodeGroup=new T.Group(),sparkGroup=new T.Group();scene.add(objectGroup,nodeGroup,sparkGroup);
  const meshes=new Map<string,T.Group>(),markers=new Map<string,T.Mesh>();
  for(const n of nodes){const marker=new T.Mesh(new T.TorusGeometry(.23,.04,8,24),new T.MeshStandardMaterial({color:'#fff8cb',emissive:'#ffc562',emissiveIntensity:.5,transparent:true,opacity:.9,depthTest:false}));marker.position.set(n.x,n.y+.07,n.z);marker.rotation.x=n.category==='wall'?0:Math.PI/2;if(n.wall!==undefined)marker.rotation.y=n.wall*Math.PI/2;marker.userData.node=n.id;marker.renderOrder=10;nodeGroup.add(marker);markers.set(n.id,marker);}
  let seen:Placements={},selected:string|null=null,seenEvent=-1,angle=Math.PI/4,last=performance.now(),lastInput=last,sparkTime=0;
  let routes=[[] as {x:number;z:number}[],[] as {x:number;z:number}[]],target=new T.Vector3(),reactionUntil=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);const half=4.65;camera.left=-half;camera.right=half;camera.top=half*h/w;camera.bottom=-half*h/w;if(h/w<.85){camera.top=4.5;camera.bottom=-4.5;camera.left=-4.5*w/h;camera.right=4.5*w/h;}camera.updateProjectionMatrix();};const ro=new ResizeObserver(resize);ro.observe(el);resize();
  const down=(e:PointerEvent)=>{lastInput=performance.now();renderer.domElement.setPointerCapture(e.pointerId);};
  const up=(e:PointerEvent)=>{const rect=el.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
   if(latest.current.selected){
    const near=[...markers.values()].filter(m=>m.visible).map(m=>{const v=m.position.clone().project(camera);return {m,d:Math.hypot((v.x+1)*rect.width/2-(e.clientX-rect.left),(1-v.y)*rect.height/2-(e.clientY-rect.top))};}).sort((a,b)=>a.d-b.d)[0];
    if(near&&near.d<44){latest.current.onNode(near.m.userData.node);return;}
   }
   const hits=ray.intersectObjects(objectGroup.children.filter(o=>o.visible),true);for(const hit of hits){let o:T.Object3D|null=hit.object;while(o&&!o.userData.item)o=o.parent;if(o?.userData.item){latest.current.onItem(o.userData.item);return;}}
   latest.current.onDismiss();
  };renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',up);
  let frame=0;const animate=(now:number)=>{
   frame=requestAnimationFrame(animate);if(now-last<32)return;const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;const p=latest.current;
   angle=T.MathUtils.damp(angle,Math.PI/4+p.angle*Math.PI/2,8,dt);camera.position.set(Math.sin(angle)*10,10,Math.cos(angle)*10);camera.lookAt(0,.8,0);
   walls.forEach((w,i)=>w.visible=Math.cos(angle-i*Math.PI/2)<0);
   if(p.placements!==seen){
    for(const [id,g] of meshes)if(!p.placements[id]){objectGroup.remove(g);dispose(g);meshes.delete(id);}
    for(const [id,nodeId] of Object.entries(p.placements)){const n=nodes.find(n=>n.id===nodeId)!;let g=meshes.get(id);if(!g){g=itemArt(items.find(i=>i.id===id)!);g.position.set(n.x,n.y+.45,n.z);objectGroup.add(g);meshes.set(id,g);}g.userData.destination=new T.Vector3(n.x,n.y,n.z);g.rotation.y=n.wall===undefined?(p.rotations[id]??0)*Math.PI/2:n.wall*Math.PI/2+Math.PI;g.userData.wall=n.wall;}
    seen=p.placements;
   }
   if(p.selected!==selected){selected=p.selected;lastInput=now;}
   const item=items.find(i=>i.id===selected);
   for(const n of nodes){const marker=markers.get(n.id)!;marker.visible=!!item?.categories.includes(n.category)&&(n.wall===undefined||walls[n.wall].visible);marker.scale.setScalar(reduced?1:1+Math.sin(now/450)*.12);}
   for(const [id,g] of meshes){if(g.userData.wall===undefined)g.rotation.y=(p.rotations[id]??0)*Math.PI/2;g.position.lerp(g.userData.destination,reduced?1:1-Math.exp(-12*dt));g.visible=g.userData.wall===undefined||walls[g.userData.wall].visible;g.scale.setScalar(id===selected?1.08:1);}
   if(p.event!==seenEvent){if(seenEvent>=0&&p.lastPlaced&&p.placements[p.lastPlaced]){const n=nodes.find(n=>n.id===p.placements[p.lastPlaced!])!;target.set(n.x,n.y,n.z);routes=[pathTo(mia.position,n,p.placements),pathTo(luna.position,{x:n.x+.55,z:n.z+.35},p.placements)];reactionUntil=now+7000;sparkTime=now;
     dispose(sparkGroup);sparkGroup.clear();for(let i=0;i<24;i++){const s=shape(sparkGroup,'ball',['#fff0ad','#f5a9c5','#92ddd3'][i%3],n.x,n.y+.25,n.z,.085,.085,.085);s.userData.velocity=new T.Vector3(Math.sin(i*2.4)*.65,.5+(i%4)*.22,Math.cos(i*2.4)*.65);}}
    seenEvent=p.event;lastInput=now;}
   [mia,luna].forEach((actor,index)=>{const route=routes[index];const next=route[0];const arm=actor.getObjectByName('rightArm')!;const leftArm=actor.getObjectByName('leftArm')!;
    if(next){const dx=next.x-actor.position.x,dz=next.z-actor.position.z,d=Math.hypot(dx,dz);actor.rotation.y=Math.atan2(dx,dz);if(d<.08)route.shift();else{const step=Math.min(d,dt*(index?1.15:1.4));actor.position.x+=dx/d*step;actor.position.z+=dz/d*step;}actor.position.y=reduced?0:Math.abs(Math.sin(now/120))*.04;arm.rotation.x=Math.sin(now/150)*.4;leftArm.rotation.x=-arm.rotation.x;
    }else if(now<reactionUntil){actor.rotation.y=Math.atan2(target.x-actor.position.x,target.z-actor.position.z);actor.position.y=reduced?0:Math.max(0,Math.sin(now/190))*.1;arm.rotation.z=.9+Math.sin(now/140)*.25;leftArm.rotation.z=-arm.rotation.z;
    }else{actor.position.y=0;arm.rotation.x=leftArm.rotation.x=0;leftArm.rotation.z=0;arm.rotation.z=now-lastInput>10000?1.7+(reduced?0:Math.sin(now/250)*.35):0;}
   });
   sparkGroup.visible=!reduced&&now-sparkTime<1600;for(const s of sparkGroup.children){s.position.addScaledVector(s.userData.velocity,dt);s.scale.multiplyScalar(Math.exp(-dt*1.8));}
   renderer.render(scene,camera);
  };frame=requestAnimationFrame(animate);
  return()=>{cancelAnimationFrame(frame);ro.disconnect();renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointerup',up);dispose(scene);renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div className="lp-room" ref={host} role="group" aria-label="Mia and Luna’s room. Choose a toy, then a glowing spot.">{failed&&<p>3D could not start on this device. Try a browser with WebGL enabled.</p>}</div>;
}
