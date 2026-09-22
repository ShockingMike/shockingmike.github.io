// Chớm world, season Đông: the sandbar under the Long Biên bridge (bãi bồi), built from what the references show —
// the bank outside the dyke with its houses packed on top, the earth sloping down to the water, the vegetable beds and
// banana the families down there plant, the worn path, and the small boats pulled up on the sand. See TU-LIEU.md.
//   bank(kb, mass, R, o)        the slope up to the houses, its retaining wall and the flight of steps down to the bar
//   plots(kb, fine, R, o)       the vegetable ridges and the clumps of banana
//   boats(kb, mass, R, spots)   flat-bottomed river boats drawn up out of the water
//   waterEdge(kb, mass, R, o)   the last few metres of earth going under the river
import * as THREE from 'three';
import { V3, mat } from '../../core/build.js';

const EARTH = (R, haze) => ({ col: '#3a3228', col2: '#5e5140', scale: 0.55, drip: 0.35, seed: R(), haze });
const SAND = (R, haze) => ({ col: '#4a4336', col2: '#736550', scale: 0.7, drip: 0.2, seed: R(), haze });

// ---------------------------------------------------------------- the bank, the wall on top of it and the steps down
// xFoot: where the slope starts on the bar; xTop/yTop: the ground the houses stand on; stepsAt: the z of the flight down
export function bank(kb, mass, R, { xFoot = 8, xTop = 12.4, yTop = 2.6, zFrom = 20, zTo = -80, stepsAt = -2.5, haze = 0.12 } = {}) {
  const len = zFrom - zTo, zc = (zFrom + zTo) / 2;
  const run = xTop - xFoot;
  const ang = Math.atan2(yTop, run);
  // the earth of the bank, one long slab laid on the slope, and the body of ground behind it
  mass.box(Math.hypot(run, yTop) + 0.6, 1.2, len, V3((xFoot + xTop) / 2, yTop / 2 - 0.35, zc), EARTH(R, haze), [0, 0, ang]);
  mass.box(10, yTop + 2.2, len, V3(xTop + 4.6, (yTop - 2.2) / 2, zc), EARTH(R, haze));
  // a low retaining wall of old brick along the top, where the houses stop and the drop begins
  kb.box(0.42, 0.9, len, V3(xTop + 0.1, yTop - 0.15, zc), { col: '#3e2e26', col2: '#6a4e3c', scale: 1.1, drip: 0.6, seed: R(), haze });
  kb.box(0.56, 0.12, len, V3(xTop + 0.06, yTop + 0.34, zc), { col: '#4a4038', col2: '#7a6c5c', scale: 1.2, seed: R(), haze });
  // the steps: a narrow flight cut into the slope, the way down from the alley to the bar
  const n = 9;
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    kb.box(run / n + 0.5, 0.16, 1.5, V3(xTop - 0.3 - t * (run - 0.4), yTop - 0.1 - t * (yTop - 0.05), stepsAt), { col: '#4e4a44', col2: '#7e786e', scale: 1.4, seed: R(), haze });
  }
  for (const dz of [-0.85, 0.85]) kb.box(run + 0.4, 0.1, 0.1, V3((xFoot + xTop) / 2, yTop / 2 + 0.28, stepsAt + dz), { col: '#2e2a26', col2: '#5a534a', scale: 2, seed: R(), haze }, [0, 0, ang]);
  return { xFoot, xTop, yTop, stepsAt };
}

