// Chớm world: the placeholder people (the old people of paint tests D-G), used until the new ones arrive in people/<name>/.
// Chớm paint test D: the people. Everything about bodies, poses and gesture loops lives here, behind one seam:
//
//   buildPeople(scene, R, layout) -> crowd
//     layout.seller   = { at: V3, face: V3 }      where she sits (ground point) and the point she turns toward
//     layout.customer = { at: V3, face: V3 }      where she stands and the point she turns toward
//     layout.exchange = V3                        world point where the note passes from hand to hand
//     layout.bike     = motorbike group            the rider is seated on it (local seat (-0.22, 0.5, 0), bars at (0.6, 1.02, +-0.28))
//     layout.walker   = (t) => ({ z, visible })   where the walker under the umbrella is along the far pavement (x = layout.walkerX)
//   crowd.update(t)            poses every loop for time t (6 s market loop; bike and walker loops follow their own clocks)
//   crowd.sketch               [object, sketch options] pairs for the loose white lines
//   crowd.shadows              painted ground shadows [x, z, rx, rz]
//   crowd.holds                the props that ride in hands: branch (customer's right hand), note (customer's left -> seller's left),
//                              bouquet (seller's left hand, set on her lap while she takes the money)
//   crowd.swayCenters          world points the cursor breeze uses for the people's props
//
// To replace the people later, keep this seam and swap the insides.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heroAttrs } from '../../core/paint.js';
import { V3, Batch, hero, heroOf, mat, C, withC, peachBranch, TIER2 } from '../../core/build.js';

const Yax = V3(0, 1, 0);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const win = (t, a, b, c, d) => sm(a, b, t) * (1 - sm(c, d, t));

// ---------------------------------------------------------------- lofted forms: a body is a stack of rings, each with its own width,
// front depth, back depth, squareness and cloth folds
// ring: { c: centre, r: [half width, front depth, back depth], sq, fold, n, n2, ph, side }
export function loft(rings, { seg = 28, side = V3(1, 0, 0), capA = true, capB = true } = {}) {
  const n = rings.length, P = [], I = [];
  const X = [], Z = [];
  for (let i = 0; i < n; i++) {
    const a = rings[Math.max(0, i - 1)].c, b = rings[Math.min(n - 1, i + 1)].c;
    const t = b.clone().sub(a).normalize();
    const x = (rings[i].side ?? side).clone();
    x.addScaledVector(t, -x.dot(t)).normalize();
    X.push(x); Z.push(new THREE.Vector3().crossVectors(x, t).normalize());
  }
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const R = rings[i];
    const [rx, rf, rb = rf] = R.r;
    for (let k = 0; k <= seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      let cx = Math.cos(a), cz = Math.sin(a);
      if (R.sq) { const e = 1 - R.sq * 0.55; cx = Math.sign(cx) * Math.abs(cx) ** e; cz = Math.sign(cz) * Math.abs(cz) ** e; }
      const f = 1 + (R.fold || 0) * (0.6 * Math.sin(a * (R.n || 5) + (R.ph || 0)) + 0.4 * Math.sin(a * (R.n2 || 9) + (R.ph || 0) * 1.7));
      v.copy(R.c).addScaledVector(X[i], cx * rx * f).addScaledVector(Z[i], cz * (cz > 0 ? rf : rb) * f);
      P.push(v.x, v.y, v.z);
    }
  }
  const S = seg + 1;
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) {
    const a = i * S + k, b = (i + 1) * S + k, c = i * S + k + 1, d = (i + 1) * S + k + 1;
    I.push(a, b, c, b, d, c);
  }
  if (capA) { const c0 = P.length / 3; P.push(...rings[0].c.toArray()); for (let k = 0; k < seg; k++) I.push(c0, k, k + 1); }
  if (capB) { const c1 = P.length / 3; P.push(...rings[n - 1].c.toArray()); const o = (n - 1) * S; for (let k = 0; k < seg; k++) I.push(c1, o + k + 1, o + k); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}
// rings along a bent limb: points a -> b -> c, radius from a profile [[t, r, fold]]
function limbRings(pts, prof, { n = 14, side = V3(1, 0, 0), foldN = 5, ph = 0, flat = 1 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let k = 0;
    while (k < prof.length - 2 && prof[k + 1][0] < t) k++;
    const [t0, r0, f0 = 0] = prof[k], [t1, r1, f1 = 0] = prof[k + 1];
    const u = THREE.MathUtils.clamp((t - t0) / Math.max(1e-6, t1 - t0), 0, 1);
    const s = u * u * (3 - 2 * u);
    const r = r0 + (r1 - r0) * s;
    out.push({ c: curve.getPoint(t), r: [r, r * flat, r * flat], fold: f0 + (f1 - f0) * s, n: foldN, n2: foldN * 2 + 1, ph: ph + t * 2.3, side });
  }
  return out;
}

