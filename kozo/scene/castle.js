// 天守 thiên thủ các trên nền đá xếp 石垣 ishigaki.
//
// Ý chính: KHỐI LƯỢNG. Nền đá là bản dịch một-đổi-một của tảng băng trong ảnh gốc —
// hàng trăm tảng đá tự nhiên, dày, đa giác không đều, ghép khít không vữa, và nền đá
// chiếm hơn một phần ba chiều cao. Bên trên là thiên thủ 5 tầng tường trát trắng.
import * as THREE from 'three';

// ───────── công cụ hình học ─────────
export function rng32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hash3(x, y, z, s) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// mặt cắt gần chữ nhật, góc bo mềm (siêu elip) — dùng cho cả nền đá lẫn mái
function superRect(A, B, n, sq = 0.22) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    out.push([A * Math.sign(c) * Math.pow(Math.abs(c), sq), B * Math.sign(s) * Math.pow(Math.abs(s), sq)]);
  }
  return out;
}

// nối các vành thành một mặt liền; cột đầu được nhân đôi ở cuối để đường ngói không đứt ở mối nối
function loft(rings, uvScaleX = 1) {
  const N = rings[0].length, K = rings.length, NV = N + 1;
  const pos = [], uv = [], idx = [];
  for (let k = 0; k < K; k++) for (let i = 0; i < NV; i++) {
    const p = rings[k][i % N];
    pos.push(p.x, p.y, p.z);
    uv.push((i / N) * uvScaleX, k / (K - 1));
  }
  for (let k = 0; k < K - 1; k++) for (let i = 0; i < N; i++) {
    const a = k * NV + i, b = k * NV + i + 1, c = (k + 1) * NV + i + 1, d = (k + 1) * NV + i;
    idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function capRing(ring, y) {
  const N = ring.length, pos = [0, y, 0], uv = [0.5, 0.5], idx = [];
  for (let i = 0; i < N; i++) { pos.push(ring[i].x, y, ring[i].z); uv.push(0.5, 0.5); }
  for (let i = 0; i < N; i++) idx.push(0, 1 + ((i + 1) % N), 1 + i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ───────── áo vật liệu: viền cạnh + VÂN BỀ MẶT ─────────
// Hai thứ này quyết định cảnh có "sang" hay không.
//  · viền cạnh: trong ảnh gốc, chỗ sáng nhất khung chính là đường khe giữa các khối.
//  · vân: nền của igloo có vân trên tuyết và núi; cảnh của mình trước đây MỌI MẶT ĐỀU TRƠN
//    nên khối nhìn ra nhựa. Vân băm theo TOẠ ĐỘ THẬT nên không cần trải UV, và tảng đá nào
//    cũng có mặt riêng của nó.
const GRAIN_PARS = [
  'varying vec3 vKPos;',
  'float kHash(vec3 p) {',
  '  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));',
  '  p *= 17.0;',
  '  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));',
  '}',
  'float kNoise(vec3 x) {',
  '  vec3 i = floor(x), f = fract(x);',
  '  f = f * f * (3.0 - 2.0 * f);',
  '  return mix(mix(mix(kHash(i + vec3(0.0, 0.0, 0.0)), kHash(i + vec3(1.0, 0.0, 0.0)), f.x),',
  '                 mix(kHash(i + vec3(0.0, 1.0, 0.0)), kHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),',
  '             mix(mix(kHash(i + vec3(0.0, 0.0, 1.0)), kHash(i + vec3(1.0, 0.0, 1.0)), f.x),',
  '                 mix(kHash(i + vec3(0.0, 1.0, 1.0)), kHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);',
  '}',
  // cận vòng là BIẾN (uKOct = 4): trình dịch shader của Windows không trải phẳng được — mỗi chỗ gọi kFbm chỉ còn một
  // thân vòng thay vì bốn bản chép (đo 25/9: chương trình tường trát dịch 2,4 s → 1,1 s). Cùng phép tính, cùng thứ tự.
  'uniform int uKOct;',
  'float kFbm(vec3 x) {',
  '  float a = 0.5, sum = 0.0;',
  '  for (int i = 0; i < uKOct; i++) { sum += a * kNoise(x); x *= 2.03; a *= 0.5; }',
  '  return sum;',
  '}',
  'vec3 kPerturb(vec3 sp, vec3 sn, vec2 dH, float fd) {',
  '  vec3 sx = dFdx(sp), sy = dFdy(sp);',
  '  vec3 r1 = cross(sy, sn), r2 = cross(sn, sx);',
  '  float det = dot(sx, r1) * fd;',
  '  vec3 g = sign(det) * (dH.x * r1 + dH.y * r2);',
  '  vec3 nn = abs(det) * sn - g;',
  '  return dot(nn, nn) > 1e-14 ? normalize(nn) : sn;',   // tam giác quá nhỏ: normalize(0) = NaN → bloom thổi thành đốm trắng
  '}',
].join('\n');

// ── VIỀN VÁT BẮT SÁNG (24/9: "cạnh vát bắt sáng — đó là thứ tách tảng này khỏi tảng kia") ──
// Mép mặt trước của mỗi tảng (bốn cạnh hộp + các nhát bạt góc) sáng lên thành một dải hẹp, tính bằng
// MÉT THẬT trên mặt tảng. Không rải đều: cạnh trên và cạnh trái (phía nắng) sáng, cạnh dưới gần như tắt,
// và mỗi tảng một mức riêng — rải đều thì cả bức tường thành tường gạch gắn đèn (bài học vòng trước).
const BEVEL_VS_PARS = [
  'attribute vec3 aCut0, aCut1, aCut2;',
  'varying vec3 vLoc, vScl, vCut0, vCut1, vCut2;',
  'varying float vStoneR;',
].join('\n') + '\n';
const BEVEL_VS_MAIN = [
  '',
  '#ifdef USE_INSTANCING',
  '  vLoc = position; vCut0 = aCut0; vCut1 = aCut1; vCut2 = aCut2;',
  '  vScl = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));',
  '  vStoneR = fract(sin(dot(instanceMatrix[3].xyz, vec3(12.9898, 78.233, 37.719))) * 43758.5453);',
  '#else',
  '  vLoc = vec3(0.0); vCut0 = vec3(1.0, 0.0, 9.0); vCut1 = vCut0; vCut2 = vCut0; vScl = vec3(1.0); vStoneR = 0.5;',
  '#endif',
].join('\n');
const BEVEL_FS_PARS = [
  'varying vec3 vLoc, vScl, vCut0, vCut1, vCut2;',
  'varying float vStoneR;',
  // khoảng cách (mét) tới một nhát cắt x·cx + y·cy = d trên mặt tảng đã co giãn; cũng trả hướng ra ngoài
  'float kCutD(vec3 cu, out vec2 dir) {',
  '  vec2 nn = vec2(cu.x / vScl.x, cu.y / vScl.y); float L = length(nn);',
  '  dir = normalize(vec2(cu.x * vScl.y, cu.y * vScl.x));',
  '  return (cu.z - dot(vLoc.xy, cu.xy)) / max(L, 1e-4);',
  '}',
].join('\n') + '\n';
const BEVEL_FS_MAIN = [
  '#ifdef USE_INSTANCING',
  '{',
  '  vec2 od = vec2(sign(vLoc.x), 0.0);',
  '  float e = (0.5 - abs(vLoc.x)) * vScl.x;',
  '  float ey = (0.5 - abs(vLoc.y)) * vScl.y;',
  '  if (ey < e) { e = ey; od = vec2(0.0, sign(vLoc.y)); }',
  '  vec2 dc; float ec;',
  '  ec = kCutD(vCut0, dc); if (ec < e) { e = ec; od = dc; }',
  '  ec = kCutD(vCut1, dc); if (ec < e) { e = ec; od = dc; }',
  '  ec = kCutD(vCut2, dc); if (ec < e) { e = ec; od = dc; }',
  // dải vát: rộng uBevel mét, đậm nhất sát mép; chỉ ở nửa trước của tảng (mặt trước + phần trước hai hông)
  '  float front = smoothstep(0.30, 0.44, vLoc.z);',
  '  float band = (1.0 - smoothstep(0.0, uBevel, e)) * front;',
  '  float thin = (1.0 - smoothstep(0.0, uBevel * 0.30, e)) * front;',
  // hướng của cạnh so với nắng: trên-trái sáng, dưới-phải tắt
  '  float lit = clamp(0.5 + 0.5 * dot(od, normalize(vec2(-0.45, 0.9))), 0.0, 1.0);',
  '  lit = 0.08 + 0.92 * lit * lit;',
  '  float per = 0.45 + 0.55 * vStoneR;',
  '  totalEmissiveRadiance += uRimColor * (band * 0.10 + thin * 0.32) * lit * per * kOcc;',
  '}',
  '#endif',
].join('\n');

// ── NGỌN CỌ MỰC (Mike 24/9, hướng hubtown: "thay vì là giải năng lượng thì là các vết cọ mực với màu nhấn") ──
// Vết cọ là một ĐƯỜNG GẤP KHÚC trong không gian 3D, mỗi đỉnh nằm ĐÚNG trên mặt công trình (điểm tia chuột chạm).
// Mọi vật liệu của toà thành tự tính khoảng cách từ điểm ảnh của nó tới đường ấy → vết mực bám theo mặt tường,
// mái, nền đá; máy quay nghiêng thì vết vẫn dính đúng chỗ. Mỗi đỉnh mang: giờ vẽ (để khô và tan), bề rộng
// nét (chậm thì dày), quãng dài đã vẽ (cho vệt xơ khô và vạch đo), tốc độ tay (nhanh thì xơ khô 掠れ).
export const INK_N = 96;
// số tầng của nhiễu kFbm — một uniform dùng chung (xem GRAIN_PARS)
export const KOCT = { value: 4 };
export const INK = {
  uInkA: { value: new Float32Array(INK_N * 4) },   // x, y, z (thế giới), giờ vẽ
  uInkB: { value: new Float32Array(INK_N * 4) },   // bề rộng (m), quãng dài (m), tốc độ 0…1, nối với đỉnh trước (1/0)
  uInkT: { value: 0 },
  uInkOn: { value: 0 },
  // dải 緑青: trên mặt SÁNG (tường trát) — lõi 800, mép 500, nét kết cấu 900; trên mặt SẪM (đá, mái, ván đen) — lõi 300, mép 500, nét 100
  // (mặt sẫm: lớp màu gỉ đồng đục như chất màu thật — không phải vệt sáng phát quang)
  // 0 = 900 · 1 = 800 · 2 = 700 · 3 = 500 · 4 = 300 · 5 = 200
  uInkC: { value: ['#19342C', '#1D483C', '#236050', '#3E9A80', '#8BC8B3', '#B2DDCD'].map((h) => new THREE.Color(h)) },
  uInkMode: { value: 0 },
  uKOct: KOCT,
  // (hiệu năng, 24/9) số đỉnh đang có + hộp bao mọi đoạn vết (đã nới đủ bề rộng lớn nhất) — điểm ảnh ngoài hộp
  // bỏ qua cả vòng 96 đoạn; vòng dừng ở đỉnh cuối thay vì chạy hết 96. Hình ra y hệt.
  uInkNum: { value: 0 },
  uInkLo: { value: new THREE.Vector3(1e9, 1e9, 1e9) },
  uInkHi: { value: new THREE.Vector3(-1e9, -1e9, -1e9) },
};
const INK_PARS = [
  'uniform vec4 uInkA[' + INK_N + '];',
  'uniform vec4 uInkB[' + INK_N + '];',
  'uniform float uInkT, uInkOn, uInkMode, uInkNum;',
  'uniform vec3 uInkLo, uInkHi;',
  'uniform vec3 uInkC[6];',
  'float gInkWet = 0.0, gInkMask = 0.0;',
  'vec3 gInkGlow = vec3(0.0);',
].join('\n') + '\n';
// đánh giá vết mực tại điểm p (thế giới). Trả về độ đậm (0…1) và các toạ độ trong lòng vết.
const INK_FN = [
  // NÉT CỌ NHẬT (Mike 24/9: "cần nhìn giống nét cọ nhật bản hơn"). Giải phẫu một nét:
  //   起筆 đầu nét — cọ ấn xuống: đầu VUÔNG VÁT (không tròn), hơi phình, đậm nhất
  //   送筆 thân nét — bề rộng theo LỰC ẤN (đi chậm ấn sâu, nét dày; đi nhanh nhấc cọ, nét mảnh), dao động nhẹ
  //   収筆 đuôi — đi nhanh thì bề rộng rút về gần 0 → vuốt nhọn 払い; dừng tay thì đầu tròn, mực đọng 止め
  //   掠れ xơ khô — lông cọ tách thành SỢI SONG SONG chạy dọc hướng nét (nhiễu kéo dài theo nét, không tròn);
  //                 khô theo tốc độ tay và theo quãng đã vẽ (cọ cạn dần), mép khô trước lòng nét
  //   滲み loang — chỗ mực ướt thấm ra một quầng mỏng, nhạt, mép xơ
  //   濃淡 đậm nhạt — đầu nét đậm, càng về sau càng nhạt khi cọ cạn; có hạt của bột màu khoáng 岩絵具
  // Trả về độ phủ; dens = độ đậm của mực (0…1); edge = gần mép nét (cho vệt sáng mảnh trên đá / mực đọng mép);
  // bleed = quầng loang ngoài mép.
  'float kInk(vec3 p, vec3 nW, out float wet, out float dens, out float edge, out float bleed) {',
  '  wet = 0.0; dens = 0.0; edge = 0.0; bleed = 0.0;',
  // ngoài hộp bao của cả vết (đã nới đủ w·1,7 + 0,2 như phép loại bên dưới) thì không đoạn nào chạm tới
  '  if (any(lessThan(p, uInkLo)) || any(greaterThan(p, uInkHi))) return 0.0;',
  // (đừng dời hai dòng nhiễu này vào trong vòng lặp "cho đỡ tốn": trình dịch shader của Windows trải phẳng vòng 96
  // lần → lần mở trang đầu tiên phải dịch shader 66–98 s thay vì ~25 s — đo 24/9)
  '  float nF = kFbm(p * 2.4 + 11.0), nR = kNoise(p * 18.0);',
  '  float bestN = 9.0, bAg = 9.0, bSp = 0.0, bS = 0.0, bX = 0.0, bW = 1.0;',
  '  for (int i = 1; i < ' + INK_N + '; i++) {',
  '    if (float(i) >= uInkNum) break;',
  '    if (uInkB[i].w < 0.5) continue;',
  '    vec3 a = uInkA[i - 1].xyz, b = uInkA[i].xyz, ab = b - a;',
  '    float L = max(length(ab), 1e-5);',
  '    vec3 dir = ab / L;',
  '    float u = dot(p - a, dir);',
  '    float t = clamp(u / L, 0.0, 1.0);',
  '    vec3 dv = p - (a + ab * t);',
  '    float d = length(dv);',
  '    float w = mix(uInkB[i - 1].x, uInkB[i].x, t);',
  '    if (d > w * 1.7 + 0.2) continue;',
  '    float ag = uInkT - mix(uInkA[i - 1].w, uInkA[i].w, t);',
  '    if (ag > 2.8 || ag < -0.05) continue;',
  '    float sI = mix(uInkB[i - 1].y, uInkB[i].y, t);',
  '    float side = sign(dot(dv, cross(dir, nW)) + 1e-6);',
  // lực ấn: phình ở đầu nét, dao động chậm dọc nét
  '    float press = (1.0 + 0.16 * (1.0 - smoothstep(0.2, 1.0, sI))) * (0.88 + 0.24 * kNoise(vec3(sI * 0.35, 5.0, 1.0)));',
  '    float rE = w * press * (0.90 + 0.10 * nF + 0.05 * (nR - 0.5));',
  '    float dn = d / rE, x = side * d;',
  // 起筆: đoạn đầu tiên của nét, điểm nằm TRƯỚC điểm đặt cọ → đầu vuông vát chéo thay cho nắp tròn
  '    if (uInkB[i - 1].w < 0.5 && u < 0.0) {',
  '      float perp = sqrt(max(d * d - u * u, 0.0));',
  '      x = side * perp;',
  '      dn = max(perp / rE, (-u + 0.32 * x) / (0.30 * rE));',
  '    }',
  '    if (dn < bestN) { bestN = dn; bAg = ag; bSp = mix(uInkB[i - 1].z, uInkB[i].z, t); bS = sI; bX = x; bW = rE; }',
  '  }',
  '  if (bestN > 1.6) return 0.0;',
  '  float xn = clamp(bX / bW, -1.0, 1.0);',
  '  float depl = smoothstep(7.0, 26.0, bS);',                                  // cọ cạn dần theo quãng (nét dài mới cạn)
  '  float D = clamp(0.62 * bSp + 0.55 * depl, 0.0, 0.88);',                       // độ khô
  '  float Dl = D * (1.0 + 0.45 * xn * xn);',                                      // mép khô trước lòng
  // sợi lông cọ: nhiễu DỊ HƯỚNG — dày đặc theo bề ngang nét, kéo dài dọc nét
  '  float fib = kNoise(vec3(xn * 19.0, bS * 0.50, 3.0)) * 0.62 + kNoise(vec3(xn * 7.0, bS * 0.18, 9.0)) * 0.38;',
  '  float bristle = smoothstep(Dl - 0.07, Dl + 0.07, fib);',
  '  float body = (1.0 - smoothstep(0.90, 1.0, bestN)) * bristle;',
  '  float fade = 1.0 - smoothstep(1.6, 2.8, bAg);',
  '  wet = 1.0 - smoothstep(0.0, 0.8, bAg);',
  // 濃淡: đầu nét đậm, cạn dần thì nhạt, hạt bột màu khoáng
  '  float grain = kNoise(p * 26.0) * 0.6 + kNoise(p * 61.0) * 0.4;',
  '  dens = (0.80 + 0.20 * (1.0 - smoothstep(0.0, 1.6, bS))) * (1.0 - 0.50 * depl) * (0.84 + 0.16 * grain);',
  '  edge = smoothstep(0.82, 0.93, bestN);',   // viền MẢNH sát mép nét
  // 滲み: chỉ chỗ mực còn ướt, cọ còn no mực (không khô) — quầng mỏng, mép xơ
  '  bleed = (1.0 - smoothstep(0.96, 1.22 + 0.30 * nR, bestN)) * smoothstep(0.88, 1.0, bestN) * (1.0 - D) * (0.45 + 0.55 * nF);',
  '  bleed *= fade * (1.0 - 0.6 * smoothstep(0.3, 1.6, bAg));',
  '  return body * fade;',
  '}',
].join('\n') + '\n';

// Vết cọ là Ô CỬA nhìn vào kết cấu (Mike 24/9: "nét cần to hơn, để thấy được kết cấu bên trong, và cần glow"):
//   · mặc định (uInkMode 0): lòng nét là NỀN MỰC GỈ ĐỒNG SẪM (800–900, đặc như mực ướt) — ô cửa tối trên công trình
//     sáng; nét kết cấu (lớp riêng, ghép ở post) PHÁT SÁNG trên nền ấy; mép nét có viền sáng mảnh (mực ướt bắt sáng).
//     Nền sẫm được nâng nhẹ bằng phát sáng yếu để không chìm hẳn xuống sàn đen của lớp nắn màu trên mặt đá sẫm.
//   · &co=sang (uInkMode 1): cả nét là gỉ đồng SÁNG phát quang (không nền sẫm) — để so.
// uInkC: 0 = 900 · 1 = 800 · 2 = 700 · 3 = 500 · 4 = 300 · 5 = 200
function inkApply(bg) {
  const lift = bg === 'dark' ? '0.16' : '0.08';
  return [
    'if (uInkOn > 0.5) {',
    '  vec3 nW = normalize(cross(dFdx(vKPos), dFdy(vKPos)));',
    '  float kWet, kDens, kEdge, kBleed;',
    '  float kI = kInk(vKPos, nW, kWet, kDens, kEdge, kBleed);',
    '  if (kI > 0.001 || kBleed > 0.001) {',
    '    if (uInkMode < 0.5) {',
    '      diffuseColor.rgb = mix(diffuseColor.rgb, uInkC[3], kBleed * 0.35);',
    '      vec3 win = mix(uInkC[2], uInkC[0], smoothstep(0.35, 0.95, kDens));',
    '      diffuseColor.rgb = mix(diffuseColor.rgb, win, kI * 0.93);',
    '      gInkGlow = uInkC[2] * kI * ' + lift + ' + uInkC[4] * kI * kEdge * 0.85;',
    '      gInkWet = kI * (0.5 + 0.5 * kWet);',
    '    } else {',
    '      diffuseColor.rgb = mix(diffuseColor.rgb, uInkC[4], kBleed * 0.45);',
    '      diffuseColor.rgb = mix(diffuseColor.rgb, mix(uInkC[4], uInkC[3], kEdge), kI * 0.85);',
    '      gInkGlow = uInkC[5] * kI * (0.45 + 0.30 * kDens) + uInkC[4] * kBleed * 0.25 + uInkC[5] * kI * kEdge * 0.35;',
    '      gInkWet = kI * kWet;',
    '    }',
    '    gInkMask = kI;',
    '  }',
    '}',
  ].join('\n');
}

// MẶT PHẲNG SƯƠNG cho vết cọ khi con trỏ đi RA KHỎI công trình (trên nền sương, trời): một cú rê tay không bao giờ
// đứt giữa chừng. Nét ở đây nhạt hơn, không có lớp kết cấu; không ghi độ sâu (không che gì, không làm sai lớp ghép).
// Không so độ sâu: đồi, rừng, núi gần có khi đứng TRƯỚC mặt phẳng — so độ sâu thì nét biến mất giữa chừng ở đó (đo 24/9).
// Thay vào đó toà thành ghi stencil = 1 (xem markCastleStencil) và mặt phẳng chỉ vẽ nơi stencil ≠ 1.
export function inkPlaneMaterial() {
  const m = new THREE.ShaderMaterial({
    uniforms: { ...INK },
    vertexShader: 'varying vec3 vKPos;\nvoid main() { vec4 w = modelMatrix * vec4(position, 1.0); vKPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: GRAIN_PARS + '\n' + INK_PARS + INK_FN + [
      'void main() {',
      '  float kWet, kDens, kEdge, kBleed;',
      '  float kI = uInkOn > 0.5 ? kInk(vKPos, vec3(0.0, 0.0, 1.0), kWet, kDens, kEdge, kBleed) : 0.0;',
      '  vec3 col = uInkMode < 0.5 ? mix(uInkC[3], uInkC[1], kDens) : mix(uInkC[5], uInkC[4], kEdge);',
      '  float a = kI * (uInkMode < 0.5 ? 0.78 : 0.70) + kBleed * 0.22;',
      '  if (a < 0.003) discard;',
      '  gl_FragColor = vec4(col * (uInkMode < 0.5 ? 1.0 : 1.6), a);',
      '}',
    ].join('\n'),
    // GHI độ sâu của mặt phẳng (luôn đè, không so): lớp mờ theo khoảng cách coi nét nằm ngang toà thành (đang nét),
    // không làm nhoè nét trên đồi gần / núi xa thành vệt xám (đo 24/9: nét ở mép khung hụt vì bị nhoè mất)
    transparent: true, depthWrite: true, depthTest: true, depthFunc: THREE.AlwaysDepth, fog: false,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilWriteMask: 0x00,
    stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
  });
  return m;
}

export function markCastleStencil(root) {
  const seen = new Set();
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (seen.has(m) || m.transparent) continue;
      seen.add(m);
      m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc;
      m.stencilZPass = THREE.ReplaceStencilOp; m.stencilFail = THREE.KeepStencilOp; m.stencilZFail = THREE.KeepStencilOp;
    }
  });
}

