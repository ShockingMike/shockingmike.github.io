// Chớm, mùa Hạ: what the lotus picker wears and does (people/haisen), on twos at 24 fps.
// Everything here lives in the boat's own frame (bow +x, the near side toward the main camera is +z, the rim at y 0).
//
// The 64 s loop (the season's boat: seasons/ha/boat.js):
//   0-24.6    she poles the boat in, facing the bow, the pole on her right (the near side, so both hands read). The pole's foot
//             stands still in the lake bed while the boat slides past it, so the pole leans back and slides through her hands;
//             she leans into each push, then draws the pole forward again (the boat's surges are the season's; her pushes sit
//             on them)
//   24.6-27   the last push; she draws the pole up, swings it level and lays it along the near gunwale
//   27-28     she turns to the far side (left), two steps, and squats (the Vietnamese way, heels down)
//   28-33.6   one hand on the far gunwale, the other reaches down past the side to the water, breaks a low bud and brings it
//             up; she lays it on the thwart (the first: right hand)
//   33.6-39.4 the same with the other hand; this one goes on the board behind her
//   39.4-41.2 she stands and turns left again, to face the stern, two steps
//   41.2-45.6 she takes up the pole, lifts it and swings its top up over her head while its foot dips through the water and
//             comes round behind her; she lets it slide down to the bed
//   45.6-64   she poles the boat out, stern first, the pole on her left (still the near side)
// The picked flowers are the season's meshes (layout.picker.picked), the low buds on the two plants too (pickBlooms): a bud
// is shown again only while the incoming hull hides it, and leaves the plant in the drawing where her hand closes on it,
// under the water and behind the far side.
import * as THREE from 'three';
import { V3, n3, sm, clamp01, EASE, FINGERS, FPS, STEP } from './rig.js';

export const LOOP = 64;
const D2R = Math.PI / 180;
const Yax = V3(0, 1, 0);

// ---------------------------------------------------------------- the boat's shape (as seasons/ha/boat.js builds it)
export const BOATG = {
  len: 3.4, beam: 0.9, depth: 0.34, rise: 0.16, float: 0.28, rimR: 0.02,
  board: { x0: -1.45, x1: -0.55, y: -0.2115, yb: -0.2365, z: 0.18 },
  thwarts: [-0.3, 0.7], thwartTop: -0.005, thwartBot: -0.035, thwartHx: 0.06, thwartHz: 0.387,
};
// her mẹt: a shallow woven tray that sits on the boat's floor in front of her, the picked flowers laid in it.
// x/z are the boat's own frame; y comes from the hull, measured at load (people.js fills TRAY.y).
export const TRAY = { x: -0.42, z: 0.0, r: 0.2, rim: 0.02, thick: 0.008, y: -0.28 };
export const hullE = (x) => Math.min(1, Math.abs(2 * x / BOATG.len));
export const rimHalf = (x) => (BOATG.beam / 2) * Math.sqrt(Math.max(0.02, 1 - hullE(x) ** 3.2));
export const rimY = (x) => BOATG.rise * hullE(x) ** 2.4;
export const bottomY = (x) => -BOATG.depth * (1 - 0.55 * hullE(x) ** 2);
// the hull's inside half-width at height y (0 below the bottom)
export function hullHalfAt(x, y) {
  const top = rimY(x), bot = bottomY(x);
  if (y >= top) return rimHalf(x);
  if (y <= bot) return 0;
  const k = (y - bot) / (top - bot);
  const s = Math.pow(Math.max(0, 1 - k), 1 / 0.6);
  const c = Math.sqrt(Math.max(0, 1 - s * s));
  return c * rimHalf(x) * (0.75 + 0.25 * c * c);
}

// ---------------------------------------------------------------- looks
export const LOOKS = {
  // sun-browned skin, the low sun behind her
  skin: { kind: 'skin', col: '#4a2a22', col2: '#b77a5a', hatch: '#2e1612', hi: '#ffd8b4', scale: 7, bump: 0.25, hatchAmt: 0.3, hatchScale: 10, rim: 1.0, ink: 1.3, cav: 0.6 },
  // a sun-faded áo bà ba: once mid blue, now a pale grey-blue with a faint small print
  jacket: { kind: 'cotton', col: '#5a6478', col2: '#c8cedc', hatch: '#2e3246', hi: '#fff4e6', back: '#3a4052', scale: 6, bump: 0.55, hatchAmt: 0.7, hatchScale: 7, rim: 1.0, ink: 2.2, print: 1 },
  // dark cotton trousers, a little shiny from wear
  pants: { kind: 'cotton', col: '#141218', col2: '#4a4656', hatch: '#060508', hi: '#d8c8d0', back: '#0c0b10', scale: 6, bump: 0.5, hatchAmt: 0.6, hatchScale: 6, rim: 0.9, ink: 2.2, gloss: 0.15 },
  // a thin cotton scarf over her nose and mouth: a quiet earth brown, nothing like the pale blouse
  scarf: { kind: 'cotton', col: '#33402f', col2: '#8a9472', hatch: '#181e14', hi: '#dce4b8', scale: 9, bump: 0.5, hatchAmt: 0.55, hatchScale: 9, rim: 0.9, ink: 2.0 },
  // her mẹt: a shallow woven bamboo tray in the boat's floor, where the picked flowers go
  tray: { kind: 'bamboo', col: '#7a6242', col2: '#dcc28e', hatch: '#3e3020', hi: '#fff0c8', back: '#4a3a24', scale: 10, bump: 0.55, hatchAmt: 0.5, hatchScale: 9, rim: 1.0, ink: 2.0 },
  // the nón lá: palm leaf over bamboo rings
  hat: { kind: 'leaf', col: '#8a7250', col2: '#ecd8a8', hatch: '#4a3a24', hi: '#fff4d8', back: '#5a4a34', scale: 9, bump: 0.5, hatchAmt: 0.45, hatchScale: 8, rim: 1.1, ink: 1.8 },
  hair: { kind: 'hair', col: '#0a080c', col2: '#3a3038', hatch: '#000000', hi: '#e8b888', sheen: 0.8, scale: 10, hatchAmt: 0, rim: 0.9, ink: 1.8 },
  band: { kind: 'cotton', col: '#2a2c48', col2: '#6a6c98', scale: 12, ink: 0.8, band: 0 },
  button: { kind: 'plastic', col: '#8a8a90', col2: '#e8e8ec', scale: 20, ink: 0.4, band: 0, gloss: 0.5 },
};

// ---------------------------------------------------------------- the world as the season gives it
export function worldInfo(layout) {
  const P = layout.picker ?? layout;
  const WATER_Y = P.pickAt?.[0]?.y ?? -0.45;
  const FLOAT = P.float ?? BOATG.float;
  const boatAt = P.boatAt;
  const origin = (t, out = V3(0, 0, 0)) => { const s = boatAt(t); return out.set(s.x, WATER_Y + FLOAT, s.z); };
  const W = {
    P, WATER_Y, FLOAT, boatAt, origin,
    deckY: P.deckY ?? -0.212, period: P.period ?? LOOP,
    waterL: -FLOAT,
    pickAt: P.pickAt ?? [], bloomAt: P.pickBloomAt ?? [], blooms: P.pickBlooms ?? [],
    pole: P.pole, picked: P.picked ?? [], boat: P.boat,
    toLocal: (w, t) => w.clone().sub(origin(t)),
  };
  return W;
}

