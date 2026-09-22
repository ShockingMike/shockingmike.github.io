// Chớm world: people/xehoa — autumn on Nguyễn Du. Plays both main roles of the season:
//   'seller'   a flower seller of about 45 (nón lá, cloth mask, thin jacket), standing by her parked flower bicycle
//   'customer' a girl of about 22 on her way home (white blouse, long skirt, shoulder bag) who stops to buy a bunch
// MakeHuman bodies (CC0, through MPFB2) with clothes built by code in Blender (blender/build_banhoa.py, build_cogai.py);
// painted by paint.js; acted by acts.js; the bicycle and its flowers by bike.js.
//
//   export async function buildPeople(scene, R, layout, core) -> { update(t, dt, camera), sketch, movers(t), solids, faceProbes() }
//   export function faceProbes() -> [{ p, n, zone: 'features' | 'cheek', who: 'seller' | 'girl' }] both faces as drawn now (world)
//     marks (acts.js MARKS, the same numbers as seasons/thu/season.js peopleLayout): seller [2.05, 0, -2.52], girl [1.1, 0, -2.5],
//     the bunch changes hands at [1.46, 1.03, -2.64], the note at [1.58, 1.06, -2.62]; the girl comes in along the house-side
//     pavement and leaves by the lane along the season's own line (layout.girlPath; acts.js GIRL_IN / GIRL_OUT are only the
//     fallback); the bike stands at [2.6, 0, -3.3], front +x (bike.js)
//     core:   the world's api (core.THREE, core.U, core.paint, core.build, core.glow)
// The loop is 36 s. Checks (not loaded by the page): clipcheck-xehoa.js (pass-through, 0 hits) and the core's face check
// (core/qa/faces.mjs: eyes, nose and mouth 0 pixels from every page camera, desktop and phone; paint.js answers its
// uFaceMask - 1 the whole face, 2 the features only).
// This folder also aims the seller's lamp (core light 0): see bike.js LAMP_LIGHT.
//
// Budget (core/README.md 11b, two roles): the pose is drawn 12 times a second; the cloth steps 30 times a second and only
// its node offsets go to the card; one skinned body + one hull + one set of acting lines per person.
import * as THREE from 'three';
import { loadPerson, Person, stepCloth, V3, FPS, STEP, clamp01, sm } from './rig.js';
import { PU, bakeHatch, NCLOTH } from './paint.js';
import { buildBike, BUNCH_HOLD, BUNCH_HOLD_LOW, LAMP_LIGHT } from './bike.js';
import { sellerActs, girlActs, Prop, LOOP, NOTE, NOTE_OFF, MARKS } from './acts.js';

const here = (p) => new URL(p, import.meta.url).href;
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4();

// ---------------------------------------------------------------- the looks (dark / light of each cloth under warm lamps)
const SELLER_LOOKS = [
  { name: 'skin', kind: 'skin', col: '#7a4432', col2: '#d69a74', hatch: '#48241a', hi: '#ffe0c8', scale: 5, bump: 0.18, ink: 1.6, bands: true, hatchAmt: 0.35, hatchScale: 9, rim: 0.7, jit: 0.35 },
  { name: 'hair', kind: 'hair', col: '#0c0b0e', col2: '#4a4852', hatch: '#000000', hi: '#a4a8b4', scale: 8, bump: 0.35, sheen: 0.8, ink: 1.4, bands: true, hatchAmt: 0, rim: 0.8, jit: 0.2 },
  { name: 'jacket', kind: 'cotton', col: '#1a2836', col2: '#7a90a0', hatch: '#0e1a26', hi: '#e8eef0', back: '#141e2a', scale: 4, bump: 0.5, ink: 3.2, bands: true, hatchAmt: 0.8, hatchScale: 5, rim: 0.7, jit: 0.55 },
  { name: 'collar', kind: 'cotton', col: '#223242', col2: '#8aa0ae', hatch: '#0e1a26', back: '#16222e', scale: 5, bump: 0.5, ink: 2.4, bands: true, hatchAmt: 0.6, hatchScale: 6, jit: 0.5 },
  { name: 'pants', kind: 'cotton', col: '#241e18', col2: '#6a5a4a', hatch: '#120e0a', back: '#1a1612', scale: 4, bump: 0.45, ink: 2.6, bands: true, hatchAmt: 0.5, hatchScale: 4.5, rim: 0.6, jit: 0.5 },
  { name: 'sandal', kind: 'plastic', col: '#241208', col2: '#8a5634', hatch: '#120804', hi: '#ffd8b8', scale: 12, gloss: 0.5, ink: 1.2, jit: 0.3 },
  { name: 'mask', kind: 'cotton', col: '#5e5a62', col2: '#dcd4c4', hatch: '#3c3a44', back: '#4a4650', scale: 7, bump: 0.6, ink: 1.4, bands: false, hatchAmt: 0.5, hatchScale: 8, jit: 0.4 },
  // the nón lá: pale dried palm leaf. Seen from the eye it is mostly its underside, so the underside (back) is the lighter
  // straw of the two and takes the lamp (paint.js), and the leaf ribs are drawn on both faces (paint.js, kind straw).
  { name: 'hat', kind: 'straw', col: '#7a6338', col2: '#f4e4b2', hatch: '#4a3a1c', hi: '#fff8dc', back: '#c8ab6c', scale: 6, bump: 0.9, gloss: 0.2, ink: 2.0, bands: true, hatchAmt: 0.45, hatchScale: 7, rim: 0.9, jit: 0.5 },
  { name: 'ribbon', kind: 'cotton', col: '#34121a', col2: '#8e3a42', hatch: '#1a0608', scale: 10, ink: 0.8, jit: 0.3 },
  { name: 'belt', kind: 'cotton', col: '#18120e', col2: '#5a4634', hatch: '#0a0806', scale: 10, ink: 1.0, jit: 0.3 },
  { name: 'pouch', kind: 'cotton', col: '#22222a', col2: '#6a6472', hatch: '#121218', back: '#16161c', scale: 8, bump: 0.6, ink: 1.6, bands: true, hatchAmt: 0.5, jit: 0.4 },
];
const GIRL_LOOKS = [
  { name: 'skin', kind: 'skin', col: '#8a5038', col2: '#e8b28c', hatch: '#502a1e', hi: '#ffe6d2', scale: 5, bump: 0.18, ink: 1.6, bands: true, hatchAmt: 0.35, hatchScale: 9, rim: 0.8, jit: 0.35 },
  { name: 'hair', kind: 'hair', col: '#0a090c', col2: '#2e2c36', hatch: '#000000', hi: '#9aa2bc', scale: 8, bump: 0.35, sheen: 1.0, ink: 1.4, bands: true, hatchAmt: 0, rim: 0.85, jit: 0.2 },
  { name: 'tail', kind: 'hair', col: '#0a090c', col2: '#2e2c36', hatch: '#000000', hi: '#9aa2bc', scale: 8, bump: 0.35, sheen: 1.0, ink: 1.2, bands: true, hatchAmt: 0, rim: 0.85, jit: 0.2 },
  { name: 'strands', kind: 'hair', col: '#0a090c', col2: '#2e2c36', hatch: '#000000', hi: '#9aa2bc', scale: 8, sheen: 0.8, ink: 0.6, jit: 0.2 },
  { name: 'tie', kind: 'cotton', col: '#401420', col2: '#b04a52', hatch: '#200810', scale: 10, ink: 0.9, jit: 0.3 },
  // a pale blue-grey cotton shirt (early 2000s): a middle tone, so the brightest thing in the frame stays the bottle under
  // the lamp and not her back
  { name: 'blouse', kind: 'cotton', col: '#4e5866', col2: '#a4b2c0', hatch: '#333c48', hi: '#dfe8f0', back: '#5a6472', scale: 4.5, bump: 0.45, ink: 2.6, bands: true, hatchAmt: 0.6, hatchScale: 5, rim: 0.8, jit: 0.45 },
  { name: 'collar', kind: 'cotton', col: '#56606e', col2: '#aebac8', hatch: '#333c48', back: '#5a6472', scale: 5, bump: 0.4, ink: 2.0, bands: true, hatchAmt: 0.5, jit: 0.4 },
  { name: 'skirt', kind: 'cotton', col: '#20283c', col2: '#5a6c92', hatch: '#121826', back: '#1a2030', scale: 3.5, bump: 0.5, ink: 3.0, bands: true, hatchAmt: 0.7, hatchScale: 4, rim: 0.7, jit: 0.5 },
  { name: 'band', kind: 'cotton', col: '#222a3e', col2: '#5e7096', hatch: '#121826', scale: 5, ink: 1.8, bands: true, hatchAmt: 0.5, jit: 0.4 },
  { name: 'shoe', kind: 'leather', col: '#120606', col2: '#5a2a24', hatch: '#060202', hi: '#ffd0c0', scale: 12, gloss: 0.6, ink: 1.4, jit: 0.3 },
  { name: 'bag', kind: 'leather', col: '#2a160e', col2: '#a06e4a', hatch: '#140a06', hi: '#ffe0c0', back: '#1a0e08', scale: 8, bump: 0.7, gloss: 0.5, ink: 1.8, bands: true, hatchAmt: 0.4, jit: 0.4 },
];
const lookIndex = (looks) => (name) => Math.max(0, looks.findIndex((l) => l.name === name));
// the .glb part (object) names -> look names
const PART = { body: 'skin', sandals: 'sandal', waistband: 'band', shoes: 'shoe' };
const partName = (raw) => PART[raw] ?? raw;
const BAG = { L: 0.17, H: 0.12, T: 0.06, w: 0.005 };
// the tally of the budget, for perf and QA
const stats = { buildMs: 0, updateMs: 0 };

