// PHẦN 3 (25/9) — hai lượt hậu kỳ mới của Kōzō, theo cách hubtown dựng chuyển cảnh (docs/research/hubtown-ref/
// hubtown-toan-trang.md mục 3.2 và 5.6), nhưng đổi hình: không hình thoi, không ô vuông lập loè, không nhoè cầu vồng.
//
// 1. ChuyenEffect — CHUYỂN CẢNH BẰNG MỰC LOANG. Cảnh mới (thung lũng đêm, vẽ sẵn vào một ảnh riêng) hiện ra như một
//    GIỌT MỰC LOANG TRONG NƯỚC nở từ giữa màn: mép loang có quầng mực 緑青 sẫm, sợi xơ chạy ra ngoài như mực thấm theo
//    thớ giấy dó, môi mực ướt bắt sáng rất mảnh. Chạy THEO CUỘN (uP là hàm thuần của vị trí cuộn): đứng tay thì hình
//    đứng yên, không có gì tự nhấp nháy (không dùng thời gian). Hai cảnh lệch dọc ngược chiều nhau tối đa uDisp màn,
//    mạnh nhất ở vùng mép loang và giữa quãng chuyển. uMode 1 (người xem chọn giảm chuyển động): tan nhẹ, không loang.
// 2. KhungEffect — LỚP TỐI SAU VÙNG CHỮ (vẽ SAU loá sáng: quầng của nét sáng không tràn được vào chỗ chữ đứng) + màn mờ
//    sau cột chương bên trái + viền tối. Tắt hẳn ở màn đầu (ban ngày) — màn đầu giữ nguyên từng điểm ảnh.
import { Effect, BlendFunction, EffectAttribute } from 'postprocessing';
import { Uniform, Color, Matrix3, Vector2, Vector3, Vector4 } from 'three';

const NOISE = /* glsl */`
float cH(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float cN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(cH(i), cH(i + vec2(1.0, 0.0)), f.x), mix(cH(i + vec2(0.0, 1.0)), cH(i + vec2(1.0, 1.0)), f.x), f.y); }
uniform int uOct;
float cF(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < uOct; i++) { s += a * cN(p); p = p * 2.03 + 7.1; a *= 0.5; } return s / (1.0 - pow(0.5, float(uOct))); }
`;

export class ChuyenEffect extends Effect {
  constructor() {
    super('ChuyenEffect', NOISE + /* glsl */`
uniform sampler2D tValley;
uniform float uP, uMode, uDisp, uR, uSwap, uSoft;
uniform vec3 uInkA, uInkB, uLip;
// uSwap = 1 (phần 7, nhảy về màn đầu): cảnh CŨ là ảnh chụp trong tValley, cảnh MỚI là chuỗi đang vẽ — mực thấm mở ra toà thành
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uMode > 0.5) {
    // giảm chuyển động: tan nhẹ, không loang, không lệch
    vec3 cT = texture2D(tValley, uv).rgb;
    vec3 cO = uSwap > 0.5 ? cT : inputColor.rgb, cV = uSwap > 0.5 ? inputColor.rgb : cT;
    float k = uP * uP * (3.0 - 2.0 * uP);
    outputColor = vec4(mix(cO, cV, k), inputColor.a);
    return;
  }
  vec2 q = (uv - 0.5) * vec2(aspect, 1.0);     // toạ độ vuông, cao màn = 1
  float R = uR;
  // MỰC THẤM (Sếp 28/9: "mực loang trong nước có mép rách, tua ra nhiều nhánh, đậm ở lõi và nhạt dần theo thớ giấy; mép
  // không có quầng phát sáng; cảnh cũ thấm tối dần theo mép"). Không có gì phụ thuộc thời gian: đứng tay là đứng hình.
  //   · MẬT ĐỘ MỰC ρ: một đám nở từ giữa màn, dáng thuỳ + cuộn xoáy (nắn toạ độ bằng nhiễu)
  //   · TUA MỰC: nhiễu "sống núi" (1 − |2n − 1|, nâng mũ) theo hướng toả ra → những sợi mảnh phân nhánh vươn TRƯỚC mép
  //   · THỚ GIẤY: nhiễu dị hướng rất mảnh chạy dọc hướng toả ra, làm mực đậm nhạt từng sợi ở vùng mép
  //   · cảnh cũ: bị mực phủ tối (không phải một hình tròn dán lên) · cảnh mới: hiện ra ở LÕI, nơi mực đã thấm đều
  vec2 w1 = vec2(cF(q * 1.6 + vec2(3.7, 1.1)), cF(q * 1.6 + vec2(8.3, 5.9))) - 0.5;
  vec2 qw = q + w1 * (0.16 + 0.26 * min(R, 1.3));
  float r = length(qw);
  vec2 dir = qw / max(r, 1e-4);
  float lobe = cN(dir * 1.2 + vec2(3.1, 7.7)) * 0.65 + cN(dir * 2.5 + vec2(1.3, 4.2)) * 0.35;
  // (nhảy xa: thuỳ theo nhiễu 2D chứ không theo góc — theo góc thì giữa đám mực thành hình chong chóng)
  lobe = mix(lobe, cF(qw * 1.3 + vec2(2.0, 5.0)), uSoft);
  float front = R * (0.72 + 0.56 * lobe) - r;          // > 0: trong đám mực
  // tua mực phân nhánh, vươn trước mép một quãng tỉ lệ với cỡ đám mực
  // (hướng của tua bị bẻ cong theo bán kính → tua uốn như mực chảy trong nước, không thẳng như gai)
  vec2 cd = normalize(dir + 0.55 * vec2(cN(qw * 3.1 + 5.0), cN(qw * 3.1 + 9.0)) - 0.275);
  float n1 = cN(cd * 11.0 + vec2(r * 2.2, 1.7)), n2 = cN(cd * 26.0 - vec2(r * 3.3, 4.1));
  float t1 = 1.0 - abs(2.0 * n1 - 1.0), t2 = 1.0 - abs(2.0 * n2 - 1.0);
  t1 = t1 * t1 * t1; t2 = t2 * t2 * t2 * t2 * t2;
  float reach = (0.12 * t1 + 0.08 * t2) * (0.25 + 0.75 * min(R, 1.2)) * (1.0 - uSoft);
  // nhảy xa (uSoft = 1): mép loang MỀM kiểu mây — cuộn mây nhiều tầng thay cho tua gai
  front += uSoft * (0.16 * (cF(qw * 2.3 + vec2(1.7, 3.3)) - 0.5) + 0.07 * (cF(qw * 5.1 + vec2(4.2, 0.6)) - 0.5)) * min(R * 1.6, 1.0);
  float d = front + reach;
  // thớ giấy: sợi mảnh dọc hướng toả ra
  float fib = mix(cN(dir * 140.0 + vec2(r * 6.0, 0.0)) * 0.55 + cN(dir * 55.0 + vec2(r * 2.5, 9.0)) * 0.45, 0.6, uSoft);
  float aa = max(fwidth(d), 0.0012);
  // mật độ mực: lên từ 0 ở đầu tua tới đặc ở lõi; vùng mép đậm nhạt theo thớ giấy
  float ink = smoothstep(-aa - 0.08 * uSoft, 0.10 + 0.08 * R + 0.12 * uSoft, d);
  ink *= mix(0.55 + 0.45 * smoothstep(0.25, 0.75, fib), 1.0, smoothstep(0.05, 0.22, d));
  // cảnh cũ thấm tối dần theo mép (bóng mực loang mờ ra ngoài, không có viền sáng)
  float seep = exp(-max(-d, 0.0) / (0.05 + 0.10 * R)) * smoothstep(-0.75, -0.35, d) * (1.0 - smoothstep(-aa, 0.02, d)) * (0.5 + 0.5 * fib);
  // cảnh mới hiện ở lõi, nơi mực đã thấm đều (trễ sau mép một quãng)
  float core = smoothstep(0.06 + 0.04 * R, 0.30 + 0.18 * R, front);
  // HAI CẢNH LỆCH DỌC ngược chiều quanh mép (tối đa uDisp màn giữa quãng), tắt dần sát mép trên / dưới màn
  float sw = sin(3.14159265 * clamp(uP, 0.0, 1.0));
  float dd = (1.0 - uSoft) * uDisp * sw * exp(-abs(front) / 0.2) * smoothstep(0.7, 0.35, abs(front)) * smoothstep(0.0, 0.12, uv.y) * smoothstep(1.0, 0.88, uv.y);
  vec3 cC, cV;
  if (uSwap > 0.5) { cC = texture2D(tValley, uv - vec2(0.0, dd)).rgb; cV = texture2D(inputBuffer, uv + vec2(0.0, dd * 0.8)).rgb; }
  else { cC = texture2D(inputBuffer, uv - vec2(0.0, dd)).rgb; cV = texture2D(tValley, uv + vec2(0.0, dd * 0.8)).rgb; }
  vec3 INK = uInkA * 0.22;                                // mực gần đen ánh lục (nấc 900, tối hẳn)
  vec3 old = cC * (1.0 - 0.45 * seep);
  old = mix(old, INK, clamp(ink * 0.95, 0.0, 1.0));
  // trong lõi: cảnh mới hiện dần từ mực; gần hết quãng thì mực tan hẳn (p = 1 trùng khít cảnh mới)
  vec3 neu = mix(cV, INK, (1.0 - core) * 0.6);
  vec3 c = mix(old, neu, core);
  c = mix(c, cV, smoothstep(0.88, 1.0, uP));
  outputColor = vec4(c, inputColor.a);
}`, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([
        ['tValley', new Uniform(null)],
        ['uP', new Uniform(0)],
        ['uR', new Uniform(0)],
        ['uMode', new Uniform(0)],
        ['uSwap', new Uniform(0)],
        ['uSoft', new Uniform(0)],
        ['uDisp', new Uniform(0.08)],
        ['uOct', new Uniform(3)],
        // 緑青: lòng quầng mực nấc 900 / 700, môi ướt nấc 300 (Color(hex) = tuyến tính)
        ['uInkA', new Uniform(new Color('#19342C'))],
        ['uInkB', new Uniform(new Color('#236050'))],
        ['uLip', new Uniform(new Color('#8BC8B3'))],
      ]),
    });
  }
  // tiến độ 0…1 → bán kính giọt mực (cao màn = 1). Chậm lúc đầu (giọt mực vừa rơi), nở nhanh dần, phủ kín màn trước p ≈ 0,92
  setProgress(p, aspect) {
    const U = this.uniforms;
    U.get('uP').value = p;
    const rMax = Math.hypot(aspect / 2, 0.5);
    U.get('uR').value = ((rMax + 0.45) / 0.72) * Math.pow(Math.min(1, p / 0.9), 1.25);
  }
}