// cùng hàm mực cho bước ghép lớp nét kết cấu (post): nhiễu + uniform + kInk
export const INK_GLSL = () => GRAIN_PARS.replace('varying vec3 vKPos;', '') + '\n' + INK_PARS + INK_FN;

// mọi vật liệu có viền cạnh đều cần biết nắng đang chiếu từ đâu, tính trong hệ toạ độ máy quay
const SUNLIT = [];
export function updateSunDir(camera, sunDirWorld, tmp) {
  tmp.copy(sunDirWorld).transformDirection(camera.matrixWorldInverse).normalize();
  for (const m of SUNLIT) if (m.userData.u) m.userData.u.uSunV.value.copy(tmp);
}

export function dress(mat, o) {
  o = o || {};
  const rim = o.rim || 0, power = o.power || 2.4, grain = o.grain || 0;
  const scale = o.scale || 1, rough = o.rough || 0, eave = o.eave || 0;
  const fine = !!o.fine;   // true = chỉ hạt lấm tấm, bỏ tầng gợn sóng lớn
  const face = o.face || 0; // làm TỐI riêng phần mặt phẳng, chừa cạnh — mặt tối / viền sáng
  const occ = o.occ || null;   // [đáy, đỉnh, mức tối ở đáy] — chìm dần vào bóng theo độ cao thật
  const bounce = o.bounce || null; // [R1, R2, y gốc, hệ số cao độ] — quầng sáng chân tường theo con trỏ
  // CHẤT LIỆU THẬT (bản không khí 24/9): nước mưa để lại VỆT DỌC trên đá và trên tường trát;
  // đá ngoài trời bốn trăm năm có MẢNG địa y / rêu. Cả hai băm theo toạ độ thật, không cần ảnh.
  const streak = o.streak || 0;       // vệt nước chảy dọc: sẫm đi tối đa bấy nhiêu
  const mottle = o.mottle || 0;       // mảng loang lớn, pha về màu mottleColor
  // GỒ GHỀ THẬT: nắn pháp tuyến theo nhiễu toạ độ (không cần UV). Đây là thứ làm mặt đá bắt nắng
  // lồi lõm — không có nó, mọi mặt phẳng đều ra tấm nhựa, dù màu có loang tới đâu.
  const bump = o.bump || 0, bumpScale = o.bumpScale || 3.0;
  const eaves = o.eaves || null;
  const tiles = o.tiles || 0;
  const pushGlow = o.pushGlow || 0;
  const bevel = o.bevel || 0;   // viền vát mặt trước tảng đá bắt sáng (mét: bề rộng dải vát)
  // vết cọ mực: loại MẶT mà mực nằm lên — 'light' (tường trát: mực sẫm) / 'dark' (đá, mái, ván: mực sáng)
  const ink = o.ink || '';   // tảng rời chỗ thì mép nó hứng ánh lõi sáng lộ ra sau khe      // hàng ngói theo vUv.x, tự nhạt đi khi hàng ngói nhỏ gần bằng một điểm ảnh (không moiré)   // độ cao (thế giới) mép dưới các hiên mái: tường ngay dưới hiên tối đi
  // three chỉ khai báo vUv khi có USE_UV; bản 0.186 đặt tên riêng cho từng loại ảnh (vMapUv…),
  // nên muốn dùng vUv thì phải bật cờ này, không thì shader không dịch được.
  if (eave || tiles) mat.defines = Object.assign({}, mat.defines, { USE_UV: '' });
  mat.userData.u = {
    ...(ink ? INK : {}),
    uRim: { value: rim },
    uRimPow: { value: power },   // mũ của viền sáng: uniform (không in thẳng vào mã) → vật liệu cùng mã dùng chung chương trình
    uRimColor: { value: new THREE.Color(o.rimColor === undefined ? 0xdfe7f2 : o.rimColor) },
    uGrain: { value: grain },
    uGrainScale: { value: scale },
    uGrainRough: { value: rough },
    uSunV: { value: new THREE.Vector3(0, 0, 1) },   // hướng nắng trong hệ toạ độ máy quay
    uMouse: { value: new THREE.Vector3(0, 1e6, 0) }, // điểm 3D của con trỏ, đã làm trễ
    uBounce: { value: 0 },                           // kênh `bounce`, đã làm mượt hai tầng
    uBounceColor: { value: new THREE.Color(o.bounceColor === undefined ? 0xffffff : o.bounceColor) },
    uMottleColor: { value: new THREE.Color(o.mottleColor === undefined ? 0x808080 : o.mottleColor) },
    uBump: { value: bump },
    uCoreColor: { value: new THREE.Color(o.coreColor === undefined ? 0xffffff : o.coreColor) },
    uPushGlow: { value: pushGlow },
    uBumpScale: { value: bumpScale },
    uBevel: { value: bevel },
    uKOct: KOCT,
  };
  SUNLIT.push(mat);
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, mat.userData.u);
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'varying vec3 vKPos;\n' + (pushGlow ? 'attribute float aPush;\nvarying float vPush;\n' : '') + (bevel ? BEVEL_VS_PARS : '') + 'void main() {' + (pushGlow ? '\n  vPush = aPush;' : '') + (bevel ? BEVEL_VS_MAIN : ''))
      .replace('#include <project_vertex>', [
        '#include <project_vertex>',
        '#ifdef USE_INSTANCING',
        '  vKPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;',
        '#else',
        '  vKPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
        '#endif',
      ].join('\n'));
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform float uRim, uRimPow, uGrain, uGrainScale, uGrainRough, uBounce, uBump, uBumpScale, uBevel;\nuniform vec3 uRimColor, uSunV, uMouse, uBounceColor, uMottleColor, uCoreColor;\nuniform float uPushGlow;\n' + (pushGlow ? 'varying float vPush;\n' : '') + (bevel ? BEVEL_FS_PARS : '') + GRAIN_PARS + '\n' + (ink ? INK_PARS + INK_FN : '') + 'void main() {')
      // vân vào thẳng màu nền: tầng thô cho mảng đá, tầng mịn cho hạt
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'float kg = kFbm(vKPos * uGrainScale) - 0.5;',
        'float kg2 = kFbm(vKPos * uGrainScale * 5.7) - 0.5;',
        fine ? 'diffuseColor.rgb *= 1.0 + uGrain * (kg * 0.18 + kg2 * 1.35);'
             : 'diffuseColor.rgb *= 1.0 + uGrain * (kg * 1.25 + kg2 * 0.55);',
        streak ? 'float kst = kFbm(vec3(vKPos.x * 1.9, vKPos.y * 0.085, vKPos.z * 1.9) + 3.0); diffuseColor.rgb *= 1.0 - ' + streak.toFixed(3) + ' * smoothstep(0.42, 0.78, kst);' : '',
        mottle ? 'float kmo = kFbm(vKPos * 0.55 + 7.0) * 0.7 + kFbm(vKPos * 2.3 + 1.0) * 0.3; diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uMottleColor * 2.0, ' + mottle.toFixed(3) + ' * smoothstep(0.48, 0.72, kmo));' : '',
        eaves ? 'float kev = 1.0;' + eaves.map((y) => 'kev = min(kev, 1.0 - 0.50 * smoothstep(' + (y - 5.2).toFixed(2) + ', ' + (y - 0.6).toFixed(2) + ', vKPos.y) * step(vKPos.y, ' + (y + 0.25).toFixed(2) + '));').join(' ') + ' diffuseColor.rgb *= kev;' : '',
        tiles ? 'float ktu = fract(vUv.x); float kfw = fwidth(vUv.x); float kprof = smoothstep(0.0, 0.08, ktu) * (1.0 - smoothstep(0.62, 0.70, ktu)) * 0.55 + smoothstep(0.66, 0.80, ktu) * (1.0 - smoothstep(0.92, 1.0, ktu)) * 1.0; diffuseColor.rgb *= mix(1.0, 0.55 + 0.75 * kprof, ' + tiles.toFixed(2) + ' * (1.0 - smoothstep(0.18, 0.42, kfw)));' : '',
        // mặt tảng bật ra SẪM đi như mặt khối igloo: nó là nền của chữ số đo, và sẫm thì lõi sáng sau khe càng nổi
        pushGlow ? 'diffuseColor.rgb *= 1.0 - 0.36 * vPush;' : '',
        'float kOcc = 1.0;',
        // mặt dưới hiên mái: dải tối lớn nhất và đúng nghề nhất của một toà thành
        eave ? 'diffuseColor.rgb *= mix(' + (1 - eave).toFixed(2) + ', 1.0, smoothstep(0.0, 0.16, vUv.y));' : '',
        // càng xuống thấp càng ít thấy trời: chân tường đá chìm dần vào bóng
        occ ? 'kOcc = mix(' + occ[2].toFixed(2) + ', 1.0, smoothstep(' + occ[0].toFixed(1) + ', ' + occ[1].toFixed(1) + ', vKPos.y)); diffuseColor.rgb *= kOcc;' : '',
        ink ? inkApply(ink) : '',
      ].join('\n'))
      .replace('#include <roughnessmap_fragment>', [
        '#include <roughnessmap_fragment>',
        'roughnessFactor = clamp(roughnessFactor + uGrainRough * (kFbm(vKPos * uGrainScale * 2.3) - 0.5), 0.04, 1.0);',
        ink ? 'roughnessFactor = mix(roughnessFactor, 0.16, gInkWet * 0.9);' : '',
      ].join('\n'))
      .replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        bump ? 'float kbh = kFbm(vKPos * uBumpScale) * 0.75 + kNoise(vKPos * uBumpScale * 4.1) * 0.25; normal = kPerturb(-vViewPosition, normal, vec2(dFdx(kbh), dFdy(kbh)) * uBump, faceDirection);' : '',
        // pháp tuyến hỏng (NaN) ở một điểm ảnh lẻ — đo được trên tảng đá lúc săn nháy đen: thay bằng hướng nhìn thẳng
        '{ uvec3 kU = floatBitsToUint(normal) & uvec3(0x7fffffffu); if (any(greaterThanEqual(kU, uvec3(0x7f800000u)))) normal = vec3(0.0, 0.0, 1.0); }',
      ].join('\n'))
      .replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        occ ? 'totalEmissiveRadiance *= kOcc;' : '',
        'float rimF = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), uRimPow);',
        // Mặt phẳng rộng của tảng đá phải TỐI, chỉ cạnh vát mới sáng. Nhân vào đây (sau khi đã
        // có pháp tuyến, trước khi tính sáng) nên nó ăn vào cả phần bắt nắng.
        face ? 'diffuseColor.rgb *= mix(' + face.toFixed(2) + ', 1.0, smoothstep(0.0, 0.55, rimF));' : '',
        // Viền sáng KHÔNG rải đều quanh mọi khối. Trong ảnh gốc nó mạnh ở cạnh hứng nắng,
        // mờ hẳn ở cạnh khuất, và nhiều khối gần như không có viền. Rải đều theo fresnel thì
        // mỗi tảng đeo một vòng trắng quanh chu vi, cả bức tường hoá ra tường gạch gắn đèn.
        'float rimLit = 0.14 + 0.86 * smoothstep(-0.20, 0.45, dot(normalize(normal), normalize(uSunV)));',
        'totalEmissiveRadiance += uRimColor * uRim * rimF * kOcc * rimLit;',
        // chỉ MÉP tảng hứng ánh lõi (mặt tảng vẫn sẫm — mặt tảng là nền của chữ số đo)
        pushGlow ? 'totalEmissiveRadiance += uCoreColor * uPushGlow * vPush * pow(rimF, 2.2) * 2.4;' : '',
        bevel ? BEVEL_FS_MAIN : '',
        ink ? 'totalEmissiveRadiance += gInkGlow;' : '',
        bounce ? [
          'float bD = 1.0 - smoothstep(' + bounce[0].toFixed(1) + ', ' + bounce[1].toFixed(1) + ', distance(vKPos, uMouse));',
          'float bLow = 1.0 - smoothstep(-1.5, 1.0, (vKPos.y - ' + bounce[2].toFixed(1) + ') * ' + bounce[3].toFixed(3) + ');',
          'totalEmissiveRadiance += bLow * bD * uBounce * uBounceColor * 0.13;',
        ].join(String.fromCharCode(10)) : '',
      ].join('\n'));
  };
  // khoá chương trình CHỈ gồm những lựa chọn làm đổi MÃ shader (số nằm trong uniform thì không): hai vật liệu cùng mã dùng
  // chung một chương trình, lúc mở trang lần đầu đỡ phải dịch lại (bước B 25/9: trước đây mỗi vật liệu một chương trình)
  mat.customProgramCacheKey = () => 'k2_' + eave + '_' + fine + '_' + face + '_' + (occ ? occ.join(',') : '') + '_' + (bounce ? bounce.join(',') : '') + '_' + streak + '_' + mottle + '_' + !!bump + '_' + (eaves ? eaves.join(',') : '') + '_' + tiles + '_' + !!pushGlow + '_' + !!bevel + '_' + ink;
  return mat;
}

