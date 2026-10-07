// 皮 SKIN — LÀNG LÀM GIẤY DÓ 和紙 TRONG ĐÊM (29/9, ảnh chi tiết bố cục A đã duyệt).
// Chương thứ tư của "chuyến đi tìm gốc từng lớp kết cấu": nơi sinh ra LỚP DA của toà thành. Một ngõ làng giấy: hai dãy nhà dân dã
// 民家 (vách đất, ván dọc, mái tranh / mái ngói, hiên sâu), dọc tường là ván phơi 板干し dán giấy dó, mương nước bên phải, sào tre
// phơi vỏ 楮, đèn lồng 提灯 dưới hiên. Cuối ngõ là xưởng xeo giấy quay ĐẦU HỒI ra ngõ; trong khung cửa xưởng dựng một tấm giấy lớn,
// đèn sau lưng. Theo cuộn, nét cọ 緑青 vẽ lưới nan 組子 lên tấm giấy (nan đứng trước, nan ngang sau) → tấm giấy thành cánh cửa shoji;
// cuối chương đèn sau lưng sáng lên, cánh cửa sáng dịu. "A wall is a filter."
// Máy quay: đầu ngõ → giữa ngõ → gần cửa (ba ảnh chi tiết đã duyệt), keyframe trơn theo τ (τ đã qua sine.inOut — app.js tính).
//
// Màu: CÙNG BẢNG MÀU ĐÊM với ruộng / mỏ đá / rừng — mọi bề mặt đi qua pal() (giữ độ sáng, nhuộm xám lục ~160°). GIẤY là thứ duy
// nhất được ẤM nhẹ trước nắn màu (hàm warmP); lớp nắn màu nhận ra điểm "sáng + ấm nhẹ" và đặt về trắng ngà 41°, bão hoà 0,085
// (uKeepPaper trong post/grade.js — chỉ bật ở chương này). Màu bão hoà duy nhất vẫn là 緑青 của nét.
// Hiệu năng (bản ảnh tĩnh có ~15 đèn thật, 3 đèn đổ bóng, 2 mặt nước soi): ở đây KHÔNG có đèn thật nào — đèn lồng, cửa sổ, ánh giấy,
// ánh mực là ĐÈN GIẢ tính trong shader; BÓNG TRĂNG tính bằng công thức theo hình mái (mái hai dãy nhà và đầu hồi xưởng là mặt biết
// trước); mặt nước và vũng nước SOI GIẢ (tia phản chiếu hỏi thẳng tấm giấy, đèn lồng, cửa sổ) — không vẽ cảnh lần hai.
import * as THREE from 'three';
import { RAMP } from '../page/accent.js';

// ── nhiễu: ảnh 256×256 cho shader ──────────────────────────────────────────────────────────────
const NZ = 256;
const NOISE = new Uint8Array(NZ * NZ * 4);
{ let s = 20260929; for (let i = 0; i < NZ * NZ; i++) { s = (s * 1664525 + 1013904223) >>> 0; const v = s >>> 24; NOISE[i * 4] = NOISE[i * 4 + 1] = NOISE[i * 4 + 2] = v; NOISE[i * 4 + 3] = 255; } }
const lerp = (a, b, k) => a + (b - a) * k;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const cl01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// ── bố cục (m): ngõ chạy theo −z tới xưởng; mặt nhà trái x = LX, phải x = RX; mương bên phải ────────────────────────
const LX = -3.0, RX = 2.7, DZ = -11.6;
const CH0 = 1.4, CH1 = 1.9, CHZ0 = 4.2, CHZ1 = DZ + 1.2;
const SW = 2.04, SHH = 2.4, SY0 = 0.1;                        // tấm giấy chính (trong khung cửa xưởng)
const WS = { W0: -3.4, W1: 3.4, H: 3.0, D: 9, pitch: 0.6, T: 0.55 };
const MOON = new THREE.Vector3(-0.32, 0.72, -0.62).normalize();   // trăng sau lưng làng, lệch trái: mái sáng viền, mặt nhà trong bóng hiên
const PUD = [[-0.6, -2.6, 0.4, 0.75, 1.0], [0.75, -5.6, 0.38, 0.65, 2.3], [-0.5, -8.4, 0.34, 0.5, 4.1]];
export const LANG = { LX, RX, DZ, SW, SHH, SY0 };

// ── máy quay: đầu ngõ (lùi một chút) → đầu ngõ → giữa ngõ → gần cửa. Nhìn về tấm giấy, hơi chúi ──
const K = [
  // τ,     vị trí,                        nhìn về,                  góc nhìn
  [0.000, [0.28, 1.58, DZ + 14.6], [0.1, 0.84, DZ], 42],
  [0.070, [0.25, 1.50, DZ + 13.0], [0.1, 0.80, DZ], 42],
  [0.500, [0.20, 1.42, DZ + 9.0], [0.1, 0.72, DZ], 44],
  [0.930, [0.10, 1.25, DZ + 4.6], [0.05, 0.80, DZ], 46],
  [1.000, [0.10, 1.25, DZ + 4.6], [0.05, 0.80, DZ], 46],
];
// nhịp nét (theo τ): 8 nan đứng rồi 16 nét nan ngang (mỗi hàng hai nét, hai cánh cửa); đèn sau giấy sáng lên ở cuối
const INK_V = [0.14, 0.36], INK_H = [0.36, 0.76], GLOW_T = [0.80, 0.93];
function kfm(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 1;
  while (t > keys[i][0]) i++;
  const sl = (k) => (keys[k + 1][1] - keys[k][1]) / (keys[k + 1][0] - keys[k][0]);
  const tan = (k) => { if (k === 0) return sl(0); if (k === n - 1) return sl(n - 2); const a = sl(k - 1), b = sl(k); return a * b <= 0 ? 0 : (2 * a * b) / (a + b); };
  const t0 = keys[i - 1][0], t1 = keys[i][0], h = t1 - t0, s = (t - t0) / h;
  const y0 = keys[i - 1][1], y1 = keys[i][1], m0 = tan(i - 1) * h, m1 = tan(i) * h;
  const s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * m0 + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * m1;
}
const CAM = { x: [], y: [], z: [], tx: [], ty: [], tz: [], fov: [] };
for (const [t, p, a, f] of K) { CAM.x.push([t, p[0]]); CAM.y.push([t, p[1]]); CAM.z.push([t, p[2]]); CAM.tx.push([t, a[0]]); CAM.ty.push([t, a[1]]); CAM.tz.push([t, a[2]]); CAM.fov.push([t, f]); }

// ═════ SHADER ═════════════════════════════════════════════════════════════════════════════════
const NL = 14, NW = 8, NSEG = 24;
const G_DECL = /* glsl */`
#define NL ${NL}
#define NW ${NW}
uniform sampler2D uNoise;
uniform vec3 uMoonDir, uMoonC, uSkyAmb, uGndAmb, uFogC, uFogHi;
uniform float uFogD;
uniform vec4 uLP[NL];      // đèn giả: vị trí, tầm
uniform vec4 uLC[NL];      // màu × độ mạnh, loại (0 đèn lồng · 1 cửa sổ · 2 ánh giấy)
uniform vec4 uInk;         // ánh 緑青 trước cửa: vị trí, độ mạnh
uniform vec3 uInkC;
uniform vec4 uEave;        // bóng trăng: mép hiên trái (x), cao đỉnh mép (y); mép hiên phải (z), cao đáy mép (w)
uniform vec4 uGab;         // đầu hồi xưởng: mặt z, cao chân mái, nửa rộng, độ dốc
`;
const G_NOISE = /* glsl */`
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return texture2D(uNoise, (i + f + 0.5) * 0.00390625).r; }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnA(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm3(vec2 p) { return vn(p) * 0.55 + vn(p * 2.03 + 17.1) * 0.3 + vn(p * 4.1 + 5.3) * 0.15; }
`;
// BẢNG MÀU ĐÊM (như rừng): giữ độ sáng, nhuộm xám lục. GIẤY: ấm nhẹ — lớp nắn màu nhận ra và đặt về trắng ngà
const G_PAL = /* glsl */`
vec3 pal(vec3 a) { float l = dot(a, vec3(0.2126, 0.7152, 0.0722)); return l * vec3(0.78, 1.09, 1.0); }
vec3 warmP(float l) { return l * vec3(1.1, 0.99, 0.78); }   // ấm hơn một chút: giấy sáng hẳn vẫn đủ sắc để lớp nắn màu nhận ra là giấy (ngà)
`;
// ÁNH SÁNG: trời + trăng (bóng tính theo hình mái) + đèn giả + ánh mực. Sương theo khoảng cách + sương sát đất ở xa
const G_LIGHT = /* glsl */`
float moonVis(vec3 P) {
  vec3 L = uMoonDir; float v = 1.0;
  // tia về phía trăng đi sang −x, lên: phải vượt mép hiên dãy trái (mép ngoài của mái tranh / ngói)
  float k = L.y / max(-L.x, 1e-3);
  v *= smoothstep(uEave.y - 0.2, uEave.y + 0.2, P.y + (P.x - uEave.x) * k);
  // dưới hiên dãy phải: chính mép hiên ấy che
  v *= 1.0 - step(uEave.z, P.x) * smoothstep(uEave.w - 0.1, uEave.w + 0.1, P.y + (P.x - uEave.z) * k);
  // trước xưởng: tia đi sang −z phải vượt đường mái đầu hồi
  if (P.z > uGab.x && L.z < 0.0) {
    float t = (uGab.x - P.z) / L.z; vec3 H = P + L * t;
    float roof = uGab.y + max(0.0, uGab.z + 0.75 - abs(H.x)) * uGab.w;
    v *= mix(smoothstep(roof - 0.25, roof + 0.25, H.y), 1.0, smoothstep(uGab.z + 0.6, uGab.z + 1.2, abs(H.x)));
  }
  return v;
}
vec3 lamps(vec3 P, vec3 N) {
  vec3 s = vec3(0.0);
  for (int i = 0; i < NL; i++) {
    vec4 L = uLP[i];
    if (L.w <= 0.0) continue;
    vec3 d = L.xyz - P; float r2 = dot(d, d);
    if (r2 > L.w * L.w) continue;
    float r = sqrt(r2); vec3 l = d / max(r, 1e-3);
    float att = (1.0 - smoothstep(L.w * 0.35, L.w, r)) / (1.0 + r2 * 0.75);
    s += uLC[i].rgb * att * (0.18 + 0.82 * max(dot(N, l), 0.0));
  }
  if (uInk.w > 0.0) { vec3 d = uInk.xyz - P; float r2 = dot(d, d); if (r2 < 36.0) { vec3 l = d * inversesqrt(max(r2, 1e-4)); s += uInkC * uInk.w * (1.0 - smoothstep(1.5, 6.0, sqrt(r2))) / (1.0 + r2 * 1.2) * (0.2 + 0.8 * max(dot(N, l), 0.0)); } }
  return s;
}
vec3 litA(vec3 alb, vec3 N, vec3 P, float mv) {
  vec3 amb = mix(uGndAmb, uSkyAmb, N.y * 0.5 + 0.5);
  return alb * (amb + uMoonC * max(dot(N, uMoonDir), 0.0) * mv + lamps(P, N));
}
vec3 fogIt(vec3 c, vec3 P) {
  float d = length(P - cameraPosition);
  float f = 1.0 - exp(-pow(uFogD * d, 1.35));
  float low = exp(-max(P.y, 0.0) * 0.28) * smoothstep(9.0, 45.0, d) * 0.55;
  f = clamp(f + low * (1.0 - f), 0.0, 1.0);
  return mix(c, mix(uFogC, uFogHi, smoothstep(1.0, 28.0, P.y)), f);
}
`;
// SOI GIẢ: tia phản chiếu từ mặt nước hỏi thẳng tấm giấy (mặt z = DZ), đèn lồng (cầu), cửa sổ (trên mặt nhà), trời
const G_REFL = /* glsl */`
uniform vec4 uDoor;      // x tâm cửa, nửa rộng, y đáy, y đỉnh
uniform vec4 uDoorC;     // màu giấy (đã ấm) × độ sáng, lượng mực (0…1)
uniform vec4 uWin[NW];   // cửa sổ: x mặt tường, z tâm, nửa rộng, độ sáng
uniform vec4 uWinB[NW];  // y đáy, y đỉnh, hướng mặt (±1), 0
vec3 reflAt(vec3 P, vec3 R) {
  float up = max(R.y, 0.0);
  vec3 c = mix(uFogC * 1.2, uFogHi * 0.8, smoothstep(0.02, 0.5, up)) * 0.55;
  // bức tường hai bên (mặt nhà dưới hiên): tối
  float tw = 1e9;
  if (R.x < -1e-3) tw = (${LX.toFixed(2)} - P.x) / R.x; else if (R.x > 1e-3) tw = (${RX.toFixed(2)} - P.x) / R.x;
  if (tw > 0.0 && P.y + R.y * tw < 2.4) c = vec3(0.012, 0.016, 0.015);
  // cửa sổ trên mặt nhà
  for (int i = 0; i < NW; i++) {
    vec4 W = uWin[i]; if (W.w <= 0.0) continue;
    float t = (W.x - P.x) / (abs(R.x) > 1e-4 ? R.x : 1e-4);
    if (t <= 0.0) continue;
    vec3 H = P + R * t;
    if (abs(H.z - W.y) < W.z && H.y > uWinB[i].x && H.y < uWinB[i].y) c = warmP(W.w * 0.8);
  }
  // tấm giấy chính
  if (R.z < -1e-3) {
    float t = (${DZ.toFixed(2)} - P.z) / R.z; vec3 H = P + R * t;
    if (abs(H.x - uDoor.x) < uDoor.y && H.y > uDoor.z && H.y < uDoor.w) c = uDoorC.rgb * (0.85 + 0.15 * sin(H.y * 3.0)) + uInkC * uDoorC.a * 0.25;
  }
  // đèn lồng (cầu bán kính 0,2)
  for (int i = 0; i < NL; i++) {
    if (uLC[i].a > 0.5 || uLP[i].w <= 0.0) continue;
    vec3 oc = P - uLP[i].xyz; float b = dot(oc, R), cc = dot(oc, oc) - 0.045;
    if (b < 0.0 && b * b - cc > 0.0) c = warmP(1.1);
  }
  return c;
}
`;
const mk = (name, vs, fs, U, extra = {}, opt = {}) => new THREE.ShaderMaterial({ name, vertexShader: vs, fragmentShader: fs, uniforms: { ...U, ...extra }, ...opt });
const FS_HEAD = G_DECL + G_NOISE + G_PAL + G_LIGHT;

