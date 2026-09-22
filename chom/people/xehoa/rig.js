// Chớm people, autumn (people/xehoa): the machinery both people share.
//   loadPerson(urls)               the .glb (MakeHuman body, clothes built in Blender) and its landmarks (.json)
//   new Person(scene, opts)        every part merged into ONE skinned mesh (a look per vertex), one hull (ink + bands),
//                                  acting lines on the card, extra bones for things she carries on her (bag, flap),
//                                  two-bone arms and legs that reach a goal, finger poses, cloth nodes, rest data.
// Built for the per-person budget (core/README.md 11b): the pose changes 12 times a second (on twos); the cloth moves every
// frame but only its node offsets go to the card; nothing is rebuilt or re-uploaded in the loop.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NCLOTH, NLOOK, NFOLD, personUniforms, bodyMaterial, depthMaterial, hullMaterial, foldMaterial } from './paint.js';

export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const FPS = 24, STEP = 2;
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();
const _m = new THREE.Matrix4(), _e = new THREE.Euler();

export const basis = (x, y, out = new THREE.Quaternion()) => {
  const X = _v3.copy(x).normalize();
  const Y = _v4.copy(y).addScaledVector(X, -y.dot(X)).normalize();
  const Z = _v2.crossVectors(X, Y);
  return out.setFromRotationMatrix(_m.makeBasis(X, Y, Z));
};
export function setWorldQuat(bone, qw) {
  bone.parent.getWorldQuaternion(_q2);
  bone.quaternion.copy(_q2.invert().multiply(qw));
  bone.updateMatrixWorld(true);
}

export async function loadPerson(urls) {
  let last;
  for (const url of [].concat(urls)) {
    try {
      const [gltf, meta] = await Promise.all([new GLTFLoader().loadAsync(url), fetch(url.replace(/\.glb$/, '.json')).then((r) => r.json())]);
      return { gltf, meta };
    } catch (e) { last = e; }
  }
  throw last;
}

const FINGER_NAMES = ['index', 'middle', 'ring', 'pinky', 'thumb'];
export const FINGERS = {
  grip: { index: [1.05, 1.15, 0.7], middle: [1.15, 1.2, 0.75], ring: [1.2, 1.2, 0.75], pinky: [1.25, 1.15, 0.7], thumb: [0.28, 0.4, 0.28], oppose: 0.6 },
  hold: { index: [0.75, 0.8, 0.5], middle: [0.85, 0.85, 0.55], ring: [0.9, 0.9, 0.55], pinky: [0.95, 0.85, 0.5], thumb: [0.2, 0.3, 0.2], oppose: 0.5 },
  relax: { index: [0.2, 0.3, 0.2], middle: [0.3, 0.4, 0.25], ring: [0.38, 0.45, 0.3], pinky: [0.45, 0.5, 0.3], thumb: [0.1, 0.2, 0.15], oppose: 0.2 },
  rest: { index: [0.35, 0.45, 0.3], middle: [0.42, 0.5, 0.32], ring: [0.5, 0.55, 0.35], pinky: [0.58, 0.58, 0.36], thumb: [0.12, 0.25, 0.2], oppose: 0.25 },
  open: { index: [0.05, 0.08, 0.05], middle: [0.06, 0.08, 0.05], ring: [0.1, 0.1, 0.05], pinky: [0.14, 0.12, 0.06], thumb: [0.05, 0.1, 0.1], oppose: 0.45 },
  flat: { index: [0.02, 0.03, 0.02], middle: [0.02, 0.03, 0.02], ring: [0.03, 0.04, 0.02], pinky: [0.04, 0.05, 0.03], thumb: [-0.05, 0.05, 0.05], oppose: 0.1 },
  point: { index: [0.05, 0.05, 0.05], middle: [1.1, 1.2, 0.7], ring: [1.2, 1.2, 0.75], pinky: [1.25, 1.15, 0.7], thumb: [0.35, 0.45, 0.3], oppose: 0.7 },
  // (thumb and index meet; the other fingers stay loose, along the pinch, so they never fold back into what is behind the hand)
  pinch: { index: [0.45, 0.55, 0.4], middle: [0.32, 0.36, 0.22], ring: [0.26, 0.3, 0.18], pinky: [0.26, 0.3, 0.18], thumb: [0.45, 0.45, 0.25], oppose: 0.85 },
  cradle: { index: [0.45, 0.35, 0.2], middle: [0.5, 0.4, 0.22], ring: [0.55, 0.42, 0.24], pinky: [0.6, 0.45, 0.26], thumb: [0.15, 0.2, 0.1], oppose: 0.35 },
  release: { index: [0.35, 0.35, 0.2], middle: [0.38, 0.38, 0.22], ring: [0.42, 0.4, 0.24], pinky: [0.45, 0.42, 0.25], thumb: [-0.2, -0.1, 0.0], oppose: 0.5 },
};

export class Person {
  // opts: { asset, core, name, looks: [{...}], lookOf(partName) -> index, flowOf(partName) -> 'hair'|'limb',
  //         extraBones: [{ name, parent, at: V3 (rest, character space) }], extraParts: [{ geo (character space, rest), look, bone }],
  //         cloth: [...] (added later with addGrid / addChain) }
  constructor(scene, o) {
    const { asset, core } = o;
    this.core = core;
    this.name = o.name;
    this.meta = asset.meta;
    const root = (this.root = new THREE.Group());
    root.name = o.name;
    scene.add(root);
    const model = (this.model = asset.gltf.scene);
    root.add(model);
    root.updateMatrixWorld(true);
    const parts = [];
    model.traverse((m) => { if (m.isSkinnedMesh) parts.push(m); });
    const skeleton = parts[0].skeleton;
    this.bones = skeleton.bones.slice();
    this.B = Object.fromEntries(this.bones.map((b) => [b.name, b]));
    // extra bones (things carried on the body), children of a body bone or of the model
    const extraBones = [];
    for (const eb of o.extraBones || []) {
      const b = new THREE.Bone();
      b.name = eb.name;
      const parent = eb.parent ? this.B[eb.parent] : model;
      parent.add(b);
      parent.updateMatrixWorld(true);
      b.position.copy(parent.worldToLocal(eb.at.clone()));
      b.quaternion.copy(parent.getWorldQuaternion(_q).invert());
      b.updateMatrixWorld(true);
      extraBones.push(b);
      this.B[b.name] = b;
    }
    const allBones = [...this.bones, ...extraBones];
    const inverses = [...skeleton.boneInverses.map((m) => m.clone()), ...extraBones.map((b) => b.matrixWorld.clone().invert())];
    this.skeleton = new THREE.Skeleton(allBones, inverses);
    const bindMatrix = parts[0].bindMatrix.clone();
    this.rest = this.restData();
    this._build = { o, parts, allBones, bindMatrix, model, core };
  }

