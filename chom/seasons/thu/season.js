// Chớm world, season Thu: Nguyễn Du street beside Thiền Quang lake, a night at the end of October.
// No sun: sodium street lamps, shop and window light; night-blue air; milk-flower ivory first, wall yellow second.
// A flower seller has stopped her bicycle (the tray on the back piled with October field daisies and chrysanthemums) under
// a street lamp for a girl who wants a bunch; the bottle rides in the bike's front basket, in the lamp's light.
// Further on, a pavement tea stall: people on low plastic stools, one with a bamboo water pipe. The milk-flower trees along
// the lake are in bloom and their florets drift down; half the street has shut its windows; people walk home the long way
// under the trees, or keep to the house side. The contract: docs/superpowers/specs/2026-09-17-chom-world-contract.md.
//
// Stand-ins (TẠM): until people/xehoa exists, the seller and the girl are simple standing figures at their marks
// (peopleLayout below). The light is in light.js (no sun; core.lamp).
import * as THREE from 'three';
import { NIGHT_SUN, LABEL_LIGHT, LAMPS, setupLights, poolDecals } from './light.js';
import { villaRow, nameplate } from './houses.js';
import { lakeWater, embankment, streetLamps, powerPoles, wireRuns, farLights, farTrees, WATER_Y, EDGE_X } from './lake.js';
import { Cards, milkTree, milkBranch } from './trees.js';
import { flowerBike, teaStall, standIn, BOTTLE_SEAT, BIKE, TEA, bikeToWorld, bikeYawAngle, bikeLampWorld } from './bike.js';
import { crowdList, teaCrowd, balconyPeople, TREE_Z, TREE_X, LANE_Z, LANE2_Z } from './crowd-data.js';

const ST = { kerbNear: 1.1, kerbFar: -3.6, wallNear: 5.2, wallFar: -5.0 };
// A tall phone screen holds only about 21 degrees across with a 44 degree lens: from the computer's eye it would show the
// seller's back, her bike and the bottle, and cut the sale out of the frame. So on a narrow screen the eye steps back up
// the pavement and takes a wider lens: the seller and the bunch she holds out on the left, the bottle in the basket under
// its lamp on the right.
// (21/9, measured, because this used to say "the girl on the left" and she is not there.) Projected with __chom.project:
// from this eye the girl's mark stands at x -86 of a 390 px frame and the point where the bunch changes hands at x 1. The
// phone frame has never held her; what it holds is the seller turning out of frame with the flowers, which is how a sale
// reads from behind. Anyone moving this eye or YAW_NARROW should read those two numbers back, not trust this sentence.
const NARROW = typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 0.95;
// (18/9) With the bottle at its real 100 ml size the 60 degree lens left the glass only 32 px across on a phone - smaller
// than the finger that taps it. The eye steps in along the pavement and the lens comes in with it, so the bottle is read at
// arm's length. The seller and the bunch are still in it; the girl is not (see the projected marks above).
const EYE = NARROW ? [1.66, 1.66, 1.7] : [0.6, 1.42, 0];
const FOV = NARROW ? 48 : 44;
// (21/9) THIS FRAME USED TO FAIL THE 30% BAR AND IT NO LONGER DOES - and what fixed it was NOT this folder.
// Earlier today own share read 15% on 1440x900, and the note that stood here said so: everything inside the glass's own
// box was people/xehoa's wire basket, which this folder may not touch. people/xehoa then darkened and quieted that
// basket, and with nothing changed here own share went 15% -> 36%. (The same move took Hạ's computer frame from 8% to
// 40%.) Four ways out tried from inside this folder are kept in the log below, because all four are still true and
// somebody will be tempted to retry them: eye 0.20 m higher 15% -> 17% · the painter's value plan pulled in and
// deepened 15% -> 17.5% and the whole frame 28% darker · rim light taken off the basket 15% -> 12.4%, the rim helps
// the glass as much as it helps the wires · a longer lens, which is the one that was worth anything.
//
// ══ THE LENS STAYS AT 44°. A LONGER LENS WAS BUILT, MEASURED AND SHOWN TO MIKE ON 21/9, AND HE TURNED IT DOWN. ══
// Do not "discover" this again. Mike asked for a bigger bottle ("cho chai to lên cũng được"), the change was made and
// measured on both frames, he looked at the two frames side by side, and he chose to keep 44°: THE STREET PLATE IS
// WORTH MORE THAN 10 PX OF BOTTLE. The whole range was measured before anything was chosen, because narrowing a lens
// is a change of composition, not a change to a number:
//     FOV 44 (kept)  glass 21 x 41 px    own share 36%   rank 8
//     FOV 40         -                   37%             rank 8
//     FOV 36         glass 26 x 51 px    39%             rank 3   <- the rank stops climbing here
//     FOV 32         -                   41%             rank 3
// So 36 was the only sensible narrower lens - five places of rank, and past it the curve flattens while the street
// keeps shrinking. It was still not worth what it took, measured with seasons/thu/keepout.mjs run before and after:
//   - the street plate PHỐ NGUYỄN DU leaves the frame altogether. It is 48 x 17 px at 44° and it DOES read - that was
//     checked on the picture, not assumed. This is the thing Mike kept.
//   - the milk-flower trees on the left go from 166 px wide to 31; the lake from 178 px to 46;
//     the clear band the page layer puts words in loses a third of its height, 198 px -> 136.
//   - nobody is cut either way: seller, girl and bike stay whole at every one of the 11 moments sampled across the
//     36 s loop, at 44° and at 36°. (That check now lives in keepout.mjs and is worth keeping whatever the lens.)
// AND EVEN AT 36° THE BOTTLE IS NOT THE LOUDEST THING IN THE FRAME - it is third. Two things beat it, both
// people/xehoa's and both part of the sale itself: the bicycle's rim-lit front wheel (28.0) and the white daisies on
// the tray (27.4), against the glass's 25.8. Quieting either means dimming the thing she is selling, which is the trap
// this project has already measured twice. Rank 1 is not available here without lying about the picture - so a longer
// lens could never have bought it either. At 44° the bottle sat at rank 8 and own share 36%, over the 30% bar.
// (21/9, later: the core then made the bottle ×3, and at this same 44° lens the bottle went to RANK 1 on both frames -
// 71% computer, 61% phone - with the street plate untouched. The lever was the bottle, never the lens.)
//
// THE PHONE FRAME KEEPS 48°, and that is a measurement, not caution. At 40° the glass grows 13x27 -> 16x34 and own
// share only moves 77% -> 80%, but the glass's box then ends at x 389 of a 390 px frame and the TAP TARGET hangs 13 px
// off the right edge - which is the exact fault YAW_NARROW was moved 1.9° to fix earlier the same day (see above).

