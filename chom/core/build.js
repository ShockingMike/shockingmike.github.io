// Chớm world, core: shared builders. Everything here is built from code and painted by core/paint.js.
//   Batch (merge many small shapes into one mesh), hero / heroOf (a painted main thing with offset colour rims),
//   sketchAround (loose white lines), ribbons (constant-width lines), C (paint presets), peachBranch, bucket,
//   buildBottle + labelTexture (the Chớm bottle), streetSign (a Hanoi street plate), buildMotorbike (an early-2000s
//   step-through, no badge), buildHouses / thinHouse / lowHouse / gapRow (tube houses along a street), wireLines.
// Season-only pieces (a flower stall, lanterns, a banner) live in seasons/<season>/.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { U, heroAttrs, knifeAttrs, heroMaterial, rimMaterial, sketchMaterial, knifeMaterial, prof } from './paint.js';

export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const Yax = V3(0, 1, 0);
const tq = new THREE.Quaternion(), te = new THREE.Euler(), ts = new THREE.Vector3();
export const mat = (pos, rot = [0, 0, 0], scl = [1, 1, 1]) => new THREE.Matrix4().compose(pos, tq.clone().setFromEuler(te.set(...rot)), ts.clone().set(...scl));

// ---------------------------------------------------------------- the build's work, in slices
// A Batch keeps what it is asked to make and makes it later, a few milliseconds at a time (the page keeps drawing meanwhile);
// merge() returns the geometry at once and it fills in when its shapes are done. Reading a geometry that is not done yet
// (its attributes) finishes it on the spot, so code that needs it now still gets the same result.
export const WORK = {
  queue: [],
  // ms of work per slice. core/world.js sets budget(): a season built in the background of the four-season page takes a
  // little right after each of the page's frames (less while the viewer is scrolling); a season not shown yet takes more
  budget: () => 24,
  // true while the queue must not run at all (set by core/world.js, see tick below)
  held: () => false,
  running: false,
  waiters: [],
  // resolves when every merged geometry is done
  idle() { return this.queue.length ? new Promise((res) => this.waiters.push(res)) : Promise.resolve(); },
  // the next slice starts right after the page's next frame is drawn, and may run sliceMs()
  nextSlice() { return new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0))); },
  sliceMs() { return this.budget(); },
  // run everything left now
  flush() { while (this.queue.length) { const j = this.queue[0]; stepJob(j, Infinity); if (j.settled) this.queue.shift(); } settleWaiters(); },
  stats: { slices: 0, longest: 0, items: 0, longestItem: 0, longestItemWhat: '', longestStep: 0, longestStepWhat: '' },
};
// a slice runs right after a frame of the page is drawn (so it never delays the frame in front of it), and not at all
// while WORK.held() says so (core/world.js: a GPU step waiting out the four-season page's entrance; the rest of the
// entrance the queue runs at the small budget world.js gives it)
const tick = (f) => requestAnimationFrame(() => setTimeout(() => (WORK.held() ? setTimeout(() => tick(f), 50) : f()), 0));
function settleWaiters() { if (WORK.queue.length) return; const w = WORK.waiters.splice(0); for (const res of w) res(); }
function kick() {
  if (WORK.running) return;
  WORK.running = true;
  tick(runSlice);
}
function runSlice() {
  const t0 = performance.now(), end = t0 + WORK.sliceMs();
  while (WORK.queue.length && performance.now() < end) {
    const j = WORK.queue[0];
    if (!j.settled) stepJob(j, end);
    if (j.settled) WORK.queue.shift();
  }
  const dt = performance.now() - t0;
  WORK.stats.slices++; WORK.stats.longest = Math.max(WORK.stats.longest, +dt.toFixed(1));
  if (WORK.queue.length) tick(runSlice);
  else { WORK.running = false; settleWaiters(); }
}
function makeOne(it, kind, wind) {
  const t0 = performance.now();
  const geo = it.make();
  let g = geo.index ? geo.toNonIndexed() : (it.own ? geo : geo.clone());
  if (it.m) g.applyMatrix4(it.m);
  if (it.pre) g.applyMatrix4(it.pre);
  g = kind === 'hero' ? heroAttrs(g, it.o) : knifeAttrs(g, it.o);
  if (wind) {
    const n = g.attributes.position.count, pos = g.attributes.position;
    const sw = new Float32Array(n), tr = new Float32Array(n).fill(it.tree);
    const sway = it.sway;
    if (typeof sway === 'function') for (let i = 0; i < n; i++) sw[i] = sway(pos.getX(i), pos.getY(i), pos.getZ(i));
    else sw.fill(sway);
    g.setAttribute('aSway', new THREE.BufferAttribute(sw, 1));
    g.setAttribute('aTree', new THREE.BufferAttribute(tr, 1));
  }
  WORK.stats.items++;
  prof('Batch.make', t0);
  const dt = performance.now() - t0;
  if (dt > WORK.stats.longestItem) { WORK.stats.longestItem = +dt.toFixed(1); WORK.stats.longestItemWhat = `${geo.type} ${g.attributes.position.count} verts`; }
  return g;
}
// one job = one merge(): make its shapes, then join them (as mergeGeometries does), then its bounding sphere
function stepJob(j, end) {
  const t0 = performance.now();
  // each shape is made and its numbers copied straight into the joined arrays, then let go: holding every shape until the end
  // would leave the browser a heap of rubbish to clear away (a long pause in the middle of a scroll)
  while (j.next < j.items.length) {
    const p = makeOne(j.items[j.next], j.kind, j.wind);
    j.items[j.next++] = null;
    if (!j.out) {
      const ts = performance.now();
      const names = Object.keys(p.attributes);
      j.out = { names, cap: 0, used: 0, arrays: {}, itemSize: {}, normalized: {} };
      for (const n of names) { j.out.itemSize[n] = p.attributes[n].itemSize; j.out.normalized[n] = p.attributes[n].normalized; j.out.arrays[n] = null; }
      const dts = performance.now() - ts;
      if (dts > WORK.stats.longestStep) { WORK.stats.longestStep = +dts.toFixed(1); WORK.stats.longestStepWhat = `setting up ${names.length} kinds of number`; }
    }
    const o = j.out;
    const n = p.attributes.position.count;
    if (o.used + n > o.cap) {
      // (grow in steps, keeping what is already in)
      const cap = Math.max(o.cap * 2, o.used + n, 4096);
      for (const k of o.names) {
        const arr = new Float32Array(cap * o.itemSize[k]);
        if (o.arrays[k]) arr.set(o.arrays[k].subarray(0, o.used * o.itemSize[k]));
        o.arrays[k] = arr;
      }
      o.cap = cap;
    }
    for (const k of o.names) {
      const a = p.attributes[k];
      if (!a) throw new Error(`Batch.merge: a shape has no ${k} (every shape of one batch must carry the same numbers)`);
      o.arrays[k].set(a.array, o.used * o.itemSize[k]);
    }
    o.used += n;
    if (performance.now() >= end) { prof('Batch.job', t0); return; }
  }
  if (!j.merged) {
    const o = j.out;
    const g = new THREE.BufferGeometry();
    for (const k of o.names) {
      const need = o.used * o.itemSize[k];
      const arr = o.arrays[k].length > need * 1.25 ? o.arrays[k].slice(0, need) : o.arrays[k].subarray(0, need);
      g.setAttribute(k, new THREE.BufferAttribute(arr, o.itemSize[k], o.normalized[k]));
    }
    j.merged = g;
    j.out = null;
  }
  // the bounding sphere, as three computes it (the box's centre, the farthest point), a slice at a time
  const pos = j.merged.attributes.position;
  if (!j.bs) j.bs = { i: 0, pass: 0, box: new THREE.Box3(), center: new THREE.Vector3(), r2: 0 };
  const bs = j.bs, v = new THREE.Vector3(), CH = 50000;
  while (bs.pass < 2) {
    const stop = Math.min(pos.count, bs.i + CH);
    if (bs.pass === 0) { for (let i = bs.i; i < stop; i++) bs.box.expandByPoint(v.fromBufferAttribute(pos, i)); }
    else { for (let i = bs.i; i < stop; i++) bs.r2 = Math.max(bs.r2, bs.center.distanceToSquared(v.fromBufferAttribute(pos, i))); }
    bs.i = stop;
    if (bs.i >= pos.count) {
      if (bs.pass === 0) bs.box.getCenter(bs.center);
      bs.pass++; bs.i = 0;
    }
    if (bs.pass < 2 && performance.now() >= end) { prof('Batch.job', t0); return; }
  }
  const sphere = new THREE.Sphere(bs.center.clone(), Math.sqrt(bs.r2));
  settle(j, sphere);
  prof('Batch.job', t0);
}
function settle(j, sphere) {
  const g = j.g, m = j.merged;
  Object.defineProperty(g, 'attributes', { value: m.attributes, writable: true, configurable: true, enumerable: true });
  g.index = m.index;
  g.boundingSphere = sphere;
  j.settled = true;
  j.items = j.parts = null;
  j.merged = null;
}
function lazyGeometry(items, kind, wind) {
  const g = new THREE.BufferGeometry();
  g.userData.lazy = true;
  const j = { g, items, parts: [], next: 0, kind, wind, out: null, merged: null, bs: null, settled: false };
  Object.defineProperty(g, 'attributes', {
    configurable: true, enumerable: true,
    get() {
      // someone needs it now: finish this one at once
      if (!j.settled) { const t0 = performance.now(); stepJob(j, Infinity); prof('Batch.flush (read early)', t0); }
      return g.attributes;
    },
    set(v) { if (!j.settled) stepJob(j, Infinity); g.attributes = v; },
  });
  WORK.queue.push(j);
  kick();
  return g;
}

