// Chớm world, season Hạ: West Lake at dusk. The lake surface, the far shore and the Trấn Quốc pagoda (a distant silhouette).
// The lake is painted like the ground: strokes fixed in the world, laid across the view, sized from the fixed reference eye
// (so they keep their size on screen and never slide). It mirrors the dusk sky (lilac overhead, gold low), the far shore and the
// pagoda (from the same height profile the shore is built with), and the low sun as a column of broken gold dabs.
// It takes the sun shadows of whatever moves on it (the boat, the dragonflies) and the V of the boat's wake.
import * as THREE from 'three';
import { U, COMMON_GLSL, knifeMaterial } from '../../core/paint.js';
import { SKYLINE_GLSL } from './farrow.js';
import { V3, Batch, mat } from '../../core/build.js';

export const WATER_Y = -0.45;
const lin = (h) => new THREE.Color(h);
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const vnoise = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };

// ---------------------------------------------------------------- the far shore: a height profile around the eye (azimuth -> metres)
// Az is measured from -z toward +x (degrees), from the reference eye; the lake lies at az < ~-3 (the bank runs away along -z).
export function shoreProfile({ eye, radius = 420, azFrom = -120, azTo = 8 }) {
  const N = 512;
  const h = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const az = azFrom + (i / (N - 1)) * (azTo - azFrom);
    // rows of trees and low houses, a few taller blocks (Quảng An, Nghi Tàm, far off)
    let v = 4.5 + 3.5 * vnoise(az * 0.9) + 2.2 * vnoise(az * 3.1 + 7) + (vnoise(az * 0.35 + 3) > 0.72 ? 5.5 * vnoise(az * 1.7 + 1) : 0);
    // the tree tops are rounded, the roofs square: a light step pattern on top
    v += (Math.floor(az * 1.3) % 3 === 0 ? 1.2 : 0) * vnoise(az * 5 + 2);
    h[i] = v;
  }
  return { N, h, radius, azFrom, azTo, eye: eye.clone() };
}

