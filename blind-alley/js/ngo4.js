import * as THREE from 'three';
import { COMMON, makeShared, makeMaterial, C } from './npr.js';
import { taoMeo3 } from './meo4.js';

export const NGO4 = {
  rong: 2.6, dai: 15, cao: 3.4, day: 0.3, mai: 3.15,
  cua: { x: 0.25, w: 1.05, h: 2.15 },
  la: 0.62,
  nem: [0.232, 0.349, 0.775, 0.102],
  bac: [-0.45, 0.95, 0.3, 0.12],
  hP: 2.0, goDay: 0.06, goChia: 0.03, maiP: 1.7,
};
const f = (v) => (+v).toFixed(4);
const HW = f(NGO4.rong / 2), DAI = f(NGO4.dai), CAO = f(NGO4.cao), DAY = f(NGO4.day), HP = f(NGO4.hP), GO_IN = f(NGO4.rong / 2 - NGO4.goChia), GO_Y = f(NGO4.hP + NGO4.goDay);
const CX0 = f(NGO4.cua.x - NGO4.cua.w / 2), CX1 = f(NGO4.cua.x + NGO4.cua.w / 2), CH = f(NGO4.cua.h);
export const VAT4 = {
  tt: [-0.45, -12.1, Math.PI],
  song: [-0.88, -0.54, -14.17, -13.87],
  bau: [-1.1, -0.45, -15.0, -14.19, 0.1],
  mai: [-1.2, -0.54, -15.0, -14.52, 3.15, 3.05],
  but: [1.43, -12.55, 0.5, 0.2],
  cuaSo: [-11.6, -10.9, 0.85, 1.6],
  nguonCuaSo: [-2.0, 3.4, -11.25],
  bongNguon: [1.0, 9.0, -17.2],
  meo: [-0.69, -14.56, 1.7, -1],
  den: [1.24, 2.55, -12.75],
  bang: [-0.92, 1.05, 0.62],
};

const VERT = `
varying vec3 vW; varying vec2 vUv;
void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;

export const CHUNG = `
${COMMON}
const vec3 K_MUC = vec3(23.,19.,26.)/255., K_DEM = vec3(35.,42.,98.)/255., K_SANG = vec3(52.,57.,154.)/255., K_DO = vec3(255.,31.,79.)/255.,
  K_HONG = vec3(255.,58.,134.)/255., K_GIAY = vec3(243.,220.,214.)/255., K_DOCHIM = vec3(96.,36.,67.)/255.;
uniform float uT, uCell, uHatPhim;
uniform float uTanSong;
uniform float uTat;
uniform float uNhap;
uniform vec4 uNem;
uniform vec4 uNemF;
uniform vec2 uNemX;
uniform vec4 uDen; uniform vec3 uDenB; uniform vec2 uDenR;
uniform vec2 uDenT;
uniform sampler2D uShT; uniform mat4 uShVP; uniform float uShOn;
uniform vec4 uCuaSo; uniform vec3 uNguonCuaSo; uniform vec4 uSong;
uniform vec4 uChan[24]; uniform float uNChan;
uniform vec4 uBau; uniform float uBauY;
uniform vec4 uMai; uniform vec2 uMaiY;
uniform vec4 uBut;
#define CO_BAU 1
float gTat = 0.0;
float kcHam(vec3 P) { vec2 c = vec2(0.5 * (uSong.x + uSong.y), 0.5 * (uSong.z + uSong.w)), b = vec2(0.5 * (uSong.y - uSong.x), 0.5 * (uSong.w - uSong.z));
  vec2 q = abs(P.xz - c) - b; return max(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0), 0.0); }
