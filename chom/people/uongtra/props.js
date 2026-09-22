// Chớm, season Hạ: the tea maker's things, built by code with the world's own painted materials (core/build.js):
//   hat       a nón lá: a shallow cone of leaf layers on bamboo rings, a headband inside, a chin strap (quai)
//   stool     a low wooden stool (ghế đẩu)
//   basket    a deep bamboo basket of fresh lotus on the ground at her left, half covered by a lotus leaf (the flowers stay cool)
//   jar       a tall narrow bamboo basket on the tray: the tied flowers go in stem first and sink below its mouth
//   flower    the lotus she works on: petals on hinges (they open and close), a seed head, tea in its heart, a short stem
//   spoon     a small bamboo spoon, and the pinch of tea it carries
//   lat       a strip of lạt (split bamboo): drawn from its tube, wound round the petals
//   tube      a bamboo tube of lạt strips on the table
// Every builder returns plain three.js objects; the acting (tea.js) moves them.
import * as THREE from 'three';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- nón lá
// hat space: the apex up (+y), the rim at y = 0, radius HAT.R. The headband hangs inside at y = HAT.band.
export const HAT = { R: 0.215, H: 0.19, band: 0.06, bandR: [0.079, 0.094], thick: 0.004 };
export function buildHat(D, { strap = null } = {}) {
  const { Batch, hero, withC, C } = D;
  const b = new Batch();
  const leaf = withC(C.straw, { col: '#b09a78', col2: '#fbf0d4', erode: 0.04, hilite: 0.6, scale: 9, bump: 0.8, gloss: 0.12 });
  const ring = withC(C.bamboo, { col: '#8a7654', col2: '#f0e0b8', erode: 0.05, hilite: 0.4, scale: 12 });
  const R = HAT.R, H = HAT.H, t = HAT.thick;
  // outside: the leaf layers overlap downward, so the surface steps out a little at each of the 16 rings
  const prof = [];
  const N = 16;
  prof.push([0.0006, H + 0.002]);
  for (let i = 1; i <= N; i++) {
    const u0 = (i - 1) / N, u1 = i / N;
    const r0 = R * u0, r1 = R * u1;
    const y0 = H * (1 - u0), y1 = H * (1 - u1);
    // each band bulges a hair in the middle and tucks under the next ring
    prof.push([r0 + (r1 - r0) * 0.5, y0 + (y1 - y0) * 0.5 + 0.0016]);
    prof.push([r1, y1 + 0.0004]);
  }
  // the bound rim, then back up the inside
  prof.push([R + 0.003, -0.0015]);
  prof.push([R + 0.0005, -0.004]);
  prof.push([R - 0.004, -0.001]);
  for (let i = N; i >= 1; i -= 2) {
    const u = i / N;
    prof.push([Math.max(0.0005, R * u - t * 1.2), H * (1 - u) - t * 0.4]);
  }
  prof.push([0.0005, H - t * 1.5]);
  b.lathe(prof, V3(0, 0, 0), leaf, 36);
  // the rings show through as fine ridges
  for (let i = 4; i <= N; i += 2) {
    const u = i / N;
    b.add(new THREE.TorusGeometry(R * u + 0.0008, i === N ? 0.0026 : 0.0011, 3, 36), ring, new THREE.Matrix4().compose(V3(0, H * (1 - u) + 0.0012, 0), new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), Math.PI / 2), V3(1, 1, 1)));
  }
  // the headband: an oval ring of bamboo tied to the inside, hanging to the crown
  const [bx, bz] = HAT.bandR;
  const band = new THREE.TorusGeometry(1, 0.0035 / bx, 4, 28);
  band.scale(bx, bz, bx);
  b.add(band, ring, new THREE.Matrix4().compose(V3(0, HAT.band, 0), new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), Math.PI / 2), V3(1, 1, 1)));
  // four short ties from the band up to the cone
  for (let k = 0; k < 4; k++) {
    const a = (k + 0.5) * Math.PI / 2;
    const p0 = V3(Math.cos(a) * bx, HAT.band, Math.sin(a) * bz);
    const rr = Math.max(bx, bz) + 0.012;
    const yc = H * (1 - rr / R) - t;
    const p1 = V3(Math.cos(a) * (rr - 0.004), yc - 0.003, Math.sin(a) * (rr - 0.004));
    b.rod(p0, p1, 0.0012, ring, 4);
  }
  if (strap) {
    // the quai: a soft ribbon from the band at each ear, down under the chin (strap = points in hat space)
    const silk = { col: '#3a1a2a', col2: '#b25a78', erode: 0, hilite: 0.4, gloss: 0.2, scale: 14, bump: 0.3, smooth: true };
    b.tube(strap, 0.0022, silk, 24, 4);
  }
  // (no offset colour rims: on a cone seen from above they cover the whole brim)
  const g = hero(b.merge(), { rims: false });
  g.userData.main.castShadow = true;
  return g;
}

