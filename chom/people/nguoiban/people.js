// Chớm world: people/nguoiban — the flower seller (role 'seller') at the Tết flower market: a Hanoi street seller of the early
// 2000s on a low plastic stool, nón lá, a flowered scarf over her face, an old cardigan. She wraps a bouquet with raffia, lays it
// in her lap, takes the customer's note, slips it into her money pouch and takes the bouquet up again (6 s, on twos).
// A MakeHuman body (CC0, through MPFB2) with clothes built by code in Blender; painted by khach-paint.js; acted by nguoiban.js.
//
//   export async function buildPeople(scene, R, layout, core)
//     -> { update(t, dt, camera), lateUpdate(t, dt, camera), sketch, movers(t), solids, faceProbes(), placement }
//     layout.roles must include 'seller'; layout.seller = { at, face }; layout.customer = { at, face }; layout.exchange.
//     core: the world's api (core.THREE, core.U, core.paint, core.build, core.people, core.slice).
//
// Where she sits: 0.85 m from the customer, on the line from the customer to layout.seller.at; the note changes hands 0.97 m
// above the ground, halfway between them and 0.22 m to her left. The season's peopleLayout carries exactly these points
// (Xuân: seller (2.8406, 0, -4.3261), exchange (2.4529, 0.97, -4.0455)); this module does not change the layout, it only
// warns (?dev console) if the season's exchange point is more than 2 cm from hers.
// The hand-off drawing and where the note is then come from track.json (made on the test page with this same layout, in the
// customer's own frame). From the hand-off on, the customer's note is hidden through her api (README 11):
// core.people.get('customer').api.hideNote(on), called in lateUpdate (after every folder's update).
const here = (p) => new URL(p, import.meta.url).href;
const S = await import(here('./nguoiban.js'));
const KP = await import(here('./khach-paint.js'));
const LOOP = 6, FPS = 24, STEP = 2;
const GAP = 0.85, EX_Y = 0.97, EX_SIDE = 0.22;

