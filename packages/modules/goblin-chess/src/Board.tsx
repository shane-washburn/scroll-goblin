import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Color, Square } from 'chess.js';
import { glyphs, names, otherFaction, type Faction, type Piece } from './game';

type Props = { checkedKings: string[]; lastMove?: { from?: string; to?: string }; pieces: Piece[]; player: Color; faction: Faction; selected: string | null; targets: string[]; onSquare: (s: Square) => void; disabled: boolean };
const mat = (color: string, metalness = 0) => new T.MeshStandardMaterial({ color, roughness: .73, metalness });
const palette = { wood: mat('#59432f'), gold: mat('#d9af58', .55), green: mat('#83a55b'), cloth: mat('#404c37'), brown: mat('#84634d'), dark: mat('#282523'), ivory: mat('#e7d9b0'), eye: mat('#100e0b'), glow: new T.MeshStandardMaterial({ color: '#acf970', emissive: '#61ab3b', emissiveIntensity: 1.2 }) };
// Faction colors are independent of randomized white/black allegiance.
const checkGlow = new T.MeshStandardMaterial({ color: '#ff3535', emissive: '#ff1010', emissiveIntensity: 2 });
const factionPalettes = {
  goblins: { ...palette, green: mat('#32c99d'), cloth: mat('#7245c5'), brown: mat('#777897'), dark: mat('#48246e'), gold: mat('#b4dce4', .5), accent: mat('#25ddbe', .35), glow: new T.MeshStandardMaterial({ color: '#de9bff', emissive: '#a943ef', emissiveIntensity: 1.2 }) },
  hedgelings: { ...palette, green: mat('#dfa544'), cloth: mat('#bc412c'), brown: mat('#d7904e'), dark: mat('#71341e'), ivory: mat('#fff0cf'), accent: mat('#ffb34c', .35), glow: new T.MeshStandardMaterial({ color: '#ffdc81', emissive: '#e99824', emissiveIntensity: 1.2 }) },
};
function mesh(g: T.BufferGeometry, m: T.Material, parent: T.Object3D, x = 0, y = 0, z = 0) {
  const o = new T.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}
