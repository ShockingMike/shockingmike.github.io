// Chớm world, core: the stage every season plays on. Read core/README.md first.
// A living painting seen down a Hanoi street. The season (seasons/<id>/season.js) builds its street, light and people;
// the core paints it, lights it (sun, roofs, shadows, beams, air), moves the camera through it on scroll, opens the bottle's
// notes, and gives the test hooks. Came from paint test G (prototypes/chom-paint-test-g), which Mike approved.
import * as THREE from 'three';
import { loadTextures, rng, load as loadTexture } from './brush.js';
import * as PAINT from './paint.js';
import { U, groundMaterial, skyMesh, backdrop, rainMesh, petalMesh, smokeMesh, sparkMesh, ribbonSmokeMesh, glowMesh, SHADOWS, NSH, NB } from './paint.js';
import * as BUILD from './build.js';
import { V3, REF, sketchAround, SKETCH_MATS, buildBottle, labelTexture, bottleShapes, buildHouses, gapRow } from './build.js';
import { buildCrowd, KINDS, crowdAnchor, prepareSheets } from './crowd.js';
import { balconyLife } from './balcony.js';
import { notesFromCopy, loadCopy } from './notes.js';

const T0 = performance.now();
const params = new URLSearchParams(location.search);
const DEV = params.get('dev') === '1';
const FIXED_T = params.has('t') ? parseFloat(params.get('t')) : null;
const FIXED_PUSH = params.has('push') ? THREE.MathUtils.clamp(parseFloat(params.get('push')) || 0, 0, 1) : null;
const SEASON_ID = (params.get('season') || 'xuan').toLowerCase().replace(/[^a-z]/g, '');
// embedded in the four-season page (journey.html): the parent drives the camera and composites the seasons
const EMBED = params.get('embed') === '1';
// loaded in the background of the four-season page (another season is being looked at): build in small slices
const BG = params.get('bg') === '1';
// made early by the four-season page (its drawing context and textures ready), but built only when the page says so
const WAIT_GO = params.get('hold') === '1';
const waitGo = () => new Promise((res) => {
  const go = () => { try { return !!window.parent.__chomGo?.[SEASON_ID]; } catch (e) { return true; } };
  const f = () => (go() ? res() : setTimeout(f, 60));
  f();
});
if (EMBED) document.documentElement.classList.add('embed');
const state = (window.__chom = { ready: false, stats: {}, season: SEASON_ID });
const bar = document.getElementById('bar');
const setProgress = (p) => { if (bar) bar.style.transform = `scaleX(${p})`; tellParent({ progress: p }); };
// The four-season page's entrance (core/journey.js "the page's entrance is kept quiet"): while the page layer flies the name
// home, a season that is still building waits at its next pause. The opening scene is never held (it is the one on screen).
const HOLDABLE = EMBED && params.get('opening') !== '1';
// What waits is the GPU's share: the whole warm-up (shaders sent and compiled, textures and targets made, the first draw of
// every new kind of shape — each one can stop the page for 50–120 ms). The rest of the build is the page's own thread
// only, so it goes on at a trickle (WORK_ENTRANCE ms a frame) instead of stopping: holding it all cost the first season
// 1.3 s, and a viewer who scrolls in at once then waited at the opening's stop.
const entranceHeld = () => { if (!HOLDABLE) return false; try { return !!window.parent.__chomHold; } catch (e) { return false; } };
const entranceHold = async () => { while (entranceHeld()) await new Promise((r) => setTimeout(r, 50)); };
// (true while a step is handing the GPU work: the brush textures at the start, then the whole warm-up)
let gpuStep = false;
// Building behind something the viewer is looking at: a season opened with &bg=1, and also the FIRST season once the
// four-season page is shown with an opening scene in front of it. (Until 21/9 the first season built at full pace, 24 ms
// a frame, with no care for the GPU, for the whole of its load — written when the first season was the first thing on
// screen. Since the opening scene came, the first season builds while the opening is being looked at; measured 21/9:
// its first new kinds of shape made the GPU stop the page for 72–135 ms at a time, right after the name landed.)
const shownElsewhere = () => { if (!HOLDABLE) return false; try { return !!window.parent.__journey?.ready; } catch (e) { return false; } };
// ...but not once the viewer is already walking in (past 40% of the opening's scroll) while it is still building: from
// then on every millisecond it holds back is a millisecond the viewer waits at the opening's stop. Measured 21/9 with a
// viewer who scrolls the moment the name lands: paced like a background season all the way, the first season kept the
// walk stopped 1.27 s (it also waits for a still page before each new kind of shape, and the viewer is not still).
const viewerComing = () => { if (!HOLDABLE || BG) return false; try { return (window.parent.__journey?.introRaw ?? 0) >= 0.4; } catch (e) { return false; } };
const inBackground = () => BG || (shownElsewhere() && !viewerComing());
// (right after the next frame is drawn: whatever runs next does not hold that frame up)
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))).then(() => (gpuStep ? entranceHold() : null));
const lin = (h) => new THREE.Color(h);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (u) => u * u * u * (u * (u * 6 - 15) + 10);
const D2R = Math.PI / 180;

// ---------------- the season and the people ----------------
// (if the season's own file cannot be fetched at all, say the words for it: the four-season page then carries on without it)
const season = (await import(`../seasons/${SEASON_ID}/season.js`).catch((e) => {
  console.error('[chom-world] season file failed to load', e);
  state.error = String((e && e.stack) || e);
  tellParent({ error: String((e && e.message) || e) });
  throw e;
})).default;
// who plays which main role: season.people is a folder name (it plays every role) or { role: folder };
// ?people=customer:khach,seller:placeholder overrides it for a test.
// The roles are the season's own: season.roles, else the keys of season.people, else Xuân's four
const ROLES = season.roles || (season.people && typeof season.people === 'object' ? Object.keys(season.people) : ['seller', 'customer', 'rider', 'walker']);
const castOf = () => {
  let c = {};
  if (typeof season.people === 'string') for (const r of ROLES) c[r] = season.people;
  else if (season.people) c = { ...season.people };
  const q = params.get('people');
  if (q && !q.includes(':')) for (const r of ROLES) c[r] = q;
  else if (q) for (const pair of q.split(',')) { const [r, f] = pair.split(':'); if (r && f) { c[r] = f; if (!ROLES.includes(r)) ROLES.push(r); } }
  return c;
};
const CAST = castOf();
const peopleMods = {};
// a folder that is missing (or fails to load) falls back to the placeholder people; the page never breaks for it
for (const f of [...new Set(Object.values(CAST))]) {
  try { peopleMods[f] = await import(`../people/${f}/people.js`); }
  catch (e) {
    if (DEV) console.warn(`[chom-world] people/${f} could not be loaded; its roles use the placeholder`, e);
    for (const r of Object.keys(CAST)) if (CAST[r] === f) CAST[r] = 'placeholder';
  }
}
if (Object.values(CAST).includes('placeholder') && !peopleMods.placeholder) {
  try { peopleMods.placeholder = await import('../people/placeholder/people.js'); } catch (e) { for (const r of Object.keys(CAST)) if (CAST[r] === 'placeholder') delete CAST[r]; }
}
state.cast = CAST;
// the notes panel's words: season.notes (English, or { en, vi }); the page layer may give others (setNotes) and pick the language
const notesByLang = season.notes && season.notes.en ? { ...season.notes } : { en: season.notes };
state.setNotes = (l, n) => { notesByLang[l] = n; return true; };
state.setLanguage = (l) => { fillNotes(notesByLang[l] || notesByLang.en, l); return true; };
fillNotes(notesByLang.en, 'en');
// the shared copy (page/copy.js) has the current words; the season's own are the last resort
if (!EMBED) {
  const C = await loadCopy();
  const n = notesFromCopy(C && C.en, SEASON_ID, 'en');
  if (n) { notesByLang.en = n; fillNotes(n, 'en'); }
  const nv = notesFromCopy(C && C.vi, SEASON_ID, 'vi');
  if (nv) notesByLang.vi = nv;
}

// ---------------- renderer ----------------
const canvas = document.getElementById('scene');
if (season.label) canvas.setAttribute('aria-label', season.label);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: EMBED });
const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(DPR);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.info.autoReset = false;
renderer.autoClear = false;
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const scene = new THREE.Scene();

