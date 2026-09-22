// Chớm world: people/dong — the four winter people of the Old Quarter lane (season Đông), in one folder so they share
// one merged skinned mesh (one draw for the paint, one for ink and colour bands, one caster for the lamps' shadows,
// one for the acting lines).
//   seller   the corn seller on her low stool: turns the cob on the grill (three times round a loop), fans the coals
//   warmerA  a man in a felt hat and a short wool coat, hands spread over the coals, rubs them
//   warmerB  a young woman in a wool coat and a chunky scarf, warms her hands, then her cheeks
//   incense  upstairs at the family altar, a man raises a burning stick of farmed agarwood to his forehead and bows three times
// Bodies: MakeHuman (CC0, MPFB2), posed and dressed by code in Blender (blender/build_dong.py). Painted by dong-paint.js,
// acted by acts.js on rig.js.
//
//   export async function buildPeople(scene, R, layout, core)
//     layout.roles: which of the four to build ('warmers' = both warmers); layout.seller / warmerA / warmerB / incense = { at, face };
//     layout.cob (the turned cob's centre), layout.brazier, layout.grill, layout.bowl
//   returns { update(t, dt, camera), sketch, movers(t), solids, caps(t), turn(t), tip(), fanning(t), actors, qa }
const here = (p) => new URL(p, import.meta.url).href;
const THREEm = await import('three');
const THREE = THREEm;
const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
const RIG = await import(here('./rig.js'));
const DP = await import(here('./dong-paint.js'));
const ACTS = await import(here('./acts.js'));
const FOLDS = await import(here('./folds.js'));
const SKETCH = await import(here('./sketch.js'));
const { V3, FPS, STEP } = RIG;

const MODEL = (n) => [here(`./${n}.glb`)];
const ROLE_MODEL = { seller: 'ngo', warmerA: 'chu', warmerB: 'co', incense: 'tram' };
// the Blender objects (glTF nodes) and the look each one wears
const NODE_LOOK = { Body: 'skin', Jacket: 'jacket', Pants: 'pants', Under: 'under', Scarf: 'scarf', Hat: 'hat', Hair: 'hair', Band: 'band', Buttons: 'button', Socks: 'socks', Shoes: 'shoes' };

async function loadAsset(name) {
  let last;
  for (const url of MODEL(name)) {
    try {
      const gltf = await new GLTFLoader().loadAsync(url);
      const meta = await (await fetch(url.replace(/\.glb$/, '.json'))).json();
      return { gltf, meta };
    } catch (e) { last = e; }
  }
  throw last;
}

// The season may ask for a scarf pulled up over the nose (layout.<role>.scarfOverNose). The scarf is one piece of cloth on
// the model, so the top band of it is lifted here, once, at load: it ends just under the eyes and the nón/mũ takes the rest.
// Everything below the band stays where the model has it, so the fall over the chest does not change.
// The same request also pulls the hat down over the brows: the scarf can only reach the eyes, and the brow is part of the
// zone the page must never show. The hat is rigid on the head, so it turns about the head's centre, once, at load.
function hatLow(asset, deg = 14, drop = 0.02) {
  const m = asset.meta;
  const c = V3(...m.headCentre), ax = V3(...m.headAxis).normalize(), fw = V3(...m.headFwd).normalize();
  const side = new THREE.Vector3().crossVectors(ax, fw).normalize();
  const M = new THREE.Matrix4().makeTranslation(c.x, c.y, c.z)
    .multiply(new THREE.Matrix4().makeRotationAxis(side, deg * Math.PI / 180))
    .multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z))
    .premultiply(new THREE.Matrix4().makeTranslation(-ax.x * drop, -ax.y * drop, -ax.z * drop));
  const seen = new Set();
  asset.gltf.scene.traverse((o) => {
    if (!o.isMesh || !/^(H_)?(Hat|Band)$/.test(o.name) || seen.has(o.geometry.uuid)) return;
    seen.add(o.geometry.uuid);
    o.geometry.applyMatrix4(M);
  });
}

