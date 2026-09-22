// Chớm world, season Hạ: lotus. Leaves (shallow bowls on tall stems, some lying on the water), flowers (two or three whorls of
// petals round a yellow seed head), buds, seed pods; the pond laid out with a clear channel for the boat.
import * as THREE from 'three';
import { V3, mat, withC, C } from '../../core/build.js';
import { WATER_Y } from './water.js';

// hồng sen first, xanh lá sen second
export const LC = {
  leaf: { col: '#1f3a2e', col2: '#6f9a6a', erode: 0.25, hilite: 0.35, gloss: 0.15, scale: 7, bump: 1.0 },
  leafQ: { col: '#2c4436', col2: '#7a9a74', erode: 0.2, hilite: 0.2, gloss: 0.1, scale: 7, bump: 1.0 },
  leafOld: { col: '#3a4230', col2: '#9a9a6a', erode: 0.3, hilite: 0.2, gloss: 0.05, scale: 7, bump: 1.1 },
  leafY: { col: '#2a4a2a', col2: '#9ab86a', erode: 0.25, hilite: 0.35, gloss: 0.1, scale: 7, bump: 1.0 },
  // the far pond (knife): paler, a tier back in the air, so the backlit leaves read as a soft band, not black cut-outs
  leafFar: { col: '#4e5e54', col2: '#a4b090', scale: 5, haze: 0.16, emit: 0.16 },
  petalFar: { col: '#a06a80', col2: '#e8b8c8', scale: 5, haze: 0.16, emit: 0.2 },
  stem: { col: '#2a3a2a', col2: '#6a8660', erode: 0, hilite: 0.2, scale: 10, bump: 0.5 },
  petal: { col: '#b0406e', col2: '#ffc4d6', emit: 0.05, erode: 0, hilite: 0.35, gloss: 0.1, scale: 12, bump: 0.6 },
  petalW: { col: '#c87c98', col2: '#fff0f2', emit: 0.06, erode: 0, hilite: 0.35, gloss: 0.1, scale: 12, bump: 0.6 },
  petalQ: { col: '#946078', col2: '#e8b8c6', emit: 0.03, erode: 0, hilite: 0.2, scale: 12, bump: 0.6 },
  bud: { col: '#9a2c5a', col2: '#ff9ab8', emit: 0.04, erode: 0, hilite: 0.4, gloss: 0.15, scale: 12, bump: 0.5 },
  budQ: { col: '#7a4a5e', col2: '#d898aa', erode: 0, hilite: 0.2, scale: 12, bump: 0.5 },
  pod: { col: '#8a7a2a', col2: '#f0d870', emit: 0.04, erode: 0, hilite: 0.4, scale: 14, bump: 0.6 },
  stamen: { col: '#c89020', col2: '#ffe27a', emit: 0.06, erode: 0.1, hilite: 0.3, scale: 16, bump: 0.6 },
};