// ---------------- the street and the viewpoint (from the season) ----------------
// every season looks down a street that runs along -z: kerbs and house fronts at these x
const ST = { kerbNear: 1.1, kerbFar: -3.6, wallNear: 5.2, wallFar: -5.0, ...(season.street || {}) };
const CAM = season.camera;
const FOV = CAM.fov ?? 44;
const EYE = V3(...CAM.eye);
const YAW0 = CAM.yaw ?? 0, PITCH0 = CAM.pitch ?? 0;
const fwdOf = (yaw, pitch) => V3(Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R));
const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.05, 1200);
camera.position.copy(EYE);
camera.lookAt(EYE.clone().add(fwdOf(YAW0, PITCH0)));
camera.updateMatrixWorld();
const FWD0 = fwdOf(YAW0, PITCH0);
function setRef() {
  REF.eye.copy(EYE);
  REF.fwd.copy(FWD0);
  REF.right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  REF.up.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  REF.px = (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / (size.y / DPR);
  U.uRefEye.value.copy(REF.eye); U.uRefFwd.value.copy(REF.fwd); U.uRefRight.value.copy(REF.right); U.uRefUp.value.copy(REF.up);
  U.uPx.value = REF.px;
}
setRef();

// scroll path (the season's): the camera eases along it as the page scrolls
const PUSH_PATH = new THREE.CatmullRomCurve3(CAM.path.map((p) => V3(...p)), false, 'centripetal');
// the window's size and whether it is a tall phone screen, kept (reading them every frame can force a layout of the page)
const view = { w: window.innerWidth, h: window.innerHeight };
let narrowNow = view.w / view.h < 0.95;
const narrowView = () => narrowNow;
const camYaw = (p) => (CAM.yawAt ? CAM.yawAt(p, narrowView(), { sm }) : YAW0);
const camPitch = (p, narrow = narrowView()) => (CAM.pitchAt ? CAM.pitchAt(p, { sm }, narrow) : PITCH0);

// ---------------- palette of the air and the light (from the season) ----------------
const PAL = season.palette;
const SUNC = season.sun;
const SUN = new THREE.Vector3(...SUNC.dir).normalize();
const SUN_COT = Math.sqrt(1 - SUN.y * SUN.y) / Math.max(SUN.y, 0.05);
{
  const set = (u, v, k = 1) => { if (v !== undefined) u.value.copy(lin(v)).multiplyScalar(k); };
  U.uKeyDir.value.copy(SUN);
  set(U.uKeyCol, SUNC.color, SUNC.intensity ?? 1.2);
  set(U.uSkyTop, PAL.skyTop); set(U.uSkyLow, PAL.skyLow);
  set(U.uKLit, PAL.lit, PAL.litK ?? 1.2); set(U.uKShade, PAL.shade);
  set(U.uAir, PAL.air); set(U.uAirSun, PAL.airSun); set(U.uFogCol, PAL.fog);
  set(U.uHi, PAL.hi); set(U.uDrip, PAL.drip); set(U.uMoss, PAL.moss); set(U.uPeel, PAL.peel);
  set(U.uRim1, PAL.rim1); set(U.uRim2, PAL.rim2);
  U.uAirNear.value = PAL.airNear ?? 12; U.uAirFar.value = PAL.airFar ?? 125; U.uAirMax.value = PAL.airMax ?? 0.8;
  // night seasons: sun: { on: false } (no sunlight, no sun shadows, no beams); palette.wet: 0 (dry) .. 1 (Xuân's drizzle)
  U.uSunOn.value = SUNC.on === false ? 0 : 1;
  U.uWet.value = PAL.wet ?? 1;
}
const SUN_ON = SUNC.on !== false;
if (season.nearFade) U.uNearFade.value.set(...season.nearFade);
const CLEAR = new THREE.Color(PAL.clear ?? '#ece0d0');

// ---------------- build ----------------
let TEX, people = null, crowdBg = null, bottle = null, out = null;
const glows = [];
const ribbons = [];                 // the bands of scent (core.fx.ribbonSmoke): the opening shows the spring inside them
const sketchQueue = [];
const BOT = season.bottle || null;
const BOTTLE_AT = BOT ? V3(...BOT.at) : V3(0, -50, 0);
// How much bigger than life the bottle is drawn in the four seasons.
//
// 18/9: Mike settled the bottle at its real size, 100 ml, 147 mm tall, and turned down enlarging it.
// 21/9: Mike changed his mind after looking at the real page — the bottle was too small to find — and chose ×3 on the
//       comparison page (core/qa/size.html): "không cần phải giống kích cỡ ngoài đời thật, ta đã có trang đầu tiên để
//       viewer thấy kích cỡ của chai. Ở các mùa chai cần to hẳn để có thể nhận diện bấm vào."
//
// So the OPENING SCENE STAYS AT LIFE SIZE — that is the whole reason the seasons are allowed not to: the opening is where
// the viewer learns how big the bottle really is, next to the oil lamp. Enlarge it there and the argument falls apart.
//
// Mike chose ×3 knowing what it costs, and it was put to him before he chose: on a phone ×3 measures the same as life
// size (own share 48% both), because a bottle that fills most of a small frame has nothing left around it to stand out
// against; the peak on a phone is ×1.6 (57%). On a computer ×3 is worth +29 points (45% -> 74%). Do not "fix" this back
// to 1.6 for the phone's sake — that is a decision already made with the numbers on the table.
const BOTTLE_ENLARGE_CHOSEN = 3;
const IS_OPENING = params.get('opening') === '1' || !!season.opening;   // (OPENING itself is defined further down)
// (?bscale=<k> multiplies on top, to see what the bottle looks like at another size before anyone decides)
const BOTTLE_SCALE = (BOT?.scale ?? 1.9) * (IS_OPENING ? 1 : BOTTLE_ENLARGE_CHOSEN) * (+params.get('bscale') || 1);
// how the bottle's white line lives: [way, how fast, how much]. 'a' = the hand draws it again and again (a boil at 9 a
// second), 'b' = a light runs round it once every few seconds. Still when the machine asks for less motion.
let bottleLine = null;
let lineOpts = null;            // the recipe the stroke was drawn with, handed on by lineLook() (the page layer draws to match)
const CALM = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
// Mike chose way 'a' (the hand draws it again and again) on 18/9, and two and a half times the first draft's weight.
// Both choices live here, not in each season's file, so no season can be left behind. A season that names its own
// lineMove / lineWidth still wins, and ?sketchmove= / ?linew= win over everything (the preview page).
const LINE_MOVE_CHOSEN = 'a';
// ONE fixed weight, not one that follows how big the bottle happens to be on screen. That was proposed on 21/9 with
// the measurements behind it — a thicker line is worth +10 to +20 points of the bottle's own share on a computer
// (Đông 35% -> 45% at 6 -> 55% at 12) and slightly negative on a phone — and MIKE TURNED IT DOWN. The numbers being
// on its side does not make it allowed: this is a question of how the thing looks, and how it looks is Mike's to
// decide. Reopening it needs a new sentence from Mike, not these numbers again. (core/DANG-LAM-DO.md has the tables.)
const LINE_W_CHOSEN = 2.5;
// What the line wears, scene by scene. Mike chose this on 21/9: ink where the scene is bright, white where it is dark —
// the same answer the logo kit reached with its ink and ivory versions.
//
// Two different questions have to come out right at once, and they pull against each other:
//   1. can the line be seen against the ground behind it   (core/qa/line.mjs — share of the line reaching 3:1)
//   2. is the bottle still the first place the eye goes    (core/qa/squint.mjs — the bottle's rank)
// Ink wins (1) on a bright scene. But ink also takes away the white that makes the bottle jump out of a dark corner, so
// it can lose (2). Thu is exactly that case, and it only shows on a phone, where the bottle is small:
//
//        │ line seen (computer / phone) │ bottle's rank (computer / phone)
//   Thu  │ white 100% / 66%             │ 1 / 1
//        │ ink    98% / 72%             │ 1 / 3   ← ink costs Thu the gate
//        │ halo  100% / 83%             │ 1 / 1   ← best of the four, both ways
//
// So Thu wears 'c' — white with a soft dark breath behind it — not ink. That is not a change of Mike's mind, it is his
// rule ("whichever reads") applied to a number that only appeared after he chose. It is flagged in the report and the
// preview page shows all four, so overruling it is one click.
//
// A scene this table has never heard of gets white and says so out loud, in the console and in lineLook().styleGuessed —
// because the way this goes wrong is silently: on 18/9 two of Mike's choices sat in URL parameters and the real page ran
// three days without them, and nobody knew because nobody measured. core/qa/line.mjs now fails a scene whose line does
// not hold, so a scene added later cannot quietly inherit the wrong one.
// 21/9, later the same day: BACK TO WHITE EVERYWHERE, and here is the measurement that turned it round.
//
// The ink was chosen off core/qa/line.mjs, which asks "can the stroke be read against the ground behind it". That is
// the wrong question. Mike looked at the real page and said Đông was working and the others were not standing out —
// and Đông is the white one. Measured as "how much of the picture at the bottle's own spot is the bottle"
// (core/qa/squint.mjs, own share), on the two hardest scenes:
//
//              no line at all   white 2.5   white 6   white 10   INK (what ink gave us)
//   Xuân            −2%            1%         5%         8%         −11%
//   Hạ               7%           10%        14%        19%           2%
//   Đông            24%           35%
//
// In Xuân the ink line is worse than having NO LINE AT ALL: it makes the bottle blend in further, because an ink
// outline is what every other hand-drawn thing in the scene already wears. White is the one thing nothing else wears —
// that is the whole point of it being the bottle's mark, and it is why Đông reads.
//
// Two more things that table says, and they matter more than the colour:
//   · The line is a small lever. Everything it can do is worth about 3 to 11 points. Đông's bottle scores 24% with no
//     line at all, because its scene is dark and quiet behind the glass. THE SCENE IS THE BIG LEVER, not the stroke.
//   · So Xuân, Hạ and Thu cannot be fixed from here. They need the surface the bottle stands on made darker and
//     quieter — the seasons' work, not the core's.
const LINE_STYLE_BY_SCENE = { xuan: '', ha: '', thu: '', dong: '', mocua: '' };
let lineStyleGuessed = false;
function lineStyleForScene() {
  const s = LINE_STYLE_BY_SCENE[SEASON_ID];
  if (s !== undefined) return s;
  lineStyleGuessed = true;
  console.warn(`[chom] no one has said what colour the bottle's line should wear in "${SEASON_ID}". Falling back to white. `
    + 'Add it to LINE_STYLE_BY_SCENE in core/world.js and measure it with core/qa/line.mjs — white does not hold on a bright scene.');
  return '';
}
function sketchMove(kind = params.get('sketchmove') || BOT?.lineMove || LINE_MOVE_CHOSEN) {
  if (CALM) return null;
  const k = String(kind).toLowerCase();
  if (k === 'a' || k === 'boil' || k === '1') return [1, 9, 1.8, 0];
  if (k === 'b' || k === 'run' || k === '2') return [2, 2.4, 1.0, 0];
  return null;
}
// the preview page switches between them live
state.setLineMove = (kind) => {
  const m = sketchMove(kind) || [0, 0, 0, 0];
  if (!bottleLine) return false;
  bottleLine.material.uniforms.uMove.value.set(...m);
  update(0); renderFrame();
  return { kind, move: m, still: CALM };
};
state.lineMove = () => (bottleLine ? [...bottleLine.material.uniforms.uMove.value.toArray()] : null);
// Turn the line off and on inside one frame. A check that wants to know what is *behind* the line must have the very same
// frame with it and without it — two page loads are two different frames, and the difference would be read as the line.
state.setLine = (on) => {
  if (!bottleLine) return false;
  bottleLine.userData.forceOff = !on;
  update(0); renderFrame();
  return true;
};
// Take the bottle out of the scene entirely (its line with it), leaving everything else exactly where it was. This is how
// a check finds out whether it is really looking at the bottle: shoot the same frame with it and without it, and see how
// much changes. A check that scores a box around the bottle can be scoring the lamp beside it and never know.
state.setBottle = (on) => {
  if (!bottle) return false;
  bottle.visible = !!on;
  // ...and everything that belongs to the bottle but does not live inside it. The glint is the sun catching the glass;
  // it is named bottle.glint and carries userData.onBottle, but it is added to the SCENE (it is a glow, and glows are
  // billboards the scene owns), so hiding the bottle's group left it burning exactly where the bottle had been. Every
  // check built on "take the bottle away" was reading that spark as part of the background — and Đông, the one season
  // that declares no glint, was the only one measured cleanly. It is the season the 30% bar is anchored to.
  for (const g of glows) if (g.userData && g.userData.onBottle) g.visible = !!on;
  update(0); renderFrame();
  return true;
};
// Paint the line in one flat colour, leaving everything else about it alone (its boil, its dryness, its width). Shooting
// the same frame with the line pure black and pure white tells a check exactly which pixels the line covers and how much
// of each — even where the line and the ground behind it are the same brightness and the line cannot be seen at all.
// lineProbe(null) puts the look back.
let lineWas = null;
state.lineProbe = (hex) => {
  if (!bottleLine) return false;
  const u = bottleLine.material.uniforms;
  if (hex === null || hex === undefined) {
    if (lineWas) { u.uColor.value.copy(lineWas.color); u.uEdge.value.copy(lineWas.edge); lineWas = null; }
  } else {
    if (!lineWas) lineWas = { color: u.uColor.value.clone(), edge: u.uEdge.value.clone() };
    u.uColor.value.set(hex);
    u.uEdge.value.set(0, 0, 1, 0);          // no ink lip, no dark breath: the probe must be the stroke and nothing else
  }
  update(0); renderFrame();
  return true;
};
// What the line is actually wearing right now — asked of the page, never read off a season's file (README 13, rule 1).
//
// This is also the recipe the PAGE LAYER draws its own strokes from (the note and its arrow pointing at the bottle,
// 21/9). Anything a stroke needs in order to look like it came out of the same pen belongs here, so nobody has to copy
// a number across: the weight, the wobble, how far the stroke rides outside the shape, how far its ends drift, how
// many loops, the seed, and the dryness. If the page layer ever needs something this does not say, ADD IT HERE —
// three times today a single thing ended up with two numbers in two files (the bottle's mouth, the root of the smoke,
// the hit button), and each time it was because somebody could not read the real one.
//
// And the BOIL MUST SHARE A CLOCK. The stroke is redrawn on `floor(t * perSecond)` where t is the world's own time —
// not the wall clock, and not each drawing counting its own. Two strokes boiling out of phase read as two different
// objects, which is exactly what the note and the bottle must not look like.
state.lineLook = () => {
  if (!bottleLine) return null;
  const u = bottleLine.material.uniforms;
  const m = [...u.uMove.value.toArray()];
  const o = lineOpts || {};
  const t = u.uTime.value;
  return {
    // the pen
    strokeWidthPx: +(o.width ?? 0).toFixed(3),        // before the per-loop jitter below
    loopWidthJitter: [0.8, 1.2],                      // each loop is drawn at width x this (build.js sketchAround)
    alpha: 0.85, loopAlphaJitter: [0.75, 1.0],
    dryness: u.uDry.value,                            // 1 = as broken as the season's own sketch lines, 0 = solid
    loops: o.loops ?? null,
    seed: o.seed ?? null,
    // how the stroke sits around the shape it is drawn on, in screen pixels
    ridesOutsidePx: o.off ?? null,                    // [least, most] outside the silhouette
    wobblePx: o.wob ?? null,                          // how far it wanders in and out along its length
    endsDriftPx: o.lift ?? null,                      // the ends lift away, like a hand coming off the paper
    // the boil — share this clock, do not count your own
    boil: {
      way: m[0] === 1 ? 'a' : m[0] === 2 ? 'b' : 'still',
      perSecond: m[1], amount: m[2],
      t: +t.toFixed(4),                               // the world's clock, the one the stroke is drawn against
      frame: Math.floor(t * Math.max(m[1], 1)),       // redraw when this changes, and everything stays in phase
    },
    // (widthMult, widthPx, move, moveWay and dry used to be repeated here as well. They were the SAME numbers under a
    // second set of names — the exact fault this whole object exists to prevent — so they are gone. Weight is
    // strokeWidthPx, the boil is boil, the dryness is dryness.)
    widthMult: +(+params.get('linew') || (BOT && BOT.lineWidth) || LINE_W_CHOSEN).toFixed(3),   // what ?linew= was set to; strokeWidthPx is 1.5x this
    style: (params.get('linestyle') ?? (BOT && BOT.lineStyle) ?? LINE_STYLE_BY_SCENE[SEASON_ID] ?? '') || '(plain white)',
    styleFrom: params.get('linestyle') !== null ? 'the address bar' : (BOT && BOT.lineStyle) !== undefined ? 'the season' : LINE_STYLE_BY_SCENE[SEASON_ID] !== undefined ? 'the core, chosen for this scene' : 'nowhere — a guess',
    styleGuessed: lineStyleGuessed,          // true = no one has said; core/qa/line.mjs fails on this
    color: '#' + u.uColor.value.getHexString(), ink: '#' + u.uInk.value.getHexString(),
    edge: [...u.uEdge.value.toArray()], fade: u.uFade.value, visible: bottleLine.visible,
  };
};
// Every sketch loop in the scene and what colour it is, with the thing it hangs on: the white line is meant to be the
// bottle's alone, and this is how a check says so instead of looking at the picture.
state.sketchLines = () => {
  const mats = new Set(SKETCH_MATS);
  const out = [];
  scene.traverse((o) => {
    if (!o.isMesh || !mats.has(o.material)) return;
    let host = o.parent, name = '';
    for (let a = host; a && a !== scene; a = a.parent) { if (a.name) { name = a.name; break; } }
    const c = o.material.uniforms.uColor.value;
    out.push({ on: name || '(unnamed)', isBottleLine: o === bottleLine, color: '#' + c.getHexString(), luma: +(0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b).toFixed(3), visible: o.visible });
  });
  return out;
};
// The three ways of making the line hold on a bright scene, switched live for the preview page (README 15):
// '' the plain white line · 'a' white with a thin ink lip · 'b' the whole line in ink · 'c' white with a soft dark breath.
// Thickness is baked into the ribbon when it is built, so only ?linew= changes that — it needs a reload.
state.setLineStyle = (s) => {
  if (!bottleLine) return false;
  const k = String(s || '').toLowerCase();
  const u = bottleLine.material.uniforms;
  const ink = (BOT && BOT.lineInk) || '#2b2320';
  const white = (BOT && BOT.lineColor) || '#fbf5e8';
  u.uColor.value.set(k === 'b' ? ink : white);
  u.uEdge.value.set(...(k === 'a' ? [1, 1, 1, 0] : k === 'c' ? [3, 0.85, 1, 0] : [0, 0, 1, 0]));
  u.uInk.value.set(ink);
  update(0); renderFrame();
  return { style: k, color: k === 'b' ? ink : white };
};
const BOTTLE_RY = BOT?.ry ?? 0;

async function loadFont() {
  if (!document.fonts || !document.fonts.load) return;
  const t = new Promise((r) => setTimeout(r, 3000));
  const list = [['500 92px "EB Garamond"', 'Chớm ' + (BOT?.labelFontText ?? 'XUÂN')], ...(season.fonts || [])];
  try { await Promise.race([Promise.all(list.map(([f, s]) => document.fonts.load(f, s))), t]); } catch (e) { /* system fonts */ }
}

// the far fronts as the sun sees them: roof height along the street (world z), one texel per 15 cm.
// Every material reads it (sunMask) to know where the sun reaches.
function roofTexture(tops, o = {}) {
  const RF = { zMin: -130, zSpan: 150, maxH: 16, n: 1024, beyond: tops.length ? -100 : -1e9, beyondH: 8, wallX: ST.wallFar, ...o };
  const data = new Uint8Array(RF.n * 4);
  const hAt = new Float32Array(RF.n).fill(-1);
  for (const [za, zb, top] of tops) {
    for (let i = 0; i < RF.n; i++) {
      const z = RF.zMin + ((i + 0.5) / RF.n) * RF.zSpan;
      if (z >= za && z <= zb) hAt[i] = Math.max(hAt[i], top);
    }
  }
  for (let i = 0; i < RF.n; i++) {
    const z = RF.zMin + ((i + 0.5) / RF.n) * RF.zSpan;
    const h = hAt[i] >= 0 ? hAt[i] : (z < RF.beyond ? RF.beyondH : 0);
    data[i * 4] = Math.round(THREE.MathUtils.clamp(h / RF.maxH, 0, 1) * 255);
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, RF.n, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  U.tRoof.value = t;
  U.uRoof.value.set(RF.zMin, RF.zSpan, RF.wallX, RF.maxH);
  state.stats.roofs = tops.length;
}
roofTexture([]);   // until the season gives its roofs: the sun reaches everywhere

let capsDone = false;
function setCapsules(list) {
  capsDone = true;
  let caps = list.slice();
  // the main people's painted capsules, only if they are not in the shadow map
  if (people && people.shadows && peopleCasters === 0) {
    const heights = [1.15, 1.62];
    caps = [...people.shadows.map((s, i) => [s[0], s[1], Math.min(s[2], s[3]) * 0.95, heights[i] ?? 1.5]), ...caps];
  }
  caps.sort((a, b) => Math.hypot(a[0] - EYE.x, a[1] - EYE.z) - Math.hypot(b[0] - EYE.x, b[1] - EYE.z));
  for (let i = 0; i < NSH; i++) SHADOWS.value[i].set(0, 0, 0, 0);
  caps.slice(0, NSH).forEach((s, i) => SHADOWS.value[i].set(s[0], s[1], s[2], s[3] * SUN_COT));
  state.stats.shadows = Math.min(caps.length, NSH);
}

let peopleCasters = 0;
const peopleInfo = [];
// Whole-number vertex data that the shader reads as floats (a skinned mesh's skinIndex, as a .glb brings it) makes the GPU
// build a special shader on the page's own thread the first time the mesh is drawn (a stall of 50-250 ms): as floats, the
// shader it already built in the background fits. The numbers stay exact.
// (it sets a NEW attribute, so one already sent to the GPU as bytes is never overwritten in place: the new one gets its own
// buffer. Returns how many it changed. Whole numbers meant AS whole numbers — gpuType IntType — are left alone.)
function floatAttributes(root) {
  let n = 0;
  root.traverse((o) => {
    const g = o.geometry;
    if (!g || !g.attributes) return;
    for (const [k, a] of Object.entries(g.attributes)) {
      if (a.isInterleavedBufferAttribute || a.normalized || !a.array || a.array instanceof Float32Array || a.gpuType === THREE.IntType) continue;
      if (!(a.array instanceof Uint8Array || a.array instanceof Uint16Array || a.array instanceof Uint32Array || a.array instanceof Int8Array || a.array instanceof Int16Array || a.array instanceof Int32Array)) continue;
      const f = new THREE.BufferAttribute(new Float32Array(a.array), a.itemSize, false);
      f.usage = a.usage;
      g.setAttribute(k, f);
      n++;
    }
  });
  return n;
}
// who plays which role, for the people folders to reach each other (core.people)
const peopleByRole = {}, peopleWaiting = {};
const peopleRegistry = {
  roles: ROLES,
  cast: CAST,
  order: [],
  get: (role) => peopleByRole[role] ?? null,
  whenReady: (role) => (peopleByRole[role] ? Promise.resolve(peopleByRole[role]) : new Promise((res) => (peopleWaiting[role] ||= []).push(res))),
};
// per folder: build time, update time (average since the last call), what it added to the scene
state.peopleInfo = () => peopleInfo.map((i) => {
  const r = { folder: i.folder, roles: i.roles, buildMs: i.buildMs, updateMs: +(i.ms / Math.max(1, i.n)).toFixed(3) };
  i.ms = 0; i.n = 0;
  return r;
});
state.peopleRoots = (folder) => peopleInfo.filter((i) => i.folder === folder).flatMap((i) => i.roots);
function makeApi(R, fontP) {
  return {
    THREE, U, R, V3, sm, lin, rng, street: ST, sun: SUN, sunCot: SUN_COT, eye: EYE, yaw: YAW0,
    paint: PAINT, build: BUILD, kinds: KINDS, stats: state.stats,
    progress: setProgress, nextFrame,
    // await core.slice() inside a long loop: returns at once while the current slice of work has time left, else waits for
    // the page's next frame (a season built in the background then never holds a frame up for long)
    slice,
    // a row of houses turned to face the street: side = +1 for the near fronts (facing -x), -1 for the far fronts (facing +x).
    // o.gap = true builds a gap (lane, low and narrow houses) instead of tube houses. o.tops collects roof heights (far row).
    // o.balconies (an array) collects every balcony of the row, in world space, for core.balconyLife
    houseRow(kb, mass, fine, side, xWall, zFrom, zTo, o = {}) {
      const M = new THREE.Matrix4().makeRotationY(side > 0 ? -Math.PI / 2 : Math.PI / 2).setPosition(xWall, 0, 0);
      for (const b of [kb, mass, fine]) b.pre = M;
      const x0 = side > 0 ? zTo : -zFrom, x1 = side > 0 ? zFrom : -zTo;
      const local = o.balconies ? [] : null;
      const gl = (o.gap || o.low) ? (gapRow(kb, mass, fine, R, { x0, x1, ...o, balconies: null }), []) : buildHouses(kb, mass, fine, R, { z: 0, x0, x1, ...o, balconies: local });
      for (const b of [kb, mass, fine]) b.pre = null;
      if (local) {
        const along = new THREE.Vector3(1, 0, 0).transformDirection(M), out = new THREE.Vector3(0, 0, 1).transformDirection(M);
        for (const b of local) o.balconies.push({ at: b.at.applyMatrix4(M), along, out, w: b.w, y: b.y, name: `balcony@${b.at.x.toFixed(1)},${b.y.toFixed(1)},${b.at.z.toFixed(1)}` });
      }
      return gl.map((p) => p.applyMatrix4(M));
    },
    // balcony life (core/balcony.js): people and things on the balconies. Returns { people, report, mesh, ... };
    // pass life.people on to core.crowd together with the street crowd
    // how well the main view sees a point: 0 (off screen or behind) .. 1 (well inside the frame, near)
    seen(p) {
      const v = p.clone().project(camera);
      if (v.z > 1 || Math.abs(v.x) > 0.92 || v.y > 0.92 || v.y < -0.9) return 0;
      const d = p.distanceTo(EYE);
      return (1 - 0.35 * Math.abs(v.x)) * Math.min(1, 14 / d);
    },
    balconyLife(balconies, spec = {}) {
      const up = new THREE.Vector3(0, 1.3, 0);
      const life = balconyLife(balconies, { view: (b) => this.seen(b.at.clone().add(up).addScaledVector(b.out, 0.35)), ...spec });
      if (!life.batch.empty) {
        life.mesh = new THREE.Mesh(life.batch.merge(), PAINT.knifeMaterial({ wind: true }));
        life.mesh.frustumCulled = false;
        scene.add(life.mesh);
        addCasters(life.mesh);
      }
      if (life.smoke.length) life.smokeMesh = this.fx.smoke({ sources: life.smoke, n: life.smoke.length * 16 });
      for (const e of life.embers) this.glow('#ff5a2a', 0.04, 0.7, e);
      state.stats.balcony = life.count;
      state.balconyReport = life.report;
      return life;
    },
    // tops from a far row built by houseRow (local x along the row) -> world z ranges
    farTops: (tops) => tops.map(([x0, x1, top]) => [-x1, -x0, top]),
    sunRoofs: roofTexture,
    sky(colors) { const s = skyMesh(colors); scene.add(s); return s; },
    backdrop(o, pos = [0, 0, -135], ry = 0) { const m = backdrop(o); m.position.set(...pos); m.rotation.y = ry; scene.add(m); return m; },
    ground(o = {}) {
      const gm = groundMaterial({ kerbA: ST.kerbFar, kerbB: ST.kerbNear, wallA: ST.wallFar, wallB: ST.wallNear, across: new THREE.Vector2(Math.cos(YAW0 * D2R), Math.sin(YAW0 * D2R)), ...o });
      const g = new THREE.Mesh(new THREE.PlaneGeometry(...(o.size || [90, 150])).rotateX(-Math.PI / 2), gm);
      g.position.set(...(o.at || [0, 0, -62]));
      g.frustumCulled = false;
      scene.add(g);
      return g;
    },
    // warm lights the shaders know (0..5). 0 is a shaded lamp that points down (a cone)
    light(i, pos, radius, color, k = 1) {
      U.uBulb.value[i].set(pos.x, pos.y, pos.z, radius);
      U.uBulbCol.value[i].copy(lin(color)).multiplyScalar(k);
    },
    // a lamp (street lamp, brazier, altar light, shop mouth): lights the ground, walls, people, crowd and balconies, in painted
    // steps. o = { radius, color, k, shadow: true (its own shadow map, up to 3 lamps), cone: { dir: [x,y,z], outer: deg, inner: deg },
    //   shadowSize: 1024 }. Every moving thing (and whatever core.addLampCasters adds) casts its shadow from the lamp.
    lamp(i, pos, o = {}) { return addLamp(i, pos, o); },
    addLampCasters(root) { addCasters(root, { lampOnly: true }); },
    // a lamp's glow: light added over what is behind (o = { maxScreen: share of the view's height it may cover, strength })
    glow(color, size, seed, pos, o = {}) { const g = glowMesh(color, size, seed, o); g.position.copy(pos); scene.add(g); glows.push(g); return g; },
    async bottle() {
      await fontP;
      // which bottle: season.bottle.shape names one of core/bottle.js's shapes (README 15); without it, the first one
      // ?bottle=<shape> tries another bottle in this season without touching it (README 15)
      bottle = buildBottle(labelTexture(BOT.label ?? 'X U Â N'), { capOff: BOT.capOff === true, shape: params.get('bottle') || BOT.shape, season: SEASON_ID });
      bottle.position.copy(BOTTLE_AT);
      bottle.rotation.y = BOTTLE_RY;
      // a shape may say what `scale: 1` means for it (bottle.js: a real 100 ml flacon, not the drawing's own millimetres)
      bottle.scale.setScalar(BOTTLE_SCALE * (bottle.userData.trueScale ?? 1));
      if (BOT.glow) bottle.userData.main.material.uniforms.uGlass.value = BOT.glow;
      // the label is lit by bottle.labelLight ({ color, k }); at night without it, by the nearest lamp
      bottle.traverse((o) => {
        if (!o.material?.uniforms?.tLabel) return;
        if (BOT.labelLight) o.material.uniforms.uKeyCol = { value: lin(BOT.labelLight.color ?? '#ffe0b0').multiplyScalar(BOT.labelLight.k ?? 1) };
        else if (!SUN_ON) {
          const at = BOTTLE_AT;
          let best = -1, bd = 1e9;
          for (let i = 0; i < NB; i++) { const b = U.uBulb.value[i]; const d = Math.hypot(b.x - at.x, b.y - at.y, b.z - at.z); if (b.y > -50 && d < bd && U.uBulbCol.value[i].r + U.uBulbCol.value[i].g > 0) { bd = d; best = i; } }
          if (best >= 0) o.material.uniforms.uKeyCol = { value: U.uBulbCol.value[best].clone().multiplyScalar(Math.min(1.6, 1.2 / Math.max(0.3, U.uBulbCol.value[best].r))) };
        }
      });
      scene.add(bottle);
      if (BOT.glint) {
        // the sun catching the glass: a small hot spark, held on the bottle (it follows the bottle when it turns).
        // It must stay SMALLER THAN THE BOTTLE IS WIDE. On 21/9 three seasons were asking for 0.16 m of spark on a
        // bottle 0.098 m across — not light on the glass but a white star sitting over it, which is exactly the thing
        // README 13 forbids ("brighten the thing itself and it burns out"). A season that asks for too much gets the
        // widest that still reads as a highlight, and is told so.
        // the glass's real width, read off the thing just built — never a number written in here (README 13, rule 1)
        bottle.updateMatrixWorld(true);
        const glassBox = new THREE.Box3().setFromObject(bottle.userData.main || bottle);
        const wide = Math.max(glassBox.max.x - glassBox.min.x, glassBox.max.z - glassBox.min.z) || 0.098;
        // The line is the width of the glass itself, not some fraction of it: a spark narrower than the bottle is a
        // highlight, a spark wider than the bottle is a second object sitting on top of it. 0.16 m on a 0.098 m bottle
        // was the fault; 0.05 on 0.089 is a perfectly good highlight and must not be nagged about — a warning on every
        // page load is not a warning, it is noise, and qa.mjs counts console warnings as failures.
        const asked = BOT.glint.size ?? 0.05;
        const cap = wide;
        if (asked > cap) console.warn(`[chom] ${SEASON_ID}: bottle.glint.size ${asked} m is wider than the glass itself (${wide.toFixed(3)} m across). `
          + `A spark bigger than the thing it sits on stops being light on the glass and becomes a white blob over it. Using ${cap.toFixed(3)}.`);
        const g = glowMesh(BOT.glint.color ?? '#fff2d0', Math.min(asked, cap), 0.9, { maxScreen: 0.3, strength: BOT.glint.strength ?? 1 });
        g.userData.onBottle = V3(...(BOT.glint.at ?? [-0.03, 0.13, 0.03]));
        g.renderOrder = 7;
        scene.add(g);
        glows.push(g);
      }
      return bottle;
    },
    // the people folders, for each other (README 11): get(role) -> what that role's folder returned (its api too), once built;
    // whenReady(role) -> a promise of the same; order: the folders in build order
    people: peopleRegistry,
    // the main people: every folder in the cast builds its roles. The placeholder first (so the random stream stays as in G),
    // then the others in the order of their first role in season.roles (else the keys of season.people). Each frame they are
    // updated in that same order, then each folder's lateUpdate(t, dt, camera) runs, in the same order.
    // Whatever a folder adds to the scene casts the sun shadow (skinned .glb meshes too).
    async loadPeople(layout) {
      const firstRole = (f) => { const i = ROLES.findIndex((r) => CAST[r] === f); return i < 0 ? 1e9 : i; };
      const folders = Object.keys(peopleMods).sort((a, b) => (a === 'placeholder' ? -1 : b === 'placeholder' ? 1 : firstRole(a) - firstRole(b)));
      if (!folders.length) return null;
      const parts = [];
      const n0 = casters.length;
      for (const f of folders) {
        const roles = ROLES.filter((r) => CAST[r] === f);
        // (each folder starts in a fresh slice of work; inside, the folder yields with await core.slice())
        await pauseNow();
        const before = new Set(scene.children);
        const tb = performance.now();
        watchSlices(f);                       // how long this folder goes between yields (core/qa/perf-people.mjs)
        const part = await peopleMods[f].buildPeople(scene, R, { ...layout, roles }, this);
        stopWatchingSlices();
        const roots = scene.children.filter((c) => !before.has(c));
        for (const o of roots) { addCasters(o); o.userData.chomPerson = f; floatAttributes(o); }
        // for core/qa/perf-people.mjs: what each folder added and what it costs
        if (part) {
          parts.push(part);
          peopleInfo.push({ folder: f, roles, roots, buildMs: Math.round(performance.now() - tb), part, ms: 0, n: 0 });
          peopleRegistry.order.push(f);
          for (const r of roles) {
            peopleByRole[r] = part;
            for (const res of peopleWaiting[r] || []) res(part);
            delete peopleWaiting[r];
          }
        }
      }
      peopleCasters = casters.length - n0;
      people = {
        parts,
        shadows: parts[0]?.shadows,
        sketch: parts.flatMap((p) => p.sketch || []).filter(([o]) => o.visible !== false),
        movers: (t) => parts.flatMap((p) => (p.movers ? p.movers(t) : [])),
        solids: parts.flatMap((p) => p.solids || []),
        update: (t, dt) => {
          for (const info of peopleInfo) {
            const t0 = performance.now();
            info.part.update(t, dt, camera);
            info.ms += performance.now() - t0; info.n++;
          }
          for (const info of peopleInfo) {
            if (!info.part.lateUpdate) continue;
            const t0 = performance.now();
            info.part.lateUpdate(t, dt, camera);
            info.ms += performance.now() - t0;
          }
        },
      };
      return people;
    },
    crowd(list, o = {}) {
      crowdBg = buildCrowd(scene, { list, ...o });
      crowdBg.mesh.userData.chomPerson = 'crowd';
      state.stats.crowd = crowdBg.count;
      addCasters(crowdBg.mesh);
      return crowdBg;
    },
    // a point on a crowd figure (e.g. the smoke of a sitPipe): crowdAnchor(entry, 'smoke') -> Vector3
    crowdAnchor,
    addCasters,
    // heroes that should show the moving things' sun shadows (a lotus leaf under a boat, a stall top): receiveShadows(obj)
    receiveShadows(root) { root.traverse((o) => { const u = o.material?.uniforms; if (u && u.uRecv) u.uRecv.value = 1; }); },
    // thin things that the scrolling camera passes close to (hanging bulbs, poles): fade them out between near and far metres.
    // Never people (README 6c): the crowd, the balcony people and the main people are skipped; keep them 2.2 m from the lens instead
    nearFade(root, range = [0.8, 2.0]) {
      const walk = (o) => {
        if (o.userData.chomPerson) { if (DEV) console.warn(`[chom-world] ${SEASON_ID}: core.nearFade skipped ${o.userData.chomPerson === 'crowd' ? 'the crowd' : 'people/' + o.userData.chomPerson} (people never fade near the lens)`); return; }
        const u = o.material?.uniforms;
        if (u && u.uNear) u.uNear.value.set(...range);
        for (const c of o.children) walk(c);
      };
      walk(root);
    },
    capsules: setCapsules,
    sketch(obj, o) { sketchQueue.push([obj, o]); },
    fx: {
      rain(o) { const m = rainMesh(o); scene.add(m); return m; },
      petals(o) { const m = petalMesh(o); scene.add(m); return m; },
      smoke(o) { const m = smokeMesh(o); scene.add(m); return m; },
      // embers rising from coals: sources [{ at, spread, rise, life, size, color, cool, drift }], twelve
      sparks(o) { const m = sparkMesh(o); scene.add(m); return m; },
      // a bending band of smoke: sources [{ at, length, width: [a, b], rise, drift, curl, speed, color, opacity, sway }], twelve
      ribbonSmoke(o) { const m = ribbonSmokeMesh(o); scene.add(m); ribbons.push(m); return m; },
    },
    // solid things the clipping check must keep everyone out of: [{ x, z, r, h, name }]
    solids: [],
  };
}

let api = null;
// the build's timeline: [label, start ms, duration ms], and the longest stretch of synchronous work between two yields
const TL = (state.timeline = []);
state.t0 = T0;
let tlOn = true;   // only while the season builds (the season's update may call the core every frame)
const mark = (label, t0) => { if (tlOn) TL.push([label, Math.round(t0 - T0), +(performance.now() - t0).toFixed(1)]); };
function timed(obj) {
  for (const k of Object.keys(obj)) {
    const f = obj[k];
    if (typeof f !== 'function' || k === 'progress' || k === 'nextFrame' || k === 'slice' || /^[A-Z]/.test(k)) continue;
    obj[k] = function (...a) {
      const t0 = performance.now();
      const r = f.apply(this, a);
      if (r && typeof r.then === 'function') return r.then((v) => { mark('core.' + k + ' (async)', t0); return v; });
      mark('core.' + k, t0);
      return r;
    };
  }
  return obj;
}
async function build() {
  setProgress(0.04);
  const tb = performance.now();
  const fontP = loadFont();
  const knifeP = loadTexture('./tex/knife.jpg', 2, { bitmap: true });
  BUILD.WORK.budget = workBudget;
  BUILD.WORK.held = () => gpuStep && entranceHeld();
  // (uploading the brush textures is GPU work too: a frame opened just before the page's entrance waits it out here)
  gpuStep = true;
  await entranceHold();
  TEX = await loadTextures(renderer, { maxAniso: ANISO, onProgress: (p) => setProgress(0.04 + p * 0.3), slice });
  gpuStep = false;
  const knife = await knifeP;
  knife.colorSpace = THREE.NoColorSpace;
  knife.wrapS = knife.wrapT = THREE.MirroredRepeatWrapping;
  knife.anisotropy = ANISO;
  U.tBrush.value = TEX.brush; U.tWash.value = TEX.wash; U.tKnife.value = knife; U.tStrokes.value = TEX.strokes;
  state.stats.texMs = Math.round(performance.now() - tb);
  await nextFrame();
  const tg = performance.now();
  // the shapes are made in slices (core/build.js WORK): a few ms at a time in the background, more while nothing is shown yet
  // the crowd's drawings (shared by all the seasons of the page: the first one draws them)
  const tsh = performance.now();
  // (a season that says crowd: false has nobody in the background: its drawings are not made here. If it asks for a crowd
  // anyway, core.crowd makes them then and there)
  if (season.crowd !== false) await prepareSheets({ slice });
  mark('crowd drawings', tsh);

  // the season draws words into canvases (a banner, a street plate): the fonts must be in before it builds
  await fontP;
  if (WAIT_GO) {
    // (the other textures go up now too, while the page is still loading)
    for (const t of [TEX.strokes, TEX.wash, TEX.linen, knife]) { await slice(); renderer.initTexture(t); }
    tellParent({ held: true });
    const tw = performance.now();
    await waitGo();
    mark('waited for the page', tw);
  }
  const R = rng(season.seed ?? 20260217);
  api = makeApi(R, fontP);
  timed(api); timed(api.fx);
  const tsb = performance.now();
  out = (await season.build(scene, R, api)) || {};
  mark('season.build (total)', tsb);
  // whatever the season left to the core
  if (!people && out.peopleLayout) await api.loadPeople(out.peopleLayout);
  if (!crowdBg && out.crowd) api.crowd(out.crowd);
  if (BOT && !bottle) await api.bottle();
  const tsl = performance.now();
  await BUILD.WORK.idle();
  mark('shapes made (slices)', tsl);
  state.work = { ...BUILD.WORK.stats };
  state.prof = JSON.parse(JSON.stringify(window.__chomProf || {}));
  if (!capsDone) setCapsules(out.shadows || []);
  state.stats.casters = casters.length;
  setupShadow();
  state.stats.buildMs = Math.round(performance.now() - tg);
  setProgress(0.8);
  await nextFrame();

  // pose everyone at rest, then draw the sketch loops around the main things as seen from the fixed eye
  const tsk = performance.now();
  update(0, true);
  for (const [obj, o] of [...(out.sketch || []), ...sketchQueue]) sketchAround(obj, o);
  if (people && people.sketch) for (const [obj, o] of people.sketch) sketchAround(obj, o);
  if (bottle) {
    // (bottle.sketch: false leaves the loops off: a bottle seen very close reads as a paper cone with them)
    // the white line round the bottle — the one thing on the page that wears it — and the way it lives (README 15):
    // ?sketchmove=a a hand's boil · b a light running round · 0 still. A machine asked to keep motion down gets the still one.
    // how thick the white line is drawn, in screen pixels (?linew= multiplies it, for the preview page).
    const lineW = 1.5 * (+params.get('linew') || BOT.lineWidth || LINE_W_CHOSEN);
    // how much the brush's dryness eats the line: 1 = as broken as the season's own sketch lines, 0 = an even, solid line
    const lineDry = params.has('linedry') ? +params.get('linedry') : (BOT.lineDry ?? 1);
    // over a bright scene a white line has nothing to sit against. Three ways, to be chosen by eye and then measured:
    // a = a thin dark lip along its outer side · b = the whole line in ink · c = a soft breath of dark behind it
    const style = (params.get('linestyle') ?? BOT.lineStyle ?? lineStyleForScene()).toLowerCase();
    const lineInk = BOT.lineInk || '#2b2320';
    const lineColor = style === 'b' ? lineInk : (BOT.lineColor || '#fbf5e8');
    const lineEdge = style === 'a' ? [1, 1, 1, 0] : style === 'c' ? [3, 0.85, 1, 0] : null;
    // seen from across a street the loops may wander; seen from a hand's length away (the opening scene) they must sit close,
    // or the ends read as a paper cone above the stopper
    const near = OPENING || BOT.lineClose;
    if (BOT.sketch !== false && params.get('line') !== '0') {
      const common = { width: lineW, dry: lineDry, move: sketchMove(), edge: lineEdge, ink: lineInk, color: lineColor };
      // kept so lineLook() can hand the page layer the real recipe instead of it copying numbers out of here by hand
      lineOpts = near
        ? { seed: 5, loops: 1, off: [2, 4], wob: 1.6, lift: 2.5, ...common }
        : { seed: 5, loops: 2, off: [3, 8], wob: 3, lift: 6, ...common };
      bottleLine = sketchAround(bottle, lineOpts);
    }
    bottle.traverse((o) => o.layers.set(2));
  }
  state.stats.sketchLines = SKETCH_MATS.length;
  mark('sketch lines', tsk);
  setProgress(0.9);
}

// the notes panel text comes from the season (docs/content/chom-copy.md)
function fillNotes(n, l = 'en') {
  const panel = document.getElementById('notes');
  if (!n || !panel) return;
  panel.setAttribute('lang', l);
  // labels and the close button's name follow the language (n.labels = { top, heart, base }, n.close)
  if (n.labels) { const dt = panel.querySelectorAll('dt'); dt[0].textContent = n.labels.top; dt[1].textContent = n.labels.heart; dt[2].textContent = n.labels.base; }
  if (n.close) panel.querySelector('#notes-close').setAttribute('aria-label', n.close);
  const q = (s) => panel.querySelector(s);
  q('#notes-title').textContent = n.name;
  q('.sub').textContent = n.english;
  q('.opener').textContent = n.opener;
  const dd = panel.querySelectorAll('dd');
  dd[0].textContent = n.top; dd[1].textContent = n.heart; dd[2].textContent = n.base;
  q('.memory').textContent = n.memory;
  const hit = document.getElementById('bottle-hit');
  if (hit) hit.setAttribute('aria-label', n.bottleLabel ?? `${n.name}, the ${n.seasonWord ?? 'season'} bottle: open its notes`);
}

// ---------------- G: the sun's shadow map (only moving things are drawn into it) ----------------
// An orthographic view from the sun over the street, from just behind the eye to ~105 m down it. Casters are drawn with a
// depth-only twin of their own material (same vertex shader: the wind, the crowd's stepped walk and, for skinned meshes, the bones),
// so each shadow moves exactly like its thing. The ground and the walls read it and cut it into a brushed edge.
const SH_SIZE = 2048;
const SH_LAYER = 4;
const casters = [];
const rtShadow = new THREE.WebGLRenderTarget(SH_SIZE, SH_SIZE, { type: THREE.UnsignedByteType, generateMipmaps: false, depthBuffer: true });
rtShadow.depthTexture = new THREE.DepthTexture(SH_SIZE, SH_SIZE);
rtShadow.depthTexture.type = THREE.UnsignedIntType;
const shCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
const SH_FRAG = 'void main(){ gl_FragColor = vec4(1.0); }';
function shadowMaterialFor(m, mesh) {
  if (mesh.userData.shadowMaterial) return mesh.userData.shadowMaterial;
  if (m.isShaderMaterial) return new THREE.ShaderMaterial({ uniforms: m.uniforms, vertexShader: m.vertexShader, fragmentShader: SH_FRAG, defines: { ...(m.defines || {}) }, side: THREE.DoubleSide });
  // built-in materials (a loaded .glb): three adds the skinning itself
  return new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
}
function addCasters(root, { lampOnly = false } = {}) {
  root.traverse((o) => {
    if (!o.isMesh || o.userData.castShadow === false) return;
    const m = o.material;
    if (!m || Array.isArray(m)) return;
    if (!o.userData.shadowMaterial) {
      if (m.side === THREE.BackSide) return;               // the offset colour rims
      if (!o.geometry.userData.lazy && o.geometry.attributes.aTan) return;   // the loose sketch lines
      if (m.transparent) return;                           // glows and painted highlights
    }
    if (!lampOnly) o.layers.enable(SH_LAYER);
    o.layers.enable(LAMP_LAYER);
    if (casters.some((c) => c.mesh === o)) return;
    casters.push({ mesh: o, sm: shadowMaterialFor(m, o), saved: null });
  });
}

// ---------------- lamps with shadows (core.lamp) ----------------
// Each shadowed lamp looks from its bulb along its cone (a wide perspective view) and keeps a depth map of the casters.
// The maps are refreshed one lamp per frame (the crowd moves on twos anyway), all of them on the first frame.
const LAMP_LAYER = 5;
const lamps = [];
let lampTick = 0;
function addLamp(i, pos, o = {}) {
  const radius = o.radius ?? 6;
  U.uBulb.value[i].set(pos.x, pos.y, pos.z, radius);
  U.uBulbCol.value[i].copy(lin(o.color ?? '#ffb060')).multiplyScalar(o.k ?? 1);
  U.uBulbFlag.value[i] = 1;
  const dir = V3(...(o.cone?.dir ?? [0, -1, 0])).normalize();
  if (o.cone) {
    U.uBulbDir.value[i].set(dir.x, dir.y, dir.z, Math.cos((o.cone.outer ?? 60) * D2R));
    U.uBulbInner.value[i] = Math.cos((o.cone.inner ?? (o.cone.outer ?? 60) * 0.6) * D2R);
  } else {
    U.uBulbDir.value[i].set(0, -1, 0, -2);
  }
  if (o.shadow === 'cube') return addCubeLamp(i, pos, o, radius);
  if (!o.shadow || lamps.length >= 3) return { i };
  const k = lamps.length;
  const size = o.shadowSize ?? 1024;
  const rt = new THREE.WebGLRenderTarget(size, size, { type: THREE.UnsignedByteType, generateMipmaps: false, depthBuffer: true });
  rt.depthTexture = new THREE.DepthTexture(size, size);
  rt.depthTexture.type = THREE.UnsignedIntType;
  // the shadow map looks along shadowDir (default: the cone's axis, or down); a brazier looks at the wall behind the people
  const look = o.shadowDir ? V3(...o.shadowDir).normalize() : dir;
  const fov = THREE.MathUtils.clamp(o.shadowFov ?? (o.cone ? 2 * (o.cone.outer ?? 60) + 8 : 140), 30, 160);
  const cam = new THREE.PerspectiveCamera(fov, 1, 0.25, radius * 1.3);
  cam.position.copy(pos);
  cam.up.set(0, 1, 0);
  if (Math.abs(look.y) > 0.95) cam.up.set(0, 0, -1);
  cam.lookAt(pos.clone().add(look));
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  cam.layers.set(LAMP_LAYER);
  U['tLamp' + k].value = rt.depthTexture;
  U.uLampMat.value[k].multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  U.uLampTexel.value.setComponent(k, 1 / size);
  U.uBulbFlag.value[i] = 2 + k;
  lamps.push({ i, k, cam, rt, fresh: false });
  state.stats.lamps = lamps.length;
  return { i, k };
}
// one lamp may throw shadows all round (a low brazier): six views in a 3 x 2 atlas, two views refreshed each frame
let cube = null;
function addCubeLamp(i, pos, o, radius) {
  if (cube) { console.warn('[chom-world] only one lamp can have cube shadows'); return { i }; }
  const size = o.shadowSize ?? 512;
  const rt = new THREE.WebGLRenderTarget(size * 3, size * 2, { type: THREE.UnsignedByteType, generateMipmaps: false, depthBuffer: true });
  rt.depthTexture = new THREE.DepthTexture(size * 3, size * 2);
  rt.depthTexture.type = THREE.UnsignedIntType;
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const cams = dirs.map((d, f) => {
    const c = new THREE.PerspectiveCamera(92, 1, 0.1, radius * 1.3);
    c.position.copy(pos);
    c.up.set(0, 1, 0);
    if (f === 2 || f === 3) c.up.set(0, 0, -1);
    c.lookAt(pos.clone().add(V3(...d)));
    c.updateMatrixWorld();
    c.updateProjectionMatrix();
    c.layers.set(LAMP_LAYER);
    U.uCubeMat.value[f].multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
    return c;
  });
  U.tCube.value = rt.depthTexture;
  U.uCubeTexel.value.set(1 / (size * 3), 1 / (size * 2));
  U.uBulbFlag.value[i] = 5;
  cube = { i, rt, cams, size, next: 0, fresh: false, perFrame: o.facesPerFrame ?? 2 };
  state.stats.cubeLamp = i;
  return { i, cube: true };
}
function renderCube() {
  const faces = cube.fresh ? Array.from({ length: cube.perFrame }, (_, k) => (cube.next + k) % 6) : [0, 1, 2, 3, 4, 5];
  cube.next = (cube.next + cube.perFrame) % 6;
  cube.fresh = true;
  const S = cube.size;
  renderer.setRenderTarget(cube.rt);
  renderer.setClearColor(0xffffff, 1);
  for (const f of faces) {
    const x = (f % 3) * S, y = Math.floor(f / 3) * S;
    cube.rt.viewport.set(x, y, S, S);
    cube.rt.scissor.set(x, y, S, S);
    cube.rt.scissorTest = true;
    renderer.setRenderTarget(cube.rt);
    renderer.clear();
    U.uFaceLight.value.set(cube.cams[f].position.x, cube.cams[f].position.y, cube.cams[f].position.z, 1);
    renderer.render(scene, cube.cams[f]);
  }
  cube.rt.scissorTest = false;
  cube.rt.viewport.set(0, 0, S * 3, S * 2);
}
function renderLampShadows() {
  if (cube && casters.length) {
    for (const c of casters) { c.saved = c.mesh.material; c.mesh.material = c.sm; }
    renderCube();
    U.uFaceLight.value.w = 0;
    for (const c of casters) c.mesh.material = c.saved;
  }
  if (!lamps.length || !casters.length) return;
  const todo = lamps.some((l) => !l.fresh) ? lamps : [lamps[lampTick++ % lamps.length]];
  for (const c of casters) { c.saved = c.mesh.material; c.mesh.material = c.sm; }
  for (const l of todo) {
    U.uFaceLight.value.set(l.cam.position.x, l.cam.position.y, l.cam.position.z, 1);
    renderer.setRenderTarget(l.rt);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(scene, l.cam);
    l.fresh = true;
  }
  U.uFaceLight.value.w = 0;
  for (const c of casters) c.mesh.material = c.saved;
}
function setupShadow() {
  const c = V3(0, 1.5, -48);
  shCam.position.copy(c).addScaledVector(SUN, 90);
  shCam.up.set(0, 1, 0);
  shCam.lookAt(c);
  shCam.updateMatrixWorld();
  const inv = shCam.matrixWorldInverse;
  const lo = V3(1e9, 1e9, 1e9), hi = V3(-1e9, -1e9, -1e9);
  const zr = season.shadowZ ?? [-106, 8];
  for (const x of [ST.wallFar - 0.5, ST.wallNear + 0.5]) for (const y of [0, 4.5]) for (const z of zr) {
    const v = V3(x, y, z).applyMatrix4(inv);
    lo.min(v); hi.max(v);
  }
  shCam.left = lo.x; shCam.right = hi.x; shCam.bottom = lo.y; shCam.top = hi.y;
  shCam.near = -hi.z - 2; shCam.far = -lo.z + 2;
  shCam.updateProjectionMatrix();
  shCam.layers.set(SH_LAYER);
  U.uShMat.value.multiplyMatrices(shCam.projectionMatrix, shCam.matrixWorldInverse);
  U.uShTexel.value = 1 / SH_SIZE;
  U.tShadow.value = rtShadow.depthTexture;
  U.uShOn.value = SUN_ON ? 1 : 0;
  state.stats.shadowTexelCm = +(((shCam.right - shCam.left) / SH_SIZE) * 100).toFixed(1);
}
function renderShadow() {
  if (!casters.length || !SUN_ON) return;
  for (const c of casters) { c.saved = c.mesh.material; c.mesh.material = c.sm; }
  renderer.setRenderTarget(rtShadow);
  renderer.setClearColor(0xffffff, 1);
  renderer.clear();
  renderer.render(scene, shCam);
  for (const c of casters) c.mesh.material = c.saved;
}

// ---------------- motion ----------------
const tmpV = new THREE.Vector3();
const FOCUS_UP = new THREE.Vector3(0, 0.2, 0);

// ---------------- interaction ----------------
// pointer: layers slide a little with the cursor, the cursor is a breeze
const pointer = { nx: 0, ny: 0, vx: 0, vy: 0, lastX: null, lastY: null, lastT: 0 };
window.addEventListener('pointermove', (e) => {
  const nx = (e.clientX / window.innerWidth) * 2 - 1, ny = -(e.clientY / window.innerHeight) * 2 + 1;
  const now = performance.now();
  if (pointer.lastX !== null) {
    const dt = Math.max(8, now - pointer.lastT) / 1000;
    pointer.vx += ((nx - pointer.lastX) / dt - pointer.vx) * 0.5;
    pointer.vy += ((ny - pointer.lastY) / dt - pointer.vy) * 0.5;
  }
  pointer.lastX = nx; pointer.lastY = ny; pointer.lastT = now;
  pointer.nx = nx; pointer.ny = ny;
});

// scroll: the page scrolls, the scene stays; the scroll position is where the camera is on its path
const push = { v: FIXED_PUSH ?? 0, target: FIXED_PUSH ?? 0 };
function scrollTarget() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? clamp01(window.scrollY / max) : 0;
}
window.addEventListener('scroll', () => { if (FIXED_PUSH === null && !focus.open && !EMBED) push.target = scrollTarget(); }, { passive: true });

// ---------------- the four-season page (journey.html) drives an embedded season ----------------
// push: this season's own scroll (0..1); through: flying on past the end (0..1); peel: the layers come away from the far end
// to the eye (0..1), showing the next season behind; arrive: this season's camera coming in from behind its eye (0..1);
// active: the viewer is in this season (its bottle can be clicked); run: whether this season draws at all
const J = { push: 0, through: 0, peel: 0, arrive: 1, active: true, run: true, intro: 0 };
let running = false;
// this page is the opening scene in front of the seasons (index.html?season=<id>&opening=1): its bottle is not a button and
// its notes never open; and as the walk into the scent ends, the page's own look (the beams, the blur around the bottle)
// gives way, so that the picture inside the scent and the season that follows it are the same frame
// (a season that declares `opening` IS the opening scene, however it was opened: its bottle is a still life, not a button)
const OPENING = params.get('opening') === '1' || !!season.opening;
state.opening = season.opening ? { ...season.opening, isOpening: true } : null;
let look0 = null;
function introLook(k) {
  if (!look0) look0 = { focus: finalMat.uniforms.uFocusK.value.clone(), shaft: finalMat.uniforms.uShaftK.value };
  const f = 1 - clamp01((k - 0.86) / 0.12);
  finalMat.uniforms.uFocusK.value.set(look0.focus.x * f, look0.focus.y * f, look0.focus.z, look0.focus.w);
  finalMat.uniforms.uShaftK.value = look0.shaft * f;
}

// ---------------- the opening: the season seen inside the ribbon of scent (README 14) ----------------
// The opening scene (seasons/mocua) is its own page, in front of the seasons. What shows inside its ribbons of scent is a real
// picture of the season behind it: the four-season page asks that season for one (picture()), and hands it to this page
// (showPicture). The ribbon's own shader bends and breaks it (core/paint.js), so the haze has a cause: the scent itself.
let seasonPic = null;
// a picture of what this season looks like now, at w x h (for the page in front of it). It draws a frame first, so the
// picture is of this very moment
state.picture = async ({ w = 480, h = 300, dt = 0 } = {}) => {
  if (!state.ready) return null;
  update(dt);
  renderFrame();
  // (the other way up, as the shaders read it, and never upside down on the way)
  try { return await createImageBitmap(canvas, { resizeWidth: Math.max(2, w | 0), resizeHeight: Math.max(2, h | 0), resizeQuality: 'low', imageOrientation: 'flipY' }); }
  catch (e) { return null; }
};
// show that picture inside this page's ribbons of scent. k = how much of it shows (0 = only the scent, 1 = the picture
// itself); warp = how hard the scent bends it; shard = how broken its edges are along the brush's strokes
state.showPicture = (bitmap, { k = 1, warp = 1, shard = 1 } = {}) => {
  if (!ribbons.length) return false;
  if (bitmap) {
    // (kept exactly as it was seen: the shaders that use it say where the light belongs)
    if (!seasonPic) { seasonPic = new THREE.Texture(); seasonPic.flipY = false; seasonPic.colorSpace = THREE.NoColorSpace; seasonPic.minFilter = THREE.LinearFilter; seasonPic.generateMipmaps = false; }
    const old = seasonPic.image;
    // a picture of another size is a new texture, not a patch on the old one
    if (old && (old.width !== bitmap.width || old.height !== bitmap.height)) seasonPic.dispose();
    seasonPic.image = bitmap;
    seasonPic.needsUpdate = true;
    if (old && old.close && old !== bitmap) old.close();
  }
  for (const m of ribbons) {
    const u = m.material.uniforms;
    if (!u.uSeason) continue;
    if (seasonPic) u.uSeason.value = seasonPic;
    u.uSeasonK.value = seasonPic ? k : 0;
    u.uSeasonWarp.value = warp;
    u.uSeasonShard.value = shard;
  }
  return true;
};
state.journey = (o) => {
  Object.assign(J, o);
  if (o.intro !== undefined && OPENING) introLook(J.intro);
  if (EMBED) push.v = push.target = J.push;
  if (J.run && !running && state.ready) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  return true;
};
function tellParent(msg) { if (EMBED && window.parent !== window) window.parent.postMessage({ chom: SEASON_ID, ...msg }, location.origin); }

// the bottle: a real button over its painted shape
const hit = document.getElementById('bottle-hit');
const panel = document.getElementById('notes');
const closeBtn = document.getElementById('notes-close');
const focus = { k: 0, from: 0, to: 0, t0: -1, dur: 1.6, open: false, savedY: 0, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), panelShown: false };
// The close-up of the bottle (README 10): season.bottle.focusView = {
//   offset: [x, y, z]        where the camera stands, from the aim point (the bottle's foot + aimY x scale)
//   phoneOffset: [x, y, z]   the same on a tall phone screen (default: offset, as it is)
//   fov, phoneFov            the lens in the close-up (degrees; default the season's)
//   yaw, phoneYaw            turn after aiming (degrees, + to the left): the bottle sits off centre, beside the notes
//                            (default -13 on a computer: bottle on the left third; 0 on a phone)
//   pitch, phonePitch        tilt after aiming (degrees, + up: the bottle goes lower in the frame)
//                            (default 0 on a computer; 13 on a phone: bottle up top, notes below)
//   via: [[x, y, z], ...]    points the flight passes through, in the world (phoneVia on a phone); default: one point a
//   arc: 0.3                 little (arc m) above the higher end, halfway, so the flight goes over things, not through
// }
// Without offset the camera stands on the main camera's side of the bottle, higher than the head of the main person nearest
// to it (within 2 m), looking down no steeper than 35 degrees; on a phone 1.6 times as far back.
const FV = { ...(BOT?.focusView || {}) };
// (dev: try a close-up without editing the season: ?dev=1&fv={"offset":[...],"arc":0})
if (DEV && params.get('fv')) { try { Object.assign(FV, JSON.parse(params.get('fv'))); } catch (e) { console.warn('[chom-world] fv is not JSON', e); } }
// The height of the real glass, read off the thing that was built. Everything the close-up sizes itself by comes from
// here. It used to come from `BOTTLE_SCALE === 1.9 ? ... : ...` — a close-up tuned for one bottle size, with every other
// size falling into a second branch. No season has used 1.9 since 18/9, so that branch had been dead for three days,
// and the two numbers in it described a bottle that no longer exists. (One thing, two numbers — README 13.)
const glassBox = () => {
  const g = bottle && ((bottle.userData && bottle.userData.main) || bottle);
  if (!g) return null;
  bottle.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(g);
  return b.isEmpty() ? null : b;
};
// a season that names its own aimY keeps it; otherwise aim a little above the middle of the real glass
const aimPoint = () => {
  if (BOT?.aimY !== undefined) return BOTTLE_AT.clone().add(V3(0, BOT.aimY * BOTTLE_SCALE, 0));
  const b = glassBox();
  if (!b) return BOTTLE_AT.clone().add(V3(0, 0.1 * BOTTLE_SCALE, 0));
  return V3(BOTTLE_AT.x, b.min.y + 0.62 * (b.max.y - b.min.y), BOTTLE_AT.z);
};
let focusDefault = null;
// (nearestHead() lived here: it lifted the close-up above the nearest person's head so no face could show. Removed
// 21/9 with that rule — it was what tilted the close-up 34 degrees down and bent the bottle. faces.mjs, which counts
// real pixels, still passes without it.)
// How far down the close-up may look at the bottle. A tall glass seen from steeply above does not look like a bottle
// seen from above — its neck leans, its body turns into a trapezoid wider at the foot, and its two shoulders stop
// matching. Mike saw exactly that on 21/9 in Hạ, Thu and Đông ("lúc bấm vào nhìn chai bị biến dạng").
const CLOSE_MAX_DOWN_DEG = 12;
function defaultFocusOffset(B) {
  if (focusDefault) return focusDefault;
  // framed by the real glass: the numbers below were tuned on a bottle 0.279 m tall, so everything scales by how tall
  // this one really is — whatever size a season or ?bscale= makes it
  const b = glassBox();
  const f = b ? (b.max.y - b.min.y) / 0.279 : BOTTLE_SCALE / 1.9;
  const eye = PUSH_PATH.getPointAt(0);
  const toEye = V3(eye.x - B.x, 0, eye.z - B.z).normalize();
  let flat = 0.9 * f;
  // WHAT CHANGED ON 21/9, AND WHY. This used to rise above the head of the nearest person (+0.25 m) and then look down
  // "no steeper than 35 degrees". Near a person that meant looking down at the full 35: Thu's close-up camera stood a
  // metre above the bottle. That is the whole of the deformation Mike saw — the same bottle, the same lens, lowered to
  // 0.3 m, is upright and square again (measured, core/qa/cam.mjs in the 21/9 notes).
  // The rise was there to keep faces out of the close-up. It is not needed for that: the close-up frames the bottle
  // tightly at the bottle's own height, so a head standing beside it is above the top of the frame — and faces.mjs,
  // which counts the actual pixels, is what proves it, not this guess.
  const y = flat * Math.tan(CLOSE_MAX_DOWN_DEG * D2R);
  focusDefault = [toEye.x * flat, y, toEye.z * flat];
  return focusDefault;
}
function focusSet(narrow) {
  const pick = (a, b, d) => (narrow ? a ?? b ?? d : b ?? d);
  return {
    offset: narrow ? FV.phoneOffset ?? FV.offset : FV.offset,
    // (the default stands 1.6 times as far back on a phone: the bottle above, the notes below)
    back: narrow && !(FV.phoneOffset ?? FV.offset) ? 1.6 : 1,
    fov: pick(FV.phoneFov, FV.fov, FOV),
    yaw: narrow ? FV.phoneYaw ?? 0 : FV.yaw ?? -13,
    pitch: narrow ? FV.phonePitch ?? 13 : FV.pitch ?? 0,
    via: narrow ? FV.phoneVia ?? FV.via : FV.via,
  };
}
// How far back the close-up camera stands, compared with where each season DECLARED it (in metres, tuned for a
// life-size bottle). The bottle is three times bigger now, so a camera left where the season put it is three times
// closer to the glass than anyone checked.
//
// THE MEASURED THRESHOLD (21/9, the seasons' agent, full faces.mjs):
//   ×1.0  shows a face — 4 px of the Xuân customer's face, on a computer only, pointer in the bottom-right corner, in
//         the first 10% of the flight to the bottle: 1 camera out of about 2,160
//   ×1.1  clean on both frames, in all four seasons                                    <- SET HERE
//   (×1.5 was set first, before the threshold was known: clean, but it gave away far more size than it had to)
//
// ×1.1 keeps the close-up at 91% of the size Mike approved (1/1.1), and needs no change to Xuân's flight path.
// It is set from a FULL faces.mjs run, never a quick one: until 21/9 the quick run skipped exactly the pointer corner
// and the moment where that face shows, and reported clean without having looked (core/qa/sweeps.mjs, cameraPlan).
// ?closescale= multiplies on top, for measuring.
const CLOSE_PULLBACK_PROVISIONAL = 1.1;
const CLOSE_SCALE = (IS_OPENING ? 1 : CLOSE_PULLBACK_PROVISIONAL) * (+params.get('closescale') || 1);
function focusPose() {
  const B = aimPoint();
  const set = focusSet(narrowNow);
  const declared = set.offset ? V3(...set.offset).multiplyScalar(CLOSE_SCALE) : null;
  const pos = B.clone().add((declared || V3(...defaultFocusOffset(B))).multiplyScalar(set.back));
  // No close-up looks down at the bottle more steeply than CLOSE_MAX_DOWN_DEG — declared or not. Thu declared 34
  // degrees ("higher than both heads", to keep faces out); a tall glass seen from 34 degrees above leans at the neck and
  // turns into a trapezoid, which is the deformation Mike saw. Same rule as the glint: the season says what it wants,
  // the core holds the line on what the bottle must never look like, and says so. faces.mjs is what keeps faces out.
  const dy = pos.y - B.y, flatD = Math.hypot(pos.x - B.x, pos.z - B.z);
  const maxDy = flatD * Math.tan(CLOSE_MAX_DOWN_DEG * D2R);
  if (dy > maxDy + 1e-4) {
    if (!focusPose.warned) {
      focusPose.warned = true;
      console.info(`[chom] ${SEASON_ID}: the close-up looked down ${Math.round(Math.atan2(dy, flatD) / D2R)}° at the bottle; held to ${CLOSE_MAX_DOWN_DEG}° (steeper bends the glass).`);
    }
    pos.y = B.y + maxDy;
  }
  const f = B.clone().sub(pos).normalize();
  f.applyAxisAngle(V3(0, 1, 0), set.yaw * D2R);
  const right = new THREE.Vector3().crossVectors(f, V3(0, 1, 0)).normalize();
  f.applyAxisAngle(right, -set.pitch * D2R);
  const m = new THREE.Matrix4().lookAt(pos, pos.clone().add(f), V3(0, 1, 0));
  return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(m), fov: set.fov, via: set.via };
}
// where the camera is at k (0 = the season's own view, 1 = the close-up): through the via points, or over a low arc
const _flight = { key: '', curve: null };
function focusFlight(from, fp, k) {
  const pts = fp.via ? fp.via.map((v) => V3(...v)) : [];
  if (!fp.via) {
    const lift = FV.arc ?? 0.3;
    if (lift > 0) pts.push(from.clone().lerp(fp.pos, 0.5).setY(Math.max(from.y, fp.pos.y) + lift));
  }
  if (!pts.length) return from.clone().lerp(fp.pos, k);
  const key = `${from.toArray().map((x) => x.toFixed(4))}|${fp.pos.toArray().map((x) => x.toFixed(4))}|${pts.length}`;
  if (key !== _flight.key) { _flight.key = key; _flight.curve = new THREE.CatmullRomCurve3([from.clone(), ...pts, fp.pos.clone()], false, 'centripetal'); }
  return _flight.curve.getPoint(k);
}
state.focusPose = () => { const fp = focusPose(); return { pos: fp.pos.toArray(), fov: fp.fov, via: fp.via ?? null, offset: fp.pos.clone().sub(aimPoint()).toArray().map((x) => +x.toFixed(3)) }; };
function openNotes() {
  if (OPENING) return;                     // the opening scene has no notes to open (README 14)
  if (focus.open || !state.ready || !bottle) return;
  focus.open = true;
  focus.savedY = window.scrollY;
  focus.from = focus.k; focus.to = 1; focus.t0 = worldClock; focus.dur = 1.6;
  hit.setAttribute('aria-expanded', 'true');
  document.documentElement.classList.add('is-focus');
  panel.hidden = false;
  panel.classList.remove('is-shown');
  focus.panelShown = false;
  tellParent({ focus: true });
}
function closeNotes() {
  if (!focus.open) return;
  focus.open = false;
  focus.from = focus.k; focus.to = 0; focus.t0 = worldClock; focus.dur = 1.3;
  panel.classList.remove('is-shown');
  focus.panelShown = false;
  hit.setAttribute('aria-expanded', 'false');
  document.documentElement.classList.remove('is-focus');
  if (FIXED_PUSH === null && !EMBED) { window.scrollTo({ top: focus.savedY, behavior: 'instant' }); push.target = scrollTarget(); }
  tellParent({ focus: false });
  hit.focus({ preventScroll: true });
}
hit.addEventListener('click', (e) => { e.stopPropagation(); if (focus.open) closeNotes(); else openNotes(); });
closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeNotes(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && focus.open) { e.preventDefault(); closeNotes(); } });
document.addEventListener('pointerdown', (e) => { if (focus.open && !panel.contains(e.target) && e.target !== hit) closeNotes(); });
panel.addEventListener('transitionend', () => { if (!focus.open && !panel.classList.contains('is-shown')) panel.hidden = true; });

