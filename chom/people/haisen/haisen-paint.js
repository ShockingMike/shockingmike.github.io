// Chớm, mùa Hạ: the paint for the lotus picker (from people/dong/dong-paint.js; one merged skinned mesh, one palette).
//   paint   flat steps of light at a hot dusk: the lilac sky fills from above, the gold of the lake from below, the low sun
//           from behind her in two stepped bands cut by the sun's shadow map (core); a hot broken rim where the sun catches
//           her edges; cross-contour hatching of real dry-brush strokes in the shade; each thing its own touch: the faded
//           áo bà ba with a faint small print, dark trousers, a thin scarf, hair combed back to a coiled bun (strands and
//           lanes toward the bun, light along them), the nón lá's palm-leaf strips and hoops, glowing where the sun shines
//           through it
//   ink     inverted hull: heavy on the shaded side and in hollows, thin to nothing toward the sun, broken like a dry brush
//   band    thin mis-registered colour bands, both in one pass: vermilion toward the sun (on screen), mint away from it
//   fold    acting lines: short brush strokes laid on the cloth for each drawing
//   depth   the same deformation for the sun's shadow map (she shades the lotus leaves)
// Strokes are read from the rest pose, so they stay glued to the cloth while the body moves.
import * as THREE from 'three';

const lin = (h) => new THREE.Color(h);
export const NPAL = 48;           // palette rows
export const NCLOTH = 64;         // spring nodes for the loose parts (scarf ends, hair)

// shared by every pass (the world's U is merged in by makeMaterials)
export const PU = {
  tHatch: { value: null }, tPal: { value: null },
  uNPal: { value: NPAL },
  uInk: { value: lin('#120c12') },
  uRes: { value: new THREE.Vector2(1, 1) },
  uPxScale: { value: 1 },
  uCloth: { value: Array.from({ length: NCLOTH }, () => new THREE.Vector3()) },
  uProbe: { value: 0 },
  // core's face check (README 11): 1 = the whole face magenta and the rest of her black, 2 = only the features, 3 = all of her (a check of the pass itself)
  uFaceMask: { value: 0 },
  uLampScreen: { value: new THREE.Vector2(0, 1) },
  uSolo: { value: -1 },
};
export const KIND = { cotton: 0, quilt: 1, skin: 2, hair: 3, knit: 4, leather: 5, felt: 6, plastic: 7, bamboo: 8, ember: 9, wool: 10, metal: 11, leaf: 12 };
const KDEF = {
  cotton: { jit: 0.6, t1: 0.35, t2: 0.4 }, quilt: { jit: 0.5, t1: 0.3, t2: 0.35 }, skin: { jit: 0.35, t1: 0.25, t2: 0.3 },
  hair: { jit: 0.2, t1: 0.45, t2: 0.55 }, knit: { jit: 0.7, t1: 0.3, t2: 0.36 }, leather: { jit: 0.4, t1: 0.4, t2: 0.45 },
  felt: { jit: 0.55, t1: 0.33, t2: 0.4 }, plastic: { jit: 0.3, t1: 0.35, t2: 0.4 }, bamboo: { jit: 0.5, t1: 0.3, t2: 0.4 },
  ember: { jit: 0.2, t1: 0.3, t2: 0.4 }, wool: { jit: 0.75, t1: 0.3, t2: 0.36 }, metal: { jit: 0.3, t1: 0.35, t2: 0.4 },
  leaf: { jit: 0.5, t1: 0.32, t2: 0.36 },
};