// ---------------------------------------------------------------- one leaf: a shallow bowl with a wavy rim
function leafGeo(r, { cup = 0.18, wave = 0.05, seg = 18, rings = 3, notch = true } = {}) {
  const P = [], I = [];
  P.push(0, 0, 0);
  for (let j = 1; j <= rings; j++) {
    const rho = j / rings;
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      // a lotus leaf is round, with the stem joined near the middle; the rim rolls up and waves
      const rr = r * rho * (notch && Math.abs(Math.sin(a * 0.5)) < 0.04 && j === rings ? 0.93 : 1);
      const y = r * (cup * rho * rho + wave * Math.sin(a * 5 + r * 13) * rho ** 3 + 0.03 * Math.sin(a * 2 + 1) * rho ** 2);
      P.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
    }
  }
  for (let k = 0; k < seg; k++) I.push(0, 1 + ((k + 1) % seg), 1 + k);
  for (let j = 1; j < rings; j++) {
    const o0 = 1 + (j - 1) * seg, o1 = 1 + j * seg;
    for (let k = 0; k < seg; k++) {
      const k1 = (k + 1) % seg;
      I.push(o0 + k, o0 + k1, o1 + k, o0 + k1, o1 + k1, o1 + k);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

// a petal: a narrow boat of a shape, cupped across and curved along; base at the origin, pointing up (+y), hollow toward +z
function petalGeo(w, l, { cup = 0.35, curl = 0.12 } = {}) {
  const g = new THREE.PlaneGeometry(1, 1, 4, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i) + 0.5;           // u -0.5..0.5 across, v 0..1 along
    const width = Math.sin(Math.min(1, v * 1.15) * Math.PI * 0.92 + 0.12) * (1 - 0.35 * v * v);
    const x = u * w * 2 * width;
    const y = v * l;
    const z = cup * w * (1 - (2 * u) ** 2) * width + curl * l * v * v;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}
const PETAL = [petalGeo(0.034, 0.11), petalGeo(0.03, 0.1, { cup: 0.45, curl: 0.05 }), petalGeo(0.026, 0.085, { cup: 0.55, curl: -0.02 })];
const Yax = V3(0, 1, 0);
const tmpQ = new THREE.Quaternion();

// a flower at `at` (the top of its stem), axis `up`. open: 0 = a loose bud opening, 1 = wide open. size scales everything.
export function lotusFlower(b, at, { up = Yax, open = 0.8, size = 1, R, quiet = false, sway = 0, tree = 0, pod = true, tea = false } = {}) {
  const base = new THREE.Quaternion().setFromUnitVectors(Yax, up.clone().normalize());
  // quiet: true = a secondary thing, 'far' = the knife-painted far pond
  const pc = quiet === 'far' ? LC.petalFar : quiet ? LC.petalQ : LC.petal, pw = quiet === 'far' ? LC.petalFar : quiet ? LC.petalQ : LC.petalW;
  const whorls = [[6, 0.95 - open * 0.55, 0], [6, 0.55 - open * 0.3, 0.52], [5, 0.25 - open * 0.08, 0.2]];
  whorls.forEach(([n, lean, off], wi) => {
    for (let k = 0; k < n; k++) {
      const a = ((k + off) / n) * Math.PI * 2 + (R ? (R() - 0.5) * 0.3 : 0);
      // tilt out from the axis by (pi/2 - lean*...), then turn round the axis
      const tilt = Math.PI / 2 - (Math.PI / 2) * Math.max(0.05, lean) + (R ? (R() - 0.5) * 0.12 : 0);
      const q = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), -a + Math.PI / 2);
      q.multiply(tmpQ.setFromAxisAngle(V3(1, 0, 0), tilt));
      q.premultiply(base);
      const s = size * (1 - wi * 0.05);
      const pos = at.clone().add(V3(0, 0.012 * size, 0).applyQuaternion(base));
      b.add(PETAL[wi], wi === 0 ? pc : (k % 2 ? pw : pc), new THREE.Matrix4().compose(pos, q, V3(s, s, s)), sway, tree);
    }
  });
  if (pod) {
    const pp = at.clone().add(V3(0, 0.03 * size, 0).applyQuaternion(base));
    b.push(() => new THREE.CylinderGeometry(0.02 * size, 0.012 * size, 0.022 * size, 12), true, LC.pod, new THREE.Matrix4().compose(pp, base, V3(1, 1, 1)), sway, tree);
    // stamens: a ring of short gold threads round the pod
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const d = V3(Math.cos(a), 0.9, Math.sin(a)).normalize().applyQuaternion(base);
      const s0 = at.clone().add(V3(Math.cos(a) * 0.018 * size, 0.018 * size, Math.sin(a) * 0.018 * size).applyQuaternion(base));
      b.rod(s0, s0.clone().addScaledVector(d, 0.03 * size), 0.0022 * size, LC.stamen, 4, 0.0022 * size, sway, tree);
    }
  }
  if (tea) {
    // green tea tucked into the heart of the flower
    const tp = at.clone().add(V3(0, 0.04 * size, 0).applyQuaternion(base));
    b.blob(0.028 * size, tp, [1, 0.5, 1], { col: '#3a4a26', col2: '#9aa864', erode: 0.2, hilite: 0.2, scale: 30, bump: 1.2 }, 1.7, 1, 0.35, sway, tree);
  }
}

