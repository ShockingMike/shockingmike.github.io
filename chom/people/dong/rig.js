// Chớm, mùa Đông: one winter person as a set of bones that can be posed (the MakeHuman GameEngine rig, 53 bones).
// Came from people-test/khach.js (the spring customer): two-bone arms and legs that reach their goals, fingers that curl
// by presets, a fist that fits what it holds. New here: every drawing of the loop is posed once at load and kept, so at
// run time a new drawing is only a copy of 53 rotations (twelve times a second); spread fingers; hand anchors (grip, pinch,
// palm); goals may be functions of the frame (the corn cob the seller turns).
//
//   const a = new Actor({ asset, at, faceTo, keys, loop, fingers })
//   a.root                 the group placed in the world (the person faces +z of it; her left is +x)
//   a.bake()               poses every drawing (on twos) and keeps it
//   a.show(t)              puts drawing(t) on the bones; returns true when it changed
//   a.poseAt(t)            the same without the cache (checks)
import * as THREE from 'three';

export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const n3 = (x, y, z) => V3(x, y, z).normalize();
export const FPS = 24, STEP = 2;
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3();
const FINGER_NAMES = ['index', 'middle', 'ring', 'pinky', 'thumb'];

export const basis = (x, y) => {
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

// spacing: how the move into a key is shared out over its frames (never an even glide)
export const EASE = {
  in: (u) => u * u * u,
  out: (u) => 1 - Math.pow(1 - u, 3),
  inout: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  snap: (u) => 1 - Math.pow(1 - u, 4.5),
  hold: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  lin: (u) => u,
};

// finger presets: curl per joint (radians), thumb opposition, and spread (sideways, + = away from the middle finger)
export const FINGERS = {
  relax: { index: [0.25, 0.35, 0.25], middle: [0.32, 0.42, 0.28], ring: [0.4, 0.47, 0.3], pinky: [0.46, 0.5, 0.32], thumb: [0.1, 0.2, 0.15], oppose: 0.2, spread: [0.02, 0, 0.03, 0.06, 0] },
  spread: { index: [0.05, 0.1, 0.08], middle: [0.06, 0.12, 0.08], ring: [0.1, 0.14, 0.1], pinky: [0.14, 0.16, 0.1], thumb: [-0.1, 0.05, 0.05], oppose: -0.15, spread: [0.2, 0.03, 0.14, 0.3, 0.25] },
  warm: { index: [0.14, 0.22, 0.14], middle: [0.16, 0.24, 0.16], ring: [0.22, 0.28, 0.18], pinky: [0.28, 0.3, 0.2], thumb: [0.0, 0.1, 0.08], oppose: 0.0, spread: [0.12, 0.02, 0.1, 0.22, 0.12] },
  flat: { index: [0.04, 0.06, 0.04], middle: [0.04, 0.06, 0.04], ring: [0.05, 0.06, 0.04], pinky: [0.06, 0.08, 0.05], thumb: [0.05, 0.1, 0.1], oppose: 0.35, spread: [-0.03, 0, -0.03, -0.05, 0] },
  cup: { index: [0.35, 0.45, 0.3], middle: [0.38, 0.48, 0.32], ring: [0.42, 0.5, 0.34], pinky: [0.46, 0.52, 0.34], thumb: [0.3, 0.3, 0.2], oppose: 0.7, spread: [-0.04, 0, -0.04, -0.06, 0] },
  grip: { index: [1.05, 1.15, 0.7], middle: [1.15, 1.2, 0.75], ring: [1.2, 1.2, 0.75], pinky: [1.25, 1.15, 0.7], thumb: [0.28, 0.4, 0.28], oppose: 0.6, spread: [0, 0, 0, 0, 0] },
  pinch: { index: [0.55, 0.65, 0.45], middle: [0.7, 0.75, 0.5], ring: [1.1, 1.15, 0.75], pinky: [1.15, 1.15, 0.75], thumb: [0.35, 0.35, 0.25], oppose: 0.95, spread: [0, 0, 0, 0, 0] },
  open: { index: [0.2, 0.28, 0.2], middle: [0.24, 0.3, 0.22], ring: [0.3, 0.34, 0.24], pinky: [0.36, 0.38, 0.26], thumb: [-0.12, -0.05, 0.0], oppose: 0.45, spread: [0.06, 0, 0.05, 0.1, 0.05] },
  cover: { index: [0.45, 0.5, 0.3], middle: [0.48, 0.52, 0.32], ring: [0.52, 0.55, 0.34], pinky: [0.56, 0.56, 0.34], thumb: [0.05, 0.12, 0.1], oppose: 0.3, spread: [-0.03, 0, -0.03, -0.04, 0] },
  point: { index: [0.1, 0.12, 0.08], middle: [0.9, 1.0, 0.6], ring: [1.0, 1.05, 0.65], pinky: [1.05, 1.05, 0.65], thumb: [0.3, 0.35, 0.2], oppose: 0.6, spread: [0.05, 0, 0, 0, 0] },
};
const mixF = (a, b, u) => {
  const o = {};
  for (const f of FINGER_NAMES) o[f] = a[f].map((x, k) => x + (b[f][k] - x) * u);
  o.oppose = a.oppose + (b.oppose - a.oppose) * u;
  o.spread = a.spread.map((x, k) => x + (b.spread[k] - x) * u);
  return o;
};

export class Actor {
  constructor({ name, asset, at, faceTo, loop = 6, keys = [], extra = null, yaw = 0 }) {
    this.name = name;
    this.meta = asset.meta;
    this.loop = loop;
    this.keys = keys;
    this.extra = extra;          // extra(actor, frame, u-state) after the body is posed: props, custom goals
    const root = (this.root = new THREE.Group());
    root.name = name;
    const model = (this.model = asset.gltf.scene);
    root.add(model);
    root.position.copy(at);
    root.rotation.y = Math.atan2(faceTo.x - at.x, faceTo.z - at.z) + yaw;
    root.updateMatrixWorld(true);
    const parts = [];
    model.traverse((o) => { if (o.isSkinnedMesh) parts.push(o); });
    this.parts = parts;
    const canon = parts[0].skeleton;
    this.bones = canon.bones;
    this.boneInverses = canon.boneInverses;
    this.B = Object.fromEntries(this.bones.map((b) => [b.name, b]));
    this.boneIndex = Object.fromEntries(this.bones.map((b, i) => [b.name, i]));
    this.rest = this.restData();
    this.P = (n) => this.rest[n].wp.clone();
    this.rootQ = root.getWorldQuaternion(new THREE.Quaternion());
    this.setupHands();
    this.setupLimbs();
    this.M = { bend: { l: 0, r: 0 }, raise: { l: 0, r: 0 }, reach: { l: 0, r: 0 }, fwd: 0, twist: 0, hunch: 0 };
    this.cache = null;
    this.cur = -1;
  }

  restData() {
    const R = {};
    const root = this.root;
    root.updateMatrixWorld(true);
    const inv = root.matrixWorld.clone().invert();
    const rq = root.getWorldQuaternion(new THREE.Quaternion()).invert();
    for (const b of this.bones) {
      R[b.name] = {
        bone: b,
        local: b.quaternion.clone(),
        pos: b.position.clone(),
        wq: rq.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())),
        wp: b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv),
      };
    }
    return R;
  }
  // character space <-> world
  W(p) { return this.root.localToWorld(p.clone()); }
  Wd(d) { return d.clone().applyQuaternion(this.rootQ); }
  L(p) { return this.root.worldToLocal(p.clone()); }
  Ld(d) { return d.clone().applyQuaternion(this.rootQ.clone().invert()); }
  wp(n, out = new THREE.Vector3()) { return this.B[n].getWorldPosition(out); }

  setupHands() {
    const P = this.P, rest = this.rest;
    this.hand = {};
    for (const s of ['l', 'r']) {
      const h = rest[`hand_${s}`];
      const across = P(`pinky_01_${s}`).sub(P(`index_01_${s}`)).normalize();
      const fwd = P(`middle_01_${s}`).sub(h.wp).normalize();
      const palm = new THREE.Vector3().crossVectors(fwd, across).normalize();
      const bend = P(`middle_03_${s}`).sub(P(`middle_01_${s}`)).normalize().addScaledVector(fwd, -1);
      if (bend.dot(palm) < 0) palm.negate();
      const inv = h.wq.clone().invert();
      const f0 = fwd.clone().applyQuaternion(inv), p0 = palm.clone().applyQuaternion(inv);
      const a0 = across.clone().applyQuaternion(inv);
      const toHand = (w) => w.clone().sub(h.wp).applyQuaternion(inv);
      // anchors in hand space: the fist's hole (refined by fitGrip), the palm's centre (a little off the skin), the pinch
      const grip = toHand(h.wp.clone().lerp(P(`middle_01_${s}`), 0.85).addScaledVector(palm, 0.028).addScaledVector(across, 0.012));
      const palmC = toHand(h.wp.clone().lerp(P(`middle_01_${s}`), 0.55));
      const pinch = toHand(P(`index_03_${s}`).lerp(P(`thumb_03_${s}`), 0.5).addScaledVector(palm, 0.01));
      const fingers = {};
      for (const f of FINGER_NAMES) {
        fingers[f] = [1, 2, 3].map((k) => {
          const n = `${f}_0${k}_${s}`;
          const a = P(n);
          const next = k < 3 ? P(`${f}_0${k + 1}_${s}`) : a.clone().add(a.clone().sub(P(`${f}_0${k - 1}_${s}`)));
          const d = next.sub(a).normalize();
          let ax;
          if (f === 'thumb') ax = new THREE.Vector3().crossVectors(d, palm).normalize().lerp(fwd, 0.35).normalize();
          else ax = new THREE.Vector3().crossVectors(d, palm).normalize();
          const rq = rest[n].wq.clone().invert();
          return { n, axis: ax.applyQuaternion(rq), spreadAxis: palm.clone().applyQuaternion(rq) };
        });
      }
      this.hand[s] = { f0, p0, a0, grip, palmC, pinch, fingers, restHandQ: basis(f0, p0), gripAmt: 1 };
    }
  }

  setupLimbs() {
    const rest = this.rest;
    this.arm = {};
    for (const s of ['l', 'r']) {
      const U = rest[`upperarm_${s}`], L = rest[`lowerarm_${s}`], H = rest[`hand_${s}`];
      const u0 = L.wp.clone().sub(U.wp), l0 = H.wp.clone().sub(L.wp);
      let hinge = new THREE.Vector3().crossVectors(u0, l0);
      if (hinge.lengthSq() < 1e-8) hinge = V3(s === 'l' ? 1 : -1, 0, 0).cross(u0);
      hinge.normalize();
      this.arm[s] = {
        l1: u0.length(), l2: l0.length(),
        uLocal: basis(u0.clone().applyQuaternion(U.wq.clone().invert()), hinge.clone().applyQuaternion(U.wq.clone().invert())),
        lLocal: basis(l0.clone().applyQuaternion(L.wq.clone().invert()), hinge.clone().applyQuaternion(L.wq.clone().invert())),
      };
    }
    this.leg = {};
    for (const s of ['l', 'r']) {
      const T = rest[`thigh_${s}`], C = rest[`calf_${s}`], F = rest[`foot_${s}`];
      const t0 = C.wp.clone().sub(T.wp), c0 = F.wp.clone().sub(C.wp);
      const hinge = new THREE.Vector3().crossVectors(t0, c0);
      if (hinge.lengthSq() < 1e-8) hinge.set(1, 0, 0);
      hinge.normalize();
      // the knee's side of the hip-ankle line
      const knee = C.wp.clone().sub(T.wp);
      const la = F.wp.clone().sub(T.wp).normalize();
      const kdir = knee.addScaledVector(la, -knee.dot(la)).normalize();
      this.leg[s] = {
        l1: t0.length(), l2: c0.length(), hinge, kdir,
        tLocal: basis(t0.clone().applyQuaternion(T.wq.clone().invert()), hinge.clone().applyQuaternion(T.wq.clone().invert())),
        cLocal: basis(c0.clone().applyQuaternion(C.wq.clone().invert()), hinge.clone().applyQuaternion(C.wq.clone().invert())),
        ankle: F.wp.clone(), footQ: F.wq.clone(),
      };
    }
  }

  resetPose() {
    for (const b of this.bones) { b.quaternion.copy(this.rest[b.name].local); }
    this.model.position.set(0, 0, 0);
    this.root.updateMatrixWorld(true);
  }
  // a delta in character space (x: bend forward, y: turn to her left, z: lean to her right)
  rotateBone(name, e, order = 'YXZ') {
    if (!e || (e[0] === 0 && e[1] === 0 && e[2] === 0)) return;
    const b = this.B[name];
    const cq = this.rootQ;
    _q.setFromEuler(new THREE.Euler(e[0], e[1], e[2], order));
    const qd = cq.clone().multiply(_q).multiply(cq.clone().invert());
    b.getWorldQuaternion(_q2);
    setWorldQuat(b, qd.multiply(_q2));
  }
  curl(s, F, amt = 1) {
    const H = this.hand[s];
    for (let fi = 0; fi < 5; fi++) {
      const f = FINGER_NAMES[fi];
      H.fingers[f].forEach((seg, k) => {
        const b = this.B[seg.n];
        _q.setFromAxisAngle(seg.axis, F[f][k] * amt);
        b.quaternion.copy(this.rest[seg.n].local).multiply(_q);
        if (k === 0 && F.spread) {
          const sp = F.spread[fi] * (fi === 0 ? 1 : fi === 1 ? 0 : -1) * (s === 'l' ? -1 : 1);
          if (f !== 'thumb' && sp) b.quaternion.multiply(_q2.setFromAxisAngle(seg.spreadAxis, sp));
        }
        if (f === 'thumb' && k === 0) {
          const ax = H.f0.clone().applyQuaternion(this.rest[`hand_${s}`].wq).applyQuaternion(this.rest[seg.n].wq.clone().invert());
          b.quaternion.multiply(_q2.setFromAxisAngle(ax, (s === 'l' ? -1 : 1) * (F.oppose * 0.6 - (F.spread ? F.spread[4] * 0.5 : 0))));
        }
      });
    }
  }
  fingers(s, spec) {
    // spec: a preset name, or [name, name2, u]
    if (typeof spec === 'string') { this.curl(s, FINGERS[spec], spec === 'grip' ? this.hand[s].gripAmt : 1); return; }
    const [a, b, u] = spec;
    this.curl(s, mixF(FINGERS[a], FINGERS[b], u), 1);
  }

  solveLeg(s, ankleW = null) {
    const Lg = this.leg[s];
    const T = this.B[`thigh_${s}`], C = this.B[`calf_${s}`], F = this.B[`foot_${s}`];
    const S = T.getWorldPosition(new THREE.Vector3());
    const goal = ankleW ?? this.W(Lg.ankle);
    const d = goal.clone().sub(S);
    const len = Math.min(d.length(), Lg.l1 + Lg.l2 - 0.0005);
    const dir = d.normalize();
    const a = (Lg.l1 * Lg.l1 - Lg.l2 * Lg.l2 + len * len) / (2 * len);
    const h = Math.sqrt(Math.max(0, Lg.l1 * Lg.l1 - a * a));
    const kd = this.Wd(Lg.kdir);
    const perp = kd.addScaledVector(dir, -kd.dot(dir)).normalize();
    const E = S.clone().addScaledVector(dir, a).addScaledVector(perp, h);
    const u = E.clone().sub(S).normalize(), l = goal.clone().sub(E).normalize();
    const hingeW = this.Wd(Lg.hinge);
    let hg = new THREE.Vector3().crossVectors(u, l);
    if (hg.lengthSq() < 1e-8 || hg.dot(hingeW) < 0) hg.copy(hingeW);
    hg.normalize();
    setWorldQuat(T, basis(u, hg).multiply(Lg.tLocal.clone().invert()));
    setWorldQuat(C, basis(l, hg).multiply(Lg.cLocal.clone().invert()));
    setWorldQuat(F, this.rootQ.clone().multiply(Lg.footQ));
  }

  // anchor: 'grip' | 'palm' | 'pinch' | a Vector3 in hand space
  solveArm(s, goalW, fwdW, palmW, poleW, anchor = 'grip') {
    const U = this.B[`upperarm_${s}`], L = this.B[`lowerarm_${s}`], Hb = this.B[`hand_${s}`];
    const A = this.arm[s], Hd = this.hand[s];
    const qh = basis(fwdW, palmW).multiply(Hd.restHandQ.clone().invert());
    const anc = anchor.isVector3 ? anchor : anchor === 'palm' ? Hd.palmC : anchor === 'pinch' ? Hd.pinch : Hd.grip;
    const off = anc.clone().applyQuaternion(qh);
    const T = goalW.clone().sub(off);
    const S = U.getWorldPosition(new THREE.Vector3());
    const d = T.clone().sub(S);
    let len = d.length();
    const dir = d.clone().normalize();
    len = Math.min(Math.max(len, Math.abs(A.l1 - A.l2) + 0.01), A.l1 + A.l2 - 0.004);
    this.reachShort = Math.max(this.reachShort ?? 0, d.length() - len);
    const a = (A.l1 * A.l1 - A.l2 * A.l2 + len * len) / (2 * len);
    const h = Math.sqrt(Math.max(0, A.l1 * A.l1 - a * a));
    const perp = poleW.clone().addScaledVector(dir, -poleW.dot(dir)).normalize();
    const E = S.clone().addScaledVector(dir, a).addScaledVector(perp, h);
    const Wr = S.clone().addScaledVector(dir, len);
    const u = E.clone().sub(S).normalize(), l = Wr.clone().sub(E).normalize();
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
    return Wr;
  }

  // the fist's real hole for a round handle of radius r: the tightest curl that still leaves it room
  fitGrip(s, r = 0.006, amts = [1.35, 1.2, 1.05, 0.92, 0.8, 0.68]) {
    const hb = this.B[`hand_${s}`];
    const Hd = this.hand[s];
    const across = new THREE.Vector3().crossVectors(Hd.f0, Hd.p0).normalize();
    let chosen = null;
    for (const amt of amts) {
      this.resetPose();
      this.curl(s, FINGERS.grip, amt);
      this.root.updateMatrixWorld(true);
      const pts = [];
      for (const f of FINGER_NAMES) {
        const j = [1, 2, 3].map((q) => hb.worldToLocal(this.B[`${f}_0${q}_${s}`].getWorldPosition(new THREE.Vector3())));
        pts.push(...j, j[2].clone().add(j[2].clone().sub(j[1]).multiplyScalar(0.85)), j[0].clone().lerp(j[1], 0.5), j[1].clone().lerp(j[2], 0.5));
      }
      const knuck = hb.worldToLocal(this.B[`middle_01_${s}`].getWorldPosition(new THREE.Vector3()));
      for (let q = 0; q <= 4; q++) for (let a = -2; a <= 2; a++) pts.push(knuck.clone().multiplyScalar(q / 4).addScaledVector(Hd.p0, 0.011).addScaledVector(across, a * 0.018));
      const flat = pts.map((q) => [q.dot(Hd.p0), q.dot(Hd.f0)]).sort((u, v) => u[0] - v[0] || u[1] - v[1]);
      const cr = (o, u, v) => (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0]);
      const lo = [], hi = [];
      for (const q of flat) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
      for (const q of flat.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
      const hull = lo.slice(0, -1).concat(hi.slice(0, -1));
      const inside = (x, y) => hull.every((q, i) => cr(q, hull[(i + 1) % hull.length], [x, y]) >= 0);
      const flatP = pts.map((p) => [p.dot(Hd.p0), p.dot(Hd.f0)]);
      let best = null;
      const xs = hull.map((q) => q[0]), ys = hull.map((q) => q[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      for (let a = x0; a <= x1; a += 0.0025) for (let b = y0; b <= y1; b += 0.0025) {
        if (!inside(a, b)) continue;
        let m = 9;
        for (const [px, py] of flatP) {
          const d = Math.hypot(px - a, py - b);
          if (d < m) { m = d; if (m < (best ? best.m : 0)) break; }
        }
        if (!best || m > best.m) best = { m, a, b };
      }
      if (!best) continue;
      chosen = { amt, ...best };
      if (best.m >= r + 0.0085) break;
    }
    this.resetPose();
    if (!chosen) { console.warn('no fist hole', this.name, s); return; }
    Hd.grip = Hd.p0.clone().multiplyScalar(chosen.a).addScaledVector(Hd.f0, chosen.b).addScaledVector(across, knuckAcross(this, s, Hd, across));
    Hd.gripAmt = chosen.amt;
    Hd.gripClear = chosen.m;
    Hd.gripAxis = across;
  }

  // the pinch between thumb tip and index tip with this preset, in hand space (and how wide it is)
  fitPinch(s, preset = 'pinch') {
    const hb = this.B[`hand_${s}`];
    this.resetPose();
    this.fingers(s, preset);
    this.root.updateMatrixWorld(true);
    const tip = (f) => {
      const j2 = hb.worldToLocal(this.B[`${f}_02_${s}`].getWorldPosition(new THREE.Vector3()));
      const j3 = hb.worldToLocal(this.B[`${f}_03_${s}`].getWorldPosition(new THREE.Vector3()));
      return j3.clone().add(j3.clone().sub(j2).multiplyScalar(0.7));
    };
    const t = tip('thumb'), i = tip('index'), m = tip('middle');
    const pad = i.clone().lerp(m, 0.35);
    // a little toward the fingertips and toward the palm (the hand sits a little off what it pinches), so the curled ring finger stays clear of what is pinched
    this.hand[s].pinch = t.clone().lerp(pad, 0.5).addScaledVector(this.hand[s].f0, 0.008).addScaledVector(this.hand[s].p0, 0.008);
    this.hand[s].pinchGap = t.distanceTo(pad);
    this.resetPose();
  }

  // ---------------------------------------------------------------- posing from the key list
  keyAt(frame) {
    const K = this.keys, n = this.loop * FPS;
    const f = ((frame % n) + n) % n;
    let i = 0;
    while (i < K.length - 2 && K[i + 1].f <= f) i++;
    const a = K[i], b = K[i + 1];
    const u0 = (f - a.f) / Math.max(1e-6, b.f - a.f);
    const u = (EASE[b.ease] ?? EASE.inout)(clamp01(u0));
    return { a, b, u, u0, f };
  }
  pose(frame) {
    const st = this.keyAt(frame);
    const { a, b, u, u0 } = st;
    const L = (k, d = [0, 0, 0]) => {
      const x = a[k] ?? d, y = b[k] ?? d;
      return x.map((v, i) => v + (y[i] - v) * u);
    };
    const drift = b.ease === 'hold' ? Math.sin(u0 * Math.PI) * 0.012 : 0;
    this.reachShort = 0;
    this.resetPose();
    const rootD = L('root');
    this.model.position.set(rootD[0], rootD[1] - drift * 0.1, rootD[2] + drift * 0.2);
    this.model.updateMatrixWorld(true);
    this.rotateBone('pelvis', L('pelvis'));
    for (const s of ['l', 'r']) this.solveLeg(s);
    const sp = L('spine');
    this.rotateBone('spine_01', sp.map((x) => x * 0.3));
    this.rotateBone('spine_02', sp.map((x) => x * 0.35));
    this.rotateBone('spine_03', sp.map((x, i) => x * 0.35 + (i === 0 ? drift * 0.4 : 0)));
    this.rotateBone('clavicle_l', L('clavL'));
    this.rotateBone('clavicle_r', L('clavR'));
    this.rotateBone('neck_01', L('neck'));
    this.rotateBone('head', L('head'));
    this.root.updateMatrixWorld(true);
    for (const s of (this.order ?? ['l', 'r'])) {
      const ka = a[`h${s}`], kb = b[`h${s}`];
      if (!ka && !kb) continue;
      const ga = this.goal(ka ?? kb, a.f, st, s), gb = this.goal(kb ?? ka, b.f, st, s);
      const uh = b[`u${s}`] ? b[`u${s}`](u0) : u;
      const G = {
        p: ga.p.clone().lerp(gb.p, uh),
        fwd: ga.fwd.clone().lerp(gb.fwd, uh).normalize(),
        palm: ga.palm.clone().lerp(gb.palm, uh).normalize(),
        pole: ga.pole.clone().lerp(gb.pole, uh).normalize(),
      };
      // moving hands travel on arcs, not straight lines
      const arc = b[`arc${s}`];
      if (arc) G.p.add(this.Wd(V3(...arc)).multiplyScalar(Math.sin(uh * Math.PI)));
      const anchor = uh < 0.5 ? (ga.anchor ?? 'grip') : (gb.anchor ?? 'grip');
      this.solveArm(s, G.p, G.fwd, G.palm, G.pole, anchor);
      const fa = a[`f${s}`] ?? 'relax', fb = b[`f${s}`] ?? fa;
      const fOver = uh < 0.5 ? (ga.fingers ?? (ka?.fn ? gb.fingers : null)) : (gb.fingers ?? (kb?.fn ? ga.fingers : null));
      if (fOver && (ka?.fn || kb?.fn)) this.fingers(s, fOver);
      else if (fa === fb) this.fingers(s, fa);
      else if (b[`fmix${s}`]) this.fingers(s, [typeof fa === 'string' ? fa : fa[0], typeof fb === 'string' ? fb : fb[0], sm(0.2, 0.8, u)]);
      else this.fingers(s, u < (b[`fswitch${s}`] ?? 0.5) ? fa : fb);
    }
    if (this.extra) this.extra(this, st);
    this.root.updateMatrixWorld(true);
    this.measure();
    return st;
  }
  // a hand goal: { at, fwd, palm, pole (character space), anchor } or { fn(actor, frame, s) -> world goal }
  goal(k, frame, st, s) {
    if (k.fn) return k.fn(this, st.f, s, k);
    return {
      p: this.W(k.at), fwd: this.Wd(k.fwd).normalize(), palm: this.Wd(k.palm).normalize(),
      pole: this.Wd(k.pole ?? V3(s === 'l' ? 1 : -1, -0.5, -0.3)).normalize(), anchor: k.anchor ?? 'grip',
    };
  }

  measure() {
    const M = this.M;
    const up = this.Wd(V3(0, 1, 0)), fw = this.Wd(V3(0, 0, 1)), side = this.Wd(V3(1, 0, 0));
    const neck = this.wp('neck_01'), pel = this.wp('pelvis');
    const down = pel.clone().sub(neck).normalize();
    for (const s of ['l', 'r']) {
      const U = this.wp(`upperarm_${s}`), Lw = this.wp(`lowerarm_${s}`), H = this.wp(`hand_${s}`);
      const u = Lw.clone().sub(U).normalize(), l = H.clone().sub(Lw).normalize();
      M.bend[s] = Math.acos(THREE.MathUtils.clamp(u.dot(l), -1, 1));
      M.raise[s] = Math.acos(THREE.MathUtils.clamp(u.dot(down), -1, 1));
      M.reach[s] = Math.max(0, u.dot(fw));
    }
    const sh = this.wp('upperarm_l').sub(this.wp('upperarm_r'));
    M.twist = Math.atan2(sh.dot(fw), sh.dot(side));
    M.fwd = Math.acos(THREE.MathUtils.clamp(-down.dot(up), -1, 1));
    M.hunch = this.wp('clavicle_l').add(this.wp('clavicle_r')).multiplyScalar(0.5).sub(neck).dot(up);
  }

  // ---------------------------------------------------------------- the drawings, posed once
  // the same, giving the page a turn whenever the current slice of work is used up (Y: await Y(label))
  async bakeAsync(Y) {
    const n = Math.round(this.loop * FPS / STEP);
    const nb = this.bones.length;
    this.cache = { n, q: new Float32Array(n * nb * 4), p: new Float32Array(n * 3), m: [], st: [] };
    for (let i = 0; i < n; i++) {
      const st = this.pose(i * STEP);
      this.bones.forEach((b, k) => b.quaternion.toArray(this.cache.q, (i * nb + k) * 4));
      this.model.position.toArray(this.cache.p, i * 3);
      this.cache.m.push(JSON.parse(JSON.stringify(this.M)));
      this.cache.st.push({ f: st.f, a: st.a.name, b: st.b.name, u: st.u, short: this.reachShort });
      await Y('bake');
    }
    this.cur = -1;
  }
  bake() {
    const n = Math.round(this.loop * FPS / STEP);
    const nb = this.bones.length;
    this.cache = { n, q: new Float32Array(n * nb * 4), p: new Float32Array(n * 3), m: [], st: [] };
    for (let i = 0; i < n; i++) {
      const st = this.pose(i * STEP);
      this.bones.forEach((b, k) => b.quaternion.toArray(this.cache.q, (i * nb + k) * 4));
      this.model.position.toArray(this.cache.p, i * 3);
      this.cache.m.push(JSON.parse(JSON.stringify(this.M)));
      this.cache.st.push({ f: st.f, a: st.a.name, b: st.b.name, u: st.u, short: this.reachShort });
    }
    this.cur = -1;
  }
  drawingOf(t) {
    const n = this.cache.n;
    return ((Math.floor((t * FPS) / STEP) % n) + n) % n;
  }
  show(t) { return this.showDrawing(this.drawingOf(t)); }
  showDrawing(i, silent = false) {
    if (i === this.cur) return false;
    this.cur = i;
    const nb = this.bones.length, q = this.cache.q;
    for (let k = 0; k < nb; k++) { const o = (i * nb + k) * 4; this.bones[k].quaternion.set(q[o], q[o + 1], q[o + 2], q[o + 3]); }
    this.model.position.fromArray(this.cache.p, i * 3);
    Object.assign(this.M, this.cache.m[i]);
    this.root.updateMatrixWorld(true);
    if (this.onShow && !silent) this.onShow(this);
    return true;
  }
  poseAt(t) { this.cur = -1; return this.show(t); }
}

function knuckAcross(actor, s, Hd, across) {
  const hb = actor.B[`hand_${s}`];
  return hb.worldToLocal(actor.B[`middle_01_${s}`].getWorldPosition(new THREE.Vector3())).dot(across);
}
