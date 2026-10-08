import * as THREE from 'three';
import { C, COMMON, GOBO } from './npr.js';

export const KHOI = { S: 0.055, LOOP: 10 };

const VERT = `
varying vec2 vP;
varying vec3 vWorld;
attribute float aW;
attribute float aZ;
varying float vZone;
uniform vec3 uCamP, uFwd; uniform float uZMid;
void main() {
  vP = position.xy; vZone = aZ;
  vec4 wp = modelMatrix * vec4(position.xy, 0.0, 1.0);
  vec3 r = wp.xyz - uCamP; float d0 = dot(r, uFwd);
  wp.xyz = uCamP + r * (mix(d0, uZMid, aW) / max(d0, 1e-3));
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = `
${COMMON}
${GOBO}
varying vec2 vP;
varying vec3 vWorld;
varying float vZone;
uniform float uT, uCellK, uPx, uRit;
uniform vec3 cDo, cHong, cGiay, cDoChim;
uniform mat4 uRedVP; uniform sampler2D uRedDepth; uniform float uTexel;
uniform vec3 uLhead; uniform float uHeadI;
uniform float uSang, uEmberI, uVTat;
uniform vec3 uCam; uniform vec3 cSang; uniform vec3 uNeon, uCar; uniform float uVXe;
uniform vec4 uDrift;
uniform vec2 uDuoi;
uniform float uKiem; uniform sampler2D uCamDepth; uniform vec2 uRes; uniform float uNear, uFar;
uniform sampler2D uSdf; uniform vec4 uSdfR; uniform vec2 uSdfPx, uCss; uniform float uPerE, uChuCo, uTD, uUon, uTuongTac;
uniform vec3 uTro; uniform float uTroR;
uniform float uNghieng, uV0;
uniform vec4 uHop1, uHop2;
const float TAU = 6.2831853;
float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnb(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float vn(vec2 p, float per) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float y0 = mod(i.y, per), y1 = mod(i.y + 1.0, per);
  return mix(mix(h21(vec2(i.x, y0)), h21(vec2(i.x + 1.0, y0)), f.x), mix(h21(vec2(i.x, y1)), h21(vec2(i.x + 1.0, y1)), f.x), f.y);
}
float bump(float te, float c, float r) { float d = te - c; d -= 10.0 * floor(d / 10.0 + 0.5); return exp(-d * d / (r * r)); }
float xcAt(float v, float va, float z) {
  float k1 = TAU * 4.0 / 0.55, k2 = TAU * 7.0 / 0.55;
  float A = (0.0025 + 0.01 * smoothstep(0.0, 0.12, v) + 0.026 * smoothstep(0.24, 0.42, v)) * (1.0 - 0.25 * z);
  float x = A * (sin(k1 * va) + 0.42 * sin(k2 * va + 1.7));
  x += (vn(vec2(3.1, va * 20.0), 11.0) - 0.5) * 0.028 * smoothstep(0.03, 0.3, v) * (1.0 - 0.5 * z);
  x -= uDrift.x * (1.0 - exp(-v / uDrift.y)) * smoothstep(0.0, 0.025, v) + uDrift.z * v;
  x -= uNghieng * (v - uV0) * smoothstep(uV0, uV0 + 0.06, v);
  return x;
}

