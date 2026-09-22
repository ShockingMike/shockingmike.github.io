// Chớm world, season Hạ: the lotus boat. A small sheet-metal boat (thuyền tôn) poled slowly along a channel through the pond:
// in from beyond the left edge of the frame, a stop where the picker bends over the far side for two flowers, then she turns
// round on the boat and poles it back out stern first (the channel is too narrow to turn the boat). The loop wraps out of sight.
// Speed rises and falls with each push of the pole (the cause of every change of speed); the pole's foot rings the water.
import * as THREE from 'three';
import { V3, Batch, hero, heroOf, withC, C, TIER2 } from '../../core/build.js';
import { WATER_Y } from './water.js';
import { lotusFlower, lotusBud, LC } from './lotus.js';

// float: how high the hull's origin (its rim line) rides above the water
export const BOAT = { z: -10, xOut: -15.6, xStop: -4.6, period: 64, tIn: 26, tPick: 40, tTurn: 46, len: 3.4, beam: 0.9, push: 3.2, float: 0.28 };
// the pickable plants stand just beyond the far side (z) of the stop, within her reach (she stands at about x -5.5 there);
// seen from the main camera the line to each bloom passes behind her bent back
export const PICK = [[-5.6, -10.9], [-5.0, -10.9]];
// the two buds she picks lie low under the pick leaves: z offset from PICK, height of their top above the water
export const PICK_BLOOM = { dz: 0.26, h: 0.08 };

// ---------------------------------------------------------------- the hull's real shape, published
// The season builds the boat from THESE numbers and hands the same object to the people folder (season.js
// peopleLayout.picker.hull), so nobody has to copy a boat by eye (core/README.md 13, rule 1).
// Boat-local: x along the hull (+x is the bow), y up from the rim line, z across. The rim line rides BOAT.float
// above the water, so world y = WATER_Y + BOAT.float + (boat-local y).
export const HULL = {
  len: BOAT.len, beam: BOAT.beam, float: BOAT.float,
  depth: 0.34,          // keel below the rim line amidships
  rise: 0.16,           // how much the gunwale lifts at bow and stern (sheer)
  taper: 3.2,           // how fast the beam runs out toward the ends
  sheerPow: 2.4,        // how the sheer climbs toward the ends
  rocker: 0.55,         // how much the keel lifts toward the ends
  plank: 0.02,          // radius of the rolled rim along each gunwale
  // the two thwarts (cross benches) and the board she stands on: half sizes are not used, these are full sizes
  thwarts: [{ x: -0.3, y: -0.02, len: 0.12, thick: 0.03, span: BOAT.beam * 0.86 }, { x: 0.7, y: -0.02, len: 0.12, thick: 0.03, span: BOAT.beam * 0.86 }],
  board: { x: -1.0, y: -0.224, len: 0.9, thick: 0.025, width: 0.36, fromX: -1.45, toX: -0.55 },
  deckY: -0.212,        // top of the board she stands on (boat-local y)
  poleLen: 4.2, poleR: [0.022, 0.03],
};
// the hull's cross-section at a point along it (boat-local). e = how far out toward the ends, 0 amidships, 1 at the tip
const hullE = (x) => Math.abs(2 * x / HULL.len);
export const hullHalf = (x) => (HULL.beam / 2) * Math.sqrt(Math.max(0.02, 1 - hullE(x) ** HULL.taper));   // half the beam
export const hullSheer = (x) => HULL.rise * hullE(x) ** HULL.sheerPow;                                    // the gunwale's lift
export const hullBottom = (x) => -HULL.depth * (1 - HULL.rocker * hullE(x) ** 2);                         // the keel

// distance travelled with a pole: speed pulses with each push and eases in and out; normalised so the trip is exactly `dist`
function tripTable(dur, dist, { easeIn = 2.5, easeOut = 5 } = {}) {
  const n = Math.ceil(dur * 120);
  const s = new Float32Array(n + 1);
  let acc = 0;
  for (let i = 1; i <= n; i++) {
    const t = (i / n) * dur;
    const base = Math.min(1, t / easeIn) * Math.min(1, (dur - t) / easeOut);
    const pulse = 1 + 0.7 * Math.sin((2 * Math.PI * t) / BOAT.push - Math.PI / 2);
    acc += Math.max(0, base) * pulse * (dur / n);
    s[i] = acc;
  }
  for (let i = 0; i <= n; i++) s[i] = (s[i] / acc) * dist;
  return (t) => { const f = THREE.MathUtils.clamp(t / dur, 0, 1) * n; const i = Math.min(n - 1, Math.floor(f)); return s[i] + (s[i + 1] - s[i]) * (f - i); };
}
const D = BOAT.xStop - BOAT.xOut;
const IN = tripTable(BOAT.tIn, D);
const OUT = tripTable(BOAT.period - BOAT.tTurn, D, { easeIn: 5, easeOut: 2.5 });

// where the boat is at time t: x, heading of the hull (always bow +x), the way it moves, its speed, and what the picker is doing
export function boatAt(t) {
  const P = BOAT.period;
  const tm = ((t % P) + P) % P;
  let x, v, dir = 1, phase, u = 0;
  const dt = 1 / 60;
  if (tm < BOAT.tIn) {
    x = BOAT.xOut + IN(tm); v = (IN(tm + dt) - IN(tm)) / dt; phase = 'in'; u = tm / BOAT.tIn;
  } else if (tm < BOAT.tTurn) {
    // stopped: the last of the way runs out slowly
    const k = tm - BOAT.tIn;
    x = BOAT.xStop + 0.12 * (1 - Math.exp(-k / 3)); v = 0.04 * Math.exp(-k / 3);
    phase = tm < BOAT.tPick ? 'pick' : 'turn'; u = tm < BOAT.tPick ? k / (BOAT.tPick - BOAT.tIn) : (tm - BOAT.tPick) / (BOAT.tTurn - BOAT.tPick);
  } else {
    const k = tm - BOAT.tTurn;
    x = BOAT.xStop + 0.12 - OUT(k) * (D + 0.12) / D; v = (OUT(k + dt) - OUT(k)) / dt; dir = -1; phase = 'out'; u = k / (P - BOAT.tTurn);
  }
  // the hull rocks a little with each push and settles when still
  const push = ((tm % BOAT.push) / BOAT.push);
  return { x, z: BOAT.z, v, dir, phase, u, tm, push, visible: true };
}

