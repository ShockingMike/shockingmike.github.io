// Chớm: the flower seller (người bán) at the Tết flower market, sitting on a low plastic stool.
// A MakeHuman body (CC0) posed sitting and rigged with 53 bones (three per finger); clothes, scarf and nón lá built by code in Blender
// (blender/build_nguoiban.py). Painted by khach-paint.js, acted here.
//
//   const asset = await loadSeller([url, ...])          the model and its landmarks (json next to the glb)
//   const s = await buildSeller(scene, { asset, R, D, at, faceTo, giver, slice })
//       D      = { hero, Batch } from the world's build.js
//       at     = where the stool stands (world), faceTo = the point she faces (the customer)
//       slice  = optional: the page's pause between heavy build steps (chom-world core.slice)
//       giver  = the customer object (khach.js): { holds.note, poseAt(t), exchangeTime } — she takes that note from its hand
//       track  = instead of giver.poseAt (the customer is built after her): { handoff, customer: Matrix4 (her root), noteLocal:
//                16 numbers (the note in the customer's frame on the drawing before the hand-off) }; giver.holds.note may come later
//   s.group                  place/turn like any object (she faces +z of the group)
//   s.update(t, dt, camera)  t: loop clock (0..6 s). The body moves on twos (a new drawing every 1/12 s), the cloth every frame.
//   s.holds                  { bouquet, string, note, pouch, stool }
//   s.faceProbe(renderer, scene, camera)   visible face pixels from this camera (0 = the face is hidden)
//
// The loop (6 s, 144 frames at 24 fps, drawn on twos):
//   0.00  wraps red raffia round the bouquet's stems, twice round        1.17  pulls it tight, holds, tucks the end
//   2.42  lays the bouquet down across her lap                            3.00  rests a hand on her knee and watches the customer
//   4.17  a small lift (anticipation)   4.33 reaches up past her hat brim, elbow out   4.58 pinches the note, takes it as it is let go
//   4.83  brings it down in an arc      5.08  into the open mouth of her money pouch, lets go, out again
//   5.67  lifts the bouquet back up to wrap
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PU, NCLOTH, CLOTH, NFOLD, materialTable, paintMaterial, hullMaterial, depthMaterial, foldMaterial } from './khach-paint.js';
import { snap, sdist, forNear } from './surface.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const FPS = 24, STEP = 2;
export const LOOP = 6;

// ---------------------------------------------------------------- the palette
const LOOK = {
  Cardigan: { kind: 'wool', col: '#3e2226', col2: '#a6716a', hatch: '#240e12', hi: '#f6d6c8', back: '#2a1416', scale: 7, bump: 0.85, gloss: 0, ink: 3.6, bands: true, hatchScale: 6, hatchAmt: 0.8, rim: 0.75 },
  Blouse: { kind: 'cotton', col: '#34505a', col2: '#a4c2c4', hatch: '#1e3036', hi: '#f0fbf8', back: '#24383e', scale: 6, bump: 0.5, gloss: 0, ink: 2.0, hatchAmt: 0.5, hatchScale: 6 },
  Pants: { kind: 'silk', col: '#07070c', col2: '#3a3a4c', hatch: '#000000', hi: '#c4c6dc', back: '#040406', scale: 2.4, bump: 0.22, sheen: 0.9, ink: 3.2, bands: true, hatchScale: 4.5, hatchAmt: 0.5, rim: 0.7 },
  Scarf: { kind: 'cotton', col: '#2e3440', col2: '#8e98a6', hatch: '#1a1e26', hi: '#eef0f2', back: '#20242c', scale: 6, bump: 0.6, gloss: 0, ink: 2.6, bands: true, hatchAmt: 0.7, hatchScale: 7, rim: 0.6, print: { col: '#d8ccb4', amount: 0.5, cell: 0.024 } },
  Tails: { kind: 'cotton', col: '#2e3440', col2: '#8e98a6', hatch: '#1a1e26', hi: '#eef0f2', back: '#4a5260', scale: 6, bump: 0.6, gloss: 0, ink: 1.8, hatchAmt: 0.6, hatchScale: 7, print: { col: '#d8ccb4', amount: 0.5, cell: 0.024 } },
  Hat: { kind: 'straw', col: '#8a6a3a', col2: '#f6e4b4', hatch: '#5a4020', hi: '#fffae8', back: '#6a5230', scale: 5, bump: 0.35, sheen: 0.55, ink: 3.0, bands: true, hatchAmt: 0.55, hatchScale: 5, rim: 0.9 },
  Body: { kind: 'skin', col: '#8a4e38', col2: '#dca482', hatch: '#4a2418', hi: '#ffe6d0', back: '#4a2a20', scale: 5, bump: 0.2, gloss: 0.08, ink: 1.8, bands: true, face: 'all', hatchAmt: 0.35, rim: 0.8, hatchScale: 9 },
  Shoes: { kind: 'leather', col: '#16304a', col2: '#6a98bc', hatch: '#0a1624', hi: '#e8f4ff', back: '#0e1c2a', scale: 10, gloss: 0.9, ink: 1.6 },
};

// ---------------------------------------------------------------- helpers (as the customer's)
function restData(bones, root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const rq = root.getWorldQuaternion(new THREE.Quaternion()).invert();
  const R = {};
  for (const b of bones) {
    R[b.name] = {
      bone: b,
      local: b.quaternion.clone(),
      wq: rq.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())),
      wp: b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv),
    };
  }
  return R;
}
const basis = (x, y) => {
  const X = x.clone().normalize();
  const Y = y.clone().addScaledVector(X, -y.dot(X)).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
};
function setWorldQuat(bone, qw) {
  bone.parent.getWorldQuaternion(_q2);
  bone.quaternion.copy(_q2.invert().multiply(qw));
  bone.updateMatrixWorld(true);
}
const arr = (a) => V3(a[0], a[1], a[2]);
// does the ray o + t d (0 < t < maxT) meet any triangle [[a, b, c], ...]? (Moller-Trumbore)
const _e1 = new THREE.Vector3(), _e2r = new THREE.Vector3(), _pv = new THREE.Vector3(), _tv = new THREE.Vector3(), _qv = new THREE.Vector3();
export function rayHits(o, d, tris, maxT) { return rayT(o, d, tris, maxT) < maxT; }
// the nearest such hit (maxT when none)
export function rayT(o, d, tris, maxT) {
  let best = maxT;
  for (const [a, b, c] of tris) {
    _e1.subVectors(b, a); _e2r.subVectors(c, a);
    _pv.crossVectors(d, _e2r);
    const det = _e1.dot(_pv);
    if (Math.abs(det) < 1e-12) continue;
    const inv = 1 / det;
    _tv.subVectors(o, a);
    const u = _tv.dot(_pv) * inv;
    if (u < 0 || u > 1) continue;
    _qv.crossVectors(_tv, _e1);
    const v = d.dot(_qv) * inv;
    if (v < 0 || u + v > 1) continue;
    const t = _e2r.dot(_qv) * inv;
    if (t > 1e-5 && t < best) best = t;
  }
  return best;
}

export async function loadSeller(urls, { slice = null, timing = null } = {}) {
  let last;
  for (const url of [].concat(urls)) {
    try {
      // the file first (waiting on the network), then its parsing (the page's work)
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      const buf = await res.arrayBuffer();
      if (slice) await slice();
      const tp = performance.now();
      const gltf = await new GLTFLoader().parseAsync(buf, new URL('./', new URL(url, location.href)).href);
      if (timing) timing.parseMs = performance.now() - tp;
      const meta = await (await fetch(url.replace(/\.glb$/, '.json'))).json();
      // what the build would work out the long way, worked out once (see exportBake); a stale or missing file is simply not used
      let bake = null;
      try { const r = await fetch(url.replace(/\.glb$/, '-bake.json')); if (r.ok) bake = await r.json(); } catch (e) { bake = null; }
      return { gltf, meta, bake };
    } catch (e) { last = e; }
  }
  throw last;
}

