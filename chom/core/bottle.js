// Chớm world, core: the bottle itself. One shape per function, all of them registered here by name, so a new bottle can take
// the old one's place without touching the world: a season asks for it with `bottle.shape` (README 15).
//
// A shape function is  (labelTex, opts) -> THREE.Group  and must:
//   - stand on y = 0, its middle on x = 0, its face toward +z, and be about 0.23 m tall before the season scales it;
//   - be built with core/build.js (Batch + hero({ glass: 1 })) so it is painted like everything else;
//   - leave the glass mesh at g.userData.main (the world sets uGlass from `bottle.glow`);
//   - carry its label as a child whose material has a tLabel uniform (the world lights it from `bottle.labelLight`);
//   - with capOff: true, put the cap in its own group at g.userData.cap, still where it sits on the neck.
// The world does the rest: where it stands, its scale and turn, the sketch loops, the close-up, the click area, the glint.
import * as THREE from 'three';
import { U } from './paint.js';
import { V3, Batch, hero, C, withC } from './build.js';

// 'classic': the first Chớm bottle — a small flat flask of teal glass with a lacquer cap.
// capOff: true builds the cap as its own thing (g.userData.cap, still at its place on the neck), so a season can set it down
// beside the bottle; without it the cap is part of the one glass shape, as before.
function classicBottle(labelTex, { capOff = false } = {}) {
  const cap = withC(C.lacquer, { col: '#3a2410', col2: '#f0b850', gloss: 1, hilite: 1.2, scale: 12, bump: 0.5 });
  const b = new Batch();
  b.rbox(0.105, 0.14, 0.05, 0.012, V3(0, 0.07, 0), withC(C.body, { col: '#081a1e', col2: '#2e6a66', gloss: 1, hilite: 1.35, erode: 0.35, scale: 9, bump: 0.7 }));
  b.cyl(0.014, 0.014, 0.016, V3(0, 0.148, 0), withC(C.body, { scale: 12 }), 20);
  if (!capOff) b.rbox(0.05, 0.05, 0.05, 0.008, V3(0, 0.18, 0), cap);
  const g = hero(b.merge(), { rimW: 2.6, rimOff: 1.6, cut: 0.4, glass: 1 });
  if (capOff) {
    const cb = new Batch();
    cb.rbox(0.05, 0.05, 0.05, 0.008, V3(0, 0, 0), cap);
    const cm = hero(cb.merge(), { rimW: 2.6, rimOff: 1.6, cut: 0.4 });
    cm.position.set(0, 0.18, 0);
    cm.name = 'cap';
    g.add(cm);
    g.userData.cap = cm;
  }
  // the paper label, and the painted highlights on the glass
  const label = bottleLabel(labelTex, 0.07, 0.05);
  label.position.set(0, 0.068, 0.0262);
  g.add(label);
  const hl = bottleGlint(0.02, 0.125);
  hl.position.set(-0.034, 0.074, 0.0275);
  hl.rotation.z = -0.06;
  g.add(hl);
  const hl2 = bottleGlint(0.011, 0.034);
  hl2.position.set(-0.012, 0.19, 0.0262);
  g.add(hl2);
  // the lamp's hot highlight on the shoulder of the glass and on the cap
  const hl3 = bottleGlint(0.05, 0.012);
  hl3.position.set(0.004, 0.136, 0.0262);
  hl3.rotation.z = Math.PI / 2 + 0.05;
  g.add(hl3);
  return g;
}

