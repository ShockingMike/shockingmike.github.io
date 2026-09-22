// Chớm world: people/haisen — the lotus picker of season Hạ (role 'picker').
// A woman of about 48 poles a small tin boat along a channel in the West Lake lotus at dusk, stops, squats and brings up two
// buds from the water, turns round and poles back out (acts.js). She stands in the season's boat: her root is the boat's own
// frame, the pole and the picked flowers are the season's meshes, moved from here.
// Body: MakeHuman (CC0, MPFB2), posed and dressed by code in Blender (chom-people-haisen/blender/build_haisen.py). Painted by
// haisen-paint.js, acted by acts.js on rig.js.
//
//   export async function buildPeople(scene, R, layout, core)
//     layout.roles: ['picker']; layout.picker = { boat, pole, picked, boatAt, period, deckY, pickAt, pickBlooms, pickBloomAt }
//   returns { update(t, dt, camera), sketch, movers(t), solids, caps(t), faceProbes(), pole(t), qa }
const here = (p) => new URL(p, import.meta.url).href;
const THREE = await import('three');
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const RIG = await import(here('./rig.js'));
const HP = await import(here('./haisen-paint.js'));
const ACTS = await import(here('./acts.js'));
const FOLDS = await import(here('./folds.js'));
const SKETCH = await import(here('./sketch.js'));
const { V3 } = RIG;

const NODE_LOOK = { Body: 'skin', Jacket: 'jacket', Pants: 'pants', Scarf: 'scarf', Hat: 'hat', Hair: 'hair', Band: 'band', Buttons: 'button' };

// How the nón lá sits on her head, set here (it is rigid on the head, so the whole hat and its chin ring turn about the
// head's centre once, at load). Measured with core/qa/faces.mjs: tipping it forward (up to 12 deg), dropping it and
// growing it (up to 1.12) does not hide her face when she bows toward the near side — the brim is then edge-on to the
// page's camera — while it does put the brim in the way of her hands and of the pole. So it is left as the model has it.
const HAT_TILT = 6 * Math.PI / 180;   // tipped a little to her left: her right forearm grazed the brim   // tipped a little to her left: her right forearm grazed the brim
const HAT_DROP = -0.013;    // lifted 13 mm on its own axis: her forearm grazed the brim
const HAT_SCALE = 0.92;     // 8% off the brim: it was in the way of her forearm and of the lotus she leans past
function tipHat(gltf, meta) {
  const hAx = V3(...meta.headAxis).normalize(), hFw = V3(...meta.headFwd).normalize();
  const side = new THREE.Vector3().crossVectors(hAx, hFw).normalize();
  const c = V3(...meta.headCentre);
  const ap = V3(...meta.hat.apex);
  const M = new THREE.Matrix4().makeTranslation(ap.x, ap.y, ap.z)
    .multiply(new THREE.Matrix4().makeScale(HAT_SCALE, HAT_SCALE, HAT_SCALE))
    .multiply(new THREE.Matrix4().makeTranslation(-ap.x, -ap.y, -ap.z))
    .premultiply(new THREE.Matrix4().makeTranslation(c.x, c.y, c.z)
      .multiply(new THREE.Matrix4().makeRotationAxis(side, HAT_TILT))
      .multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z)))
    .premultiply(new THREE.Matrix4().makeTranslation(-hAx.x * HAT_DROP, -hAx.y * HAT_DROP, -hAx.z * HAT_DROP));
  const seen = new Set();
  gltf.scene.traverse((o) => { if (o.isMesh && /^(H_)?(Hat|Band)$/.test(o.name) && !seen.has(o.geometry.uuid)) { seen.add(o.geometry.uuid); o.geometry.applyMatrix4(M); } });
  meta.hat.apex = V3(...meta.hat.apex).applyMatrix4(M).toArray();
  meta.hat.axis = V3(...meta.hat.axis).transformDirection(M).normalize().toArray();
  meta.hat.radius *= HAT_SCALE;
  if (meta.hat.ringH !== undefined) meta.hat.ringH *= HAT_SCALE;
}

async function loadAsset() {
  const url = here('./haisen.glb');
  const gltf = await new GLTFLoader().loadAsync(url);
  const meta = await (await fetch(url.replace(/\.glb$/, '.json'))).json();
  tipHat(gltf, meta);
  return { gltf, meta };
}

