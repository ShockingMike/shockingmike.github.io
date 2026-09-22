// Chớm people test: the customer at the Tết flower market, in an áo dài.
// A MakeHuman body (CC0) rigged with 53 bones (three per finger), clothes built by code in Blender (blender/build_khach.py).
//
//   const k = await buildKhach(scene, { url, R, D })     D = { hero, Batch, peachBranch, C, withC, V3 } from D's build.js
//   k.group                      place and turn her like any object (she faces +z of the group)
//   k.update(t, dt, camera)      t: loop clock (s). The body moves on twos (a new drawing every 1/12 s), the cloth every frame.
//   k.holds                      { branch, note, bag }
//   k.face(camera)               how much the face turns toward the camera (-1 away ... 1 toward). The page keeps it < -0.2.
//   k.loop                       6 s
//   k.exchangeTime               [start, end] of the moment the note is held out, for a seller to take it
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PU, NCLOTH, CLOTH, NFOLD, materialTable, paintMaterial, hullMaterial, depthMaterial, foldMaterial } from './khach-paint.js';
import { snap, sdist, forNear } from './surface.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4();
const FPS = 24, STEP = 2;           // drawings at 24 fps, each held for two frames
export const LOOP = 6;

// ---------------------------------------------------------------- the palette (linear mixes happen in the shader)
const LOOK = {
  AoDai: { kind: 'silk', col: '#5a0916', col2: '#e2423a', hatch: '#2a040e', hi: '#ffe2d0', back: '#380912', scale: 2.2, bump: 0.22, gloss: 0, sheen: 1.0, ink: 4.2, bands: true, hatchScale: 4.2, hatchAmt: 0.7, rim: 0.8 },
  Pants: { kind: 'silk', col: '#c8bfd4', col2: '#fffaf2', hatch: '#8a80a6', hi: '#ffffff', back: '#9a92a8', scale: 2.4, bump: 0.2, sheen: 0.55, ink: 3.4, bands: true, hatchScale: 4.5, hatchAmt: 0.6, push: 0.05 },
  Body: { kind: 'skin', col: '#9a5a40', col2: '#eab48e', hatch: '#5a2c22', hi: '#ffe6d0', back: '#5a3026', scale: 5, bump: 0.18, gloss: 0.08, ink: 1.8, bands: true, face: true, hatchAmt: 0.35, rim: 0.8, hatchScale: 9 },
  Hair: { kind: 'hair', col: '#0c0b0e', col2: '#2e2b33', hatch: '#000000', hi: '#a4a6b4', back: '#050406', scale: 8, bump: 0.35, sheen: 1.0, ink: 1.6, bands: true, hatchAmt: 0.0, rim: 0.85 },
  Hairpin: { kind: 'metal', col: '#6a4410', col2: '#f4c860', hatch: '#3a2408', hi: '#fff6d0', scale: 20, gloss: 1.0, ink: 0 },
  Scarf: { kind: 'wool', col: '#a4947c', col2: '#f4ead6', hatch: '#6a5a4a', hi: '#fffaf0', back: '#7a6c5a', scale: 6, bump: 0.8, gloss: 0, ink: 2.4, bands: true, hatchAmt: 0.8, hatchScale: 8 },
  Shoes: { kind: 'leather', col: '#26090e', col2: '#8a2c30', hatch: '#120306', hi: '#ffd0c0', back: '#1a0508', scale: 12, gloss: 0.8, ink: 1.6 },
};

// ---------------------------------------------------------------- rest-pose helpers
function restData(bones, root) {
  // rest frames in the character's own space (the root may already be placed in the world)
  const R = {};
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const rq = root.getWorldQuaternion(new THREE.Quaternion()).invert();
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
// world rotation of a bone -> its local quaternion (parent must be up to date)
function setWorldQuat(bone, qw) {
  bone.parent.getWorldQuaternion(_q2);
  bone.quaternion.copy(_q2.invert().multiply(qw));
  bone.updateMatrixWorld(true);
}

// the model and its landmarks; try each url in turn (the same code runs in the test page and in chom-world)
export async function loadKhach(urls, slice = null) {
  let last;
  for (const url of [].concat(urls)) {
    try {
      // fetched first (the network does not hold the page), then parsed in one short stretch
      const [buf, meta] = await Promise.all([fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.arrayBuffer(); }), fetch(url.replace(/\.glb$/, '.json')).then((r) => { if (!r.ok) throw new Error(`${url}: json ${r.status}`); return r.json(); })]);
      if (slice) await slice();
      const gltf = await new GLTFLoader().parseAsync(buf, url.replace(/[^/]*$/, ''));
      return { gltf, meta };
    } catch (e) { last = e; }
  }
  throw last;
}

