// Chớm world, season Đông: stand-ins for the main people (TẠM: chờ nhân vật chính trong people/<tên>/).
// Simple painted mannequins in the right places and the right main poses, early-2000s winter clothes, faces hidden
// (knit hats pulled low, scarves up, heads bowed toward the coals or the altar). Each figure is one painted hero whose
// drawing changes twelve times a second (on twos): the pose is rebuilt at load for every step of its loop and swapped.
//   seated(o)  a hand-warmer on a low stool: palms over the coals, now and then rubs them
//   seller(o)  the corn seller: turns a cob with her right hand, fans the coals with a bamboo fan
//   incense(o) upstairs, at the altar: incense raised to the forehead, three slow bows
// Each returns { group, update(t), caps(t) (capsules for the firelight shadows), solid }.
import * as THREE from 'three';
import { V3, Batch, hero, C, withC } from '../../core/build.js';

const TAU = Math.PI * 2;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const win = (t, a, b, c, d) => sm(a, b, t) * (1 - sm(c, d, t));
const lerp = (a, b, k) => a.clone().lerp(b, k);
const STEP = 1 / 12;

// a lofted shape along a polyline: rings = [{ c: V3, r: [side, front, back] }]
function loft(rings, seg = 18, side0 = V3(1, 0, 0)) {
  const n = rings.length, P = [], I = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = rings[Math.max(0, i - 1)].c, b = rings[Math.min(n - 1, i + 1)].c;
    const t = b.clone().sub(a).normalize();
    const x = side0.clone().addScaledVector(t, -side0.dot(t)).normalize();
    const z = new THREE.Vector3().crossVectors(x, t).normalize();
    const [rx, rf, rb = rf] = rings[i].r;
    const sq = rings[i].sq ?? 0.3;
    for (let k = 0; k <= seg; k++) {
      const ang = (k / seg) * TAU;
      let cx = Math.cos(ang), cz = Math.sin(ang);
      const e = 1 - sq * 0.55;
      cx = Math.sign(cx) * Math.abs(cx) ** e; cz = Math.sign(cz) * Math.abs(cz) ** e;
      const f = 1 + (rings[i].fold ?? 0.03) * Math.sin(ang * 5 + i * 1.3);
      v.copy(rings[i].c).addScaledVector(x, cx * rx * f).addScaledVector(z, cz * (cz > 0 ? rf : rb) * f);
      P.push(v.x, v.y, v.z);
    }
  }
  const S = seg + 1;
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) {
    const a = i * S + k, b = (i + 1) * S + k, c = i * S + k + 1, d = (i + 1) * S + k + 1;
    I.push(a, b, c, b, d, c);
  }
  const c0 = P.length / 3; P.push(...rings[0].c.toArray()); for (let k = 0; k < seg; k++) I.push(c0, k, k + 1);
  const c1 = P.length / 3; P.push(...rings[n - 1].c.toArray()); const o = (n - 1) * S; for (let k = 0; k < seg; k++) I.push(c1, o + k + 1, o + k);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- dressing a skeleton
