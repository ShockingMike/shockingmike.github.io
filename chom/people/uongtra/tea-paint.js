// Chớm, season Hạ: the paint for the lotus-tea maker. The spring customer's one-pass paint (prototypes/chom-people-test/khach-paint.js)
// with its own uniforms (people.js sets the summer dusk from the world's light: a low orange sun over the lake behind her, lilac shade,
// the pink sky as fill) and one more light: the storm lantern over her tray, a painted step of warm light.
//   paint   big flat steps of light (three), their edges bent a little by real brush strokes; E's low spring sun and pale violet shade;
//           real shadows from the sun; cross-contour hatching made of real dry-brush strokes, wrapped around each limb and the back,
//           only in the dark; silk sheen as long streaks along the cloth; hair as combed masses with a painted light band
//   hull    one pass for three lines: the ink (thick on the shaded side and in hollows, thin to nothing toward the sun, broken like
//           a dry brush) and two thin mis-registered colour bands (vermilion on the lit side, mint on the shaded side)
//   fold    acting lines: short brush strokes laid on the cloth for each drawing; skinned on the card, only their widths change
//   depth   the same deformation for the sun's shadow map, so the cloth that flies also casts
// All the parts of one figure are one mesh: each vertex carries its material number (aMat); the materials are uniform arrays.
// Strokes are read from the rest (bind) pose, so they stay glued to the cloth while the body moves.
import * as THREE from 'three';

const lin = (h) => new THREE.Color(h);
export const NCLOTH = 240;
export const NMAT = 8;
export const NFOLD = 64;
// cloth nodes are shared by everyone on the page: each grid takes its slots from here
export const CLOTH = { next: 0 };

// shared by every material of the new people
export const PU = {
  tBrush: { value: null }, tHatch: { value: null },
  uLight: { value: new THREE.Vector3(-0.453, 0.073, -0.889).normalize() },
  uFill: { value: new THREE.Vector3(0.3, 0.8, 0.52).normalize() },
  uFillCol: { value: lin('#f0d6e2') },
  uLightCol: { value: lin('#ffc890').multiplyScalar(1.25) },
  uShadeCol: { value: lin('#b8a8cc') },
  uSkyTop: { value: lin('#8a82b4') }, uSkyLow: { value: lin('#f0b48e') },
  uSunRim: { value: lin('#ffcf8a') },
  uInk: { value: lin('#1c1020') },
  uBand1: { value: lin('#f25a30') }, uBand2: { value: lin('#62cfb2') },
  uRes: { value: new THREE.Vector2(1, 1) },
  uLightScreen: { value: new THREE.Vector2(-1, 0.3) },
  uPxScale: { value: 1 },
  uCloth: { value: Array.from({ length: NCLOTH }, () => new THREE.Vector3()) },
  uHeadC: { value: new THREE.Vector3() },
  // the two trouser legs as columns the tà may not enter: hip, knee, ankle of each leg (world), the radius, and the height they start
  uLegA: { value: [new THREE.Vector3(0, -9, 0), new THREE.Vector3(0, -9, 0)] },
  uLegB: { value: [new THREE.Vector3(0, -9, 0), new THREE.Vector3(0, -9, 0)] },
  uLegC: { value: [new THREE.Vector3(0, -9, 0), new THREE.Vector3(0, -9, 0)] },
  uLegR: { value: 0.1 }, uLegTop: { value: 0.75 },
  uTime: { value: 0 },
  // the world's own sun shadow map (chom-world core); off in the test page
  tShadowW: { value: null }, uShMatW: { value: new THREE.Matrix4() }, uShOnW: { value: 0 }, uShTexelW: { value: 1 / 2048 },
  // the storm lantern over her tray (the world's warm light nearest to her): xyz + reach, colour
  uLamp: { value: new THREE.Vector4(0, -99, 0, 1) }, uLampCol: { value: new THREE.Color(0, 0, 0) },
  // qa: 1 paints the face (the region the face check uses) pure magenta and the rest of her black; 2 only the features' zone
  uFaceMask: { value: 0 },
  // the light round her, tuned to the scene: the shade (sky light) gain and how much of her own shade tint it keeps; how far up
  // the hatching climbs into the shade and how much the sky-lit step keeps it; the sun's rim (edge falloff, reach, strength)
  uAmbGain: { value: 0.95 }, uAmbKeep: { value: 0.1 }, uHatchUp: { value: 0.75 }, uHatchFill: { value: 0.55 },
  uRimPow: { value: 1.0 }, uRimReach: { value: 1.0 }, uRimGain: { value: 1.7 },
};
export const KIND = { cotton: 0, silk: 1, skin: 2, hair: 3, wool: 4, leather: 5, metal: 6 };
const KDEF = {
  cotton: { jit: 0.6, t1: -0.1, t2: 0.4 },
  silk: { jit: 0.25, t1: -0.02, t2: 0.42 },
  skin: { jit: 0.35, t1: -0.15, t2: 0.3 },
  hair: { jit: 0.2, t1: 0.0, t2: 0.55 },
  wool: { jit: 0.7, t1: -0.12, t2: 0.36 },
  leather: { jit: 0.4, t1: -0.05, t2: 0.45 },
  metal: { jit: 0.3, t1: -0.05, t2: 0.4 },
};

