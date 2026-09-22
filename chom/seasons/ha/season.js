// Chớm world, season Hạ: West Lake beside Thanh Niên road, a hot humid dusk. The sun sits low over the lake, the water is gold.
// On the bank a woman sits at a low table scenting tea with lotus: she opens a flower, tucks green tea into its heart, folds the
// petals and ties them with a strip of lạt. The Chớm bottle stands on her tray of lotus tea, beside her small kerosene lamp.
// Out on the pond a small boat is poled along a channel; the picker bends over the side for flowers. Dragonflies. Along the road:
// old trees, iron lamps just lit, bicycles with lotus in their baskets, schoolgirls in white áo dài, people stopping at the
// parapet to watch the sun go down; far across the water the Trấn Quốc pagoda stands against the sunset.
// The contract: docs/superpowers/specs/2026-09-17-chom-world-contract.md (sections 4-6). The core: core/README.md.
//
// HOUSE RULE for this season: anything this season builds that somebody else has to measure — the boat's hull, the leaves
// the picker reaches past, the table, the tray, the lamp — is PUBLISHED in peopleLayout (and exported from the file that
// builds it). Nobody should have to copy our shapes by eye: a hand-copied hull that was 4 cm out once produced 18,801
// phantom clipping hits. Read the numbers, never guess them (core/README.md 13, rule 1).
//
// HOW TO MAKE THE BOTTLE THE FIRST PLACE THE EYE GOES (measured here on 18/9, all three tries on the record):
//   Darken the SURFACE IT STANDS ON. Nothing else worked. This tray was pale cream bamboo and the bottle is pale glass, so
//   there was nothing for it to stand out against; an old mẹt darkened by years of scenting tea (which is also what a real
//   one looks like) took the bottle from 37.5 to 40.7 and from rank 4 to rank 2, without touching one light in the frame.
//   The two things that do NOT work, both measured: brightening the bottle itself burns the glass white and the score
//   FALLS (38.2 -> 37.6, and it stops reading as glass); darkening whatever is beating it makes that thing score HIGHER
//   (a lantern 48.8 -> 52.9, a crate 38.8 -> 40.2), because the check reads difference from the surroundings, not brightness.
//
// AND ONE WARNING ABOUT MEASURING THE BOTTLE'S SEAT (18/9): do not check it by firing a ring of rays down round the foot
// and taking the highest thing they hit. At its real 100 ml size the bottle's foot is only 36 mm across, so rays at that
// radius hit the kerosene lamp and the tea bowl standing beside it on the tray, and the check then reports a 97 mm sink
// that is not there. Use qa.mjs item 26, which measures against the glass itself and names what the bottle stands on.
import { WATER_Y, shoreProfile, shoreMesh, lakeMesh, pagoda, islandTrees } from './water.js';
import { farRow, rowForLake } from './farrow.js';
import { lotusPlant, lotusFlower, lotusBud, scatterPond, leafPoint, LC } from './lotus.js';
import { BANK_X, TRAY, embankment, roadTree, lampPost, teaCorner, parkedBicycle, ganh, fallenLeaves } from './bank.js';
import { BOAT, PICK, PICK_BLOOM, HULL, hullHalf, hullSheer, hullBottom, boatAt, buildBoat } from './boat.js';
import { buildTeaMaker, buildPicker } from './figures.js';
import { buildDragonflies } from './dragonflies.js';
import { cloudBand } from './clouds.js';
import { foliageCards } from './foliage.js';
import { crowdList, SITTERS } from './crowd-data.js';