// ---------------------------------------------------------------- people (no faces: a bowed conical hat, a hood seen from behind, a helmet)
// Arms are three pieces placed every frame by a two-bone solver, so a hand can go exactly where the story needs it.
function handGeo(skin, thumbSide) {
  const b = new Batch();
  const s = thumbSide;
  // palm: thick at the heel, thinner toward the knuckles
  b.add(loft([
    { c: V3(0, -0.004, 0), r: [0.022, 0.012, 0.012] },
    { c: V3(0, 0.012, 0.001), r: [0.03, 0.016, 0.015], sq: 0.5 },
    { c: V3(0, 0.05, 0.002), r: [0.037, 0.014, 0.014], sq: 0.7 },
    { c: V3(0, 0.082, 0.004), r: [0.036, 0.011, 0.012], sq: 0.6 },
  ], { seg: 16 }), { ...skin, smooth: true });
  // four fingers, curled a little toward the palm (+z)
  const fx = [-0.024, -0.008, 0.008, 0.023].map((x) => x * -s);
  const fl = [0.05, 0.058, 0.055, 0.042];
  fx.forEach((x, i) => {
    const r = i === 0 ? 0.0078 : 0.0088;
    const k0 = V3(x, 0.084, 0.006), k1 = V3(x * 1.05, 0.084 + fl[i] * 0.55, 0.012), k2 = V3(x * 1.08, 0.084 + fl[i] * 0.95, 0.03);
    b.capsule(k0, k1, r, skin);
    b.capsule(k1, k2, r * 0.9, skin);
  });
  // the thumb, from the heel of the palm, across the front
  const t0 = V3(0.024 * s, 0.018, 0.01), t1 = V3(0.042 * s, 0.045, 0.024), t2 = V3(0.046 * s, 0.07, 0.036);
  b.capsule(t0, t1, 0.0115, skin);
  b.capsule(t1, t2, 0.0098, skin);
  return b.merge();
}

function sleeveGeo(len, r0, r1, cloth, { cuff, bunch = 0.05, cap = true, ph = 0 } = {}) {
  const rings = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = r0 + (r1 - r0) * t;
    // cloth bunches toward the elbow end
    rings.push({ c: V3(0, len * t, 0), r: [r, r * 0.94, r * 0.98], fold: bunch * (0.3 + 0.7 * t * t), n: 3, n2: 5, ph: ph + t * 3.1 });
  }
  const b = new Batch();
  b.add(loft(rings, { seg: 18 }), { ...cloth, smooth: true });
  if (cap) b.sphere(r0 * 1.02, V3(0, 0, 0), [1, 1, 1], cloth, 16);
  if (cuff) {
    b.add(loft([
      { c: V3(0, len - 0.035, 0), r: [r1 * 1.02, r1, r1] },
      { c: V3(0, len - 0.005, 0), r: [r1 * 1.1, r1 * 1.08, r1 * 1.08] },
      { c: V3(0, len + 0.004, 0), r: [r1 * 1.08, r1 * 1.05, r1 * 1.05] },
      { c: V3(0, len + 0.004, 0), r: [r1 * 0.55, r1 * 0.5, r1 * 0.5] },
    ], { seg: 18, capA: false, capB: true }), { ...cuff, smooth: true });
  }
  return b.merge();
}

