import * as T from 'three';

export const material = (color: string, roughness = .75, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
export function mesh(parent: T.Object3D, geometry: T.BufferGeometry, surface: T.Material,
  x = 0, y = 0, z = 0) {
  const object = new T.Mesh(geometry, surface);
  object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true;
  parent.add(object); return object;
}
export function ellipsoid(parent: T.Object3D, surface: T.Material, x: number, y: number, z: number,
  sx: number, sy = sx, sz = sx) {
  const object = mesh(parent, new T.SphereGeometry(1, 24, 18), surface, x, y, z);
  object.scale.set(sx, sy, sz); return object;
}
export function tube(parent: T.Object3D, points: number[][], radius: number, surface: T.Material) {
  const curve = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point as [number, number, number])));
  return mesh(parent, new T.TubeGeometry(curve, 32, radius, 8, false), surface);
}

function coatPanel(parent: T.Object3D, side: number, surface: T.Material) {
  const shape = new T.Shape();
  shape.moveTo(.13, 1.62); shape.lineTo(.46, 1.55); shape.lineTo(.50, .45);
  shape.lineTo(.40, .40); shape.lineTo(.35, .47); shape.lineTo(.28, .37);
  shape.lineTo(.22, .44); shape.lineTo(.14, .40); shape.lineTo(.08, .46); shape.lineTo(.11, 1.08);
  shape.closePath();
  const panel = mesh(parent, new T.ExtrudeGeometry(shape, { depth: .06, bevelEnabled: true,
    bevelSegments: 2, steps: 1, bevelSize: .025, bevelThickness: .025 }), surface, 0, 0, .28);
  panel.scale.x = side;
  const lapel = new T.Shape(); lapel.moveTo(.13, 1.65); lapel.lineTo(.37, 1.48);
  lapel.lineTo(.23, 1.36); lapel.lineTo(.3, 1.25); lapel.lineTo(.1, 1.13); lapel.closePath();
  const collar = mesh(parent, new T.ExtrudeGeometry(lapel, { depth: .025, bevelEnabled: false }), surface, 0, 0, .37);
  collar.scale.x = side;
}