// PHẦN 4 (28/9) — CHUYỂN CẢNH RUỘNG → MỎ ĐÁ bằng MỘT NÉT CHỔI CỌ LỚN 刷毛 QUÉT NGANG MÀN (khác hẳn giọt mực thấm của lần
// chuyển trước): ngọn chổi đi từ ngoài mép trái sang quá mép phải, hơi chếch lên, lòng nét hơi võng như tay kéo; mỏ đá hiện ra
// TRONG LÒNG NÉT QUÉT. Ngay sau ngọn chổi là mực ướt (tối), cảnh mới thấm ra sau đó một quãng; hai mép nét rách theo sợi
// lông chổi, có XƠ KHÔ 掠れ (khe hở song song dọc nét — nhiều ở mép và ở cuối nét, chổi cạn dần) và vành mực dồn 墨だまり.
// Nửa sau quãng, mực LOANG 滲み theo thớ giấy ra hai phía trên / dưới cho tới kín màn. Hàm thuần của vị trí cuộn: đứng tay
// là đứng hình, không nháy, không ô vuông, không nhoè cầu vồng. uMode 1 (giảm chuyển động): tan nhẹ.
export class QuetEffect extends Effect {
  constructor() {
    super('QuetEffect', /* glsl */`
float qH(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float qN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(qH(i), qH(i + vec2(1.0, 0.0)), f.x), mix(qH(i + vec2(0.0, 1.0)), qH(i + vec2(1.0, 1.0)), f.x), f.y); }
uniform sampler2D tNew;
uniform float uP, uMode, uDisp;
uniform vec3 uInk;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (uMode > 0.5) {
    vec3 cV = texture2D(tNew, uv).rgb;
    float k = uP * uP * (3.0 - 2.0 * uP);
    outputColor = vec4(mix(inputColor.rgb, cV, k), inputColor.a);
    return;
  }
  vec2 q = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  // hệ toạ độ của nét: dọc nét nghiêng lên phải ~6°; lòng nét võng nhẹ như cánh tay kéo chổi
  const float ca = 0.99452, sa = 0.10453;
  vec2 r = vec2(q.x * ca + q.y * sa, -q.x * sa + q.y * ca);
  float A = 0.5 * aspect + 0.30;
  float yy = r.y - 0.035 * sin(r.x * 1.6 + 0.6);
  // ngọn chổi: 62% đầu quãng, chạm xuống chậm rồi đi đều
  float ph = clamp(uP / 0.62, 0.0, 1.0);
  float head = -A + (2.0 * A + 0.12) * mix(ph, ph * ph * (3.0 - 2.0 * ph), 0.45);
  // bề ngang nét (nửa, cao màn = 1): chổi to ~60% màn; nửa sau quãng mực loang ra hai phía cho tới kín màn
  float grow = smoothstep(0.40, 0.97, uP);
  float press = 0.92 + 0.10 * qN(vec2(r.x * 1.3, 2.0));
  float Hb = 0.30 * press + grow * (0.64 + 0.10 * (qN(vec2(r.x * 1.1, sign(yy) * 3.0)) - 0.5));
  float n1 = qN(vec2(r.x * 2.2, yy * 38.0));                 // mép rách theo sợi lông chổi (dài dọc nét)
  // xơ khô: vệt NGẮN, đứt quãng (không chạy suốt màn — chạy suốt thì thành vạch quét như nhiễu kỹ thuật)
  float n2 = qN(vec2(r.x * 3.4 + 7.0, yy * 72.0)) * 0.7 + qN(vec2(r.x * 7.0 - 3.0, yy * 150.0)) * 0.3;
  float n3 = qN(vec2(r.x * 26.0, yy * 3.0 + 3.0));           // thớ giấy (lúc mực loang ra)
  float dEdge = Hb + 0.030 * (n1 - 0.5) + 0.020 * (n3 - 0.5) * grow - abs(yy);          // > 0: trong lòng nét
  float fr = head - r.x - 0.05 * pow(abs(yy) / max(Hb, 0.05), 2.0) - 0.022 * (qN(vec2(yy * 60.0, 1.0)) - 0.5);   // > 0: chổi đã qua
  float aa = max(fwidth(dEdge), 0.0015), af = max(fwidth(fr), 0.0015);
  float inBand = smoothstep(-aa, aa, dEdge) * smoothstep(-af, af, fr);
  float along = clamp((r.x + A) / (2.0 * A), 0.0, 1.0);
  // lòng nét ĐẶC; khô ở hai mép ngoài và ở cuối nét (chổi cạn dần)
  float edgeK = smoothstep(0.66, 1.0, abs(yy) / max(Hb, 0.05));
  float dry = (0.02 + 0.62 * edgeK + 0.30 * along * along * edgeK + 0.12 * along * along) * (1.0 - grow);
  float fill = smoothstep(dry - 0.08, dry + 0.08, n2);
  float dev = smoothstep(0.02, 0.20, fr);                     // mực ướt sau ngọn chổi → cảnh mới thấm ra
  float rim = (1.0 - smoothstep(0.0, 0.035 + 0.02 * grow, dEdge)) * inBand;
  float sw = sin(3.14159265 * clamp(uP, 0.0, 1.0));
  float dd = uDisp * sw * exp(-abs(fr) / 0.10) * smoothstep(-0.02, 0.1, dEdge + 0.05);
  vec3 cOld = texture2D(inputBuffer, uv - vec2(dd, 0.0)).rgb;
  vec3 cNew = texture2D(tNew, uv + vec2(dd * 0.7, 0.0)).rgb;
  float seep = exp(-max(-dEdge, 0.0) / 0.05) * (1.0 - inBand) * smoothstep(-0.04, 0.02, fr + 0.04) * 0.45;
  vec3 old = cOld * (1.0 - seep);
  vec3 neu = mix(cNew, uInk, max(rim * 0.9, (1.0 - dev) * 0.92));
  vec3 c = mix(old, neu, inBand * fill);
  c = mix(c, mix(cOld, uInk, 0.45), inBand * (1.0 - fill));
  c = mix(c, cNew, smoothstep(0.92, 1.0, uP));
  outputColor = vec4(c, inputColor.a);
}`, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([
        ['tNew', new Uniform(null)],
        ['uP', new Uniform(0)],
        ['uMode', new Uniform(0)],
        ['uDisp', new Uniform(0.018)],
        // mực gần đen ánh lục (nấc 900 × 0,22, tuyến tính) — cùng màu mực của lần chuyển trước
        ['uInk', new Uniform(new Color('#19342C').multiplyScalar(0.22))],
      ]),
    });
  }
  setProgress(p) { this.uniforms.get('uP').value = p; }
}

