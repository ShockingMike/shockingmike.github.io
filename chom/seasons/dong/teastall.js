// Chớm world, season Đông: the tea stall on the riverside pavement (quán trà đá) and the low houses' porch things.
//   buildTeaStall(scene, R, { at, ry })  the bamboo bed (chõng), the kettle on its little coal stove, the glasses, the jar
//     of peanut brittle, the tin of tea, the low stools and the bulb on its bamboo pole. The Chớm bottle stands on the bed
//     beside the kettle, under the bulb: the woman who keeps the stall was given it, and it lives here with her things.
//   porchThings(scene, R, spots)         pots, a birdcage, a washing line, a bicycle leaning under the eaves
import * as THREE from 'three';
import { V3, Batch, hero, mat, C, withC, TIER2 } from '../../core/build.js';

const BAMBOO = withC(C.bamboo, { col: '#4a4028', col2: '#b8a470', scale: 9, bump: 1.2 });
const TIN = withC(C.steel, { col: '#2a2e32', col2: '#9aa2a8', gloss: 0.75, hilite: 0.9, scale: 6 });

// the stall: everything stands on the pavement, the bed along the road (its long side facing the eye)
export function buildTeaStall(scene, R, { at, ry = 0 }) {
  const out = { solids: [], sketch: [] };
  const c = Math.cos(ry), s = Math.sin(ry);
  const P = (x, y, z) => V3(at.x + x * c + z * s, y, at.z - x * s + z * c);
  const b = new Batch();
  // ---- the bamboo bed (chõng tre): a slatted top on four legs, a worn rail along the back
  const topY = 0.44;
  for (let k = 0; k < 9; k++) b.box(1.72, 0.035, 0.062, P(0, topY, -0.28 + k * 0.07), BAMBOO, [0, ry, 0]);
  for (const dx of [-0.78, 0.78]) b.cyl(0.035, 0.035, 0.66, P(dx, topY - 0.03, 0), BAMBOO, 10, [0, ry, Math.PI / 2]);
  for (const dx of [-0.72, 0.72]) for (const dz of [-0.25, 0.25]) b.cyl(0.032, 0.036, topY, P(dx, topY / 2, dz), BAMBOO, 8, [0, ry, 0]);
  for (const dx of [-0.72, 0.72]) b.cyl(0.025, 0.025, 0.5, P(dx, 0.16, 0), BAMBOO, 8, [Math.PI / 2, ry, 0]);
  // ---- the kettle on its clay stove, at the far end of the bed
  const st = P(0.56, 0, 0.02);
  b.lathe([[0, 0], [0.13, 0], [0.15, 0.06], [0.14, 0.26], [0.16, 0.28], [0, 0.26]], st, withC(C.pot, { col: '#4a2e22', col2: '#a06a48', gloss: 0.2 }), 18);
  b.rbox(0.05, 0.035, 0.02, 0.006, st.clone().add(V3(-0.13, 0.1, 0.03)), withC(C.kumquat, { col: '#c0400c', col2: '#ffa040', emit: 1.1, hilite: 0 }), [0, ry, 0]);
  const kettle = st.clone().add(V3(0, 0.3, 0));
  b.lathe([[0, 0], [0.11, 0.01], [0.13, 0.06], [0.12, 0.14], [0.07, 0.17], [0.065, 0.19], [0.05, 0.19], [0.05, 0.17], [0, 0.17]], kettle, TIN, 20);
  b.add(new THREE.TorusGeometry(0.075, 0.008, 6, 14, Math.PI), TIN, mat(kettle.clone().add(V3(0, 0.2, 0)), [0, ry, 0]));
  // the spout: one pair of ends, and both the mouth and the way steam leaves it are read off that same pair, so the
  // steam can never point somewhere the spout does not
  const spoutA = kettle.clone().add(V3(0.1, 0.09, 0)), spoutB = kettle.clone().add(V3(0.2, 0.15, 0));
  b.rod(spoutA, spoutB, 0.014, TIN, 6);
  out.steam = spoutB.clone().addScaledVector(spoutB.clone().sub(spoutA).normalize(), 0.023);
  out.steamDir = spoutB.clone().sub(spoutA).normalize();
  // ---- the wooden tea crate at the near end of the bed: the bottle stands on it, a hand above the glasses, right under
  // the bulb, where the woman who keeps the stall can see it while she pours
  // This crate is the thing the bottle stands on, and that makes its colour a layout decision, not a wood decision.
  // It sits directly under the bulb, so a fresh pale pine lid took the light and the glass had nothing to stand out
  // against: on a phone the bottle's own share of its patch measured 26% against a bar of 30%. An old tea crate that
  // has lived out on this pavement is dark — soaked with rain, smoked by the stove, rubbed black where hands take hold
  // — so darkening it is both the true colour and the thing that gives the glass its ground. Measured, computer and
  // phone, after every change: node core/qa/squint.mjs dong <dir> [2 390 844].  (The lesson this repeats: make the
  // FACE THE THING STANDS ON darker; never brighten the thing itself, never dim whatever is stealing the eye.)
  const crate = P(-0.20, topY, -0.02);
  const CRATE = withC(C.wood, { col: '#3c2a1c', col2: '#8a6640', scale: 6, bump: 1.15 });
  b.rbox(0.31, 0.15, 0.25, 0.008, crate.clone().add(V3(0, 0.075, 0)), CRATE, [0, ry, 0]);
  b.rbox(0.33, 0.018, 0.27, 0.006, crate.clone().add(V3(0, 0.158, 0)), withC(C.wood, { col: '#46301e', col2: '#997048', scale: 7 }), [0, ry, 0]);
  for (const dz of [-0.11, 0.11]) b.rbox(0.31, 0.02, 0.02, 0.004, crate.clone().add(V3(0, 0.1, dz)), withC(C.wood, { col: '#2c1e12', col2: '#6a4c2c', scale: 8 }), [0, ry, 0]);
  // ---- on the bed: the tray of glasses, the jar of peanut brittle, a tin of tea, a saucer of quất, a pack of cigarettes
  const tray = P(0.10, topY, 0.02);
  b.rbox(0.36, 0.02, 0.26, 0.006, tray.clone().add(V3(0, 0.01, 0)), withC(C.steel, { col: '#3a3e42', col2: '#8a9298', gloss: 0.6 }), [0, ry, 0]);
  for (let k = 0; k < 6; k++) {
    const gx = 0.0 + (k % 3) * 0.1, gz = -0.05 + Math.floor(k / 3) * 0.1;
    b.lathe([[0, 0], [0.026, 0], [0.03, 0.02], [0.031, 0.07], [0.028, 0.072], [0.026, 0.02], [0, 0.015]], P(gx, topY + 0.02, gz), withC(C.mumW, { col: '#7a8078', col2: '#dceae4', gloss: 0.85, hilite: 1.1, erode: 0.2 }), 14);
  }
  const jar = P(0.38, topY + 0.02, -0.20);
  b.lathe([[0, 0], [0.1, 0], [0.11, 0.04], [0.11, 0.2], [0.09, 0.23], [0.1, 0.25], [0.07, 0.25], [0, 0.23]], jar, withC(C.mumW, { col: '#6a7068', col2: '#cfe0d8', gloss: 0.8, hilite: 1.0, erode: 0.15 }), 18);
  for (let k = 0; k < 7; k++) b.blob(0.035, jar.clone().add(V3((R() - 0.5) * 0.1, 0.05 + R() * 0.1, (R() - 0.5) * 0.1)), [1, 0.6, 1], withC(C.straw, { col: '#8a6020', col2: '#e0b060' }), k, 1, 0.25);
  b.cyl(0.05, 0.05, 0.12, P(-0.30, topY + 0.06, 0.21), withC(C.redPlastic, { col: '#6a2a1a', col2: '#c07a4a' }), 12, [0, ry, 0]);
  // ---- the bulb on a bamboo pole at the kerb side of the bed, its wire looping to the eaves
  const pole = P(-0.78, 0, 0.40);
  const bulb = P(-0.20, 1.86, -0.04);
  b.cyl(0.03, 0.035, 2.2, pole.clone().add(V3(0, 1.1, 0)), BAMBOO, 8);
  b.rod(pole.clone().add(V3(0, 2.15, 0)), bulb.clone().add(V3(0, 0.2, 0)), 0.016, BAMBOO, 6);
  b.rod(bulb.clone().add(V3(0, 0.2, 0)), bulb.clone().add(V3(0, 0.04, 0)), 0.004, C.tyre, 4);
  b.sphere(0.02, bulb, [1, 1.2, 1], withC(C.kumquat, { col: '#ffc070', col2: '#fff0c8', emit: 0.32, hilite: 0, erode: 0 }), 12);
  // a tin shade over it, the way a stall keeps the glare out of its customers' eyes and the light on the table
  b.lathe([[0.035, 0.115], [0.145, 0.0], [0.15, 0.012], [0.04, 0.125]], bulb.clone().add(V3(0, 0.02, 0)), withC(C.steel, { col: '#22262a', col2: '#6a7278', gloss: 0.5, scale: 5 }), 18);
  b.lathe([[0, 0.112], [0.138, 0.005], [0.138, 0.012], [0, 0.118]], bulb.clone().add(V3(0, 0.02, 0)), withC(C.kumquat, { col: '#6b4019', col2: '#b48a56', emit: 0.1, hilite: 0 }), 18);
  // ---- three low plastic stools round the bed
  const stools = [P(-0.55, 0, -0.62), P(0.15, 0, -0.66), P(0.95, 0, -0.5)];
  const stoolCols = [['#1e3a6a', '#4a7ab8'], ['#7a1c18', '#d05a4a'], ['#1e4a3a', '#4a9a7a']];
  stools.forEach((p, i) => {
    const col = withC(C.redPlastic, { col: stoolCols[i][0], col2: stoolCols[i][1], gloss: 0.55, scale: 5 });
    b.rbox(0.3, 0.035, 0.3, 0.012, p.clone().add(V3(0, 0.28, 0)), col, [0, ry + i * 0.3, 0]);
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const lx = dx * 0.12, lz = dz * 0.12, cc = Math.cos(ry + i * 0.3), ss = Math.sin(ry + i * 0.3);
      const px = lx * cc + lz * ss, pz = -lx * ss + lz * cc;
      b.rod(p.clone().add(V3(px * 1.1, 0, pz * 1.1)), p.clone().add(V3(px * 0.9, 0.27, pz * 0.9)), 0.018, col, 6);
    }
  });
  const mesh = hero(b.merge(), { rims: false, tier: 0.04 });
  mesh.name = 'dong-tea-stall';   // named so keepout.mjs can switch it off and measure it by pixels, not by guesswork
  scene.add(mesh);
  out.mesh = mesh;
  out.bulb = bulb;
  mesh.userData.bulb = bulb.clone();   // published for keepout.mjs: the bulb is a lamp the page must not cover
  out.stove = st.clone().add(V3(0, 0.15, 0));
  // the glass stands on the crate's lid: 0.44 (bed) + 0.158 + 0.009 (lid) = 0.607. Measure the GLASS, never the whole
  // group - the sketch ring and the glint are drawn deliberately outside it, and reading those gives a false number.
  out.bottleAt = P(-0.20, topY + 0.167, -0.02);
  out.seats = stools;
  out.solids = [
    ...[-0.62, 0, 0.62].map((dx) => { const q = P(dx, 0, 0); return { x: q.x, z: q.z, r: 0.27, h: 0.6, name: 'tea bed' }; }),
    { x: pole.x, z: pole.z, r: 0.06, h: 2.2, name: 'tea stall pole' },
  ];
  return out;
}