// ---------------------------------------------------------------- the stool
export const STOOL = { top: 0.25, w: 0.3, d: 0.26 };
export function addStool(b, D) {
  const { withC, C } = D;
  const wood = withC(C.wood, { col: '#2a1c16', col2: '#8a6446', erode: 0.45, hilite: 0.35, scale: 5 });
  const { top, w, d } = STOOL;
  b.rbox(w, 0.028, d, 0.008, V3(0, top - 0.014, 0), wood);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.rod(V3(sx * (w / 2 - 0.035), top - 0.028, sz * (d / 2 - 0.035)), V3(sx * (w / 2 - 0.022), 0.0, sz * (d / 2 - 0.022)), 0.014, wood, 6, 0.016);
  }
  for (const sz of [-1, 1]) b.box(w - 0.07, 0.022, 0.018, V3(0, 0.07, sz * (d / 2 - 0.03)), wood);
  for (const sx of [-1, 1]) b.box(0.018, 0.022, d - 0.07, V3(sx * (w / 2 - 0.03), 0.1, 0), wood);
}

// ---------------------------------------------------------------- a lotus leaf (a shallow wavy bowl), a bud
function leafDisc(r, { seg = 20, rings = 4, droop = null } = {}) {
  const P = [0, 0, 0], I = [];
  for (let j = 1; j <= rings; j++) {
    const rho = j / rings;
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      const x = Math.cos(a) * r * rho, z = Math.sin(a) * r * rho;
      let y = r * (0.06 * rho * rho + 0.03 * Math.sin(a * 5 + r * 13) * rho ** 3);
      if (droop) y += droop(x, z, rho);
      P.push(x, y, z);
    }
  }
  for (let k = 0; k < seg; k++) I.push(0, 1 + ((k + 1) % seg), 1 + k);
  for (let j = 1; j < rings; j++) {
    const o0 = 1 + (j - 1) * seg, o1 = 1 + j * seg;
    for (let k = 0; k < seg; k++) { const k1 = (k + 1) % seg; I.push(o0 + k, o0 + k1, o1 + k, o0 + k1, o1 + k1, o1 + k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}
export const LEAF = { col: '#1f3a2e', col2: '#6f9a6a', erode: 0.25, hilite: 0.35, gloss: 0.15, scale: 7, bump: 1.0 };
export const PETAL = { col: '#b0406e', col2: '#ffc4d6', emit: 0.05, erode: 0, hilite: 0.35, gloss: 0.1, scale: 12, bump: 0.6 };
export const PETAL_IN = { col: '#c85a86', col2: '#ffe0ea', emit: 0.06, erode: 0, hilite: 0.35, gloss: 0.1, scale: 12, bump: 0.6 };
export const STEM = { col: '#2a3a2a', col2: '#6a8660', erode: 0, hilite: 0.2, scale: 10, bump: 0.5 };
export const POD = { col: '#8a7a2a', col2: '#f0d870', emit: 0.04, erode: 0, hilite: 0.4, scale: 14, bump: 0.6 };
export const STAMEN = { col: '#c89020', col2: '#ffe27a', emit: 0.06, erode: 0.1, hilite: 0.3, scale: 16, bump: 0.6 };
export const TEA = { col: '#2a3418', col2: '#8a9a54', erode: 0.1, hilite: 0.2, scale: 30, bump: 1.3 };

// a petal: base at the origin, pointing up (+y), hollow toward +z (the flower's axis is at +z), a narrow boat
function petalGeo(w, l, { cup = 0.4, curl = 0.1, seg = [3, 5] } = {}) {
  const g = new THREE.PlaneGeometry(1, 1, seg[0], seg[1]);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i) + 0.5;
    // a broad oval with a soft point
    const width = w * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + v * 0.9)), 0.55) * (v > 0.8 ? 1 - (v - 0.8) * 1.6 : 1);
    const x = u * width;
    const y = v * l;
    // hollow toward +z (the middle sits back, the edges come forward), the tip curling a little into the hollow
    const z = -0.25 * cup * w * (1 - 4 * u * u) * Math.sin(Math.PI * Math.min(1, 0.1 + v)) + curl * l * v * v;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- the flower she works on