// the material table of one figure: looks = [{ kind, col, col2, hatch, hi, back, scale, bump, gloss, sheen, hatchAmt, rim, face,
// hatchScale, push, hang, legs, ink, bands }, ...] (index = aMat). Every material of that figure shares these uniforms.
export function materialTable(looks) {
  const v3 = () => Array.from({ length: NMAT }, () => new THREE.Vector3());
  const v4 = () => Array.from({ length: NMAT }, () => new THREE.Vector4());
  const f1 = () => new Array(NMAT).fill(0);
  const T = {
    uColA: { value: v3() }, uCol2A: { value: v3() }, uHatchColA: { value: v3() }, uHiA: { value: v3() }, uBackA: { value: v3() },
    uP1A: { value: v4() }, uP2A: { value: v4() }, uP3A: { value: v4() }, uP4A: { value: v4() },
    uPushA: { value: f1() }, uLegOnA: { value: f1() }, uInkWA: { value: f1() }, uBandsA: { value: f1() },
  };
  const c3 = (c) => { const k = lin(c); return new THREE.Vector3(k.r, k.g, k.b); };
  looks.forEach((L, i) => {
    const K = KDEF[L.kind ?? 'cotton'];
    T.uColA.value[i].copy(c3(L.col)); T.uCol2A.value[i].copy(c3(L.col2)); T.uHatchColA.value[i].copy(c3(L.hatch ?? L.col));
    T.uHiA.value[i].copy(c3(L.hi ?? '#fff6e8')); T.uBackA.value[i].copy(c3(L.back ?? L.col));
    T.uP1A.value[i].set(L.scale ?? 9, L.bump ?? 0.8, L.gloss ?? 0.6, L.sheen ?? 1);
    T.uP2A.value[i].set(L.hatchAmt ?? 0.85, L.rim ?? 0.7, L.face ? 1 : 0, L.hatchScale ?? 5);
    T.uP3A.value[i].set(KIND[L.kind ?? 'cotton'], K.jit, K.t1, K.t2);
    T.uP4A.value[i].set(L.hang ?? -9, L.twoSided ? 0 : 1, 0, 0);
    T.uPushA.value[i] = L.push ?? 0;
    T.uLegOnA.value[i] = L.legs ? 1 : 0;
    T.uInkWA.value[i] = L.ink ?? 0;
    T.uBandsA.value[i] = L.bands === true ? 1 : +(L.bands || 0);
  });
  return T;
}

const NOISE = /* glsl */`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), f.x), f.y); }
float vn3(vec3 p){ return vn(p.xy * 1.0 + p.z * 1.7) * 0.5 + vn(p.zx * 1.3 + p.y * 2.1) * 0.5; }
`;