// PHẦN 5 (28/9) — CHUYỂN CẢNH MỎ ĐÁ → RỪNG: MÁY QUAY BAY LIỀN, NỐI HAI CẢNH BẰNG SƯƠNG DÀY (kiểu thứ ba — khác giọt mực thấm và
// nét chổi quét: KHÔNG có hình mực nào trên màn; hubtown chương 3 → 4 nối hai cảnh bằng làn khói tối). Máy bay ngửa lên dọc nét
// cọ ra khỏi mỏ (quarry.js), bay vào sương; sương dày tới mức phủ kín → đổi cảnh ngay giữa đám sương (hai bên đỉnh sương giống
// hệt nhau nên không thấy chỗ nối) → sương tan dần, rừng tuyết tùng hiện ra từ gần tới xa.
//   · SƯƠNG THEO ĐỘ SÂU của chính cảnh đang vẽ (đọc ảnh độ sâu): vật xa chìm trước, vật gần còn lại lâu nhất — có khối, không
//     phải một lớp tan phẳng;
//   · BA LỚP LỌN SƯƠNG ở 5 · 11 · 24 m trước máy: mỗi lớp chỉ che vật đứng SAU nó (vật gần hơn lớp thì vẫn rõ), trôi theo đúng
//     chuyển động của máy (máy lên → lọn sương trôi xuống, lớp gần trôi nhanh hơn lớp xa; máy tiến → lọn nở ra từ giữa màn);
//   · hàm thuần của vị trí cuộn (uK, uFlow) cộng làn gió rất chậm theo thời gian — đứng tay thì sương chỉ trôi lững lờ, không nháy.
export class BayEffect extends Effect {
  constructor() {
    super('BayEffect', /* glsl */`
float bH(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float bN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(bH(i), bH(i + vec2(1.0, 0.0)), f.x), mix(bH(i + vec2(0.0, 1.0)), bH(i + vec2(1.0, 1.0)), f.x), f.y); }
float bW(vec2 p) { return bN(p) * 0.55 + bN(p * 2.07 + 5.3) * 0.3 + bN(p * 4.3 + 1.7) * 0.15; }
uniform float uK, uTanH, uWind;
uniform vec2 uFlow;     // x: độ cao ảo của máy (m), y: quãng tiến (m) — liền mạch qua chỗ đổi cảnh
uniform vec3 uFogC, uFogB;
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  float z = min(-getViewZ(depth), 900.0);
  vec2 q = (uv - 0.5) * vec2(aspect, 1.0);
  // sương theo độ sâu: dày dần theo uK (bình phương — lúc đầu chỉ vật xa mờ đi)
  float dens = 0.085 * uK * uK;
  float a = 1.0 - exp(-z * dens);
  // BA LỚP ĐÁM MÂY SƯƠNG ở 5 · 11 · 24 m: mỗi lớp là những đám có hình (lõi đặc, mép loang), che vật đứng sau nó, trôi theo máy
  // chỉ ĐÚNG đỉnh sương mới phủ kín (vài khung) — ở đỉnh, hình sương KHÔNG phụ thuộc cảnh (độ sâu) → hai cảnh giống hệt nhau,
  // đổi cảnh không lộ
  float cover = smoothstep(0.90, 0.998, uK);
  float T = 1.0;
  vec3 cloud = vec3(0.0); float cw = 0.0;
  for (int i = 0; i < 3; i++) {
    float d = i == 0 ? 5.0 : (i == 1 ? 11.0 : 24.0);
    float zoom = exp(uFlow.y / (d * 2.2));
    // máy đang bay lên nhanh: đám sương kéo dài theo chiều dọc
    vec2 p = q / zoom * vec2(1.0, 0.72) + vec2(uWind * (0.4 + 0.3 * float(i)), uFlow.x / (2.0 * uTanH * d) * 0.72);
    float n = bW(p * (2.1 + 0.9 * float(i)) + float(i) * 7.31);
    float body = smoothstep(0.50 - 0.20 * uK, 0.78 - 0.14 * uK, n);          // hình đám mây
    float k = body * smoothstep(0.0, 0.3, uK) * (0.95 - 0.2 * float(i));
    k *= mix(smoothstep(d - 3.0, d + 3.0, z), 1.0, cover);          // lớp chỉ che vật đứng sau nó
    // lõi đám sáng (ánh trăng tán trong sương), mép đám tối hơn
    vec3 cc = mix(uFogC * 1.05, uFogB * 1.2, smoothstep(0.46, 0.80, n) * (1.0 - 0.25 * float(i)));
    cloud += cc * k * T; cw += k * T;
    T *= 1.0 - k * 0.9;
  }
  // nền sương giữa các đám (tối hơn đám một chút) — vật đã chìm hẳn thì chìm vào nền này
  float nn = bW(q * 0.8 + vec2(uWind * 0.3, uFlow.x / (2.0 * uTanH * 16.0) * 0.72) + 3.3);
  vec3 fc = mix(uFogC * 0.85, uFogC * 1.2, smoothstep(0.3, 0.8, nn));
  // phía trên màn tối dần (trời đêm, trần tán rừng) — vật xa chìm vào sương nhưng trời không hoá mảng sáng
  float topD = mix(1.0, 0.5, smoothstep(0.5, 1.0, uv.y) * (1.0 - smoothstep(0.75, 1.0, uK)));
  vec3 c = mix(inputColor.rgb, fc * topD, clamp(a, 0.0, 1.0));
  // các đám sương đè lên trên (đám gần che đám xa)
  c = mix(c, cloud / max(cw, 1e-4) * topD, clamp(1.0 - T, 0.0, 1.0));
  vec3 peak = mix(fc, cloud / max(cw, 1e-4), clamp(1.0 - T, 0.0, 1.0)) * topD;
  outputColor = vec4(mix(c, peak, cover), inputColor.a);
}`, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map([
        ['uK', new Uniform(0)],
        ['uTanH', new Uniform(Math.tan((46 * Math.PI) / 360))],
        ['uWind', new Uniform(0)],
        ['uFlow', new Uniform(new Vector2(0, 0))],
        // sương đêm ánh trăng (tuyến tính): lòng sương xám lục · lọn sáng bạc
        ['uFogC', new Uniform(new Color('#2a3431'))],
        ['uFogB', new Uniform(new Color('#5d6b66'))],
      ]),
    });
  }
}