const springs = Array.from({ length: 6 }, () => ({ x: new THREE.Vector3(), v: new THREE.Vector3() }));
// the cursor breeze pushes these six groups (the season's; group 0 is the branch at the lens and swings more)
const swayCenters = (season.sway || []).map((p) => V3(...p));
while (swayCenters.length < 6) swayCenters.push(V3(0, -100, 0));
let worldT = FIXED_T ?? 0, worldClock = 0;
let frozen = FIXED_T !== null;
const offS = { x: 0, y: 0 };
const fixedOff = { on: false, x: 0, y: 0 };
const camN = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
const bbox = [];
for (const x of [-0.055, 0.055]) for (const y of [0, 0.21]) for (const z of [-0.03, 0.03]) bbox.push(V3(x, y, z));

function update(dt, force = false) {
  if (!frozen) worldT += dt;
  worldClock += dt;
  const t = worldT;
  U.uTime.value = t;
  // push: the camera eases after the scroll position, never jumps
  if (EMBED) push.v = push.target = J.push;
  else if (!focus.open || FIXED_PUSH !== null) push.v += (push.target - push.v) * (force || FIXED_PUSH !== null ? 1 : 1 - Math.exp(-dt * 5.5));
  if (Math.abs(push.target - push.v) < 1e-4) push.v = push.target;
  const p = push.v;
  U.uPush.value = p;
  // parallax offset (translation only), strongest at rest, gone while the camera is focused on the bottle
  const k = 1 - Math.exp(-dt * 2.2);
  const calm = (1 - p) * (1 - focus.k);
  // The cursor is a breeze — but it must not carry the bottle away from the hand reaching for it. As the pointer comes near
  // the bottle's own button, the breeze stops pushing: the target becomes where the camera already is, so the bottle stands
  // still under the finger. Beyond that little circle the scene keeps all of its life. (?grab=0 turns it off, to compare.)
  const grab = GRAB ? holdNearBottle() : 0;
  const txWind = pointer.nx * 0.22 * calm, tyWind = pointer.ny * 0.08 * calm;
  const tx = fixedOff.on ? fixedOff.x : txWind + (offS.x - txWind) * grab;
  const ty = fixedOff.on ? fixedOff.y : tyWind + (offS.y - tyWind) * grab;
  if (fixedOff.on || FIXED_T !== null || force) { offS.x = tx; offS.y = ty; } else { offS.x += (tx - offS.x) * k; offS.y += (ty - offS.y) * k; }
  const base = PUSH_PATH.getPointAt(ease(p));
  camN.pos.copy(base).addScaledVector(REF.right, offS.x * (1 - p)).addScaledVector(REF.up, offS.y * (1 - p));
  const look = fwdOf(camYaw(p), camPitch(p));
  if (EMBED || jView) {
    // flying on through the layers at the end of the season, and arriving from behind the eye at its start
    if (J.through > 0) camN.pos.addScaledVector(look, (CAM.throughDist ?? 16) * J.through * J.through);
    if (J.arrive < 1) {
      const a = 1 - ease(J.arrive);
      camN.pos.addScaledVector(look, -(CAM.arriveBack ?? 3.5) * a).add(V3(0, (CAM.arriveUp ?? 0.6) * a, 0));
    }
  }
  const m = new THREE.Matrix4().lookAt(camN.pos, camN.pos.clone().add(look), V3(0, 1, 0));
  camN.quat.setFromRotationMatrix(m);
  // focus on the bottle
  if (focus.t0 >= 0) {
    const u = clamp01((worldClock - focus.t0) / focus.dur);
    focus.k = focus.from + (focus.to - focus.from) * ease(u);
    if (u >= 1) focus.t0 = -1;
  }
  const fk = focus.k;
  let fovNow = FOV;
  if (fk > 0) {
    const fp = focusPose();
    camera.position.copy(focusFlight(camN.pos, fp, fk));
    camera.quaternion.slerpQuaternions(camN.quat, fp.quat, fk);
    fovNow = FOV + (fp.fov - FOV) * fk;
  } else {
    camera.position.copy(camN.pos);
    camera.quaternion.copy(camN.quat);
  }
  if (camera.fov !== fovNow) { camera.fov = fovNow; camera.updateProjectionMatrix(); }
  // the painted lines keep their width on screen whatever the lens
  if (fk > 0 || fovNow !== FOV) U.uPx.value = (2 * Math.tan(THREE.MathUtils.degToRad(fovNow / 2))) / view.h;
  if (camOverride) { camera.position.copy(camOverride[0]); camera.lookAt(camOverride[1]); }
  camera.updateMatrixWorld();
  if (focus.open && !focus.panelShown && fk > 0.55) { panel.classList.add('is-shown'); focus.panelShown = true; if (!force) closeBtn.focus({ preventScroll: true }); }
  if (bottle) bottle.rotation.y = BOTTLE_RY - 0.42 * fk;
  const fade = (1 - sm(0.01, 0.1, p)) * (1 - sm(0.0, 0.35, fk));
  for (const mm of SKETCH_MATS) mm.uniforms.uFade.value = fade;

  // cursor breeze: pointer speed near a group pushes it; each group is a damped spring
  const speed = Math.hypot(pointer.vx, pointer.vy);
  for (let i = 0; i < 6; i++) {
    const s = springs[i];
    if (speed > 0.05 && !frozen && fk < 0.5) {
      const c = swayCenters[i].clone().project(camera);
      const d = Math.hypot(c.x - pointer.nx, (c.y - pointer.ny) * 0.6);
      const fall = Math.exp(-(d * d) / (0.45 * 0.45));
      s.v.x += pointer.vx * fall * dt * 1.6 * (i === 0 ? 1.4 : 1);
      s.v.z += -Math.abs(pointer.vy) * fall * dt * 0.4;
    }
    const w = 2 * Math.PI * (i === 0 ? 0.7 : 0.9);
    s.v.addScaledVector(s.x, -w * w * dt).multiplyScalar(Math.exp(-dt * 1.8));
    s.x.addScaledVector(s.v, dt);
    if (s.x.length() > 0.25) s.x.setLength(0.25);
    U.uSway.value[i].copy(s.x);
  }
  // the season's own motion (its vehicles, its lean into the wind)
  if (out && out.update) out.update(t, api);
  pointer.vx *= Math.exp(-dt * 6); pointer.vy *= Math.exp(-dt * 6);
  const wind = 0.12 + THREE.MathUtils.clamp(springs[0].v.x * 1.5 + pointer.vx * 0.05, -0.35, 0.35);
  U.uWind.value.x += (wind - U.uWind.value.x) * (1 - Math.exp(-dt * 3));
  if (FIXED_T !== null || force) U.uWind.value.x = 0.12;

  if (people) people.update(t, dt);
  for (const g of glows) {
    g.quaternion.copy(camera.quaternion);
    if (g.userData.onBottle && bottle) { bottle.updateMatrixWorld(); g.position.copy(g.userData.onBottle).applyMatrix4(bottle.matrixWorld); }
  }
  placeHit(p, fk);
}