  // the heavy part of the build, in slices (README 11: never more than about 16 ms at a stretch): await person.init(slice)
  async init(slice = async () => {}) {
    const { o, parts, allBones, bindMatrix, model, core } = this._build;
    delete this._build;
    // ---- one geometry for every part: attributes of the paint + a look per vertex
    const geos = [];
    this.partRanges = {};
    let offset = 0;
    const segs = this.segments();
    const bodyParts = [];
    for (const m of parts) {
      const raw = (m.material?.name || m.name || '').toLowerCase().replace(/\.\d+$/, '');
      const name = o.partName ? o.partName(raw) : raw;
      if (name === 'hull') { this.hullSrc = m; continue; }
      bodyParts.push(m);
      const g0 = m.geometry;
      const g = new THREE.BufferGeometry();
      for (const k of ['position', 'normal', 'skinIndex', 'skinWeight']) g.setAttribute(k, g0.attributes[k]);
      g.setIndex(g0.index);
      // bake the part's own node transform (identity in practice)
      m.updateMatrix();
      if (!m.matrix.equals(new THREE.Matrix4())) g.applyMatrix4(m.matrix);
      const look = o.lookOf(name);
      this.flowAttributes(g, o.flowOf ? o.flowOf(name) : 'limb', segs);
      const n = g.attributes.position.count;
      g.setAttribute('aLook', new THREE.BufferAttribute(new Float32Array(n).fill(look), 1));
      this.partRanges[name] = [offset, offset + n];
      offset += n;
      geos.push(g);
      await slice('init1');
    }
    for (const ep of o.extraParts || []) {
      const g = ep.geo;
      const n = g.attributes.position.count;
      const bi = allBones.findIndex((b) => b.name === ep.bone);
      const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = bi; sw[i * 4] = 1; }
      g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
      this.flowAttributes(g, 'limb', segs);
      g.setAttribute('aLook', new THREE.BufferAttribute(new Float32Array(n).fill(ep.look), 1));
      if (!g.index) g.setIndex([...Array(n).keys()]);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'skinIndex', 'skinWeight', 'aFlow', 'aAxis', 'aLook'].includes(k)) g.deleteAttribute(k);
      this.partRanges[ep.name] = [offset, offset + n];
      offset += n;
      geos.push(g);
    }
    // normalise attribute types (glTF skin indices may be u8)
    for (const g of geos) {
      const si = g.attributes.skinIndex;
      if (!(si.array instanceof Uint16Array)) g.setAttribute('skinIndex', new THREE.BufferAttribute(Uint16Array.from(si.array), 4));
      const sw = g.attributes.skinWeight;
      if (!(sw.array instanceof Float32Array)) {
        const a = new Float32Array(sw.count * 4);
        for (let i = 0; i < sw.count * 4; i++) a[i] = sw.array[i] / (sw.array instanceof Uint8Array ? 255 : sw.array instanceof Uint16Array ? 65535 : 1);
        g.setAttribute('skinWeight', new THREE.BufferAttribute(a, 4));
      }
      for (const k of ['position', 'normal']) if (g.attributes[k].isInterleavedBufferAttribute || g.attributes[k].normalized) g.setAttribute(k, new THREE.BufferAttribute(Float32Array.from({ length: g.attributes[k].count * 3 }, (_, i) => g.attributes[k].getComponent(Math.floor(i / 3), i % 3)), 3));
    }
    await slice('init2');
    const geo = (this.geo = mergeGeometries(geos, false));
    await slice('init3');
    const nV = geo.attributes.position.count;
    geo.setAttribute('aCloth', new THREE.BufferAttribute(new Float32Array(nV * 4).fill(-1), 4));
    geo.setAttribute('aClothW', new THREE.BufferAttribute(new Float32Array(nV), 1));
    geo.setAttribute('aCurv', new THREE.BufferAttribute(curvature(geo), 1));
    await slice('init4');
    this.own = personUniforms(o.looks);
    const mesh = (this.mesh = new THREE.SkinnedMesh(geo, bodyMaterial(core, this.own)));
    mesh.name = `${o.name}-body`;
    mesh.frustumCulled = false;
    model.add(mesh);
    mesh.bind(this.skeleton, bindMatrix);
    mesh.userData.shadowMaterial = depthMaterial(this.own);
    for (const m of bodyParts) m.parent.remove(m);
    this.parts = bodyParts;
    this.looks = o.looks;
    this.lookOfVertex = geo.attributes.aLook.array;

    this.cloth = { nodes: [], grids: [], next: 0 };
    this.folds = [];
    this.hand = {};
    this.arm = {};
    this.leg = {};
    for (const s of ['l', 'r']) { this.handData(s); this.armData(s); this.legData(s); }
    await slice('init5');
    if (this.hullSrc) { await this.buildHull(this.hullSrc, slice); await slice('init6'); }
    this.tmp = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), u: new THREE.Vector3(), l: new THREE.Vector3(), hg: new THREE.Vector3(), q: new THREE.Quaternion(), q2: new THREE.Quaternion() };
  }

  // rest frames in the character's own space
  restData() {
    const R = {};
    this.root.updateMatrixWorld(true);
    const inv = this.root.matrixWorld.clone().invert();
    const rq = this.root.getWorldQuaternion(new THREE.Quaternion()).invert();
    for (const b of this.skeleton.bones) {
      R[b.name] = {
        bone: b, local: b.quaternion.clone(), pos: b.position.clone(),
        wq: rq.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())),
        wp: b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv),
      };
    }
    return R;
  }
  P(n) { return this.rest[n].wp.clone(); }

  // ---- stroke directions: round each limb, across the back, along the hair
  segments() {
    const P = (n) => this.P(n);
    const hc = V3(...this.meta.headCentre);
    const S = { torso: { a: P('pelvis'), b: P('neck_01'), r: 0.12 }, head: { a: P('neck_01'), b: hc, r: 0.08 } };
    for (const s of ['l', 'r']) {
      S[`upper_${s}`] = { a: P(`upperarm_${s}`), b: P(`lowerarm_${s}`), r: 0.045 };
      S[`lower_${s}`] = { a: P(`lowerarm_${s}`), b: P(`hand_${s}`), r: 0.035 };
      S[`thigh_${s}`] = { a: P(`thigh_${s}`), b: P(`calf_${s}`), r: 0.085 };
      S[`calf_${s}`] = { a: P(`calf_${s}`), b: P(`foot_${s}`), r: 0.08 };
    }
    for (const [k, sg] of Object.entries(S)) {
      sg.axis = sg.b.clone().sub(sg.a).normalize();
      const back = V3(0, 0, -1);
      sg.ref = back.addScaledVector(sg.axis, -back.dot(sg.axis));
      if (sg.ref.lengthSq() < 1e-4) sg.ref.set(1, 0, 0).addScaledVector(sg.axis, -sg.axis.x);
      sg.ref.normalize();
      sg.side = new THREE.Vector3().crossVectors(sg.axis, sg.ref);
      sg.key = k;
    }
    const segOf = [];
    for (const b of this.skeleton.bones) {
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
      segOf.push(S[k]);
    }
    this.segOf = segOf;
    this.SEGS = S;
    return { S, segOf, hc };
  }
  flowAttributes(g, mode, { S, segOf, hc }) {
    const pos = g.attributes.position, nor = g.attributes.normal;
    const si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const n = pos.count;
    const flow = new Float32Array(n * 2), axis = new Float32Array(n * 3);
    const p = new THREE.Vector3(), q = new THREE.Vector3(), nn = new THREE.Vector3(), T = new THREE.Vector3();
    const up = V3(0, 1, 0), back = V3(0, 0, -1);
    const hairB1 = new THREE.Vector3().crossVectors(back, up);
    for (let i = 0; i < n; i++) {
      p.fromBufferAttribute(pos, i);
      nn.fromBufferAttribute(nor, i);
      if (mode === 'hair') {
        // locks combed back and down: lanes round the head, length from the front toward the nape
        q.subVectors(p, hc);
        const az = Math.atan2(q.dot(hairB1), q.y + 0.03);
        const pol = Math.atan2(Math.hypot(q.x, q.y), q.z);
        flow[i * 2] = az * 0.1; flow[i * 2 + 1] = pol * 0.1 + Math.max(0, hc.y - p.y) * 0.8;
        T.set(0, -0.35, -1).normalize();
        if (p.y < hc.y - 0.05) T.set(0, -1, -0.15).normalize();
        T.addScaledVector(nn, -T.dot(nn));
        if (T.lengthSq() < 1e-6) T.copy(up);
        T.normalize();
      } else {
        let best = 0, bw = -1;
        for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
        const sg = segOf[best] ?? S.torso;
        q.subVectors(p, sg.a);
        const along = q.dot(sg.axis);
        q.addScaledVector(sg.axis, -along);
        const ang = Math.atan2(q.dot(sg.side), q.dot(sg.ref));
        flow[i * 2] = ang * sg.r; flow[i * 2 + 1] = along;
        T.copy(sg.axis);
      }
      axis[i * 3] = T.x; axis[i * 3 + 1] = T.y; axis[i * 3 + 2] = T.z;
    }
    g.setAttribute('aFlow', new THREE.BufferAttribute(flow, 2));
    g.setAttribute('aAxis', new THREE.BufferAttribute(axis, 3));
  }

  // ---- the hull (from the .glb part 'hull'): two layers in one draw, widths from the look under each vertex
  async buildHull(hullMesh, slice = async () => {}) {
    const g0 = hullMesh.geometry;
    const n = g0.attributes.position.count;
    const pos = g0.attributes.position;
    // the look under each hull vertex: nearest body vertex (a coarse grid)
    const bp = this.geo.attributes.position;
    const cell = 0.03;
    const grid = new Map();
    await slice('hull0');
    // (number keys: no strings to collect)
    const ik = (x, y, z) => ((x + 512) * 1048576) + ((y + 512) * 1024) + (z + 512);
    const key = (x, y, z) => ik(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell));
    for (let i = 0; i < bp.count; i++) {
      const k = key(bp.getX(i), bp.getY(i), bp.getZ(i));
      let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(i);
      if (i % 2500 === 2499) await slice('hull1');
    }
    await slice('hull2');
    const nearest = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      let best = 0, bd = 1e9;
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const a = grid.get(ik(cx + dx, cy + dy, cz + dz));
        if (!a) continue;
        for (const j of a) { const d = (bp.getX(j) - x) ** 2 + (bp.getY(j) - y) ** 2 + (bp.getZ(j) - z) ** 2; if (d < bd) { bd = d; best = j; } }
      }
      nearest[i] = best;
      if (i % 400 === 399) await slice('hull3');
    }
    this.hullNearest = nearest;
    await slice('hull4');
    const idx = g0.index.array;
    const g = new THREE.BufferGeometry();
    const cat = (attr, size, Ctor = Float32Array) => { const a = new Ctor(n * 2 * size); a.set(attr.array.subarray(0, n * size)); a.set(attr.array.subarray(0, n * size), n * size); return a; };
    const toF = (attr) => (attr.array instanceof Float32Array ? attr : new THREE.BufferAttribute(Float32Array.from({ length: attr.count * attr.itemSize }, (_, i) => attr.array[i] / (attr.array instanceof Uint8Array ? 255 : attr.array instanceof Uint16Array ? 65535 : 1)), attr.itemSize));
    const toU = (attr) => (attr.array instanceof Uint16Array ? attr : new THREE.BufferAttribute(Uint16Array.from(attr.array), attr.itemSize));
    g.setAttribute('position', new THREE.BufferAttribute(cat(g0.attributes.position, 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(cat(g0.attributes.normal, 3), 3));
    await slice('hull5');
    g.setAttribute('skinIndex', new THREE.BufferAttribute(cat(toU(g0.attributes.skinIndex), 4, Uint16Array), 4));
    await slice('hull6');
    g.setAttribute('skinWeight', new THREE.BufferAttribute(cat(toF(g0.attributes.skinWeight), 4), 4));
    await slice('hull7');
    const layer = new Float32Array(n * 2), inkW = new Float32Array(n * 2), bandW = new Float32Array(n * 2);
    const bodyCloth = this.geo.attributes.aCloth.array, bodyClothW = this.geo.attributes.aClothW.array;
    const cl = new Float32Array(n * 8), clw = new Float32Array(n * 2);
    await slice('hull8');
    for (let L = 0; L < 2; L++) for (let i = 0; i < n; i++) {
      const o = L * n + i;
      const look = this.looks[this.lookOfVertex[nearest[i]]];
      layer[o] = L;
      inkW[o] = (look.ink ?? 2) * 1.2;
      bandW[o] = look.bands ? (look.ink ?? 2) * 0.22 + 0.7 : 0;
      const j = nearest[i];
      cl.set(bodyCloth.subarray(j * 4, j * 4 + 4), o * 4);
      clw[o] = bodyClothW[j];
    }
    g.setAttribute('aLayer', new THREE.BufferAttribute(layer, 1));
    g.setAttribute('aInkW', new THREE.BufferAttribute(inkW, 1));
    g.setAttribute('aBandW', new THREE.BufferAttribute(bandW, 1));
    g.setAttribute('aCloth', new THREE.BufferAttribute(cl, 4));
    g.setAttribute('aClothW', new THREE.BufferAttribute(clw, 1));
    const ind = new (n * 2 > 65535 ? Uint32Array : Uint16Array)(idx.length * 2);
    ind.set(idx); for (let i = 0; i < idx.length; i++) ind[idx.length + i] = idx[i] + n;
    g.setIndex(new THREE.BufferAttribute(ind, 1));
    await slice('hull9');
    const c1 = curvature(g0);
    await slice('hull10');
    const cv = new Float32Array(n * 2); cv.set(c1); cv.set(c1, n);
    g.setAttribute('aCurv', new THREE.BufferAttribute(cv, 1));
    const hull = new THREE.SkinnedMesh(g, hullMaterial(this.own));
    hull.name = `${this.name}-hull`;
    hull.frustumCulled = false;
    hull.userData.castShadow = false;
    this.model.add(hull);
    hull.bind(this.skeleton, this.mesh.bindMatrix);
    hullMesh.parent?.remove(hullMesh);
    this.hull = hull;
    return hull;
  }
  // after the cloth grids are laid: the hull takes the cloth mapping of the body vertex under it
  refreshHullCloth() {
    if (!this.hull) return;
    const n = this.hullNearest.length;
    const bodyCloth = this.geo.attributes.aCloth.array, bodyClothW = this.geo.attributes.aClothW.array;
    const cl = this.hull.geometry.attributes.aCloth.array, clw = this.hull.geometry.attributes.aClothW.array;
    for (let L = 0; L < 2; L++) for (let i = 0; i < n; i++) {
      const j = this.hullNearest[i], o = L * n + i;
      cl.set(bodyCloth.subarray(j * 4, j * 4 + 4), o * 4);
      clw[o] = bodyClothW[j];
    }
    this.hull.geometry.attributes.aCloth.needsUpdate = true;
    this.hull.geometry.attributes.aClothW.needsUpdate = true;
  }

  // ---- cloth: a grid of nodes, each following a skinned anchor with a spring; the card blends node offsets
  // pick(i, p) chooses body vertices; uv(p) -> [u, v] in 0..1; wOf(p) how much the grid moves the vertex; stiff(v)
  addGrid({ pick, nu, nv, uv, wOf, stiff, wrap = false, out = null, legs = false, damp = 0.3, name = 'grid' }) {
    const g = this.geo;
    const pos = g.attributes.position, ac = g.attributes.aCloth.array, aw = g.attributes.aClothW.array;
    const start = this.cloth.next;
    console.assert(start + nu * nv <= NCLOTH, 'too many cloth nodes');
    const verts = [], uvs = [];
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      if (!pick(i, p)) continue;
      const [u, v] = uv(p);
      verts.push(i); uvs.push([clamp01(u) % 1.0000001, clamp01(v)]);
      ac[i * 4] = start;
      ac[i * 4 + 1] = wrap ? (((u % 1) + 1) % 1) * nu : clamp01(u) * (nu - 1);
      ac[i * 4 + 2] = Math.min(clamp01(v) * (nv - 1), nv - 1.0001);
      ac[i * 4 + 3] = wrap ? -nu : nu;
      aw[i] = wOf(p);
    }
    if (!verts.length) { console.warn(`[xehoa] cloth grid ${name} (${this.name}): no vertices`); return null; }
    const nodes = [];
    for (let j = 0; j < nv; j++) for (let k = 0; k < nu; k++) {
      const tu = wrap ? k / nu : nu > 1 ? k / (nu - 1) : 0.5, tv = j / (nv - 1);
      let best = -1, bd = 1e9;
      for (let q = 0; q < verts.length; q++) {
        let du = Math.abs(uvs[q][0] - tu);
        if (wrap) du = Math.min(du, 1 - du);
        const d = du * du + (uvs[q][1] - tv) ** 2 * 1.5;
        if (d < bd) { bd = d; best = verts[q]; }
      }
      const node = { vi: best, j, k, nu, nv, tv, stiff: stiff(tv), damp, p: new THREE.Vector3(), v: new THREE.Vector3(), t: new THREE.Vector3(), rl: new THREE.Vector3(), start, out, legs, name, id: start + j * nu + k };
      nodes.push(node);
    }
    this.cloth.nodes.push(...nodes);
    this.cloth.grids.push({ start, nu, nv, wrap, nodes, name });
    this.cloth.next += nu * nv;
    g.attributes.aCloth.needsUpdate = true;
    g.attributes.aClothW.needsUpdate = true;
    return { start, nu, nv, nodes };
  }
  // anchors of every node, in the model's own space, from the current drawing (call when the drawing changes)
  anchorCloth() {
    this.root.updateMatrixWorld(true);
    const inv = _m.copy(this.root.matrixWorld).invert();
    for (const n of this.cloth.nodes) {
      this.mesh.getVertexPosition(n.vi, n.rl);
      n.rl.applyMatrix4(this.mesh.matrixWorld).applyMatrix4(inv);
    }
  }

  // ---- acting lines: pts (character space, rest) -> nearest body vertices of the allowed looks; weight: a uniform slot
  addFold(pts, { looks, width = 2.2, slot, filter = null }) {
    const pos = this.geo.attributes.position;
    const idx = [];
    for (const p of pts) {
      let best = -1, bd = 1e9;
      for (let i = 0; i < pos.count; i++) {
        if (looks && !looks.includes(this.lookOfVertex[i])) continue;
        if (filter && !filter(i)) continue;
        const d = (pos.getX(i) - p.x) ** 2 + (pos.getY(i) - p.y) ** 2 + (pos.getZ(i) - p.z) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      if (best >= 0 && best !== idx[idx.length - 1]) idx.push(best);
    }
    if (idx.length < 2) return -1;
    this.folds.push({ idx, width, slot });
    return slot;
  }
  buildFolds() {
    if (!this.folds.length) return null;
    const src = this.geo.attributes;
    let n = 0;
    for (const f of this.folds) n += f.idx.length;
    const P = new Float32Array(n * 6), D = new Float32Array(n * 6), I = new Float32Array(n * 8);
    const SI = new Uint16Array(n * 8), SW = new Float32Array(n * 8), CL = new Float32Array(n * 8), CW = new Float32Array(n * 2);
    const N = new Float32Array(n * 6);
    const index = [];
    let o = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    for (const f of this.folds) {
      const m = f.idx.length;
      for (let k = 0; k < m; k++) {
        const vi = f.idx[k];
        a.fromBufferAttribute(src.position, f.idx[Math.max(0, k - 1)]);
        b.fromBufferAttribute(src.position, f.idx[Math.min(m - 1, k + 1)]);
        b.sub(a).normalize();
        for (let s = 0; s < 2; s++) {
          const v = o * 2 + s;
          for (let c = 0; c < 3; c++) { P[v * 3 + c] = src.position.array[vi * 3 + c]; N[v * 3 + c] = src.normal.array[vi * 3 + c]; }
          D[v * 3] = b.x; D[v * 3 + 1] = b.y; D[v * 3 + 2] = b.z;
          I[v * 4] = s ? 1 : -1; I[v * 4 + 1] = k / (m - 1); I[v * 4 + 2] = f.slot; I[v * 4 + 3] = f.width;
          for (let c = 0; c < 4; c++) { SI[v * 4 + c] = src.skinIndex.array[vi * 4 + c]; SW[v * 4 + c] = src.skinWeight.array[vi * 4 + c]; CL[v * 4 + c] = src.aCloth.array[vi * 4 + c]; }
          CW[v] = src.aClothW.array[vi];
        }
        if (k < m - 1) index.push(o * 2, o * 2 + 2, o * 2 + 1, o * 2 + 1, o * 2 + 2, o * 2 + 3);
        o++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('aDirR', new THREE.BufferAttribute(D, 3));
    g.setAttribute('aInfo', new THREE.BufferAttribute(I, 4));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    g.setAttribute('aCloth', new THREE.BufferAttribute(CL, 4));
    g.setAttribute('aClothW', new THREE.BufferAttribute(CW, 1));
    g.setIndex(index);
    const fm = new THREE.SkinnedMesh(g, foldMaterial(this.own));
    fm.name = `${this.name}-folds`;
    fm.frustumCulled = false;
    fm.renderOrder = 3;
    fm.userData.castShadow = false;
    this.model.add(fm);
    fm.bind(this.skeleton, this.mesh.bindMatrix);
    this.foldMesh = fm;
    return fm;
  }

  // ---- hands: rest frames, grip and pinch points, finger curl axes
  handData(s) {
    const P = (n) => this.P(n), rest = this.rest;
    const h = rest[`hand_${s}`];
    const across = P(`pinky_01_${s}`).sub(P(`index_01_${s}`)).normalize();
    const fwd = P(`middle_01_${s}`).sub(h.wp).normalize();
    const palm = new THREE.Vector3().crossVectors(fwd, across).normalize();
    const bend = P(`middle_03_${s}`).sub(P(`middle_01_${s}`)).normalize().addScaledVector(fwd, -1);
    if (bend.dot(palm) < 0) palm.negate();
    const inv = h.wq.clone().invert();
    const f0 = fwd.clone().applyQuaternion(inv), p0 = palm.clone().applyQuaternion(inv);
    const gripW = h.wp.clone().lerp(P(`middle_01_${s}`), 0.85).addScaledVector(palm, 0.028).addScaledVector(across, 0.012);
    const grip = gripW.sub(h.wp).applyQuaternion(inv);
    const tipW = P(`index_03_${s}`).lerp(P(`middle_03_${s}`), 0.5).addScaledVector(fwd, 0.012);
    const pinch = tipW.sub(h.wp).applyQuaternion(inv);
    // the palm's centre, a little off the skin (where a flat thing rests on the open hand)
    const palmC = h.wp.clone().lerp(P(`middle_01_${s}`), 0.5).addScaledVector(palm, 0.018).sub(h.wp).applyQuaternion(inv);
    const fingers = {};
    for (const f of FINGER_NAMES) {
      fingers[f] = [1, 2, 3].map((k) => {
        const n = `${f}_0${k}_${s}`;
        const a = P(n);
        const next = k < 3 ? P(`${f}_0${k + 1}_${s}`) : a.clone().add(a.clone().sub(P(`${f}_0${k - 1}_${s}`)));
        const d = next.sub(a).normalize();
        let ax = new THREE.Vector3().crossVectors(d, palm).normalize();
        if (f === 'thumb') ax.lerp(fwd, 0.35).normalize();
        return { n, bone: this.B[n], axis: ax.applyQuaternion(rest[n].wq.clone().invert()) };
      });
    }
    const oppAxis = fwd.clone().applyQuaternion(rest[`thumb_01_${s}`].wq.clone().invert());
    this.hand[s] = { f0, p0, grip, pinch, palmC, fingers, oppAxis, restHandQ: basis(f0, p0, new THREE.Quaternion()), gripAmt: 1 };
  }
  armData(s) {
    const U = this.rest[`upperarm_${s}`], L = this.rest[`lowerarm_${s}`], H = this.rest[`hand_${s}`];
    const u0 = L.wp.clone().sub(U.wp), l0 = H.wp.clone().sub(L.wp);
    const hinge = new THREE.Vector3().crossVectors(u0, l0).normalize();
    this.arm[s] = {
      l1: u0.length(), l2: l0.length(),
      uLocal: basis(u0.clone().applyQuaternion(U.wq.clone().invert()), hinge.clone().applyQuaternion(U.wq.clone().invert()), new THREE.Quaternion()).invert(),
      lLocal: basis(l0.clone().applyQuaternion(L.wq.clone().invert()), hinge.clone().applyQuaternion(L.wq.clone().invert()), new THREE.Quaternion()).invert(),
    };
  }
  legData(s) {
    const T = this.rest[`thigh_${s}`], C = this.rest[`calf_${s}`], F = this.rest[`foot_${s}`];
    const t0 = C.wp.clone().sub(T.wp), c0 = F.wp.clone().sub(C.wp);
    let hinge = new THREE.Vector3().crossVectors(t0, c0);
    if (hinge.lengthSq() < 1e-8) hinge.set(1, 0, 0);
    hinge.normalize();
    // the knee always bends forward (+z of the character): make the hinge agree
    if (new THREE.Vector3().crossVectors(hinge, t0).z < 0) hinge.negate();
    this.leg[s] = {
      l1: t0.length(), l2: c0.length(), hinge,
      tLocal: basis(t0.clone().applyQuaternion(T.wq.clone().invert()), hinge.clone().applyQuaternion(T.wq.clone().invert()), new THREE.Quaternion()).invert(),
      cLocal: basis(c0.clone().applyQuaternion(C.wq.clone().invert()), hinge.clone().applyQuaternion(C.wq.clone().invert()), new THREE.Quaternion()).invert(),
      ankle: F.wp.clone(), footQ: F.wq.clone(),
      ballUp: this.P(`ball_${s}`).y - F.wp.y, heelDrop: F.wp.y,
    };
  }

  // ---- posing
  resetPose() {
    for (const b of this.skeleton.bones) {
      const r = this.rest[b.name];
      if (!r) continue;
      b.quaternion.copy(r.local);
      b.position.copy(r.pos);
    }
    this.model.position.set(0, 0, 0);
    this.root.updateMatrixWorld(true);
  }
  // a delta in character space (x: bend forward, y: turn to her left, z: lean to her right)
  rotateBone(name, e) {
    if (!e || (e[0] === 0 && e[1] === 0 && e[2] === 0)) return;
    const b = this.B[name];
    this.root.getWorldQuaternion(_q3);
    _q.setFromEuler(_e.set(e[0], e[1], e[2], 'YXZ'));
    const qd = _q.premultiply(_q3).multiply(_q2.copy(_q3).invert());
    b.getWorldQuaternion(_q2);
    setWorldQuat(b, qd.multiply(_q2));
  }
  curl(s, preset, amt = 1) {
    const H = this.hand[s];
    // a fist fitted round a thing of a known thickness (fitWrap)
    let thumbK = 1, opp = null;
    const w = H.wraps?.[preset];
    if (w) { thumbK = w.thumb ?? 1; opp = w.oppose ?? null; amt = w.amt; preset = w.preset ?? 'grip'; }
    const F = FINGERS[preset] || FINGERS.relax;
    if (preset === 'grip' && amt === 1) amt = H.gripAmt;
    for (const f of FINGER_NAMES) {
      H.fingers[f].forEach((seg, k) => {
        _q.setFromAxisAngle(seg.axis, F[f][k] * amt * (f === 'thumb' ? thumbK : 1));
        seg.bone.quaternion.copy(this.rest[seg.n].local).multiply(_q);
        if (f === 'thumb' && k === 0) seg.bone.quaternion.multiply(_q2.setFromAxisAngle(H.oppAxis, (s === 'l' ? -1 : 1) * (opp ?? F.oppose * 0.6 * thumbK)));
      });
    }
  }
  // the thumb side of a hand, in hand space
  thumbSide(s) {
    const H = this.hand[s];
    if (H.thumbSide) return H.thumbSide;
    const inv = this.rest[`hand_${s}`].wq.clone().invert();
    const t = this.P(`index_01_${s}`).sub(this.P(`pinky_01_${s}`)).applyQuaternion(inv);
    t.addScaledVector(H.f0, -t.dot(H.f0)).addScaledVector(H.p0, -t.dot(H.p0)).normalize();
    return (H.thumbSide = t);
  }
  // fit a fist round a round thing of radius r whose axis runs along the thumb side: the tightest curl whose fingers stay
  // r + 7 mm off the axis, and where that axis sits in the hand (hand space). Stored as H.wraps[name].
  fitWrap(s, rFn, hold, name) {
    const r = rFn(hold);
    const H = this.hand[s];
    const Y = this.thumbSide(s);
    const hb = this.B[`hand_${s}`];
    const across = Y;
    let chosen = null;
    for (let amt = 1.35; amt >= 0.2; amt -= 0.05) {
      this.resetPose();
      this.curl(s, 'grip', amt);
      this.root.updateMatrixWorld(true);
      const pts = [], mids = [];
      for (const f of ['index', 'middle', 'ring', 'pinky']) {
        const j = [1, 2, 3].map((q) => hb.worldToLocal(this.B[`${f}_0${q}_${s}`].getWorldPosition(new THREE.Vector3())));
        pts.push(j[1], j[2], j[2].clone().add(j[2].clone().sub(j[1]).multiplyScalar(0.85)), j[0].clone().lerp(j[1], 0.5), j[1].clone().lerp(j[2], 0.5));
        mids.push(j[1], j[1].clone().lerp(j[2], 0.5));
      }
      const knuck = hb.worldToLocal(this.B[`middle_01_${s}`].getWorldPosition(new THREE.Vector3()));
      let best = null;
      for (let b = 0.0; b <= 0.13; b += 0.004) for (let a = r + 0.012; a <= r + 0.05; a += 0.003) {
        const c = H.p0.clone().multiplyScalar(a).addScaledVector(H.f0, b).addScaledVector(across, knuck.dot(across));
        let m = 9;
        let bad = false;
        for (const p of pts) {
          _v.subVectors(p, c);
          const ax = _v.dot(across);
          _v.addScaledVector(across, -ax);
          const d = _v.length(), need = rFn(hold + ax) + 0.006;
          if (d < need) { bad = true; break; }
          m = Math.min(m, d - need + r + 0.006);
        }
        if (bad || m > r + 0.03) continue;
        // the fingers must come round it: their middle joints lie beyond the axis (seen from the palm)
        let over = 0;
        for (let k = 0; k < mids.length; k += 2) if (Math.max(mids[k].dot(H.p0), mids[k + 1].dot(H.p0), pts[k / 2 * 5 + 2].dot(H.p0)) >= a - 0.4 * r) over++;
        if (over < 2) continue;
        const score = a + 0.5 * Math.abs(m - (r + 0.009));
        if (!best || score < best.score) best = { c, m, score };
      }
      if (best) { chosen = { amt, c: best.c, clear: best.m }; break; }
    }
    // the thumb: search curl and swing for the pose that wraps closest without cutting in
    if (chosen) {
      H.wraps ??= {};
      let bestT = null;
      for (let k = 0; k <= 2.6; k += 0.2) for (let o = -1.0; o <= 2.2; o += 0.2) {
        this.resetPose();
        H.wraps.__fit = { amt: chosen.amt, thumb: k, oppose: o };
        this.curl(s, '__fit');
        this.root.updateMatrixWorld(true);
        let m = 9;
        const ch = [1, 2, 3].map((q) => hb.worldToLocal(this.B[`thumb_0${q}_${s}`].getWorldPosition(new THREE.Vector3())));
        const tip = ch[2].clone().add(ch[2].clone().sub(ch[1]).multiplyScalar(0.85));
        const pts2 = [ch[1], ch[1].clone().lerp(ch[2], 0.5), ch[2], ch[2].clone().lerp(tip, 0.5), tip];
        for (const p of pts2) { _v.subVectors(p, chosen.c); const ax = _v.dot(across); _v.addScaledVector(across, -ax); m = Math.min(m, _v.length() - rFn(hold + ax)); }
        if (m < 0.008) continue;
        // prefer the thumb close to the surface (wrapped), not sticking out
        const score = Math.abs(m - 0.012);
        if (!bestT || score < bestT.score) bestT = { k, o, score };
      }
      if (bestT) { chosen.thumb = bestT.k; chosen.oppose = bestT.o; }
      chosen.thumb ??= 0;
      delete H.wraps.__fit;
    }
    this.resetPose();
    if (!chosen) {
      console.warn('[xehoa] no wrap fits', this.name, s, r);
      chosen = { amt: 0.4, c: H.p0.clone().multiplyScalar(r + 0.02).addScaledVector(H.f0, 0.07), clear: 0 };
    }
    H.wraps ??= {};
    H.wraps[name] = chosen;
    return chosen;
  }
  // a real pinch: the curl of the 'pinch' preset, the thumb's curl and swing, searched so that the thumb pad meets the
  // index pad (a note's thickness apart) without the thumb passing through the finger. Stored as H.wraps.pinch (curl
  // uses it for 'pinch'), and H.pinch = the point between the pads (hand space).
  fitPinch(s) {
    const H = this.hand[s];
    const hb = this.B[`hand_${s}`];
    this.resetPose();
    H.wraps ??= {};
    delete H.wraps.pinch;
    const pos = (n, out) => hb.worldToLocal(this.B[n].getWorldPosition(out));
    const j = [0, 1, 2].map(() => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
    const pad = (f, k, out) => {
      pos(`${f}_02_${s}`, j[k][0]); pos(`${f}_03_${s}`, j[k][1]);
      return out.copy(j[k][1]).addScaledVector(j[k][1].clone().sub(j[k][0]), 0.55);
    };
    const pi = new THREE.Vector3(), pt = new THREE.Vector3();
    const tryPose = (amt, k, o) => {
      H.wraps.__fit = { amt, preset: 'pinch', thumb: k, oppose: o };
      this.curl(s, '__fit');
      hb.updateMatrixWorld(true);
      pad(`index`, 0, pi); pad(`thumb`, 1, pt);
      const gap = pi.distanceTo(pt);
      // the thumb's middle joint must stay off the index finger
      const t2 = pos(`thumb_02_${s}`, j[2][0]), i2 = pos(`index_02_${s}`, j[2][1]);
      const clash = Math.max(0, 0.02 - t2.distanceTo(i2));
      return Math.abs(gap - 0.012) + clash * 3;
    };
    let best = { score: 9 };
    const clampP = (amt, k, o) => [Math.min(1.3, Math.max(0.7, amt)), Math.min(2.6, Math.max(-0.8, k)), Math.min(2.6, Math.max(-1.6, o))];
    for (let amt = 0.7; amt <= 1.31; amt += 0.15) for (let k = -0.8; k <= 2.6; k += 0.28) for (let o = -1.6; o <= 2.6; o += 0.3) {
      const sc = tryPose(amt, k, o);
      if (sc < best.score) best = { score: sc, amt, k, o };
    }
    // refine
    for (const step of [0.08, 0.03]) {
      const b0 = { ...best };
      for (let da = -2; da <= 2; da++) for (let dk = -2; dk <= 2; dk++) for (let dor = -2; dor <= 2; dor++) {
        const [amt, k, o] = clampP(b0.amt + da * step, b0.k + dk * step * 1.3, b0.o + dor * step * 1.6);
        const sc = tryPose(amt, k, o);
        if (sc < best.score) best = { score: sc, amt, k, o };
      }
    }
    tryPose(best.amt, best.k, best.o);
    H.pinch = pi.clone().lerp(pt, 0.5);
    H.pinchGap = pi.distanceTo(pt);
    delete H.wraps.__fit;
    H.wraps.pinch = { amt: best.amt, preset: 'pinch', thumb: best.k, oppose: best.o };
    this.resetPose();
    return H.pinch;
  }
  // ---- the face (contract 7.5): 'features' = eyes, nose, mouth (never a pixel on the page), 'cheek' = cheek and jaw
  // (allowed seen from behind, painted flat). Marked on the skin of the head from the rest landmarks; aFace on the card
  // (features, cheek) for the pixel check, and a thinned list of probes for the core's face check.
  markFace(skinLook = 0) {
    const g = this.geo, P = g.attributes.position, n = P.count;
    const M = this.meta;
    const c = new THREE.Vector3(...M.headCentre), F = new THREE.Vector3(...M.headFwd).normalize(), Uu = new THREE.Vector3(...M.headUp).normalize();
    const S = new THREE.Vector3().crossVectors(Uu, F).normalize();
    const eye = new THREE.Vector3(...M.eyes[0]).add(new THREE.Vector3(...M.eyes[1])).multiplyScalar(0.5);
    const ue = eye.clone().sub(c).dot(Uu);
    const head = this.skeleton.bones.findIndex((b) => b.name === 'head');
    const SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array;
    // two channels (features, cheek): one number would blend through 'features' at the edge of the cheek
    const face = new Float32Array(n * 2);
    const feat = [], cheek = [];
    const d = new THREE.Vector3(), nrmV = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      if (this.lookOfVertex[i] !== skinLook) continue;
      let w = 0;
      for (let k = 0; k < 4; k++) if (SI[i * 4 + k] === head) w += SW[i * 4 + k];
      if (w < 0.5) continue;
      d.fromBufferAttribute(P, i).sub(c);
      const f = d.dot(F), u = d.dot(Uu), sd = Math.abs(d.dot(S));
      // eyes (brow to lower lid, corner to corner), nose (bridge to tip), mouth (lips and their corners), each a little generous
      const eyes = u < ue + 0.022 && u > ue - 0.022 && sd < 0.048;
      const nose = u < ue + 0.005 && u > ue - 0.052 && sd < 0.022;
      const mouth = u < ue - 0.042 && u > ue - 0.078 && sd < 0.03;
      // (the eyes, nose and mouth look forward: their skin faces within about 57 degrees of the face's own front)
      nrmV.fromBufferAttribute(g.attributes.normal, i).normalize();
      if (f > 0.025 && nrmV.dot(F) > 0.54 && (eyes || nose || mouth)) { face[i * 2] = 1; feat.push(i); }
      else if (f > -0.03 && sd < 0.1 && u < ue + 0.045 && u > ue - 0.13) { face[i * 2 + 1] = 1; cheek.push(i); }
    }
    g.setAttribute('aFace', new THREE.BufferAttribute(face, 2));
    const thin = (list, k) => list.filter((_, j) => j % Math.max(1, Math.floor(list.length / k)) === 0);
    this.face = { features: feat, cheek, probes: [...thin(feat, 60).map((i) => [i, 'features']), ...thin(cheek, 40).map((i) => [i, 'cheek'])] };
    return this.face;
  }
  // the face probes as drawn now: [{ p, n, zone, who }] (world)
  faceProbes(who) {
    if (!this.face) return [];
    const m = this.mesh, N = this.geo.attributes.normal;
    this.root.updateMatrixWorld(true);
    const hb = this.B.head;
    const q = hb.getWorldQuaternion(new THREE.Quaternion()).multiply(this.rest.head.wq.clone().invert());
    return this.face.probes.map(([i, zone]) => {
      const p = m.getVertexPosition(i, new THREE.Vector3());
      m.localToWorld(p);
      // (rest normals are in the model's own frame at build time: the head's turn since then takes them to the world)
      const nn = new THREE.Vector3(N.getX(i), N.getY(i), N.getZ(i)).applyQuaternion(q).normalize();
      return { p, n: nn, zone, who };
    });
  }
  // the sample points of a finger chain (hand space), the same ones the pass-through check uses
  chainPts(s, f, out) {
    const hb = this.B[`hand_${s}`];
    const j = [1, 2, 3].map((q) => hb.worldToLocal(this.B[`${f}_0${q}_${s}`].getWorldPosition(new THREE.Vector3())));
    const tip = j[2].clone().add(j[2].clone().sub(j[1]).multiplyScalar(0.85));
    const chain = [new THREE.Vector3().lerp(j[0], 0.7), ...j, tip];
    for (let q = 0; q < chain.length - 1; q++) out.push(chain[q], chain[q].clone().lerp(chain[q + 1], 0.5));
    out.push(tip);
    return out;
  }
  // an open hand resting on the side of a round thing (radius rFn(along) at the palm, axis along the thumb side,
  // palm centre `gap` off its surface): the strongest curl of `preset` whose fingers and thumb stay outside it.
  // Stored as H.wraps[name] (used by curl(s, name)).
  fitSide(s, rFn, along, name, preset = 'cradle', gap = 0.014) {
    const H = this.hand[s];
    const Y = this.thumbSide(s);
    const c = H.palmC.clone().addScaledVector(H.p0, rFn(along) + gap);
    const clear = (pts) => {
      let m = 9;
      for (const p of pts) {
        _v.subVectors(p, c);
        const ax = _v.dot(Y);
        _v.addScaledVector(Y, -ax);
        m = Math.min(m, _v.length() - rFn(along + ax));
      }
      return m;
    };
    H.wraps ??= {};
    let chosen = { amt: 0, preset, thumb: 1, oppose: null };
    for (let amt = 1.2; amt >= 0; amt -= 0.05) {
      H.wraps.__fit = { amt, preset, thumb: 0.3, oppose: null };
      this.resetPose();
      this.curl(s, '__fit');
      this.root.updateMatrixWorld(true);
      const pts = [];
      for (const f of ['index', 'middle', 'ring', 'pinky']) this.chainPts(s, f, pts);
      if (clear(pts) >= 0.006) { chosen = { amt, preset }; break; }
    }
    let bestT = null;
    for (let k = 0; k <= 2.0; k += 0.25) for (let o = -0.6; o <= 1.8; o += 0.3) {
      H.wraps.__fit = { amt: chosen.amt, preset, thumb: k, oppose: o };
      this.resetPose();
      this.curl(s, '__fit');
      this.root.updateMatrixWorld(true);
      const m = clear(this.chainPts(s, 'thumb', []));
      if (m < 0.006) continue;
      const score = Math.abs(m - 0.012) + Math.abs(k - 1) * 0.002;
      if (!bestT || score < bestT.score) bestT = { k, o, score };
    }
    chosen.thumb = bestT ? bestT.k : 0;
    chosen.oppose = bestT ? bestT.o : 0;
    delete H.wraps.__fit;
    this.resetPose();
    H.wraps[name] = chosen;
    return chosen;
  }
  // two-bone arm: the grip (or pinch, or palm) point to gripW, fingers along fwdW, palm facing palmW, elbow toward poleW (world)
  solveArm(s, gripW, fwdW, palmW, poleW, point = 'grip') {
    const Ub = this.B[`upperarm_${s}`], Lb = this.B[`lowerarm_${s}`], Hb = this.B[`hand_${s}`];
    const A = this.arm[s], Hd = this.hand[s];
    const qh = basis(fwdW, palmW, this.tmp.q).multiply(_q.copy(Hd.restHandQ).invert());
    const off = _v.copy(typeof point === 'string' ? Hd[point] : point).applyQuaternion(qh);
    const T = this.tmp.a.copy(gripW).sub(off);
    const S = Ub.getWorldPosition(this.tmp.b);
    const d = _v2.subVectors(T, S);
    let len = d.length();
    const dir = d.normalize();
    len = Math.min(Math.max(len, Math.abs(A.l1 - A.l2) + 0.01), A.l1 + A.l2 - 0.004);
    const a = (A.l1 * A.l1 - A.l2 * A.l2 + len * len) / (2 * len);
    const h = Math.sqrt(Math.max(0, A.l1 * A.l1 - a * a));
    const perp = this.tmp.c.copy(poleW).addScaledVector(dir, -poleW.dot(dir)).normalize();
    const E = this.tmp.d.copy(S).addScaledVector(dir, a).addScaledVector(perp, h);
    const W = _v4.copy(S).addScaledVector(dir, len);
    const u = _v3.subVectors(E, S).normalize();
    const l = new THREE.Vector3().subVectors(W, E).normalize();
    const hinge = new THREE.Vector3().crossVectors(u, l);
    if (hinge.lengthSq() < 1e-6) hinge.crossVectors(u, perp);
    hinge.normalize();
    setWorldQuat(Ub, basis(u, hinge, _q3).multiply(A.uLocal));
    const qlBase = basis(l, hinge, new THREE.Quaternion()).multiply(A.lLocal);
    const handFromBase = qlBase.clone().invert().multiply(qh);
    const axisL = l.clone().applyQuaternion(qlBase.clone().invert()).normalize();
    const dd = handFromBase.x * axisL.x + handFromBase.y * axisL.y + handFromBase.z * axisL.z;
    const twFull = _q2.set(axisL.x * dd, axisL.y * dd, axisL.z * dd, handFromBase.w).normalize();
    const tw = new THREE.Quaternion().slerp(twFull, 0.55);
    setWorldQuat(Lb, qlBase.multiply(tw));
    setWorldQuat(Hb, qh);
  }
  // two-bone leg: ankle to goalW (world), knee toward the character's front (turned by poleTurn), foot along footQW
  solveLeg(s, goalW, footQW, poleTurn = 0) {
    const Lg = this.leg[s];
    const Tb = this.B[`thigh_${s}`], Cb = this.B[`calf_${s}`], Fb = this.B[`foot_${s}`];
    const S = Tb.getWorldPosition(this.tmp.a);
    const d = _v2.subVectors(goalW, S);
    const len = Math.min(d.length(), Lg.l1 + Lg.l2 - 0.0008);
    const dir = d.normalize();
    const a = (Lg.l1 * Lg.l1 - Lg.l2 * Lg.l2 + len * len) / (2 * len);
    const h = Math.sqrt(Math.max(0, Lg.l1 * Lg.l1 - a * a));
    this.root.getWorldQuaternion(_q3);
    const hingeW = this.tmp.b.copy(Lg.hinge).applyQuaternion(_q3);
    if (poleTurn) hingeW.applyAxisAngle(dir, poleTurn);
    const fwd = this.tmp.c.crossVectors(hingeW, dir).normalize();
    const E = this.tmp.d.copy(S).addScaledVector(dir, a).addScaledVector(fwd, h);
    const u = this.tmp.u.subVectors(E, S).normalize();
    const l = this.tmp.l.subVectors(goalW, E).normalize();
    const hg = this.tmp.hg.crossVectors(u, l);
    if (hg.lengthSq() < 1e-8 || hg.dot(hingeW) < 0) hg.copy(hingeW);
    hg.normalize();
    setWorldQuat(Tb, basis(u, hg, _q).multiply(Lg.tLocal));
    setWorldQuat(Cb, basis(l, hg, _q).multiply(Lg.cLocal));
    setWorldQuat(Fb, footQW);
  }
  // the head's forward and the eye ray: how far (degrees) the face is turned from the camera
  faceAngle(camPos) {
    const hb = this.B.head;
    if (!this._headFwd) this._headFwd = V3(0, 0, 1).applyQuaternion(this.rest.head.wq.clone().invert());
    const f = _v.copy(this._headFwd).applyQuaternion(hb.getWorldQuaternion(_q));
    const hp = hb.getWorldPosition(_v2);
    const c = _v3.subVectors(camPos, hp).normalize();
    return THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(f.dot(c), -1, 1)));
  }
}