// the palette: one row per look, 8 texels
export class Palette {
  constructor() {
    this.data = new Float32Array(NPAL * 8 * 4);
    this.n = 0;
    this.tex = new THREE.DataTexture(this.data, 8, NPAL, THREE.RGBAFormat, THREE.FloatType);
    this.tex.minFilter = this.tex.magFilter = THREE.NearestFilter;
    this.tex.generateMipmaps = false;
    this.tex.colorSpace = THREE.NoColorSpace;
    PU.tPal.value = this.tex;
  }
  add(l) {
    const row = this.n++;
    if (row >= NPAL) throw new Error('palette full');
    const K = KDEF[l.kind] ?? KDEF.cotton;
    const set = (texel, r, g, b, a) => { const o = (row * 8 + texel) * 4; this.data[o] = r; this.data[o + 1] = g; this.data[o + 2] = b; this.data[o + 3] = a; };
    const c = (h) => lin(h);
    const col = c(l.col), col2 = c(l.col2), hatch = c(l.hatch ?? l.col), hi = c(l.hi ?? '#fff2e0'), back = c(l.back ?? l.col);
    set(0, col.r, col.g, col.b, KIND[l.kind] ?? 0);
    set(1, col2.r, col2.g, col2.b, l.scale ?? 6);
    set(2, hatch.r, hatch.g, hatch.b, l.hatchAmt ?? 0.7);
    set(3, hi.r, hi.g, hi.b, l.sheen ?? 0);
    set(4, back.r, back.g, back.b, l.rim ?? 0.7);
    set(5, l.bump ?? 0.6, l.gloss ?? 0, l.hatchScale ?? 6, l.ink ?? 2.4);
    set(6, l.emit ?? 0, l.jit ?? K.jit, l.t1 ?? K.t1, l.t2 ?? K.t2);
    set(7, l.band ?? 1, l.cav ?? 1, l.air ?? 0, l.print ?? 0);
    this.tex.needsUpdate = true;
    return row;
  }
}

const NOISE = /* glsl */`
float hash12v(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnv(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash12v(i), hash12v(i+vec2(1,0)), f.x), mix(hash12v(i+vec2(0,1)), hash12v(i+vec2(1,1)), f.x), f.y); }
float vn3(vec3 p){ return vnv(p.xy * 1.0 + p.z * 1.7) * 0.5 + vnv(p.zx * 1.3 + p.y * 2.1) * 0.5; }
`;

