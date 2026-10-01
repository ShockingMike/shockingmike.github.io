// 骨 FRAME — RỪNG TUYẾT TÙNG 杉 TRONG ĐÊM, HƯỚNG A 墨付け (28/9, Mike duyệt ảnh chi tiết: "còn lại thì ok rồi").
// Chương thứ ba của "chuyến đi tìm gốc từng lớp kết cấu": nơi sinh ra KHUNG GỖ. Giữa khoảng trống trong rừng tuyết tùng, một
// khúc gỗ vừa hạ nằm trên hai giá chéo 馬, gốc cây của chính nó còn tươi bên cạnh. Theo cuộn, thợ mộc đánh dấu mực 墨付け:
//   · ba DÂY MỰC 墨壺 hiện lần lượt dọc thân như nét ở các chương khác: đầu nét chạy từ đầu gốc tới đầu ngọn theo cuộn, phần đã
//     vẽ đứng yên và phát sáng, mực bắn lấm tấm hai bên hiện cùng phần đã vẽ (Mike 28/9: bỏ nhịp búng dây — "cứ hiện ra như bình
//     thường thôi") — ba đường xẻ ra cây cột vuông;
//   · DẤU BÚT TRE 墨差し gần đầu gỗ viết từng nét (vạch cắt quanh thân, dấu chữ V, "い三", dấu tâm);
//   · cuối chương máy tới sát đầu gỗ: CHỮ 井 trên mặt cắt (hình vuông cây cột kéo tới mép gỗ) sáng lên.
// Máy quay: A rộng (đầu chương) → A giữa → cận đầu gỗ, keyframe trơn theo τ (τ đã qua sine.inOut — app.js tính).
//
// Màu: CÙNG BẢNG MÀU ĐÊM với ruộng và mỏ đá (sắc ~155°) — mọi màu nền đi qua pal(): giữ độ sáng, nhuộm ánh xám lục; gỗ, vỏ chỉ
// ấm hơn một chút (sau lớp nắn màu đêm nằm ở 120–140°, bão hoà rất thấp). Màu bão hoà duy nhất là 緑青 của mực.
// Hiệu năng: cây NHÂN BẢN (một lưới thân cho mọi cây, dáng tính trong shader); chùm lá kim là tấm nhân bản (ảnh chùm lá vẽ bằng
// code lên canvas lúc dựng ngầm); sương + ánh trăng tính Ở ĐỈNH cho thân, lá, cành, dương xỉ, đất; phần sáng mực chỉ tính trong
// khối cầu quanh khúc gỗ.
import * as THREE from 'three';
import { RAMP } from '../page/accent.js';
import { kfEase } from './valley.js';

// ── nhiễu: ảnh 256×256 (shader) + bản sao trên CPU (cao độ đất, chỗ đặt tia trăng) ─────────────────
const NZ = 256;
const NOISE = new Uint8Array(NZ * NZ * 4);
{ let s = 20260929; for (let i = 0; i < NZ * NZ; i++) { s = (s * 1664525 + 1013904223) >>> 0; const v = s >>> 24; NOISE[i * 4] = NOISE[i * 4 + 1] = NOISE[i * 4 + 2] = v; NOISE[i * 4 + 3] = 255; } }
const NV = (i, j) => NOISE[((((j % NZ) + NZ) % NZ) * NZ + (((i % NZ) + NZ) % NZ)) * 4] / 255;
function cvn(x, y) {
  const i = Math.floor(x), j = Math.floor(y);
  let fx = x - i, fy = y - j; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = NV(i, j) + (NV(i + 1, j) - NV(i, j)) * fx, b = NV(i, j + 1) + (NV(i + 1, j + 1) - NV(i, j + 1)) * fx;
  return a + (b - a) * fy;
}
const lerp = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const cl01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// ── bố cục ─────────────────────────────────────────────────────────────────────────────────────
const CL = { x: -7, z: 7, r: 16 };                         // khoảng trống giữa rừng
const LOG = { L: 9.0, r0: 0.46, r1: 0.37, yc: 0.98 };      // khúc gỗ dọc trục X, đầu gốc (−X) quay về máy
const ex0 = -LOG.L / 2;
const STUMP = { x: -1.5, z: -6.5, r0: 0.40, cut: 0.55, seed: 0.37 };  // gốc cây vừa hạ — cây của chính khúc gỗ
const MOON = new THREE.Vector3(-0.3, 0.86, 0.42).normalize();          // trăng cao, sau lưng máy lệch phải
const CANOPY_Y = 28;
// 3 dây mực: cạnh đứng của cây cột vuông chạm mép gỗ (53°) · đường tâm 芯墨 trên lưng (90°) · cạnh ngang chạm mép gỗ phía máy (−37°)
const PHI = [Math.atan2(0.8, 0.6), Math.PI / 2, Math.atan2(-0.6, 0.8)];
// nhịp theo τ: vẽ từng dây mực (đầu nét chạy dọc thân) · viết dấu mộng · chữ 井 sáng lên
const DRAW = [[0.215, 0.345], [0.395, 0.48], [0.50, 0.585]];
const MARK_T = [0.605, 0.79];
const FACE_T = [0.885, 0.965];
export const RUNG = { LOG, STUMP, PHI, DRAW, MARK_T, FACE_T };

function floorH(x, z) {
  let h = 0.36 * (cvn(x * 0.05 + 3.1, z * 0.05) - 0.5) + 0.12 * (cvn(x * 0.21, z * 0.21 + 5.0) - 0.5);
  h += Math.max(0, -z - 38) * 0.07 + Math.max(0, x - 60) * 0.05;
  const dc = Math.hypot(x - CL.x, z - CL.z);
  return h * lerp(0.35, 1, sm(4, 16, dc));
}

// ── máy quay: A rộng → A giữa → cận đầu gỗ. τ < ~0,1: trong sương dày của chuyển cảnh (máy đang bay tới trên khoảng trống,
// ngửa nhìn tán — liền với cú bay ngửa lên khỏi mỏ đá); 0,1 → 0,215 sương tan, máy hạ xuống góc A rộng.
// (Mike 30/9: từ nay chuyển cảnh 3 là MỘT cú tiến thẳng qua sương — app.js TR3 đặt máy rừng trong quãng chuyển theo tư thế lúc tới
// (τ ≈ 0,215) lùi lại phần cú bay còn lại; hai mốc τ < 0,215 dưới đây không còn hiện khi đi tới — lùi / nhảy chương giờ là mờ chuyển)
const K = [
  // τ,      vị trí,                  nhìn về,                 góc nhìn
  [0.000, [-13.0, 9.8, 9.2], [-2.0, 27.0, -7.0], 58],
  [0.0955, [-12.2, 7.9, 8.1], [-1.5, 20.5, -6.0], 57],
  [0.215, [-9.6, 1.8, 4.9], [1.2, 2.6, -2.2], 56],
  [0.36, [-9.25, 1.86, 4.62], [1.0, 2.3, -2.1], 55],
  [0.62, [-7.0, 2.45, 2.9], [-2.2, 0.5, -0.8], 50],
  [0.79, [-6.75, 2.3, 2.5], [-2.45, 0.56, -0.66], 49],
  [0.95, [-6.25, 1.53, 0.95], [-4.25, 0.80, 0.08], 46],
  [1.0, [-6.2, 1.52, 0.93], [-4.25, 0.80, 0.08], 46],
];
// nội suy lập phương ĐƠN ĐIỆU (Fritsch–Carlson): trơn qua các mốc nhưng không vọt quá mốc (máy không lún xuống dưới góc A rộng)
function kfm(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 1;
  while (t > keys[i][0]) i++;
  const sl = (k) => (keys[k + 1][1] - keys[k][1]) / (keys[k + 1][0] - keys[k][0]);
  const tan = (k) => {
    if (k === 0) return sl(0);
    if (k === n - 1) return sl(n - 2);
    const a = sl(k - 1), b = sl(k);
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  };
  const [t0, v0] = keys[i - 1], [t1, v1] = keys[i], h = t1 - t0, u = (t - t0) / h;
  const m0 = tan(i - 1) * h, m1 = tan(i) * h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1;
}
const kfs = kfm;
const CAM = { x: [], y: [], z: [], tx: [], ty: [], tz: [], fov: [] };
for (const [t, p, a, f] of K) { CAM.x.push([t, p[0]]); CAM.y.push([t, p[1]]); CAM.z.push([t, p[2]]); CAM.tx.push([t, a[0]]); CAM.ty.push([t, a[1]]); CAM.tz.push([t, a[2]]); CAM.fov.push([t, f]); }

