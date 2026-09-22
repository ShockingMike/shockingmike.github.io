// Chớm, mùa Đông: what each winter person wears (colours per garment) and does (the key drawings, on twos at 24 fps).
// Character space: the person faces +z, her left is +x, y is up. Goals are either fixed points in that space or functions of
// the frame (the cob the seller turns, the incense held at the forehead during a bow).
import * as THREE from 'three';
import { V3, n3, sm, clamp01, EASE, FINGERS, FPS, STEP } from './rig.js';

const TAU = Math.PI * 2;
const D = Math.PI / 180;
const rot = (v, axis, a) => v.clone().applyAxisAngle(axis, a);

// finger presets of this season
FINGERS.husk = { index: [1.05, 1.0, 0.62], middle: [1.12, 1.02, 0.64], ring: [1.75, 1.6, 1.05], pinky: [1.8, 1.6, 1.05], thumb: [0.72, 0.62, 0.42], oppose: 1.38, spread: [0, 0, 0, 0, 0] };
FINGERS.rub = { index: [0.08, 0.1, 0.06], middle: [0.08, 0.1, 0.06], ring: [0.1, 0.12, 0.08], pinky: [0.12, 0.14, 0.08], thumb: [-0.05, 0.0, 0.0], oppose: -0.1, spread: [-0.04, 0, -0.04, -0.06, 0] };
FINGERS.knee = { index: [0.08, 0.2, 0.14], middle: [0.1, 0.22, 0.15], ring: [0.13, 0.24, 0.16], pinky: [0.16, 0.26, 0.18], thumb: [0.05, 0.12, 0.1], oppose: 0.15, spread: [0.04, 0, 0.03, 0.08, 0.02] };
FINGERS.cheek = { index: [0.12, 0.18, 0.12], middle: [0.12, 0.18, 0.12], ring: [0.16, 0.2, 0.14], pinky: [0.2, 0.22, 0.14], thumb: [0.05, 0.1, 0.08], oppose: 0.2, spread: [0.04, 0, 0.03, 0.08, 0.05] };

export function worldInfo(layout, core) {
  const br = layout.brazier ?? {};
  const bz = (br.isVector3 ? br : br.at ?? V3(2.55, 0, -2.3)).clone();
  const cob = (br.cobTurned ?? layout.cob ?? V3(2.53, 0.434, -2.44)).clone();
  // the turned cob lies along its group's x axis, the group turned 0.12 rad about y (seasons/dong/brazier.js)
  const cobAxis = V3(Math.cos(layout.cobRy ?? 0.12), 0, -Math.sin(layout.cobRy ?? 0.12));
  return {
    bz, grillY: 0.4, cob, cobAxis, cobR: 0.031, cobLen: 0.21,
    handle: cob.clone().addScaledVector(cobAxis, 0.15),
    bowl: layout.incense?.bowl?.clone() ?? layout.bowl?.clone() ?? null,
  };
}

// ---------------------------------------------------------------- looks
const SKIN = { kind: 'skin', col: '#5a3226', col2: '#c89070', hatch: '#3a1a14', hi: '#ffe0c8', scale: 7, bump: 0.25, hatchAmt: 0.3, hatchScale: 10, rim: 0.9, ink: 1.4, cav: 0.6 };
export const SPECS = {};

