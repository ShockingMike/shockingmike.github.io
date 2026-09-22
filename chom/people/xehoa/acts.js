// Chớm people, autumn (people/xehoa): the acting. One clock (a 36 s loop) for the flower seller and the girl.
//
//   0.0 – 4.1   the girl walks in from behind the eye along the pavement and stops by the tray; the seller is tidying her flowers
//   4.1 – 7.8   the girl points at a bunch; the seller offers with an open hand, turns to the tray, pulls the bunch out
//   7.8 – 9.4   the seller holds it out; the girl takes it with both hands
//   9.4 – 11.8  the girl smells it (the flowers hide her face), tucks it into her left arm
//  11.8 – 15.0  she opens her bag, takes a note, holds it out; the seller takes it and tucks it into her waist pouch
//  15.0 – 16.8  the girl closes her bag, hugs the bunch, nods, turns away; the seller nods back
//  16.8 – 29.5  the girl walks away past the tail of the bike, in front of the tea stall and into the lane (out of sight ~28.7)
//  16.8 – 29.0  the seller tidies the tray, looks down the street, waits
//  29.3 – 33.0  (the girl gone) the seller pulls a new bunch from under the newsprint and lays it in the empty place
//  33.0 – 36.0  the seller settles back into the pose the loop starts with
//
// Everyone is posed on twos (a new drawing every 1/12 s). Hands that take something reach for where it really is.
import * as THREE from 'three';
import { V3, clamp01, sm, FPS, STEP, basis } from './rig.js';
import { BUNCH_HOLD, BUNCH_HOLD_LOW, BUNCH_LEN } from './bike.js';

export const LOOP = 36;
export const NOTE = { w: 0.075, h: 0.062 };
// the marks (world, agreed with the season): where each stands, where things change hands, where the girl comes in from
// EX: where the bunch changes hands. It sits a hair toward the eye of the tray's edge, so the heads of the bunch stand
// against the dark shop front and not in the flowers heaped behind them (and clear of her hair and of the seller's hat).
export const MARKS = { seller: [2.05, 0, -2.52], girl: [1.1, 0, -2.5], EX: [1.46, 1.03, -2.64], EXN: [1.58, 1.06, -2.62] };
// the girl's way in: along the house-side pavement (its lane x 2.9-4.4), then across behind the seller to her mark
export const GIRL_IN = [[3.4, 0, 1.2], [3.4, 0, -0.5], [2.5, 0, -1.45], [1.6, 0, -2.05]];
// the way out, only used when the page gives no peopleLayout.girlPath (the season's path is the one that counts)
export const GIRL_OUT = [[1.05, 0, -3.0], [1.05, 0, -3.9], [3.0, 0, -5.2], [3.0, 0, -7.0], [3.2, 0, -12.2], [4.35, 0, -12.62], [5.45, 0, -13.22], [6.9, 0, -13.3]];
// a hand hanging at the side, in body space: under the shoulder, a little forward
const hang = (person, s, dx = 0, dz = 0.06, lift = 0) => {
  const sh = person.P(`upperarm_${s}`), A = person.arm[s];
  const sx = s === 'l' ? 1 : -1;
  const side = Math.max(Math.abs(sh.x) + 0.03, person.hangX ?? 0.25);
  return [sx * (side + dx), sh.y - (A.l1 + A.l2) * 0.93 - 0.06 + lift, sh.z + dz];
};
export const NOTE_OFF = 0.035;
const BUNCH_SIDE = 0.25, BUNCH_SIDE2 = 0.16;
// hold variants: 'hi', 'lo', 'loN' (a fist round the cone), 'side', 'side2' (an open hand on the cone's -z side, palm along +z),
// 'sideF', 'side2F' (the same on the +z side, palm along -z)
const isSide = (v) => v.startsWith('side');
const isHi = (v) => v === 'hi' || v === 'hiF';
const alongOf = (v) => (isHi(v) ? BUNCH_HOLD : v.startsWith('side2') ? BUNCH_SIDE2 : isSide(v) ? BUNCH_SIDE : BUNCH_HOLD_LOW);
const coneAt = (y) => (y < 0.011 ? 0.011 : 0.014 + 0.054 * Math.min(1, (y - 0.011) / 0.242));
const D = Math.PI / 180;
const _zAxis = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4();

// spacing: how a move shares out its frames (never an even glide)
export const EASE = {
  in: (u) => u * u * u,
  out: (u) => 1 - Math.pow(1 - u, 3),
  inout: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  snap: (u) => 1 - Math.pow(1 - u, 4.5),
  hold: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  lin: (u) => u,
};
const lerpA = (a, b, u) => a.map((x, i) => x + ((b ? b[i] : 0) - x) * u);
const Z3 = [0, 0, 0];
// the two keys around time t in a list sorted by t; the move into b is spaced by b.ease
function around(keys, t) {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t <= t) i++;
  const a = keys[i], b = keys[i + 1];
  const u0 = clamp01((t - a.t) / Math.max(1e-6, b.t - a.t));
  return { a, b, u0, u: (EASE[b.ease] || EASE.inout)(u0) };
}
function field(keys, t, name, dflt = Z3) {
  const { a, b, u } = around(keys, t);
  return lerpA(a[name] ?? dflt, b[name] ?? dflt, u);
}

// ---------------------------------------------------------------- props that change hands
// owner: 'world' (a fixed matrix) or a hand of a person, with a fixed hold relation to that hand
export class Prop {
  constructor(obj, { hold = BUNCH_HOLD, kind = 'bunch' } = {}) {
    this.obj = obj; this.kind = kind; this.hold = hold;
    this.owner = null;
    this.world = new THREE.Matrix4();
    obj.matrixAutoUpdate = false;
  }
  setWorld(p, q) { this.owner = null; this.world.compose(p, q, V3(1, 1, 1)); this.apply(); }
  apply() { this.obj.matrix.copy(this.world); this.obj.matrixWorldNeedsUpdate = true; this.obj.updateMatrixWorld(true); }
  // where a hand must be to hold it (world): { p, fwd, palm }
  handGoal(person, s, out, v = 'hi') {
    const rel = holdRel(person, s, this.kind, this.kind === 'note' ? 'hi' : v);
    const qp = _q.setFromRotationMatrix(_m.extractRotation(this.world));
    // a note taken by its other end: the same note turned half round its face normal
    if (this.kind === 'note' && v === 'other') qp.multiply(_q2.setFromAxisAngle(_zAxis, Math.PI));
    const qh = qp.multiply(_q2.copy(rel.q).invert());
    out.fwd.copy(person.hand[s].f0).applyQuaternion(qh);
    out.palm.copy(person.hand[s].p0).applyQuaternion(qh);
    const along = alongOf(v);
    out.p.set(0, this.kind === 'note' ? 0 : along, 0).applyMatrix4(this.world);
    if (this.kind === 'note') out.p.set(v === 'other' ? NOTE_OFF : -NOTE_OFF, 0, 0).applyMatrix4(this.world);
    const sided = isSide(v);
    out.point = this.kind === 'note' ? 'pinch' : isHi(v) ? 'wrapHi' : sided ? 'palmC' : 'wrapLo';
    if (sided) out.p.addScaledVector(out.palm, -(coneAt(along) + 0.014));
    return out;
  }
  // follow a hand (after it is posed)
  follow(person, s, v = 'hi') {
    const rel = holdRel(person, s, this.kind, this.kind === 'note' ? 'hi' : v);
    const hb = person.B[`hand_${s}`];
    this.world.multiplyMatrices(hb.matrixWorld, rel.m);
    this.apply();
  }
}
// the fixed relation of a held thing to the hand bone (hand space): bunch in a fist (heads out of the thumb side),
// note pinched between the fingers (long edge along the fingers)
// variants: 'hi' holds the cone high, palm along the bunch's +z; 'lo' holds it low, palm the other way (a second hand);
// 'loN' holds it low, palm along +z
function holdRel(person, s, kind, v = 'hi') {
  const key = `${kind}_${s}_${v}`;
  person.holdCache ??= {};
  if (person.holdCache[key]) return person.holdCache[key];
  const H = person.hand[s];
  const rest = person.rest;
  let q, pOrigin;
  if (kind === 'note') {
    // pinched between the thumb and index pads: the note runs on past the fingertips, its width along the thumb side
    q = basis(H.f0, person.thumbSide(s), new THREE.Quaternion());
    pOrigin = H.pinch.clone().add(V3(NOTE_OFF, 0, 0).applyQuaternion(q));
  } else {
    // the thumb side, in hand space
    const inv = rest[`hand_${s}`].wq.clone().invert();
    const thumbW = person.P(`index_01_${s}`).sub(person.P(`pinky_01_${s}`)).applyQuaternion(inv);
    thumbW.addScaledVector(H.f0, -thumbW.dot(H.f0)).addScaledVector(H.p0, -thumbW.dot(H.p0)).normalize();
    // prop +y -> thumb side, prop +z -> palm normal
    // prop +y -> thumb side; prop +z -> palm normal (or away from it for the second hand)
    const Y = thumbW, Zc = v === 'lo' || v.endsWith('F') ? H.p0.clone().negate() : H.p0.clone(), X = new THREE.Vector3().crossVectors(Y, Zc).normalize();
    q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Zc));
    // the axis runs through the centre the fist was fitted round (fitWrap); a side hold rests the palm on the cone
    if (isSide(v)) {
      const along = alongOf(v);
      pOrigin = H.palmC.clone().addScaledVector(H.p0, coneAt(along) + 0.014).addScaledVector(Y, -along);
    } else {
      const w = H.wraps?.[isHi(v) ? 'wrapHi' : 'wrapLo'];
      pOrigin = (w ? w.c.clone() : H.grip.clone()).addScaledVector(Y, -(isHi(v) ? BUNCH_HOLD : BUNCH_HOLD_LOW));
    }
  }
  const m = new THREE.Matrix4().compose(pOrigin, q, V3(1, 1, 1));
  return (person.holdCache[key] = { q, m });
}

