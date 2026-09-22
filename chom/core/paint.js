// Chớm world, core: every painted material (see core/README.md). Came from paint test G.
// Paint test G (= F + painted shadows from everything that moves, warmer spring shade).
// Chớm paint test F: every material of the living painting. F = E with the air fixed: real darks in the near and middle shade, the damp
// air only thickens far away, strokes on the lit ledges run along them, and the sun comes through the gaps as a few clear beams.
// The walls are painted like B again (real brush sheet, knife marks, stains, runs, moss, peeling paint), but in E's bright palette.
//   hero      detailed brush (the Elbriga look): dark glossy bodies, stepped light bent by real strokes, a hand-painted highlight
//   rimShell  thick offset colour bands around a hero (vermilion on the lit side, mint on the dark side), like mis-registered print
//   sketch    thin, loose white pencil-like lines drawn around heroes (and dark ink for power lines)
//   knife     the far layers: flat palette-knife patches with sharp edges, few colours, red runs down the walls
//   ground    road and pavement: horizontal knife sweeps in pink-orange and mint
//   sky, farRoofs, rain, petals, glow
// Strokes are fixed to surfaces (object-space or world-space), so they never slide when the layers shift.
import * as THREE from 'three';

const lin = (h) => new THREE.Color(h);
export const NB = 10; // warm lights the shaders know (core.light / core.lamp 0..9): 0 = a shaded lamp that points down (Xuân's stall lamp)

export const U = {
  tBrush: { value: null }, tWash: { value: null }, tKnife: { value: null }, tStrokes: { value: null },
  // a low spring sun, ahead and to the left, shining through the drizzle (set in main.js)
  uKeyDir: { value: new THREE.Vector3(-0.435, 0.375, -0.819).normalize() },
  uKeyCol: { value: lin('#fff1dc') },
  uSkyTop: { value: lin('#b4c4d2') }, uSkyLow: { value: lin('#e2cdb6') },
  // the far row of houses as seen by the sun: roof height along the street (tRoof), so every material knows where the sun reaches
  tRoof: { value: null }, uRoof: { value: new THREE.Vector4(-130, 150, -5, 16) },
  uAirSun: { value: lin('#f0d8b4') }, uFillDir: { value: new THREE.Vector3(0.3, 0.8, 0.52).normalize() },
  uMoss: { value: lin('#9aa872') }, uPeel: { value: lin('#f2e2d0') },
  uBulb: { value: Array.from({ length: NB }, () => new THREE.Vector4(0, -99, 0, 1)) },
  uBulbCol: { value: Array.from({ length: NB }, () => new THREE.Color(0, 0, 0)) },
  uRim1: { value: lin('#f2552a') }, uRim2: { value: lin('#6cd6bc') },
  // the stall lamp: a bulb under a tin shade, so its light falls in a cone
  uSpotDir: { value: new THREE.Vector3(0, -1, 0) }, uSpotCos: { value: new THREE.Vector2(0.62, 0.9) },
  // air: far things sink into the drizzle, toward the colour of the sky
  uAirNear: { value: 7 }, uAirFar: { value: 70 }, uAirMax: { value: 0.72 }, uFogCol: { value: lin('#cfd3d2') },
  uHi: { value: lin('#fff6e4') },
  uOilA: { value: lin('#ff6a3d') }, uOilB: { value: lin('#ffb85c') }, uOilC: { value: lin('#7fe6c8') },
  uAir: { value: lin('#d3d6d4') },
  uKLit: { value: lin('#fff4e4') }, uKShade: { value: lin('#b9b4c8') },
  uDrip: { value: lin('#c8321e') },
  // the fixed reference eye: everything that decides where a stroke or a line sits uses it, so nothing slides
  uRefEye: { value: new THREE.Vector3() }, uRefRight: { value: new THREE.Vector3(1, 0, 0) },
  uRefUp: { value: new THREE.Vector3(0, 1, 0) }, uRefFwd: { value: new THREE.Vector3(0, 0, -1) },
  uPx: { value: 0.0008 },      // world size of one pixel at one metre
  uTime: { value: 0 }, uPush: { value: 0 },
  uSway: { value: Array.from({ length: 6 }, () => new THREE.Vector3()) },
  uWind: { value: new THREE.Vector2(0.12, 0) },
  // G: the sun's shadow map of the street. Only the things that move are drawn into it (main.js), so the static shadows stay
  // painted capsules and nothing ever shadows itself
  tShadow: { value: null }, uShMat: { value: new THREE.Matrix4() }, uShOn: { value: 0 }, uShTexel: { value: 1 / 2048 },
  // lamps (core.lamp): a light with flag 1 lights everything (walls, crowd, balconies too); flag 2 + k also has shadow map k (0..2).
  // uBulbDir = cone axis + cos of its outer edge (-2 = all round), uBulbInner = cos of the inner edge
  uBulbFlag: { value: new Array(NB).fill(0) },
  uBulbDir: { value: Array.from({ length: NB }, () => new THREE.Vector4(0, -1, 0, -2)) },
  uBulbInner: { value: new Array(NB).fill(1) },
  tLamp0: { value: null }, tLamp1: { value: null }, tLamp2: { value: null },
  uLampMat: { value: [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()] },
  uLampTexel: { value: new THREE.Vector3(1 / 1024, 1 / 1024, 1 / 1024) },
  // 0 = no sun (night seasons); uWet: how wet the ground is (1 = Xuân's drizzle, 0 = dry)
  uSunOn: { value: 1 }, uWet: { value: 1 },
  // set only while a lamp draws its shadow map: flat cut-outs turn to face the lamp (their shadow is their silhouette)
  uFaceLight: { value: new THREE.Vector4(0, 0, 0, 0) },
  // wires and glows fade out between these distances from the camera (0, 0 = off; core.nearFade sets it)
  uNearFade: { value: new THREE.Vector2(0, 0) },
  // the cube-shadowed lamp (core.lamp(..., { shadow: 'cube' })): index, and its six face views
  uCubeLamp: { value: -1 }, uCubeMat: { value: Array.from({ length: 6 }, () => new THREE.Matrix4()) }, tCube: { value: null }, uCubeTexel: { value: new THREE.Vector2(1 / 1536, 1 / 1024) },
};

export const GLSL_NOISE = /* glsl */`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), f.x), f.y); }
float band(float x, float t){ float w = max(fwidth(x), 1e-4) * 0.75; return smoothstep(t - w, t + w, x); }
`;
const BANDV = ''; // (band needs derivatives: fragment only)