export class Batch {
  constructor({ kind = 'hero', wind = false } = {}) { this.items = []; this.kind = kind; this.wind = wind; this.pre = null; }
  // make: () => a new geometry; own: it is ours (not the caller's), so it need not be copied
  push(make, own, opts, matrix, sway = 0, tree = 0) {
    this.items.push({ make, own, o: { ...opts }, m: matrix ? matrix.clone() : null, pre: this.pre, sway, tree });
  }
  add(geo, opts, matrix, sway = 0, tree = 0) { this.push(() => geo, false, opts, matrix, sway, tree); }
  box(w, h, d, pos, o, rot, sway, tree) { this.push(() => new THREE.BoxGeometry(w, h, d), true, o, mat(pos, rot), sway, tree); }
  rbox(w, h, d, r, pos, o, rot, sway, tree) { this.push(() => new RoundedBoxGeometry(w, h, d, 3, r), true, { ...o, smooth: o.smooth ?? false }, mat(pos, rot), sway, tree); }
  cyl(r1, r2, h, pos, o, seg = 24, rot, sway, tree, open = false) { this.push(() => new THREE.CylinderGeometry(r1, r2, h, seg, 1, open), true, o, mat(pos, rot), sway, tree); }
  sphere(r, pos, scl, o, seg = 20, rot, sway, tree) { this.push(() => new THREE.SphereGeometry(r, seg, Math.max(8, seg >> 1)), true, { ...o, smooth: true }, mat(pos, rot, scl), sway, tree); }
  // phiStart turns the profile's first corner round the axis INSIDE the shape, before scl squashes it. (The placing
  // matrix scales first and turns after — Matrix4.compose — so turning a squashed shape with `rot` turns the squash too:
  // a square frustum turned 45° by `rot` and squashed to a bottle's depth came out a rhombus lying across the bottle's
  // diagonal. That was the Chớm flacon's shoulder, 18/9–22/9: see core/bottle.js.)
  lathe(profile, pos, o, seg = 32, rot, scl, sway, tree, phiStart = 0) {
    const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
    this.push(() => new THREE.LatheGeometry(pts, seg, phiStart), true, { ...o, smooth: true }, mat(pos, rot, scl), sway, tree);
  }
  // a round rod between two points
  rod(a, b, r, o, seg = 10, r2 = r, sway, tree) {
    const d = b.clone().sub(a), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(Yax, d.normalize());
    this.push(() => new THREE.CylinderGeometry(r2, r, len, seg, 1), true, { ...o, smooth: o.smooth ?? true }, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V3(1, 1, 1)), sway, tree);
  }
  capsule(a, b, r, o, sway, tree) {
    const d = b.clone().sub(a), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(Yax, d.normalize());
    this.push(() => new THREE.CapsuleGeometry(r, len, 6, 14), true, { ...o, smooth: true }, new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, V3(1, 1, 1)), sway, tree);
  }
  tube(points, r, o, seg = 16, radial = 7, sway, tree) {
    const pts = points.map((p) => p.clone());
    this.push(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, radial, false), true, { ...o, smooth: true }, null, sway, tree);
  }
  blob(r, pos, scl, o, seed, detail = 2, amp = 0.16, sway, tree) {
    this.push(() => {
      const g = new THREE.IcosahedronGeometry(r, detail);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const k = 1 + amp * (Math.sin(x * 5.1 / r + seed) * Math.sin(y * 4.3 / r + seed * 1.7) + 0.5 * Math.sin(z * 7.7 / r + seed * 2.3));
        p.setXYZ(i, x * k, y * k, z * k);
      }
      g.computeVertexNormals();
      return g;
    }, true, { ...o, smooth: true }, mat(pos, [0, seed, 0], scl), sway, tree);
  }
  merge() {
    const items = this.items;
    this.items = [];
    if (!items.length) return mergeGeometries([], false);
    return lazyGeometry(items, this.kind, this.wind);
  }
  get empty() { return this.items.length === 0; }
}