// ngói 本瓦葺: dải lòng máng xen dải ngói úp nổi, có khe sẫm giữa hai hàng.
// Tương phản phải ĐỦ MẠNH để nhìn ra hàng ngói từ 88 m — nhưng khe sẫm vẫn không được thành đen.
function tileTexture() {
  const c = document.createElement('canvas');
  c.width = 24; c.height = 2;
  const g = c.getContext('2d', { willReadFrequently: true });   // vẽ bằng CPU: trên GPU, lần vẽ đầu phải dịch shader vẽ canvas (~7 s trên Windows, đo 25/9)
  for (let x = 0; x < 24; x++) {
    let v;
    if (x < 2) v = 84;                      // khe giữa hai hàng ngói
    else if (x < 15) v = 172 + (x % 2) * 7;  // lòng máng 平瓦
    else if (x === 15 || x === 23) v = 138;  // mép ngói úp
    else v = 252;                            // sống ngói úp 丸瓦 bắt nắng
    g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
    g.fillRect(x, 0, 1, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  return t;
}

// 下見板張り: ván gỗ ốp chồng mí, mí nằm ngang. Đây là mảng SẪM của thành Nhật thật
// (Matsumoto, Okayama đều đen–trắng) — vừa đúng nghề, vừa kéo dải sắc độ của khung ra.
function lapTexture() {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 12;
  const g = c.getContext('2d', { willReadFrequently: true });   // vẽ bằng CPU: trên GPU, lần vẽ đầu phải dịch shader vẽ canvas (~7 s trên Windows, đo 25/9)
  for (let y = 0; y < 12; y++) {
    const v = y === 0 ? 104 : y < 3 ? 236 : 168 + ((y * 9) % 13);
    g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
    g.fillRect(0, y, 2, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ───────── vật liệu ─────────
export function makeMaterials(L) {
  const X = L.mat;
  const C = (h) => new THREE.Color(h);
  // 石垣 ĐÁ GRANITE. Bản cũ dịch nguyên ngữ pháp của khối BĂNG: mặt tối, cạnh trắng rực, khe
  // phát sáng — chính cái đó làm cả nền đá đọc ra băng. Đá thật thì ngược lại: KHE TỐI (bóng
  // giữa hai tảng không vữa), mặt đá có tông riêng từng tảng, có vệt nước chảy dọc, có mảng
  // địa y loang, cạnh chỉ hơi sáng hơn mặt chỗ bị mài mòn. Hạt granite ở 100 m là dưới một
  // điểm ảnh — cái đọc ra "granite" ở khoảng cách này là tông loang và vệt, không phải hạt.
  const stone = dress(new THREE.MeshStandardMaterial({
    color: X.stone, roughness: 0.93, metalness: 0, envMapIntensity: 0.9,
  }), {
    rim: X.rimK * 0.25, power: 3.0, rimColor: X.rim, grain: 0.34, scale: 2.6, fine: false, rough: 0.12, face: 0.92, bevel: 0.16, ink: 'dark',
    occ: [-3, 15, 0.78], bounce: [4.7, 16.0, 0.0, 0.42], bounceColor: X.rim,
    streak: 0.20, mottle: 0.45, mottleColor: X.stoneDark, bump: 0.32, bumpScale: 1.1,
    pushGlow: 1.0, coreColor: X.core || 0xe8f6ef,
  });
  // 栗石 / 裏込め — lớp đá dăm chèn phía sau tường thành thật. Ở đây nó PHÁT SÁNG: tách đá ra
  // là lộ kết cấu bên trong — đúng chữ 構造. Lúc nghỉ chỉ thấy qua mạch ghép thành đường khe sáng
  // mảnh; rê chuột thì lộ cả mảng sau các tảng đã rời chỗ. Sáng gần trắng, pha rất nhẹ sắc 緑青.
  // hai mặt: con trỏ bắn tia vào lõi phải trúng mặt TRƯỚC của tường (một mặt thì tia xuyên qua, trúng mặt sau)
  const stoneCore = new THREE.MeshBasicMaterial({ color: new THREE.Color(X.core || 0xe8f6ef).multiplyScalar(X.coreK || 1.9), fog: false, side: THREE.DoubleSide });
  stoneCore.userData.hot = { uMouseL: { value: new THREE.Vector3(0, 1e6, 0) }, uHot: { value: 0 }, uRest: { value: X.coreRest || 0.55 }, uT: { value: 0 }, uBreathK: { value: 1 } };
  stoneCore.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, stoneCore.userData.hot);
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'varying vec3 vRub;\nvoid main() {')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vRub = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', [
        'varying vec3 vRub;',
        'uniform vec3 uMouseL; uniform float uHot, uRest, uT, uBreathK;',
        'vec3 rH(vec3 p) { p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }',
        'void main() {',
      ].join('\n'))
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        // đá dăm: ô Voronoi ~0,35 m — mặt viên sáng, kẽ giữa các viên sẫm hơn một chút
        'vec3 rp = vRub / 0.35, ri = floor(rp), rf = fract(rp);',
        'float d1 = 9.0, d2 = 9.0;',
        'for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {',
        '  vec3 o = vec3(float(x), float(y), float(z));',
        '  vec3 c = o + rH(ri + o) - rf; float dd = dot(c, c);',
        '  if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;',
        '}',
        'float edge = sqrt(d2) - sqrt(d1);',
        'diffuseColor.rgb *= mix(0.80, 1.0, smoothstep(0.02, 0.22, edge)) * (0.94 + 0.12 * rH(ri + 7.0).x);',
        // vùng rực quanh con trỏ: một Ô CỬA nhìn vào lõi (2,5–8 m), không phải cả mặt tường
        'float hot = uHot * (1.0 - smoothstep(2.5, 8.0, distance(vRub, uMouseL)));',
        // THỞ: cùng công thức nhịp thở của đá (sóng ngang 3,14 s trong nhịp phồng 6,28 s) — đá phồng
        // thì mạch hé, ánh lõi rỉ ra nhiều hơn
        'float br = (sin(-2.0 * uT + vRub.x * 0.12) * 0.5 + 0.5) * (cos(-uT) * 0.5 + 0.5);',
        // uBreathK = 0 (ngọn cọ mực, toà thành đứng yên): mạch sáng GIỮ NGUYÊN mức trung bình, không phồng theo nhịp thở
        'diffuseColor.rgb *= uRest * mix(0.93, 0.7 + 0.9 * br, uBreathK) + 1.1 * hot;',
      ].join('\n'));
  };
  // lòng tầng lầu: cùng chất lõi nhưng DỊU — nền cho lưới cột kèo sáng rực phía trước nó
  const stoneCoreDim = new THREE.MeshBasicMaterial({ color: new THREE.Color(X.core || 0xe8f6ef).multiplyScalar((X.coreK || 1.9) * 0.42), fog: false, side: THREE.DoubleSide });
  stoneCoreDim.userData.hot = stoneCore.userData.hot;
  stoneCoreDim.onBeforeCompile = stoneCore.onBeforeCompile;
  // 漆喰 TƯỜNG TRÁT: trắng có sắc độ — hơi ngả theo bản màu, có vệt nước đọng dưới hiên, có mảng ố.
  const plaster = dress(new THREE.MeshStandardMaterial({
    color: X.plaster, roughness: 0.90, metalness: 0, envMapIntensity: 0.85,
  }), { rim: X.rimK * 0.5, rimColor: X.rim, power: 2.8, grain: 0.12, scale: 1.1, rough: 0.10, ink: 'light',
        streak: 0.20, mottle: 0.32, mottleColor: X.plasterDirt, bump: 0.10, bumpScale: 3.0,
        eaves: [IS.H + 0.44 + 9.6, IS.H + 0.44 + 9.38 + 8.2, IS.H + 0.44 + 17.36 + 6.8] });
  // 瓦 NGÓI: ngói hun 燻し瓦 xám sẫm có ánh bạc — không phải tấm trắng. Hàng ngói úp nổi đọc
  // bằng sọc sáng-tối của ảnh sọc + ánh bạc của trời lên mặt men.
  const tileTex = tileTexture();
  const roof = dress(new THREE.MeshStandardMaterial({
    color: X.roof, roughness: 0.55, metalness: X.roofSheen, envMapIntensity: 1.0,
    side: THREE.DoubleSide,
  }), { rim: X.rimK * 0.35, rimColor: X.rim, power: 2.0, grain: 0.10, scale: 2.2, eave: 0.45, rough: 0.12, tiles: 0.9, ink: 'dark' });
  const ridgeMat = dress(new THREE.MeshStandardMaterial({
    color: X.ridge, roughness: 0.52, metalness: X.roofSheen, envMapIntensity: 1.1,
  }), { rim: X.rimK * 0.35, rimColor: X.rim, power: 1.9, grain: 0.10, scale: 4.0, ink: 'dark' });
  // gỗ và ván (song cửa, bậu, sàn tầng): cũng nhận mực — cọ quét qua dải bậu dưới chân tháp không được hụt nét (đo 24/9)
  const wood = dress(new THREE.MeshStandardMaterial({ color: X.wood, roughness: 0.80, metalness: 0, envMapIntensity: 0.6 }), { ink: 'dark' });
  const board = dress(new THREE.MeshStandardMaterial({ color: X.board, roughness: 0.78, metalness: 0, envMapIntensity: 0.6 }), { ink: 'dark' });
  // 垂木 rui mè dưới hiên: hắt ánh lõi sáng trong lòng tầng — mảnh hiên bẻ lên là thấy cụm rui sáng dịu
  const rafter = new THREE.MeshStandardMaterial({ color: X.board, roughness: 0.7, metalness: 0, envMapIntensity: 0.6, emissive: new THREE.Color(X.core || 0xe8f6ef), emissiveIntensity: 0.10 });
  // 下見板張り ván gỗ sơn đen ở tầng dưới — mảng SẪM của thành Nhật (Matsumoto, Okayama).
  const itabari = dress(new THREE.MeshStandardMaterial({
    color: X.itabari, roughness: 0.62, metalness: 0, envMapIntensity: 0.9, map: lapTexture(), bumpMap: lapTexture(), bumpScale: 1.2,
  }), { rim: X.rimK * 0.4, rimColor: X.rim, power: 2.2, grain: 0.22, scale: 0.9, rough: 0.2, streak: 0.18, ink: 'dark' });
  // 障子 / 連子窓: ban ngày nhìn từ ngoài vào là ô cửa SẪM (trong nhà tối hơn trời). Chỉ bản
  // chạng vạng mới thắp đèn — và đó là nguồn ấm duy nhất trong khung.
  const paper = new THREE.MeshStandardMaterial({
    color: X.paper, roughness: 0.95, metalness: 0,
    emissive: C(X.paperE), emissiveIntensity: X.paperK,
    side: THREE.DoubleSide, envMapIntensity: 0.4,
  });
  const sama = new THREE.MeshStandardMaterial({
    color: X.sama, roughness: 0.9, metalness: 0, side: THREE.DoubleSide,
    emissive: C(0x000000), emissiveIntensity: 0,
  });
  // vách mỏm đá tự nhiên: sẫm, ẩm, loang rêu
  const rock = dress(new THREE.MeshStandardMaterial({
    color: X.rock, roughness: 0.98, metalness: 0, envMapIntensity: 0.55,
  }), { rim: X.rimK * 0.3, rimColor: X.rim, grain: 0.45, scale: 0.9, fine: false, rough: 0.22,
        occ: [-26, 3, 0.45], bounce: [6.0, 20.0, 0.0, 0.30], bounceColor: X.rim,
        streak: 0.25, mottle: 0.6, mottleColor: L.near.shade, bump: 1.2, bumpScale: 0.35 });
  return { stone, stoneCore, stoneCoreDim, rafter, plaster, roof, ridgeMat, wood, board, itabari, paper, sama, rock };
}