// ---------------------------------------------------------------- small geometry helpers
function boxShell(parts, w, h, d, c, openTop, thick) {
  // an open-topped box (walls and bottom), centred at c (x, y = top, z), in the given space
  const add = (sx, sy, sz, px, py, pz) => { const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(); g.translate(px, py, pz); parts.push(g); };
  add(thick, h, d, c.x + w / 2 - thick / 2, c.y - h / 2, c.z);
  add(thick, h, d, c.x - w / 2 + thick / 2, c.y - h / 2, c.z);
  add(w - 2 * thick, h, thick, c.x, c.y - h / 2, c.z + d / 2 - thick / 2);
  add(w - 2 * thick, h, thick, c.x, c.y - h / 2, c.z - d / 2 + thick / 2);
  add(w - 2 * thick, thick, d - 2 * thick, c.x, c.y - h + thick / 2, c.z);
  if (!openTop) add(w, thick, d, c.x, c.y - thick / 2, c.z);
}
function mergeNonIndexed(parts) {
  let n = 0;
  for (const g of parts) n += g.attributes.position.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  return g;
}
// the last built cast (for the module-level faceProbes)
let last = null;
// contract 7.5: [{ p, n, zone: 'features' | 'cheek', who: 'seller' | 'girl' }] world points of both faces as drawn now; [] before build
export function faceProbes() { return last ? last.faceProbes() : []; }

