import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { C, COMMON, makeShared, makeMaterial } from './npr.js';
import { VUNG_GB_GLSL } from './kinh-lup.js';

const PAL = `
const vec3 K_MUC = vec3(23.,19.,26.)/255., K_DEM = vec3(35.,42.,98.)/255., K_SANG = vec3(52.,57.,154.)/255., K_DO = vec3(255.,31.,79.)/255.,
  K_HONG = vec3(255.,58.,134.)/255., K_GIAY = vec3(243.,220.,214.)/255., K_DOCHIM = vec3(96.,36.,67.)/255.;
vec3 haBac(vec3 c) {
  if (distance(c, K_GIAY) < 0.12) return K_SANG;
  if (distance(c, K_SANG) < 0.1) return K_DEM;
  if (distance(c, K_DO) < 0.15 || distance(c, K_HONG) < 0.15) return K_DOCHIM;
  return K_MUC;
}`;
const ENV = `
uniform float uCellK, uGb;
uniform vec3 uLampP; uniform float uLampR;
uniform vec3 uCuaC; uniform vec2 uCuaH;
uniform vec3 uNeonC; uniform vec2 uNeonH;
uniform mat4 uRedVP; uniform sampler2D uRedDepth;
const vec2 PD8[8] = vec2[8](vec2(-0.326,-0.406), vec2(-0.840,-0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621), vec2( 0.962,-0.195), vec2( 0.473,-0.480), vec2( 0.519, 0.767), vec2( 0.185,-0.893));
vec3 oHat(vec3 P) { float c = uCellK * max(distance(P, cameraPosition), 0.3); return floor(P / c); }
float bong(sampler2D t, mat4 vp, vec3 P, float bias, float rad) {
  vec4 lp = vp * vec4(P, 1.0); vec3 p = lp.xyz / lp.w * 0.5 + 0.5;
  if (lp.w <= 0.0 || p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || p.z > 1.0) return 1.0;
  float lit = 0.0;
  for (int i = 0; i < 8; i++) lit += (p.z - bias <= textureLod(t, p.xy + PD8[i] * rad, 0.0).r) ? 1.0 : 0.0;
  return lit / 8.0;
}`;
const VERT_W = `
varying vec3 vW; varying vec2 vUv; varying float vZ;
void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vec4 vp = viewMatrix * wp; vZ = -vp.z; gl_Position = projectionMatrix * vp; }`;
const HAT = `
  vec3 cel = oHat(vW); float r1 = hash13(cel), r2 = hash13(cel + 17.31), r3 = hash13(cel + 41.7), r4 = hash13(cel + 73.1);`;
const HAT_CUOI = `
  col += (r3 + r4 - 1.0) * (14.0 / 255.0) * (0.8 + 0.4 * col);
  gl_FragColor = vec4(col, 1.0);`;

