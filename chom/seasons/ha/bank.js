// Chớm world, season Hạ: the bank of Thanh Niên road. The stone embankment and its low parapet, the old trees and iron lamp posts
// along the road, and the tea corner by the water: a low table, the bamboo tray of lotus tea (where the bottle stands),
// a basket of fresh lotus, a small kerosene lamp on the tray.
import * as THREE from 'three';
import { V3, Batch, heroOf, hero, mat, C, withC, TIER2 } from '../../core/build.js';
import { U } from '../../core/paint.js';
import { lotusFlower, lotusBud, LC } from './lotus.js';
import { WATER_Y } from './water.js';

export const BANK_X = -0.2;
// the tea table's top, in the table's own space (x along the table, +z toward the camera side; the tea maker sits at -z).
// The table spans x +-0.48, z +-0.29, its top at y 0.34.
// (people agent, 17/9: bowl at (0.16, -0.17), no lạt bundle (she brings a tube at (0.28, -0.21)), an empty r 0.10 circle round
// (0, -0.15) on the tray for her small basket. The bowl and that circle are only 0.16 apart, so the tray's rim cannot pass
// between them: the bowl sits ON the tray, and the tray is a little bigger and further back; it overhangs her edge by 0.05.)
// (17/9, evening: the main camera now looks at her from her left side, a little behind; the tray is laid out for that view:
// nothing stands between the camera and the bottle, the small basket's spot sits between her hands and the bottle)
export const TRAY = {
  at: [-0.01, -0.02], r: 0.3,                     // the bamboo tray (mẹt); its rim reaches r 0.31 (overhangs her edge by 0.03)
  bottle: [0.1, 0.1],                             // the Chớm bottle on the tray (footprint radius 0.093)
  basketSpot: [0.02, -0.2], basketR: 0.10,        // left empty for her small deep basket of tied flowers
  flowers: [[-0.24, -0.1, 0.9, -0.15]],          // an opened flower in its stand: x, z, size, lean (reach ~0.085)
  lamp: [-0.115, 0.03],                           // the kerosene lamp, 0.15 behind the bottle and 0.17 to its right as the camera sees it (base r 0.055)
  bowl: [0.16, -0.17], bowlR: 0.055,              // the bowl of dry green tea, on the tray by her hand
  tube: [0.28, -0.21],                            // (her lạt tube, brought by the people agent; the tray rim is 0.037 from it)
  teapot: [-0.36, -0.18], cups: [[-0.38, 0.05], [-0.3, 0.26]],   // off the tray, at the far end of the table
};

// ---------------------------------------------------------------- embankment and parapet (knife, background tier)
export function embankment(kb, R, { zNear = 10, zFar = -240, parapetFrom = -7.6 } = {}) {
  const stone = (h) => ({ col: '#7a6e70', col2: '#b8a69e', scale: 0.9, drip: 0.5, seed: R(), haze: h });
  // the face of the embankment, down to the water (seen from the boat side and when the camera flies over the pond)
  for (let z = zNear; z > zFar; z -= 12) kb.box(0.26, 1.2, 12.02, V3(BANK_X - 0.08, -0.72, z - 6), stone(0.04));
  // the coping: long pale stones along the edge, their tops worn round toward the water (so the low sun catches them)
  // (at this low sun a flat top gets almost no light; the stone's own warmth (emit) keeps it level with the sunlit pavement)
  // (21/9) emit was 0.42 on this coping and 0.4 on the parapet's top. It was put there so a flat stone top would not go
  // dead under a 1.6 degree sun - but what it made was a hard white band running diagonally past the tea tray, and that
  // band is most of what the bottle's own box has to compete with on the computer frame. Turned down, not off: the stone
  // still reads as warm stone, it just stops out-shouting the glass two hand-widths away. The sunset on the water and
  // both lamps are untouched.
  for (let z = zNear; z > zFar; z -= 1.6) kb.box(0.4, 0.06, 1.58, V3(BANK_X + 0.1, 0.0, z - 0.8), { col: '#7a6660', col2: '#bda898', emit: 0.2, scale: 1.2, seed: R(), haze: 0.04 });
  // the low parapet people sit on to watch the sunset
  for (let z = parapetFrom; z > zFar; z -= 2.4) {
    kb.box(0.36, 0.4, 2.36, V3(0.0, 0.2, z - 1.2), { ...stone(0.06), emit: 0.09 });
    kb.box(0.44, 0.07, 2.38, V3(0.0, 0.43, z - 1.2), { col: '#7a6660', col2: '#bda898', emit: 0.18, scale: 1.2, seed: R(), haze: 0.06 });
  }
  // steps down to the water beside the tea corner (where the boats tie up in the morning)
  for (let k = 0; k < 3; k++) kb.box(0.34, 0.15, 1.6, V3(BANK_X - 0.2 - k * 0.3, -0.12 - k * 0.15, -5.9), stone(0.03));
}