function scarfOverNose(asset, over = 0.004) {
  const m = asset.meta;
  const c = V3(...m.headCentre), ax = V3(...m.headAxis).normalize(), fw = V3(...m.headFwd).normalize();
  const target = m.eyeUp + over;                   // the cloth's new top edge, level all round the head (0 = the eye line)
  const band = 0.1;                                // only the top 10 cm of the scarf moves; its fall over the chest does not
  const seen = new Set();
  asset.gltf.scene.traverse((o) => {
    if (!o.isMesh || !/^(H_)?Scarf$/.test(o.name) || seen.has(o.geometry.uuid)) return;
    seen.add(o.geometry.uuid);
    const pos = o.geometry.attributes.position;
    const p = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      d.copy(p).sub(c);
      const y = d.dot(ax);
      const need = target - y;
      if (need <= 0 || y < target - band) continue;        // already high enough, or too low to be the edge
      const k = (y - (target - band)) / band;              // 0 at the bottom of the band, 1 at the new edge
      const sm = k * k * (3 - 2 * k);
      p.addScaledVector(ax, Math.min(need, 0.06) * sm);
      if (d.dot(fw) > 0) p.addScaledVector(fw, 0.006 * sm);  // and a touch forward, over the bridge of the nose
      // a little off the skin as well, so no corner of his face comes through the cloth when he turns his head
      const out = d.clone().addScaledVector(ax, -y);
      if (out.lengthSq() > 1e-8) p.addScaledVector(out.normalize(), 0.004 * sm);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    pos.needsUpdate = true;
    o.geometry.computeBoundingSphere();
  });
}

