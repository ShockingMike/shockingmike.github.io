// Chớm world: people/khach — the customer (role 'customer') at the Tết flower market, in an áo dài.
// A MakeHuman body (CC0, through MPFB2) with clothes built by code in Blender; painted by khach-paint.js; acted by khach.js
// (key drawings on twos, the tà, the scarf end and loose strands smooth; the bag and strap follow her; the note is handed over).
//
//   export async function buildPeople(scene, R, layout, core) -> { update(t, dt, camera), sketch, movers(t), solids, faceProbes(), api }
//     api.hideNote(on): the seller hides the customer's note from the hand-off on (core.people.get('customer').api)
//     layout.roles must include 'customer'; layout.customer = { at, face }; layout.exchange = where the note is handed over.
//     core: the world's api (core.THREE, core.U, core.paint, core.build).
//
// The same file runs from the test page's pack/ folder, so every sibling is looked for in two places.
const here = (p) => new URL(p, import.meta.url).href;
async function firstOf(...urls) {
  let last;
  for (const u of urls) { try { return await import(u); } catch (e) { last = e; } }
  throw last;
}
const K = await firstOf(here('./khach.js'), here('../khach.js'));
const KP = await firstOf(here('./khach-paint.js'), here('../khach-paint.js'));
const MODEL = [here('./khach.glb'), here('../model/khach.glb')];
const LOOP = 6;

export async function buildPeople(scene, R, layout, core) {
  if (layout.roles && !layout.roles.includes('customer')) return null;
  performance.mark('khach:build-start');
  const { THREE, U, build } = core;
  const PU = KP.PU;
  // the world's textures, sun and shadow map
  const slice = core.slice ? () => core.slice() : null;
  PU.tBrush.value = U.tBrush.value;
  PU.tHatch.value = KP.bakeHatch(U.tStrokes.value.image);
  if (slice) await slice();
  PU.tShadowW = U.tShadow; PU.uShMatW = U.uShMat; PU.uShOnW = U.uShOn; PU.uShTexelW = U.uShTexel;
  const syncLight = () => {
    PU.uLight.value.copy(U.uKeyDir.value);
    if (U.uFillDir) PU.uFill.value.copy(U.uFillDir.value);
  };
  syncLight();

  const asset = await K.loadKhach(MODEL, slice);
  if (slice) await slice();
  const at = layout.customer.at.clone(), faceTo = layout.customer.face.clone();
  const k = await K.buildKhach(scene, {
    slice,
    asset, R, D: { hero: build.hero, Batch: build.Batch, peachBranch: build.peachBranch },
    at, faceTo, exchange: layout.exchange ? layout.exchange.clone() : null,
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
  if (k.runToSliced) await k.runToSliced(0, slice); else k.runTo(0);
  performance.mark('khach:build-end');

  let noteHidden = false;
  return {
    khach: k,
    holds: k.holds,
    exchangeTime: k.exchangeTime,
    // her face points (world) with their outward normals, as she is drawn now (for the core's face check)
    faceProbes: () => k.faceProbes(),
    // for the seller (people/nguoiban, in its lateUpdate): from the hand-off on, the note is hers, not the customer's
    api: {
      hideNote(on) { noteHidden = !!on; if (noteHidden) k.holds.note.visible = false; },
    },
    sketch: [],
    // for the world's pass-through check: the season already keeps a solid round her (name 'customer'), so only what reaches
    // out of it is declared: the note while it is held out
    solids: [],
    movers: (t) => {
      if (t !== undefined) k.poseAt(((t % LOOP) + LOOP) % LOOP);
      const n = k.holds.note;
      if (!n.visible) return [];
      const p = n.getWorldPosition(new THREE.Vector3());
      if (Math.hypot(p.x - at.x, p.z - at.z) < 0.36) return [];
      return [{ x: p.x, y: p.y, z: p.z, r: 0.06, h: 0.08, name: 'khach-note', group: 'customer' }];
    },
    update(t, dt, camera) {
      syncLight();
      setPx(camera);
      const tl = ((t % LOOP) + LOOP) % LOOP;
      k.update(tl, Math.min(Math.max(dt ?? 1 / 60, 0), 0.05), false, camera);
      if (noteHidden) k.holds.note.visible = false;
    },
  };
}
