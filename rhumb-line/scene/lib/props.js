/* Things on the table: the brass compass (hinged lid that springs open, turnable bezel), cup and saucer with coffee
   and steam, a pencil, brass dividers, roasted beans, the six-compartment sample box (a sack drops into its origin's
   compartment when that origin is found; the box glows at landfall), the ship's log (its cover opens), the crew-list
   slip (lifts towards the viewer) and the letter (wax seal, the flap opens and the card rises). The chart sheets are in
   sheet.js; nothing here rests on them. Each object with a movement exposes a setter taking 0 (closed) .. 1 (open). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { lathe, boxUV, smooth, rng, TAU, clamp } from './util.js';
import { LAYOUT } from './layout.js';
import { solid } from './cabin.js';
import { createCoffee, createSteam } from './coffee.js';

const rbox = (w, h, d, r, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);

export const CUP_PROFILE = [
  [0, 0.0025], [0.021, 0.0], [0.026, 0.0, 0.0015], [0.027, 0.0042, 0.0012], [0.030, 0.0085, 0.006], [0.040, 0.030, 0.02], [0.0438, 0.057, 0.01], [0.0443, 0.0635, 0.0015], [0.0406, 0.0637, 0.0015], [0.0398, 0.057, 0.008], [0.036, 0.030, 0.016], [0.024, 0.0118, 0.008], [0, 0.0098]
];

export function shadowDecal(tex, w, d, opacity) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: tex, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  m.name = 'contactShadow';
  return m;
}

/* Brass compass standing on the table. The bezel (with a marker index) turns: bezel.rotation.y = -deg. */
export function buildCompass(M) {
  const g = new THREE.Group(); g.name = 'compass';
  g.position.set(LAYOUT.compass.x, 0, LAYOUT.compass.z);
  const bowl = solid(new THREE.Mesh(lathe([
    [0, 0], [0.050, 0], [0.054, 0.003, 0.002], [0.056, 0.026, 0.006], [0.0585, 0.033, 0.002], [0.056, 0.037, 0.0015], [0.0505, 0.036, 0.001], [0.0495, 0.024, 0.002], [0, 0.023]
  ], 96, 5), M.brass));
  g.add(bowl);
  const bezel = new THREE.Group(); bezel.name = 'bezel';
  const ring = solid(new THREE.Mesh(lathe([[0.0555, 0.0255], [0.0602, 0.0262, 0.0015], [0.0602, 0.0318, 0.0015], [0.0555, 0.0326]], 128, 3), M.brassKnurl));
  bezel.add(ring);
  // index: a small marker wedge on the bezel's top face, pointing at the set course
  const wedge = new THREE.Shape(); wedge.moveTo(0, 0.0036); wedge.lineTo(0.0024, -0.0022); wedge.lineTo(-0.0024, -0.0022); wedge.closePath();
  const idxGeo = new THREE.ExtrudeGeometry(wedge, { depth: 0.0008, bevelEnabled: false });
  idxGeo.rotateX(-Math.PI / 2);
  const index = solid(new THREE.Mesh(idxGeo, M.marker), false, true);
  index.position.set(0, 0.0323, -0.0579);
  bezel.add(index);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU, long = i % 9 === 0;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.0006, 0.0003, long ? 0.0034 : 0.0018), M.brassDark);
    tick.position.set(Math.sin(a) * 0.0579, 0.0328, -Math.cos(a) * 0.0579);
    tick.rotation.y = -a;
    if (i) bezel.add(tick);
  }
  g.add(bezel);
  const card = new THREE.Mesh(new THREE.CircleGeometry(0.047, 96), M.card);
  card.rotation.x = -Math.PI / 2;
  const cardPivot = new THREE.Group(); cardPivot.position.y = 0.0262; cardPivot.add(card);
  card.receiveShadow = true;
  g.add(cardPivot);
  const lubber = solid(new THREE.Mesh(rbox(0.0016, 0.004, 0.006, 0.0006, 2), M.marker), false, true);
  lubber.position.set(0, 0.029, -0.046);
  g.add(lubber);
  const R = 0.23, cap = 0.0062;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 12, 0, TAU, 0, Math.asin(0.0515 / R)), M.domeGlass);
  dome.position.y = 0.0336 + cap - R;
  dome.name = 'domeGlass';
  g.add(dome);
  const rim = solid(new THREE.Mesh(new THREE.TorusGeometry(0.0525, 0.0022, 10, 96), M.brassPolished), true, false);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.0345;
  g.add(rim);
  // hinged brass lid: closed over the glass on the desk, springs open (about 110 degrees) when the compass is opened
  const lidHinge = new THREE.Group(); lidHinge.name = 'lid';
  lidHinge.position.set(0, 0.0386, -0.0602);
  // Two shells with flat (top-down) UVs into one engraved-brass atlas (canvas-tex lidTextures): the outside reads the left
  // half (rose and degree ring, north towards the hinge), the inside the right half (the harbour's name and position,
  // upright once the lid stands open).
  const RL = 0.0602;
  const planarUV = (geo, cu, zSign) => {
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, cu + (p.getX(i) / RL) * 0.234, 0.5 + ((zSign * p.getZ(i)) / RL) * 0.469);
    uv.needsUpdate = true;
    return geo;
  };
  // Profile order sets which way the faces point (a lathe's normal is (dy, -dx) along the profile): the outside runs
  // from the lip in to the axis so it faces up and out, the inside from the axis out so it faces down (into the bowl).
  const lidOuter = solid(new THREE.Mesh(planarUV(lathe([[0.0572, -0.0036], [0.0602, -0.0036, 0.001], [0.0598, 0.0012, 0.002], [0.046, 0.0066, 0.004], [0, 0.0078]], 96, 4), 0.25, -1), M.lidOuter || M.brassPolished));
  const lidInner = solid(new THREE.Mesh(planarUV(lathe([[0, 0.0032], [0.03, 0.0026, 0.003], [0.0562, -0.0004, 0.001], [0.0572, -0.0036]], 96, 4), 0.75, 1), M.lidInner || M.brassPolished));
  const lid = new THREE.Group();
  lid.add(lidOuter, lidInner);
  lid.position.set(0, 0, 0.0602);
  lidHinge.add(lid);
  const knuckle = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.024, 16), M.brassDark));
  knuckle.rotation.z = Math.PI / 2; knuckle.position.set(0, -0.001, -0.002);
  lidHinge.add(knuckle);
  const catchTab = solid(new THREE.Mesh(rbox(0.008, 0.004, 0.006, 0.0012, 2), M.brass));
  catchTab.position.set(0, -0.0016, 0.1216);
  lidHinge.add(catchTab);
  g.add(lidHinge);
  const setOpen = (k) => { lidHinge.rotation.x = -clamp(k, 0, 1) * 1.95; };
  return { group: g, cardPivot, bezel, lid: lidHinge, setOpen, radius: 0.0602, top: 0.046 };
}