// ---------------------------------------------------------------- the pole
export const POLE = { len: 4.2, half: 2.1, rTop: 0.022, rFoot: 0.03, depth: 0.85, zFoot: 0.7, zHand: 0.38 };
const PUSH = 3.2, PE = 0.68;
// the pushes: [plant, end of push, next plant]; dir +1 facing the bow (in), -1 facing the stern (out)
function strokeList() {
  const out = [];
  for (let k = 0; k < 8; k++) { const t0 = k * PUSH; out.push({ t0, t1: t0 + PE * PUSH, t2: k < 7 ? t0 + PUSH : null, dir: 1, herX: -1.0 }); }
  // (the first push out starts before the boat moves: she leans into the pole and the boat gives)
  out.push({ t0: 45.6, t1: 47.4, t2: 48.0, dir: -1, herX: -0.75 });
  for (let j = 0; j < 5; j++) { const t0 = 48.0 + j * PUSH; out.push({ t0, t1: t0 + PE * PUSH, t2: t0 + PUSH, dir: -1, herX: -0.75 }); }
  return out;
}
// where the hands hold the pole through a push (x along the boat from her, y, z across), and where its foot goes in
export const HC = { x0: 0.204, x1: -0.045, y0: 0.821, y1: 0.693, back: 0.08, zHand: 0.367, zFoot: 0.724 };
// where the middle of her two hands holds the pole (boat space)
function handMid(st, t, out) {
  const f = st.dir;
  if (t < st.t1) {
    const u = clamp01((t - st.t0) / (st.t1 - st.t0));
    const ex = EASE.inout(sm(0.02, 1.0, u)), ey = EASE.inout(sm(0.0, 0.92, u));
    return out.set(st.herX + f * (HC.x0 + (HC.x1 - HC.x0) * ex), HC.y0 + (HC.y1 - HC.y0) * ey, HC.zHand + 0.02 * ey);
  }
  const v = clamp01((t - st.t1) / (st.t2 - st.t1));
  const e = EASE.inout(v);
  return out.set(st.herX + f * (HC.x1 + (HC.x0 - HC.x1) * e), HC.y1 + (HC.y0 - HC.y1) * e + 0.07 * Math.sin(Math.PI * v), HC.zHand + 0.02 * (1 - e));
}

export function makePole(W) {
  const S = strokeList();
  const bedL = -W.FLOAT - POLE.depth;
  for (const st of S) {
    st.o0 = W.origin(st.t0);
    Object.defineProperty(st, 'footW', { get: () => V3(st.o0.x + st.herX - st.dir * HC.back, W.WATER_Y - POLE.depth, st.o0.z + HC.zFoot), enumerable: false });
  }
  const plantL = (st) => V3(st.herX - st.dir * HC.back, bedL, HC.zFoot);
  const _h = V3(0, 0, 0), _o = V3(0, 0, 0);
  const planted = (st, t) => {
    const H = handMid(st, t, V3(0, 0, 0));
    const foot = st.footW.clone().sub(W.origin(t, _o));
    const D = H.clone().sub(foot).normalize();
    return { mode: 'planted', st, footW: st.footW, foot, D, H, C: foot.clone().addScaledVector(D, POLE.half) };
  };
  // held key poses (boat space): centre, direction foot -> top
  const flip = (deg, tilt = 0.08) => { const a = deg * D2R; return V3(Math.cos(a), Math.sin(a), -tilt * Math.sin(a)).normalize(); };
  const lastIn = S[7], firstOut = S[8];
  const p0 = planted(lastIn, lastIn.t1 - 1e-4);
  const p1 = planted(firstOut, firstOut.t0);
  const HELD = [
    { t: lastIn.t1, C: p0.C, D: p0.D },
    { t: 25.0, C: V3(-1.0, 0.8, 0.44), D: n3(0.72, 0.69, -0.1) },
    { t: 25.5, C: V3(-1.06, 0.66, 0.46), D: n3(1, 0.1, 0) },
    { t: 26.1, C: V3(-1.08, 0.36, 0.46), D: n3(1, 0.02, 0) },
    { t: 26.6, C: V3(-1.1, 0.125, 0.458), D: V3(1, 0, 0), rest: true },
    { t: 41.4, C: V3(-1.1, 0.125, 0.458), D: V3(1, 0, 0), rest: true },
    { t: 41.95, C: V3(-1.08, 0.5, 0.46), D: n3(1, 0.02, 0) },
    { t: 42.45, C: V3(-1.05, 0.95, 0.47), D: n3(1, 0.05, 0) },
    { t: 43.1, C: V3(-1.02, 1.02, 0.45), D: flip(35, 0.1) },
    { t: 43.7, C: V3(-1.0, 0.95, 0.44), D: flip(70, 0.1) },
    { t: 44.3, C: V3(-1.0, 0.92, 0.42), D: flip(95, 0.12) },
    { t: 44.9, C: p1.C.clone().addScaledVector(p1.D, 0.07), D: p1.D.clone() },
    { t: firstOut.t0, C: p1.C, D: p1.D },
  ];
  const q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion();
  function held(t) {
    let i = 0;
    while (i < HELD.length - 2 && HELD[i + 1].t <= t) i++;
    const a = HELD[i], b = HELD[i + 1];
    const u = EASE.inout(clamp01((t - a.t) / (b.t - a.t)));
    const C = a.C.clone().lerp(b.C, u);
    q0.setFromUnitVectors(a.D, b.D);
    q1.identity().slerp(q0, u);
    const D = a.D.clone().applyQuaternion(q1).normalize();
    return { mode: a.rest && b.rest ? 'rest' : 'held', C, D, foot: C.clone().addScaledVector(D, -POLE.half) };
  }
  function at(t) {
    t = ((t % LOOP) + LOOP) % LOOP;
    for (const st of S) {
      if (t >= st.t0 && t < st.t1) return planted(st, t);
      if (st.t2 !== null && t >= st.t1 && t < st.t2) {
        // drawn forward again: the foot drags through the mud and the water to the next plant, a little lifted
        const v = clamp01((t - st.t1) / (st.t2 - st.t1));
        const endL = st.footW.clone().sub(W.origin(st.t1, _o));
        const next = plantL(st);
        const foot = endL.lerp(next, EASE.inout(v));
        foot.y += 0.3 * Math.sin(Math.PI * v);
        const H = handMid(st, t, V3(0, 0, 0));
        const D = H.clone().sub(foot).normalize();
        return { mode: 'drawn', st, foot, D, H, C: foot.clone().addScaledVector(D, POLE.half) };
      }
    }
    if (t < S[0].t0) return planted(S[0], S[0].t0);
    return held(t);
  }
  return { at, strokes: S, HELD, planted };
}