float loiKhe(vec3 wp, vec3 L, vec2 uX, vec2 uW) {
  vec4 o = uCuaInv * vec4(wp, 1.0); vec3 d = mat3(uCuaInv) * L;
  if (abs(d.z) < 1e-4) return 0.0;
  float t = -o.z / d.z;
  if (t < 0.0) return 0.0;
  vec2 uv = (o.xy + d.xy * t) / uCuaSize + 0.5;
  float f = fract(uv.y * uSlats);
  float g = clamp((f - uLa) / (1.0 - uLa), 0.0, 1.0);
  float prof = 1.0 - abs(2.0 * g - 1.0);
  float vao = smoothstep(0.0, 0.04, uv.x) * smoothstep(1.0, 0.96, uv.x) * smoothstep(0.0, 0.04, uv.y) * smoothstep(1.0, 0.96, uv.y);
  float ngang = clamp(1.0 - abs(uv.x - uX.x) / uW.x, 0.0, 1.0) * clamp(1.0 - abs(uv.y - uX.y) / uW.y, 0.0, 1.0);
  float fw = fwidth(uv.y * uSlats);
  float day = 1.0 - smoothstep(1.0 / 22.0, 1.0 / 14.0, fw);
  vao *= smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y) * smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x);
  return prof * vao * ngang * day;
}
float boDo(vec3 wp) {
  vec4 lp = uRedVP * vec4(wp, 1.0); vec3 p = lp.xyz / lp.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return 1.0;
  float l = 0.0;
  for (int i = 0; i < 4; i++) { vec2 o = vec2(float(i & 1), float(i >> 1)) - 0.5; l += (p.z - 0.002 <= textureLod(uRedDepth, p.xy + o * uTexel * 3.0, 0.0).r) ? 1.0 : 0.0; }
  return l / 4.0;
}
void main() {
  float S = ${KHOI.S.toFixed(3)};
  float u = vP.x, v = vP.y;
  float sdC = 999.0, trongChu = 0.0;
  if (uChuCo > 0.5) {
    vec2 sp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * (uCss.x / uRes.x);
    vec2 tq = (sp - uSdfR.xy) / uSdfR.zw;
    if (tq.x > 0.0 && tq.y > 0.0 && tq.x < 1.0 && tq.y < 1.0) {
      vec4 s0 = texture2D(uSdf, tq);
      sdC = (s0.r - 0.5) * 128.0;
      trongChu = 1.0 - smoothstep(-0.5, 1.2, sdC);
      if (uTuongTac > 0.5 && uTD > 0.001 && sdC < uUon * 4.0) {
        vec2 e = 1.0 / uSdfPx;
        float gx = texture2D(uSdf, tq + vec2(e.x, 0.0)).r - texture2D(uSdf, tq - vec2(e.x, 0.0)).r;
        float gy = texture2D(uSdf, tq + vec2(0.0, e.y)).r - texture2D(uSdf, tq - vec2(0.0, e.y)).r;
        vec2 n = normalize(vec2(gx, gy) + 1e-6);
        float kk = exp(-max(sdC, 0.0) / uUon) * smoothstep(-3.0, 1.0, sdC);
        vec2 w = -n * uUon * 0.85 * kk;
        float ph = uT * 1.2566371;
        vec2 q = sp / max(uUon * 1.6, 4.0) + vec2(cos(ph), sin(ph)) * 1.3;
        float p0 = vnb(q), px = vnb(q + vec2(0.35, 0.0)), py = vnb(q + vec2(0.0, 0.35));
        w += vec2(py - p0, -(px - p0)) / 0.35 * uUon * 0.9 * s0.b * (1.0 - smoothstep(0.0, uUon * 3.0, max(sdC, 0.0)));
        vec2 dT = sp - uTro.xy; float lT = length(dT);
        w += vec2(-dT.y, dT.x) / max(lT, 1.0) * uTro.z * uUon * 0.7 * exp(-max(lT - uTroR, 0.0) / (uTroR * 0.5)) * step(uTroR * 0.95, lT);
        w *= uTD;
        u += w.x * uPerE; v -= w.y * uPerE;
      }
    }
  }
  if (v < 0.007) discard;
  float va = v - S * uT;
  float k3 = TAU * 3.0 / 0.55;
  float vz = clamp(vZone, 0.0, 1.0);
  float xc = xcAt(v, va, vz);
  float k1 = TAU * 4.0 / 0.55, k2 = TAU * 7.0 / 0.55;
  float Aa = (0.0025 + 0.01 * smoothstep(0.0, 0.12, v) + 0.026 * smoothstep(0.24, 0.42, v)) * (1.0 - 0.25 * vz);
  float tg = clamp(v / 0.025, 0.0, 1.0), fg = tg * tg * (3.0 - 2.0 * tg), dfg = 6.0 * tg * (1.0 - tg) / 0.025;
  float sl = Aa * (k1 * cos(k1 * va) + 0.42 * k2 * cos(k2 * va + 1.7)) - uDrift.x * (exp(-v / uDrift.y) / uDrift.y * fg + (1.0 - exp(-v / uDrift.y)) * dfg) - uDrift.z - uNghieng * smoothstep(uV0, uV0 + 0.06, v);
  float nrm = inversesqrt(1.0 + sl * sl);
  float er0 = smoothstep(0.2, 0.46, v);
  float wMax = (0.0022 + 0.0055 * smoothstep(0.0, 0.16, v) + 0.006 * smoothstep(0.25, 0.45, v)) * 1.42 * 1.85 * (1.0 + uDuoi.y * er0);
  if (abs(u - xc) * nrm > wMax * uDuoi.x + 0.005) discard;
  float te = mod(uT - v / S, 10.0);
  float puff = 1.0 - 0.55 * bump(te, 8.05, 0.45) + 0.85 * bump(te, 8.95, 0.7);
  float er = smoothstep(0.2, 0.46, v);
  float vung = clamp(vZone, 0.0, 1.0);
  float erV = er * (1.0 - vung);
  float w = (0.0022 + 0.0055 * smoothstep(0.0, 0.16, v) + 0.006 * smoothstep(0.25, 0.45, v)) * (1.0 + 0.42 * sin(k3 * va + 0.6)) * puff * (1.0 + uDuoi.y * er * (1.0 - 0.6 * vung));
  float d = abs(u - xc) * nrm;
  vec2 cell = floor(vec2(u, va) / uCellK);
  float per = floor(0.55 / uCellK + 0.5);
  cell.y = mod(cell.y, per);
  float r1 = h21(cell), r2 = h21(cell + 17.3), r3 = h21(cell + 41.1), r4 = h21(cell + 73.7);
  float edgeW = max(mix(0.5, 0.14, vung) * w, 2.5 * uCellK);
  float tb = clamp((w - d) / edgeW + 0.5, 0.0, 1.0);
  float lo = vn(vec2(u * 40.0, va * 40.0), 22.0);
  float giu = clamp(1.0 - 1.05 * erV + (lo - 0.5) * 1.1 * erV, 0.0, 1.0);
  float cov = rutTham(tb * giu, mix(r1, r2, erV), mix(0.62, 0.97, erV));
  float tail = smoothstep(0.3, 0.48, v) * (1.0 - smoothstep(0.48, 0.57, v)) * clamp(1.0 - d / (w * uDuoi.x + 0.004), 0.0, 1.0) * (1.0 - vung);
  cov = max(cov, step(1.0 - 0.10 * tail, r3));
  if (cov < 0.02) discard;
  if (uKiem > 3.5) {
    if (tb * giu < 0.5 || v > 0.3) discard;
    gl_FragColor = vec4(0.5, 0.5, -(viewMatrix * vec4(vWorld, 1.0)).z, 60.0);
    return;
  }
  if (uKiem > 0.5 && uKiem < 1.5) {
    float dz = textureLod(uCamDepth, gl_FragCoord.xy / uRes, 0.0).r;
    float zS = gl_FragCoord.z;
    gl_FragColor = (dz < 1.0 && dz < zS) ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(0.0, 1.0, 0.0, 1.0);
    return;
  }
  vec3 col = cSang;
  float tia = 0.0;
  float gN = loiKhe(vWorld, normalize(uNeon - vWorld), vec2(0.5), vec2(10.0));
  float xaChu = smoothstep(4.0, 16.0, sdC);
  float tR = rutTham(smoothstep(0.64, 0.98, gN) * 0.75 * xaChu, r4, 0.55);
  col = mix(col, cHong, tR);
  tia = max(tia, tR);
  float tX = 0.0, gX = 0.0;
  if (uHeadI > 0.001) {
    gX = loiKhe(vWorld, normalize(uCar - vWorld), vec2(0.5), vec2(10.0)) * (1.0 - smoothstep(0.025, 0.055, abs(v - uVXe)));
    tX = rutTham(smoothstep(0.7, 0.97, gX) * uHeadI * xaChu, r2, 0.55);
    float loi = rutTham(smoothstep(0.84, 1.0, gX) * uHeadI * 0.9, r3, 0.5);
    col = mix(col, mix(cHong, cGiay, loi), tX);
    tia = max(tia, tX);
  }
  float lv = floor(r4 * 5.0);
  float aDot = lv < 1.0 ? 0.3 : lv < 2.0 ? 0.38 : lv < 3.0 ? 0.45 : lv < 4.0 ? 0.55 : 0.8;
  float aThan = mix(mix(0.85, aDot, smoothstep(0.08, 0.3, v)), 0.92, vung);
  float a = cov * mix(aThan, 1.0, tia);
  float gocK = (1.0 - smoothstep(0.0, 0.07, v)) * clamp(uEmberI * (1.0 - uSang) * 1.4, 0.0, 1.0);
  col = mix(col, cHong, rutTham(gocK, r2, 0.6));
  a *= max(rutTham(uSang, r1, 0.62), rutTham(gocK, r4, 0.6));
  a *= rutTham(1.0 - smoothstep(uVTat - 0.09, uVTat, v), r3, 0.6);
  a *= 1.0 - smoothstep(0.5, 0.57, v);
  {
    vec2 sp2 = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * (uCss.x / uRes.x);
    vec2 q1 = max(max(uHop1.xy - sp2, sp2 - uHop1.zw), 0.0), q2 = max(max(uHop2.xy - sp2, sp2 - uHop2.zw), 0.0);
    a *= rutTham(smoothstep(8.0, 28.0, min(length(q1), length(q2))), r1, 0.6);
  }
  if (trongChu * uChuCo > 0.02) a = mix(a, min(a, 0.22), trongChu);
  a *= mix(0.8, 1.0, smoothstep(0.0, 4.0, sdC));
  if (a < 0.02) discard;
  col += (r3 + r1 - 1.0) * (10.0 / 255.0);
  if (uKiem > 1.5) {
    gl_FragColor = uKiem > 2.5 ? vec4(gX, gN, step(0.5, tX), 1.0) : vec4(clamp(v / 0.6, 0.0, 1.0), step(0.5, tia), 1.0, 1.0);
    return;
  }
  gl_FragColor = vec4(col, a);
}`;

const NHANG = 90, V0 = 0.004, V1 = 0.58;
function taoLuoi() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((NHANG + 1) * 6), 3));
  g.setAttribute('aW', new THREE.Float32BufferAttribute(new Float32Array((NHANG + 1) * 2), 1));
  g.setAttribute('aZ', new THREE.Float32BufferAttribute(new Float32Array((NHANG + 1) * 2), 1));
  const idx = [];
  for (let i = 0; i < NHANG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  g.setIndex(idx);
  return g;
}
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function bumpJ(te, c, r) { let d = te - c; d -= 10 * Math.floor(d / 10 + 0.5); return Math.exp(-d * d / (r * r)); }
const ssJ = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ngoai = (x, y, r) => Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - y, 0, y - r[3]));
function capNhatLuoi(g, drift, T, duoi, CH, hang) {
  const S = KHOI.S, TAU = Math.PI * 2;
  const k1 = TAU * 4 / 0.55, k2 = TAU * 7 / 0.55, k3 = TAU * 3 / 0.55;
  const pos = g.attributes.position.array;
  for (let i = 0; i <= NHANG; i++) {
    const v = V0 + (V1 - V0) * i / NHANG;
    const va = v - S * T;
    const A0 = 0.0025 + 0.01 * ss(0, 0.12, v) + 0.026 * ss(0.24, 0.42, v);
    const tg = Math.min(1, v / 0.025), fg = tg * tg * (3 - 2 * tg), dfg = 6 * tg * (1 - tg) / 0.025;
    const troi = drift.x * (1 - Math.exp(-v / drift.y)) * fg + drift.z * v + (CH ? CH.nghieng * (v - CH.v0) * ss(CH.v0, CH.v0 + 0.06, v) : 0);
    let az = 0;
    if (CH && CH.co) {
      const c0 = A0 * (Math.sin(k1 * va) + 0.42 * Math.sin(k2 * va + 1.7)) - troi;
      const x0 = CH.ex + c0 / CH.perE, y0 = CH.ey - v / CH.perE;
      az = (y0 > CH.box[3] ? 1 : 1 - ssJ(0, 90, ngoai(x0, y0, CH.box))) * CH.td;
    }
    const A = A0 * (1 - 0.25 * az);
    const c = A * (Math.sin(k1 * va) + 0.42 * Math.sin(k2 * va + 1.7)) - troi;
    const sl = A * (k1 * Math.cos(k1 * va) + 0.42 * k2 * Math.cos(k2 * va + 1.7)) - drift.x * (Math.exp(-v / drift.y) / drift.y * fg + (1 - Math.exp(-v / drift.y)) * dfg) - drift.z - (CH ? CH.nghieng * ss(CH.v0, CH.v0 + 0.06, v) : 0);
    const nrm = 1 / Math.sqrt(1 + sl * sl);
    const te = (((T - v / S) % 10) + 10) % 10;
    const puff = 1 - 0.55 * bumpJ(te, 8.05, 0.45) + 0.85 * bumpJ(te, 8.95, 0.7);
    const er = ss(0.2, 0.46, v);
    const w = (0.0022 + 0.0055 * ss(0, 0.16, v) + 0.006 * ss(0.25, 0.45, v)) * (1 + 0.42 * Math.sin(k3 * va + 0.6)) * puff * (1 + duoi.y * er);
    let half = (w * duoi.x + 0.008) / Math.max(nrm, 0.15) + 0.014 * ss(0.03, 0.3, v) + 0.014;
    let aw = 0;
    if (CH && CH.co) {
      const x = CH.ex + c / CH.perE, y = CH.ey - v / CH.perE;
      const vung = 1 - ssJ(0, 40, ngoai(x, y, CH.box));
      const xaDau = ssJ(0, 30, ngoai(x, y, CH.dau));
      aw = vung * xaDau * CH.td;
      half += vung * CH.uon * 1.6 * CH.perE;
      if (hang) hang[i] = { x, y, a: (v > 0.02 && v < CH.vTat - 0.06 ? 1 : 0) * (1 - 0.5 * ss(0.3, 0.5, v)) };
    }
    const o = i * 6;
    pos[o] = c - half; pos[o + 1] = v; pos[o + 2] = 0; pos[o + 3] = c + half; pos[o + 4] = v; pos[o + 5] = 0;
    const aW = g.attributes.aW.array; aW[i * 2] = aw; aW[i * 2 + 1] = aw;
    const aZ = g.attributes.aZ.array; aZ[i * 2] = az; aZ[i * 2 + 1] = az;
  }
  g.attributes.position.needsUpdate = true;
  g.attributes.aW.needsUpdate = true; g.attributes.aZ.needsUpdate = true;
}

export function makeKhoi(shared) {
  const u = {
    uT: { value: 0 }, uCellK: { value: 0.0011 }, uPx: { value: 1 }, uRit: { value: 0 },
    cDo: { value: C.do }, cHong: { value: C.hong }, cGiay: { value: C.giay }, cDoChim: { value: C.doChim },
    uRedVP: shared.uRedVP, uRedDepth: shared.uRedDepth, uTexel: shared.uFillTexel,
    uLhead: shared.uLhead, uHeadI: shared.uHeadI, cSang: { value: C.chamSang },
    uSang: shared.uSang, uEmberI: shared.uEmberI, uVTat: { value: 9 },
    uNeon: { value: new THREE.Vector3() }, uCar: { value: new THREE.Vector3() }, uVXe: { value: -1 },
    uCam: { value: new THREE.Vector3() }, uCuaInv: shared.uCuaInv, uCuaSize: shared.uCuaSize, uSlats: shared.uSlats, uLa: shared.uLa,
    uDrift: { value: new THREE.Vector4(0.19, 0.055, 0.04, 0) },
    uDuoi: { value: new THREE.Vector2(2.6, 3.0) },
    uKiem: { value: 0 }, uCamDepth: shared.uCamDepth, uRes: shared.uRes, uNear: shared.uNear, uFar: shared.uFar,
    uCamP: { value: new THREE.Vector3() }, uFwd: { value: new THREE.Vector3(0, 0, -1) }, uZMid: { value: 2.6 },
    uSdf: { value: null }, uSdfR: { value: new THREE.Vector4(0, 0, 1, 1) }, uSdfPx: { value: new THREE.Vector2(1, 1) }, uCss: { value: new THREE.Vector2(1, 1) },
    uPerE: { value: 0.002 }, uChuCo: { value: 0 }, uTD: { value: 0 }, uUon: { value: 20 }, uTuongTac: { value: 1 },
    uTro: { value: new THREE.Vector3(-1e4, -1e4, 0) }, uTroR: { value: 100 },
    uNghieng: { value: 0 }, uV0: { value: 9 },
    uHop1: { value: new THREE.Vector4(-9e4, -9e4, -9e4, -9e4) }, uHop2: { value: new THREE.Vector4(-9e4, -9e4, -9e4, -9e4) },
  };
  const CH = { co: false, ex: 0, ey: 0, perE: 0.002, box: [0, 0, 0, 0], dau: [0, 0, 0, 0], td: 0, uon: 20, vTat: 9, nghieng: 0, v0: 9, nghiengMax: 0 };
  const hang = [];
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  m.extensions = { derivatives: true };
  const mesh = new THREE.Mesh(taoLuoi(), m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  return {
    mesh, u,
    dat(ember, camera) {
      const r = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      const n = new THREE.Vector3().crossVectors(r, up).normalize();
      mesh.matrix.makeBasis(r, up, n).setPosition(ember);
      mesh.matrixAutoUpdate = false;
      mesh.matrixWorldNeedsUpdate = true;
      u.uCam.value.copy(camera.position);
      return { o: ember.toArray(), r: r.toArray(), up: up.toArray(), n: n.toArray() };
    },
    setCell(cellK, px) { u.uCellK.value = 0.55 / Math.round(0.55 / cellK); u.uPx.value = px; },
    update(t) { u.uT.value = ((t % KHOI.LOOP) + KHOI.LOOP) % KHOI.LOOP; CH.td = u.uTD.value; CH.vTat = u.uVTat.value; CH.nghieng = CH.nghiengMax * CH.td; u.uNghieng.value = CH.nghieng; capNhatLuoi(mesh.geometry, u.uDrift.value, u.uT.value, u.uDuoi.value, CH, hang); },
    datChu(o) {
      Object.assign(CH, { co: true, ex: o.ex, ey: o.ey, perE: o.perE, box: o.box, dau: o.dau, uon: o.uon });
      if (o.hop) { u.uHop1.value.set(...o.hop[0]); u.uHop2.value.set(...o.hop[1]); }
      CH.v0 = o.v0 ?? 9; CH.nghiengMax = o.nghieng ?? 0; u.uV0.value = CH.v0;
      u.uSdf.value = o.sdf.tex; u.uSdfR.value.copy(o.sdf.rect); u.uSdfPx.value.copy(o.sdf.px); u.uCss.value.set(o.Wc, o.Hc);
      u.uPerE.value = o.perE; u.uUon.value = o.uon; u.uZMid.value = o.zMid; u.uCamP.value.copy(o.camP); u.uFwd.value.copy(o.fwd); u.uChuCo.value = 1;
      hang.length = 0;
    },
    hang,
  };
}