// ---------------------------------------------------------------- 'flacon': the bottle Mike chose (2026-09-18)
// A real extrait flacon, the parts a glassworks would name: a thick base you can see the light pool in, a square body that is
// taller than it is wide and thin front to back, sloping shoulders, a neck with a rim, and a ground-glass stopper big enough
// to hold between two fingers with its peg deep in the neck. The scent stands below the shoulder, so the level shows.
// Research and the four shapes it came from: prototypes/chom-bottle/NGHIEN-CUU.md.
const FL = {
  W: 0.098, D: 0.052,                            // body: 98 wide, 52 deep
  BASE: 0.024, FLOOR: 0.005, FILL: 0.075, HEAD: 0.022,  // thick base, the glass floor, the scent, the air above it
  SH: 0.038, NECK: 0.020,                        // shoulder and neck
};
FL.yTop = FL.BASE + FL.FLOOR + FL.FILL + FL.HEAD; // 0.126: where the shoulder starts
FL.yNeck = FL.yTop + FL.SH;                       // 0.164: where the neck starts (and where the stopper sits)
// the glass of this bottle: the scent deepest, the air above it clearer, the thick base lightest of all (light pools in it)
const FG = {
  base: { col: '#10393c', col2: '#63b6aa', gloss: 1, hilite: 1.3, erode: 0.16, scale: 7, bump: 0.35 },
  floor: { col: '#06191d', col2: '#2b6f69', gloss: 1, hilite: 0.95, erode: 0.22, scale: 6, bump: 0.3 },
  deep: { col: '#07242a', col2: '#2a7a72', gloss: 1, hilite: 1.1, erode: 0.3, scale: 9, bump: 0.55 },
  clear: { col: '#123c40', col2: '#5aa8a4', gloss: 1, hilite: 1.2, erode: 0.2, scale: 10, bump: 0.4 },
  stop: { col: '#0b3238', col2: '#59a8a4', gloss: 1, hilite: 1.15, erode: 0.2, scale: 8, bump: 0.5 },
};
// the label Agent Logo drew, the one Mike chose (2026-09-18): layout D at 90 mm (brand/chom/nhan/, the drawing is
// 1600 x 1600), with the accent colour of the season
const LABEL_SEASON = { xuan: 'xuan', ha: 'ha', thu: 'thu', dong: 'dong', mocua: 'xuan' };
// Mike chose the large square (2026-09-18): 90 mm on a body 98 mm across, so 4 mm of glass shows each side.
// The drawing is 1 : 1, so the paper must be too.
const LABEL_SIDE = 0.090;
// ...and THE ARTWORK MUST BE THE 90 mm ONE. Until 21/9 this loaded `nhan-d-*`, the original layout D, drawn for a
// 44 x 44 mm label — and stretched it to 90 mm. That artwork still printed "50 ml". The 90 mm layout (`nhan-d90-*`,
// laid out for this size, larger type) is the one that prints "100 ml" — brand/chom/logo-src/nhan.py wires its
// DUNG_TICH = '100 ml' into layout_d90 only; layouts a, b, c, d and band still hard-code '50 ml'.
// So the size had been updated to Mike's choice and the file had not: one thing, two numbers (README 13). Caught
// because the label was readable for the first time once the bottle was drawn three times bigger.
const labelUrl = (season) => new URL(`../nhan/nhan-d90-${LABEL_SEASON[season] || 'xuan'}-mua.png`, import.meta.url).href;

// ?labelmm= tries another label size before anyone decides; without it the bottle is exactly as it ships
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

// The drawing above is in the glassworks' own millimetres: 98 x 52 mm body, 228 mm tall, which would hold 375 ml.
// Mike chose a 100 ml bottle (2026-09-18), so life size for this shape is the cube root of 100/375.5 of the drawing:
// 0.6434, a bottle 147 mm tall. The group is born at that size, so a season asking for `scale: 1` gets a real 100 ml
// flacon; core/world.js multiplies the season's own scale by it.
const LIFE = 0.6434;