export const COMMON_GLSL = () => COMMON;
const COMMON = /* glsl */`
uniform sampler2D tBrush; uniform sampler2D tWash; uniform sampler2D tKnife;
uniform vec3 uKeyDir, uKeyCol, uSkyTop, uSkyLow, uRim1, uRim2, uHi, uOilA, uOilB, uOilC, uAir, uKLit, uKShade, uDrip;
uniform vec4 uBulb[${NB}]; uniform vec3 uBulbCol[${NB}];
uniform vec3 uRefEye, uRefRight, uRefUp, uRefFwd; uniform float uPx, uTime, uPush;
uniform vec3 uSpotDir; uniform vec2 uSpotCos; uniform float uAirNear, uAirFar, uAirMax; uniform vec3 uFogCol;
uniform sampler2D tRoof; uniform vec4 uRoof; uniform vec3 uAirSun, uFillDir, uMoss, uPeel;
uniform sampler2D tShadow; uniform mat4 uShMat; uniform float uShOn, uShTexel;
uniform float uBulbFlag[${NB}]; uniform vec4 uBulbDir[${NB}]; uniform float uBulbInner[${NB}];
uniform sampler2D tLamp0, tLamp1, tLamp2; uniform mat4 uLampMat[3]; uniform vec3 uLampTexel; uniform float uSunOn, uWet;
uniform mat4 uCubeMat[6]; uniform sampler2D tCube; uniform vec2 uCubeTexel;
${GLSL_NOISE}
// lamps: how much of a point the lamp's own casters hide from lamp i (0..1), jit in texels (a painted edge)
float lampTap(int k, vec2 uv){
  float d = 1.0;
  if (k == 0) d = textureLod(tLamp0, uv, 0.0).r;
  else if (k == 1) d = textureLod(tLamp1, uv, 0.0).r;
  else d = textureLod(tLamp2, uv, 0.0).r;
  return d;
}
// the cube-shadowed lamp: six views in one atlas (3 x 2), picked by the main axis from the lamp
float cubeShadow(int i, vec3 wp, vec2 jit){
  vec3 d = wp - uBulb[i].xyz, a = abs(d);
  int f = a.x >= a.y && a.x >= a.z ? (d.x > 0.0 ? 0 : 1) : (a.y >= a.z ? (d.y > 0.0 ? 2 : 3) : (d.z > 0.0 ? 4 : 5));
  vec4 c = uCubeMat[f] * vec4(wp, 1.0);
  vec3 q = c.xyz / max(c.w, 1e-5) * 0.5 + 0.5;
  float res = 0.0;
  if (c.w > 0.0 && q.z < 1.0) {
    vec2 cell = vec2(mod(float(f), 3.0), floor(float(f) / 3.0));
    vec2 lo = (cell + 0.004) / vec2(3.0, 2.0), hi = (cell + 0.996) / vec2(3.0, 2.0);
    vec2 uv = (cell + clamp(q.xy, 0.0, 1.0)) / vec2(3.0, 2.0) + jit * uCubeTexel;
    float z = q.z - 0.0008;
    float o = step(textureLod(tCube, clamp(uv, lo, hi), 0.0).r, z);
    o += step(textureLod(tCube, clamp(uv + vec2(1.6, 0.6) * uCubeTexel, lo, hi), 0.0).r, z);
    o += step(textureLod(tCube, clamp(uv + vec2(-0.6, 1.6) * uCubeTexel, lo, hi), 0.0).r, z);
    o += step(textureLod(tCube, clamp(uv + vec2(-1.6, -0.6) * uCubeTexel, lo, hi), 0.0).r, z);
    o += step(textureLod(tCube, clamp(uv + vec2(0.6, -1.6) * uCubeTexel, lo, hi), 0.0).r, z);
    res = o / 5.0;
  }
  return res;
}
float lampShadow(int i, vec3 wp, vec2 jit){
  int k = int(uBulbFlag[i] + 0.5) - 2;
  float res = 0.0;
  if (k == 3) {
    res = cubeShadow(i, wp, jit);
  } else if (k >= 0 && k <= 2) {
    vec4 c = uLampMat[k] * vec4(wp, 1.0);
    vec3 q = c.xyz / max(c.w, 1e-5) * 0.5 + 0.5;
    if (c.w > 0.0 && q.x > 0.002 && q.x < 0.998 && q.y > 0.002 && q.y < 0.998 && q.z < 1.0) {
      float tx = uLampTexel[k];
      vec2 uv = q.xy + jit * tx;
      float z = q.z - 0.0006;
      float o = step(lampTap(k, uv), z);
      o += step(lampTap(k, uv + vec2(1.6, 0.6) * tx), z);
      o += step(lampTap(k, uv + vec2(-0.6, 1.6) * tx), z);
      o += step(lampTap(k, uv + vec2(-1.6, -0.6) * tx), z);
      o += step(lampTap(k, uv + vec2(0.6, -1.6) * tx), z);
      res = o / 5.0;
    }
  }
  return res;
}
// G: how much of a point the moving things hide from the sun (0..1). jit: a painted wobble of the edge, in shadow-map texels,
// taken from strokes fixed in the world, so a still shadow never crawls; the caller cuts the result into a hard painted edge
float dynShadow(vec3 wp, vec2 jit){
  if (uShOn < 0.5) return 0.0;
  vec3 q = (uShMat * vec4(wp, 1.0)).xyz * 0.5 + 0.5;
  if (q.x <= 0.002 || q.x >= 0.998 || q.y <= 0.002 || q.y >= 0.998 || q.z >= 1.0) return 0.0;
  vec2 uv = q.xy + jit * uShTexel;
  float z = q.z - 0.00012;
  float o = step(texture2D(tShadow, uv).r, z);
  o += step(texture2D(tShadow, uv + vec2(1.6, 0.6) * uShTexel).r, z);
  o += step(texture2D(tShadow, uv + vec2(-0.6, 1.6) * uShTexel).r, z);
  o += step(texture2D(tShadow, uv + vec2(-1.6, -0.6) * uShTexel).r, z);
  o += step(texture2D(tShadow, uv + vec2(0.6, -1.6) * uShTexel).r, z);
  return o / 5.0;
}
// where the sun reaches: follow the ray toward the sun to the far row of house fronts and compare with the roof there
float sunMask(vec3 wp, float jit){
  if (wp.x < uRoof.z + 0.2) return 1.0;
  float t = (uRoof.z - wp.x) / min(uKeyDir.x, -1e-3);
  vec3 h = wp + uKeyDir * t;
  float top = texture2D(tRoof, vec2((h.z - uRoof.x) / uRoof.y, 0.5)).r * uRoof.w;
  return band(h.y - top + jit, 0.0);
}
// the drizzle glows warm toward the sun and stays a pale cream elsewhere
vec3 airCol(vec3 wp){
  float f = max(dot(normalize(wp - cameraPosition), uKeyDir), 0.0);
  return mix(uAir, uAirSun, f * f);
}
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * vn(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
float lightAt(int i, vec3 wp, out vec3 L){
  vec3 Lv = uBulb[i].xyz - wp; float d = length(Lv); L = Lv / d;
  float att = clamp(1.0 - d / uBulb[i].w, 0.0, 1.0); att *= att;
  if (i == 0 && uBulbFlag[0] < 0.5) att *= smoothstep(uSpotCos.x, uSpotCos.y, dot(-L, uSpotDir)) * 1.6;
  if (uBulbDir[i].w > -1.5) att *= smoothstep(uBulbDir[i].w, uBulbInner[i], dot(-L, uBulbDir[i].xyz));
  return att;
}
// a lamp's light on a surface, in painted steps, cut by its shadow (for walls, the crowd, the ground)
vec3 lampsOn(vec3 alb, vec3 wp, vec3 N, vec3 lift, float j, vec2 jit, float shK){
  vec3 add = vec3(0.0);
  for (int i = 0; i < ${NB}; i++) {
    if (uBulbFlag[i] < 0.5) continue;
    vec3 Ld; float att = lightAt(i, wp, Ld);
    if (att <= 0.0) continue;
    float e = att * (0.3 + 0.7 * max(dot(N, Ld), 0.0));
    float sh = shK > 0.0 ? band(lampShadow(i, wp + lift, jit) + j * 0.6, 0.5) * shK : 0.0;
    e *= 1.0 - sh;
    float ej = e + j * 0.2;
    float qq = band(ej, 0.025) * 0.35 + band(ej, 0.1) * 0.35 + band(ej, 0.28) * 0.3;
    add += alb * uBulbCol[i] * qq;
  }
  return add;
}
// F: the damp air eases in late (nothing in the middle distance goes milky) and never quite swallows the far end
float airAt(vec3 wp){ float d = length(cameraPosition - wp); float t = smoothstep(uAirNear, uAirFar, d); return uAirMax * pow(t, 1.35); }
vec4 brushTri(vec3 p, vec3 n, float vert, out vec3 pert, out vec2 uvOut){
  vec3 an = abs(n);
  vec3 sg = sign(n + 1e-4);
  vec3 Tx = vec3(0., 0., -sg.x), Bx = vec3(0., 1., 0.);
  vec3 Ty = vec3(1., 0., 0.),    By = vec3(0., 0., -sg.y);
  vec3 Tz = vec3(sg.z, 0., 0.),  Bz = vec3(0., 1., 0.);
  if (vert > 0.5) { vec3 t = Tx; Tx = Bx; Bx = t; t = Tz; Tz = Bz; Bz = t; }
  vec2 ux = vec2(dot(p, Tx), dot(p, Bx)) + vec2(0.37, 0.11);
  vec2 uy = vec2(dot(p, Ty), dot(p, By)) + vec2(0.71, 0.53);
  vec2 uz = vec2(dot(p, Tz), dot(p, Bz));
  vec4 sx = texture2D(tBrush, ux), sy = texture2D(tBrush, uy), sz = texture2D(tBrush, uz);
  vec3 w = an * an; w *= w; w /= (w.x + w.y + w.z);
  vec3 hb = w * (0.35 + vec3(sx.a, sy.a, sz.a));
  float m = max(hb.x, max(hb.y, hb.z));
  vec3 k = smoothstep(m - 0.08, m, hb); k /= (k.x + k.y + k.z);
  vec2 nx = sx.rg * 2. - 1., ny = sy.rg * 2. - 1., nz = sz.rg * 2. - 1.;
  pert = k.x * (nx.x * Tx + nx.y * Bx) + k.y * (ny.x * Ty + ny.y * By) + k.z * (nz.x * Tz + nz.y * Bz);
  uvOut = k.x > 0.5 ? ux : (k.y > 0.5 ? uy : uz);
  return sx * k.x + sy * k.y + sz * k.z;
}
// B's trick: far surfaces get bigger strokes (picked stroke by stroke, from the fixed eye), so a stroke keeps its size on screen
vec4 brush3(vec3 p, vec3 n, float vert, float dRef, out vec3 pert, out vec2 uvOut){
  vec3 pn, pf, pg; vec2 un, uf, ug;
  vec4 bn = brushTri(p, n, vert, pn, un);
  vec4 bf = brushTri(p / 3.0 + vec3(0.41, 0.17, 0.73), n, vert, pf, uf);
  vec4 bg = brushTri(p / 9.0 + vec3(0.13, 0.57, 0.29), n, vert, pg, ug);
  float pick = smoothstep(-0.03, 0.03, bf.a - (1.0 - smoothstep(9.0, 26.0, dRef)) * 1.05);
  float pick2 = smoothstep(-0.03, 0.03, bg.a - (1.0 - smoothstep(30.0, 64.0, dRef)) * 1.05);
  pert = mix(mix(pn, pf, pick), pg, pick2);
  uvOut = pick2 > 0.5 ? ug : (pick > 0.5 ? uf : un);
  return mix(mix(bn, bf, pick), bg, pick2);
}
// F: strokes with a direction. A = the way the brush ran on this face (along a ledge, down a wall). The real sheet is stretched
// along A, three sizes laid over each other (the big ones win where their paint is thick), so marks gather in streaks, never dots.
vec4 brushDir(vec3 p, vec3 n, vec3 A, float dRef, out vec3 pert, out vec2 uvOut){
  vec3 B = normalize(cross(n, A));
  A = normalize(cross(B, n));
  vec2 c = vec2(dot(p, A), dot(p, B));
  vec2 u1 = c * vec2(0.3, 1.9) + vec2(0.37, 0.11);
  vec2 u2 = c * vec2(0.3, 1.9) / 2.7 + vec2(0.61, 0.43);
  vec2 u3 = c * vec2(0.3, 1.9) / 7.0 + vec2(0.19, 0.77);
  vec4 s1 = texture2D(tBrush, u1), s2 = texture2D(tBrush, u2), s3 = texture2D(tBrush, u3);
  float far = smoothstep(9.0, 26.0, dRef), far2 = smoothstep(30.0, 64.0, dRef);
  float pk2 = smoothstep(-0.04, 0.04, s2.a - 0.62 + far * 0.6);
  float pk3 = smoothstep(-0.04, 0.04, s3.a - 0.72 + far2 * 0.7);
  vec2 n1 = s1.rg * 2. - 1., n2 = s2.rg * 2. - 1., n3 = s3.rg * 2. - 1.;
  vec2 nn = mix(mix(n1, n2, pk2), n3, pk3);
  pert = nn.x * A + nn.y * B;
  uvOut = pk3 > 0.5 ? u3 : (pk2 > 0.5 ? u2 : u1);
  return mix(mix(s1, s2, pk2), s3, pk3);
}
`;

// wind: a slow breeze that grows with aSway, plus the gust from the cursor (a damped spring per group)
const WIND_DECL = /* glsl */`
${'#'}ifdef WIND
attribute float aSway; attribute float aTree;
uniform vec3 uSway[6]; uniform float uTime;
${'#'}endif`;
const WIND_APPLY = /* glsl */`
${'#'}ifdef WIND
  {
    float ph = wp.x * 1.3 + wp.y * 0.9 + aTree * 2.1;
    vec3 breeze = vec3(sin(uTime * 1.1 + ph), 0.2 * sin(uTime * 1.7 + ph * 1.3), cos(uTime * 0.83 + ph * 1.3)) * 0.02;
    wp.xyz += (breeze + uSway[int(aTree + 0.5)]) * aSway;
  }
${'#'}endif`;