// ================================================================ the corn seller
const ROLLS = [[18, 28], [38, 48], [58, 68]];      // frames when her fingers hold the husk and roll it a third of a turn
const rollEase = (u) => EASE.inout(clamp01(u));
function sellerPhase(f) {
  // -> { k: turns done (0..3), roll: the hand's roll (rad), holding: bool, open: 0..1 }
  let k = 0;
  for (const [a, b] of ROLLS) k += rollEase((f - a) / (b - a));
  for (let i = 0; i < ROLLS.length; i++) {
    const [a, b] = ROLLS[i];
    if (f >= a && f <= b) return { k, roll: (-50 + 100 * rollEase((f - a) / (b - a))) * D, holding: true, open: 0, i };
    const next = ROLLS[i + 1];
    if (next && f > b && f < next[0]) {
      // let go, turn the open hand back, take hold again
      const u = (f - b) / (next[0] - b);
      return { k, roll: (50 - 100 * EASE.inout(sm(0.15, 0.85, u))) * D, holding: false, open: Math.sin(u * Math.PI), i };
    }
  }
  return { k, roll: f < ROLLS[0][0] ? -50 * D : 50 * D, holding: false, open: 1, i: -1 };
}
SPECS.seller = {
  loop: 6,
  looks: {
    skin: SKIN,
    jacket: { kind: 'quilt', col: '#0e1e22', col2: '#3a6a6c', hatch: '#060e10', hi: '#d8f0e8', back: '#0a1416', scale: 5, bump: 0.5, hatchAmt: 0.75, hatchScale: 7, rim: 0.8, ink: 2.6 },
    pants: { kind: 'cotton', col: '#15161e', col2: '#4a4c5c', hatch: '#08080e', scale: 6, bump: 0.5, hatchAmt: 0.6, hatchScale: 6, rim: 0.6, ink: 2.2 },
    hat: { kind: 'knit', stripe: 1, hi: '#e6b452', col: '#0e1426', col2: '#34457a', hatch: '#060812', scale: 12, bump: 0.8, hatchAmt: 0.6, hatchScale: 9, rim: 0.8, ink: 2.0 },
    scarf: { kind: 'wool', col: '#4e4436', col2: '#c8b894', hatch: '#2a2218', scale: 9, bump: 0.9, hatchAmt: 0.65, hatchScale: 8, rim: 0.85, ink: 2.2 },
    socks: { kind: 'knit', col: '#3a3e4a', col2: '#9aa0ae', hatch: '#1a1c24', scale: 14, bump: 0.6, hatchAmt: 0.4, ink: 1.4 },
    shoes: { kind: 'plastic', col: '#1c1c24', col2: '#6a6a78', hatch: '#0a0a10', scale: 14, gloss: 0.6, hatchAmt: 0.3, ink: 1.6 },
    bamboo: { kind: 'bamboo', col: '#30200e', col2: '#a07a40', hatch: '#2a1a08', scale: 16, bump: 0.8, hatchAmt: 0.4, rim: 0.9, ink: 1.6, cav: 0 },
  },
  fit(a) {
    a.fitGrip('r', 0.007, [1.35, 1.2, 1.05, 0.92]);
    a.fitPinch('l', 'husk');
  },
  // the bamboo fan (quạt nan): a round woven blade on a split-bamboo handle, held in her right fist
  props(a) {
    const H = a.hand.r;
    const ax = H.gripAxis.clone();              // along the fist's hole, toward the thumb side
    // frame: x = f0 (the blade's width), y = ax (past the thumb side, along the handle), z = p0 (the blade's face)
    const handle = new THREE.CylinderGeometry(0.0068, 0.0075, 0.118, 8, 1);
    handle.translate(0, 0.041, 0);
    const disc = new THREE.CylinderGeometry(1, 1, 1, 28, 1);
    disc.scale(0.108, 0.0045, 0.118);
    disc.rotateX(Math.PI / 2);
    disc.translate(0, 0.19, 0);
    const rim = new THREE.TorusGeometry(1, 0.045, 5, 28);
    rim.scale(0.108, 0.118, 0.1);
    rim.translate(0, 0.19, 0);
    const out = mergeSimple([handle, disc, rim]);
    // the weave runs in the blade's own plane: keep its coordinates before placing it in the hand
    const bp = out.attributes.position;
    const fl = new Float32Array(bp.count * 2);
    for (let i = 0; i < bp.count; i++) { fl[i * 2] = (bp.getX(i) + bp.getY(i)) * 0.7; fl[i * 2 + 1] = (bp.getX(i) - bp.getY(i)) * 0.7; }
    out.setAttribute('aFlow', new THREE.BufferAttribute(fl, 2));
    const zf = new THREE.Vector3().crossVectors(H.f0, ax).normalize();
    out.applyMatrix4(new THREE.Matrix4().makeBasis(H.f0.clone(), ax.clone(), zf).setPosition(H.grip));
    return [{ geo: out, bone: 'hand_r', look: 'bamboo', keepFlow: true }];
  },
  keys(a, W) {
    const C = a.L(W.bz); C.y = 0;
    const P = a.P;
    const kneeL = P('calf_l'), kneeR = P('calf_r');
    const toC = V3(C.x, 0, C.z).normalize();
    // the fan by the stove's near flank, on her right, its face to the coals
    const fanAt = V3(-0.345, 0.52, 0.36);
    const face = V3(C.x - fanAt.x, 0, C.z - fanAt.z).normalize();
    const down = V3(0, -1, 0);
    const fanFwd = new THREE.Vector3().crossVectors(down, face).normalize();   // f0 = across x palm
    const fanGoal = (beat) => {
      const f = rot(fanFwd, V3(0, 1, 0), beat), p = rot(face, V3(0, 1, 0), beat);
      return { at: fanAt.clone(), fwd: f, palm: p, pole: n3(-1, -0.2, -0.4), anchor: 'grip' };
    };
    // resting: the hand hangs loosely at the outside of her right knee, the fan pointing down and forward past the shin
    // (the handle runs along cross(fingers, palm): choose the palm, then the fingers that put the handle where it hangs)
    const hangD = n3(-0.12, -0.95, 0.29);   // it hangs down her shin, not out across the pavement to the man beside her
    const restPalm = V3(1, 0, 0).addScaledVector(hangD, -hangD.x).normalize();
    const restFwd = new THREE.Vector3().crossVectors(restPalm, hangD).normalize();
    const fanRest = { at: kneeR.clone().add(V3(-0.1, 0.03, 0.05)), fwd: restFwd, palm: restPalm, pole: n3(-1, 0.3, -0.5), anchor: 'grip' };
    // on the way between rest and fanning the fan points forward, low over her knee, toward the stove
    const liftD = n3(0.05, 0.55, 0.85);
    const liftPalm = V3(1, 0, 0).addScaledVector(liftD, -liftD.x).normalize();
    const lift = { at: kneeR.clone().add(V3(-0.05, 0.12, 0.04)), fwd: new THREE.Vector3().crossVectors(liftPalm, liftD).normalize(), palm: liftPalm, pole: n3(-1, -0.1, -0.5), anchor: 'grip' };
    const handL = { at: kneeL.clone().add(V3(0.0, 0.138, -0.015)), fwd: n3(0.05, -0.3, 1), palm: n3(0, -1, -0.3), pole: n3(1, -0.2, -0.5), anchor: 'palm' };
    const cobL = {
      fn: (act, f) => {
        const ph = sellerPhase(f);
        const Aw = W.cobAxis;
        const p = W.handle.clone();
        const fwd = Aw.clone().negate();
        const palm0 = V3(0, -1, 0);
        const palm = rot(palm0, Aw, ph.roll);
        // let go: back off along the stick and up a little
        p.addScaledVector(Aw, 0.03 * ph.open).add(V3(0, 0.05 * ph.open, 0));
        p.y += 0.009;
        return { p, fwd, palm, pole: act.Wd(n3(0.35, 0.8, 0.25)), anchor: 'pinch', fingers: ph.open > 0.25 ? 'open' : 'husk' };
      },
    };
    const reachL = {
      fn: (act, f) => {
        const g = cobL.fn(act, ROLLS[0][0]);
        g.p.add(V3(0, 0.05, 0)).addScaledVector(W.cobAxis, 0.05);
        g.fingers = 'open';
        return g;
      },
    };
    const body0 = { pelvis: [0, 0, 0], spine: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0] };
    const K = [
      { f: 0, name: 'rest', ease: 'hold', ...body0, spine: [0.07, 0, 0], neck: [0.05, 0, 0], head: [0.1, 0.03, 0], hl: handL, hr: fanRest, fl: 'knee', fr: 'grip' },
      { f: 8, name: 'ready', ease: 'inout', pelvis: [0.05, 0, 0], spine: [0.08, 0.03, 0], neck: [0.05, 0.05, 0], head: [0.1, 0.08, 0], clavL: [0, -0.05, 0.03], hl: handL, hr: fanRest, fl: 'knee', fr: 'grip' },
      { f: 14, name: 'reach', ease: 'snap', pelvis: [0.14, 0, 0], spine: [0.17, 0.06, 0], neck: [-0.04, 0.1, 0], head: [0.02, 0.12, 0], clavL: [0, -0.16, 0.02], hl: reachL, hr: fanRest, fl: 'open', fr: 'grip', arcl: [0.06, 0.05, 0] },
      { f: 18, name: 'take', ease: 'out', pelvis: [0.15, 0, 0], spine: [0.18, 0.07, 0], neck: [-0.04, 0.1, 0], head: [0.04, 0.06, 0], clavL: [0, -0.18, 0.02], hl: cobL, hr: fanRest, fr: 'grip' },
      { f: 68, name: 'turned', ease: 'lin', pelvis: [0.15, 0, 0], spine: [0.19, 0.07, 0], neck: [-0.04, 0.1, 0], head: [0.05, 0.07, 0], clavL: [0, -0.18, 0.02], hl: cobL, hr: fanRest, fr: 'grip' },
      { f: 72, name: 'let-go', ease: 'out', pelvis: [0.12, 0, 0], spine: [0.16, 0.06, 0], neck: [0.0, 0.1, 0], head: [0.06, 0.1, 0], clavL: [0, -0.08, 0.02], hl: reachL, hr: lift, fl: 'open', fr: 'grip' },
      { f: 78, name: 'fan-up', ease: 'snap', pelvis: [0.06, 0, 0], spine: [0.1, -0.06, 0], neck: [0.05, -0.06, 0], head: [0.1, -0.1, 0.02], clavR: [0, -0.04, -0.03], hl: handL, hr: fanGoal(-18 * D), fl: 'knee', fr: 'grip', arcr: [-0.02, 0.1, 0.04], arcl: [0.02, 0.04, 0] },
    ];
    // the beats: in (toward the coals) fast, back out slower, on twos
    let f = 80;
    const beats = [];
    while (f < 124) {
      beats.push({ f, name: 'beat-in', ease: 'snap', beat: 20 * D, bodyk: 1 });
      beats.push({ f: f + 4, name: 'beat-out', ease: 'inout', beat: -18 * D, bodyk: 0 });
      f += 8;
    }
    for (const b of beats) K.push({
      f: b.f, name: b.name, ease: b.ease,
      pelvis: [0.06, 0, 0], spine: [0.1 + 0.01 * b.bodyk, -0.06 - 0.015 * b.bodyk, 0], neck: [0.05, -0.06, 0], head: [0.1, -0.1, 0.02 + 0.01 * b.bodyk],
      clavR: [0, -0.04 - 0.02 * b.bodyk, -0.03], hl: handL, hr: fanGoal(b.beat), fl: 'knee', fr: 'grip',
    });
    K.push({ f: 128, name: 'fan-down', ease: 'inout', arcr: [-0.03, 0.03, 0.0], pelvis: [0.05, 0, 0], spine: [0.08, -0.02, 0], neck: [0.05, 0, 0], head: [0.12, -0.03, 0], hl: handL, hr: { ...fanGoal(-25 * D), at: kneeR.clone().add(V3(-0.13, 0.085, 0.1)) }, fl: 'knee', fr: 'grip' });
    K.push({ f: 134, name: 'settle', ease: 'out', ...body0, spine: [0.07, 0, 0], neck: [0.05, 0, 0], head: [0.1, 0.02, 0], hl: handL, hr: fanRest, fl: 'knee', fr: 'grip' });
    K.push({ f: 144, name: 'rest', ease: 'hold', ...body0, spine: [0.07, 0, 0], neck: [0.05, 0, 0], head: [0.1, 0.03, 0], hl: handL, hr: fanRest, fl: 'knee', fr: 'grip' });
    return K;
  },
  turn(a, t) {
    const f = Math.floor((((t % a.loop) + a.loop) % a.loop) * FPS / STEP) * STEP;
    return sellerPhase(f).k;
  },
  fanning(a, t) {
    const tt = ((t % a.loop) + a.loop) % a.loop;
    return sm(3.2, 3.4, tt) * (1 - sm(5.1, 5.35, tt));
  },
};