// ---------------------------------------------------------------- goals
// a hand goal: { p, fwd, palm, pole, point } in world space. Body goals are given in the person's own frame.
export const goal = () => ({ p: new THREE.Vector3(), fwd: new THREE.Vector3(), palm: new THREE.Vector3(), pole: new THREE.Vector3(), point: 'grip' });
const _c1 = new THREE.Vector3(), _c2 = new THREE.Vector3();
function bodyToWorld(person, g, out) {
  const M = person.root.matrixWorld;
  out.p.set(...g.p).applyMatrix4(M);
  // body goals ride along with the chest when she leans (its move, not its turn: hanging arms still hang)
  if (g.rel !== 'root') {
    person.B.spine_03.getWorldPosition(_c1);
    _c2.copy(person.rest.spine_03.wp).applyMatrix4(M);
    out.p.add(_c1.sub(_c2));
  }
  out.fwd.set(...g.fwd).transformDirection(M);
  out.palm.set(...g.palm).transformDirection(M);
  out.pole.set(...(g.pole ?? [0, -1, -1])).transformDirection(M);
  out.point = g.point ?? 'grip';
  return out;
}
function worldGoal(g, out) {
  out.p.set(...g.p); out.fwd.set(...g.fwd).normalize(); out.palm.set(...g.palm).normalize(); out.pole.set(...(g.pole ?? [0, -1, 0])).normalize();
  out.point = g.point ?? 'grip';
  return out;
}
const tmpGA = goal(), tmpGB = goal();
const _bT = new THREE.Vector3(), _bZ = new THREE.Vector3(), _bX = new THREE.Vector3(), _bQ = new THREE.Quaternion();
// resolve a key's hand spec to a world goal
function resolve(person, spec, props, out) {
  if (!spec) return null;
  if (spec.flap) {
    props.flapGoal(out);
    out.pole.set(...(spec.pole ?? [0, -1, 0])).normalize();
    return out;
  }
  if (spec.side) {
    // an open hand resting on a held bunch's cone, `along` up it, coming from direction `from` (world, or body with
    // body: true): palm toward the axis, thumb toward the heads, the fingers round it (their curl: fitSide)
    const pr = props[spec.side];
    const M = pr.world;
    const T = _bT.setFromMatrixColumn(M, 1).normalize();
    const along = spec.along ?? BUNCH_SIDE;
    out.p.set(0, along, 0).applyMatrix4(M);
    const F = _bZ.set(...spec.from);
    if (spec.body) F.transformDirection(person.root.matrixWorld);
    F.addScaledVector(T, -F.dot(T)).normalize();
    out.palm.copy(F).negate();
    const k = person.hand[spec.hand].handed ??= Math.sign(person.thumbSide(spec.hand).dot(_bX.crossVectors(person.hand[spec.hand].f0, person.hand[spec.hand].p0)));
    if (k > 0) out.fwd.crossVectors(out.palm, T); else out.fwd.crossVectors(T, out.palm);
    out.fwd.normalize();
    out.p.addScaledVector(F, coneAt(along) + (spec.gap ?? 0.014) + (spec.lift ?? 0));
    out.point = 'palmC';
    out.pole.set(...(spec.pole ?? [0, -1, 0]));
    if (spec.body || spec.poleBody) out.pole.transformDirection(person.root.matrixWorld);
    out.pole.normalize();
    return out;
  }
  if (spec.bunch) {
    // a bunch this hand holds, posed in the world: the hold point, its axis (stems to heads), the way its +z faces
    const B = spec.bunch;
    const v = spec.v ?? 'hi';
    const T = _bT.set(...B.axis);
    const Z = _bZ.set(...B.face);
    if (B.body) { T.transformDirection(person.root.matrixWorld); Z.transformDirection(person.root.matrixWorld); }
    T.normalize();
    Z.addScaledVector(T, -Z.dot(T)).normalize();
    const X = _bX.crossVectors(T, Z);
    const qp = _bQ.setFromRotationMatrix(_m.makeBasis(X, T, Z));
    const rel = holdRel(person, spec.hand, 'bunch', v);
    const qh = qp.multiply(_q2.copy(rel.q).invert());
    out.fwd.copy(person.hand[spec.hand].f0).applyQuaternion(qh);
    out.palm.copy(person.hand[spec.hand].p0).applyQuaternion(qh);
    if (B.body) {
      // body space, riding along with the chest like the other body goals
      out.p.set(...B.at).applyMatrix4(person.root.matrixWorld);
      person.B.spine_03.getWorldPosition(_c1);
      _c2.copy(person.rest.spine_03.wp).applyMatrix4(person.root.matrixWorld);
      out.p.add(_c1.sub(_c2));
    } else out.p.set(...B.at);
    const sided = isSide(v);
    out.point = isHi(v) ? 'wrapHi' : sided ? 'palmC' : 'wrapLo';
    if (sided) out.p.addScaledVector(out.palm, -(coneAt(alongOf(v)) + 0.014));
    if (spec.lift) out.p.addScaledVector(out.palm, -spec.lift);
    out.pole.set(...(spec.pole ?? [0, -1, 0]));
    if (B.body || spec.poleBody) out.pole.transformDirection(person.root.matrixWorld);
    out.pole.normalize();
    return out;
  }
  if (spec.prop) {
    props[spec.prop].handGoal(person, spec.hand, out, spec.v ?? 'hi');
    out.pole.set(...(spec.pole ?? [0, -1, 0])).transformDirection(spec.poleBody ? person.root.matrixWorld : _m.identity());
    if (spec.lift) out.p.addScaledVector(out.palm, -spec.lift);
    if (spec.shift) out.p.add(_v.set(...spec.shift));
    if (spec.shiftBody) out.p.add(_v.set(...spec.shiftBody).applyQuaternion(person.root.getWorldQuaternion(_q2)));
    return out;
  }
  if (spec.world) {
    worldGoal(spec, out);
    if (spec.poleBody) out.pole.set(...spec.pole).transformDirection(person.root.matrixWorld);
    return out;
  }
  return bodyToWorld(person, spec, out);
}
function blendGoal(a, b, u, out) {
  out.p.lerpVectors(a.p, b.p, u);
  out.fwd.lerpVectors(a.fwd, b.fwd, u).normalize();
  out.palm.lerpVectors(a.palm, b.palm, u).normalize();
  out.pole.lerpVectors(a.pole, b.pole, u).normalize();
  out.pa = a.point; out.pb = b.point; out.pu = u;
  return out;
}
const _pt = new THREE.Vector3();
// pose an arm from the keys (spec per key), with an arc toward `arcDir` (world) when the hand travels
function poseArm(person, s, keys, t, props, arcBody = [0, 0.25, 0.4]) {
  const name = `h${s}`;
  const { a, b, u } = around(keys, t);
  const sa = a[name], sb = b[name];
  let ga, gb;
  if (sa?.side && sb?.side && sa.side === sb.side && sa !== sb) {
    // one open hand sliding round the same cone: blend where it rests, not where it is (it stays on the surface)
    const fa = _v.set(...sa.from); if (sa.body) fa.transformDirection(person.root.matrixWorld);
    const fb = _v2.set(...sb.from); if (sb.body) fb.transformDirection(person.root.matrixWorld);
    const from = fa.clone().lerp(fb, u).normalize().toArray();
    const pole = (sb.body || sb.poleBody ? V3(...sb.pole).transformDirection(person.root.matrixWorld) : V3(...sb.pole));
    const mid = { side: sa.side, hand: sa.hand, from, along: (sa.along ?? BUNCH_SIDE) + ((sb.along ?? BUNCH_SIDE) - (sa.along ?? BUNCH_SIDE)) * u, pole: pole.toArray(), lift: (sa.lift ?? 0) + ((sb.lift ?? 0) - (sa.lift ?? 0)) * u };
    ga = resolve(person, mid, props, tmpGA);
    gb = ga;
  } else {
    ga = resolve(person, sa, props, tmpGA);
    gb = resolve(person, sb, props, tmpGB);
  }
  if (!ga && !gb) return;
  const out = person._armOut ??= goal();
  blendGoal(ga || gb, gb || ga, u, out);
  const travel = ga && gb ? ga.p.distanceTo(gb.p) : 0;
  if (travel > 0.02 && !(b[name]?.straight)) out.p.add(_v.set(...arcBody).transformDirection(person.root.matrixWorld).multiplyScalar(Math.sin(u * Math.PI) * travel * 0.3));
  const H = person.hand[s];
  const ptOf = (k) => (k.startsWith('wrap') ? H.wraps?.[k]?.c ?? H.grip : H[k]);
  _pt.copy(ptOf(out.pa)).lerp(ptOf(out.pb), out.pu);
  person.solveArm(s, out.p, out.fwd, out.palm, out.pole, _pt);
  const fa = a[`f${s}`] ?? 'relax', fb = b[`f${s}`] ?? fa;
  const k = b[`f${s}At`] ?? 0.5;
  person.curl(s, u < k ? fa : fb);
}
function poseBody(person, keys, t) {
  const { a, b, u, u0 } = around(keys, t);
  // a moving hold: a slow settle along the last push, never a frozen drawing
  const drift = b.ease === 'hold' ? Math.sin(u0 * Math.PI) * 0.008 : 0;
  const r = lerpA(a.root ?? Z3, b.root ?? Z3, u);
  person.model.position.set(r[0], r[1] - drift * 0.3, r[2] + drift * 0.4);
  person.model.updateMatrixWorld(true);
  person.rotateBone('pelvis', lerpA(a.pelvis ?? Z3, b.pelvis ?? Z3, u));
  return { a, b, u, drift };
}
function poseSpine(person, keys, t, drift) {
  const { a, b, u } = around(keys, t);
  const sp = lerpA(a.spine ?? Z3, b.spine ?? Z3, u);
  person.rotateBone('spine_01', [sp[0] * 0.3, sp[1] * 0.3, sp[2] * 0.3]);
  person.rotateBone('spine_02', [sp[0] * 0.35, sp[1] * 0.35, sp[2] * 0.35]);
  person.rotateBone('spine_03', [sp[0] * 0.35 + drift * 0.3, sp[1] * 0.35, sp[2] * 0.35]);
  person.rotateBone('clavicle_l', lerpA(a.clavL ?? Z3, b.clavL ?? Z3, u));
  person.rotateBone('clavicle_r', lerpA(a.clavR ?? Z3, b.clavR ?? Z3, u));
  person.rotateBone('neck_01', lerpA(a.neck ?? Z3, b.neck ?? Z3, u));
  person.rotateBone('head', lerpA(a.head ?? Z3, b.head ?? Z3, u));
}
// feet planted at world points, a small turn of the foot
const footQ = new THREE.Quaternion();
function plantFoot(person, s, pw, yaw, lift = 0, pitch = 0) {
  const Lg = person.leg[s];
  footQ.setFromAxisAngle(V3(0, 1, 0), yaw).multiply(_q.copy(Lg.footQ));
  if (pitch) footQ.premultiply(_q2.setFromAxisAngle(V3(1, 0, 0).applyAxisAngle(V3(0, 1, 0), yaw), pitch));
  _v2.set(pw.x, Lg.ankle.y + (person.soleLift ?? 0) + lift, pw.z);
  person.solveLeg(s, _v2, footQ, 0);
}

