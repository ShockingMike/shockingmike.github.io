// Chớm world, season Đông: the corn seller's pavement brazier and her things.
//   buildBrazier(scene, R, { at }) -> { group, coals, grillY, cob(world), turnCob(k), shadows, solids, sketch, caps }
// A small charcoal stove (a rusted tin bucket lined with clay) on a low stand, a wire grill with corn cobs, a basket of
// raw corn in green husks, a pile of stripped husks, a roll of paper bags, low plastic stools.
import * as THREE from 'three';
import { V3, Batch, hero, heroOf, mat, C, withC, TIER2 } from '../../core/build.js';

const CORN = withC(C.kumquat, { col: '#a8741a', col2: '#f0c860', emit: 0.02, hilite: 0.6, gloss: 0.3, scale: 26, bump: 1.4, erode: 0.1 });
const CHAR = withC(C.bark, { col: '#1a1210', col2: '#5a3a24', scale: 20, erode: 0.2 });
const HUSK = withC(C.leaf, { col: '#4a5a2a', col2: '#b8c070', gloss: 0.1, erode: 0.35, scale: 9, bump: 1.2 });
const HUSKDRY = withC(C.straw, { col: '#7a6a40', col2: '#d8c890', scale: 9 });

// a cob along local x, with char marks laid three-fold round it (so a third of a turn looks the same)
function cob(b, c, len = 0.19, r = 0.03, rotY = 0, R, husk = false) {
  const prof = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; prof.push([r * (0.55 + 0.45 * Math.sin(Math.PI * (0.12 + 0.8 * u)) ** 0.6) * (1 - 0.25 * u), (u - 0.5) * len]); }
  prof[0][0] = 0.004; prof[10][0] = 0.004;
  b.lathe(prof, c, CORN, 18, [0, rotY, Math.PI / 2]);
  const dir = V3(Math.cos(rotY), 0, -Math.sin(rotY));
  for (let k = 0; k < 9; k++) {
    const a = (k % 3) * (Math.PI * 2 / 3) + 0.4 + ((k * 7) % 3) * 0.2;
    const along = ((k * 0.37) % 1 - 0.5) * len * 0.7;
    const n = V3(0, Math.cos(a), Math.sin(a));
    n.applyAxisAngle(V3(0, 1, 0), rotY);
    b.blob(r * 0.42, c.clone().addScaledVector(dir, along).addScaledVector(n, r * 0.78), [1.3, 0.5, 1], CHAR, k * 1.7, 1, 0.2);
  }
  if (husk) {
    // the husk pulled back into a handle at one end
    for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(0.02, 0.12, 5, 1, true), HUSKDRY, mat(c.clone().addScaledVector(dir, len * 0.5 + 0.05), [0, rotY, -Math.PI / 2 + (k - 1) * 0.35]));
  }
}