// How far the wide view turns toward the houses. ONE number, read by camera.yaw, by yawAt and by the tree cards below: it
// used to be written out by hand in three places, which is exactly the kind of thing that has bitten this project all day.
const YAW_WIDE = 21;
// How far the tall phone frame turns. ONE number, like YAW_WIDE.
// (21/9) At 7.0 the bottle's own box ended at x 390.2 of a 390 px frame: the glass stood hard against the right edge, with
// nothing beside it, and the squint check put it fourth (best window 33.9). Turning the frame 1.9 degrees further toward
// the houses leaves the bottle 32 px clear of the edge. With the darker basket in people/xehoa/bike.js it reads 41.0,
// against 37.4 for the nearest spot that is not the bottle: rank 1. (Turning alone, with the old bright basket, was
// measured at 9.9 and took it from rank 4 to rank 2, 38.3.) Read back at 390x844 with core/qa/squint.mjs, t = 2, 9, 20, 30.
// Why it stops at 8.9 and not further: the frame turns away from the girl as it turns toward the bottle. Measured with
// __chom.project at t 13 - the point where the bunch changes hands sits at x 1 (just inside the left edge) at 8.9 and at
// x -17 (outside it) at 9.9, and 9.9 only buys 41.8 against 37.8. Her mark itself has never been in this frame (x -86).
const YAW_NARROW = 8.9;
const YAW0 = NARROW ? YAW_NARROW : YAW_WIDE;
const PITCH0 = NARROW ? 1.6 : 1.2;
const POLE_Z = [-13.4, -30.8, -47.6, -64.4, -81.2, -98];
// the street-name post (lake side, between the trees at z -31.4 and -39.8, the lamps at -27.2 and -44)
// exported so seasons/thu/keepout.mjs can read the real mark instead of a hand-copied one (README 13, rule 1)
export const SIGN = { x: -4.6, y: 2.45, z: -35.6 };

// ---------------------------------------------------------------- the main figures' marks (people/xehoa reads peopleLayout)
// Numbers agreed with the people agent (people/xehoa plays both roles; it builds the moving bike, a copy of bike.js, which
// rides in, stops exactly where the season's parked bike stands, and rides on; the parked bike hides when a folder plays
// the seller). The bottle is the core's still bottle, standing in the basket at BOTTLE_SEAT.
// seller: stands on the eye's side of her bike, in front of the rear wheel; conical hat (nón lá), a cloth mask, an old blouse
//   and a thin cardigan, dark silk trousers, plastic sandals, a money pouch.
// customer (the girl): a student walking home, a light blouse, dark trousers, a small shoulder bag, hair in a low knot.
// GIRL_PATH (kept clear of the crowd and of every thing): in from behind the eye, straight to her mark; out along x = 1.05 past
//   the bike's tail, across to x = 3.0 in front of the tea stall, on to (3.2, -12.2), and into the near half of the lane.
// rhythm: on twos, a 36 s loop (the people agent's): the sale at the marks; the girl walks off and is out of sight in the lane
//   from about 28.7 s; the seller fills the gap on her tray (29.3-33 s), then 3 s back to the pose the loop starts from.
const SELLER = [2.05, -2.52], GIRL = [1.1, -2.5];
const EXCH = [1.46, 1.03, -2.64];
// the note changes hands a little toward the girl's right hand
const EXCH_MONEY = [1.58, 1.06, -2.62];
const GIRL_PATH = [
  // in (0-4.4 s, about 1.25 m/s, corners rounded 0.35 m): from the right, behind the eye, along the house-side pavement,
  // round behind the seller's back (about 0.75 m from it) to her mark. A 0.5 m lane round this is kept clear of everything.
  { at: [3.4, 1.2], note: 'in, from the right of the frame (behind the eye)' },
  { at: [3.4, -0.5] },
  { at: [2.5, -1.45] },
  { at: [1.6, -2.05] },
  { at: [GIRL[0], GIRL[1]], stop: true, note: 'her mark: she stops the seller and buys' },
  // out
  { at: [1.05, -3.0], note: 'out, past the tail of the bike' },
  { at: [1.05, -3.9] },
  { at: [3.0, -5.2], note: 'across, in front of the tea stall' },
  { at: [3.0, -7.0] },
  { at: [3.2, -12.2] },
  // she cuts into the lane on the slant, the way people do, and never squares up to the street again: from the moment she
  // leaves the pavement her face is turned into the lane, away from every camera up the street (checked with faces.mjs)
  { at: [4.35, -12.62] },
  { at: [5.45, -13.22], note: 'the lane mouth: the near half of the lane is hers (its walkers keep to z = -14.2)' },
  { at: [6.9, -13.3], note: 'into the lane (hidden by the corner)' },
];
// the girl's clock (the people agent's 36 s loop): in 0-4.4 s, at her mark until she walks off, out of sight in the lane at 28.7 s
const GIRL_TIME = { loop: 36, inEnd: 4.4, hidden: 28.7 };

