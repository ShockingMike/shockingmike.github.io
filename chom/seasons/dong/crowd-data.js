// Chớm world, season Đông: who is out on the riverside road on a cold evening (core/crowd.js draws, steps and shadows them).
// Early 2000s, dressed for the northeast wind: wool coats, quilted jackets, knit hats and scarves, sober colours.
// The road is quieter than the Old Quarter's lanes: a thin line of people on the river walk, a few bicycles and step-throughs
// riding away along the far side, and the life of the porches on the house side.
import { rng } from '../../core/brush.js';

const PALETTE = {
  top: ['#2a2e3e', '#3a3230', '#4a3a2e', '#2e3428', '#4a2a2a', '#343844', '#5a4a3a', '#26262c', '#3e3e44', '#4e4436', '#2c3440'],
  legs: ['#1c1c22', '#2a2c34', '#34302c', '#26282e', '#3a3632'],
  // scarves, knit hats, a long coat under a short one
  accent: ['#7a2a24', '#8a6a2a', '#8a8070', '#5a3a4a', '#6a2a2a', '#3a4a5a', '#9a4a30'],
  daisy: ['#b8b4aa', '#c4c0b4'],
};

// Lanes down on the sandbar (water's edge -6.6, path between -2.6 and 2.4, foot of the bank 8.0). Nobody crosses anybody:
//   the path      x = -1.0  people walking the worn path along the bar, one pace, evenly spaced
//   the water     x = -4.0   people stopped at the edge looking at the river (well past the stall, z < -12)
//   the beds      x =  5.9   someone standing among the vegetable beds further down the bar
//   pushing       x = -1.9   a bicycle walked along the bar (nobody rides on sand)
export const POLES = [-8, -24, -38, -52, -66, -80];        // none of them at z -17: that one stood in the sky the verse needs

function place(R) {
  const L = [];
  const pick = (a) => a[Math.floor(R() * a.length)];
  const dress = (o) => ({ ...o, top: pick(PALETTE.top), legs: pick(PALETTE.legs), accent: o.accent ?? pick(PALETTE.accent) });
  const walkers = ['walkCold', 'walkCold', 'couple', 'walkCold', 'motherChild', 'walkCold'];
  const N = 14;
  for (let i = 0; i < N; i++) L.push(dress({ mode: 'walk', kind: walkers[i % walkers.length], x: -0.9, z: -4, len: 84, dir: -1, phase: (i + 0.3 * R()) / N, scale: 0.95 + R() * 0.08, flip: R() < 0.5 }));
  // a few standing at the river wall further down, looking at the water
  for (let i = 0; i < 4; i++) {
    const z = -19 - i * 10.5 - R() * 2;            // down at the waterline, clear of the boats and the walking lane
    L.push(dress({ mode: 'stand', kind: 'standCold', x: -4.0, z, phase: R(), scale: 0.95 + R() * 0.06, flip: true }));
  }
  // the house side: people at the doorways, past the tea stall
  const standers = ['standCold', 'standCold', 'standScarf', 'standPhot'];
  for (let i = 0; i < 5; i++) {
    const z = -10 - i * 8.5 - R() * 2;
    if (z < -18 && z > -23) continue;                 // not in the night stall's place
    L.push(dress({ mode: 'stand', kind: pick(standers), x: 5.9, z, phase: R(), scale: 0.94 + R() * 0.08, flip: false }));
  }
  // riding away along the far side: step-throughs going slowly and a bicycle with white winter daisies
  // nobody rides on sand: bicycles are walked up and down the bar
  const NR = 3;
  const rideKinds = ['pushBike', 'pushBikeB', 'pushBike'];
  for (let i = 0; i < NR; i++) L.push(dress({ mode: 'walk', kind: rideKinds[i], x: -1.9, z: -4, len: 86, dir: -1, phase: (i + 0.2 * R()) / NR, scale: 1, flip: R() < 0.5, accent: pick(PALETTE.daisy) }));
  return L;
}

// the life under the eaves: one person to a porch, well spread out (the riverside is quieter than the Old Quarter)
// spots: the porch places from lowRow; taken: the places the porch things already use
export function porchPeople(spots, taken = [], seed = 9) {
  const R = rng(seed);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const out = [];
  const kinds = ['sitTea', 'sitPipe', 'standCold', 'sitTea'];
  let k = 0;
  for (const sp of spots) {
    if (out.length >= 5) break;
    if (R() < 0.62) continue;
    if (taken.some((q) => Math.hypot(q.at.x - sp.at.x, q.at.z - sp.at.z) < 1.9)) continue;
    if (out.some((q) => Math.abs(q.z - sp.at.z) < 6)) continue;
    const kind = kinds[k++ % kinds.length];
    out.push({ mode: 'stand', kind, x: sp.at.x, z: sp.at.z, phase: R(), scale: 0.95 + R() * 0.06, flip: true, top: pick(PALETTE.top), legs: pick(PALETTE.legs), accent: pick(PALETTE.accent) });
  }
  return out;
}

export function crowdList(seed = 20261215) {
  return place(rng(seed));
}