function flaconBottle(labelTex, { capOff = false, season = 'xuan' } = {}) {
  let s = 0.3137;
  const R = () => (s = (s * 7.13 + 0.271) % 1);   // the same paint every load, so the checks can compare frames
  const g4 = (o) => withC(C.body, o);
  const b = new Batch();
  const { W, D, BASE, FLOOR, FILL, HEAD, yTop, yNeck } = FL;
  // the thick base: a plinth a little wider than the body, so its edge catches the light all the way round
  b.rbox(W + 0.005, BASE, D + 0.005, 0.007, V3(0, BASE / 2, 0), g4({ ...FG.base, seed: R() }));
  // the floor of the scent, seen through that thick glass: a dark line right above the base
  b.rbox(W, FLOOR, D, 0.005, V3(0, BASE + FLOOR / 2, 0), g4({ ...FG.floor, seed: R() }));
  // the scent itself, then the air above it: the level sits below the shoulder, as on a real bottle
  b.rbox(W, FILL, D, 0.006, V3(0, BASE + FLOOR + FILL / 2, 0), g4({ ...FG.deep, seed: R() }));
  b.rbox(W, HEAD, D, 0.006, V3(0, yTop - HEAD / 2, 0), g4({ ...FG.clear, seed: R() }));
  // the shoulder: a square frustum sloping in to the neck (a 4-sided lathe whose corners start at 45°, so its sides run
  // along the body's, then squashed to the body's depth).
  // Until 22/9 the 45° was given as the placing turn ([0, π/4, 0]) — and the placing matrix squashes FIRST and turns
  // after, so the squash was turned with it: the shoulder came out a rhombus lying across the bottle's diagonal, its base
  // reaching 49 mm in front of and behind a body 28.5 mm deep (drawing mm; core/qa bottle check, 22/9). From straight in
  // front it hid; from three-quarters one shoulder ran long and the other short, and the neck looked pushed to one side.
  // Mike saw it in Hạ, Thu and Đông; Xuân's close-up looks along the diagonal that hides it. The neck never moved.
  const rc = (W / 2) / Math.cos(Math.PI / 4);
  b.lathe([[rc, 0], [rc * 0.955, 0.005], [0.030, 0.032], [0.020, FL.SH]], V3(0, yTop, 0), g4({ ...FG.clear, seed: R() }), 4, [0, 0, 0], [1, 1, D / W], undefined, undefined, Math.PI / 4);
  // the neck, with the rim a stopper seats against
  b.lathe([[0.0165, 0], [0.0165, 0.011], [0.0205, 0.014], [0.0205, 0.018], [0.0165, FL.NECK]], V3(0, yNeck, 0), g4({ ...FG.clear, seed: R() }), 18);
  // the ground-glass stopper: the peg goes deep into the neck, the knob is a teardrop a hand can turn
  const STOP = [[0.0, 0], [0.0125, 0.002], [0.0135, 0.022], [0.0122, 0.026], [0.022, 0.031], [0.030, 0.040], [0.032, 0.047], [0.027, 0.056], [0.015, 0.062], [0.0, 0.064]];
  // closed, the stopper is part of the one glass shape (one draw); capOff builds it apart, still at its place on the neck
  if (!capOff) b.lathe(STOP, V3(0, yNeck, 0), g4({ ...FG.stop, seed: R() }), 18);
  const g = hero(b.merge(), { rimW: 2.4, rimOff: 1.5, cut: 0.42, glass: 1 });
  if (capOff) {
    const cb = new Batch();
    cb.lathe(STOP, V3(0, 0, 0), g4({ ...FG.stop, seed: R() }), 18);
    const cm = hero(cb.merge(), { rimW: 1.8, rimOff: 1.2, cut: 0.5, glass: 1 });
    cm.position.set(0, yNeck, 0);
    cm.name = 'cap';
    g.add(cm);
    g.userData.cap = cm;                         // the opening scene sets it down beside the bottle
  }

  // the label: Agent Logo's paper, centred on the straight part of the body — from the top of the thick base (y = BASE) to
  // where the shoulder starts (yTop). A 90 mm square then leaves 6 mm of glass above and below, and never rides onto the
  // sloping shoulder or over the edge of the base.
  const labelMid = (BASE + yTop) / 2;
  const side = Q.get('labelmm') ? +Q.get('labelmm') / 1000 : LABEL_SIDE;
  const label = bottleLabel(labelTex, side, side, labelUrl(season));
  label.position.set(0, labelMid, D / 2 + 0.001);
  g.add(label);
  // the light on the glass, painted: a long stroke down the body, the shoulder, the rim, and the pool in the thick base
  const strokes = [
    [bottleGlint(0.008, 0.058), -0.0435, 0.062, D / 2 + 0.0015, -0.03],
    [bottleGlint(0.034, 0.008), 0.010, yTop - 0.005, D / 2 + 0.0015, Math.PI / 2],
  ];
  for (const [m, x, y, z, rz] of strokes) { m.position.set(x, y, z); m.rotation.z = rz; g.add(m); }
  g.userData.trueScale = LIFE;                     // what `scale: 1` means for this shape: 100 ml, 147 mm tall
  // the light on the stopper travels with it when the scene sets it down
  const sh = bottleGlint(0.012, 0.026);
  sh.rotation.z = 0.12;
  if (g.userData.cap) { sh.position.set(-0.014, 0.042, 0.023); g.userData.cap.add(sh); }
  else { sh.position.set(-0.014, yNeck + 0.042, 0.023); g.add(sh); }
  return g;
}

