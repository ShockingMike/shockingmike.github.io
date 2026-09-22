// Chớm world, core: the crowd, driven by data from the season (see core/README.md). Came from paint test G.
// Paint test G: the market crowd (G: solid two-tone clothes with a few Tết colours, and each cut-out casts its sun shadow).
// Paint test F: the market crowd. Background people only: flat shapes of colour with brushed edges, like figures cut from
// painted paper. Hanoi before Tết in the early 2000s: shirts tucked in, trousers, thin jackets and wool coats, a few áo dài, a pith
// helmet or a felt hat on the older men, scarves on the older women, children in new clothes held by the hand; step-through
// motorbikes with leg shields and old bicycles with a basket or a rear rack. No faces, no brands, no phones.
//
//   buildCrowd(scene, { list }) -> { mesh, count, update(t), positions(t) }   (mesh.userData.shadowMaterial draws the same stepped cut-outs into the sun's map)
//
// The shapes are drawn once into a sheet (canvas) at load: one row per kind of figure, eight drawings per row.
// Every figure is one instance of a single draw call. Figures stand in the world facing the reference eye and never turn
// with the camera, so a scroll push reads as passing layers of cut-outs.
// Walkers step on twos: pose and position change together twelve times a second, so feet stay planted (nothing glides).
// Loops are offset from each other; a loop only wraps where it cannot be seen (behind the eye, behind a corner, or far in the air).
import * as THREE from 'three';
import { U, COMMON_GLSL } from './paint.js';
import { rng } from './brush.js';

const CW = 96, CH = 144, PX = 54;           // cell size in the sheet, pixels per metre
const COLS = 8;
// rows of the sheet
export const KINDS = {
  manBranch: 0, womanKumquat: 1, umbrella: 2, couple: 3, motherChild: 4, aoDai: 5,
  bikeKumquat: 6, bikePeach: 7, bicycle: 8,
  sManBranch: 9, sWomanKumquat: 10, sUmbrella: 11, sAoDai: 12,
  standCoi: 13, standScarf: 14, standBag: 15, standPhot: 16,
  // balcony life (core/balcony.js): seen from the street, still poses with small shifts
  balLean: 17, balLaundry: 18, balWater: 19, balChild: 20, balLantern: 21,
  // second sheet (rows 22+): sitting, cold, avoiding, more vehicles. s… = side view (facing +x; flip turns them round)
  sitTea: 22, sitPipe: 23, avoid: 24, standBouquet: 25, sitWarm: 26, sSitWarm: 27, walkCold: 28, standCold: 29,
  bikePlain: 30, bikeBeanie: 31, bikeTwo: 32, pushBike: 33, sitBank: 34, sitCouple: 35, sWalkCold: 36, pushBikeB: 37,
};
const ROWS = 22, ROWS_B = 16;
// how much room each kind takes on the ground (metres), for the clipping check
export const KIND_R = {
  manBranch: 0.3, womanKumquat: 0.3, umbrella: 0.45, couple: 0.46, motherChild: 0.4, aoDai: 0.22,
  bikeKumquat: 0.45, bikePeach: 0.45, bicycle: 0.4, sManBranch: 0.35, sWomanKumquat: 0.35, sUmbrella: 0.45, sAoDai: 0.25,
  standCoi: 0.25, standScarf: 0.25, standBag: 0.25, standPhot: 0.25, balLean: 0.25, balLaundry: 0.25, balWater: 0.25, balChild: 0.18, balLantern: 0.25,
  sitTea: 0.35, sitPipe: 0.35, avoid: 0.3, standBouquet: 0.28, sitWarm: 0.35, sSitWarm: 0.38, walkCold: 0.28, standCold: 0.25,
  bikePlain: 0.45, bikeBeanie: 0.45, bikeTwo: 0.5, pushBike: 0.55, sitBank: 0.35, sitCouple: 0.55, sWalkCold: 0.32, pushBikeB: 0.5,
};
// points on a figure (metres from its feet, as drawn: facing +x before flip), for smoke and the like: core.crowdAnchor(entry, name)
export const KIND_ANCHOR = {
  sitPipe: { smoke: [0.13, 1.05], bowl: [0.3, 0.42] },
  sitTea: { cup: [0.24, 0.78] },
  balLean: { smoke: [0.27, 1.06] },
};
const KIND_NAME = {};
// (filled below)
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- drawing (metres, origin at the feet, y up)
// body: this pass draws the shape mask itself. Ink lines (a collar, a sleeve seam, a hem) are drawn into that same mask in a
// lighter grey: still inside the shape, but the shader can tell them apart and lay them in as drawn lines when seen close.
const INK = '#cccccc';
function pen(g, ox, oy, body = false) {
  const P = (x, y) => [ox + x * PX, oy - y * PX];
  return {
    P,
    ink(pts, w = 0.04) {
      if (!body) return;
      const fs = g.fillStyle, ss = g.strokeStyle;
      g.strokeStyle = INK;
      g.lineWidth = Math.max(2.2, w * PX); g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); pts.forEach(([x, y], i) => { const [a2, b2] = P(x, y); i ? g.lineTo(a2, b2) : g.moveTo(a2, b2); }); g.stroke();
      g.fillStyle = fs; g.strokeStyle = ss;
    },
    poly(pts) { g.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = P(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath(); g.fill(); },
    line(pts, w) { g.lineWidth = w * PX; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = P(x, y); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.stroke(); },
    ell(x, y, rx, ry, rot = 0) { const [a, b] = P(x, y); g.beginPath(); g.ellipse(a, b, Math.max(0.5, rx * PX), Math.max(0.5, ry * PX), rot, 0, TAU); g.fill(); },
    half(x, y, rx, ry) { const [a, b] = P(x, y); g.beginPath(); g.ellipse(a, b, rx * PX, ry * PX, 0, Math.PI, TAU); g.closePath(); g.fill(); },
  };
}