export function buildCup(M) {
  const g = new THREE.Group(); g.name = 'cup';
  g.position.set(LAYOUT.cup.x, 0, LAYOUT.cup.z);
  const saucer = solid(new THREE.Mesh(lathe([
    [0, 0.0015], [0.030, 0.0], [0.034, 0.0, 0.001], [0.036, 0.003, 0.001], [0.068, 0.011, 0.012], [0.075, 0.0158, 0.003], [0.0735, 0.0178, 0.0012], [0.069, 0.0165, 0.004], [0.036, 0.0078, 0.02], [0, 0.0068]
  ], 128, 6), M.porcelain));
  g.add(saucer);
  const cupG = new THREE.Group(); cupG.position.y = 0.0068; cupG.rotation.y = -0.62; g.add(cupG);
  const cup = solid(new THREE.Mesh(lathe(CUP_PROFILE, 128, 6), M.cupPorcelain));
  cupG.add(cup);
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.039, 0.051, 0), new THREE.Vector3(0.055, 0.056, 0), new THREE.Vector3(0.066, 0.043, 0), new THREE.Vector3(0.060, 0.024, 0), new THREE.Vector3(0.036, 0.017, 0)
  ]);
  const hGeo = new THREE.TubeGeometry(handleCurve, 64, 0.0043, 14, false);
  hGeo.scale(1, 1, 0.72);
  cupG.add(solid(new THREE.Mesh(hGeo, M.porcelain)));
  const level = 0.0545;
  const innerR = 0.0398 + (0.036 - 0.0398) * ((0.057 - level) / (0.057 - 0.030)) - 0.0006;
  const coffee = createCoffee(innerR);
  coffee.mesh.position.y = level;
  cupG.add(coffee.mesh);
  const steam = createSteam(30);
  steam.mesh.position.y = level + 0.004;
  cupG.add(steam.mesh);
  return { group: g, cupGroup: cupG, coffee, steam, level };
}

