// 連絡 CONTACT — CHƯƠNG CUỐI của chuyến đi đêm (phần 9, 30/9). Mike duyệt ảnh chi tiết phương án C ngày 29/9
// (prototypes/kozo-dem/lien-he-a.html?pa=c&anh=1|2|3|4 · ảnh scratchpad/kozo-look/chuong-lien-he/_chi-tiet.png, ct-2.png).
// Chuyến đi kết thúc ở chỗ nó bắt đầu: TOÀ THÀNH trong đêm phía sau, đủ bốn lớp cùng sáng bằng NÉT CỌ MỰC 緑青 phát sáng (đường
// đồng mức trên dốc thành 地 · nét dọc cạnh góc tường + một mạch lớp đá dừng ở góc 石垣 · cột góc + xà 骨 · cửa giấy đèn ngà 皮);
// tiền cảnh là BÃI ĐẤT ĐÃ SAN trên mỏm đồi: bốn góc cọc 遣り方 có ván ngang, dây 水糸 căng, nét cọ 地縄 vẽ đường bao ngôi nhà chưa có.
// Chữ + form "đường mặt đất" là HTML thật (index.html #ch-lienhe) — không nằm trong cảnh.
//
// SỬA 5 ĐIỂM YẾU của ảnh duyệt (Sếp báo Mike 29/9):
//  1. không còn trục sáng dọc giữa toà thành: 石垣 nằm ở góc PHẢI (+x −z) — nét dọc cạnh góc + mạch lớp đá dừng ở góc ấy — còn 骨 ở
//     góc TRÁI (−x +z) — cột góc + xà chạy vào giữa rồi dừng. Góc giữa (+x +z, ngay trước máy) không có nét nào;
//  2. cọc 遣り方 to và rõ (cọc 0,22 m, ván 0,3 m — gấp ~2,5 lần thật để đọc được ở 70 m), dây căng MẢNH một điểm ảnh thiết bị, sáng
//     ~0,6 lần nét cọ (soát p10a A4), cỏ cao hơn quanh mép bãi, sương thấp nằm trên mỏm — nhìn 1 giây ra "bãi đất đã căng dây chờ xây";
//  3. mỏm đồi TỰ NHIÊN: sống mỏm lượn (phương vị đổi theo khoảng cách), có yên ngựa, có gò, sườn tròn, bề ngang không đều — không
//     còn cái nêm thẳng mặt phẳng như đường băng;
//  4. nét trên toà thành LIỀN MẠCH như nét năm tháng của 仕事: ít xơ khô đứt quãng hơn, đặt nổi khỏi mặt đá / mặt đất đủ xa để
//     không chìm từng khúc sau tảng đá hay mặt lưới đất;
//  5. lớp núi xa phủ đủ mọi góc máy của chuyển cảnh 6 (forest.js opt.half).
//
// VÒNG SỬA p10a (soát A + B, 30/9): 骨 là MỘT cột thông 通し柱 vẽ liền chân → đỉnh + hai xà khác nhau (không còn ba chữ "⅃"); lõi góc
// nền đá ngả tông mặt đá (hết khe đen); mép bãi san chuyển mềm, sống mỏm tròn có gò; dây 1 điểm ảnh; khổ dọc: nét 道 đổ vào góc bãi
// rồi tan trước lúc tới nơi; điện thoại đang gõ: khung cảnh dời lên (setLift) để sau form là phần tối; viền sáng "dress" tính theo máy
// của chương này; toà thành GỘP lưới nhỏ theo vật liệu (175 → 65 lệnh vẽ — chương này bị giới hạn bởi số lệnh vẽ); hình giả để dịch
// shader ngay khi vào trang (warmMeshes).
//
// HIỆU NĂNG: toà thành KHÔNG dựng lại — nhân bản cây đối tượng của toà thành màn đầu (dùng chung hình, đã nằm trên card), chỉ thay
// vật liệu bảng màu đêm. Rừng dùng lại ba hình cây của rừng màn đầu. Nét cọ tính bằng số từ dữ liệu kết cấu (không bắn tia). Dựng
// ngầm từng mẩu ≤ ~3 ms (app.js gọi build() trong phần thời gian thừa của khung), dịch shader song song, vẽ đầu từng lưới.
//
// Dòng thời gian (app.js): s là vị trí ảo (màn). T10 → TP6: chuyển cảnh 6 (máy 仕事 bay theo nét ra khỏi bản đồ; từ W0 tới W1 hai
// cảnh hoà theo nét — post/chuyen.js DuongEffect; rồi máy ở đây hạ dần xuống bãi); T11 → END6: chương đứng — nét đổ thành bốn
// cạnh 地縄, toà thành sáng dần từ chân lên (地 → 石垣 → 骨 → 皮), form hiện sau cùng. Mọi thứ là HÀM CỦA s → lùi 6 → 5 chạy
// ngược đúng hình.
import * as THREE from 'three';
import { RAMP } from '../page/accent.js';
import { LOOKS } from './look.js';
import { skyMaterial, buildUnkai } from './sky.js';
import { buildRidgeLayersSteps, buildMistSea, hillY } from './forest.js';
import { makeMaterials, dress, rng32, IS, TIERS } from './castle.js';