export function labelTexture(season = 'X U Â N') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 360;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 360);
  g.fillStyle = '#fff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '500 176px "EB Garamond", Georgia, serif';
  g.fillText('Chớm', 256, 168);
  g.font = '500 50px "EB Garamond", Georgia, serif';
  g.fillText(season, 256, 292);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------------------------------------------------------------- the pieces every bottle is made of
// the paper label: brushed paper with the wordmark burned into it, lit by the world's key light (the world may point it at a
// lamp instead: see `bottle.labelLight`)
// `paper`: a drawn label to use instead of the burned-in one — the url of a PNG with a see-through background (Agent Logo's
// labels live in brand/chom/nhan/png/). It arrives after the first frame; until then the burned-in label is drawn, so the
// bottle is never blank. The paper keeps its own colours, and the world's light still falls on it.
export function bottleLabel(labelTex, w = 0.07, h = 0.05, paper = null) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      tLabel: { value: labelTex }, tBrush: U.tBrush, uKeyCol: U.uKeyCol, uLit: { value: 1.0 },
      tPaper: { value: BLANK() }, uPaper: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tLabel, tBrush, tPaper; uniform vec3 uKeyCol; uniform float uLit, uPaper; varying vec2 vUv;
      void main(){
        vec4 b = texture2D(tBrush, vUv * vec2(0.4, 0.3) + 0.2);
        if (uPaper > 0.5) {
          // the drawn label: its own paper and ink, torn at the edge, with the brush still running over it
          vec4 p = texture2D(tPaper, vUv);
          if (p.a + (b.a - 0.5) * 0.18 < 0.5) discard;
          gl_FragColor = vec4(p.rgb * (0.9 + 0.2 * b.b) * uLit * uKeyCol, 1.0);
          return;
        }
        float ink = texture2D(tLabel, vUv).r;
        vec3 paper = mix(vec3(0.9, 0.82, 0.68), vec3(1.0, 0.96, 0.86), smoothstep(0.4, 0.7, b.b));
        vec3 col = mix(paper * uLit, vec3(0.1, 0.07, 0.06), ink) * uKeyCol;
        float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        if (edge + (b.a - 0.5) * 0.06 < 0.0) discard;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  if (paper) loadPaper(paper, m);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}
// one pixel of nothing, so the sampler is never empty before the paper arrives
let BLANK_TEX = null;
function BLANK() {
  if (!BLANK_TEX) { BLANK_TEX = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); BLANK_TEX.needsUpdate = true; }
  return BLANK_TEX;
}
// the drawn label, brought down to 800 px on its long side: enough for the close-up, a fraction of the memory of the file
function loadPaper(url, m) {
  const img = new Image();
  img.onload = () => {
    const k = Math.min(1, 800 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 8;
    m.uniforms.tPaper.value = t;
    m.uniforms.uPaper.value = 1;
  };
  img.onerror = () => console.warn(`[chom-world] the label ${url} did not load; the burned-in one is used instead`);
  img.src = url;
}
// a painted highlight laid on the glass: a stroke of the brush, never a hard shine
export function bottleGlint(w = 0.02, h = 0.12) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { tStrokes: U.tStrokes, uCol: U.uHi },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tStrokes; uniform vec3 uCol; varying vec2 vUv;
      void main(){
        vec2 uv = vec2((1.0 + vUv.y) / 4.0, (3.0 + vUv.x) / 4.0);
        float m = texture2D(tStrokes, uv).r;
        float a = smoothstep(0.18, 0.3, m);
        if (a < 0.02) discard;
        gl_FragColor = vec4(uCol * (0.95 + 0.12 * m), a);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.renderOrder = 6;
  return mesh;
}

// ---------------------------------------------------------------- the shapes, by name
const SHAPES = { classic: classicBottle, flacon: flaconBottle };
// a new bottle registers itself here (core/bottle-<name>.js, imported by the season or by the core)
export function registerBottleShape(name, fn) { SHAPES[name] = fn; return name; }
export function bottleShapes() { return Object.keys(SHAPES); }
// the season's `bottle.shape` picks one; without it every season gets 'flacon', the bottle Mike chose on 2026-09-18
// (`?bottle=classic` brings the old one back for a look). An unknown name falls back to the first bottle, with a word in the console
export function buildBottle(labelTex, o = {}) {
  const name = o.shape || 'flacon';
  const fn = SHAPES[name];
  if (!fn) console.warn(`[chom-world] there is no bottle called "${name}"; the first one is used instead`);
  return (fn || SHAPES.classic)(labelTex, o);
}