// ---------------------------------------------------------------- hero
const heroVert = /* glsl */`
attribute vec3 aSN; attribute vec3 aCol; attribute vec3 aCol2; attribute vec4 aPar; attribute vec4 aPar2;
${WIND_DECL}
varying vec3 vOP, vON, vWP, vWSN, vCol, vCol2; varying vec4 vPar, vPar2;
varying vec3 vM0, vM1, vM2;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  ${WIND_APPLY}
  vOP = position * aPar.w; vON = normal; vWP = wp.xyz;
  vM0 = normalize(modelMatrix[0].xyz); vM1 = normalize(modelMatrix[1].xyz); vM2 = normalize(modelMatrix[2].xyz);
  vWSN = mat3(vM0, vM1, vM2) * aSN;
  vCol = aCol; vCol2 = aCol2; vPar = aPar; vPar2 = aPar2;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
// aPar  = gloss, erode, emit, stroke scale (tiles per metre)
// aPar2 = highlight, vertical strokes, haze, bump
const heroFrag = /* glsl */`
${COMMON}
uniform float uTier, uGlass, uRecv; uniform vec2 uNear;
varying vec3 vOP, vON, vWP, vWSN, vCol, vCol2; varying vec4 vPar, vPar2;
varying vec3 vM0, vM1, vM2;
void main(){
  vec3 No = normalize(vON);
  vec3 pert; vec2 uvS;
  float dRef = length(uRefEye - vWP);
  vec4 b = brush3(vOP, No, vPar2.y, dRef * 0.35, pert, uvS);
  float tone = b.b, det = b.a;
  if (uNear.y > 0.0 && length(cameraPosition - vWP) < mix(uNear.x, uNear.y, det)) discard;
  mat3 m3 = mat3(normalize(vM0), normalize(vM1), normalize(vM2));
  vec3 Ns = normalize(m3 * No);
  vec3 N = normalize(m3 * normalize(No + pert * vPar2.w));
  vec3 V = normalize(cameraPosition - vWP);
  if (dot(Ns, V) < 0.0) { N = -N; Ns = -Ns; }
  vec3 SN = normalize(vWSN);
  vec3 Vr = normalize(uRefEye - vWP);
  // paint eaten away at the silhouette, following the strokes (reference eye: it stays put when the layers shift)
  float fres = 1.0 - abs(dot(SN, Vr));
  float ev = pow(fres, 1.5) * vPar.y - (det * 0.8 + 0.12);
  float cover = 1.0 - smoothstep(-0.03, 0.03, ev);
  if (cover < 0.02) discard;
  // secondary things (tier > 0) keep full strokes but less contrast
  float tierK = clamp(max(vPar2.z, uTier) * 4.0, 0.0, 1.0);

  // albedo broken stroke by stroke (B), knife scrapes, and a few stains on the secondary things
  vec3 alb = mix(vCol, vCol2, band(tone + (det - 0.5) * 0.3, 0.55) * mix(0.4, 0.6, tierK));
  vec4 wsh = texture2D(tWash, uvS * 0.37 + vec2(0.21, 0.63));
  float stain = band(wsh.r * 0.9 + (tone - 0.5) * 0.3, 0.55) * tierK;
  alb = mix(alb, alb * vec3(0.84, 0.8, 0.78), stain * 0.6);
  float scrape = band(texture2D(tKnife, uvS * 0.6).g + (det - 0.5) * 0.3, 0.8);
  alb = mix(alb, mix(alb, vCol2, 0.8), scrape * 0.55);

  // sun: three steps of light, the edges bent by the strokes, cut where the far roofs hide the sun
  float j = (tone - 0.5) * 0.45 + (det - 0.5) * 0.2;
  float sunV = sunMask(vWP, (det - 0.5) * 0.35) * uSunOn;
  if (uRecv > 0.5) sunV *= 1.0 - band(dynShadow(vWP + Ns * 0.04, (vec2(det, tone) - 0.5) * 5.0) + (tone - 0.5) * 0.3, 0.5);
  float ndl = dot(N, uKeyDir);
  float q = (0.38 * band(ndl, -0.12 + j * 0.5) + 0.62 * band(ndl, 0.22 + j * 0.5)) * sunV;
  float Eb = 0.0; vec3 Cb = vec3(0.0);
  float spotE = 0.0;
  for (int i = 0; i < ${NB}; i++) {
    vec3 Ld; float att = lightAt(i, vWP, Ld);
    if (uBulbFlag[i] > 1.5) att *= 1.0 - band(lampShadow(i, vWP + Ns * 0.03, (vec2(det, tone) - 0.5) * 4.0) + (tone - 0.5) * 0.3, 0.5);
    float e = (max(dot(N, Ld), 0.0) * 0.85 + 0.15) * att;
    Eb += e; Cb += uBulbCol[i] * e;
    if (i == 0) spotE = max(dot(N, Ld), 0.0) * att;
  }
  float qb = band(Eb, 0.2 * (1.0 + j));
  vec3 bulbHue = Cb / max(Eb, 1e-4);
  vec3 amb = mix(uSkyLow, uSkyTop, N.y * 0.5 + 0.5);
  // shade: the open sky fills from above and behind, one more step so the strokes still read in the shade
  float fq = band(dot(N, uFillDir) + j * 0.7, 0.45);
  vec3 shade = mix(alb, vCol2, 0.1 * tone) * amb * mix(0.78, 0.98, fq);
  shade *= mix(vec3(1.0), mix(vec3(1.04, 0.97, 1.05), vec3(0.95, 1.0, 1.04), tone), 0.8);
  vec3 lit = mix(alb, vCol2, 0.45 + 0.4 * band(tone + (det - 0.5) * 0.2, 0.5)) * uKeyCol * mix(vec3(1.05, 0.97, 0.92), vec3(0.98, 1.0, 1.02), tone);
  vec3 col = mix(shade, lit, q);
  col = mix(col, max(col, vCol2 * bulbHue), qb * 0.55);
  // under the stall lamp: a hot, stepped pool of light
  col = mix(col, vCol2 * uBulbCol[0] * 1.25 + 0.04, band(spotE * (0.8 + 0.4 * tone), 0.35) * 0.7);

  // oily reflection of the sky, colours shift stroke by stroke
  vec4 b2 = texture2D(tBrush, uvS.yx * vec2(1.73, 1.31) + vec2(0.29, 0.61));
  vec3 R = reflect(-V, N);
  float ph = fract(R.y * 0.8 + R.x * 0.35 + b2.b * 0.7);
  vec3 oil = mix(mix(uOilA, uOilB, band(ph, 0.42)), uOilC, band(ph, 0.72));
  float om = band(pow(fres, 1.3) * 0.75 + b2.a * 0.45 + R.y * 0.15, 0.78) * vPar.x;
  col = mix(col, oil * (0.75 + 0.25 * q), om * 0.8);
  // hand-painted highlight: a stroke-shaped cut of the sun's highlight
  vec3 H = normalize(uKeyDir + V);
  float nh = max(dot(normalize(Ns + (N - Ns) * 0.45), H), 0.0);
  float hs = pow(nh, 30.0) * (0.35 + 1.1 * b2.a) * (0.6 + 0.8 * det) * (0.25 + 0.75 * sunV);
  float hl = band(hs, 0.55) * min(vPar2.x, 1.0) + band(hs, 0.3) * max(vPar2.x - 1.0, 0.0);
  col = mix(col, uHi, hl);
  // the low sun behind the edge: a thin warm rim, broken by the strokes
  float rimS = band(fres * max(dot(Ns, uKeyDir) + 0.35, 0.0) * sunV + (det - 0.5) * 0.25, 0.42);
  col = mix(col, mix(vCol2, uHi, 0.6) * uKeyCol, rimS * 0.6 * (1.0 - tierK * 0.5));
  col += vCol2 * vPar.z * (0.8 + 0.4 * tone);
  #ifdef GLASS
  if (uGlass > 0.0) {
    // (only the bottle's material has this: in a shared shader the branch would be paid by every painted thing)
    // the sun through the bottle's glass. It reads as glass: bands of light and dark that run along the body (lit through
    // the middle, dark in the thick glass toward the sides), their edges eaten by the strokes and softly bled, never loose
    // spots; the teal of the glass stays, warmed by the sun (uGlass: how strongly; above 1 it gets hotter)
    float tr = 1.35 * max(uGlass, 1.0) * pow(max(dot(-V, uKeyDir), 0.0), 1.2) * sunV * (0.55 + 0.45 * fres) * step(vCol.r, vCol.b);
    float through = smoothstep(0.2, 0.75, tr) * min(uGlass, 1.0) * (1.0 - step(0.7, abs(No.y)));
    // across the face: -1 .. 1 (the body is 0.105 wide and 0.05 deep)
    vec3 P = vOP / max(vPar.w, 1e-3);
    vec3 Th = vec3(-No.z, 0.0, No.x);
    Th = length(Th) > 1e-3 ? normalize(Th) : vec3(1.0, 0.0, 0.0);
    float u = dot(P, Th) / (abs(Th.x) * 0.0525 + abs(Th.z) * 0.025);
    // the bands wander slowly across (the wash), and their edges are eaten lengthwise by strokes stretched along the body
    float hot = max(uGlass, 1.0);
    float wander = (texture2D(tWash, vec2(u * 0.05 + 0.3, P.y * 0.8 + 0.2)).r - 0.5) * 0.3;
    vec4 n2 = texture2D(tBrush, vec2(u * 0.06 + 0.61, P.y * 5.0 + 0.19));
    float au = abs(u + wander) + (n2.a - 0.5) * 0.14 + (n2.b - 0.5) * 0.05;
    // a hotter glass (uGlass > 1) is lit across more of its width
    float lw = 0.5 + min(hot - 1.0, 0.4);
    // the narrow sides (the glass seen edge-on) let less through; the hot middle is a soft swell, not a stripe
    float lightB = (0.75 * (1.0 - band(au, lw)) + 0.25 * (1.0 - smoothstep(lw - 0.3, lw + 0.25, au))) * mix(1.0, 0.4, abs(Th.z));
    float hotB = (1.0 - smoothstep(0.0, lw * 0.75, au)) * (1.0 - abs(Th.z));
    float ad = au + fres * 0.7;
    float darkB = 0.7 * band(ad, lw + 0.3) + 0.3 * smoothstep(lw, lw + 0.55, ad);
    vec3 tealL = vec3(0.14, 0.55, 0.5);
    vec3 amber = vec3(1.0, 0.74, 0.38);
    col = mix(col, vec3(0.03, 0.19, 0.18) * uKeyCol, darkB * through * 0.75);
    col = mix(col, mix(tealL, amber, 0.22 + 0.4 * min(hot - 1.0, 1.0)) * uKeyCol * hot, lightB * through * 0.85);
    col = mix(col, mix(tealL, amber, 0.7) * uKeyCol * hot, hotB * through * 0.55);
  }
  #endif
  // air in tiers: the object's own tier (vPar2.z) and the distance, whichever is more
  float air = max(max(vPar2.z, uTier), airAt(vWP));
  float g = dot(col, vec3(0.3, 0.55, 0.15));
  col = mix(col, mix(vec3(g), col, 0.6), air * 0.5);
  col = mix(col, airCol(vWP), air);
  gl_FragColor = vec4(col, cover);
}`;

export function heroMaterial({ wind = false, tier = 0, glass = 0, receive = false } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uTier: { value: tier }, uGlass: { value: glass }, uRecv: { value: receive ? 1 : 0 }, uNear: { value: new THREE.Vector2(0, 0) } }, vertexShader: heroVert, fragmentShader: heroFrag,
    defines: { ...(wind ? { WIND: '' } : {}), ...(glass > 0 ? { GLASS: '' } : {}) }, alphaToCoverage: true,
  });
}

// ---------------------------------------------------------------- offset colour rims
const rimVert = /* glsl */`
attribute vec3 aSN; attribute vec4 aPar;
${WIND_DECL}
uniform vec3 uRefEye, uRefRight, uRefUp; uniform float uPx;
uniform float uW; uniform vec2 uOff;
varying vec3 vOP, vSNo, vWSN;
${GLSL_NOISE.split('float band')[0]}
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  ${WIND_APPLY}
  vec3 sn = normalize(mat3(modelMatrix) * aSN);
  // band width in screen pixels: set from the fixed eye, eased toward the real camera so a close look keeps it fine
  float px = uPx * mix(length(uRefEye - wp.xyz), length(cameraPosition - wp.xyz), 0.7);
  float wob = 0.6 + 0.8 * vn(position.xy * 7.0 + position.z * 4.0 + uOff * 3.0);
  wp.xyz += sn * uW * px * wob + (uRefRight * uOff.x + uRefUp * uOff.y) * px;
  vOP = position * aPar.w; vSNo = aSN; vWSN = sn;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const rimFrag = /* glsl */`
${COMMON}
uniform vec3 uColor; uniform float uSide; uniform float uCut;
varying vec3 vOP, vSNo, vWSN;
void main(){
  vec3 pert; vec2 uvS;
  vec4 b = brushTri(vOP * 0.6 + 0.3, normalize(vSNo), 0.0, pert, uvS);
  vec3 L2 = normalize(uRefRight * dot(uKeyDir, uRefRight) + uRefUp * dot(uKeyDir, uRefUp));
  float s = dot(normalize(vWSN), L2) * uSide;
  float side = band(s + (b.b - 0.5) * 0.7, -0.12);
  float a = side * band(b.a + 0.3 + s * 0.25, uCut);
  if (a < 0.02) discard;
  gl_FragColor = vec4(uColor * (0.86 + 0.28 * b.b), a);
}`;

export function rimMaterial({ color, side, width, off, cut = 0.5, wind = false }) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uColor: { value: color }, uSide: { value: side }, uW: { value: width }, uOff: { value: new THREE.Vector2(...off) }, uCut: { value: cut } },
    vertexShader: rimVert, fragmentShader: rimFrag, side: THREE.BackSide, alphaToCoverage: true,
    defines: wind ? { WIND: '' } : {},
  });
}

// ---------------------------------------------------------------- loose sketch lines (ribbons, constant pixel width)
const sketchVert = /* glsl */`
attribute vec3 aTan; attribute vec4 aRib; attribute float aLen;
${WIND_DECL}
uniform vec3 uRefEye, uRefFwd; uniform float uPx; uniform vec2 uNearFade;
// uMove: how the line lives — x 0 still · 1 drawn again and again (a hand's boil) · 2 a light running round it;
// y how fast, z how much. Only the bottle's line has it (core/world.js), and it stands still with motion turned down.
uniform vec4 uMove; uniform float uTime;
varying float vSide, vAlong, vA, vS, vSeed, vNear;
float sHash(vec2 p){ vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  ${WIND_APPLY}
  vNear = uNearFade.y > 0.0 ? smoothstep(uNearFade.x, uNearFade.y, length(cameraPosition - wp.xyz)) : 1.0;
  vec3 t = normalize(mat3(modelMatrix) * aTan);
  vec3 sd = normalize(cross(uRefFwd, t));
  float d = length(uRefEye - wp.xyz);
  float taper = 0.35 + 0.65 * sqrt(max(sin(3.14159 * aRib.y), 0.0));
  wp.xyz += sd * aRib.x * aRib.z * taper * 0.5 * uPx * d;
  // the hand draws it again: every few hundredths of a second the whole line is laid down a hair to one side, as a drawn
  // line does in hand-made animation. The same frame for the whole line, so it lives all at once and goes nowhere.
  if (uMove.x > 0.5 && uMove.x < 1.5) {
    float fr = floor(uTime * max(uMove.y, 1.0));
    float n = sHash(vec2(floor(aRib.y * 14.0) + aRib.w * 3.0, fr));
    float n2 = sHash(vec2(floor(aRib.y * 5.0) + 7.0, fr + 31.0));
    wp.xyz += sd * ((n - 0.5) * 0.7 + (n2 - 0.5) * 0.3) * uMove.z * uPx * d;
  }
  vSide = aRib.x; vAlong = aRib.y; vA = aRib.w; vS = aLen / (uPx * d); vSeed = fract(aRib.w * 91.7);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const sketchFrag = /* glsl */`