// ---------------------------------------------------------------- an old roadside tree (xà cừ): a leaning trunk, a few limbs, a heavy crown
export function roadTree(trunkB, crownB, R, at, { h = 11, spread = 4.2, tree = 3, lean = [0, 0], knife = false, haze = 0, clumps = null } = {}) {
  const bark = knife ? { col: '#3a3036', col2: '#7a6a68', scale: 1.5, seed: R(), haze } : withC(C.bark, { col: '#2a2226', col2: '#7a6660' });
  const leaf = knife ? { col: '#2e3e36', col2: '#6e8a64', scale: 0.8, seed: R(), haze } : withC(C.leaf, { col: '#1e3028', col2: '#6a8a5c', erode: 0.45 });
  const sw = (x, y) => Math.max(0, y - h * 0.35) * 0.05;
  const base = V3(at.x, 0, at.z);
  const fork = V3(at.x + lean[0], h * 0.45, at.z + lean[1]);
  const pts = [base, V3(at.x + lean[0] * 0.3 + 0.05, h * 0.15, at.z + lean[1] * 0.3), V3(at.x + lean[0] * 0.7, h * 0.32, at.z + lean[1] * 0.7), fork];
  if (knife) {
    trunkB.tube(pts, 0.32, bark, 8, 7, 0, tree);
    trunkB.cyl(0.34, 0.5, 0.5, V3(at.x, 0.25, at.z), bark, 8, undefined, 0, tree);
  } else {
    trunkB.tube(pts, 0.3, bark, 10, 9, 0, tree);
    trunkB.cyl(0.34, 0.5, 0.5, V3(at.x, 0.25, at.z), bark, 10);
  }
  const ends = [];
  const nl = 4;
  for (let k = 0; k < nl; k++) {
    const a = (k / nl) * Math.PI * 2 + R() * 0.8;
    const e = fork.clone().add(V3(Math.cos(a) * spread * (0.5 + 0.4 * R()), h * (0.28 + 0.2 * R()), Math.sin(a) * spread * (0.5 + 0.4 * R())));
    const m = fork.clone().lerp(e, 0.5).add(V3(0, 0.4, 0));
    if (knife) trunkB.tube([fork, m, e], 0.14, bark, 6, 5, sw, tree);
    else trunkB.tube([fork, m, e], 0.14, bark, 8, 6, sw, tree);
    ends.push(e);
  }
  // the crown: clumps of leaves round the limb ends and over the top. With `clumps` (an array) they are only collected,
  // to be painted as flat brushed clusters (foliage.js); otherwise they are modelled as blobs
  const nb = knife ? 12 : 22;
  const crown = fork.clone().add(V3(0, h * 0.35, 0));
  for (let k = 0; k < nb; k++) {
    const e = ends[k % ends.length];
    const p = e.clone().add(V3((R() - 0.5) * 2.6, (R() - 0.3) * 1.6, (R() - 0.5) * 2.6));
    const r = 1.0 + R() * 1.1;
    if (clumps) clumps.push({ at: p, r, crown, tree, haze, sway: 0.05 });
    else crownB.blob(r, p, [1.2, 0.8, 1.2], leaf, R() * 6, knife ? 1 : 2, 0.3, sw, tree);
  }
  return { base, ends, h };
}

