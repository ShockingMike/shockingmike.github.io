// Chớm: the motorbike rider (người lái xe máy) carrying a peach branch home before Tết, on an early-2000s step-through.
// A MakeHuman body (CC0) posed riding and rigged (53 bones + bike, steer, wheel_f, wheel_r); his clothes, helmet, mask and the
// motorbike are built by code in Blender (blender/build_laixe.py). Painted by khach-paint.js, acted here. The peach branch
// is built here with the world's Batch (a lighter take on its peachBranch), tied to the rack; it sways with the world's wind
// (tree 4, the motorbike's tree).
//
//   const asset = await loadRider([url, ...], { slice, timing })   the model, its landmarks (json next to the glb)
//   const r = await buildRider(scene, { asset, R, D, parent, slice })
//       D      = { hero, Batch, peachBranch } from the world's build.js
//       parent = where to put him (a group that the world moves: its +x is the way the motorbike runs, y = 0 the road);
//                without it, r.group is added to the scene facing +z and the page moves it
//       slice  = optional: the page's pause between heavy build steps (chom-world core.slice)
//   r.update(t, dt, camera, dist)   t: the loop clock (6 s, drawn on twos); dist: metres ridden (the wheels, the road's bumps)
//   r.faceProbe(renderer, scene, camera)   visible pixels of his eyes, nose and mouth from this camera (0 = hidden)
//   r.faceProbes()                  points on his face (world) with normals, zone 'features' or 'cheek'
//
// The loop (6 s, 144 frames at 24 fps, drawn on twos): riding, the road's small bumps all through;
//   1.17 a glance right, to the market stalls (a small turn the other way first)   2.75 back to the road
//   3.33 a shrug against the cold                                                  4.00 left toe down on the gear pedal
//   4.67 the right wrist rolls the throttle back (a little past, then settles), his body settles back as the bike pulls
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PU, NCLOTH, CLOTH, NFOLD, materialTable, paintMaterial, hullMaterial, depthMaterial, foldMaterial } from './khach-paint.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const FPS = 24, STEP = 2;
export const LOOP = 6;
const arr = (a) => V3(a[0], a[1], a[2]);

// ---------------------------------------------------------------- the palette
const LOOK = {
  Jacket: { kind: 'cotton', col: '#2e3224', col2: '#9a9c74', hatch: '#181c12', hi: '#f2f0dc', back: '#20241a', scale: 6, bump: 0.7, gloss: 0, ink: 3.2, bands: true, hatchAmt: 0.75, hatchScale: 6, rim: 0.7 },
  Pants: { kind: 'cotton', col: '#1c1a18', col2: '#5e5850', hatch: '#0c0a08', hi: '#d8d0c4', back: '#12100e', scale: 5, bump: 0.6, gloss: 0, ink: 3.0, bands: true, hatchAmt: 0.7, hatchScale: 5, rim: 0.6 },
  Helmet: { kind: 'metal', col: '#4a1614', col2: '#c0584a', hatch: '#2a0a08', hi: '#fff0e8', back: '#1a0a08', scale: 8, bump: 0.3, gloss: 0.7, ink: 2.8, bands: true, hatchAmt: 0.5, rim: 0.8 },
  Visor: { kind: 'metal', col: '#07080a', col2: '#2e3a44', hatch: '#000000', hi: '#dfeaf4', back: '#050506', scale: 10, bump: 0.1, gloss: 1.0, ink: 2.0, hatchAmt: 0.2, rim: 0.9 },
  Mask: { kind: 'cotton', col: '#4a5866', col2: '#c4d0d8', hatch: '#26303a', hi: '#f6fbff', back: '#3a4652', scale: 7, bump: 0.5, gloss: 0, ink: 1.8, hatchAmt: 0.5, hatchScale: 7 },
  Hair: { kind: 'hair', col: '#060607', col2: '#34302e', hatch: '#000000', hi: '#8a8480', back: '#040404', scale: 9, bump: 0.3, sheen: 0.4, ink: 1.6, hatchAmt: 0.3 },
  Body: { kind: 'skin', col: '#6e3c2a', col2: '#c89070', hatch: '#3a1c10', hi: '#ffe0c8', back: '#40241a', scale: 5, bump: 0.2, gloss: 0.08, ink: 1.8, bands: true, face: 'all', hatchAmt: 0.35, rim: 0.8, hatchScale: 9 },
  Shoes: { kind: 'leather', col: '#1e120c', col2: '#7a5a42', hatch: '#0e0806', hi: '#f4e2d0', back: '#140c08', scale: 10, gloss: 0.6, ink: 2.2 },
  Paint: { kind: 'metal', col: '#3a1614', col2: '#b05a4c', hatch: '#1e0a08', hi: '#ffe8e0', back: '#1e0c0a', scale: 7, bump: 0.35, gloss: 0.8, ink: 3.0, bands: true, hatchAmt: 0.55, rim: 0.8 },
  Chrome: { kind: 'metal', col: '#2a2e34', col2: '#e2e8ee', hatch: '#14161a', hi: '#ffffff', back: '#1a1c20', scale: 12, bump: 0.2, gloss: 1.0, ink: 2.2, bands: true, hatchAmt: 0.3, rim: 1.0 },
  Rubber: { kind: 'leather', col: '#0a0a0c', col2: '#3a3a40', hatch: '#000000', hi: '#9a9aa4', back: '#060608', scale: 9, bump: 0.5, gloss: 0.2, ink: 2.6, hatchAmt: 0.25, rim: 0.4 },
  Seat: { kind: 'leather', col: '#100e10', col2: '#4a444a', hatch: '#000000', hi: '#c8c0c8', back: '#0a080a', scale: 8, bump: 0.4, gloss: 0.5, ink: 2.4, bands: true, hatchAmt: 0.45 },
  Engine: { kind: 'metal', col: '#1e2020', col2: '#848a86', hatch: '#0c0e0e', hi: '#eef2ee', back: '#121414', scale: 9, bump: 0.5, gloss: 0.5, ink: 2.2, bands: true, hatchAmt: 0.6 },
  Lamp: { kind: 'metal', col: '#6a5e46', col2: '#fff6de', hatch: '#3a3020', hi: '#ffffff', back: '#3a3020', scale: 10, bump: 0.1, gloss: 1.0, ink: 1.8, hatchAmt: 0.1 },
  Red: { kind: 'metal', col: '#5a0c08', col2: '#ff5a40', hatch: '#300404', hi: '#ffd8cc', back: '#300404', scale: 10, bump: 0.1, gloss: 1.0, ink: 1.8, hatchAmt: 0.1 },
};
const PART_MAT = {
  Body: 'Body', Jacket: 'Jacket', Pants: 'Pants', Helmet: 'Helmet', Visor: 'Visor', Mask: 'Mask', Hair: 'Hair', Shoes: 'Shoes',
  BikePaint: 'Paint', BikeChrome: 'Chrome', BikeRubber: 'Rubber', BikeSeat: 'Seat', BikeEngine: 'Engine', BikeLamp: 'Lamp',
};
const BIKE_BONES = ['bike', 'steer', 'wheel_f', 'wheel_r'];