uniform vec3 uColor; uniform float uFade; uniform float uDry; uniform vec4 uMove; uniform float uTime;
// uEdge: how the line holds up over a bright scene — x 0 nothing · 1 a thin dark lip along its outer side ·
// 3 a soft dark breath behind it; y how strong, and uInk the dark it uses. (Way 2, the whole line in ink, only changes uColor.)
uniform vec4 uEdge; uniform vec3 uInk;
varying float vSide, vAlong, vA, vS, vSeed, vNear;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), f.x), f.y); }
void main(){
  float prof = 1.0 - smoothstep(0.45, 1.0, abs(vSide));
  float dry = mix(1.0, smoothstep(0.28, 0.42, vn(vec2(vS * 0.045, vSeed * 37.0)) * 0.7 + vn(vec2(vS * 0.3, vSeed * 11.0)) * 0.3), uDry);
  float a = prof * dry * min(vA * 4.0, 1.0) * uFade * vNear;
  vec3 col = uColor;
  // a light running round the line: the line rests a little quieter, and one length of it comes up full and thicker as the
  // light passes — the line is already near white, so the way to see it is weight, not a brighter white
  if (uMove.x > 1.5) {
    float t = fract(vAlong - uTime * uMove.y * 0.1 + vSeed * 0.37);
    float band = smoothstep(0.22, 0.0, min(t, 1.0 - t));
    float wide = 1.0 - smoothstep(0.62, 1.05, abs(vSide));        // the same stroke, laid on thicker
    a = min(1.0, mix(a * 0.5, max(a, wide * dry * min(vA * 4.0, 1.0) * uFade * vNear), band * min(uMove.z, 1.0)));
    col = mix(col, vec3(1.0), band * 0.3);
  }
  // the hand's boil eats the line in different places each time it is laid down
  if (uMove.x > 0.5 && uMove.x < 1.5) {
    float fr = floor(uTime * max(uMove.y, 1.0));
    a *= mix(1.0, 0.55 + 0.45 * vn(vec2(vS * 0.05 + fr * 5.7, vSeed * 23.0)), min(uMove.z, 1.0) * 0.5);
  }
  // the dark lip: the outer third of the same stroke is laid in ink, so the white has an edge to sit against on a bright scene
  if (uEdge.x > 0.5 && uEdge.x < 1.5) {
    float outer = smoothstep(0.1, 0.72, vSide * uEdge.z);
    col = mix(col, uInk, outer * uEdge.y);
  }
  // a breath of dark behind the white: the skirt of the stroke, where the paint is already thinning out
  if (uEdge.x > 2.5) {
    float skirt = smoothstep(0.3, 1.0, vSide * uEdge.z);
    float soft = 1.0 - smoothstep(0.75, 1.35, abs(vSide));
    col = mix(col, uInk, skirt * uEdge.y);
    a = max(a, skirt * soft * 0.55 * uEdge.y * dry * uFade * vNear);
  }
  if (a < 0.02) discard;
  gl_FragColor = vec4(col, a);
}`;

export function sketchMaterial({ color = '#fbf5e8', dry = 1, wind = false, move = null, edge = null, ink = '#2b2320' } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uRefEye: U.uRefEye, uRefFwd: U.uRefFwd, uPx: U.uPx, uTime: U.uTime, uSway: U.uSway, uColor: { value: lin(color) }, uFade: { value: 1 }, uDry: { value: dry }, uNearFade: U.uNearFade, uMove: { value: new THREE.Vector4(...(move || [0, 0, 0, 0])) }, uEdge: { value: new THREE.Vector4(...(edge || [0, 0, 1, 0])) }, uInk: { value: lin(ink) } },
    vertexShader: sketchVert, fragmentShader: sketchFrag, alphaToCoverage: true, side: THREE.DoubleSide,
    defines: wind ? { WIND: '' } : {},
  });
}

// ---------------------------------------------------------------- palette knife (far layers)
const knifeVert = /* glsl */`
attribute vec3 aCol; attribute vec3 aCol2; attribute vec4 aK; attribute vec4 aK2;
${WIND_DECL}
uniform vec3 uRefRight, uRefUp, uRefFwd;
uniform vec3 uShift;
varying vec3 vWP, vCol, vCol2; varying vec4 vK, vK2;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  ${WIND_APPLY}
  vWP = wp.xyz;
  // the flat offset print sits behind the painted wall, so it only shows as a mis-registered edge.
  // F: pushed straight away from the eye (so it is always behind its own wall, even a wall seen edge-on) and nudged on screen;
  // E pushed it along the view axis, which slid the far row's print out in front of its fronts and veiled them in lilac
  vCol = aCol; vCol2 = aCol2; vK = aK; vK2 = aK2;
  vec4 mv = viewMatrix * wp;
  mv.xyz *= 1.0 + uShift.z;
  gl_Position = projectionMatrix * mv;
  gl_Position.xy += uShift.xy * gl_Position.w;
}`;
// aK  = stroke scale (tiles per metre), weathering + red runs, emit, haze
// aK2 = seed, flat (1 = recessed: a fixed half light), 0, 0
const knifeFrag = /* glsl */`
${COMMON}
uniform float uFlat; uniform vec3 uFlatCol; uniform vec2 uNear;
varying vec3 vWP, vCol, vCol2; varying vec4 vK, vK2;
void main(){
  if (uFlat > 0.5) { gl_FragColor = vec4(uFlatCol, 1.0); return; }
  if (uNear.y > 0.0 && length(cameraPosition - vWP) < mix(uNear.x, uNear.y, hash12(floor(gl_FragCoord.xy / 3.0)))) discard;
  vec3 Nf = normalize(cross(dFdx(vWP), dFdy(vWP)));
  if (dot(Nf, cameraPosition - vWP) < 0.0) Nf = -Nf;
  vec3 an = abs(Nf);
  float dRef = length(uRefEye - vWP);
  float sc = vK.x;
  // walls take vertical strokes, slabs and ledges lie flat
  float vert = step(sc, 0.5) * (1.0 - step(0.6, an.y));
  vec3 pert; vec2 uvS;
  // F: which way the brush ran. aK2.z: 1 = a ledge or slab long along x, 2 = long along z, 3 = a post (long along y);
  // 0 = a wall mass: its strokes run down the face (B). Tops of walls and the end caps of ledges keep the old cross-hatch.
  float ax = vK2.z;
  vec3 A = ax > 2.5 ? vec3(0.0, 1.0, 0.0) : (ax > 1.5 ? vec3(0.0, 0.0, 1.0) : (ax > 0.5 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
  float ledgeK = step(0.5, ax) * step(ax, 2.5);
  float useDir = (ax > 0.5 ? 1.0 : vert) * step(abs(dot(Nf, A)), 0.7);
  vec3 pAt = vWP * max(sc, 0.3) + vK2.x * 5.0;
  vec4 b;
  vec3 Bf = vec3(0.0);
  if (useDir > 0.5) { b = brushDir(pAt, Nf, A, dRef, pert, uvS); Bf = normalize(cross(Nf, A)); }
  else b = brush3(pAt, Nf, vert, dRef, pert, uvS);
  float tone = b.b, det = b.a;
  // real palette-knife marks under the strokes (dragged the same way as the brush on a ledge)
  vec2 uv = (an.z > max(an.x, an.y) ? vWP.xy : (an.x > an.y ? vWP.zy : vWP.xz)) * sc + vK2.x;
  vec2 fcd = vec2(dot(vWP, A), dot(vWP, Bf)) * sc;
  uv = mix(uv, fcd * vec2(0.45, 2.2) + vK2.x, useDir * ledgeK);
  vec4 k = texture2D(tKnife, uv * vec2(0.55, 0.42));
  vec4 k2 = texture2D(tKnife, uv.yx * vec2(0.33, 0.5) + 0.31);
  vec3 alb = mix(vCol * 0.9, vCol2 * 1.03, band(tone + (k.r - 0.5) * 0.35, 0.5));
  // pale dragged paint: on a ledge it follows the strokes (long bands), elsewhere the knife
  float dl = useDir * ledgeK;
  float drag = mix(k2.r + (k.g - 0.5) * 0.2 + (det - 0.5) * 0.2, tone * 0.55 + k2.r * 0.35 + (det - 0.5) * 0.3, dl);
  alb = mix(alb, mix(vCol2, vec3(1.0, 0.97, 0.9), 0.35), band(drag, mix(0.78, 0.64, dl)) * 0.7);
  // weathering, fixed in the world (B): stains, rain runs, moss under the ledges, peeling lime wash
  float weather = max(vK.y, mix(0.35, 0.12, ledgeK) * step(sc, 0.9) * (1.0 - vK2.y));
  vec2 wq = vec2(vWP.x * an.z + vWP.z * an.x + vWP.x * an.y, vWP.y + vWP.z * an.y);
  wq = mix(wq, vec2(dot(vWP, A) * 0.3, dot(vWP, Bf) * 2.0), useDir * ledgeK);
  vec4 w1 = texture2D(tWash, wq * vec2(0.085, 0.07) + vec2(0.13, 0.41) + vK2.x);
  vec4 w2 = texture2D(tWash, wq * vec2(0.047, 0.036) + vec2(0.61, 0.27));
  vec4 w3 = texture2D(tWash, wq * vec2(0.11, 0.028) + vec2(0.37, 0.83));
  float stain = band(w1.r * 0.55 + w2.r * 0.6 + (tone - 0.5) * 0.16, 0.5);
  float streak = band(w3.g * (0.6 + 0.4 * w2.g) + (det - 0.5) * 0.12, 0.5);
  float ledge = 1.0 - smoothstep(0.3, 1.6, fract(vWP.y / 3.2 + 0.02) * 3.2);
  float moss = band(w1.b * (0.5 + ledge) + w3.g * 0.35 * ledge + (tone - 0.5) * 0.2, 0.62);
  float pv = w2.b * 0.8 + w1.g * 0.45 + (det - 0.5) * 0.3;
  float peel = band(pv, 0.74);
  float peelEdge = peel * (1.0 - band(pv, 0.79));
  alb = mix(alb, alb * vec3(0.9, 0.84, 0.82), weather * stain * 0.8);
  alb = mix(alb, alb * vec3(0.84, 0.82, 0.86), weather * streak * 0.6);
  alb = mix(alb, uMoss * (0.85 + 0.3 * tone), moss * weather * 0.5);
  alb = mix(alb, uPeel * (0.94 + 0.12 * tone), peel * weather * 0.9);
  alb = mix(alb, alb * 0.76, peelEdge * weather * 0.8);
  // damp foot of the walls
  float wallK = step(0.01, vK.y);
  alb *= mix(1.0, mix(0.86, 1.0, band(vWP.y + (det - 0.5) * 0.5, 0.8)), wallK);
  // red runs hanging from each ledge (real dry vertical strokes)
  float fl = fract((vWP.y + 0.15) / 3.2);
  vec4 w = texture2D(tWash, vec2(vWP.x * 0.16 + vWP.z * 0.11, vWP.y * 0.045) + vK2.x);
  float drip = band(w.g * (0.25 + 1.0 * smoothstep(0.35, 0.97, fl)) + (k.g - 0.5) * 0.12, 0.45) * vK.y * (1.0 - step(0.6, an.y));
  alb = mix(alb, uDrip * (0.9 + 0.2 * k.r), drip * 0.65);

  // light: the sun in three steps on the stroke-bent normal, cut by the far roofs; the sky fills the shade in two
  float far = smoothstep(20.0, 70.0, dRef);
  vec3 N = normalize(Nf + pert * mix(0.95, 0.55, far) * mix(1.0, 0.6, useDir * (1.0 - ledgeK)));
  float j = (tone - 0.5) * 0.35 + (det - 0.5) * 0.15;
  float sunV = sunMask(vWP + Nf * 0.05, (det - 0.5) * 0.45) * uSunOn;
  // G: shadows of the moving things, with a brushed edge
  sunV *= 1.0 - band(dynShadow(vWP + Nf * 0.04, (vec2(det, tone) - 0.5) * 7.0) + (tone - 0.5) * 0.3, 0.5);
  float ndl = dot(N, uKeyDir);
  float q = (0.35 * band(ndl, 0.0 + j * 0.4) + 0.65 * band(ndl, 0.2 + j * 0.5)) * sunV;
  float fq = band(dot(N, uFillDir) + j * 0.8, 0.5);
  // warm light bounced up from the sunny street
  float bq = band(-N.y * 0.8 - dot(N, uKeyDir) * 0.4 + j * 0.8, 0.28);
  vec3 litC = uKLit * mix(vec3(1.05, 0.96, 0.9), vec3(0.97, 1.0, 1.03), tone);
  vec3 shC = uKShade * mix(vec3(1.06, 0.95, 1.0), vec3(0.98, 0.98, 1.03), tone) * mix(0.84, 1.08, fq);
  shC *= mix(vec3(1.0), vec3(1.1, 1.0, 0.92), bq);
  vec3 col = mix(alb * shC, alb * litC, q);
  // F: the undersides of ledges and balconies, and the shade right under them, keep a true dark
  col *= mix(1.0, 0.62 + 0.1 * tone, band(-Nf.y, 0.5) * (1.0 - q));
  if (vK2.y > 0.5) col = alb * mix(uKShade, uKLit, 0.3) * mix(0.9, 1.06, fq);
  col += lampsOn(alb, vWP, N, Nf * 0.04, j, (vec2(det, tone) - 0.5) * 5.0, 1.0);
  col += vCol2 * vK.z * (0.85 + 0.3 * k.g);
  float hz = vK.w * smoothstep(12.0, 55.0, length(cameraPosition - vWP));
  float air = clamp(hz + airAt(vWP) * (1.0 - hz), 0.0, 1.0);
  float g = dot(col, vec3(0.3, 0.55, 0.15));
  col = mix(col, mix(vec3(g), col, 0.6), air * 0.55);
  col = mix(col, airCol(vWP), air);
  gl_FragColor = vec4(col, 1.0);
}`;

export function knifeMaterial({ wind = false, flat = false, flatCol = '#8f7f9a', shift = [0, 0, 0] } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, uFlat: { value: flat ? 1 : 0 }, uFlatCol: { value: lin(flatCol) }, uShift: { value: new THREE.Vector3(...shift) }, uNear: { value: new THREE.Vector2(0, 0) } },
    vertexShader: knifeVert, fragmentShader: knifeFrag, defines: wind ? { WIND: '' } : {},
    side: THREE.DoubleSide,
  });
}

// ---------------------------------------------------------------- ground (B's way: strokes laid across the view, wet, lights smeared toward the eye)
// E: the low sun lays long bands of light through the gaps in the far roofs; long painted shadows; the wet road holds gold
export const NSH = 14;
export const SHADOWS = { value: Array.from({ length: NSH }, () => new THREE.Vector4(0, 0, 0, 0)) };
const groundFrag = /* glsl */`
${COMMON}
uniform vec4 uShadow[${NSH}];
uniform vec3 cRoad, cRoad2, cWalk, cWalk2, cWet, cCurb, cSkyR, cGold, cFacadeSun, cFacadeShade;
uniform float uKerbA, uKerbB, uKerbC, uKerbD;   // road between A and B (x), pavements outside, facades at C and D
uniform vec2 uAcross;                            // the ground direction that runs across the screen
varying vec3 vWP;
void main(){
  vec2 p = vWP.xz;
  float dist = length(cameraPosition - vWP);
  float dRef = length(uRefEye - vWP);
  vec2 q = vec2(dot(p, uAcross), dot(p, vec2(-uAcross.y, uAcross.x)));
  // three stroke sizes: far strokes are bigger, so they keep their size on screen and never shimmer into stripes
  float lf = smoothstep(5.0, 22.0, dRef);
  float lf2 = smoothstep(24.0, 60.0, dRef);
  vec4 bn = texture2D(tBrush, q * vec2(0.16, 0.55) + vec2(0.17, 0.4));
  vec4 bf = texture2D(tBrush, q * vec2(0.16, 0.55) / 3.2 + vec2(0.61, 0.13));
  vec4 bg = texture2D(tBrush, q * vec2(0.16, 0.55) / 9.0 + vec2(0.33, 0.77));
  float pick = smoothstep(-0.03, 0.03, bf.a - (1.0 - lf) * 1.05);
  float pick2 = smoothstep(-0.03, 0.03, bg.a - (1.0 - lf2) * 1.05);
  vec4 b = mix(mix(bn, bf, pick), bg, pick2);
  vec4 b2 = texture2D(tBrush, q.yx * vec2(0.9, 0.21) / (1.0 + 2.2 * lf + 4.0 * lf2) + vec2(0.29, 0.71));
  vec4 kn = texture2D(tKnife, q * vec2(0.09, 0.3) / (1.0 + 2.0 * lf + 3.0 * lf2) + vec2(0.11, 0.52));
  float calm = 1.0 - smoothstep(40.0, 90.0, dist) * 0.7;   // the far road settles, but stays paint
  float road = step(uKerbA, p.x) * step(p.x, uKerbB);
  // pavement: old terracotta tiles, drawn loosely, only near
  vec2 tile = abs(fract(p * 1.6) - 0.5);
  float joint = band(max(tile.x, tile.y) + (b.b - 0.5) * 0.08, 0.47) * (1.0 - smoothstep(0.12, 0.4, fwidth(p.y * 1.6)));
  vec3 walk = mix(cWalk, cWalk2, band(b.b + (b2.b - 0.5) * 0.3 * calm + (kn.r - 0.5) * 0.25, 0.52));
  walk = mix(walk, walk * vec3(1.06, 0.98, 0.96), band(kn.g + (b.a - 0.5) * 0.3, 0.72) * calm);
  walk = mix(walk, walk * 0.84, joint * 0.6);
  vec3 rd = mix(cRoad, cRoad2, band(b.b + (b2.b - 0.5) * 0.25 + (kn.r - 0.5) * 0.2, 0.5 + 0.1 * (1.0 - calm)));
  rd = mix(rd, rd * vec3(0.9, 0.9, 0.96), band(kn.g + (b2.a - 0.5) * 0.3, 0.74) * calm);
  vec3 col = mix(walk, rd, road);
  // sun and shade: where the far roofs let the sun through, minus the long painted shadows of the things standing in it
  float sunV = sunMask(vWP, (b.a - 0.5) * 0.9 + (b2.b - 0.5) * 0.3) * uSunOn;
  vec2 sd = -normalize(uKeyDir.xz);
  float sh = 0.0;
  for (int i = 0; i < ${NSH}; i++) {
    vec4 s = uShadow[i];
    if (s.z <= 0.0) continue;
    // a capsule from the foot of the thing, stretched away from the sun, a little wider toward its end (the crown)
    vec2 d = p - s.xy;
    float h = clamp(dot(d, sd), 0.0, s.w);
    float r = s.z * (0.75 + 0.45 * h / max(s.w, 1e-3));
    float cap = length(d - sd * h) / r;
    sh = max(sh, 1.0 - band(cap + (b.b - 0.5) * 0.4 + (b2.a - 0.5) * 0.2, 1.0));
  }
  // G: everything that moves (the rider, the bike's tree, the walkers, the crowd's cut-outs) shades the ground from the real sun
  float dyn = band(dynShadow(vWP, (vec2(b.a, b2.b) - 0.5) * 4.5) + (b.b - 0.5) * 0.3 + (b2.a - 0.5) * 0.15, 0.5);
  sh = max(sh, dyn);
  float sunlit = sunV * (1.0 - sh * 0.92);
  // wet: puddles from real ink blots; they hold the sky, and the sunlit fronts across, strongest at a glancing look
  vec4 wr = texture2D(tWash, p * vec2(0.05, 0.022) + vec2(0.3, 0.7));
  vec4 wr2 = texture2D(tWash, p * vec2(0.023, 0.011) + vec2(0.8, 0.1));
  float puddle = band(wr.r * 0.6 + wr2.r * 0.6 + (b.b - 0.5) * 0.3, 0.52);
  vec3 V = normalize(cameraPosition - vWP);
  float fres = pow(1.0 - max(V.y, 0.0), 4.0);
  float wet = mix(0.55, 0.9, road) * uWet;
  col = mix(col, col * cWet, wet * 0.5);
  // what the wet ground mirrors: the sunlit fronts on the right, the shaded fronts on the left, else the warm sky
  vec3 rr = vec3(-V.x, V.y, -V.z);
  float xw = rr.x > 0.0 ? uKerbD : uKerbC;
  float tt = (xw - p.x) / (abs(rr.x) < 1e-3 ? 1e-3 : rr.x);
  float hy = tt * rr.y;
  float wallR = band(9.0 - hy + (b.a - 0.5) * 2.5, 0.0) * step(0.0, tt);
  vec3 refl = mix(cSkyR, rr.x > 0.0 ? cFacadeSun : cFacadeShade, wallR);
  refl = mix(refl, cGold, sunV * 0.55);
  float sky = band(fres * (0.45 + 0.7 * puddle) + (b.a - 0.5) * 0.35 * calm, 0.42);
  col = mix(col, refl * (0.92 + 0.12 * b.b), sky * wet * 0.8);
  // kerbs: a pale knife line along each side of the road
  float kerb = (1.0 - band(abs(p.x - uKerbA) + (b.a - 0.5) * 0.05, 0.09)) + (1.0 - band(abs(p.x - uKerbB) + (b.a - 0.5) * 0.05, 0.09));
  col = mix(col, cCurb * (0.94 + 0.12 * kn.r), clamp(kerb, 0.0, 1.0) * 0.9);
  // damp foot of the walls
  float foot = (1.0 - band(abs(p.x - uKerbC), 0.18)) + (1.0 - band(abs(p.x - uKerbD), 0.18));
  col = mix(col, col * 0.84, clamp(foot, 0.0, 1.0) * 0.6);
  // light: gold where the sun lies, lilac shade elsewhere (the shade is still full of strokes)
  float j = (b.b - 0.5) * 0.2;
  vec3 litC = uKLit * mix(vec3(1.05, 0.97, 0.9), vec3(0.98, 1.0, 1.02), b.b);
  vec3 shC = uKShade * mix(vec3(1.03, 0.97, 1.04), vec3(0.96, 1.0, 1.05), b2.b) * mix(0.92, 1.04, band(b.a + j, 0.5));
  vec3 albG = col;
  col *= mix(shC, litC, sunlit);
  col += lampsOn(albG, vWP, vec3(0.0, 1.0, 0.0), vec3(0.0, 0.02, 0.0), j + (b2.a - 0.5) * 0.15, (vec2(b.a, b2.b) - 0.5) * 5.0, 1.0);
  // the sun on wet ground: broken gold dabs where the light lies on water
  float glint = band(sunlit * wet * (0.35 + 0.8 * puddle) * (0.4 + 0.9 * b2.a) * (0.5 + fres), 0.62);
  col = mix(col, cGold * 1.25, glint * 0.8);
  // the warm lights, mirrored in the wet ground, stretched toward the eye and broken by the strokes
  vec3 f = -V;
  float ang = atan(f.z, f.x), angE = asin(f.y);
  for (int i = 0; i < ${NB}; i++) {
    vec3 m = vec3(uBulb[i].x, -uBulb[i].y, uBulb[i].z);
    vec3 a = normalize(m - cameraPosition);
    float dx = abs(atan(a.z, a.x) - ang);
    float dy = angE - asin(a.y);
    float k = max(uBulbCol[i].r, max(uBulbCol[i].g, uBulbCol[i].b));
    float w = 0.022 * (0.55 + 0.9 * b.a) * (1.0 + max(-dy, 0.0) * 1.5);
    float colm = 1.0 - smoothstep(w * 0.35, w, dx);
    float fall = exp(-max(dy, 0.0) * 14.0 - max(-dy, 0.0) * 2.6);
    float g = colm * fall * min(k * 1.6, 1.0);
    float dab = band(g * (0.45 + 0.85 * b2.a) * (0.55 + 0.8 * puddle), 0.4);
    vec3 hue = uBulbCol[i] / max(k, 1e-3);
    col = mix(col, hue * 1.02, dab * wet * 0.7);
    col = mix(col, vec3(1.0, 0.93, 0.78), band(g * b2.a * puddle, 0.55) * wet);
    // the stall lamp also lays a pool of light on the ground under it
    if (i == 0) {
      vec3 Ld; float att = lightAt(0, vWP, Ld);
      float pool = band(att * (0.8 + 0.45 * b.b), 0.18);
      col = mix(col, col * hue * 1.25 + 0.03, pool * 0.6);
    }
  }
  // the far end dissolves into the sunny drizzle, still in big strokes
  float fz = pow(smoothstep(14.0, 120.0, dist), 1.2);
  col = mix(col, airCol(vWP) * (0.96 + 0.08 * b.b), fz * 0.85);
  gl_FragColor = vec4(col, 1.0);
}`;

// colours a season may change (defaults: Xuân)
export const GROUND_DEFAULTS = {
  road: '#9a8c90', road2: '#b2a4a2', walk: '#d0a48a', walk2: '#e2bea4', curb: '#f0e4d2', skyRefl: '#e2dcd4',
  gold: '#ffd48e', facadeSun: '#f6d4a0', facadeShade: '#a8a0b8',
};
export function groundMaterial(o) {
  const k = { ...GROUND_DEFAULTS, ...(o.colors || {}) };
  return new THREE.ShaderMaterial({
    uniforms: {
      ...U, uShadow: SHADOWS,
      cRoad: { value: lin(k.road) }, cRoad2: { value: lin(k.road2) }, cWalk: { value: lin(k.walk) }, cWalk2: { value: lin(k.walk2) },
      cWet: { value: new THREE.Color(0.8, 0.8, 0.86) }, cCurb: { value: lin(k.curb) }, cSkyR: { value: lin(k.skyRefl) },
      cGold: { value: lin(k.gold) }, cFacadeSun: { value: lin(k.facadeSun) }, cFacadeShade: { value: lin(k.facadeShade) },
      uKerbA: { value: o.kerbA }, uKerbB: { value: o.kerbB }, uKerbC: { value: o.wallA }, uKerbD: { value: o.wallB },
      uAcross: { value: o.across },
    },
    vertexShader: `varying vec3 vWP; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: groundFrag,
  });
}