// flower space: the stem runs down (-y) from the receptacle at the origin; the petals open round +y.
// flower.set({ open, tea, show }) moves the petals (CPU, on each drawing); flower.budR(y) is the closed bud's radius at height y.
export function buildFlower(D, { stem = 0.12 } = {}) {
  const { Batch, hero } = D;
  const b = new Batch();
  const ranges = [];
  // (a Batch item becomes non-indexed: its vertex count is the index count; the geometry is not touched after it is added)
  const add = (geo, o, m) => { const n = geo.index ? geo.index.count : geo.attributes.position.count; b.add(geo, o, m); return n; };
  let cursor = 0;
  const mark = (count, info) => { ranges.push({ start: cursor, count, ...info }); cursor += count; };
  // stem and receptacle (still)
  const sg = new THREE.CylinderGeometry(0.0048, 0.0058, stem, 7, 1);
  sg.translate(0, -stem / 2 - 0.004, 0);
  mark(add(sg, STEM), { kind: 'still' });
  const rc = new THREE.SphereGeometry(0.012, 10, 8);
  rc.scale(1, 0.8, 1);
  mark(add(rc, STEM), { kind: 'still' });
  // seed head and stamens
  const pod = new THREE.CylinderGeometry(0.014, 0.008, 0.016, 12, 1);
  pod.translate(0, 0.014, 0);
  mark(add(pod, POD), { kind: 'still' });
  const st = new THREE.TorusGeometry(0.016, 0.0045, 5, 18);
  st.rotateX(Math.PI / 2);
  st.translate(0, 0.012, 0);
  mark(add(st, STAMEN), { kind: 'still' });
  // tea in the heart (scaled from its base)
  const tg = new THREE.IcosahedronGeometry(0.013, 1);
  tg.scale(1, 0.55, 1);
  tg.translate(0, 0.024, 0);
  mark(add(tg, TEA), { kind: 'tea', base: V3(0, 0.02, 0) });
  // petals: three whorls
  const WH = [
    { n: 5, r: 0.011, w: 0.036, l: 0.056, closed: -0.1, open: 0.22, o: PETAL_IN, a0: 0.3 },
    { n: 6, r: 0.015, w: 0.046, l: 0.07, closed: -0.05, open: 0.5, o: PETAL_IN, a0: 0.0 },
    { n: 7, r: 0.019, w: 0.056, l: 0.08, closed: 0.0, open: 0.82, o: PETAL, a0: 0.2 },
  ];
  WH.forEach((wh, wi) => {
    for (let k = 0; k < wh.n; k++) {
      const az = wh.a0 + (k / wh.n) * Math.PI * 2;
      const g = petalGeo(wh.w, wh.l * (0.94 + 0.12 * ((k * 7 + wi) % 3) / 2), { cup: 0.7, curl: 0.12 + wi * 0.03 });
      mark(add(g, wh.o), { kind: 'petal', whorl: wi, az, r: wh.r, closed: wh.closed + 0.03 * Math.sin(k * 2.1 + wi), open: wh.open + 0.08 * Math.sin(k * 1.7 + wi * 2), l: wh.l });
    }
  });
  const geo = b.merge();
  const pos = geo.attributes.position, nor = geo.attributes.normal, sn = geo.attributes.aSN;
  const rest = { p: pos.array.slice(), n: nor.array.slice(), s: sn ? sn.array.slice() : null };
  geo.attributes.position.setUsage(THREE.DynamicDrawUsage);
  const obj = hero(geo, { rimW: 0.9, rimOff: 0.6, cut: 0.55 });
  obj.userData.main.material.side = THREE.DoubleSide;
  obj.userData.main.castShadow = true;
  const M = new THREE.Matrix4(), Mn = new THREE.Matrix3(), q = new THREE.Quaternion(), v = new THREE.Vector3();
  const state = { open: 0, tea: 0 };
  // a petal's tilt out from the axis, for an opening 0..1 (inner whorls follow later, and less)
  const tiltOf = (r, open) => r.closed + (r.open - r.closed) * sm(r.whorl * 0.12, 1, open);
  function petalMatrix(r, open, out) {
    q.setFromAxisAngle(V3(0, 1, 0), -r.az + Math.PI / 2);
    const tilt = tiltOf(r, open);
    const qt = new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), tilt);
    // the petal's own +z faces the axis: base on a small circle round it
    const base = V3(Math.cos(r.az) * r.r, 0.004 + r.whorl * 0.002, Math.sin(r.az) * r.r);
    return out.compose(base, q.clone().multiply(qt).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI)), V3(1, 1, 1));
  }
  function set({ open = state.open, tea = state.tea } = {}) {
    state.open = open; state.tea = tea;
    const P = pos.array, N = nor.array, S = sn ? sn.array : null;
    for (const r of ranges) {
      if (r.kind === 'still') continue;
      if (r.kind === 'tea') {
        const k = Math.max(0.001, tea);
        for (let i = r.start; i < r.start + r.count; i++) {
          for (let c = 0; c < 3; c++) P[i * 3 + c] = r.base.getComponent(c) + (rest.p[i * 3 + c] - r.base.getComponent(c)) * k;
        }
        continue;
      }
      petalMatrix(r, open, M);
      Mn.getNormalMatrix(M);
      for (let i = r.start; i < r.start + r.count; i++) {
        v.set(rest.p[i * 3], rest.p[i * 3 + 1], rest.p[i * 3 + 2]).applyMatrix4(M);
        P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z;
        v.set(rest.n[i * 3], rest.n[i * 3 + 1], rest.n[i * 3 + 2]).applyMatrix3(Mn).normalize();
        N[i * 3] = v.x; N[i * 3 + 1] = v.y; N[i * 3 + 2] = v.z;
        if (S) {
          v.set(rest.s[i * 3], rest.s[i * 3 + 1], rest.s[i * 3 + 2]).applyMatrix3(Mn).normalize();
          S[i * 3] = v.x; S[i * 3 + 1] = v.y; S[i * 3 + 2] = v.z;
        }
      }
    }
    pos.needsUpdate = true; nor.needsUpdate = true; if (sn) sn.needsUpdate = true;
    geo.computeBoundingSphere();
  }
  // where a petal's tip is (flower space), for the fingers that open and close them
  function petalTip(whorl, k, open = state.open, frac = 0.85) {
    const list = ranges.filter((r) => r.kind === 'petal' && r.whorl === whorl);
    const r = list[((k % list.length) + list.length) % list.length];
    petalMatrix(r, open, M);
    const tipLocal = V3(0, r.l * frac, -0.004);
    return { p: tipLocal.applyMatrix4(M), out: V3(Math.cos(r.az), 0, Math.sin(r.az)), az: r.az };
  }
  // the closed bud's outer radius at height y (for the lạt): the outer whorl's surface
  function budR(y, open = state.open) {
    const list = ranges.filter((r) => r.kind === 'petal' && r.whorl === 2);
    let best = 0;
    for (const r of list) {
      petalMatrix(r, open, M);
      for (let i = r.start; i < r.start + r.count; i++) {
        v.set(rest.p[i * 3], rest.p[i * 3 + 1], rest.p[i * 3 + 2]).applyMatrix4(M);
        if (Math.abs(v.y - y) < 0.006) best = Math.max(best, Math.hypot(v.x, v.z));
      }
    }
    return best;
  }
  // every surface point of the flower (flower space), for checks
  function points(filter = () => true) {
    const out = [];
    for (const r of ranges) {
      if (!filter(r)) continue;
      for (let i = r.start; i < r.start + r.count; i++) out.push(V3(pos.array[i * 3], pos.array[i * 3 + 1], pos.array[i * 3 + 2]));
    }
    return out;
  }
  set({ open: 0, tea: 0 });
  return { obj, set, petalTip, budR, points, state, stem, ranges, whorls: WH };
}