// skinning + cloth offset + the pull-in under the tà, shared by every pass
const DEFORM = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
attribute vec4 aCloth;          // x: first node (-1 = none), y: column, z: row, w: columns
attribute float aClothW;        // how much the spring grid moves this vertex
attribute float aShrink;        // trousers under the tà: pulled in
attribute float aPushW;         // trousers behind the back tà: pushed back in depth, so they never show through the silk
attribute float aMat;           // the material number
uniform vec3 uCloth[${NCLOTH}];
uniform float uPushA[${NMAT}], uLegOnA[${NMAT}];
uniform float uHullPush;
uniform vec3 uLegA[2], uLegB[2], uLegC[2];
uniform float uLegR, uLegTop;
vec3 segClosest(vec3 p, vec3 a, vec3 b){ vec3 d = b - a; float t = clamp(dot(p - a, d) / max(dot(d, d), 1e-8), 0.0, 1.0); return a + d * t; }
vec3 legPush(vec3 p, float restY, float on){
  if (on < 0.5) return p;
  float w = smoothstep(uLegTop, uLegTop - 0.09, restY);
  if (w <= 0.0) return p;
  for (int i = 0; i < 2; i++) {
    vec3 c1 = segClosest(p, uLegA[i], uLegB[i]), c2 = segClosest(p, uLegB[i], uLegC[i]);
    vec3 c = dot(p - c1, p - c1) < dot(p - c2, p - c2) ? c1 : c2;
    vec3 d = p - c;
    float l = length(d);
    if (l < uLegR) p = c + (l > 1e-4 ? d / l : vec3(0.0, 0.0, 1.0)) * mix(l, uLegR, w);
  }
  return p;
}
vec3 clothAt(){
  if (aCloth.x < 0.0) return vec3(0.0);
  float nu = aCloth.w;
  float i0 = floor(aCloth.y), j0 = floor(aCloth.z);
  float fi = aCloth.y - i0, fj = aCloth.z - j0;
  float i1 = min(i0 + 1.0, nu - 1.0);
  int a = int(aCloth.x + j0 * nu + i0), b = int(aCloth.x + j0 * nu + i1);
  int c = int(aCloth.x + (j0 + 1.0) * nu + i0), d = int(aCloth.x + (j0 + 1.0) * nu + i1);
  vec3 top = mix(uCloth[a], uCloth[b], fi), bot = mix(uCloth[c], uCloth[d], fi);
  return mix(top, bot, fj) * aClothW;
}
void deform(out vec3 wpos, out vec3 wnrm, out mat3 rot){
  #include <skinbase_vertex>
  #include <begin_vertex>
  transformed -= normal * aShrink;
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  wpos = legPush(wp.xyz + clothAt(), position.y, uLegOnA[int(aMat + 0.5)]);
  wnrm = normalize(mat3(modelMatrix) * objectNormal);
  rot = mat3(modelMatrix);
  #ifdef USE_SKINNING
    rot = rot * mat3(skinMatrix);
  #endif
}
// the same place on screen, a little further away: the eye ray does not change, only the depth
vec4 project(vec3 wp){
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  float push = uPushA[int(aMat + 0.5)];
  float k = push * aPushW + (push > 0.0 ? uHullPush : 0.0);
  if (k > 0.0) mv.xyz *= 1.0 + k / max(length(mv.xyz), 1e-3);
  return projectionMatrix * mv;
}
`;

const paintVert = /* glsl */`
${DEFORM}
#include <shadowmap_pars_vertex>
attribute vec2 aFlow; attribute vec3 aAxis; attribute float aCurv;
varying vec3 vRP, vRN, vWP, vWN, vAxW;
varying vec2 vFlow; varying float vCurv;
varying vec3 vR0, vR1, vR2;
flat varying float vMat;
void main(){
  vec3 wp, wn; mat3 m;
  deform(wp, wn, m);
  vRP = position; vRN = normal; vWP = wp; vWN = wn;
  vR0 = m[0]; vR1 = m[1]; vR2 = m[2];
  vAxW = normalize(m * aAxis);
  vFlow = aFlow; vCurv = aCurv;
  vMat = aMat;
  #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
  for (int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i++) {
    vDirectionalShadowCoord[i] = directionalShadowMatrix[i] * vec4(wp + wn * directionalLightShadows[i].shadowNormalBias, 1.0);
  }
  #endif
  gl_Position = project(wp);
}`;

const paintFrag = /* glsl */`
#include <common>
#include <packing>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
uniform sampler2D tBrush, tHatch;
uniform vec3 uLight, uLightCol, uShadeCol, uSkyTop, uSkyLow, uSunRim, uInk, uHeadC, uFill, uFillCol, uLampCol;
uniform float uFaceMask;
uniform float uAmbGain, uAmbKeep, uHatchUp, uHatchFill, uRimPow, uRimReach, uRimGain;
uniform vec2 uLightScreen;
uniform vec4 uLamp;
uniform vec3 uColA[${NMAT}], uCol2A[${NMAT}], uHatchColA[${NMAT}], uHiA[${NMAT}], uBackA[${NMAT}];
uniform vec4 uP1A[${NMAT}], uP2A[${NMAT}], uP3A[${NMAT}], uP4A[${NMAT}];
uniform sampler2D tShadowW; uniform mat4 uShMatW; uniform float uShOnW, uShTexelW;
float worldShadow(vec3 wp){
  if (uShOnW < 0.5) return 0.0;
  vec3 q = (uShMatW * vec4(wp, 1.0)).xyz * 0.5 + 0.5;
  if (q.x <= 0.002 || q.x >= 0.998 || q.y <= 0.002 || q.y >= 0.998 || q.z >= 1.0) return 0.0;
  float z = q.z - 0.00012;
  float o = step(texture2D(tShadowW, q.xy).r, z);
  o += step(texture2D(tShadowW, q.xy + vec2(1.6, 0.6) * uShTexelW).r, z);
  o += step(texture2D(tShadowW, q.xy + vec2(-0.6, 1.6) * uShTexelW).r, z);
  o += step(texture2D(tShadowW, q.xy + vec2(-1.6, -0.6) * uShTexelW).r, z);
  o += step(texture2D(tShadowW, q.xy + vec2(0.6, -1.6) * uShTexelW).r, z);
  return o / 5.0;
}
varying vec3 vRP, vRN, vWP, vWN, vAxW;
varying vec2 vFlow; varying float vCurv;
varying vec3 vR0, vR1, vR2;
flat varying float vMat;
${NOISE}
float band(float x, float t){ float w = max(fwidth(x), 1e-4) * 0.75; return smoothstep(t - w, t + w, x); }
vec4 brushTri(vec3 p, vec3 n, out vec3 pert){
  vec3 an = abs(n);
  vec3 sg = sign(n + 1e-4);
  vec3 Tx = vec3(0., 0., -sg.x), Bx = vec3(0., 1., 0.);
  vec3 Ty = vec3(1., 0., 0.),    By = vec3(0., 0., -sg.y);
  vec3 Tz = vec3(sg.z, 0., 0.),  Bz = vec3(0., 1., 0.);
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
  return sx * k.x + sy * k.y + sz * k.z;
}
void main(){
  int mi = int(vMat + 0.5);
  vec3 uCol = uColA[mi], uCol2 = uCol2A[mi], uHatchCol = uHatchColA[mi], uHi = uHiA[mi], uBack = uBackA[mi];
  float uScale = uP1A[mi].x, uBump = uP1A[mi].y, uGloss = uP1A[mi].z, uSheen = uP1A[mi].w;
  float uHatchAmt = uP2A[mi].x, uRimAmt = uP2A[mi].y, uFace = uP2A[mi].z, uHatchScale = uP2A[mi].w;
  float uKind = uP3A[mi].x, uJit = uP3A[mi].y, uT1 = uP3A[mi].z, uT2 = uP3A[mi].w;
  float uHang = uP4A[mi].x;
  bool isSilk = abs(uKind - 1.0) < 0.5, isSkin = abs(uKind - 2.0) < 0.5, isHair = abs(uKind - 3.0) < 0.5;
  bool isWool = abs(uKind - 4.0) < 0.5, isShiny = uKind > 4.5;
  vec3 No = normalize(vRN);
  vec3 pert;
  vec4 b = brushTri(vRP * uScale, No, pert);
  float tone = b.b, det = b.a;
  mat3 R = mat3(normalize(vR0), normalize(vR1), normalize(vR2));
  vec3 N = normalize(vWN);
  vec3 Np = normalize(R * normalize(No + pert * uBump));
  vec3 V = normalize(cameraPosition - vWP);
  bool back = !gl_FrontFacing;
  if (back && uP4A[mi].y > 0.5) discard;         // closed parts: their inside is never drawn
  if (back) { N = -N; Np = -Np; }
  float big = vn(vFlow * vec2(6.0, 3.5) + 3.1);
  float j = ((tone - 0.5) * 0.3 + (big - 0.5) * 0.5) * uJit;
  float ndl = dot(Np, uLight);
  float sh = 1.0;
  #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
    sh = getShadowMask();
    sh = band(sh + (tone - 0.5) * 0.25, 0.5);
  #endif
  if (uShOnW > 0.5) sh = min(sh, band(1.0 - worldShadow(vWP + normalize(vWN) * 0.03) + (tone - 0.5) * 0.25, 0.5));
  float cav = smoothstep(0.25, 0.85, vCurv);
  float nf = dot(Np, uFill);
  float qf = band(nf - cav * 0.35, uT1 + 0.28 + j);
  float qk = band(ndl - cav * 0.3, uT2 - 0.1 + j * 0.8) * sh;
  vec3 mid = mix(uCol, uCol2, 0.42);
  // the shade is lit by the open sky, as the world's painted things are: cool purple from above, warmer low down;
  // her cloth keeps a little of its own shade tint so it still reads as its colour
  vec3 amb = mix(uSkyLow, uSkyTop, clamp(Np.y * 0.5 + 0.5, 0.0, 1.0));
  vec3 ambK = mix(amb * uAmbGain, uShadeCol, uAmbKeep);
  vec3 deep = mix(uCol, uCol2, 0.2) * ambK * 0.78;
  vec3 shade = mid * ambK * mix(vec3(1.0), uFillCol, 0.25);
  float qs = band(nf + (tone - 0.5) * 0.3, 0.72 + j * 0.6);
  vec3 shade2 = mix(mid, uCol2, 0.3) * ambK * 1.12;
  vec3 lit = uCol2 * uLightCol;
  deep *= 1.0 - 0.25 * cav;
  vec3 col = mix(deep, shade, qf);
  col = mix(col, shade2, qs * qf * (1.0 - cav));
  col = mix(col, lit, qk);
  // the lantern: a painted step of warm light on whatever faces it
  vec3 Lv = uLamp.xyz - vWP;
  float ld = length(Lv);
  float latt = clamp(1.0 - ld / uLamp.w, 0.0, 1.0);
  latt *= latt;
  float le = max(dot(Np, Lv / max(ld, 1e-4)), 0.0) * latt;
  float lq = band(le + (tone - 0.5) * 0.12, 0.16) * (1.0 - qk);
  col = mix(col, mix(uCol, uCol2, 0.62) * uLampCol * 1.15, lq * 0.85);
  float dark = clamp((uHatchUp - nf) / 0.9, 0.0, 1.0) * (1.0 - qk) * (1.0 - lq * 0.7);
  dark = max(dark, cav * 0.85);
  float hangK = step(vRP.y, uHang);
  vec2 huv = mix(vFlow, vec2(vFlow.y * 0.8, vFlow.x * 1.6), hangK) * uHatchScale;
  huv.y += 0.08 * sin(vFlow.x * 9.0) * (1.0 - hangK);
  vec4 h = texture2D(tHatch, huv);
  float hv = h.r;
  hv = max(hv, h.g * smoothstep(0.6, 0.85, dark));
  float hm = band(hv, 0.55) * uHatchAmt * smoothstep(0.35, 0.65, dark) * (1.0 - qf * uHatchFill);
  col = mix(col, uHatchCol, hm);
  vec3 V2 = V;
  vec3 Hk = normalize(uLight + V2), Hf = normalize(uFill + V2);
  if (isSilk || isHair) {
    vec3 T = normalize(vAxW);
    float jit = isHair ? (tone - 0.5) * 0.12 + 0.05 * sin(vFlow.x * 60.0) : (tone - 0.5) * 0.08;
    float dk = dot(T, Hk) + jit, df = dot(T, Hf) + jit;
    float pw = isHair ? 120.0 : 60.0;
    float sk = pow(sqrt(max(0.0, 1.0 - dk * dk)), pw) * smoothstep(-0.2, 0.3, ndl) * sh;
    float sf = pow(sqrt(max(0.0, 1.0 - df * df)), pw) * smoothstep(-0.1, 0.4, nf);
    float streak = isSilk ? texture2D(tBrush, vec2(vFlow.x * 7.0, vFlow.y * 0.6) + 0.13).a : 1.0;
    float gate = 0.55 + 0.7 * streak;
    float lineK = 0.0;
    if (isHair) {
      float lane = vFlow.x * 26.0 + (vn(vec2(vFlow.y * 9.0, vFlow.x * 3.0)) - 0.5) * 0.5;
      float d = abs(fract(lane) - 0.5);
      float wline = 0.018 + 0.03 * vn(vec2(floor(lane) * 3.1, vFlow.y * 4.0)) * step(0.35, hash12(vec2(floor(lane), 1.7)));
      lineK = (1.0 - smoothstep(wline, wline + fwidth(lane) * 1.2, 0.5 - d)) * smoothstep(0.0, 0.05, vFlow.y + 0.02);
      float strand = 1.0 - smoothstep(0.0, fwidth(lane * 3.0) * 1.5, abs(fract(lane * 3.0 + 0.3) - 0.5) - 0.46);
      col = mix(col, mix(col, uCol2 * 1.8, 0.5), strand * 0.35 * (1.0 - lineK));
    }
    vec3 khi = isSilk ? mix(lit, uHi, 0.5) : uHi;
    col = mix(col, khi, band(sk * gate, isHair ? 0.55 : 0.65) * uSheen * (1.0 - lineK));
    float gateF = isSilk ? smoothstep(0.45, 0.7, streak) : 1.0;
    vec3 fhi = isHair ? mix(col, uHi, 0.55) : mix(shade, uHi, 0.45);
    col = mix(col, fhi, band(sf * gateF, isHair ? 0.62 : 0.7) * uSheen * (1.0 - qk) * (1.0 - lineK));
    if (isHair) col = mix(col, uInk * 0.5, lineK * 0.85);
  } else if (isShiny) {
    float nh = max(dot(normalize(N + (Np - N) * 0.5), Hf), 0.0);
    col = mix(col, uHi, band(pow(nh, 30.0) * (0.5 + det), 0.5) * uGloss);
  } else if (uGloss > 0.0) {
    float nh = max(dot(normalize(N + (Np - N) * 0.5), Hf), 0.0);
    col = mix(col, mix(shade, uHi, 0.6), band(pow(nh, 14.0) * (0.35 + 1.1 * det), 0.55) * uGloss);
  }
  if (isWool) col *= 0.94 + 0.12 * det;
  float fres = 1.0 - abs(dot(N, V));
  // (strongest on the edges that face the sun across the picture: with the sun ahead, the tops and the sun's side)
  vec2 nsc = (viewMatrix * vec4(N, 0.0)).xy;
  float sunSide = smoothstep(-0.35, 0.55, dot(normalize(nsc + 1e-5), normalize(uLightScreen + 1e-5)));
  float rim = band(pow(fres, uRimPow) * max(dot(N, uLight) + uRimReach, 0.0) * mix(0.35, 1.0, sunSide) + (det - 0.5) * 0.25, 0.42) * sh;
  col = mix(col, mix(uCol2, uSunRim, 0.6) * uLightCol * uRimGain, rim * uRimAmt);
  if (back) col = uBack * mix(vec3(1.0), uShadeCol, 0.5) * (0.9 + 0.2 * tone);
  if (uFace > 0.5) {
    vec3 d = vRP - uHeadC;
    float f = smoothstep(0.025, 0.05, d.z) * step(-0.14, d.y) * step(d.y, 0.06);
    col = mix(col, deep, f);
  }
  gl_FragColor = vec4(col, 1.0);
  if (uFaceMask > 0.5) {
    vec3 dq = vRP - uHeadC;
    float fm = uFace > 0.5 ? step(0.03, dq.z) * step(-0.13, dq.y) * step(dq.y, 0.05) * step(abs(dq.x), 0.06) : 0.0;
    // 2: only the features' zone (eyes, nose, mouth: the front of the face)
    if (uFaceMask > 1.5) fm *= step(0.065, dq.z) * step(abs(dq.x), 0.035) * step(-0.1, dq.y) * step(dq.y, 0.03);
    gl_FragColor = fm > 0.5 ? vec4(1.0, 0.0, 1.0, 1.0) : vec4(0.0, 0.0, 0.0, 1.0);
    // 3: the features' zone, its rest-space place as a colour (x, y, z around the head's centre), for finding what shows
    if (uFaceMask > 2.5) gl_FragColor = fm > 0.5 ? vec4(0.5 + dq.x * 10.0, 0.5 + dq.y * 5.0, dq.z * 10.0, 1.0) : vec4(0.0, 0.0, 0.0, 1.0);
  }
}`;

export function paintMaterial(table, { headC = null, side = THREE.FrontSide } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights), ...PU, ...table, uHullPush: { value: 0 }, uHeadC: { value: headC ?? PU.uHeadC.value } },
    vertexShader: paintVert, fragmentShader: paintFrag, side, lights: true,
  });
}

// ---------------------------------------------------------------- the sun's shadow map sees the same deformed shapes
export function depthMaterial(table) {
  return new THREE.ShaderMaterial({
    uniforms: { ...PU, ...table, uHullPush: { value: 0 } },
    vertexShader: `${DEFORM}\nvoid main(){ vec3 wp, wn; mat3 m; deform(wp, wn, m); gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
    fragmentShader: 'void main(){ gl_FragColor = vec4(1.0); }',
  });
}