const FRAG_DAT = `
${COMMON}
${PAL}
${ENV}
varying vec3 vW; varying vec2 vUv; varying float vZ;
uniform vec4 uPud[4]; uniform int uNPud;
uniform vec4 uVet[12]; uniform int uNVet;
uniform float uUseRefl; uniform sampler2D uRefl; uniform mat4 uReflMat;
uniform vec4 uGon;
uniform vec4 uPhimN;
uniform vec4 uGonCam;
uniform vec4 uVo;
uniform vec3 uPxUv;
uniform float uT, uMua, uWallZ;
uniform sampler2D uNeonTex;
uniform float uNeonM;
uniform float uBienCat;
uniform vec4 uLe;
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash13(vec3(i, 1.0)), b = hash13(vec3(i + vec2(1, 0), 1.0)), c = hash13(vec3(i + vec2(0, 1), 1.0)), d = hash13(vec3(i + vec2(1, 1), 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
float vung(vec2 p) {
  float m = -1.0;
  for (int i = 0; i < 4; i++) { if (i >= uNPud) break; vec4 q = uPud[i]; vec2 d = (p - q.xy) / q.zw;
    float e = 1.0 - length(d) + (n2(p * 1.6 + float(i) * 7.0) - 0.5) * 0.36 + (n2(p * 5.0 + 3.0) - 0.5) * 0.1; m = max(m, e); }
  return m;
}
float vet(vec2 p) {
  float v = -1.0;
  for (int i = 0; i < 12; i++) { if (i >= uNVet) break; vec4 q = uVet[i]; vec2 d = p - q.xy; float c = cos(q.z), s = sin(q.z);
    vec2 l = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
    float fore = length((l - vec2(0.0, 0.045)) / vec2(0.038, 0.062));
    float heel = length((l + vec2(0.0, 0.085)) / vec2(0.013, 0.013));
    v = max(v, (1.0 - min(fore, heel)) * step(0.0, q.w)); }
  return v;
}
void main() {
  ${HAT}
  vec3 P = vW;
  float m = vung(P.xz); float inP = clamp(m / max(fwidth(m), 1e-4) + 0.5, 0.0, 1.0);
  float v = vet(P.xz); float vm = clamp(v / max(fwidth(v), 1e-4) + 0.5, 0.0, 1.0) * (1.0 - inP);
  if (uGb > 0.5) {
    vec2 gG = P.xz / vec2(0.5, 0.25); gG.x += 0.5 * mod(floor(gG.y), 2.0); vec2 fG = fract(gG), wG = max(fwidth(gG), vec2(1e-4));
    float kheG = max(step(min(fG.x, 1.0 - fG.x), wG.x * 0.8), step(min(fG.y, 1.0 - fG.y), wG.y * 0.8));
    vec2 ceG = floor(P.xz / 0.36), ccG = (ceG + vec2(hash13(vec3(ceG, 11.0)), hash13(vec3(ceG, 12.0)))) * 0.36;
    float drG = length(P.xz - ccG), rrG = 0.03 + 0.05 * hash13(vec3(ceG, 13.0));
    float vongG = inP * step(0.6, hash13(vec3(ceG, 14.0))) * step(abs(drG - rrG), length(fwidth(P.xz)) * 0.65 + 0.002);
    float id = vm > 0.5 ? 23.0 : (vongG > 0.5 ? 35.0 : (kheG > 0.5 ? 34.0 : (inP > 0.5 ? 21.0 : 20.0)));
    if (uLe.w > 0.5 && P.z > uLe.z + 0.4) {
      float xT = uLe.x + (uLe.x - cameraPosition.x) * uLe.y / (cameraPosition.y - uLe.y), pw = max(fwidth(P.x), 1e-5);
      if (P.x < xT) id = kheG > 0.5 ? 34.0 : 20.0;
      if (abs(P.x - xT) < pw * 0.9 || abs(P.x - uLe.x) < pw * 0.9) id = 34.0;
    }
    gl_FragColor = vec4(0.5, 1.0, vZ, id); return; }
  vec3 col = K_MUC;
  float dpool = length(P.xz - uLampP.xz);
  float pool = 1.0 - smoothstep(uLampR * 0.82, uLampR, dpool);
  float loi = 1.0 - smoothstep(uLampR * 0.4, uLampR * 0.48, dpool);
  col = mix(col, K_DEM, rutTham(pool, r1, 0.6));
  col = mix(col, K_SANG, rutTham(loi, r2, 0.6));
  float raX = 1.0 - smoothstep(uCuaH.x * 0.9, uCuaH.x * 0.9 + 0.35 + (P.z - uWallZ) * 0.35, abs(P.x - uCuaC.x));
  float raZ = 1.0 - smoothstep(0.4, 2.2, P.z - uWallZ);
  float sang = raX * raZ * bong(uRedDepth, uRedVP, P + vec3(0.0, 0.004, 0.0), 0.002, 0.0012);
  col = mix(col, K_DOCHIM, rutTham(sang, r3, 0.6));
  float lit = max(max(pool, loi), sang);
  vec2 g = P.xz / vec2(0.5, 0.25); g.x += 0.5 * mod(floor(g.y), 2.0); vec2 f = fract(g); vec2 fw = max(fwidth(g), vec2(1e-4));
  float khe = max(1.0 - clamp((min(f.x, 1.0 - f.x) - 0.025) / fw.x, 0.0, 1.0), 1.0 - clamp((min(f.y, 1.0 - f.y) - 0.04) / fw.y, 0.0, 1.0));
  col = mix(col, haBac(col), khe * step(0.1, lit) * 0.85);
  col = mix(col, lit > 0.12 ? (sang > pool ? K_DO : K_SANG) : K_DEM, vm);
  if (inP > 0.0) {
    vec2 off = vec2(0.0); float vach = 0.0;
    float cam_ = (uGonCam.x < uGonCam.z && P.x > uGonCam.x && P.x < uGonCam.z && P.z > uGonCam.y && P.z < uGonCam.w) ? 0.0 : 1.0;
    if (uGon.w > 0.001) {
      vec2 d = P.xz - uGon.xy; float r = length(d);
      float song = r - uGon.z;
      float bao = exp(-song * song / 0.03) * step(r, uGon.z + 0.3) * cam_;
      float w = sin(r * 30.0 - uGon.z * 30.0) * bao * uGon.w;
      off += (r > 1e-3 ? d / r : vec2(0.0)) * w * 0.02;
      vach = max(vach, smoothstep(0.88, 0.98, abs(sin(r * 15.0 - uGon.z * 15.0))) * bao * uGon.w);
    }
    float tq = floor(uT * 12.0) / 12.0;
    float gP = 0.0, vongP = 0.0;
    if (uPhimN.z > 0.5) {
      float rP = length(P.xz - uPhimN.xy);
      gP = (1.0 - smoothstep(0.12, 0.55, rP)) * cam_;
      float sdq = floor(uPhimN.w * 12.0) / 12.0;
      for (int i = 0; i < 2; i++) { float ph = sdq * 0.35 - float(i) * 0.45; if (ph < 0.0 || ph >= 1.0) continue; float rr = 0.06 + 0.36 * ph;
        vongP = max(vongP, (1.0 - ph) * (1.0 - clamp(abs(rP - rr) / (length(fwidth(P.xz)) * 0.9 + 0.002), 0.0, 1.0)) * cam_); }
    }
    vec2 ce = floor(P.xz / 0.36);
    vec2 cc = (ce + vec2(hash13(vec3(ce, 11.0)), hash13(vec3(ce, 12.0)))) * 0.36;
    float ph = fract(tq * 0.55 + hash13(vec3(ce, 13.0)));
    float rr = 0.014 + 0.085 * ph;
    float dr = length(P.xz - cc);
    float vong = uMua * step(0.6, hash13(vec3(ce, 14.0))) * (1.0 - ph) * (1.0 - clamp(abs(dr - rr) / (length(fwidth(P.xz)) * 0.85 + 0.003), 0.0, 1.0)) * cam_;
    float vong2 = 0.0; vec3 mauV2 = K_DEM;
    { float dC = distance(P, cameraPosition);
      if (dC < 3.0) { vec2 ce2 = floor(P.xz / 0.17); vec2 cc2 = (ce2 + vec2(hash13(vec3(ce2, 31.0)), hash13(vec3(ce2, 32.0)))) * 0.17;
        float ph2 = fract(tq * 0.6 + hash13(vec3(ce2, 33.0))), rr2 = 0.007 + 0.04 * ph2, dr2 = length(P.xz - cc2);
        vong2 = uMua * step(0.55, hash13(vec3(ce2, 34.0))) * (1.0 - ph2) * (1.0 - smoothstep(2.4, 3.0, dC)) * (1.0 - clamp(abs(dr2 - rr2) / (length(fwidth(P.xz)) * 0.85 + 0.0015), 0.0, 1.0)) * cam_;
        mauV2 = hash13(vec3(ce2, 35.0)) < 0.58 ? K_SANG : K_DEM; }
      if (dC < 1.6) { vec2 ce3 = floor(P.xz / 0.09); vec2 cc3 = (ce3 + vec2(hash13(vec3(ce3, 41.0)), hash13(vec3(ce3, 42.0)))) * 0.09;
        float ph3 = fract(tq * 0.65 + hash13(vec3(ce3, 43.0))), rr3 = 0.004 + 0.022 * ph3, dr3 = length(P.xz - cc3);
        float v3 = uMua * step(0.62, hash13(vec3(ce3, 44.0))) * (1.0 - ph3) * (1.0 - smoothstep(1.2, 1.6, dC)) * (1.0 - clamp(abs(dr3 - rr3) / (length(fwidth(P.xz)) * 0.85 + 0.001), 0.0, 1.0)) * cam_;
        if (v3 > vong2) { vong2 = v3; mauV2 = hash13(vec3(ce3, 45.0)) < 0.58 ? K_SANG : K_DEM; } } }
    vec3 wc = K_MUC;
    float trongB = 0.0;
    if (uUseRefl > 0.5) {
      vec4 rc = uReflMat * vec4(P, 1.0); vec2 r0 = rc.xy / rc.w; vec2 ruv = r0 + off;
      float tq2 = floor(uT * 12.0) / 12.0, sc = uPxUv.z;
      float A = 0.0;
      if (uVo.w > 0.5) { float tau = uVo.z - length(P.xz - uVo.xy) / 3.2; if (tau > 0.0) A = exp(-tau / 0.35) * (1.0 - exp(-tau / 0.035)) * cam_; }
      float nb = 11.0;
      float bv = r0.y * nb + (n2(vec2(P.x * 0.8, floor(r0.y * nb) * 1.7)) - 0.5) * 0.3;
      float dai = floor(bv);
      float hA = hash13(vec3(dai, 2.0, 5.0)), hB = hash13(vec3(dai, 7.0, 3.0)), hC = hash13(vec3(dai, 9.0, 1.0));
      float lechA = (hB - 0.5) * 44.0 * A * sin(uVo.z * 9.0 + hC * 6.283) + sin(r0.y * 242.0 + tq2 * 2.2 + n2(P.xz * 1.5) * 2.0) * 9.0 * A;
      float lech = ((hA - 0.5) * 12.0 + sin(tq2 * 0.45 + hB * 6.283) * 1.2) + (hB - 0.5) * 44.0 * A * sin(uVo.z * 9.0 + hC * 6.283);
      ruv.x += lech * sc * uPxUv.x;
      ruv.y += (hC - 0.5) * 16.0 * A * sc * uPxUv.y;
      ruv.x += sin(r0.y * 242.0 + tq2 * 2.2 + n2(P.xz * 1.5) * 2.0) * (0.9 + 9.0 * A) * sc * uPxUv.x;
      ruv.x += gP * ((step(0.5, fract(r0.y * 170.0 + hA)) - 0.5) * 4.0 + sin(r0.y * 900.0 - tq2 * 5.0) * 1.6) * sc * uPxUv.x;
      float vachToi = step(0.74, hC) * step(fract(bv), nb * uPxUv.y * 1.2);
      vec3 rcol = texture2D(uRefl, clamp(ruv, 0.0, 1.0)).rgb;
      float lum = dot(rcol, vec3(0.3, 0.5, 0.2));
      wc = lum > 0.42 ? rcol : (distance(rcol, K_SANG) < 0.12 ? K_DEM : (distance(rcol, K_DEM) < 0.08 ? K_MUC : rcol));
      if (distance(wc, K_HONG) < 0.2) wc = K_DO;
      if (distance(wc, K_GIAY) < 0.15) wc = K_SANG;
      wc = mix(wc, K_MUC, vachToi * (1.0 - A));
      {
        vec3 rdB = P - cameraPosition; float tnB = (uNeonC.z - P.z) / min(rdB.z, -1e-4);
        vec2 hn = vec2(P.x + rdB.x * tnB, P.y - rdB.y * tnB);
        hn.x += (step(uBienCat, hn.y) * (5.0 + sin(tq2 * 0.45) * 0.8) + lechA) * sc * uNeonM + (off.x / uPxUv.x) * uNeonM;
        vec2 uvB = (hn - (uNeonC.xy - uNeonH)) / (2.0 * uNeonH);
        vec4 tB = texture2D(uNeonTex, uvB);
        trongB = step(0.0, uvB.x) * step(uvB.x, 1.0) * step(0.0, uvB.y) * step(uvB.y, 1.0) * step(rdB.z, 0.0);
        if (trongB > 0.5) {
          vec3 bc = K_MUC;
          vec2 mepB = min(hn - (uNeonC.xy - uNeonH), (uNeonC.xy + uNeonH) - hn);
          bc = mix(bc, K_DOCHIM, step(min(mepB.x, mepB.y), 0.015));
          bc = mix(bc, K_DOCHIM, rutTham(smoothstep(0.4, 0.62, tB.g), r1, 0.6));
          bc = mix(bc, K_DOCHIM, step(0.75, tB.b));
          bc = mix(bc, K_MUC, step(0.25, tB.b) * step(tB.b, 0.75));
          bc = mix(bc, K_DO, step(0.42, tB.r));
          wc = bc;
        }
      }
    }
    float sang2 = step(0.4, dot(wc, vec3(0.3, 0.5, 0.2)));
    vec3 mauVong = sang2 > 0.5 ? K_MUC : (hash13(vec3(ce, 15.0)) < 0.45 ? K_SANG : K_DEM);
    float ngoaiB = 1.0 - trongB;
    wc = mix(wc, mauVong, clamp(vong, 0.0, 1.0) * ngoaiB);
    wc = mix(wc, sang2 > 0.5 ? K_MUC : mauV2, step(r2 * 0.55 + 0.12, vong2) * ngoaiB);
    wc = mix(wc, sang2 > 0.5 ? K_MUC : K_DEM, step(0.45, vach) * ngoaiB);
    wc = mix(wc, sang2 > 0.5 ? K_MUC : K_DEM, step(0.5, vongP) * ngoaiB);
    { vec2 cV = floor(vec2(P.x / 1.6, P.z / 0.45)); float hv = hash13(vec3(cV, 21.0));
      float zV = (cV.y + 0.2 + 0.6 * hash13(vec3(cV, 22.0))) * 0.45, x0 = (cV.x + 0.1 * hash13(vec3(cV, 23.0))) * 1.6, x1 = x0 + 0.5 + 0.9 * hash13(vec3(cV, 24.0));
      float vetN = step(0.6, hv) * step(x0, P.x) * step(P.x, x1) * (1.0 - clamp(abs(P.z - zV) / (fwidth(P.z) * 0.8 + 1e-4), 0.0, 1.0)) * cam_ * ngoaiB;
      wc = mix(wc, sang2 > 0.5 ? K_MUC : K_DEM, vetN); }
    col = mix(col, wc, inP);
    float mep = inP * (1.0 - clamp(m / 0.05, 0.0, 1.0));
    col = mix(col, lit > 0.1 ? haBac(col) : K_DEM, step(0.5, mep) * 0.9);
  }
  if (uLe.w > 0.5) {
    float hC = cameraPosition.y, h = uLe.y;
    float xT = uLe.x + (uLe.x - cameraPosition.x) * h / (hC - h);
    float xR = uLe.x + (cameraPosition.x - uLe.x) * h / (hC + h);
    float hien = smoothstep(uLe.z, uLe.z + 0.7, P.z);
    float pw = max(fwidth(P.x), 1e-5);
    if (hien > 0.01) {
      float vh = step(r1 * 0.9 + 0.05, hien);
      if (P.x < xT) {
        vec2 gV = P.xz / vec2(0.3, 0.6); gV.y += 0.5 * mod(floor(gV.x), 2.0); vec2 fV = fract(gV), wV = max(fwidth(gV), vec2(1e-4));
        float kheV = max(step(min(fV.x, 1.0 - fV.x), wV.x * 0.7), step(min(fV.y, 1.0 - fV.y), wV.y * 0.7)) * step(0.55, hash13(vec3(floor(gV), 9.0)));
        col = mix(col, mix(K_MUC, K_DEM, kheV * step(0.4, r4)), vh); }
      else if (P.x < uLe.x) { float k = (P.x - xT) / max(uLe.x - xT, 1e-4);
        col = mix(col, mix(K_MUC, K_DEM, step(r2, 0.55 - 1.4 * k)), vh); }
      col = mix(col, K_SANG, vh * step(abs(P.x - xT), pw * 0.8) * step(0.22, r3));
      col = mix(col, K_MUC, vh * step(abs(P.x - uLe.x), pw * 0.6));
      float dz = floor(P.z / 0.11), lz = (hash13(vec3(dz, 71.0, 3.0)) - 0.5) * 0.012;
      col = mix(col, K_DEM, vh * inP * step(abs(P.x - xR - lz), pw * 0.9) * step(0.3, hash13(vec3(dz, 72.0, 5.0))) * step(0.2, r4));
    }
  }
  ${HAT_CUOI}
}`;

