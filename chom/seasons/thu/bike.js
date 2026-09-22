// Chớm world, season Thu: the flower seller's bicycle (the main thing, with the bottle in its basket) and the street tea stall.
//   flowerBike: an old step-through city bicycle (no badge), a wire basket in front, a flat bamboo tray tied on the rear rack,
//     bunches of October flowers (white field daisies, yellow chrysanthemums, a few muted asters and roses) wrapped in
//     newsprint, piled high. Built along local x (front = +x), parked on its stand.
//   teaStall: a low wooden box with the tea jug, a thermos, glasses, a dish of seeds, low plastic stools, a bare bulb on a wire.
//   standIn: TẠM (until people/xehoa exists): a simple standing figure for the seller or the girl.
import * as THREE from 'three';
import { V3, Batch, hero, mat, C, withC, TIER2 } from '../../core/build.js';

// the bike in the world: where it stands and where its front points
// parked on its stand on the pavement, across the frame, front toward the houses (+x), seen from its side
// (numbers agreed with people/xehoa, which parks its own bike on this mark: layout.bikeStop in seasons/thu/season.js)
//
// TRIED AND TURNED DOWN, 21/9 - [1.9, 0, -1.6], the move proposed on 18/9. It was built and measured, both frames and the
// rig:
//   - the phone frame does get what was hoped: the bottle 22 x 40 px -> 33 x 63 px, squint rank 4 -> 2;
//   - the wide frame loses it: the bottle slides to x 1331 of 1440 and falls to rank 8;
//   - and it breaks the acting. The seller's mark is 0.78 m in front of her tray, and the tray is the bike's back end, so
//     moving the bike 1.7 m up the street moves her work away from her: measured in the built rig, her shoulder ends up
//     1.14-1.22 m from the tray centre with an arm of 0.414 m. Her elbow locks straight (solveArm clamps at 0.990 of full
//     reach) at four moments of the loop and her hand still hangs 0.78-1.26 m short of the flowers she is meant to be
//     holding. (Measured at [2.6, 0, -3.3]: shoulder 0.78-0.86 m from the tray, the hand lands on it.)
//   - she cannot simply follow the bike: 1.7 m up the street puts her 1.11 m from the wide camera, inside the 1.2 m floor
//     for a main figure (contract 6), and at that range a 1.6 m woman is taller than a 900 px frame.
// So the bike stays where it is, and the phone frame was fixed where it was really wrong: the bottle's own box ended at
// x 390.2 of a 390 px frame, hard against the edge. seasons/thu/season.js YAW_NARROW turns the phone view 1.9 degrees
// further toward the houses, and the basket the bottle stands in was darkened (people/xehoa/bike.js, FL.daisyB).
// Together: squint rank 4 -> 1 on a phone, 33.9 -> 41.0, with the wide frame still rank 1.
export const BIKE = { at: [2.6, 0, -3.3], front: [1, 0, 0] };
const bikeYaw = () => Math.atan2(-BIKE.front[2], BIKE.front[0]);
export const bikeYawAngle = () => bikeYaw();
export const bikeToWorld = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyAxisAngle(V3(0, 1, 0), bikeYaw()).add(V3(...BIKE.at));
// the basket: local centre and the bottle's seat in it
const BASKET = { c: [0.7, 0.93, 0], w: 0.36, h: 0.24, d: 0.34 };
// the handlebar lamp (local): above and a little behind the bottle's cap
export const BIKE_LAMP = [0.72, 1.46, -0.02];
export const bikeLampWorld = () => bikeToWorld(...BIKE_LAMP);
// The bottle sits ON the wrapped bunch in the basket, so its foot must land on the real surface there, not hover over it.
// 0.007 above the basket's centre height is where that surface really is: measured with a ray into the built scene
// (qa.mjs item 26 reads the same number back — it was 33 mm too high before, 18/9).
const SEAT_UP = 0.007;
export const BOTTLE_SEAT = () => bikeToWorld(BASKET.c[0] - 0.02, BASKET.c[1] + SEAT_UP, 0.0);

