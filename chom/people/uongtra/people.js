// Chớm world: people/uongtra — the lotus-tea maker (role 'teaMaker') at her low table by the pond, summer dusk.
// A MakeHuman body (CC0, through MPFB2), seated pose and clothes built by code in Blender; painted by tea-paint.js; acted by tea.js
// (drawn on twos); her things (nón lá, stool, baskets, flower, spoon, lạt) by props.js with the world's own paint.
//
//   export async function buildPeople(scene, R, layout, core) -> { update(t, dt, camera), sketch, movers(t), solids, faceProbes(), caps(t) }
//   export function faceProbes() -> [{ person, zone, p, n, at, normal }] her face points (world), outward normals and zones
//     ('features': eyes, nose, mouth, never seen; 'cheek': cheeks and jaw), as she is drawn now
//     layout.roles must include 'teaMaker'; layout.teaMaker = { at, face, place? }; place = { bowl, tube, jar, basket, table } (world)
//     core: the world's api (core.THREE, core.U, core.build).
//
// The same file runs from the test page's pack/ folder, so every sibling is looked for in two places.
const here = (p) => new URL(p, import.meta.url).href;
// in the test page this file sits in pack/, its siblings one folder up; in chom-world they sit beside it
const inPack = /\/pack\/people\.js(\?|$)/.test(import.meta.url);
const T = await import(here(inPack ? '../tea.js' : './tea.js'));
const TP = await import(here(inPack ? '../tea-paint.js' : './tea-paint.js'));
const MODEL = [here(inPack ? '../model/tea.glb' : './tea.glb')];
const LOOP = 6;
let last = null;
// her face as points in world space with outward normals, at the pose she is drawn in now (for the core's face check):
//   [{ p: Vector3, n: Vector3 }, ...]; [] before she is built
export function faceProbes() { return last ? last.faceProbes() : []; }

export async function buildPeople(scene, R, layout, core) {
  if (layout.roles && !layout.roles.includes('teaMaker')) return null;
  performance.mark('uongtra:build-start');
  const { THREE, U, build } = core;
  const PU = TP.PU;
  // the build gives the page back between its steps (core.slice); `steps` keeps how long each ran
  const steps = [];
  let tm = performance.now();
  const slice = core.slice ? () => core.slice() : null;
  const mark = async (label) => { steps.push([label, +(performance.now() - tm).toFixed(1)]); if (slice) await slice(); tm = performance.now(); };
  PU.tBrush.value = U.tBrush.value;
  PU.tHatch.value = TP.bakeHatch(U.tStrokes.value.image);
  await mark('hatch sheet');
  PU.tShadowW = U.tShadow; PU.uShMatW = U.uShMat; PU.uShOnW = U.uShOn; PU.uShTexelW = U.uShTexel;
  // the season's light: the sun and its colour, the lit and shaded tints, the sky
  const syncLight = () => {
    PU.uLight.value.copy(U.uKeyDir.value);
    if (U.uFillDir) PU.uFill.value.copy(U.uFillDir.value);
    // the sky that lights her shade, as it lights the world's (the season may change it)
    if (U.uSkyTop) PU.uSkyTop.value.copy(U.uSkyTop.value);
    if (U.uSkyLow) PU.uSkyLow.value.copy(U.uSkyLow.value);
  };
  PU.uLightCol.value.copy(U.uKLit.value).multiplyScalar(1.05);
  PU.uSunRim.value.copy(U.uKeyCol.value);
  PU.uShadeCol.value.copy(U.uKShade.value).lerp(new THREE.Color(1, 1, 1), 0.62);
  PU.uFillCol.value.copy(U.uAir.value);
  syncLight();

  await mark('light');
  const asset = await T.loadTea(MODEL, slice);
  steps.push(['model parse', asset.parseMs]);
  await mark('model loaded');
  const L = layout.teaMaker;
  const at = L.at.clone(), faceTo = L.face.clone();
  // the warm light nearest to her (the storm lantern over her tray): shared with the world, so it follows any change
  {
    let best = -1, bd = 3;
    U.uBulb.value.forEach((b, i) => {
      const c = U.uBulbCol.value[i];
      const d = Math.hypot(b.x - at.x, b.y - 0.8, b.z - at.z);
      if (b.y > -50 && c.r + c.g + c.b > 0.01 && d < bd) { bd = d; best = i; }
    });
    if (best >= 0) { PU.uLamp.value = U.uBulb.value[best]; PU.uLampCol.value = U.uBulbCol.value[best]; }
  }
  const t = await T.buildTea(scene, { asset, R, D: { Batch: build.Batch, hero: build.hero, withC: build.withC, C: build.C }, at, faceTo, place: { bowl: L.bowl, tube: L.tube, jar: L.basketSpot, basket: L.freshBasket, table: L.table }, slice });

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
  await mark('built');
  t.runTo(0);
  await mark('first drawing');
  t.prof.pack = steps;
  performance.mark('uongtra:build-end');
  if (typeof window !== 'undefined') window.__tea = t;
  last = t;

  return {
    tea: t,
    holds: t.holds,
    sketch: [],
    // the season keeps a solid round her and her table; her own baskets stand beside them
    solids: t.solidList(),
    movers: () => [],
    // her face (zones 'features' / 'cheek') and her capsules at time t, for the core's face and near-lens checks
    faceProbes: () => t.faceProbes(),
    caps: (time) => {
      if (time !== undefined) t.poseAt(((time % LOOP) + LOOP) % LOOP);
      return t.caps();
    },
    update(time, dt, camera) {
      syncLight();
      setPx(camera);
      const tl = ((time % LOOP) + LOOP) % LOOP;
      t.update(tl, Math.min(Math.max(dt ?? 1 / 60, 0), 0.05), camera);
    },
  };
}
