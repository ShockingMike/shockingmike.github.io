// Chớm world, season Đông: the house with the family altar upstairs.
// An old tube house on the near row with a low mezzanine (gác lửng). Ground floor: the family's front room behind a
// half-open folding gate. Mezzanine: a recessed loggia open to the lane, and on its far side wall, facing the street,
// the hanging altar (bàn thờ treo): a lacquered shelf under a little tiled canopy, two red lamps, the incense bowl with
// three sticks of agarwood burning, a vase of chrysanthemums, and the Chớm bottle at the front beside the bowl (a gift,
// kept with the things the family keeps close). Someone stands at it with incense raised; the smoke drifts out over the
// rail into the lane. Behind the loggia, through the open doors, the ancestors' altar glows red in the room.
//   buildAltarHouse(scene, R, kb, mass, fine, { xWall, za, zb }) -> { bowl, tips, lamps, bottleAt, bottleRy, spot, personAt, ... }
import * as THREE from 'three';
import { V3, Batch, heroOf, mat, C, withC, TIER2 } from '../../core/build.js';

const LACQ = withC(C.lacquer, { col: '#300c0a', col2: '#a8321e', gloss: 0.85, hilite: 0.9, erode: 0.3 });
const GILT = withC(C.gold, { col: '#6a4a14', col2: '#e8b850', emit: 0.05 });