const UP = new THREE.Vector3(0, 1, 0);
const lin = (hex) => new THREE.Color(hex);
const cl01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sst = (a, b, x) => { const t = cl01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const orbit = (az, d, y) => [Math.sin(az) * d, y, Math.cos(az) * d];
function hz(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnz(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hz(xi, yi), b = hz(xi + 1, yi), c = hz(xi, yi + 1), d = hz(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// ═════════════════════════════════════════ BẢNG MÀU ĐÊM (bản thử lien-he-a.js — Mike đã duyệt ảnh) ═════════════════════════
const A0 = LOOKS.a;
export const NIGHT = {
  sky: { top: 0x0b100f, mid: 0x1d2926, horizon: 0x3a4b47, glow: 0x4d615c, glowK: 0.3, cloudK: 0.14 },
  fog: { color: 0x1e2927, density: 0.0016 },
  sun: { color: 0xa9bfb8, intensity: 0.75, dir: [-0.46, 0.66, 0.60], shadow: 0.55, radius: 6 },
  hemi: { sky: 0x42544f, ground: 0x050706, intensity: 0.55 },
  amb: { color: 0x1d2725, intensity: 0.06 },
  glow: { color: 0x000000, opacity: 0 },
  layers: A0.layers,
  ridge: {
    lit: [0x141c1a, 0x19221f, 0x1f2926, 0x26302d, 0x2d3835, 0x35413d],
    shade: [0x0b100e, 0x0f1513, 0x141b19, 0x1a2320, 0x212b28, 0x293430],
    gap: [0x060908, 0x0a0e0d, 0x0e1412, 0x141b19, 0x1b2421, 0x232d2a],
    mist: 0x2a3633, valley: 0.66, wisp: 0.6,
  },
  sea: { low: 0x1a2422, high: 0x27332f, shade: 0x121a18, alpha: 1.0 },
  near: { lit: 0x1c2522, shade: 0x080b0a },
  corner: { color: 0x1f2a27, spots: A0.corner.spots },
  ground: { color: 0x2c312f, moss: 0x131915 },
  mat: {
    plaster: 0x777b77, plasterDirt: 0x454a46, roof: 0x2d3033, roofSheen: 0.22, ridge: 0x24272a,
    wood: 0x2d2c29, board: 0x151514, itabari: 0x191918,
    stone: 0x55554f, stoneDark: 0x2a2a27, stoneCore: 0x0e1210, rock: 0x2e302d,
    // mạch lõi 栗石: gần tắt (luật "không viền sáng từng tảng") — mạch đá sáng bằng NÉT CỌ, không bằng khe
    core: RAMP[500], coreK: 0.45, coreRest: 0.24,
    // 皮: ô cửa giấy có đèn — (Mike 30/9 "hơi kì": ngà trắng trên nền 緑青 đọc ra hồng trắng loá) → ĐÈN ẤM DỊU màu hổ phách, sáng
    // vừa; lớp nắn màu giữ sắc ấm (uKeepWarm), chương này tắt giữ-giấy (app.js uKeepPaper)
    paper: 0x2a2620, paperE: 0xffc27a, paperK: 0.5, sama: 0x0b0c0b,
    rim: 0x8BC8B3, rimK: 0.18,
  },
  lamp: null,
};

// ═════════════════════════════════════════ ĐỊA HÌNH: đồi thành + MỎM ĐỒI TỰ NHIÊN + bãi đất đã san ═══════════════════════════
// phương vị kiểu orbit(): az = atan2(x, z). Mỏm đồi chạy từ đồi thành về phía máy (az ~0,95), bãi đất trên gò của mỏm (r ~60 m).
export const SPUR = { az: 0.95, PL: -8.0 };
export const PAD = (() => {
  const az = SPUR.az, r = 60, Lw = 34, Ld = 22;          // khổ một nhà trưng bày làng 34 × 22 m
  const c = new THREE.Vector3(Math.sin(az) * r, SPUR.PL, Math.cos(az) * r);
  const toC = new THREE.Vector3(-c.x, 0, -c.z).normalize(), side = new THREE.Vector3().crossVectors(toC, UP).normalize();
  return { c, toC, side, Lw, Ld, h: SPUR.PL };
})();
function padDist(x, z) {
  const dx = x - PAD.c.x, dz = z - PAD.c.z;
  const u = Math.abs(dx * PAD.side.x + dz * PAD.side.z) - PAD.Lw / 2, v = Math.abs(dx * PAD.toC.x + dz * PAD.toC.z) - PAD.Ld / 2;
  return Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0);
}
// sống mỏm: phương vị LƯỢN theo khoảng cách (qua đúng tâm bãi ở r 60), cao độ qua các nút — yên ngựa ở ~38 m, gò bãi ở ~60 m,
// rồi đổ dần xuống thung (nội suy Catmull-Rom — không có đoạn thẳng đều nào)
const spineAz = (r) => SPUR.az + 0.085 * Math.sin((r - 60) / 30) * sst(26, 44, r) + 0.06 * (vnz(r * 0.03, 3.7) - 0.5) * sst(72, 110, r);
const SPK = [[16, 0.6], [22, -2.2], [30, -6.4], [38, -9.1], [48, -8.5], [60, -7.7], [71, -8.3], [84, -10.9], [100, -15.3], [118, -20.8], [140, -27.6], [165, -34.6], [195, -41]];
function spineH(r) {
  if (r <= SPK[0][0]) return SPK[0][1];
  let i = 0; while (i < SPK.length - 2 && r > SPK[i + 1][0]) i++;
  const p0 = SPK[Math.max(0, i - 1)][1], p1 = SPK[i][1], p2 = SPK[i + 1][1], p3 = SPK[Math.min(SPK.length - 1, i + 2)][1];
  const t = cl01((r - SPK[i][0]) / (SPK[i + 1][0] - SPK[i][0])), t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
// bề ngang nửa (m): rộng ra quanh gò bãi, co lại ở yên ngựa và ở đuôi mỏm, gợn không đều
const spineW = (r) => (18 + 19 * Math.exp(-Math.pow((r - 62) / 26, 2)) + 6 * (vnz(r * 0.035, 11.3) - 0.5)) * sst(14, 30, r) + 3;
// mức nâng của mỏm tại (x, z): 0 ngoài mỏm, 1 trên sống — sườn tròn (không vai gãy), mép gợn
function spurK(x, z) {
  const r = Math.hypot(x, z);
  if (r < 15) return 0;
  const dA = wrapA(Math.atan2(x, z) - spineAz(r));
  if (Math.cos(dA) <= 0) return 0;
  const lat = r * Math.sin(dA) + 3.5 * (vnz(r * 0.07, 5.1) - 0.5) * sst(30, 60, r);
  const u = Math.abs(lat) * (lat > 0 ? 1 + 0.18 * (vnz(r * 0.05, 8.2) - 0.5) : 1) / spineW(r);
  // (soát p10a A7/A8) mặt cắt TRÒN — không còn dải đỉnh phẳng (bản cũ phẳng tới u 0,42: đoạn sống mỏm dốc xuống phía máy thành một
  // mặt nghiêng phẳng hứng trăng đều, đọc ra "tấm hình thang" dưới bãi)
  return (1 - sst(0.06, 1.12, u)) * sst(16, 26, r);
}
export function hill2(x, z) {
  const h0 = hillY(x, z);
  const k = spurK(x, z);
  let h = h0;
  if (k > 0) {
    const r = Math.hypot(x, z);
    // gò, yên nhỏ dọc sống (không một mặt dốc đều)
    const hs = spineH(r) + 0.8 * (vnz(r * 0.05, 2.3) - 0.5) + 0.45 * (vnz(x * 0.13 + 3, z * 0.13) - 0.5) + 1.3 * (vnz(x * 0.045 + 1.7, z * 0.045 - 4.2) - 0.5) * sst(74, 96, r);
    h += Math.max(0, hs - h0) * k;
  }
  // bãi san phẳng tới 3,2 m ngoài đường bao; mép san (soát p10a A7: bản cũ thành "bục kê" — mép trước thẳng, dốc đứng) chuyển MỀM về
  // sườn tự nhiên: bề ngang mép theo độ chênh (dốc trung bình ≤ ~1:2,2), đường mép gợn theo nhiễu (không thẳng), ngoài mép có gò nhỏ
  const d = padDist(x, z), dn = d + 1.6 * (vnz(x * 0.11 + 2.3, z * 0.11 - 1.7) - 0.5) * sst(1.5, 4, d);
  const dh = Math.abs(PAD.h - h), wEdge = 3.3 + Math.min(15, dh * 2.2);
  const kp = 1 - sst(3.2, 3.2 + wEdge, dn);
  const mound = 0.7 * (vnz(x * 0.19 + 7.1, z * 0.19 + 1.3) - 0.45) * sst(4.5, 9, d) * (1 - sst(22, 40, d));
  return h + (PAD.h - h) * kp + mound * (k > 0 ? 1 : 0.4);
}

// ═════════════════════════════════════════ ĐÈN GIẢ: ánh nét cọ hắt lên đất, đá, tường, cây ═══════════════════════════════════
// (bản thử dùng 128 đèn giả / điểm ảnh — ở đây ≤ 64, vòng dừng ở số đèn thật, điểm ảnh ngoài quả cầu bao của cả bãi + toà thành
// bỏ qua cả vòng)
const FL_MAX = 64, FL_NG = 5;
// (soát p11a A4) quầng ấm quanh cửa sổ nhìn gần thành vệt nâu loang trên tường → nhỏ (2,4 m), nhẹ, gần trung tính — chỉ sáng ngay mép cửa
const FLR_COT = 0.45, FLR_CUA = 0.12;   // tầm với (× uFLR) của ánh nét 骨 và của đèn cửa sổ — xem FL_TAM
const FL_COT_I = 2.0, FL_CUA_I = 0.4;    // cường độ ánh nét 骨 / đèn cửa sổ
const CUA_GLOW = 0xe6ddcf;              // màu quầng quanh cửa (ô cửa vẫn hổ phách — NIGHT.mat.paperE)
function makeFL() {
  return {
    uFL: { value: Array.from({ length: FL_MAX }, () => new THREE.Vector4(0, -1e5, 0, 0)) },
    uFLCol: { value: Array.from({ length: FL_MAX }, () => new THREE.Color(RAMP[400])) },
    uFLR: { value: 20 },
    uFLN: { value: 0 },
    uFLBox: { value: new THREE.Vector4(24, -4, 16, 95) },
    // (soát p10a B5) đèn xếp theo NHÓM (地縄 · 地 · 石垣 · 皮 — mỗi nhóm một khoảng chỉ số liền) + quả cầu bao của từng nhóm (đã cộng tầm
    // với của đèn): điểm ảnh ngoài quả cầu nào thì bỏ qua cả nhóm ấy — mỗi điểm ảnh chỉ duyệt đèn ở gần nó (trước: duyệt đủ 62 đèn)
    // (Mike 30/9) NĂM nhóm (thêm 骨) và mỗi nhóm MỘT TẦM VỚI riêng (uFLGR.z × uFLR): đèn cửa sổ / ánh nét 骨 chỉ loang quanh chỗ nó —
    // tầm với 20 m chung cho mọi đèn làm ánh cửa sổ phủ đều cả mặt tường (tường xám phẳng)
    uFLG: { value: Array.from({ length: FL_NG }, () => new THREE.Vector4(0, -1e5, 0, 0)) },
    uFLGR: { value: Array.from({ length: FL_NG }, () => new THREE.Vector3(0, 0, 1)) },
  };
}
const FL_PARS = `
#define FL_MAX ${FL_MAX}
uniform vec4 uFL[FL_MAX];
uniform vec3 uFLCol[FL_MAX];
uniform float uFLR, uFLGain, uFLWrap;
uniform int uFLN;
uniform vec4 uFLBox;
uniform vec4 uFLG[${FL_NG}];
uniform vec3 uFLGR[${FL_NG}];
varying vec3 vFLw;
`;
function patchFL(mat, FLU, o = {}) {
  const prev = mat.onBeforeCompile;
  const prevKey = Object.prototype.hasOwnProperty.call(mat, 'customProgramCacheKey') ? mat.customProgramCacheKey.bind(mat) : null;
  const U = { uFLGain: { value: o.gain ?? 1 }, uFLWrap: { value: o.wrap ?? 0.2 } };
  mat.userData.fl = U;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(mat, sh, r);
    Object.assign(sh.uniforms, FLU, U);
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'varying vec3 vFLw;\nvoid main() {')
      .replace('#include <project_vertex>', `#include <project_vertex>
#ifdef USE_INSTANCING
  vFLw = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vFLw = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', FL_PARS + (o.lit ? 'uniform float uLitY;\n' : '') + 'void main() {')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
{
  vec3 flB = vFLw - uFLBox.xyz;
  if (dot(flB, flB) < uFLBox.w * uFLBox.w) {
    vec3 flN = inverseTransformDirection(normal, viewMatrix);
    vec3 flD = vec3(0.0);
    for (int gi = 0; gi < ${FL_NG}; gi++) {
      vec4 G = uFLG[gi];
      vec3 gd = vFLw - G.xyz;
      if (dot(gd, gd) > G.w * G.w) continue;
      int ia = int(uFLGR[gi].x + 0.5), ib = int(uFLGR[gi].y + 0.5);
      float Rg = uFLR * uFLGR[gi].z, R2 = Rg * Rg;
      for (int i = ia; i < ib; i++) {
        vec4 Lf = uFL[i];
        vec3 d = Lf.xyz - vFLw;
        float d2 = dot(d, d);
        if (d2 > R2 || Lf.w <= 0.0) continue;
        float dist = sqrt(d2);
        vec3 l = d / max(dist, 1e-3);
        float k = 1.0 - dist / Rg;
        float nd = dot(flN, l);
        flD += uFLCol[i] * Lf.w * k * k * max(mix(max(nd, 0.0), abs(nd), uFLWrap), uFLWrap * 0.25);
      }
    }
    reflectedLight.directDiffuse += diffuseColor.rgb * flD * uFLGain;
  }
}`)
      // 皮: cửa giấy sáng dần TỪ CHÂN LÊN (tầng dưới trước) — uLitY là độ cao thế giới của "mép đèn"
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>' + (o.lit ? '\ntotalEmissiveRadiance *= smoothstep(uLitY + 1.2, uLitY - 1.2, vFLw.y);' : ''));
    if (o.lit) sh.uniforms.uLitY = o.lit;
  };
  mat.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|lh-fl' + (o.lit ? '-lit' : '');
  return mat;
}

// ═════════════════════════════════════════ NÉT CỌ 緑青 (chép nguyên shader nét năm tháng của scene/viec.js) ════════════════════
// 起筆 đầu tròn như ngòi vừa ấn · 送筆 dày mỏng theo lực · 払い đuôi vuốt · 掠れ xơ khô · 滲み loang mép · đang vẽ: đầu cọ ướt sáng hơn.
// uP = số nét đã vẽ (có phần lẻ). Điểm yếu 4 (nét đứt quãng): uSkip — xơ khô "bỏ quãng" nhẹ hơn cho nét trên toà thành / đất.
const NZ2 = `
float vH(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vN(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(vH(i), vH(i + vec2(1.0, 0.0)), u.x), mix(vH(i + vec2(0.0, 1.0)), vH(i + vec2(1.0, 1.0)), u.x), u.y); }
`;
// (Mike 30/9: nét 骨 "như thanh đèn neon") uSkipF: nhịp các quãng cọ cạn dọc nét (m⁻¹ × 1/0,035) · uRag: độ răng cưa mép nét
function brushMat({ body = RAMP[400], core = RAMP[200], k = 1.6, dry = 1, skip = 1, coreK = 0.85, skipF = 0.035, rag = 0.12 } = {}) {
  return new THREE.ShaderMaterial({
    name: 'lh-co', transparent: true, depthWrite: false, depthTest: true, fog: true, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uBody: { value: lin(body) }, uCore: { value: lin(core) }, uK: { value: k }, uP: { value: 0 }, uDry: { value: dry }, uA: { value: 1 }, uSkip: { value: skip }, uCoreK: { value: coreK }, uTail: { value: 0 },
      uSkipF: { value: skipF }, uRag: { value: rag },
    }]),
    vertexShader: `attribute float aT, aS, aV, aI, aW, aL, aSeed; varying float vT, vS, vV, vI, vW, vL, vSeed;
#include <fog_pars_vertex>
void main(){ vT = aT; vS = aS; vV = aV; vI = aI; vW = aW; vL = aL; vSeed = aSeed; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform vec3 uBody, uCore; uniform float uK, uP, uDry, uA, uSkip, uCoreK, uTail, uSkipF, uRag; varying float vT, vS, vV, vI, vW, vL, vSeed;
#include <fog_pars_fragment>
${NZ2}
void main(){
  float shown = clamp(uP - vI, 0.0, 1.0);
  if (shown <= 0.0 || vT > shown) discard;
  bool drawing = shown < 0.999;
  float sA = vS / vW;
  float lead = (shown - vT) * vL / vW;
  // (soát p10a A5) uTail > 0: đuôi vuốt dài uTail mét (nét 道 dài ~560 m — vuốt 16% cuối là 90 m, nét tắt trước khi tới góc bãi)
  float tail0 = uTail > 0.0 ? 1.0 - uTail / max(vL, 1.0) : 0.84;
  float tailT = drawing ? 1.0 : 1.0 - smoothstep(tail0, 1.0, vT);
  float press = (1.0 + 0.22 * (1.0 - smoothstep(0.0, 2.5, sA))) * (0.6 + 0.58 * vN(vec2(sA * 0.12, vSeed * 13.0)) + 0.16 * vN(vec2(sA * 0.45, vSeed * 5.0)));
  float head = sqrt(clamp(sA / 0.9, 0.0, 1.0));
  float hw = press * head * mix(0.08, 1.0, pow(tailT, 0.75));
  float x = abs(vV);
  float startCut = smoothstep(0.0, 0.18, sA - 0.4 * (vV * 0.5 + 0.5));
  float edgeN = vN(vec2(sA * 1.7, vSeed * 7.0 + vV * 0.5));
  float body = 1.0 - smoothstep(hw * (0.96 - uRag * (1.0 - edgeN)), hw * 1.02, x);
  float fib = vN(vec2(vV * 9.0 + vSeed * 3.1, sA * 0.42)) * 0.62 + vN(vec2(vV * 21.0 + vSeed, sA * 1.4)) * 0.38;
  float depl = smoothstep(0.05, 1.0, vT) * (uTail > 0.0 ? 0.8 : 1.0);
  float skip = smoothstep(0.58, 0.82, vN(vec2(sA * uSkipF + vSeed * 9.0, 2.0))) * uSkip;
  float D = clamp((0.1 + 0.5 * depl * depl + 0.4 * (1.0 - tailT) + 0.34 * skip) * uDry, 0.0, 0.86);
  float Dl = D * (1.0 + 0.55 * x * x);
  float bristle = smoothstep(Dl - 0.09, Dl + 0.09, fib);
  float bleed = (1.0 - smoothstep(hw, hw * 1.28, x)) * smoothstep(hw * 0.9, hw, x) * (1.0 - D) * (0.35 + 0.4 * edgeN);
  float cov = max(body * bristle, bleed * 0.55) * startCut * uA;
  if (cov < 0.02) discard;
  float dens = (0.86 + 0.14 * (1.0 - smoothstep(0.0, 3.0, sA))) * (1.0 - 0.42 * depl) * (0.82 + 0.18 * vN(vec2(sA * 2.3, vV * 6.0 + vSeed)));
  float core = pow(max(0.0, 1.0 - abs(vV - 0.3 * (vN(vec2(sA * 0.07, vSeed)) - 0.5)) / max(hw, 0.01)), 1.8);
  vec3 c = mix(uBody, uCore, core * uCoreK) * dens;
  if (drawing) c += uCore * exp(-lead * 0.22) * 1.3;
  gl_FragColor = vec4(c * uK, cov);
#include <fog_fragment>
}`,
  });
}
// dây 水糸 (soát p10a A4): MỘT điểm ảnh thiết bị, không nhân theo độ phân giải màn; sáng ~0,6 lần nét cọ, xám ngả 緑青, không phát
// sáng. Khung vẽ thưa hơn màn (điện thoại vẽ 1,15 điểm / điểm CSS trên màn ×3): dây vẽ tối thiểu 1,4 điểm ảnh của khung vẽ (mảnh hơn
// thì nhấp nháy khi máy thở) và bù bằng độ đục — cùng lượng mực như một sợi 1 điểm ảnh thiết bị. Mép mềm (không răng cưa)
function stringMat() {
  return new THREE.ShaderMaterial({
    name: 'lh-day', transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uC: { value: lin(0xa3bdb4) }, uA: { value: 0.62 }, uRes: { value: new THREE.Vector2(1900, 920) }, uPx: { value: 1.4 }, uAk: { value: 0.71 } }]),
    vertexShader: `attribute vec3 aB; attribute float aSide, aEnd; uniform vec2 uRes; uniform float uPx; varying float vSd;
#include <fog_pars_vertex>
void main(){
  vec4 pa = projectionMatrix * viewMatrix * vec4(position, 1.0), pb = projectionMatrix * viewMatrix * vec4(aB, 1.0);
  vec2 d = normalize((pb.xy / pb.w - pa.xy / pa.w) * uRes + 1e-6);
  vec2 n = vec2(-d.y, d.x) / uRes * uPx;
  vec4 p = aEnd < 0.5 ? pa : pb;
  p.xy += n * aSide * p.w;
  vSd = aSide;
  vec4 mvPosition = viewMatrix * vec4(aEnd < 0.5 ? position : aB, 1.0);
  gl_Position = p;
#include <fog_vertex>
}`,
    fragmentShader: `uniform vec3 uC; uniform float uA, uAk; varying float vSd;
#include <fog_pars_fragment>
void main(){ gl_FragColor = vec4(uC, uA * uAk * (1.0 - 0.45 * smoothstep(0.3, 1.0, abs(vSd))));
#include <fog_fragment>
}`,
  });
}
// mặt sương mỏng có hoa văn loang (nằm ngang), tự hửng màu gỉ đồng gần các đèn giả
function mistMat(FLU, color, alpha, scale, seed) {
  const m = new THREE.ShaderMaterial({
    name: 'lh-suong', transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uC: { value: lin(color) }, uA: { value: alpha }, uS: { value: scale }, uSeed: { value: seed } }]),
    vertexShader: `varying vec3 vFLw;
#include <fog_pars_vertex>
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vFLw = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform vec3 uC; uniform float uA, uS, uSeed;
${FL_PARS}
#include <fog_pars_fragment>
float h2(vec2 p){ p = fract(p*vec2(0.1031,0.1030)); p += dot(p, p.yx+33.33); return fract((p.x+p.y)*p.x); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
float fb(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+uSeed; a*=0.5; } return s; }
void main(){
  float n = fb(vFLw.xz * uS + uSeed);
  float a = uA * smoothstep(0.32, 0.78, n);
  if (a < 0.004) discard;
  vec3 g = vec3(0.0);
  { vec3 flB = vFLw - uFLBox.xyz;
    if (dot(flB, flB) < uFLBox.w * uFLBox.w) {
      for (int gi = 0; gi < ${FL_NG}; gi++) {
        vec4 G = uFLG[gi]; vec3 gd = vFLw - G.xyz;
        if (dot(gd, gd) > G.w * G.w) continue;
        int ia = int(uFLGR[gi].x + 0.5), ib = int(uFLGR[gi].y + 0.5);
        float Rm = uFLR * 1.6 * uFLGR[gi].z;
        for (int i = ia; i < ib; i++) { vec4 Lf = uFL[i]; if (Lf.w <= 0.0) continue; float d = length(Lf.xyz - vFLw); if (d > Rm) continue; float k = 1.0 - d / Rm; g += uFLCol[i] * Lf.w * k * k; }
      }
    } }
  gl_FragColor = vec4(uC + g * 0.16, a);
#include <fog_fragment>
}`,
  });
  Object.assign(m.uniforms, FLU, { uFLGain: { value: 1 }, uFLWrap: { value: 0 } });
  return m;
}