// ================================================================ the man warming his hands
// palms over the stove's near rim, the forearms low over the knees; he draws his hands back while the seller reaches in
// near: how far the hands stay from the stove's centre (they never go past its rim); maxOut: how far they can go from the seat
function overCoals(a, W, side, { lat = 0.085, up = 0.6, near = 0.26, palmUp = 0, tilt = 0, maxOut = 0.52 } = {}) {
  const C = a.L(W.bz); C.y = 0;
  const dist = C.length();
  const d = V3(C.x, 0, C.z).normalize();
  const lx = new THREE.Vector3().crossVectors(V3(0, 1, 0), d).normalize();   // toward his left
  const sx = side === 'l' ? 1 : -1;
  const at = d.clone().multiplyScalar(Math.min(dist - near, maxOut)).addScaledVector(lx, sx * lat);
  at.y = up;
  const fwd = d.clone().addScaledVector(lx, sx * 0.3).add(V3(0, -0.18 + tilt, 0)).normalize();
  const palm = rot(V3(0, -1, 0).addScaledVector(lx, -sx * 0.15).normalize(), fwd, sx * palmUp);
  return { at, fwd, palm, pole: n3(sx * 1, -0.35, -0.25), anchor: 'palm' };
}
function rubAt(a, W, k, { up = 0.64, near = 0.42, lift = 0, gap = 0.031, maxOut = 0.4, minOut = 0 } = {}) {
  // the hands together over the knees, palms against each other, sliding
  const C = a.L(W.bz); C.y = 0;
  const dist = C.length();
  const d = V3(C.x, 0, C.z).normalize();
  // minOut: keep her hands out in front of her, whatever the season's seat, or her sleeves end up inside her own coat
  const at = d.clone().multiplyScalar(Math.max(minOut, Math.min(dist - near, maxOut))); at.y = up + lift;
  const lx = new THREE.Vector3().crossVectors(V3(0, 1, 0), d).normalize();
  const slide = 0.028 * k;
  const f = d.clone().add(V3(0, 0.45, 0)).normalize();
  return {
    hl: { at: at.clone().addScaledVector(lx, gap).addScaledVector(f, slide).add(V3(0, 0.012, 0)), fwd: f.clone(), palm: lx.clone().negate(), pole: n3(1, -0.5, -0.3), anchor: 'palm' },
    hr: { at: at.clone().addScaledVector(lx, -gap).addScaledVector(f, -slide).add(V3(0, -0.012, 0)), fwd: f.clone(), palm: lx.clone(), pole: n3(-1, -0.5, -0.3), anchor: 'palm' },
  };
}
const leanK = (k, turn = 0, look = 0) => ({ pelvis: [0.1 * k, 0, 0], spine: [0.14 * k, turn, 0], neck: [0.02, look * 0.4, 0], head: [0.04 * k, look * 0.6, 0] });
const hunch = (k = 1) => ({ clavL: [0, 0, 0.07 * k], clavR: [0, 0, -0.07 * k] });
const leanKA = (k) => { const o = leanK(k, 0, 0.0); o.neck[0] += 0.04; o.head[0] += 0.1; return o; };
const leanKB = (k) => { const o = leanK(k, 0, 0.15); o.neck[0] += 0.03; o.head[0] += 0.08; return o; };
SPECS.warmerA = {
  loop: 6,
  looks: {
    skin: SKIN,
    jacket: { kind: 'felt', col: '#161a26', col2: '#4a5872', hatch: '#080a12', hi: '#e8e0f0', back: '#0e1018', scale: 7, bump: 0.35, hatchAmt: 0.75, hatchScale: 6, rim: 0.8, ink: 2.6 },
    pants: { kind: 'cotton', col: '#1a1a20', col2: '#50505c', hatch: '#08080c', scale: 6, bump: 0.4, hatchAmt: 0.6, ink: 2.2 },
    hat: { kind: 'felt', col: '#261c14', col2: '#6e563c', hatch: '#120c08', hi: '#f0d8b8', scale: 9, bump: 0.3, hatchAmt: 0.6, hatchScale: 8, rim: 0.9, ink: 2.4 },
    band: { kind: 'leather', col: '#0e0a08', col2: '#3a2a20', gloss: 0.4, ink: 1.2 },
    scarf: { kind: 'wool', col: '#3e1414', col2: '#a04a3c', hatch: '#1e0808', scale: 9, bump: 0.9, hatchAmt: 0.65, hatchScale: 8, rim: 0.85, ink: 2.2 },
    button: { kind: 'plastic', col: '#16100c', col2: '#6a5a48', gloss: 0.6, ink: 0.8 },
    shoes: { kind: 'leather', col: '#140e0c', col2: '#5a4030', hatch: '#080404', gloss: 0.7, ink: 1.8 },
    hair: { kind: 'hair', col: '#0c0b0e', col2: '#3a3a42', sheen: 0.6, ink: 1.2 },
  },
  keys(a, W) {
    const hold = (o = {}) => ({ hl: overCoals(a, W, 'l', o.l), hr: overCoals(a, W, 'r', o.r) });
    const R = (k, o) => rubAt(a, W, k, o);
    const K = [
      { f: 0, name: 'hold', ease: 'hold', ...leanKA(1), ...hunch(), ...hold(), fl: 'spread', fr: 'spread' },
      // she reaches in (her frame 8-18): he draws both hands back, toward his chest
      { f: 8, name: 'draw-a', ease: 'in', ...leanKA(1.05), ...hunch(), ...hold({ l: { up: 0.64 }, r: { up: 0.645 } }), fl: 'warm', fr: 'warm' },
      { f: 14, name: 'draw', ease: 'snap', ...leanKA(0.85), neck: [0.06, 0.04, 0], head: [0.12, 0.06, 0], ...hunch(1.2), ...R(0, { lift: 0.02 }), fl: 'rub', fr: 'rub', arcl: [0.03, 0.04, 0], arcr: [-0.03, 0.04, 0] },
    ];
    let f = 18, sgn = 1;
    while (f <= 46) { K.push({ f, name: 'rub', ease: 'inout', ...leanKA(0.85), neck: [0.06, 0.04, 0], head: [0.12, 0.06, 0], ...hunch(1.2), ...R(sgn), fl: 'rub', fr: 'rub' }); sgn = -sgn; f += 4; }
    K.push({ f: 54, name: 'breathe', ease: 'out', ...leanKA(0.8), ...hunch(1.35), neck: [0.06, 0.04, 0], head: [0.12, 0.06, 0], ...R(0, { up: 0.64, gap: 0.037 }), fl: 'rub', fr: 'rub' });
    K.push({ f: 70, name: 'breathe-hold', ease: 'hold', ...leanKA(0.82), ...hunch(1.3), neck: [0.06, 0.04, 0], head: [0.13, 0.06, 0], ...R(0, { up: 0.64, gap: 0.037 }), fl: 'rub', fr: 'rub' });
    // she lets go (her frame 72): his hands go back over the coals
    K.push({ f: 78, name: 'out-a', ease: 'in', ...leanKA(0.8), neck: [0.06, 0.04, 0], head: [0.12, 0.06, 0], ...hunch(1.2), ...R(0, { up: 0.64, gap: 0.042 }), fl: 'rub', fr: 'rub' });
    K.push({ f: 84, name: 'out', ease: 'snap', ...leanKA(1.05), ...hunch(), ...hold(), fl: 'spread', fr: 'spread', arcl: [0.03, 0.04, 0], arcr: [-0.03, 0.04, 0] });
    K.push({ f: 98, name: 'hold', ease: 'hold', ...leanKA(1.05), ...hunch(), ...hold(), fl: 'spread', fr: 'spread' });
    // turns the palms to the fire, one hand then the other
    K.push({ f: 104, name: 'flip-l', ease: 'snap', ...leanKA(1.05), ...hunch(), ...hold({ l: { palmUp: 140 * D, up: 0.645, tilt: 0.1 } }), fl: 'warm', fr: 'spread', arcl: [0, 0.03, 0] });
    K.push({ f: 110, name: 'flip-r', ease: 'snap', ...leanKA(1.05), ...hunch(), ...hold({ l: { palmUp: 140 * D, up: 0.645, tilt: 0.1 }, r: { palmUp: 140 * D, up: 0.65, tilt: 0.1 } }), fl: 'warm', fr: 'warm', arcr: [0, 0.03, 0] });
    K.push({ f: 122, name: 'hold-up', ease: 'hold', ...leanKA(1.08), ...hunch(), ...hold({ l: { palmUp: 140 * D, up: 0.645, tilt: 0.1 }, r: { palmUp: 140 * D, up: 0.65, tilt: 0.1 } }), fl: 'warm', fr: 'warm' });
    // a shiver: the cold on his back
    K.push({ f: 126, name: 'shiver', ease: 'snap', ...leanKA(1.12), ...hunch(1.6), neck: [0.07, 0.04, 0], ...hold({ l: { up: 0.625, lat: 0.082 }, r: { up: 0.625, lat: 0.082 } }), fl: 'warm', fr: 'warm' });
    K.push({ f: 134, name: 'settle', ease: 'out', ...leanKA(1.02), ...hunch(), ...hold(), fl: 'spread', fr: 'spread' });
    K.push({ f: 144, name: 'hold', ease: 'hold', ...leanKA(1), ...hunch(), ...hold(), fl: 'spread', fr: 'spread' });
    return K;
  },
};