// ---------------------------------------------------------------- the boat itself
function hullGeo() {
  const NI = 18, NJ = 10;
  const P = [], I = [];
  for (let i = 0; i <= NI; i++) {
    const x = (i / NI - 0.5) * HULL.len;
    const half = hullHalf(x);
    const sheer = hullSheer(x);
    const bottom = hullBottom(x);
    for (let j = 0; j <= NJ; j++) {
      const a = (j / NJ) * Math.PI;         // 0 = one gunwale, pi = the other, round under the keel
      const y = bottom + (sheer - bottom) * (1 - Math.sin(a) ** 0.6);
      const zz = -Math.cos(a) * half * (0.75 + 0.25 * Math.cos(a) ** 2);
      P.push(x, y + (j === 0 || j === NJ ? sheer : 0) * 0, zz);
    }
  }
  for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) {
    const a = i * (NJ + 1) + j, b = a + NJ + 1;
    I.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

export function buildBoat(scene, R) {
  const group = new THREE.Group();
  scene.add(group);
  const b = new Batch();
  // sheet metal painted a faded blue-green, as the lake's boats are; it reads against the dark pond water
  const tin = withC(C.body, { col: '#1e4650', col2: '#7ab0ae', gloss: 0.5, hilite: 0.7, erode: 0.3, scale: 4 });
  const hull = hullGeo();
  b.add(hull, tin, null);
  // a rolled rim along both gunwales, two thwarts, a board to stand on
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const x = (i / 14 - 0.5) * HULL.len * 0.985;
      pts.push(V3(x, hullSheer(x), s * hullHalf(x)));
    }
    b.tube(pts, HULL.plank, withC(C.wood, { col: '#3a2a20', col2: '#9a7050' }), 28, 6);
  }
  for (const w of HULL.thwarts) b.box(w.len, w.thick, w.span, V3(w.x, w.y, 0), withC(C.wood, { col: '#3a2a20', col2: '#9a7050' }));
  // the board she stands on lies low in the hull, so the sides hide her legs to the knee
  // (it rests where the hull is 0.36 wide, at y -0.237 there, so it never pokes through the sides)
  b.box(HULL.board.len, HULL.board.thick, HULL.board.width, V3(HULL.board.x, HULL.board.y, 0), withC(C.wood, { col: '#3a2a20', col2: '#9a7050' }));
  // the day's picking, laid in the bow: flowers on a bed of leaves
  const cargo = new Batch({ wind: true });
  for (let k = 0; k < 5; k++) {
    // (small enough to lie inside the hull, which narrows toward the bow)
    const lf = new THREE.CircleGeometry(0.14 + R() * 0.04, 12);
    lf.rotateX(-Math.PI / 2 + (R() - 0.5) * 0.4);
    cargo.add(lf, LC.leafQ, new THREE.Matrix4().makeTranslation(0.45 + k * 0.16, -0.1 + k * 0.01, (R() - 0.5) * 0.16), 0.02, 4);
  }
  for (let k = 0; k < 8; k++) {
    const p = V3(0.35 + R() * 0.8, -0.06 + R() * 0.04, (R() - 0.5) * 0.4);
    const up = V3(1, 0.3 + R() * 0.4, (R() - 0.5) * 0.8).normalize();
    if (k % 3 === 0) lotusFlower(cargo, p, { up, open: 0.35, size: 1.2, R, sway: 0.02, tree: 4, pod: false, quiet: true });
    else lotusBud(cargo, p, { up, size: 1.3, sway: 0.02, tree: 4, quiet: true });
  }
  const body = hero(b.merge(), { rims: false, tier: TIER2 });
  body.userData.main.material.side = THREE.DoubleSide;
  group.add(body);
  const load = heroOf(cargo, { wind: true, rims: false, tier: TIER2 });
  group.add(load);
  // the long bamboo pole (sào)
  const pb = new Batch();
  pb.cyl(HULL.poleR[0], HULL.poleR[1], HULL.poleLen, V3(0, 0, 0), withC(C.bamboo, { col: '#4a4030', col2: '#c8b884', scale: 6 }), 8);
  const pole = hero(pb.merge(), { rims: false, tier: TIER2 });
  scene.add(pole);
  // the two flowers the picker brings up (they appear in her hand below the gunwale, out of sight)
  const picked = [];
  for (let k = 0; k < 2; k++) {
    const fb = new Batch();
    fb.rod(V3(0, -0.35, 0), V3(0, 0, 0), 0.006, LC.stem, 5);
    // (0.97: the open flower measures about 7.2 cm across. At 1.2 it was 9 cm and its petals touched her hand and her hat)
    if (k === 0) lotusFlower(fb, V3(0, 0, 0), { open: 0.45, size: 0.97, R, pod: false, quiet: true });
    else lotusBud(fb, V3(0, 0, 0), { size: 1.05, quiet: true });
    const f = heroOf(fb, { rims: false, tier: TIER2 });
    f.visible = false;
    scene.add(f);
    picked.push(f);
  }
  return { group, body, load, pole, picked, deckY: HULL.deckY, hull: HULL };
}