// ---------------------------------------------------------------- the last of the earth, going down under the water
export function waterEdge(kb, mass, R, { xEdge = -6.6, waterY = -0.6, zFrom = 20, zTo = -90, haze = 0.16 } = {}) {
  const len = zFrom - zTo, zc = (zFrom + zTo) / 2;
  mass.box(3.4, 0.7, len, V3(xEdge - 1.2, -0.35, zc), SAND(R, haze), [0, 0, -0.16]);
  mass.box(4.0, 0.5, len, V3(xEdge - 3.6, waterY - 0.3, zc), SAND(R, haze));
  // a line of stones and river rubbish along the waterline, painted as a broken edge
  for (let z = zFrom; z > zTo; z -= 2.1 + R() * 1.8) {
    const x = xEdge - 2.2 - R() * 1.2;
    kb.add(new THREE.SphereGeometry(0.12 + R() * 0.14, 7, 5), { col: '#413a31', col2: '#6e6454', scale: 2, seed: R(), haze }, mat(V3(x, waterY + 0.04, z), [R(), R() * 3, R()], [1, 0.6, 1.3]));
  }
}

// ---------------------------------------------------------------- what people grow on the bar: ridges of greens, banana
// spots: [{ at, kind: 'bed' | 'banana', len, ry }]
export function plots(kb, fine, R, spots = [], haze = 0.12) {
  const solids = [];
  for (const sp of spots) {
    const p = sp.at, ry = sp.ry ?? 0;
    if (sp.kind === 'bed') {
      // a raised ridge of earth with a furrow each side, and rows of winter greens on top
      const len = sp.len ?? 4;
      kb.box(0.78, 0.18, len, p.clone().add(V3(0, 0.09, 0)), EARTH(R, haze), [0, ry, 0]);
      const n = Math.max(3, Math.round(len / 0.42));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n - 0.5;
        const q = p.clone().add(V3(Math.sin(ry) * t * len + (R() - 0.5) * 0.22, 0.2, Math.cos(ry) * t * len));
        const g = { col: '#1e2a1e', col2: '#42583a', scale: 3, seed: R(), haze };
        for (let j = 0; j < 3; j++) {
          fine.add(new THREE.SphereGeometry(0.1 + R() * 0.05, 6, 4), g, mat(q.clone().add(V3((R() - 0.5) * 0.2, 0.04 + j * 0.05, (R() - 0.5) * 0.2)), [0, R() * 3, 0], [1.3, 0.55, 1.1]));
        }
      }
      solids.push({ x: p.x, z: p.z, r: 0.5, h: 0.3, name: 'vegetable bed' });
    } else if (sp.kind === 'banana') {
      // a clump of banana: two or three trunks and the long torn blades that catch what light there is
      const nT = 2 + Math.floor(R() * 2);
      for (let t = 0; t < nT; t++) {
        const q = p.clone().add(V3((R() - 0.5) * 0.9, 0, (R() - 0.5) * 0.9));
        const h = 2.1 + R() * 0.9;
        kb.cyl(0.09, 0.14, h, q.clone().add(V3(0, h / 2, 0)), { col: '#232717', col2: '#3e4630', scale: 2.2, seed: R(), haze }, 7);
        const nL = 5 + Math.floor(R() * 3);
        for (let k = 0; k < nL; k++) {
          const a = (k / nL) * Math.PI * 2 + R() * 0.5;
          const droop = 0.5 + R() * 0.6, ln = 1.15 + R() * 0.65;
          const leaf = { col: '#18220f', col2: '#3a4e2a', scale: 1.4, seed: R(), haze };
          fine.box(0.36, 0.03, ln, q.clone().add(V3(Math.cos(a) * ln * 0.42, h - 0.12 - droop * 0.5, Math.sin(a) * ln * 0.42)), leaf, [droop * 0.55, -a, 0.12]);
        }
      }
      solids.push({ x: p.x, z: p.z, r: 0.7, h: 2.6, name: 'banana clump' });
    }
  }
  return { solids };
}