// ── NHÀ (vách đất, ván dọc, cột kèo, đá, tre) — một chương trình; aK chọn bề mặt ──
const WALL_VS = /* glsl */`
attribute float aK;
varying vec3 vW; varying vec3 vN; varying float vK;
void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; vN = normalize(mat3(modelMatrix) * normal); vK = aK; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const WALL_FS = FS_HEAD + /* glsl */`
varying vec3 vW; varying vec3 vN; varying float vK;
void main() {
  vec3 N = normalize(vN);
  vec3 t = abs(N.y) > 0.97 ? vec3(1.0, 0.0, 0.0) : normalize(cross(vec3(0.0, 1.0, 0.0), N));
  float u = dot(vW, t), y = vW.y, c, a;
  if (vK < 0.5) {            // vách đất 土壁: loang, ố ẩm chân tường, nứt mảnh
    vec2 q = vec2(u, y);
    c = 0.74 + 0.36 * fbm3(q * 1.3) + 0.1 * (vn(q * 12.0) - 0.5);
    c *= mix(0.58, 1.0, smoothstep(0.6, 1.9, y + 0.5 * vn(q * 2.1 + 5.0)));
    c *= 1.0 - 0.4 * (1.0 - smoothstep(0.0, 0.03, abs(vnA(q * 2.6 + 9.0) - 0.5))) * smoothstep(0.55, 0.7, vn(q * 0.7 + 2.0));
    a = 0.12;
  } else if (vK < 1.5) {     // ván dọc 腰板 / cửa lùa gỗ
    float id = floor(u / 0.19), fu = fract(u / 0.19);
    float seam = smoothstep(0.0, 0.05, fu) * smoothstep(1.0, 0.95, fu);
    c = (0.7 + 0.42 * hash12(vec2(id, 3.0))) * (0.78 + 0.36 * (vn(vec2(u * 70.0, y * 1.8 + id * 7.0)) * 0.6 + vn(vec2(u * 23.0, y * 0.7 + id)) * 0.4)) * mix(0.3, 1.0, seam);
    c *= mix(0.7, 1.0, smoothstep(0.0, 0.7, y));
    a = 0.032;
  } else if (vK < 2.5) {     // cột kèo
    c = 0.72 + 0.38 * vn(vec2(dot(vW, vec3(0.7, 0.2, 0.7)) * 4.0 + u * 6.0, y * 6.0));
    a = 0.026;
  } else if (vK < 3.5) {     // đá bờ mương / đá chặn
    c = 0.62 + 0.5 * fbm3(vec2(vW.x + vW.y, vW.z + vW.y) * 5.0);
    a = 0.06;
  } else {                   // tre
    c = 0.8 + 0.3 * vn(vec2(u * 30.0, y * 3.0 + vW.z * 3.0));
    a = 0.07;
  }
  vec3 col = litA(pal(vec3(a * c)), N, vW, moonVis(vW));
  gl_FragColor = vec4(fogIt(col, vW), 1.0);
}`;

// ── MÁI: tranh 茅葺 (sợi rơm theo dốc, mảng cũ mới, bậc cắt) · ngói 瓦 (sóng ngói, khoá hàng) ──
const ROOF_FS = FS_HEAD + /* glsl */`
varying vec3 vW; varying vec3 vN; varying float vK;
void main() {
  vec3 N = normalize(vN);
  vec3 t = abs(N.y) > 0.97 ? vec3(1.0, 0.0, 0.0) : normalize(cross(vec3(0.0, 1.0, 0.0), N));
  float a = dot(vW, t), c, alb;
  if (vK < 0.5) {
    float st = vn(vec2(a * 95.0, vW.y * 6.0)) * 0.55 + vn(vec2(a * 33.0, vW.y * 2.5 + 4.0)) * 0.45;
    c = (0.5 + 0.65 * st) * (0.68 + 0.5 * fbm3(vec2(a * 0.7, vW.y * 0.9) + 11.0)) * (0.82 + 0.18 * smoothstep(0.25, 0.75, fract(vW.y * 1.6 + 0.35 * vn(vec2(a * 1.5, 2.0)))));
    alb = 0.06;
  } else {
    vec3 up = normalize(cross(N, t)); float al = dot(vW, up);
    float cv = abs(sin(a * 3.14159 / 0.27));
    c = (0.5 + 0.55 * pow(cv, 0.8)) * mix(0.5, 1.0, smoothstep(0.0, 0.12, fract(al / 0.26))) * (0.85 + 0.3 * vn(vec2(a * 3.0, al * 4.0)));
    alb = 0.03;
  }
  vec3 col = litA(pal(vec3(alb * c)), N, vW, 1.0);
  gl_FragColor = vec4(fogIt(col, vW), 1.0);
}`;

// ── VẬT TỰ SÁNG (cửa sổ song gỗ, đèn lồng, đèn đứng, cửa hé, ô thoáng 欄間): giấy ấm có đèn sau lưng ──
const GLOW_VS = /* glsl */`
attribute float aK; attribute vec2 aUV; attribute vec3 aS;
varying vec3 vW; varying vec2 vUV; varying vec3 vS; varying float vK;
void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; vUV = aUV; vS = aS; vK = aK; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const GLOW_FS = G_DECL + G_NOISE + G_PAL + /* glsl */`
vec3 fogIt(vec3 c, vec3 P) { float d = length(P - cameraPosition); float f = 1.0 - exp(-pow(uFogD * d, 1.35)); return mix(c, uFogC, f); }
varying vec3 vW; varying vec2 vUV; varying vec3 vS; varying float vK;
void main() {
  vec2 m = vUV * vS.xy; float g = vS.z, wood = 0.0, lum;
  if (vK < 0.5 || vK > 3.5) {          // cửa sổ song gỗ 格子 · ô thoáng 欄間 (song thưa hơn)
    float bs = vK > 3.5 ? 0.11 : 0.085;
    wood = max(max(1.0 - step(0.017, abs(fract(m.x / bs) - 0.5) * bs), step(min(min(m.x, vS.x - m.x), min(m.y, vS.y - m.y)), 0.04)), step(abs(m.y - vS.y * 0.52), 0.016));
    lum = (0.72 + 0.28 * fbm3(m * 3.0 + vW.xz)) * (0.78 + 0.3 * vUV.y);
  } else if (vK < 1.5) {               // đèn lồng 提灯: nan tre ngang, giữa sáng hơn hai đầu
    wood = 0.45 * smoothstep(0.3, 0.5, abs(fract(vUV.y * 22.0) - 0.5));
    lum = 0.7 + 0.5 * sin(vUV.y * 3.14159);
  } else if (vK < 2.5) {               // đèn đứng 行灯
    wood = step(min(min(m.x, vS.x - m.x), min(m.y, vS.y - m.y)), 0.025);
    lum = 0.8 + 0.25 * vUV.y;
  } else { lum = 0.75 + 0.35 * vUV.y; } // cửa lùa hé: vệt sáng
  vec3 c = mix(warmP(g * lum), warmP(g * 0.09), wood);
  gl_FragColor = vec4(fogIt(c, vW), 1.0);
}`;