// ---------------------------------------------------------------- a small bamboo spoon, and its pinch of tea
// spoon space: the bowl at the origin (hollow up, +y), the handle along -z to z = -SPOON.len
export const SPOON = { len: 0.13, bowl: [0.012, 0.018], handleAt: 0.095 };
export function buildSpoon(D) {
  const { Batch, hero, withC, C } = D;
  const b = new Batch();
  const bam = withC(C.bamboo, { col: '#6a5230', col2: '#e2c890', erode: 0.1, hilite: 0.5, scale: 18 });
  const bowl = new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45);
  bowl.scale(SPOON.bowl[0], 0.008, SPOON.bowl[1]);
  bowl.translate(0, 0.008, 0);
  const h = new THREE.BoxGeometry(0.007, 0.0028, SPOON.len - 0.012);
  h.translate(0, 0.006, -(SPOON.len - 0.012) / 2 - 0.012);
  // (each Batch item becomes non-indexed: the spoon's own vertices come first)
  const nSpoon = [bowl, h].reduce((n, g) => n + (g.index ? g.index.count : g.attributes.position.count), 0);
  b.add(bowl, bam);
  b.add(h, bam);
  b.blob(0.0085, V3(0, 0.004, 0), [1.2, 0.5, 1.5], TEA, 1.7, 1, 0.3);
  const geo = b.merge();
  const main = hero(geo, { rims: false });
  main.userData.main.material.side = THREE.DoubleSide;
  main.userData.main.castShadow = false;
  const pos = geo.attributes.position;
  const rest = pos.array.slice();
  const base = V3(0, 0.004, 0);
  let cur = 1;
  // how much tea it carries (0..1)
  function setTea(k) {
    k = Math.max(0.001, k);
    if (Math.abs(k - cur) < 1e-4) return;
    cur = k;
    for (let i = nSpoon; i < pos.count; i++) {
      pos.array[i * 3] = base.x + (rest[i * 3] - base.x) * k;
      pos.array[i * 3 + 1] = base.y + (rest[i * 3 + 1] - base.y) * k;
      pos.array[i * 3 + 2] = base.z + (rest[i * 3 + 2] - base.z) * k;
    }
    pos.needsUpdate = true;
  }
  return { obj: main, setTea };
}