// ---------------------------------------------------------------- the hands on things
const perp = (v, axis) => v.clone().addScaledVector(axis, -v.dot(axis)).normalize();
// a hand on the pole: ph = offset along the pole from the hands' middle (strokes) or pd = from the pole's centre (held);
// the thumb points to the pole's top (thumb = 1) or its foot (-1)
function poleGoal(pole, { ph, pd, thumb = 1, elbow = [0, -1, 0], out = 0, roll = 0 }) {
  return {
    fn: (a, f, s) => {
      const P = pole.at(f / FPS);
      const base = (ph !== undefined && P.H) ? P.H.clone().addScaledVector(P.D, ph) : P.C.clone().addScaledVector(P.D, pd ?? ph ?? 0);
      const p = a.BW(base);
      const Dw = a.BWd(P.D);
      const th = Dw.clone().multiplyScalar(thumb);
      const sh = a.wp(`upperarm_${s}`);
      const fwd = perp(p.clone().sub(sh), Dw);
      // roll: turn the hold round the pole, so the fingers can curl on its far side instead of underneath it
      if (roll) fwd.applyAxisAngle(Dw, roll).normalize();
      const palm = s === 'r' ? new THREE.Vector3().crossVectors(th, fwd) : new THREE.Vector3().crossVectors(fwd, th);
      palm.normalize();
      // letting go: the hand slides off the side of the pole, so it never passes through it
      if (out) p.addScaledVector(palm, -out);
      return { p, fwd, palm, pole: a.BWd(V3(...elbow)).normalize(), anchor: 'pole' };
    },
  };
}
// a hand at a fixed point of the boat: at, the thumb's direction (boat space), where the knuckles point
function boatGrip(at, thumb, fwd, { elbow = [0, -1, 0], anchor = 'pole' } = {}) {
  return {
    fn: (a, f, s) => {
      const th = a.BWd(V3(...thumb)).normalize();
      const fw = perp(a.BWd(V3(...fwd)), th);
      const palm = s === 'r' ? new THREE.Vector3().crossVectors(th, fw) : new THREE.Vector3().crossVectors(fw, th);
      return { p: a.BW(V3(...at)), fwd: fw, palm: palm.normalize(), pole: a.BWd(V3(...elbow)).normalize(), anchor };
    },
  };
}
// a hand holding a flower by its stem: the flower's head is GRIP_HEAD along the thumb from the fist
export const GRIP_HEAD = 0.06;
function stemGoal(headFn, thumbFn, fwdFn, elbow = [0, -1, 0]) {
  return {
    fn: (a, f, s) => {
      const t = f / FPS;
      const th = a.BWd(thumbFn(t)).normalize();
      const head = a.BW(headFn(t));
      const fw = perp(a.BWd(fwdFn(t)), th);
      const palm = s === 'r' ? new THREE.Vector3().crossVectors(th, fw) : new THREE.Vector3().crossVectors(fw, th);
      return { p: head.addScaledVector(th, -GRIP_HEAD), fwd: fw, palm: palm.normalize(), pole: a.BWd(V3(...elbow)).normalize(), anchor: 'stem' };
    },
  };
}
// a hand at rest in the body's own space
const bodyHand = (at, fwd, palm, pole) => ({ at: V3(...at), fwd: V3(...fwd), palm: V3(...palm), pole: V3(...pole), anchor: 'palm' });

// ---------------------------------------------------------------- the flowers
// the season builds the picked flowers, so their size is measured here, never copied: bud radius, bloom height, stem length
export function measureFlowers(W) {
  return [0, 1].map((i) => {
    const obj = W.picked?.[i];
    if (!obj) return { budR: 0.07, bloomH: 0.1, len: 0.5, measured: false };
    obj.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
    const v = new THREE.Vector3();
    let yMin = 9, yMax = -9, rMax = 0;
    obj.traverse((c) => {
      const g = c.geometry;
      if (!g || !g.attributes.position) return;
      c.updateMatrixWorld(true);
      const m = c.matrixWorld.clone().premultiply(inv);
      const pos = g.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        v.fromBufferAttribute(pos, k).applyMatrix4(m);
        yMin = Math.min(yMin, v.y); yMax = Math.max(yMax, v.y);
        if (v.y > -0.005) rMax = Math.max(rMax, Math.hypot(v.x, v.z));
      }
    });
    if (yMax < yMin) return { budR: 0.07, bloomH: 0.1, len: 0.5, measured: false };
    const sc = obj.scale, sr = (Math.abs(sc.x) + Math.abs(sc.z)) / 2, sy = Math.abs(sc.y);
    return { budR: +(rMax * sr).toFixed(4), bloomH: +(Math.max(0, yMax) * sy).toFixed(4), len: +Math.max(0.1, -yMin * sy).toFixed(4), measured: true };
  });
}

export function makeFlowers(W) {
  // pick A: the bud of PICK[1] (to her right as she faces the far side), brought up by her right hand -> picked[0];
  // pick B: the bud of PICK[0] (to her left), her left hand -> picked[1]. Both end in her mẹt on the boat's floor.
  const T = { showBud: 23.4, grabA: 29.9, relA: 32.6, grabB: 34.9, relB: 37.7 };
  const bud = (i, t) => (W.bloomAt[i] ? W.toLocal(W.bloomAt[i], t) : V3(-0.5 - 0.6 * (1 - i), W.waterL + 0.043, -0.67));
  const size = measureFlowers(W);
  const topAt = TRAY.topAt ?? ((dx, dz) => TRAY.y + TRAY.thick);
  const hullAt = TRAY.hullAt ?? (() => TRAY.y);
  // each flower: the bloom in the tray, clear of the deck's edge, the stem out over the bow side of the rim and down
  const clearX = (TRAY.clearBackX ?? TRAY.x - TRAY.r) + 0.02;
  const rest = size.map((f, i) => {
    const s = i === 0 ? -1 : 1;
    const d = n3(0.25, 0, s);                                       // the way the stem lies, bloom -> stem end: across the boat
    const back = Math.min(0.03, Math.max(0, TRAY.r - f.budR - 0.02));
    const head = V3(Math.max(TRAY.x - d.x * back, clearX + f.bloomH * d.x), 0, TRAY.z - d.z * back);
    head.y = topAt(head.x - TRAY.x, head.z - TRAY.z) + f.budR + 0.004;
    const tip = V3(head.x + d.x * f.len, 0, head.z + d.z * f.len);
    const tipY = hullAt(tip.x, tip.z) + 0.008;                      // the stem's own thickness where it lands
    // where the stem crosses the rim, and how much it may fall by then: it rests over the rim, it does not cut through it
    const cx = head.x - TRAY.x, cz = head.z - TRAY.z;
    const b2 = cx * d.x + cz * d.z;
    const tRim = Math.max(0.02, -b2 + Math.sqrt(Math.max(0, b2 * b2 - (cx * cx + cz * cz - TRAY.r * TRAY.r))));
    const rimY = topAt(cx + d.x * tRim, cz + d.z * tRim) + TRAY.rim + 0.007;
    const dropRim = ((head.y - rimY) / tRim) * f.len;
    const fall = head.y - tipY;                                     // + the stem falls away from the bloom, - it climbs the bilge
    const drop = fall > 0 ? Math.min(fall, Math.max(0, dropRim)) : fall;
    const axis = n3(-d.x * f.len, drop, -d.z * f.len);               // stem -> head
    return { head, axis, twist: i === 0 ? 0.4 : 1.2, size: f };
  });
  return { T, bud, rest, size };
}