// LÀM NÉT THÍCH ỨNG TƯƠNG PHẢN (kiểu AMD FidelityFX CAS, bản 5 điểm) — Mike 28/9: "web đang không được nét lắm". Lượt cuối
// chuỗi, sau khử răng cưa. Mỗi điểm ảnh đẩy nhẹ ra xa trung bình bốn điểm kề; độ đẩy TỰ GIẢM ở chỗ đã tương phản cao (mép
// ngói đen trên trời sáng) → không sinh viền trắng quanh mép; chỗ phẳng (trời, sương) gần như không đổi. uSharp 0…1.
export class CasEffect extends Effect {
  constructor(sharp = 0.4) {
    super('CasEffect', /* glsl */`
uniform float uSharp, uClampK;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 e = inputColor.rgb;
  vec3 b = texture2D(inputBuffer, uv + vec2(0.0, texelSize.y)).rgb;
  vec3 d = texture2D(inputBuffer, uv - vec2(texelSize.x, 0.0)).rgb;
  vec3 f = texture2D(inputBuffer, uv + vec2(texelSize.x, 0.0)).rgb;
  vec3 h = texture2D(inputBuffer, uv - vec2(0.0, texelSize.y)).rgb;
  vec3 mn = min(min(min(b, d), min(f, h)), e);
  vec3 mx = max(max(max(b, d), max(f, h)), e);
  vec3 amp = sqrt(clamp(min(mn, 1.0 - mx) / max(mx, vec3(1e-4)), 0.0, 1.0));
  vec3 w = -amp / mix(8.0, 5.0, uSharp);
  vec3 c = ((b + d + f + h) * w + e) / (1.0 + 4.0 * w);
  // kẹp trong khoảng tối nhất – sáng nhất của 5 điểm (như CAS gốc): không kẹp thì điểm tối giữa các điểm sáng hơn bị đẩy xuống dưới 0
  // → chấm đen đơn lẻ trên nền tối có hạt (đo 29/9, đất trước cửa chương 皮: 1 016 chấm → 0)
  // uClampK = 1 ở cả trang (Sếp 29/9: mép sắc chỉ đổi 2–4% điểm ảnh > 3 mức, mắt không thấy; chấm đen là lỗi thật); 0 = cách cũ
  outputColor = vec4(mix(clamp(c, 0.0, 1.0), clamp(c, mn, mx), uClampK), inputColor.a);
}`, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map([['uSharp', new Uniform(sharp)], ['uClampK', new Uniform(1)]]),
    });
  }
}