export async function buildPeople(scene, R, layout, core) {
  // they belong to Thu's street (a ?people= passed through the four-season page reaches the other seasons too)
  const seasonId = globalThis.__chom && globalThis.__chom.season;
  if (seasonId && seasonId !== 'thu') {
    console.info(`[people/xehoa] the flower seller and the girl play only in Thu (season ${seasonId}); not built here`);
    return null;
  }
  if (layout.roles && !layout.roles.some((r) => r === 'seller' || r === 'customer')) return null;
  const t0 = performance.now();
  // README 11: no stretch of this build runs longer than about 16 ms; the stretches are timed (stats.longestMs)
  let stretch = performance.now(), mark = stretch;
  const steps = (stats.steps = []);
  // every yield goes through here: a wait of more than a millisecond ends a stretch of work
  // (longestPiece: the longest run between two chances to yield, what a background build could not break)
  let lastCall = performance.now(), pieceTag = 'start';
  const ySlice = async (tag) => {
    // (after waiting on something else: the stretch starts again here)
    if (tag === 'restart') { stretch = lastCall = performance.now(); return; }
    const a = performance.now();
    if (a - lastCall > (stats.longestPiece || 0)) { stats.longestPiece = +(a - lastCall).toFixed(1); stats.longestPieceAt = `${pieceTag} → ${tag ?? steps[steps.length - 1]?.[0]}`; }
    pieceTag = tag ?? steps[steps.length - 1]?.[0];
    if (core.slice) await core.slice(); else await new Promise((r) => setTimeout(r, 0));
    const b = performance.now();
    if (b - a > 1) { if (a - stretch > (stats.longestMs || 0)) { stats.longestMs = +(a - stretch).toFixed(1); stats.longestAt = steps.length ? steps[steps.length - 1][0] : 'start'; } stretch = b; }
    lastCall = performance.now();
  };
  const tick = async (label) => {
    steps.push([label, +(performance.now() - mark).toFixed(1)]);
    await ySlice();
    mark = performance.now();
  };
  const tickFn = (label) => (tag) => tick(tag ? `${label}:${tag}` : label);
  const roles = layout.roles || ['seller', 'customer'];
  if (!roles.includes('seller') && !roles.includes('customer')) return null;
  const { U } = core;
  PU.tHatch.value = await bakeHatch(U.tStrokes.value.image, 256, ySlice);
  await tick('hatch');
  const banP = loadPerson([here('./banhoa.glb')]), gaiP = loadPerson([here('./cogai.glb')]);
  const banA = await banP;
  const gaiA = await gaiP;
  // (the files load and parse off this stretch: start a fresh one)
  stretch = mark = lastCall = performance.now();
  await tick('load');

  // ---- the bicycle, where the season parks it
  const bs = layout.bikeStop || { at: V3(2.6, 0, -3.3), yaw: 0 };
  const bike = await buildBike(scene, R, core, { at: bs.at, yaw: bs.yaw ?? 0 }, ySlice);
  await tick('bike');
  core.glow('#ffd49a', 0.26, 0.83, bike.lamp.clone().add(V3(0, -0.01, 0)));
  // her lamp is light 0 (seasons/thu/light.js puts it where this bike's lamp mesh is). The bike is ours, so we aim it here,
  // measured against the squint check (bike.js LAMP_LIGHT).
  {
    const d = V3(...LAMP_LIGHT.cone.dir).applyAxisAngle(V3(0, 1, 0), bs.yaw ?? 0).normalize();
    core.lamp(0, bike.lamp.clone(), { ...LAMP_LIGHT, cone: { ...LAMP_LIGHT.cone, dir: d.toArray() } });
  }

  // ---- the seller: body + a waist pouch hung on her belt
  const sm_ = banA.meta;
  const pouchP = V3(...sm_.pouch), pouchN = V3(...sm_.pouchDir).setY(0).normalize();
  const pouchT = new THREE.Vector3().crossVectors(V3(0, 1, 0), pouchN).normalize();
  const pouchQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(pouchT, V3(0, 1, 0), pouchN));
  const pouchTop = pouchP.clone().add(pouchN.clone().multiplyScalar(0.02)).add(V3(0, -0.004, 0));
  const pouchParts = [];
  boxShell(pouchParts, 0.11, 0.085, 0.038, V3(0, 0, 0), true, 0.004);
  // the flap-less mouth: a thin zip lip on the outer side
  { const g = new THREE.BoxGeometry(0.11, 0.01, 0.005).toNonIndexed(); g.translate(0, 0.002, 0.016); pouchParts.push(g); }
  for (const g of pouchParts) g.applyMatrix4(new THREE.Matrix4().compose(pouchTop, pouchQ, V3(1, 1, 1)));
  const pouchGeo = mergeNonIndexed(pouchParts);
  const seller = new Person(scene, {
    asset: banA, core, name: 'banhoa', looks: SELLER_LOOKS, lookOf: lookIndex(SELLER_LOOKS), partName,
    flowOf: (n) => (n === 'hair' ? 'hair' : 'limb'),
    extraParts: [{ name: 'pouch', geo: pouchGeo, look: lookIndex(SELLER_LOOKS)('pouch'), bone: 'pelvis' }],
  });
  await seller.init(tickFn('seller'));
  // her hat's cone in the rest pose: paint.js draws the leaf ribs and the bamboo rings on it
  if (sm_.hat) {
    seller.own.uStraw.value.set(...sm_.hat.apex, sm_.hat.radius);
    seller.own.uStrawAx.value.set(...sm_.hat.axis).normalize();
  }
  await tick('seller');

  // ---- the girl: body + a shoulder bag (its own bone, swinging) with a flap (another bone) and a strap
  const gm = gaiA.meta;
  const bagAt = V3(-0.234, gm.hipY + 0.075, -0.135);
  const bagParts = [];
  boxShell(bagParts, BAG.T, BAG.H, BAG.L, V3(0, 0, 0), true, BAG.w);
  const bagGeo = mergeNonIndexed(bagParts);
  bagGeo.translate(bagAt.x, bagAt.y, bagAt.z);
  // the flap: over the top and down the outer face, hinged on the inner top edge
  const flapParts = [];
  { const g = new THREE.BoxGeometry(BAG.T + 0.004, BAG.w, BAG.L + 0.006).toNonIndexed(); g.translate(-BAG.T / 2 - 0.002, BAG.w / 2, 0); flapParts.push(g); }
  { const g = new THREE.BoxGeometry(BAG.w, 0.055, BAG.L + 0.006).toNonIndexed(); g.translate(-BAG.T - 0.002 - BAG.w / 2 + 0.0, -0.0275 + BAG.w, 0); flapParts.push(g); }
  { const g = new THREE.CylinderGeometry(0.006, 0.006, 0.004, 10).toNonIndexed(); g.rotateZ(Math.PI / 2); g.translate(-BAG.T - 0.008, -0.03, 0); flapParts.push(g); }
  const flapGeo = mergeNonIndexed(flapParts);
  const hinge = bagAt.clone().add(V3(BAG.T / 2, 0.003, 0));
  flapGeo.translate(hinge.x, hinge.y, hinge.z);
  const girl0 = { hinge };
  // the strap, worn across: from the bag's front end, up across her chest, over her LEFT shoulder, across her back, to the
  // bag's back end (it stays off the side of her right chest, where the right arm moves)
  const strapPts = [
    V3(bagAt.x, bagAt.y + 0.004, bagAt.z + BAG.L / 2 - 0.01), V3(-0.17, gm.waistY - 0.005, 0.075), V3(-0.08, gm.waistY + 0.1, 0.125),
    V3(0.0, gm.collarBase - 0.13, 0.13), V3(0.065, gm.collarBase - 0.05, 0.09), V3(0.1, gm.collarBase + 0.005, 0.0),
    V3(0.09, gm.collarBase - 0.03, -0.07), V3(0.03, gm.collarBase - 0.13, -0.1), V3(-0.06, gm.waistY + 0.12, -0.115),
    V3(-0.14, gm.waistY + 0.02, -0.14), V3(bagAt.x, bagAt.y + 0.004, bagAt.z - BAG.L / 2 + 0.01),
  ];

  const girl = new Person(scene, {
    asset: gaiA, core, name: 'cogai', looks: GIRL_LOOKS, lookOf: lookIndex(GIRL_LOOKS), partName,
    flowOf: (n) => (n === 'hair' || n === 'tail' || n === 'strands' ? 'hair' : 'limb'),
    extraBones: [{ name: 'bag', parent: 'pelvis', at: bagAt }, { name: 'bagFlap', parent: 'bag', at: hinge }],
    extraParts: [
      { name: 'bag', geo: bagGeo, look: lookIndex(GIRL_LOOKS)('bag'), bone: 'bag' },
      { name: 'flap', geo: flapGeo, look: lookIndex(GIRL_LOOKS)('bag'), bone: 'bagFlap' },
    ],
  });
  // lay the strap on the blouse (rest pose), skin it to the torso and the bag, merge it into the body
  await girl.init(tickFn('girl'));
  await addStrap(girl, strapPts, lookIndex(GIRL_LOOKS)('bag'), 'clavicle_l', tickFn('strap'));
  seller.markFace(lookIndex(SELLER_LOOKS)('skin'));
  girl.markFace(lookIndex(GIRL_LOOKS)('skin'));
  await tick('faces');

  // ---- cloth: the girl's skirt (wraps round), her long hair, the loose strands
  const L = lookIndex(GIRL_LOOKS);
  const sc = V3(...gm.skirtCentre);
  const top = gm.skirtTop - 0.02, hem = gm.skirtHem;
  girl.addGrid({
    name: 'skirt', nu: 20, nv: 6, wrap: true, legs: true,
    pick: (i, p) => girl.lookOfVertex[i] === L('skirt') && p.y < top,
    uv: (p) => [((Math.atan2(p.x - sc.x, p.z - sc.z) / (Math.PI * 2)) + 1) % 1, (top - p.y) / (top - hem)],
    wOf: (p) => sm(top, top - 0.1, p.y),
    stiff: (tv) => (tv < 0.05 ? 1e9 : 80 * Math.pow(1 - tv, 2) + 8),
    damp: 0.28,
  });
  await tick('skirt');
  // the long hair down her back: a 3 x 6 sheet, hung from the band at the back of her head
  const cu = gm.curtain;
  const cuHalf = (y) => cu.half[0] + (cu.half[1] - cu.half[0]) * clamp01((cu.top - y) / (0.5 * (cu.top - cu.bottom)));
  girl.addGrid({
    name: 'tail', nu: 3, nv: 6,
    pick: (i) => girl.lookOfVertex[i] === L('tail'),
    uv: (p) => [(p.x / cuHalf(p.y) + 1) / 2, (cu.top - p.y) / (cu.top - cu.bottom)],
    wOf: (p) => sm(cu.top - 0.01, cu.top - 0.08, p.y),
    stiff: (tv) => (tv < 0.05 ? 1e9 : 30 * (1 - tv) + 8),
    damp: 0.24,
  });
  await tick('hair');
  // the hair keeps at least its resting distance from the back, the neck and the head (never less than it hangs at rest)
  const HAIR_CAPS = [['spine_01', 'spine_02'], ['spine_02', 'spine_03'], ['spine_03', 'neck_01'], ['neck_01', 'head']];
  {
    const tailGrid = girl.cloth.grids.find((g) => g.name === 'tail');
    const a = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Vector3(), c = new THREE.Vector3();
    for (const n of tailGrid?.nodes ?? []) {
      q.fromBufferAttribute(girl.geo.attributes.position, n.vi);
      n.restMin = HAIR_CAPS.map(([na, nb]) => {
        a.copy(girl.rest[na].wp); b.copy(girl.rest[nb].wp);
        const ab = c.subVectors(b, a); const u = clamp01(_v.subVectors(q, a).dot(ab) / ab.lengthSq());
        return Math.min(0.25, q.distanceTo(_v.copy(a).addScaledVector(ab, u)) - 0.002);
      });
    }
  }
  const strands = gm.strands.map((s) => s.map((q) => V3(...q)));
  const strandOf = (p) => { let best = 0, bd = 1e9; strands.forEach((s, k) => { for (const q of s) { const d = q.distanceToSquared(p); if (d < bd) { bd = d; best = k; } } }); return best; };
  const strandVerts = [];
  for (let i = 0; i < girl.geo.attributes.position.count; i++) if (girl.lookOfVertex[i] === L('strands')) strandVerts.push(i);
  const strandIdx = new Map();
  for (const i of strandVerts) strandIdx.set(i, strandOf(_v.fromBufferAttribute(girl.geo.attributes.position, i)));
  strands.forEach((s, k) => {
    const len = s[0].distanceTo(s[s.length - 1]);
    girl.addGrid({
      name: `strand${k}`, nu: 1, nv: 3,
      pick: (i) => strandIdx.get(i) === k,
      uv: (p) => [0, p.distanceTo(s[0]) / len],
      wOf: (p) => sm(0, 0.35, p.distanceTo(s[0]) / len),
      stiff: (tv) => (tv < 0.05 ? 1e9 : 30 * (1 - tv) + 7),
      damp: 0.2,
    });
  });
  girl.refreshHullCloth();
  await tick('cloth');

  // ---- fists fitted round the newsprint cone (5 cm across) and round the bare stems (2.5 cm)
  const coneR = (y) => (y < 0.011 ? 0.011 : 0.014 + 0.054 * Math.min(1, (y - 0.011) / 0.242));
  const tf = performance.now();
  // the fits are the same every time for these two models: they are read from fits.json when it matches (made by
  // qa/fits-save.mjs from the test page); otherwise worked out here, one at a time
  const fitKey = `v1 hold ${BUNCH_HOLD} ${BUNCH_HOLD_LOW} verts ${seller.geo.attributes.position.count} ${girl.geo.attributes.position.count}`;
  let cached = null;
  try { const j = await (await fetch(here('./fits.json'))).json(); if (j.key === fitKey) cached = j; } catch (e) { /* none yet */ }
  stretch = mark = lastCall = performance.now();
  const who = { seller, girl };
  if (cached) {
    for (const [w, hands] of Object.entries(cached.hands)) for (const [s, h] of Object.entries(hands)) {
      const H = who[w].hand[s];
      H.wraps = {};
      for (const [k, f] of Object.entries(h.wraps)) H.wraps[k] = { ...f, c: f.c ? V3(...f.c) : undefined };
      H.pinch = V3(...h.pinch); H.pinchGap = h.pinchGap;
    }
    stats.fitsFrom = 'fits.json';
  } else {
    for (const p of [seller, girl]) for (const s of ['l', 'r']) {
      p.fitWrap(s, coneR, BUNCH_HOLD, 'wrapHi'); await tick('fit');
      p.fitWrap(s, coneR, BUNCH_HOLD_LOW, 'wrapLo'); await tick('fit');
      p.fitPinch(s); await tick('fit');
    }
    // open hands on the cone: near its top (0.25 up) and at its middle (0.16 up)
    girl.fitSide('r', coneR, 0.25, 'sideHi'); await tick('fit');
    girl.fitSide('r', coneR, 0.16, 'sideMid'); await tick('fit');
    stats.fitsFrom = 'worked out';
    console.info('[people/xehoa] fits worked out (fits.json missing or stale):', fitKey);
  }
  const dumpFits = () => ({
    key: fitKey,
    hands: Object.fromEntries(Object.entries(who).map(([w, p]) => [w, Object.fromEntries(['l', 'r'].map((s) => {
      const H = p.hand[s];
      const wraps = Object.fromEntries(Object.entries(H.wraps || {}).filter(([k]) => !k.startsWith('__')).map(([k, f]) => [k, { ...f, c: f.c ? f.c.toArray() : undefined }]));
      return [s, { wraps, pinch: H.pinch.toArray(), pinchGap: H.pinchGap }];
    }))])),
  });
  await tick('fits');
  stats.fitMs = Math.round(performance.now() - tf);

  // ---- acting lines
  buildFoldsSeller(seller);
  await tick('folds seller');
  buildFoldsGirl(girl, L);
  await tick('folds');

  // ---- props that change hands
  const note = makeNote(core, scene);
  const props = {
    sold: new Prop(bike.sold, { kind: 'bunch' }),
    refill: new Prop(bike.refill, { kind: 'bunch' }),
    note: new Prop(note, { kind: 'note' }),
    // virtual places (only their matrices): the slot, the pouch mouth, inside the pouch, the bag mouth, inside the bag
    refillSlot: new Prop(new THREE.Object3D(), { kind: 'bunch' }),
    pouchTop: new Prop(new THREE.Object3D(), { kind: 'note' }),
    pouchIn: new Prop(new THREE.Object3D(), { kind: 'note' }),
    bagTop: new Prop(new THREE.Object3D(), { kind: 'note' }),
    bagIn: new Prop(new THREE.Object3D(), { kind: 'note' }),
    pouchDeep: new Prop(new THREE.Object3D(), { kind: 'note' }),
    bagDeep: new Prop(new THREE.Object3D(), { kind: 'note' }),
  };
  props.refillSlot.setWorld(bike.slot.p, bike.slot.q);
  // the left hand under the parcel flap's lower edge, palm up, lifting it
  props.flapGoal = (out) => {
    bike.flap.updateMatrixWorld(true);
    out.p.copy(bike.flapEdge).applyMatrix4(bike.flap.matrixWorld);
    out.p.y -= 0.02;
    out.fwd.set(-0.4, 0.1, -1).normalize();
    out.palm.set(0, 1, 0);
    out.point = 'palmC';
    return out;
  };
  // the note stands upright in the pouch / bag: its long edge down, its face out
  // (the left hand's palm faces her belly: the pinch is in front of the palm, so the hand stays off her; thumb along the belt)
  const noteDown = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3(0, -1, 0), V3(-1, 0, 0), V3(0, 0, -1)));
  const pouchNoteQ = pouchQ.clone().multiply(noteDown);
  const pouchPin = { top: pouchTop.clone().add(V3(0, 0.07, 0)), in: pouchTop.clone().add(V3(0, 0.04, 0)) };
  // (the right hand's palm faces her hip: the hand stays on the outer side of the mouth)
  const bagNoteQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3(0, -1, 0), V3(0, 0, 1), V3(-1, 0, 0)));
  const bagPin = { top: V3(0.002, 0.05, 0.02), in: V3(0.002, 0.02, 0.02) };
  const placeVirtual = () => {
    // pouch: rides the seller's pelvis
    // the pelvis' move from rest (world), applied to points given in the seller's rest (character) space
    const pel = seller.B.pelvis, restPel = seller.rest.pelvis;
    const M = _m.multiplyMatrices(pel.matrixWorld, _m2.compose(restPel.wp, restPel.wq, V3(1, 1, 1)).invert());
    for (const [k, pin] of [['pouchTop', pouchPin.top], ['pouchIn', pouchPin.in]]) {
      const pr = props[k];
      pr.world.compose(_v.set(NOTE_OFF, 0, 0).applyQuaternion(pouchNoteQ).add(pin), pouchNoteQ, V3(1, 1, 1)).premultiply(M);
      pr.apply();
    }
    // the note in the pouch: let go above the mouth, it slides down in (15.5 - 15.75), then it is inside, out of sight
    {
      const k = clamp01((tNow - 15.5) / 0.25), e = k * k * (3 - 2 * k);
      const pin = _v2.copy(pouchTop).add(V3(0, 0.04 - 0.045 * e, 0));
      props.pouchDeep.world.compose(_v.set(NOTE_OFF, 0, 0).applyQuaternion(pouchNoteQ).add(pin), pouchNoteQ, V3(1, 1, 1)).premultiply(M);
    }
    const bag = girl.B.bag;
    // the note in the bag: deep inside until her fingers are in the mouth, then it rises to them (12.6 - 12.8)
    {
      const k = clamp01((tNow - 12.6) / 0.2), e = k * k * (3 - 2 * k);
      const pin = _v2.copy(bagPin.in).add(V3(0, -0.05 * (1 - e), 0));
      props.bagDeep.world.compose(_v.set(NOTE_OFF, 0, 0).applyQuaternion(bagNoteQ).add(pin), bagNoteQ, V3(1, 1, 1)).premultiply(bag.matrixWorld);
    }
    for (const [k, pin] of [['bagTop', bagPin.top], ['bagIn', bagPin.in]]) {
      const pr = props[k];
      pr.world.compose(_v.set(NOTE_OFF, 0, 0).applyQuaternion(bagNoteQ).add(pin), bagNoteQ, V3(1, 1, 1)).premultiply(bag.matrixWorld);
      pr.apply();
    }
  };

  // ---- the acting
  const S = sellerActs(seller, layout, bike, props);
  const G = girlActs(girl, layout, bike, props);
  const ownerAt = (list, t) => { let o = list[0][1]; for (const [tt, w] of list) if (t >= tt - 1e-6) o = w; return o; };
  const bagSpring = { p: new THREE.Vector3(), v: new THREE.Vector3(), rest: new THREE.Vector3(), init: false };
  let lastDrawing = -1;
  let tNow = 0;
  const drawing = (tl) => {
    tNow = tl;
    // 1. bodies, then the hands that give (their goals are their own), then the props they hold, then the hands that take
    S.poseBody(tl);
    G.poseBody(tl);
    bike.flap.rotation.x = -1.35 * S.parcelFlap(tl);
    bike.flap.updateMatrixWorld(true);
    girl.B.bagFlap.quaternion.setFromAxisAngle(V3(0, 0, 1), -2.05 * G.flapAt(tl));
    girl.B.bagFlap.updateMatrixWorld(true);
    girl.B.bag.updateMatrixWorld(true);
    placeVirtual();
    const own = S.own;
    const place = (name) => {
      const pr = props[name];
      const o = ownerAt(own[name], tl);
      if (o === 'slot') pr.setWorld(bike.slot.p, bike.slot.q);
      else if (o === 'under') pr.setWorld(bike.under.p, bike.under.q);
      else if (o === 'bag') { pr.world.copy(props.bagDeep.world); pr.apply(); }
      else if (o === 'pouch') { pr.world.copy(props.pouchDeep.world); pr.apply(); }
      return o;
    };
    const oSold = place('sold'), oRefill = place('refill'), oNote = place('note');
    // hands that give first
    // (the seller's left hand gives the bunch first; later it takes the note, after the girl's right hand has it out)
    const sellerLGives = oSold === 'sellerL';
    S.poseArm('r', tl, props);
    if (sellerLGives) { S.poseArm('l', tl, props); props.sold.follow(seller, 'l', 'hiF'); }
    G.poseArm('l', tl, props);
    if (oSold === 'girlL') props.sold.follow(girl, 'l', 'loN');
    G.poseArm('r', tl, props);
    if (oNote === 'girlR') props.note.follow(girl, 'r');
    if (!sellerLGives) S.poseArm('l', tl, props);
    if (oNote === 'sellerL') props.note.follow(seller, 'l');
    if (oRefill === 'sellerR') props.refill.follow(seller, 'r', 'loN');
    // the note is only seen between the bag and the pouch; the bunch only while the girl is in sight
    props.note.obj.visible = oNote === 'girlR' || oNote === 'sellerL' || (oNote === 'pouch' && tl < 15.8) || (oNote === 'bag' && tl > 12.55);
    props.sold.obj.visible = !(oSold === 'girlL' && !G.where.visible);
    // (the spare bunch inside the shut parcel is not drawn: nothing of it can be seen there)
    const refillShown = !(oRefill === 'under' && S.parcelFlap(tl) < 0.02);
    props.refill.obj.traverse((o) => { o.visible = refillShown; });
    // what the cloth follows and how hard the cloth works
    seller.anchorCloth();
    girl.anchorCloth();
    foldWeights(seller, S.measures(tl), 'seller');
    foldWeights(girl, G.measures(tl), 'girl');
    keyLight(seller, core);
    keyLight(girl, core);
  };

  // ---- cloth forces and collisions (the girl)
  const legCols = [], hairCols = [];
  const legSeg = () => {
    legCols.length = 0;
    for (const s of ['l', 'r']) {
      const a = girl.B[`thigh_${s}`].getWorldPosition(new THREE.Vector3());
      const b = girl.B[`calf_${s}`].getWorldPosition(new THREE.Vector3());
      const c = girl.B[`foot_${s}`].getWorldPosition(new THREE.Vector3());
      legCols.push([a, b, 0.088, 0.068], [b, c, 0.064, 0.042]);
    }
    const sp = girl.B.spine_02.getWorldPosition(new THREE.Vector3());
    const pe = girl.B.pelvis.getWorldPosition(new THREE.Vector3());
    const nk = girl.B.neck_01.getWorldPosition(new THREE.Vector3());
    legCols.push([pe, sp, 0.13, 0.13], [sp, nk, 0.12, 0.12]);
    hairCols.length = 0;
    for (const [na, nb] of HAIR_CAPS) hairCols.push([girl.B[na].getWorldPosition(new THREE.Vector3()), girl.B[nb].getWorldPosition(new THREE.Vector3())]);
  };
  const closest = (p, a, b, out) => { _v2.subVectors(b, a); const t = clamp01(_v3.subVectors(p, a).dot(_v2) / Math.max(1e-8, _v2.lengthSq())); return out.copy(a).addScaledVector(_v2, t); };
  const wind = { x: 0 };
  const force = (n, f, t) => {
    const tv = n.tv;
    const ph = t * 1.4 + n.k * 0.7 + n.j * 0.4 + n.start * 0.3;
    const gust = (0.5 + 0.5 * Math.sin(t * 0.45 + n.start)) * (0.6 * Math.sin(ph) + 0.4 * Math.sin(ph * 2.2 + 1.1));
    f.x += (0.35 + wind.x) * tv * (0.6 + 0.4 * gust);
    f.z += 0.25 * tv * gust;
    f.y -= 0.6 * tv;
  };
  const cp = new THREE.Vector3();
  // p, v: the node's world position and velocity (changed in place); true when it was moved.
  // The skirt is always outside the legs: a node is moved out along its own direction from the skirt's axis (never
  // pushed inward, even if a leg got in front of it between two steps).
  const skirtC = new THREE.Vector3(), dirO = new THREE.Vector3(), rel = new THREE.Vector3(), segP = new THREE.Vector3();
  const collide = (n, p, v) => {
    const kind = n.name;
    if (kind.startsWith('strand')) return false;
    let moved = false;
    if (kind === 'skirt') {
      skirtC.set(sc.x, 0, sc.z).applyMatrix4(girl.root.matrixWorld);
      dirO.set(p.x - skirtC.x, 0, p.z - skirtC.z);
      let sNow = dirO.length();
      if (sNow < 1e-5) return false;
      dirO.divideScalar(sNow);
      for (let c = 0; c < 4; c++) {
        const [a, b, r0, r1] = legCols[c];
        // the point of the leg at the node's height (or its nearest end)
        const u = clamp01((p.y - a.y) / ((b.y - a.y) || 1e-6));
        segP.copy(a).lerp(b, u);
        const r = r0 + (r1 - r0) * u + 0.058;
        rel.set(segP.x - skirtC.x, 0, segP.z - skirtC.z);
        const along = rel.dot(dirO);
        const perp2 = rel.lengthSq() - along * along;
        if (perp2 >= r * r) continue;
        const sExit = along + Math.sqrt(r * r - perp2);
        if (sNow < sExit) {
          p.x += dirO.x * (sExit - sNow); p.z += dirO.z * (sExit - sNow);
          sNow = sExit;
          const vn = v.x * dirO.x + v.z * dirO.z;
          if (vn < 0) { v.x -= dirO.x * vn; v.z -= dirO.z * vn; }
          moved = true;
        }
      }
      return moved;
    }
    if (kind === 'tail' && n.restMin) {
      // the neck and the head: keep the resting distance (the back is the torso's job, below)
      for (let c = 2; c < hairCols.length; c++) {
        const [a, b] = hairCols[c];
        closest(p, a, b, cp);
        const r = n.restMin[c];
        _v.subVectors(p, cp);
        const d = _v.length();
        if (d < r) {
          if (d < 1e-5) _v.set(0, 0, -1); else _v.divideScalar(d);
          p.addScaledVector(_v, r - d);
          const vn = v.dot(_v);
          if (vn < 0) v.addScaledVector(_v, -vn);
          moved = true;
        }
      }
    }
    for (const [a, b, r0, r1] of legCols.slice(4)) {
      closest(p, a, b, cp);
      const r = r0 + 0.02;
      _v.subVectors(p, cp);
      const d = _v.length();
      if (d < r) {
        if (d < 1e-5) _v.set(0, 0, -1); else _v.divideScalar(d);
        p.addScaledVector(_v, r - d);
        const vn = v.dot(_v);
        if (vn < 0) v.addScaledVector(_v, -vn);
        moved = true;
      }
    }
    return moved;
  };

  // ---- the lamp that matters most for each person (their light direction for sheen, rims and the ink)
  const keyLightTmp = { best: -1 };
  function keyLight(p, core) {
    const chest = p.B.spine_03.getWorldPosition(_v);
    let best = 0, dir = null;
    for (let i = 0; i < U.uBulb.value.length; i++) {
      if ((U.uBulbFlag.value[i] ?? 0) < 0.5) continue;
      const b = U.uBulb.value[i];
      _v2.set(b.x - chest.x, b.y - chest.y, b.z - chest.z);
      const d = _v2.length();
      let att = clamp01(1 - d / b.w); att *= att;
      const c = U.uBulbCol.value[i];
      const e = att * (c.r + c.g + c.b);
      if (e > best) { best = e; dir = _v3.copy(_v2).divideScalar(d); }
    }
    if (dir) p.own.uKey.value.lerp(dir, 1).normalize();
  }

  // ---- warm up: the cloth arrives settled
  const runTo = (t) => {
    for (const p of [seller, girl]) p.cloth.init = false;
    lastDrawing = -1;
    for (let i = 60; i >= 0; i--) step(t - i / 30, 1 / 30, null);
  };
  const size = new THREE.Vector2();
  const camR = new THREE.Vector3(), camU = new THREE.Vector3();
  function setPx(camera) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    size.set(window.innerWidth * dpr, window.innerHeight * dpr);
    PU.uRes.value.copy(size);
    PU.uPxScale.value = size.y / 900;
    if (camera) {
      camR.setFromMatrixColumn(camera.matrixWorld, 0); camU.setFromMatrixColumn(camera.matrixWorld, 1);
      // which way the mis-registered colour bands are offset: the world's own reference direction (core U.uKeyDir, the same
      // one the core offsets the bike's and the houses' bands by), not each person's nearest lamp. Both of them are then
      // printed off the same way, as one press would do it.
      const K = U.uKeyDir.value;
      for (const p of [seller, girl]) p.own.uKeyScreen.value.set(K.dot(camR), K.dot(camU)).normalize();
    }
  }
  let clothAcc = 0;
  function step(t, dt, camera) {
    const tl = ((t % LOOP) + LOOP) % LOOP;
    const frame = Math.floor((tl * FPS) / STEP) * STEP;
    let fresh = false;
    if (frame !== lastDrawing) {
      const before = girl.root.position.clone();
      drawing(frame / FPS);
      // she comes back behind the eye when the loop wraps: her cloth starts again there
      if (before.distanceTo(girl.root.position) > 0.5) {
        girl.cloth.init = false;
        legSeg();
        for (let k = 0; k < 8; k++) stepCloth(girl, 1 / 30, t, { force, collide, sub: 1 / 30 });
      }
      lastDrawing = frame;
      legSeg();
      fresh = true;
    }
    clothAcc += dt;
    if (fresh || clothAcc >= 1 / 30 - 1e-4) {
      const h = Math.min(Math.max(clothAcc, 1 / 60), 1 / 20);
      stepCloth(girl, h, t, { force, collide, sub: 1 / 30 });
      clothAcc = 0;
    }
    setPx(camera);
  }
  setPx(null);
  await tick('acts');
  // the warm-up, in slices
  for (const p of [seller, girl]) p.cloth.init = false;
  lastDrawing = -1;
  for (let i = 60; i >= 0; i--) { step(-i / 30, 1 / 30, null); if (i % 10 === 0) await tick('warm-up'); }
  stats.buildMs = Math.round(performance.now() - t0);

  // ---- for the checks
  // the pouch's own frame (world): for the checks
  const pouchMatrix = () => {
    const pel = seller.B.pelvis, restPel = seller.rest.pelvis;
    const M = new THREE.Matrix4().multiplyMatrices(pel.matrixWorld, new THREE.Matrix4().compose(restPel.wp, restPel.wq, V3(1, 1, 1)).invert());
    return M.multiply(new THREE.Matrix4().compose(pouchTop, pouchQ, V3(1, 1, 1)));
  };
  const api = {
    seller, girl, bike, props, S, G, stats, loop: LOOP, pouchMatrix,
    runTo, drawing: (t) => { lastDrawing = -1; drawing(t); },
    faces: (camPos) => ({ seller: seller.faceAngle(camPos), girl: girl.faceAngle(camPos) }),
    faceProbes: () => [...seller.faceProbes('seller'), ...(girl.root.visible ? girl.faceProbes('girl') : [])],
    dumpFits,
    PU,
  };
  last = api;
  const out = {
    ...api,
    // contract 7.5: the face points of both people as drawn now, [{ p, n, zone: 'features' | 'cheek', who }] (world)
    faceProbes: () => api.faceProbes(),
    sketch: [],
    solids: [
      ...bike.solids,
      { x: MARKS.seller[0], z: MARKS.seller[2], r: 0.28, h: 1.6, name: 'xehoa seller' },
    ],
    // the girl walks: she is the only thing of this folder that moves over the ground
    movers: (t) => {
      if (t !== undefined) { const tl = ((t % LOOP) + LOOP) % LOOP; G.place(Math.floor((tl * FPS) / STEP) * STEP / FPS); }
      const w = G.where;
      if (!w.visible) return [];
      return [{ x: w.p.x, y: 0, z: w.p.z, r: 0.25, h: 1.62, name: 'xehoa girl', group: 'xehoa' }];
    },
    // README 11: the two people as capsules at time t (world), for the near-lens check. It draws that moment, then leaves the
    // next update to draw its own (the cloth keeps its state).
    caps: (t) => {
      const tl = ((t % LOOP) + LOOP) % LOOP;
      lastDrawing = -1;
      drawing(Math.floor((tl * FPS) / STEP) * STEP / FPS);
      lastDrawing = -1;
      const list = [];
      for (const [P, shown, headR] of [[seller, true, 0.27], [girl, G.where.visible, 0.14]]) {
        if (!shown) continue;
        P.root.updateMatrixWorld(true);
        const w = (n) => P.B[n].getWorldPosition(new THREE.Vector3());
        const head = w('head');
        list.push([w('pelvis'), w('spine_03'), 0.2], [w('neck_01'), head.clone().add(V3(0, 0.12, 0)), headR]);
        for (const s of ['l', 'r']) list.push([w(`upperarm_${s}`), w(`lowerarm_${s}`), 0.07], [w(`lowerarm_${s}`), w(`hand_${s}`), 0.07], [w(`thigh_${s}`), w(`calf_${s}`), 0.1], [w(`calf_${s}`), w(`foot_${s}`), 0.08]);
      }
      return list;
    },
    update(t, dt, camera) {
      const a = performance.now();
      step(t, Math.min(Math.max(dt ?? 1 / 60, 0), 0.05), camera);
      stats.updateMs = stats.updateMs * 0.9 + (performance.now() - a) * 0.1;
    },
  };
  api.update = out.update;
  if (typeof window !== 'undefined') { window.__xehoa = api; window.__xehoaQA = api; }
  return out;
}

