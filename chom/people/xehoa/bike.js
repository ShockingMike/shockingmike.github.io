// Chớm people, autumn (people/xehoa): the seller's flower bicycle, parked, with everything on it.
// The look is the season's (seasons/thu/bike.js, flowerBike): an old step-through city bicycle (no badge), a wire basket,
// a flat bamboo tray on the rear rack piled with October flowers in newsprint, the little night lamp over the basket.
// What is new here, for the people:
//   - the bunch the girl buys (SOLD) and the bunch that takes its place (REFILL) are their own small meshes;
//   - a stock bundle at the back of the tray, under a sheet of newsprint: the refill comes out from under its edge;
//   - one static body (frame, wheels, spokes, crank, pedals, basket, tray, lamp stalk) and one flower mesh, for the budget;
//   - solids for the clipping check, and the handles people's hands go to (world).
// Local frame: +x = the front of the bike, +y up, +z = the bike's right (the eye's side when it faces +x).
import * as THREE from 'three';

export const BASKET = { c: [0.7, 0.93, 0], w: 0.36, h: 0.24, d: 0.34 };
export const LAMP = [0.72, 1.46, -0.02];
export const TRAY = { c: [-0.6, 0.83, 0], r: 0.46 };
// the sold bunch lies across the tray on the eye's side, heads toward the seller; the stock bundle sits behind it
export const SOLD = { base: [-0.52, 0.875, 0.02], dir: [0.7, 0.4, -0.6] };
// the stock: a newsprint parcel lying along the tray (toward the seller), its front end a flap she lifts
export const STOCK = { c: [-0.86, 0.915, -0.02], len: 0.46, w: 0.2, h: 0.13, front: 0.21 };
export const BUNCH_LEN = 0.44;
// The basket's own offset colour bands: see CAGE_RIM in buildBike. Thinner, barely offset, and mixed most of the way into
// the night so the cage stays drawn without lighting up. Numbers are read back by core/qa/squint.mjs, not chosen by eye.
export const CAGE_RIM = { w: 1.0, off: 0.7, cut: 0.72, warm: '#4e2c1e', cool: '#22403e' };
// what is in the bunch she sells: mostly cúc hoạ mi, a few thạch thảo, two chrysanthemums
const SOLD_MIX = ['daisyS', 'daisyS', 'daisyS', 'asterS', 'daisyS', 'daisyS', 'daisyS', 'daisyS', 'asterS', 'daisyS', 'mumY', 'daisyS'];
// Her lamp's light (core light 0, README 6b; the season stands it where this lamp mesh is, people.js aims it): a bare bulb
// under a small tin shade over the basket. The shade only stops the light going straight up, so it spills wide and is tipped
// back over the tray she works at: the bottle in the basket keeps the hot pool right under the bulb, and the flowers, the hat
// and both pairs of hands at the tray get the rest. The reach is kept short on purpose (2.9 m): a longer one lights the road
// behind the bike, and that bright ground then beats the bottle in the squint check (measured: 3.4 m puts the bottle 3rd).
export const LAMP_LIGHT = { radius: 2.9, color: '#ffd092', k: 1.8, cone: { dir: [-0.4, -1, 0.06], outer: 94, inner: 32 } };
// where a hand holds a bunch: along its axis from the base (the middle of the newsprint cone)
export const BUNCH_HOLD = 0.1;          // on the newsprint cone (about 5 cm across there)
export const BUNCH_HOLD_LOW = -0.05;    // on the bare stems below the paper (about 2.5 cm)

