// Chớm world, season Xuân: Hàng Lược in the days before Tết, a low spring sun through drizzle.
// The flower market: the seller wraps a bouquet, a customer turns a peach branch and pays, a motorbike carries a peach tree
// down the street, the crowd with branches, kumquat pots and umbrellas; the bottle stands between the flower buckets.
// Came from paint test G. The contract: docs/superpowers/specs/2026-09-17-chom-world-contract.md (section 4).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// HOW THE BOTTLE WAS MADE TO READ HERE (21/9). This is the METHOD, not the result - the result is the bundles of lá
// dong in build.js. Anyone adding a thing to a scene to fix a number should work in this order:
//
//   1. TRY IT WITH SOMETHING CHEAP AND UGLY FIRST, IN THE LIVE SCENE. The bottle's own box scored 36.6 with the glass
//      there and 36.4 with it taken out - the glass was worth nothing where it stood. Before modelling anything, a
//      plain flat dark CARD was dropped into the running page behind the bottle and the check re-run at several sizes,
//      distances and darknesses. Fifteen minutes, no craft, and it answered the only question that mattered: how much
//      quiet dark ground is needed, and where. (0.5-0.6 m, 0.45 m behind: empty spot 36.8 -> 17-21, own share 1% -> 32%.)
//      Modelling first and measuring after would have meant building a beautiful thing at the wrong size, twice.
//   2. THEN BUILD THE REAL THING, AND IT MUST HAVE A REASON TO BE THERE. The card told us the size; it did not get to
//      decide what the object is. In the days before Tết every seller on Hàng Lược stands bundles of lá dong on end for
//      bánh chưng - and lá dong is this season's own top note. So the dark ground is a thing the street would have
//      anyway. A grey slab of the same size would have scored exactly the same and been a lie in the picture.
//   3. MEASURE THE REAL THING AGAIN, on both frames. It is never the same as the card: the paint shader lifts a dark
//      green under this sun, so the first build came out sage grey and had to go darker twice.
//
// The trap this avoids: a number can always be moved by putting something in front of the problem. What decides whether
// that is craft or cheating is whether the thing you put there belongs in the scene on its own account.
//
// ══ AND THE TIME THE METHOD WORKED AND MIKE STILL SAID NO (21/9, after the bottle went to ×3) ══
// At ×3 the phone frame fell from 40% to 7%: the glass's shoulder rose above the lá dong and stood against pale
// blossom. The same three steps were run again. The bundles went up onto an upturned bamboo basket (the drizzle is
// the reason), one of them squarely behind the glass, in the crate's own tier so the spring air stopped painting them
// grey. It worked on the number - 7% -> 31%, rank 6 -> 1, the same at five moments. On a computer it made a tall,
// dark, heavy block behind the stall. Mike looked at the phone frame at 7% beside 31% and chose 7%:
//     "trước là đủ rồi, bỏ cái lá tối đi."
// The basket and the raised bundles are gone; the bundles are back exactly as before. What was KEPT is the matte
// lacquer on the box the bottle stands on - the surface it stands on, nothing added to the picture - and that alone
// takes the phone frame from 7% to 26-27% (computer 76%). So this frame now reads under the 30% bar on purpose.
//
// THE MEASUREMENT THAT MATTERS MOST, SO IT IS NOT LOST: a flat, near-black card set right behind the glass - the
// darkest, stillest ground there could ever be - scored 29% on the phone. LOWER than the leaves. At ×3 the glass is
// 70 x 150 px on a 390 px frame and fills most of the check's own box, so a dark ground only draws hard edges of its
// own inside that box. That 29% is the check hitting its ceiling, not the bottle being hard to see. Anyone who comes
// back to "Xuân phone is under 30%" with a plan to darken what stands behind it: it was measured, and it tops out here.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
import { buildStall, lanternStrings, tetBanner, marketAwning } from './build.js';
import { crowdList, balconyPeople } from './crowd-data.js';

