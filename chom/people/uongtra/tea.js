// Chớm, season Hạ: the lotus-tea maker (người ướp trà sen) at her low table by the pond, at dusk.
// A MakeHuman body (CC0) rigged with 53 bones (three per finger), seated pose baked in, clothes built by code in Blender
// (blender/build_tea.py). Painted by tea-paint.js (the spring customer's paint, summer light); her things by props.js.
//
//   const asset = await loadTea(urls)
//   const t = buildTea(scene, { asset, R, D, at, faceTo, place })    D = the world's build tools { Batch, hero, withC, C }
//   t.group                      she faces +z of the group, her left is +x
//   t.update(t, dt, camera)      t: loop clock (s). The body is drawn on twos (a new drawing every 1/12 s)
//   t.poseAt(t)                  the drawing at t, for checks
//   t.face(camera)               the face check: how much of the face a camera could see past the hat (0 = none)
//
// One loop (6 s): she lifts a fresh lotus out of the basket at her left, opens its petals with her fingertips, spoons green tea
// from the bowl into its heart, folds the petals shut, draws a strip of lạt from its tube and winds it round, and passes the
// tied flower to her right hand, which drops it into the tall basket on the tray while her left hand goes back for the next one.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PU, NFOLD, materialTable, paintMaterial, hullMaterial, depthMaterial, foldMaterial } from './tea-paint.js';
import { HAT, buildHat, STOOL, BASKET, JAR, buildStill, buildFlower, buildSpoon, SPOON, buildLat, LAT, TUBE } from './props.js';
export { HAT, STOOL, BASKET, JAR, TUBE };
const SPOON_HOLD = 0.116;

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, u) => a + (b - a) * u;
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const FPS = 24, STEP = 2;
export const LOOP = 6;

// ---------------------------------------------------------------- the palette
const LOOK = {
  Blouse: { kind: 'cotton', col: '#8a7a88', col2: '#fff4e2', hatch: '#5a4a70', hi: '#fffaf0', back: '#6a5a6a', scale: 3.2, bump: 0.35, gloss: 0, ink: 3.2, bands: 1.6, hatchScale: 5, hatchAmt: 0.8, rim: 1.0 },
  Buttons: { kind: 'metal', col: '#8a8074', col2: '#fffaf0', hatch: '#5a5048', hi: '#ffffff', scale: 30, gloss: 0.6, ink: 0 },
  Pants: { kind: 'silk', col: '#07060a', col2: '#2c2836', hatch: '#000000', hi: '#d8c8e8', back: '#050408', scale: 2.4, bump: 0.25, sheen: 1.0, ink: 3.0, bands: true, hatchScale: 4.5, hatchAmt: 0.0, rim: 0.9 },
  Body: { kind: 'skin', col: '#8a4e38', col2: '#e0a482', hatch: '#4a2620', hi: '#ffe2c8', back: '#4a2a22', scale: 5, bump: 0.18, gloss: 0.08, ink: 1.8, bands: true, face: true, hatchAmt: 0.35, rim: 0.85, hatchScale: 9 },
  Hair: { kind: 'hair', col: '#0a090c', col2: '#2e2b33', hatch: '#000000', hi: '#9a98a8', back: '#050406', scale: 8, bump: 0.35, sheen: 0.8, ink: 1.4, bands: false, hatchAmt: 0.0, rim: 0.85 },
  Shoes: { kind: 'leather', col: '#3a1418', col2: '#a04a44', hatch: '#1a0608', hi: '#ffd8c8', back: '#2a0a0c', scale: 12, gloss: 0.7, ink: 1.4 },
  // a thin faded cotton scarf round her neck, pulled up over the chin: muted, darker than the blouse
  Scarf: { kind: 'cotton', col: '#2e2a3a', col2: '#7e7488', hatch: '#1c1826', hi: '#d2c8d8', back: '#241f2c', scale: 3.6, bump: 0.3, gloss: 0, ink: 2.4, bands: true, hatchScale: 5, hatchAmt: 0.55, rim: 0.85 },
};

// ---------------------------------------------------------------- rest-pose helpers
function restData(bones, root) {
  const R = {};
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert();
  const rq = root.getWorldQuaternion(new THREE.Quaternion()).invert();
  for (const b of bones) {
    R[b.name] = { bone: b, local: b.quaternion.clone(), wq: rq.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())), wp: b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv) };
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

export async function loadTea(urls, slice = null) {
  let last;
  for (const url of [].concat(urls)) {
    try {
      // fetched first (the network does not hold the page); the parse is one stretch of work, timed in parseMs
      const [buf, meta] = await Promise.all([fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.arrayBuffer(); }), fetch(url.replace(/\.glb$/, '.json')).then((r) => r.json())]);
      if (slice) await slice();
      const t0 = performance.now();
      const gltf = await new GLTFLoader().parseAsync(buf, url.replace(/[^/]*$/, ''));
      return { gltf, meta, parseMs: +(performance.now() - t0).toFixed(1) };
    } catch (e) { last = e; }
  }
  throw last;
}

// where her things are, in her own space (x her left, z ahead), for the table as the summer season lays it out.
// The page may give them from the scene instead (place: { table: {at, ry}, bowl, tube, jar, basket } in world space).
const PLACE = {
  bowl: V3(-0.14, 0.39, 0.59),         // the tea bowl's centre at its rim
  tea: 0.397,                          // top of the heaped tea
  tube: V3(-0.02, 0.34, 0.55),         // floor of the lạt tube
  jar: V3(-0.28, 0.352, 0.56),         // floor of the tall basket, on the tray at her right front (season: TRAY.basketSpot)
  basket: V3(0.46, 0.0, 0.18),         // floor of the fresh-lotus basket
  table: { at: V3(-0.3, 0, 0.76), ry: 0, top: 0.34, half: [0.48, 0.29] },
};

