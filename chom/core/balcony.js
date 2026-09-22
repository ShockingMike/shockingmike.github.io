// Chớm world, core: balcony life. People and things on the balconies, from data (see core/README.md, "Balcony life").
//
//   balconyLife(balconies, spec) -> { batch, people, smoke, embers, report }
//     balconies  from core.houseRow(..., { balconies: [] }): { at, along, out, w, y, name } (world space)
//     spec = {
//       seed, zRange: [near z, far z]      which balconies may get life (keep it to what the camera sees)
//       share: 0.6                          how many of those balconies get things
//       people: [{ kind, top, legs, accent, smoke }]   one entry per person (kinds: balLean, balLaundry, balWater, balChild, balLantern)
//       things: ['laundry', 'pots', 'cage', 'lantern', 'stool', 'bucket', 'bicycle', 'couplet', 'litWindow']   what may appear
//       colors: { cloth: [...], pot: [...], plastic: [...], plastic2, lantern: [...], couplet: [...] }   (the season's; defaults: Xuân)
//         plastic2: the second (light) paint of stools and buckets: a colour, a list to pick from, or 'tint' (the thing's own
//         colour, a step lighter). Default: pale pink on stools, pale blue on buckets
//       haze: 0.12                          one tier back in the air (balcony life is background)
//     }
//   batch   a knife Batch (with wind): core.balconyLife adds it to the scene and to the shadow casters
//   people  entries for core.crowd (standing on the balcony floor, y > 0)
//   smoke   sources for core.fx.smoke (one thin thread per smoker's cigarette)
//   report  depth checks: every thing and person stays between the wall and the rail
//
// Local frame of a balcony: u along the balcony (metres from its middle), h above its floor, d out from the wall (the rail is at 0.78).
import * as THREE from 'three';
import { Batch, mat } from './build.js';
import { rng } from './brush.js';
import { U } from './paint.js';

const RAIL_D = 0.78, WALL_D = 0.0;
const DEFAULT_COLORS = {
  cloth: ['#e8e0d0', '#6a84a8', '#8a5a48', '#b84a42', '#d8c080', '#5a6a58'],
  pot: ['#8a5a44', '#a86a4c', '#6a6a70'],
  plant: ['#3e6a44', '#4e7a4c'],
  bloom: ['#e08aa2', '#e8b040', '#f0e0d8'],
  plastic: ['#b83a36', '#3a6a9a', '#3a8a6a'],
  lantern: ['#c21c16'],
  couplet: ['#b82a22'],
};