// ================================================================ the young woman warming her hands, then her cheeks
SPECS.warmerB = {
  loop: 6,
  looks: {
    skin: SKIN,
    jacket: { kind: 'felt', col: '#1c1420', col2: '#5e4a6e', hatch: '#0c0810', hi: '#f0e0ff', back: '#140e18', scale: 7, bump: 0.35, hatchAmt: 0.7, hatchScale: 6, rim: 0.85, ink: 2.5 },
    under: { kind: 'knit', col: '#6a6050', col2: '#e8dcc4', hatch: '#3a3228', scale: 14, bump: 0.7, hatchAmt: 0.5, ink: 1.6 },
    pants: { kind: 'cotton', col: '#141622', col2: '#40465c', hatch: '#06070e', scale: 6, bump: 0.4, hatchAmt: 0.6, ink: 2.2 },
    scarf: { kind: 'wool', col: '#4e141a', col2: '#c85654', hatch: '#260a0c', hi: '#ffd0c0', scale: 7, bump: 1.0, hatchAmt: 0.65, hatchScale: 7, rim: 0.9, ink: 2.4 },
    hair: { kind: 'hair', col: '#08070a', col2: '#2e2b34', hatch: '#000000', hi: '#8a8698', sheen: 0.55, hatchAmt: 0, rim: 0.6, ink: 1.8 },
    button: { kind: 'plastic', col: '#16100c', col2: '#6a5a48', gloss: 0.6, ink: 0.8 },
    shoes: { kind: 'leather', col: '#140e0c', col2: '#4a3428', hatch: '#080404', gloss: 0.6, ink: 1.8 },
  },
  keys(a, W) {
    const hold = (o = {}) => ({ hl: overCoals(a, W, 'l', { lat: 0.075, up: 0.635, ...o.l }), hr: overCoals(a, W, 'r', { lat: 0.075, up: 0.635, ...o.r }) });
    // her right hand (the street side) goes up to the scarf and tugs it higher over her nose; the left stays at the fire
    const scarfHand = (lift = 0) => ({
      fn: (act) => {
        const hb = act.B.head;
        const hp = hb.getWorldPosition(new THREE.Vector3());
        const hq = hb.getWorldQuaternion(new THREE.Quaternion());
        const m = act.meta;
        const hc = V3(...m.headCentre), hAx = V3(...m.headAxis), hFw = V3(...m.headFwd);
        const rh = act.rest.head;
        const toW = (v) => v.clone().applyQuaternion(rh.wq.clone().invert()).applyQuaternion(hq);
        const up = toW(hAx), fw = toW(hFw), side = toW(new THREE.Vector3().crossVectors(hAx, hFw).normalize());
        const c = hp.clone().add(toW(hc.clone().sub(rh.wp)));
        const p = c.clone().addScaledVector(fw, 0.165).addScaledVector(up, -0.088 + lift).addScaledVector(side, -0.05);
        return { p, fwd: up.clone().addScaledVector(side, 0.35).normalize(), palm: fw.clone().negate().addScaledVector(side, 0.3).normalize(), pole: act.Wd(n3(-1, -0.25, 0.35)), anchor: 'pinch', fingers: 'pinch' };
      },
    });
    const K = [
      { f: 0, name: 'hold', ease: 'hold', ...leanKB(1), ...hunch(0.6), ...hold(), fl: 'warm', fr: 'warm' },
      { f: 12, name: 'closer', ease: 'inout', ...leanKB(1.1), ...hunch(0.8), ...hold({ l: { up: 0.628 }, r: { up: 0.632 } }), fl: 'spread', fr: 'warm' },
      { f: 22, name: 'hold', ease: 'hold', ...leanKB(1.12), ...hunch(0.8), ...hold({ l: { up: 0.628 }, r: { up: 0.632 } }), fl: 'spread', fr: 'spread' },
      // the cold gets in: the scarf up over the nose, two tugs
      { f: 30, name: 'reach-scarf', ease: 'in', ...leanKB(0.95), ...hunch(0.8), hl: { ...overCoals(a, W, 'l', { lat: 0.075, up: 0.635 }), pole: n3(1, 0.1, -0.15) }, hr: overCoals(a, W, 'r', { near: 0.4, up: 0.685, lat: 0.1 }), fl: 'warm', fr: 'cup' },
      { f: 36, name: 'scarf', ease: 'snap', ...leanKB(0.7), ...hunch(1), hl: { ...overCoals(a, W, 'l', { lat: 0.075, up: 0.635 }), pole: n3(1, 0.1, -0.15) }, hr: scarfHand(0), fl: 'warm', fr: 'pinch', arcr: [-0.04, 0.05, 0.02] },
      { f: 42, name: 'tug', ease: 'snap', ...leanKB(0.72), ...hunch(1.2), hl: { ...overCoals(a, W, 'l', { lat: 0.075, up: 0.635 }), pole: n3(1, 0.1, -0.15) }, hr: scarfHand(0.018), fl: 'warm', fr: 'pinch' },
      { f: 48, name: 'tug-back', ease: 'inout', ...leanKB(0.72), ...hunch(1.1), hl: { ...overCoals(a, W, 'l', { lat: 0.075, up: 0.635 }), pole: n3(1, 0.1, -0.15) }, hr: scarfHand(0.004), fl: 'warm', fr: 'pinch' },
      { f: 54, name: 'tug2', ease: 'snap', ...leanKB(0.74), ...hunch(1.25), hl: { ...overCoals(a, W, 'l', { lat: 0.075, up: 0.635 }), pole: n3(1, 0.1, -0.15) }, hr: scarfHand(0.02), fl: 'spread', fr: 'pinch' },
      { f: 66, name: 'scarf-hold', ease: 'hold', ...leanKB(0.76), ...hunch(1.15), hl: { ...overCoals(a, W, 'l', { lat: 0.075, up: 0.635 }), pole: n3(1, 0.1, -0.15) }, hr: scarfHand(0.016), fl: 'spread', fr: 'pinch' },
      { f: 74, name: 'down', ease: 'inout', ...leanKB(0.9), ...hunch(0.8), hl: { ...overCoals(a, W, 'l', { lat: 0.075, up: 0.635 }), pole: n3(1, 0.1, -0.15) }, hr: overCoals(a, W, 'r', { near: 0.4, up: 0.66, lat: 0.1 }), fl: 'warm', fr: 'warm', arcr: [-0.05, 0.02, 0.03] },
      { f: 80, name: 'out', ease: 'snap', ...leanKB(1.02), ...hunch(0.6), ...hold(), fl: 'spread', fr: 'spread', arcl: [0.02, 0.03, 0], arcr: [-0.02, 0.03, 0] },
      { f: 96, name: 'hold', ease: 'hold', ...leanKB(1.05), ...hunch(0.6), ...hold(), fl: 'spread', fr: 'spread' },
      // the rub, later than his
      { f: 102, name: 'together', ease: 'snap', ...leanKB(0.85), ...hunch(1), ...rubAt(a, W, 0, { up: 0.65, gap: 0.028, minOut: 0.3 }), fl: 'rub', fr: 'rub' },
    ];
    let f = 106, sgn = 1;
    while (f <= 126) { K.push({ f, name: 'rub', ease: 'inout', ...leanKB(0.85), ...hunch(1), ...rubAt(a, W, sgn, { up: 0.65, gap: 0.028, minOut: 0.3 }), fl: 'rub', fr: 'rub' }); sgn = -sgn; f += 4; }
    K.push({ f: 132, name: 'part', ease: 'inout', ...leanKB(0.9), ...hunch(0.8), ...rubAt(a, W, 0, { up: 0.65, gap: 0.036, minOut: 0.3 }), fl: 'warm', fr: 'warm' });
    K.push({ f: 138, name: 'out', ease: 'snap', ...leanKB(1), ...hunch(0.6), ...hold(), fl: 'warm', fr: 'warm', arcl: [0.04, 0.02, 0], arcr: [-0.04, 0.02, 0] });
    K.push({ f: 144, name: 'hold', ease: 'hold', ...leanKB(1), ...hunch(0.6), ...hold(), fl: 'warm', fr: 'warm' });
    return K;
  },
};