export async function buildAltarHouse(scene, R, kb, mass, fine, { xWall, za, zb, slice = async () => {} }) {
  const w = za - zb, zc = (za + zb) / 2;
  const X = (d) => xWall - d;             // near row: out is -x; d < 0 is inside the house
  const fb = (b, along, h, dA, dB, z, y, opts, rot) => b.box(Math.abs(dB - dA), h, along, V3(X((dA + dB) / 2), y, z), { haze: 0.03, ...opts }, rot);
  const F1 = 2.1, F2 = 4.5, H = 7.3;       // the mezzanine floor, the upper floor, the eaves
  const LD = 1.3;                          // how deep the loggia is
  const wall = { col: '#8a7450', col2: '#b89c70', scale: 0.35, drip: 0.9, seed: R() };
  const out = { solids: [], sketch: [] };
  const sideIn = zb + 0.14, sideNear = za - 0.14;   // the inner faces of the party walls

  // ---- the shell
  fb(mass, w, F1, -12, 0, zc, F1 / 2, wall);                           // ground floor block
  fb(mass, w, H - F2, -12, 0, zc, (F2 + H) / 2, wall);                 // upper floor block
  fb(mass, w, F2 - F1, -12, -LD - 0.12, zc, (F1 + F2) / 2, wall);      // behind the loggia
  // the party walls framing the loggia (their street ends are the house's piers)
  fb(kb, 0.14, F2 - F1, -LD, 0.05, zb + 0.07, (F1 + F2) / 2, { ...wall, emit: 0.0 });
  fb(kb, 0.14, F2 - F1, -LD, 0.05, za - 0.07, (F1 + F2) / 2, wall);
  // loggia floor, ceiling, back wall (a warm lime wash lit by the lamps), the doors into the room
  fb(kb, w - 0.28, 0.12, -LD, 0.06, zc, F1 + 0.0, { col: '#b8a07a', col2: '#e0ccaa', scale: 0.6, seed: R() });
  fb(kb, w - 0.28, 0.12, -LD, 0.04, zc, F2 - 0.06, { col: '#6a4a38', col2: '#a88068', scale: 0.8, seed: R(), emit: 0.04 });
  const doorA = zc + 0.55, doorB = zc - 0.75;     // the open double door in the back wall
  const backC = { col: '#7a4a34', col2: '#c8905c', scale: 0.7, drip: 0.4, seed: R(), emit: 0.1 };
  fb(kb, sideNear - doorA, F2 - F1, -LD - 0.12, -LD, (sideNear + doorA) / 2, (F1 + F2) / 2, backC);
  fb(kb, doorB - sideIn, F2 - F1, -LD - 0.12, -LD, (doorB + sideIn) / 2, (F1 + F2) / 2, backC);
  fb(kb, doorA - doorB, 0.5, -LD - 0.12, -LD, (doorA + doorB) / 2, F2 - 0.25, backC);
  const leaf = { col: '#3a2418', col2: '#7a5034', scale: 1.4, seed: R() };
  // the door leaves folded flat against the back wall either side
  fb(kb, 0.5, F2 - F1 - 0.6, -LD + 0.0, -LD + 0.05, doorA + 0.27, F1 + (F2 - F1 - 0.5) / 2, leaf);
  fb(kb, 0.4, F2 - F1 - 0.6, -LD + 0.0, -LD + 0.05, doorB - 0.22, F1 + (F2 - F1 - 0.5) / 2, leaf);
  // the room behind: deep and red-lit, the ancestors' altar far in, its two lamps glowing
  const RD = 4.2;
  fb(kb, doorA - doorB + 1.6, 0.1, -LD - RD, -LD - 0.12, (doorA + doorB) / 2, F1 + 0.05, { col: '#3a1a14', col2: '#6a3a28', scale: 1, seed: R(), emit: 0.05 });
  fb(kb, doorA - doorB + 1.6, F2 - F1, -LD - RD - 0.1, -LD - RD, (doorA + doorB) / 2, (F1 + F2) / 2, { col: '#5a1a14', col2: '#b8442c', scale: 0.8, seed: R(), emit: 0.3 });
  fb(kb, 0.1, F2 - F1, -LD - RD, -LD - 0.12, doorA + 0.8, (F1 + F2) / 2, { col: '#5a2418', col2: '#a8503a', scale: 0.8, seed: R(), emit: 0.18 });
  fb(kb, 0.1, F2 - F1, -LD - RD, -LD - 0.12, doorB - 0.8, (F1 + F2) / 2, { col: '#5a2418', col2: '#a8503a', scale: 0.8, seed: R(), emit: 0.22 });
  fb(kb, doorA - doorB + 1.6, 0.1, -LD - RD, -LD - 0.12, (doorA + doorB) / 2, F2 - 0.05, { col: '#2a1210', col2: '#5a2a20', scale: 1, seed: R(), emit: 0.04 });
  fb(kb, 1.5, 0.95, -LD - RD + 0.05, -LD - RD + 0.55, (doorA + doorB) / 2, F1 + 0.55, { col: '#2a0806', col2: '#8a2a1c', scale: 2, seed: R(), emit: 0.12 });
  fb(kb, 1.1, 0.6, -LD - RD + 0.02, -LD - RD + 0.05, (doorA + doorB) / 2, F1 + 1.6, { col: '#4a3010', col2: '#c89040', scale: 2, seed: R(), emit: 0.2 });
  for (const dz of [-0.55, 0.55]) fb(kb, 0.1, 0.14, -LD - RD + 0.2, -LD - RD + 0.3, (doorA + doorB) / 2 + dz, F1 + 1.1, { col: '#ff3a1a', col2: '#ffb080', emit: 2.2, scale: 3, seed: R() });
  // the rail along the loggia's open front
  const railC = { col: '#1e2226', col2: '#4a5056', scale: 3, seed: R(), haze: 0.03 };
  fb(fine, w - 0.28, 0.04, 0.0, 0.05, zc, F1 + 0.84, railC);
  fb(fine, w - 0.28, 0.03, 0.0, 0.05, zc, F1 + 0.2, railC);
  for (let s = 0; s <= 22; s++) fb(fine, 0.018, 0.64, 0.01, 0.04, sideNear - s * ((w - 0.28) / 22), F1 + 0.52, railC);
  // ground floor: the family's shop, shut for the night behind a roller shutter (it takes the fire's light and shadows);
  // a narrow house door at the far end stands ajar, warm inside
  const dW = 0.85, shW = w - dW - 0.45;
  const shZ = za - 0.18 - shW / 2;
  fb(kb, shW, F1 - 0.35, -0.02, 0.03, shZ, (F1 - 0.35) / 2, { col: '#4a4e56', col2: '#767c84', scale: 1.2, drip: 0.4, seed: R() });
  for (let k = 0; k < 7; k++) fb(fine, shW, 0.022, 0.03, 0.05, shZ, 0.18 + k * 0.24, { col: '#363a42', col2: '#565c64', scale: 3, seed: R() });
  fb(kb, shW + 0.08, 0.26, 0.0, 0.2, shZ, F1 - 0.3, { col: '#565a62', col2: '#767c84', scale: 1.5, seed: R() });
  const dZ = zb + 0.2 + dW / 2;
  fb(kb, dW, F1 - 0.3, -0.06, -0.04, dZ, (F1 - 0.3) / 2, { col: '#8a4a24', col2: '#f0a860', emit: 0.6, scale: 0.8, seed: R(), flat: 1 });
  fb(kb, 0.06, F1 - 0.3, -0.06, -0.62, dZ + dW / 2 - 0.03, (F1 - 0.3) / 2, { col: '#3a2418', col2: '#7a5034', scale: 1.4, seed: R() });
  fb(kb, dW + 0.12, 0.08, 0.0, 0.06, dZ, F1 - 0.26, { col: '#3a2418', col2: '#6a4a30', scale: 1.4, seed: R() });
  fb(kb, w, 0.18, 0, 0.14, zc, F1 - 0.06, { col: '#b8a07a', col2: '#e0ccaa', scale: 0.6, seed: R() });
  // a small painted sign between the floors
  // the upper floor: shutters shut, a balcony (balcony life fills it), an old tiled roof sloping to the street
  fb(kb, w, 0.2, 0, 0.14, zc, F2 + 0.02, { col: '#d0b88a', col2: '#eadcc0', scale: 0.6, seed: R() });
  for (const e of [-1, 1]) {
    fb(kb, 0.62, 1.8, -0.02, 0.0, zc + e * 0.36, F2 + 1.2, { col: '#1e1e26', col2: '#2e2c34', scale: 1, seed: R(), flat: 1 });
    fb(kb, 0.5, 1.8, 0.0, 0.05, zc + e * 0.36, F2 + 1.2, { col: '#34503e', col2: '#5e826a', scale: 1.4, seed: R() });
  }
  fb(kb, 1.7, 0.12, 0, 0.18, zc, F2 + 2.18, { col: '#d0b88a', col2: '#eadcc0', scale: 0.6, seed: R() });
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(4.4, 0); s.lineTo(4.4, 1.7); s.lineTo(0, 0);
  const rg = new THREE.ExtrudeGeometry(s, { depth: w + 0.1, bevelEnabled: false });
  rg.translate(0, 0, -(w + 0.1) / 2);
  mass.add(rg, { col: '#4a3028', col2: '#86584a', scale: 0.5, drip: 0.3, seed: R(), haze: 0.05 }, new THREE.Matrix4().setPosition(X(0.55), H, zc));
  fb(kb, w + 0.1, 0.12, 0.35, 0.65, zc, H + 0.02, { col: '#3a2a24', col2: '#6a4a3e', scale: 1, seed: R() });

  await slice('altar shell');
  // ---- the family altar on the loggia, against the far party wall, facing the street's camera side (+z)
  const ab = new Batch();
  const ax0 = X(-0.1), ax1 = X(-LD + 0.1);         // along x: from just behind the rail to the back wall
  const ax = (ax0 + ax1) / 2, aw = ax1 - ax0, ad = 0.52;
  const top = F1 + 0.06 + 1.02;
  const az0 = sideIn, azc = sideIn + ad / 2, azF = sideIn + ad;
  // the table: a lacquered top, a carved gilt apron, turned legs, a low shelf
  ab.rbox(aw, 0.05, ad, 0.01, V3(ax, top - 0.025, azc), LACQ);
  ab.box(aw - 0.08, 0.14, 0.02, V3(ax, top - 0.12, azF - 0.03), GILT);
  ab.box(aw - 0.14, 0.08, 0.015, V3(ax, top - 0.12, azF - 0.015), withC(LACQ, { col: '#4a0c08', col2: '#c03a24' }));
  for (const lx of [ax0 + 0.05, ax1 - 0.05]) for (const lz of [az0 + 0.06, azF - 0.06]) ab.lathe([[0, 0], [0.03, 0], [0.024, 0.1], [0.018, 0.5], [0.026, 0.8], [0.02, 0.96], [0, 0.96]], V3(lx, F1 + 0.06, lz), LACQ, 10);
  ab.box(aw - 0.1, 0.03, ad - 0.1, V3(ax, F1 + 0.3, azc), LACQ);
  // on the wall behind: the ancestors' frames (dark glass, gilt: no faces)
  for (const [dx, fw, fh] of [[-0.3, 0.2, 0.26], [0.0, 0.24, 0.32], [0.3, 0.2, 0.26]]) {
    ab.box(fw, fh, 0.03, V3(ax + dx, top + 0.45 + fh / 2, az0 + 0.02), GILT);
    ab.box(fw - 0.05, fh - 0.05, 0.02, V3(ax + dx, top + 0.45 + fh / 2, az0 + 0.035), withC(C.tyre, { col: '#0e0c10', col2: '#3a3240', gloss: 0.9, hilite: 1.0 }));
  }
  ab.rbox(aw - 0.2, 0.14, 0.2, 0.01, V3(ax, top + 0.07, az0 + 0.1), LACQ);
  await slice('altar table');
  // the incense bowl: glazed, cream with a blue band, ash and old red stubs, three sticks of agarwood burning
  const bowlAt = V3(ax + 0.08, top, az0 + 0.26);
  const bk = 1.3;
  ab.lathe([[0, 0], [0.06, 0], [0.085, 0.022], [0.098, 0.07], [0.094, 0.1], [0.085, 0.105], [0.08, 0.095], [0, 0.085]].map(([r, y]) => [r * bk, y * bk]), bowlAt, withC(C.mumW, { col: '#8a8478', col2: '#f4eedc', gloss: 0.7, hilite: 0.9, emit: 0.03, scale: 12 }), 28);
  ab.lathe([[0.096, 0.06], [0.1, 0.074], [0.097, 0.088], [0.092, 0.088]].map(([r, y]) => [r * bk, y * bk]), bowlAt, withC(C.pot, { col: '#1a2a5a', col2: '#4a6aa8', gloss: 0.7 }), 28);
  const stub = withC(C.redPlastic, { col: '#5a1410', col2: '#b8402c', gloss: 0, scale: 20 });
  for (let k = 0; k < 22; k++) { const a = R() * 6.28, rr = Math.sqrt(R()) * 0.09; const p = bowlAt.clone().add(V3(Math.cos(a) * rr, 0.11, Math.sin(a) * rr)); ab.rod(p, p.clone().add(V3((R() - 0.5) * 0.02, 0.03 + R() * 0.06, (R() - 0.5) * 0.02)), 0.003, stub, 4); }
  const tips = [];
  const stick = withC(C.redPlastic, { col: '#4a2a1a', col2: '#9a6a44', gloss: 0, scale: 20 });
  for (const [dx, lean] of [[-0.02, -0.05], [0.0, 0.0], [0.02, 0.05]]) {
    const a = bowlAt.clone().add(V3(dx, 0.11, 0.0)), e = a.clone().add(V3(lean * 0.4, 0.3, 0.015));
    ab.rod(a, e, 0.004, stick, 4);
    ab.sphere(0.007, e, [1, 1.8, 1], withC(C.kumquat, { col: '#ff5010', col2: '#ffd070', emit: 1.8, hilite: 0, erode: 0 }), 6);
    tips.push(e);
  }
  await slice('altar bowl');
  // two tall red lamps at the back corners (lotus bowls of red glass on turned stands)
  const lamps = [];
  for (const lx of [ax0 + 0.14, ax1 - 0.14]) {
    const p = V3(lx, top, az0 + 0.1);
    ab.lathe([[0, 0], [0.05, 0], [0.05, 0.02], [0.016, 0.05], [0.013, 0.3], [0.03, 0.32], [0, 0.32]], p, GILT, 14);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 6.28;
      ab.add(new THREE.SphereGeometry(0.04, 8, 6, 0, Math.PI), withC(C.lixi, { col: '#9a0c0a', col2: '#ff5a3a', emit: 1.0, hilite: 0.3, erode: 0 }), mat(p.clone().add(V3(Math.cos(a) * 0.036, 0.36, Math.sin(a) * 0.036)), [0.5, -a, 0], [0.7, 1.3, 0.5]));
    }
    ab.sphere(0.032, p.clone().add(V3(0, 0.38, 0)), [1, 1.2, 1], withC(C.lixi, { col: '#ff3a1a', col2: '#ffc080', emit: 2.2, hilite: 0, erode: 0 }), 12);
    lamps.push(p.clone().add(V3(0, 0.38, 0)));
  }
  await slice('altar lamps');
  // a vase of yellow chrysanthemums at the back, a plate of mandarins, a pair of brass candlesticks
  const vase = V3(ax1 - 0.3, top, az0 + 0.14);
  ab.lathe([[0, 0], [0.04, 0], [0.06, 0.07], [0.04, 0.16], [0.03, 0.22], [0.04, 0.25], [0, 0.24]], vase, withC(C.pot, { col: '#3a2418', col2: '#a8744c', gloss: 0.7 }), 16);
  for (let k = 0; k < 9; k++) {
    const tp = vase.clone().add(V3((R() - 0.5) * 0.24, 0.38 + R() * 0.16, (R() - 0.2) * 0.12));
    ab.rod(vase.clone().add(V3(0, 0.22, 0)), tp, 0.003, C.stem, 4);
    ab.blob(0.032, tp, [1, 0.7, 1], withC(C.mum, { col: '#b07a10', col2: '#ffd040', emit: 0.06 }), k, 1, 0.3);
  }
  const plate = V3(ax1 - 0.24, top, azF - 0.16);
  ab.lathe([[0, 0], [0.08, 0], [0.11, 0.025], [0.12, 0.03], [0, 0.018]], plate, withC(C.mumW, { col: '#7a7468', col2: '#e8e2d0', gloss: 0.6 }), 20);
  for (let k = 0; k < 6; k++) { const a = k * 1.1, rr = k ? 0.055 : 0; ab.sphere(0.034, plate.clone().add(V3(Math.cos(a) * rr, 0.05 + (k ? 0 : 0.045), Math.sin(a) * rr)), [1, 0.85, 1], withC(C.kumquat, { col: '#b8440c', col2: '#ff9a3c', emit: 0.04 }), 12); }
  for (const dx of [-0.2, 0.3]) ab.lathe([[0, 0], [0.03, 0], [0.01, 0.03], [0.008, 0.18], [0.025, 0.2], [0.006, 0.21], [0, 0.21]], V3(ax + dx, top, az0 + 0.2), GILT, 12);
  const altar = heroOf(ab, { rims: true, rimW: 1.5, rimOff: 1.0, tier: 0.02 });
  scene.add(altar);
  out.sketch.push([altar, { seed: 13, loops: 1, off: [4, 10], wob: 4, width: 1.2 }]);
  out.bowl = bowlAt;
  out.tips = tips;
  out.lamps = lamps;
  out.top = top;
  // the bottle: at the front of the altar, on the street side of the bowl, turned to the lane
  out.bottleAt = V3(ax0 + 0.2, top, azF - 0.13);
  // where a person stands to pray: in the loggia, before the altar, facing it
  out.personAt = V3(ax1 - 0.3, F1 + 0.06, sideIn + 1.25);
  out.personFace = V3(ax + 0.1, F1 + 0.06, sideIn + 0.1);
  out.floor = F1 + 0.06;
  out.loggia = { x0: xWall, x1: X(-LD), za: sideNear, zb: sideIn, y0: F1, y1: F2 };
  out.room = { x: X(-LD - RD), z: (doorA + doorB) / 2, y: F1 + 1.2 };
  // the bare bulb in the loggia ceiling, over the altar (the spot)
  out.spot = V3(ax - 0.12, F2 - 0.4, azF - 0.05);
  // a pot of winter chrysanthemum on the loggia floor by the rail
  const pb = new Batch();
  const pp = V3(X(-0.3), F1 + 0.06, sideNear - 0.5);
  pb.lathe([[0, 0], [0.12, 0], [0.15, 0.18], [0.16, 0.2], [0, 0.19]], pp, withC(C.pot, { col: '#4a2a20', col2: '#9a6044' }), 18);
  for (let k = 0; k < 7; k++) pb.blob(0.07, pp.clone().add(V3((R() - 0.5) * 0.18, 0.28 + R() * 0.1, (R() - 0.5) * 0.18)), [1, 0.8, 1], k % 2 ? withC(C.leaf, { col: '#1a2e22', col2: '#4a6a48' }) : withC(C.mum, { col: '#9a8430', col2: '#e8d070' }), k, 1, 0.3);
  const pots = heroOf(pb, { rims: false, tier: TIER2 });
  scene.add(pots);
  out.solids.push({ x: out.personAt.x, y: F1, z: out.personAt.z, r: 0.28, h: 1.7, name: 'prayer (loggia)' });
  return out;
}