// TẠM (until people/xehoa plays her): the stand-in walks the same way on the same clock, so the clipping check sees her
function girlTrack() {
  const pts = GIRL_PATH.map((p) => p.at);
  const stopAt = GIRL_PATH.findIndex((p) => p.stop);
  const seg = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const run = (list) => { const L = [0]; for (let i = 1; i < list.length; i++) L.push(L[i - 1] + seg(list[i - 1], list[i])); return L; };
  const inPts = pts.slice(0, stopAt + 1), outPts = pts.slice(stopAt);
  const inL = run(inPts), outL = run(outPts);
  const outSpeed = 1.25, outDur = outL[outL.length - 1] / outSpeed, outStart = GIRL_TIME.hidden - outDur;
  const along = (list, L, d) => {
    let k = 0;
    while (k < L.length - 2 && L[k + 1] < d) k++;
    const f = Math.min(1, Math.max(0, (d - L[k]) / Math.max(1e-6, L[k + 1] - L[k])));
    const a = list[k], b = list[k + 1];
    return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, dx: b[0] - a[0], dz: b[1] - a[1] };
  };
  return (t) => {
    const u = ((t % GIRL_TIME.loop) + GIRL_TIME.loop) % GIRL_TIME.loop;
    if (u < GIRL_TIME.inEnd) return { ...along(inPts, inL, (u / GIRL_TIME.inEnd) * inL[inL.length - 1]), visible: true, walking: true };
    if (u < outStart) return { x: GIRL[0], z: GIRL[1], dx: SELLER[0] - GIRL[0], dz: SELLER[1] - GIRL[1], visible: true, walking: false };
    if (u < GIRL_TIME.hidden) return { ...along(outPts, outL, (u - outStart) * outSpeed), visible: true, walking: true };
    return { x: pts[pts.length - 1][0], z: pts[pts.length - 1][1], dx: 1, dz: 0, visible: false, walking: false };
  };
}