// ---------------------------------------------------------------- the reference view (set once by main.js)
export const REF = { eye: new THREE.Vector3(), right: V3(1, 0, 0), up: V3(0, 1, 0), fwd: V3(0, 0, -1), px: 0.0008 };
// screen direction of the key light: the vermilion band leans that way, the mint band the other way
function lightScreen() {
  const L = U.uKeyDir.value;
  const v = new THREE.Vector2(L.dot(REF.right), L.dot(REF.up)).normalize();
  return v;
}

// a hero: the painted body + two offset colour bands. Returns a Group.
export const SKETCH_MATS = [];
// D: the bands are ~30% thinner than C and only the main things carry them
export function hero(geo, { wind = false, rims = true, rimW = 2.35, rimOff = 1.5, cut = 0.45, tier = 0, glass = 0, receive = false } = {}) {
  const g = new THREE.Group();
  const main = new THREE.Mesh(geo, heroMaterial({ wind, tier, glass, receive }));
  main.frustumCulled = false;
  g.add(main);
  if (rims) {
    const ls = lightScreen();
    const r1 = new THREE.Mesh(geo, rimMaterial({ color: U.uRim1.value, side: 1, width: rimW, off: [ls.x * rimOff, ls.y * rimOff], cut, wind }));
    const r2 = new THREE.Mesh(geo, rimMaterial({ color: U.uRim2.value, side: -1, width: rimW * 0.9, off: [-ls.x * rimOff, -ls.y * rimOff], cut: cut + 0.05, wind }));
    r1.frustumCulled = r2.frustumCulled = false;
    r1.renderOrder = r2.renderOrder = 1;
    g.add(r1, r2);
  }
  g.userData.main = main;
  return g;
}
export function heroOf(batch, opts) { return hero(batch.merge(), opts); }