function sphere(parent: T.Object3D, m: T.Material, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) {
  const o = mesh(new T.SphereGeometry(1, 12, 10), m, parent, x, y, z); o.scale.set(sx, sy, sz); return o;
}
function cylinder(parent: T.Object3D, m: T.Material, r1: number, r2: number, h: number, x: number, y: number, z: number) {
  return mesh(new T.CylinderGeometry(r1, r2, h, 16), m, parent, x, y, z);
}
// A swept quill mantle leaves the face and belly bare, like a hedgehog.
function quillMantle(parent: T.Object3D, y: number, rx: number, ry: number, rz: number) {
  const p = factionPalettes.hedgelings;
  sphere(parent, p.dark, 0, y, -.045, rx, ry, rz);
  for (let row = 0; row < 6; row++) {
    const latitude = -.65 + row * .36;
    for (let i = 0; i < 13; i++) {
      const angle = Math.PI + (i + (row % 2) * .4) / 13 * Math.PI;
      const x = Math.cos(angle) * Math.cos(latitude), z = Math.sin(angle) * Math.cos(latitude);
      const direction = new T.Vector3(x * .7, Math.sin(latitude) * .7 + .25, z - .35).normalize();
      const spine = mesh(new T.ConeGeometry(.026, .15, 5), (i + row) % 3 ? p.brown : p.ivory,
        parent, x * rx, y + Math.sin(latitude) * ry, -.045 + z * rz);
      spine.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction);
    }
  }
}
function hedgehogFace(parent: T.Object3D, y: number, small = false) {
  const p = factionPalettes.hedgelings, face = new T.Group();
  parent.add(face); face.position.set(0, y, .075); if (small) face.scale.setScalar(.78);
  sphere(face, p.ivory, 0, 0, .045, .17, .145, .16);
  // Broad cheeks taper continuously to a tiny nose, rather than a round muzzle.
  const snout = mesh(new T.CylinderGeometry(.025, .115, .23, 12), p.ivory, face, 0, -.045, .22);
  snout.rotation.x = Math.PI / 2 + .15;
  sphere(face, p.eye, 0, -.062, .335, .029, .023, .025);
  for (const side of [-1, 1]) {
    sphere(face, p.brown, side * .145, .106, -.015, .043, .049, .025);
    sphere(face, p.ivory, side * .145, .11, .006, .024, .03, .009);
    sphere(face, p.eye, side * .106, .025, .168, .026, .029, .021);
    sphere(face, p.ivory, side * .101, .035, .185, .008);
  }
}
/** Small sculpted miniatures, generated locally; no image-to-3D claim or remote assets. */
function miniature(piece: Piece, faction: Faction): T.Group {
  const g = new T.Group(), hedgehog = faction === 'hedgelings', p = factionPalettes[faction];
  const size = { p: [1, 1], r: [1.06, 1.18], n: [1.06, 1.12], b: [1.06, 1.18], q: [1.10, 1.34], k: [1.12, 1.43] }[piece.type];
  g.scale.set(size[0], size[1], size[0]);
  cylinder(g, p.wood, .34, .36, .10, 0, .06, 0);
  cylinder(g, piece.color === 'w' ? palette.ivory : palette.dark, .31, .33, .06, 0, .14, 0);
  cylinder(g, p.accent, .33, .33, .045, 0, .18, 0);
  if (hedgehog && piece.type === 'p') {
    quillMantle(g, .43, .27, .24, .25);
    hedgehogFace(g, .36, true);
    for (const side of [-1, 1]) sphere(g, p.ivory, side * .15, .245, .13, .055, .035, .075);
    return g;
  }
  if (piece.type === 'r') {
    if (hedgehog) {
      cylinder(g, p.brown, .23, .29, .55, 0, .46, 0);
      cylinder(g, p.dark, .15, .15, .015, 0, .745, 0);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; mesh(new T.BoxGeometry(.13, .17, .12), p.brown, g, Math.cos(a) * .22, .78, Math.sin(a) * .22); sphere(g, p.green, Math.cos(a) * .24, .22, Math.sin(a) * .24, .09, .04); }
    } else {
      for (let i = 0; i < 5; i++) {
        const book = new T.Group(); book.position.y = .25 + i * .12; book.rotation.y = i * .4; g.add(book);
        mesh(new T.BoxGeometry(.47, .1, .35), i % 2 ? p.cloth : p.brown, book);
        mesh(new T.BoxGeometry(.4, .055, .356), p.ivory, book);
        mesh(new T.BoxGeometry(.035, .105, .36), p.gold, book, -.12);
      }
      sphere(g, p.glow, 0, .87, 0, .065);
    }
  } else {
    let lift = 0;
    if (piece.type === 'n') {
      sphere(g, hedgehog ? p.green : p.brown, 0, .40, 0, .25, .18, .32);
      sphere(g, hedgehog ? p.green : p.brown, 0, .53, .25, .20, .17, .19);
      for (const side of [-1, 1]) {
        sphere(g, p.eye, side * .12, .58, .38, .025);
        sphere(g, hedgehog ? p.green : p.brown, side * .21, .27, -.17, .09, .1, .17);
        if (!hedgehog) mesh(new T.ConeGeometry(.07, .18, 5), p.brown, g, side * .13, .74, .24);
      }
      lift = .29;
    }
    const pawn = piece.type === 'p', scale = pawn ? .8 : 1;
    const body = new T.Group(); body.position.y = lift; body.scale.setScalar(scale); g.add(body);
    sphere(body, p.cloth, 0, .44, 0, .2, .25, .16);
    if (hedgehog) {
      quillMantle(body, .65, .225, .30, .19);
      hedgehogFace(body, .77);
    } else {
      sphere(body, p.green, 0, .77, .025, .23, .21, .19);
      for (const side of [-1, 1]) {
        const ear = mesh(new T.ConeGeometry(.105, .31, 4), p.green, body, side * .25, .79, 0); ear.rotation.z = -side * 1.05;
        sphere(body, p.brown, side * .09, .91, -.04, .13, .065, .12);
      }
      sphere(body, p.green, 0, .74, .21, .055, .065, .07);
    }
    for (const side of [-1, 1]) {
      if (!hedgehog) {
        sphere(body, p.ivory, side * .087, .8, .188, .058, .066, .023);
        sphere(body, p.eye, side * .087, .8, .21, .028, .039, .014);
      }
      sphere(body, hedgehog ? p.brown : p.green, side * .22, .49, .04, .065, .13, .06);
      sphere(body, p.brown, side * .09, .23, .1, .09, .065, .13);
    }
    if (piece.type === 'k') {
      cylinder(body, p.gold, .21, .19, .09, 0, .975, .02);
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; mesh(new T.ConeGeometry(.04, .17, 4), p.gold, body, Math.cos(a) * .18, 1.065, .02 + Math.sin(a) * .18); }
      cylinder(body, p.brown, .022, .028, .75, -.27, .58, .1);
      sphere(body, hedgehog ? p.green : p.ivory, -.27, 1.01, .1, .065);
    } else if (piece.type === 'q') {
      mesh(new T.ConeGeometry(.29, .57, 16), hedgehog ? p.cloth : p.dark, body, 0, .4, 0);
      if (hedgehog) {
        sphere(body, p.brown, 0, .49, .25, .18, .11, .13);
        for (let i = 0; i < 5; i++) sphere(body, i % 2 ? p.glow : p.gold, (i - 2) * .055, .57, .27, .04);
      } else {
        for (let i = 0; i < 3; i++) {
          const ring = mesh(new T.TorusGeometry(.15 + i * .035, .012, 5, 24), p.glow, body, .20, .65 + i * .04, .07); ring.rotation.x = .5; ring.rotation.y = .4;
        }
      }
      cylinder(body, p.gold, .16, .18, .055, 0, .98, 0);
      for (const x of [-.12, 0, .12]) {
        mesh(new T.ConeGeometry(.04, x === 0 ? .21 : .13, 4), p.gold, body, x, 1.055, .02);
      }
      sphere(body, p.glow, 0, 1.17, .02, .047, .065, .047);
    } else if (piece.type === 'b') {
      if (hedgehog) {
        cylinder(body, p.brown, .02, .02, .55, .25, .54, .15);
        sphere(body, p.gold, .25, .82, .15, .12, .19, .12);
        sphere(body, p.brown, .25, .69, .15, .13, .075, .13);
      } else {
        sphere(body, p.glow, .25, .53, .15, .105, .13, .105);
        cylinder(body, p.gold, .04, .05, .13, .25, .68, .15);
      }
    } else if (piece.type === 'p' && !hedgehog) {
      const scroll = cylinder(body, p.ivory, .065, .065, .43, .23, .56, .14); scroll.rotation.z = -.2;
      sphere(body, p.gold, .23, .55, .21, .04, .04, .015);
    }
  }
  return g;
}
function disposeObjects(root: T.Object3D) { root.traverse(o => { if (o instanceof T.Mesh) {
    o.geometry.dispose();
    if (o.userData.checkMaterial) (o.material as T.Material).dispose();
  } }); }