// ---------------------------------------------------------------- boats drawn up on the sand
export function boats(kb, mass, R, spots = [], haze = 0.14) {
  const solids = [];
  for (const sp of spots) {
    const p = sp.at, ry = sp.ry ?? 0, L = sp.len ?? 3.4;
    const wood = { col: '#453a2a', col2: '#8a7654', scale: 1.6, drip: 0.4, seed: R(), haze };
    const wood2 = { col: '#52442f', col2: '#9c8660', scale: 2, seed: R(), haze };
    const tilt = sp.tilt ?? 0.1;
    const Q = (x, y, z) => p.clone().add(V3(x * Math.cos(ry) + z * Math.sin(ry), y, -x * Math.sin(ry) + z * Math.cos(ry)));
    // the hull: a flat-bottomed river boat that tapers to both ends, its bow lifted where it sits on the sand
    mass.box(L * 0.58, 0.38, 0.98, Q(0, 0.22, 0), wood, [0, ry, tilt]);
    mass.box(L * 0.27, 0.32, 0.74, Q(L * 0.40, 0.30, 0), wood, [0, ry, tilt * 2.6]);         // the raised bow
    mass.box(L * 0.25, 0.30, 0.68, Q(-L * 0.39, 0.25, 0), wood, [0, ry, tilt * 1.3]);        // and the stern
    kb.box(L * 0.52, 0.12, 0.64, Q(0, 0.42, 0), { col: '#1e1a14', col2: '#3a3224', scale: 2, seed: R(), haze }, [0, ry, tilt]);   // the well inside it
    for (const dz of [-0.5, 0.5]) kb.box(L * 0.9, 0.1, 0.09, Q(0, 0.44, dz), wood2, [0, ry, tilt]);   // the gunwale down each side
    for (const dx of [-0.22, 0.26]) kb.box(0.09, 0.08, 0.86, Q(dx * L, 0.46, 0), wood2, [0, ry, tilt]);  // the thwarts
    if (sp.pole !== false) kb.rod(Q(-L * 0.4, 0.4, 0.2), Q(L * 0.3, 0.9, -0.1), 0.045, { col: '#4a4030', col2: '#8a7a58', scale: 3, seed: R(), haze }, 5);
    for (const dx of [-0.34, 0, 0.34]) {
      const q = Q(dx * L, 0, 0);
      solids.push({ x: q.x, z: q.z, r: 0.5, h: 0.7, name: 'boat' });
    }
  }
  return { solids };
}