// ───────── 石垣 nền đá xếp ─────────
// 野面積み nozura-zumi: đá tự nhiên, không đẽo vuông, ghép khít không vữa.
// Mặt nền cong lõm 扇の勾配: dốc đứng dần lên trên như đường cong cánh quạt.
export const IS = { H: 15, baseA: 15.7, baseB: 13.3, topA: 12.5, topB: 10.5, p: 1.55 };
const extAt = (t) => [
  IS.topA + (IS.baseA - IS.topA) * Math.pow(1 - t, IS.p),
  IS.topB + (IS.baseB - IS.topB) * Math.pow(1 - t, IS.p),
];

function smoothNormals(geo) {
  const p = geo.attributes.position;
  geo.computeVertexNormals();
  const n = geo.attributes.normal, acc = new Map();
  const key = (i) => Math.round(p.getX(i) * 1000) + '_' + Math.round(p.getY(i) * 1000) + '_' + Math.round(p.getZ(i) * 1000);
  for (let i = 0; i < p.count; i++) {
    const k = key(i), a = acc.get(k);
    if (a) { a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); }
    else acc.set(k, [n.getX(i), n.getY(i), n.getZ(i)]);
  }
  for (let i = 0; i < p.count; i++) {
    const a = acc.get(key(i));
    const L = Math.hypot(a[0], a[1], a[2]) || 1;
    n.setXYZ(i, a[0] / L, a[1] / L, a[2] / L);
  }
  n.needsUpdate = true;
  return geo;
}

