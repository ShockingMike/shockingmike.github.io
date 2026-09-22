// Chớm world, season Hạ: dragonflies (chuồn chuồn) over the pond. Each one darts between a few hover points above the leaves,
// holds there with its wings a blur, turns, darts again; drawn on twos like the people (the pose and the place change together
// twelve times a second). Two drawings per dragonfly (wings up / wings down) alternate while it flies. They cast the sun's shadow.
import * as THREE from 'three';
import { V3, Batch, hero, withC, C } from '../../core/build.js';
import { rng } from '../../core/brush.js';

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (u) => u * u * (3 - 2 * u);

function drawing(b, up, { body, wing }) {
  // body along +x: head, thorax, a long thin tail
  b.sphere(0.006, V3(0.03, 0, 0), [1.1, 1, 1.1], body, 8);
  b.sphere(0.007, V3(0.016, 0, 0), [1.4, 1, 1], body, 8);
  b.rod(V3(0.008, 0, 0), V3(-0.055, 0.002, 0), 0.0028, body, 5, 0.0018);
  // four wings: long narrow blades; up = beat position
  for (const [x, s, l] of [[0.019, 1, 0.042], [0.019, -1, 0.042], [0.012, 1, 0.038], [0.012, -1, 0.038]]) {
    const g = new THREE.PlaneGeometry(l, 0.009, 2, 1).translate(l / 2, 0, 0);
    const m = new THREE.Matrix4().compose(V3(x, 0.004, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 + s * up, s * (Math.PI / 2 + (x < 0.015 ? 0.35 : -0.2)), 0, 'YXZ')), V3(1, 1, 1));
    b.add(g, wing, m);
  }
}

export function buildDragonflies(scene, { n = 5, zones, seed = 77 }) {
  const R = rng(seed);
  const flies = [];
  const body = withC(C.body, { col: '#1a2a3a', col2: '#4a8aa0', gloss: 0.8, hilite: 0.8, erode: 0, scale: 30 });
  const bodyR = withC(C.body, { col: '#5a1a1a', col2: '#d8603a', gloss: 0.7, hilite: 0.7, erode: 0, scale: 30 });
  // the wings catch the low sun: a warm glassy glint (they read against the dark pond water)
  // (a smoky mid-tone, so the four blades read as wings against the bright water too, with a warm glint where they catch the sun)
  const wing = { col: '#5a4a50', col2: '#e8cdb8', erode: 0.1, hilite: 0.7, gloss: 0.8, scale: 30, bump: 0.3, emit: 0.12 };
  for (let i = 0; i < n; i++) {
    const zone = zones[i % zones.length];
    const kinds = [body, bodyR];
    const frames = [0.35, -0.25].map((up) => { const b = new Batch(); drawing(b, up, { body: kinds[i % 2], wing }); const h = hero(b.merge(), { rims: false, tier: 0.03 }); h.scale.setScalar(1.7); scene.add(h); return h; });
    // hover points in the zone (above the leaves), visited in turn; the loop returns to the first
    const pts = [];
    for (let k = 0; k < 5; k++) pts.push(V3(zone.x[0] + R() * (zone.x[1] - zone.x[0]), zone.y[0] + R() * (zone.y[1] - zone.y[0]), zone.z[0] + R() * (zone.z[1] - zone.z[0])));
    const legs = pts.map((p, k) => ({ a: p, b: pts[(k + 1) % pts.length], hold: 1.2 + R() * 2.2, dart: 0.35 + R() * 0.3 }));
    const period = legs.reduce((s, l) => s + l.hold + l.dart, 0);
    flies.push({ frames, legs, period, off: R() * period, ph: R() });
  }
  const pos = new THREE.Vector3(), nxt = new THREE.Vector3();
  const at = (f, t, out) => {
    let tm = (((t + f.off) % f.period) + f.period) % f.period;
    for (const l of f.legs) {
      if (tm < l.hold) {
        // hovering: a small drift, the tail bobbing
        out.copy(l.a).add(V3(Math.sin(t * 2.3 + f.ph * 9) * 0.02, Math.sin(t * 3.1 + f.ph * 5) * 0.015, Math.cos(t * 1.9 + f.ph * 7) * 0.02));
        return { flying: false, heading: Math.atan2(-(l.b.z - l.a.z), l.b.x - l.a.x) * 0.3 + f.ph * 6 };
      }
      tm -= l.hold;
      if (tm < l.dart) {
        const u = ease(clamp01(tm / l.dart));
        out.copy(l.a).lerp(l.b, u);
        out.y += Math.sin(u * Math.PI) * 0.12;
        return { flying: true, heading: Math.atan2(-(l.b.z - l.a.z), l.b.x - l.a.x) };
      }
      tm -= l.dart;
    }
    out.copy(f.legs[0].a);
    return { flying: false, heading: 0 };
  };
  let hd = [];
  return {
    meshes: flies.flatMap((f) => f.frames),
    update(t) {
      const tq = Math.floor(t * 12) / 12;
      flies.forEach((f, i) => {
        const s = at(f, tq, pos);
        // the heading turns toward the next point before a dart (it never snaps round)
        hd[i] = hd[i] === undefined ? s.heading : hd[i] + Math.atan2(Math.sin(s.heading - hd[i]), Math.cos(s.heading - hd[i])) * 0.35;
        const beat = Math.floor(tq * 12) % 2;
        f.frames.forEach((m, k) => {
          m.visible = k === beat;
          m.position.copy(pos);
          m.rotation.set(0, hd[i], s.flying ? -0.08 : 0.05);
        });
      });
    },
    movers(t) {
      const tq = Math.floor(t * 12) / 12;
      return flies.map((f, i) => { at(f, tq, pos); return { x: pos.x, y: pos.y, z: pos.z, r: 0.05, h: 0.05, name: `dragonfly#${i}` }; });
    },
  };
}