// ---------------------------------------------------------------- the hull: ink and both colour bands in one pass
// The hull geometry is three copies of a coarse shell (aLayer 2, 1, 0 in that order): 0 ink, 1 vermilion (lit side), 2 mint (shade side).
const hullVert = /* glsl */`
${DEFORM}
attribute float aCurv; attribute float aLayer;
uniform vec2 uRes; uniform float uPxScale; uniform vec3 uLight;
uniform vec2 uLightScreen;
uniform float uInkWA[${NMAT}], uBandsA[${NMAT}];
varying float vA; varying vec3 vRP;
flat varying float vLayer;
${NOISE}
void main(){
  vec3 wp, wn; mat3 m;
  deform(wp, wn, m);
  vec4 c = project(wp);
  vec4 cn = projectionMatrix * viewMatrix * vec4(wn, 0.0);
  vec2 n2 = cn.xy;
  float ln = length(n2);
  n2 = ln > 1e-5 ? n2 / ln : vec2(0.0);
  int mi = int(aMat + 0.5);
  float ink = uInkWA[mi];
  float W, side;
  if (aLayer < 0.5) { W = ink * 1.2; side = 0.0; }
  else if (aLayer < 1.5) { W = (ink * 0.4 + 1.0) * uBandsA[mi] * step(0.01, ink); side = 1.0; }
  else { W = (ink * 1.2 + 1.2) * uBandsA[mi] * step(0.01, ink); side = -1.0; }
  float ndl = dot(wn, uLight);
  float w = 0.0;
  if (side == 0.0) {
    float brk = vn3(position * 34.0);
    float cav = smoothstep(0.2, 0.8, aCurv);
    float shade = smoothstep(0.25, -0.35, ndl);
    w = W * (pow(shade, 0.8) * 1.25 + cav * 0.8) * (0.55 + 0.75 * brk);
  } else {
    float s = dot(n2, normalize(uLightScreen)) * side;
    w = W * smoothstep(-0.1, 0.35, s) * (0.6 + 0.8 * vn3(position * 21.0 + side));
  }
  vA = W > 0.0 ? w / W : 0.0;
  vRP = position;
  vLayer = aLayer;
  c.xy += n2 * w * uPxScale * 2.0 / uRes * c.w;
  // where the lines overlap, the ink lies on top
  c.z -= (2.0 - aLayer) * 2e-5 * c.w;
  gl_Position = c;
}`;
const hullFrag = /* glsl */`
uniform vec3 uInk, uBand1, uBand2;
varying float vA; varying vec3 vRP;
flat varying float vLayer;
${NOISE}
void main(){
  float g = vn3(vRP * 90.0);
  bool isInk = vLayer < 0.5;
  if (isInk && g < 0.34 - 0.3 * clamp(vA, 0.0, 1.0)) discard;
  if (!isInk && g < 0.3) discard;
  if (vA < 0.02) discard;
  vec3 c = isInk ? uInk : vLayer < 1.5 ? uBand1 : uBand2;
  gl_FragColor = vec4(c * (0.9 + 0.2 * g), 1.0);
}`;
export function hullMaterial(table) {
  return new THREE.ShaderMaterial({
    uniforms: { ...PU, ...table, uHullPush: { value: 0.03 } },
    vertexShader: hullVert, fragmentShader: hullFrag, side: THREE.BackSide,
  });
}

