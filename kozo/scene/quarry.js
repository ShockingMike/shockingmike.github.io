// 石垣 BEARING — VÁCH MỎ ĐÁ TRONG ĐÊM (phần 4, 28/9). Chương thứ hai của "chuyến đi tìm gốc từng lớp kết cấu" (bản thiết
// kế mục 15.1): nơi sinh ra đá của nền thành. Một hẻm mỏ đá sâu, vách khai thác có bậc; theo cuộn, MỘT NÉT CỌ ĐỨNG 緑青
// được vẽ dứt khoát dọc ĐƯỜNG TÁCH đá từ mép vách xuống chân — đường tách là một VẾT NỨT THẬT gấp khúc trên mặt đá (có đoạn
// đã nứt hở), nét mực đi theo vết nứt; rồi HÀNG LỖ NÊM 矢穴 (lỗ chữ nhật đục thẳng hàng TRÊN CHÍNH đường tách, như vết nêm
// cũ dọc mép các mảng đã tách) hiện ra từng lỗ như người thợ đang đục (29/9, vòng soát p7a: bỏ dáng thác nước, bỏ chấm cánh hoa). Ánh sáng của nét hắt lên mặt vách hai bên và xuống vũng nước dưới chân (hubtown chương
// INNOVATION: dòng sáng giữa hẻm núi, đá chỉ sáng ở đoạn dòng đã tới).
//
// Làm theo đúng mẫu của scene/valley.js:
//   · DỰNG NGẦM sau thung lũng, chia nhỏ qua nhiều khung (app.js gọi từng bước của build() trong ngân sách thời gian);
//   · MỘT vật liệu cho mọi thứ (vách, gờ bậc, nền, vũng nước, tảng đá, cây trên mép) — một chương trình shader duy nhất,
//     dịch và vẽ đầu bằng hình giả lúc màn chờ;
//   · nét cọ VẼ NGAY TRONG SHADER CỦA VÁCH (không phải dải nổi): mỗi đỉnh vách mang toạ độ dọc đường vách (s, mét tính từ
//     mép trên, đi qua cả mặt đứng lẫn gờ bậc) và toạ độ ngang → mực nằm trên mặt đá, gãy theo bậc như cọ quét thật;
//   · ĐÈN GIẢ dọc đoạn nét đã vẽ (không đèn thật); nước soi bóng nét bằng một tia phản chiếu rẻ;
//   · keyframe máy quay 2–4 mốc mỗi trục (bezier 0,5, 0 · 0,5, 1) trên nhịp τ đã qua sine.inOut; KHÔNG nghiêng theo chuột (30/9 Mike: tilt chỉ ở trang home).
//
// Vách: mặt cắt PHẲNG từng mảng (mỗi khối đá bị tách ra để lại một mặt phẳng hơi lệch), mạch nứt dọc/ngang có bậc thật
// (lưới dựng đúng theo mạch: hai cột đỉnh trùng chỗ ở mỗi mạch → mép mảng sắc), vài hốc sâu nơi khối đá đã được lấy đi,
// VẾT NÊM CŨ (hàng nửa lỗ nêm dọc mép mảng tách), thớ hạt đá, vệt nước chảy dưới gờ; sương đọng trên từng bậc.
import * as THREE from 'three';
import { DEM } from './look.js';
import { skyMaterial } from './sky.js';
import { RAMP } from '../page/accent.js';
import { kfEase } from './valley.js';

// ── hình dạng hẻm mỏ ─────────────────────────────────────────────────────────────────────────────
const ZB = -40;                                  // chân vách sau (z)
const BH = [11, 13, 10, 12, 14, 12];             // cao từng bậc khai thác (m)
const LD = [3.4, 2.6, 3.8, 3.0, 3.2, 0];         // bề sâu gờ ở đỉnh mỗi bậc (m) — bậc trên cùng là mép vách
const LEAN = 0.045;                              // mặt vách ngả vào 4,5 cm mỗi mét cao
const NB = BH.length;
const BV = [0], BW = [0];                        // chân mỗi bậc: độ cao, độ lùi vào đá
for (let k = 0; k < NB; k++) { BV.push(BV[k] + BH[k]); BW.push(BW[k] + BH[k] * LEAN + LD[k]); }
const TOP = BV[NB];
const WTOP = BW[NB - 1] + BH[NB - 1] * LEAN;
BW[NB] = WTOP;
function benchOf(y) { for (let k = 0; k < NB; k++) if (y < BV[k + 1]) return k; return NB - 1; }
function wFace(y) { if (y <= 0) return y * LEAN; if (y >= TOP) return WTOP; const k = benchOf(y); return BW[k] + (y - BV[k]) * LEAN; }
// toạ độ DỌC ĐƯỜNG VÁCH tính từ mép trên (đi xuống mặt đứng thì y giảm, đi qua gờ thì độ lùi giảm): tăng đều, liền mạch
const sOf = (v, w) => (TOP - v) + (WTOP - w);
const S_BOT = sOf(0, 0);
// đường gấp khúc (s → y) của vách sau, từ mép xuống chân
const PROF = [];
for (let k = NB - 1; k >= 0; k--) { PROF.push([sOf(BV[k + 1], BW[k] + BH[k] * LEAN), BV[k + 1]]); PROF.push([sOf(BV[k], BW[k]), BV[k]]); }
function yOfS(s) {
  if (s <= PROF[0][0]) return PROF[0][1];
  for (let i = 1; i < PROF.length; i++) if (s <= PROF[i][0]) { const [a, ya] = PROF[i - 1], [b, yb] = PROF[i]; return b - a < 1e-6 ? yb : ya + (yb - ya) * (s - a) / (b - a); }
  return PROF[PROF.length - 1][1] - (s - PROF[PROF.length - 1][0]);
}
// hai vách bên: đường chân (x theo z) — hẻm hẹp dần về phía vách sau
const xL = (z) => -24 - 0.05 * (z - ZB);
const xR = (z) => 27 + 0.045 * (z - ZB);

// ── NÉT CỌ ĐỨNG: dọc đường tách đá, từ ngay dưới mép vách xuống sát chân ─────────────────────────
// NÉT KHÔNG ĐỨNG THẲNG: nghiêng ~4° và cong một đường cung dài của cánh tay (thác nước thì rơi thẳng đứng, mắt phải đọc ra
// ngay đây là tay người vẽ) — chỉ lệch vài mét trên 88 m chiều dài.
// (30/9, Mike: "chỗ này nhìn hơi kì" — đường nứt zigzag như tia chớp, lỗ nêm thành ô vuông sáng có vạch chéo, đầu nét như ngọn
//  lửa.) Bỏ hai sóng tam giác (zigzag): đường tách của thợ đá chạy GẦN THẲNG theo hàng lỗ, chỉ gợn nhẹ. Hai gợn nhỏ đặt pha
//  sao cho qua điểm uốn ĐÚNG giữa hàng lỗ → hàng lỗ thẳng (lệch khỏi đường thẳng < 4 cm trên 8,4 m). Đầu ấn nhẹ lại (×1,32 thay
//  ×1,6), đuôi 払い vuốt nhọn thay vì dừng 止め, thân không cạn mực quá sớm (xơ khô tăng dần, rõ ở phần đuôi).
const ST = { s0: 6.5, s1: S_BOT - 19.2, w: 0.95, x0: 4.6, slant: -0.072, sMid: 44, dry: 0.62, seed: 12, headK: 0.32, tail: 0 };
ST.L = ST.s1 - ST.s0;
// ── HÀNG LỖ NÊM 矢穴 (30/9): BẢY lỗ chữ nhật đục thẳng hàng, cách đều 1,32 m, TRÊN CHÍNH đường tách ở mặt đứng bậc thứ ba
// (y 24–34). Lỗ dài theo đường tách (0,96 m), hẹp ngang (0,50 m), sâu 0,45 m, lòng lỗ hình nêm — to hơn lỗ thật (~12 cm) để đọc
// được từ xa 45–50 m. Ba lỗ DƯỚI CÙNG là lỗ cũ: đá đã tách ở đó (một khe mảnh nối các lỗ, lỗ vẫn vuông góc, rời nhau — soát p11a A3). Bốn lỗ mới được
// đục lần lượt TỪ DƯỚI LÊN (nối tiếp đoạn đã tách, theo ánh mắt máy quay đang ngước lên) — lỗ tối, lõm vào, không phát sáng.
const NH = 7, HOLE_Y0 = 33.1, HOLE_GAP = 1.32, HOLE_OLD = 4, HA = 0.25, HB = 0.48, HD = 0.45;
const HOLE_MID = HOLE_Y0 - HOLE_GAP * (NH - 1) / 2;
// đường tách: khe hở ở đoạn lỗ cũ (y 24 → CRK_OPEN), rồi vết nứt chân tóc nhọn dần tới mũi. Mũi nứt ban đầu ở CRK_TIP0 (ngay
// trên đoạn đã tách); mỗi lỗ mới đục xong thì mũi nứt chạy lên qua lỗ ấy (đá yếu đi theo hàng lỗ) — tới hết hàng ở CRK_END
const CRK_OPEN = HOLE_Y0 - HOLE_GAP * HOLE_OLD + HB + 0.3, CRK_TIP0 = CRK_OPEN + 0.9, CRK_END = BV[3] - 0.25, CRK_BOT = BV[2];
const HS = sOf(HOLE_MID, wFace(HOLE_MID));
const strokeX = (s) => ST.x0 + ST.slant * (s - ST.sMid) + 1.3 * Math.sin(s * 0.036 + 0.2) + 0.30 * Math.sin((s - HS) * 0.11) + 0.14 * Math.sin((s - HS) * 0.27);
// điểm trên nét ở độ cao y (nổi khỏi mặt vách một chút: chỗ đặt đèn giả)
function strokePos(y, out, lift = 0.7) { const s = sOf(y, wFace(y)); return out.set(strokeX(s), y, ZB - wFace(y) + lift); }
const DOTS = [];
for (let i = 0; i < NH; i++) {
  // đục tay: tâm lỗ lệch ±4 cm khỏi nhịp đều (cỡ lỗ lệch ±5% — trong shader)
  const y = HOLE_Y0 - HOLE_GAP * i + 0.08 * (rngF(900 + i)() - 0.5), s = sOf(y, wFace(y));
  // độ nghiêng của hàng lỗ (dx/dy) ở lỗ này: trên mặt đứng ds/dy = −(1 + LEAN)
  const tilt = -(1 + LEAN) * (strokeX(s + 0.05) - strokeX(s - 0.05)) / 0.1;
  DOTS.push({ x: strokeX(s), y, tilt, old: i >= HOLE_OLD });
}
export const QUARRY = { ZB, TOP, WTOP, BV, BW, ST, DOTS, S_BOT };