// ================================================================ the man at the altar: a burning stick of agarwood, three bows
SPECS.incense = {
  loop: 12,
  yaw: -0.22,                // turned a little to his right, away from the street
  order: ['r', 'l'],
  looks: {
    skin: SKIN,
    jacket: { kind: 'knit', col: '#1e2418', col2: '#6a7a4e', hatch: '#0c1008', hi: '#f0f0d0', back: '#141810', scale: 10, bump: 0.8, hatchAmt: 0.7, hatchScale: 7, rim: 0.9, ink: 2.4 },
    under: { kind: 'knit', col: '#16161c', col2: '#4e4e5a', hatch: '#08080c', scale: 12, bump: 0.7, hatchAmt: 0.5, ink: 1.6 },
    pants: { kind: 'cotton', col: '#18181e', col2: '#4e4e5a', hatch: '#08080c', scale: 6, bump: 0.4, hatchAmt: 0.6, ink: 2.2 },
    hair: { kind: 'hair', col: '#0a090c', col2: '#46464e', hatch: '#000000', hi: '#c8c8d4', sheen: 0.8, hatchAmt: 0.1, rim: 0.85, ink: 1.6 },
    button: { kind: 'plastic', col: '#1a120c', col2: '#7a6048', gloss: 0.6, ink: 0.8 },
    socks: { kind: 'knit', col: '#4a4a52', col2: '#b0b0ba', hatch: '#1a1a20', scale: 14, bump: 0.6, hatchAmt: 0.4, ink: 1.4 },
    shoes: { kind: 'plastic', col: '#2a1c14', col2: '#8a6a4a', hatch: '#140c08', gloss: 0.5, ink: 1.6 },
    scarf: { kind: 'wool', col: '#2a2a36', col2: '#6e7084', hatch: '#12121a', scale: 9, bump: 0.9, hatchAmt: 0.6, hatchScale: 8, rim: 0.85, ink: 2.0 },
    hat: { kind: 'knit', col: '#18181e', col2: '#4a4a56', hatch: '#08080c', scale: 12, bump: 0.8, hatchAmt: 0.5, hatchScale: 9, rim: 0.8, ink: 2.0 },
    stick: { kind: 'bamboo', col: '#2a160e', col2: '#7a4a30', hatch: '#140a06', scale: 30, bump: 0.3, hatchAmt: 0.2, ink: 0.9, band: 0, cav: 0 },
    ember: { kind: 'ember', col: '#8a1a08', col2: '#ffb040', emit: 1.6, ink: 0, band: 0, cav: 0 },
  },
  fit(a) { a.fitGrip('r', 0.0025, [1.45, 1.35, 1.25, 1.15]); },
  props(a) {
    const H = a.hand.r;
    const ax = H.gripAxis.clone();
    // the stick runs through the fist, out past the thumb and up; a glowing tip
    const stick = new THREE.CylinderGeometry(0.0022, 0.0026, 0.3, 5, 1);
    stick.translate(0, 0.1, 0);
    const ember = new THREE.CylinderGeometry(0.0034, 0.0028, 0.014, 6, 1);
    ember.translate(0, 0.257, 0);
    const zf = new THREE.Vector3().crossVectors(H.f0, ax).normalize();
    const M = new THREE.Matrix4().makeBasis(H.f0.clone(), ax.clone(), zf).setPosition(H.grip);
    stick.applyMatrix4(M); ember.applyMatrix4(M);
    a.tipLocal = V3(0, 0.262, 0).applyMatrix4(M);   // in hand space
    return [
      { geo: stick, bone: 'hand_r', look: 'stick', flow: (p) => [p.x * 60, p.y * 60] },
      { geo: ember, bone: 'hand_r', look: 'ember', hull: false },
    ];
  },
  tipWorld(a, out) {
    return out.copy(a.tipLocal).applyMatrix4(a.B.hand_r.matrixWorld);
  },
  keys(a, W) {
    const P = a.P;
    const head = P('head');
    // the right fist before the chest or the forehead; the stick upright
    const atHead = (lift, out = 0) => ({
      fn: (act) => {
        const hb = act.B.head;
        const hp = hb.getWorldPosition(new THREE.Vector3());
        const hq = hb.getWorldQuaternion(new THREE.Quaternion());
        const rq = act.rest.head.wq.clone().invert();
        const toW = (v) => v.clone().applyQuaternion(rq).applyQuaternion(hq);
        const m = act.meta;
        const hc = V3(...m.headCentre), hAx = V3(...m.headAxis), hFw = V3(...m.headFwd);
        const c = hp.clone().add(toW(hc.clone().sub(act.rest.head.wp)));
        const up = toW(hAx);
        // forward is the body's forward (the head may look aside), tipped with the head's bow
        const fb = act.Wd(V3(0, 0, 1));
        const fw = fb.clone().addScaledVector(up, -fb.dot(up)).normalize();
        const p = c.clone().addScaledVector(fw, 0.2 + out).addScaledVector(up, -0.05 + lift);
        // the fist as at the chest: knuckles forward and to his left, the palm to his left and back, the stick up the head's axis
        const side = new THREE.Vector3().crossVectors(up, fw).normalize();
        const fwd = fw.clone().add(side).normalize();
        const palm = side.clone().sub(fw);
        return { p, fwd, palm: palm.normalize(), pole: act.Wd(n3(-1, -0.6, -0.2)), anchor: 'grip' };
      },
    });
    const atChest = { at: V3(-0.01, 1.12, 0.34), fwd: n3(0.7, 0, 0.7), palm: n3(0.7, 0, -0.7), pole: n3(-1, -0.8, 0), anchor: 'grip' };
    // the left hand closes over the front of the right fist, thumbs side by side (the stick stands up out of both)
    const cover = {
      fn: (act) => {
        const hb = act.B.hand_r;
        const q = hb.getWorldQuaternion(new THREE.Quaternion());
        const H = act.hand.r;
        const g = H.grip.clone().applyMatrix4(hb.matrixWorld);
        const f0 = H.f0.clone().applyQuaternion(q), p0 = H.p0.clone().applyQuaternion(q), ax = H.gripAxis.clone().applyQuaternion(q);
        const p = g.clone().addScaledVector(f0, 0.052).addScaledVector(ax, -0.004).addScaledVector(p0, 0.01);
        const fwd = p0.clone().negate().addScaledVector(f0, -0.35).normalize();
        return { p, fwd, palm: f0.clone().negate(), pole: act.Wd(n3(1, -0.9, -0.2)), anchor: 'palm', fingers: 'cover' };
      },
    };
    const bow = (k, extra = 0) => ({ pelvis: [0.22 * k, 0, 0], spine: [0.2 * k + extra, 0, 0], neck: [0.06 * k + 0.06, -0.2, 0], head: [0.1 * k + 0.1, -0.38, 0], root: [0, 0, -0.03 * k] });
    const K = [
      { f: 0, name: 'chest', ease: 'hold', ...bow(0.05), hr: atChest, hl: cover, fr: 'grip', fl: 'cover' },
      { f: 18, name: 'ready', ease: 'hold', ...bow(0.05), hr: atChest, hl: cover, fr: 'grip', fl: 'cover' },
      { f: 22, name: 'raise-0', ease: 'in', ...bow(0.03), hr: { ...atChest, at: V3(-0.01, 1.16, 0.38) }, hl: cover, fr: 'grip', fl: 'cover' },
      { f: 26, name: 'raise-a', ease: 'in', ...bow(0.01), hr: atHead(-0.12, 0.06), hl: cover, fr: 'grip', fl: 'cover', arcr: [0, 0.02, 0.05], arcl: [0, 0.02, 0.05] },
      { f: 36, name: 'raise', ease: 'out', ...bow(0.0), hr: atHead(0), hl: cover, fr: 'grip', fl: 'cover' },
    ];
    let f = 48;
    for (let i = 0; i < 3; i++) {
      K.push({ f, name: 'still', ease: 'hold', ...bow(0.02), hr: atHead(0), hl: cover, fr: 'grip', fl: 'cover' });
      K.push({ f: f + 16, name: 'down', ease: 'inout', ...bow(1), hr: atHead(0), hl: cover, fr: 'grip', fl: 'cover' });
      K.push({ f: f + 22, name: 'low', ease: 'hold', ...bow(1.05), hr: atHead(0), hl: cover, fr: 'grip', fl: 'cover' });
      K.push({ f: f + 40, name: 'up', ease: 'inout', ...bow(0), hr: atHead(0), hl: cover, fr: 'grip', fl: 'cover' });
      f += 48;
    }
    K.push({ f: 196, name: 'hold', ease: 'hold', ...bow(0.02), hr: atHead(0), hl: cover, fr: 'grip', fl: 'cover' });
    K.push({ f: 214, name: 'lower', ease: 'inout', ...bow(0.06), hr: atChest, hl: cover, fr: 'grip', fl: 'cover' });
    K.push({ f: 240, name: 'pray', ease: 'hold', ...bow(0.1), hr: atChest, hl: cover, fr: 'grip', fl: 'cover' });
    K.push({ f: 266, name: 'pray2', ease: 'hold', ...bow(0.04), hr: atChest, hl: cover, fr: 'grip', fl: 'cover' });
    K.push({ f: 288, name: 'chest', ease: 'hold', ...bow(0.05), hr: atChest, hl: cover, fr: 'grip', fl: 'cover' });
    return K;
  },
};