// ---------------------------------------------------------------- acting lines: skinned ribbons, constant screen width, tapered
// Each point sits on a cloth vertex (its bones, its cloth node); its direction along the line rides the skinning as the normal does.
// aInfo = (side -1/1, t along the stroke, line number): the width of each line is uFoldW[line], set once per drawing.
const foldVert = /* glsl */`
${DEFORM}
attribute vec3 aInfo;
uniform vec2 uRes; uniform float uPxScale;
uniform float uFoldW[${NFOLD}];
varying float vT, vW; varying vec2 vSeed;
void main(){
  vec3 wp, wn; mat3 m;
  deform(wp, wn, m);
  wp += normalize(cameraPosition - wp) * 0.004;       // lifted toward the eye so the cloth never swallows it
  vec4 c = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  vec4 c2 = projectionMatrix * viewMatrix * vec4(wp + wn * 0.01, 1.0);
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 s = (c2.xy / c2.w - c.xy / c.w) * asp;
  vec2 nrm = normalize(vec2(-s.y, s.x) + 1e-6) / asp;
  float t = aInfo.y;
  float taper = pow(max(sin(3.14159 * t), 0.0), 0.55) * (1.15 - 0.45 * t);
  float wpx = uFoldW[int(aInfo.z + 0.5)];
  float w = wpx * taper;
  c.xy += nrm * aInfo.x * w * uPxScale * 2.0 / uRes.y * c.w;
  vT = t; vW = wpx; vSeed = position.xy * 13.0;
  gl_Position = c;
}`;
const foldFrag = /* glsl */`
uniform vec3 uColor;
varying float vT, vW; varying vec2 vSeed;
${NOISE}
void main(){
  if (vW < 0.05) discard;
  float g = vn(vec2(vT * 22.0, vSeed.x));
  if (g < 0.22 * smoothstep(0.55, 1.0, vT) + 0.08) discard;     // the brush runs dry toward the end
  gl_FragColor = vec4(uColor, 1.0);
}`;
export function foldMaterial(table, color) {
  return new THREE.ShaderMaterial({
    uniforms: { ...PU, ...table, uHullPush: { value: 0 }, uFoldW: { value: new Array(NFOLD).fill(0) }, uColor: { value: color ? lin(color) : PU.uInk.value } },
    vertexShader: foldVert, fragmentShader: foldFrag, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  });
}