// ── VÁN PHƠI 板干し (nhân bản): tấm gỗ dựng nghiêng + 1–2 tờ giấy dó; mép giấy xơ, mây giấy, sợi ──
const BOARD_VS = /* glsl */`
attribute float aP; attribute vec2 aUV;
attribute vec4 iA;   // x, z, hướng (±1: quay về +x / −x), độ nghiêng
attribute vec4 iB;   // hai tờ (0/1), hạt, 0, 0
varying vec3 vW; varying vec3 vN; varying vec2 vUV; varying float vP; varying float vSd;
void main() {
  vec3 p = position; vec3 n = normal;
  if (aP > 0.5) {                      // tờ giấy: tờ A dưới (hoặc giữa nếu chỉ một tờ), tờ B trên (ẩn nếu một tờ)
    float two = iB.x;
    float yc = aP < 1.5 ? mix(0.92, 0.5, two) : 1.28;
    float sc = aP < 1.5 ? 1.0 : two;
    p.y = yc + p.y * sc; p.x *= sc;
    p.x += (hash12b(iB.y * 7.0 + aP) - 0.5) * 0.02;
  }
  float cl = cos(iA.w), sl = sin(iA.w);
  p = vec3(p.x, p.y * cl + p.z * sl, -p.y * sl + p.z * cl);
  n = vec3(n.x, n.y * cl + n.z * sl, -n.y * sl + n.z * cl);
  float a = iA.z * 1.5707963, ca = cos(a), sa = sin(a);
  p = vec3(p.x * ca + p.z * sa, p.y, -p.x * sa + p.z * ca);
  n = vec3(n.x * ca + n.z * sa, n.y, -n.x * sa + n.z * ca);
  vW = p + vec3(iA.x, 0.0, iA.y); vN = n; vUV = aUV; vP = aP; vSd = iB.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`.replace('void main() {', 'float hash12b(float x) { return fract(sin(x * 91.3458) * 47453.5453); }\nvoid main() {');