// ---------------------------------------------------------------- sky (B's way): painted bands and cloud banks; E: a sunshower sky
// grey-blue overhead, turning gold and peach toward the low sun; the cloud bellies lit from the sun's side; a pale painted sun
// colours a season may change (defaults: Xuân's sunshower sky). sunDisc: 0 hides the painted sun (night seasons)
export const SKY_DEFAULTS = {
  top: '#98aec4', mid: '#c4cdd2', low: '#eadcca', glow: '#f6dcc0', cloud: '#b4bcc8', cloud2: '#e4dcd6', cloud3: '#9aa6b8',
  sunA: '#ffd7a0', sunB: '#f6b8a4', lining: '#fff0d0', sunDisc: 1,
};
export function skyMesh(colors = {}) {
  const k = { ...SKY_DEFAULTS, ...colors };
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      tBrush: U.tBrush, uSun: U.uKeyDir, uDisc: { value: k.sunDisc },
      cTop: { value: lin(k.top) }, cMid: { value: lin(k.mid) }, cLow: { value: lin(k.low) },
      cGlow: { value: lin(k.glow) }, cCloud: { value: lin(k.cloud) }, cCloud2: { value: lin(k.cloud2) }, cCloud3: { value: lin(k.cloud3) },
      cSunA: { value: lin(k.sunA) }, cSunB: { value: lin(k.sunB) }, cLining: { value: lin(k.lining) },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tBrush; uniform vec3 uSun, cTop, cMid, cLow, cGlow, cCloud, cCloud2, cCloud3, cSunA, cSunB, cLining; uniform float uDisc;
      varying vec3 vDir;
      ${GLSL_NOISE}
      float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a * vn(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
      void main(){
        vec3 d = normalize(vDir);
        float el = d.y, az = atan(d.z, d.x);
        vec2 uv = vec2(az * 0.55, el * 1.5);
        vec4 b = texture2D(tBrush, uv);
        vec4 b2 = texture2D(tBrush, uv * vec2(0.55, 0.8) + 0.37);
        float t = el + (b.b - 0.5) * 0.05;
        // how close to the sun, in painted steps (strokes bend the steps)
        float cs = dot(d, uSun);
        float sunK = smoothstep(0.5, 1.0, cs);
        vec3 col = cLow;
        col = mix(col, cMid, band(t, 0.06 + (b2.b - 0.5) * 0.03) * (1.0 - sunK * 0.6));
        col = mix(col, cTop, band(t, 0.3 + (b2.b - 0.5) * 0.06) * (1.0 - sunK * 0.8));
        col = mix(col, cGlow, (1.0 - band(t, 0.02 + (b.a - 0.5) * 0.03)) * 0.6);
        col = mix(col, cSunB, band(cs + (b.b - 0.5) * 0.12, 0.7) * 0.5);
        col = mix(col, cSunA, band(cs + (b2.b - 0.5) * 0.1, 0.86) * 0.8);
        // rain clouds as broad strokes: darker bellies, pale tops; toward the sun their edges catch the light
        float cl = fbm(vec2(az * 2.4, el * 6.5) + 4.0);
        float lowC = smoothstep(0.02, 0.14, el) * (1.0 - smoothstep(0.55, 0.85, el));
        float c1 = band(cl + (b.a - 0.5) * 0.35, 0.56) * lowC;
        float c2 = band(cl + (b2.a - 0.5) * 0.3, 0.66) * c1;
        float c3 = band(fbm(vec2(az * 1.3, el * 3.0) + 9.0) + (b.b - 0.5) * 0.3, 0.62) * smoothstep(0.15, 0.4, el);
        col = mix(col, mix(cCloud3, cSunB * 0.9, sunK), c3 * 0.4);
        col = mix(col, mix(cCloud, cSunB, sunK * 0.7), c1 * 0.55);
        col = mix(col, mix(cCloud2, cLining, sunK), c2 * 0.7);
        float lining = c1 * (1.0 - band(cl + (b.a - 0.5) * 0.35, 0.6)) * sunK;
        col = mix(col, cLining * 1.1, lining * 0.9);
        // the sun itself: a pale disc under a thin veil, its edge cut by the brush
        float disc = band(cs + (b.b - 0.5) * 0.0015, 0.9985);
        col = mix(col, vec3(1.25, 1.15, 0.98), disc * (1.0 - c2 * 0.6) * uDisc);
        // veils of drizzle hanging from the cloud bellies
        float veil = band(texture2D(tBrush, vec2(az * 3.0, el * 0.25) + 0.51).a + (1.0 - smoothstep(0.0, 0.25, el)) * 0.3, 0.8);
        col = mix(col, mix(cLow, cSunA, sunK), veil * 0.25 * (1.0 - smoothstep(0.1, 0.35, el)));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const s = new THREE.Mesh(new THREE.SphereGeometry(500, 48, 24), m);
  s.frustumCulled = false;
  s.renderOrder = -10;
  return s;
}

// ---------------------------------------------------------------- far streets (B's backdrop flats): brush-cut roofs, dabbed windows, mist thicker at the foot
export function backdrop({ w, h, seed, haze, cBld, cBld2, cWin, cSky, cRoof = '#9a8a86', winDensity = 0.1, minH = 5, maxH = 14, cellW = 4.5, strokes = 0.35 }) {
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      tBrush: U.tBrush, uSeed: { value: seed }, uHaze: { value: haze }, uMinH: { value: minH }, uMaxH: { value: maxH }, uCellW: { value: cellW },
      cBld: { value: lin(cBld) }, cBld2: { value: lin(cBld2) }, cWin: { value: lin(cWin) }, cSky: { value: lin(cSky) }, cRoof: { value: lin(cRoof) }, uWin: { value: winDensity }, uStroke: { value: strokes },
    },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tBrush; uniform float uSeed, uHaze, uMinH, uMaxH, uCellW, uWin, uStroke;
      uniform vec3 cBld, cBld2, cWin, cSky, cRoof;
      varying vec2 vP;
      ${GLSL_NOISE}
      void main(){
        vec2 p = vP;
        vec4 b = texture2D(tBrush, p.yx * uStroke + uSeed);
        vec4 b2 = texture2D(tBrush, p * uStroke * 0.6 + uSeed * 1.7);
        float cw = uCellW;
        float cell = floor(p.x / cw);
        float hh = uMinH + (uMaxH - uMinH) * pow(hash12(vec2(cell, uSeed + 1.0)), 1.5);
        float roofType = hash12(vec2(cell, uSeed + 3.0));
        float fx = fract(p.x / cw);
        float ridge = roofType > 0.55 ? (0.5 - abs(fx - 0.5)) * 2.2 : 0.0;
        float top = hh + ridge + (roofType < 0.14 ? step(abs(fx - 0.3), 0.08) * 1.6 : 0.0);
        float edge = (b.a - 0.5) * 0.5;
        if (p.y > top + edge) discard;
        vec3 col = mix(cBld, cBld2, band(b.b + hash12(vec2(cell, uSeed + 5.0)) * 0.4 - 0.2, 0.5));
        col = mix(col, cRoof, step(hh + edge * 0.5, p.y) * step(0.55, roofType));
        vec2 wc = vec2(p.x / 1.7, (p.y - 0.8) / 3.1);
        vec2 wi = floor(wc), wf = fract(wc);
        float isWin = step(abs(wf.x - 0.5), 0.2) * step(abs(wf.y - 0.45), 0.22) * step(0.9, p.y) * step(p.y, hh - 1.0);
        float lit = step(hash12(wi + uSeed * 7.0), uWin);
        float dab = band(isWin * (0.5 + b2.a), 0.6);
        col = mix(col, cBld * 0.72, dab * (1.0 - lit) * 0.7);
        col = mix(col, cWin, dab * lit);
        col = mix(col, cSky, clamp(uHaze + (1.0 - smoothstep(0.0, top, p.y)) * 0.25, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const g = new THREE.PlaneGeometry(w, h);
  g.translate(0, h / 2 - 1, 0);
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  return mesh;
}

// ---------------------------------------------------------------- drizzle in a sunshower: thin streaks, falling in a fixed box of air.
// Drops in the sun turn gold and glint now and then (a slow, smooth swell per drop); drops in the shade stay faint.
export function rainMesh({ n = 2200, box }) {
  const base = new THREE.PlaneGeometry(1, 1);
  base.translate(0, -0.5, 0);
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', base.attributes.position);
  g.setAttribute('uv', base.attributes.uv);
  const seeds = new Float32Array(n * 4);
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) seeds.set([r(), r(), r(), r()], i * 4);
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
  g.instanceCount = n;
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { ...U, uMin: { value: box.min }, uMax: { value: box.max } },
    vertexShader: /* glsl */`
      attribute vec4 aSeed;
      uniform vec3 uMin, uMax, uRefEye, uRefFwd, uKeyDir; uniform float uTime, uPx; uniform vec2 uWind;
      uniform sampler2D tRoof; uniform vec4 uRoof;
      varying vec2 vUv; varying float vA, vLit;
      float sunAt(vec3 wp){
        if (wp.x < uRoof.z + 0.2) return 1.0;
        float t = (uRoof.z - wp.x) / min(uKeyDir.x, -1e-3);
        vec3 h = wp + uKeyDir * t;
        float top = texture2D(tRoof, vec2((h.z - uRoof.x) / uRoof.y, 0.5)).r * uRoof.w;
        return smoothstep(-0.3, 0.3, h.y - top);
      }
      void main(){
        vec3 size = uMax - uMin;
        float speed = 3.2 + aSeed.w * 1.6;
        float y = mod(aSeed.y * size.y - uTime * speed, size.y);
        vec3 p = uMin + vec3(aSeed.x * size.x, y, aSeed.z * size.z);
        vec3 vel = normalize(vec3(uWind.x, -1.0, uWind.y * 0.3));
        p.x = uMin.x + mod(p.x - uMin.x + uWind.x * (size.y - y) , size.x);
        float d = length(uRefEye - p);
        float lit = sunAt(p);
        // a slow swell of light as the drop turns in the sun (smooth, a few seconds per drop)
        float sw = 0.5 + 0.5 * sin(uTime * (0.9 + aSeed.x * 1.3) + aSeed.z * 43.0);
        float glint = sw * sw * sw;
        float len = (0.1 + 0.06 * aSeed.w) * (1.0 + 0.02 * d) * (1.0 + 0.5 * lit);
        vec3 side = normalize(cross(uRefFwd, vel));
        vec3 wp = p + vel * position.y * -len + side * position.x * uPx * d * (1.15 + 0.5 * lit * glint);
        vUv = uv;
        vLit = lit * (0.55 + 0.45 * glint);
        vA = mix(0.12 + 0.1 * aSeed.w, 0.34 + 0.2 * aSeed.w + 0.4 * glint, lit) * smoothstep(0.3, 1.5, d) * (1.0 - smoothstep(size.y * 0.85, size.y, y));
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec2 vUv; varying float vA, vLit;
      void main(){
        float a = vA * (1.0 - abs(vUv.x - 0.5) * 2.0) * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
        vec3 c = mix(vec3(0.9, 0.92, 0.96), vec3(1.35, 1.12, 0.72), vLit);
        gl_FragColor = vec4(c, a);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  return mesh;
}

// ---------------------------------------------------------------- peach petals drifting down now and then
// colors: [dark side, light side] (default: peach pink); size: petal size when a spot gives none; twelve: drawn on twelves
export function petalMesh({ n = 26, spots, colors = null, size = null, twelve = false }) {
  const toC = (c) => (typeof c === 'string' ? lin(c) : new THREE.Color(...c));
  const C1 = colors ? toC(colors[0]) : new THREE.Color(0.93, 0.45, 0.55), C2 = colors ? toC(colors[1]) : new THREE.Color(1.0, 0.78, 0.8);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.6, 0.2, 0.7, 0.9, 0.0, 1.0);
  shape.bezierCurveTo(-0.7, 0.9, -0.6, 0.2, 0, 0);
  const base = new THREE.ShapeGeometry(shape, 6);
  base.translate(0, -0.5, 0);
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', base.attributes.position);
  const a = new Float32Array(n * 4), b = new Float32Array(n * 4);
  let s = 3;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const sp = spots[i % spots.length];
    a.set([sp[0] + (r() - 0.5) * sp[3], sp[1], sp[2] + (r() - 0.5) * sp[3] * 0.5, 6 + r() * 7], i * 4);
    b.set([r() * 20, 0.35 + r() * 0.3, r() * 6.28, sp[4] ?? size ?? 0.012], i * 4);
  }
  g.setAttribute('aA', new THREE.InstancedBufferAttribute(a, 4));
  g.setAttribute('aB', new THREE.InstancedBufferAttribute(b, 4));
  g.instanceCount = n;
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, alphaToCoverage: true,
    uniforms: { ...U, uC1: { value: C1 }, uC2: { value: C2 }, uTwelve: { value: twelve ? 1 : 0 } },
    vertexShader: /* glsl */`
      attribute vec4 aA, aB;
      uniform float uTime, uTwelve; uniform vec2 uWind;
      varying float vK, vA;
      void main(){
        float period = aA.w;
        float tt = uTwelve > 0.5 ? floor(uTime * 12.0) / 12.0 : uTime;
        float t = mod(tt + aB.x, period);
        float fall = t * aB.y;
        vec3 p = aA.xyz;
        p.y -= fall;
        p.x += sin(t * 1.3 + aB.z) * 0.12 + (uWind.x - 0.12) * fall * 0.8 + fall * 0.15;
        p.z += cos(t * 0.9 + aB.z) * 0.08;
        float spin = t * 2.1 + aB.z;
        vec3 q = position * aB.w;
        float c = cos(spin), s = sin(spin);
        q = vec3(q.x * c, q.y, q.x * s);
        float c2 = cos(spin * 0.7), s2 = sin(spin * 0.7);
        q = vec3(q.x, q.y * c2 - q.z * s2, q.y * s2 + q.z * c2);
        vA = step(fall, aA.y - 0.02);                       // gone once it reaches the ground
        vK = 0.5 + 0.5 * sin(spin);
        gl_Position = projectionMatrix * viewMatrix * vec4(p + q, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uC1, uC2;
      varying float vK, vA;
      void main(){
        if (vA < 0.5) discard;
        vec3 col = mix(uC1, uC2, step(0.5, vK));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  return mesh;
}

// ---------------------------------------------------------------- smoke (core): painted puffs that rise, drift and spread.
// sources: [{ at: [x, y, z], life, rise, spread, size, color, drift: [x, z], opacity }]
// twelve: true steps the smoke's clock twelve times a second (a hand-drawn look); false = smooth
export function smokeMesh({ sources, n = 60, twelve = false, color = '#d8ccc4', opacity = 0.55 }) {
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', base.attributes.position);
  g.setAttribute('uv', base.attributes.uv);
  const per = Math.max(1, Math.floor(n / sources.length));
  const cnt = per * sources.length;
  const A = new Float32Array(cnt * 4), B = new Float32Array(cnt * 4), D = new Float32Array(cnt * 4), Cc = new Float32Array(cnt * 3);
  let sd = 11;
  const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const col = new THREE.Color();
  sources.forEach((src, k) => {
    col.set(src.color ?? color);
    for (let i = 0; i < per; i++) {
      const j = k * per + i;
      A.set([...src.at, i / per + r() * 0.3], j * 4);
      B.set([src.life ?? 4, src.rise ?? 0.35, src.spread ?? 0.5, src.size ?? 0.35], j * 4);
      D.set([...(src.drift ?? [0.15, 0]), r(), src.opacity ?? opacity], j * 4);
      Cc.set([col.r, col.g, col.b], j * 3);
    }
  });
  g.setAttribute('aA', new THREE.InstancedBufferAttribute(A, 4));
  g.setAttribute('aB', new THREE.InstancedBufferAttribute(B, 4));
  g.setAttribute('aD', new THREE.InstancedBufferAttribute(D, 4));
  g.setAttribute('aC', new THREE.InstancedBufferAttribute(Cc, 3));
  g.instanceCount = cnt;
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { ...U, uTwelve: { value: twelve ? 1 : 0 } },
    vertexShader: /* glsl */`
      attribute vec4 aA, aB, aD; attribute vec3 aC;
      uniform float uTime, uTwelve; uniform vec3 uRefRight, uRefUp; uniform vec2 uWind;
      varying vec2 vUv; varying float vA, vSeed; varying vec3 vCol, vWP;
      void main(){
        float t = uTwelve > 0.5 ? floor(uTime * 12.0) / 12.0 : uTime;
        float life = aB.x;
        float u = fract(t / life + aA.w);                    // 0 at the source, 1 when the puff has thinned away
        vec3 p = aA.xyz + vec3(aD.x + uWind.x * 0.5, aB.y * life, aD.y) * u;
        p.x += sin(u * 5.0 + aD.z * 20.0) * aB.z * 0.25 * u;
        float size = aB.w * (0.5 + aB.z * 2.2 * u);
        vec3 wp = p + (uRefRight * position.x + uRefUp * position.y) * size;
        vUv = uv; vSeed = aD.z; vCol = aC; vWP = wp;
        vA = aD.w * smoothstep(0.0, 0.12, u) * (1.0 - smoothstep(0.55, 1.0, u));
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: /* glsl */`
      ${COMMON}
      varying vec2 vUv; varying float vA, vSeed; varying vec3 vCol, vWP;
      void main(){
        vec4 b = texture2D(tBrush, vUv * 0.45 + vSeed * 3.7);
        vec2 q = vUv - 0.5;
        float r = length(q) * 2.0 + (b.a - 0.5) * 0.55;
        float a = (1.0 - band(r, 0.72)) * 0.7 + (1.0 - band(r + (b.b - 0.5) * 0.3, 0.4)) * 0.3;
        a *= vA;
        if (a < 0.01) discard;
        vec3 col = vCol * (0.9 + 0.2 * b.b);
        col = mix(col, airCol(vWP), airAt(vWP));
        gl_FragColor = vec4(col, a);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  return mesh;
}

// ---------------------------------------------------------------- sparks (core): embers rising from coals, fading as they cool.
// sources: [{ at: [x, y, z], spread: 0.2, rise: 1.2, life: 1.1, size: 0.018, color: '#ffb050', cool: '#c83a18', drift: [x, z] }]
// twelve: true steps the sparks' clock twelve times a second. No flicker: each ember only rises, drifts and dims.
export function sparkMesh({ sources, n = 40, twelve = false }) {
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', base.attributes.position);
  g.setAttribute('uv', base.attributes.uv);
  const per = Math.max(1, Math.floor(n / sources.length));
  const cnt = per * sources.length;
  const A = new Float32Array(cnt * 4), B = new Float32Array(cnt * 4), C1 = new Float32Array(cnt * 3), C2 = new Float32Array(cnt * 3), D = new Float32Array(cnt * 4);
  let sd = 17;
  const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const col = new THREE.Color();
  sources.forEach((src, k) => {
    for (let i = 0; i < per; i++) {
      const j = k * per + i;
      const a = r() * Math.PI * 2, q = Math.sqrt(r()) * (src.spread ?? 0.2);
      A.set([src.at[0] + Math.cos(a) * q, src.at[1], src.at[2] + Math.sin(a) * q, r()], j * 4);
      B.set([(src.life ?? 1.1) * (0.7 + 0.6 * r()), (src.rise ?? 1.2) * (0.7 + 0.6 * r()), (src.size ?? 0.018) * (0.6 + 0.8 * r()), r() * 6.28], j * 4);
      col.set(src.color ?? '#ffb050'); C1.set([col.r, col.g, col.b], j * 3);
      col.set(src.cool ?? '#c83a18'); C2.set([col.r, col.g, col.b], j * 3);
      D.set([...(src.drift ?? [0.08, 0]), 0.6 + 0.8 * r(), 0], j * 4);
    }
  });
  g.setAttribute('aA', new THREE.InstancedBufferAttribute(A, 4));
  g.setAttribute('aB', new THREE.InstancedBufferAttribute(B, 4));
  g.setAttribute('aC1', new THREE.InstancedBufferAttribute(C1, 3));
  g.setAttribute('aC2', new THREE.InstancedBufferAttribute(C2, 3));
  g.setAttribute('aD', new THREE.InstancedBufferAttribute(D, 4));
  g.instanceCount = cnt;
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { ...U, uTwelve: { value: twelve ? 1 : 0 } },
    vertexShader: /* glsl */`
      attribute vec4 aA, aB, aD; attribute vec3 aC1, aC2;
      uniform float uTime, uTwelve; uniform vec2 uWind;
      varying vec2 vUv; varying vec3 vCol; varying float vA;
      void main(){
        float t = uTwelve > 0.5 ? floor(uTime * 12.0) / 12.0 : uTime;
        float life = aB.x;
        float u = fract(t / life + aA.w);
        vec3 p = aA.xyz;
        p.y += aB.y * life * u * (1.0 - 0.35 * u);
        p.xz += (aD.xy + vec2(uWind.x, 0.0) * 0.6) * u * life + vec2(sin(u * 7.0 * aD.z + aB.w), cos(u * 5.0 * aD.z + aB.w)) * 0.04 * u;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        float size = aB.z * (1.0 - 0.6 * u);
        mv.xy += position.xy * size;
        vUv = uv;
        vCol = mix(aC1, aC2, smoothstep(0.2, 0.9, u)) * (2.2 - 1.4 * u);
        vA = smoothstep(0.0, 0.05, u) * pow(1.0 - u, 1.4);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tBrush;
      varying vec2 vUv; varying vec3 vCol; varying float vA;
      void main(){
        vec4 b = texture2D(tBrush, vUv * 0.3 + vCol.gb * 0.1);
        float r = length(vUv - 0.5) * 2.0 + (b.a - 0.5) * 0.4;
        float a = (1.0 - smoothstep(0.55, 0.9, r)) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vCol * a, a);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  return mesh;
}

// ---------------------------------------------------------------- ribbon smoke (core): a thin band of smoke that climbs, bends with
// the wind and the cursor, widens and thins out (incense, a pipe, a brazier's plume).
// sources: [{ at: [x, y, z], length: 1.6, width: [0.02, 0.22], rise: [0, 1, 0], drift: [0.35, 0.05], curl: 0.12, speed: 0.25,
//             color: '#d8d0c8', opacity: 0.5, sway: -1 (a core sway group 0..5 that the cursor breeze pushes) }]
// twelve: true steps the smoke's clock twelve times a second (hand-drawn look)
export function ribbonSmokeMesh({ sources, segs = 28, twelve = false }) {
  const P = [], S = [], I = [];
  const Q1 = [], Q2 = [], Q3 = [], Q4 = [], CC = [];
  let base = 0;
  const col = new THREE.Color();
  sources.forEach((src, k) => {
    const rise = new THREE.Vector3(...(src.rise ?? [0, 1, 0])).normalize();
    col.set(src.color ?? '#d8d0c8');
    for (let i = 0; i <= segs; i++) {
      for (const side of [-1, 1]) {
        P.push(...src.at);
        S.push(i / segs, side);
        Q1.push(rise.x, rise.y, rise.z, src.length ?? 1.6);
        Q2.push(...(src.width ?? [0.02, 0.22]), ...(src.drift ?? [0.35, 0.05]));
        Q3.push(src.curl ?? 0.12, src.speed ?? 0.25, k * 1.37, src.sway ?? -1);
        Q4.push(src.opacity ?? 0.5);
        CC.push(col.r, col.g, col.b);
      }
      if (i < segs) { const a = base + i * 2; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    base += (segs + 1) * 2;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('aS', new THREE.Float32BufferAttribute(S, 2));
  g.setAttribute('aQ1', new THREE.Float32BufferAttribute(Q1, 4));
  g.setAttribute('aQ2', new THREE.Float32BufferAttribute(Q2, 4));
  g.setAttribute('aQ3', new THREE.Float32BufferAttribute(Q3, 4));
  g.setAttribute('aQ4', new THREE.Float32BufferAttribute(Q4, 1));
  g.setAttribute('aCol', new THREE.Float32BufferAttribute(CC, 3));
  g.setIndex(I);
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    // uSeason: a picture of the season waiting inside this scent (the opening; core/world.js showPicture). uSeasonK is how
    // much of it shows, uSeasonWarp how hard the scent bends it, uSeasonShard how broken its edges are along the strokes
    uniforms: { ...U, uTwelve: { value: twelve ? 1 : 0 }, uSeason: { value: null }, uSeasonK: { value: 0 }, uSeasonWarp: { value: 1 }, uSeasonShard: { value: 1 } },
    vertexShader: /* glsl */`
      attribute vec2 aS; attribute vec4 aQ1, aQ2, aQ3; attribute float aQ4; attribute vec3 aCol;
      uniform float uTime, uTwelve; uniform vec2 uWind; uniform vec3 uSway[6];
      varying vec2 vUv; varying float vA; varying vec3 vCol, vWP; varying vec2 vScr;
      vec3 along(float s, float t){
        float len = aQ1.w;
        vec3 p = position + aQ1.xyz * s * len;
        // the plume leans with its drift and the wind more the higher it climbs, and curls
        p.x += (aQ2.z + (uWind.x - 0.12) * 1.2) * pow(s, 1.5) * len;
        p.z += aQ2.w * pow(s, 1.5) * len;
        float ph = s * len * 5.0 - t * aQ3.y * 6.0 + aQ3.z;
        p.x += sin(ph) * aQ3.x * s;
        p.z += cos(ph * 0.7 + 1.3) * aQ3.x * 0.6 * s;
        if (aQ3.w >= 0.0) p += uSway[int(aQ3.w + 0.5)] * s * s * 2.5;
        return p;
      }
      void main(){
        float t = uTwelve > 0.5 ? floor(uTime * 12.0) / 12.0 : uTime;
        float s = aS.x;
        vec3 p = along(s, t);
        vec3 tg = normalize(along(min(s + 0.02, 1.0), t) - along(max(s - 0.02, 0.0), t));
        vec3 view = normalize(cameraPosition - p);
        vec3 sd = normalize(cross(tg, view));
        float w = mix(aQ2.x, aQ2.y, s);
        p += sd * aS.y * w * 0.5;
        vUv = vec2(aS.y * 0.5 + 0.5, s * aQ1.w - t * aQ3.y);
        vA = aQ4 * smoothstep(0.0, 0.06, s) * (1.0 - smoothstep(0.45, 1.0, s));
        vCol = aCol; vWP = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        vScr = gl_Position.xy / max(gl_Position.w, 1e-4) * 0.5 + 0.5;
      }`,
    fragmentShader: /* glsl */`
      ${COMMON}
      varying vec2 vUv; varying float vA; varying vec3 vCol, vWP; varying vec2 vScr;
      uniform sampler2D uSeason; uniform float uSeasonK, uSeasonWarp, uSeasonShard;
      void main(){
        vec4 b = texture2D(tBrush, vec2(vUv.x * 0.35, vUv.y * 0.5));
        vec4 b2 = texture2D(tBrush, vec2(vUv.x * 0.2 + 0.3, vUv.y * 0.23 + 0.7));
        float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
        float a = band(edge * (0.6 + 0.8 * b.a) + (b2.b - 0.5) * 0.3, 0.35) * 0.75 + band(edge + (b.b - 0.5) * 0.4, 0.7) * 0.25;
        a *= vA;
        if (a < 0.01) discard;
        vec3 col = vCol * (0.9 + 0.2 * b.b);
        col = mix(col, airCol(vWP), airAt(vWP) * 0.7);
        // the season waiting inside the scent: the picture is carried by the scent's own drift and curl (the same numbers
        // that bend the ribbon), and its edges break along the brush's strokes. Nothing of it shows where there is no scent
        if (uSeasonK > 0.002) {
          vec2 flow = vec2((b.a - 0.5) * 1.6 + sin(vUv.y * 4.5 + uTime * 0.45) * 0.7,
                           (b2.b - 0.5) * 1.6 + cos(vUv.y * 3.1 - uTime * 0.33) * 0.6);
          vec2 uvS = clamp(vScr + flow * 0.032 * uSeasonWarp, vec2(0.002), vec2(0.998));
          vec3 pic = texture2D(uSeason, uvS).rgb;
          pic = pic * pic * (pic * 0.305 + 0.682) + 0.013;      // the picture comes as it is seen: back to light here
          float shard = band(edge * (0.7 + 0.6 * b.b) + (b.a - 0.5) * 0.6, 0.26);
          float k = uSeasonK * mix(1.0, shard, clamp(uSeasonShard, 0.0, 1.0));
          col = mix(col, pic, clamp(k, 0.0, 1.0));
          a = clamp(a + k * 1.5 * uSeasonK, 0.0, 1.0);
        }
        gl_FragColor = vec4(col, a);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  return mesh;
}

// ---------------------------------------------------------------- a painted glow (bulbs, headlight)
// Light added onto what is behind it (never a disc of paint laid over it): a small hot core, and a halo that falls away and
// breaks up in brush strokes, with no even round edge. o.maxScreen: the most of the view's height the glow may cover, so a
// lamp passing the lens stays a lamp and never swells into a disc. The season's nearFade still thins it right at the lens.
export function glowMesh(color, size, seed = 0.3, { maxScreen = 0.16, strength = 1 } = {}) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { tBrush: U.tBrush, uCol: { value: lin(color) }, uSeed: { value: seed }, uNearFade: U.uNearFade, uHalf: { value: size / 2 }, uMax: { value: maxScreen }, uK: { value: strength } },
    vertexShader: /* glsl */`
      uniform vec2 uNearFade; uniform float uHalf, uMax; varying vec2 vUv; varying float vNear, vShrink;
      void main(){
        vUv = uv;
        vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // the glow's height on screen (a share of the view), held under uMax
        float onScreen = 2.0 * uHalf * length(modelViewMatrix[1].xyz) * projectionMatrix[1][1] / max(-c.z, 1e-3) * 0.5;
        float k = min(1.0, uMax / max(onScreen, 1e-5));
        mv.xyz = c.xyz + (mv.xyz - c.xyz) * k;
        vShrink = k;
        vNear = uNearFade.y > 0.0 ? smoothstep(uNearFade.x, uNearFade.y, -c.z) : 1.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tBrush; uniform vec3 uCol; uniform float uSeed, uK; varying vec2 vUv; varying float vNear, vShrink;
      float band(float x, float t){ float w = max(fwidth(x), 1e-4) * 0.75; return smoothstep(t - w, t + w, x); }
      void main(){
        vec2 q = vUv - 0.5;
        float r = length(q) * 2.0;
        if (r > 1.0) discard;
        float ang = atan(q.y, q.x) / 6.2831853;
        // strokes laid out from the light: the brush sheet read around the centre, so the dabs point outward
        vec4 b = texture2D(tBrush, vec2(ang * 2.0 + uSeed, r * 0.22 + uSeed * 1.7));
        vec4 b2 = texture2D(tBrush, vUv * 0.6 + uSeed * 2.3);
        // the halo: falls away to nothing well inside the quad; near the core the strokes join, further out they break apart
        float rr = r + (b2.a - 0.5) * 0.22;
        float fall = 1.0 - smoothstep(0.08, 0.95, rr);
        fall = pow(fall, 1.6);
        float strokes = band(b.a + (0.62 - rr) * 0.9, 0.5);
        float halo = fall * mix(0.2, 1.0, strokes);
        // a hot middle and a small white core (a painted step, its edge bent by the brush)
        float inner = 1.0 - band(r + (b2.b - 0.5) * 0.1, 0.24);
        float core = 1.0 - band(r + (b.b - 0.5) * 0.04, 0.1);
        vec3 warm = mix(uCol, vec3(1.0, 0.93, 0.78), 0.5);
        vec3 col = uCol * halo * 0.95 + warm * inner * 0.32 + vec3(1.0, 0.97, 0.9) * core * 0.75;
        gl_FragColor = vec4(col * uK * vNear, 1.0);
      }`,
  });
  const g = new THREE.PlaneGeometry(size, size);
  const mesh = new THREE.Mesh(g, m);
  mesh.renderOrder = 4;
  return mesh;
}

// ---------------------------------------------------------------- attributes
// (scratch space reused from call to call: a build makes thousands of these, and fresh arrays each time keep the garbage
// collector busy in long pauses)
const SN = { cap: 0, table: null, keys: null, sums: null, group: null, n: 0 };
function smoothNormals(geo) {
  // the normals of every copy of a point (to 0.1 mm) averaged: a hash table of the rounded positions (the same grouping and
  // the same sums, in the same order, as the old string keys, only faster)
  const pos = geo.attributes.position, nor = geo.attributes.normal, n = pos.count;
  let cap = 16;
  while (cap < n * 2) cap <<= 1;
  if (cap > SN.cap) { SN.cap = cap; SN.table = new Int32Array(cap); }
  if (n > SN.n) { SN.n = n; SN.keys = new Int32Array(n * 3); SN.sums = new Float64Array(n * 3); SN.group = new Int32Array(n); }
  const mask = cap - 1;
  const table = SN.table, keys = SN.keys, sums = SN.sums, group = SN.group;
  table.fill(-1, 0, cap);
  let groups = 0;
  for (let i = 0; i < n; i++) {
    const qx = Math.round(pos.getX(i) * 1e4), qy = Math.round(pos.getY(i) * 1e4), qz = Math.round(pos.getZ(i) * 1e4);
    let h = (Math.imul(qx, 73856093) ^ Math.imul(qy, 19349663) ^ Math.imul(qz, 83492791)) & mask;
    let gi;
    for (;;) {
      gi = table[h];
      if (gi < 0) { gi = groups++; table[h] = gi; keys[gi * 3] = qx; keys[gi * 3 + 1] = qy; keys[gi * 3 + 2] = qz; sums[gi * 3] = 0; sums[gi * 3 + 1] = 0; sums[gi * 3 + 2] = 0; break; }
      if (keys[gi * 3] === qx && keys[gi * 3 + 1] === qy && keys[gi * 3 + 2] === qz) break;
      h = (h + 1) & mask;
    }
    group[i] = gi;
    sums[gi * 3] += nor.getX(i); sums[gi * 3 + 1] += nor.getY(i); sums[gi * 3 + 2] += nor.getZ(i);
  }
  const sn = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const g = group[i] * 3;
    const x = sums[g], y = sums[g + 1], z = sums[g + 2];
    const l = Math.hypot(x, y, z) || 1;
    sn[i * 3] = x / l; sn[i * 3 + 1] = y / l; sn[i * 3 + 2] = z / l;
  }
  return sn;
}
const fill = (n, vals) => { const a = new Float32Array(n * vals.length); for (let i = 0; i < n; i++) a.set(vals, i * vals.length); return new THREE.BufferAttribute(a, vals.length); };
function clean(geo) {
  if (geo.index) geo = geo.toNonIndexed();
  if (!geo.attributes.normal) geo.computeVertexNormals();
  for (const k of Object.keys(geo.attributes)) if (!['position', 'normal'].includes(k)) geo.deleteAttribute(k);
  return geo;
}

// (profiling of the build helpers: window.__chomProf[name] = [calls, ms])
export const PROF = (window.__chomProf = window.__chomProf || {});
export const prof = (name, t0) => { const e = PROF[name] || (PROF[name] = [0, 0]); e[0]++; e[1] += performance.now() - t0; };
export function heroAttrs(geo, { col, col2, gloss = 0, erode = 0.5, emit = 0, scale = 3, hilite = 0.6, vert = 0, haze = 0, bump = 0.9, smooth = false }) {
  const t0 = performance.now();
  geo = clean(geo);
  const n = geo.attributes.position.count;
  const ts = performance.now();
  const sn = smoothNormals(geo);
  prof('smoothNormals(hero)', ts);
  const c1 = new THREE.Color(col), c2 = new THREE.Color(col2 ?? col);
  geo.setAttribute('aSN', new THREE.BufferAttribute(sn, 3));
  if (smooth) geo.setAttribute('normal', new THREE.BufferAttribute(sn.slice(), 3));
  geo.setAttribute('aCol', fill(n, [c1.r, c1.g, c1.b]));
  geo.setAttribute('aCol2', fill(n, [c2.r, c2.g, c2.b]));
  geo.setAttribute('aPar', fill(n, [gloss, erode, emit, scale]));
  geo.setAttribute('aPar2', fill(n, [hilite, vert, haze, bump]));
  prof('heroAttrs', t0);
  return geo;
}

export function knifeAttrs(geo, { col, col2, scale = 0.6, drip = 0, emit = 0, haze = 0, seed = 0, flat = 0 }) {
  const t0 = performance.now();
  geo = clean(geo);
  const n = geo.attributes.position.count;
  const c1 = new THREE.Color(col), c2 = new THREE.Color(col2 ?? col);
  // (no smooth normals: the knife paint does not read them)
  geo.setAttribute('aCol', fill(n, [c1.r, c1.g, c1.b]));
  geo.setAttribute('aCol2', fill(n, [c2.r, c2.g, c2.b]));
  geo.setAttribute('aK', fill(n, [scale, drip, emit, haze]));
  // F: which way the strokes run (see knifeFrag): the long axis of a thin element, 0 for walls and blocks
  geo.computeBoundingBox();
  const bb = geo.boundingBox, ex = bb.max.x - bb.min.x, ey = bb.max.y - bb.min.y, ez = bb.max.z - bb.min.z;
  let axis = 0;
  if (ey * 2.2 < Math.max(ex, ez) && Math.min(ex, ez) < 1.4) axis = ex > ez ? 1 : 2;
  else if (ey > 2.2 * Math.max(ex, ez)) axis = 3;
  geo.setAttribute('aK2', fill(n, [seed, flat, axis, 0]));
  prof('knifeAttrs', t0);
  return geo;
}