// ───────── dáng tảng đá: TẤM HỘP VÁT CẠNH, không phải khối tròn ─────────
// Đây là chỗ sai lớn nhất của mấy vòng trước. Khối băng của igloo là một tấm phẳng to như
// viên gạch: MẶT PHẲNG RỘNG (và tối), CẠNH VÁT MỀM (và trắng rực). Khối tròn thì không có
// mặt phẳng nào, nên viền sáng trải đều khắp thân và tảng đá hoá ra bỏng ngô.
// Dựng bằng siêu elipxoit: số mũ nhỏ → mặt phẳng, góc bo.
// Đá thành Nhật cũng đúng như vậy: 打込み接ぎ / 切込み接ぎ là đá ĐẼO rồi ghép, không phải đá cuội.
function roundedSlab(e1, e2, Nu, Nv) {
  const cw = (w, m) => { const t = Math.cos(w); return Math.sign(t) * Math.pow(Math.abs(t), m); };
  const sw = (w, m) => { const t = Math.sin(w); return Math.sign(t) * Math.pow(Math.abs(t), m); };
  const pos = [], idx = [];
  for (let j = 0; j <= Nv; j++) {
    const v = -Math.PI / 2 + (j / Nv) * Math.PI;
    for (let i = 0; i <= Nu; i++) {
      const u = (i / Nu) * Math.PI * 2;
      pos.push(0.5 * cw(v, e1) * cw(u, e2), 0.5 * sw(v, e1), 0.5 * cw(v, e1) * sw(u, e2));
    }
  }
  for (let j = 0; j < Nv; j++) for (let i = 0; i < Nu; i++) {
    const a = j * (Nu + 1) + i, b = a + 1, c = a + Nu + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function slabGeoms(rng) {
  const out = [];
  // Mỗi biến thể một độ vát khác nhau, VÀ hai tới ba góc bị bạt thành mặt vát chéo.
  // 打込み接ぎ là ĐÁ ĐA GIÁC ghép như trò xếp hình — nếu tảng nào cũng là chữ nhật bo bốn góc
  // thì dù to cỡ nào nhìn vẫn ra tường gạch.
  // Số mũ siêu elip càng nhỏ thì tảng càng VUÔNG THÀNH. Bản trước (0,19–0,35) bo quá tay:
  // nhìn gần ở màn 3 tảng đá ra gối bông. Nhân 0,6 — mặt phẳng hơn, cạnh sắc hơn, vẫn còn bo.
  const specs = [
    [0.26, 0.24], [0.31, 0.21], [0.21, 0.30], [0.28, 0.28], [0.34, 0.24],
    [0.23, 0.35], [0.24, 0.29], [0.33, 0.27], [0.19, 0.25], [0.29, 0.33],
  ].map((e) => [e[0] * 0.6, e[1] * 0.6]);
  specs.forEach((sp, v) => {
    const g = roundedSlab(sp[0], sp[1], 30, 18);
    const p = g.attributes.position, t = new THREE.Vector3();
    // 2–3 nhát bạt góc, mỗi nhát là một mặt phẳng cắt trong mặt trước của tảng
    const cuts = [];
    const nCut = 2 + (v % 2);
    for (let c = 0; c < nCut; c++) {
      const corner = Math.floor(rng() * 4);
      const a = (Math.PI / 4) + corner * (Math.PI / 2) + (rng() - 0.5) * 0.7;
      // nhát bạt góc NÔNG (≈ 6–9% đường chéo): tảng vẫn đa giác nhưng xếp KHÍT — mạch ghép thành khe mảnh.
      // Đo bằng tia 24/9 (máy quay gần): nhát 15–20% để lại lỗ hình thoi 1–1,2 m ở chỗ bốn tảng gặp nhau, và
      // mẻ góc ±4,5% làm mép tảng lượn ±13 cm — lõi sáng lộ ra thành mảng trắng quanh mọi tảng.
      // Bản cũ bạt sâu 0,37–0,48 (≈ 40% cạnh) nên giữa bốn góc tảng hở thành hình thoi lớn, lõi sáng
      // đặt sau lộ ra thành mảng trắng. Vẫn bốc đúng hai lượt ngẫu nhiên như cũ: cách xếp đá không đổi.
      cuts.push([Math.cos(a), Math.sin(a), 0.645 + rng() * 0.035]);
    }
    for (let i = 0; i < p.count; i++) {
      t.fromBufferAttribute(p, i);
      // mẻ góc nhẹ, băm theo toạ độ nên đỉnh trùng nhau vẫn dính liền
      const h = hash3(Math.round(t.x * 600), Math.round(t.y * 600), Math.round(t.z * 600), v * 977 + 41);
      const k = 0.988 + h * 0.024;
      let x = t.x * k, yv = t.y * k, z = t.z * k;
      for (const cu of cuts) {
        const dd = x * cu[0] + yv * cu[1] - cu[2];
        if (dd > 0) { x -= cu[0] * dd; yv -= cu[1] * dd; }   // ép về đúng mặt cắt → mặt vát phẳng
      }
      p.setXYZ(i, x, yv, z);
    }
    g.computeVertexNormals();
    // VIỀN VÁT: shader cần biết mép mặt trước của tảng nằm ở đâu — bốn cạnh hộp và các nhát bạt góc.
    // Mỗi hình mang theo nhát cắt của chính nó (hằng số trên mọi đỉnh), không tiêu thêm lượt ngẫu nhiên.
    for (let c = 0; c < 3; c++) {
      const cu = cuts[c] || [1, 0, 9];
      const arr = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { arr[i * 3] = cu[0]; arr[i * 3 + 1] = cu[1]; arr[i * 3 + 2] = cu[2]; }
      g.setAttribute('aCut' + c, new THREE.BufferAttribute(arr, 3));
    }
    out.push(g);
  });
  return out;
}

function stoneGeoms(detail) {
  detail = detail || 0;
  const out = [];
  for (let v = 0; v < 6; v++) {
    const g = v < 3 ? new THREE.DodecahedronGeometry(0.5, detail) : new THREE.IcosahedronGeometry(0.5, detail);
    const p = g.attributes.position, tmp = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      tmp.fromBufferAttribute(p, i);
      // băm theo toạ độ: đỉnh trùng nhau nhận cùng một mức méo, nên khối không bị tách rời
      const h = hash3(Math.round(tmp.x * 1000), Math.round(tmp.y * 1000), Math.round(tmp.z * 1000), v * 977 + 13);
      const k = 0.70 + h * 0.64;
      p.setXYZ(i, tmp.x * k, tmp.y * k, tmp.z * k);
    }
    smoothNormals(g);
    out.push(g);
  }
  return out;
}

// Bức tường dùng CHUNG dòng số ngẫu nhiên với mây, núi và tháp dựng sau nó. Xếp lại đá mà tiêu
// số lượt bốc khác đi thì cả biển mây dịch chỗ — khung hình đã duyệt đổi theo. Bản xếp cũ bốc
// đúng 1 315 lượt (đo ngày 23/9), nên bản mới bốc thừa thì kêu, thiếu thì đốt cho đủ.
const RNG_TUONG = 1315;
// lõi 栗石 nằm lùi sau mặt ngoài tường bấy nhiêu mét (bản cũ 0,16 — lõi sáng lấp kín cả mạch)
const CORE_IN = 0.75;

export function buildIshigaki(parent, rngNgoai, M) {
  let daBoc = 0;
  const rng = () => { daBoc++; return rngNgoai(); };
  const grp = new THREE.Group();
  grp.name = 'ishigaki';
  parent.add(grp);

  // 1) lõi sáng, thụt vào — khe giữa các tảng đá lộ ra chính cái lõi này nên khe SÁNG LÊN
  const N = 112, K = 12;
  const coreRings = [];
  // bắt đầu từ k = −4: lõi đá cắm sâu xuống dưới mặt mỏm, nếu không thì chân nền đá THỦNG,
  // nhìn xuyên qua khe thấy mây đằng sau — đúng lỗi vòng trước.
  for (let k = -4; k <= K; k++) {
    const t = k / K, tc = Math.max(0, t), e = extAt(tc);
    coreRings.push(superRect(e[0] - CORE_IN, e[1] - CORE_IN, N).map((p) => new THREE.Vector3(p[0], t * IS.H, p[1])));
  }
  const core = new THREE.Mesh(loft(coreRings), M.stoneCore);
  core.receiveShadow = false;
  grp.add(core);
  const top = new THREE.Mesh(capRing(coreRings[coreRings.length - 1], IS.H), M.stoneCore);
  top.receiveShadow = false;
  grp.add(top);

  // 2) hàng trăm tảng đá, xếp theo lớp, mỗi lớp một chiều cao khác nhau
  const geos = slabGeoms(rng);
  const buckets = geos.map(() => []);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), eul = new THREE.Euler();
  const X = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3();
  const basis = new THREE.Matrix4();

  // Độ dốc của đường cong 扇の勾配 tại độ cao t: tường thụt vào bao nhiêu mét cho mỗi mét lên cao.
  // Mặt tảng đá phải NẰM ÁP theo độ dốc ấy. Nếu để tảng đứng thẳng thì mỗi lớp thụt vào một
  // bậc, mặt trên của lớp dưới lộ ra thành gờ ngang — cả bức tường hoá kim tự thápbậc thang.
  const dExt = (t) => {
    const k = Math.max(0, Math.min(1, 1 - t));
    const kp = Math.pow(k, IS.p - 1);
    return [-(IS.baseA - IS.topA) * IS.p * kp, -(IS.baseB - IS.topB) * IS.p * kp];
  };
  const U = new THREE.Vector3(), Yl = new THREE.Vector3();

  // ── RANH GIỚI LỚP LƯỢN SÓNG ──────────────────────────────────────────────
  // Mạch ngang không được là đường thẳng vắt qua cả mặt tường. Mỗi ranh giới lượn theo chu vi
  // với biên độ, số bước sóng và pha RIÊNG, nên chỗ này lớp dưới dày lớp trên mỏng, chỗ kia
  // ngược lại. Ranh trên cùng và dưới cùng phải phẳng (đỉnh đỡ thiên thủ, đáy cắm vào mỏm đá).
  const NC = 5, Y0 = -4.8, Y1 = IS.H;
  const bnd = [];
  for (let k = 0; k <= NC; k++) {
    const edge = k === 0 || k === NC;
    bnd.push({
      y0: Y0 + (Y1 - Y0) * (k / NC) + (edge ? 0 : (rng() - 0.5) * 0.7),
      amp: edge ? 0 : (0.42 + rng() * 0.78) * 0.45,   // lượn nhẹ hơn: tảng lấy chỗ hẹp nhất của dải lớp, lượn mạnh là mạch ngang há ra
      freq: 1 + Math.floor(rng() * 3),
      phase: rng() * Math.PI * 2,
    });
  }
  const bndY = (k, ang) => bnd[k].y0 + bnd[k].amp * Math.sin(ang * bnd[k].freq + bnd[k].phase);

  const mods = [];
  let course = 0, count = 0, kagami = 0;
  while (course < NC) {
    // cao độ danh nghĩa của lớp, chỉ dùng để chọn bán kính đi vòng quanh
    const yNom = (bnd[course].y0 + bnd[course + 1].y0) / 2;
    const ch = bnd[course + 1].y0 - bnd[course].y0;
    const y = bnd[course].y0;
    const tRaw = yNom / IS.H;
    const tm = THREE.MathUtils.clamp(tRaw, 0, 1);
    const ext = extAt(tm), A = ext[0], B = ext[1];
    // dưới cốt 0 tường là khối lăng trụ thẳng đứng (phần cắm vào mỏm đá), nên độ nghiêng
    // phải tắt dần về 0 — không thì mấy lớp dưới cùng loe ra thành cái váy.
    const fade = THREE.MathUtils.clamp(tRaw * 7, 0, 1);
    const d0 = dExt(tm);
    const d = [d0[0] * fade, d0[1] * fade];
    // đa giác dày để đi theo chu vi bằng độ dài cung
    const poly = superRect(A, B, 560);
    const seg = [];
    let total = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      seg.push(total);
      total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    const at = (s) => {
      s = ((s % total) + total) % total;
      let i = 0;
      while (i < seg.length - 1 && seg[i + 1] <= s) i++;
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const L = Math.max(1e-5, (i + 1 < seg.length ? seg[i + 1] : total) - seg[i]);
      const f = (s - seg[i]) / L;
      const idx = i + f;
      return {
        x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f,
        tx: (b[0] - a[0]) / L, tz: (b[1] - a[1]) / L,
        ang: (idx / poly.length) * Math.PI * 2,
      };
    };

    // ── XẾP KHÍT THẬT, KHÔNG CHỒNG LÊN NHAU ────────────────────────────────────────────────
    // Bản trước cho mỗi tảng bước tới chỉ 80–94% bề ngang của nó, rồi phóng to thêm tới 10,5%:
    // các tảng CHỒNG LÊN NHAU tới 1,3 m, tảng trước che góc bo của tảng sau. Lúc nguyên vẹn thì
    // trông như mạch ghép đa giác; nhưng tháo ra một quãng nhỏ là lộ ngay đá xuyên vào đá, và muốn
    // tách hết thì phải giãn tâm 1,4–1,7 lần — tức là lại thành vụ nổ (đo bằng phép tách
    // trục trên đỉnh thật). 打込み接ぎ thật không được làm thế: mỗi tảng đẽo vừa ĐÚNG Ô của nó.
    // Bản này chia vòng thành ô khít nhau, tảng nào nằm trọn trong ô nấy.

    // (a) chọn bề ngang cho cả vòng, rồi co giãn đều cho khít đúng chu vi — không còn chỗ nối vòng
    const s0 = rng() * 5;
    const items = [];
    let sum = 0;
    while (sum < total) {
      const r0 = rng();
      let aspect, hMul, kag = false;
      if (r0 < 0.09) { aspect = 2.05 + rng() * 0.45; hMul = 1.22 + rng() * 0.26; kag = true; }   // 鏡石 đá gương
      else if (r0 < 0.22) { aspect = 0.72 + rng() * 0.40; hMul = 1.08 + rng() * 0.34; }          // tảng ĐỨNG
      else if (r0 < 0.50) { aspect = 1.25 + rng() * 0.50; hMul = 0.94 + rng() * 0.22; }          // gần vuông
      else { aspect = 1.50 + rng() * 0.72; hMul = 0.90 + rng() * 0.18; }                         // nằm ngang
      let w = ch * hMul * aspect;
      const pk = at(s0 + sum + w / 2);
      // 算木積み: ở bốn góc, đá dài xen đá ngắn theo từng lớp
      const cn = Math.min(Math.abs(pk.x) / A, Math.abs(pk.z) / B);
      if (cn > 0.70) w = Math.min(w, ch * 1.55) * (course % 2 ? 1.14 : 0.90);
      items.push({ w, kag });
      sum += w;
    }
    if (items.length > 3 && sum - total > items[items.length - 1].w * 0.5) sum -= items.pop().w;
    const giãn = total / sum;
    let cum = 0;
    for (const it of items) { it.a0 = s0 + cum; it.w *= giãn; cum += it.w; it.a1 = s0 + cum; if (it.kag) kagami++; }

    // (b) mỗi tảng: cao độ lấy theo CHỖ HẸP NHẤT của dải lớp trên suốt bề ngang của nó.
    //     Lấy ở giữa tảng như trước thì ở chỗ ranh giới lượn sóng trũng xuống, góc tảng cắm sang lớp bên.
    for (const it of items) {
      let yLo = -Infinity, yHi = Infinity;
      for (let f = 0; f <= 6; f++) {
        const pa = at(it.a0 + (it.a1 - it.a0) * (f / 6));
        yLo = Math.max(yLo, bndY(course, pa.ang));
        yHi = Math.min(yHi, bndY(course + 1, pa.ang));
      }
      // mạch ngang HẸP (khe sáng mảnh kiểu igloo); vẫn bốc đúng hai lượt ngẫu nhiên như cũ
      it.yLo = yLo + 0.022 + rng() * 0.03;
      it.yHi = yHi - 0.022 - rng() * 0.03;
      it.chL = it.yHi - it.yLo;
      it.depth = (yHi - yLo) * (0.20 + rng() * 0.12);
      it.out = 0.01 + Math.pow(rng(), 2.2) * 0.07;
      it.p = at((it.a0 + it.a1) / 2);
    }
    // (c) mạch dọc giữa hai tảng kề nhau: rộng hẹp không đều, VÀ ở chỗ tường cong thì mở thêm đúng
    //     bằng chỗ hai lưng đá chụm vào nhau: hai tấm phẳng áp mặt cong thì mặt trước hở, lưng chạm.
    const nIt = items.length;
    const mach = items.map((it, n) => {
      const nb = items[(n + 1) % nIt];
      const cosT = THREE.MathUtils.clamp(it.p.tx * nb.p.tx + it.p.tz * nb.p.tz, -1, 1);
      const th = Math.acos(cosT);
      return 0.025 + rng() * 0.035 + Math.max(it.depth, nb.depth) * Math.tan(Math.min(th, 1.2)) * 0.85;
    });

    for (let n = 0; n < nIt; n++) {
      const it = items[n];
      const gL = mach[(n - 1 + nIt) % nIt] / 2, gR = mach[n] / 2;
      const e0 = at(it.a0), e1 = at(it.a1);
      // bề ngang THẬT của tấm phẳng = dây cung giữa hai đầu ô, không phải độ dài cung: trên đoạn cong
      // cung dài hơn dây, lấy cung làm bề ngang thì hai đầu tảng thò qua ô bên cạnh.
      const tL = THREE.MathUtils.clamp((it.yLo + it.yHi) / 2 / IS.H, 0, 1);
      const eL = extAt(tL);
      const chord = Math.hypot((e1.x - e0.x) * eL[0] / A, (e1.z - e0.z) * eL[1] / B);
      const w = Math.max(0.6, chord - gL - gR);
      const p = at((it.a0 + gL + it.a1 - gR) / 2);
      const yLo = it.yLo, yHi = it.yHi, chL = it.chL, depth = it.depth, out = it.out;
      p.x *= eL[0] / A;
      p.z *= eL[1] / B;
      X.set(p.tx, 0, p.tz).normalize();
      U.set((d[0] * p.x) / A, IS.H, (d[1] * p.z) / B).normalize();
      Z.crossVectors(X, U).normalize();
      if (Z.x * p.x + Z.z * p.z < 0) { Z.negate(); X.negate(); }
      Yl.crossVectors(Z, X).normalize();
      basis.makeBasis(X, Yl, Z);
      eul.setFromRotationMatrix(basis);
      // Xoay nhẹ thôi: mỗi phần trăm radian là góc tảng 3 m lệch 3 cm, ăn vào mạch. Dáng đa giác
      // của đá giờ là do nhát bạt góc và mạch rộng hẹp không đều, không còn do xoay chồng lên nhau.
      eul.z += (rng() - 0.5) * 0.03;
      eul.y += (rng() - 0.5) * 0.02;
      eul.x += (rng() - 0.5) * 0.02;
      q.setFromEuler(eul);
      const cosB = IS.H / Math.hypot(IS.H, (d[0] + d[1]) / 2);
      const tam = new THREE.Vector3(
        p.x + Z.x * (out - depth / 2),
        (yLo + yHi) / 2 + Z.y * (out - depth / 2),
        p.z + Z.z * (out - depth / 2)
      );
      const scl = new THREE.Vector3(w, chL / cosB, depth);
      mtx.compose(tam, q, scl);
      const bi = (count + course) % geos.length;
      // Mỗi tảng là MỘT MÔ-ĐUN điều khiển được. `c0` là TÂM THẬT của tảng (chỗ ma trận đặt nó),
      // khác `pos` (điểm trên mặt tường). Bản trước dựng lại tảng ở `pos` mỗi khi nó nhúc nhích,
      // nên tảng nào động một li là NHẢY ra ngoài nửa bề dày của nó (~0,5 m) — và vì đá trên cao
      // luôn "thở", cả mấy lớp trên đã đứng chênh ra 0,5 m từ vòng rê chuột tới giờ.
      mods.push({
        bucket: bi, idx: buckets[bi].length,
        pos: new THREE.Vector3(p.x, (yLo + yHi) / 2, p.z),
        c0: tam.clone(),
        nrm: Z.clone(),
        quat: q.clone(), scl: scl.clone(),
        axis: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(),
        rand: rng(), course, width: w, kagami: it.kag,
      });
      buckets[bi].push(mtx.clone());
      count++;
    }
    course++;
  }

  const meshes = [];
  const tone = new THREE.Color();
  buckets.forEach((list, i) => {
    geos[i].setAttribute('aPush', new THREE.InstancedBufferAttribute(new Float32Array(list.length), 1));
    const im = new THREE.InstancedMesh(geos[i], M.stone, list.length);
    list.forEach((m, j) => {
      im.setMatrixAt(j, m);
      // đá thật không đồng màu: mỗi tảng một tông riêng, lệch nhau tới ±18%
      const v = 0.80 + rng() * 0.30;
      im.setColorAt(j, tone.setRGB(v, v, v));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true;
    // giữ từng tảng điều khiển được: bản thật sẽ phải tháo ra rồi ráp lại từng tảng một
    im.name = 'da-xep-' + i;
    im.userData.matrices = list;
    im.frustumCulled = false;   // tảng bật ra có thể vượt hộp bao ban đầu
    grp.add(im);
    meshes.push(im);
  });
  for (const m of mods) m.mesh = meshes[m.bucket];

  // 3) gờ đá nhô ra ở đỉnh (武者返し) — làm dày mép trên, cho nền đá có mũ
  const e1 = extAt(1);
  // gờ đỉnh CHIA MẢNH theo chu vi (24 mảnh): rê chuột thì mỗi mảnh giãn ra theo các tảng hàng trên cùng
  // nằm ngay dưới nó. Cả vành giãn một lượt thì thành cái đĩa mỏng chìa ra khắp bốn phía.
  const capRings = [
    superRect(e1[0] + 0.05, e1[1] + 0.05, N).map((p) => new THREE.Vector3(p[0], IS.H - 0.55, p[1])),
    superRect(e1[0] + 0.60, e1[1] + 0.60, N).map((p) => new THREE.Vector3(p[0], IS.H + 0.10, p[1])),
    superRect(e1[0] + 0.38, e1[1] + 0.38, N).map((p) => new THREE.Vector3(p[0], IS.H + 0.44, p[1])),
  ];
  const capFull = loft(capRings);
  const cfn = capFull.attributes.normal, capNorm = [];
  for (let k = 0; k < 3; k++) { const row = []; for (let i = 0; i < N; i++) { const j = k * (N + 1) + i; row.push(new THREE.Vector3(cfn.getX(j), cfn.getY(j), cfn.getZ(j))); } capNorm.push(row); }
  capFull.dispose();
  const cap = new THREE.Group();
  cap.name = 'go-dinh';
  const NCAP = 24;
  for (let j = 0; j < NCAP; j++) {
    const i0 = Math.round((j * N) / NCAP), i1 = Math.round(((j + 1) * N) / NCAP);
    const m = new THREE.Mesh(loftPart(capRings, capNorm, 0, 2, i0, i1, 1), M.stone);
    m.castShadow = true; m.receiveShadow = true;
    const mid = capRings[1][Math.round((i0 + i1) / 2) % N];
    m.userData.cap = { rel: new THREE.Vector3(mid.x, 0, mid.z), a0: Math.atan2(capRings[1][i0 % N].z, capRings[1][i0 % N].x), a1: Math.atan2(capRings[1][i1 % N].z, capRings[1][i1 % N].x) };
    cap.add(m);
  }
  grp.add(cap);

  if (daBoc > RNG_TUONG) console.error('[kozo] bức tường bốc ' + daBoc + ' lượt ngẫu nhiên, quá ' + RNG_TUONG + ' — mây sẽ dịch chỗ');
  while (daBoc < RNG_TUONG) rng();
  cap.name = 'go-dinh';
  return { group: grp, stoneCount: count, courses: course, kagami, meshes, mods, core, cap };
}

// một hình tảng đá cho đá rải trên sườn đồi (không đụng dòng số ngẫu nhiên của nền đá)
export function slabGeo() {
  const g = roundedSlab(0.55, 0.45, 18, 12);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const h = hash3(Math.round(v.x * 500), Math.round(v.y * 500), Math.round(v.z * 500), 77);
    p.setXYZ(i, v.x * (0.9 + h * 0.2), v.y * (0.9 + h * 0.2), v.z * (0.9 + h * 0.2));
  }
  g.computeVertexNormals();
  return g;
}

// ───────── mỏm đá / sống núi công trình đứng lên ─────────
export function buildOutcrop(scene, rng, M) {
  const grp = new THREE.Group();
  grp.name = 'mom da';
  scene.add(grp);

  const N = 148, K = 26;
  const rings = [];
  for (let k = 0; k <= K; k++) {
    const t = k / K;                         // t=0 dưới sâu, t=1 sát chân nền đá
    const y = -40 + t * 38.4;
    const r = 0.80 + (1 - t) * 0.26;
    const ring = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      // Gợn nhẹ thôi. Trước đây có thêm một "thềm đá" thò ra: nó dựng thành một TẤM PHẲNG đứng
      // giữa biển mây, nhìn như miếng bìa. Bỏ hẳn.
      // Pha của mỗi sóng phải CHẠY THEO ĐỘ CAO. Nếu không, mấy cái gợn xếp thẳng hàng từ
      // chân lên đỉnh thành những NẾP DỌC THẲNG BĂNG — nhìn ra mấy cây cột trắng dựng giữa mây.
      const lump = 1
        + 0.125 * Math.sin(a * 3 + 1.2 + t * 2.6)
        + 0.085 * Math.sin(a * 5.3 - 0.4 - t * 4.1)
        + 0.045 * Math.sin(a * 9 + 2.1 + t * 7.3);
      const R = 30.0 * r * lump * (1 + 0.09 * Math.sin(t * 8.5 + a * 2.0));
      ring.push(new THREE.Vector3(Math.cos(a) * R, y + Math.sin(a * 4 + t * 5) * 1.0, Math.sin(a) * R * 0.90));
    }
    rings.push(ring);
  }
  const rock = new THREE.Mesh(loft(rings), M.rock);
  rock.name = 'vach-mom';
  rock.castShadow = true; rock.receiveShadow = true;
  grp.add(rock);

  // tảng lớn rời rạc bám quanh mỏm — chân công trình tiếp đất thật, có bóng tiếp xúc
  const geos = slabGeoms(rng);
  const lists = geos.map(() => []);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  let n = 0;
  for (let i = 0; i < 0; i++) {
    const a = rng() * Math.PI * 2;
    const t = Math.pow(rng(), 0.7);
    const yy = -6.0 - t * 11;
    const R = 19 + t * 11 + rng() * 5;
    e.set(rng() * 3, rng() * 6.3, rng() * 3);
    q.setFromEuler(e);
    const s = 7.0 + Math.pow(rng(), 1.2) * 6.0;
    mtx.compose(
      new THREE.Vector3(Math.cos(a) * R, yy, Math.sin(a) * R * 0.9),
      q, new THREE.Vector3(s * 1.05, s * (0.72 + rng() * 0.26), s * (0.92 + rng() * 0.26))
    );
    lists[i % geos.length].push(mtx.clone());
    n++;
  }
  const tone = new THREE.Color();
  lists.forEach((list, i) => {
    const im = new THREE.InstancedMesh(geos[i], M.rock, list.length);
    list.forEach((m, j) => {
      im.setMatrixAt(j, m);
      const v = 0.84 + rng() * 0.30;
      im.setColorAt(j, tone.setRGB(v, v, v));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true;
    grp.add(im);
  });
  return { group: grp, boulders: n };
}

// ───────── mái ngói cong, đầu đao hất lên ─────────
// góc tham số của vành hiên rải ĐỀU THEO CHIỀU DÀI. Cách cũ rải đều theo góc: siêu elip vuông thành
// nên cả một mặt dài nằm gọn trong 2–3 bước — không cắt được thành mảnh mái đều nhau.
function evenAngles(EA, EB, N) {
  const M2 = 4096, sq = 0.22, cum = [0];
  let px = EA, pz = 0;
  for (let j = 1; j <= M2; j++) {
    const ang = (j / M2) * Math.PI * 2, cx = Math.cos(ang), cz = Math.sin(ang);
    const x = EA * Math.sign(cx) * Math.pow(Math.abs(cx), sq), z = EB * Math.sign(cz) * Math.pow(Math.abs(cz), sq);
    cum.push(cum[j - 1] + Math.hypot(x - px, z - pz));
    px = x; pz = z;
  }
  const L = cum[M2], out = [];
  let j = 0;
  for (let i = 0; i < N; i++) {
    const s = (i / N) * L;
    while (j < M2 - 1 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
    out.push(((j + f) / M2) * Math.PI * 2);
  }
  return out;
}

function roofRings(EA, EB, H, K, angs) {
  K = K || 7;
  const N = angs.length, ra = EA * 0.30, sq = 0.22, rings = [];
  for (let k = 0; k <= K; k++) {
    const t = k / K;
    const a = EA + (ra - EA) * t;
    const b = EB * (1 - t) + 0.05;
    const yBase = H * Math.pow(t, 1.85);
    const ring = [];
    for (let i = 0; i < N; i++) {
      const ang = angs[i];
      const cx = Math.cos(ang), cz = Math.sin(ang);
      const fx = Math.pow(Math.abs(cx), sq), fz = Math.pow(Math.abs(cz), sq);
      const x = a * Math.sign(cx) * fx, z = b * Math.sign(cz) * fz;
      const cn = Math.min(1, Math.min(fx, fz) / 0.9254);
      const c3 = Math.pow(cn, 3.0), fall = Math.pow(1 - t, 2.2);
      const lift = H * 0.42 * c3 * fall;                    // 反り đầu đao hất lên
      const push = 1 + 0.095 * c3 * fall;
      ring.push(new THREE.Vector3(x * push, yBase + lift, z * push));
    }
    rings.push(ring);
  }
  // diềm mái dày: mái ngói Nhật dày 300–400 mm kể cả rui mè, đầu mái còn dày hơn
  const lipOut = rings[0].map((p) => new THREE.Vector3(p.x * 1.016, p.y - 0.34, p.z * 1.016));
  const lipLow = rings[0].map((p) => new THREE.Vector3(p.x * 1.008, p.y - 1.75, p.z * 1.008));
  const soffit = rings[0].map((p) => new THREE.Vector3(p.x * 0.88, p.y - 1.95, p.z * 0.88));
  return [soffit, lipLow, lipOut].concat(rings);
}

// một mảnh của mặt loft: vành k0..k1, cột i0..i1 (i1 có thể vượt N — vòng lại). Vị trí và PHÁP TUYẾN lấy
// từ mặt liền (norm), nên các mảnh ghép lại lúc nghỉ không lộ đường nối bóng đổ.
function loftPart(rings, norm, k0, k1, i0, i1, uS) {
  const N = rings[0].length, K = rings.length;
  const pos = [], nor = [], uv = [], idx = [];
  const ni = i1 - i0 + 1;
  for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
    const ii = ((i % N) + N) % N, p = rings[k][ii], n = norm[k][ii];
    pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z);
    uv.push((i / N) * uS, k / (K - 1));
  }
  for (let k = 0; k < k1 - k0; k++) for (let i = 0; i < ni - 1; i++) {
    const a = k * ni + i, b = a + 1, c = (k + 1) * ni + i + 1, d = (k + 1) * ni + i;
    idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// Mái = PHẦN ĐỈNH đứng yên (cả chỗ tầng trên cắm xuyên qua) + VÀNH HIÊN chia thành nhiều mảnh theo chiều
// dài hiên (~3 m một mảnh). Rê chuột tới gần thì mảnh hiên BẺ RA NGOÀI quanh bản lề ở mép trong của nó
// — như cánh hoa hé — lộ rui mè bên dưới. Tầng trên không nhúc nhích (Mike 24/9: không nhấc cả vành).
const ROOF_KSTAR = 2;   // bản lề ở vành thứ 2/7 tính từ hiên — ngoài chân tường tầng trên ≥ 1 m ở cả ba mái
function buildRoof(parent, EA, EB, H, M, opt) {
  const irimoya = opt && opt.irimoya;
  const N = 176;
  const angs = evenAngles(EA, EB, N);
  const rings = roofRings(EA, EB, H, 7, angs);
  const K = rings.length, KH = 3 + ROOF_KSTAR;
  const per = 2 * Math.PI * Math.sqrt((EA * EA + EB * EB) / 2) * 0.92;
  const uS = Math.max(8, Math.round(per / 0.45));   // một hàng ngói ~45 cm
  // pháp tuyến của cả mặt liền (dùng chung cho mọi mảnh)
  const full = loft(rings, uS);
  const fn = full.attributes.normal, NV = N + 1, norm = [];
  for (let k = 0; k < K; k++) { const row = []; for (let i = 0; i < N; i++) { const j = k * NV + i; row.push(new THREE.Vector3(fn.getX(j), fn.getY(j), fn.getZ(j))); } norm.push(row); }
  // mái nguyên vẹn, vô hình: đích bắn tia của con trỏ (mảnh hiên bẻ đi thì điểm chạm không nhảy)
  const hitM = new THREE.Mesh(full, new THREE.MeshBasicMaterial());
  hitM.visible = false;
  hitM.name = 'dich-mai';
  parent.add(hitM);

  // phần đỉnh: đứng yên
  const crown = new THREE.Mesh(loftPart(rings, norm, KH, K - 1, 0, N, uS), M.roof);
  crown.castShadow = true; crown.receiveShadow = true;
  crown.name = 'mai-dinh';
  parent.add(crown);

  // các mảnh hiên
  const nSeg = Math.max(8, Math.round(per / 3.1));
  const bnd = []; for (let j = 0; j <= nSeg; j++) bnd.push(Math.round((j * N) / nSeg));
  const segs = [];
  const tmpQ = new THREE.Quaternion(), probe = new THREE.Vector3();
  for (let j = 0; j < nSeg; j++) {
    const i0 = bnd[j], i1 = bnd[j + 1];
    const g = new THREE.Group();
    g.name = 'manh-hien';
    g.matrixAutoUpdate = false;
    parent.add(g);
    const m = new THREE.Mesh(loftPart(rings, norm, 0, KH, i0, i1, uS), M.roof);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    // bản lề: dây cung nối hai đầu mép trong của mảnh
    const P0 = rings[KH][i0 % N].clone(), P1 = rings[KH][i1 % N].clone();
    const A = P1.clone().sub(P0).normalize();
    const mid = Math.round((i0 + i1) / 2) % N;
    const eave = rings[3][mid].clone();
    // chiều quay: đầu hiên phải đi LÊN
    probe.copy(eave).sub(P0).applyQuaternion(tmpQ.setFromAxisAngle(A, 0.1)).add(P0);
    if (probe.y < eave.y) A.negate();
    segs.push({ group: g, mesh: m, H: P0, A, eave, i0, i1, lip: rings[0][mid].clone() });
  }
  const segOf = (i) => { for (let j = 0; j < nSeg; j++) if (i >= bnd[j] && i < bnd[j + 1]) return j; return nSeg - 1; };

  // ── 軒丸瓦 đầu ngói ống (đi theo mảnh hiên) + 垂木 rui mè (đứng yên — mảnh hiên bẻ lên thì lộ ra) ──
  const soffitR = rings[0], lipOutR = rings[2];
  const nTile = Math.max(12, Math.round(per / 0.58));
  const stepT = Math.max(1, Math.round(N / nTile));
  const tGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.34, 10);
  tGeo.rotateX(Math.PI / 2);
  const rGeo = new THREE.BoxGeometry(1, 1, 1);
  const tiles = [], rList = [];
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
  const _dir = new THREE.Vector3(), ZAX = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < N; i += stepT) {
    const o = lipOutR[i], iv = soffitR[i];
    _dir.subVectors(o, iv);
    const len = _dir.length() || 0.001;
    _dir.divideScalar(len);
    _q.setFromUnitVectors(ZAX, _dir);
    _p.copy(o).addScaledVector(_dir, 0.10);
    _m.compose(_p, _q, new THREE.Vector3(1, 1, 1));
    tiles.push({ m: _m.clone(), seg: segOf(i) });
    _p.copy(iv).lerp(o, 0.52).y -= 0.05;
    _m.compose(_p, _q, new THREE.Vector3(0.11, 0.15, len * 0.94));
    rList.push(_m.clone());
  }
  const tileIM = new THREE.InstancedMesh(tGeo, M.ridgeMat, tiles.length);
  tiles.forEach((tt, i) => tileIM.setMatrixAt(i, tt.m));
  tileIM.instanceMatrix.needsUpdate = true;
  tileIM.castShadow = true;
  tileIM.frustumCulled = false;
  tileIM.name = 'dau-ngoi-ong';
  parent.add(tileIM);
  const rIm = new THREE.InstancedMesh(rGeo, M.rafter || M.board, rList.length);
  rList.forEach((mm, i) => rIm.setMatrixAt(i, mm));
  rIm.instanceMatrix.needsUpdate = true;
  rIm.name = 'rui-me';
  parent.add(rIm);

  // 降棟 bốn sống mái: phần trên đứng yên, phần dưới (trên vành hiên) đi theo mảnh hiên ở góc ấy
  for (const target of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    let ci = 0, bd = 9;
    angs.forEach((a, i) => { const d = Math.abs(a - target); if (d < bd) { bd = d; ci = i; } });
    const up = [], lo = [];
    for (let k = KH; k < K; k++) up.push(rings[k][ci].clone().multiplyScalar(1.004));
    for (let k = 1; k <= KH; k++) lo.push(rings[k][ci].clone().multiplyScalar(1.004));
    const t1 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(up), 16, 0.26, 6, false), M.ridgeMat);
    t1.castShadow = true;
    parent.add(t1);
    const t2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lo), 10, 0.26, 6, false), M.ridgeMat);
    t2.castShadow = true;
    segs[segOf(ci)].group.add(t2);
  }
  // 大棟 nóc chính
  const ra = EA * 0.30 * 0.93;
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(ra * 2 + 0.5, 0.66, 0.80), M.ridgeMat);
  ridge.position.y = H + 0.18;
  ridge.castShadow = true;
  parent.add(ridge);

  // 入母屋 đầu hồi hai đầu nóc
  if (irimoya) {
    [1, -1].forEach((sx) => {
      const w = EB * 0.80, h = H * 0.50;
      const sh = new THREE.Shape();
      sh.moveTo(-w, 0); sh.lineTo(w, 0); sh.lineTo(0, h); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: false });
      g.rotateY(Math.PI / 2);
      const m = new THREE.Mesh(g, M.plaster);
      m.position.set(sx * ra * 1.02, H - h * 0.66, 0);
      m.castShadow = true;
      parent.add(m);
      [1, -1].forEach((s2) => {
        const L = Math.hypot(w, h);
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, L, 0.20), M.board);
        b.position.set(sx * ra * 1.02 + sx * 0.16, H - h * 0.66 + h / 2, (s2 * w) / 2);
        b.rotation.x = s2 * Math.atan2(w, h);
        parent.add(b);
      });
    });
  }
  return { mesh: crown, ridgeY: H + 0.18, ra, segs, tileIM, tiles, hit: hitM };
}