const FRAG_TUONG = `
${COMMON}
${PAL}
${ENV}
varying vec3 vW; varying vec2 vUv; varying float vZ;
uniform float uLampWall, uBongT;
void main() {
  ${HAT}
  vec3 P = vW;
  vec2 dq = abs(P.xy - uCuaC.xy) - uCuaH;
  float trong = step(max(dq.x, dq.y), 0.0);
  float khung = step(max(dq.x, dq.y), 0.09) * (1.0 - trong) * step(0.0, P.y - 0.0);
  if (uGb > 0.5) {
    vec2 bG = P.xy / vec2(0.225, 0.075); bG.x += 0.5 * mod(floor(bG.y), 2.0); vec2 fG = fract(bG);
    float vuaG = step(min(fG.x, 1.0 - fG.x), 0.035) + step(min(fG.y, 1.0 - fG.y), 0.07);
    float mang = step(0.42, hash13(vec3(floor(P.xy / vec2(1.1, 0.6)), 4.0)));
    gl_FragColor = vec4(0.5, 0.5, vZ, trong > 0.5 ? 22.0 : (vuaG * mang * (1.0 - khung) > 0.5 ? 33.0 : 10.0)); return; }
  vec3 col = K_MUC;
  float dL = length(P - uLampP);
  float lamp = (1.0 - smoothstep(uLampWall * 0.25, uLampWall, dL)) * clamp((uLampP.z - P.z) * 2.0, 0.0, 1.0);
  col = mix(col, K_DEM, rutTham(clamp(lamp * 1.4, 0.0, 1.0), r1, 0.6));
  col = mix(col, K_SANG, rutTham(clamp(lamp * 2.2 - 1.3, 0.0, 1.0), r2, 0.6));
  vec2 dn = (P.xy - uNeonC.xy) / (uNeonH + vec2(0.7, 0.55));
  float neon = clamp(1.0 - length(dn), 0.0, 1.0);
  vec2 dc = (P.xy - uCuaC.xy) / (uCuaH + vec2(0.45, 0.25));
  float hat = clamp(1.0 - length(dc), 0.0, 1.0) * (1.0 - trong);
  col = mix(col, K_DOCHIM, rutTham(clamp(max(neon * 1.5, hat * 1.6), 0.0, 1.0), r3, 0.6));
  float L = max(lamp, max(neon, hat) * 0.85);
  vec2 b = P.xy / vec2(0.225, 0.075); b.x += 0.5 * mod(floor(b.y), 2.0); vec2 f = fract(b); vec2 fw = max(fwidth(b), vec2(1e-4));
  float vua = max(1.0 - clamp((min(f.x, 1.0 - f.x) - 0.02) / fw.x, 0.0, 1.0), 1.0 - clamp((min(f.y, 1.0 - f.y) - 0.06) / fw.y, 0.0, 1.0));
  col = mix(col, haBac(col), vua * step(0.14, L) * 0.9 * (1.0 - uBongT));
  float yM = P.y - (uCuaC.y - uCuaH.y);
  vec3 cq = mix(K_DO, K_DOCHIM, rutTham(smoothstep(uCuaH.y * 2.0 - 0.3, uCuaH.y * 2.0 + 0.3, yM), r3, 0.6));
  cq = mix(cq, K_HONG, rutTham(1.0 - smoothstep(0.0, 0.5, yM), r4, 0.6) * (1.0 - smoothstep(0.075, 0.225, abs(P.x - uCuaC.x))));
  col = mix(col, cq, trong);
  col = mix(col, K_DOCHIM, khung);
  ${HAT_CUOI}
}`;

const FRAG_LUONG = `
${COMMON}
${PAL}
${ENV}
varying vec3 vW; varying vec2 vUv; varying float vZ;
uniform float uR0, uPhan;
void main() {
  ${HAT}
  float y = vUv.y;
  float rad = mix(uLampR * 0.92, uR0, y);
  float x = abs(vUv.x - 0.5) * 2.0 * uLampR * 0.95;
  float trong = clamp((rad - x) / max(fwidth(x), 1e-5) + 0.5, 0.0, 1.0);
  float d = trong * (0.6 + 0.4 * smoothstep(0.0, 0.35, y)) * (1.0 - smoothstep(0.9, 0.99, y));
  if (rutTham(clamp(d * (1.0 - 0.7 * uPhan), 0.0, 1.0), r1, 0.6) < 0.5) discard;
  vec3 col = uPhan > 0.5 ? K_SANG : K_DEM;
  if (hash13(cel + 5.0) > 0.988 - 0.02 * y) col = K_SANG;
  ${HAT_CUOI}
}`;

const FRAG_NEON = `
${COMMON}
${PAL}
${ENV}
varying vec3 vW; varying vec2 vUv; varying float vZ;
uniform sampler2D uTex;
void main() {
  if (uGb > 0.5) { gl_FragColor = vec4(0.5, 0.5, vZ, 22.0); return; }
  ${HAT}
  vec4 t = texture2D(uTex, vUv);
  vec3 col = K_MUC;
  col = mix(col, K_DOCHIM, rutTham(clamp(t.g * 1.4, 0.0, 1.0), r1, 0.65));
  col = mix(col, K_DOCHIM, step(0.5, t.b));
  col = mix(col, K_DO, step(0.35, t.r));
  col = mix(col, K_HONG, step(0.8, t.r));
  ${HAT_CUOI}
}`;

const FRAG_KINH = `
${COMMON}
${PAL}
${ENV}
varying vec3 vW; varying vec2 vUv; varying float vZ;
void main() {
  if (uGb > 0.5) { gl_FragColor = vec4(0.5, 0.5, vZ, 30.0); return; }
  ${HAT}
  vec3 col = K_GIAY;
  float fx = fract(vUv.x * 6.0);
  if (fx < 0.07 || fx > 0.93 || vUv.y < 0.08 || vUv.y > 0.92) col = K_MUC;
  else if (vUv.y < 0.35) col = mix(K_GIAY, K_SANG, rutTham(1.0 - vUv.y / 0.35, r1, 0.6));
  ${HAT_CUOI}
}`;

const VERT_PHIM = `
varying vec3 vW; varying vec2 vUv; varying float vZ; varying vec3 vN;
void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal);
  vec4 vp = viewMatrix * wp; vZ = -vp.z; gl_Position = projectionMatrix * vp; }`;
const FRAG_PHIM = `
${COMMON}
${PAL}
${ENV}
varying vec3 vW; varying vec2 vUv; varying float vZ; varying vec3 vN;
uniform vec3 uTam, uHuong;
uniform sampler2D uPic; uniform float uCoPic, uSang;
uniform float uBong, uUot;
void main() {
  if (vW.y < 0.0) discard;
  if (uGb > 0.5) { gl_FragColor = vec4(0.5, 0.5, vZ, 9.0); return; }
  ${HAT}
  { float ppc = (1.0 / 43.0) / max(fwidth(vUv.x), 1e-6);
    float lod = clamp(log2(ppc / 3.0), 0.0, 3.0), L0 = floor(lod);
    float L = L0 + step(hash13(vec3(floor(vUv * vec2(43.0, 24.0) * exp2(L0 + 1.0)), 5.0 + L0)), lod - L0);
    vec3 cu = vec3(floor(vUv * vec2(43.0, 24.0) * exp2(L)), 7.0 + 11.0 * L); cel = cu; r1 = hash13(cu); r2 = hash13(cu + 17.31); r3 = hash13(cu + 41.7); r4 = hash13(cu + 73.1); }
  vec2 q = vUv * 2.0 - 1.0;
  float pxX = max(fwidth(q.x), 1e-5), pxY = max(fwidth(q.y), 1e-5);
  float ax = abs(q.x), ay = abs(q.y);
  vec3 col = K_DOCHIM;
  if (uCoPic > 0.5 && uBong < 0.5 && ax < 0.62 && ay < 0.86) {
    float ppc2 = (1.0 / 43.0) / max(fwidth(vUv.x), 1e-6);
    if (r3 < smoothstep(4.0, 9.0, ppc2)) {
      float t = texture2D(uPic, vec2((q.x + 0.62) / 1.24, (q.y + 0.86) / 1.72)).r;
      float x = pow(t, 1.1) * 3.3 * uSang;
      float b = min(3.0, floor(x) + rutTham(fract(x), r1, 0.55));
      col = b < 0.5 ? K_MUC : b < 1.5 ? K_DOCHIM : b < 2.5 ? K_DO : K_HONG;
    }
  }
  float fh = fract((q.y * 0.5 + 0.5) * 4.0);
  float lo = step(0.71, ax) * step(ax, 0.89) * step(0.27, fh) * step(fh, 0.73);
  float wCua = clamp(0.5 + dot(vW - uTam, uHuong) / 0.024, 0.0, 1.0);
  float laCua = step(hash13(cel + 5.3), wCua);
  float mepCua = step(0.64, ax) * laCua * (1.0 - uBong);
  col = mix(col, uSang > hash13(cel + 9.1) * 0.6 + 0.4 ? K_DO : K_DOCHIM, mepCua * (1.0 - lo));
  col = mix(col, K_MUC, lo);
  float mo = step(r1, 0.55);
  if (ax < 0.62 && ay > 0.86) col = mix(col, K_MUC, mo);
  if (abs(ax - 0.62) / pxX < 0.5) col = mix(col, K_MUC, mo);
  float bong = step(abs(ax - 0.38) / pxX, 0.55) * laCua * step(0.05, q.y);
  col = mix(col, K_HONG, bong * step(r2, 0.85) * (1.0 - uBong));
  if (!gl_FrontFacing) col = mix(K_MUC, col, step(0.5, r4));
  float satNuoc = 1.0 - step(0.002, vW.y);
  float mepX = (1.0 - ax) / pxX, mepY = (1.0 - ay) / pxY;
  if (uBong > 0.5) {
    col = K_MUC;
    if (mepX < 1.4 && laCua > 0.5) col = mix(K_MUC, K_DOCHIM, step(0.4, r2));
  } else {
    if (mepX < 1.5 && laCua > 0.5) col = mix(col, K_HONG, step(0.7, r2));
    if (mepY < 1.3) col = mix(col, K_DO, step(r3, 0.85));
    col = mix(col, K_DEM, satNuoc * step(r4, 0.8));
    float tuyen = 0.7 - 1.3 * (q.y * 0.5 + 0.5);
    float vet = step(abs(q.x - tuyen) / pxX, 0.65) * step(0.15, q.y * 0.5 + 0.5) * step(q.y * 0.5 + 0.5, 0.9);
    col = mix(col, K_HONG, vet * uUot * (1.0 - lo) * step(r3, 0.9) * laCua);
  }
  ${HAT_CUOI}
}`;