// one person. view: 'back' (walking along the street) or 'side' (facing +x). ph: 0..1 through a two-step cycle.
// acc(mode) picks the ink: false = clothes (top), 'legs' = trousers and shoes, true = a colour accent (the sheet has three layers)
function person(d, acc, o) {
  const { x = 0, h = 1, ph = 0, view = 'back', walk = 1, dress = 'shirt', hat = null, bag = false, tunic = false, arms = null, lean = 0, hunch = 0 } = o;
  const s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
  const bob = walk * 0.022 * h * Math.abs(s);
  const hipY = 0.88 * h + bob, shY = 1.36 * h + bob, headY = (1.52 - 0.07 * hunch) * h + bob;
  if (view === 'back') {
    const sw = walk * 0.018 * h * s;
    const X = x + sw;
    acc('legs');
    // legs: the swinging foot lifts and the leg looks shorter from behind
    const liftL = walk * Math.max(0, s) * 0.09 * h, liftR = walk * Math.max(0, -s) * 0.09 * h;
    d.line([[X - 0.075 * h, hipY], [x - 0.085 * h, 0.05 * h + liftL]], 0.105 * h);
    d.line([[X + 0.075 * h, hipY], [x + 0.085 * h, 0.05 * h + liftR]], 0.105 * h);
    d.ell(x - 0.09 * h, 0.03 * h + liftL, 0.06 * h, 0.03 * h);
    d.ell(x + 0.09 * h, 0.03 * h + liftR, 0.06 * h, 0.03 * h);
    acc(false);
    // body
    if (dress === 'coat') d.poly([[X - 0.21 * h, 0.5 * h + bob], [X + 0.21 * h, 0.5 * h + bob], [X + 0.2 * h, shY - 0.02 * h], [X - 0.2 * h, shY - 0.02 * h]]);
    else d.poly([[X - 0.15 * h, hipY - 0.04 * h], [X + 0.15 * h, hipY - 0.04 * h], [X + 0.2 * h, shY - 0.02 * h], [X - 0.2 * h, shY - 0.02 * h]]);
    if (tunic) { acc(true); d.poly([[X - 0.15 * h, 0.35 * h + bob], [X + 0.15 * h, 0.35 * h + bob], [X + 0.19 * h, shY - 0.03 * h], [X - 0.19 * h, shY - 0.03 * h]]); acc(false); }
    d.ell(X, shY - 0.02 * h, 0.2 * h, 0.05 * h);
    // arms swing a little (from behind: a small shortening and a sideways drift)
    const aw = walk * 0.05 * h;
    const armL = arms?.L ?? [[X - 0.2 * h, shY - 0.03 * h], [X - 0.24 * h - aw * c * 0.3, 1.02 * h + aw * Math.max(0, -s)], [X - 0.23 * h, 0.84 * h + aw * Math.max(0, -s) * 1.5]];
    const armR = arms?.R ?? [[X + 0.2 * h, shY - 0.03 * h], [X + 0.24 * h + aw * c * 0.3, 1.02 * h + aw * Math.max(0, s)], [X + 0.23 * h, 0.84 * h + aw * Math.max(0, s) * 1.5]];
    if (arms?.L !== false) d.line(armL, 0.07 * h);
    if (arms?.R !== false) d.line(armR, 0.07 * h);
    if (bag) d.poly([[X + 0.22 * h, 0.95 * h], [X + 0.34 * h, 0.95 * h], [X + 0.33 * h, 0.8 * h], [X + 0.23 * h, 0.8 * h]]);
    d.line([[X, shY], [X, headY - 0.05 * h]], 0.07 * h);
    d.ell(X, headY, 0.083 * h, 0.098 * h);
    hatOn(d, X, headY, h, hat, acc);
    // the clothes, drawn: the collar, the seam down the back, the sleeves where they leave the shoulder, the hem
    const hem = dress === 'coat' ? 0.52 * h + bob : hipY - 0.03 * h;
    d.ink([[X - 0.12 * h, shY - 0.035 * h], [X, shY - 0.055 * h], [X + 0.12 * h, shY - 0.035 * h]], 0.04 * h);
    d.ink([[X - 0.005 * h, shY - 0.06 * h], [X + 0.01 * h, (shY + hem) * 0.5], [X - 0.005 * h, hem + 0.03 * h]], 0.04 * h);
    d.ink([[X - 0.155 * h, shY - 0.03 * h], [X - 0.17 * h, shY - 0.2 * h]], 0.04 * h);
    d.ink([[X + 0.155 * h, shY - 0.03 * h], [X + 0.17 * h, shY - 0.2 * h]], 0.04 * h);
    d.ink([[X - 0.185 * h, hem], [X + 0.185 * h, hem]], 0.04 * h);
  } else {
    // side view, facing +x: legs scissor, arms swing against them
    const a = walk * 0.42 * s;
    const X = x + lean * h;
    acc('legs');
    for (const k of [1, -1]) {
      const ang = a * k;
      const knee = [x + Math.sin(ang) * 0.46 * h, hipY - Math.cos(ang) * 0.44 * h];
      const bend = walk * Math.max(0, -k * s) * 0.35;
      const foot = [knee[0] + Math.sin(ang - bend) * 0.44 * h, Math.max(0.04 * h, knee[1] - Math.cos(ang - bend) * 0.44 * h)];
      d.line([[x, hipY], knee, foot], 0.1 * h);
      d.poly([[foot[0] - 0.04 * h, foot[1] - 0.04 * h], [foot[0] + 0.1 * h, foot[1] - 0.04 * h], [foot[0] + 0.06 * h, foot[1] + 0.02 * h], [foot[0] - 0.03 * h, foot[1] + 0.03 * h]]);
    }
    acc(false);
    if (dress === 'coat') d.poly([[x - 0.12 * h, 0.5 * h + bob], [x + 0.13 * h, 0.5 * h + bob], [X + 0.1 * h, shY], [X - 0.1 * h, shY]]);
    else d.poly([[x - 0.09 * h, hipY - 0.04 * h], [x + 0.09 * h, hipY - 0.04 * h], [X + 0.1 * h, shY], [X - 0.1 * h, shY]]);
    if (tunic) { acc(true); d.poly([[x - 0.1 * h, 0.35 * h + bob], [x + 0.1 * h, 0.35 * h + bob], [X + 0.1 * h, shY - 0.02 * h], [X - 0.1 * h, shY - 0.02 * h]]); acc(false); }
    const sa = -walk * 0.35 * s;
    const armF = arms?.F ?? [[X, shY - 0.04 * h], [X + Math.sin(sa) * 0.3 * h, shY - Math.cos(sa) * 0.3 * h], [X + Math.sin(sa * 1.3) * 0.55 * h + 0.03 * h, shY - Math.cos(sa) * 0.53 * h]];
    if (arms?.F !== false) d.line(armF, 0.068 * h);
    if (bag) d.poly([[x - 0.14 * h, 1.0 * h], [x - 0.02 * h, 1.0 * h], [x - 0.03 * h, 0.84 * h], [x - 0.14 * h, 0.84 * h]]);
    d.line([[X, shY], [X + 0.02 * h, headY - 0.05 * h]], 0.07 * h);
    d.ell(X + 0.02 * h, headY, 0.09 * h, 0.098 * h);
    hatOn(d, X + 0.02 * h, headY, h, hat, acc);
    // from the side: the collar, the sleeve at the shoulder, the hem, and one fold down the front
    const hemS = dress === 'coat' ? 0.52 * h + bob : hipY - 0.03 * h;
    d.ink([[X - 0.08 * h, shY - 0.03 * h], [X + 0.07 * h, shY - 0.05 * h]], 0.04 * h);
    d.ink([[X + 0.055 * h, shY - 0.04 * h], [X + 0.07 * h, shY - 0.19 * h]], 0.04 * h);
    d.ink([[X + 0.02 * h, shY - 0.1 * h], [X + 0.035 * h, (shY + hemS) * 0.5], [X + 0.02 * h, hemS + 0.04 * h]], 0.04 * h);
    d.ink([[x - 0.1 * h, hemS], [x + 0.1 * h, hemS]], 0.04 * h);
  }
}
function hatOn(d, x, y, h, hat, acc = null) {
  if (hat === 'coi') { d.half(x, y + 0.03 * h, 0.12 * h, 0.12 * h); d.ell(x, y + 0.03 * h, 0.17 * h, 0.025 * h); }
  else if (hat === 'phot') { d.poly([[x - 0.08 * h, y + 0.05 * h], [x + 0.08 * h, y + 0.05 * h], [x + 0.07 * h, y + 0.15 * h], [x - 0.07 * h, y + 0.15 * h]]); d.ell(x, y + 0.05 * h, 0.14 * h, 0.022 * h); }
  else if (hat === 'helmet') d.half(x, y + 0.02 * h, 0.11 * h, 0.12 * h);
  else if (hat === 'scarf') { if (acc) acc(true); d.ell(x, y - 0.11 * h, 0.13 * h, 0.06 * h); d.ell(x, y + 0.02 * h, 0.1 * h, 0.1 * h); if (acc) acc(false); }
  else if (hat === 'beanie') { d.half(x, y + 0.02 * h, 0.095 * h, 0.12 * h); if (acc) acc(true); d.ell(x, y - 0.12 * h, 0.12 * h, 0.05 * h); if (acc) acc(false); }
  else if (hat === 'non') d.poly([[x - 0.26 * h, y + 0.02 * h], [x + 0.26 * h, y + 0.02 * h], [x, y + 0.22 * h]]);
}
// a peach branch: crooked lines with blossom dots (accent)
function branch(d, acc, x0, y0, pts, R, n = 26, r = 0.03) {
  acc(false);
  d.line([[x0, y0], ...pts], 0.025);
  for (let i = 1; i < pts.length; i++) d.line([pts[i - 1], [pts[i][0] + (R() - 0.5) * 0.2, pts[i][1] + 0.1]], 0.012);
  acc(true);
  for (let i = 0; i < n; i++) {
    const k = Math.min(pts.length - 1, 1 + Math.floor(R() * (pts.length - 1)));
    const a = pts[k - 1], b = pts[k], t = R();
    d.ell(a[0] + (b[0] - a[0]) * t + (R() - 0.5) * 0.18, a[1] + (b[1] - a[1]) * t + (R() - 0.5) * 0.14, r, r);
  }
  acc(false);
}
function kumquatTree(d, acc, x, y, r, R, n = 22) {
  acc(false);
  d.ell(x, y, r, r * 0.9);
  d.ell(x - r * 0.5, y + r * 0.35, r * 0.55, r * 0.5);
  d.ell(x + r * 0.45, y + r * 0.3, r * 0.6, r * 0.5);
  acc(true);
  for (let i = 0; i < n; i++) { const a = R() * TAU, q = Math.sqrt(R()) * r * 1.05; d.ell(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.9 + r * 0.1, 0.035, 0.035); }
  acc(false);
}
// a step-through motorbike from behind (or in front): a narrow wheel, the leg shield and seat, the rider, bars and mirrors
function bike(d, acc, o) {
  const { ph = 0, cargo = null, R, hat = null, dress = 'coat', cycle = false } = o;
  const s = Math.sin(ph * TAU);
  const bob = 0.008 * s;
  acc(false);
  if (cycle) {
    // an old bicycle: a thin wheel, a rear rack with a bundle of flowers, the rider pedalling
    d.ell(0, 0.34, 0.03, 0.34);
    d.line([[0, 0.34], [0, 0.95]], 0.035);
    d.line([[-0.28, 1.05], [0.28, 1.05]], 0.03);
    const lp = 0.12 * s;
    d.line([[-0.08, 0.98], [-0.1, 0.62 + lp], [-0.07, 0.34 + lp]], 0.1);
    d.line([[0.08, 0.98], [0.1, 0.62 - lp], [0.07, 0.34 - lp]], 0.1);
    d.poly([[-0.17, 0.96 + bob], [0.17, 0.96 + bob], [0.2, 1.46 + bob], [-0.2, 1.46 + bob]]);
    d.line([[-0.2, 1.42 + bob], [-0.27, 1.06]], 0.065);
    d.line([[0.2, 1.42 + bob], [0.27, 1.06]], 0.065);
    d.line([[0, 1.46 + bob], [0, 1.52 + bob]], 0.07);
    d.ell(0, 1.6 + bob, 0.085, 0.098);
    hatOn(d, 0, 1.6 + bob, 1, hat);
    // the basket at the front with flowers standing up in it
    d.poly([[-0.17, 0.72], [0.17, 0.72], [0.15, 0.95], [-0.15, 0.95]]);
    acc(true);
    for (let i = 0; i < 16; i++) d.ell((R() - 0.5) * 0.34, 0.98 + R() * 0.22, 0.045, 0.04);
    acc(false);
    return;
  }
  if (cargo === 'kumquat') kumquatTree(d, acc, 0.12, 1.55, 0.5, R, 30);
  if (cargo === 'peach') branch(d, acc, 0.05, 1.0, [[0.1, 1.5], [-0.15, 2.0], [0.2, 2.45], [-0.1, 2.7]], R, 44, 0.035);
  acc(false);
  d.ell(0, 0.28, 0.06, 0.28);
  d.poly([[-0.2, 0.36], [0.2, 0.36], [0.24, 0.86], [-0.24, 0.86]]);        // leg shield and body
  d.ell(0, 0.86, 0.24, 0.07);
  d.line([[-0.36, 1.12 + bob], [0.36, 1.12 + bob]], 0.035);                  // bars
  d.line([[-0.3, 1.12 + bob], [-0.33, 1.3 + bob]], 0.015);                   // mirrors on stalks
  d.line([[0.3, 1.12 + bob], [0.33, 1.3 + bob]], 0.015);
  d.ell(-0.34, 1.33 + bob, 0.045, 0.035);
  d.ell(0.34, 1.33 + bob, 0.045, 0.035);
  // rider
  if (dress === 'coat') d.poly([[-0.2, 0.84 + bob], [0.2, 0.84 + bob], [0.22, 1.5 + bob], [-0.22, 1.5 + bob]]);
  else d.poly([[-0.16, 0.9 + bob], [0.16, 0.9 + bob], [0.21, 1.5 + bob], [-0.21, 1.5 + bob]]);
  d.line([[-0.21, 1.46 + bob], [-0.33, 1.13 + bob]], 0.07);
  d.line([[0.21, 1.46 + bob], [0.33, 1.13 + bob]], 0.07);
  d.line([[0, 1.5 + bob], [0, 1.57 + bob]], 0.07);
  d.ell(0, 1.66 + bob, 0.085, 0.098);
  hatOn(d, 0, 1.66 + bob, 1, hat);
}