// 千鳥破風 đầu hồi tam giác gắn trên mặt mái
function buildHafu(parent, w, h, y, z, M) {
  const sh = new THREE.Shape();
  sh.moveTo(-w, 0); sh.lineTo(w, 0); sh.lineTo(0, h); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false });
  const m = new THREE.Mesh(g, M.plaster);
  m.position.set(0, y, z);
  m.castShadow = true;
  parent.add(m);
  const L = Math.hypot(w, h);
  [1, -1].forEach((s) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, L, 0.26), M.board);
    b.position.set((s * w) / 2, y + h / 2, z + 0.66);
    b.rotation.z = -s * Math.atan2(w, h);
    parent.add(b);
  });
  return m;
}

// 鯱 shachihoko — đôi cá hoá rồng trên nóc
function buildShachi(parent, x, y, M) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), M.ridgeMat);
  body.scale.set(0.46, 1.0, 0.40);
  body.position.y = 0.42;
  body.rotation.z = 0.24;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), M.ridgeMat);
  head.position.set(0.13, 0.06, 0);
  g.add(head);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.66, 4, 1, true), M.ridgeMat);
  tail.scale.set(1, 1, 0.34);
  tail.position.set(-0.20, 1.02, 0);
  tail.rotation.z = -0.55;
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.4, 3), M.ridgeMat);
  fin.scale.set(1, 1, 0.3);
  fin.position.set(0.02, 0.72, 0);
  g.add(fin);
  g.position.set(x, y, 0);
  g.scale.setScalar(1.15);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  parent.add(g);
  return g;
}

