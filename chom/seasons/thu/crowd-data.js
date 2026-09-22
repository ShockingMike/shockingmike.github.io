// Chớm world, season Thu: who is out on Nguyễn Du on a late-October night, and where they go
// (core/crowd.js draws, steps and shadows them).
import { rng } from '../../core/brush.js';

// early 2000s, an evening out in autumn: dark trousers, shirts and thin jackets, a few pale blouses, an old man's pith helmet
const PALETTE = {
  top: ['#2e3448', '#4a3c38', '#5a5a62', '#3a4a42', '#6a4a44', '#8a8478', '#262428', '#4e5a6e', '#7a6a58', '#b8b0a0', '#3c3440', '#5e4a5a'],
  legs: ['#1e1e24', '#2c2e38', '#3a342e', '#24262c', '#4a4640'],
  accent: { ivory: ['#e8e2cc', '#f0ead8'], yellow: ['#d8b050', '#c89a40'], muted: ['#5a4a58', '#4a5a62', '#6a5040'], bag: ['#6a3a30', '#3a3a40', '#7a5a3a'] },
};
// lanes (nobody walks through anybody; the core's clipping check proves it):
//   lake railing  x = -4.72  people standing at the fence, looking at the water (a step from the trunks at x = -4.6)
//   lake pavement x = -3.95  walking home the long way under the milk-flower trees, away from us, evenly spaced
//                             (single figures: the lane runs between the trunks and the road)
//   road          x = -3.05  one lane of bicycles (flower sellers among them) and step-throughs riding away, all at one pace
// No one walks or rides within 2.2 m of the camera's push path (checked in 3D against the path; the road's middle is the
// camera's). Riders coming this way would have to use the middle of the road, so there are none.
//   near lane     z = -14.2   people walking alone out of the near lane, in its far half, then away along x = 4.1
//                             (the near half, z = -13.0, is kept clear for the girl who buys the flowers: she walks in there)
//   far lane      z = -35.55  people covering their noses (avoid) coming out of it, then away along x = 4.72
// The two house-side lanes are ordered so that NOBODY CROSSES ANYBODY'S LANE (21/9 late): a side-street walker comes in
// from x = 12 and turns away at their own x, so whoever comes out FURTHER down the street must turn on the OUTER lane
// (nearer the wall), or they walk across the other lane's people. It used to be the other way round - the far lane's
// people crossed x = 4.72 at z = -35.55 while the near lane's walked down it - and since the two loops are 90 m and 100 m
// long, sooner or later two met on the crossing: crowd#37 and crowd#44 touched by 0.07 m at 310.5 s. No phase can fix
// that; only the order of the lanes can. The lanes are 0.62 m apart: an avoid (0.30) and an aoDai seen side-on (0.25)
// need 0.55. There is no room for a third lane: the wall is at x = 5.2.
export const TREE_Z = [-6.2, -14.6, -23.0, -31.4, -39.8, -48.2, -56.6, -65.0, -73.4, -81.8, -90.2, -98.6, -107.0];
export const LANE_Z = -13.65;
export const LANE2_Z = -35.55;
export const NEAR_LANE_WALK_Z = -14.2;
export const TREE_X = -4.6;
import { LAMPS } from './light.js';