// ---------------------------------------------------------------- the strip of lạt: a thin ribbon laid along a list of points
export const LAT = { w: 0.0036, t: 0.0007, n: 48, len: 0.34 };
export function buildLat(D) {
  const { Batch, hero, withC, C } = D;
  const n = LAT.n;
  // a strip of n segments, made once through the world's attribute pipeline, then moved on the CPU
  const g = new THREE.PlaneGeometry(1, 1, n - 1, 1);
  const b = new Batch();
  b.add(g, withC(C.bamboo, { col: '#7a6a3a', col2: '#f0e0a8', erode: 0, hilite: 0.5, scale: 20, smooth: true }));
  const geo = b.merge();
  const obj = hero(geo, { rims: false });
  obj.userData.main.material.side = THREE.DoubleSide;
  obj.userData.main.userData.castShadow = false;
  const pos = geo.attributes.position, nor = geo.attributes.normal, sn = geo.attributes.aSN;
  // PlaneGeometry (non-indexed after the batch): recover which grid point each vertex is
  const col = new Int16Array(pos.count), row = new Int8Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    col[i] = Math.round((pos.getX(i) + 0.5) * (n - 1));
    row[i] = pos.getY(i) > 0 ? 0 : 1;
  }
  const T = new THREE.Vector3(), Nn = new THREE.Vector3(), Wd = new THREE.Vector3();
  // pts: n points along the strip (object space); up: the strip's flat normal at each point
  function lay(pts, ups) {
    const P = pos.array, N = nor.array, S = sn ? sn.array : null;
    const side = [];
    for (let k = 0; k < n; k++) {
      T.subVectors(pts[Math.min(n - 1, k + 1)], pts[Math.max(0, k - 1)]).normalize();
      Nn.copy(ups[k]).addScaledVector(T, -ups[k].dot(T)).normalize();
      Wd.crossVectors(T, Nn).normalize();
      side.push([Wd.clone(), Nn.clone()]);
    }
    for (let i = 0; i < pos.count; i++) {
      const k = col[i], s = row[i] ? -1 : 1;
      const [w, nn] = side[k];
      P[i * 3] = pts[k].x + w.x * s * LAT.w / 2;
      P[i * 3 + 1] = pts[k].y + w.y * s * LAT.w / 2;
      P[i * 3 + 2] = pts[k].z + w.z * s * LAT.w / 2;
      N[i * 3] = nn.x; N[i * 3 + 1] = nn.y; N[i * 3 + 2] = nn.z;
      if (S) { S[i * 3] = nn.x; S[i * 3 + 1] = nn.y; S[i * 3 + 2] = nn.z; }
    }
    pos.needsUpdate = true; nor.needsUpdate = true; if (sn) sn.needsUpdate = true;
    geo.computeBoundingSphere();
  }
  return { obj, lay };
}

