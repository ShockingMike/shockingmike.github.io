// Chớm world, season Xuân (Hàng Lược before Tết): the pieces only this season has.
//   buildStall (the flower stall: peach buckets, kumquat trees with lì xì, chrysanthemums, the crate and lacquer box,
//   bamboo frame, the lamp and bulbs), lanternStrings (red lanterns across the street), tetBanner ("CHÚC MỪNG NĂM MỚI").
import * as THREE from 'three';
import { U } from '../../core/paint.js';
import { V3, Batch, heroOf, mat, C, withC, peachBranch, bucket, TIER2 } from '../../core/build.js';

// ---------------------------------------------------------------- the stall, laid along the pavement so it runs into the depth
// layout: world units, street along -z, the stall between the kerb (x = 1.1) and the shop fronts (x = 5.2)
export function buildStall(scene, R, { lampAt }) {
  const out = { heroes: [], sketchTargets: [], bulbs: [], shadows: [] };
  const add = (obj, sk) => { scene.add(obj); out.heroes.push(obj); if (sk) out.sketchTargets.push([obj, sk]); return obj; };
  const quietSketch = null; // D: loose white lines only around the main things

  const peachBucket = (x, z, h, seed, n = 3) => {
    const bb = new Batch();
    bucket(bb, V3(0, 0, 0), 0.17, 0.46);
    const body = heroOf(bb, { rims: false, tier: TIER2 });
    body.position.set(x, 0, z);
    add(body);
    const fb = new Batch({ wind: true });
    const sw = (px, py) => Math.max(0, py - 0.4) * 0.35;
    for (let k = 0; k < n; k++) peachBranch(fb, V3((R() - 0.5) * 0.12, 0.35, (R() - 0.5) * 0.12), V3((k - 1) * 0.35 + (R() - 0.5) * 0.2, 1, (R() - 0.5) * 0.3), h * (0.8 + 0.25 * R()), R, { twigs: 6, bloom: 60, petal: 0.045, sway: sw, tree: 1, quiet: true });
    const fl = heroOf(fb, { wind: true, rims: false, tier: TIER2 });
    fl.position.set(x, 0, z);
    add(fl);
    out.shadows.push([x, z, 0.3, 0.22, h + 0.3]);
  };
  const flowerBucket = (x, z, kind, seed) => {
    const bb = new Batch();
    bucket(bb, V3(0, 0, 0), 0.14, 0.34);
    const bk = heroOf(bb, { rims: false, tier: TIER2 });
    bk.position.set(x, 0, z);
    add(bk);
    const fb = new Batch({ wind: true });
    const sw = (px, py) => Math.max(0, py - 0.3) * 0.3;
    for (let k = 0; k < 10; k++) {
      const top = V3((R() - 0.5) * 0.36, 0.55 + R() * 0.22, (R() - 0.5) * 0.3);
      fb.rod(V3(0, 0.25, 0), top, 0.006, C.stem, 5, 0.006, sw, 1);
      fb.blob(0.055 + R() * 0.02, top, [1, 0.72, 1], kind === 'w' ? C.mumW : C.mum, R() * 6, 2, 0.3, sw, 1);
    }
    const f = heroOf(fb, { wind: true, rims: false, tier: TIER2 });
    f.position.set(x, 0, z);
    add(f);
    out.shadows.push([x, z, 0.24, 0.17, 0.8]);
  };
  const kumquat = (x, z, size, seed) => {
    const pb = new Batch();
    pb.lathe([[0, 0], [0.2 * size, 0], [0.3 * size, 0.12 * size], [0.32 * size, 0.36 * size], [0.28 * size, 0.46 * size], [0.3 * size, 0.5 * size], [0.26 * size, 0.5 * size], [0.24 * size, 0.47 * size], [0, 0.47 * size]], V3(0, 0, 0), C.pot, 40);
    const pot = heroOf(pb, { rims: false, tier: TIER2 });
    pot.position.set(x, 0, z);
    add(pot);
    const tb = new Batch({ wind: true });
    const sw = (px, py) => Math.max(0, py - 0.6) * 0.25;
    tb.rod(V3(0, 0.45 * size, 0), V3(0.02, 0.8 * size, 0), 0.025 * size, C.bark, 6, 0.035 * size, sw, 2);
    const cy = 1.05 * size, rr = 0.42 * size;
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * 6.28 + R();
      tb.blob(rr * (0.55 + 0.2 * R()), V3(Math.cos(a) * rr * 0.45, cy + (R() - 0.3) * rr * 0.6, Math.sin(a) * rr * 0.45), [1, 0.8, 1], C.leaf, R() * 6, 2, 0.28, sw, 2);
    }
    for (let k = 0; k < 95; k++) {
      const u = R() * 6.28, v = Math.acos(2 * R() - 1);
      const n = V3(Math.sin(v) * Math.cos(u), Math.cos(v) * 0.8, Math.sin(v) * Math.sin(u));
      tb.sphere(0.034 * size, V3(0, cy, 0).addScaledVector(n, rr * 1.1), [1, 0.9, 1], C.kumquat, 12, [0, 0, 0], sw, 2);
    }
    // lì xì: red envelopes hung on the branches, a gold mark on each, turned toward the street
    for (let k = 0; k < 5; k++) {
      const a = -1.9 + k * 0.62 + (R() - 0.5) * 0.3;
      const ep = V3(Math.cos(a) * rr * 0.98, cy - rr * (0.1 + 0.45 * R()), Math.sin(a) * rr * 0.98);
      const rot = [0, -a + Math.PI / 2 + (R() - 0.5) * 0.4, (R() - 0.5) * 0.25];
      tb.box(0.075 * size, 0.13 * size, 0.006, ep, C.lixi, rot, sw, 2);
      tb.add(new THREE.CircleGeometry(0.02 * size, 10).translate(0, 0.012 * size, 0.0045), C.gold, mat(ep, rot), sw, 2);
      tb.rod(ep.clone().add(V3(0, 0.065 * size, 0)), ep.clone().add(V3(0, 0.14 * size, 0)), 0.0025, C.gold, 4, 0.0025, sw, 2);
    }
    const tree = heroOf(tb, { wind: true, rims: false, tier: TIER2 * 1.2 });
    tree.position.set(x, 0, z);
    add(tree);
    out.shadows.push([x, z, 0.45 * size, 0.32 * size, 1.45 * size]);
  };

  // near the kerb, behind the bottle: tall peach
  peachBucket(1.45, -3.85, 1.7, 11);
  peachBucket(1.5, -4.75, 1.45, 12);
  peachBucket(1.9, -5.6, 1.6, 13, 2);
  // by the shop front: kumquat trees, a bucket of pale chrysanthemums
  kumquat(3.95, -5.35, 1.15, 51);
  kumquat(3.55, -2.55, 1.2, 61);
  kumquat(2.6, -7.1, 1.0, 71);
  flowerBucket(4.2, -3.7, 'y', 81);
  flowerBucket(2.35, -2.75, 'w', 91);
  // the next seller's buckets, beyond the side street
  for (let k = 0; k < 7; k++) {
    const z = -11 - k * 1.6 - R() * 0.4;
    if (k % 3 === 1) kumquat(3.0 + R() * 0.8, z, 0.95 + R() * 0.2, 100 + k);
    else peachBucket(1.5 + R() * 1.4, z, 1.3 + R() * 0.5, 120 + k, 2);
  }

  // ------------------------------------------------------------ bó lá dong, stood on end behind the bottle's crate
  // WHY THIS IS HERE, AND WHY IT IS THIS DARK AND THIS PLAIN (21/9, measured on both frames):
  // The bottle's own box was scoring 36.6 with the glass in the scene and 36.4 with it taken out - the glass was worth
  // nothing where it stood, because what it stood in front of was a strip of sunlit pavement with the bamboo pole's hard
  // shadow cutting across it. The empty spot alone scored 34.1; Đông's empty spot, the one Mike says works, scores 19.4.
  // Probed first with a plain card in the live scene: 0.5-0.6 m of dark, still ground 0.45 m behind the glass took the
  // empty spot from 36.8 to 17-21 and own share from 1% to 32%. This is that ground, built as the thing it would really
  // be: in the days before Tết every seller on Hàng Lược has bundles of lá dong stood on end for bánh chưng, and lá dong
  // is this season's top note. Nothing here is lit, brightened or added to the frame - the stall is exactly as lit as
  // before (seasons/ha/season.js: darken the surface it stands against, never the bottle, never the lights).
  // QUIET, NOT JUST DARK: no rim light, few large strokes (scale 1.8), erode almost off, one tie each. A dark ground
  // that is busy swallows the glass just as well as a bright one.
  // (These draw from the season's R, so everything built after buildStall gets a different draw than it did: in practice
  // that is only the two peach branches at the lens in layer 0, which are the same shapes from the same distribution.
  // Everything in this file that uses R - the buckets, the kumquats, the next seller's row - is built above this line.)
  const DONG = { col: '#0c150e', col2: '#26381f', erode: 0.1, hilite: 0.1, gloss: 0.08, scale: 1.8, vert: 1, bump: 0.6 };
  const DONG_TIE = { col: '#463c26', col2: '#7e7048', erode: 0.1, hilite: 0.18, scale: 3, vert: 1, bump: 0.5 };
  const dongBundle = (x, z, h, w, d, ry, lean) => {
    const db = new Batch();
    // a sheaf, not a board: narrow where it is tied at the stalks, opening out toward the leaf ends
    db.rbox(w * 0.78, h * 0.62, d * 0.84, 0.035, V3(0, h * 0.31, 0), DONG, [lean, ry, 0]);
    db.rbox(w, h * 0.5, d, 0.05, V3(w * 0.04, h * 0.72, 0), DONG, [lean, ry + 0.12, 0.02]);
    // the leaf ends standing proud of the tie: broad blades, soft-tipped (lá dong is an ovate leaf, not a spike)
    for (let k = 0; k < 7; k++) {
      const u = (k / 6 - 0.5);
      db.blob(w * (0.26 + 0.05 * R()), V3(u * w * 0.8, h * (0.9 + 0.07 * R()), (R() - 0.5) * d * 0.55), [0.62, 0.92 + 0.22 * R(), 0.4], DONG, R() * 6, 2, 0.24);
    }
    // one lạt tie round the stalks (a split bamboo strip), kept narrow: a bright band here is a line across the glass
    db.box(w * 0.84, 0.011, d * 0.9, V3(0, h * 0.3, 0), DONG_TIE, [lean, ry, 0]);
    const g = heroOf(db, { rims: false, tier: TIER2 });
    g.position.set(x, 0, z);
    add(g);
    // shadows are also what season.js turns into solids for the clipping check, so the footprint here is the real one
    out.shadows.push([x, z, w * 0.55, d * 0.6, h]);
  };
  // Where: the card that measured best stood 0.45 m behind the glass, its middle at about (1.05, -3.65). These two clear
  // the crate (which reaches z -3.446) by 6 cm and the near peach bucket at (1.45, -3.85) by 13 cm; its branches only
  // come back over x 1.24 at this height. Read those numbers back if either of them moves.
  // 0.82 m is all the height the job needs: the eye at 1.42 m looking over the glass's shoulder (0.887 m, 3.3 m away)
  // passes y 0.814 at the bundles' distance. Taller than that only takes more street away.
  dongBundle(0.82, -3.60, 0.83, 0.30, 0.16, 0.18, 0.05);
  dongBundle(1.06, -3.63, 0.89, 0.28, 0.15, -0.22, -0.04);

  // the bottle's stand: an old wooden crate with a lacquer box on it, a roll of kraft paper and string
  const cb = new Batch();
  cb.rbox(0.5, 0.42, 0.36, 0.015, V3(0, 0.21, 0), C.wood);
  cb.rbox(0.46, 0.14, 0.34, 0.015, V3(0.01, 0.49, 0), C.wood, [0, 0.06, 0]);
  for (const y of [0.1, 0.24, 0.36, 0.48]) cb.box(0.505, 0.012, 0.365, V3(0, y, 0), withC(C.wood, { col: '#2a1c16', col2: '#5a4032' }));
  // the lacquer box the bottle stands on. (21/9, ×3) Made matte and a step darker: the stall lamp hangs straight over
  // it, and C.lacquer's gloss 0.8 / hilite 0.8 turned its top into a lit rose band running right under the glass's
  // foot - the surface the bottle stands on, the one lever this project has seen work every time. Kept when the rest
  // of the ×3 work on this stall was taken out (see the note at the top of season.js): it adds nothing to the picture.
  cb.rbox(0.36, 0.18, 0.28, 0.02, V3(0.02, 0.65, 0), withC(C.lacquer, { col: '#1c0a0a', col2: '#4e1e18', gloss: 0.25, hilite: 0.2, scale: 2 }), [0, 0.12, 0]);
  cb.cyl(0.05, 0.05, 0.42, V3(-0.16, 0.6, 0.08), withC(C.paper, { vert: 0 }), 16, [0, 0, Math.PI / 2 + 0.1]);
  cb.add(new THREE.TorusGeometry(0.035, 0.012, 8, 20), withC(C.redPlastic, { col: '#6a2020', col2: '#b85040' }), mat(V3(0.19, 0.58, 0.1), [Math.PI / 2, 0, 0]));
  const crate = heroOf(cb, { rims: false, tier: 0.05 });
  crate.name = 'xuan-crate';   // named for seasons/xuan/keepout.mjs; no R() here, so nothing built after it moves
  crate.position.set(0.95, 0, -3.2);
  crate.rotation.y = -0.3;
  add(crate);
  out.shadows.push([0.95, -3.18, 0.3, 0.26, 1.15]);
  out.shadows.push([0.72, -4.65, 0.05, 0.05, 2.4]);

  // the stall frame: bamboo poles at the kerb, a bamboo rail, bulbs on a wire
  const bf = new Batch();
  const railY = 2.25;
  // F: the near pole stands a little further back, in the shade of the narrow house across the street, so it stays quiet
  const poleA = V3(0.72, 0, -4.65), poleB = V3(1.15, 0, -8.6);
  for (const p of [poleA, poleB]) bf.cyl(0.035, 0.04, railY + 0.15, V3(p.x, (p.y + railY + 0.15) / 2, p.z), C.bamboo, 10);
  for (const p of [poleA, poleB]) for (const dy of [0.5, 1.2, 1.9]) bf.add(new THREE.TorusGeometry(0.041, 0.006, 5, 14), C.bamboo, mat(V3(p.x, dy, p.z), [Math.PI / 2, 0, 0]));
  // a short bamboo arm lashed to the pole, reaching over the bottle
  const L = lampAt;
  const armEnd = V3(L.x + 0.02, railY - 0.08, L.z - 0.05);
  bf.rod(V3(poleA.x, railY - 0.02, poleA.z), armEnd, 0.022, C.bamboo, 8);
  bf.rod(V3(poleA.x, railY - 0.02, poleA.z), V3(poleB.x, railY + 0.05, poleB.z), 0.028, C.bamboo, 8);
  // the lamp: a cord, a tin shade, a bare bulb
  bf.rod(armEnd, V3(L.x, L.y + 0.16, L.z), 0.004, C.tyre, 5);
  bf.lathe([[0.012, 0.16], [0.03, 0.15], [0.07, 0.1], [0.135, 0.02], [0.14, 0.0], [0.13, 0.0], [0.065, 0.085], [0.025, 0.14], [0.01, 0.14]], V3(L.x, L.y, L.z), withC(C.steel, { col: '#2a3432', col2: '#8aa09a', gloss: 0.6, erode: 0.2 }), 28);
  // the bulb itself is small and hot, not a big white ball: it lights the bottle through core.light(0), which is unchanged,
  // so the stall is lit exactly as before while the lamp stops being the biggest bright patch in a tall phone frame
  bf.sphere(0.018, V3(L.x, L.y + 0.01, L.z), [1, 1.15, 1], withC(C.kumquat, { col: '#ffc070', col2: '#fff4d8', emit: 1.9, hilite: 0, erode: 0 }), 16);
  // a string of bulbs along the rail, into the depth
  const wp = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14; wp.push(V3(0.75 + 0.45 * Math.min(1, t * 3), railY - 0.05 - Math.sin(t * Math.PI * 2) ** 2 * 0.12, -4.4 - t * 10)); }
  bf.tube(wp, 0.005, C.tyre, 40, 5);
  const curve = new THREE.CatmullRomCurve3(wp);
  for (const t of [0.14, 0.34, 0.58, 0.82]) {
    const p = curve.getPoint(t);
    const bp = p.clone().add(V3(0, -0.1, 0));
    bf.sphere(0.03, bp, [1, 1.2, 1], withC(C.kumquat, { col: '#ffb040', col2: '#fff0c0', emit: 1.2, hilite: 0, erode: 0 }), 12);
    out.bulbs.push(bp);
  }
  const frame = heroOf(bf, { rims: false, tier: 0.04 });
  scene.add(frame);
  out.frame = frame;
  return out;
}