// ---------------------------------------------------------------- her mẹt (the woven tray in the boat's floor)
// Her own prop, built here. Where the boat's floor is comes from the season's own hull, measured with a ray, never a number
// written down here; if the ray finds nothing the tray keeps its fallback height and the page says so.
// the boat's own hull, asked where its floor is: a ray straight down in the boat's frame, lowest surface it crosses
function hullSampler(boat) {
  if (!boat) return null;
  boat.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(boat.matrixWorld).invert();
  const dir = new THREE.Vector3(0, -1, 0).transformDirection(boat.matrixWorld).normalize();
  const from = new THREE.Vector3();
  const ray = new THREE.Raycaster(from, dir, 0.02, 3);
  const q = new THREE.Vector3();
  return (x, z) => {
    ray.set(from.set(x, 0.8, z).applyMatrix4(boat.matrixWorld), dir);
    const hits = ray.intersectObject(boat, true).filter((h) => h.object.visible && h.face);
    if (!hits.length) return null;
    let low = 9, high = -9;
    for (const h of hits) { const y = q.copy(h.point).applyMatrix4(inv).y; low = Math.min(low, y); high = Math.max(high, y); }
    return { low, high };
  };
}

// the floor under the whole tray, not just its middle: a mat lies in the boat, it does not hover over it
function trayField(T, hull) {
  const h0 = hull ? hull(T.x, T.z) : null;
  const y0 = h0 ? h0.low : null;
  const base = y0 ?? T.y;
  const cache = new Map();
  const at = (dx, dz) => {
    const key = `${dx.toFixed(3)},${dz.toFixed(3)}`;
    if (cache.has(key)) return cache.get(key);
    const y = hull ? hull(T.x + dx, T.z + dz) : null;
    const v = Math.min(y ? y.low : base, base + 0.07);       // it never climbs far up the bilge
    cache.set(key, v);
    return v;
  };
  return { y0: base, measured: y0 !== null, at };
}

// a shallow woven tray (mẹt): its floor follows the hull it lies on, its rim rolls up at the edge
function trayGeometry(T, field) {
  const pos = [], nor = [], idx = [], flow = [], axis = [], curv = [], seed = [];
  const NA = 40, NR = 7;
  const push = (p, n, f, ax, c) => { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); flow.push(f[0], f[1]); axis.push(ax.x, ax.y, ax.z); curv.push(c); seed.push(Math.random(), Math.random(), Math.random()); };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const rings = [];
  for (let j = 0; j <= NR; j++) {
    const u = j / NR;
    const r = T.r * (0.04 + 0.96 * u);
    const up = j === NR ? T.rim : (j === NR - 1 ? T.rim * 0.35 : 0);
    const row = [];
    for (let k = 0; k < NA; k++) {
      const a = (k / NA) * Math.PI * 2;
      const c = Math.cos(a), sn = Math.sin(a);
      const dx = r * c, dz = r * sn;
      const p = V(dx, field.at(dx, dz) + T.thick + up, dz);
      const n = V(c * (up > 0 ? 0.55 : 0.12), 1, sn * (up > 0 ? 0.55 : 0.12)).normalize();
      row.push(pos.length / 3);
      push(p, n, [a / (Math.PI * 2), u], V(-sn, 0, c), j === NR ? 0.6 : 0.15);
    }
    rings.push(row);
  }
  for (let j = 0; j < NR; j++) for (let k = 0; k < NA; k++) {
    const k2 = (k + 1) % NA, a = rings[j], b = rings[j + 1];
    idx.push(a[k], b[k], b[k2], a[k], b[k2], a[k2]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
  g.setAttribute('aAxis', new THREE.Float32BufferAttribute(axis, 3));
  g.setAttribute('aCurv', new THREE.Float32BufferAttribute(curv, 1));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 3));
  const n = pos.length / 3;
  g.setAttribute('aFace', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aQuilt', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  const cl = new Float32Array(n * 4); for (let i = 0; i < n; i++) cl[i * 4] = -1;
  g.setAttribute('aCloth', new THREE.BufferAttribute(cl, 4));
  g.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setIndex(idx);
  return g;
}