// ================================================================ the seller
// She stands on the eye's side of her bike (layout.seller.at) and faces the tray, a little to her left.
export function sellerActs(person, layout, bike, props) {
  const at = V3(...MARKS.seller);
  person.hangX = 0.265;
  const faceDir = V3(-0.3, 0, -0.95).normalize();
  const yaw = Math.atan2(faceDir.x, faceDir.z);
  person.root.position.copy(at);
  person.root.rotation.y = yaw;
  person.root.updateMatrixWorld(true);
  person.soleLift = person.meta.sole ?? 0.006;
  const up = person.soleLift;
  // feet a little apart, the right one a half step back (weight on the left)
  // her stance for a turn of the whole body (+ = to her left): the feet around her mark
  const UP = V3(0, 1, 0);
  const footOff = { l: V3(0.095, 0, 0.03), r: V3(-0.1, 0, -0.06) };
  const footTurn = { l: 0.18, r: -0.28 };
  const stance = (turn, s, out) => out.copy(footOff[s]).applyAxisAngle(UP, yaw + turn).add(at);
  const _fa = V3(0, 0, 0), _fb = V3(0, 0, 0);
  const EX = MARKS.EX;          // where the bunch and the note change hands (world)
  const slotHold = bike.slot.p.clone().add(V3(0, BUNCH_HOLD, 0).applyQuaternion(bike.slot.q));
  // hand specs (body space: +z forward, +x her left)
  const restR = { p: hang(person, 'r', 0.02, 0.08), fwd: [0.05, -1, 0.2], palm: [0.9, 0, 0.2], pole: [-0.4, 0.1, -1] };
  const restL = { p: hang(person, 'l', 0.0, 0.09), fwd: [-0.05, -1, 0.2], palm: [-0.9, 0, 0.2], pole: [0.4, 0.1, -1] };
  const restL2 = { ...restL, p: hang(person, 'l', 0.03, 0.04) };
  const foldR = { p: [-0.035, 0.92, 0.215], fwd: [0.8, -0.2, 0.4], palm: [0.1, 0.2, -1], pole: [-1, -0.5, -0.2] };
  const foldL = { p: [0.03, 0.9, 0.21], fwd: [-0.8, -0.3, 0.4], palm: [-0.05, 0.25, -1], pole: [1, -0.6, -0.2] };
  // the tray, in world: tidying touches (palm down on the heads of the bunches)
  const trayP = (dx, dy, dz) => bike.trayCentre.clone().add(V3(dx, dy, dz)).toArray();
  // a palm resting on the flower heads: just over the highest flower under the hand
  // (the forearm comes back over the flowers toward her: they must clear it too)
  const onPile = (dx, dz) => {
    const p = bike.trayCentre.clone().add(V3(dx, 0, dz));
    let top = bike.pileTop(p.x, p.z, 0.11) ?? p.y + 0.3;
    for (let k = 1; k <= 4; k++) { const q = p.clone().lerp(at, k * 0.1); const tq = bike.pileTop(q.x, q.z, 0.07); if (tq !== null) top = Math.max(top, tq - 0.03 * k); }
    p.y = top + 0.03;
    return p.toArray();
  };
  const tidyR1 = { world: true, p: onPile(0.24, 0.26), fwd: [-0.3, -0.03, -1], palm: [0, -1, -0.03], pole: [-1, -0.6, -0.2], poleBody: true, point: 'palmC' };
  const tidyR2 = { world: true, p: onPile(0.14, 0.3), fwd: [-0.6, -0.03, -1], palm: [0, -1, -0.03], pole: [-1, -0.6, -0.2], poleBody: true, point: 'palmC' };
  const tidyL1 = { world: true, p: onPile(-0.16, 0.3), fwd: [0.4, -0.03, -1], palm: [0, -1, -0.03], pole: [1, -0.6, -0.2], poleBody: true, point: 'palmC' };
  const hoverR = { world: true, p: (() => { const q = onPile(0.14, 0.34); q[1] += 0.1; return q; })(), fwd: [-0.6, -0.03, -1], palm: [0, -1, -0.03], pole: [-1, -0.6, -0.2], poleBody: true, point: 'palmC' };
  // above the flowers, on her side of them: the hands come and go by here
  const hoverAt = (dx, dz) => { const q = onPile(dx, dz); q[1] += 0.1; q[2] += 0.1; return q; };
  const hoverR1 = { world: true, p: hoverAt(0.2, 0.28), fwd: [-0.4, -0.2, -1], palm: [0, -1, -0.1], pole: [-1, -0.6, -0.2], poleBody: true, point: 'palmC' };
  const hoverL1 = { world: true, p: hoverAt(-0.16, 0.3), fwd: [0.4, -0.2, -1], palm: [0, -1, -0.1], pole: [1, -0.6, -0.2], poleBody: true, point: 'palmC' };
  const offerL = { p: [0.28, 1.0, 0.36], fwd: [0.6, 0.1, 1], palm: [-0.2, 1, 0.1], pole: [1, -0.8, -0.3], point: 'palmC' };
  // the bunch is taken, pulled out and held out by her left hand (the girl stands on her left): an overhand grip, its
  // palm toward the flowers' far side ('hiF')
  const grabSold = { prop: 'sold', hand: 'l', v: 'hiF', pole: [1, -0.4, 0.3], poleBody: true };
  // (out of the pile along its own length, toward her, a little up; it turns up only once it is clear)
  const slotDirW = V3(0, 1, 0).applyQuaternion(bike.slot.q);
  const pullAt = slotHold.clone().addScaledVector(slotDirW, -0.2).add(V3(0, 0.12, 0));
  const slotFaceW = V3(0, 0, 1).applyQuaternion(bike.slot.q);
  const pullSold = { bunch: { at: pullAt.toArray(), axis: slotDirW.clone().add(V3(0, 0.35, 0)).toArray(), face: slotFaceW.toArray() }, hand: 'l', v: 'hiF', pole: [1, -0.5, 0.2], poleBody: true };
  // held out to the girl: heads toward her, the seller's palm away from the eye (so the bunch's +z faces the eye)
  const giveL = { bunch: { at: [EX[0] - 0.02, EX[1] - 0.05, EX[2]], axis: [0.22, 1, -0.08], face: [0.1, 0, 1] }, hand: 'l', v: 'hiF', pole: [1, -0.8, -0.1], poleBody: true, straight: true };
  const lowL = { bunch: { at: [(slotHold.x + EX[0]) / 2 - 0.05, EX[1] - 0.12, (slotHold.z + EX[2]) / 2 - 0.1], axis: [-0.2, 0.55, -1], face: [0, 1, 0.5] }, hand: 'l', v: 'hiF', pole: [1, -0.6, 0], poleBody: true };
  const letGoL = { world: true, p: [EX[0] + 0.13, EX[1] - 0.05, EX[2] - 0.04], fwd: [-1, 0.05, -0.1], palm: [0.1, -0.3, -1], pole: [1, -0.8, -0.1], poleBody: true };
  // the other hand, open and low toward the girl ("here")
  const offerLo = { p: [0.2, 0.93, 0.3], fwd: [0.5, -0.2, 1], palm: [-0.3, 1, 0.1], pole: [1, -0.8, -0.3], point: 'palmC' };
  const EXN = MARKS.EXN;          // where the note changes hands (the girl's right front, clear of her flowers)
  const takeNote = { world: true, p: [EXN[0] + 0.07, EXN[1] + 0.02, EXN[2] - 0.03], fwd: [-0.85, -0.1, -0.5], palm: [0, 1, 0], pole: [1, -0.6, 0.1], poleBody: true, point: 'pinch' };
  const noteReady = { world: true, p: [EXN[0] + 0.1, EXN[1] + 0.04, EXN[2] - 0.05], fwd: [-0.85, -0.05, -0.5], palm: [0, 1, 0], pole: [1, -0.6, 0.1], poleBody: true, point: 'pinch' };
  // the pouch at her waist: the note goes in at its mouth (virtual props that ride the pelvis, see people.js)
  const tuck1 = { prop: 'pouchTop', hand: 'l', pole: [1, -0.2, 0.45], poleBody: true };
  const tuck2 = { prop: 'pouchIn', hand: 'l', pole: [1, -0.2, 0.45], poleBody: true };
  const tuckOut = { prop: 'pouchTop', hand: 'l', pole: [1, -0.2, 0.45], poleBody: true, shiftBody: [0, 0.05, 0.05] };
  // the refill: the left hand lifts the parcel's flap, the right hand takes a bunch out from inside and lays it in the slot
  const underHold = bike.under.p.clone().add(V3(0, BUNCH_HOLD_LOW, 0).applyQuaternion(bike.under.q));
  const flapUnder = { flap: true, hand: 'l', pole: [-1, -0.6, 0.4] };
  const flapAway = { world: true, p: [underHold.x - 0.12, underHold.y + 0.2, underHold.z + 0.22], fwd: [0.3, -0.2, -1], palm: [0, 1, 0], pole: [-1, -0.6, 0.4], point: 'palmC' };
  const nearParcel = { world: true, p: [underHold.x + 0.02, underHold.y + 0.12, underHold.z + 0.14], fwd: [-0.3, -0.5, -1], palm: [0, -1, 0.2], pole: [-1, -0.5, 0.2], poleBody: true };
  const grabRefill = { prop: 'refill', hand: 'r', v: 'loN', pole: [-1, -0.1, 0.2], poleBody: true };
  const underAxis = V3(0, 1, 0).applyQuaternion(bike.under.q), underFace = V3(0, 0, 1).applyQuaternion(bike.under.q);
  const slotAxis = V3(0, 1, 0).applyQuaternion(bike.slot.q), slotFace = V3(0, 0, 1).applyQuaternion(bike.slot.q);
  const slotLow = bike.slot.p.clone().add(slotAxis.clone().multiplyScalar(BUNCH_HOLD_LOW));
  const pullRefill = { bunch: { at: [underHold.x + 0.02, underHold.y + 0.14, underHold.z + 0.15], axis: underAxis.clone().add(V3(0, 0.5, 0)).toArray(), face: underFace.toArray() }, hand: 'r', v: 'loN', pole: [-1, -0.1, 0.2], poleBody: true };
  const layAt = slotLow.clone().addScaledVector(slotAxis, -0.2).add(V3(0, 0.1, 0));
  const layRefill = { bunch: { at: layAt.toArray(), axis: slotAxis.clone().add(V3(0, 0.25, 0)).toArray(), face: slotFace.toArray() }, hand: 'r', v: 'loN', pole: [-0.5, -1, 0.5], poleBody: true };
  const refillLay = { prop: 'refillSlot', hand: 'r', v: 'loN', pole: [-0.5, -1, 0.5], poleBody: true };
  // on its way from the parcel to the slot the bunch turns flat, heads to her right (never up past her hat)
  const swingAt = slotLow.clone().addScaledVector(slotAxis, -0.3).add(V3(0, 0.26, 0));
  const swingRefill = { bunch: { at: swingAt.toArray(), axis: slotAxis.clone().add(V3(0, 0.6, 0)).toArray(), face: slotFace.toArray() }, hand: 'r', v: 'loN', pole: [-1, -0.3, 0.3], poleBody: true };

  const B0 = { pelvis: [0.02, 0.05, 0.02], spine: [0.18, 0.1, 0.0], neck: [0.2, -0.06, 0], head: [0.28, -0.16, 0] };
  const K = [
    // tidying the tray while she waits
    { t: 0, ease: 'hold', ...B0, root: [0, -0.004, 0.02], hr: restR, hl: restL, fr: 'rest', fl: 'rest' },
    { t: 0.5, ease: 'inout', ...B0, spine: [0.2, 0.12, -0.01], root: [0, -0.006, 0.02], hr: hoverR1, hl: restL, fr: 'relax', fl: 'rest' },
    { t: 0.9, ease: 'inout', ...B0, spine: [0.24, 0.16, -0.02], head: [0.3, -0.16, 0], root: [0, -0.008, 0.02], hr: tidyR1, hl: restL, fr: 'flat', fl: 'rest' },
    { t: 1.8, ease: 'inout', ...B0, spine: [0.26, 0.2, -0.02], head: [0.32, -0.16, 0], root: [0, -0.008, 0.02], hr: tidyR2, hl: restL, fr: 'flat', fl: 'rest' },
    { t: 2.7, ease: 'inout', ...B0, spine: [0.22, 0.1, 0.02], head: [0.3, -0.16, 0], root: [0, -0.008, 0.02], hr: tidyR1, hl: tidyL1, fr: 'flat', fl: 'flat' },
    { t: 3.05, ease: 'inout', ...B0, spine: [0.22, 0.1, 0.01], root: [0, -0.008, 0.03], hr: hoverR1, hl: hoverL1, fr: 'relax', fl: 'relax' },
    { t: 3.6, ease: 'out', ...B0, spine: [0.24, 0.12, 0.0], head: [0.24, -0.16, 0], root: [0, -0.008, 0.04], hr: restR, hl: restL, fr: 'rest', fl: 'rest' },
    // she notices the girl: straightens (her face stays turned from the eye, under the hat)
    { t: 4.4, ease: 'snap', pelvis: [0.02, 0.12, 0.0], spine: [0.1, 0.2, 0.02], neck: [0.12, -0.06, 0], head: [0.22, -0.28, 0], root: [0, 0, 0.02], hr: foldR, hl: foldL, fr: 'relax', fl: 'relax' },
    // an open hand toward the flowers: "which one?"
    { t: 5.2, ease: 'out', pelvis: [0.02, 0.14, 0.0], spine: [0.14, 0.22, 0.03], neck: [0.14, -0.06, 0], head: [0.28, -0.28, 0], root: [0, 0, 0.03], hr: foldR, hl: offerL, fr: 'relax', fl: 'open' },
    { t: 5.9, ease: 'hold', pelvis: [0.02, 0.14, 0.0], spine: [0.16, 0.2, 0.03], neck: [0.14, -0.06, 0], head: [0.3, -0.28, 0], root: [0, 0, 0.03], hr: foldR, hl: offerL, fr: 'relax', fl: 'open' },
    // turns to the tray and takes the bunch out
    { t: 6.6, ease: 'inout', pelvis: [0.03, 0.06, 0.0], spine: [0.27, 0.04, -0.01], neck: [0.18, -0.06, 0], head: [0.34, -0.28, 0], root: [0, -0.01, -0.05], hr: restR, hl: grabSold, fr: 'rest', fl: 'release', flAt: 0.8 },
    { t: 6.9, ease: 'hold', pelvis: [0.03, 0.06, 0.0], spine: [0.28, 0.04, -0.01], neck: [0.18, -0.06, 0], head: [0.36, -0.28, 0], root: [0, -0.01, -0.05], hr: restR, hl: grabSold, fr: 'rest', fl: 'wrapHi' },
    { t: 7.3, ease: 'snap', pelvis: [0.03, 0.08, 0.0], spine: [0.22, 0.08, -0.01], neck: [0.16, -0.06, 0], head: [0.34, -0.28, 0], root: [0, -0.008, -0.02], hr: restR, hl: pullSold, fr: 'rest', fl: 'wrapHi' },
    { t: 7.7, ease: 'inout', pelvis: [0.03, 0.1, 0.0], spine: [0.22, 0.12, 0.01], neck: [0.18, -0.06, 0], head: [0.38, -0.28, 0], root: [0, -0.008, 0.0], hr: restR, hl: lowL, fr: 'rest', fl: 'wrapHi' },
    // holds it out to the girl, the head bowed over the flowers (the hat keeps her face)
    { t: 8.1, turn: 0.05, ease: 'out', pelvis: [0.03, 0.12, 0.0], spine: [0.22, 0.16, 0.02], neck: [0.22, -0.06, 0], head: [0.5, -0.28, 0], root: [0, -0.006, 0.04], hr: foldR, hl: giveL, fr: 'relax', fl: 'wrapHi' },
    { t: 9.0, turn: 0.05, ease: 'hold', pelvis: [0.03, 0.12, 0.0], spine: [0.23, 0.17, 0.02], neck: [0.22, -0.06, 0], head: [0.52, -0.28, 0], root: [0, -0.006, 0.04], hr: foldR, hl: giveL, fr: 'relax', fl: 'wrapHi' },
    // lets go (the girl has it), the hand back
    { t: 9.4, turn: 0.05, ease: 'out', pelvis: [0.03, 0.12, 0.0], spine: [0.22, 0.16, 0.02], neck: [0.22, -0.06, 0], head: [0.5, -0.28, 0], root: [0, -0.006, 0.04], hr: foldR, hl: { ...giveL, lift: 0.08, straight: true }, fr: 'relax', fl: 'release', flAt: 0.01 },
    { t: 9.9, turn: 0.05, ease: 'inout', pelvis: [0.03, 0.12, 0.0], spine: [0.2, 0.16, 0.02], neck: [0.22, -0.06, 0], head: [0.46, -0.28, 0], root: [0, -0.004, 0.04], hr: foldR, hl: { world: true, p: [EX[0] + 0.2, EX[1] + 0.0, EX[2] + 0.08], fwd: [-0.6, -0.3, -0.7], palm: [0.3, -0.9, 0.2], pole: [1, -0.8, -0.1], poleBody: true }, fr: 'relax', fl: 'release' },
    { t: 10.2, turn: 0.05, ease: 'inout', pelvis: [0.02, 0.1, 0.0], spine: [0.16, 0.14, 0.02], neck: [0.2, -0.06, 0], head: [0.4, -0.28, 0], root: [0, 0, 0.03], hr: foldR, hl: foldL, fr: 'relax', fl: 'relax' },
    { t: 12.4, turn: 0.05, ease: 'hold', pelvis: [0.02, 0.11, 0.0], spine: [0.16, 0.17, 0.02], neck: [0.16, -0.06, 0], head: [0.34, -0.28, 0], root: [0, 0, 0.03], hr: foldR, hl: foldL, fr: 'relax', fl: 'relax' },
    // reaches for the note
    { t: 13.3, turn: 0.05, ease: 'inout', pelvis: [0.02, 0.12, 0.0], spine: [0.22, 0.19, 0.02], neck: [0.16, -0.06, 0], head: [0.38, -0.28, 0], root: [0, -0.004, 0.04], hr: foldR, hl: noteReady, fr: 'relax', fl: 'release' },
    { t: 14.0, turn: 0.05, ease: 'out', pelvis: [0.02, 0.12, 0.0], spine: [0.23, 0.20, 0.02], neck: [0.16, -0.06, 0], head: [0.38, -0.28, 0], root: [0, -0.004, 0.04], hr: foldR, hl: { prop: 'note', hand: 'l', v: 'other', pole: [1, -0.6, 0.1], poleBody: true }, fr: 'relax', fl: 'pinch', flAt: 0.9 },
    { t: 14.3, turn: 0.05, ease: 'hold', pelvis: [0.02, 0.12, 0.0], spine: [0.23, 0.20, 0.02], neck: [0.16, -0.06, 0], head: [0.38, -0.28, 0], root: [0, -0.004, 0.04], hr: foldR, hl: { prop: 'note', hand: 'l', v: 'other', pole: [1, -0.6, 0.1], poleBody: true }, fr: 'relax', fl: 'pinch' },
    // tucks it into the pouch at her waist
    { t: 15.0, turn: 0.05, ease: 'inout', pelvis: [0.02, 0.08, 0.0], spine: [0.18, 0.11, 0.04], neck: [0.2, -0.06, 0], head: [0.4, -0.28, 0], root: [0, -0.006, 0.04], hr: foldR, hl: tuck1, fr: 'relax', fl: 'pinch' },
    { t: 15.5, turn: 0.05, ease: 'in', pelvis: [0.02, 0.08, 0.0], spine: [0.18, 0.11, 0.04], neck: [0.2, -0.06, 0], head: [0.42, -0.28, 0], root: [0, -0.006, 0.04], hr: foldR, hl: tuck2, fr: 'relax', fl: 'pinch' },
    { t: 15.8, turn: 0.05, ease: 'out', pelvis: [0.02, 0.08, 0.0], spine: [0.18, 0.11, 0.04], neck: [0.18, -0.06, 0], head: [0.38, -0.28, 0], root: [0, -0.006, 0.04], hr: foldR, hl: tuckOut, fr: 'relax', fl: 'release' },
    // a nod after the girl
    { t: 16.4, turn: 0.05, ease: 'inout', pelvis: [0.02, 0.09, 0.0], spine: [0.2, 0.14, 0.02], neck: [0.26, -0.06, 0], head: [0.4, -0.28, 0], root: [0, -0.004, 0.03], hr: foldR, hl: foldL, fr: 'relax', fl: 'relax' },
    { t: 17.2, ease: 'out', pelvis: [0.02, 0.06, 0.0], spine: [0.14, 0.06, 0.02], neck: [0.12, -0.06, 0], head: [0.2, -0.28, 0], root: [0, 0, 0.03], hr: foldR, hl: foldL, fr: 'relax', fl: 'relax' },
    // tidies the tray again, then waits and looks down the street (away from the eye)
    { t: 17.8, ease: 'inout', ...B0, spine: [0.16, 0.1, -0.01], head: [0.26, -0.16, 0], root: [0, -0.004, 0.02], hr: hoverR, hl: foldL, fr: 'flat', fl: 'relax' },
    { t: 18.4, ease: 'inout', ...B0, spine: [0.24, 0.14, -0.02], head: [0.3, -0.16, 0], root: [0, -0.008, 0.02], hr: tidyR2, hl: restL, fr: 'flat', fl: 'rest' },
    { t: 19.6, ease: 'inout', ...B0, spine: [0.26, 0.08, 0.02], head: [0.3, -0.16, 0], root: [0, -0.008, 0.02], hr: tidyR1, hl: tidyL1, fr: 'flat', fl: 'flat' },
    { t: 20.0, ease: 'inout', ...B0, spine: [0.22, 0.06, 0.01], root: [0, -0.008, 0.02], hr: hoverR1, hl: hoverL1, fr: 'relax', fl: 'relax' },
    { t: 21.0, ease: 'out', pelvis: [0.02, -0.12, 0.0], spine: [0.06, -0.18, 0.0], neck: [0.06, -0.20, 0], head: [0.08, -0.26, 0], root: [0, 0, 0.02], hr: restR, hl: restL2, fr: 'rest', fl: 'rest' },
    { t: 25.0, ease: 'hold', pelvis: [0.02, -0.14, 0.01], spine: [0.07, -0.2, 0.0], neck: [0.08, -0.22, 0], head: [0.1, -0.30, 0], root: [0, 0, 0.02], hr: restR, hl: restL2, fr: 'rest', fl: 'rest' },
    { t: 26.4, ease: 'inout', pelvis: [0.02, 0.0, 0.0], spine: [0.12, 0.0, 0.0], neck: [0.12, -0.06, 0], head: [0.18, -0.16, 0], root: [0, 0, 0.02], hr: foldR, hl: foldL, fr: 'relax', fl: 'relax' },
    { t: 29.2, ease: 'hold', pelvis: [0.02, 0.02, 0.0], spine: [0.14, 0.02, 0.0], neck: [0.14, -0.06, 0], head: [0.2, -0.16, 0], root: [0, 0, 0.02], hr: foldR, hl: foldL, fr: 'relax', fl: 'relax' },
    // the refill (the girl is out of sight): lift the parcel's flap, take a bunch from inside, lay it in the empty place
    { t: 29.9, ease: 'inout', pelvis: [0.03, 0.10, 0.0], spine: [0.42, 0.14, 0.02], neck: [0.18, -0.1, 0], head: [0.40, -0.3, 0], root: [0, -0.02, -0.03], hr: restR, hl: flapUnder, fr: 'rest', fl: 'flat' },
    { t: 30.3, ease: 'out', pelvis: [0.03, 0.10, 0.0], spine: [0.43, 0.14, 0.02], neck: [0.18, -0.1, 0], head: [0.40, -0.3, 0], root: [0, -0.016, 0.05], hr: nearParcel, hl: flapUnder, fr: 'release', fl: 'flat' },
    { t: 30.8, ease: 'in', pelvis: [0.03, 0.09, 0.0], spine: [0.4, 0.12, 0.02], neck: [0.18, -0.1, 0], head: [0.40, -0.3, 0], root: [0, -0.022, -0.03], hr: grabRefill, hl: flapUnder, fr: 'release', fl: 'flat', frAt: 0.85 },
    { t: 31.0, ease: 'hold', pelvis: [0.03, 0.09, 0.0], spine: [0.45, 0.12, 0.02], neck: [0.18, -0.1, 0], head: [0.40, -0.3, 0], root: [0, -0.022, -0.03], hr: grabRefill, hl: flapUnder, fr: 'wrapLo', fl: 'flat' },
    { t: 31.5, ease: 'snap', pelvis: [0.03, 0.06, 0.0], spine: [0.34, 0.08, 0.02], neck: [0.18, -0.1, 0], head: [0.40, -0.3, 0], root: [0, -0.016, -0.03], hr: pullRefill, hl: flapUnder, fr: 'wrapLo', fl: 'flat' },
    { t: 31.7, ease: 'inout', pelvis: [0.03, 0.04, 0.0], spine: [0.34, 0.06, 0.02], neck: [0.16, -0.1, 0], head: [0.40, -0.3, 0], root: [0, -0.014, -0.03], hr: swingRefill, hl: flapUnder, fr: 'wrapLo', fl: 'flat' },
    { t: 31.9, ease: 'inout', pelvis: [0.03, 0.03, 0.0], spine: [0.3, 0.03, 0.02], neck: [0.18, -0.1, 0], head: [0.40, -0.3, 0], root: [0, -0.016, -0.06], hr: layRefill, hl: flapAway, fr: 'wrapLo', fl: 'relax' },
    { t: 32.4, ease: 'in', pelvis: [0.03, 0.02, 0.0], spine: [0.32, 0.01, 0.0], neck: [0.18, -0.1, 0], head: [0.40, -0.3, 0], root: [0, -0.016, -0.06], hr: refillLay, hl: restL, fr: 'wrapLo', fl: 'rest' },
    { t: 32.9, ease: 'out', pelvis: [0.03, 0.02, 0.0], spine: [0.3, 0.02, 0.0], neck: [0.18, -0.1, 0], head: [0.40, -0.3, 0], root: [0, -0.012, -0.07], hr: { world: true, p: [slotLow.x - 0.02, slotLow.y + 0.3, slotLow.z + 0.16], fwd: [-0.3, -0.6, -0.7], palm: [0.1, -0.95, 0.2], pole: [1, -0.6, 0.5] }, hl: restL, fr: 'release', fl: 'rest' },
    { t: 33.5, ease: 'inout', pelvis: [0.03, 0.04, 0.0], spine: [0.22, 0.06, 0.0], neck: [0.16, -0.06, 0], head: [0.28, -0.16, 0], root: [0, -0.008, -0.02], hr: { world: true, p: [slotLow.x - 0.02, slotLow.y + 0.2, slotLow.z + 0.34], fwd: [-0.3, -0.6, -0.7], palm: [0.1, -0.95, 0.2], pole: [-1, -0.5, 0.2], poleBody: true }, hl: restL, fr: 'relax', fl: 'rest' },
    { t: 34.2, ease: 'inout', ...B0, spine: [0.24, 0.1, 0.0], head: [0.26, -0.16, 0], root: [0, -0.006, 0.03], hr: restR, hl: restL, fr: 'rest', fl: 'rest' },
    { t: LOOP, ease: 'hold', ...B0, root: [0, -0.004, 0.02], hr: restR, hl: restL, fr: 'rest', fl: 'rest' },
  ];
  // who holds what, and when (the change happens on a drawing where the hand is exactly at the thing)
  // the parcel flap: shut, lifted by the left hand, let fall
  const flapK = [[0, 0], [29.9, 0], [30.3, 1], [31.5, 1], [31.9, 0], [LOOP, 0]];
  const parcelFlap = (t) => { let i = 0; while (i < flapK.length - 2 && flapK[i + 1][0] <= t) i++; const [ta, va] = flapK[i], [tb, vb] = flapK[i + 1]; return va + (vb - va) * EASE.inout(clamp01((t - ta) / (tb - ta))); };
  const own = {
    sold: [[0, 'slot'], [6.9, 'sellerL'], [9.0, 'girlL'], [LOOP, 'slot']],
    refill: [[0, 'under'], [31.0, 'sellerR'], [32.4, 'slot'], [LOOP, 'slot']],
    note: [[0, 'bag'], [12.8, 'girlR'], [14.3, 'sellerL'], [15.5, 'pouch'], [LOOP, 'pouch']],
  };
  return {
    person, K, own, EX, parcelFlap,
    poseBody(t) {
      const { a, b, u, u0 } = around(K, t);
      const ta = a.turn ?? 0, tb = b.turn ?? 0;
      const turn = ta + (tb - ta) * u;
      person.root.rotation.y = yaw + turn;
      person.root.updateMatrixWorld(true);
      person.resetPose();
      const { drift } = poseBody(person, K, t);
      // turning: the leading foot steps first, then the other (each on its own half of the move)
      const first = tb >= ta ? 'l' : 'r';
      for (const s of ['l', 'r']) {
        if (ta === tb) { plantFoot(person, s, stance(ta, s, _fa), yaw + ta + footTurn[s]); continue; }
        const w = s === first ? clamp01(u0 * 2) : clamp01(u0 * 2 - 1);
        const e = EASE.inout(w);
        stance(ta, s, _fa).lerp(stance(tb, s, _fb), e);
        plantFoot(person, s, _fa, yaw + ta + (tb - ta) * e + footTurn[s], Math.sin(Math.PI * w) * 0.035, Math.sin(Math.PI * w) * 0.15);
      }
      poseSpine(person, K, t, drift);
    },
    poseArm(s, t, props) { poseArm(person, s, K, t, props, s === 'r' ? [-0.2, 0.45, 0.25] : [0.2, 0.45, 0.25]); },
    // for the fold lines: how hard the cloth is working in this drawing
    measures(t) {
      const sp = field(K, t, 'spine');
      return { bend: clamp01(sp[0] / 0.4), twist: clamp01(Math.abs(sp[1]) / 0.25) };
    },
  };
}

