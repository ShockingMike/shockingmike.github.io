/* The table (planks, fiddle rail, brass strip and pins), the hull wall with ribs, and two brass portholes. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { lathe, boxUV, TAU } from './util.js';
import { LAYOUT } from './layout.js';

const rbox = (w, h, d, r, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);
export function solid(m, cast = true, receive = true) { m.castShadow = cast; m.receiveShadow = receive; return m; }

export function buildTable(M) {
  const group = new THREE.Group(); group.name = 'table';
  const T = LAYOUT.table, W = T.x1 - T.x0, D = T.z1 - T.z0, cx = (T.x0 + T.x1) / 2, cz = (T.z0 + T.z1) / 2;
  const top = solid(new THREE.Mesh(boxUV(rbox(W, T.t, D, 0.009, 4), { size: [W, D], offset: [W / 2, D / 2], axis: 'x' }), M.tableTop));
  top.position.set(cx, -T.t / 2, cz);
  group.add(top);
  const apron = solid(new THREE.Mesh(boxUV(rbox(W - 0.06, 0.08, D - 0.08, 0.01), { size: [0.9, 0.9], axis: 'x' }), M.teak));
  apron.position.set(cx, -T.t - 0.04, cz);
  group.add(apron);

  const rh = T.railH, rt = T.railT;
  const rails = [
    { w: W, d: rt, x: cx, z: T.z1 - rt / 2, axis: 'x', len: W, dir: 'x' },
    { w: W, d: rt, x: cx, z: T.z0 + rt / 2, axis: 'x', len: W, dir: 'x' },
    { w: rt, d: D - 2 * rt, x: T.x0 + rt / 2, z: cz, axis: 'z', len: D - 2 * rt, dir: 'z' },
    { w: rt, d: D - 2 * rt, x: T.x1 - rt / 2, z: cz, axis: 'z', len: D - 2 * rt, dir: 'z' }
  ];
  const pinGeo = lathe([[0, 0], [0.0042, 0], [0.0042, 0.0008, 0.0004], [0.0028, 0.0022, 0.001], [0, 0.0026]], 20, 3);
  const pinSpots = [];
  rails.forEach((r, i) => {
    const m = solid(new THREE.Mesh(boxUV(rbox(r.w, rh, r.d, 0.0065, 3), { size: [0.7, 0.7], axis: r.axis }), M.teak));
    m.position.set(r.x, rh / 2, r.z);
    group.add(m);
    const sw = r.dir === 'x' ? r.len - 0.01 : 0.012, sd = r.dir === 'x' ? 0.012 : r.len - 0.01;
    const strip = solid(new THREE.Mesh(rbox(sw, 0.0026, sd, 0.0012, 2), M.brass));
    strip.position.set(r.x, rh + 0.0011, r.z);
    group.add(strip);
    const n = Math.floor(r.len / 0.15);
    for (let k = 0; k <= n; k++) {
      const u = -r.len / 2 + 0.03 + (k * (r.len - 0.06)) / n;
      pinSpots.push(r.dir === 'x' ? [r.x + u, rh + 0.0024, r.z] : [r.x, rh + 0.0024, r.z + u]);
    }
  });
  const pins = solid(new THREE.InstancedMesh(pinGeo, M.brassPolished, pinSpots.length), true, false);
  const m4 = new THREE.Matrix4();
  pinSpots.forEach((p, i) => { m4.makeTranslation(p[0], p[1], p[2]); pins.setMatrixAt(i, m4); });
  group.add(pins);
  // brass corner brackets on the outside of the rail
  [[T.x0, T.z1, -1, 1], [T.x1, T.z1, 1, 1], [T.x0, T.z0, -1, -1], [T.x1, T.z0, 1, -1]].forEach(([x, z, sx, sz]) => {
    const a = solid(new THREE.Mesh(rbox(0.05, rh + T.t * 0.8, 0.003, 0.0012, 2), M.brass));
    a.position.set(x - sx * 0.024, rh / 2 - T.t * 0.35, z + sz * 0.0016);
    const b = solid(new THREE.Mesh(rbox(0.003, rh + T.t * 0.8, 0.05, 0.0012, 2), M.brass));
    b.position.set(x + sx * 0.0016, rh / 2 - T.t * 0.35, z - sz * 0.024);
    group.add(a, b);
  });
  return group;
}

export function buildWall(M) {
  const group = new THREE.Group(); group.name = 'wall';
  const z = LAYOUT.wallZ, th = 0.05;
  const shape = new THREE.Shape();
  shape.moveTo(-2.4, -0.9); shape.lineTo(2.4, -0.9); shape.lineTo(2.4, 1.7); shape.lineTo(-2.4, 1.7); shape.closePath();
  LAYOUT.portholes.forEach((p) => { const h = new THREE.Path(); h.absarc(p.x, p.y, 0.114, 0, TAU, true); shape.holes.push(h); });
  const geo = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false, curveSegments: 72 });
  boxUV(geo, { size: [2.6, 4.8], offset: [0.9, 2.4], axis: 'y' });
  const wall = solid(new THREE.Mesh(geo, M.wall));
  wall.position.z = z - th;
  group.add(wall);
  // horizontal ribs (stringers) and two frames
  [[0.205, 0.07], [1.02, 0.08]].forEach(([y, h]) => {
    const rib = solid(new THREE.Mesh(boxUV(rbox(4.8, h, 0.042, 0.01, 3), { size: [1.2, 1.2], axis: 'x' }), M.teak));
    rib.position.set(0, y, z + 0.021);
    group.add(rib);
  });
  [-0.84, 1.08].forEach((x) => {
    const fr = solid(new THREE.Mesh(boxUV(rbox(0.075, 2.6, 0.05, 0.012, 3), { size: [1.2, 1.2], axis: 'y' }), M.teak));
    fr.position.set(x, 0.4, z + 0.025);
    group.add(fr);
  });
  const beam = solid(new THREE.Mesh(boxUV(rbox(4.8, 0.11, 0.24, 0.015, 3), { size: [1.2, 1.2], axis: 'x' }), M.teak));
  beam.position.set(0, 1.36, z + 0.12);
  group.add(beam);
  // the rest of the cabin shell: deck, deckhead and the two bulkheads, so nothing outside shows through
  const floor = solid(new THREE.Mesh(boxUV(new THREE.BoxGeometry(4.8, 0.04, 3.6), { size: [0.9, 0.9], axis: 'x' }), M.teak), false, true);
  floor.position.set(0, -0.78, z + 1.8);
  const ceiling = solid(new THREE.Mesh(boxUV(new THREE.BoxGeometry(4.8, 0.04, 3.6), { size: [1.2, 1.2], axis: 'x' }), M.teak), false, true);
  ceiling.position.set(0, 1.44, z + 1.8);
  group.add(floor, ceiling);
  [-1.7, 1.9].forEach((x) => {
    const side = solid(new THREE.Mesh(boxUV(new THREE.BoxGeometry(0.04, 2.3, 3.6), { size: [1.2, 1.2], axis: 'y' }), M.wall), false, true);
    side.position.set(x, 0.33, z + 1.8);
    group.add(side);
  });
  // table legs
  const T = LAYOUT.table;
  [[T.x0 + 0.08, T.z0 + 0.1], [T.x1 - 0.08, T.z0 + 0.1], [T.x0 + 0.08, T.z1 - 0.08], [T.x1 - 0.08, T.z1 - 0.08]].forEach(([x, zz]) => {
    const leg = solid(new THREE.Mesh(boxUV(rbox(0.06, 0.74, 0.06, 0.01), { size: [0.7, 0.7], axis: 'y' }), M.teak));
    leg.position.set(x, -0.41, zz);
    group.add(leg);
  });
  return group;
}

/* ---------- Rain running down the outside of the glass (height field -> refracting normal) ---------- */
const RAIN_GLSL = /* glsl */`
float rS(float a, float b, float t) { return smoothstep(a, b, t); }
float washHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float washNoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(washHash(i), washHash(i + vec2(1.0, 0.0)), f.x), mix(washHash(i + vec2(0.0, 1.0)), washHash(i + vec2(1.0, 1.0)), f.x), f.y); }
vec3 rN13(float p) { vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.11369, 0.13787)); p3 += dot(p3, p3.yzx + 19.19); return fract(vec3((p3.x + p3.y) * p3.z, (p3.x + p3.z) * p3.y, (p3.y + p3.z) * p3.x)); }
float rN(float t) { return fract(sin(t * 12345.564) * 7658.76); }
float rSaw(float b, float t) { return rS(0.0, b, t) * rS(1.0, b, t); }
vec2 dropLayer(vec2 uv, float t) {
  vec2 UV = uv;
  uv.y += t * 0.75;
  vec2 a = vec2(6.0, 1.0);
  vec2 grid = a * 2.0;
  vec2 id = floor(uv * grid);
  uv.y += rN(id.x);
  id = floor(uv * grid);
  vec3 n = rN13(id.x * 35.2 + id.y * 2376.1);
  vec2 st = fract(uv * grid) - vec2(0.5, 0.0);
  float x = n.x - 0.5;
  float y = UV.y * 20.0;
  x += sin(y + sin(y)) * (0.5 - abs(x)) * (n.z - 0.5);
  x *= 0.7;
  float ti = fract(t + n.z);
  y = (rSaw(0.85, ti) - 0.5) * 0.9 + 0.5;
  float d = length((st - vec2(x, y)) * a.yx);
  float mainDrop = rS(0.4, 0.0, d);
  float r = sqrt(rS(1.0, y, st.y));
  float cd = abs(st.x - x);
  float trail = rS(0.23 * r, 0.15 * r * r, cd);
  float trailFront = rS(-0.02, 0.02, st.y - y);
  trail *= trailFront * r * r;
  float yy = fract(UV.y * 10.0) + (st.y - 0.5);
  float droplets = rS(0.3, 0.0, length(st - vec2(x, yy)));
  return vec2(mainDrop + droplets * r * trailFront, trail);
}
float staticDrops(vec2 uv, float t) {
  uv *= 40.0;
  vec2 id = floor(uv);
  uv = fract(uv) - 0.5;
  vec3 n = rN13(id.x * 107.45 + id.y * 3543.654);
  vec2 p = (n.xy - 0.5) * 0.7;
  float fade = rSaw(0.025, fract(t + n.z));
  return rS(0.3, 0.0, length(uv - p)) * fract(n.z * 10.0) * fade;
}
float rainH(vec2 uv, float t) {
  float c = staticDrops(uv, t) + dropLayer(uv, t).x + dropLayer(uv * 1.85 + 3.1, t).x;
  return rS(0.3, 1.0, c);
}
vec2 rainGrad(vec2 uv, float t) {
  float tt = t * 0.22;
  float e = 0.0016;
  float h = rainH(uv, tt);
  return vec2(rainH(uv + vec2(e, 0.0), tt) - h, rainH(uv + vec2(0.0, e), tt) - h) / e * 0.010;
}
`;