// ═════ SHADER ═════════════════════════════════════════════════════════════════════════════════
// Mã shader chia thành từng phần; mỗi shader chỉ ghép phần nó cần (khâu dịch sang HLSL của Windows chạy trên luồng đồ hoạ
// — nguồn càng dài càng lâu: gửi dịch từng chương trình ngầm sau màn mở mà không lỡ nhịp khung nào).
const G_DECL = /* glsl */`
uniform sampler2D uNoise;
uniform vec3 uMoonDir, uMoonC, uSkyAmb, uGndAmb;
uniform vec3 uFogC, uFogLo, uFogHi; uniform float uFogD, uHaze, uMist, uCanopyY;
uniform vec3 uClear;
uniform vec3 uLightC; uniform float uLightR, uAirK;
uniform vec3 uLA[4]; uniform vec3 uLB[4]; uniform float uLK[4];
uniform vec4 uLS;
uniform vec3 uInkCore, uInkBody, uInkHalo, uInkBase;
`;
const G_NOISE = /* glsl */`
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return texture2D(uNoise, (i + f + 0.5) * 0.00390625).r; }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// nhiễu tính bằng phép toán (không qua bộ lọc ảnh 8 bit): cho nhiễu kéo dài / đường đồng mức mảnh (không thành chuỗi chấm)
float vnA(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y); }
`;
// BẢNG MÀU ĐÊM (cùng tông ruộng, mỏ đá): giữ độ sáng, nhuộm ánh xám lục; w = độ ấm (gỗ, vỏ ấm hơn xung quanh một chút)
const G_PAL = /* glsl */`
vec3 pal(vec3 a, float w) { float l = dot(a, vec3(0.2126, 0.7152, 0.0722)); return l * mix(vec3(0.78, 1.09, 1.0), vec3(1.12, 1.0, 0.82), w); }
`;
// trăng lọt xuống: giữa khoảng trống thì đủ (trừ bóng tán ven), dưới tán thì loang lổ theo kẽ tán
const G_MOON = /* glsl */`
float moonGap(vec3 P) {
  vec2 q = P.xz + uMoonDir.xz * ((uCanopyY - P.y) / max(uMoonDir.y, 0.2));
  float open = 1.0 - smoothstep(uClear.z - 5.0, uClear.z + 1.0, length(q - uClear.xy));
  vec2 q2 = mat2(0.8, -0.6, 0.6, 0.8) * q;
  float g = smoothstep(0.5, 0.78, vnA(q * 0.075 + 4.0) * 0.55 + vnA(q2 * 0.19 + 9.0) * 0.3 + vnA(q * 0.53 + 2.0) * 0.15);
  return mix(max(open, g), 1.0, smoothstep(uCanopyY - 10.0, uCanopyY + 4.0, P.y));
}
vec3 ambMoon(vec3 N, vec3 P, float gap) {
  float under = 0.62 + 0.38 * smoothstep(0.0, 22.0, P.y);
  return mix(uGndAmb, uSkyAmb * under, N.y * 0.5 + 0.5) + uMoonC * max(dot(N, uMoonDir), 0.0) * gap;
}
`;
// đèn giả dọc đoạn mực đã búng — chỉ tính trong khối cầu quanh khúc gỗ
const G_INK = /* glsl */`
vec3 inkLight(vec3 P, vec3 N) {
  vec3 d = vec3(0.0);
  if (uLS.w <= 0.0 || length(P - uLS.xyz) > uLS.w + uLightR * 2.0) return d;
  for (int i = 0; i < 4; i++) {
    if (uLK[i] <= 0.0) continue;
    vec3 ab = uLB[i] - uLA[i];
    float h = clamp(dot(P - uLA[i], ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    vec3 v = uLA[i] + ab * h - P;
    float r = length(v);
    vec3 L = v / max(r, 1e-3);
    float k = uLK[i] / (1.0 + r * r * 28.0) * (1.0 - smoothstep(uLightR * 0.5, uLightR * 2.0, r));
    d += uLightC * k * (0.25 + 0.75 * max(dot(N, L), 0.0));
  }
  return d;
}
`;
// SƯƠNG (như các chương đêm trước): theo khoảng cách · sát đất · hai tầng sương nằm ngang. Trả (phần cộng, hệ số nhân):
// màu ra = màu vật × a + b. Tính ở đỉnh (sương đổi chậm theo không gian).
const G_FOG = /* glsl */`
vec3 airLight(vec3 P) {
  vec3 o = vec3(0.0);
  if (uLS.w <= 0.0) return o;
  for (int i = 0; i < 4; i++) {
    if (uLK[i] <= 0.0) continue;
    vec3 ab = uLB[i] - uLA[i];
    float h = clamp(dot(P - uLA[i], ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    float r = length(uLA[i] + ab * h - P);
    float k = max(1.0 - r / (uLightR * 1.8), 0.0);
    o += uLightC * uLK[i] * k * k;
  }
  return o;
}
vec4 fogV(vec3 P) {
  vec3 toP = P - cameraPosition;
  float dist = length(toP);
  vec3 Rd = toP / max(dist, 1e-4);
  float dC = min(dist, 520.0);
  vec3 P1 = cameraPosition + Rd * dC;
  float fogF = 1.0 - exp(-pow(uFogD * dC, 1.45));
  float cy = cameraPosition.y, dy = P1.y - cy, hb = 0.45;
  float hK = abs(dy) < 1e-3 ? exp(-hb * cy) : (exp(-hb * cy) - exp(-hb * P1.y)) / (hb * dy);
  float haze = (1.0 - exp(-uHaze * max(hK, 0.0) * dC * 0.05)) * smoothstep(6.0, 40.0, dC);
  float mist = 0.0; vec3 mistP = vec3(0.0); float mistW = 0.0;
  float ry = abs(Rd.y) > 2e-3 ? Rd.y : 2e-3;
  for (int k = 0; k < 2; k++) {
    float hM = k == 0 ? 0.5 : 8.5, sg = k == 0 ? 1.2 : 2.2;
    float u0 = (cy + ry * 0.6 - hM) / sg, u1 = (cy + ry * dC - hM) / sg;
    float e1 = 1.13 * u1 * inversesqrt(1.0 + 1.28 * u1 * u1), e0 = 1.13 * u0 * inversesqrt(1.0 + 1.28 * u0 * u0);
    float L = sg / ry * 0.886 * (e1 - e0);
    if (L > 0.01) {
      float tIn = (hM - cy) / ry;
      float ts = tIn > 0.0 ? tIn : 0.5 * (sg * 1.2 + abs(cy - hM)) / max(abs(ry), 1e-3);
      ts = clamp(ts, 0.6, min(dC, 160.0));
      vec2 m = cameraPosition.xz + Rd.xz * ts;
      float w = vn(m * 0.058 + float(k) * 17.0);
      float dm = (1.0 - exp(-L * 0.05 * uMist * (0.25 + 1.5 * smoothstep(0.28, 0.80, w)))) * smoothstep(1.5, 12.0, ts) * (k == 0 ? 0.8 : 0.85);
      mist = 1.0 - (1.0 - mist) * (1.0 - dm);
      mistP += (cameraPosition + Rd * ts) * dm; mistW += dm;
    }
  }
  vec3 mistL = mistW > 0.01 ? airLight(mistP / mistW) * mist : vec3(0.0);
  float f = clamp(1.0 - (1.0 - fogF) * (1.0 - haze * (1.0 - fogF)), 0.0, 1.0);
  vec3 fogC = mix(uFogLo, uFogC, smoothstep(0.0, 9.0, P1.y));
  fogC = mix(fogC, uFogHi, smoothstep(16.0, 40.0, P1.y));
  vec3 M = uFogC * 1.4 + mistL * 0.25;
  return vec4(fogC * f * (1.0 - mist) + M * mist, (1.0 - f) * (1.0 - mist));
}
`;
const G_AIR = /* glsl */`
float segSeg(vec3 p1, vec3 q1, vec3 p2, vec3 q2) {
  vec3 d1 = q1 - p1, d2 = q2 - p2, r = p1 - p2;
  float a = dot(d1, d1), e = max(dot(d2, d2), 1e-4), f = dot(d2, r), c = dot(d1, r), b = dot(d1, d2);
  float den = a * e - b * b;
  float s = den > 1e-5 ? clamp((b * f - c * e) / den, 0.0, 1.0) : 0.0;
  float t = (b * s + f) / e;
  if (t < 0.0) { t = 0.0; s = clamp(-c / a, 0.0, 1.0); } else if (t > 1.0) { t = 1.0; s = clamp((b - c) / a, 0.0, 1.0); }
  return length(p1 + d1 * s - p2 - d2 * t);
}
// quầng sáng trong sương quanh các dây mực (chỉ với tia nhìn đi gần khúc gỗ)
vec3 airGlow(vec3 P) {
  if (uLS.w <= 0.0) return vec3(0.0);
  // sát khúc gỗ: ánh mực chiếu thẳng (inkLight) + quầng trên nét đã đủ — không tính quầng trong sương
  if (abs(P.z) < 1.4 && abs(P.x - uLS.x) < 5.3 && P.y < 2.6) return vec3(0.0);
  vec3 toP = P - cameraPosition;
  float dC = min(length(toP), 520.0);
  vec3 Rd = toP / max(dC, 1e-4);
  vec3 cs = uLS.xyz - cameraPosition;
  float tc = clamp(dot(cs, Rd), 0.0, dC);
  if (length(cs - Rd * tc) > uLS.w + 1.5) return vec3(0.0);
  float air = 0.0;
  for (int i = 0; i < 4; i++) if (uLK[i] > 0.0) { float dA = segSeg(cameraPosition, cameraPosition + Rd * dC, uLA[i], uLB[i]); air += uLK[i] * (exp(-dA * dA / 0.05) * 0.8 + exp(-dA * dA / 0.6) * 0.35); }
  return uLightC * uAirK * air * (1.0 - exp(-dC * 0.08));
}
`;
const G_BUMP = /* glsl */`
vec3 bumpN(vec3 P, vec3 N, float h, float k) {
  vec3 dpx = dFdx(P), dpy = dFdy(P);
  vec3 r1 = cross(dpy, N), r2 = cross(N, dpx);
  float det = dot(dpx, r1);
  vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  vec3 Nb = abs(det) * N - k * grad;
  return dot(Nb, Nb) > 1e-14 ? normalize(Nb) : N;
}
`;
// VỎ TUYẾT TÙNG (thân cây, gốc cây, vỏ khúc gỗ): sợi vỏ dài dọc thân, xoắn nhẹ, bong thành dải; rãnh nứt dọc chỉ làm sẫm màu
const BARK = /* glsl */`
void barkAt(vec2 p, float sd, float fw, out float hgt, out vec3 alb, out float crack) {
  float uu = p.x + p.y * 0.035 * (sd - 0.5);
  float k2 = 1.0 - smoothstep(0.012, 0.035, fw), k3 = 1.0 - smoothstep(0.004, 0.014, fw);
  float a1 = vnA(vec2(uu * 7.0 + sd * 91.0, p.y * 0.25));
  float a2 = vn(vec2(uu * 19.0 - sd * 37.0, p.y * 0.7));
  float a3 = vn(vec2(uu * 47.0 + 3.0, p.y * 2.4));
  float ridge = 1.0 - abs(2.0 * a1 - 1.0);
  hgt = ridge * 0.5 + mix(0.5, a2, k2) * 0.32 + mix(0.5, a3, k3) * 0.18;
  float cn = vnA(vec2(uu * 10.0 + sd * 13.0, p.y * 0.15));
  crack = (1.0 - smoothstep(0.015, 0.06, abs(cn - 0.5))) * (1.0 - smoothstep(0.02, 0.06, fw));
  float strip = smoothstep(0.35, 0.7, vn(vec2(uu * 2.4 + sd * 13.0, p.y * 0.1)));
  alb = mix(vec3(0.235, 0.083, 0.042), vec3(0.13, 0.088, 0.064), 0.3 + 0.55 * strip) * (0.5 + 0.8 * hgt);
  float peel = smoothstep(0.78, 0.86, vn(vec2(uu * 4.0 + 7.0, p.y * 0.35 + sd * 5.0))) * k2;
  alb = mix(alb, vec3(0.33, 0.12, 0.055), peel * 0.65);
  alb *= 1.0 - 0.6 * crack;
  alb = pal(alb * 1.35, 0.5 + 0.15 * peel);
}`;
const mkMat = (name, vs, fs, U, extra = {}, opt = {}) => new THREE.ShaderMaterial({
  name, vertexShader: vs, fragmentShader: fs, uniforms: { ...U, ...extra }, side: THREE.DoubleSide, ...opt,
});
const VS_BASE = G_DECL + G_NOISE + G_MOON + G_FOG;        // đỉnh: sương + trăng
const FS_BASE = G_DECL + G_NOISE + G_PAL;                 // điểm ảnh: nhiễu + bảng màu