const VERT_MUA = `
attribute vec3 aP; attribute float aL; attribute float aS;
uniform vec3 uGio; uniform vec2 uRes; uniform float uRong, uT, uY0, uY1, uZMax;
varying vec3 vW; varying float vS; varying float vT;
void main() {
  float tq = floor(uT * 12.0) / 12.0;
  vec3 A = aP; A.y = uY0 + mod(aP.y - uY0 - tq * 6.5 * (0.85 + 0.3 * aS), uY1 - uY0);
  A.xz -= uGio.xz / uGio.y * (A.y - aP.y);
  vec3 B = A + uGio * aL;
  if (A.z > uZMax) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vW = A; vS = aS; vT = 0.0; return; }
  vec4 ca = projectionMatrix * viewMatrix * vec4(A, 1.0), cb = projectionMatrix * viewMatrix * vec4(B, 1.0);
  vec2 sa = ca.xy / ca.w, sb = cb.xy / cb.w;
  vec2 dir = normalize((sb - sa) * uRes + 1e-6); vec2 nr = vec2(-dir.y, dir.x);
  vec4 c = mix(ca, cb, position.y);
  c.xy += nr * position.x * 2.0 * uRong / uRes * c.w;
  vW = mix(A, B, position.y); vS = aS; vT = position.y;
  gl_Position = c;
}`;
const FRAG_MUA = `
${COMMON}
${PAL}
${ENV}
uniform sampler2D uDepth; uniform vec2 uRes; uniform float uWallZ;
uniform vec4 uChu[8];
varying vec3 vW; varying float vS; varying float vT;
void main() {
  float sd = texture2D(uDepth, gl_FragCoord.xy / uRes).r;
  if (gl_FragCoord.z > sd + 1e-6) discard;
  float a = 0.0; vec3 col = K_GIAY;
  vec3 d = vW - uLampP;
  if (d.y < 0.0) {
    float h = -d.y / uLampP.y; float rad = mix(0.15, uLampR * 0.92, h);
    float rr = length(d.xz) / rad;
    float k = 1.0 - smoothstep(0.55, 1.0, rr);
    if (k > a) { a = k; col = rr < 0.5 ? K_GIAY : K_SANG; }
  }
  vec2 q = abs(vW.xy - uCuaC.xy) - uCuaH - vec2(0.15, 0.0);
  float k2 = (1.0 - smoothstep(0.0, 0.25, max(q.x, q.y))) * smoothstep(uWallZ + 3.0, uWallZ + 0.3, vW.z);
  if (k2 > a) { a = k2; col = K_HONG; }
  if (a < 0.05 && vS < 0.34) {
    bool trongChu = false;
    for (int i = 0; i < 8; i++) { vec4 r = uChu[i]; if (gl_FragCoord.x > r.x && gl_FragCoord.x < r.z && gl_FragCoord.y > r.y && gl_FragCoord.y < r.w) trongChu = true; }
    if (!trongChu) { a = 0.42; col = K_DEM; }
  }
  a *= smoothstep(0.0, 0.15, vT) * (1.0 - smoothstep(0.85, 1.0, vT));
  if (rutTham(a, hash13(vec3(floor(gl_FragCoord.xy), vS * 91.0)), 0.75) < 0.5) discard;
  gl_FragColor = vec4(col, 1.0);
}`;

export const PHO = {
  WALL_Z: -2.2,
  NGUOI: { pos: [0.75, 0, 0], rotY: -70 },
  CUA: { c: [0.92, 1.33, -2.2], h: [0.6, 1.33] },
  DEN: { pos: [3.45, 0, -0.55], R: 1.55 },
  NEON: { c: [0.92, 3.11, -2.1], h: [0.95, 0.39], x0: 0.92 },
  VUNG: [[0.3, 2.7, 3.2, 3.1], [3.2, 4.4, 0.9, 0.5], [3.1, 0.7, 1.4, 1.7]],
  VET: { tu: [0.35, -0.35], toi: [-2.6, -1.55], n: 8 },
  CAM: { pos: [0.05, 0.34, 5.6] },
  DAP: [0.0, 0.0, 1.1],
  DAP_UNG: [[0, 1.1], [-12, 1.1], [12, 1.05], [-25, 1.1], [25, 1.0], [0, 0.9], [-38, 1.05], [38, 0.95], [-50, 1.0], [50, 0.9], [0, 0.75], [-60, 0.9], [62, 0.85], [-75, 0.85], [75, 0.8]],
  GIO: [-0.62, 0.78],
  LANTERN_Y: 3.75,
};