const FL = {
  daisy: { petal: { col: '#b8b4a2', col2: '#fffaec', emit: 0.1, erode: 0.05, hilite: 0.3, scale: 16, bump: 0.6 }, eye: { col: '#8a6a10', col2: '#f0c040', erode: 0, hilite: 0.2, scale: 16, bump: 0.5 }, r: 0.024 },
  mumY: { petal: { col: '#9a7418', col2: '#f2cc58', emit: 0.05, erode: 0.2, hilite: 0.25, scale: 12, bump: 1.0 }, r: 0.04 },
  aster: { petal: { col: '#4a3a5a', col2: '#9a88b0', emit: 0.02, erode: 0.2, hilite: 0.2, scale: 12, bump: 1.0 }, r: 0.018 },
  rose: { petal: { col: '#5a3a3e', col2: '#b89088', emit: 0.02, erode: 0.2, hilite: 0.3, scale: 12, bump: 0.9 }, r: 0.032 },
};
// (21/9) The five bunches standing in the BASKET are the leftovers at the end of the evening, pushed to the back and the
// sides out of the bulb's pool, so they are painted as leftovers: next to no self-light, the white gone grey, the yellow brassy.
// The bottle is pale glass and pale glass shows against nothing when it stands among pale flowers. Hạ found the same thing
// on its tea tray (seasons/ha/season.js): darken the setting the bottle stands in, never the bottle. These must stay in step
// with people/xehoa/bike.js, which builds the bike the page really shows.
const FL_B = {
  daisyB: { petal: { col: '#6e6a5e', col2: '#a8a18e', emit: 0.02, erode: 0.08, hilite: 0.16, scale: 16, bump: 0.6 }, eye: { col: '#5a4610', col2: '#9c7c2c', emit: 0.02, erode: 0, hilite: 0.12, scale: 16, bump: 0.5 }, r: 0.022 },
  mumB: { petal: { col: '#6a5218', col2: '#a8832e', emit: 0.01, erode: 0.2, hilite: 0.16, scale: 12, bump: 1.0 }, r: 0.036 },
  asterB: { petal: { col: '#463862', col2: '#7e6c9a', emit: 0.02, erode: 0.2, hilite: 0.14, scale: 12, bump: 1.0 }, r: 0.019 },
};
Object.assign(FL, FL_B);
const STEM = withC(C.stem, { col: '#1e3426', col2: '#58784c' });
const NEWS = withC(C.paper, { col: '#6e6a62', col2: '#dcd6c6', scale: 7, erode: 0.3 });
const NEWS2 = withC(C.paper, { col: '#7a6a52', col2: '#e2cea4', scale: 7, erode: 0.3 });
// the newsprint in the basket, gone soft and grey: the paper the bottle really stands on, and the paper round the leftovers
const NEWS_B = withC(C.paper, { col: '#4a463e', col2: '#8e8676', scale: 7, erode: 0.34 });