export default function Board(props: Props) {
  const host = useRef<HTMLDivElement>(null), latest = useRef(props); latest.current = props;
  const state = useRef<{ scene: T.Scene; pieces: T.Group; squares: T.Mesh[]; camera: T.PerspectiveCamera; controls: OrbitControls; render: () => void }>();
  const [flat, setFlat] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => {
    if (flat || !host.current) return;
    const el = host.current;
    let renderer: T.WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor('#171e19', 1); el.appendChild(renderer.domElement);
    const scene = new T.Scene(), camera = new T.PerspectiveCamera(38, 1, .1, 80);
    camera.position.set(0, 11, props.player === 'w' ? 10 : -10);
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 0, 0); controls.minDistance = 9; controls.maxDistance = 22; controls.maxPolarAngle = Math.PI * .40; controls.enablePan = false; controls.update();
    scene.add(new T.HemisphereLight('#fff2d5', '#435c48', 2.5));
    const sun = new T.DirectionalLight('#ffe1a3', 3.5); sun.position.set(-3, 10, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = sun.shadow.camera.bottom = -6; sun.shadow.camera.right = sun.shadow.camera.top = 6; scene.add(sun);
    mesh(new T.BoxGeometry(8.7, .35, 8.7), palette.wood, scene, 0, -.25, 0);
    const squares: T.Mesh[] = [];
    for (let rank = 0; rank < 8; rank++) for (let file = 0; file < 8; file++) {
      const tile = mesh(new T.BoxGeometry(.98, .1, .98), mat((rank + file) % 2 ? '#d5c49b' : '#536347'), scene, file - 3.5, -.045, 3.5 - rank);
      tile.userData.square = `${String.fromCharCode(97 + file)}${rank + 1}`; tile.userData.light = (rank + file) % 2; squares.push(tile);
    }
    const pieces = new T.Group(); scene.add(pieces);
    const render = () => renderer.render(scene, camera);
    state.current = { scene, camera, controls, squares, pieces, render };
    const sync = () => {
      const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.position.setLength(Math.max(14.8, 5.1 / (Math.tan(19 * Math.PI / 180) * camera.aspect))); camera.updateProjectionMatrix(); controls.update(); render();
    };
    const ro = new ResizeObserver(sync); ro.observe(el); sync();
    const visibility = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) render(); }); visibility.observe(el); controls.addEventListener('change', render);
    let down = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e: PointerEvent) => {
      if (latest.current.disabled || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
      const rect = el.getBoundingClientRect(); const ray = new T.Raycaster();
      ray.setFromCamera(new T.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, 1 - (e.clientY - rect.top) / rect.height * 2), camera);
      const hits = ray.intersectObjects([...pieces.children, ...squares], true);
      for (const hit of hits) { let o: T.Object3D | null = hit.object; while (o && !o.userData.square) o = o.parent; if (o?.userData.square) { latest.current.onSquare(o.userData.square); break; } }
    };
    renderer.domElement.addEventListener('pointerdown', onDown); renderer.domElement.addEventListener('pointerup', onUp);
    return () => {
      ro.disconnect(); visibility.disconnect(); controls.dispose(); disposeObjects(scene); squares.forEach(s => (s.material as T.Material).dispose()); renderer.dispose(); renderer.domElement.remove(); state.current = undefined;
    };
  }, [flat, props.player]);
  useEffect(() => {
    const s = state.current; if (!s) return;
    disposeObjects(s.pieces); s.pieces.clear();
    for (const piece of props.pieces) {
      const g = miniature(piece, piece.color === props.player ? props.faction : otherFaction(props.faction));
      g.position.set(piece.square.charCodeAt(0) - 100.5, 0, 4.5 - Number(piece.square[1]));
      g.rotation.y = piece.color === props.player ? (props.player === 'w' ? Math.PI : 0) : (props.player === 'w' ? 0 : Math.PI);
      if (props.checkedKings.includes(piece.square)) {
        g.traverse(o => {
          if (o instanceof T.Mesh && o.material instanceof T.MeshStandardMaterial) {
            o.material = o.material.clone();
            o.material.emissive.set('#ff1515'); o.material.emissiveIntensity = .65;
            o.userData.checkMaterial = true;
          }
        });
        const halo = mesh(new T.TorusGeometry(.39, .04, 8, 40), checkGlow, g, 0, .21, 0);
        halo.rotation.x = Math.PI / 2;
      } else if (piece.square === props.lastMove?.to) {
        const ring = mesh(new T.TorusGeometry(.38, .025, 6, 32), palette.gold, g, 0, .205, 0);
        ring.rotation.x = Math.PI / 2;
      }
      g.userData.square = piece.square; s.pieces.add(g);
    }
    for (const tile of s.squares) {
      const material = tile.material as T.MeshStandardMaterial;
      material.color.set(props.checkedKings.includes(tile.userData.square) ? '#d4574b' : tile.userData.square === props.selected ? '#dcba59' : props.targets.includes(tile.userData.square) ? '#92b487' : tile.userData.square === props.lastMove?.to ? '#e9b653' : tile.userData.square === props.lastMove?.from ? '#c7a976' : tile.userData.light ? '#d5c49b' : '#536347');
      material.emissive.set(props.checkedKings.includes(tile.userData.square) ? '#731818' : tile.userData.square === props.selected ? '#493c0c' : tile.userData.square === props.lastMove?.to ? '#46300b' : '#000000');
    }
    s.render();
  }, [props.pieces, props.player, props.faction, props.selected, props.targets, props.lastMove, props.checkedKings, flat]);
  const squares = Array.from({ length: 64 }, (_, i) => `${String.fromCharCode(97 + (props.player === 'w' ? i % 8 : 7 - i % 8))}${props.player === 'w' ? 8 - Math.floor(i / 8) : 1 + Math.floor(i / 8)}` as Square);
  return <div className="gc-board-wrap">
    <div className="gc-board-bar"><span>THE WOODLAND TABLE</span><button onClick={() => setFlat(!flat)}>{flat ? '3D miniatures' : '2D / keyboard board'}</button></div>
    {!flat && !failed ? <div ref={host} className="gc-canvas" aria-label="Interactive 3D chessboard. Switch to 2D for keyboard controls." /> : <div className="gc-flat" role="group" aria-label="Chessboard">
      {squares.map(square => { const p = props.pieces.find(p => p.square === square); return <button key={square} disabled={props.disabled} onClick={() => props.onSquare(square)} className={`${(square.charCodeAt(0) + Number(square[1])) % 2 ? 'light' : 'dark'} ${props.selected === square ? 'selected' : ''} ${props.targets.includes(square) ? 'target' : ''} ${props.lastMove?.from === square ? 'last-from' : ''} ${props.lastMove?.to === square ? 'last-to' : ''} ${props.checkedKings.includes(square) ? 'in-check' : ''}`}  aria-label={`${square}${props.checkedKings.includes(square) ? ' king in check' : ''}${props.lastMove?.to === square ? ' opponent moved here' : props.lastMove?.from === square ? ' opponent moved from here' : ''}${p ? ` ${p.color === 'w' ? 'White' : 'Black'} ${names[p.color === props.player ? props.faction : otherFaction(props.faction)][p.type]}` : ' empty'}`}><small>{square}</small><span className={p?.color === 'w' ? 'white-piece' : 'black-piece'}>{p ? glyphs[p.type] : props.targets.includes(square) ? '·' : ''}</span></button>; })}
    </div>}
    <div className="gc-board-foot"><span>{flat || failed ? 'Select a piece, then its destination.' : 'Tap to move · Drag to orbit · Pinch to zoom'}</span><span>{props.player === 'w' ? 'WHITE AT HOME' : 'BLACK AT HOME'}</span></div>
  </div>;
}