export function taoBienTex(font) {
  const N = PHO.NEON, PXM = 1000;
  const cw = Math.round(N.h[0] * 2 * PXM), ch = Math.round(N.h[1] * 2 * PXM);
  const lop = (ve) => { const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d'); x.lineJoin = 'round'; ve(x); return c; };
  const bbH = font.getPath('H', 0, 0, 200).getBoundingBox();
  const DONG = [
    { chu: 'HOTEL', cap: 400, cy: 280, x: (i) => cw * (0.115 + 0.77 * i / 4), rong: { T: 1.25, L: 1.12 } },
    { chu: 'VACANCY', cap: 165, cy: 648, x: (i) => cw * (0.255 + 0.49 * i / 6), rong: {} },
  ];
  const moiChu = (x, f, chiDong = null) => {
    DONG.forEach((d, di) => { if (chiDong !== null && di !== chiDong) return;
      const coK = d.cap / (bbH.y2 - bbH.y1);
      d.chu.split('').forEach((c, i) => {
        const p = font.getPath(c, 0, 0, 200 * coK), bb = p.getBoundingBox(), kx = d.rong[c] || 1;
        x.save(); x.translate(d.x(i), d.cy); x.scale(kx, 1); x.translate(-(bb.x1 + bb.x2) / 2, -(bb.y1 + bb.y2) / 2);
        f(new Path2D(p.toPathData(3)), kx, di); x.restore();
      });
    });
  };
  const to = (dong) => lop((x) => { x.fillStyle = '#fff'; moiChu(x, (p) => x.fill(p), dong); });
  const vien = (w, dong) => lop((x) => { x.strokeStyle = '#fff'; moiChu(x, (p, kx) => { x.lineWidth = w / kx; x.stroke(p); }, dong); });
  const O = 11, T1 = 19, TI = 10;
  const gH = to(0), sO = vien(2 * O, 0), sOT = vien(2 * (O + T1), 0), sTI = vien(2 * TI, 0);
  const sV = vien(13, 1), gV = to(1);
  const quang = lop((x) => { x.fillStyle = '#fff'; x.filter = 'blur(96px)'; moiChu(x, (p) => x.fill(p), 0); x.filter = 'blur(40px)'; moiChu(x, (p) => x.fill(p), 1); });
  const get = (c) => c.getContext('2d').getImageData(0, 0, cw, ch).data;
  const [G0, SO, SOT, STI, SV, GV, Q] = [gH, sO, sOT, sTI, sV, gV, quang].map(get);
  const data = new Uint8Array(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = (y * cw + x) * 4 + 3, k = ((ch - 1 - y) * cw + x) * 4;
    const g = G0[i];
    const ngoai = Math.min(SOT[i], 255 - SO[i], 255 - g), trong = Math.min(g, STI[i]);
    const khe = Math.min(SO[i], 255 - g), long = Math.min(g, 255 - STI[i]);
    const ong = Math.max(ngoai, trong, SV[i]);
    data[k] = ong; data[k + 1] = Math.min(255, Q[i] * 2.6 + GV[i] * 0.5);
    data[k + 2] = Math.max(long, Math.min(GV[i], 255 - SV[i]), khe * 0.5); data[k + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, cw, ch, THREE.RGBAFormat); tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 4; tex.needsUpdate = true;
  return tex;
}

export async function makePho(o) {
  const { renderer, lay } = o;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(...PHO.CAM.pos);
  camera.rotation.order = 'YXZ';
  const shared = makeShared();
  const AN_PHAN_CHIEU = [];
  const envU = {
    uCellK: { value: 0.001 }, uGb: { value: 0 },
    uLampP: { value: new THREE.Vector3() }, uLampR: { value: PHO.DEN.R },
    uCuaC: { value: new THREE.Vector3(...PHO.CUA.c) }, uCuaH: { value: new THREE.Vector2(...PHO.CUA.h) },
    uNeonC: { value: new THREE.Vector3(...PHO.NEON.c) }, uNeonH: { value: new THREE.Vector2(...PHO.NEON.h) },
    uRedVP: shared.uRedVP, uRedDepth: shared.uRedDepth,
  };
  const vatLieu = (frag, extra = {}, side = THREE.FrontSide) => {
    const m = new THREE.ShaderMaterial({ vertexShader: VERT_W, fragmentShader: frag, uniforms: { ...envU, ...extra }, side });
    m.extensions = { derivatives: true };
    return m;
  };
  const gbOf = (m) => { const g = m.clone(); g.uniforms = { ...m.uniforms, uGb: { value: 1 } }; g.extensions = { derivatives: true }; return g; };

  const [glbBuf, meta] = await Promise.all([lay('./model/dan-ba.glb', 'buf'), lay('./model/dan-ba.json', 'json')]);
  const gltf = await new GLTFLoader().parseAsync(glbBuf, './model/');
  const fig = new THREE.Group();
  fig.position.set(...PHO.NGUOI.pos);
  fig.rotation.y = THREE.MathUtils.degToRad(PHO.NGUOI.rotY);
  fig.add(gltf.scene); scene.add(fig); fig.updateMatrixWorld(true);
  const MATS = {
    Nguoi: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.5, gw1: 12, high2: 0, rimThr: 0.06, speck: 0.01 },
    Ao: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.45, gw1: 16, th2: 0.93, high2: 1, rimThr: 0.07, speck: 0.03 },
    VatAo: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.45, gw1: 16, th2: 0.93, high2: 1, rimThr: 0.07, speck: 0.03, side: THREE.DoubleSide, lay: 0.012, layTu: 0.95 },
    Dai: { dark: C.muc, mid: C.muc, high: C.chamDem, th1: 0.6, high2: 0, rimThr: 0.05, speck: 0.0, lay: 0.01, layTu: 0.95 },
    CoAo: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.35, gw1: 14, th2: 0.9, high2: 1, rimThr: 0.05, speck: 0.03, side: THREE.DoubleSide },
    Tui: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.4, high2: 0, rimThr: 0.03, speck: 0.02, side: THREE.DoubleSide },
    Mu: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.3, gw1: 14, th2: 0.86, high2: 1, rimThr: 0.05, speck: 0.03, side: THREE.DoubleSide },
    BangMu: { dark: C.muc, mid: C.muc, high: C.chamDem, th1: 0.95, high2: 0, speck: 0.0 },
    Toc: { dark: C.muc, mid: C.muc, high: C.chamDem, th1: 0.6, high2: 0, rimThr: 0.04 },
    Giay: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.5, th2: 0.9, high2: 1, rimThr: 0.03, speck: 0.0 },
    Gang: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.55, gw1: 10, th2: 0.9, high2: 1, rimThr: 0.03, speck: 0.0 },
    Got: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.5, th2: 0.9, high2: 1, rimThr: 0.03, speck: 0.0 },
    Cot: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.55, gw1: 10, th2: 0.9, high2: 1, rimThr: 0.15, speck: 0.01 },
  };
  const mats = {};
  for (const [k, p] of Object.entries(MATS)) { mats[k] = makeMaterial(shared, { headOn: 0, rim: C.do, ...p }); mats[k].uniforms.kRed.value = 0; mats[k].uniforms.kFace.value = 0; }
  const NGUOI_MESH = [];
  gltf.scene.traverse((m) => {
    if (!m.isMesh) return;
    const key = Object.keys(MATS).find((k) => m.name === k || m.name.startsWith(k + '_') || m.name.startsWith(k + '.')) || 'Ao';
    m.material = mats[key]; m.userData.key = key;
    m.layers.enable(1); m.layers.enable(2);
    NGUOI_MESH.push(m);
  });
  const figBox = new THREE.Box3().setFromObject(gltf.scene);
  const figCenter = figBox.getCenter(new THREE.Vector3());
  const figRadius = figBox.getSize(new THREE.Vector3()).length() / 2;
  const toWorld = (a) => new THREE.Vector3(...a).applyMatrix4(gltf.scene.matrixWorld);
  const dirWorld = (a) => new THREE.Vector3(...a).transformDirection(gltf.scene.matrixWorld);

  const den = new THREE.Group();
  {
    const part = (g, y) => { const m = new THREE.Mesh(g, mats.Cot); m.position.y = y; m.layers.enable(1); den.add(m); return m; };
    part(new THREE.CylinderGeometry(0.11, 0.15, 0.55, 12), 0.275);
    part(new THREE.CylinderGeometry(0.075, 0.09, 0.1, 12), 0.6);
    part(new THREE.CylinderGeometry(0.045, 0.06, 2.95, 12), 2.05);
    const bar = part(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 6), 3.32); bar.rotation.z = Math.PI / 2;
    part(new THREE.CylinderGeometry(0.06, 0.04, 0.12, 6), 3.5);
    const kinh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.36, 6, 1, true), vatLieu(FRAG_KINH, {}, THREE.DoubleSide));
    kinh.position.y = PHO.LANTERN_Y; kinh.layers.enable(1); den.add(kinh);
    part(new THREE.CylinderGeometry(0.03, 0.22, 0.16, 6), PHO.LANTERN_Y + 0.26);
  }
  den.position.set(...PHO.DEN.pos);
  scene.add(den);
  const lampP = new THREE.Vector3(...PHO.DEN.pos).add(new THREE.Vector3(0, PHO.LANTERN_Y - 0.05, 0));
  envU.uLampP.value.copy(lampP);
  const luongM = vatLieu(FRAG_LUONG, { uR0: { value: 0.15 }, uPhan: { value: 0 } }, THREE.DoubleSide);
  luongM.transparent = true; luongM.blending = THREE.NoBlending; luongM.depthWrite = false;
  const luongG = new THREE.PlaneGeometry(PHO.DEN.R * 2 * 0.95, PHO.LANTERN_Y - 0.1); luongG.translate(0, (PHO.LANTERN_Y - 0.1) / 2, 0);
  const luong = new THREE.Mesh(luongG, luongM);
  luong.position.set(lampP.x, 0, lampP.z); luong.lookAt(camera.position.x, 0, camera.position.z); luong.renderOrder = 5;
  scene.add(luong);

  const tuongM = vatLieu(FRAG_TUONG, { uLampWall: { value: 3.0 }, uBongT: { value: 0 } });
  const tuong = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), tuongM);
  tuong.position.set(0, 7, PHO.WALL_Z); tuong.layers.enable(1); scene.add(tuong);
  const vungL = PHO.VUNG.map((p) => new THREE.Vector4(...p)); while (vungL.length < 4) vungL.push(new THREE.Vector4());
  const vetL = [];
  { const { tu, toi, n } = PHO.VET; const ang = Math.atan2(toi[0] - tu[0], toi[1] - tu[1]);
    for (let i = 0; i < n; i++) { const t = i / (n - 1), s = i % 2 ? 1 : -1;
      vetL.push(new THREE.Vector4(tu[0] + (toi[0] - tu[0]) * t + Math.cos(ang) * 0.09 * s, tu[1] + (toi[1] - tu[1]) * t - Math.sin(ang) * 0.09 * s, -ang, 1)); } }
  while (vetL.length < 12) vetL.push(new THREE.Vector4(0, 0, 0, -1));
  const datU = {
    uPud: { value: vungL }, uNPud: { value: PHO.VUNG.length }, uVet: { value: vetL }, uNVet: { value: PHO.VET.n },
    uUseRefl: { value: 0 }, uRefl: { value: null }, uReflMat: { value: new THREE.Matrix4() },
    uPhimN: { value: new THREE.Vector4() }, uGon: { value: new THREE.Vector4() }, uGonCam: { value: new THREE.Vector4(1, 0, -1, 0) }, uVo: { value: new THREE.Vector4() }, uPxUv: { value: new THREE.Vector3(1 / 1920, 1 / 1080, 1) }, uT: { value: 0 }, uMua: { value: 1 }, uWallZ: { value: PHO.WALL_Z },
    uNeonTex: { value: null }, uNeonM: { value: 0.005 }, uBienCat: { value: PHO.NEON.c[1] + 0.15 },
    uLe: { value: new THREE.Vector4(-1, 0.1, 0, 0) },
  };
  const datM = vatLieu(FRAG_DAT, datU);
  const dat = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), datM);
  dat.rotation.x = -Math.PI / 2; dat.layers.enable(1); scene.add(dat);

  const neon = (() => {
    const N = PHO.NEON, tex = o.bienTex || taoBienTex(o.font);
    const hop = new THREE.Mesh(new THREE.BoxGeometry(N.h[0] * 2, N.h[1] * 2, 0.1), mats.Cot);
    hop.position.set(N.c[0], N.c[1], N.c[2] - 0.055); hop.layers.enable(1); scene.add(hop);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(N.h[0] * 2, N.h[1] * 2), vatLieu(FRAG_NEON, { uTex: { value: tex } }));
    mat.position.set(N.c[0], N.c[1], N.c[2]); scene.add(mat);
    AN_PHAN_CHIEU.push(hop, mat);
    return { hop, mat, tex };
  })();

  datU.uNeonTex.value = neon.tex;
  let bienG = null;
  const PHIM_W = 0.16, PHIM_L = 0.16 * 19 / 35;
  const phimM = new THREE.ShaderMaterial({ vertexShader: VERT_PHIM, fragmentShader: FRAG_PHIM, side: THREE.DoubleSide,
    uniforms: { ...envU, uTam: { value: new THREE.Vector3() }, uHuong: { value: new THREE.Vector3(1, 0, 0) }, uBong: { value: 0 }, uUot: { value: 0 }, uPic: { value: null }, uCoPic: { value: 0 }, uSang: { value: 1 } } });
  phimM.extensions = { derivatives: true };
  const phimG = new THREE.PlaneGeometry(PHIM_W, PHIM_L, 16, 10);
  { const a = phimG.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const yn = a.getY(i) / (PHIM_L / 2), xn = a.getX(i) / (PHIM_W / 2);
      a.setZ(i, 0.009 * xn * xn + 0.006 * Math.pow(Math.max(0, yn), 2) - 0.002 * yn);
    }
    phimG.computeVertexNormals(); }
  const phim = new THREE.Mesh(phimG, phimM);
  phim.layers.enable(1); phim.layers.enable(5);
  scene.add(phim);
  const PHIM_MAU = []; { const a = phimG.attributes.position; for (let i = 0; i < a.count; i++) PHIM_MAU.push(new THREE.Vector3().fromBufferAttribute(a, i)); }
  const _v = new THREE.Vector3();
  function nhacKhoiNuoc(yMin = 0.003) {
    phim.updateMatrix();
    let m = 1e9; for (const p of PHIM_MAU) { _v.copy(p).applyMatrix4(phim.matrix); m = Math.min(m, _v.y); }
    if (m < yMin) phim.position.y += yMin - m;
  }
  const TUI = { c: toWorld(meta.tui.c), n: dirWorld(meta.tui.n).setY(0).normalize() };
  const ROI = { t0: 0.35, T: 2.9 };
  const UPW = new THREE.Vector3(0, 1, 0);
  const tg = UPW.clone().cross(TUI.n).normalize();
  const P0 = TUI.c.clone().addScaledVector(TUI.n, 0.08).addScaledVector(UPW, -PHIM_L / 2);
  const qStart = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tg, UPW, TUI.n));
  const DAP = new THREE.Vector3(...PHO.DAP);
  const qDap = new THREE.Quaternion();
  function datTuTheDap() {
    const toCam = camera.position.clone().sub(DAP).setY(0).normalize();
    const phaiM = new THREE.Vector3(toCam.z, 0, -toCam.x);
    const Lh = phaiM.clone().applyAxisAngle(UPW, THREE.MathUtils.degToRad(14)).normalize();
    const Ld = Lh.clone().addScaledVector(UPW, Math.tan(THREE.MathUtils.degToRad(6))).normalize();
    const ro = THREE.MathUtils.degToRad(45);
    const toCamV = UPW.clone().cross(Lh).normalize(); if (toCamV.dot(toCam) < 0) toCamV.negate();
    const Nf = toCamV.multiplyScalar(Math.sin(ro)).addScaledVector(UPW, Math.cos(ro));
    Nf.addScaledVector(Ld, -Nf.dot(Ld)).normalize();
    const Dd = Nf.clone().cross(Ld).normalize();
    qDap.setFromRotationMatrix(new THREE.Matrix4().makeBasis(Ld, Dd, Nf));
  }
  datTuTheDap();
  const CHIM = 0.003;
  const _q4 = new THREE.Matrix4();
  function yDap() { _q4.makeRotationFromQuaternion(qDap); let m = 1e9; for (const p of PHIM_MAU) m = Math.min(m, _v.copy(p).applyMatrix4(_q4).y); return 0.003 - m - CHIM; }
  function mepTren() {
    phimM.uniforms.uTam.value.copy(phim.position);
    const h = phimM.uniforms.uHuong.value.set(PHO.CUA.c[0] - phim.position.x, 0, PHO.WALL_Z - phim.position.z);
    h.normalize(); h.multiplyScalar(0.9).add(new THREE.Vector3(1, 0, 0).multiplyScalar(0.1)).normalize();
  }
  const NHIP = 2.4;
  function phimAt(s) {
    const k = Math.min(1, Math.max(0, (s - ROI.t0) / ROI.T));
    datU.uPhimN.value.z = 0; phimM.uniforms.uUot.value = 0;
    if (s < ROI.t0) { phim.visible = false; return { k: 0, dap: -1 }; }
    phim.visible = true;
    if (k < 1) {
      const ra = Math.min(1, k / 0.18), raE = ra * ra * (3 - 2 * ra);
      const g = 0.45 * k + 0.55 * k * k * (3 - 2 * k);
      const dir = DAP.clone().sub(P0).setY(0); const dl = dir.length(); dir.normalize();
      const sw = new THREE.Vector3(-dir.z, 0, dir.x);
      const p = P0.clone().lerp(DAP, g).addScaledVector(TUI.n, 0.1 * raE * (1 - g));
      const f = k < 0.85 ? (0.3 * k * k + 0.7 * k) / (0.3 * 0.85 * 0.85 + 0.7 * 0.85) * 0.9 : 0.9 + 0.1 * (1 - Math.pow(1 - (k - 0.85) / 0.15, 2));
      p.y = P0.y + (DAP.y - P0.y) * f;
      const ph = k * NHIP * Math.PI * 2, bien = 0.075 * Math.pow(Math.sin(Math.PI * Math.min(1, k * 1.05)), 0.7) * Math.min(1, dl / 0.6);
      p.addScaledVector(sw, Math.sin(ph) * bien);
      p.y += 0.018 * Math.cos(ph * 2) * bien / 0.075 * (1 - k);
      phim.position.copy(p);
      const lat = THREE.MathUtils.smoothstep(k, 0, 0.4);
      const lon = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.25 * lat + Math.sin(ph + 0.6) * 0.18 * (1 - k), 0.9 * k, Math.cos(ph) * 0.55 * Math.sin(Math.PI * k) * raE));
      phim.quaternion.copy(qStart.clone().multiply(lon).slerp(qDap, Math.pow(k, 2.6)));
      nhacKhoiNuoc(0.004);
      mepTren();
      return { k, dap: -1 };
    }
    const sd = s - ROI.t0 - ROI.T;
    phim.position.copy(DAP); phim.quaternion.copy(qDap);
    phim.position.y = yDap() + CHIM * Math.exp(-sd / 0.4) + 0.0025 * Math.sin(sd * 2.2) * Math.exp(-sd * 0.8);
    mepTren();
    phimM.uniforms.uUot.value = Math.min(1, sd / 0.6);
    phim.updateMatrixWorld();
    _v.set(0, -PHIM_L / 2 + 0.01, 0).applyMatrix4(phim.matrixWorld); datU.uPhimN.value.set(_v.x, _v.z, 1, sd);
    return { k: 1, dap: sd };
  }

  const Lfill = lampP.clone().sub(figCenter).normalize();
  const cuaP = new THREE.Vector3(PHO.CUA.c[0], 1.0, PHO.WALL_Z);
  const Lred = cuaP.clone().sub(figCenter).normalize();
  shared.uLfill.value.copy(Lfill); shared.uLred.value.copy(Lred);
  shared.uLface.value.copy(camera.position.clone().sub(figCenter).normalize());
  shared.uSang.value = 1; shared.uSangCua.value = 1; shared.uNhen.value = 1; shared.uEmberI.value = 0; shared.uHeadI.value = 0;
  shared.uGioDir.value.set(-0.8, 0, 0.6).normalize();
  const mkSh = (size) => { const rt = new THREE.WebGLRenderTarget(size, size, { depthTexture: new THREE.DepthTexture(size, size), depthBuffer: true }); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 12); cam.layers.set(2); return { rt, cam }; };
  const fitOrtho = (sh, L, r) => {
    sh.cam.position.copy(figCenter).addScaledVector(L, 4); sh.cam.lookAt(figCenter);
    sh.cam.left = -r; sh.cam.right = r; sh.cam.top = r; sh.cam.bottom = -r; sh.cam.near = 4 - r * 1.5; sh.cam.far = 4 + r * 1.5;
    sh.cam.updateProjectionMatrix(); sh.cam.updateMatrixWorld();
    return new THREE.Matrix4().multiplyMatrices(sh.cam.projectionMatrix, sh.cam.matrixWorldInverse);
  };
  let SHN = o.low ? 1024 : 2048;
  let shFill = mkSh(SHN), shRed = mkSh(SHN);
  const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  const renderDepth = (sh) => { scene.overrideMaterial = depthOnly; renderer.setRenderTarget(sh.rt); renderer.clear(); renderer.render(scene, sh.cam); renderer.setRenderTarget(null); scene.overrideMaterial = null; };
  function datBong() {
    shared.uFillVP.value.copy(fitOrtho(shFill, Lfill, figRadius * 1.05)); shared.uFillDepth.value = shFill.rt.depthTexture;
    shared.uRedVP.value.copy(fitOrtho(shRed, Lred, 2.4)); shared.uRedDepth.value = shRed.rt.depthTexture;
    shared.uFillTexel.value = 1 / SHN; shared.uHeadTexel.value = 1 / SHN;
    phim.visible = false; luong.visible = false;
    renderDepth(shFill); renderDepth(shRed);
    luong.visible = true;
  }

  const mua = (() => {
    const N = 3600;
    const base = new THREE.PlaneGeometry(1, 1); base.translate(0, 0.5, 0);
    const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.attributes.position = base.attributes.position;
    const aP = new Float32Array(N * 3), aL = new Float32Array(N), aS = new Float32Array(N);
    let sd = 7; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) { aP[i * 3] = -6 + 12 * rnd(); aP[i * 3 + 1] = 6.5 * rnd(); aP[i * 3 + 2] = PHO.WALL_Z + 0.15 + (PHO.CAM.pos[2] - 1.0 - PHO.WALL_Z) * rnd(); aL[i] = [0.22, 0.38, 0.6][Math.floor(rnd() * 3)]; aS[i] = rnd(); }
    g.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 3)); g.setAttribute('aL', new THREE.InstancedBufferAttribute(aL, 1)); g.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 1));
    g.instanceCount = N;
    const m = new THREE.ShaderMaterial({ vertexShader: VERT_MUA, fragmentShader: FRAG_MUA,
      uniforms: { ...envU, uGio: { value: new THREE.Vector3(-0.36, -1, 0.06).normalize() }, uRes: { value: new THREE.Vector2(1, 1) }, uRong: { value: 1.5 }, uT: { value: 0 },
        uY0: { value: 0 }, uY1: { value: 6.5 }, uDepth: { value: null }, uWallZ: { value: PHO.WALL_Z }, uZMax: { value: 99 },
        uChu: { value: [0, 1, 2, 3, 4, 5, 6, 7].map(() => new THREE.Vector4(0, 0, -1, -1)) } },
      depthTest: true, depthWrite: false, side: THREE.DoubleSide });
    m.extensions = { derivatives: true };
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false;
    const sc = new THREE.Scene(); sc.add(mesh);
    return { sc, m, g, N };
  })();

  let W = 1, H = 1, camRT = null, reflRT = null, reflDepth = null, reflTinh = false, camTinh = false, reflCoPhim = false;
  const vcam = new THREE.PerspectiveCamera();
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  function datMayAo() {
    vcam.copy(camera);
    vcam.position.set(camera.position.x, -camera.position.y, camera.position.z);
    const tgt = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position); tgt.y = -tgt.y;
    vcam.up.set(0, 1, 0).applyQuaternion(camera.quaternion); vcam.up.y = -vcam.up.y;
    vcam.lookAt(tgt); vcam.updateMatrixWorld(); vcam.updateProjectionMatrix();
    datU.uReflMat.value.copy(bias).multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse);
  }
  let reflK = 1, reflMau = 4;
  const taoSau = (w, h) => new THREE.WebGLRenderTarget(w, h, { depthTexture: new THREE.DepthTexture(w, h), depthBuffer: true });
  const boSau = (rt) => { rt.depthTexture.dispose(); rt.dispose(); };
  function taoRefl(rw, rh) {
    if (reflRT) reflRT.dispose();
    reflRT = new THREE.WebGLRenderTarget(rw, rh, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, samples: reflMau });
    datU.uRefl.value = reflRT.texture;
  }
  const CSS = { w: 1, h: 1 };
  function datHat() {
    const perCss = (d) => (2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / CSS.h;
    const picPx = Math.max(1, Math.min(CSS.w, CSS.h * 2.1) / 1200);
    shared.uCell.value = perCss(camera.position.distanceTo(figCenter)) * picPx;
    envU.uCellK.value = perCss(1) * picPx;
  }
  function resize(w, h, cssW, cssH) {
    W = w; H = h;
    camera.aspect = cssW / cssH; camera.updateProjectionMatrix();
    if (!camRT || camRT.width !== W || camRT.height !== H) { const cu = camRT; camRT = taoSau(W, H); shared.uCamDepth.value = camRT.depthTexture; if (cu) boSau(cu); }
    const rw = Math.max(64, Math.round(W * reflK)), rh = Math.max(64, Math.round(H * reflK));
    if (!reflRT) {
      taoRefl(rw, rh);
      reflDepth = taoSau(rw, rh);
    } else { reflRT.setSize(rw, rh); if (reflDepth.width !== rw || reflDepth.height !== rh) { const cu = reflDepth; reflDepth = taoSau(rw, rh); boSau(cu); } }
    datU.uRefl.value = reflRT.texture; datU.uUseRefl.value = 1;
    datU.uPxUv.value.set(1 / cssW, 1 / cssH, Math.min(1.4, Math.max(0.7, cssH / 1080)));
    shared.uRes.value.set(W, H); shared.uNear.value = camera.near; shared.uFar.value = camera.far;
    const dpr = W / cssW;
    shared.uRimW.value = Math.max(3, 5.2 * (cssH / 920)) * dpr;
    CSS.w = cssW; CSS.h = cssH;
    datHat();
    mua.m.uniforms.uRes.value.set(W, H); mua.m.uniforms.uRong.value = 1.5 * dpr; mua.m.uniforms.uDepth.value = camRT.depthTexture;
    camTinh = false; reflTinh = false;
  }
  function datMay(fx, fy, fov, lui = 0, camX = 0) {
    camera.position.set(PHO.CAM.pos[0] + camX, PHO.CAM.pos[1], PHO.CAM.pos[2] + lui);
    camera.near = 0.1; shared.uNear.value = 0.1;
    camera.fov = fov; camera.updateProjectionMatrix();
    const P = new THREE.Vector3(PHO.NGUOI.pos[0], 0.0, PHO.NGUOI.pos[2]);
    const w = P.clone().sub(camera.position).normalize();
    const ty = Math.tan(THREE.MathUtils.degToRad(fov / 2)), tx = ty * camera.aspect;
    const dc = new THREE.Vector3((fx * 2 - 1) * tx, (1 - fy * 2) * ty, -1).normalize();
    const R0 = Math.hypot(dc.y, dc.z), phi = Math.atan2(dc.z, dc.y);
    const pitch = Math.acos(THREE.MathUtils.clamp(w.y / R0, -1, 1)) - phi;
    const p2 = [pitch, -Math.acos(THREE.MathUtils.clamp(w.y / R0, -1, 1)) - phi].sort((a, b) => Math.abs(a) - Math.abs(b))[0];
    const d1y = dc.y * Math.cos(p2) - dc.z * Math.sin(p2), d1z = dc.y * Math.sin(p2) + dc.z * Math.cos(p2);
    const yaw = Math.atan2(w.x, w.z) - Math.atan2(dc.x, d1z);
    camera.rotation.set(p2, yaw, 0);
    camera.updateMatrixWorld(true);
    void d1y;
    luong.lookAt(camera.position.x, 0, camera.position.z);
    mua.m.uniforms.uZMax.value = camera.position.z - 0.9;
    shared.uLface.value.copy(camera.position.clone().sub(figCenter).normalize());
    const cr = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), cu = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    shared.uRimDir.value.set(Lred.dot(cr), Lred.dot(cu)).normalize();
    datMayAo();
    datHat();
    datNeonM();
    camTinh = false; reflTinh = false;
  }
  function dayMay(p) {
    camera.position.copy(p);
    const nr = Math.min(0.1, Math.max(0.004, p.y * 0.4));
    if (Math.abs(camera.near - nr) > 1e-5) { camera.near = nr; camera.updateProjectionMatrix(); shared.uNear.value = nr; }
    camera.updateMatrixWorld(true);
    luong.lookAt(camera.position.x, 0, camera.position.z);
    mua.m.uniforms.uZMax.value = camera.position.z - 0.9;
    shared.uLface.value.copy(camera.position.clone().sub(figCenter).normalize());
    datMayAo(); datNeonM();
    camTinh = false; reflTinh = false;
  }
  const man = (p, cssW, cssH) => { const s = p.clone().project(camera); return { x: (s.x * 0.5 + 0.5) * cssW, y: (0.5 - s.y * 0.5) * cssH, z: s.z }; };
  function datNeonM() {
    const N = PHO.NEON, a = man(new THREE.Vector3(N.c[0] - 0.5, -N.c[1], N.c[2]), CSS.w, CSS.h), b = man(new THREE.Vector3(N.c[0] + 0.5, -N.c[1], N.c[2]), CSS.w, CSS.h);
    const d = Math.hypot(b.x - a.x, b.y - a.y); datU.uNeonM.value = d > 1e-3 ? 1 / d : 0.005;
  }
  function datBien(cx) {
    PHO.NEON.c[0] = cx; envU.uNeonC.value.x = cx;
    neon.hop.position.x = cx; neon.mat.position.x = cx; if (bienG) bienG.position.x = cx;
    datNeonM(); reflTinh = false;
  }
  function hopBongBien(cssW, cssH) {
    const N = PHO.NEON, ps = [];
    for (const x of [N.c[0] - N.h[0], N.c[0] + N.h[0]]) for (const y of [N.c[1] - N.h[1], N.c[1] + N.h[1]]) ps.push(man(new THREE.Vector3(x, -y, N.c[2]), cssW, cssH));
    return [Math.min(...ps.map((p) => p.x)), Math.min(...ps.map((p) => p.y)), Math.max(...ps.map((p) => p.x)), Math.max(...ps.map((p) => p.y))];
  }
  const datDuoi = (x, y, cssW, cssH) => {
    const q = new THREE.Vector3(x / cssW * 2 - 1, 1 - y / cssH * 2, 0.5).unproject(camera);
    const d = q.sub(camera.position).normalize();
    if (d.y > -1e-4) return null;
    const t = -camera.position.y / d.y; return camera.position.clone().addScaledVector(d, t);
  };

  const GON = { tocDo: 0.45, het: 2.4, vo: 2.8 };
  let gonMax = 9, daDap = false;
  function capNhat(t, s) {
    shared.uGioT.value = t;
    datU.uT.value = t; mua.m.uniforms.uT.value = t;
    const f = phimAt(s);
    daDap = f.dap >= 0;
    if (f.dap >= 0) {
      const r = Math.min(gonMax, 0.03 + f.dap * GON.tocDo);
      const manh = Math.exp(-f.dap / 0.8) * (1 - Math.min(1, Math.max(0, (r - gonMax * 0.75) / (gonMax * 0.25))));
      datU.uGon.value.set(DAP.x, DAP.z, r, f.dap > GON.het ? 0 : manh);
      datU.uVo.value.set(DAP.x, DAP.z, f.dap, f.dap < GON.vo ? 1 : 0);
    } else { datU.uGon.value.set(DAP.x, DAP.z, 0, 0); datU.uVo.value.w = 0; }
    return f;
  }
  const trongVung = (x, z) => { let m = -1; for (const q of PHO.VUNG) m = Math.max(m, 1 - Math.hypot((x - q[0]) / q[2], (z - q[1]) / q[3])); return m; };
  const _m4 = new THREE.Matrix4();
  function hopPhimTai(x, z, cssW, cssH) {
    const giu = DAP.clone(); DAP.set(x, 0, z); datTuTheDap();
    _m4.compose(new THREE.Vector3(x, yDap(), z), qDap, new THREE.Vector3(1, 1, 1));
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, sau = false;
    for (const p of PHIM_MAU) { const q = man(p.clone().applyMatrix4(_m4), cssW, cssH); if (q.z > 1) sau = true; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    DAP.copy(giu); datTuTheDap();
    return sau ? null : [x0, y0, x1, y1];
  }
  let PHIM_HOP = null;
  function chonDap(hops, cssW, cssH, day, can = 100) {
    const gio = new THREE.Vector2(...PHO.GIO).normalize();
    const cua = [PHO.CUA.c[0] - PHO.CUA.h[0] - 0.1, PHO.CUA.c[0] + PHO.CUA.h[0] + 0.1];
    const xCua = [cua[0], cua[1]].map((x) => man(new THREE.Vector3(x, 0, PHO.WALL_Z), cssW, cssH).x);
    const ung = [];
    const chanNg = (() => { const b = figBox, ps = []; for (const x of [b.min.x, b.max.x]) for (const y of [0, 0.6, -0.6]) for (const z of [b.min.z, b.max.z]) ps.push(man(new THREE.Vector3(x, y, z), cssW, cssH));
      return [Math.min(...ps.map((p) => p.x)), Math.min(...ps.map((p) => p.y)), Math.max(...ps.map((p) => p.x)), Math.max(...ps.map((p) => p.y))]; })();
    for (const [goc, r] of PHO.DAP_UNG) {
      const d2 = gio.clone().rotateAround(new THREE.Vector2(), THREE.MathUtils.degToRad(goc));
      const x = P0.x + d2.x * r, z = P0.z + d2.y * r;
      if (Math.hypot(x - P0.x, z - P0.z) > 1.15 || trongVung(x, z) < 0.22 || Math.hypot(x - PHO.NGUOI.pos[0], z - PHO.NGUOI.pos[2]) < 0.4) continue;
      const hb = hopPhimTai(x, z, cssW, cssH); if (!hb) continue;
      let d = Math.min(hb[0] - 24, cssW - 24 - hb[2], hb[1] - 24, cssH - day - 24 - hb[3]);
      for (const h of hops) { const dx = Math.max(h[0] - hb[2], 0, hb[0] - h[2]), dy = Math.max(h[1] - hb[3], 0, hb[1] - h[3]); d = Math.min(d, dx === 0 && dy === 0 ? -1 : Math.hypot(dx, dy)); }
      const toi = hb[2] > Math.min(...xCua) && hb[0] < Math.max(...xCua);
      const dNg = Math.hypot(Math.max(chanNg[0] - hb[2], 0, hb[0] - chanNg[2]), Math.max(chanNg[1] - hb[3], 0, hb[1] - chanNg[3]));
      ung.push({ x, z, hb, d, toi, xaNg: dNg >= 20 });
    }
    const tot = ung.find((u) => u.d >= can && !u.toi && u.xaNg) || ung.find((u) => u.d >= can && u.xaNg) || ung.filter((u) => u.xaNg).sort((a, b) => b.d - a.d)[0]
      || ung.find((u) => u.d >= can && !u.toi) || ung.find((u) => u.d >= can) || ung.slice().sort((a, b) => b.d - a.d)[0];
    DAP.set(tot.x, 0, tot.z); datTuTheDap();
    PHIM_HOP = tot.hb;
    return { x: tot.x, z: tot.z, d: Math.round(tot.d), toi: tot.toi, xaNg: tot.xaNg, hop: tot.hb.map(Math.round), xa: +Math.hypot(tot.x - P0.x, tot.z - P0.z).toFixed(3) };
  }
  function datChuMua(hops, cssH, dpr) {
    const u = mua.m.uniforms.uChu.value;
    for (let i = 0; i < 8; i++) { const h = hops[i]; if (!h) { u[i].set(0, 0, -1, -1); continue; } u[i].set((h[0] - 14) * dpr, (cssH - h[3] - 14) * dpr, (h[2] + 14) * dpr, (cssH - h[1] + 14) * dpr); }
  }
  function datVungChu(hop, cssW, cssH, them = []) {
    const pts = [[hop[0], hop[1]], [hop[2], hop[1]], [hop[0], hop[3]], [hop[2], hop[3]]].map(([x, y]) => datDuoi(x, y, cssW, cssH)).filter(Boolean);
    if (!pts.length) { datU.uGonCam.value.set(1, 0, -1, 0); gonMax = 9; return; }
    const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
    datU.uGonCam.value.set(Math.min(...xs) - 0.1, Math.min(...zs) - 0.1, Math.max(...xs) + 0.1, Math.max(...zs) + 0.1);
    let r = 0.2;
    for (; r < 3.5; r += 0.05) {
      let cham = false;
      for (let i = 0; i < 24 && !cham; i++) { const a = i / 24 * Math.PI * 2; const p = man(new THREE.Vector3(DAP.x + Math.cos(a) * r, 0, DAP.z + Math.sin(a) * r), cssW, cssH);
        if (p.z < 1) for (const h of [hop, ...them]) if (p.x > h[0] - 12 && p.x < h[2] + 12 && p.y > h[1] - 12 && p.y < h[3] + 12) cham = true; }
      if (cham) break;
    }
    gonMax = Math.max(0.3, r - 0.05);
  }

  function ve(dich, phanChieu = 'song') {
    if (!camTinh) {
      const cd = camera.clone(); cd.layers.set(1);
      const pv = phim.visible; phim.visible = false;
      scene.overrideMaterial = depthOnly; renderer.setRenderTarget(camRT); renderer.clear(); renderer.render(scene, cd); scene.overrideMaterial = null;
      phim.visible = pv; camTinh = true;
    }
    if (phanChieu === 'tinh' && reflTinh && reflCoPhim !== daDap) reflTinh = false;
    if (phanChieu === 'song' || !reflTinh) {
      dat.visible = false; luong.visible = true;
      const an = AN_PHAN_CHIEU.map((m) => [m, m.visible]); for (const [m] of an) m.visible = false;
      const phimV = phim.visible; if (phanChieu === 'tinh' && !daDap) phim.visible = false; reflCoPhim = daDap;
      const vd = vcam.clone(); vd.layers.set(1);
      scene.overrideMaterial = depthOnly; renderer.setRenderTarget(reflDepth); renderer.clear(); renderer.render(scene, vd); scene.overrideMaterial = null;
      const cuDepth = shared.uCamDepth.value, cuRes = shared.uRes.value.clone(), cuDir = shared.uRimDir.value.clone(), cuW = shared.uRimW.value;
      shared.uCamDepth.value = reflDepth.depthTexture; shared.uRes.value.set(reflRT.width, reflRT.height); shared.uRimW.value = cuW * reflK;
      const cr = new THREE.Vector3().setFromMatrixColumn(vcam.matrixWorld, 0), cu = new THREE.Vector3().setFromMatrixColumn(vcam.matrixWorld, 1);
      shared.uRimDir.value.set(Lred.dot(cr), Lred.dot(cu)).normalize();
      phimM.uniforms.uBong.value = 1; tuongM.uniforms.uBongT.value = 1; luongM.uniforms.uPhan.value = 1;
      renderer.setRenderTarget(reflRT); renderer.clear(); renderer.render(scene, vcam);
      phimM.uniforms.uBong.value = 0; tuongM.uniforms.uBongT.value = 0; luongM.uniforms.uPhan.value = 0;
      shared.uCamDepth.value = cuDepth; shared.uRes.value.copy(cuRes); shared.uRimDir.value.copy(cuDir); shared.uRimW.value = cuW;
      for (const [m, v] of an) m.visible = v;
      phim.visible = phimV;
      dat.visible = true;
      reflTinh = true;
    }
    renderer.setRenderTarget(dich);
    renderer.clear();
    renderer.render(scene, camera);
    const ac = renderer.autoClear; renderer.autoClear = false;
    renderer.render(mua.sc, camera);
    renderer.autoClear = ac;
  }
  const camPhim = new THREE.PerspectiveCamera();
  function datNac(nac, phan = '') {
    if (phan !== 'bong') {
      shared.uTaps.value = nac >= 1 ? 4 : 12;
      const k2 = [1, 0.75, 0.6, 0.5][Math.min(3, nac)], m2 = nac >= 1 ? 0 : 4;
      if (k2 !== reflK || m2 !== reflMau) { reflK = k2; reflMau = m2; if (reflRT) { taoRefl(Math.max(64, Math.round(W * reflK)), Math.max(64, Math.round(H * reflK))); if (reflDepth.width !== reflRT.width || reflDepth.height !== reflRT.height) { const cu = reflDepth; reflDepth = taoSau(reflRT.width, reflRT.height); boSau(cu); } reflTinh = false; } }
      mua.g.instanceCount = nac >= 3 ? Math.round(mua.N * 0.5) : mua.N;
    }
    if (phan !== 'refl' && nac >= 1 && SHN > 1024) { SHN = 1024; shFill.rt.dispose(); shRed.rt.dispose(); shFill = mkSh(SHN); shRed = mkSh(SHN); datBong(); }
  }

  function dangKyKinh(lens) {
    const MA = [1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 15, 16, 17, 18, 19, 24, 25, 26, 27, 28, 29];
    let mi = 0;
    lens.chiMat.uniforms.uIdDau.value = -5;
    for (const m of NGUOI_MESH) {
      const id = MA[mi++];
      if (m.userData.key === 'Mu') lens.chiMat.uniforms.uIdMu.value = id;
      { const k = ['Nguoi', 'Giay', 'Gang'].indexOf(m.userData.key); if (k >= 0 && lens.chiMat.uniforms.uIdNho) lens.chiMat.uniforms.uIdNho.value[k] = id; }
      if (m.userData.key === 'Got' && lens.chiMat.uniforms.uIdGot) lens.chiMat.uniforms.uIdGot.value = id;
      lens.gbufFor(m, id);
    }
    const guong = new THREE.Group(); guong.scale.y = -1; scene.add(guong);
    const ban = fig.clone(true); guong.add(ban);
    let gid = 41;
    ban.traverse((m) => { if (m.isMesh) { m.layers.disableAll(); m.layers.enable(0); lens.gbufFor(m, gid++, null, { sau: 20, vung: datU }); } });
    const cuaB = new THREE.Mesh(new THREE.PlaneGeometry(PHO.CUA.h[0] * 2, PHO.CUA.h[1] * 2)); cuaB.position.set(PHO.CUA.c[0], PHO.CUA.c[1], PHO.WALL_Z + 0.003);
    guong.add(cuaB); lens.gbufFor(cuaB, 60, null, { sau: 19, vung: datU });
    { const N = PHO.NEON, bien = new THREE.Mesh(new THREE.PlaneGeometry(N.h[0] * 2, N.h[1] * 2)); bien.position.set(N.c[0], N.c[1], N.c[2]); guong.add(bien); bien.renderOrder = 19; bienG = bien;
      lens.gbufMat(bien, new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uTex: neon.mat.material.uniforms.uTex, uPud: datU.uPud, uNPud: datU.uNPud },
        vertexShader: 'varying vec2 vUv; varying float vZ; varying vec3 vW; void main() { vUv = uv; vW = (modelMatrix * vec4(position, 1.0)).xyz; vec4 vp = modelViewMatrix * vec4(position, 1.0); vZ = -vp.z; gl_Position = projectionMatrix * vp; }',
        fragmentShader: 'uniform sampler2D uTex; varying vec2 vUv; varying float vZ; varying vec3 vW;' + VUNG_GB_GLSL + 'void main() { if (ngoaiVung(vW)) discard; gl_FragColor = vec4(0.5, 0.5, vZ, texture2D(uTex, vUv).r > 0.35 ? 62.0 : 61.0); }' })); }
    lens.hienKhiSoi(guong);
    den.traverse((m) => { if (m.isMesh) { if (m.material.uniforms && m.material.uniforms.uGb) lens.gbufMat(m, gbOf(m.material)); else lens.gbufFor(m, 30); } });
    const gDat = gbOf(datM); gDat.depthWrite = false;
    lens.gbufMat(tuong, gbOf(tuongM)); lens.gbufMat(dat, gDat); lens.gbufMat(phim, gbOf(phimM));
    lens.giuMauThat(phim);
    lens.gbufMat(neon.mat, gbOf(neon.mat.material)); lens.gbufFor(neon.hop, 31);
    lens.anDi(luong);
  }

  function netTay() {
    const T = meta.tay && meta.tay.l; if (!T) return [];
    const w = (a) => toWorld(a);
    const N = T.ngon, out = [];
    const toCam = (p) => camera.position.clone().sub(p).normalize();
    const ranh = (A, B, keo = 0.007) => { const pts = []; const g = (k) => w(A[k]).lerp(w(B[k]), 0.5);
      pts.push(g(0).lerp(g(1), 0.45)); for (let k = 1; k < 4; k++) pts.push(g(k)); for (const p of pts) p.addScaledVector(toCam(p), keo); return pts; };
    if (N.index && N.middle) out.push(ranh(N.index, N.middle));
    if (N.middle && N.ring) out.push(ranh(N.middle, N.ring));
    if (N.thumb && N.index) { const pts = []; for (let k = 1; k < 4; k++) { const p = w(N.thumb[k]).lerp(w(N.index[Math.min(3, k)]), 0.38); p.addScaledVector(toCam(p), 0.008); pts.push(p); } out.push(pts); }
    return out;
  }
  datBong();
  return {
    scene, camera, shared, fig, phim, den, lampP, TUI, DAP, ROI, meta, NGUOI_MESH, luong, dat, tuong, neon,
    resize, datMay, dayMay, ve, capNhat, datNac, dangKyKinh, man, datDuoi, datVungChu, datChuMua, toWorld, AN_PHAN_CHIEU, datBien, hopBongBien,
    datAnhPhim: (t) => { phimM.uniforms.uPic.value = t; phimM.uniforms.uCoPic.value = t ? 1 : 0; },
    datSangPhim: (k) => { phimM.uniforms.uSang.value = k; },
    figCenter, mua, datU, phimAt, chonDap, netTay, gonMax: () => gonMax, phimHop: () => PHIM_HOP, P0, PHIM_MAU, PHIM_W, PHIM_L, diemNguoi: (h) => toWorld([meta.hip[0], h, meta.hip[2]]),
  };
}