function makeArm(parent, { l1, l2, r1, r2, sleeve, skin, cuff, side, tier, rimW, rims }) {
  const upper = hero(sleeveGeo(l1, r1, r1 * 0.84, sleeve, { bunch: 0.06, ph: side }), { rimW, tier, rims });
  const geos = [sleeveGeo(l2 - 0.012, r2, r2 * 0.92, sleeve, { cuff: cuff ?? withC(sleeve, {}), bunch: 0.035, cap: true, ph: side * 2 })];
  // the wrist, coming out of the cuff
  const w = new THREE.CapsuleGeometry(0.02, 0.05, 4, 10);
  w.translate(0, l2 - 0.01, 0);
  geos.push(heroAttrs(w, { ...skin, smooth: true }));
  const fore = hero(mergeGeometries(geos, false), { rimW, tier, rims });
  const hand = hero(handGeo(skin, side), { rimW: rimW * 0.85, tier, rims });
  parent.add(upper, fore, hand);
  return { upper, fore, hand, l1, l2 };
}
const _d = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Vector3(), _w = new THREE.Vector3(), _m = new THREE.Matrix4();
// place an arm: S shoulder, T wrist target, pole = where the elbow points, palm = palm facing, point = where the fingers point
export function solveArm(arm, S, T, pole, palm, point) {
  _d.copy(T).sub(S);
  const L = arm.l1 + arm.l2;
  let len = _d.length();
  const dir = _d.normalize();
  len = Math.min(Math.max(len, Math.abs(arm.l1 - arm.l2) + 0.02), L - 0.002);
  _w.copy(S).addScaledVector(dir, len);
  const a = (arm.l1 * arm.l1 - arm.l2 * arm.l2 + len * len) / (2 * len);
  const h = Math.sqrt(Math.max(0, arm.l1 * arm.l1 - a * a));
  _p.copy(pole).addScaledVector(dir, -pole.dot(dir)).normalize();
  _e.copy(S).addScaledVector(dir, a).addScaledVector(_p, h);
  arm.upper.position.copy(S);
  arm.upper.quaternion.setFromUnitVectors(Yax, _d.copy(_e).sub(S).normalize());
  arm.fore.position.copy(_e);
  const fd = _d.copy(_w).sub(_e).normalize().clone();
  arm.fore.quaternion.setFromUnitVectors(Yax, fd);
  const y = fd.clone().lerp(point ?? fd, 0.6).normalize();
  const z = palm.clone().addScaledVector(y, -palm.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  arm.hand.position.copy(_w);
  arm.hand.quaternion.setFromRotationMatrix(_m.makeBasis(x, y, z));
  return _w;
}

// torso rings, relative to the waist pivot. hunch rounds the upper back forward; the jacket hem hangs below the pivot
function torsoRings(o) {
  const H = o.hunch ?? 0;
  const F = o.torsoFold ?? 0.012;
  const rows = [
    // y,     half width, front, back, sq,  fold
    [-0.13, 0.175, 0.13, 0.14, 0.2, F * 2.2],
    [-0.04, 0.165, 0.118, 0.13, 0.2, F * 1.6],
    [0.06, 0.152, 0.104, 0.118, 0.25, F],
    [0.16, 0.156, 0.108, 0.118, 0.3, F],
    [0.27, 0.172, 0.12, 0.128, 0.35, F * 0.8],
    [0.37, 0.188, 0.128, 0.138, 0.4, F * 0.6],
    [0.45, 0.2, 0.12, 0.132, 0.5, F * 0.5],
    [0.505, 0.206, 0.1, 0.11, 0.55, 0],
    [0.545, 0.17, 0.08, 0.09, 0.45, 0],
    [0.575, 0.105, 0.062, 0.07, 0.2, 0],
    [0.595, 0.062, 0.052, 0.056, 0, 0],
  ];
  return rows.map(([y, w, f, b, sq, fold], i) => ({
    c: V3(0, y, H * Math.max(0, y - 0.15) ** 2 * 3.2 - (y > 0.2 ? 0.006 : 0)),
    r: [w, f, b + H * 0.05 * Math.max(0, Math.sin((y - 0.15) * 7))], sq, fold, n: 6, n2: 11, ph: i * 0.7 + (o.seed || 0),
  }));
}

export function person(scene, o) {
  const g = new THREE.Group();
  scene.add(g);
  const tier = o.tier ?? 0;
  const rimW = o.rimW ?? 2.35;
  const rims = rimW > 0;   // secondary people carry no colour bands
  const heroes = [];
  const H = (obj, parent = g) => { parent.add(obj); heroes.push(obj); return obj; };
  const coat = o.coat, skin = C.skin;
  const legs = new Batch();
  const torsoPivot = new THREE.Group();
  const headPivot = new THREE.Group();
  g.add(torsoPivot);
  const shoe = withC(C.tyre, { col: '#1a1614', col2: '#6a5a50' });
  const legOf = (hip, knee, ankle, prof, ph) => legs.add(loft(limbRings([hip, hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(ankle, 0.5), ankle], prof, { n: 16, foldN: 4, ph, side: V3(1, 0, 0) })), { ...o.pants, smooth: true });
  const trouser = [[0, 0.074, 0.02], [0.3, 0.064, 0.03], [0.5, 0.054, 0.07], [0.72, 0.052, 0.04], [1, 0.05, 0.08]];
  const footAt = (ank, yaw) => {
    legs.capsule(ank.clone().add(V3(0, -0.03, 0)), ank.clone().add(V3(0, 0.02, 0)), 0.024, skin);
    const fwd = V3(Math.sin(yaw), 0, Math.cos(yaw));
    const toe = ank.clone().addScaledVector(fwd, 0.13); toe.y = 0.022;
    const heel = ank.clone().addScaledVector(fwd, -0.02); heel.y = 0.028;
    legs.capsule(heel, toe, 0.024, shoe);
  };
  if (o.seated) {
    if (!o.noStool) {
      // a low plastic stool
      const sb = new Batch();
      sb.rbox(0.3, 0.035, 0.3, 0.012, V3(0, 0.26, -0.04), withC(C.redPlastic, { col: '#4a3a44', col2: '#9a8a98' }));
      for (const [x, z] of [[-0.12, -0.16], [0.12, -0.16], [-0.12, 0.08], [0.12, 0.08]]) sb.cyl(0.018, 0.026, 0.25, V3(x, 0.125, z), withC(C.redPlastic, { col: '#4a3a44', col2: '#9a8a98' }), 10, [(z + 0.04) * 0.4, 0, -x * 0.4]);
      H(heroOf(sb, { rims: false, tier: TIER2 }));
    }
    const ky = o.noStool ? 0.36 : 0.5, kz = o.noStool ? 0.36 : 0.34;
    for (const s of [-1, 1]) {
      const hip = V3(s * 0.1, 0.34, -0.03), knee = V3(s * (o.noStool ? 0.15 : 0.16), ky, kz), ank = V3(s * 0.14, o.noStool ? 0.04 : 0.1, o.noStool ? 0.3 : 0.4);
      legOf(hip, knee, ank, trouser, s);
      footAt(ank, s * 0.15);
    }
    // seat: the hips and the jacket over them
    legs.sphere(0.12, V3(0, 0.35, -0.07), [1.2, 0.62, 1.0], o.pants, 18);
    torsoPivot.position.set(0, 0.34, -0.04);
  } else {
    // standing, weight on the right leg (-x): that hip sits higher, the left knee eases forward
    const hr = V3(-0.088, 0.915, 0), hl = V3(0.09, 0.885, 0);
    const kr = V3(-0.095, 0.5, 0.012), kl = V3(0.13, 0.49, 0.075);
    const ar = V3(-0.1, 0.085, -0.01), al = V3(0.165, 0.085, 0.045);
    legOf(hr, kr, ar, trouser, 1);
    legOf(hl, kl, al, trouser, 2);
    footAt(ar, -0.1);
    footAt(al, 0.45);
    torsoPivot.position.set(-0.005, 0.9, 0);
    if (o.skirt) {
      // the raincoat below the waist: flares and folds toward the hem, pushed forward by the eased knee
      const sk = [];
      const rows = [[1.04, 0.16, 0.11, 0.12, 0], [0.92, 0.19, 0.13, 0.14, 0.01], [0.78, 0.215, 0.15, 0.16, 0.03], [0.64, 0.24, 0.17, 0.18, 0.055], [0.5, 0.265, 0.19, 0.2, 0.08], [0.43, 0.275, 0.2, 0.21, 0.09]];
      for (const [y, w, f, b, fold] of rows) sk.push({ c: V3(0.02 * (1.0 - y), y, 0.035 * (1.0 - y)), r: [w, f, b], fold, n: 7, n2: 12, ph: 0.4 + y * 2, sq: 0.1 });
      legs.add(loft(sk.reverse(), { seg: 36 }), { ...coat, smooth: true });
    }
  }
  if (o.bag) {
    legs.rbox(0.19, 0.15, 0.07, 0.03, V3(-0.25, 0.96, 0.04), o.bag, [0, 0.3, 0.1]);
  }
  H(heroOf(legs, { rimW, tier, rims }));

  // torso: a lofted jacket or raincoat, shoulders, collar
  const tb = new Batch();
  tb.add(loft(torsoRings(o), { seg: 36 }), { ...coat, smooth: true });
  for (const s of [-1, 1]) tb.sphere(0.064, V3(s * 0.19, 0.488, 0.0), [1.05, 0.92, 1.02], coat, 18);
  if (o.scarf) tb.add(new THREE.TorusGeometry(0.068, 0.03, 10, 28), o.scarf, mat(V3(0, 0.585, 0.008), [Math.PI / 2 + 0.25, 0, 0]));
  if (o.bag) tb.add(new THREE.TorusGeometry(0.21, 0.007, 6, 40, Math.PI * 1.05), o.bag, mat(V3(0.0, 0.28, 0.0), [0.1, 0, 1.0]));
  if (o.apron) tb.add(loft([{ c: V3(0, -0.12, 0.01), r: [0.19, 0.145, 0.02] }, { c: V3(0, 0.1, 0.01), r: [0.165, 0.12, 0.02] }], { seg: 28, capA: false, capB: false }), { ...o.apron, smooth: true });
  if (o.hat === 'hood') {
    // the hood lies back over the shoulders: a soft collar of cloth
    tb.add(loft([
      { c: V3(0, 0.49, -0.01), r: [0.2, 0.1, 0.15], fold: 0.03, n: 5, ph: 1 },
      { c: V3(0, 0.56, -0.02), r: [0.15, 0.085, 0.13], fold: 0.03, n: 5, ph: 1.5 },
      { c: V3(0, 0.62, -0.03), r: [0.1, 0.07, 0.11] },
    ], { seg: 30, capA: false }), { ...coat, smooth: true });
  }
  H(heroOf(tb, { rimW, tier, rims }), torsoPivot);

  // head
  torsoPivot.add(headPivot);
  const hy = 0.6, hz = (o.hunch ?? 0) * (hy - 0.15) ** 2 * 3.2;
  headPivot.position.set(0, hy, hz);
  const hb = new Batch();
  hb.capsule(V3(0, -0.03, -0.005), V3(0, 0.07, 0.012), 0.042, skin);
  hb.sphere(0.093, V3(0, 0.14, 0.012), [0.84, 1.1, 1.02], o.hat === 'non' ? skin : coat, 24);
  if (o.hat === 'non') {
    hb.sphere(0.097, V3(0, 0.155, -0.004), [0.87, 1.06, 1.0], C.hair, 22);
    hb.blob(0.044, V3(0, 0.1, -0.1), [1.1, 0.9, 0.9], C.hair, 1.3, 2, 0.12);
    // nón lá: a real cone with a slight sag, ribs of palm leaf, a thin rim
    const prof = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push([0.004 + 0.236 * t, 0.165 * (1 - t) - 0.012 * Math.sin(t * Math.PI)]); }
    prof.push([0.238, -0.004], [0.2, 0.012], [0.02, 0.15]);
    hb.lathe(prof, V3(0, 0.215, 0.015), withC(C.straw, { smooth: true }), 56);
    for (let r = 1; r <= 4; r++) hb.add(new THREE.TorusGeometry(0.236 * r / 5, 0.0022, 4, 48), withC(C.straw, { col: '#6a5030', col2: '#c8a870' }), mat(V3(0, 0.215 + 0.165 * (1 - r / 5) - 0.01 * Math.sin(r / 5 * Math.PI) + 0.002, 0.015), [Math.PI / 2, 0, 0]));
    hb.add(new THREE.TorusGeometry(0.238, 0.0045, 6, 56), C.straw, mat(V3(0, 0.213, 0.015), [Math.PI / 2, 0, 0]));
  } else if (o.hat === 'hood') {
    // the hood up, seen from behind: a soft peak at the back of the crown, folds where it gathers
    hb.add(loft([
      { c: V3(0, -0.01, -0.02), r: [0.12, 0.1, 0.13], fold: 0.03, n: 4, ph: 0.3 },
      { c: V3(0, 0.07, -0.03), r: [0.128, 0.11, 0.14], fold: 0.025, n: 4, ph: 0.8 },
      { c: V3(0, 0.15, -0.03), r: [0.125, 0.11, 0.14], fold: 0.015, n: 3, ph: 1.1 },
      { c: V3(0, 0.22, -0.04), r: [0.105, 0.095, 0.12], fold: 0.01, n: 3 },
      { c: V3(0, 0.265, -0.06), r: [0.06, 0.05, 0.07] },
      { c: V3(0, 0.275, -0.085), r: [0.012, 0.01, 0.012] },
    ], { seg: 32 }), { ...coat, smooth: true });
    hb.sphere(0.086, V3(0, 0.13, 0.08), [0.95, 1.1, 0.3], withC(C.tyre, { col: '#06080a', col2: '#1a2228', gloss: 0 }), 14);
  } else if (o.hat === 'helmet') {
    hb.sphere(0.128, V3(0, 0.16, 0), [1, 0.95, 1.12], o.helmet, 24);
    hb.sphere(0.068, V3(0, 0.07, 0.07), [1.15, 0.85, 0.7], withC(C.paper, { col: '#6a5a60', col2: '#c8b8bc' }), 12);
  }
  const head = H(heroOf(hb, { rimW, tier, rims }), headPivot);

  // arms
  const armOpt = { l1: 0.285 * o.s, l2: 0.25 * o.s, r1: 0.056, r2: 0.047, sleeve: coat, skin, cuff: o.cuff, tier, rimW: rimW * 0.9, rims };
  const arms = [makeArm(g, { ...armOpt, side: -1 }), makeArm(g, { ...armOpt, side: 1 })]; // 0 = left (+x), 1 = right (-x)
  for (const a of arms) heroes.push(a.upper, a.fore, a.hand);
  const shoulders = [new THREE.Object3D(), new THREE.Object3D()];
  shoulders[0].position.set(0.185, 0.49, 0); shoulders[1].position.set(-0.185, 0.49, 0);
  torsoPivot.add(...shoulders);
  g.scale.setScalar(o.scale ?? 1);
  return { group: g, torso: torsoPivot, head: headPivot, arms, shoulders, heroes, headObj: head };
}
// shoulder position in the person's own space
const _sw = new THREE.Vector3();
export function shoulderLocal(P, i) {
  P.shoulders[i].updateWorldMatrix(true, false);
  P.shoulders[i].getWorldPosition(_sw);
  return P.group.worldToLocal(_sw).clone();
}