// ---------------------------------------------------------------- a cast-iron lamp post (dark green), the lamp just lit for the evening
export function lampPost(kb, R, at, { h = 4.4, haze = 0.06, arm = -1 } = {}) {
  const iron = { col: '#22302c', col2: '#56706a', scale: 2, seed: R(), haze };
  kb.cyl(0.1, 0.16, 0.9, V3(at.x, 0.45, at.z), iron, 8);
  kb.cyl(0.05, 0.08, h - 0.9, V3(at.x, 0.9 + (h - 0.9) / 2, at.z), iron, 8);
  kb.push(() => new THREE.TorusGeometry(0.35, 0.025, 5, 12, Math.PI * 0.6), true, iron, mat(V3(at.x + arm * 0.35, h - 0.05, at.z), [0, 0, 0]));
  const lamp = V3(at.x + arm * 0.62, h - 0.3, at.z);
  kb.push(() => new THREE.ConeGeometry(0.17, 0.22, 8), true, iron, mat(lamp.clone().add(V3(0, 0.2, 0))));
  kb.push(() => new THREE.SphereGeometry(0.11, 10, 8), true, { col: '#ffb860', col2: '#fff0c8', emit: 1.1, scale: 3, seed: R(), haze: 0 }, mat(lamp));
  return lamp;
}