export async function flowerBike(scene, R, slice = null) {
  const out = { sketchTargets: [], shadows: [], solids: [] };
  const body = new Batch();
  const frame = withC(C.body, { col: '#0e1c1c', col2: '#3a6a62', gloss: 0.85, hilite: 0.9 });
  const steel = withC(C.steel, { col: '#1a2024', col2: '#8a9aa0' });
  const tyre = C.tyre;
  const rw = 0.33;
  const wheelR = V3(-0.56, rw, 0), wheelF = V3(0.56, rw, 0);
  for (const c of [wheelR, wheelF]) {
    body.push(() => new THREE.TorusGeometry(rw, 0.022, 8, 40), true, { ...tyre, smooth: true }, mat(c));
    body.push(() => new THREE.TorusGeometry(rw - 0.03, 0.009, 5, 40), true, steel, mat(c));
    body.cyl(0.035, 0.035, 0.11, c, steel, 10, [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      body.rod(c.clone().add(V3(0, 0, k % 2 ? 0.035 : -0.035)), c.clone().add(V3(Math.cos(a) * (rw - 0.03), Math.sin(a) * (rw - 0.03), 0)), 0.0035, steel, 4);
    }
    // mudguard
    body.push(() => new THREE.TorusGeometry(rw + 0.04, 0.03, 4, 20, Math.PI * 0.8), true, withC(frame, { gloss: 0.6 }), mat(c, [0, 0, c.x > 0 ? 0.1 : Math.PI * 0.1], [1, 1, 1.4]));
  }
  // step-through frame (a ladies' city bike)
  const bb = V3(-0.05, 0.3, 0), seatPost = V3(-0.22, 0.84, 0), headLow = V3(0.44, 0.78, 0), head = V3(0.41, 0.96, 0);
  body.rod(bb, seatPost, 0.021, frame);
  body.tube([bb, V3(0.12, 0.42, 0), V3(0.3, 0.6, 0), headLow], 0.024, frame, 16, 8);
  body.tube([V3(0.0, 0.34, 0), V3(0.2, 0.6, 0), V3(0.4, 0.86, 0)], 0.019, frame, 12, 8);
  body.rod(headLow, head, 0.026, frame);
  for (const s of [-1, 1]) {
    body.rod(bb, V3(-0.56, rw, s * 0.05), 0.013, frame);
    body.rod(seatPost, V3(-0.56, rw, s * 0.05), 0.012, frame);
    body.rod(headLow, V3(0.56, rw, s * 0.045), 0.015, frame);
  }
  // chain guard, crank, pedals
  body.push(() => new THREE.CapsuleGeometry(0.07, 0.42, 4, 10), true, withC(frame, { col: '#0c1616' }), mat(V3(-0.3, rw, 0.07), [0, 0, Math.PI / 2], [1, 1, 0.25]));
  body.cyl(0.09, 0.09, 0.02, V3(-0.05, 0.3, 0.07), steel, 16, [Math.PI / 2, 0, 0]);
  body.box(0.09, 0.02, 0.05, V3(0.06, 0.2, 0.14), C.tyre);
  body.box(0.09, 0.02, 0.05, V3(-0.16, 0.4, -0.14), C.tyre);
  // saddle (worn brown leather) on its post
  body.rod(seatPost, V3(-0.24, 0.95, 0), 0.013, steel);
  body.blob(0.12, V3(-0.26, 0.98, 0), [1.35, 0.38, 0.8], withC(C.wood, { col: '#2a1610', col2: '#8a5234', gloss: 0.5, hilite: 0.6, vert: 0 }), 0.4, 1, 0.05);
  // swept handlebar with grips, a bell
  body.tube([V3(0.3, 1.1, -0.3), V3(0.42, 1.05, -0.16), V3(0.43, 1.0, 0), V3(0.42, 1.05, 0.16), V3(0.3, 1.1, 0.3)], 0.013, steel, 16, 6);
  body.rod(head, V3(0.43, 1.01, 0), 0.016, steel);
  for (const s of [-1, 1]) body.rod(V3(0.33, 1.095, s * 0.28), V3(0.26, 1.11, s * 0.34), 0.02, C.tyre);
  body.sphere(0.028, V3(0.4, 1.06, -0.2), [1, 0.6, 1], steel, 10);
  // kickstand (parked), rear rack
  body.rod(V3(-0.12, 0.3, 0.05), V3(-0.2, 0.0, 0.2), 0.01, steel);
  body.box(0.56, 0.02, 0.2, V3(-0.56, 0.76, 0), steel);
  for (const s of [-1, 1]) body.rod(V3(-0.32, 0.76, s * 0.09), V3(-0.56, rw, s * 0.06), 0.008, steel);
  // front basket: a wire basket on a bracket (woven sides, open top; the front side lower so the bottle shows)
  const B = BASKET;
  // (21/9) old, dull wire: a bright wire cage right in front of pale glass reads as one bright thing with it
  const wire = withC(steel, { col: '#1c2226', col2: '#5a666a', hilite: 0.3 });
  body.box(B.w, 0.012, B.d, V3(B.c[0], B.c[1] - B.h / 2, 0), wire);
  const rimY = B.c[1] + B.h / 2;
  const cage = (x0, z0, x1, z1, y1) => {
    for (let k = 0; k <= 6; k++) { const t = k / 6; const p = V3(x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t); body.rod(V3(p.x, B.c[1] - B.h / 2, p.z), V3(p.x, y1, p.z), 0.0045, wire, 4); }
    for (const y of [B.c[1] - B.h / 4, B.c[1], y1]) body.rod(V3(x0, y, z0), V3(x1, y, z1), 0.005, wire, 4);
  };
  const bx0 = B.c[0] - B.w / 2, bx1 = B.c[0] + B.w / 2, bz = B.d / 2;
  cage(bx0, -bz, bx1, -bz, rimY);
  cage(bx0, bz, bx1, bz, rimY - 0.05);
  cage(bx0, -bz, bx0, bz, rimY);
  cage(bx1, -bz, bx1, bz, rimY);
  body.rod(V3(0.44, 0.98, 0), V3(bx0, B.c[1] - 0.05, 0), 0.01, steel);
  body.rod(V3(0.56, rw, 0), V3(bx1 - 0.05, B.c[1] - B.h / 2, 0), 0.009, steel);
  // the flat bamboo tray tied on the rack, and its ropes
  body.cyl(0.46, 0.44, 0.06, V3(-0.6, 0.8, 0), withC(C.bamboo, { col: '#4a3c22', col2: '#c0a468', vert: 0 }), 28, [0, 0, 0.04]);
  body.push(() => new THREE.TorusGeometry(0.46, 0.016, 5, 36), true, withC(C.bamboo, { vert: 0 }), mat(V3(-0.6, 0.83, 0), [Math.PI / 2, 0, 0]));
  // the seller's night lamp: a bare bulb in a little tin shade on a bent wire stalk clipped to the handlebar,
  // hanging over the basket so the flowers show (it is what lights the bottle)
  const LP = V3(...BIKE_LAMP);
  const lampB = new Batch();
  lampB.tube([V3(0.4, 1.02, -0.12), V3(0.42, 1.3, -0.1), V3(0.5, 1.6, -0.04), V3(LP.x - 0.02, LP.y + 0.16, LP.z)], 0.006, steel, 16, 5);
  lampB.rod(V3(LP.x - 0.02, LP.y + 0.16, LP.z), V3(LP.x, LP.y + 0.08, LP.z), 0.003, C.tyre, 4);
  const tin = withC(C.steel, { col: '#2a3230', col2: '#9aaaa4', gloss: 0.7 });
  lampB.lathe([[0.065, 0.0], [0.06, 0.02], [0.025, 0.07], [0.008, 0.075], [0, 0.076]], V3(LP.x, LP.y, LP.z), tin, 18);
  lampB.lathe([[0, 0.07], [0.02, 0.066], [0.056, 0.02], [0.06, 0.001]], V3(LP.x, LP.y, LP.z), withC(tin, { col: '#c8b890', col2: '#fff0c8', emit: 0.6 }), 18);
  lampB.sphere(0.022, V3(LP.x, LP.y - 0.005, LP.z), [1, 1.2, 1], withC(C.kumquat, { col: '#ffc878', col2: '#fff6e0', emit: 1.8, hilite: 0, erode: 0 }), 12);
  const lampMesh = hero(lampB.merge(), { rims: false, tier: 0.02 });
  const bodyMesh = hero(body.merge(), { rimW: 2.1, rimOff: 1.3, cut: 0.5 });
  out.body = bodyMesh;

  // flowers: piled on the tray (bunches lying across it, heads out both sides and up), a few in the basket around the bottle
  const fb = new Batch({ wind: true });
  const sw = (x, y) => Math.max(0, y - 0.85) * 0.35;
  const flowerHead = (p, kind) => {
    const f = FL[kind];
    const r = f.r * (0.8 + 0.4 * R());
    const n = V3(R() - 0.5, 0.4 + R(), R() - 0.5).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), n);
    if (kind === 'daisy') {
      fb.push(() => {
        const disc = new THREE.CircleGeometry(r, 12);
        const pp = disc.attributes.position;
        for (let i = 1; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), a = Math.atan2(y, x); const k = 0.7 + 0.3 * Math.abs(Math.cos(6 * a)); pp.setXYZ(i, x * k, y * k, 0); }
        return disc;
      }, true, f.petal, new THREE.Matrix4().compose(p, q, V3(1, 1, 1)), sw, 2);
      fb.sphere(r * 0.32, p.clone().addScaledVector(n, r * 0.12), [1, 0.6, 1], f.eye, 6, [0, 0, 0], sw, 2);
    } else if (kind === 'mumY') {
      fb.blob(r, p, [1, 0.75, 1], f.petal, R() * 6, 1, 0.3, sw, 2);
    } else {
      fb.blob(r, p, [1, 0.85, 1], f.petal, R() * 6, 1, 0.22, sw, 2);
    }
  };
  const bunch = async (base, dir, len, kind, n, spread, paper = NEWS) => {
    const tip = base.clone().addScaledVector(dir, len);
    for (let i = 0; i < 5; i++) fb.rod(base.clone().add(V3(0, 0.01 * i, (i - 2) * 0.015)), tip.clone().add(V3((R() - 0.5) * spread, (R() - 0.5) * spread, (R() - 0.5) * spread)), 0.005, STEM, 4, 0.005, sw, 2);
    // the newsprint cone around the stems
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize());
    fb.push(() => new THREE.CylinderGeometry(0.075, 0.03, len * 0.55, 10, 1, true), true, paper, new THREE.Matrix4().compose(base.clone().addScaledVector(dir, len * 0.3), q, V3(1, 1, 0.8)), sw, 2);
    for (let i = 0; i < n; i++) flowerHead(tip.clone().add(V3((R() - 0.5) * spread * 2, (R() - 0.3) * spread * 1.2, (R() - 0.5) * spread * 2)), kind);
    // a few leaves
    for (let i = 0; i < 4; i++) fb.blob(0.03, tip.clone().add(V3((R() - 0.5) * spread * 2, -spread * 0.6, (R() - 0.5) * spread * 2)), [1.8, 0.3, 0.8], withC(C.leaf, { col: '#12241a', col2: '#48683e' }), R() * 6, 1, 0.1, sw, 2);
    if (slice) await slice('flower bunch');
  };
  const kinds = ['daisy', 'daisy', 'mumY', 'daisy', 'aster', 'daisy', 'mumY', 'rose', 'daisy', 'daisy', 'mumY', 'daisy'];
  // layer 1: lying across the tray, heads out to both sides
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1;
    const k = kinds[i];
    await bunch(V3(-0.9 + i * 0.085, 0.86 + (i % 3) * 0.03, side * 0.04), V3(0.12, 0.32 + R() * 0.2, side * (0.72 + R() * 0.2)).normalize(), 0.44, k, k === 'daisy' ? 34 : 16, 0.12, i % 3 ? NEWS : NEWS2);
  }
  // layer 2: standing up in the middle, toward the back
  for (let i = 0; i < 5; i++) {
    const k = kinds[8 + (i % 4)];
    await bunch(V3(-0.78 + i * 0.1, 0.9, (R() - 0.5) * 0.12), V3((R() - 0.5) * 0.9, 0.7, (R() - 0.5) * 0.9).normalize(), 0.26 + R() * 0.08, k, k === 'daisy' ? 38 : 18, 0.13, i % 2 ? NEWS2 : NEWS);
  }
  // in the basket: bunches standing at the back and the sides, so the bottle stands clear in front
  const bc = V3(...BASKET.c);
  await bunch(bc.clone().add(V3(-0.12, -0.04, -0.08)), V3(-0.3, 1, -0.35).normalize(), 0.3, 'daisyB', 30, 0.08, NEWS_B);
  await bunch(bc.clone().add(V3(0.02, -0.04, -0.12)), V3(0.15, 1, -0.5).normalize(), 0.28, 'mumB', 12, 0.07, NEWS_B);
  await bunch(bc.clone().add(V3(0.12, -0.05, -0.07)), V3(0.5, 1, -0.3).normalize(), 0.24, 'daisyB', 22, 0.07, NEWS_B);
  // the bundle the bottle stands on (a wrapped bunch lying in the basket): the darkest paper on the bike
  fb.add(new THREE.CylinderGeometry(0.07, 0.06, 0.26, 10), NEWS_B, mat(bc.clone().add(V3(0.0, -0.06, 0)), [0, 0, Math.PI / 2 - 0.15]), sw, 2);
  const fl = hero(fb.merge(), { wind: true, rims: false, tier: 0.04 });
  out.flowers = fl;

  const g = new THREE.Group();
  g.add(bodyMesh, fl, lampMesh);
  g.position.set(...BIKE.at);
  g.rotation.y = bikeYaw();
  scene.add(g);
  out.group = g;
  // painted shadows (x, z, r, height) and the solids for the clipping check
  for (const [lx, r] of [[-0.6, 0.5], [0.0, 0.35], [0.6, 0.3]]) {
    const p = bikeToWorld(lx, 0, 0);
    out.shadows.push([p.x, p.z, r, 1.3]);
    out.solids.push({ x: p.x, z: p.z, r: r * 0.9, h: 1.5, name: `flower bike ${lx}` });
  }
  return out;
}