float amHam(vec3 P) {
  vec2 c = vec2(0.5 * (uSong.x + uSong.y), 0.5 * (uSong.z + uSong.w)), b = vec2(0.5 * (uSong.y - uSong.x), 0.5 * (uSong.w - uSong.z));
  vec2 q = abs(P.xz - c) - b; float d = max(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0), 0.0);
  return 2.9 * exp(-d / 0.14) * (0.45 + 0.55 * uNhap) / (1.0 + 2.5 * max(P.y, 0.0));
}
vec2 bauMat(vec3 P) {
  float sau = clamp((uBau.w - P.z) / max(uBau.w - uBau.z, 0.01), 0.0, 1.0);
  float w = (2.05 - 1.0 * sau) * (0.45 + 0.55 * uNhap);
  return vec2(0.0, w);
}
float duoiMai(vec3 P) {
  float h = 0.5 * (uMaiY.x + uMaiY.y);
  if (P.y > h) return 0.0;
  vec2 Q = P.xz - vec2(0.04, 0.1) * (h - P.y);
  return step(uMai.x, Q.x) * step(Q.x, uMai.y) * step(uMai.z, Q.y) * step(Q.y, uMai.w);
}
float bacH(float x, float r, float band) { x = max(x, 0.0); float fr = fract(x); return floor(x) + rutTham(clamp((fr - 0.5) / band + 0.5, 0.0, 1.0), r, 0.55); }
vec3 mauB(float c, float w, vec3 cel, float band) {
  float r1 = hash13(cel), r2 = hash13(cel + 17.3);
  float bc = bacH(c, r1, band), bw = bacH(w, r2, band);
  vec3 ci = bc < 0.5 ? K_MUC : bc < 1.5 ? K_DEM : bc < 2.5 ? K_SANG : K_GIAY;
  vec3 cw = bw < 1.5 ? K_DOCHIM : bw < 2.5 ? K_DO : bw < 3.5 ? K_HONG : K_GIAY;
  return (bw > 0.5 && bw + 0.25 >= bc) ? cw : ci;
}
vec4 hatCuoi(vec3 col, vec3 cel) { float r3 = hash13(cel + 41.7), r4 = hash13(cel + 73.1); return vec4(col + (r3 + r4 - 1.0) * (uHatPhim / 255.0) * (0.8 + 0.4 * col), 1.0); }
vec4 mau(float c, float w, vec3 cel) { float t = uTat * gTat; return hatCuoi(mauB(c * (1.0 - 0.75 * t), w * (1.0 - t), cel, 0.8), cel); }
float bongTT(vec3 P) {
  if (uShOn < 0.5) return 0.0;
  vec4 q = uShVP * vec4(P, 1.0); q.xyz /= q.w; vec3 u = q.xyz * 0.5 + 0.5;
  if (u.x < 0.0 || u.y < 0.0 || u.x > 1.0 || u.y > 1.0 || u.z > 1.0) return 0.0;
  return step(texture2D(uShT, u.xy).r + 0.0015, u.z);
}
float nemTrong(vec3 P) { float d = P.z + ${DAI}; return min(P.x - (uNem.x - uNem.y * d), (uNem.z - uNem.w * d) - P.x); }
float nemSang(vec3 P) {
  float d = P.z + ${DAI};
  if (d < -0.31) return 0.0;
  float tr = nemTrong(P);
  if (tr < 0.0) return 0.0;
  float w = (uNemF.x + uNemF.y * exp(-max(d, 0.0) / uNemF.z)) * (1.0 - uNemF.w * smoothstep(uNemX.x, uNemX.y, d));
  w -= 1.1 * (1.0 - smoothstep(0.0, 0.035 + 0.018 * max(d, 0.0), tr));
  return max(w, 0.0) * uNhap;
}
float bongMem(vec3 P) {
  float tut = clamp((1.0 - uNhap) / 0.35, 0.0, 1.0);
  float kq = 0.0;
  vec4 q = uShVP * vec4(P, 1.0); q.xyz /= q.w; vec3 u = q.xyz * 0.5 + 0.5;
  bool trong = uShOn > 0.5 && u.x >= 0.0 && u.y >= 0.0 && u.x <= 1.0 && u.y <= 1.0 && u.z <= 1.0;
  if (trong) {
    float r = 0.0035 * tut, s = 0.0;
    s += step(texture2D(uShT, u.xy + vec2(r, r * 0.4)).r + 0.0015, u.z);
    s += step(texture2D(uShT, u.xy + vec2(-r * 0.4, r)).r + 0.0015, u.z);
    s += step(texture2D(uShT, u.xy + vec2(-r, -r * 0.4)).r + 0.0015, u.z);
    s += step(texture2D(uShT, u.xy + vec2(r * 0.4, -r)).r + 0.0015, u.z);
    kq = s * 0.25 * (1.0 - 0.45 * tut);
  }
  return kq;
}
float nemCua(vec3 P) { float w = nemSang(P); return w > 0.0 ? w * (1.0 - bongMem(P)) : 0.0; }
float den(vec3 P) {
  float e = length((P.xz - uDen.xy) / uDen.zw);
  return (1.0 - smoothstep(0.74, 1.0, e)) + (1.0 - smoothstep(0.3, 0.46, e));
}
float denT(vec3 P, vec3 n) {
  vec3 L = uDenB - P; float l = length(L);
  float lam = smoothstep(0.0, 0.15, dot(n, L / l));
  return ((1.0 - smoothstep(uDenT.y * 0.6, uDenT.y, l)) + (1.0 - smoothstep(uDenT.x, uDenT.x + 0.12, l))) * lam;
}
float rem(vec3 P) {
  vec3 d = P - uNguonCuaSo; if (d.x <= 0.01) return 0.0;
  float t = (-${HW} - uNguonCuaSo.x) / d.x; vec3 W = uNguonCuaSo + d * t;
  float trong = step(uCuaSo.x, W.z) * step(W.z, uCuaSo.y) * step(uCuaSo.z, W.y) * step(W.y, uCuaSo.w);
  return trong * step(0.42, fract((W.y - uCuaSo.z) / 0.1));
}
float sdE0(vec2 p, vec2 c, vec2 r) { vec2 q = (p - c) / r; return (length(q) - 1.0) * min(r.x, r.y); }
float giay(vec2 q, float s) {
  vec2 a = vec2(0.004 * s, 0.05), b = vec2(-0.001 * s, -0.012), pa = q - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  float de = length(pa - ba * h) - mix(0.029, 0.01, h * h);
  vec2 g = abs(q - vec2(-0.002 * s, -0.071)) - vec2(0.0075, 0.0065);
  float got = length(max(g, 0.0)) + min(max(g.x, g.y), 0.0) - 0.002;
  return min(de, got);
}
float sdSeg0(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
vec4 dauChan(vec2 p) {
  vec4 r = vec4(1.0, 0.0, 1.0, 0.0);
  for (int i = 0; i < 24; i++) {
    if (float(i) >= uNChan) break;
    vec4 c = uChan[i]; vec2 d = p - c.xy; if (dot(d, d) > 0.04) continue;
    float a = c.z; vec2 fw = vec2(sin(a), cos(a)), rt = vec2(cos(a), -sin(a));
    vec2 q = vec2(dot(d, rt), dot(d, fw));
    float hp = fract(sin(float(i) * 12.9898 + 4.1) * 43758.5453);
    float sd = giay(q, sign(c.w));
    float nhoe = 0.0;
    if (hp < 0.3 && q.y < 0.015) { nhoe = 1.0; sd += (hash13(vec3(floor(q * 220.0), float(i))) - 0.55) * 0.011; }
    if (sd < r.x) r = vec4(sd, abs(c.w), r.z, nhoe);
    if (hp >= 0.3 && hp < 0.6) { float L = 0.05 + 0.03 * hp; r.z = min(r.z, sdSeg0(q, vec2(-0.002, -0.081), vec2(0.004 * sign(c.w), -0.081 - L)) - 0.0018 * (1.0 - smoothstep(-0.08, -0.081 - L, q.y))); }
  }
  return r;
}
float gon(vec2 p, float cs, float sd, float rmax, float nguong) {
  vec2 ce = floor(p / cs); vec2 cc = (ce + vec2(hash13(vec3(ce, sd)), hash13(vec3(ce, sd + 1.0)))) * cs;
  float ph = fract(uT * (0.5 + 0.25 * hash13(vec3(ce, sd + 4.0))) + hash13(vec3(ce, sd + 2.0)));
  float rr = 0.004 + rmax * ph, dr = length(p - cc);
  float aa = length(fwidth(p)) * 0.75 + 0.0012;
  return step(nguong, hash13(vec3(ce, sd + 3.0))) * step(ph, 0.8) * (1.0 - clamp(abs(dr - rr) / aa, 0.0, 1.0));
}
`;

const VUNG = `
uniform vec4 uVung[3];
float vungMot(vec2 p, vec4 v) {
  if (v.z <= 0.0) return -1.0;
  vec2 q = (p - v.xy) / v.zw; float a = atan(q.y, q.x) + 3.14159265;
  const float N = 9.0; float s = 6.2831853 / N; float i = floor(a / s);
  float sd = floor(v.x * 7.1 + v.y * 3.3);
  float a0 = i * s, a1 = a0 + s;
  float r0 = 0.45 + 0.55 * hash13(vec3(mod(i, N), sd, 3.0)), r1 = 0.45 + 0.55 * hash13(vec3(mod(i + 1.0, N), sd, 3.0));
  vec2 A = -r0 * vec2(cos(a0), sin(a0)), B = -r1 * vec2(cos(a1), sin(a1));
  vec2 e = B - A, w = q - A;
  return (e.x * w.y - e.y * w.x) / length(e) * min(v.z, v.w);
}
float vung(vec2 p) { return max(vungMot(p, uVung[0]), max(vungMot(p, uVung[1]), vungMot(p, uVung[2]))); }`;

const GACH = `
float vua(vec2 g) { g.x += step(1.0, mod(floor(g.y), 2.0)) * 0.5; vec2 f = fract(g) - 0.5; vec2 fw = fwidth(g); return max(step(0.5 - fw.x * 1.4, abs(f.x)), step(0.5 - max(fw.y * 1.3, 0.09), abs(f.y))); }`;

const O_CUA = `
uniform float uLa;
vec3 trongCua(vec3 P) {
  vec3 dv = normalize(P - cameraPosition);
  float tBest = 1e9; float kind = 0.0; vec3 Q = P;
  if (dv.y < -1e-4) { float t = (0.12 - P.y) / dv.y; if (t > 0.0 && t < tBest) { tBest = t; kind = 1.0; } }
  if (dv.x < -1e-4) { float t = (${CX0} - P.x) / dv.x; vec3 H = P + dv * t; if (t > 0.0 && t < tBest && H.z > -${DAI} - ${DAY} && H.y > 0.12) { tBest = t; kind = 2.0; } }
  if (dv.x > 1e-4) { float t = (${CX1} - P.x) / dv.x; vec3 H = P + dv * t; if (t > 0.0 && t < tBest && H.z > -${DAI} - ${DAY} && H.y > 0.12) { tBest = t; kind = 3.0; } }
  vec2 Hn = vec2(${CX0}, -${DAI} - ${DAY}), u = vec2(cos(uLa), -sin(uLa)), nL = vec2(sin(uLa), cos(uLa));
  { float den0 = dot(dv.xz, nL); if (abs(den0) > 1e-4) { float t = dot(Hn - P.xz, nL) / den0; vec3 H = P + dv * t; float s = dot(H.xz - Hn, u);
      if (t > 0.0 && t < tBest && s > 0.0 && s < 1.0 && H.y > 0.12 && H.y < ${CH}) { tBest = t; kind = 4.0 + s; } } }
  Q = P + dv * min(tBest, 6.0);
  float c = 0.0, w = 0.0, id = 54.0;
  if (kind < 0.5) { w = 1.0; }
  else if (kind < 1.5) {
    float sau = -${DAI} - Q.z;
    w = (4.6 - 0.8 * max(sau - 0.35, 0.0)) * uNhap;
    float s = dot(Q.xz - Hn, u), n = dot(Q.xz - Hn, nL);
    if (s > 0.0 && s < 1.0 && n > 0.0 && n < 0.05) w = 1.0;
    id = 54.0;
  } else if (kind < 3.5) {
    w = kind < 2.5 ? 3.0 : 1.0; id = 55.0;
  } else {
    float s = kind - 4.0;
    w = s > 0.95 ? 4.0 : (s > 0.9 ? 2.0 : 0.0); c = 0.0; id = 53.0;
  }
  return vec3(c, w, id);
}`;

const FRAG = `
${CHUNG}
${VUNG}
${GACH}
${O_CUA}
varying vec3 vW; varying vec2 vUv;
uniform float uMat;
uniform vec4 uBang;
uniform vec4 uBac;
void main() {
  vec3 P = vW;
  gTat = smoothstep(0.12, 0.85, kcHam(P));
  vec3 cel = floor(P / (uCell * max(length(P - cameraPosition), 0.5)));
  float c = 0.0, w = 0.0;
  if (uMat < 0.5 || (uMat > 7.5 && uMat < 8.5)) {
    float laBac = step(7.5, uMat);
    c = den(P);
    w = nemCua(P);
    float lit = max(c, w);
    w = max(w, 1.15 * rem(P));
    float tg = (1.0 - laBac) * step(uSong.x, P.x) * step(P.x, uSong.y) * step(uSong.z, P.z) * step(P.z, uSong.w);
    if (tg > 0.5) {
      float song = step(0.32, abs(fract((P.x - uSong.x) / 0.065) - 0.5));
      float vien = 1.0 - step(0.022, min(min(P.x - uSong.x, uSong.y - P.x), min(P.z - uSong.z, uSong.w - P.z)));
      w = ((song > 0.5 && hash13(cel + 9.0) >= uTanSong) || vien > 0.5) ? 0.0 : 2.2 * (0.55 + 0.45 * uNhap); c = 0.0;
    } else if (laBac < 0.5) {
      const float SX = 0.17, SZ = 0.095;
      float row = floor(P.z / SZ); float off = hash13(vec3(row, 3.0, 7.0)) * SX;
      float xg = (P.x + off) / SX; float col = floor(xg);
      vec2 fv = vec2(fract(xg) * SX, fract(P.z / SZ) * SZ);
      vec2 fw = fwidth(P.xz);
      float hv = hash13(vec3(row, col, 11.0));
      float khe = 1.0 - step(0.0022 + fw.x * 0.55, min(fv.x, SX - fv.x)) * step(0.0022 + fw.y * 0.55, min(fv.y, SZ - fv.y));
      khe *= step(0.18, fract(hv * 7.3 + fv.x * 3.1 + fv.y * 2.3));
      float mep = step(fv.y, 0.008 + fw.y) * (1.0 - khe) * step(0.7, hash13(vec3(row, col, 23.0)));
      if (lit > 0.45) {
        if (khe > 0.5) { c = max(c - 1.0, 0.0); w = max(w - 1.0, 0.0); }
        else {
          if (hv < 0.07) { c -= 0.4; w -= 0.4; }
          if (mep > 0.5 && w > 1.2 && w < 3.4) w += 0.9;
        }
      }
      if (lit < 0.45 && khe > 0.5 && hv < 0.12 && lit > 0.08) c = 1.0;
      float dg = max(max(uSong.x - P.x, P.x - uSong.y), max(uSong.z - P.z, P.z - uSong.w));
      w = max(w, 1.0 * (1.0 - step(0.04, dg)));
      w = max(w, min(amHam(P) * 0.42, 0.95));
    }
    float v = (1.0 - laBac) * (1.0 - tg) * vung(P.xz);
    if (v > 0.0) {
      float g1 = gon(P.xz, 0.36, 11.0, 0.08, 0.45), g2 = gon(P.xz, 0.17, 31.0, 0.045, 0.5), g3 = gon(P.xz, 0.09, 41.0, 0.024, 0.55);
      float g = max(g1, max(g2, g3));
      float cw = c, ww = w;
      c = 0.0; w = ww > 0.6 ? max(ww - 1.6, 0.0) : 0.0;
      if (ww > 0.6) {
        float d = P.z + ${DAI}; float truc = 0.5 * ((uNem.x - uNem.y * d) + (uNem.z - uNem.w * d));
        float vet = 1.0 - step(0.035 + 0.012 * d, abs(P.x - truc + 0.03 * sin(P.z * 41.0)));
        if (vet > 0.5) w = min(4.0, ww + 1.0);
      }
      float dl = length(P.xz - uDenR);
      if (dl < 0.09) { c = max(c, 1.2 * (1.0 - smoothstep(0.035, 0.09, dl))); if (dl < 0.02) c = 3.0; else if (dl < 0.036) c = max(c, 2.0); }
      if (g > 0.5) { if (ww > 0.6) w = max(w, ww); else c = max(c, max(cw, 1.0)); }
      if (v < 0.008 && max(cw, ww) > 0.45) { if (ww > 0.6) w = ww; else c = min(cw, 1.0); }
    }
    vec4 dc = dauChan(P.xz);
    if (dc.y > hash13(cel + 91.7) && (1.0 - tg) > 0.5) {
      float tut = 0.0;
      if (dc.x < 0.0) tut = dc.x > -0.0048 ? 1.7 : (dc.w > 0.5 ? 0.45 : 0.8);
      else if (dc.z < 0.0) tut = 0.9;
      if (tut > 0.0) { if (w > 0.6) w = max(w - tut, 0.55); else if (c > 0.6) c = max(c - tut, 0.0); else c = 0.0; }
    }
    if (laBac > 0.5) {
      if (w > 0.6) w = min(4.0, w + 0.6);
      float mepB = 1.0 - step(0.012, min(P.z - (-${DAI}), uBac.z - (P.z + ${DAI})));
      if (mepB > 0.5 && P.z + ${DAI} > uBac.z * 0.5) w = max(w - 1.0, 0.0);
    }
  } else if (uMat > 8.5 && uMat < 9.5) {
    c = 0.0; w = 0.0;
  } else if (uMat < 2.5) {
    float isL = step(uMat, 1.5);
    float d = P.z + ${DAI};
    vec3 Pg = vec3(P.x, 0.0, P.z);
    float wl = isL * nemSang(vec3(-${HW} + 0.02, 0.0, P.z)) * (1.0 - smoothstep(0.0, 0.25 + 0.35 * max(d - 4.0, 0.0), P.y));
    w = wl * 0.85;
    c = (1.0 - isL) * min(denT(P, vec3(-1.0, 0.0, 0.0)), 1.0);
    if (max(c, w) > 0.45) { float m = vua(vec2(P.z / 0.23, P.y / 0.075)); if (m > 0.5) { c = max(c - 1.0, 0.0); w = max(w - 1.0, 0.0); } }
    if (isL > 0.5) {
      float o = step(uCuaSo.x, P.z) * step(P.z, uCuaSo.y) * step(uCuaSo.z, P.y) * step(P.y, uCuaSo.w);
      float kh = step(uCuaSo.x - 0.06, P.z) * step(P.z, uCuaSo.y + 0.06) * step(uCuaSo.z - 0.06, P.y) * step(P.y, uCuaSo.w + 0.06) - o;
      if (o > 0.5) { w = mix(1.0, 3.0, step(0.42, fract((P.y - uCuaSo.z) / 0.1))); c = 0.0; }
      if (kh > 0.5) { c = 0.0; w = 0.0; }
    } else {
      if (P.y > ${HP} - 0.05) c = 0.0;
    }
  } else if (uMat < 3.5) {
    float trongO = step(${CX0}, P.x) * step(P.x, ${CX1}) * step(P.y, ${CH});
    float khung = step(${CX0} - 0.085, P.x) * step(P.x, ${CX1} + 0.085) * step(P.y, ${CH} + 0.085) * (1.0 - trongO);
    float kx = max(0.0, max(0.54 - P.x, P.x - ${CX1})), ky = max(0.0, P.y - ${CH});
    float dk = length(vec2(kx * 2.4, ky));
    float quang = 3.1 * (1.0 - smoothstep(0.0, 0.36, dk)) * uNhap;
    if (trongO > 0.5) { vec3 o = trongCua(P); c = o.x; w = o.y; }
    else {
      w = quang;
      if (khung > 0.5) {
        float vao = min(min(P.x - (${CX0} - 0.085), (${CX1} + 0.085) - P.x), (${CH} + 0.085) - P.y);
        w = max(w, 1.0);
        if (vao < 0.014) w = 0.0;
        if (vao > 0.07) w = max(w, 2.6);
      } else if (w > 0.45 && vua(vec2(P.x / 0.23, P.y / 0.075)) > 0.5) w = max(w - 1.0, 0.0);
    }
    if (uBang.w > 0.5) {
      vec2 q = P.xy - uBang.xy; float ca = cos(uBang.z), sa = sin(uBang.z); q = vec2(ca * q.x + sa * q.y, -sa * q.x + ca * q.y);
      if (abs(q.x) < 0.075 && abs(q.y) < 0.019) { c = 1.0; w = 0.0; if (abs(q.y + 0.011) < 0.004) c = 2.0; }
    }
  } else if (uMat < 4.5) {
    c = 0.0;
  } else if (uMat < 5.5) {
    c = 0.0;
  } else if (uMat < 6.5) {
    c = 0.0;
  } else if (uMat < 10.5) {
    c = denT(P, vec3(0.0, 1.0, 0.0));
    if (c > 0.45) {
      float hang = floor(P.z / 0.45);
      float zf = fract(P.z / 0.45) * 0.45, xf = P.x - ${GO_IN};
      vec2 fw = fwidth(P.xz);
      float mach = 1.0 - step(0.005 + fw.y * 0.6, min(zf, 0.45 - zf));
      if (mach > 0.5) c = max(c - 1.0, 0.0);
      else if (hash13(vec3(hang, 3.0, 7.0)) < 0.3) c -= 0.35;
      if (xf < 0.011 + fw.x) c = c < 1.5 ? min(c + 1.0, 2.0) : c - 1.0;
      else if (mach < 0.5) { float g = gon(P.xz, 0.12, 61.0, 0.014, 0.8); if (g > 0.5) c = c < 1.6 ? min(c + 0.8, 2.0) : min(c + 0.55, 2.6); }
      if (uBut.w > 0.0) {
        vec2 d = P.xz - uBut.xy; float ca = cos(uBut.z), sa = sin(uBut.z);
        vec2 q = vec2(d.x * sa + d.y * ca, -d.x * ca + d.y * sa);
        float e = length(q / vec2(uBut.w * 0.5 + 0.03, 0.04));
        float e2 = e + 0.06 * sin(atan(q.y, q.x) * 3.0 + 1.3);
        if (e2 < 1.0) { c = max(c - 0.7, 0.0); if (e2 > 0.93) c = min(c + 0.9, 2.6); }
        vec2 L = normalize(uDenB.xz - P.xz);
        vec2 qs = q + vec2(dot(L, vec2(sa, ca)), dot(L, vec2(-ca, sa))) * 0.022;
        if (abs(qs.x) < uBut.w * 0.5 && abs(qs.y) < 0.016) c = max(c - 1.4, 0.0);
      }
    }
  } else if (uMat < 11.5) {
    c = min(denT(P, vec3(-1.0, 0.0, 0.0)) * 1.25, 2.0);
  } else if (uMat > 12.5 && uMat < 13.5) {
    vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); if (dot(n, cameraPosition - P) < 0.0) n = -n;
    if (n.y > 0.5) {
      vec2 m = bauMat(P); c = m.x; w = m.y;
      float zGiot = uMai.w + 0.1 * (uMaiY.y - uBauY) + 0.012;
      if (abs(P.z - zGiot) < 0.02 && P.x > uMai.x && P.x < uMai.y + 0.1 && gon(P.xz, 0.06, 81.0, 0.012, 0.3) > 0.5) w = min(w + 0.9, 3.2);
    }
    else if (n.z > 0.5) w = min(amHam(vec3(P.x, 0.0, P.z)) * 0.95, 2.6);
    else w = 0.6 * amHam(P);
  } else if (uMat > 13.5 && uMat < 14.5) {
    vec3 n = normalize(cross(dFdx(vW), dFdy(vW))); if (dot(n, cameraPosition - P) < 0.0) n = -n;
    if (n.y > 0.5) {
      vec2 fw = fwidth(P.xz);
      c = 0.12;
      float truoc = uMai.w - P.z, ben = min(P.x - uMai.x, uMai.y - P.x);
      if (truoc < 0.018 + fw.y) c = 2.0;
      else if (ben < 0.012 + fw.x && truoc < 0.12) c = 2.0 - 1.5 * truoc / 0.12;
      else if (truoc < 0.06 && fract((P.x - uMai.x) / 0.06) < 0.16) c = 1.0;
      else if (truoc < 0.2 && gon(P.xz, 0.08, 71.0, 0.012, 0.55) > 0.5) c = 1.0;
    } else { c = 0.0; w = 0.9 * amHam(vec3(P.x, 0.0, P.z)); }
  } else {
    vec2 rv = P.xz - uDenB.xz; float rr = length(rv);
    float phiaMay = rr > 1e-4 ? dot(rv / rr, normalize(cameraPosition.xz - uDenB.xz)) : 0.0;
    c = (P.y < uDenB.y + 0.008 && phiaMay > 0.2) ? 2.0 : 0.0;
  }
  gl_FragColor = mau(c, w, cel);
}`;

const VERT_BUT = `
varying vec3 vW; varying vec3 vN;
void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const FRAG_BUT = `
${CHUNG}
varying vec3 vW; varying vec3 vN;
uniform float uPhanBut;
void main() {
  gTat = 1.0;
  vec3 n = normalize(vN), L = normalize(uDenB - vW), Lh = normalize((uDenB - vW) * vec3(1.0, 0.0, 1.0));
  float d = dot(n, L), dh = dot(n, Lh);
  vec3 cel = floor(vW / (uCell * 0.75 * max(length(vW - cameraPosition), 0.5)));
  float c;
  if (uPhanBut < 0.5) c = dh > 0.35 ? 3.0 : (n.y > 0.5 ? 1.0 : 0.0);
  else if (uPhanBut < 1.5) c = d > 0.2 ? 2.6 : 1.3;
  else if (uPhanBut < 2.5) c = d > 0.5 ? 2.0 : 0.0;
  else c = hash13(cel + 5.0) > 0.45 ? (d > 0.0 ? 2.5 : 1.2) : 0.3;
  gl_FragColor = mau(c, 0.0, cel);
}`;