// ---------------------------------------------------------------- the second sheet: sitting, cold, avoiding, more vehicles
// a seated figure seen from the side, facing +x. seat: height of what it sits on; stool: 'accent' | 'legs' | null
function seatedSide(d, acc, o) {
  const { x = 0, h = 1, seat = 0.28, lean = 0, hat = null, dress = 'coat', arms = {}, stool = 'accent', bow = 0, tunic = false } = o;
  if (stool) {
    acc(stool === 'accent' ? true : 'legs');
    d.poly([[x - 0.17, seat], [x + 0.17, seat], [x + 0.16, seat - 0.05], [x - 0.16, seat - 0.05]]);
    d.line([[x - 0.14, seat - 0.04], [x - 0.16, 0.02]], 0.035);
    d.line([[x + 0.14, seat - 0.04], [x + 0.16, 0.02]], 0.035);
  }
  const hip = [x - 0.02, seat + 0.07 * h];
  const kneeY = Math.max(seat + 0.08 * h, 0.42 * h);
  const knee = [x + 0.38 * h, kneeY];
  const foot = [x + 0.42 * h, 0.04];
  acc('legs');
  d.line([hip, knee, foot], 0.11 * h);
  d.poly([[foot[0] - 0.04, 0.0], [foot[0] + 0.1, 0.0], [foot[0] + 0.07, 0.06], [foot[0] - 0.03, 0.07]]);
  acc(false);
  const sh = [x + lean * h, seat + 0.6 * h];
  if (dress === 'coat') d.poly([[hip[0] - 0.12 * h, hip[1] - 0.04], [hip[0] + 0.2 * h, hip[1] - 0.02], [sh[0] + 0.1 * h, sh[1]], [sh[0] - 0.11 * h, sh[1]]]);
  else d.poly([[hip[0] - 0.1 * h, hip[1]], [hip[0] + 0.1 * h, hip[1]], [sh[0] + 0.1 * h, sh[1]], [sh[0] - 0.1 * h, sh[1]]]);
  if (tunic) { acc(true); d.poly([[hip[0] - 0.1 * h, hip[1] - 0.02], [hip[0] + 0.3 * h, hip[1] + 0.01], [sh[0] + 0.1 * h, sh[1] - 0.02], [sh[0] - 0.1 * h, sh[1] - 0.02]]); acc(false); }
  if (arms.B !== false) d.line(arms.B ?? [[sh[0], sh[1] - 0.04], [sh[0] + 0.1, sh[1] - 0.3], [sh[0] + 0.25, sh[1] - 0.36]], 0.065 * h);
  const hd = [sh[0] + 0.03 * h + bow * 0.08, sh[1] + 0.16 * h - bow * 0.05];
  d.line([[sh[0], sh[1]], [hd[0], hd[1] - 0.05]], 0.07 * h);
  d.ell(hd[0], hd[1], 0.09 * h, 0.098 * h);
  hatOn(d, hd[0], hd[1], h, hat, acc);
  if (arms.F !== false) d.line(arms.F ?? [[sh[0], sh[1] - 0.04], [sh[0] + 0.12, sh[1] - 0.28], [sh[0] + 0.28, sh[1] - 0.3]], 0.068 * h);
  // the clothes, drawn: the collar, the sleeve at the shoulder, the hem over the lap, the crease of the trousers
  d.ink([[sh[0] - 0.075 * h, sh[1] - 0.03 * h], [sh[0] + 0.06 * h, sh[1] - 0.05 * h]], 0.04 * h);
  d.ink([[sh[0] + 0.05 * h, sh[1] - 0.04 * h], [sh[0] + 0.075 * h, sh[1] - 0.2 * h]], 0.04 * h);
  d.ink([[hip[0] - 0.09 * h, hip[1] + 0.01], [hip[0] + 0.14 * h, hip[1] + 0.03]], 0.04 * h);
  d.ink([[hip[0] + 0.02 * h, hip[1] - 0.02], [knee[0] - 0.06 * h, knee[1] + 0.01]], 0.04 * h);
  return { sh, hd };
}
// a seated figure seen from behind (low stool), both hands held out in front
function seatedBack(d, acc, o) {
  const { x = 0, h = 1, seat = 0.28, hat = null, reach = 0, stool = true } = o;
  if (stool) { acc(true); d.poly([[x - 0.18, seat], [x + 0.18, seat], [x + 0.17, 0.0], [x - 0.17, 0.0]]); acc(false); }
  acc('legs');
  d.ell(x - 0.2, 0.05, 0.07, 0.04); d.ell(x + 0.2, 0.05, 0.07, 0.04);
  d.line([[x - 0.16, seat + 0.05], [x - 0.2, 0.05]], 0.1);
  d.line([[x + 0.16, seat + 0.05], [x + 0.2, 0.05]], 0.1);
  acc(false);
  const shY = seat + 0.58 * h;
  d.poly([[x - 0.24, seat - 0.02], [x + 0.24, seat - 0.02], [x + 0.21, shY], [x - 0.21, shY]]);
  d.ell(x, shY, 0.21, 0.05);
  // elbows out: the hands are held to the coals in front
  d.line([[x - 0.2, shY - 0.02], [x - 0.3 - 0.02 * reach, shY - 0.22], [x - 0.12, shY - 0.32 + 0.02 * reach]], 0.07);
  d.line([[x + 0.2, shY - 0.02], [x + 0.3 + 0.02 * reach, shY - 0.22], [x + 0.12, shY - 0.32 + 0.02 * reach]], 0.07);
  const hy = shY + 0.13;
  d.line([[x, shY], [x, hy - 0.04]], 0.07);
  d.ell(x, hy, 0.085, 0.098);
  hatOn(d, x, hy, h, hat, acc);
  // the clothes, drawn: the collar, the seam down the back, the sleeves, the hem where he sits
  d.ink([[x - 0.13, shY - 0.03], [x, shY - 0.05], [x + 0.13, shY - 0.03]], 0.04);
  d.ink([[x - 0.005, shY - 0.06], [x + 0.01, seat + 0.26 * h], [x - 0.005, seat + 0.03]], 0.04);
  d.ink([[x - 0.165, shY - 0.03], [x - 0.185, shY - 0.2]], 0.04);
  d.ink([[x + 0.165, shY - 0.03], [x + 0.185, shY - 0.2]], 0.04);
  d.ink([[x - 0.22, seat + 0.01], [x + 0.22, seat + 0.01]], 0.04);
}
// a step-through with two on it: the passenger sits side-saddle behind (from behind: her legs hang to one side)
function bikeTwo(d, acc, o) {
  bike(d, acc, { ...o, cargo: null });
  const s = Math.sin((o.ph ?? 0) * TAU), bob = 0.008 * s;
  acc('legs');
  d.line([[-0.1, 0.92 + bob], [-0.34, 0.9 + bob], [-0.36, 0.52 + bob]], 0.1);
  d.ell(-0.38, 0.5 + bob, 0.06, 0.03);
  acc(true);
  d.poly([[-0.3, 0.86 + bob], [0.02, 0.86 + bob], [0.02, 1.3 + bob], [-0.3, 1.3 + bob]]);
  acc(false);
  d.line([[-0.14, 1.3 + bob], [-0.15, 1.36 + bob]], 0.07);
  d.ell(-0.16, 1.43 + bob, 0.08, 0.092);
  d.line([[0.02, 1.26 + bob], [0.12, 1.08 + bob]], 0.06);
}
// a person walking an old bicycle, seen from the side (facing +x)
function pushBike(d, acc, o) {
  const { ph = 0, R } = o;
  const ring = (cx, cy, r) => { const pts = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } d.line(pts, 0.06); d.line([[cx - r, cy], [cx + r, cy]], 0.02); d.line([[cx, cy - r], [cx, cy + r]], 0.02); };
  acc('legs');
  ring(-0.42, 0.3, 0.28); ring(0.5, 0.3, 0.28);
  d.line([[-0.42, 0.3], [0.0, 0.3], [0.2, 0.78], [-0.3, 0.78], [-0.42, 0.3]], 0.045);
  d.line([[0.0, 0.3], [-0.3, 0.8]], 0.045);
  d.line([[0.5, 0.3], [0.32, 0.98], [0.4, 1.02]], 0.045);
  d.line([[-0.36, 0.86], [-0.2, 0.86]], 0.05);
  acc(true);
  d.poly([[0.36, 0.84], [0.62, 0.84], [0.6, 0.64], [0.4, 0.64]]);
  for (let i = 0; i < 10; i++) d.ell(0.38 + R() * 0.24, 0.86 + R() * 0.16, 0.04, 0.035);
  acc(false);
  person(d, acc, { x: -0.08, ph, h: 0.97, view: 'side', dress: 'shirt', walk: 0.8, arms: { F: [[-0.06, 1.28], [0.12, 1.12], [0.32, 1.0]] } });
}