// SƯƠNG THUNG LŨNG sau chữ màn đầu — CHỈ KHỔ DỌC (Mike 28/9: "ở điện thoại chữ bên dưới đang không đọc được": khối chữ dưới
// nằm trên hàng tuyết tùng sẫm). Ngược với lớp tối ban đêm của hubtown (mục 5.6): ban ngày thì một làn sương SÁNG dâng lên ở
// vùng chữ — vẽ TRONG ẢNH CẢNH, trước bước nắn màu (màu sương = màu sương của chính cảnh, nên sau nắn màu nó là sương thật),
// mép trên tan mềm theo lọn sương. Toà thành trên biển mây: sương dưới chân thành là đúng chuyện. uK = 0 → lượt này tắt.
export class SuongEffect extends Effect {
  constructor() {
    super('SuongEffect', /* glsl */`
float sH(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float sN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(sH(i), sH(i + vec2(1.0, 0.0)), f.x), mix(sH(i + vec2(0.0, 1.0)), sH(i + vec2(1.0, 1.0)), f.x), f.y); }
uniform float uK, uTop, uFade;
uniform vec3 uMistC;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 q = vec2(uv.x * aspect, uv.y);
  // mép trên lượn theo lọn sương (tĩnh — không lập loè), đặc dần xuống dưới
  float w = 0.05 * (sN(vec2(q.x * 2.6, 1.3)) - 0.5) + 0.025 * (sN(vec2(q.x * 7.0, 4.1)) - 0.5);
  float top = uTop + w;
  float m = 1.0 - smoothstep(top - uFade * 0.25, top + uFade, uv.y);
  // lòng sương hơi loang (không phải mảng phẳng)
  m *= 0.9 + 0.1 * sN(q * vec2(5.0, 9.0));
  outputColor = vec4(mix(inputColor.rgb, uMistC, clamp(m * uK, 0.0, 1.0)), inputColor.a);
}`, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uK', new Uniform(0)], ['uTop', new Uniform(0.33)], ['uFade', new Uniform(0.13)],
        ['uMistC', new Uniform(new Color(0.8, 0.8, 0.78))],
      ]),
    });
  }
}

export class KhungEffect extends Effect {
  constructor() {
    super('KhungEffect', /* glsl */`
uniform vec3 uFrame;    // vùng tối từ đáy: bắt đầu, hết (toạ độ dọc 0 = đáy), độ đậm
uniform vec3 uFrameC;
uniform float uVig, uSide, uCap;
uniform vec2 uTextW;    // bề ngang vùng chữ (nửa bề rộng, toạ độ màn 0…1) — lớp tối đậm nhất trong vùng này
uniform float uTopK;    // khổ dọc: dải tối mảnh ở mép trên cho logo nhỏ (0 = không có — khổ ngang)
uniform float uSideCap; // chương 皮 (khổ ngang): nén điểm sáng sau cột chương (ván phơi giấy sáng sát máy) — 0 = không có
uniform vec4 uSideR;    // (Mike 30/9) vùng loang sau cột chương: tâm (x, y) + độ loang Gauss (x, y) — toạ độ màn 0…1, app.js đo theo cột thật
uniform vec4 uCard;     // chương 仕事: elip tối RẤT MỀM sau thẻ hình vẽ (tâm, bán trục — toạ độ màn 0…1)
uniform float uCardK;   //   độ đậm (0 = không có thẻ)
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = inputColor.rgb;
  float g = (1.0 - smoothstep(uFrame.x, uFrame.y, uv.y)) * uFrame.z;
  g *= mix(0.72, 1.0, 1.0 - smoothstep(uTextW.x, uTextW.y, abs(uv.x - 0.5)));
  c = mix(c, uFrameC, g);
  // chỗ chữ đứng luôn tối: kẹp cả điểm sáng rực (nét cọ, loá) — không cần tấm lót
  // (kẹp GIỮ SẮC: thu cả màu theo kênh sáng nhất — kẹp từng kênh thì nét cọ xanh sáng hoá thành vệt xám; độ sáng sau chữ
  // vẫn ≤ mức kẹp như cũ nên tương phản chữ không đổi)
  if (uCap > 0.001) { float capV = mix(9.0, 0.22 / max(g, 0.004) - 0.22, uCap); float mx = max(max(c.r, c.g), c.b); if (mx > capV) c *= capV / mx; }
  // (Mike 30/9: "ô đen mờ" sau cột chương ở 皮) lớp tối sau cột chương là một vùng LOANG TRÒN (Gauss — không có mép, không có góc),
  // không còn hình chữ nhật; ở 皮 điểm sáng sau cột được NÉN MỀM (giữ vân tường, không san phẳng thành một tấm) theo cùng vùng loang
  if (uSide > 0.001 || uSideCap > 0.001) {
    vec2 sd = (uv - uSideR.xy) / uSideR.zw;
    float sw = exp(-0.5 * dot(sd, sd));
    c *= 1.0 - uSide * sw;
    if (uSideCap > 0.001) {
      float ms = max(max(c.r, c.g), c.b), capS = 0.05;
      c = mix(c, c * (capS * (1.0 - exp(-ms / capS)) / max(ms, 1e-5)), sw * uSideCap);
    }
  }
  if (uTopK > 0.001) {
    float tb = smoothstep(0.86, 0.95, uv.y) * uTopK;
    c = mix(c, uFrameC, tb * 0.7);
    float mt = max(max(c.r, c.g), c.b), capT = mix(9.0, 0.10, tb);
    if (mt > capT) c *= capT / mt;
  }
  if (uCardK > 0.001) {
    // thẻ không khung, không tấm nền: chỉ một vùng tối mềm như bóng đêm dày lên sau chữ, kẹp cả điểm loá (chữ đọc được ≥ 4,5:1)
    float m = uCardK * (1.0 - smoothstep(0.35, 1.0, length((uv - uCard.xy) / uCard.zw)));
    c *= 1.0 - m;
    float mc = max(max(c.r, c.g), c.b), capC = mix(9.0, 0.16, m);
    if (mc > capC) c *= capC / mc;
  }
  float r = length((uv - 0.5) * vec2(1.25, 1.0));
  c *= 1.0 - uVig * smoothstep(0.3, 0.8, r);
  outputColor = vec4(c, inputColor.a);
}`, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uFrame', new Uniform(new Vector3(0.14, 0.46, 0.0))],
        ['uFrameC', new Uniform(new Color(0x000201))],
        ['uVig', new Uniform(0)],
        ['uSide', new Uniform(0)],
        ['uCap', new Uniform(0)],
        ['uTextW', new Uniform(new Vector2(0.22, 0.5))],
        ['uTopK', new Uniform(0)],
        ['uSideCap', new Uniform(0)],
        ['uSideR', new Uniform(new Vector4(0.07, 0.5, 0.09, 0.19))],
        ['uCard', new Uniform(new Vector4(0.8, 0.5, 0.2, 0.3))],
        ['uCardK', new Uniform(0)],
      ]),
    });
  }
}