const ST = { kerbNear: 1.1, kerbFar: -3.6, wallNear: 5.2, wallFar: -5.0, sideA: -6.4, sideB: -10.4 };
// the gap in the far row (world z): a lane, then low houses split by narrow tall ones. The late sun comes through it onto the stall
const GAP = [-12.8, -25.2];
const LAMP = [0.93, 1.72, -3.18];
// the seller (people/nguoiban) sits 0.85 m from the customer, facing her; the note changes hands at EXCH, 4.833 s into the
// market's 6 s loop (people/nguoiban/track.json was made for exactly this arrangement: keep it within 2 cm)
const SELLER = [2.8406, 0, -4.3261];
const CUSTOMER = [2.0, 0, -4.2];
const EXCH = [2.4529, 0.97, -4.0455];  // where the money changes hands
const EXCH_T = 4.833;
// the motorbike with the peach tree: its lane (x), speed and loop
// (it crosses the lane's stripe of sun in the main frame at t = 17.5 and every 19 s after: its shadow runs along the stripe)
const BIKE = { x: -1.3, speed: 6.8, period: 19, ride: 16, offset: 3.2, z0: 5 };
// (21/9) The lone walker at the far edge of the road is now one of the crowd (crowd-data.js, lane x = -3.16), and the
// 'walker' role is gone. He was the last role people/placeholder played here, and the gate asks for real people, not
// stand-ins. Two things settled it, both measured off the page's own camera: he is never on the tall phone frame at all
// (at every point of his 80 s loop his box lies wholly left of x = 0 on 390x844), and on 1440x900 he is a background
// figure 26-178 px tall, always against the left edge, 16-100 m away — the same job, at the same sizes, that the crowd
// already does in the lane 0.86 m beside him. Dropping the role takes people/placeholder out of the page altogether.

export const POLE_Z = [-5, -19.5, -34, -48.5, -63, -77.5, -92];
const bikeZ = (t) => {
  const tm = (((t + BIKE.offset) % BIKE.period) + BIKE.period) % BIKE.period;
  return { tm, dist: BIKE.speed * tm, z: BIKE.z0 - BIKE.speed * tm, visible: tm < BIKE.ride };
};
// where the motorbike is at t, for the people folder that rides it (layout.bikeAt): the same numbers the season uses
const bikeAt = (t) => { const b = bikeZ(t); return { x: BIKE.x, y: 0, z: b.z, visible: b.visible, dist: b.dist }; };