// ---------------------------------------------------------------- per-part attributes (in the person's own bind space)
function partAttributes(actor, geo, matName, row) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
  const n = pos.count;
  const flow = new Float32Array(n * 2), axis = new Float32Array(n * 3), curv = new Float32Array(n), face = new Float32Array(n), seed = new Float32Array(n * 3);
  const quilt = new Float32Array(n * 2);
  const segs = actor.segs;
  const meta = actor.meta;
  const headC = V3(...meta.headCentre), eye = V3(...meta.eye);
  const hAx = V3(...meta.headAxis).normalize(), hFw = V3(...meta.headFwd).normalize();
  const hSide = new THREE.Vector3().crossVectors(hAx, hFw).normalize();
  // the hair is combed back to the bun: its strands are the meridians of the axis from the head's centre to the bun
  const bun = V3(...meta.bun), bAx = bun.clone().sub(headC).normalize();
  const bX = new THREE.Vector3().crossVectors(bAx, hSide).normalize(), bY = new THREE.Vector3().crossVectors(bAx, bX);
  const bunAx = meta.bunAxis ? V3(...meta.bunAxis).normalize() : bAx;
  const hat = meta.hat, hatAx = V3(...hat.axis).normalize(), apex = V3(...hat.apex);
  const hatX = new THREE.Vector3().crossVectors(hatAx, hSide).normalize(), hatY = new THREE.Vector3().crossVectors(hatAx, hatX);
  const p = new THREE.Vector3(), q = new THREE.Vector3(), nn = new THREE.Vector3(), T = new THREE.Vector3();
  const sname = actor.partBones;
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i);
    nn.fromBufferAttribute(nor, i);
    seed[i * 3] = 1.37; seed[i * 3 + 1] = 0.71; seed[i * 3 + 2] = 2.03;
    if (matName === 'hair') {
      q.subVectors(p, headC);
      const dBun = p.distanceTo(bun);
      if (dBun < 0.05) {
        // the coil of the bun: strands wind round its own axis
        q.subVectors(p, bun);
        const az = Math.atan2(q.dot(bY), q.dot(bX));
        flow[i * 2] = az * 0.03 + q.dot(bunAx) * 0.6; flow[i * 2 + 1] = 2 + dBun;
        T.crossVectors(bunAx, q).normalize();
        quilt[i * 2 + 1] = 1;
      } else {
        const az = Math.atan2(q.dot(bY), q.dot(bX));
        flow[i * 2] = az * 0.09; flow[i * 2 + 1] = -q.dot(bAx);
        T.copy(bAx).addScaledVector(nn, -bAx.dot(nn));
      }
      if (T.lengthSq() < 1e-6) T.copy(hFw);
      T.normalize();
    } else if (matName === 'hat') {
      // the cone: rings round its axis (the bamboo hoops under the leaf) and strips of leaf running from the tip to the rim
      q.subVectors(p, apex);
      const h = -q.dot(hatAx);
      q.addScaledVector(hatAx, h);
      const az = Math.atan2(q.dot(hatY), q.dot(hatX));
      flow[i * 2] = az; flow[i * 2 + 1] = q.length() / hat.radius;
      T.copy(q).normalize();
    } else {
      let best = 0, bw = -1;
      for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
      const sg = segs[sname[geo.uuid][best]] ?? segs.torso;
      q.subVectors(p, sg.a);
      const along = q.dot(sg.axis);
      q.addScaledVector(sg.axis, -along);
      const ang = Math.atan2(q.dot(sg.side), q.dot(sg.ref));
      flow[i * 2] = ang * sg.r; flow[i * 2 + 1] = along;
      T.copy(sg.axis);
    }
    axis[i * 3] = T.x; axis[i * 3 + 1] = T.y; axis[i * 3 + 2] = T.z;
    if (matName === 'skin') {
      let wHead = 0;
      for (let k = 0; k < 4; k++) if (actor.partBoneNames[geo.uuid][si.getComponent(i, k)] === 'head') wHead += sw.getComponent(i, k);
      q.subVectors(p, headC);
      const fz = q.dot(hFw), fx = q.dot(hSide), fy = p.clone().sub(eye).dot(hAx);
      // 1: the features (brows, eyes, nose, mouth); 2: the cheeks and the jaw
      if (wHead > 0.5 && fz > 0.03 && Math.abs(fx) < 0.05 && fy > -0.095 && fy < 0.045) face[i] = 1;
      else if (wHead > 0.5 && fz > -0.01 && Math.abs(fx) < 0.085 && fy > -0.13 && fy < 0.045) face[i] = 2;
    }
  }
  const idx = geo.index ? geo.index.array : null;
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
  geo.setAttribute('aFlow', new THREE.BufferAttribute(flow, 2));
  geo.setAttribute('aAxis', new THREE.BufferAttribute(axis, 3));
  geo.setAttribute('aCurv', new THREE.BufferAttribute(curv, 1));
  geo.setAttribute('aFace', new THREE.BufferAttribute(face, 1));
  geo.setAttribute('aQuilt', new THREE.BufferAttribute(quilt, 2));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  geo.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(n).fill(row), 1));
  const cl = new Float32Array(n * 4); for (let i = 0; i < n; i++) cl[i * 4] = -1;
  geo.setAttribute('aCloth', new THREE.BufferAttribute(cl, 4));
  geo.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(n), 1));
}