// ---------------------------------------------------------------- the tea corner
// the table stands at `at` (ground point of its middle), turned by ry; returns the heroes, the tray's top, sketch targets, shadows
export function teaCorner(scene, R, { at, ry = 0, basketAt, basketR = 0.26 }) {
  const out = { heroes: [], shadows: [], solids: [], sketch: [] };
  const add = (obj) => { scene.add(obj); out.heroes.push(obj); return obj; };
  // (21/9) The table's top is the other half of the bottle's surroundings, and erode 0.35 under this low sun threw a
  // scatter of pale flecks across it the size of the label's letters. Same reason as the mẹt above: still, not just dark.
  const wood = withC(C.wood, { col: '#2a1c15', col2: '#6d4e37', erode: 0.14, hilite: 0.18 });
  const tb = new Batch();
  // a low wooden table, worn smooth
  const TH = 0.34;
  tb.rbox(0.96, 0.045, 0.58, 0.012, V3(0, TH - 0.022, 0), wood);
  for (const [x, z] of [[-0.42, -0.24], [0.42, -0.24], [-0.42, 0.24], [0.42, 0.24]]) tb.box(0.05, TH - 0.04, 0.05, V3(x, (TH - 0.04) / 2, z), wood);
  tb.box(0.86, 0.04, 0.02, V3(0, 0.08, 0.24), wood);
  tb.box(0.86, 0.04, 0.02, V3(0, 0.08, -0.24), wood);
  // the bamboo tray (mẹt), round, with a bound rim
  const TY = TH;
  const T = TRAY;
  // The mẹt, darkened AGAIN on 21/9, and this time quieted as well as darkened.
  // On 18/9 it went from pale cream bamboo to '#544026 / #b28f5e' and that alone took the bottle from 37.5 to 40.7.
  // The new check asks a harder question: with the glass taken out of the scene, what does its own box still score?
  // On the computer it still scored 31.7 of 34.5 - the glass was worth 8% of its own place. Almost all of that 31.7 is
  // this tray: the bottle's box lies wholly on it. It was still a bright gold disc (col2 '#b28f5e' with straw's
  // hilite 0.5) and it was busy (scale 10, bump 1.1 - a speckle the size of the label's letters). Đông works because
  // the ground behind its bottle is dark AND still; a dark ground that is busy swallows the glass just as well.
  // So: darker at both ends, the highlight down, the speckle made large and few. The lamp, the sun and the sunset on
  // the water are untouched (seasons/ha/season.js: never the lights, never the bottle itself).
  tb.lathe([[0, 0], [T.r, 0.0], [T.r + 0.015, 0.025], [T.r + 0.005, 0.03], [T.r - 0.01, 0.012], [0, 0.012]], V3(T.at[0], TY, T.at[1]), withC(C.straw, { col: '#33260f', col2: '#6b5530', erode: 0.12, hilite: 0.18, scale: 3.5, bump: 0.55 }), 40);
  tb.add(new THREE.TorusGeometry(T.r + 0.01, 0.009, 6, 48), withC(C.bamboo, { col: '#2e2412', col2: '#705f38', hilite: 0.2 }), mat(V3(T.at[0], TY + 0.026, T.at[1]), [Math.PI / 2, 0, 0]));
  // a glazed bowl of dry green tea, on the tray by her hand
  const bk = T.bowlR / 0.068;
  tb.lathe([[0, 0], [0.045, 0], [0.06, 0.02], [0.068, 0.045], [0.064, 0.047], [0.055, 0.03], [0, 0.03]].map(([r, y]) => [r * bk, y * bk]), V3(T.bowl[0], TY + 0.012, T.bowl[1]), withC(C.pot, { col: '#3a4a50', col2: '#b8c8c4', gloss: 0.8, hilite: 1 }), 24);
  tb.blob(0.05 * bk, V3(T.bowl[0], TY + 0.012 + 0.038 * bk, T.bowl[1]), [1, 0.35, 1], { col: '#34401e', col2: '#8a9a54', erode: 0.1, hilite: 0.2, scale: 30, bump: 1.3 }, 2.1, 2, 0.25);
  // a clay teapot and two cups at the far end of the table, off the tray
  const [px, pz] = T.teapot;
  tb.lathe([[0, 0], [0.05, 0], [0.068, 0.03], [0.07, 0.06], [0.05, 0.09], [0.02, 0.095], [0, 0.095]], V3(px, TH, pz), withC(C.lacquer, { col: '#3a1a14', col2: '#9a5a40', gloss: 0.6 }), 24);
  tb.rod(V3(px - 0.06, TH + 0.04, pz), V3(px - 0.105, TH + 0.08, pz), 0.008, withC(C.lacquer, { col: '#3a1a14', col2: '#9a5a40' }), 6, 0.012);
  for (const [x, z] of T.cups) tb.lathe([[0, 0], [0.022, 0], [0.03, 0.03], [0.027, 0.03], [0, 0.005]], V3(x, TH, z), withC(C.pot, { col: '#6a6a60', col2: '#f0ece0', gloss: 0.6 }), 16);
  const table = add(heroOf(tb, { rims: false, tier: 0.05 }));
  table.name = 'ha-tea-table';           // named for seasons/ha/keepout.mjs (measured by pixels)
  table.position.set(at.x, 0, at.z);
  table.rotation.y = ry;
  // flowers on the tray: two opened with tea inside, one still a bud waiting its turn (main things: full contrast, loose sketch)
  const fb = new Batch({ wind: true });
  const toW = (x, y, z) => V3(x, y, z).applyAxisAngle(V3(0, 1, 0), ry).add(V3(at.x, 0, at.z));
  // two flowers opened in little clay stands, tea already tucked in (the tied ones go into her small basket: the empty spot)
  for (const [x, z, s, lean] of T.flowers) {
    lotusFlower(fb, V3(x, TY + 0.1, z), { up: V3(lean, 1, -0.1), open: 0.85, size: s, R, tea: true, sway: 0.05, tree: 1 });
    fb.lathe([[0, 0], [0.03, 0], [0.034, 0.08], [0.02, 0.1], [0, 0.1]], V3(x, TY + 0.019, z), LC.stem, 12, undefined, undefined, 0.02, 1);
  }
  const flowers = add(hero(fb.merge(), { wind: true, rimW: 1.6, rimOff: 1.0, cut: 0.5 }));
  flowers.position.set(at.x, 0, at.z);
  flowers.rotation.y = ry;
  // no white line round the tray flower: the drawn white loop is the bottle's own mark and nothing else wears it
  // (Mike, 18/9). The flower still reads as a main thing through its full contrast and its colour rim.

  out.trayTop = toW(T.at[0], TY + 0.013, T.at[1]);
  out.toW = toW;
  out.shadows.push([at.x, at.z, 0.55, 0.36, 0.5]);
  // the table as three circles along its length (for the clipping check)
  for (const lx of [-0.3, 0, 0.3]) { const p = toW(lx, 0, 0); out.solids.push({ x: p.x, z: p.z, r: 0.3, h: 0.8, name: `tea table ${lx}` }); }

  // the basket of fresh lotus, cut this afternoon
  if (basketAt) {
    // basketR: its outer radius, everything (buds, the leaf) stays inside it
    // basketR: its outer radius, everything (buds, the leaf) stays inside it. It stands on a small wooden stool (0.2 m),
    // its rim at 0.47 m, so she can reach into it from her seat
    const k = basketR / 0.26, ky = 0.27 / 0.2, SY = 0.2;
    const bb = new Batch({ wind: true });
    const sw = withC(C.wood, { col: '#2a1e18', col2: '#7a5a44', erode: 0.3 });
    bb.box(0.24, 0.03, 0.24, V3(0, SY - 0.015, 0), sw);
    for (const [x, z] of [[-0.095, -0.095], [0.095, -0.095], [-0.095, 0.095], [0.095, 0.095]]) bb.box(0.03, SY - 0.03, 0.03, V3(x, (SY - 0.03) / 2, z), sw);
    bb.lathe([[0, 0], [0.16, 0], [0.22, 0.05], [0.25, 0.16], [0.26, 0.2], [0.24, 0.2], [0.22, 0.17], [0, 0.17]].map(([r, y]) => [r * k, y * ky]), V3(0, SY, 0), withC(C.straw, { col: '#4a3820', col2: '#b8986a', erode: 0.3, scale: 9 }), 32);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + R() * 0.3, r = (0.03 + 0.1 * Math.sqrt(i / 6)) * k;
      const p = V3(Math.cos(a) * r, SY + (0.19 + R() * 0.03) * ky, Math.sin(a) * r);
      const up = V3(Math.cos(a) * 0.9, 0.6, Math.sin(a) * 0.9).normalize();
      if (i % 3 === 0) lotusFlower(bb, p, { up, open: 0.4, size: 1.1 * k, R, sway: 0.02, tree: 1, pod: false });
      else lotusBud(bb, p, { up, size: 1.25 * Math.max(k, 0.8), sway: 0.02, tree: 1 });
    }
    const lf = new THREE.CircleGeometry(0.1 * k, 14);
    lf.rotateX(-Math.PI / 2 + 0.4);
    bb.add(lf, LC.leaf, mat(V3(0.06 * k, SY + 0.2 * ky, -0.05 * k), [0, 0.8, 0]), 0.03, 1);
    const basket = add(heroOf(bb, { wind: true, rims: false, tier: 0.06 }));
    basket.position.set(basketAt.x, 0, basketAt.z);
    out.shadows.push([basketAt.x, basketAt.z, basketR, basketR, 0.5]);
    out.solids.push({ x: basketAt.x, z: basketAt.z, r: basketR, h: 0.55, name: 'lotus basket' });
  }

  // a small kerosene lamp (đèn dầu) standing on the tray just behind the bottle, lit for the evening's work:
  // a glass fount, a brass collar, a tall glass chimney, the flame (table-local T.lamp)
  if (T.lamp) {
    const lb = new Batch();
    const [lx, lz] = T.lamp;
    const ly = TY + 0.012;
    const glassC = withC(C.pot, { col: '#5a6a60', col2: '#e8eee0', gloss: 1, hilite: 1, erode: 0.2 });
    lb.lathe([[0, 0], [0.04, 0], [0.052, 0.02], [0.05, 0.05], [0.03, 0.065], [0, 0.065]], V3(lx, ly, lz), glassC, 20);
    lb.lathe([[0.018, 0], [0.028, 0], [0.028, 0.02], [0.022, 0.03], [0.018, 0.03]], V3(lx, ly + 0.065, lz), withC(C.gold, { col: '#6a4a1c', col2: '#e0b050' }), 16);
    // the chimney: warm glass round the flame, paler above where the heat thins
    lb.lathe([[0.018, 0], [0.026, 0.02], [0.03, 0.06], [0.027, 0.08]], V3(lx, ly + 0.09, lz), withC(glassC, { col: '#b0703a', col2: '#ffe4a8', emit: 0.55, gloss: 0.6 }), 16);
    lb.lathe([[0.027, 0], [0.022, 0.05], [0.02, 0.07], [0.018, 0.07]], V3(lx, ly + 0.17, lz), withC(glassC, { col: '#9a8a70', col2: '#fff2dc', emit: 0.18 }), 16);
    // the wick's brass burner inside
    lb.cyl(0.008, 0.01, 0.02, V3(lx, ly + 0.1, lz), withC(C.gold, { col: '#5a3a14', col2: '#c89040' }), 8);
    // (the lamp is part of the table's space: turned and placed with it)
    const lampObj = add(heroOf(lb, { rims: false, tier: 0.03 }));
    lampObj.name = 'ha-kerosene-lamp';
    lampObj.position.set(at.x, 0, at.z);
    lampObj.rotation.y = ry;
    out.lamp = toW(lx, ly + 0.13, lz);
    // the flame: a drop of fire, a white-gold heart and an orange skin; it breathes on twos (update() in season.js)
    const fp = toW(lx, ly + 0.108, lz);
    const flame = new THREE.Mesh(
      new THREE.LatheGeometry([[0, 0], [0.006, 0.004], [0.0085, 0.012], [0.008, 0.02], [0.005, 0.03], [0.002, 0.038], [0, 0.042]].map(([r, y]) => new THREE.Vector2(r, y)), 14),
      new THREE.ShaderMaterial({
        uniforms: { tBrush: U.tBrush },
        vertexShader: `varying vec3 vN, vV; varying float vH; void main(){ vH = position.y / 0.042; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */`
          varying vec3 vN, vV; varying float vH;
          void main(){
            float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
            // a white-gold heart low in the flame, gold above, an orange skin at the edge and the tip
            vec3 heart = vec3(1.6, 1.45, 1.05), gold = vec3(1.5, 0.95, 0.35), skin = vec3(1.2, 0.45, 0.12);
            vec3 col = mix(heart, gold, smoothstep(0.25, 0.7, vH));
            col = mix(col, skin, smoothstep(0.35, 0.8, rim + vH * 0.35));
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    flame.position.copy(fp);
    flame.userData.castShadow = false;
    scene.add(flame);
    out.flame = flame;
    // warm light lying on the tray round the lamp's foot, broken by the weave's strokes
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 24).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
        uniforms: { tBrush: U.tBrush, uFlick: { value: 1 } },
        vertexShader: `varying vec2 vP; void main(){ vP = position.xz / 0.2; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
        fragmentShader: /* glsl */`
          uniform sampler2D tBrush; uniform float uFlick; varying vec2 vP;
          void main(){
            vec4 b = texture2D(tBrush, vP * 0.35 + 0.41);
            float r = length(vP) + (b.a - 0.5) * 0.25;
            float a = (1.0 - smoothstep(0.2, 1.0, r)) * 0.5 * uFlick;
            float inner = 1.0 - smoothstep(0.15, 0.5, r + (b.b - 0.5) * 0.2);
            if (a < 0.01) discard;
            gl_FragColor = vec4(mix(vec3(1.0, 0.66, 0.32), vec3(1.0, 0.86, 0.56), inner), a);
          }`,
      }),
    );
    pool.position.copy(toW(lx, TY + 0.0125, lz));
    pool.userData.castShadow = false;
    pool.renderOrder = 2;
    scene.add(pool);
    out.pool = pool;
  }
  return out;
}

// ---------------------------------------------------------------- her old bicycle, parked on its stand by the tea corner
// (an early-2000s town bicycle: a step-through frame, a front basket, a rear rack with a folded lotus-leaf bundle; no badge)
export function parkedBicycle(scene, R, { at, ry = 0 }) {
  const b = new Batch();
  const frame = withC(C.body, { col: '#1e2a2c', col2: '#5a7a78', gloss: 0.6, hilite: 0.6, erode: 0.35, scale: 5 });
  const steel = withC(C.steel, { col: '#1c2024', col2: '#6a767a' });
  const tyre = withC(C.tyre, { col: '#0c0e10', col2: '#3a3a40' });
  // wheels along local x, the bicycle faces +x
  for (const x of [-0.52, 0.52]) {
    b.add(new THREE.TorusGeometry(0.33, 0.018, 6, 36), tyre, mat(V3(x, 0.35, 0)));
    b.add(new THREE.TorusGeometry(0.3, 0.006, 4, 32), steel, mat(V3(x, 0.35, 0)));
    for (let k = 0; k < 6; k++) b.box(0.004, 0.6, 0.004, V3(x, 0.35, 0), steel, [0, 0, (k * Math.PI) / 6]);
    b.cyl(0.03, 0.03, 0.06, V3(x, 0.35, 0), steel, 8, [Math.PI / 2, 0, 0]);
  }
  const hub = V3(-0.52, 0.35, 0), bb = V3(0.02, 0.33, 0), seat = V3(-0.22, 0.86, 0), head = V3(0.36, 0.9, 0), fork = V3(0.52, 0.35, 0);
  b.rod(hub, bb, 0.014, frame); b.rod(bb, seat, 0.016, frame); b.rod(hub, seat.clone().add(V3(0, -0.04, 0)), 0.012, frame);
  b.rod(bb, V3(0.3, 0.72, 0), 0.02, frame); b.rod(V3(0.3, 0.72, 0), head, 0.02, frame);
  b.rod(head, fork, 0.014, frame);
  b.rod(head, V3(0.3, 1.0, 0), 0.014, steel);
  b.rod(V3(0.26, 1.0, -0.26), V3(0.26, 1.0, 0.26), 0.012, steel);
  b.rbox(0.22, 0.05, 0.12, 0.02, seat.clone().add(V3(0, 0.02, 0)), withC(C.tyre, { col: '#1a1410', col2: '#5a4a3a' }));
  // the rear rack and a bundle of lotus leaves folded for tomorrow's tea
  b.box(0.36, 0.015, 0.14, V3(-0.5, 0.72, 0), steel);
  b.rod(V3(-0.52, 0.35, 0.06), V3(-0.42, 0.72, 0.06), 0.006, steel);
  b.rod(V3(-0.52, 0.35, -0.06), V3(-0.42, 0.72, -0.06), 0.006, steel);
  b.blob(0.14, V3(-0.5, 0.8, 0), [1.3, 0.55, 0.9], withC(LC.leafQ, { erode: 0.2 }), 2.3, 1, 0.25);
  // the front basket (woven), empty now: the flowers are on the table
  b.lathe([[0.1, 0], [0.13, 0.02], [0.15, 0.2], [0.14, 0.2], [0.12, 0.03], [0, 0.03]], V3(0.48, 0.74, 0), withC(C.straw, { col: '#5a4428', col2: '#c0a070', erode: 0.3 }), 20, undefined, [1, 1, 0.8]);
  // the stand
  b.rod(V3(-0.1, 0.33, 0.02), V3(-0.18, 0.0, 0.09), 0.008, steel);
  const g = heroOf(b, { rims: false, tier: 0.08 });
  g.position.set(at.x, 0, at.z);
  g.rotation.set(0, ry, 0.06);
  scene.add(g);
  const ax = V3(Math.cos(ry), 0, -Math.sin(ry));
  return {
    group: g,
    solids: [-0.5, 0, 0.5].map((d, i) => ({ x: at.x + ax.x * d, z: at.z + ax.z * d, r: 0.2, h: 1.05, name: `bicycle#${i}` })),
    shadows: [[at.x, at.z, 0.3, 0.3, 0.9]],
  };
}

// ---------------------------------------------------------------- her gánh, set down on the pavement: the two flat baskets she
// carried the lotus in, the carrying pole laid across them, a few leaves and buds still in them
export function ganh(scene, R, { at, a = 0.3, span = 1.12 }) {
  const b = new Batch({ wind: true });
  const dir = V3(Math.sin(a), 0, Math.cos(a));
  const ends = [-1, 1].map((s) => at.clone().addScaledVector(dir, (s * span) / 2));
  const straw = withC(C.straw, { col: '#4a3820', col2: '#bc9c6a', erode: 0.3, scale: 9 });
  const rope = withC(C.bamboo, { col: '#4a3a24', col2: '#a88a5a' });
  ends.forEach((e, i) => {
    const p = e.clone().sub(at);
    b.lathe([[0, 0], [0.18, 0], [0.22, 0.04], [0.23, 0.11], [0.215, 0.11], [0.2, 0.05], [0, 0.05]], V3(p.x, 0, p.z), straw, 28);
    // the cords, unhooked from the pole, lie slack over the rim
    for (let k = 0; k < 2; k++) {
      const ang = (k / 2) * Math.PI * 2 + a + 0.8;
      const r0 = V3(p.x + Math.cos(ang) * 0.22, 0.11, p.z + Math.sin(ang) * 0.22);
      b.tube([r0, V3(p.x + Math.cos(ang) * 0.27, 0.07, p.z + Math.sin(ang) * 0.27), V3(p.x + Math.cos(ang + 0.3) * 0.34, 0.006, p.z + Math.sin(ang + 0.3) * 0.34)], 0.005, rope, 6, 4);
    }
    // what is left in the basket: a leaf, a few buds
    const lf = new THREE.CircleGeometry(0.15, 12);
    lf.rotateX(-Math.PI / 2 + 0.25);
    b.add(lf, LC.leafQ, mat(V3(p.x + 0.03, 0.08, p.z - 0.02), [0, R() * 3, 0]), 0.02, 1);
    for (let k = 0; k < 2 + i; k++) {
      const ang = R() * 6.28;
      lotusBud(b, V3(p.x + Math.cos(ang) * 0.08, 0.1, p.z + Math.sin(ang) * 0.08), { up: V3(Math.cos(ang), 0.35, Math.sin(ang)).normalize(), size: 1.3, sway: 0.02, tree: 1 });
    }
  });
  // the flat bamboo carrying pole, resting across both rims
  const pa = ends[0].clone().sub(at).addScaledVector(dir, -0.25), pb = ends[1].clone().sub(at).addScaledVector(dir, 0.25);
  pa.y = 0.125; pb.y = 0.125;
  b.add(new THREE.BoxGeometry(0.045, 0.02, pa.distanceTo(pb)), withC(C.bamboo, { col: '#5a4a2a', col2: '#d0bc84' }), new THREE.Matrix4().compose(pa.clone().lerp(pb, 0.5), new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), pb.clone().sub(pa).normalize()), V3(1, 1, 1)));
  const g = heroOf(b, { wind: true, rims: false, tier: 0.07 });
  g.position.copy(at);
  scene.add(g);
  return {
    group: g,
    solids: ends.map((e, i) => ({ x: e.x, z: e.z, r: 0.24, h: 0.45, name: `gánh basket#${i}` })),
    shadows: ends.map((e) => [e.x, e.z, 0.22, 0.22, 0.2]),
  };
}