export default {
  id: 'xuan',
  seed: 20260217,
  // who plays the main roles (folders in people/): the flower seller (people/nguoiban), the customer in an áo dài
  // (people/khach) and the rider with the peach branch (people/laixe). All three are real people; nothing here is a stand-in.
  // The seller is built before the customer (README 11)
  people: { seller: 'nguoiban', customer: 'khach', rider: 'laixe' },
  label: 'A painted, living scene looking down Hàng Lược street before Tết, a low spring sun shining through light drizzle, red lanterns and a New Year banner strung across the street: a flower seller on a low stool wraps a bouquet, a customer in a raincoat turns a peach branch and pays, a motorbike carries a flowering peach tree away down the street, shoppers with umbrellas, kumquat pots and peach branches fill the pavements further on, and a Chớm perfume bottle stands under the stall\'s lamp',
  notes: {
    name: 'Xuân', seasonWord: 'spring', english: 'Spring · drizzle and peach blossom',
    opener: 'Spring comes in as drizzle so fine it never quite lands.',
    top: 'Dong leaf', heart: 'Peach blossom', base: 'Damp lime plaster',
    memory: 'Peach branches ride home on the backs of motorbikes, through the drizzle. Every doorway smells of wet tile and the dong leaves for New Year cakes.',
  },
  // section 5: a low yellow-pink spring sun; pale yellow-pink air; peach pink first, kumquat orange and Tết red second
  palette: {
    air: '#eadfd4', airSun: '#f8dcb2', fog: '#ecdcc8', shade: '#b8a0b6', lit: '#ffecd0', litK: 1.2,
    skyTop: '#b2bede', skyLow: '#f2cab2', hi: '#fff4dc', drip: '#c8745e',
    airNear: 12, airFar: 125, airMax: 0.8, clear: '#ece0d0',
    accent: '#e08aa2', accent2: ['#dc7a2a', '#c8302a'],
  },
  sun: { dir: [-0.435, 0.375, -0.819], color: '#ffe4bc', intensity: 1.2 },
  street: ST,
  camera: {
    fov: 44, eye: [0.6, 1.42, 0], yaw: 16, pitch: 0.6,
    // past the branches, over the kerb beside the stall, down the street, up over the roofs into the drizzle
    path: [[0.6, 1.42, 0], [0.35, 1.62, -2.6], [0.1, 2.6, -7], [0.0, 4.3, -13.5], [-0.15, 5.9, -22], [-0.25, 8.3, -33], [-0.2, 10.6, -46]],
    // on a tall phone screen the frame is narrow: turn a little left so the bottle stays in it
    yawAt: (p, narrow, { sm }) => 16 - (narrow ? 6 : 0) * (1 - p) - 12 * sm(0.0, 0.6, p),
    pitchAt: (p, { sm }) => 0.6 - 2.2 * sm(0.1, 0.4, p) - 9 * sm(0.4, 1.0, p),
  },
  // the bottle stands in the lane's beam: the sun through its glass (glow), a spark of sun on its shoulder (glint), and the
  // painter's value plan around it (focus: darken away, warm lift near, colour quieted away, reach), so the eye lands there first
  // At the bottle's real size the glass is a small thing in a wide street, so the two lights that already fall on it are
  // turned up rather than the frame turned down: the low sun behind it (glow, glint) and the stall lamp on its paper label.
  //
  // (21/9) THE SPARK WAS BIGGER THAN THE BOTTLE. glint.size is the halo's width in metres and it stood at 0.16, on a
  // flacon 0.147 m tall and 0.098 m wide: not a spark on the shoulder, a star covering the whole glass. Two things
  // followed, both measured. The glass burned white and stopped reading as glass (the very thing the notes in
  // seasons/ha/season.js say never to do). And the spark is a separate mesh pinned to the bottle, not a child of it, so
  // __chom.setBottle(false) leaves it burning in the bottle's own box: on the phone frame, with the ground behind the
  // bottle made quiet, the empty box still scored 54.3 - the star alone. Cut to a real spark on the shoulder.
  bottle: { at: [0.95, 0.74, -3.2], scale: 1, ry: 0.55, label: 'X U Â N', labelFontText: 'XUÂN', glow: 1.45, glint: { at: [-0.034, 0.12, 0.045], size: 0.05, strength: 0.85 }, focus: [0.06, 0.06, 0, 0.58],
    labelLight: { color: '#ffe6c4', k: 2.2 },
    // the close-up (core README 10): in front of the bottle and a little above it, as Mike approved, on a straight flight
    // (checked with core/qa/faces.mjs: the customer's features never show; on the old arc they did, 4 px, early in the flight)
    focusView: { offset: [-0.28, 0.16, 0.86], phoneOffset: [-0.49, 0.28, 1.505], phonePitch: 16, arc: 0 } },
  beams: { gap: [GAP[1], GAP[0]], winZ: [-16.5, -22.0], winLo: [3.9, 5.7, 7.5], boxMax: [ST.wallNear, 10.5, -5.0] },
  sway: [[-0.2, 2.0, -1.9], [1.5, 1.4, -4.3], [3.7, 1.2, -4.0], [2.0, 1.5, -4.2], [-1.3, 1.8, -12], [0, 5, -16]],
  fonts: [['800 92px "Be Vietnam Pro"', 'CHÚC MỪNG NĂM MỚI']],

  async build(scene, R, core) {
    const { THREE, V3, U } = core;
    const { knifeMaterial, sketchMaterial } = core.paint;
    const { Batch, hero, ribbons, peachBranch, streetSign, buildMotorbike, wireLines } = core.build;

    // ---- layer 4: sky and the far streets (flats at the end of the street and behind the rows)
    core.sky();
    core.backdrop({ w: 260, h: 40, seed: 3.1, haze: 0.3, cBld: '#b89a90', cBld2: '#e2c4a8', cWin: '#f0c890', cSky: '#f0dcc4', cRoof: '#b88070', minH: 6, maxH: 16, cellW: 4.6 }, [0, 0, -135], 0);
    core.backdrop({ w: 420, h: 60, seed: 7.7, haze: 0.5, cBld: '#d0b8a8', cBld2: '#e0ccbc', cWin: '#ecd0a8', cSky: '#f2e0cc', cRoof: '#c09080', minH: 9, maxH: 26, cellW: 8, strokes: 0.2 }, [0, 0, -190], 0);
    core.backdrop({ w: 200, h: 40, seed: 5.3, haze: 0.4, cBld: '#c4acb0', cBld2: '#d6c0c0', cWin: '#e8c898', cSky: '#ecdcd0', cRoof: '#a88078', minH: 8, maxH: 18, cellW: 5 }, [-34, 0, -60], Math.PI / 2);
    core.backdrop({ w: 200, h: 40, seed: 9.9, haze: 0.4, cBld: '#e0bc98', cBld2: '#f0d4b4', cWin: '#f4d098', cSky: '#f4e0c8', cRoof: '#c08a70', minH: 8, maxH: 18, cellW: 5 }, [34, 0, -60], -Math.PI / 2);

    // ---- layer 3: the two rows of Hàng Lược houses, palette knife, with a flat offset print behind the masses
    const mass = new Batch({ kind: 'knife' });
    const kb = new Batch({ kind: 'knife' });
    const fine = new Batch({ kind: 'knife', wind: true });
    const balconies = [];
    const nearA = core.houseRow(kb, mass, fine, 1, ST.wallNear, 14, ST.sideA, { haze: 0.1, seed: 0, balconies });
    const nearB = core.houseRow(kb, mass, fine, 1, ST.wallNear, ST.sideB, -118, { haze: 0.14, seed: 2, gable: true, balconies });
    const tops = [];
    const far = [
      ...core.houseRow(kb, mass, fine, -1, ST.wallFar, 14, GAP[0], { haze: 0.18, seed: 1, tops, balconies }),
      ...core.houseRow(kb, mass, fine, -1, ST.wallFar, GAP[0], GAP[1], { haze: 0.18, gap: true, tops }),
      ...core.houseRow(kb, mass, fine, -1, ST.wallFar, GAP[1], -118, { haze: 0.2, seed: 3, tops, balconies }),
    ];
    core.sunRoofs(core.farTops(tops));
    // the blocks behind the rows (seen when the camera rises), and the side street's far wall
    for (const x of [-27, 27]) for (let z = 8; z > -118; z -= 11) mass.box(11, 7 + R() * 5, 11, V3(x + (R() - 0.5) * 2, 3.5, z), { col: x < 0 ? '#d8b8a8' : '#e4c49c', col2: '#f2dcc4', scale: 0.35, drip: 0.4, seed: R(), haze: 0.32 });
    mass.box(10, 8, 0.4, V3(23, 4, -8.4), { col: '#e4c49c', col2: '#f2dcc4', scale: 0.35, drip: 0.4, seed: R(), haze: 0.3 });
    // concrete poles on the far pavement (close to the fronts, out of the walkers' lane), and the tangle of wires they carry
    const poles = [];
    for (const z of POLE_Z) poles.push(V3(ST.wallFar + 0.3, 7.2, z));
    for (const p of poles) {
      kb.box(0.24, p.y + 0.6, 0.24, V3(p.x, (p.y + 0.6) / 2, p.z), { col: '#b0a8b0', col2: '#e4dcd4', scale: 0.8, drip: 0.3, seed: R(), haze: 0.1 });
      kb.box(0.1, 0.1, 1.1, V3(p.x, p.y, p.z), { col: '#4a4a52', col2: '#7a7a84', scale: 2, seed: R(), haze: 0.1 });
    }
    const massGeo = mass.merge();
    const houseMesh = new THREE.Mesh(massGeo, knifeMaterial());
    const shadowPrint = new THREE.Mesh(massGeo, knifeMaterial({ flat: true, flatCol: '#8a7890', shift: [0.0042, -0.0056, 0.015] }));
    scene.add(houseMesh, shadowPrint);
    const kMesh = new THREE.Mesh(kb.merge(), knifeMaterial());
    const fMesh = new THREE.Mesh(fine.merge(), knifeMaterial({ wind: true }));
    scene.add(kMesh, fMesh);
    for (const m of [houseMesh, shadowPrint, kMesh, fMesh]) m.frustumCulled = false;
    const wl = wireLines(poles, R);
    for (const p of poles.slice(0, 5)) for (let k = 0; k < 2; k++) {
      const a = p.clone().add(V3(0, 0.2 * k, 0)), b = V3(ST.wallNear + 0.05, 6.1 + k * 0.4, p.z - 1.5 - k);
      const pts = [];
      for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(a.clone().lerp(b, t).add(V3(0, -Math.sin(t * Math.PI) * (0.6 + 0.3 * k), 0))); }
      wl.push({ pts, width: 1.1, alpha: 0.7 });
    }
    // Tết across the street: strings of red lanterns and the New Year banner (a quiet, secondary thing)
    // the nearest string hangs further up the street than it did: in a tall phone frame the first lantern sat high on the
    // left against the pale sky and read louder than the bottle. Further off it is smaller and deeper in the air, and the
    // street still has five strings of lanterns over it.
    const lan = lanternStrings(R, { xA: ST.wallFar + 0.05, xB: ST.wallNear - 0.05, zs: [-19, -25, -39, -47, -58] });
    const lanMesh = new THREE.Mesh(lan.batch.merge(), knifeMaterial({ wind: true }));
    lanMesh.frustumCulled = false;
    scene.add(lanMesh);
    wl.push(...lan.wires);
    // the market's canvas over the street, right at the eye: the top strip of the picture is lit cloth, not sky
    // (the page's words sit there; core README 12). It is hung in the eye's own direction, so its hem runs level.
    // (the sun is ahead of us and above it, so the cloth is lit from behind and glows; its shadow falls behind the eye,
    // out of the picture, which is why it is not a caster: nothing would be drawn for it)
    marketAwning(scene, R, { eye: V3(0.6, 1.42, 0), yaw: 16 });
    const banner = tetBanner({ xA: ST.wallFar + 0.05, xB: ST.wallNear - 0.05, z: -32, y: 8.8, h: 0.95 });
    banner.mesh.name = 'xuan-banner';          // named for seasons/xuan/keepout.mjs (measured by pixels)
    scene.add(banner.mesh);
    wl.push(...banner.ropes);
    const wires = new THREE.Mesh(ribbons(wl), sketchMaterial({ color: '#4c4c56', dry: 0 }));
    wires.frustumCulled = false;
    scene.add(wires);
    // the street sign, on the bare side wall across the side street, where people look for it
    const sign = streetSign({ top: 'PHỐ', name: 'HÀNG LƯỢC' });
    sign.name = 'xuan-street-sign';            // named for seasons/xuan/keepout.mjs
    sign.position.set(ST.wallNear + 1.5, 3.55, ST.sideB + 0.03);
    scene.add(sign);
    core.progress(0.45);
    await core.nextFrame();

    // ---- ground (both pavements and the road)
    core.ground();

    // ---- lights: 0 = the stall lamp over the bottle, 1-2 = bulbs on the rail, 3-5 = shop mouths
    const lamp = V3(...LAMP);
    const stall = buildStall(scene, R, { lampAt: lamp });
    core.light(0, lamp, 3.2, '#ffc684', 0.95);
    [stall.bulbs[0], stall.bulbs[2]].forEach((p, i) => core.light(1 + i, p, 2.4, '#ffb868', 0.55));
    const shops = [...nearA, ...nearB].sort((a, b) => Math.abs(a.z + 4.5) - Math.abs(b.z + 4.5));
    const pick = [shops[0], nearB.find((p) => p.z < -16 && p.z > -24), far.find((p) => p.z < -24 && p.z > -34)].filter(Boolean);
    pick.forEach((p, i) => core.light(3 + i, p, i === 0 ? 5.5 : 4, '#eab47c', i === 0 ? 0.5 : 0.62));
    // the halo round the stall lamp: a small warm core, not a disc (the light it throws is core.light(0), untouched)
    core.glow('#ffb050', 0.11, 0.3, lamp);
    for (const p of stall.bulbs) core.glow('#ffb050', 0.2, p.z, p);
    // published, read-only, for seasons/xuan/keepout.mjs: the lamps the page must not cover, from the numbers they were
    // built from here (the stall lamp over the bottle, and the bulbs on the rail)
    scene.userData.lamps = { stall: lamp.toArray(), bulbs: stall.bulbs.map((p) => p.toArray()) };

    // the bottle, on the lacquer box between the flower buckets, right under the lamp
    await core.bottle();

    // ---- the people: seller and customer at the stall, the rider on the motorbike
    // the motorbike: a real rider's folder brings his own machine, so the world only gives him the group that moves
    // (its +x is the way it runs, y = 0 the road); with the placeholder people the old painted motorbike is built instead
    const riderFolder = core.people && core.people.cast && core.people.cast.rider;
    const ownBike = !riderFolder || riderFolder === 'placeholder';
    const bike = ownBike ? buildMotorbike(scene, R) : { group: (() => { const g = new THREE.Group(); scene.add(g); return g; })(), wheels: [] };
    bike.group.rotation.y = Math.PI / 2;
    bike.group.position.set(BIKE.x, 0, BIKE.z0);
    await core.loadPeople({
      seller: { at: V3(...SELLER), face: V3(...CUSTOMER) },
      customer: { at: V3(...CUSTOMER), face: V3(...SELLER) },
      exchange: V3(...EXCH),
      exchangeTime: EXCH_T,
      bike: bike.group,
      // the motorbike's lane and where it is at t (the rider sits on layout.bike; this follows it for caps(t) and the checks)
      bikeX: BIKE.x,
      bikeAt,
    });
    // balcony life: a few people and the things of home on the balconies (background, quiet)
    const life = core.balconyLife(balconies, {
      // people go to the balconies the main view sees best (core.seen)
      seed: 31, zRange: [0.5, -46], share: 0.8, haze: 0.06, people: balconyPeople(),
      things: ['laundry', 'pots', 'cage', 'lantern', 'stool', 'bucket', 'bicycle', 'couplet'],
    });
    // the market crowd in the background: flat painted cut-outs (core/crowd.js), one draw call, sun shadows
    core.crowd([...crowdList(), ...life.people]);
    core.addCasters(bike.group);
    // painted shadows of the still things
    core.capsules(stall.shadows.map((s) => [s[0], s[1], Math.min(s[2], s[3]) * 1.1, s[4] ?? 1]));
    core.progress(0.6);
    await core.nextFrame();

    // ---- layer 0: peach branches reaching into the frame at the top left, right at the lens
    const l0 = new Batch({ wind: true });
    const lsw = (x) => 0.25 + Math.max(0, (x + 1.2)) * 0.35;
    peachBranch(l0, V3(-1.05, 2.4, -1.85), V3(0.95, -0.5, 0.05), 1.3, R, { twigs: 8, bloom: 120, petal: 0.032, sway: lsw, tree: 0, thick: 0.016 });
    peachBranch(l0, V3(-0.95, 2.15, -2.0), V3(1, -0.15, -0.1), 0.8, R, { twigs: 5, bloom: 55, petal: 0.032, sway: lsw, tree: 0, thick: 0.012 });
    const layer0 = hero(l0.merge(), { wind: true, rims: false });
    scene.add(layer0);

    // the drizzle and a few falling petals
    core.fx.rain({ n: 3600, box: { min: V3(-5, 0, -42), max: V3(5.4, 13, -0.8) } });
    core.fx.petals({ n: 30, spots: [[-0.3, 2.1, -1.9, 0.8, 0.013], [1.5, 1.9, -3.85, 0.5, 0.02], [1.5, 1.6, -4.75, 0.5, 0.02], [2.05, 1.5, -4.1, 0.3, 0.018], [1.9, 1.7, -5.6, 0.5, 0.02]] });

    // the still things the clipping check keeps everyone out of (the stall, the pole, the seller and the customer)
    const solids = stall.shadows.map((s, i) => ({ x: s[0], z: s[1], r: Math.min(s[2], s[3]), h: s[4] ?? 1.2, name: `stall#${i}` }));
    solids.push({ x: SELLER[0], z: SELLER[2], r: 0.35, h: 1.2, name: 'seller' }, { x: CUSTOMER[0], z: CUSTOMER[2], r: 0.3, h: 1.7, name: 'customer' });
    solids.push({ x: 1.15, z: -8.6, r: 0.06, h: 2.4, name: 'stall pole' });
    for (const p of poles) solids.push({ x: p.x, z: p.z, r: 0.14, h: 8, name: `street pole z${p.z}` });

    return {
      layers: { foreground: [layer0], middle: [], background: [houseMesh, kMesh, fMesh] },
      sketch: stall.sketchTargets,
      solids,
      // the things that move, for the clipping check
      movers(t) {
        const m = [];
        const b = bikeZ(t);
        // the motorbike with its rider, and the peach branch tied behind the seat: the branch tops out at 2.34 m and
        // hangs 1.18 m out behind the rear axle, so its shape reaches further back than the machine (the camera's push
        // must keep clear of it); the numbers come from people/laixe
        if (b.visible) {
          m.push({ x: BIKE.x, z: b.z, r: 0.55, h: 1.8, name: 'bike', group: 'bike' });
          m.push({ x: BIKE.x, y: 0.8, z: b.z + 0.75, r: 0.55, h: 1.54, name: 'bike peach branch', group: 'bike' });
        }
        return m;
      },
      update(t) {
        // the motorbike's tree leans back into the air it moves through
        U.uSway.value[4].z += 0.06 + 0.02 * Math.sin(t * 2.6);
        // the motorbike overtakes us from behind and rides away down the street into the drizzle
        const { dist, z, visible } = bikeZ(t);
        const g = bike.group;
        g.visible = visible;
        g.userData.dist = dist;
        g.position.set(BIKE.x, 0.008 * Math.sin(dist * 3.1) + 0.004 * Math.sin(dist * 7.3), z);
        g.rotation.x = 0.006 * Math.sin(dist * 2.3);
        for (const w of bike.wheels) w.rotation.z = -dist / 0.3;
      },
    };
  },
};