export async function buildTea(scene, { asset, R, D, at = null, faceTo = null, place = null, slice = null }) {
  // the build gives the page back between its steps (core.slice): no stretch of it runs long. PROF: each step, and the longest
  // stretch that ran without a pause
  const PROF = { steps: [], longest: { ms: 0, at: '' }, longestStep: { ms: 0, at: '' } };
  let tMark = performance.now(), runStart = tMark;
  const tick = async (label) => {
    const now = performance.now();
    const step = now - tMark;
    PROF.steps.push([label, +step.toFixed(1)]);
    if (step > PROF.longestStep.ms) PROF.longestStep = { ms: +step.toFixed(1), at: label };
    if (now - runStart > PROF.longest.ms) PROF.longest = { ms: +(now - runStart).toFixed(1), at: label };
    if (slice) await slice();
    const after = performance.now();
    if (after - now > 0.3) runStart = after;
    tMark = after;
  };
  const { gltf, meta } = asset;
  const root = new THREE.Group();
  root.name = 'uongtra';
  scene.add(root);
  const model = gltf.scene;
  root.add(model);
  if (at) root.position.copy(at);
  if (at && faceTo) root.rotation.y = Math.atan2(faceTo.x - at.x, faceTo.z - at.z);
  root.updateMatrixWorld(true);
  const L = { ...PLACE };
  if (place) {
    const toL = (w) => root.worldToLocal(w.clone());
    if (place.bowl) L.bowl = toL(place.bowl);
    if (place.tube) L.tube = toL(place.tube);
    if (place.jar) L.jar = toL(place.jar);
    if (place.basket) L.basket = toL(place.basket);
    if (place.table) L.table = { ...PLACE.table, at: toL(place.table.at), ry: place.table.ry - root.rotation.y };
    if (place.bowl) L.bowl.y = 0.39;
    if (place.tube) L.tube.y = 0.34;
    if (place.jar) L.jar.y = place.jar.y;
    if (place.basket) L.basket.y = 0;
  }

  await tick('placed');
  const meshes = {};
  model.traverse((o) => { if (o.isSkinnedMesh || o.isMesh) meshes[o.name] = o; });
  const any = Object.values(meshes).find((m) => m.isSkinnedMesh);
  const bones = any.skeleton.bones;
  const B = Object.fromEntries(bones.map((b) => [b.name, b]));
  const rest = restData(bones, root);
  const P = (n) => rest[n].wp.clone();
  const headC = V3(...meta.headCentre);
  const hipY = meta.hipY, waistY = meta.waistY;
  const rootQ = new THREE.Quaternion();

  await tick('rest');
  // ---------------------------------------------------------------- stroke flow: round each limb, along the hair
  const segOf = {};
  const SEGS = { torso: { a: P('pelvis'), b: P('neck_01'), r: 0.12 }, head: { a: P('neck_01'), b: headC.clone(), r: 0.08 } };
  for (const s of ['l', 'r']) {
    SEGS[`upper_${s}`] = { a: P(`upperarm_${s}`), b: P(`lowerarm_${s}`), r: 0.05 };
    SEGS[`lower_${s}`] = { a: P(`lowerarm_${s}`), b: P(`hand_${s}`), r: 0.04 };
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
      if (name === 'Hair') {
        q.subVectors(p, headC);
        const qn = q.clone().normalize();
        const az = Math.atan2(q.dot(hairB1), q.dot(hairB2));
        const pol = Math.acos(THREE.MathUtils.clamp(-qn.dot(hairA), -1, 1));
        flow[i * 2] = az * 0.1; flow[i * 2 + 1] = pol * 0.1;
        T.copy(hairA).addScaledVector(nn, -hairA.dot(nn));
        if (T.lengthSq() < 1e-6) T.copy(hairB2);
        T.normalize();
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
        if (t % 9000 === 8997) await tick(`curvature ${name}`);
        const i0 = idx[t], i1 = idx[t + 1], i2 = idx[t + 2];
        edge(i0, i1); edge(i1, i0); edge(i1, i2); edge(i2, i1); edge(i2, i0); edge(i0, i2);
      }
      for (let i = 0; i < n; i++) curv[i] = cnt[i] ? (sum[i] / cnt[i]) / Math.max(1e-5, len[i] / cnt[i]) : 0;
      for (let pass = 0; pass < 3; pass++) {
        const acc = new Float32Array(n), c2 = new Float32Array(n);
        for (let t = 0; t < idx.length; t += 3) {
          const a0 = idx[t], a1 = idx[t + 1], a2 = idx[t + 2];
          acc[a0] += curv[a1]; acc[a1] += curv[a0]; acc[a1] += curv[a2]; acc[a2] += curv[a1]; acc[a2] += curv[a0]; acc[a0] += curv[a2];
          c2[a0] += 2; c2[a1] += 2; c2[a2] += 2;
        }
        for (let i = 0; i < n; i++) curv[i] = c2[i] ? curv[i] * 0.4 + 0.6 * acc[i] / c2[i] : curv[i];
        await tick(`smooth ${name}`);
      }
      for (let i = 0; i < n; i++) curv[i] = THREE.MathUtils.clamp(curv[i] * 4.0, 0, 1);
    }
    g.setAttribute('aFlow', new THREE.BufferAttribute(flow, 2));
    g.setAttribute('aAxis', new THREE.BufferAttribute(axis, 3));
    g.setAttribute('aCurv', new THREE.BufferAttribute(curv, 1));
  }

  // ---------------------------------------------------------------- materials: the whole outfit is one mesh, its lines one hull
  const LOOKS = Object.entries(LOOK).map(([name, look]) => ({ name, ...look, hang: name === 'Pants' ? P('calf_l').y - 0.02 : -9, twoSided: false }));
  const table = materialTable(LOOKS);
  const matOf = Object.fromEntries(LOOKS.map((l, i) => [l.name, i]));
  const depthMat = depthMaterial(table);
  const parts = [];
  let first = null;
  for (const Lk of LOOKS) {
    const m = meshes[Lk.name];
    if (!m) { console.warn('missing mesh', Lk.name); continue; }
    const g = m.geometry;
    const n = g.attributes.position.count;
    const ac = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) ac[i * 4] = -1;
    g.setAttribute('aCloth', new THREE.BufferAttribute(ac, 4));
    g.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aShrink', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aPushW', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(n).fill(matOf[Lk.name]), 1));
    await flowAttributes(m, Lk.name);
    await tick(`part ${Lk.name}`);
    m.visible = false;
    m.castShadow = false;
    m.userData.castShadow = false;
    if (!first) first = m;
    else if (!m.bindMatrix.equals(first.bindMatrix) || !m.matrix.equals(first.matrix)) console.warn('part not in the outfit space', Lk.name);
    parts.push(m);
  }
  const outfit = new THREE.SkinnedMesh(mergeGeometries(parts.map((m) => m.geometry), false), paintMaterial(table, { headC }));
  await tick('outfit merged');
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
  // the hull: the coarse shells from the file, each vertex taking the hollow data of the nearest outfit vertex
  const hullParts = [];
  const gkey = (x, y, z) => ((x + 512) * 1048576) + ((y + 512) * 1024) + (z + 512);
  for (const Lk of LOOKS) {
    const h = meshes['Hull' + Lk.name];
    if (!h) continue;
    h.visible = false;
    if (!Lk.ink) continue;
    const src = meshes[Lk.name].geometry;
    const sp = src.attributes.position;
    const cell = 0.02, grid = new Map();
    for (let i = 0; i < sp.count; i++) {
      const kk = gkey(Math.floor(sp.getX(i) / cell), Math.floor(sp.getY(i) / cell), Math.floor(sp.getZ(i) / cell));
      let a = grid.get(kk); if (!a) grid.set(kk, (a = [])); a.push(i);
    }
    const g = h.geometry;
    const hp = g.attributes.position;
    const n = hp.count;
    const curv = new Float32Array(n);
    const sc = src.attributes.aCurv.array;
    await tick(`hull grid ${Lk.name}`);
    for (let i = 0; i < n; i++) {
      if (i % 250 === 249) await tick(`hull ${Lk.name}`);
      const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
      let best = -1, bd = 1e9;
      for (let r = 1; r <= 3 && best < 0; r++) {
        for (let a = cx - r; a <= cx + r; a++) for (let b = cy - r; b <= cy + r; b++) for (let c = cz - r; c <= cz + r; c++) {
          const list = grid.get(gkey(a, b, c));
          if (!list) continue;
          for (const j of list) { const d = (sp.getX(j) - x) ** 2 + (sp.getY(j) - y) ** 2 + (sp.getZ(j) - z) ** 2; if (d < bd) { bd = d; best = j; } }
        }
      }
      curv[i] = best >= 0 ? sc[best] : 0;
    }
    const c = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'skinIndex', 'skinWeight']) c.setAttribute(k, g.attributes[k]);
    const ac = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) ac[i * 4] = -1;
    c.setAttribute('aCloth', new THREE.BufferAttribute(ac, 4));
    c.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(n), 1));
    c.setAttribute('aShrink', new THREE.BufferAttribute(new Float32Array(n), 1));
    c.setAttribute('aPushW', new THREE.BufferAttribute(new Float32Array(n), 1));
    c.setAttribute('aCurv', new THREE.BufferAttribute(curv, 1));
    c.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(n).fill(matOf[Lk.name]), 1));
    c.setIndex(g.index);
    if (!h.bindMatrix.equals(first.bindMatrix) || !h.matrix.equals(first.matrix)) console.warn('hull not in the outfit space', Lk.name);
    hullParts.push(c);
  }
  await tick('hull parts');
  const hullOne = mergeGeometries(hullParts, false);
  const hull = new THREE.SkinnedMesh(mergeGeometries([2, 1, 0].map((layer) => {
    const c = hullOne.clone();
    c.setAttribute('aLayer', new THREE.BufferAttribute(new Float32Array(c.attributes.position.count).fill(layer), 1));
    return c;
  }), false), hullMaterial(table));
  hull.name = 'OutfitLines';
  hull.bind(first.skeleton, first.bindMatrix);
  hull.position.copy(outfit.position); hull.quaternion.copy(outfit.quaternion); hull.scale.copy(outfit.scale);
  hull.frustumCulled = false;
  hull.renderOrder = 1;
  hull.userData.castShadow = false;
  first.parent.add(hull);
  const sets = [{ name: 'Outfit', mesh: outfit, extra: [hull] }];

  await tick('hull merged');
  // ---------------------------------------------------------------- fold ink: creases laid on the cloth; each drawing sets how strong
  // Every line is a chain of cloth vertices (it bends with them on the GPU); its width follows what the pose does.
  const folds = [];
  const FOLD_GAIN = 1.45;       // (backlit, the creases read as the darkest strokes on the cloth)
  const vpos = (m, i) => { const a = m.geometry.attributes.position; return V3(a.getX(i), a.getY(i), a.getZ(i)); };
  const segKeyOf = (mesh, i) => {
    const g = mesh.geometry, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
    return (segOf[best] ?? SEGS.torso) === SEGS.torso ? 'torso' : Object.keys(SEGS).find((k) => SEGS[k] === segOf[best]) ?? 'torso';
  };
  function nearest(mesh, p, ok = () => true) {
    const pos = mesh.geometry.attributes.position;
    let best = -1, bd = 1e9;
    for (let i = 0; i < pos.count; i++) {
      if (!ok(i)) continue;
      const d = (pos.getX(i) - p.x) ** 2 + (pos.getY(i) - p.y) ** 2 + (pos.getZ(i) - p.z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  // the first vertex a ray meets (from `from`, along `dir`), within r of the ray
  function hit(mesh, from, dir, ok = () => true) {
    const pos = mesh.geometry.attributes.position;
    const d = dir.clone().normalize();
    for (const r of [0.008, 0.014, 0.022]) {
      let best = -1, bt = 1e9;
      for (let i = 0; i < pos.count; i++) {
        if (!ok(i)) continue;
        const q = V3(pos.getX(i) - from.x, pos.getY(i) - from.y, pos.getZ(i) - from.z);
        const t = q.dot(d);
        if (t < 0 || t > bt) continue;
        if (q.addScaledVector(d, -t).length() > r) continue;
        bt = t; best = i;
      }
      if (best >= 0) return best;
    }
    return -1;
  }
  // (the searches are queued and run below, a fold at a time, so the build gives the page back in between)
  const nearestL = (...args) => () => nearest(...args);
  const hitL = (...args) => () => hit(...args);
  const foldsAsked = [];
  function addFold(mesh, idx, width, weight) {
    if (mesh) foldsAsked.push({ mesh, idx, width, weight });
  }
  // what the drawing does: elbow bends, arms raised and reaching, the turn and the lean of the body
  const M = { bend: { l: 0, r: 0 }, raise: { l: 0, r: 0 }, reach: { l: 0, r: 0 }, twist: 0, fwd: 0 };
  const wpos = (n) => B[n].getWorldPosition(new THREE.Vector3());
  function measure() {
    root.getWorldQuaternion(rootQ);
    const up = V3(0, 1, 0).applyQuaternion(rootQ), fw = V3(0, 0, 1).applyQuaternion(rootQ), lf = V3(1, 0, 0).applyQuaternion(rootQ);
    const neck = wpos('neck_01'), pel = wpos('pelvis');
    const down = pel.clone().sub(neck).normalize();
    for (const s of ['l', 'r']) {
      const U = wpos(`upperarm_${s}`), Lw = wpos(`lowerarm_${s}`), H = wpos(`hand_${s}`);
      const u = Lw.clone().sub(U).normalize(), l = H.clone().sub(Lw).normalize();
      M.bend[s] = Math.acos(THREE.MathUtils.clamp(u.dot(l), -1, 1));
      M.raise[s] = Math.acos(THREE.MathUtils.clamp(u.dot(down), -1, 1));
      M.reach[s] = Math.max(0, u.dot(fw));
    }
    const sh = wpos('upperarm_l').sub(wpos('upperarm_r')), hp = wpos('thigh_l').sub(wpos('thigh_r'));
    M.twist = Math.atan2(sh.dot(fw), sh.dot(lf)) - Math.atan2(hp.dot(fw), hp.dot(lf));
    M.fwd = Math.acos(THREE.MathUtils.clamp(-down.dot(up), -1, 1));
  }
  {
    const bl = meshes.Blouse, pa = meshes.Pants, sc = meshes.Scarf;
    const blOk = (key) => (i) => segKeyOf(bl, i) === key;
    for (const s of ['l', 'r']) {
      const sx = s === 'l' ? 1 : -1;
      const U = P(`upperarm_${s}`), E = P(`lowerarm_${s}`), Hd = P(`hand_${s}`);
      const u0 = E.clone().sub(U).normalize(), l0 = Hd.clone().sub(E).normalize();
      let inner = l0.clone().addScaledVector(u0, -l0.dot(u0));
      if (inner.lengthSq() < 1e-4) inner = V3(0, 0, 1).addScaledVector(u0, -u0.z);
      inner.normalize();
      const side = new THREE.Vector3().crossVectors(u0, inner).normalize();
      const armOk = (i) => { const k = segKeyOf(bl, i); return k === `upper_${s}` || k === `lower_${s}`; };
      // elbow creases: short arcs on the inside of the bend
      [[-0.022, 0.9, 1.0], [0.0, 1.2, 1.25], [0.024, 0.8, 0.85]].forEach(([off, span, wmul], k) => {
        const idx = [];
        for (let a = 0; a <= 6; a++) {
          const t = -span / 2 + (span * a) / 6;
          const pt = E.clone().addScaledVector(u0, off + 0.008 * t + 0.004 * k).addScaledVector(inner, Math.cos(t) * 0.07).addScaledVector(side, Math.sin(t) * 0.07);
          idx.push(nearestL(bl, pt, armOk));
        }
        addFold(bl, idx, 2.3 * wmul, () => sm(0.5, 1.4, M.bend[s]));
      });
      // reaching forward: the back pulls from the shoulder blade toward the other hip
      addFold(bl, [[0.1, -0.05], [0.07, -0.11], [0.035, -0.17], [0.0, -0.23]].map(([x, y]) => hitL(bl, V3(sx * x, U.y + y, -0.5), V3(0, 0, 1), blOk('torso'))),
        2.2, () => sm(0.3, 0.75, M.reach[s]));
      // under the arm: the sleeve's seam gathers when the arm comes forward
      addFold(bl, [[0.0, -0.02], [0.012, -0.05], [0.02, -0.08]].map(([x, y]) => hitL(bl, V3(sx * (0.15 + x), U.y + y, 0.6), V3(0, 0, -1), (i) => segKeyOf(bl, i) !== `lower_${s}`)),
        1.8, () => sm(0.25, 0.7, M.reach[s]) * 0.8);
      // the trousers: the lap creases from the groin toward the knee, the crumple at the ankle (they do not move)
      const K = P(`calf_${s}`), T = P(`thigh_${s}`), A = P(`foot_${s}`);
      const thigh = K.clone().sub(T);
      [[0.25, 0.75, -0.03, 2.0], [0.35, 0.85, 0.02, 1.6]].forEach(([a, b, dx, w]) => {
        const idx = [];
        for (let q = 0; q <= 4; q++) {
          const c = T.clone().addScaledVector(thigh, a + (b - a) * (q / 4)).add(V3(sx * (dx + 0.012 * q), 0, 0));
          idx.push(hitL(pa, c.clone().add(V3(0, 0.4, 0)), V3(0, -1, 0)));
        }
        addFold(pa, idx, w, () => 0.8);
      });
      [[-0.02, 1.9], [0.025, 1.5]].forEach(([dy, w]) => {
        const idx = [];
        for (let q = 0; q <= 4; q++) {
          const ang = -0.9 + 1.8 * (q / 4);
          const c = A.clone().add(V3(Math.sin(ang) * 0.3 * sx, 0.07 + dy, Math.cos(ang) * 0.3));
          idx.push(hitL(pa, c, A.clone().add(V3(0, 0.07 + dy, 0)).sub(c), (i) => pa.geometry.attributes.position.getY(i) < 0.2));
        }
        addFold(pa, idx, w, () => 0.75);
      });
    }
    // bending forward: soft folds across the front of the blouse at the waist
    [[0.035, 2.2, 0.11], [0.065, 1.8, 0.09], [0.0, 1.6, 0.08]].forEach(([dy, w, span]) => {
      const idx = [];
      for (let q = 0; q <= 5; q++) idx.push(hitL(bl, V3(-span + 2 * span * (q / 5), waistY + dy, 0.6), V3(0, -0.15, -1), blOk('torso')));
      addFold(bl, idx, w, () => sm(0.32, 0.55, M.fwd));
    });
    // turning: the back of the waist gathers
    [[[-0.07, 0.06], [0.0, 0.035], [0.06, 0.015]], [[-0.05, 0.12], [0.02, 0.095], [0.075, 0.07]]].forEach((pts, k) => {
      addFold(bl, pts.map(([x, y]) => hitL(bl, V3(x, waistY + y, -0.6), V3(0, 0, 1), blOk('torso'))), 2.2 - 0.3 * k,
        () => sm(0.06, 0.22, Math.abs(M.twist)) * 0.9 + sm(0.4, 0.6, M.fwd) * 0.4);
    });
    // the scarf: two wraps round the neck
    if (sc) {
      const nc = P('neck_01');
      [[0.012, 1.6], [0.035, 1.4]].forEach(([dy, w]) => {
        const idx = [];
        for (let q = 0; q <= 8; q++) {
          const ang = -2.2 + 4.4 * (q / 8);
          const dir = V3(-Math.sin(ang), 0, -Math.cos(ang));
          const from = nc.clone().add(V3(0, dy - 0.02 * Math.cos(ang), 0)).addScaledVector(dir, -0.3);
          idx.push(hitL(sc, from, dir));
        }
        addFold(sc, idx, w, () => 0.7);
      });
    }
  }
  for (const fa of foldsAsked) {
    const idx = fa.idx.map((v) => (typeof v === 'function' ? v() : v));
    const clean = idx.filter((v, k) => v >= 0 && v !== idx[k - 1]);
    if (clean.length >= 2) folds.push({ mesh: fa.mesh, idx: clean, width: fa.width, weight: fa.weight });
    await tick('fold');
  }
  console.assert(folds.length <= NFOLD, 'too many fold lines');
  const foldMat = foldMaterial(table);
  await tick('fold lines found');
  const foldMesh = (() => {
    let nPts = 0;
    for (const f of folds) nPts += f.idx.length;
    const nV = nPts * 2;
    const pos = new Float32Array(nV * 3), nrm = new Float32Array(nV * 3), info = new Float32Array(nV * 3);
    const si = new Uint16Array(nV * 4), sw = new Float32Array(nV * 4), ac = new Float32Array(nV * 4), mat = new Float32Array(nV);
    const index = [];
    let v = 0;
    folds.forEach((f, fi) => {
      const g = f.mesh.geometry;
      const Pp = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, AM = g.attributes.aMat;
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
          for (let q = 0; q < 4; q++) { si[v * 4 + q] = SI.getComponent(i, q); sw[v * 4 + q] = SW.getComponent(i, q); ac[v * 4 + q] = q === 0 ? -1 : 0; }
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
    g.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(nV), 1));
    g.setAttribute('aShrink', new THREE.BufferAttribute(new Float32Array(nV), 1));
    g.setAttribute('aPushW', new THREE.BufferAttribute(new Float32Array(nV), 1));
    g.setAttribute('aMat', new THREE.BufferAttribute(mat, 1));
    g.setIndex(index);
    const m = new THREE.SkinnedMesh(g, foldMat);
    m.name = 'FoldLines';
    m.bind(first.skeleton, first.bindMatrix);
    m.position.copy(outfit.position); m.quaternion.copy(outfit.quaternion); m.scale.copy(outfit.scale);
    m.frustumCulled = false;
    m.renderOrder = 3;
    m.userData.castShadow = false;
    first.parent.add(m);
    return m;
  })();
  sets[0].extra.push(foldMesh);
  function updateFolds() {
    measure();
    const Wf = foldMat.uniforms.uFoldW.value;
    folds.forEach((f, fi) => { Wf[fi] = f.width * FOLD_GAIN * THREE.MathUtils.clamp(f.weight(), 0, 1.3); });
  }

  await tick('fold mesh');
  // ---------------------------------------------------------------- hands: rest frames, anchors, finger curl axes
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
    hand[s] = { f0, p0, grip: gripW.sub(h.wp).applyQuaternion(inv), fingers, restHandQ: basis(f0, p0), across: across.clone().applyQuaternion(inv) };
  }
  const arm = {};
  for (const s of ['l', 'r']) {
    const U = rest[`upperarm_${s}`], Lb = rest[`lowerarm_${s}`], H = rest[`hand_${s}`];
    const u0 = Lb.wp.clone().sub(U.wp), l0 = H.wp.clone().sub(Lb.wp);
    const hinge = new THREE.Vector3().crossVectors(u0, l0).normalize();
    arm[s] = {
      l1: u0.length(), l2: l0.length(),
      uLocal: basis(u0.clone().applyQuaternion(U.wq.clone().invert()), hinge.clone().applyQuaternion(U.wq.clone().invert())),
      lLocal: basis(l0.clone().applyQuaternion(Lb.wq.clone().invert()), hinge.clone().applyQuaternion(Lb.wq.clone().invert())),
    };
  }
  // finger poses: angles for the three joints of each finger, the thumb's swing across the palm
  const FINGERS = {
    grip: { index: [1.05, 1.15, 0.7], middle: [1.15, 1.2, 0.75], ring: [1.2, 1.2, 0.75], pinky: [1.25, 1.15, 0.7], thumb: [0.28, 0.4, 0.28], oppose: 0.6 },
    relax: { index: [0.25, 0.35, 0.2], middle: [0.32, 0.42, 0.25], ring: [0.4, 0.46, 0.3], pinky: [0.46, 0.5, 0.3], thumb: [0.1, 0.2, 0.15], oppose: 0.25 },
    open: { index: [0.05, 0.08, 0.05], middle: [0.06, 0.08, 0.05], ring: [0.1, 0.1, 0.05], pinky: [0.14, 0.12, 0.06], thumb: [0.05, 0.1, 0.1], oppose: 0.45 },
    // a fine pinch between the thumb and the index; the other fingers tuck
    pinch: { index: [0.55, 0.6, 0.35], middle: [0.9, 0.95, 0.55], ring: [1.15, 1.1, 0.7], pinky: [1.2, 1.1, 0.7], thumb: [0.35, 0.45, 0.3], oppose: 0.95 },
    // the left hand's nip at a stem's end: index and thumb only, the other fingers tucked away from the stem
    nip: { index: [0.55, 0.6, 0.35], middle: [1.25, 1.25, 0.8], ring: [1.3, 1.25, 0.8], pinky: [1.35, 1.2, 0.75], thumb: [0.35, 0.45, 0.3], oppose: 0.95 },
    // the fingertips spread round a flower's top, closing the petals
    cup: { index: [0.45, 0.5, 0.3], middle: [0.5, 0.55, 0.3], ring: [0.55, 0.55, 0.3], pinky: [0.6, 0.55, 0.3], thumb: [0.2, 0.3, 0.2], oppose: 0.85 },
    // the index straight, the others curled: it presses a petal open from inside
    point: { index: [0.08, 0.1, 0.06], middle: [0.75, 0.85, 0.5], ring: [1.1, 1.05, 0.65], pinky: [1.15, 1.05, 0.65], thumb: [0.3, 0.35, 0.25], oppose: 0.7 },
    // a light hold on the spoon's handle: thumb and index pinch, the middle finger under it
    spoon: { index: [0.5, 0.55, 0.3], middle: [0.62, 0.7, 0.4], ring: [1.1, 1.1, 0.7], pinky: [1.2, 1.1, 0.7], thumb: [0.35, 0.45, 0.3], oppose: 0.9 },
  };
  const hasPinch = { pinch: true, spoon: true, point: true, nip: true };
  const FNAMES = ['index', 'middle', 'ring', 'pinky', 'thumb'];

  await tick('hands');
  // ---------------------------------------------------------------- props
  const holds = {};
  // the fresh-lotus basket's open side (-x in its own space) turned toward her
  const basketM = new THREE.Matrix4().compose(L.basket, new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), -Math.atan2(L.basket.z, L.basket.x)), V3(1, 1, 1));
  const still = buildStill(D, { basket: basketM, jar: new THREE.Matrix4().makeTranslation(L.jar.x, L.jar.y, L.jar.z), tube: new THREE.Matrix4().makeTranslation(L.tube.x, L.tube.y, L.tube.z) });
  root.add(still.obj);
  const basket = { lying: still.lying, matrix: basketM };
  await tick('still things');
  const flower = buildFlower(D, { stem: 0.12 });
  // (no sun shadow of its own: with a sun this low it would be a 20 m streak, lost inside hers, and it costs a draw)
  flower.obj.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.userData.castShadow = false; } });
  root.add(flower.obj);
  holds.flower = flower.obj;
  const spoon = buildSpoon(D);
  root.add(spoon.obj);
  holds.spoon = spoon.obj;
  const lat = buildLat(D);
  root.add(lat.obj);
  holds.lat = lat.obj;

  await tick('flower, spoon, lat');
  // the hat: its headband sits on the crown; worked out from the hair so the hair never comes through
  const hairM = meshes.Hair;
  const headRest = rest.head;
  const headUp = V3(0, 1, 0);         // hat axis in character space at rest (the neck took the lean back out)
  const hairPts = [];
  {
    const hp = hairM.geometry.attributes.position;
    for (let i = 0; i < hp.count; i += 2) hairPts.push(V3(hp.getX(i), hp.getY(i), hp.getZ(i)));
  }
  const bodyPts = [];
  {
    const bp = meshes.Body.geometry.attributes.position;
    for (let i = 0; i < bp.count; i++) { const y = bp.getY(i); if (y > meta.collarBase - 0.03) bodyPts.push(V3(bp.getX(i), y, bp.getZ(i))); }
  }
  const topPts = hairPts.concat(bodyPts);
  // the scarf over the chin and neck: the hat's strap goes round it
  const scarfPts = [];
  if (meshes.Scarf) {
    const sp = meshes.Scarf.geometry.attributes.position;
    for (let i = 0; i < sp.count; i++) scarfPts.push(V3(sp.getX(i), sp.getY(i), sp.getZ(i)));
  }
  const topY = Math.max(...topPts.map((p) => p.y));
  // the band: the lowest height where the whole head fits inside the oval, 4 mm clear
  const hatC = V3(0, 0, 0);
  {
    let cx = 0, cz = 0, n = 0;
    for (const p of topPts) if (p.y > topY - 0.03) { cx += p.x; cz += p.z; n++; }
    hatC.set(cx / n, 0, cz / n);
  }
  const [bx, bz] = HAT.bandR;
  let bandY = topY;
  for (let y = topY - 0.005; y > topY - 0.09; y -= 0.002) {
    const fits = topPts.every((p) => Math.abs(p.y - y) > 0.004 || ((p.x - hatC.x) / (bx - 0.0075)) ** 2 + ((p.z - hatC.z) / (bz - 0.0075)) ** 2 < 1);
    if (!fits) break;
    bandY = y;
  }
  let hatY = bandY - HAT.band;
  // nothing of the head may reach the cone's inside
  const inside = (p, y0) => { const y = p.y - y0; const rin = HAT.R * (1 - y / HAT.H) - HAT.thick * 1.6 - 0.003; return y < 0 || Math.hypot(p.x - hatC.x, p.z - hatC.z) < rin; };
  while (!topPts.every((p) => inside(p, hatY))) hatY += 0.002;
  hatC.y = hatY;
  // the quai: from the band at each side, down round the jaw, 13 mm off the skin
  const strap = [];
  {
    const jaw = bodyPts.filter((p) => p.z > headC.z - 0.02);
    const chinY = meta.chinY ?? Math.min(...jaw.filter((p) => Math.abs(p.x) < 0.02 && p.z > headC.z + 0.03).map((p) => p.y));
    const ctl = [];
    for (let k = 0; k <= 12; k++) {
      const a = (k / 12) * Math.PI;                    // 0: her left ear, pi: her right ear
      const side = Math.cos(a);
      // (round the front of the chin, over the scarf, clear of the neck when she bows)
      const y = lerp(bandY, chinY + 0.004, Math.sin(a) ** 0.7);
      const z = hatC.z + 0.06 * Math.sin(a) ** 2;
      ctl.push(V3(hatC.x + side * (bx + 0.001), y, z));
    }
    // push each point out of the skin (horizontally from the head's axis, and down under the chin)
    for (const c of ctl) {
      for (let it = 0; it < 30; it++) {
        let worst = 0;
        for (const p of bodyPts) {
          const d = p.distanceTo(c);
          if (d < 0.018) worst = Math.max(worst, 0.018 - d);
        }
        for (const p of scarfPts) {
          const d = p.distanceTo(c);
          if (d < 0.009) worst = Math.max(worst, 0.009 - d);
        }
        if (worst <= 0) break;
        const out = V3(c.x - hatC.x, 0, c.z - headC.z);
        if (out.lengthSq() < 1e-6) out.set(0, -1, 0); else out.normalize();
        if (Math.abs(c.x - hatC.x) < 0.04) out.set(0, -1, 0.3).normalize();
        c.addScaledVector(out, worst + 0.0015);
      }
      strap.push(c.clone().sub(hatC));
    }
  }
  await tick('hat fitted');
  const hat = buildHat(D, { strap });
  root.add(hat);
  holds.hat = hat;
  // the hat's frame in the head bone's space
  const hatInHead = new THREE.Matrix4();
  const hatInHead0 = new THREE.Matrix4();
  const headM0 = new THREE.Matrix4().compose(headRest.wp, headRest.wq, V3(1, 1, 1));
  {
    const hatM = new THREE.Matrix4().compose(hatC, new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), headUp), V3(1, 1, 1));
    hatInHead0.copy(headM0).invert().multiply(hatM);
    hatInHead.copy(hatInHead0);
  }
  // the hat worn tipped forward by `tilt` (about the band's front), raised just enough that the head stays clear of the cone
  function tipHat(tilt) {
    const band = V3(0, HAT.band, HAT.bandR[1]);
    const M = new THREE.Matrix4().makeTranslation(band.x, band.y, band.z)
      .multiply(new THREE.Matrix4().makeRotationX(tilt))
      .multiply(new THREE.Matrix4().makeTranslation(-band.x, -band.y, -band.z));
    for (let lift = 0; lift < 0.03; lift += 0.001) {
      hatInHead.copy(hatInHead0).multiply(new THREE.Matrix4().makeTranslation(0, lift, 0)).multiply(M);
      const inv = headM0.clone().multiply(hatInHead).invert();
      const ok = topPts.every((p) => {
        const q = p.clone().applyMatrix4(inv);
        const rin = HAT.R * (1 - q.y / HAT.H) - HAT.thick * 1.6 - 0.003;
        return q.y < 0 || Math.hypot(q.x, q.z) < rin;
      });
      if (ok) return lift;
    }
    return -1;
  }
  // on top of every key: the head a little toward the tray (10°), tipped toward her left shoulder (12.6°), the chin a touch up;
  // from the page's camera (behind her left shoulder) this keeps the front of her face out of sight (with the scarf)
  const TUNE = { head: [-0.05, -0.18, -0.22], neck: [0, 0, 0], hatTilt: 0 };

  // ---------------------------------------------------------------- the fist round a stem and the pinch point, measured on the real fingers
  function resetPose() {
    for (const b of bones) b.quaternion.copy(rest[b.name].local);
    root.updateMatrixWorld(true);
  }
  function curl(s, preset, amt = 1, mix = null) {
    const F = FINGERS[preset];
    const G = mix ? FINGERS[mix.to] : null;
    for (const f of FNAMES) {
      hand[s].fingers[f].forEach((seg, k) => {
        const b = B[seg.n];
        let ang = F[f][k] * amt;
        if (G) ang = lerp(ang, G[f][k], mix.u);
        _q.setFromAxisAngle(seg.axis, ang);
        b.quaternion.copy(rest[seg.n].local).multiply(_q);
        if (f === 'thumb' && k === 0) {
          const op = G ? lerp(F.oppose, G.oppose, mix.u) : F.oppose;
          const ax = hand[s].f0.clone().applyQuaternion(rest[`hand_${s}`].wq).applyQuaternion(rest[seg.n].wq.clone().invert());
          // (measured: this sign brings the thumb tip in front of the palm and toward the fingers, on both hands)
          b.quaternion.multiply(_q2.setFromAxisAngle(ax, (s === 'l' ? 1 : -1) * op * 0.6));
        }
      });
    }
  }
  const tipOf = (s, f) => {
    const a = B[`${f}_02_${s}`].getWorldPosition(new THREE.Vector3()), b = B[`${f}_03_${s}`].getWorldPosition(new THREE.Vector3());
    return b.clone().add(b.clone().sub(a).multiplyScalar(0.8));
  };
  async function measureAnchors(s) {
    const hb = B[`hand_${s}`];
    const Hd = hand[s];
    for (const preset of Object.keys(hasPinch)) {
      resetPose();
      curl(s, preset);
      root.updateMatrixWorld(true);
      const it = tipOf(s, 'index'), tt = tipOf(s, 'thumb');
      Hd[`at_${preset}`] = hb.worldToLocal(preset === 'point' ? it.clone() : it.clone().lerp(tt, 0.5));
      Hd[`gap_${preset}`] = it.distanceTo(tt);
    }
    // the fist round a 6 mm stem: the tightest curl that leaves the stem 2 mm clear of every finger joint
    const across = Hd.across.clone().normalize();
    let chosen = null;
    for (const amt of [1.2, 1.1, 1.0, 0.92, 0.85, 0.78, 0.7]) {
      resetPose();
      curl(s, 'grip', amt);
      root.updateMatrixWorld(true);
      const pts = [];
      for (const f of FNAMES) {
        const j = [1, 2, 3].map((q) => hb.worldToLocal(B[`${f}_0${q}_${s}`].getWorldPosition(new THREE.Vector3())));
        pts.push(...j, j[2].clone().add(j[2].clone().sub(j[1]).multiplyScalar(0.85)), j[0].clone().lerp(j[1], 0.5), j[1].clone().lerp(j[2], 0.5));
      }
      const knuck = hb.worldToLocal(B[`middle_01_${s}`].getWorldPosition(new THREE.Vector3()));
      for (let q = 0; q <= 4; q++) for (let a = -2; a <= 2; a++) pts.push(knuck.clone().multiplyScalar(q / 4).addScaledVector(Hd.p0, 0.011).addScaledVector(across, a * 0.018));
      let best = null;
      for (let a = -0.01; a <= 0.05; a += 0.002) for (let b = -0.03; b <= 0.05; b += 0.002) {
        const c = knuck.clone().multiplyScalar(0.5).addScaledVector(Hd.p0, a).addScaledVector(Hd.f0, b);
        let m = 9;
        for (const p of pts) {
          const d = p.clone().sub(c);
          d.addScaledVector(across, -d.dot(across));
          m = Math.min(m, d.length());
          if (best && m < best.m) break;
        }
        if (!best || m > best.m) best = { m, c };
      }
      chosen = { amt, ...best };
      await tick(`grip ${s} ${amt}`);
      if (best.m >= 0.0115) break;
    }
    Hd.grip = chosen.c;
    Hd.gripAmt = chosen.amt;
    Hd.gripClear = chosen.m;
  }
  await tick('hat');
  await measureAnchors('l');
  await measureAnchors('r');
  resetPose();

  // ---------------------------------------------------------------- arm solver: the anchor point of the hand goes to the goal
  const tmpA = new THREE.Vector3();
  function solveArm(s, goalW, fwdW, palmW, poleW, anchor) {
    const U = B[`upperarm_${s}`], Lb = B[`lowerarm_${s}`], Hb = B[`hand_${s}`];
    const A = arm[s], Hd = hand[s];
    const qh = basis(fwdW, palmW).multiply(Hd.restHandQ.clone().invert());
    const off = anchor.clone().applyQuaternion(qh);
    const T = goalW.clone().sub(off);
    const S = U.getWorldPosition(tmpA);
    const d = T.clone().sub(S);
    let len = d.length();
    const dir = d.clone().normalize();
    const reach = len;
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
    const qlBase = basis(l, hinge).multiply(A.lLocal.clone().invert());
    const handFromBase = qlBase.clone().invert().multiply(qh);
    const axisL = l.clone().applyQuaternion(qlBase.clone().invert()).normalize();
    const dd = handFromBase.x * axisL.x + handFromBase.y * axisL.y + handFromBase.z * axisL.z;
    const twFull = new THREE.Quaternion(axisL.x * dd, axisL.y * dd, axisL.z * dd, handFromBase.w).normalize();
    setWorldQuat(Lb, qlBase.clone().multiply(new THREE.Quaternion().slerp(twFull, 0.55)));
    setWorldQuat(Hb, qh);
    return reach - (A.l1 + A.l2 - 0.004);     // > 0: the goal is out of reach by this much
  }

  await tick('anchors');
  // ---------------------------------------------------------------- the acting
  // Character space: she faces +z, her left is +x. Body deltas in radians: x bends forward, y turns to her left, z leans to her right.
  // Flower: where its heart is ('at'), which way it opens ('up'), how open, how much tea. Where it is: basket | hand | jar.
  // Hands: a goal and how the hand meets it.
  const n3 = (x, y, z) => V3(x, y, z).normalize();
  const bowlTea = V3(L.bowl.x, PLACE.tea, L.bowl.z);
  const WORK = V3(0.02, 0.55, 0.455);            // the flower's heart while she works on it (clear of the hat's brim)
  const WUP = n3(-0.12, 1, -0.3);
  const thighDir = P('calf_r').sub(P('thigh_r')).normalize();
  const thighUp = V3(0, 1, 0).addScaledVector(thighDir, -thighDir.y).normalize();
  const kneeR = P('thigh_r').lerp(P('calf_r'), 0.95).addScaledVector(thighUp, 0.12);
  const inBasket = V3(0.035, BASKET.lift + BASKET.bed + 0.069, 0.0).applyMatrix4(basketM);
  // drawn out of the basket: the stem end rises first, the bud slides out from under the leaf, then up
  const outA = { at: V3(0.02, BASKET.lift + BASKET.bed + 0.09, 0.0).applyMatrix4(basketM), up: n3(0.75, -0.45, 0.0).transformDirection(basketM) };
  const outB = { at: V3(-0.09, BASKET.lift + BASKET.h - 0.02, 0.0).applyMatrix4(basketM), up: n3(0.8, -0.6, 0.0).transformDirection(basketM) };
  const inJar = L.jar.clone().add(V3(0, JAR.h + 0.03, 0));
  const BUD_SIDE = V3(-1, 0, 0.15).normalize();
  const budGripAt = (heart) => heart.clone().add(V3(0, 0.056 + 0.006, 0)).addScaledVector(BUD_SIDE, 0.038);
  // her left knee (the left hand passes over it on its way to the basket)
  const kneeL = P('thigh_l').lerp(P('calf_l'), 0.9).addScaledVector(V3(0, 1, 0), 0.1);
  // into the jar stem first, slanting in from her side, then upright and down
  const mouth = L.jar.clone().add(V3(0, JAR.h, 0));
  const toHer = V3(-L.jar.x, 0, -L.jar.z).normalize();
  const slantUp = toHer.clone().multiplyScalar(0.77).add(V3(0, 0.64, 0)).normalize();
  const jarIn1 = { at: mouth.clone().addScaledVector(slantUp, 0.13), up: slantUp };
  const upright = toHer.clone().multiplyScalar(0.3).add(V3(0, 0.95, 0)).normalize();
  const jarIn2 = { at: mouth.clone().addScaledVector(upright, -0.03).addScaledVector(upright, 0.124), up: upright };
  const K = [
    { f: 0, name: 'grab', ease: 'hold',
      spine: [0.32, 0.18, -0.3], neck: [0.52, 0.02, 0.0], head: [0.06, -0.04, 0.0],
      fl: { where: 'basket' }, hl: { on: 'stem', s: 0.11, pinch: true }, fil: 'nip',
      hr: { at: kneeR, fwd: thighDir.clone(), palm: thighUp.clone().negate(), pole: n3(-1, -0.2, -0.3) }, fir: 'open' },
    { f: 3, name: 'draw-out', ease: 'in',
      spine: [0.3, 0.17, -0.28], neck: [0.52, 0.02, 0.0], head: [0.06, -0.04, 0.0],
      fl: { where: 'hand', ...outA, open: 0.12, noArc: true }, hl: { on: 'stem', s: 0.11, pinch: true }, fil: 'nip',
      hr: { at: kneeR, fwd: thighDir.clone(), palm: thighUp.clone().negate(), pole: n3(-1, -0.2, -0.3) }, fir: 'open' },
    { f: 5, name: 'up', ease: 'out',
      spine: [0.26, 0.14, -0.22], neck: [0.5, 0.02, 0.0], head: [0.06, -0.03, 0.0],
      fl: { where: 'hand', ...outB, open: 0.12, noArc: true }, hl: { on: 'stem', s: 0.1, pinch: true }, fil: 'nip',
      hr: { at: kneeR, fwd: thighDir.clone(), palm: thighUp.clone().negate(), pole: n3(-1, -0.2, -0.3) }, fir: 'open' },
    { f: 9, name: 'lift', ease: 'snap',
      spine: [0.2, 0.1, -0.12], neck: [0.45, 0.02, 0.0], head: [0.05, -0.02, 0.0],
      fl: { where: 'hand', at: L.basket.clone().add(V3(-0.1, BASKET.lift + BASKET.h + 0.17, 0.02)), up: n3(-0.3, 1, 0.2), open: 0.12, noArc: true }, hl: { on: 'stem' }, fil: 'grip',
      hr: { at: kneeR, fwd: thighDir.clone(), palm: thighUp.clone().negate(), pole: n3(-1, -0.2, -0.3) }, fir: 'open' },
    { f: 14, name: 'bring', ease: 'out',
      spine: [0.27, 0.02, 0.0], neck: [0.42, 0.0, 0.0], head: [0.06, 0.0, 0.0],
      fl: { where: 'hand', at: WORK, up: WUP, open: 0.12 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { at: WORK.clone().add(V3(-0.125, 0.02, 0.05)), fwd: n3(0.5, 0.3, 0.8), palm: n3(0.7, -0.2, -0.5), pole: n3(-1, -0.6, -0.4) }, fir: 'open' },
    { f: 18, name: 'touch', ease: 'inout',
      spine: [0.27, 0.02, 0.0], neck: [0.4, 0.0, 0.0], head: [0.05, 0.0, 0.0],
      fl: { where: 'hand', at: WORK, up: WUP, open: 0.14 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { petal: [2, 3], pinch: true, pull: 0, pole: n3(-0.6, -1, -0.2) }, fir: 'pinch' },
    { f: 26, name: 'open-a', ease: 'inout',
      spine: [0.27, 0.02, 0.0], neck: [0.4, 0.0, 0.0], head: [0.05, 0.0, 0.0],
      fl: { where: 'hand', at: WORK, up: WUP, open: 0.6 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { petal: [2, 3], pinch: true, pull: 0.004, pole: n3(-0.6, -1, -0.2) }, fir: 'pinch' },
    { f: 30, name: 'shift', ease: 'snap',
      spine: [0.27, 0.02, 0.0], neck: [0.4, 0.0, 0.0], head: [0.05, 0.0, 0.0],
      fl: { where: 'hand', at: WORK, up: WUP, open: 0.62 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { petal: [2, 4], pinch: true, pull: 0, pole: n3(-0.6, -1, -0.2) }, fir: 'pinch' },
    { f: 36, name: 'open-b', ease: 'inout',
      spine: [0.27, 0.02, 0.0], neck: [0.4, 0.0, 0.0], head: [0.05, 0.0, 0.0],
      fl: { where: 'hand', at: WORK, up: WUP, open: 1.0 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { petal: [2, 4], pinch: true, pull: 0.004, pole: n3(-0.6, -1, -0.2) }, fir: 'pinch' },
    { f: 42, name: 'to-spoon', ease: 'inout',
      spine: [0.34, 0.08, 0.0], neck: [0.4, 0.02, 0.0], head: [0.04, 0.0, 0.0],
      fl: { where: 'hand', at: WORK.clone().add(V3(0, 0, 0.02)), up: WUP, open: 1.0 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { spoon: 'rest', lift: 0.05, pole: n3(-1, -0.4, -0.2) }, fir: 'spoon', sp: { where: 'bowl' } },
    { f: 46, name: 'pick', ease: 'in',
      spine: [0.36, 0.08, 0.0], neck: [0.4, 0.02, 0.0], head: [0.04, 0.0, 0.0],
      fl: { where: 'hand', at: WORK.clone().add(V3(0, 0, 0.02)), up: WUP, open: 1.0 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { spoon: 'rest', fwd: n3(0.02, -0.3, 1), palm: n3(0.4, -0.9, 0), pole: n3(-1, -0.4, -0.2) }, fir: 'spoon', sp: { where: 'bowl' } },
    { f: 52, name: 'scoop', ease: 'inout',
      spine: [0.37, 0.08, 0.0], neck: [0.4, 0.02, 0.0], head: [0.04, 0.0, 0.0],
      fl: { where: 'hand', at: WORK.clone().add(V3(0, 0, 0.02)), up: WUP, open: 1.0 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { spoon: 'hand', fwd: n3(0.02, -0.3, 1), palm: n3(0.4, -0.9, 0), pole: n3(-1, -0.4, -0.2) }, fir: 'spoon',
      sp: { where: 'hand', at: bowlTea.clone().add(V3(0.004, -0.004, 0.0)), dir: n3(0.08, 0.75, -1), roll: 0, tea: 1 } },
    { f: 58, name: 'carry', ease: 'out',
      spine: [0.3, 0.06, 0.0], neck: [0.41, 0.02, 0.0], head: [0.04, 0.0, 0.0],
      fl: { where: 'hand', at: WORK.clone().add(V3(0, -0.005, 0.015)), up: n3(-0.12, 1, -0.15), open: 1.0 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { spoon: 'hand', fwd: n3(0.3, -0.3, 1), palm: n3(0.4, -0.9, 0), pole: n3(-1, -0.4, -0.2) }, fir: 'spoon',
      sp: { where: 'hand', at: bowlTea.clone().add(V3(0.06, 0.1, -0.12)), dir: n3(-0.6, 0.45, -0.5), roll: 0, tea: 1 } },
    { f: 64, name: 'over', ease: 'inout',
      spine: [0.26, 0.04, 0.0], neck: [0.39, 0.02, 0.0], head: [0.05, 0.0, 0.0],
      fl: { where: 'hand', at: WORK.clone().add(V3(0, -0.01, 0.02)), up: n3(-0.1, 1, 0.0), open: 1.0 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { spoon: 'hand', fwd: n3(0.3, -0.3, 1), palm: n3(0.4, -0.9, 0), pole: n3(-1, -0.4, -0.2) }, fir: 'spoon',
      sp: { where: 'hand', over: 0.076, dir: n3(-0.75, 0.4, 0.45), roll: 0, tea: 1 } },
    { f: 72, name: 'pour', ease: 'inout',
      spine: [0.26, 0.04, 0.0], neck: [0.4, 0.02, 0.0], head: [0.05, 0.0, 0.0],
      fl: { where: 'hand', at: WORK.clone().add(V3(0, -0.01, 0.02)), up: n3(-0.1, 1, 0.0), open: 1.0, tea: 1 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { spoon: 'hand', fwd: n3(0.3, -0.3, 1), palm: n3(0.4, -0.9, 0), pole: n3(-1, -0.4, -0.2) }, fir: 'spoon',
      sp: { where: 'hand', over: 0.07, dir: n3(-0.75, 0.4, 0.45), roll: -1.4, tea: 0 } },
    { f: 78, name: 'back', ease: 'inout',
      spine: [0.34, 0.08, 0.0], neck: [0.4, 0.02, 0.0], head: [0.04, 0.0, 0.0],
      fl: { where: 'hand', at: WORK.clone().add(V3(0, 0, 0.02)), up: WUP, open: 1.0, tea: 1 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { spoon: 'rest', fwd: n3(0.02, -0.3, 1), palm: n3(0.4, -0.9, 0), pole: n3(-1, -0.4, -0.2) }, fir: 'spoon', sp: { where: 'bowl' } },
    { f: 82, name: 'let', ease: 'out',
      spine: [0.32, 0.07, 0.0], neck: [0.4, 0.02, 0.0], head: [0.04, 0.0, 0.0],
      fl: { where: 'hand', at: WORK.clone().add(V3(0, 0, 0.02)), up: WUP, open: 1.0, tea: 1 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { spoon: 'rest', lift: 0.055, pole: n3(-1, -0.4, -0.2) }, fir: 'spoon', sp: { where: 'bowl' } },
    { f: 88, name: 'close', ease: 'inout',
      spine: [0.3, 0.05, 0.0], neck: [0.4, -0.03, 0.0], head: [0.05, 0.0, 0.0],
      fl: { where: 'hand', at: WORK, up: WUP, open: 0.55, tea: 1 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { petal: [2, 3], outside: true, pole: n3(-0.6, -1, -0.2) }, fir: 'point' },
    { f: 94, name: 'closed', ease: 'inout',
      spine: [0.32, 0.0, 0.04], neck: [0.41, 0.0, 0.0], head: [0.05, 0.0, 0.0],
      fl: { where: 'hand', at: WORK, up: WUP, open: 0.0, tea: 1 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { petal: [2, 3], outside: true, pole: n3(-0.6, -1, -0.2) }, fir: 'point' },
    { f: 100, name: 'strip', ease: 'inout',
      spine: [0.45, -0.04, 0.12], neck: [0.4, 0.06, 0.0], head: [0.04, 0.04, 0.0],
      fl: { where: 'hand', at: WORK, up: WUP, open: 0.0, tea: 1 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { strip: 0, noArc: true, fwd: n3(0.3, -0.6, 0.8), palm: n3(0.2, -0.5, -0.8), pole: n3(-1, -0.2, -0.3) }, fir: 'pinch', lt: { phase: 'tube', draw: 0 } },
    { f: 106, name: 'draw', ease: 'out',
      spine: [0.29, 0.05, 0.0], neck: [0.42, 0.04, 0.0], head: [0.04, 0.02, 0.0],
      fl: { where: 'hand', at: WORK, up: WUP, open: 0.0, tea: 1 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { strip: 1, fwd: n3(0.1, 0.4, 0.9), palm: n3(0.4, -0.5, -0.6), pole: n3(-1, -0.4, -0.4) }, fir: 'pinch', lt: { phase: 'tube', draw: 1 } },
    { f: 110, name: 'lay', ease: 'inout',
      spine: [0.31, 0.07, 0.0], neck: [0.39, -0.04, 0.0], head: [0.05, 0.0, 0.0],
      fl: { where: 'hand', at: WORK, up: WUP, open: 0.0, tea: 1 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { wrap: 0, fwd: n3(0.5, 0.2, 0.8), palm: n3(0.6, -0.2, -0.6), pole: n3(-1, -0.6, -0.4) }, fir: 'pinch', lt: { phase: 'wrap', wrap: 0 } },
    { f: 118, name: 'wrap-a', ease: 'inout',
      spine: [0.31, 0.07, 0.0], neck: [0.39, -0.04, 0.0], head: [0.05, 0.0, 0.0],
      fl: { where: 'hand', at: WORK, up: WUP, open: 0.0, tea: 1 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { wrap: 0.5, fwd: n3(0.5, 0.2, 0.8), palm: n3(0.6, -0.2, -0.6), pole: n3(-1, -0.6, -0.4) }, fir: 'pinch', lt: { phase: 'wrap', wrap: 0.5 } },
    { f: 126, name: 'wrap-b', ease: 'inout',
      spine: [0.31, 0.07, 0.0], neck: [0.39, -0.04, 0.0], head: [0.05, 0.0, 0.0],
      fl: { where: 'hand', at: WORK, up: WUP, open: 0.0, tea: 1 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { wrap: 1.0, fwd: n3(0.5, 0.2, 0.8), palm: n3(0.6, -0.2, -0.6), pole: n3(-1, -0.6, -0.4) }, fir: 'pinch', lt: { phase: 'wrap', wrap: 1 } },
    // the right fingers tuck the strip's end under the last turn
    { f: 129, name: 'tuck', ease: 'inout',
      spine: [0.31, 0.06, 0.0], neck: [0.39, -0.04, 0.0], head: [0.05, 0.0, 0.0],
      fl: { where: 'hand', at: WORK, up: WUP, open: 0.0, tea: 1 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { wrap: 1.0, fwd: n3(0.5, 0.2, 0.8), palm: n3(0.6, -0.2, -0.6), pole: n3(-1, -0.6, -0.4) }, fir: 'pinch', lt: { phase: 'tied' } },
    // the right hand takes the tied bud by its band; the left lets the stem go and reaches down for the next flower,
    // while the right carries this one over the small basket on the tray, lowers its stem in and lets it drop
    { f: 132, name: 'take', ease: 'inout',
      spine: [0.28, -0.02, 0.0], neck: [0.41, -0.06, 0.0], head: [0.05, -0.02, 0.0],
      fl: { where: 'hand', at: WORK.clone().add(V3(-0.02, 0.0, 0.01)), up: WUP, open: 0.0, tea: 1 }, hl: { on: 'stem' }, fil: 'grip',
      hr: { bud: 2, noArc: true, pole: n3(-1, -0.3, -0.3) }, fir: 'pinch', lt: { phase: 'tied' } },
    { f: 135, name: 'carry', ease: 'inout',
      spine: [0.3, -0.08, 0.04], neck: [0.4, -0.14, 0.0], head: [0.05, -0.04, 0.0],
      fl: { where: 'handR', at: mouth.clone().add(V3(0.06, 0.17, -0.07)), up: n3(0.1, 1, -0.1), open: 0.0, tea: 1, noArc: true },
      hl: { at: V3(0.25, 0.6, 0.4), fwd: n3(0.4, -0.5, 0.7), palm: n3(-0.3, -0.9, 0.1), pole: n3(1, -0.3, -0.3) }, fil: 'relax',
      hr: { bud: 2, noArc: true, pole: n3(-1, -0.3, -0.3) }, fir: 'pinch', lt: { phase: 'tied' } },
    { f: 138, name: 'lower', ease: 'inout',
      spine: [0.37, -0.1, 0.13], neck: [0.4, -0.16, 0.0], head: [0.05, -0.04, 0.0],
      fl: { where: 'handR', at: mouth.clone().add(V3(0, 0.104, 0)), up: V3(0, 1, 0), open: 0.0, tea: 1, noArc: true },
      hl: { at: L.basket.clone().add(V3(-0.1, BASKET.lift + BASKET.h + 0.16, 0.0)), fwd: n3(0.2, -0.8, 0.5), palm: n3(-0.6, -0.7, 0.2), pole: n3(1, -0.2, -0.4) }, fil: 'open',
      hr: { bud: 2, noArc: true, pole: n3(-1, -0.3, -0.3) }, fir: 'pinch', lt: { phase: 'tied' } },
    { f: 140, name: 'let-go', ease: 'snap',
      spine: [0.32, -0.06, 0.02], neck: [0.42, -0.12, 0.0], head: [0.05, -0.04, 0.0],
      fl: { where: 'jar' },
      hl: { at: L.basket.clone().add(V3(-0.08, BASKET.lift + BASKET.h + 0.12, 0.0)), fwd: n3(0.0, -1, 0.3), palm: n3(-0.9, 0, 0.3), pole: n3(1, -0.2, -0.4) }, fil: 'open',
      hr: { at: budGripAt(mouth.clone().add(V3(0, 0.104, 0))).add(V3(0.0, 0.03, -0.03)), fwd: n3(-0.1, -0.3, 0.95), palm: n3(0.95, 0.0, 0.1), noArc: true, pole: n3(-1, -0.3, -0.3) }, fir: 'relax', lt: { phase: 'tied' } },
    { f: 142, name: 'back', ease: 'inout',
      spine: [0.31, 0.1, -0.16], neck: [0.48, 0.0, 0.0], head: [0.06, -0.03, 0.0],
      fl: { where: 'jar' },
      hl: { at: L.basket.clone().add(V3(-0.07, BASKET.lift + BASKET.h + 0.07, 0.0)), fwd: n3(0.2, -1, 0.2), palm: n3(-0.9, 0, 0.3), pole: n3(1, -0.2, -0.4) }, fil: 'open',
      hr: { at: kneeR.clone().add(V3(-0.02, 0.05, 0.03)), fwd: thighDir.clone(), palm: thighUp.clone().negate(), pole: n3(-1, -0.2, -0.3) }, fir: 'open', lt: { phase: 'tied' } },
    { f: 144, name: 'grab', ease: 'inout',
      spine: [0.32, 0.18, -0.3], neck: [0.52, 0.02, 0.0], head: [0.06, -0.04, 0.0],
      fl: { where: 'basket' }, hl: { on: 'stem', s: 0.11, pinch: true }, fil: 'nip',
      hr: { at: kneeR, fwd: thighDir.clone(), palm: thighUp.clone().negate(), pole: n3(-1, -0.2, -0.3) }, fir: 'open' },
  ];
  const EASE = {
    in: (u) => u * u * u,
    out: (u) => 1 - Math.pow(1 - u, 3),
    inout: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
    snap: (u) => 1 - Math.pow(1 - u, 4.5),
    hold: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  };
  const lerpA = (a, b, u) => a.map((x, i) => x + ((b[i] ?? 0) - x) * u);

  await tick('keys');
  // ---------------------------------------------------------------- posing
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
  const W = (v) => root.localToWorld(v.clone());
  const Wd = (v) => v.clone().applyQuaternion(root.getWorldQuaternion(rootQ));
  const sample = { frame: 0, flowerWhere: 'basket', spoonWhere: 'bowl', latPhase: 'tube', reach: { l: 0, r: 0 }, wrap: 0, draw: 0 };

  // the flower's pose in her space: heart position, opening axis, twist
  const flowerQ = new THREE.Quaternion();
  function placeFlower(at, up, tw = 0) {
    flowerQ.setFromUnitVectors(V3(0, 1, 0), up.clone().normalize());
    flowerQ.multiply(_q.setFromAxisAngle(V3(0, 1, 0), tw));
    flower.obj.position.copy(at);
    flower.obj.quaternion.copy(flowerQ);
    flower.obj.updateMatrixWorld(true);
  }
  // the fresh flower lying in the basket (and the tied one sunk in the jar): fixed poses
  const basketPose = { at: inBasket, up: n3(0.8, -0.6, 0.0).transformDirection(basketM) };
  const jarPose = { at: L.jar.clone().add(V3(0.0, 0.133, 0.0)), up: V3(0, 1, 0) };
  const stemPoint = (sv) => flower.obj.localToWorld(V3(0, -sv, 0));
  const stemDir = () => V3(0, 1, 0).transformDirection(flower.obj.matrixWorld);
  const GRIP_S = 0.045;           // the left fist sits this far down the stem

  // the spoon: resting in the bowl, or held
  const spoonRest = { at: bowlTea.clone().add(V3(0.004, -0.004, 0.006)), dir: n3(0.08, 0.62, -1) };   // (handle toward her, clear of the small basket)
  function placeSpoon(at, dir, roll) {
    // spoon space: handle along -z; dir = from the bowl toward the handle end
    const back = dir.clone().normalize();
    const m = new THREE.Matrix4();
    const zAxis = back.clone().negate();
    let up = V3(0, 1, 0).addScaledVector(zAxis, -zAxis.y).normalize();
    const xAxis = new THREE.Vector3().crossVectors(up, zAxis).normalize();
    up = new THREE.Vector3().crossVectors(zAxis, xAxis);
    m.makeBasis(xAxis, up, zAxis);
    spoon.obj.quaternion.setFromRotationMatrix(m).multiply(_q.setFromAxisAngle(V3(0, 0, 1), roll));
    spoon.obj.position.copy(at);
    spoon.obj.updateMatrixWorld(true);
  }
  const spoonHandleW = () => spoon.obj.localToWorld(V3(0, 0.007, -SPOON_HOLD));

  // the lạt: resting in the tube, drawn, wound round the bud, tied
  const latPts = Array.from({ length: LAT.n }, () => new THREE.Vector3());
  const latUps = Array.from({ length: LAT.n }, () => new THREE.Vector3(0, 1, 0));
  const WRAP_Y = 0.056;              // height on the bud (flower space) where the strip goes round
  const WRAP_TURNS = 1.6;
  const WRAP_A0 = 2.6;              // where the strip starts, flower space (with the flower's own turn of 0.4 this is at her right)
  function budRadius() { return flower.budR(WRAP_Y, 0) + 0.0022; }
  let budR0 = 0.03;
  function layLat(phase, { draw = 0, wrap = 0, pinchW = null } = {}) {
    const n = LAT.n;
    // at rest it lies coiled inside the tube, below the mouth: nothing of it shows, so it is never hidden and shown again
    // (the painted strips standing in the tube are the others, still in there)
    const mouth = L.tube.clone().add(V3(0.0, TUBE.h - 0.006, 0.0));
    const coilR = TUBE.r - 0.007, coilY0 = 0.012, coilRise = 0.055 / LAT.len;
    if (phase === 'tube') {
      // the part she has drawn runs from her fingers down to the tube's mouth; the rest is still coiled inside
      const top = pinchW ? root.worldToLocal(pinchW.clone()) : mouth;
      const drawn = draw * LAT.len;
      for (let k = 0; k < n; k++) {
        const sLen = (k / (n - 1)) * LAT.len;         // how far down the strip this point is from its top end
        if (sLen <= drawn) {
          latPts[k].copy(top).lerp(mouth, drawn > 1e-4 ? sLen / drawn : 0);
          latUps[k].set(1, 0, 0);
        } else {
          const c = sLen - drawn;                      // how far into the coil
          const a = -c / coilR;
          latPts[k].set(L.tube.x + Math.cos(a) * coilR, L.tube.y + coilY0 + c * coilRise, L.tube.z + Math.sin(a) * coilR);
          latUps[k].set(Math.cos(a), 0, Math.sin(a));
        }
      }
    } else {
      // wound: a helix on the bud from its start, then the free part to the fingers
      const Mf = flower.obj.matrix;
      const turns = WRAP_TURNS * (phase === 'tied' ? 1 : wrap);
      const helixN = Math.max(2, Math.round((n - 1) * 0.72 * (phase === 'tied' ? 1 : Math.max(0.08, wrap))));
      const a0 = WRAP_A0;
      const r = budR0;
      for (let k = 0; k < n; k++) {
        const u = k / Math.max(1, helixN - 1);
        if (k < helixN) {
          const a = a0 - u * turns * Math.PI * 2;
          const y = WRAP_Y - 0.004 + 0.008 * u;
          latPts[k].set(Math.cos(a) * r, y, Math.sin(a) * r).applyMatrix4(Mf);
          latUps[k].set(Math.cos(a), 0, Math.sin(a)).transformDirection(Mf);
        } else if (phase === 'tied') {
          // the end tucked under the last turn, a short tail standing off
          const e = k - helixN;
          const a = a0 - turns * Math.PI * 2 - 0.18 * e;
          latPts[k].set(Math.cos(a) * (r + 0.001 + 0.00025 * e), WRAP_Y + 0.004 - 0.0005 * e, Math.sin(a) * (r + 0.001 + 0.00025 * e)).applyMatrix4(Mf);
          latUps[k].set(Math.cos(a), 0, Math.sin(a)).transformDirection(Mf);
        } else {
          const last = latPts[helixN - 1];
          const fin = pinchW ? root.worldToLocal(pinchW.clone()) : last;
          const u2 = (k - helixN + 1) / (n - helixN);
          latPts[k].copy(last).lerp(fin, u2);
          latUps[k].copy(latUps[helixN - 1]);
        }
      }
    }
    lat.lay(latPts, latUps);
  }
  // the point on the wrap where the strip leaves the bud (her character space), for the fingers
  function wrapLeave(wrap, outward = 0.018) {
    const a = WRAP_A0 - wrap * WRAP_TURNS * Math.PI * 2;
    const r = budR0;
    const p = V3(Math.cos(a) * r, WRAP_Y + 0.004 * wrap, Math.sin(a) * r);
    const tg = V3(Math.sin(a), 0, -Math.cos(a));
    p.addScaledVector(tg, outward).addScaledVector(V3(Math.cos(a), 0, Math.sin(a)), 0.014);
    return p.applyMatrix4(flower.obj.matrix);
  }

  let lastDrawing = -1;
  function pose(frame) {
    const f = ((frame % (LOOP * FPS)) + LOOP * FPS) % (LOOP * FPS);
    let i = 0;
    while (i < K.length - 2 && K[i + 1].f <= f) i++;
    const a = K[i], b = K[i + 1];
    const u0 = (f - a.f) / (b.f - a.f);
    const u = (EASE[b.ease] ?? EASE.inout)(u0);
    const drift = b.ease === 'hold' ? Math.sin(u0 * Math.PI) * 0.01 : 0;
    resetPose();
    const sp = lerpA(a.spine, b.spine, u);
    rotateBone('spine_01', sp.map((x) => x * 0.34));
    rotateBone('spine_02', sp.map((x) => x * 0.36));
    rotateBone('spine_03', sp.map((x) => x * 0.3 + drift * 0.3));
    rotateBone('neck_01', lerpA(a.neck, b.neck, u).map((x, i) => x + TUNE.neck[i]));
    rotateBone('head', lerpA(a.head, b.head, u).map((x, i) => x + TUNE.head[i]));
    root.updateMatrixWorld(true);

    // ---- the flower
    const fa = a.fl, fb = b.fl;
    const flPose = (k) => {
      if (k.where === 'basket') return { ...basketPose, open: 0.12, tea: 0 };
      if (k.where === 'jar') return { ...jarPose, open: 0, tea: 1 };
      return { at: k.at, up: k.up, open: k.open ?? 0, tea: k.tea ?? 0 };
    };
    const A = flPose(fa), Bp = flPose(fb);
    // the flower leaves the basket only in the hand; it drops into the jar from the hand
    let fAt = A.at.clone().lerp(Bp.at, u), fUp = A.up.clone().lerp(Bp.up, u).normalize();
    if (fa.where === 'jar' && fb.where === 'basket') { const q = u < 0.5 ? A : Bp; fAt = q.at.clone(); fUp = q.up.clone(); }
    const travel = A.at.distanceTo(Bp.at);
    // a carried flower travels on an arc out to her right, never up under the hat's brim
    const jump = fa.where === 'jar' && fb.where === 'basket';
    if (!jump && !fa.noArc && !fb.noArc && (fa.where !== fb.where || travel > 0.1)) fAt.add(Wd(V3(-0.7, 0.15, 0.3)).normalize().multiplyScalar(Math.sin(u * Math.PI) * Math.min(0.06, travel * 0.25)));
    let where = fb.where === 'jar' ? (fa.where === 'jar' ? 'jar' : u < 0.35 ? fa.where : 'jar') : fa.where === 'basket' && u < 0.02 ? 'basket' : fa.where === 'hand' && fb.where === 'handR' ? (u < 0.3 ? 'hand' : 'handR') : (fb.where === 'handR' || fa.where === 'handR') ? 'handR' : 'hand';
    if (fa.where === 'basket' && fb.where === 'basket') where = 'basket';
    if (fa.where === 'jar' && fb.where === 'basket') where = u < 0.5 ? 'jar' : 'basket';
    if (where === 'jar' && fa.where !== 'jar') {
      // falling: the last drawings of the drop
      const fall = sm(0.35, 1, u);
      const from = fa.where === 'hand' || fa.where === 'handR' ? A : jarIn2;
      fAt = from.at.clone().lerp(jarPose.at, fall);
      fUp = from.up.clone().lerp(jarPose.up, fall).normalize();
    }
    const open = lerp(A.open, Bp.open, u);
    const tea = lerp(A.tea, Bp.tea, fb.name === 'pour' ? sm(0.2, 0.9, u0) : u);
    // while the strip is wound, the flower turns in her fingers (the left thumb rolls the stem): the strip leaves it at one place
    const wv = (a.hr && a.hr.wrap !== undefined) || (b.hr && b.hr.wrap !== undefined) ? lerp(a.hr.wrap ?? (b.hr.wrap ?? 0), b.hr.wrap ?? 1, u) : (b.lt && b.lt.phase === 'tied') || (a.lt && a.lt.phase === 'tied') || fa.where === 'jar' ? 1 : 0;
    const spin = where === 'basket' ? 0 : -wv * WRAP_TURNS * Math.PI * 2;
    sample.spin = spin;
    placeFlower(fAt, fUp, 0.4 + spin);
    // petals: when the fingers work them, they move on the drawing the fingers do
    flower.set({ open, tea: (fa.tea ?? (fa.where === 'jar' ? 1 : 0)) === (fb.tea ?? 0) && !(b.name === 'pour') ? (fb.tea ?? 0) : tea });
    sample.flowerWhere = where;
    if (Math.abs(open) < 0.02 && budR0 === 0.03) budR0 = budRadius();

    // ---- the left hand
    const leftOnStem = (k) => k.hl && k.hl.on === 'stem';
    const gs = lerp(a.hl && a.hl.s !== undefined ? a.hl.s : GRIP_S, b.hl && b.hl.s !== undefined ? b.hl.s : GRIP_S, u);
    const stemGoal = () => {
      const g = stemPoint(gs);
      const across = stemDir().negate();
      // the fist: the palm toward the stem from her left and a little behind, the stem across the palm
      const gripOri = () => {
        const p0 = Wd(V3(-0.85, 0.0, 0.35)).normalize();
        const palm = p0.addScaledVector(across, -p0.dot(across)).normalize();
        return { fwd: new THREE.Vector3().crossVectors(palm, across).normalize(), palm };
      };
      // a pinch at the stem's end: the fingers point along the stem toward the bud, the palm turned down (and in, when the stem stands up)
      const pinchOri = () => {
        const fwd = stemDir();
        const h = Wd(n3(-0.35, -1, 0.0));
        return { fwd, palm: h.addScaledVector(fwd, -h.dot(fwd)).normalize() };
      };
      const oa = a.hl && a.hl.pinch ? pinchOri() : gripOri();
      const ob = b.hl && b.hl.pinch ? pinchOri() : gripOri();
      const w = sm(0.2, 0.8, u);
      const fwd = oa.fwd.lerp(ob.fwd, w).normalize();
      const palm0 = oa.palm.lerp(ob.palm, w);
      const palm = palm0.addScaledVector(fwd, -palm0.dot(fwd)).normalize();
      return { p: g, fwd, palm, pole: Wd(V3(1, -0.2, -0.15)) };
    };
    const freeGoal = (k, side) => {
      const h = k[side];
      return { p: W(h.at), fwd: Wd(h.fwd), palm: Wd(h.palm), pole: Wd(h.pole) };
    };
    {
      const onA = leftOnStem(a), onB = leftOnStem(b);
      let G;
      if (onA && onB) G = stemGoal();
      else {
        const ga = onA ? stemGoal() : freeGoal(a, 'hl');
        const gb = onB ? stemGoal() : freeGoal(b, 'hl');
        G = { p: ga.p.clone().lerp(gb.p, u), fwd: ga.fwd.clone().lerp(gb.fwd, u).normalize(), palm: ga.palm.clone().lerp(gb.palm, u).normalize(), pole: ga.pole.clone().lerp(gb.pole, u).normalize() };
        // letting go: the fingers open before the hand leaves
        if (onA && !onB) G.p.lerp(stemGoal().p, 1 - sm(0.0, 0.35, u));
      }
      // the anchor: the pinch or the fist, blended while the fingers change their hold
      const anA = a.hl && a.hl.pinch ? hand.l.at_nip : hand.l.grip, anB = b.hl && b.hl.pinch ? hand.l.at_nip : hand.l.grip;
      const anchorL = anA.clone().lerp(anB, sm(0.2, 0.8, u));
      // while the fingers change their hold they open a little: the stem sits a few mm further out from the palm
      if (anA !== anB) anchorL.addScaledVector(hand.l.p0, -Math.sin(Math.PI * sm(0.2, 0.8, u)) * 0.009);
      sample.leftPinch = (a.hl && a.hl.pinch && u < 0.5) || (b.hl && b.hl.pinch && u >= 0.5);
      sample.reach.l = solveArm('l', G.p, G.fwd, G.palm, G.pole, anchorL);
      const holding = where === 'hand' && (onA && (onB || u < 0.3));
      sample.leftFollows = holding;
      if (holding) {
        // the fist is where it is: the flower goes with it
        const got = B.hand_l.localToWorld(anchorL.clone());
        const want = stemPoint(gs);
        flower.obj.position.add(root.worldToLocal(got.clone()).sub(root.worldToLocal(want.clone())));
        flower.obj.updateMatrixWorld(true);
      }
      sample.leftOnStem = (onA && onB) || (onA && u < 0.3) || (onB && u > 0.8);
      sample.fil = onA && onB ? 'grip' : u < 0.5 ? a.fil : b.fil;
      const fiA = a.fil, fiB = b.fil;
      if (fiA === fiB) curl('l', fiA, fiA === 'grip' ? hand.l.gripAmt : 1);
      else if (onA && onB) curl('l', fiA, fiA === 'grip' ? hand.l.gripAmt : 1, { to: fiB, u: sm(0.2, 0.8, u) });
      else if (onA && !onB) curl('l', u < 0.3 ? 'grip' : fiB, u < 0.3 ? hand.l.gripAmt : 1);
      else if (!onA && onB) curl('l', u < 0.8 ? fiA : 'grip', u < 0.8 ? 1 : hand.l.gripAmt);
      else curl('l', u < 0.5 ? fiA : fiB);
    }

    // ---- the spoon
    const spA = a.sp ?? { where: 'bowl' }, spB = b.sp ?? { where: 'bowl' };
    const spPose = (k) => {
      if (k.where === 'bowl') return { at: spoonRest.at, dir: spoonRest.dir, roll: 0, tea: 0 };
      if (k.over !== undefined) {
        // above the flower's heart, the bowl of the spoon over it
        const heart = flower.obj.localToWorld(V3(0, 0.03 + k.over, 0));
        return { at: root.worldToLocal(heart), dir: k.dir, roll: k.roll, tea: k.tea };
      }
      return { at: k.at, dir: k.dir, roll: k.roll, tea: k.tea };
    };
    {
      const s1 = spPose(spA), s2 = spPose(spB);
      const at = s1.at.clone().lerp(s2.at, u);
      if (s1.at.distanceTo(s2.at) > 0.05) at.y += Math.sin(u * Math.PI) * 0.03;
      const dir = s1.dir.clone().lerp(s2.dir, u).normalize();
      placeSpoon(at, dir, lerp(s1.roll, s2.roll, u));
      // tea on the spoon: taken up as it digs, poured out as it tips
      let st = lerp(s1.tea, s2.tea, u);
      if (b.name === 'scoop') st = sm(0.4, 0.9, u0);
      if (b.name === 'pour') st = 1 - sm(0.2, 0.8, u0);
      spoon.setTea(st);
      sample.spoonWhere = spB.where;
    }

    // ---- the right hand
    const upW = () => V3(0, 1, 0).transformDirection(flower.obj.matrixWorld);
    const orient = (fwd, palm0) => {
      const f = fwd.clone().normalize();
      const p = palm0.clone().addScaledVector(f, -palm0.dot(f)).normalize();
      return { fwd: f, palm: p };
    };
    const rGoal = (k) => {
      const h = k.hr;
      if (!h) return null;
      if (h.at) return freeGoal(k, 'hr');
      if (h.petal) {
        // the index fingertip on the petal's inside, near its tip, pressing it out; the finger points down into the flower
        const tip = flower.petalTip(h.petal[0], h.petal[1], flower.state.open, 0.78);
        const pW = flower.obj.localToWorld(tip.p.clone());
        const outW = tip.out.clone().transformDirection(flower.obj.matrixWorld);
        if (h.pinch) {
          // the tip between thumb and index, the hand outside the flower: fingers point in, a little down
          const o = orient(outW.clone().multiplyScalar(-0.6).addScaledVector(upW(), -0.8), outW.clone().negate().addScaledVector(upW(), -0.3));
          return { p: pW.addScaledVector(outW, 0.002 + (h.pull ?? 0)), ...o, pole: Wd(h.pole) };
        }
        if (h.outside) {
          // closing: the fingertip on the petal's outside, pressing it in; the finger points in and down
          const o = orient(outW.clone().negate().addScaledVector(upW(), -0.3), upW().negate().addScaledVector(outW, -0.4));
          return { p: pW.addScaledVector(outW, 0.0095), ...o, pole: Wd(h.pole) };
        }
        const o = orient(upW().negate().addScaledVector(outW, 0.45), outW.clone().negate().addScaledVector(upW(), -0.2));
        return { p: pW.addScaledVector(outW, -0.009 - (h.pull ?? 0)), ...o, pole: Wd(h.pole) };
      }
      if (h.spoon) {
        // held like a brush: the fingers along the handle toward the bowl, the palm down and in
        const p = spoonHandleW();
        if (h.lift) p.y += h.lift;
        const along = spoon.obj.localToWorld(V3(0, 0, 0)).sub(spoon.obj.localToWorld(V3(0, 0, -1))).normalize();
        const o = orient(along, Wd(V3(0.9, -0.35, 0.1)));
        return { p, ...o, pole: Wd(h.pole) };
      }
      if (h.cup !== undefined) {
        // the fingertips round the top of the flower: the anchor sits just above the petal tips
        const top = flower.obj.localToWorld(V3(0, 0.085 + h.cup, 0));
        return { p: top, fwd: Wd(h.fwd), palm: Wd(h.palm), pole: Wd(h.pole) };
      }
      if (h.strip !== undefined) {
        const top = W(L.tube.clone().add(V3(0.0, TUBE.h + 0.03 + h.strip * LAT.len * 0.45, 0.0)));
        if (h.strip > 0) top.add(Wd(V3(-0.06, 0.02, -0.05)).multiplyScalar(h.strip));
        return { p: top, fwd: Wd(h.fwd), palm: Wd(h.palm), pole: Wd(h.pole) };
      }
      if (h.wrap !== undefined) {
        const ang = WRAP_A0 - h.wrap * WRAP_TURNS * Math.PI * 2;
        // (the flower has turned by +wrap turns, so this is always the same side of the bud in her space)
        const radial = V3(Math.cos(ang), 0, Math.sin(ang)).transformDirection(flower.obj.matrixWorld);
        const tang = V3(Math.sin(ang), 0, -Math.cos(ang)).transformDirection(flower.obj.matrixWorld);
        const o = orient(tang.clone().addScaledVector(upW(), -0.1).addScaledVector(radial, -0.25), radial.clone().negate().addScaledVector(upW(), -0.15));
        return { p: wrapLeave(h.wrap).applyMatrix4(root.matrixWorld), ...o, pole: Wd(h.pole), wrap: h.wrap };
      }
      if (h.bud) {
        // pinch the tied bud at its band, from her right
        // the side of the bud toward her right hand, whichever way the flower has turned
        const side = Wd(V3(-1, 0, 0.15)).normalize();
        const p = flower.obj.localToWorld(V3(0, WRAP_Y + 0.006, 0)).addScaledVector(side, budR0 + 0.008);
        const o = h.bud === 2 ? orient(Wd(V3(-0.1, -0.3, 0.95)), Wd(V3(0.95, 0.0, 0.1))) : orient(side.clone().negate().addScaledVector(upW(), -0.4), upW().negate().addScaledVector(side, 0.2));
        return { p, ...o, pole: Wd(h.pole) };
      }
      return null;
    };
    {
      const ga = rGoal(a), gb = rGoal(b);
      let G;
      if (a.hr.wrap !== undefined && b.hr.wrap !== undefined) {
        // round the bud: the fingers follow the strip as it goes round, not a straight line
        const wv = lerp(a.hr.wrap, b.hr.wrap, u);
        const g2 = rGoal({ hr: { wrap: wv, pole: b.hr.pole } });
        G = { p: g2.p, fwd: g2.fwd, palm: g2.palm, pole: Wd(b.hr.pole) };
        sample.wrap = wv;
      } else {
        G = { p: ga.p.clone().lerp(gb.p, u), fwd: ga.fwd.clone().lerp(gb.fwd, u).normalize(), palm: ga.palm.clone().lerp(gb.palm, u).normalize(), pole: ga.pole.clone().lerp(gb.pole, u).normalize() };
        const travel = ga.p.distanceTo(gb.p);
        if (travel > 0.08 && !a.hr.noArc && !b.hr.noArc) G.p.add(Wd(V3(-0.8, 0.1, 0.45)).normalize().multiplyScalar(Math.sin(u * Math.PI) * travel * 0.3));
      }
      const fr = u < 0.5 ? a.fir : b.fir;
      sample.fir = fr;
      const anchor = hasPinch[fr] ? hand.r[`at_${fr}`] : hasPinch[b.fir] && u > 0.3 ? hand.r[`at_${b.fir}`] : hand.r.grip;
      sample.reach.r = solveArm('r', G.p, G.fwd, G.palm, G.pole, anchor);
      if (a.fir === b.fir) curl('r', a.fir);
      else curl('r', a.fir, 1, { to: b.fir, u: sm(0.2, 0.8, u) });
    }

    // ---- the flower in the right hand: it follows the pinch
    if (where === 'handR') {
      const pin = B.hand_r.localToWorld(hand.r.at_pinch.clone());
      const want = flower.obj.localToWorld(V3(0, WRAP_Y + 0.006, 0)).addScaledVector(Wd(V3(-1, 0, 0.15)).normalize(), budR0 + 0.008);
      flower.obj.position.add(root.worldToLocal(pin).sub(root.worldToLocal(want)));
      flower.obj.updateMatrixWorld(true);
    }

    // ---- the lạt
    const la = a.lt ?? { phase: 'tube', draw: 0 }, lb = b.lt ?? { phase: 'tube', draw: 0 };
    const pinch = B.hand_r.localToWorld(hand.r.at_pinch.clone());
    if (lb.phase === 'tube') layLat('tube', { draw: lerp(la.draw ?? 0, lb.draw ?? 0, u), pinchW: a.name === 'strip' && b.name === 'draw' ? pinch : null });
    else if (lb.phase === 'wrap' && la.phase === 'tube') layLat('wrap', { wrap: 0, pinchW: pinch });
    else if (lb.phase === 'wrap') layLat('wrap', { wrap: lerp(la.wrap ?? 0, lb.wrap ?? 0, u), pinchW: pinch });
    else layLat('tied');
    sample.latPhase = lb.phase;
    // sunk in the jar, or lying under the leaf in the basket: out of sight, and not drawn (its shadow would leak through the coarse
    // shadow map). It is drawn again as her fingers draw it out from under the leaf.
    const out = fa.where === 'jar' || (fa.where === 'basket' && f < 3);
    flower.obj.visible = !out;
    sample.flowerHidden = out;

    // ---- the hat rides the head
    B.head.updateMatrixWorld(true);
    const hm = B.head.matrixWorld.clone().multiply(hatInHead);
    hm.premultiply(root.matrixWorld.clone().invert());
    hm.decompose(hat.position, hat.quaternion, hat.scale);
    hat.updateMatrixWorld(true);

    sample.frame = f;
    root.updateMatrixWorld(true);
    updateFolds();
  }

  await tick('posing');
  // ---------------------------------------------------------------- the face check
  // A camera sees the face only if a line from a face point to it leaves the hat and the head's own shadow side.
  const facePts = [];
  {
    const bp = meshes.Body.geometry.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const p = V3(bp.getX(i), bp.getY(i), bp.getZ(i));
      const d = p.clone().sub(headC);
      if (d.z > 0.03 && d.y > -0.13 && d.y < 0.05 && Math.abs(d.x) < 0.06) facePts.push(p);
    }
  }
  const ray = new THREE.Raycaster();
  const invHeadQ = rest.head.wq.clone().invert();
  // zone 'features' (eyes, nose, mouth: never a pixel on the page) or 'cheek' (the cheeks and jaw, allowed from behind);
  // the same zones as the qa face mask in tea-paint.js
  const zoneOf = (d) => (d.z > 0.065 && Math.abs(d.x) < 0.035 && d.y > -0.1 && d.y < 0.03 ? 'features' : 'cheek');
  const faceLocal = facePts.map((p) => ({ p: p.clone().sub(rest.head.wp).applyQuaternion(invHeadQ), n: p.clone().sub(headC).normalize().applyQuaternion(invHeadQ), zone: zoneOf(p.clone().sub(headC)) }));
  const _hq = new THREE.Quaternion(), _fw = new THREE.Vector3(), _fd = new THREE.Vector3(), _hinv = new THREE.Matrix4();
  // A face point is hidden when the line from it to the camera meets the hat: the hat is a closed cone over an open rim, so a line
  // from below the rim is stopped if it crosses the rim's plane inside the rim; a line from inside the cone is stopped unless it
  // leaves downward through the rim. (Exact for the cone; the head itself hides the points turned away.)
  function face(camera, { list = false, rays = false } = {}) {
    const cam = camera.position;
    hat.updateMatrixWorld(true);
    B.head.getWorldQuaternion(_hq);
    _hinv.copy(hat.matrixWorld).invert();
    const cq = cam.clone().applyMatrix4(_hinv);
    let seen = 0;
    const out = [];
    const Rr = HAT.R + 0.002;
    for (const f of faceLocal) {
      const w = B.head.localToWorld(_fw.copy(f.p));
      const toCam = _fd.copy(cam).sub(w).normalize();
      if (f.n.clone().applyQuaternion(_hq).dot(toCam) < 0.05) continue;
      const q = w.clone().applyMatrix4(_hinv);
      const d = cq.clone().sub(q);
      let hidden;
      if (Math.abs(d.y) < 1e-9) hidden = q.y > 0;
      else {
        const s0 = -q.y / d.y;                       // where the line meets the rim's plane
        const crosses = s0 > 0 && s0 < 1;
        const r0 = crosses ? Math.hypot(q.x + d.x * s0, q.z + d.z * s0) : 1e9;
        hidden = q.y < 0 ? crosses && r0 < Rr : !(d.y < 0 && crosses && r0 < Rr);
      }
      if (hidden) continue;
      seen++;
      if (list) out.push(w.clone());
    }
    return list ? out : seen / Math.max(1, faceLocal.length);
  }

  function update(t, dt, camera = null) {
    const frame = Math.floor(t * FPS / STEP) * STEP;
    PU.uTime.value = t;
    if (frame !== lastDrawing) {
      pose(frame);
      lastDrawing = frame;
    }
  }
  const _pq = new THREE.Quaternion();
  // her face as points (world) with their outward normals and zones, as she is drawn now: every features point, a third of the cheek
  const probeLocal = faceLocal.filter((f, i) => f.zone === 'features' || i % 3 === 0);
  function faceProbes() {
    B.head.updateMatrixWorld(true);
    B.head.getWorldQuaternion(_pq);
    return probeLocal.map((f) => {
      const p = B.head.localToWorld(f.p.clone()), n = f.n.clone().applyQuaternion(_pq).normalize();
      return { person: 'teaMaker', zone: f.zone, p, n, at: p, normal: n };
    });
  }
  // capsules round her as she is drawn now (world): body segments with the cloth, the hat, the flower
  const _ca = new THREE.Vector3(), _cb = new THREE.Vector3();
  const segBones = { torso: ['pelvis', 'neck_01'], head: ['neck_01', 'head'] };
  for (const s of ['l', 'r']) {
    segBones[`upper_${s}`] = [`upperarm_${s}`, `lowerarm_${s}`];
    segBones[`lower_${s}`] = [`lowerarm_${s}`, `middle_03_${s}`];
    segBones[`thigh_${s}`] = [`thigh_${s}`, `calf_${s}`];
    segBones[`calf_${s}`] = [`calf_${s}`, `ball_${s}`];
  }
  const segPad = { torso: 0.05, head: 0.04, upper_l: 0.03, upper_r: 0.03, lower_l: 0.03, lower_r: 0.03, thigh_l: 0.05, thigh_r: 0.05, calf_l: 0.07, calf_r: 0.07 };
  function caps() {
    root.updateMatrixWorld(true);
    const out = [];
    for (const [k, [na, nb]] of Object.entries(segBones)) {
      const a = B[na].getWorldPosition(new THREE.Vector3());
      const b = k === 'head' ? B.head.localToWorld(headC.clone().sub(rest.head.wp).applyQuaternion(invHeadQ)) : B[nb].getWorldPosition(new THREE.Vector3());
      out.push([a, b, SEGS[k].r + segPad[k]]);
    }
    hat.updateMatrixWorld(true);
    out.push([hat.localToWorld(_ca.set(0, 0.02, 0)).clone(), hat.localToWorld(_cb.set(0, HAT.H * 0.6, 0)).clone(), HAT.R + 0.01]);
    if (flower.obj.visible) {
      out.push([flower.obj.localToWorld(_ca.set(0, -0.12, 0)).clone(), flower.obj.localToWorld(_cb.set(0, 0.06, 0)).clone(), 0.05]);
    }
    return out;
  }
  function poseAt(t) { pose(Math.floor((t * FPS) / STEP) * STEP); lastDrawing = -1; }
  function runTo(t) { lastDrawing = -1; update(t, 1 / 60); }

  // settle the bud's radius for the lạt once (closed)
  flower.set({ open: 0 });
  budR0 = budRadius();
  // a tied flower already stands in the small basket, exactly where the dropped one comes to rest: the dropped one is put away
  // there unseen (a camera that looks down into the basket sees the same flower either way). No shadow: it is deep inside.
  await tick('face');
  const twins = new THREE.Group();
  twins.name = 'jar-twin';
  {
    pose(140);
    // one mesh (the flower's own look, no outline rims) for the flower and its strip, in the flower's own space (the paint's
    // strokes are laid in object space: the same space gives the same strokes)
    flower.obj.updateMatrix();
    const flInv = flower.obj.matrix.clone().invert();
    const inRoot = (g) => {
      const main = g.userData.main ?? g;
      const geo = main.geometry.clone();
      g.updateMatrix();
      const Mx = flInv.clone().multiply(g.matrix).multiply(main.matrix);
      geo.applyMatrix4(Mx);
      const sn = geo.attributes.aSN;
      if (sn) {
        const nm = new THREE.Matrix3().getNormalMatrix(Mx);
        const v = new THREE.Vector3();
        for (let i = 0; i < sn.count; i++) { v.fromBufferAttribute(sn, i).applyMatrix3(nm).normalize(); sn.setXYZ(i, v.x, v.y, v.z); }
      }
      return geo;
    };
    const tg = mergeGeometries([inRoot(flower.obj), inRoot(lat.obj)], false);
    const tm = new THREE.Mesh(tg, (flower.obj.userData.main ?? flower.obj).material);
    tm.position.copy(flower.obj.position); tm.quaternion.copy(flower.obj.quaternion);
    tm.frustumCulled = false;
    tm.castShadow = false; tm.userData.castShadow = false;
    twins.add(tm);
    root.add(twins);
  }
  await tick('twins');
  resetPose();
  pose(0);
  await tick('first pose');
  return {
    prof: PROF,
    qa: { rest, meshes, B, holds, hand, sample, flower, spoon, lat, L, K, get frame() { return lastDrawing; }, hat, hatC, strap, facePts, HAT, STOOL, BASKET, JAR, TUBE,
      restPose() { resetPose(); lastDrawing = -1; }, twins, curl, FINGERS, resetPose,
      tune(o) { Object.assign(TUNE, o); const lift = tipHat(TUNE.hatTilt); lastDrawing = -1; return lift; },
      basketBuds: basket.lying.map((c) => c.clone().applyMatrix4(basketM)),
      get lampL() { const v = PU.uLamp.value; return v.y > -50 ? root.worldToLocal(new THREE.Vector3(v.x, v.y, v.z)) : null; } },
    group: root, bones: B, holds, update, runTo, poseAt, face, faceProbes, caps, loop: LOOP, sets,
    stats: { triangles: [outfit, hull, foldMesh].reduce((a, m) => a + m.geometry.index.count / 3, 0), folds: folds.length },
    folds, measures: M,
    landmarks: { headC, waistY, hipY },
    setDebug(v) { for (const s of sets) for (const e of s.extra) e.visible = !v; },
    still: still.obj,
    solidList() {
      const w = (v) => root.localToWorld(v.clone());
      const b = w(L.basket);
      return [
        { x: b.x, z: b.z, r: BASKET.r1 + 0.01, h: BASKET.h + 0.03, name: 'tea maker: fresh lotus basket' },
      ];
    },
  };
}