// ───────── 天守 thiên thủ các ─────────
export const TIERS = [
  // winFace = số ô cửa trên bốn mặt [trước, phải, sau, trái]. 0 = tường bịt kín.
  // Thêm chi tiết không chữa được bệnh "bánh cưới nhiều tầng" — vấn đề là SỐ TẦNG.
  // Thiên thủ BA TẦNG là có thật và rất phổ biến: Inuyama, Uwajima, Marugame.
  // Giữ nguyên tổng chiều cao, chia cho 3 thay vì 5 → mỗi tầng có MẢNG TƯỜNG TRẮNG LỚN.
  { a: 10.4, b: 8.5, h: 9.6, roof: 4.0, eave: 2.35, winFace: [4, 2, 3, 2], wy: 0.62, hafu: 0, ita: 0.26 },
  { a: 8.2, b: 6.7, h: 8.2, roof: 3.7, eave: 2.10, winFace: [3, 2, 3, 2], wy: 0.60, hafu: 5.6, ita: 0.20 },
  { a: 6.0, b: 4.9, h: 6.8, roof: 4.2, eave: 1.95, winFace: [3, 2, 3, 2], wy: 0.56, hafu: 0, ita: 0 },
];

export function buildTenshu(parent, rng, M) {
  const grp = new THREE.Group();
  grp.name = 'tenshu';
  grp.position.y = IS.H + 0.44;
  parent.add(grp);
  const Y0 = grp.position.y;
  // Dòng số ngẫu nhiên RIÊNG cho các ô tường: dòng chung còn dùng để dựng biển mây sau toà tháp — tiêu
  // khác số lượt là mây dịch chỗ. Từ dòng chung chỉ bốc đúng 6 lượt mỗi tầng như bản cũ.
  const lr = rng32(20260924);

  let panes = 0, samas = 0;
  const cells = [], frames = [], roofs = [], hits = [];
  const TK = 0.42;          // bề dày vách (tấm vách cũ)
  const TKC = 0.80;         // bề dày Ô: dày thêm vào phía trong (lúc nghỉ không thấy), bật ra thì lộ hông khối chắc như khối băng
  const GAP = 0.001;        // mạch giữa hai ô lúc nghỉ: khít — tường trát trông liền như cũ
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const bx = new THREE.Vector3(), by = new THREE.Vector3(0, 1, 0), bz = new THREE.Vector3(), basis = new THREE.Matrix4();
  // danh sách instance của từng loại (đổ vào InstancedMesh ở cuối)
  const L = { plaster: [], ita: [], pane: [], bar: [], board: [], sama: [[], [], []] };
  const push = (list, m) => { list.push(m.clone()); return list.length - 1; };

  let y = 0, topY = 0;
  TIERS.forEach((T, ti) => {
    const faceR = [rng(), rng(), rng(), rng()];
    const tierStruct = new THREE.Group();
    tierStruct.name = 'khung-tang-' + ti;
    grp.add(tierStruct);

    const sill = new THREE.Mesh(new THREE.BoxGeometry(T.a * 2 + 0.18, 0.32, T.b * 2 + 0.18), M.board);
    sill.position.y = y + 0.24;
    sill.castShadow = true;
    tierStruct.add(sill);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(T.a * 2 - 0.9, 0.34, T.b * 2 - 0.9), M.board);
    floor.position.y = y + 0.5;
    floor.receiveShadow = true;
    tierStruct.add(floor);
    // lòng tầng sáng DỊU (nền) — lưới cột kèo phía trước nó sáng RỰC: tách ô ra là thấy lưới sáng in lên nền
    {
      const gh = T.h - 0.55 + 0.7;
      const g = new THREE.BoxGeometry((T.a - 1.4) * 2, gh, (T.b - 1.4) * 2);
      g.translate(0, Y0 + y + 0.55 + gh / 2, 0);
      const inner = new THREE.Mesh(g, M.stoneCoreDim);
      inner.position.y = -Y0;
      inner.name = 'loi-tang-' + ti;
      tierStruct.add(inner);
    }
    const colA = T.a - 1.15, colB = T.b - 1.15;
    const CS = ti === 0 ? 0.56 : 0.46;
    for (const cc of [[-colA, -colB], [-colA, colB], [colA, -colB], [colA, colB], [0, 0]]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(CS, T.h - 0.3, CS), M.wood);
      col.position.set(cc[0], y + 0.5 + (T.h - 0.3) / 2, cc[1]);
      col.castShadow = true;
      tierStruct.add(col);
    }

    // ── VÁCH CHIA Ô theo lưới khung gỗ thật (Mike 24/9: "tách tường thành các ô") ────────────────
    // bề ngang theo gian 間 ~1,8 m, bề cao theo xà ngang 貫 ~1,37 m. Mỗi ô là MỘT mô-đun rê chuột.
    const nRows = Math.max(4, Math.round(T.h / 1.37)), rowH = T.h / nRows;
    const itaLo = T.ita ? T.h * 0.15 : -1, itaHi = T.ita ? T.h * (0.15 + T.ita) : -1;
    const lat = [];   // lưới cột kèo phát sáng ngay sau vách (toạ độ cả toà)
    for (let face = 0; face < 4; face++) {
      const nx = face === 1 ? 1 : face === 3 ? -1 : 0;
      const nz = face === 0 ? 1 : face === 2 ? -1 : 0;
      const outD = face % 2 === 0 ? T.b : T.a;
      const span = face % 2 === 0 ? (T.a - TKC) * 2 : T.b * 2;
      const nCols = Math.max(3, Math.round(span / 1.8)), colW = span / nCols;
      bz.set(nx, 0, nz);
      bx.set(face === 0 ? 1 : face === 2 ? -1 : 0, 0, face === 1 ? -1 : face === 3 ? 1 : 0);
      basis.makeBasis(bx, by, bz);
      q.setFromRotationMatrix(basis);
      const cellAt = new Map();
      for (let c = 0; c < nCols; c++) for (let r = 0; r < nRows; r++) {
        const u = -span / 2 + (c + 0.5) * colW, yc = y + (r + 0.5) * rowH;
        const c0 = new THREE.Vector3(nx * (outD - TKC / 2), yc, nz * (outD - TKC / 2)).addScaledVector(bx, u);
        const scl = new THREE.Vector3(colW - 2 * GAP, rowH - 2 * GAP, TKC);
        const isIta = yc - y > itaLo && yc - y < itaHi;
        mtx.compose(c0, q, scl);
        const list = isIta ? L.ita : L.plaster;
        const cell = {
          tier: ti, face, col: c, row: r, nCols, nRows, c0, quat: q.clone(), scl, nrm: bz.clone(), tan: bx.clone(),
          kind: isIta ? 'ita' : 'plaster', idx: push(list, mtx), att: [], rand: lr(), dist: outD,
          lip: 0.88 * (outD + T.eave) - outD,
          // hàng trên cùng nằm dưới vành hiên thõng 1,95 m: chỉ được ra trong chỗ trống dưới vành
          underLip: (r + 1) * rowH > T.h - 1.95 - 0.02, bottom: r === 0, top: r === nRows - 1, win: false,
        };
        cells.push(cell);
        cellAt.set(c + ',' + r, cell);
        // tấm ván đầu dải 板張り (mép trên của dải ván đen)
        if (isIta && (r + 1.5) * rowH > itaHi) {
          const lm = new THREE.Matrix4().compose(new THREE.Vector3(0, rowH / 2 - 0.1, TKC / 2 + 0.02), new THREE.Quaternion(), new THREE.Vector3(colW - 0.004, 0.22, 0.12));
          cell.att.push({ kind: 'board', local: lm, idx: push(L.board, mtx.clone().multiply(lm.clone().premultiply(new THREE.Matrix4().makeScale(1 / scl.x, 1 / scl.y, 1 / scl.z)))) });
        }
      }
      // cửa sổ 格子窓: giữ số lượng và thứ tự như bản cũ, đặt vào ô gần nhất
      const along = face % 2 === 0 ? T.a : T.b;
      const nWin = T.winFace[face];
      const wy = T.h * T.wy;
      const rw = Math.min(nRows - 1, Math.max(0, Math.round(wy / rowH - 0.5)));
      const ww = Math.min(1.5, colW - 0.34), wh = Math.min(1.3, rowH - 0.26);
      for (let i2 = 0; i2 < nWin; i2++) {
        const f = (i2 + 0.5) / nWin - 0.5;
        const ax = (f + (ti % 2 ? 0.07 : -0.06)) * along * 1.58;
        const u = face === 0 || face === 3 ? ax : -ax;
        let c = Math.min(nCols - 1, Math.max(0, Math.round((u + span / 2) / colW - 0.5)));
        for (const dc of [0, 1, -1, 2, -2]) { const k = cellAt.get((c + dc) + ',' + rw); if (k && !k.win && k.kind === 'plaster') { c += dc; break; } }
        const cell = cellAt.get(c + ',' + rw);
        if (!cell || cell.win) continue;
        cell.win = true; panes++;
        const frameM = new THREE.Matrix4().compose(cell.c0, cell.quat, new THREE.Vector3(1, 1, 1));
        const addA = (kind, lm) => cell.att.push({ kind, local: lm, idx: push(L[kind], frameM.clone().multiply(lm)) });
        addA('pane', new THREE.Matrix4().compose(new THREE.Vector3(0, 0, TKC / 2 + 0.02), new THREE.Quaternion(), new THREE.Vector3(ww, wh, 1)));
        for (let b = 0; b < 6; b++) {
          const bf = (b + 0.5) / 6 - 0.5;
          addA('bar', new THREE.Matrix4().compose(new THREE.Vector3(bf * ww, 0, TKC / 2 + 0.07), new THREE.Quaternion(), new THREE.Vector3(0.06, wh + 0.14, 0.08)));
        }
        for (const s of [-1, 1]) addA('bar', new THREE.Matrix4().compose(new THREE.Vector3(0, s * (wh / 2 + 0.06), TKC / 2 + 0.07), new THREE.Quaternion(), new THREE.Vector3(ww + 0.2, 0.1, 0.09)));
        // song ngang giữa 格子 (lưới ô vuông của cửa sổ)
        addA('bar', new THREE.Matrix4().compose(new THREE.Vector3(0, 0, TKC / 2 + 0.06), new THREE.Quaternion(), new THREE.Vector3(ww, 0.045, 0.05)));
      }
      // lỗ châu mai 狭間
      const nS = 2 + ((ti + face) % 3);
      for (let i2 = 0; i2 < nS; i2++) {
        const f = (i2 + 0.5) / nS - 0.5;
        const ax = f * along * 1.66;
        const u = face === 0 || face === 3 ? ax : -ax;
        const sy = T.h * (i2 % 2 ? 0.24 : 0.85);
        const c = Math.min(nCols - 1, Math.max(0, Math.round((u + span / 2) / colW - 0.5)));
        const r = Math.min(nRows - 1, Math.max(0, Math.round(sy / rowH - 0.5)));
        const cell = cellAt.get(c + ',' + r);
        if (!cell || cell.win || cell.sama) continue;
        cell.sama = true; samas++;
        const kind = (i2 + ti + face) % 3;
        const frameM = new THREE.Matrix4().compose(cell.c0, cell.quat, new THREE.Vector3(1, 1, 1));
        const lm = new THREE.Matrix4().makeTranslation(0, 0, TKC / 2 + 0.02);
        cell.att.push({ kind: 'sama' + kind, local: lm, idx: push(L.sama[kind], frameM.clone().multiply(lm)) });
      }
      // lưới cột 柱 + xà 貫 ngay sau mặt trong của vách (toạ độ cả toà)
      const dIn = outD - TKC - 0.10;
      for (let c = 0; c <= nCols; c++) {
        const u = -span / 2 + c * colW;
        const p = new THREE.Vector3(nx * dIn, Y0 + y + T.h / 2, nz * dIn).addScaledVector(bx, u);
        const g = new THREE.BoxGeometry(face % 2 === 0 ? 0.16 : 0.14, T.h, face % 2 === 0 ? 0.14 : 0.16);
        g.translate(p.x, p.y, p.z);
        lat.push(g);
      }
      for (let r = 1; r < nRows; r++) {
        const p = new THREE.Vector3(nx * dIn, Y0 + y + r * rowH, nz * dIn);
        const g = new THREE.BoxGeometry(face % 2 === 0 ? span : 0.14, 0.14, face % 2 === 0 ? 0.14 : span);
        g.translate(p.x, p.y, p.z);
        lat.push(g);
      }
    }
    {
      const lg = mergeGeoms(lat);
      const lm = new THREE.Mesh(lg, M.stoneCore);
      lm.position.y = -Y0;
      lm.name = 'luoi-khung-' + ti;
      tierStruct.add(lm);
    }
    // đích bắn tia của con trỏ: hộp vỏ ngoài của tầng (vô hình). Ô tường dịch đi thì điểm chạm không nhảy.
    {
      const hb = new THREE.Mesh(new THREE.BoxGeometry(T.a * 2, T.h, T.b * 2), new THREE.MeshBasicMaterial());
      hb.position.set(0, y + T.h / 2, 0);
      hb.visible = false;
      hb.name = 'dich-tang-' + ti;
      grp.add(hb);
      hits.push(hb);
    }

    const EA = T.a + T.eave, EB = T.b + T.eave;
    const roofY = y + T.h;
    const rGrp = new THREE.Group();
    rGrp.name = 'mai-tang-' + ti;
    rGrp.position.y = roofY;
    grp.add(rGrp);
    const r = buildRoof(rGrp, EA, EB, T.roof, M, { irimoya: ti === TIERS.length - 1 });
    roofs.push({ group: rGrp, y0: roofY, ti, rand: rng(), EA, EB, h: T.h, base: y, segs: r.segs, tileIM: r.tileIM, tiles: r.tiles, crown: r.mesh });
    hits.push(r.hit);
    frames.push({ group: tierStruct, y0: 0, ti, rand: rng() });
    if (T.hafu) buildHafu(rGrp, T.hafu, T.hafu * 0.86, 0.35, EB * 0.46, M);

    if (ti === TIERS.length - 1) {
      buildShachi(rGrp, r.ra * 0.95, r.ridgeY + 0.22, M);
      buildShachi(rGrp, -r.ra * 0.95, r.ridgeY + 0.22, M).rotation.y = Math.PI;
      topY = roofY + T.roof + 1.6;
      const rail = new THREE.Group();
      rail.position.y = y + 0.44;
      tierStruct.add(rail);
      const posts = [];
      superRect(T.a + 0.58, T.b + 0.58, 72).forEach((p, i) => {
        if (i % 3) return;
        e.set(0, Math.atan2(p[0], p[1]), 0); q.setFromEuler(e);
        mtx.compose(new THREE.Vector3(p[0], 0.32, p[1]), q, new THREE.Vector3(0.09, 0.64, 0.09));
        posts.push(mtx.clone());
      });
      const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.board, posts.length);
      posts.forEach((m, i) => pm.setMatrixAt(i, m));
      pm.instanceMatrix.needsUpdate = true;
      rail.add(pm);
      [[0.62, 0.15], [0.05, 0.15]].forEach((rr) => {
        const mm = new THREE.Mesh(loft([
          superRect(T.a + 0.66, T.b + 0.66, 72).map((p) => new THREE.Vector3(p[0], rr[0] - rr[1] / 2, p[1])),
          superRect(T.a + 0.66, T.b + 0.66, 72).map((p) => new THREE.Vector3(p[0], rr[0] + rr[1] / 2, p[1])),
        ]), M.board);
        rail.add(mm);
      });
    }
    y = roofY - 0.22;
  });

  // ── đổ các ô vào InstancedMesh: vài trăm ô, mươi lệnh vẽ ───────────────────────────────────────
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const itaGeo = new THREE.BoxGeometry(1, 1, 1);
  { const uv = itaGeo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) * 3); }
  const mk = (geo, mat, list, name, shadow) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    list.forEach((m, i) => im.setMatrixAt(i, m));
    im.count = list.length;
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = !!shadow; im.receiveShadow = !!shadow;
    im.frustumCulled = false;
    im.name = name;
    grp.add(im);
    return im;
  };
  const IM = {
    plaster: mk(unit, M.plaster, L.plaster, 'o-trat', true),
    ita: mk(itaGeo, M.itabari, L.ita, 'o-van', true),
    pane: mk(new THREE.PlaneGeometry(1, 1), M.paper, L.pane, 'o-giay', false),
    bar: mk(unit, M.wood, L.bar, 'song-go', true),
    board: mk(unit, M.board, L.board, 'van-dau', true),
    sama0: mk(new THREE.CircleGeometry(0.21, 14), M.sama, L.sama[0], 'sama-0', false),
    sama1: mk(new THREE.CircleGeometry(0.27, 3), M.sama, L.sama[1], 'sama-1', false),
    sama2: mk(new THREE.PlaneGeometry(0.34, 0.34), M.sama, L.sama[2], 'sama-2', false),
  };
  // tường trát có sắc độ: mỗi ô lệch tông một chút (vữa trát từng mảng, không phải một tấm nhựa)
  const tone = new THREE.Color();
  for (const c of cells) {
    c.im = IM[c.kind];
    // tông ĐỔI MƯỢT theo vị trí (mảng vữa loang qua nhiều ô), không đổi từng ô — đổi từng ô thì lúc nghỉ
    // tường hoá ra dãy ván dọc
    if (c.kind === 'plaster') { const p = c.c0, v = 0.975 + 0.025 * Math.sin(p.x * 0.35 + p.y * 0.21) * Math.cos(p.z * 0.31 - p.y * 0.17); c.im.setColorAt(c.idx, tone.setRGB(v, v * 0.995, v * 0.985)); }
    for (const a of c.att) a.im = IM[a.kind];
  }
  if (IM.plaster.instanceColor) IM.plaster.instanceColor.needsUpdate = true;
  return { group: grp, topY: topY + grp.position.y, panes, sama: samas, roofs, cells, frames, hits, IM };
}