// ---------------------------------------------------------------- the street tea stall (trà đá vỉa hè)
// by the power pole at the kerb, further down (the bulb hangs off the pole's cables). The first three stools are the
// sitters' (drawn with them, core crowd kinds sitTea / sitPipe); the fourth stands empty. The girl's way to the lane
// passes on the house side of it (x >= 3.0).
export const TEA = { at: [2.0, -11.9], stools: [[1.45, -11.4, 0], [1.5, -12.5, 1], [2.5, -12.7, 2], [2.45, -11.15, 0]], pole: [1.36, -13.4] };
export function teaStall(scene, R) {
  const out = { shadows: [], solids: [], bulb: null };
  const b = new Batch();
  const [tx, tz] = TEA.at;
  const T2 = TIER2 * 0.8;
  // the low wooden box the seller keeps everything in, a tray on top
  b.rbox(0.62, 0.36, 0.42, 0.012, V3(tx, 0.18, tz), C.wood, [0, 0.2, 0]);
  b.rbox(0.58, 0.03, 0.4, 0.008, V3(tx, 0.375, tz), withC(C.wood, { col: '#2a1c14', col2: '#6a4a34' }), [0, 0.2, 0]);
  // the big tea jug (a plastic cooler with a tap), a thermos, glasses of iced tea, a dish of sunflower seeds
  b.lathe([[0, 0], [0.12, 0], [0.13, 0.02], [0.13, 0.28], [0.11, 0.31], [0.05, 0.33], [0, 0.33]], V3(tx - 0.16, 0.39, tz - 0.06), withC(C.redPlastic, { col: '#1e3a5a', col2: '#6a94c0' }), 20);
  b.cyl(0.015, 0.015, 0.05, V3(tx - 0.03, 0.47, tz - 0.06), C.steel, 6, [0, 0, Math.PI / 2]);
  b.lathe([[0, 0], [0.055, 0], [0.058, 0.25], [0.04, 0.3], [0.03, 0.34], [0, 0.34]], V3(tx + 0.16, 0.39, tz + 0.1), withC(C.body, { col: '#3a1a18', col2: '#c0605a', gloss: 0.7 }), 16);
  for (const [dx, dz] of [[0.06, -0.12], [0.16, -0.08], [0.02, 0.1]]) {
    b.lathe([[0, 0], [0.028, 0], [0.034, 0.09], [0.03, 0.09], [0, 0.01]], V3(tx + dx, 0.39, tz + dz), { col: '#6a4214', col2: '#f0b050', gloss: 0.9, erode: 0.1, hilite: 1.1, scale: 8, emit: 0.06, bump: 0.4 }, 12);
  }
  b.cyl(0.07, 0.05, 0.03, V3(tx - 0.05, 0.4, tz + 0.12), withC(C.pot, { col: '#6a6a70', col2: '#c8c8c0' }), 14);
  // low plastic stools (blue and red), a small bench stool
  const stoolC = [withC(C.redPlastic, { col: '#1a3050', col2: '#5a88b8' }), C.redPlastic, withC(C.redPlastic, { col: '#1a3050', col2: '#4a7aa8' })];
  for (const [sx, sz, k] of TEA.stools.slice(3)) {
    const o = stoolC[k];
    b.rbox(0.3, 0.03, 0.3, 0.01, V3(sx, 0.27, sz), o);
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box(0.04, 0.26, 0.04, V3(sx + dx * 0.12, 0.13, sz + dz * 0.12), o, [dz * 0.1, 0, -dx * 0.1]);
    out.solids.push({ x: sx, z: sz, r: 0.2, h: 0.3, name: `tea stool ${sx},${sz}` });
  }
  out.solids.push({ x: tx, z: tz, r: 0.36, h: 0.75, name: 'tea box' });
  out.shadows.push([tx, tz, 0.4, 0.8]);
  // the bulb: hung on a wire from the shop's awning, a bare bulb in a little tin shade
  const L = V3(tx - 0.2, 2.2, tz - 0.3);   // = LIGHTS 'tea bulb' in light.js
  b.tube([V3(TEA.pole[0] + 0.1, 3.1, TEA.pole[1] + 0.1), V3((TEA.pole[0] + L.x) / 2, 2.85, (TEA.pole[1] + L.z) / 2), V3(L.x, L.y + 0.15, L.z)], 0.004, C.tyre, 8, 4);
  b.lathe([[0.01, 0.13], [0.04, 0.12], [0.1, 0.03], [0.11, 0.0], [0.1, 0.0], [0.03, 0.1], [0.01, 0.12]], L, withC(C.steel, { col: '#2a3230', col2: '#8a9a94', gloss: 0.6 }), 20);
  b.sphere(0.03, V3(L.x, L.y + 0.005, L.z), [1, 1.2, 1], withC(C.kumquat, { col: '#ffc070', col2: '#fff4d8', emit: 1.6, hilite: 0, erode: 0 }), 12);
  out.bulb = L;
  const m = hero(b.merge(), { rims: false, tier: T2 });
  scene.add(m);
  out.mesh = m;
  return out;
}