// keep the button on the painted bottle
let hitShown = null;
// how much the breeze is held back right now: 1 when the pointer is on the bottle's button, 0 more than a thumb away
const GRAB = params.get('grab') !== '0';
let hitBox = null;
function holdNearBottle() {
  if (!hitBox || hitShown !== true || focus.open) return 0;
  const px = (pointer.nx * 0.5 + 0.5) * view.w, py = (-pointer.ny * 0.5 + 0.5) * view.h;
  const dx = Math.max(hitBox.x - px, 0, px - (hitBox.x + hitBox.w));
  const dy = Math.max(hitBox.y - py, 0, py - (hitBox.y + hitBox.h));
  return 1 - sm(0, 70, Math.hypot(dx, dy));
}
state.grabNow = () => ({ on: GRAB, hold: +holdNearBottle().toFixed(3), box: hitBox });

function placeHit(p, fk) {
  if (!state.ready) return;
  // the opening scene's bottle is a still life, not a button (README 14)
  if (!bottle || OPENING) { if (hitShown !== false) { hit.hidden = true; hitShown = false; } return; }
  const show = (p < 0.05 && (!EMBED || (J.active && J.arrive >= 1 && J.peel <= 0))) || focus.open;
  if (show !== hitShown) { hit.hidden = !show; hitShown = show; }
  if (!show) return;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  bottle.updateMatrixWorld(true);
  for (const c of bbox) {
    tmpV.copy(c).applyMatrix4(bottle.matrixWorld).project(camera);
    const x = (tmpV.x * 0.5 + 0.5) * view.w, y = (-tmpV.y * 0.5 + 0.5) * view.h;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const pad = 6, w = Math.max(44, x1 - x0 + pad * 2), h = Math.max(44, y1 - y0 + pad * 2);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  hitBox = { x: cx - w / 2, y: cy - h / 2, w, h };
  hit.style.transform = `translate(${(cx - w / 2).toFixed(1)}px, ${(cy - h / 2).toFixed(1)}px)`;
  hit.style.width = `${w.toFixed(1)}px`;
  hit.style.height = `${h.toFixed(1)}px`;
}

// ---------------- render targets ----------------
const size = new THREE.Vector2();
renderer.getDrawingBufferSize(size);
const rtMain = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
rtMain.depthTexture = new THREE.DepthTexture(size.x, size.y);
rtMain.depthTexture.type = THREE.UnsignedIntType;
// sunbeams in the damp air, half size, softened twice
const rtShaft = new THREE.WebGLRenderTarget(size.x >> 1, size.y >> 1, { type: THREE.HalfFloatType });
const rtShaftB = new THREE.WebGLRenderTarget(size.x >> 1, size.y >> 1, { type: THREE.HalfFloatType });
const rtBottle = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
const rtBlurA = new THREE.WebGLRenderTarget(size.x >> 1, size.y >> 1, { type: THREE.HalfFloatType });
const rtBlurB = new THREE.WebGLRenderTarget(size.x >> 1, size.y >> 1, { type: THREE.HalfFloatType });
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fsScene = new THREE.Scene();
const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
fsQuad.frustumCulled = false;
fsScene.add(fsQuad);
const fsVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
// a soft 9-tap blur, run twice (the camera focusing on the bottle throws the street out of focus)
const blurMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
  vertexShader: fsVert,
  fragmentShader: /* glsl */`
    uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tSrc, vUv).rgb * 0.227;
      c += (texture2D(tSrc, vUv + uDir * 1.385).rgb + texture2D(tSrc, vUv - uDir * 1.385).rgb) * 0.316;
      c += (texture2D(tSrc, vUv + uDir * 3.23).rgb + texture2D(tSrc, vUv - uDir * 3.23).rgb) * 0.07;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
// the season's beams: { gap: [far z, near z] of the opening in the far row, winZ / winLo: the height band of each window,
// boxMax: the far corner of the street air (x, y, z) }. No beams -> the pass is skipped.
const BEAMS = (SUNC.on !== false && season.beams) || null;
// sunbeams: walk each view ray through the damp air of the street and add up where the sun reaches it
// (the same roof map every surface uses, so a beam can only come through a real opening).
// F: only the light that comes through the gap in the far row, below the neighbours' roofs, is drawn: three windows, three beams.
// Their edges are cut by real brush strokes laid along the sun's direction and fixed in the world, so the beams never crawl.
const shaftMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: {
    tDepth: { value: rtMain.depthTexture }, tBrush: U.tBrush, tRoof: U.tRoof, uRoof: U.uRoof, uKeyDir: U.uKeyDir,
    uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() },
    uGap: { value: new THREE.Vector2(...(BEAMS ? BEAMS.gap : [0, 0])) },
    uWinZ: { value: new THREE.Vector2(...(BEAMS?.winZ ?? [-16.5, -22])) }, uWinLo: { value: new THREE.Vector3(...(BEAMS?.winLo ?? [3.9, 5.7, 7.5])) },
    uBoxMax: { value: new THREE.Vector3(...(BEAMS?.boxMax ?? [5.2, 10.5, -5.0])) },
  },
  vertexShader: fsVert,
  fragmentShader: /* glsl */`
    uniform sampler2D tDepth, tBrush, tRoof; uniform vec4 uRoof; uniform vec3 uKeyDir, uCam; uniform mat4 uInvProj, uCamWorld; uniform vec2 uGap;
    uniform vec2 uWinZ; uniform vec3 uWinLo, uBoxMax;
    varying vec2 vUv;
    float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float sunAt(vec3 wp, float jit){
      float t = (uRoof.z - wp.x) / min(uKeyDir.x, -1e-3);
      vec3 h = wp + uKeyDir * t;
      h.z += jit;
      float top = texture2D(tRoof, vec2((h.z - uRoof.x) / uRoof.y, 0.5)).r * uRoof.w;
      float open = smoothstep(-0.08, 0.08, h.y - top);
      float inGap = smoothstep(uGap.x - 0.1, uGap.x + 0.1, h.z) * (1.0 - smoothstep(uGap.y - 0.1, uGap.y + 0.1, h.z));
      // the part of each opening the eye reads as a beam: one band per opening, each at its own height
      // (the lane low, the first low house higher, the far one highest), so the three beams stay apart on the canvas
      float hy = h.y + jit * 1.2;
      float lo = h.z > uWinZ.x ? uWinLo.x : (h.z > uWinZ.y ? uWinLo.y : uWinLo.z);
      float band = smoothstep(lo - 0.2, lo + 0.2, hy) * (1.0 - smoothstep(lo + 1.0, lo + 1.4, hy));
      return open * inGap * band;
    }
    void main(){
      float z = texture2D(tDepth, vUv).r;
      vec4 v = uInvProj * vec4(vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
      v /= v.w;
      vec3 wp = (uCamWorld * v).xyz;
      vec3 rd = wp - uCam;
      float far = length(rd);
      rd /= far;
      // things close to the eye (a rider passing the edge of the frame) are not veiled by beams far behind them
      float nearK = smoothstep(9.0, 15.0, far);
      // only the street air between the rows, from the gap to just behind the eye
      vec3 bmin = vec3(uRoof.z + 0.2, 0.0, uGap.x - 1.0), bmax = uBoxMax;
      vec3 inv = 1.0 / (rd + vec3(1e-5));
      vec3 ta = (bmin - uCam) * inv, tb = (bmax - uCam) * inv;
      vec3 t1 = min(ta, tb), t2 = max(ta, tb);
      float tn = max(max(max(t1.x, t1.y), t1.z), 0.3);
      float tf = min(min(min(t2.x, t2.y), t2.z), far);
      if (tf <= tn) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
      vec3 perp = normalize(cross(uKeyDir, vec3(0.0, 1.0, 0.0)));
      const int N = 40;
      float stepL = (tf - tn) / float(N);
      float j = hash12(gl_FragCoord.xy);
      float acc = 0.0;
      for (int i = 0; i < N; i++) {
        vec3 p = uCam + rd * (tn + (float(i) + j) * stepL);
        // the beams read only further down the street, where they cross it as rays: nearer, the beam volume filled whole
        // stretches of the frame with a pale veil (read as a see-through patch), so the air nearer than ~11 m stays clear
        float dens = smoothstep(11.0, 17.0, length(p - uCam));
        if (dens <= 0.0) continue;
        // brush strokes running along the beam: they wobble its edges and streak its body
        float along = dot(p, uKeyDir), across = dot(p, perp);
        float br = texture2D(tBrush, vec2(across * 0.55, along * 0.035)).a;
        float br2 = texture2D(tBrush, vec2(across * 0.19, along * 0.021) + 0.41).b;
        float lit = sunAt(p, (br - 0.5) * 0.9 + (br2 - 0.5) * 0.5);
        acc += lit * dens * (0.55 + 0.45 * smoothstep(0.35, 0.7, br2)) * stepL;
      }
      // light scatters forward: brighter looking toward the sun
      float ph = 0.55 + 1.2 * pow(max(dot(rd, uKeyDir), 0.0), 2.0);
      gl_FragColor = vec4(acc * ph * 0.35 * nearK, 0.0, 0.0, 1.0);
    }`,
});

// painting -> (street out of focus, a little darker) -> bottle on top -> real linen canvas -> A's bright, warm grade
const finalMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: { tScene: { value: rtMain.texture }, tBlur: { value: rtBlurB.texture }, tBottle: { value: rtBottle.texture }, tShaft: { value: rtShaftB.texture }, uDim: { value: 0 }, tLinen: { value: null }, uRes: { value: size.clone() }, uDpr: { value: DPR }, uShaftCol: { value: lin('#ffd9a0') }, uShaftK: { value: season.beams ? 1 : 0 }, uDbg: { value: 0 }, uPeel: { value: 0 }, tDepth: { value: rtMain.depthTexture }, tBrushS: U.tBrush, uNF: { value: new THREE.Vector2(0.05, 1200) }, uFocus: { value: new THREE.Vector3(0.5, 0.5, 0) }, uFocusK: { value: new THREE.Vector4(...(BOT?.focus ?? [0.12, 0.06, 0, 0.58])) } },
  vertexShader: fsVert,
  fragmentShader: /* glsl */`
    uniform sampler2D tScene, tBlur, tBottle, tLinen, tShaft; uniform vec2 uRes; uniform float uDpr, uDim, uShaftK, uDbg; uniform vec3 uShaftCol, uFocus; uniform vec4 uFocusK;
    uniform sampler2D tDepth, tBrushS; uniform float uPeel; uniform vec2 uNF;
    varying vec2 vUv;
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    float band(float x, float t){ float w = max(fwidth(x), 1e-4) * 1.5; return smoothstep(t - w, t + w, x); }
    vec3 shafts(vec3 c){
      // painted beams: a soft glaze plus two stepped layers (a painter's value plan), screen-blended so they lift, never grey
      // F: stronger, with clear edges: a thin glaze, then two painted steps
      float s = texture2D(tShaft, vUv).r * uShaftK;
      float a = s * 0.03 + band(s, 0.55) * 0.12 + band(s, 1.2) * 0.12;
      a = min(a, 0.3);
      return 1.0 - (1.0 - c / (1.0 + c)) * (1.0 - uShaftCol * a) ;
    }
    void main(){
      vec3 c = texture2D(tScene, vUv).rgb;
      { vec3 ct = c / (1.0 + c); vec3 st = shafts(c); c = st / max(1.0 - st, 1e-3); }
      if (uDim > 0.0) {
        c = mix(c, texture2D(tBlur, vUv).rgb, smoothstep(0.0, 0.5, uDim));
        float g = dot(c, vec3(0.3, 0.55, 0.15));
        c = mix(c, mix(vec3(g), c, 0.72) * 0.74, uDim);
        vec4 b = texture2D(tBottle, vUv);
        c = c * (1.0 - b.a) + b.rgb;
      }
      // F: the painter's value plan: the frame settles a step darker away from the bottle and holds a little warm light
      // around it (anchored to the bottle, so it moves with it; gone once the camera pushes on)
      if (uFocus.z > 0.0) {
        // (Tried on 21/9, in units of the frame's SHORT side instead, so the plan would cover the same share of a
        // narrow phone frame as of a wide one. It deepened the shade as intended but the bottle gained nothing:
        // 26% -> 23% own share on Đông's phone frame, because darkening the surroundings lifts their contrast too.
        // Put back. The idea was reasonable and the measurement said no.)
        vec2 fq = (vUv - uFocus.xy) * vec2(uRes.x / uRes.y, 1.0);
        float fd = length(fq * vec2(1.0, 0.7));
        // uFocusK = (darken away, warm lift near, colour quieted away, reach)
        float nearK = smoothstep(uFocusK.w, 0.12, fd);
        c *= mix(1.0, mix(1.0 - uFocusK.x, 1.0, nearK), uFocus.z);
        c += vec3(1.0, 0.75, 0.33) * uFocusK.y * smoothstep(0.15, 0.03, fd) * uFocus.z;
        float gq = dot(c, vec3(0.3, 0.55, 0.15));
        c = mix(c, vec3(gq), uFocusK.z * (1.0 - smoothstep(0.34, 0.1, fd)) * uFocus.z);
      }
      float w = texture2D(tLinen, gl_FragCoord.xy / (512.0 * uDpr)).r;
      w = w * 0.75 + 0.25 * texture2D(tLinen, gl_FragCoord.xy / (1536.0 * uDpr) + 0.37).r;
      c *= 0.95 + 0.08 * w;
      vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
      c *= mix(0.88, 1.0, smoothstep(1.0, 0.4, length(q)));
      c *= 1.05;
      c = c * (1.0 + c / 5.0) / (1.0 + c * 0.35);
      float lum = dot(c, vec3(0.3, 0.55, 0.15));
      c *= mix(vec3(1.02, 0.98, 0.99), vec3(1.03, 1.0, 0.94), smoothstep(0.3, 0.9, lum));
      c = clamp(c, 0.0, 1.0);
      gl_FragColor = vec4(toSRGB(c), 1.0);
      if (uPeel > 0.0) {
        // the layers come away from the far end toward the eye; the edge is a real brush stroke, fixed on the canvas
        float zb = texture2D(tDepth, vUv).r * 2.0 - 1.0;
        float lz = 2.0 * uNF.x * uNF.y / (uNF.y + uNF.x - zb * (uNF.y - uNF.x));
        vec4 br = texture2D(tBrushS, gl_FragCoord.xy / (760.0 * uDpr));
        vec4 br2 = texture2D(tBrushS, gl_FragCoord.xy / (1900.0 * uDpr) + 0.37);
        float thr = uPeel * (0.7 + 0.45 * br.a + 0.25 * br2.b);
        float a = 1.0 - step(thr, lz);
        gl_FragColor = vec4(gl_FragColor.rgb * a, a);
      }
      if (uDbg > 0.0) gl_FragColor = vec4(vec3(texture2D(tShaft, vUv).r * uDbg), 1.0);
    }`,
});

// the opening's last breath: the picture the scent carries, spreading over the whole frame (see renderFrame)
const coverK = () => (OPENING && seasonPic ? clamp01((J.intro - 0.86) / 0.09) : 0);
const coverMat = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false, transparent: true,
  uniforms: { uPic: { value: null }, tStrokes: U.tStrokes, uK: { value: 0 }, uWarp: { value: 1 }, uTime: { value: 0 } },
  vertexShader: fsVert,
  fragmentShader: /* glsl */`
    uniform sampler2D uPic, tStrokes; uniform float uK, uWarp, uTime; varying vec2 vUv;
    void main(){
      vec2 d = vec2(texture2D(tStrokes, vUv * 0.7 + uTime * 0.004).r - 0.5, texture2D(tStrokes, vUv * 0.62 + 0.31 - uTime * 0.003).g - 0.5);
      vec2 uv = clamp(vUv + d * 0.05 * uWarp, vec2(0.002), vec2(0.998));
      vec3 pic = texture2D(uPic, uv).rgb;
      float r = length((vUv - 0.5) * vec2(1.35, 1.0));
      float s = texture2D(tStrokes, vUv * 2.3 + 0.17).b;
      float cover = smoothstep(0.0, 0.35, uK * 1.95 - r - (s - 0.5) * 0.7 * uWarp);
      if (cover < 0.004) discard;
      gl_FragColor = vec4(pic, cover);
    }`,
});

function fsPass(material, target) {
  fsQuad.material = material;
  renderer.setRenderTarget(target);
  renderer.render(fsScene, fsCam);
}

// The white line is drawn once, for the eye where the scene rests. As the camera pushes in, or flies to the bottle, it would
// no longer sit on the glass — so it fades away while the camera moves and comes back when it stands still. The viewer reads
// that as the line letting go, never as a mistake.
function lineFade() {
  if (!bottleLine) return;
  const k = (1 - sm(0.02, 0.18, push.v)) * (1 - sm(0.05, 0.4, focus.k));
  bottleLine.material.uniforms.uFade.value = k;
  bottleLine.visible = k > 0.004 && !bottleLine.userData.forceOff;   // __chom.setLine(false) holds it off for a measurement
}

function renderFrame() {
  lineFade();
  renderer.info.reset();
  const t0 = performance.now();
  const dim = focus.k;
  renderShadow();
  renderLampShadows();
  renderer.setRenderTarget(rtMain);
  renderer.setClearColor(CLEAR, 1);
  renderer.clear();
  if (dim > 0) camera.layers.disable(2); else camera.layers.enable(2);
  renderer.render(scene, camera);
  // sunbeams through the damp air
  if (BEAMS) {
  shaftMat.uniforms.uInvProj.value.copy(camera.projectionMatrixInverse);
  shaftMat.uniforms.uCamWorld.value.copy(camera.matrixWorld);
  shaftMat.uniforms.uCam.value.copy(camera.position);
  fsPass(shaftMat, rtShaft);
  blurMat.uniforms.tSrc.value = rtShaft.texture;
  blurMat.uniforms.uDir.value.set(1.5 / rtShaft.width, 0);
  fsPass(blurMat, rtShaftB);
  blurMat.uniforms.tSrc.value = rtShaftB.texture;
  blurMat.uniforms.uDir.value.set(0, 1.5 / rtShaft.height);
  fsPass(blurMat, rtShaft);
  blurMat.uniforms.tSrc.value = rtShaft.texture;
  blurMat.uniforms.uDir.value.set(1.0 / rtShaft.width, 1.0 / rtShaft.height);
  fsPass(blurMat, rtShaftB);
  }
  if (dim > 0) {
    blurMat.uniforms.tSrc.value = rtMain.texture;
    blurMat.uniforms.uDir.value.set(1.6 / rtBlurA.width, 0);
    fsPass(blurMat, rtBlurA);
    blurMat.uniforms.tSrc.value = rtBlurA.texture;
    blurMat.uniforms.uDir.value.set(0, 1.6 / rtBlurA.height);
    fsPass(blurMat, rtBlurB);
    blurMat.uniforms.tSrc.value = rtBlurB.texture;
    blurMat.uniforms.uDir.value.set(2.6 / rtBlurA.width, 0);
    fsPass(blurMat, rtBlurA);
    blurMat.uniforms.tSrc.value = rtBlurA.texture;
    blurMat.uniforms.uDir.value.set(0, 2.6 / rtBlurA.height);
    fsPass(blurMat, rtBlurB);
    renderer.setRenderTarget(rtBottle);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    camera.layers.set(2);
    renderer.render(scene, camera);
    camera.layers.set(0);
  }
  finalMat.uniforms.uDim.value = dim;
  // peel: the distance the layers have come away to, from far (400 m) down to the eye
  // (camera.handover = { far, near }: the depth range the hand-over sweeps; near is the last layer, the next season's foreground)
  const HO = CAM.handover || {};
  finalMat.uniforms.uPeel.value = EMBED && J.peel > 0 ? (HO.far ?? 2000) * Math.pow((HO.near ?? 2.5) / (HO.far ?? 2000), J.peel) : 0;
  finalMat.uniforms.uNF.value.set(camera.near, camera.far);
  if (bottle) {
    tmpV.copy(BOTTLE_AT).add(FOCUS_UP).project(camera);
    finalMat.uniforms.uFocus.value.set(tmpV.x * 0.5 + 0.5, tmpV.y * 0.5 + 0.5, (1 - sm(0.02, 0.12, push.v)) * (1 - dim));
  }
  finalMat.uniforms.tLinen.value = TEX.linen;
  renderer.setRenderTarget(null);
  renderer.clear();
  fsPass(finalMat, null);
  // the opening, at the end of the walk into the scent: the scent has filled the frame, and what it carries (the picture of
  // the season) takes the frame with it, spreading from the middle along the brush's strokes. The last moment of the opening
  // is then the season's own frame, so the page can swap to it without anything being seen to change
  if (OPENING && coverK() > 0) {
    coverMat.uniforms.uK.value = coverK();
    coverMat.uniforms.uPic.value = seasonPic;
    coverMat.uniforms.uTime.value = worldT;
    coverMat.uniforms.uWarp.value = 1 - clamp01((J.intro - 0.88) / 0.07);
    fsPass(coverMat, null);
  }
  state.stats.cpuFrameMs = +(performance.now() - t0).toFixed(2);
  state.stats.calls = renderer.info.render.calls;
  state.stats.triangles = renderer.info.render.triangles;
}

// ---------------- people near the lens ----------------
// People are never faded or thinned near the camera (README 6c). Whoever comes into view closer than the limit (the crowd and
// the balcony people 2.2 m, the main people 1.2 m, who also pass the face check) is a data problem of the season (a path or a
// mark to move): ?dev=1 says so in the console, and state.nearPeople() sweeps every camera move of the journey.
const NEAR_PERSON = 2.2, NEAR_MAIN = 1.2;
// where this season sits on the four-season page: the first never arrives from behind, the last never flies on through
const JOURNEY_ORDER = (params.get('seasons') || 'xuan,ha,thu,dong').split(',');
const _box = new THREE.Box3(), _nv = new THREE.Vector4();
// everyone who counts as a person at time t: [{ name, x, y, z, h, r }] (crowd incl. balcony people, the people folders' movers).
// h is the body (a rider with the bike), not the clipping check's taller column
function personsAt(t) {
  const list = [];
  if (crowdBg) crowdBg.positions(t).forEach((p, i) => {
    if (!p.visible) return;
    const sc = p.h / (p.ride ? 2.4 : 1.8);
    list.push({ name: `crowd#${i}(${p.kind})`, x: p.x, y: p.y ?? 0, z: p.z, h: (p.ride ? 1.95 : 1.75) * sc, r: p.r, limit: NEAR_PERSON });
  });
  if (people?.movers) for (const m of people.movers(t)) list.push({ name: `people:${m.name}`, x: m.x, y: m.y ?? 0, z: m.z, h: Math.min(m.h ?? 1.7, 2.0), r: m.r ?? 0.3, limit: NEAR_MAIN });
  return list;
}
// the main people: their capsules at time t when the folder gives caps(t) ([[a, b, radius], ...] in world), else the boxes of
// what they added to the scene as it stands now (a box longer than 20 m is not a real one: skipped, with a word in ?dev=1)
const _seg = new THREE.Line3(), _cp = new THREE.Vector3();
const boxWarned = new Set();
function mainShapes(t) {
  const out = [];
  for (const info of peopleInfo) {
    const who = `people/${info.folder}(${info.roles.join(',')})`;
    if (typeof info.part.caps === 'function') {
      const caps = (info.part.caps(t) || []).map(([a, b, r]) => [a.clone(), b.clone(), r]);
      if (!caps.length) continue;
      out.push({
        name: `${who}:caps`, limit: NEAR_MAIN,
        dist: (c) => Math.min(...caps.map(([a, b, r]) => Math.max(0, _seg.set(a, b).closestPointToPoint(c, true, _cp).distanceTo(c) - r))),
        seen: (M) => caps.some(([a, b]) => pointInView(M, a.x, a.y, a.z) || pointInView(M, b.x, b.y, b.z) || pointInView(M, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)),
      });
      continue;
    }
    for (const r of info.roots) {
      _box.setFromObject(r);
      if (_box.isEmpty()) continue;
      const size = _box.getSize(_cp);
      const name = `${who}:${r.name || r.type}`;
      if (Math.max(size.x, size.y, size.z) > 20) {
        if (DEV && !boxWarned.has(name)) { boxWarned.add(name); console.warn(`[chom-world] ${name}: its bounding box is ${Math.max(size.x, size.y, size.z).toFixed(0)} m long, so the near-lens check skips it. Give the meshes real bounds, or give the folder caps(t) (README 11).`); }
        continue;
      }
      const box = _box.clone();
      out.push({ name, limit: NEAR_MAIN, dist: (c) => box.distanceToPoint(c), seen: (M) => boxInView(M, box) });
    }
  }
  return out;
}
// distance from the camera to the person's axis (feet to head)
const distToPerson = (c, p) => Math.hypot(c.x - p.x, Math.max(p.y - c.y, 0, c.y - (p.y + p.h)), c.z - p.z);
// a point inside a view (clip space, with a small margin)?
function pointInView(M, x, y, z) {
  _nv.set(x, y, z, 1).applyMatrix4(M);
  if (_nv.w < 0.05) return false;
  return Math.abs(_nv.x / _nv.w) < 1.08 && Math.abs(_nv.y / _nv.w) < 1.08;
}
// is any of the person (feet, middle, head; either side) inside the view?
function inView(M, p) {
  for (const fy of [0.05, 0.5, 0.95]) for (const s of [-1, 0, 1]) if (pointInView(M, p.x + s * p.r, p.y + fy * p.h, p.z)) return true;
  return false;
}
function boxInView(M, b) {
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) if (pointInView(M, x, y, z)) return true;
  return pointInView(M, (b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2);
}
let nearNext = 0;
const nearWarned = new Set();
function warnNear() {
  if (worldClock < nearNext || focus.k > 0.01) return;
  nearNext = worldClock + 0.25;
  const c = camera.position;
  const M = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const hits = personsAt(worldT).filter((p) => inView(M, p)).map((p) => [p.name, distToPerson(c, p), p.limit]);
  for (const b of mainShapes()) if (b.seen(M)) hits.push([b.name, b.dist(c), b.limit]);
  for (const [name, d, limit] of hits) {
    if (d >= limit || nearWarned.has(name)) continue;
    nearWarned.add(name);
    let scroll = `scrollY ${Math.round(window.scrollY)}`;
    try { if (EMBED) scroll = `page scrollY ${Math.round(window.parent.scrollY)}`; } catch (e) { /* not same origin */ }
    const where = EMBED ? ` (arrive ${J.arrive.toFixed(2)}, through ${J.through.toFixed(2)}, peel ${J.peel.toFixed(2)})` : '';
    console.warn(`[chom-world] ${SEASON_ID}: ${name} is ${d.toFixed(2)} m from the camera, in view, at push ${push.v.toFixed(3)}${where}, ${scroll}, t ${worldT.toFixed(1)}. People never fade near the lens: move the path or the mark (keep ${limit} m).`);
  }
}
// the camera as the journey moves it: the push (0..1), the fly-through past the end and the arrival from behind the eye
// (four-season page), each seen in a desktop frame (16:10) and a phone frame (390 x 844, with its own yaw)
function nearCams({ pushSteps = 120, throughSteps = 24, arriveSteps = 12 } = {}) {
  const views = [[1440 / 900, false], [390 / 844, true]];
  const cams = [];
  const lookAt = (p) => (narrow) => fwdOf(CAM.yawAt ? CAM.yawAt(p, narrow, { sm }) : YAW0, camPitch(p, narrow));
  const add = (phase, v, pos, lookOf) => {
    const mats = views.map(([aspect, narrow]) => {
      const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.05, 1200);
      cam.position.copy(pos);
      cam.lookAt(pos.clone().add(lookOf(narrow)));
      cam.updateMatrixWorld();
      return new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    });
    cams.push({ phase, v, pos, mats });
  };
  for (let k = 0; k <= pushSteps; k++) add('push', k / pushSteps, PUSH_PATH.getPointAt(ease(k / pushSteps)), lookAt(k / pushSteps));
  const end = PUSH_PATH.getPointAt(1);
  for (let k = 1; k <= throughSteps; k++) {
    const u = k / throughSteps;
    add('through', u, end.clone().addScaledVector(lookAt(1)(false), (CAM.throughDist ?? 16) * u * u), lookAt(1));
  }
  const start = PUSH_PATH.getPointAt(0);
  for (let k = 0; k < arriveSteps; k++) {
    const a = 1 - ease(k / arriveSteps);
    add('arrive', k / arriveSteps, start.clone().addScaledVector(lookAt(0)(false), -(CAM.arriveBack ?? 3.5) * a).add(V3(0, (CAM.arriveUp ?? 0.6) * a, 0)), lookAt(0));
  }
  return cams;
}
// the sweep: every camera step against every person over time (on twos, 1/12 s); for each person, the closest approach
// while in view. under: closer than their limit on the push; underThrough / underArrive: on the four-season page's fly-through
// past the end (not for the last season) and its arrival from behind the eye (not for the first season). All three fail qa.mjs
function nearPeople({ limit = NEAR_PERSON, mainLimit = NEAR_MAIN, pushSteps = 120, throughSteps, arriveSteps, t0 = 0, t1 = 150, dt = 1 / 12, mainSeconds = 24, report = 12 } = {}) {
  const at = JOURNEY_ORDER.indexOf(SEASON_ID);
  throughSteps ??= at === JOURNEY_ORDER.length - 1 ? 0 : 24;
  arriveSteps ??= at === 0 ? 0 : 12;
  const cams = nearCams({ pushSteps, throughSteps, arriveSteps });
  const lim = (p) => (p.limit === NEAR_MAIN ? mainLimit : limit);
  const lo = V3(Infinity, Infinity, Infinity), hi = V3(-Infinity, -Infinity, -Infinity);
  for (const c of cams) { lo.min(c.pos); hi.max(c.pos); }
  const far = limit + 3;
  const best = new Map();
  const better = (k, d) => { const b = best.get(k); return !b || d < b.d; };
  const steps = Math.round((t1 - t0) / dt);
  for (let s = 0; s <= steps; s++) {
    const t = t0 + s * dt;
    for (const p of personsAt(t)) {
      if (p.x < lo.x - far || p.x > hi.x + far || p.z < lo.z - far || p.z > hi.z + far) continue;
      for (const c of cams) {
        const d = distToPerson(c.pos, p);
        const k = c.phase + '|' + p.name;
        if (d < far && better(k, d) && (inView(c.mats[0], p) || inView(c.mats[1], p))) best.set(k, { name: p.name, d, phase: c.phase, v: c.v, t, limit: lim(p) });
      }
    }
  }
  // the main people: capsules every half second through their loops (mainSeconds), else their boxes as they stand
  const capsFolders = peopleInfo.some((i) => typeof i.part.caps === 'function');
  const mts = [];
  for (let t = 0; t <= mainSeconds + 1e-9; t += 0.5) mts.push(t);
  for (const mt of capsFolders ? mts : [undefined]) {
    for (const b of mainShapes(mt)) for (const c of cams) {
      const d = b.dist(c.pos), k = c.phase + '|' + b.name;
      if (better(k, d) && (b.seen(c.mats[0]) || b.seen(c.mats[1]))) best.set(k, { name: b.name, d, phase: c.phase, v: c.v, t: b.name.endsWith(':caps') ? mt : null, limit: lim(b) });
    }
  }
  // put the main people back as they were
  if (capsFolders && people) people.update(worldT, 0);
  const fmt = (b) => ({ name: b.name, d: +b.d.toFixed(2), limit: b.limit, [b.phase]: +b.v.toFixed(3), t: b.t === null ? null : +b.t.toFixed(2) });
  const of = (phase) => [...best.values()].filter((b) => b.phase === phase).sort((a, b) => a.d - b.d).map(fmt);
  const P = of('push'), T = of('through'), A = of('arrive');
  return {
    limit, mainLimit, seconds: [t0, t1], steps: { push: pushSteps, through: throughSteps, arrive: arriveSteps },
    under: P.filter((b) => b.d < b.limit), underThrough: T.filter((b) => b.d < b.limit), underArrive: A.filter((b) => b.d < b.limit),
    closest: P.slice(0, report),
  };
}
state.nearPeople = (o = {}) => nearPeople(o);