/* Pencil lying on the table in front of the charts, resting on two of its six faces. */
export function buildPencil(M) {
  const g = new THREE.Group(); g.name = 'pencil';
  const P = LAYOUT.pencil;
  const r = 0.0041, len = 0.15;
  const hex = new THREE.Shape();
  for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; if (k === 0) hex.moveTo(Math.cos(a) * r, Math.sin(a) * r); else hex.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  hex.closePath();
  const body = new THREE.ExtrudeGeometry(hex, { depth: len, bevelEnabled: true, bevelThickness: 0.0004, bevelSize: 0.00045, bevelSegments: 2, curveSegments: 1 });
  body.translate(0, 0, -len / 2);
  g.add(solid(new THREE.Mesh(body, [M.pencilWood, M.pencilLacquer])));
  const toZ = (geo) => { geo.rotateX(Math.PI / 2); return geo; };
  const cone = solid(new THREE.Mesh(toZ(lathe([[0, 0], [0.0035, 0], [0.0012, 0.017, 0.0005], [0, 0.0175]], 24, 3)), M.pencilWood));
  cone.position.z = len / 2 + 0.0002; g.add(cone);
  const tip = solid(new THREE.Mesh(toZ(lathe([[0, 0], [0.00125, 0], [0.0003, 0.0052, 0.0002], [0, 0.0056]], 16, 2)), M.graphite));
  tip.position.z = len / 2 + 0.0168; g.add(tip);
  const ferrule = solid(new THREE.Mesh(toZ(lathe([[0, 0], [0.0045, 0], [0.0046, 0.002, 0.0004], [0.0044, 0.004], [0.0046, 0.006, 0.0004], [0.0044, 0.008], [0.0046, 0.010, 0.0004], [0.0045, 0.0125], [0, 0.0125]], 24, 2)), M.brassPolished));
  ferrule.rotation.y = Math.PI; ferrule.position.z = -len / 2 + 0.0035; g.add(ferrule);
  const eraser = solid(new THREE.Mesh(toZ(lathe([[0, 0], [0.0040, 0], [0.0040, 0.0055, 0.0018], [0, 0.0072]], 24, 4)), M.eraser));
  eraser.rotation.y = Math.PI; eraser.position.z = -len / 2 - 0.0088; g.add(eraser);
  // a flat face down: the hexagon's apothem plus the bevel
  g.position.set(P.x, r * Math.cos(Math.PI / 6) + 0.00045, P.z);
  g.rotation.set(0, P.yaw + Math.PI / 2, Math.PI / 6);
  return g;
}

function beanGeometry() {
  const g = new THREE.SphereGeometry(1, 22, 16);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let X = x * 0.0058, Y = y * 0.0036, Z = z * 0.0044;
    if (y < 0) {
      Y *= 0.42;
      const zc = 0.0009 * Math.sin(x * 2.4);
      const gz = (Z - zc) / 0.0007;
      Y += 0.0012 * Math.exp(-gz * gz) * (1 - x * x);
    }
    p.setXYZ(i, X, Y + 0.0016, Z);
  }
  g.computeVertexNormals();
  return g;
}

export function buildBeans(M) {
  const spots = [
    [0.262, -0.106, 0.4, 0], [0.284, -0.09, 2.1, 1], [0.246, -0.08, 1.2, 0], [0.13, 0.092, 0.7, 1], [0.152, 0.108, 2.6, 0],
    [0.36, 0.03, 1.9, 0], [0.68, -0.1, 0.3, 1], [-0.49, 0.15, 1.4, 0], [0.33, 0.052, 0.9, 1]
  ];
  const mesh = solid(new THREE.InstancedMesh(beanGeometry(), M.bean, spots.length), true, true);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  spots.forEach(([x, z, yaw, flip], i) => {
    e.set(flip ? Math.PI : 0, yaw, flip ? 0.25 : 0.08);
    q.setFromEuler(e);
    p.set(x, flip ? 0.0052 : 0.0, z);
    m4.compose(p, q, s);
    mesh.setMatrixAt(i, m4);
  });
  mesh.name = 'beans';
  return mesh;
}