// ---------------------------------------------------------------- per-part attributes (in the person's own bind space)
function partAttributes(actor, geo, matName, row, charIdx) {
  const P = actor.P;
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
  const p = new THREE.Vector3(), q = new THREE.Vector3(), nn = new THREE.Vector3(), T = new THREE.Vector3();
  const sname = actor.partBones;
  for (let i = 0; i < n; i++) {
    p.fromBufferAttribute(pos, i);
    nn.fromBufferAttribute(nor, i);
    seed[i * 3] = charIdx * 1.37; seed[i * 3 + 1] = charIdx * 0.71; seed[i * 3 + 2] = charIdx * 2.03;
    if (matName === 'hair' || matName === 'hat') {
      q.subVectors(p, headC);
      const az = Math.atan2(q.dot(hSide), q.dot(hFw));
      const up = q.dot(hAx);
      flow[i * 2] = az * 0.09; flow[i * 2 + 1] = up;
      T.copy(hAx).addScaledVector(nn, -hAx.dot(nn));
      if (T.lengthSq() < 1e-6) T.copy(hFw);
      T.normalize();
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
      if (matName === 'jacket' && ACTS.SPECS[actor.name].looks.jacket.kind === 'quilt') {
        // the quilting runs round the body (rest height) and round each sleeve (along the arm), blended by the arm's weight
        let armW = 0, sideSign = 0;
        for (let k = 0; k < 4; k++) {
          const bn = actor.partBoneNames[geo.uuid][si.getComponent(i, k)] ?? '';
          if (/^(upperarm|lowerarm|hand)_/.test(bn)) { armW += sw.getComponent(i, k); sideSign += (bn.endsWith('_l') ? 1 : -1) * sw.getComponent(i, k); }
        }
        const s = sideSign >= 0 ? 'l' : 'r';
        const U = segs[`upper_${s}`];
        const alongArm = q.subVectors(p, U.a).dot(U.axis);
        quilt[i * 2] = p.y / 0.058 * (1 - armW) + (alongArm / 0.05 + 0.3) * armW;
        quilt[i * 2 + 1] = 1 - Math.max(0, Math.min(1, (Math.min(armW, 1 - armW) - 0.12) / 0.15));
      }
    }
    axis[i * 3] = T.x; axis[i * 3 + 1] = T.y; axis[i * 3 + 2] = T.z;
    if (matName === 'skin') {
      // the face: the head's skin from the brow to below the mouth, between the outer corners of the eyes (never the hands)
      let wHead = 0;
      for (let k = 0; k < 4; k++) if (sname[geo.uuid][si.getComponent(i, k)] === 'head' && actor.partBoneNames[geo.uuid][si.getComponent(i, k)] === 'head') wHead += sw.getComponent(i, k);
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
  const mat = new Float32Array(n).fill(row);
  const cl = new Float32Array(n * 4); for (let i = 0; i < n; i++) cl[i * 4] = -1;
  geo.setAttribute('aFlow', new THREE.BufferAttribute(flow, 2));
  geo.setAttribute('aAxis', new THREE.BufferAttribute(axis, 3));
  geo.setAttribute('aCurv', new THREE.BufferAttribute(curv, 1));
  geo.setAttribute('aFace', new THREE.BufferAttribute(face, 1));
  geo.setAttribute('aQuilt', new THREE.BufferAttribute(quilt, 2));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  geo.setAttribute('aMat', new THREE.BufferAttribute(mat, 1));
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

// ---------------------------------------------------------------- merge geometries (skin indices moved to the shared skeleton)
async function mergeParts(list, names, layers = 1, Y = async () => {}) {
  // list: [{ geo, boneMap (part bone index -> global), bind (Matrix4) }]
  let nv = 0, ni = 0;
  for (const { geo } of list) { nv += geo.attributes.position.count; ni += geo.index ? geo.index.count : geo.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  const NV = nv * layers;
  const buf = {};
  for (const n of names) {
    const it = list[0].geo.attributes[n].itemSize;
    buf[n] = new Float32Array(NV * it);
  }
  const skinI = new Uint16Array(NV * 4), skinW = new Float32Array(NV * 4);
  const layerA = layers > 1 ? new Float32Array(NV) : null;
  const index = new Uint32Array(ni * layers);
  const charA = new Float32Array(NV);
  let vo = 0, io = 0;
  const nm = new THREE.Matrix3();
  const tmp = new THREE.Vector3();
  for (let L = 0; L < layers; L++) {
    for (const { geo, boneMap, bind } of list) {
      await Y('merge');
      const cnt = geo.attributes.position.count;
      nm.getNormalMatrix(bind);
      for (const n of names) {
        const A = geo.attributes[n], it = A.itemSize, dst = buf[n];
        for (let i = 0; i < cnt; i++) {
          if (n === 'position') { tmp.fromBufferAttribute(A, i).applyMatrix4(bind); tmp.toArray(dst, (vo + i) * 3); }
          else if (n === 'normal') { tmp.fromBufferAttribute(A, i).applyMatrix3(nm).normalize(); tmp.toArray(dst, (vo + i) * 3); }
          else for (let c = 0; c < it; c++) dst[(vo + i) * it + c] = A.array[i * it + c] ?? A.getComponent(i, c);
        }
      }
      const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
      for (let i = 0; i < cnt; i++) for (let c = 0; c < 4; c++) {
        skinI[(vo + i) * 4 + c] = boneMap[si.getComponent(i, c)];
        skinW[(vo + i) * 4 + c] = sw.getComponent(i, c);
      }
      if (layerA) layerA.fill(L, vo, vo + cnt);
      charA.fill(entryChar(list, geo), vo, vo + cnt);
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

const entryChar = (list, geo) => (list.find((e) => e.geo === geo)?.char ?? 0);
// a prop (built in hand space) skinned rigidly to one bone, as a merge part
function propPart(actor, geo, boneName, handToBind, row, charIdx, flowFn) {
  const g = geo.index ? geo : geo;
  const n = g.attributes.position.count;
  const bi = actor.boneIndex[boneName];
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { si[i * 4] = 0; sw[i * 4] = 1; }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.applyMatrix4(handToBind);
  const flow = new Float32Array(n * 2), axis = new Float32Array(n * 3).fill(0.577), seed = new Float32Array(n * 3).fill(charIdx);
  const p = new THREE.Vector3();
  if (!g.attributes.aFlow) {
    for (let i = 0; i < n; i++) { p.fromBufferAttribute(g.attributes.position, i); const f = flowFn ? flowFn(p, i) : [p.x * 3, p.y * 3]; flow[i * 2] = f[0]; flow[i * 2 + 1] = f[1]; }
    g.setAttribute('aFlow', new THREE.BufferAttribute(flow, 2));
  }
  g.setAttribute('aAxis', new THREE.BufferAttribute(axis, 3));
  g.setAttribute('aCurv', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aFace', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aQuilt', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  g.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(n).fill(row), 1));
  const cl = new Float32Array(n * 4); for (let i = 0; i < n; i++) cl[i * 4] = -1;
  g.setAttribute('aCloth', new THREE.BufferAttribute(cl, 4));
  g.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(n), 1));
  return { geo: g, boneMap: { 0: actor.globalBone(bi), 1: actor.globalBone(bi), 2: actor.globalBone(bi), 3: actor.globalBone(bi) }, bind: new THREE.Matrix4() };
}

// a turn for the page whenever the current slice of work is used up (core.slice), and a record of the longest run between
// two turns (it makes the page stand still for that long while this season builds in the background)
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
  const Y = slicer(core);
  await Y('start');
  const want = new Set();
  for (const r of layout.roles ?? []) {
    if (r === 'warmers') { want.add('warmerA'); want.add('warmerB'); } else if (ROLE_MODEL[r]) want.add(r);
  }
  // a whole-cast override (?people=dong) plays every winter role the layout has
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('people') : null;
  if (q && !q.includes(':') && q === 'dong') for (const r of Object.keys(ROLE_MODEL)) if (layout[r] || (r.startsWith('warmer') && layout.warmers)) want.add(r);
  const roles = Object.keys(ROLE_MODEL).filter((r) => want.has(r) && (layout[r] || layout.warmers));
  if (!roles.length) return null;
  const { U } = core;
  DP.PU.tHatch.value = DP.bakeHatch(U.tStrokes.value.image);
  await Y('hatch');
  const place = (r) => {
    if (layout[r]) return layout[r];
    const w = layout.warmers;
    if (Array.isArray(w)) return w[r === 'warmerA' ? 0 : 1];
    return w[r === 'warmerA' ? 'a' : 'b'];
  };
  const assets = [];
  for (const r of roles) {
    const a = await loadAsset(ROLE_MODEL[r]);
    // he turns his head most, so his scarf goes over the brows; hers only needs the eye line (the page checks both)
    if (place(r)?.scarfOverNose) { scarfOverNose(a, r === 'warmerA' ? 0.03 : 0.004); hatLow(a); }
    assets.push(a);
    await Y('load');
  }
  const palette = new DP.Palette();
  const actors = [];
  let boneBase = 0;
  const paintList = [], hullList = [];
  const world = ACTS.worldInfo(layout, core);
  for (let ci = 0; ci < roles.length; ci++) {
    const role = roles[ci];
    const asset = assets[ci];
    const spec = ACTS.SPECS[role];
    const pl = place(role);
    const actor = new RIG.Actor({ name: role, asset, at: pl.at.clone(), faceTo: pl.face.clone(), loop: spec.loop, yaw: spec.yaw ?? 0 });
    scene.add(actor.root);
    const bbase = boneBase;
    actor.boneBase = bbase;
    actor.globalBone = (i) => bbase + i;
    boneBase += actor.bones.length;
    actor.segs = segments(actor);
    actor.partBones = {};
    const rows = {};
    for (const [mat, look] of Object.entries(spec.looks)) rows[mat] = palette.add(look);
    const toRemove = [];
    for (const part of actor.parts) {
      const isHull = part.name.startsWith('H_');
      const base = NODE_LOOK[isHull ? part.name.slice(2) : part.name] ?? 'jacket';
      const row = rows[base] ?? rows.jacket;
      const geo = part.geometry;
      // this part's bone index -> the actor's canonical index -> the shared skeleton
      const map = {};
      part.skeleton.bones.forEach((b, i) => { map[i] = bbase + actor.boneIndex[b.name]; });
      actor.partBones[geo.uuid] = Object.fromEntries(part.skeleton.bones.map((b, i) => [i, segKeyOfBone(b.name)]));
      (actor.partBoneNames ??= {})[geo.uuid] = Object.fromEntries(part.skeleton.bones.map((b, i) => [i, b.name]));
      part.updateMatrixWorld(true);
      if (isHull) {
        const n = geo.attributes.position.count;
        geo.setAttribute('aMat', new THREE.BufferAttribute(new Float32Array(n).fill(row), 1));
        const cl = new Float32Array(n * 4); for (let i = 0; i < n; i++) cl[i * 4] = -1;
        geo.setAttribute('aCloth', new THREE.BufferAttribute(cl, 4));
        geo.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(n), 1));
        partAttributesHull(geo);
        hullList.push({ geo, boneMap: map, bind: part.bindMatrix.clone(), char: ci });
      } else {
        partAttributes(actor, geo, base, row, ci);
        paintList.push({ geo, boneMap: map, bind: part.bindMatrix.clone(), char: ci });
      }
      toRemove.push(part);
      await Y('attributes');
    }
    for (const p of toRemove) p.parent.remove(p);
    actor.rows = rows;
    actor.spec = spec;
    actor.index = ci;
    spec.setup?.(actor, world, { THREE, RIG });
    spec.fit?.(actor);
    // props skinned to a hand: built in that hand's space, placed at its rest frame
    for (const pr of spec.props?.(actor, world, { THREE, RIG }) ?? []) {
      const rest = actor.rest[pr.bone];
      const handToBind = new THREE.Matrix4().compose(rest.wp, rest.wq, V3(1, 1, 1));
      const part = propPart(actor, pr.geo, pr.bone, handToBind, rows[pr.look], ci, pr.flow);
      part.char = ci;
      paintList.push(part);
      if (pr.hull !== false) hullList.push({ geo: pr.geo.clone(), boneMap: part.boneMap, bind: part.bind, char: ci });
    }
    actor.keys = spec.keys(actor, world, { THREE, RIG });
    actor.order = spec.order ?? null;
    actor.extra = spec.extra ? (a, st) => spec.extra(a, st, world) : null;
    actors.push(actor);
    await Y('actor');
  }
  const paintGeo = await mergeParts(paintList, ['position', 'normal', 'aFlow', 'aAxis', 'aCurv', 'aFace', 'aQuilt', 'aSeed', 'aMat', 'aCloth', 'aClothW'], 1, Y);
  const hullGeo = await mergeParts(hullList, ['position', 'normal', 'aCurv', 'aMat', 'aCloth', 'aClothW'], 2, Y);
  await Y('merged');
  const bones = actors.flatMap((a) => a.bones);
  const inverses = actors.flatMap((a) => a.boneInverses);
  const skeleton = new THREE.Skeleton(bones, inverses);
  const mats = DP.makeMaterials(core);
  const mk = (geo, mat, order) => {
    const m = new THREE.SkinnedMesh(geo, mat);
    m.bind(skeleton, new THREE.Matrix4());
    m.frustumCulled = false;
    // the merged meshes hold everyone: their boxes stay empty, each person's own box is its proxy (below)
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
  // the casters: the ink layer of the hull, seen only by the shadow cameras
  const caster = mk(hullGeo, mats.paintM, 0);
  caster.userData.shadowMaterial = mats.depthM;
  caster.layers.mask = 0;

  // acting lines, one skinned strip set for everyone (the graphics card moves them; each drawing writes their widths)
  const folds = await FOLDS.buildFolds(actors, paintGeo, Y);
  await Y('folds');
  const foldMesh = mk(folds.geo, folds.mat(DP.PU), 3);
  foldMesh.userData.castShadow = false;

  // every drawing, posed once; the sketch loops round every drawing; whenever a person shows a new drawing, its acting
  // lines take their widths and its sketch loop its shape
  for (const a of actors) await a.bakeAsync(Y);
  // Mike, 18/9: only the bottle wears the white line. The sketch loop stays in the code but is not built or drawn;
  // set OUTLINE to true to bring it back.
  const OUTLINE = false;
  const sketch = OUTLINE ? await SKETCH.buildSketch(actors, paintGeo, core, { incense: { loops: 1, off: [3, 8], width: 1.2 } }, Y) : null;
  await Y('sketch');
  if (sketch) scene.add(sketch.mesh);
  for (const a of actors) a.onShow = (x) => { folds.update(x); if (sketch) sketch.show(x); };
  for (const a of actors) { a.cur = -1; a.showDrawing(0); }
  // each person's box, for the core's checks (the camera keeps 2.2 m from people): an invisible proxy in its own group, bounding
  // every baked drawing (the joints, grown by the clothes, and what the hands hold)
  for (const a of actors) {
    const box = new THREE.Box3();
    const inv = new THREE.Matrix4();
    const pv = new THREE.Vector3();
    for (let d = 0; d < a.cache.n; d++) {
      if (d % 12 === 0) await Y('boxes');
      a.showDrawing(d, true);
      inv.copy(a.root.matrixWorld).invert();
      for (const b of a.bones) box.expandByPoint(pv.setFromMatrixPosition(b.matrixWorld).applyMatrix4(inv));
      const hr = a.hand.r.grip.clone().addScaledVector(a.hand.r.gripAxis ?? V3(0, 0, 0), 0.31).applyMatrix4(a.B.hand_r.matrixWorld).applyMatrix4(inv);
      box.expandByPoint(hr);
    }
    box.expandByVector(V3(0.14, 0.14, 0.14));
    box.min.y = Math.max(box.min.y, 0);
    box.max.y += 0.14;   // the joints stop at the skull's base: the head and the hat above it
    const size = box.getSize(V3(0, 0, 0)), ctr = box.getCenter(V3(0, 0, 0));
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z).translate(ctr.x, ctr.y, ctr.z), new THREE.MeshBasicMaterial());
    proxy.visible = false;
    proxy.name = `${a.name}-box`;
    proxy.userData.castShadow = false;
    a.root.add(proxy);
    a.box = box;
    a.cur = -1;
    a.showDrawing(0, true);
  }
  for (const a of actors) { a.cur = -1; a.showDrawing(0); }
  let tipGlow = null;
  const inc = actors.find((a) => a.name === 'incense');

  const size = new THREE.Vector2();
  function setPx() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    size.set(window.innerWidth * dpr, window.innerHeight * dpr);
    DP.PU.uRes.value.copy(size);
    DP.PU.uPxScale.value = size.y / 900;
  }
  setPx();
  const tmp = new THREE.Vector3();
  let lastT = 0;
  const api = {
    actors, palette, meshes: { paint, hull, caster, foldMesh }, folds, skeleton,
    buildMs: 0,
    sketch: [],
    solids: [],
    update(t, dt, camera) {
      lastT = t;
      if (size.x !== window.innerWidth * Math.min(window.devicePixelRatio || 1, 1.5)) setPx();
      for (const a of actors) a.show(t);
      if (inc && !tipGlow && core.glow) tipGlow = core.glow('#ff7a30', 0.035, 0.37, V3(0, -50, 0));
      if (tipGlow && inc) { inc.spec.tipWorld(inc, tmp); tipGlow.position.copy(tmp); }
    },
    // for the season: the corn cob's turn (0..3, in thirds of a turn), the capsules for the fire's painted shadows,
    // the agarwood tip (the smoke's source), whether the seller is fanning (0..1)
    turn(t) { const s = actors.find((a) => a.name === 'seller'); return s ? s.spec.turn(s, t) : 0; },
    fanning(t) { const s = actors.find((a) => a.name === 'seller'); return s ? s.spec.fanning(s, t) : 0; },
    tip(t) {
      if (!inc) return null;
      if (t !== undefined) inc.show(t);
      return inc.spec.tipWorld(inc, new THREE.Vector3());
    },
    caps(t) {
      const out = [];
      for (const a of actors) { if (t !== undefined) a.show(t); out.push(...ACTS.capsulesOf(a)); }
      if (t !== undefined) for (const a of actors) a.show(lastT);
      return out;
    },
    movers(t) {
      if (t !== undefined) for (const a of actors) a.show(t);
      return [];
    },
    // the faces, for core/qa/faces.mjs: points on each face as it is now (world), with where they look and their zone.
    // zone 'features' (brows, eyes, nose, mouth) must never be seen from any camera of the page; zone 'cheek' may show from behind
    faceProbes: () => faceProbes(),
    qa: { actors, world, ACTS, RIG, DP, THREE, layout, sketch, scene },
  };
  // face sample points: a few vertices of each zone per person, chosen once
  const faceIdx = actors.map((a) => {
    const f = paintGeo.attributes.aFace, ch = paintGeo.attributes.aChar;
    const byZone = { 1: [], 2: [] };
    for (let i = 0; i < f.count; i++) if (Math.round(ch.getX(i)) === a.index && f.getX(i) > 0.5) byZone[Math.round(f.getX(i))].push(i);
    const pick = (list, n) => list.filter((_, k) => k % Math.max(1, Math.floor(list.length / n)) === 0).slice(0, n);
    return [...pick(byZone[1], 24).map((i) => [i, 'features']), ...pick(byZone[2], 16).map((i) => [i, 'cheek'])];
  });
  const _fp = new THREE.Vector3(), _fn = new THREE.Vector4();
  function faceProbes() {
    const out = [];
    const nrm = paintGeo.attributes.normal;
    actors.forEach((a, k) => {
      for (const [i, zone] of faceIdx[k]) {
        paint.getVertexPosition(i, _fp);
        _fn.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i), 0);
        paint.applyBoneTransform(i, _fn);
        out.push({ person: a.name, zone, at: _fp.clone(), normal: new THREE.Vector3(_fn.x, _fn.y, _fn.z).normalize() });
      }
    });
    return out;
  }
  await Y('face probes');
  api.buildMs = Math.round(performance.now() - T0);
  api.runs = Y.end('end');
  if (typeof window !== 'undefined') { window.__dong = api; }
  return api;
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