/** Sculpted in code from Percy's reference: pale pointed face, lab coat, H charm. */
export function createPercy() {
  const root = new T.Group();
  const fur = material('#777983'), darkFur = material('#414451'), cream = material('#eee5d6');
  const pink = material('#dc9aa2', .62), innerEar = material('#c48291');
  const nose = material('#ed9aa9', .28), black = material('#231c2a', .38);
  const white = material('#fff6e4', .38), coat = material('#d9e7e5');
  const seam = material('#9dafb9'), gold = material('#bb8c53', .4, .6);
  const glow = new T.MeshStandardMaterial({ color: '#8ef5ff', emissive: '#3ee7ff', emissiveIntensity: 1.7 });

  // Short, sturdy body and pink splayed toes.
  ellipsoid(root, darkFur, 0, .91, 0, .49, .70, .34);
  ellipsoid(root, fur, 0, 1.12, .06, .44, .61, .34);
  ellipsoid(root, cream, 0, .99, .26, .28, .47, .13);
  for (const side of [-1, 1]) {
    ellipsoid(root, darkFur, side * .23, .31, .02, .18, .29, .19);
    ellipsoid(root, pink, side * .24, .12, .20, .21, .075, .19);
    for (let i = 0; i < 3; i++) {
      const toe = ellipsoid(root, pink, side * .24 + (i - 1) * .09, .105, .36, .044, .04, .12);
      toe.rotation.y = (i - 1) * -.22;
      ellipsoid(root, cream, side * .24 + (i - 1) * .09, .108, .464, .022, .018, .035);
    }
  }

  const tail = new T.Group(); root.add(tail); tail.position.set(.26, .29, -.23);
  tube(tail, [[0, 0, 0], [.62, -.12, -.28], [1.05, .01, -.24], [1.2, .35, -.12], [1.05, .64, .04], [.89, .60, .09]], .075, pink);
  for (let i = 0; i < 5; i++) {
    const ring = mesh(tail, new T.TorusGeometry(.075, .004, 5, 12), innerEar, .35 + i * .095, -.1 + i * .003, -.23 - i * .008);
    ring.rotation.y = Math.PI / 2;
  }

  // Open coat, ragged front panels, pocket, tiny buttons and raised lapels.
  mesh(root, new T.CylinderGeometry(.40, .50, 1.1, 24, 1, true, .65, Math.PI * 2 - 1.3), coat, 0, 1.02, -.02);
  coatPanel(root, -1, coat); coatPanel(root, 1, coat);
  for (let i = 0; i < 3; i++) ellipsoid(root, seam, -.18, .64 + i * .20, .375, .036, .036, .013);
  const pocket = mesh(root, new T.BoxGeometry(.18, .2, .035), coat, .34, .77, .367);
  pocket.rotation.z = -.08;
  tube(root, [[.255, .86, .39], [.33, .85, .4], [.415, .85, .39]], .006, seam);
  mesh(root, new T.BoxGeometry(.13, .12, .025), white, .31, 1.31, .40);
  mesh(root, new T.BoxGeometry(.07, .014, .027), darkFur, .31, 1.32, .42);
  mesh(root, new T.BoxGeometry(.09, .01, .027), darkFur, .31, 1.28, .42);

  const arms: T.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group(); root.add(arm); arm.position.set(side * .44, 1.45, .02);
    arm.rotation.z = side * .13;
    ellipsoid(arm, coat, side * .075, -.20, 0, .17, .30, .18);
    mesh(arm, new T.CylinderGeometry(.14, .15, .15, 10), coat, side * .08, -.43, .02);
    ellipsoid(arm, darkFur, side * .08, -.54, .03, .105, .16, .10);
    ellipsoid(arm, pink, side * .07, -.65, .07, .097, .10, .08);
    for (let i = 0; i < 3; i++) {
      ellipsoid(arm, pink, side * .07 + (i - 1) * .045, -.73, .09, .025, .09, .028);
    }
    ellipsoid(arm, pink, side * -.025, -.63, .11, .03, .07, .033);
    arms.push(arm);
  }

  const head = new T.Group(); head.position.y = 1.94; root.add(head);
  ellipsoid(head, fur, 0, .12, -.01, .53, .54, .40);
  ellipsoid(head, cream, 0, .08, .15, .48, .46, .34);
  const ears: T.Group[] = [];
  for (const side of [-1, 1]) {
    const ear = new T.Group(); ear.position.set(side * .43, .56, -.03); ear.rotation.z = -side * .25; head.add(ear);
    ellipsoid(ear, darkFur, 0, 0, 0, .21, .31, .10);
    ellipsoid(ear, innerEar, 0, .025, .075, .155, .23, .037);
    ellipsoid(ear, pink, side * .025, .11, .09, .12, .12, .014);
    ears.push(ear);
  }
  const eyes: T.Mesh[] = [];
  for (const side of [-1, 1]) {
    ellipsoid(head, darkFur, side * .252, .17, .40, .225, .255, .095);
    const eye = ellipsoid(head, white, side * .252, .18, .46, .167, .20, .095); eyes.push(eye);
    ellipsoid(head, material('#65434a', .35), side * .244, .175, .542, .115, .133, .032);
    ellipsoid(head, black, side * .234, .18, .562, .075, .096, .028);
    ellipsoid(head, white, side * .225 - .025, .23, .587, .030, .037, .010);
    ellipsoid(head, white, side * .225 + .033, .15, .586, .012, .014, .008);
    const brow = tube(head, [[side * .10, .405, .36], [side * .25, .465, .40], [side * .40, .405, .32]], .035, fur);
    brow.rotation.z = side * -.035;
  }

  // Long tapered snout, little grin and teeth; these keep the silhouette possum-like.
  ellipsoid(head, cream, 0, -.13, .36, .28, .235, .37);
  const muzzle = mesh(head, new T.CylinderGeometry(.115, .25, .45, 24), cream, 0, -.15, .62);
  muzzle.rotation.x = Math.PI / 2 + .19;
  ellipsoid(head, black, 0, -.29, .67, .16, .063, .08);
  ellipsoid(head, pink, 0, -.314, .724, .07, .018, .022);
  for (const side of [-1, 1]) {
    const tooth = mesh(head, new T.ConeGeometry(.026, .067, 8), white, side * .09, -.30, .727);
    tooth.rotation.z = Math.PI;
  }
  ellipsoid(head, nose, 0, -.15, .861, .139, .105, .10);
  for (const side of [-1, 1]) ellipsoid(head, innerEar, side * .065, -.164, .94, .025, .017, .015);
  ellipsoid(head, white, -.03, -.113, .947, .037, .016, .005);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      tube(head, [[side * .17, -.17 - i * .045, .64], [side * .41, -.1 - i * .065, .63],
        [side * (.66 + i * .04), .04 - i * .115, .52]], .005, cream);
    }
    for (let i = 0; i < 4; i++) {
      const tuft = mesh(head, new T.ConeGeometry(.065, .19, 5), i % 2 ? cream : fur,
        side * (.39 + i * .018), -.04 - i * .075, .17);
      tuft.rotation.z = side * -1.1;
    }
  }
  for (let i = 0; i < 7; i++) {
    const tuft = mesh(head, new T.ConeGeometry(.055, .20, 5), i % 2 ? cream : fur, (i - 3) * .07, .59, -.02);
    tuft.rotation.z = (i - 3) * -.13;
  }

  tube(root, [[-.23, 1.59, .3], [-.16, 1.33, .39], [0, 1.26, .43], [.16, 1.33, .39], [.23, 1.59, .3]], .012, gold);
  mesh(root, new T.BoxGeometry(.21, .22, .06), seam, 0, 1.25, .46);
  mesh(root, new T.BoxGeometry(.18, .19, .062), material('#153e69', .4), 0, 1.25, .466);
  mesh(root, new T.BoxGeometry(.017, .125, .012), glow, -.047, 1.25, .51);
  mesh(root, new T.BoxGeometry(.017, .125, .012), glow, .047, 1.25, .51);
  mesh(root, new T.BoxGeometry(.095, .018, .012), glow, 0, 1.25, .51);

  const parchment = new T.Group(); parchment.position.set(.68, 1.21, .59); parchment.rotation.z = -.10; root.add(parchment);
  const paperShape = new T.Shape(); paperShape.moveTo(-.25, -.32);
  for (let i = 0; i < 8; i++) paperShape.lineTo(-.25 + i * .075, -.32 + (i % 2 ? .035 : -.01));
  paperShape.lineTo(.29, .30); paperShape.lineTo(.19, .26); paperShape.lineTo(.16, .32);
  paperShape.lineTo(.07, .28); paperShape.lineTo(-.04, .33); paperShape.lineTo(-.12, .28); paperShape.lineTo(-.25, .31); paperShape.closePath();
  mesh(parchment, new T.ExtrudeGeometry(paperShape, { depth: .016, bevelEnabled: false }), material('#ead2a0'));
  for (let i = 0; i < 5; i++) mesh(parchment, new T.BoxGeometry(.29 - (i % 3) * .045, .012, .01), seam, 0, .15 - i * .07, .025);
  parchment.visible = false;
  return { root, head, tail, ears, eyes, arms, parchment };
}