// ---------------------------------------------------------------- the things that live under the eaves of the low houses
// spots: [{ at: V3 (on the pavement, by the wall), kind }]
export function porchThings(scene, R, spots) {
  const b = new Batch();
  const out = { solids: [] };
  for (const sp of spots) {
    const p = sp.at;
    if (sp.kind === 'pots') {
      const n = 1 + Math.floor(R() * 2);
      for (let k = 0; k < n; k++) {
        const q = p.clone().add(V3(0, 0, k * 0.34));
        const r = 0.11 + R() * 0.05, h = 0.2 + R() * 0.1;
        b.lathe([[0, 0], [r * 0.8, 0], [r, h * 0.8], [r * 1.05, h], [0, h * 0.95]], q, withC(C.pot, { col: '#4a2e22', col2: '#9a6044' }), 16);
        for (let j = 0; j < 5; j++) b.blob(r * 0.62, q.clone().add(V3((R() - 0.5) * 0.2, h + 0.06 + R() * 0.14, (R() - 0.5) * 0.2)), [1, 0.85, 1], j % 2 ? withC(C.leaf, { col: '#1a2e22', col2: '#4a6a48' }) : withC(C.mum, { col: '#8a7a2a', col2: '#d8c060' }), j + k, 1, 0.3);
      }
      out.solids.push({ x: p.x, z: p.z + 0.2, r: 0.3, h: 0.5, name: 'porch pots' });
    } else if (sp.kind === 'cage') {
      const hang = p.clone().add(V3(0, 2.05, 0));
      b.rod(hang, hang.clone().add(V3(0, 0.25, 0)), 0.008, withC(C.wood, { col: '#3a3030', col2: '#5a4a40' }), 4);
      b.cyl(0.13, 0.13, 0.3, hang.clone().add(V3(0, -0.15, 0)), withC(C.bamboo, { col: '#4a3a2a', col2: '#a88858' }), 12, [0, 0, 0], 0, 0, true);
      b.add(new THREE.SphereGeometry(0.13, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), withC(C.bamboo, { col: '#4a3a2a', col2: '#a88858' }), mat(hang.clone().add(V3(0, 0, 0))));
      b.cyl(0.14, 0.14, 0.03, hang.clone().add(V3(0, -0.31, 0)), withC(C.bamboo, { col: '#3a2a20', col2: '#7a5a3a' }), 12);
    } else if (sp.kind === 'ganh') {
      // a seller's gánh set down for a rest: two baskets, the carrying pole still across them, a conical hat on top
      const ry = sp.ry ?? 0, c = Math.cos(ry), s = Math.sin(ry);
      const Q = (x, y, z) => p.clone().add(V3(x * c + z * s, y, -x * s + z * c));
      const cane = withC(C.bamboo, { col: '#5a4620', col2: '#c0a068', scale: 8 });
      const cane2 = withC(C.bamboo, { col: '#463618', col2: '#a08850', scale: 9 });
      for (const dx of [-0.52, 0.52]) {
        b.lathe([[0, 0], [0.2, 0.02], [0.24, 0.16], [0.26, 0.26], [0.24, 0.27], [0.21, 0.18], [0.17, 0.04], [0, 0.03]], Q(dx, 0, 0), cane, 16);
        b.add(new THREE.TorusGeometry(0.25, 0.018, 5, 16), cane2, mat(Q(dx, 0.265, 0), [0, ry, 0]));
        for (let k = 0; k < 3; k++) b.blob(0.09, Q(dx + (k - 1) * 0.07, 0.3, (k % 2 - 0.5) * 0.08), [1, 0.7, 1], withC(C.straw, { col: '#7a6a2a', col2: '#c8b060' }), k, 1, 0.3);
      }
      b.rod(Q(-0.62, 0.42, 0), Q(0.62, 0.46, 0), 0.028, cane2, 6);                     // the pole, laid across the rims
      b.lathe([[0, 0.1], [0.1, 0.075], [0.2, 0.03], [0.22, 0], [0.21, 0], [0.1, 0.055], [0, 0.085]], Q(0.18, 0.47, 0.1), withC(C.straw, { col: '#8a7436', col2: '#ddc588' }), 16, [0.5, ry, 0.2]);
      out.solids.push({ x: Q(-0.5, 0, 0).x, z: Q(-0.5, 0, 0).z, r: 0.28, h: 0.5, name: 'gánh basket' });
      out.solids.push({ x: Q(0.5, 0, 0).x, z: Q(0.5, 0, 0).z, r: 0.28, h: 0.5, name: 'gánh basket' });
    } else if (sp.kind === 'bike') {
      const ry = sp.ry ?? 0;
      const c = Math.cos(ry), s = Math.sin(ry);
      const Q = (x, y, z) => p.clone().add(V3(x * c + z * s, y, -x * s + z * c));
      for (const dx of [-0.52, 0.52]) b.add(new THREE.TorusGeometry(0.33, 0.02, 6, 22), withC(C.tyre, { col: '#1a1a1e', col2: '#4a4a52' }), mat(Q(dx, 0.33, 0), [0, ry, 0]));
      b.rod(Q(-0.52, 0.33, 0), Q(0.16, 0.62, 0), 0.022, withC(C.steel, { col: '#2a3a4a', col2: '#7a8a9a' }), 6);
      b.rod(Q(0.52, 0.33, 0), Q(0.3, 0.95, 0), 0.02, withC(C.steel, { col: '#2a3a4a', col2: '#7a8a9a' }), 6);
      b.rod(Q(-0.52, 0.33, 0), Q(0.05, 0.9, 0), 0.02, withC(C.steel, { col: '#2a3a4a', col2: '#7a8a9a' }), 6);
      b.rbox(0.24, 0.05, 0.1, 0.02, Q(-0.2, 0.92, 0), withC(C.body, { col: '#241e1e', col2: '#5a4a44' }), [0, ry, 0]);
      b.rod(Q(0.3, 0.98, -0.2), Q(0.3, 0.98, 0.2), 0.016, withC(C.steel, { col: '#2a3a4a', col2: '#7a8a9a' }), 5);
      // its real footprint: a long thin thing, so three small circles along it instead of one fat one
      for (const dx of [-0.5, 0, 0.5]) out.solids.push({ x: p.x + dx * c, z: p.z - dx * s, r: 0.22, h: 1.0, name: 'bicycle' });
    }
  }
  const mesh = hero(b.merge(), { rims: false, tier: TIER2 });
  scene.add(mesh);
  out.mesh = mesh;
  return out;
}