export function buildBrazier(scene, R, { at }) {
  const out = { shadows: [], solids: [], sketch: [] };
  const P = (x, y, z) => V3(at.x + x, y, at.z + z);
  const b = new Batch();
  // the stand and the stove
  const tin = withC(C.steel, { col: '#241a16', col2: '#8a5a3c', gloss: 0.3, erode: 0.45, hilite: 0.4, scale: 7, bump: 1.1 });
  for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.3; b.rod(P(Math.cos(a) * 0.17, 0.0, Math.sin(a) * 0.17), P(Math.cos(a) * 0.13, 0.1, Math.sin(a) * 0.13), 0.012, tin, 5); }
  b.lathe([[0, 0.08], [0.15, 0.08], [0.16, 0.1], [0.2, 0.34], [0.23, 0.35], [0.22, 0.36], [0.18, 0.33], [0, 0.33]], P(0, 0, 0), tin, 28);
  // the clay lining shows at the lip
  b.lathe([[0.17, 0.31], [0.195, 0.345], [0.185, 0.35], [0.165, 0.32]], P(0, 0, 0), withC(C.pot, { col: '#5a3a2a', col2: '#b07a54', gloss: 0.1 }), 28);
  // the draught hole at the bottom, glowing
  b.rbox(0.07, 0.05, 0.02, 0.008, P(-0.155, 0.16, 0.06), withC(C.kumquat, { col: '#c0400c', col2: '#ffa040', emit: 1.2, hilite: 0 }), [0, -1.2, 0]);
  // the wire grill
  const wire = withC(C.steel, { col: '#18161a', col2: '#5a5456', gloss: 0.4, scale: 10 });
  b.add(new THREE.TorusGeometry(0.235, 0.005, 5, 32), wire, mat(P(0, 0.4, 0), [Math.PI / 2, 0, 0]));
  for (let k = -4; k <= 4; k++) { const z = k * 0.05, hw = Math.sqrt(Math.max(0, 0.235 ** 2 - z * z)); b.rod(P(-hw, 0.4, z), P(hw, 0.4, z), 0.003, wire, 4); }
  for (const x of [-0.23, 0.23]) b.rod(P(x * 0.9, 0.34, 0), P(x, 0.4, 0), 0.004, wire, 4);
  // the corn on the grill, one cob to a row, clear of each other (the one the seller turns is built apart, in the row
  // nearest her; around its husk handle, 0.10-0.22 m along it, nothing comes closer than 6 cm, so her fingers find room)
  const cobs = [[-0.06, -0.05, 0.03], [0.04, 0.04, -0.06], [-0.07, 0.13, 0.04]];
  for (const [x, z, ry] of cobs) cob(b, P(x, 0.432, z), 0.2, 0.03, ry, R, true);
  out.cobs = cobs.map(([x, z, ry]) => ({ at: P(x, 0.432, z), ry, len: 0.2 }));
  out.grill = { at: P(0, 0.4, 0), r: 0.235 };
  const stove = heroOf(b, { rims: true, rimW: 1.8, rimOff: 1.1, tier: 0.02 });
  stove.name = 'dong-brazier';   // named for keepout.mjs (measured by pixels, like the coals below)
  scene.add(stove);
  // (no sketch outline here: the white loose line belongs to the bottle alone, it is the page's sign that the
  // bottle can be pressed)
  out.solids.push({ x: at.x, z: at.z, r: 0.26, h: 0.45, name: 'brazier' });
  out.shadows.push([at.x, at.z, 0.24, 0.22, 0.45]);

  // the coals: live charcoal in the stove, glowing from deep red to hot yellow
  const cb = new Batch();
  for (let k = 0; k < 16; k++) {
    const a = R() * 6.28, rr = Math.sqrt(R()) * 0.15;
    const hot = R();
    cb.blob(0.028 + R() * 0.02, P(Math.cos(a) * rr, 0.33 + R() * 0.03, Math.sin(a) * rr), [1, 0.7, 1],
      withC(C.kumquat, { col: hot > 0.6 ? '#ff5a10' : hot > 0.3 ? '#b8280c' : '#3a1410', col2: hot > 0.6 ? '#ffd070' : '#ff7a30', emit: 0.4 + hot * 1.6, hilite: 0, erode: 0.05, scale: 30, bump: 1.5 }), k * 1.3, 1, 0.25);
  }
  for (let k = 0; k < 6; k++) { const a = R() * 6.28, rr = 0.06 + R() * 0.1; cb.blob(0.018, P(Math.cos(a) * rr, 0.355, Math.sin(a) * rr), [1, 0.5, 1], withC(C.mumW, { col: '#6a625e', col2: '#b8b0a8', emit: 0.05 }), k, 1, 0.3); }
  const coals = hero(cb.merge(), { rims: false, tier: 0 });
  coals.name = 'dong-brazier-coals';
  scene.add(coals);
  out.coals = coals;
  out.glowAt = P(0, 0.42, 0);

  // the cob the seller turns: on its own, spun about its own axis
  const tb = new Batch();
  cob(tb, V3(0, 0, 0), 0.21, 0.031, 0, R, true);
  const turned = hero(tb.merge(), { rims: true, rimW: 1.6, rimOff: 1.0, tier: 0.02 });
  const tg = new THREE.Group();
  tg.name = 'dong-brazier-cobs';
  tg.position.copy(P(-0.02, 0.434, -0.14));
  tg.rotation.y = 0.12;
  tg.add(turned);
  scene.add(tg);
  out.turnCob = (k) => { turned.rotation.x = k * (Math.PI * 2 / 3); };
  out.cobAt = tg.position.clone();
  return out;
}