// skinning + the loose parts' spring offsets, shared by every pass
const DEFORM = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
attribute vec4 aCloth;          // x: first node (-1 = none), y: column, z: row, w: columns
attribute float aClothW;
attribute float aChar;
uniform vec3 uCloth[${NCLOTH}];
uniform float uHullPush, uSolo;
bool hiddenChar(){ return uSolo > -0.5 && abs(aChar - uSolo) > 0.5; }
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
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  wpos = wp.xyz + clothAt();
  wnrm = normalize(mat3(modelMatrix) * objectNormal);
  rot = mat3(modelMatrix);
  #ifdef USE_SKINNING
    rot = rot * mat3(skinMatrix);
  #endif
}
vec4 project(vec3 wp){
  if (hiddenChar()) return vec4(2.0, 2.0, 2.0, 1.0);
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  if (uHullPush > 0.0) mv.xyz *= 1.0 + uHullPush / max(length(mv.xyz), 1e-3);
  return projectionMatrix * mv;
}
`;

// the palette, read in the vertex shader and handed on flat
const PAL_READ = /* glsl */`
uniform sampler2D tPal; uniform float uNPal;
attribute float aMat;
vec4 pal(float t){ return texture2D(tPal, vec2((t + 0.5) / 8.0, (aMat + 0.5) / uNPal)); }
`;

// the lamps as a vertex shader can see them (no derivatives here)
const LAMPS_V = (NB) => /* glsl */`
uniform vec4 uBulb[${NB}]; uniform vec3 uBulbCol[${NB}]; uniform float uBulbFlag[${NB}]; uniform vec4 uBulbDir[${NB}]; uniform float uBulbInner[${NB}];
uniform vec3 uKeyDir; uniform float uSunOn;
// how much warm light reaches this vertex (no shadows), and toward which lamp most of it comes from
float lampsAt(vec3 wp, vec3 n, out vec3 dom){
  float tot = 0.0, best = 0.0; dom = uBulb[1].xyz;
  for (int i = 0; i < ${NB}; i++) {
    if (dot(uBulbCol[i], vec3(1.0)) <= 0.001) continue;
    vec3 Lv = uBulb[i].xyz - wp; float d = length(Lv); vec3 L = Lv / max(d, 1e-4);
    float att = clamp(1.0 - d / uBulb[i].w, 0.0, 1.0); att *= att;
    if (uBulbDir[i].w > -1.5) att *= smoothstep(uBulbDir[i].w, uBulbInner[i], dot(-L, uBulbDir[i].xyz));
    float e = att * max(dot(n, L) + 0.2, 0.0) * dot(uBulbCol[i], vec3(0.33));
    tot += e;
    if (att * dot(uBulbCol[i], vec3(0.33)) > best) { best = att * dot(uBulbCol[i], vec3(0.33)); dom = uBulb[i].xyz; }
  }
  return tot + uSunOn * max(dot(n, uKeyDir), 0.0) * 0.3;
}
`;

const paintVert = (NB) => /* glsl */`
${DEFORM}
${PAL_READ}
attribute vec2 aFlow; attribute vec3 aAxis; attribute float aCurv; attribute float aFace; attribute vec3 aSeed; attribute vec2 aQuilt;
varying vec3 vRP, vRN, vWP, vWN, vAxW;
varying vec2 vFlow, vQuilt; varying float vCurv, vFace;
varying vec3 vR0, vR1, vR2;
flat varying vec4 vP0, vP1, vP2, vP3, vP4, vP5, vP6, vP7;
flat varying float vChar;
void main(){
  vChar = aChar;
  vec3 wp, wn; mat3 m;
  deform(wp, wn, m);
  vRP = position + aSeed; vRN = normal; vWP = wp; vWN = wn;
  vR0 = m[0]; vR1 = m[1]; vR2 = m[2];
  vAxW = normalize(m * aAxis);
  vFlow = aFlow; vCurv = aCurv; vFace = aFace; vQuilt = aQuilt;
  vP0 = pal(0.0); vP1 = pal(1.0); vP2 = pal(2.0); vP3 = pal(3.0); vP4 = pal(4.0); vP5 = pal(5.0); vP6 = pal(6.0); vP7 = pal(7.0);
  gl_Position = project(wp);
}`;

const paintFrag = (COMMON, NB) => /* glsl */`
${COMMON}
uniform sampler2D tHatch;
uniform vec3 uInk; uniform float uProbe; uniform float uFaceMask;
varying vec3 vRP, vRN, vWP, vWN, vAxW;
varying vec2 vFlow, vQuilt; varying float vCurv, vFace;
varying vec3 vR0, vR1, vR2;
flat varying vec4 vP0, vP1, vP2, vP3, vP4, vP5, vP6, vP7;
flat varying float vChar;
void main(){
  if (uProbe > 2.5) { gl_FragColor = vec4(vChar < 0.5 ? 40.0 : 0.0, abs(vChar - 1.0) < 0.5 ? 40.0 : 0.0, abs(vChar - 2.0) < 0.5 ? 40.0 : 0.0, 1.0); return; }
  if (uProbe > 0.5 && uProbe < 1.5) { gl_FragColor = vFace > 1.5 ? vec4(0.0, 40.0, 40.0, 1.0) : vFace > 0.5 ? vec4(40.0, 0.0, 40.0, 1.0) : vec4(0.0, 0.0, 0.0, 1.0); return; }
  // the face mask: aFace 1 = the features (brows, eyes, nose, mouth), 2 = the cheeks and jaw
  if (uFaceMask > 0.5) {
    bool face = (uFaceMask > 2.5 && uFaceMask < 3.5) || (vFace > 0.5 && (uFaceMask < 1.5 || vFace < 1.5));
    // 5 = the same, but her skin dark red and everything she wears dark blue, to see what a leak sits next to
    if (uFaceMask > 4.5) {
      vec3 c5 = abs(vP0.a - 2.0) < 0.5 ? vec3(0.3, 0.0, 0.0) : vec3(0.0, 0.0, 0.4);
      gl_FragColor = vec4((vFace > 0.5 && vFace < 1.5 && gl_FrontFacing) ? vec3(1.0, 0.0, 1.0) : c5, 1.0);
      return;
    }
    gl_FragColor = (face && gl_FrontFacing) ? vec4(1.0, 0.0, 1.0, 1.0) : vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float kind = vP0.a;
  bool isQuilt = abs(kind - 1.0) < 0.5, isSkin = abs(kind - 2.0) < 0.5, isHair = abs(kind - 3.0) < 0.5, isKnit = abs(kind - 4.0) < 0.5;
  bool isLeather = abs(kind - 5.0) < 0.5, isFelt = abs(kind - 6.0) < 0.5, isPlastic = abs(kind - 7.0) < 0.5, isBamboo = abs(kind - 8.0) < 0.5;
  bool isEmber = abs(kind - 9.0) < 0.5, isWool = abs(kind - 10.0) < 0.5, isMetal = abs(kind - 11.0) < 0.5, isLeaf = abs(kind - 12.0) < 0.5;
  vec3 C0 = vP0.rgb, C2 = vP1.rgb, CH = vP2.rgb, CHi = vP3.rgb, CB = vP4.rgb;
  float scale = vP1.a, hatchAmt = vP2.a, sheen = vP3.a, rimAmt = vP4.a;
  float bump = vP5.r, gloss = vP5.g, hatchScale = vP5.b;
  float emit = vP6.r, jit = vP6.g, T1 = vP6.b, T2 = vP6.a;
  vec3 No = normalize(vRN);
  vec3 pert; vec2 uvS;
  vec4 b = brushTri(vRP * scale, No, 0.0, pert, uvS);
  float tone = b.b, det = b.a;
  mat3 Rm = mat3(normalize(vR0), normalize(vR1), normalize(vR2));
  vec3 N = normalize(vWN);
  vec3 Np = normalize(Rm * normalize(No + pert * bump));
  vec3 V = normalize(cameraPosition - vWP);
  bool back = !gl_FrontFacing;
  if (back) { N = -N; Np = -Np; }
  float big = vn(vFlow * vec2(6.0, 3.5) + 3.1 + vRP.xz * 0.7);
  float j = ((tone - 0.5) * 0.3 + (big - 0.5) * 0.5) * jit;
  float cav = smoothstep(0.25, 0.85, vCurv) * vP7.g;
  // the cloth's own surface: knit ribs, felt nap, the quilting's puffs
  float ribs = 0.0;
  if (isKnit || isWool) {
    float r = vFlow.x * (isWool ? 70.0 : 110.0) + (tone - 0.5) * 0.6;
    ribs = smoothstep(0.25, 0.5, abs(fract(r) - 0.5));
    Np = normalize(Np + normalize(cross(N, normalize(vAxW))) * (ribs - 0.5) * 0.35);
  }
  if (isFelt) Np = normalize(Np + pert * 0.25);
  // the quilting of an áo bông: channels across the body and round the sleeves, each one a puff between two stitched seams
  float seam = 0.0;
  if (isQuilt) {
    float qy = vQuilt.x + 0.1 * sin(vFlow.x * 11.0);
    float ph = fract(qy);
    float ds = min(ph, 1.0 - ph);
    float fw = fwidth(qy) * 1.2;
    seam = (1.0 - smoothstep(0.035, 0.035 + fw, ds)) * vQuilt.y;
    // the puff: the surface turns away from the light near each seam
    Np = normalize(Np + normalize(vAxW) * (0.5 - ph) * 0.9 * vQuilt.y);
  }

  // the dusk: the lilac sky fills from above (one step, so the strokes still read in the shade); the shade keeps the cloth's
  // own colour, cooled toward the season's lilac
  vec3 amb = mix(uSkyLow, uSkyTop, Np.y * 0.5 + 0.5);
  vec3 coolT = mix(vec3(1.0), uKShade / max(dot(uKShade, vec3(0.333)), 1e-3), 0.55);
  float nf = dot(Np, uFillDir);
  float qf = band(nf - cav * 0.35 + j, T1 - 0.1);
  vec3 alb = mix(C0, C2, 0.45 + 0.3 * (tone - 0.5));
  vec3 deep = mix(C0, C2, 0.22) * coolT * 0.55 * (1.0 - 0.3 * cav);
  vec3 shade = mix(C0, C2, 0.46) * coolT * mix(vec3(0.78), amb / max(dot(amb, vec3(0.333)), 1e-3) * 0.8, 0.35);
  vec3 col = mix(deep, shade, qf);
  // the lake's gold, thrown up from below
  float bounce = band(-Np.y * 0.9 + 0.12 + j * 0.3 - cav * 0.25, 0.3);
  col = mix(col, mix(C0, C2, 0.52) * mix(vec3(1.0), uAirSun / max(max(uAirSun.r, uAirSun.g), uAirSun.b), 0.75) * 0.9, bounce * 0.5);
  // the low sun behind her: two painted steps, cut by the sun's shadow map (the boat, the pole, her own arms)
  float sunV = uSunOn * sunMask(vWP, (det - 0.5) * 0.3);
  float sh = band(dynShadow(vWP + N * 0.045, (vec2(det, tone) - 0.5) * 3.0) + (tone - 0.5) * 0.3, 0.5);
  float sunL = sunV * (1.0 - sh);
  float ndl = dot(Np, uKeyDir);
  float q1 = band(ndl + j * 0.5 - cav * 0.2, -0.04) * sunL;
  float q2 = band(ndl + j * 0.5 - cav * 0.2, 0.32) * sunL;
  float sk = 0.86 + 0.28 * tone + 0.1 * (det - 0.5);
  vec3 lit1 = mix(alb, C2, 0.35) * uKeyCol * 0.92 * sk;
  vec3 lit2 = mix(C2, CHi, 0.22) * uKeyCol * 1.08 * sk;
  col = mix(col, lit1, q1);
  col = mix(col, lit2, q2);
  float lit = q1 * 0.6 + q2 * 0.4;
  vec3 Ldom = uKeyDir; vec3 Cdom = uKeyCol; float Edom = q1;
  // a faint small print on the blouse (hoa nhí), fixed to the cloth
  if (vP7.a > 0.5) {
    vec2 pu = vFlow * 62.0;
    vec2 cell = floor(pu), fr = fract(pu) - 0.5;
    vec2 off = (vec2(hash12(cell + 3.1), hash12(cell + 7.7)) - 0.5) * 0.45;
    float dk = 1.0 - smoothstep(0.07, 0.07 + fwidth(pu.x) * 1.5, length(fr - off));
    col = mix(col, mix(col, CHi, 0.3), dk * step(0.45, hash12(cell)) * 0.4);
  }

  // cross-contour hatching of dry-brush strokes, only where no light reaches and in the hollows
  float dark = clamp((0.4 - nf) / 0.9, 0.0, 1.0) * (1.0 - lit);
  dark = max(dark, cav * 0.8);
  vec2 huv = vFlow * hatchScale;
  huv.y += 0.08 * sin(vFlow.x * 9.0);
  vec4 h = texture2D(tHatch, huv);
  float hv = max(h.r, h.g * smoothstep(0.6, 0.85, dark));
  float hm = band(hv, 0.55) * hatchAmt * smoothstep(0.35, 0.7, dark);
  col = mix(col, CH * coolT * mix(0.6, 1.0, lit), hm);

  vec3 H = normalize(Ldom + V);
  if (isHair) {
    // combed back into the bun: lanes and strands run toward it (and round the coil of the bun itself), light along them
    bool inBun = vQuilt.y > 0.5;
    float lane = inBun ? vFlow.x * 50.0 : vFlow.x * 26.0 + (vn(vec2(vFlow.y * 9.0, vFlow.x * 3.0)) - 0.5) * 0.5;
    float lineK = 1.0 - smoothstep(0.03, 0.03 + fwidth(lane) * 1.2, 0.5 - abs(fract(lane) - 0.5));
    float sl = inBun ? vFlow.x * 130.0 : vFlow.x * 70.0;
    float si = floor(sl);
    float core = 1.0 - smoothstep(0.12, 0.12 + fwidth(sl) * 1.5, abs(fract(sl) - 0.5));
    float along = vn(vec2(si * 1.37, vFlow.y * 16.0 + si * 0.61));
    float streak = core * smoothstep(0.42, 0.62, along);
    vec3 T = normalize(vAxW);
    float dk = dot(T, normalize(uKeyDir + V));
    float kaj = pow(sqrt(max(0.0, 1.0 - dk * dk)), 10.0) * (0.3 + 0.7 * sunL);
    float df = dot(T, normalize(uFillDir + V));
    float kajF = pow(sqrt(max(0.0, 1.0 - df * df)), 14.0) * 0.55;
    float hiK = max(kaj, kajF);
    vec3 hc = mix(mix(C2, CHi, 0.3) * uKeyCol, amb * 0.9, step(kaj, kajF) * 0.6);
    col = mix(col, hc, streak * band(hiK, 0.4) * sheen * (1.0 - lineK));
    col = mix(col, uInk * 0.6, lineK * 0.7);
  } else if (isLeaf) {
    // the nón lá: strips of palm leaf from the tip to the rim, sixteen bamboo hoops under them, the leaf glowing where the
    // low sun shines through it from behind
    float rr = vFlow.y;
    float hl = rr * 16.0;
    float hoop = 1.0 - smoothstep(0.03, 0.03 + fwidth(hl) * 1.2, abs(fract(hl) - 0.5));
    float ls = vFlow.x / 6.2832 * 60.0;
    float strip = 1.0 - smoothstep(0.03, 0.03 + fwidth(ls) * 1.2, 0.5 - abs(fract(ls) - 0.5));
    col *= 0.88 + 0.16 * vn(vec2(floor(ls) * 1.7, rr * 2.0));
    col = mix(col, CH * mix(vec3(1.0), coolT, 0.5), hoop * 0.12 + strip * 0.12);
    if (!back) {
      float thru = smoothstep(0.0, 0.7, -dot(N, uKeyDir)) * smoothstep(-0.1, 0.5, -dot(V, uKeyDir)) * sunV;
      vec3 glow = mix(C2, CHi, 0.45) * uKeyCol * (0.8 + 0.2 * tone);
      col = mix(col, glow * mix(1.0, 0.8, hoop), band(thru * (0.55 + 0.6 * tone) - strip * 0.15, 0.32) * 0.42);
    }
  } else if (isLeather || isPlastic || isMetal || gloss > 0.0) {
    float nh = max(dot(normalize(N + (Np - N) * 0.5), H), 0.0);
    col = mix(col, mix(C2, CHi, 0.6) * uKeyCol, band(pow(nh, isMetal ? 40.0 : 18.0) * (0.35 + 1.1 * det), 0.5) * max(gloss, 0.3) * sunL);
  }
  if (isKnit || isWool) col *= 0.9 + 0.2 * ribs * (0.6 + 0.4 * det);
  if (isFelt) col *= 0.95 + 0.1 * det;
  if (isBamboo) {
    // woven split bamboo: two sets of strips, over and under
    float u = vFlow.x * 55.0, v = vFlow.y * 55.0;
    float over = step(0.5, fract(floor(u) * 0.5 + floor(v) * 0.5));
    float strip = mix(smoothstep(0.08, 0.3, abs(fract(u) - 0.5) * 2.0), smoothstep(0.08, 0.3, abs(fract(v) - 0.5) * 2.0), over);
    col *= 0.62 + 0.45 * (1.0 - strip) * (0.8 + 0.4 * tone);
  }

  // the low sun behind her edges: a hot broken rim, the brightest thing on her
  float fres = 1.0 - abs(dot(N, V));
  float rim = band(fres * max(dot(N, uKeyDir) + 0.45, 0.0) * (0.25 + 0.75 * sunV) * (1.0 - sh * 0.6) + (det - 0.5) * 0.25, 0.4);
  col = mix(col, mix(C2, CHi, 0.55) * uKeyCol * 1.3, rim * rimAmt);
  // the sky catching the top edges
  float rimS = band(fres * max(dot(N, uFillDir), 0.0) + (det - 0.5) * 0.2, 0.55);
  col = mix(col, mix(C2, CHi, 0.3) * amb * 0.9, rimS * rimAmt * 0.35 * (1.0 - lit));
  if (isEmber) {
    float glow = smoothstep(0.3, 0.9, det + tone * 0.4);
    col = mix(C0, C2, glow) * (1.0 + emit);
  } else {
    col += C2 * emit * (0.8 + 0.4 * tone);
  }
  // the inside of cloth: deep and quiet
  if (back && !isLeaf) col = CB * coolT * 0.45 * (0.9 + 0.2 * tone);
  if (back && isLeaf) col = mix(C0, C2, 0.3) * coolT * 0.55 * (0.9 + 0.2 * tone);
  // the face (never seen, but if a sliver shows it stays in the shadow of the hat)
  col = mix(col, deep * 0.7, step(0.5, vFace) * step(vFace, 1.5));
  float air = max(airAt(vWP), vP7.b);
  col = mix(col, airCol(vWP), air);
  gl_FragColor = vec4(col, 1.0);
}`;

export function makeMaterials(core) {
  const { U, paint } = core;
  const NB = paint.NB ?? 6;
  const COMMON = paint.COMMON_GLSL();
  const uni = { ...U, ...PU };
  const paintM = new THREE.ShaderMaterial({
    uniforms: { ...uni, uHullPush: { value: 0 } },
    vertexShader: paintVert(NB), fragmentShader: paintFrag(COMMON, NB),
    side: THREE.DoubleSide,
  });
  // ink hull and the two colour bands (one pass): pushed out in screen space
  const hullVert = /* glsl */`
${DEFORM}
${PAL_READ}
${LAMPS_V(NB)}
${NOISE}
attribute float aCurv; attribute float aLayer;
uniform vec2 uRes; uniform float uPxScale;
varying float vA; varying vec3 vRP; flat varying vec3 vCol; flat varying float vOn; flat varying float vSide;
uniform vec3 uRim1, uRim2, uInk;
void main(){
  vec3 wp, wn; mat3 m;
  deform(wp, wn, m);
  float uSide = aLayer;
  vSide = aLayer;
  vec4 mv0 = viewMatrix * vec4(wp, 1.0);
  mv0.xyz *= 1.0 + (0.006 + 0.012 * aLayer) / max(length(mv0.xyz), 1e-3);
  vec4 c = projectionMatrix * mv0;
  if (hiddenChar()) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec4 cn = projectionMatrix * viewMatrix * vec4(wn, 0.0);
  vec2 n2 = cn.xy;
  float ln = length(n2);
  n2 = ln > 1e-5 ? n2 / ln : vec2(0.0);
  vec4 p5 = pal(5.0), p7 = pal(7.0);
  float inkW = p5.a;
  vec3 dom;
  float lit = uSunOn * smoothstep(-0.15, 0.45, dot(wn, uKeyDir));
  dom = wp + uKeyDir * 60.0;
  float brk = vn3(position * 34.0);
  float cav = smoothstep(0.2, 0.8, aCurv) * p7.g;
  float w;
  if (uSide < 0.5) {
    // ink: heavy where the fire does not reach and in hollows, thin to nothing where it does
    float shade = 1.0 - smoothstep(0.05, 0.6, lit);
    w = inkW * (pow(shade, 0.8) * 1.3 + cav * 0.8 + 0.15) * (0.55 + 0.75 * brk);
    vCol = uInk; vOn = 1.0;
  } else {
    // the colour bands: toward the sun on screen (vermilion), away from it (mint)
    vec4 dc = projectionMatrix * viewMatrix * vec4(dom, 1.0);
    vec2 toL = dc.xy / max(dc.w, 1e-3) - c.xy / c.w;
    toL = length(toL) > 1e-5 ? normalize(toL) : vec2(0.0, 1.0);
    float s = dot(n2, toL);
    float lampK = smoothstep(0.0, 0.2, lit);
    float warm = smoothstep(0.05, 0.35, s) * lampK;
    float cold = smoothstep(0.1, 0.5, -s);
    vCol = warm > cold ? uRim1 : uRim2;
    float bw = p7.r * (inkW * 0.6 + 1.5);
    w = bw * max(warm * 1.0, cold * 1.4) * (0.6 + 0.8 * vn3(position * 21.0 + 1.0));
    w += inkW * 1.1 * (0.55 + 0.75 * brk) * 0.0;
    vOn = p7.r;
  }
  vA = w / max(inkW, 1e-3);
  vRP = position;
  c.xy += n2 * w * uPxScale * 2.0 / uRes * c.w;
  gl_Position = c;
}`;
  const hullFrag = /* glsl */`
uniform float uProbe; uniform float uFaceMask;
varying float vA; varying vec3 vRP; flat varying vec3 vCol; flat varying float vOn; flat varying float vSide;
${NOISE}
void main(){
  if (abs(uProbe - 2.0) < 0.5) { gl_FragColor = vSide > 0.5 ? vec4(0.0, 4.0, 0.0, 1.0) : vec4(4.0, 0.0, 4.0, 1.0); return; }
  if (uProbe > 0.5) discard;
  // under the face mask the ink hull is a black shape like the rest of her
  if (uFaceMask > 0.5) { if (vOn < 0.05) discard; gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float g = vn3(vRP * 90.0);
  if (vOn < 0.05) discard;
  if (vSide < 0.5 && g < 0.34 - 0.3 * clamp(vA, 0.0, 1.0)) discard;
  if (vSide > 0.5 && g < 0.3) discard;
  if (vA < 0.02) discard;
  gl_FragColor = vec4(vCol * (0.9 + 0.2 * g), 1.0);
}`;
  // one pass for both: the ink layer and the colour-band layer are two copies of the simplified hull in one buffer;
  // the bands sit a little further from the eye, so the ink wins where they overlap
  const hullM = new THREE.ShaderMaterial({
    uniforms: { ...uni, uHullPush: { value: 0 } },
    vertexShader: hullVert, fragmentShader: hullFrag, side: THREE.BackSide,
  });
  // the casters: the ink layer of the simplified hull (the band layer folds away)
  const depthM = new THREE.ShaderMaterial({
    uniforms: { ...uni, uHullPush: { value: 0 } },
    vertexShader: `${DEFORM}\nattribute float aLayer;\nvoid main(){ vec3 wp, wn; mat3 m; deform(wp, wn, m); gl_Position = (aLayer > 0.5 || hiddenChar()) ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
    fragmentShader: 'void main(){ gl_FragColor = vec4(1.0); }',
    side: THREE.DoubleSide,
  });
  return { paintM, hullM, depthM };
}