function sackGeometry(seed) {
  const g = new THREE.SphereGeometry(1, 72, 56);
  const p = g.attributes.position, uv = g.attributes.uv, R = rng(seed);
  const ph = [R() * TAU, R() * TAU, R() * TAU];
  const keys = [[0, 0], [0.03, 0.025], [0.1, 0.034], [0.42, 0.037], [0.62, 0.030], [0.74, 0.0125], [0.80, 0.0115], [0.88, 0.019], [1.0, 0.025]];
  const radius = (t) => {
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i], k = (t - a[0]) / (b[0] - a[0]); const s = k * k * (3 - 2 * k); return a[1] + (b[1] - a[1]) * s; }
    return keys[keys.length - 1][1];
  };
  const H = 0.08;
  for (let i = 0; i < p.count; i++) {
    const t = uv.getY(i), ang = uv.getX(i) * TAU;
    let r = radius(t);
    let y = t < 0.03 ? (t / 0.03) * 0.0018 : 0.0018 + ((t - 0.03) / 0.97) * (H - 0.0018);
    if (t < 0.7) r += 0.0019 * Math.sin(ang * 3 + ph[0] + t * 9) * Math.sin(t * 10 + ph[1]) + 0.0012 * Math.sin(ang * 7 + ph[2]) * Math.sin(t * 22);
    const neck = smooth(0.5, 0.72, t) * (1 - smooth(0.74, 0.8, t));
    r += neck * 0.0022 * Math.sin(ang * 13 + ph[1]);
    if (t > 0.8) { const k = (t - 0.8) / 0.2; r += 0.0045 * Math.sin(ang * 9 + ph[0]) * k; y += 0.004 * Math.sin(ang * 7 + ph[2]) * k - 0.006 * k * k; }
    p.setXYZ(i, Math.cos(ang) * r, y, -Math.sin(ang) * r);
  }
  g.computeVertexNormals();
  const nor = g.attributes.normal, w = 72;
  for (let row = 0; row <= 56; row++) {
    const a = row * (w + 1), b = a + w;
    const nx = (nor.getX(a) + nor.getX(b)) / 2, ny = (nor.getY(a) + nor.getY(b)) / 2, nz = (nor.getZ(a) + nor.getZ(b)) / 2;
    nor.setXYZ(a, nx, ny, nz); nor.setXYZ(b, nx, ny, nz);
  }
  return g;
}

/* The sample box: six compartments in voyage order (front row first). setSlots(mask, dropIndex) shows a sack in every
   compartment whose mask entry is true; the one at dropIndex falls in with a small bounce, the others appear or go at
   once. setGlow(k) warms the box from inside at landfall. */