// ---------------- loop ----------------
let last = performance.now(), fpsAcc = 0, fpsN = 0, frameMsAcc = 0, frameMax = 0;
const devEl = document.getElementById('dev');
function loop(now) {
  if (EMBED && !J.run) { running = false; return; }
  const frameMs = now - last;
  const dt = Math.min(0.05, frameMs / 1000);
  last = now;
  update(dt);
  renderFrame();
  if (DEV) warnNear();
  fpsAcc += dt; fpsN++; frameMsAcc += frameMs; frameMax = Math.max(frameMax, frameMs);
  if (fpsAcc > 0.5) {
    state.stats.fps = +(fpsN / fpsAcc).toFixed(1);
    state.stats.frameMs = +(frameMsAcc / fpsN).toFixed(2);
    state.stats.frameMaxMs = +frameMax.toFixed(1);
    if (DEV) devEl.textContent = `${state.stats.fps} fps · ${state.stats.frameMs} ms/frame (max ${state.stats.frameMaxMs}) · ${state.stats.calls} draws · ${Math.round(state.stats.triangles / 1000)}k tris · load ${state.stats.readyMs} ms · t ${worldT.toFixed(1)} · push ${push.v.toFixed(2)} · focus ${focus.k.toFixed(2)}`;
    fpsAcc = 0; fpsN = 0; frameMsAcc = 0; frameMax = 0;
  }
  requestAnimationFrame(loop);
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  view.w = w; view.h = h;
  narrowNow = w / h < 0.95;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  renderer.getDrawingBufferSize(size);
  rtMain.setSize(size.x, size.y);
  rtBottle.setSize(size.x, size.y);
  rtBlurA.setSize(size.x >> 1, size.y >> 1);
  rtBlurB.setSize(size.x >> 1, size.y >> 1);
  rtShaft.setSize(size.x >> 1, size.y >> 1);
  rtShaftB.setSize(size.x >> 1, size.y >> 1);
  finalMat.uniforms.uRes.value.copy(size);
  U.uPx.value = (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / h;
}
window.addEventListener('resize', resize);

// ---------------- test hooks ----------------
// (checks: the four-season page's arrival and fly-through on this page too; the close-up held at k without its animation)
let jView = false;
state.setJourneyView = (o = null) => { jView = !!o; Object.assign(J, { through: 0, arrive: 1, ...(o || {}) }); update(0); renderFrame(); return true; };
state.setFocusK = (k = null) => {
  if (k === null) { focus.k = 0; focus.t0 = -1; }
  else { focus.k = k; focus.t0 = -1; focus.from = focus.to = k; }
  update(0); renderFrame();
  return true;
};
state.bottleShapes = () => bottleShapes();
state.peopleParts = () => peopleInfo.map((i) => ({ folder: i.folder, roles: i.roles, part: i.part, roots: i.roots }));
state.setTime = (t, draw = true) => { frozen = true; worldT = t; update(0); if (draw) renderFrame(); return true; };
state.setView = ({ x = 0, y = 0, push: pv } = {}) => { fixedOff.on = true; fixedOff.x = x; fixedOff.y = y; if (pv !== undefined) { push.v = push.target = pv; } update(0); renderFrame(); return true; };
state.freeView = () => { fixedOff.on = false; };
// dev: look from anywhere (pos, target as [x, y, z]); debugCam() returns to the scroll camera
let camOverride = null;
state.debugCam = (p, t) => { camOverride = p ? [V3(...p), V3(...t)] : null; update(0); renderFrame(); return true; };
state.resume = () => { frozen = false; };
state.open = () => openNotes();
state.close = () => closeNotes();
state.focus = () => ({ k: focus.k, open: focus.open, push: push.v });
state.project = (x, y, z) => {
  const v = new THREE.Vector3(x, y, z).project(camera);
  return { x: (v.x * 0.5 + 0.5) * view.w, y: (-v.y * 0.5 + 0.5) * view.h };
};
state.crop = (P, sz = 200) => {
  update(0); renderFrame();
  const p = state.project(...P);
  const c = document.createElement('canvas');
  c.width = c.height = sz;
  const g = c.getContext('2d');
  g.drawImage(canvas, (p.x - sz / 2) * DPR, (p.y - sz / 2) * DPR, sz * DPR, sz * DPR, 0, 0, sz, sz);
  return { px: [+p.x.toFixed(1), +p.y.toFixed(1)], url: c.toDataURL('image/png') };
};
state.bench = (n = 60) => {
  const gl = renderer.getContext();
  const px = new Uint8Array(4);
  const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  update(0.016); renderFrame(); sync();
  const t0 = performance.now();
  for (let i = 0; i < n; i++) { update(1 / 60); renderFrame(); sync(); }
  return +((performance.now() - t0) / n).toFixed(2);
};
// where the bottle is on screen with the camera standing still at the season's start (no pointer drift, notes closed)
state.bottleRestRect = () => {
  if (!bottle) return null;
  const cam = camera.clone();
  const pos = PUSH_PATH.getPointAt(0);
  cam.position.copy(pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(pos.clone().add(fwdOf(camYaw(0), camPitch(0))));
  cam.aspect = view.w / view.h;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  const M = new THREE.Matrix4().compose(BOTTLE_AT, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, BOTTLE_RY, 0)), V3(BOTTLE_SCALE, BOTTLE_SCALE, BOTTLE_SCALE));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const c of bbox) {
    tmpV.copy(c).applyMatrix4(M).project(cam);
    const x = (tmpV.x * 0.5 + 0.5) * view.w, y = (-tmpV.y * 0.5 + 0.5) * view.h;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x: +x0.toFixed(1), y: +y0.toFixed(1), w: +(x1 - x0).toFixed(1), h: +(y1 - y0).toFixed(1) };
};
// where the bottle is on screen (for the squint check)
state.bottleRect = () => { const r = hit.getBoundingClientRect(); return bottle ? [r.x, r.y, r.width, r.height] : null; };
// Where the GLASS is on screen — the bottle's own body, not the button over it and not the sketch loops, which are drawn
// deliberately wider than the glass. bottleRect() above is the button: it is floor-clamped to 44 px so a finger can hit
// it, so for a small bottle it is wider than the thing it covers, and a check that scores that box is scoring the
// street beside the bottle as well. (README 13: measure the body, not the group. This is the same fault that made the
// squint check report the lamp's score as the bottle's.)
state.bottleBodyRect = () => {
  if (!bottle) return null;
  const glass = (bottle.userData && bottle.userData.main) || null;
  if (!glass) return null;
  glass.updateWorldMatrix(true, false);
  const pos = glass.geometry.attributes.position;
  if (!pos) return null;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const v = new THREE.Vector3();
  const step = Math.max(1, Math.floor(pos.count / 2000));
  for (let i = 0; i < pos.count; i += step) {
    v.fromBufferAttribute(pos, i).applyMatrix4(glass.matrixWorld);
    const p = state.project(v.x, v.y, v.z);
    if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
  }
  if (!(x1 > x0)) return null;
  return [x0, y0, x1 - x0, y1 - y0].map((n) => +n.toFixed(1));
};
// the clipping check: nothing may pass through anything (crowd, vehicles, people, the season's solids, the camera)
state.clipCheck = (o = {}) => clipCheck(o);