const VERT_MUA = `
attribute vec3 aP; attribute float aL; attribute vec4 aR;
uniform vec2 uRes; uniform float uRong, uRoi, uCaoMua, uToa;
uniform vec4 uCon;
varying vec3 vW; varying float vDam; varying float vRong;
float h11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float vn2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = h11(dot(i, vec2(1.0, 57.0))), b = h11(dot(i + vec2(1.0, 0.0), vec2(1.0, 57.0))), c = h11(dot(i + vec2(0.0, 1.0), vec2(1.0, 57.0))), d = h11(dot(i + vec2(1.0, 1.0), vec2(1.0, 57.0)));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
void main() {
  float sp = 0.8 + 0.45 * aR.x;
  float ph = aP.y - uRoi * sp, k = floor(ph / uCaoMua);
  float y = ph - k * uCaoMua;
  vec2 G = aP.xz + (vec2(h11(k * 1.7 + aR.w * 91.0), h11(k * 2.3 + aR.x * 37.0)) - 0.5) * vec2(0.22, 0.6);
  float tS = uCon.y - (uCaoMua - y) / (6.5 * sp);
  vec2 dg = normalize(uCon.xz + 1e-4), vg = vec2(-dg.y, dg.x);
  float n = vn2(vec2(dot(G, dg) * 0.55 - tS * 0.9, dot(G, vg) * 0.3 + 3.1));
  float day = clamp(0.3 + 0.62 * n + 0.22 * uCon.w, 0.22, 1.0);
  if (h11(k * 3.1 + aR.w * 53.0) > day) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); vW = vec3(0.0); vDam = 0.0; vRong = 0.0; return; }
  vec3 D = normalize(vec3(uCon.x, -1.0, uCon.z));
  vec3 A = vec3(G.x - uCon.x * y, y, G.y - uCon.z * y);
  float L = aL * (0.75 + 0.45 * sp) * (1.0 + 0.3 * uCon.w);
  vec3 B = A + D * L;
  vec4 ca = projectionMatrix * viewMatrix * vec4(A, 1.0);
  vec4 ch = projectionMatrix * viewMatrix * vec4(A + vec3(D.x, 0.0, D.z) * L, 1.0), cv = projectionMatrix * viewMatrix * vec4(A + vec3(0.0, D.y, 0.0) * L, 1.0);
  vec2 sa = ca.xy / ca.w, vh = ch.xy / ch.w - sa, vv = cv.xy / cv.w - sa, v = vh + uToa * vv;
  vec2 sb = sa + v * (length(vh + vv) / max(length(v), 1e-6));
  vec4 cb = vec4(sb * ca.w, ca.z, ca.w);
  vec2 dir = normalize((sb - sa) * uRes + 1e-6); vec2 nr = vec2(-dir.y, dir.x);
  vec4 c = mix(ca, cb, position.y);
  float rg = uRong * (0.75 + 0.9 * aR.y) * clamp(cameraPosition.y / max(cameraPosition.y - y, 1.0), 1.0, 1.8);
  vRong = min(rg, 1.0);
  c.xy += nr * position.x * 2.0 * max(rg, 1.0) / uRes * c.w;
  vW = mix(A, B, position.y);
  vDam = aR.z;
  gl_Position = c;
}`;
const FRAG_MUA = `
${CHUNG}
varying vec3 vW; varying float vDam; varying float vRong;
void main() {
  if (vW.y < 0.01) discard;
  if (uTat > 0.0 && hash13(floor(vW / 0.004) + 3.0) < 0.75 * uTat) discard;
  if (duoiMai(vW) > 0.5) discard;
  { vec3 dv0 = vW - cameraPosition; vec3 Gb = cameraPosition + dv0 * ((uBauY - cameraPosition.y) / dv0.y);
    if (Gb.x > uBau.x - 0.02 && Gb.x < uBau.y + 0.02 && Gb.z > uBau.z && Gb.z < uBau.w + 0.02 && vW.y > uBauY - 0.001) discard; }
  vec3 cel = floor(vW / 0.004);
  vec3 dv = vW - cameraPosition; vec3 G = cameraPosition + dv * (-cameraPosition.y / dv.y);
  if (G.z < -${DAI}) discard;
  float w = nemCua(G), c = den(G);
  float r = hash13(cel);
  float bw = bacH(w, r, 0.8), bc = bacH(c, hash13(cel + 5.0), 0.8);
  if (nemSang(G) > 0.5 && bongTT(G) > 0.5) discard;
  vec3 Pd = vec3(vW.x, 0.0, vW.z);
  float lR = min(nemCua(Pd), 2.0) * 0.5 * (1.0 - smoothstep(1.6, 2.6, vW.y));
  float lL = 1.0 - smoothstep(0.3, 1.4, length(uDenB - vW));
  float lC = min(den(Pd), 1.0) * (1.0 - smoothstep(1.4, 3.0, vW.y));
  float sang = clamp(max(max(lR, lL), lC), 0.0, 1.0);
  vec3 col; float a;
  if (bw > 3.5) { col = mix(K_HONG, K_GIAY, 0.12 * step(0.8, vDam) * sang); a = 0.6 + 0.4 * vDam; }
  else if (bw > 2.5) { col = K_DO; a = 0.6 + 0.4 * vDam; }
  else if (bw > 1.5) { col = mix(K_HONG, K_GIAY, 0.12 * step(0.8, vDam) * sang); a = 0.6 + 0.4 * vDam; }
  else if (bw > 0.5) { col = lR > 0.2 ? K_DO : K_DEM; a = lR > 0.2 ? 0.25 + 0.2 * vDam : 0.55 + 0.45 * vDam; }
  else if (bc > 1.5) { col = K_DEM; a = 0.7 + 0.3 * vDam; }
  else if (bc > 0.5) { col = K_SANG; a = 0.5 + 0.5 * vDam; }
  else if (sang > 0.2) { col = K_SANG; a = 0.5 + 0.5 * vDam; }
  else { col = vDam > 0.85 ? K_SANG : K_DEM; a = vDam > 0.85 ? 0.5 : 0.35 + 0.6 * vDam; }
  a *= mix(0.7, 1.0, vRong);
  if (a < 0.04) discard;
  gl_FragColor = vec4(hatCuoi(col, cel).rgb, min(a, 1.0));
}`;