export async function buildPeople(scene, R, layout, core) {
  if (layout.roles && !layout.roles.includes('seller')) return null;
  // she belongs to Xuân's flower market (a ?people= passed through the journey reaches the other seasons too)
  const seasonId = globalThis.__chom && globalThis.__chom.season;
  if ((seasonId && seasonId !== 'xuan') || !layout.seller || !layout.customer) {
    console.info(`[people/nguoiban] the flower seller plays only in Xuân's market (season ${seasonId}); not built here`);
    return null;
  }
  const { THREE, U, build } = core;
  // the page's pause (README 11); with ?dev=1 the longest stretch of work between two real pauses goes to the console
  const DEVP = /[?&]dev=1/.test(location.search);
  let resumed = performance.now(), longest = 0;
  let longestAt = '';
  const slice = async () => {
    const t = performance.now();
    if (t - resumed > longest) {
      longest = t - resumed;
      if (DEVP) longestAt = (new Error().stack || '').split('\n').slice(2, 4).map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^ )]*\//, '')).join(' < ');
    }
    if (core.slice) await core.slice();
    if (performance.now() - t > 1) resumed = performance.now();
  };
  // waiting on the network is a pause too (what runs after it is a new stretch)
  const io = async (promise) => {
    longest = Math.max(longest, performance.now() - resumed);
    const v = await promise;
    resumed = performance.now();
    return v;
  };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const PU = KP.PU;
  // the world's textures, sun and shadow map
  PU.tBrush.value = U.tBrush.value;
  PU.tHatch.value = await KP.bakeHatchSliced(U.tStrokes.value.image, 512, slice);
  PU.tShadowW = U.tShadow; PU.uShMatW = U.uShMat; PU.uShOnW = U.uShOn; PU.uShTexelW = U.uShTexel;
  const syncLight = () => {
    PU.uLight.value.copy(U.uKeyDir.value);
    if (U.uFillDir) PU.uFill.value.copy(U.uFillDir.value);
  };
  syncLight();

  // ---- where she sits and where the note changes hands
  const cAt = layout.customer.at, cFace = layout.customer.face;
  const dir = layout.seller.at.clone().sub(cAt).setY(0).normalize();
  const at = cAt.clone().addScaledVector(dir, GAP).setY(layout.seller.at.y);
  const toC = cAt.clone().sub(at).setY(0).normalize();
  const left = V3(0, 1, 0).cross(toC).normalize();
  const exchange = cAt.clone().lerp(at, 0.5).setY(EX_Y).addScaledVector(left, EX_SIDE);
  if (layout.exchange && layout.exchange.distanceTo(exchange) > 0.02) {
    console.warn(`[people/nguoiban] the season's exchange point is ${(layout.exchange.distanceTo(exchange) * 100).toFixed(1)} cm from where her hand meets the customer's: put (${exchange.toArray().map((v) => v.toFixed(4)).join(', ')}) in peopleLayout`);
  }

  // the customer's root, as people/khach places her (at, turned toward her face point)
  const cq = new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.atan2(cFace.x - cAt.x, cFace.z - cAt.z));
  const customerM = new THREE.Matrix4().compose(cAt.clone(), cq, V3(1, 1, 1));
  const track = await io(fetch(here('./track.json')).then((r_) => r_.json()));
  {
    // the track was made for this arrangement; say so if the season's differs
    const inv = customerM.clone().invert();
    const eIn = exchange.clone().applyMatrix4(inv), sIn = at.clone().applyMatrix4(inv);
    const want = track.layout;
    const off = Math.max(eIn.distanceTo(V3(...want.exchangeInCustomer)), sIn.distanceTo(V3(...want.sellerInCustomer)));
    if (off > 0.02) console.warn(`[people/nguoiban] the season's layout differs from track.json by ${(off * 100).toFixed(1)} cm: the hand-off may not meet`);
  }

  const tLoad = performance.now();
  const timing = {};
  // (the file arrives, then it is parsed in one piece: timing.parseMs)
  const asset = await io(S.loadSeller([here('./nguoiban.glb'), here('../model/nguoiban.glb')], { slice: async () => { resumed = performance.now(); await slice(); }, timing }));
  const loadMs = performance.now() - tLoad;
  await slice();
  const s = await S.buildSeller(scene, {
    asset, R, D: { hero: build.hero, Batch: build.Batch, peachBranch: build.peachBranch },
    at, faceTo: cAt.clone(), slice,
    track: { handoff: track.handoff, customer: customerM, noteLocal: track.noteLocal },
  });

  const size = new THREE.Vector2();
  const r = new THREE.Vector3(), up = new THREE.Vector3();
  function setPx(camera) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    size.set(window.innerWidth * dpr, window.innerHeight * dpr);
    PU.uRes.value.copy(size);
    PU.uPxScale.value = size.y / 900;
    if (camera) {
      r.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
      PU.uLightScreen.value.set(PU.uLight.value.dot(r), PU.uLight.value.dot(up)).normalize();
    }
  }
  setPx(null);
  await s.runToSliced(0, null, slice);

  // ---- the customer's note: hers until the hand-off drawing, then hidden (the seller holds her own copy)
  let tNow = 0;
  const people = core.people;
  const _np = new THREE.Vector3();
  longest = Math.max(longest, performance.now() - resumed);
  if (DEVP) console.info(`[people/nguoiban] build: longest stretch between pauses ${longest.toFixed(1)} ms, ending at ${longestAt} (loading the model: ${loadMs.toFixed(0)} ms, of which parsing ${(timing.parseMs ?? 0).toFixed(0)} ms in one piece); phases ${JSON.stringify(s.stats.phases)}`);
  return {
    seller: s,
    holds: s.holds,
    sketch: [],
    // the season keeps a solid round the stall's old seller spot; hers is here
    solids: [{ x: at.x, y: 0, z: at.z, r: 0.35, h: 1.2, name: 'seller (nguoiban)', group: 'seller' }],
    // what reaches out of that solid: the note in her hand at the hand-off
    movers: (t) => {
      if (t !== undefined) s.poseAt(((t % LOOP) + LOOP) % LOOP);
      const n = s.holds.note.visible ? s.holds.note : s.holds.noteFolded.visible ? s.holds.noteFolded : null;
      if (!n) return [];
      const p = n.getWorldPosition(_np);
      // inside her own solid it is already kept clear by it
      if (Math.hypot(p.x - at.x, p.z - at.z) < 0.35 + 0.06) return [];
      return [{ x: p.x, y: p.y, z: p.z, r: 0.06, h: 0.08, name: 'nguoiban-note', group: 'seller' }];
    },
    // for core/qa/faces.mjs: points on her face skin with normals (world)
    faceProbes: () => s.faceProbes(),
    // for the season's peopleLayout: where she sits, where the note changes hands, when
    placement: { at: at.clone(), face: cAt.clone(), exchange: exchange.clone(), handoff: s.handoff },
    update(t, dt, camera) {
      syncLight();
      setPx(camera);
      tNow = ((t % LOOP) + LOOP) % LOOP;
      s.update(tNow, Math.min(Math.max(dt ?? 1 / 60, 0), 0.05), false, camera);
    },
    // after every folder's update (the customer's too): from the hand-off drawing on, the note is the seller's
    lateUpdate() {
      const f = Math.floor((tNow * FPS) / STEP) * STEP;
      const customer = people && people.get('customer');
      if (customer && customer.api && customer.api.hideNote) customer.api.hideNote(f >= s.handoffFrame);
    },
  };
}