function drawSheetB() {
  return sheetSteps(ROWS_B, ROWS, (both) => {
    for (let f = 0; f < COLS; f++) {
      const ph = f / COLS, sw = Math.sin(ph * TAU);
      // tea on a low plastic stool: the cup rests on the knee, and comes up to the mouth now and then
      both(KINDS.sitTea, f, (d, acc) => {
        const sip = f === 5 || f === 6;
        const hand = sip ? [0.16, 1.02] : [0.24, 0.76];
        seatedSide(d, acc, { dress: 'shirt', lean: 0.01 * sw, arms: { F: [[0.0, 0.84], [0.14, 0.64], hand] } });
        d.poly([[hand[0] - 0.03, hand[1] + 0.02], [hand[0] + 0.03, hand[1] + 0.02], [hand[0] + 0.025, hand[1] + 0.1], [hand[0] - 0.025, hand[1] + 0.1]]);
      });
      // a farmer's pipe (điếu cày): leaning in to draw on it, then sitting back
      both(KINDS.sitPipe, f, (d, acc) => {
        const draw = f >= 2 && f <= 4 ? 1 : 0;
        const top = [0.2 - 0.02 * draw, 0.98 - 0.02 * draw];
        acc(true);
        d.line([[0.3, 0.03], top], 0.06);
        d.line([[0.27, 0.38], [0.36, 0.44]], 0.03);
        acc(false);
        seatedSide(d, acc, { hat: 'phot', dress: 'coat', lean: 0.05 * draw, bow: draw, stool: 'legs', arms: {
          F: [[0.04 * draw, 0.84], [0.2, 0.7], [0.28, 0.62]], B: [[0.04 * draw, 0.84], [0.12, 0.66], [0.25, 0.44]],
        } });
      });
      // walking with a hand over the nose (the milk flower is strong), leaning away
      both(KINDS.avoid, f, (d, acc) => {
        person(d, acc, { ph, h: 0.98, dress: 'shirt', walk: 0.9, arms: { R: [[0.2, 1.33], [0.26, 1.36], [0.06, 1.46]] } });
      });
      // standing with a bunch of flowers held to the chest
      both(KINDS.standBouquet, f, (d, acc, R) => {
        person(d, acc, { h: 0.96, view: 'side', walk: 0, dress: 'shirt', tunic: false, lean: 0.01 * sw, arms: { F: [[0, 1.26], [0.1, 1.02], [0.2, 1.0]] } });
        d.poly([[0.12, 1.02], [0.26, 1.02], [0.22, 0.78], [0.18, 0.78]]);
        acc(true);
        for (let i = 0; i < 14; i++) d.ell(0.1 + R() * 0.24, 1.04 + R() * 0.16, 0.045, 0.04);
        acc(false);
      });
      // warming the hands over the coals: from behind, and from the side
      both(KINDS.sitWarm, f, (d, acc) => seatedBack(d, acc, { hat: f % 8 < 4 ? 'beanie' : 'beanie', reach: sw }));
      both(KINDS.sSitWarm, f, (d, acc) => {
        const r = 0.02 * sw;
        seatedSide(d, acc, { hat: 'beanie', dress: 'coat', lean: 0.06, bow: 0.4, arms: {
          F: [[0.06, 0.84], [0.24, 0.72], [0.44 + r, 0.66]], B: [[0.06, 0.84], [0.2, 0.7], [0.4 - r, 0.62]],
        } });
      });
      // walking hunched in a wool coat, hat and scarf, hands in the pockets (no swing)
      both(KINDS.walkCold, f, (d, acc) => {
        person(d, acc, { ph, h: 0.97, dress: 'coat', hat: 'beanie', hunch: 1, walk: 0.8, arms: {
          L: [[-0.2, 1.28], [-0.24, 1.06], [-0.18, 0.9]], R: [[0.2, 1.28], [0.24, 1.06], [0.18, 0.9]],
        } });
      });
      // walking a bicycle, seen from behind: the bicycle at the right hand, its basket of flowers ahead
      both(KINDS.pushBikeB, f, (d, acc, R) => {
        const s2 = Math.sin(ph * TAU);
        acc('legs');
        d.ell(0.36, 0.34, 0.035, 0.34);
        d.line([[0.36, 0.34], [0.36, 0.92]], 0.04);
        d.line([[0.2, 1.02], [0.52, 1.02]], 0.035);
        d.poly([[0.32, 0.9], [0.4, 0.9], [0.4, 1.0], [0.32, 1.0]]);
        acc(true);
        d.poly([[0.26, 1.04], [0.46, 1.04], [0.44, 1.16], [0.28, 1.16]]);
        for (let i = 0; i < 8; i++) d.ell(0.28 + R() * 0.18, 1.18 + R() * 0.12, 0.035, 0.03);
        acc(false);
        person(d, acc, { x: -0.08, ph, h: 0.97, dress: 'shirt', walk: 0.8, arms: { R: [[0.12, 1.3], [0.2, 1.12 + 0.01 * s2], [0.24, 1.02]] } });
      });
      // the same cold walker, seen from the side (crossing the view), hands in the pockets, on twos
      both(KINDS.sWalkCold, f, (d, acc) => {
        person(d, acc, { ph, h: 0.97, view: 'side', dress: 'coat', hat: 'beanie', hunch: 1, walk: 0.8, lean: 0.03, arms: { F: [[0.03, 1.24], [0.09, 1.04], [0.06, 0.9]] } });
      });
      both(KINDS.standCold, f, (d, acc) => {
        person(d, acc, { h: 0.96, view: 'side', walk: 0, dress: 'coat', hat: 'beanie', hunch: 1, lean: 0.008 * sw, arms: { F: [[0, 1.24], [0.05, 1.04], [0.03, 0.9]] } });
      });
      // step-throughs with nothing on them, a rider in a half helmet or a wool hat; one with a passenger side-saddle
      both(KINDS.bikePlain, f, (d, acc, R) => bike(d, acc, { ph, cargo: null, R, hat: 'helmet', dress: 'coat' }));
      both(KINDS.bikeBeanie, f, (d, acc, R) => bike(d, acc, { ph, cargo: null, R, hat: 'beanie', dress: 'coat' }));
      both(KINDS.bikeTwo, f, (d, acc, R) => bikeTwo(d, acc, { ph, R, hat: 'helmet', dress: 'shirt' }));
      both(KINDS.pushBike, f, (d, acc, R) => pushBike(d, acc, { ph, R }));
      // sitting on a low wall by the water, legs hanging; a couple leaning in
      both(KINDS.sitBank, f, (d, acc) => seatedSide(d, acc, { seat: 0.45, stool: null, dress: 'shirt', lean: 0.01 * sw, arms: { F: [[0, 1.0], [0.08, 0.76], [0.2, 0.56]] } }));
      both(KINDS.sitCouple, f, (d, acc) => {
        seatedSide(d, acc, { x: -0.3, seat: 0.45, stool: null, dress: 'shirt', lean: 0.04, bow: 0.2, arms: { F: [[-0.26, 1.0], [-0.1, 0.9], [0.02, 0.96]] } });
        seatedSide(d, acc, { x: 0.12, seat: 0.45, stool: null, h: 0.94, dress: 'shirt', tunic: true, lean: -0.02 + 0.01 * sw, arms: { F: [[0.1, 0.98], [0.2, 0.76], [0.32, 0.56]] } });
      });
    }
  });
}