const VERT_BAO = `
uniform float uT, uGioBao; uniform vec3 uGoc; uniform vec2 uKich;
varying vec3 vW; varying vec2 vUv; varying float vLat; varying float vS;
void main() {
  vUv = uv; vec3 p = position;
  vec2 c = vec2(0.5, -0.5) * uKich; vec2 N = normalize(c); vec2 F = c - N * uGoc.x;
  float s = dot(p.xy - F, N);
  float th = radians(uGoc.y) * clamp(uGioBao, 0.0, 1.0);
  float R = uGoc.z;
  vLat = 0.0; vS = s;
  if (s > 0.0 && th > 1e-4) {
    vec2 along = p.xy - N * s;
    float L = R * th, u, z, a;
    if (s <= L) { a = s / R; u = R * sin(a); z = R * (1.0 - cos(a)); }
    else { a = th; u = R * sin(th) + (s - L) * cos(th); z = R * (1.0 - cos(th)) + (s - L) * sin(th); }
    p.xy = along + N * u; p.z += z; vLat = a;
  }
  p.z += 0.004 * (1.0 - abs(uv.x - 0.5) * 2.0);
  vec4 wp = modelMatrix * vec4(p, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FRAG_BAO = `
${CHUNG}
varying vec3 vW; varying vec2 vUv; varying float vLat; varying float vS;
uniform float uGioBao;
uniform sampler2D uTex;
uniform vec4 uTieu;
void main() {
  gTat = 1.0;
  vec4 t = texture2D(uTex, vUv);
  if (t.g < 0.5) discard;
  vec3 cel = floor(vW / (uCell * 0.8 * max(length(vW - cameraPosition), 0.5)));
  vec3 G = vec3(vW.x, 0.0, vW.z);
  float nem = nemSang(G), sangDen = den(G);
  float c = 0.0, w = 0.0;
  if (nem > 1.2) w = 3.0; else if (nem > 0.5) w = 2.0; else if (sangDen > 0.5) c = 2.0; else c = 0.7;
  float uot = smoothstep(0.35, 0.65, t.b);
  if (w > 0.5) w -= uot; else c -= uot;
  if (abs(vUv.x - 0.5) < 0.0028) { if (w > 0.5) w -= 1.0; else c -= 1.0; }
  float dung = smoothstep(0.15, 1.0, vLat);
  if (w > 0.5) w -= 1.2 * dung; else c -= 0.8 * dung;
  if (!gl_FrontFacing) { if (w > 0.5) w = 1.0; else c = 0.0; t.r = 0.0; }
  float vt = 1.0 - vUv.y;
  float trongTieu = step(uTieu.x - 0.03, vUv.x) * step(vUv.x, uTieu.z + 0.03) * step(uTieu.y - 0.03, vt) * step(vt, uTieu.w + 0.09);
  vec4 dc = dauChan(vW.xz);
  if (dc.y > hash13(cel + 91.7) && trongTieu < 0.5 && gl_FrontFacing && vLat < 0.05) {
    float tut = dc.x < 0.0 ? (dc.x > -0.0048 ? 1.8 : (dc.w > 0.5 ? 0.5 : 0.9)) : (dc.z < 0.0 ? 0.9 : 0.0);
    if (tut > 0.0) { if (w > 0.5) w = max(w - tut, 0.6); else c = max(c - tut, 0.0); }
  }
  if (t.r > 0.5) { w = 0.0; c = 0.0; }
  if (w > 0.5 && bongTT(G) > 0.5) { w = 0.0; c = 0.0; }
  gl_FragColor = mau(c, w, cel);
}`;

const VERT_GB = `
varying vec3 vW; varying float vZ; varying vec2 vUv;
void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vec4 vp = viewMatrix * wp; vZ = -vp.z; gl_Position = projectionMatrix * vp; }`;
const FRAG_DAT_GB = `
${CHUNG}
${VUNG}
varying vec3 vW; varying float vZ; varying vec2 vUv;
uniform float uMat;
void main() {
  float id = 40.0;
  vec4 dc = dauChan(vW.xz);
  if (uMat > 7.5) id = dc.x < 0.0 ? 47.0 : 52.0;
  else if (dc.x < 0.0 && dc.y > 0.42) id = 47.0;
  else if (step(uSong.x, vW.x) * step(vW.x, uSong.y) * step(uSong.z, vW.z) * step(vW.z, uSong.w) > 0.5) id = 48.0;
  else if (vung(vW.xz) > 0.0) id = 49.0;
  else if (nemSang(vW) > 1.5) id = 50.0;
  vec3 n = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  gl_FragColor = vec4(n.xy * 0.5 + 0.5, vZ, id);
}`;
const FRAG_CUOI_GB = `
${CHUNG}
${O_CUA}
varying vec3 vW; varying float vZ; varying vec2 vUv;
void main() {
  vec3 P = vW; float id = 42.0;
  float trongO = step(${CX0}, P.x) * step(P.x, ${CX1}) * step(P.y, ${CH});
  float khung = step(${CX0} - 0.085, P.x) * step(P.x, ${CX1} + 0.085) * step(P.y, ${CH} + 0.085) * (1.0 - trongO);
  if (trongO > 0.5) id = trongCua(P).z; else if (khung > 0.5) id = 55.0;
  vec3 n = normalize((viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
  gl_FragColor = vec4(n.xy * 0.5 + 0.5, vZ, id);
}`;
const FRAG_BAO_GB = `
varying vec3 vW; varying vec2 vUv; varying float vLat; varying float vS;
uniform sampler2D uTex; uniform vec4 uTieu;
void main() {
  vec4 t = texture2D(uTex, vUv); if (t.g < 0.5) discard;
  float v = 1.0 - vUv.y;
  float trongTieu = step(uTieu.x, vUv.x) * step(vUv.x, uTieu.z) * step(uTieu.y, v) * step(v, uTieu.w);
  float id = 46.0 + 5.0 * step(0.5, t.r) * trongTieu;
  vec4 vp = viewMatrix * vec4(vW, 1.0);
  gl_FragColor = vec4(0.5, 0.5, -vp.z, id);
}`;
const VERT_MU = `
varying vec3 vW; varying vec3 vL;
void main() { vL = position; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const FRAG_MU = `
${CHUNG}
varying vec3 vW; varying vec3 vL;
uniform vec4 uVanh, uChom;
uniform vec2 uChomY, uCuaD, uDenD;
void main() {
  gTat = 1.0;
  vec3 cel = floor(vW / (uCell * 0.8 * max(length(vW - cameraPosition), 0.5)));
  vec2 q = vL.xz - uVanh.xy; vec2 qn = q / uVanh.zw; float r = length(qn);
  vec2 dq = r > 1e-4 ? normalize(qn / uVanh.zw) : vec2(0.0);
  vec2 qc = vL.xz - uChom.xy; float rc = length(qc / uChom.zw);
  float c = 0.0, w = 0.0;
  if (rc < 1.02 && vL.y > uChomY.x) {
    c = 1.0;
    vec2 dc = rc > 1e-4 ? normalize(qc / uChom.zw / uChom.zw) : vec2(0.0);
    if (rc > 0.8) { if (dot(dc, uCuaD) > 0.3) w = 3.0 * uNhap; else if (dot(dc, uDenD) > 0.3) c = 2.0; }
    float zl = dot(qc, -uCuaD) / uChom.w, xl = dot(qc, vec2(-uCuaD.y, uCuaD.x));
    float rongR = mix(0.0025, 0.009, smoothstep(-0.3, 0.55, zl));
    if (abs(xl) < rongR && zl > -0.3 && zl < 0.6) { c = 0.0; w = 0.0; }
  } else {
    if (r > 0.86) { if (dot(dq, uCuaD) > 0.2) w = 3.0 * uNhap; else if (dot(dq, uDenD) > 0.3) c = 2.0; }
  }
  gl_FragColor = mau(c, w, cel);
}`;

const CON = [];
function rndC(i, k) { let x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }
function taoCon(den) {
  let t = CON.length ? CON[CON.length - 1].t : 1.6, i = CON.length;
  while (t < den) {
    if (i > 0) t += 5 + 4 * rndC(i, 1);
    const r = rndC(i, 2), n = r < 0.2 ? 1 : r < 0.62 ? 2 : 3;
    const dai = n === 1 ? 0.4 : n === 2 ? 0.45 + 0.2 * rndC(i, 3) : 0.75 + 0.05 * rndC(i, 3);
    const nhip = [];
    for (let j = 0; j < n; j++) nhip.push({ o: n === 1 ? 0.1 : (dai - 0.25) * j / (n - 1), sau: 0.11 + 0.08 * rndC(i, 4 + j) });
    CON.push({ t, dai, nhip }); i++;
  }
}
export function nhapAt(t) {
  if (!(t >= 0)) return 1;
  taoCon(t + 10);
  let lo = 0, hi = CON.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (CON[m].t <= t) lo = m; else hi = m - 1; }
  const c = CON[lo]; if (!c || t < c.t || t > c.t + c.dai + 0.3) return 1;
  let tut = 0;
  for (const nh of c.nhip) {
    const u = t - c.t - nh.o; if (u < 0 || u > 0.2) continue;
    const s = u < 0.05 ? u / 0.05 : u < 0.11 ? 1 : 1 - (u - 0.11) / 0.09;
    tut = Math.max(tut, nh.sau * s * s * (3 - 2 * s));
  }
  return 1 - tut;
}
export function conChiTiet(tu, den) { taoCon(den + 10); return CON.filter((c) => c.t >= tu && c.t <= den).map((c) => ({ t: c.t, nhip: c.nhip.map((n) => [n.o, n.sau]) })); }
export function conNhap(tu, den) { taoCon(den + 10); return CON.filter((c) => c.t + c.dai >= tu && c.t <= den).map((c) => ({ t: +c.t.toFixed(2), dai: +c.dai.toFixed(2), n: c.nhip.length, sau: c.nhip.map((n) => +n.sau.toFixed(2)) })); }

export function makeNgo4(o) { const g = makeNgo4G(o); let r; do { r = g.next(); } while (!r.done); return r.value; }
export function* makeNgo4G(o) {
  const { renderer } = o;
  const sc = new THREE.Scene();
  let W = 2, H = 2;
  const chanDs = veDauChan([[0.42, -9.6], [0.4, -11.2], [0.47, -12.5], [0.53, -13.5], [0.62, -14.4], [0.66, -14.88]], 0.34);
  const shared = {
    uT: { value: 0 }, uCell: { value: 0.0005 }, uHatPhim: { value: 14 }, uNhap: { value: 1 }, uTat: { value: 0 }, uTanSong: { value: 0 },
    uNem: { value: new THREE.Vector4(...NGO4.nem) }, uNemF: { value: new THREE.Vector4(1.62, 3.0, 0.62, 1.0) }, uNemX: { value: new THREE.Vector2(3.1, 4.5) },
    uDen: { value: new THREE.Vector4(0.62, -12.75, 0.66, 0.95) }, uDenB: { value: new THREE.Vector3(...VAT4.den) }, uDenR: { value: new THREE.Vector2(9, 9) }, uDenT: { value: new THREE.Vector2(1.18, 1.85) },
    uShT: { value: null }, uShVP: { value: new THREE.Matrix4() }, uShOn: { value: 0 },
    uCuaSo: { value: new THREE.Vector4(...VAT4.cuaSo) }, uNguonCuaSo: { value: new THREE.Vector3(...VAT4.nguonCuaSo) }, uSong: { value: new THREE.Vector4(...VAT4.song) },
    uBau: { value: new THREE.Vector4(...VAT4.bau.slice(0, 4)) }, uBauY: { value: VAT4.bau[4] }, uBut: { value: new THREE.Vector4(0, 0, 0, 0) },
    uMai: { value: new THREE.Vector4(...VAT4.mai.slice(0, 4)) }, uMaiY: { value: new THREE.Vector2(VAT4.mai[4], VAT4.mai[5]) },
    uChan: { value: Array.from({ length: 24 }, (_, i) => new THREE.Vector4(...(chanDs[i] || [0, 0, 0, 0]))) }, uNChan: { value: Math.min(24, chanDs.length) },
    uLa: { value: NGO4.la },
  };
  const uRes = { value: new THREE.Vector2(1, 1) };
  const extra = {
    uVung: { value: [0, 1, 2].map(() => new THREE.Vector4(0, 0, 0, 0)) },
    uBang: { value: new THREE.Vector4(VAT4.bang[0], VAT4.bang[1], VAT4.bang[2], 1) },
    uBac: { value: new THREE.Vector4(...NGO4.bac) },
  };
  const MATS4 = [];
  const vl = (mat) => { const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { ...shared, ...extra, uMat: { value: mat } }, side: THREE.DoubleSide }); m.extensions = { derivatives: true }; return m; };
  const mk = (geo, mat, pos, rot, ten) => {
    const m = new THREE.Mesh(geo, vl(mat)); m.name = ten || 'ngo' + mat; m.userData.mat = mat;
    m.position.set(...pos); if (rot) m.rotation.set(...rot); sc.add(m); MATS4.push(m); return m;
  };
  const { rong, dai, cao, day, mai } = NGO4;
  const L = 44, Z0 = -dai + L / 2;
  const dat = mk(new THREE.PlaneGeometry(rong, L), 0, [0, 0, Z0], [-Math.PI / 2, 0, 0], 'dat');
  mk(new THREE.PlaneGeometry(L, cao), 1, [-rong / 2, cao / 2, Z0], [0, Math.PI / 2, 0], 'tuongTrai');
  const { hP, goDay, goChia, maiP } = NGO4;
  mk(new THREE.PlaneGeometry(L, hP), 2, [rong / 2, hP / 2, Z0], [0, -Math.PI / 2, 0], 'tuongPhai');
  const cuoi = mk(new THREE.PlaneGeometry(rong, cao), 3, [0, cao / 2, -dai], null, 'tuongCuoi');
  mk(new THREE.PlaneGeometry(day, L), 5, [-rong / 2 - day / 2, cao, Z0], [-Math.PI / 2, 0, 0], 'dinhTrai');
  mk(new THREE.PlaneGeometry(day + 2 * goChia, L), 10, [rong / 2 + day / 2, hP + goDay, Z0], [-Math.PI / 2, 0, 0], 'dinhPhai');
  mk(new THREE.PlaneGeometry(L, goDay), 11, [rong / 2 - goChia, hP + goDay / 2, Z0], [0, -Math.PI / 2, 0], 'goDinhPhai');
  mk(new THREE.PlaneGeometry(rong + 2 * day, day), 5, [0, cao, -dai - day / 2], [-Math.PI / 2, 0, 0], 'dinhCuoi');
  mk(new THREE.PlaneGeometry(L, cao - mai), 6, [-rong / 2 - day, (cao + mai) / 2, Z0], [0, -Math.PI / 2, 0], 'goTrai');
  mk(new THREE.PlaneGeometry(L, hP - maiP), 6, [rong / 2 + day, (hP + maiP) / 2, Z0], [0, Math.PI / 2, 0], 'goPhai');
  mk(new THREE.PlaneGeometry(rong + 2 * day, cao - mai), 6, [0, (cao + mai) / 2, -dai - day], [0, Math.PI, 0], 'goCuoi');
  mk(new THREE.PlaneGeometry(30, L), 4, [-rong / 2 - day - 15, mai, Z0], [-Math.PI / 2, 0, 0], 'maiTrai');
  mk(new THREE.PlaneGeometry(30, L), 4, [rong / 2 + day + 15, maiP, Z0], [-Math.PI / 2, 0, 0], 'maiPhai');
  mk(new THREE.PlaneGeometry(rong + 2 * day, 30), 4, [0, mai, -dai - day - 15], [-Math.PI / 2, 0, 0], 'maiCuoi');
  const [bx0, bx1, bz, bh] = NGO4.bac;
  const bacTren = mk(new THREE.PlaneGeometry(bx1 - bx0, bz), 8, [(bx0 + bx1) / 2, bh, -dai + bz / 2], [-Math.PI / 2, 0, 0], 'bacTren');
  mk(new THREE.PlaneGeometry(bx1 - bx0, bh), 9, [(bx0 + bx1) / 2, bh / 2, -dai + bz], null, 'bacMep');
  mk(new THREE.PlaneGeometry(bz, bh), 9, [bx0, bh / 2, -dai + bz / 2], [0, -Math.PI / 2, 0], 'bacMepT');
  mk(new THREE.PlaneGeometry(bz, bh), 9, [bx1, bh / 2, -dai + bz / 2], [0, Math.PI / 2, 0], 'bacMepP');

  yield;
  const nshared = makeShared();
  const nmats = {};
  for (const [k, p] of Object.entries(o.MATS)) {
    const q = { ...p, gw1: Math.max(2, (p.gw1 ?? 12) / 4), speck: 0, grain: 14, rim: k === 'TrongKinh' || k === 'DauLua' ? p.rim : C.hong };
    if (k === 'Mu') Object.assign(q, { th1: 0.62, th2: 0.985, high2: 1, kFace: 0, kRed: 0, rimThr: 0.03 });
    if (k === 'BangMu') Object.assign(q, { rimThr: 0.03 });
    if (k === 'Ao' || k === 'CoAo' || k === 'VeAo' || k === 'Dau' || k === 'Toc' || k === 'SoMi' || k === 'CaVat') Object.assign(q, { th1: 0.93, th2: 0.995, high2: 0, kRed: 0, kFace: 0 });
    nmats[k] = makeMaterial(nshared, q);
  }
  const tt = new THREE.Group(); tt.name = 'thamTu';
  const ban = o.thamTu;
  ban.traverse((m) => { if (!m.isMesh) return; const key = m.userData.key || 'Ao'; m.material = nmats[key] || nmats.Ao; m.layers.enable(1); m.frustumCulled = false; });
  for (const ten of ['DieuThuoc', 'DauLua']) { const m = ban.getObjectByName(ten); if (m) m.visible = false; }
  tt.add(ban);
  const aoDuoi = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.3, 0.72, 32, 1, true), nmats.Ao); aoDuoi.scale.z = 0.72; aoDuoi.position.y = 0.8; tt.add(aoDuoi);
  for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.05, 0.5, 12), nmats.Ao); ch.position.set(0.105 * s, 0.25, 0.0); tt.add(ch);
    const gi = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), nmats.Ao); gi.scale.set(0.9, 0.45, 1.8); gi.position.set(0.1 * s, 0.03, 0.07); tt.add(gi); }
  yield;
  const matTayAo = makeMaterial(nshared, { ...o.MATS.Ao, gw1: 4, speck: 0, grain: 14, rim: C.hong, th1: 0.88, th2: 0.975, high2: 1, kRed: 0 });
  const matDa = makeMaterial(nshared, { ...o.MATS.Dau, gw1: 4, speck: 0, grain: 14, rim: C.hong, ember: 0, kFace: 0, kRed: 0, th1: 0.5, th2: 0.93, high2: 1 });
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  function ongTay(diem, banKinh) {
    const curve = new THREE.CatmullRomCurve3(diem, false, 'centripetal');
    const NS = 44, NR = 18, fr = curve.computeFrenetFrames(NS, false);
    const giua = diem[1], trong = diem[0].clone().add(diem[2]).multiplyScalar(0.5).sub(giua).normalize();
    const pos = [], idx = [];
    for (let i = 0; i <= NS; i++) {
      const u = i / NS, P = curve.getPointAt(u), N = fr.normals[i], B = fr.binormals[i];
      for (let j = 0; j <= NR; j++) { const a = j / NR * Math.PI * 2, d = N.clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a)); const r = banKinh(u, d.dot(trong)); pos.push(P.x + d.x * r, P.y + d.y * r, P.z + d.z * r); }
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + NR + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return { g, curve };
  }
  const rTayAo = (uK) => (u, tr) => {
    let r = 0.066 + (0.044 - 0.066) * Math.pow(u, 0.8);
    const ne = 0.35 + 0.65 * Math.max(0, tr + 0.2) / 1.2;
    const v = (u - (uK - 0.14)) / 0.3;
    if (v > 0 && v < 1) r += 0.0075 * ne * Math.abs(Math.sin(v * Math.PI * 3.5)) * Math.sin(v * Math.PI);
    if (tr < -0.3) r += 0.006 * Math.exp(-(((u - uK) / 0.06) ** 2)) * (-tr - 0.3) / 0.7;
    if (u > 0.86 && u < 0.885) r -= 0.004; else if (u >= 0.885) r += 0.009;
    return r;
  };
  const tay = new THREE.Group(); tay.name = 'hai tay';
  const vP = [V3(-0.27, 1.34, -0.01), V3(-0.3, 1.1, -0.05), V3(-0.285, 0.95, 0.11)];
  const aoP = ongTay(vP, rTayAo(0.5)); const mAoP = new THREE.Mesh(aoP.g, matTayAo); mAoP.name = 'TayAoPhai'; tay.add(mAoP);
  const vT = [V3(0.27, 1.34, -0.01), V3(0.3, 1.1, -0.03), V3(0.268, 0.92, 0.035)];
  const aoT = ongTay(vT, rTayAo(0.5)); const mAoT = new THREE.Mesh(aoT.g, matTayAo); mAoT.name = 'TayAoTrai'; tay.add(mAoT);
  { const tui = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.014, 0.13), matTayAo); tui.position.set(0.262, 0.9, 0.02); tui.rotation.z = -0.2; tui.name = 'NapTui'; tay.add(tui); }
  const W0 = aoP.curve.getPointAt(1), f = aoP.curve.getTangentAt(1).normalize();
  const ra = V3(-1, 0, 0).addScaledVector(f, f.x).normalize(), len = new THREE.Vector3().crossVectors(f, ra).normalize();
  if (len.y < 0) len.negate();
  const dat3 = (m, c, ax, ay, az) => { m.matrixAutoUpdate = false; m.matrix.makeBasis(ax, ay, az).setPosition(c); return m; };
  const ban0 = W0.clone().addScaledVector(f, 0.05);
  const banTay = dat3(new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), matDa), ban0, ra.clone().multiplyScalar(0.022), len.clone().multiplyScalar(0.045), f.clone().multiplyScalar(0.054));
  banTay.name = 'BanTay'; tay.add(banTay);
  const ngon = (goc, d1, d2, r, ten) => {
    const a = goc, b = a.clone().add(d1), c = b.clone().add(d2), g = new THREE.Group();
    for (const [p, q, rr] of [[a, b, r], [b, c, r * 0.92]]) { const L = p.distanceTo(q); const m = new THREE.Mesh(new THREE.CapsuleGeometry(rr, L, 4, 10), matDa); m.position.copy(p).add(q).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), q.clone().sub(p).normalize()); g.add(m); }
    g.name = ten; tay.add(g); return c;
  };
  const vao = ra.clone().negate();
  for (let k = 0; k < 4; k++) {
    const goc = ban0.clone().addScaledVector(f, 0.046).addScaledVector(len, 0.03 - k * 0.019).addScaledVector(ra, 0.004);
    const duoi = k <= 1 ? 1.0 : 0.55;
    ngon(goc, f.clone().multiplyScalar(0.037 * (k === 3 ? 0.8 : 1)).addScaledVector(vao, 0.003), f.clone().multiplyScalar(0.016 * duoi).addScaledVector(vao, 0.025 - 0.01 * duoi).addScaledVector(len, -0.005), k === 3 ? 0.0085 : 0.0098, 'Ngon' + k);
  }
  ngon(ban0.clone().addScaledVector(len, 0.035).addScaledVector(f, -0.012).addScaledVector(vao, 0.008), f.clone().multiplyScalar(0.036).addScaledVector(len, 0.014).addScaledVector(vao, 0.006), f.clone().multiplyScalar(0.022).addScaledVector(vao, 0.012), 0.0105, 'NgonCai');
  const giuaNgon = ban0.clone().addScaledVector(f, 0.066).addScaledVector(len, 0.0205).addScaledVector(ra, 0.004);
  const thuocA = giuaNgon.clone().addScaledVector(f, -0.014), thuocB = giuaNgon.clone().addScaledVector(f, 0.085).addScaledVector(len, 0.01);
  const thuoc = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, thuocA.distanceTo(thuocB), 8), nmats.DieuThuoc); thuoc.name = 'DieuThuoc';
  thuoc.position.copy(thuocA).add(thuocB).multiplyScalar(0.5); thuoc.quaternion.setFromUnitVectors(V3(0, 1, 0), thuocB.clone().sub(thuocA).normalize()); tay.add(thuoc);
  const lua = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 10), nmats.DauLua); lua.name = 'DauLua'; lua.position.copy(thuocB); tay.add(lua);
  tt.add(tay);
  tt.traverse((m) => { if (m.isMesh) { m.layers.enable(1); m.frustumCulled = false; } });
  tt.position.set(VAT4.tt[0], 0, VAT4.tt[1]); tt.rotation.y = VAT4.tt[2]; sc.add(tt); tt.updateMatrixWorld(true);
  const muU = { uVanh: { value: new THREE.Vector4(0, 0, 0.16, 0.18) }, uChom: { value: new THREE.Vector4(0, 0, 0.09, 0.11) }, uChomY: { value: new THREE.Vector2(1.72, 0) }, uCuaD: { value: new THREE.Vector2(0, 1) }, uDenD: { value: new THREE.Vector2(1, 0) } };
  const meshMu = ban.getObjectByName('Mu'), meshBang = ban.getObjectByName('BangMu');
  if (meshMu) {
    const mm = new THREE.ShaderMaterial({ vertexShader: VERT_MU, fragmentShader: FRAG_MU, uniforms: { ...shared, ...muU }, side: THREE.DoubleSide }); mm.extensions = { derivatives: true }; meshMu.material = mm;
    meshMu.geometry.computeBoundingBox(); const v = meshMu.geometry.boundingBox;
    muU.uVanh.value.set((v.min.x + v.max.x) / 2, (v.min.z + v.max.z) / 2, (v.max.x - v.min.x) / 2, (v.max.z - v.min.z) / 2);
    if (meshBang) { meshBang.geometry.computeBoundingBox(); const g = meshBang.geometry.boundingBox;
      muU.uChom.value.set((g.min.x + g.max.x) / 2, (g.min.z + g.max.z) / 2, (g.max.x - g.min.x) / 2 * 0.98, (g.max.z - g.min.z) / 2 * 0.98); muU.uChomY.value.set(g.min.y + (g.max.y - g.min.y) * 0.3, 0); }
  }
  let figC = new THREE.Vector3(), figR = 1;
  const denP = new THREE.Vector3(...VAT4.den);
  const Lf = new THREE.Vector3(), Lr = new THREE.Vector3();
  nshared.uLface.value.set(0, 1, 0);
  nshared.uHeadI.value = 0; nshared.uSang.value = 1; nshared.uSangCua.value = 1; nshared.uNhen.value = 1; nshared.uEmberI.value = 0;
  const SHN = 1024;
  const lamBong = () => { const rt = new THREE.WebGLRenderTarget(SHN, SHN, { depthTexture: new THREE.DepthTexture(SHN, SHN), depthBuffer: true, format: THREE.RedFormat }); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 8); cam.layers.set(1); return { rt, cam }; };
  const shF = lamBong(), shR = lamBong();
  const fit = (sh, Ld) => { sh.cam.position.copy(figC).addScaledVector(Ld, 3); sh.cam.lookAt(figC); const r = figR * 1.02; sh.cam.left = -r; sh.cam.right = r; sh.cam.top = r; sh.cam.bottom = -r;
    sh.cam.near = 3 - figR * 1.2; sh.cam.far = 3 + figR * 1.2; sh.cam.updateProjectionMatrix(); sh.cam.updateMatrixWorld(); return new THREE.Matrix4().multiplyMatrices(sh.cam.projectionMatrix, sh.cam.matrixWorldInverse); };
  function datNguoi() {
    tt.updateMatrixWorld(true);
    const bx = new THREE.Box3().setFromObject(tt); figC = bx.getCenter(new THREE.Vector3()); figR = bx.getSize(new THREE.Vector3()).length() / 2;
    Lf.copy(denP).sub(figC); Lf.y = 0; Lf.normalize(); Lf.y = 1.6; Lf.normalize();
    Lr.set(0.66, 1.1, -NGO4.dai).sub(figC).normalize();
    nshared.uLfill.value.copy(Lf); nshared.uLred.value.copy(Lr);
    if (meshMu) {
      const inv = new THREE.Matrix4().copy(meshMu.matrixWorld).invert(), c = new THREE.Vector3(muU.uVanh.value.x, 1.75, muU.uVanh.value.y).applyMatrix4(meshMu.matrixWorld);
      const loc = (x, z) => { const d = new THREE.Vector3(x - c.x, 0, z - c.z).transformDirection(inv); return new THREE.Vector2(d.x, d.z).normalize(); };
      muU.uCuaD.value.copy(loc(0.66, -NGO4.dai)); muU.uDenD.value.copy(loc(denP.x, denP.z));
    }
    if (o.meta) {
      const v3 = (a) => new THREE.Vector3(...a).applyMatrix4(ban.matrixWorld);
      nshared.uLens.value = o.meta.lenses.map((l) => v3(l.c));
      nshared.uLensUp.value = o.meta.lenses.map((l) => new THREE.Vector3(...l.up).transformDirection(ban.matrixWorld));
      nshared.uLensRt.value = o.meta.lenses.map((l) => new THREE.Vector3(...l.rt).transformDirection(ban.matrixWorld));
      nshared.uLensR.value = o.meta.lenses[0].r;
    }
    nshared.uFillVP.value.copy(fit(shF, Lf)); nshared.uFillDepth.value = shF.rt.depthTexture;
    nshared.uRedVP.value.copy(fit(shR, Lr)); nshared.uRedDepth.value = shR.rt.depthTexture;
  }
  datNguoi();
  nshared.uFillTexel.value = 1 / SHN; nshared.uHeadTexel.value = 1 / SHN;
  if (o.low) nshared.uTaps.value = 4;
  const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });

  const BN = 1024;
  const bongRT = new THREE.WebGLRenderTarget(BN, BN, { depthTexture: new THREE.DepthTexture(BN, BN), depthBuffer: true, format: THREE.RedFormat });
  const camB = new THREE.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.2, 12); camB.layers.set(2);
  {
    const hn = new THREE.Group(); hn.name = 'hinhNhanBong';
    const them = (geo, x, y, z, rx = 0, rz = 0, sx = 1, sz = 1) => { const m = new THREE.Mesh(geo, depthOnly); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.scale.set(sx, 1, sz); hn.add(m); };
    for (const k of [-1, 1]) {
      them(new THREE.CylinderGeometry(0.052, 0.045, 0.6, 10), 0.095 * k, 0.3, 0);
      them(new THREE.CylinderGeometry(0.042, 0.036, 0.6, 10), 0.215 * k, 1.12, 0.0, 0, -0.06 * k);
    }
    them(new THREE.CylinderGeometry(0.165, 0.205, 0.88, 16), 0, 0.98, 0, 0, 0, 1, 0.6);
    them(new THREE.SphereGeometry(1, 16, 10), 0, 1.43, 0, 0, 0, 1, 1); hn.children[hn.children.length - 1].scale.set(0.235, 0.07, 0.12);
    them(new THREE.CylinderGeometry(0.045, 0.05, 0.13, 10), 0, 1.53, 0);
    them(new THREE.SphereGeometry(0.092, 14, 10), 0, 1.64, 0.01);
    them(new THREE.CylinderGeometry(0.215, 0.215, 0.016, 24), 0, 1.735, 0.01, 0.06);
    them(new THREE.CylinderGeometry(0.08, 0.095, 0.12, 14), 0, 1.8, 0.0);
    hn.traverse((m) => { if (m.isMesh) { m.layers.set(2); m.frustumCulled = false; } });
    hn.scale.y = 0.62;
    tt.add(hn);
  }
  let nguonB = VAT4.bongNguon;
  function datNguonBong(p) {
    nguonB = p; camB.position.set(...p); camB.lookAt(tt.position.x, 0.5, tt.position.z); camB.updateMatrixWorld(); camB.updateProjectionMatrix();
    shared.uShT.value = bongRT.depthTexture; shared.uShVP.value.multiplyMatrices(camB.projectionMatrix, camB.matrixWorldInverse);
  }
  datNguonBong(VAT4.bongNguon);

  yield;
  let bao = null;
  const baoU = { uTex: { value: null }, uGoc: { value: new THREE.Vector3(0.14, 62, 0.13) }, uGioBao: { value: 0.3 }, uKich: { value: new THREE.Vector2(1.55, 1.0) }, uTieu: { value: new THREE.Vector4(0, 0, 0, 0) } };
  {
    const m = new THREE.ShaderMaterial({ vertexShader: VERT_BAO, fragmentShader: FRAG_BAO, side: THREE.DoubleSide, uniforms: { ...shared, ...baoU } });
    m.extensions = { derivatives: true };
    bao = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.0, 96, 62), m); bao.name = 'bao';
    bao.rotation.set(-Math.PI / 2, 0, Math.PI / 2 - 0.08); bao.position.set(0.0, 0.004, -13.2);
    sc.add(bao);
  }
  const meo3 = taoMeo3({ CHUNG, shared, low: o.low });
  const meoMesh = meo3.mesh; sc.add(meoMesh);
  const hamW = new THREE.Vector3((VAT4.song[0] + VAT4.song[1]) / 2, 0.03, (VAT4.song[2] + VAT4.song[3]) / 2);
  function datMeo(x, z, k = 1.3, lat = 1) { meo3.datBau([x, VAT4.bau[4], z], k, VAT4.bau, hamW, lat); }
  datMeo(...VAT4.meo);
  { const B = VAT4.bau, M = VAT4.mai;
    mk(new THREE.BoxGeometry(B[1] - B[0], B[4], B[3] - B[2]), 13, [(B[0] + B[1]) / 2, B[4] / 2, (B[2] + B[3]) / 2], null, 'bau');
    const sau = M[3] - M[2], doc = Math.atan2(M[4] - M[5], sau), dai2 = Math.hypot(sau, M[4] - M[5]);
    const mai = mk(new THREE.BoxGeometry(M[1] - M[0], 0.022, dai2), 14, [(M[0] + M[1]) / 2, (M[4] + M[5]) / 2, (M[2] + M[3]) / 2], [doc, 0, 0], 'maiTon');
    mai.renderOrder = 2.5;
  }

  const but = new THREE.Group(); but.name = 'butChi';
  { const r = 0.017, Lb = 0.15, Lc = 0.035, Lg = 0.025;
    const mb = (phan) => { const m = new THREE.ShaderMaterial({ vertexShader: VERT_BUT, fragmentShader: FRAG_BUT, uniforms: { ...shared, uPhanBut: { value: phan } } }); m.extensions = { derivatives: true }; return m; };
    const nap = (geo, phan, y) => { geo.translate(0, y, 0); const m = new THREE.Mesh(geo, mb(phan)); m.name = 'but' + phan; but.add(m); return m; };
    const gam = new THREE.CylinderGeometry(r * 0.96, r, Lg, 6, 3);
    { const p = gam.attributes.position; let s2 = 77; const rd = () => ((s2 = (s2 * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > Lg * 0.2) { const k = 0.55 + 0.45 * rd(); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); p.setY(i, y - 0.008 * rd()); } }
      gam.computeVertexNormals(); }
    nap(gam, 3, -Lb / 2 - Lg / 2);
    nap(new THREE.CylinderGeometry(r, r, Lb, 6, 1), 0, 0);
    nap(new THREE.CylinderGeometry(r * 0.3, r, Lc, 6, 1), 1, Lb / 2 + Lc / 2);
    nap(new THREE.ConeGeometry(r * 0.3, 0.012, 6), 2, Lb / 2 + Lc + 0.006);
    but.children.forEach((m) => { m.frustumCulled = false; });
    sc.add(but); }
  function datBut(b) {
    const y = NGO4.hP + NGO4.goDay + 0.017 * 0.87 * b[3] / 0.21;
    but.position.set(b[0], y, b[1]);
    but.rotation.set(0, 0, 0); but.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.sin(b[2]), 0, Math.cos(b[2])));
    but.rotateY(Math.PI / 6);
    but.scale.setScalar(b[3] / 0.21);
    but.updateMatrixWorld(true);
    shared.uBut.value.set(b[0], b[1], b[2], b[3]);
  }
  datBut(VAT4.but);

  let mua = null; const NMUA = o.low ? 840 : 1500;
  { const N = NMUA;
    const base = new THREE.PlaneGeometry(1, 1); base.translate(0, 0.5, 0);
    const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.attributes.position = base.attributes.position;
    const aP = new Float32Array(N * 3), aL = new Float32Array(N);
    let s = 977; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const aR = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) { aP[i * 3] = (rnd() - 0.5) * (rong - 0.1); aP[i * 3 + 1] = rnd() * 4.6; aP[i * 3 + 2] = -dai + rnd() * 9.0; aL[i] = 0.16 + 0.34 * rnd();
      aR[i * 4] = rnd(); aR[i * 4 + 1] = rnd() * rnd(); aR[i * 4 + 2] = Math.sqrt(rnd()); aR[i * 4 + 3] = rnd(); }
    g.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 3)); g.setAttribute('aL', new THREE.InstancedBufferAttribute(aL, 1)); g.setAttribute('aR', new THREE.InstancedBufferAttribute(aR, 4)); g.instanceCount = N;
    const m = new THREE.ShaderMaterial({ vertexShader: VERT_MUA, fragmentShader: FRAG_MUA, depthTest: true, depthWrite: false, side: THREE.DoubleSide, transparent: true,
      uniforms: { ...shared, uRes, uRong: { value: 0.95 }, uRoi: { value: 0 }, uCaoMua: { value: 4.6 }, uCon: { value: new THREE.Vector4(0.04, 0, 0.1, 0) }, uToa: { value: 0.35 } } });
    m.extensions = { derivatives: true };
    mua = new THREE.Mesh(g, m); mua.frustumCulled = false; mua.name = 'mua'; mua.renderOrder = 3; sc.add(mua); }

  const cam = new THREE.PerspectiveCamera(20, 1, 0.5, 60);
  const camDepth = cam.clone(); camDepth.layers.set(1);
  let camRT = null;
  function datMay(tam, cao2, fov, up, w, h) {
    W = w; H = h; uRes.value.set(W, H);
    cam.aspect = W / H; cam.fov = fov; cam.near = Math.max(0.5, cao2 - 6); cam.far = cao2 + 3;
    cam.position.set(tam[0], cao2, tam[1]); cam.up.set(...up); cam.lookAt(tam[0], 0, tam[1]);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const mpx = (2 * cao2 * Math.tan(THREE.MathUtils.degToRad(fov / 2))) / H;
    shared.uCell.value = mpx / cao2 * 0.95;
    nshared.uCell.value = mpx * 0.8; nshared.uRes.value.set(W, H); nshared.uNear.value = cam.near; nshared.uFar.value = cam.far;
    nshared.uRimW.value = Math.max(2.2, 3.0 * (H / 1080) * (W / H > 1 ? 1 : 1.25));
    const cr = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), cu = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    nshared.uRimDir.value.set(Lr.dot(cr), Lr.dot(cu)).normalize();
    nshared.uRimDirH.value.copy(nshared.uRimDir.value);
    soiDen();
    if (meo3.datMay) meo3.datMay(cam);
    tinh = false;
  }
  let tinh = false;
  function veTinh() {
    const ac = renderer.autoClear; renderer.autoClear = true;
    sc.overrideMaterial = depthOnly;
    for (const sh of [shF, shR]) { renderer.setRenderTarget(sh.rt); renderer.clear(); renderer.render(sc, sh.cam); }
    renderer.setRenderTarget(bongRT); renderer.clear(); renderer.render(sc, camB);
    if (!camRT || camRT.width !== W || camRT.height !== H) { if (camRT) { camRT.depthTexture.dispose(); camRT.dispose(); } camRT = new THREE.WebGLRenderTarget(W, H, { depthTexture: new THREE.DepthTexture(W, H), depthBuffer: true, format: THREE.RedFormat }); nshared.uCamDepth.value = camRT.depthTexture; }
    camDepth.copy(cam); camDepth.layers.set(1);
    renderer.setRenderTarget(camRT); renderer.clear(); renderer.render(sc, camDepth);
    sc.overrideMaterial = null;
    shared.uShOn.value = 1;
    renderer.setRenderTarget(null); renderer.autoClear = ac;
    tinh = true;
  }
  let nhapCu = 1;
  function capNhat(t, cham = 1) {
    shared.uT.value = t * cham;
    const k = cham < 1 ? 1 : nhapAt(t);
    shared.uNhap.value = k;
    if (Math.abs(k - nhapCu) > 1e-4) { for (const m of Object.values(nmats)) if (m.uniforms.uRimOn) m.uniforms.uRimOn.value = (m.userData.rim0 ?? (m.userData.rim0 = m.uniforms.uRimOn.value)) * (0.35 + 0.65 * (k - 0.65) / 0.35); nhapCu = k; }
    mua.material.uniforms.uRoi.value = t * 6.5 * cham;
    meo3.capNhat(t, cham);
    { const tt2 = t * cham, con = 0.5 + 0.5 * Math.sin(tt2 * 1.6) * Math.sin(tt2 * 0.57 + 0.9); baoU.uGioBao.value = 0.2 + 0.8 * con;
      const goc = 0.07 * (con - 0.5) + 0.05 * Math.sin(tt2 * 0.21 + 1.3), manh = 0.8 + 0.55 * con;
      const gx = 0.04 * manh, gz = 0.1 * manh, cg = Math.cos(goc), sg = Math.sin(goc);
      mua.material.uniforms.uCon.value.set(gx * cg - gz * sg, tt2, gx * sg + gz * cg, con); }
  }
  function ve(dich) {
    if (!tinh) veTinh();
    renderer.setRenderTarget(dich ?? null);
    const zm = typeof window !== 'undefined' && window.__zoom4;
    if (zm) cam.setViewOffset(zm.W, zm.H, zm.x, zm.y, zm.w, zm.h);
    renderer.clear(); renderer.render(sc, cam);
    if (zm) cam.clearViewOffset();
  }
  const _v = new THREE.Vector3();
  function man(p, Wc, Hc) { _v.set(p[0], p[1], p[2]).project(cam); return { x: (_v.x * 0.5 + 0.5) * Wc, y: (0.5 - _v.y * 0.5) * Hc, z: _v.z }; }
  function datVat(v) {
    if (v.denB) { denP.set(...v.denB); shared.uDenB.value.copy(denP); }
    if (v.tt) { tt.position.set(v.tt[0], 0, v.tt[1]); datNguoi(); }
    else if (v.denB) datNguoi();
    if (v.bong || v.tt) datNguonBong(v.bong || nguonB);
    if (v.nem) shared.uNem.value.set(...v.nem);
    if (v.den) shared.uDen.value.set(...v.den);
    if (v.meo) datMeo(...v.meo);
    if (v.but) datBut(v.but);
    if (v.vung) v.vung.forEach((q, i) => extra.uVung.value[i].set(...q));
    soiDen();
    tinh = false;
  }
  function soiDen() {
    const cp = cam.position, t = cp.y / (cp.y + denP.y);
    shared.uDenR.value.set(cp.x + (denP.x - cp.x) * t, cp.z + (denP.z - cp.z) * t);
  }
  function datGai() { tinh = false; }
  function datTieu(h) { baoU.uTieu.value.set(...h); }
  function datBao(x, z, yaw, k = 1) { bao.position.set(x, 0.004, z); bao.rotation.set(-Math.PI / 2, 0, yaw); bao.scale.set(k, k, 1); bao.updateMatrixWorld(true); }
  function diemBao(u, v) { return new THREE.Vector3((u - 0.5) * 1.55, (0.5 - v) * 1.0, 0.003).applyMatrix4(bao.matrixWorld); }
  function dangKyKinh(lens, idNguoi, hopTieu) {
    const idOf = { 0: 40, 1: 41, 2: 41, 3: 42, 4: 43, 5: 44, 6: 44, 8: 52, 9: 52, 10: 44, 11: 44, 12: 45, 13: 49, 14: 50 };
    for (const m of MATS4) {
      const mt = m.userData.mat;
      if (mt === 0 || mt === 8) { const g = new THREE.ShaderMaterial({ vertexShader: VERT_GB, fragmentShader: FRAG_DAT_GB, side: THREE.DoubleSide, uniforms: { ...shared, ...extra, uMat: { value: mt } } }); g.extensions = { derivatives: true }; lens.gbufMat(m, g); continue; }
      if (mt === 3) { const g = new THREE.ShaderMaterial({ vertexShader: VERT_GB, fragmentShader: FRAG_CUOI_GB, side: THREE.DoubleSide, uniforms: { ...shared, ...extra } }); lens.gbufMat(m, g); continue; }
      lens.gbufFor(m, idOf[mt] ?? 45);
    }
    lens.gbufMat(bao, new THREE.ShaderMaterial({ vertexShader: VERT_BAO, fragmentShader: FRAG_BAO_GB, side: THREE.DoubleSide, uniforms: { ...shared, ...baoU, uTieu: { value: new THREE.Vector4(...(hopTieu || [0, 0, 0, 0])) } } }));
    lens.gbufMat(meoMesh, meo3.matGB(31));
    but.children.forEach((m) => lens.gbufFor(m, 46));
    if (idNguoi) idNguoi(tt, lens);
    lens.anDi(mua);
  }
  async function lamNongAsync() {
    if (renderer.extensions.has('KHR_parallel_shader_compile')) await dichTungVat(renderer, sc, cam);
    else renderer.compile(sc, cam);
  }
  function datNac(nac) {
    shared.uHatPhim.value = nac >= 2 ? 10 : 14;
    mua.geometry.instanceCount = nac >= 2 ? Math.round(NMUA * 0.5) : NMUA;
    nshared.uTaps.value = nac >= 1 ? 4 : 12;
    meo3.u.uBuoc.value = nac >= 2 || o.low ? 60 : 88;
  }
  function huy() {
    for (const r of [shF.rt, shR.rt, bongRT]) { r.depthTexture.dispose(); r.dispose(); }
    if (camRT) { camRT.depthTexture.dispose(); camRT.dispose(); }
  }
  return { scene: sc, camera: cam, ve, veTinh, capNhat, datMay, man, datBao, datGai, datTieu, datVat, diemBao, dangKyKinh, lamNongAsync, datNac, huy, bao, baoU, meo: meoMesh, meo3, tt, shared, nshared,
    chan: chanDs, ganTinh: () => { tinh = false; }, denP, diemLua: () => lua.getWorldPosition(new THREE.Vector3()), diemBut: () => but.position.clone(),
    dichTungVat: (s, c) => dichTungVat(renderer, s, c) };
}