// ---------------------------------------------------------------- red lanterns strung across the street (background tier: they sink into the air with distance)
export function lanternStrings(R, { xA = -4.9, xB = 5.1, zs = [-13, -21, -30, -41, -55], y = 5.7, haze = 0.08 } = {}) {
  const kb = new Batch({ kind: 'knife', wind: true });
  const wires = [];
  zs.forEach((z0, i) => {
    const a = V3(xA, y + 0.3 + R() * 0.4, z0 + (R() - 0.5) * 0.6), b = V3(xB, y + R() * 0.4, z0 - 1.2 + (R() - 0.5) * 0.6);
    const sag = 0.55 + R() * 0.2;
    const at = (t) => a.clone().lerp(b, t).add(V3(0, -Math.sin(t * Math.PI) * sag, 0));
    const pts = [];
    for (let k = 0; k <= 24; k++) pts.push(at(k / 24));
    wires.push({ pts, width: 1.0, alpha: 0.75 });
    const hz = haze + i * 0.04;
    const n = 8;
    for (let k = 1; k < n; k++) {
      const p = at(k / n + (R() - 0.5) * 0.03);
      const sw = (x, yy) => Math.max(0, p.y - yy) * 0.7;
      const drop = 0.1 + R() * 0.08;
      const c = p.clone().add(V3(0, -drop, 0));
      kb.box(0.012, drop, 0.012, p.clone().add(V3(0, -drop / 2, 0)), { col: '#6a4a20', col2: '#a88040', scale: 3, seed: R(), haze: hz }, undefined, sw, 5);
      kb.add(new THREE.CylinderGeometry(0.075, 0.1, 0.05, 12), { col: '#b8862a', col2: '#f4cc64', scale: 3, seed: R(), haze: hz }, mat(c.clone().add(V3(0, -0.02, 0))), sw, 5);
      kb.add(new THREE.SphereGeometry(0.21, 14, 10), { col: '#c21c16', col2: '#ff5c3c', emit: 0.1, scale: 2, seed: R(), haze: hz }, mat(c.clone().add(V3(0, -0.2, 0)), [0, 0, 0], [1, 0.84, 1]), sw, 5);
      kb.add(new THREE.CylinderGeometry(0.1, 0.075, 0.05, 12), { col: '#b8862a', col2: '#f4cc64', scale: 3, seed: R(), haze: hz }, mat(c.clone().add(V3(0, -0.38, 0))), sw, 5);
      kb.box(0.035, 0.24, 0.035, c.clone().add(V3(0, -0.52, 0)), { col: '#c21c16', col2: '#ff6a4a', scale: 3, seed: R(), haze: hz }, undefined, sw, 5);
    }
  });
  return { batch: kb, wires };
}