export function buildBox(M, T) {
  const g = new THREE.Group(); g.name = 'sampleBox';
  const B = LAYOUT.box;
  g.position.set(B.x, 0, B.z); g.rotation.y = B.yaw; g.scale.setScalar(B.scale || 1);
  const W = 0.30, D = 0.20, H = 0.052, wt = 0.012, fl = 0.008;
  const oak = (geo, axis) => solid(new THREE.Mesh(boxUV(geo, { size: [0.4, 0.4], axis }), M.oak));
  const floor = oak(rbox(W - 0.004, fl, D - 0.004, 0.002), 'x'); floor.position.y = fl / 2; g.add(floor);
  [D / 2 - wt / 2, -(D / 2 - wt / 2)].forEach((z) => { const m = oak(rbox(W, H, wt, 0.003), 'x'); m.position.set(0, H / 2, z); g.add(m); });
  [W / 2 - wt / 2, -(W / 2 - wt / 2)].forEach((x) => { const m = oak(rbox(wt, H, D - 2 * wt + 0.002, 0.003), 'z'); m.position.set(x, H / 2, 0); g.add(m); });
  const innerW = W - 2 * wt, innerD = D - 2 * wt, dt = 0.007, dh = H - 0.008;
  [-1, 1].forEach((k) => { const m = oak(rbox(dt, dh, innerD + 0.002, 0.002), 'z'); m.position.set((k * innerW) / 6, dh / 2 + 0.002, 0); g.add(m); });
  const mid = oak(rbox(innerW + 0.002, dh, dt, 0.002), 'x'); mid.position.set(0, dh / 2 + 0.002, 0); g.add(mid);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const c1 = solid(new THREE.Mesh(rbox(0.028, 0.02, 0.0024, 0.0008, 2), M.brass)); c1.position.set(sx * (W / 2 - 0.014), H - 0.01, sz * (D / 2 + 0.0012)); g.add(c1);
    const c2 = solid(new THREE.Mesh(rbox(0.0024, 0.02, 0.028, 0.0008, 2), M.brass)); c2.position.set(sx * (W / 2 + 0.0012), H - 0.01, sz * (D / 2 - 0.014)); g.add(c2);
  });
  const plate = solid(new THREE.Mesh(rbox(0.12, 0.024, 0.0016, 0.0007, 2), M.plate));
  plate.position.set(0, H * 0.5, D / 2 + 0.0009); g.add(plate);
  const shadow = shadowDecal(T.rectShadow, W * 1.45, D * 1.5, 0.55); shadow.position.set(0, 0.0005, 0.004); g.add(shadow);

  // warm glow from inside when the chest is full: sacks, tags and plate light up (emissive) under a soft halo
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: new THREE.Color(1.6, 0.9, 0.42), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glowSprite.scale.set(0.46, 0.3, 1); glowSprite.position.set(0, 0.03, 0); glowSprite.name = 'glow'; glowSprite.renderOrder = 8;
  g.add(glowSprite);

  const cellW = innerW / 3, cellD = innerD / 2;
  const cells = [[-cellW, cellD / 2], [0, cellD / 2], [cellW, cellD / 2], [-cellW, -cellD / 2], [0, -cellD / 2], [cellW, -cellD / 2]];
  const rots = [0.3, -0.5, 0.9, -0.2, 0.6, -0.8];
  const up = new THREE.Vector3(0, 1, 0);
  const slots = cells.map(([x, z], i) => {
    const slot = new THREE.Group(); slot.name = 'slot' + (i + 1);
    slot.position.set(x, fl, z);
    const body = new THREE.Group(); slot.add(body);
    const inner = new THREE.Group(); inner.rotation.y = rots[i]; body.add(inner);
    inner.add(solid(new THREE.Mesh(sackGeometry(11 + i * 12), M.burlap)));
    const tie = solid(new THREE.Mesh(new THREE.TorusGeometry(0.0128, 0.0019, 8, 48), M.twine));
    tie.rotation.x = Math.PI / 2 + 0.12; tie.position.y = 0.0604;
    const tie2 = tie.clone(); tie2.position.y = 0.0578; tie2.rotation.x = Math.PI / 2 - 0.1; tie2.scale.setScalar(1.05);
    inner.add(tie, tie2);
    const front = z > 0;
    const tag = solid(new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.031, 6, 3), M.tags[i]), true, true);
    let hole;
    if (front) {
      tag.position.set(0.004, H + 0.006 - fl, D / 2 - 0.004 - z);
      tag.rotation.set(-1.02, 0, [0.12, -0.08, 0.1][i]);
      hole = new THREE.Vector3(-0.02, H + 0.009 - fl, D / 2 - 0.015 - z);
    } else {
      tag.position.set(0.006, 0.058, 0.03);
      tag.rotation.set(-0.72, 0, [0.1, -0.12, 0.08][i - 3]);
      hole = new THREE.Vector3(-0.018, 0.064, 0.022);
    }
    body.add(tag);
    const knot = new THREE.Vector3(0.004, 0.06, 0.013).applyAxisAngle(up, rots[i]);
    const midP = knot.clone().lerp(hole, 0.5); midP.y -= 0.004;
    body.add(solid(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(knot, midP, hole), 16, 0.0007, 6, false), M.twine), true, false));
    slot.userData = { k: 0, v: 0, target: 0, body };
    slot.visible = false;
    g.add(slot);
    return slot;
  });
  let filled = 0;
  // k = 0: above the box and gone; 1: resting in the compartment. The spring overshoots, so the sack lands and squashes.
  function apply(slot) {
    const u = slot.userData, k = u.k;
    slot.visible = k > 0.004;
    const drop = Math.max(0, 1 - k);
    u.body.position.y = drop * drop * 0.16 - Math.max(0, k - 1) * 0.004;
    const sq = Math.max(0, k - 1);
    const grow = 0.55 + 0.45 * clamp(k * 1.6, 0, 1);
    u.body.scale.set(grow * (1 + sq * 0.35), grow * (1 - sq * 0.7), grow * (1 + sq * 0.35));
  }
  function setFilled(n, instant) {
    filled = clamp(Math.round(n), 0, 6);
    slots.forEach((slot, i) => {
      const u = slot.userData; u.target = i < filled ? 1 : 0;
      if (instant) { u.k = u.target; u.v = 0; apply(slot); }
    });
  }
  function setSlots(mask, dropIndex = -1, instant = false) {
    filled = 0;
    slots.forEach((slot, i) => {
      const u = slot.userData, on = !!mask[i], was = u.target;
      if (on) filled++;
      u.target = on ? 1 : 0;
      if (!instant && i === dropIndex && on && was === 0) return; // falls in on the spring
      u.k = u.target; u.v = 0; apply(slot);
    });
  }
  function update(dt) {
    slots.forEach((slot) => {
      const u = slot.userData;
      if (u.k === u.target && u.v === 0) return;
      const n = 4, h = dt / n;
      for (let i = 0; i < n; i++) {
        const stiff = u.target > u.k ? 160 : 90;
        u.v += ((u.target - u.k) * stiff - u.v * (u.target > u.k ? 11 : 16)) * h;
        u.k += u.v * h;
      }
      if (Math.abs(u.target - u.k) < 0.002 && Math.abs(u.v) < 0.01) { u.k = u.target; u.v = 0; }
      apply(slot);
    });
  }
  let glow = 0;
  function setGlow(k) {
    glow = clamp(k, 0, 1);
    M.burlap.emissiveIntensity = glow * 0.09;
    glowSprite.material.opacity = glow * 0.06;
    glowSprite.visible = glow > 0.002;
    M.tags.forEach((m) => { m.emissiveIntensity = glow * 0.1; });
    M.plate.emissiveIntensity = glow * 0.03;
  }
  setGlow(0);
  return { group: g, slots, setFilled, setSlots, setGlow, update, get filled() { return filled; }, top: H, halfW: W / 2, halfD: D / 2 };
}

