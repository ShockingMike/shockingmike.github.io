// Chớm world, season Xuân: who is in the crowd and where they go (core/crowd.js draws, steps and shadows them).
import { rng } from '../../core/brush.js';
import { KINDS } from '../../core/crowd.js';

// G: the early 2000s, dressed for going out before Tết: sober tops and trousers, a few Tết colours
const PALETTE = {
  top: ['#6a4a3a', '#7c7470', '#b09a7e', '#2e3850', '#262426', '#8a8060', '#4e5a44', '#6e3a36', '#9a8470', '#555c6e', '#8c6a4c', '#3e3a44'],
  legs: ['#26262c', '#3a3e4c', '#5a4e44', '#8a7c62', '#2c2a30', '#6a6660', '#443a36'],
  accent: {
    peach: ['#e08aa2', '#d87896'], kumquat: ['#dc7a2a', '#e08a30'], umbrella: ['#8a2a2c', '#2e3a5c', '#3c5a48', '#6a3456', '#262428', '#a0502e'],
    aodai: ['#b42a28', '#a8204a', '#c04a3a', '#2e5a8a'], child: ['#cc2e28', '#d8403a', '#c82a50'], scarf: ['#d88aa0', '#c86a80', '#e0a060', '#9a5a7a'],
    flowers: ['#dcb450', '#e08aa2'], none: ['#8a2a2c'],
  },
};
// Lanes, so nobody walks through anybody (checked by core's clipping check):
//   far pavement  x = -4.75  people standing at the far shops, facing them
//                 x = -4.02  walking away down the street (all at the same pace, evenly spaced)
//   road          x = -3.16  one walker going home with a peach branch (one of the crowd since 21/9), the only one on the road;
//                 x = -2.30  riders coming this way (same speed, spaced);
//                 x = -1.30  the motorbike with the peach tree, alone (the camera's push passes 1 m from this lane: crowd
//                            riders there came within 1.6 m of the lens, so they ride in the coming lane instead)
//   near kerb     x =  0.90  people looking at the next seller's peach buckets
//   near pavement x =  4.72  people coming this way who turn into the side street (from x = 12, hidden by the corner)
// (G's walkers along the road's far edge, which passed close to the lens, big and veiled by the beams, are gone)
function place(R) {
  const L = [];
  const pick = (a) => a[Math.floor(R() * a.length)];
  const dress = (o, accKind) => ({ ...o, body: pick(PALETTE.top), legs: pick(PALETTE.legs), acc: pick(PALETTE.accent[accKind]) });
  const walkerKinds = [
    [KINDS.manBranch, 'peach'], [KINDS.womanKumquat, 'kumquat'], [KINDS.umbrella, 'umbrella'], [KINDS.couple, 'aodai'], [KINDS.motherChild, 'child'], [KINDS.aoDai, 'aodai'],
  ];
  const N = 28;
  for (let i = 0; i < N; i++) {
    const [row, ac] = pick(walkerKinds);
    L.push(dress({ mode: 1, row, x: -4.02, zA: 4, len: 126, dir: -1, ph: (i + 0.3 * R()) / N, sc: 0.95 + R() * 0.1, flip: R() < 0.5 }, ac));
  }
  const sideKinds = [[KINDS.manBranch, KINDS.sManBranch, 'peach'], [KINDS.womanKumquat, KINDS.sWomanKumquat, 'kumquat'], [KINDS.umbrella, KINDS.sUmbrella, 'umbrella'], [KINDS.aoDai, KINDS.sAoDai, 'aodai']];
  const NS = 10;
  for (let i = 0; i < NS; i++) {
    const [row, rowS, ac] = pick(sideKinds);
    L.push(dress({ mode: 2, row, rowS, x: 4.72, zA: -8.1 - R() * 0.6, len: 120, dir: 1, ph: (i + 0.3 * R()) / NS, sc: 0.95 + R() * 0.1, flip: false }, ac));
  }
  const standKinds = [[KINDS.standCoi, 'none'], [KINDS.standScarf, 'scarf'], [KINDS.standBag, 'aodai'], [KINDS.standPhot, 'none']];
  for (let i = 0; i < 20; i++) {
    const [row, ac] = pick(standKinds);
    let z = -28 - i * 4 - R() * 1.5;
    // the street poles stand on this line too (season.js POLE_Z): keep a step away from them
    for (const pz of [-5, -19.5, -34, -48.5, -63, -77.5, -92]) if (Math.abs(z - pz) < 0.7) z = pz + (z > pz ? 0.7 : -0.7);
    L.push(dress({ mode: 0, row, x: -4.75, zA: z, ph: R(), sc: 0.94 + R() * 0.1, flip: true }, ac));
  }
  for (const z of [-12.5, -13.6, -17.0, -20.5]) {
    const [row, ac] = pick(standKinds);
    L.push(dress({ mode: 0, row, x: 0.9, zA: z, ph: R(), sc: 0.95 + R() * 0.08, flip: false }, ac));
  }
  const rides = [[KINDS.bikeKumquat, 'kumquat'], [KINDS.bikePeach, 'peach'], [KINDS.bicycle, 'flowers']];
  const NR = 9;
  for (let i = 0; i < NR; i++) {
    const [row, ac] = rides[i % 3];
    L.push(dress({ mode: 3, row, x: -2.3, zA: 4, len: 126, dir: 1, v: 4.3, ph: (i + 0.2 * R()) / NR, sc: 1, flip: R() < 0.5 }, ac));
  }
  // four more coming this way, in the gaps between those (they used to ride away in the motorbike's lane, which the camera
  // passes too closely). Where each of the nine is along the loop: core/crowd.js puts a rider at phase * (len + 11 v)
  const LEN = 126, V = 4.3;
  const at = L.slice(-NR).map((r) => (r.ph * (LEN + 11 * V)) % LEN).sort((a, b) => a - b);
  const gaps = at.map((a, k) => [k === at.length - 1 ? at[0] + LEN - a : at[k + 1] - a, a]).sort((a, b) => b[0] - a[0]).slice(0, 4);
  for (let i = 0; i < 4; i++) {
    const [row, ac] = rides[i % 2];
    const [g, a] = gaps[i];
    // evenPhase: phase is the true place along the loop
    L.push(dress({ mode: 3, row, x: -2.3, zA: 4, len: LEN, dir: 1, v: V, ph: ((a + g / 2) % LEN) / LEN, evenPhase: true, sc: 1, flip: R() < 0.5 }, ac));
  }
  // The one walker out on the road's far edge, alone between the pavement and the riders. Until 21/9 he was the only role
  // people/placeholder still played in this season — a stand-in body for a figure the main frame never sees nearer than
  // 16 m and the tall phone frame never sees at all (measured 21/9 off the page's own camera: on 390x844 his box lies
  // wholly left of x = 0 at every point of his 80 s loop; on 1440x900 he is 26-178 px tall, always against the left edge).
  // He is one of the crowd now, in the same lane, at the crowd's pace, on the same loop as the pavement lane beside him,
  // so he fades out at the far end instead of vanishing. He is added last so nobody already in the list changes colour:
  // dress() draws from R.
  // He carries a peach branch home rather than an umbrella, and that is a measurement, not a taste: this lane is 0.86 m
  // from the riders' lane and 0.86 m from the pavement lane, while KIND_R.umbrella is 0.45 and the riders and a couple
  // are 0.45-0.46 — an umbrella here overlaps a passing rider by 4 cm ten times in 130 s (core/qa/clip.mjs). The old
  // stand-in cleared them by 1 cm. manBranch is 0.30, which leaves 11 cm on both sides.
  // evenPhase: ph is the true place along the loop — 26 m of 126 puts him where the old walker stood at t = 0 (z = -22).
  L.push(dress({ mode: 1, row: KINDS.manBranch, x: -3.16, zA: 4, len: 126, dir: -1, ph: 26 / 126, evenPhase: true, sc: 1, flip: false }, 'peach'));
  return L;
}