function segments(actor) {
  const P = actor.P;
  const headC = V3(...actor.meta.headCentre);
  const SEGS = {
    torso: { a: P('pelvis'), b: P('neck_01'), r: 0.14 },
    head: { a: P('neck_01'), b: headC.clone(), r: 0.09 },
  };
  for (const s of ['l', 'r']) {
    SEGS[`upper_${s}`] = { a: P(`upperarm_${s}`), b: P(`lowerarm_${s}`), r: 0.055 };
    SEGS[`lower_${s}`] = { a: P(`lowerarm_${s}`), b: P(`hand_${s}`), r: 0.045 };
    SEGS[`thigh_${s}`] = { a: P(`thigh_${s}`), b: P(`calf_${s}`), r: 0.09 };
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
  return SEGS;
}
function segKeyOfBone(n) {
  let k = 'torso';
  if (n === 'head' || n === 'neck_01') k = 'head';
  const s = n.endsWith('_l') ? 'l' : n.endsWith('_r') ? 'r' : null;
  if (s) {
    if (n.startsWith('upperarm') || n.startsWith('clavicle')) k = n.startsWith('clavicle') ? 'torso' : `upper_${s}`;
    else if (n.startsWith('lowerarm') || n.startsWith('hand') || /^(index|middle|ring|pinky|thumb)/.test(n)) k = `lower_${s}`;
    else if (n.startsWith('thigh')) k = `thigh_${s}`;
    else if (n.startsWith('calf') || n.startsWith('foot') || n.startsWith('ball')) k = `calf_${s}`;
  }
  return k;
}

function mergeParts(list, names, layers = 1) {
  let nv = 0, ni = 0;
  for (const { geo } of list) { nv += geo.attributes.position.count; ni += geo.index ? geo.index.count : geo.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  const NV = nv * layers;
  const buf = {};
  for (const n of names) buf[n] = new Float32Array(NV * list[0].geo.attributes[n].itemSize);
  const skinI = new Uint16Array(NV * 4), skinW = new Float32Array(NV * 4);
  const layerA = layers > 1 ? new Float32Array(NV) : null;
  const index = new Uint32Array(ni * layers);
  const charA = new Float32Array(NV);
  let vo = 0, io = 0;
  const nm = new THREE.Matrix3();
  const tmp = new THREE.Vector3();
  for (let L = 0; L < layers; L++) {
    for (const { geo, boneMap, bind } of list) {
      const cnt = geo.attributes.position.count;
      nm.getNormalMatrix(bind);
      for (const n of names) {
        const A = geo.attributes[n], it = A.itemSize, dst = buf[n];
        for (let i = 0; i < cnt; i++) {
          if (n === 'position') { tmp.fromBufferAttribute(A, i).applyMatrix4(bind); tmp.toArray(dst, (vo + i) * 3); }
          else if (n === 'normal') { tmp.fromBufferAttribute(A, i).applyMatrix3(nm).normalize(); tmp.toArray(dst, (vo + i) * 3); }
          else for (let c = 0; c < it; c++) dst[(vo + i) * it + c] = A.getComponent(i, c);
        }
      }
      const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
      for (let i = 0; i < cnt; i++) for (let c = 0; c < 4; c++) {
        skinI[(vo + i) * 4 + c] = boneMap[si.getComponent(i, c)];
        skinW[(vo + i) * 4 + c] = sw.getComponent(i, c);
      }
      if (layerA) layerA.fill(L, vo, vo + cnt);
      const src = geo.index ? geo.index.array : null;
      const count = src ? src.length : cnt;
      for (let k = 0; k < count; k++) index[io + k] = (src ? src[k] : k) + vo;
      vo += cnt; io += count;
    }
  }
  for (const n of names) out.setAttribute(n, new THREE.BufferAttribute(buf[n], list[0].geo.attributes[n].itemSize));
  out.setAttribute('skinIndex', new THREE.BufferAttribute(skinI, 4));
  out.setAttribute('skinWeight', new THREE.BufferAttribute(skinW, 4));
  if (layerA) out.setAttribute('aLayer', new THREE.BufferAttribute(layerA, 1));
  out.setAttribute('aChar', new THREE.BufferAttribute(charA, 1));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  return out;
}

function partAttributesHull(geo) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const n = pos.count;
  const curv = new Float32Array(n);
  const idx = geo.index ? geo.index.array : null;
  if (idx) {
    const sum = new Float32Array(n), cnt = new Float32Array(n), len = new Float32Array(n);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), nn = new THREE.Vector3();
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
    for (let i = 0; i < n; i++) curv[i] = THREE.MathUtils.clamp((cnt[i] ? (sum[i] / cnt[i]) / Math.max(1e-5, len[i] / cnt[i]) : 0) * 3.0, 0, 1);
  }
  geo.setAttribute('aCurv', new THREE.BufferAttribute(curv, 1));
}