// ---------------------------------------------------------------- the strap: laid on the blouse at rest, skinned to torso and bag
async function addStrap(person, guide, look, clavicle, slice = async () => {}) {
  const pos = person.geo.attributes.position, nor = person.geo.attributes.normal;
  const lookArr = person.lookOfVertex;
  const blouse = person.looks.findIndex((l) => l.name === 'blouse'), collar = person.looks.findIndex((l) => l.name === 'collar');
  // only the body of the blouse (not its sleeves): the vertices whose strongest bone is not an arm bone
  const SIa = person.geo.attributes.skinIndex.array, SWa = person.geo.attributes.skinWeight.array;
  const armish = person.skeleton.bones.map((b) => /^(upperarm|lowerarm|hand|index|middle|ring|pinky|thumb)_/.test(b.name));
  const onTorso = (i) => { let bw = -1, bb = 0; for (let k = 0; k < 4; k++) if (SWa[i * 4 + k] > bw) { bw = SWa[i * 4 + k]; bb = SIa[i * 4 + k]; } return !armish[bb]; };
  const cand = [];
  for (let i = 0; i < pos.count; i++) if ((lookArr[i] === blouse || lookArr[i] === collar) && onTorso(i)) cand.push(i);
  await slice();
  const best = new THREE.Vector3(), bn = new THREE.Vector3(), q = new THREE.Vector3();
  // the cloth under a point: its nearest vertex, and the mean normal around it
  const under = (p) => {
    let bd = 1e9, bi = -1;
    for (const i of cand) {
      const d = (pos.getX(i) - p.x) ** 2 + (pos.getY(i) - p.y) ** 2 + (pos.getZ(i) - p.z) ** 2;
      if (d < bd) { bd = d; bi = i; }
    }
    if (bi < 0) return -1;
    best.fromBufferAttribute(pos, bi);
    bn.set(0, 0, 0);
    for (const i of cand) {
      const d = (pos.getX(i) - best.x) ** 2 + (pos.getY(i) - best.y) ** 2 + (pos.getZ(i) - best.z) ** 2;
      if (d < 0.0004) bn.x += nor.getX(i), bn.y += nor.getY(i), bn.z += nor.getZ(i);
    }
    bn.normalize();
    return bi;
  };
  const lift = (u, bi) => 0.007 + 0.018 * Math.max(0, 1 - Math.abs(u - 0.5) / 0.22) + (lookArr[bi] === collar ? 0.004 : 0);
  const curve = new THREE.CatmullRomCurve3(guide, false, 'centripetal');
  const N = 36;
  const pts = [];
  for (let k = 0; k <= N; k++) {
    const p = curve.getPoint(k / N);
    const u = k / N;
    // lay it on the cloth: the nearest blouse/collar vertex, then out along its normal
    if (u > 0.1 && u < 0.9) { const bi = under(p); if (bi >= 0) p.copy(best).addScaledVector(bn, lift(u, bi)); }
    pts.push(p);
    if (k % 8 === 7) await slice();
  }
  // smooth, then lift back onto the cloth where the smoothing cut a corner (over the shoulder)
  for (let it = 0; it < 2; it++) for (let k = 1; k < N; k++) pts[k].lerp(q.addVectors(pts[k - 1], pts[k + 1]).multiplyScalar(0.5), 0.35);
  const c2 = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const g = new THREE.TubeGeometry(c2, N, 1, 6, false);
  // flatten: 18 mm wide, lying in the cloth, 5 mm thick
  const P = g.attributes.position;
  const frames = c2.computeFrenetFrames(N, false);
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const c = c2.getPointAt(u);
    const tg = frames.tangents[i];
    let nn;
    const bi = u > 0.1 && u < 0.9 ? under(c) : -1;
    if (bi >= 0) {
      const want = lift(u, bi) + 0.004;
      const h = q.subVectors(c, best).dot(bn);
      if (h < want) c.addScaledVector(bn, want - h);
      nn = bn.clone();
    } else nn = c.clone().setY(0).normalize();
    const flat = new THREE.Vector3().crossVectors(tg, nn).normalize();
    nn.crossVectors(flat, tg).normalize();
    for (let j = 0; j <= 6; j++) {
      const a = (j / 6) * Math.PI * 2;
      const v = c.clone().addScaledVector(flat, Math.cos(a) * 0.009).addScaledVector(nn, Math.sin(a) * 0.0025);
      P.setXYZ(i * 7 + j, v.x, v.y, v.z);
    }
    if (i % 8 === 7) await slice();
  }
  g.computeVertexNormals();
  g.deleteAttribute('uv');
  // skin: the ends ride the bag, the middle the torso
  const n = P.count;
  const bi = person.skeleton.bones.findIndex((b) => b.name === 'bag');
  const s3 = person.skeleton.bones.findIndex((b) => b.name === 'spine_03');
  const s2 = person.skeleton.bones.findIndex((b) => b.name === 'spine_02');
  const cl = person.skeleton.bones.findIndex((b) => b.name === clavicle);
  const SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const u = Math.floor(i / 7) / N;
    const wb = Math.max(sm(0.3, 0.0, u), sm(0.7, 1.0, u));
    const top = Math.max(0, 1 - Math.abs(u - 0.5) / 0.18);
    const rest = 1 - wb;
    SI.set([bi, cl, s3, s2], i * 4);
    SW.set([wb, rest * top * 0.6, rest * (1 - top * 0.6) * 0.6, rest * (1 - top * 0.6) * 0.4], i * 4);
  }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
  appendPart(person, g.index ? g.toNonIndexed() : g, look, 'strap');
}
// add a skinned geometry (with its own skin attributes) to a person's merged body
function appendPart(person, g, look, name) {
  const segs = { S: person.SEGS, segOf: person.segOf, hc: V3(...person.meta.headCentre) };
  person.flowAttributes(g, 'limb', segs);
  const n = g.attributes.position.count;
  const src = person.geo;
  const m0 = src.attributes.position.count;
  const out = new THREE.BufferGeometry();
  for (const [k, size] of [['position', 3], ['normal', 3], ['skinIndex', 4], ['skinWeight', 4], ['aFlow', 2], ['aAxis', 3], ['aLook', 1], ['aCloth', 4], ['aClothW', 1], ['aCurv', 1]]) {
    const a = src.attributes[k].array;
    const b = new a.constructor(a.length + n * size);
    b.set(a);
    if (g.attributes[k]) b.set(g.attributes[k].array, a.length);
    else if (k === 'aLook') b.fill(look, a.length);
    else if (k === 'aCloth') b.fill(-1, a.length);
    out.setAttribute(k, new THREE.BufferAttribute(b, size));
  }
  const idx = Array.from(src.index.array);
  for (let i = 0; i < n; i++) idx.push(m0 + i);
  out.setIndex(idx);
  person.mesh.geometry = out;
  person.geo = out;
  person.lookOfVertex = out.attributes.aLook.array;
  person.partRanges[name] = [m0, m0 + n];
  src.dispose();
}