// ---------------- the bottle against what it stands on and what stands beside it ----------------
// The bottle is the one thing the whole page points at, and until 18/9 no check ever looked at it: Đông's bottle stood 43 mm
// sunk into its own crate. This reads the real box of the built bottle (and of its stopper, when a season sets it down) and
// compares it with the season's own solids: what is under it (the crate, the table, the ground) and what stands beside it
// (a wall, a post, a stall).
// - `sunk`: how far the bottle's base is below the top of the thing under it (over `tol`, the viewer sees it cut in).
// - `float`: how far above it hangs.
// - `through`: a solid beside it whose body it enters.
function bottleStand({ tol = 0.005 } = {}) {
  if (!bottle) return { note: 'this scene has no bottle' };
  // what is really there, not what the season says is there: rays into the built scene
  const skip = new Set();
  bottle.traverse((o) => skip.add(o));
  const cap0 = bottle.userData && bottle.userData.cap;
  if (cap0) cap0.traverse((o) => skip.add(o));         // a stopper set down elsewhere is still part of the bottle
  // everything the bottle could be standing on, people's things included (a flower bike may well be the table it stands on);
  // for what it might be standing *inside*, people are left out — they move, and that is clip.mjs's work
  const targets = [], still = [];
  scene.traverse((o) => {
    if (!o.isMesh || skip.has(o) || !o.geometry || !o.visible) return;
    if (o.layers.mask === 0) return;
    targets.push(o);
    if (!o.userData.chomPerson) still.push(o);
  });
  const ray = new THREE.Raycaster();
  ray.firstHitOnly = true;
  const hit = (from, dir, far, mine, list = targets) => {
    ray.set(from, dir.clone().normalize());
    ray.far = far;
    const hits = ray.intersectObjects(list, true);
    for (const h of hits) if (!skip.has(h.object) && !(mine && mine.has(h.object))) return h;
    return null;
  };
  const read = (obj, name, solid = null) => {
    const mine = new Set();
    obj.traverse((o) => mine.add(o));                  // never count the thing itself as something it runs into
    // the glass itself, not the sketch loops drawn round it or the painted highlights laid on it: those reach past the glass
    // on purpose, and a check that measured them would call every bottle sunk
    const b = new THREE.Box3().setFromObject(solid || obj);
    if (b.isEmpty()) return null;
    const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
    const rx = sz.x / 2, rz = sz.z / 2;
    const down = new THREE.Vector3(0, -1, 0);
    // what holds it up: straight down from just inside its own footprint, from a little above its base
    let best = null;
    for (const [ox, oz] of [[0, 0], [0.55, 0.55], [-0.55, 0.55], [0.55, -0.55], [-0.55, -0.55]]) {
      const from = new THREE.Vector3(c.x + ox * rx, b.min.y + Math.min(0.05, sz.y * 0.2), c.z + oz * rz);
      const h = hit(from, down, 0.6, mine);
      if (h && (!best || h.point.y > best.point.y)) best = h;
    }
    const nameOf = (o) => { const n = []; for (let a = o; a && a !== scene; a = a.parent) if (a.name) n.push(a.name); return n.reverse().join('/') || `${o.type}#${o.id}`; };
    const top = best ? best.point.y : 0;
    const gap = b.min.y - top;
    // anything standing inside its own body: rays out from its middle at three heights
    const through = [];
    const seen = new Set();
    for (const f of [0.2, 0.5, 0.8]) {
      const y = b.min.y + sz.y * f;
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
        const reach = Math.abs(Math.cos(a)) * rx + Math.abs(Math.sin(a)) * rz;
        const h = hit(new THREE.Vector3(c.x, y, c.z), dir, reach, mine, still);
        if (!h) continue;
        if (best && h.object === best.object) continue;      // the thing it stands on is not a thing it runs into
        const nm = nameOf(h.object);
        if (seen.has(nm)) continue;
        seen.add(nm);
        through.push({ name: nm, intoMm: Math.round((reach - h.distance) * 1000) });
      }
    }
    return {
      what: name,
      base: +b.min.y.toFixed(3), top: +b.max.y.toFixed(3),
      size: [+sz.x.toFixed(3), +sz.y.toFixed(3), +sz.z.toFixed(3)],
      standsOn: best ? nameOf(best.object) : 'nothing (the ground)',
      standsOnAt: best ? [+best.point.x.toFixed(3), +best.point.y.toFixed(3), +best.point.z.toFixed(3)] : null,
      surfaceY: +top.toFixed(3),
      sunkMm: gap < -tol ? Math.round(-gap * 1000) : 0,
      floatMm: gap > tol ? Math.round(gap * 1000) : 0,
      through,
    };
  };
  const glass = (bottle.userData && bottle.userData.main) || bottle;
  const out2 = { tolMm: Math.round(tol * 1000), looked: targets.length, measured: 'the glass itself', bottle: read(bottle, 'the bottle', glass) };
  const cap = bottle.userData && bottle.userData.cap;
  if (cap && cap.parent && cap.parent !== bottle) out2.cap = read(cap, 'the stopper', (cap.userData && cap.userData.main) || cap);
  else if (cap) out2.cap = { what: 'the stopper', note: 'still on the neck' };
  return out2;
}
state.bottleStand = (o = {}) => bottleStand(o);
// The bottle's real size, and the real size of everything standing near it — in millimetres of the world, not pixels.
// This is the question "is the bottle still believable where it stands": a perfume bottle on a tea stall has to stay
// smaller than the teapot beside it, and pixels cannot tell you that. (21/9, for choosing how much to enlarge it.)
state.aroundBottle = (radiusM = 1.2) => {
  if (!bottle) return null;
  const mine = new Set();
  bottle.traverse((o) => mine.add(o));
  const cap = bottle.userData && bottle.userData.cap;
  if (cap) cap.traverse((o) => mine.add(o));
  const glass = (bottle.userData && bottle.userData.main) || bottle;
  const gb = new THREE.Box3().setFromObject(glass);
  const gc = gb.getCenter(new THREE.Vector3());
  const mm = (v) => Math.round(v * 1000);
  const out = {
    bottle: { tallMm: mm(gb.max.y - gb.min.y), wideMm: mm(Math.max(gb.max.x - gb.min.x, gb.max.z - gb.min.z)), scale: BOTTLE_SCALE },
    standsOn: null, near: [],
  };
  try { const st = bottleStand(); out.standsOn = st && st.bottle ? st.bottle.standsOn : null; } catch (e) { /* older scene */ }
  const seen = new Map();
  scene.traverse((o) => {
    if (!o.isMesh || mine.has(o) || !o.geometry || !o.visible || o.layers.mask === 0) return;
    // Most things on a tea stall are unnamed merged meshes, so a name cannot be required — a check that only looked at
    // named objects reported "nothing stands near the bottle" for a bottle sitting among cups. Anything of a human size
    // counts, and one without a name is described by what it is instead: how big, how far, how many corners.
    let nm = '';
    for (let a = o; a && a !== scene; a = a.parent) if (a.name) { nm = a.name; break; }
    const b = new THREE.Box3().setFromObject(o);
    if (b.isEmpty()) return;
    const sz = b.getSize(new THREE.Vector3());
    // a merged batch of a whole street is not "a thing standing next to the bottle" — only things of a human size
    if (sz.x > 3 || sz.y > 3 || sz.z > 3) return;
    const d = b.getCenter(new THREE.Vector3()).distanceTo(gc);
    if (d > radiusM) return;
    const verts = o.geometry.attributes.position ? o.geometry.attributes.position.count : 0;
    const row = { name: nm || `(không tên) #${o.id}`, awayMm: mm(d), tallMm: mm(sz.y), wideMm: mm(Math.max(sz.x, sz.z)), verts };
    const k = `${row.name}|${row.tallMm}|${row.wideMm}`;
    if (!seen.has(k) || seen.get(k).awayMm > row.awayMm) seen.set(k, row);
  });
  out.near = [...seen.values()].sort((a, b) => a.awayMm - b.awayMm).slice(0, 30);
  return out;
};
// how large the bottle and its label really are on the screen, from the scene (for the size decision)
state.bottleSize = () => {
  if (!bottle) return null;
  const b = new THREE.Box3().setFromObject(bottle);
  if (b.isEmpty()) return null;
  const c = b.getCenter(new THREE.Vector3());
  const top = state.project(c.x, b.max.y, c.z), bot = state.project(c.x, b.min.y, c.z);
  let lab = null;
  bottle.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.tLabel) lab = o; });
  let label = null;
  if (lab) {
    const g = lab.geometry.parameters;
    lab.updateWorldMatrix(true, false);
    const pt = (x, y) => { const v = new THREE.Vector3(x, y, 0).applyMatrix4(lab.matrixWorld); return state.project(v.x, v.y, v.z); };
    const a = pt(0, g.height / 2), d = pt(0, -g.height / 2);
    label = { pxTall: +Math.abs(a.y - d.y).toFixed(1), sideM: g.width };
  }
  return { scale: BOTTLE_SCALE, tallM: +(b.max.y - b.min.y).toFixed(3), pxTall: +Math.abs(top.y - bot.y).toFixed(1), label };
};
if (DEV) { window.__shaftMat = shaftMat; state.THREE = THREE; state.getCrowd = () => crowdBg; state.getPeople = () => people; state.casters = casters; state.renderer = renderer; state.scene = scene; state.U = U; state.camera = camera; state.finalMat = finalMat; state.rtShadow = rtShadow; state.shCam = shCam; }