// gives the page a turn between the heavy steps and inside the long loops (README 11): no run over about 16 ms.
// It also keeps the length of every run, so ?dev=1 and perf-people can name the longest one.
function slicer(core) {
  let runStart = performance.now();
  const runs = [];
  const Y = async (label) => {
    const before = performance.now();
    if (typeof window !== 'undefined' && window.__markY) performance.mark('Y:' + label);
    if (core.slice) await core.slice();
    const after = performance.now();
    if (after - before > 0.5) { runs.push([+(before - runStart).toFixed(1), label]); runStart = after; }
  };
  Y.end = (label) => { runs.push([+(performance.now() - runStart).toFixed(1), label]); runs.sort((a, b) => b[0] - a[0]); return runs; };
  return Y;
}

export async function buildPeople(scene, R, layout, core) {
  const T0 = performance.now();
  if (!(layout.roles ?? []).includes('picker') || !layout.picker) return null;
  const { U } = core;
  const Y = slicer(core);
  HP.PU.tHatch.value = HP.bakeHatch(U.tStrokes.value.image);
  await Y('hatch');
  const asset = await loadAsset();
  await Y('load');
  const W = ACTS.worldInfo(layout);
  // her mẹt sits on the boat's floor: ask the season's own hull how high that is, right here
  const hullY = hullSampler(W.boat);
  const field = trayField(ACTS.TRAY, hullY);
  // the tray is as wide as the flower it has to hold, and it is told where the hull is so the rest poses can lie on it
  const bloomR = ACTS.measureFlowers(W).reduce((m, f) => Math.max(m, f.budR), 0);
  ACTS.TRAY.r = Math.max(0.16, Math.min(0.26, bloomR * 2.4));
  ACTS.TRAY.y = field.y0;
  ACTS.TRAY.measured = field.measured;
  ACTS.TRAY.topAt = (dx, dz) => field.at(dx, dz) + ACTS.TRAY.thick;
  ACTS.TRAY.hullAt = (x, z) => { const h = hullY ? hullY(x, z) : null; return h ? h.low : field.y0; };
  // where the deck she stands on ends: everything astern of that has wood over the floor, so nothing may be laid there
  ACTS.TRAY.clearBackX = (() => {
    if (!hullY) return ACTS.TRAY.x - ACTS.TRAY.r;
    for (let x = ACTS.TRAY.x; x > ACTS.TRAY.x - 0.6; x -= 0.01) {
      const h = hullY(x, ACTS.TRAY.z);
      if (!h || h.high > h.low + 0.03) return x + 0.01;
    }
    return ACTS.TRAY.x - 0.6;
  })();
  if (!field.measured && typeof console !== 'undefined') console.warn('[haisen] could not measure the boat floor for the tray; using', ACTS.TRAY.y);
  // the tray's rings will ask the hull for a height at 40 x 8 places: ask now, a ring at a time, so no single run is long
  {
    const T0 = ACTS.TRAY;
    for (let j = 0; j <= 7; j++) {
      const u = j / 7, rr = T0.r * (0.04 + 0.96 * u);
      for (let k = 0; k < 40; k++) { const an = (k / 40) * Math.PI * 2; field.at(rr * Math.cos(an), rr * Math.sin(an)); }
      await Y('tray floor');
    }
  }
  await Y('measure the boat for the tray');
  const pole = ACTS.makePole(W);
  const FL = ACTS.makeFlowers(W);
  const palette = new HP.Palette();
  const actor = new RIG.Actor({ name: 'picker', asset, loop: ACTS.LOOP });
  actor.deckY = W.deckY;
  actor.body0 = [-1.0, 0, Math.PI / 2];
  scene.add(actor.root);
  actor.root.matrixAutoUpdate = false;
  actor.boneBase = 0;
  actor.index = 0;
  actor.segs = segments(actor);
  actor.partBones = {};
  actor.partBoneNames = {};
  const rows = {};
  for (const [mat, look] of Object.entries(ACTS.LOOKS)) rows[mat] = palette.add(look);
  const paintList = [], hullList = [];
  const toRemove = [];
  for (const part of actor.parts) {
    const isHull = part.name.startsWith('H_');
    const base = NODE_LOOK[isHull ? part.name.slice(2) : part.name] ?? 'jacket';
    const row = rows[base] ?? rows.jacket;
    const geo = part.geometry;
    const map = {};
    part.skeleton.bones.forEach((b, i) => { map[i] = actor.boneIndex[b.name]; });
    actor.partBones[geo.uuid] = Object.fromEntries(part.skeleton.bones.map((b, i) => [i, segKeyOfBone(b.name)]));
    actor.partBoneNames[geo.uuid] = Object.fromEntries(part.skeleton.bones.map((b, i) => [i, b.name]));
    part.updateMatrixWorld(true);
    if (isHull) {
      const n = geo.attributes.position.count;
      geo.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(n).fill(row), 1));
      const cl = new Float32Array(n * 4); for (let i = 0; i < n; i++) cl[i * 4] = -1;
      geo.setAttribute('aCloth', new THREE.BufferAttribute(cl, 4));
      geo.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(n), 1));
      partAttributesHull(geo);
      hullList.push({ geo, boneMap: map, bind: part.bindMatrix.clone() });
    } else {
      partAttributes(actor, geo, base, row);
      paintList.push({ geo, boneMap: map, bind: part.bindMatrix.clone() });
    }
    toRemove.push(part);
    await Y('part ' + part.name);
  }
  for (const p of toRemove) p.parent.remove(p);
  // the tray: one more part of the same merged mesh, on a bone of its own that stands still in the boat
  {
    const trayBone = new THREE.Bone();
    trayBone.name = 'tray';
    actor.root.add(trayBone);
    trayBone.updateMatrixWorld(true);
    const bi = actor.bones.length;
    actor.bones.push(trayBone);
    actor.boneInverses.push(new THREE.Matrix4());        // its geometry is written in the boat's own frame
    actor.boneIndex.tray = bi;
    // the rig resets every bone from its rest record, so the tray needs one too (it never moves)
    actor.rest.tray = {
      bone: trayBone,
      local: trayBone.quaternion.clone(),
      pos: trayBone.position.clone(),
      wq: new THREE.Quaternion(),
      wp: new THREE.Vector3(),
    };
    const T = ACTS.TRAY;
    const geo = trayGeometry(T, field);          // its floor already carries the hull's height
    geo.translate(T.x, 0, T.z);
    const n = geo.attributes.position.count;
    geo.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(n).fill(rows.tray ?? rows.hat), 1));
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) sw[i * 4] = 1;
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    actor.partBones[geo.uuid] = { 0: 'torso' };
    actor.partBoneNames[geo.uuid] = { 0: 'tray' };
    paintList.push({ geo, boneMap: { 0: bi }, bind: new THREE.Matrix4() });
    const hullGeoT = geo.clone();
    hullGeoT.deleteAttribute('aFlow'); hullGeoT.deleteAttribute('aAxis'); hullGeoT.deleteAttribute('aFace');
    hullGeoT.deleteAttribute('aQuilt'); hullGeoT.deleteAttribute('aSeed');
    hullList.push({ geo: hullGeoT, boneMap: { 0: bi }, bind: new THREE.Matrix4() });
    actor.partBones[hullGeoT.uuid] = { 0: 'torso' };
    actor.partBoneNames[hullGeoT.uuid] = { 0: 'tray' };
  }
  await Y('tray');
  actor.rows = rows;
  actor.spec = { folds: null };
  ACTS.setupHands(actor);
  actor.keys = await ACTS.buildKeys(actor, W, pole, FL, Y);
  await Y('keys');
  const tB = performance.now();
  // every drawing, posed once, with the pole and the flowers of that drawing (boat space).
  // her box for the core's checks grows here too (in her own frame), so no second pass over the drawings is needed
  const _m = new THREE.Matrix4();
  const box = new THREE.Box3();
  const _inv = new THREE.Matrix4(), _pv = new THREE.Vector3();
  await actor.bakeAsync((a, t) => {
    _inv.copy(a.root.matrixWorld).invert();
    for (const b of a.bones) box.expandByPoint(_pv.setFromMatrixPosition(b.matrixWorld).applyMatrix4(_inv));
    const P = pole.at(t);
    const fs = ACTS.flowerState(a, t, W, FL);
    return {
      pole: P.mode === 'planted' ? { planted: true, footW: P.footW, H: P.H.clone() } : { planted: false, C: P.C.clone(), D: P.D.clone() },
      picked: fs.picked, bloom: fs.bloom,
    };
  }, Y);
  const bakeMs = performance.now() - tB;

  const paintGeo = mergeParts(paintList, ['position', 'normal', 'aFlow', 'aAxis', 'aCurv', 'aFace', 'aQuilt', 'aSeed', 'aMat', 'aCloth', 'aClothW']);
  await Y('merge paint');
  const hullGeo = mergeParts(hullList, ['position', 'normal', 'aCurv', 'aMat', 'aCloth', 'aClothW'], 2);
  await Y('merge hull');
  const skeleton = new THREE.Skeleton(actor.bones, actor.boneInverses);
  const mats = HP.makeMaterials(core);
  const mk = (geo, mat, order) => {
    const m = new THREE.SkinnedMesh(geo, mat);
    m.bind(skeleton, new THREE.Matrix4());
    m.frustumCulled = false;
    m.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    m.boundingBox = new THREE.Box3();
    m.renderOrder = order;
    scene.add(m);
    return m;
  };
  const paint = mk(paintGeo, mats.paintM, 2);
  paint.userData.castShadow = false;
  const hull = mk(hullGeo, mats.hullM, 1);
  hull.userData.castShadow = false;
  // the shadow caster is the ink layer of the hull only: the same vertices, half the index (the band layer would be folded
  // away by the depth material anyway, but it would still be counted and sent)
  const casterGeo = new THREE.BufferGeometry();
  for (const [k, at] of Object.entries(hullGeo.attributes)) casterGeo.setAttribute(k, at);
  const hIdx = hullGeo.index.array;
  casterGeo.setIndex(new THREE.BufferAttribute(hIdx.subarray(0, hIdx.length / 2), 1));
  const caster = mk(casterGeo, mats.paintM, 0);
  caster.userData.shadowMaterial = mats.depthM;
  caster.layers.mask = 0;
  const folds = await FOLDS.buildFolds([actor], paintGeo, Y);
  const foldMesh = mk(folds.geo, folds.mat(HP.PU), 3);
  foldMesh.userData.castShadow = false;
  // the sketch loop round each drawing, seen from the page's eye where the boat is in that drawing (boat space)
  const eyeAt = (d) => core.build.REF.eye.clone().sub(W.origin((d * RIG.STEP) / RIG.FPS));
  // Mike, 18/9: only the bottle wears the white line, it is the bottle's own mark. Her sketch loop stays in the code
  // (sketch.js, and the spec below) but is not built or drawn; set OUTLINE to true to bring it back.
  const OUTLINE = false;
  const sketch = OUTLINE ? await SKETCH.buildSketch([actor], paintGeo, core, { picker: { loops: 1, off: [3, 8], width: 1.2 } }, eyeAt, Y) : null;
  if (sketch) {
    scene.add(sketch.mesh);
    sketch.mesh.matrixAutoUpdate = false;
  }
  actor.onShow = (x) => { folds.update(x); if (sketch) sketch.show(x); };
  // her box, for the core's checks: an invisible proxy in her own frame bounding every baked drawing
  {
    box.expandByVector(V3(0.12, 0.12, 0.12));
    box.max.y += 0.2;
    const size = box.getSize(V3(0, 0, 0)), ctr = box.getCenter(V3(0, 0, 0));
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z).translate(ctr.x, ctr.y, ctr.z), new THREE.MeshBasicMaterial());
    proxy.visible = false;
    proxy.name = 'picker-box';
    proxy.userData.castShadow = false;
    actor.root.add(proxy);
    actor.box = box;
  }
  actor.cur = -1;
  actor.showDrawing(0);

  // the season's pole and flowers follow her drawings (and the boat, every frame)
  const boat = W.boat;
  const poleMesh = W.pole;
  // the pole belongs to the season: take its real length and radius from the mesh, never from a number written here
  if (poleMesh) {
    const bb = new THREE.Box3();
    poleMesh.traverse((o) => { if (o.geometry) { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().copy(o.matrixWorld).premultiply(new THREE.Matrix4().copy(poleMesh.matrixWorld).invert()))); } });
    const size = bb.getSize(new THREE.Vector3());
    if (size.y > 0.5) {
      const len = size.y * poleMesh.scale.y, rad = Math.max(size.x, size.z) * 0.5 * poleMesh.scale.x;
      if (Math.abs(len - ACTS.POLE.len) > 0.02 || Math.abs(rad - ACTS.POLE.rFoot) > 0.004) {
        ACTS.POLE.len = len; ACTS.POLE.half = len / 2;
        ACTS.POLE.rFoot = rad; ACTS.POLE.rTop = rad * 0.75;
        if (typeof console !== 'undefined') console.log('[haisen] pole measured from the season:', +len.toFixed(3), 'm, radius', +rad.toFixed(4));
      }
    }
  }
  const picked = W.picked;
  // the season decides how big its lotus is: keep each flower's own scale and put it back into every placement,
  // or setting the matrix here would quietly undo a change the season made
  const pickedScale = picked.map((f) => f.scale.clone());
  for (const f of picked) f.matrixAutoUpdate = false;
  if (poleMesh) poleMesh.matrixAutoUpdate = false;
  const BM = new THREE.Matrix4();
  const _h = new THREE.Vector3(), _d = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion();
  // the pole keeps whatever size the season gave it, the same way the flowers do
  const poleScale = poleMesh ? poleMesh.scale.clone() : new THREE.Vector3(1, 1, 1);
  const Yax = new THREE.Vector3(0, 1, 0);
  function placePole(x) {
    if (!poleMesh) return;
    if (x.pole.planted) {
      _h.copy(x.pole.H).applyMatrix4(BM);
      _d.subVectors(_h, x.pole.footW).normalize();
      _c.copy(x.pole.footW).addScaledVector(_d, ACTS.POLE.half);
    } else {
      _c.copy(x.pole.C).applyMatrix4(BM);
      _d.copy(x.pole.D).transformDirection(BM);
    }
    _q.setFromUnitVectors(Yax, _d);
    poleMesh.matrix.compose(_c, _q, poleScale);
    poleMesh.matrixWorldNeedsUpdate = true;
    poleMesh.visible = true;
  }
  function placeFlowers(x) {
    for (let i = 0; i < picked.length; i++) {
      const m = x.picked[i];
      picked[i].visible = !!m;
      if (m) { picked[i].matrix.multiplyMatrices(BM, m).scale(pickedScale[i]); picked[i].matrixWorldNeedsUpdate = true; }
    }
    W.blooms.forEach((b, i) => { b.visible = !!x.bloom[i]; });
  }
  function follow(t) {
    boat.updateMatrixWorld(true);
    BM.copy(boat.matrixWorld);
    actor.root.matrix.copy(BM);
    actor.root.matrixWorldNeedsUpdate = true;
    if (sketch) { sketch.mesh.matrix.copy(BM); sketch.mesh.matrixWorldNeedsUpdate = true; }
    actor.show(t);
    actor.root.updateMatrixWorld(true);
    const x = actor.cache.x[actor.cur];
    placePole(x);
    placeFlowers(x);
  }

  const size = new THREE.Vector2();
  function setPx() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    size.set(window.innerWidth * dpr, window.innerHeight * dpr);
    HP.PU.uRes.value.copy(size);
    HP.PU.uPxScale.value = size.y / 900;
  }
  setPx();
  let lastT = 0;
  const api = {
    actors: [actor], actor, palette, meshes: { paint, hull, caster, foldMesh }, folds, skeleton, pole, flowers: FL, world: W,
    buildMs: 0, bakeMs: 0,
    sketch: [],
    solids: [],
    // (hold: the QA tools pose her themselves; the page leaves her alone meanwhile)
    hold: false,
    update(t) {
      if (api.hold) return;
      lastT = t;
      if (size.x !== window.innerWidth * Math.min(window.devicePixelRatio || 1, 1.5)) setPx();
      follow(t);
    },
    caps(t) {
      if (t !== undefined) follow(t);
      const out = ACTS.capsulesOf(actor);
      if (t !== undefined) follow(lastT);
      return out;
    },
    movers() { return []; },
    faceProbes: () => faceProbes(),
    // the pole's two ends (world) as it is now
    poleEnds() {
      if (!poleMesh) return null;
      return [V3(0, -ACTS.POLE.half, 0).applyMatrix4(poleMesh.matrix), V3(0, ACTS.POLE.half, 0).applyMatrix4(poleMesh.matrix)];
    },
    qa: { actor, W, ACTS, RIG, HP, THREE, layout, sketch, pole, FL, follow },
  };
  const faceIdx = (() => {
    const f = paintGeo.attributes.aFace;
    const byZone = { 1: [], 2: [] };
    for (let i = 0; i < f.count; i++) if (f.getX(i) > 0.5) byZone[Math.round(f.getX(i))].push(i);
    const pick = (list, n) => list.filter((_, k) => k % Math.max(1, Math.floor(list.length / n)) === 0).slice(0, n);
    return [...pick(byZone[1], 24).map((i) => [i, 'features']), ...pick(byZone[2], 16).map((i) => [i, 'cheek'])];
  })();
  const _fp = new THREE.Vector3(), _fn = new THREE.Vector4();
  function faceProbes() {
    const out = [];
    const nrm = paintGeo.attributes.normal;
    for (const [i, zone] of faceIdx) {
      paint.getVertexPosition(i, _fp);
      _fn.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i), 0);
      paint.applyBoneTransform(i, _fn);
      out.push({ person: 'picker', zone, at: _fp.clone(), normal: new THREE.Vector3(_fn.x, _fn.y, _fn.z).normalize() });
    }
    return out;
  }
  api.buildMs = Math.round(performance.now() - T0);
  api.runs = Y.end('end');
  api.bakeMs = Math.round(bakeMs);
  if (typeof window !== 'undefined') window.__haisen = api;
  return api;
}