// gộp nhiều BoxGeometry (đã dời chỗ) thành một hình
function mergeGeoms(list) {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, ov * 3);
    nor.set(g.attributes.normal.array, ov * 3);
    uv.set(g.attributes.uv.array, ov * 2);
    const ix = g.index.array;
    for (let k = 0; k < ix.length; k++) idx[oi + k] = ix[k] + ov;
    ov += g.attributes.position.count; oi += ix.length;
    g.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  return m;
}

// ───────── HÌNH HỌC KẾT CẤU cho lớp nét kết cấu (scene/ketcau.js) ─────────
// Mọi toạ độ là toạ độ TRONG NHÓM TOÀ THÀNH (`castle` trong app.js): đặt `kc.group` làm con của nhóm ấy thì
// nét trùng khít công trình. Đơn vị mét, trục Y hướng lên, mặt đất ở y = 0, đỉnh nền đá ở y = IS.H.
//   stones[]  : tảng đá 石垣 — tâm c, hướng q (quaternion x,y,z,w), kích thước s (rộng, cao, dày), hàng course,
//               nrm (pháp tuyến mặt ngoài), front (tâm mặt ngoài), cuts (các nhát bạt góc [cx, cy, d] trong hệ
//               riêng của tảng, hộp đơn vị ±0,5)
//   cells[]   : ô tường (mỗi ô một gian × một hàng xà) — tâm c, hướng q, kích thước s, tầng tier, mặt face (0 trước
//               +z, 1 phải +x, 2 sau −z, 3 trái −x), cột col, hàng row, win (có cửa sổ), kind ('plaster' | 'ita')
//   lattice[] : lưới cột 柱 / xà 貫 ngay sau mặt trong vách, mỗi tầng mỗi mặt — nrm, tan, dIn (khoảng từ trục
//               tới lưới), y0, h, span, nCols, colW, nRows, rowH
//   frames[]  : khung trong lòng mỗi tầng — y0, h, cột (x, z, cạnh), xà (các cao độ)
//   roofs[]   : mái — y0 (chân mái), H (cao mái), EA/EB (bán trục vành hiên), eave (vươn hiên), tier
//   base      : nền đá — H, đỉnh [A, B], chân [A, B], p (số mũ đường cong 扇の勾配)
export function getStructure(ishigaki, tenshu) {
  const Y0 = tenshu.group.position.y;
  const q4 = (q) => [q.x, q.y, q.z, q.w];
  const stones = ishigaki.mods.map((m) => {
    const cuts = [];
    const g = m.mesh.geometry;
    for (let c = 0; c < 3; c++) { const a = g.getAttribute('aCut' + c); if (a && a.getZ(0) < 5) cuts.push([a.getX(0), a.getY(0), a.getZ(0)]); }
    const front = m.c0.clone().addScaledVector(m.nrm, m.scl.z / 2);
    return { c: m.c0.toArray(), q: q4(m.quat), s: m.scl.toArray(), course: m.course, nrm: m.nrm.toArray(), front: front.toArray(), cuts, width: m.width };
  });
  // toạ độ ô trong nhóm tháp lúc dựng (hover.js đổi k.c0 sang toạ độ cả toà; bản gốc giữ ở k.cTower)
  const cells = tenshu.cells.map((k) => { const t = k.cTower || k.c0; return {
    c: [t.x, t.y + Y0, t.z], q: q4(k.quat), s: k.scl.toArray(), tier: k.tier, face: k.face, col: k.col, row: k.row,
    nCols: k.nCols, nRows: k.nRows, win: !!k.win, kind: k.kind, nrm: k.nrm.toArray(), tan: k.tan.toArray(),
  }; });
  // lưới cột/xà sau vách: suy ra từ lưới ô (cùng gian, cùng hàng xà)
  const lattice = [];
  let base = 0;
  TIERS.forEach((T, ti) => {
    for (let face = 0; face < 4; face++) {
      const cs = tenshu.cells.filter((k) => k.tier === ti && k.face === face);
      if (!cs.length) continue;
      const k0 = cs[0];
      const outD = face % 2 === 0 ? T.b : T.a;
      const span = face % 2 === 0 ? (T.a - 0.80) * 2 : T.b * 2;
      lattice.push({
        tier: ti, face, nrm: k0.nrm.toArray(), tan: k0.tan.toArray(), dIn: outD - 0.80 - 0.10, y0: base + Y0, h: T.h,
        span, nCols: k0.nCols, colW: span / k0.nCols, nRows: k0.nRows, rowH: T.h / k0.nRows,
      });
    }
    base += T.h - 0.22;
  });
  const frames = [];
  base = 0;
  TIERS.forEach((T, ti) => {
    const colA = T.a - 1.15, colB = T.b - 1.15, CS = ti === 0 ? 0.56 : 0.46;
    frames.push({
      tier: ti, y0: base + Y0, h: T.h, a: T.a, b: T.b,
      columns: [[-colA, -colB], [-colA, colB], [colA, -colB], [colA, colB], [0, 0]].map(([x, z]) => ({ x, z, size: CS, y0: base + Y0 + 0.5, h: T.h - 0.3 })),
      beams: [base + Y0 + T.h * 0.52, base + Y0 + T.h - 0.42],
    });
    base += T.h - 0.22;
  });
  const roofs = tenshu.roofs.map((r) => ({ tier: r.ti, y0: r.y0 + Y0, H: TIERS[r.ti].roof, EA: r.EA, EB: r.EB, eave: TIERS[r.ti].eave }));
  return {
    frame: 'castle-local', units: 'm',
    base: { H: IS.H, top: [IS.topA, IS.topB], bottom: [IS.baseA, IS.baseB], p: IS.p, cap: IS.H + 0.44 },
    stones, cells, lattice, frames, roofs,
  };
}
