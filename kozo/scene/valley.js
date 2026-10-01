// 地 GROUND — THUNG LŨNG RUỘNG BẬC THANG TRONG ĐÊM (phần 3, 25/9). Chương đầu tiên của "chuyến đi tìm gốc từng lớp kết
// cấu" (bản thiết kế mục 15.1): cuộn xuống là rời toà thành, bay dọc một thung lũng ruộng bậc thang; NÉT CỌ MỰC 緑青
// phát sáng TỰ VẼ theo cuộn dọc bậc ruộng, như có người đang cầm cọ vẽ; đất quanh đoạn nét đã vẽ hửng ánh gỉ đồng.
//
// Sửa các lỗi của ảnh phác v3 (prototypes/kozo-dem/v3.js):
//   · MÉP BẬC RUỘNG RĂNG CƯA: lưới cũ là ô vuông đều cắt ngang một hàm bậc thang → mép bậc thành răng cưa. Lưới mới
//     dựng THEO ĐƯỜNG ĐỒNG MỨC: mỗi hàng (theo z) đặt cột đỉnh đúng ở mép bờ, mép nước, chân và đỉnh bờ dốc của từng bậc
//     → mép bậc là đường cong trơn; vùng nước / bờ / vách phân ra bằng toạ độ trong bậc (mét), khử răng cưa bằng fwidth.
//   · NÉT LƠ LỬNG: nét cọ không còn là dải nổi. Nó được VẼ NGAY TRONG SHADER CỦA ĐẤT (như ngọn cọ vẽ lên mặt toà thành):
//     mỗi đỉnh mang khoảng cách ngang tới tâm từng nét (tính trong JS, nội suy tuyến tính là đúng vì cột đỉnh bám theo
//     chính bậc ruộng mà nét chạy dọc) → mực nằm trên mặt nước, mặt bờ, không bao giờ nổi lên.
//   · ĐẦU NÉT GẦN MÁY CHÁY TRẮNG: màu lõi nấc 200 (không phải 100), trần phát sáng thấp hơn; thớ cọ (xơ khô 掠れ, hạt)
//     giữ được ở gần; ở xa thì thớ mịn dần theo cỡ điểm ảnh (không lấp lánh khi máy bay).
//   · MẶT NƯỚC SOI TRỜI: mỗi thửa ruộng là một mảng gương — phản chiếu bầu trời (chân trời sáng bạc), bị che bởi sườn
//     đồi / dãy núi theo hướng nhìn; thửa cạn thì là bùn; bờ ngang chia thửa thành từng mảng.
//
// Giải phẫu nét cọ giữ đúng như ngọn cọ màn đầu (scene/castle.js INK_FN): 起筆 đầu ấn vuông vát, 送筆 thân dày mỏng theo
// lực, 払い đuôi vuốt nhọn (hoặc 止め dừng tròn), 掠れ xơ khô dọc nét, 滲み loang mép, 濃淡 đậm nhạt + hạt bột màu.
//
// Dựng NGẦM sau màn mở, chia nhỏ qua nhiều khung (app.js gọi từng bước của build() với ngân sách thời gian mỗi khung).
import * as THREE from 'three';
import { DEM } from './look.js';
import { skyMaterial } from './sky.js';
import { buildRidgeLayers } from './forest.js';
import { RAMP } from '../page/accent.js';

// ── hình dạng thung lũng ─────────────────────────────────────────────────────────────────────────
const K = 22;            // số bậc ruộng mỗi bên
const S = 2.2;           // cao một bậc (m)
const RW = 0.85;         // bờ dốc: bề ngang (m) — dốc ~69°
const BUND = 0.45;       // bờ giữ nước ở mép dưới mỗi thửa (m)
const BUNDH = 0.2;       // bờ cao hơn mặt nước (m)
const RISE = 0.025;      // đáy thung cao dần về phía xa (m mỗi m)
const Z0 = 215, Z1 = -470;
const riseAt = (z) => (160 - z) * RISE;
export const VALLEY = { K, S, Z0, Z1, RISE };

