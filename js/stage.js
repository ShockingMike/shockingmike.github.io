/* stage.js — a record crate. Six sleeves stand in a wooden crate, one behind the other, facing you and leaning back a
   little. Scrolling flips through them the way a hand does: the front record tips forward and drops to show the next.
   Click the record in view and it is pulled out of the crate, lifted, and turned to the Stripe Press pose (left half,
   the disc half out) while the page takes the sleeve's colours. Past the last record lies the folded price flyer.

   Every movement runs on real time (damped springs, eased timelines) and nothing is built while moving: textures,
   materials and shaders are all prepared before the first frame. Motion is never skipped or shortened. */

import * as THREE from 'three';
import * as K from './covers.js';
import * as A from './album.js';
import { buildRoom } from './room.js';

const DEG = Math.PI / 180;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smoother = (x) => { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const easeOut = (x) => { x = clamp01(x); return 1 - Math.pow(1 - x, 3); };
const easeInOut = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

const W = 31.4;        // 12-inch sleeve, cm
const T = 1.15;        // board + disc, a touch thick so the edges read
const GAP = 2.9;       // between sleeves in the crate
const LEAN = -6 * DEG; // standing: leaning back a little
const FLIP = 66 * DEG; // flipped through: lying forward against the front of the crate

/* Building the shop blocks the browser for seconds, so the build hands control back at every natural break
   (`onStep`): the wait screen gets to move its number and draw a frame before the next lump of work starts. */
export async function createStage({ canvas, records, images, credits, flyerPrint, onFrame, onState, onCue, onFlyer, onStep = async () => {} }) {
  let renderer;
  try {
    // ?probe=1 keeps the drawn frame readable so the picture-checking tools can look at it; the page itself
    // never asks for that, because keeping the buffer costs memory and speed.
    const probe = new URLSearchParams(location.search).has('probe');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: probe });
  } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x14110f, 1);

  const scene = new THREE.Scene();
  // the shop fades with depth; with a record in hand the room fades out and the screen becomes one flat colour
  const FOG = { room: new THREE.Color(0x17120e), near: 60, far: 300 };
  scene.fog = new THREE.Fog(FOG.room.clone(), FOG.near, FOG.far);
  const GROUND = new THREE.Color(0x14110f);   // what the renderer clears to: the shop, or the record's own colour
  renderer.setClearColor(GROUND, 1);
  const camera = new THREE.PerspectiveCamera(26, 1, 1, 1600);
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  /* ---------- studio light: one key with soft shadows, a cool rim, a whisper of fill ---------- */
  const key = new THREE.DirectionalLight(0xffe9cf, 1.9);
  key.position.set(-70, 80, 90);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 320 });
  key.shadow.radius = 9;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.05;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xd8e2ff, 1.1);
  rim.position.set(50, 30, -50);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xc9c2b6, 0x241f1c, 0.72));
  // a soft fill from where you stand, so the shop reads on a phone too
  const fill = new THREE.DirectionalLight(0xffeedd, 0.45);
  fill.position.set(10, 30, 120);
  scene.add(fill);

  /* ---------- softbox environment: what the foil, the vinyl and the wrap reflect ---------- */
  (function studioEnv() {
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x050505);
    const panel = (w, h, pos, k, tint = [1, 0.97, 0.93]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(...tint).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.copy(pos); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(10, 7, new THREE.Vector3(-6, 8, 8), 5.0);
    panel(1.6, 12, new THREE.Vector3(10, 3, -2), 3.4, [0.85, 0.9, 1]);
    panel(16, 1.4, new THREE.Vector3(-1, 6, -10), 1.6);
    panel(0.9, 8, new THREE.Vector3(3.5, 3.5, 9.5), 3.0);
    panel(7, 0.8, new THREE.Vector3(1.5, 6.5, 8.0), 2.2);
    panel(0.7, 9, new THREE.Vector3(-4.5, 5, 7.5), 22);   // a narrow window strip: the streak the film reflects
    panel(9, 0.6, new THREE.Vector3(2, 7.5, 6.5), 14);
    panel(0.6, 7, new THREE.Vector3(5.5, 3, 8.5), 18);
    panel(14, 14, new THREE.Vector3(0, 12, 3), 1.2);
    panel(4, 2.6, new THREE.Vector3(1.5, -2.5, 9.5), 1.1); // a softbox by the camera: the glare on the wrap and the foil, seen head-on
    panel(6, 10, new THREE.Vector3(9, 4, 6), 1.6, [1, 0.95, 0.9]);
    panel(20, 20, new THREE.Vector3(0, -10, 0), 0.1);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.04).texture;
    pm.dispose();
  })();

  /* ---------- textures & materials, all made now ---------- */
  const textures = [];
  const tex = (c, srgb = true, repeat) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = maxAniso;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    textures.push(t);
    return t;
  };
  const fibre = tex(K.paperBump(512), false, [3, 3]);
  const paper = (map, o = {}) => new THREE.MeshStandardMaterial({
    map, roughness: 0.86, metalness: 0, bumpMap: fibre, bumpScale: 0.45, envMapIntensity: 0.3, transparent: true, fog: false, ...o
  });
  /* Factory shrink-wrap: a clear skin pulled over the board. It is almost flat across the middle and gathers into
     creases at the corners and the edges, with one welded seam down a side. The creases live in a normal map, so
     the streak of light slides across them as the sleeve turns; nothing is recomputed while it moves. */
  const wrapNrm = tex(A.wrapNormal(1024, 17), false);
  const wrapGls = tex(A.wrapGloss(1024, 17), false);   // the same film, with its glints, for the varnish only
  const wrapShn = tex(A.wrapShine(1024, 17), false);  // where the film is pulled tight and throws the room back
  const wrapHz = tex(A.wrapHaze(1024, 17), false);
  const sealWrap = new THREE.MeshPhysicalMaterial({
    color: 0xf8fbff, roughness: 0.085, metalness: 0, fog: false, toneMapped: false,
    normalMap: wrapNrm, normalScale: new THREE.Vector2(3.6, 3.6),
    alphaMap: wrapHz, opacity: 0.66, transparent: true, depthWrite: false,
    clearcoat: 1, clearcoatRoughness: 0.05, clearcoatNormalMap: wrapGls, clearcoatNormalScale: new THREE.Vector2(2.8, 2.8),
    ior: 1.55, specularIntensity: 3, specularIntensityMap: wrapShn, envMapIntensity: 16,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  });
  const stickerMats = {};   // one per sealed record: the hype sticker, stuck on the film
  const grooveDir = tex(K.grooveDirection(512, 0.36), false);
  // a plane behind the record, invisible except where the record's shadow falls on it: the drop shadow on the colour
  const dropMat = new THREE.ShadowMaterial({ opacity: 0, fog: false, depthWrite: false });
  const drop = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), dropMat);
  drop.receiveShadow = true;
  drop.renderOrder = -1;
  scene.add(drop);
  function discMats(o) {
    const S = 1024;
    const face = new THREE.MeshPhysicalMaterial({
      map: tex(A.houseLabel(K.discMap(S, { ...o, name: '', cat: '', sub: '' }), o)), roughnessMap: tex(K.grooveRough(S, o.labelR), false), roughness: 1, metalness: 0,
      clearcoat: 0.5, clearcoatRoughness: 0.28, envMapIntensity: 1.4, anisotropy: 0.9, anisotropyMap: grooveDir, transparent: true, fog: false
    });
    const edge = new THREE.MeshPhysicalMaterial({ color: o.vinyl, roughness: 0.25, metalness: 0, envMapIntensity: 1.2, clearcoat: 0.6, transparent: true, fog: false });
    return [edge, face, face];
  }

  /** The film's shape: wider than the board, with the rim pushed out where the slack gathers. Built once. */
  function filmGeometry(w, t) {
    const g = new THREE.BoxGeometry(w + 0.9, t + 0.62, w + 0.9, 20, 3, 20);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      // how close this point is to an edge of the board, 0 in the middle of a face, 1 at the rim
      const ex = Math.abs(v.x) / ((w + 0.9) / 2), ez = Math.abs(v.z) / ((w + 0.9) / 2);
      const rim = Math.pow(Math.max(ex, ez), 3);
      const bulge = 0.38 * rim;
      v.x += Math.sign(v.x) * bulge * ex;
      v.z += Math.sign(v.z) * bulge * ez;
      v.y += Math.sign(v.y) * 0.06 * (1 - rim);   // the middle sits a touch off the board
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }

  /* ---------- a sleeve: root (bottom edge, the hinge in the crate) > holder (centre) > body ---------- */
  function buildSleeve(rec) {
    const c = rec.sleeve;
    const front = A.sleeveFront(1024, rec, c, images[rec.id]);
    const coverMat = new THREE.MeshPhysicalMaterial({
      map: tex(front.color),
      roughnessMap: tex(front.mask, false), roughness: 1,
      metalnessMap: tex(front.mask, false), metalness: 1,
      iridescence: 1, iridescenceMap: tex(front.mask, false), iridescenceIOR: 1.6, iridescenceThicknessRange: [140, 520],
      bumpMap: tex(front.bump, false), bumpScale: 0.3,
      envMapIntensity: 1.3, transparent: true, fog: false
    });
    const edgeMat = paper(tex(A.sleeveEdge(512, 64, c.paper, 40 + rec.cat.length)));
    const back = A.sleeveBack(1024, rec, c, credits[rec.id]);
    const mats = [
      edgeMat, edgeMat,
      coverMat,                                             // +y: cover
      paper(tex(back)),                                     // -y: back
      paper(tex(A.sleeveSpine(2048, 64, rec, c))),          // +z: spine
      edgeMat
    ];
    const box = new THREE.Mesh(new THREE.BoxGeometry(W, T, W), mats);
    box.castShadow = true; box.receiveShadow = true;
    const body = new THREE.Group();
    body.add(box);
    let disc = null;
    if (!rec.sealed) {
      disc = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.478, W * 0.478, 0.18, 128, 1), discMats({
        vinyl: rec.disc.vinyl, ringLight: 'rgba(255,255,255,A)', labelR: 0.34, label: rec.disc.label, labelInk: rec.disc.labelInk,
        name: rec.name, cat: `${rec.cat} · 33⅓`, sub: 'Shocking Mike Records'
      }));
      disc.rotation.y = Math.PI / 2;
      disc.castShadow = true;
      body.add(disc);
    } else {
      // one copy of the film per sealed record (they share their maps), so each can fade on its own
      const film = sealWrap.clone();
      // a pale board needs a cloudier film, or the plastic vanishes against it
      const boardLum = new THREE.Color(c.paper).getHSL({}).l;
      film.opacity = sealWrap.opacity * (boardLum > 0.55 ? 0.8 : 1.2);
      film.userData.baseOpacity = film.opacity;
      const wrap = new THREE.Mesh(filmGeometry(W, T), film);
      wrap.renderOrder = 3;
      body.add(wrap);
      // the sticker sits on the film, a whisker in front of it, where a shop would stick it
      const st = new THREE.MeshBasicMaterial({ map: tex(A.wrapSticker(512, rec)), transparent: true, depthWrite: false, fog: false, toneMapped: false });
      stickerMats[rec.id] = st;
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.2, W * 0.2), st);
      tag.position.set(W * 0.3, (T + 0.52) / 2 + 0.02, -W * 0.3);
      tag.rotation.x = -Math.PI / 2;
      tag.renderOrder = 4;
      body.add(tag);
    }
    // standing: cover to +z, top up, spine down, the disc's open side to the right
    body.rotation.x = Math.PI / 2;
    const holder = new THREE.Group();
    holder.position.y = W / 2;
    holder.add(body);
    const root = new THREE.Group();
    root.add(holder);
    const tint = new THREE.Color(rec.theme.bg);
    return { root, holder, body, box, disc, pick: [box], cover: front.color, tint };
  }

  const items = [];
  for (const rec of records) {
    const it = { rec, id: rec.id, index: items.length, fade: 1, mats: [], flip: 0, flipV: 0, flipTarget: 0, ...buildSleeve(rec) };
    it.root.traverse((m) => {
      if (!m.isMesh) return;
      m.userData.item = it;
      for (const mat of [].concat(m.material)) if (!it.mats.includes(mat)) it.mats.push(mat);
    });
    scene.add(it.root);
    items.push(it);
    await onStep('sleeve');          // one sleeve printed: let the wait screen catch up
  }
  const pickables = items.flatMap((it) => it.pick);
  const LAST = items.length - 1;

  /* ---------- the crate: a low wooden box, a soft contact shadow under it ---------- */
  const crate = new THREE.Group();
  const crateMats = [];
  let shadowMat = null;
  let roomGroup = null, roomMats = [], roomLights = [];
  const sceneCasters = [];   // everything in the shop that throws a shadow, so it can stop while the ground is flat
  {
    const woodTex = tex(A.wood(1024, 512, 9), true, [1, 1]);
    const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.78, metalness: 0, envMapIntensity: 0.25, transparent: true });
    const woodMat2 = new THREE.MeshStandardMaterial({ map: tex(A.wood(1024, 256, 13)), roughness: 0.78, metalness: 0, envMapIntensity: 0.25, transparent: true });
    const room = buildRoom({ covers: items.map((it) => it.cover), tex, portrait: window.innerWidth / window.innerHeight < 0.85 });
    scene.add(room.group);
    roomGroup = room.group;
    roomMats = room.mats;
    roomLights = room.lights;
    for (const l of roomLights) l.userData.base = l.intensity;
    room.group.traverse((m) => { if (m.isMesh && m.castShadow) sceneCasters.push(m); });
    crateMats.push(woodMat, woodMat2);
    const inner = W + 3, wall = 1.4, hFront = 13, hSide = 11;
    const zFront = 31.5, zBack = -(LAST + 1) * GAP - 1.5 - 15.5 - 5, depth = zFront - zBack;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(inner + 2 * wall, wall, depth), woodMat);
    floor.position.set(0, -wall / 2, (zFront + zBack) / 2);
    const front = new THREE.Mesh(new THREE.BoxGeometry(inner + 2 * wall, hFront, wall), woodMat2);
    front.position.set(0, hFront / 2, zFront - wall / 2);
    const back = new THREE.Mesh(new THREE.BoxGeometry(inner + 2 * wall, hFront, wall), woodMat2);
    back.position.set(0, hFront / 2, zBack + wall / 2);
    const sideGeo = new THREE.BoxGeometry(wall, hSide, depth);
    const left = new THREE.Mesh(sideGeo, woodMat2); left.position.set(-inner / 2 - wall / 2, hSide / 2, (zFront + zBack) / 2);
    const right = new THREE.Mesh(sideGeo, woodMat2); right.position.set(inner / 2 + wall / 2, hSide / 2, (zFront + zBack) / 2);
    for (const m of [floor, front, back, left, right]) { m.castShadow = true; m.receiveShadow = true; crate.add(m); }
    shadowMat = new THREE.MeshBasicMaterial({ map: tex(A.contactShadow(512)), transparent: true, depthWrite: false, opacity: 0.55 });
    const sh = new THREE.Mesh(new THREE.PlaneGeometry((inner + 2 * wall) * 1.6, depth * 1.3), shadowMat);
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(0, -wall - 0.05, (zFront + zBack) / 2);
    crate.add(sh);
    scene.add(crate);
    crate.traverse((m) => { if (m.isMesh && m.castShadow) sceneCasters.push(m); });
  }

  /* ---------- the price flyer: five printed panels on alternating hinges, lying folded at the back ---------- */
  const FN = 5, FW = 30, FSPAN = 2;
  const FOLDED = 172 * DEG;
  const flyer = { root: new THREE.Group(), pivots: [], panels: [], mats: [], fade: 1, p: 0, s: 0, L: 8.25, y: 0, maps: {} };
  {
    // a panel of paper is never dead flat: a slight bow across its height, alternating with the folds
    const curled = (sign) => {
      const g = new THREE.PlaneGeometry(1, 1, 1, 10);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, sign * 0.12 * Math.sin(Math.PI * (pos.getY(i) + 0.5)));
      g.computeVertexNormals();
      return g;
    };
    const geos = [curled(1), curled(-1)];
    const backMat = paper(tex(K.flyerBack(512, 256, 150)), { side: THREE.BackSide });
    const texH = Math.round(1024 * (window.innerWidth / window.innerHeight < 0.85 ? 15.5 : 11) / 40);
    for (const lang of Object.keys(flyerPrint)) {
      flyer.maps[lang] = [];
      for (let k = 0; k < FN; k++) flyer.maps[lang].push(tex(A.flyerPanelPrinted(1024, texH, k, FN, flyerPrint[lang])));
    }
    const first = Object.keys(flyerPrint)[0];
    let parent = flyer.root;
    for (let k = 0; k < FN; k++) {
      const pivot = new THREE.Group();
      parent.add(pivot);
      const front = paper(flyer.maps[first][k], { roughness: 0.9 });
      const geo = geos[k % 2];
      const face = new THREE.Mesh(geo, front);
      const back = new THREE.Mesh(geo, backMat);
      face.castShadow = true; face.receiveShadow = true;
      face.userData.flyer = true; back.userData.flyer = true;
      pivot.add(face, back);
      flyer.pivots.push(pivot); flyer.panels.push(face, back);
      flyer.mats.push(front);
      parent = pivot;
    }
    flyer.mats.push(backMat);
    scene.add(flyer.root);
  }
  const flyerPick = flyer.panels.filter((m) => m.userData.flyer);
  function setFlyerLang(lang) {
    const maps = flyer.maps[lang];
    if (!maps) return;
    for (let k = 0; k < FN; k++) { flyer.mats[k].map = maps[k]; flyer.mats[k].needsUpdate = false; }
    dirty = true;
  }
  function flyerSize() {
    flyer.L = FW * (L.portrait ? 15.5 : 11) / 40;
    for (let k = 0; k < FN; k++) {
      flyer.pivots[k].position.set(0, k === 0 ? 0 : -flyer.L, 0);
      for (const m of flyer.pivots[k].children) if (m.isMesh) { m.scale.set(FW, flyer.L, 1); m.position.set(0, -flyer.L / 2, 0); }
    }
  }
  /** s = 0 folded .. 1 open; each fold starts a beat after the one before it, like a sheet shaken open */
  function setFold(s) {
    flyer.s = s;
    const lag = 0.09;
    for (let k = 1; k < FN; k++) {
      const lk = clamp01((s - lag * (k - 1)) / (1 - lag * (FN - 2)));
      flyer.pivots[k].rotation.x = (k % 2 ? 1 : -1) * FOLDED * (1 - smoother(lk));
    }
  }

  /* ---------- layout ---------- */
  const L = { portrait: false, D: 100, elev: 16 * DEG, tiltUp: 3 * DEG, vw: 1, vh: 1 };
  function layout() {
    const vw = window.innerWidth, vh = window.innerHeight;
    L.vw = vw; L.vh = vh;
    L.portrait = vw / vh < 0.85;
    camera.aspect = vw / vh;
    camera.fov = L.portrait ? 40 : 36;
    camera.updateProjectionMatrix();
    const tanH = Math.tan(camera.fov * DEG / 2);
    L.elev = (L.portrait ? 14 : 16) * DEG;
    L.tiltUp = (L.portrait ? 4 : 3) * DEG;
    // the sleeve in view: about half the height on a computer, sitting a little below the middle; on a phone, as wide as the screen allows
    const coverH = W * Math.cos(L.elev - LEAN);
    const byH = coverH / (0.52 * 2 * tanH);
    const byW = W / (0.9 * 2 * tanH * camera.aspect);
    L.D = Math.max(byH, byW);
    flyer.y = 0.6;
    flyerSize();
    renderer.setSize(vw, vh, false);
    computeFlyerOpen();
    dirty = true;
  }

  /* ---------- state ---------- */
  let focus = 0, focusV = 0, focusTarget = 0, hover = -1;
  let mode = 'stack'; // stack | opening | open | closing
  let active = null, openT = 0, openDir = 0;
  // in the open view: os = which record is in hand (continuous; scrolling moves to the next), tilt = the cursor's pull
  let os = 0, osV = 0, osTarget = 0, afterClose = null;
  const TILT = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, yaw: 4 * DEG, pitch: 3.5 * DEG };
  let dirty = true;
  const OPEN = {};
  const camTarget = new THREE.Vector3();
  const cues = new Set();
  const FMAX = LAST + FSPAN;

  const zOf = (i) => -i * GAP;
  /** the crate slides toward you as you flip, so the record in view always stands at z = 0 and the room holds still */
  const slide = () => Math.min(focus, LAST) * GAP;
  /** where sleeve i rests for the current focus: standing, or flipped forward */
  function stackPose(it) {
    const u = clamp01(focus - it.index);
    const a = LEAN + (FLIP - LEAN) * smoother(u);
    it.root.position.set(0, 0, zOf(it.index) + slide() + 1.0 * smoother(u));
    it.root.quaternion.setFromAxisAngle(AX, a);
    it.holder.position.y = W / 2;
    it.holder.quaternion.identity();
    it.body.quaternion.copy(qa(AX, Math.PI / 2));
  }

  function placeCamera() {
    let tz = 0, ty = W * 0.46, tx = 0, D = L.D, tilt = L.tiltUp;
    const fp = clamp01((focus - LAST) / FSPAN);
    if (fp > 0) {
      // past the last record: up above the crate and back a little, so the sheet can rise and hang in front of it
      const s = smoother(fp / 0.6);
      tz += zOf(1.6) * s;
      ty += (W * 1.0 - ty) * s;
      D *= 1 + 0.4 * s;
      tilt *= 1 - s;
    }
    camTarget.set(tx, ty, tz);
    camera.position.set(tx, ty + Math.sin(L.elev) * D, tz + Math.cos(L.elev) * D);
    camera.lookAt(camTarget);
    camera.rotateX(tilt); // looking a little above the record: the shop shows behind it
    camera.updateMatrixWorld();
  }

  const _q = new THREE.Quaternion(), _v = new THREE.Vector3();
  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
  const qa = (axis, a) => new THREE.Quaternion().setFromAxisAngle(axis, a);
  const tilt = (yaw, pitch, roll) => qa(AZ, roll).multiply(qa(AY, yaw)).multiply(qa(AX, pitch));

  /** a pose held up to the camera: screen centre (px from the middle), size of the face in px, tilt */
  function camPose(xPx, yPx, facePx, faceW, qLocal) {
    const tanH = Math.tan(camera.fov * DEG / 2);
    const d = faceW * L.vh / (2 * tanH * facePx);
    const u = faceW / facePx;
    return { pos: camera.localToWorld(new THREE.Vector3(xPx * u, yPx * u, -d)), quat: camera.quaternion.clone().multiply(qLocal) };
  }

  function computeOpen(it) {
    placeCamera();
    const { vw, vh, portrait } = L;
    stackPose(it);
    const o = { p0: it.root.position.clone(), q0: it.root.quaternion.clone() };
    const facePx = portrait ? Math.min(vw * 0.62, vh * 0.3) : Math.min(vh * 0.5, vw * 0.3);
    const q = tilt(24 * DEG, -9 * DEG, -5 * DEG);
    const shift = it.rec.sealed ? 0.05 : 0;
    const pose = portrait ? camPose(-vw * (0.09 - shift), vh * 0.25, facePx, W, q) : camPose(-vw * (0.30 - shift), vh * 0.005, facePx, W, q);
    // the pose is for the sleeve's centre; the root sits at its bottom edge
    o.q1 = pose.quat;
    o.p1 = pose.pos.clone().sub(new THREE.Vector3(0, W / 2, 0).applyQuaternion(pose.quat));
    o.up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    o.unit = W / facePx; // world units per screen pixel at the record
    // up out of the crate first, then forward into the hand: the path never dips toward the counter
    const up = Math.max(o.p1.y - o.p0.y, 0) + 16;
    o.c1 = o.p0.clone().add(new THREE.Vector3(0, up, 10));
    o.c2 = o.p1.clone().add(new THREE.Vector3(0, up * 0.45, 8));
    OPEN[it.id] = o;
  }

  function bezier(a, b, c, d, t, out) {
    const u = 1 - t;
    return out.set(0, 0, 0).addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t);
  }

  /** how far the disc slides out of the sleeve: right out on a computer (the whole label shows),
      just a crescent of grooves on a phone, where there is no room for it */
  const discOut = () => (L.portrait ? 0.30 : 0.66) * W;

  function applyOpen(it, t) {
    const o = OPEN[it.id];
    bezier(o.p0, o.c1, o.c2, o.p1, smoother(t / 0.94), it.root.position);
    it.root.quaternion.copy(o.q0).slerp(o.q1, smoother((t - 0.1) / 0.8));
    it.holder.position.y = W / 2;
    applyTilt(it, smoother((t - 0.5) / 0.5));
    it.body.quaternion.copy(qa(AX, Math.PI / 2 + Math.PI * easeInOut(it.flip)));
    if (it.disc) it.disc.position.x = discOut() * easeOut((t - 0.62) / 0.38);
  }
  /** the sleeve turns a few degrees toward the cursor, about its own centre; foil and shadow follow */
  function applyTilt(it, k) {
    it.holder.quaternion.copy(qa(AY, TILT.x * k)).multiply(qa(AX, TILT.y * k));
  }
  /** in the open view, record i sits d = i - os screens away: above when passed, below when still to come */
  function applyOpenScroll(it) {
    if (!OPEN[it.id]) computeOpen(it);
    const o = OPEN[it.id];
    const d = it.index - os;
    it.root.position.copy(o.p1).addScaledVector(o.up, -d * L.vh * 1.15 * o.unit);
    it.root.quaternion.copy(o.q1);
    it.holder.position.y = W / 2;
    applyTilt(it, 1);
    it.body.quaternion.copy(qa(AX, Math.PI / 2 + Math.PI * easeInOut(it.flip)));
    if (it.disc) it.disc.position.x = discOut() * easeOut(1 - Math.abs(d) * 1.6);
  }

  /* ---------- the flyer's poses ---------- */
  const FO = { p0: new THREE.Vector3(), q0: new THREE.Quaternion(), p1: new THREE.Vector3(), q1: new THREE.Quaternion(), htot: 55, facePx: 400 };
  function computeFlyerOpen() {
    const keep = focus;
    focus = FMAX;
    placeCamera();
    const { vw, vh, portrait } = L;
    const htot = flyer.L * FN;
    const facePx = portrait ? Math.min(vw * 0.92, vh * 0.78 * FW / htot) : Math.min(vw * 0.42, vh * 0.8 * FW / htot);
    const hPx = facePx * htot / FW;
    const pose = camPose(0, hPx / 2 - (portrait ? 6 : 10), facePx, FW, new THREE.Quaternion());
    FO.p1.copy(pose.pos); FO.q1.copy(pose.quat); FO.htot = htot; FO.facePx = facePx;
    // folded, lying flat on the crate floor behind the last sleeve, its head toward you
    FO.q0.setFromAxisAngle(AX, -Math.PI / 2);
    FO.p0.set(0, flyer.y, zOf(LAST + 1) - 1.5 - flyer.L);
    focus = keep;
    placeCamera();
  }
  function applyFlyer(p) {
    flyer.p = p;
    const move = smoother((p - 0.42) / 0.58);
    flyer.root.position.copy(FO.p0).lerp(FO.p1, move);
    flyer.root.position.z += slide() * (1 - move); // folded, it rides in the crate
    flyer.root.position.y += Math.sin(Math.PI * move) * 4;
    flyer.root.quaternion.copy(FO.q0).slerp(FO.q1, move);
    setFold(clamp01((p - 0.46) / 0.5));
  }

  /** A material faded to nothing must also stop writing depth: an invisible thing that still writes depth goes on
      hiding whatever passes behind it — that was the straight cut across a sleeve while the open view scrolled. */
  const fadeMat = (m, a) => {
    m.opacity = a * (m.userData.baseOpacity === undefined ? 1 : m.userData.baseOpacity);
    const write = a > 0.02 && m.userData.baseOpacity === undefined;
    if (m.depthWrite !== write) m.depthWrite = write;
  };
  function setFade(it, a) {
    if (Math.abs(it.fade - a) < 1e-4) return;
    it.fade = a;
    for (const m of it.mats) fadeMat(m, a);
    it.root.visible = a > 0.001;
  }

  /* ---------- time ---------- */
  function spring(x, v, target, dt, k) {
    const c = 2 * Math.sqrt(k);
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) { const a = -k * (x - target) - c * v; v += a * h; x += v * h; }
    if (Math.abs(x - target) < 1e-4 && Math.abs(v) < 1e-4) { x = target; v = 0; }
    return [x, v];
  }
  const DUR = { open: 1.3, close: 1.0 };
  function cue(name, when) { if (when && !cues.has(name)) { cues.add(name); onCue && onCue(name, active && active.id); } }

  let last = performance.now();
  let settled = false;
  let crateFade = 1;
  const _tint = new THREE.Color(), _fog = new THREE.Color(), _ground = new THREE.Color(0x14110f);
  const _fwd = new THREE.Vector3();
  let roomFade = 1;
  let shadowOnly = false;
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    let moving = false;

    if (mode === 'stack') {
      const pf = focus;
      [focus, focusV] = spring(focus, focusV, focusTarget, dt, 48);
      if (focus !== pf) moving = true;
    }
    if (mode === 'opening' || mode === 'closing') {
      const dur = openDir > 0 ? DUR.open : DUR.close;
      openT = clamp01(openT + openDir * dt / dur);
      moving = true;
      if (openDir > 0) {
        cue('bg-in', openT >= 0.3);
        cue('text-in', openT >= 0.55);
        if (openT >= 1) { mode = 'open'; onState && onState('open', active.id); }
      } else {
        cue('bg-out', openT <= 0.75);
        if (openT <= 0) {
          const was = active;
          mode = 'stack';
          resetItem(was);
          active = null;
          if (afterClose !== null) { focusTarget = afterClose; afterClose = null; }
          onState && onState('stack', was.id);
        }
      }
    }
    if (active) {
      const pf = active.flip;
      [active.flip, active.flipV] = spring(active.flip, active.flipV, active.flipTarget, dt, 26);
      if (active.flip !== pf) moving = true;
      const px = TILT.x, py = TILT.y;
      [TILT.x, TILT.vx] = spring(TILT.x, TILT.vx, TILT.tx, dt, 22);
      [TILT.y, TILT.vy] = spring(TILT.y, TILT.vy, TILT.ty, dt, 22);
      if (TILT.x !== px || TILT.y !== py) moving = true;
    }
    if (mode === 'open') {
      const po = os;
      [os, osV] = spring(os, osV, osTarget, dt, 24);   // softer than a record flipping in the crate: this is a glide
      if (os !== po) moving = true;
      const idx = Math.max(0, Math.min(LAST, Math.round(os)));
      if (idx !== active.index) {
        const was = active;
        was.flipTarget = 0;
        active = items[idx];
        focus = idx; focusTarget = idx; focusV = 0;
        onState && onState('switch', active.id);
      }
    }

    // with a record in hand, the crate and the others fade away; behind the record in view, the queue dims with depth
    const others = active ? 1 - clamp01((openT - 0.02) / 0.3) : 1;
    for (const it of items) {
      const d = Math.max(0, it.index - focus);
      const near = mode === 'open' && Math.abs(it.index - os) < 1.25;
      const a = it === active || near ? 1 : others * (1 - 0.12 * Math.min(4, Math.max(0, d - 0.5)));
      if (Math.abs(it.fade - a) > 1e-4) { setFade(it, a); moving = true; }
    }
    if (Math.abs(crateFade - others) > 1e-4) {
      crateFade = others;
      for (const m of crateMats) fadeMat(m, others);
      shadowMat.opacity = others * 0.9;
      crate.visible = others > 0.001;
      moving = true;
    }
    if (Math.abs(flyer.fade - others) > 1e-4) {
      flyer.fade = others;
      for (const m of flyer.mats) fadeMat(m, others);
      flyer.root.visible = others > 0.001;
      moving = true;
    }
    // the shop fades out and the screen becomes the record's own flat colour, the way the reference does it
    {
      const k = active ? smoother((openT - 0.05) / 0.45) : 0;     // 0 = the shop, 1 = the flat colour
      const i0 = Math.max(0, Math.min(LAST, Math.floor(os))), i1 = Math.max(0, Math.min(LAST, Math.ceil(os)));
      _tint.copy(items[i0].tint).lerp(items[i1].tint, clamp01(os - i0));   // the colour, blended while scrolling
      _fog.copy(FOG.room).lerp(_tint, k);
      if (!_ground.equals(_fog)) { _ground.copy(_fog); renderer.setClearColor(_ground, 1); scene.fog.color.copy(_ground); moving = true; }
      if (Math.abs(roomFade - (1 - k)) > 1e-4) {
        roomFade = 1 - k;
        for (const m of roomMats) fadeMat(m, roomFade);
        // the lamps dim instead of being switched off: turning a light off changes the shader the browser needs,
        // and it would stop to build a new one right in the middle of the movement (533 ms, measured)
        for (const l of roomLights) l.intensity = l.userData.base * roomFade;
        moving = true;
      }
      // the drop shadow lands on the flat colour: a plane behind the record, only its shadow showing.
      // While that plane is there, only the record in hand may cast on it — otherwise the shop's own shadows
      // print themselves across the colour.
      const want = k * 0.34;
      const only = want > 0.001;
      if (only !== shadowOnly) {
        shadowOnly = only;
        for (const m of sceneCasters) m.castShadow = !only;
        moving = true;
      }
      if (only) for (const it of items) for (const m of it.pick) m.castShadow = it === active;
      else for (const it of items) for (const m of it.pick) m.castShadow = true;
      if (Math.abs(dropMat.opacity - want) > 1e-4) { dropMat.opacity = want; moving = true; }
      if (want > 0.001 && active) {
        drop.quaternion.copy(camera.quaternion);
        drop.position.copy(active.root.position).addScaledVector(_fwd.set(0, 0, -1).applyQuaternion(camera.quaternion), 11);
      }
      drop.visible = want > 0.001;
    }

    if (moving || dirty) {
      placeCamera();
      crate.position.z = slide();
      for (const it of items) {
        if (mode === 'open') { if (Math.abs(it.index - os) < 1.25) applyOpenScroll(it); else stackPose(it); continue; }
        if (it === active && mode !== 'stack') { applyOpen(it, openT); continue; }
        stackPose(it);
      }
      applyFlyer(clamp01((focus - LAST) / FSPAN));
      renderer.render(scene, camera);
      onFrame && onFrame(frameInfo());
      dirty = false;
    }
    settled = !moving;
    requestAnimationFrame(frame);
  }

  function resetItem(it) {
    it.flip = 0; it.flipV = 0; it.flipTarget = 0;
    if (it.disc) it.disc.position.x = 0;
    stackPose(it);
  }

  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  function frameInfo() {
    flyer.root.updateMatrixWorld(true);
    _a.set(-FW / 2, 0, 0); flyer.root.localToWorld(_a).project(camera);
    _b.set(FW / 2, -FO.htot, 0); flyer.root.localToWorld(_b).project(camera);
    return {
      mode, focus, portrait: L.portrait, os, active: active ? active.id : null,
      flyer: { p: flyer.p, x: (_a.x * 0.5 + 0.5) * L.vw, y: (-_a.y * 0.5 + 0.5) * L.vh, w: (_b.x - _a.x) * 0.5 * L.vw, h: (_a.y - _b.y) * 0.5 * L.vh }
    };
  }

  /* ---------- actions ---------- */
  const snap = (f) => (f > LAST ? (f > LAST + FSPAN / 2 ? FMAX : LAST) : Math.round(f));
  function setFocus(i) { if (mode === 'stack') { focusTarget = Math.max(0, Math.min(FMAX, i)); dirty = true; } }
  function nudge(d) {
    if (mode !== 'stack') return;
    let nx = snap(focusTarget) + d;
    if (nx > LAST && nx < FMAX) nx = d > 0 ? FMAX : LAST;
    focusTarget = Math.max(0, Math.min(FMAX, nx));
  }
  function open(id) {
    if (mode !== 'stack') return false;
    const it = items.find((x) => x.id === id);
    if (!it) return false;
    // the record in view is the one that can be pulled out
    focus = it.index; focusTarget = it.index; focusV = 0;
    os = it.index; osTarget = it.index; osV = 0;
    TILT.x = TILT.y = TILT.vx = TILT.vy = 0;
    active = it;
    cues.clear();
    for (const x of items) computeOpen(x);
    mode = 'opening'; openDir = 1;
    onState && onState('opening', id);
    return true;
  }
  function close(then = null) {
    if (mode !== 'open' && mode !== 'opening') return false;
    cues.clear();
    afterClose = then;
    os = active.index; osTarget = os; osV = 0;
    for (const it of items) if (it !== active) { resetItem(it); }
    TILT.tx = TILT.ty = 0;
    mode = 'closing'; openDir = -1;
    active.flipTarget = 0;
    computeOpen(active);
    onState && onState('closing', active.id);
    return true;
  }
  /** in the open view: move to record i (the column and the sleeve slide together) */
  function goTo(i) {
    if (mode !== 'open' && mode !== 'opening') return false;
    if (i > LAST) { close(FMAX); return true; }
    osTarget = Math.max(0, Math.min(LAST, i));
    return true;
  }
  /** one record on or back, from wherever we are already headed */
  function nudgeOpen(d) { if (mode === 'open' || mode === 'opening') stepOpen(d > 0 ? 1 : -1); }
  /* The wheel in the open view. A notch and a trackpad's stream of small deltas both mean the same thing —
     "next record" — so the deltas add up until they pass a step, one step is taken, and then the wheel has to go
     quiet for a moment before the next one. A step that arrives while the last one is still gliding is queued,
     never dropped: the target simply moves one record further. */
  const WHEEL = { acc: 0, quiet: 0, locked: false, STEP: 70, QUIET: 130 };
  function openWheel(dy) {
    clearTimeout(WHEEL.quiet);
    WHEEL.quiet = setTimeout(() => { WHEEL.locked = false; WHEEL.acc = 0; }, WHEEL.QUIET);
    if (WHEEL.locked) return;
    WHEEL.acc += dy;
    if (Math.abs(WHEEL.acc) < WHEEL.STEP) return;
    const dir = WHEEL.acc > 0 ? 1 : -1;
    WHEEL.acc = 0;
    WHEEL.locked = true;
    stepOpen(dir);
  }
  /** move one record on from wherever we are already headed (so gestures stack up) */
  function stepOpen(dir) {
    const from = Math.max(0, Math.min(LAST, Math.round(osTarget)));
    const nx = from + dir;
    if (nx > LAST) { close(FMAX); return; }
    osTarget = Math.max(0, Math.min(LAST, nx));
  }
  function flip() {
    if (!active || mode !== 'open') return false;
    active.flipTarget = active.flipTarget ? 0 : 1;
    return true;
  }

  /* ---------- input ---------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(x, y) {
    ndc.set((x / L.vw) * 2 - 1, -(y / L.vh) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false).find((h) => h.object.userData.item.root.visible);
    return hit ? hit.object.userData.item : null;
  }
  function pickFlyer(x, y) {
    if (!flyer.root.visible || flyer.p < 0.5) return false;
    ndc.set((x / L.vw) * 2 - 1, -(y / L.vh) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return !!ray.intersectObjects(flyerPick, false)[0];
  }
  /** in the crate only the record in view (or the next one peeking) can be picked */
  const current = () => items[Math.min(LAST, Math.max(0, Math.round(focus)))];

  let wheelIdle = 0;
  /** the wheel's deltas in pixels, whatever unit the browser used */
  const wheelPx = (e) => (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * L.vh : e.deltaY);
  // listened for on the way down (capture), so the wheel works over the words and over the rows of buttons too
  window.addEventListener('wheel', (e) => {
    if (document.body.classList.contains('has-layer')) return;
    const dy = wheelPx(e);
    if (mode === 'open' || mode === 'opening') {
      // a column taller than the screen scrolls itself first; once it is at its end, the wheel turns to the next record
      const col = e.target.closest && e.target.closest('.page__rec');
      if (col) {
        const over = col.scrollHeight - col.clientHeight;
        if (over > 2) {
          const atTop = col.scrollTop <= 0.5, atEnd = col.scrollTop >= over - 0.5;
          if ((dy > 0 && !atEnd) || (dy < 0 && !atTop)) return;
        }
      }
      e.preventDefault();
      openWheel(dy);
      return;
    }
    if (mode !== 'stack') return;
    e.preventDefault();
    focusTarget = Math.max(0, Math.min(FMAX, focusTarget + dy * 0.0035));
    clearTimeout(wheelIdle);
    wheelIdle = setTimeout(() => { focusTarget = snap(focusTarget); }, 220);
  }, { passive: false, capture: true });

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { y: e.clientY, f: mode === 'open' ? osTarget : focusTarget, moved: false, id: e.pointerId }; });
  const pointTilt = (e) => {
    TILT.tx = ((e.clientX / L.vw) * 2 - 1) * TILT.yaw;
    TILT.ty = ((e.clientY / L.vh) * 2 - 1) * TILT.pitch;
  };
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && (mode === 'open' || mode === 'opening')) pointTilt(e); }, { passive: true });
  document.addEventListener('pointerleave', () => { TILT.tx = TILT.ty = 0; });
  window.addEventListener('blur', () => { TILT.tx = TILT.ty = 0; });
  // a phone held in the hand: the sleeve tilts with it, when the browser gives the angles without asking
  let gyroOn = false;
  const gyro = (e) => {
    if (mode !== 'open' || e.gamma == null) return;
    TILT.tx = Math.max(-1, Math.min(1, e.gamma / 30)) * TILT.yaw;
    TILT.ty = Math.max(-1, Math.min(1, (e.beta - 50) / 30)) * TILT.pitch;
  };
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') { window.addEventListener('deviceorientation', gyro); gyroOn = true; }
  canvas.addEventListener('pointermove', (e) => {
    if (drag && drag.id === e.pointerId && (mode === 'stack' || mode === 'open')) {
      const dy = e.clientY - drag.y;
      if (Math.abs(dy) > 8 || drag.moved) {
        drag.moved = true;
        if (mode === 'open') osTarget = Math.max(-0.12, Math.min(LAST + 0.6, drag.f - dy / (L.portrait ? 260 : 400)));
        else focusTarget = Math.max(0, Math.min(FMAX, drag.f - dy / (L.portrait ? 90 : 140)));
      }
      return;
    }
    if (e.pointerType !== 'mouse') return;
    if (mode === 'stack') {
      const it = pick(e.clientX, e.clientY);
      canvas.style.cursor = (it && it === current() && focus <= LAST + 0.02) || pickFlyer(e.clientX, e.clientY) ? 'pointer' : '';
    } else if (mode === 'open') {
      const it = pick(e.clientX, e.clientY);
      canvas.style.cursor = it && it === active ? 'pointer' : '';
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const moved = drag.moved;
    drag = null;
    if (moved) {
      if (mode === 'open') { if (osTarget > LAST + 0.3) close(FMAX); else osTarget = Math.max(0, Math.min(LAST, Math.round(osTarget))); }
      else focusTarget = snap(focusTarget);
      return;
    }
    if (mode === 'stack' && pickFlyer(e.clientX, e.clientY)) { onFlyer && onFlyer(); return; }
    const it = pick(e.clientX, e.clientY);
    if (mode === 'stack' && it) {
      if (it === current() && Math.abs(focus - it.index) < 0.02) open(it.id);
      else focusTarget = it.index; // a record further back: flip to it first
    } else if (mode === 'open' && it === active) flip();
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });

  window.addEventListener('resize', () => {
    layout();
    if (active && (mode === 'open' || mode === 'opening')) computeOpen(active);
    dirty = true;
  });

  /* ---------- prepare everything before the first frame ---------- */
  await onStep('room');
  layout();
  placeCamera();
  for (const t of textures) renderer.initTexture(t);
  await onStep('warm');            // every print is on the graphics card
  // Compiled the asynchronous way, a third of the shop at a time: the driver builds the shaders on its own
  // threads while the record keeps turning, and the wait screen still has something to report every half second.
  // The lamps are left out of the split — they are the lighting every part is compiled against.
  {
    const parts = scene.children.filter((o) => !o.isLight);
    const per = Math.ceil(parts.length / 3) || 1;
    for (let i = 0; i < parts.length; i += per) {
      for (const o of parts.slice(i, i + per)) await renderer.compileAsync(o, camera, scene);
      await onStep('warm');        // that quarter's shaders exist
    }
  }
  // a hidden pass with every disc out and the flyer half open: no first-use cost lands mid-animation
  for (const it of items) { stackPose(it); if (it.disc) it.disc.position.x = discOut(); }
  // the flyer folded, half open and fully open: the back of the sheet only shows once it is open, and its shader
  // has to exist before then (it cost 117 ms the first time, measured)
  // The first drawn frame is the dear one. Even with the shaders compiled ahead of time, the graphics driver
  // finishes its own translation the first time each material is actually drawn — all of it at once, that was
  // three seconds with nothing on screen. So the shop is drawn in six passes, a few meshes more each time, and
  // the wait screen gets a turn in between. The lamps are never switched off here: changing how many lights
  // there are would throw every shader away again (measured: 533 ms).
  {
    const meshes = [];
    scene.traverse((m) => { if (m.isMesh && m.visible) meshes.push(m); });
    for (const m of meshes) m.visible = false;
    applyFlyer(0.5);
    // a ramp, not equal shares: the very first draw carries the one-off cost of starting the pipeline at all,
    // so it is given a single small mesh to carry it with
    const CHUNKS = [1, 1, 2, 4, 8];
    const cuts = [];
    let at = 0;
    for (const n of CHUNKS) { if (at >= meshes.length) break; cuts.push([at, Math.min(meshes.length, at + n)]); at += n; }
    if (at < meshes.length) cuts.push([at, meshes.length]);
    for (const [a, b] of cuts) {
      for (const m of meshes.slice(a, b)) m.visible = true;
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
      await onStep('warm');
    }
    for (const m of meshes) m.visible = true;
  }
  for (const p of [0.8, 1]) { applyFlyer(p); renderer.render(scene, camera); await onStep('warm'); }
  // and once more exactly as it looks mid-opening — the record in the hand's pose, the shop half faded, the drop
  // shadow on the flat ground — so the first click never pays for a shader the browser has not built yet
  {
    const it0 = items[0];
    computeOpen(it0);
    for (const m of roomMats) m.opacity = 0.5;
    for (const l of roomLights) l.intensity = l.userData.base * 0.5;
    dropMat.opacity = 0.34; drop.visible = true;
    for (const t of [0.4, 0.75, 1]) {
      applyOpen(it0, t);
      drop.quaternion.copy(camera.quaternion);
      drop.position.copy(it0.root.position).addScaledVector(_fwd.set(0, 0, -1).applyQuaternion(camera.quaternion), 11);
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
      await onStep('warm');
    }
    // and the same state with only the record casting a shadow, and with the flyer wide open behind it:
    // every combination the page can reach is drawn once here, so none of them stops to compile later
    for (const m of sceneCasters) m.castShadow = false;
    for (const it of items) for (const m of it.pick) m.castShadow = it === it0;
    applyFlyer(1);
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    renderer.compile(scene, camera);
    await onStep('warm');
    for (const m of sceneCasters) m.castShadow = true;
    for (const it of items) for (const m of it.pick) m.castShadow = true;
    dropMat.opacity = 0; drop.visible = false;
    for (const m of roomMats) m.opacity = 1;
    for (const l of roomLights) l.intensity = l.userData.base;
    resetItem(it0);
  }
  for (const it of items) resetItem(it);
  applyFlyer(0);
  renderer.render(scene, camera);
  dirty = true;
  requestAnimationFrame(frame);

  return {
    items: items.map((it) => it.id),
    open, close, flip, setFocus, nudge, setFlyerLang, goTo, nudgeOpen,
    renderer, scene,   // for the frame-time and picture-checking tools only
    /** the four corners of every cover that is on screen, in screen pixels — for the picture-checking tools */
    faceQuads() {
      const out = [];
      const v = new THREE.Vector3();
      const half = W / 2, up = T / 2;
      for (const it of items) {
        if (!it.root.visible || it.fade < 0.5) continue;
        it.box.updateMatrixWorld(true);
        const quad = [[-half, up, -half], [half, up, -half], [half, up, half], [-half, up, half]].map((c) => {
          v.set(c[0], c[1], c[2]).applyMatrix4(it.box.matrixWorld).project(camera);
          return { x: (v.x * 0.5 + 0.5) * L.vw, y: (-v.y * 0.5 + 0.5) * L.vh, z: v.z };
        });
        // only a cover that is wholly on screen and in front of the camera can be checked
        if (quad.some((q) => q.z > 1 || q.x < 2 || q.y < 2 || q.x > L.vw - 2 || q.y > L.vh - 2)) continue;
        out.push(quad);
      }
      return out;
    },
    get camera() { return camera.position.toArray().map((v) => +v.toFixed(3)); },
    get gyro() { return gyroOn; },
    flyerFocus: FMAX,
    get mode() { return mode; },
    get focus() { return snap(focusTarget); },
    get active() { return active ? active.id : null; },
    get flipped() { return !!(active && active.flipTarget); },
    get settled() { return settled && (mode === 'stack' || mode === 'open'); },
    redraw() { dirty = true; }
  };
}