// asset: from loadKhach. at, faceTo: where she stands and the point she turns toward (world). exchange: where the note is handed over.
export async function buildKhach(scene, { asset, R, D, at = null, faceTo = null, exchange = null, slice = null }) {
  // the build gives the page back between its steps (core.slice); PROF keeps each step and the longest one
  const PROF = { steps: [], longestStep: { ms: 0, at: '' } };
  let tMark = performance.now();
  const tick = async (label) => {
    const step = performance.now() - tMark;
    PROF.steps.push([label, +step.toFixed(1)]);
    if (step > PROF.longestStep.ms) PROF.longestStep = { ms: +step.toFixed(1), at: label };
    if (slice) await slice();
    tMark = performance.now();
  };
  const { gltf, meta } = asset;
  const root = new THREE.Group();
  root.name = 'khach';
  scene.add(root);
  const model = gltf.scene;
  root.add(model);
  if (at) root.position.copy(at);
  if (at && faceTo) root.rotation.y = Math.atan2(faceTo.x - at.x, faceTo.z - at.z);
  root.updateMatrixWorld(true);

  const meshes = {};
  model.traverse((o) => { if (o.isSkinnedMesh || o.isMesh) meshes[o.name] = o; });
  const any = Object.values(meshes).find((m) => m.isSkinnedMesh);
  const skeleton = any.skeleton;
  const bones = skeleton.bones;
  const B = Object.fromEntries(bones.map((b) => [b.name, b]));
  const rest = restData(bones, root);
  const toChar = (w) => root.worldToLocal(w.clone());
  const rootQ = new THREE.Quaternion();
  const offW = (v) => v.clone().applyQuaternion(root.getWorldQuaternion(rootQ));   // keeps the length (transformDirection does not)

  // landmarks in the character's own space (rest pose, root at identity when this runs)
  const P = (n) => rest[n].wp.clone();
  const headC = V3(...meta.headCentre);
  const waistY = meta.waistY, hipY = meta.hipY, hemY = meta.hemY;
  PU.uLegTop.value = hipY - 0.03;
  PU.uLegR.value = 0.106;

  await tick('rest');
  // ---------------------------------------------------------------- where the strokes run: round each limb, across the back, along the hair
  // aFlow = (arc length round the form, length along it), aAxis = the fibre direction, aCurv = how hollow the surface is there
  const segOf = {};
  const SEGS = {
    torso: { a: P('pelvis'), b: P('neck_01'), r: 0.12 },
    head: { a: P('neck_01'), b: headC.clone(), r: 0.08 },
  };
  for (const s of ['l', 'r']) {
    SEGS[`upper_${s}`] = { a: P(`upperarm_${s}`), b: P(`lowerarm_${s}`), r: 0.045 };
    SEGS[`lower_${s}`] = { a: P(`lowerarm_${s}`), b: P(`hand_${s}`), r: 0.035 };
    SEGS[`thigh_${s}`] = { a: P(`thigh_${s}`), b: P(`calf_${s}`), r: 0.085 };
    SEGS[`calf_${s}`] = { a: P(`calf_${s}`), b: P(`foot_${s}`), r: 0.08 };
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
  const bunC = V3(...meta.bunCentre);
  const hairA = bunC.clone().sub(headC).normalize();
  const hairB2 = V3(0, 1, 0).addScaledVector(hairA, -hairA.y).normalize();
  const hairB1 = new THREE.Vector3().crossVectors(hairA, hairB2);
  const bunAx = V3(0, -0.3, -0.85).normalize();
  const bunU = V3(1, 0, 0), bunV = new THREE.Vector3().crossVectors(bunAx, bunU).normalize();
  async function flowAttributes(mesh, name) {
    const g = mesh.geometry;
    const pos = g.attributes.position, nor = g.attributes.normal;
    const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const n = pos.count;
    const flow = new Float32Array(n * 2), axis = new Float32Array(n * 3), curv = new Float32Array(n);
    const p = new THREE.Vector3(), q = new THREE.Vector3(), nn = new THREE.Vector3(), T = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      if (i % 700 === 699) await tick(`flow ${name}`);
      p.fromBufferAttribute(pos, i);
      nn.fromBufferAttribute(nor, i);
      if (name === 'Hair' || name === 'Hairpin') {
        q.subVectors(p, headC);
        const qn = q.clone().normalize();
        const az = Math.atan2(q.dot(hairB1), q.dot(hairB2));
        const pol = Math.acos(THREE.MathUtils.clamp(-qn.dot(hairA), -1, 1));
        flow[i * 2] = az * 0.1; flow[i * 2 + 1] = pol * 0.1;
        T.copy(hairA).addScaledVector(nn, -hairA.dot(nn));
        if (T.lengthSq() < 1e-6) T.copy(hairB2);
        T.normalize();
        const qb = p.clone().sub(bunC);
        if (qb.length() < 0.05 && qb.dot(bunAx) > -0.022) {
          // the bun: a coil, so the lines run round it in a spiral
          const h = qb.dot(bunAx);
          const rad = qb.clone().addScaledVector(bunAx, -h);
          const r = rad.length();
          const th = Math.atan2(rad.dot(bunV), rad.dot(bunU));
          const lane = (r + h * 0.35 - 0.0065 * (th / (Math.PI * 2))) / 0.0065;
          flow[i * 2] = lane / 26; flow[i * 2 + 1] = 0.2;
          T.crossVectors(bunAx, rad.normalize()).normalize();
        }
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
      }
      axis[i * 3] = T.x; axis[i * 3 + 1] = T.y; axis[i * 3 + 2] = T.z;
    }
    // hollowness: how far the neighbours sit above this vertex's tangent plane
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
      // smooth it twice over the mesh, then scale to 0..1 (positive = hollow)
      await tick(`curvature ${name}`);
      for (let pass = 0; pass < 3; pass++) {
        const acc = new Float32Array(n), c2 = new Float32Array(n);
        for (let t = 0; t < idx.length; t += 3) {
          for (const [i, j] of [[idx[t], idx[t + 1]], [idx[t + 1], idx[t + 2]], [idx[t + 2], idx[t]]]) {
            acc[i] += curv[j]; c2[i]++; acc[j] += curv[i]; c2[j]++;
          }
        }
        for (let i = 0; i < n; i++) curv[i] = c2[i] ? curv[i] * 0.4 + 0.6 * acc[i] / c2[i] : curv[i];
      }
      for (let i = 0; i < n; i++) curv[i] = THREE.MathUtils.clamp(curv[i] * 4.0, 0, 1);
    }
    g.setAttribute('aFlow', new THREE.BufferAttribute(flow, 2));
    g.setAttribute('aAxis', new THREE.BufferAttribute(axis, 3));
    g.setAttribute('aCurv', new THREE.BufferAttribute(curv, 1));
  }

  await tick('flow');
  // ---------------------------------------------------------------- materials: the whole outfit is one mesh, its lines one hull
  const LOOKS = Object.entries(LOOK).map(([name, look]) => ({
    name, ...look, push: look.push ?? 0, legs: name === 'AoDai', hang: name === 'AoDai' ? hipY - 0.05 : -9, twoSided: name === 'AoDai' || name === 'Scarf',
  }));
  const table = materialTable(LOOKS);
  const matOf = Object.fromEntries(LOOKS.map((l, i) => [l.name, i]));
  const depthMat = depthMaterial(table);
  const sets = [];
  const parts = [];
  let first = null;
  for (const L of LOOKS) {
    const m = meshes[L.name];
    if (!m) { console.warn('missing mesh', L.name); continue; }
    const g = m.geometry;
    const n = g.attributes.position.count;
    const ac = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) ac[i * 4] = -1;
    g.setAttribute('aCloth', new THREE.BufferAttribute(ac, 4));
    g.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(n), 1));
    const shrink = new Float32Array(n), pushW = new Float32Array(n);
    if (L.name === 'Pants') {
      // under the tà (front and back, away from the slits) the trousers sit 1.3 cm further in, and further back in depth
      const pp = g.attributes.position;
      for (let i = 0; i < n; i++) {
        const x = Math.abs(pp.getX(i)), y = pp.getY(i);
        shrink[i] = 0.013 * sm(0.215, 0.13, x) * sm(hemY - 0.01, hemY + 0.04, y) * sm(waistY - 0.02, waistY - 0.07, y);
        pushW[i] = sm(hemY - 0.03, hemY + 0.02, y);
      }
    }
    g.setAttribute('aShrink', new THREE.BufferAttribute(shrink, 1));
    g.setAttribute('aPushW', new THREE.BufferAttribute(pushW, 1));
    g.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(n).fill(matOf[L.name]), 1));
    await flowAttributes(m, L.name);
    await tick(`part ${L.name}`);
    // the part itself stays for the checks and the layout (never drawn)
    m.visible = false;
    m.castShadow = false;
    m.userData.castShadow = false;
    if (!first) first = m;
    else if (!m.bindMatrix.equals(first.bindMatrix) || !m.matrix.equals(first.matrix)) console.warn('part not in the outfit space', L.name);
    parts.push(m);
  }
  await tick('parts');
  // ---------------------------------------------------------------- the cloth grid: tà (front, back), scarf end, loose strands
  // (laid on the parts BEFORE they are merged: the merged outfit and its hull copy the cloth data from them)
  // Each node follows a skinned anchor vertex with a spring; the page adds node offsets to the vertices around it.
  const nodes = [];      // { mesh, vi, j, nv, k, p, v, t }
  let nodeCount = 0;
  const nodeBase = CLOTH.next;
  const grids = [];
  async function addGrid({ mesh, pick, nu, nv, uOf, vOf, wOf, stiff, out = V3(0, 0, -1), legs = false, clamp = false }) {
    const g = mesh.geometry;
    const pos = g.attributes.position;
    const ac = g.attributes.aCloth.array, aw = g.attributes.aClothW.array;
    const start = nodeBase + nodeCount;
    const verts = [];
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i);
      if (!pick(_v, i)) continue;
      verts.push(i);
    }
    if (!verts.length) return null;
    const uv = new Map();
    for (const i of verts) {
      _v.fromBufferAttribute(pos, i);
      const u = clamp01(uOf(_v)), v = clamp01(vOf(_v));
      uv.set(i, [u, v]);
      ac[i * 4] = start; ac[i * 4 + 1] = u * (nu - 1); ac[i * 4 + 2] = Math.min(v * (nv - 1), nv - 1.0001); ac[i * 4 + 3] = nu;
      aw[i] = wOf(_v);
    }
    // anchors: the grid vertex nearest to each node's (u, v)
    for (let j = 0; j < nv; j++) for (let k = 0; k < nu; k++) {
      const tu = nu > 1 ? k / (nu - 1) : 0.5, tv = j / (nv - 1);
      let best = -1, bd = 1e9;
      for (const i of verts) { const [u, v] = uv.get(i); const d = (u - tu) ** 2 + (v - tv) ** 2 * 1.5; if (d < bd) { bd = d; best = i; } }
      nodes.push({ mesh, vi: best, j, nv, k, nu, stiff: stiff(tv), p: new THREE.Vector3(), v: new THREE.Vector3(), t: new THREE.Vector3(), start, out, legs, clamp });
    }
    nodeCount += nu * nv;
    g.attributes.aCloth.needsUpdate = true;
    g.attributes.aClothW.needsUpdate = true;
    grids.push({ start, nu, nv });
    await tick('cloth grid');
    return start;
  }
  const ad = meshes.AoDai;
  if (ad) {
    const pos = ad.geometry.attributes.position;
    // per-height extent of each tà, to spread u across its width
    const extent = (front) => {
      const bins = new Map();
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i), z = pos.getZ(i), x = pos.getX(i);
        if (y > waistY - 0.004 || (z > 0) !== front) continue;
        const key = Math.round(y * 60);
        const e = bins.get(key) ?? [1e9, -1e9];
        e[0] = Math.min(e[0], x); e[1] = Math.max(e[1], x);
        bins.set(key, e);
      }
      return (v) => bins.get(Math.round(v.y * 60)) ?? [-0.2, 0.2];
    };
    for (const front of [true, false]) {
      const ex = extent(front);
      await addGrid({
        mesh: ad, nu: 7, nv: 13,
        pick: (v) => v.y < waistY - 0.004 && (v.z > 0) === front,
        uOf: (v) => { const e = ex(v); return (v.x - e[0]) / Math.max(1e-3, e[1] - e[0]); },
        vOf: (v) => (waistY - v.y) / (waistY - hemY),
        wOf: (v) => 0.15 + 0.85 * sm(hipY + 0.03, hemY, v.y),
        stiff: (tv) => (tv < 0.05 ? 1e9 : 90 * Math.pow(1 - tv, 2.2) + 7),
        out: V3(0, 0, front ? 1 : -1), legs: true,
      });
    }
  }
  const scarf = meshes.Scarf;
  const collarY = P('neck_01').y - 0.012;
  if (scarf) {
    await addGrid({
      mesh: scarf, nu: 2, nv: 5,
      pick: (v) => v.y < collarY - 0.045 && v.z < headC.z - 0.03,
      uOf: (v) => (v.x - 0.02) / 0.1,
      vOf: (v) => (collarY - 0.045 - v.y) / 0.25,
      wOf: (v) => sm(collarY - 0.05, collarY - 0.28, v.y),
      stiff: (tv) => (tv < 0.05 ? 1e9 : 60 * Math.pow(1 - tv, 2) + 10),
      clamp: true,
    });
  }
  const hair = meshes.Hair;
  if (hair) {
    const bunC = headC.clone().add(V3(0, -0.07, -0.1));
    await addGrid({     // the strand at the temple, on our side
      mesh: hair, nu: 1, nv: 4,
      pick: (v) => v.x < -0.074 && v.y < headC.y - 0.035 && v.z > headC.z - 0.005,
      uOf: () => 0, vOf: (v) => (headC.y - 0.03 - v.y) / 0.07,
      wOf: (v) => sm(headC.y - 0.035, headC.y - 0.1, v.y),
      stiff: (tv) => (tv < 0.05 ? 1e9 : 40 * (1 - tv) + 8),
    });
    await addGrid({     // the strands at the nape
      mesh: hair, nu: 1, nv: 4,
      pick: (v) => v.y < headC.y - 0.085 && v.distanceTo(bunC) > 0.05 && v.z < headC.z,
      uOf: () => 0, vOf: (v) => (headC.y - 0.075 - v.y) / 0.06,
      wOf: (v) => sm(headC.y - 0.08, headC.y - 0.135, v.y),
      stiff: (tv) => (tv < 0.05 ? 1e9 : 40 * (1 - tv) + 8),
    });
  }
  CLOTH.next += nodeCount;
  console.assert(CLOTH.next <= NCLOTH, 'too many cloth nodes');

  const outfitGeo = mergeGeometries(parts.map((m) => m.geometry), false);
  const outfit = new THREE.SkinnedMesh(outfitGeo, paintMaterial(table, { headC, side: THREE.DoubleSide }));
  outfit.name = 'Outfit';
  outfit.bind(first.skeleton, first.bindMatrix);
  outfit.position.copy(first.position); outfit.quaternion.copy(first.quaternion); outfit.scale.copy(first.scale);
  outfit.frustumCulled = false;
  outfit.renderOrder = 2;
  outfit.castShadow = true;
  outfit.receiveShadow = true;
  outfit.customDepthMaterial = depthMat;
  outfit.userData.shadowMaterial = depthMat;
  first.parent.add(outfit);
  // the hull: the coarse shells from the file, each vertex taking the cloth and hollow data of the nearest outfit vertex
  const hullParts = [];
  for (const L of LOOKS) {
    const h = meshes['Hull' + L.name];
    if (!h || !L.ink) { if (h) h.visible = false; continue; }
    h.visible = false;
    const src = meshes[L.name].geometry;
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
    const at = { aCloth: [4], aClothW: [1], aShrink: [1], aPushW: [1], aCurv: [1] };
    const out = {};
    for (const k of Object.keys(at)) out[k] = new Float32Array(n * at[k][0]);
    await tick(`hull grid ${L.name}`);
    for (let i = 0; i < n; i++) {
      if (i % 250 === 249) await tick(`hull ${L.name}`);
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
        const w = at[k][0], sa = src.attributes[k].array;
        for (let q = 0; q < w; q++) out[k][i * w + q] = sa[best * w + q];
      }
    }
    for (const k of Object.keys(at)) g.setAttribute(k, new THREE.BufferAttribute(out[k], at[k][0]));
    g.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(n).fill(matOf[L.name]), 1));
    if (!h.bindMatrix.equals(first.bindMatrix) || !h.matrix.equals(first.matrix)) console.warn('hull not in the outfit space', L.name);
    hullParts.push(g);
  }
  await tick('hull parts');
  const hullOne = mergeGeometries(hullParts.map((g) => {
    const c = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'skinIndex', 'skinWeight', 'aCloth', 'aClothW', 'aShrink', 'aPushW', 'aCurv', 'aMat']) c.setAttribute(k, g.attributes[k]);
    c.setIndex(g.index);
    return c;
  }), false);
  // three layers, drawn in this order so the ink lies over the bands where they meet: mint, vermilion, ink
  const layers = [2, 1, 0].map((layer) => {
    const c = hullOne.clone();
    c.setAttribute('aLayer', new THREE.BufferAttribute(new Float32Array(c.attributes.position.count).fill(layer), 1));
    return c;
  });
  const hullGeo = mergeGeometries(layers, false);
  const hull = new THREE.SkinnedMesh(hullGeo, hullMaterial(table));
  hull.name = 'OutfitLines';
  hull.bind(first.skeleton, first.bindMatrix);
  hull.position.copy(outfit.position); hull.quaternion.copy(outfit.quaternion); hull.scale.copy(outfit.scale);
  hull.frustumCulled = false;
  hull.renderOrder = 1;
  hull.userData.castShadow = false;
  first.parent.add(hull);
  sets.push({ name: 'Outfit', mesh: outfit, extra: [hull] });


  // ---------------------------------------------------------------- acting lines (fold ink), laid on the cloth; the card moves them, the widths change per drawing
  const folds = [];
  // the columns round the trouser legs (world), from the hip joint along the thigh and shin to the ankle
  const legAxis = {};
  for (const s of ['l', 'r']) {
    const sx = s === 'l' ? 1 : -1;
    const A = P(`thigh_${s}`).add(V3(sx * 0.012, 0, -0.004));
    const Cc = P(`foot_${s}`).add(V3(sx * 0.014, 0, -0.012));
    const kneeY = P(`calf_${s}`).y;
    const Bk = A.clone().lerp(Cc, (kneeY - A.y) / (Cc.y - A.y));
    const inBone = (n, w) => w.clone().sub(rest[n].wp).applyQuaternion(rest[n].wq.clone().invert());
    legAxis[s] = { A: inBone(`thigh_${s}`, A), B: inBone(`calf_${s}`, Bk), C: inBone(`foot_${s}`, Cc) };
  }
  function setLegColumns() {
    for (const [k2, s] of [[0, 'l'], [1, 'r']]) {
      PU.uLegA.value[k2].copy(B[`thigh_${s}`].localToWorld(legAxis[s].A.clone()));
      PU.uLegB.value[k2].copy(B[`calf_${s}`].localToWorld(legAxis[s].B.clone()));
      PU.uLegC.value[k2].copy(B[`foot_${s}`].localToWorld(legAxis[s].C.clone()));
    }
  }
  const _lc1 = new THREE.Vector3(), _lc2 = new THREE.Vector3(), _ld = new THREE.Vector3(), _lq = new THREE.Vector3();
  const segClosest = (p, a, b, out) => {
    _ld.subVectors(b, a);
    const t = clamp01(_v2.subVectors(p, a).dot(_ld) / Math.max(_ld.lengthSq(), 1e-8));
    return out.copy(a).addScaledVector(_ld, t);
  };
  function legPushJS(p, restY) {
    const top = PU.uLegTop.value, R_ = PU.uLegR.value;
    const w = sm(top, top - 0.09, restY);
    if (w <= 0) return p;
    for (let i = 0; i < 2; i++) {
      segClosest(p, PU.uLegA.value[i], PU.uLegB.value[i], _lc1);
      segClosest(p, PU.uLegB.value[i], PU.uLegC.value[i], _lc2);
      const c = p.distanceToSquared(_lc1) < p.distanceToSquared(_lc2) ? _lc1 : _lc2;
      _ld.subVectors(p, c);
      const l = _ld.length();
      if (l < R_) {
        if (l > 1e-4) _ld.divideScalar(l); else _ld.set(0, 0, 1);
        p.copy(c).addScaledVector(_ld, l + (R_ - l) * w);
      }
    }
    return p;
  }
  const segKeyOf = (mesh, i) => {
    const g = mesh.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
    return (segOf[best] ?? SEGS.torso).key;
  };
  function nearest(mesh, p, ok) {
    const pos = mesh.geometry.attributes.position;
    let best = -1, bd = 1e9;
    for (let i = 0; i < pos.count; i++) {
      if (!ok(i)) continue;
      const d = (pos.getX(i) - p.x) ** 2 + (pos.getY(i) - p.y) ** 2 + (pos.getZ(i) - p.z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  // the vertex a ray from behind (or in front) meets first at (x, y)
  function surface(mesh, x, y, backSide, ok) {
    const pos = mesh.geometry.attributes.position;
    for (const r of [0.012, 0.02, 0.03]) {
      let best = -1, bz = backSide ? 1e9 : -1e9;
      for (let i = 0; i < pos.count; i++) {
        if (!ok(i)) continue;
        if (Math.abs(pos.getX(i) - x) > r || Math.abs(pos.getY(i) - y) > r) continue;
        const z = pos.getZ(i);
        if (backSide ? z < bz : z > bz) { bz = z; best = i; }
      }
      if (best >= 0) return best;
    }
    return -1;
  }
  // (the searches are queued and run after, a fold at a time, so the build gives the page back in between)
  const foldsAsked = [];
  function addFold(mesh, idx, width, weight, { cloth = false } = {}) {
    foldsAsked.push({ mesh, idx, width, weight, cloth });
  }
  const nearestL = (...a) => () => nearest(...a);
  const surfaceL = (...a) => () => surface(...a);
  const torsoOk = (i) => segKeyOf(ad, i) === 'torso' && adPos.getY(i) > waistY - 0.03;
  const adPos = ad.geometry.attributes.position;
  const bandZ = (i) => adPos.getZ(i);
  // measures of the drawing, read after it is posed
  const M = { bend: { l: 0, r: 0 }, raise: { l: 0, r: 0 }, reach: { l: 0, r: 0 }, twist: 0, lean: 0, fwd: 0 };
  const wp = (n) => B[n].getWorldPosition(new THREE.Vector3());
  function measure() {
    const up = V3(0, 1, 0).applyQuaternion(root.getWorldQuaternion(rootQ));
    const fw = V3(0, 0, 1).applyQuaternion(rootQ);
    const neck = wp('neck_01'), pel = wp('pelvis');
    const down = pel.clone().sub(neck).normalize();
    for (const s of ['l', 'r']) {
      const U = wp(`upperarm_${s}`), L = wp(`lowerarm_${s}`), H = wp(`hand_${s}`);
      const u = L.clone().sub(U).normalize(), l = H.clone().sub(L).normalize();
      M.bend[s] = Math.acos(THREE.MathUtils.clamp(u.dot(l), -1, 1));
      M.raise[s] = Math.acos(THREE.MathUtils.clamp(u.dot(down), -1, 1));
      M.reach[s] = Math.max(0, u.dot(fw));
    }
    const sh = wp('upperarm_l').sub(wp('upperarm_r')), hp = wp('thigh_l').sub(wp('thigh_r'));
    const sa = Math.atan2(sh.dot(fw), sh.dot(V3(1, 0, 0).applyQuaternion(rootQ)));
    const ha = Math.atan2(hp.dot(fw), hp.dot(V3(1, 0, 0).applyQuaternion(rootQ)));
    M.twist = sa - ha;
    M.lean = Math.atan2(sh.dot(up), sh.length());
    M.fwd = Math.acos(THREE.MathUtils.clamp(-down.dot(up), -1, 1));
  }
  const smr = (a, b, x) => sm(a, b, x);
  for (const s of ['l', 'r']) {
    const sx = s === 'l' ? 1 : -1;
    const U = P(`upperarm_${s}`), E = P(`lowerarm_${s}`), Hd = P(`hand_${s}`);
    const u0 = E.clone().sub(U).normalize(), l0 = Hd.clone().sub(E).normalize();
    let inner = l0.clone().addScaledVector(u0, -l0.dot(u0));
    if (inner.lengthSq() < 1e-4) inner = V3(0, 0, 1).addScaledVector(u0, -u0.z);
    inner.normalize();
    const side = new THREE.Vector3().crossVectors(u0, inner).normalize();
    const armOk = (i) => { const k = segKeyOf(ad, i); return k === `upper_${s}` || k === `lower_${s}`; };
    // elbow creases: three short arcs on the inside of the bend
    [[-0.02, 0.9, 1.0], [0.0, 1.15, 1.25], [0.022, 0.8, 0.9]].forEach(([off, span, wmul], k) => {
      const idx = [];
      for (let a = 0; a <= 6; a++) {
        const t = -span / 2 + (span * a) / 6;
        const pt = E.clone().addScaledVector(u0, off + 0.008 * t + 0.004 * k).addScaledVector(inner, Math.cos(t) * 0.07).addScaledVector(side, Math.sin(t) * 0.07);
        idx.push(nearestL(ad, pt, armOk));
      }
      addFold(ad, idx, 2.4 * wmul, () => smr(0.55, 1.35, M.bend[s]));
    });
    // armpit: pulled cloth on the back when the arm goes up
    [[[0.11, -0.045], [0.097, -0.085], [0.078, -0.13]], [[0.128, -0.085], [0.106, -0.132], [0.088, -0.178]]].forEach((pts, k) => {
      addFold(ad, pts.map(([x, y]) => surfaceL(ad, sx * x, U.y + y, true, torsoOk)), 2.6 - 0.5 * k, () => smr(1.0, 2.0, M.raise[s]));
    });
    // reaching forward: the back stretches from the shoulder blade toward the other hip
    addFold(ad, [[0.1, -0.05], [0.07, -0.1], [0.035, -0.16], [0.0, -0.22], [-0.025, -0.28]].map(([x, y]) => surfaceL(ad, sx * x, U.y + y, true, torsoOk)),
      2.2, () => smr(0.35, 0.8, M.reach[s]) * smr(0.7, 1.3, M.raise[s]));
    // the top of the shoulder bunches when the arm is raised high
    addFold(ad, [[0.17, 0.0], [0.145, 0.018], [0.115, 0.03]].map(([x, y]) => surfaceL(ad, sx * x, U.y + y, true, (i) => adPos.getY(i) > U.y - 0.05)),
      2.0, () => smr(1.6, 2.4, M.raise[s]));
    // the slit: a small gather where the tà leave the body
    addFold(ad, [[0.0, 0.01], [0.004, -0.012], [0.01, -0.035]].map(([x, y]) => {
      const pt = V3(sx * (0.155 + x), waistY + y, -0.02);
      return nearestL(ad, pt, (i) => Math.abs(adPos.getY(i) - pt.y) < 0.02);
    }), 1.8, () => 0.8);
    // trousers: one soft crease down the back of each leg
    const pants = meshes.Pants;
    const pp = pants.geometry.attributes.position;
    const legX = P(`thigh_${s}`).x + sx * 0.014;
    addFold(pants, [0.2, 0.16, 0.12, 0.085, 0.05].map((y) => surfaceL(pants, legX + sx * 0.01 * (0.2 - y) * 5, y, true, (i) => pp.getY(i) < 0.21)), 1.8, () => 0.75);
  }
  // the waist, from behind: turns and bends gather the silk
  const W = waistY;
  [[[-0.07, 0.07], [0.0, 0.045], [0.06, 0.025]], [[-0.05, 0.125], [0.02, 0.1], [0.075, 0.075]], [[-0.085, 0.02], [-0.02, 0.0], [0.04, -0.012]]].forEach((pts, k) => {
    addFold(ad, pts.map(([x, y]) => surfaceL(ad, x, W + y, true, torsoOk)), 2.4 - 0.3 * k, () => smr(0.08, 0.26, Math.abs(M.twist)) * 0.9 + smr(0.12, 0.35, M.fwd) * 0.5);
  });
  // the back tà: long folds that come and go with the breeze
  {
    const backOk = (i) => adPos.getY(i) < waistY - 0.004 && adPos.getZ(i) < 0;
    const bins = new Map();
    for (let i = 0; i < adPos.count; i++) {
      if (!backOk(i)) continue;
      const key = Math.round(adPos.getY(i) * 60);
      const e = bins.get(key) ?? [1e9, -1e9];
      e[0] = Math.min(e[0], adPos.getX(i)); e[1] = Math.max(e[1], adPos.getX(i));
      bins.set(key, e);
    }
    [[0.22, 0.0, 1.9], [0.5, 0.06, 2.3], [0.8, -0.03, 1.8]].forEach(([u, dy, w]) => {
      const idx = [];
      for (let k = 0; k <= 6; k++) {
        const y = hipY - 0.1 + dy + ((hemY + 0.04) - (hipY - 0.1 + dy)) * (k / 6);
        const e = bins.get(Math.round(y * 60)) ?? [-0.15, 0.15];
        idx.push(surfaceL(ad, e[0] + (e[1] - e[0]) * u, y, true, backOk));
      }
      addFold(ad, idx, w, (off) => 0.45 + Math.min(0.55, off * 18), { cloth: true });
    });
  }
  // geometry: two vertices per point, each a copy of its cloth vertex (bones, cloth node, material), the line's direction as its normal
  for (const fa of foldsAsked) {
    const idx = fa.idx.map((v) => (typeof v === 'function' ? v() : v));
    const clean = idx.filter((v, k) => v >= 0 && v !== idx[k - 1]);
    if (clean.length >= 2) folds.push({ mesh: fa.mesh, idx: clean, width: fa.width, weight: fa.weight, cloth: fa.cloth, w: 0 });
    await tick('fold');
  }
  console.assert(folds.length <= NFOLD, 'too many fold lines');
  const foldMat = foldMaterial(table);
  const foldMesh = (() => {
    let nPts = 0;
    for (const f of folds) nPts += f.idx.length;
    const nV = nPts * 2;
    const pos = new Float32Array(nV * 3), nrm = new Float32Array(nV * 3), info = new Float32Array(nV * 3);
    const si = new Uint16Array(nV * 4), sw = new Float32Array(nV * 4), ac = new Float32Array(nV * 4), aw = new Float32Array(nV), mat = new Float32Array(nV);
    const index = [];
    let v = 0;
    folds.forEach((f, fi) => {
      const g = f.mesh.geometry;
      const P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, AC = g.attributes.aCloth, AW = g.attributes.aClothW, AM = g.attributes.aMat;
      const n = f.idx.length;
      for (let k = 0; k < n; k++) {
        const i = f.idx[k], ia = f.idx[Math.max(0, k - 1)], ib = f.idx[Math.min(n - 1, k + 1)];
        const dx = P.getX(ib) - P.getX(ia), dy = P.getY(ib) - P.getY(ia), dz = P.getZ(ib) - P.getZ(ia);
        const dl = Math.hypot(dx, dy, dz) || 1;
        if (k < n - 1) index.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
        for (const side of [-1, 1]) {
          pos[v * 3] = P.getX(i); pos[v * 3 + 1] = P.getY(i); pos[v * 3 + 2] = P.getZ(i);
          nrm[v * 3] = dx / dl; nrm[v * 3 + 1] = dy / dl; nrm[v * 3 + 2] = dz / dl;
          info[v * 3] = side; info[v * 3 + 1] = k / (n - 1); info[v * 3 + 2] = fi;
          for (let q = 0; q < 4; q++) { si[v * 4 + q] = SI.getComponent(i, q); sw[v * 4 + q] = SW.getComponent(i, q); ac[v * 4 + q] = f.cloth ? AC.array[i * 4 + q] : (q === 0 ? -1 : 0); }
          aw[v] = f.cloth ? AW.array[i] : 0;
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
    m.userData.castShadow = false;
    first.parent.add(m);
    return m;
  })();
  const _co1 = new THREE.Vector3(), _co2 = new THREE.Vector3();
  const clothOffsetOf = (mesh, i, out, base = null) => {
    out.set(0, 0, 0);
    const ac = mesh.geometry.attributes.aCloth.array, aw = mesh.geometry.attributes.aClothW.array;
    if (ac[i * 4] >= 0) {
      const nu = ac[i * 4 + 3], st = ac[i * 4];
      const i0 = Math.floor(ac[i * 4 + 1]), j0 = Math.floor(ac[i * 4 + 2]);
      const fi = ac[i * 4 + 1] - i0, fj = ac[i * 4 + 2] - j0;
      const i1 = Math.min(i0 + 1, nu - 1);
      const C = PU.uCloth.value;
      const a = C[st + j0 * nu + i0], b = C[st + j0 * nu + i1], c = C[st + (j0 + 1) * nu + i0], d = C[st + (j0 + 1) * nu + i1];
      if (a && b && c && d) {
        const top = _co1.copy(a).lerp(b, fi);
        out.copy(c).lerp(d, fi).sub(top).multiplyScalar(fj).add(top).multiplyScalar(aw[i]);
      }
    }
    if (base && mesh === ad) {
      const q = _co2.copy(base).add(out);
      const restY = mesh.geometry.attributes.position.getY(i);
      legPushJS(q, restY);
      out.subVectors(q, base);
    }
    return out;
  };
  const _off = new THREE.Vector3();
  // the widths: the pose's lines once per drawing, the cloth's lines with the cloth
  function updateFolds(clothOnly) {
    const W = foldMat.uniforms.uFoldW.value;
    folds.forEach((f, fi) => {
      if (clothOnly && !f.cloth) return;
      let offMax = 0;
      if (f.cloth) for (let k = 0; k < f.idx.length; k += 2) offMax = Math.max(offMax, clothOffsetOf(f.mesh, f.idx[k], _off).length());
      W[fi] = f.width * THREE.MathUtils.clamp(f.weight(offMax), 0, 1.3);
    });
  }

  await tick('folds');
  // ---------------------------------------------------------------- hands: rest frames, grips, finger curl axes
  const hand = {};
  for (const s of ['l', 'r']) {
    const h = rest[`hand_${s}`];
    const across = P(`pinky_01_${s}`).sub(P(`index_01_${s}`)).normalize();
    const fwd = P(`middle_01_${s}`).sub(h.wp).normalize();
    let palm = new THREE.Vector3().crossVectors(fwd, across).normalize();
    // the fingers are a little curled at rest: that bend points to the palm
    const bend = P(`middle_03_${s}`).sub(P(`middle_01_${s}`)).normalize().addScaledVector(fwd, -1);
    if (bend.dot(palm) < 0) palm.negate();
    const inv = h.wq.clone().invert();
    const f0 = fwd.clone().applyQuaternion(inv), p0 = palm.clone().applyQuaternion(inv);
    // the grip: the middle of the closed fist, in hand space
    const gripW = h.wp.clone().lerp(P(`middle_01_${s}`), 0.85).addScaledVector(palm, 0.028).addScaledVector(across, 0.012);
    const grip = gripW.sub(h.wp).applyQuaternion(inv);
    // the pinch point between index and middle fingertips
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
    hand[s] = { f0, p0, grip, pinch, fingers, restHandQ: basis(f0, p0) };
  }
  // arm rest: bone axes and the elbow hinge, in each bone's own space
  const arm = {};
  for (const s of ['l', 'r']) {
    const U = rest[`upperarm_${s}`], L = rest[`lowerarm_${s}`], H = rest[`hand_${s}`];
    const u0 = L.wp.clone().sub(U.wp), l0 = H.wp.clone().sub(L.wp);
    const hinge = new THREE.Vector3().crossVectors(u0, l0).normalize();
    arm[s] = {
      l1: u0.length(), l2: l0.length(),
      uLocal: basis(u0.clone().applyQuaternion(U.wq.clone().invert()), hinge.clone().applyQuaternion(U.wq.clone().invert())),
      lLocal: basis(l0.clone().applyQuaternion(L.wq.clone().invert()), hinge.clone().applyQuaternion(L.wq.clone().invert())),
      hingeSign: 1,
    };
  }

  await tick('hands');
  // ---------------------------------------------------------------- props: the peach branch, the banknote, the bag
  const holds = {};
  let stemCurve = null;
  // a point on the real stem, s metres above the branch origin (the origin is 0.1 m above the cut end), and the stem direction there
  const stemAt = (sv, outP, outT) => { const u = THREE.MathUtils.clamp((sv + 0.1) / stemCurve.getLength(), 0, 1); stemCurve.getPointAt(u, outP); if (outT) stemCurve.getTangentAt(u, outT); return outP; };
  {
    const b = new D.Batch({ wind: true });
    const bsw = (x, y) => Math.max(0, y - 0.18) * 0.28;
    // record the first random numbers: they bend the stem, and the hands must hold the stem where it really is
    const rec = [];
    const Rw = () => { const v = R(); rec.push(v); return v; };
    const base = V3(0, -0.1, 0), dir0 = V3(0.04, 1, 0.06), blen = 0.92;
    D.peachBranch(b, base, dir0, blen, Rw, { twigs: 7, bloom: 95, petal: 0.036, sway: bsw, tree: 3, thick: 0.012 });
    const d0 = dir0.clone().normalize();
    const side = new THREE.Vector3().crossVectors(d0, V3(0.3, 0.2, 1).normalize()).normalize();
    const pts = [base.clone()];
    for (let i = 1; i <= 5; i++) {
      const t = i / 5;
      pts.push(base.clone().addScaledVector(d0, blen * t).addScaledVector(side, Math.sin(t * 5 + rec[i - 1] * 2) * blen * 0.05));
    }
    stemCurve = new THREE.CatmullRomCurve3(pts);
    holds.branch = D.hero(b.merge(), { wind: true, rims: false });
    holds.branch.traverse((o) => { if (o.isMesh && o === holds.branch.userData.main) o.castShadow = true; });
    root.add(holds.branch);
  }
  await tick('branch');
  {
    // a polymer banknote of the early 2000s: blue-green, a clear window, bent a little between the fingers
    const g = new THREE.PlaneGeometry(0.15, 0.068, 12, 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, 0.012 * Math.cos((x / 0.15) * Math.PI) - 0.004); }
    g.computeVertexNormals();
    const nb = new D.Batch();
    nb.add(g, { col: '#1d5e6c', col2: '#8cd6d2', erode: 0, hilite: 0.5, scale: 18, bump: 0.3, smooth: true });
    nb.add(new THREE.PlaneGeometry(0.03, 0.03).translate(0.05, 0.004, 0.012), { col: '#8a7a50', col2: '#f2e6c0', erode: 0, hilite: 0.2, scale: 18, bump: 0.3 });
    holds.note = D.hero(nb.merge(), { rims: false });
    holds.note.traverse((o) => { if (o.material) o.material.side = THREE.DoubleSide; });
    holds.note.userData.main.castShadow = true;
    root.add(holds.note);
  }
  await tick('note');
  // a small leather bag worn across the body: strap over her left shoulder, bag at her right hip.
  // It is an open box with a flap hinged on the body side; her hand lifts the flap and goes in through the mouth.
  const BAG = { L: 0.16, H: 0.11, T: 0.064, w: 0.005, lip: 0.016 };
  {
    const leather = { col: '#2a1610', col2: '#a0704c', gloss: 0.6, hilite: 0.6, scale: 8, bump: 0.7, erode: 0.2 };
    const inner = { col: '#140a08', col2: '#3a2418', gloss: 0.1, hilite: 0.1, scale: 8, bump: 0.5, erode: 0 };
    const { L, H, T, w } = BAG;
    const bb = new D.Batch();
    for (const zs of [-1, 1]) bb.box(L, H, w, V3(0, -H / 2, zs * (T / 2 - w / 2)), leather);
    for (const xs of [-1, 1]) bb.box(w, H, T - 2 * w, V3(xs * (L / 2 - w / 2), -H / 2, 0), leather);
    bb.box(L, w, T, V3(0, -H + w / 2, 0), leather);
    bb.box(L - 2 * w, 0.002, T - 2 * w, V3(0, -H + w + 0.001, 0), inner);
    for (const xs of [-1, 1]) bb.cyl(0.006, 0.006, 0.004, V3(xs * (L / 2 + 0.002), -0.006, 0), { col: '#6a5020', col2: '#f0d080', gloss: 1, hilite: 1, scale: 20 }, 10, [0, 0, Math.PI / 2]);
    const body = D.hero(bb.merge(), { rims: false });
    body.userData.main.material.side = THREE.DoubleSide;
    body.userData.main.castShadow = true;
    const fb = new D.Batch();
    fb.box(L + 0.004, w, T + 0.004, V3(0, w / 2, T / 2 + 0.002), leather);
    fb.box(L + 0.004, BAG.lip, w, V3(0, -BAG.lip / 2 + w, T + 0.002 + w / 2), leather);
    fb.cyl(0.006, 0.006, 0.004, V3(0, -0.006, T + 0.002 + w + 0.002), { col: '#6a5020', col2: '#f0d080', gloss: 1, hilite: 1, scale: 20 }, 12, [Math.PI / 2, 0, 0]);
    const flap = D.hero(fb.merge(), { rims: false });
    flap.userData.main.castShadow = true;
    const hinge = new THREE.Group();
    hinge.position.set(0, 0, -T / 2);
    hinge.add(flap);
    holds.bag = new THREE.Group();
    holds.bag.add(body, hinge);
    holds.bagFlap = hinge;
    root.add(holds.bag);
  }
  await tick('bag');
  const strapTable = materialTable([{ kind: 'leather', col: '#24120c', col2: '#8a5a3a', hatch: '#120806', scale: 20, gloss: 0.5, hatchAmt: 0.3 }]);
  const strapMat = paintMaterial(strapTable);
  const strapDepth = depthMaterial(strapTable);
  const strapGeo = new THREE.BufferGeometry();
  const strap = new THREE.Mesh(strapGeo, strapMat);
  strap.frustumCulled = false;
  strap.castShadow = true;
  strap.userData.shadowMaterial = strapDepth;
  strap.customDepthMaterial = strapDepth;
  strap.receiveShadow = true;
  root.add(strap);
  {
    const n = 40 * 8;
    strapGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    strapGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const ac = new Float32Array(n * 4); for (let i = 0; i < n; i++) ac[i * 4] = -1;
    strapGeo.setAttribute('aCloth', new THREE.BufferAttribute(ac, 4));
    strapGeo.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(n), 1));
    strapGeo.setAttribute('aShrink', new THREE.BufferAttribute(new Float32Array(n), 1));
    strapGeo.setAttribute('aFlow', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    strapGeo.setAttribute('aAxis', new THREE.BufferAttribute(new Float32Array(n * 3).fill(0.577), 3));
    strapGeo.setAttribute('aCurv', new THREE.BufferAttribute(new Float32Array(n), 1));
    strapGeo.setAttribute('aPushW', new THREE.BufferAttribute(new Float32Array(n), 1));
    strapGeo.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(n), 1));
    const idx = [];
    for (let i = 0; i < 39; i++) for (let k = 0; k < 8; k++) {
      const a = i * 8 + k, b = i * 8 + ((k + 1) % 8), c = (i + 1) * 8 + k, d = (i + 1) * 8 + ((k + 1) % 8);
      idx.push(a, c, b, b, c, d);
    }
    strapGeo.setIndex(idx);
  }

  await tick('props');
  // ---------------------------------------------------------------- the acting: key drawings, timing, spacing
  // Character space: she faces +z, her left is +x, her right (our side) is -x.
  // Each key: frame (24 fps), body deltas (radians), hand goals, the branch, the fingers, and how the move into it is spaced.
  const n3 = (x, y, z) => V3(x, y, z).normalize();
  const K = [
    { f: 0, name: 'hold', ease: 'hold',
      root: [0, 0, 0], pelvis: [0.02, 0.05, -0.03], spine: [0.05, 0.03, 0.02], neck: [0.12, 0.2, 0.0], head: [0.22, 0.25, 0.05],
      branch: { at: V3(-0.02, 0.98, 0.43), dir: n3(0.1, 1, 0.42), twirl: 0.2 }, grip: { r: 0.02, l: 0.14 },
      fr: 'grip', fl: 'grip', note: 0 },
    { f: 9, name: 'dip', ease: 'in',
      root: [0, -0.014, -0.01], pelvis: [0.03, 0.04, -0.03], spine: [0.13, 0.02, 0.02], neck: [0.16, 0.2, 0], head: [0.26, 0.25, 0.05],
      branch: { at: V3(-0.025, 0.92, 0.42), dir: n3(0.08, 1, 0.38), twirl: 0.1 }, grip: { r: 0.02, l: 0.14 }, fr: 'grip', fl: 'grip', note: 0 },
    { f: 20, name: 'lift', ease: 'snap',
      root: [0, 0.008, 0.01], pelvis: [-0.02, 0.1, -0.05], spine: [-0.17, 0.08, 0.04], neck: [-0.12, 0.22, 0.02], head: [-0.34, 0.3, 0.08],
      branch: { at: V3(0.08, 1.3, 0.3), dir: n3(0.3, 1, 0.26), twirl: 0.4 }, grip: { r: 0.02, l: 0.15 }, fr: 'grip', fl: 'grip', note: 0 },
    { f: 26, name: 'lift-settle', ease: 'out',
      root: [0, 0.004, 0.01], pelvis: [-0.02, 0.1, -0.05], spine: [-0.14, 0.08, 0.04], neck: [-0.1, 0.22, 0.02], head: [-0.3, 0.3, 0.06],
      branch: { at: V3(0.075, 1.28, 0.3), dir: n3(0.28, 1, 0.24), twirl: 0.5 }, grip: { r: 0.02, l: 0.15 }, fr: 'grip', fl: 'grip', note: 0 },
    { f: 38, name: 'turn', ease: 'inout',
      root: [0, 0.004, 0.01], pelvis: [-0.02, 0.14, -0.04], spine: [-0.14, 0.12, 0.06], neck: [-0.1, 0.28, -0.06], head: [-0.26, 0.32, -0.16],
      branch: { at: V3(0.12, 1.3, 0.32), dir: n3(0.4, 1, 0.14), twirl: 1.5 }, grip: { r: 0.02, l: 0.15 }, fr: 'grip', fl: 'grip', note: 0 },
    { f: 52, name: 'turn-back', ease: 'inout',
      root: [0, 0.004, 0.01], pelvis: [-0.02, 0.08, -0.05], spine: [-0.14, 0.05, 0.02], neck: [-0.08, 0.22, 0.08], head: [-0.28, 0.26, 0.16],
      branch: { at: V3(0.06, 1.28, 0.32), dir: n3(0.2, 1, 0.34), twirl: 0.1 }, grip: { r: 0.02, l: 0.15 }, fr: 'grip', fl: 'grip', note: 0 },
    { f: 62, name: 'cradle', ease: 'inout',
      root: [0, 0, 0], pelvis: [0.02, 0.1, -0.03], spine: [0.02, 0.08, 0.03], neck: [0.06, 0.3, 0.04], head: [0.2, 0.26, 0.14],
      branch: { at: V3(0.175, 1.02, 0.27), dir: n3(0.34, 1, 0.1), twirl: 0.4 }, grip: { r: null, l: 0.12 },
      hr: { at: V3(-0.23, 1.02, 0.22), fwd: n3(0.1, -1, 0.5), palm: n3(1, 0, 0.2), pole: n3(-1, 0.1, -0.6) }, fr: 'relax', fl: 'grip', note: 0 },
    { f: 70, name: 'shoulder-up', ease: 'in', pin: true, flap: 1,
      root: [0, 0.004, -0.004], pelvis: [0.03, -0.02, 0.02], spine: [0.04, -0.12, -0.05], neck: [0.06, 0.34, 0.06], head: [0.2, 0.34, 0.16],
      clavR: [0, 0, -0.12],
      branch: { at: V3(0.175, 1.03, 0.27), dir: n3(0.34, 1, 0.08), twirl: 0.4 }, grip: { r: null, l: 0.12 },
      hr: { bagLocal: V3(0, 0.1, 0.02), fwdL: n3(0, -1, 0.0), palmL: n3(0, 0, 1), pole: n3(-1, 0.2, -0.8) }, fr: 'dive', fl: 'grip', note: 0 },
    { f: 76, name: 'into-bag', ease: 'snap', pin: true, flap: 1,
      root: [0, -0.006, 0], pelvis: [0.03, -0.08, 0.05], spine: [0.13, -0.1, -0.06], neck: [0.1, 0.34, 0.04], head: [0.26, 0.34, 0.14],
      clavR: [0, 0, 0.05],
      branch: { at: V3(0.175, 1.02, 0.27), dir: n3(0.34, 1, 0.08), twirl: 0.4 }, grip: { r: null, l: 0.12 },
      hr: { bagLocal: V3(-0.012, -0.03, 0.02), fwdL: n3(0, -1, 0), palmL: n3(0, 0, 1), pole: n3(-1, 0.6, -0.4) }, fr: 'dive', fl: 'grip', note: 0 },
    { f: 86, name: 'rummage', ease: 'hold', pin: true, flap: 1,
      root: [0, -0.006, 0], pelvis: [0.03, -0.08, 0.05], spine: [0.13, -0.1, -0.06], neck: [0.1, 0.34, 0.04], head: [0.26, 0.34, 0.14],
      branch: { at: V3(0.175, 1.02, 0.27), dir: n3(0.34, 1, 0.08), twirl: 0.4 }, grip: { r: null, l: 0.12 },
      hr: { bagLocal: V3(-0.018, -0.04, 0.012), fwdL: n3(-0.06, -1, 0), palmL: n3(0, 0, 1), pole: n3(-1, 0.6, -0.4) }, fr: 'grab', fl: 'grip', note: 0 },
    { f: 91, name: 'lift-out', ease: 'snap', pin: true, flap: 1,
      root: [0, -0.002, 0.004], pelvis: [0.03, -0.05, 0.04], spine: [0.1, -0.07, -0.04], neck: [0.08, 0.32, 0.04], head: [0.22, 0.32, 0.12],
      branch: { at: V3(0.175, 1.02, 0.27), dir: n3(0.34, 1, 0.08), twirl: 0.4 }, grip: { r: null, l: 0.12 },
      hr: { bagLocal: V3(0.01, 0.17, 0.0), fwdL: n3(0.1, -1, 0), palmL: n3(0, 0, 1), pole: n3(-1, 0.4, -0.5) }, fr: 'pinch', fl: 'grip', note: 1 },
    { f: 96, name: 'pull-out', ease: 'snap', flap: 0.25,
      root: [0, 0, 0.01], pelvis: [0.03, 0.0, 0.02], spine: [0.07, -0.02, -0.02], neck: [0.06, 0.3, 0.04], head: [0.14, 0.3, 0.06],
      branch: { at: V3(0.175, 1.03, 0.27), dir: n3(0.34, 1, 0.08), twirl: 0.4 }, grip: { r: null, l: 0.12 },
      hr: { at: V3(-0.195, 1.05, 0.165), fwd: n3(-0.1, 0.8, 0.5), palm: n3(0.7, 0.1, -0.7), pole: n3(-1, -0.5, -0.4) }, fr: 'pinch', fl: 'grip', note: 1 },
    { f: 104, name: 'offer', ease: 'out', flap: 0,
      root: [0, 0.004, 0.035], pelvis: [0.03, 0.08, -0.02], spine: [0.17, 0.1, 0.02], neck: [0.02, 0.18, 0.02], head: [0.04, 0.2, 0.04],
      clavR: [0, 0.16, 0],
      branch: { at: V3(0.18, 1.03, 0.28), dir: n3(0.36, 1, 0.06), twirl: 0.4 }, grip: { r: null, l: 0.12 },
      hr: { at: V3(-0.13, 1.1, 0.6), fwd: n3(0.05, 0.12, 1), palm: n3(0.35, -0.9, 0.05), pole: n3(-1, -0.7, -0.2) }, fr: 'pinch', fl: 'grip', note: 1 },
    { f: 110, name: 'offer-over', ease: 'out',
      root: [0, 0.004, 0.04], pelvis: [0.035, 0.09, -0.02], spine: [0.18, 0.11, 0.02], neck: [0.02, 0.18, 0.02], head: [0.04, 0.2, 0.04],
      clavR: [0, 0.18, 0],
      branch: { at: V3(0.18, 1.03, 0.28), dir: n3(0.36, 1, 0.06), twirl: 0.4 }, grip: { r: null, l: 0.12 },
      hr: { at: V3(-0.12, 1.11, 0.63), fwd: n3(0.05, 0.15, 1), palm: n3(0.35, -0.9, 0.05), pole: n3(-1, -0.7, -0.2) }, fr: 'pinch', fl: 'grip', note: 1 },
    { f: 118, name: 'let-go', ease: 'hold',
      root: [0, 0.003, 0.038], pelvis: [0.032, 0.09, -0.02], spine: [0.175, 0.105, 0.02], neck: [0.02, 0.19, 0.02], head: [0.05, 0.21, 0.04],
      clavR: [0, 0.17, 0],
      branch: { at: V3(0.18, 1.03, 0.28), dir: n3(0.36, 1, 0.06), twirl: 0.42 }, grip: { r: null, l: 0.12 },
      hr: { at: V3(-0.123, 1.105, 0.62), fwd: n3(0.05, 0.14, 1), palm: n3(0.35, -0.9, 0.05), pole: n3(-1, -0.7, -0.2) }, fr: 'pinch', fl: 'grip', note: 0 },
    { f: 130, name: 'hold-out', ease: 'hold',
      root: [0, 0.002, 0.037], pelvis: [0.03, 0.09, -0.02], spine: [0.17, 0.1, 0.02], neck: [0.02, 0.2, 0.02], head: [0.06, 0.22, 0.04],
      clavR: [0, 0.16, 0],
      branch: { at: V3(0.18, 1.03, 0.28), dir: n3(0.36, 1, 0.06), twirl: 0.45 }, grip: { r: null, l: 0.12 },
      hr: { at: V3(-0.125, 1.1, 0.61), fwd: n3(0.05, 0.12, 1), palm: n3(0.35, -0.9, 0.05), pole: n3(-1, -0.7, -0.2) }, fr: 'pinch', fl: 'grip', note: 0 },
    { f: 144, name: 'hold', ease: 'inout',
      root: [0, 0, 0], pelvis: [0.02, 0.05, -0.03], spine: [0.05, 0.03, 0.02], neck: [0.12, 0.2, 0.0], head: [0.22, 0.25, 0.05],
      branch: { at: V3(-0.02, 0.98, 0.43), dir: n3(0.1, 1, 0.42), twirl: 0.2 }, grip: { r: 0.02, l: 0.14 },
      fr: 'grip', fl: 'grip', note: 0 },
  ];
  const FINGERS = {
    grip: { index: [1.05, 1.15, 0.7], middle: [1.15, 1.2, 0.75], ring: [1.2, 1.2, 0.75], pinky: [1.25, 1.15, 0.7], thumb: [0.28, 0.4, 0.28], oppose: 0.6 },
    relax: { index: [0.2, 0.3, 0.2], middle: [0.3, 0.4, 0.25], ring: [0.38, 0.45, 0.3], pinky: [0.45, 0.5, 0.3], thumb: [0.1, 0.2, 0.15], oppose: 0.2 },
    reach: { index: [0.05, 0.08, 0.05], middle: [0.06, 0.08, 0.05], ring: [0.1, 0.1, 0.05], pinky: [0.14, 0.12, 0.06], thumb: [0.05, 0.1, 0.1], oppose: 0.45 },
    release: { index: [0.35, 0.35, 0.2], middle: [0.38, 0.38, 0.22], ring: [0.42, 0.4, 0.24], pinky: [0.45, 0.42, 0.25], thumb: [-0.2, -0.1, 0.0], oppose: 0.5 },
    dive: { index: [-0.28, -0.3, -0.18], middle: [-0.28, -0.32, -0.2], ring: [-0.24, -0.3, -0.18], pinky: [-0.2, -0.28, -0.16], thumb: [-0.1, 0.0, 0.0], oppose: -0.1 },
    grab: { index: [-0.12, -0.08, -0.05], middle: [-0.12, -0.08, -0.05], ring: [-0.08, -0.05, -0.02], pinky: [-0.04, -0.02, 0.0], thumb: [-0.05, 0.05, 0.05], oppose: 0.0 },
    pinch: { index: [0.2, 0.35, 0.25], middle: [0.28, 0.35, 0.25], ring: [1.15, 1.25, 0.8], pinky: [1.2, 1.2, 0.8], thumb: [0.45, 0.45, 0.25], oppose: 0.8 },
  };
  if (exchange) {
    // hand the note toward the given point: the pinch sits 7 cm short of it, the arm never over-reaches
    const ex = root.worldToLocal(exchange.clone());
    const sh = P('upperarm_r');
    const toEx = ex.clone().sub(sh);
    const reach = Math.min(toEx.length() - 0.07, 0.5);
    const pinchAt = sh.clone().addScaledVector(toEx.normalize(), reach);
    for (const k of K) if (['offer', 'offer-over', 'let-go', 'hold-out'].includes(k.name)) {
      const d = k.hr.at.clone().sub(V3(-0.13, 1.1, 0.6));
      k.hr.at = pinchAt.clone().add(d);
      k.hr.fwd = toEx.clone().add(V3(0, 0.12, 0)).normalize();
    }
  }
  // spacing: how the move into a key is shared out over its frames (never an even glide)
  const EASE = {
    in: (u) => u * u * u,
    out: (u) => 1 - Math.pow(1 - u, 3),
    inout: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    snap: (u) => 1 - Math.pow(1 - u, 4.5),        // most of the move in the first drawings: fast through
    hold: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  };
  const lerpA = (a, b, u) => a.map((x, i) => x + ((b[i] ?? 0) - x) * u);
  // her head turned a touch further from the page's camera than the keys say (the tip of the nose never shows past the cheek)
  const HEAD_AWAY = [0.1, 0.1, 0.12];

  await tick('keys');
  // ---------------------------------------------------------------- posing
  const eul = new THREE.Euler();
  const charQ = new THREE.Quaternion();
  function rotateBone(name, e, order = 'YXZ') {
    // a delta in character space (x: bend forward, y: turn to her left, z: lean)
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
    model.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
  }
  function curl(s, preset, amt = 1) {
    const F = FINGERS[preset];
    if (preset === 'grip' && amt === 1 && hand[s].gripAmt) amt = hand[s].gripAmt;
    for (const f of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
      hand[s].fingers[f].forEach((seg, k) => {
        const b = B[seg.n];
        _q.setFromAxisAngle(seg.axis, F[f][k] * amt);
        b.quaternion.copy(rest[seg.n].local).multiply(_q);
        if (f === 'thumb' && k === 0) {
          const ax = hand[s].f0.clone().applyQuaternion(rest[`hand_${s}`].wq).applyQuaternion(rest[seg.n].wq.clone().invert());
          // (measured: this sign brings the thumb tip in front of the palm and toward the fingers, on both hands)
          b.quaternion.multiply(_q2.setFromAxisAngle(ax, (s === 'l' ? 1 : -1) * F.oppose * 0.6));
        }
      });
    }
  }
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  const leg = {};
  for (const s of ['l', 'r']) {
    const T = rest[`thigh_${s}`], C = rest[`calf_${s}`], F = rest[`foot_${s}`];
    const t0 = C.wp.clone().sub(T.wp), c0 = F.wp.clone().sub(C.wp);
    const hinge = new THREE.Vector3().crossVectors(t0, c0);
    if (hinge.lengthSq() < 1e-8) hinge.set(1, 0, 0);
    hinge.normalize();
    leg[s] = {
      l1: t0.length(), l2: c0.length(), hinge,
      tLocal: basis(t0.clone().applyQuaternion(T.wq.clone().invert()), hinge.clone().applyQuaternion(T.wq.clone().invert())),
      cLocal: basis(c0.clone().applyQuaternion(C.wq.clone().invert()), hinge.clone().applyQuaternion(C.wq.clone().invert())),
      ankle: F.wp.clone(), footQ: F.wq.clone(),
    };
  }
  function solveLeg(s) {
    const Lg = leg[s];
    const T = B[`thigh_${s}`], C = B[`calf_${s}`], F = B[`foot_${s}`];
    const S = T.getWorldPosition(tmpA);
    const goal = root.localToWorld(Lg.ankle.clone());
    const d = goal.clone().sub(S);
    let len = Math.min(d.length(), Lg.l1 + Lg.l2 - 0.0005);
    const dir = d.normalize();
    const a = (Lg.l1 * Lg.l1 - Lg.l2 * Lg.l2 + len * len) / (2 * len);
    const h = Math.sqrt(Math.max(0, Lg.l1 * Lg.l1 - a * a));
    const hingeW = Lg.hinge.clone().transformDirection(root.matrixWorld);
    const fwd = new THREE.Vector3().crossVectors(hingeW, dir).normalize();      // the knee goes this way
    const E = S.clone().addScaledVector(dir, a).addScaledVector(fwd, h);
    const u = E.clone().sub(S).normalize(), l = goal.clone().sub(E).normalize();
    let hg = new THREE.Vector3().crossVectors(u, l);
    if (hg.lengthSq() < 1e-8 || hg.dot(hingeW) < 0) hg.copy(hingeW);
    hg.normalize();
    setWorldQuat(T, basis(u, hg).multiply(Lg.tLocal.clone().invert()));
    setWorldQuat(C, basis(l, hg).multiply(Lg.cLocal.clone().invert()));
    root.getWorldQuaternion(_q);
    setWorldQuat(F, _q.multiply(Lg.footQ));
  }
  function solveArm(s, gripW, fwdW, palmW, poleW, usePinch = false) {
    const U = B[`upperarm_${s}`], L = B[`lowerarm_${s}`], Hb = B[`hand_${s}`];
    const A = arm[s], Hd = hand[s];
    // the hand's world rotation from where the fingers point and where the palm faces
    const qh = basis(fwdW, palmW).multiply(Hd.restHandQ.clone().invert());
    const off = (usePinch ? Hd.pinch : Hd.grip).clone().applyQuaternion(qh);
    const T = gripW.clone().sub(off);
    const S = U.getWorldPosition(tmpA);
    const d = T.clone().sub(S);
    let len = d.length();
    const dir = d.clone().normalize();
    len = Math.min(Math.max(len, Math.abs(A.l1 - A.l2) + 0.01), A.l1 + A.l2 - 0.004);
    const a = (A.l1 * A.l1 - A.l2 * A.l2 + len * len) / (2 * len);
    const h = Math.sqrt(Math.max(0, A.l1 * A.l1 - a * a));
    const perp = poleW.clone().addScaledVector(dir, -poleW.dot(dir)).normalize();
    const E = S.clone().addScaledVector(dir, a).addScaledVector(perp, h);
    const W = S.clone().addScaledVector(dir, len);
    const u = E.clone().sub(S).normalize(), l = W.clone().sub(E).normalize();
    let hinge = new THREE.Vector3().crossVectors(u, l);
    if (hinge.lengthSq() < 1e-6) hinge.crossVectors(u, perp);
    hinge.normalize();
    setWorldQuat(U, basis(u, hinge).multiply(A.uLocal.clone().invert()));
    // the forearm takes part of the hand's roll, the wrist the rest
    const qlBase = basis(l, hinge).multiply(A.lLocal.clone().invert());
    const handFromBase = qlBase.clone().invert().multiply(qh);        // what the wrist would have to do alone
    const axisL = l.clone().applyQuaternion(qlBase.clone().invert()).normalize();
    const dd = handFromBase.x * axisL.x + handFromBase.y * axisL.y + handFromBase.z * axisL.z;
    const twFull = new THREE.Quaternion(axisL.x * dd, axisL.y * dd, axisL.z * dd, handFromBase.w).normalize();
    const tw = new THREE.Quaternion().slerp(twFull, 0.55);
    setWorldQuat(L, qlBase.clone().multiply(tw));
    setWorldQuat(Hb, qh);
    return W;
  }

  const bagRest = V3(-0.24, 0.875, 0.02);      // where the bag hangs, in character space
  const pelRest = rest.pelvis.wp.clone();
  function bagTarget(out) {
    // it rides on the hip: follow the pelvis
    out.copy(root.localToWorld(bagRest.clone()));
    const pel = B.pelvis.getWorldPosition(new THREE.Vector3());
    return out.add(pel.sub(root.localToWorld(pelRest.clone())));
  }
  function placeBag(sw) {
    holds.bag.position.copy(root.worldToLocal(bagState.p.clone()));
    holds.bag.rotation.set(sw.z * 0.4, -Math.PI / 2 + 0.25, 0.06 - sw.x * 0.5);
    holds.bag.updateMatrixWorld(true);
  }
  const bagState = { p: new THREE.Vector3(), v: new THREE.Vector3(), init: false, target: new THREE.Vector3() };
  const branchQ = new THREE.Quaternion();
  let lastDrawing = -1;
  const sample = { note: 0, frame: 0, pin: false };

  function pose(frame) {
    // find the keys around this frame
    const f = ((frame % (LOOP * FPS)) + LOOP * FPS) % (LOOP * FPS);
    let i = 0;
    while (i < K.length - 2 && K[i + 1].f <= f) i++;
    const a = K[i], b = K[i + 1];
    const u0 = (f - a.f) / (b.f - a.f);
    const u = (EASE[b.ease] ?? EASE.inout)(u0);
    // moving hold: a slow settle along the last push, never a still frame
    const drift = b.ease === 'hold' ? Math.sin(u0 * Math.PI) * 0.01 : 0;
    resetPose();
    const rootD = lerpA(a.root, b.root, u);
    model.position.set(rootD[0], rootD[1] - drift * 0.2, rootD[2] + drift * 0.3);
    model.updateMatrixWorld(true);
    rotateBone('pelvis', lerpA(a.pelvis, b.pelvis, u));
    // the feet stay where they stand: two-bone legs down to the planted ankles
    for (const s of ['l', 'r']) solveLeg(s);
    const sp = lerpA(a.spine, b.spine, u);
    rotateBone('spine_01', sp.map((x) => x * 0.3));
    rotateBone('spine_02', sp.map((x) => x * 0.35));
    rotateBone('spine_03', sp.map((x) => x * 0.35 + drift * 0.3));
    rotateBone('clavicle_r', lerpA(a.clavR ?? [0, 0, 0], b.clavR ?? [0, 0, 0], u));
    rotateBone('neck_01', lerpA(a.neck, b.neck, u));
    rotateBone('head', lerpA(a.head, b.head, u).map((x, i) => x + HEAD_AWAY[i]));
    // the bag: while her hand is at it, it rides the hip exactly, drawing by drawing
    sample.pin = (u < 0.5 ? !!a.pin : !!b.pin) || !!(a.pin && b.pin);
    root.updateMatrixWorld(true);
    if (sample.pin || !bagState.init) {
      bagTarget(bagState.p);
      bagState.v.set(0, 0, 0);
      bagState.init = true;
      placeBag(bagState.v);
    }
    holds.bagFlap.rotation.x = -1.72 * ((a.flap ?? 0) + ((b.flap ?? 0) - (a.flap ?? 0)) * u);
    holds.bagFlap.updateMatrixWorld(true);
    // the branch
    const at = a.branch.at.clone().lerp(b.branch.at, u);
    // arcs: moving hands travel on curves, not straight lines
    const lift = Math.sin(u * Math.PI) * 0.04 * (b.ease === 'snap' ? 1 : 0.4);
    at.y += lift;
    const dir = a.branch.dir.clone().lerp(b.branch.dir, u).normalize();
    const tw = a.branch.twirl + (b.branch.twirl - a.branch.twirl) * u;
    branchQ.setFromUnitVectors(V3(0, 1, 0), dir);
    branchQ.premultiply(_q.setFromAxisAngle(dir, 0)).multiply(_q.setFromAxisAngle(V3(0, 1, 0), tw));
    const bw = holds.branch;
    bw.position.copy(at);
    bw.quaternion.copy(branchQ);
    bw.updateMatrixWorld(true);
    const stemW = (sv) => bw.localToWorld(stemAt(sv, new THREE.Vector3()));
    const stemDirW = (sv) => { const T = new THREE.Vector3(); stemAt(sv, new THREE.Vector3(), T); return T.transformDirection(bw.matrixWorld); };
    const dirW = dir.clone().transformDirection(root.matrixWorld);
    // the left hand: always on the branch
    const gl = a.grip.l + (b.grip.l - a.grip.l) * u;
    {
      const g = stemW(gl);
      // fist around the stem: index side up, palm toward the stem from her left-front
      const across = stemDirW(gl).negate();
      const palm0 = V3(-0.75, 0, 0.66).transformDirection(root.matrixWorld);
      const palm = palm0.addScaledVector(across, -palm0.dot(across)).normalize();
      const fwd = new THREE.Vector3().crossVectors(palm, across).normalize();
      const pole = V3(1, -0.6, -0.3).transformDirection(root.matrixWorld);
      solveArm('l', g, fwd, palm, pole);
      curl('l', 'grip');
    }
    // the right hand: on the branch, or free
    const onA = a.grip.r != null, onB = b.grip.r != null;
    const freeGoal = (k) => {
      if (!k.hr) return null;
      const pole = k.hr.pole.clone().transformDirection(root.matrixWorld);
      if (k.hr.bagLocal) {
        const bq = holds.bag.getWorldQuaternion(new THREE.Quaternion());
        return { p: holds.bag.localToWorld(k.hr.bagLocal.clone()), fwd: k.hr.fwdL.clone().applyQuaternion(bq), palm: k.hr.palmL.clone().applyQuaternion(bq), pole, inBag: true };
      }
      return { p: root.localToWorld(k.hr.at.clone()), fwd: k.hr.fwd.clone().transformDirection(root.matrixWorld), palm: k.hr.palm.clone().transformDirection(root.matrixWorld), pole };
    };
    const onBranch = (s) => {
      const g = stemW(s);
      const across = stemDirW(s).negate();
      const palm0 = V3(0.75, 0, 0.66).transformDirection(root.matrixWorld);
      const palm = palm0.addScaledVector(across, -palm0.dot(across)).normalize();
      return { p: g, fwd: new THREE.Vector3().crossVectors(across, palm).normalize(), palm, pole: V3(-1, -0.35, -0.15).transformDirection(root.matrixWorld) };
    };
    const ga = onA ? onBranch(a.grip.r) : freeGoal(a);
    const gb = onB ? onBranch(b.grip.r) : freeGoal(b);
    const ur = u;
    const G = {
      p: ga.p.clone().lerp(gb.p, ur),
      fwd: ga.fwd.clone().lerp(gb.fwd, ur).normalize(),
      palm: ga.palm.clone().lerp(gb.palm, ur).normalize(),
      pole: ga.pole.clone().lerp(gb.pole, ur).normalize(),
    };
    // hand path arcs outward (away from the body) when it travels
    // coming onto the stem or leaving it, the open hand keeps a little back from it
    if (onA !== onB) {
      // away from the stem, on the side the hand comes from (or goes to)
      const sdir = stemDirW(onB ? b.grip.r : a.grip.r);
      const side = (onB ? ga.p.clone().sub(gb.p) : gb.p.clone().sub(ga.p));
      side.addScaledVector(sdir, -side.dot(sdir)).normalize();
      const k = onB ? 1 - sm(0.72, 1.0, u) : sm(0.0, 0.3, u) * (1 - sm(0.6, 1.0, u));
      G.p.addScaledVector(side, 0.045 * k);
    }
    const travel = (ga.inBag || gb.inBag) ? 0 : ga.p.distanceTo(gb.p);
    G.p.add(V3(-1, 0.3, 0).transformDirection(root.matrixWorld).multiplyScalar(Math.sin(ur * Math.PI) * travel * 0.25));
    const pinch = (u < 0.5 ? a.fr : b.fr) === 'pinch' || !!(ga.inBag || gb.inBag);
    solveArm('r', G.p, G.fwd, G.palm, G.pole, pinch);
    // fingers change on the drawing, not by sliding
    if (a.fr === b.fr) curl('r', a.fr);
    else if (!onA && onB) curl('r', u < 0.85 ? 'release' : 'grip');     // arrive open, close on the stem
    else if (onA && !onB) curl('r', u < 0.2 ? 'release' : b.fr);       // open first, then leave
    else curl('r', u < 0.45 ? a.fr : b.fr);
    // the note shows once it is in her fingers, and goes when the seller takes it
    sample.note = u < 0.5 ? a.note : b.note;
    sample.frame = f;
    root.updateMatrixWorld(true);
    setLegColumns();
    surfaceDirty = true;
  }

  // strap path: from the bag at the right hip, up the back, over the left shoulder, down the front, back to the bag.
  // The points are laid on the áo dài at rest (her own space) and carried by the bone under them.
  const strapRest = [];
  {
    const pos = ad.geometry.attributes.position;
    const surf = (x, y, front) => {
      let best = null;
      for (let i = 0; i < pos.count; i += 2) {
        const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
        if (Math.abs(px - x) > 0.02 || Math.abs(py - y) > 0.02 || (pz > 0) !== front) continue;
        if (best === null || (front ? pz > best : pz < best)) best = pz;
      }
      return best ?? (front ? 0.1 : -0.1);
    };
    const path = [
      [-0.175, 0.97, false, 'spine_01'], [-0.1, 1.04, false, 'spine_02'], [-0.005, 1.12, false, 'spine_02'], [0.085, 1.19, false, 'spine_03'],
      [0.14, 1.24, false, 'clavicle_l'], [0.158, 1.268, null, 'clavicle_l'], [0.142, 1.235, true, 'clavicle_l'],
      [0.075, 1.16, true, 'spine_03'], [-0.025, 1.065, true, 'spine_02'], [-0.12, 0.99, true, 'spine_01'],
    ];
    for (const [x, y, front, bone] of path) {
      const z = front === null ? 0.0 : surf(x, y, front) + (front ? 0.007 : -0.007);
      const pr = V3(x, front === null ? y + 0.012 : y, z);
      const Rb = rest[bone];
      strapRest.push({ bone, local: pr.clone().sub(Rb.wp).applyQuaternion(Rb.wq.clone().invert()) });
    }
  }
  const curve = new THREE.CatmullRomCurve3([], false, 'centripetal');
  let surfaceDirty = true;
  const surf = { body: null, panels: null, scarf: null };
  const strapOk = (i) => segKeyOf(ad, i) !== 'lower_r' && segKeyOf(ad, i) !== 'lower_l';
  const strapPts = Array.from({ length: 40 }, () => new THREE.Vector3());
  const strapLift = Array.from({ length: 40 }, () => new THREE.Vector3());
  // the cloth points that can ever be under the strap: within 9 cm of its path at rest (the path is on the body, the ends at the hip)
  const nearList = (mesh, ok, rad) => {
    const P = mesh.geometry.attributes.position;
    const pathRest = strapRest.map((sp) => rest[sp.bone].wp.clone().add(sp.local.clone().applyQuaternion(rest[sp.bone].wq)));
    pathRest.push(bagRest.clone().add(V3(0, 0.05, 0)));
    const out = [];
    for (let i = 0; i < P.count; i++) {
      if (!ok(i)) continue;
      _v.fromBufferAttribute(P, i);
      for (let k = 0; k < pathRest.length; k++) {
        const a = pathRest[k], b = pathRest[(k + 1) % pathRest.length];
        if (segClosest(_v, a, b, _lq).distanceToSquared(_v) < rad * rad) { out.push(i); break; }
      }
    }
    return out;
  };
  const adP = ad.geometry.attributes.position;
  const listBody = nearList(ad, (i) => strapOk(i) && adP.getY(i) > waistY - 0.005, 0.11);
  const listPanels = nearList(ad, (i) => adP.getY(i) <= waistY - 0.005, 0.11);
  const listScarf = nearList(meshes.Scarf, () => true, 0.12);
  function layStrap() {
    if (surfaceDirty) {
      surf.body = snap(ad, { list: listBody, cloth: clothOffsetOf });
      surf.panels = snap(ad, { list: listPanels, cloth: clothOffsetOf });
      surf.scarf = snap(meshes.Scarf, { list: listScarf, cloth: clothOffsetOf });
      surfaceDirty = false;
    }
    const lift = 0.0052;
    const n_ = _sn, b_ = _sb, sv = _ss;
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 1; i < 39; i++) {
        const p = strapPts[i];
        const rp = sdist(surf.panels, p, 0.04);
        if (rp && rp.d < lift) p.addScaledVector(n_.set(surf.panels.nrm[rp.i * 3], surf.panels.nrm[rp.i * 3 + 1], surf.panels.nrm[rp.i * 3 + 2]), lift - rp.d);
        const r = sdist(surf.body, p, 0.06);
        if (!r) continue;
        n_.set(surf.body.nrm[r.i * 3], surf.body.nrm[r.i * 3 + 1], surf.body.nrm[r.i * 3 + 2]);
        b_.set(surf.body.pos[r.i * 3], surf.body.pos[r.i * 3 + 1], surf.body.pos[r.i * 3 + 2]);
        let h = Math.max(lift, r.d);
        // over the scarf where they cross: above the highest scarf point near here
        forNear(surf.scarf, p, 0.065, (j) => {
          sv.set(surf.scarf.pos[j * 3], surf.scarf.pos[j * 3 + 1], surf.scarf.pos[j * 3 + 2]);
          const sh = sv.sub(b_).dot(n_);
          if (sh > 0 && sh < 0.1) h = Math.max(h, sh + 0.02);
        });
        if (h > r.d) p.addScaledVector(n_, h - r.d);
      }
      if (pass < 3) for (let i = 1; i < 39; i++) strapPts[i].lerp(_v.addVectors(strapPts[i - 1], strapPts[i + 1]).multiplyScalar(0.5), 0.3 - 0.08 * pass);
    }
  }
  const _sn = new THREE.Vector3(), _sb = new THREE.Vector3(), _ss = new THREE.Vector3(), _sf = new THREE.Vector3(), _sr = new THREE.Vector3();
  const strapPath = Array.from({ length: strapRest.length + 2 }, () => new THREE.Vector3());
  const strapBase = Array.from({ length: 40 }, () => new THREE.Vector3());
  // once per drawing: the path through the bones, laid on the cloth; what the laying added is kept per point
  function layStrapDrawing() {
    strapPath[0].copy(holds.bag.localToWorld(_v.set(-BAG.L / 2 - 0.004, -0.004, 0)));
    strapRest.forEach((sp, k) => B[sp.bone].localToWorld(strapPath[k + 1].copy(sp.local)));
    strapPath[strapPath.length - 1].copy(holds.bag.localToWorld(_v.set(BAG.L / 2 + 0.004, -0.004, 0)));
    curve.points = strapPath;
    for (let i = 0; i < 40; i++) { curve.getPointAt(i / 39, strapPts[i]); strapBase[i].copy(strapPts[i]); }
    layStrap();
    for (let i = 0; i < 40; i++) strapLift[i].subVectors(strapPts[i], strapBase[i]);
  }
  // with the bag (30 Hz): the same path with the bag's ends where they are now, plus the kept lift, then the strip
  const localPts = Array.from({ length: 40 }, () => new THREE.Vector3());
  const strapLocal = new THREE.CatmullRomCurve3(localPts, false, 'centripetal');
  function updateStrap() {
    strapPath[0].copy(holds.bag.localToWorld(_v.set(-BAG.L / 2 - 0.004, -0.004, 0)));
    strapPath[strapPath.length - 1].copy(holds.bag.localToWorld(_v.set(BAG.L / 2 + 0.004, -0.004, 0)));
    curve.points = strapPath;
    root.updateMatrixWorld();
    const inv = _m.copy(root.matrixWorld).invert();
    for (let i = 0; i < 40; i++) { curve.getPointAt(i / 39, _v).add(strapLift[i]); localPts[i].copy(_v).applyMatrix4(inv); }
    const pos = strapGeo.attributes.position.array, nor = strapGeo.attributes.normal.array;
    const frames = strapLocal.computeFrenetFrames(39, false);
    for (let i = 0; i < 40; i++) {
      const c = strapLocal.getPointAt(i / 39, _v);
      const tg = frames.tangents[i];
      // lie flat on the body: the wide side faces away from the spine
      _c.set(c.x, 0, c.z).normalize();
      _sf.crossVectors(tg, _c).normalize();
      _sr.crossVectors(_sf, tg).normalize();
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        const cx = Math.cos(ang) * 0.009, cy = Math.sin(ang) * 0.0025;
        const o = (i * 8 + k) * 3;
        _v2.copy(_sf).multiplyScalar(cx).addScaledVector(_sr, cy);
        pos[o] = c.x + _v2.x; pos[o + 1] = c.y + _v2.y; pos[o + 2] = c.z + _v2.z;
        _v2.normalize();
        nor[o] = _v2.x; nor[o + 1] = _v2.y; nor[o + 2] = _v2.z;
      }
    }
    // the checks read the strap as a curve in her space
    qaCurve.points = localPts;
    strapGeo.attributes.position.needsUpdate = true;
    strapGeo.attributes.normal.needsUpdate = true;
  }
  const qaCurve = new THREE.CatmullRomCurve3(localPts, false, 'centripetal');

  // ---------------------------------------------------------------- cloth, every frame
  const wind = { t: 0 };
  let clothInit = false;
  const legSeg = { l: [V3(), V3(), V3()], r: [V3(), V3(), V3()] };
  const _c = new THREE.Vector3(), _d = new THREE.Vector3();
  function closestOnSeg(p, a, b, out) {
    _d.subVectors(b, a);
    const t = clamp01(_v2.subVectors(p, a).dot(_d) / Math.max(1e-9, _d.lengthSq()));
    return out.copy(a).addScaledVector(_d, t);
  }
  const clothSide = new THREE.Vector3();
  let clothGroundY = 0;
  // once per drawing: where each node is tied, the leg columns
  function clothAnchors() {
    clothSide.set(1, 0, 0).transformDirection(root.matrixWorld);
    for (const s of ['l', 'r']) {
      const sx = s === 'l' ? 1 : -1;
      legSeg[s][0].copy(B[`thigh_${s}`].localToWorld(_v.set(0, 0, 0))).add(offW(_v2.set(sx * 0.012, 0, 0)));
      legSeg[s][2].copy(B[`foot_${s}`].getWorldPosition(_v)).add(offW(_v2.set(sx * 0.014, 0, -0.012)));
      legSeg[s][1].copy(legSeg[s][0]).lerp(legSeg[s][2], 0.5);
    }
    clothGroundY = root.localToWorld(_v.set(0, 0, 0)).y;
    for (const n of nodes) {
      n.mesh.getVertexPosition(n.vi, n.t);
      n.mesh.localToWorld(n.t);
      if (!n.outW) n.outW = new THREE.Vector3();
      n.outW.copy(n.out).transformDirection(root.matrixWorld);
      if (!clothInit) { n.p.copy(n.t); n.v.set(0, 0, 0); }
    }
    clothInit = true;
  }
  function stepCloth(dt, t) {
    const sub = Math.max(1, Math.ceil(dt / (1 / 60)));
    const h = Math.min(dt, 0.05) / sub;
    const side = clothSide;
    const groundY = clothGroundY;
    for (let s = 0; s < sub; s++) {
      for (const n of nodes) {
        if (n.stiff > 1e6) { n.p.copy(n.t); n.v.set(0, 0, 0); continue; }
        const k = n.stiff, c = 2 * Math.sqrt(k) * 0.3;
        const tv = n.j / (n.nv - 1);
        const ph = t * 1.6 + n.k * 0.8 + n.j * 0.42 + n.start * 0.3;
        const gust = (0.55 + 0.45 * Math.sin(t * 0.55 + n.start)) * (0.6 * Math.sin(ph) + 0.4 * Math.sin(ph * 2.3 + 1.1));
        _v.subVectors(n.t, n.p).multiplyScalar(k);
        _v.addScaledVector(n.v, -c);
        // the breeze lifts the cloth away from the legs and shakes it sideways
        _v.addScaledVector(n.outW, (0.55 + 0.45 * gust) * 1.1 * tv);
        _v.addScaledVector(side, gust * 1.6 * tv);
        _v.y += 0.35 * tv * Math.sin(ph * 1.3);
        n.v.addScaledVector(_v, h);
        n.p.addScaledVector(n.v, h);
        _v.subVectors(n.p, n.t);
        const lim = 0.07 * tv + 0.004;
        if (_v.length() > lim) { _v.setLength(lim); n.p.copy(n.t).add(_v); }
        if (n.clamp) {
          const dn = _v.subVectors(n.p, n.t).dot(n.outW);
          if (dn < 0) { n.p.addScaledVector(n.outW, -dn); const vn = n.v.dot(n.outW); if (vn < 0) n.v.addScaledVector(n.outW, -vn); }
        }
        if (n.legs && tv > 0.15) {
          // the wide trousers: a soft column round each leg the tà cannot enter
          for (const sd of ['l', 'r']) {
            const L = legSeg[sd];
            closestOnSeg(n.p, L[0], L[1], _c);
            closestOnSeg(n.p, L[1], L[2], tmpB);
            if (tmpB.distanceToSquared(n.p) < _c.distanceToSquared(n.p)) _c.copy(tmpB);
            const yy = n.p.y - groundY;
            const r = 0.081 + 0.014 * clamp01(1 - yy / 0.72) + 0.022;
            _d.subVectors(n.p, _c);
            _d.y = 0;
            const dl = _d.length();
            if (dl < r) {
              if (dl < 1e-5) _d.copy(n.outW); else _d.divideScalar(dl);
              n.p.addScaledVector(_d, r - dl);
              const vn = n.v.dot(_d);
              if (vn < 0) n.v.addScaledVector(_d, -vn);
            }
          }
        }
      }
    }
    // neighbours share their offsets a little: the cloth moves as one sheet
    const off = PU.uCloth.value;
    for (let i = 0; i < nodes.length; i++) off[nodes[i].start + nodes[i].j * nodes[i].nu + nodes[i].k].subVectors(nodes[i].p, nodes[i].t);
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

  // ---------------------------------------------------------------- the bag swings smoothly on its strap
  const _bt = new THREE.Vector3(), _bv = new THREE.Vector3();
  function stepBag(dt) {
    if (sample.pin) return;
    const target = bagTarget(_bt);
    const k = 60, c = 2 * Math.sqrt(k) * 0.25;
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = Math.min(dt, 0.05) / steps;
    for (let i = 0; i < steps; i++) {
      _v.subVectors(target, bagState.p).multiplyScalar(k).addScaledVector(bagState.v, -c);
      bagState.v.addScaledVector(_v, h);
      bagState.p.addScaledVector(bagState.v, h);
    }
    placeBag(_bv.copy(bagState.v).applyQuaternion(root.getWorldQuaternion(rootQ).invert()));
  }

  // out of play (before she takes it out, after it is handed over) it rests inside her, where nothing of it can show:
  // a check that draws every hidden thing must see no pixel of it
  const noteAway = P('pelvis').clone().add(V3(0, 0.03, 0));
  // the note rides between index and middle finger of the right hand
  function placeNote() {
    const hb = B.hand_r;
    const Hd = hand.r;
    if (!(sample.note > 0)) {
      holds.note.visible = false;
      holds.note.position.copy(noteAway);
      holds.note.quaternion.identity();
      holds.note.updateMatrixWorld(true);
      return;
    }
    const nw = hb.localToWorld(Hd.pinch.clone());
    holds.note.visible = sample.note > 0;
    holds.note.position.copy(root.worldToLocal(nw));
    hb.getWorldQuaternion(_q);
    root.getWorldQuaternion(_q2);
    // long edge along the fingers, face toward the palm
    const fq = basis(Hd.f0, Hd.p0);
    holds.note.quaternion.copy(_q2.invert().multiply(_q).multiply(fq));
    holds.note.translateX(0.062);
    holds.note.updateMatrixWorld(true);
  }
  // the drawing at time t, without moving the cloth (for checks that sample time); the next update draws again
  function poseAt(t) {
    pose(Math.floor((t * FPS) / STEP) * STEP);
    placeNote();
    lastDrawing = -1;
  }
  const SIM = 1 / 30;
  let simAcc = 0, simT = 0;
  function update(t, dt, noCloth = false, camera = null) {
    const frame = Math.floor(t * FPS / STEP) * STEP;       // on twos
    PU.uTime.value = t;
    let drawn = false;
    if (frame !== lastDrawing) {
      pose(frame);
      lastDrawing = frame;
      measure();
      placeNote();
      clothAnchors();
      layStrapDrawing();
      updateFolds(false);
      drawn = true;
      simAcc = Math.max(simAcc, SIM);        // a new drawing moves the cloth and the bag at once
    }
    simAcc += dt;
    if (simAcc >= SIM) {
      const h = Math.min(simAcc, 0.1);
      simAcc = 0;
      simT = t;
      stepBag(h);
      if (noCloth) { for (const o of PU.uCloth.value) o.set(0, 0, 0); } else stepCloth(h, t);
      updateStrap();
      if (!drawn) updateFolds(true);
    }
  }
  // the loop's last 2 seconds before t, at 30 frames a second: the cloth and the bag arrive at t as they would in a live run
  function runTo(t, camera = null) {
    clothInit = false; bagState.init = false; lastDrawing = -1; simAcc = 0;
    for (let i = 60; i >= 0; i--) update(t - i / 30, 1 / 30, false, camera);
  }
  // the same, giving the page back every few steps (for the build: two seconds of cloth and bag is ~100 ms of work)
  async function runToSliced(t, slice, camera = null) {
    clothInit = false; bagState.init = false; lastDrawing = -1; simAcc = 0;
    for (let i = 60; i >= 0; i--) {
      update(t - i / 30, 1 / 30, false, camera);
      if (slice && i % 4 === 0) await slice();
    }
  }

  const headFwdLocal = V3(0, 0, 1).applyQuaternion(rest.head.wq.clone().invert());
  function face(camera) {
    const hp = B.head.getWorldPosition(new THREE.Vector3());
    const f = headFwdLocal.clone().applyQuaternion(B.head.getWorldQuaternion(new THREE.Quaternion()));
    return f.dot(camera.position.clone().sub(hp).normalize());
  }
  // her face as points (the front of the head: the region the face checks use), in head space, and in world space on demand
  const faceLocal = [];
  {
    const bp = meshes.Body.geometry.attributes.position;
    const inv = rest.head.wq.clone().invert();
    for (let i = 0; i < bp.count; i++) {
      const p = V3(bp.getX(i), bp.getY(i), bp.getZ(i));
      const d = p.clone().sub(headC);
      if (d.z > 0.03 && d.y > -0.13 && d.y < 0.05 && Math.abs(d.x) < 0.06) faceLocal.push({ p: p.clone().sub(rest.head.wp).applyQuaternion(inv), n: d.normalize().applyQuaternion(inv) });
    }
  }
  const _fq = new THREE.Quaternion();
  function faceProbes() {
    B.head.updateMatrixWorld(true);
    B.head.getWorldQuaternion(_fq);
    return faceLocal.map((f) => ({ p: B.head.localToWorld(f.p.clone()), n: f.n.clone().applyQuaternion(_fq).normalize() }));
  }

  // the fist's real hole: with the fingers curled, find the line (across the hand) that stays furthest from every finger joint,
  // and open the fist a little if the stem (1.2 cm) and the fingers (0.7 cm) would not both fit
  async function fitGrip(s) {
    const hb = B[`hand_${s}`];
    const Hd = hand[s];
    const across = new THREE.Vector3().crossVectors(Hd.f0, Hd.p0).normalize();
    let chosen = null;
    // the tightest fist that still leaves the stem and the fingers their room: fingers close round the stem, not through it
    for (const amt of [1.45, 1.38, 1.31, 1.24, 1.17, 1.1, 1.0, 0.92, 0.85, 0.78, 0.7, 0.62, 0.55]) {
      resetPose();
      curl(s, 'grip', amt);
      root.updateMatrixWorld(true);
      const pts = [];
      for (const f of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
        const j = [1, 2, 3].map((q) => hb.worldToLocal(B[`${f}_0${q}_${s}`].getWorldPosition(new THREE.Vector3())));
        pts.push(...j, j[2].clone().add(j[2].clone().sub(j[1]).multiplyScalar(0.85)), j[0].clone().lerp(j[1], 0.5), j[1].clone().lerp(j[2], 0.5));
      }
      const knuck = hb.worldToLocal(B[`middle_01_${s}`].getWorldPosition(new THREE.Vector3()));
      for (let q = 0; q <= 4; q++) for (let a = -2; a <= 2; a++) {
        pts.push(knuck.clone().multiplyScalar(q / 4).addScaledVector(Hd.p0, 0.011).addScaledVector(across, a * 0.018));
      }
      // the hole must be inside the fist: inside the outline of the palm and the curled fingers, seen along the stem
      const flat = pts.map((q) => [q.dot(Hd.p0), q.dot(Hd.f0)]).sort((u, v) => u[0] - v[0] || u[1] - v[1]);
      const cr = (o, u, v) => (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
      const lo = [], hi = [];
      for (const q of flat) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
      for (const q of flat.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
      const hull = lo.slice(0, -1).concat(hi.slice(0, -1));
      const inside = (x, y) => hull.every((q, i) => cr(q, hull[(i + 1) % hull.length], [x, y]) >= 0);
      let best = null;
      const xs = hull.map((q) => q[0]), ys = hull.map((q) => q[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      for (let a = x0; a <= x1; a += 0.002) for (let b = y0; b <= y1; b += 0.002) {
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
      await tick(`grip ${s} ${amt}`);
      if (best.m >= 0.0205) break;
    }
    if (!chosen) { console.warn('no fist hole', s); return; }
    Hd.grip = chosen.c;
    Hd.gripAmt = chosen.amt;
    Hd.gripClear = chosen.m;
  }
  await tick('before grips');
  await fitGrip('l');
  await fitGrip('r');
  await tick('grips');
  if (typeof window !== 'undefined' && /dev=1/.test(location.search)) console.log('grip', hand.l.gripAmt, hand.l.gripClear, hand.r.gripAmt, hand.r.gripClear);

  resetPose();
  return {
    prof: PROF,
    qa: { rest, meshes, B, holds, BAG, stemAt, clothOffsetOf, segKeyOf, hand, curve: qaCurve, sample, curl, FINGERS, resetPose, get frame() { return lastDrawing; } },
    group: root, bones: B, holds, update, runTo, runToSliced, poseAt, face, faceProbes, loop: LOOP, sets, strapCurve: qaCurve, strapRest, folds, measures: M,
    exchangeTime: [104 / FPS, 118 / FPS],
    stats: { nodes: nodeCount, triangles: [outfit, hull].reduce((s, m) => s + m.geometry.index.count / 3, 0) },
    landmarks: { headC, waistY, hipY, hemY },
    setDebug(v) { for (const s of sets) for (const e of s.extra) e.visible = !v; },
  };
}