// ---------------------------------------------------------------- the key drawings
// the pick: squatting at the far side, leaning over it (tuned by qa/opt-pick.js; A = her right hand, B = her left, mirrored)
export const PK = {
  bx: -0.817, bz: 0.08, yaw: 0.042, rootX: 0.08, rootY: -0.402, rootZ: 0.17, pelvis: 1.051, spine: 0.564, twist: -0.165, side: -0.4, clav: 0.0, neck: -0.469, head: -0.119,
  elb: [0.011, -0.63, -1],
};
// putting a flower in the mẹt: how far she shuffles round and leans (tuned by qa/opt-lay.js)
export const LAYPOSE = { aFwd: -0.03, aTurn: 0, aRootX: -0.07, aRootY: -0.52, aRootZ: 0.05, aPelvis: 0.66, aSpine: 0.58, aTwist: 0.57,
  bFwd: -0.08, bTurn: -0.97, bRootX: -0.24, bRootY: -0.521, bRootZ: 0.04, bPelvis: 0.65, bSpine: 0.58, bTwist: 0.42 };
// the poling pose (tuned by qa/opt-stroke.mjs against her reach, the pole, the hat and her own body)
export const SP = {
  bz: 0.0, dyaw: 0.024, feet: 0.209,
  twP: 0.339, twE: 0.786, bP: 0.113, bE: 0.364, lz: -0.043, rE: -0.13, rz: 0.014,
  hTurn: 0.6, hBow: 0.55,
  phU: 0.108, phL: -0.209, eU: [0.603, -0.601, 1.0], eL: [-0.772, -0.657, 0.071],
};
const K = (t, o) => ({ f: Math.round(t * FPS), name: o.name ?? `t${t.toFixed(2)}`, ...o });
// Y is the page's slicer: given one, this yields between the sections so no single run holds a frame (README 11).
export async function buildKeys(a, W, pole, FL, Y = async () => {}) {
  const keys = [];
  const PI = Math.PI;
  // stances (body: x, z, turn; feet: x, z, turn). Poling, she stands on the near half of the board facing the way the boat
  // goes, the foot on the pole's side forward; her feet stay on the board (toes included)
  const stanceOf = (st) => {
    const f = st.dir, x = st.herX, z = SP.bz;
    const yaw = f > 0 ? PI / 2 - SP.dyaw : 1.5 * PI + SP.dyaw;
    return f > 0
      ? { body: [x, z, yaw], al: [x + 0.14, z - SP.feet * 0.6, yaw - 0.1], ar: [x - 0.13, z + SP.feet * 0.4, yaw + 0.3] }
      : { body: [x, z, yaw], al: [x - 0.13, z + SP.feet * 0.4, yaw + 0.1], ar: [x + 0.11, z - SP.feet * 0.6, yaw - 0.35] };
  };
  const S = pole.strokes;
  const IN = stanceOf(S[0]);
  const OUT = stanceOf(S[8]);
  const FLIP = { body: [OUT.body[0], OUT.body[1], 5.2], al: [OUT.al[0], OUT.al[1] + 0.04, OUT.al[2] + 0.45], ar: [OUT.ar[0], OUT.ar[1] - 0.04, OUT.ar[2] + 0.35] };
  const SQ = { body: [PK.bx, PK.bz, PI + PK.yaw], ar: [PK.bx + 0.14, PK.bz + 0.04, PI + PK.yaw - 0.32], al: [PK.bx - 0.14, PK.bz + 0.05, PI + PK.yaw + 0.3] };
  // poling: the far hand high across her, the near hand low; she turns and leans into the pole, her arms swing back along the boat
  const stroke = (st, first = false) => {
    const f = st.dir;
    const stance = stanceOf(st);
    const up = f > 0 ? 'l' : 'r', lo = f > 0 ? 'r' : 'l';
    const mx = (v) => [v[0] * f, v[1], v[2]];
    const hands = {
      [`h${up}`]: poleGoal(pole, { ph: SP.phU, elbow: mx(SP.eU) }), [`f${up}`]: 'gripPole',
      [`h${lo}`]: poleGoal(pole, { ph: SP.phL, elbow: mx(SP.eL) }), [`f${lo}`]: 'gripPole',
    };
    const pose = (k, rdrop) => {
      const tw = -(SP.twP + (SP.twE - SP.twP) * k) * f;
      const bend = SP.bP + (SP.bE - SP.bP) * k;
      return { ...stance, ...hands, root: [0, rdrop, SP.rz * k], pelvis: [bend * 0.4, tw * 0.3, SP.lz * 0.5 * f], spine: [bend, tw, SP.lz * f], clavL: [0, 0, 0], clavR: [0, 0, 0],
        neck: [0.1, SP.hTurn * 0.3 * f, 0], head: [SP.hBow - 0.1 * k, SP.hTurn * f, 0] };
    };
    const plant = pose(0, -0.02), mid = pose(0.55, (SP.rE - 0.02) * 0.6), end = pose(1, SP.rE), rec = pose(0.3, -0.03);
    const L = st.t1 - st.t0;
    if (!first) keys.push(K(st.t0, { ...plant, ease: 'in' }));
    keys.push(K(st.t0 + L * 0.42, { ...mid, ease: 'inout' }));
    keys.push(K(st.t1, { ...end, ease: 'out' }));
    if (st.t2 !== null) keys.push(K(st.t1 + (st.t2 - st.t1) * 0.5, { ...rec, ease: 'inout' }));
    return { plant, end, rec };
  };

  // ---- in
  const s0 = stroke(S[0], true);
  keys.unshift(K(0, { ...s0.plant, ease: 'hold' }));
  for (let k = 1; k < 8; k++) stroke(S[k]);
  const kneeHand = (s) => ({
    fn: (ac, f, side) => {
      const k = ac.wp(`calf_${side}`);
      const th = k.clone().sub(ac.wp(`thigh_${side}`)).normalize();
      const out = V3(th.x, 0, th.z).normalize();
      return { p: k.addScaledVector(out, 0.128).add(V3(0, 0.006, 0)), fwd: V3(0, -1, 0).addScaledVector(out, 0.35).normalize(), palm: ac.Wd(V3(side === 'l' ? -1 : 1, 0, 0)).normalize(), pole: ac.Wd(V3(side === 'l' ? 1 : -1, 0.2, -0.2)).normalize(), anchor: 'palm' };
    },
  });
  await Y('keys');
  // ---- the pole laid down along the near gunwale (in front of her: she faces that side)
  const onC = (pd, thumb = 1, elbow) => poleGoal(pole, { pd, thumb, elbow });
  const layHands = (l, r, out = 0, roll = 0) => ({ hl: poleGoal(pole, { pd: l, thumb: 1, elbow: [0.7, -0.7, -0.1], out, roll }), fl: 'gripPole', hr: poleGoal(pole, { pd: r, thumb: 1, elbow: [-0.7, -0.7, -0.1], out, roll }), fr: 'gripPole' });
  const LAY = (yaw) => ({ body: [IN.body[0], 0.0, yaw], al: [IN.al[0], IN.al[1] - 0.03, IN.al[2] - (IN.body[2] - yaw) * 0.8 - 0.25], ar: [IN.ar[0], IN.ar[1] + 0.03, IN.ar[2] - (IN.body[2] - yaw) * 0.8 + 0.3] });
  keys.push(K(25.0, { ...LAY(1.25), root: [0, -0.04, 0], pelvis: [0.1, -0.05, 0], spine: [0.22, -0.2, 0.02], neck: [0.08, 0, 0], head: [0.3, 0.05, 0], ...layHands(0.2, -0.12), stepl: 0.01, stepr: 0.01, ease: 'inout' }));
  keys.push(K(25.5, { ...LAY(0.85), root: [0, -0.05, 0], pelvis: [0.12, -0.05, 0], spine: [0.24, -0.15, 0.0], neck: [0.08, 0, 0], head: [0.32, 0.05, 0], ...layHands(0.2, -0.12), stepl: 0.01, stepr: 0.01, ease: 'inout' }));
  keys.push(K(26.1, { ...LAY(0.7), root: [0, -0.36, -0.02], pelvis: [0.26, -0.05, 0.0], spine: [0.3, -0.1, 0.0], neck: [-0.16, 0, 0], head: [0.0, 0.05, 0], ...layHands(0.2, -0.12), ease: 'inout' }));
  keys.push(K(26.6, { ...LAY(0.7), root: [0, -0.42, -0.04], pelvis: [0.3, -0.05, 0.0], spine: [0.44, -0.1, 0.0], neck: [-0.24, 0, 0], head: [-0.05, 0.05, 0], ...layHands(0.26, -0.06, 0, 0.7), ease: 'out' }));
  // hands hanging at her sides, a little out and forward
  const hang = (side) => ({
    fn: (ac, f, s) => {
      const sx = s === 'l' ? 1 : -1;
      const sd = ac.Wd(V3(sx, 0, 0)), fw = ac.Wd(V3(0, 0, 1));
      const p = ac.wp(`upperarm_${s}`).add(V3(0, -0.43, 0)).addScaledVector(sd, 0.15).addScaledVector(fw, 0.11);
      return { p, fwd: V3(0, -1, 0).addScaledVector(fw, 0.25).normalize(), palm: sd.clone().negate(), pole: sd.clone().multiplyScalar(0.6).addScaledVector(fw, -0.5).normalize(), anchor: 'palm' };
    },
  });
  const rest = { hl: hang('l'), hr: hang('r'), fl: 'relax', fr: 'relax' };
  keys.push(K(26.72, { ...LAY(0.7), root: [0, -0.43, -0.04], pelvis: [0.3, -0.05, 0.0], spine: [0.42, -0.1, 0.0], neck: [-0.24, 0, 0], head: [-0.05, 0.05, 0], ...layHands(0.26, -0.06, 0.04, 0.7), arcl: [0, 0.05, 0.05], arcr: [0, 0.05, 0.05], ease: 'inout' }));
  keys.push(K(26.9, { ...LAY(0.7), root: [0, -0.44, -0.04], pelvis: [0.28, -0.05, 0.0], spine: [0.36, -0.1, 0.0], neck: [-0.2, 0, 0], head: [0.0, 0.05, 0],
    hl: kneeHand('l'), fl: 'relax', hr: kneeHand('r'), fr: 'relax', arcl: [0, 0.12, 0.07], arcr: [0, 0.12, 0.07], ease: 'inout' }));
  await Y('keys');
  // ---- turn left to the far side: the left foot steps round, then the right
  const T1 = { root: [0, -0.06, 0], pelvis: [0.1, 0, 0], spine: [0.16, 0.08, 0], neck: [0.06, 0, 0], head: [0.32, 0.06, 0], ...rest };
  keys.push(K(27.35, { ...LAY(0.7), ...T1, body: [-0.9, 0.04, 1.9], ar: SQ.ar, sar: 0.05, sbr: 0.9, stepr: 0.06, swzr: 0.03, ease: 'inout', arcl: [0.06, 0.06, 0], arcr: [-0.06, 0.06, 0] }));
  keys.push(K(27.75, { ...SQ, ...T1, sal: 0.08, sbl: 0.9, stepl: 0.05, ease: 'inout' }));
  keys.push(K(28.05, { ...SQ, ...T1, ease: 'inout' }));
  await Y('keys');
  // ---- squat, pick A
  const onKnees = { hl: kneeHand('l'), hr: kneeHand('r'), fl: 'relax', fr: 'relax' };
  const T2 = { root: [0, -0.05, 0], pelvis: [0.08, 0, 0], spine: [0.14, 0.06, 0], neck: [0.06, 0, 0], head: [0.3, 0.05, 0], ...rest };
  const squat = { ...SQ, root: [0, -0.49, -0.1], pelvis: [0.42, 0, 0], spine: [0.24, 0, 0], neck: [0.05, 0, 0], head: [0.3, 0, 0] };
  keys.push(K(28.5, { ...squat, ...onKnees, ease: 'inout', arcl: [0, 0.09, 0], arcr: [0, 0.09, 0] }));
  const rimL = (x) => [x, rimY(x) + 0.014, -rimHalf(x) - 0.017];
  const lean = { ...SQ, root: [0, PK.rootY, PK.rootZ], pelvis: [PK.pelvis, 0, 0], spine: [PK.spine, 0, 0], neck: [PK.neck, 0, 0], head: [PK.head, 0, 0] };
  // the lean toward one hand's bud: k scales how far (1 = the grab)
  const leanTo = (s, k = 1) => {
    const f = s === 'r' ? 1 : -1;
    return { ...lean, root: [-f * PK.rootX, PK.rootY + (s === 'l' ? 0.03 : 0), PK.rootZ * k], pelvis: [PK.pelvis * (0.7 + 0.3 * k), 0, 0], spine: [PK.spine * k, -f * PK.twist, -f * PK.side * k],
      [s === 'r' ? 'clavR' : 'clavL']: [PK.clav * k, 0, 0], neck: [PK.neck, 0, 0], head: [PK.head, 0, 0] };
  };
  // (she takes the bud by its tip, which leans toward the boat)
  // (her fist closes on the bud's tip, which leans toward the boat; the flower in her fist points out and down, under the leaves)
  const budHead = (i, dx = 0, dy = 0, dz = 0) => (t) => FL.bud(i, t).add(V3(-0.049 + dx, 0.027 + 0.03 + dy, 0.069 - 0.01 + dz));
  const K3 = (x, y, z) => () => V3(x, y, z);
  // A: the right hand
  const rimGripL = boatGrip(rimL(PK.bx - 0.17), [1, 0, 0], [0, -0.6, -1], { elbow: [-0.3, 0.3, 1] });
  keys.push(K(29.25, { ...leanTo('r', 0.9), hl: rimGripL, fl: 'gripPole', hr: stemGoal(budHead(1, 0.0, 0.08, 0.0), K3(0.1, -0.1, -0.99), K3(0, -0.8, -0.5), PK.elb), fr: 'open', ease: 'inout', arcr: [0, 0.17, -0.06], arcl: [0, 0.16, -0.1] }));
  keys.push(K(29.9, { ...leanTo('r'), hl: rimGripL, fl: 'gripPole', hr: stemGoal(budHead(1, 0.0, 0.0, -0.055), K3(0.08, 0.5, -0.86), K3(0, -0.8, -0.5), PK.elb), fr: 'gripStem', ease: 'inout' }));
  keys.push(K(30.15, { ...leanTo('r', 0.97), hl: rimGripL, fl: 'gripPole', hr: stemGoal(budHead(1, 0.01, 0.03, 0.02), K3(0.3, 0.6, -0.74), K3(0, -0.8, -0.5), PK.elb), fr: 'gripStem', arcr: [0, 0.0, -0.05], ease: 'snap' }));
  keys.push(K(30.45, { ...leanTo('r', 0.88), hl: rimGripL, fl: 'gripPole', hr: stemGoal(budHead(1, 0.0, 0.2, -0.08), K3(0.16, 0.92, -0.36), K3(0, -0.3, -1), PK.elb), fr: 'gripStem', ease: 'out' }));
  keys.push(K(30.9, { ...lean, root: [-PK.rootX, PK.rootY + 0.04, PK.rootZ], pelvis: [PK.pelvis, 0, 0], spine: [0.22, -0.2, -0.04], neck: [0.0, 0, 0], head: [0.1, 0, 0], hl: rimGripL, fl: 'gripPole', hr: stemGoal(K3(-0.52, 0.56, -0.56), K3(0.1, 0.94, -0.32), K3(0, 0, -1), [-1, 0, 0.3]), fr: 'gripStem', arcr: [0, 0.0, -0.05], ease: 'inout' }));
  const up = { ...squat, pelvis: [0.55, 0, 0] };
  keys.push(K(31.6, { ...up, root: [-0.04, -0.48, -0.04], spine: [0.42, -0.42, 0.05], neck: [0.05, 0, 0], head: [0.22, -0.2, 0], hl: rimGripL, fl: 'gripPole', hr: stemGoal(K3(-0.5, 0.45, -0.3), n3Fn(0.2, 0.85, -0.5), K3(0, 0, -1), [-1, -0.2, 0.3]), fr: 'gripStem', ease: 'inout' }));
  // the two poses that put a flower in the mẹt, tuned by qa/opt-lay.js (LAY below holds what it found)
  const layA = stemGoal(() => FL.rest[0].head.clone(), () => FL.rest[0].axis.clone(), K3(1, -0.6, 0), [-0.3, 0.6, 1]);
  const L = { ...LAYPOSE, ...((typeof window !== 'undefined' && window.__LAY) || {}) };
  const sqA = { body: [PK.bx + L.aFwd, PK.bz, PI + PK.yaw + L.aTurn], ar: [PK.bx + 0.14 + L.aFwd, PK.bz + 0.04, PI + PK.yaw + L.aTurn - 0.32], al: [PK.bx - 0.14 + L.aFwd, PK.bz + 0.05, PI + PK.yaw + L.aTurn + 0.3] };
  const layPoseA = { ...up, ...sqA, root: [L.aRootX, L.aRootY, L.aRootZ], pelvis: [L.aPelvis, 0, 0], spine: [L.aSpine, -L.aTwist, 0.12], neck: [0.05, 0, 0], head: [0.3, -0.3, 0], hl: rimGripL, fl: 'gripPole' };
  keys.push(K(32.3, { ...layPoseA, hr: layA, fr: 'gripStem', arcr: [0.04, -0.05, 0.0], ease: 'inout' }));
  keys.push(K(FL.T.relA, { ...layPoseA, hr: layA, fr: 'open', ease: 'inout' }));
  keys.push(K(33.2, { ...squat, spine: [0.44, -0.2, 0], hl: rimGripL, fl: 'gripPole', hr: kneeHand('r'), fr: 'relax', ease: 'inout', arcr: [0, 0.05, 0] }));
  // B: the left hand
  const rimGripR = boatGrip(rimL(PK.bx + 0.16), [-1, 0, 0], [0, -0.6, -1], { elbow: [0.3, 0.3, 1] });
  keys.push(K(33.9, { ...squat, root: [-0.03, -0.49, -0.08], spine: [0.46, 0.08, 0], hl: kneeHand('l'), fl: 'relax', hr: rimGripR, fr: 'gripPole', ease: 'inout', arcr: [0, 0.16, -0.1], arcl: [0, 0.1, 0.07] }));
  keys.push(K(34.4, { ...leanTo('l', 0.9), hr: rimGripR, fr: 'gripPole', hl: stemGoal(budHead(0, 0.0, 0.08, 0.0), K3(-0.1, -0.1, -0.99), K3(0, -0.8, -0.5), [-PK.elb[0], PK.elb[1], PK.elb[2]]), fl: 'open', ease: 'inout', arcl: [0, 0.17, -0.06], arcr: [0, 0.16, -0.1] }));
  keys.push(K(FL.T.grabB, { ...leanTo('l'), hr: rimGripR, fr: 'gripPole', hl: stemGoal(budHead(0), K3(-0.1, -0.25, -0.96), K3(0, -0.8, -0.5), [-PK.elb[0], PK.elb[1], PK.elb[2]]), fl: 'gripStem', ease: 'inout' }));
  keys.push(K(35.15, { ...leanTo('l', 0.97), hr: rimGripR, fr: 'gripPole', hl: stemGoal(budHead(0, -0.01, 0.03, 0.02), K3(-0.3, 0.6, -0.74), K3(0, -0.8, -0.5), [-PK.elb[0], PK.elb[1], PK.elb[2]]), fl: 'gripStem', ease: 'snap' }));
  keys.push(K(35.45, { ...leanTo('l', 0.88), hr: rimGripR, fr: 'gripPole', hl: stemGoal(budHead(0, 0.0, 0.2, -0.08), K3(-0.16, 0.92, -0.36), K3(0, -0.3, -1), [-PK.elb[0], PK.elb[1], PK.elb[2]]), fl: 'gripStem', ease: 'out' }));
  keys.push(K(35.9, { ...lean, root: [PK.rootX, PK.rootY + 0.04, PK.rootZ], pelvis: [PK.pelvis, 0, 0], spine: [0.22, 0.2, 0.04], neck: [0.0, 0, 0], head: [0.1, 0, 0], hr: rimGripR, fr: 'gripPole', hl: stemGoal(K3(-1.1, 0.54, -0.58), K3(-0.1, 0.94, -0.32), K3(0, 0, -1), [1, 0, 0.3]), fl: 'gripStem', ease: 'inout' }));
  keys.push(K(36.6, { ...up, root: [0.04, -0.48, -0.04], spine: [0.46, 0.42, -0.05], neck: [0.05, 0, 0], head: [0.24, 0.2, 0], hr: rimGripR, fr: 'gripPole', hl: stemGoal(K3(-1.27, 0.385, -0.335), n3Fn(-0.3, 0.85, -0.45), K3(0, 0, -1), [1, -0.2, 0.3]), fl: 'gripStem', ease: 'inout' }));
  const layB = stemGoal(() => FL.rest[1].head.clone(), () => FL.rest[1].axis.clone(), K3(0.55, 0.1, 0.83), [0.6, 0.5, 0.6]);
  // the mẹt is in front of her, so she lays this one the way she laid the first: leaning out over the boat's floor
  // she turns on her heels toward the bow to put this one down: her left shoulder cannot reach the mẹt from the pick's pose
  const sqB = { body: [PK.bx + L.bFwd, PK.bz, PI + PK.yaw + L.bTurn], ar: [PK.bx + 0.14 + L.bFwd, PK.bz + 0.04, PI + PK.yaw + L.bTurn - 0.32], al: [PK.bx - 0.14 + L.bFwd, PK.bz + 0.05, PI + PK.yaw + L.bTurn + 0.3] };
  // she holds the rim further toward the bow while she turns, so her right arm is not squeezed against her chest
  const rimGripB = boatGrip(rimL(PK.bx + 0.46), [-1, 0, 0], [0, -0.6, -1], { elbow: [0.6, -0.35, 0.8] });
  const layPoseB = { ...up, ...sqB, root: [L.bRootX, L.bRootY + 0.015, L.bRootZ], pelvis: [L.bPelvis, 0, 0], spine: [L.bSpine, L.bTwist, -0.12], neck: [0.02, -0.28, 0], head: [0.26, -0.04, 0], hr: rimGripB, fr: 'gripPole' };
  const overB = (dx, dy, dz) => () => FL.rest[1].head.clone().add(V3(dx, dy, dz));
  // she brings it down over the spot from outside her own knee, then sets it down: never across her leg
  const sqHalf = { body: [PK.bx + L.bFwd * 0.5, PK.bz, PI + PK.yaw + L.bTurn * 0.45], ar: sqB.ar, al: sqB.al };
  keys.push(K(36.82, { ...up, ...sqHalf, root: [L.bRootX * 0.5, -0.5, 0], pelvis: [0.6, 0, 0], spine: [0.5, L.bTwist * 0.7, -0.08], neck: [0.05, 0, 0], head: [0.26, 0.2, 0], hr: rimGripB, fr: 'gripPole', hl: stemGoal(K3(-1.02, 0.34, -0.5), n3Fn(-0.15, 0.95, -0.28), K3(0, 0, -1), [1, -0.05, 0.5]), fl: 'gripStem', ease: 'inout' }));
  keys.push(K(37.02, { ...layPoseB, root: [L.bRootX * 0.7, -0.49, L.bRootZ], spine: [0.56, L.bTwist * 0.9, -0.1], hl: stemGoal(K3(-0.72, 0.13, -0.44), n3Fn(-0.35, 0.86, -0.36), K3(0, 0, -1), [1, -0.1, 0.45]), fl: 'gripStem', ease: 'inout' }));
  keys.push(K(37.18, { ...layPoseB, root: [L.bRootX * 0.9, -0.51, L.bRootZ], spine: [0.56, L.bTwist * 0.95, -0.1], hl: stemGoal(overB(-0.02, 0.17, -0.22), n3Fn(-0.75, 0.42, -0.5), K3(0, 0, -1), [1, -0.2, 0.35]), fl: 'gripStem', ease: 'inout' }));
  keys.push(K(37.3, { ...layPoseB, hl: layB, fl: 'gripStem', ease: 'inout' }));
  keys.push(K(FL.T.relB, { ...layPoseB, hl: layB, fl: 'open', ease: 'inout' }));
  keys.push(K(37.95, { ...layPoseB, spine: [0.5, L.bTwist * 0.9, -0.1], hl: stemGoal(overB(-0.05, 0.16, -0.22), n3Fn(-0.3, 0.88, -0.36), K3(0, 0, -1), [1, -0.25, 0.3]), fl: 'open', ease: 'out' }));
  keys.push(K(38.15, { ...up, ...sqHalf, root: [L.bRootX * 0.5, -0.5, 0], pelvis: [0.58, 0, 0], spine: [0.48, L.bTwist * 0.6, -0.06], neck: [0.05, 0, 0], head: [0.24, 0.16, 0], hr: rimGripB, fr: 'gripPole', hl: stemGoal(K3(-0.9, 0.16, -0.46), n3Fn(-0.2, 0.9, -0.34), K3(0, 0, -1), [1, -0.2, 0.4]), fl: 'open', ease: 'inout' }));
  keys.push(K(38.4, { ...squat, spine: [0.44, 0.2, 0], hr: rimGripR, fr: 'gripPole', hl: kneeHand('l'), fl: 'relax', ease: 'inout', arcl: [0.05, 0.08, 0.04] }));
  keys.push(K(39.4, { ...squat, spine: [0.38, 0, 0], ...onKnees, ease: 'inout', arcr: [0, 0.09, 0.05] }));
  await Y('keys');
  // ---- stand, turn left again to face the pole's side: the left foot steps round, then the right
  keys.push(K(40.2, { ...SQ, ...T2, root: [0, -0.03, 0], ease: 'inout', arcl: [-0.07, 0.07, 0], arcr: [0.07, 0.07, 0] }));
  keys.push(K(40.55, { ...SQ, ...T2, body: [-0.78, 0.02, 4.0], ar: OUT.ar, stepr: 0.02, ease: 'inout' }));
  keys.push(K(40.95, { ...OUT, ...T2, body: [-0.77, 0.06, 4.9], sal: 0.05, sbl: 0.9, stepl: 0.05, ease: 'inout' }));
  keys.push(K(41.3, { ...FLIP, ...T2, ease: 'inout' }));
  // (she bends down to the pole first, her hands still by her sides, so they never sweep past her hat)
  keys.push(K(41.65, { ...FLIP, ...T2, root: [0, -0.24, -0.02], pelvis: [0.22, 0.02, 0], spine: [0.26, 0.08, 0], neck: [-0.12, 0, 0], head: [0.12, 0.1, 0], ease: 'inout' }));
  await Y('keys');
  // ---- take up the pole, lift it, swing its top up over her head while its foot dips round through the water, let it down
  const flipHands = (lpd, rpd, { lout = 0, rout = 0 } = {}) => ({ hl: poleGoal(pole, { pd: lpd, thumb: 1, elbow: [0.7, -0.7, -0.2], out: lout }), fl: 'gripPole', hr: poleGoal(pole, { pd: rpd, thumb: 1, elbow: [-0.7, -0.8, -0.2], out: rout }), fr: 'gripPole' });
  keys.push(K(41.95, { ...FLIP, root: [0, -0.44, -0.04], pelvis: [0.38, 0.04, 0], spine: [0.44, 0.12, 0], clavL: [0.15, 0, 0], clavR: [0.15, 0, 0], neck: [-0.24, 0, 0], head: [-0.05, 0.2, 0], ...flipHands(0.34, -0.19), arcl: [0, -0.01, 0.05], arcr: [0, -0.02, 0.06], ease: 'inout' }));
  keys.push(K(42.45, { ...FLIP, root: [0, -0.1, 0.05], pelvis: [0.15, 0.04, 0], spine: [0.2, 0.1, 0], neck: [-0.16, 0, 0], head: [0.04, 0.1, 0], ...flipHands(0.33, -0.12), arcr: [0, 0.0, 0.05], ease: 'inout' }));
  keys.push(K(43.1, { ...FLIP, root: [0, -0.06, 0.08], pelvis: [0.06, 0.04, 0], spine: [0.08, 0.08, 0], neck: [0.08, 0, 0], head: [0.34, 0.05, 0], ...flipHands(0.28, -0.14), ease: 'inout' }));
  // (the right hand lets go under the left and takes the pole again above it)
  keys.push(K(43.45, { ...FLIP, root: [0, -0.05, 0.09], pelvis: [0.05, 0.04, 0], spine: [0.07, 0.08, 0], neck: [0.08, 0, 0], head: [0.34, 0.05, 0], ...flipHands(0.22, 0.04, { rout: 0.075 }), fr: 'open', fswitchr: 0.2, ease: 'inout' }));
  keys.push(K(43.8, { ...FLIP, root: [0, -0.04, 0.09], pelvis: [0.04, 0.04, 0], spine: [0.06, 0.08, 0], neck: [0.08, 0, 0], head: [0.34, 0.05, 0], ...flipHands(0.12, 0.09, { rout: 0.05 }), fswitchr: 0.8, ease: 'inout' }));
  keys.push(K(44.3, { ...FLIP, root: [0, -0.05, 0.08], pelvis: [0.06, 0.04, 0], spine: [0.1, 0.08, 0], neck: [0.1, 0, 0], head: [0.34, 0.05, 0], ...flipHands(-0.02, 0.08), ease: 'inout' }));
  const outHold = { hr: poleGoal(pole, { ph: SP.phU, elbow: [-SP.eU[0], SP.eU[1], SP.eU[2]] }), fr: 'gripPole', hl: poleGoal(pole, { ph: SP.phL, elbow: [-SP.eL[0], SP.eL[1], SP.eL[2]] }), fl: 'gripPole' };
  keys.push(K(44.9, { ...OUT, root: [0, -0.04, 0.03], pelvis: [0.06, 0.06, 0], spine: [0.14, 0.12, 0], neck: [0.1, 0, 0], head: [0.4, 0.08, 0], ...outHold, ease: 'inout' }));
  await Y('keys');
  // ---- out
  for (let k = 8; k < S.length; k++) stroke(S[k]);
  const last = stroke0Like(OUT);
  keys.push(K(LOOP, { ...keys[keys.length - 1], ...last, ease: 'inout' }));
  keys.sort((p, q) => p.f - q.f);
  return keys;

  function stroke0Like(stance) {
    return { ...stance, root: [0, -0.02, 0], pelvis: [0.06, 0.05, 0], spine: [0.14, 0.16, -0.02], neck: [0.12, 0, 0], head: [0.34, 0.1, 0] };
  }
}
function n3Fn(x, y, z) { const v = n3(x, y, z); return () => v.clone(); }