export function balconyLife(balconies, spec = {}) {
  const R = rng(spec.seed ?? 7);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const C = { ...DEFAULT_COLORS, ...(spec.colors || {}) };
  // the light second paint of plastic things (only picks from the random stream when the season gives a list)
  const plastic2 = (col, dflt) => {
    const p2 = C.plastic2;
    if (p2 === undefined || p2 === null) return dflt;
    if (p2 === 'tint') return '#' + new THREE.Color(col).lerp(new THREE.Color('#ffffff'), 0.3).getHexString();
    return Array.isArray(p2) ? pick(p2) : p2;
  };
  const haze = spec.haze ?? 0.12;
  const [zNear, zFar] = spec.zRange ?? [-4, -60];
  const things = spec.things ?? ['laundry', 'pots', 'cage', 'lantern', 'stool', 'bucket', 'bicycle', 'couplet'];
  const share = spec.share ?? 0.6;
  const batch = new Batch({ kind: 'knife', wind: true });
  const people = [], smoke = [], embers = [], report = [];
  const pool = balconies.filter((b) => b.at.z <= zNear && b.at.z >= zFar);
  // how well the eye sees a balcony: spec.view(b) -> 0..1 (the season knows its camera); people go to the best-seen ones
  const seen = spec.view || (() => 1);
  // a world point on a balcony
  const P = (b, u, h, d) => b.at.clone().addScaledVector(b.along, u).add(new THREE.Vector3(0, h, 0)).addScaledVector(b.out, d - 0.4);
  // a rotation that lines a shape's local x up with the balcony and its local z with "out"
  const rotOf = (b) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(b.along, new THREE.Vector3(0, 1, 0), b.out));
  const put = (b, geo, opts, u, h, d, sway = 0, scl = [1, 1, 1]) => {
    const m = new THREE.Matrix4().compose(P(b, u, h, d), rotOf(b), new THREE.Vector3(...scl));
    batch.add(geo, { scale: 1.6, seed: R(), haze, ...opts }, m, sway, 5);
  };
  const check = (b, name, dMin, dMax, uMin, uMax) => {
    if (dMin < WALL_D + 0.02 || dMax > RAIL_D - 0.04 || uMin < -b.w / 2 - 0.02 || uMax > b.w / 2 + 0.02) report.push({ balcony: b.name, name, dMin, dMax, uMin, uMax });
  };

  const used = new Set();
  // people first: one person per balcony, spread out
  const order = pool.map((b) => [b, seen(b) + R() * 0.05]).filter((e) => e[1] > 0.02).sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  (spec.people || []).forEach((pp, i) => {
    const b = order[i];
    if (!b) return;
    used.add(b);
    const u = (R() - 0.5) * Math.max(0, b.w - 1.2);
    // as close to the rail as the flat figure allows (it faces the street, so its width runs partly toward the rail)
    const r = U.uRefRight.value;
    const across = 0.3 * Math.abs(new THREE.Vector3(r.x, 0, r.z).normalize().dot(b.out));
    const d = Math.min(0.56, RAIL_D - 0.06 - across);
    check(b, pp.kind, d - across, d + across, u - 0.25, u + 0.25);
    const at = P(b, u, 0, d);
    people.push({ mode: 0, kind: pp.kind, x: at.x, y: b.y, z: at.z, phase: R(), scale: 1, top: pp.top, legs: pp.legs ?? pp.top, accent: pp.accent, flip: R() < 0.5 });
    if (pp.smoke) {
      const hand = P(b, u + 0.2, 1.08, d + 0.12);
      smoke.push({ at: [hand.x, hand.y, hand.z], life: 3.2, rise: 0.28, spread: 0.12, size: 0.05, drift: [0.12, 0.02], color: '#e8e4e0', opacity: 0.35 });
      embers.push(hand);
    }
    // a person on a balcony often has a pot or two beside them
    if (things.includes('pots') && R() < 0.6) pots(b, u + (u > 0 ? -0.6 : 0.6), u > 0 ? -1 : 1);
  });

  // pots stand on the top of the rail (the rail's flat top is 0.9 m up), where the street sees them
  function pots(b, u0, dir = 1) {
    const n = 1 + Math.floor(R() * 2);
    for (let k = 0; k < n; k++) {
      const u = u0 + dir * k * 0.3, r = 0.07 + R() * 0.03, hh = 0.13 + R() * 0.06;
      if (Math.abs(u) > b.w / 2 - 0.15) continue;
      const d = RAIL_D - 0.02, h0 = 0.93;
      put(b, new THREE.BoxGeometry(0.34, 0.03, 0.14), { col: '#4a3a30', col2: '#7a6050' }, u, h0 - 0.015, d);
      put(b, new THREE.CylinderGeometry(r, r * 0.75, hh, 12), { col: pick(C.pot), col2: '#c89070' }, u, h0 + hh / 2, d);
      put(b, new THREE.IcosahedronGeometry(r * 1.4, 1), { col: pick(C.plant), col2: '#8ab070' }, u, h0 + hh + r * 0.9, d, 0.05, [1, 0.9, 1]);
      if (R() < 0.6) put(b, new THREE.SphereGeometry(r * 0.55, 8, 6), { col: pick(C.bloom), col2: '#fff0f0', emit: 0.04 }, u + r * 0.3, h0 + hh + r * 1.7, d, 0.05);
    }
    return;
  }
  function laundry(b) {
    const half = b.w / 2 - 0.1, hy = 2.05, d = RAIL_D + 0.22;
    // two brackets from the wall hold the line out in front of the rail
    for (const e of [-half, half]) put(b, new THREE.BoxGeometry(0.025, 0.025, d + 0.05), { col: '#3a3a40', col2: '#6a6a70' }, e, hy, d / 2);
    put(b, new THREE.BoxGeometry(half * 2, 0.012, 0.012), { col: '#3a3a40', col2: '#6a6a70' }, 0, hy, d);
    let u = -half + 0.1;
    while (u < half - 0.35) {
      const cw = 0.32 + R() * 0.3, ch = 0.4 + R() * 0.3;
      const g = new THREE.PlaneGeometry(cw, ch, 3, 4).translate(0, -ch / 2, 0);
      const top = P(b, 0, hy, d).y;
      put(b, g, { col: pick(C.cloth), col2: '#f4efe6', scale: 2.2 }, u + cw / 2, hy, d, (x, y) => Math.max(0, top - y) * 0.7);
      u += cw + 0.08 + R() * 0.2;
    }
  }
  function cage(b) {
    const u = (R() - 0.5) * (b.w - 1.0), d = 0.55;
    check(b, 'bird cage', d - 0.16, d + 0.16, u - 0.16, u + 0.16);
    put(b, new THREE.BoxGeometry(0.03, 0.03, d + 0.05), { col: '#3a3030', col2: '#5a4a40' }, u, 2.55, d / 2);
    put(b, new THREE.BoxGeometry(0.008, 0.4, 0.008), { col: '#3a3030', col2: '#5a4a40' }, u, 2.35, d, 0.1);
    put(b, new THREE.CylinderGeometry(0.14, 0.14, 0.3, 14, 1, true), { col: '#4a3a2a', col2: '#a88858' }, u, 1.95, d, 0.15);
    put(b, new THREE.SphereGeometry(0.14, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), { col: '#4a3a2a', col2: '#a88858' }, u, 2.1, d, 0.15);
    put(b, new THREE.CylinderGeometry(0.15, 0.15, 0.03, 14), { col: '#3a2a20', col2: '#7a5a3a' }, u, 1.8, d, 0.15);
  }
  function lantern(b) {
    const u = (R() - 0.5) * (b.w - 0.8), d = 0.58;
    check(b, 'lantern', d - 0.13, d + 0.13, u - 0.13, u + 0.13);
    put(b, new THREE.BoxGeometry(0.03, 0.03, d + 0.05), { col: '#4a3a20', col2: '#7a6040' }, u, 2.43, d / 2);
    put(b, new THREE.BoxGeometry(0.01, 0.25, 0.01), { col: '#6a4a20', col2: '#a88040' }, u, 2.3, d, 0.15);
    put(b, new THREE.SphereGeometry(0.13, 12, 8), { col: pick(C.lantern), col2: '#ff5c3c', emit: 0.08 }, u, 2.05, d, 0.2, [1, 0.85, 1]);
    put(b, new THREE.BoxGeometry(0.03, 0.16, 0.03), { col: pick(C.lantern), col2: '#ff6a4a' }, u, 1.85, d, 0.3);
  }
  function stool(b, u) {
    const d = 0.3;
    check(b, 'stool', d - 0.14, d + 0.14, u - 0.14, u + 0.14);
    const col = pick(C.plastic);
    put(b, new THREE.BoxGeometry(0.28, 0.24, 0.28), { col, col2: plastic2(col, '#f0a090') }, u, 0.12, d);
  }
  function bucket(b, u) {
    const d = 0.28;
    check(b, 'bucket', d - 0.13, d + 0.13, u - 0.13, u + 0.13);
    const col = pick(C.plastic);
    put(b, new THREE.CylinderGeometry(0.13, 0.1, 0.26, 12), { col, col2: plastic2(col, '#a0c0e0') }, u, 0.13, d);
  }
  function bicycle(b) {
    if (b.w < 2.0) return;
    const d = 0.18, u = (R() - 0.5) * (b.w - 1.9);
    check(b, 'bicycle', d - 0.05, d + 0.05, u - 0.62, u + 0.62);
    for (const du of [-0.42, 0.42]) put(b, new THREE.TorusGeometry(0.3, 0.018, 6, 20), { col: '#26262a', col2: '#5a5a60' }, u + du, 0.32, d);
    put(b, new THREE.BoxGeometry(0.84, 0.03, 0.03), { col: '#3a4a5a', col2: '#7a8a9a' }, u, 0.52, d);
    put(b, new THREE.BoxGeometry(0.03, 0.4, 0.03), { col: '#3a4a5a', col2: '#7a8a9a' }, u - 0.15, 0.5, d);
    put(b, new THREE.BoxGeometry(0.25, 0.05, 0.08), { col: '#2a2426', col2: '#5a4a44' }, u - 0.15, 0.72, d);
  }
  function couplet(b) {
    const d = 0.02;
    for (const u of [-b.w / 2 + 0.12, b.w / 2 - 0.12]) {
      put(b, new THREE.BoxGeometry(0.18, 1.3, 0.02), { col: pick(C.couplet), col2: '#e0503a' }, u, 1.1, d + 0.03);
    }
  }
  // things never share room: floor things take one of two slots (a bicycle takes both); hanging things hang above head height;
  // a balcony with a person only gets couplets on the wall
  // a lit window at the back of the balcony, a curtain half drawn (evening seasons)
  function litWindow(b) {
    const u = (R() - 0.5) * Math.max(0, b.w - 1.6), d = 0.03;
    put(b, new THREE.BoxGeometry(0.9, 1.3, 0.02), { col: pick(C.window ?? ['#e8a860']), col2: '#ffe0a0', emit: 0.55 }, u, 1.25, d);
    put(b, new THREE.BoxGeometry(0.36, 1.34, 0.02), { col: pick(C.curtain ?? ['#8a4a3a', '#5a6a8a', '#b89a6a']), col2: '#e8d0b0', emit: 0.12 }, u - 0.3, 1.25, d + 0.015);
    put(b, new THREE.BoxGeometry(0.2, 1.34, 0.02), { col: pick(C.curtain ?? ['#8a4a3a', '#5a6a8a', '#b89a6a']), col2: '#e8d0b0', emit: 0.12 }, u + 0.37, 1.25, d + 0.015);
  }
  const makers = { laundry, cage, lantern, couplet, litWindow };
  const floor = { stool, bucket, pots };
  for (const b of pool) {
    const busy = used.has(b);
    if (!busy && R() > share) continue;
    if (busy) { if (things.includes('couplet') && R() < 0.5) couplet(b); if (things.includes('litWindow') && R() < 0.5) litWindow(b); continue; }
    const bag = things.slice().sort(() => R() - 0.5).slice(0, 1 + Math.floor(R() * 2));
    const slots = [-b.w / 4, b.w / 4];
    for (const t of bag) {
      if (t === 'bicycle') { if (slots.length === 2) { slots.length = 0; bicycle(b); } continue; }
      if (floor[t]) { const u = slots.shift(); if (u !== undefined) floor[t](b, u); continue; }
      makers[t]?.(b);
    }
  }
  return { batch, people, smoke, embers, report, count: { balconies: pool.length, people: people.length } };
}