// ---------------------------------------------------------------- containers
// the deep basket of fresh lotus (basket space: floor at y = 0, open side toward -x, where her hand goes in)
export const BASKET = { r0: 0.12, r1: 0.17, h: 0.27, bed: 0.1, wall: 0.008, lift: 0.2 };
const piecewise = (pts) => (y) => {
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][1]) { const [r0, y0] = pts[i - 1], [r1, y1] = pts[i]; return r0 + (r1 - r0) * ((y - y0) / Math.max(1e-6, y1 - y0)); }
  }
  return pts[pts.length - 1][0];
};
BASKET.prof = piecewise([[BASKET.r0, 0], [BASKET.r0 + (BASKET.r1 - BASKET.r0) * 0.4, BASKET.h * 0.45], [BASKET.r1, BASKET.h], [BASKET.r1 + 0.006, BASKET.h + 0.01]]);
export function addBasket(b, D) {
  const { withC, C } = D;
  // a small low stool under it: the basket at her hand's height, its inside deep enough that nothing in it shows
  const pre = b.pre ? b.pre.clone() : new THREE.Matrix4();
  const wood = withC(C.wood, { col: '#2a1c16', col2: '#8a6446', erode: 0.45, hilite: 0.35, scale: 5 });
  const L = BASKET.lift, S = 0.21;
  b.rbox(S, 0.022, S, 0.006, V3(0, L - 0.011, 0), wood);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.rod(V3(sx * (S / 2 - 0.03), L - 0.022, sz * (S / 2 - 0.03)), V3(sx * (S / 2 - 0.02), 0, sz * (S / 2 - 0.02)), 0.012, wood, 6, 0.014);
  for (const sz of [-1, 1]) b.box(S - 0.06, 0.018, 0.016, V3(0, 0.06, sz * (S / 2 - 0.025)), wood);
  b.pre = pre.clone().multiply(new THREE.Matrix4().makeTranslation(0, L, 0));
  const straw = withC(C.straw, { col: '#4a3820', col2: '#c8a878', erode: 0.3, scale: 11, bump: 1.2 });
  const { r0, r1, h, wall } = BASKET;
  b.lathe([[0, 0], [r0, 0], [r0 + (r1 - r0) * 0.4, h * 0.45], [r1, h], [r1 + 0.006, h + 0.004], [r1 - wall, h + 0.004], [r1 - wall, h - 0.004], [r0 - wall + (r1 - r0) * 0.4, h * 0.45], [r0 - wall, wall], [0, wall]], V3(0, 0, 0), straw, 40);
  b.add(new THREE.TorusGeometry(r1 + 0.001, 0.007, 6, 48), withC(C.bamboo, { col: '#4a3a22', col2: '#b09a6a' }), new THREE.Matrix4().compose(V3(0, h + 0.002, 0), new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), Math.PI / 2), V3(1, 1, 1)));
  // inside: a bed of leaves, and buds lying on it (seen only from above)
  b.add(leafDisc(0.13, { seg: 16, rings: 2 }), LEAF, new THREE.Matrix4().makeTranslation(0, BASKET.bed, 0));
  const lying = [];
  const liftM = new THREE.Matrix4().makeTranslation(0, L, 0);
  for (let k = 0; k < 2; k++) {
    // two waiting buds lie either side of the one she takes next, their tips under the cover
    const c = [V3(0.04, BASKET.bed + 0.026, -0.07), V3(0.04, BASKET.bed + 0.026, 0.07)][k];
    const bud = new THREE.SphereGeometry(0.026, 12, 10);
    bud.scale(1, 1.5, 1);
    const qd = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), V3(1, 0.08, k ? -0.1 : 0.1).normalize());
    b.add(bud, PETAL, new THREE.Matrix4().compose(c, qd, V3(1, 1, 1)));
    lying.push(c.clone().applyMatrix4(liftM));
  }
  // the cover: a big leaf over the far part of the mouth, drooping over the rim there
  const cover = leafDisc(0.22, { seg: 24, rings: 5, droop: (x, z, rho) => -0.09 * Math.max(0, Math.hypot(x + 0.07, z) - 0.175) * 4 });
  // the near part is folded back: those vertices pulled onto the fold line
  const cp = cover.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i);
    if (x < -0.1) { cp.setX(i, -0.1 + (x + 0.1) * 0.1); cp.setY(i, cp.getY(i) + 0.006); }
  }
  cover.computeVertexNormals();
  b.add(cover, LEAF, new THREE.Matrix4().makeTranslation(0.07, h + 0.012, 0));
  b.pre = pre;
  return { lying };
}
// the tall bamboo jar for the tied flowers (jar space: floor at y = 0)
export const JAR = { h: 0.25, r0: 0.05, belly: 0.066, neck: 0.045, lip: 0.049 };
JAR.prof = piecewise([[JAR.r0, 0], [JAR.belly, JAR.h * 0.35], [JAR.belly * 0.97, JAR.h * 0.62], [JAR.neck, JAR.h * 0.9], [JAR.lip, JAR.h]]);
export function addJar(b, D) {
  const { withC, C } = D;
  const bam = withC(C.bamboo, { col: '#4e4226', col2: '#d2bc86', erode: 0.25, scale: 13, bump: 1.1 });
  const { h, r0, belly, neck, lip } = JAR;
  const w = 0.005;
  b.lathe([[0, 0], [r0, 0], [belly, h * 0.35], [belly * 0.97, h * 0.62], [neck, h * 0.9], [lip, h], [lip - w, h], [neck - w, h * 0.9], [belly * 0.97 - w, h * 0.62], [belly - w, h * 0.35], [r0 - w, w], [0, w]], V3(0, 0, 0), bam, 32);
  b.add(new THREE.TorusGeometry(lip, 0.0035, 5, 32), withC(C.bamboo, { col: '#3a3020', col2: '#9a8a60' }), new THREE.Matrix4().compose(V3(0, h, 0), new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), Math.PI / 2), V3(1, 1, 1)));
}
// the bamboo tube of lạt strips (tube space: floor at y = 0)
export const TUBE = { r: 0.024, h: 0.12, strips: 9 };
export function addTube(b, D) {
  const { withC, C } = D;
  const bam = withC(C.bamboo, { col: '#3e4a26', col2: '#b0b878', erode: 0.2, scale: 9 });
  const { r, h } = TUBE;
  b.lathe([[0, 0], [r, 0], [r, h], [r - 0.003, h], [r - 0.003, 0.006], [0, 0.006]], V3(0, 0, 0), bam, 20);
  b.add(new THREE.TorusGeometry(r + 0.0005, 0.0025, 4, 20), bam, new THREE.Matrix4().compose(V3(0, h * 0.3, 0), new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), Math.PI / 2), V3(1, 1, 1)));
  const strip = withC(C.bamboo, { col: '#7a6a3a', col2: '#f0e0a8', erode: 0, hilite: 0.4, scale: 20 });
  for (let k = 0; k < TUBE.strips; k++) {
    const a = k * 2.4;
    const rr = 0.012 * Math.sqrt((k + 0.5) / TUBE.strips);
    const p0 = V3(Math.cos(a) * rr, 0.01, Math.sin(a) * rr);
    const p1 = V3(Math.cos(a) * (rr + 0.012), h + 0.1 + 0.03 * Math.sin(k), Math.sin(a) * (rr + 0.012));
    const g = new THREE.BoxGeometry(0.0034, p1.distanceTo(p0), 0.0007);
    const qd = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), p1.clone().sub(p0).normalize());
    b.add(g, strip, new THREE.Matrix4().compose(p0.clone().lerp(p1, 0.5), qd.multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), a)), V3(1, 1, 1)));
  }
}
// the still things (stool, fresh-lotus basket, jar, lạt tube) as one painted mesh: place = { basket: Matrix4, jar: Matrix4, tube: Matrix4 }
export function buildStill(D, place) {
  const { Batch, hero } = D;
  const b = new Batch();
  b.pre = new THREE.Matrix4();
  addStool(b, D);
  b.pre = place.basket;
  const basket = addBasket(b, D);
  b.pre = place.jar;
  addJar(b, D);
  b.pre = place.tube;
  addTube(b, D);
  b.pre = null;
  const g = hero(b.merge(), { rims: false, tier: 0.03 });
  g.userData.main.material.side = THREE.DoubleSide;
  g.userData.main.castShadow = true;
  return { obj: g, lying: basket.lying };
}