// the peach blossom of the market (the world's colours), lighter: a five-lobed flat flower and a small centre
const BLOSSOM = {
  bark: { col: '#241a1e', col2: '#6a4a48', gloss: 0.1, erode: 0.2, hilite: 0.2, scale: 8, vert: 1, bump: 0.9 },
  a: { col: '#d8456c', col2: '#ffb6c6', emit: 0.06, erode: 0, hilite: 0.25, scale: 14, bump: 0.6 },
  w: { col: '#e88aa0', col2: '#ffe0e6', emit: 0.08, erode: 0, hilite: 0.25, scale: 14, bump: 0.6 },
  bud: { col: '#b8385a', col2: '#ff8aa4', erode: 0, hilite: 0.3, scale: 14, bump: 0.5 },
  eye: { col: '#8a1030', col2: '#ffd070', erode: 0, hilite: 0.3, scale: 14, bump: 0.5 },
};
const FLOWER = (() => {
  const g = new THREE.CircleGeometry(1, 10);
  const pp = g.attributes.position;
  for (let i = 1; i < pp.count; i++) {
    const x = pp.getX(i), y = pp.getY(i), a = Math.atan2(y, x);
    const k = 0.62 + 0.38 * Math.abs(Math.cos(2.5 * a));
    pp.setXYZ(i, x * k, y * k, (1 - k) * 0.6);
  }
  g.computeVertexNormals();
  return g;
})();
const EYE = new THREE.TetrahedronGeometry(1, 0);
const BUD = new THREE.IcosahedronGeometry(1, 0);
function peachBranchLight(b, base, dir, len, R, { twigs = 4, bloom = 22, petal = 0.05, sway = null, tree = 0, thick = 0.016 } = {}) {
  const pts = [base.clone()];
  const d = dir.clone().normalize();
  const side = new THREE.Vector3().crossVectors(d, V3(0.3, 0.2, 1).normalize()).normalize();
  for (let i = 1; i <= 4; i++) {
    const t = i / 4;
    pts.push(base.clone().addScaledVector(d, len * t).addScaledVector(side, Math.sin(t * 5 + R() * 2) * len * 0.05));
  }
  const sw = sway ?? (() => 0);
  b.tube(pts, thick, BLOSSOM.bark, 8, 5, sw, tree);
  const curve = new THREE.CatmullRomCurve3(pts);
  const tw = [];
  for (let i = 0; i < twigs; i++) {
    const t = 0.25 + 0.7 * (i / Math.max(1, twigs - 1)) + (R() - 0.5) * 0.08;
    const p = curve.getPoint(Math.min(0.98, t));
    const td = d.clone().multiplyScalar(0.5).add(V3(R() - 0.5, R() * 0.6, R() - 0.5)).normalize();
    const e = p.clone().addScaledVector(td, len * (0.18 + R() * 0.2));
    b.tube([p, p.clone().lerp(e, 0.5).add(V3((R() - 0.5) * 0.03, 0.01, 0)), e], thick * 0.5, BLOSSOM.bark, 3, 4, sw, tree);
    tw.push([p, e]);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < bloom; i++) {
    let p;
    if (R() < 0.45 || !tw.length) p = curve.getPoint(0.2 + 0.8 * R());
    else { const [a, e] = tw[Math.floor(R() * tw.length)]; p = a.clone().lerp(e, 0.2 + 0.8 * R()); }
    const s_ = petal * (0.8 + 0.5 * R());
    p.add(V3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(petal * 0.8));
    const n = V3(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
    if (R() < 0.18) { b.add(BUD, BLOSSOM.bud, m.compose(p, q.identity(), V3(s_ * 0.28, s_ * 0.36, s_ * 0.28)), sw, tree); continue; }
    q.setFromUnitVectors(V3(0, 0, 1), n);
    b.add(FLOWER, R() < 0.35 ? BLOSSOM.w : BLOSSOM.a, m.compose(p, q, V3(s_, s_, s_)), sw, tree);
    b.add(EYE, BLOSSOM.eye, m.compose(p.clone().addScaledVector(n, s_ * 0.12), q, V3(s_ * 0.18, s_ * 0.18, s_ * 0.18)), sw, tree);
  }
}

function restData(bones, root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const rq = root.getWorldQuaternion(new THREE.Quaternion()).invert();
  const R = {};
  for (const b of bones) {
    R[b.name] = { bone: b, local: b.quaternion.clone(), pos: b.position.clone(), wq: rq.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())), wp: b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv) };
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