function hash2(i, j, s) { let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
export function vnoise(x, y, s = 0) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(i, j, s), b = hash2(i + 1, j, s), c = hash2(i, j + 1, s), d = hash2(i + 1, j + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function rngF(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ── SHADER ────────────────────────────────────────────────────────────────────────────────────────
const f4 = (v) => v.toFixed(4);
const GL_BENCH = (() => {
  let w = 'float wFaceG(float y) {\n  if (y <= 0.0) return y * ' + f4(LEAN) + ';\n';
  for (let k = 0; k < NB; k++) w += '  if (y < ' + f4(BV[k + 1]) + ') return ' + f4(BW[k]) + ' + (y - ' + f4(BV[k]) + ') * ' + f4(LEAN) + ';\n';
  w += '  return ' + f4(WTOP) + ';\n}\n';
  let bb = 'float benchBot(float y) { return ', bt = 'float benchTop(float y) { return ';
  for (let k = 1; k < NB; k++) { bb += 'y < ' + f4(BV[k]) + ' ? ' + f4(BV[k - 1]) + ' : '; }
  bb += f4(BV[NB - 1]) + '; }\n';
  for (let k = 1; k <= NB; k++) { bt += 'y < ' + f4(BV[k]) + ' ? ' + f4(BV[k]) + ' : '; }
  bt += 'y; }\n';
  return w + bb + bt;
})();
// Mọi hình của mỏ dùng chung một kiểu dữ liệu đỉnh: position · normal · aK (loại, u, s, hạt) · aP (4 số tuỳ loại).
//   loại 0 vách sau · 1 vách bên · 2 nền · 3 tảng đá · 4 mặt nước · 5 cây trên mép
//   vách: u = toạ độ ngang dọc vách (m), s = dọc đường vách từ mép (m), aP = khoảng cách tới 4 mép mảng (trái, phải, dưới, trên)
//   tảng: u, s = toạ độ riêng x, y trong tảng; aP = (z riêng, nửa rộng, nửa cao, nửa sâu)
const VS = /* glsl */`
attribute vec4 aK; attribute vec4 aP;
varying vec3 vW; varying vec3 vN; varying vec4 vK; varying vec4 vP;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vK = aK; vP = aP;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FS = /* glsl */`
// NHIỄU GIÁ TRỊ đọc từ ẢNH NHIỄU 256×256 (số ngẫu nhiên tạo bằng code lúc nạp): lọc song tuyến của card đồ hoạ với trọng số đã
// uốn mềm = đúng nhiễu giá trị mịn như bản băm, nhưng mỗi lần gọi chỉ MỘT lần đọc ảnh. Bản băm (4 phép băm mỗi lần, ~45 lần
// gọi) làm trình dịch HLSL của Windows mất ~1 s cho chương trình này và màn chờ đứng hình 0,6 s lúc mở trang lần đầu (28/9).
uniform sampler2D uNoise;
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return texture2D(uNoise, (i + f + 0.5) * 0.00390625).r; }
uniform float uTime;
uniform vec3 uMoonDir, uMoonC, uSkyAmb, uGndAmb;
uniform vec3 uFogC, uFogLo; uniform float uFogD, uHaze, uLedgeMist;
uniform vec3 uLightC, uLightF; uniform float uLightK, uLightR, uFarR, uFarK, uSpecK, uAirK;
uniform vec3 uC0, uC1, uC2, uInkBase; uniform float uGlowK;
uniform vec4 uS;      // s đầu nét, dài (m), nửa bề rộng (m), đã vẽ tới (m tính từ đầu nét)
uniform vec4 uSB;     // độ khô, hạt, độ phình đầu, kiểu đuôi (0 払い / 1 止め)
uniform vec4 uSX;     // x giữa nét, độ nghiêng (m x mỗi m s), s giữa, 0
uniform vec2 uLit;    // đoạn đã vẽ theo độ cao: y trên, y ngọn cọ
uniform vec3 uAirA, uAirB;   // đoạn nét đã vẽ (thế giới) — cho quầng sáng trong sương
uniform float uZB, uTop, uWTop, uLean;
uniform float uCrk;   // mũi vết nứt (y): chạy lên theo các lỗ đã đục
uniform vec4 uD[${NH}];   // lỗ nêm 矢穴: x giữa (trên đường tách), y giữa, độ nghiêng hàng (dx/dy), tiến độ đục 0…1 (lỗ cũ luôn 1)
uniform vec3 uSkyTop, uSkyHor, uDeep;
uniform vec3 uSkyT, uSkyM, uSkyH;   // màu trời thật (trên · giữa · chân trời) — sương ở trên cao hoà vào nền trời
uniform vec2 uRimX;   // mép trên hai vách bên (x) ở ngang vách sau — cho mặt nước biết tia phản chiếu có lọt ra trời không
varying vec3 vW; varying vec3 vN; varying vec4 vK; varying vec4 vP;

${GL_BENCH}
float sOfY(float y) { return (uTop - y) + (uWTop - wFaceG(y)); }
// đường tách: cung dài của cánh tay + hai gợn nhỏ qua điểm uốn đúng giữa hàng lỗ (không còn sóng tam giác zigzag)
float strokeXG(float s) { return uSX.x + uSX.y * (s - uSX.z) + 1.3 * sin(s * 0.036 + 0.2) + 0.30 * sin((s - ${HS.toFixed(4)}) * 0.11) + 0.14 * sin((s - ${HS.toFixed(4)}) * 0.27); }
vec3 strokeAt(float y, float lift) { return vec3(strokeXG(sOfY(y)), y, uZB - wFaceG(y) + lift); }

// NÉT CỌ tại điểm có toạ độ ngang x (m tới tâm nét) và quãng dọc s (m từ đầu nét). fw = cỡ một điểm ảnh (m).
// Giải phẫu nét như ngọn cọ màn đầu và nét ruộng: 起筆 đầu ấn vát · 送筆 thân dày mỏng theo lực · 払い đuôi vuốt ·
// 掠れ xơ khô dọc nét · 滲み loang mép · 濃淡 đậm nhạt + hạt bột màu khoáng.
void brushAt(float x, float s, float fw, float rough, out float body, out float bleed, out float dens, out float core, out float streak, out float wet, out float spark) {
  body = 0.0; bleed = 0.0; dens = 0.0; core = 0.0; streak = 1.0; wet = 0.0; spark = 0.0;
  float len = uS.y, Wd = uS.z, sHead = uS.w;
  if (sHead <= 0.0) return;
  if (abs(x) > Wd * 2.6 || s < -Wd * 1.6 || s > min(sHead, len) + Wd * 1.5) return;
  float t = clamp(s / len, 0.0, 1.0);
  float sw = s / Wd, seed = uSB.y;
  // 起筆 ấn (phình vừa ở đầu) · 送筆 lực đổi theo nhịp chậm · 懸針 đuôi vuốt nhọn trong ~20% cuối (sau hàng lỗ nêm)
  float press = (1.0 + uSB.z * (1.0 - smoothstep(0.0, 0.06, t))) * (0.74 + 0.46 * vn(vec2(sw * 0.16 + seed, 3.0))) * mix(1.0, 0.8, t);
  if (uSB.w < 0.5) press *= pow(1.0 - smoothstep(0.80, 1.0, t), 0.8);
  float nE = vn(vec2(sw * 0.55 + seed * 3.0, sign(x) * 5.0 + 11.0));
  // vai phải của đầu nét phình ra (ngọn cọ ấn xuống rồi xoay vào thân nét)
  float shoulder = 1.0 + 0.18 * smoothstep(-0.2, 0.6, x / Wd) * smoothstep(-0.4, 0.5, sw) * (1.0 - smoothstep(0.8, 2.6, sw));
  // mép nét gồ ghề theo từng chùm lông (sóng nhỏ ~2 m dọc nét) — mép thẳng tắp thì đọc ra dải đèn, không phải nét cọ
  float w = Wd * press * shoulder * (0.92 + 0.10 * nE + 0.09 * (vn(vec2(sw * 2.1 + seed, sign(x) * 3.0 + 1.0)) - 0.5));
  float iw = 1.0 / max(w, 1e-3);
  float dn = abs(x) * iw, xn = clamp(x * iw, -1.0, 1.0);
  float headM = smoothstep(-0.03 * Wd - fw, 0.05 * Wd + fw, s - 0.9 * x + 0.30 * Wd);
  float tailM = 1.0;
  if (uSB.w > 0.5) { float e = len - s; tailM = 1.0 - smoothstep(0.9 - fw * iw, 1.02 + fw * iw, length(vec2(max(w - e, 0.0), x)) * iw); }
  float front = sHead - s - 0.45 * Wd * xn * xn;
  float drawn = sHead >= len + Wd ? 1.0 : smoothstep(-0.02 * Wd - fw, 0.08 * Wd + fw, front);
  wet = sHead >= len ? 0.0 : exp(-max(front, 0.0) / (Wd * 3.5));
  float depl = smoothstep(0.05, 1.0, t);
  // 飛白: cọ cạn thành TỪNG QUÃNG (không đều từ đầu tới cuối) — quãng khô lộ nền mực sẫm giữa các chùm lông
  float patchD = 0.55 + 0.75 * smoothstep(0.3, 0.7, vn(vec2(sw * 0.16 + seed, 7.7)));
  // (30/9) cạn mực theo bình phương: nửa đầu thân đầy mực, xơ khô rõ dần qua hàng lỗ nêm, khô hẳn ở đuôi (trước: cạn đều từ đầu
  // → nửa dưới nét chỉ còn vài sợi, mắt thấy mỗi vệt khe)
  float D = clamp(uSB.x * (0.3 + 0.7 * depl * depl) * patchD, 0.0, 0.9);
  if (uSB.w > 0.5) D *= 1.0 - 0.8 * smoothstep(0.82, 1.0, t);
  D *= 1.0 - 0.35 * wet;
  float Dl = D * (1.0 + 0.7 * xn * xn);
  float lod = smoothstep(0.35, 1.0, fw * iw * 9.0);
  float fib2 = vn(vec2(xn * 4.0 - seed, sw * 0.045));
  float fib = mix(vn(vec2(xn * 12.0 + seed, sw * 0.10)) * 0.62 + fib2 * 0.38, 0.5 + 0.12 * (fib2 - 0.5), lod);
  float bristle = smoothstep(Dl - 0.07 - 0.2 * lod, Dl + 0.07 + 0.2 * lod, fib + 0.55 * (rough - 0.5) * (0.35 + D));
  float inside = 1.0 - smoothstep(0.9 - fw * iw, 1.0 + fw * iw, dn);
  float touch = smoothstep(0.0, 1.2 * Wd, sHead);
  body = inside * bristle * headM * tailM * drawn * touch;
  float nR = vn(vec2(sw * 1.4, xn * 9.0 + 7.0));
  bleed = (1.0 - smoothstep(0.96, 1.28 + 0.35 * nR + 0.35 * wet, dn)) * smoothstep(0.85, 1.0, dn) * (1.0 - D) * headM * tailM * drawn;
  float grain = mix(vn(vec2(sw * 7.0, xn * 23.0)) * 0.6 + vn(vec2(sw * 19.0, xn * 51.0)) * 0.4, 0.5, lod);
  dens = (0.8 + 0.2 * (1.0 - smoothstep(0.0, 0.10, t))) * (1.0 - 0.5 * depl) * (0.8 + 0.2 * grain);
  core = smoothstep(0.55, 0.95, dens) * (1.0 - 0.55 * xn * xn);
  streak = (0.5 + 0.75 * fib) * (1.0 + 0.35 * smoothstep(0.72, 0.95, dn)) * (0.75 + 0.5 * rough);
  spark = 0.0;
}

// LỖ NÊM 矢穴 (30/9, viết lại): miệng chữ nhật đục vào đá (mép đục sứt nhỏ, góc hơi tròn), lòng lỗ HÌNH NÊM (hai vách dọc thu
// hẹp dần xuống đáy như lỗ thật), sâu HD. KHÔNG viền mực, không đèn, không ký hiệu trong lòng: lỗ chỉ là một hốc tối.
// Nhìn vào lòng lỗ bằng TIA THẬT (thị sai): tia từ mắt đi vào miệng lỗ chạm vách nào / đáy ở độ sâu nào → sáng giảm theo độ sâu
// (khuất sáng), mặt vách đầu trên (úp xuống) / đầu dưới (ngửa lên) / hai vách nêm / đáy sáng khác nhau → máy quay đi thì lòng
// lỗ đổi phối cảnh như hốc thật, không phải hình vẽ phẳng.
//   p: toạ độ trong lỗ (x ngang đường tách, y dọc hàng — đã nắn theo độ nghiêng hàng) · k: độ lệch ngang của tia mỗi mét sâu
//   a: tiến độ đục (thợ đục sâu dần: lỗ nông còn sáng như vết lõm, sâu thì tối) · old: lỗ cũ (mòn tròn góc)
//   ra: m = trong miệng lỗ · lit = độ sáng lòng lỗ so với mặt đá (1 = như mặt đá) · rim = mép dưới bắt ánh · d = khoảng cách tới miệng
void holeAt(vec2 p, vec2 k, float a, float old, float fw, float seed, out float m, out float lit, out float rim, out float d) {
  m = 0.0; lit = 1.0; rim = 0.0; d = 1.0;
  if (a <= 0.0) return;
  // (soát p11a A3) lỗ cũ cũng giữ GÓC VUÔNG như lỗ mới (trước: góc tròn gấp đôi → ba lỗ dưới tròn lại như chuỗi hạt)
  float r0 = 0.035 + 0.0 * old;
  // mép đục không thẳng tắp: mỗi nhát đục sứt một mẩu (sóng nhỏ cỡ vài cm), góc hơi tròn
  float rough = 0.024 * (vn(vec2(p.y * 11.0 + seed, p.x * 9.0 + 3.0)) - 0.5) + 0.012 * (vn(vec2(p.x * 27.0 + seed, p.y * 23.0)) - 0.5);
  vec2 dq = abs(p) - vec2(${HA.toFixed(3)}, ${HB.toFixed(3)}) + r0;
  d = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0) - r0 + rough;
  float cut = smoothstep(0.0, 0.25, a);
  m = (1.0 - smoothstep(-fw, fw, d)) * cut;
  // mép dưới của miệng lỗ (mặt vát ngửa lên) bắt ánh trời / ánh nét — một chỉ mảnh, chỉ ở nửa dưới miệng
  rim = (1.0 - smoothstep(0.0, 0.028 + fw, abs(d))) * smoothstep(0.25, 0.9, -p.y / ${HB.toFixed(3)}) * cut;
  if (m <= 0.0) return;
  float dep = ${HD.toFixed(3)} * (0.06 + 0.94 * smoothstep(0.0, 1.0, a));
  const float HA_ = ${HA.toFixed(3)}, HB_ = ${HB.toFixed(3)}, HD_ = ${HD.toFixed(3)};
  float c = 0.55 * HA_ / HD_;                    // vách nêm: bề ngang thu còn 45% ở đáy
  float px = clamp(p.x, -HA_, HA_), py = clamp(p.y, -HB_, HB_);
  float zh = dep, wall = 0.0;                     // 0 đáy · 1 vách nêm · 2 vách đầu trên (úp xuống) · 3 vách đầu dưới (ngửa lên)
  float den = c - k.x;
  if (den > 1e-4) { float z = (HA_ - px) / den; if (z < zh) { zh = z; wall = 1.0; } }
  den = c + k.x;
  if (den > 1e-4) { float z = (HA_ + px) / den; if (z < zh) { zh = z; wall = 1.0; } }
  if (k.y < -1e-4) { float z = (HB_ - py) / -k.y; if (z < zh) { zh = z; wall = 2.0; } }
  if (k.y > 1e-4) { float z = (HB_ + py) / k.y; if (z < zh) { zh = z; wall = 3.0; } }
  zh = max(zh, 0.0);
  // mặt nào nhận bao nhiêu ánh (ánh nét ở ngay trước mặt vách, trời ở trên): đáy quay ra như mặt đá, vách nêm sượt, vách đầu
  // trên úp xuống (tối), vách đầu dưới ngửa lên (sáng hơn); rồi tối dần theo độ sâu (khuất sáng)
  float face = wall < 0.5 ? 0.9 : wall < 1.5 ? 0.58 : wall < 2.5 ? 0.5 : 0.8;
  // vết đục trong lòng: mỗi nhát đục một bậc nhỏ theo độ sâu (chỉ hiện khi đủ điểm ảnh)
  float chis = 1.0 + (0.34 * (vn(vec2(zh * 55.0 + seed, (wall < 1.5 ? py : px) * 7.0)) - 0.5)) * (1.0 - smoothstep(0.012, 0.04, fw));
  lit = face * exp(-(wall < 0.5 ? 2.6 : 1.7) * zh / HD_) * chis;   // vách: tối dần theo độ sâu · đáy: khuất sáng nhiều nhất
}

// khoảng cách gần nhất giữa hai đoạn thẳng (tia nhìn [p1,q1] · đoạn nét đã vẽ [p2,q2])
float segSeg(vec3 p1, vec3 q1, vec3 p2, vec3 q2) {
  vec3 d1 = q1 - p1, d2 = q2 - p2, r = p1 - p2;
  float a = dot(d1, d1), e = max(dot(d2, d2), 1e-4), f = dot(d2, r), c = dot(d1, r), b = dot(d1, d2);
  float den = a * e - b * b;
  float s = den > 1e-5 ? clamp((b * f - c * e) / den, 0.0, 1.0) : 0.0;
  float t = (b * s + f) / e;
  if (t < 0.0) { t = 0.0; s = clamp(-c / a, 0.0, 1.0); } else if (t > 1.0) { t = 1.0; s = clamp((b - c) / a, 0.0, 1.0); }
  return length(p1 + d1 * s - p2 - d2 * t);
}

void main() {
  float kind = vK.x;
  vec3 V = normalize(cameraPosition - vW);
  float dist = length(cameraPosition - vW);
  vec3 dpx = dFdx(vW), dpy = dFdy(vW);
  vec3 Ng = normalize(cross(dpx, dpy));
  if (dot(Ng, V) < 0.0) Ng = -Ng;
  bool rock = kind < 1.5 || (kind > 2.5 && kind < 3.5);
  bool isWater = kind > 3.5 && kind < 4.5, isTree = kind > 4.5, isFloor = kind > 1.5 && kind < 2.5;
  vec3 N = (isFloor || isTree) ? normalize(vN) : Ng;
  if (dot(N, V) < -0.2) N = -N;
  float fwP = length(fwidth(vW));
  float lod = smoothstep(0.02, 0.2, fwP);            // > 0: một điểm ảnh lớn hơn ~2–20 cm (thớ mịn dần, không lấp lánh)

  // toạ độ mặt phẳng theo hướng chính của mặt (vân đá bám mặt, không kéo dãn)
  vec3 an = abs(Ng);
  vec2 uv = an.y > max(an.x, an.z) ? vW.xz : (an.x > an.z ? vW.zy : vW.xy);
  if (kind < 1.5) uv = an.y > 0.6 ? vW.xz : vec2(vK.y, vW.y);

  // ── bề mặt đá tách: gồ ghề cỡ dm (lồi lõm của mặt tách granite) → pháp tuyến lệch theo đạo hàm màn hình ──
  float hgt = 0.0;
  // (30/9) mặt đá QUANH ĐƯỜNG TÁCH (≈ 3–5 m hai bên): THỚ đá kéo dài theo hướng tách (granite tách theo thớ) + gồ ghề mặt tách
  // cỡ gang tay, nổi khối mạnh hơn. Ánh nét rọi SƯỢT từ ngay trước mặt vách làm các gồ này hiện rõ → không còn là tấm ốp phẳng.
  float xl = kind < 0.5 ? vK.y - strokeXG(vK.z) : 99.0;
  float nearL = exp(-abs(xl) / 2.6) * (1.0 - step(0.6, Ng.y));
  if (rock || isFloor) {
    hgt = vn(uv * 0.32 + vK.w * 11.0) * 0.35 + vn(uv * 0.95 + vK.w * 17.0) * 0.35 + vn(uv * 2.8 + 3.1) * 0.2 + vn(uv * 8.0 + 1.3) * 0.1 * (1.0 - lod);
    if (isFloor) hgt = vn(uv * 1.7) * 0.5 + vn(uv * 5.3) * 0.5 * (1.0 - lod);
    if (nearL > 0.02) {
      // gồ lớn 1–3 m (mặt tách lượn sóng) là thứ ánh sượt làm hiện khối; thớ dọc kéo dài theo hướng tách
      float lump = vn(uv * vec2(0.55, 0.38) + 7.7) * 0.6 + vn(uv * 1.4 + 2.2) * 0.4;
      float rift = vn(vec2(xl * 2.4 + vK.w * 7.0, vW.y * 0.32)) * 0.6 + vn(vec2(xl * 7.5, vW.y * 0.9 + 4.0)) * 0.4 * (1.0 - lod);
      hgt = mix(hgt, lump * 0.75 + rift * 0.25, 0.75 * nearL);
    }
    float bk = isFloor ? 0.12 : 0.42 + 2.0 * nearL;
    vec3 r1 = cross(dpy, N), r2 = cross(N, dpx);
    float det = dot(dpx, r1);
    vec3 grad = sign(det) * (dFdx(hgt) * r1 + dFdy(hgt) * r2);
    N = normalize(abs(det) * N - bk * grad);
  }

  // ── màu vật liệu: granite xám ánh lục (không lam) ──
  vec3 alb = vec3(0.100, 0.108, 0.101);
  float seedP = vK.w;
  float mott = 0.80 + 0.40 * vn(uv * 0.08 + seedP * 9.0);
  // hạt đá nhỏ hơn một điểm ảnh ở xa → lấm tấm như nhiễu; quanh đường tách giảm bớt để khối gồ lớn đọc ra (30/9)
  float grain = mix(vn(uv * 21.0) * 0.6 + vn(uv * 57.0) * 0.4, 0.5, max(lod, 0.6 * nearL));
  float tone = 0.84 + 0.32 * fract(seedP * 7.31);
  float stain = 0.0, crack = 0.0, notch = 0.0;
  if (kind < 1.5) {
    // mặt đứng: vệt nước chảy từ gờ bậc xuống (đậm ngay dưới gờ, tan dần) — gờ ngang thì rêu phong sẫm
    float dTop = benchTop(vW.y) - vW.y;
    float streak = vn(vec2(vK.y * 1.6 + seedP * 5.0, vW.y * 0.07)) * 0.7 + vn(vec2(vK.y * 4.3, vW.y * 0.15)) * 0.3;
    stain = smoothstep(0.5, 0.78, streak) * exp(-dTop / 5.5) * (1.0 - step(0.6, Ng.y));
    // mạch nứt giữa hai mảng: vạch sẫm mảnh ở mép mảng (bậc thật đã có trong hình, vạch này để mắt đọc ra mạch từ xa)
    float eV = min(vP.x, vP.y), eH = min(vP.z, vP.w);
    crack = max(1.0 - smoothstep(0.03, 0.09 + fwP * 1.5, eV), 0.45 * (1.0 - smoothstep(0.02, 0.07 + fwP, eH))) * (1.0 - step(0.6, Ng.y)) * 0.8;
    // VẾT NÊM CŨ: dọc mép trên (hoặc mép trái) của mảng từng bị tách bằng nêm — hàng nửa lỗ chữ nhật đều nhau
    float hsh = fract(seedP * 13.7);
    if (hsh < 0.34 && Ng.y < 0.6) {
      bool top = hsh < 0.22;
      float along = top ? vK.y : vW.y, across = top ? vP.w : vP.x;
      float per = 0.62, f = fract(along / per + seedP * 3.0);
      float aa = fwP / per;
      float slot = smoothstep(0.30 - aa, 0.30 + aa, f) * (1.0 - smoothstep(0.66 - aa, 0.66 + aa, f));
      notch = slot * (1.0 - smoothstep(0.30, 0.34 + fwP, across)) * (1.0 - smoothstep(0.08, 0.22, fwP));
    }
    if (Ng.y > 0.6) alb = mix(alb, vec3(0.058, 0.074, 0.062), 0.6 * vn(vW.xz * 0.35));   // rêu trên gờ
  } else if (kind > 2.5 && kind < 3.5) {
    // tảng đã tách: vết nêm dọc mép trên của mặt trước (nửa lỗ nêm để lại khi tách)
    vec3 lp = vec3(vK.y, vK.z, vP.x), hx = vP.yzw;
    float fr = hx.z - lp.z, tp = hx.y - lp.y;
    float per = 0.34, f = fract(lp.x / per + seedP * 5.0), aa = fwP / per;
    float slot = smoothstep(0.28 - aa, 0.28 + aa, f) * (1.0 - smoothstep(0.64 - aa, 0.64 + aa, f));
    float band = (fr < 0.06 ? 1.0 - smoothstep(0.16, 0.20 + fwP, tp) : 0.0) + (tp < 0.06 ? 1.0 - smoothstep(0.12, 0.16 + fwP, fr) : 0.0);
    if (fract(seedP * 3.3) < 0.7) notch = slot * min(band, 1.0) * (1.0 - smoothstep(0.05, 0.14, fwP));
    float eM = min(min(hx.x - abs(lp.x), hx.y - abs(lp.y)), hx.z - abs(lp.z));
    tone *= 0.92 + 0.12 * smoothstep(0.0, 0.25, eM);     // mép tảng mòn sáng hơn một chút
  }
  alb *= tone * mott * (0.86 + 0.28 * grain) * (1.0 - 0.42 * stain) * (1.0 - 0.55 * crack) * (1.0 - 0.62 * notch);
  // vân thớ đá quanh đường tách: sọc sáng tối rất nhẹ kéo dài dọc hướng tách
  if (nearL > 0.02) alb *= 1.0 + nearL * 0.24 * (vn(vec2(xl * 3.2 + 1.3, vW.y * 0.22)) - 0.5);
  if (isFloor) alb = vec3(0.078, 0.083, 0.077) * (0.75 + 0.5 * vn(vW.xz * 0.21)) * (0.8 + 0.4 * grain);
  if (isTree) alb = vec3(0.016, 0.021, 0.019) * (0.7 + 0.6 * vK.w) * (0.75 + 0.35 * vK.y);

  // ── ánh sáng: trăng rất yếu + trời + ĐÈN GIẢ dọc đoạn nét đã vẽ + đèn nhỏ ở mỗi chấm lỗ nêm ──
  vec3 lD = vec3(0.0), lS = vec3(0.0), lA = vec3(0.0);
  vec3 Rv = reflect(-V, N);
  if (uS.w > 0.0) {
    float yc = clamp(vW.y, uLit.y, uLit.x);
    vec3 Ls = strokeAt(yc, 0.7);
    vec3 d = Ls - vW;
    float r = length(d);
    vec3 L = d / max(r, 1e-3);
    float kN = max(1.0 - r / uLightR, 0.0), kF = max(1.0 - r / uFarR, 0.0);
    float wrap = 0.22 + 0.78 * max(dot(N, L), 0.0);
    lD += (uLightC * kN * kN + uLightF * uFarK * kF * kF * kF) * wrap;
    lS += uLightC * kN * kN * pow(max(dot(Rv, L), 0.0), 22.0);
    float ka = max(1.0 - r / (uLightR * 1.7), 0.0);
    lA += uLightC * ka * ka * ka;
  }
  // (30/9: bỏ đèn giả riêng ở từng lỗ nêm — lỗ là hốc tối, không phải ngọn đèn; ánh quanh hàng lỗ chỉ còn là ánh của nét cọ)
  vec3 amb = mix(uGndAmb, uSkyAmb, N.y * 0.5 + 0.5);
  float occ = 0.40 + 0.60 * smoothstep(-1.0, 12.0, vW.y);          // đáy hẻm khuất trời, khuất trăng
  if (isTree) { lD *= 0.12; lS *= 0.0; }
  vec3 col = alb * ((amb + uMoonC * max(dot(N, uMoonDir), 0.0)) * occ + lD * uLightK) + lS * uSpecK * (rock ? 1.0 : 0.3);

  // ── MẶT NƯỚC dưới chân vách: gương sẫm soi trời qua miệng hẻm + BÓNG NÉT CỌ ──
  if (isWater) {
    vec2 rp = vW.xz * 0.32 + vec2(uTime * 0.018, uTime * 0.011);
    float e = 0.37;
    vec2 g = vec2(vn(rp + vec2(e, 0.0)) - vn(rp - vec2(e, 0.0)), vn(rp + vec2(0.0, e)) - vn(rp - vec2(0.0, e)));
    float amp = 0.10 * (1.0 - smoothstep(0.1, 0.6, fwP));
    vec3 Nw = normalize(vec3(-g.x * amp, 1.0, -g.y * amp));
    vec3 R = reflect(-V, Nw);
    float F = 0.02 + 0.98 * pow(1.0 - max(dot(Nw, V), 0.0), 5.0);
    // tia phản chiếu có lọt khỏi miệng hẻm không (vách sau ở mép trên lùi về uZB − uWTop, hai vách bên ở uRimX)
    vec3 refl = vec3(0.004, 0.005, 0.005) + lA * 0.02;
    float tTop = (uTop - vW.y) / max(R.y, 1e-3);
    vec3 Qt = vW + R * tTop;
    float open = step(0.0, R.y) * step(uZB - uWTop, Qt.z) * step(uRimX.x, Qt.x) * step(Qt.x, uRimX.y);
    vec3 sky = mix(uSkyHor, uSkyTop, smoothstep(0.3, 0.9, R.y));
    refl = mix(refl, sky, open);
    // bóng nét: tia đi ngược lên chạm mặt vách sau (lấy độ lùi của vách ở độ cao chạm) → tra nét ở đó
    vec3 mir = vec3(0.0);
    if (uS.w > 0.0 && R.z < -0.02 && R.y > 0.0) {
      float t0 = (uZB - vW.z) / R.z;
      vec3 Q = vW + R * t0;
      float t1 = (uZB - wFaceG(Q.y) - vW.z) / R.z;
      Q = vW + R * t1;
      if (Q.y > uLit.y - 1.0 && Q.y < uLit.x + 1.0) {
        float xq = Q.x - strokeXG(sOfY(Q.y)), Wd = uS.z;
        float along = smoothstep(uLit.y - 1.5, uLit.y + 0.5, Q.y) * (1.0 - smoothstep(uLit.x - 0.5, uLit.x + 1.5, Q.y));
        float across = 1.0 - smoothstep(0.45 * Wd, 1.35 * Wd, abs(xq));
        float band = exp(-abs(xq) / 7.0) * 0.18;
        mir += (mix(uC1, uC0, 0.35) * across + uLightC * band) * along * exp(-t1 * 0.004) * 0.45;
      }
      // vách sau được nét rọi (dải sáng quanh đoạn đã vẽ, cả chân vách dưới đuôi nét) — ánh ấy cũng vào nước
      vec3 Ls2 = strokeAt(clamp(Q.y, uLit.y, uLit.x), 0.7);
      float r2 = length(Ls2 - Q), k2 = max(1.0 - r2 / uLightR, 0.0), kf2 = max(1.0 - r2 / uFarR, 0.0);
      mir += (uLightC * k2 * k2 + uLightF * uFarK * kf2 * kf2 * kf2) * 0.10 * uLightK * 0.35 * step(0.0, Q.y) * step(Q.y, uTop);
    }
    vec3 wc = mix(uDeep, refl, F) + lS * 0.12 + mir * uGlowK * 0.5 * (0.35 + 0.65 * F);
    col = wc;
  }

  // ── NÉT CỌ MỰC phát sáng + HÀNG LỖ NÊM + ĐƯỜNG TÁCH, trên mặt vách sau ──
  vec3 em = vec3(0.0);
  float cov = 0.0;
  if (kind < 0.5) {
    float s = vK.z - uS.x;
    float x = vK.y - strokeXG(vK.z);
    float fwx = max(fwidth(x), 1e-3);
    float fwh = max(fwP * 0.7, 1e-3);
    bool vert = Ng.y < 0.6;
    // LỖ NÊM 矢穴: chỉ tính quanh hàng lỗ (một dải ~1,2 m × 10 m — rẻ)
    float hM = 0.0, hLit = 1.0, hRim = 0.0, hD = 1.0, hA = 0.0;
    if (vert && abs(x) < 0.6 && abs(vW.y - ${HOLE_MID.toFixed(3)}) < ${(HOLE_GAP * (NH - 1) / 2 + HB + 0.1).toFixed(3)}) {
      float fi = clamp(floor((${HOLE_Y0.toFixed(3)} - vW.y) / ${HOLE_GAP.toFixed(3)} + 0.5), 0.0, ${(NH - 1).toFixed(1)});
      vec4 Dd = uD[int(fi)];
      // toạ độ trong lỗ, nắn theo độ nghiêng của hàng (vài độ): tt dọc hàng, nn ngang hàng
      vec2 tt = normalize(vec2(Dd.z, 1.0)), nn = vec2(tt.y, -tt.x);
      vec2 r = vec2(vK.y - Dd.x, vW.y - Dd.y);
      vec2 kv = V.xy / max(V.z, 0.05);
      hA = Dd.w;
      float hz = 1.0 / (0.95 + 0.1 * fract(sin(fi * 12.9898 + 4.1) * 43758.5453));   // cỡ lỗ lệch ±5% (đục tay)
      holeAt(vec2(dot(r, nn), dot(r, tt)) * hz, vec2(dot(kv, nn), dot(kv, tt)), Dd.w, step(${(HOLE_OLD - 0.5).toFixed(1)}, fi), fwh * hz, fi * 7.31, hM, hLit, hRim, hD);
    }
    // ĐƯỜNG TÁCH: chỉ ở đoạn hàng lỗ (đá chưa tách ở chỗ khác — nét mực mới là đường sẽ tách). Đoạn ba lỗ cũ: khe hở ~10 cm, mép
    // sứt, mỗi bên còn nửa lỗ nêm (răng lược); trên đó thu thành vết nứt chân tóc chạy qua giữa lỗ, nhọn dần tới mũi. Gợn nhẹ vài
    // cm theo thớ đá — không gãy khúc.
    float fis = 0.0, lipL = 0.0, openK = 0.0;
    // (soát p11a A3) khe tách chỉ bắt đầu từ MÉP DƯỚI LỖ THẤP NHẤT (không còn đuôi chữ T chạy xuống gờ bậc) và đoạn lỗ cũ chỉ còn một
    // khe MẢNH (~3,5 cm, trước 12 cm) — giữa hai lỗ là đá liền, lỗ đứng rời nhau từng hình chữ nhật, không dính thành chuỗi hạt
    if (vert && abs(x) < 0.5 && vW.y > ${(HOLE_Y0 - HOLE_GAP * (NH - 1) - HB + 0.12).toFixed(3)} && vW.y < uCrk) {
      float yy = vW.y;
      float xf = x - 0.044 * (vn(vec2(yy * 2.3, 1.7)) - 0.5) - 0.02 * (vn(vec2(yy * 7.0, 4.1)) - 0.5);
      openK = 1.0 - smoothstep(${(CRK_OPEN - 0.35).toFixed(3)}, ${(CRK_OPEN + 0.25).toFixed(3)}, yy);
      // vết nứt chân tóc (≈ 4 cm — to hơn thật như lỗ, để đọc được từ xa) nhọn dần tới mũi uCrk; mũi nứt chạy lên theo từng lỗ vừa đục
      float hair = 0.02 * (1.0 - smoothstep(uCrk - 1.4, uCrk, yy)) * (0.7 + 0.6 * vn(vec2(yy * 1.7, 9.1)));
      float gw = mix(hair, 0.0175 * (0.8 + 0.4 * vn(vec2(yy * 3.1, 5.3))), openK);
      fis = (1.0 - smoothstep(gw - fwh, gw + fwh, abs(xf))) * min(1.0, 2.0 * gw / fwh);
      // mép trái của khe (bên máy quay nhìn thấy) bắt ánh nét một chỉ mảnh; mép phải chìm trong bóng
      lipL = 0.4 * (1.0 - smoothstep(gw, gw + 0.02 + fwh, -xf)) * step(xf, 0.0) * (1.0 - fis) * openK;
      col *= 1.0 - 0.3 * (1.0 - smoothstep(gw, gw + 0.035 + fwh, xf)) * step(0.0, xf) * (1.0 - fis) * openK;
    }
    // lòng lỗ: tối dần theo độ sâu (tia nhìn); mép dưới miệng lỗ bắt ánh; khe tách đen sâu
    col = mix(col, col * hLit, hM);
    col += alb * (lD * uLightK * 0.3 + uMoonC * 0.25) * max(hRim, lipL);
    col *= 1.0 - 0.95 * fis;
    // mực bị đục mất ở miệng lỗ (kể cả viền sứt vài cm quanh miệng) và không vào được khe tách
    float chipped = (1.0 - smoothstep(0.0, 0.03 + 0.03 * vn(vec2(vW.y * 19.0, x * 23.0)), hD)) * smoothstep(0.0, 0.3, hA);
    float noInk = max(max(hM, chipped), fis);
    float body, bleed, dens, core, streak, wet, spark;
    brushAt(x, s, fwx, hgt, body, bleed, dens, core, streak, wet, spark);
    if (body + bleed + spark > 0.001) {
      float a = clamp(body * (0.55 + 0.4 * dens) + bleed * 0.3, 0.0, 1.0);
      // lõi nhạt, hai mép 緑青 đậm hơn (như nét chương 仕事): mực dồn ra mép khi lông cọ xoè
      float xq = clamp(x / (uS.z * 1.05), -1.0, 1.0);
      vec3 c = mix(mix(uC2, uC1, smoothstep(0.45, 0.85, dens) * (1.0 - 0.8 * xq * xq)), uC0, core * (0.12 + 0.88 * wet) * smoothstep(0.55, 1.0, streak)) * body * (0.3 + 0.8 * dens) * streak + uC2 * bleed * 0.5 + uC1 * spark * 0.8;
      em += c * (1.0 + 0.5 * wet) * (1.0 - noInk);
      cov = max(cov, a * (1.0 - noInk));
    }
  }
  col = mix(col, uInkBase, cov * 0.85);

  // ── sương: theo khoảng cách + sương đọng đáy hẻm + dải sương nằm trên từng bậc (các lớp vách tách nhau) ──
  float fogF = (1.0 - exp(-pow(uFogD * dist, 2.0))) * mix(0.28, 1.0, exp(-max(vW.y - 14.0, 0.0) / 30.0));
  float ground = exp(-max(vW.y - 0.3, 0.0) / 4.5) * smoothstep(12.0, 80.0, dist) * uHaze;
  float hb = vW.y - benchBot(vW.y);
  float ledge = (kind < 1.5 && vW.y > 1.0) ? exp(-hb / 2.4) * smoothstep(25.0, 110.0, dist) * uLedgeMist : 0.0;
  float f = clamp(fogF + (ground + ledge) * (1.0 - fogF), 0.0, 1.0);
  vec3 fogC = mix(uFogLo, uFogC, smoothstep(0.0, 40.0, vW.y));
  float eh = clamp(-V.y, -0.2, 1.0);
  vec3 skyC = mix(mix(uSkyH, uSkyM, smoothstep(0.0, 0.16, eh)), uSkyT, smoothstep(0.12, 0.55, eh));
  fogC = mix(fogC, skyC, smoothstep(30.0, 78.0, vW.y));
  col += lA * 0.025 * (1.0 - f);
  col = mix(col, fogC + lA * 0.12, f);
  // QUẦNG SÁNG TRONG SƯƠNG quanh đoạn nét đã vẽ (sương đêm bắt ánh nét — không phải loá hậu kỳ)
  if (uS.w > 0.0) {
    float dA = segSeg(cameraPosition, vW, uAirA, uAirB);
    col += uLightC * uAirK * exp(-dA * dA / 90.0) * (1.0 - exp(-dist * 0.012));
  }
  // trần mềm cho độ sáng nét (đường cong nén, không cắt phẳng: lõi rất sáng vẫn còn thớ lông cọ sau loá + ACES)
  em *= uGlowK;
  float le = dot(em, vec3(0.2126, 0.7152, 0.0722));
  em /= 1.0 + max(le - 1.3, 0.0) * 0.45;
  col += em * exp(-dist * 0.0011);
  gl_FragColor = vec4(col, 1.0);
}`;

// ── hình học ──────────────────────────────────────────────────────────────────────────────────────
// Bộ đệm đỉnh gom dần: position · normal · aK · aP
// mảng số CỐ ĐỊNH KIỂU, tự nới gấp đôi khi đầy (không dùng mảng thường: dựng vài trăm nghìn số bằng mảng thường sinh rác, bộ dọn
// bộ nhớ chạy giữa chừng làm một mẩu dựng ngầm dài 9,5 ms — đo 28/9). push nhận 1–6 số, không tạo mảng tạm.
class GArr {
  constructor(T, cap) { this.T = T; this.a = new T(cap); this.length = 0; }
  push(a, b, c, d, e, f) {
    const n = arguments.length;
    if (this.length + n > this.a.length) { const nb = new this.T(Math.max(this.a.length * 2, this.length + n)); nb.set(this.a); this.a = nb; }
    const A = this.a; let L = this.length;
    A[L++] = a; if (n > 1) A[L++] = b; if (n > 2) A[L++] = c; if (n > 3) A[L++] = d; if (n > 4) A[L++] = e; if (n > 5) A[L++] = f;
    this.length = L;
  }
  out() { return this.a.slice(0, this.length); }
}
export function Buf(nv = 4096) { return { p: new GArr(Float32Array, nv * 3), n: new GArr(Float32Array, nv * 3), k: new GArr(Float32Array, nv * 4), q: new GArr(Float32Array, nv * 4), idx: new GArr(Uint32Array, nv * 6) }; }
export function toGeo(B) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(B.p.out(), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(B.n.out(), 3));
  g.setAttribute('aK', new THREE.BufferAttribute(B.k.out(), 4));
  g.setAttribute('aP', new THREE.BufferAttribute(B.q.out(), 4));
  if (B.idx.length) g.setIndex(new THREE.BufferAttribute(B.idx.out(), 1));
  g.computeBoundingSphere();
  return g;
}

// VÁCH MỎ: lưới dựng ĐÚNG THEO MẠCH ĐÁ. Đá có HỆ MẠCH NỨT: vài mạch dọc chạy liền qua nhiều bậc (mạch chính), thêm ít mạch
// cục bộ; mỗi bậc có thể có một mạch ngang. Mỗi mảng giữa các mạch là một mặt phẳng hơi lệch (lùi/lồi ≤ 45 cm, nghiêng
// ≤ 2,5%) — mặt tách của khối đá đã lấy đi; vài mảng lùi sâu 0,8–2,2 m (hốc nơi cả khối đã được tách ra). Cột đỉnh đặt
// ĐÚNG ở mọi mạch và nhân đôi (một đỉnh thuộc mảng trái, một thuộc mảng phải) → bậc giữa hai mảng sắc, không vát.
// Lưới liền một tấm (không khe hở giữa các mảng: bậc giữa hai mảng là một dải mặt nối) — không lọt sáng trời qua mạch.
// Bộ sinh: mỗi lần next() một tầng (≤ ~1 ms), không làm dài khung nào.
function* buildWall(o, out) {
  const R = rngF(o.seed);
  const masters = [];
  for (let u = o.u0 + 3 + R() * 9; u < o.u1 - 5; u += 8 + R() * 15) { const k0 = Math.floor(R() * NB); masters.push({ u, k0, k1: Math.min(NB - 1, k0 + 1 + Math.floor(R() * 4)) }); }
  const tiers = [];
  for (let k = 0; k < NB; k++) {
    const cuts = [k === 0 ? -4 : BV[k]];
    if (R() < 0.42) cuts.push(BV[k] + BH[k] * (0.32 + R() * 0.36));
    cuts.push(BV[k + 1]);
    for (let t = 0; t < cuts.length - 1; t++) {
      const js = [];
      for (const m of masters) if (k >= m.k0 && k <= m.k1) js.push(m.u + (R() - 0.5) * 0.35);
      for (let u = o.u0 + R() * 18; u < o.u1 - 3; u += 10 + R() * 18) if (R() < 0.55) js.push(u);
      js.sort((x, y) => x - y);
      const jj = [o.u0];
      for (const u of js) if (u - jj[jj.length - 1] > 2.2 && o.u1 - u > 2.2) jj.push(u);
      jj.push(o.u1);
      const panels = [];
      for (let j = 0; j < jj.length - 1; j++) {
        const deep = R() < 0.07 && k < NB - 1 && jj[j + 1] - jj[j] < 16;
        panels.push({ uL: jj[j], uR: jj[j + 1], o: deep ? 0.8 + R() * 1.4 : (R() - 0.5) * 0.9, a: (R() - 0.5) * 0.05, b: (R() - 0.5) * 0.05, seed: R() });
      }
      tiers.push({ k, v0: cuts[t], v1: cuts[t + 1], js: jj, panels });
    }
  }
  yield;
  const J = new Set();
  for (const t of tiers) for (let i = 1; i < t.js.length - 1; i++) J.add(Math.round(t.js[i] * 1000) / 1000);
  const cols = [[o.u0, 1]];
  for (const u of [...J].sort((x, y) => x - y)) cols.push([u, -1], [u, 1]);
  cols.push([o.u1, -1]);
  const wBase = (k, v) => BW[k] + (v - BV[k]) * LEAN;
  yield;
  const B = Buf(cols.length * (tiers.length * 2 + 4));
  const NC = cols.length;
  let rows = 0;
  const put = (u, v, w, pk, s, q0, q1, q2, q3) => {
    B.p.push(o.O.x + o.U.x * u - o.N.x * w, v, o.O.z + o.U.z * u - o.N.z * w);
    B.n.push(o.N.x, 0, o.N.z);
    B.k.push(o.kind, u, s, pk);
    B.q.push(q0, q1, q2, q3);
  };
  yield;
  for (const t of tiers) {
    // mảng của từng cột trong tầng: quét một lượt theo u (cột đã xếp tăng dần; đỉnh trái của một mạch thuộc mảng bên trái)
    const pc = new Array(NC);
    let pi = 0;
    for (let c = 0; c < NC; c++) {
      const [u, side] = cols[c];
      while (pi < t.panels.length - 1 && (side < 0 ? u > t.panels[pi].uR + 1e-6 : u >= t.panels[pi].uR - 1e-6)) pi++;
      pc[c] = t.panels[pi];
    }
    for (const v of [t.v0, t.v1]) {
      const wb = wBase(t.k, v), sv = sOf(v, wb), vc = (t.v0 + t.v1) / 2;
      for (let c = 0; c < NC; c++) {
        const u = cols[c][0], p = pc[c];
        const off = p.o + p.a * (u - (p.uL + p.uR) / 2) + p.b * (v - vc);
        put(u, v, wb + off, p.seed, sv, u - p.uL, p.uR - u, v - t.v0, t.v1 - v);
      }
      rows++;
    }
    yield;
  }
  // mặt bằng trên mép vách (chỗ cây đứng) — thoải lên phía sau
  for (const [dw, dv] of [[0.6, 0], [7, 0.4], [30, 2.2], [90, 6.5]]) {
    for (const [u] of cols) put(u, TOP + dv + (dw > 1 ? 1.2 * (vnoise(u * 0.05, dw, 3) - 0.5) : 0), WTOP + dw, 0.5, 0, 9, 9, 9, 9);
    rows++;
  }
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < NC - 1; c++) {
      const a = r * NC + c, b = a + 1, d = a + NC, e = d + 1;
      B.idx.push(a, d, b, b, d, e);
    }
    if ((r & 7) === 7) yield;
  }
  // mặt quay đúng về phía hẻm (pháp tuyến hình học của một ô mặt đứng cùng chiều N)
  const P = B.p.a, IX = B.idx.a, i0 = IX[0] * 3, i1 = IX[1] * 3, i2 = IX[2] * 3;
  const ax = P[i1] - P[i0], ay = P[i1 + 1] - P[i0 + 1], az = P[i1 + 2] - P[i0 + 2];
  const bx = P[i2] - P[i0], by = P[i2 + 1] - P[i0 + 1], bz = P[i2 + 2] - P[i0 + 2];
  const nx = ay * bz - az * by, nz = ax * by - ay * bx;
  if (nx * o.N.x + nz * o.N.z < 0) for (let i = 0; i < B.idx.length; i += 3) { const tmp = IX[i + 1]; IX[i + 1] = IX[i + 2]; IX[i + 2] = tmp; }
  yield;
  out.B = B;
}

// độ cao nền mỏ: đá dăm gợn nhẹ · lở tích dưới chân ba vách · vũng nước trũng trước chân vách sau
function floorH(x, z) {
  const dLw = x - xL(z), dRw = xR(z) - x, dBw = z - ZB;
  const scree = (d) => (d < 9 ? 3.1 * Math.pow(Math.max(0, 1 - d / 9), 1.6) : 0);
  const e = Math.hypot((x - 1.5) / 19, (z + 27) / 12.5) + 0.22 * (vnoise(x * 0.09 + 5, z * 0.09, 7) - 0.5);
  const pool = 1.1 * (1 - smooth(0.7, 1.05, e));
  const base = 0.28 + 0.55 * (vnoise(x * 0.07, z * 0.07, 3) - 0.5) + 0.16 * (vnoise(x * 0.31, z * 0.31, 4) - 0.5);
  return base + Math.max(scree(dLw), scree(dRw), scree(dBw) * (1 - 0.92 * (pool / 1.1))) - pool;
}
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// tảng đá tách: hộp vát cạnh (mặt phẳng, mép mòn) — toạ độ riêng trong tảng để vẽ vết nêm dọc mép
function chamferBox(B, hx, hy, hz, e, M, seed) {
  const V = new THREE.Vector3();
  const faces = [];
  const sgn = [-1, 1];
  // 6 mặt chính
  for (const ax of [0, 1, 2]) for (const s of sgn) {
    const h = [hx, hy, hz], a1 = (ax + 1) % 3, a2 = (ax + 2) % 3;
    const q = [];
    for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = [0, 0, 0]; p[ax] = s * h[ax]; p[a1] = i * (h[a1] - e); p[a2] = j * (h[a2] - e); q.push(p); }
    if (s < 0) q.reverse();
    faces.push(q);
  }
  // 12 dải vát cạnh
  for (const ax of [0, 1, 2]) {
    const a1 = (ax + 1) % 3, a2 = (ax + 2) % 3, h = [hx, hy, hz];
    for (const s1 of sgn) for (const s2 of sgn) {
      const p = (t, u1, u2) => { const r = [0, 0, 0]; r[ax] = t * (h[ax] - e); r[a1] = s1 * (h[a1] - u1); r[a2] = s2 * (h[a2] - u2); return r; };
      let q = [p(-1, 0, e), p(1, 0, e), p(1, e, 0), p(-1, e, 0)];
      if (s1 * s2 < 0) q = q.reverse();
      faces.push(q);
    }
  }
  // 8 góc tam giác
  for (const sx of sgn) for (const sy of sgn) for (const sz of sgn) {
    let q = [[sx * hx, sy * (hy - e), sz * (hz - e)], [sx * (hx - e), sy * hy, sz * (hz - e)], [sx * (hx - e), sy * (hy - e), sz * hz]];
    if (sx * sy * sz < 0) q = q.reverse();
    faces.push(q);
  }
  for (let q of faces) {
    // hộp lồi, tâm ở gốc: mặt phải quay ra xa tâm — lật thứ tự đỉnh nếu ngược (khỏi phải nhớ chiều từng loại mặt)
    const c = [0, 1, 2].map((a) => q.reduce((s, p) => s + p[a], 0) / q.length);
    const u = [0, 1, 2].map((a) => q[1][a] - q[0][a]), w = [0, 1, 2].map((a) => q[2][a] - q[0][a]);
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    if (n[0] * c[0] + n[1] * c[1] + n[2] * c[2] < 0) q = q.slice().reverse();
    const base = B.p.length / 3;
    for (const p of q) {
      V.set(p[0], p[1], p[2]).applyMatrix4(M);
      B.p.push(V.x, V.y, V.z);
      B.n.push(0, 1, 0);
      B.k.push(3, p[0], p[1], seed);
      B.q.push(p[2], hx, hy, hz);
    }
    if (q.length === 4) B.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else B.idx.push(base, base + 1, base + 2);
  }
}

// tuyết tùng trên mép mỏ (hình nón nhiều tầng tán, gộp vào một lưới — cùng vật liệu, không thêm chương trình shader)
function cedarProto(seed) {
  const r = rngF(seed);
  const g = new THREE.ConeGeometry(1, 1, 7, 10, true);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const f = (v.y * 5 + r() * 0.3) % 1;
    const k = v.y > 0.985 ? 0 : 0.7 + 0.52 * Math.pow(f, 1.6);
    p.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  g.computeVertexNormals();
  return g;
}

// ── keyframe máy quay (τ đã qua sine.inOut của cả quãng cuộn — app.js tính) ─────────────────────────
// Mở bằng cảnh toàn hẻm (lúc nét quét của chuyển cảnh mở ra); tiến vào, hạ thấp sát mặt đá dăm rồi TRÔI NGANG DỌC CHÂN
// VÁCH SAU (tảng đá tách lướt qua phía trước, ánh nhìn theo ngọn cọ đi xuống); khi hàng lỗ nêm hiện thì liếc sang trái theo
// hàng chấm; cuối chương tới sát chân nét thì NGỬA DẦN LÊN dọc cả nét cọ vừa vẽ, nghiêng cánh rất nhẹ.
// nhịp: 0 cảnh toàn · 0,3 theo ngọn cọ (đầu nét ~38 m) · 0,56 nét dừng ở lưng bậc hai → máy nhìn gần như ngang ra CHÂN
// VÁCH: tảng đá tách, vũng nước soi bóng nét · 0,72 ngước lên hàng lỗ nêm đang hiện · 1 ngửa hẳn lên dọc cả nét
const CAM = {
  x: [[0, -4], [0.3, -12], [0.56, -14.5], [0.72, -12], [1, -4.5]],
  y: [[0, 8], [0.3, 4.2], [0.56, 2.4], [0.72, 2.2], [1, 1.9]],
  z: [[0, 112], [0.3, 40], [0.56, 7], [0.72, -1], [1, -9]],
  tx: [[0, 3], [0.3, 2], [0.56, 0.5], [0.72, 2.5], [1, 0.5]],
  ty: [[0, 33], [0.3, 36], [0.56, 9], [0.72, 27], [1, 39]],
  tz: [[0, -46], [0.56, -46], [0.72, -48], [1, -54]],
  roll: [[0, 0], [0.56, -0.012], [1, 0.03]],
};
// nhịp vẽ: nét đứng tới τ 0,56 (cọ chạm xuống ngay lúc nét quét của chuyển cảnh mở ra); bốn lỗ nêm mới đục từ dưới lên 0,60 → 0,835
// (Sếp 29/9 sau p9b, lỗi cũ p7b: 0,5 s đầu chương vách còn tối — vách chỉ sáng nhờ ánh của đoạn nét đã vẽ. Cọ chạm xuống sớm hơn,
//  từ giữa quãng chuyển cảnh 2: lúc tới chương đoạn nét đã dài gấp ~1,7 → vách sáng ngay từ khung đầu, cùng một nguồn sáng)
const HEAD = [-0.12, 0.56];
// ĐƯỜNG CONG TRƠN QUA CÁC MỐC (Hermite, tiếp tuyến lấy theo hai mốc kề): máy KHÔNG dừng ở mốc giữa chừng. Nối từng đoạn bằng
// đường cong chậm-hai-đầu (0,5, 0 · 0,5, 1) thì mọi trục dừng hẳn ở mỗi mốc chung → đo được khung đứng yên (28/9). Hai đầu
// chương vẫn êm nhờ sine.inOut của cả quãng cuộn (app.js).
export function kfs(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0][1];
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 1;
  while (t > keys[i][0]) i++;
  const [t0, v0] = keys[i - 1], [t1, v1] = keys[i], h = t1 - t0, u = (t - t0) / h;
  const tan = (k) => {
    if (k === 0) return (keys[1][1] - keys[0][1]) / (keys[1][0] - keys[0][0]);
    if (k === n - 1) return (keys[n - 1][1] - keys[n - 2][1]) / (keys[n - 1][0] - keys[n - 2][0]);
    return (keys[k + 1][1] - keys[k - 1][1]) / (keys[k + 1][0] - keys[k - 1][0]);
  };
  const m0 = tan(i - 1) * h, m1 = tan(i) * h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1;
}
const DOT_T0 = 0.60, DOT_DT = 0.055, DOT_LEN = 0.07;

export function createQuarry(renderer) {
  const scene = new THREE.Scene();
  scene.name = 'mo-da';
  const camera = new THREE.PerspectiveCamera(46, 1, 0.5, 6000);
  const lin = (hex) => new THREE.Color(hex);
  const moonDir = new THREE.Vector3(-0.30, 0.78, 0.55).normalize();
  const U = {
    uTime: { value: 0 },
    uMoonDir: { value: moonDir }, uMoonC: { value: lin(0x7d918b).multiplyScalar(2.3) },
    uSkyAmb: { value: lin(0x2b3a36).multiplyScalar(2.6) }, uGndAmb: { value: lin(0x0e1311) },
    uFogC: { value: lin(0x2a3633) }, uFogLo: { value: lin(0x1b2421) }, uFogD: { value: 0.0068 }, uHaze: { value: 0.5 }, uLedgeMist: { value: 0.42 },
    // ánh gần: 緑青 nấc 400 pha 30% xám lục; ánh xa (vách bên hẻm): gần như trung tính
    uLightC: { value: lin(RAMP[400]).lerp(lin(0x9fb3ac), 0.3) }, uLightF: { value: lin(RAMP[400]).lerp(lin(0xa7b5b0), 0.6) },
    uLightK: { value: 7.0 }, uLightR: { value: 17 }, uFarR: { value: 78 }, uFarK: { value: 0.42 }, uSpecK: { value: 1.1 }, uAirK: { value: 0.015 },
    // 緑青 như nét ruộng (Mike 28/9 "phải glow hơn") — mức tối thiểu: lõi ướt nấc 100, thân 300, loang 400, nền mực 900
    uC0: { value: lin(RAMP[100]).multiplyScalar(1.0) }, uC1: { value: lin(RAMP[300]).multiplyScalar(1.05) }, uC2: { value: lin(RAMP[400]).multiplyScalar(1.0) },
    uInkBase: { value: lin(RAMP[900]).multiplyScalar(0.5) }, uGlowK: { value: 1.65 },
    uS: { value: new THREE.Vector4(ST.s0, ST.L, ST.w, 0) },
    uSB: { value: new THREE.Vector4(ST.dry, ST.seed * 7.13, ST.headK, ST.tail) },
    uSX: { value: new THREE.Vector4(ST.x0, ST.slant, ST.sMid, 0) },
    uLit: { value: new THREE.Vector2(TOP, TOP) },
    uAirA: { value: new THREE.Vector3() }, uAirB: { value: new THREE.Vector3() },
    uZB: { value: ZB }, uTop: { value: TOP }, uWTop: { value: WTOP }, uLean: { value: LEAN },
    uD: { value: DOTS.map((d) => new THREE.Vector4(d.x, d.y, d.tilt, d.old ? 1 : 0)) }, uCrk: { value: CRK_TIP0 },
    uSkyTop: { value: lin(DEM.sky.mid).multiplyScalar(0.5) }, uSkyHor: { value: lin(DEM.sky.horizon).multiplyScalar(0.55) }, uDeep: { value: lin(0x020303) },
    uRimX: { value: new THREE.Vector2(xL(ZB) - WTOP, xR(ZB) + WTOP) },
    uSkyT: { value: lin(DEM.sky.top) }, uSkyM: { value: lin(DEM.sky.mid) }, uSkyH: { value: lin(DEM.sky.horizon) },
  };
  // ảnh nhiễu (một kênh, 256×256, lặp): số ngẫu nhiên cố định theo hạt giống — hình giống nhau mọi lần mở trang
  {
    const N = 256, d = new Uint8Array(N * N * 4), r = rngF(20260928);
    for (let i = 0; i < N * N; i++) { const v = Math.floor(r() * 256); d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
    U.uNoise = { value: t };
  }
  const mat = new THREE.ShaderMaterial({ name: 'mo-da', vertexShader: VS, fragmentShader: FS, uniforms: U, extensions: { derivatives: true } });

  const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 28), skyMaterial(DEM, moonDir));
  // vẽ SAU mọi vật đục (vẫn thử độ sâu, không ghi): trong hẻm trời chỉ lộ một dải trên cao — tô trời trước rồi để vách che
  // lên thì shader trời (mây 10 lớp nhiễu) chạy trên cả màn mỗi khung. Hình không đổi.
  sky.frustumCulled = false; sky.renderOrder = 100; sky.name = 'troi-mo';
  scene.add(sky);

  const st = { built: false, verts: 0, tris: 0, trees: 0, blocks: 0, buildMs: 0, meshes: 0 };
  st.addMs = [];
  const add = (B, name) => { const t0 = performance.now(); const g = toGeo(B); const m = new THREE.Mesh(g, mat); m.name = name; scene.add(m); st.verts += g.attributes.position.count; st.tris += (g.index ? g.index.count : g.attributes.position.count) / 3; st.meshes++; st.addMs.push([name, +(performance.now() - t0).toFixed(1)]); return m; };

  // ── DỰNG (bộ sinh: mỗi lần next() làm một mẩu nhỏ ≤ ~2 ms) ──
  function* build() {
    const t0 = performance.now();
    const WALLS = [
      ['vach-sau', { O: new THREE.Vector3(0, 0, ZB), U: new THREE.Vector3(1, 0, 0), N: new THREE.Vector3(0, 0, 1), u0: -80, u1: 80, kind: 0, seed: 31 }],
      ['vach-trai', { O: new THREE.Vector3(xL(ZB), 0, ZB), U: new THREE.Vector3(-0.05, 0, 1).normalize(), N: new THREE.Vector3(1, 0, 0.05).normalize(), u0: -48, u1: 260, kind: 1, seed: 47 }],
      ['vach-phai', { O: new THREE.Vector3(xR(ZB), 0, ZB), U: new THREE.Vector3(0.045, 0, 1).normalize(), N: new THREE.Vector3(-1, 0, 0.045).normalize(), u0: -48, u1: 260, kind: 1, seed: 53 }],
    ];
    for (const [name, o] of WALLS) { const out = {}; yield* buildWall(o, out); yield; add(out.B, name); yield; }
    // nền: lưới dày ở gần vách sau, thưa dần về phía máy
    const zs = [];
    for (let z = ZB - 22; z < 230; z += z < 10 ? 0.8 : z < 90 ? 1.2 : 2.2) zs.push(z);
    const xs = [];
    for (let x = -58; x <= 64; x += 1.0) xs.push(x);
    const NX = xs.length, NZ = zs.length;
    const H = new Float32Array(NX * NZ);
    for (let j = 0; j < NZ; j++) { for (let i = 0; i < NX; i++) H[j * NX + i] = floorH(xs[i], zs[j]); if ((j & 7) === 7) yield; }
    const FB = Buf(NX * NZ);
    for (let j = 0; j < NZ; j++) {
      for (let i = 0; i < NX; i++) {
        const h = H[j * NX + i];
        const hx0 = H[j * NX + Math.max(0, i - 1)], hx1 = H[j * NX + Math.min(NX - 1, i + 1)];
        const hz0 = H[Math.max(0, j - 1) * NX + i], hz1 = H[Math.min(NZ - 1, j + 1) * NX + i];
        const dx = xs[Math.min(NX - 1, i + 1)] - xs[Math.max(0, i - 1)], dz = zs[Math.min(NZ - 1, j + 1)] - zs[Math.max(0, j - 1)];
        let nx = -(hx1 - hx0) / dx, nz = -(hz1 - hz0) / dz;
        const nl = Math.hypot(nx, 1, nz); nx /= nl; nz /= nl;
        FB.p.push(xs[i], h, zs[j]); FB.n.push(nx, 1 / nl, nz); FB.k.push(2, 0, 0, 0.5); FB.q.push(0, 0, 0, 0);
      }
      if ((j & 15) === 15) yield;
    }
    for (let j = 0; j < NZ - 1; j++) { for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1; FB.idx.push(a, c, b, b, c, d); } if ((j & 31) === 31) yield; }
    yield;
    add(FB, 'nen-mo');
    yield;
    // mặt nước
    const WB = Buf();
    for (const [x, z] of [[-26, ZB - 6], [30, ZB - 6], [30, 2], [-26, 2]]) { WB.p.push(x, 0.0, z); WB.n.push(0, 1, 0); WB.k.push(4, 0, 0, 0); WB.q.push(0, 0, 0, 0); }
    WB.idx.push(0, 3, 1, 1, 3, 2);
    add(WB, 'vung-nuoc');
    yield;
    // tảng đá tách: dưới chân vách sau (có tảng đứng trong vũng nước) và dọc chân hai vách bên
    const BL = [
      [-10, -34, 5.2, 3.0, 3.4, 0.18], [10.8, -33, 4.4, 2.6, 3.0, -0.25], [-3.2, -21.5, 3.4, 1.8, 2.6, 0.5], [7.2, -12, 3.8, 2.4, 2.8, 0.12],
      [-21.5, 12, 3.0, 2.0, 2.4, -0.35], [-21.5, 36, 4.2, 2.6, 3.0, 0.2], [-21, 66, 2.6, 1.7, 2.2, 0.6], [-22, 96, 3.6, 2.2, 2.8, -0.1],
      [15, 18, 3.2, 2.0, 2.5, 0.3], [17.5, 52, 4.6, 2.8, 3.2, -0.2], [19, 92, 2.8, 1.8, 2.3, 0.1], [-19.5, -27, 2.2, 1.4, 1.8, 0.9], [-12.5, -21, 2.6, 1.6, 2.0, 0.35], [15.5, -24, 3.0, 1.9, 2.4, 0.7],
    ];
    const R = rngF(77);
    for (let i = 0; i < 26; i++) {
      const side = R() < 0.5 ? -1 : 1, z = ZB + 4 + R() * 150;
      const x = side < 0 ? xL(z) + 2.5 + R() * 4.5 : xR(z) - 2.5 - R() * 4.5;
      const s = 0.5 + R() * 0.9;
      BL.push([x, z, s * (1.2 + R()), s * (0.7 + R() * 0.5), s * (1 + R() * 0.6), R() * 3]);
    }
    const BB = Buf(), M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let nb = 0;
    for (const [x, z, w, h, d, ry] of BL) {
      if ((++nb & 7) === 0) yield;
      const y0 = floorH(x, z);
      e.set((R() - 0.5) * 0.06, ry, (R() - 0.5) * 0.06);
      q.setFromEuler(e);
      M.compose(new THREE.Vector3(x, Math.max(y0, -0.6) + h / 2 - 0.22, z), q, new THREE.Vector3(1, 1, 1));
      chamferBox(BB, w / 2, h / 2, d / 2, Math.min(0.12, h * 0.06), M, R());
    }
    st.blocks = BL.length;
    st.blockList = BL.map((b) => [b[0], b[1], b[2], b[3], b[4]]);
    add(BB, 'tang-da');
    yield;
    // cây trên mép: một dải 3–32 m sau mép vách (chỉ dải này nhô được lên khỏi mép khi nhìn từ đáy hẻm)
    const TR = rngF(21), protos = [cedarProto(9), cedarProto(13), cedarProto(17)];
    const list = [];
    for (let i = 0; i < 420; i++) {
      const band = 3 + Math.pow(TR(), 1.4) * 29, which = TR();
      let x, z;
      if (which < 0.42) { x = -85 + TR() * 170; z = ZB - WTOP - band; }
      else if (which < 0.71) { z = ZB - 70 + TR() * 280; x = xL(z) - WTOP - band; }
      else { z = ZB - 70 + TR() * 280; x = xR(z) + WTOP + band; }
      const h = 12 + TR() * 12;
      list.push([x, TOP + (band > 7 ? 0.4 + (band - 7) * 0.075 : band * 0.057) - 1.0, z, h, h * (0.26 + TR() * 0.08), TR(), TR() * 6.28]);
    }
    const Mt = new THREE.Matrix4(), vp = new THREE.Vector3(), vn3 = new THREE.Vector3(), Nm = new THREE.Matrix3();
    for (let c = 0; c < 3; c++) {
      const TB = Buf(Math.ceil(list.length / 3) * protos[0].attributes.position.count);
      let nIn = 0;
      for (let i = c; i < list.length; i += 3) {
        if ((++nIn % 12) === 0) yield;
        const [x, y, z, h, w, tone, rot] = list[i];
        const g = protos[i % 3];
        e.set(0, rot, 0); q.setFromEuler(e);
        Mt.compose(vp.set(x, y, z), q, new THREE.Vector3(w, h, w));
        Nm.getNormalMatrix(Mt);
        const P = g.attributes.position, Nn = g.attributes.normal, base = TB.p.length / 3;
        for (let k = 0; k < P.count; k++) {
          vp.fromBufferAttribute(P, k); const fy = vp.y; vp.applyMatrix4(Mt);
          vn3.fromBufferAttribute(Nn, k).applyMatrix3(Nm).normalize();
          TB.p.push(vp.x, vp.y, vp.z); TB.n.push(vn3.x, vn3.y, vn3.z); TB.k.push(5, fy, 0, tone); TB.q.push(0, 0, 0, 0);
        }
        const I = g.index.array;
        for (let k = 0; k < I.length; k++) TB.idx.push(base + I[k]);
      }
      yield;
      add(TB, 'cay-mep-' + c);
      st.trees += Math.ceil((list.length - c) / 3);
      yield;
    }
    for (const g of protos) g.dispose();
    st.buildMs = Math.round(performance.now() - t0);
    st.built = true;
  }

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  // PHẦN 5 — BAY RA KHỎI MỎ (chuyển cảnh 3, liền máy): cộng THÊM vào tư thế cuối chương một cú bay lên dọc nét cọ về phía
  // mép vách (nơi hàng tuyết tùng đứng), vào sương. ex = 0 → không cộng gì (chương y như cũ); ex tăng từ 0 với đạo hàm 0
  // (e², e^2,4) nên không có cú giật lúc bắt đầu, và máy KHÔNG BAO GIỜ đứng lại giữa chương và lúc bay (chuyển động của chương
  // còn đang chậm dần thì cú bay đã bắt đầu nhanh dần).
  const exitOff = (ex, out, k) => { const g1 = ex * ex, g2 = Math.pow(ex, 2.4); return out.set(k[0] * g1, k[1] * g2, k[2] * g1); };
  const EXP = [1.6, 24, -9], EXT = [1.0, 34, -10];
  function place(tau, dt, ex = 0) {
    camera.position.set(kfs(CAM.x, tau), kfs(CAM.y, tau), kfs(CAM.z, tau));
    if (ex > 0) camera.position.add(exitOff(ex, tmpA, EXP));
    camera.up.set(0, 1, 0);
    tmpB.set(kfs(CAM.tx, tau), kfs(CAM.ty, tau), kfs(CAM.tz, tau));
    if (ex > 0) tmpB.add(exitOff(ex, tmpA, EXT));
    camera.lookAt(tmpB);
    camera.rotateZ(kfs(CAM.roll, tau));
    // (30/9, Mike: "tilt màn hình chỉ ở trang home thôi, còn ở các section thì bỏ tilt hết") — BỎ máy lượn theo chuột ở chương
    // này (trước: ±1,45° quanh một điểm cách 10 đv, lăn theo hiệu hai lớp làm mượt). Máy chỉ đi theo đường của chương; nhịp
    // thở lúc nghỉ vẫn do app.js cộng vào.
    camera.updateMatrixWorld();
  }
  // ngọn cọ theo cuộn: đầu nét (m) · đoạn đã vẽ theo độ cao · đoạn thẳng cho quầng sương · tiến độ đục từng lỗ nêm
  const headAt = (tau) => { const u = Math.min(1, Math.max(0, (tau - HEAD[0]) / (HEAD[1] - HEAD[0]))); return ST.L * (0.55 * (1 - Math.pow(1 - u, 1.8)) + 0.45 * kfEase(u)); };
  function strokes(tau) {
    const h = headAt(tau);
    U.uS.value.w = h <= 0 ? 0 : h >= ST.L ? ST.L + ST.w * 2 : h;
    const yTop = yOfS(ST.s0), yHead = yOfS(ST.s0 + Math.min(h, ST.L));
    U.uLit.value.set(yTop, yHead);
    strokePos(yTop, U.uAirA.value, 1.2);
    strokePos(yHead, U.uAirB.value, 1.2);
    // bốn lỗ mới đục TỪ DƯỚI LÊN (lỗ 3 trước, lỗ 0 sau cùng), nối tiếp đoạn đá đã tách; ba lỗ cũ (4–6) luôn đã có
    let tip = CRK_TIP0;
    for (let i = 0; i < HOLE_OLD; i++) {
      const a = Math.min(1, Math.max(0, (tau - (DOT_T0 + DOT_DT * (HOLE_OLD - 1 - i))) / DOT_LEN));
      U.uD.value[i].w = a;
      // lỗ đục sâu quá nửa thì vết nứt chạy lên qua nó (tới quá mép trên lỗ 0,6 m)
      const k = Math.min(1, Math.max(0, (a - 0.5) / 0.5));
      tip = Math.max(tip, DOTS[i].y - HB + (2 * HB + 0.6) * k * k * (3 - 2 * k));
    }
    U.uCrk.value = Math.min(tip, CRK_END);
  }

  // HÌNH GIẢ cùng kiểu dữ liệu đỉnh (position · normal · aK · aP): dịch shader VÀ VẼ ĐẦU lúc màn chờ (trên Windows lần vẽ
  // đầu của một chương trình mới chặn 50–65 ms — phụ thuộc kiểu dữ liệu đỉnh, không phụ thuộc cỡ hình)
  function warmMeshes() {
    const B = Buf();
    for (const [x, y, z] of [[0, 0, 0], [1, 0, 0], [0, 1, 0]]) { B.p.push(x, y, z); B.n.push(0, 0, 1); B.k.push(0, 0, 0, 0); B.q.push(0, 0, 0, 0); }
    const g = toGeo(B);
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.name = 'gia-mo';
    return [m];
  }

  let time = 0;
  return {
    scene, camera, materials: [mat], st, build, U, warmMeshes,
    update(dt, tau, ex = 0) {
      time += dt;
      U.uTime.value = time;
      strokes(tau);
      place(tau, dt, ex);
    },
    setMouse() { /* 30/9: chương không còn nghiêng theo chuột — giữ hàm để app.js gọi không lỗi */ },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    info() {
      const p = camera.position;
      return { addMs: st.addMs, cam: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)], head: +U.uS.value.w.toFixed(2), len: +ST.L.toFixed(2), dots: U.uD.value.map((v) => +v.w.toFixed(2)), verts: st.verts, tris: st.tris, trees: st.trees, blocks: st.blocks, meshes: st.meshes, buildMs: st.buildMs };
    },
    // bài kiểm: vị trí máy theo τ (không chuột) — soi máy có đi xuyên tảng đá / vách không
    camAt(tau, ex = 0) { const o = exitOff(ex, new THREE.Vector3(), EXP); return [kfs(CAM.x, tau) + o.x, kfs(CAM.y, tau) + o.y, kfs(CAM.z, tau) + o.z]; },
    blockList() { return st.blockList || null; },
    geom: { floorH, xL, xR, wFace, TOP, WTOP },
  };
}