const BOARD_FS = FS_HEAD + /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec2 vUV; varying float vP; varying float vSd;
void main() {
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
  if (dot(N, V) < 0.0) N = -N;
  vec3 col;
  if (vP < 0.5) {
    float c = 0.72 + 0.3 * vn(vec2(vUV.x * 14.0 + vSd * 30.0, vUV.y * 3.0)) + 0.12 * vn(vec2(vUV.x * 60.0, vUV.y * 7.0));
    col = litA(pal(vec3(0.055 * c)), N, vW, moonVis(vW));
  } else {
    vec2 m = vUV * vec2(0.42, 0.74);
    float ed = min(min(m.x, 0.42 - m.x), min(m.y, 0.74 - m.y));
    if (ed < 0.003 + 0.015 * vnA(m * 95.0 + vSd * 13.0) * vnA(m * 21.0 + 3.0 + vSd)) discard;     // mép xơ 耳
    float cloud = fbm3(m * 9.0 + vSd * 5.0);
    float fib = vn(vec2(m.x * 180.0, m.y * 38.0)) * vn(vec2(m.x * 36.0, m.y * 170.0));
    float c = (0.84 + 0.16 * cloud - 0.12 * fib) * mix(0.82, 1.0, smoothstep(0.0, 0.025, ed));
    vec3 alb = warmP(0.66 * c);
    vec3 amb = mix(uGndAmb, uSkyAmb, N.y * 0.5 + 0.5);
    col = alb * (amb * 1.3 + uMoonC * max(dot(N, uMoonDir), 0.0) * moonVis(vW) + lamps(vW, N));
  }
  gl_FragColor = vec4(fogIt(col, vW), 1.0);
}`;

// ── VỎ 楮 đã tẩy trắng 白皮 vắt trên sào tre (nhân bản): dải dài, sợi dọc, mép xơ ──
const BARK_VS = /* glsl */`
attribute vec4 iA; attribute vec4 iB;   // x y z, xoay y · xoay z, rộng, dài, hạt
varying vec3 vW; varying vec3 vN; varying vec2 vUV; varying float vSd;
void main() {
  vec3 p = vec3(position.x * iB.y, (position.y - 0.5) * iB.z, 0.0);
  float cz = cos(iB.x), sz = sin(iB.x); p = vec3(p.x * cz - p.y * sz, p.x * sz + p.y * cz, 0.0);
  float cy = cos(iA.w), sy = sin(iA.w);
  vec3 q = vec3(p.x * cy, p.y, -p.x * sy); vec3 n = vec3(sy, 0.0, cy);
  vW = q + iA.xyz; vN = n; vUV = uv; vSd = iB.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;
const BARK_FS = FS_HEAD + /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec2 vUV; varying float vSd;
void main() {
  if (abs(vUV.x - 0.5) > 0.47 - 0.14 * vn(vec2(vUV.y * 70.0, vSd * 9.0))) discard;
  vec3 N = normalize(vN), V = normalize(cameraPosition - vW); if (dot(N, V) < 0.0) N = -N;
  float c = (0.78 + 0.22 * vn(vec2(vUV.x * 5.0 + vSd, vUV.y * 55.0))) * (0.82 + 0.18 * fbm3(vec2(vUV.x * 2.0, vUV.y * 7.0 + vSd))) * mix(0.7, 1.0, vUV.y);
  vec3 amb = mix(uGndAmb, uSkyAmb, 0.6);
  vec3 col = warmP(0.62 * c) * (amb * 1.6 + lamps(vW, N) + uMoonC * (0.35 + 0.5 * max(dot(N, uMoonDir), 0.0)));
  gl_FragColor = vec4(fogIt(col, vW), 1.0);
}`;

// ── ĐẤT NGÕ: đất nện + lối đá lát không đều (đá to nhỏ lẫn nhau, có chỗ khuyết, rêu trong khe), vũng nước soi giả ──
const GROUND_VS = /* glsl */`
varying vec3 vW;
void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const GROUND_FS = FS_HEAD + G_REFL + /* glsl */`
uniform vec4 uPud[3];
varying vec3 vW;
vec3 cell(vec2 p) {                 // ô đá: (khoảng tới mép, số của ô, cỡ tương đối)
  vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0, id = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)); vec2 o = vec2(hash12(i + g), hash12(i + g + 7.3)) * 0.84 + 0.08;
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; id = hash12(i + g + 3.1); } else if (d < d2) d2 = d;
  }
  return vec3(d2 - d1, id, d1);
}
void main() {
  vec2 q = vW.xz;
  vec3 N = vec3(0.0, 1.0, 0.0);
  float e = 0.7 + 0.42 * fbm3(q * 1.2) + 0.12 * (vn(q * 16.0) - 0.5);
  // lối đá: hai cỡ ô (đá lớn giữa lối, cuội nhỏ ở mép), toạ độ uốn nhẹ → không thành lưới lặp
  vec2 qw = q + 0.35 * vec2(vn(q * 0.9 + 3.0) - 0.5, vn(q * 0.9 + 11.0) - 0.5);
  float path = 1.0 - smoothstep(0.85, 1.12, abs(q.x - 0.1) + 0.15 * (vn(q * 1.7) - 0.5));
  vec3 cb = cell(qw * vec2(2.2, 1.7)), cs = cell(qw * 4.6 + 13.0);
  float big = smoothstep(0.55, 0.8, 1.0 - abs(q.x - 0.1) / 1.1 + 0.25 * (vn(q * 2.3) - 0.5));
  vec3 cc = mix(cs, cb, big);
  float missing = step(0.9, hash12(vec2(cc.y * 91.0, 3.3)));            // vài viên khuyết: lộ đất
  float stone = smoothstep(0.04, 0.12, cc.x) * (1.0 - missing);
  float sc = (0.72 + 0.6 * cc.y) * (0.86 + 0.24 * vn(q * 25.0)) * (0.9 + 0.2 * cc.z);
  float moss = (1.0 - smoothstep(0.0, 0.08, cc.x)) * smoothstep(0.35, 0.7, vn(q * 3.0 + 7.0));
  float c = mix(e, mix(0.3 + 0.2 * moss, sc, stone), path);
  float wallD = min(abs(q.x - ${LX.toFixed(2)}), abs(q.x - ${RX.toFixed(2)}));
  c *= mix(0.6, 1.0, smoothstep(0.0, 0.8, wallD));
  // mặt đá hơi lồi (pháp tuyến nghiêng ra mép viên) — đạo hàm tính ngoài mọi nhánh
  float hS = smoothstep(0.0, 0.2, cc.x);
  vec3 Nb = normalize(vec3(dFdx(hS) * 2.5, 1.0, dFdy(hS) * 2.5));
  N = normalize(mix(N, Nb, 0.35 * stone * path));
  vec3 alb = pal(vec3(0.075 * c));
  float mv = moonVis(vW);
  vec3 col = litA(alb, N, vW, mv);
  // vũng nước: soi giả + ánh trăng láng trên đá ướt
  float wet = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 d = (q - uPud[i].xy) / uPud[i].zw;
    float a = atan(d.y, d.x), r = length(d) / (1.0 + 0.22 * sin(a * 3.0 + uPud[i].x * 5.0) + 0.12 * sin(a * 5.0 + uPud[i].y));
    wet = max(wet, 1.0 - smoothstep(0.92, 1.02, r));
  }
  if (wet > 0.0) {
    vec3 V = normalize(cameraPosition - vW);
    vec3 Nw = normalize(vec3((vn(q * 9.0) - 0.5) * 0.1, 1.0, (vn(q * 9.0 + 4.0) - 0.5) * 0.1));
    vec3 R = reflect(-V, Nw);
    float fr = 0.12 + 0.5 * pow(1.0 - max(dot(Nw, V), 0.0), 5.0);
    col = mix(col, col * 0.3 + reflAt(vW, R) * fr * 0.45, wet);
  }
  gl_FragColor = vec4(fogIt(col, vW), 1.0);
}`;

// ── MƯƠNG NƯỚC (bên phải ngõ): soi giả tấm giấy, đèn lồng, cửa sổ; gợn nhẹ ──
const WATER_FS = FS_HEAD + G_REFL + /* glsl */`
uniform float uTime;
varying vec3 vW;
void main() {
  vec3 V = normalize(cameraPosition - vW);
  vec2 q = vW.xz;
  vec3 N = normalize(vec3((vn(vec2(q.x * 9.0, q.y * 3.0 - uTime * 0.6)) - 0.5) * 0.08, 1.0, (vn(vec2(q.x * 9.0 + 5.0, q.y * 3.0 - uTime * 0.6)) - 0.5) * 0.12));
  vec3 R = reflect(-V, N);
  float fr = (0.14 + 0.5 * pow(1.0 - max(dot(N, V), 0.0), 5.0)) * 0.6;
  vec3 base = pal(vec3(0.012)) * (uGndAmb + lamps(vW, vec3(0.0, 1.0, 0.0)) * 0.5);
  gl_FragColor = vec4(fogIt(base + reflAt(vW, R) * fr, vW), 1.0);
}`;

// ── TẤM GIẤY CHÍNH: giấy dó có đèn sau lưng + nét cọ 緑青 vẽ lưới nan 組子 ──
// Nét đọc ra NÉT CỌ ngay từ xa: dày mỏng rõ (đầu ấn đậm, thân to nhỏ theo tay, đuôi vuốt dài), xơ khô 掠れ thấy được ở nửa sau
// nét, mực loang nhẹ vào giấy quanh mép (sợi giấy hút mực), nét hơi lượn — không phải vạch đèn đều.
const SHEET_VS = /* glsl */`
varying vec2 vUv; varying vec3 vW;
void main() { vUv = uv; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const SHEET_FS = G_DECL + G_NOISE + G_PAL + /* glsl */`
#define NSEG ${NSEG}
uniform vec2 uSize; uniform float uGlow; uniform vec3 uHot;
uniform vec4 uSeg[NSEG]; uniform vec4 uSegB[NSEG];
uniform vec3 uInkCore, uInkBody, uInkHalo, uInkBase, uInkHead;
varying vec2 vUv; varying vec3 vW;
void main() {
  vec2 p = (vUv - 0.5) * uSize;
  float fw = max(length(fwidth(p)), 1e-4);
  vec2 hq = (p - uHot.xy) / vec2(1.05, 1.3);
  float hot = 0.52 + uHot.z * exp(-dot(hq, hq) * 1.3);
  float cloud = fbm3(p * 4.5 + 3.0);
  vec2 pw = p + 0.12 * vec2(fbm3(p * 2.5), fbm3(p * 2.5 + 7.0));
  float fib = 0.0;
  for (int k = 0; k < 5; k++) { float a = hash12(vec2(float(k), 9.1)) * 6.2832; vec2 d = vec2(cos(a), sin(a)); vec2 q = vec2(dot(pw, d), dot(pw, vec2(-d.y, d.x)));
    fib += smoothstep(0.78, 0.97, vn(vec2(q.x * 9.0, q.y * 120.0) + float(k) * 13.0)) * smoothstep(0.35, 0.7, vn(q * 3.0 + float(k) * 5.0)); }
  float edge = min(uSize.x * 0.5 - abs(p.x), uSize.y * 0.5 - abs(p.y));
  vec3 paper = warmP(0.72 * uGlow * hot * (0.8 + 0.3 * cloud) * (1.0 - 0.045 * fib) * mix(0.72, 1.0, smoothstep(0.0, 0.1, edge)));
  float cov = 0.0, bleed = 0.0, haloM = 0.0, haloS = 0.0; vec3 emC = vec3(0.0), em = vec3(0.0);
  for (int i = 0; i < NSEG; i++) {
    vec4 S = uSeg[i], B = uSegB[i];
    if (B.y <= 0.0) continue;
    vec2 ab = S.zw - S.xy; float L = length(ab); vec2 d = ab / L, n = vec2(-d.y, d.x);
    float s = dot(p - S.xy, d), x = dot(p - S.xy, n);
    float e = B.y * L, w = B.x;
    if (s < -0.15 || s > e + 0.15 || abs(x) > 0.16) continue;
    float ss = clamp(s, 0.0, e), tt = ss / L;
    bool vert = abs(d.y) > 0.7;                                                              // nan đứng: dừng bút 止め · nan ngang: vuốt đuôi 払い
    x -= 0.005 * sin(ss * 2.3 + B.z) + 0.004 * (vn(vec2(ss * 3.0, B.z)) - 0.5);          // tay kéo nét: hơi lượn
    x += 0.35 * w * exp(-ss / (w * 3.0));                                                    // 起筆: đầu bút đặt chéo, phình lệch một bên
    float press = 1.0 + 0.75 * exp(-ss / (w * 2.2));
    float body = (0.58 + 0.7 * vn(vec2(ss * 1.3, B.z))) * (0.9 + 0.2 * vn(vec2(ss * 9.0, B.z + 3.0)));   // lực tay: phình / thắt rõ
    float tail = 1.0;
    if (B.y >= 1.0) tail = vert ? 1.0 + 0.3 * exp(-(L - ss) / (w * 2.2)) : mix(1.0, 0.08, pow(smoothstep(L - w * 20.0, L, ss), 0.75));
    float wd = w * press * body * tail;
    float dist = length(vec2(s - ss, x)) + (vn(p * 190.0 + B.z) - 0.5) * w * 0.35;          // mép nét rách theo sợi giấy
    float c = 1.0 - smoothstep(wd - fw, wd + fw, dist);
    // xơ khô 掠れ: nét dài cạn mực từ giữa nét — lông cọ để lại vệt hở sắc chạy dọc nét; mép nét xơ trước lõi
    float dry = smoothstep(0.28, 0.95, tt) * (L > 1.5 ? 1.0 : 0.75) + 0.45 * smoothstep(0.5, 1.0, abs(x) / max(wd, 1e-4));
    float hair = vnA(vec2(ss * 3.2, x / max(w, 1e-4) * 6.5 + B.z));
    c *= mix(0.86 + 0.14 * hair, smoothstep(0.4, 0.5, hair), clamp(dry, 0.0, 1.0));            // thân nét có vân sợi lông cọ
    float dens = mix(1.0, 0.6, smoothstep(0.15, 1.0, tt));                                   // mực đậm đầu nét, nhạt dần
    cov = max(cov, c * dens);
    // mực loang vào giấy: viền mờ theo sợi giấy ngay ngoài mép nét
    float fe = max(dist - wd, 0.0);
    bleed = max(bleed, exp(-fe / 0.01) * (0.35 + 0.65 * vn(p * 260.0 + B.z)) * (1.0 - c) * dens * 0.8);
    float ctr = 1.0 - clamp(abs(x) / max(wd, 1e-4), 0.0, 1.0);
    // thân nét là MỰC (sẫm hơn giấy) có LÕI SÁNG 緑青 chạy suốt nét theo đúng dáng cọ (đầu ướt sáng nhất, cuối khô nhạt dần) — nét cọ
    // phát sáng như các chương khác, không phải nét sơn bạc hà đặc
    emC = max(emC, (uInkCore * smoothstep(0.45, 0.9, ctr) * (0.7 + 0.3 * vn(p * 120.0 + B.z)) * mix(1.6, 0.9, smoothstep(0.0, 0.9, tt)) + uInkBody * 0.3) * c * dens);
    float hl = (exp(-dist / 0.016) * 0.34 + exp(-dist / 0.05) * 0.1) * dens;   // quầng xanh nhẹ loang trên giấy quanh nét
    haloM = max(haloM, hl); haloS += hl;
    if (B.w > 0.5) { float hd = length(p - (S.xy + d * e)); float hk = exp(-hd / (w * 1.8)) * 1.3 + exp(-hd / 0.06) * 0.35; em += uInkHead * hk; haloM = max(haloM, hk); }
  }
  em += emC + uInkHalo * mix(haloM, haloS, 0.35);
  // đèn sau giấy xuyên qua lớp mực: nét là giấy sáng NHUỘM 緑青 đậm (lõi sáng, thân đậm sắc) — không phải lớp sơn đục phủ lên giấy
  vec3 c = mix(paper, paper * vec3(0.09, 0.5, 0.38), clamp(cov * 0.95, 0.0, 1.0));
  c = mix(c, c * vec3(0.55, 0.95, 0.82) + uInkBody * 0.18, bleed * (1.0 - cov));   // mực loang thấm vào giấy: nhuộm xanh, không vẽ viền tối
  // đèn sau giấy xuyên qua vệt mực loang quanh nét → quầng 緑青 trên giấy sáng (nét giữ màu, không bị ánh giấy rửa thành xám)
  c = mix(c, c * vec3(0.5, 0.88, 0.76), clamp(haloM * 1.5, 0.0, 0.6) * (1.0 - cov)) + em * 0.8;
  gl_FragColor = vec4(c, 1.0);
}`;

// ── TRỜI: xám lục đêm, ánh trăng sau núi (phía cuối ngõ, thấp), vệt mây mỏng ──
const SKY_FS = /* glsl */`
uniform vec3 uFogC, uFogHi, uMoonC; uniform vec3 uGDir; varying vec3 vD;
float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
void main() {
  vec3 d = normalize(vD); float h = d.y;
  vec3 c = mix(uFogC * 1.35, uFogHi * 0.6, smoothstep(0.0, 0.55, h));
  float g = max(dot(d, uGDir), 0.0); c += uMoonC * (pow(g, 5.0) * 0.9 + pow(g, 28.0) * 0.5) * (1.0 - smoothstep(0.08, 0.5, h));
  float cl = (n2(vec2(atan(d.x, -d.z) * 4.0, h * 16.0)) * 0.6 + n2(vec2(atan(d.x, -d.z) * 11.0, h * 40.0)) * 0.4) * smoothstep(0.05, 0.3, h) * (1.0 - smoothstep(0.35, 0.7, h));
  gl_FragColor = vec4(c * (1.0 + 0.2 * cl), 1.0);
}`;

// ── TUYẾT TÙNG XA (nhân bản, có TẦNG CÀNH thật và SƯƠNG): thân + 7 tầng nón rủ, mép tầng răng cưa; trăng sau lưng → viền sáng ──
const TREE_VS = G_DECL + G_NOISE + /* glsl */`
attribute vec3 aT;   // góc θ, vị trí trên cây (0…1), 0 = thân · 1 = mép tầng
attribute vec4 iA;   // x, y0, z, cao
attribute vec2 iB;   // bán kính tầng dưới, hạt
varying vec3 vW; varying vec3 vN; varying float vRim; varying float vH;
void main() {
  float th = aT.x, f = aT.y, h = iA.w, sd = iB.y;
  vec3 P; vec3 N;
  if (aT.z < 0.5) { float r = 0.02 * h * (1.0 - f); P = vec3(cos(th) * r, f * h, sin(th) * r); N = vec3(cos(th), 0.0, sin(th)); }
  else {
    float tier = floor(f * 7.0), ft = fract(f * 7.0);
    float R = iB.x * pow(1.0 - (tier + ft * 0.9) / 7.6, 1.1);
    float jag = 0.75 + 0.5 * vn(vec2(th * 3.0 + tier * 5.0 + sd * 30.0, sd * 11.0));
    float rr = R * jag * ft;
    float y = (0.14 + 0.86 * (tier + 1.0 - ft * 0.75) / 7.0) * h - ft * ft * 0.25 * h / 7.0;
    P = vec3(cos(th) * rr, y, sin(th) * rr);
    N = normalize(vec3(cos(th), 0.55, sin(th)));
  }
  vW = P + iA.xyz; vN = N; vH = f;
  vec3 V = normalize(cameraPosition - vW);
  vRim = pow(1.0 - abs(dot(N, V)), 2.0) * max(dot(normalize(vec3(N.x, 0.0, N.z)), -normalize(vec3(uMoonDir.x, 0.0, uMoonDir.z)) * -1.0), 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
}`;
const TREE_FS = G_DECL + G_NOISE + G_PAL + /* glsl */`
varying vec3 vW; varying vec3 vN; varying float vRim; varying float vH;
void main() {
  vec3 N = normalize(vN);
  vec3 alb = pal(vec3(0.016 * (0.8 + 0.4 * vn(vW.xz * 3.0 + vW.y))));
  vec3 c = alb * (mix(uGndAmb, uSkyAmb, N.y * 0.5 + 0.5) + uMoonC * 0.5 * vRim);
  float d = length(vW - cameraPosition);
  float f = (1.0 - exp(-pow(uFogD * 0.8 * d, 1.4))) * 0.8;
  float mist = exp(-max(vW.y - 0.5, 0.0) * 0.22) * smoothstep(20.0, 70.0, d) * 0.7;    // chân rừng chìm trong sương
  f = clamp(f + mist * (1.0 - f), 0.0, 0.97);
  gl_FragColor = vec4(mix(c, mix(uFogC * 1.12, uFogHi, smoothstep(2.0, 30.0, vW.y)), f), 1.0);
}`;

// ── NÚI XA (hai lớp): dải có mép trên răng cưa rừng, chìm trong sương ──
const RIDGE_VS = /* glsl */`
attribute float aTop; varying vec3 vW; varying float vTop;
void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; vTop = aTop; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const RIDGE_FS = /* glsl */`
uniform vec3 uFogC, uFogHi; uniform float uK; varying vec3 vW; varying float vTop;
void main() { gl_FragColor = vec4(mix(uFogC * 0.62, uFogHi * 0.9, uK) * (0.92 + 0.08 * vTop), 1.0); }`;

// ── SƯƠNG giữa các lớp rừng: tấm trong suốt, đặc ở chân ──
const MIST_FS = /* glsl */`
uniform vec3 uFogC; uniform float uA; varying vec2 vUv;
float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
void main() { float a = uA * pow(1.0 - vUv.y, 1.6) * (0.7 + 0.5 * n2(vec2(vUv.x * 8.0, vUv.y * 2.0))); gl_FragColor = vec4(uFogC * 1.25, a); }`;

// ── CỎ dưới chân tường, mép mương (nhân bản, lá vẽ bằng công thức) ──
const GRASS_VS = /* glsl */`
attribute vec4 iA;   // x, z, cao, xoay
varying vec3 vW; varying vec2 vUV; varying float vSd;
void main() { float c = cos(iA.w), s = sin(iA.w); vec3 p = vec3(position.x * iA.z * 1.2, (position.y + 0.5) * iA.z, 0.0); p = vec3(p.x * c, p.y, -p.x * s);
  vW = p + vec3(iA.x, 0.0, iA.y); vUV = uv; vSd = iA.w; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const GRASS_FS = FS_HEAD + /* glsl */`
varying vec3 vW; varying vec2 vUV; varying float vSd;
void main() {
  float keep = 0.0;
  for (int k = 0; k < 5; k++) {
    float fk = float(k) + vSd * 7.0;
    float bx = 0.12 + 0.76 * hash12(vec2(fk, 1.3)), ln = (hash12(vec2(fk, 5.1)) - 0.5) * 0.6, bh = 0.4 + 0.6 * hash12(vec2(fk, 2.7));
    if (vUV.y < bh && abs(vUV.x - (bx + ln * vUV.y * vUV.y)) < 0.075 * (1.0 - vUV.y / bh)) keep = 1.0;
  }
  if (keep < 0.5) discard;
  vec3 col = litA(pal(vec3(0.02 * (0.55 + 0.6 * vUV.y))), vec3(0.0, 1.0, 0.0), vW, moonVis(vW));
  gl_FragColor = vec4(fogIt(col, vW), 1.0);
}`;

// ═════════════════════════════════════════════════════════════════════════════════════════════
export function createLang(renderer) {
  void renderer;
  const scene = new THREE.Scene();
  scene.name = 'lang-giay';
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1500);
  const col = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);
  const noiseTex = new THREE.DataTexture(NOISE, NZ, NZ, THREE.RGBAFormat);
  noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping; noiseTex.magFilter = noiseTex.minFilter = THREE.LinearFilter;
  noiseTex.generateMipmaps = false; noiseTex.colorSpace = THREE.NoColorSpace; noiseTex.needsUpdate = true;
  const U = {
    uNoise: { value: noiseTex },
    uMoonDir: { value: MOON }, uMoonC: { value: col(0xa3aeaa, 0.75) },
    uSkyAmb: { value: col(0x3a403d, 0.95) }, uGndAmb: { value: col(0x1a1c19, 0.8) },
    uFogC: { value: col(0x2c3935) }, uFogHi: { value: col(0x33423e) }, uFogD: { value: 0.016 },
    uLP: { value: Array.from({ length: NL }, () => new THREE.Vector4()) },
    uLC: { value: Array.from({ length: NL }, () => new THREE.Vector4()) },
    uInk: { value: new THREE.Vector4(0.05, 1.3, DZ + 0.4, 0) }, uInkC: { value: col(RAMP[400]) },
    uEave: { value: new THREE.Vector4() }, uGab: { value: new THREE.Vector4() },
  };
  const RU = {
    uDoor: { value: new THREE.Vector4(0, SW / 2, SY0, SY0 + SHH) }, uDoorC: { value: new THREE.Vector4() },
    uWin: { value: Array.from({ length: NW }, () => new THREE.Vector4()) }, uWinB: { value: Array.from({ length: NW }, () => new THREE.Vector4()) },
  };
  const SU = {
    uSize: { value: new THREE.Vector2(SW, SHH) }, uGlow: { value: 0.72 }, uHot: { value: new THREE.Vector3(0.05, -0.2, 0.62) },
    uSeg: { value: Array.from({ length: NSEG }, () => new THREE.Vector4()) }, uSegB: { value: Array.from({ length: NSEG }, () => new THREE.Vector4()) },
    uInkCore: { value: col(RAMP[300], 0.85) }, uInkBody: { value: col(RAMP[500], 0.62) }, uInkHalo: { value: col(RAMP[400], 0.42) },
    uInkBase: { value: col(RAMP[900], 0.22) }, uInkHead: { value: col(RAMP[300], 1.5) },
  };
  const WU = { uTime: { value: 0 } };
  const M = {
    wall: mk('lang-nha', WALL_VS, WALL_FS, U),
    roof: mk('lang-mai', WALL_VS, ROOF_FS, U),
    glow: mk('lang-den', GLOW_VS, GLOW_FS, U, {}, { side: THREE.DoubleSide }),
    board: mk('lang-van-phoi', BOARD_VS, BOARD_FS, U, {}, { side: THREE.DoubleSide }),
    bark: mk('lang-vo-do', BARK_VS, BARK_FS, U, {}, { side: THREE.DoubleSide }),
    ground: mk('lang-dat', GROUND_VS, GROUND_FS, U, { ...RU, uPud: { value: PUD.map((p) => new THREE.Vector4(p[0], p[1], p[2], p[3])) } }),
    water: mk('lang-muong', GROUND_VS, WATER_FS, U, { ...RU, ...WU }),
    sheet: mk('lang-giay-chinh', SHEET_VS, SHEET_FS, U, SU, { side: THREE.DoubleSide }),
    sky: new THREE.ShaderMaterial({
      name: 'lang-troi', side: THREE.BackSide, depthWrite: false,
      uniforms: { uFogC: U.uFogC, uFogHi: U.uFogHi, uMoonC: U.uMoonC, uGDir: { value: new THREE.Vector3(-0.25, 0.1, -1).normalize() } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }',
      fragmentShader: SKY_FS,
    }),
    tree: mk('lang-tuyet-tung', TREE_VS, TREE_FS, U),
    ridge: mk('lang-nui', RIDGE_VS, RIDGE_FS, { uFogC: U.uFogC, uFogHi: U.uFogHi }, { uK: { value: 0.5 } }),
    mist: mk('lang-suong', 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', MIST_FS, { uFogC: U.uFogC }, { uA: { value: 0.8 } }, { transparent: true, depthWrite: false }),
    grass: mk('lang-co', GRASS_VS, GRASS_FS, U, {}, { side: THREE.DoubleSide }),
  };

  const st = { built: false, verts: 0, meshes: 0, boards: 0, strips: 0, trees: 0, buildMs: 0, at: '', addMs: [] };
  const add = (geo, mat, name, order = 0, cull = true) => {
    const t0 = performance.now();
    const m = new THREE.Mesh(geo, mat); m.name = name; m.renderOrder = order; m.frustumCulled = cull;
    scene.add(m);
    const pc = geo.attributes.position ? geo.attributes.position.count : 0;
    st.verts += pc * (geo.isInstancedBufferGeometry ? geo.instanceCount : 1);
    st.meshes++; st.addMs.push([name, +(performance.now() - t0).toFixed(1)]);
    return m;
  };

  // ── gom hình tĩnh vào một lưới mỗi chương trình (nhà · mái · vật sáng) ──
  const bucket = () => ({ P: [], N: [], K: [], UV: [], S: [] });
  const B = { wall: bucket(), roof: bucket(), glow: bucket() };
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  function pushGeo(b, g, m4, kind, S = null) {
    const ng = g.index ? g.toNonIndexed() : g;
    if (m4) ng.applyMatrix4(m4);
    const P = ng.attributes.position, N = ng.attributes.normal, UVa = ng.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      b.P.push(P.getX(i), P.getY(i), P.getZ(i)); b.N.push(N.getX(i), N.getY(i), N.getZ(i)); b.K.push(kind);
      b.UV.push(UVa ? UVa.getX(i) : 0, UVa ? UVa.getY(i) : 0);
      b.S.push(S ? S[0] : 1, S ? S[1] : 1, S ? S[2] : 1);
    }
    ng.dispose(); if (ng !== g) g.dispose();
  }
  const place = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => tmpM.compose(new THREE.Vector3(x, y, z), tmpQ.setFromEuler(tmpE.set(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const box = (b, w, h, d, x, y, z, kind, rx = 0, ry = 0, rz = 0) => pushGeo(b, new THREE.BoxGeometry(w, h, d), place(x, y, z, rx, ry, rz), kind);
  const tri = (b, xa, xb, xm, y0, y1, z, kind, alongX = true) => {   // tam giác đầu hồi (hai mặt)
    const g = new THREE.BufferGeometry();
    const p = alongX ? [xa, y0, z, xb, y0, z, xm, y1, z, xb, y0, z, xa, y0, z, xm, y1, z] : [z, y0, xa, z, y0, xb, z, y1, xm, z, y0, xb, z, y0, xa, z, y1, xm];
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals(); pushGeo(b, g, null, kind);
  };
  const panel = (w, h, x, y, z, ry, kind, glow) => pushGeo(B.glow, new THREE.PlaneGeometry(w, h), place(x, y, z, 0, ry), kind, [w, h, glow]);
  const toMesh = (b, name, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.N, 3));
    g.setAttribute('aK', new THREE.Float32BufferAttribute(b.K, 1)); g.setAttribute('aUV', new THREE.Float32BufferAttribute(b.UV, 2)); g.setAttribute('aS', new THREE.Float32BufferAttribute(b.S, 3));
    g.computeBoundingSphere();
    return add(g, mat, name);
  };

  // đèn giả + cửa sổ (điền lúc dựng)
  const LIGHTS = [], WINS = [];
  const light = (x, y, z, r, c, k, type) => { LIGHTS.push([x, y, z, r, c, k, type]); };
  const lampC = new THREE.Color(0xdde6e1);

  function slabXY(b, P, Q, T, len, zc, kind, extra = 0) {
    const [a, c] = P[0] < Q[0] ? [P, Q] : [Q, P];
    const dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    box(b, L + extra, T, len, (a[0] + c[0]) / 2 + Math.sin(ang) * T / 2, (a[1] + c[1]) / 2 - Math.cos(ang) * T / 2, zc, kind, 0, 0, ang);
  }
  // nhà dân dã: open [loại, z, rộng, sáng]
  function minka({ fx, z0, z1, depth = 6, H = 2.9, roof = 'tile', pitch = 0.5, ovF = 1.0, ovB = 0.6, open = [] }) {
    const s = Math.sign(fx), L = z1 - z0, zc = (z0 + z1) / 2, xo = fx + s * depth, xm = fx + s * depth / 2;
    box(B.wall, depth - 0.12, H, L, xm + s * 0.06, H / 2, zc, 0);
    box(B.wall, 0.06, 0.95, L, fx + s * 0.06, 0.475, zc, 1);
    const nP = Math.max(1, Math.round(L / 1.82));
    for (let i = 0; i <= nP; i++) box(B.wall, 0.16, H, 0.16, fx + s * 0.08, H / 2, z0 + 0.08 + (L - 0.16) * i / nP, 2);
    box(B.wall, 0.2, 0.22, L + 0.3, fx + s * 0.08, H - 0.11, zc, 2);
    box(B.wall, 0.09, 0.07, L, fx + s * 0.03, 0.98, zc, 2);
    box(B.wall, 0.17, 0.12, L, fx + s * 0.08, 0.06, zc, 2);
    for (const [k, z, w, lum] of open) {
      if (k === 'win') {
        panel(w, 1.0, fx + s * 0.1, 1.65, z, -s * Math.PI / 2, 0, lum);
        box(B.wall, 0.14, 0.06, w + 0.24, fx + s * 0.02, 1.12, z, 2);
        light(fx - s * 0.35, 1.6, z, 4.5, lampC, lum * 1.3, 1);
        WINS.push([fx - s * 0.1, z, w / 2, lum, 1.15, 2.15, -s]);
      } else {
        box(B.wall, 0.07, 1.9, w, fx + s * 0.03, 0.95, z, 1);
        box(B.wall, 0.12, 0.1, w + 0.2, fx + s * 0.02, 1.95, z, 2);
        panel(0.18, 1.85, fx - s * 0.005, 0.95, z + w / 2 - 0.12, -s * Math.PI / 2, 3, lum);
        light(fx - s * 0.3, 1.0, z + w / 2 - 0.12, 4, lampC, lum * 1.0, 1);
        WINS.push([fx - s * 0.01, z + w / 2 - 0.12, 0.09, lum, 0.05, 1.85, -s]);
      }
    }
    const tp = Math.tan(pitch), yr = H + (depth / 2) * tp, T = roof === 'thatch' ? 0.45 : 0.13, rk = roof === 'thatch' ? 0 : 1;
    const eF = [fx - s * ovF, H - ovF * tp], eB = [xo + s * ovB, H - ovB * tp], rg = [xm, yr];
    slabXY(B.roof, eF, rg, T, L + 0.9, zc, rk, roof === 'thatch' ? 0.3 : 0.06);
    slabXY(B.roof, rg, eB, T, L + 0.9, zc, rk, roof === 'thatch' ? 0.3 : 0.06);
    if (roof === 'thatch') { pushGeo(B.roof, new THREE.CylinderGeometry(0.3, 0.3, L + 1.0, 10), place(xm, yr + 0.12, zc, Math.PI / 2), 0); box(B.wall, 0.3, 0.16, L + 1.0, xm, yr + 0.42, zc, 2); }
    else box(B.roof, 0.3, 0.3, L + 0.95, xm, yr + 0.1, zc, 1);
    for (const zz of [z0, z1]) {
      tri(B.wall, Math.min(fx + s * 0.12, xo), Math.max(fx + s * 0.12, xo), xm, H, yr - 0.05, zz, 0);
      box(B.wall, depth, 0.18, 0.18, xm, H, zz, 2);
      box(B.wall, 0.14, yr - H, 0.16, xm, (H + yr) / 2, zz, 2);
    }
    return { s, fx, z0, z1, H, eave: eF, T };
  }
  function board(list, xb, zb, face, lean, two) { list.push([xb, zb, face, lean, two ? 1 : 0, R()]); }
  function boardsAlong(list, h, skip) {
    const lean = 0.34, off = 1.75 * Math.sin(lean);
    for (let z = h.z0 + 0.35; z < h.z1 - 0.3; z += 0.56) {
      if (skip.some(([a, b]) => z > a && z < b)) continue;
      board(list, h.fx - h.s * off, z, -h.s, lean + (R() - 0.5) * 0.06, R() < 0.55);
    }
  }

  let seed = 20261001;
  const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const rr = (a, b) => a + (b - a) * R();
  let sheet = null;
  // ── DỰNG (bộ sinh: mỗi lần next() làm một mẩu nhỏ) ──
  function* build() {
    const t0 = performance.now();
    st.at = 'nha';
    const L1 = minka({ fx: LX, z0: -5.6, z1: 4.6, roof: 'thatch', H: 3.0, open: [['win', 2.8, 1.2, 0.5], ['doorLit', 0.6, 1.5, 0.7]] }); yield;
    const L2 = minka({ fx: LX, z0: -10.2, z1: -7.8, roof: 'tile', H: 2.8, open: [['win', -9.0, 1.1, 0.42]] }); yield;
    const R1 = minka({ fx: RX, z0: -3.6, z1: 4.6, roof: 'tile', H: 2.8, open: [['win', 3.2, 1.3, 0.5], ['doorLit', 1.0, 1.5, 0.55]] }); yield;
    const R2 = minka({ fx: RX, z0: -10.2, z1: -6.4, roof: 'thatch', H: 3.0, open: [['win', -8.3, 1.2, 0.45]] }); yield;
    // bóng trăng: mép hiên trái (x, cao mép trên) · mép hiên phải (x, cao đáy mép)
    U.uEave.value.set(L1.eave[0], L1.eave[1] + 0.05, R1.eave[0], R1.eave[1] - 0.13);
    // xưởng xeo giấy: nhà đầu hồi quay ra ngõ
    st.at = 'xuong';
    {
      const { W0, W1, H, D, pitch, T } = WS, zf = DZ, tp = Math.tan(pitch), yr = H + (W1 - W0) / 2 * tp;
      U.uGab.value.set(zf, H, W1, tp);
      box(B.wall, W1 - W0 - 0.1, H, D - 0.3, 0, H / 2, zf - 0.3 - (D - 0.3) / 2, 0);
      tri(B.wall, W0 + 0.05, W1 - 0.05, 0, H - 0.05, yr - 0.1, zf - D + 0.2, 0);
      const seg = (xa, xb) => { const w = xb - xa, xc = (xa + xb) / 2; box(B.wall, w, H - 0.95, 0.1, xc, 0.95 + (H - 0.95) / 2, zf - 0.05, 0); box(B.wall, w, 0.95, 0.12, xc, 0.475, zf - 0.04, 1); box(B.wall, w, 0.08, 0.1, xc, 0.98, zf + 0.01, 2); };
      seg(W0, -1.18); seg(1.18, W1);
      box(B.wall, 2.36, H - 2.66, 0.1, 0, 2.66 + (H - 2.66) / 2, zf - 0.05, 0);
      tri(B.wall, W0, W1, 0, H, yr - 0.05, zf - 0.05, 0);
      for (const px of [W0 + 0.09, W1 - 0.09]) box(B.wall, 0.18, H, 0.18, px, H / 2, zf + 0.02, 2);
      for (const px of [-1.11, 1.11]) box(B.wall, 0.16, 2.66, 0.2, px, 1.33, zf + 0.03, 2);
      box(B.wall, 2.5, 0.16, 0.2, 0, 2.58, zf + 0.03, 2);
      box(B.wall, 2.5, 0.1, 0.24, 0, 0.05, zf + 0.05, 2);
      box(B.wall, W1 - W0 + 0.2, 0.24, 0.24, 0, H, zf + 0.03, 2);
      box(B.wall, 0.16, yr - H - 0.3, 0.18, 0, (H + yr - 0.3) / 2, zf + 0.02, 2);
      box(B.wall, W1 - W0 - 1.6, 0.14, 0.18, 0, H + (yr - H) * 0.45, zf + 0.02, 2);
      panel(1.9, 0.26, 0, 2.8, zf + 0.005, 0, 4, 0.3);
      panel(0.9, 0.42, 0, H + 0.62, zf + 0.03, 0, 4, 0.26);
      panel(1.1, 0.85, -2.25, 1.7, zf + 0.005, 0, 0, 0.34); box(B.wall, 1.3, 0.06, 0.12, -2.25, 1.24, zf + 0.04, 2);
      box(B.wall, 1.2, 1.9, 0.07, 2.25, 0.95, zf + 0.02, 1);
      const len = D + 1.4, zc = zf - D / 2 + 0.1;
      slabXY(B.roof, [W0 - 0.75, H - 0.75 * tp], [0, yr], T, len, zc, 0, 0.35);
      slabXY(B.roof, [0, yr], [W1 + 0.75, H - 0.75 * tp], T, len, zc, 0, 0.35);
      pushGeo(B.roof, new THREE.CylinderGeometry(0.34, 0.34, len + 0.2, 10), place(0, yr + 0.14, zc, Math.PI / 2), 0);
      box(B.wall, 0.34, 0.2, len + 0.2, 0, yr + 0.46, zc, 2);
      light(-2.25, 1.6, zf + 0.5, 3.5, lampC, 0.45, 1);
      WINS.push([zf, -2.25, 0.55, 0.34, 1.28, 2.12, 0]);   // (mặt z — soi giả chỉ dùng cửa sổ trên mặt nhà hai bên)
    }
    yield;
    // đá bờ mương + đá chặn cuối mương
    st.at = 'muong';
    let nSt = 0;
    for (const xe of [CH0 - 0.09, CH1 + 0.09]) for (let z = CHZ0; z > CHZ1;) { const L = rr(0.32, 0.62); box(B.wall, 0.2, 0.2, L, xe + rr(-0.02, 0.02), -0.07 + rr(0, 0.03), z - L / 2, 3, rr(-0.03, 0.03), rr(-0.06, 0.06), rr(-0.05, 0.05)); z -= L + 0.015; if (++nSt % 8 === 0) yield; }
    box(B.wall, CH1 - CH0 + 0.36, 0.22, 0.34, (CH0 + CH1) / 2, -0.05, CHZ1 - 0.15, 3);
    yield;
    // đèn lồng 提灯 dưới hiên (thân sáng + nắp gỗ + dây) · đèn đứng 行灯 cạnh cửa xưởng
    st.at = 'den';
    const chochin = (x, y, z, I) => {
      pushGeo(B.glow, new THREE.SphereGeometry(0.16, 14, 10), place(x, y, z, 0, 0, 0, 1, 1.4, 1), 1, [1, 1, 0.6]);
      for (const dy of [0.235, -0.235]) pushGeo(B.wall, new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10), place(x, y + dy, z), 2);
      box(B.wall, 0.012, 0.5, 0.012, x, y + 0.5, z, 2);
      light(x, y, z, 8.5, lampC, I, 0);
    };
    chochin(LX + 0.5, 2.12, 1.0, 1.55); chochin(RX - 0.45, 2.02, -1.3, 1.45); chochin(LX + 0.5, 2.12, -4.6, 1.45); chochin(RX - 0.45, 2.02, -7.7, 1.35);
    {
      const x = 1.55, z = DZ + 0.7;
      for (const [dx, dz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) box(B.wall, 0.035, 0.82, 0.035, x + dx, 0.41, z + dz, 2);
      box(B.wall, 0.36, 0.035, 0.36, x, 0.82, z, 2);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; panel(0.28, 0.42, x + Math.sin(a) * 0.145, 0.55, z + Math.cos(a) * 0.145, a, 2, 0.55); }
      light(x, 0.6, z, 4.5, lampC, 0.55, 0);
    }
    // ánh giấy hắt ra ngõ (đèn sau tấm giấy) — độ mạnh đặt theo τ
    light(0.05, 1.25, DZ + 0.55, 10, lampC, 1.0, 2);
    yield;
    // ván phơi dọc hai dãy nhà + giá phơi bên trái
    st.at = 'van-phoi';
    const boards = [];
    boardsAlong(boards, L1, [[2.0, 3.6], [-0.3, 1.5]]);
    boardsAlong(boards, L2, [[-9.8, -8.2]]);
    boardsAlong(boards, R1, [[2.4, 4.0], [0.1, 1.9]]);
    boardsAlong(boards, R2, [[-9.1, -7.5]]);
    {
      const xr = LX - 0.85;
      for (const z of [-5.95, -7.45]) for (const k of [-1, 1]) box(B.wall, 0.06, 1.7, 0.06, xr + k * 0.3, 0.8, z, 4, 0, 0, k * 0.33);
      pushGeo(B.wall, new THREE.CylinderGeometry(0.03, 0.03, 1.9, 8), place(xr, 1.55, -6.7, Math.PI / 2), 4);
      for (let z = -6.0; z > -7.5; z -= 0.52) board(boards, xr + 0.62, z, 1, 0.38, R() < 0.5);
    }
    {
      const bg = new THREE.InstancedBufferGeometry();
      const base = new THREE.BoxGeometry(0.5, 1.75, 0.035).toNonIndexed(); base.translate(0, 0.875, 0);
      const P = [], N = [], AP = [], UV = [];
      const pb = base.attributes.position, nb = base.attributes.normal, ub = base.attributes.uv;
      for (let i = 0; i < pb.count; i++) { P.push(pb.getX(i), pb.getY(i), pb.getZ(i)); N.push(nb.getX(i), nb.getY(i), nb.getZ(i)); AP.push(0); UV.push(ub.getX(i), ub.getY(i)); }
      for (const k of [1, 2]) { const q = [[-0.21, -0.37], [0.21, -0.37], [0.21, 0.37], [-0.21, -0.37], [0.21, 0.37], [-0.21, 0.37]]; for (const [x, y] of q) { P.push(x, y, 0.021); N.push(0, 0, 1); AP.push(k); UV.push(x / 0.42 + 0.5, y / 0.74 + 0.5); } }
      base.dispose();
      bg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      bg.setAttribute('aP', new THREE.Float32BufferAttribute(AP, 1)); bg.setAttribute('aUV', new THREE.Float32BufferAttribute(UV, 2));
      const iA = new Float32Array(boards.length * 4), iB = new Float32Array(boards.length * 4);
      boards.forEach(([x, z, face, lean, two, sd], i) => { iA.set([x, z, face, lean], i * 4); iB.set([two, sd * 40, 0, 0], i * 4); });
      bg.setAttribute('iA', new THREE.InstancedBufferAttribute(iA, 4)); bg.setAttribute('iB', new THREE.InstancedBufferAttribute(iB, 4));
      bg.instanceCount = boards.length;
      const m = add(bg, M.board, 'van-phoi', 0, false); void m;
      st.boards = boards.length;
    }
    yield;
    // sào tre phơi vỏ 楮 (khoảng trống bên phải)
    st.at = 'vo-do';
    {
      const xp = RX + 0.45, yp = 2.05, zA = -4.1, zB = -6.2;
      pushGeo(B.wall, new THREE.CylinderGeometry(0.035, 0.035, zA - zB + 0.6, 8), place(xp, yp, (zA + zB) / 2, Math.PI / 2), 4);
      for (const z of [zA - 0.05, zB + 0.05]) for (const k of [-1, 1]) box(B.wall, 0.05, 2.3, 0.05, xp + k * 0.28, 1.08, z, 4, 0, 0, k * 0.27);
      const S = [];
      for (let z = zA - 0.2; z > zB + 0.15; z -= 0.26) for (let j = 0; j < 16; j++) { const side = j % 2 ? 1 : -1; S.push([xp + side * rr(0.02, 0.06), yp + 0.02, z + rr(-0.08, 0.08), rr(0, Math.PI), side * rr(0.02, 0.12), rr(0.028, 0.05), rr(0.85, 1.35), R() * 10]); }
      const g = new THREE.InstancedBufferGeometry();
      const pl = new THREE.PlaneGeometry(1, 1);
      g.index = pl.index; g.setAttribute('position', pl.attributes.position); g.setAttribute('uv', pl.attributes.uv);
      const iA = new Float32Array(S.length * 4), iB = new Float32Array(S.length * 4);
      S.forEach(([x, y, z, ry, rz, w, len, sd], i) => { iA.set([x, y, z, ry], i * 4); iB.set([rz, w, len, sd], i * 4); });
      g.setAttribute('iA', new THREE.InstancedBufferAttribute(iA, 4)); g.setAttribute('iB', new THREE.InstancedBufferAttribute(iB, 4));
      g.instanceCount = S.length;
      add(g, M.bark, 'vo-do', 0, false);
      st.strips = S.length;
    }
    yield;
    // lưới gom: nhà · mái · vật sáng
    st.at = 'gom';
    toMesh(B.wall, 'nha', M.wall); yield;
    toMesh(B.roof, 'mai', M.roof); yield;
    toMesh(B.glow, 'vat-sang', M.glow); yield;
    // đất (một tấm lớn, chừa lòng mương) + mặt nước mương
    st.at = 'dat';
    {
      const gp = (x0, x1, z0, z1) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2); return g; };
      const parts = [gp(-70, CH0 - 0.18, -100, 40), gp(CH1 + 0.18, 70, -100, 40), gp(CH0 - 0.18, CH1 + 0.18, -100, CHZ1), gp(CH0 - 0.18, CH1 + 0.18, CHZ0, 40)];
      const P = [];
      for (const g of parts) { const ng = g.toNonIndexed(); const pa = ng.attributes.position; for (let i = 0; i < pa.count; i++) P.push(pa.getX(i), pa.getY(i), pa.getZ(i)); ng.dispose(); g.dispose(); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeBoundingSphere();
      add(g, M.ground, 'dat', 0, false);
      const wg = new THREE.PlaneGeometry(CH1 - CH0 + 0.04, CHZ0 - CHZ1); wg.rotateX(-Math.PI / 2); wg.translate((CH0 + CH1) / 2, -0.035, (CHZ0 + CHZ1) / 2);
      add(wg, M.water, 'muong', 0);
    }
    yield;
    // tấm giấy chính (trong khung cửa)
    st.at = 'giay';
    { const g = new THREE.PlaneGeometry(SW, SHH); g.translate(0, SY0 + SHH / 2, DZ - 0.02); sheet = add(g, M.sheet, 'giay-chinh'); }
    yield;
    // cỏ
    st.at = 'co';
    {
      const T = [];
      const put = (x, z) => { if (R() < 0.45) T.push([x + rr(-0.05, 0.05), z + rr(-0.05, 0.05), rr(0.16, 0.36), rr(0, Math.PI)]); };
      for (let z = 4; z > DZ + 2.6; z -= rr(0.25, 0.7)) { put(CH0 - 0.24, z); if (R() < 0.6) put(CH1 + 0.22, z); }
      for (let z = 4; z > DZ + 1.0; z -= rr(0.3, 0.8)) { put(RX - 0.2, z); if (R() < 0.7) put(LX + 0.25, z); }
      const g = new THREE.InstancedBufferGeometry(); const pl = new THREE.PlaneGeometry(1, 1);
      g.index = pl.index; g.setAttribute('position', pl.attributes.position); g.setAttribute('uv', pl.attributes.uv);
      const iA = new Float32Array(T.length * 4); T.forEach((t, i) => iA.set(t, i * 4));
      g.setAttribute('iA', new THREE.InstancedBufferAttribute(iA, 4)); g.instanceCount = T.length;
      add(g, M.grass, 'co', 0, false);
    }
    yield;
    // rừng tuyết tùng sau xưởng: thân + tầng cành (nhân bản), chân rừng chìm trong sương
    st.at = 'rung';
    {
      const aT = [], idx = [];
      const SEG = 10;
      const ring = (f, kind) => { const s0 = aT.length / 3; for (let c = 0; c <= SEG; c++) aT.push((c / SEG) * Math.PI * 2, f, kind); return s0; };
      const tr0 = ring(0, 0), tr1 = ring(0.25, 0);
      for (let c = 0; c < SEG; c++) idx.push(tr0 + c, tr1 + c, tr0 + c + 1, tr0 + c + 1, tr1 + c, tr1 + c + 1);
      for (let t = 0; t < 7; t++) {
        const top = ring(t / 7 + 0.0001, 1), bot = ring(t / 7 + 0.99 / 7, 1);
        for (let c = 0; c < SEG; c++) idx.push(top + c, bot + c, top + c + 1, top + c + 1, bot + c, bot + c + 1);
      }
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(aT.length), 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 3)); g.setIndex(idx);
      const TR = [];
      for (let n = 0; n < 900 && TR.length < 330; n++) {
        const z = rr(-28, -110), x = rr(-70, 70);
        if (TR.some((t) => Math.hypot(t[0] - x, t[2] - z) < 2.8)) continue;
        const y0 = Math.max(0, (-z - 28) * 0.08) + rr(-0.4, 0.4), h = rr(9, 15) + (-z - 28) * 0.03;
        TR.push([x, y0, z, h, h * rr(0.14, 0.2), R()]);
      }
      const iA = new Float32Array(TR.length * 4), iB = new Float32Array(TR.length * 2);
      TR.forEach(([x, y, z, h, r, sd], i) => { iA.set([x, y, z, h], i * 4); iB.set([r, sd], i * 2); });
      g.setAttribute('iA', new THREE.InstancedBufferAttribute(iA, 4)); g.setAttribute('iB', new THREE.InstancedBufferAttribute(iB, 2));
      g.instanceCount = TR.length;
      add(g, M.tree, 'tuyet-tung', 0, false);
      st.trees = TR.length;
    }
    yield;
    // núi xa (hai lớp) + sương giữa các lớp rừng + trời
    st.at = 'nui';
    for (const [z, h, w, k, sd] of [[-150, 34, 700, 0.55, 1.3], [-240, 58, 1000, 0.85, 4.1]]) {
      const n = 160, P = [], T = [], idx = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = (u - 0.5) * w;
        const top = h * (0.55 + 0.3 * Math.sin(u * 7 + sd) * 0.5 + 0.25 * Math.sin(u * 17 + sd * 2) * 0.5 + 0.1 * Math.sin(u * 53 + sd));
        P.push(x, -5, z, x, top + (i % 2) * 0.6, z); T.push(0, 1);
        if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('aTop', new THREE.Float32BufferAttribute(T, 1)); g.setIndex(idx);
      const m = add(g, M.ridge.clone(), 'nui-xa', -1, false); m.material.uniforms.uK = { value: k };
    }
    for (const [z, y, h] of [[-27, 0.0, 7], [-40, 1.2, 9], [-58, 2.8, 11], [-82, 4.6, 13]]) { const g = new THREE.PlaneGeometry(200, h); g.translate(0, y + h / 2, z); add(g, M.mist, 'suong', 5, false); }
    add(new THREE.SphereGeometry(1200, 32, 16), M.sky, 'troi', -2, false);
    yield;
    // đèn giả → uniform
    LIGHTS.slice(0, NL).forEach(([x, y, z, r, c, k, type], i) => { U.uLP.value[i].set(x, y, z, r); U.uLC.value[i].set(c.r * k, c.g * k, c.b * k, type); });
    DOOR_L = LIGHTS.findIndex((l) => l[6] === 2);
    WINS.filter((w) => w[6] !== 0).slice(0, NW).forEach(([x, z, hw, lum, y0, y1, side], i) => { RU.uWin.value[i].set(x, z, hw, lum); RU.uWinB.value[i].set(y0, y1, side, 0); });
    setStrokes();
    st.buildMs = Math.round(performance.now() - t0);
    st.built = true;
  }
  let DOOR_L = -1;

  // ── lưới nan: hai cánh 引き違い, mỗi cánh khung 框 + 2 nan đứng + 6 nan ngang. Thứ tự bút: nan đứng (trên → dưới, trái → phải),
  //    rồi nan ngang (trái → phải, trên → dưới), mỗi hàng hai nét. Nét vượt quá khung vài cm như tay vẽ ──
  const STROKES = [];
  function setStrokes() {
    STROKES.length = 0;
    let s2 = 20261003;
    const r2 = () => ((s2 = (s2 * 1664525 + 1013904223) >>> 0) / 4294967296);
    const rb = (a, b) => a + (b - a) * r2();
    const X = [[-0.97, 0.036], [-0.66, 0.024], [-0.345, 0.024], [-0.035, 0.036], [0.035, 0.036], [0.345, 0.024], [0.66, 0.024], [0.97, 0.036]];
    const yT = 1.16, yB = -1.16;
    for (const [x, w] of X) STROKES.push([x + rb(-0.005, 0.005), yT + rb(0.015, 0.045), x + rb(-0.006, 0.006), yB - rb(0.01, 0.04), w]);
    for (let k = 0; k <= 7; k++) {
      const y = yT - k * (yT - yB) / 7, w = k === 0 || k === 7 ? 0.036 : 0.024;
      STROKES.push([-0.97 - rb(0.015, 0.04), y + rb(-0.005, 0.005), -0.035 + rb(0.0, 0.02), y + rb(-0.006, 0.006), w]);
      STROKES.push([0.035 - rb(0.0, 0.02), y + rb(-0.005, 0.005), 0.97 + rb(0.015, 0.04), y + rb(-0.006, 0.006), w]);
    }
    STROKES.forEach(([ax, ay, bx, by], i) => SU.uSeg.value[i].set(ax, ay, bx, by));
  }
  // tiến độ từng nét theo τ: nét trong một khe thời gian, 85% khe để kéo nét (nhanh đầu, chậm dần), 15% nhấc bút
  const inkState = { done: 0, part: 0, amt: 0 };
  function ink(tau) {
    let done = 0, amt = 0;
    const nV = 8, nH = STROKES.length - nV;
    STROKES.forEach(([, , , , w], i) => {
      const [a, b] = i < nV ? [INK_V[0] + (INK_V[1] - INK_V[0]) * i / nV, INK_V[0] + (INK_V[1] - INK_V[0]) * (i + 1) / nV] : [INK_H[0] + (INK_H[1] - INK_H[0]) * (i - nV) / nH, INK_H[0] + (INK_H[1] - INK_H[0]) * (i - nV + 1) / nH];
      const u = cl01((tau - a) / ((b - a) * 0.85));
      const h = u <= 0 ? 0 : u >= 1 ? 1 : 0.6 * (1 - Math.pow(1 - u, 1.8)) + 0.4 * (u * u * (3 - 2 * u));
      SU.uSegB.value[i].set(w, h, 3.1 + i * 5.7, h > 0 && h < 1 ? 1 : 0);
      if (h >= 1) done++;
      amt += h;
    });
    inkState.done = done; inkState.amt = amt / STROKES.length;
    // đèn sau tấm giấy sáng lên cuối chương (cánh cửa shoji sáng dịu)
    const g = sm(GLOW_T[0], GLOW_T[1], tau);
    SU.uGlow.value = 0.72 + 0.62 * g;
    SU.uHot.value.z = 0.62 - 0.36 * g;   // đèn sau giấy lúc sáng hẳn: đều hơn, tâm không cháy trắng
    U.uInk.value.w = 1.2 * inkState.amt + 0.6 * g * inkState.amt;
    const gp = SU.uGlow.value;
    RU.uDoorC.value.set(0.77 * gp, 0.71 * gp, 0.6 * gp, inkState.amt);
    if (DOOR_L >= 0) { const k = 2.6 + 3.0 * g; U.uLC.value[DOOR_L].set(0.87 * k, 0.9 * k, 0.88 * k, 2); }
  }

  // HÌNH GIẢ cùng kiểu dữ liệu đỉnh của từng vật liệu: dịch shader VÀ vẽ đầu trước khi cần (mỗi khung một cái — app.js)
  function warmMeshes() {
    const plain = (attrs) => { const g = new THREE.BufferGeometry(); for (const [k, n] of attrs) g.setAttribute(k, new THREE.Float32BufferAttribute(new Float32Array(3 * n), n)); return g; };
    const inst = (attrs, iattrs) => { const g = new THREE.InstancedBufferGeometry(); for (const [k, n] of attrs) g.setAttribute(k, new THREE.Float32BufferAttribute(new Float32Array(3 * n), n)); for (const [k, n] of iattrs) g.setAttribute(k, new THREE.InstancedBufferAttribute(new Float32Array(n), n)); g.instanceCount = 1; return g; };
    const list = [
      [plain([['position', 3], ['normal', 3], ['aK', 1]]), M.wall], [plain([['position', 3], ['normal', 3], ['aK', 1]]), M.roof],
      [plain([['position', 3], ['aK', 1], ['aUV', 2], ['aS', 3]]), M.glow],
      [inst([['position', 3], ['normal', 3], ['aP', 1], ['aUV', 2]], [['iA', 4], ['iB', 4]]), M.board],
      [inst([['position', 3], ['uv', 2]], [['iA', 4], ['iB', 4]]), M.bark],
      [plain([['position', 3]]), M.ground], [plain([['position', 3]]), M.water], [plain([['position', 3], ['uv', 2]]), M.sheet],
      [plain([['position', 3]]), M.sky], [inst([['position', 3], ['aT', 3]], [['iA', 4], ['iB', 2]]), M.tree],
      [plain([['position', 3], ['aTop', 1]]), M.ridge], [plain([['position', 3], ['uv', 2]]), M.mist],
      [inst([['position', 3], ['uv', 2]], [['iA', 4]]), M.grass],
    ];
    return list.map(([g, m], i) => { const o = new THREE.Mesh(g, m); o.frustumCulled = false; o.name = 'gia-lang-' + i; return o; });
  }

  const tmpV = new THREE.Vector3();
  let back = 0, kP = 0, time = 0;
  function placeCam(tau, dt) {
    camera.position.set(kfm(CAM.x, tau), kfm(CAM.y, tau), kfm(CAM.z, tau));
    camera.up.set(0, 1, 0);
    camera.lookAt(tmpV.set(kfm(CAM.tx, tau), kfm(CAM.ty, tau), kfm(CAM.tz, tau)));
    const fov = kfm(CAM.fov, tau) + 16 * kP;
    if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (back > 0) camera.translateZ(back);
    // (30/9, Mike: "tilt màn hình chỉ ở trang home thôi, còn ở các section thì bỏ tilt hết") — BỎ máy lượn theo chuột ở chương này;
    // máy chỉ đi theo đường của chương, nhịp thở lúc nghỉ vẫn do app.js cộng vào.
    camera.updateMatrixWorld();
  }
  // hình chữ nhật của tấm giấy trên màn (toạ độ 0…1, gốc dưới trái) — cho chuyển cảnh ánh sáng co về ô cửa
  const corner = new THREE.Vector3();
  function doorRect(out) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of [[-SW / 2, SY0], [SW / 2, SY0], [-SW / 2, SY0 + SHH], [SW / 2, SY0 + SHH]]) {
      corner.set(x, y, DZ - 0.02).project(camera);
      const u = corner.x * 0.5 + 0.5, v = corner.y * 0.5 + 0.5;
      x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v);
    }
    return out.set(x0, y0, x1, y1);
  }

  return {
    scene, camera, materials: Object.values(M), st, build, U, warmMeshes, doorRect,
    update(dt, tau) { time += dt; WU.uTime.value = time; ink(tau); placeCam(tau, dt); },
    get drawn() { return inkState.amt; },   // lượng lưới nan đã vẽ (0…1) — app.js bắn sự kiện kozo:net
    setMouse() { /* 30/9: chương không còn nghiêng theo chuột — giữ hàm để app.js gọi không lỗi */ },
    resize(w, h) {
      camera.aspect = w / h;
      kP = w / h < 1 ? Math.min(1, (1 - w / h) / 0.55) : 0;
      back = 2.6 * kP;
      camera.updateProjectionMatrix();
    },
    info() {
      const p = camera.position;
      return { cam: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)], ink: { done: inkState.done, amt: +inkState.amt.toFixed(3) }, glow: +SU.uGlow.value.toFixed(3), verts: st.verts, meshes: st.meshes, boards: st.boards, strips: st.strips, trees: st.trees, buildMs: st.buildMs, time: +time.toFixed(1), at: st.at };
    },
    camAt(tau) { return [kfm(CAM.x, tau), kfm(CAM.y, tau), kfm(CAM.z, tau)]; },
    paperC(glow = 0.72) { return new THREE.Color(0.77 * glow, 0.71 * glow, 0.6 * glow); },
  };
}