// j: joints in the figure's local space (feet on y = 0, facing +z). dress: colours and what they wear
function body(j, dress) {
  const b = new Batch();
  const coat = withC(C.body, { col: dress.coat[0], col2: dress.coat[1], gloss: 0.25, erode: 0.45, hilite: 0.35, scale: 5, bump: 1.1 });
  const trou = withC(C.body, { col: dress.legs[0], col2: dress.legs[1], gloss: 0.2, erode: 0.4, hilite: 0.25, scale: 6, bump: 0.9 });
  const skin = withC(C.skin, { col: '#6a3e30', col2: '#c8906e' });
  const knit = withC(C.straw, { col: dress.hat[0], col2: dress.hat[1], gloss: 0.05, hilite: 0.15, scale: 14, bump: 1.4, erode: 0.3 });
  const scarf = withC(C.straw, { col: dress.scarf[0], col2: dress.scarf[1], gloss: 0.05, hilite: 0.2, scale: 12, bump: 1.3, erode: 0.3 });
  const shoe = withC(C.tyre, { col: '#141214', col2: '#4a4040' });
  // legs
  for (const s of ['L', 'R']) {
    b.capsule(j['hip' + s], j['kn' + s], dress.seated ? 0.078 : 0.07, trou);
    b.capsule(j['kn' + s], j['ft' + s].clone().add(V3(0, 0.07, 0)), 0.058, trou);
    const f = j['ft' + s];
    b.rbox(0.1, 0.07, 0.24, 0.03, f.clone().add(V3(0, 0.035, 0.05)), shoe, [0, j.footYaw ?? 0, 0]);
  }
  // the coat: a lofted body from its hem to the collar, a little wider at the hem
  const up = j.neck.clone().sub(j.pelvis).normalize();
  const hem = j.pelvis.clone().addScaledVector(up, dress.seated ? -0.06 : -0.3);
  const sh = lerp(j.chest, j.neck, 0.55);
  b.add(loft([
    { c: hem, r: [dress.seated ? 0.21 : 0.2, 0.17, 0.16], fold: 0.06 },
    { c: j.pelvis.clone().addScaledVector(up, 0.06), r: [0.19, 0.15, 0.15], fold: 0.04 },
    { c: j.chest, r: [0.19, 0.14, 0.14], fold: 0.03 },
    { c: sh, r: [0.19, 0.12, 0.12], fold: 0.02, sq: 0.5 },
    { c: lerp(sh, j.neck, 0.7), r: [0.1, 0.08, 0.08] },
  ], 20, j.side ?? V3(1, 0, 0)), coat);
  // arms: sleeves, and hands in knitted gloves or bare
  for (const s of ['L', 'R']) {
    b.capsule(j['sh' + s], j['el' + s], 0.058, coat);
    b.capsule(j['el' + s], j['ha' + s], 0.05, coat);
    const hd = j['ha' + s].clone().sub(j['el' + s]).normalize();
    b.blob(0.045, j['ha' + s].clone().addScaledVector(hd, 0.05), [1, 0.62, 1.25], dress.gloves ? knit : skin, s === 'L' ? 1.3 : 2.1, 1, 0.1);
  }
  // head: the back of the head, a knit hat pulled low (or hair in a bun), a scarf wound up to the nose
  const hdir = j.head.clone().sub(j.neck).normalize();
  b.capsule(j.neck, j.head, 0.045, skin);
  b.sphere(0.092, j.head, [1, 1.1, 1.05], skin, 18);
  if (dress.bun) {
    const hair = withC(C.hair, { col: '#1c1a1e', col2: '#8a8488' });
    b.sphere(0.098, j.head.clone().addScaledVector(hdir, 0.012).add(V3(0, 0, -0.01)), [1.02, 1.08, 1.06], hair, 18);
    b.sphere(0.05, j.head.clone().add(V3(0, -0.03, -0.1)), [1.1, 0.9, 0.8], hair, 12);
  } else {
    b.sphere(0.103, j.head.clone().addScaledVector(hdir, 0.03), [1, 0.95, 1.02], knit, 18);
    b.add(new THREE.TorusGeometry(0.098, 0.022, 8, 22), knit, new THREE.Matrix4().compose(j.head.clone().addScaledVector(hdir, -0.005), new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), hdir), V3(1, 1, 1)));
    if (dress.pom) b.sphere(0.035, j.head.clone().addScaledVector(hdir, 0.13), [1, 1, 1], knit, 10);
  }
  if (dress.scarfUp) {
    // wound over the chin and the mouth: it hides the face
    const fwd = V3(0, 0, 1);
    b.blob(0.075, j.head.clone().addScaledVector(hdir, -0.055).addScaledVector(fwd, 0.035), [1.35, 0.8, 1.2], scarf, 3.1, 2, 0.12);
  }
  b.add(new THREE.TorusGeometry(0.085, 0.04, 8, 18), scarf, new THREE.Matrix4().compose(lerp(j.neck, j.chest, 0.15), new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), up), V3(1, 1, 1)));
  b.capsule(lerp(j.neck, j.chest, 0.2).add(V3(0.06, 0, 0.1)), lerp(j.neck, j.chest, 0.2).add(V3(0.08, -0.26, 0.14)), 0.028, scarf);
  if (dress.extra) dress.extra(b, j);
  return b.merge();
}

// capsules for the firelight shadows, in world space
function capsOf(j, M) {
  const w = (p) => p.clone().applyMatrix4(M);
  return [
    [w(j.pelvis), w(j.neck), 0.16],
    [w(j.head), w(j.head), 0.11],
    [w(j.shL), w(j.haL), 0.055],
    [w(j.shR), w(j.haR), 0.055],
    [w(j.hipL), w(j.knL), 0.07],
    [w(j.hipR), w(j.knR), 0.07],
  ];
}