function* sheetSteps(nRows = ROWS, base = 0, extra = null) {
  const W = CW * COLS, H = CH * nRows;
  const body = document.createElement('canvas'); body.width = W; body.height = H;
  const accC = document.createElement('canvas'); accC.width = W; accC.height = H;
  const legC = document.createElement('canvas'); legC.width = W; legC.height = H;
  const gb = body.getContext('2d'), ga = accC.getContext('2d'), gl = legC.getContext('2d');
  for (const g of [gb, ga, gl]) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); }
  const rows = [];
  // each drawing is made twice: once for the body layer, once for the accent layer (accent parts white, the rest black on top)
  const draws = [];
  const both = (row, col, fn) => draws.push([row, col, fn]);
  const drawBoth = (row, col, fn) => {
    for (const [g, layer] of [[gb, 'b'], [ga, 'a'], [gl, 'l']]) {
      g.save();
      g.beginPath(); g.rect(col * CW, (row - base) * CH, CW, CH); g.clip();
      const d = pen(g, col * CW + CW / 2, (row - base + 1) * CH - 6, layer === 'b');
      const acc = (on) => {
        const c = layer === 'b' ? '#fff' : layer === 'a' ? (on === true ? '#fff' : '#000') : (on === 'legs' ? '#fff' : '#000');
        g.fillStyle = c; g.strokeStyle = c;
      };
      acc(false);
      fn(d, acc, rng(1000 + row * 17));
      g.restore();
    }
  };
  if (extra) extra(both);
  else for (let f = 0; f < COLS; f++) {
    const ph = f / COLS;
    both(KINDS.manBranch, f, (d, acc, R) => {
      person(d, acc, { ph, h: 1.0, dress: 'shirt', arms: { R: [[0.2, 1.33], [0.26, 1.42], [0.16, 1.52]] } });
      branch(d, acc, 0.16, 1.5, [[0.1, 1.9], [-0.12, 2.25], [0.08, 2.5]], R, 30, 0.028);
    });
    both(KINDS.womanKumquat, f, (d, acc, R) => {
      person(d, acc, { ph, h: 0.95, dress: 'coat', arms: { L: [[-0.19, 1.28], [-0.3, 1.18], [-0.24, 1.08]], R: [[0.19, 1.28], [0.3, 1.18], [0.24, 1.08]] } });
      kumquatTree(d, acc, 0.0, 1.62 + 0.02 * Math.abs(Math.sin(ph * TAU)), 0.27, R, 18);
    });
    both(KINDS.umbrella, f, (d, acc, R) => {
      person(d, acc, { ph, h: 1.0, dress: 'coat', arms: { R: [[0.2, 1.33], [0.16, 1.2], [0.06, 1.3]] } });
      const bob = 0.022 * Math.abs(Math.sin(ph * TAU));
      d.line([[0.05, 1.3 + bob], [0.05, 1.95 + bob]], 0.018);
      acc(true); d.half(0.05, 1.9 + bob, 0.52, 0.28); acc(false);
    });
    both(KINDS.couple, f, (d, acc, R) => {
      person(d, acc, { x: -0.24, ph, h: 1.0, dress: 'coat', hat: f % 2 ? null : null });
      person(d, acc, { x: 0.22, ph: (ph + 0.08) % 1, h: 0.93, dress: 'coat', tunic: true, bag: true });
    });
    both(KINDS.motherChild, f, (d, acc, R) => {
      person(d, acc, { x: -0.16, ph, h: 0.95, dress: 'coat', bag: false, arms: { R: [[0.03, 1.27], [0.1, 1.0], [0.19, 0.78]] } });
      acc(true);
      person(d, (on) => acc(true), { x: 0.3, ph: (ph * 2) % 1, h: 0.6, dress: 'shirt', walk: 1.2, arms: { L: [[0.18, 0.8], [0.14, 0.76], [0.2, 0.74]] } });
      acc(false);
      d.line([[0.19, 0.78], [0.2, 0.75]], 0.05);
    });
    both(KINDS.aoDai, f, (d, acc, R) => person(d, acc, { ph, h: 0.96, dress: 'shirt', tunic: true, bag: true, walk: 0.8 }));
    both(KINDS.bikeKumquat, f, (d, acc, R) => bike(d, acc, { ph, cargo: 'kumquat', R, hat: 'helmet', dress: 'coat' }));
    both(KINDS.bikePeach, f, (d, acc, R) => bike(d, acc, { ph, cargo: 'peach', R, hat: null, dress: 'shirt' }));
    both(KINDS.bicycle, f, (d, acc, R) => bike(d, acc, { ph, cycle: true, R, hat: 'coi' }));
    // side views (facing +x)
    both(KINDS.sManBranch, f, (d, acc, R) => {
      person(d, acc, { ph, h: 1.0, view: 'side', dress: 'shirt', arms: { F: [[0, 1.32], [0.08, 1.4], [0.02, 1.48]] } });
      branch(d, acc, 0.02, 1.46, [[-0.25, 1.75], [-0.55, 2.05], [-0.72, 2.25]], R, 30, 0.028);
    });
    both(KINDS.sWomanKumquat, f, (d, acc, R) => {
      person(d, acc, { ph, h: 0.95, view: 'side', dress: 'coat', walk: 0.8, arms: { F: [[0, 1.26], [0.16, 1.1], [0.28, 1.12]] } });
      kumquatTree(d, acc, 0.3, 1.36, 0.25, R, 16);
    });
    both(KINDS.sUmbrella, f, (d, acc, R) => {
      person(d, acc, { ph, h: 1.0, view: 'side', dress: 'coat', arms: { F: [[0, 1.32], [0.14, 1.18], [0.1, 1.32]] } });
      const bob = 0.022 * Math.abs(Math.sin(ph * TAU));
      d.line([[0.1, 1.3 + bob], [0.06, 1.95 + bob]], 0.018);
      acc(true); d.half(0.06, 1.9 + bob, 0.5, 0.26); acc(false);
    });
    both(KINDS.sAoDai, f, (d, acc, R) => person(d, acc, { ph, h: 0.96, view: 'side', tunic: true, bag: true, walk: 0.75 }));
    // standers, looking at the flowers: tiny shifts of weight and hands over a long loop
    const w = 0.5 + 0.5 * Math.sin(ph * TAU);
    const reach = f >= 5 && f <= 6;
    both(KINDS.standCoi, f, (d, acc, R) => person(d, acc, { h: 1.0, view: 'side', walk: 0, hat: 'coi', dress: 'shirt', lean: 0.01 * w, arms: { F: reach ? [[0, 1.32], [0.2, 1.12], [0.42, 1.08]] : [[0, 1.32], [-0.06, 1.05], [-0.1, 0.92]] } }));
    both(KINDS.standScarf, f, (d, acc, R) => person(d, acc, { h: 0.94, view: 'side', walk: 0, hat: 'scarf', dress: 'coat', lean: 0.012 * w, arms: { F: f < 4 ? [[0, 1.26], [0.16, 1.02], [0.26, 1.06]] : [[0, 1.26], [0.1, 1.0], [0.3, 1.16]] } }));
    both(KINDS.standBag, f, (d, acc, R) => { person(d, acc, { h: 0.95, view: 'side', walk: 0, dress: 'coat', bag: true, tunic: true, lean: -0.01 * w, arms: { F: [[0, 1.28], [0.06, 1.02], [0.08 + 0.02 * w, 0.84]] } }); });
    both(KINDS.standPhot, f, (d, acc, R) => person(d, acc, { h: 1.02, view: 'side', walk: 0, hat: 'phot', dress: 'coat', lean: 0.008 * w, arms: { F: f === 2 || f === 3 ? [[0, 1.34], [0.18, 1.2], [0.36, 1.26]] : [[0, 1.34], [-0.04, 1.06], [0.0, 0.9]] } }));
    // balcony people (front view, standing still behind a rail; the rail hides the legs)
    const sw = Math.sin(ph * TAU);
    both(KINDS.balLean, f, (d, acc, R) => {
      person(d, acc, { h: 0.98, walk: 0, dress: 'shirt', hat: f < 4 ? null : null, arms: {
        L: [[-0.2, 1.31], [-0.25, 1.06], [-0.1, 0.98 + 0.01 * sw]],
        R: [[0.2, 1.31], [0.27, 1.08 + 0.02 * sw], [0.2, 1.02 + (f === 3 || f === 4 ? 0.14 : 0)]],
      } });
      acc(true); d.line([[0.2, 1.02 + (f === 3 || f === 4 ? 0.14 : 0)], [0.27, 1.04 + (f === 3 || f === 4 ? 0.16 : 0)]], 0.012); acc(false);
    });
    both(KINDS.balLaundry, f, (d, acc, R) => {
      const up = 0.08 * sw;
      person(d, acc, { h: 0.95, walk: 0, dress: 'shirt', arms: { R: [[0.19, 1.26], [0.3, 1.52 + up], [0.26, 1.78 + up]] } });
      acc(true); d.poly([[0.16, 1.8 + up], [0.46, 1.8 + up], [0.44, 1.42 + up], [0.18, 1.44 + up]]); acc(false);
    });
    both(KINDS.balWater, f, (d, acc, R) => {
      const tip = 0.03 * sw;
      person(d, acc, { h: 0.86, walk: 0, dress: 'coat', hat: 'scarf', arms: { R: [[0.17, 1.14], [0.3, 0.98], [0.36, 0.92 - tip]] } });
      acc(true); d.poly([[0.3, 0.98 - tip], [0.48, 0.98 - tip], [0.47, 0.84 - tip], [0.31, 0.84 - tip]]); d.line([[0.47, 0.95 - tip], [0.58, 0.9 - tip * 2]], 0.02); acc(false);
    });
    both(KINDS.balChild, f, (d, acc, R) => {
      const tilt = 0.02 * sw;
      acc(true);
      person(d, (on) => acc(true), { x: tilt, h: 0.6, walk: 0, dress: 'shirt', arms: {
        L: [[-0.12 + tilt, 0.8], [-0.2, 0.86], [-0.16, 0.92]], R: [[0.12 + tilt, 0.8], [0.2, 0.86], [0.16, 0.92]],
      } });
      acc(false);
    });
    both(KINDS.balLantern, f, (d, acc, R) => {
      const up = 0.05 * sw;
      person(d, acc, { h: 0.97, walk: 0, dress: 'shirt', arms: {
        L: [[-0.19, 1.3], [-0.16, 1.62 + up], [-0.05, 1.86 + up]], R: [[0.19, 1.3], [0.16, 1.62 + up], [0.05, 1.86 + up]],
      } });
      d.line([[0, 1.86 + up], [0, 1.94 + up]], 0.012);
      acc(true); d.ell(0, 1.78 + up, 0.12, 0.1); d.line([[0, 1.66 + up], [0, 1.56 + up]], 0.02); acc(false);
    });
  }
  for (const d of draws) { drawBoth(...d); yield; }
  // join the two layers: R = body, G = accent; soften a touch so the brush can bite the edge
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const go = out.getContext('2d');
  // (the softening and the reading are done a strip at a time: each strip is drawn with a margin, so the blur at its edges
  // sees what it would see in the whole sheet, and only its own rows are kept)
  const STRIP = CH * 2, M = 8;
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = STRIP + 2 * M;
  const gt = tmp.getContext('2d', { willReadFrequently: true });
  gt.filter = 'blur(1.2px)';
  const img = go.createImageData(W, H);
  const layer = (src, y0, h) => {
    gt.clearRect(0, 0, W, tmp.height);
    const sy = Math.max(0, y0 - M), sh = Math.min(H, y0 + h + M) - sy;
    gt.drawImage(src, 0, sy, W, sh, 0, sy - (y0 - M), W, sh);
    return gt.getImageData(0, M, W, h).data;
  };
  for (let y0 = 0; y0 < H; y0 += STRIP) {
    const h = Math.min(STRIP, H - y0);
    const B = layer(body, y0, h);
    yield;
    const A = layer(accC, y0, h);
    yield;
    const Lg = layer(legC, y0, h);
    for (let i = 0, o = y0 * W * 4; i < W * h; i++, o += 4) { img.data[o] = B[i * 4]; img.data[o + 1] = A[i * 4]; img.data[o + 2] = Lg[i * 4]; img.data[o + 3] = 255; }
    yield;
  }
  go.putImageData(img, 0, 0);
  return out;
}
// the drawings are the same for every season: one copy for the whole page (on the four-season page, the seasons share the
// parent page's copy, so only the first season draws them)
function sheetStore() {
  try { if (window.parent && window.parent !== window && window.parent.location.origin === location.origin) return (window.parent.__chomSheets ||= {}); } catch (e) { /* not ours */ }
  return (window.__chomSheets ||= {});
}
const SHEETS = { A: () => sheetSteps(), B: () => drawSheetB() };
function runSteps(gen) { for (;;) { const r = gen.next(); if (r.done) return r.value; } }
function sheetCanvas(k) {
  const store = sheetStore();
  if (!store[k]) store[k] = runSteps(SHEETS[k]());
  return store[k];
}
// draw both sheets now, a slice at a time (slice(): resolves when the next piece may run), unless the page has them already
export async function prepareSheets({ slice = () => new Promise((r) => setTimeout(r, 0)) } = {}) {
  const store = sheetStore();
  for (const k of ['A', 'B']) {
    if (store[k]) continue;
    if (store[k + 'Busy']) { await store[k + 'Busy']; if (store[k]) continue; }
    let done;
    store[k + 'Busy'] = new Promise((res) => (done = res));
    const gen = SHEETS[k]();
    for (;;) {
      await slice();
      const r = gen.next();
      if (r.done) { store[k] = r.value; break; }
    }
    store[k + 'Busy'] = null;
    done();
  }
}
// a texture of a sheet (a copy made in this page, so it belongs to this page's context)
function sheetTexture(k) {
  const src = sheetCanvas(k);
  let img = src;
  if (src.ownerDocument !== document) {
    img = document.createElement('canvas');
    img.width = src.width; img.height = src.height;
    img.getContext('2d').drawImage(src, 0, 0);
  }
  const t = new THREE.CanvasTexture(img);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 4;
  return t;
}