// ── THÂN NHÂN BẢN: một lưới cho mọi cây; dáng (thuôn, bạnh rễ, nghiêng) tính trong shader. Sương + trăng tính ở đỉnh ──
const TRUNK_VS = VS_BASE + /* glsl */`
attribute vec3 aT;   // θ, m (mét — vòng sát gốc), f (phần của chiều cao)
attribute vec4 iA;   // x, y0, z, h
attribute vec4 iB;   // r0, nghiêng x, nghiêng z, hạt
attribute vec4 iC;   // cao chỗ cưa (gốc cây đã hạ; 0 = cây đứng), sắc vỏ
varying vec3 vW; varying vec3 vN; varying vec4 vI; varying vec4 vFog; varying float vGap;
float rTaper(float y, float h, float r0) { return r0 * pow(max(1.0 - 0.93 * clamp(y / h, 0.0, 1.0), 0.0), 0.8) + 0.02; }
float rProf(float y, float h, float r0, float th, float sd) {
  float r = rTaper(y, h, r0);
  float lobe = 0.55 * pow(max(0.0, cos(5.0 * th + sd * 40.0)), 3.0) + 0.45 * pow(max(0.0, cos(3.0 * th + sd * 17.0)), 4.0);
  float yy = max(y, 0.0);
  return r * (1.0 + exp(-yy / 0.7) * (0.35 + 1.25 * lobe) + 0.12 * exp(-yy / 2.5));
}
void main() {
  float h = iA.w, r0 = iB.x, sd = iB.w;
  float th = aT.x, y = aT.y + aT.z * h;
  if (iC.x > 0.0) y = min(y, iC.x);
  float r = rProf(y, h, r0, th, sd);
  float ry = (rProf(y + 0.04, h, r0, th, sd) - rProf(max(y - 0.04, -0.5), h, r0, th, sd)) / 0.08;
  float rt = (rProf(y, h, r0, th + 0.01, sd) - rProf(y, h, r0, th - 0.01, sd)) / 0.02;
  vec3 rad = vec3(cos(th), 0.0, sin(th)), tg = vec3(-sin(th), 0.0, cos(th));
  float yl = max(y, 0.0);
  vec3 P = vec3(iA.x + iB.y * yl * (1.0 + 0.004 * yl), iA.y + y, iA.z + iB.z * yl * (1.0 + 0.004 * yl)) + rad * r;
  vec3 dY = vec3(iB.y, 1.0, iB.z) + rad * ry, dT = tg * r + rad * rt;
  vN = normalize(cross(dY, dT));
  vW = P;
  vI = vec4(th, y, rTaper(y, h, r0), sd + iC.y * 7.0);
  vFog = fogV(P);
  vGap = moonGap(P);
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}`;
const TRUNK_FS = FS_BASE + G_MOON + G_INK + G_BUMP + BARK + /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec4 vI; varying vec4 vFog; varying float vGap;
void main() {
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
  if (dot(N, V) < -0.2) N = -N;
  float th = vI.x, y = vI.y, sd = vI.w;
  float fwP = length(fwidth(vW));
  float hgt, crack; vec3 alb;
  float u = th * vI.z;
  barkAt(vec2(u, y), sd, fwP, hgt, alb, crack);
  float moss = (1.0 - smoothstep(0.1, 1.2 + 1.2 * vn(vec2(u * 1.3, 2.0)), y)) * smoothstep(0.3, 0.62, vn(vec2(u * 3.0, y * 1.5)) + 0.15 * N.z);
  alb = mix(alb, pal(vec3(0.03, 0.05, 0.022) * (0.7 + 0.6 * hgt), 0.0), moss * 0.85);
  N = bumpN(vW, N, hgt, 0.035 * (1.0 - smoothstep(0.02, 0.08, fwP)));
  vec3 c = alb * (ambMoon(N, vW, vGap) + inkLight(vW, N));
  gl_FragColor = vec4(c * vFog.a + vFog.rgb, 1.0);
}`;

// ── CHÙM LÁ KIM: tấm quay về máy, treo từ đầu cành; ánh sáng + sương tính ở đỉnh ──
const CARD_VS = VS_BASE + /* glsl */`
attribute vec2 aC; attribute vec4 iP; attribute vec4 iQ; attribute vec3 iO;
varying vec2 vUV; varying vec4 vQ; varying vec3 vL; varying vec3 vT; varying vec4 vFog;
void main() {
  float c = cos(iQ.x), s = sin(iQ.x);
  vec2 k = aC * iP.w;
  k = vec2(c * k.x - s * k.y, s * k.x + c * k.y);
  vec3 camR = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camU = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  vec3 W = iP.xyz + camR * k.x + camU * k.y;
  vUV = vec2(aC.x + 0.5, aC.y + 1.0);
  vQ = iQ;
  vec3 N = normalize(iO * 0.9 + vec3(0.0, 0.5 + 0.4 * aC.y + 0.4, 0.0));
  vL = ambMoon(N, W, moonGap(iP.xyz));
  vec3 V = normalize(cameraPosition - W);
  vT = uMoonC * 1.6 * pow(max(dot(-V, uMoonDir), 0.0), 5.0) * iQ.z;
  vFog = fogV(W);
  gl_Position = projectionMatrix * viewMatrix * vec4(W, 1.0);
}`;
const CARD_FS = G_PAL + /* glsl */`
uniform sampler2D uSpray;
varying vec2 vUV; varying vec4 vQ; varying vec3 vL; varying vec3 vT; varying vec4 vFog;
void main() {
  vec2 uv = (clamp(vUV, 0.004, 0.996) + vec2(mod(vQ.y, 2.0), floor(vQ.y / 2.0))) * 0.5;
  vec4 t = texture2D(uSpray, uv);
  float tpp = max(fwidth(vUV.x), fwidth(vUV.y)) * 256.0;
  if (t.a < mix(0.5, 0.16, smoothstep(1.0, 14.0, tpp))) discard;
  vec3 alb = pal(vec3(0.020, 0.034, 0.022), 0.0) * (0.45 + 0.95 * t.r) * (0.5 + 0.5 * vQ.z);
  gl_FragColor = vec4(alb * (vL + vT) * vFog.a + vFog.rgb, 1.0);
}`;

// ── CÀNH (cành khô dưới tán, cành trong tán, rễ nổi, cành rơi) — ống nhân bản, sáng + sương ở đỉnh ──
const STICK_VS = VS_BASE + G_INK + /* glsl */`
attribute vec3 aS; attribute vec4 iS; attribute vec4 iE;
varying vec3 vC; varying vec4 vFog; varying vec2 vL;
void main() {
  vec3 ax = iE.xyz - iS.xyz;
  vec3 d = normalize(ax);
  vec3 b1 = normalize(abs(d.y) < 0.95 ? cross(d, vec3(0.0, 1.0, 0.0)) : cross(d, vec3(1.0, 0.0, 0.0)));
  vec3 b2 = cross(d, b1);
  vec3 n = b1 * cos(aS.x) + b2 * sin(aS.x);
  vec3 W = iS.xyz + ax * aS.y + n * mix(iS.w, iE.w, aS.y);
  vL = vec2(aS.x * mix(iS.w, iE.w, aS.y), aS.y * length(ax));
  vC = ambMoon(n, W, moonGap(W)) + inkLight(W, n);
  vFog = fogV(W);
  gl_Position = projectionMatrix * viewMatrix * vec4(W, 1.0);
}`;
const STICK_FS = FS_BASE + /* glsl */`
varying vec3 vC; varying vec4 vFog; varying vec2 vL;
void main() {
  float n = vn(vec2(vL.x * 30.0, vL.y * 4.0));
  vec3 alb = pal(mix(vec3(0.13, 0.11, 0.095), vec3(0.17, 0.10, 0.065), n), 0.35) * (0.7 + 0.5 * vn(vec2(vL.y * 1.3, 3.0)));
  gl_FragColor = vec4(alb * vC * vFog.a + vFog.rgb, 1.0);
}`;

// ── DƯƠNG XỈ: lá nhân bản cong vòng, lá chét cắt bằng shader ──
const FERN_VS = VS_BASE + G_INK + /* glsl */`
attribute vec2 aF; attribute vec4 iF; attribute vec4 iG;
varying vec2 vF; varying vec3 vC; varying vec4 vFog;
void main() {
  float L = iF.w, az = iG.x, el = iG.y, ar = iG.z, W = iG.w;
  vec3 d = vec3(cos(az), 0.0, sin(az)), sd = vec3(-sin(az), 0.0, cos(az));
  float s = aF.x;
  vec3 P = iF.xyz + d * (L * s * cos(el) * (1.0 - 0.25 * s)) + vec3(0.0, L * (s * sin(el) - ar * s * s), 0.0);
  P += sd * aF.y * W * L * 0.5;
  P.y += abs(aF.y) * W * L * 0.12;
  vF = aF;
  vec3 N = normalize(vec3(0.0, 1.0, 0.0) - d * (sin(el) - 2.0 * ar * s) * 0.6);
  vC = ambMoon(N, P, moonGap(P)) + inkLight(P, N) + inkLight(P, -N) * 0.8;
  vFog = fogV(P);
  gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0);
}`;
const FERN_FS = FS_BASE + /* glsl */`
varying vec2 vF; varying vec3 vC; varying vec4 vFog;
void main() {
  float s = vF.x, w = abs(vF.y);
  float T = pow(max(sin(3.14159 * clamp(s * 1.05, 0.0, 1.0)), 0.0), 0.55) * (1.0 - 0.35 * s);
  float q = s * 17.0 - w * 1.1;
  float f = q - floor(q + 0.5);
  float pw = 0.34 * (1.0 - w / max(T, 1e-3)) + 0.06 + 0.05 * sin(w * 42.0);
  float fw = fwidth(q) * 0.8;
  float inside = (1.0 - smoothstep(pw - fw, pw + fw, abs(f))) * (1.0 - smoothstep(T - 0.04, T, w));
  inside = max(inside, 1.0 - smoothstep(0.025, 0.05, w));
  if (inside < 0.5 || s < 0.04) discard;
  vec3 alb = pal(vec3(0.05, 0.10, 0.045), 0.12) * (0.75 + 0.5 * vn(vec2(s * 9.0, w * 5.0)));
  gl_FragColor = vec4(alb * vC * vFog.a + vFog.rgb, 1.0);
}`;

// ── ĐẤT RỪNG: lá kim rụng, rêu, mùn cưa quanh khúc gỗ và gốc cây ──
const GROUND_VS = VS_BASE + /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec4 vFog; varying float vGap;
void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; vN = normal; vFog = fogV(vW); vGap = moonGap(vW); gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const GROUND_FS = FS_BASE + G_MOON + G_INK + G_BUMP + /* glsl */`
uniform vec4 uSaw[4];
varying vec3 vW; varying vec3 vN; varying vec4 vFog; varying float vGap;
void main() {
  vec2 p = vW.xz;
  float fwP = length(fwidth(vW));
  float kF = 1.0 - smoothstep(0.01, 0.05, fwP);
  vec2 pr = mat2(0.8, -0.6, 0.6, 0.8) * p, pq = mat2(0.28, 0.96, -0.96, 0.28) * p;
  float n1 = vn(p * 0.33), n2 = vn(pr * 2.1 + 3.0), n3 = mix(0.5, vn(pq * 9.0 + 1.0), kF);
  float st = 0.0;
  if (kF > 0.01) {
    vec2 r1 = mat2(0.8, 0.6, -0.6, 0.8) * p, r2 = mat2(0.2, -0.98, 0.98, 0.2) * p;
    st = max(smoothstep(0.6, 0.82, vnA(r1 * vec2(30.0, 3.5))), smoothstep(0.62, 0.84, vnA(r2 * vec2(3.5, 30.0) + 9.0))) * kF;
  }
  vec3 litter = mix(vec3(0.075, 0.04, 0.024), vec3(0.115, 0.055, 0.03), st) * (0.8 + 0.4 * n3) * (0.85 + 0.3 * n2);
  vec3 moss = vec3(0.03, 0.046, 0.024) * (0.7 + 0.6 * n2);
  float dc = length(p - uClear.xy);
  float mk = smoothstep(0.45, 0.8, n1 * 0.85 + n2 * 0.15) * (0.2 + 0.8 * smoothstep(uClear.z - 4.0, uClear.z + 6.0, dc)) * 0.8;
  vec3 alb = mix(litter, moss, mk);
  float saw = 0.0;
  for (int i = 0; i < 4; i++) { float d = length(p - uSaw[i].xy) / uSaw[i].z; saw = max(saw, uSaw[i].w * (1.0 - smoothstep(0.35, 1.0 + 0.35 * (n2 - 0.5), d))); }
  alb = mix(alb, vec3(0.33, 0.25, 0.15) * (0.75 + 0.5 * n3), saw * smoothstep(0.25, 0.6, n3 * 0.5 + 0.5 * saw));
  alb = pal(alb, 0.25 + 0.25 * saw);
  vec3 N = bumpN(vW, normalize(vN), n3 * 0.6 + st * 0.4, 0.012 * kF);
  vec3 c = alb * (ambMoon(N, vW, vGap) + inkLight(vW, N));
  gl_FragColor = vec4(c * vFog.a + vFog.rgb, 1.0);
}`;

// ── GỖ: khúc gỗ (thân + hai mặt cắt) · mặt cưa gốc cây. Dây mực, mực bắn, dấu bút tre, chữ 井 vẽ ngay trong shader ──
const WOOD_VS = VS_BASE + /* glsl */`
attribute vec4 aL;   // loại (0 thân gỗ · 1 mặt cắt đầu gốc · 2 mặt cắt đầu ngọn · 3 mặt cưa gốc cây), a, b, bán kính mặt
varying vec3 vW; varying vec3 vN; varying vec4 vL; varying vec4 vFog; varying float vGap;
void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; vN = normalize(mat3(modelMatrix) * normal); vL = aL; vFog = fogV(vW); vGap = moonGap(vW); gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const WOOD_FS = FS_BASE + G_MOON + G_INK + G_BUMP + BARK + /* glsl */`
uniform vec4 uLog;      // x đầu gốc, r đầu gốc, r đầu ngọn, dài
uniform vec4 uLn[3];    // dây mực: φ, đã vẽ tới (phần chiều dài 0…1, từ đầu gốc), độ sáng, 0
uniform vec4 uMk[12];   // nét bút tre: (x, S) đầu → (x, S) cuối — S = cung tính từ φ = 0
uniform vec4 uMkB[12];  // nửa bề rộng, hạt, độ sáng, đã viết tới (0…1)
uniform float uMarks, uFace, uFaceInk;
varying vec3 vW; varying vec3 vN; varying vec4 vL; varying vec4 vFog; varying float vGap;
vec3 endGrain(vec2 q, float Rf, float sd, float fw, out float late, out float hgt) {
  // TÂM LỆCH (cây mọc trên dốc: gỗ nén một phía) — vòng năm dày phía dưới dốc, mỏng phía trên dốc, lượn thuỳ, không tròn đều
  vec2 p = q - vec2(0.10, -0.07) * Rf / 0.46;
  float ang = atan(p.y, p.x);
  float r0 = length(p);
  float ecc = 1.0 + 0.24 * cos(ang - 2.3) + 0.06 * cos(2.0 * ang + sd);
  float lobe = 0.05 * (vnA(vec2(ang * 1.6 + sd * 7.0, r0 * 3.0)) - 0.5) + 0.035 * (vnA(vec2(ang * 4.5 - sd, r0 * 9.0)) - 0.5) * smoothstep(0.02, 0.2, r0);
  float rad = r0 * ecc * (1.0 + lobe);
  // năm tốt / năm xấu: vòng rộng hẹp thất thường (tích luỹ nhiễu theo bán kính), vài vòng rất sát nhau
  float yr = rad / 0.019 + 5.0 * vnA(vec2(rad * 3.5, sd * 3.0)) + 2.0 * vnA(vec2(rad * 11.0, sd * 5.0)) + 0.9 * vnA(vec2(ang * 3.0 + sd, rad * 6.0));
  float f = fract(yr);
  float yk = 0.2 + 0.9 * pow(hash12(vec2(floor(yr), sd)), 1.5);
  float aa = smoothstep(0.12, 0.34, fwidth(yr));
  // gỗ muộn: một vạch mảnh sẫm, đậm nhạt khác nhau từng năm, đứt quãng chỗ gỗ xơ
  float lw = smoothstep(0.7, 0.9, f) * (1.0 - smoothstep(0.93, 1.0, f)) * yk * (0.7 + 0.3 * vnA(vec2(ang * 20.0, floor(yr))));
  late = mix(lw, 0.3, aa);
  float heart = 1.0 - smoothstep(0.62 * Rf, 0.70 * Rf, rad * (1.0 + 0.05 * (vnA(vec2(ang * 3.0, 1.0)) - 0.5)));
  vec3 c = mix(vec3(0.62, 0.53, 0.43), vec3(0.50, 0.37, 0.30), heart) * (1.0 - 0.34 * late);
  // loang ẩm, nhựa, bẩn mùn cưa: mảng lớn không đều (mặt gỗ không phải một mặt phẳng đều màu)
  c *= 0.86 + 0.2 * vnA(p * 9.0 + sd) + 0.08 * vnA(p * 34.0 - sd);
  float cr = 0.0;
  for (int i = 0; i < 3; i++) {
    float ac = sd * 5.0 + float(i) * 2.2 + 0.05 * (vnA(vec2(r0 * 25.0, float(i) * 7.0)) - 0.5);
    float da = abs(fract((ang - ac) / 6.2832 + 0.5) - 0.5) * 6.2832 * r0;
    cr = max(cr, (1.0 - smoothstep(0.0006, 0.0028, da)) * smoothstep(0.03, 0.07, r0) * (1.0 - smoothstep((0.3 + 0.1 * float(i)) * Rf, (0.5 + 0.1 * float(i)) * Rf, r0)));
  }
  c *= 1.0 - 0.75 * cr;
  float rim = smoothstep(Rf - 0.035, Rf - 0.022, length(q));
  c = mix(c, vec3(0.10, 0.07, 0.05), rim);
  hgt = late * 0.12 - cr;
  // gần trung tính, ấm rất nhẹ (sau lớp nắn màu đêm: xám be, bão hoà thấp — không lục, không ô-liu)
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return l * vec3(1.12, 1.0, 0.88);
}
// NÉT CỌ trên mặt cắt (井 kẻ bằng bút tre 墨差し, thước áp): đầu ấn đậm phình, thân dày mỏng theo tay, đuôi thon và khô, xơ khô
// (lông bút để vệt hở dọc nét), mực loang theo vân gỗ sớm. Trả độ phủ; ctr = lõi ướt; dens = độ đậm mực.
float faceStroke(vec2 p, vec2 A, vec2 B, float w, float sd, float fw, float stop, float late, out float ctr, out float dens) {
  ctr = 0.0; dens = 0.0;
  vec2 ab = B - A; float L = length(ab); vec2 d = ab / L, n = vec2(-d.y, d.x);
  float s = dot(p - A, d), x = dot(p - A, n);
  if (s < -w * 3.0 || s > L + w * 3.0 || abs(x) > w * 4.0) return 0.0;
  float ss = clamp(s, 0.0, L), t = ss / L;
  x -= 0.0022 * sin(ss * 9.0 + sd) + 0.0015 * (vnA(vec2(ss * 14.0, sd)) - 0.5);        // tay kéo: hơi lượn
  x += 0.45 * w * exp(-ss / (w * 2.5));                                                 // 起筆: đầu bút đặt chéo, phình lệch một bên
  float press = 1.0 + 1.5 * exp(-ss / (w * 2.8));                                       // đầu ấn: phình hơn gấp đôi
  float body = (0.4 + 1.0 * vnA(vec2(ss * 3.2, sd))) * (0.88 + 0.24 * vnA(vec2(ss * 24.0, sd + 3.0)));   // lực tay: to nhỏ rõ
  float tail = stop > 0.5 ? 1.0 + 0.35 * exp(-(L - ss) / (w * 1.8)) : mix(1.0, 0.06, pow(smoothstep(L - w * 16.0, L, ss), 0.7));
  float wd = max(w * press * body * tail, fw * 0.8);
  float soak = 1.0 - late;
  float dist = length(vec2(s - ss, x)) - 0.4 * w * (0.4 + soak) * (vnA(p * 420.0 + sd) - 0.35);   // mép rách, ăn theo vân: gỗ sớm hút mực
  float c = 1.0 - smoothstep(wd - fw, wd + fw, dist);
  // xơ khô 掠れ: cạn mực từ giữa nét, lông bút để vệt hở dọc nét; mép xơ trước lõi
  float dry = smoothstep(0.25, 0.9, t) + 0.45 * smoothstep(0.5, 1.0, abs(x) / max(wd, 1e-4));
  float hair = vnA(vec2(ss * 16.0, x / max(w, 1e-4) * 5.0 + sd));
  c *= mix(0.85 + 0.15 * hair, smoothstep(0.45, 0.55, hair), clamp(dry, 0.0, 1.0));
  dens = mix(1.0, 0.5, smoothstep(0.1, 1.0, t)) * (0.8 + 0.2 * vnA(vec2(ss * 3.0, sd + 9.0)));
  ctr = smoothstep(0.2, 0.85, 1.0 - clamp(abs(x) / max(wd, 1e-4), 0.0, 1.0)) * (1.0 - 0.85 * smoothstep(0.0, 0.55, t));
  return c;
}
// nét bút tre 墨差し: đầu nét ấn đậm, thân đều, đuôi thon và khô; B.w = đã viết tới (đầu bút tròn, ướt)
float penStroke(vec2 p, vec4 A, vec4 B, float fw, out float wetK) {
  wetK = 0.0;
  if (B.w <= 0.0) return 0.0;
  vec2 ab = A.zw - A.xy; float L = max(length(ab), 1e-4); vec2 d = ab / L, n = vec2(-d.y, d.x);
  float s = dot(p - A.xy, d), t = s / L, x = dot(p - A.xy, n);
  float w = B.x, te = min(B.w, 1.0);
  if (t < -0.3 || t > te + 0.3 || abs(x) > w * 3.0) return 0.0;
  float tt = clamp(t, 0.0, te);
  float wd = w * (1.0 + 0.55 * exp(-tt * 10.0)) * mix(1.0, 0.3, smoothstep(0.55, 1.0, tt)) * (0.88 + 0.24 * vn(vec2(s * 300.0, B.y)));
  float dist = t < 0.0 ? length(p - A.xy) : (t > te ? length(p - A.xy - d * L * te) * (te >= 1.0 ? 3.0 : 1.0) : abs(x));
  float cov = 1.0 - smoothstep(wd - fw, wd + fw, dist);
  cov *= mix(1.0, smoothstep(0.25, 0.55, vn(vec2(x / w * 2.5 + B.y, s * 60.0))), smoothstep(0.6, 1.0, tt));
  if (te < 1.0) wetK = cov * exp(-max(te - t, 0.0) * L / 0.025);
  return cov;
}
void main() {
  float kind = vL.x;
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
  if (dot(N, V) < -0.2) N = -N;
  float fwP = length(fwidth(vW));
  vec3 alb; float hgt = 0.5, cov = 0.0;
  vec3 em = vec3(0.0);
  if (kind < 0.5) {
    // ── THÂN KHÚC GỖ: vỏ bóc một dải lưng, lộ gỗ giác; mặt dao bóc thành từng dải (vết dao) ──
    float x = vL.y, phi = vL.z;
    float r = mix(uLog.y, uLog.z, (x - uLog.x) / uLog.w);
    float S = r * phi;
    float fwS = clamp(length(vec2(dFdx(S), dFdy(S))), 1e-4, 0.05);
    float strip = 0.6 * vnA(vec2(x * 0.9 + 3.0, phi * 1.8 + 5.0)) + 0.22 * vnA(vec2(x * 2.6, phi * 3.6))
                + 0.6 * cos(phi - 1.1) + 0.12 * (1.0 - smoothstep(-4.5, 3.5, x)) - 0.33
                // chỗ thợ viết dấu bút tre (gần đầu gốc, mặt trước): vỏ đã bóc sạch, mặt gỗ phẳng
                + 0.45 * (1.0 - smoothstep(1.05, 1.3, x - uLog.x)) * (1.0 - smoothstep(0.62, 0.85, abs(phi - 0.1)));
    float edgeN = 0.06 * (vnA(vec2(x * 13.0, phi * 11.0)) - 0.5);
    float woodK = smoothstep(0.515, 0.535, strip + edgeN);
    float bh = 0.5, crack = 0.0; vec3 balb = vec3(0.0);
    if (woodK < 0.999) barkAt(vec2(S, x), 0.61, fwP, bh, balb, crack);
    float kG = 1.0 - smoothstep(0.004, 0.012, fwS);
    // thớ dọc: sợi ngắn đứt quãng, tương phản thấp (gỗ tươi nhám, không phải vệt chải dài của kim loại)
    float grain = mix(0.5, vnA(vec2(x * 3.5, S * 70.0)), kG) * 0.6 + vnA(vec2(x * 0.9, S * 22.0)) * 0.4;
    // VẾT DAO: nhát dao bóc NGẮN (15–35 cm) so le — mỗi nhát một mặt hơi lõm, mép nhát là gờ xơ; không nhát nào chạy hết thân
    float fq = S * 7.5 + 0.9 * vnA(vec2(x * 0.3, 2.0));
    float fid = floor(fq), ff = fract(fq);
    float xq = x / (0.15 + 0.2 * hash12(vec2(fid, 4.0))) + hash12(vec2(fid, 2.0)) * 3.0;
    float cid = floor(xq), cf = fract(xq);
    float tilt = (hash12(vec2(fid, cid)) - 0.5) * 0.22;
    float scoop = (cf - 0.5) * (cf - 0.5) * 4.0;                                  // lòng nhát dao: sâu giữa, nông hai đầu
    float ridgeL = (1.0 - smoothstep(0.0, 0.07 + fwS * 7.5, min(ff, 1.0 - ff))) * kG;
    float endL = (1.0 - smoothstep(0.0, 0.05 + fwS * 3.0, min(cf, 1.0 - cf) * (0.15 + 0.2 * hash12(vec2(fid, 4.0))) / 0.12)) * kG;
    // nhám: xơ gỗ bị dao xé ngược thớ (vệt ngắn), vết bẩn tay và mùn, loang ẩm
    float tear = smoothstep(0.66, 0.92, vnA(vec2(x * 4.0, S * 60.0))) * kG * 0.35;
    float blot = vnA(vec2(x * 1.3 + 7.0, S * 5.0)) * 0.6 + vnA(vec2(x * 4.0, S * 17.0)) * 0.4;
    vec3 wood = vec3(0.44, 0.34, 0.24) * (0.8 + 0.32 * grain) * (0.72 + 0.4 * blot) * (0.9 + 0.2 * hash12(vec2(fid, cid + 7.0))) * (1.0 - 0.14 * ridgeL - 0.1 * endL - 0.18 * tear) * (0.95 + 0.1 * scoop);
    float resid = woodK * (1.0 - smoothstep(0.535, 0.6, strip + edgeN)) * smoothstep(0.4, 0.7, vn(vec2(x * 5.0, S * 40.0)));
    wood = mix(wood, vec3(0.30, 0.12, 0.06), resid * 0.8);
    {
      vec2 kc = vec2(floor(x / 0.85), floor(phi / 0.9));
      if (hash12(kc + 5.3) < 0.45) {
        vec2 ko = (kc + 0.2 + 0.6 * vec2(hash12(kc + 1.7), hash12(kc + 8.1))) * vec2(0.85, 0.9);
        vec2 dk = vec2((x - ko.x) / 1.7, r * (phi - ko.y));
        float kr = 0.018 + 0.02 * hash12(kc + 3.3), dl = length(dk);
        float knot = 1.0 - smoothstep(kr * 0.8, kr * 1.15, dl);
        float ringk = smoothstep(kr * 1.1, kr * 1.4, dl) * (1.0 - smoothstep(kr * 1.6, kr * 2.4, dl));
        wood = mix(wood, vec3(0.20, 0.09, 0.045), knot) * (1.0 - 0.18 * ringk);
        bh += 0.4 * (1.0 - smoothstep(kr, kr * 3.0, dl));
      }
    }
    { float lw = dot(wood, vec3(0.2126, 0.7152, 0.0722)); wood = lw * vec3(1.07, 1.0, 0.93); }   // gỗ lộ: gần trung tính, ấm rất nhẹ (như mặt cắt)
    alb = mix(balb, wood, woodK);
    alb *= mix(1.0, 0.55, woodK * (1.0 - smoothstep(0.535, 0.56, strip + edgeN)));
    hgt = mix(bh, 0.5 + 0.08 * grain + 0.25 * tear - 0.1 * scoop, woodK);
    // nghiêng pháp tuyến theo nhát dao (không qua đạo hàm màn hình) — nhẹ, từng nhát ngắn
    vec3 tS = vec3(0.0, cos(phi), -sin(phi));
    N = normalize(N + tS * tilt * woodK * 0.5 + vec3(1.0, 0.0, 0.0) * (cf - 0.5) * 0.12 * woodK);
    // ── DÂY MỰC 墨壺: thẳng, mảnh, sắc; lấm tấm mực bắn; ở xa vẫn giữ ít nhất ~1 điểm ảnh + quầng mềm ──
    for (int k = 0; k < 3; k++) {
      vec4 Lk = uLn[k];
      if (Lk.y <= 0.0) continue;
      float xe = uLog.x + uLog.w * Lk.y;
      if (x > xe + 0.05) continue;
      float dphi = phi - Lk.x; dphi = dphi - 6.2832 * floor(dphi / 6.2832 + 0.5);
      float dS = r * dphi;
      float hw = max(0.05, fwS * 10.0);
      if (abs(dS) > hw * 2.0) continue;
      // đầu nét: tròn, mềm vài mm — phần phía sau đầu nét đã vẽ xong, đứng yên
      float drawn = Lk.y >= 1.0 ? 1.0 : 1.0 - smoothstep(xe - 0.012 - fwS, xe + fwS, x);
      // nhìn từ xa (góc rộng đầu chương): nét dày tối thiểu ~3 điểm ảnh và sáng hơn — ngang nét ở ruộng
      float far = smoothstep(0.003, 0.009, fwS);
      float w = 0.0026 * (0.85 + 0.3 * vn(vec2(x * 22.0, float(k) * 7.0)));
      float wd = max(w, fwS * mix(0.75, 1.5, far));
      float core = (1.0 - smoothstep(wd - fwS * 0.5, wd + fwS * 0.5, abs(dS))) * drawn;
      float dn = 0.72 + 0.28 * vn(vec2(x * 5.0 + float(k) * 3.0, 1.0));
      dn *= mix(1.0, smoothstep(0.35, 0.62, bh + 0.1), 1.0 - woodK);
      float sp = 0.0;
      vec2 cell = vec2(floor(x / 0.014), floor(dS / 0.011));
      vec2 cc = (cell + 0.5) * vec2(0.014, 0.011);
      float prob = 0.55 * exp(-abs(cc.y) / 0.02) * step(0.007, abs(cc.y)) * step(cc.x, xe - 0.01);
      if (hash12(cell + float(k) * 31.7) < prob) {
        vec2 off = (vec2(hash12(cell + 3.1), hash12(cell + 7.7)) - 0.5) * vec2(0.007, 0.005);
        float rd = 0.0009 + 0.0024 * pow(hash12(cell + 9.3), 2.0);
        sp = 1.0 - smoothstep(rd - fwS, rd + fwS, length(vec2(x, dS) - cc - off));
      }
      float c = max(core * dn, sp * 0.85);
      cov = max(cov, c);
      float hs = max(0.012, fwS * 3.0);
      float boost = 1.0 + 0.7 * far;
      em += Lk.z * boost * (uInkCore * core * dn * mix(1.0, w / wd, 0.25) + uInkBody * sp * 0.6 + uInkHalo * drawn * (exp(-abs(dS) / hs) * 0.4 + exp(-abs(dS) / hw) * (0.05 + 0.1 * far)));
    }
    // ── DẤU BÚT TRE 墨差し (viết từng nét) ──
    if (uMarks > 0.0 && x < uLog.x + 1.1) {
      float mc = 0.0, wet = 0.0;
      for (int i = 0; i < 12; i++) {
        if (uMkB[i].x <= 0.0 || uMkB[i].w <= 0.0) continue;
        float wk;
        mc = max(mc, penStroke(vec2(x, S), uMk[i], uMkB[i], fwS, wk) * uMkB[i].z);
        wet = max(wet, wk);
      }
      mc *= mix(1.0, smoothstep(0.3, 0.6, bh + 0.1), 1.0 - woodK);
      cov = max(cov, mc);
      em += uMarks * (mc * uInkBody * 0.85 + wet * uInkCore * 0.6);
    }
    N = bumpN(vW, N, hgt, 0.03 * (1.0 - smoothstep(0.02, 0.08, fwP)));
  } else {
    // ── MẶT CẮT (khúc gỗ hai đầu · gốc cây): vòng năm, vết cưa; đầu gốc có chữ 井 kẻ mực ──
    vec2 q = vL.yz; float Rf = vL.w;
    float late, h2;
    alb = endGrain(q, Rf, kind > 2.5 ? 2.3 : kind > 1.5 ? 5.1 : 0.7, fwP, late, h2);
    hgt = h2;
    if (kind > 2.5) {
      float hb = abs(q.y - 0.16 * Rf) - 0.028 - 0.01 * vn(vec2(q.x * 30.0, 2.0));
      float hinge = 1.0 - smoothstep(0.0, 0.004, hb);
      alb = mix(alb, alb * (0.55 + 0.5 * vn(vec2(q.x * 80.0, q.y * 8.0))), hinge);
      hgt += hinge * vn(vec2(q.x * 60.0, q.y * 6.0));
    }
    if (kind < 1.5) {
      float fwQ = clamp(length(vec2(length(dFdx(q)), length(dFdy(q)))), 1e-4, 0.05);
      float hh = 0.6 * Rf, cc = 0.84 * Rf;
      float ink = 0.0, core = 0.0, halo = 0.0;
      for (int i = 0; i < 4; i++) {
        vec2 A, B; float stop = 1.0, sd = 3.1 + float(i) * 5.7;
        if (i == 0) { A = vec2(-cc, hh + 0.004); B = vec2(cc - 0.02, hh - 0.006); }
        else if (i == 1) { A = vec2(-cc + 0.015, -hh - 0.003); B = vec2(cc, -hh + 0.005); }
        else if (i == 2) { A = vec2(-hh - 0.004, cc - 0.01); B = vec2(-hh + 0.012, -cc); stop = 0.0; }
        else { A = vec2(hh + 0.003, cc); B = vec2(hh - 0.004, -cc + 0.02); }
        // đầu / cuối nét không vượt mép gỗ
        float ct, dn;
        float cv = faceStroke(q, A, B, 0.012, sd, fwQ, stop, late, ct, dn) * (1.0 - smoothstep(Rf - 0.035, Rf - 0.02, length(q)));
        ink = max(ink, cv * dn);
        core = max(core, cv * ct * dn);
        vec2 ab = B - A; float h2c = clamp(dot(q - A, ab) / dot(ab, ab), 0.0, 1.0);
        float dl = length(q - A - ab * h2c);
        halo = max(halo, exp(-dl / 0.03) * 0.3 * dn + exp(-dl / 0.08) * 0.1);
      }
      // 芯墨: dây mực búng qua tâm — thẳng, mảnh, nhạt, đứt quãng chỗ dây khô
      for (int i = 0; i < 2; i++) {
        float dd = i == 0 ? q.x : q.y, ext = i == 0 ? abs(q.y) : abs(q.x);
        float lim = sqrt(max(Rf * Rf - dd * dd, 0.0)) - 0.07;
        float wd = max(0.0016 * (0.85 + 0.3 * vnA(vec2(ext * 60.0, float(i) * 3.0))), fwQ * 0.6);
        float gapK = smoothstep(0.22, 0.4, vnA(vec2((i == 0 ? q.y : q.x) * 38.0, float(i) * 11.0)));
        float cv = (1.0 - smoothstep(wd - fwQ, wd + fwQ, abs(dd))) * (1.0 - smoothstep(lim - 0.004, lim + 0.006, ext)) * gapK * 0.55;
        ink = max(ink, cv);
        core = max(core, cv * 0.35);
      }
      cov = ink * uFaceInk;
      // thân nét là MỰC (sẫm hơn gỗ), lõi ướt sáng 緑青, quầng mềm loang trên mặt gỗ quanh nét — không phải vạch đèn đều
      em += uFace * (uInkCore * core * 0.75 + uInkBody * ink * 0.5 + uInkHalo * halo * 0.12);
    }
    N = bumpN(vW, N, hgt, 0.004 * (1.0 - smoothstep(0.01, 0.05, fwP)));
  }
  vec3 c = alb * (ambMoon(N, vW, vGap) + inkLight(vW, N));
  c = mix(c, uInkBase, cov * 0.8);
  gl_FragColor = vec4(c * vFog.a + vFog.rgb + em * (1.0 - 0.7 * (1.0 - vFog.a)), 1.0);
}`;