// a figure: pose(t) -> joints; the loop is sampled on twos and each drawing is built once
function figure({ at, face, loop, pose, dress, rims = true, phase = 0 }) {
  const g = new THREE.Group();
  g.position.copy(at);
  g.rotation.y = Math.atan2(face.x - at.x, face.z - at.z);
  g.updateMatrixWorld(true);
  const steps = Math.round(loop / STEP);
  const geos = new Array(steps).fill(null);
  const joints = new Array(steps).fill(null);
  const idx = (t) => ((Math.floor((t + phase) / STEP) % steps) + steps) % steps;
  const jointsAt = (i) => joints[i] ?? (joints[i] = pose(i * STEP));
  const geoAt = (i) => geos[i] ?? (geos[i] = body(jointsAt(i), dress));
  for (let i = 0; i < steps; i++) geoAt(i);
  const h = hero(geos[0], { rims, rimW: 2.1, rimOff: 1.3, tier: 0 });
  g.add(h);
  let cur = -1;
  return {
    group: g,
    update(t) {
      const i = idx(t);
      if (i === cur) return;
      cur = i;
      h.traverse((m) => { if (m.isMesh) m.geometry = geos[i]; });
    },
    caps: (t) => capsOf(jointsAt(idx(t)), g.matrixWorld),
    joints: (t) => jointsAt(idx(t)),
    matrix: g.matrixWorld,
  };
}

// ---------------------------------------------------------------- seated on a low stool, warming the hands
const seatedBase = (lean = 0) => ({
  pelvis: V3(0, 0.4, 0), chest: V3(0, 0.71, 0.07 + lean), neck: V3(0, 0.87, 0.13 + lean * 1.4), head: V3(0, 0.975, 0.2 + lean * 1.6),
  hipL: V3(0.1, 0.37, 0.03), hipR: V3(-0.1, 0.37, 0.03), knL: V3(0.14, 0.47, 0.34), knR: V3(-0.14, 0.47, 0.34),
  ftL: V3(0.15, 0.0, 0.38), ftR: V3(-0.15, 0.0, 0.38),
  shL: V3(0.18, 0.83, 0.1 + lean), shR: V3(-0.18, 0.83, 0.1 + lean),
});
export function seated({ at, face, dress, phase = 0, rub = [3.6, 5.0], loop = 6, reach = 0.5 }) {
  return figure({
    at, face, loop, dress: { seated: true, gloves: false, ...dress }, phase,
    pose(t) {
      const j = seatedBase(0.03 + 0.015 * Math.sin((t / loop) * TAU));
      // palms held over the coals; between rub[0] and rub[1] the hands come together and rub
      const k = win(t, rub[0], rub[0] + 0.35, rub[1] - 0.35, rub[1]);
      const rubS = Math.sin((t - rub[0]) * TAU * 2.2) * 0.03 * k;
      const lift = 0.02 * Math.sin((t / loop) * TAU * 2);
      j.haL = V3(0.13 - 0.08 * k + rubS, 0.58 + lift + 0.04 * k, reach - 0.04 * k);
      j.haR = V3(-0.13 + 0.08 * k + rubS, 0.58 - lift + 0.04 * k, reach - 0.04 * k);
      j.elL = V3(0.22, 0.62, 0.3); j.elR = V3(-0.22, 0.62, 0.3);
      // the head nods toward the warmth
      j.head.z += 0.02 * k;
      return j;
    },
  });
}

// the corn seller: right hand turns the cobs, left hand fans the coals
export function seller({ at, face, dress, phase = 0, loop = 6, fan, corn }) {
  const fig = figure({
    at, face, loop, dress: { seated: true, ...dress, extra: (b, j) => {
      // the bamboo fan (quạt nan) in the left hand: a flat round blade on a handle
      const fanC = withC(C.straw, { col: '#6a5028', col2: '#d8b870', scale: 16, bump: 1.2 });
      const hd = j.haL.clone();
      const n = j.fanN;
      const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), n);
      b.add(new THREE.CylinderGeometry(0.13, 0.13, 0.008, 20).rotateX(Math.PI / 2), fanC, new THREE.Matrix4().compose(hd.clone().add(j.fanOff), q, V3(1, 1.15, 1)));
      b.rod(hd, hd.clone().add(j.fanOff.clone().multiplyScalar(0.4)), 0.008, fanC, 5);
    } },
    phase,
    pose(t) {
      const j = seatedBase(0.05);
      j.head.z += 0.03;
      // right hand: rests on the knee, reaches to a cob at 0.5 s, turns it (1.2-2.0), comes back by 2.6
      const reach = win(t, 0.5, 1.1, 2.1, 2.7);
      const turn = sm(1.2, 2.0, t);
      const rest = V3(-0.14, 0.52, 0.34);
      const cob = corn.clone();
      cob.y += 0.02;
      const onCob = cob.clone().add(V3(0.03 * Math.sin(turn * Math.PI), 0.015 * Math.sin(turn * Math.PI), 0));
      j.haR = lerp(rest, onCob, reach);
      j.elR = lerp(V3(-0.24, 0.6, 0.2), V3(-0.2, 0.6, 0.3), reach);
      // left hand: the fan. Beats on twos between 3.0 and 5.2 s, otherwise it rests on her lap
      const f = win(t, 2.9, 3.2, 5.0, 5.3);
      const beat = Math.sin((t - 3.0) * TAU * 1.6);
      const fanAt = V3(0.14, 0.44 + 0.04 * beat * f, 0.44);
      j.haL = lerp(V3(0.12, 0.5, 0.3), fanAt, f);
      j.elL = lerp(V3(0.22, 0.6, 0.18), V3(0.24, 0.56, 0.24), f);
      // the fan's face turns down toward the coals as it beats
      const tilt = -0.5 - 0.5 * f - 0.35 * beat * f;
      j.fanN = V3(0, Math.cos(tilt + Math.PI / 2), Math.sin(tilt + Math.PI / 2)).normalize().lerp(V3(0.3, 0.9, 0.2), 1 - f).normalize();
      j.fanOff = lerp(V3(0.04, 0.02, 0.12), V3(0.0, -0.02, 0.15), f);
      return j;
    },
  });
  // how far the cob under her hand has turned (0..1 per loop), for the grill
  fig.turn = (t) => sm(1.2, 2.0, (((t + phase) % loop) + loop) % loop);
  return fig;
}