/* Green water sweeping over the glass in a storm: uWash is how far the sheet of water has come down (0..1). */
const WASH_GLSL = /* glsl */`
if (uWash > 0.001) {
  vec2 wp = vec2(vRainUv.x, vRainUv.y);
  float n = washNoise(vec2(wp.x * 5.0, wp.y * 2.5 + uClock * 1.4)) * 0.62 + washNoise(vec2(wp.x * 15.0, wp.y * 8.0 + uClock * 3.2)) * 0.38;
  float level = 0.52 - uWash * 1.15;
  float cover = smoothstep(-0.03, 0.07, wp.y - level + (n - 0.5) * 0.3) * smoothstep(0.0, 0.15, uWash);
  float foam = smoothstep(0.64, 0.92, n) * cover;
  vec3 water = vec3(0.008, 0.020, 0.018) * (0.55 + 0.9 * n) + vec3(0.05, 0.06, 0.055) * foam;
  outgoingLight = mix(outgoingLight, water, cover * 0.86);
  diffuseColor.a = mix(diffuseColor.a, 0.92, cover);
}
`;

export function makePortholeGlass(transmission) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: transmission ? 0xffffff : 0x0c1010, metalness: 0, roughness: 0.035, ior: 1.52,
    transmission: transmission ? 1 : 0, thickness: 0.014,
    attenuationColor: new THREE.Color(0.86, 0.97, 0.93), attenuationDistance: 0.35,
    transparent: !transmission, opacity: transmission ? 1 : 0.1,
    specularIntensity: transmission ? 0.8 : 0.5, envMapIntensity: transmission ? 0.35 : 0.12, depthWrite: true
  });
  // uRainGlow: without transmission (phone tier) the drops would vanish on a dark sea; let their edges catch a little light
  const uniforms = { uRain: { value: 0 }, uTime: { value: 0 }, uWash: { value: 0 }, uClock: { value: 0 }, uRainGlow: { value: transmission ? 0 : 1 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vRainUv;\nvarying vec3 vTx;\nvarying vec3 vTy;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRainUv = position.xy / 0.2;\nvTx = normalize((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);\nvTy = normalize((modelViewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uRain;\nuniform float uTime;\nuniform float uWash;\nuniform float uClock;\nuniform float uRainGlow;\nvarying vec2 vRainUv;\nvarying vec3 vTx;\nvarying vec3 vTy;\n' + RAIN_GLSL)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (uRain > 0.001) { vec2 rg = rainGrad(vRainUv, uTime) * uRain; normal = normalize(normal - (vTx * rg.x + vTy * rg.y)); }')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = min(1.0, roughnessFactor + uRain * 0.05);')
      .replace('#include <opaque_fragment>', 'if (uRainGlow > 0.5 && uRain > 0.001) { float dropK = clamp(length(rainGrad(vRainUv, uTime) * uRain) * 5.0, 0.0, 1.0); outgoingLight += vec3(0.055, 0.065, 0.075) * dropK; diffuseColor.a = max(diffuseColor.a, dropK * 0.55); }\n' + WASH_GLSL + '\n#include <opaque_fragment>');
  };
  mat.customProgramCacheKey = () => 'porthole-glass-rain-wash';
  mat.userData.uniforms = uniforms;
  return mat;
}

export function buildPorthole(M, glassMat, index) {
  const g = new THREE.Group(); g.name = 'porthole' + index;
  const P = LAYOUT.portholes[index];
  g.position.set(P.x, P.y, LAYOUT.wallZ);
  const toZ = (geo) => { geo.rotateX(Math.PI / 2); return geo; };

  // fixed flange bolted to the hull (profile runs counter-clockwise: back, outer edge, face, bore)
  const flange = solid(new THREE.Mesh(toZ(lathe([
    [0.108, 0], [0.19, 0], [0.19, 0.007, 0.003], [0.18, 0.014, 0.004], [0.128, 0.0155, 0.004], [0.112, 0.011, 0.003], [0.108, 0.0]
  ], 128, 5)), M.brass));
  g.add(flange);
  // bolts
  const boltGeo = toZ(lathe([[0, 0], [0.0078, 0], [0.0078, 0.0022, 0.001], [0.0052, 0.0052, 0.0022], [0, 0.0058]], 24, 4));
  const bolts = solid(new THREE.InstancedMesh(boltGeo, M.brassPolished, 10), true, false);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 10; i++) { const a = (i + 0.5) / 10 * TAU; m4.makeTranslation(Math.cos(a) * 0.159, Math.sin(a) * 0.159, 0.0142); bolts.setMatrixAt(i, m4); }
  g.add(bolts);
  // hinged glass frame
  const frame = solid(new THREE.Mesh(toZ(lathe([
    [0.090, 0.004], [0.142, 0.004], [0.142, 0.021, 0.004], [0.132, 0.036, 0.007], [0.106, 0.039, 0.005], [0.094, 0.030, 0.003], [0.090, 0.004]
  ], 128, 5)), M.brass));
  g.add(frame);
  const gasket = solid(new THREE.Mesh(new THREE.TorusGeometry(0.0915, 0.0032, 10, 96), M.rubber), false, true);
  gasket.position.z = 0.027;
  g.add(gasket);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.094, 96), glassMat);
  glass.position.z = 0.024;
  glass.name = 'glass';
  g.add(glass);

  // hinge on the left
  const hinge = new THREE.Group(); hinge.position.set(-0.168, 0, 0.026);
  const knGeo = new THREE.CylinderGeometry(0.0085, 0.0085, 0.022, 28);
  [-0.0125, 0.0125].forEach((y) => { const k = solid(new THREE.Mesh(knGeo, M.brass)); k.position.y = y; hinge.add(k); });
  const pinCap = lathe([[0, 0], [0.006, 0], [0.006, 0.0015, 0.001], [0.0035, 0.004, 0.0015], [0, 0.0045]], 20, 3);
  const capTop = solid(new THREE.Mesh(pinCap, M.brassPolished)); capTop.position.y = 0.0235; hinge.add(capTop);
  const capBot = solid(new THREE.Mesh(pinCap, M.brassPolished)); capBot.rotation.x = Math.PI; capBot.position.y = -0.0235; hinge.add(capBot);
  const leafA = solid(new THREE.Mesh(rbox(0.032, 0.02, 0.009, 0.003), M.brass)); leafA.position.set(0.02, -0.0125, 0.0); hinge.add(leafA);
  const leafB = solid(new THREE.Mesh(rbox(0.02, 0.02, 0.012, 0.003), M.brass)); leafB.position.set(-0.004, 0.0125, -0.012); hinge.add(leafB);
  g.add(hinge);

  // locking dog on the right: stud, lug on the frame, wing nut
  const dog = new THREE.Group(); dog.position.set(0.166, 0, 0);
  const lug = solid(new THREE.Mesh(rbox(0.03, 0.024, 0.012, 0.004), M.brass)); lug.position.set(-0.012, 0, 0.03); dog.add(lug);
  const stud = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.034, 16), M.brassDark)); stud.rotation.x = Math.PI / 2; stud.position.set(0.004, 0, 0.03); dog.add(stud);
  const block = solid(new THREE.Mesh(rbox(0.024, 0.02, 0.014, 0.004), M.brass)); block.position.set(0.006, 0, 0.012); dog.add(block);
  const nut = new THREE.Group(); nut.position.set(0.004, 0, 0.043);
  const hub = solid(new THREE.Mesh(toZ(lathe([[0, 0], [0.0075, 0], [0.0075, 0.007, 0.002], [0.005, 0.011, 0.002], [0, 0.011]], 24, 3)), M.brassPolished));
  nut.add(hub);
  const wingGeo = new THREE.SphereGeometry(1, 20, 14);
  [-1, 1].forEach((s) => {
    const w = solid(new THREE.Mesh(wingGeo, M.brassPolished));
    w.scale.set(0.012, 0.0032, 0.0085);
    w.position.set(0, s * 0.012, 0.007);
    w.rotation.set(Math.PI / 2, 0, 0);
    w.rotation.z = Math.PI / 2;
    nut.add(w);
  });
  nut.rotation.z = 0.5;
  dog.add(nut);
  g.add(dog);
  return { group: g, glass };
}