const nhuongKhung = () => new Promise((r) => { let x = false; const f = () => { if (!x) { x = true; r(); } }; requestAnimationFrame(f); setTimeout(f, 100); });
export async function dichTungVat(renderer, sc, cam, song = 2) {
  const ds = []; sc.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.material) ds.push(o); });
  const cho = [];
  for (const o of ds) {
    const n0 = renderer.info.programs.length;
    const p = renderer.compileAsync(o, cam, sc).catch(() => {});
    if (renderer.info.programs.length > n0) { cho.push(p); if (cho.length >= song) await cho.shift(); await nhuongKhung(); }
  }
  await Promise.all(cho);
}

export function veDauChan(diem, sai = 0.34) {
  const seg = []; let tong = 0;
  for (let i = 1; i < diem.length; i++) { const [x0, z0] = diem[i - 1], [x1, z1] = diem[i]; const l = Math.hypot(x1 - x0, z1 - z0); seg.push({ x0, z0, x1, z1, l, t0: tong }); tong += l; }
  const n = Math.floor(tong / sai), ra = [];
  const at = (s) => { const g = seg.find((q) => s <= q.t0 + q.l + 1e-6) || seg[seg.length - 1]; const u = (s - g.t0) / g.l; return [g.x0 + (g.x1 - g.x0) * u, g.z0 + (g.z1 - g.z0) * u, (g.x1 - g.x0) / g.l, (g.z1 - g.z0) / g.l]; };
  for (let i = 0; i <= n; i++) {
    const s = tong - (n - i) * sai, [x, z, hx, hz] = at(s), side = (n - i) % 2 ? -1 : 1;
    const a = Math.atan2(hx, hz) + 0.06 * side;
    const dam = Math.min(1, 0.3 + 0.7 * i / 4);
    ra.push([x + hz * 0.065 * side, z - hx * 0.065 * side, a, side * dam]);
  }
  return ra;
}