// the people on the balconies (core/balcony.js places them): who and what they do.
// Their clothes stand apart from the pale lime-washed walls (navy, dark brown, burgundy, near-black; a white shirt only
// against a shaded wall), so they read as people, not as ghosts; they stay a tier behind the main figures in the air.
export function balconyPeople(seed = 5) {
  const R = rng(seed);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const TOPS = ['#1e2a44', '#3a2418', '#5e1a24', '#232126', '#2e4034', '#2a3050'];
  const LEGS = ['#1a1a20', '#2a2a34', '#2e241e'];
  const p = (kind, accent, extra = {}) => ({ kind, top: pick(TOPS), legs: pick(LEGS), accent, ...extra });
  return [
    p('balLean', '#e84a2a', { smoke: true, top: '#1e2a44' }),
    p('balLaundry', '#f0ece2', { top: '#5e1a24' }),
    p('balWater', '#4a8a5a', { top: '#3a2418' }),
    p('balChild', '#d8302a', { top: '#d8302a' }),
    p('balLantern', '#c21c16', { top: '#232126' }),
    p('balLean', '#e84a2a', { smoke: true, top: '#2e4034' }),
    p('balLaundry', '#e8c040', { top: '#2a3050' }),
  ];
}

export function crowdList(seed = 20260917) {
  const list = place(rng(seed));
  // core/crowd.js reads these fields: mode, kind (row), x, z, len, dir, phase, scale, top, legs, accent, flip, speed
  return list;
}