export function buildShadows(T) {
  const g = new THREE.Group(); g.name = 'contactShadows';
  const cup = shadowDecal(T.blob, 0.2, 0.2, 0.6); cup.position.set(LAYOUT.cup.x, 0.0006, LAYOUT.cup.z + 0.004); g.add(cup);
  const P = LAYOUT.compass;
  const comp = shadowDecal(T.blob, 0.17, 0.17, 0.7); comp.position.set(P.x, 0.0006, P.z + 0.004); g.add(comp);
  const core = shadowDecal(T.blob, 0.125, 0.125, 0.85); core.position.set(P.x, 0.0007, P.z + 0.002); g.add(core);
  const L = LAYOUT.logbook;
  const book = shadowDecal(T.rectShadow, 0.23, 0.29, 0.6); book.position.set(L.x, 0.0006, L.z + 0.004); book.rotation.z = L.yaw; g.add(book);
  return g;
}

/* The ship's log: leather covers, a ribbon, an elastic band. setOpen(k) swings the front cover over on its spine to lie
   open on the left, showing the ruled first page; the band slips off as it starts to open. */
export function buildLogbook(M) {
  const g = new THREE.Group(); g.name = 'logbook';
  const L = LAYOUT.logbook;
  g.position.set(L.x, 0, L.z); g.rotation.y = L.yaw;
  const W = 0.15, D = 0.205;
  const back = solid(new THREE.Mesh(rbox(W, 0.0042, D, 0.0019, 2), M.leather)); back.position.y = 0.0021; g.add(back);
  const pages = solid(new THREE.Mesh(rbox(W - 0.009, 0.0132, D - 0.007, 0.0012, 2), M.pages)); pages.position.set(0.003, 0.0106, 0); g.add(pages);
  const page = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.018, D - 0.016), M.logPage);
  page.rotation.x = -Math.PI / 2; page.position.set(0.004, 0.01728, 0); page.receiveShadow = true; page.name = 'logPage';
  g.add(page);
  const spine = solid(new THREE.Mesh(rbox(0.012, 0.0215, D, 0.0052, 3), M.leather)); spine.position.set(-W / 2 + 0.004, 0.0107, 0); g.add(spine);
  const ribbon = solid(new THREE.Mesh(new THREE.PlaneGeometry(0.0055, 0.05), M.ribbon), true, true);
  ribbon.rotation.x = -Math.PI / 2; ribbon.rotation.z = 0.25; ribbon.position.set(0.02, 0.0006, D / 2 + 0.022); g.add(ribbon);
  const hinge = new THREE.Group(); hinge.name = 'cover';
  const HX = -W / 2 + 0.002, HY = 0.0172;
  hinge.position.set(HX, HY, 0);
  g.add(hinge);
  const front = solid(new THREE.Mesh(rbox(W, 0.0042, D, 0.0019, 2), M.leather)); front.position.set(W / 2 - 0.002, 0.0021, 0); hinge.add(front);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.074, 0.03), M.logLabel);
  label.rotation.x = -Math.PI / 2; label.position.set(W / 2 + 0.002, 0.00435, -0.04); label.receiveShadow = true; hinge.add(label);
  const endpaper = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.012, D - 0.012), M.logPage);
  endpaper.rotation.x = Math.PI / 2; endpaper.position.set(W / 2 - 0.002, -0.00015, 0); endpaper.receiveShadow = true; endpaper.name = 'endpaper';
  hinge.add(endpaper);
  const band = new THREE.Group();
  const bandTop = solid(new THREE.Mesh(rbox(0.0065, 0.0012, D + 0.0012, 0.0005, 1), M.elastic)); bandTop.position.set(W / 2 - 0.022, 0.0221, 0); band.add(bandTop);
  [-1, 1].forEach((s) => { const e = solid(new THREE.Mesh(rbox(0.0065, 0.0215, 0.0012, 0.0005, 1), M.elastic)); e.position.set(W / 2 - 0.022, 0.0107, s * (D / 2 + 0.0006)); band.add(e); });
  g.add(band);
  function setOpen(k) {
    k = clamp(k, 0, 1);
    hinge.rotation.z = k * Math.PI * 0.985;
    // the spine gives, so the open cover settles down beside the page block instead of hanging in the air
    hinge.position.y = HY - 0.0126 * smooth(0.55, 1, k);
    hinge.position.x = HX - 0.008 * smooth(0.5, 1, k);
    band.visible = k < 0.02;
  }
  setOpen(0);
  return { group: g, setOpen };
}