// PHẦN 9 (30/9): CHUYỂN CẢNH 6 (仕事 → 連絡) — HAI CẢNH HOÀ THEO CHÍNH NÉT CỌ. Máy 仕事 bay theo đầu cọ ra khỏi bản đồ; trong quãng
// hoà, vùng đất mới (bãi đất trên mỏm đồi, toà thành xa) THẤM RA TỪ NÉT CỌ ẤY — gần nét hiện trước, lan ra hai bên theo thớ giấy,
// mép lan có một viền mực đọng rất nhẹ như màu nước — cho tới kín màn. Khác bốn kiểu trước: không giọt mực nở từ giữa màn (1),
// không chổi quét ngang (2), không sương phủ (3), không cửa / giấy phủ màn (4, 5); không có mặt phẳng trơn nào, không chớp.
// Hàm thuần của tiến độ uP (app.js tính từ vị trí ảo s) → lùi thì chạy ngược đúng hình ấy. tOld: cảnh 仕事 (vẽ vào khung đệm riêng),
// inputBuffer: cảnh 連絡 (chuỗi đang vẽ). uPts: đường nét trên màn (0…1, y lên), uN điểm.
export class DuongEffect extends Effect {
  constructor() {
    super('DuongEffect', NOISE + /* glsl */`
uniform sampler2D tOld;
uniform float uP;
uniform vec2 uPts[16];
uniform int uN;
uniform float uDim;
uniform float uFog, uPre;   // (soát p11a A1) bản đồ 仕事 CHÌM VÀO SƯƠNG ĐÊM trước lúc hoà (uPre = 1: ảnh vào là chính cảnh 仕事 đang vẽ)
uniform vec3 uMistC;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 cOld = uPre > 0.5 ? inputColor.rgb : texture2D(tOld, uv).rgb, cRaw = cOld;
  if (uP >= 1.0 && uPre < 0.5) { outputColor = inputColor; return; }
  vec2 A = vec2(aspect, 1.0), q = uv * A;
  // (soát p10a A2) THẤM DỌC THEO CHÍNH NÉT: điểm gần nhất trên đường nét — khoảng cách d (toạ độ vuông, cao màn = 1) và vị trí t dọc
  // nét (0 = đầu gần máy, ở đáy màn · 1 = đầu cọ). Chưa có nét trên màn thì lan từ đáy giữa màn.
  float d = 9.0, t = 0.0;
  if (uN > 1) {
    float Lt = 0.0;
    for (int i = 0; i < 15; i++) { if (i + 1 >= uN) break; Lt += length((uPts[i + 1] - uPts[i]) * A); }
    float acc = 0.0;
    for (int i = 0; i < 15; i++) {
      if (i + 1 >= uN) break;
      vec2 a = uPts[i] * A, b = uPts[i + 1] * A, ab = b - a;
      float L = length(ab), k = clamp(dot(q - a, ab) / max(L * L, 1e-6), 0.0, 1.0);
      float dd = length(q - a - ab * k);
      if (dd < d) { d = dd; t = (acc + L * k) / max(Lt, 1e-4); }
      acc += L;
    }
  } else d = length(q - vec2(0.5 * aspect, 0.0));
  // sương phủ cảnh cũ, TRỪ chính nét cọ (nét vẫn sáng, mắt đi theo nó): nhà cửa, nhãn, mái nhà cạnh chấm mực đều chìm — lúc hoà chỉ còn
  // nét trên nền sương tối, không vật nào của bản đồ đứng cạnh cảnh mới
  if (uFog > 0.0) {
    float keepN = exp(-d * 80.0);
    vec3 mc = uMistC * (0.7 + 0.6 * cF(q * 1.4 + vec2(0.6, 2.3)));
    cOld = mix(cOld, mc, uFog * 0.985 * (1.0 - keepN));
  }
  if (uPre > 0.5 || uP <= 0.0) { outputColor = vec4(cOld, inputColor.a); return; }
  // mực thấm ra từ đầu gần (đáy màn) đi dần tới đầu cọ, bề ngang nở theo — sau mặt thấm rộng, sát mặt thấm hẹp (hình nêm, không có
  // mép thẳng nào); mép lan loang theo mây giấy + thớ xơ, độ loang tỉ lệ với bề ngang (mép lởm chởm ở mọi cỡ)
  float F = -0.12 + 1.7 * pow(uP, 0.8);
  float wT = smoothstep(F + 0.02, F - 0.4, t);
  // hình NÊM: rộng ở đầu gần (mực thấm lâu nhất), hẹp dần về đầu cọ — không thành một khe đứng đều bề ngang
  float R = (0.012 + 2.05 * pow(uP, 1.55)) * mix(0.25, 1.0, wT) * mix(1.0, 0.3, t * (1.0 - uP));
  float n = cF(q * 2.3 + vec2(1.7, 4.1)) - 0.5, n2 = cN(q * 11.0 + vec2(3.3, 0.7)) - 0.5;
  float fib = cN(vec2(q.x * 46.0 + q.y * 9.0, q.y * 7.0 - q.x * 3.0)) - 0.5;
  // mép loang như mực thấm giấy: gợn lớn + gợn nhỏ TỈ LỆ theo bề ngang (mép không bao giờ thẳng, ở cỡ nào cũng vậy) + thớ xơ
  float e = R - d + (0.5 * n * R + 0.32 * n2 * R + 0.045 * n + 0.016 * fib) * (1.0 - smoothstep(0.82, 1.0, uP));
  float m = smoothstep(0.0, 0.035, e);
  // cảnh cũ KHÔNG ĐƯỢC SÁNG HƠN cảnh mới (hết quầng viền kiểu lỗ khoá): cảnh 仕事 tối dần theo uP — như mặt giấy thấm ướt trước khi
  // màu mới lên — trừ chính nét cọ và một dải sát nét (nét vẫn là thứ sáng nhất, mắt đi theo nó)
  float keepS = exp(-d * 45.0);
  cOld *= mix(1.0 - uDim * smoothstep(0.0, 0.5, uP), 1.0, keepS);
  // viền mực đọng mảnh ngay mép lan (tối nhẹ, không sáng, không đen đặc)
  float tide = exp(-abs(e - 0.01) * 60.0) * (1.0 - m * 0.6);
  vec3 c = mix(cOld, inputColor.rgb, m) * (1.0 - 0.12 * tide);
  // (soát p11a A1) NÉT CŨ CÒN SÁNG trong lòng vùng đất mới cho tới gần cuối quãng hoà (chỉ phần sáng hơn — không phủ tối cảnh mới): đất
  // mới mọc ra quanh chính nét, rồi nét 道 của 連絡 đi tiếp từ đúng đáy màn ấy — một đường liền, không đứt
  float keepL = exp(-d * 80.0) * (1.0 - smoothstep(0.3, 0.72, uP));
  c = mix(c, max(c, cRaw), keepL);
  outputColor = vec4(c, inputColor.a);
}`, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['tOld', new Uniform(null)],
        ['uP', new Uniform(0)],
        ['uPts', new Uniform(Array.from({ length: 16 }, () => new Vector2()))],
        ['uN', new Uniform(0)],
        ['uDim', new Uniform(0.4)],
        ['uFog', new Uniform(0)],
        ['uPre', new Uniform(0)],
        ['uMistC', new Uniform(new Color(0.023, 0.034, 0.031))],
        ['uOct', new Uniform(3)],
      ]),
    });
  }
}