// ---------------------------------------------------------------- capsules for the fire's painted shadows (world)
const _c = [];
export function capsulesOf(a) {
  const w = (n) => a.wp(n);
  return [
    [w('pelvis'), w('neck_01'), 0.16],
    [w('head'), w('head').add(V3(0, 0.1, 0)), 0.11],
    [w('upperarm_l'), w('lowerarm_l'), 0.06], [w('lowerarm_l'), w('hand_l'), 0.05], [w('hand_l'), w('middle_02_l'), 0.04],
    [w('upperarm_r'), w('lowerarm_r'), 0.06], [w('lowerarm_r'), w('hand_r'), 0.05], [w('hand_r'), w('middle_02_r'), 0.04],
  ];
}

// ---------------------------------------------------------------- acting lines (filled in later)
export function buildFolds(actors, paintGeo, { THREE: T }) {
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(new Float32Array(6), 3));
  geo.setAttribute('aDir', new T.BufferAttribute(new Float32Array(6), 3));
  geo.setAttribute('aInfo', new T.BufferAttribute(new Float32Array(6), 3));
  return { geo, update() {}, flush() {} };
}

function mergeSimple(geos) {
  const out = new THREE.BufferGeometry();
  const pos = [], nor = [], idx = [];
  let base = 0;
  for (const g0 of geos) {
    const g = g0.index ? g0 : g0;
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + base);
    else for (let i = 0; i < p.count; i++) idx.push(i + base);
    base += p.count;
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}
