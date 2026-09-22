// Chớm world, season Hạ: who rides, walks, sits and stops along Thanh Niên at dusk (core/crowd.js draws, steps and shadows them).
// The road: early-2000s step-throughs (alone, or with a passenger side-saddle) and old bicycles (a basket of lotus: the lotus
// sellers; a white áo dài: the schoolgirls). The far pavement: people walking home. The parapet: couples sitting with their legs
// over the lake, a few people standing to watch the sun go down, one with a bunch of lotus. The far railing: people leaning.
import { rng } from '../../core/brush.js';

// the early 2000s, a hot evening: light shirts, pale blouses, a few white áo dài, dark trousers
const PALETTE = {
  // (sober, mid-dark: the full evening sun and the air lift them a lot, and they must read as solid people, not ghosts)
  top: ['#5e5048', '#48566a', '#6e5e50', '#3e4c40', '#5a3e3c', '#343a48', '#6a5a6c', '#4a3e34', '#7a6a5a', '#2e3440', '#643e44', '#40405a'],
  legs: ['#22222a', '#2c3240', '#403a32', '#4a4440', '#1e1e24', '#34302c'],
  accent: {
    lotus: ['#d8668c', '#c8587e', '#e8a4bc'], aodai: ['#c8c0c4', '#b8b4c4', '#b0b8c8'], child: ['#c85a7e', '#5a88b0', '#c89a30'],
    bag: ['#5a2e2c', '#2e2834', '#6e5238'], none: ['#3a3a40'], blouse: ['#a898b4', '#98a8bc', '#b8a0a4', '#a0aa90'], helmet: ['#2e2e38', '#5a2e2e', '#243c4a'],
  },
};
// the road runs x 3.4 .. 10.2 (Vietnam drives on the right: coming this way on the lake side, going away on the far side);
// bicycles keep to the edges, motorbikes to the middle, each lane at one speed so nobody runs into anybody
export const LANES = {
  // (the lanes coming this way keep ~1 m off the lake-side kerb: the camera arriving from behind the eye on the four-season
  // page passes over the pavement there, and nobody may come within 2.2 m of it)
  bikeToward: 4.45, motoToward: 5.85, motoAway: 8.1, bikeAway: 9.45,
  farAway: 11.62, farToward: 12.72,   // the far pavement (trees at x 10.55, the railing at 14.2)
  parapet: 0.62,     // standing at the parapet, looking out over the lake
  railing: 13.72,    // at the far railing, looking at Trúc Bạch
};

// core/crowd.js starts each figure's clock `phase * 11` seconds late AND moves it `phase * len` along its loop, so a figure
// sits at (speed * 11 + len) * phase. To space N figures of one lane evenly (len / N apart), the phase must undo that.
const WALK_V = (2 * 0.62) / 1.05;
const spaced = (i, n, len, v, jitter = 0) => ((i + jitter) / n) * len / (v * 11 + len);

// sitting on the parapet (the core's sitCouple / sitBank): the couples of Thanh Niên at sunset, legs hanging over the lake side
// (the cut-outs stand in the parapet's own plane, so the wall hides the hanging legs)
export const SITTERS = [[-11.2, 'sitCouple'], [-16.4, 'sitBank'], [-22.2, 'sitCouple'], [-28.6, 'sitCouple'], [-35.2, 'sitBank'], [-41.4, 'sitCouple'], [-48.2, 'sitBank'], [-55.4, 'sitCouple'], [-63, 'sitCouple'], [-72.4, 'sitBank'], [-82, 'sitCouple'], [-92.6, 'sitCouple'], [-104, 'sitBank']];
export const SIT_X = 0.05;