// the seller's things and the stools: secondary tier
export function buildStallThings(scene, R, { basketAt, huskAt, stools, bagAt }) {
  const out = { shadows: [], solids: [] };
  const b = new Batch();
  // a round bamboo basket (thúng) of raw corn in green husks
  const bam = withC(C.bamboo, { col: '#4a3a24', col2: '#a88a58', scale: 12, bump: 1.3 });
  b.lathe([[0, 0], [0.2, 0.0], [0.27, 0.08], [0.29, 0.2], [0.3, 0.22], [0.28, 0.22], [0.26, 0.1], [0, 0.03]], basketAt, bam, 30);
  b.add(new THREE.TorusGeometry(0.29, 0.015, 6, 30), bam, mat(basketAt.clone().add(V3(0, 0.22, 0)), [Math.PI / 2, 0, 0]));
  for (let k = 0; k < 13; k++) {
    const a = R() * 6.28, rr = Math.sqrt(R()) * 0.2;
    const p = basketAt.clone().add(V3(Math.cos(a) * rr, 0.23 + R() * 0.05 + (k > 8 ? 0.05 : 0), Math.sin(a) * rr));
    const ry = R() * 6.28;
    b.lathe([[0.004, -0.13], [0.03, -0.09], [0.036, 0.0], [0.03, 0.09], [0.012, 0.15], [0.003, 0.2]], p, HUSK, 10, [0.2 * (R() - 0.5), ry, Math.PI / 2 + (R() - 0.5) * 0.3]);
  }
  out.shadows.push([basketAt.x, basketAt.z, 0.3, 0.3, 0.35]);
  out.solids.push({ x: basketAt.x, z: basketAt.z, r: 0.3, h: 0.35, name: 'corn basket' });
  // stripped husks and silk on the pavement, and a plastic crate she sits beside
  for (let k = 0; k < 16; k++) {
    const a = R() * 6.28, rr = Math.sqrt(R()) * 0.28;
    b.add(new THREE.PlaneGeometry(0.05, 0.2, 1, 3).rotateX(-Math.PI / 2 + 0.1), k % 3 ? HUSKDRY : HUSK, mat(huskAt.clone().add(V3(Math.cos(a) * rr, 0.01 + k * 0.002, Math.sin(a) * rr)), [0, R() * 6.28, (R() - 0.5) * 0.3]));
  }
  const crate = withC(C.redPlastic, { col: '#1e3a5a', col2: '#5a8ab0', gloss: 0.5, scale: 6 });
  b.rbox(0.42, 0.28, 0.3, 0.02, bagAt.clone().add(V3(0, 0.14, 0)), crate);
  for (let k = 0; k < 4; k++) b.box(0.43, 0.02, 0.31, bagAt.clone().add(V3(0, 0.05 + k * 0.065, 0)), withC(crate, { col: '#142a44', col2: '#3a6a90' }));
  // a stack of paper bags and a roll of plastic bags on it
  b.box(0.2, 0.05, 0.14, bagAt.clone().add(V3(-0.06, 0.305, 0)), withC(C.paper, { col: '#6a5238', col2: '#d8b888' }), [0, 0.2, 0]);
  b.cyl(0.035, 0.035, 0.13, bagAt.clone().add(V3(0.12, 0.315, 0.02)), withC(C.mumW, { col: '#8a8a8e', col2: '#e8e8ec', gloss: 0.5 }), 12, [Math.PI / 2, 0, 0.3]);
  out.shadows.push([bagAt.x, bagAt.z, 0.24, 0.18, 0.4]);
  out.solids.push({ x: bagAt.x, z: bagAt.z, r: 0.24, h: 0.4, name: 'crate' });
  // low plastic stools (blue, red), the kind every pavement in Hanoi has
  for (const s of stools) {
    const st = withC(C.redPlastic, { col: s.col[0], col2: s.col[1], gloss: 0.55, scale: 5 });
    const c = s.at;
    b.rbox(0.3, 0.035, 0.3, 0.012, c.clone().add(V3(0, s.h - 0.018, 0)), st, [0, s.ry ?? 0, 0]);
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const lx = dx * 0.12, lz = dz * 0.12, cs = Math.cos(s.ry ?? 0), sn = Math.sin(s.ry ?? 0);
      const px = lx * cs + lz * sn, pz = -lx * sn + lz * cs;
      b.rod(c.clone().add(V3(px * 1.1, 0, pz * 1.1)), c.clone().add(V3(px * 0.9, s.h - 0.03, pz * 0.9)), 0.018, st, 6);
    }
  }
  const things = hero(b.merge(), { rims: false, tier: TIER2 });
  scene.add(things);
  out.mesh = things;
  return out;
}