// ---------------------------------------------------------------- the note: a folded paper note of the early 2000s
function makeNote(core, scene) {
  const { Batch, hero } = core.build;
  const g = new THREE.PlaneGeometry(NOTE.w, NOTE.h, 6, 2);
  const p = g.attributes.position;
  // (the same from either end: it is taken by the other end)
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, 0.004 * Math.cos((x / NOTE.w) * Math.PI) - 0.002); }
  g.computeVertexNormals();
  const nb = new Batch();
  nb.add(g, { col: '#5a3a36', col2: '#d8a890', erode: 0, hilite: 0.4, scale: 18, bump: 0.3, smooth: true });
  nb.add(new THREE.PlaneGeometry(0.02, 0.02).translate(0, 0, 0.0025), { col: '#6a5a40', col2: '#e8dcb8', erode: 0, hilite: 0.2, scale: 18, bump: 0.3 });
  const m = hero(nb.merge(), { rims: false });
  m.traverse((o) => { if (o.material) o.material.side = THREE.DoubleSide; });
  m.userData.main.userData.castShadow = false;
  m.name = 'xehoa-note';
  scene.add(m);
  return m;
}

// ---------------------------------------------------------------- acting lines, laid on the cloth at rest
function buildFoldsSeller(p) {
  const L = lookIndex(SELLER_LOOKS);
  const jk = [L('jacket')];
  let slot = 0;
  for (const s of ['l', 'r']) {
    const U = p.P(`upperarm_${s}`), E = p.P(`lowerarm_${s}`), H = p.P(`hand_${s}`);
    const u0 = E.clone().sub(U).normalize(), l0 = H.clone().sub(E).normalize();
    let inner = l0.clone().addScaledVector(u0, -l0.dot(u0));
    if (inner.lengthSq() < 1e-4) inner = V3(0, 0, 1).addScaledVector(u0, -u0.z);
    inner.normalize();
    const side = new THREE.Vector3().crossVectors(u0, inner).normalize();
    // elbow creases (slot 0 / 1)
    [[-0.02, 0.9], [0.0, 1.2], [0.024, 0.8]].forEach(([off, span], k) => {
      const pts = [];
      for (let a = 0; a <= 5; a++) {
        const t = -span / 2 + (span * a) / 5;
        pts.push(E.clone().addScaledVector(u0, off + 0.004 * k).addScaledVector(inner, Math.cos(t) * 0.075).addScaledVector(side, Math.sin(t) * 0.075));
      }
      p.addFold(pts, { looks: jk, width: 2.3 - 0.3 * k, slot: slot });
    });
    slot++;
  }
  // back: stretch lines when she bends to the tray (slot 2), gathers at the waist when she turns (slot 3)
  const n = p.P('neck_01'), pel = p.P('pelvis');
  for (const sx of [-1, 1]) p.addFold([V3(sx * 0.1, n.y - 0.1, -0.12), V3(sx * 0.06, n.y - 0.2, -0.14), V3(sx * 0.02, n.y - 0.32, -0.14)], { looks: jk, width: 2.2, slot: 2 });
  for (const [y, w] of [[pel.y + 0.2, 2.4], [pel.y + 0.14, 2.0]]) p.addFold([V3(-0.09, y, -0.14), V3(0.0, y - 0.015, -0.155), V3(0.08, y - 0.03, -0.14)], { looks: jk, width: w, slot: 3 });
  // the front placket and the pockets (always there, slot 4)
  const fr = (x, y) => V3(x, y, 0.2);
  p.addFold([fr(0.0, n.y - 0.05), fr(0.004, n.y - 0.2), fr(0.006, n.y - 0.35), fr(0.004, pel.y + 0.02), fr(0.002, pel.y - 0.06)], { looks: jk, width: 1.8, slot: 4 });
  for (const sx of [-1, 1]) p.addFold([fr(sx * 0.07, pel.y + 0.02), fr(sx * 0.12, pel.y + 0.015), fr(sx * 0.14, pel.y - 0.02)], { looks: jk, width: 1.6, slot: 4 });
  // trousers: knee creases (slot 5)
  const pt = [L('pants')];
  for (const s of ['l', 'r']) {
    const k = p.P(`calf_${s}`);
    const sx = s === 'l' ? 1 : -1;
    p.addFold([k.clone().add(V3(sx * 0.03, 0.03, 0.07)), k.clone().add(V3(0, 0.0, 0.085)), k.clone().add(V3(-sx * 0.03, -0.02, 0.075))], { looks: pt, width: 1.8, slot: 5 });
    p.addFold([k.clone().add(V3(sx * 0.02, 0.15, -0.07)), k.clone().add(V3(sx * 0.03, 0.0, -0.08)), k.clone().add(V3(sx * 0.02, -0.18, -0.07))], { looks: pt, width: 1.6, slot: 6 });
  }
  p.buildFolds();
}
function buildFoldsGirl(p, L) {
  const bl = [L('blouse')];
  let slot = 0;
  for (const s of ['l', 'r']) {
    const U = p.P(`upperarm_${s}`), E = p.P(`lowerarm_${s}`), H = p.P(`hand_${s}`);
    const u0 = E.clone().sub(U).normalize(), l0 = H.clone().sub(E).normalize();
    let inner = l0.clone().addScaledVector(u0, -l0.dot(u0));
    if (inner.lengthSq() < 1e-4) inner = V3(0, 0, 1).addScaledVector(u0, -u0.z);
    inner.normalize();
    const side = new THREE.Vector3().crossVectors(u0, inner).normalize();
    [[-0.02, 0.9], [0.0, 1.15], [0.022, 0.8]].forEach(([off, span], k) => {
      const pts = [];
      for (let a = 0; a <= 5; a++) {
        const t = -span / 2 + (span * a) / 5;
        pts.push(E.clone().addScaledVector(u0, off + 0.004 * k).addScaledVector(inner, Math.cos(t) * 0.07).addScaledVector(side, Math.sin(t) * 0.07));
      }
      p.addFold(pts, { looks: bl, width: 2.0 - 0.3 * k, slot });
    });
    slot++;
  }
  const n = p.P('neck_01'), m = p.meta;
  // the yoke seam across the back (always) and the tuck gathers at the waistband (slot 2 / 3)
  p.addFold([V3(-0.15, n.y - 0.07, -0.08), V3(-0.07, n.y - 0.085, -0.115), V3(0.0, n.y - 0.09, -0.12), V3(0.07, n.y - 0.085, -0.115), V3(0.15, n.y - 0.07, -0.08)], { looks: bl, width: 1.6, slot: 2 });
  for (const x of [-0.1, -0.04, 0.03, 0.09]) p.addFold([V3(x, m.waistY + 0.06, -0.13), V3(x + 0.004, m.waistY + 0.025, -0.14)], { looks: bl, width: 1.8, slot: 3 });
  for (const x of [-0.08, 0.0, 0.08]) p.addFold([V3(x, m.waistY + 0.06, 0.13), V3(x - 0.004, m.waistY + 0.025, 0.14)], { looks: bl, width: 1.6, slot: 3 });
  // the front buttons line (always, slot 2)
  p.addFold([V3(0.0, m.collarBase - 0.04, 0.2), V3(0.0, m.collarBase - 0.2, 0.2), V3(0.0, m.waistY + 0.03, 0.2)], { looks: bl, width: 1.4, slot: 2 });
  // skirt: long folds from the hips down, they swing with the cloth (slot 4)
  const sk = [L('skirt')];
  const sc = V3(...m.skirtCentre);
  for (const a of [0.4, 1.3, 2.3, 3.0, 3.9, 4.7, 5.6]) {
    const pts = [];
    for (let k = 0; k <= 5; k++) {
      const y = m.hipY - 0.06 + (m.skirtHem + 0.05 - (m.hipY - 0.06)) * (k / 5);
      pts.push(V3(sc.x + Math.sin(a) * 0.3, y, sc.z + Math.cos(a) * 0.3));
    }
    p.addFold(pts, { looks: sk, width: 2.0 + 0.4 * Math.sin(a * 3), slot: 4 });
  }
  p.buildFolds();
}
function foldWeights(p, M, who) {
  const w = p.own.uFoldW.value;
  if (who === 'seller') {
    w[0] = 0.5 + 0.6 * M.bend; w[1] = 0.5 + 0.6 * M.bend;
    w[2] = sm(0.3, 0.9, M.bend); w[3] = sm(0.2, 0.9, M.twist) * 0.9 + 0.2;
    w[4] = 0.8; w[5] = 0.7; w[6] = 0.6;
  } else {
    w[0] = 0.55 + 0.5 * M.bend; w[1] = 0.55 + 0.5 * M.bend;
    w[2] = 0.8; w[3] = 0.4 + 0.6 * M.twist;
    w[4] = 0.55 + 0.35 * (M.walk ?? 0);
  }
}