export function lotusBud(b, at, { up = Yax, size = 1, quiet = false, sway = 0, tree = 0 }) {
  const q = new THREE.Quaternion().setFromUnitVectors(Yax, up.clone().normalize());
  // (the shape is made later, in the core's slices of work)
  b.push(() => budGeo(size), true, quiet === 'far' ? LC.petalFar : quiet ? LC.budQ : LC.bud, new THREE.Matrix4().compose(at.clone().add(V3(0, 0.06 * size, 0).applyQuaternion(q)), q, V3(1, 1, 1)), sway, tree);
}
function budGeo(size) {
  const g = new THREE.SphereGeometry(0.045 * size, 14, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / (0.045 * size);
    const k = y > 0 ? 1 - 0.75 * y ** 1.6 : 1;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * 1.7 + (y > 0.9 ? 0.012 * size : 0), p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

// a whole plant rising out of the water: a curved stem and what it carries.
// It RETURNS the numbers it actually used, so anyone who needs to measure this plant reads them instead of guessing
// (core/README.md 13, rule 1: read the real numbers from the scene).
export function lotusPlant(b, foot, top, what, o = {}) {
  const { R, quiet = false, stemR = 0.008, sway, tree = 0, leafR = 0.3, tilt = 0.25, open = 0.8, size = 1 } = o;
  const mid = foot.clone().lerp(top, 0.5).add(V3((R() - 0.5) * 0.08, 0, (R() - 0.5) * 0.08));
  const pts = [foot, foot.clone().lerp(mid, 0.5), mid, mid.clone().lerp(top, 0.5), top];
  b.tube(pts, stemR, LC.stem, 4, 4, sway, tree);
  if (what === 'leaf') {
    const up = V3((R() - 0.5) * tilt * 2, 1, (R() - 0.5) * tilt * 2).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(Yax, up);
    q.multiply(tmpQ.setFromAxisAngle(Yax, R() * 6.28));
    const rr = R();
    const opts = quiet === 'far' ? LC.leafFar : quiet ? LC.leafQ : (rr < 0.16 ? LC.leafOld : rr < 0.36 ? LC.leafY : LC.leaf);
    const cup = 0.12 + R() * 0.16, wave = 0.03 + R() * 0.05;
    b.push(() => leafGeo(leafR, { cup, wave, seg: 14 }), true, opts, new THREE.Matrix4().compose(top, q, V3(1, 1, 1)), sway, tree);
    // the leaf as built: a round blade of radius leafR round `top`, its rim lifted leafR*cup and rippling leafR*wave,
    // one notch cut to 0.93 of the radius, tilted by `up` and spun about it (leafPoint below gives any point on it)
    return { what, foot: foot.clone(), at: top.clone(), leafR, across: +(2 * leafR).toFixed(4), cup, wave, seg: 14, rings: 3, notch: 0.93, up: up.clone(), q: q.clone(), stemR };
  } else if (what === 'flower') {
    const up = top.clone().sub(mid).normalize().lerp(Yax, 0.5).normalize();
    lotusFlower(b, top, { up, open, size, R, quiet, sway, tree });
  } else if (what === 'bud') {
    lotusBud(b, top, { up: top.clone().sub(mid).normalize(), size, quiet, sway, tree });
  } else if (what === 'pod') {
    const up = top.clone().sub(mid).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(Yax, up);
    b.push(() => new THREE.CylinderGeometry(0.035 * size, 0.018 * size, 0.04 * size, 12), true, withC(LC.pod, { col: '#5a5a2a', col2: '#b8b070' }), new THREE.Matrix4().compose(top, q, V3(1, 1, 1)), sway, tree);
  }
  return { what, foot: foot.clone(), at: top.clone(), stemR, size };
}

// a point on a leaf built by lotusPlant, in the leaf's own frame (y up before the tilt is applied):
// rho 0 = the stem, 1 = the rim; a = the angle round the blade. Same maths as leafGeo, so it is the real surface.
export function leafPoint(info, rho = 1, a = 0) {
  const { leafR: r, cup, wave, notch = 0.93 } = info;
  const rr = r * rho * (Math.abs(Math.sin(a * 0.5)) < 0.04 && rho === 1 ? notch : 1);
  const y = r * (cup * rho * rho + wave * Math.sin(a * 5 + r * 13) * rho ** 3 + 0.03 * Math.sin(a * 2 + 1) * rho ** 2);
  return V3(Math.cos(a) * rr, y, Math.sin(a) * rr);
}

// a leaf lying on the water (young leaves float)
export function floatLeaf(b, at, r, R, opts = LC.leafQ, sway = 0, tree = 0) {
  const q = new THREE.Quaternion().setFromAxisAngle(Yax, R() * 6.28);
  b.push(() => leafGeo(r, { cup: -0.02, wave: 0.02, rings: 2, seg: 14 }), true, opts, new THREE.Matrix4().compose(V3(at.x, WATER_Y + 0.01, at.z), q, V3(1, 1, 1)), sway, tree);
}

// ---------------------------------------------------------------- the pond: plants scattered in a box, kept out of the keep-out zones
// keep: [[x, z, r], ...] circles nothing may stand in (the boat's channel is given as a chain of circles)
// slice: core.slice (the long loop yields to the page between slices of work)
export async function scatterPond(b, R, { xMin, xMax, zFar, zNear, n, keep = [], quiet = false, tree = 2, heightK = 1, leafK = 1, flowers = 0.1, buds = 0.08, solids = null, near = null, slice = null }) {
  const placed = [];
  let tries = 0;
  while (placed.length < n && tries < n * 12) {
    tries++;
    if (slice && tries % 16 === 0) await slice('pond plants');
    const x = xMin + R() * (xMax - xMin), z = zFar + R() * (zNear - zFar);
    const leafR = (0.2 + R() * 0.22) * (quiet ? 1.3 : 1) * leafK;
    if (keep.some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr + leafR)) continue;
    // clumps: a plant prefers to stand near others (lotus spreads from its roots)
    if (placed.length > 20 && R() < 0.5 && !placed.some((p) => Math.hypot(p[0] - x, p[1] - z) < 0.9)) continue;
    // denser toward the bank (the pond thins out into open water)
    if (R() > 1 - 0.55 * Math.min(1, Math.max(0, (-x - 6) / 9))) continue;
    placed.push([x, z]);
    const kind = R();
    const h = (0.12 + R() * R() * 0.9) * heightK;
    const foot = V3(x, WATER_Y, z);
    const top = V3(x + (R() - 0.5) * 0.25, WATER_Y + h, z + (R() - 0.5) * 0.25);
    const sw = (px, py) => Math.max(0, py - WATER_Y) * 0.22;
    if (kind < flowers) lotusPlant(b, foot, top.clone().add(V3(0, 0.15, 0)), 'flower', { R, quiet, sway: sw, tree, open: 0.5 + R() * 0.5, size: 1.1 + R() * 0.4 });
    else if (kind < flowers + buds) lotusPlant(b, foot, top.clone().add(V3(0, 0.1, 0)), 'bud', { R, quiet, sway: sw, tree, size: 1.1 + R() * 0.3 });
    else if (kind < flowers + buds + 0.05) lotusPlant(b, foot, top, 'pod', { R, quiet, sway: sw, tree, size: 1.2 });
    else if (kind < 0.7) lotusPlant(b, foot, top, 'leaf', { R, quiet, sway: sw, tree, leafR });
    else floatLeaf(b, foot, leafR * 0.8, R, quiet === 'far' ? LC.leafFar : quiet ? LC.leafQ : LC.leaf, 0, tree);
    if (solids && near && near(x, z)) solids.push({ x, y: WATER_Y, z, r: 0.03, h: h + 0.2, name: `lotus@${x.toFixed(1)},${z.toFixed(1)}` });
  }
  return placed;
}