// ---------------------------------------------------------------- the small things people leave on a sandbar
// spots: [{ at, kind: 'net' | 'baskets' | 'bricks' | 'pots' | 'butt', ry }]
// A bar is never bare: nets go up on poles to dry, baskets and a water butt stand by the path, bricks wait for whatever
// is being built, and there are pots of greens on the slope. See TU-LIEU.md mục 2.
export function shoreThings(kb, mass, R, spots = [], haze = 0.12) {
  const solids = [];
  for (const sp of spots) {
    const p = sp.at, ry = sp.ry ?? 0, c = Math.cos(ry), s2 = Math.sin(ry);
    const Q = (x, y, z) => p.clone().add(V3(x * c + z * s2, y, -x * s2 + z * c));
    if (sp.kind === 'net') {
      // two bamboo poles with a net hung between them, the way it is left to dry overnight
      const w = sp.w ?? 2.6, h = sp.h ?? 1.55;
      const cane = { col: '#4e3c20', col2: '#a88a54', scale: 4, seed: R(), haze };
      for (const dx of [-w / 2, w / 2]) kb.cyl(0.035, 0.045, h, Q(dx, h / 2, 0), cane, 7, [0, ry, 0]);
      kb.rod(Q(-w / 2, h - 0.05, 0), Q(w / 2, h - 0.05, 0), 0.03, cane, 5);
      // the net: a sheet of fine strokes that sags between the poles
      const net = { col: '#3c4a3c', col2: '#94a68a', scale: 9, seed: R(), haze };
      const N = 16;
      for (let k = 0; k <= N; k++) {
        const u = k / N, x = -w / 2 + u * w, sag = 0.34 * Math.sin(Math.PI * u);
        kb.rod(Q(x, h - 0.06, 0), Q(x, h - 0.06 - (0.62 + sag), 0.02), 0.007, net, 4);
      }
      for (let k = 0; k < 8; k++) {
        const y = h - 0.14 - k * 0.09;
        const sg = 0.2 * Math.sin(Math.PI * (0.2 + k * 0.06));
        kb.rod(Q(-w / 2 + 0.05, y, 0), Q(0, y - sg, 0.01), 0.0055, net, 4);
        kb.rod(Q(0, y - sg, 0.01), Q(w / 2 - 0.05, y, 0), 0.0055, net, 4);
      }
      solids.push({ x: Q(-w / 2, 0, 0).x, z: Q(-w / 2, 0, 0).z, r: 0.2, h, name: 'net pole' });
      solids.push({ x: Q(w / 2, 0, 0).x, z: Q(w / 2, 0, 0).z, r: 0.2, h, name: 'net pole' });
    } else if (sp.kind === 'baskets') {
      // flat winnowing baskets stacked, and one leaning on the pile
      const cane = { col: '#5a4626', col2: '#c0a068', scale: 7, seed: R(), haze };
      for (let k = 0; k < 3; k++) kb.cyl(0.32 - k * 0.02, 0.3 - k * 0.02, 0.07, Q(0, 0.04 + k * 0.07, 0), cane, 16, [0.03 * k, ry, 0]);
      kb.cyl(0.3, 0.28, 0.07, Q(0.26, 0.3, 0.05), cane, 16, [1.25, ry + 0.4, 0]);
      solids.push({ x: p.x, z: p.z, r: 0.42, h: 0.5, name: 'baskets' });
    } else if (sp.kind === 'bricks') {
      // a stack of old bricks, waiting for a wall that may never be built
      const br = { col: '#4a2e22', col2: '#8a5640', scale: 3, drip: 0.4, seed: R(), haze };
      for (let k = 0; k < 9; k++) {
        const row = Math.floor(k / 3), col = k % 3;
        kb.box(0.22, 0.08, 0.11, Q(-0.12 + col * 0.12, 0.04 + row * 0.085, (row % 2) * 0.03), br, [0, ry + (row % 2) * 1.57, 0]);
      }
      solids.push({ x: p.x, z: p.z, r: 0.3, h: 0.3, name: 'bricks' });
    } else if (sp.kind === 'butt') {
      // a water butt, half sunk into the slope
      const tin = { col: '#2e3238', col2: '#6a727a', scale: 2, drip: 0.5, seed: R(), haze };
      mass.cyl(0.3, 0.32, 0.72, Q(0, 0.3, 0), tin, 14, [0, ry, 0]);
      kb.add(new THREE.TorusGeometry(0.31, 0.02, 5, 16), tin, mat(Q(0, 0.62, 0), [Math.PI / 2, 0, 0]));
      solids.push({ x: p.x, z: p.z, r: 0.36, h: 0.75, name: 'water butt' });
    } else if (sp.kind === 'pots') {
      const n = 2 + Math.floor(R() * 2);
      for (let k = 0; k < n; k++) {
        const q = Q((k - 1) * 0.34, 0, (k % 2) * 0.2);
        const r = 0.12 + R() * 0.05, h = 0.22 + R() * 0.1;
        kb.lathe([[0, 0], [r * 0.8, 0], [r, h * 0.8], [r * 1.05, h], [0, h * 0.95]], q, { col: '#4a2e22', col2: '#9a6044', scale: 2, seed: R(), haze }, 14);
        for (let j = 0; j < 4; j++) kb.add(new THREE.SphereGeometry(r * 0.5, 6, 4), { col: '#1e2a1e', col2: '#42583a', scale: 3, seed: R(), haze }, mat(q.clone().add(V3((R() - 0.5) * 0.2, h + 0.05 + R() * 0.1, (R() - 0.5) * 0.2)), [0, R() * 3, 0], [1.2, 0.6, 1.1]));
      }
      solids.push({ x: p.x, z: p.z, r: 0.5, h: 0.4, name: 'pots' });
    }
  }
  return { solids };
}