// how hollow the surface is at each vertex (0..1, positive = hollow), smoothed over the mesh
export function curvature(g) {
  const pos = g.attributes.position, nor = g.attributes.normal;
  const n = pos.count;
  const curv = new Float32Array(n);
  const idx = g.index ? g.index.array : null;
  if (!idx) return curv;
  const sum = new Float32Array(n), cnt = new Float32Array(n), len = new Float32Array(n);
  const px = pos.array, nx = nor.array;
  const edge = (i, j) => {
    const dx = px[j * 3] - px[i * 3], dy = px[j * 3 + 1] - px[i * 3 + 1], dz = px[j * 3 + 2] - px[i * 3 + 2];
    sum[i] += dx * nx[i * 3] + dy * nx[i * 3 + 1] + dz * nx[i * 3 + 2];
    len[i] += Math.sqrt(dx * dx + dy * dy + dz * dz); cnt[i]++;
  };
  for (let t = 0; t < idx.length; t += 3) {
    const i0 = idx[t], i1 = idx[t + 1], i2 = idx[t + 2];
    edge(i0, i1); edge(i1, i0); edge(i1, i2); edge(i2, i1); edge(i2, i0); edge(i0, i2);
  }
  for (let i = 0; i < n; i++) curv[i] = cnt[i] ? (sum[i] / cnt[i]) / Math.max(1e-5, len[i] / cnt[i]) : 0;
  for (let pass = 0; pass < 3; pass++) {
    const acc = new Float32Array(n), c2 = new Float32Array(n);
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      acc[a] += curv[b] + curv[c]; acc[b] += curv[a] + curv[c]; acc[c] += curv[a] + curv[b];
      c2[a] += 2; c2[b] += 2; c2[c] += 2;
    }
    for (let i = 0; i < n; i++) curv[i] = c2[i] ? curv[i] * 0.4 + 0.6 * acc[i] / c2[i] : curv[i];
  }
  for (let i = 0; i < n; i++) curv[i] = THREE.MathUtils.clamp(curv[i] * 4.0, 0, 1);
  return curv;
}