// the flowers' pose for a drawing (boat space): 'hidden' | 'hand' | 'rest', and each bud on its plant
export function flowerState(a, t, W, FL) {
  const T = FL.T;
  const out = { picked: [], bloom: [t >= T.showBud && t < T.grabA ? 1 : 0, t >= T.showBud && t < T.grabB ? 1 : 0].reverse() };
  // bloom[i] belongs to PICK[i]: PICK[1] is picked first (grabA), PICK[0] second (grabB)
  out.bloom = [t >= T.showBud && t < T.grabB, t >= T.showBud && t < T.grabA];
  const inHand = (s) => {
    const hb = a.B[`hand_${s}`];
    const H = a.hand[s];
    const g = hb.localToWorld(H.gripStem.clone());
    const across = H.gripAxis.clone();
    const th = across.transformDirection(hb.matrixWorld).multiplyScalar(s === 'r' ? 1 : -1);
    const fw = H.f0.clone().transformDirection(hb.matrixWorld);
    const head = g.clone().addScaledVector(th, GRIP_HEAD);
    return matFrom(head, th, fw);
  };
  const restM = (r) => matFrom(r.head, r.axis, V3(Math.cos(r.twist), 0, Math.sin(r.twist)));
  out.picked[0] = t < T.grabA ? null : t < T.relA ? inHand('r') : restM(FL.rest[0]);
  out.picked[1] = t < T.grabB ? null : t < T.relB ? inHand('l') : restM(FL.rest[1]);
  return out;
}
function matFrom(pos, up, side) {
  const Y = up.clone().normalize();
  const X = side.clone().addScaledVector(Y, -side.dot(Y)).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y);
  return new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(pos);
}

export function setupHands(a) {
  // (a thick bamboo pole: the fingers stay open enough to wrap it)
  a.fitWrap('r', 0.036);
  a.fitWrap('l', 0.036);
  a.fitNamedGrip('r', 'stem', 0.0065);
  a.fitNamedGrip('l', 'stem', 0.0065);
}

// capsules of the body as it stands now (world), for painted shadows and quick checks
export function capsulesOf(a) {
  const w = (n) => a.wp(n);
  return [
    [w('pelvis'), w('neck_01'), 0.16],
    [w('head'), w('head').add(V3(0, 0.12, 0)), 0.2],
    [w('upperarm_l'), w('lowerarm_l'), 0.06], [w('lowerarm_l'), w('hand_l'), 0.05], [w('hand_l'), w('middle_02_l'), 0.04],
    [w('upperarm_r'), w('lowerarm_r'), 0.06], [w('lowerarm_r'), w('hand_r'), 0.05], [w('hand_r'), w('middle_02_r'), 0.04],
    [w('thigh_l'), w('calf_l'), 0.09], [w('calf_l'), w('foot_l'), 0.07],
    [w('thigh_r'), w('calf_r'), 0.09], [w('calf_r'), w('foot_r'), 0.07],
  ];
}