export default {
  id: 'thu',
  seed: 20261020,
  // people/xehoa plays both roles: the flower seller and the girl who buys, and builds the moving bike with them
  people: { seller: 'xehoa', customer: 'xehoa' },
  roles: ['seller', 'customer'],
  label: 'A painted, living scene of Nguyễn Du street in Hanoi on an October night: sodium street lamps and lit windows, old yellow French villas with green shutters, milk-flower trees in bloom along Thiền Quang lake and their florets drifting down; a flower seller has stopped her bicycle, its tray piled with white daisies and yellow chrysanthemums, to sell a bunch to a girl; people sit on low plastic stools at a pavement tea stall, one with a bamboo water pipe; others walk home under the trees or ride past; a Chớm perfume bottle stands in the bicycle\'s front basket under the lamp',
  notes: {
    name: 'Thu', seasonWord: 'autumn', english: 'Autumn · milk flower after dark',
    opener: 'In October the milk flower opens, and the whole city takes a side.',
    top: 'Thị fruit', heart: 'Milk flower', base: 'Young green rice',
    memory: 'The trees open after dark. Half the street shuts its windows. The other half walks home the long way, slowly, on purpose.',
  },
  // section 5 of the contract: night, sodium orange lamps; night-blue air; milk-flower ivory first, wall yellow second
  palette: {
    air: '#2a3454', airSun: '#34405e', fog: '#2a3454', shade: '#4c5482', lit: '#ffc890', litK: 0.95,
    skyTop: '#26304e', skyLow: '#3a4466', hi: '#fff0d4', drip: '#2a2634',
    airNear: 10, airFar: 110, airMax: 0.78, clear: '#141a2e', wet: 0.25,
    accent: '#f2ead6', accent2: ['#e0b050'],
  },
  sun: NIGHT_SUN,   // no sun: the lamps are in light.js
  street: ST,
  camera: {
    fov: FOV, eye: EYE, yaw: YAW0, pitch: PITCH0,
    // past the lens branch, first to the left (at least 1.2 m from the seller's and the girl's faces), down the middle of the
    // road under the lamps (a little left and up past the tea stall), then up between the lamp arms and the wires, above the milk-flower crowns, turning to the lake.
    // The crowd keeps 2.2 m clear of this path everywhere (crowd-data.js). On a phone the eye starts 2 m further back up the
    // pavement and slips into the same line by the second point.
    path: [EYE, ...(NARROW ? [[0.55, 1.58, -0.4]] : []), [-0.32, 1.62, -2.3], [-0.1, 2.2, -6.5], [-0.45, 3.3, -12.0], [-0.4, 4.9, -19.5], [-0.05, 8.0, -27], [0.0, 10.4, -34], [0.2, 13.4, -41]],
    // on a phone the wider lens holds the whole sale, so the turn to the right is small; it comes back onto the computer's
    // line over the first third of the push, and from there both screens turn the same way to the lake
    yawAt: (p, narrow, { sm }) => (narrow ? YAW0 + (YAW_WIDE - YAW0) * sm(0.0, 0.35, p) : YAW_WIDE) - 19 * sm(0.0, 0.55, p) - 26 * sm(0.6, 1.0, p),
    pitchAt: (p, { sm }) => PITCH0 - (PITCH0 - 1.2) * sm(0.0, 0.35, p) - 2.4 * sm(0.1, 0.4, p) - 13 * sm(0.45, 1.0, p),
  },
  // the bottle: in the flower bike's front basket, sitting on a wrapped bunch, right under the lamp
  bottle: { at: BOTTLE_SEAT().toArray().map((v) => +v.toFixed(3)), scale: 1, ry: -0.2, label: 'T H U', labelFontText: 'THU', labelLight: NARROW ? { ...LABEL_LIGHT, k: 2.1 } : LABEL_LIGHT,
    // the seller's lamp hangs right over the glass: a hot spark on its shoulder, and the paper label catches the light
    // (on a phone the wider lens makes the glass smaller in the frame, so the spark and the painter's value plan
    // around it are a little stronger there: the eye still lands on the bottle first)
    // (21/9) glint.size is the spark's width in METRES, on a flacon 0.147 m tall and 0.098 m wide: 0.13 was a star as
    // big as the whole bottle, at strength 1.9-2.3. Measured on the phone frame: the glass with no star on it scores
    // 25.1 against 11.6 for its empty spot - own share 54%. With the star it reads 14%, because the star is a separate
    // mesh pinned to the bottle, not a child of it, so __chom.setBottle(false) leaves it burning in the bottle's own
    // box (35.7 of the 41.6). The star was hiding the glass from the check and burning it out for the eye.
    glint: { at: [-0.03, 0.15, 0.028], size: 0.045, strength: NARROW ? 1.2 : 1.0 },
    focus: [0.06, 0.06, 0, 0.45],
    // the close-up stands on the same side as the main camera but higher than both heads, looking down at about 34 degrees.
    // Its flight keeps out of the two areas the people work in (x 0.8-2.3, z -0.5..-3 and x 2.3-3.5, z -0.5..-1.6): it swings
    // along the house side, over the pavement, and comes in past the front wheel
    focusView: {
      offset: [-0.5, 1.0, 1.4], fov: 30,
      via: [[3.55, 2.3, 0.6], [4.05, 2.45, -0.9], [3.6, 2.35, -1.9]],
      phoneOffset: [-0.45, 1.25, 2.1], phoneFov: 40,
      phoneVia: [[3.6, 2.4, 0.7], [4.15, 2.55, -0.8], [3.7, 2.45, -1.7]],
    } },
  sway: [[0.0, 2.3, -1.9], [-3.2, 6.5, -6.2], [2.2, 1.2, -3.3], [1.36, 6, -13.4], [-3.0, 7, -20], [5.0, 5, -10]],
  fonts: [['800 92px "Be Vietnam Pro"', 'PHỐ NGUYỄN DU TRÀ ĐÁ']],
  // wires and painted glows thin out when the push brings the camera close
  nearFade: [0.9, 2.2],

  async build(scene, R, core) {
    const { THREE: T, V3, U } = core;
    const { knifeMaterial, sketchMaterial } = core.paint;
    const { Batch, hero, ribbons } = core.build;
    const cast = (typeof window !== 'undefined' && window.__chom && window.__chom.cast) || {};
    // a real folder plays the seller (people/xehoa): it brings its own bicycle and carries the lamp on the handlebars
    // (light 0). The core's placeholder figure brings neither, so then the season keeps its own parked bike and lamp.
    const sellerReal = !!cast.seller && cast.seller !== 'placeholder';
    // yield to the page between heavy steps and inside long loops (core.slice): this season is built in the background
    // while the viewer scrolls Xuân. With ?dev=1 every real yield records how long the work before it ran
    // (window.__chomThuSteps), so the longest unbroken stretch of this season's code can be checked
    const DEVQ = new URLSearchParams(location.search).get('dev') === '1';
    const steps = [], calls = [];
    let lastYield = performance.now(), lastCall = lastYield;
    const slice = async (label = 'loop') => {
      const t = performance.now();
      if (DEVQ) calls.push([label, +(t - lastCall).toFixed(1), Math.round(t)]);
      await core.slice();
      const t2 = performance.now();
      lastCall = t2;
      if (t2 - t > 0.5) { if (DEVQ) { steps.push([label, +(t - lastYield).toFixed(1)]); calls.push(['-- yield', +(t2 - t).toFixed(1), Math.round(t2)]); } lastYield = t2; }
    };
    // a whole frame's pause (the loading bar moves): it counts as a yield too
    const nextFrame = async (label) => {
      const t = performance.now();
      if (DEVQ) { calls.push([label, +(t - lastCall).toFixed(1)]); steps.push([label, +(t - lastYield).toFixed(1)]); }
      await core.nextFrame();
      lastYield = lastCall = performance.now();
      if (DEVQ) calls.push(['-- frame', +(lastCall - t).toFixed(1)]);
    };
    if (DEVQ) { window.__chomThuSteps = steps; window.__chomThuCalls = calls; }

    // ---- the sky: deep night blue, a low warm-violet city glow, slow cloud banks; no sun disc
    core.sky({ top: '#0a1024', mid: '#141c36', low: '#262e4c', glow: '#4a4460', cloud: '#1a2240', cloud2: '#2a3252', cloud3: '#10162c', sunA: '#141c38', sunB: '#121a34', lining: '#323c5c', sunDisc: 0 });

    // ---- layer 4: the far end of the street, the far shore across the lake (and its reflection)
    core.backdrop({ w: 260, h: 40, seed: 3.1, haze: 0.35, cBld: '#1c2238', cBld2: '#262c44', cWin: '#d89a58', cSky: '#28304c', cRoof: '#1a1e30', winDensity: 0.18, minH: 6, maxH: 16, cellW: 4.6 }, [10, 0, -135], 0);
    core.backdrop({ w: 420, h: 60, seed: 7.7, haze: 0.55, cBld: '#1a2034', cBld2: '#222840', cWin: '#c89060', cSky: '#28304c', cRoof: '#181c2c', winDensity: 0.1, minH: 9, maxH: 26, cellW: 8, strokes: 0.2 }, [0, 0, -190], 0);
    const shoreA = { w: 240, h: 40, seed: 5.3, haze: 0.4, cBld: '#182034', cBld2: '#20283e', cWin: '#e0a060', cSky: '#26304c', cRoof: '#161a2a', winDensity: 0.16, minH: 5, maxH: 18, cellW: 5.2 };
    core.backdrop(shoreA, [-72, 0, -50], Math.PI / 2);
    // the far shore upside down under the water: the lake lets it through near the glancing angle
    const mirror = core.backdrop({ ...shoreA, haze: 0.55 }, [-72, 2 * WATER_Y, -50], Math.PI / 2);
    mirror.scale.y = -1;
    core.backdrop({ w: 200, h: 40, seed: 9.9, haze: 0.4, cBld: '#241e2c', cBld2: '#302838', cWin: '#e0a060', cSky: '#28304c', cRoof: '#1c1824', winDensity: 0.14, minH: 8, maxH: 18, cellW: 5 }, [36, 0, -60], -Math.PI / 2);
    await slice('sky, far streets');

    // ---- layer 3: the house row (villas and tube houses), the lake edge, lamps and poles, all palette knife
    const mass = new Batch({ kind: 'knife' });
    const kb = new Batch({ kind: 'knife' });
    const fine = new Batch({ kind: 'knife', wind: true });
    const balconies = [];
    const glowsL = [];
    // the same turn core.houseRow uses: local x = world z, local +z = toward the street
    const row = async (x0, x1, o) => {
      const M = new T.Matrix4().makeRotationY(-Math.PI / 2).setPosition(ST.wallNear, 0, 0);
      for (const b of [kb, mass, fine]) b.pre = M;
      const local = [];
      // (each house yields after it is laid out; Batch.pre stays set across the yields: nothing else adds to these batches)
      const r = await villaRow(kb, mass, fine, R, { x0, x1, balconies: local, ...o, slice });
      for (const b of [kb, mass, fine]) b.pre = null;
      const along = new T.Vector3(1, 0, 0).transformDirection(M), outv = new T.Vector3(0, 0, 1).transformDirection(M);
      for (const b of local) balconies.push({ at: b.at.applyMatrix4(M), along, out: outv, w: b.w, y: b.y, name: `balcony@${b.at.x.toFixed(1)},${b.y.toFixed(1)},${b.at.z.toFixed(1)}` });
      for (const g of r.glows) glowsL.push(g.applyMatrix4(M));
      return r;
    };
    // near the bottle: the tea stall's shop, a villa at the right edge; behind the bottle: dark shutters and the lane
    await row(-12.5, 14, { plan: [['shut', 3.5], ['shut', 4.4], ['villaShut', 10.2], ['tube', 4.2]], haze: 0.06 });
    await row(-19.5, -12.5, { plan: [['shut', 4.7], ['lane', 2.3]], haze: 0.08 });
    await row(-34.4, -19.5, { plan: [['tube', 4.3], ['tube', 4.1], ['shop', 4.0]], haze: 0.12 });
    await row(-36.7, -34.4, { plan: [['lane', 2.3]], haze: 0.14 });
    await row(-118, -36.7, { haze: 0.16 });
    // the blocks behind the row (seen when the camera rises)
    for (let z = 8; z > -118; z -= 11) mass.box(11, 9 + R() * 6, 11, V3(23 + (R() - 0.5) * 2, 4.5, z), { col: '#8a7a68', col2: '#b0a088', scale: 0.35, drip: 0.4, seed: R(), haze: 0.32 });
    await slice('house rows');
    embankment(kb, fine, R);
    farTrees(kb, R);
    const heads = streetLamps(kb, LAMPS, R);
    const poleTops = powerPoles(kb, fine, POLE_Z, R);
    await slice('lake edge, lamps, poles');
    kb.cyl(0.035, 0.04, SIGN.y + 0.3, V3(SIGN.x, (SIGN.y + 0.3) / 2, SIGN.z), { col: '#2e3440', col2: '#6a7280', scale: 2, seed: R(), haze: 0.1 }, 8);
    kb.box(1.18, 0.46, 0.02, V3(SIGN.x, SIGN.y, SIGN.z + 0.055), { col: '#2a3038', col2: '#4a525c', scale: 2, seed: R(), haze: 0.1 });
    const massGeo = mass.merge();
    const houseMesh = new T.Mesh(massGeo, knifeMaterial());
    const shadowPrint = new T.Mesh(massGeo, knifeMaterial({ flat: true, flatCol: '#141a2c', shift: [0.0042, -0.0056, 0.015] }));
    const kMesh = new T.Mesh(kb.merge(), knifeMaterial());
    const fMesh = new T.Mesh(fine.merge(), knifeMaterial({ wind: true }));
    scene.add(houseMesh, shadowPrint, kMesh, fMesh);
    for (const m of [houseMesh, shadowPrint, kMesh, fMesh]) m.frustumCulled = false;
    // lamp arms, poles, railings: they dissolve if the push brings the lens right up to them
    core.nearFade(kMesh, [0.8, 1.8]);
    core.nearFade(fMesh, [0.8, 1.8]);
    // the wires: along the poles, drops into the houses, and the sagging runs to the lamp arms
    const wl = wireRuns(poleTops, R, ST.wallNear - 0.02);
    const wires = new T.Mesh(ribbons(wl), sketchMaterial({ color: '#0e1018', dry: 0 }));
    wires.frustumCulled = false;
    scene.add(wires);
    await slice('wires');
    // the street plate (Be Vietnam Pro): on its own post on the lake-side pavement, between two trees, facing the way the
    // camera travels, so it is always read whole (a wall in a lane would only ever show a cut piece of it)
    const plate = nameplate(U);
    plate.scale.setScalar(0.86);
    plate.position.set(SIGN.x, SIGN.y, SIGN.z + 0.075);
    scene.add(plate);
    core.progress(0.45);
    await nextFrame('street plate');

    // ---- the lake and the ground
    const lights = farLights(R);
    scene.add(lakeWater(U, lights));
    core.ground({
      size: [34, 160], at: [EDGE_X + 17, 0, -58],
      colors: { road: '#44464f', road2: '#55565f', walk: '#6e625c', walk2: '#82746a', curb: '#b8b0a4', skyRefl: '#28304c', gold: '#ffb468', facadeSun: '#c89458', facadeShade: '#1a2034' },
    });

    await slice('lake, ground');
    // ---- the light (light.js): street lamps, the tea bulb, a shop mouth. Light 0 (the lamp on the handlebars) belongs to
    // people/xehoa, which carries it with its bike; the season only sets it for the stand-in scene.
    setupLights(core, { bikeLamp: bikeLampWorld(), sellerCast: sellerReal });
    heads.forEach((h, i) => core.glow('#ffb060', i === 0 ? 1.1 : 0.9, 0.2 + i * 0.11, h.clone().add(V3(0, -0.05, 0))));
    // the lit shop mouths and the lane's bulb nearest the eye get a small painted glow
    glowsL.filter((g) => g.y > 2.5 && g.y < 2.7 && g.z > -40).forEach((g, i) => core.glow('#f0a860', 0.45, 0.6 + i * 0.1, g));

    // ---- the flower bike (main thing) and the bottle in its basket; the parked bike steps aside when a folder plays the seller
    await slice('lights');
    // the season's own parked bike is only built when no folder plays the seller (people/xehoa brings its own, in the same
    // place, with the same lamp); the bottle and light 0 sit at the same marks either way
    const bikeCast = sellerReal;
    const bike = bikeCast ? null : await flowerBike(scene, R, slice);
    // a small halo on the seller's bulb (kept close to the bulb's size; people/xehoa adds its own with its bike)
    if (!bikeCast) core.glow('#ffd49a', 0.2, 0.83, bikeLampWorld().add(V3(0, -0.01, 0)), { strength: 1.2 });
    // the core's bottle is one piece of work of about 9 ms: it starts on a fresh frame, not at the end of a slice
    await nextFrame('flower bike');
    await core.bottle();
    await slice('bottle');
    // the tea stall and its people
    const tea = teaStall(scene, R);
    core.glow('#ffc070', 0.22, 0.44, tea.bulb);
    const tc = teaCrowd(TEA);
    const pipeSmoke = tc.filter((e) => e.kind === 'sitPipe').map((e) => core.crowdAnchor(e, 'smoke')).filter(Boolean);
    core.fx.ribbonSmoke({ sources: pipeSmoke.map((p) => ({ at: [p.x, p.y, p.z], length: 1.3, width: [0.015, 0.2], rise: [0, 1, 0], drift: [0.3, 0.06], curl: 0.14, speed: 0.22, color: '#dcd6ce', opacity: 0.45, sway: 3 })), twelve: true });

    await slice('tea stall');
    // ---- the main figures' marks (stand-ins until people/<name> exists)
    const W = (lx, ly, lz) => bikeToWorld(lx, ly, lz);
    const layout = {
      seller: { at: V3(SELLER[0], 0, SELLER[1]), face: V3(GIRL[0], 0, GIRL[1]) },
      customer: { at: V3(GIRL[0], 0, GIRL[1]), face: V3(SELLER[0], 0, SELLER[1]) },
      exchange: V3(...EXCH),
      exchangeMoney: V3(...EXCH_MONEY),
      // the flower bike where it stops: position, heading (+x local = front), and the parts people touch (world)
      bikeStop: {
        at: V3(...BIKE.at), front: V3(...BIKE.front), yaw: bikeYawAngle(), length: 1.9,
        saddle: W(-0.26, 0.98, 0), bars: [W(0.3, 1.1, -0.3), W(0.3, 1.1, 0.3)], tray: W(-0.6, 0.83, 0), trayRadius: 0.46,
        basket: W(0.7, 0.93, 0), basketX: [3.12, 3.48], lamp: bikeLampWorld(), lampLight: 0,
        wheels: [W(-0.56, 0.33, 0), W(0.56, 0.33, 0)], wheelRadius: 0.33,
      },
      bottle: V3(...BOTTLE_SEAT().toArray()),
      bike: bike ? bike.group : null,   // the season's parked bike (only there when no folder plays the seller)
      girlPath: GIRL_PATH.map((p) => ({ ...p, at: V3(p.at[0], 0, p.at[1]) })),
      girlTime: GIRL_TIME,
      // the girl's way in, kept clear 0.5 m each side: nothing stands or walks there
      girlLaneWidth: 0.5,
      teaStall: { at: V3(TEA.at[0], 0, TEA.at[1]), emptyStool: V3(TEA.stools[3][0], 0, TEA.stools[3][1]) },
      // the lane: open from z -14.8 to -12.5 at the house fronts; its walls are 0.2 thick, so the way in is z -14.6 .. -12.7
      lane: { z: LANE_Z, mouth: V3(ST.wallNear, 0, LANE_Z), interiorZ: [-14.6, -12.7], depth: 9 },
      keepClearOfCamera: 1.0,
      holds: { seller: 'a bunch of white field daisies in newsprint, from the rear tray; then the note', customer: 'a small shoulder bag; the bunch in both hands; a folded note' },
      loop: 36,
    };
    // TẠM (chờ nhân vật chính): simple standing figures at the marks, for the roles no folder plays yet
    const standIns = [];
    if (!cast.seller) standIns.push({ name: 'seller (stand-in)', mesh: standIn(scene, { who: 'seller', at: layout.seller.at, face: layout.seller.face, top: '#3e5a52', legs: '#22222a' }), at: layout.seller.at, r: 0.28 });
    if (!cast.customer) standIns.push({ name: 'girl (stand-in)', mesh: standIn(scene, { who: 'girl', at: layout.customer.at, face: layout.customer.face, top: '#8e9cae', legs: '#2a2c36' }), at: layout.customer.at, r: 0.25 });
    for (const s of standIns) core.addCasters(s.mesh);
    const girlAt = girlTrack();
    const girlStand = standIns.find((s) => s.name.startsWith('girl'));
    await slice('stand-ins');
    if (cast.seller || cast.customer) await core.loadPeople(layout);
    if (bike) core.addLampCasters(bike.group);
    core.addLampCasters(tea.mesh);

    // ---- balcony life, then the crowd (one draw call for all of them)
    await slice('before balconies');
    const life = core.balconyLife(balconies, {
      seed: 23, zRange: [-2, -48], share: 0.6, haze: 0.12, people: balconyPeople(),
      view: (b) => (1 - Math.abs(b.at.z + 14) / 14) * (b.y < 5 ? 1 : 0.8),
      things: ['litWindow', 'laundry', 'pots', 'litWindow', 'cage', 'stool', 'bucket', 'bicycle'],
      colors: { cloth: ['#d8d0c0', '#4a5a78', '#6a4a40', '#8a3a36', '#c8b070', '#4a5a4a'], pot: ['#6a4a3c', '#7a5a44', '#50505a'], plant: ['#2a4a34', '#34543a'], bloom: ['#e8e2cc', '#d8b050'], plastic: ['#8a3230', '#2e5078', '#2e6a52'], window: ['#ffcf8a', '#f4c07a', '#ffd9a0'], curtain: ['#a86a48', '#b88a5a', '#9a5a4a', '#c8a070'] },
    });
    await slice('balconies');
    core.crowd([...crowdList(), ...tc, ...life.people], { fadeZ: [-122, -112] });
    core.progress(0.6);
    await nextFrame('crowd');

    // ---- the milk-flower trees: along the lake, and a few on the house side far down the street
    const fwd = V3(Math.sin(YAW_WIDE * Math.PI / 180), 0, -Math.cos(YAW_WIDE * Math.PI / 180));
    const cards = new Cards(fwd);
    const trunks = new Batch({ wind: true });
    const trees = [];
    for (let i = 0; i < TREE_Z.length; i++) {
      // (the options are drawn before the tree, as before: the random stream keeps its order)
      const o = { tree: i < 2 ? 1 : 4, scale: 1 + (R() - 0.5) * 0.12, reach: 0.78, lean: 0.25 + R() * 0.3, haze: i > 6 ? 0.1 : 0 };
      trees.push(milkTree(trunks, cards, TREE_X, TREE_Z[i], R, o));
      await slice('lake tree');
    }
    for (const z of [-54, -71, -88, -105]) {
      trees.push(milkTree(trunks, cards, 1.62, z, R, { tree: 4, scale: 0.95, reach: 0.7, lean: -0.3, haze: 0.08 }));
      await slice('house-side tree');
    }
    const trunkMesh = hero(trunks.merge(), { wind: true, rims: false, tier: 0.06 });
    scene.add(trunkMesh);
    const crowns = cards.mesh();
    scene.add(crowns);
    await slice('crowns');
    // the trunks and the crowns (their cut-out strokes) throw the lamps' light onto the road
    core.addLampCasters(trunkMesh);
    core.addLampCasters(crowns);
    core.nearFade(crowns, [1.2, 3.2]);
    core.nearFade(trunkMesh, [0.8, 1.8]);
    core.stats.crownStrokes = cards.count;

    // ---- layer 0: a milk-flower branch reaching into the frame at the top left, right at the lens
    const l0 = new Batch({ wind: true });
    const lsw = (x) => 0.25 + Math.max(0, x + 1.3) * 0.3;
    await slice('before lens branch');
    await milkBranch(l0, V3(-1.1, 2.4, -2.3), V3(1, -0.22, 0.12), 1.75, R, { sway: lsw, tree: 0, slice });
    await milkBranch(l0, V3(-0.9, 2.75, -2.6), V3(1, -0.1, -0.1), 1.25, R, { sway: lsw, tree: 0, slice });
    const layer0 = hero(l0.merge(), { wind: true, rims: false, tier: 0.02 });
    scene.add(layer0);
    core.addLampCasters(layer0);
    core.nearFade(layer0, [0.7, 1.6]);

    await slice('lens branch');
    // ---- milk-flower florets drifting down, very slowly (the core's petals, in ivory)
    core.fx.petals({ n: 150, spots: [
      [0.0, 2.7, -2.0, 1.1, 0.014], [-2.2, 6.5, -6.2, 2.4, 0.022], [-2.4, 6.5, -14.6, 2.4, 0.022], [-2.6, 6.5, -23, 2.4, 0.024],
      [0.9, 3.4, -3.6, 1.0, 0.016], [-1.2, 5.5, -9.0, 2.0, 0.02],
    ], colors: ['#c8c4ae', '#fffbee'], size: 0.02 });

    // ---- painted light spilling from the lit shop fronts that have no light of their own
    const pools = [
      ...glowsL.filter((g) => g.y < 2 && g.z < -14 && g.z > -60).map((g) => ({ at: [ST.wallNear - 0.6, g.z], r: [0.9, 1.4], k: 0.3, color: '#f0b070' })),
    ];
    for (const m of poolDecals(core, pools)) scene.add(m);
    await slice('petals, pools');

    // the still things the clipping check keeps everyone out of
    const solids = [...(bike ? bike.solids : []), ...tea.solids];
    for (const l of LAMPS) solids.push({ x: l.post[0], z: l.post[1], r: 0.2, h: 7.5, name: `lamp post z${l.post[1]}` });
    for (const z of POLE_Z) solids.push({ x: 1.36, z, r: 0.2, h: 9.4, name: `power pole z${z}` });
    solids.push({ x: SIGN.x, z: SIGN.z, r: 0.1, h: 2.8, name: 'street-name post' });
    for (const t of trees) solids.push({ x: t.x, z: t.z, r: t.r, h: t.H, name: `milk tree z${t.z.toFixed(1)}` });
    // the seller's stand-in stands still at her mark; the girl's walks (a mover); real people give their own
    for (const s of standIns) if (s !== girlStand) solids.push({ x: s.at.x, z: s.at.z, r: s.r, h: 1.7, name: s.name });

    if (DEVQ) steps.push(['end of build', +(performance.now() - lastYield).toFixed(1)]);
    return {
      layers: { foreground: [layer0, ...(bike ? [bike.group] : []), ...standIns.map((s) => s.mesh)], middle: [tea.mesh, trunkMesh, crowns], background: [houseMesh, kMesh, fMesh] },
      solids,
      peopleLayout: layout,
      movers: (t) => {
        if (!girlStand) return [];
        const g = girlAt(t);
        return g.visible ? [{ x: g.x, z: g.z, r: girlStand.r, h: 1.7, name: 'girl (stand-in)' }] : [];
      },
      update(t) {
        if (girlStand) {
          // on twos, like every figure here; a small lift of each step while she walks
          const tq = Math.floor(t * 12) / 12;
          const g = girlAt(tq);
          const m = girlStand.mesh;
          m.visible = g.visible;
          m.position.set(g.x, g.walking ? 0.02 * Math.abs(Math.sin(tq * Math.PI * 2 / 1.05)) : 0, g.z);
          m.rotation.y = Math.atan2(g.dx, g.dz);
        }
        // the bike's flowers shiver in the night breeze a touch more than the rest
        U.uSway.value[2].x += 0.004 * Math.sin(t * 1.3);
      },
    };
  },
};