function hash2(i, j, s) { let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s = 0) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(i, j, s), b = hash2(i + 1, j, s), c = hash2(i, j + 1, s), d = hash2(i + 1, j + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const n1 = (x, s) => vnoise(x, 0.37, s);
function rngF(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const xc = (z) => 18 * Math.sin(z * 0.0105 + 0.4) + 6 * Math.sin(z * 0.027 + 1.3);   // trục thung uốn khúc
const floorHalf = (z) => 11 + 4 * n1(z * 0.012, 5);
// bề rộng bậc k ở hàng z, bên sg: hẹp dần lên cao; thuỳ lớn chung cho mọi bậc (mỏm đồi, khe) + lệch riêng từng bậc
function widthK(k, z, sg) {
  const base = 7.2 - 0.11 * k;
  const lobe = 1 + 0.32 * Math.sin(z * 0.021 + sg * 1.9 + 0.3 * Math.sin(z * 0.05));
  return Math.max(3.2, base * lobe * (0.72 + 0.56 * vnoise(k * 0.23 + (sg > 0 ? 17 : 0), z * 0.016, 3)));
}
// mép dưới từng bậc (khoảng cách ngang tới trục), D[0] = mép đáy thung
function edges(z, sg) {
  const D = new Float64Array(K + 1), W = new Float64Array(K);
  D[0] = floorHalf(z);
  for (let k = 0; k < K; k++) { W[k] = widthK(k, z, sg); D[k + 1] = D[k] + W[k]; }
  return { D, W };
}
const levelY = (k, z) => (k + 1) * S + riseAt(z);        // mặt nước bậc k (k = −1: đáy thung)
// sườn trên bậc cuối: đồi rừng dốc lên sống núi
const SLOPE_DX = [6, 16, 32, 56, 90, 140], SLOPE_DY = [4, 12, 24, 36, 45, 50];

// ── NÉT CỌ: bên, bậc, vị trí trong bậc, quãng (z đầu → z cuối), nửa bề rộng, độ khô, kiểu đuôi ──
// ĐẦU NÉT CHẠY TRƯỚC MÁY QUAY một quãng `lead` (m): nét vẽ tới đâu là theo máy quay bay tới đâu — tức là theo cuộn (như
// dòng sáng "mọc" theo cuộn ở hubtown). Hai nét thấp hai bên hội tụ về xa (hubtown nấc 105), nét thứ ba cao bên phải.
export const STROKES = [
  { sg: 1, k: 1, f: 0.50, z0: 120, z1: -250, w: 4.2, dry: 0.66, seed: 3, headK: 0.30, tail: 0, lead: 250, I: 1.0 },
  { sg: -1, k: 2, f: 0.52, z0: 40, z1: -300, w: 4.6, dry: 0.70, seed: 5, headK: 0.26, tail: 0, lead: 300, I: 1.0 },
  { sg: 1, k: 6, f: 0.46, z0: -30, z1: -300, w: 5.0, dry: 0.76, seed: 7, headK: 0.22, tail: 1, lead: 520, I: 1.0 },
];
function strokeCenter(st, z) {
  const { D, W } = edges(z, st.sg);
  const wob = 0.12 * (W[st.k] - RW) * Math.sin(z * 0.047 + st.seed * 1.7) + 0.06 * (W[st.k] - RW) * Math.sin(z * 0.13 + st.seed);
  return st.sg * (D[st.k] + BUND + st.f * (W[st.k] - RW - BUND) + wob);
}

// ── SHADER ĐẤT ───────────────────────────────────────────────────────────────────────────────────
const NOISE = /* glsl */`
float h21(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
`;
const STROKE_PARS = /* glsl */`
uniform vec4 uSA[3];   // z đầu nét, dài (m), nửa bề rộng (m), đã vẽ tới (m tính từ đầu nét)
uniform vec4 uSB[3];   // độ khô, hạt, độ phình đầu, kiểu đuôi (0 払い / 1 止め)
uniform vec4 uSC[3];   // cao mặt nước bậc của nét (chưa cộng độ dốc đáy), cường độ đèn, 0, 0
uniform int uSN;
uniform float uRise, uZ0, uLightR, uLightK;
uniform vec3 uLightC;
`;
const TERRAIN_VS = /* glsl */`
attribute vec4 aP;     // bậc (−1 đáy, 0…K−1 ruộng, K sườn trên), m từ mép dưới bậc, m tới hết mặt nước, khoảng cách ngang có dấu tới trục
attribute vec3 aSt;    // khoảng cách ngang (m, có dấu) tới tâm từng nét cọ
varying vec3 vW; varying vec4 vP; varying vec3 vSt;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vP = aP; vSt = aSt;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const TERRAIN_FS = NOISE + STROKE_PARS + /* glsl */`
uniform float uTime, uK;
uniform vec3 uMoonDir, uMoonC, uSkyAmb, uGndAmb;
uniform vec3 uFogC, uEndC; uniform float uFogD, uHaze, uZEnd;
uniform vec3 uRefTop, uRefHor, uRefGlow, uGlowDir, uHill, uDeep;
uniform vec3 uC0, uC1, uC2, uInkBase;
uniform float uGlowK;
varying vec3 vW; varying vec4 vP; varying vec3 vSt;

// NÉT CỌ i tại điểm có khoảng cách ngang x (m) và quãng dọc s (m từ đầu nét). fw = cỡ một điểm ảnh (m).
// cỡ một điểm ảnh DỌC nét (m) — đặt trước khi gọi brushAt. Nhìn sượt, một điểm ảnh phủ vài mét dọc nét: hạt bột màu và hạt khô
// sáng lấm tấm (tần số cao dọc nét) phải mịn đi, không thì thành chuỗi hạt nhấp nháy kiểu khoá kéo (29/9, vòng soát p7a)
float gFwS = 0.0;
void brushAt(int i, float x, float s, float fw, out float body, out float bleed, out float dens, out float core, out float streak, out float wet, out float spark) {
  body = 0.0; bleed = 0.0; dens = 0.0; core = 0.0; streak = 1.0; wet = 0.0; spark = 0.0;
  vec4 A = uSA[i]; vec4 B = uSB[i];
  float len = A.y, Wd = A.z, sHead = A.w;
  if (sHead <= 0.0) return;
  if (abs(x) > Wd * 2.4 || s < -Wd * 1.5 || s > min(sHead, len) + Wd * 1.5) return;
  float t = clamp(s / len, 0.0, 1.0);
  float sw = s / Wd, seed = B.y;
  // 送筆: lực tay — phình ở đầu, dao động chậm, thon dần khi cọ cạn; 払い vuốt nhọn ở cuối
  // (Sếp 29/9 sau p9b, lỗi cũ A10 của p7b) mọi nhiễu DỌC nét cũng mờ theo cỡ điểm ảnh dọc nét: nhìn sượt ở xa một điểm ảnh trùm
  // nhiều mét dọc nét → nhiễu mép / lực tay dao động nhanh hơn điểm ảnh thành chuỗi hạt sáng tối xen kẽ (lớp làm nét + tách màu
  // viền đỏ xanh lên). lodA = 1 khi một chu kỳ nhiễu mép (≈ 1,8 bề ngang) ngắn hơn ~2 điểm ảnh dọc nét
  float lodA = smoothstep(0.15, 0.5, gFwS / Wd * 0.55);
  float press = (1.0 + B.z * (1.0 - smoothstep(0.0, 0.12, t))) * (0.80 + 0.36 * mix(vn(vec2(sw * 0.35 + seed, 3.0)), 0.5, lodA)) * mix(1.0, 0.72, t);
  if (B.w < 0.5) press *= pow(1.0 - smoothstep(0.72, 1.0, t), 0.75);
  // mép nét dao động CHẬM dọc nét (nhìn chếch không thành răng cưa)
  float nE = mix(vn(vec2(sw * 0.55 + seed * 3.0, sign(x) * 5.0 + 11.0)), 0.5, lodA);
  float w = Wd * press * (0.92 + 0.10 * nE);
  float iw = 1.0 / max(w, 1e-3);
  float dn = abs(x) * iw, xn = clamp(x * iw, -1.0, 1.0);
  // 起筆: đầu vuông vát chéo
  float headM = smoothstep(-0.03 * Wd - fw, 0.05 * Wd + fw, s + 0.6 * x);
  // 止め: dừng tay, đầu tròn mực đọng
  float tailM = 1.0;
  if (B.w > 0.5) { float e = len - s; tailM = 1.0 - smoothstep(0.9, 1.02, length(vec2(max(w - e, 0.0), x)) * iw); }
  // NGỌN CỌ ĐANG ĐI: mép trước là dấu chân cọ (giữa nét vươn xa hơn hai mép), ngay sau ngọn mực còn ướt
  float front = sHead - s - 0.45 * Wd * xn * xn;
  float drawn = sHead >= len + Wd ? 1.0 : smoothstep(-0.02 * Wd - fw, 0.08 * Wd + fw, front);
  wet = sHead >= len ? 0.0 : exp(-max(front, 0.0) / (Wd * 3.5));
  // 掠れ: cọ cạn dần theo quãng; mép khô trước lòng; sợi lông cọ song song dọc nét
  float depl = smoothstep(0.1, 1.0, t);
  float D = clamp(B.x * (0.30 + 0.70 * depl), 0.0, 0.9);
  if (B.w > 0.5) D *= 1.0 - 0.8 * smoothstep(0.82, 1.0, t);
  D *= 1.0 - 0.35 * wet;
  float Dl = D * (1.0 + 0.6 * xn * xn);
  // thớ cọ mịn dần khi nhỏ hơn ~3 điểm ảnh (10 sợi trên bề ngang nét) — nhìn sượt ở xa không thành chuỗi hạt lấm tấm
  // (29/9, vòng soát p7a: 19 sợi nén vào vài điểm ảnh thành dải "khoá kéo", lớp làm nét + tách màu viền đỏ xanh lên)
  float lod = smoothstep(0.2, 0.6, fw * iw * 10.0);
  // sợi lông cọ: nhiễu DỊ HƯỚNG tần số THẤP — ít sợi to theo bề ngang, kéo rất dài dọc nét
  float fib = vn(vec2(xn * 10.0 + seed, sw * 0.07)) * 0.6 + vn(vec2(xn * 4.0 - seed, sw * 0.035)) * 0.4;
  fib = mix(fib, 0.5 + 0.12 * (vn(vec2(xn * 4.0 - seed, sw * 0.035)) - 0.5), lod);
  // (A10) độ đổi của thớ cọ trên một điểm ảnh, ước theo cỡ điểm ảnh ngang + dọc nét (không gọi fwidth trong hàm này — hàm có nhánh
  // thoát sớm, đạo hàm trong nhánh không đều thì trình dịch D3D không nhận): đổi nhanh hơn điểm ảnh thì mờ về giữa, mép sợi rộng
  // ít nhất bằng một điểm ảnh
  float fwF = 6.0 * fw * iw + 0.05 * gFwS / Wd;
  fib = mix(fib, 0.5, smoothstep(0.1, 0.3, fwF) * (1.0 - lod));
  float bristle = smoothstep(Dl - 0.07 - 0.2 * lod - fwF, Dl + 0.07 + 0.2 * lod + fwF, fib);
  float inside = 1.0 - smoothstep(0.9 - fw * iw, 1.0 + fw * iw, dn);
  // cọ vừa chạm xuống: nét hiện dần trong vài mét đầu (không bật một đốm sáng)
  float touch = smoothstep(0.0, 2.5 * Wd, sHead);
  body = inside * bristle * headM * tailM * drawn * touch;
  // 滲み: quầng loang mỏng, mép xơ, chỉ chỗ cọ còn no mực (và ngay sau ngọn cọ đang đi)
  float nR = mix(vn(vec2(sw * 1.4, xn * 9.0 + 7.0)), 0.5, lod);
  bleed = (1.0 - smoothstep(0.96, 1.28 + 0.35 * nR + 0.35 * wet, dn)) * smoothstep(0.85, 1.0, dn) * (1.0 - D) * headM * tailM * drawn;
  // 濃淡: đầu nét đậm, cạn thì nhạt; hạt bột màu khoáng
  float lodS = smoothstep(0.12, 0.45, gFwS / Wd * 3.0);
  float grain = mix(vn(vec2(sw * 3.0, xn * 11.0)) * 0.6 + vn(vec2(sw * 8.0, xn * 23.0)) * 0.4, 0.5, max(lod, lodS));
  dens = (0.8 + 0.2 * (1.0 - smoothstep(0.0, 0.14, t))) * (1.0 - 0.5 * depl) * (0.8 + 0.2 * grain);
  core = smoothstep(0.55, 0.95, dens) * (1.0 - 0.55 * xn * xn);
  // vệt lông cọ trong phần mực ướt: sáng tối theo từng sợi; mép nét mực đọng dày hơn (墨だまり) nên sáng hơn
  streak = (0.4 + 0.9 * fib) * (1.0 + 0.35 * smoothstep(0.72, 0.95, dn));
  // chỗ xơ khô (掠れ) sáng LẤM TẤM: hạt bột màu còn bám trong khe giữa các sợi lông cọ
  spark = inside * (1.0 - bristle) * headM * tailM * drawn * touch * smoothstep(0.78, 0.95, vn(vec2(xn * 16.0 + seed, sw * 0.9))) * (1.0 - lod) * (1.0 - lodS) * (1.0 - smoothstep(0.05, 0.2, fwF)) * 0.6;
}

// ĐÈN GIẢ DỌC NÉT (hubtown mục 4.3, dạng liền): mỗi nét là một nguồn sáng dài, chỉ ở đoạn ĐÃ VẼ. Khoảng cách tới đoạn ấy
// tính đúng (ngang · cao · dọc), sáng tắt hẳn sau uLightR mét.
void strokeLight(vec3 P, vec3 N, vec3 Rv, out vec3 diff, out vec3 spec, out vec3 air) {
  diff = vec3(0.0); spec = vec3(0.0); air = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    if (i >= uSN) break;
    vec4 A = uSA[i];
    float lit = min(A.w, A.y);
    if (lit <= 0.0) continue;
    float s = A.x - P.z;
    float dz = s - clamp(s, 0.0, lit);
    float yS = uSC[i].x + (uZ0 - P.z) * uRise + 0.35;
    vec3 d = vec3(-vSt[i], yS - P.y, dz);
    float r = length(d);
    if (r > uLightR * 1.8) continue;
    vec3 L = d / max(r, 1e-3);
    float k = max(1.0 - r / uLightR, 0.0);
    float att = uSC[i].y * k * k;
    diff += uLightC * att * (0.22 + 0.78 * max(dot(N, L), 0.0));
    spec += uLightC * att * pow(max(dot(Rv, L), 0.0), 28.0);
    float ka = max(1.0 - r / (uLightR * 1.8), 0.0);
    air += uLightC * uSC[i].y * ka * ka * ka;
  }
}

void main() {
  vec3 V = normalize(cameraPosition - vW);
  float dist = length(cameraPosition - vW);
  float level = vP.x, m = vP.y, flatEnd = vP.z, lat = vP.w;
  float fm = max(fwidth(m), 1e-4);
  vec3 dx = dFdx(vW), dy = dFdy(vW);
  vec3 Ng = normalize(cross(dx, dy));
  if (Ng.y < 0.0) Ng = -Ng;
  float fz = max(fwidth(vW.z), 1e-3);
  bool isFloor = level < -0.5, isSlope = level > uK - 0.5;

  // ── phân vùng trong bậc (mét thật, khử răng cưa theo cỡ điểm ảnh) ──
  float water = 0.0, bund = 0.0;
  if (!isSlope) {
    float w0 = isFloor ? 2.75 : BUND_W;
    float wEnd = flatEnd - 0.12;
    water = smoothstep(w0 - fm, w0 + fm, m) * (1.0 - smoothstep(wEnd - fm, wEnd + fm, m));
    if (isFloor) water = max(water, 1.0 - smoothstep(1.5 - fm, 1.5 + fm, m));   // suối giữa đáy thung
    bund = (1.0 - water) * (1.0 - smoothstep(flatEnd - fm, flatEnd + fm, m));
  }
  // bờ ngang chia thửa: mỗi bậc một nhịp riêng (22–40 m), ở xa mịn dần
  float Ld = 38.0 + 46.0 * h21(vec2(level, 3.7));
  float zz = vW.z + level * 13.7 + m * 0.7 * (h21(vec2(level, 9.1)) - 0.5);
  float pid = floor(zz / Ld);
  float dd = abs(fract(zz / Ld + 0.5) - 0.5) * Ld;
  float dike = (1.0 - smoothstep(0.22, 0.22 + fz * 1.5 + 0.08, dd)) * (1.0 - smoothstep(0.6, 3.0, fz)) * step(-0.5, level);
  float hv = h21(vec2(level * 7.1 + 3.0, pid));
  float drained = step(0.80, hv) * step(-0.5, level);                  // thửa đã tháo nước: bùn, không soi trời
  bund = max(bund, water * max(dike, drained * 0.0));
  water *= (1.0 - dike) * (1.0 - drained);

  // ── pháp tuyến ──
  vec3 N = normalize(mix(Ng, vec3(0.0, 1.0, 0.0), clamp(water + (isSlope ? 0.0 : (1.0 - smoothstep(flatEnd - fm, flatEnd + fm, m))) * 0.9, 0.0, 1.0)));
  float fwP = length(fwidth(vW.xz));
  // gợn nước (chậm, có gió nhẹ) — tắt dần khi nhỏ hơn điểm ảnh
  vec2 rp = vW.xz * 0.33 + vec2(uTime * 0.021, uTime * 0.013);
  float e = 0.37;
  vec2 g = vec2(vn(rp + vec2(e, 0.0)) - vn(rp - vec2(e, 0.0)), vn(rp + vec2(0.0, e)) - vn(rp - vec2(0.0, e)));
  vec2 rp2 = vW.xz * 1.1 - vec2(uTime * 0.05, -uTime * 0.03);
  g += 0.45 * vec2(vn(rp2 + vec2(e, 0.0)) - vn(rp2 - vec2(e, 0.0)), vn(rp2 + vec2(0.0, e)) - vn(rp2 - vec2(0.0, e)));
  float amp = 0.16 * (1.0 - smoothstep(0.12, 0.7, fwP));
  if (isFloor && m < 1.5) amp *= 1.8;
  // nhìn sượt (mặt nước gần song song tia nhìn): gợn nén vào vài điểm ảnh → tia phản chiếu nhảy qua lại chân trời mỗi điểm ảnh
  // thành chuỗi hạt sáng lấm tấm (29/9, vòng soát p7a) — gợn dịu đi theo độ sượt
  amp *= 0.3 + 0.7 * smoothstep(0.025, 0.14, abs(V.y));
  vec3 Nw = normalize(vec3(-g.x * amp, 1.0, -g.y * amp));
  vec3 Rv = reflect(-V, Nw);

  // ── màu vật liệu ──
  float n0 = vn(vW.xz * 0.9) * 0.6 + vn(vW.xz * 3.1) * 0.4;
  // vách bậc: đất đứng có thớ dọc (vệt nước, rễ cỏ) — đọc ra VÁCH chứ không phải dải nhựa
  float gv = vn(vec2(vW.x * 2.3 + vW.z * 2.3, vW.y * 0.35)) * 0.6 + vn(vec2((vW.x + vW.z) * 7.0, vW.y * 1.1)) * 0.4;
  vec3 earth = vec3(0.085, 0.092, 0.074) * (0.55 + 0.9 * gv) * (0.8 + 0.4 * n0);          // vách bậc: đất cỏ tối
  vec3 bundC = vec3(0.12, 0.125, 0.105) * (0.8 + 0.4 * n0);
  vec3 mud = vec3(0.030, 0.034, 0.030) * (0.8 + 0.4 * n0);
  vec3 hill = vec3(0.034, 0.046, 0.038) * (0.7 + 0.6 * n0);
  vec3 alb = isSlope ? hill : mix(earth, bundC, bund);
  if (!isSlope && drained > 0.5) alb = mix(alb, mud, 1.0 - bund);

  // ── ánh sáng: trăng rất yếu + trời + ĐÈN GIẢ dọc đoạn nét đã vẽ ──
  vec3 lD, lS, lA;
  strokeLight(vW, N, Rv, lD, lS, lA);
  vec3 amb = mix(uGndAmb, uSkyAmb, N.y * 0.5 + 0.5);
  vec3 col = alb * (amb + uMoonC * max(dot(N, uMoonDir), 0.0) + lD * uLightK);

  // ── MẶT NƯỚC SOI TRỜI: mảng gương bạc ──
  if (water > 0.001) {
    vec2 hz = normalize(Rv.xz + 1e-5);
    float hx = hz.x * sign(lat + 1e-3);
    // chân trời bị che: dọc thung (về phía xa) thấp — dãy núi xa; ngang lên dốc phía mình cao; ngang sang bên kia thấp hơn
    float horizon = 0.045 + 0.52 * pow(max(hx, 0.0), 1.5) + 0.17 * pow(max(-hx, 0.0), 1.2) + 0.22 * max(hz.y, 0.0)
                  + 0.03 * (vn(vec2(atan(Rv.x, -Rv.z) * 9.0, 1.3)) - 0.5);
    float fR = fwidth(Rv.y);
    float sky = smoothstep(horizon - 0.012 - 1.5 * fR, horizon + 0.02 + 1.5 * fR, Rv.y);   // mép chân trời trong nước mềm theo cỡ điểm ảnh
    vec3 skyC = mix(uRefHor, uRefTop, smoothstep(horizon, horizon + 0.26, Rv.y)) + uRefGlow * pow(max(dot(Rv, uGlowDir), 0.0), 10.0);
    vec3 refl = mix(uHill + lA * 0.05, skyC, sky);
    float F = 0.02 + 0.98 * pow(1.0 - max(dot(Nw, V), 0.0), 5.0);
    float tint = 0.45 + 0.85 * hv;                              // mỗi thửa một độ bạc: phần lớn tối, vài thửa sáng
    vec3 wc = mix(uDeep, refl * tint, F) + lS * 0.35 * uLightK * 0.25;
    // NƯỚC SOI BÓNG NÉT CỌ (bản giả rẻ): tia phản chiếu từ mặt nước đi lên tới độ cao mặt ruộng của nét → tra nét ở đó
    // (chỉ nét nằm CAO hơn thửa này; nét cùng mặt nước thì bóng trùng chính nó). Gợn nước đã nằm trong tia nên bóng lay nhẹ.
    vec3 mir = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      if (i >= uSN) break;
      vec4 A = uSA[i];
      float lit = min(A.w, A.y);
      if (lit <= 0.0) continue;
      float h = uSC[i].x + (uZ0 - vW.z) * uRise - vW.y;
      if (h < 0.5 || Rv.y < 0.012) continue;
      float t = h / Rv.y;
      if (t > 180.0) continue;
      vec3 Q = vW + Rv * t;
      float xq = vSt[i] + (Q.x - vW.x), sq = A.x - Q.z, Wd = A.z;
      float along = smoothstep(-Wd, Wd, sq) * (1.0 - smoothstep(lit - Wd, lit + 2.0 * Wd, sq));
      float across = 1.0 - smoothstep(0.5 * Wd, 1.4 * Wd, abs(xq));
      mir += mix(uC1, uC0, 0.35) * along * across * exp(-t * 0.006);
    }
    wc += mir * uGlowK * 0.32 * (0.3 + 0.7 * F);
    col = mix(col, wc, water);
  }

  // ── NÉT CỌ MỰC phát sáng, vẽ trên mặt đất ──
  vec3 em = vec3(0.0);
  float cov = 0.0;
  for (int i = 0; i < 3; i++) {
    if (i >= uSN) break;
    float x = vSt[i];
    // CỠ ĐIỂM ẢNH: ở mép bậc ruộng (mặt nước gấp xuống vách bậc) một ô 2×2 điểm ảnh nằm trên hai mặt khác độ sâu → đạo hàm màn
    // hình vọt lên từng ô một → thớ cọ / mép nét nhảy qua lại thành DẢI HẠT kiểu khoá kéo có viền đỏ xanh (29/9, vòng soát p7a).
    // Kẹp trần bằng cỡ điểm ảnh tính theo khoảng cách + độ sượt (liền mạch qua mép bậc).
    float fwA = length(cameraPosition - vW) * 0.0011 / max(abs(V.y), 0.035);
    float fwR = fwidth(x);
    // (Sếp 29/9 sau p9b, A10) NGANG nét là hướng ngang màn: cỡ điểm ảnh ngang ≈ khoảng cách × 0,0011, KHÔNG chia độ sượt (chỉ chiều
    // dọc nét — vào sâu — mới giãn theo độ sượt). Trần cũ fwA × 3 cho phép đạo hàm ngang vọt tới ~30 lần ở ô 2×2 vắt qua mép bậc →
    // ô này mờ hẳn, ô kề sắc → chuỗi hạt sáng tối "khoá kéo". Kẹp chặt quanh cỡ điểm ảnh thật ở cả hai chiều.
    float fwX = length(cameraPosition - vW) * 0.0011;
    float fwx = clamp(fwR, fwX * 0.5, fwX * 2.5);
    gFwS = clamp(fwidth(vW.z), fwA * 0.4, fwA * 2.0);
    float s = uSA[i].x - vW.z;
    float body, bleed, dens, core, streak, wet, spark;
    brushAt(i, x, s, fwx, body, bleed, dens, core, streak, wet, spark);
    if (body + bleed + spark < 0.001) continue;
    float a = clamp(body * (0.55 + 0.4 * dens) + bleed * 0.3, 0.0, 1.0);
    // lõi mực ướt đậm: nấc 100 (gần trắng ánh lục) · thân: nấc 200 · loang: nấc 300 · hạt khô: nấc 100
    // thân nét nấc 300 (còn đủ sắc 緑青 sau nén sáng), lòng nét đậm nhất lên nấc 200→100; gần ngọn cọ đang vẽ (mực còn ướt) sáng nhất
    vec3 c = mix(mix(uC2, uC1, smoothstep(0.45, 0.8, dens)), uC0, core * (0.25 + 0.75 * wet)) * body * (0.35 + 0.8 * dens) * streak + uC2 * bleed * 0.5 + uC0 * spark * 0.7;
    em += c * (1.0 + 0.5 * wet);
    cov = max(cov, a);
  }
  col = mix(col, uInkBase, cov * 0.85);

  // ── sương: theo khoảng cách + sương đọng đáy thung + cuối thung tan vào núi xa ──
  float fogF = 1.0 - exp(-pow(uFogD * dist, 2.0));
  float floorY = (uZ0 - vW.z) * uRise;
  float haze = exp(-max(vW.y - floorY, 0.0) / 11.0) * smoothstep(40.0, 260.0, dist) * uHaze;
  float endF = smoothstep(uZEnd + 150.0, uZEnd + 10.0, vW.z);
  float f = clamp(fogF + haze * (1.0 - fogF) + endF, 0.0, 1.0);
  // xa: tan vào màu chân trời (sương ánh trăng), gần đáy thung: sương sẫm
  // ánh xanh toả trong sương quanh nét (không khí hửng sáng) + trên mặt đất quanh nét
  col += lA * 0.02 * (1.0 - f);
  col = mix(col, mix(uFogC, uEndC, max(endF, fogF)) + lA * 0.10, f);
  // trần mềm cho độ sáng nét (đầu nét gần máy không cháy trắng: thớ cọ còn đọc được sau loá + ACES)
  em *= uGlowK;
  float le = dot(em, vec3(0.2126, 0.7152, 0.0722));
  // đường cong NÉN CHỖ SÁNG (không cắt phẳng): lõi rất sáng vẫn còn đậm nhạt theo sợi lông cọ sau loá + ACES
  em /= 1.0 + max(le - 1.3, 0.0) * 0.45;
  col += em * exp(-dist * 0.0011) * (1.0 - endF);
  gl_FragColor = vec4(col, 1.0);
}`.replace('BUND_W', BUND.toFixed(2));

// ── CÂY (tuyết tùng trên sườn trên) — chiếu sáng theo đỉnh (rẻ) ─────────────────────────────────────
const TREE_VS = NOISE + STROKE_PARS + /* glsl */`
attribute vec3 aSt; attribute float aTone;
uniform vec3 uMoonDir, uMoonC, uSkyAmb, uGndAmb, uFogC, uTreeC;
uniform float uFogD, uHaze, uZEnd;
varying vec3 vCol; varying float vFog;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vec3 alb = uTreeC * aTone * (0.8 + 0.4 * position.y);
  vec3 lD = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    if (i >= uSN) break;
    vec4 A = uSA[i];
    float lit = min(A.w, A.y);
    if (lit <= 0.0) continue;
    float s = A.x - w.z;
    float dz = s - clamp(s, 0.0, lit);
    float yS = uSC[i].x + (uZ0 - w.z) * uRise + 0.35;
    vec3 d = vec3(-aSt[i], yS - w.y, dz);
    float r = length(d);
    float k = max(1.0 - r / (uLightR * 1.3), 0.0);
    lD += uLightC * uSC[i].y * k * k * (0.35 + 0.65 * max(dot(n, d / max(r, 1e-3)), 0.0));
  }
  vec3 amb = mix(uGndAmb, uSkyAmb, n.y * 0.5 + 0.5);
  vCol = alb * (amb + uMoonC * max(dot(n, uMoonDir), 0.0) * 1.2 + lD * uLightK);
  vec4 mv = viewMatrix * w;
  float dist = length(mv.xyz);
  float fogF = 1.0 - exp(-pow(uFogD * dist, 2.0));
  float floorY = (uZ0 - w.z) * uRise;
  float haze = exp(-max(w.y - floorY, 0.0) / 11.0) * smoothstep(40.0, 260.0, dist) * uHaze;
  float endF = smoothstep(uZEnd + 150.0, uZEnd + 10.0, w.z);
  vFog = clamp(fogF + haze * (1.0 - fogF) + endF, 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}`;
const TREE_FS = /* glsl */`
uniform vec3 uFogC;
varying vec3 vCol; varying float vFog;
void main() { gl_FragColor = vec4(mix(vCol, uFogC, vFog), 1.0); }`;

function cedarGeo(seed, tiers = 6) {
  const r = rngF(seed);
  const g = new THREE.ConeGeometry(1, 1, 7, tiers * 2, false);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const f = (v.y * tiers + r() * 0.3) % 1;
    const k = v.y > 0.985 ? 0 : 0.7 + 0.52 * Math.pow(f, 1.6);
    p.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

// ── keyframe máy quay (hubtown mục 2.3–2.4: 2–4 keyframe mỗi trục, từng đoạn bezier (0,5, 0 · 0,5, 1)) ─────────────
// cảnh chạy trên "nhịp" τ đã qua sine.inOut của cả quãng cuộn — app.js tính τ; ở đây chỉ tra keyframe, không làm mượt thêm
export function bezierEase(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx, Y = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-7) return Y(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 40; i++) { const v = X(t); if (Math.abs(v - x) < 1e-7) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}
export const kfEase = bezierEase(0.5, 0, 0.5, 1);
// keyframe: [[τ, giá trị], …] (τ tăng dần) → giá trị ở τ
export function kf(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; return va + (vb - va) * kfEase((t - a) / (b - a)); }
  }
  return keys[keys.length - 1][1];
}
// máy quay bay DỌC TRỤC THUNG (theo khúc uốn của trục), nhìn về phía trước một quãng L; keyframe cho z, cao, quãng nhìn,
// lệch ngang, cao điểm nhìn — mỗi trục 2–3 keyframe
const CAM = {
  z: [[0, 190], [0.5, 80], [1, -40]],
  y: [[0, 44], [0.5, 34], [1, 27]],
  L: [[0, 260], [0.5, 250], [1, 240]],
  ox: [[0, 2], [0.5, -3], [1, 2]],
  ty: [[0, 22], [0.5, 20], [1, 22]],
};
export function createValley(renderer) {
  const scene = new THREE.Scene();
  scene.name = 'thung-lung';
  const camera = new THREE.PerspectiveCamera(44, 1, 0.5, 6000);
  const lin = (hex) => new THREE.Color(hex);
  const moonDir = new THREE.Vector3(-0.35, 0.42, -0.84).normalize();

  // uniform dùng chung (đất + cây)
  const SU = {
    uSA: { value: STROKES.map(() => new THREE.Vector4()) },
    uSB: { value: STROKES.map((s) => new THREE.Vector4(s.dry, s.seed * 7.13, s.headK, s.tail)) },
    uSC: { value: STROKES.map((s) => new THREE.Vector4((s.k + 1) * S, s.I, 0, 0)) },
    uSN: { value: STROKES.length },
    uRise: { value: RISE }, uZ0: { value: 160 }, uLightR: { value: 30 }, uLightK: { value: 6.5 },
    uLightC: { value: lin(RAMP[400]) },
    uMoonDir: { value: moonDir }, uMoonC: { value: lin(0x7d918b).multiplyScalar(1.5) },
    uSkyAmb: { value: lin(0x2b3a36).multiplyScalar(1.9) }, uGndAmb: { value: lin(0x0b0f0e) },
    uFogC: { value: lin(DEM.fog.color) }, uFogD: { value: DEM.fog.density }, uHaze: { value: 0.55 }, uZEnd: { value: Z1 },
  };
  STROKES.forEach((s, i) => SU.uSA.value[i].set(s.z0, s.z0 - s.z1, s.w, 0));
  const terrainMat = new THREE.ShaderMaterial({
    name: 'ruong-bac-thang',
    vertexShader: TERRAIN_VS, fragmentShader: TERRAIN_FS,
    uniforms: {
      ...SU,
      uTime: { value: 0 }, uK: { value: K },
      uEndC: { value: lin(DEM.sky.horizon) },
      uRefTop: { value: lin(0x121a18) }, uRefHor: { value: lin(0xa3b6b0) }, uRefGlow: { value: lin(0x7d918b).multiplyScalar(0.4) },
      uGlowDir: { value: new THREE.Vector3(-0.35, 0.10, -0.93).normalize() },
      uHill: { value: lin(0x050807) }, uDeep: { value: lin(0x020303) },
      // 緑青 (Mike 28/9: "nét phải glow hơn, đang chìm quá"): lõi ướt nấc 100 (gần trắng ánh lục), thân 200, loang 300; độ
      // sáng gấp ~2,3 lần mặt ruộng lân cận × trần mềm ở cuối shader → vẫn giữ thớ cọ, không cháy thành mảng
      uC0: { value: lin(RAMP[100]).multiplyScalar(1.0) }, uC1: { value: lin(RAMP[300]).multiplyScalar(1.05) }, uC2: { value: lin(RAMP[400]).multiplyScalar(1.0) },
      uInkBase: { value: lin(RAMP[900]).multiplyScalar(0.5) },
      uGlowK: { value: 1.8 },
    },
    extensions: { derivatives: true },
  });
  const treeMat = new THREE.ShaderMaterial({
    name: 'tuyet-tung-dem',
    vertexShader: TREE_VS, fragmentShader: TREE_FS,
    uniforms: { ...SU, uTreeC: { value: lin(0x2c3834) } },
  });
  // chỉ để dịch shader trước (cây là InstancedMesh → chương trình có USE_INSTANCING)
  const dummyGeo = new THREE.BufferGeometry();
  dummyGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  dummyGeo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  dummyGeo.setAttribute('aP', new THREE.Float32BufferAttribute(new Float32Array(12), 4));
  dummyGeo.setAttribute('aSt', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
  dummyGeo.setAttribute('aTone', new THREE.Float32BufferAttribute(new Float32Array(3), 1));

  const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 28), skyMaterial(DEM, moonDir));
  sky.frustumCulled = false; sky.renderOrder = -100; sky.name = 'troi-dem';
  scene.add(sky);

  const st = { ready: false, built: false, terrain: null, trees: null, ridges: null, verts: 0, tris: 0, trees_n: 0, buildMs: 0 };

  // ── DỰNG (bộ sinh: mỗi lần next() làm một mẩu nhỏ; app.js gọi trong ngân sách thời gian mỗi khung) ──
  function* build() {
    const t0 = performance.now();
    // hàng theo z: dày ở gần (0,65 m) thưa dần ra xa (1,55 m)
    const rows = [];
    for (let z = Z0; z > Z1; z -= 0.65 + 0.9 * Math.min(1, Math.max(0, (120 - z) / 500))) rows.push(z);
    rows.push(Z1);
    // cột mỗi bên: đáy (suối, bờ suối, bờ, nước, giữa, cuối nước, chân vách bậc 0) + K bậc × 5 + sườn trên 6
    const perSide = 6 + K * 5 + SLOPE_DX.length;
    const NC = perSide * 2 + 1, NR = rows.length;
    const pos = new Float32Array(NC * NR * 3), aP = new Float32Array(NC * NR * 4), aSt = new Float32Array(NC * NR * 3);
    const stC = new Float64Array(STROKES.length);
    const side = [];   // cột của một bên, từ trục ra ngoài: [lat, y, level, m, flatEnd]
    let vi = 0;
    for (let r = 0; r < NR; r++) {
      const z = rows[r], xz = xc(z), rz = riseAt(z);
      for (let i = 0; i < STROKES.length; i++) stC[i] = strokeCenter(STROKES[i], z);
      const cols = [];
      for (const sg of [-1, 1]) {
        const { D, W } = edges(z, sg);
        side.length = 0;
        const fe0 = D[0] - RW;
        // đáy thung (bậc −1): m tính từ trục
        side.push([1.5, rz, -1, 1.5, fe0], [2.3, rz + BUNDH, -1, 2.3, fe0], [2.75, rz, -1, 2.75, fe0], [(2.75 + fe0) / 2, rz, -1, (2.75 + fe0) / 2, fe0], [fe0, rz, -1, fe0, fe0], [D[0], levelY(0, z) + BUNDH, -1, D[0], fe0]);
        for (let k = 0; k < K; k++) {
          const a = D[k], w = W[k], fe = w - RW, y = levelY(k, z);
          const yTop = k + 1 < K ? levelY(k + 1, z) + BUNDH : y + S + 0.6;
          side.push([a, y + BUNDH, k, 0, fe], [a + BUND, y, k, BUND, fe], [a + (BUND + fe) / 2, y, k, (BUND + fe) / 2, fe], [a + fe, y, k, fe, fe], [a + w, yTop, k, w, fe]);
        }
        const yK = levelY(K - 1, z) + S + 0.6, dK = D[K];
        for (let j = 0; j < SLOPE_DX.length; j++) {
          const dxs = SLOPE_DX[j], hn = (vnoise(z * 0.02 + j * 3.1, sg * 7 + 1, 9) - 0.5) * (4 + j * 2.5);
          side.push([dK + dxs, yK + SLOPE_DY[j] + hn, K, dxs, 0]);
        }
        if (sg < 0) { for (let j = side.length - 1; j >= 0; j--) cols.push([-side[j][0], ...side[j].slice(1), -1]); cols.push([0, rz - 0.45, -1, 0, fe0, 0]); }
        else for (const c of side) cols.push([...c, 1]);
      }
      for (const [lat, y, lev, m, fe, sgn] of cols) {
        const x = xz + lat;
        pos[vi * 3] = x; pos[vi * 3 + 1] = y; pos[vi * 3 + 2] = z;
        aP[vi * 4] = lev; aP[vi * 4 + 1] = m; aP[vi * 4 + 2] = fe; aP[vi * 4 + 3] = lat === 0 ? 0.001 : lat;
        for (let i = 0; i < STROKES.length; i++) aSt[vi * 3 + i] = lat - stC[i];
        vi++;
        void sgn;
      }
      if ((r & 15) === 15) yield;
    }
    // CHIA LƯỚI THÀNH TỪNG KHÚC theo z (mỗi khúc ≤ 64 hàng, ~1 MB): lần vẽ đầu mỗi khúc chỉ phải tải lên card một khúc
    // (tải cả lưới ~11 MB một lần làm một khung dài ~55 ms — đo 28/9), và khúc ra ngoài khung nhìn thì card bỏ qua luôn
    const CH = 64;
    st.terrain = new THREE.Group(); st.terrain.name = 'ruong';
    scene.add(st.terrain);
    let tris = 0;
    for (let r0 = 0; r0 < NR - 1; r0 += CH) {
      const r1 = Math.min(NR - 1, r0 + CH);
      const v0 = r0 * NC, v1 = (r1 + 1) * NC;
      const idx = new Uint32Array((r1 - r0) * (NC - 1) * 6);
      let ii = 0;
      for (let r = r0; r < r1; r++) {
        for (let c = 0; c < NC - 1; c++) {
          const a = (r - r0) * NC + c, b = a + 1, d = a + NC, e2 = d + 1;
          idx[ii++] = a; idx[ii++] = b; idx[ii++] = d; idx[ii++] = b; idx[ii++] = e2; idx[ii++] = d;   // quấn ngược chiều kim đồng hồ nhìn từ TRÊN
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos.slice(v0 * 3, v1 * 3), 3));
      g.setAttribute('aP', new THREE.BufferAttribute(aP.slice(v0 * 4, v1 * 4), 4));
      g.setAttribute('aSt', new THREE.BufferAttribute(aSt.slice(v0 * 3, v1 * 3), 3));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, terrainMat);
      mesh.name = 'ruong-' + (r0 / CH);
      st.terrain.add(mesh);
      tris += idx.length / 3;
      yield;
    }
    st.verts = NC * NR; st.tris = tris;
    yield;

    // tuyết tùng phủ sườn trên
    const R = rngF(21), list = [];
    const heightOnSlope = (z, sg, d) => {
      const { D } = edges(z, sg);
      const yK = levelY(K - 1, z) + S + 0.6;
      const q = d - D[K];
      if (q < 0) return null;
      let px = 0, py = yK;
      for (let j = 0; j < SLOPE_DX.length; j++) {
        const hn = (vnoise(z * 0.02 + j * 3.1, sg * 7 + 1, 9) - 0.5) * (4 + j * 2.5);
        const nx = SLOPE_DX[j], ny = yK + SLOPE_DY[j] + hn;
        if (q <= nx) return py + (ny - py) * ((q - px) / (nx - px));
        px = nx; py = ny;
      }
      return null;
    };
    for (let i = 0; i < 5200 && list.length < 2600; i++) {
      const z = Z0 - 20 - Math.pow(R(), 0.9) * (Z0 - Z1 - 40);
      const sg = R() < 0.5 ? -1 : 1;
      const { D } = edges(z, sg);
      const d = D[K] + 2 + Math.pow(R(), 0.8) * 120;
      const y = heightOnSlope(z, sg, d);
      if (y === null) continue;
      const h = 8 + R() * 12;
      list.push([xc(z) + sg * d, y, z, h, h * (0.26 + R() * 0.08), sg, d]);
      if ((i & 255) === 255) yield;
    }
    const tg = cedarGeo(9);
    const im = new THREE.InstancedMesh(tg, treeMat, list.length);
    const tone = new Float32Array(list.length), ast = new Float32Array(list.length * 3);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const vp = new THREE.Vector3(), vs = new THREE.Vector3();
    for (let i = 0; i < list.length; i++) {
      const [x, y, z, h, w, sg, d] = list[i];
      e.set((R() - 0.5) * 0.06, R() * 6.28, (R() - 0.5) * 0.06);
      q.setFromEuler(e);
      m4.compose(vp.set(x, y - 0.5, z), q, vs.set(w, h, w));
      im.setMatrixAt(i, m4);
      tone[i] = 0.7 + R() * 0.6;
      for (let k = 0; k < STROKES.length; k++) ast[i * 3 + k] = sg * d - strokeCenter(STROKES[k], z);
      if ((i & 255) === 255) yield;   // mỗi mẩu ≤ ~1–2 ms: không làm dài khung của màn đầu
    }
    tg.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 1));
    tg.setAttribute('aSt', new THREE.InstancedBufferAttribute(ast, 3));
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    im.name = 'sugi-dem';
    scene.add(im);
    st.trees = im; st.trees_n = list.length;
    yield;

    // dãy núi xa khép cuối thung (cùng shader núi rừng của màn đầu — không dịch thêm chương trình nào)
    st.ridges = buildRidgeLayers(scene, { x: 0, y: 46, z: -165 }, DEM, { mistY: 18, sunSide: 0, sunK: 0.4 });
    st.buildMs = Math.round(performance.now() - t0);
    st.built = true;
  }

  function place(tau, dt) {
    const pz = kf(CAM.z, tau), L = kf(CAM.L, tau), ox = kf(CAM.ox, tau), tz = pz - L;
    camera.position.set(xc(pz) * 0.85 + ox, kf(CAM.y, tau) + riseAt(pz), pz);
    camera.lookAt(xc(tz) * 0.85 + ox * 0.5, kf(CAM.ty, tau) + riseAt(tz), tz);
    // (30/9, Mike: "tilt màn hình chỉ ở trang home thôi, còn ở các section thì bỏ tilt hết") — BỎ máy lượn theo chuột ở chương này;
    // máy chỉ đi theo đường của chương, nhịp thở lúc nghỉ vẫn do app.js cộng vào.
    camera.updateMatrixWorld();
  }

  // đầu nét = máy quay + lead (m, về phía trước) → nét đã vẽ tới đâu (m tính từ đầu nét); vẽ hết thì nhấc cọ (払い / 止め)
  function strokes(tau) {
    const zc = kf(CAM.z, tau);
    STROKES.forEach((s, i) => {
      const L = s.z0 - s.z1, d = s.z0 - (zc - s.lead);
      SU.uSA.value[i].w = d <= 0 ? 0 : d >= L ? L + s.w * 2 : d;
    });
  }

  // HÌNH GIẢ cùng kiểu dữ liệu đỉnh với đất (vị trí · aP · aSt) và với cây (nhân bản: aTone · aSt theo từng cây): để dịch
  // shader VÀ VẼ ĐẦU ngay lúc màn chờ — trên Windows lần vẽ đầu của một chương trình mới chặn 50–65 ms (đo 28/9), phụ thuộc
  // kiểu dữ liệu đỉnh chứ không phụ thuộc cỡ hình, nên vẽ bằng hình giả là đủ
  function warmMeshes() {
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 0, -1], 3));
    tg.setAttribute('aP', new THREE.Float32BufferAttribute(new Float32Array(12), 4));
    tg.setAttribute('aSt', new THREE.Float32BufferAttribute(new Float32Array(9), 3));
    const t = new THREE.Mesh(tg, terrainMat); t.frustumCulled = false; t.name = 'gia-ruong';
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    cg.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    cg.setAttribute('aTone', new THREE.InstancedBufferAttribute(new Float32Array(1), 1));
    cg.setAttribute('aSt', new THREE.InstancedBufferAttribute(new Float32Array(3), 3));
    const c = new THREE.InstancedMesh(cg, treeMat, 1); c.frustumCulled = false; c.name = 'gia-cay';
    return [t, c];
  }

  let time = 0;
  return {
    scene, camera, materials: [terrainMat, treeMat], dummyGeo, st, build, SU, warmMeshes,
    update(dt, tau) {
      time += dt;
      terrainMat.uniforms.uTime.value = time;
      strokes(tau);
      place(tau, dt);
      if (st.ridges) st.ridges.update(time);
    },
    setMouse() { /* 30/9: chương không còn nghiêng theo chuột — giữ hàm để app.js gọi không lỗi */ },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    info() {
      const p = camera.position;
      return { cam: [p.x, p.y, p.z], heads: SU.uSA.value.map((v) => +v.w.toFixed(2)), verts: st.verts, tris: st.tris, trees: st.trees_n, buildMs: st.buildMs };
    },
  };
}