// ---------------------------------------------------------------- where everyone is
// mode 0 = standing; 1 = walking along z (a = z start, b = length, dir); 2 = out of the side street, then along the near pavement
// 3 = riding along z
// ---------------------------------------------------------------- the material
const vert = /* glsl */`
attribute vec4 aA;   // x, z start, length, scale
attribute vec4 aB;   // mode, row, side-view row, phase
attribute vec4 aC;   // body rgb, flip
attribute vec4 aD;   // accent rgb, direction
attribute float aV;  // speed (riders)
attribute vec3 aE;   // trousers rgb
attribute float aY;  // the floor it stands on (0 = the street, else a balcony)
uniform float uTime; uniform vec3 uRefRight;
uniform vec3 uKeyDir; uniform float uSunOn;      // which way the light crosses a cut-out (the body's own shading)
uniform float uCols, uRows; uniform vec2 uFadeZ; uniform vec4 uFaceLight;
uniform sampler2D tPath; uniform vec2 uPathSize;
vec2 pathAt(float pi, float i){ return texture2D(tPath, vec2((i + 0.5) / uPathSize.x, (pi + 0.5) / uPathSize.y)).xy; }
varying vec2 vUv, vCell; varying vec3 vWP, vBody, vAcc, vLegs, vMid; varying float vFade, vSeed, vKey;
void main(){
  vLegs = aE;
  float mode = aB.x, phase = aB.w, sc = aA.w, dir = aD.w;
  // on twos: the drawing and the position change together, twelve times a second
  float tq = floor((uTime + phase * 11.0) * 12.0) / 12.0;
  vec3 base = vec3(aA.x, aY, aA.y);
  float frame = 0.0, row = aB.y, fade = 1.0, flip = aC.w;
  vec3 side = normalize(vec3(uRefRight.x, 0.0, uRefRight.z));
  if (mode < 0.5) {
    frame = floor(fract(tq / 7.3 + phase) * 8.0);
  } else if (mode < 2.5) {
    // two steps per 1.05 s, a stride of 0.62 m (scaled): the body moves exactly as far as the feet do
    float cyc = 1.05 * sc, v = 2.0 * 0.62 * sc / cyc;
    float span = aA.z;
    float s = mod(v * tq + phase * span, span);
    frame = floor(fract(tq / cyc + phase * 3.0) * 8.0);
    if (mode < 1.5) {
      // dir -1: away from the eye (toward -z); dir +1: coming this way
      base.z = dir > 0.0 ? aA.y - span + s : aA.y - s;
      float zz = base.z;
      fade = smoothstep(uFadeZ.x, uFadeZ.y, zz);
    } else {
      // out of a side street (x from sx to the pavement), then away along the pavement; dir +1 runs it backwards
      float sx = aV > 0.0 ? aV : 12.0;
      float seg = sx - aA.x;
      float u = dir < 0.0 ? s : span - s;
      if (u < seg) { base.x = sx - u; base.z = aA.y; row = aB.z; flip = dir < 0.0 ? 1.0 : 0.0; }
      else { base.x = aA.x; base.z = aA.y - (u - seg); }
      fade = smoothstep(uFadeZ.x, uFadeZ.y, base.z);
    }
  } else if (mode < 3.5) {
    float span = aA.z;
    float s = mod(aV * tq + phase * span, span);
    base.z = dir > 0.0 ? aA.y - span + s : aA.y - s;
    frame = floor(fract(tq * 1.3 + phase) * 8.0);
    fade = smoothstep(uFadeZ.x, uFadeZ.y, base.z);
  } else {
    // along a path (resampled to even steps): back view when it walks along the view, side view when it walks across
    float cyc = 1.05 * sc, v = 2.0 * 0.62 * sc / cyc;
    float span = aA.z;
    // phase spreads walkers evenly along the path (the clock offset in tq is taken back out)
    float s = mod(v * (tq - phase * 11.0) + phase * span, span);
    if (dir < 0.0) s = span - s;
    float n1 = uPathSize.x - 1.0;
    float u = s / span * n1;
    float i0 = min(floor(u), n1 - 1.0);
    vec2 p0 = pathAt(aV, i0), p1 = pathAt(aV, i0 + 1.0);
    base.xz = mix(p0, p1, clamp(u - i0, 0.0, 1.0));
    vec2 tg = normalize(p1 - p0 + 1e-6) * dir;
    frame = floor(fract(tq / cyc + phase * 3.0) * 8.0);
    float across = dot(tg, normalize(side.xz));
    if (abs(across) > 0.6) { row = aB.z; flip = across < 0.0 ? 1.0 : 0.0; }
    fade = smoothstep(uFadeZ.x, uFadeZ.y, base.z);
  }
  // the cut-out: a quad standing on the ground, facing the reference eye, never turning with the camera
  float w = ${(CW / PX).toFixed(4)} * sc, h = ${(CH / PX).toFixed(4)} * sc;
  if (uFaceLight.w > 0.5) {
    vec3 tl = uFaceLight.xyz - base; tl.y = 0.0;
    if (length(tl) > 0.05) side = normalize(vec3(-tl.z, 0.0, tl.x));
  }
  vec3 wp = base + side * (position.x * w) + vec3(0.0, (position.y + 0.5) * h - 6.0 / ${PX.toFixed(1)} * sc, 0.0);
  vec2 tuv = uv;
  if (flip > 0.5) tuv.x = 1.0 - tuv.x;
  vUv = tuv;
  vCell = vec2(frame, row);
  vWP = wp;
  vMid = base + vec3(0.0, 0.9 * sc, 0.0);
  vBody = aC.rgb; vAcc = aD.rgb;
  // people never thin out near the lens (README 6c): the season keeps its paths 2.2 m from the camera instead
  vFade = fade;
  vSeed = phase;
  // which way the light crosses this cut-out (-1 = from its left, +1 = from its right): the shading of the body follows it,
  // and turns round with a mirrored drawing. At night there is no sun to ask, so the light is taken to come from the left
  vec3 kd = normalize(vec3(uKeyDir.x, 0.0, uKeyDir.z) + vec3(1e-5));
  float keyS = uSunOn > 0.5 ? dot(kd, normalize(side)) : 0.75;
  vKey = flip > 0.5 ? -keyS : keyS;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;
const frag = /* glsl */`
${COMMON_GLSL()}
uniform sampler2D tSheet, tSheet2;
uniform float uCols, uRows, uRowsB;
varying vec2 vUv, vCell; varying vec3 vWP, vBody, vAcc, vLegs, vMid; varying float vFade, vSeed, vKey;
void main(){
  // brushed edge: the real brush sheet wobbles where the sheet is read and eats into the edge
  vec4 b = texture2D(tBrush, vUv * vec2(0.55, 0.8) + vSeed * 7.3);
  vec4 b2 = texture2D(tBrush, vUv.yx * vec2(0.9, 0.4) + vSeed * 3.1);
  vec2 inner = clamp(vUv + (b.rg - 0.5) * vec2(0.03, 0.02), 0.002, 0.998);
  vec2 uv = vec2((vCell.x + inner.x) / uCols, 1.0 - (vCell.y + 1.0 - inner.y) / uRows);
  vec2 uv2 = vec2((vCell.x + inner.x) / uCols, 1.0 - (vCell.y - uRows + 1.0 - inner.y) / uRowsB);
  vec4 s = mix(texture2D(tSheet, uv), texture2D(tSheet2, uv2), step(uRows - 0.5, vCell.y));
  // (the mask is lifted first, so a line drawn inside the shape — see INK — is never eaten away by the brush's jitter)
  float m = min(1.0, s.r * 1.3) + (b.a - 0.5) * 0.45 + (b2.b - 0.5) * 0.15;
  float a = band(m, 0.5);
  // thinning at the far end of a loop: the paint breaks up stroke by stroke
  a *= band(vFade + (b2.a - 0.5) * 0.4, 0.5);
  if (a < 0.5) discard;
  vec3 col = mix(vBody, vLegs, band(s.b + (b.a - 0.5) * 0.2, 0.5));
  col = mix(col, mix(vAcc, vBody, 0.18), band(s.g + (b.b - 0.5) * 0.3, 0.5));
  // a flat light: warm where the sun is on them, a cool step in the shade, broken by the strokes
  vec3 sp = vWP + vec3(0.0, 1.0, 0.0);
  sp.x = max(sp.x, uRoof.z + 0.25);
  float sunV = sunMask(sp, (b.a - 0.5) * 0.5) * uSunOn;
  vec3 albC = col;
  col *= mix(uKShade * 1.12, uKLit * 1.02, sunV * band(b.b + 0.2, 0.45));
  // lamp light is taken near the figure's middle, not per pixel: the painted light steps of the ground behind must not run
  // across a flat figure (that reads as seeing through it); a little of the height is kept so the light still falls off
  vec3 lp = mix(vMid, vWP, 0.2);
  col += lampsOn(albC, lp, normalize(cameraPosition - lp), vec3(0.0), (b.b - 0.5) * 0.3, (b.rg - 0.5) * 4.0, 0.0);
  col *= 0.94 + 0.12 * b2.b;
  // Close to the eye a cut-out must stop reading as cut paper: it gets the form a painter would give it — one step of light
  // down the side the light comes from, a darker turn at the silhouette, and folds of cloth running down the body (never the
  // legs). All of it fades out with distance, so a figure far down the street stays the flat painted shape it should be.
  float near = 1.0 - smoothstep(5.0, 13.0, length(cameraPosition - vWP));
  if (near > 0.01) {
    float across = (vUv.x - 0.5) * 2.0;
    float lit = across * vKey;
    float form = band(lit + (b.a - 0.5) * 0.6, -0.12);
    float turn = smoothstep(0.5, 1.0, abs(across));
    float legs = band(s.b + (b.a - 0.5) * 0.2, 0.5);
    vec4 f1 = texture2D(tBrush, vec2(vUv.x * 2.1 + vSeed * 5.1, vUv.y * 0.75 + vSeed * 2.3));
    vec4 f2 = texture2D(tBrush, vec2(vUv.x * 1.15 + vSeed * 2.7, vUv.y * 0.3 + vSeed * 4.1));
    float fold = band(f1.g + (b2.b - 0.5) * 0.25, 0.5);
    float fold2 = band(f2.r + (b.b - 0.5) * 0.2, 0.55);
    // the light side keeps its colour; the far side of the body goes down a step, and the silhouette turns away further
    col *= mix(1.0, mix(0.74, 1.03, form) * (1.0 - 0.16 * turn), near);
    col *= mix(1.0, mix(0.88, 1.04, fold) * mix(0.96, 1.02, fold2), near * (1.0 - legs * 0.55));
    // the lines drawn on the clothes (and the turn of the silhouette, which the mask falls through too)
    float ink = smoothstep(0.97, 0.80, s.r + (b2.r - 0.5) * 0.06);
    col *= mix(1.0, 0.72, ink * near);
  }
  // low contrast by design: always a veil of the damp air, thicker with distance
  float air = 0.08 + 0.92 * airAt(vWP);
  float g = dot(col, vec3(0.3, 0.55, 0.15));
  col = mix(col, vec3(g), 0.08 * (1.0 - 0.7 * near));
  col = mix(col, airCol(vWP), air);
  gl_FragColor = vec4(col, 1.0);
}`;

// list: entries from the season (see README). fadeZ: the far end of the street, where loops thin out and wrap
const MODES = { stand: 0, walk: 1, sideStreet: 2, ride: 3, path: 4 };
const PATH_N = 64;
// a path of [x, z] points, resampled to PATH_N even steps; returns { pts, length }
export function resamplePath(path) {
  const L = [0];
  for (let i = 1; i < path.length; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = L[L.length - 1];
  const pts = [];
  let k = 0;
  for (let j = 0; j < PATH_N; j++) {
    const s = (j / (PATH_N - 1)) * total;
    while (k < path.length - 2 && L[k + 1] < s) k++;
    const f = (s - L[k]) / Math.max(1e-9, L[k + 1] - L[k]);
    pts.push([path[k][0] + (path[k + 1][0] - path[k][0]) * f, path[k][1] + (path[k + 1][1] - path[k][1]) * f]);
  }
  return { pts, length: total };
}
let sheetA = null, sheetB = null;
// walkers' speed (m/s) in walk and sideStreet: two steps of 0.62 m per 1.05 s (the scale cancels out)
const WALK_V = (2 * 0.62) / 1.05;
export function buildCrowd(scene, { list: input, fadeZ = [-122, -112], evenPhase = false } = {}) {
  const sheet = sheetA || (sheetA = sheetTexture('A'));
  const usesB = input.some((p) => (p.kind !== undefined ? KINDS[p.kind] : p.row) >= ROWS || (p.kindSide !== undefined && KINDS[p.kindSide] >= ROWS));
  const sheet2 = usesB ? (sheetB || (sheetB = sheetTexture('B'))) : blankSheet();
  const paths = [];
  const list = input.map((p) => ({
    ...p,
    mode: typeof p.mode === 'string' ? MODES[p.mode] : p.mode,
    row: p.kind !== undefined ? KINDS[p.kind] : p.row,
    rowS: p.kindSide !== undefined ? KINDS[p.kindSide] : p.rowS,
    zA: p.z ?? p.zA, ph: p.phase ?? p.ph, sc: p.scale ?? p.sc ?? 1, body: p.top ?? p.body, acc: p.accent ?? p.acc,
    v: p.speed ?? p.v ?? p.sideStreetX,
  }));
  for (const p of list) if (p.row === undefined) throw new Error('crowd: unknown kind ' + p.kind);
  // evenPhase: phase is the true place along the loop (phase i/n spaces n figures evenly, whatever the length).
  // The default keeps the old clock: each figure's clock runs 11 s x phase ahead, so it sits at phase * (length + 11 v).
  // Paths (mode 4) are always even.
  for (const p of list) {
    if (!(p.evenPhase ?? evenPhase) || !(p.mode >= 1 && p.mode <= 3) || !(p.len > 0)) continue;
    const v = p.mode === 3 ? p.v ?? 0 : WALK_V;
    const f = (p.ph ?? 0) - Math.floor(p.ph ?? 0);
    p.ph = (f * p.len) / (p.len + 11 * v);
  }
  for (const p of list) {
    if (p.mode !== 4) continue;
    const r = resamplePath(p.path);
    p.pathPts = r.pts; p.len = r.length; p.v = paths.length;
    p.x = r.pts[0][0]; p.zA = r.pts[0][1];
    if (p.rowS === undefined) p.rowS = p.row;
    paths.push(r.pts);
  }
  const pd = new Float32Array(PATH_N * Math.max(1, paths.length) * 4);
  paths.forEach((pts, j) => pts.forEach(([x, z], i) => pd.set([x, z, 0, 1], (j * PATH_N + i) * 4)));
  const pathTex = new THREE.DataTexture(pd, PATH_N, Math.max(1, paths.length), THREE.RGBAFormat, THREE.FloatType);
  pathTex.minFilter = pathTex.magFilter = THREE.NearestFilter;
  pathTex.needsUpdate = true;
  const n = list.length;
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', base.attributes.position);
  g.setAttribute('uv', base.attributes.uv);
  const A = new Float32Array(n * 4), B = new Float32Array(n * 4), Cc = new Float32Array(n * 4), D = new Float32Array(n * 4), V = new Float32Array(n), E = new Float32Array(n * 3), Y = new Float32Array(n);
  const col = new THREE.Color();
  list.forEach((p, i) => {
    A.set([p.x, p.zA, p.len ?? 0, p.sc], i * 4);
    B.set([p.mode, p.row, p.rowS ?? p.row, p.ph], i * 4);
    col.set(p.body); Cc.set([col.r, col.g, col.b, p.flip ? 1 : 0], i * 4);
    col.set(p.acc); D.set([col.r, col.g, col.b, p.dir ?? 1], i * 4);
    V[i] = p.v ?? 0;
    col.set(p.legs ?? p.body); E.set([col.r, col.g, col.b], i * 3);
    Y[i] = p.y ?? 0;
  });
  g.setAttribute('aA', new THREE.InstancedBufferAttribute(A, 4));
  g.setAttribute('aB', new THREE.InstancedBufferAttribute(B, 4));
  g.setAttribute('aC', new THREE.InstancedBufferAttribute(Cc, 4));
  g.setAttribute('aD', new THREE.InstancedBufferAttribute(D, 4));
  g.setAttribute('aV', new THREE.InstancedBufferAttribute(V, 1));
  g.setAttribute('aE', new THREE.InstancedBufferAttribute(E, 3));
  g.setAttribute('aY', new THREE.InstancedBufferAttribute(Y, 1));
  g.instanceCount = n;
  const m = new THREE.ShaderMaterial({
    uniforms: {
      ...U, tSheet: { value: sheet }, tSheet2: { value: sheet2 }, uCols: { value: COLS }, uRows: { value: ROWS }, uRowsB: { value: ROWS_B },
      uFadeZ: { value: new THREE.Vector2(...fadeZ) }, tPath: { value: pathTex }, uPathSize: { value: new THREE.Vector2(PATH_N, Math.max(1, paths.length)) },
    },
    vertexShader: vert, fragmentShader: frag, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  // G: the same cut-outs, same stepped walk, drawn into the sun's shadow map (the shadow is the walking shape)
  mesh.userData.shadowMaterial = new THREE.ShaderMaterial({
    uniforms: m.uniforms, vertexShader: vert, side: THREE.DoubleSide, defines: { SHADOW_PASS: '' },
    fragmentShader: /* glsl */`
      uniform sampler2D tSheet, tSheet2; uniform float uCols, uRows, uRowsB;
      varying vec2 vUv, vCell; varying float vFade;
      void main(){
        vec2 cu = clamp(vUv, 0.002, 0.998);
        vec2 uv = vec2((vCell.x + cu.x) / uCols, 1.0 - (vCell.y + 1.0 - cu.y) / uRows);
        vec2 uv2 = vec2((vCell.x + cu.x) / uCols, 1.0 - (vCell.y - uRows + 1.0 - cu.y) / uRowsB);
        float r = mix(texture2D(tSheet, uv).r, texture2D(tSheet2, uv2).r, step(uRows - 0.5, vCell.y));
        if (r < 0.5 || vFade < 0.5) discard;
        gl_FragColor = vec4(1.0);
      }`,
  });
  scene.add(mesh);
  return { mesh, count: n, sheet, list, update() {}, positions: (t) => crowdPositions(list, t, fadeZ) };
}

// where every figure stands at time t (the same stepped maths as the vertex shader), for the clipping check
export function crowdPositions(list, t, fadeZ = [-122, -112]) {
  const out = [];
  const fract = (x) => x - Math.floor(x);
  const mod = (a, b) => a - b * Math.floor(a / b);
  for (const p of list) {
    const tq = Math.floor((t + p.ph * 11) * 12) / 12;
    let x = p.x, z = p.zA, visible = true;
    const dir = p.dir ?? 1;
    if (p.mode === 1 || p.mode === 2) {
      const v = 2 * 0.62 / 1.05, span = p.len;
      const s = mod(v * tq + p.ph * span, span);
      if (p.mode === 1) z = dir > 0 ? p.zA - span + s : p.zA - s;
      else {
        const sx = p.v > 0 ? p.v : 12, seg = sx - p.x, u = dir < 0 ? s : span - s;
        if (u < seg) { x = sx - u; z = p.zA; } else { x = p.x; z = p.zA - (u - seg); }
      }
    } else if (p.mode === 3) {
      const span = p.len, s = mod(p.v * tq + p.ph * span, span);
      z = dir > 0 ? p.zA - span + s : p.zA - s;
    } else if (p.mode === 4) {
      const v = 2 * 0.62 / 1.05, span = p.len;
      let s = mod(v * (tq - p.ph * 11) + p.ph * span, span);
      if (dir < 0) s = span - s;
      const u = (s / span) * (PATH_N - 1), i0 = Math.min(Math.floor(u), PATH_N - 2), f = Math.min(1, u - i0);
      const a = p.pathPts[i0], b = p.pathPts[i0 + 1];
      x = a[0] + (b[0] - a[0]) * f; z = a[1] + (b[1] - a[1]) * f;
    }
    if (z < fadeZ[0]) visible = false;
    const ride = p.mode === 3 || /^bike/.test(KIND_NAME[p.row] || '');
    const name = KIND_NAME[p.row];
    out.push({ x, y: p.y ?? 0, z, r: (KIND_R[name] ?? 0.3) * p.sc, h: (ride ? 2.4 : 1.8) * p.sc, visible, kind: name, ride });
  }
  return out;
}

for (const [k, v] of Object.entries(KINDS)) KIND_NAME[v] = k;

// a blank 1x1 sheet for scenes that do not use the second sheet
let blank = null;
function blankSheet() {
  if (!blank) { blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); blank.needsUpdate = true; }
  return blank;
}
// a point on a standing or sitting figure (core.crowdAnchor): entry as given to core.crowd, name from KIND_ANCHOR
export function crowdAnchor(p, name) {
  const a = KIND_ANCHOR[p.kind]?.[name];
  if (!a) return null;
  const r = U.uRefRight.value;
  const side = new THREE.Vector3(r.x, 0, r.z).normalize();
  const sc = p.scale ?? 1;
  const fx = p.flip ? -1 : 1;
  return new THREE.Vector3(p.x, p.y ?? 0, p.z).addScaledVector(side, a[0] * sc * fx).add(new THREE.Vector3(0, a[1] * sc, 0));
}
