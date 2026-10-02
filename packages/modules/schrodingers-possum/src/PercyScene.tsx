import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { createPercy, ellipsoid, material, mesh, tube } from './percyModel';

export type ScenePhase = 'idle' | 'superposition' | 'collapse' | 'resolved';
type Props = { phase: ScenePhase; winner?: 0 | 1; reducedMotion: boolean };

function makePortal(parent: T.Object3D, x: number, color: string) {
  const root = new T.Group(); root.position.set(x, 1.43, -.82); root.rotation.y = x < 0 ? .12 : -.12; parent.add(root);
  const casing = material('#62677f', .38, .6);
  const light = new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.8, roughness: .4 });
  mesh(root, new T.TorusGeometry(.91, .13, 12, 64), casing);
  mesh(root, new T.TorusGeometry(.91, .042, 10, 64), light, 0, 0, .125);
  mesh(root, new T.TorusGeometry(.77, .018, 8, 64), light, 0, 0, .13);
  const shader = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide,
    uniforms: { time: { value: 0 }, tint: { value: new T.Color(color) }, energy: { value: .6 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec2 vUv; uniform float time; uniform vec3 tint; uniform float energy;
      void main(){vec2 p=(vUv-.5)*2.; float r=length(p); float a=atan(p.y,p.x);
        float swirl=.5+.5*sin(r*25.-a*3.-time*1.8); float ring=pow(r,3.);
        float strength=.09+ring*.55+swirl*.13*energy;
        gl_FragColor=vec4(tint*strength*(1.+energy),.72+ring*.25);}`,
  });
  mesh(root, new T.CircleGeometry(.84, 64), shader, 0, 0, .06);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const latch = mesh(root, new T.BoxGeometry(.16, .22, .16), casing, Math.cos(a) * .95, Math.sin(a) * .95, .02);
    latch.rotation.z = a - Math.PI / 2;
  }
  mesh(root, new T.BoxGeometry(.70, .20, .65), casing, 0, -1.2, 0);
  mesh(root, new T.BoxGeometry(.37, .10, .43), light, 0, -1.07, 0);
  const lamp = new T.PointLight(color, 13, 5, 2); lamp.position.set(0, 0, .65); root.add(lamp);
  return { root, shader, lamp, light };
}

function makeLab(scene: T.Scene) {
  const dark = material('#292e44', .55, .4), trim = material('#7d899a', .4, .6), floor = material('#384758', .55, .3);
  const mint = new T.MeshStandardMaterial({ color: '#8bf2d3', emissive: '#40b99c', emissiveIntensity: .9 });
  mesh(scene, new T.CylinderGeometry(4.1, 4.24, .28, 64), dark, 0, -.16, -.1);
  mesh(scene, new T.CylinderGeometry(4.03, 4.10, .09, 64), trim, 0, .025, -.1);
  mesh(scene, new T.CylinderGeometry(3.87, 3.87, .055, 64), floor, 0, .09, -.1);
  const ring = mesh(scene, new T.TorusGeometry(3.82, .021, 8, 80), mint, 0, .126, -.1); ring.rotation.x = Math.PI / 2;
  // A raised apparatus beneath Percy, plus curved floor wiring.
  mesh(scene, new T.CylinderGeometry(1.24, 1.42, .13, 6), dark, 0, .18, .20);
  const smallRing = mesh(scene, new T.TorusGeometry(1.22, .026, 8, 6), mint, 0, .256, .2); smallRing.rotation.x = Math.PI / 2;
  tube(scene, [[-2.45, .18, -.9], [-2.4, .18, .9], [-1.4, .18, 1.35], [-1.1, .24, .5]], .035, dark);
  tube(scene, [[2.45, .18, -.9], [2.4, .18, .9], [1.7, .18, 1.1], [1.25, .24, .35]], .035, dark);
  for (const side of [-1, 1]) {
    const console = new T.Group(); console.position.set(side * 3.12, .20, -1.3); console.rotation.y = -side * .30; scene.add(console);
    mesh(console, new T.BoxGeometry(.62, .76, .6), dark, 0, .35, 0);
    const screen = mesh(console, new T.BoxGeometry(.55, .32, .065), trim, 0, .81, -.04); screen.rotation.x = -.4;
    mesh(console, new T.BoxGeometry(.43, .18, .075), material('#102e3c'), 0, .84, 0);
    tube(console, [[-.18, .85, .046], [-.10, .85, .046], [-.05, .91, .046], [0, .78, .046], [.04, .88, .046], [.10, .85, .046], [.17, .85, .046]], .009, mint);
    ellipsoid(console, mint, -.16, .46, .315, .035);
    ellipsoid(console, material('#ee8a94'), -.03, .46, .315, .035);
    mesh(console, new T.CylinderGeometry(.12, .12, .075, 16), trim, .10, .28, .32).rotation.x = Math.PI / 2;
  }
  // Percy's battered cardboard box, a nod to the reference image.
  const box = new T.Group(); box.position.set(-1.42, .40, -.60); box.rotation.y = -.30; scene.add(box);
  const cardboard = material('#a88368');
  mesh(box, new T.BoxGeometry(.57, .52, .48), cardboard);
  mesh(box, new T.PlaneGeometry(.53, .40), material('#69524e'), 0, .266, 0).rotation.x = -Math.PI / 2;
  const flap = mesh(box, new T.BoxGeometry(.57, .025, .27), cardboard, 0, .31, .30); flap.rotation.x = -.34;
  const flap2 = mesh(box, new T.BoxGeometry(.27, .025, .48), cardboard, -.39, .31, 0); flap2.rotation.z = .34;
  mesh(box, new T.BoxGeometry(.3, .035, .008), dark, 0, .06, .245);
  mesh(box, new T.BoxGeometry(.2, .025, .008), dark, 0, -.025, .245);
}

export default function PercyScene(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const current = useRef(props); current.current = props;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let renderer: T.WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
    renderer.setClearColor(0x111426, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true'); host.appendChild(renderer.domElement);
    const scene = new T.Scene();
    const camera = new T.OrthographicCamera(-4.6, 4.6, 3.2, -3.2, .1, 40);
    camera.position.set(0, 4.1, 10); camera.lookAt(0, 1.35, 0);
    scene.add(new T.HemisphereLight('#e9e8ff', '#505062', 2.6));
    const key = new T.DirectionalLight('#fff0de', 4.5); key.position.set(-2, 7, 6); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -5; key.shadow.camera.right = 5;
    key.shadow.camera.top = 5; key.shadow.camera.bottom = -5; key.shadow.normalBias = .025; scene.add(key);
    const rim = new T.DirectionalLight('#b9b7ff', 2.4); rim.position.set(1, 3, -4); scene.add(rim);
    makeLab(scene);
    const portals = [makePortal(scene, -2.42, '#46bfff'), makePortal(scene, 2.42, '#ff687f')];
    const percy = createPercy(); percy.root.position.set(0, .27, .22); scene.add(percy.root);
    const echoes = [-1, 1].map((side, index) => {
      const echo = percy.root.clone(true); echo.position.x = side * 1.1;
      echo.traverse(object => {
        if (!(object instanceof T.Mesh)) return;
        const surface = (object.material as T.MeshStandardMaterial).clone();
        surface.transparent = true; surface.opacity = .17; surface.depthWrite = false;
        surface.emissive = new T.Color(index === 0 ? '#3086c6' : '#c35190'); surface.emissiveIntensity = .3;
        object.material = surface; object.castShadow = false;
      });
      echo.visible = false; scene.add(echo); return echo;
    });
    const dustGeometry = new T.BufferGeometry();
    const positions = new Float32Array(80 * 3);
    for (let i = 0; i < 80; i++) {
      positions[i * 3] = Math.sin(i * 137.5) * 4.2;
      positions[i * 3 + 1] = .5 + ((i * .37) % 3.5);
      positions[i * 3 + 2] = Math.cos(i * 29.7) * 1.7 - 1.3;
    }
    dustGeometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    const dust = new T.Points(dustGeometry, new T.PointsMaterial({ color: '#acb8de', size: .022, transparent: true, opacity: .6, depthWrite: false }));
    scene.add(dust);

    let frame = 0, lastFrame = 0, visible = true, disposed = false;
    let priorPhase: ScenePhase = current.current.phase, phaseStart = performance.now();
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      const halfWidth = 4.45, halfHeight = halfWidth * height / width;
      camera.left = -halfWidth; camera.right = halfWidth; camera.top = halfHeight; camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const intersection = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; }); intersection.observe(host);
    const loseContext = (event: Event) => { event.preventDefault(); setFailed(true); cancelAnimationFrame(frame); };
    renderer.domElement.addEventListener('webglcontextlost', loseContext);

    const render = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(render);
      if (!visible || document.hidden || now - lastFrame < 1000 / 30) return;
      lastFrame = now;
      const { phase, winner, reducedMotion } = current.current;
      if (phase !== priorPhase) { phaseStart = now; priorPhase = phase; }
      const time = reducedMotion ? 0 : now / 1000, progress = Math.min(1, (now - phaseStart) / 1350);
      const waiting = phase === 'superposition';
      const done = phase === 'resolved';
      percy.root.position.set(0, .27, .22); percy.root.rotation.set(0, 0, 0); percy.root.scale.setScalar(1);
      percy.head.rotation.set(0, Math.sin(time * .65) * .09, Math.sin(time * .9) * .04);
      percy.tail.rotation.y = Math.sin(time * 1.3) * .13;
      percy.ears.forEach((ear, i) => { ear.rotation.z = (i === 0 ? .25 : -.25) + Math.sin(time * 2 + i) * .035; });
      percy.arms[0].rotation.z = -.13 + Math.sin(time * 1.2) * .035;
      percy.arms[1].rotation.z = done ? .95 : .13 + Math.sin(time * 1.2 + 2) * .035;
      percy.parchment.visible = done;
      echoes.forEach(echo => { echo.visible = waiting && !reducedMotion; });
      if (waiting && !reducedMotion) {
        percy.root.position.x = Math.sin(time * 32) * .07;
        percy.root.position.y += Math.sin(time * 38) * .035;
        percy.root.rotation.z = Math.sin(time * 30) * .04;
        percy.head.rotation.y = Math.sin(time * 4) * .18;
        echoes.forEach((echo, i) => {
          echo.position.x = (i ? 1 : -1) * (1.02 + Math.sin(time * 3) * .10);
          echo.position.y = .3 + Math.sin(time * 4 + i) * .08;
          echo.rotation.z = Math.sin(time * 2 + i) * .08;
        });
      } else if (phase === 'collapse') {
        const direction = winner === 0 ? -1 : 1;
        if (!reducedMotion) {
          const eased = 1 - Math.pow(1 - progress, 3);
          percy.root.position.x = direction * 2.42 * (1 - eased);
          percy.root.position.y = .27 + Math.sin(progress * Math.PI) * .8;
          percy.root.position.z = -.5 + eased * .72;
          percy.root.rotation.z = direction * (1 - eased) * -1.7 + Math.sin(progress * Math.PI * 3) * .12 * (1 - progress);
          percy.root.scale.setScalar(.35 + Math.min(1, progress * 3) * .65);
        }
        percy.parchment.visible = progress > .72;
        percy.arms[1].rotation.z = .13 + Math.max(0, (progress - .65) / .35) * .82;
      } else {
        percy.root.position.y += Math.sin(time * 1.5) * .017;
      }
      portals.forEach((portal, i) => {
        const losing = (done || phase === 'collapse') && winner !== i;
        portal.shader.uniforms.time.value = time;
        portal.shader.uniforms.energy.value = losing ? .12 : waiting ? 1 : .6;
        portal.lamp.intensity = losing ? 3 : waiting ? 15 : 10;
        portal.light.emissiveIntensity = losing ? .6 : 2.8;
      });
      dust.rotation.y = time * .025;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(render);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', loseContext);
      const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
      scene.traverse(object => {
        if (object instanceof T.Mesh || object instanceof T.Points) {
          geometries.add(object.geometry);
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(surface => materials.add(surface));
        }
      });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(surface => surface.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  return <div className="sp-scene" ref={container} role="img" aria-label="Percy, a wide-eyed possum in a ragged lab coat, stands between blue and red portals.">
    {failed && <div className="sp-scene-fallback" dir="ltr"><div className="sp-flat-portal">A</div><div className="sp-flat-percy" aria-hidden="true">Ψ<small dir="auto">PERCY’S LAB</small></div><div className="sp-flat-portal">B</div><p dir="auto">The little lab is in low-power mode. Your portals still work.</p></div>}
  </div>;
}