/* Brass dividers lying open on the table, left of the charts: legs flat, hinge resting on the wood. */
export function buildDividers(M) {
  const g = new THREE.Group(); g.name = 'dividers';
  const P = LAYOUT.dividers;
  const legGeo = new THREE.CylinderGeometry(0.0019, 0.0009, 0.118, 12);
  legGeo.translate(0, -0.059, 0);
  const flat = new THREE.Group();
  [-1, 1].forEach((s) => {
    const leg = new THREE.Group();
    leg.rotation.z = s * 0.16;
    leg.add(solid(new THREE.Mesh(legGeo, M.brassPolished)));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0009, 0.012, 10), M.steel); tip.rotation.x = Math.PI; tip.position.y = -0.124; tip.castShadow = true; leg.add(tip);
    flat.add(leg);
  });
  const hinge = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0072, 0.0046, 28), M.brassPolished)); hinge.rotation.x = Math.PI / 2; flat.add(hinge);
  const cap = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.0056, 20), M.steel)); cap.rotation.x = Math.PI / 2; flat.add(cap);
  flat.rotation.x = -Math.PI / 2;
  g.add(flat);
  // the hinge (radius 7.2 mm, lying on its face) is the lowest part: its face touches the table
  g.position.set(P.x, 0.0028, P.z);
  g.rotation.y = P.yaw;
  return g;
}