// ── GỖ KÊ 馬, dăm gỗ, mảnh vỏ bóc (hộp; thớ theo trục dài) ──
const BOX_VS = VS_BASE + G_INK + /* glsl */`
attribute vec3 aCol; attribute vec3 aAx;
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec3 vA; varying vec4 vFog; varying vec3 vLt;
void main() {
  vW = (modelMatrix * vec4(position, 1.0)).xyz; vN = normalize(mat3(modelMatrix) * normal); vC = aCol; vA = aAx;
  vFog = fogV(vW);
  // mặt dưới / mặt khuất của giá kê vẫn nhận ánh hắt từ nền mùn cưa sáng (không đen đặc)
  vLt = ambMoon(vN, vW, moonGap(vW)) + uMoonC * 0.22 * max(-vN.y, 0.0) + uSkyAmb * 0.7 + uMoonC * 0.12 + inkLight(vW, vN);
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;
const BOX_FS = FS_BASE + /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec3 vC; varying vec3 vA; varying vec4 vFog; varying vec3 vLt;
void main() {
  float along = dot(vW, vA);
  vec3 pp = vW - vA * along;
  float g = vn(vec2(along * 1.2, (pp.x + pp.y * 1.7 + pp.z * 0.6) * 70.0)) * 0.6 + vn(vec2(along * 5.0, (pp.x - pp.z) * 20.0)) * 0.4;
  vec3 alb = pal(vC * (0.72 + 0.45 * g), 0.45);
  gl_FragColor = vec4(alb * vLt * vFog.a + vFog.rgb, 1.0);
}`;