function place(R) {
  const L = [];
  const pick = (a) => a[Math.floor(R() * a.length)];
  const dress = (o, acc) => ({ ...o, top: pick(PALETTE.top), legs: pick(PALETTE.legs), accent: pick(PALETTE.accent[acc]) });
  const walkers = [['aoDai', 'bag'], ['avoid', 'muted'], ['aoDai', 'ivory'], ['aoDai', 'muted'], ['avoid', 'bag']];
  const N = 16;
  for (let i = 0; i < N; i++) {
    const [kind, acc] = walkers[i % walkers.length];
    L.push(dress({ mode: 'walk', kind, x: -3.95, z: 4, len: 126, dir: -1, phase: (i + 0.25 * R()) / N, scale: 0.95 + R() * 0.08, flip: R() < 0.5 }, acc));
  }
  // standing at the lake fence, a step away from every trunk and lamp
  const standers = [['standScarf', 'muted'], ['standBouquet', 'ivory'], ['standPhot', 'muted'], ['standBag', 'bag'], ['standBouquet', 'yellow']];
  let z = -20;
  for (let i = 0; i < 12; i++) {
    z -= 3.2 + R() * 3.5;
    for (const tz of [...TREE_Z, ...LAMPS.map((l) => l.post[1]), -35.6].sort((a, b) => b - a)) if (Math.abs(z - tz) < 0.8) z = tz - 0.8;
    const [kind, acc] = pick(standers);
    L.push(dress({ mode: 'stand', kind, x: -4.72, z, phase: R(), scale: 0.95 + R() * 0.08, flip: true }, acc));
  }
  // one lane of traffic riding away at an evening pace: flower sellers' bicycles, people riding home, step-throughs
  const NB = 9;
  const ride = ['bicycle', 'bikePlain', 'bicycle', 'bikePlain', 'bicycle', 'bikeBeanie', 'bicycle', 'bikePlain', 'bicycle'];
  const acc = ['ivory', 'muted', 'yellow', 'muted', 'muted', 'muted', 'ivory', 'muted', 'muted'];
  for (let i = 0; i < NB; i++) L.push(dress({ mode: 'ride', kind: ride[i], x: -3.05, z: 4, len: 126, dir: -1, speed: 3.0, phase: (i + 0.25 * R()) / NB, scale: 1, flip: R() < 0.5 }, acc[i]));
  // out of the far lane, then away on the house side (keeping clear of the trees on the lake side)
  const NS = 5;
  for (let i = 0; i < NS; i++) L.push(dress({ mode: 'sideStreet', kind: 'avoid', kindSide: 'sAoDai', x: 4.72, z: LANE2_Z + (R() - 0.5) * 0.4, len: 90, dir: -1, sideStreetX: 12, phase: (i + 0.3 * R()) / NS, scale: 0.95 + R() * 0.06, flip: false }, 'bag'));
  // out of the near lane, one person at a time (single figures only: the lane is narrow and the girl walks in beside them)
  const NN = 4;
  for (let i = 0; i < NN; i++) L.push(dress({ mode: 'sideStreet', kind: 'aoDai', kindSide: 'sAoDai', x: 4.1, z: NEAR_LANE_WALK_Z, len: 100, dir: -1, sideStreetX: 12, phase: (i + 0.3 * R()) / NN, scale: 0.95 + R() * 0.05, flip: false }, i % 2 ? 'bag' : 'ivory'));
  return L;
}

export function crowdList(seed = 20261020) { return place(rng(seed)); }

// the tea stall's people, on its first three stools (their stools are drawn with them): tea, the pipe, tea.
// Their shirts stand apart from the warm wood and plaster behind them: an ivory shirt, an indigo jacket, a grey-blue shirt
export function teaCrowd(TEA) {
  const [a, b, c] = TEA.stools;
  const R = rng(77);
  const stool = ['#2e5078', '#8a3230'];
  return [
    { mode: 'stand', kind: 'sitTea', x: a[0], z: a[1], phase: R(), scale: 1, flip: a[0] > TEA.at[0], top: '#9c8f74', legs: '#1e2028', accent: stool[0] },
    { mode: 'stand', kind: 'sitPipe', x: b[0], z: b[1], phase: R(), scale: 1, flip: b[0] > TEA.at[0], top: '#26305a', legs: '#1a1a20', accent: '#b89a58' },
    { mode: 'stand', kind: 'sitTea', x: c[0], z: c[1], phase: R(), scale: 0.96, flip: c[0] > TEA.at[0], top: '#4e5f7a', legs: '#22242c', accent: stool[1] },
  ];
}

// the balconies: a man smoking at the rail, someone taking in the washing, a child peeking out, someone watering
export function balconyPeople(seed = 9) {
  const R = rng(seed);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const p = (kind, accent, extra = {}) => ({ kind, top: pick(PALETTE.top), legs: pick(PALETTE.legs), accent, ...extra });
  return [
    p('balLean', '#e84a2a', { smoke: true }),
    p('balLaundry', '#e8e2cc'),
    p('balChild', '#b84a42'),
    p('balWater', '#4a6a5a'),
    p('balLean', '#e84a2a', { smoke: true }),
  ];
}