function shade(hex, k) { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); }

// ---------------------------------------------------------------- TẠM (chờ nhân vật chính): a simple standing stand-in, built in code
// who: 'seller' (conical hat, a bunch of daisies held out) or 'girl' (light blouse, hair in a low knot, a shoulder bag, hands
// forward to take the bunch). Local +z faces `face`. One painted mesh; the core draws its shadow.
export function standIn(scene, { who, at, face, top, legs }) {
  const b = new Batch();
  const cloth = withC(C.body, { col: shade(top, 0.42), col2: top, gloss: 0.25, hilite: 0.35, erode: 0.35 });
  const trou = withC(C.body, { col: shade(legs, 0.55), col2: legs, gloss: 0.2, hilite: 0.25, erode: 0.3 });
  const h = who === 'girl' ? 1.0 : 0.97;
  const Y = (v) => v * h;
  for (const s of [-1, 1]) {
    b.capsule(V3(s * 0.085, Y(0.84), 0), V3(s * 0.1, Y(0.1), s * 0.02), 0.068, trou);
    b.rbox(0.085, 0.05, 0.22, 0.02, V3(s * 0.1, 0.028, 0.05), withC(C.tyre, { col: '#1a1614', col2: '#5a4a40' }));
  }
  b.capsule(V3(0, Y(0.9), 0), V3(0, Y(1.28), 0.0), 0.14, cloth);
  b.sphere(0.16, V3(0, Y(1.33), 0), [1.12, 0.45, 0.72], cloth, 14);
  b.capsule(V3(0, Y(1.38), 0.0), V3(0, Y(1.46), 0.02), 0.045, C.skin);
  b.sphere(0.092, V3(0, Y(1.55), 0.01), [0.92, 1.08, 1.0], C.hair, 16);
  // arms reaching forward (to give or to take)
  for (const s of [-1, 1]) {
    const sh = V3(s * 0.18, Y(1.33), 0), el = V3(s * 0.21, Y(1.1), 0.14), ha = V3(s * 0.08, Y(1.12), 0.36);
    b.capsule(sh, el, 0.048, cloth);
    b.capsule(el, ha, 0.042, cloth);
    b.sphere(0.036, ha.clone().add(V3(0, 0, 0.03)), [0.9, 1.1, 1.2], C.skin, 8);
  }
  if (who === 'girl') {
    b.sphere(0.055, V3(0, Y(1.5), -0.1), [1.1, 0.9, 1], C.hair, 10);
    b.rbox(0.2, 0.15, 0.07, 0.02, V3(-0.2, Y(0.92), 0.02), withC(C.lacquer, { col: '#2a1612', col2: '#8a4a36' }), [0, 0, 0.1]);
    b.rod(V3(-0.2, Y(0.99), 0.02), V3(0.12, Y(1.36), 0.0), 0.008, C.tyre, 4);
  } else {
    // the conical hat, tilted forward over the face
    b.lathe([[0, -0.012], [0.12, -0.01], [0.25, 0], [0.24, 0.02], [0.03, 0.27], [0, 0.3]], V3(0, Y(1.56), 0.02), withC(C.straw, { col: '#4a3c28', col2: '#a8946c', hilite: 0.25 }), 24, [0.22, 0, 0]);
    // the bunch she holds out
    b.cyl(0.05, 0.02, 0.2, V3(0, Y(1.1), 0.42), NEWS, 10, [Math.PI / 2 - 0.4, 0, 0]);
    for (let i = 0; i < 14; i++) b.sphere(0.018, V3((Math.sin(i * 2.4)) * 0.06, Y(1.18) + Math.cos(i * 1.7) * 0.03, 0.52 + Math.sin(i * 3.1) * 0.04), [1, 0.6, 1], FL.daisy.petal, 6);
  }
  const m = hero(b.merge(), { rimW: 2.0, rimOff: 1.3, cut: 0.5 });
  m.position.set(at.x, 0, at.z);
  m.rotation.y = Math.atan2(face.x - at.x, face.z - at.z);
  scene.add(m);
  return m;
}