export function crowdList(seed = 20260618) {
  const R = rng(seed);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const dress = (o, acc) => ({ ...o, top: pick(PALETTE.top), legs: pick(PALETTE.legs), accent: pick(PALETTE.accent[acc]) });
  const L = [];
  // (nobody walks the lake-side pavement close by: that is the tea maker's corner, and a walker there would pass the lens)
  const walk = [['couple', 'aodai'], ['aoDai', 'aodai'], ['motherChild', 'child'], ['couple', 'bag']];
  // the far pavement, both ways, all at the same pace, evenly spaced
  for (let i = 0; i < 10; i++) {
    const [kind, ac] = walk[(i + 1) % walk.length];
    L.push(dress({ mode: 'walk', kind, x: LANES.farAway, z: 4, len: 126, dir: -1, phase: spaced(i, 10, 126, WALK_V, 0.4 * R()), scale: 0.95 + R() * 0.08, flip: R() < 0.5 }, ac));
    L.push(dress({ mode: 'walk', kind: walk[(i + 2) % walk.length][0], x: LANES.farToward, z: 4, len: 126, dir: 1, phase: spaced(i, 10, 126, WALK_V, 0.4 * R()), scale: 0.95 + R() * 0.08, flip: R() < 0.5 }, walk[(i + 2) % walk.length][1]));
  }
  // bicycles at the road's edges: lotus sellers with a basket of flowers, schoolgirls in white áo dài
  const NB = 8;
  for (let i = 0; i < NB; i++) {
    const girl = i % 3 === 1;
    const o = dress({ mode: 'ride', kind: 'bicycle', x: LANES.bikeAway, z: 4, len: 126, dir: -1, speed: 3.6, phase: spaced(i, NB, 126, 3.6, 0.3 * R()), scale: 1, flip: R() < 0.5 }, girl ? 'aodai' : 'lotus');
    if (girl) { o.top = '#c4bec0'; o.legs = '#b8b2b0'; }
    L.push(o);
  }
  for (let i = 0; i < 6; i++) {
    L.push(dress({ mode: 'ride', kind: 'bicycle', x: LANES.bikeToward, z: 4, len: 126, dir: 1, speed: 3.6, phase: spaced(i, 6, 126, 3.6, 0.3 * R()), scale: 1, flip: R() < 0.5 }, i % 2 ? 'lotus' : 'aodai'));
  }
  // step-throughs in the middle lanes, some with a passenger sitting side-saddle (riders in darker jackets: they pass
  // closest to the eye, in full sun, and must stay a quiet background)
  const NM = 7;
  const darkTops = ['#3e4450', '#4a5060', '#5a4a4a', '#2e3440', '#5a5a70', '#4a4038'];
  const moto = (o, acc) => ({ ...dress(o, acc), top: pick(darkTops), legs: pick(['#26262c', '#2a2a30', '#3a4050']) });
  for (let i = 0; i < NM; i++) {
    L.push(moto({ mode: 'ride', kind: i % 3 === 0 ? 'bikeTwo' : 'bikePlain', x: LANES.motoAway, z: 4, len: 126, dir: -1, speed: 7.2, phase: spaced(i, NM, 126, 7.2, 0.3 * R()), scale: 1, flip: R() < 0.5 }, i % 3 === 0 ? 'blouse' : 'helmet'));
    L.push(moto({ mode: 'ride', kind: i % 3 === 1 ? 'bikeTwo' : 'bikePlain', x: LANES.motoToward, z: 4, len: 126, dir: 1, speed: 7.2, phase: spaced(i, NM, 126, 7.2, 0.3 * R()), scale: 1, flip: R() < 0.5 }, i % 3 === 1 ? 'blouse' : 'helmet'));
  }
  // on the parapet: couples and people alone, sitting, facing the lake
  for (const [z, kind] of SITTERS) L.push(dress({ mode: 'stand', kind, x: SIT_X, z, phase: R(), scale: 0.96 + R() * 0.06, flip: true }, 'blouse'));
  // at the parapet, standing, facing the lake (a step away from the sitters)
  const stand = [['standBag', 'bag'], ['standPhot', 'none'], ['standBouquet', 'lotus'], ['standCoi', 'none']];
  let z = -19;
  for (let i = 0; i < 12; i++) {
    const [kind, ac] = stand[i % stand.length];
    for (let pass = 0; pass < 2; pass++) for (const [sz] of SITTERS) if (Math.abs(z - sz) < 1.2) z = sz - 1.2;
    L.push(dress({ mode: 'stand', kind, x: LANES.parapet, z, phase: R(), scale: 0.95 + R() * 0.08, flip: true }, ac));
    z -= 4.5 + R() * 5;
  }
  // at the far railing, looking over Trúc Bạch
  z = -20;
  for (let i = 0; i < 10; i++) {
    const [kind, ac] = stand[(i + 1) % stand.length];
    L.push(dress({ mode: 'stand', kind, x: LANES.railing, z, phase: R(), scale: 0.95 + R() * 0.08, flip: false }, ac));
    z -= 4 + R() * 5;
  }
  return L;
}
