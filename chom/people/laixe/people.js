// Chớm world: people/laixe — the motorbike rider (role 'rider') of Xuân's flower market: a Hanoi man in his fifties on an
// early-2000s step-through motorbike (no badge), an old olive jacket, an old half-helmet with a dark flip-down shield, a cloth
// mask, a big flowering peach branch tied behind the seat. He rides through the market's street on the season's motorbike
// path (6 s loop, on twos): a glance at the stalls, a shrug against the cold, the left toe on the gear pedal, a throttle roll.
// A MakeHuman body (CC0, through MPFB2), clothes and motorbike built by code in Blender; painted by khach-paint.js; acted by
// laixe.js. (This file is people/laixe/people.js in chom-world.)
//
//   export async function buildPeople(scene, R, layout, core) -> { update(t, dt, camera), sketch, solids, faceProbes() }
//     layout.roles must include 'rider'; layout.bike = the season's motorbike group (the world moves it: +x the way it runs,
//     y = 0 the road; userData.dist = metres ridden). His motorbike and branch take its place (the group's own children are
//     hidden); the season's 'bike' mover (r 0.55, h 2.7) already keeps the pass-through check round him.
//     core: the world's api (core.THREE, core.U, core.build, core.slice).
const here = (p) => new URL(p, import.meta.url).href;
const L = await import(here('./laixe.js'));
const KP = await import(here('./khach-paint.js'));
const LOOP = 6;