// ---------------------------------------------------------------- down the lane: a night noodle stall on the near pavement
// a low table with a pot of broth on a little charcoal stove, bowls, a bare bulb on a bamboo pole. Secondary tier.
//   buildNoodleStall(scene, R, { at }) -> { solids, bulb, steam, seats }
export function buildNoodleStall(scene, R, { at }) {
  const P = (x, y, z) => V3(at.x + x, y, at.z + z);
  const b = new Batch();
  const wood = withC(C.wood, { col: '#3a2a20', col2: '#8a6a4c' });
  // the low table
  b.rbox(0.5, 0.04, 0.8, 0.01, P(0, 0.42, 0), wood);
  for (const [dx, dz] of [[-0.2, -0.34], [0.2, -0.34], [0.2, 0.34], [-0.2, 0.34]]) b.box(0.035, 0.4, 0.035, P(dx, 0.2, dz), wood);
  // bowls, chopsticks in a cup, a bottle of fish sauce
  for (const [dx, dz] of [[0.1, -0.2], [0.08, 0.18], [-0.1, 0.02]]) {
    b.lathe([[0, 0], [0.035, 0], [0.06, 0.04], [0.065, 0.05], [0, 0.04]], P(dx, 0.44, dz), withC(C.mumW, { col: '#8a8478', col2: '#ece6d6', gloss: 0.6 }), 14);
  }
  b.cyl(0.03, 0.03, 0.1, P(-0.14, 0.49, -0.24), withC(C.redPlastic, { col: '#2a4a6a', col2: '#6a8aa8' }), 10);
  for (let k = 0; k < 6; k++) b.rod(P(-0.14 + (k - 2.5) * 0.008, 0.5, -0.24), P(-0.14 + (k - 2.5) * 0.012, 0.66, -0.24 + (k % 2) * 0.01), 0.003, C.bamboo, 4);
  // the stove and the big pot, beside the table
  const st = P(0.05, 0, -1.2);
  b.lathe([[0, 0.05], [0.14, 0.05], [0.17, 0.3], [0.15, 0.32], [0, 0.3]], st, withC(C.steel, { col: '#241a16', col2: '#7a5040', gloss: 0.3 }), 20);
  b.rbox(0.05, 0.035, 0.015, 0.006, st.clone().add(V3(-0.13, 0.12, 0.05)), withC(C.kumquat, { col: '#c0400c', col2: '#ffa040', emit: 1.1, hilite: 0 }), [0, -1.2, 0]);
  b.lathe([[0, 0], [0.2, 0], [0.22, 0.03], [0.22, 0.32], [0.24, 0.34], [0.21, 0.34], [0, 0.3]], st.clone().add(V3(0, 0.32, 0)), withC(C.steel, { col: '#4a4e52', col2: '#b8bec4', gloss: 0.8, hilite: 0.9 }), 26);
  b.lathe([[0, 0], [0.21, 0], [0, 0.005]], st.clone().add(V3(0, 0.6, 0)), withC(C.kumquat, { col: '#6a3a14', col2: '#c88a40', emit: 0.15 }), 20);
  // the bamboo pole at the kerb side, an arm, and the bulb over the table
  const pole = P(-0.2, 0, 1.2);
  const bulb = P(0.15, 2.05, 0.05);
  b.cyl(0.03, 0.035, 2.4, pole.clone().add(V3(0, 1.2, 0)), C.bamboo, 8);
  b.rod(pole.clone().add(V3(0, 2.3, 0)), bulb.clone().add(V3(0, 0.22, 0)), 0.018, C.bamboo, 6);
  b.rod(bulb.clone().add(V3(0, 0.22, 0)), bulb.clone().add(V3(0, 0.04, 0)), 0.004, C.tyre, 4);
  b.sphere(0.045, bulb, [1, 1.2, 1], withC(C.kumquat, { col: '#ffc070', col2: '#fff0c8', emit: 1.6, hilite: 0, erode: 0 }), 12);
  const mesh = hero(b.merge(), { rims: false, tier: TIER2 });
  scene.add(mesh);
  return {
    mesh, bulb,
    steam: st.clone().add(V3(0, 0.66, 0)),
    seats: [P(0.5, 0, -0.35), P(0.5, 0, 0.55)],
    solids: [
      { x: at.x, z: at.z, r: 0.25, h: 0.5, name: 'noodle table' },
      { x: st.x, z: st.z, r: 0.2, h: 0.7, name: 'noodle stove' },
      { x: pole.x, z: pole.z, r: 0.05, h: 2.4, name: 'noodle stall pole' },
    ],
  };
}