// ---------------- start-up without long stalls ----------------
// Everything the first frame would do at once is done beforehand, a slice at a time: the shaders are compiled off the page's
// thread (KHR_parallel_shader_compile), then their uniforms looked up, the textures and targets made, every mesh's buffers
// sent (drawn into a 1 x 1 target, a few meshes at a time) and the lamps' shadow maps drawn one by one.
// ms of work after each frame: 24 while nothing is shown yet; in the background 6 while the viewer scrolls, 12 when the page is
// still (the frame then stays under 33 ms; the scene's own motion is on twos anyway)
const WORK_FG = 24, WORK_BG_SCROLL = 6, WORK_BG_STILL = 12, WORK_ENTRANCE = 4;
const scrolledAt = () => { try { return window.parent.__chomScrollAt || 0; } catch (e) { return 0; } };
const workBudget = () => (entranceHeld() ? WORK_ENTRANCE : !inBackground() ? WORK_FG : Date.now() - scrolledAt() < 400 ? WORK_BG_SCROLL : WORK_BG_STILL);
let sliceEnd = 0;
// resolves at once while the current slice has time left, else right after the page's next frame
const PROBE_GPU = params.get('probe') === '1';
const probePx = new Uint8Array(4);
let probeLabel = '';
function gpuSync(label) {
  const gl = renderer.getContext();
  const k = renderer.getRenderTarget();
  renderer.setRenderTarget(null);
  const t = performance.now();
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probePx);
  const d = performance.now() - t;
  if (d > 3) TL.push(['probe gpu wait after ' + label, Math.round(t - T0), +d.toFixed(1)]);
  renderer.setRenderTarget(k);
}
// How long a folder goes without offering the page back. core.slice() only hands the page over when the current slice
// has run out of time, so a folder that does 80 ms of work between two calls to it holds the page for 80 ms whatever the
// budget says — and while that season is building behind the four-season page, the viewer feels every millisecond of it.
// Measured here, per folder, because the core owns the budget and nobody else can see across the folders.
// (21/9: this is the same 60–86 ms that people/nguoiban and people/laixe report, and the same thing that makes the
// journey stutter at the start. One fault, felt in two places.)
let sliceWatch = null, lastSliceAt = 0;
// (?dev=1) every call a folder makes to core.slice(), on the page's clock, with one mark that ties that clock to a
// browser trace: core/qa/perf-people.mjs cuts the profiler's record of the folder's own code at these calls, so what it
// reports is the longest piece of work the folder did between two chances to pause — its own granularity, whatever the
// budget let run on after it, and never the time it spent waiting for a file.
const sliceCalls = DEV ? (state.sliceCalls = []) : null;
const watchSlices = (label) => {
  if (sliceCalls && !state.sliceClock) { performance.mark('chom:slice-clock'); state.sliceClock = performance.getEntriesByName('chom:slice-clock')[0]?.startTime ?? null; }
  if (sliceCalls) sliceCalls.push([+performance.now().toFixed(3), label, 'start']);
  sliceWatch = label;
  lastSliceAt = performance.now();
  const w = (state.longestStretch = state.longestStretch || {});
  if (w[label] === undefined) w[label] = 0;   // 0, not missing: a folder built without ever yielding still has an answer
};
// the tail counts too — a folder that never calls core.slice() at all held the page for its whole build
const stopWatchingSlices = () => { noteSlice(); if (sliceCalls && sliceWatch) sliceCalls.push([+performance.now().toFixed(3), sliceWatch, 'end']); sliceWatch = null; };
function noteSlice() {
  const now = performance.now();
  if (sliceWatch && lastSliceAt) {
    const gap = now - lastSliceAt;
    const w = (state.longestStretch = state.longestStretch || {});
    if (!(w[sliceWatch] >= gap)) w[sliceWatch] = +gap.toFixed(1);
  }
  lastSliceAt = now;
}
async function slice() {
  noteSlice();
  if (sliceCalls && sliceWatch) sliceCalls.push([+performance.now().toFixed(3), sliceWatch]);
  if (performance.now() < sliceEnd) return;
  if (PROBE_GPU) gpuSync(probeLabel);
  // hand the GPU what this slice asked for now
  renderer.getContext().flush();
  await BUILD.WORK.nextSlice();
  if (gpuStep) await entranceHold();
  // (the wait for the frame is not the folder's work: its next stretch starts now)
  if (sliceWatch) lastSliceAt = performance.now();
  sliceEnd = performance.now() + BUILD.WORK.sliceMs();
}
const pauseNow = () => { sliceEnd = 0; return slice(); };
// in the background: wait until the viewer has not scrolled for a moment (at most 1.2 s from since)
// How long a season loading behind the page will hold a heavy, unsplittable step back while the viewer is scrolling.
// It cannot wait forever: this season has to be ready before the viewer scrolls into it. ?quietms= for measuring.
const QUIET_MS = +params.get('quietms') || 1200;
let gaveUpQuiet = 0;                         // how many times it ran out of patience and did the heavy step anyway
async function quiet(since) {
  if (!inBackground()) return;
  while (Date.now() - scrolledAt() < 300 && performance.now() - since < QUIET_MS) await new Promise((r) => setTimeout(r, 80));
  if (Date.now() - scrolledAt() < 300) { gaveUpQuiet++; state.stats.gaveUpQuiet = gaveUpQuiet; }
}
async function warmUp() {
  // (the GPU's share of the start waits out the page's entrance, core/journey.js)
  gpuStep = true;
  await entranceHold();
  // Whole numbers the shader reads as floats, anywhere in the scene (floatAttributes above). Until 22/9 this ran only over
  // what a people folder added at the TOP of the scene — and people/laixe puts its rider on the season's own motorbike
  // group, so his meshes kept their Uint8 skinIndex. Measured 22/9 (?probe=1, a GPU wait before and after each warm-up
  // draw): RiderLines 170 ms, RiderOutfit 120 + 81, BikeChrome 43 — the GPU building a special shader for each, in one
  // piece — while the seller and the customer, already Float32, cost 13–14 ms. Those were the 80 / 60 / 125 ms freezes
  // right after the name "Chớm" lands. The numbers stay exact, so the picture cannot change.
  const tf0 = performance.now();
  state.stats.floatAttributes = floatAttributes(scene);
  mark(`warm: ${state.stats.floatAttributes} whole-number attributes made float`, tf0);
  const t0 = performance.now();
  // a season warming up behind the page hands its work to the GPU in small pieces: after each new kind of draw and each
  // pass it waits for the GPU to catch up (one pixel read), so the shared GPU never gets a heap of new shapes at once
  // and the season the viewer is looking at keeps its frames (?drain=0 turns it off)
  const glD = renderer.getContext(), pxD = new Uint8Array(4);
  const drain = () => {
    if (!inBackground() || params.get('drain') === '0') return;
    const k = renderer.getRenderTarget();
    renderer.setRenderTarget(null);
    glD.readPixels(0, 0, 1, 1, glD.RGBA, glD.UNSIGNED_BYTE, pxD);
    renderer.setRenderTarget(k);
  };
  const keep = renderer.getRenderTarget();
  // The shaders, a FEW AT A TIME. Until 22/9 every program of the season was sent in one go (renderer.compile(scene)):
  // on Chrome for Windows each one then becomes a Direct3D compile on a worker thread of the GPU process, and 41 of them
  // at once filled every core of the machine — measured 22/9 (loadstutter --why): 27.8 s of compile work inside 2.37 s,
  // and the page's own thread, starved, took those 2.37 s to finish a step that normally takes 17 ms. The viewer saw the
  // opening freeze for 1.3–2.3 s in half the runs, right after the name "Chớm" landed (and 0.9 s when Hạ warmed up).
  // Now each drawable is compiled on its own (renderer.compile of that one object, with the scene's lights), and no more
  // than COMPILE_AT_ONCE new programs are ever compiling: the next ones wait until one is done. The same programs come
  // out (same objects, same cameras, same targets as before), so nothing in the picture changes; it only takes turns.
  // (only a season building behind something the viewer is looking at takes turns: the opening scene, and a season opened
  // on its own page, compile under their waiting screen as before — the opening would otherwise open 0.5 s later)
  const COMPILE_AT_ONCE = +params.get('compileatonce') || (HOLDABLE ? 2 : Infinity);
  const PARALLEL = renderer.extensions.has('KHR_parallel_shader_compile');
  const mats = new Set();
  const addAll = (set) => set.forEach((m) => mats.add(m));
  const seenPrograms = new Set(renderer.info.programs || []);
  const compiling = [];
  let most = 0;
  const settle = async (left) => {
    for (;;) {
      for (let i = compiling.length - 1; i >= 0; i--) if (compiling[i].isReady()) compiling.splice(i, 1);
      if (compiling.length <= left) return;
      await new Promise((r) => setTimeout(r, 8));
    }
  };
  const compileOne = async (obj, cam, rt, target) => {
    // (a season that reached this before the page's entrance began stops sending here until it is over)
    await entranceHold();
    renderer.setRenderTarget(rt);
    addAll(renderer.compile(obj, cam, target));
    for (const pr of renderer.info.programs || []) if (!seenPrograms.has(pr)) { seenPrograms.add(pr); compiling.push(pr); }
    most = Math.max(most, compiling.length);
    if (PARALLEL) await settle(COMPILE_AT_ONCE - 1);
    await slice();
  };
  const drawables = [];
  scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) drawables.push(o); });
  for (const o of drawables) await compileOne(o, camera, rtMain, scene);
  if (casters.length) {
    for (const c of casters) { c.saved = c.mesh.material; c.mesh.material = c.sm; }
    for (const c of casters) await compileOne(c.mesh, shCam, rtShadow, scene);
    for (const c of casters) c.mesh.material = c.saved;
  }
  for (const [m, t] of [[shaftMat, rtShaft], [blurMat, rtBlurA], [finalMat, null]]) {
    fsQuad.material = m;
    await compileOne(fsScene, fsCam, t, fsScene);
  }
  renderer.setRenderTarget(keep);
  mark(`warm: shaders sent (${Number.isFinite(COMPILE_AT_ONCE) ? COMPILE_AT_ONCE : 'all'} at a time, most at once ${most})`, t0);
  await pauseNow();
  const programs = new Set();
  for (const m of mats) { const pr = renderer.properties.get(m).programs; if (pr) for (const p of pr.values()) programs.add(p); }
  const tw = performance.now();
  if (PARALLEL) {
    let left = [...programs];
    while (left.length) {
      left = left.filter((p) => !p.isReady());
      if (left.length) await new Promise((r) => setTimeout(r, 8));
    }
  }
  mark(`warm: ${programs.size} shaders compiled`, tw);
  const tu = performance.now();
  for (const p of programs) { p.getUniforms(); p.getAttributes(); await slice(); }
  mark('warm: uniforms', tu);
  // textures (in the materials' uniforms) and render targets
  const tt = performance.now();
  const texs = new Set();
  for (const m of mats) for (const u of Object.values(m.uniforms || {})) {
    const v = u && u.value;
    if (v && v.isTexture) texs.add(v);
    else if (Array.isArray(v)) for (const x of v) if (x && x.isTexture) texs.add(x);
  }
  for (const tex of texs) { if (!tex.isRenderTargetTexture && !tex.isDepthTexture) { if (PROBE_GPU) probeLabel = `texture ${tex.image?.width}x${tex.image?.height}`; renderer.initTexture(tex); await slice(); } }
  // (each target cleared once, in its own slice: the GPU makes its memory then, not in the first frame)
  for (const [ri, rt] of [rtMain, rtShaft, rtShaftB, rtBottle, rtBlurA, rtBlurB, rtShadow, ...lamps.map((l) => l.rt), ...(cube ? [cube.rt] : [])].entries()) {
    await pauseNow();
    if (PROBE_GPU) probeLabel = `target ${ri} ${rt.width}x${rt.height} s${rt.samples}`;
    renderer.initRenderTarget(rt);
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
  }
  renderer.setRenderTarget(keep);
  mark('warm: textures and targets', tt);
  // every mesh drawn once into a 1 x 1 target (its buffers go up), and every caster once with its shadow material.
  // The first draw of a new kind of thing (a material with a new set of attributes) makes the GPU build a shader variant
  // on its main thread (a long stall of the whole page on a first visit; the browser keeps them for the next): those are
  // drawn one per slice, and in the background only while the viewer is not scrolling (or after 1.2 s of waiting)
  const tb = performance.now();
  // (a 1 x 1 target of the SAME kind as the frame's own — half float, 4 samples: the first draw of a shape into a
  // multisampled target is a separate piece of work for the GPU's driver, and drawn here it is done one shape per slice
  // instead of all at once in the first real frame; measured 22/9 in the journey: a 116 ms batch in "warm: passes")
  const tiny = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: rtMain.samples });
  const wcam = camera.clone();
  wcam.layers.set(31);
  const meshes = [];
  scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine) && o.geometry) meshes.push(o); });
  const casterOf = new Map(casters.map((c) => [c.mesh, c]));
  const kinds = new Set();
  // (materials with the same shader share one program: the kind is the program, with the mesh's attributes)
  const kindOf = (o, m) => {
    const pr = renderer.properties.get(m).programs;
    const keys = pr ? [...pr.keys()].sort().join('/') : m.uuid;
    return `${keys}|${o.isSkinnedMesh ? 's' : ''}${o.isInstancedMesh ? 'i' : ''}|${Object.keys(o.geometry.attributes).join(',')}`;
  };
  const draws = [];
  for (const o of meshes) {
    for (const m of [o.material, casterOf.get(o)?.sm]) {
      if (!m || Array.isArray(m)) continue;
      const kk = kindOf(o, m);
      draws.push({ o, m, fresh: !kinds.has(kk) });
      kinds.add(kk);
    }
  }
  let k = 0;
  while (k < draws.length) {
    const group = [draws[k++]];
    if (group[0].fresh) { await quiet(tb); await pauseNow(); }
    else {
      let verts = group[0].o.geometry.attributes.position?.count ?? 0;
      while (k < draws.length && !draws[k].fresh && !PROBE_GPU && verts < (inBackground() ? 20000 : 400000)) { verts += draws[k].o.geometry.attributes.position?.count ?? 0; group.push(draws[k++]); }
    }
    // (hidden things too, and whatever hides them: a note that only shows at the hand-off must be ready as well)
    const shown = [];
    const kept = group.map(({ o, m }) => {
      const r = [o, o.material, o.frustumCulled];
      o.material = m; o.layers.enable(31); o.frustumCulled = false;
      for (let a = o; a; a = a.parent) if (!a.visible) { a.visible = true; shown.push(a); }
      return r;
    });
    if (PROBE_GPU) {
      // (the probe waits for the GPU before AND after this one draw, so what it writes down is this draw alone — before,
      // the wait was taken at the end of a slice and named after its last draw, whatever earlier draw cost the time)
      gpuSync(probeLabel);
      const o = group[0].o, m = group[0].m, g = o.geometry;
      const bytes = Object.values(g.attributes).reduce((s, a) => s + (a.array?.byteLength || 0), 0) + (g.index?.array.byteLength || 0);
      probeLabel = `${group[0].fresh ? 'NEW ' : ''}${o.type} "${o.name}" ${m?.type} defs ${Object.keys(m?.defines || {}).join('+')} a2c ${m?.alphaToCoverage} verts ${g.attributes.position?.count} ${(bytes / 1048576).toFixed(1)} MB attrs ${Object.entries(g.attributes).map(([k, a]) => `${k}:${a.array?.constructor.name.replace('Array', '')}`).join(',')}`;
    }
    renderer.setRenderTarget(tiny);
    renderer.render(scene, wcam);
    if (PROBE_GPU) { gpuSync(probeLabel); probeLabel = 'after ' + probeLabel.slice(0, 40); }
    if (group[0].fresh) drain();
    for (const [o, mat, fc] of kept) { o.material = mat; o.layers.disable(31); o.frustumCulled = fc; }
    for (const a of shown) a.visible = false;
    await slice();
  }
  renderer.setRenderTarget(keep);
  tiny.dispose();
  mark(`warm: buffers of ${meshes.length} meshes`, tb);
  // the lamps' shadow maps, one at a time (the first frame then only refreshes one, as every frame does)
  const tl = performance.now();
  probeLabel = 'shadow maps';
  if (casters.length) {
    for (const l of lamps) {
      for (const c of casters) { c.saved = c.mesh.material; c.mesh.material = c.sm; }
      U.uFaceLight.value.set(l.cam.position.x, l.cam.position.y, l.cam.position.z, 1);
      renderer.setRenderTarget(l.rt);
      renderer.setClearColor(0xffffff, 1);
      renderer.clear();
      renderer.render(scene, l.cam);
      l.fresh = true;
      U.uFaceLight.value.w = 0;
      for (const c of casters) c.mesh.material = c.saved;
      await slice();
    }
    if (cube) {
      cube.fresh = true;
      for (let f = 0; f < 6; f += cube.perFrame) {
        for (const c of casters) { c.saved = c.mesh.material; c.mesh.material = c.sm; }
        renderCube();
        U.uFaceLight.value.w = 0;
        for (const c of casters) c.mesh.material = c.saved;
        await slice();
      }
    }
    probeLabel = 'sun shadow';
    renderShadow();
    await slice();
  }
  renderer.setRenderTarget(keep);
  mark('warm: shadow maps', tl);
  // the frame's passes once each, in their own slices, drawn into one pixel (the GPU sets up each pass's state now):
  // the painting, the beams, the blurs, the bottle, the canvas
  const tp = performance.now();
  const PROBE = params.get('probe') === '1';
  const gl0 = renderer.getContext(), px0 = new Uint8Array(4);
  const sync0 = () => { const k = renderer.getRenderTarget(); renderer.setRenderTarget(null); gl0.readPixels(0, 0, 1, 1, gl0.RGBA, gl0.UNSIGNED_BYTE, px0); renderer.setRenderTarget(k); };
  let passN = 0;
  const onePixel = (rt, draw) => {
    if (PROBE) { sync0(); const t = performance.now(); onePixel0(rt, draw); sync0(); mark(`probe warm pass ${passN++}`, t); } else onePixel0(rt, draw);
  };
  const onePixel0 = (rt, draw) => {
    if (rt) { rt.viewport.set(0, 0, 1, 1); rt.scissor.set(0, 0, 1, 1); rt.scissorTest = true; }
    else { renderer.setViewport(0, 0, 1, 1); renderer.setScissor(0, 0, 1, 1); renderer.setScissorTest(true); }
    draw();
    if (rt) { rt.viewport.set(0, 0, rt.width, rt.height); rt.scissor.set(0, 0, rt.width, rt.height); rt.scissorTest = false; }
    else { renderer.setViewport(0, 0, view.w, view.h); renderer.setScissor(0, 0, view.w, view.h); renderer.setScissorTest(false); }
  };
  await pauseNow();
  onePixel(rtMain, () => { renderer.setRenderTarget(rtMain); renderer.setClearColor(CLEAR, 1); renderer.clear(); renderer.render(scene, camera); });
  drain();
  for (const [m, t] of [[shaftMat, rtShaft], [blurMat, rtShaftB], [blurMat, rtBlurA]]) { await pauseNow(); onePixel(t, () => fsPass(m, t)); drain(); }
  if (bottle) {
    await pauseNow();
    onePixel(rtBottle, () => {
      renderer.setRenderTarget(rtBottle);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      camera.layers.set(2);
      renderer.render(scene, camera);
      camera.layers.set(0);
    });
  }
  await pauseNow();
  onePixel(null, () => { renderer.setRenderTarget(null); renderer.clear(); fsPass(finalMat, null); });
  drain();
  renderer.setRenderTarget(keep);
  renderer.getContext().flush();
  mark('warm: passes', tp);
}