// ── TIA TRĂNG xuyên tán (ống mờ cộng sáng) ──
const SHAFT_VS = /* glsl */`
attribute vec2 aS; varying vec3 vW; varying vec3 vN; varying vec2 vS;
void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; vN = normalize(mat3(modelMatrix) * normal); vS = aS; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const SHAFT_FS = G_DECL + G_NOISE + /* glsl */`
uniform float uShaftK;
varying vec3 vW; varying vec3 vN; varying vec2 vS;
void main() {
  vec3 V = normalize(cameraPosition - vW);
  float e = pow(abs(dot(normalize(vN), V)), 2.2);
  float t = vS.y;
  float along = smoothstep(0.0, 0.35, t) * (1.0 - smoothstep(0.82, 1.0, t)) * (0.55 + 0.45 * t);
  float n = 0.55 + 0.45 * vn(vec2(vS.x * 3.0 + t * 1.5, t * 7.0 + vS.x));
  float dist = length(cameraPosition - vW);
  gl_FragColor = vec4(uMoonC * (uShaftK * e * along * n * exp(-dist * 0.018) * smoothstep(4.0, 12.0, dist)), 1.0);
}`;

// ── ẢNH CHÙM LÁ KIM tuyết tùng (vẽ bằng code, 4 kiểu, 256 điểm ảnh mỗi kiểu): mỗi chùm là một búi "sợi thừng" lá kim
// (lá kim ngắn hình dùi xếp xoắn ép sát cành con) rủ xuống, xoè thành túm — bộ sinh: mỗi lần next() vẽ một sợi thừng ──
function* sprayAtlas(out) {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S * 2;
  const g = cv.getContext('2d');
  g.lineCap = 'round';
  let sd = 4242; const r = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
  const path = (x, y, a, len, bend, n = 12) => {
    const pts = [[x, y]];
    for (let i = 0; i < n; i++) { a += (Math.PI / 2 - a) * bend / n + (r() - 0.5) * 0.07; x += Math.cos(a) * len / n; y += Math.sin(a) * len / n; pts.push([x, y]); }
    return pts;
  };
  // sợi thừng lá kim: lá ngắn, ép sát (góc nhỏ), dày đặc, đầu lá hơi cong
  const rope = (pts, nl, shade, w0 = 1) => {
    const n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      const tp = w0 * (1 - 0.35 * (i / n));
      for (let d = 0; d < L; d += 1.05) {
        const px = x0 + ux * d, py = y0 + uy * d;
        for (const side of [-1, 1]) {
          const a = side * (0.35 + r() * 0.45), ca = Math.cos(a), sa = Math.sin(a);
          const vx = ux * ca - uy * sa, vy = ux * sa + uy * ca;
          const l = nl * tp * (0.6 + r() * 0.5);
          const c = Math.round(shade * (0.72 + 0.28 * r()));
          g.strokeStyle = `rgb(${c},${c},${c})`;
          g.lineWidth = 1.1 + r() * 0.8;
          g.beginPath(); g.moveTo(px - vx * 1.5, py - vy * 1.5); g.quadraticCurveTo(px + vx * l * 0.5, py + vy * l * 0.5, px + vx * l, py + vy * l + l * 0.15); g.stroke();
        }
      }
    }
  };
  g.clearRect(0, 0, S * 2, S * 2);
  for (let v = 0; v < 4; v++) {
    const ox = (v % 2) * S, oy = Math.floor(v / 2) * S;
    const dense = v === 3;
    const nC = dense ? 9 : 5 + Math.floor(r() * 3);
    for (const [pass, shade] of [[0, 95], [1, 230]]) {
      for (let i = 0; i < nC; i++) {
        g.save(); g.translate(ox, oy); g.beginPath(); g.rect(0, 0, S, S); g.clip();
        const f = nC > 1 ? i / (nC - 1) - 0.5 : 0;
        const a0 = Math.PI / 2 + f * (dense ? 1.5 : 1.25) + (r() - 0.5) * 0.25 + (pass ? 0 : 0.12);
        const len = S * (dense ? 0.5 : 0.62 + 0.28 * r()) * (1 - 0.35 * Math.abs(f));
        const x0 = S / 2 + (r() - 0.5) * 16, y0 = 5 + r() * 10;
        const main = path(x0, y0, a0, len, 0.55, 12);
        rope(main, 6.5, shade, 1);
        g.restore();
        yield;
        g.save(); g.translate(ox, oy); g.beginPath(); g.rect(0, 0, S, S); g.clip();
        const nSub = 2 + Math.floor(r() * 2);
        for (let j = 0; j < nSub; j++) {
          const q = main[Math.floor((0.25 + 0.6 * r()) * (main.length - 1))];
          const sub = path(q[0], q[1], a0 + (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.35), len * (0.3 + r() * 0.25), 0.8, 7);
          rope(sub, 5.5, shade * 0.95, 0.9);
          g.restore();
          yield;
          g.save(); g.translate(ox, oy); g.beginPath(); g.rect(0, 0, S, S); g.clip();
        }
        g.restore();
        yield;
      }
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4;
  out.tex = t;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
export function createRung(renderer) {
  const scene = new THREE.Scene();
  scene.name = 'rung-tuyet-tung';
  const camera = new THREE.PerspectiveCamera(56, 1, 0.3, 4000);
  const col = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
  const noiseTex = new THREE.DataTexture(NOISE, NZ, NZ, THREE.RGBAFormat);
  noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping; noiseTex.magFilter = noiseTex.minFilter = THREE.LinearFilter;
  noiseTex.generateMipmaps = false; noiseTex.colorSpace = THREE.NoColorSpace; noiseTex.needsUpdate = true;
  const U = {
    uNoise: { value: noiseTex },
    uMoonDir: { value: MOON }, uMoonC: { value: col(0xa3aeaa, 0.95) },
    uSkyAmb: { value: col(0x3a403d, 0.85) }, uGndAmb: { value: col(0x1a1c19) },
    uFogC: { value: col(0x3a4a45) }, uFogLo: { value: col(0x313f3a) }, uFogHi: { value: col(0x2f3e39) },
    uFogD: { value: 0.0175 }, uHaze: { value: 0.7 }, uMist: { value: 0.7 }, uCanopyY: { value: CANOPY_Y },
    uClear: { value: new THREE.Vector3(CL.x, CL.z, CL.r) },
    uLightC: { value: new THREE.Color(RAMP[400]).lerp(new THREE.Color(0x9fb3ac), 0.1) }, uLightR: { value: 2.6 }, uAirK: { value: 0.13 },
    uLA: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }, uLB: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }, uLK: { value: [0, 0, 0, 0] },
    uLS: { value: new THREE.Vector4(0, LOG.yc, 0, 0) },
    uInkCore: { value: col(RAMP[300], 1.45) }, uInkBody: { value: col(RAMP[400], 1.25) }, uInkHalo: { value: col(RAMP[500], 0.9) },
    uInkBase: { value: col(RAMP[900], 0.35) },
  };
  const W = {
    uLog: { value: new THREE.Vector4(ex0, LOG.r0, LOG.r1, LOG.L) },
    uLn: { value: PHI.map((p) => new THREE.Vector4(p, 0, 0, 0)) },
    uMk: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
    uMkB: { value: Array.from({ length: 12 }, () => new THREE.Vector4()) },
    uMarks: { value: 0 }, uFace: { value: 0 }, uFaceInk: { value: 1 },
  };
  const SPRAY = { value: null };
  const M = {
    trunk: mkMat('rung-than', TRUNK_VS, TRUNK_FS, U, {}, { side: THREE.FrontSide }),
    card: mkMat('rung-la-kim', CARD_VS, CARD_FS, U, { uSpray: SPRAY }, { side: THREE.FrontSide }),
    stick: mkMat('rung-canh', STICK_VS, STICK_FS, U),
    fern: mkMat('rung-duong-xi', FERN_VS, FERN_FS, U),
    ground: mkMat('rung-dat', GROUND_VS, GROUND_FS, U, { uSaw: { value: [new THREE.Vector4(ex0 + 0.3, 0.1, 1.6, 0.9), new THREE.Vector4(STUMP.x, STUMP.z, 1.9, 1.0), new THREE.Vector4(LOG.L / 2 - 0.2, 0.0, 1.1, 0.7), new THREE.Vector4(-0.5, 0.2, 2.6, 0.35)] } }, { side: THREE.FrontSide }),
    wood: mkMat('rung-go', WOOD_VS, WOOD_FS, U, W),
    box: mkMat('rung-go-ke', BOX_VS, BOX_FS, U),
    shaft: new THREE.ShaderMaterial({ name: 'rung-tia-trang', vertexShader: SHAFT_VS, fragmentShader: SHAFT_FS, uniforms: { ...U, uShaftK: { value: 0.26 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    sky: new THREE.ShaderMaterial({
      name: 'rung-troi', side: THREE.BackSide, depthWrite: false,
      uniforms: { uMoonDir: U.uMoonDir, uFogC: U.uFogC, uFogHi: U.uFogHi, uMoonC: U.uMoonC },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }',
      fragmentShader: `uniform vec3 uMoonDir, uFogC, uFogHi, uMoonC; varying vec3 vD;
        void main(){ float h = clamp(vD.y, 0.0, 1.0); vec3 c = mix(uFogC * 1.12, uFogHi * 1.5, smoothstep(0.03, 0.75, h));
          float m = max(dot(vD, uMoonDir), 0.0); c += uMoonC * (0.35 * pow(m, 30.0) + 0.08 * pow(m, 5.0)); gl_FragColor = vec4(c, 1.0); }`,
    }),
  };

  const st = { built: false, verts: 0, tris: 0, trunks: 0, cards: 0, sticks: 0, ferns: 0, meshes: 0, buildMs: 0, at: '', addMs: [] };
  const add = (geo, mat, name, order = 0, cull = true) => {
    const t0 = performance.now();
    const m = new THREE.Mesh(geo, mat); m.name = name; m.renderOrder = order; m.frustumCulled = cull;
    scene.add(m);
    const pc = geo.attributes.position ? geo.attributes.position.count : 0;
    st.verts += pc * (geo.isInstancedBufferGeometry ? geo.instanceCount : 1);
    st.meshes++; st.addMs.push([name, +(performance.now() - t0).toFixed(1)]);
    return m;
  };

  // ── hình nhân bản (khuôn chung cho hình thật và hình giả lúc dịch / vẽ đầu) ──
  function trunkGeo(n, far = false) {
    const base = far ? [-0.4, 0, 0.12, 0.35, 0.7, 1.3] : [-0.4, 0, 0.05, 0.12, 0.22, 0.35, 0.5, 0.7, 0.95, 1.3, 1.8];
    const fr = []; for (let f = far ? 0.06 : 0.075; f < 1.0001; f += far ? 0.07 : 0.028) fr.push(Math.min(1, f));
    const rings = [...base.map((m) => [m, 0]), ...fr.map((f) => [0, f])];
    const SEG = far ? 12 : 26, aT = [], idx = [];
    for (const [m, f] of rings) for (let c = 0; c <= SEG; c++) aT.push((c / SEG) * Math.PI * 2, m, f);
    for (let r = 0; r < rings.length - 1; r++) for (let c = 0; c < SEG; c++) { const a = r * (SEG + 1) + c, b = a + 1, d = a + SEG + 1, e = d + 1; idx.push(a, d, b, b, d, e); }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(aT.length), 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 3));
    g.setIndex(idx);
    g.setAttribute('iA', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    g.setAttribute('iB', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    g.setAttribute('iC', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    g.instanceCount = n;
    return g;
  }
  function cardGeo(n) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
    g.setAttribute('aC', new THREE.Float32BufferAttribute([-0.5, -1, 0.5, -1, 0.5, 0.08, -0.5, 0.08], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.setAttribute('iP', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    g.setAttribute('iQ', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    g.setAttribute('iO', new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3));
    g.instanceCount = n;
    return g;
  }
  function stickGeo(n) {
    const SEG = 6, aS = [], idx = [];
    for (const t of [0, 1]) for (let c = 0; c <= SEG; c++) aS.push((c / SEG) * Math.PI * 2, t, 0);
    for (let c = 0; c < SEG; c++) idx.push(c, c + SEG + 1, c + 1, c + 1, c + SEG + 1, c + SEG + 2);
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(aS.length), 3));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 3));
    g.setIndex(idx);
    g.setAttribute('iS', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    g.setAttribute('iE', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    g.instanceCount = n;
    return g;
  }
  function fernGeo(n) {
    const aF = [], idx = [], NS = 12;
    for (let i = 0; i <= NS; i++) for (const w of [-1, 0, 1]) aF.push(i / NS, w);
    for (let i = 0; i < NS; i++) for (let j = 0; j < 2; j++) { const a = i * 3 + j, b = a + 1, d = a + 3, e = d + 1; idx.push(a, d, b, b, d, e); }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(aF.length / 2 * 3), 3));
    g.setAttribute('aF', new THREE.Float32BufferAttribute(aF, 2));
    g.setIndex(idx);
    g.setAttribute('iF', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    g.setAttribute('iG', new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4));
    g.instanceCount = n;
    return g;
  }
  const plain = (attrs) => {   // lưới thường nhỏ (một tam giác) có đủ thuộc tính của vật liệu
    const g = new THREE.BufferGeometry();
    for (const [k, n] of attrs) g.setAttribute(k, new THREE.Float32BufferAttribute(new Float32Array(3 * n), n));
    return g;
  };

  // ── DỰNG (bộ sinh: mỗi lần next() làm một mẩu nhỏ) ──
  let seed = 20260930;
  const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const rLog = (x) => lerp(LOG.r0, LOG.r1, (x - ex0) / LOG.L);
  function* build() {
    const t0 = performance.now();
    // 1. rừng: vị trí không đều, mép khoảng trống lởm chởm (lưới ô để dò hàng xóm)
    st.at = 'vi-tri';
    const trees = [], grid = new Map(), GS = 8;
    const key = (x, z) => Math.floor(x / GS) + ',' + Math.floor(z / GS);
    for (let n = 0; n < 60000 && trees.length < 640; n++) {
      if ((n & 127) === 127) yield;
      const x = -45 + R() * 150, z = -120 + R() * 150;
      const dc = Math.hypot(x - CL.x, z - CL.z);
      if (dc > 95) continue;
      if (dc < CL.r + (cvn(x * 0.25 + 40, z * 0.25) - 0.5) * 6) continue;
      if (x < -22 && z > 12) continue;
      const minD = 3.3 + 3.6 * cvn(x * 0.06 + 11, z * 0.06 + 2);
      let ok = true;
      const gx = Math.floor(x / GS), gz = Math.floor(z / GS);
      for (let i = -1; i <= 1 && ok; i++) for (let j = -1; j <= 1 && ok; j++) {
        const L = grid.get((gx + i) + ',' + (gz + j));
        if (L) for (const t of L) if (Math.hypot(t.x - x, t.z - z) < Math.min(minD, t.minD) + 0.4) { ok = false; break; }
      }
      if (!ok) continue;
      const t = { x, z, dc, minD };
      trees.push(t);
      const k = key(x, z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t);
    }
    yield;
    const TREES = trees.map((t) => {
      const edge = t.dc < CL.r + 9;
      const h = 31 + R() * 11 + (edge ? -2 : 0);
      const r0 = 0.30 + R() * 0.2 + (edge ? 0.06 : 0);
      const lean = R() < 0.28 ? 0.018 + R() * 0.04 : R() * 0.008, la = R() * Math.PI * 2;
      return { ...t, edge, h, r0, lx: Math.cos(la) * lean, lz: Math.sin(la) * lean, sd: R(), tone: R(), y0: floorH(t.x, t.z),
        cb: h * (edge ? 0.27 + R() * 0.1 : 0.5 + R() * 0.1), Rm: (edge ? 2.5 : 2.0) + R() * 1.0 };
    });
    const axisAt = (T, y) => [T.x + T.lx * y * (1 + 0.004 * y), T.y0 + y, T.z + T.lz * y * (1 + 0.004 * y)];
    yield;
    // 2. thân nhân bản (+ gốc cây đã hạ: một thân bị cưa ở 0,55 m)
    st.at = 'than';
    {
      const all = [...TREES.map((T) => [T.x, T.y0, T.z, T.h, T.r0, T.lx, T.lz, T.sd, 0, T.tone]), [STUMP.x, floorH(STUMP.x, STUMP.z), STUMP.z, 36, STUMP.r0, 0, 0, STUMP.seed, STUMP.cut, 0.5]];
      const dCam = (v) => Math.hypot(v[0] + 8, v[2] - 3);
      all.sort((a, b) => dCam(a) - dCam(b));
      const near = all.filter((v) => dCam(v) < 42), far = all.filter((v) => dCam(v) >= 42);
      for (const [list, isFar, name] of [[near, false, 'than-tuyet-tung'], [far, true, 'than-tuyet-tung-xa']]) {
        const g = trunkGeo(list.length, isFar);
        const A = g.attributes.iA.array, B = g.attributes.iB.array, C = g.attributes.iC.array;
        list.forEach((v, i) => { A.set(v.slice(0, 4), i * 4); B.set(v.slice(4, 8), i * 4); C.set([v[8], v[9], 0, 0], i * 4); });
        yield;
        add(g, M.trunk, name, isFar ? 1 : 0, false);
      }
      st.trunks = TREES.length;
    }
    yield;
    // 3. tán: tầng cành nhỏ chĩa xuống, mỗi cành là chùm lá kim; tán hẹp dài hình ngọn giáo, chỉ ở phần trên thân
    st.at = 'tan';
    // chùm lá + cành ghi thẳng vào mảng số liền khối (không sinh hàng chục nghìn mảng nhỏ → không để bộ dọn bộ nhớ chạy dài
    // giữa lúc dựng ngầm)
    const CB = { a: new Float32Array(48000 * 10), n: 0 }, SB = { a: new Float32Array(24000 * 8), n: 0 };
    const grow = (B, k) => { if ((B.n + 1) * k > B.a.length) { const na = new Float32Array(B.a.length * 2); na.set(B.a); B.a = na; } };
    const pushC = (a, b, c, d, e, f, g, h, i, j) => { grow(CB, 10); const o = CB.n++ * 10, A = CB.a; A[o] = a; A[o + 1] = b; A[o + 2] = c; A[o + 3] = d; A[o + 4] = e; A[o + 5] = f; A[o + 6] = g; A[o + 7] = h; A[o + 8] = i; A[o + 9] = j; };
    const pushS = (a, b, c, d, e, f, g, h) => { grow(SB, 8); const o = SB.n++ * 8, A = SB.a; A[o] = a; A[o + 1] = b; A[o + 2] = c; A[o + 3] = d; A[o + 4] = e; A[o + 5] = f; A[o + 6] = g; A[o + 7] = h; };
    const GOLD = 2.39996;
    let nt = 0;
    for (const T of TREES) {
      const far = T.dc > 60;
      const span = T.h + 0.8 - T.cb;
      const step = far ? 0.95 : 0.62;
      let a = T.sd * 6.28;
      for (let y = T.cb; y < T.h + 0.4; y += step * (0.8 + 0.4 * R())) {
        const s = (y - T.cb) / span;
        const prof = Math.pow(Math.max(0, 1 - s), 0.95) * (0.55 + 0.45 * sm(0, 0.2, s));
        const nb = s > 0.85 ? 1 : 2;
        for (let b = 0; b < nb; b++) {
          a += GOLD + (R() - 0.5) * 0.5;
          const L = T.Rm * prof * (0.7 + R() * 0.45) + 0.25;
          const el = lerp(-0.62, 0.35, s) + (R() - 0.5) * 0.25;
          const [ax, ay, az] = axisAt(T, y);
          const dx = Math.cos(a), dz = Math.sin(a), ce = Math.cos(el), se = Math.sin(el);
          if (!far) pushS(ax, ay, az, 0.035 * (1 - 0.6 * s) + 0.012, ax + dx * ce * L * 0.85, ay + se * L * 0.85, az + dz * ce * L * 0.85, 0.012);
          const nC = Math.max(1, Math.round(L / (far ? 1.2 : 0.75)));
          for (let j = 0; j < nC; j++) {
            const d = L * (0.35 + 0.65 * (j + 1) / nC);
            pushC(ax + dx * ce * d, ay + se * d + 0.12, az + dz * ce * d, (0.95 + 0.55 * prof + R() * 0.3) * (far ? 1.35 : 1), (R() - 0.5) * 0.6, Math.floor(R() * 3), 0.55 + 0.45 * (d / Math.max(L, 0.1)), dx, 0, dz);
          }
        }
        if (R() < 0.7) { const [ax, ay, az] = axisAt(T, y); pushC(ax + (R() - 0.5) * 0.4, ay + 0.3, az + (R() - 0.5) * 0.4, (1.1 + 1.0 * prof) * (far ? 1.3 : 1), (R() - 0.5) * 0.3, 3, 0.2, 0, 0, 0); }
      }
      { const [ax, ay, az] = axisAt(T, T.h + 0.3); pushC(ax, ay + 0.5, az, 0.9, (R() - 0.5) * 0.2, 0, 0.9, 0, 0, 0); }
      if (!far) {
        const n = 1 + Math.floor(R() * 3);
        for (let i = 0; i < n; i++) {
          const y = Math.max(3, T.cb - 7 + R() * 6.5);
          const [ax, ay, az] = axisAt(T, y);
          const aa = R() * 6.28, L = 0.12 + R() * (y > T.cb - 5 ? 0.8 : 0.35), el = -0.2 - R() * 0.6;
          const rr = T.r0 * (1 - 0.93 * y / T.h) + 0.02;
          pushS(ax + Math.cos(aa) * rr * 0.8, ay, az + Math.sin(aa) * rr * 0.8, 0.022, ax + Math.cos(aa) * (rr + L * Math.cos(el)), ay + L * Math.sin(el), az + Math.sin(aa) * (rr + L * Math.cos(el)), 0.008);
        }
        if (T.dc < 50) {
          for (let k = 0; k < 5; k++) {
            if (R() < 0.35) continue;
            const th = (2 * Math.PI * k - T.sd * 40) / 5 + (R() - 0.5) * 0.3;
            const L = 0.5 + R() * 1.0;
            const sx = T.x + Math.cos(th) * T.r0 * 1.4, sz = T.z + Math.sin(th) * T.r0 * 1.4;
            const ex = T.x + Math.cos(th) * (T.r0 * 1.4 + L), ez = T.z + Math.sin(th) * (T.r0 * 1.4 + L);
            pushS(sx, T.y0 + 0.16, sz, 0.12 + T.r0 * 0.12, ex, floorH(ex, ez) - 0.12, ez, 0.06);
          }
        }
      }
      if ((++nt % 5) === 0) yield;
    }
    for (let i = 0; i < 9; i++) {
      const x = STUMP.x + 1.5 + R() * 6, z = STUMP.z - 1 - R() * 4, a = R() * 6.28, L = 0.8 + R() * 2.2;
      pushS(x, floorH(x, z) + 0.05, z, 0.04, x + Math.cos(a) * L, floorH(x + Math.cos(a) * L, z + Math.sin(a) * L) + 0.03, z + Math.sin(a) * L, 0.01);
      if (R() < 0.6) pushC(x + Math.cos(a) * L, floorH(x, z) + 0.45, z + Math.sin(a) * L, 0.8, 1.2 + R(), Math.floor(R() * 3), 0.7, 0, 0.3, 0);
    }
    yield;
    // ảnh chùm lá kim (vẽ dần)
    st.at = 'anh-la';
    const SP = {};
    for (const _ of sprayAtlas(SP)) yield;   // eslint-disable-line no-unused-vars
    SPRAY.value = SP.tex;
    st.at = 'la';
    // xếp gần trước theo từng mét (đếm theo xô — không sắp xếp so sánh, không sinh mảng)
    const nC = CB.n, bkey = new Uint8Array(nC), cnt = new Uint32Array(202), ord = new Uint32Array(nC);
    for (let i = 0; i < nC; i++) { bkey[i] = Math.min(201, Math.floor(Math.hypot(CB.a[i * 10] + 8, CB.a[i * 10 + 2] - 3))); cnt[bkey[i]]++; if ((i & 2047) === 2047) yield; }
    for (let b = 0, acc = 0; b < 202; b++) { const c = cnt[b]; cnt[b] = acc; acc += c; }
    for (let i = 0; i < nC; i++) { ord[cnt[bkey[i]]++] = i; if ((i & 8191) === 8191) yield; }
    yield;
    {
      const g = cardGeo(nC);
      const P = g.attributes.iP.array, Q = g.attributes.iQ.array, O = g.attributes.iO.array, A = CB.a;
      for (let k = 0; k < nC; k++) {
        const o = ord[k] * 10;
        P[k * 4] = A[o]; P[k * 4 + 1] = A[o + 1]; P[k * 4 + 2] = A[o + 2]; P[k * 4 + 3] = A[o + 3];
        Q[k * 4] = A[o + 4]; Q[k * 4 + 1] = A[o + 5]; Q[k * 4 + 2] = A[o + 6];
        O[k * 3] = A[o + 7]; O[k * 3 + 1] = A[o + 8]; O[k * 3 + 2] = A[o + 9];
        if ((k & 2047) === 2047) yield;
      }
      add(g, M.card, 'chum-la-kim', 1, false);
      st.cards = nC;
    }
    yield;
    {
      const g = stickGeo(SB.n);
      const S = g.attributes.iS.array, E = g.attributes.iE.array, A = SB.a;
      for (let i = 0; i < SB.n; i++) for (let c = 0; c < 4; c++) { S[i * 4 + c] = A[i * 8 + c]; E[i * 4 + c] = A[i * 8 + 4 + c]; }
      add(g, M.stick, 'canh', 0, false);
      st.sticks = SB.n;
    }
    yield;
    // 4. dương xỉ: ven khoảng trống, dưới gốc cây, quanh khúc gỗ (không che mặt cắt đầu gốc)
    st.at = 'duong-xi';
    {
      const fr = [];
      const clump = (x, z, n, sc) => {
        const y = floorH(x, z) - 0.02;
        for (let i = 0; i < n; i++) {
          const az = (i / n) * 6.28 + R() * 0.6, L = (0.55 + R() * 0.55) * sc;
          fr.push([x + Math.cos(az) * 0.05, y, z + Math.sin(az) * 0.05, L, az, 0.75 + R() * 0.45, 0.55 + R() * 0.55, 0.36 + R() * 0.1]);
        }
      };
      for (let i = 0; i < 260; i++) {
        const a = R() * 6.28, d = CL.r - 2 + R() * 14;
        const x = CL.x + Math.cos(a) * d, z = CL.z + Math.sin(a) * d;
        if (x < -22 && z > 12) continue;
        clump(x, z, 7 + Math.floor(R() * 6), 0.8 + R() * 0.6);
      }
      yield;
      for (const T of TREES) if (T.dc < 45 && R() < 0.55) { const a = R() * 6.28; clump(T.x + Math.cos(a) * (T.r0 + 0.9), T.z + Math.sin(a) * (T.r0 + 0.9), 6 + Math.floor(R() * 5), 0.9 + R() * 0.5); }
      for (const [x, z, s] of [[-1.5, -1.9, 1.1], [1.8, 1.7, 1.0], [3.6, -1.7, 1.2], [-3.6, -6.8, 1.1], [0.6, -7.6, 1.0], [5.3, 0.9, 1.1], [0.5, -3.4, 0.8], [-6.2, -3.8, 1.2], [-9.5, -2.0, 1.3], [7.5, -4.5, 1.2]]) clump(x, z, 10, s);
      yield;
      const g = fernGeo(fr.length);
      const F = g.attributes.iF.array, G = g.attributes.iG.array;
      fr.forEach((f, i) => { F.set(f.slice(0, 4), i * 4); G.set(f.slice(4, 8), i * 4); });
      add(g, M.fern, 'duong-xi', 0, false);
      st.ferns = fr.length;
    }
    yield;
    // 5. khúc gỗ (thân gợn không tròn đều + hai mặt cắt) + mặt cưa gốc cây
    st.at = 'khuc-go';
    {
      const NX = 180, NP = 128, NR = 24, NA = 96, NRs = 24, NAs = 120;
      const nV = (NX + 1) * (NP + 1) + 2 * (NR + 1) * (NA + 1) + (NRs + 1) * (NAs + 1);
      const nI = (NX * NP + 2 * NR * NA + NRs * NAs) * 6;
      const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), aL = new Float32Array(nV * 4), idx = new Uint32Array(nI);
      let vi = 0, ii = 0;
      const V = (x, y, z, a, b, c, k, u, v, w) => { pos[vi * 3] = x; pos[vi * 3 + 1] = y; pos[vi * 3 + 2] = z; nor[vi * 3] = a; nor[vi * 3 + 1] = b; nor[vi * 3 + 2] = c; aL[vi * 4] = k; aL[vi * 4 + 1] = u; aL[vi * 4 + 2] = v; aL[vi * 4 + 3] = w; vi++; };
      const Q = (a, b, d, e) => { idx[ii++] = a; idx[ii++] = b; idx[ii++] = d; idx[ii++] = b; idx[ii++] = e; idx[ii++] = d; };
      const nx = (LOG.r0 - LOG.r1) / LOG.L, nl = Math.hypot(nx, 1);
      const bumpR = (x, phi) => 1 + 0.035 * (cvn(x * 0.9 + 20, phi * 1.2 + 7) - 0.5) + 0.012 * Math.cos(2 * phi + 0.7) + 0.01 * (cvn(x * 3.1, phi * 2.5 + 3) - 0.5);
      for (let i = 0; i <= NX; i++) {
        const x = ex0 + (LOG.L * i) / NX, r = rLog(x);
        for (let j = 0; j <= NP; j++) { const phi = -Math.PI + (2 * Math.PI * j) / NP, c = Math.cos(phi), s = Math.sin(phi), rr = r * bumpR(x, phi); V(x, LOG.yc + rr * s, rr * c, nx / nl, s / nl, c / nl, 0, x, phi, r); }
        if ((i % 10) === 9) yield;
      }
      for (let i = 0; i < NX; i++) { for (let j = 0; j < NP; j++) { const a = i * (NP + 1) + j; Q(a, a + 1, a + NP + 1, a + NP + 2); } if ((i % 45) === 44) yield; }
      for (const [x, r, kind, nxs] of [[ex0, LOG.r0, 1, -1], [LOG.L / 2, LOG.r1, 2, 1]]) {
        const b0 = vi;
        for (let k = 0; k <= NR; k++) for (let j = 0; j <= NA; j++) {
          const rr = (r * k) / NR, a = (2 * Math.PI * j) / NA, u = Math.cos(a) * rr, v = Math.sin(a) * rr;
          const ph = a > Math.PI ? a - 2 * Math.PI : a, kk = k === NR ? bumpR(x, ph) : 1;
          V(x, LOG.yc + v * kk, u * kk, nxs, 0, 0, kind, u, v, r);
        }
        for (let k = 0; k < NR; k++) for (let j = 0; j < NA; j++) { const a = b0 + k * (NA + 1) + j; Q(a, a + 1, a + NA + 1, a + NA + 2); }
        yield;
      }
      {
        const sy = floorH(STUMP.x, STUMP.z) + STUMP.cut, b0 = vi;
        const rT = STUMP.r0 * Math.pow(1 - 0.93 * STUMP.cut / 36, 0.8) + 0.02;
        const rP = (th) => { const lobe = 0.55 * Math.pow(Math.max(0, Math.cos(5 * th + STUMP.seed * 40)), 3) + 0.45 * Math.pow(Math.max(0, Math.cos(3 * th + STUMP.seed * 17)), 4); return rT * (1 + Math.exp(-STUMP.cut / 0.7) * (0.35 + 1.25 * lobe) + 0.12 * Math.exp(-STUMP.cut / 2.5)); };
        for (let k = 0; k <= NRs; k++) for (let j = 0; j <= NAs; j++) {
          const a = (2 * Math.PI * j) / NAs, rr = (rP(a) * k) / NRs, u = Math.cos(a) * rr, v = Math.sin(a) * rr;
          V(STUMP.x + u, sy, STUMP.z + v, 0, 1, 0, 3, u, v, rT * 1.25);
        }
        for (let k = 0; k < NRs; k++) for (let j = 0; j < NAs; j++) { const a = b0 + k * (NAs + 1) + j; Q(a, a + 1, a + NAs + 1, a + NAs + 2); }
      }
      yield;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setAttribute('aL', new THREE.BufferAttribute(aL, 4));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      add(g, M.wood, 'khuc-go', -1);
    }
    yield;
    // 6. gỗ kê 馬 (hai khung chéo chữ X ở mỗi chỗ kê), dăm gỗ, mảnh vỏ bóc
    st.at = 'go-ke';
    {
      const boxes = [];
      const BOXC = new THREE.Color(0xa39b8c).convertSRGBToLinear();
      const timber = (cx, cy, cz, len, t, dir, c = BOXC) => { const g = new THREE.BoxGeometry(t, len, t); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())); g.translate(cx, cy, cz); boxes.push([g, c, dir.clone().normalize()]); };
      for (const xs of [ex0 + 1.3, LOG.L / 2 - 1.5]) {
        const rr = rLog(xs), al = 0.87, t = 0.095;
        const hc = LOG.yc - (rr + t / 2) / Math.sin(al);
        const down = hc / Math.cos(al), up = (LOG.yc - hc) * Math.cos(al) + 0.24;
        for (const dx of [-0.2, 0.2]) for (const sgn of [-1, 1]) {
          const dir = new THREE.Vector3(0, Math.cos(al), sgn * Math.sin(al)), mid = (up - down) / 2;
          timber(xs + dx + sgn * 0.05, hc + dir.y * mid, dir.z * mid, up + down, t, dir);
        }
        timber(xs, hc - 0.02, 0, 0.62, 0.08, new THREE.Vector3(1, 0, 0));
      }
      for (let i = 0; i < 70; i++) {
        const nearStump = i < 30;
        const cx = nearStump ? STUMP.x + (R() - 0.5) * 2.4 : ex0 + (R() - 0.3) * 3.2, cz = nearStump ? STUMP.z + (R() - 0.5) * 2.4 : (R() - 0.5) * 2.2;
        const g = new THREE.BoxGeometry(0.03 + R() * 0.07, 0.008 + R() * 0.012, 0.02 + R() * 0.04);
        g.rotateY(R() * 6.28); g.rotateX((R() - 0.5) * 0.4); g.translate(cx, floorH(cx, cz) + 0.01, cz);
        boxes.push([g, new THREE.Color(0xc9b597).convertSRGBToLinear(), new THREE.Vector3(1, 0, 0)]);
        if ((i % 20) === 19) yield;
      }
      for (let i = 0; i < 9; i++) {
        const cx = ex0 + 0.5 + R() * 5, cz = (R() - 0.5) * 2.2;
        const g = new THREE.BoxGeometry(0.25 + R() * 0.35, 0.015, 0.05 + R() * 0.06);
        g.rotateY((R() - 0.5) * 1.2); g.rotateX((R() - 0.5) * 0.3); g.translate(cx, floorH(cx, cz) + 0.02, cz);
        boxes.push([g, new THREE.Color(0xa0765e).convertSRGBToLinear(), new THREE.Vector3(1, 0, 0)]);
      }
      yield;
      let nv = 0, ni = 0; for (const [g] of boxes) { nv += g.attributes.position.count; ni += g.index.count; }
      const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), Cc = new Float32Array(nv * 3), A = new Float32Array(nv * 3), I = new Uint32Array(ni);
      let ov = 0, oi = 0;
      for (const [g, c, ax] of boxes) {
        const n = g.attributes.position.count;
        P.set(g.attributes.position.array, ov * 3); N.set(g.attributes.normal.array, ov * 3);
        for (let i = 0; i < n; i++) { Cc[(ov + i) * 3] = c.r; Cc[(ov + i) * 3 + 1] = c.g; Cc[(ov + i) * 3 + 2] = c.b; A[(ov + i) * 3] = ax.x; A[(ov + i) * 3 + 1] = ax.y; A[(ov + i) * 3 + 2] = ax.z; }
        const ix = g.index.array; for (let k = 0; k < ix.length; k++) I[oi + k] = ix[k] + ov;
        ov += n; oi += ix.length; g.dispose();
      }
      const m = new THREE.BufferGeometry();
      m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      m.setAttribute('aCol', new THREE.BufferAttribute(Cc, 3)); m.setAttribute('aAx', new THREE.BufferAttribute(A, 3));
      m.setIndex(new THREE.BufferAttribute(I, 1));
      add(m, M.box, 'go-ke', 0);
    }
    yield;
    // 7. đất: tấm gần dày (1 m) + tấm xa thưa; cao độ + pháp tuyến tính theo hàng (không gọi computeVertexNormals cả lưới)
    st.at = 'dat';
    const groundPlane = function* (size, seg, cx, cz, dy) {
      const n = seg + 1, P = new Float32Array(n * n * 3), N = new Float32Array(n * n * 3), H = new Float32Array(n * n);
      const x0 = cx - size / 2, z0 = cz - size / 2, dd = size / seg;
      for (let j = 0; j < n; j++) { for (let i = 0; i < n; i++) H[j * n + i] = floorH(x0 + i * dd, z0 + j * dd) + dy; if ((j & 7) === 7) yield; }
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const k = j * n + i;
          const hx = H[j * n + Math.min(n - 1, i + 1)] - H[j * n + Math.max(0, i - 1)], hz = H[Math.min(n - 1, j + 1) * n + i] - H[Math.max(0, j - 1) * n + i];
          const ax = -hx / (2 * dd), az = -hz / (2 * dd), l = Math.hypot(ax, 1, az);
          P[k * 3] = x0 + i * dd; P[k * 3 + 1] = H[k]; P[k * 3 + 2] = z0 + j * dd;
          N[k * 3] = ax / l; N[k * 3 + 1] = 1 / l; N[k * 3 + 2] = az / l;
        }
        if ((j & 15) === 15) yield;
      }
      const I = new Uint32Array(seg * seg * 6);
      let o = 0;
      for (let j = 0; j < seg; j++) { for (let i = 0; i < seg; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; I[o++] = a; I[o++] = c; I[o++] = b; I[o++] = b; I[o++] = c; I[o++] = d; } if ((j & 31) === 31) yield; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      g.setIndex(new THREE.BufferAttribute(I, 1));
      return g;
    };
    { const gen = groundPlane(260, 260, 30, -40, 0); let r = gen.next(); while (!r.done) { yield; r = gen.next(); } add(r.value, M.ground, 'dat-gan', 2); }
    yield;
    { const gen = groundPlane(1600, 160, 30, -40, -0.35); let r = gen.next(); while (!r.done) { yield; r = gen.next(); } add(r.value, M.ground, 'dat-xa', 3); }
    yield;
    // 8. trời đêm qua kẽ tán
    st.at = 'troi';
    { const m = add(new THREE.SphereGeometry(2000, 32, 16), M.sky, 'troi', 100, false); void m; }
    yield;
    // 9. tia trăng: đúng chỗ tán hở (bản sao nhiễu trên CPU — khớp vệt trăng loang trên đất)
    st.at = 'tia-trang';
    {
      const h12 = (x, y) => { let p3x = (x * 0.1031) % 1, p3y = (y * 0.1031) % 1, p3z = (x * 0.1031) % 1; if (p3x < 0) p3x += 1; if (p3y < 0) p3y += 1; if (p3z < 0) p3z += 1; const dd = p3x * (p3y + 33.33) + p3y * (p3z + 33.33) + p3z * (p3x + 33.33); p3x = (p3x + dd) % 1; p3y = (p3y + dd) % 1; p3z = (p3z + dd) % 1; return ((p3x + p3y) * p3z) % 1; };
      const vA = (x, y) => { const i = Math.floor(x), j = Math.floor(y); let fx = x - i, fy = y - j; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); const a = lerp(h12(i, j), h12(i + 1, j), fx), b = lerp(h12(i, j + 1), h12(i + 1, j + 1), fx); return lerp(a, b, fy); };
      const gapCPU = (x, z) => { const q2x = 0.8 * x + 0.6 * z, q2z = -0.6 * x + 0.8 * z; return sm(0.5, 0.78, vA(x * 0.075 + 4, z * 0.075 + 4) * 0.55 + vA(q2x * 0.19 + 9, q2z * 0.19 + 9) * 0.3 + vA(x * 0.53 + 2, z * 0.53 + 2) * 0.15); };
      const cands = [];
      for (let x = 8; x < 70; x += 1.5) { for (let z = -60; z < 12; z += 1.5) { const g = gapCPU(x, z); if (g > 0.7) cands.push([x, z, g + R() * 0.2]); } yield; }
      cands.sort((a, b) => b[2] - a[2]);
      const picked = [];
      for (const c of cands) { if (picked.length >= 9) break; if (picked.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1]) > 7)) picked.push(c); }
      yield;
      for (const [qx, qz] of picked) {
        const top = new THREE.Vector3(qx, CANOPY_Y - 4, qz), len = (CANOPY_Y - 4) / MOON.y, bot = top.clone().addScaledVector(MOON, -len);
        const rad = 0.6 + R() * 1.1;
        const g = new THREE.CylinderGeometry(rad * 1.25, rad, len, 20, 1, true);
        const aS = [], P = g.attributes.position;
        for (let i = 0; i < P.count; i++) aS.push(Math.atan2(P.getZ(i), P.getX(i)), 1 - (P.getY(i) / len + 0.5));
        g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 2));
        const m = add(g, M.shaft, 'tia-trang', 10);
        m.position.copy(top).add(bot).multiplyScalar(0.5);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), MOON);
        yield;
      }
    }
    yield;
    setMarks();
    st.buildMs = Math.round(performance.now() - t0);
    st.built = true;
  }

  // ── MỰC theo τ ────────────────────────────────────────────────────────────────────────────
  const onLog = (x, phi, lift = 0.02, out = new THREE.Vector3()) => { const r = rLog(x) + lift; return out.set(x, LOG.yc + r * Math.sin(phi), r * Math.cos(phi)); };
  // dấu bút tre (x từ đầu gốc, S = cung từ φ = 0): vạch cắt đầu 切墨 quanh thân · vạch ngang ở đầu hai dây mực phía máy ·
  // dấu chữ V 合印 · số thứ tự "い三" (番付) · dấu tâm ＋ — THỨ TỰ VIẾT
  function setMarks() {
    const xe = ex0, r = rLog(xe + 0.3);
    const S = (deg) => r * (deg * Math.PI / 180);
    const d0 = PHI[0] * 180 / Math.PI, d2 = PHI[2] * 180 / Math.PI;
    const MK = [
      [xe + 0.11, S(-58), xe + 0.105, S(98), 0.003],
      [xe + 0.16, S(d0) - 0.035, xe + 0.16, S(d0) + 0.035, 0.0026], [xe + 0.16, S(d2) - 0.035, xe + 0.16, S(d2) + 0.035, 0.0026],
      [xe + 0.48, S(26), xe + 0.30, S(17), 0.005], [xe + 0.48, S(8), xe + 0.30, S(17), 0.005],
      [xe + 0.60, S(6), xe + 0.60, S(14.5), 0.0045], [xe + 0.645, S(5), xe + 0.645, S(13), 0.004], [xe + 0.69, S(4.5), xe + 0.69, S(15.5), 0.0045],
      [xe + 0.80, S(5.5), xe + 0.90, S(4.0), 0.0042], [xe + 0.79, S(12.5), xe + 0.87, S(13.5), 0.004],
      [xe + 0.52, S(-18), xe + 0.52, S(-6), 0.003], [xe + 0.475, S(-12), xe + 0.565, S(-12), 0.003],
    ];
    MK.forEach((m, i) => { W.uMk.value[i].set(m[0], m[1], m[2], m[3]); W.uMkB.value[i].set(m[4], 3.1 + i * 5.7, 1, 0); });
  }
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  const heads = [0, 0, 0];
  function ink(tau) {
    let any = false, dsum = 0;
    for (let k = 0; k < 3; k++) {
      // đầu nét chạy từ đầu gốc tới đầu ngọn (nhanh đầu, chậm dần như tay kéo nét — như nét mỏ đá); phần đã vẽ đứng yên
      const u = cl01((tau - DRAW[k][0]) / (DRAW[k][1] - DRAW[k][0]));
      const h = u <= 0 ? 0 : u >= 1 ? 1 : 0.55 * (1 - Math.pow(1 - u, 1.8)) + 0.45 * kfEase(u);
      const L = W.uLn.value[k];
      L.y = h; L.z = h > 0 ? 1 : 0;
      heads[k] = +h.toFixed(2);
      dsum += h;
      const len = LOG.L * h;
      U.uLA.value[k].copy(onLog(ex0 + 0.02, PHI[k], 0.02, tmpA)); U.uLB.value[k].copy(onLog(ex0 + Math.max(0.03, len - 0.02), PHI[k], 0.02, tmpB));
      U.uLK.value[k] = h > 0 ? 0.36 * Math.min(1, len / 1.2) : 0;
      if (h > 0) any = true;
    }
    // dấu bút tre: từng nét nối nhau, nét dài viết lâu hơn
    const mu = cl01((tau - MARK_T[0]) / (MARK_T[1] - MARK_T[0]));
    W.uMarks.value = mu > 0 ? 1 : 0;
    {
      const n = 12, lens = [];
      let tot = 0;
      for (let i = 0; i < n; i++) { const m = W.uMk.value[i]; const l = Math.hypot(m.z - m.x, m.w - m.y) + 0.06; lens.push(l); tot += l; }
      let acc = 0;
      for (let i = 0; i < n; i++) { const a = acc / tot, b = (acc + lens[i]) / tot; acc += lens[i]; W.uMkB.value[i].w = cl01((mu - a) / (b - a)); }
    }
    // chữ 井 sáng lên
    const fu = cl01((tau - FACE_T[0]) / (FACE_T[1] - FACE_T[0]));
    W.uFace.value = kfEase(fu);
    U.uLA.value[3].set(ex0 - 0.25, LOG.yc - 0.25, 0); U.uLB.value[3].set(ex0 - 0.25, LOG.yc + 0.25, 0);
    U.uLK.value[3] = 0.12 * W.uFace.value;   // ánh 緑青 của chữ 井 hắt lên mặt cắt: nhẹ (mặt gỗ giữ sắc gỗ, không nhuộm lục)
    U.uLS.value.w = any || W.uFace.value > 0 || mu > 0 ? 5.4 : 0;
    drawAmt = dsum + mu;   // lượng nét đã vẽ (dây mực + dấu bút tre) — app.js bắn sự kiện kozo:net
  }
  let drawAmt = 0;

  // HÌNH GIẢ cùng kiểu dữ liệu đỉnh của từng vật liệu: dịch shader VÀ vẽ đầu trước khi cần (mỗi khung một cái — app.js)
  function warmMeshes() {
    const list = [
      [trunkGeo(1), M.trunk], [cardGeo(1), M.card], [stickGeo(1), M.stick], [fernGeo(1), M.fern],
      [plain([['position', 3], ['normal', 3]]), M.ground],
      [plain([['position', 3], ['normal', 3], ['aL', 4]]), M.wood],
      [plain([['position', 3], ['normal', 3], ['aCol', 3], ['aAx', 3]]), M.box],
      [plain([['position', 3], ['normal', 3], ['aS', 2]]), M.shaft],
      [plain([['position', 3]]), M.sky],
    ];
    return list.map(([g, m], i) => { const o = new THREE.Mesh(g, m); o.frustumCulled = false; o.name = 'gia-rung-' + i; return o; });
  }

  const tmpV = new THREE.Vector3();
  let back = 0, kP = 0;
  function place(tau, dt) {
    camera.position.set(kfs(CAM.x, tau), kfs(CAM.y, tau), kfs(CAM.z, tau));
    camera.up.set(0, 1, 0);
    camera.lookAt(tmpV.set(kfs(CAM.tx, tau), kfs(CAM.ty, tau), kfs(CAM.tz, tau)));
    const fov = kfs(CAM.fov, tau) + 18 * kP;
    if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (back > 0) camera.translateZ(back);
    // (30/9, Mike: "tilt màn hình chỉ ở trang home thôi, còn ở các section thì bỏ tilt hết") — BỎ máy lượn theo chuột ở chương này;
    // máy chỉ đi theo đường của chương, nhịp thở lúc nghỉ vẫn do app.js cộng vào.
    camera.updateMatrixWorld();
  }

  let time = 0;
  return {
    scene, camera, materials: Object.values(M), st, build, U, warmMeshes,
    update(dt, tau) { time += dt; ink(tau); place(tau, dt); },
    get drawn() { return drawAmt; },
    setMouse() { /* 30/9: chương không còn nghiêng theo chuột — giữ hàm để app.js gọi không lỗi */ },
    resize(w, h) {
      camera.aspect = w / h;
      kP = w / h < 1 ? Math.min(1, (1 - w / h) / 0.55) : 0;
      back = 2.2 * kP;
      camera.updateProjectionMatrix();
    },
    info() {
      const p = camera.position;
      return { addMs: st.addMs, cam: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)], heads: heads.slice(), marks: +W.uMarks.value, face: +W.uFace.value.toFixed(2), verts: st.verts, trunks: st.trunks, cards: st.cards, sticks: st.sticks, ferns: st.ferns, meshes: st.meshes, buildMs: st.buildMs, time: +time.toFixed(1) };
    },
    camAt(tau) { return [kfs(CAM.x, tau), kfs(CAM.y, tau), kfs(CAM.z, tau)]; },
    geom: { floorH, LOG, PHI },
  };
}