/* The crew-list slip. setLift(k) raises it off the table and tilts it towards the viewer, as if picked up to read. */
export function buildSlip(M, T) {
  const S = LAYOUT.slip;
  const group = new THREE.Group(); group.name = 'crewSlip';
  const geo = new THREE.PlaneGeometry(0.105, 0.148, 8, 10);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, 0.0005 + 0.0012 * Math.pow(Math.max(0, (x / 0.0525 + z / 0.074) * 0.5 - 0.55) / 0.45, 2)); }
  geo.computeVertexNormals();
  const paper = new THREE.Group(); paper.name = 'slipPaper'; paper.rotation.order = 'YXZ';
  const m = solid(new THREE.Mesh(geo, M.slip), true, true);
  m.name = 'slip';
  paper.add(m);
  const shadow = shadowDecal(T.rectShadow, 0.15, 0.2, 0.22);
  shadow.position.set(S.x, 0.0005, S.z + 0.002); shadow.rotation.z = S.yaw;
  group.add(paper, shadow);
  function setLift(k) {
    const e = clamp(k, 0, 1);
    paper.position.set(S.x, 0.11 * e, S.z + 0.05 * e);
    paper.rotation.set(0.95 * e, S.yaw, 0);
    shadow.material.opacity = 0.22 * (1 - e);
  }
  setLift(0);
  return { group, paper, setLift };
}

/* The letter: an envelope sealed with red wax. setOpen(k) lifts the flap back over its hinge, then the card inside
   rises and tilts towards the viewer. */
export function buildLetter(M, T) {
  const P = LAYOUT.letter;
  const g = new THREE.Group(); g.name = 'letter';
  g.position.set(P.x, 0, P.z); g.rotation.y = P.yaw;
  const W = 0.17, D = 0.11;
  const body = solid(new THREE.Mesh(rbox(W, 0.0026, D, 0.0008, 2), M.envelope)); body.position.y = 0.0013; g.add(body);
  const card = solid(new THREE.Mesh(rbox(W - 0.014, 0.0012, D - 0.012, 0.0004, 1), M.letterCard));
  card.position.set(0, 0.0032, 0.002); card.name = 'letterCard';
  g.add(card);
  const flapShape = new THREE.Shape();
  flapShape.moveTo(-W / 2, 0); flapShape.lineTo(W / 2, 0); flapShape.lineTo(0.005, 0.074); flapShape.quadraticCurveTo(0, 0.0765, -0.005, 0.074); flapShape.closePath();
  const flapGeo = new THREE.ExtrudeGeometry(flapShape, { depth: 0.0008, bevelEnabled: false, curveSegments: 6 });
  flapGeo.rotateX(Math.PI / 2);
  const flapHinge = new THREE.Group(); flapHinge.name = 'flap';
  flapHinge.position.set(0, 0.0048, -D / 2);
  g.add(flapHinge);
  flapHinge.add(solid(new THREE.Mesh(flapGeo, M.envelope)));
  const seal = solid(new THREE.Mesh(lathe([[0, 0.0036], [0.0085, 0.0032, 0.0025], [0.0124, 0.0014, 0.0015], [0.0134, 0.0002], [0, 0.0002]], 40, 3), M.wax));
  seal.position.set(0, 0, 0.064);
  flapHinge.add(seal);
  const boss = solid(new THREE.Mesh(new THREE.TorusGeometry(0.0074, 0.0009, 6, 32), M.wax), false, true);
  boss.rotation.x = Math.PI / 2; boss.position.set(0, 0.0034, 0.064);
  flapHinge.add(boss);
  const shadow = shadowDecal(T.rectShadow, W * 1.3, D * 1.45, 0.4); shadow.position.set(0, 0.0004, 0.003); g.add(shadow);
  function setOpen(k) {
    const e = clamp(k, 0, 1);
    flapHinge.rotation.x = -smooth(0, 0.6, e) * 2.95;
    const s = smooth(0.45, 1, e);
    card.position.set(0, 0.0032 + 0.036 * s, 0.002 + 0.022 * s);
    card.rotation.x = 0.55 * s;
  }
  setOpen(0);
  return { group: g, setOpen };
}