build().then(async () => {
  resize();
  push.target = FIXED_PUSH ?? scrollTarget();
  update(0.016, true);
  await warmUp();
  const tf = performance.now();
  update(0.016, true);
  if (params.get('probe') === '1') {
    // (dev probe: what the first full-size frame costs on the GPU, pass by pass)
    const gl = renderer.getContext();
    const px = new Uint8Array(4);
    const sync = () => { const k = renderer.getRenderTarget(); renderer.setRenderTarget(null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); renderer.setRenderTarget(k); };
    const tm = (label, f) => { sync(); const t = performance.now(); f(); sync(); mark('probe ' + label, t); };
    tm('sun shadow', () => renderShadow());
    tm('lamp shadows', () => renderLampShadows());
    tm('main pass', () => { renderer.setRenderTarget(rtMain); renderer.setClearColor(CLEAR, 1); renderer.clear(); renderer.render(scene, camera); });
    tm('main pass again', () => { renderer.setRenderTarget(rtMain); renderer.setClearColor(CLEAR, 1); renderer.clear(); renderer.render(scene, camera); });
    tm('shafts', () => { if (BEAMS) fsPass(shaftMat, rtShaft); });
    tm('final', () => { renderer.setRenderTarget(null); renderer.clear(); fsPass(finalMat, null); });
    tm('whole frame', () => renderFrame());
    tm('whole frame again', () => renderFrame());
  }
  renderFrame();
  renderer.getContext().flush();
  mark('first frame', tf);
  tlOn = false;
  await nextFrame();
  setProgress(1);
  document.documentElement.classList.remove('is-loading');
  state.stats.readyMs = Math.round(performance.now() - T0);
  state.ready = true;
  update(0, true);
  if (params.get('open') === '1') openNotes();
  // ?focusk=<0..1> holds the flight to the bottle where it is, for a preview page to show the bottle large
  if (params.has('focusk')) state.setFocusK(Math.max(0, Math.min(1, +params.get('focusk') || 0)));
  if (DEV) devEl.hidden = false;
  last = performance.now();
  tellParent({ ready: true, readyMs: state.stats.readyMs });
  if (!EMBED || J.run) { running = true; requestAnimationFrame(loop); }
}).catch((e) => {
  console.error('[chom-world] build failed', e);
  state.error = String((e && e.stack) || e);
  tellParent({ error: String((e && e.message) || e) });
  sayOnScreen(String((e && e.message) || e));
});

// something went wrong before the scene could open: say it where the viewer is looking (the veil), not only in the console
function sayOnScreen(message) {
  try {
    const veil = document.querySelector('.veil');
    if (!veil || veil.querySelector('.veil-said')) return;
    const p = document.createElement('p');
    p.className = 'veil-said';
    p.setAttribute('role', 'alert');
    p.style.cssText = 'position:absolute;left:50%;top:58%;transform:translateX(-50%);max-width:30rem;margin:0;padding:0 1.5rem;text-align:center;font:400 0.95rem/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#5a4c48';
    p.textContent = `Chớm could not open this scene. ${message}`;
    veil.appendChild(p);
  } catch (err) { /* the page is beyond saying anything */ }
}

// ---------------- the clipping check ----------------
// Samples time (1/12 s steps, the crowd's own rhythm) and the scroll path. Movers: the crowd (core/crowd.js positions), the
// season's movers (out.movers(t) -> [{ x, z, r, h, name, group }]) and the people's (people.movers(t), if they give it).
// Solids: api.solids and out.solids ([{ x, z, r, h, name }]). Reports every pair closer than the sum of their radii and
// every camera sample that would sit inside something.
function clipCheck({ t0 = 0, t1 = 60, dt = 1 / 12, pushSteps = 40, camTimes = null, ignore = [], still = true } = {}) {
  // the camera against everything that moves: often enough that a vehicle cannot slip between two samples
  if (!camTimes) { camTimes = []; for (let t = 0; t < 24; t += 0.5) camTimes.push(+t.toFixed(2)); }
  const hits = [];
  const solids = [...(api?.solids || []), ...(out?.solids || []), ...(people?.solids || [])];
  const moversAt = (t) => {
    const m = [];
    if (crowdBg) crowdBg.positions(t).forEach((p, i) => { if (p.visible) m.push({ ...p, name: `crowd#${i}(${p.kind})` }); });
    if (out?.movers) m.push(...out.movers(t));
    if (people?.movers) m.push(...people.movers(t));
    return m;
  };
  const seen = new Set();
  const note = (a, b, t, d) => {
    const k = a.name + '|' + b.name;
    if (seen.has(k)) return;
    seen.add(k);
    hits.push({ a: a.name, b: b.name, t: +t.toFixed(2), overlap: +(-d).toFixed(2) });
  };
  let samples = 0;
  for (let t = t0; t <= t1 + 1e-9; t += dt) {
    const m = moversAt(t);
    samples++;
    for (let i = 0; i < m.length; i++) {
      const a = m[i];
      for (let j = i + 1; j < m.length; j++) {
        const b = m[j];
        if (a.group && a.group === b.group) continue;
        if (Math.abs((a.y ?? 0) - (b.y ?? 0)) > 1.2) continue;
        const d = Math.hypot(a.x - b.x, a.z - b.z) - (a.r + b.r);
        if (d < 0) note(a, b, t, d);
      }
      for (const s of solids) {
        if (Math.abs((a.y ?? 0) - (s.y ?? 0)) > 1.2) continue;
        const d = Math.hypot(a.x - s.x, a.z - s.z) - (a.r + s.r);
        if (d < 0) note(a, s, t, d);
      }
    }
  }
  // still things against each other (a sign in a balcony slab, a stool in a table): not parts of one thing (same group, or the
  // same name stem like "tea table -0.3" / "tea table 0"), and only when they overlap by more than 5 cm
  const stem = (n) => String(n || '').replace(/[\s@#(].*$/, '');
  if (still) for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) {
    const a = solids[i], b = solids[j];
    if (a.group && a.group === b.group) continue;
    if (stem(a.name) === stem(b.name)) continue;
    if (Math.abs((a.y ?? 0) - (b.y ?? 0)) > Math.max(a.h ?? 1, b.h ?? 1)) continue;
    const d = Math.hypot(a.x - b.x, a.z - b.z) - (a.r + b.r);
    if (d < -0.05) note(a, b, 0, d);
  }
  for (let k = 0; k <= pushSteps; k++) {
    const p = k / pushSteps;
    const c = PUSH_PATH.getPointAt(ease(p));
    for (const t of camTimes) {
      for (const a of [...moversAt(t), ...solids]) {
        const d = Math.hypot(c.x - a.x, c.z - a.z) - (a.r + 0.3);
        if (c.y < (a.y ?? 0) + (a.h ?? 2) + 0.2 && c.y > (a.y ?? 0) - 0.3 && d < 0) note({ name: `camera(push ${p.toFixed(2)})` }, a, t, d);
      }
    }
  }
  const kept = hits.filter((h) => !ignore.some((re) => new RegExp(re).test(h.a + ' ' + h.b)));
  const balcony = (state.balconyReport || []).map((r) => ({ a: r.name, b: `${r.balcony} (wall or rail)`, t: 0, overlap: +Math.max(0.02 - r.dMin, r.dMax - 0.74, 0).toFixed(2) }));
  return { samples, movers: moversAt(t0).length, solids: solids.length, count: kept.length + balcony.length, hits: [...kept, ...balcony].slice(0, 80) };
}