// ---------------------------------------------------------------- the hatching sheet, laid out at load from the real scanned strokes
// strokes.png is a 4x4 sheet of real brush strokes (from the CC0 scans, see NGUON). Dry horizontal ones are laid in rows:
// u runs round the form, so the strokes wrap round an arm or across a back. Three densities in r, g, b.
export function bakeHatch(strokesImage, size = 512) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  const cell = strokesImage.width / 4;
  const src = [[0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 0], [3, 0]];
  let s = 1234567;
  const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = cell;
  const tg = tmp.getContext('2d');
  g.globalCompositeOperation = 'lighter';
  const layers = [{ rows: 7, ch: 'rgba(255,0,0,1)', off: 0 }, { rows: 7, ch: 'rgba(0,255,0,1)', off: 0.5 }, { rows: 14, ch: 'rgba(0,0,255,1)', off: 0.25 }];
  for (const L of layers) {
    for (let r = 0; r < L.rows; r++) {
      const y0 = ((r + L.off) / L.rows) * size;
      let x = R() * size;
      const count = 2 + Math.floor(R() * 2);
      for (let k = 0; k < count; k++) {
        const [cx, cy] = src[Math.floor(R() * src.length)];
        tg.globalCompositeOperation = 'source-over';
        tg.clearRect(0, 0, cell, cell);
        tg.drawImage(strokesImage, cx * cell, cy * cell, cell, cell, 0, 0, cell, cell);
        tg.globalCompositeOperation = 'multiply';
        tg.fillStyle = L.ch;
        tg.fillRect(0, 0, cell, cell);
        const len = size * (0.28 + R() * 0.2);
        const sx = len / cell, sy = (size / L.rows) * (0.34 + R() * 0.14) / (cell * 0.45);
        const a = (R() - 0.5) * 0.12;
        const yy = y0 + (R() - 0.5) * size / L.rows * 0.25;
        for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
          g.save();
          g.translate(x + ox, yy + oy);
          g.rotate(a);
          g.scale(sx, sy);
          g.drawImage(tmp, -cell / 2, -cell / 2);
          g.restore();
        }
        x = (x + len * (0.9 + R() * 0.4)) % size;
      }
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}