// ---------------------------------------------------------------- acting lines: ribbons of constant screen width, tapered like a brush
const foldVert = /* glsl */`
attribute vec3 aDir; attribute vec3 aInfo;     // side (-1, 1), t along the stroke, width in px (0 = hidden)
uniform vec2 uRes; uniform float uPxScale;
varying float vT, vW; varying vec2 vSeed;
void main(){
  vec4 c = projectionMatrix * viewMatrix * vec4(position, 1.0);
  vec4 c2 = projectionMatrix * viewMatrix * vec4(position + aDir * 0.01, 1.0);
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 s = (c2.xy / c2.w - c.xy / c.w) * asp;
  vec2 nrm = normalize(vec2(-s.y, s.x) + 1e-6) / asp;
  float t = aInfo.y;
  float taper = pow(max(sin(3.14159 * t), 0.0), 0.55) * (1.15 - 0.45 * t);
  float w = aInfo.z * taper;
  c.xy += nrm * aInfo.x * w * uPxScale * 2.0 / uRes.y * c.w;
  vT = t; vW = aInfo.z; vSeed = position.xy * 13.0;
  gl_Position = c;
}`;
const foldFrag = /* glsl */`
uniform vec3 uColor; uniform float uProbe; uniform float uFaceMask;
varying float vT, vW; varying vec2 vSeed;
${NOISE}
void main(){
  if (uProbe > 0.5 || uFaceMask > 0.5 || vW < 0.05) discard;
  float g = vnv(vec2(vT * 22.0, vSeed.x));
  if (g < 0.22 * smoothstep(0.55, 1.0, vT) + 0.08) discard;
  gl_FragColor = vec4(uColor, 1.0);
}`;
export function foldMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uRes: PU.uRes, uPxScale: PU.uPxScale, uProbe: PU.uProbe, uFaceMask: PU.uFaceMask, uColor: PU.uInk },
    vertexShader: foldVert, fragmentShader: foldFrag, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  });
}

// ---------------------------------------------------------------- the hatching sheet, laid out at load from the real scanned strokes
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