// wallFar / wallNear only bound the sun's shadow map here (there are no house fronts): it must cover the boat's channel
const ST = { kerbFar: 3.4, kerbNear: 10.2, wallFar: -16.5, wallNear: 15.0 };
// x of the things along the road: lake-side trees and lamps (near the kerb), far-side trees and lamps, the far railing
const XS = { tree: 2.85, lamp: 3.0, farTree: 10.55, farLamp: 10.6, railing: 14.2 };
const BICYCLE = { at: [2.2, -6.05], ry: 1.62 };
// her gánh (carrying pole and two baskets), set down on the pavement behind her
const GANH = { at: [1.9, 0, -4.9], a: 0.5 };
// the main camera (17/9, evening): close to the tea corner, at her left side and a little behind her, a longer lens,
// so her hands and the flower read clearly (~110 px across at 1440x900) and the bottle is big, with the lake, the boat,
// the sun and the pagoda still behind them
// A tall phone screen gets its own framing, chosen once at load (the core fixes the eye and the lens, and only turns the
// view for narrow screens): further back, a wider lens, so her hat, shoulders and both hands fit with the bottle at about a
// third from the left (the boat may fall outside)
const NARROW = typeof window !== 'undefined' && window.innerWidth / window.innerHeight < 0.95;
const EYE = NARROW ? [2.401, 1.65, -0.361] : [2.154, 1.55, -0.852];
const YAW = -25;
// (18/9) The tall phone frame gets its own turn. At -25 the bottle sat hard against the left edge of a 24-degree-wide
// frame while the tea maker filled the middle; turned a little further toward the water the bottle comes in off the edge
// and she moves out toward the right. She is still the main thing in the frame, she just stops standing in front of it.
const YAW_N = -29.5;
const FOV = NARROW ? 45 : 36;
const PITCH = NARROW ? -11 : -12;
// the tea corner: the table (ground point, turn), the tea maker's stool, the lantern, the basket of lotus.
// She sits at (1.5, -3.0) facing the lake, turned 22° away from a pure profile (we see her left side and some of her back,
// from above, so the hat hides her face); the table stands between her and the water
const TABLE = { at: [0.725, -3.26], ry: -1.5184 };
// table-local -> world (x, z)
const rotY = (x, z, a) => [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];
const tw = ([x, z]) => { const [a, b] = rotY(x, z, TABLE.ry); return [TABLE.at[0] + a, TABLE.at[1] + b]; };
// the tea maker's low stool: behind the table's far edge (z -0.29) by 0.47 m, a little to her side of the tray, facing straight in
const SEAT_L = [0.3, -0.76];
const TEA_MAKER = { at: tw(SEAT_L), face: tw([SEAT_L[0], SEAT_L[1] + 1]) };
// the basket of fresh lotus beside her left knee, on a small stool (rim 0.47 m); table-local (0.76, -0.58), world
// (1.344, -2.531), r 0.18, as the people agent asked (at the old spot it touched her left knee)
const BASKET = tw([0.76, -0.58]), BASKET_R = 0.18;
// (the evening light for her work is a small kerosene lamp standing on the tray just behind the bottle: bank.js TRAY.lamp.
// The bottle's glass reads against its glow)
// the bottle on the tray (bank.js TRAY)
const TRAY_TOP = 0.352;
const BOTTLE_AT = (() => { const [x, z] = tw(TRAY.bottle); return [x, TRAY_TOP, z]; })();
// the sun: low over the lake, a little left of the pagoda (azimuth from -z toward +x, elevation), in degrees
// (1.6°: the disc sits right on the far shore, its foot cut by the trees)
const SUN_AZ = -27, SUN_EL = 1.6;
const D2R = Math.PI / 180;
const SUN_DIR = [Math.sin(SUN_AZ * D2R) * Math.cos(SUN_EL * D2R), Math.sin(SUN_EL * D2R), -Math.cos(SUN_AZ * D2R) * Math.cos(SUN_EL * D2R)];
const PAGODA_AZ = -21.5, PAGODA_R = 235;
// the road's old trees and iron lamps (z), both pavements
const TREE_Z = [-7.2, -18.2, -29.8, -41.4, -53, -64.6, -76.2, -87.8, -99.4, -111];
const LAMP_Z = [-12.4, -35.6, -58.8, -82, -105.2];
const FAR_TREE_Z = [-2, -13.6, -25.2, -36.8, -48.4, -60, -71.6, -83.2, -94.8];