export function shoreMesh(prof, { col = '#8c7a98', col2 = '#b49ab0', haze = 0.62, seed = 0.4 } = {}) {
  const { N, h, radius, azFrom, azTo, eye } = prof;
  const P = [], UV = [], I = [];
  for (let i = 0; i < N; i++) {
    const az = THREE.MathUtils.degToRad(azFrom + (i / (N - 1)) * (azTo - azFrom));
    const x = eye.x + Math.sin(az) * radius, z = eye.z - Math.cos(az) * radius;
    P.push(x, WATER_Y - 0.5, z, x, h[i], z);
    UV.push(i / (N - 1), h[i], i / (N - 1), h[i]);
    if (i < N - 1) { const k = i * 2; I.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setIndex(I);
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...U, cA: { value: lin(col) }, cB: { value: lin(col2) }, uHaze: { value: haze }, uSeed: { value: seed } },
    vertexShader: `varying vec2 vUv; varying vec3 vWP; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      ${COMMON_GLSL()}
      uniform vec3 cA, cB; uniform float uHaze, uSeed;
      varying vec2 vUv; varying vec3 vWP;
      void main(){
        float y = vWP.y;
        vec4 b = texture2D(tBrush, vec2(vUv.x * 60.0, y * 0.09) + uSeed);
        vec4 b2 = texture2D(tBrush, vec2(vUv.x * 23.0, y * 0.05) + uSeed * 1.7);
        // the top edge, eaten by the brush (the geometry carries the height; the paint bites a little off it)
        float top = vUv.y;
        if (y > top - (1.0 - b.a) * 0.9) discard;
        vec3 col = mix(cA, cB, band(b.b + (b2.a - 0.5) * 0.4, 0.55));
        // a few windows lit for the evening, far off: warm dabs low on the shore
        vec2 wc = vec2(vUv.x * 900.0, y * 0.8);
        float lit = step(0.93, fract(sin(dot(floor(wc), vec2(12.9898, 78.233))) * 43758.5453)) * step(1.0, y) * step(y, top - 1.5);
        col = mix(col, vec3(1.0, 0.72, 0.42), lit * band(b2.b, 0.4) * 0.8);
        // the foot of the shore sinks into the warm haze over the water
        float foot = 1.0 - smoothstep(-0.5, 3.0, y);
        col = mix(col, mix(uAir, uAirSun, 0.6), clamp(uHaze + foot * 0.25, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  return mesh;
}

// the profile as a texture for the water's reflection (elevation angle of the shore top, seen from the eye, in radians * 10)
function profileTexture(prof, extra) {
  const { N, h, radius } = prof;
  const data = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) {
    let el = Math.atan2(h[i] - WATER_Y, radius);
    const az = prof.azFrom + (i / (N - 1)) * (prof.azTo - prof.azFrom);
    for (const e of extra) if (Math.abs(az - e.az) < e.w) el = Math.max(el, e.el * (1 - Math.pow(Math.abs(az - e.az) / e.w, 2) * e.taper));
    data[i * 4] = Math.round(THREE.MathUtils.clamp(el / 0.2, 0, 1) * 255);
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, N, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  return t;
}

// ---------------------------------------------------------------- the lake
// pond: [xMin, xMax, zFar, zNear] (the lotus pond: darker, greener water between the leaves)
export function lakeMesh({ prof, extra = [], pond, colors = {}, bankX = -0.2, farRows = [] }) {
  const k = {
    deep: '#3a3448', pond: '#27302e', skyLo: '#f4ac74', skyMid: '#d89a98', skyHi: '#8a7cae', gold: '#ffd49a', shore: '#6e5c80', ...colors,
  };
  const uniforms = {
    ...U,
    cDeep: { value: lin(k.deep) }, cPond: { value: lin(k.pond) }, cSkyLo: { value: lin(k.skyLo) }, cSkyMid: { value: lin(k.skyMid) }, cSkyHi: { value: lin(k.skyHi) },
    cGold: { value: lin(k.gold) }, cShore: { value: lin(k.shore) },
    tProf: { value: profileTexture(prof, extra) }, uProf: { value: new THREE.Vector4(prof.azFrom, prof.azTo, prof.eye.x, prof.eye.z) },
    uPond: { value: new THREE.Vector4(...pond) },
    uBoat: { value: new THREE.Vector4(0, 999, 0, 0) },   // x, z, heading (rad, 0 = +x), speed (m/s)
    uBoatLen: { value: 3.4 },
    uPole: { value: new THREE.Vector4(0, 999, 0, 0) },   // x, z, strength, age
    uWaterY: { value: WATER_Y },
    // the far rows of houses (farrow.js), mirrored: where each stands (x, z, turned?, half width), its skyline numbers
    // (seed, lowest, highest, cell) and its hazed tone. Two at most; an unused one has half width 0.
    uRowA: { value: new THREE.Vector4(0, 0, 0, 0) }, uRowAP: { value: new THREE.Vector4(1, 5, 14, 4.5) }, uRowAC: { value: new THREE.Color() },
    uRowB: { value: new THREE.Vector4(0, 0, 0, 0) }, uRowBP: { value: new THREE.Vector4(1, 5, 14, 4.5) }, uRowBC: { value: new THREE.Color() },
  };
  farRows.slice(0, 2).forEach((r, i) => {
    const k = i ? 'B' : 'A';
    uniforms[`uRow${k}`].value.set(r.at[0], r.at[2], Math.abs(r.ry) > 0.1 ? 1 : 0, r.halfW);
    uniforms[`uRow${k}P`].value.set(r.seed, r.minH, r.maxH, r.cellW);
    uniforms[`uRow${k}C`].value.copy(r.tone);
  });
  const m = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec3 vWP; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      ${COMMON_GLSL()}
      uniform vec3 cDeep, cPond, cSkyLo, cSkyMid, cSkyHi, cGold, cShore;
      uniform sampler2D tProf; uniform vec4 uProf, uPond, uBoat, uPole; uniform float uBoatLen, uWaterY;
      uniform vec4 uRowA, uRowAP, uRowB, uRowBP; uniform vec3 uRowAC, uRowBC;
      varying vec3 vWP;
      ${SKYLINE_GLSL}
      // how much of a far row the reflected ray R from p sees (0..1): the plane z = row.y (or x = row.x when turned),
      // the row's own skyline, its misty foot; the result is the mirrored houses, softer at the foot like the houses
      float rowSeen(vec3 p, vec3 R, vec4 row, vec4 P){
        if (row.w <= 0.0) return 0.0;
        float t; float lx;
        if (row.z < 0.5) { if (R.z >= -1e-4) return 0.0; t = (row.y - p.z) / R.z; lx = p.x + R.x * t - row.x; }
        else { if (R.x <= 1e-4) return 0.0; t = (row.x - p.x) / R.x; lx = p.z + R.z * t - row.y; }
        if (t <= 0.0 || abs(lx) > row.w) return 0.0;
        float hy = p.y + R.y * t;
        float top = rowTopT(lx, P.x, P.y, P.z, P.w, row.w);
        return step(hy, top) * smoothstep(-0.6, 4.0, hy) * smoothstep(0.0, 10.0, row.w - abs(lx));
      }
      void main(){
        vec3 r = vWP - uRefEye;
        float dh = length(r.xz);
        // strokes fixed to the water, laid out as seen from the fixed eye: across = azimuth, down = depression angle
        float az = atan(r.x, -r.z);
        float dep = atan(uRefEye.y - vWP.y, dh);
        vec2 q = vec2(az * 3.1, dep * 26.0);
        vec4 b = texture2D(tBrush, q + vec2(0.17, 0.41));
        vec4 b2 = texture2D(tBrush, q * vec2(0.37, 0.55) + vec2(0.63, 0.29));
        vec4 b3 = texture2D(tBrush, q * vec2(0.13, 0.3) + vec2(0.31, 0.77));
        // three sizes: the big ones win where their paint is thick
        float pk = smoothstep(-0.04, 0.04, b3.a - 0.66);
        b = mix(b, b3, pk);
        vec3 V = normalize(cameraPosition - vWP);
        // ripples: the brush tilts the water, mostly toward and away from the eye (that is what stretches the sun into a column)
        vec2 tilt = (b.rg - 0.5) * 2.0;
        vec3 fwdH = normalize(vec3(-V.x, 0.0, -V.z));
        vec3 sideH = vec3(-fwdH.z, 0.0, fwdH.x);
        vec3 N = normalize(vec3(0.0, 1.0, 0.0) + fwdH * tilt.y * 0.11 + sideH * tilt.x * 0.035 + fwdH * (b2.b - 0.5) * 0.05);
        vec3 R = reflect(-V, N);
        float rel = asin(clamp(R.y, -1.0, 1.0));
        float raz = atan(R.x, -R.z);
        // the dusk sky as the water sees it: gold low down, rose, then lilac overhead; warmer toward the sun
        float sunK = pow(max(dot(normalize(vec3(R.x, 0.0, R.z)), normalize(vec3(uKeyDir.x, 0.0, uKeyDir.z))), 0.0), 3.0);
        vec3 sky = mix(cSkyLo, cSkyMid, band(rel + (b.b - 0.5) * 0.06, 0.07 + sunK * 0.05));
        sky = mix(sky, cSkyHi, band(rel + (b2.b - 0.5) * 0.08, 0.22 + sunK * 0.1));
        sky = mix(sky, cSkyLo * vec3(1.05, 1.0, 0.95), sunK * 0.35 * (1.0 - band(rel, 0.3)));
        // the far shore and the pagoda, mirrored: under them the water holds their dark, broken into dashes by the ripples
        float pa = (degrees(raz) - uProf.x) / (uProf.y - uProf.x);
        float shoreEl = texture2D(tProf, vec2(pa, 0.5)).r * 0.2;
        float inShore = step(0.0, pa) * step(pa, 1.0) * (1.0 - band(rel - shoreEl + (b.a - 0.5) * 0.012, 0.0));
        sky = mix(sky, mix(cShore, cSkyLo, 0.25 * sunK), inShore * 0.9);
        // the far rows of houses, mirrored faintly (a hazy row gives a hazy reflection; the lake's own air does the rest)
        float rA = rowSeen(vWP, R, uRowA, uRowAP), rB = rowSeen(vWP, R, uRowB, uRowBP);
        sky = mix(sky, uRowAC, rA * 0.55);
        sky = mix(sky, uRowBC, rB * 0.55);
        // fresnel: looking down the water shows its own dark body; toward the horizon it is all mirror
        float fres = 0.06 + 0.94 * pow(1.0 - max(dot(V, N), 0.0), 4.0);
        vec3 body = cDeep * mix(0.9, 1.1, b2.b);
        // the lotus pond: darker, greener water, shaded by the leaves
        // an organic edge, wider further out where the far pond spreads (the pond fades out toward open water only;
        // along the bank it stays dark and green)
        float nEdge = (fbm(vWP.xz * 0.11 + 3.7) - 0.5) * 9.0;
        float xEdge = uPond.x - 7.0 * smoothstep(-26.0, -36.0, vWP.z) + nEdge;
        float inPond = step(xEdge, vWP.x) * step(vWP.x, uPond.y) * step(uPond.z + nEdge, vWP.z) * step(vWP.z, uPond.w);
        float pondEdge = smoothstep(0.0, 3.0, min(vWP.x - xEdge, min(vWP.z - uPond.z - nEdge, uPond.w - vWP.z)) + (b3.a - 0.5) * 2.5);
        body = mix(body, cPond * mix(0.85, 1.15, b.b), inPond * pondEdge);
        vec3 col = mix(body, sky, fres * mix(1.0, 0.55, inPond * pondEdge));
        // the low sun on the ripples: a column of gold dabs under it, broken stroke by stroke
        float g = dot(R, uKeyDir);
        float glit = band(g + (b.a - 0.5) * 0.008 + (b2.a - 0.5) * 0.005, 0.995);
        float glit2 = band(g + (b.b - 0.5) * 0.014, 0.978) * band(b.a + 0.1, 0.55);
        float sunV = sunMask(vWP, (b.a - 0.5) * 0.3);
        // G: the shadows of the moving things (boat, dragonflies), with a brushed edge
        float dyn = band(dynShadow(vWP, (vec2(b.a, b2.b) - 0.5) * 4.0) + (b.b - 0.5) * 0.3, 0.5);
        float lit = sunV * (1.0 - dyn);
        col = mix(col, cGold * 1.1, glit2 * 0.75 * lit * (1.0 - inPond * pondEdge * 0.35));
        col = mix(col, vec3(1.25, 1.08, 0.86), glit * lit);
        col *= mix(1.0, 0.72, dyn * sunV);
        // the boat's wake: two arms of ripples trailing back from the bow, and the rings where the pole goes in
        vec2 bd = vWP.xz - uBoat.xy;
        vec2 hf = vec2(cos(uBoat.z), -sin(uBoat.z));
        float u = dot(bd, hf), v = dot(bd, vec2(-hf.y, hf.x));
        float behind = -(u - uBoatLen * 0.45);
        float arm = abs(abs(v) - behind * 0.3 - 0.3);
        float wake = (1.0 - band(arm + (b.a - 0.5) * 0.1, 0.04 + behind * 0.008)) * step(0.0, behind) * (1.0 - smoothstep(0.4, 1.6 + uBoat.w * 5.0, behind)) * clamp(uBoat.w * 2.5, 0.0, 1.0);
        // ripples break into dashes, never a clean line
        wake *= band(b2.a + (b.b - 0.5) * 0.3, 0.45);
        float hull = (1.0 - band(length(vec2(u / (uBoatLen * 0.62), v / 0.62)) + (b.a - 0.5) * 0.12, 1.0)) * (1.0 - band(length(vec2(u / (uBoatLen * 0.52), v / 0.5)), 1.0) * 1.0);
        vec3 foam = mix(cSkyMid, cSkyLo, 0.5) * 1.08;
        col = mix(col, foam, wake * 0.35 * (0.5 + 0.5 * b2.b));
        col = mix(col, col * 0.7, hull * 0.5);
        float pr = length(vWP.xz - uPole.xy);
        float ring = (1.0 - band(abs(pr - uPole.w * 0.45 - 0.08) + (b.a - 0.5) * 0.04, 0.035)) * uPole.z * (1.0 - smoothstep(0.3, 1.6, uPole.w));
        col = mix(col, foam, ring * 0.5 * band(b.a + (b2.b - 0.5) * 0.3, 0.42));
        // air: the warm haze thickens over the open lake
        float air = airAt(vWP);
        float gq = dot(col, vec3(0.3, 0.55, 0.15));
        col = mix(col, mix(vec3(gq), col, 0.7), air * 0.4);
        col = mix(col, airCol(vWP), air * 0.9);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  // the lake: everything left of the bank, out to the far shore
  const w = 900, d = 1000;
  const geo = new THREE.PlaneGeometry(w, d, 1, 1).rotateX(-Math.PI / 2);
  geo.translate(bankX - w / 2, WATER_Y, 60 - d / 2);
  const mesh = new THREE.Mesh(geo, m);
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

// ---------------------------------------------------------------- Trấn Quốc: a tall stupa of stacked tiers on its island, far across the water
// Built from code in the knife material, pushed deep into the air (it is a silhouette against the sunset).
export function pagoda(kb, R, { at, scale = 1, haze = 0.55 }) {
  const H0 = { haze, scale: 0.5, seed: R() };
  const brick = { col: '#6a3a3a', col2: '#9a5a4a', ...H0 };
  const eave = { col: '#4a3036', col2: '#7a5048', ...H0 };
  let y = 0;
  const tiers = 11;
  // plinth and the low wall round the yard
  kb.box(9 * scale, 1.2 * scale, 9 * scale, V3(at.x, at.y + 0.6 * scale, at.z), { col: '#7a6a70', col2: '#a8949a', ...H0 });
  y = 1.2 * scale;
  for (let i = 0; i < tiers; i++) {
    const w = (3.2 - i * 0.16) * scale, h = (1.45 - i * 0.03) * scale;
    kb.box(w, h, w, V3(at.x, at.y + y + h / 2, at.z), brick);
    // a flared eave with an upturned lip at each tier
    kb.box(w * 1.28, 0.16 * scale, w * 1.28, V3(at.x, at.y + y + h, at.z), eave);
    kb.box(w * 1.1, 0.12 * scale, w * 1.1, V3(at.x, at.y + y + h + 0.12 * scale, at.z), eave);
    y += h + 0.2 * scale;
  }
  // the lotus finial
  kb.add(new THREE.SphereGeometry(0.9 * scale, 10, 8), { col: '#8a5a48', col2: '#c89060', ...H0 }, mat(V3(at.x, at.y + y + 0.4 * scale, at.z), [0, 0, 0], [1, 0.7, 1]));
  kb.add(new THREE.ConeGeometry(0.45 * scale, 2.6 * scale, 8), { col: '#8a5a48', col2: '#c89060', ...H0 }, mat(V3(at.x, at.y + y + 1.9 * scale, at.z)));
  return at.y + y + 3.2 * scale;
}

// trees on the pagoda's island and a low temple roof beside the stupa
export function islandTrees(kb, R, { at, n = 14, spread = 16, haze = 0.55 }) {
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * spread;
    const p = V3(at.x + Math.cos(a) * r, at.y, at.z + Math.sin(a) * r * 0.6);
    const h = 5 + R() * 7;
    kb.box(0.5, h * 0.4, 0.5, V3(p.x, p.y + h * 0.2, p.z), { col: '#3a2c30', col2: '#5a4a48', haze, scale: 0.4, seed: R() });
    // a crown of a few clumps, low enough to hide the trunk
    for (let k = 0; k < 4; k++) {
      const r = 1.2 + R() * 1.3;
      kb.add(new THREE.IcosahedronGeometry(r, 1), { col: '#3e4a4a', col2: '#6a7a6a', haze, scale: 0.4, seed: R() }, mat(V3(p.x + (R() - 0.5) * 3, p.y + h * (0.35 + 0.45 * R()), p.z + (R() - 0.5) * 3), [R(), R(), 0], [1.2, 0.9, 1.1]));
    }
  }
  const s = new THREE.Shape();
  s.moveTo(-6, 0); s.lineTo(6, 0); s.lineTo(4.2, 2.6); s.lineTo(-4.2, 2.6); s.lineTo(-6, 0);
  const roof = new THREE.ExtrudeGeometry(s, { depth: 8, bevelEnabled: false }).translate(0, 0, -4);
  kb.box(10, 3, 7, V3(at.x + 9, at.y + 1.5, at.z + 4), { col: '#7a5a50', col2: '#a8807a', haze, scale: 0.4, seed: R() });
  kb.add(roof, { col: '#5a3a3a', col2: '#8a5a50', haze, scale: 0.4, seed: R() }, mat(V3(at.x + 9, at.y + 3, at.z + 4)));
}