export function taoGiayBaoBuoc(tieuDe, phong, seed = 4242) {
  let st = null;
  const tu = [0, 1, 2, 3, 4, 5].map((i) => () => giayChu(st, i));
  return [() => { st = { tieuDe, phong, seed }; giayBuoc1(st); }, () => giayBuoc2(st), ...tu, () => giayBuoc3(st), () => st.kq];
}
export function taoGiayBao(tieuDe, phong, seed = 4242) { const v = taoGiayBaoBuoc(tieuDe, phong, seed); for (let i = 0; i < v.length - 1; i++) v[i](); return v[v.length - 1](); }
function giayBuoc1(st) {
  const cw = 1536, ch = Math.round(1536 / 1.55);
  const { seed } = st;
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch);
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = 'rgb(0,255,0)'; g.beginPath();
  const mep = (x0, y0, x1, y1, n, a) => { for (let i = 0; i <= n; i++) { const t = i / n; g.lineTo(x0 + (x1 - x0) * t + (rnd() - 0.5) * a, y0 + (y1 - y0) * t + (rnd() - 0.5) * a); } };
  const k = cw / 2048;
  g.moveTo(14 * k, 16 * k); mep(14 * k, 16 * k, cw - 16 * k, 10 * k, 80, 8 * k); mep(cw - 16 * k, 10 * k, cw - 10 * k, ch - 18 * k, 50, 8 * k); mep(cw - 10 * k, ch - 18 * k, 18 * k, ch - 12 * k, 80, 9 * k);
  mep(18 * k, ch - 12 * k, 10 * k, ch * 0.32, 30, 10 * k); g.lineTo(70 * k, ch * 0.24); g.lineTo(10 * k, ch * 0.19); mep(10 * k, ch * 0.19, 14 * k, 16 * k, 12, 8 * k); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,255,0.6)'; g.lineJoin = 'round';
  for (let j = 0; j < 2; j++) { g.lineWidth = (34 + j * 22) * k; g.beginPath(); g.rect((-10 - j * 5) * k, -10 * k, cw + 20 * k, ch + 20 * k); g.stroke(); }
  g.fillStyle = 'rgb(255,0,0)';
  g.font = `bold ${Math.round(ch * 0.08)}px "Courier Prime", monospace`; g.fillText('THE NIGHT POST · LATE FINAL', cw * 0.06, ch * 0.1);
  g.fillRect(cw * 0.06, ch * 0.118, cw * 0.88, ch * 0.007); g.fillRect(cw * 0.06, ch * 0.133, cw * 0.88, ch * 0.0035);
  Object.assign(st, { cv, g, cw, ch, rnd });
}
function giayBuoc2(st) {
  const { g, cw, ch, tieuDe, phong } = st;
  const dong = (() => { const w = tieuDe.toUpperCase().split(' '); const i = Math.ceil(w.length * 0.6); return [w.slice(0, i).join(' '), w.slice(i).join(' ')]; })();
  g.textBaseline = 'alphabetic';
  const F0 = 40; g.font = `${F0}px "${phong}", Impact, sans-serif`;
  const rMax = Math.max(...dong.map((d) => g.measureText(d).width)); const fs = Math.floor(F0 * (cw * 0.84) / rMax), k = fs / F0;
  const y1 = ch * 0.17 + fs * 0.86, y2 = y1 + fs * 0.92;
  const chu = [];
  dong.forEach((d, li) => { const ws = d.split(' '); let truoc = ''; for (const w of ws) { chu.push({ t: w, x: cw * 0.06 + (truoc ? g.measureText(truoc + ' ').width * k : 0), y: li ? y2 : y1 }); truoc = truoc ? truoc + ' ' + w : w; } });
  const rongTieu = Math.max(...dong.map((d) => g.measureText(d).width)) * k;
  Object.assign(st, { dong, y1, y2, fs, chu, rongTieu });
}
function giayChu(st, i) {
  const c = st.chu && st.chu[i]; if (!c) return;
  st.g.font = `${st.fs}px "${st.phong}", Impact, sans-serif`; st.g.textBaseline = 'alphabetic';
  st.g.fillText(c.t, c.x, c.y);
}
function giayBuoc3(st) {
  const { cv, g, cw, ch, rnd, y1, y2, fs, rongTieu } = st;
  const yKe = y2 + fs * 0.3;
  g.fillRect(cw * 0.06, yKe, cw * 0.88, ch * 0.004);
  const cot = (x0, x1, y0, y1b) => { for (let y = y0; y < y1b; y += ch * 0.032) { const w = (x1 - x0) * (0.82 + 0.18 * rnd()); g.fillRect(x0, y, w, ch * 0.011); } };
  const yc = yKe + ch * 0.04;
  cot(cw * 0.06, cw * 0.33, yc, ch * 0.92); cot(cw * 0.36, cw * 0.63, yc, ch * 0.92); cot(cw * 0.66, cw * 0.94, yc, ch * 0.78);
  g.fillRect(cw * 0.345, yc, cw * 0.002, ch * 0.92 - yc); g.fillRect(cw * 0.645, yc, cw * 0.002, ch * 0.92 - yc);
  g.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 8; tex.minFilter = THREE.LinearMipmapLinearFilter;
  const hopTieu = [0.06, (y1 - fs * 0.86) / ch, 0.06 + rongTieu / cw, y2 / ch];
  st.kq = { tex, hopTieu };
}