export default {
  id: 'ha',
  seed: 20260618,
  // who plays the main roles (folders in people/). TẠM: chờ people/haisen for the picker; a role nobody plays gets the
  // stand-in from figures.js (test with ?people=picker:<folder>)
  people: { teaMaker: 'uongtra', picker: 'haisen' },
  // the roles this season needs, for the core and the people agent (see peopleLayout below)
  roles: ['teaMaker', 'picker'],
  label: 'A painted, living scene of West Lake in Hanoi at a hot summer dusk, seen from the bank of Thanh Niên road: the low sun lays a path of gold across the water; on the bank a woman in a conical hat sits at a low table, opening lotus flowers, tucking green tea inside and tying the petals shut; a Chớm perfume bottle stands on her tray of lotus tea; out on the lotus pond a woman poles a small boat and bends to pick flowers; dragonflies hover over the leaves; along the road people cycle home with lotus in their baskets and stop at the parapet to watch the sunset, and far across the lake the old pagoda stands dark against the sky',
  notes: {
    name: 'Hạ', seasonWord: 'summer', english: 'Summer · lotus and green tea',
    opener: 'Summer belongs to West Lake, where the lotus opens before the heat does.',
    top: 'Lotus leaf', heart: 'West Lake lotus', base: 'Green tea',
    memory: 'At dusk, green tea is tucked into an open lotus and the petals tied shut. At dawn the boats return, and the tea smells of the flower.',
  },
  // section 5: a hot humid dusk, the lake gold; pale lilac-pink air; lotus pink first, lotus-leaf green second
  palette: {
    air: '#d2b8cc', airSun: '#f4bc90', fog: '#d8c0d0', shade: '#76689a', lit: '#ffc896', litK: 1.02,
    skyTop: '#7a74aa', skyLow: '#eca888', hi: '#fff0dc', drip: '#6a4a60', moss: '#5a6a4a', peel: '#e0ccc8',
    airNear: 16, airFar: 160, airMax: 0.72, clear: '#d8c0d0',
    accent: '#e27a9a', accent2: ['#4f8a5a'],
  },
  sun: { dir: SUN_DIR, color: '#ffc48a', intensity: 1.15 },
  street: ST,
  shadowZ: [-70, 6],
  camera: {
    fov: FOV, eye: EYE, yaw: NARROW ? YAW_N : YAW, pitch: PITCH,
    // up over her shoulder and the tea table (clear of her hat and the lamp), out above the pond past the boat's
    // channel, then up over the lake toward the pagoda and the sun
    path: [EYE, NARROW ? [2.0, 2.0, -1.5] : [1.75, 1.85, -1.95], [1.05, 2.3, -3.6], [-0.4, 2.75, -7.5], [-1.9, 3.35, -13], [-2.8, 4.8, -21], [-3.2, 7.0, -32], [-2.8, 9.8, -44]],
    yawAt: (p, narrow, { sm }) => (narrow ? YAW_N : YAW) - 3 * sm(0.1, 0.8, p),
    pitchAt: (p, { sm }) => PITCH + (NARROW ? 8 : 6) * sm(0.05, 0.35, p) - 7 * sm(0.4, 1.0, p),
    // at the end of the push the camera hangs ~10 m above the lake: nothing is nearer than that, so the peel into the next
    // season should not sweep the last few metres too early
    handover: { far: 2000, near: 8 },
  },
  // the label is lit by the sunset (warm, a touch softer than the sun, so the paper and the letters stay readable)
  // (21/9) glint.size is the spark's width IN METRES on a flacon 0.147 m tall: at 0.12 it was not a spark on the
  // shoulder, it was a star as wide as the glass, and on the phone frame it covered the bottle. Two things measured:
  // the spark is a separate mesh pinned to the bottle, not a child of it, so __chom.setBottle(false) leaves it burning
  // in the bottle's own box - on the phone the empty box scored 32.2 with the glass taken out, against 17.1 with the
  // spark taken out too. And on the phone the glass with no star on it scores 39.1 against the empty 17.1: own share
  // 56%. The star was hiding the bottle from the check AND from the eye. Cut to a real spark.
  bottle: { at: BOTTLE_AT, scale: 1, ry: 0.72, label: 'H Ạ', labelFontText: 'HẠ', glow: 1.35, glint: { at: [-0.03, 0.135, 0.032], size: 0.045, strength: 0.9 }, focus: [0.08, 0.08, 0, 0.5], labelLight: { color: '#ffe0bc', k: 2.1 } },
  // the lantern's glow and any loose line fade out when the push brings the camera right past them
  nearFade: [0.6, 1.4],
  // the cursor breeze: 0 = the lotus at the lens, 1 = the tea tray and basket, 2 = the pond, 3 = the near trees, 4 = the boat's load, 5 = far
  sway: [[-0.2, 0.7, -2.4], [0.7, 0.5, -3.16], [-4, 0.2, -8], [4.2, 7, -8], [-6, 0, -10], [-6, 0.4, -24]],
  fonts: [],

  async build(scene, R, core) {
    const { THREE, V3, U } = core;
    const { knifeMaterial } = core.paint;
    const { Batch, hero, heroOf, TIER2 } = core.build;
    const eye = V3(...EYE);
    // yield to the page between heavy steps and inside long loops (core.slice). With ?dev=1 every real yield records how long
    // the work before it ran (window.__chomHaSteps), so the longest unbroken stretch of this season's code can be checked
    const DEVQ = new URLSearchParams(location.search).get('dev') === '1';
    const steps = [];
    let lastYield = performance.now(), lastCall = lastYield;
    const calls = [];
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
    if (DEVQ) { window.__chomHaSteps = steps; window.__chomHaCalls = calls; }

    // ---- layer 4: the dusk sky, the far shore of the lake, the pagoda on its island, the far end of the road
    core.sky({ top: '#6a66a0', mid: '#b48cb4', low: '#eea88c', glow: '#f8c08c', cloud: '#8e7cac', cloud2: '#e0a0a8', cloud3: '#766aa2', sunA: '#fcc48a', sunB: '#d890ac', lining: '#ffd8a8', sunDisc: 0.6 });
    scene.add(cloudBand({ eye }));
    const prof = shoreProfile({ eye, radius: 430, azFrom: -125, azTo: 10 });
    scene.add(shoreMesh(prof, { col: '#8a7494', col2: '#b098ac', haze: 0.6 }));
    const far = new Batch({ kind: 'knife' });
    const pAt = V3(eye.x + Math.sin(PAGODA_AZ * D2R) * PAGODA_R, WATER_Y, eye.z - Math.cos(PAGODA_AZ * D2R) * PAGODA_R);
    // the island: a low bank of stone and earth under the trees
    far.box(46, 1.1, 20, V3(pAt.x + 4, WATER_Y + 0.3, pAt.z + 2), { col: '#6a5a66', col2: '#9a8490', scale: 0.4, seed: R(), haze: 0.5 });
    const pTop = pagoda(far, R, { at: V3(pAt.x, WATER_Y + 0.8, pAt.z), scale: 1.05, haze: 0.5 });
    islandTrees(far, R, { at: V3(pAt.x, WATER_Y + 0.8, pAt.z), n: 16, spread: 17, haze: 0.52 });
    // Published, read-only, for seasons/ha/keepout.mjs: the pagoda and its island are merged into the far shore and
    // cannot be switched off on their own, so the measurement projects THESE numbers - the ones it was built from, right
    // here - instead of copying them. Tower: pagoda() tiers are at most 3.2 m wide (×1.05). Island: the 46 x 20 m bank
    // at (+4, +2) and the trees round it (spread 17 across, ×0.6 deep, up to 12 m, crowns 2.5 m more).
    scene.userData.pagoda = {
      tower: { x: pAt.x, z: pAt.z, half: 1.7, y0: WATER_Y + 0.8, y1: pTop },
      island: { x0: Math.min(pAt.x + 4 - 23, pAt.x - 17 - 2.5), x1: Math.max(pAt.x + 4 + 23, pAt.x + 17 + 2.5), z0: Math.min(pAt.z + 2 - 10, pAt.z - 10.2 - 2.5), z1: Math.max(pAt.z + 2 + 10, pAt.z + 10.2 + 2.5), y0: WATER_Y, y1: WATER_Y + 0.8 + 12 + 2.5 },
    };
    // Trúc Bạch's far side and the end of the road: hazed rows of houses. The season's own row (farrow.js), not
    // core.backdrop: the core's ended in a straight hard line on the water and read as a pale sticker (21/9 late)
    const FAR_ROWS = [
      { o: { w: 420, h: 50, seed: 4.4, haze: 0.5, cBld: '#b89aac', cBld2: '#d8bcc0', cWin: '#f4c890', cSky: '#e8ccd0', cRoof: '#a0808a', minH: 6, maxH: 18, cellW: 6, winDensity: 0.16, mist: 4.0 }, at: [70, 0, -120], ry: -Math.PI / 2 },
      { o: { w: 160, h: 50, seed: 8.1, haze: 0.55, cBld: '#b49aae', cBld2: '#d4bcc4', cWin: '#f4c890', cSky: '#ecd0d0', cRoof: '#9a808a', minH: 8, maxH: 22, cellW: 7, winDensity: 0.14, mist: 5.0 }, at: [40, 0, -250], ry: 0 },
    ];
    for (const r of FAR_ROWS) { const m = farRow(r.o); m.position.set(...r.at); m.rotation.y = r.ry; scene.add(m); }
    // the lake, out to the far shore: it mirrors the shore and the pagoda from the same profile
    const pagodaEl = Math.atan2(pTop - WATER_Y, PAGODA_R);
    const lake = lakeMesh({
      prof, pond: [-14.5, BANK_X, -64, 3], bankX: BANK_X, farRows: FAR_ROWS.map((r) => rowForLake(r.o, r.at, r.ry)),
      extra: [{ az: PAGODA_AZ, w: 0.9, el: pagodaEl, taper: 0.6 }, { az: PAGODA_AZ + 1.2, w: 5.5, el: Math.atan2(12, PAGODA_R), taper: 0.8 }],
    });
    scene.add(lake.mesh);
    core.progress(0.4);
    await nextFrame('sky, shore, lake');

    // ---- layer 3: Thanh Niên: the embankment, the road, trees and lamps, the far pavement
    core.sunRoofs([]);     // no houses between the sun and anything: it reaches everywhere
    core.ground({
      colors: { road: '#564e6a', road2: '#6e6484', walk: '#8a7074', walk2: '#a68886', curb: '#cab6b2', skyRefl: '#c09cb2', gold: '#ffb878', facadeSun: '#e8b494', facadeShade: '#c89cae' },
      size: [96.2, 330], at: [BANK_X + 48.1, 0, -150],
    });
    const kb = new Batch({ kind: 'knife' });
    await slice('far shore, lake, road');
    embankment(kb, R, { zNear: 12, zFar: -250, parapetFrom: -7.6 });
    fallenLeaves(kb, R, { n: 110, trees: TREE_Z.slice(0, 4).map((z) => [XS.tree, z]), box: [0.35, 3.3, -24, -0.5] });
    const lamps = [];
    for (const z of LAMP_Z) lamps.push(lampPost(kb, R, V3(XS.lamp, 0, z), { arm: 1, haze: 0.04 }));
    for (const z of LAMP_Z) lamps.push(lampPost(kb, R, V3(XS.farLamp, 0, z - 11), { arm: -1, haze: 0.08 }));
    // the far pavement's railing over Trúc Bạch
    for (let z = 10; z > -200; z -= 2.5) {
      kb.box(0.06, 0.9, 0.06, V3(XS.railing, 0.45, z), { col: '#2a3430', col2: '#5a6a64', scale: 2, seed: R(), haze: 0.12 });
      kb.box(0.05, 0.05, 2.5, V3(XS.railing, 0.88, z - 1.25), { col: '#2a3430', col2: '#5a6a64', scale: 2, seed: R(), haze: 0.12 });
    }
    // trees: the near trunks are painted in detail (secondary tier), the far ones with the knife; every crown is a heap of
    // flat brushed leaf clusters (foliage.js)
    const trunkN = new Batch();
    const trunkF = new Batch({ kind: 'knife', wind: true });
    const treeSolids = [];
    const clumps = [];
    for (const [i, z] of TREE_Z.entries()) {
      await slice('road tree');
      const near = i < 2;
      const h = 11 + R() * 3;
      roadTree(near ? trunkN : trunkF, null, R, V3(XS.tree, 0, z), { h, spread: 4 + R(), tree: 3, lean: [(R() - 0.5) * 1.0, (R() - 0.5) * 0.6], knife: !near, haze: 0.05 + i * 0.01, clumps });
      treeSolids.push({ x: XS.tree, z, r: 0.5, h, name: `tree z${z}` });
    }
    for (const [i, z] of FAR_TREE_Z.entries()) {
      await slice('far tree');
      const h = 10 + R() * 4;
      roadTree(trunkF, null, R, V3(XS.farTree, 0, z), { h, spread: 4 + R(), tree: 5, lean: [(R() - 0.4) * 1.2, (R() - 0.5) * 0.6], knife: true, haze: 0.1 + i * 0.01, clumps });
      treeSolids.push({ x: XS.farTree, z, r: 0.5, h, name: `far tree z${z}` });
    }
    const trunkMesh = hero(trunkN.merge(), { rims: false, tier: TIER2 });
    await slice('trees');
    const crownMesh = foliageCards(clumps, R, { cardsPer: 3 });
    await slice('foliage');
    scene.add(trunkMesh, crownMesh);
    const kMesh = new THREE.Mesh(kb.merge(), knifeMaterial());
    const fTrunk = new THREE.Mesh(trunkF.merge(), knifeMaterial({ wind: true }));
    const farMesh = new THREE.Mesh(far.merge(), knifeMaterial());
    for (const m of [kMesh, fTrunk, farMesh]) { m.frustumCulled = false; scene.add(m); }
    // the lamps, just lit: warm glows along the road; the nearest two light the wet ground
    lamps.forEach((p, i) => core.glow('#ffb860', i < 5 ? 0.5 : 0.42, 0.2 + i * 0.13, p));
    core.light(1, lamps[0], 6, '#ffb870', 0.55);
    core.light(2, lamps[5], 6, '#ffb870', 0.45);
    core.light(3, lamps[1], 6, '#ffb870', 0.5);
    await slice('road meshes, lamps');
    core.progress(0.55);
    await nextFrame('road, trees, lamps');

    // ---- layer 2: the lotus pond and the boat
    const channel = [];
    // (wider where the boat stops, in full view of the main camera, so the hull reads above the leaves)
    for (let x = -19; x <= BOAT.xStop + BOAT.len / 2 + 0.3; x += 0.5) channel.push([x, BOAT.z, x > -9 ? 1.15 : 0.82]);
    // (clear water where the near lotus stand, at the steps, and under the lantern's side of the bank)
    const keepNear = [[-0.75, -2.65, 1.15], [-0.9, -5.9, 1.0], [-0.5, -3.9, 0.5]];
    const pickKeep = PICK.map(([x, z]) => [x, z, 0.35]);
    const pond = new Batch({ wind: true });
    const pondSolids = [];
    const nearChannel = (x, z) => Math.abs(z - BOAT.z) < 1.6 && x < BOAT.xStop + 2.4;
    await slice('before pond');
    await scatterPond(pond, R, { xMin: -14.5, xMax: -0.45, zFar: -30, zNear: 3, n: 1700, keep: [...channel, ...keepNear, ...pickKeep], tree: 2, flowers: 0.1, buds: 0.08, solids: pondSolids, near: nearChannel, slice });
    // the plants the picker reaches for (tall, just past the far side of the boat): a tall leaf, and under it a bud lying low
    // on the water (at most 0.08 m up, x = PICK.x, z = PICK.z + 0.26, its tip ~0.1 m from the hull at the stop, within her reach).
    // Each bud is its own mesh, so the picker's people module can show it while the hull hides it and hide it when she
    // breaks it off; with no people module it simply stays
    const pickBlooms = [], pickBloomAt = [], pickLeaves = [];
    PICK.forEach(([x, z], i) => {
      // (pickLeaves keeps what the builder actually used — radius, spread, cup, ripple, tilt — so the picker's folder
      // can measure this leaf instead of copying numbers; core/README.md 13, rule 1)
      pickLeaves.push(lotusPlant(pond, V3(x, WATER_Y, z), V3(x + 0.05, WATER_Y + 1.05, z - 0.1), 'leaf', { R, sway: (px, py) => Math.max(0, py - WATER_Y) * 0.22, tree: 2, leafR: 0.36, tilt: 0.1 }));
      pondSolids.push({ x, y: WATER_Y, z, r: 0.05, h: 1.2, name: `pick leaf@${x}` });
      const bz = z + PICK_BLOOM.dz;
      const fb = new Batch({ wind: true });
      // a short curved stem from the water, the bud lying on it, tip turned up a little toward the boat
      fb.tube([V3(x + 0.06, WATER_Y - 0.02, bz - 0.05), V3(x + 0.05, WATER_Y + 0.015, bz - 0.02), V3(x, WATER_Y + 0.028, bz)], 0.006, LC.stem, 6, 4, 0, 2);
      lotusBud(fb, V3(x, WATER_Y + 0.028, bz), { up: V3(-0.55, 0.3, 0.78).normalize(), size: 0.85, sway: 0, tree: 2 });
      const bloom = heroOf(fb, { rims: false, tier: TIER2 });
      bloom.name = `pick bud ${i}`;
      scene.add(bloom);
      core.receiveShadows(bloom);
      pickBlooms.push(bloom);
      pickBloomAt.push(V3(x - 0.028, WATER_Y + 0.043, bz + 0.04));
      pondSolids.push({ x: x - 0.028, y: WATER_Y, z: bz + 0.04, r: 0.05, h: PICK_BLOOM.h, name: `pick leaf@${x} (bud)` });
    });
    const pondMesh = heroOf(pond, { wind: true, rims: false, tier: TIER2 });
    scene.add(pondMesh);
    // the pond's leaves take the boat's (and the picker's, the dragonflies') shadows from the low sun
    core.receiveShadows(pondMesh);
    core.nearFade(pondMesh, [0.4, 1.0]);
    const pondFar = new Batch({ kind: 'knife', wind: true });
    await scatterPond(pondFar, R, { xMin: -22, xMax: -0.5, zFar: -66, zNear: -29, n: 900, quiet: 'far', tree: 5, heightK: 0.9, leafK: 1.2, flowers: 0.12, buds: 0.06, slice });
    const pondFarMesh = new THREE.Mesh(pondFar.merge(), knifeMaterial({ wind: true }));
    pondFarMesh.frustumCulled = false;
    scene.add(pondFarMesh);
    await slice('pond');
    const boat = buildBoat(scene, R);
    boat.group.name = 'ha-boat';   // named for seasons/ha/keepout.mjs (the boat and the picker in it, measured by pixels)
    await slice('boat');
    core.progress(0.65);
    await nextFrame('pond, boat');

    // ---- layer 1: the tea corner, the bottle, the two stand-ins
    // the main people: a folder in people/ plays a role when the cast names it (season.people or ?people=teaMaker:<name>);
    // otherwise the stand-in from figures.js takes the pose. The real tea maker brings her own basket of fresh lotus
    const cast = window.__chom?.cast || {};
    await slice('before tea corner');
    const tea = teaCorner(scene, R, { at: V3(TABLE.at[0], 0, TABLE.at[1]), ry: TABLE.ry, basketAt: cast.teaMaker ? null : V3(BASKET[0], 0, BASKET[1]), basketR: BASKET_R });
    // the kerosene lamp: a small warm pool on the tray (it lights the glass from beside; the sun lights it from behind)
    // her kerosene lamp stands on the tray right beside the bottle and is the only made light on the bank at this hour:
    // turned up (a lamp with its wick run higher), it is what makes the glass and the paper label read against the water
    core.lamp(0, tea.lamp, { radius: 1.1, color: '#ffc07a', k: 1.5 });
    core.glow('#ffb050', 0.26, 0.31, tea.lamp);
    await slice('tea corner');
    await core.bottle();
    await slice('bottle');
    const maker = cast.teaMaker ? null : await buildTeaMaker(scene, R, {
      at: V3(TEA_MAKER.at[0], 0, TEA_MAKER.at[1]), face: V3(TEA_MAKER.face[0], 0, TEA_MAKER.face[1]),
      bowl: V3(...(() => { const [x, z] = tw(TRAY.bowl); return [x, 0.38, z]; })()),
    }, slice);
    await slice('tea corner, bottle');
    const bike = parkedBicycle(scene, R, { at: V3(BICYCLE.at[0], 0, BICYCLE.at[1]), ry: BICYCLE.ry });
    const pole = ganh(scene, R, { at: V3(...GANH.at), a: GANH.a });
    // steam off the hot teapot: a thin wisp, bent by the evening breeze
    const pot = tw(TRAY.teapot);
    core.fx.smoke({ sources: [{ at: [pot[0], 0.44, pot[1]], life: 3.4, rise: 0.11, spread: 0.1, size: 0.035, drift: [0.03, -0.01], color: '#f6eee8', opacity: 0.32 }], n: 14 });
    const picker = cast.picker ? null : await buildPicker(scene, R, boat, slice);
    for (const o of [maker?.P.group, boat.group, boat.pole, ...boat.picked]) if (o) core.addCasters(o);
    const flies = buildDragonflies(scene, {
      n: 6,
      // one zone each, apart from each other, above the leaves (so no two ever meet)
      zones: [
        // (the tallest pond flowers reach y ~0.85; the near lotus at the lens stands east of x -1.3)
        // (all inside the main frame: left of the lantern pole, over the pond)
        { x: [-1.6, -1.1], y: [1.05, 1.3], z: [-4.2, -3.6] },
        { x: [-2.6, -1.6], y: [0.95, 1.25], z: [-7.5, -5.8] },
        { x: [-1.2, -0.5], y: [0.95, 1.2], z: [-9.5, -7.8] },
        { x: [-1.9, -1.4], y: [1.0, 1.3], z: [-5.2, -4.6] },
        { x: [-4.0, -3.0], y: [1.0, 1.3], z: [-6.5, -5.0] },
        { x: [-0.9, -0.4], y: [1.1, 1.4], z: [-5.4, -4.6] },
      ],
    });
    for (const m of flies.meshes) core.addCasters(m);

    // ---- the crowd along the road and at the parapet
    core.crowd(crowdList(20260618), { fadeZ: [-122, -112] });

    // painted shadows of the still things near the eye (the tea corner, the trees, the lamps)
    core.capsules([
      ...tea.shadows.map((s) => [s[0], s[1], Math.min(s[2], s[3]) * 1.1, s[4] ?? 1]),
      ...bike.shadows.map((s) => [s[0], s[1], Math.min(s[2], s[3]), s[4]]),
      ...pole.shadows.map((s) => [s[0], s[1], s[2], s[4]]),
      ...TREE_Z.slice(0, 3).map((z) => [XS.tree, z, 0.45, 5]),
      ...LAMP_Z.slice(0, 2).map((z) => [XS.lamp, z, 0.1, 4.4]),
    ]);

    // ---- layer 0: lotus leaning over the bank at the lens, a flower and buds among the leaves
    const l0 = new Batch({ wind: true });
    const lsw = (x, y) => Math.max(0, y - WATER_Y) * 0.2;
    // (rooted in the water off the bank, leaning in over the coping at the lower left of the main frame)
    const nearPlants = [
      ['leaf', [-0.8, -2.4], [-0.05, 0.62, -2.55], 0.34],
      ['leaf', [-0.9, -3.0], [-0.2, 0.48, -3.05], 0.3],
      ['flower', [-0.9, -2.7], [-0.25, 0.98, -2.75], 1.6],
      ['bud', [-1.0, -2.2], [-0.45, 0.9, -2.3], 1.5],
      ['leaf', [-1.2, -2.0], [-0.55, 0.78, -2.05], 0.33],
      ['leaf', [-1.1, -3.4], [-0.45, 0.4, -3.45], 0.32],
      ['bud', [-1.2, -3.1], [-0.7, 1.12, -3.0], 1.3],
      ['leaf', [-1.3, -2.6], [-0.85, 0.3, -2.7], 0.3],
    ];
    for (const [what, f, top, s] of nearPlants) {
      lotusPlant(l0, V3(f[0], WATER_Y, f[1]), V3(...top), what, { R, sway: lsw, tree: 0, leafR: s, tilt: 0.35, open: 0.75, size: s, stemR: 0.011 });
    }
    const layer0 = heroOf(l0, { wind: true, rims: false, tier: 0.02 });
    scene.add(layer0);
    core.receiveShadows(layer0);
    // the push passes over these leaves: they thin away stroke by stroke rather than fill the lens
    core.nearFade(layer0, [0.5, 1.2]);
    // the lantern pole: the camera passes just over its top on the way out over the pond
    for (const h of tea.heroes) core.nearFade(h, [0.4, 1.0]);

    // ---- what the clipping check keeps everyone out of
    const solids = [
      ...tea.solids,
      ...bike.solids,
      ...pole.solids,
      // (the real tea maker gives her own solids; the stand-in's is here)
      ...(maker ? [{ x: TEA_MAKER.at[0], z: TEA_MAKER.at[1], r: 0.28, h: 1.25, name: 'tea maker' }] : []),
      ...treeSolids,
      ...LAMP_Z.map((z) => ({ x: XS.lamp, z, r: 0.16, h: 4.4, name: `lamp z${z}` })),
      ...LAMP_Z.map((z) => ({ x: XS.farLamp, z: z - 11, r: 0.16, h: 4.4, name: `far lamp z${z - 11}` })),
      ...pondSolids,
    ];
    // the parapet (people standing beside it keep off it; where a couple sits on it, they sit on its top, not in it)
    for (let z = -7.6; z > -130; z -= 1) if (!SITTERS.some(([sz]) => Math.abs(z - sz) < 1.0)) solids.push({ x: 0, z, r: 0.22, h: 0.5, name: `parapet z${z.toFixed(0)}` });

    const wave = lake.uniforms;
    // dev only: a handle for this season's own checks (the pole against the lotus stems)
    // dev only: this season's own numbers, readable from a check (the published leaf and hull shapes go out through
    // peopleLayout.picker as well, so the picker's folder can read them without ?dev=1)
    if (new URLSearchParams(location.search).get('dev') === '1') window.__chomHa = { boat, solids, BOAT, WATER_Y, pickBlooms, pickLeaves, hull: HULL, hullHalf, hullSheer, hullBottom };
    const boatMovers = (t) => {
      const s = boatAt(t);
      return [-1.15, 0, 1.15].map((dx, i) => ({ x: s.x + dx, y: WATER_Y, z: s.z, r: 0.5, h: 2.3, name: `boat#${i}`, group: 'boat' }));
    };
    const at = (a) => V3(a[0], 0, a[1]);
    if (DEVQ) steps.push(['end of build', +(performance.now() - lastYield).toFixed(1)]);
    return {
      layers: { foreground: [layer0], middle: [pondMesh, boat.group, ...(maker ? [maker.P.group] : []), ...tea.heroes], background: [kMesh, fTrunk, crownMesh, farMesh, pondFarMesh, lake.mesh] },
      crowd: null,
      // where the main people are and what they hold (for the people agent). Loops: 6 s (tea), 64 s (boat, 3.2 s poling rhythm)
      peopleLayout: {
        roles: ['teaMaker', 'picker'],
        // world points (V3); table-local values are in bank.js TRAY (table at TABLE.at, turned TABLE.ry; top y 0.34)
        teaMaker: {
          at: at(TEA_MAKER.at), face: at(TEA_MAKER.face), seat: 'low stool, seat 0.26 high, 0.47 m behind the table\'s far edge, facing straight in',
          table: { at: at(TABLE.at), ry: TABLE.ry, top: 0.34, half: [0.48, 0.29] },
          tray: V3(...(() => { const [x, z] = tw(TRAY.at); return [x, TRAY_TOP, z]; })()), trayR: TRAY.r,
          bottle: V3(...BOTTLE_AT),
          basketSpot: V3(...(() => { const [x, z] = tw(TRAY.basketSpot); return [x, TRAY_TOP, z]; })()), basketSpotR: TRAY.basketR,
          freshBasket: at(BASKET), freshBasketR: BASKET_R,
          lamp: V3(...(() => { const [x, z] = tw(TRAY.lamp); return [x, TRAY_TOP, z]; })()), lampR: 0.055, lampH: 0.25,
          tube: V3(...(() => { const [x, z] = tw(TRAY.tube); return [x, 0.34, z]; })()),
          bowl: V3(...(() => { const [x, z] = tw(TRAY.bowl); return [x, 0.38, z]; })()),
          holds: { left: 'an open lotus, stem down', right: 'a pinch of green tea, then a strip of lạt; the tied flower goes into the small basket at basketSpot' },
          loop: 6,
        },
        // the boat group moves itself (update); the picker stands in it. The pole and the two picked flowers are the season's
        // meshes: a people folder may drive them (boat.pole: a 4.2 m cylinder about its middle; boat.picked[0..1]) or hide them
        picker: {
          boat: boat.group, pole: boat.pole, picked: boat.picked, boatAt, period: BOAT.period, deckY: boat.deckY,
          // (the board she stands on runs boat-local x -1.45 .. -0.55)
          stand: 'boat-local (-1.0, deckY, 0) facing +x on the way in; turns to face -x (and steps to x -0.75) for the way out',
          phases: 'in 0-26 s (poling, 3.2 s strokes), pick 26-40 s (two bends over the far side, z -), turn 40-46 s, out 46-64 s (stern first)',
          pickAt: PICK.map(([x, z]) => V3(x, WATER_Y, z)),
          // ---- numbers this season publishes so nobody has to measure them by eye (core/README.md 13, rule 1)
          // the two leaves she reaches past: the blade's radius and spread (2 x radius), how far its rim is lifted
          // (leafR x cup) and how much it ripples (leafR x wave), where its stem meets the blade, and which way it tilts.
          // leafPoint(leaf, rho, angle) gives any point on the blade in the leaf's own frame; turn it by leaf.q and add
          // leaf.at for world coordinates.
          leaves: pickLeaves.map((l) => ({ at: l.at, foot: l.foot, r: l.leafR, across: l.across, cup: l.cup, wave: l.wave,
            rimRise: +(l.leafR * l.cup).toFixed(4), ripple: +(l.leafR * l.wave).toFixed(4), notch: l.notch, up: l.up, q: l.q, stemR: l.stemR })),
          leafPoint,
          // the hull, as it was built: lengths in metres, boat-local (x along the hull, +x the bow; y up from the rim
          // line, which floats HULL.float above the water; z across). half/sheer/bottom(x) give the real section anywhere
          hull: HULL, hullHalf, hullSheer, hullBottom, waterY: WATER_Y,
          // the two buds she breaks off (meshes, top at most 0.08 m above the water, under the pick leaves; show each while the
          // hull hides it, hide it when she breaks it), and where each bud is (world)
          pickBlooms, pickBloomAt,
        },
      },
      bottle: { at: BOTTLE_AT, why: 'on the tea maker\'s tray of lotus tea' },
      // (no loose sketch round the stand-in: its hull ran from the held flower straight down to her knee, two stray lines)
      sketch: [...tea.sketch],
      solids,
      movers(t) {
        return [...boatMovers(t), ...flies.movers(t)];
      },
      update(t) {
        // the boat, poled along its channel; the hull dips with each push and rocks when she bends
        const tq = Math.floor(t * 12) / 12;
        const s = boatAt(t);
        const g = boat.group;
        // (the hull floats with its rim ~0.28 m above the water, its bottom a few cm under it)
        g.position.set(s.x, WATER_Y + BOAT.float + 0.012 * Math.sin(t * 1.3) - 0.01 * Math.max(0, Math.sin(s.push * Math.PI * 2)), s.z);
        g.rotation.set(0.018 * Math.sin(t * 0.9) + (s.phase === 'pick' ? 0.03 : 0), 0, 0.012 * Math.sin(t * 1.1 + 1) * Math.min(1, Math.abs(s.v) * 3));
        wave.uBoat.value.set(s.x, s.z, s.dir > 0 ? 0 : Math.PI, Math.abs(s.v));
        if (picker) picker.update(t);
        // rings where the pole goes into the water (from the pole itself, whoever holds it)
        const pl = boat.pole;
        pl.updateMatrixWorld(true);
        const lo = V3(0, -2.1, 0).applyMatrix4(pl.matrixWorld), hi = V3(0, 2.1, 0).applyMatrix4(pl.matrixWorld);
        if (pl.visible && lo.y < WATER_Y && hi.y > WATER_Y && s.phase !== 'pick') {
          const k = (WATER_Y - lo.y) / (hi.y - lo.y);
          wave.uPole.value.set(lo.x + (hi.x - lo.x) * k, lo.z + (hi.z - lo.z) * k, 1, (s.push * BOAT.push) % BOAT.push);
        } else wave.uPole.value.set(0, 999, 0, 0);
        if (maker) maker.update(t);
        // the lamp's flame breathes on twos: a little taller and shorter, leaning with the evening air; the pool on the tray
        // swells and sinks with it
        if (tea.flame) {
          const fq = Math.floor(t * 12);
          const n = Math.sin(fq * 1.7) * 0.5 + Math.sin(fq * 0.63 + 1.3) * 0.5;
          tea.flame.scale.set(1 - 0.05 * n, 1 + 0.12 * n, 1 - 0.05 * n);
          tea.flame.rotation.set(0.05 * Math.sin(fq * 0.41), 0, 0.06 * Math.sin(fq * 0.53 + 0.7) + 0.02 * (U.uWind.value.x - 0.12));
          tea.pool.material.uniforms.uFlick.value = 1 + 0.08 * n;
        }
        flies.update(t);
        // the boat's load leans a little with its way through the water
        U.uSway.value[4].x += 0.03 * s.v * (s.dir > 0 ? 1 : -1);
      },
    };
  },
};