// upstairs: raising incense to the forehead, three slow bows
export function incense({ at, face, dress, phase = 0, loop = 12 }) {
  const fig = figure({
    at, face, loop, dress: { seated: false, bun: true, ...dress, extra: (b, j) => {
      // three sticks in the joined hands, the tips glowing
      const stem = withC(C.redPlastic, { col: '#6a1810', col2: '#c0503a', gloss: 0, scale: 20, bump: 0.3 });
      const tipC = withC(C.kumquat, { col: '#ff6a20', col2: '#ffd080', emit: 1.4, hilite: 0, erode: 0 });
      for (const dx of [-0.012, 0, 0.012]) {
        const a = j.stick0.clone().add(V3(dx, 0, 0)), e = j.stick1.clone().add(V3(dx * 2.5, 0, 0));
        b.rod(a, e, 0.0035, stem, 4);
        b.sphere(0.006, e, [1, 1.6, 1], tipC, 6);
      }
    } },
    phase, rims: true,
    pose(t) {
      // bows at 1.5, 4.0, 6.5 s (down 0.8 s, hold, up 0.9 s); hands at the forehead the whole time
      let bow = 0;
      for (const b0 of [1.5, 4.0, 6.5]) bow = Math.max(bow, win(t, b0, b0 + 0.8, b0 + 1.2, b0 + 2.1));
      const raise = win(t, 0.2, 0.9, 9.4, 10.4);
      const a = 0.42 * bow;
      const piv = V3(0, 0.86, 0);
      const rot = (p) => p.clone().sub(piv).applyAxisAngle(V3(1, 0, 0), a).add(piv);
      const j = {
        pelvis: V3(0, 0.88, -0.02 * bow), hipL: V3(0.1, 0.84, 0), hipR: V3(-0.1, 0.84, 0),
        knL: V3(0.1, 0.45, 0.03), knR: V3(-0.1, 0.45, 0.03), ftL: V3(0.11, 0, 0.02), ftR: V3(-0.11, 0, 0.02),
        chest: rot(V3(0, 1.22, 0.02)), neck: rot(V3(0, 1.38, 0.03)), head: rot(V3(0, 1.49, 0.07)),
        shL: rot(V3(0.17, 1.33, 0.02)), shR: rot(V3(-0.17, 1.33, 0.02)),
      };
      // hands: joined in front of the forehead when raised, at the chest otherwise
      const hi = rot(V3(0, 1.45, 0.24)), lo = rot(V3(0, 1.1, 0.26));
      const hands = lerp(lo, hi, raise);
      j.haL = hands.clone().add(V3(0.035, 0, 0));
      j.haR = hands.clone().add(V3(-0.035, 0, 0));
      j.elL = rot(lerp(V3(0.2, 1.02, 0.16), V3(0.19, 1.18, 0.2), raise));
      j.elR = rot(lerp(V3(-0.2, 1.02, 0.16), V3(-0.19, 1.18, 0.2), raise));
      const up = rot(V3(0, 1.49, 0.07)).sub(rot(V3(0, 0.86, 0))).normalize();
      j.stick0 = hands.clone().add(V3(0, 0.02, 0.03));
      j.stick1 = j.stick0.clone().addScaledVector(up, 0.3).add(V3(0, 0, 0.06));
      j.side = V3(1, 0, 0);
      return j;
    },
  });
  // the burning tips in the joined hands (world), for the hand-held smoke
  fig.tip = (t) => fig.joints(t).stick1.clone().applyMatrix4(fig.matrix);
  return fig;
}