export async function loadRider(urls, { slice = null, timing = null } = {}) {
  let last;
  for (const url of [].concat(urls)) {
    try {
      // the file first (waiting on the network), then its parsing (the page's work, in one piece: timing.parseMs)
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url}: ${res.status}`);
      const buf = await res.arrayBuffer();
      if (slice) await slice();
      const tp = performance.now();
      const gltf = await new GLTFLoader().parseAsync(buf, new URL('./', new URL(url, location.href)).href);
      if (timing) timing.parseMs = performance.now() - tp;
      const meta = await (await fetch(url.replace(/\.glb$/, '.json'))).json();
      return { gltf, meta };
    } catch (e) { last = e; }
  }
  throw last;
}

export async function buildRider(scene, { asset, R, D, parent = null, slice = null }) {
  // the page's own pause between heavy steps (chom-world core.slice: no stretch of work longer than about 16 ms)
  const tick = slice ? () => slice() : () => null;
  const t0 = performance.now();
  const { gltf, meta } = asset;
  const MB = meta.bike;
  const root = new THREE.Group();
  root.name = 'laixe';
  const holder = parent ?? scene;
  if (parent) {
    // the world's motorbike group runs along its +x with the road at y = 0; its wheels sit 0.72 ahead and 0.55 behind its origin.
    // His motorbike takes its place (theirs is hidden): turned so his +z is its +x, the wheels' midpoints together
    for (const c of parent.children) c.visible = false;
    root.rotation.y = Math.PI / 2;
    const mid = (MB.axleF[2] + MB.axleR[2]) / 2;
    root.position.set((0.72 - 0.55) / 2 - mid, 0, 0);
  }
  holder.add(root);
  const model = gltf.scene;
  root.add(model);
  root.updateMatrixWorld(true);

  const meshes = {};
  model.traverse((o) => { if (o.isSkinnedMesh || o.isMesh) meshes[o.name] = o; });
  const any = Object.values(meshes).find((m) => m.isSkinnedMesh);
  const bones = any.skeleton.bones;
  const B = Object.fromEntries(bones.map((b) => [b.name, b]));
  const rest = restData(bones, root);
  const P = (n) => rest[n].wp.clone();
  const headC = arr(meta.headCentre), headAx = arr(meta.headAxis).normalize(), headFwd = arr(meta.headFwd).normalize();
  const eyeC = arr(meta.eyeCentre);
  // the middle of his eyes, nose and mouth (the paint darkens round it, the check looks for it)
  const featC = eyeC.clone().addScaledVector(headAx, -0.04).addScaledVector(headFwd, 0.012);

  // ---------------------------------------------------------------- where the strokes run
  const segOf = {};
  const SEGS = {
    torso: { a: P('pelvis'), b: P('neck_01'), r: 0.13 },
    head: { a: P('neck_01'), b: headC.clone(), r: 0.09 },
    bike: { a: V3(0, 0.5, -0.5), b: V3(0, 0.5, 0.9), r: 0.2 },
  };
  for (const s of ['l', 'r']) {
    SEGS[`upper_${s}`] = { a: P(`upperarm_${s}`), b: P(`lowerarm_${s}`), r: 0.05 };
    SEGS[`lower_${s}`] = { a: P(`lowerarm_${s}`), b: P(`hand_${s}`), r: 0.04 };
    SEGS[`thigh_${s}`] = { a: P(`thigh_${s}`), b: P(`calf_${s}`), r: 0.09 };
    SEGS[`calf_${s}`] = { a: P(`calf_${s}`), b: P(`foot_${s}`), r: 0.07 };
  }
  for (const [k, sg] of Object.entries(SEGS)) {
    sg.axis = sg.b.clone().sub(sg.a).normalize();
    const ref = (k === 'bike' ? V3(0, 1, 0) : V3(0, 0, -1));
    sg.ref = ref.addScaledVector(sg.axis, -ref.dot(sg.axis));
    if (sg.ref.lengthSq() < 1e-4) sg.ref.set(1, 0, 0).addScaledVector(sg.axis, -sg.axis.x);
    sg.ref.normalize();
    sg.side = new THREE.Vector3().crossVectors(sg.axis, sg.ref);
    sg.key = k;
  }
  for (const b of bones) {
    const n = b.name;
    let k = 'torso';
    if (n === 'head' || n === 'neck_01') k = 'head';
    if (BIKE_BONES.includes(n)) k = 'bike';
    const s = n.endsWith('_l') ? 'l' : n.endsWith('_r') ? 'r' : null;
    if (s) {
      if (n.startsWith('upperarm')) k = `upper_${s}`;
      else if (n.startsWith('lowerarm') || n.startsWith('hand') || /^(index|middle|ring|pinky|thumb)/.test(n)) k = `lower_${s}`;
      else if (n.startsWith('thigh')) k = `thigh_${s}`;
      else if (n.startsWith('calf') || n.startsWith('foot') || n.startsWith('ball')) k = `calf_${s}`;
    }
    segOf[bones.indexOf(b)] = SEGS[k];
  }
  const wheelIdx = { [bones.indexOf(B.wheel_f)]: arr(MB.axleF), [bones.indexOf(B.wheel_r)]: arr(MB.axleR) };
  function flowAttributes(mesh) {
    const g = mesh.geometry;
    const pos = g.attributes.position, nor = g.attributes.normal;
    const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const n = pos.count;
    const flow = new Float32Array(n * 2), axis = new Float32Array(n * 3), curv = new Float32Array(n);
    const p = new THREE.Vector3(), q = new THREE.Vector3(), nn = new THREE.Vector3(), T = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(pos, i);
      let best = 0, bw = -1;
      for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
      const axle = wheelIdx[best];
      if (axle) {
        // a wheel: strokes run round it
        q.subVectors(p, axle);
        const r = Math.hypot(q.y, q.z);
        flow[i * 2] = Math.atan2(q.y, q.z) * Math.max(r, 0.03); flow[i * 2 + 1] = r + q.x * 0.5;
        T.set(0, q.z, -q.y).normalize();
      } else {
        const sg = segOf[best] ?? SEGS.torso;
        q.subVectors(p, sg.a);
        const along = q.dot(sg.axis);
        q.addScaledVector(sg.axis, -along);
        const ang = Math.atan2(q.dot(sg.side), q.dot(sg.ref));
        flow[i * 2] = ang * sg.r; flow[i * 2 + 1] = along;
        T.copy(sg.axis);
      }
      axis[i * 3] = T.x; axis[i * 3 + 1] = T.y; axis[i * 3 + 2] = T.z;
    }
    const idx = g.index ? g.index.array : null;
    if (idx) {
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
      for (let pass = 0; pass < 2; pass++) {
        const acc = new Float32Array(n), c2 = new Float32Array(n);
        for (let t = 0; t < idx.length; t += 3) {
          for (const [i, j] of [[idx[t], idx[t + 1]], [idx[t + 1], idx[t + 2]], [idx[t + 2], idx[t]]]) { acc[i] += curv[j]; c2[i]++; acc[j] += curv[i]; c2[j]++; }
        }
        for (let i = 0; i < n; i++) curv[i] = c2[i] ? curv[i] * 0.4 + 0.6 * acc[i] / c2[i] : curv[i];
      }
      for (let i = 0; i < n; i++) curv[i] = THREE.MathUtils.clamp(curv[i] * 4.0, 0, 1);
    }
    g.setAttribute('aFlow', new THREE.BufferAttribute(flow, 2));
    g.setAttribute('aAxis', new THREE.BufferAttribute(axis, 3));
    g.setAttribute('aCurv', new THREE.BufferAttribute(curv, 1));
  }

  await tick();
  // ---------------------------------------------------------------- the parts
  const LOOKS = Object.entries(LOOK).map(([name, look]) => ({ name, ...look, push: 0, legs: false, hang: -9, twoSided: name === 'Mask' || name === 'Visor' || name === 'Hair' }));
  const table = materialTable(LOOKS);
  table.uFaceR.value = 0.075;
  const matOf = Object.fromEntries(LOOKS.map((l, i) => [l.name, i]));
  const parts = [];
  let first = null;
  for (const [name, mname] of Object.entries(PART_MAT)) {
    await tick();
    const m = meshes[name];
    if (!m) { console.warn('[laixe] missing mesh', name); continue; }
    const g = m.geometry;
    const n = g.attributes.position.count;
    const ac = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) ac[i * 4] = -1;
    g.setAttribute('aCloth', new THREE.BufferAttribute(ac, 4));
    g.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aShrink', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aPushW', new THREE.BufferAttribute(new Float32Array(n), 1));
    const am = new Float32Array(n).fill(matOf[mname]);
    // the lamp mesh holds the headlamp (in front) and the red tail lamp (behind)
    if (name === 'BikeLamp') for (let i = 0; i < n; i++) if (g.attributes.position.getZ(i) < 0) am[i] = matOf.Red;
    g.setAttribute('aMat', new THREE.BufferAttribute(am, 1));
    flowAttributes(m);
    m.visible = false;
    m.castShadow = false;
    m.userData.castShadow = false;
    if (!first) first = m;
    parts.push(m);
  }
  for (const [nm, m] of Object.entries(meshes)) if (nm.startsWith('Hull')) { m.visible = false; m.castShadow = false; m.userData.castShadow = false; }

  await tick();
  // ---------------------------------------------------------------- cloth: the jacket's back and hem in the wind
  const nodes = [];
  let nodeCount = 0;
  const nodeBase = CLOTH.next;
  const grids = [];
  function addGrid({ mesh, pick, nu, nv, uOf, vOf, wOf, stiff, out, lim = 0.05, amp = 1 }) {
    const g = mesh.geometry;
    const pos = g.attributes.position;
    const ac = g.attributes.aCloth.array, aw = g.attributes.aClothW.array;
    const start = nodeBase + nodeCount;
    const verts = [];
    const pp = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) { pp.fromBufferAttribute(pos, i); if (pick(pp, i)) verts.push(i); }
    if (!verts.length) return null;
    const uv = new Map();
    for (const i of verts) {
      pp.fromBufferAttribute(pos, i);
      const u = clamp01(uOf(pp)), v = clamp01(vOf(pp));
      uv.set(i, [u, v]);
      ac[i * 4] = start; ac[i * 4 + 1] = u * (nu - 1); ac[i * 4 + 2] = Math.min(v * (nv - 1), nv - 1.0001); ac[i * 4 + 3] = nu;
      aw[i] = wOf(pp);
    }
    for (let j = 0; j < nv; j++) for (let k = 0; k < nu; k++) {
      const tu = nu > 1 ? k / (nu - 1) : 0.5, tv = j / (nv - 1);
      let best = -1, bd = 1e9;
      for (const i of verts) { const [u, v] = uv.get(i); const d = (u - tu) ** 2 + (v - tv) ** 2 * 1.5; if (d < bd) { bd = d; best = i; } }
      nodes.push({ mesh, vi: best, j, nv, k, nu, stiff: stiff(tv), p: new THREE.Vector3(), v: new THREE.Vector3(), t: new THREE.Vector3(), start, out, outW: new THREE.Vector3(), lim, amp });
    }
    nodeCount += nu * nv;
    grids.push({ start, nu, nv });
    return start;
  }
  const jacket = meshes.Jacket;
  const seatY = meta.seat;
  {
    const hemTop = seatY + 0.26;
    const pos = jacket.geometry.attributes.position;
    let xmin = 1e9, xmax = -1e9, ymin = 1e9;
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i);
      if (_v.z < 0.02 && _v.y < hemTop) { xmin = Math.min(xmin, _v.x); xmax = Math.max(xmax, _v.x); ymin = Math.min(ymin, _v.y); }
    }
    addGrid({
      mesh: jacket, nu: 5, nv: 3,
      pick: (p) => p.z < 0.02 && p.y < hemTop,
      uOf: (p) => (p.x - xmin) / Math.max(1e-3, xmax - xmin), vOf: (p) => (hemTop - p.y) / Math.max(1e-3, hemTop - ymin),
      wOf: (p) => sm(hemTop, ymin + 0.02, p.y) * 0.8,
      stiff: (tv) => (tv < 0.05 ? 1e9 : 70 * Math.pow(1 - tv, 2) + 25),
      out: V3(0, 0.25, -1).normalize(), lim: 0.03, amp: 1.0,
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

  await tick();
  // ---------------------------------------------------------------- the outfit (him and his motorbike): one mesh, one hull, one shadow caster
  const depthMat = depthMaterial(table);
  const outfitGeo = mergeGeometries(parts.map((m) => m.geometry), false);
  const outfit = new THREE.SkinnedMesh(outfitGeo, paintMaterial(table, { headC: featC, side: THREE.DoubleSide }));
  outfit.name = 'RiderOutfit';
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
  const featZone = (x, y, z) => sm(0.09, 0.06, _v.set(x, y, z).distanceTo(featC));
  const neckBase = arr(meta.neckBase);
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
    const at = { aCloth: 4, aClothW: 1, aShrink: 1, aPushW: 1, aCurv: 1, aMat: 1 };
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
    // no colour bands round his face (the visor, the mask, the skin between): only the ink
    const nob = new Float32Array(n);
    if (['Visor', 'Mask', 'Body', 'Helmet'].includes(name)) for (let i = 0; i < n; i++) nob[i] = Math.min(1, featZone(hp.getX(i), hp.getY(i), hp.getZ(i)) * 2);
    // the stand collar is a thin double band: its inside edges would all carry bands; only the ink there
    if (name === 'Jacket') for (let i = 0; i < n; i++) nob[i] = sm(0.11, 0.07, _v.set(hp.getX(i), hp.getY(i), hp.getZ(i)).distanceTo(neckBase));
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
  hull.name = 'RiderLines';
  hull.bind(first.skeleton, first.bindMatrix);
  hull.position.copy(outfit.position); hull.quaternion.copy(outfit.quaternion); hull.scale.copy(outfit.scale);
  hull.frustumCulled = false;
  hull.renderOrder = 1;
  hull.castShadow = false;
  hull.userData.castShadow = false;
  first.parent.add(hull);
  // the face's features: never drawn, only for the check
  const features = meshes.Features;
  const featWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
  if (features) { features.visible = false; features.castShadow = false; features.userData.castShadow = false; features.frustumCulled = false; }

  await tick();
  // ---------------------------------------------------------------- hands on the grips, feet on the pegs
  const hand = {};
  for (const s of ['l', 'r']) {
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
    hand[s] = { f0, p0, grip, fingers, restHandQ: basis(f0, p0), across: across.clone().applyQuaternion(inv) };
  }
  const arm = {};
  for (const s of ['l', 'r']) {
    const U = rest[`upperarm_${s}`], L = rest[`lowerarm_${s}`], H = rest[`hand_${s}`];
    const u0 = L.wp.clone().sub(U.wp), l0 = H.wp.clone().sub(L.wp);
    const hinge = new THREE.Vector3().crossVectors(u0, l0).normalize();
    arm[s] = {
      l1: u0.length(), l2: l0.length(),
      uLocal: basis(u0.clone().applyQuaternion(U.wq.clone().invert()), hinge.clone().applyQuaternion(U.wq.clone().invert())),
      lLocal: basis(l0.clone().applyQuaternion(L.wq.clone().invert()), hinge.clone().applyQuaternion(L.wq.clone().invert())),
      l0L: l0.clone().normalize().applyQuaternion(L.wq.clone().invert()),
      handToLower: H.wq.clone().invert().multiply(L.wq),
    };
  }
  const leg = {};
  for (const s of ['l', 'r']) {
    const T = rest[`thigh_${s}`], C = rest[`calf_${s}`], F = rest[`foot_${s}`];
    const u0 = C.wp.clone().sub(T.wp), l0 = F.wp.clone().sub(C.wp);
    const hinge = new THREE.Vector3().crossVectors(u0, l0).normalize();
    leg[s] = {
      l1: u0.length(), l2: l0.length(), knee0: C.wp.clone(), ankle: F.wp.clone(),
      uLocal: basis(u0.clone().applyQuaternion(T.wq.clone().invert()), hinge.clone().applyQuaternion(T.wq.clone().invert())),
      lLocal: basis(l0.clone().applyQuaternion(C.wq.clone().invert()), hinge.clone().applyQuaternion(C.wq.clone().invert())),
    };
  }
  const FINGERS = {
    grip: { index: [1.05, 1.15, 0.7], middle: [1.15, 1.2, 0.75], ring: [1.2, 1.2, 0.75], pinky: [1.25, 1.15, 0.7], thumb: [0.35, 0.45, 0.3], oppose: 0.9 },
  };
  const eul = new THREE.Euler();
  const charQ = new THREE.Quaternion();
  function rotateBone(name, e, order = 'YXZ') {
    if (!e || (e[0] === 0 && e[1] === 0 && e[2] === 0)) return;
    const b = B[name];
    root.getWorldQuaternion(charQ);
    _q.setFromEuler(eul.set(e[0], e[1], e[2], order));
    const qd = charQ.clone().multiply(_q).multiply(charQ.clone().invert());
    b.getWorldQuaternion(_q2);
    setWorldQuat(b, qd.multiply(_q2));
  }
  function resetPose() {
    for (const b of bones) { b.quaternion.copy(rest[b.name].local); b.position.copy(rest[b.name].pos); }
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
          b.quaternion.multiply(_q2.setFromAxisAngle(ax, (s === 'l' ? 1 : -1) * F.oppose * 0.6));
        }
      });
    }
  }
  // the fist round the grip: the grip lies across the top of the palm, the four fingers wrap it (each joint turned until
  // its segment's end reaches a ring round the grip, a finger's half-thickness out), the thumb closes over it
  const FINGER_HALF = 0.0085;
  async function fitGrip(s) {
    const hb = B[`hand_${s}`];
    const Hd = hand[s];
    const across = new THREE.Vector3().crossVectors(Hd.f0, Hd.p0).normalize();
    resetPose();
    const loc = (n) => hb.worldToLocal(B[n].getWorldPosition(new THREE.Vector3()));
    const kn = loc(`middle_01_${s}`);
    const fwdC = kn.dot(Hd.f0) - 0.012;
    // the palm's skin under that line (the Body mesh, as it is at rest)
    const bm = meshes.Body, bp = bm.geometry.attributes.position, bI = bm.geometry.attributes.skinIndex, bW = bm.geometry.attributes.skinWeight;
    const hi = bm.skeleton.bones.indexOf(hb);
    let palmSkin = 0.011;
    const v = new THREE.Vector3();
    for (let i = 0; i < bp.count; i++) {
      let w = 0;
      for (let k = 0; k < 4; k++) if (bI.getComponent(i, k) === hi) w += bW.getComponent(i, k);
      if (w < 0.5) continue;
      bm.getVertexPosition(i, v); bm.localToWorld(v); hb.worldToLocal(v);
      if (Math.abs(v.dot(Hd.f0) - fwdC) > 0.014 || Math.abs(v.dot(across) - kn.dot(across)) > 0.03) continue;
      palmSkin = Math.max(palmSkin, v.dot(Hd.p0));
    }
    // how far each finger's pad stands off its bones, toward the palm (at rest)
    const pad = { index: FINGER_HALF, middle: FINGER_HALF, ring: FINGER_HALF, pinky: FINGER_HALF, thumb: FINGER_HALF };
    {
      const boneOf = new Map();
      for (const f of Object.keys(pad)) for (let k = 1; k <= 3; k++) {
        const b = B[`${f}_0${k}_${s}`];
        boneOf.set(bm.skeleton.bones.indexOf(b), [f, loc(b.name), k < 3 ? loc(`${f}_0${k + 1}_${s}`) : null]);
      }
      const seen = {};
      for (let i = 0; i < bp.count; i++) {
        let bi = -1, bw = 0;
        for (let k = 0; k < 4; k++) if (bW.getComponent(i, k) > bw) { bw = bW.getComponent(i, k); bi = bI.getComponent(i, k); }
        const e = bw > 0.5 && boneOf.get(bi);
        if (!e) continue;
        const [f, j0, j1] = e;
        bm.getVertexPosition(i, v); bm.localToWorld(v); hb.worldToLocal(v);
        // off the bone's line, toward the palm
        let q = v.clone().sub(j0);
        if (j1) { const dir = j1.clone().sub(j0).normalize(); q.addScaledVector(dir, -q.dot(dir)); }
        seen[f] = Math.max(seen[f] ?? 0, q.dot(Hd.p0));
      }
      for (const f of Object.keys(seen)) pad[f] = Math.max(0.006, seen[f]);
    }
    Hd.pads = pad;
    await tick();
    const C = [palmSkin + MB.gripR + 0.001, fwdC];
    let Rf = MB.gripR + FINGER_HALF;
    const d2 = (q) => Math.hypot(q.dot(Hd.p0) - C[0], q.dot(Hd.f0) - C[1]);
    const preset = { thumb: FINGERS.grip.thumb.slice(), oppose: FINGERS.grip.oppose };
    const setJ = (f, k, a) => {
      const seg = Hd.fingers[f][k];
      _q.setFromAxisAngle(seg.axis, a);
      B[seg.n].quaternion.copy(rest[seg.n].local).multiply(_q);
    };
    const distal = {};
    for (const f of ['index', 'middle', 'ring', 'pinky', 'thumb']) distal[f] = loc(`${f}_03_${s}`).distanceTo(loc(`${f}_02_${s}`)) * 0.85;
    const endOf = (f, k) => {
      if (k < 2) return loc(`${f}_0${k + 2}_${s}`);
      const b3 = B[`${f}_03_${s}`];
      b3.updateWorldMatrix(true, false);
      const y = new THREE.Vector3().setFromMatrixColumn(b3.matrixWorld, 1).normalize();
      return hb.worldToLocal(b3.getWorldPosition(new THREE.Vector3()).addScaledVector(y, distal[f]));
    };
    // 2D distance from the grip's axis to a finger segment (in the plane across the grip)
    const segD = (a3, b3) => {
      const ax = a3.dot(Hd.p0) - C[0], ay = a3.dot(Hd.f0) - C[1];
      const bx = b3.dot(Hd.p0) - C[0], by = b3.dot(Hd.f0) - C[1];
      const ex = bx - ax, ey = by - ay;
      const u = Math.max(0, Math.min(1, -(ax * ex + ay * ey) / Math.max(1e-9, ex * ex + ey * ey)));
      return Math.hypot(ax + ex * u, ay + ey * u);
    };
    for (const f of ['index', 'middle', 'ring', 'pinky']) {
      await tick();
      Rf = MB.gripR + pad[f] + 0.001;
      const ang = [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        // close the joint until the segment touches the ring (a hand closing on a bar); if it touches even opened a little, open it
        const start = () => (k === 0 ? loc(`${f}_01_${s}`) : loc(`${f}_0${k + 1}_${s}`));
        let pick = -0.35;
        for (let a = -0.35; a <= 1.95; a += 0.02) {
          setJ(f, k, a);
          if (segD(start(), endOf(f, k)) <= Rf) break;
          pick = a;
        }
        ang[k] = pick;
        setJ(f, k, ang[k]);
      }
      preset[f] = ang;
    }
    // the thumb: as much of its curl as keeps it off the grip
    Rf = MB.gripR + pad.thumb + 0.001;
    let tBest = null;
    for (const op of [0.9, 0.6, 0.3, 0, -0.3]) {
      await tick();
      for (let amt = 1; amt >= -0.001; amt -= 0.1) {
        const F = { ...preset, thumb: FINGERS.grip.thumb.map((x) => x * amt), oppose: op };
        curl(s, F);
        let m = 9;
        for (let k = 1; k <= 3; k++) m = Math.min(m, d2(loc(`thumb_0${k}_${s}`)));
        m = Math.min(m, d2(endOf('thumb', 2)));
        if (m >= Rf) {
          // the most closed thumb that clears, the nearer to the grip the better
          const score = amt + op * 0.5 - (m - Rf) * 5;
          if (!tBest || score > tBest.score) tBest = { score, thumb: F.thumb, oppose: op };
          break;
        }
      }
    }
    if (tBest) { preset.thumb = tBest.thumb; preset.oppose = tBest.oppose; }
    else { preset.thumb = [0, 0, 0]; preset.oppose = -0.3; }
    Hd.gripPreset = preset;
    Hd.grip = Hd.p0.clone().multiplyScalar(C[0]).addScaledVector(Hd.f0, C[1]).addScaledVector(across, kn.dot(across));
    Hd.gripAmt = 1;
    Hd.gripRing = Rf;
    Hd.palmSkin = palmSkin;
  }
  await fitGrip('l');
  await tick();
  await fitGrip('r');
  await tick();
  resetPose();

  const tmpA = new THREE.Vector3();
  const _li = new THREE.Vector3(), _ed = new THREE.Vector3(), _pq = new THREE.Quaternion();
  function solveArm(s, targetW, fwdW, palmW, poleW, wristK = 0.8) {
    const U = B[`upperarm_${s}`], L = B[`lowerarm_${s}`], Hb = B[`hand_${s}`];
    const A = arm[s], Hd = hand[s];
    const qh = basis(fwdW, palmW).multiply(Hd.restHandQ.clone().invert());
    const off = Hd.grip.clone().applyQuaternion(qh);
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
      _li.copy(A.l0L).applyQuaternion(_pq.copy(qh).multiply(A.handToLower));
      _ed.copy(W).addScaledVector(_li, -A.l2).sub(S);
      _ed.addScaledVector(dir, -_ed.dot(dir));
      if (_ed.lengthSq() > 1e-8) {
        _ed.normalize();
        if (perp.dot(_ed) > -0.2) perp.multiplyScalar(1 - wristK).addScaledVector(_ed, wristK).normalize();
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
    setWorldQuat(L, qlBase.clone().multiply(new THREE.Quaternion().slerp(twFull, 0.55)));
    setWorldQuat(Hb, qh);
    return E;
  }
  // a leg: the ankle on its rest spot (the foot on the peg), the knee on the side the pole says; the foot keeps its rest turn
  function solveLeg(s, ankleW, poleW, footTurn) {
    const T_ = B[`thigh_${s}`], C_ = B[`calf_${s}`], F_ = B[`foot_${s}`];
    const Lg = leg[s];
    const S = T_.getWorldPosition(tmpA);
    const d = ankleW.clone().sub(S);
    let len = Math.min(Math.max(d.length(), Math.abs(Lg.l1 - Lg.l2) + 0.01), Lg.l1 + Lg.l2 - 0.004);
    const dir = d.normalize();
    const a = (Lg.l1 * Lg.l1 - Lg.l2 * Lg.l2 + len * len) / (2 * len);
    const h = Math.sqrt(Math.max(0, Lg.l1 * Lg.l1 - a * a));
    const perp = poleW.clone().addScaledVector(dir, -poleW.dot(dir)).normalize();
    const K = S.clone().addScaledVector(dir, a).addScaledVector(perp, h);
    const W = S.clone().addScaledVector(dir, len);
    const u = K.clone().sub(S).normalize(), l = W.clone().sub(K).normalize();
    const hinge = new THREE.Vector3().crossVectors(u, l).normalize();
    setWorldQuat(T_, basis(u, hinge).multiply(Lg.uLocal.clone().invert()));
    setWorldQuat(C_, basis(l, hinge).multiply(Lg.lLocal.clone().invert()));
    root.getWorldQuaternion(charQ);
    setWorldQuat(F_, charQ.clone().multiply(footTurn).multiply(rest[`foot_${s}`].wq));
  }

  await tick();
  // ---------------------------------------------------------------- the peach branch, tied to the rack
  const holds = {};
  {
    const tb = new D.Batch({ wind: true });
    const rackZ = (MB.rack.y0 + MB.rack.y1) / 2, rackY = MB.rack.z;
    const base = V3(0, rackY + 0.02, rackZ);
    // A branch a man can carry home: its cut end at the rack, the crown no higher than about 2.3 m over the road, so it never
    // comes within 1.2 m of the page's camera (README 6c). Only the upper part moves in the wind.
    const sw = (x, y) => Math.max(0, y - 0.95) * 0.3;
    const bark = { col: '#2a1a14', col2: '#7a5a48', erode: 0.4, hilite: 0.3, scale: 6, bump: 1 };
    tb.tube([base.clone().add(V3(0, -0.04, 0.01)), V3(0.01, 0.98, rackZ - 0.03), V3(-0.02, 1.34, rackZ - 0.08), V3(0.02, 1.68, rackZ - 0.13)], 0.026, bark, 8, 6, sw, 4);
    const R2 = R ?? Math.random;
    // the crown sits lower and fuller: the flowering heads gather round his shoulder instead of standing over him
    const heads = [
      [1.1, [0.8, 0.85, -0.5], 0.62], [1.18, [-0.8, 0.85, -0.4], 0.66], [1.28, [0.5, 0.95, -0.9], 0.74], [1.36, [-0.6, 1.0, -0.8], 0.7],
      [1.46, [0.9, 0.95, 0.1], 0.7], [1.52, [-0.9, 0.95, 0.15], 0.7], [1.6, [0.3, 1.1, 0.35], 0.62], [1.64, [-0.2, 1.2, -0.5], 0.66], [1.68, [0.1, 1.0, -0.2], 0.5],
    ];
    for (const [h, d, len] of heads) {
      await tick();
      const bb = V3(0, h, rackZ - 0.03 - (h - 0.95) * 0.14);
      peachBranchLight(tb, bb, V3(...d), len, R2, { twigs: 4, bloom: 30, petal: 0.06, sway: sw, tree: 4, thick: 0.016 });
    }
    // red cloth ties round the cut end and the rack
    const tie = { col: '#5a0c0a', col2: '#d8483a', erode: 0.2, hilite: 0.4, scale: 10, bump: 0.6 };
    for (const [y, r] of [[rackY + 0.04, 0.036], [rackY + 0.11, 0.034]]) {
      const g = new THREE.TorusGeometry(r, 0.006, 4, 10);
      g.rotateX(Math.PI / 2);
      g.translate(0, y, rackZ + 0.005);
      tb.add(g, { ...tie, smooth: true }, null, 0, 4);
    }
    for (const sx of [-1, 1]) tb.rod(V3(sx * MB.rack.half, rackY + 0.008, rackZ + 0.04), V3(0.0, rackY + 0.06, rackZ + 0.01), 0.005, tie, 5, 0.005, 0, 4);
    holds.tree = D.hero(tb.merge(), { wind: true, rims: false, tier: 0.05 });
    holds.tree.traverse((o) => { if (o.isMesh && o === holds.tree.userData.main) o.castShadow = true; });
    root.add(holds.tree);
  }

  await tick();
  // ---------------------------------------------------------------- the acting
  // (in his frame: +z ahead, +x his left). Body keys: spine [bend forward, turn left, lean left], neck, head, clavicles [raise].
  const keys = [];
  const K = (f, o) => keys.push({ f, ...o });
  const Z = [0, 0, 0];
  K(0, { ease: 'inout' });
  K(14, { ease: 'inout', head: [0.02, 0.04, 0.02] });
  // the glance to the market: a small turn left first, then right, held, back
  K(28, { ease: 'in', head: [0.0, 0.08, 0.0], neck: [0, 0.03, 0] });
  K(36, { ease: 'out', head: [0.04, -0.62, -0.05], neck: [0.02, -0.22, 0], spine: [0, -0.06, 0] });
  K(56, { ease: 'hold', head: [0.06, -0.66, -0.06], neck: [0.02, -0.24, 0], spine: [0, -0.07, 0] });
  K(66, { ease: 'inout', head: [0.0, 0.03, 0.0], neck: [0, 0.01, 0] });
  // a shrug against the cold
  K(78, { ease: 'in', clav: [0.0, 0.0, 0.0], neck: [0.03, 0, 0] });
  K(84, { ease: 'out', clav: [0.0, 0.0, 0.16], neck: [0.08, 0, 0], head: [0.04, 0, 0] });
  K(92, { ease: 'inout', clav: [0, 0, 0.05] });
  // the gear: the left toe goes down on the pedal
  K(96, { ease: 'in', toeL: -0.05 });
  K(100, { ease: 'snap', toeL: 0.16, spine: [0.02, 0, 0] });
  K(106, { ease: 'out', toeL: 0.0 });
  // the throttle rolled back, the body settles back as the bike pulls
  K(112, { ease: 'in', throttle: -0.05 });
  K(120, { ease: 'out', throttle: 0.34, spine: [-0.05, 0, 0], head: [-0.02, 0, 0] });
  K(124, { ease: 'inout', throttle: 0.3, spine: [-0.045, 0, 0], head: [-0.018, 0, 0] });
  K(132, { ease: 'hold', throttle: 0.3, spine: [-0.03, 0, 0] });
  K(144, { ease: 'inout' });
  const EASE = {
    in: (u) => u * u * u,
    out: (u) => 1 - Math.pow(1 - u, 3),
    inout: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    snap: (u) => 1 - Math.pow(1 - u, 4.5),
    hold: (u) => 0.5 - 0.5 * Math.sin(Math.PI * 0.5 + Math.PI * u) * 0,
  };
  EASE.hold = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u);
  const lerpA = (a, b, u) => (a ?? Z).map((x, i) => x + ((b ?? Z)[i] - x) * u);
  const lerpN = (a, b, u) => (a ?? 0) + ((b ?? 0) - (a ?? 0)) * u;

  // the grips in his frame (they turn with the steer bone)
  const gripL = { l: arr(MB.grip.l), r: arr(MB.grip.r) };
  const gripAxis = V3(1, 0, 0);
  const PELVIS_BOB = V3();
  let dist0 = 0;
  const sample = { frame: 0, bob: 0 };
  // road: small bumps under the wheels (the same numbers as the world's motorbike, so body and bike agree)
  const roadBob = (dist) => 0.008 * Math.sin(dist * 3.1) + 0.004 * Math.sin(dist * 7.3);
  function pose(frame, dist) {
    const f = ((frame % (LOOP * FPS)) + LOOP * FPS) % (LOOP * FPS);
    let i = 0;
    while (i < keys.length - 2 && keys[i + 1].f <= f) i++;
    const a = keys[i], b = keys[i + 1];
    const u0 = (f - a.f) / (b.f - a.f);
    const u = (EASE[b.ease] ?? EASE.inout)(u0);
    resetPose();
    // the body rides the road a little behind the bike: it lags the bumps (the drawing's own bob)
    const bump = roadBob(dist - 0.35) - roadBob(dist);
    sample.bob = bump;
    // he can be lifted off the seat by a bump, never pressed into it
    PELVIS_BOB.set(0, 0.4 * Math.max(0, bump) + 0.001 * (1 + Math.sin(frame * 0.21)), 0).applyQuaternion(rest.Root.wq.clone().invert());
    B.pelvis.position.copy(rest.pelvis.pos).add(PELVIS_BOB);
    root.updateMatrixWorld(true);
    const sp = lerpA(a.spine, b.spine, u);
    // breathing and the bumps in the back
    sp[0] += 0.012 * Math.sin(frame * 0.13) + bump * 1.5;
    rotateBone('spine_01', [sp[0] * 0.4, sp[1] * 0.3, sp[2] * 0.3]);
    rotateBone('spine_02', [sp[0] * 0.35, sp[1] * 0.35, sp[2] * 0.35]);
    rotateBone('spine_03', [sp[0] * 0.25, sp[1] * 0.35, sp[2] * 0.35]);
    const nk = lerpA(a.neck, b.neck, u), hd = lerpA(a.head, b.head, u);
    rotateBone('neck_01', [nk[0] - bump * 1.2, nk[1], nk[2]]);
    rotateBone('head', [hd[0] - bump * 0.6, hd[1], hd[2]]);
    const cl = lerpA(a.clav, b.clav, u);
    rotateBone('clavicle_l', [0, 0, cl[2]]);
    rotateBone('clavicle_r', [0, 0, -cl[2]]);
    root.updateMatrixWorld(true);
    // hands on the grips; the right wrist rolls the throttle
    const thr = lerpN(a.throttle, b.throttle, u);
    for (const s of ['l', 'r']) {
      const sx = s === 'l' ? 1 : -1;
      // the hand a little out along the grip (clear of the switch housing), as riders hold it
      const gp = root.localToWorld(gripL[s].clone().add(V3(sx * 0.012, 0, 0)));
      const inward = gripAxis.clone().multiplyScalar(-sx).transformDirection(root.matrixWorld);
      // the fist round the grip: knuckles forward and down, thumb inward
      const across = inward.clone().negate();
      let fwd = V3(sx * 0.1, -0.55, 1).normalize().transformDirection(root.matrixWorld);
      fwd.addScaledVector(across, -fwd.dot(across)).normalize();
      if (s === 'r' && thr) fwd.applyAxisAngle(across, -thr * sx);
      const palm = s === 'l' ? new THREE.Vector3().crossVectors(across, fwd).normalize() : new THREE.Vector3().crossVectors(fwd, across).normalize();
      const fw2 = s === 'l' ? new THREE.Vector3().crossVectors(palm, across).normalize() : new THREE.Vector3().crossVectors(across, palm).normalize();
      const pole = V3(sx * 1, -0.5, -0.35).normalize().transformDirection(root.matrixWorld);
      solveArm(s, gp, fw2, palm, pole, 0.6);
      curl(s, hand[s].gripPreset, 1);
    }
    // feet on the pegs; the left toe on the gear pedal
    const toe = lerpN(a.toeL, b.toeL, u);
    root.getWorldQuaternion(charQ);
    for (const s of ['l', 'r']) {
      const sx = s === 'l' ? 1 : -1;
      // the foot pivots on the peg (the sole's contact), so the toe goes down and the heel comes up
      const turn = new THREE.Quaternion();
      if (s === 'l' && toe) turn.setFromAxisAngle(V3(1, 0, 0), toe);
      const pivot = arr(MB.peg[s]).add(V3(0, MB.pegR, 0));
      const ankC = leg[s].ankle.clone().sub(pivot).applyQuaternion(turn).add(pivot);
      const pole = V3(sx * 0.35, 0.3, 1).normalize().transformDirection(root.matrixWorld);
      solveLeg(s, root.localToWorld(ankC), pole, turn);
    }
    root.updateMatrixWorld(true);
    sample.frame = f;
  }

  // ---------------------------------------------------------------- the machine: wheels and a little steering, every frame
  const axisWF = V3(1, 0, 0).applyQuaternion(rest.wheel_f.wq.clone().invert());
  const axisWR = V3(1, 0, 0).applyQuaternion(rest.wheel_r.wq.clone().invert());
  const steerAx = arr(MB.steerAxis).normalize().applyQuaternion(rest.steer.wq.clone().invert());
  function spin(dist, t) {
    B.wheel_f.quaternion.copy(rest.wheel_f.local).multiply(_q.setFromAxisAngle(axisWF, dist / MB.wheelR));
    B.wheel_r.quaternion.copy(rest.wheel_r.local).multiply(_q.setFromAxisAngle(axisWR, dist / MB.wheelR));
  }

  // ---------------------------------------------------------------- cloth, every frame
  let clothInit = false;
  const _side = new THREE.Vector3();
  function stepCloth(dt, t, speed) {
    const sub = Math.max(1, Math.ceil(dt / (1 / 90)));
    const h = Math.min(dt, 0.05) / sub;
    const side = _side.set(1, 0, 0).transformDirection(root.matrixWorld);
    for (const n of nodes) {
      n.mesh.getVertexPosition(n.vi, n.t);
      n.mesh.localToWorld(n.t);
      n.outW.copy(n.out).transformDirection(root.matrixWorld);
      if (!clothInit) { n.p.copy(n.t); n.v.set(0, 0, 0); }
    }
    clothInit = true;
    const wind = 0.4 + 0.6 * clamp01(speed / 6.8);
    for (let s = 0; s < sub; s++) {
      for (const n of nodes) {
        if (n.stiff > 1e6) { n.p.copy(n.t); n.v.set(0, 0, 0); continue; }
        const k = n.stiff, c = 2 * Math.sqrt(k) * 0.3;
        const tv = n.j / (n.nv - 1);
        const ph = t * 7.0 + n.k * 1.1 + n.j * 0.7;
        const gust = 0.6 * Math.sin(ph) + 0.4 * Math.sin(ph * 2.3 + 1.1);
        _v.subVectors(n.t, n.p).multiplyScalar(k);
        _v.addScaledVector(n.v, -c);
        _v.addScaledVector(n.outW, (0.6 + 0.4 * gust) * 2.2 * tv * n.amp * wind);
        _v.addScaledVector(side, gust * 0.8 * tv * n.amp * wind);
        n.v.addScaledVector(_v, h);
        n.p.addScaledVector(n.v, h);
        _v.subVectors(n.p, n.t);
        const lim = n.lim * tv + 0.002;
        if (_v.length() > lim) { _v.setLength(lim); n.p.copy(n.t).add(_v); }
        const dn = _v.subVectors(n.p, n.t).dot(n.outW);
        if (dn < 0) { n.p.addScaledVector(n.outW, -dn); const vn = n.v.dot(n.outW); if (vn < 0) n.v.addScaledVector(n.outW, -vn); }
      }
    }
    const off = PU.uCloth.value;
    for (const n of nodes) off[n.start + n.j * n.nu + n.k].subVectors(n.p, n.t);
  }

  const SIM = 1 / 30;
  let simAcc = 0, lastDrawing = -1, lastDist = 0;
  function update(t, dt, camera = null, dist = 0) {
    const frame = Math.floor(t * FPS / STEP) * STEP;
    const drawDist = Math.floor(dist / 0.3) * 0.3;
    if (frame !== lastDrawing) {
      pose(frame, dist);
      lastDrawing = frame;
      simAcc = Math.max(simAcc, SIM);
    }
    spin(dist, t);
    const speed = dt > 0 ? Math.abs(dist - lastDist) / dt : 0;
    lastDist = dist;
    simAcc += dt;
    if (simAcc >= SIM) {
      const h = Math.min(simAcc, 0.1);
      simAcc = 0;
      stepCloth(h, t, Math.min(speed, 10));
    }
  }
  function poseAt(t, dist = 0) {
    const frame = Math.floor(t * FPS / STEP) * STEP;
    pose(frame, dist);
    spin(dist, t);
    lastDrawing = -1;
  }
  function runTo(t, dist = 0) {
    clothInit = false; lastDrawing = -1; simAcc = 0;
    for (let i = 30; i >= 0; i--) update((((t - i / 30) % LOOP) + LOOP) % LOOP, 1 / 30, null, dist - i * 6.8 / 30);
  }
  // the same, pausing for the page every few steps (chom-world core.slice)
  async function runToSliced(t, dist = 0, slice = null) {
    clothInit = false; lastDrawing = -1; simAcc = 0;
    for (let i = 30; i >= 0; i--) {
      update((((t - i / 30) % LOOP) + LOOP) % LOOP, 1 / 30, null, dist - i * 6.8 / 30);
      if (slice && i % 3 === 0) await slice();
    }
  }

  // ---------------------------------------------------------------- the face check
  const probeRT = new THREE.WebGLRenderTarget(320, 200);
  let probeBuf = new Uint8Array(320 * 200 * 4);
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  function faceProbe(renderer, sceneIn, camera, w = 320, h = 200) {
    if (!features) return -1;
    if (probeRT.width !== w || probeRT.height !== h) probeRT.setSize(w, h);
    if (probeBuf.length !== w * h * 4) probeBuf = new Uint8Array(w * h * 4);
    const saved = [];
    sceneIn.traverse((o) => {
      if (!o.isMesh && !o.isLine && !o.isPoints) return;
      if (o === features) return;
      const u = o.material && o.material.uniforms && o.material.uniforms.uProbe;
      const probing = u && o.material.fragmentShader && o.material.fragmentShader.includes('uProbe > 0.5');
      if (probing) { saved.push([o, 'u', u.value]); u.value = 1; }
      else if (o.isSkinnedMesh || !o.isMesh) { if (o.visible) { saved.push([o, 'v', true]); o.visible = false; } }
      else { saved.push([o, 'm', o.material]); o.material = black; }
    });
    saved.push([features, 'v', features.visible], [features, 'm', features.material]);
    features.visible = true;
    features.material = featWhite;
    const prevRT = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
    const bg = sceneIn.background; sceneIn.background = null;
    renderer.setRenderTarget(probeRT);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(sceneIn, camera);
    renderer.readRenderTargetPixels(probeRT, 0, 0, w, h, probeBuf);
    renderer.setRenderTarget(prevRT);
    renderer.setClearColor(prevClear, prevA);
    sceneIn.background = bg;
    for (let k = saved.length - 1; k >= 0; k--) {
      const [o, kind, val] = saved[k];
      if (kind === 'u') o.material.uniforms.uProbe.value = val;
      else if (kind === 'v') o.visible = val;
      else o.material = val;
    }
    let n = 0;
    for (let i = 0; i < w * h; i++) if (probeBuf[i * 4] > 127) n++;
    probeLast = { w, h };
    return n;
  }
  let probeLast = null;
  // for checks: where the last probe saw his features ([x, y] from the top left, in probe pixels)
  function probeHits() {
    if (!probeLast) return [];
    const { w, h } = probeLast, out = [];
    for (let i = 0; i < w * h; i++) if (probeBuf[i * 4] > 127) out.push([i % w, h - 1 - Math.floor(i / w)]);
    return out;
  }
  // points for the world's face check: his features (under the visor and the mask) and his cheeks
  const probeIdx = [];
  {
    if (features) {
      const fp = features.geometry.attributes.position;
      const step = Math.max(1, Math.floor(fp.count / 24));
      for (let i = 0; i < fp.count; i += step) probeIdx.push([features, i, 'features']);
    }
    const bm = meshes.Body, bp = bm.geometry.attributes.position, bI = bm.geometry.attributes.skinIndex;
    const hi = bm.skeleton.bones.indexOf(B.head);
    const cand = [];
    for (let i = 0; i < bp.count; i++) {
      if (bI.getComponent(i, 0) !== hi) continue;
      _v.fromBufferAttribute(bp, i).sub(headC);
      if (_v.dot(headFwd) > 0.0 && Math.abs(_v.x) > 0.045) cand.push(i);
    }
    const step = Math.max(1, Math.floor(cand.length / 24));
    for (let q = 0; q < cand.length; q += step) probeIdx.push([bm, cand[q], 'cheek']);
  }
  const _fq = new THREE.Quaternion();
  function faceProbes() {
    root.updateMatrixWorld(true);
    B.head.getWorldQuaternion(_fq).multiply(_q2.copy(rest.head.wq).invert());
    return probeIdx.map(([m, i, zone]) => {
      const p = m.getVertexPosition(i, V3());
      m.localToWorld(p);
      const nm = m.geometry.attributes.normal;
      const n = V3(nm.getX(i), nm.getY(i), nm.getZ(i)).applyQuaternion(_fq).normalize();
      return { p, n, zone };
    });
  }

  poseAt(0, 0);
  root.userData.api = { faceProbe, faceProbes, poseAt };
  return {
    group: root, bones: B, holds, update, runTo, runToSliced, poseAt, faceProbe, faceProbes, loop: LOOP, outfit, hull, features,
    qa: { rest, meshes, B, meta, hand, sample, clothOffsetOf, segKeyOf, featC, headC, probeHits },
    stats: { nodes: nodeCount, triangles: (outfitGeo.index.count + hullGeo.index.count) / 3, buildMs: Math.round(performance.now() - t0) },
  };
}