// ═════════════════════════════════════════ MÁY QUAY ════════════════════════════════════════════════════════════════════════
// tư thế NGHỈ = ảnh chi tiết anh=2 (đứng trên đuôi mỏm, sau bãi, nhìn qua bãi lên toà thành); k2 → k3 → k4 là đường hạ xuống của
// chuyển cảnh 6 (ảnh phác anh=4), k4 ≈ lúc tới nơi. off = phần bề cao dời khung (setViewOffset) — toà thành lên cao, chừa chỗ form
const POSE = {
  land: {
    k2: { p: orbit(SPUR.az - 0.28, 380, 100), t: [PAD.c.x * 0.7, -14, PAD.c.z * 0.7], fov: 44, off: 0 },
    k3: { p: orbit(SPUR.az - 0.13, 232, 60), t: [PAD.c.x * 0.8, -5, PAD.c.z * 0.8], fov: 46, off: 0.03 },
    k4: { p: orbit(SPUR.az + 0.04, 152, 18), t: [0, 4.5, 0], fov: 46, off: 0.06 },
    rest: { p: orbit(SPUR.az + 0.12, 130, 9), t: [0, 6, 0], fov: 46, off: 0.05 },
  },
  port: {
    k2: { p: orbit(SPUR.az - 0.26, 400, 108), t: [PAD.c.x * 0.7, -16, PAD.c.z * 0.7], fov: 58, off: 0.06 },
    k3: { p: orbit(SPUR.az - 0.12, 250, 66), t: [PAD.c.x * 0.8, -7, PAD.c.z * 0.8], fov: 60, off: 0.14 },
    // (soát p10a A5) khổ dọc: lúc nét 道 đổ vào góc bãi (p6 ≈ 0,7–0,85) máy đứng lệch trái (az − 0,1) — cả khúc cuối của nét và góc
    // gần trái của bãi nằm trong khung (bản cũ: nét đi ra mép trái màn, không chạm góc); rồi mới xoay về tư thế nghỉ
    k4: { p: orbit(SPUR.az - 0.1, 176, 26), t: [6, -3, 6], fov: 62, off: 0.2 },
    rest: { p: orbit(SPUR.az, 152, 14), t: [0, 0, 0], fov: 62, off: 0.2 },
  },
};
// điểm đứng của núi xa, biển sương, rừng: máy lúc NGHỈ (khổ ngang)
const ENV_CAM = (() => { const q = POSE.land.rest.p; return { x: q[0], y: q[1], z: q[2] }; })();

// gộp lưới tĩnh cùng vật liệu (bộ phận của createLienhe — xem chỗ gọi)
function* mergeCastle(root, due) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const G = new Map();
  root.traverseVisible((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || !o.geometry) return;
    const g = o.geometry, names = Object.keys(g.attributes).sort();
    if (!g.attributes.position || (g.morphAttributes && Object.keys(g.morphAttributes).length) || g.groups.length > 1) return;
    if (names.some((k) => g.attributes[k].isInterleavedBufferAttribute)) return;
    if (o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return;
    const key = o.material.uuid + '|' + names.map((k) => k + g.attributes[k].itemSize).join(',') + '|' + (g.index ? 'i' : 'n') + '|' + o.renderOrder;
    if (!G.has(key)) G.set(key, []);
    G.get(key).push(o);
  });
  if (due()) yield;
  const m4 = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3();
  for (const list of G.values()) {
    if (list.length < 2) continue;
    const g0 = list[0].geometry, names = Object.keys(g0.attributes);
    let nv = 0, ni = 0;
    for (const o of list) { nv += o.geometry.attributes.position.count; ni += o.geometry.index ? o.geometry.index.count : 0; }
    const out = {};
    for (const k of names) out[k] = new Float32Array(nv * g0.attributes[k].itemSize);
    const idx = g0.index ? (nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni)) : null;
    let vo = 0, io = 0;
    for (const o of list) {
      const g = o.geometry, n = g.attributes.position.count;
      m4.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(m4);
      for (const k of names) {
        const a = g.attributes[k], sz = a.itemSize, dst = out[k];
        for (let i = 0; i < n; i++) {
          if (k === 'position') { v.fromBufferAttribute(a, i).applyMatrix4(m4); dst[(vo + i) * 3] = v.x; dst[(vo + i) * 3 + 1] = v.y; dst[(vo + i) * 3 + 2] = v.z; }
          else if (k === 'normal') { v.fromBufferAttribute(a, i).applyMatrix3(nm).normalize(); dst[(vo + i) * 3] = v.x; dst[(vo + i) * 3 + 1] = v.y; dst[(vo + i) * 3 + 2] = v.z; }
          else for (let c = 0; c < sz; c++) dst[(vo + i) * sz + c] = a.getComponent(i, c);
        }
      }
      if (idx) { const ia = g.index.array; for (let i = 0; i < ia.length; i++) idx[io + i] = ia[i] + vo; io += ia.length; }
      vo += n;
      if (due()) yield;
    }
    const mg = new THREE.BufferGeometry();
    for (const k of names) mg.setAttribute(k, new THREE.BufferAttribute(out[k], g0.attributes[k].itemSize));
    if (idx) mg.setIndex(new THREE.BufferAttribute(idx, 1));
    mg.computeBoundingSphere();
    const mesh = new THREE.Mesh(mg, list[0].material);
    mesh.name = 'lh-gop'; mesh.renderOrder = list[0].renderOrder; mesh.frustumCulled = false;
    root.add(mesh);
    for (const o of list) o.visible = false;   // (không xoá: cây đối tượng giữ nguyên để đối chiếu; ẩn thì không vẽ)
    if (due()) yield;
  }
}