// ---------------------------------------------------------------- the banner across the far street: "CHÚC MỪNG NĂM MỚI" (Be Vietnam Pro draws the marks right)
export function tetBanner({ xA = -4.95, xB = 5.15, y = 4.9, z = -26, h = 1.0 } = {}) {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = Math.round(2048 * h / (xB - xA));
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const text = 'CHÚC MỪNG NĂM MỚI';
  let fs = Math.round(c.height * 0.56);
  g.font = `800 ${fs}px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif`;
  const tw = g.measureText(text).width;
  if (tw > c.width * 0.86) { fs = Math.floor(fs * c.width * 0.86 / tw); g.font = `800 ${fs}px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif`; }
  g.fillText(text, c.width / 2, c.height * 0.5 + fs * 0.36);
  // two small blossoms of dots at the ends, like the printed ones
  for (const x of [c.width * 0.035, c.width * 0.965]) for (let k = 0; k < 5; k++) {
    const a = k * 1.2566;
    g.beginPath(); g.arc(x + Math.cos(a) * fs * 0.2, c.height / 2 + Math.sin(a) * fs * 0.2, fs * 0.12, 0, 6.2832); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  const L = xB - xA;
  const geo = new THREE.PlaneGeometry(L, h, 32, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getX(i) / L + 0.5;
    pos.setY(i, pos.getY(i) - Math.sin(t * Math.PI) * 0.28);
    pos.setZ(i, Math.sin(t * Math.PI * 3.0) * 0.05 - t * 0.6);
  }
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...U, tText: { value: tex } },
    vertexShader: `varying vec2 vUv; varying vec3 vWP; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tBrush, tText, tWash, tRoof; uniform vec4 uRoof;
      uniform vec3 uAir, uAirSun, uKeyDir, uKShade, uKLit, uKeyCol; uniform float uAirNear, uAirFar, uAirMax;
      varying vec2 vUv; varying vec3 vWP;
      float band(float x, float t){ float w = max(fwidth(x), 1e-4) * 0.75; return smoothstep(t - w, t + w, x); }
      void main(){
        vec4 b = texture2D(tBrush, vUv * vec2(3.2, 0.5) + 0.21);
        vec4 b2 = texture2D(tBrush, vUv.yx * vec2(0.5, 2.6) + 0.63);
        vec4 b3 = texture2D(tBrush, vUv * vec2(1.4, 0.22) + 0.47);
        vec4 wsh = texture2D(tWash, vUv * vec2(0.9, 0.2) + 0.37);
        // F: an old cloth banner, a secondary thing: a dull brick red laid in horizontal strokes, bleached by sun and rain
        // G: between E and F: a warmer red, less bleached, still a secondary thing
        vec3 cloth = mix(vec3(0.46, 0.08, 0.06), vec3(0.62, 0.13, 0.09), band(b.b + (b2.a - 0.5) * 0.3, 0.5));
        float bleach = band(wsh.r * 0.7 + b3.b * 0.4 + (b.a - 0.5) * 0.2, 0.6);
        cloth = mix(cloth, vec3(0.68, 0.36, 0.3), bleach * 0.3);
        // letters: a pale, dry ochre, the strokes show through them; they stay whole enough to read
        float ink = texture2D(tText, vUv + (b2.rg - 0.5) * vec2(0.0012, 0.004)).r;
        // the letters are dry ochre on old cloth, not fresh paint: a banner strung 32 m up the street is decoration,
        // so it must not out-shout the bottle in a tall phone frame (it still reads, the marks still show)
        vec3 gold = mix(vec3(0.68, 0.49, 0.24), vec3(0.76, 0.61, 0.35), band(b.a + (b3.a - 0.5) * 0.3, 0.5));
        float dry = band(b3.a * 0.6 + b.b * 0.4, 0.2);
        vec3 col = mix(cloth, gold, ink * mix(0.72, 1.0, dry));
        float hem = 1.0 - band(min(vUv.y, 1.0 - vUv.y) + (b.a - 0.5) * 0.02, 0.05);
        col = mix(col, gold * 0.7, hem * 0.7);
        // the far roofs cut the sun across it, with a brushed edge
        float sunV = 1.0;
        if (vWP.x > uRoof.z + 0.2) {
          float t = (uRoof.z - vWP.x) / min(uKeyDir.x, -1e-3);
          vec3 h = vWP + uKeyDir * t;
          float top = texture2D(tRoof, vec2((h.z - uRoof.x) / uRoof.y, 0.5)).r * uRoof.w;
          sunV = band(h.y - top + (b.a - 0.5) * 0.6, 0.0);
        }
        col *= mix(uKShade * 0.95, uKLit * 0.92, sunV);
        // it hangs in the damp air: a veil of it even here, thicker with distance
        float d = length(cameraPosition - vWP);
        float air = 0.12 + 0.88 * uAirMax * pow(smoothstep(uAirNear, uAirFar, d), 1.35);
        float f = max(dot(normalize(vWP - cameraPosition), uKeyDir), 0.0);
        float g = dot(col, vec3(0.3, 0.55, 0.15));
        col = mix(col, vec3(g), 0.15);
        col = mix(col, mix(uAir, uAirSun, f * f) * 0.94, air);
        float edge = min(vUv.x, 1.0 - vUv.x);
        if (edge + (b.a - 0.5) * 0.004 < 0.0) discard;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set((xA + xB) / 2, y, z);
  mesh.frustumCulled = false;
  // the ropes tying it to the two fronts
  const ropes = [];
  for (const [sx, e] of [[xA, -1], [xB, 1]]) {
    const end = V3(sx, y + h / 2, z + (e > 0 ? -0.6 : 0));
    for (const dy of [0, -h]) ropes.push({ pts: [end.clone().add(V3(0, dy, 0)), end.clone().add(V3(-e * 0.02, dy + 0.35, 0.02))], width: 1.0, alpha: 0.7 });
  }
  return { mesh, ropes };
}

// ---------------------------------------------------------------- the market's tarpaulin over the street
// Hàng Lược stalls stretch canvas over the road at the near end of the market. Here it hangs across the top of the picture:
// the sun is above it, so from below it is a lit sheet — an even, warm, brushed band along the top edge, with the daylight
// and the street's depth under it. It hangs from where the camera stands out to `far` metres, so the eye's first strip of the
// frame is the cloth, not the sky, and the words of the page can sit on it. It is built in the eye's own direction (yaw), so
// its hem runs level across the frame.
export function marketAwning(scene, R, {
  eye = V3(0.6, 1.42, 0), yaw = 16, far = 5.25, near = -1.6, y = 3.28, rise = 0.62, width = 11.5, strips = 20, sag = 0.16,
} = {}) {
  const D2R = Math.PI / 180;
  // sun above, cloth below: from underneath it is a lit sheet, warm and even, with the weave showing through
  const cloth = withC(C.straw, { col: '#c6b096', col2: '#fff4df', emit: 0.13, erode: 0.16, hilite: 0.5, scale: 2.4, bump: 1.05 });
  const hemC = withC(C.straw, { col: '#9c8870', col2: '#efdcbe', erode: 0.28, hilite: 0.35, scale: 5, bump: 1.0 });
  const seamC = withC(C.straw, { col: '#a18c72', col2: '#e4d0b0', erode: 0.3, hilite: 0.3, scale: 6, bump: 0.9 });
  const b = new Batch();
  const step = width / strips;
  const depth = far - near;                                  // how far the sheet reaches into the street
  for (let i = 0; i < strips; i++) {
    const x = -width / 2 + (i + 0.5) * step;
    const u = (i + 0.5) / strips;                            // 0..1 across the sheet
    // the cloth hangs: it dips in the middle of the span and its hem is never a ruled line
    const dip = Math.sin(u * Math.PI) * sag;
    const hem = y - dip + Math.sin(u * 7.3 + 1.1) * 0.03 + Math.sin(u * 17.0) * 0.012;
    const back = y + rise - dip * 0.6;
    const midY = (hem + back) / 2;
    const tilt = Math.atan2(back - hem, depth);
    b.rbox(step * 1.18, 0.05, Math.hypot(depth, back - hem), 0.02,
      V3(x, midY, -(far + near) / 2), cloth, [-tilt, 0, 0]);
  }
  // the rolled hem along the front edge, and the two poles that hold it out over the street
  for (let i = 0; i < strips; i++) {
    const x0 = -width / 2 + i * step, x1 = x0 + step;
    const u0 = (i + 0.5) / strips, u1 = (i + 1.5) / strips;
    const h0 = y - Math.sin(u0 * Math.PI) * sag + Math.sin(u0 * 7.3 + 1.1) * 0.03 + Math.sin(u0 * 17.0) * 0.012;
    const h1 = y - Math.sin(u1 * Math.PI) * sag + Math.sin(u1 * 7.3 + 1.1) * 0.03 + Math.sin(u1 * 17.0) * 0.012;
    b.rod(V3(x0, h0 - 0.03, -far), V3(x1, h1 - 0.03, -far), 0.055, hemC, 7);
  }
  // the seams where the panels of canvas are sewn together, running with the street, and two ties at the hem
  for (let k = 1; k < 5; k++) {
    const u = k / 5;
    const x = -width / 2 + u * width;
    const dip = Math.sin(u * Math.PI) * sag;
    const h0 = y - dip + Math.sin(u * 7.3 + 1.1) * 0.03;
    b.rod(V3(x, h0 - 0.035, -far + 0.05), V3(x, y + rise - dip * 0.6 - 0.035, -near), 0.022, seamC, 6);
  }
  for (const sgn of [-1, 1]) {
    const u = sgn < 0 ? 0.16 : 0.84;
    const x = -width / 2 + u * width;
    const dip = Math.sin(u * Math.PI) * sag;
    b.rod(V3(x, y - dip - 0.05, -far), V3(x + sgn * 0.22, y - dip + 0.55, -far - 0.35), 0.02, hemC, 5);
  }
  const mesh = heroOf(b, { rims: false, tier: TIER2 });
  const g = new THREE.Group();
  g.position.set(eye.x, 0, eye.z);
  g.rotation.y = -yaw * D2R;
  g.add(mesh);
  scene.add(g);
  return { group: g, mesh };
}