// ================================================================ the girl
// path: she walks in, stops at her mark, walks out and into the lane. Position steps with the drawing (feet stay planted).
export function girlActs(person, layout, bike, props) {
  const G = V3(...MARKS.girl);
  person.hangX = 0.275;
  // the line she walks is the season's (peopleLayout.girlPath: its points, one of them marked stop = her mark). We read it,
  // so when the season moves her way in or her way into the lane, she follows it with no change here. GIRL_IN and OUT below
  // are only the fallback for a page that hands us no path.
  const layoutPts = Array.isArray(layout.girlPath) && layout.girlPath.length > 2 ? layout.girlPath : null;
  let pin, pout;
  if (layoutPts) {
    const at = (q) => V3(q.at.x ?? q.at[0], 0, q.at.z ?? q.at[1]);
    let stop = layoutPts.findIndex((q) => q.stop);
    if (stop < 1) {
      // no point marked: the one nearest her mark
      let best = 1e9;
      layoutPts.forEach((q, i) => { const d = at(q).distanceTo(G); if (d < best) { best = d; stop = i; } });
    }
    const pts = layoutPts.map(at);
    pts[stop] = G.clone();                        // her mark is this folder's (acts.js MARKS.girl)
    pin = pts.slice(0, stop + 1);
    pout = pts.slice(stop);
  } else {
    pin = [...GIRL_IN.map((p) => V3(...p)), G.clone()];
    pout = [G.clone(), ...GIRL_OUT.map((p) => V3(...p))];
  }
  // (Path clamps each corner to 0.45 of the shorter leg, so one number is enough: tight corners on the pavement, wide ones
  // where she crosses and where she cuts into the lane)
  const pathIn = new Path(pin, 0.35), pathOut = new Path(pout, 0.7);
  const faceStop = V3(0.9, 0, -0.43).normalize();
  const faceStopX = () => faceStop.x, faceStopZ = () => faceStop.z;
  const yawStop = Math.atan2(faceStop.x, faceStop.z);
  person.soleLift = person.meta.sole ?? 0.004;
  const T_IN = [0, 4.4], T_OUT = [16.8, 30.6];
  // her pace in: full speed, then 1.1 s of slowing to a stop (which covers 0.55 s worth of full speed)
  const V = pathIn.len / (T_IN[1] - T_IN[0] - 0.55);
  // distance along the way in / out at time t
  const sIn = (t) => {
    const L = pathIn.len, [a, b] = T_IN;
    // full speed, then easing to a stop over the last 1.1 s
    const tb = b - 1.1;
    if (t <= tb) return Math.min(L, V * (t - a));
    const s0 = V * (tb - a), rem = L - s0;
    const u = clamp01((t - tb) / (b - tb));
    return s0 + rem * (1 - (1 - u) * (1 - u));
  };
  const sOut = (t) => {
    const [a] = T_OUT;
    const acc = 0.7;
    if (t <= a) return 0;
    const VO = 1.1;
    if (t < a + acc) return 0.5 * (VO / acc) * (t - a) ** 2;
    return Math.min(pathOut.len, 0.5 * VO * acc + VO * (t - a - acc));
  };
  const EX = MARKS.EX;
  const TRAY_AT = bike.trayCentre.clone();
  // hands (body space: +z forward, +x her left; she is 1.57 m)
  const hl0 = hang(person, 'l', 0.014, 0.02, 0.02), hr0 = hang(person, 'r', 0.014, 0.02, 0.02);
  const swingL = (ph) => ({ p: [hl0[0], hl0[1] + 0.02 * (1 - Math.cos(2 * ph)) * 0.5, hl0[2] + 0.12 * Math.sin(ph)], fwd: [-0.05, -1, 0.3 * Math.sin(ph)], palm: [-0.95, 0, 0.1], pole: [0.3, 0.1, -1] });
  const swingR = (ph) => ({ p: [hr0[0], hr0[1] + 0.02 * (1 - Math.cos(2 * ph)) * 0.5, hr0[2] + 0.05 - 0.07 * Math.sin(ph)], fwd: [0.05, -1, -0.3 * Math.sin(ph)], palm: [0.95, 0, 0.1], pole: [-0.3, 0.1, -1] });
  const restL = { p: hang(person, 'l', 0.015, 0.06), fwd: [-0.05, -1, 0.15], palm: [-0.95, 0, 0.15], pole: [0.3, 0.1, -1] };
  const restR = { p: hang(person, 'r', 0.0, 0.06), fwd: [0.05, -1, 0.15], palm: [0.95, 0, 0.15], pole: [-0.3, 0.1, -1] };
  const clasp = { p: [0.02, 0.9, 0.16], fwd: [-0.7, -0.4, 0.4], palm: [0, 0.2, -1], pole: [1, -0.6, -0.2] };
  const claspR = { p: [-0.03, 0.88, 0.17], fwd: [0.7, -0.5, 0.35], palm: [0.1, 0.2, -1], pole: [-1, -0.6, -0.2] };
  // pointing at the bunch on the tray (right hand, index out)
  // pointing at the bunch on the tray: the arm half out toward it, the index finger along the line
  const soldMid = bike.slot.p.clone().add(V3(0, BUNCH_LEN * 0.55, 0).applyQuaternion(bike.slot.q));
  const shR = G.clone().add(V3(-0.17, 1.29, 0.02).applyAxisAngle(V3(0, 1, 0), Math.atan2(faceStopX(), faceStopZ())));
  const toSold = soldMid.clone().sub(shR).normalize();
  const pointAt = shR.clone().addScaledVector(toSold, 0.44);
  const point = { world: true, p: pointAt.toArray(), fwd: toSold.toArray(), palm: [0.2, -0.9, -0.3], pole: [0.2, -1, 0.5], point: 'pinch' };
  // receiving: left hand takes the cone, right hand under the flowers
  const takeL = { prop: 'sold', hand: 'l', v: 'loN', pole: [1.4, -0.8, -0.2], poleBody: true };
  // once she has it: held in front of her, in her own space (it goes where she goes)
  const holdL = { bunch: { body: true, at: [0.06, 0.86, 0.42], axis: [0.1, 1, 0.1], face: [-0.8, 0, -0.6] }, hand: 'l', v: 'loN', pole: [1.4, -0.8, -0.2] };
  const underR = { side: 'sold', hand: 'r', from: [-0.75, 0, 0.66], body: true, pole: [-1.4, -0.6, 0.1] };
  // holding it up to smell (body space): the flowers at her face
  const smellL = { bunch: { body: true, at: [0.04, 0.76, 0.46], axis: [0.03, 1, 0.12], face: [-0.8, 0, -0.6] }, hand: 'l', v: 'loN', pole: [1.5, -0.5, 0.2], poleBody: true };
  const smellR = { side: 'sold', hand: 'r', from: [-0.6, 0, 0.8], body: true, pole: [-1, -0.9, -0.2] };
  // the bunch in her left arm (torch grip at the chest, heads by her left shoulder)
  const cradleL = { bunch: { body: true, at: [0.04, 1.0, 0.26], axis: [0.3, 1, 0.3], face: [-0.7, 0, -0.7] }, hand: 'l', v: 'loN', pole: [1, -0.7, -0.2] };
  const hugR = { side: 'sold', hand: 'r', from: [-0.5, 0, 0.85], body: true, pole: [-1, -1.2, -0.1] };
  // the right hand lifted off the flowers (before it leaves, before it lands)
  const hugOff = { ...hugR, lift: 0.035 };
  // the bag at her right hip: opening it, the hand in, the note out
  // (dy: height over the mouth, dz: along her front, out: to her right, off the bag)
  const toBag = (dy, dz = 0, out = 0) => ({ prop: dy < 0.01 ? 'bagIn' : 'bagTop', hand: 'r', pole: [-1, -0.3, -0.5], poleBody: true, shiftBody: [-out, dy < 0.01 ? 0 : dy - 0.06, dz] });
  const EXN = MARKS.EXN;
  const offerNote = { world: true, p: [EXN[0] - 0.02, EXN[1] + 0.02, EXN[2] + 0.02], fwd: [0.85, 0.1, -0.5], palm: [0, -1, 0], pole: [-1, -0.4, 0.4], poleBody: true, point: 'pinch' };
  const B0 = { pelvis: [0.0, 0.0, 0.0], spine: [0.05, 0.0, 0.0], neck: [0.06, 0.0, 0], head: [0.1, 0.0, 0] };
  const K = [
    { t: 0, ease: 'lin', walk: 1, ...B0, hl: 'swingL', hr: 'swingR', fl: 'relax', fr: 'relax' },
    { t: 3.6, ease: 'lin', walk: 1, ...B0, head: [0.16, 0.0, 0], hl: 'swingL', hr: 'swingR', fl: 'relax', fr: 'relax' },
    // stops, looks at the flowers
    { t: 4.3, ease: 'out', pelvis: [0.0, -0.04, 0.02], spine: [0.1, -0.02, 0], neck: [0.16, 0.08, 0], head: [0.30, 0.31, 0], hl: restL, hr: restR, fl: 'relax', fr: 'relax' },
    // points at the one she wants
    { t: 5.1, ease: 'snap', pelvis: [0.0, -0.06, 0.02], spine: [0.2, -0.1, 0], neck: [0.18, 0.08, 0], head: [0.32, 0.31, 0], root: [0, -0.004, 0.03], hl: restL, hr: point, fl: 'relax', fr: 'point' },
    { t: 5.9, ease: 'hold', pelvis: [0.0, -0.06, 0.02], spine: [0.21, -0.1, 0], neck: [0.18, 0.08, 0], head: [0.34, 0.26, 0], root: [0, -0.004, 0.03], hl: restL, hr: point, fl: 'relax', fr: 'point' },
    { t: 6.8, ease: 'inout', pelvis: [0.0, -0.02, 0.02], spine: [0.1, 0.0, 0], neck: [0.14, 0.08, 0], head: [0.30, 0.31, 0], hl: clasp, hr: claspR, fl: 'relax', fr: 'relax' },
    { t: 8.0, ease: 'hold', pelvis: [0.0, -0.02, 0.02], spine: [0.1, 0.0, 0], neck: [0.14, 0.08, 0], head: [0.30, 0.31, 0], hl: clasp, hr: claspR, fl: 'relax', fr: 'relax' },
    // takes it with both hands
    { t: 8.7, ease: 'inout', pelvis: [0.0, -0.08, 0.02], spine: [0.24, -0.12, 0], neck: [0.12, 0.08, 0], head: [0.40, 0.30, 0], root: [0, -0.006, 0.05], hl: takeL, hr: claspR, fl: 'release', fr: 'relax', flAt: 0.85 },
    { t: 9.0, ease: 'hold', pelvis: [0.0, -0.08, 0.02], spine: [0.25, -0.12, 0], neck: [0.12, 0.08, 0], head: [0.40, 0.30, 0], root: [0, -0.006, 0.05], hl: takeL, hr: claspR, fl: 'wrapLo', fr: 'relax' },
    { t: 9.25, ease: 'hold', pelvis: [0.0, -0.08, 0.02], spine: [0.25, -0.12, 0], neck: [0.12, 0.08, 0], head: [0.40, 0.36, 0], root: [0, -0.006, 0.05], hl: takeL, hr: claspR, fl: 'wrapLo', fr: 'relax' },
    // the other hand under the flowers, once the seller's hand has left them
    { t: 9.85, ease: 'hold', pelvis: [0.0, -0.08, 0.02], spine: [0.25, -0.12, 0], neck: [0.12, 0.08, 0], head: [0.40, 0.36, 0], root: [0, -0.006, 0.05], hl: takeL, hr: claspR, fl: 'wrapLo', fr: 'relax' },
    { t: 10.05, ease: 'inout', pelvis: [0.0, -0.07, 0.02], spine: [0.22, -0.1, 0], neck: [0.12, 0.08, 0], head: [0.40, 0.36, 0], root: [0, -0.005, 0.045], hl: holdL, hr: { ...underR, lift: 0.06 }, fl: 'wrapLo', fr: 'open' },
    { t: 10.25, ease: 'out', pelvis: [0.0, -0.06, 0.02], spine: [0.2, -0.08, 0], neck: [0.12, 0.08, 0], head: [0.40, 0.30, 0], root: [0, -0.004, 0.04], hl: holdL, hr: underR, fl: 'wrapLo', fr: 'sideHi', frAt: 0.8 },
    // brings it to her face and breathes in (the flowers cover her face)
    { t: 10.75, ease: 'inout', pelvis: [0.0, -0.02, 0.0], spine: [0.06, 0.0, 0], neck: [0.12, 0.08, 0], head: [0.18, 0.16, 0], root: [0, 0, 0.02], hl: smellL, hr: smellR, fl: 'wrapLo', fr: 'sideHi' },
    { t: 11.2, ease: 'hold', pelvis: [0.0, -0.02, 0.0], spine: [0.07, 0.0, 0], neck: [0.13, 0.08, 0], head: [0.2, 0.16, 0], root: [0, 0, 0.02], hl: smellL, hr: smellR, fl: 'wrapLo', fr: 'sideHi' },
    // into the left arm
    { t: 11.32, ease: 'out', pelvis: [0.0, -0.02, 0.0], spine: [0.07, 0.0, 0], neck: [0.13, 0.08, 0], head: [0.2, 0.16, 0], root: [0, 0, 0.02], hl: smellL, hr: { ...smellR, lift: 0.045 }, fl: 'wrapLo', fr: 'open', frAt: 0.2 },
    { t: 11.48, ease: 'inout', pelvis: [0.0, -0.03, 0.0], spine: [0.08, -0.02, 0], neck: [0.13, 0.08, 0], head: [0.26, 0.15, 0], hl: cradleL, hr: hugOff, fl: 'wrapLo', fr: 'open', frAt: 0.15 },
    { t: 11.75, ease: 'inout', pelvis: [0.0, -0.04, 0.0], spine: [0.08, -0.04, 0], neck: [0.14, 0.08, 0], head: [0.30, 0.14, 0], hl: cradleL, hr: hugR, fl: 'wrapLo', fr: 'sideHi' },
    { t: 11.95, ease: 'out', pelvis: [0.0, 0.0, 0.0], spine: [0.1, 0.02, 0.01], neck: [0.15, 0.08, 0], head: [0.30, 0.14, 0], hl: cradleL, hr: hugOff, fl: 'wrapLo', fr: 'flat', frAt: 0.01 },
    // opens the bag (right hand), the note
    { t: 12.2, ease: 'inout', pelvis: [0.0, 0.1, 0.02], spine: [0.2, 0.16, 0.04], neck: [0.20, 0.08, 0], head: [0.30, 0.14, 0.02], root: [0, -0.004, 0.02], hl: cradleL, hr: toBag(0.06), fl: 'wrapLo', fr: 'release' },
    { t: 12.6, ease: 'in', pelvis: [0.0, 0.1, 0.02], spine: [0.22, 0.16, 0.04], neck: [0.20, 0.08, 0], head: [0.30, 0.14, 0.02], root: [0, -0.004, 0.02], hl: cradleL, hr: toBag(-0.02), fl: 'wrapLo', fr: 'pinch', frAt: 0.9 },
    { t: 12.8, ease: 'hold', pelvis: [0.0, 0.1, 0.02], spine: [0.22, 0.16, 0.04], neck: [0.20, 0.08, 0], head: [0.30, 0.14, 0.02], root: [0, -0.004, 0.02], hl: cradleL, hr: toBag(-0.02), fl: 'wrapLo', fr: 'pinch' },
    { t: 13.2, ease: 'snap', pelvis: [0.0, 0.06, 0.02], spine: [0.2, 0.1, 0.04], neck: [0.20, 0.08, 0], head: [0.30, 0.14, 0.02], root: [0, -0.004, 0.02], hl: cradleL, hr: toBag(0.13, 0, 0.05), fl: 'wrapLo', fr: 'pinch' },
    // holds it out
    { t: 13.9, ease: 'out', pelvis: [0.0, -0.02, 0.02], spine: [0.16, 0.0, 0.0], neck: [0.2, 0.08, 0], head: [0.44, 0.14, 0], root: [0, -0.005, 0.04], hl: cradleL, hr: offerNote, fl: 'wrapLo', fr: 'pinch' },
    { t: 14.3, ease: 'hold', pelvis: [0.0, -0.02, 0.02], spine: [0.17, 0.0, 0.0], neck: [0.2, 0.08, 0], head: [0.46, 0.14, 0], root: [0, -0.005, 0.04], hl: cradleL, hr: offerNote, fl: 'wrapLo', fr: 'pinch' },
    { t: 14.6, ease: 'out', pelvis: [0.0, -0.02, 0.02], spine: [0.14, 0.02, 0.0], neck: [0.2, 0.08, 0], head: [0.40, 0.14, 0], root: [0, -0.004, 0.03], hl: cradleL, hr: { ...offerNote, p: [EXN[0] - 0.14, EXN[1] - 0.06, EXN[2] + 0.1] }, fl: 'wrapLo', fr: 'release' },
    // closes the bag
    { t: 15.2, ease: 'inout', pelvis: [0.0, 0.08, 0.02], spine: [0.16, 0.12, 0.04], neck: [0.18, 0.08, 0], head: [0.30, 0.14, 0.02], hl: cradleL, hr: toBag(0.12, -0.02, 0.02), fl: 'wrapLo', fr: 'flat' },
    { t: 15.6, ease: 'hold', pelvis: [0.0, 0.08, 0.02], spine: [0.16, 0.12, 0.04], neck: [0.18, 0.08, 0], head: [0.30, 0.14, 0.02], hl: cradleL, hr: toBag(0.1, -0.01, 0.02), fl: 'wrapLo', fr: 'flat' },
    // hugs the bunch, a small nod
    { t: 16.0, ease: 'inout', pelvis: [0.0, 0.0, 0.0], spine: [0.1, 0.0, 0.01], neck: [0.2, 0.08, 0], head: [0.32, 0.14, 0], hl: cradleL, hr: hugOff, fl: 'wrapLo', fr: 'flat' },
    { t: 16.2, ease: 'out', pelvis: [0.0, -0.02, 0.0], spine: [0.08, -0.04, 0], neck: [0.22, 0.08, 0], head: [0.34, 0.14, 0], hl: cradleL, hr: hugR, fl: 'wrapLo', fr: 'sideHi', frAt: 0.6 },
    { t: 16.8, ease: 'out', pelvis: [0.0, -0.02, 0.0], spine: [0.06, -0.02, 0], neck: [0.1, 0.08, 0], head: [0.30, 0.14, 0], hl: cradleL, hr: hugR, fl: 'wrapLo', fr: 'sideHi' },
    // walks away, hugging the flowers
    { t: 17.6, ease: 'lin', walk: 2, ...B0, hl: cradleL, hr: hugR, fl: 'wrapLo', fr: 'sideHi' },
    { t: LOOP, ease: 'lin', walk: 2, ...B0, hl: cradleL, hr: hugR, fl: 'wrapLo', fr: 'sideHi' },
  ];
  // the bag flap (0 shut .. 1 open)
  const flapK = [[0, 0], [11.9, 0], [12.25, 1], [15.2, 1], [15.6, 0], [LOOP, 0]];
  const flapAt = (t) => { let i = 0; while (i < flapK.length - 2 && flapK[i + 1][0] <= t) i++; const [ta, va] = flapK[i], [tb, vb] = flapK[i + 1]; return va + (vb - va) * EASE.inout(clamp01((t - ta) / (tb - ta))); };

  const where = { p: new THREE.Vector3(), yaw: 0, s: 0, moving: false, stride: 1.1, stepPh: 0, visible: true, leg: 'in' };
  const place = (t) => {
    if (t < T_IN[1]) {
      const s = sIn(t);
      pathIn.at(s, where.p);
      const dir = pathIn.dir(s, _v);
      const y0 = Math.atan2(dir.x, dir.z);
      // turn toward the tray over the last steps
      const k = sm(T_IN[1] - 1.2, T_IN[1], t);
      where.yaw = y0 + angleDiff(yawStop, y0) * k;
      where.s = s; where.moving = true; where.leg = 'in';
    } else if (t < T_OUT[0]) {
      where.p.copy(G); where.yaw = yawStop; where.s = pathIn.len; where.moving = false; where.leg = 'stop';
    } else {
      const s = sOut(t);
      pathOut.at(s, where.p);
      const dir = pathOut.dir(s, _v);
      const y1 = Math.atan2(dir.x, dir.z);
      const k = sm(T_OUT[0], T_OUT[0] + 0.9, t);
      where.yaw = yawStop + angleDiff(y1, yawStop) * k;
      where.s = s; where.moving = true; where.leg = 'out';
    }
    where.visible = !(where.leg === 'out' && where.p.x > 6.35);
    return where;
  };
  // the stepping: feet planted on the path, one plant every half stride, left and right of the line
  const footAt = (path, sBody, side, out) => {
    const half = where.stride * 0.5, st = 0.55;
    const off = side === 'l' ? 0 : half;           // the left foot plants on even half strides
    const k = Math.floor((sBody - off + st * half) / (2 * half));
    const sPlant = k * 2 * half + off;
    const sNext = sPlant + 2 * half;
    const u = (sBody - (sPlant + st * half)) / (2 * half - 2 * st * half);    // 0..1 while swinging
    const stance = u <= 0;
    const lat = (side === 'l' ? 1 : -1) * 0.085;
    const put = (s, o) => { const c = path.at(Math.max(0, Math.min(path.len, s)), o); const d = path.dir(Math.max(0, Math.min(path.len, s)), _v2); return c.add(V3(d.z, 0, -d.x).multiplyScalar(-lat)); };
    if (stance) { put(sPlant, out.p); out.lift = 0; out.pitch = 0; out.ph = 0; }
    else {
      const uu = clamp01(u);
      put(sPlant, out.p);
      const n = put(sNext, _v.clone());
      out.p.lerp(n, EASE.inout(uu));
      out.lift = Math.sin(uu * Math.PI) * 0.06;
      out.pitch = Math.sin(uu * Math.PI) * 0.25 - 0.1 * (1 - uu);
      out.ph = uu;
    }
    return out;
  };
  const fl = { p: new THREE.Vector3(), lift: 0, pitch: 0 }, fr = { p: new THREE.Vector3(), lift: 0, pitch: 0 };
  const stopFeet = { l: V3(0.09, 0, 0.02), r: V3(-0.085, 0, -0.03) };
  return {
    person, K, where, place, flapAt, EX, pathIn, pathOut, T_IN, T_OUT,
    poseBody(t) {
      const w = place(t);
      person.root.position.copy(w.p);
      person.root.rotation.y = w.yaw;
      person.root.visible = w.visible;
      person.resetPose();
      const { a, b } = around(K, t);
      const walking = w.leg !== 'stop';
      const path = w.leg === 'in' ? pathIn : pathOut;
      let bob = 0, sway = 0, twist = 0, ph = 0;
      if (walking) {
        footAt(path, w.s, 'l', fl);
        footAt(path, w.s, 'r', fr);
        ph = (w.s / where.stride) * Math.PI * 2;
        const moving = w.leg === 'in' ? 1 - sm(T_IN[1] - 0.6, T_IN[1], t) : sm(T_OUT[0], T_OUT[0] + 0.5, t);
        bob = (-0.018 + 0.012 * Math.cos(ph * 2)) * moving;
        sway = 0.012 * Math.sin(ph) * moving;
        twist = 0.1 * Math.sin(ph) * moving;
        // at the ends of the walk, the feet close to the standing stance
        const settle = w.leg === 'in' ? sm(T_IN[1] - 0.35, T_IN[1], t) : 1 - sm(T_OUT[0], T_OUT[0] + 0.25, t);
        if (settle > 0) {
          const M = person.root.matrixWorld;
          person.root.updateMatrixWorld(true);
          fl.p.lerp(_v.copy(stopFeet.l).applyMatrix4(M), settle); fl.lift *= 1 - settle; fl.pitch *= 1 - settle;
          fr.p.lerp(_v.copy(stopFeet.r).applyMatrix4(M), settle); fr.lift *= 1 - settle; fr.pitch *= 1 - settle;
        }
      }
      const { drift } = poseBody(person, K, t);
      if (walking) {
        person.model.position.x += sway;
        person.model.position.y += bob;
        person.model.updateMatrixWorld(true);
        person.rotateBone('pelvis', [0, twist * 0.6, 0.04 * Math.sin(ph)]);
      }
      person.root.updateMatrixWorld(true);
      if (walking) {
        plantFoot(person, 'l', fl.p, w.yaw + 0.08, fl.lift, fl.pitch);
        plantFoot(person, 'r', fr.p, w.yaw - 0.08, fr.lift, fr.pitch);
      } else {
        const M = person.root.matrixWorld;
        plantFoot(person, 'l', _v.copy(stopFeet.l).applyMatrix4(M), w.yaw + 0.12);
        plantFoot(person, 'r', _v.copy(stopFeet.r).applyMatrix4(M), w.yaw - 0.1);
      }
      poseSpine(person, K, t, drift);
      if (walking) person.rotateBone('spine_03', [0, -twist, 0]);
      // walking in: from the turn on, she looks at the flowers on the tray (they are on her right: her face turns from the eye)
      // (before that, along the pavement, she looks at the lit shop fronts on her right: her face stays from the eye)
      if (w.leg === 'in') {
        const look = 1 - sm(T_IN[1] - 0.9, T_IN[1] - 0.2, t);
        if (look > 0) {
          const want = Math.atan2(TRAY_AT.x - w.p.x, TRAY_AT.z - w.p.z);
          const k = sm(1.9, 2.6, t);
          const d = ((Math.max(-1.0, Math.min(0.0, angleDiff(want, w.yaw))) - 0.25) * k - 0.85 * (1 - k)) * look;
          person.rotateBone('spine_03', [0, d * 0.2, 0]);
          person.rotateBone('neck_01', [0, d * 0.35, 0]);
          person.rotateBone('head', [0, d * 0.45, 0]);
        }
      }
      this.walkPh = walking ? ph : null;
    },
    poseArm(s, t, props) {
      const { a, b } = around(K, t);
      const ph = this.walkPh ?? 0;
      // arm swing while walking with nothing in the hands
      const spec = (k) => (k === 'swingL' ? swingL(ph) : k === 'swingR' ? swingR(ph) : k);
      const K2 = [{ ...a, hl: spec(a.hl), hr: spec(a.hr) }, { ...b, hl: spec(b.hl), hr: spec(b.hr) }];
      poseArm(person, s, K2, t, props, s === 'r' ? [-0.3, 0.25, 0.3] : [0.3, 0.25, 0.3]);
    },
    measures(t) {
      const sp = field(K, t, 'spine');
      return { bend: clamp01(sp[0] / 0.3), twist: clamp01(Math.abs(sp[1]) / 0.2), walk: this.walkPh != null ? 1 : 0 };
    },
  };
}

const angleDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

// a polyline walked at constant speed, corners rounded by `round` metres
export class Path {
  constructor(pts, round = 0) {
    this.pts = pts;
    const roundAt = (i) => (Array.isArray(round) ? round[i - 1] ?? 0 : round);
    if ((Array.isArray(round) || round > 0) && pts.length > 2) {
      const out = [pts[0]];
      for (let i = 1; i < pts.length - 1; i++) {
        const a = pts[i - 1], b = pts[i], c = pts[i + 1];
        const r = Math.min(roundAt(i), a.distanceTo(b) * 0.45, b.distanceTo(c) * 0.45);
        const p0 = b.clone().add(a.clone().sub(b).setLength(r)), p1 = b.clone().add(c.clone().sub(b).setLength(r));
        for (let k = 0; k <= 6; k++) {
          const u = k / 6;
          out.push(p0.clone().multiplyScalar((1 - u) * (1 - u)).add(b.clone().multiplyScalar(2 * u * (1 - u))).add(p1.clone().multiplyScalar(u * u)));
        }
      }
      out.push(pts[pts.length - 1]);
      this.pts = out;
    }
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) this.cum.push(this.cum[i - 1] + this.pts[i].distanceTo(this.pts[i - 1]));
    this.len = this.cum[this.cum.length - 1];
  }
  seg(s) { let i = 0; while (i < this.cum.length - 2 && this.cum[i + 1] < s) i++; return i; }
  at(s, out) {
    const i = this.seg(s);
    const u = clamp01((s - this.cum[i]) / Math.max(1e-6, this.cum[i + 1] - this.cum[i]));
    return out.copy(this.pts[i]).lerp(this.pts[i + 1], u);
  }
  dir(s, out) { const i = this.seg(Math.min(s, this.len - 1e-4)); return out.subVectors(this.pts[i + 1], this.pts[i]).normalize(); }
}