export function createLienhe(renderer, deps) {
  const TL = deps.moc;   // mốc dòng thời gian của app.js: T10, TP6, T11, END6, W0, W1
  const scene = new THREE.Scene();
  scene.name = 'lien-he';
  scene.fog = new THREE.FogExp2(lin(NIGHT.fog.color), 0.0011);
  scene.background = null;
  // ánh trời: dùng lại bản đồ môi trường của màn đầu (không dựng lại), cường độ như toà thành lúc chạng vạng đã tối hẳn
  scene.environment = deps.env || null;
  scene.environmentIntensity = 0.3;
  const camera = new THREE.PerspectiveCamera(46, 1, 0.3, 7000);
  scene.add(camera);
  const sunDir = new THREE.Vector3().fromArray(NIGHT.sun.dir).normalize();
  const st = { at: '', built: false, verts: 0, trees: 0, grass: 0, fl: 0, buildMs: 0, meshes: 0 };
  const FLU = makeFL();

  // ── ĐÈN (tạo ngay: số đèn là một phần của chương trình shader) — trăng không đổ bóng (cảnh tĩnh; bóng đổ riêng một lần sẽ tranh
  //    cờ vẽ bóng chung với nắng màn đầu) ──
  // (Mike 30/9: tường "xám phẳng") trăng mạnh hơn một chút + toà thành bớt ánh môi trường (dưới) → mặt hứng trăng sáng mát, mặt
  // khuất tối hẳn, chỉ ửng ánh nét 骨 và quầng đèn cửa sổ
  const moon = new THREE.DirectionalLight(lin(NIGHT.sun.color), 1.8);
  moon.position.copy(sunDir).multiplyScalar(300); moon.target.position.set(0, 0, 0);
  scene.add(moon, moon.target);
  const hemi = new THREE.HemisphereLight(lin(NIGHT.hemi.sky), lin(NIGHT.hemi.ground), 0.75), amb = new THREE.AmbientLight(lin(NIGHT.amb.color), NIGHT.amb.intensity);
  scene.add(hemi, amb);

  // ── VẬT LIỆU (tạo ngay) ─────────────────────────────────────────────────────────────────────────────────────────────────
  // vật liệu toà thành bảng màu đêm: tạo ở mẩu đầu của việc dựng (không dồn vào lúc tạo cảnh)
  let M2 = null;
  const lit = { value: -1e3 };   // mép đèn cửa giấy (m, thế giới)
  function makeCastleMats() {
    M2 = makeMaterials(NIGHT);
    for (const [k, m] of Object.entries(M2)) {
      if (!m.isMeshStandardMaterial) continue;
      patchFL(m, FLU, { gain: 3, lit: k === 'paper' ? lit : null });
      m.envMapIntensity *= 0.5;   // (Mike 30/9) ánh môi trường đều mọi phía làm hai mặt tường sáng như nhau
    }
    M2.stoneCore.userData.hot.uBreathK.value = 0;   // toà thành đứng yên: mạch lõi không phồng theo nhịp thở
    // lõi 栗石 giữa mạch: chỉ ngả 緑青 thật tối, không phát sáng (như toà thành màn đầu lúc tối hẳn — soát p7a A2): không một vạch sáng
    // dọc nào ở khe góc tường
    // (soát p10a A6: ×0,3 thành KHE ĐEN chạy suốt góc trước nền đá) — lõi ngả đúng tông mặt đá đêm (xám rêu, sáng xấp xỉ mặt tảng):
    // góc lộ lõi đọc ra đá dăm, không đen, không vạch sáng
    M2.stoneCore.color.set(0x8d948e).multiplyScalar(0.45); M2.stoneCoreDim.color.set(0x8d948e).multiplyScalar(0.3);
  }
  // đất đồi + mỏm + bãi: màu theo đỉnh (cỏ lốm đốm / đất mới san), vật liệu như đồi gốc (forest.js buildHill)
  const G = NIGHT.ground;
  const groundMat = patchFL(dress(new THREE.MeshStandardMaterial({ color: G.color, roughness: 0.97, metalness: 0, envMapIntensity: 0.5, vertexColors: true }), {
    grain: 0.55, scale: 0.9, fine: false, rough: 0.1, mottle: 0.55, mottleColor: G.moss, streak: 0.0,
    bump: 0.55, bumpScale: 0.42, rim: 0.12, rimColor: NIGHT.mat.rim, occ: [-26, 1, 0.55],
  }), FLU, { gain: 4 });
  // rừng tuyết tùng: cùng áo vật liệu của rừng màn đầu, màu đêm theo từng cây
  const forestMat = patchFL(dress(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0, envMapIntensity: 0.45 }),
    { grain: 0.75, scale: 2.4, fine: false, rim: 0.16, rimColor: NIGHT.mat.rim, bump: 0.8, bumpScale: 1.6 }), FLU, { gain: 1.6 });
  const grassMat = patchFL(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), FLU, { gain: 2.2 });
  // gỗ cọc / ván mới xẻ: sáng hơn cỏ, bắt ánh trăng và ánh nét
  const woodMat = patchFL(new THREE.MeshStandardMaterial({ color: 0x9d9078, roughness: 0.82 }), FLU, { gain: 2.6 });
  const dayMat = stringMat();
  const skyMat = skyMaterial(NIGHT, sunDir);
  // lớp nét theo LỚP kết cấu: 地 · 石垣 · 骨 · 地縄 · 道 — mỗi lớp một vật liệu (sáng dần riêng)
  // (Mike 30/9: nét 骨 "như thanh đèn neon") 骨 dịu hơn, cạn cọ nhiều hơn và DÀY nhịp hơn (quãng cạn mỗi ~7 m thay vì ~28 m), mép răng
  // cưa rõ, lõi sáng rất ít — đọc ra một nét cọ mực phát sáng, không phải thanh đèn đều tắp
  const LAYER_K = { '地': 1.45, '石垣': 1.6, '骨': 0.85, '柱': 0.85, '地縄': 1.7, '道': 1.55 };
  // (soát p11a A4) xà (lớp 骨) ngắn: bớt cạn cọ để nét liền tới tận cột; cột (柱) giữ khô, nhịp cạn dày
  const LAYER_DRY = { '地': 0.62, '石垣': 0.55, '骨': 0.8, '柱': 1.1, '地縄': 0.8, '道': 1 };
  const LAYER_SKIP = { '地': 0.35, '石垣': 0.3, '骨': 0.45, '柱': 1.0, '地縄': 0.7, '道': 1 };
  // lõi sáng trong thân nét (0,85 = nét năm tháng): 骨 lõi dịu hơn — soát p10a A3 "bớt lõi trắng, thêm xơ khô như nét dốc thành 地"
  const LAYER_CORE = { '地': 0.85, '石垣': 0.85, '骨': 0.25, '柱': 0.25, '地縄': 0.85, '道': 0.6 };
  const LAYER_SKIPF = { '骨': 0.14, '柱': 0.14 }, LAYER_RAG = { '骨': 0.5, '柱': 0.5 };
  const LAYERS = {};
  for (const name of Object.keys(LAYER_K)) LAYERS[name] = { name, mat: brushMat({ k: LAYER_K[name] * 1.3, dry: LAYER_DRY[name], skip: LAYER_SKIP[name], coreK: LAYER_CORE[name], skipF: LAYER_SKIPF[name] ?? 0.035, rag: LAYER_RAG[name] ?? 0.12 }), strokes: [], mesh: null };
  const LAYER_LIST = Object.values(LAYERS);
  LAYERS['道'].mat.uniforms.uTail.value = 16;
  LAYERS['柱'].mat.depthTest = false;   // cột 骨 vẽ đè lên mép mái (xem chỗ kẻ cột)   // đổ vào góc bãi bằng thân nét (bớt cạn), vuốt 16 m cuối
  const mistMats = [mistMat(FLU, 0x2a3633, 0.26, 0.03, 3.1), mistMat(FLU, 0x2e3a37, 0.22, 0.055, 5.3), mistMat(FLU, 0x26312e, 0.5, 0.012, 7.7)];

  // ── ĐÈN GIẢ: danh sách (vị trí, cường độ, lớp) — cường độ thật = cường độ × phần lớp đã vẽ ────────────────────────────────
  let flCount = 0;
  const FL_TAG = [], FL_I = [], FL_S = [];
  function addFL(p, I, tag, color = RAMP[400], sIdx = 0) {
    if (flCount >= FL_MAX) return false;
    FLU.uFL.value[flCount].set(p.x, p.y, p.z, 0);
    FL_TAG[flCount] = tag; FL_I[flCount] = I * 0.28; FL_S[flCount] = sIdx;
    FLU.uFLCol.value[flCount].set(color);
    flCount++;
    return true;
  }

  // (soát p10a B5) xếp đèn theo nhóm lớp và tính quả cầu bao từng nhóm (xem uFLG) — làm MỘT lần sau khi đặt xong mọi đèn
  const FL_NHOM = ['地縄', '地', '石垣', '骨', '皮'];
  // tầm với của từng nhóm (× uFLR 20 m): đất / đá giữ như cũ; ánh nét 骨 loang ~9 m quanh cột + xà; đèn cửa sổ chỉ ~5 m quanh ô cửa
  const FL_TAM = { '地縄': 1, '地': 1, '石垣': 1, '骨': FLR_COT, '皮': FLR_CUA };
  function groupFL() {
    const idx = [];
    for (let i = 0; i < flCount; i++) idx.push(i);
    const gOf = (i) => { const g = FL_NHOM.indexOf(FL_TAG[i]); return g < 0 ? FL_NG - 1 : g; };
    idx.sort((a, b) => gOf(a) - gOf(b) || a - b);
    const P = idx.map((i) => FLU.uFL.value[i].clone()), C = idx.map((i) => FLU.uFLCol.value[i].clone());
    const T = idx.map((i) => FL_TAG[i]), I = idx.map((i) => FL_I[i]), S0 = idx.map((i) => FL_S[i]);
    for (let j = 0; j < flCount; j++) { FLU.uFL.value[j].copy(P[j]); FLU.uFLCol.value[j].copy(C[j]); FL_TAG[j] = T[j]; FL_I[j] = I[j]; FL_S[j] = S0[j]; }
    for (let g = 0; g < FL_NG; g++) {
      const reach = FLU.uFLR.value * 1.6 * FL_TAM[FL_NHOM[g]] + 1;
      let a = -1, b = -1;
      for (let j = 0; j < flCount; j++) if (gOf(j) === g) { if (a < 0) a = j; b = j + 1; }
      const G = FLU.uFLG.value[g];
      if (a < 0) { G.set(0, -1e5, 0, 0); FLU.uFLGR.value[g].set(0, 0, 1); continue; }
      const c = new THREE.Vector3();
      for (let j = a; j < b; j++) c.add(tmpV.set(P[j].x, P[j].y, P[j].z));
      c.divideScalar(b - a);
      let r = 0; for (let j = a; j < b; j++) r = Math.max(r, c.distanceTo(tmpV.set(P[j].x, P[j].y, P[j].z)));
      G.set(c.x, c.y, c.z, r + reach);
      FLU.uFLGR.value[g].set(a, b, FL_TAM[FL_NHOM[g]]);
    }
  }

  // ── NÉT: gom điểm theo lớp, dựng dải hình khi xong (5 đỉnh ngang nét: nét phủ theo mặt đất / mặt đá) ─────────────────────────
  function addStroke(name, pts, { w = 1, lat = null, snap = null, seed = 1 } = {}) {
    const Lr = LAYERS[name];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const len = curve.getLength();
    const n = Math.max(10, Math.min(1400, Math.round(len / Math.max(0.12, w * 0.3))));
    const P = curve.getSpacedPoints(n), T = P.map((_, i) => curve.getTangentAt(Math.min(1, i / n)));
    const s = { P, T, len, w, lat, snap, seed: (seed * 0.371) % 1, i: Lr.strokes.length, curve };
    Lr.strokes.push(s);
    s.every = (step) => { const out = []; const m = Math.max(1, Math.round(len / step)); for (let q = 0; q <= m; q++) out.push(curve.getPointAt(Math.min(1, q / m))); return out; };
    return s;
  }
  function* flushStrokes(due) {
    const KX = 4;
    for (const [name, Lr] of Object.entries(LAYERS)) {
      if (!Lr.strokes.length) continue;
      const pos = [], A = { aT: [], aS: [], aV: [], aI: [], aW: [], aL: [], aSeed: [] }, idx = [];
      for (const s of Lr.strokes) {
        const n = s.P.length, base = pos.length / 3, cum = [0];
        for (let i = 1; i < n; i++) cum.push(cum[i - 1] + s.P[i].distanceTo(s.P[i - 1]));
        const Lt = cum[n - 1] || 1;
        for (let i = 0; i < n; i++) {
          let lat = s.lat ? s.lat(s.P[i], s.T[i]) : new THREE.Vector3().crossVectors(s.T[i], UP);
          if (lat.lengthSq() < 1e-8) lat = new THREE.Vector3(1, 0, 0);
          lat.normalize();
          for (let j = 0; j <= KX; j++) {
            const v = (j / KX * 2 - 1) * 1.3;
            let q = s.P[i].clone().addScaledVector(lat, v * s.w * 0.5);
            if (s.snap) q = s.snap(q);
            pos.push(q.x, q.y, q.z);
            A.aT.push(cum[i] / Lt); A.aS.push(cum[i]); A.aV.push(v); A.aI.push(s.i); A.aW.push(s.w); A.aL.push(Lt); A.aSeed.push(s.seed);
          }
          if (i < n - 1) for (let j = 0; j < KX; j++) { const a = base + i * (KX + 1) + j, b = a + KX + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
        }
        if (due()) yield;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      for (const [nm, arr] of Object.entries(A)) g.setAttribute(nm, new THREE.Float32BufferAttribute(arr, 1));
      g.setIndex(idx);
      const mesh = new THREE.Mesh(g, Lr.mat); mesh.frustumCulled = false; mesh.renderOrder = 12; mesh.name = 'lh-net-' + name;
      scene.add(mesh); Lr.mesh = mesh;
      if (due()) yield;
    }
  }

  // ── các phần dựng ──────────────────────────────────────────────────────────────────────────────────────────────────────
  let terrain = null, forest = [], grass = null, ridges = null, sea = null, unkai = null, castle2 = null, stakes = null, boards = null, strings = null;
  const mists = [];
  let CORN = null;
  let portrait = false, W_ = innerWidth, H_ = innerHeight;
  const tmpV = new THREE.Vector3();

  function* build() {
    const t0 = performance.now();
    let tY = performance.now();
    // nhường khung THEO THỜI GIAN: mỗi mẩu ≤ ~1,5 ms (+ một bước việc) — app.js gọi tiếp trong phần thời gian thừa của khung
    const due = () => { if (performance.now() - tY > 1.5) { tY = performance.now(); return true; } return false; };
    const R = rng32(20260930);
    if (!M2) { makeCastleMats(); yield; tY = performance.now(); }
    { const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 28), skyMat); sky.frustumCulled = false; sky.renderOrder = -100; sky.name = 'lh-troi'; scene.add(sky); }
    yield; tY = performance.now();

    // 1. ĐỊA HÌNH: lưới cực, dày quanh mỏm + bãi (0,6 m theo bán kính, 0,008 rad theo góc), thưa ra xa; pháp tuyến từ lưới
    st.at = 'dat';
    const RS = [];
    for (let r = 0; r < 520;) { RS.push(r); r += r < 20 ? 2.0 : r < 28 ? 1.0 : r < 104 ? 0.6 : r < 150 ? 1.4 : Math.min(16, 1.4 + (r - 150) * 0.06); }
    RS.push(520);
    const AS = [];
    { const a0 = SPUR.az - 0.95, a1 = SPUR.az + 0.95; for (let a = a1; a < a0 + Math.PI * 2 - 1e-6;) { AS.push(a); a += 0.035; } for (let a = a0; a < a1 - 1e-6;) { AS.push(a); a += 0.008; } AS.sort((p, q) => p - q); AS.push(AS[0] + Math.PI * 2); }
    const NR = RS.length, NA = AS.length, N = NR * NA;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), nrm = new Float32Array(N * 3);
    let v = 0;
    for (let i = 0; i < NR; i++) {
      const r = RS[i];
      for (let j = 0; j < NA; j++) {
        const a = AS[j], x = Math.sin(a) * r, z = Math.cos(a) * r, y = hill2(x, z);
        pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
        // màu: cỏ lốm đốm trên mỏm (hơi ngả lục), đất mới san sáng hơn, mịn, có vệt lưỡi ủi dọc cạnh dài
        const nG = vnz(x * 0.35, z * 0.35), nB = vnz(x * 0.08 + 4, z * 0.08), wS = r < 15 ? 0 : spurK(x, z);
        let cr = (0.84 + 0.28 * nG) * (1 - 0.1 * wS), cg = 0.84 + 0.28 * nG, cb = (0.84 + 0.28 * nG) * (1 - 0.05 * wS);
        const d = padDist(x, z), eN = vnz(x * 0.6 + 9, z * 0.6);
        const eW = vnz(x * 0.13 + 9, z * 0.13);
        const soil = 1 - sst(2.2 + 1.4 * eN + 2.6 * eW, 4.2 + 1.8 * eN + 3.2 * eW, d);
        if (soil > 0) {
          const uu = (x - PAD.c.x) * PAD.side.x + (z - PAD.c.z) * PAD.side.z, vv = (x - PAD.c.x) * PAD.toC.x + (z - PAD.c.z) * PAD.toC.z;
          const tr = (0.93 + 0.09 * Math.sin(vv * 2.1 + vnz(uu * 0.05, 3) * 3)) * (0.95 + 0.1 * nB);
          const gr = 0.9 + 0.2 * vnz(x * 1.7, z * 1.7);
          cr += (2.45 * tr * gr - cr) * soil; cg += (2.25 * tr * gr - cg) * soil; cb += (1.9 * tr * gr - cb) * soil;
        }
        // taluy đất đắp mép bãi: đất lộ, sẫm hơn đất san
        const tal = sst(3.0, 4.2, d) * (1 - sst(5.5, 7.5, d));
        if (tal > 0) { const k = tal * 0.8; cr += (1.5 - cr) * k; cg += (1.35 - cg) * k; cb += (1.15 - cb) * k; }
        col[v * 3] = cr; col[v * 3 + 1] = cg; col[v * 3 + 2] = cb;
        v++;
        if ((v & 127) === 0 && due()) yield;
      }
    }
    // pháp tuyến: tích có hướng của hai tiếp tuyến theo lưới (sai phân trung tâm) — không tính lại độ cao
    const at = (i, j, o) => pos[(i * NA + j) * 3 + o];
    for (let i = 0; i < NR; i++) {
      for (let j = 0; j < NA; j++) {
        const k = (i * NA + j) * 3;
        if (i === 0) { nrm[k] = 0; nrm[k + 1] = 1; nrm[k + 2] = 0; continue; }
        const i0 = Math.max(0, i - 1), i1 = Math.min(NR - 1, i + 1), j0 = j === 0 ? NA - 2 : j - 1, j1 = j === NA - 1 ? 1 : j + 1;
        const rx = at(i1, j, 0) - at(i0, j, 0), ry = at(i1, j, 1) - at(i0, j, 1), rz = at(i1, j, 2) - at(i0, j, 2);
        const ax = at(i, j1, 0) - at(i, j0, 0), ay = at(i, j1, 1) - at(i, j0, 1), az = at(i, j1, 2) - at(i, j0, 2);
        // n = a × r (hướng lên)
        let nx = ay * rz - az * ry, ny = az * rx - ax * rz, nz = ax * ry - ay * rx;
        if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const L = Math.hypot(nx, ny, nz) || 1;
        nrm[k] = nx / L; nrm[k + 1] = ny / L; nrm[k + 2] = nz / L;
      }
      if ((i & 7) === 7 && due()) yield;
    }
    const idx = new Uint32Array((NR - 1) * (NA - 1) * 6);
    for (let i = 0, q = 0; i < NR - 1; i++) {
      for (let j = 0; j < NA - 1; j++) { const a = i * NA + j, b = a + 1, c = a + NA, d = c + 1; idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
      if ((i & 15) === 15 && due()) yield;
    }
    {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.computeBoundingSphere();
      terrain = new THREE.Mesh(g, groundMat); terrain.name = 'lh-doi'; terrain.frustumCulled = false; scene.add(terrain);
      st.verts = N;
    }
    yield; tY = performance.now();

    // 2. NÚI XA, BIỂN SƯƠNG, SƯƠNG VỜN (cùng shader của màn đầu — không dịch chương trình mới)
    st.at = 'nui';
    {
      const rg = buildRidgeLayersSteps(scene, ENV_CAM, NIGHT, { mistY: -16, sunSide: 0.3, sunK: 0.5, half: 1.5 });
      let r_ = rg.next(); while (!r_.done) { yield; tY = performance.now(); r_ = rg.next(); }
      ridges = r_.value;
    }
    yield; tY = performance.now();
    sea = buildMistSea(scene, NIGHT, ENV_CAM, sunDir);
    // (soát p10a A8) biển sương của chương này KHÔNG dùng vòng mực của màn mở (mở thẳng &chuong=6 lúc màn đầu còn chạy vòng)
    for (const m of sea.mats) m.uniforms.uIntroOn = { value: 0 };
    // làn mỏng trên cùng (y −3) vắt NGAY trên bãi (−8) — mỏng đi để bãi đọc rõ; hai tầng dưới giữ nguyên
    sea.mats[2].uniforms.uAlpha.value = 0.28;
    unkai = buildUnkai(scene, rng32(77), { x: ENV_CAM.x, y: ENV_CAM.y, z: ENV_CAM.z, r: 70 }, NIGHT);
    yield; tY = performance.now();

    // 3. TOÀ THÀNH: nhân bản cây đối tượng của toà thành màn đầu (dùng chung hình), thay vật liệu đêm
    st.at = 'thanh';
    castle2 = new THREE.Group(); castle2.name = 'lh-thanh'; castle2.rotation.y = 0.08;
    const swap = new Map();
    for (const k of Object.keys(deps.M)) if (M2[k]) swap.set(deps.M[k], M2[k]);
    const mat = (m) => (Array.isArray(m) ? m.map((x) => swap.get(x) || x) : swap.get(m) || m);
    const copyObj = (o) => {
      let c = null;
      if (o.isInstancedMesh) {
        c = new THREE.InstancedMesh(o.geometry, mat(o.material), o.instanceMatrix.count);
        c.instanceMatrix.array.set(o.instanceMatrix.array); c.instanceMatrix.needsUpdate = true;
        if (o.instanceColor) { c.instanceColor = new THREE.InstancedBufferAttribute(o.instanceColor.array.slice(), 3); }
        c.count = o.count;
      } else if (o.isMesh) c = new THREE.Mesh(o.geometry, mat(o.material));
      else if (o.isGroup || o.type === 'Object3D') c = new THREE.Group();
      else return null;
      c.name = o.name; c.position.copy(o.position); c.quaternion.copy(o.quaternion); c.scale.copy(o.scale);
      c.matrixAutoUpdate = o.matrixAutoUpdate; if (!o.matrixAutoUpdate) c.matrix.copy(o.matrix);
      // lõi tầng / lưới cột kèo không lọt qua khe tường (Mike 28/9) — giấu như màn đầu
      c.visible = o.visible && !/^loi-tang|^luoi-khung/.test(o.name);
      c.renderOrder = o.renderOrder; c.frustumCulled = o.frustumCulled; c.layers.mask = o.layers.mask;
      return c;
    };
    const stack = [];
    for (const root of [deps.ishigaki.group, deps.tenshu.group]) { const c = copyObj(root); castle2.add(c); stack.push([root, c]); }
    while (stack.length) {
      const [o, c] = stack.pop();
      for (const ch of o.children) { const cc = copyObj(ch); if (!cc) continue; c.add(cc); stack.push([ch, cc]); }
      if (due()) yield;
    }
    scene.add(castle2);
    castle2.updateMatrixWorld(true);
    yield; tY = performance.now();
    // (soát p10a B5) GỘP các lưới nhỏ tĩnh của toà thành theo vật liệu: chương này bị giới hạn bởi SỐ LỆNH VẼ (luồng chính gửi ~300 lệnh
    // mỗi khung — 145 lưới lẻ trung bình 73 tam giác: tấm ván, thanh gỗ, …), không bởi card. Cùng vật liệu + cùng bộ thuộc tính →
    // một lưới (toạ độ đã nhân sẵn vị trí trong toà thành). Hình y hệt: cùng vật liệu, cùng chương trình, chỉ bớt lệnh vẽ. &lhgop=0 để so
    if (!/[?&]lhgop=0/.test(location.search)) yield* mergeCastle(castle2, due);
    yield; tY = performance.now();

    // (đường nét 道 — tính trước để rừng chừa một lối cho nó: nét không bị cây che thành từng khúc)
    const roadCurve = (() => {
      const { side: sd, toC: tc } = PAD;
      const o3 = (az, r) => new THREE.Vector3(Math.sin(az) * r, 0, Math.cos(az) * r / 1.08);
      const p0 = PAD.c.clone().addScaledVector(sd, -PAD.Lw / 2).addScaledVector(tc, -PAD.Ld / 2);
      const end = p0.clone().addScaledVector(sd, -0.9);
      return new THREE.CatmullRomCurve3([o3(SPUR.az - 0.34, 520), o3(SPUR.az - 0.31, 380), o3(SPUR.az - 0.22, 240), o3(SPUR.az - 0.12, 140),
        end.clone().addScaledVector(sd, -16).addScaledVector(tc, -10), end.clone().addScaledVector(sd, -5).addScaledVector(tc, -1.4), end], false, 'centripetal');
    })();
    const roadS = roadCurve.getSpacedPoints(90);
    const nearRoad = (x, z, d) => { for (let i = 0; i < roadS.length; i++) { const q = roadS[i]; if ((q.x - x) * (q.x - x) + (q.z - z) * (q.z - z) < d * d) return true; } return false; };
    // (cỏ) khúc cuối của lối, mẫu dày 1 m — chỉ đoạn gần bãi (cỏ chỉ mọc trên mỏm)
    const roadG = roadCurve.getSpacedPoints(640).filter((q) => Math.hypot(q.x - PAD.c.x, q.z - PAD.c.z) < 95);
    const nearRoadG = (x, z) => { for (let i = 0; i < roadG.length; i++) { const q = roadG[i]; if ((q.x - x) * (q.x - x) + (q.z - z) * (q.z - z) < 6.8) return true; } return false; };
    // 4. RỪNG: ba hình cây của rừng màn đầu, đặt lại trên đồi có mỏm; nhổ cây trên sống mỏm (mép gợn, không cắt thẳng), trong bãi,
    //    trên dốc thành phía máy (đồng mức có chỗ nằm — thành Nhật thật cũng phát quang dốc)
    st.at = 'rung';
    {
      const geos = deps.forestGeos;
      const lists = geos.map(() => []);
      const cLit = lin(NIGHT.near.lit), cSh = lin(NIGHT.near.shade), rest = new THREE.Vector3().fromArray(POSE.land.rest.p);
      for (let i = 0; i < 4200; i++) {
        const a = R() * Math.PI * 2, rad = 19.5 + Math.pow(R(), 0.85) * 175;
        const x = Math.cos(a) * rad, z = Math.sin(a) * rad / 1.08;
        const rr = Math.hypot(x, z * 1.08), dA = Math.abs(wrapA(Math.atan2(x, z) - SPUR.az));
        const k = spurK(x, z), n1 = vnz(x * 0.09, z * 0.09);
        if (k > 0.42 + 0.3 * (n1 - 0.5)) continue;                 // sống mỏm: cỏ, không cây (mép gợn theo nhiễu)
        if (padDist(x, z) < 14 + 6 * n1) continue;                 // quanh bãi
        if (rr < 36 && dA < 1.15) continue;                        // dốc thành phía máy
        if (Math.hypot(x - rest.x, z - rest.z) < 30) continue;     // ngay trước ống kính
        if (nearRoad(x, z, 9 + 4 * n1)) continue;                  // lối của nét 道 qua rừng
        const ground = hill2(x, z);
        let h = 7 + Math.pow(R(), 0.7) * 11;
        // cây ĐỨNG TRƯỚC nền đá (giữa máy lúc nghỉ và chân tường): ngọn không vượt đường ngắm tới chân tường — tường đá là nhân vật chính
        // (cùng luật của rừng màn đầu, forest.js buildHillForest)
        {
          const dCam = Math.hypot(x - rest.x, z - rest.z), cl = Math.hypot(rest.x, rest.z), toCam = (x * rest.x + z * rest.z) / cl;
          if (toCam > 0) {
            const lateral = Math.sqrt(Math.max(0, x * x + z * z - toCam * toCam));
            if (lateral < 34) {
              const maxTop = rest.y - ((rest.y - 0.5) / (cl - 14)) * dCam - 1.5;
              if (ground + h > maxTop) h = maxTop - ground;
              if (h < 1.6) continue;
            }
          }
        }
        const gi = i % 3, w = h * (0.26 + R() * 0.08);
        const ry = R() * 6.28, tx = (R() - 0.5) * 0.08, tz = (R() - 0.5) * 0.08, tone = Math.pow(R(), 0.8);
        lists[gi].push([x, ground - 0.6, z, w, h, tx, ry, tz, tone, Math.hypot(x - rest.x, z - rest.z)]);
        if ((i & 127) === 127 && due()) yield;
      }
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), tc = new THREE.Color();
      for (let gi = 0; gi < geos.length; gi++) {
        const L = lists[gi].sort((u, w) => u[9] - w[9]);   // gần trước: nấc 2–4 bớt cây xa bằng số cây vẽ
        const im = new THREE.InstancedMesh(geos[gi], forestMat, L.length);
        for (let j = 0; j < L.length; j++) {
          const [x, y, z, w, h, tx, ry, tz, tone] = L[j];
          e.set(tx, ry, tz); q.setFromEuler(e);
          m4.compose(p.set(x, y, z), q, s.set(w, h, w)); im.setMatrixAt(j, m4);
          im.setColorAt(j, tc.copy(cSh).lerp(cLit, tone));
          if ((j & 255) === 255 && due()) yield;
        }
        im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
        im.name = 'lh-sugi-' + gi; im.frustumCulled = false; im.userData.nFull = L.length;
        scene.add(im); forest.push(im); st.trees += L.length;
      }
    }
    yield; tY = performance.now();

    // 5. BÃI ĐẤT: cỏ trên mỏm (chừa đất mới san), cọc 遣り方 + ván ngang, dây 水糸, sương thấp
    st.at = 'bai';
    const { c, side, toC, Lw, Ld, h } = PAD;
    const atP = (u, w) => c.clone().addScaledVector(side, u).addScaledVector(toC, w);
    {
      const geo = new THREE.ConeGeometry(0.5, 1, 5, 1); geo.translate(0, 0.5, 0);
      const list = [];
      for (let t = 0; t < 120000 && list.length < 15000; t++) {
        if ((t & 127) === 127 && due()) yield;
        const r = 24 + R() * 110, a = SPUR.az + (R() - 0.5) * 1.3;
        const x = Math.sin(a) * r, z = Math.cos(a) * r / 1.04;
        const k = spurK(x, z); if (k < 0.1 || R() > k + 0.12) continue;
        // (soát p10a A5) lối của nét 道: không cỏ (cỏ cao ven bãi che mất khúc nét đổ vào góc bãi khi nhìn từ máy khổ dọc)
        if (nearRoadG(x, z)) continue;
        // mép cỏ gợn theo hai tầng nhiễu (soát p10a A7: mép cỏ thẳng tắp theo cạnh bãi làm bãi thành "bục kê") — có chỗ cỏ lấn vào
        // mép đất, có chỗ đất lộ loang ra
        const d = padDist(x, z); if (d < 3.4 + 3.2 * vnz(x * 0.13 + 9, z * 0.13) + 1.2 * vnz(x * 0.6 + 9, z * 0.6)) continue;
        // mép bãi và sống mỏm: cỏ cao hơn, dày hơn (đọc ra "đất để hoang chờ xây") — cao thấp theo từng đám, không thành một dải đều
        const tall = d < 12 ? 1 + 0.55 * vnz(x * 0.21 + 4, z * 0.21 - 2) : 1;
        list.push([x, hill2(x, z), z, 0.22 + R() * 0.32, (0.35 + R() * 0.6) * tall, Math.hypot(x - ENV_CAM.x, z - ENV_CAM.z)]);
      }
      yield; tY = performance.now(); st.at = 'bai-xep';
      // xếp GẦN TRƯỚC bằng đếm ô khoảng cách (không so từng đôi — sort 15 000 phần tử một lúc dài quá một mẩu)
      {
        const NB = 64; let dMax = 1; for (let i = 0; i < list.length; i++) dMax = Math.max(dMax, list[i][5]);
        const bins = Array.from({ length: NB }, () => []);
        for (let i = 0; i < list.length; i++) { const it = list[i]; bins[Math.min(NB - 1, Math.floor((it[5] / dMax) * NB))].push(it); if ((i & 2047) === 2047 && due()) yield; }
        list.length = 0; for (const bn of bins) { for (const it of bn) list.push(it); if (due()) yield; }
      }
      yield; tY = performance.now(); st.at = 'bai-co';
      grass = new THREE.InstancedMesh(geo, grassMat, list.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cc = new THREE.Color(), sc = new THREE.Vector3();
      for (let i = 0; i < list.length; i++) {
        const [x, y, z, wd, hg] = list[i];
        e.set((R() - 0.5) * 0.3, R() * 6.28, (R() - 0.5) * 0.3); q.setFromEuler(e);
        m4.compose(tmpV.set(x, y - 0.04, z), q, sc.set(wd, hg, wd)); grass.setMatrixAt(i, m4);
        grass.setColorAt(i, cc.setHex(0x2f3d37).multiplyScalar(0.7 + R() * 0.6));
        if ((i & 511) === 511 && due()) yield;
      }
      grass.instanceMatrix.needsUpdate = true; grass.instanceColor.needsUpdate = true; grass.name = 'lh-co'; grass.frustumCulled = false;
      grass.userData.nFull = list.length; st.grass = list.length;
      scene.add(grass);
    }
    yield; tY = performance.now();
    st.at = 'bai-coc';
    // cọc + ván: gỗ mới xẻ; cọc 0,22 m cao 1,9 m (0,3 m cắm đất) · ván 0,3 × 0,06 m ốp NGOÀI mặt cọc (không xuyên cọc), mặt ván cao 1,25 m
    const OFF = 2.4, SK = 0.22, BH = 1.1, BHh = 0.3, BT = 0.06, SH = 1.9;
    CORN = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sv]) => ({ p: atP(su * Lw / 2, sv * Ld / 2), ox: side.clone().multiplyScalar(su), oz: toC.clone().multiplyScalar(sv) }));
    {
      const unit = new THREE.BoxGeometry(1, 1, 1);
      stakes = new THREE.InstancedMesh(unit, woodMat, 12); stakes.name = 'lh-coc';
      boards = new THREE.InstancedMesh(unit, woodMat, 8); boards.name = 'lh-van';
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      let si = 0, bi = 0;
      const put = (P, lean) => {
        q.setFromEuler(new THREE.Euler((R() - 0.5) * lean, R() * 0.2, (R() - 0.5) * lean));
        m4.compose(tmpV.set(P.x, h + SH / 2 - 0.3, P.z), q, new THREE.Vector3(SK, SH, SK)); stakes.setMatrixAt(si++, m4);
      };
      const plank = (A, B, nOut) => {
        const Lb = A.distanceTo(B) + SK * 1.6;
        const mid = A.clone().add(B).multiplyScalar(0.5).addScaledVector(nOut, SK / 2 + BT / 2 + 0.004);
        q.setFromAxisAngle(UP, -Math.atan2(B.z - A.z, B.x - A.x));
        m4.compose(tmpV.set(mid.x, h + BH, mid.z), q, new THREE.Vector3(Lb, BHh, BT)); boards.setMatrixAt(bi++, m4);
      };
      for (const k of CORN) {
        const K = k.p.clone().addScaledVector(k.ox, OFF).addScaledVector(k.oz, OFF);
        const e1 = k.p.clone().addScaledVector(k.ox, OFF).addScaledVector(k.oz, -0.9);
        const e2 = k.p.clone().addScaledVector(k.oz, OFF).addScaledVector(k.ox, -0.9);
        for (const Q of [K, e1, e2]) put(Q, 0.05);
        plank(e1, K, k.ox); plank(e2, K, k.oz);
      }
      stakes.instanceMatrix.needsUpdate = true; boards.instanceMatrix.needsUpdate = true;
      stakes.frustumCulled = false; boards.frustumCulled = false;
      scene.add(stakes, boards);
    }
    // dây 水糸: vắt trên mặt ván, qua đúng bốn đường tường (vượt quá góc tới ván)
    {
      const y = h + BH + BHh / 2 + 0.02;
      const endX = (k) => k.p.clone().addScaledVector(k.ox, OFF + SK), endZ = (k) => k.p.clone().addScaledVector(k.oz, OFF + SK);
      const segs = [[endX(CORN[0]), endX(CORN[1])], [endX(CORN[3]), endX(CORN[2])], [endZ(CORN[1]), endZ(CORN[2])], [endZ(CORN[0]), endZ(CORN[3])]];
      const P = [], B = [], S = [], E = [], I = [];
      segs.forEach(([a, b], n) => {
        // võng rất nhẹ ở giữa (dây căng tay): chia 6 khúc
        const K = 6;
        for (let k = 0; k < K; k++) {
          const u0 = k / K, u1 = (k + 1) / K, sag = (u) => -0.05 * Math.sin(Math.PI * u);
          const A = a.clone().lerp(b, u0); A.y = y + sag(u0); const Bq = a.clone().lerp(b, u1); Bq.y = y + sag(u1);
          const base = P.length / 3;
          for (const [side_, end] of [[-1, 0], [1, 0], [-1, 1], [1, 1]]) { P.push(A.x, A.y, A.z); B.push(Bq.x, Bq.y, Bq.z); S.push(side_); E.push(end); }
          I.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
        }
        void n;
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('aB', new THREE.Float32BufferAttribute(B, 3));
      g.setAttribute('aSide', new THREE.Float32BufferAttribute(S, 1));
      g.setAttribute('aEnd', new THREE.Float32BufferAttribute(E, 1));
      g.setIndex(I);
      strings = new THREE.Mesh(g, dayMat); strings.name = 'lh-day'; strings.frustumCulled = false; strings.renderOrder = 11;
      scene.add(strings);
    }
    st.at = 'bai-suong';
    // sương thấp: một làn trên mặt bãi, một làn lấm tấm sát đất trên mỏm, một lớp dày dưới thung
    {
      const mk = (m, y, size, cx, cz, order) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), m); p.rotation.x = -Math.PI / 2; p.position.set(cx, y, cz); p.renderOrder = order; p.name = 'lh-suong'; p.frustumCulled = false; scene.add(p); mists.push(p); };
      mk(mistMats[0], h + 0.9, 240, c.x, c.z, 5);
      mk(mistMats[1], h + 0.35, 170, c.x * 0.9, c.z * 0.9, 5);
      mk(mistMats[2], -23, 1400, c.x * 0.4, c.z * 0.4, 5);
    }
    yield; tY = performance.now();

    // 6. NÉT CỌ (tính bằng số từ dữ liệu kết cấu — không bắn tia)
    st.at = 'net';
    const S = deps.structure, rot = 0.08, cr = Math.cos(rot), sr = Math.sin(rot);
    const toW = (x, y, z) => new THREE.Vector3(x * cr + z * sr, y, -x * sr + z * cr);        // toạ độ trong nhóm toà thành → thế giới
    const dirW = (x, z) => new THREE.Vector3(x * cr + z * sr, 0, -x * sr + z * cr).normalize();
    const nF = dirW(0, 1), nR = dirW(1, 0);
    const onFace = (n) => (p, t) => new THREE.Vector3().crossVectors(t, n);
    const snapG = (q) => { q.y = Math.max(q.y, hill2(q.x, q.z) + 0.45); return q; };
    const snapD = (q) => { q.y = hill2(q.x, q.z) + 0.12; return q; };
    const outer = (vals, win = 6, sm = 5) => {
      const mx = vals.map((_, i) => { let m = -1e9; for (let j = Math.max(0, i - win); j <= Math.min(vals.length - 1, i + win); j++) m = Math.max(m, vals[j]); return m; });
      return mx.map((_, i) => { let a = 0, n = 0; for (let j = Math.max(0, i - sm); j <= Math.min(mx.length - 1, i + sm); j++) { a += mx[j]; n++; } return a / n; });
    };
    const extAt = (y) => { const t = cl01(y / IS.H); return [IS.topA + (IS.baseA - IS.topA) * Math.pow(1 - t, IS.p), IS.topB + (IS.baseB - IS.topB) * Math.pow(1 - t, IS.p)]; };
    // 地 ĐỒNG MỨC trên dốc thành (mặt về phía máy): hai nét to theo đúng đường đồng mức, cọ nhấc lên giữa hai nét
    {
      const camAng = Math.atan2(POSE.land.rest.p[2], POSE.land.rest.p[0]);
      // (từng mẩu: mỗi điểm một lần dò nhị phân 30 bước trên độ cao — nhường khung giữa chừng)
      function* ringPts(level, a0, a1, out, step = 0.01) {
        for (let a = a0; a <= a1; a += step) {
          let lo = 17.2, hi = 200;
          for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (hill2(Math.cos(a) * m, Math.sin(a) * m / 1.08) > level) lo = m; else hi = m; }
          const rr = (lo + hi) / 2, x = Math.cos(a) * rr, z = Math.sin(a) * rr / 1.08;
          out.push(new THREE.Vector3(x, hill2(x, z) + 0.45, z));
          if (due()) yield;
        }
      }
      const RINGS = [[-2.4, -0.95, 0.75, 3], [-5.6, -0.8, 0.9, 5]];
      for (let i = 0; i < RINGS.length; i++) {
        const [lv, d0, d1, seed] = RINGS[i], pts = [];
        yield* ringPts(lv, camAng + d0, camAng + d1, pts);
        const s = addStroke('地', pts, { w: 1.6 * (1 - i * 0.12), snap: snapG, seed });
        for (const q of s.every(11)) addFL(q.clone().add(new THREE.Vector3(0, 2.5, 0)), 0.75, '地', RAMP[400], i);
        yield; tY = performance.now();
      }
    }
    yield; tY = performance.now();
    st.at = 'net-da';
    // 石垣 GÓC TRÁI (−x +z): nét dọc theo đường dốc 扇の勾配 ngay trong cạnh góc, bám MẶT NGOÀI CÙNG của các tảng (bắn tia vào chính
    // nền đá của màn đầu — cùng hình, cùng chỗ), rồi MỘT MẠCH LỚP ĐÁ (ranh giới hai lớp tảng) chạy ngang mặt trước, DỪNG ở chính góc
    // ấy — nét dọc và mạch ngang gặp nhau ở góc. Góc giữa (ngay trước máy) để trống: không còn trục sáng dọc giữa toà thành.
    const rc = new THREE.Raycaster(), inv = new THREE.Matrix4().makeRotationY(-rot);
    const hits = deps.stoneHit;
    // hộp / cầu bao của từng lưới đá tính trước, mỗi mẩu một lưới (tia đầu tiên không phải gánh cả phần ấy)
    for (const h of hits) {
      if (h.geometry && !h.geometry.boundingSphere) h.geometry.computeBoundingSphere();
      if (h.isInstancedMesh && !h.boundingSphere) h.computeBoundingSphere();
      yield; tY = performance.now();
    }
    const castL = (o, d) => {   // tia trong hệ toà thành → điểm chạm (hệ toà thành) hoặc null
      rc.set(toW(o.x, o.y, o.z), dirW(d.x, d.z)); rc.far = 120;
      const h = rc.intersectObjects(hits, false)[0];
      return h ? h.point.clone().applyMatrix4(inv) : null;
    };
    {
      const rows = [], o = new THREE.Vector3(), d = new THREE.Vector3(0, 0, -1);
      for (let y = 0.9; y <= 14.7; y += 0.3) {
        const e = extAt(y), x = -e[0] * 0.9;
        const h = castL(o.set(x, y, 60), d);
        if (h) rows.push({ y, x, n: h.z });
        if (due()) yield;
      }
      if (rows.length > 6) {
        const nn = outer(rows.map((r) => r.n), 6, 5);
        const pts = rows.map((r, i) => toW(r.x, r.y, nn[i] + 0.35));
        const s = addStroke('石垣', pts, { w: 1.0, lat: onFace(nF), seed: 13 });
        for (const q of s.every(3.5)) addFL(q.clone().addScaledVector(nF, 2.4), 0.6, '石垣', RAMP[400], 0);
      }
    }
    {
      // lớp tảng có mặt trên gần 7 m (giữa tường) trên mặt trước
      const front = S.stones.filter((st_) => st_.nrm[2] > 0.72), byC = new Map();
      for (const st_ of front) { const top = st_.front[1] + st_.s[1] * 0.5; if (!byC.has(st_.course)) byC.set(st_.course, []); byC.get(st_.course).push({ a: Math.atan2(st_.front[2], st_.front[0]), y: top }); }
      let best = null, bd = 1e9;
      for (const [cN, L] of byC) { if (L.length < 3) continue; const my = L.reduce((q, w) => q + w.y, 0) / L.length; if (Math.abs(my - 7) < bd) { bd = Math.abs(my - 7); best = cN; } }
      const tops = byC.get(best) || [];
      const aEnd = Math.atan2(extAt(7)[1], -extAt(7)[0]) - 0.035;       // góc trái
      const rows = [], o = new THREE.Vector3(), d = new THREE.Vector3();
      for (let a = 1.02; a <= aEnd; a += 0.03) {
        let sw = 0, sy = 0;
        for (const t of tops) { const w = Math.exp(-Math.pow((t.a - a) / 0.22, 2)); sw += w; sy += w * t.y; }
        if (sw < 1e-3) continue;
        const y = sy / sw;
        d.set(-Math.cos(a), 0, -Math.sin(a));
        let r = -1;
        for (const dy of [-0.55, 0.55]) { const h = castL(o.set(Math.cos(a) * 60, y + dy, Math.sin(a) * 60), d); if (h) r = Math.max(r, Math.hypot(h.x, h.z)); if (due()) yield; }
        if (r > 0) rows.push({ a, y, r });
      }
      if (rows.length > 6) {
        const rr = outer(rows.map((q) => q.r), 4, 4), yy = outer(rows.map((q) => q.y), 0, 6);
        const pts = rows.map((q, i) => toW(Math.cos(q.a) * (rr[i] + 0.3), yy[i], Math.sin(q.a) * (rr[i] + 0.3)));
        const s = addStroke('石垣', pts, { w: 0.72, lat: (pp, t) => new THREE.Vector3().crossVectors(t, new THREE.Vector3(pp.x, 0, pp.z).normalize()), seed: 19 });
        for (const q of s.every(4.5)) addFL(q.clone().add(new THREE.Vector3(q.x, 0, q.z).normalize().multiplyScalar(2)), 0.4, '石垣', RAMP[400], 1);
      }
    }
    yield; tY = performance.now();
    st.at = 'net-cot';
    // 骨 GÓC PHẢI (+x −z) — soát p10a A3 (bản cũ: ba chữ "⅃" y hệt nhau ở ba tầng, đọc thành đèn viền góc tầng):
    //  · MỘT nét CỘT THÔNG 通し柱 vẽ liền từ chân tầng 1 lên đỉnh tầng 3 — đứng ở góc phải từng tầng, chỗ tầng thụt vào thì nét đi
    //    xiên TRONG lòng mái (mái che khuất), nên mắt thấy một cây cột chạy suốt, đứt đúng chỗ mái;
    //  · xà 貫 chỉ ở hai tầng dưới, KHÁC nhau (dài / ngắn, cao độ khác), vẽ từ phía giữa mặt tường (đầu ấn) đâm vào cột (đuôi vuốt
    //    tắt ngay sau cột) — không lặp y hệt; tầng 3 chỉ có cột
    // (soát p11a A4) cột ôm góc từng tầng vẫn đọc thành BA ĐOẠN rời (mái che chỗ nối) → MỘT cột thông 通し柱 kẻ một nét thẳng tay giữa
    // mặt tường phải (giữa hai ô cửa, như ảnh duyệt ct-2 cột nằm giữa mặt tường), từ chân tầng 1 lên gần đỉnh tầng 3, vẽ ĐÈ LÊN mép
    // các mái (lớp 柱 không bị che — nét cọ vẽ trên tranh, không phải cây cột 3D lẩn trong lòng mái); hai xà từ phía góc xa đâm vào cột
    {
      const f0 = S.frames[0], f2 = S.frames[2], T0 = TIERS[0], T2 = TIERS[2];
      const pa = { x: T0.a + 0.3, y: f0.y0 + 0.45 }, pb = { x: T2.a + 0.3, y: f2.y0 + f2.h - 0.9 };
      const post = [];
      for (let k = 0; k <= 120; k++) {
        const u = k / 120, y = pa.y + (pb.y - pa.y) * u;
        // tay vẽ, không thước kẻ: lượn rất nhẹ theo nhịp tay
        post.push(toW(pa.x + (pb.x - pa.x) * u, y, 0.07 * Math.sin(y * 0.5 + 0.7) + 0.035 * Math.sin(y * 1.7 + 0.8)));
      }
      addStroke('柱', post, { w: 1.2, lat: onFace(nR), seed: 23 });
      // ÁNH 緑青 của nét 骨 hắt lên tường trát THEO KHOẢNG CÁCH (nhóm 骨, tầm với riêng ~9 m): mỗi tầng một đèn giả cách mặt tường 1,4 m
      // ngay cột, mỗi xà một đèn giữa xà — tường sát nét ửng 緑青, xa nét tối dần về ánh trăng
      S.frames.forEach((f, ti) => { const T = TIERS[ti]; addFL(toW(T.a + 1.4, f.y0 + f.h * 0.5, 0), FL_COT_I, '骨', RAMP[400], ti / 3 - 0.15); });
      // xà 貫: từ phía góc xa (đầu ấn) đâm vào cột (đuôi vuốt tắt ngay sau cột), dưới hàng cửa sổ, hai tầng khác nhau
      const BEAM = [[0, 0.33, 0.82, 0.72], [1, 0.3, 0.62, 0.6]];
      BEAM.forEach(([ti, hy, len, w], bi) => {
        const f = S.frames[ti], T = TIERS[ti], xf = T.a + 0.26, yb = f.y0 + f.h * hy, beam = [];
        const zA = -T.b * len, zB = 1.7;
        for (let k = 0; k <= 24; k++) { const u = k / 24; beam.push(toW(xf, yb + 0.12 * Math.sin(u * 3.1) * (ti ? -1 : 1), zA + (zB - zA) * u)); }
        addStroke('骨', beam, { w, lat: onFace(nR), seed: 11 + ti * 7 });
        addFL(toW(T.a + 1.4, yb, (zA + zB) / 2), FL_COT_I * 0.8, '骨', RAMP[400], 1 + bi - 0.3);
      });
    }
    // 皮: đèn cửa giấy hắt lên tường — (Mike 30/9) quầng ẤM nhỏ quanh từng ô cửa (tầm với ~5 m, không phủ cả mặt tường)
    TIERS.forEach((T, ti) => {
      const f = S.frames[ti], y = f.y0 + f.h * T.wy - 0.4;
      const n = T.winFace[0]; for (let i = 0; i < n; i++) addFL(toW((i + 0.5 - n / 2) * (T.a * 2 / (n + 0.6)), y, T.b + 0.9), FL_CUA_I, '皮', CUA_GLOW, ti);
      const nr = T.winFace[1]; for (let i = 0; i < nr; i++) addFL(toW(T.a + 0.9, y, (i + 0.5 - nr / 2) * (T.b * 2 / (nr + 0.6))), FL_CUA_I, '皮', CUA_GLOW, ti);
    });
    yield; tY = performance.now();
    st.at = 'net-day';
    // 地縄: bốn nét cọ trên đất ngay dưới bốn sợi dây — cạnh gần → phải → xa → trái (cọ nhấc lên ở mỗi góc)
    const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0]];
    for (let i = 0; i < EDGES.length; i++) {
      const [a, b] = EDGES[i], A = CORN[a].p, B = CORN[b].p, d = B.clone().sub(A).normalize(), pts = [];
      for (let t = 0; t <= 28; t++) { const q = A.clone().addScaledVector(d, -0.9).lerp(B.clone().addScaledVector(d, 0.9), t / 28); q.y = hill2(q.x, q.z) + 0.12; pts.push(q); }
      const s = addStroke('地縄', pts, { w: 0.8, snap: snapD, seed: 70 + i });
      // (30/9: thưa hơn 6,5 → 9 m, sáng hơn cho cùng tổng — nhường chỗ cho ánh nét 骨 trên toà thành)
      for (const q of s.every(9)) addFL(q.clone().add(new THREE.Vector3(0, 1.6, 0)), 0.56, '地縄', RAMP[400], i);
      if (due()) yield;
    }
    yield; tY = performance.now();
    // 道: nét cọ năm tháng của bản đồ 仕事 bay tới, đổ vào góc gần của bãi rồi đi tiếp thành cạnh 地縄 đầu tiên
    {
      const pts = roadCurve.getSpacedPoints(Math.round(roadCurve.getLength() / 1.5)).map((q) => { q.y = hill2(q.x, q.z) + 0.6; return q; });
      addStroke('道', pts, { w: 2.2, snap: (q) => { q.y = Math.max(q.y, hill2(q.x, q.z) + 0.6); return q; }, seed: 91 });
    }
    st.fl = flCount;
    FLU.uFLN.value = flCount;
    groupFL();
    yield; tY = performance.now();
    st.at = 'net-ghep';
    yield* flushStrokes(due);
    st.meshes = 0;
    scene.traverse((o) => { if (o.isMesh) st.meshes++; });
    st.built = true; st.buildMs = Math.round(performance.now() - t0); st.at = 'xong';
    stage(TL.T11, 0);
  }

  // ═══════════════════════════════════════ NHỊP CỦA CẢNH (hàm của s) ═══════════════════════════════════════════════════════
  // máy: đường cong Catmull-Rom (theo độ dài cung) qua k2 → k3 → k4 → nghỉ; w(s) liền đạo hàm qua mốc tới nơi, dừng êm ở cuối chương
  const SA = TL.T10 + TL.W0 * (TL.TP6 - TL.T10);
  const WA = 0.86;
  const herm = (u, m0, m1) => { const u2 = u * u, u3 = u2 * u; return (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) + (u3 - u2) * m1; };
  const MB = 1.5 * (1 - WA) / (TL.END6 - TL.T11);                 // độ dốc w theo s ở mốc tới nơi
  function camW(s) {
    if (s <= SA) return 0;
    if (s < TL.T11) { const L = TL.T11 - SA; return WA * herm((s - SA) / L, 1.25, MB * L / WA); }
    if (s < TL.END6) { const L = TL.END6 - TL.T11; return WA + (1 - WA) * herm((s - TL.T11) / L, MB * L / (1 - WA), 0); }
    return 1;
  }
  const PATHS = {};
  function pathsFor(P) {
    const key = P === POSE.port ? 'port' : 'land';
    if (PATHS[key]) return PATHS[key];
    const ks = [P.k2, P.k3, P.k4, P.rest];
    const pc = new THREE.CatmullRomCurve3(ks.map((k) => new THREE.Vector3().fromArray(k.p)), false, 'centripetal');
    const tc = new THREE.CatmullRomCurve3(ks.map((k) => new THREE.Vector3().fromArray(k.t)), false, 'centripetal');
    // mốc từng khung trên đường (theo độ dài cung) — fov / dời khung nội suy theo cùng mốc
    const L = pc.getLengths(400), tot = L[L.length - 1], seg = [0];
    for (let i = 1; i < ks.length; i++) { const u = i / (ks.length - 1); seg.push(L[Math.round(u * 400)] / tot); }
    return (PATHS[key] = { pc, tc, ks, seg });
  }
  const vT = new THREE.Vector3();
  // (soát p10a B2) điện thoại đang gõ: cả khung cảnh dời LÊN lift điểm ảnh (app.js tính) — như trang cuộn lên theo form: sau form là đúng
  // phần sườn tối như lúc nghỉ, bãi đất và các nét sáng lên trên (dưới chỗ tiêu đề đã nhường)
  let lift = 0;
  // (vòng kiểm cuối 30/9) KHỔ NGANG THẤP (máy xách tay 1366×768, máy tính bảng ngang 1024×768…): form "đường mặt đất" và tiêu đề cao
  // cố định theo điểm ảnh, cảnh co theo bề cao → dưới ~900 px nét 地縄 sáng của bãi đất lấn xuống nằm ĐÚNG trên nhãn form. Tính theo khổ
  // (ở tư thế nghỉ): dời khung lên vừa đủ để góc gần của bãi cách nhãn ≥ 14 px; nếu dời vậy mà đỉnh toà thành sát mép trên (< 64 px)
  // thì lùi máy (góc nhìn rộng hơn) thay phần còn thiếu. Cả chương cùng một mức (đường bay tới không trượt thêm lúc tới nơi).
  // Khổ dọc, và khổ ngang mà bãi đã nằm trên nhãn (1440×900, 1900×920…): không đổi gì.
  const FIT = { key: '', n: 0, k: 1, lift: 0, kNow: 1, liftNow: 0 }, fitCam = new THREE.PerspectiveCamera();
  function fitLow() {
    const key = W_ + 'x' + H_, snap = key !== FIT.key;
    FIT.key = key; FIT.k = 1; FIT.lift = 0;
    let top = Infinity;
    if (!portrait && CORN) for (const e of document.querySelectorAll('#lh-form .nhan')) { const r = e.getBoundingClientRect(); if (r.height > 0) top = Math.min(top, r.top); }
    if (isFinite(top)) {
      const R = POSE.land.rest, T = Math.tan(THREE.MathUtils.degToRad(R.fov) / 2);
      fitCam.fov = R.fov; fitCam.aspect = W_ / H_; fitCam.position.fromArray(R.p); fitCam.up.set(0, 1, 0);
      fitCam.lookAt(tmpV.fromArray(R.t)); fitCam.updateProjectionMatrix(); fitCam.updateMatrixWorld();
      let tp = -1e9; for (const c of CORN) { tmpV.copy(c.p).project(fitCam); tp = Math.max(tp, -tmpV.y * T); }
      tmpV.set(0, 44, 0).project(fitCam); const tr = tmpV.y * T;
      const s0 = H_ / (2 * T), c0 = H_ * (0.5 - R.off), padMax = top - 14, roofMin = 64;
      if (c0 + tp * s0 > padMax) {
        let sc = s0, c = padMax - tp * s0;
        if (c - tr * s0 < roofMin) { sc = Math.max(0.8 * s0, (padMax - roofMin) / (tp + tr)); c = padMax - tp * sc; }
        FIT.k = sc / s0; FIT.lift = c0 - c;
      }
    }
    if (snap) { FIT.kNow = FIT.k; FIT.liftNow = FIT.lift; }
  }
  function placeCam(s, dt) {
    const P = portrait ? POSE.port : POSE.land, PT = pathsFor(P);
    if (FIT.key !== W_ + 'x' + H_ || ++FIT.n % 120 === 0) fitLow();
    { const e = Math.min(1, (dt || 0) * 5); FIT.kNow += (FIT.k - FIT.kNow) * e; FIT.liftNow += (FIT.lift - FIT.liftNow) * e; }
    const w = camW(s);
    PT.pc.getPointAt(w, camera.position);
    // hướng nhìn theo cùng tham số (đích dời mượt theo độ dài cung của đường máy)
    PT.tc.getPoint(PT.pc.getUtoTmapping(w), vT);
    let i = 0; while (i < PT.seg.length - 2 && w > PT.seg[i + 1]) i++;
    const u = cl01((w - PT.seg[i]) / Math.max(1e-6, PT.seg[i + 1] - PT.seg[i])), ue = u * u * (3 - 2 * u);
    let fov = lerp(PT.ks[i].fov, PT.ks[i + 1].fov, ue);
    const off = lerp(PT.ks[i].off, PT.ks[i + 1].off, ue);
    if (FIT.kNow !== 1) fov = 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) / FIT.kNow));
    camera.up.set(0, 1, 0);
    camera.lookAt(vT);
    if (Math.abs(camera.fov - fov) > 1e-4) camera.fov = fov;
    camera.setViewOffset(W_, H_, 0, off * H_ + lift + FIT.liftNow, W_, H_);
    camera.updateProjectionMatrix();
    // (30/9, Mike: "tilt màn hình chỉ ở trang home thôi, còn ở các section thì bỏ tilt hết") — BỎ máy lượn theo chuột ở chương này;
    // máy chỉ đi theo đường của chương, nhịp thở lúc nghỉ vẫn do app.js cộng vào.
    camera.updateMatrixWorld();
  }
  // lớp nào sáng tới đâu (số nét đã vẽ, có phần lẻ) — theo s: 道 → 地縄 → 地 → 石垣 → 骨 → 皮 (sáng dần TỪ CHÂN LÊN)
  const ramp = (s, a, b) => cl01((s - a) / (b - a));
  const T11 = TL.T11, SPAN6 = TL.END6 - TL.T11, SPAN5 = TL.TP6 - TL.T10;
  const at6 = (k) => T11 + k * SPAN6;          // phần của chương đứng
  const at5 = (k) => TL.T10 + k * SPAN5;       // phần của chuyển cảnh (theo p6)
  const STAGE = { '道': 0, '地縄': 0, '地': 0, '石垣': 0, '骨': 0, pk: 0 };
  function stage(s) {
    // (nét 道 đã vẽ quá nửa khi vùng đất mới bắt đầu thấm ra — nó đi từ sau lưng máy vào khung, như nét 仕事 đang bay theo)
    { const x = ramp(s, at5(0.04), at5(0.84)); STAGE['道'] = 1 - (1 - x) * (1 - x); }
    // (soát p10a A5) đổ vào góc xong thì nét 道 tan hết TRƯỚC lúc tới nơi — 4 cạnh 地縄 nối tiếp nó. Cả HAI khổ (p10b: khổ ngang lúc nghỉ,
    // khúc cuối của nét leo dốc mép mỏm ngay trước góc bãi — dải nét nằm gần như nghiêng sát hướng nhìn của máy nghỉ, thành một đường chéo
    // mảnh 1 điểm ảnh lấm tấm cắt qua chân trang; khổ dọc: vệt trắng lạc ở góc dưới trái)
    LAYERS['道'].mat.uniforms.uA.value = 1 - sst(at5(0.9), at5(1.0), s);
    STAGE['地縄'] = 4 * ramp(s, at5(0.8), at6(0.45));
    STAGE['地'] = 2 * ramp(s, at5(0.88), at6(0.22));
    STAGE['石垣'] = 2 * ramp(s, at6(0.08), at6(0.4));
    STAGE['骨'] = 3 * ramp(s, at6(0.24), at6(0.62));
    STAGE.pk = ramp(s, at6(0.42), at6(0.8));
    for (let i = 0; i < LAYER_LIST.length; i++) {
      // 骨 = cột (lớp 柱, nét số 0 của 骨) rồi hai xà (lớp 骨, nét 1–2): STAGE['骨'] đếm cả ba (đèn giả đọc theo nó)
      const Lr = LAYER_LIST[i], v = Lr.name === '柱' ? Math.min(1, STAGE['骨']) : Lr.name === '骨' ? Math.max(0, STAGE['骨'] - 1) : STAGE[Lr.name];
      Lr.mat.uniforms.uP.value = v;
      if (Lr.mesh) Lr.mesh.visible = v > 0 && Lr.mat.uniforms.uA.value > 0;
    }
    // 皮: đèn cửa giấy sáng từ tầng dưới lên (mép đèn đi từ chân tầng 1 tới đỉnh tầng 3)
    if (M2) M2.paper.emissiveIntensity = NIGHT.mat.paperK;
    lit.value = STAGE.pk <= 0 ? -1e3 : lerp(IS.H - 1, IS.H + 30, STAGE.pk);
    // ánh hắt của từng lớp theo phần đã vẽ (không tạo đối tượng mới mỗi khung)
    for (let i = 0; i < flCount; i++) {
      const t = FL_TAG[i];
      let k = 1;
      if (t === '皮') { const y = FLU.uFL.value[i].y; k = sst(y - 1.2, y + 1.2, lit.value); }
      else if (t === '地' || t === '石垣' || t === '地縄' || t === '骨') k = cl01(STAGE[t] - FL_S[i]);
      FLU.uFL.value[i].w = FL_I[i] * k;
    }
  }

  let time = 0, lastS = TL.T11;
  // (soát p10a A8) vật liệu "dress" (đất, rừng, toà thành đêm) tính viền sáng theo hướng trăng TRONG HỆ MÁY QUAY (uSunV). castle.js
  // chỉ cập nhật theo máy của màn đầu → ở đây sai máy: một mảng sườn đồi sáng phẳng hình thang (thấy rõ khi mở thẳng &chuong=6 trên
  // điện thoại). Tự đặt theo máy của chương này, mỗi khung, sau khi đặt máy
  const sunV = new THREE.Vector3();
  let SUNM = null;
  function syncSun() {
    if (!SUNM) { SUNM = [groundMat, forestMat]; if (M2) for (const m of Object.values(M2)) if (m && m.userData && m.userData.u && m.userData.u.uSunV) SUNM.push(m); }
    sunV.copy(sunDir).transformDirection(camera.matrixWorldInverse).normalize();
    for (const m of SUNM) if (m.userData.u && m.userData.u.uSunV) m.userData.u.uSunV.value.copy(sunV);
  }
  function update(dt, s) {
    time += dt;
    lastS = s;
    placeCam(s, dt);
    if (st.built) syncSun();
    stage(s);
    if (ridges) ridges.update(time);
    if (sea) sea.update(time);
    if (unkai) unkai.update(time);
    dayMat.uniforms.uRes.value.set(W_, H_);
    { const pr = renderer.getPixelRatio() || 1, dpr = window.devicePixelRatio || 1, wCss = 1 / dpr, px = Math.max(wCss, 1.4 / pr); dayMat.uniforms.uPx.value = px; dayMat.uniforms.uAk.value = wCss / px; }
  }

  // ── nấc chất lượng (scene/nac.js): nấc 2–4 bớt cây xa (đã xếp gần trước), bớt cỏ, bỏ làn sương lấm tấm sát đất ─────────────
  let nacK = [1, 1, 1];
  function applyNac(treesK = 1, mistK = 1, grassK = 1) {
    nacK = [treesK, mistK, grassK];
    for (const im of forest) im.count = Math.max(1, Math.round(im.userData.nFull * treesK));
    if (grass) grass.count = Math.max(1, Math.round(grass.userData.nFull * grassK));
    if (mists[1]) mists[1].visible = mistK >= 1;
    // (soát p10a B5) nấc 2–4 bỏ thêm làn biển sương mỏng trên cùng (tô gần cả màn) — nấc 0–1 giữ nguyên
    if (sea && sea.group.children[2]) sea.group.children[2].visible = mistK >= 1;
  }

  // ── dải điểm của nét 道 trên màn (cho lớp hoà cảnh — không dùng lúc này, giữ để kiểm) ───────────────────────────────────────
  const scr = (v, out = [0, 0]) => { tmpV.copy(v).project(camera); out[0] = (tmpV.x * 0.5 + 0.5) * W_; out[1] = (-tmpV.y * 0.5 + 0.5) * H_; return out; };

  // (soát p10a B4) HÌNH GIẢ để DỊCH SẴN shader của chương ngay khi vào trang (như 仕事 ở p9b), trước khi dựng: mỗi (vật liệu × kiểu vẽ)
  // một lưới tí hon — cùng vật liệu, cùng bộ thuộc tính, cùng kiểu vẽ (thường / nhân bản / nhân bản có màu) như lưới thật, nên
  // chương trình dịch ra dùng lại được y nguyên. Toà thành: đúng các tổ hợp của cây đối tượng màn đầu (dùng chung hình, không tạo hình mới)
  function warmMeshes() {
    if (!M2) makeCastleMats();
    const out = [], seen = new Set();
    const swap = new Map();
    for (const k of Object.keys(deps.M)) if (M2[k]) swap.set(deps.M[k], M2[k]);
    const mat = (m) => (Array.isArray(m) ? m.map((x) => swap.get(x) || x) : swap.get(m) || m);
    const plain = (attrs) => { const g = new THREE.BufferGeometry(); for (const [k, n] of attrs) g.setAttribute(k, new THREE.Float32BufferAttribute(new Float32Array(3 * n), n)); g.setIndex([0, 1, 2]); g.userData.gia = true; return g; };
    const add = (o, key) => { if (seen.has(key)) return; seen.add(key); o.frustumCulled = false; o.visible = false; o.name = 'gia-lh-' + out.length; out.push(o); };
    for (const root of [deps.ishigaki.group, deps.tenshu.group]) {
      root.traverseVisible((o) => {
        if (!o.isMesh || !o.material) return;
        const m = mat(o.material), key = [].concat(m).map((x) => x.uuid).join(',') + (o.isInstancedMesh ? '|i' + (o.instanceColor ? 'c' : '') : '|m');
        if (seen.has(key)) return;
        let w;
        if (o.isInstancedMesh) { w = new THREE.InstancedMesh(o.geometry, m, 1); w.setMatrixAt(0, new THREE.Matrix4()); if (o.instanceColor) w.setColorAt(0, new THREE.Color(1, 1, 1)); }
        else w = new THREE.Mesh(o.geometry, m);
        add(w, key);
      });
    }
    add(new THREE.Mesh(plain([['position', 3], ['normal', 3], ['color', 3]]), groundMat), 'dat');
    { const w = new THREE.InstancedMesh(deps.forestGeos[0], forestMat, 1); w.setMatrixAt(0, new THREE.Matrix4()); w.setColorAt(0, new THREE.Color(1, 1, 1)); add(w, 'rung'); }
    { const w = new THREE.InstancedMesh(plain([['position', 3], ['normal', 3], ['uv', 2]]), grassMat, 1); w.setMatrixAt(0, new THREE.Matrix4()); w.setColorAt(0, new THREE.Color(1, 1, 1)); add(w, 'co'); }
    { const w = new THREE.InstancedMesh(plain([['position', 3], ['normal', 3], ['uv', 2]]), woodMat, 1); w.setMatrixAt(0, new THREE.Matrix4()); add(w, 'go'); }
    add(new THREE.Mesh(plain([['position', 3], ['aB', 3], ['aSide', 1], ['aEnd', 1]]), dayMat), 'day');
    add(new THREE.Mesh(plain([['position', 3], ['aT', 1], ['aS', 1], ['aV', 1], ['aI', 1], ['aW', 1], ['aL', 1], ['aSeed', 1]]), LAYERS['地'].mat), 'net');
    add(new THREE.Mesh(plain([['position', 3], ['normal', 3], ['uv', 2]]), mistMats[0]), 'suong');
    add(new THREE.Mesh(plain([['position', 3], ['normal', 3], ['uv', 2]]), skyMat), 'troi');
    return out;
  }

  return {
    scene, camera, st, build, update, applyNac, warmMeshes,
    get built() { return st.built; },
    get drawn() { return STAGE['道'] + STAGE['地縄'] + STAGE['地'] + STAGE['石垣'] + STAGE['骨'] + STAGE.pk; },
    setMouse() { /* 30/9: chương không còn nghiêng theo chuột — giữ hàm để app.js gọi không lỗi */ },
    setLift(px) { lift = px; },   // (áp ở lần đặt máy kế tiếp — update() mỗi khung)
    // mép dưới (điểm ảnh CSS, KHÔNG tính lift) của cả bãi đất: bốn góc cọc + mép ván, sát đất và ngang mặt ván — form không được đè lên
    padBottom() {
      if (!CORN) return 0;
      let m = 0;
      for (const k of CORN) for (const y of [PAD.h - 0.3, PAD.h + 1.5]) { tmpV.copy(k.p).addScaledVector(k.ox, 2.9).addScaledVector(k.oz, 2.9); tmpV.y = y; tmpV.project(camera); m = Math.max(m, (-tmpV.y * 0.5 + 0.5) * H_); }
      return m + lift;
    },
    resize(w, h) {
      W_ = w; H_ = h; portrait = h > w;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (st.built) placeCam(lastS, 0);
    },
    info() {
      const p = camera.position;
      return { cam: [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)], s: +lastS.toFixed(3), w: +camW(lastS).toFixed(3), stage: Object.fromEntries(Object.entries(STAGE).map(([k, v]) => [k, +v.toFixed(2)])),
        fl: st.fl, verts: st.verts, trees: st.trees, grass: st.grass, meshes: st.meshes, buildMs: st.buildMs, at: st.at, nac: nacK,
        strokes: Object.fromEntries(Object.entries(LAYERS).map(([k, L]) => [k, L.strokes.map((s) => +s.len.toFixed(1))])) };
    },
    // bài kiểm / chụp: toạ độ trên màn của bốn góc bãi, đỉnh / chân toà thành
    screenOf() { return { pad: CORN ? CORN.map((k) => scr(k.p).map(Math.round)) : null, top: scr(new THREE.Vector3(0, 44, 0)).map(Math.round), base: scr(new THREE.Vector3(0, 0.9, 0)).map(Math.round) }; },
    camAt(s) { const P = portrait ? POSE.port : POSE.land, PT = pathsFor(P); return PT.pc.getPointAt(camW(s)).toArray(); },
  };
}