// ---------------------------------------------------------------- a walker under an umbrella (far pavement)
function buildWalker(scene) {
  const P = person(scene, { seated: false, coat: withC(C.body, { col: '#3a3844', col2: '#8a8898' }), pants: withC(C.tyre, { col: '#141418', col2: '#4a4a58' }), hat: 'hood', s: 1, skirt: true, tier: 0.2, rimW: 0 });
  const ub = new Batch();
  ub.add(new THREE.ConeGeometry(0.55, 0.22, 16, 1, true), withC(C.body, { col: '#40383c', col2: '#8a7a80', gloss: 0.4, smooth: true }), mat(V3(0, 0, 0)));
  ub.rod(V3(0, -0.72, 0), V3(0, 0.14, 0), 0.008, C.steel);
  const umb = hero(ub.merge(), { rims: false, tier: 0.2 });
  umb.userData.main.material.side = THREE.DoubleSide;
  P.group.add(umb);
  return { P, umb };
}

// ---------------------------------------------------------------- the seam
const MX = (v) => V3(-v.x, v.y, v.z);
const lerpV = (a, b, t) => a.clone().lerp(b, t);
const faceY = (at, face) => Math.atan2(face.x - at.x, face.z - at.z);

export function buildPeople(scene, R, layout) {
  const plays = (role) => !layout.roles || layout.roles.includes(role);
  const sketch = [], shadows = [];
  const EXCH = layout.exchange.clone();
  const toLocal = (P, w) => P.group.worldToLocal(w.clone());

  // the seller: on a low stool by her shop, nón lá bowed over the bouquet she is wrapping
  const seller = person(scene, {
    seated: true, s: 1, hunch: 0.05, seed: 1.3,
    coat: withC(C.body, { col: '#161a28', col2: '#56607e', gloss: 0.55, hilite: 0.7 }),
    pants: withC(C.body, { col: '#0c0d12', col2: '#3a3e4a', gloss: 0.35, hilite: 0.5 }),
    apron: withC(C.body, { col: '#3a3634', col2: '#8a847a', gloss: 0.2, hilite: 0.3 }),
    scarf: withC(C.body, { col: '#6a3040', col2: '#d8889a', gloss: 0.2, hilite: 0.4 }),
    hat: 'non', cuff: withC(C.body, { col: '#161a28', col2: '#6a7494' }),
  });
  seller.group.position.copy(layout.seller.at);
  seller.group.rotation.y = faceY(layout.seller.at, layout.seller.face);
  const bq = new Batch({ wind: true });
  bq.add(new THREE.ConeGeometry(0.1, 0.34, 24, 1, true).rotateX(Math.PI), { ...C.paper, smooth: true }, null, 0, 3);
  bq.add(new THREE.TorusGeometry(0.035, 0.01, 8, 20).rotateX(Math.PI / 2), withC(C.redPlastic, { col: '#7a2a30', col2: '#d8606a' }), null, 0, 3);
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4, r = 0.03 + 0.05 * Math.sqrt(k / 9);
    bq.blob(0.036, V3(Math.cos(a) * r, 0.2 + (k % 3) * 0.02, Math.sin(a) * r), [1, 0.8, 1], k % 3 ? C.blossom : C.blossomW, a, 1, 0.3, 0.3, 3);
  }
  for (let k = 0; k < 14; k++) bq.sphere(0.009, V3((R() - 0.5) * 0.16, 0.22 + R() * 0.08, (R() - 0.5) * 0.16), [1, 1, 1], { ...C.blossomW, col: '#d8d0c8', col2: '#fffaf4' }, 6, [0, 0, 0], 0.3, 3);
  const bouquet = hero(bq.merge(), { wind: true, rimW: 1.8 });
  seller.group.add(bouquet);

  // the customer: raincoat hood up, her back to us, weight on one leg, turning a peach branch in her hand
  const customer = person(scene, {
    seated: false, s: 1, scale: 0.95, skirt: true, hunch: 0.0, seed: 2.1, torsoFold: 0.016,
    coat: withC(C.body, { col: '#10191e', col2: '#4c6a72', gloss: 1, hilite: 0.9 }),
    pants: withC(C.body, { col: '#141216', col2: '#4a4450', gloss: 0.3, hilite: 0.4 }), hat: 'hood',
    cuff: withC(C.body, { col: '#10191e', col2: '#5a7a82' }),
    bag: withC(C.body, { col: '#2a1c16', col2: '#9a7458', gloss: 0.5, hilite: 0.5 }),
  });
  customer.group.position.copy(layout.customer.at);
  customer.group.rotation.y = faceY(layout.customer.at, layout.customer.face);
  const brb = new Batch({ wind: true });
  const bsw = (x, y) => Math.max(0, y - 0.15) * 0.3;
  peachBranch(brb, V3(0, -0.12, 0), V3(0.05, 1, 0.08), 0.95, R, { twigs: 7, bloom: 90, petal: 0.04, sway: bsw, tree: 3, thick: 0.013 });
  const branch = hero(brb.merge(), { wind: true, rimW: 1.3, rimOff: 0.9 });
  customer.group.add(branch);
  const nb = new Batch();
  nb.box(0.18, 0.085, 0.003, V3(0, 0, 0), { col: '#1f6a78', col2: '#8ad8d8', erode: 0, hilite: 0.4, scale: 20, bump: 0.4 });
  nb.box(0.05, 0.05, 0.0035, V3(0.045, 0, 0), { col: '#b89a58', col2: '#f0e0b0', erode: 0, hilite: 0.2, scale: 20, bump: 0.4 });
  const note = hero(nb.merge(), { rims: false });
  scene.add(note);

  // the rider, seated on the motorbike
  const rider = person(layout.bike, { seated: true, noStool: true, coat: withC(C.body, { col: '#1e2428', col2: '#6a7a80' }), pants: withC(C.tyre, { col: '#101418', col2: '#3a4450' }), hat: 'helmet', helmet: withC(C.body, { col: '#3a3a40', col2: '#a8a8b0', gloss: 0.8 }), s: 1, scale: 1, tier: TIER2, rimW: 2.0, hunch: 0.05 });
  rider.group.position.set(-0.22, 0.5, 0);
  rider.group.rotation.y = Math.PI / 2;

  const walker = buildWalker(scene);
  walker.P.group.rotation.y = Math.PI;

  sketch.push([seller.group, { seed: 201, loops: 2, off: [4, 11], wob: 5, width: 1.4 }]);
  sketch.push([customer.group, { seed: 207, loops: 2, off: [4, 11], wob: 5, width: 1.4 }]);
  shadows.push([layout.seller.at.x, layout.seller.at.z + 0.05, 0.4, 0.34], [layout.customer.at.x, layout.customer.at.z, 0.34, 0.26]);

  // ---- gesture loops (6 s): the customer lifts and turns the branch, pays; the seller wraps, takes the note, tucks it away
  function poseCustomer(t) {
    // C's choreography mirrored: the branch rides in her right hand, the one on our side
    const P = customer;
    const tc = ((t % 6) + 6) % 6;
    const g = P.group;
    g.updateMatrixWorld(true);
    const raise = win(tc, 0.2, 1.0, 2.3, 3.2);
    const lean = win(tc, 3.7, 4.3, 4.9, 5.6);
    P.torso.rotation.set(0.05 + 0.12 * lean, -0.05 * Math.sin((t * Math.PI) / 3) - 0.08 * lean, 0.045 + 0.03 * raise + 0.02 * Math.sin((t * Math.PI) / 3 + 1));
    P.head.rotation.set(-0.2 * raise + 0.1 * lean, -0.25 * raise + 0.15 * lean, -0.08 * raise);
    g.updateMatrixWorld(true);
    const SA = shoulderLocal(P, 1), SB = shoulderLocal(P, 0);
    const hold = MX(V3(0.1, 1.2, 0.3)), upP = MX(V3(0.06, 1.4, 0.33));
    const wa = lerpV(hold, upP, raise);
    wa.y += 0.01 * Math.sin(t * 1.7);
    const twirl = 0.85 * Math.sin(sm(0.35, 2.9, tc) * Math.PI * 2);
    solveArm(P.arms[1], SA, wa, MX(V3(1, -1, -0.4)).normalize(), MX(V3(-1, 0, 0.2)).normalize(), MX(V3(-0.1, 0.9, 0.3)).normalize());
    branch.position.copy(P.arms[1].hand.position).add(V3(0.01, 0.07, 0.015));
    branch.quaternion.setFromEuler(new THREE.Euler(0.22 + 0.1 * raise, -twirl, 0.12 + 0.08 * raise));
    const onBranch = wa.clone().add(MX(V3(-0.1, -0.12, 0.02))).add(V3(0, 0.03 * Math.sin(twirl), 0));
    const pocket = MX(V3(-0.25, 0.9, 0.06));
    const exL = toLocal(P, EXCH);
    const dirC = exL.clone().sub(SB).normalize();
    const give = exL.clone().addScaledVector(dirC, -0.075);
    const p1 = sm(2.95, 3.5, tc), p2 = sm(3.75, 4.5, tc), p3 = sm(5.0, 5.9, tc);
    const wb = lerpV(lerpV(lerpV(onBranch, pocket, p1), give, p2), onBranch, p3);
    wb.x += 0.07 * Math.sin(Math.PI * p1) + 0.05 * Math.sin(Math.PI * p3);
    const palm = MX(V3(0, -1, 0).lerp(V3(1, 0, 0.2), 1 - p2 + p3)).normalize();
    solveArm(P.arms[0], SB, wb, MX(V3(-1, -1, -0.3)).normalize(), palm, dirC.clone().lerp(MX(V3(0.3, 0.6, 0.5)), 1 - p2 + p3).normalize());
    return tc;
  }
  function poseSeller(t) {
    const P = seller;
    const ts = ((t % 6) + 6) % 6;
    const reach = win(ts, 4.15, 4.7, 5.0, 5.45);
    P.torso.rotation.set(0.2 + 0.1 * reach + 0.012 * Math.sin(t * 4.6), 0.12 * reach, 0.03 * reach);
    const wrapA = (t * Math.PI * 2) / 1.35;
    const wrapK = 1 - win(ts, 3.9, 4.3, 5.35, 5.9);
    P.head.rotation.set(0.36 - 0.16 * reach + 0.035 * Math.sin(wrapA) * wrapK, -0.12 * reach + 0.06 * Math.sin(t * 0.7), 0);
    P.group.updateMatrixWorld(true);
    const SL = shoulderLocal(P, 0), SR = shoulderLocal(P, 1);
    const lh = V3(0.03, 0.72 + 0.01 * Math.sin(t * 0.9), 0.42);
    const lap = V3(-0.02, 0.6, 0.36);
    const exL = toLocal(P, EXCH);
    const dirS = exL.clone().sub(SL).normalize();
    const take = exL.clone().addScaledVector(dirS, -0.07);
    const apron = V3(0.1, 0.5, 0.2);
    const a1 = sm(3.95, 4.3, ts), a2 = sm(4.3, 4.8, ts), a3 = sm(5.0, 5.35, ts), a4 = sm(5.4, 5.95, ts);
    const wl = lerpV(lerpV(lerpV(lerpV(lh, lap.clone().add(V3(0.05, 0.06, 0)), a1), take, a2), apron, a3), lh, a4);
    wl.y += 0.05 * Math.sin(Math.PI * a3);
    const palmL = V3(-1, 0, 0).lerp(V3(-0.2, 1, 0.3), a2 * (1 - a3)).normalize();
    solveArm(P.arms[0], SL, wl, V3(1, -0.6, -0.4).normalize(), palmL, V3(0, 0.6, 1).lerp(dirS, a2 * (1 - a3)).normalize());
    const drop = win(ts, 4.0, 4.3, 5.45, 5.85);
    const gripL = P.arms[0].hand.position.clone().add(V3(-0.01, 0.07, 0.02));
    bouquet.position.copy(gripL).lerp(lap.clone().add(V3(0, 0.08, 0.02)), drop);
    bouquet.rotation.set(-0.5 - 0.6 * drop, 0.35 * Math.sin(t * 0.9) * (1 - drop), -0.15 + 0.5 * drop);
    const around = V3(-0.02 + 0.075 * Math.cos(wrapA), 0.8 + 0.045 * Math.sin(wrapA), 0.44 + 0.06 * Math.sin(wrapA));
    const steady = V3(-0.1, 0.64, 0.34);
    const wr = lerpV(around, steady, 1 - wrapK);
    solveArm(P.arms[1], SR, wr, V3(-1, -0.7, -0.3).normalize(), V3(0, 0, 1).lerp(V3(0, -1, 0), 1 - wrapK).normalize(), V3(0.3, 0, 1).normalize());
  }
  const tq = new THREE.Quaternion(), tq2 = new THREE.Quaternion();
  function poseNote(tc) {
    const cHand = customer.arms[0].hand, sHand = seller.arms[0].hand;
    const gripC = cHand.localToWorld(V3(0, 0.09, 0.01));
    const gripS = sHand.localToWorld(V3(0, 0.09, 0.01));
    const k = sm(4.62, 4.95, tc);
    note.position.copy(gripC).lerp(gripS, k);
    note.quaternion.copy(cHand.getWorldQuaternion(tq)).slerp(sHand.getWorldQuaternion(tq2), k);
    const vis = sm(3.38, 3.52, tc) * (1 - sm(5.25, 5.36, tc));
    note.scale.setScalar(Math.max(0.001, vis));
    note.visible = vis > 0.01;
  }
  function poseRider(t) {
    const P = rider;
    const dist = layout.bike.userData.dist ?? 0;
    P.torso.rotation.set(0.22 + 0.01 * Math.sin(dist * 3.1), 0, 0);
    P.head.rotation.set(-0.05, 0.1 * Math.sin(t * 0.6), 0);
    layout.bike.updateMatrixWorld(true);
    const SL = shoulderLocal(P, 0), SR = shoulderLocal(P, 1);
    for (const [i, S, z] of [[0, SL, -0.28], [1, SR, 0.28]]) {
      const w = P.group.worldToLocal(layout.bike.localToWorld(V3(0.6, 1.02, z)));
      solveArm(P.arms[i], S, w, V3(i ? -1 : 1, -1, -0.2).normalize(), V3(0, -1, 0), V3(0, 0, 1));
    }
  }
  function poseWalker(t) {
    const P = walker.P;
    const { z, visible, walked } = layout.walker(t);
    P.group.visible = visible;
    const step = walked / 0.62;
    P.group.position.set(layout.walkerX, 0.02 * Math.abs(Math.sin(step * Math.PI)), z);
    P.torso.rotation.set(0.04, 0.05 * Math.sin(step * Math.PI), 0.02 * Math.sin(step * Math.PI));
    P.group.updateMatrixWorld(true);
    const SL = shoulderLocal(P, 0), SR = shoulderLocal(P, 1);
    solveArm(P.arms[1], SR, V3(-0.05, 1.2, 0.22), V3(-1, -1, -0.3).normalize(), V3(1, 0, 0), V3(0, 1, 0));
    const sw = Math.sin(step * Math.PI);
    solveArm(P.arms[0], SL, V3(0.2, 0.9, 0.08 + 0.12 * sw), V3(1, -0.2, -1).normalize(), V3(-1, 0, 0), V3(0, -1, 0.2 * sw));
    walker.umb.position.set(-0.05, 1.98, 0.2);
    walker.umb.rotation.set(0.08 + 0.02 * sw, 0, 0.05);
  }

  // roles another folder plays: built (so the random stream is unchanged) but never shown
  if (!plays('seller')) seller.group.visible = false;
  if (!plays('customer')) customer.group.visible = false;
  if (!plays('rider')) rider.group.visible = false;
  if (!plays('walker')) walker.P.group.visible = false;
  const shown = sketch.filter(([o]) => o.visible !== false);
  sketch.length = 0; sketch.push(...shown);
  return {
    seller, customer, rider, walker, sketch, shadows,
    holds: { branch, note, bouquet },
    swayCenters: { branch: EXCH.clone().add(V3(-0.4, 0.4, 0.1)) },
    update(t) {
      const tc = poseCustomer(t);
      poseSeller(t);
      poseNote(tc);
      if (!plays('customer')) note.visible = false;   // the note travels with the customer who plays it
      if (layout.bike.visible && plays('rider')) poseRider(t);
      if (plays('walker')) poseWalker(t);
    },
  };
}