export async function buildPeople(scene, R, layout, core) {
  if (layout.roles && !layout.roles.includes('rider')) return null;
  // he belongs to Xuân's market (a ?people= passed through the journey reaches the other seasons too)
  const seasonId = globalThis.__chom && globalThis.__chom.season;
  if ((seasonId && seasonId !== 'xuan') || !layout.bike) {
    console.info(`[people/laixe] the peach-branch rider plays only on Xuân's motorbike (season ${seasonId}); not built here`);
    return null;
  }
  const { THREE, U, build } = core;
  // the page's pause (README 11); with ?dev=1 the longest stretch of work between two real pauses goes to the console
  const DEVP = /[?&]dev=1/.test(location.search);
  let resumed = performance.now(), longest = 0;
  const slice = async () => {
    const t = performance.now();
    longest = Math.max(longest, t - resumed);
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

  const timing = {};
  const asset = await io(L.loadRider([here('./laixe.glb')], { slice: async () => { resumed = performance.now(); await slice(); }, timing }));
  await slice();
  const bike = layout.bike;
  const r = await L.buildRider(scene, {
    asset, R, D: { hero: build.hero, Batch: build.Batch, peachBranch: build.peachBranch },
    parent: bike, slice,
  });

  const size = new THREE.Vector2();
  const rv = new THREE.Vector3(), up = new THREE.Vector3();
  function setPx(camera) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    size.set(window.innerWidth * dpr, window.innerHeight * dpr);
    PU.uRes.value.copy(size);
    PU.uPxScale.value = size.y / 900;
    if (camera) {
      rv.setFromMatrixColumn(camera.matrixWorld, 0); up.setFromMatrixColumn(camera.matrixWorld, 1);
      PU.uLightScreen.value.set(PU.uLight.value.dot(rv), PU.uLight.value.dot(up)).normalize();
    }
  }
  setPx(null);
  await r.runToSliced(0, bike.userData.dist ?? 0, slice);

  // ---- his shape for the near-lens check (README 6c/11): three capsules — the motorbike, him on it, the branch
  await slice();
  const box = new THREE.Box3(), _sz = new THREE.Vector3(), _c = new THREE.Vector3();
  const local = [];   // [[a, b, radius], ...] in the motorbike's frame
  {
    const M = new THREE.Matrix4().copy(bike.matrixWorld).invert();
    const shape = (obj, along) => {
      box.setFromObject(obj);
      if (box.isEmpty()) return;
      box.applyMatrix4(M);
      box.getSize(_sz); box.getCenter(_c);
      // the capsule holds the whole box (its radius is half the diagonal across the two other sides), so the check never
      // measures to anything nearer than his real bounds
      if (along === 'z') {
        const rad = Math.hypot(_sz.x, _sz.y) / 2;
        local.push([new THREE.Vector3(_c.x, _c.y, Math.min(_c.z, box.min.z + rad)), new THREE.Vector3(_c.x, _c.y, Math.max(_c.z, box.max.z - rad)), rad]);
      } else {
        const rad = Math.hypot(_sz.x, _sz.z) / 2;
        local.push([new THREE.Vector3(_c.x, Math.min(_c.y, box.min.y + rad), _c.z), new THREE.Vector3(_c.x, Math.max(_c.y, box.max.y - rad), _c.z), rad]);
      }
    };
    // (21/9, core/qa/perf-people.mjs: this step was the one run over a frame, 16.4 ms. Two things in it ran in one piece:
    // the outfit is ONE skinned mesh, and its bounds are every vertex put through the bones; and the branch's geometry,
    // still being made in the core's queue, was finished on the spot when its bounds were read. The same two things are
    // done first, a piece per slice: the bounds come out the same — the same vertices through the same pose, nothing
    // moves him during the build — and setFromObject then only reads them.)
    {
      const o = r.outfit, pos = o.geometry.getAttribute('position'), v = new THREE.Vector3();
      o.updateWorldMatrix(false, false);
      const bb = o.boundingBox || (o.boundingBox = new THREE.Box3());
      bb.makeEmpty();
      for (let i = 0; i < pos.count; i++) { o.getVertexPosition(i, v); bb.expandByPoint(v); if ((i & 2047) === 2047) await slice(); }
    }
    if (build.WORK) await build.WORK.idle();
    await slice();
    shape(r.outfit, 'z');       // him and the motorbike, along the way it runs
    await slice();
    shape(r.holds.tree, 'y');   // the peach branch, standing
    await slice();
  }
  // where the motorbike is at time t: the season's own path if it offers one (layout.bikeAt(t) -> { x, y, z, visible }),
  // else where it stands now (then the check only sees this one spot: the season must keep the lane far enough by itself)
  const _now = new THREE.Vector3(), _want = new THREE.Vector3(), _d = new THREE.Vector3();
  const capsAt = (t) => {
    bike.updateMatrixWorld(true);
    _now.setFromMatrixPosition(bike.matrixWorld);
    _want.copy(_now);
    let visible = bike.visible;
    if (t !== undefined && typeof layout.bikeAt === 'function') {
      const b = layout.bikeAt(t) || {};
      _want.set(b.x ?? _now.x, b.y ?? _now.y, b.z ?? _now.z);
      visible = b.visible !== false;
    }
    if (!visible) return [];
    _d.copy(_want).sub(_now);
    return local.map(([a, b, rad]) => [a.clone().applyMatrix4(bike.matrixWorld).add(_d), b.clone().applyMatrix4(bike.matrixWorld).add(_d), rad]);
  };
  if (DEVP && typeof layout.bikeAt !== 'function') {
    console.info('[people/laixe] the season gives no layout.bikeAt(t), so the near-lens check only sees the motorbike where it stands: the lane itself must keep 1.2 m from every camera step.');
  }

  longest = Math.max(longest, performance.now() - resumed);
  if (DEVP) console.info(`[people/laixe] build: longest stretch between pauses ${longest.toFixed(1)} ms (the model parsed in one piece: ${(timing.parseMs ?? 0).toFixed(0)} ms)`);
  return {
    rider: r,
    holds: r.holds,
    sketch: [],
    solids: [],
    // his shape for the near-lens check: capsules that follow the motorbike down its own path (layout.bikeAt)
    caps: (t) => capsAt(t),
    // (the pass-through check works with round columns: the season's own 'bike' and 'peach tree' movers already draw them
    // round him, and they follow the same path, so this folder adds none — a second set only doubles them up)
    // for core/qa/faces.mjs: points on his face (world) with normals, zone 'features' (under the shield and the mask) or 'cheek'
    faceProbes: () => r.faceProbes(),
    update(t, dt, camera) {
      if (!bike.visible) return;
      syncLight();
      setPx(camera);
      const tl = ((t % LOOP) + LOOP) % LOOP;
      r.update(tl, Math.min(Math.max(dt ?? 1 / 60, 0), 0.05), camera, bike.userData.dist ?? 0);
    },
  };
}