export async function buildSeller(scene, { asset, R, D, at = null, faceTo = null, giver = null, track = null, slice = null }) {
  // the page's own pause between heavy steps (chom-world core.slice: no stretch of work longer than about 16 ms)
  const tick = slice ? () => slice() : () => null;
  // build phases (ms), for the budget
  const PH = { t: performance.now(), out: {}, mark(n) { const t = performance.now(); this.out[this.last ?? 'start'] = Math.round(t - this.t); this.t = t; this.last = n; return tick(); } };
  const { gltf, meta } = asset;
  const root = new THREE.Group();
  root.name = 'nguoiban';
  scene.add(root);
  const model = gltf.scene;
  root.add(model);
  if (at) root.position.copy(at);
  if (at && faceTo) root.rotation.y = Math.atan2(faceTo.x - at.x, faceTo.z - at.z);
  const SOLE = meta.sole;
  model.position.set(0, SOLE, 0);
  root.updateMatrixWorld(true);

  const meshes = {};
  model.traverse((o) => { if (o.isSkinnedMesh || o.isMesh) meshes[o.name] = o; });
  const any = Object.values(meshes).find((m) => m.isSkinnedMesh);
  const bones = any.skeleton.bones;
  const B = Object.fromEntries(bones.map((b) => [b.name, b]));
  const rest = restData(bones, root);
  const rootQ = new THREE.Quaternion();
  const P = (n) => rest[n].wp.clone();
  const lift = (a) => arr(a).add(V3(0, SOLE, 0));        // model-space landmark -> character space
  const headC = lift(meta.headCentre);
  const hatApex = lift(meta.hat.apex), hatAxis = arr(meta.hat.axis).normalize();
  const knot = lift(meta.knot);
  const seatTop = meta.seat + SOLE;

  await PH.mark('strokes0');
  // ---------------------------------------------------------------- where the strokes run
  const segOf = {};
  const SEGS = {
    torso: { a: P('pelvis'), b: P('neck_01'), r: 0.12 },
    head: { a: P('neck_01'), b: headC.clone(), r: 0.08 },
  };
  for (const s of ['l', 'r']) {
    await tick();
    SEGS[`upper_${s}`] = { a: P(`upperarm_${s}`), b: P(`lowerarm_${s}`), r: 0.045 };
    SEGS[`lower_${s}`] = { a: P(`lowerarm_${s}`), b: P(`hand_${s}`), r: 0.035 };
    SEGS[`thigh_${s}`] = { a: P(`thigh_${s}`), b: P(`calf_${s}`), r: 0.09 };
    SEGS[`calf_${s}`] = { a: P(`calf_${s}`), b: P(`foot_${s}`), r: 0.085 };
  }
  for (const [k, sg] of Object.entries(SEGS)) {
    sg.axis = sg.b.clone().sub(sg.a).normalize();
    const back = V3(0, 0, -1);
    sg.ref = back.addScaledVector(sg.axis, -back.dot(sg.axis));
    if (sg.ref.lengthSq() < 1e-4) sg.ref.set(1, 0, 0).addScaledVector(sg.axis, -sg.axis.x);
    sg.ref.normalize();
    sg.side = new THREE.Vector3().crossVectors(sg.axis, sg.ref);
    sg.key = k;
  }
  for (const b of bones) {
    const n = b.name;
    let k = 'torso';
    if (n === 'head' || n === 'neck_01') k = 'head';
    const s = n.endsWith('_l') ? 'l' : n.endsWith('_r') ? 'r' : null;
    if (s) {
      if (n.startsWith('upperarm')) k = `upper_${s}`;
      else if (n.startsWith('lowerarm') || n.startsWith('hand') || /^(index|middle|ring|pinky|thumb)/.test(n)) k = `lower_${s}`;
      else if (n.startsWith('thigh')) k = `thigh_${s}`;
      else if (n.startsWith('calf') || n.startsWith('foot') || n.startsWith('ball')) k = `calf_${s}`;
    }
    segOf[bones.indexOf(b)] = SEGS[k];
  }
  const hatSide = V3(1, 0, 0), hatFwd = new THREE.Vector3().crossVectors(hatSide, hatAxis).normalize();
  async function flowAttributes(mesh, name) {
    const g = mesh.geometry;
    const pos = g.attributes.position, nor = g.attributes.normal;
    const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const n = pos.count;
    const flow = new Float32Array(n * 2), axis = new Float32Array(n * 3), curv = new Float32Array(n);
    const p = new THREE.Vector3(), q = new THREE.Vector3(), nn = new THREE.Vector3(), T = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(pos, i).add(V3(0, SOLE, 0));
      nn.fromBufferAttribute(nor, i);
      if (name === 'Hat') {
        // palm leaves run from the tip to the rim: strokes along them, wrapping round the cone
        q.subVectors(p, hatApex);
        const h = -q.dot(hatAxis);
        const rad = q.clone().addScaledVector(hatAxis, h);
        const r = rad.length();
        const ang = Math.atan2(rad.dot(hatFwd), rad.dot(hatSide));
        flow[i * 2] = ang * Math.max(r, 0.02); flow[i * 2 + 1] = Math.hypot(r, h);
        T.copy(rad).normalize().addScaledVector(hatAxis, -0.9).normalize();
      } else {
        let best = 0, bw = -1;
        for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
        const sg = segOf[best] ?? SEGS.torso;
        q.subVectors(p, sg.a);
        const along = q.dot(sg.axis);
        q.addScaledVector(sg.axis, -along);
        const ang = Math.atan2(q.dot(sg.side), q.dot(sg.ref));
        flow[i * 2] = ang * sg.r; flow[i * 2 + 1] = along;
        T.copy(sg.axis);
        if (name === 'Scarf' && p.distanceTo(headC) < 0.16) {
          // the wrap: strokes run round the head, slanting like wound cloth
          const d = p.clone().sub(headC);
          flow[i * 2] = Math.atan2(d.x, d.z) * 0.1; flow[i * 2 + 1] = d.y + 0.03 * d.x;
          T.set(d.z, 0.35, -d.x).normalize();
        }
      }
      axis[i * 3] = T.x; axis[i * 3 + 1] = T.y; axis[i * 3 + 2] = T.z;
    }
    const idx = g.index ? g.index.array : null;
    if (idx) {
      await tick();
      const sum = new Float32Array(n), cnt = new Float32Array(n), len = new Float32Array(n);
      const a = new THREE.Vector3(), b = new THREE.Vector3();
      const edge = (i, j) => {
        a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, j);
        nn.fromBufferAttribute(nor, i);
        const d = b.sub(a);
        sum[i] += d.dot(nn); len[i] += d.length(); cnt[i]++;
      };
      for (let t = 0; t < idx.length; t += 3) {
        const i0 = idx[t], i1 = idx[t + 1], i2 = idx[t + 2];
        edge(i0, i1); edge(i1, i0); edge(i1, i2); edge(i2, i1); edge(i2, i0); edge(i0, i2);
      }
      for (let i = 0; i < n; i++) curv[i] = cnt[i] ? (sum[i] / cnt[i]) / Math.max(1e-5, len[i] / cnt[i]) : 0;
      for (let pass = 0; pass < 3; pass++) {
        await tick();
        const acc = new Float32Array(n), c2 = new Float32Array(n);
        for (let t = 0; t < idx.length; t += 3) {
          const i0 = idx[t], i1 = idx[t + 1], i2 = idx[t + 2];
          acc[i0] += curv[i1]; c2[i0]++; acc[i1] += curv[i0]; c2[i1]++;
          acc[i1] += curv[i2]; c2[i1]++; acc[i2] += curv[i1]; c2[i2]++;
          acc[i2] += curv[i0]; c2[i2]++; acc[i0] += curv[i2]; c2[i0]++;
        }
        for (let i = 0; i < n; i++) curv[i] = c2[i] ? curv[i] * 0.4 + 0.6 * acc[i] / c2[i] : curv[i];
      }
      for (let i = 0; i < n; i++) curv[i] = THREE.MathUtils.clamp(curv[i] * 4.0, 0, 1);
    }
    g.setAttribute('aFlow', new THREE.BufferAttribute(flow, 2));
    g.setAttribute('aAxis', new THREE.BufferAttribute(axis, 3));
    g.setAttribute('aCurv', new THREE.BufferAttribute(curv, 1));
  }

  await PH.mark('parts');
  // ---------------------------------------------------------------- the parts: cloth data first (the one-mesh outfit copies it)
  const PART_MAT = { Cardigan: 'Cardigan', Blouse: 'Blouse', Pants: 'Pants', Scarf: 'Scarf', TailL: 'Tails', TailR: 'Tails', Hat: 'Hat', Body: 'Body', Shoes: 'Shoes' };
  const LOOKS = Object.entries(LOOK).map(([name, look]) => ({ name, ...look, push: 0, legs: false, hang: -9, twoSided: name === 'Tails' || name === 'Hat' || name === 'Blouse' }));
  const table = materialTable(LOOKS);
  table.uFaceR.value = 0.15;
  const matOf = Object.fromEntries(LOOKS.map((l, i) => [l.name, i]));
  const headModel = headC.clone().sub(V3(0, SOLE, 0));
  // the scarf tails: held by the head at the knot, further down they ride with the scarf under them (as the scarf is skinned)
  {
    const sc = meshes.Scarf;
    const sp = sc.geometry.attributes.position, sI = sc.geometry.attributes.skinIndex, sW = sc.geometry.attributes.skinWeight;
    const headIdx = sc.skeleton.bones.indexOf(B.head);
    const acc = new Map(), a = V3(), b = V3();
    for (const nm of ['TailL', 'TailR']) {
      const m = meshes[nm];
      if (!m) continue;
      const tp = m.geometry.attributes.position, tI = m.geometry.attributes.skinIndex, tW = m.geometry.attributes.skinWeight;
      // the tail moves as one piece: every vertex takes the same scarf weights (those under the tail's far end), more of them further down
      let far = 0, fd = -1;
      for (let i = 0; i < tp.count; i++) { const d = a.fromBufferAttribute(tp, i).add(V3(0, SOLE, 0)).distanceTo(knot); if (d > fd) { fd = d; far = i; } }
      a.fromBufferAttribute(tp, far);
      let best = -1, bd = 1e9;
      for (let j = 0; j < sp.count; j++) { const d = b.fromBufferAttribute(sp, j).distanceToSquared(a); if (d < bd) { bd = d; best = j; } }
      for (let i = 0; i < tp.count; i++) {
        a.fromBufferAttribute(tp, i);
        const t = 0.7 * sm(0.035, 0.1, a.clone().add(V3(0, SOLE, 0)).distanceTo(knot));
        if (t <= 0) continue;
        acc.clear();
        for (let q = 0; q < 4; q++) { const w = tW.getComponent(i, q) * (1 - t); if (w > 0) acc.set(tI.getComponent(i, q), (acc.get(tI.getComponent(i, q)) ?? 0) + w); }
        for (let q = 0; q < 4; q++) { const w = sW.getComponent(best, q) * t; if (w > 0) acc.set(sI.getComponent(best, q), (acc.get(sI.getComponent(best, q)) ?? 0) + w); }
        const top = [...acc.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4);
        const sum = top.reduce((u, e) => u + e[1], 0) || 1;
        for (let q = 0; q < 4; q++) { tI.setComponent(i, q, top[q] ? top[q][0] : headIdx); tW.setComponent(i, q, top[q] ? top[q][1] / sum : 0); }
      }
      tI.needsUpdate = tW.needsUpdate = true;
    }
  }
  await tick();
  // the scarf over her face: its folds at the nose smoothed out (a crease there read as a nostril or a mouth)
  const faceFwd = arr(meta.headFwd).normalize();
  const faceZone = (x, y, z) => {
    _v.set(x, y + SOLE, z).sub(headC);
    return sm(0.17, 0.11, _v.length()) * sm(-0.04, 0.03, _v.dot(faceFwd));
  };
  // round the knot at her nape: the ink only, no colour bands (the knot and the tails read as a face otherwise)
  const knotZone = (x, y, z) => sm(0.07, 0.04, _v.set(x, y + SOLE, z).distanceTo(knot));
  async function smoothZone(geo, iters, zone = faceZone) {
    const pos = geo.attributes.position, n = pos.count;
    const weld = new Map(), id = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const k = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
      let w = weld.get(k); if (w === undefined) { w = weld.size; weld.set(k, w); } id[i] = w;
    }
    const m = weld.size, P = new Float64Array(m * 3), W = new Float64Array(m), nb = Array.from({ length: m }, () => new Set());
    for (let i = 0; i < n; i++) { P[id[i] * 3] = pos.getX(i); P[id[i] * 3 + 1] = pos.getY(i); P[id[i] * 3 + 2] = pos.getZ(i); }
    for (let v = 0; v < m; v++) W[v] = zone(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
    const ix = geo.index.array;
    for (let t = 0; t < ix.length; t += 3) for (let e = 0; e < 3; e++) { const a = id[ix[t + e]], b = id[ix[t + (e + 1) % 3]]; nb[a].add(b); nb[b].add(a); }
    const tmp = new Float64Array(m * 3);
    for (let it = 0; it < iters * 2; it++) {
      if (it % 2 === 1) await tick();
      const f = it % 2 === 0 ? 0.5 : -0.53;            // Taubin: smooth without shrinking
      for (let v = 0; v < m; v++) {
        let ax = 0, ay = 0, az = 0, c = 0;
        for (const u of nb[v]) { ax += P[u * 3]; ay += P[u * 3 + 1]; az += P[u * 3 + 2]; c++; }
        const k = c ? f * W[v] : 0;
        tmp[v * 3] = P[v * 3] + k * (ax / Math.max(c, 1) - P[v * 3]);
        tmp[v * 3 + 1] = P[v * 3 + 1] + k * (ay / Math.max(c, 1) - P[v * 3 + 1]);
        tmp[v * 3 + 2] = P[v * 3 + 2] + k * (az / Math.max(c, 1) - P[v * 3 + 2]);
      }
      P.set(tmp);
    }
    // normals again, averaged over welded vertices, only where the shape moved
    const N = new Float64Array(m * 3);
    for (let t = 0; t < ix.length; t += 3) {
      const a = id[ix[t]], b = id[ix[t + 1]], c = id[ix[t + 2]];
      const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
      const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      for (const q of [a, b, c]) { N[q * 3] += nx; N[q * 3 + 1] += ny; N[q * 3 + 2] += nz; }
    }
    const nrm = geo.attributes.normal;
    for (let i = 0; i < n; i++) {
      const v = id[i];
      if (W[v] <= 0) continue;
      pos.setXYZ(i, P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
      if (nrm) {
        _v.set(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]).normalize();
        const o = V3(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
        if (_v.dot(o) < 0) _v.negate();
        o.lerp(_v, Math.min(1, W[v] * 1.5)).normalize();
        nrm.setXYZ(i, o.x, o.y, o.z);
      }
    }
    pos.needsUpdate = true;
    if (nrm) nrm.needsUpdate = true;
  }
  await smoothZone(meshes.Scarf.geometry, 14);
  await tick();
  for (const nm of ['TailL', 'TailR', 'HullTailL', 'HullTailR']) if (meshes[nm]) await smoothZone(meshes[nm].geometry, 6, () => 0.8);
  if (meshes.HullScarf) await smoothZone(meshes.HullScarf.geometry, 14);
  await tick();
  // the back of the cardigan's collar lies under the scarf's cowl: any of it that reaches through is pressed back under
  // (its tip poked out below the knot and read as a lip)
  const cowlBottom = new Map();
  {
    const sp = meshes.Scarf.geometry.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      if (sp.getZ(i) > meta.knot[2] + 0.02) continue;
      const bx = Math.round(sp.getX(i) * 50);
      cowlBottom.set(bx, Math.min(cowlBottom.get(bx) ?? 9, sp.getY(i)));
    }
  }
  const underCowl = (x, y, z) => {
    if (z > meta.knot[2] + 0.02 || Math.abs(x) > 0.13) return false;
    const cb = cowlBottom.get(Math.round(x * 50));
    return cb !== undefined && y > cb + 0.012;
  };
  // covered = a ray out along the collar's normal meets the scarf; an uncovered point moves in toward her neck until it is
  const cowlStats = {}, cowlCovered = [];
  const tCowl = performance.now();
  const BAKE_V = 1;
  const bakeCheck = (() => {
    const cp = meshes.Cardigan.geometry.attributes.position, sp = meshes.Scarf.geometry.attributes.position;
    let sig = 0;
    for (let i = 0; i < Math.min(64, cp.count); i++) sig += cp.getX(i) * 3 + cp.getY(i) * 5 + cp.getZ(i) * 7;
    return { v: BAKE_V, card: cp.count, scarf: sp.count, sig: Math.round(sig * 1e4) };
  })();
  const bakeIn = asset.bake && asset.bake.check && ['v', 'card', 'scarf', 'sig'].every((k) => asset.bake.check[k] === bakeCheck[k]) ? asset.bake : null;
  const bakeOut = { check: bakeCheck, cowl: { Cardigan: [], HullCardigan: [], covered: cowlCovered } };
  if (bakeIn && bakeIn.cowl) {
    for (const nm of ['Cardigan', 'HullCardigan']) {
      const m = meshes[nm];
      if (!m) continue;
      const cp = m.geometry.attributes.position;
      for (const [i, x, y, z] of bakeIn.cowl[nm]) cp.setXYZ(i, x, y, z);
      cp.needsUpdate = true;
    }
    cowlCovered.push(...bakeIn.cowl.covered);
    cowlStats.baked = true;
  } else {
    const sp = meshes.Scarf.geometry.attributes.position, six = meshes.Scarf.geometry.index.array;
    const kn = arr(meta.knot);
    const tris = [];
    for (let t = 0; t < six.length; t += 3) {
      const A = V3().fromBufferAttribute(sp, six[t]), Bv = V3().fromBufferAttribute(sp, six[t + 1]), Cv = V3().fromBufferAttribute(sp, six[t + 2]);
      if (A.distanceTo(kn) < 0.3) tris.push([A, Bv, Cv]);
    }
    const neckZ = meta.neckBase[2];
    for (const nm of ['Cardigan', 'HullCardigan']) {
      const m = meshes[nm];
      if (!m) continue;
      const cp = m.geometry.attributes.position, cn = m.geometry.attributes.normal;
      const o = V3(), d = V3(), inw = V3();
      for (let i = 0; i < cp.count; i++) {
        o.fromBufferAttribute(cp, i);
        if (!underCowl(o.x, o.y, o.z)) continue;
        d.fromBufferAttribute(cn, i).normalize();
        inw.set(-o.x, 0, neckZ - o.z);
        if (inw.lengthSq() < 1e-8) continue;
        inw.normalize();
        let k = 0;
        // the scarf's triangles near this point (the rays are short)
        const local = tris.filter((tr) => tr[0].distanceToSquared(o) < 0.0196);
        // covered with room: the scarf at least `margin` away along the ray, so her head can turn without the collar showing
        const margin = nm === 'Cardigan' ? 0.009 : 0.006;
        const depth = () => rayT(o, d, local, 0.12);
        const t0 = depth();
        if (t0 >= 0.12) {
          // only a tip that pierced the cowl (right at its surface) is pressed back; cloth further off is simply not under it
          let near = 1e9;
          for (const tr of local) for (const q of tr) near = Math.min(near, q.distanceToSquared(o));
          if (Math.sqrt(near) > 0.015) continue;
        }
        if (t0 < margin || t0 >= 0.12) {
          let t = t0;
          while (k < 16 && (t < margin || t >= 0.12)) { o.addScaledVector(inw, 0.002); o.y -= 0.0015; k++; t = depth(); }
        }
        if (nm === 'Cardigan') {
          cowlStats.n = (cowlStats.n ?? 0) + 1;
          if (k) cowlStats.moved = (cowlStats.moved ?? 0) + 1;
          if (k === 16) { cowlStats.stuck = (cowlStats.stuck ?? 0) + 1; (cowlStats.stuckIds ??= []).push(i); }
          if (k < 16) cowlCovered.push(i);
        }
        if (k) {
          // and a little further, so the cloth never grazes the cowl's inside
          if (k < 16) o.addScaledVector(inw, nm === 'Cardigan' ? 0.003 : 0.002);
          cp.setXYZ(i, o.x, o.y, o.z);
          bakeOut.cowl[nm].push([i, +o.x.toFixed(6), +o.y.toFixed(6), +o.z.toFixed(6)]);
        }
      }
      cp.needsUpdate = true;
    }
  }
  cowlStats.ms = Math.round(performance.now() - tCowl);
  await tick();
  // her head's skin is always under the scarf and the hat: drawn smaller, well inside them, so no gap can ever show it
  const shrinkC = rest.head.wp.clone().add(V3(0, 0.07, 0.01)).sub(V3(0, SOLE, 0));
  {
    const bm = meshes.Body;
    const bp = bm.geometry.attributes.position, bI = bm.geometry.attributes.skinIndex, bW = bm.geometry.attributes.skinWeight;
    const hi = bm.skeleton.bones.indexOf(B.head);
    const c = shrinkC;
    for (let i = 0; i < bp.count; i++) {
      if (i % 1500 === 1499) await tick();
      let w = 0;
      for (let q = 0; q < 4; q++) if (bI.getComponent(i, q) === hi) w += bW.getComponent(i, q);
      if (w < 0.3) continue;
      const k = 1 - 0.4 * sm(0.3, 0.8, w);
      _v.fromBufferAttribute(bp, i).sub(c).multiplyScalar(k).add(c);
      bp.setXYZ(i, _v.x, _v.y, _v.z);
    }
    bp.needsUpdate = true;
  }
  const parts = [];
  let first = null;
  for (const [name, mname] of Object.entries(PART_MAT)) {
    await tick();
    const m = meshes[name];
    if (!m) { console.warn('missing mesh', name); continue; }
    const g = m.geometry;
    const n = g.attributes.position.count;
    const ac = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) ac[i * 4] = -1;
    g.setAttribute('aCloth', new THREE.BufferAttribute(ac, 4));
    g.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aShrink', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aPushW', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(n).fill(matOf[mname]), 1));
    await flowAttributes(m, name);
    // the part itself stays for the checks and the layout (never drawn)
    m.visible = false;
    m.castShadow = false;
    m.userData.castShadow = false;
    if (!first) first = m;
    else if (!m.bindMatrix.equals(first.bindMatrix) || !m.matrix.equals(first.matrix)) console.warn('part not in the outfit space', name);
    parts.push(m);
  }
  for (const [nm, m] of Object.entries(meshes)) if (nm.startsWith('Hull')) { m.visible = false; m.castShadow = false; m.userData.castShadow = false; }

  await PH.mark('cloth');
  // ---------------------------------------------------------------- cloth: the two scarf tails, the back of the cardigan's hem
  const nodes = [];
  let nodeCount = 0;
  const nodeBase = CLOTH.next;
  const grids = [];
  function addGrid({ mesh, pick, nu, nv, uOf, vOf, wOf, stiff, out, lim = 0.05, amp = 1, radial = null }) {
    const g = mesh.geometry;
    const pos = g.attributes.position;
    const ac = g.attributes.aCloth.array, aw = g.attributes.aClothW.array;
    const start = nodeBase + nodeCount;
    const verts = [];
    const pp = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      pp.fromBufferAttribute(pos, i).add(V3(0, SOLE, 0));
      if (pick(pp, i)) verts.push(i);
    }
    if (!verts.length) return null;
    const uv = new Map();
    for (const i of verts) {
      pp.fromBufferAttribute(pos, i).add(V3(0, SOLE, 0));
      const u = clamp01(uOf(pp)), v = clamp01(vOf(pp));
      uv.set(i, [u, v]);
      ac[i * 4] = start; ac[i * 4 + 1] = u * (nu - 1); ac[i * 4 + 2] = Math.min(v * (nv - 1), nv - 1.0001); ac[i * 4 + 3] = nu;
      aw[i] = wOf(pp);
    }
    for (let j = 0; j < nv; j++) for (let k = 0; k < nu; k++) {
      const tu = nu > 1 ? k / (nu - 1) : 0.5, tv = j / (nv - 1);
      let best = -1, bd = 1e9;
      for (const i of verts) { const [u, v] = uv.get(i); const d = (u - tu) ** 2 + (v - tv) ** 2 * 1.5; if (d < bd) { bd = d; best = i; } }
      nodes.push({ mesh, vi: best, j, nv, k, nu, stiff: stiff(tv), p: new THREE.Vector3(), v: new THREE.Vector3(), t: new THREE.Vector3(), start, out, outW: new THREE.Vector3(), lim, amp, radial });
    }
    nodeCount += nu * nv;
    grids.push({ start, nu, nv });
    return start;
  }
  // the tails: two strips hanging from the knot; the top stays on the knot, the ends lift off in the breeze
  for (const nm of ['TailL', 'TailR']) {
    const m = meshes[nm];
    if (!m) continue;
    const pos = m.geometry.attributes.position;
    let dmax = 0;
    for (let i = 0; i < pos.count; i++) dmax = Math.max(dmax, _v.fromBufferAttribute(pos, i).add(V3(0, SOLE, 0)).distanceTo(knot));
    const cx = nm === 'TailL' ? 1 : -1;
    addGrid({
      mesh: m, nu: 1, nv: 4,
      pick: () => true,
      uOf: () => 0.5, vOf: (p) => p.distanceTo(knot) / dmax,
      wOf: (p) => sm(0.02, dmax, p.distanceTo(knot)),
      stiff: (tv) => (tv < 0.05 ? 1e9 : 55 * Math.pow(1 - tv, 2) + 10),
      out: V3(cx * 0.25, 0.3, -0.9).normalize(), lim: 0.03, amp: 0.8,
      radial: { bone: B.neck_01, R: 0.06 },        // lying on the scarf round her neck: "out" is away from the neck
    });
  }
  // the cardigan's back hem, free above the stool
  const card = meshes.Cardigan;
  const hemTop = seatTop + 0.14;
  {
    const pos = card.geometry.attributes.position;
    let xmin = 1e9, xmax = -1e9, ymin = 1e9;
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).add(V3(0, SOLE, 0));
      if (_v.z < -0.02 && _v.y < hemTop) { xmin = Math.min(xmin, _v.x); xmax = Math.max(xmax, _v.x); ymin = Math.min(ymin, _v.y); }
    }
    addGrid({
      mesh: card, nu: 5, nv: 3,
      pick: (p) => p.z < -0.02 && p.y < hemTop,
      uOf: (p) => (p.x - xmin) / Math.max(1e-3, xmax - xmin), vOf: (p) => (hemTop - p.y) / Math.max(1e-3, hemTop - ymin),
      wOf: (p) => sm(hemTop, ymin, p.y) * 0.6,
      stiff: (tv) => (tv < 0.05 ? 1e9 : 90 * Math.pow(1 - tv, 2) + 30),
      out: V3(0, 0, -1), lim: 0.018, amp: 0.35,
    });
  }
  CLOTH.next += nodeCount;
  console.assert(CLOTH.next <= NCLOTH, 'too many cloth nodes');
  const _cof = new THREE.Vector3();
  const clothOffsetOf = (mesh, i, out) => {
    out.set(0, 0, 0);
    const ac = mesh.geometry.attributes.aCloth?.array, aw = mesh.geometry.attributes.aClothW?.array;
    if (!ac || ac[i * 4] < 0) return out;
    const nu = ac[i * 4 + 3], st = ac[i * 4];
    const i0 = Math.floor(ac[i * 4 + 1]), j0 = Math.floor(ac[i * 4 + 2]);
    const fi = ac[i * 4 + 1] - i0, fj = ac[i * 4 + 2] - j0;
    const i1 = Math.min(i0 + 1, nu - 1);
    const C = PU.uCloth.value;
    const a = C[st + j0 * nu + i0], b = C[st + j0 * nu + i1], c = C[st + (j0 + 1) * nu + i0], d = C[st + (j0 + 1) * nu + i1];
    if (a && b && c && d) {
      const top = _cof.copy(a).lerp(b, fi);
      out.copy(c).lerp(d, fi).sub(top).multiplyScalar(fj).add(top).multiplyScalar(aw[i]);
    }
    return out;
  };
  const segKeyOf = (mesh, i) => {
    const g = mesh.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
    return (segOf[best] ?? SEGS.torso).key;
  };

  await PH.mark('outfit');
  // ---------------------------------------------------------------- the outfit: one mesh, its lines one hull (three layers), one shadow caster
  const depthMat = depthMaterial(table);
  await tick();
  const outfitGeo = mergeGeometries(parts.map((m) => m.geometry), false);
  await tick();
  const outfit = new THREE.SkinnedMesh(outfitGeo, paintMaterial(table, { headC: headModel, side: THREE.DoubleSide }));
  outfit.name = 'SellerOutfit';
  outfit.bind(first.skeleton, first.bindMatrix);
  outfit.position.copy(first.position); outfit.quaternion.copy(first.quaternion); outfit.scale.copy(first.scale);
  outfit.frustumCulled = false;
  outfit.renderOrder = 2;
  outfit.castShadow = true;
  outfit.receiveShadow = true;
  outfit.customDepthMaterial = depthMat;
  outfit.userData.shadowMaterial = depthMat;
  first.parent.add(outfit);
  const hullParts = [];
  for (const [name, mname] of Object.entries(PART_MAT)) {
    await tick();
    const h = meshes['Hull' + name];
    const L = LOOKS[matOf[mname]];
    if (!h || !L.ink) continue;
    const src = meshes[name].geometry;
    const sp = src.attributes.position;
    const cell = 0.02, grid = new Map();
    const key = (x, y, z) => ((x + 512) * 1048576) + ((y + 512) * 1024) + (z + 512);
    for (let i = 0; i < sp.count; i++) {
      const kk = key(Math.floor(sp.getX(i) / cell), Math.floor(sp.getY(i) / cell), Math.floor(sp.getZ(i) / cell));
      let a = grid.get(kk); if (!a) grid.set(kk, (a = [])); a.push(i);
    }
    const g = h.geometry;
    const hp = g.attributes.position;
    const n = hp.count;
    const at = { aCloth: 4, aClothW: 1, aShrink: 1, aPushW: 1, aCurv: 1 };
    const out = {};
    for (const k of Object.keys(at)) out[k] = new Float32Array(n * at[k]);
    for (let i = 0; i < n; i++) {
      if (i % 1000 === 999) await tick();
      const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
      let best = -1, bd = 1e9;
      for (let r = 1; r <= 3 && best < 0; r++) {
        for (let a = cx - r; a <= cx + r; a++) for (let b = cy - r; b <= cy + r; b++) for (let c = cz - r; c <= cz + r; c++) {
          const list = grid.get(key(a, b, c));
          if (!list) continue;
          for (const j of list) { const d = (sp.getX(j) - x) ** 2 + (sp.getY(j) - y) ** 2 + (sp.getZ(j) - z) ** 2; if (d < bd) { bd = d; best = j; } }
        }
      }
      if (best < 0) best = 0;
      for (const k of Object.keys(at)) {
        const w = at[k], sa = src.attributes[k].array;
        for (let q = 0; q < w; q++) out[k][i * w + q] = sa[best * w + q];
      }
    }
    const c = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'skinIndex', 'skinWeight']) c.setAttribute(k, g.attributes[k]);
    for (const k of Object.keys(at)) c.setAttribute(k, new THREE.BufferAttribute(out[k], at[k]));
    c.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(n).fill(matOf[mname]), 1));
    const nob = new Float32Array(n);
    if (name === 'Scarf') for (let i = 0; i < n; i++) nob[i] = Math.min(1, Math.max(faceZone(hp.getX(i), hp.getY(i), hp.getZ(i)) * 2, knotZone(hp.getX(i), hp.getY(i), hp.getZ(i))));
    if (name === 'TailL' || name === 'TailR') nob.fill(1);
    c.setAttribute('aNoBand', new THREE.BufferAttribute(nob, 1));
    c.setIndex(g.index);
    hullParts.push(c);
  }
  await tick();
  const hullOne = mergeGeometries(hullParts, false);
  await tick();
  const hullGeo = mergeGeometries([2, 1, 0].map((layer) => {
    const c = hullOne.clone();
    c.setAttribute('aLayer', new THREE.BufferAttribute(new Float32Array(c.attributes.position.count).fill(layer), 1));
    return c;
  }), false);
  const hull = new THREE.SkinnedMesh(hullGeo, hullMaterial(table));
  hull.name = 'SellerLines';
  hull.bind(first.skeleton, first.bindMatrix);
  hull.position.copy(outfit.position); hull.quaternion.copy(outfit.quaternion); hull.scale.copy(outfit.scale);
  hull.frustumCulled = false;
  hull.renderOrder = 1;
  hull.castShadow = false;
  hull.userData.castShadow = false;
  first.parent.add(hull);
  const sets = [{ name: 'Outfit', mesh: outfit, extra: [hull] }];
  const probeTables = [table];

  await PH.mark('hands');
  // ---------------------------------------------------------------- hands and arms
  const hand = {};
  for (const s of ['l', 'r']) {
    await tick();
    const h = rest[`hand_${s}`];
    const across = P(`pinky_01_${s}`).sub(P(`index_01_${s}`)).normalize();
    const fwd = P(`middle_01_${s}`).sub(h.wp).normalize();
    let palm = new THREE.Vector3().crossVectors(fwd, across).normalize();
    const bend = P(`middle_03_${s}`).sub(P(`middle_01_${s}`)).normalize().addScaledVector(fwd, -1);
    if (bend.dot(palm) < 0) palm.negate();
    const inv = h.wq.clone().invert();
    const f0 = fwd.clone().applyQuaternion(inv), p0 = palm.clone().applyQuaternion(inv);
    const gripW = h.wp.clone().lerp(P(`middle_01_${s}`), 0.85).addScaledVector(palm, 0.028).addScaledVector(across, 0.012);
    const grip = gripW.sub(h.wp).applyQuaternion(inv);
    const tipW = P(`index_03_${s}`).lerp(P(`middle_03_${s}`), 0.5).addScaledVector(fwd, 0.012);
    const pinch = tipW.sub(h.wp).applyQuaternion(inv);
    const fingers = {};
    for (const f of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
      fingers[f] = [1, 2, 3].map((k) => {
        const n = `${f}_0${k}_${s}`;
        const a = P(n);
        const next = k < 3 ? P(`${f}_0${k + 1}_${s}`) : a.clone().add(a.clone().sub(P(`${f}_0${k - 1}_${s}`)));
        const d = next.sub(a).normalize();
        let ax;
        if (f === 'thumb') ax = new THREE.Vector3().crossVectors(d, palm).normalize().lerp(fwd, 0.35).normalize();
        else ax = new THREE.Vector3().crossVectors(d, palm).normalize();
        return { n, axis: ax.applyQuaternion(rest[n].wq.clone().invert()) };
      });
    }
    hand[s] = { f0, p0, grip, pinch, pinchFlat: pinch.clone(), fingers, restHandQ: basis(f0, p0), across: across.clone().applyQuaternion(inv) };
  }
  const arm = {};
  for (const s of ['l', 'r']) {
    await tick();
    const U = rest[`upperarm_${s}`], L = rest[`lowerarm_${s}`], H = rest[`hand_${s}`];
    const u0 = L.wp.clone().sub(U.wp), l0 = H.wp.clone().sub(L.wp);
    const hinge = new THREE.Vector3().crossVectors(u0, l0).normalize();
    arm[s] = {
      l1: u0.length(), l2: l0.length(),
      uLocal: basis(u0.clone().applyQuaternion(U.wq.clone().invert()), hinge.clone().applyQuaternion(U.wq.clone().invert())),
      lLocal: basis(l0.clone().applyQuaternion(L.wq.clone().invert()), hinge.clone().applyQuaternion(L.wq.clone().invert())),
      // the wrist at rest: the forearm's direction in its own bone, and the forearm's turn relative to the hand
      l0L: l0.clone().normalize().applyQuaternion(L.wq.clone().invert()),
      handToLower: H.wq.clone().invert().multiply(L.wq),
    };
  }
  const FINGERS = {
    grip: { index: [1.05, 1.15, 0.7], middle: [1.15, 1.2, 0.75], ring: [1.2, 1.2, 0.75], pinky: [1.25, 1.15, 0.7], thumb: [0.28, 0.4, 0.28], oppose: 0.6 },
    bqgrip: { index: [1.05, 1.15, 0.7], middle: [1.15, 1.2, 0.75], ring: [1.2, 1.2, 0.75], pinky: [1.25, 1.15, 0.7], thumb: [0.75, 0.9, 0.55], oppose: 1.0 },
    hold: { index: [0.7, 0.8, 0.5], middle: [0.8, 0.85, 0.5], ring: [0.85, 0.85, 0.55], pinky: [0.9, 0.85, 0.5], thumb: [0.2, 0.3, 0.2], oppose: 0.5 },
    relax: { index: [0.25, 0.35, 0.22], middle: [0.32, 0.42, 0.26], ring: [0.4, 0.48, 0.3], pinky: [0.48, 0.52, 0.3], thumb: [0.1, 0.2, 0.15], oppose: 0.15 },
    rest: { index: [0.12, 0.2, 0.15], middle: [0.16, 0.24, 0.16], ring: [0.2, 0.26, 0.18], pinky: [0.26, 0.3, 0.2], thumb: [0.05, 0.12, 0.1], oppose: 0.1 },
    open: { index: [0.05, 0.08, 0.05], middle: [0.06, 0.08, 0.05], ring: [0.12, 0.12, 0.06], pinky: [0.18, 0.15, 0.08], thumb: [-0.1, 0.0, 0.05], oppose: 0.05 },
    // thumb pad on index pad (fitted by search: the two tips 16 mm apart, centre to centre)
    // a note slipped into the pouch: index bent at the knuckle only, straight down; thumb pad against it; the rest curled away
    slip: { index: [1.2, 0.15, 0.1], middle: [1.3, 1.3, 0.85], ring: [1.3, 1.3, 0.85], pinky: [1.3, 1.25, 0.8], thumb: [0, 0, 0], oppose: 1.2 },
    pinch: { index: [0.8, 0.8, 0.45], middle: [0.95, 0.9, 0.5], ring: [1.15, 1.25, 0.8], pinky: [1.2, 1.2, 0.8], thumb: [0, 0, 0], oppose: 1.2 },
    string: { index: [0.7, 0.75, 0.4], middle: [0.8, 0.8, 0.45], ring: [1.05, 1.1, 0.7], pinky: [1.1, 1.1, 0.7], thumb: [0.05, 0.05, 0], oppose: 1.15 },
    dive: { index: [-0.2, -0.22, -0.12], middle: [-0.2, -0.24, -0.14], ring: [-0.16, -0.2, -0.12], pinky: [-0.12, -0.18, -0.1], thumb: [0.2, 0.3, 0.2], oppose: 0.3 },
    release: { index: [0.35, 0.35, 0.2], middle: [0.38, 0.38, 0.22], ring: [0.42, 0.4, 0.24], pinky: [0.45, 0.42, 0.25], thumb: [-0.2, -0.1, 0.0], oppose: 0.05 },
  };
  const eul = new THREE.Euler();
  const charQ = new THREE.Quaternion();
  function rotateBone(name, e, order = 'YXZ') {
    if (!e) return;
    const b = B[name];
    root.getWorldQuaternion(charQ);
    _q.setFromEuler(eul.set(e[0], e[1], e[2], order));
    const qd = charQ.clone().multiply(_q).multiply(charQ.clone().invert());
    b.getWorldQuaternion(_q2);
    setWorldQuat(b, qd.multiply(_q2));
  }
  function resetPose() {
    for (const b of bones) b.quaternion.copy(rest[b.name].local);
    model.position.set(0, SOLE, 0);
    root.updateMatrixWorld(true);
  }
  function curl(s, preset, amt = 1) {
    const F = typeof preset === 'string' ? FINGERS[preset] : preset;
    for (const f of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
      hand[s].fingers[f].forEach((seg, k) => {
        const b = B[seg.n];
        _q.setFromAxisAngle(seg.axis, F[f][k] * amt);
        b.quaternion.copy(rest[seg.n].local).multiply(_q);
        if (f === 'thumb' && k === 0) {
          const ax = hand[s].f0.clone().applyQuaternion(rest[`hand_${s}`].wq).applyQuaternion(rest[seg.n].wq.clone().invert());
          b.quaternion.multiply(_q2.setFromAxisAngle(ax, (s === 'l' ? 1 : -1) * F.oppose * 0.6));   // + brings the thumb across the palm (measured)
        }
      });
    }
  }
  const mixF = (a, b, u) => {
    const A = FINGERS[a], Bf = FINGERS[b], o = {};
    for (const f of ['index', 'middle', 'ring', 'pinky', 'thumb']) o[f] = A[f].map((x, i) => x + (Bf[f][i] - x) * u);
    o.oppose = A.oppose + (Bf.oppose - A.oppose) * u;
    return o;
  };
  const tmpA = new THREE.Vector3();
  // The elbow sits on a circle (fixed by shoulder, wrist and the two bone lengths). Where on it: mostly where the forearm lines up
  // with the hand (a wrist is only a little joint), partly where the key's pole says.
  const WRIST_K = 0.8;
  const _li = new THREE.Vector3(), _ed = new THREE.Vector3(), _pq = new THREE.Quaternion(), _e2 = new THREE.Vector3(), _cd = new THREE.Vector3(), _up = new THREE.Vector3();
  const rootUp = () => _up.set(0, 1, 0).transformDirection(root.matrixWorld);
  function solveArm(s, targetW, fwdW, palmW, poleW, mode = 'grip', wristK = WRIST_K) {
    const U = B[`upperarm_${s}`], L = B[`lowerarm_${s}`], Hb = B[`hand_${s}`];
    const A = arm[s], Hd = hand[s];
    const qh = basis(fwdW, palmW).multiply(Hd.restHandQ.clone().invert());
    const off = (mode === 'pinch' ? Hd.pinch : mode === 'slip' ? Hd.slip : mode === 'pinchFlat' ? Hd.pinchFlat : mode === 'wrist' ? V3(0, 0, 0) : Hd.grip).clone().applyQuaternion(qh);
    const T = targetW.clone().sub(off);
    const S = U.getWorldPosition(tmpA);
    const d = T.clone().sub(S);
    let len = d.length();
    const dir = d.clone().normalize();
    len = Math.min(Math.max(len, Math.abs(A.l1 - A.l2) + 0.01), A.l1 + A.l2 - 0.004);
    const a = (A.l1 * A.l1 - A.l2 * A.l2 + len * len) / (2 * len);
    const h = Math.sqrt(Math.max(0, A.l1 * A.l1 - a * a));
    const perp = poleW.clone().addScaledVector(dir, -poleW.dot(dir)).normalize();
    const W = S.clone().addScaledVector(dir, len);
    if (wristK > 0) {
      // the forearm's direction if the wrist were straight, and the elbow that would give it
      _li.copy(A.l0L).applyQuaternion(_pq.copy(qh).multiply(A.handToLower));
      _ed.copy(W).addScaledVector(_li, -A.l2).sub(S);
      _ed.addScaledVector(dir, -_ed.dot(dir));
      if (_ed.lengthSq() > 1e-8) {
        _ed.normalize();
        // walk round the circle: close to that elbow, not far from the pole's, and never lifted above the shoulder
        // (unless the pole itself lifts it)
        const up = rootUp();
        const yPole = dir.dot(up) * a + perp.dot(up) * h;
        const yMax = Math.max(0.03, yPole);
        _e2.crossVectors(dir, perp).normalize();
        const du = dir.dot(up) * a, pu = perp.dot(up) * h, eu = _e2.dot(up) * h, pd = perp.dot(_ed), ed2 = _e2.dot(_ed);
        const score = (ph) => {
          const c = Math.cos(ph), sn = Math.sin(ph);
          const y = du + pu * c + eu * sn;
          return wristK * (pd * c + ed2 * sn) + (1 - wristK) * c - (y > yMax ? 20 * (y - yMax) : 0) - Math.max(0, -0.2 - c) * 5;
        };
        let bestC = -Infinity, bp = 0;
        for (let k = 0; k < 48; k++) { const ph = (k / 48) * Math.PI * 2, sc = score(ph); if (sc > bestC) { bestC = sc; bp = ph; } }
        // then finer, round the best
        let lo = bp - Math.PI / 24, hi = bp + Math.PI / 24;
        for (let it = 0; it < 12; it++) {
          const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
          if (score(m1) < score(m2)) lo = m1; else hi = m2;
        }
        const bc = Math.cos((lo + hi) / 2), bs = Math.sin((lo + hi) / 2);
        perp.multiplyScalar(bc).addScaledVector(_e2, bs).normalize();
      }
    }
    const E = S.clone().addScaledVector(dir, a).addScaledVector(perp, h);
    const u = E.clone().sub(S).normalize(), l = W.clone().sub(E).normalize();
    let hinge = new THREE.Vector3().crossVectors(u, l);
    if (hinge.lengthSq() < 1e-6) hinge.crossVectors(u, perp);
    hinge.normalize();
    setWorldQuat(U, basis(u, hinge).multiply(A.uLocal.clone().invert()));
    const qlBase = basis(l, hinge).multiply(A.lLocal.clone().invert());
    const handFromBase = qlBase.clone().invert().multiply(qh);
    const axisL = l.clone().applyQuaternion(qlBase.clone().invert()).normalize();
    const dd = handFromBase.x * axisL.x + handFromBase.y * axisL.y + handFromBase.z * axisL.z;
    const twFull = new THREE.Quaternion(axisL.x * dd, axisL.y * dd, axisL.z * dd, handFromBase.w).normalize();
    const tw = new THREE.Quaternion().slerp(twFull, 0.55);
    setWorldQuat(L, qlBase.clone().multiply(tw));
    setWorldQuat(Hb, qh);
    return { reach: T.distanceTo(S) - len };
  }
  // the fist's hole for the bouquet's stems (as the customer's fitGrip, for a thicker bundle)
  async function fitGrip(s, need, preset = 'grip') {
    const hb = B[`hand_${s}`];
    const Hd = hand[s];
    const across = new THREE.Vector3().crossVectors(Hd.f0, Hd.p0).normalize();
    let chosen = null;
    for (const amt of [1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.42]) {
      await tick();
      resetPose();
      curl(s, preset, amt);
      root.updateMatrixWorld(true);
      const pts = [];
      for (const f of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
        const j = [1, 2, 3].map((q) => hb.worldToLocal(B[`${f}_0${q}_${s}`].getWorldPosition(new THREE.Vector3())));
        pts.push(...j, j[2].clone().add(j[2].clone().sub(j[1]).multiplyScalar(0.85)), j[0].clone().lerp(j[1], 0.5), j[1].clone().lerp(j[2], 0.5));
      }
      const knuck = hb.worldToLocal(B[`middle_01_${s}`].getWorldPosition(new THREE.Vector3()));
      for (let q = 0; q <= 4; q++) for (let a = -2; a <= 2; a++) pts.push(knuck.clone().multiplyScalar(q / 4).addScaledVector(Hd.p0, 0.011).addScaledVector(across, a * 0.018));
      const flat = pts.map((q) => [q.dot(Hd.p0), q.dot(Hd.f0)]).sort((u, v) => u[0] - v[0] || u[1] - v[1]);
      const cr = (o, u, v) => (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
      const lo = [], hi = [];
      for (const q of flat) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
      for (const q of flat.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
      const hull = lo.slice(0, -1).concat(hi.slice(0, -1));
      const inside = (x, y) => hull.every((q, i) => cr(q, hull[(i + 1) % hull.length], [x, y]) >= 0);
      let best = null;
      const xs = hull.map((q) => q[0]), ys = hull.map((q) => q[1]);
      for (let a = Math.min(...xs); a <= Math.max(...xs); a += 0.002) for (let b = Math.min(...ys); b <= Math.max(...ys); b += 0.002) {
        const c = Hd.p0.clone().multiplyScalar(a).addScaledVector(Hd.f0, b).addScaledVector(across, knuck.dot(across));
        if (!inside(c.dot(Hd.p0), c.dot(Hd.f0))) continue;
        let m = 9;
        for (const p of pts) {
          const d = p.clone().sub(c);
          d.addScaledVector(across, -d.dot(across));
          m = Math.min(m, d.length());
          if (m < (best ? best.m : 0)) break;
        }
        if (!best || m > best.m) best = { m, c };
      }
      if (!best) continue;
      chosen = { amt, ...best };
      if (best.m >= need) break;
    }
    Hd.grip = chosen.c;
    Hd.gripAmt = chosen.amt;
    Hd.gripClear = chosen.m;
  }
  const STEM_R = 0.0155;           // the bundle of stems where the left hand holds it (with the wrapping paper)
  await fitGrip('l', STEM_R + 0.0068, 'bqgrip');
  await tick();
  await fitGrip('r', 0.012 + 0.0075);
  await tick();
  // the pinch point (thumb pad on index pad) as the pinch shape really puts it, in the hand's own frame
  for (const s of ['l', 'r']) {
    await tick();
    resetPose();
    curl(s, 'pinch');
    root.updateMatrixWorld(true);
    const hb = B[`hand_${s}`];
    hand[s].pinch = pinchOf(s).sub(hb.getWorldPosition(V3())).applyQuaternion(hb.getWorldQuaternion(new THREE.Quaternion()).invert());
    resetPose();
    curl(s, 'slip');
    root.updateMatrixWorld(true);
    hand[s].slip = pinchOf(s).sub(hb.getWorldPosition(V3())).applyQuaternion(hb.getWorldQuaternion(new THREE.Quaternion()).invert());
  }
  resetPose();

  await PH.mark('props');
  // ---------------------------------------------------------------- props
  const holds = {};
  // the stool: a low red plastic stool, square seat, four splayed legs joined by a skirt
  {
    const sb = new D.Batch();
    const red = { col: '#6a1612', col2: '#e0503e', gloss: 0.55, erode: 0.25, hilite: 0.7, scale: 4, bump: 0.5 };
    const redIn = { ...red, col: '#4a0e0c', col2: '#a8362a', gloss: 0.3 };
    const top = seatTop - 0.0015, S0 = 0.27, S1 = 0.31;
    sb.rbox(S0, 0.018, S0, 0.012, V3(0, top - 0.009, 0), red);
    sb.rbox(S0 - 0.012, 0.05, S0 - 0.012, 0.01, V3(0, top - 0.04, 0), redIn);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const a = V3(sx * (S0 / 2 - 0.02), top - 0.03, sz * (S0 / 2 - 0.02));
      const b = V3(sx * (S1 / 2 - 0.02), 0.0, sz * (S1 / 2 - 0.02));
      sb.rod(a, b, 0.018, red, 10, 0.022);
    }
    for (const [ax, sgn] of [['x', -1], ['x', 1], ['z', -1], ['z', 1]]) {
      const p = ax === 'x' ? V3(sgn * (S0 / 2 - 0.018), 0.045, 0) : V3(0, 0.045, sgn * (S0 / 2 - 0.018));
      sb.box(ax === 'x' ? 0.012 : S0 - 0.03, 0.02, ax === 'x' ? S0 - 0.03 : 0.012, p, redIn);
    }
    holds.stool = D.hero(sb.merge(), { rims: false, tier: 0.05 });
    holds.stool.traverse((o) => { if (o.isMesh && o === holds.stool.userData.main) { o.castShadow = true; o.receiveShadow = true; } });
    holds.stool.position.set(0, 0, P('pelvis').z - 0.02);
    root.add(holds.stool);
  }
  await tick();
  // the bouquet: pink and yellow Tết flowers in kraft paper; local +y runs from the cut stems to the flowers, the tie at y = 0
  const BQ = { tieY: 0, gripY: 0.07, stemEnd: -0.094, coneY0: 0.022, tubeY1: 0.14, coneY1: 0.29, coneR0: 0.0155, coneR1: 0.085, tieR: 0.0165, headY: 0.075 };
  // the true outline: the raffia turns at the tie (y -0.0145..0.0125) stand out to 20 mm; the stems widen a little upward
  const bqRadius = (y) => (y >= -0.0145 && y <= 0.0125 ? BQ.tieR + 0.0037 : y < BQ.coneY0 ? 0.013 + 0.0024 * (y - BQ.stemEnd) / (BQ.coneY0 - BQ.stemEnd) : y <= BQ.tubeY1 ? BQ.coneR0 : y <= BQ.coneY1 ? BQ.coneR0 + (BQ.coneR1 - BQ.coneR0) * Math.pow((y - BQ.tubeY1) / (BQ.coneY1 - BQ.tubeY1), 1.3) : 0.075);
  {
    const bb = new D.Batch({ wind: true });
    const sw = (x, y) => Math.max(0, y - 0.16) * 0.12;
    const stem = { col: '#1e3a24', col2: '#6a9a60', erode: 0, hilite: 0.2, scale: 10, bump: 0.6 };
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * Math.PI * 2, r = 0.006 + 0.004 * (k % 3) / 2;
      bb.rod(V3(Math.cos(a) * r, BQ.stemEnd + 0.004 * (k % 4), Math.sin(a) * r), V3(Math.cos(a) * r * 1.8, 0.3, Math.sin(a) * r * 1.8), 0.003, stem, 5);
    }
    const paper = { col: '#7a5a34', col2: '#e8cc98', erode: 0.35, hilite: 0.35, scale: 5, bump: 1.0 };
    const prof = [];
    for (let k = 0; k <= 12; k++) {
      const y = BQ.coneY0 + (BQ.coneY1 - BQ.coneY0) * (k / 12);
      prof.push([bqRadius(y) - 0.001, y]);
    }
    const cone = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 24, 0, Math.PI * 1.75);
    const cp = cone.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i);
      const a = Math.atan2(z, x);
      const k = 1 + 0.06 * Math.sin(a * 7 + y * 30) * sm(BQ.tubeY1, BQ.coneY1, y);
      cp.setXYZ(i, x * k, y + 0.012 * Math.sin(a * 3) * sm(BQ.tubeY1 + 0.06, BQ.coneY1, y), z * k);
    }
    cone.computeVertexNormals();
    bb.add(cone, { ...paper, smooth: true }, null, sw, 6);
    const inner = cone.clone().scale(0.97, 1, 0.97);
    bb.add(inner, { ...paper, col: '#4a341c', col2: '#a88858', smooth: true }, null, sw, 6);
    const pink = { col: '#b8385a', col2: '#ffb0c4', emit: 0.05, erode: 0, hilite: 0.3, scale: 12, bump: 1.0 };
    const pinkD = { col: '#8a1c3c', col2: '#f07898', emit: 0.04, erode: 0, hilite: 0.3, scale: 12, bump: 1.0 };
    const yel = { col: '#b07a18', col2: '#ffd878', emit: 0.04, erode: 0.2, hilite: 0.25, scale: 10, bump: 1.1 };
    const leaf = { col: '#1c3a26', col2: '#5e8a56', erode: 0.3, hilite: 0.3, gloss: 0.3, scale: 6, bump: 1 };
    const heads = [[0, 0.235, 0, 0.036, pink], [0.038, 0.222, 0.012, 0.03, pinkD], [-0.034, 0.225, 0.02, 0.031, pink], [0.01, 0.215, -0.04, 0.03, pink],
      [-0.02, 0.212, -0.03, 0.027, yel], [0.045, 0.205, -0.02, 0.026, yel], [-0.05, 0.2, 0.0, 0.026, pinkD], [0.02, 0.2, 0.045, 0.028, yel], [-0.012, 0.25, 0.018, 0.024, pinkD]];
    heads.forEach(([x, y, z, r, c], k) => bb.blob(r, V3(x, y + BQ.headY, z), [1, 0.78, 1], c, k * 1.7 + 0.3, 2, 0.26, sw, 6));
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.4;
      bb.blob(0.02, V3(Math.cos(a) * 0.06, 0.19 + BQ.headY + 0.01 * (k % 2), Math.sin(a) * 0.06), [1.6, 0.35, 0.8], leaf, k * 2.1, 1, 0.2, sw, 6);
    }
    // the raffia already wound round the stems: five turns at the tie
    for (let k = 0; k < 5; k++) {
      const g = new THREE.TorusGeometry(BQ.tieR + 0.0015, 0.0022, 5, 14);
      g.rotateX(Math.PI / 2);
      g.translate(0, -0.012 + k * 0.0055, 0);
      bb.add(g, { col: '#8a1a14', col2: '#f0604a', erode: 0, hilite: 0.4, gloss: 0.3, scale: 12, bump: 0.5, smooth: true }, null, sw, 6);
    }
    holds.bouquet = D.hero(bb.merge(), { wind: true, rims: false });
    holds.bouquet.traverse((o) => { if (o.isMesh && o === holds.bouquet.userData.main) o.castShadow = true; });
    root.add(holds.bouquet);
  }
  // the loose raffia: from the tie to her fingers while she winds, a short tucked tail afterwards
  const strTable = materialTable([{ kind: 'cotton', col: '#6a1410', col2: '#f06048', hatch: '#3a0806', scale: 20, gloss: 0, hatchAmt: 0.2, twoSided: true }]);
  const strMat = paintMaterial(strTable, { side: THREE.DoubleSide });
  const strGeo = new THREE.BufferGeometry();
  const NS = 12;
  {
    const n = NS * 4;
    strGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    strGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const ac = new Float32Array(n * 4); for (let i = 0; i < n; i++) ac[i * 4] = -1;
    strGeo.setAttribute('aCloth', new THREE.BufferAttribute(ac, 4));
    strGeo.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(n), 1));
    strGeo.setAttribute('aShrink', new THREE.BufferAttribute(new Float32Array(n), 1));
    strGeo.setAttribute('aPushW', new THREE.BufferAttribute(new Float32Array(n), 1));
    strGeo.setAttribute('aFlow', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    strGeo.setAttribute('aAxis', new THREE.BufferAttribute(new Float32Array(n * 3).fill(0.577), 3));
    strGeo.setAttribute('aCurv', new THREE.BufferAttribute(new Float32Array(n), 1));
    strGeo.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(n), 1));
    const idx = [];
    for (let i = 0; i < NS - 1; i++) for (let k = 0; k < 4; k++) {
      const a = i * 4 + k, b = i * 4 + ((k + 1) % 4), c = (i + 1) * 4 + k, d = (i + 1) * 4 + ((k + 1) % 4);
      idx.push(a, c, b, b, c, d);
    }
    strGeo.setIndex(idx);
  }
  holds.string = new THREE.Mesh(strGeo, strMat);
  holds.string.frustumCulled = false;
  holds.string.castShadow = false;
  holds.string.userData.castShadow = false;
  root.add(holds.string);
  probeTables.push(strTable);
  await tick();
  // the banknote she is given: the same polymer note as the customer's
  {
    const g = new THREE.PlaneGeometry(0.15, 0.068, 12, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, 0.012 * Math.cos((x / 0.15) * Math.PI) - 0.004); }
    g.computeVertexNormals();
    const nb = new D.Batch();
    nb.add(g, { col: '#1d5e6c', col2: '#8cd6d2', erode: 0, hilite: 0.5, scale: 18, bump: 0.3, smooth: true });
    nb.add(new THREE.PlaneGeometry(0.03, 0.03).translate(0.05, 0.004, 0.012), { col: '#8a7a50', col2: '#f2e6c0', erode: 0, hilite: 0.2, scale: 18, bump: 0.3 });
    holds.note = D.hero(nb.merge(), { rims: false });
    holds.note.traverse((o) => { if (o.material) o.material.side = THREE.DoubleSide; });
    holds.note.userData.main.castShadow = false;
    holds.note.visible = false;
    root.add(holds.note);
  }
  {
    // folded in four as she brings it down (a whole note is taller than the pouch): open edges on top (local y = 0), where her
    // fingers hold it; folds along the bottom and one end
    const nb = new D.Batch();
    const noteC = { col: '#1d5e6c', col2: '#8cd6d2', erode: 0, hilite: 0.5, scale: 18, bump: 0.3 };
    for (const z of [-0.0015, 0.0015]) {
      const g = new THREE.PlaneGeometry(0.075, 0.034, 6, 3);
      const gp = g.attributes.position;
      for (let i = 0; i < gp.count; i++) gp.setZ(i, z * (1 + 0.5 * Math.max(0, -gp.getY(i) / 0.017 - 0.5)));
      g.computeVertexNormals();
      nb.add(g.translate(0.0375, -0.017, 0), { ...noteC, smooth: true });
    }
    nb.add(new THREE.PlaneGeometry(0.0045, 0.034).rotateY(Math.PI / 2).translate(0.075, -0.017, 0), noteC);
    nb.add(new THREE.PlaneGeometry(0.075, 0.0045).rotateX(Math.PI / 2).translate(0.0375, -0.034, 0), noteC);
    holds.noteFolded = D.hero(nb.merge(), { rims: false });
    holds.noteFolded.traverse((o) => { if (o.material) o.material.side = THREE.DoubleSide; });
    holds.noteFolded.userData.main.castShadow = false;
    holds.noteFolded.visible = false;
    root.add(holds.noteFolded);
  }
  await tick();
  // the money pouch: a faded cotton pouch, open at the top (the zip pulled right back), sitting in her lap against her belly
  const POUCH = { L: 0.145, H: 0.078, T: 0.052, w: 0.005 };
  {
    const cloth = { col: '#2c4a3a', col2: '#90b494', gloss: 0.1, hilite: 0.3, scale: 7, bump: 0.9, erode: 0.2 };
    const inner = { col: '#101a14', col2: '#2c3a30', gloss: 0, hilite: 0.1, scale: 7, bump: 0.5, erode: 0 };
    const zip = { col: '#3a3024', col2: '#c8b890', gloss: 0.6, hilite: 0.6, scale: 20, bump: 0.3 };
    const { L, H, T, w } = POUCH;
    const pb = new D.Batch();
    // a soft bag: rounded bottom and corners, the mouth a little pinched, a few creases; everything stays inside the box L x H x T
    // (the checks use that box)
    {
      const NR = 32, rb = 0.014, rc = 0.016;
      const PIECES = [['x', 1, 2], ['a', 0, 4], ['z', 1, 6], ['a', 1, 4], ['x', -1, 2], ['a', 2, 4], ['z', -1, 6], ['a', 3, 4]];
      const ringPt = (i, ins, pinch) => {
        const a = L / 2 - ins, b = T / 2 - ins - pinch, r = Math.max(rc - ins, 0.003);
        let k = i;
        for (const [ty, sg, cnt] of PIECES) {
          if (k >= cnt) { k -= cnt; continue; }
          const t = k / cnt;
          if (ty === 'x') return [sg * a, sg * (b - r) * (1 - 2 * t) * -1, sg, 0];
          if (ty === 'z') return [sg * (a - r) * (1 - 2 * t), sg * b, 0, sg];
          const ph = (sg + t) * Math.PI / 2, cx = Math.cos(ph), cz = Math.sin(ph);
          const qx = sg === 0 || sg === 3 ? 1 : -1, qz = sg < 2 ? 1 : -1;       // the corner's centre, by quadrant
          return [qx * (a - r) + r * cx, qz * (b - r) + r * cz, cx, cz];
        }
      };
      const rows = [];
      for (let k = 0; k <= 3; k++) { const th = (k / 3) * Math.PI / 2; rows.push([-H + rb * (1 - Math.cos(th)), rb * (1 - Math.sin(th))]); }
      for (let m = 1; m <= 4; m++) rows.push([-H + rb + (H - rb) * m / 4, 0]);
      const surface = (thick) => {
        const P = [];
        rows.forEach(([y0, ins0], j) => {
          const y = Math.max(y0, -H + thick), v = (y0 + H) / H;
          const pinch = 0.0025 * sm(0.55, 1, v);
          for (let i = 0; i < NR; i++) {
            const [x, z, nx, nz] = ringPt(i, ins0 + thick, pinch);
            const wr = 0.0013 * (1 + Math.sin(i * 1.23 + j * 1.7)) * Math.sin(Math.PI * Math.min(1, v * 1.15));
            P.push([x - nx * wr, y, z - nz * wr, nx, nz]);
          }
        });
        return P;
      };
      const grid = (P, outward, capY) => {
        const nr = rows.length, pos = [];
        const at = (j, i) => P[j * NR + ((i % NR) + NR) % NR];
        // winding: the first quad's normal must point out (outer) or in (inner)
        const a0 = at(4, 0), b0 = at(4, 1), c0 = at(5, 0);
        const cx = (b0[1] - a0[1]) * (c0[2] - a0[2]) - (b0[2] - a0[2]) * (c0[1] - a0[1]);
        const cz = (b0[0] - a0[0]) * (c0[1] - a0[1]) - (b0[1] - a0[1]) * (c0[0] - a0[0]);
        const flip = (cx * a0[3] + cz * a0[4]) * outward < 0;
        const tri = (p, q, r) => { if (flip) pos.push(...p.slice(0, 3), ...r.slice(0, 3), ...q.slice(0, 3)); else pos.push(...p.slice(0, 3), ...q.slice(0, 3), ...r.slice(0, 3)); };
        for (let j = 0; j < nr - 1; j++) for (let i = 0; i < NR; i++) { tri(at(j, i), at(j, i + 1), at(j + 1, i)); tri(at(j, i + 1), at(j + 1, i + 1), at(j + 1, i)); }
        // the bottom: a fan, facing down (outer) or up (inner)
        const c = [0, capY, 0];
        for (let i = 0; i < NR; i++) tri(at(0, i + 1), at(0, i), c);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.computeVertexNormals();
        return g;
      };
      const outer = surface(0), innerS = surface(w);
      pb.add(grid(outer, 1, -H), { ...cloth, smooth: true });
      pb.add(grid(innerS, -1, -H + w), { ...inner, smooth: true });
      // the rim: the cloth's cut edge, joining the two top rings
      const pos = [], top = rows.length - 1;
      for (let i = 0; i < NR; i++) {
        const o0 = outer[top * NR + i], o1 = outer[top * NR + (i + 1) % NR], i0 = innerS[top * NR + i], i1 = innerS[top * NR + (i + 1) % NR];
        pos.push(...o0.slice(0, 3), ...i0.slice(0, 3), ...o1.slice(0, 3), ...o1.slice(0, 3), ...i0.slice(0, 3), ...i1.slice(0, 3));
      }
      const rim = new THREE.BufferGeometry();
      rim.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      rim.computeVertexNormals();
      pb.add(rim, cloth);
    }
    // the two zip tapes, folded out along the mouth
    for (const zs of [-1, 1]) pb.box(L - 0.01, 0.003, 0.008, V3(0, 0.0015, zs * (T / 2 + 0.003)), zip);
    pb.box(0.012, 0.022, 0.004, V3(L / 2 - 0.02, -0.01, T / 2 + 0.004), zip);
    // a few notes already inside, standing up in the dark
    pb.box(L - 0.04, H * 0.55, 0.002, V3(0.004, -H + w + H * 0.28, -0.006), { col: '#1d4e5c', col2: '#6cb6b2', erode: 0, hilite: 0.2, scale: 18, bump: 0.3 });
    holds.pouch = D.hero(pb.merge(), { rims: false });
    holds.pouch.userData.main.material.side = THREE.DoubleSide;
    holds.pouch.userData.main.castShadow = true;
    root.add(holds.pouch);
  }
  // the pouch's waist band: laid on the cardigan each drawing
  const bandTable = materialTable([{ kind: 'cotton', col: '#223a2e', col2: '#86aa8a', hatch: '#0e1a14', scale: 18, gloss: 0, hatchAmt: 0.3, twoSided: true }]);
  const bandMat = paintMaterial(bandTable, { side: THREE.DoubleSide });
  const bandGeo = new THREE.BufferGeometry();
  const NBAND = 36;
  {
    const n = NBAND * 8;
    bandGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    bandGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const ac = new Float32Array(n * 4); for (let i = 0; i < n; i++) ac[i * 4] = -1;
    for (const [nm, sz, fill] of [['aCloth', 4, 0], ['aClothW', 1, 0], ['aShrink', 1, 0], ['aPushW', 1, 0], ['aFlow', 2, 0], ['aAxis', 3, 0.577], ['aCurv', 1, 0], ['aMat', 1, 0]]) {
      bandGeo.setAttribute(nm, new THREE.BufferAttribute(nm === 'aCloth' ? ac : new Float32Array(n * sz).fill(fill), sz));
    }
    const idx = [];
    for (let i = 0; i < NBAND - 1; i++) for (let k = 0; k < 8; k++) {
      const a = i * 8 + k, b = i * 8 + ((k + 1) % 8), c = (i + 1) * 8 + k, d = (i + 1) * 8 + ((k + 1) % 8);
      idx.push(a, c, b, b, c, d);
    }
    bandGeo.setIndex(idx);
  }
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.frustumCulled = false;
  band.castShadow = false;
  band.userData.castShadow = false;
  band.receiveShadow = true;
  root.add(band);
  probeTables.push(bandTable);

  await PH.mark('pouchsearch');
  // ---------------------------------------------------------------- where the pouch sits (searched once the acting is known: placePouch)
  const surf = {};
  const torsoVert = (i) => segKeyOf(card, i) === 'torso';
  const toChar = (S) => {        // snapshots are world; the search runs in character space
    const inv = root.matrixWorld.clone().invert();
    const o = { ...S, pos: S.pos.slice(), nrm: S.nrm.slice(), grid: new Map() };
    const nm = new THREE.Matrix3().getNormalMatrix(inv);
    for (let i = 0; i < S.ok.length; i++) {
      if (!S.ok[i]) continue;
      _v.set(S.pos[i * 3], S.pos[i * 3 + 1], S.pos[i * 3 + 2]).applyMatrix4(inv);
      o.pos[i * 3] = _v.x; o.pos[i * 3 + 1] = _v.y; o.pos[i * 3 + 2] = _v.z;
      _v2.set(S.nrm[i * 3], S.nrm[i * 3 + 1], S.nrm[i * 3 + 2]).applyMatrix3(nm).normalize();
      o.nrm[i * 3] = _v2.x; o.nrm[i * 3 + 1] = _v2.y; o.nrm[i * 3 + 2] = _v2.z;
      const key = ((Math.floor(_v.x / S.cell) + 512) * 1048576) + ((Math.floor(_v.y / S.cell) + 512) * 1024) + (Math.floor(_v.z / S.cell) + 512);
      let a = o.grid.get(key);
      if (!a) o.grid.set(key, (a = []));
      a.push(i);
    }
    return o;
  };
  const pouchFrame = new THREE.Object3D();
  const bandRest = [];
  const bandList = [];
  function boxClear(frame, dims, margin, surfaces) {
    // the smallest signed clearance of the pouch's outer points to the given clothes
    frame.updateMatrix();
    let worst = 9;
    const { L, H, T } = dims;
    for (let a = -1; a <= 1; a += 0.5) for (let b = 0; b >= -1; b -= 0.25) for (const c of [-1, -0.5, 0, 0.5, 1]) {
      const edge = Math.abs(a) === 1 || b === 0 || b === -1 || Math.abs(c) === 1;
      if (!edge) continue;
      const p = V3(a * L / 2, b * H, c * T / 2).applyMatrix4(frame.matrix);
      for (const S of surfaces) {
        const r = sdist(S, p, 0.05);
        if (r) worst = Math.min(worst, r.d);
      }
    }
    return worst - margin;
  }
  function placePouch() {
    if (bakeIn && bakeIn.pouch) {
      const B_ = bakeIn.pouch;
      pouchFrame.position.fromArray(B_.pos);
      pouchFrame.rotation.set(...B_.rot);
      pouchFrame.updateMatrix();
      holds.pouch.position.copy(pouchFrame.position);
      holds.pouch.quaternion.copy(pouchFrame.quaternion);
      holds.pouch.updateMatrixWorld(true);
      holds.pouchFit = B_.fit;
      bandRest.length = 0;
      for (const l of B_.bandRest) bandRest.push({ bone: 'spine_01', local: V3(...l) });
      holds.bandEnds = B_.bandEnds.map((a) => V3(...a));
      bandList.length = 0;
      bandList.push(...B_.bandList);
      bakeOut.pouch = B_;
      return;
    }
    resetPose();
    const RC = { card: toChar(snap(card, { filter: torsoVert })), pants: toChar(snap(meshes.Pants)) };
    // lean back against the belly, bottom in the lap; from in front, move in until 6 mm from the knit and the silk
    let best = null;
    for (const tilt of [0.12, 0.22, 0.32]) for (const x of [0.015, 0.03]) for (let y = 0.46; y <= 0.66; y += 0.01) {
      let ok = null;
      for (let z = 0.4; z >= 0.04; z -= 0.005) {
        pouchFrame.position.set(x, y, z);
        pouchFrame.rotation.set(-tilt, -0.1, 0);
        if (boxClear(pouchFrame, POUCH, 0.026, [RC.card, RC.pants]) < 0) break;
        ok = z;
      }
      if (ok === null || ok > 0.3) continue;
      const score = ok + y * 0.5;
      if (!best || score < best.score) best = { score, x, y, z: ok, tilt };
    }
    if (!best) { console.warn('no place for the pouch'); best = { x: -0.06, y: 0.56, z: 0.2, tilt: 0.5 }; }
    pouchFrame.position.set(best.x, best.y, best.z);
    pouchFrame.rotation.set(-best.tilt, -0.1, 0);
    // then clear of her body in every drawing of the loop (she bends over it): move it forward until it is
    const posed = [];
    for (let f = 0; f < 144; f += 6) { pose(f, { torsoOnly: true }); posed.push(toChar(snap(card, { filter: torsoVert }))); }
    resetPose();
    let moved = 0;
    while (boxClear(pouchFrame, POUCH, 0.02, posed) < 0 && moved < 0.12) { pouchFrame.position.z += 0.005; pouchFrame.position.y -= 0.002; moved += 0.005; }
    best.moved = moved;
    pouchFrame.updateMatrix();
    holds.pouch.position.copy(pouchFrame.position);
    holds.pouch.quaternion.copy(pouchFrame.quaternion);
    holds.pouch.updateMatrixWorld(true);
    holds.pouchFit = best;
    // the band's path at rest: from the pouch's back corners round the waist (on the knit), at the height of the pouch's mouth
    const cl = V3(POUCH.L / 2 + 0.002, -0.012, -POUCH.T / 2).applyMatrix4(pouchFrame.matrix);
    const cr = V3(-POUCH.L / 2 - 0.002, -0.012, -POUCH.T / 2).applyMatrix4(pouchFrame.matrix);
    const y0 = (cl.y + cr.y) / 2 + 0.01;
    let zmin = 9, zmax = -9;
    for (let i = 0; i < RC.card.ok.length; i++) {
      if (!RC.card.ok[i] || Math.abs(RC.card.pos[i * 3 + 1] - y0) > 0.012 || Math.abs(RC.card.pos[i * 3]) > 0.05) continue;
      zmin = Math.min(zmin, RC.card.pos[i * 3 + 2]); zmax = Math.max(zmax, RC.card.pos[i * 3 + 2]);
    }
    const c = V3(0, y0, zmin < zmax ? (zmin + zmax) / 2 : 0.04);
    const a0 = Math.atan2(cl.x - c.x, cl.z - c.z), a1 = Math.atan2(cr.x - c.x, cr.z - c.z) + Math.PI * 2;
    bandRest.length = 0;
    for (let k = 1; k < 13; k++) {
      const a = a0 + (a1 - a0) * (k / 13);
      const dir = V3(Math.sin(a), 0, Math.cos(a));
      let rr = 0.12;
      for (let sv = 0.3; sv > 0.02; sv -= 0.003) {
        const pp = c.clone().addScaledVector(dir, sv);
        const r = sdist(RC.card, pp, 0.03);
        if (r && r.d < 0.004) { rr = sv; break; }
      }
      const pr = c.clone().addScaledVector(dir, rr + 0.004);
      const Rb = rest.spine_01;
      bandRest.push({ bone: 'spine_01', local: pr.clone().sub(Rb.wp).applyQuaternion(Rb.wq.clone().invert()) });
    }
    holds.bandEnds = [cl, cr];
    // the knit points the band may touch: near its resting path
    bandList.length = 0;
    const cp_ = card.geometry.attributes.position;
    const path = bandRest.map((b) => b.local.clone().applyQuaternion(rest.spine_01.wq).add(rest.spine_01.wp)).concat([cl, cr]);
    for (let i = 0; i < cp_.count; i++) {
      if (!torsoVert(i)) continue;
      _v.fromBufferAttribute(cp_, i).add(V3(0, SOLE, 0));
      for (const q of path) if (q.distanceToSquared(_v) < 0.06 * 0.06) { bandList.push(i); break; }
    }
    const r6 = (v) => v.toArray().map((x) => +x.toFixed(6));
    bakeOut.pouch = { pos: r6(pouchFrame.position), rot: [pouchFrame.rotation.x, pouchFrame.rotation.y, pouchFrame.rotation.z], fit: best, bandRest: bandRest.map((b) => r6(b.local)), bandEnds: [r6(cl), r6(cr)], bandList: bandList.slice() };
  }
  const bandCurve = new THREE.CatmullRomCurve3([], false, 'centripetal');
  const bandPts = Array.from({ length: NBAND }, () => new THREE.Vector3());
  let surfaceDirty = true;
  function updateBand() {
    const pts = [root.localToWorld(holds.bandEnds[0].clone())];
    for (const sp of bandRest) pts.push(B[sp.bone].localToWorld(sp.local.clone()));
    pts.push(root.localToWorld(holds.bandEnds[1].clone()));
    bandCurve.points = pts;
    for (let i = 0; i < NBAND; i++) bandCurve.getPointAt(i / (NBAND - 1), bandPts[i]);
    if (surfaceDirty) {
      surf.card = snap(card, { list: bandList });
      surfaceDirty = false;
    }
    const n_ = new THREE.Vector3();
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < NBAND - 1; i++) {
        const p = bandPts[i];
        const r = sdist(surf.card, p, 0.05);
        if (!r) continue;
        n_.set(surf.card.nrm[r.i * 3], surf.card.nrm[r.i * 3 + 1], surf.card.nrm[r.i * 3 + 2]);
        const want = 0.0045;
        if (r.d < want) p.addScaledVector(n_, want - r.d);
        else if (i > 2 && i < NBAND - 3) p.addScaledVector(n_, -(r.d - want) * 0.8);
      }
      if (pass < 2) for (let i = 1; i < NBAND - 1; i++) bandPts[i].lerp(_v.addVectors(bandPts[i - 1], bandPts[i + 1]).multiplyScalar(0.5), 0.25);
    }
    bandCurve.points = bandPts.map((p) => root.worldToLocal(p.clone()));
    const pos = bandGeo.attributes.position.array, nor = bandGeo.attributes.normal.array;
    const frames = bandCurve.computeFrenetFrames(NBAND - 1, false);
    const cc = new THREE.Vector3();
    for (let i = 0; i < NBAND; i++) {
      const c = bandCurve.getPointAt(i / (NBAND - 1), _v);
      const tg = frames.tangents[i];
      cc.set(c.x, 0, c.z - P('spine_01').z).normalize();
      const up = new THREE.Vector3().crossVectors(cc, tg).normalize();
      if (up.y < 0) up.negate();
      const out = new THREE.Vector3().crossVectors(tg, up).normalize();
      if (out.dot(cc) < 0) out.negate();
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const o = (i * 8 + k) * 3;
        _v2.copy(up).multiplyScalar(Math.cos(ang) * 0.012).addScaledVector(out, Math.sin(ang) * 0.0016);
        pos[o] = c.x + _v2.x + out.x * 0.0016; pos[o + 1] = c.y + _v2.y + out.y * 0.0016; pos[o + 2] = c.z + _v2.z + out.z * 0.0016;
        _v2.normalize();
        nor[o] = _v2.x; nor[o + 1] = _v2.y; nor[o + 2] = _v2.z;
      }
    }
    bandGeo.attributes.position.needsUpdate = true;
    bandGeo.attributes.normal.needsUpdate = true;
  }

  await PH.mark('note');
  // ---------------------------------------------------------------- the note she is given: where the customer's hand holds it
  const n3 = (x, y, z) => V3(x, y, z).normalize();
  const noteTrack = { from: null, rel: null, frames: new Map(), handoff: null };
  if (giver && giver.poseAt) {
    // the customer's drawings are fixed: read where her note is on each drawing of the exchange, and when it leaves her fingers
    const [e0] = giver.exchangeTime ?? [4.33, 4.92];
    let seen = false;
    for (let f = Math.floor(e0 * FPS / 2) * 2 - 2; f < 144; f += 2) {
      giver.poseAt(f / FPS);
      const n = giver.holds.note;
      n.updateWorldMatrix(true, false);
      if (n.visible) { seen = true; noteTrack.frames.set(f, n.matrixWorld.clone()); }
      else if (seen) { noteTrack.handoff = f; break; }
    }
    giver.poseAt(0);
  } else if (track) {
    noteTrack.handoff = track.handoff;
    noteTrack.frames.set(track.handoff - 2, track.customer.clone().multiply(new THREE.Matrix4().fromArray(track.noteLocal)));
  }
  const HANDOFF = noteTrack.handoff ?? 114;
  const H = Math.max(108, Math.min(118, HANDOFF));
  // the far half of the note, and the way along it (from the customer toward the seller), in character space
  const noteFar = { p: V3(0.0, 1.06, 0.46), along: V3(0, 0, -1), face: V3(0, 1, 0) };
  {
    const M = noteTrack.frames.get(HANDOFF - 2) ?? null;
    if (M) {
      const inv = root.matrixWorld.clone().invert();
      const L = inv.clone().multiply(M);
      // the note's local +x runs along the customer's fingers (away from her): the seller holds the end at +x
      const c = V3(0, 0, 0).applyMatrix4(L);
      const ax = V3(1, 0, 0).transformDirection(L);
      const fc = V3(0, 0, 1).transformDirection(L);
      noteFar.p.copy(c).addScaledVector(ax, 0.045);
      noteFar.along.copy(ax);
      noteFar.face.copy(fc);
      noteFar.local = L;
    }
  }

  await PH.mark('acting');
  // ---------------------------------------------------------------- the acting
  // Character space: she faces +z, her left is +x. Bouquet poses: at = the tie, dir = toward the flowers, roll = turn about dir.
  // Each key has a goal for each hand (l, r) and a finger shape (fl, fr). The right hand winds the raffia and then keeps the bouquet
  // in her lap; the left hand holds it while she winds, then takes the note (the customer hands it to her left, the street's side)
  // and puts it in the pouch on the left of her lap.
  const WRAP_AT = V3(-0.085, 0.68, 0.5), WRAP_DIR = n3(0.95, 0.35, -0.05);
  const LAP_AT = V3(-0.07, 0.62, 0.35), LAP_DIR = n3(0.62, 0.14, 0.77);
  const WR = 0.064;        // how far from the stems her fingers circle
  const keys = [];
  const K = (f, o) => keys.push({ f, ...o });
  const LGRIP = { onBq: true, y: BQ.gripY, auto: true };
  const LGRIP_LAP = { onBq: true, y: BQ.gripY, auto: true, pole: n3(1, -0.4, -0.1) };
  const RSTEM = { onBq: true, y: -0.058, auto: true };
  // in her lap the right forearm comes in from her right side: the hand turns palm-up under the stems, thumb toward the flowers
  const RSTEM_LAP = { onBq: true, y: -0.058, auto: true, fore: n3(0.9, 0.3, 0.15) };
  // body deltas: [bend forward, turn to her left, lean to her left]
  const BODY_WORK = { spine: [0.09, 0.0, 0.02], neck: [-0.02, 0.04, 0.0], head: [-0.1, 0.1, 0.02] };
  const LAP = (o) => ({ bq: { at: LAP_AT, dir: LAP_DIR, roll: -2.2 }, r: RSTEM_LAP, fr: 'grip', tuck: true, ...o });
  // the bouquet's turn while she winds: one full turn per turn of the raffia, ending where the tie-off keys expect it
  const TH_END = 0.4 + 10.3 + 1.3;
  const SPIN_C = TH_END - 2.6 - Math.PI * 2;
  const spin = (th) => -th + SPIN_C;
  const _dev = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new Map();
  const WRAP_H0 = parseFloat(_dev.get('wh0') ?? -0.5), WRAP_HA = parseFloat(_dev.get('wha') ?? 0.35);
  const wrapKey = (f, th, o = {}) => K(f, { ease: 'snap', bq: { at: WRAP_AT, dir: WRAP_DIR, roll: spin(th) }, l: LGRIP, r: { wrap: th }, fr: 'string', fl: 'bqgrip', ...BODY_WORK,
    spine: [0.09 + 0.02 * Math.sin(th), 0.03 * Math.cos(th), 0.02], ...o });
  // two turns of the raffia (the hand goes round the stems; the bouquet turns back a little against it)
  const TH0 = 0.4;
  wrapKey(0, TH0, { ease: 'inout' });
  wrapKey(4, TH0 + 1.4);
  wrapKey(8, TH0 + 2.9);
  wrapKey(12, TH0 + 4.4, { ease: 'out' });
  wrapKey(16, TH0 + 5.9);
  wrapKey(20, TH0 + 7.3);
  wrapKey(24, TH0 + 8.8);
  wrapKey(28, TH0 + 10.3, { ease: 'out' });
  // pull it tight: a small dip, then out to her right with a snap, a held pull, then back to tie off
  K(32, { ease: 'in', bq: { at: WRAP_AT.clone().add(V3(0.005, -0.006, 0)), dir: WRAP_DIR, roll: spin(TH0 + 10.3) - 0.05 }, l: LGRIP, r: { bqLocal: V3(-0.02, -0.03, 0.06), fwd: n3(0.3, 0.2, -1), palm: n3(0, 1, 0) }, fr: 'string', fl: 'bqgrip',
    spine: [0.08, 0.02, 0.03], neck: [0.04, 0.05, 0], head: [0.02, 0.1, 0.02], clavR: [0, 0, -0.04] });
  K(38, { ease: 'snap', bq: { at: WRAP_AT.clone().add(V3(0.018, 0.004, 0)), dir: n3(0.85, 0.34, 0.32), roll: spin(TH0 + 10.3) - 0.1 }, l: LGRIP, r: { bqLocal: V3(-0.03, -0.12, 0.1), fwd: n3(0.4, 0.4, -1), palm: n3(0, 1, 0.2) }, fr: 'string', fl: 'bqgrip',
    spine: [0.06, -0.06, -0.02], neck: [0.03, 0.02, 0], head: [0.02, 0.02, -0.03], clavR: [0, 0.06, 0.04] });
  K(46, { ease: 'hold', bq: { at: WRAP_AT.clone().add(V3(0.02, 0.006, 0)), dir: n3(0.85, 0.34, 0.32), roll: spin(TH0 + 10.3) - 0.11 }, l: LGRIP, r: { bqLocal: V3(-0.03, -0.13, 0.1), fwd: n3(0.4, 0.4, -1), palm: n3(0, 1, 0.2) }, fr: 'string', fl: 'bqgrip',
    spine: [0.065, -0.065, -0.022], neck: [0.035, 0.02, 0], head: [0.03, 0.02, -0.03], clavR: [0, 0.07, 0.045] });
  K(52, { ease: 'inout', bq: { at: WRAP_AT, dir: WRAP_DIR, roll: spin(TH0 + 10.3 + 0.9) }, l: LGRIP, r: { wrap: TH0 + 10.3 + 0.9, near: 0.03 }, fr: 'pinch', fl: 'bqgrip', ...BODY_WORK });
  K(58, { ease: 'out', bq: { at: WRAP_AT, dir: WRAP_DIR, roll: spin(TH_END) }, l: LGRIP, r: { wrap: TH0 + 10.3 + 1.3, near: 0.028 }, fr: 'pinch', fl: 'bqgrip', tuck: true, ...BODY_WORK });
  // both hands lay it down across her lap
  K(64, { ease: 'in', bq: { at: WRAP_AT.clone().add(V3(-0.02, 0.012, 0.0)), dir: n3(0.9, 0.3, 0.2), roll: -2.5 }, l: LGRIP, r: RSTEM, fr: 'grip', fl: 'bqgrip', tuck: true,
    spine: [0.07, 0.02, 0.02], neck: [0.04, 0.04, 0], head: [0.04, 0.08, 0.02] });
  K(72, LAP({ ease: 'snap', l: LGRIP_LAP, fl: 'bqgrip', spine: [0.08, 0.0, 0.0], neck: [0.04, 0.02, 0], head: [0.05, 0.04, 0.0] }));
  // the left hand lets go and settles on her knee; she looks up toward the customer (the hat still shades her eyes)
  K(74, LAP({ ease: 'out', l: LGRIP_LAP, fl: 'open', spine: [0.08, 0.0, 0.0], neck: [0.04, 0.02, 0], head: [0.05, 0.04, 0.0] }));
  K(78, LAP({ ease: 'out', l: { bqUp: 0.07, fwd: n3(-0.3, -0.3, 1), palm: n3(-0.2, -1, -0.3) }, fl: 'relax', spine: [0.07, 0.0, 0.0], neck: [0.02, 0.02, 0], head: [0.0, 0.03, 0.0] }));
  K(86, LAP({ ease: 'inout', l: { at: V3(0.19, 0.6, 0.2), fwd: n3(-0.05, -0.55, 1), palm: n3(-0.05, -1, -0.5), arc: [0.06, 0.02, -0.04], wk: 0.15 }, fl: 'rest', spine: [0.06, 0.02, 0.02], neck: [-0.02, 0.02, 0], head: [-0.06, 0.02, 0.02] }));
  K(H - 14, LAP({ ease: 'hold', l: { at: V3(0.19, 0.602, 0.202), fwd: n3(-0.05, -0.55, 1), palm: n3(-0.05, -1, -0.5), wk: 0.15 }, fl: 'rest', spine: [0.058, 0.03, 0.02], neck: [-0.03, 0.02, 0], head: [-0.07, 0.02, 0.02] }));
  // anticipation: the hand comes off the knee, the left shoulder dips
  K(H - 8, LAP({ ease: 'in', l: { at: V3(0.2, 0.64, 0.19), fwd: n3(-0.1, 0.15, 1), palm: n3(-0.2, -1, 0), wk: 0.15 }, fl: 'relax', spine: [0.07, 0.02, 0.03], neck: [-0.03, 0.0, 0], head: [-0.06, 0.0, 0.03], clavL: [0, 0, 0.05] }));
  // the reach: forward and up to the note, beside the brim; she turns her left shoulder forward and tips her head back
  K(H - 3, LAP({ ease: 'snap', l: { note: true, pre: 0.025 }, fl: 'open', spine: [0.1, -0.2, -0.03], neck: [-0.06, 0.06, -0.02], head: [-0.12, 0.08, -0.05], clavL: [0, -0.14, -0.08] }));
  K(H, LAP({ ease: 'out', l: { note: true, pre: 0 }, fl: 'pinch', spine: [0.105, -0.21, -0.03], neck: [-0.06, 0.06, -0.02], head: [-0.12, 0.08, -0.05], clavL: [0, -0.15, -0.08] }));
  // down with it, out past her shoulder first, then into the pouch
  K(H + 3, LAP({ ease: 'out', l: { at: V3(0.3, 0.8, 0.36), fwd: n3(-0.2, -0.2, 1), palm: n3(-0.3, -1, 0), mode: 'pinch' }, fl: 'pinch', spine: [0.09, -0.14, -0.02], neck: [-0.03, 0.05, -0.02], head: [-0.08, 0.07, -0.04], clavL: [0, -0.08, -0.04] }));
  K(Math.max(H + 6, 120), LAP({ ease: 'out', l: { pouchLocal: V3(0.0, 0.1, 0.0), fwd: n3(-1, -0.25, 0), palm: n3(-0.1, -1, 0.1), mode: 'slip', arc: [0.04, 0.02, 0.04] }, fl: 'slip', spine: [0.07, -0.04, 0.0], neck: [0.03, 0.02, -0.02], head: [0.04, 0.04, -0.02], clavL: [0, -0.02, 0] }));
  K(126, LAP({ ease: 'snap', l: { pouchLocal: V3(0.012, -0.028, 0.001), fwd: n3(-1, -0.1, 0), palm: n3(0, -1, 0.05), mode: 'slip', inPouch: true }, fl: 'slip', spine: [0.08, -0.03, 0.0], neck: [0.02, 0.02, 0], head: [-0.02, 0.04, 0.0] }));
  K(130, LAP({ ease: 'hold', l: { pouchLocal: V3(0.014, -0.034, 0.001), fwd: n3(-1, -0.1, 0), palm: n3(0, -1, 0.05), mode: 'slip', inPouch: true }, fl: 'slip', drop: true, spine: [0.08, -0.03, 0.0], neck: [0.02, 0.02, 0], head: [-0.02, 0.04, 0.0] }));
  K(134, LAP({ ease: 'snap', l: { pouchLocal: V3(0.0, 0.08, 0.0), fwd: n3(-1, -0.25, 0), palm: n3(-0.1, -1, 0.1), mode: 'slip' }, fl: 'relax', spine: [0.07, -0.02, 0.0], neck: [0.0, 0.02, 0], head: [-0.05, 0.04, 0.0] }));
  // the left hand takes the bouquet again, and both lift it up to wrap
  K(139, LAP({ ease: 'inout', l: LGRIP_LAP, fl: 'bqgrip', spine: [0.07, 0.0, 0.01], neck: [0.04, 0.03, 0], head: [0.04, 0.08, 0.02] }));
  K(144, { ...keys[0], f: 144, ease: 'snap' });

  const EASE = {
    in: (u) => u * u * u,
    out: (u) => 1 - Math.pow(1 - u, 3),
    inout: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    snap: (u) => 1 - Math.pow(1 - u, 4.5),
    hold: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  };
  const lerpA = (a, b, u) => (a ?? [0, 0, 0]).map((x, i) => x + (((b ?? [0, 0, 0])[i] ?? 0) - x) * u);
  function bouquetPose(k, out) {
    out.q.setFromUnitVectors(V3(0, 1, 0), k.dir);
    out.q.multiply(_q.setFromAxisAngle(V3(0, 1, 0), k.roll));
    out.p.copy(k.at);
    return out;
  }
  const bqA = { p: V3(), q: new THREE.Quaternion() }, bqB = { p: V3(), q: new THREE.Quaternion() };
  const sample = { frame: 0, note: 0, tuck: false, pin: false, wrap: null };
  const wrapBasis = (dir) => {
    const e1 = V3(0, 1, 0).addScaledVector(dir, -dir.y).normalize();
    const e2 = new THREE.Vector3().crossVectors(dir, e1).normalize();
    return [e1, e2];
  };
  const NOTE_SIDE = 'l';
  // a hand's goal in character space
  function goalOf(side, g, bq) {
    const G = goalOf0(side, g, bq);
    G.wk = g.wk ?? WRIST_K;
    return G;
  }
  function goalOf0(side, g, bq) {
    const sx = side === 'l' ? 1 : -1;
    const bqM = new THREE.Matrix4().compose(bq.p, bq.q, V3(1, 1, 1));
    const dirC = V3(0, 1, 0).applyQuaternion(bq.q);
    if (g.wrap !== undefined) {
      const [e1, e2] = wrapBasis(dirC);
      // she spins the bouquet in her left fist; the right hand only circles a little on the near side, keeping the raffia taut
      const ha = WRAP_H0 + WRAP_HA * Math.sin(g.wrap);
      const rad = e1.clone().multiplyScalar(Math.cos(ha)).addScaledVector(e2, Math.sin(ha));
      const tie = V3(0, BQ.tieY, 0).applyMatrix4(bqM);
      const p = tie.clone().addScaledVector(rad, g.near ?? WR);
      // fingers point at the stems, the palm faces the cut ends; the elbow stays out and down
      return { p, fwd: rad.clone().negate(), palm: dirC.clone().negate(), pole: n3(sx, -0.8, 0.05), mode: 'pinch', th: g.wrap, roll: { ax: dirC.clone(), kind: 'free', palm0: dirC.clone().negate(), rad0: rad.clone().negate() } };
    }
    if (g.onBq) {
      // a fist round the stems: index and thumb toward the flowers. The left fist's forearm runs across the bouquet.
      const p = V3(0, g.y ?? -0.07, 0).applyMatrix4(bqM);
      const across = dirC.clone().negate();
      let palm;
      if (g.auto) {
        const sh = root.worldToLocal(B[`upperarm_${side}`].getWorldPosition(V3()));
        const fwd0 = g.fore ? g.fore.clone() : p.clone().sub(sh.add(V3(sx * 0.04, -0.16, 0)));
        const fwd = fwd0.addScaledVector(across, -fwd0.dot(across)).normalize();
        palm = side === 'l' ? new THREE.Vector3().crossVectors(across, fwd).normalize() : new THREE.Vector3().crossVectors(fwd, across).normalize();
      } else palm = g.palmC.clone().addScaledVector(across, -g.palmC.dot(across)).normalize();
      const fwd = side === 'l' ? new THREE.Vector3().crossVectors(palm, across).normalize() : new THREE.Vector3().crossVectors(across, palm).normalize();
      let pole = g.pole ? g.pole.clone() : side === 'l' ? n3(0.25, -0.7, -0.7) : V3(-1, -0.8, -0.1);
      if (!g.pole && side === 'r') pole.addScaledVector(dirC, -pole.dot(dirC)).normalize();
      return { p, fwd, palm, pole, mode: 'grip', onBq: true, roll: { ax: across.clone(), kind: 'grip' } };
    }
    if (g.bqUp !== undefined) {
      const p = V3(0, g.y ?? BQ.gripY, 0).applyMatrix4(bqM).add(V3(0, g.bqUp, 0.02));
      return { p, fwd: g.fwd.clone(), palm: g.palm.clone(), pole: n3(sx, -0.35, 0.0), mode: 'pinchFlat' };
    }
    if (g.bqLocal) {
      const p = g.bqLocal.clone().applyMatrix4(bqM);
      return { p, fwd: g.fwd.clone().applyQuaternion(bq.q), palm: g.palm.clone().applyQuaternion(bq.q), pole: n3(sx, -0.7, -0.1), mode: 'pinchFlat' };
    }
    if (g.note) {
      // pinch the far end of the note, fingers along it toward the customer, palm down onto it; come in from a little above
      const p = noteFar.p.clone().addScaledVector(noteFar.along, -(g.pre ?? 0)).addScaledVector(V3(0, 1, 0), (g.pre ?? 0) * 0.8);
      const fwd = noteFar.along.clone().negate().add(V3(0, -0.2, 0)).normalize();
      const palm = n3(-0.25 * sx, -1, 0);
      return { p, fwd, palm, pole: n3(sx, -0.35, -0.3), mode: 'pinch', note: true };
    }
    if (g.pouchLocal) {
      const p = V3(g.pouchLocal.x, Math.min(0, g.pouchLocal.y), g.pouchLocal.z).applyMatrix4(pouchFrame.matrix);
      p.y += Math.max(0, g.pouchLocal.y) * 0.35;
      p.z += Math.max(0, g.pouchLocal.y) * 1.1;
      p.x += Math.max(0, g.pouchLocal.y) * 0.5 * sx;
      return { p, fwd: g.fwd.clone().applyQuaternion(pouchFrame.quaternion), palm: g.palm.clone().applyQuaternion(pouchFrame.quaternion), pole: n3(sx, -0.65, 0.2), mode: g.mode ?? 'pinch', inPouch: !!g.inPouch, toPouch: true };
    }
    return { p: g.at.clone(), fwd: g.fwd.clone(), palm: g.palm.clone(), pole: g.pole ? g.pole.clone() : n3(sx, -0.5, 0.05), mode: g.mode ?? 'wrist' };
  }
  const C2W = (v) => v.clone().applyMatrix4(root.matrixWorld);
  const D2W = (v) => v.clone().transformDirection(root.matrixWorld);
  let lastDrawing = -1;
  await PH.mark('keepout');
  // ---------------------------------------------------------------- keep-out: hands and elbows off the trousers, her body, the bouquet, the pouch and the hat
  // Solved once per drawing (then remembered): the IK goal moves out of whatever a hand would enter, the elbow turns away.
  const KO = { ready: false, rest: {} };
  const TORSO_BONES = ['spine_01', 'spine_02', 'spine_03'];
  async function buildKeepOut() {
    resetPose();
    KO.pants = snap(meshes.Pants, { cell: 0.02 });
    await tick();
    resetPose();
    KO.torso = snap(card, { filter: torsoVert, cell: 0.02 });
    for (const n of TORSO_BONES) { B[n].updateWorldMatrix(true, false); KO.rest[n] = B[n].matrixWorld.clone(); }
    KO.yChest = P('spine_03').y + 0.02; KO.yBelly = P('spine_02').y;
    KO.ready = true;
  }
  const _M = new THREE.Matrix4(), _Mi = new THREE.Matrix4(), _n = new THREE.Vector3();
  function torsoMat(pw) {
    const yc = root.worldToLocal(pw.clone()).y;
    const bn = yc > KO.yChest ? 'spine_03' : yc > KO.yBelly ? 'spine_02' : 'spine_01';
    _Mi.copy(B[bn].matrixWorld).invert();
    _M.copy(KO.rest[bn]).multiply(_Mi);          // current world -> rest world
    return _M;
  }
  const nrmAt = (S, i, out) => out.set(S.nrm[i * 3], S.nrm[i * 3 + 1], S.nrm[i * 3 + 2]);
  const hatGeo = { R: meta.hat.radius, S: meta.hat.slope };
  const hatLocalKO = {
    apex: hatApex.clone().sub(rest.head.wp).applyQuaternion(rest.head.wq.clone().invert()),
    axis: hatAxis.clone().applyQuaternion(rest.head.wq.clone().invert()),
  };
  function hatPush(p, margin, out) {
    // distance from p to the hat's shell and the direction away from it
    const apex = B.head.localToWorld(hatLocalKO.apex.clone());
    const axis = hatLocalKO.axis.clone().applyQuaternion(B.head.getWorldQuaternion(_q)).normalize();
    const d = p.clone().sub(apex);
    const h = -d.dot(axis);
    const rad = d.clone().addScaledVector(axis, h);
    const r = rad.length();
    const len = Math.hypot(hatGeo.R, hatGeo.S * hatGeo.R);
    const tx = hatGeo.R / len, ty = hatGeo.S * hatGeo.R / len;
    const along = THREE.MathUtils.clamp(r * tx + h * ty, 0, len);
    const cx = along * tx, cy = along * ty;
    const dist = Math.hypot(r - cx, h - cy) - 0.004;
    if (dist >= margin) return 0;
    const radN = r > 1e-5 ? rad.divideScalar(r) : V3(1, 0, 0);
    // back to 3D: (r - cx) along the radial direction, (h - cy) down the axis
    out.copy(radN).multiplyScalar(r - cx).addScaledVector(axis, -(h - cy));
    if (out.lengthSq() < 1e-10) out.copy(radN);
    out.normalize().multiplyScalar(margin - dist);
    return margin - dist;
  }
  const bqRad = bqRadius;
  const _pb = new THREE.Vector3();
  // the push that takes point p (world) out of everything it may not enter
  function keepOut(p, o, out) {
    out.set(0, 0, 0);
    let best = 0;
    const take = (v, depth) => { if (depth > best) { best = depth; out.copy(v); } };
    const m = o.margin ?? 0.007;
    const reach = Math.max(0.03, m + 0.012);          // look at least as far as the margin
    let r = sdist(KO.pants, p, reach);
    if (r && r.d < m) take(nrmAt(KO.pants, r.i, _n).clone().multiplyScalar(m - r.d), m - r.d);
    if (o.torso !== false) {
      const M = torsoMat(p);
      const q = p.clone().applyMatrix4(M);
      r = sdist(KO.torso, q, reach);
      if (r && r.d < m) {
        const nw = nrmAt(KO.torso, r.i, _n).clone().transformDirection(_Mi.copy(M).invert());
        take(nw.multiplyScalar(m - r.d), m - r.d);
      }
    }
    if (o.bouquet !== false) {
      const inv = holds.bouquet.matrixWorld.clone().invert();
      const q = p.clone().applyMatrix4(inv);
      if (q.y > BQ.stemEnd - 0.012 && q.y < BQ.coneY1 + 0.06) {
        const rr = Math.hypot(q.x, q.z);
        const lim = bqRad(q.y) + (o.bqMargin ?? 0.008);
        if (rr < lim) {
          const dirL = rr > 1e-5 ? V3(q.x / rr, 0, q.z / rr) : V3(1, 0, 0);
          take(dirL.transformDirection(holds.bouquet.matrixWorld).multiplyScalar(lim - rr), lim - rr);
        }
      }
    }
    if (!o.inPouch && o.pouch !== false) {
      const q = holds.pouch.worldToLocal(p.clone());
      const e = o.pouchMargin ?? 0.008;
      const dx = POUCH.L / 2 + e - Math.abs(q.x), dz = POUCH.T / 2 + e - Math.abs(q.z), dyU = 0.014 - q.y, dyD = q.y + POUCH.H + e;
      if (dx > 0 && dz > 0 && dyU > 0 && dyD > 0) {
        const mn = Math.min(dx, dz, dyU);
        const v = mn === dyU ? V3(0, dyU, 0) : mn === dx ? V3(Math.sign(q.x) * dx, 0, 0) : V3(0, 0, Math.sign(q.z) * dz);
        take(v.transformDirection(holds.pouch.matrixWorld).multiplyScalar(mn), mn);
      }
    }
    if (o.hat !== false && hatPush(p, o.hatMargin ?? 0.01, _pb) > 0) take(_pb.clone(), _pb.length());
    return best;
  }
  // a hand in the pouch: whatever of it is below the rim and within the pouch's outline stays in the cavity
  const _pi = new THREE.Matrix4(), _pp = new THREE.Vector3(), _pl = new THREE.Vector3(), _rq = new THREE.Quaternion();
  function pouchInPush(p, out) {
    _pi.copy(root.matrixWorld).multiply(pouchFrame.matrix).invert();
    const q = _pl.copy(p).applyMatrix4(_pi);
    out.set(0, 0, 0);
    const m = 0.0075, { L, H: PH, T, w } = POUCH;
    if (q.y > 0.004 || q.y < -PH - m || Math.abs(q.x) > L / 2 + m || Math.abs(q.z) > T / 2 + m) return 0;
    const lx = L / 2 - w - m, lz = T / 2 - w - m, by = -PH + w + m;
    if (Math.abs(q.x) > lx) out.x = (lx - Math.abs(q.x)) * Math.sign(q.x);
    if (Math.abs(q.z) > lz) out.z = (lz - Math.abs(q.z)) * Math.sign(q.z);
    if (q.y < by) out.y = by - q.y;
    const d = out.length();
    if (d === 0) return 0;
    out.applyQuaternion(pouchFrame.quaternion).applyQuaternion(root.getWorldQuaternion(_rq));
    return d;
  }
  function handPtsW(side) {
    const pts = [];
    const hp = B[`hand_${side}`].getWorldPosition(V3());
    pts.push(hp.clone().lerp(B[`middle_01_${side}`].getWorldPosition(V3()), 0.5), hp);
    for (const fn of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
      const j1 = B[`${fn}_01_${side}`].getWorldPosition(V3());
      const j2 = B[`${fn}_02_${side}`].getWorldPosition(V3()), j3 = B[`${fn}_03_${side}`].getWorldPosition(V3());
      pts.push(j1, j2, j3, j3.clone().add(j3.clone().sub(j2).multiplyScalar(0.85)), j1.clone().lerp(j2, 0.5), j2.clone().lerp(j3, 0.5));
    }
    return pts;
  }
  function armPtsW(side) {
    const U = B[`upperarm_${side}`].getWorldPosition(V3()), E = B[`lowerarm_${side}`].getWorldPosition(V3()), H = B[`hand_${side}`].getWorldPosition(V3());
    const pts = [];
    for (let k = 1; k <= 4; k++) pts.push([U.clone().lerp(E, 0.2 + 0.8 * k / 4), 0.05]);
    for (let k = 0; k <= 4; k++) pts.push([E.clone().lerp(H, 0.85 * k / 4), 0.042]);
    return pts;
  }
  // a fist on the bouquet: each finger (and the thumb) curls as far as it can without entering the paper
  const THUMB_BACK = [-0.12, -0.3, -0.4];
  function wrapFingers(side, presetName) {
    const F = FINGERS[presetName];
    const inv = holds.bouquet.matrixWorld.clone().invert();
    const Hb = B[`hand_${side}`];
    const out = { oppose: F.oppose };
    for (const f of ['index', 'middle', 'ring', 'pinky', 'thumb']) out[f] = F[f].slice();
    const clear = (f) => {
      for (const k of [1, 2, 3]) {
        const b = B[`${f}_0${k}_${side}`];
        b.updateWorldMatrix(false, false);
        const j = b.getWorldPosition(V3());
        const prev = k === 1 ? Hb.getWorldPosition(V3()).lerp(B[`${f}_01_${side}`].getWorldPosition(V3()), 0.7) : B[`${f}_0${k - 1}_${side}`].getWorldPosition(V3());
        const pts = [j, j.clone().lerp(prev, 0.5)];
        if (k === 3) { const j2 = B[`${f}_02_${side}`].getWorldPosition(V3()); pts.push(j.clone().add(j.clone().sub(j2).multiplyScalar(0.85)), j.clone().add(j.clone().sub(j2).multiplyScalar(0.42))); }
        for (const pp of pts) {
          const q = pp.applyMatrix4(inv);
          if (q.y < BQ.stemEnd - 0.01 || q.y > BQ.coneY1 + 0.06) continue;
          if (Math.hypot(q.x, q.z) < bqRadius(q.y) + 0.0065) return false;
        }
      }
      return true;
    };
    const sink = (f) => {
      let worst = 0;
      for (const k of [1, 2, 3]) {
        const b = B[`${f}_0${k}_${side}`];
        const j = b.getWorldPosition(V3());
        const prev = k === 1 ? Hb.getWorldPosition(V3()).lerp(B[`${f}_01_${side}`].getWorldPosition(V3()), 0.7) : B[`${f}_0${k - 1}_${side}`].getWorldPosition(V3());
        const pts = [j, j.clone().lerp(prev, 0.5)];
        if (k === 3) { const j2 = B[`${f}_02_${side}`].getWorldPosition(V3()); pts.push(j.clone().add(j.clone().sub(j2).multiplyScalar(0.85)), j.clone().add(j.clone().sub(j2).multiplyScalar(0.42))); }
        for (const pp of pts) {
          const q = pp.applyMatrix4(inv);
          if (q.y < BQ.stemEnd - 0.01 || q.y > BQ.coneY1 + 0.06) continue;
          worst = Math.max(worst, bqRadius(q.y) + 0.0065 - Math.hypot(q.x, q.z));
        }
      }
      return worst;
    };
    for (const f of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
      const opps = f === 'thumb' ? [F.oppose, F.oppose * 0.6, F.oppose * 0.25, -0.2] : [F.oppose];
      for (const op of opps) {
        out.oppose = op;
        let lo = 0.0, hi = 1.0, best = -1;
        for (let it = 0; it < 6; it++) {
          const m = it === 0 ? 0.0 : (lo + hi) / 2;
          out[f] = F[f].map((x) => x * m);
          curl(side, out);
          Hb.updateWorldMatrix(true, true);
          if (clear(f)) { best = m; lo = m; if (it === 0) hi = 1.0; } else { hi = m; if (it === 0) break; }
        }
        if (best >= 0) { out[f] = F[f].map((x) => x * best); break; }
        out[f] = F[f].map(() => 0);
      }
      // a finger that no curl between straight and the preset clears (the thumb laid along the paper): scan both ways (more bent, bent back)
      // and keep the pose that sinks least
      curl(side, out);
      Hb.updateWorldMatrix(true, true);
      if (!clear(f)) {
        let bestD = Infinity, bestO = null;
        const keepOp = out.oppose;
        for (const op of f === 'thumb' ? [F.oppose, F.oppose * 0.5, 0, -0.3, -0.6] : [keepOp]) {
          out.oppose = op;
          for (const e of [1.0, 1.25, 1.5, 1.8, 0.75, 0.5, 0.25, 0, -0.25, -0.5]) {
            if (f !== 'thumb' && e < 0) continue;
            out[f] = e >= 0 ? F[f].map((x) => x * e) : THUMB_BACK.map((x) => x * -e * 2);
            curl(side, out);
            Hb.updateWorldMatrix(true, true);
            const d = sink(f);
            if (d < bestD - 1e-5) { bestD = d; bestO = { op, th: out[f].slice() }; }
            if (d === 0) break;
          }
          if (bestD === 0) break;
        }
        out.oppose = bestO.op; out[f] = bestO.th;
        curl(side, out);
        Hb.updateWorldMatrix(true, true);
      }
    }
    curl(side, out);
    Hb.updateWorldMatrix(true, true);
    return out;
  }
  // solve one arm with its keep-out; fingers are set by `fingers()` before each measure
  function solveArmKO(side, targetW, fwdW, palmW, poleW, mode, fingers, o) {
    const T = targetW.clone(), pole = poleW.clone();
    const push = V3();
    for (let it = 0; it < 5; it++) {
      solveArm(side, T, fwdW, palmW, pole, mode, o.wk ?? WRIST_K);
      fingers();
      root.updateMatrixWorld(true);
      if (o.fixed) break;
      let worst = 0;
      const acc = V3();
      for (const p of handPtsW(side)) {
        let d;
        if (o.inPouch) {
          const dh = hatPush(p, 0.01, push) > 0 ? push.length() : 0;
          const dp = pouchInPush(p, _pp);
          if (dp > dh) { push.copy(_pp); d = dp; } else d = dh;
        } else d = keepOut(p, o, push);
        if (d > worst) { worst = d; acc.copy(push); }
      }
      if (worst < 0.0005) break;
      T.addScaledVector(acc, 1.15);
    }
    // the elbow: away from the hat and the body (the wrist's say gives way step by step)
    let wk = o.wk ?? WRIST_K;
    for (let it = 0; it < 6; it++) {
      let worst = 0;
      const acc = V3();
      for (const [p, rad] of armPtsW(side)) {
        const d = keepOut(p, { ...o, margin: rad * (rad > 0.045 ? 0.9 : 0.55), hatMargin: rad, bouquet: o.bouquetArm ?? false, pouchMargin: rad * 0.7, inPouch: false }, push);
        if (d > worst) { worst = d; acc.copy(push); }
      }
      if (worst < 0.0005) break;
      pole.addScaledVector(acc.normalize(), 1.2);
      pole.y = Math.min(pole.y, 0.15 + 0.2 * Math.max(0, poleW.y));
      pole.normalize();
      wk = Math.max(0, wk - 0.2);
      solveArm(side, T, fwdW, palmW, pole, mode, wk);
      fingers();
      root.updateMatrixWorld(true);
    }
    return { T, pole, wk };
  }
  // A fist round a stick may turn about the stick, and fingers pinching the raffia may point any way across the palm's normal:
  // turn the hand about that axis until it lines up with the forearm (a few rounds, the elbow follows the hand each time).
  const _re = new THREE.Vector3(), _rw = new THREE.Vector3();
  function relaxRoll(side, g) {
    if (!g.roll) return g;
    const ax = g.roll.ax.clone().normalize();
    const Lb = B[`lowerarm_${side}`], Hb = B[`hand_${side}`];
    for (let it = 0; it < 3; it++) {
      solveArm(side, C2W(g.p), D2W(g.fwd), D2W(g.palm), D2W(g.pole), g.mode, g.wk);
      root.worldToLocal(Lb.getWorldPosition(_re));
      root.worldToLocal(Hb.getWorldPosition(_rw));
      const f = _rw.clone().sub(_re).normalize();
      if (g.roll.kind === 'free') {
        // fingers along the forearm; the palm toward the cut ends, or toward the stems when the forearm lies along them
        const pa = g.roll.palm0.clone().addScaledVector(f, -g.roll.palm0.dot(f));
        const pb = g.roll.rad0.clone().addScaledVector(f, -g.roll.rad0.dot(f));
        // but the fingers never point away from the stems (the hand would cross them): at least a little inward
        const inward = f.dot(g.roll.rad0);
        if (inward < 0.3) f.addScaledVector(g.roll.rad0, 0.3 - inward).normalize();
        g.fwd = f;
        g.palm = pa.addScaledVector(pb, 0.6).normalize();
        continue;
      }
      f.addScaledVector(ax, -f.dot(ax));
      if (f.lengthSq() < 1e-6) break;
      f.normalize();
      if (g.roll.kind === 'palm') g.fwd = f;
      else {
        g.palm = side === 'l' ? new THREE.Vector3().crossVectors(ax, f).normalize() : new THREE.Vector3().crossVectors(f, ax).normalize();
        g.fwd = side === 'l' ? new THREE.Vector3().crossVectors(g.palm, ax).normalize() : new THREE.Vector3().crossVectors(ax, g.palm).normalize();
      }
    }
    return g;
  }
  // a hand that holds nothing turns toward its forearm when the wrist would bend past WRIST_LIM
  const WRIST_LIM = 65 * Math.PI / 180;
  const _inv = new THREE.Matrix4();
  function wristLimit(side, g) {
    solveArm(side, C2W(g.p), D2W(g.fwd), D2W(g.palm), D2W(g.pole), g.mode, g.wk);
    _inv.copy(root.matrixWorld).invert();
    const e = B[`lowerarm_${side}`].getWorldPosition(V3()).applyMatrix4(_inv);
    const w = B[`hand_${side}`].getWorldPosition(V3()).applyMatrix4(_inv);
    const fore = w.sub(e).normalize();
    const hy = V3(0, 1, 0).applyQuaternion(B[`hand_${side}`].getWorldQuaternion(new THREE.Quaternion())).transformDirection(_inv);
    const ang = Math.acos(THREE.MathUtils.clamp(hy.dot(fore), -1, 1));
    if (ang <= WRIST_LIM) return g;
    const axis = new THREE.Vector3().crossVectors(hy, fore);
    if (axis.lengthSq() < 1e-8) return g;
    const q = new THREE.Quaternion().setFromAxisAngle(axis.normalize(), ang - WRIST_LIM);
    g.fwd = g.fwd.clone().applyQuaternion(q);
    g.palm = g.palm.clone().applyQuaternion(q);
    return g;
  }
  const DEBUG_SOLVE = typeof location !== 'undefined' && /[?&]dbgsolve/.test(location.search);
  const solved = new Map();          // frame -> the resolved goals of both arms
  const amtOf = (side, pr) => (pr === 'grip' ? hand[side].gripAmt ?? 1 : pr === 'bqgrip' ? hand[side].gripAmt ?? 1 : 1);
  function pose(frame, { torsoOnly = false } = {}) {
    const f = ((frame % (LOOP * FPS)) + LOOP * FPS) % (LOOP * FPS);
    let i = 0;
    while (i < keys.length - 2 && keys[i + 1].f <= f) i++;
    const a = keys[i], b = keys[i + 1];
    const u0 = (f - a.f) / (b.f - a.f);
    const u = (EASE[b.ease] ?? EASE.inout)(u0);
    const drift = b.ease === 'hold' ? Math.sin(u0 * Math.PI) : 0;
    resetPose();
    const sp = lerpA(a.spine, b.spine, u);
    rotateBone('spine_01', sp.map((x) => x * 0.15));
    rotateBone('spine_02', sp.map((x) => x * 0.4));
    rotateBone('spine_03', sp.map((x, k) => x * 0.45 + (k === 0 ? drift * 0.006 : 0)));
    rotateBone('clavicle_r', lerpA(a.clavR, b.clavR, u));
    rotateBone('clavicle_l', lerpA(a.clavL, b.clavL, u));
    rotateBone('neck_01', lerpA(a.neck, b.neck, u));
    rotateBone('head', lerpA(a.head, b.head, u));
    root.updateMatrixWorld(true);
    sample.frame = f;
    if (torsoOnly) return;
    // the bouquet
    bouquetPose(a.bq, bqA); bouquetPose(b.bq, bqB);
    const bq = { p: bqA.p.clone().lerp(bqB.p, u), q: bqA.q.clone().slerp(bqB.q, u) };
    const travel = bqA.p.distanceTo(bqB.p);
    bq.p.y += Math.sin(u * Math.PI) * travel * 0.25;
    holds.bouquet.position.copy(bq.p);
    holds.bouquet.quaternion.copy(bq.q);
    holds.bouquet.updateMatrixWorld(true);
    const memo = solved.get(f);
    const res = {};
    for (const side of ['l', 'r']) {
      const ka = a[side], kb = b[side];
      let ga = goalOf(side, ka, bq), gb = goalOf(side, kb, bq);
      if (!memo) { ga = relaxRoll(side, ga); gb = relaxRoll(side, gb); }
      let G;
      if (ga.th !== undefined && gb.th !== undefined) {
        // round the stems: travel on the circle, not across it
        const th = ga.th + (gb.th - ga.th) * u;
        const near = (ka.near ?? WR) + ((kb.near ?? WR) - (ka.near ?? WR)) * u;
        G = memo ? goalOf(side, { wrap: th, near }, bq) : relaxRoll(side, goalOf(side, { wrap: th, near }, bq));
      } else {
        G = { wk: ga.wk + (gb.wk - ga.wk) * u, p: ga.p.clone().lerp(gb.p, u), fwd: ga.fwd.clone().lerp(gb.fwd, u).normalize(), palm: ga.palm.clone().lerp(gb.palm, u).normalize(), pole: ga.pole.clone().lerp(gb.pole, u).normalize(), mode: u < 0.5 ? ga.mode : gb.mode };
        const sx = side === 'l' ? 1 : -1;
        if (kb.arc) G.p.add(V3(kb.arc[0] * sx, kb.arc[1], kb.arc[2]).multiplyScalar(Math.sin(u * Math.PI)));
        if (!ga.inPouch && !gb.inPouch && !gb.toPouch && !ga.note && !gb.note && !(ga.onBq && gb.onBq)) {
          const tr = ga.p.distanceTo(gb.p);
          // moving hands travel on arcs: out to her side and up
          G.p.add(V3(0.6 * sx, 0.8, 0).normalize().multiplyScalar(Math.sin(u * Math.PI) * tr * 0.22));
        }
      }
      const fa = side === 'l' ? a.fl : a.fr, fb = side === 'l' ? b.fl : b.fr;
      const closing = gb.onBq && !ga.onBq;
      const fingers = () => {
        if (fa === fb) curl(side, fa, amtOf(side, fa));
        else if (closing) curl(side, u < 0.75 ? mixF(fa, 'open', sm(0.0, 0.4, u)) : mixF('open', fb, sm(0.75, 1.0, u)));
        else curl(side, mixF(fa, fb, sm(0.25, 0.75, u)));
      };
      const holding = (u < 0.5 ? ga.onBq : gb.onBq);
      if (!memo && !holding && !G.roll && !(ga.note && gb.note)) G = wristLimit(side, G);
      const inPouch = !!(ga.inPouch || gb.inPouch);
      const fixed = !!((holding && !(closing && u < 0.95)) || (ga.note && gb.note) || (gb.note && u > 0.8) || (ga.note && u < 0.2));
      const grasp = holding && (!closing || u > 0.95);
      if (memo) { const m = memo[side]; solveArm(side, m.T, m.fwd, m.palm, m.P, m.mode, m.wk); if (m.F) curl(side, m.F); else fingers(); }
      else {
        const r = solveArmKO(side, C2W(G.p), D2W(G.fwd), D2W(G.palm), D2W(G.pole), G.mode, fingers,
          { bouquet: !holding, inPouch, fixed, bqMargin: 0.006, bouquetArm: !holding, wk: G.wk ?? WRIST_K });
        res[side] = { T: r.T, P: r.pole, fwd: D2W(G.fwd), palm: D2W(G.palm), mode: G.mode, wk: r.wk };
        if (grasp) res[side].F = wrapFingers(side, fb);
        if (side === 'r') sample.dbg = { Gp: G.p.toArray().map((v) => +v.toFixed(3)), T: root.worldToLocal(r.T.clone()).toArray().map((v) => +v.toFixed(3)), mode: G.mode };
        if (DEBUG_SOLVE) {
          const e = root.worldToLocal(B[`lowerarm_${side}`].getWorldPosition(V3())), w = root.worldToLocal(B[`hand_${side}`].getWorldPosition(V3()));
          const hy = V3(0, 1, 0).applyQuaternion(B[`hand_${side}`].getWorldQuaternion(new THREE.Quaternion())).transformDirection(root.matrixWorld.clone().invert());
          (sample.dbgs ??= {})[`${f}${side}`] = { fore: w.clone().sub(e).normalize().toArray().map((v) => +v.toFixed(2)), hy: hy.toArray().map((v) => +v.toFixed(2)), fwd: G.fwd.toArray().map((v) => +v.toFixed(2)), palm: G.palm.toArray().map((v) => +v.toFixed(2)), roll: G.roll ? G.roll.kind : '-', wk: r.wk, e: e.toArray().map((v) => +v.toFixed(3)) };
        }
      }
    }
    if (!memo) solved.set(f, res);
    root.updateMatrixWorld(true);
    sample.tuck = u < 0.5 ? !!a.tuck : !!b.tuck;
    sample.wrapping = !sample.tuck;
    sample.drop = !!(a.drop || (b.drop && u > 0.5));
    surfaceDirty = true;
  }

  await buildKeepOut();
  await tick();
  placePouch();
  await tick();
  solved.clear();

  // the note: in the customer's fingers until she lets go, then in the seller's, then into the pouch
  const noteRel = new THREE.Matrix4();
  let noteRelSet = false;
  // out of her hands, both notes wait deep inside her money pouch: hidden, and with nothing of them ever in sight (the world's
  // check 25 draws a hidden thing where it waits, to catch things that pop in and out)
  const STOW = V3(0, -POUCH.H * 0.55, 0);
  function stowOne(n, k) {
    pouchFrame.updateMatrix();
    n.position.copy(STOW).applyMatrix4(pouchFrame.matrix);
    n.quaternion.copy(pouchFrame.quaternion);
    n.scale.setScalar(k);
    n.updateMatrixWorld(true);
  }
  function stowNotes() {
    stowOne(holds.note, 0.45);
    stowOne(holds.noteFolded, 0.9);
  }
  function placeNote() {
    const f = sample.frame;
    const inHand = f >= HANDOFF && f < 130;
    holds.note.visible = inHand && !!noteFar.local;
    holds.noteFolded.visible = false;
    if (!holds.note.visible) { stowNotes(); return; }
    const hb = B[`hand_${NOTE_SIDE}`];
    hb.updateWorldMatrix(true, false);
    if (!noteRelSet) {
      // at the hand-off the note is exactly where the customer left it; from then on it rides her fingers
      const save = sample.frame;
      pose(HANDOFF);
      hb.updateWorldMatrix(true, false);
      const Mw = root.matrixWorld.clone().multiply(noteFar.local);
      noteRel.copy(hb.matrixWorld).invert().multiply(Mw);
      noteRelSet = true;
      pose(save);
      hb.updateWorldMatrix(true, false);
    }
    const Mw = hb.matrixWorld.clone().multiply(noteRel);
    const L = root.matrixWorld.clone().invert().multiply(Mw);
    const folded = f >= HANDOFF + 4;
    const n = folded ? holds.noteFolded : holds.note;
    holds.note.visible = !folded;
    holds.noteFolded.visible = folded;
    stowOne(folded ? holds.note : holds.noteFolded, folded ? 0.45 : 0.9);
    L.decompose(n.position, n.quaternion, n.scale);
    if (folded) {
      // the folded note: its open top held between thumb and index; turned upright along the pouch as the hand comes down to it
      const pinch = root.worldToLocal(pinchOf(NOTE_SIDE));
      const w = sm(120, 125, f);
      n.quaternion.slerp(pouchFrame.quaternion, w);
      n.scale.set(1, 1, 1);
      n.position.copy(pinch).sub(NOTE_ANCHOR.clone().applyQuaternion(n.quaternion));
    }
    n.updateMatrixWorld(true);
  }
  const NOTE_ANCHOR = V3(0.0375, -0.005, 0);
  function pinchOf(side) {
    const tip = (f) => { const a = B[`${f}_03_${side}`].getWorldPosition(V3()), b = B[`${f}_02_${side}`].getWorldPosition(V3()); return a.add(a.clone().sub(b).multiplyScalar(0.7)); };
    return tip('index').add(tip('thumb')).multiplyScalar(0.5);
  }
  function giverNoteHidden(t) {
    // the customer's note is hers until the hand-off drawing
    if (!giver || !giver.holds || !giver.holds.note) return;
    const f = Math.floor((t * FPS) / STEP) * STEP;
    if (f >= HANDOFF && giver.holds.note.visible) giver.holds.note.visible = false;
  }

  // the raffia: a flat strip from the tie to her pinch while she winds; afterwards a short tail tucked along the stems
  function updateString() {
    const pos = strGeo.attributes.position.array, nor = strGeo.attributes.normal.array;
    const bqM = holds.bouquet.matrix;
    const dirC = V3(0, 1, 0).applyQuaternion(holds.bouquet.quaternion);
    const pts = [];
    if (!sample.tuck) {
      const tipOf = (f) => { const a = B[`${f}_03_r`].getWorldPosition(V3()), b = B[`${f}_02_r`].getWorldPosition(V3()); return a.add(a.clone().sub(b).multiplyScalar(0.7)); };
      const pinchW = tipOf('index').add(tipOf('thumb')).multiplyScalar(0.5);
      const pinch = root.worldToLocal(pinchW);
      const tie = V3(0, BQ.tieY + 0.012, 0).applyMatrix4(bqM);
      // it leaves the bundle on the side facing her fingers
      const toP = pinch.clone().sub(tie);
      const rad = toP.clone().addScaledVector(dirC, -toP.dot(dirC)).normalize();
      const start = tie.clone().addScaledVector(rad, BQ.tieR + 0.004);
      for (let i = 0; i < NS; i++) {
        const t = i / (NS - 1);
        const p = start.clone().lerp(pinch, t);
        p.y -= Math.sin(t * Math.PI) * 0.004;
        pts.push(p);
      }
    } else {
      for (let i = 0; i < NS; i++) {
        const t = i / (NS - 1);
        const p = V3(BQ.tieR + 0.004, BQ.tieY - 0.014 - 0.035 * t, 0.002 * Math.sin(t * 5)).applyMatrix4(bqM);
        pts.push(p);
      }
    }
    for (let i = 0; i < NS; i++) {
      const p = pts[i];
      const tg = pts[Math.min(NS - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
      const w = new THREE.Vector3().crossVectors(tg, dirC).normalize();
      if (w.lengthSq() < 0.5) w.set(1, 0, 0);
      const nrm = new THREE.Vector3().crossVectors(w, tg).normalize();
      for (let k = 0; k < 4; k++) {
        const s = [[1, 1], [-1, 1], [-1, -1], [1, -1]][k];
        const o = (i * 4 + k) * 3;
        pos[o] = p.x + w.x * s[0] * 0.0022 + nrm.x * s[1] * 0.0006;
        pos[o + 1] = p.y + w.y * s[0] * 0.0022 + nrm.y * s[1] * 0.0006;
        pos[o + 2] = p.z + w.z * s[0] * 0.0022 + nrm.z * s[1] * 0.0006;
        nor[o] = nrm.x * s[1]; nor[o + 1] = nrm.y * s[1]; nor[o + 2] = nrm.z * s[1];
      }
    }
    strGeo.attributes.position.needsUpdate = true;
    strGeo.attributes.normal.needsUpdate = true;
    strGeo.computeBoundingSphere();
    holds.stringPts = pts;
  }

  await PH.mark('folds');
  // ---------------------------------------------------------------- acting lines on the cardigan and the scarf
  const folds = [];
  const cp = card.geometry.attributes.position;
  const cY = (i) => cp.getY(i) + SOLE;
  // (the vertices a test lets through are listed once per test)
  const okLists = new WeakMap();
  function nearest(mesh, p, ok) {
    const pos = mesh.geometry.attributes.position;
    let list = okLists.get(ok);
    if (!list) { list = []; for (let i = 0; i < pos.count; i++) if (ok(i)) list.push(i); okLists.set(ok, list); }
    let best = -1, bd = 1e9;
    for (const i of list) {
      const d = (pos.getX(i) - p.x) ** 2 + (pos.getY(i) + SOLE - p.y) ** 2 + (pos.getZ(i) - p.z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function addFold(mesh, idx, width, weight) {
    const clean = idx.filter((v, k) => v >= 0 && v !== idx[k - 1]);
    if (clean.length < 2) return;
    folds.push({ mesh, idx: clean, width, weight });
  }
  const M = { bend: { l: 0, r: 0 }, raise: { l: 0, r: 0 }, reach: { l: 0, r: 0 }, fwd: 0, twist: 0 };
  const wp = (n) => B[n].getWorldPosition(new THREE.Vector3());
  function measure() {
    const up = V3(0, 1, 0).applyQuaternion(root.getWorldQuaternion(rootQ));
    const fw = V3(0, 0, 1).applyQuaternion(rootQ);
    const neck = wp('neck_01'), pel = wp('pelvis');
    const down = pel.clone().sub(neck).normalize();
    for (const s of ['l', 'r']) {
      const U = wp(`upperarm_${s}`), L = wp(`lowerarm_${s}`), H = wp(`hand_${s}`);
      const uu = L.clone().sub(U).normalize(), ll = H.clone().sub(L).normalize();
      M.bend[s] = Math.acos(THREE.MathUtils.clamp(uu.dot(ll), -1, 1));
      M.raise[s] = Math.acos(THREE.MathUtils.clamp(uu.dot(down), -1, 1));
      M.reach[s] = Math.max(0, uu.dot(fw));
    }
    M.fwd = Math.acos(THREE.MathUtils.clamp(-down.dot(up), -1, 1));
  }
  const armOk = (s) => (i) => { const k = segKeyOf(card, i); return k === `upper_${s}` || k === `lower_${s}`; };
  for (const s of ['l', 'r']) {
    await tick();
    const aOk = armOk(s);
    const U = P(`upperarm_${s}`), E = P(`lowerarm_${s}`), Hd = P(`hand_${s}`);
    const u0 = E.clone().sub(U).normalize(), l0 = Hd.clone().sub(E).normalize();
    let inner = l0.clone().addScaledVector(u0, -l0.dot(u0));
    if (inner.lengthSq() < 1e-4) inner = V3(0, 0, 1).addScaledVector(u0, -u0.z);
    inner.normalize();
    const side = new THREE.Vector3().crossVectors(u0, inner).normalize();
    [[-0.02, 0.9, 1.0], [0.0, 1.2, 1.3], [0.024, 0.8, 0.9]].forEach(([off, span, wmul], k) => {
      const idx = [];
      for (let q = 0; q <= 6; q++) {
        const t = -span / 2 + (span * q) / 6;
        const pt = E.clone().addScaledVector(u0, off + 0.008 * t + 0.004 * k).addScaledVector(inner, Math.cos(t) * 0.075).addScaledVector(side, Math.sin(t) * 0.075);
        idx.push(nearest(card, pt, aOk));
      }
      addFold(card, idx, 2.6 * wmul, () => sm(0.5, 1.4, M.bend[s]));
    });
    // the sleeve bunches at the cuff
    [0.03, 0.06].forEach((dd, k) => {
      const idx = [];
      const c = Hd.clone().addScaledVector(l0, -0.06 - dd);
      for (let q = 0; q <= 5; q++) {
        const t = -1.2 + (2.4 * q) / 5;
        idx.push(nearest(card, c.clone().addScaledVector(inner, Math.cos(t) * 0.05).addScaledVector(side, Math.sin(t) * 0.05), aOk));
      }
      addFold(card, idx, 1.8 - 0.3 * k, () => 0.8);
    });
    // reaching: the back of the cardigan pulls from the shoulder blade across
    const backOk = (i) => segKeyOf(card, i) === 'torso' && cp.getZ(i) < P('spine_02').z - 0.02;
    addFold(card, [[0.09, -0.06], [0.06, -0.12], [0.03, -0.18], [0.0, -0.24]].map(([x, y]) => nearest(card, V3((s === 'l' ? 1 : -1) * x, U.y + y, P('spine_02').z - 0.12), backOk)),
      2.4, () => sm(1.0, 1.8, M.raise[s]) * sm(0.3, 0.7, M.reach[s]));
  }
  await tick();
  // bending over: soft folds across the stomach
  {
    const frontOk = (i) => segKeyOf(card, i) === 'torso' && cp.getZ(i) > P('spine_02').z + 0.04 && cY(i) < P('spine_02').y + 0.02;
    [[0.0, 2.6], [-0.035, 2.2], [0.03, 1.8]].forEach(([dy, w], k) => {
      const idx = [];
      for (let q = 0; q <= 6; q++) {
        const x = -0.1 + (0.2 * q) / 6;
        idx.push(nearest(card, V3(x, P('spine_01').y + 0.05 + dy + 0.01 * Math.sin(q + k), P('spine_01').z + 0.25), frontOk));
      }
      addFold(card, idx, w, () => sm(0.2, 0.45, M.fwd) * 0.9 + 0.2);
    });
  }
  await tick();
  // trousers: folds over the knees and down the hanging legs (they never move)
  {
    const pants = meshes.Pants;
    const pp = pants.geometry.attributes.position;
    for (const s of ['l', 'r']) {
      const kn = P(`calf_${s}`), an = P(`foot_${s}`);
      const sx = s === 'l' ? 1 : -1;
      const lowOk = (i) => pp.getY(i) + SOLE < kn.y - 0.06;
      for (const [ox, w] of [[0.05, 2.2], [-0.04, 1.8]]) {
        const idx = [];
        for (let q = 0; q <= 5; q++) {
          const y = kn.y - 0.08 - (kn.y - 0.16) * (q / 5);
          idx.push(nearest(pants, V3(kn.x + sx * ox + 0.01 * q, y, kn.z + 0.1 + 0.02 * (q / 5)), lowOk));
        }
        addFold(pants, idx, w, () => 0.85);
      }
      const kneeOk = (i) => pp.getY(i) + SOLE > kn.y - 0.04;
      const idx = [];
      for (let q = 0; q <= 5; q++) {
        const t = q / 5;
        idx.push(nearest(pants, kn.clone().add(V3(sx * (-0.05 + 0.1 * t), 0.06 + 0.02 * Math.sin(t * 3), -0.04 - 0.02 * t)), kneeOk));
      }
      addFold(pants, idx, 2.0, () => 0.8);
    }
  }
  await tick();
  // the wrap: two slanted folds across the head
  {
    const sc = meshes.Scarf;
    const spp = sc.geometry.attributes.position;
    const headOk = (i) => _v.fromBufferAttribute(spp, i).add(V3(0, SOLE, 0)).distanceTo(headC) < 0.15;
    const toW = (x, y, z) => headC.clone().add(V3(x, y, z));
    for (const [y0, w] of [[0.02, 2.2], [-0.03, 1.8]]) {
      const idx = [];
      for (let q = 0; q <= 7; q++) {
        const a = -2.2 + (4.4 * q) / 7;
        idx.push(nearest(sc, toW(Math.sin(a) * 0.12, y0 + 0.03 * Math.cos(a) - 0.02 * Math.sin(a), Math.cos(a) * -0.12), headOk));
      }
      addFold(sc, idx, w, () => 0.9);
    }
  }
  // the lines' geometry: two vertices per point, each a copy of its cloth vertex (bones, cloth node, material), the line's direction
  // as its normal; the card moves them, the widths change once per drawing
  console.assert(folds.length <= NFOLD, 'too many fold lines');
  const foldMat = foldMaterial(table);
  const foldMesh = (() => {
    let nP = 0;
    for (const f of folds) nP += f.idx.length;
    const nV = nP * 2;
    const pos = new Float32Array(nV * 3), nrm = new Float32Array(nV * 3), info = new Float32Array(nV * 3);
    const si = new Uint16Array(nV * 4), sw = new Float32Array(nV * 4), ac = new Float32Array(nV * 4), aw = new Float32Array(nV), mat = new Float32Array(nV);
    const index = [];
    let v = 0;
    folds.forEach((f, fi) => {
      const g = f.mesh.geometry;
      const Pp = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, AC = g.attributes.aCloth, AW = g.attributes.aClothW, AM = g.attributes.aMat;
      const n = f.idx.length;
      for (let k = 0; k < n; k++) {
        const i = f.idx[k], ia = f.idx[Math.max(0, k - 1)], ib = f.idx[Math.min(n - 1, k + 1)];
        const dx = Pp.getX(ib) - Pp.getX(ia), dy = Pp.getY(ib) - Pp.getY(ia), dz = Pp.getZ(ib) - Pp.getZ(ia);
        const dl = Math.hypot(dx, dy, dz) || 1;
        if (k < n - 1) index.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
        for (const sd of [-1, 1]) {
          pos[v * 3] = Pp.getX(i); pos[v * 3 + 1] = Pp.getY(i); pos[v * 3 + 2] = Pp.getZ(i);
          nrm[v * 3] = dx / dl; nrm[v * 3 + 1] = dy / dl; nrm[v * 3 + 2] = dz / dl;
          info[v * 3] = sd; info[v * 3 + 1] = k / (n - 1); info[v * 3 + 2] = fi;
          for (let q = 0; q < 4; q++) { si[v * 4 + q] = SI.getComponent(i, q); sw[v * 4 + q] = SW.getComponent(i, q); ac[v * 4 + q] = AC.array[i * 4 + q]; }
          aw[v] = AW.array[i];
          mat[v] = AM.array[i];
          v++;
        }
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setAttribute('aInfo', new THREE.BufferAttribute(info, 3));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    g.setAttribute('aCloth', new THREE.BufferAttribute(ac, 4));
    g.setAttribute('aClothW', new THREE.BufferAttribute(aw, 1));
    g.setAttribute('aShrink', new THREE.BufferAttribute(new Float32Array(nV), 1));
    g.setAttribute('aPushW', new THREE.BufferAttribute(new Float32Array(nV), 1));
    g.setAttribute('aMat', new THREE.BufferAttribute(mat, 1));
    g.setIndex(index);
    const m = new THREE.SkinnedMesh(g, foldMat);
    m.bind(first.skeleton, first.bindMatrix);
    m.position.copy(outfit.position); m.quaternion.copy(outfit.quaternion); m.scale.copy(outfit.scale);
    m.frustumCulled = false;
    m.renderOrder = 3;
    m.castShadow = false;
    m.userData.castShadow = false;
    first.parent.add(m);
    return m;
  })();
  function updateFolds() {
    const Wf = foldMat.uniforms.uFoldW.value;
    folds.forEach((f, fi) => { Wf[fi] = f.width * THREE.MathUtils.clamp(f.weight(), 0, 1.3); });
  }

  await PH.mark('clothframe');
  // ---------------------------------------------------------------- cloth, every frame
  let clothInit = false;
  const _side = new THREE.Vector3(), _rc = new THREE.Vector3();
  function stepCloth(dt, t) {
    const sub = Math.max(1, Math.ceil(dt / (1 / 90)));
    const h = Math.min(dt, 0.05) / sub;
    const side = _side.set(1, 0, 0).transformDirection(root.matrixWorld);
    for (const n of nodes) {
      n.mesh.getVertexPosition(n.vi, n.t);
      n.mesh.localToWorld(n.t);
      if (n.radial) {
        n.radial.bone.getWorldPosition(_rc);
        n.outW.subVectors(n.t, _rc).normalize();
      } else n.outW.copy(n.out).transformDirection(root.matrixWorld);
      if (!clothInit) { n.p.copy(n.t); n.v.set(0, 0, 0); }
    }
    clothInit = true;
    for (let s = 0; s < sub; s++) {
      for (const n of nodes) {
        if (n.stiff > 1e6) { n.p.copy(n.t); n.v.set(0, 0, 0); continue; }
        const k = n.stiff, c = 2 * Math.sqrt(k) * 0.3;
        const tv = n.j / (n.nv - 1);
        const ph = t * 1.6 + n.k * 0.8 + n.j * 0.42 + n.start * 0.3;
        const gust = (0.55 + 0.45 * Math.sin(t * 0.55 + n.start)) * (0.6 * Math.sin(ph) + 0.4 * Math.sin(ph * 2.3 + 1.1));
        _v.subVectors(n.t, n.p).multiplyScalar(k);
        _v.addScaledVector(n.v, -c);
        _v.addScaledVector(n.outW, (0.55 + 0.45 * gust) * 1.1 * tv * n.amp);
        _v.addScaledVector(side, gust * 1.4 * tv * n.amp);
        _v.y += 0.3 * tv * Math.sin(ph * 1.3) * n.amp;
        n.v.addScaledVector(_v, h);
        n.p.addScaledVector(n.v, h);
        _v.subVectors(n.p, n.t);
        const lim = n.lim * tv + 0.002;
        if (_v.length() > lim) { _v.setLength(lim); n.p.copy(n.t).add(_v); }
        // never into the body: the offset may only go outward
        const dn = _v.subVectors(n.p, n.t).dot(n.outW);
        if (dn < 0) { n.p.addScaledVector(n.outW, -dn); const vn = n.v.dot(n.outW); if (vn < 0) n.v.addScaledVector(n.outW, -vn); }
        if (n.radial) {
          // on a curved surface a sideways move sinks in unless it also lifts off by about s^2 / 2R
          _v.subVectors(n.p, n.t);
          const d2 = _v.dot(n.outW), tq = _v.lengthSq() - d2 * d2;
          const need = tq / (2 * n.radial.R) + 0.001;
          if (d2 < need) n.p.addScaledVector(n.outW, need - d2);
        }
      }
    }
    const off = PU.uCloth.value;
    for (const n of nodes) off[n.start + n.j * n.nu + n.k].subVectors(n.p, n.t);
    for (const g of grids) {
      for (let j = 1; j < g.nv; j++) for (let k = 0; k < g.nu; k++) {
        const id = g.start + j * g.nu + k;
        const up = off[id - g.nu];
        const l = k > 0 ? off[id - 1] : off[id], r = k < g.nu - 1 ? off[id + 1] : off[id];
        _v.copy(off[id]).multiplyScalar(0.55).addScaledVector(up, 0.15).addScaledVector(l, 0.15).addScaledVector(r, 0.15);
        off[id].copy(_v);
      }
    }
  }

  const SIM = 1 / 30;
  let simAcc = 0;
  function update(t, dt, noCloth = false, camera = null) {
    const frame = Math.floor(t * FPS / STEP) * STEP;       // on twos
    if (frame !== lastDrawing) {
      pose(frame);
      lastDrawing = frame;
      measure();
      placeNote();
      updateString();
      updateBand();
      updateFolds();
      simAcc = Math.max(simAcc, SIM);        // a new drawing moves the cloth at once
    }
    giverNoteHidden(t);
    simAcc += dt;
    if (simAcc >= SIM) {
      const h = Math.min(simAcc, 0.1);
      simAcc = 0;
      if (noCloth) { for (const n of nodes) PU.uCloth.value[n.start + n.j * n.nu + n.k].set(0, 0, 0); } else stepCloth(h, t);
    }
  }
  // the loop's last 2 seconds before t, at 30 a second: the cloth arrives at t as it would in a live run
  function runTo(t, camera = null) {
    clothInit = false; lastDrawing = -1; simAcc = 0;
    for (let i = 60; i >= 0; i--) update((((t - i / 30) % LOOP) + LOOP) % LOOP, 1 / 30, false, camera);
  }
  // the same, pausing for the page every few steps (chom-world core.slice)
  async function runToSliced(t, camera = null, slice = null) {
    clothInit = false; lastDrawing = -1; simAcc = 0;
    for (let i = 60; i >= 0; i--) {
      update((((t - i / 30) % LOOP) + LOOP) % LOOP, 1 / 30, false, camera);
      if (slice && i % 3 === 0) await slice();
    }
  }
  function poseAt(t) {
    pose(Math.floor((t * FPS) / STEP) * STEP);
    placeNote();
    updateString();
    lastDrawing = -1;
  }

  await PH.mark('face');
  // ---------------------------------------------------------------- face check: how many pixels of face does this camera see?
  const probeRT = new THREE.WebGLRenderTarget(320, 200, { depthBuffer: true });
  const probeBuf = new Uint8Array(320 * 200 * 4);
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  function faceProbe(renderer, sceneIn, camera, w = 320, h = 200) {
    if (probeRT.width !== w || probeRT.height !== h) { probeRT.setSize(w, h); }
    const buf = probeBuf.length === w * h * 4 ? probeBuf : new Uint8Array(w * h * 4);
    const saved = [];
    sceneIn.traverse((o) => {
      if (!o.isMesh && !o.isLine && !o.isPoints) return;
      const u = o.material && o.material.uniforms && o.material.uniforms.uProbe;
      const probing = u && o.material.fragmentShader && o.material.fragmentShader.includes('uProbe > 0.5');
      if (probing) {
        saved.push([o, 'u', u.value]);
        u.value = o === outfit ? 2 : 1;
      } else if (o.isSkinnedMesh || !o.isMesh) {
        if (o.visible) { saved.push([o, 'v', true]); o.visible = false; }
      } else {
        saved.push([o, 'm', o.material]);
        o.material = black;
      }
    });
    const prevRT = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
    const bg = sceneIn.background; sceneIn.background = null;
    renderer.setRenderTarget(probeRT);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    const aspect = camera.aspect;
    renderer.render(sceneIn, camera);
    renderer.readRenderTargetPixels(probeRT, 0, 0, w, h, buf);
    renderer.setRenderTarget(prevRT);
    renderer.setClearColor(prevClear, prevA);
    sceneIn.background = bg;
    for (const [o, kind, val] of saved) {
      if (kind === 'u') o.material.uniforms.uProbe.value = val;
      else if (kind === 'v') o.visible = val;
      else o.material = val;
    }
    let n = 0;
    for (let i = 0; i < w * h; i++) if (buf[i * 4] > 127) n++;
    return n;
  }

  // the face, for the world's face check (core/qa/faces.mjs): points on her face skin with their normals, in world space.
  // (The skin sits well inside the scarf and the hat; the check should find every one of them hidden.)
  // zone: 'features' (eyes, nose, mouth: never a pixel) or 'cheek' (cheeks and jaw)
  const faceIdx = [], faceZoneOf = [];
  {
    const eyeC = lift(meta.eyeCentre), headAx = arr(meta.headAxis).normalize();
    const bm = meshes.Body, bp = bm.geometry.attributes.position, bI = bm.geometry.attributes.skinIndex, bW = bm.geometry.attributes.skinWeight;
    const hi = bm.skeleton.bones.indexOf(B.head);
    const cand = [];
    for (let i = 0; i < bp.count; i++) {
      let w = 0;
      for (let q = 0; q < 4; q++) if (bI.getComponent(i, q) === hi) w += bW.getComponent(i, q);
      if (w < 0.6) continue;
      // where this skin was before it was drawn smaller (the same k as above)
      const k = 1 - 0.4 * sm(0.3, 0.8, w);
      const orig = _v.fromBufferAttribute(bp, i).sub(shrinkC).multiplyScalar(1 / k).add(shrinkC).add(V3(0, SOLE, 0));
      const dh = orig.clone().sub(headC);
      if (dh.dot(faceFwd) <= 0.02) continue;
      const de = orig.clone().sub(eyeC);
      const v = de.dot(headAx);
      const feat = Math.abs(de.x) < 0.05 && v > -0.1 && v < 0.035 && de.dot(faceFwd) > -0.03;
      cand.push([i, dh.y, dh.x, feat ? 'features' : 'cheek']);
    }
    cand.sort((a, b) => a[1] - b[1] || a[2] - b[2]);
    for (const zone of ['features', 'cheek']) {
      const list = cand.filter((c) => c[3] === zone);
      const step = Math.max(1, Math.floor(list.length / 24));
      for (let q = 0; q < list.length; q += step) { faceIdx.push(list[q][0]); faceZoneOf.push(zone); }
    }
  }
  const _fq = new THREE.Quaternion(), _fq2 = new THREE.Quaternion();
  function faceProbes() {
    const bm = meshes.Body, bn = bm.geometry.attributes.normal;
    root.updateMatrixWorld(true);
    B.head.getWorldQuaternion(_fq).multiply(_fq2.copy(rest.head.wq).invert());
    // (head now) * (head at rest, in her frame)^-1 turns a rest normal of her frame into the world
    return faceIdx.map((i, q) => {
      const p = bm.getVertexPosition(i, V3());
      bm.localToWorld(p);
      const n = V3(bn.getX(i), bn.getY(i), bn.getZ(i)).applyQuaternion(_fq).normalize();
      return { p, n, zone: faceZoneOf[q] };
    });
  }

  // the hat on the head bone (for checks): apex and axis in the bone's own frame
  const knotLocal = knot.clone().sub(rest.head.wp).applyQuaternion(rest.head.wq.clone().invert());
  const hatLocal = {
    apex: hatApex.clone().sub(rest.head.wp).applyQuaternion(rest.head.wq.clone().invert()),
    axis: hatAxis.clone().applyQuaternion(rest.head.wq.clone().invert()),
  };
  await PH.mark('solve');
  // every drawing's arms solved now, so the loop itself only replays them (about 0.2 s here instead of spikes in the first loop)
  const tSolve = performance.now();
  const r5 = (a) => a.map((x) => +x.toFixed(5));
  const solveKey = { handoff: HANDOFF, note: r5(noteFar.p.toArray()) };
  const sameKey = bakeIn && bakeIn.solved && bakeIn.solveKey && bakeIn.solveKey.handoff === solveKey.handoff && bakeIn.solveKey.note.every((x, i) => Math.abs(x - solveKey.note[i]) < 2e-4);
  root.updateMatrixWorld(true);
  const rootInv = root.matrixWorld.clone().invert();
  if (sameKey) {
    for (const [f, sides] of Object.entries(bakeIn.solved)) {
      const res = {};
      for (const side of ['l', 'r']) {
        const m = sides[side];
        res[side] = {
          T: V3(...m.T).applyMatrix4(root.matrixWorld), P: V3(...m.P).transformDirection(root.matrixWorld),
          fwd: V3(...m.fwd).transformDirection(root.matrixWorld), palm: V3(...m.palm).transformDirection(root.matrixWorld),
          mode: m.mode, wk: m.wk, F: m.F ?? undefined,
        };
      }
      solved.set(+f, res);
    }
  } else {
    for (let f = 0; f < LOOP * FPS; f += STEP) pose(f);
  }
  bakeOut.solveKey = solveKey;
  bakeOut.solved = {};
  for (const [f, res] of solved) {
    await tick();
    const o = {};
    for (const side of ['l', 'r']) {
      const m = res[side];
      o[side] = {
        T: r5(m.T.clone().applyMatrix4(rootInv).toArray()), P: r5(m.P.clone().transformDirection(rootInv).toArray()),
        fwd: r5(m.fwd.clone().transformDirection(rootInv).toArray()), palm: r5(m.palm.clone().transformDirection(rootInv).toArray()),
        mode: m.mode, wk: m.wk, ...(m.F ? { F: m.F } : {}),
      };
    }
    bakeOut.solved[f] = o;
  }
  const solveMs = Math.round(performance.now() - tSolve);
  await PH.mark('end');
  lastDrawing = -1;
  resetPose();
  root.userData.api = { faceProbe, faceProbes, poseAt: (t) => poseAt(t), handoff: HANDOFF };
  return {
    qa: { cowlStats, cowlCovered, underCowl, keepOut, armPtsW, curl, FINGERS, pinchOf, bqRadius, hatLocal, knotLocal, pose, solved, bandRest, pouchFrame2: () => pouchFrame, rest, meshes, B, holds, POUCH, pouchFrame, BQ, hand, sample, noteFar, noteTrack, clothOffsetOf, segKeyOf, bandPts, get frame() { return lastDrawing; }, HANDOFF, seatTop, headC, hatApex, hatAxis, meta },
    group: root, bones: B, holds, update, runTo, runToSliced, poseAt, faceProbe, faceProbes, loop: LOOP, sets, folds, measures: M, outfit, hull,
    handoff: HANDOFF / FPS,          // seconds into the loop
    handoffFrame: HANDOFF,           // the same, as the loop's frame (24 fps; drawings on twos)
    stats: { nodes: nodeCount, triangles: (outfitGeo.index.count + hullGeo.index.count) / 3, solveMs, phases: PH.out, baked: { cowl: !!(bakeIn && bakeIn.cowl), pouch: !!(bakeIn && bakeIn.pouch), arms: !!sameKey } },
    // the slow parts of this build, for <model>-bake.json
    exportBake: () => JSON.stringify(bakeOut),
    setDebug(v) { for (const s of sets) for (const e of s.extra) e.visible = !v; },
  };
}