export async function buildBike(scene, R, core, { at, yaw }, slice = core.slice ? () => core.slice() : async () => {}) {
  // (built in slices: README 11)
  const { THREE: T } = core;
  const { Batch, hero, mat, C, withC } = core.build;
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  // October in Hanoi: cúc hoạ mi (small white daisies, yellow eye) are the flowers of the month, with a few purple asters
  // (thạch thảo) and yellow chrysanthemums. White petals hold their value under the lamp at night, so they carry the picture:
  // a little self-light (emit) keeps them off the night blue even where the lamp only grazes them.
  const FL = {
    daisy: { petal: { col: '#d2cec0', col2: '#fffdf6', emit: 0.26, erode: 0.05, hilite: 0.35, scale: 16, bump: 0.6 }, eye: { col: '#a8811a', col2: '#ffd85e', emit: 0.18, erode: 0, hilite: 0.25, scale: 16, bump: 0.5 }, r: 0.024 },
    mumY: { petal: { col: '#b08a1e', col2: '#ffdc74', emit: 0.12, erode: 0.2, hilite: 0.3, scale: 12, bump: 1.0 }, r: 0.04 },
    aster: { petal: { col: '#7c5cae', col2: '#dcc2ff', emit: 0.22, erode: 0.2, hilite: 0.25, scale: 12, bump: 1.0 }, eye: { col: '#a8811a', col2: '#ffd85e', emit: 0.16, erode: 0, hilite: 0.2, scale: 16, bump: 0.5 }, r: 0.021 },
    rose: { petal: { col: '#6e4a4e', col2: '#d0a8a0', emit: 0.05, erode: 0.2, hilite: 0.3, scale: 12, bump: 0.9 }, r: 0.032 },
  };
  // the bunch she sells is made of the best heads, picked bigger and packed tight, so it reads as one white shape across the
  // frame while it changes hands
  FL.daisyS = { petal: { ...FL.daisy.petal, col: '#dad6c8', emit: 0.36 }, eye: { ...FL.daisy.eye, emit: 0.26 }, r: 0.029 };
  FL.asterS = { petal: { ...FL.aster.petal, emit: 0.3 }, eye: { ...FL.aster.eye, emit: 0.22 }, r: 0.023 };
  // (21/9) The five bunches standing in the BASKET are not the ones she is selling: they are what is left at the end of the
  // evening, pushed to the back and the sides, out of the bulb's hot pool. They are painted as leftovers - no self-light, a
  // duller white, the yellow gone brassy - because the bottle is pale glass and pale glass has nothing to show against pale
  // flowers. This is the one move that worked in Hạ (seasons/ha/season.js): darken the setting the bottle stands in, never
  // the bottle. Read back with core/qa/squint.mjs at 390x844, on its own (phone view still aimed the old way): the bottle's
  // best window went 33.9 to 40.3 and rank 4 to rank 1, and not one light in the frame was touched. With the phone view's
  // new aim as well (seasons/thu/season.js YAW_NARROW) it is 41.0 against 37.4, first at t = 2, 9, 20 and 30 s of her loop.
  //
  // (21/9, later, the computer frame) The same three colours went down another step, and so did the paper (NEWS_B) and the
  // basket's rim bands (CAGE_RIM). The number that decides is now own share - take the bottle out of the scene and see how
  // much of the score in its own box goes with it (core/qa/squint.mjs, core/README 13) - and it wants 30%. Where each step
  // landed on 1440x900 at t = 2, as `with / without = share` (the middle column is the empty box: Đông, the season that
  // passes, reads 19.4 there):
  //     as it stood this morning                              30.6 / 25.9 = 15%
  //     + the basket's own rim bands turned down (CAGE_RIM)   26.5 / 20.1 = 24%
  //     + the basket's newsprint darkened (NEWS_B)            24.5 / 17.9 = 27%
  //     + these three leftovers darkened                      22.3 / 14.3 = 36%   PASS
  // Read back at t = 2, 9, 20, 30: 36, 37, 36, 37% on 1440x900 and 77% on 390x844 (it was 57% there before any of this).
  // Note what the table is really saying, because it is the whole lesson: every step took the WITH column down too, because
  // most of what that window was scoring was never the bottle. The bottle's own part of the score went the other way, 4.7
  // -> 6.4 -> 6.6 -> 8.0, without one light being changed and without the glass being touched at all.
  // WHICH thing was which was not guessed from the colours in this file: each material was painted magenta in turn and the
  // 48 px round the glass was shot again (README 13, "measure, do not guess"). That is how the pale slab behind the bottle
  // turned out to be NEWS_B and the brass lumps over it turned out to be mumB - and how the flowers on the TRAY (FL.daisy,
  // FL.mumY) were cleared: not one of their pixels lands in that box, so darkening them would have cost the picture the
  // white bunches she is selling and bought the bottle nothing.
  FL.daisyB = { petal: { col: '#3a382f', col2: '#6c6656', emit: 0, erode: 0.08, hilite: 0.07, scale: 16, bump: 0.4 }, eye: { col: '#342806', col2: '#5e4a18', emit: 0, erode: 0, hilite: 0.05, scale: 16, bump: 0.3 }, r: 0.022 };
  FL.mumB = { petal: { col: '#3a2d0e', col2: '#665020', emit: 0, erode: 0.2, hilite: 0.06, scale: 12, bump: 0.6 }, r: 0.036 };
  FL.asterB = { petal: { col: '#2a2340', col2: '#4e4462', emit: 0, erode: 0.2, hilite: 0.06, scale: 12, bump: 0.6 }, eye: { col: '#342806', col2: '#5e4a18', emit: 0, erode: 0, hilite: 0.05, scale: 16, bump: 0.3 }, r: 0.019 };
  const STEM = withC(C.stem, { col: '#26402c', col2: '#6a8a58' });
  const NEWS = withC(C.paper, { col: '#7e7a70', col2: '#e8e2d2', scale: 7, erode: 0.3 });
  const NEWS2 = withC(C.paper, { col: '#8a7450', col2: '#f0dcb0', scale: 7, erode: 0.3 });
  // the newsprint in the basket, gone soft and grey from a week of being rained on and dried again: the paper the bottle
  // actually stands on, and the paper round the leftovers beside it.
  // (21/9) It is the surface the glass stands up from, and it filled the lower half of the basket as a pale tan slab under
  // the bulb - the single biggest thing in the bottle's box after the rim bands. Darker, with the sheen (hilite) and the
  // grain (bump) taken down as well, because a dark ground that is still busy swallows the bottle just as a bright one does.
  const NEWS_B = withC(C.paper, { col: '#201e1a', col2: '#443f36', scale: 7, erode: 0.34, hilite: 0.08, bump: 0.5 });
  // the kraft paper the bunch she sells is wrapped in: lighter than newsprint, so the bunch reads as one shape
  const KRAFT = withC(C.paper, { col: '#9a7a4c', col2: '#f6e2b4', emit: 0.06, scale: 7, erode: 0.28 });
  const out = { solids: [], parts: {} };

  // ---------------------------------------------------------------- the body
  const body = new Batch({ wind: true });
  // the basket is merged on its own, because it is the one thing in this folder that stands directly behind the bottle
  // and it is the only thing here that may not wear the loud rim bands (CAGE_RIM, below the merge)
  const cageB = new Batch({ wind: true });
  const frame = withC(C.body, { col: '#0e1c1c', col2: '#3a6a62', gloss: 0.85, hilite: 0.9 });
  const steel = withC(C.steel, { col: '#1a2024', col2: '#8a9aa0' });
  const rw = 0.33;
  const wheelR = V3(-0.56, rw, 0), wheelF = V3(0.56, rw, 0);
  for (const c of [wheelR, wheelF]) {
    body.add(new T.TorusGeometry(rw, 0.022, 6, 28), { ...C.tyre, smooth: true }, mat(c));
    body.add(new T.TorusGeometry(rw - 0.03, 0.009, 4, 28), steel, mat(c));
    body.cyl(0.035, 0.035, 0.11, c, steel, 10, [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      body.rod(c.clone().add(V3(0, 0, k % 2 ? 0.035 : -0.035)), c.clone().add(V3(Math.cos(a) * (rw - 0.03), Math.sin(a) * (rw - 0.03), 0)), 0.0035, steel, 4);
    }
    body.add(new T.TorusGeometry(rw + 0.04, 0.03, 4, 20, Math.PI * 0.8), withC(frame, { gloss: 0.6 }), mat(c, [0, 0, c.x > 0 ? 0.1 : Math.PI * 0.1], [1, 1, 1.4]));
  }
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
  // chain guard, chainring, crank arms and pedals (still: she has parked)
  body.add(new T.CapsuleGeometry(0.07, 0.42, 4, 10), withC(frame, { col: '#0c1616' }), mat(V3(-0.3, rw, 0.07), [0, 0, Math.PI / 2], [1, 1, 0.25]));
  body.cyl(0.09, 0.09, 0.02, V3(-0.05, 0.3, 0.07), steel, 16, [Math.PI / 2, 0, 0]);
  body.rod(V3(-0.05, 0.3, 0.09), V3(0.06, 0.2, 0.1), 0.009, steel, 6);
  body.rod(V3(-0.05, 0.3, -0.09), V3(-0.16, 0.4, -0.1), 0.009, steel, 6);
  body.box(0.09, 0.02, 0.05, V3(0.06, 0.2, 0.14), C.tyre);
  body.box(0.09, 0.02, 0.05, V3(-0.16, 0.4, -0.14), C.tyre);
  // saddle
  body.rod(seatPost, V3(-0.24, 0.95, 0), 0.013, steel);
  body.blob(0.12, V3(-0.26, 0.98, 0), [1.35, 0.38, 0.8], withC(C.wood, { col: '#2a1610', col2: '#8a5234', gloss: 0.5, hilite: 0.6, vert: 0 }), 0.4, 1, 0.05);
  // handlebar, grips, bell
  body.tube([V3(0.3, 1.1, -0.3), V3(0.42, 1.05, -0.16), V3(0.43, 1.0, 0), V3(0.42, 1.05, 0.16), V3(0.3, 1.1, 0.3)], 0.013, steel, 16, 6);
  body.rod(head, V3(0.43, 1.01, 0), 0.016, steel);
  for (const s of [-1, 1]) body.rod(V3(0.33, 1.095, s * 0.28), V3(0.26, 1.11, s * 0.34), 0.02, C.tyre);
  body.sphere(0.028, V3(0.4, 1.06, -0.2), [1, 0.6, 1], steel, 10);
  // kickstand down, rear rack
  body.rod(V3(-0.12, 0.3, 0.05), V3(-0.2, 0.0, 0.2), 0.01, steel);
  body.box(0.56, 0.02, 0.2, V3(-0.56, 0.76, 0), steel);
  for (const s of [-1, 1]) body.rod(V3(-0.32, 0.76, s * 0.09), V3(-0.56, rw, s * 0.06), 0.008, steel);
  // ---------------------------------------------------------------- the wire basket (its own mesh: see CAGE_RIM below)
  const B = BASKET;
  // (21/9) the basket's own wire is old and dull: a bright wire cage right in front of pale glass reads as one bright thing
  const wire = withC(steel, { col: '#161b1e', col2: '#3e484c', hilite: 0.12, gloss: 0 });
  cageB.box(B.w, 0.012, B.d, V3(B.c[0], B.c[1] - B.h / 2, 0), wire);
  const rimY = B.c[1] + B.h / 2;
  const cage = (x0, z0, x1, z1, y1) => {
    for (let k = 0; k <= 6; k++) { const t = k / 6; const p = V3(x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t); cageB.rod(V3(p.x, B.c[1] - B.h / 2, p.z), V3(p.x, y1, p.z), 0.0045, wire, 4); }
    for (const y of [B.c[1] - B.h / 4, B.c[1], y1]) cageB.rod(V3(x0, y, z0), V3(x1, y, z1), 0.005, wire, 4);
  };
  const bx0 = B.c[0] - B.w / 2, bx1 = B.c[0] + B.w / 2, bz = B.d / 2;
  cage(bx0, -bz, bx1, -bz, rimY);
  cage(bx0, bz, bx1, bz, rimY - 0.05);
  cage(bx0, -bz, bx0, bz, rimY);
  cage(bx1, -bz, bx1, bz, rimY);
  cageB.rod(V3(0.44, 0.98, 0), V3(bx0, B.c[1] - 0.05, 0), 0.01, wire);
  cageB.rod(V3(0.56, rw, 0), V3(bx1 - 0.05, B.c[1] - B.h / 2, 0), 0.009, wire);
  // the bamboo tray and its rim
  body.cyl(TRAY.r, TRAY.r - 0.02, 0.06, V3(TRAY.c[0], 0.8, 0), withC(C.bamboo, { col: '#4a3c22', col2: '#c0a468', vert: 0 }), 22, [0, 0, 0.04]);
  body.add(new T.TorusGeometry(TRAY.r, 0.016, 4, 28), withC(C.bamboo, { vert: 0 }), mat(V3(TRAY.c[0], TRAY.c[1], 0), [Math.PI / 2, 0, 0]));
  // the night lamp: a bent wire stalk clipped to the handlebar, a tin shade, a bare bulb (it lights the basket and the bottle).
  // The shade and bulb move a hair in the breeze (sway), the stalk does not.
  const LP = V3(...LAMP);
  body.tube([V3(0.4, 1.02, -0.12), V3(0.42, 1.3, -0.1), V3(0.5, 1.6, -0.04), V3(LP.x - 0.02, LP.y + 0.16, LP.z)], 0.006, steel, 16, 5);
  const hang = (x, y) => Math.max(0, (LP.y + 0.17 - y)) * 0.25;
  body.rod(V3(LP.x - 0.02, LP.y + 0.16, LP.z), V3(LP.x, LP.y + 0.08, LP.z), 0.003, C.tyre, 4, 0.003, hang, 2);
  const tin = withC(C.steel, { col: '#2a3230', col2: '#9aaaa4', gloss: 0.7 });
  body.lathe([[0.065, 0.0], [0.06, 0.02], [0.025, 0.07], [0.008, 0.075], [0, 0.076]], V3(LP.x, LP.y, LP.z), tin, 18, [0, 0, 0], [1, 1, 1], hang, 2);
  body.lathe([[0, 0.07], [0.02, 0.066], [0.056, 0.02], [0.06, 0.001]], V3(LP.x, LP.y, LP.z), withC(tin, { col: '#c8b890', col2: '#fff0c8', emit: 0.6 }), 18, [0, 0, 0], [1, 1, 1], hang, 2);
  body.sphere(0.022, V3(LP.x, LP.y - 0.005, LP.z), [1, 1.2, 1], withC(C.kumquat, { col: '#ffc878', col2: '#fff6e0', emit: 1.8, hilite: 0, erode: 0 }), 12, [0, 0, 0], hang, 2);
  // the lamp's battery: a small box strapped to the down tube, its wire up to the stalk
  body.rbox(0.1, 0.07, 0.06, 0.008, V3(0.2, 0.62, -0.06), withC(C.tyre, { col: '#141618', col2: '#4a4e52' }), [0, 0, -0.95]);
  body.tube([V3(0.24, 0.66, -0.07), V3(0.36, 0.8, -0.1), V3(0.41, 1.0, -0.12)], 0.0025, C.tyre, 10, 4);
  await slice('bike 1');
  const bodyMerged = body.merge();
  await slice('bike 2');
  const bodyMesh = hero(bodyMerged, { wind: true, rimW: 2.1, rimOff: 1.3, cut: 0.5 });
  await slice('bike 3');
  bodyMesh.children.forEach((m) => { if (m !== bodyMesh.userData.main) m.userData.castShadow = false; });
  // CAGE_RIM. The offset colour bands (core/README 4) are vermilion and mint at full strength, and on a wire cage that is
  // forty little bars of them, every one of them right behind the glass. Measured on 1440x900 with core/qa/squint.mjs:
  // with the bottle taken out of the scene its own box still scored 26.0, against 19.4 for the same box in Đông, which is
  // the season that passes. So the bands are turned down HERE and only here: they are read off U.uRim1/U.uRim2, which is
  // ONE Colour object shared by every hero in the world, so a season that set those turned the bottle's own bands down
  // with them (measured earlier from the season: 15% -> 12.4%). Giving this mesh its own Colour touches nothing else.
  const cageMerged = cageB.merge();
  await slice('bike 3b');
  const cageMesh = hero(cageMerged, { wind: true, rimW: CAGE_RIM.w, rimOff: CAGE_RIM.off, cut: CAGE_RIM.cut, tier: 0.14 });
  cageMesh.children.forEach((m, i) => {
    if (m === cageMesh.userData.main) return;
    m.userData.castShadow = false;
    m.material.uniforms.uColor.value = new T.Color(i === 1 ? CAGE_RIM.warm : CAGE_RIM.cool);
  });

  // ---------------------------------------------------------------- flowers
  const fb = new Batch({ wind: true });
  const swAt = (base) => (x, y) => Math.max(0, y - base) * 0.35;
  const sw = swAt(0.85);
  // one head: a ring of petals (a notched disc) with a flat eye laid on it, or a small lumpy ball for a chrysanthemum.
  // Cheap on purpose: a head is 18 triangles, so the bike can carry a lot of flowers (see the count at the end of the file).
  const flowerHead = (bt, p, kind, rnd, swf, nIn) => {
    const f = FL[kind];
    const r = f.r * (0.8 + 0.4 * rnd());
    const n = (nIn ? nIn.clone().addScaledVector(V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5), 0.35) : V3(rnd() - 0.5, 0.4 + rnd(), rnd() - 0.5)).normalize();
    const q = new T.Quaternion().setFromUnitVectors(V3(0, 0, 1), n);
    if (f.eye) {
      const disc = new T.CircleGeometry(r, 10);
      const pp = disc.attributes.position;
      for (let i = 1; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), a = Math.atan2(y, x); const k = 0.7 + 0.3 * Math.abs(Math.cos(6 * a)); pp.setXYZ(i, x * k, y * k, 0); }
      bt.add(disc, f.petal, new T.Matrix4().compose(p, q, V3(1, 1, 1)), swf, 2);
      bt.add(new T.CircleGeometry(r * 0.34, 8), f.eye, new T.Matrix4().compose(p.clone().addScaledVector(n, r * 0.05), q, V3(1, 1, 1)), swf, 2);
    } else if (kind === 'mumY') {
      bt.blob(r, p, [1, 0.75, 1], f.petal, rnd() * 6, 0, 0.3, swf, 2);
    } else {
      bt.blob(r, p, [1, 0.85, 1], f.petal, rnd() * 6, 0, 0.22, swf, 2);
    }
  };
  // a bunch in newsprint: base at `base`, stems along `dir`
  const bunch = (bt, base, dir, len, kind, n, spread, paper, rnd, swf, faceAxis = null) => {
    const tip = base.clone().addScaledVector(dir, len);
    const side = new T.Vector3().crossVectors(dir, Math.abs(dir.y) > 0.9 ? V3(1, 0, 0) : V3(0, 1, 0)).normalize();
    // the stems, gathered: they stick out a hand's width below the paper, tied with a string
    const side2 = new T.Vector3().crossVectors(dir, side).normalize();
    const foot = base.clone().addScaledVector(dir, -0.1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const o = side.clone().multiplyScalar(Math.cos(a) * 0.006).addScaledVector(side2, Math.sin(a) * 0.006);
      bt.rod(foot.clone().add(o), tip.clone().add(V3((rnd() - 0.5) * spread, (rnd() - 0.5) * spread, (rnd() - 0.5) * spread)), 0.0035, STEM, 4, 0.0035, swf, 2);
    }
    bt.add(new T.TorusGeometry(0.012, 0.0022, 4, 10), withC(C.paper, { col: '#5a4028', col2: '#b89060' }), new T.Matrix4().compose(base.clone().addScaledVector(dir, -0.004), new T.Quaternion().setFromUnitVectors(V3(0, 0, 1), dir.clone().normalize()), V3(1, 1, 1)), swf, 2);
    const cone = new T.CylinderGeometry(0.068, 0.014, len * 0.55, 10, 1, true);
    const q = new T.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir.clone().normalize());
    bt.add(cone, paper, new T.Matrix4().compose(base.clone().addScaledVector(dir, len * 0.3), q, V3(1, 1, 0.8)), swf, 2);
    // the heads sit in a dome on the end of the bunch, each one looking out of it: from the eye they read as one mass of white.
    // faceAxis (the bunch's own frame): the way the bunch is turned when a hand holds it out. The dome is spread wider that
    // way and narrower across it, and the heads lean that way, so the flowers look at whoever the bunch is held out to.
    const pickKind = Array.isArray(kind) ? () => kind[Math.floor(rnd() * kind.length) % kind.length] : () => kind;
    const dome = dir.clone().normalize();
    let wide = side, across = side2, kW = 1, kA = 1;
    if (faceAxis) {
      wide = faceAxis.clone().addScaledVector(dome, -faceAxis.dot(dome)).normalize();
      across = new T.Vector3().crossVectors(dome, wide).normalize();
      kW = 1.35; kA = 0.8;
    }
    for (let i = 0; i < n; i++) {
      const u = Math.sqrt(rnd()) * spread, a = rnd() * Math.PI * 2;
      const outw = wide.clone().multiplyScalar(Math.cos(a) * u * kW).addScaledVector(across, Math.sin(a) * u * kA);
      const along = (1 - (u / spread) * (u / spread) * 0.85) * spread * 0.8 - spread * 0.35 + (rnd() - 0.5) * spread * 0.25;
      const q = tip.clone().add(outw).addScaledVector(dome, along);
      const look = outw.clone().addScaledVector(dome, spread * 0.85);
      if (faceAxis) look.addScaledVector(wide, spread * 0.8);
      flowerHead(bt, q, pickKind(), rnd, swf, look);
    }
    for (let i = 0; i < 4; i++) bt.blob(0.03, tip.clone().add(V3((rnd() - 0.5) * spread * 2, -spread * 0.6, (rnd() - 0.5) * spread * 2)), [1.8, 0.3, 0.8], withC(C.leaf, { col: '#16301e', col2: '#58804a' }), rnd() * 6, 0, 0.1, swf, 2);
  };
  await slice('bike 4');
  const kinds = ['daisy', 'daisy', 'mumY', 'daisy', 'aster', 'daisy', 'mumY', 'rose', 'daisy', 'daisy', 'aster', 'daisy'];
  // layer 1: lying across the tray, heads out to both sides (the slot of the sold bunch, heads to the far side, stays free)
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1;
    const k = kinds[i];
    const x = -0.9 + i * 0.085;
    // (clear round the slot: on the far side where the sold bunch lies, and on her side where she pulls it out)
    if (Math.abs(x - SOLD.base[0]) < (side * Math.sign(SOLD.dir[2]) > 0 ? 0.17 : 0.2)) continue;
    if (x < -0.74) continue;          // the stock parcel lies there
    // (the ones on the seller's side lie shorter and stand up more: she stands at the tray's edge)
    const near = side > 0;
    const d = near ? V3(0.2, 0.62 + R() * 0.1, 0.45 + R() * 0.08) : V3(0.12, 0.32 + R() * 0.2, side * (0.72 + R() * 0.2));
    bunch(fb, V3(x, 0.86 + (i % 3) * 0.03, side * 0.04), d.normalize(), near ? BUNCH_LEN * 0.85 : BUNCH_LEN, k, k === 'daisy' ? 34 : 16, near ? 0.085 : 0.12, i % 3 ? NEWS : NEWS2, R, sw);
    if (i % 2) await slice('bike 4b');
  }
  await slice('bike 5');
  // layer 2: standing up in the middle, toward the back
  for (let i = 0; i < 7; i++) {
    const k = kinds[8 + (i % 4)];
    // (the ones near the slot lean away from the sold bunch's heads)
    const lean = i >= 2 ? -R() * 0.45 : (R() - 0.5) * 0.9;
    // (kept to the far half of the tray, behind the seller: the near half is the eye's window on the sale)
    const bx = -0.92 + i * 0.062, bz = -0.03 - R() * 0.1 - (Math.abs(bx - SOLD.base[0]) < 0.12 ? 0.07 : 0);
    bunch(fb, V3(bx, 0.89, bz), V3(lean, 0.7, -R() * 0.45).normalize(), 0.23 + R() * 0.07, k, k === 'daisy' ? 32 : 16, 0.13, i % 2 ? NEWS2 : NEWS, R, sw);
    if (i % 2) await slice('bike 5b');
  }
  // small posies heaped along the near rim of the tray, heads out over it toward the eye: they fill the tray without standing
  // up into the space where the bunch changes hands (and they keep clear of the slot the sold bunch lies in)
  // (the end of the tray nearest the girl: the part of it the eye sees between the two of them. Her hands never go there -
  // she works between the parcel and the slot, further back - so the flowers can be heaped over the rim)
  for (let i = 0; i < 3; i++) {
    const k = i === 1 ? ['daisy', 'daisy', 'aster', 'daisy'] : 'daisy';
    bunch(fb, V3(-0.4 + i * 0.09, 0.862 + (i % 2) * 0.018, -0.03 + (i % 2) * 0.09), V3(0.12 + (R() - 0.5) * 0.3, 0.36 + R() * 0.1, 0.92).normalize(), 0.27, k, 26, 0.075, i % 2 ? NEWS : NEWS2, R, sw);
    await slice('bike 6b');
  }
  await slice('bike 6');
  // the stock parcel: newsprint wrapped round spare bunches, lying along the tray; the front end is a loose flap (its own mesh)
  const S = STOCK;
  {
    const shell = new T.CylinderGeometry(1, 1, S.len, 18, 4, true, -Math.PI * 0.62, Math.PI * 1.24);
    const p = shell.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const wob = 1 + 0.06 * Math.sin(y * 25 + x * 7) + 0.04 * Math.sin(y * 61);
      p.setXYZ(i, x * S.w * 0.5 * wob, y, z * S.h * wob);
    }
    shell.computeVertexNormals();
    // lying along z, the open side down on the tray
    fb.add(shell, withC(NEWS, { smooth: true, erode: 0.2 }), mat(V3(S.c[0], S.c[1] - S.h * 0.35, S.c[2]), [Math.PI / 2, 0, 0], [1, 1, 1]), 0, 2);
    // the back end: paper folded shut
    const cap = new T.CircleGeometry(1, 16, 0, Math.PI);
    cap.scale(S.w * 0.5, S.h, 1);
    fb.add(cap, withC(NEWS2, { smooth: true }), mat(V3(S.c[0], S.c[1] - S.h * 0.35, S.c[2] - S.len / 2), [0, Math.PI, 0]), 0, 2);
    // string round the middle
    fb.add(new T.TorusGeometry(1, 0.004, 4, 24, Math.PI * 1.1).scale(S.w * 0.52, S.h * 1.04, 1), withC(C.tyre, { col: '#3a2a1a', col2: '#9a7a50' }), mat(V3(S.c[0], S.c[1] - S.h * 0.35, S.c[2] - 0.06), [0, 0, -0.05 * Math.PI]), 0, 2);
  }
  // in the basket: bunches standing at the back and the sides, so the bottle stands clear in front
  const bc = V3(...BASKET.c);
  bunch(fb, bc.clone().add(V3(-0.12, -0.04, -0.08)), V3(-0.3, 1, -0.35).normalize(), 0.3, 'daisyB', 30, 0.085, NEWS_B, R, swAt(0.9));
  bunch(fb, bc.clone().add(V3(0.02, -0.04, -0.12)), V3(0.15, 1, -0.5).normalize(), 0.28, 'mumB', 14, 0.075, NEWS_B, R, swAt(0.9));
  bunch(fb, bc.clone().add(V3(0.12, -0.05, -0.07)), V3(0.5, 1, -0.3).normalize(), 0.24, 'daisyB', 24, 0.075, NEWS_B, R, swAt(0.9));
  await slice('bike 7a');
  // (the two at the ends lean away from the middle: the bottle keeps a clear, dark gap round it on the eye's side)
  bunch(fb, bc.clone().add(V3(-0.15, -0.05, 0.0)), V3(-0.6, 1, 0.12).normalize(), 0.26, 'asterB', 18, 0.07, NEWS_B, R, swAt(0.9));
  bunch(fb, bc.clone().add(V3(0.13, -0.05, -0.02)), V3(0.55, 1, 0.1).normalize(), 0.25, 'daisyB', 22, 0.07, NEWS_B, R, swAt(0.9));
  // the wrapped bunch the bottle really stands on (qa.mjs item 26 names it): the darkest paper on the bike
  fb.add(new T.CylinderGeometry(0.07, 0.06, 0.26, 10), NEWS_B, mat(bc.clone().add(V3(0.0, -0.06, 0)), [0, 0, Math.PI / 2 - 0.15]), 0, 2);
  await slice('bike 7');
  const flowersMerged = fb.merge();
  await slice('bike 8');
  const flowers = hero(flowersMerged, { wind: true, rims: false, tier: 0.04 });
  await slice('bike 9');

  const g = new T.Group();
  g.name = 'xehoa-bike';
  g.add(bodyMesh, cageMesh, flowers);
  g.position.copy(at);
  g.rotation.y = yaw;
  scene.add(g);
  g.updateMatrixWorld(true);
  out.group = g;
  out.toWorld = (x, y, z, o = new T.Vector3()) => o.set(x, y, z).applyMatrix4(g.matrixWorld);

  // ---------------------------------------------------------------- the two movable bunches (the same drawing: when the loop
  // wraps, the sold one is back in the slot and the refill back under the sheet, both out of sight or identical)
  const makeBunch = async (name) => {
    await slice('bike 10');
    const bt = new Batch({ wind: true });
    const rnd = (() => { let s = 97531; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    // the bunch she sells: white daisies with a few purple asters and two yellow mums, in kraft paper (44 cm from the stems'
    // feet to the highest head), so it reads as one bright shape when it changes hands
    bunch(bt, V3(0, 0, 0), V3(0, 1, 0), BUNCH_LEN, SOLD_MIX, 48, 0.098, KRAFT, rnd, (x, y) => Math.max(0, y - 0.25) * 0.3, V3(0, 0, 1));
    const merged = bt.merge();
    await slice('bike 11');
    const m = hero(merged, { wind: true, rims: false, tier: 0 });
    m.name = name;
    m.userData.main.castShadow = true;
    scene.add(m);
    return m;
  };
  out.sold = await makeBunch('xehoa-bunch-sold');
  out.refill = await makeBunch('xehoa-bunch-refill');
  await slice('bike 12');
  // the slot on the tray (world): position of the base and the quaternion taking +y to the bunch's direction
  const slotDir = V3(...SOLD.dir).normalize();
  out.slot = {
    p: out.toWorld(...SOLD.base),
    q: new T.Quaternion().setFromUnitVectors(V3(0, 1, 0), slotDir).premultiply(new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), yaw)),
  };
  // inside the parcel: the refill lies there, stems toward the seller, heads toward the back
  const insideDir = V3(0, 0.08, -1).normalize();
  // (turned on its axis so its +z looks down: a hand takes it from above, here and in the slot)
  const qIn = new T.Quaternion().setFromUnitVectors(V3(0, 1, 0), insideDir);
  qIn.premultiply(new T.Quaternion().setFromAxisAngle(insideDir, Math.PI));
  out.under = {
    p: out.toWorld(S.c[0], S.c[1] - S.h * 0.22, S.c[2] + S.len / 2 - 0.035),
    q: qIn.premultiply(new T.Quaternion().setFromAxisAngle(V3(0, 1, 0), yaw)),
  };
  // the parcel's front flap: a curved piece of newsprint hinged along its top edge (local x axis); open = lifted
  {
    const fbat = new Batch({ wind: true });
    const tall = new T.PlaneGeometry(S.w * 1.02, S.h * 1.25, 4, 3);
    const tp = tall.attributes.position;
    for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), y = tp.getY(i); tp.setZ(i, 0.012 * Math.cos((x / S.w) * Math.PI) * (0.5 - y / S.h)); }
    tall.computeVertexNormals();
    tall.translate(0, -S.h * 0.62, 0.004);
    fbat.add(tall, withC(NEWS2, { smooth: true, erode: 0.25 }), null, (x, y) => Math.max(0, -y) * 0.15, 2);
    const flapMesh = hero(fbat.merge(), { wind: true, rims: false, tier: 0.04 });
    flapMesh.userData.main.material.side = T.DoubleSide;
    const pivot = new T.Group();
    pivot.name = 'xehoa-parcel-flap';
    pivot.position.set(S.c[0], S.c[1] + S.h * 0.62, S.c[2] + S.len / 2 + 0.005);
    pivot.add(flapMesh);
    g.add(pivot);
    out.flap = pivot;
    // the flap's lower edge (local to the pivot), where a hand lifts it
    out.flapEdge = V3(0, -S.h * 1.2, 0.01);
  }
  out.lamp = out.toWorld(...LAMP);
  out.bottleSeat = out.toWorld(BASKET.c[0] - 0.02, BASKET.c[1] + 0.04, 0);
  out.trayCentre = out.toWorld(...TRAY.c);
  out.meshes = { body: bodyMesh, cage: cageMesh, flowers };
  await slice('bike 13');
  // (reading a geometry the core has not finished yet would finish it on the spot: wait for the queued shapes first)
  if (core.build.WORK) { await core.build.WORK.idle(); await slice('restart'); }
  await slice('flowers ready');
  // the top of the flowers on the tray under a world point (within r of it, in plan): where a hand can rest on them
  {
    const P = flowers.userData.main.geometry.attributes.position;
    const pts = [];
    for (let i = 0; i < P.count; i++) if (P.getX(i) <= 0.2) pts.push(P.getX(i), P.getY(i), P.getZ(i));
    const inv = new T.Matrix4();
    out.pileTop = (wx, wz, r = 0.06) => {
      g.updateMatrixWorld(true);
      inv.copy(g.matrixWorld).invert();
      const q = V3(wx, 0, wz).applyMatrix4(inv);
      let top = -1;
      for (let i = 0; i < pts.length; i += 3) if ((pts[i] - q.x) ** 2 + (pts[i + 2] - q.z) ** 2 < r * r && pts[i + 1] > top) top = pts[i + 1];
      return top < 0 ? null : V3(0, top, 0).applyMatrix4(g.matrixWorld).y;
    };
  }

  // solids for the clipping check (the whole bike as capsules along it) and the shapes the hands must stay out of
  for (const [lx, r] of [[-0.62, 0.52], [-0.1, 0.32], [0.35, 0.3], [0.72, 0.3]]) {
    const p = out.toWorld(lx, 0, 0);
    out.solids.push({ x: p.x, z: p.z, r, h: 1.5, name: `xehoa bike ${lx}` });
  }
  out.local = { BASKET, TRAY, LAMP, SOLD, STOCK };
  // is a point inside the parcel (a hand reaching in under the lifted flap)?
  const inv = new T.Matrix4().copy(g.matrixWorld).invert();
  out.parcelBox = (p, m = 0) => {
    const q = p.clone().applyMatrix4(inv);
    return Math.abs(q.x - S.c[0]) < S.w * 0.5 + m && q.y < S.c[1] + S.h * 0.62 + m && q.y > S.c[1] - S.h * 0.5 && q.z < S.c[2] + S.len / 2 + 0.06 + m && q.z > S.c[2] - S.len / 2;
  };
  return out;
}