// fallen leaves on the pavement (xà cừ leaves, dry, a few still green): small knife dabs, gathered near the trees
export function fallenLeaves(kb, R, { n = 90, trees, box }) {
  const cols = [['#5a3a22', '#b0824a'], ['#6a4a26', '#c89a5a'], ['#3e4a2a', '#8a9a5a'], ['#5a3024', '#a8603a']];
  for (let i = 0; i < n; i++) {
    let x, z;
    if (R() < 0.6) { const t = trees[Math.floor(R() * trees.length)]; const a = R() * 6.28, r = 0.4 + R() * 2.2; x = t[0] + Math.cos(a) * r; z = t[1] + Math.sin(a) * r; }
    else { x = box[0] + R() * (box[1] - box[0]); z = box[2] + R() * (box[3] - box[2]); }
    if (x < box[0] || x > box[1]) continue;
    const [c1, c2] = cols[Math.floor(R() * cols.length)];
    const s = 0.05 + R() * 0.05;
    const o = { col: c1, col2: c2, emit: 0.25, scale: 6, seed: R(), haze: 0.02 };
    kb.push(() => new THREE.PlaneGeometry(s, s * 2.2).rotateX(-Math.PI / 2), true, o, mat(V3(x, 0.006, z), [0, R() * 6.28, 0]));
  }
}