// ---------------------------------------------------------------- cloth stepping (shared)
// nodes follow their anchors (model space -> world by the model matrix); extra forces come from `force(node, out)`;
// `collide(node)` pushes a node out of whatever it must not enter. Writes offsets into own.uCloth.
// The nodes live in the person's own frame (the root): walking at an even pace does not leave the cloth behind; only
// changes of speed swing it (a share of the root's acceleration), plus the breeze and whatever pushes it.
const _cq = new THREE.Quaternion(), _cqi = new THREE.Quaternion(), _cw = new THREE.Vector3(), _cvw = new THREE.Vector3(), _acc = new THREE.Vector3();
export function stepCloth(person, dt, t, { force, collide, sub = 1 / 60, inertia = 0.35 } = {}) {
  const C = person.cloth;
  if (!C.nodes.length) return;
  const R = person.root.matrixWorld;
  const Ri = _m.copy(R).invert();
  person.root.getWorldQuaternion(_cq);
  _cqi.copy(_cq).invert();
  const steps = Math.max(1, Math.ceil(dt / sub - 1e-6));
  const h = Math.min(dt, 0.05) / steps;
  // the root's velocity, smoothed (its position steps with the drawings), and its change: the swing
  C.rootP ??= new THREE.Vector3(); C.rootV ??= new THREE.Vector3(); C.rootVs ??= new THREE.Vector3();
  const rp = _cw.setFromMatrixPosition(R);
  if (!C.init) { C.rootP.copy(rp); C.rootV.set(0, 0, 0); C.rootVs.set(0, 0, 0); }
  const vNow = _cvw.subVectors(rp, C.rootP).divideScalar(Math.max(dt, 1e-4));
  C.rootP.copy(rp);
  const k = 1 - Math.exp(-Math.max(dt, 1e-4) / 0.3);
  const vPrev = _acc.copy(C.rootVs);
  C.rootVs.lerp(vNow, k);
  _acc.subVectors(C.rootVs, vPrev).divideScalar(Math.max(dt, 1e-4)).applyQuaternion(_cqi).multiplyScalar(-inertia);
  for (const n of C.nodes) n.t.copy(n.rl);
  if (!C.init) { for (const n of C.nodes) { n.p.copy(n.t); n.v.set(0, 0, 0); } C.init = true; }
  for (let s = 0; s < steps; s++) {
    for (const n of C.nodes) {
      if (n.stiff > 1e6) { n.p.copy(n.t); n.v.set(0, 0, 0); continue; }
      const kk = n.stiff, c = 2 * Math.sqrt(kk) * n.damp;
      _v.set(0, 0, 0);
      if (force) { force(n, _v, t); _v.applyQuaternion(_cqi); }
      _v.addScaledVector(_acc, n.tv);
      _v2.subVectors(n.t, n.p).multiplyScalar(kk).addScaledVector(n.v, -c);
      _v.add(_v2);
      n.v.addScaledVector(_v, h);
      n.p.addScaledVector(n.v, h);
      _v.subVectors(n.p, n.t);
      const lim = 0.09 * n.tv + 0.004;
      if (_v.lengthSq() > lim * lim) { _v.setLength(lim); n.p.copy(n.t).add(_v); }
    }
    // neighbours share their offsets a little (the cloth moves as one sheet), then nothing may stay inside a body
    for (const g of C.grids) {
      const N = g.nodes;
      if (!g.tmp) g.tmp = N.map(() => new THREE.Vector3());
      for (let j = 1; j < g.nv; j++) for (let k = 0; k < g.nu; k++) {
        const i = j * g.nu + k, n = N[i];
        const kl = k > 0 ? k - 1 : g.wrap ? g.nu - 1 : k, kr = k < g.nu - 1 ? k + 1 : g.wrap ? 0 : k;
        const up = N[i - g.nu], l = N[j * g.nu + kl], r = N[j * g.nu + kr];
        g.tmp[i].subVectors(n.p, n.t).multiplyScalar(0.6)
          .addScaledVector(_v.subVectors(up.p, up.t), 0.14).addScaledVector(_v.subVectors(l.p, l.t), 0.13).addScaledVector(_v.subVectors(r.p, r.t), 0.13);
      }
      for (let j = 1; j < g.nv; j++) for (let k = 0; k < g.nu; k++) { const i = j * g.nu + k; N[i].p.copy(N[i].t).add(g.tmp[i]); }
    }
    if (collide) for (const n of C.nodes) {
      if (n.stiff > 1e6) continue;
      _cw.copy(n.p).applyMatrix4(R);
      _cvw.copy(n.v).applyQuaternion(_cq);
      if (collide(n, _cw, _cvw)) {
        n.p.copy(_cw).applyMatrix4(Ri);
        n.v.copy(_cvw).applyQuaternion(_cqi);
      }
    }
  }
  const off = person.own.uCloth.value;
  for (const n of C.nodes) off[n.id].subVectors(n.p, n.t).applyQuaternion(_cq);
}