// ---------------------------------------------------------------- loose sketch lines around a hero
function hull2(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
function resample(poly, n) {
  const L = [0];
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; L.push(L[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const total = L[L.length - 1];
  const out = [];
  let k = 0;
  for (let j = 0; j < n; j++) {
    const s = (j / n) * total;
    while (L[k + 1] < s) k++;
    const a = poly[k], b = poly[(k + 1) % poly.length];
    const t = (s - L[k]) / Math.max(1e-9, L[k + 1] - L[k]);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  // soften the corners a little
  for (let it = 0; it < 2; it++) {
    const c = out.map((p) => p.slice());
    for (let j = 0; j < n; j++) { const a = c[(j + n - 1) % n], b = c[(j + 1) % n]; out[j][0] = c[j][0] * 0.5 + (a[0] + b[0]) * 0.25; out[j][1] = c[j][1] * 0.5 + (a[1] + b[1]) * 0.25; }
  }
  return { pts: out, total };
}

// ribbon geometry from polylines (local points). Each vertex: side, along, width px, alpha
export function ribbons(lines) {
  const P = [], T = [], RB = [], LN = [], I = [];
  let base = 0;
  for (const { pts, width = 1.6, alpha = 0.9 } of lines) {
    let len = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const t = b.clone().sub(a).normalize();
      if (i > 0) len += pts[i].distanceTo(pts[i - 1]);
      for (const s of [-1, 1]) { P.push(pts[i].x, pts[i].y, pts[i].z); T.push(t.x, t.y, t.z); RB.push(s, i / (pts.length - 1), width, alpha); LN.push(len); }
      if (i < pts.length - 1) { const k = base + i * 2; I.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    base += pts.length * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aTan', new THREE.Float32BufferAttribute(T, 3));
  g.setAttribute('aRib', new THREE.Float32BufferAttribute(RB, 4));
  g.setAttribute('aLen', new THREE.Float32BufferAttribute(LN, 1));
  g.setIndex(I);
  return g;
}

// loops drawn around the silhouette as seen from the reference eye, living in the object's own space
export function sketchAround(obj, { seed = 1, loops = 2, off = [2, 10], wob = 5, width = 1.6, alpha = 0.85, color, wind = false, inner = 0, move = null, lift = 6, dry = 1, edge = null, ink } = {}) {
  obj.updateWorldMatrix(true, true);
  const pts = [];
  const v = new THREE.Vector3();
  let zc = 0, nz = 0;
  obj.traverse((o) => {
    if (!o.isMesh || !o.geometry || o.material.side === THREE.BackSide || o.geometry.attributes.aTan || !o.visible) return;
    const pos = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 3000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).sub(REF.eye);
      const z = v.dot(REF.fwd);
      if (z < 0.2) continue;
      pts.push([v.dot(REF.right) / z, v.dot(REF.up) / z]);
      zc += z; nz++;
    }
  });
  if (pts.length < 3) return null;
  zc /= nz;
  const H = hull2(pts);
  const { pts: ring } = resample(H, 96);
  let cx = 0, cy = 0;
  for (const p of ring) { cx += p[0]; cy += p[1]; }
  cx /= ring.length; cy /= ring.length;
  let s = seed * 9301 + 49297;
  const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pxA = REF.px; // angle per pixel
  const liftPx = lift;              // how far the ends drift out, in screen pixels (smaller for a bottle seen very close)
  const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
  const lines = [];
  for (let l = 0; l < loops; l++) {
    const start = R() * 96, span = 40 + R() * 44;
    const o0 = off[0] + R() * (off[1] - off[0]) - (l === 0 ? inner : 0);
    const f1 = 1 + Math.floor(R() * 3), p1 = R() * 6.28, f2 = 3 + Math.floor(R() * 3), p2 = R() * 6.28;
    const line = [];
    const nSeg = Math.round(span);
    for (let k = 0; k <= nSeg; k++) {
      const u = start + k;
      const i0 = Math.floor(u) % 96, i1 = (i0 + 1) % 96, f = u - Math.floor(u);
      const x = ring[i0][0] * (1 - f) + ring[i1][0] * f, y = ring[i0][1] * (1 - f) + ring[i1][1] * f;
      let dx = x - cx, dy = y - cy;
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl; dy /= dl;
      const ang = (u / 96) * 6.2832;
      const o = (o0 + wob * (0.6 * Math.sin(ang * f1 + p1) + 0.4 * Math.sin(ang * f2 + p2))) * pxA;
      // ends drift outward a little, like a hand lifting off
      const lift = Math.pow(Math.abs(k / nSeg - 0.5) * 2, 3) * liftPx * pxA;
      const X = x + dx * (o + lift), Y = y + dy * (o + lift);
      const w = REF.eye.clone().addScaledVector(REF.fwd, zc).addScaledVector(REF.right, X * zc).addScaledVector(REF.up, Y * zc);
      line.push(w.applyMatrix4(inv));
    }
    lines.push({ pts: line, width: width * (0.8 + 0.4 * R()), alpha: alpha * (0.75 + 0.25 * R()) });
  }
  const m = sketchMaterial({ color, wind, move, dry, edge, ink });
  SKETCH_MATS.push(m);
  const mesh = new THREE.Mesh(ribbons(lines), m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  obj.add(mesh);
  return mesh;
}

// ---------------------------------------------------------------- palette, in tiers
// main things (people, bottle, the branch in the customer's hand): deep bodies, full contrast
// secondary things (the rest of the stall, the motorbike): quieter; accents only peach pink (first) and kumquat orange (second)
export const C = {
  body: { col: '#0b2327', col2: '#2f6f6c', gloss: 0.9, erode: 0.55, hilite: 0.9, scale: 3.2, bump: 0.9 },
  bucket: { col: '#2c3a3c', col2: '#7d8f8c', gloss: 0.6, erode: 0.5, hilite: 0.6, scale: 3, bump: 0.8 },
  pot: { col: '#2a2c38', col2: '#6f7488', gloss: 0.7, erode: 0.5, hilite: 0.7, scale: 3, bump: 0.8 },
  lacquer: { col: '#2a1012', col2: '#8a3a2c', gloss: 0.8, erode: 0.45, hilite: 0.8, scale: 3, bump: 0.9 },
  wood: { col: '#3e2c22', col2: '#a07a58', gloss: 0.2, erode: 0.4, hilite: 0.3, scale: 3, vert: 1, bump: 1 },
  bamboo: { col: '#5a5038', col2: '#c8b884', gloss: 0.3, erode: 0.3, hilite: 0.4, scale: 5, vert: 1, bump: 0.8 },
  bark: { col: '#241a1e', col2: '#6a4a48', gloss: 0.1, erode: 0.2, hilite: 0.2, scale: 8, vert: 1, bump: 0.9 },
  blossom: { col: '#d8456c', col2: '#ffb6c6', emit: 0.06, erode: 0, hilite: 0.25, scale: 14, bump: 0.6 },
  blossomW: { col: '#e88aa0', col2: '#ffe0e6', emit: 0.08, erode: 0, hilite: 0.25, scale: 14, bump: 0.6 },
  bud: { col: '#b8385a', col2: '#ff8aa4', erode: 0, hilite: 0.3, scale: 14, bump: 0.5 },
  // the stall's peach: the same flower, a step quieter
  blossom2: { col: '#b86a80', col2: '#ecbcc6', emit: 0.03, erode: 0, hilite: 0.2, scale: 14, bump: 0.6 },
  blossomW2: { col: '#c8a0aa', col2: '#f4e2e4', emit: 0.04, erode: 0, hilite: 0.2, scale: 14, bump: 0.6 },
  bud2: { col: '#9a5064', col2: '#e0a0b0', erode: 0, hilite: 0.2, scale: 14, bump: 0.5 },
  leaf: { col: '#1c3a2c', col2: '#6e9a64', erode: 0.35, hilite: 0.45, gloss: 0.35, scale: 6, bump: 1.1 },
  kumquat: { col: '#e0600e', col2: '#ffae3c', erode: 0, hilite: 0.9, gloss: 0.35, emit: 0.06, scale: 10, bump: 0.5 },
  lixi: { col: '#b0141a', col2: '#ff4a32', erode: 0.1, hilite: 0.6, gloss: 0.3, emit: 0.04, scale: 9, bump: 0.6 },
  gold: { col: '#a8761c', col2: '#ffd666', erode: 0, hilite: 0.9, gloss: 0.5, emit: 0.05, scale: 12, bump: 0.5 },
  mum: { col: '#a88c58', col2: '#eedcaa', erode: 0.3, hilite: 0.2, emit: 0.03, scale: 9, bump: 1.1 },
  mumW: { col: '#b4aea0', col2: '#f6f2e8', erode: 0.3, hilite: 0.2, emit: 0.04, scale: 9, bump: 1.1 },
  stem: { col: '#2a4032', col2: '#6a8a64', erode: 0, hilite: 0.2, scale: 10, bump: 0.6 },
  skin: { col: '#7a4a3a', col2: '#dca482', erode: 0.15, hilite: 0.35, gloss: 0.1, scale: 8, bump: 0.4 },
  straw: { col: '#8a6c40', col2: '#f2dca6', erode: 0.3, hilite: 0.5, scale: 7, bump: 1.1 },
  paper: { col: '#7a6448', col2: '#e2caa0', erode: 0.35, hilite: 0.3, scale: 5, bump: 1 },
  redPlastic: { col: '#6a2a28', col2: '#c8645a', gloss: 0.4, erode: 0.35, hilite: 0.7, scale: 4, bump: 0.7 },
  steel: { col: '#1c2226', col2: '#687a80', gloss: 0.8, erode: 0.35, hilite: 0.8, scale: 5, bump: 0.6 },
  tyre: { col: '#0c0e12', col2: '#3a4048', gloss: 0.3, erode: 0.3, hilite: 0.5, scale: 6, bump: 0.8 },
  hair: { col: '#08080c', col2: '#3a3844', gloss: 0.7, erode: 0.2, hilite: 0.6, scale: 10, vert: 1, bump: 0.8 },
};
export const withC = (base, o) => ({ ...base, ...o });
// secondary things (the rest of a stall, a passing motorbike) sit one tier back in the air
export const TIER2 = 0.12;

// ---------------------------------------------------------------- flowers
// a peach branch: a crooked stem with side twigs, blossoms and buds along them
export function peachBranch(b, base, dir, len, R, { twigs = 5, bloom = 26, petal = 0.022, sway = null, tree = 0, thick = 0.018, wood = C.bark, quiet = false } = {}) {
  const P = quiet ? { a: C.blossom2, w: C.blossomW2, bud: C.bud2 } : { a: C.blossom, w: C.blossomW, bud: C.bud };
  const pts = [base.clone()];
  const d = dir.clone().normalize();
  const side = new THREE.Vector3().crossVectors(d, V3(0.3, 0.2, 1).normalize()).normalize();
  const nSeg = 5;
  for (let i = 1; i <= nSeg; i++) {
    const t = i / nSeg;
    pts.push(base.clone().addScaledVector(d, len * t).addScaledVector(side, Math.sin(t * 5 + R() * 2) * len * 0.05));
  }
  const sw = sway ?? ((x, y, z) => 0);
  b.tube(pts, thick, wood, 12, 6, sw, tree);
  const curve = new THREE.CatmullRomCurve3(pts);
  const flowerAt = (p, s) => {
    const n = V3(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
    if (R() < 0.18) { b.sphere(s * 0.28, p, [1, 1.3, 1], P.bud, 7, [R(), R(), R()], sw, tree); return; }
    const disc = new THREE.CircleGeometry(s, 10);
    const pp = disc.attributes.position;
    for (let i = 1; i < pp.count; i++) {
      const x = pp.getX(i), y = pp.getY(i), a = Math.atan2(y, x);
      const k = 0.62 + 0.38 * Math.abs(Math.cos(2.5 * a));
      pp.setXYZ(i, x * k, y * k, (1 - k) * s * 0.6);
    }
    disc.computeVertexNormals();
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), n);
    b.add(disc, R() < 0.35 ? P.w : P.a, new THREE.Matrix4().compose(p, q, V3(1, 1, 1)), sw, tree);
    b.sphere(s * 0.2, p.clone().addScaledVector(n, s * 0.12), [1, 1, 1], withC(P.bud, quiet ? { col: '#6a3040', col2: '#d8b880' } : { col: '#8a1030', col2: '#ffd070' }), 5, [0, 0, 0], sw, tree);
  };
  const tw = [];
  for (let i = 0; i < twigs; i++) {
    const t = 0.25 + 0.7 * (i / Math.max(1, twigs - 1)) + (R() - 0.5) * 0.08;
    const p = curve.getPoint(Math.min(0.98, t));
    const td = d.clone().multiplyScalar(0.5).add(V3(R() - 0.5, R() * 0.6, R() - 0.5)).normalize();
    const tl = len * (0.18 + R() * 0.2);
    const e = p.clone().addScaledVector(td, tl);
    b.tube([p, p.clone().lerp(e, 0.5).add(V3((R() - 0.5) * 0.03, 0.01, 0)), e], thick * 0.5, wood, 5, 5, sw, tree);
    tw.push([p, e]);
  }
  for (let i = 0; i < bloom; i++) {
    let p;
    if (R() < 0.45 || !tw.length) p = curve.getPoint(0.2 + 0.8 * R());
    else { const [a, e] = tw[Math.floor(R() * tw.length)]; p = a.clone().lerp(e, 0.2 + 0.8 * R()); }
    flowerAt(p.add(V3((R() - 0.5), (R() - 0.5), (R() - 0.5)).multiplyScalar(petal * 0.8)), petal * (0.8 + 0.5 * R()));
  }
  return pts[pts.length - 1];
}

export function bucket(b, pos, r, h, o = C.bucket) {
  b.lathe([[0, 0], [r * 0.82, 0], [r * 0.86, 0.01], [r, h * 0.97], [r * 1.05, h], [r * 0.98, h], [r * 0.9, h * 0.94], [0, h * 0.94]], pos, o, 36);
}

// ---------------------------------------------------------------- the bottle (painted like everything else)
// the bottle and its label now live in core/bottle.js (one shape per file, so a new bottle can take its place); they are
// still handed out from here, because that is where every season looks for them
export { buildBottle, labelTexture, registerBottleShape, bottleShapes, bottleLabel, bottleGlint } from './bottle.js';

// ---------------------------------------------------------------- a Hanoi street-name plate: blue enamel, white letters, a white frame
export function streetSign({ top = 'PHỐ', name = 'HÀNG LƯỢC' } = {}) {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 640, 256);
  g.strokeStyle = '#fff'; g.lineWidth = 9; g.strokeRect(16, 16, 608, 224);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = '700 52px Arial, "Helvetica Neue", "Segoe UI", sans-serif';
  g.fillText(top, 320, 88);
  g.font = '700 104px Arial, "Helvetica Neue", "Segoe UI", sans-serif';
  const w = g.measureText(name).width;
  g.save(); g.translate(320, 212); g.scale(Math.min(1, 560 / w), 1); g.fillText(name, 0, 0); g.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, tText: { value: tex } },
    vertexShader: `varying vec2 vUv; varying vec3 vWP; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tBrush, tText, tWash; uniform vec3 uAir, uKeyCol, uKShade, uKLit; uniform float uAirNear, uAirFar, uAirMax;
      varying vec2 vUv; varying vec3 vWP;
      float band(float x, float t){ float w = max(fwidth(x), 1e-4) * 0.75; return smoothstep(t - w, t + w, x); }
      void main(){
        vec4 b = texture2D(tBrush, vUv * vec2(1.3, 0.5) + 0.43);
        vec4 b2 = texture2D(tBrush, vUv.yx * vec2(0.8, 2.2) + 0.17);
        float ink = texture2D(tText, vUv).r;
        // enamel laid in horizontal strokes, faded where sun and rain have been at it; the letters stay clear
        vec3 enamel = mix(vec3(0.06, 0.18, 0.4), vec3(0.14, 0.32, 0.56), band(b.b + (b2.a - 0.5) * 0.3, 0.5));
        float fade = band(texture2D(tWash, vUv * vec2(0.35, 0.15) + 0.62).r + (b.a - 0.5) * 0.3, 0.62);
        enamel = mix(enamel, vec3(0.3, 0.44, 0.6), fade * 0.6);
        vec3 paint = mix(vec3(0.88, 0.88, 0.84), vec3(0.98, 0.97, 0.93), band(b2.b, 0.5));
        vec3 col = mix(enamel, paint, ink);
        // a little rust weeping from the screws, like every old plate
        float rust = smoothstep(0.62, 0.8, b.a) * (1.0 - smoothstep(0.0, 0.3, abs(vUv.x - 0.06) * abs(vUv.x - 0.94) * 12.0)) * 0.4;
        col = mix(col, vec3(0.42, 0.24, 0.16), rust * (1.0 - ink));
        float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        if (edge + (b.a - 0.5) * 0.02 < 0.0) discard;
        col *= mix(uKShade, uKLit, 0.25) * 1.05;
        float air = smoothstep(uAirNear, uAirFar, length(cameraPosition - vWP)) * uAirMax;
        col = mix(col, uAir, air * 0.55);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.52), m);
}

// ---------------------------------------------------------------- motorbike (an early-2000s Vietnamese step-through, no badge) with a big peach branch strapped behind
export function buildMotorbike(scene, R) {
  const g = new THREE.Group();
  scene.add(g);
  const tier = TIER2;
  const b = new Batch();
  const paint = withC(C.body, { col: '#3a3436', col2: '#9a8e8a' });
  b.rbox(0.9, 0.2, 0.2, 0.08, V3(0.02, 0.5, 0), paint, [0, 0, -0.1]);
  b.rbox(0.3, 0.42, 0.22, 0.08, V3(0.5, 0.62, 0), paint, [0, 0, 0.3]);
  b.rbox(0.5, 0.08, 0.2, 0.035, V3(-0.12, 0.8, 0), withC(C.tyre, { col: '#12100e', col2: '#4a4038' }));
  b.rbox(0.62, 0.24, 0.24, 0.1, V3(-0.12, 0.66, 0), paint);
  b.rod(V3(0.55, 0.9, 0), V3(0.72, 0.28, 0), 0.02, C.steel);
  b.rod(V3(0.62, 1.02, -0.3), V3(0.62, 1.02, 0.3), 0.014, C.steel);
  b.rbox(0.14, 0.12, 0.16, 0.05, V3(0.66, 1.0, 0), paint);
  // F: the leg shield (yếm) of a step-through, wider than the steering column, and a deep front mudguard
  b.rbox(0.05, 0.52, 0.44, 0.025, V3(0.43, 0.56, 0), withC(paint, { col: '#4a4446', col2: '#b0a49e' }), [0, 0, 0.32]);
  b.add(new THREE.TorusGeometry(0.29, 0.05, 6, 16, Math.PI * 0.75), withC(paint, { col: '#4a4446', col2: '#b0a49e' }), mat(V3(0.72, 0.3, 0), [0, 0, Math.PI * 0.1]));
  b.box(0.5, 0.03, 0.26, V3(-0.5, 0.86, 0), C.steel);
  b.rod(V3(-0.3, 0.42, 0.08), V3(-0.75, 0.4, 0.1), 0.03, C.steel);
  // tail light
  b.sphere(0.03, V3(-0.78, 0.74, 0), [0.6, 0.8, 1.4], withC(C.redPlastic, { col: '#a02818', col2: '#ff7050', emit: 0.8, hilite: 0 }), 10);
  const body = hero(b.merge(), { rimW: 2.0, tier });
  g.add(body);
  const wheels = [];
  for (const x of [0.72, -0.55]) {
    const wb = new Batch();
    wb.add(new THREE.TorusGeometry(0.25, 0.055, 12, 36), { ...C.tyre, smooth: true }, null);
    wb.cyl(0.16, 0.16, 0.05, V3(0, 0, 0), withC(C.steel, { scale: 8 }), 24, [Math.PI / 2, 0, 0]);
    for (let k = 0; k < 4; k++) wb.box(0.02, 0.3, 0.02, V3(0, 0, 0.03), C.steel, [0, 0, (k * Math.PI) / 4]);
    const w = hero(wb.merge(), { rimW: 1.8, tier });
    w.position.set(x, 0.3, 0);
    g.add(w);
    wheels.push(w);
  }
  // the peach tree, tied upright on the rack: the one bright pink thing out on the road
  const tb = new Batch({ wind: true });
  const sw = (x, y) => Math.max(0, y - 1.0) * 0.28;
  tb.tube([V3(-0.5, 0.86, 0), V3(-0.53, 1.6, 0.02), V3(-0.47, 2.3, -0.02)], 0.04, C.bark, 8, 7, sw, 4);
  tb.rod(V3(-0.6, 0.9, 0), V3(-0.4, 0.9, 0), 0.02, withC(C.paper, { col: '#5a1010', col2: '#b84a3a' }), 8, 0.02, sw, 4);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * 6.28 * 1.6 + R() * 0.5;
    const base = V3(-0.5 + (R() - 0.5) * 0.06, 1.15 + k * 0.11, 0);
    peachBranch(tb, base, V3(Math.cos(a) * 0.9, 0.9 + R() * 0.4, Math.sin(a) * 0.6), 0.7 + R() * 0.5, R, { twigs: 5, bloom: 55, petal: 0.075, sway: sw, tree: 4, thick: 0.022 });
  }
  const tree = hero(tb.merge(), { wind: true, rims: false, tier: 0.05 });
  g.add(tree);
  // the rider is added by people.js (buildPeople -> rider), sitting at local (-0.22, 0.5, 0) facing +x
  return { group: g, wheels, tree, body };
}

// ---------------------------------------------------------------- Hàng Lược tube houses (palette knife), background tier: pale, soft, hazed
// built along local x with the fronts facing local +z; Batch.pre turns a whole row to face the street
export function buildHouses(kb, mass, fine, R, { z = -15, x0 = -19, x1 = 19, haze = 0.16, seed = 0, gable = null, tops = null, balconies = null, tet = true } = {}) {
  // tet: false keeps every random draw (so the houses stay the same) but leaves out the couplets, lanterns and flags
  const nop = { box() {}, add() {} };
  const tk = tet ? kb : nop, tf = tet ? fine : nop;
  const WALL = [['#e0b870', '#f2d49a'], ['#e6ccaa', '#f6e2c6'], ['#e2b49c', '#f2d0bc'], ['#dcc088', '#eedaa8'], ['#e8c888', '#f8e2b0']];
  const SHUT = [['#4e8a78', '#86b4a0'], ['#5a8a7e', '#90b8a8'], ['#4a7e7a', '#7eaea8']];
  const ROOF = ['#9a5a48', '#8e5448', '#a4644e'];
  const H0 = { haze };
  const glows = [];
  let x = x0, i = seed;
  while (x < x1 - 0.5) {
    let w = 3.4 + R() * 1.4;
    if (x1 - (x + w) < 2.6) w = x1 - x;        // the last house ends exactly at the row's end
    const floors = R() < 0.55 ? 2 : 3;
    const fh = 3.2;
    const H = floors * fh;
    const gabled = floors === 2 || R() < 0.4;
    if (tops) tops.push([x, x + w, gabled ? H : H + 0.9]);
    const cx = x + w / 2;
    const [wc, wc2] = WALL[i % WALL.length];
    const wall = { col: wc, col2: wc2, scale: 0.35, drip: 0.7, seed: R(), ...H0 };
    mass.box(w - 0.03, H, 11, V3(cx, H / 2, z - 5.5), wall);
    // ground floor: an open shop, warm inside, Tết goods, couplets by the door (all a step quieter than the stall)
    const ow = w - 1.1;
    kb.box(ow, 2.5, 0.05, V3(cx, 1.3, z + 0.02), { col: '#c88a62', col2: '#eec49a', emit: 0.3, scale: 0.8, seed: R(), flat: 1, ...H0 });
    for (let k = 0; k < 5; k++) kb.box(0.25 + R() * 0.3, 0.35 + R() * 0.4, 0.05, V3(cx - ow * 0.4 + R() * ow * 0.8, 0.5 + R() * 1.3, z + 0.06), { col: ['#b83a30', '#c8903a', '#a0403a', '#d0a040'][k % 4], col2: '#f0b080', scale: 1.5, seed: R(), flat: 1, ...H0 });
    for (const s of [-1, 1]) {
      tk.box(0.24, 2.1, 0.04, V3(cx + s * (ow / 2 + 0.24), 1.45, z + 0.08), { col: '#b82a22', col2: '#e0503a', scale: 1.2, seed: R(), ...H0, haze: haze + 0.04 });
      for (let k = 0; k < 5; k++) tk.box(0.1, 0.1, 0.01, V3(cx + s * (ow / 2 + 0.24), 0.75 + k * 0.33, z + 0.105), { col: '#e8b848', col2: '#ffe08a', scale: 3, seed: R(), flat: 1, ...H0 }, [0, 0, 0.78]);
    }
    kb.box(w, 0.28, 0.35, V3(cx, 2.75, z + 0.17), { col: wc2, col2: '#f4ead6', scale: 0.6, seed: R(), ...H0 });
    if (R() < 0.7) tk.add(new THREE.SphereGeometry(0.2, 16, 10), { col: '#b8261e', col2: '#f0604a', emit: 0.14, scale: 1.5, seed: R(), ...H0 }, mat(V3(cx + (R() - 0.5) * ow * 0.6, 2.2, z + 0.45), [0, 0, 0], [1, 1.2, 1]));
    glows.push(V3(cx, 1.5, z + 0.6));
    for (let f = 1; f < floors; f++) {
      const y0 = f * fh;
      kb.box(w, 0.22, 0.3, V3(cx, y0, z + 0.12), { col: wc2, col2: '#f4ead6', scale: 0.6, seed: R(), ...H0 });
      const nOpen = w > 4.2 ? 2 : 1;
      for (let k = 0; k < nOpen; k++) {
        const ox = nOpen === 1 ? cx : x + (w * (k + 0.5)) / nOpen;
        const ww = nOpen === 1 ? 1.5 : 1.15, wh = 2.0;
        const [sc, sc2] = SHUT[Math.floor(R() * 3)];
        kb.box(ww, wh, 0.05, V3(ox, y0 + 0.35 + wh / 2, z - 0.02), { col: '#5a4a50', col2: '#76666a', scale: 1, seed: R(), flat: 1, ...H0 });
        kb.box(ww * 0.5, wh, 0.05, V3(ox - ww * 0.25, y0 + 0.35 + wh / 2, z + 0.03), { col: sc, col2: sc2, scale: 1.4, seed: R(), ...H0 });
        kb.box(ww * 0.5, wh, 0.05, V3(ox + ww * 0.25 + 0.12, y0 + 0.35 + wh / 2, z + 0.25), { col: sc, col2: sc2, scale: 1.4, seed: R(), ...H0 }, [0, -0.7, 0]);
        for (let s = 0; s < 7; s++) fine.box(ww * 0.46, 0.025, 0.02, V3(ox - ww * 0.25, y0 + 0.55 + s * 0.26, z + 0.065), { col: '#2e5a4c', col2: '#5e8a7a', scale: 2, seed: R(), ...H0 });
        kb.box(ww + 0.3, 0.14, 0.3, V3(ox, y0 + 0.4 + wh, z + 0.12), { col: wc2, col2: '#f4ead6', scale: 0.6, seed: R(), ...H0 });
      }
      if (R() < 0.75) {
        // (balcony life: the floor's middle, 0.4 m out from the wall, in this row's local frame)
        if (balconies) balconies.push({ at: V3(cx, y0 + 0.34, z + 0.4), w: w - 0.5, y: y0 + 0.34 });
        kb.box(w - 0.5, 0.12, 0.8, V3(cx, y0 + 0.28, z + 0.4), { col: wc2, col2: '#f4ead6', scale: 0.6, seed: R(), ...H0 });
        fine.box(w - 0.5, 0.05, 0.05, V3(cx, y0 + 1.25, z + 0.78), { col: '#2e3a40', col2: '#6a7a7c', scale: 3, seed: R(), ...H0 });
        for (let s = 0; s < Math.floor((w - 0.5) / 0.18); s++) fine.box(0.026, 0.9, 0.026, V3(x + 0.35 + s * 0.18, y0 + 0.8, z + 0.78), { col: '#2e3a40', col2: '#6a7a7c', scale: 3, seed: R(), ...H0 });
      }
      if (f === 1 && R() < 0.7) {
        const px = cx + (R() < 0.5 ? -1 : 1) * (w / 2 - 0.35);
        tf.box(0.03, 1.5, 0.03, V3(px, y0 + 1.6, z + 0.9), { col: '#3a3434', col2: '#5a4e48', scale: 2, seed: R(), flat: 1, ...H0 }, [0.5, 0, 0]);
        const fg = new THREE.PlaneGeometry(0.9, 0.6, 8, 3);
        fg.translate(0.45, -0.3, 0);
        const flagSway = (fx) => Math.max(0, fx - px) * 0.25;
        // flags: a dusty red, pushed back into the air so they never pull against the people
        tf.add(fg, { col: '#c0443a', col2: '#dc6a56', scale: 1.5, seed: R(), ...H0, haze: haze + 0.06 }, mat(V3(px, y0 + 2.2, z + 1.25), [0.12, -0.22, 0]), flagSway, 5);
        const star = new THREE.Shape();
        for (let s = 0; s < 10; s++) { const a = (s / 10) * Math.PI * 2 + Math.PI / 2, rr = s % 2 ? 0.07 : 0.17; s ? star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        const sg = new THREE.ShapeGeometry(star);
        sg.translate(0.45, -0.3, 0.012);
        tf.add(sg, { col: '#d8c070', col2: '#e8d490', scale: 2, seed: R(), flat: 1, ...H0, haze: haze + 0.14 }, mat(V3(px, y0 + 2.2, z + 1.25), [0.12, -0.22, 0]), flagSway, 5);
      }
    }
    if (gabled) {
      const s = new THREE.Shape();
      s.moveTo(-5.6, 0); s.lineTo(5.6, 0); s.lineTo(0.5, 2.2); s.lineTo(-5.6, 0);
      const pg = new THREE.ExtrudeGeometry(s, { depth: w + 0.1, bevelEnabled: false });
      pg.translate(0, 0, -(w + 0.1) / 2);
      pg.rotateY(Math.PI / 2);
      const rc = ROOF[Math.floor(R() * 3)];
      mass.add(pg, { col: rc, col2: '#b8948a', scale: 0.5, seed: R(), ...H0 }, mat(V3(cx, H, z - 5.3)));
      mass.box(w + 0.1, 0.18, 0.35, V3(cx, H + 0.05, z + 0.12), { col: '#6a5048', col2: '#9a7a70', scale: 0.6, seed: R(), ...H0 });
    } else {
      mass.box(w, 0.9, 0.22, V3(cx, H + 0.45, z + 0.08), { col: wc, col2: wc2, scale: 0.35, drip: 0.5, seed: R(), ...H0 });
      if (R() < 0.7) mass.box(1.4, 1.1, 1.6, V3(cx + (R() - 0.5), H + 0.55, z - 3), { col: '#a8b0b8', col2: '#d0d8de', scale: 0.6, seed: R(), ...H0 });
    }
    // the first house of the row shows its bare side wall: stains, a small window, an old downpipe
    if (gable && x + w >= x1 - 1e-6) {
      const gx = x1 + 0.02;
      kb.box(0.05, 0.9, 0.7, V3(gx, 5.3, z - 3.5), { col: '#4a4046', col2: '#6a5e62', scale: 1, seed: R(), flat: 1, ...H0 });
      fine.box(0.06, H, 0.06, V3(gx - 0.02, H / 2, z - 0.4), { col: '#5a5a5c', col2: '#7a7a7c', scale: 2, seed: R(), ...H0 });
    }
    x += w;
    i++;
  }
  return glows;
}

// power lines: catenaries between poles, drawn as ink
export function wireLines(poles, R) {
  const lines = [];
  for (let k = 0; k < 6; k++) {
    const pts = [];
    const dy = k * 0.22 + R() * 0.1, dx = (R() - 0.5) * 0.4;
    for (let p = 0; p < poles.length - 1; p++) {
      const a = poles[p].clone().add(V3(dx, dy, 0)), b = poles[p + 1].clone().add(V3(dx, dy + (R() - 0.5) * 0.2, 0));
      const sag = 0.35 + R() * 0.4;
      for (let i = 0; i < 24; i++) { const t = i / 24; pts.push(a.clone().lerp(b, t).add(V3(0, -Math.sin(t * Math.PI) * sag, 0))); }
    }
    pts.push(poles[poles.length - 1].clone().add(V3(dx, dy, 0)));
    lines.push({ pts, width: k < 2 ? 1.6 : 1.1, alpha: 0.8 });
  }
  return lines;
}

// ---------------------------------------------------------------- E: the gap the sun comes through — a lane, then an old one-storey house
// (local coordinates like buildHouses: built along x, the front faces +z; Batch.pre turns it to face the street)
export function lowHouse(kb, mass, R, { x0, x1, lane = 2.4, z = 0, haze = 0.2, tops }) {
  if (lane > 0) tops.push([x0, x0 + lane, 0.0]);
  const a = x0 + lane, w = x1 - a, cx = (a + x1) / 2, H = 3.3;
  const H0 = { haze };
  mass.box(w - 0.03, H, 9, V3(cx, H / 2, z - 4.5), { col: '#e4b890', col2: '#f6dab8', scale: 0.35, drip: 0.8, seed: R(), ...H0 });
  const s = new THREE.Shape();
  s.moveTo(-4.8, 0); s.lineTo(4.8, 0); s.lineTo(0, 1.9); s.lineTo(-4.8, 0);
  const pg = new THREE.ExtrudeGeometry(s, { depth: w + 0.4, bevelEnabled: false });
  pg.translate(0, 0, -(w + 0.4) / 2);
  pg.rotateY(Math.PI / 2);
  mass.add(pg, { col: '#9a5040', col2: '#cc8460', scale: 0.7, drip: 0.3, seed: R(), ...H0 }, mat(V3(cx, H, z - 4.3)));
  // an old wooden door, the couplets either side, a lantern under the eave
  const ow = Math.max(0.9, Math.min(2.2, w - 1.4));
  kb.box(ow, 2.3, 0.05, V3(cx, 1.2, z + 0.02), { col: '#6a3a28', col2: '#a8683e', scale: 1.2, seed: R(), ...H0 });
  for (let k = 0; k < 4; k++) kb.box(0.03, 2.2, 0.03, V3(cx - ow / 2 + (k + 0.5) * ow / 4, 1.2, z + 0.06), { col: '#4a2a1e', col2: '#7a4a30', scale: 3, seed: R(), ...H0 });
  for (const sd of [-1, 1]) {
    kb.box(0.26, 1.9, 0.04, V3(cx + sd * (ow / 2 + 0.3), 1.3, z + 0.06), { col: '#b82a22', col2: '#e0503a', scale: 1.2, seed: R(), ...H0 });
    for (let k = 0; k < 4; k++) kb.box(0.1, 0.1, 0.01, V3(cx + sd * (ow / 2 + 0.3), 0.7 + k * 0.36, z + 0.09), { col: '#e8b848', col2: '#ffe08a', scale: 3, seed: R(), flat: 1, ...H0 }, [0, 0, 0.78]);
  }
  kb.box(w, 0.25, 0.6, V3(cx, H - 0.1, z + 0.28), { col: '#f0d0a8', col2: '#fff0d8', scale: 0.6, seed: R(), ...H0 });
  kb.add(new THREE.SphereGeometry(0.22, 14, 10), { col: '#c01e18', col2: '#ff5a3c', emit: 0.14, scale: 2, seed: R(), ...H0 }, mat(V3(cx + ow / 2 + 0.2, 2.6, z + 0.5), [0, 0, 0], [1, 0.85, 1]));
  tops.push([a, x1, H + 0.2]);
}

// F: a thin four-storey house (Hanoi has many, barely wider than a door): it splits the gap into separate windows of sun
export function thinHouse(kb, mass, fine, R, { x0, x1, z = 0, haze = 0.2, tops, floors = 3 }) {
  const w = x1 - x0, cx = (x0 + x1) / 2, fh = 3.2, H = floors * fh;
  const H0 = { haze };
  const [wc, wc2] = [['#d8b48c', '#f0d2ae'], ['#d0b8a4', '#ecd8c4']][Math.floor(R() * 2)];
  mass.box(w - 0.02, H, 11, V3(cx, H / 2, z - 5.5), { col: wc, col2: wc2, scale: 0.35, drip: 0.8, seed: R(), ...H0 });
  mass.box(w, 0.9, 0.22, V3(cx, H + 0.45, z + 0.08), { col: wc, col2: wc2, scale: 0.35, drip: 0.5, seed: R(), ...H0 });
  kb.box(w - 0.4, 2.3, 0.05, V3(cx, 1.2, z + 0.02), { col: '#4a3a36', col2: '#6a5650', scale: 1, seed: R(), flat: 1, ...H0 });
  for (let f = 1; f < floors; f++) {
    const y0 = f * fh;
    kb.box(w, 0.2, 0.3, V3(cx, y0, z + 0.12), { col: wc2, col2: '#f4ead6', scale: 0.6, seed: R(), ...H0 });
    kb.box(w - 0.5, 1.8, 0.05, V3(cx, y0 + 1.3, z - 0.02), { col: '#4a3c42', col2: '#66585c', scale: 1, seed: R(), flat: 1, ...H0 });
    const [sc, sc2] = [['#4e8a78', '#86b4a0'], ['#5a8a7e', '#90b8a8']][Math.floor(R() * 2)];
    kb.box((w - 0.5) * 0.5, 1.8, 0.05, V3(cx - (w - 0.5) * 0.25, y0 + 1.3, z + 0.03), { col: sc, col2: sc2, scale: 1.4, seed: R(), ...H0 });
    kb.box(w - 0.3, 0.1, 0.55, V3(cx, y0 + 0.3, z + 0.3), { col: wc2, col2: '#f4ead6', scale: 0.6, seed: R(), ...H0 });
    fine.box(w - 0.3, 0.04, 0.04, V3(cx, y0 + 1.15, z + 0.55), { col: '#2e3a40', col2: '#6a7a7c', scale: 3, seed: R(), ...H0 });
  }
  tops.push([x0, x1, H + 0.9]);
}

// F: the far row's gap: a lane, a narrow house, a low house, a narrow house, a low house (three openings for the sun)
export function gapRow(kb, mass, fine, R, { x0, x1, haze = 0.2, tops }) {
  const plan = [['lane', 2.4], ['thin', 3.2], ['low', 2.0], ['thin', 2.8], ['low', 0]];
  let x = x0;
  for (const [kind, w0] of plan) {
    const w = w0 || x1 - x;
    if (kind === 'lane') tops.push([x, x + w, 0.0]);
    else if (kind === 'thin') thinHouse(kb, mass, fine, R, { x0: x, x1: x + w, haze, tops });
    else lowHouse(kb, mass, R, { x0: x, x1: x + w, lane: 0, haze, tops });
    x += w;
  }
}