// PHẦN 6c (29/9, soát p7a A1): CHUYỂN CẢNH RỪNG → LÀNG GIẤY bằng CỬA GIẤY LÙA 障子 TRONG KHÔNG GIAN 3D — cảnh cửa (scene/cua.js:
// căn phòng tối, khung cửa gỗ, hai cánh shoji trượt trong rãnh, đèn sau giấy, máy tiến tới rồi đi xuyên qua) vẽ riêng vào một khung
// đệm có kênh trong suốt; lượt này chỉ ĐẶT nó lên ảnh cảnh (ảnh cửa đã nhân sẵn độ đục). Vẽ TRƯỚC loá + nắn màu.
export class ShojiEffect extends Effect {
  constructor() {
    super('ShojiEffect', /* glsl */`
uniform sampler2D tCua;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 d = texture2D(tCua, uv);
  outputColor = vec4(inputColor.rgb * (1.0 - d.a) + d.rgb, inputColor.a);
}`, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([['tCua', new Uniform(null)]]),
    });
  }
}

// PHẦN 8 (29/9): CHUYỂN CẢNH 5 (làng giấy → 仕事) — TỜ GIẤY THÀNH BẢN VẼ QUY HOẠCH rồi tan thành thung lũng. Máy trong làng tiến sát
// vào MỘT Ô GIẤY THẬT của cánh shoji (giấy dó có đèn sau lưng phủ kín màn — không có mảng phẳng nào dán lên: cái phủ màn là chính
// tờ giấy trong cảnh, lưới nan trượt ra ngoài khung). Trên tờ giấy mực 緑青 sẫm vẽ dần bản vẽ quy hoạch: đường đồng mức loang từ
// giữa tờ ra theo thớ giấy, nhà đặc dần, đường đi dự kiến chạy theo năm tháng. Rồi giấy TAN: mực thấm trước (nét tan trước), từng
// mảng mềm theo thớ, cuối cùng cả tờ — dưới giấy là thung lũng thật nhìn từ trên cao, đúng những đường ấy (bản vẽ vẽ từ chính
// tư thế đầu chương — scene/viec.js renderPlan). Chạy theo x (thời gian của chuyển cảnh): lùi thì chạy ngược đúng hình ấy.
//   tPlan: đỏ = đồng mức · lục = nhà · lam = đường đi (nét đứt) · alpha = thứ tự trên đường đi. tNew: cảnh thung lũng (tuyến tính).
// Vẽ TRƯỚC loá + nắn màu (như ShojiEffect): cả tờ giấy lẫn thung lũng qua cùng một lớp nắn màu.
export class GiayEffect extends Effect {
  // CHUYỂN CẢNH 5 (soát p9a A1/A3/A4 — bản cũ: gần 2 s cả màn là tờ giấy ngà trơn sáng 0,81; bản vẽ là đường 1 px xám; quãng tan
  // đục ô-liu). Bản này:
  //   · máy dừng ở khung còn thấy nan 組子 (ba ô giấy), không bao giờ một mặt phẳng trơn phủ màn;
  //   · mọi thứ trên giấy (ánh đèn loang, thớ xơ 楮, nét mực) nằm TRONG TOẠ ĐỘ TỜ GIẤY (uH: điểm ảnh màn → toạ độ khung cuối trên
  //     giấy, phép chiếu phẳng) — máy còn đang tiến vào thì nét đã bám đúng tờ giấy, không trôi trên mặt kính;
  //   · ánh đèn sau giấy loang không đều (một quầng lớn, một quầng nhỏ, mép tờ tối) → giấy không trơn, độ sáng chung ≈ chuyển cảnh 4;
  //   · nét cọ mực 緑青 của bản vẽ quy hoạch (scene/viec.js planBrush) hiện theo thứ tự vẽ, đầu nét đang vẽ còn ướt, đậm;
  //   · mực loang từ chỗ nét dày ra cả tờ: giấy BẠC MÀU trước (ngà → xám) rồi mới thấm lục (xám × 緑青) — không đi qua vàng ô-liu;
  //     thung lũng (cùng tư thế nhìn thẳng xuống, nét đè đúng lên đất) hiện qua lớp mực loang.
  constructor() {
    super('GiayEffect', NOISE + /* glsl */`
uniform sampler2D tPlan, tNew;
uniform mat3 uH;
uniform vec4 uSheet;
uniform float uPAsp, uLamp, uInk, uWash, uDis, uRef;
uniform vec3 uInkC, uWashC;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 hq = uH * vec3(uv, 1.0);
  vec2 pu = hq.xy / hq.z;                              // toạ độ trên tờ giấy: khung cuối của máy = 0…1
  vec2 pq = (pu - 0.5) * vec2(uPAsp, 1.0);             // cùng toạ độ, đơn vị = chiều cao khung cuối
  float sheet = smoothstep(uSheet.x - 0.002, uSheet.x + 0.006, pu.x) * (1.0 - smoothstep(uSheet.z - 0.006, uSheet.z + 0.002, pu.x))
              * smoothstep(uSheet.y - 0.002, uSheet.y + 0.006, pu.y) * (1.0 - smoothstep(uSheet.w - 0.006, uSheet.w + 0.002, pu.y));
  // ánh đèn sau giấy: quầng lớn lệch trái-trên, quầng nhỏ phải-dưới, vân mây chậm; xa quầng thì tối
  float n = cF(pq * 2.2 + 11.0);
  vec2 a1 = pq - vec2(-0.22, 0.12), a2 = pq - vec2(0.62, -0.28);
  float glow = 0.22 + 0.72 * exp(-dot(a1, a1) * 1.7) + 0.22 * exp(-dot(a2, a2) * 5.0);
  glow *= 0.8 + 0.4 * n;
  // thớ xơ 楮: sợi dài mảnh ba hướng, sáng hơn nền giấy; hạt giấy li ti
  float fibL = 0.0;
  for (int i = 0; i < 3; i++) {
    float an = float(i) * 2.13 + 0.4; vec2 r = mat2(cos(an), sin(an), -sin(an), cos(an)) * pq;
    r.y += 0.012 * sin(r.x * 11.0 + float(i) * 3.0) + 0.02 * (cN(r * 4.0 + float(i)) - 0.5);   // sợi xơ cong, không thẳng như vết xước
    fibL += smoothstep(0.78, 0.97, cN(vec2(r.x * 7.0 + float(i) * 13.0, r.y * 150.0))) * (0.6 + 0.4 * cN(r * 9.0));
  }
  float grain = cN(pq * 380.0);
  // giấy có đèn sau lưng rất sáng (quá trần của lớp nén sáng): đưa về mức uRef trước, rồi mới nhân quầng đèn — không thì nhân bao
  // nhiêu giấy vẫn trắng như cũ
  float mx = max(max(inputColor.r, inputColor.g), inputColor.b), kL = uLamp * sheet;
  // (nội suy theo tỉ lệ — pow — không theo hiệu: giấy sáng quá trần nên trộn tuyến tính thì tới gần cuối mới thấy đổi)
  vec3 paper = inputColor.rgb * pow(max(min(1.0, uRef / max(mx, 1e-4)) * glow * (1.0 + 0.16 * fibL - 0.06 * grain), 1e-3), kL);
  // mực: hiện theo thứ tự vẽ; mép nét ăn theo thớ giấy; đầu nét đang vẽ đậm hơn một chút (mực còn ướt)
  vec2 wob = (vec2(cN(pq * 70.0), cN(pq * 70.0 + 5.3)) - 0.5) * 0.0016;
  vec2 pc = clamp(pu + wob, 0.0, 1.0);
  float inP = step(0.0, pu.x) * step(pu.x, 1.0) * step(0.0, pu.y) * step(pu.y, 1.0);
  vec4 P = texture2D(tPlan, pc) * inP;
  float ord = 1.0 - P.g;
  float shown = P.r * (1.0 - smoothstep(uInk - 0.012, uInk, ord)) * step(0.03, P.r);
  float wetTip = exp(-max(uInk - ord, 0.0) * 22.0);
  float ink = clamp(shown * (0.74 + 0.26 * P.b) * (1.0 + 0.18 * wetTip), 0.0, 1.0) * sheet;
  vec3 inked = paper * mix(vec3(1.0), uInkC, ink);
  // mực loang: mật độ mực quanh điểm (ảnh mờ của bản vẽ) → loang từ chỗ nét dày ra cả tờ, mép loang theo vân giấy
  float dens = textureLod(tPlan, pc, 7.0).r * inP;
  // (loang từ giữa bản vẽ — nhà, đường đi — ra tới mép tờ, nhanh hơn chút ở vùng nét dày; mép loang theo vân giấy — không vệt
  // nhoè bẩn quanh từng nét; lúc uWash = 0 không điểm nào loang)
  float wf = uWash * 1.05 - 0.62 + dens * 0.45 + 0.3 * (1.0 - smoothstep(0.0, 1.4, length((pu - 0.5) * 2.0))) + (cF(pq * 2.4 + 2.0) - 0.5) * 0.4 + 0.04 * fibL;
  // mép loang GỌN (vài điểm ảnh) + viền mực đọng sẫm ở mép như màu nước: giấy đổi thẳng từ ngà sang lục mực, không có dải
  // "nửa giấy nửa mực" (dải ấy qua lớp nắn màu thành vàng ô-liu — soát p9a A4)
  float w = smoothstep(0.0, 0.05, wf) * step(0.001, uWash);
  float tide = exp(-abs(wf - 0.03) * 24.0) * step(0.001, uWash);
  vec3 washed = inked * mix(vec3(1.0), uWashC, w) * (1.0 - 0.38 * tide);
  // thung lũng hiện qua lớp mực (cùng tư thế với bản vẽ: nét nằm đúng trên đất)
  float m = smoothstep(0.0, 1.0, uDis * 1.35 - 0.12 + (n - 0.5) * 0.36 + 0.12 * w - 0.25 * (1.0 - w)) * step(0.001, uDis);
  vec3 v = texture2D(tNew, uv).rgb;
  outputColor = vec4(mix(washed, v, m), inputColor.a);
}`, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['tPlan', new Uniform(null)], ['tNew', new Uniform(null)],
        ['uH', new Uniform(new Matrix3())], ['uSheet', new Uniform(new Vector4(-9, -9, 9, 9))], ['uPAsp', new Uniform(1.6)],
        ['uLamp', new Uniform(0)], ['uRef', new Uniform(0.32)], ['uInk', new Uniform(0)], ['uWash', new Uniform(0)], ['uDis', new Uniform(0)],
        ['uInkC', new Uniform(new Color(0.02, 0.3, 0.2))], ['uWashC', new Uniform(new Color(0.06, 0.22, 0.17))], ['uOct', new Uniform(4)],
      ]),
    });
  }
}

// (30/9, Mike) MỜ CHUYỂN — lùi, bấm tên chương, logo, Home / End: ảnh đứng của khung vừa hiện (chụp thẳng từ khung vẽ ra màn,
// đã mã hoá sRGB) tan dần trên cảnh chương đích đang sống. uK = độ đục của ảnh cũ (1 → 0). Không qua màn đen, không có mép.
export class MoEffect extends Effect {
  constructor() {
    super('MoEffect', /* glsl */`
uniform sampler2D tOld;
uniform float uK;
vec3 moLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 o = moLin(texture2D(tOld, uv).rgb);
  outputColor = vec4(mix(inputColor.rgb, o, uK), inputColor.a);
}`, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([['tOld', new Uniform(null)], ['uK', new Uniform(0)]]),
    });
  }
}
