// 仕事 WORK — NĂM CÔNG TRÌNH CỦA STUDIO: BẢN ĐỒ CẢ VÙNG (Mike chọn phương án A, duyệt ảnh chi tiết 29/9: "ok").
// Chương thứ năm của chuyến đi đêm: rời làng giấy, tờ giấy thành bản vẽ quy hoạch, bản vẽ tan thành thung lũng nhìn từ trên
// cao (chuyển cảnh 5 — post/chuyen.js GiayEffect, app.js). Trong thung: năm mô hình nhà nhỏ, mỗi nhà một ánh đèn ngà ấm nhẹ
// qua cửa; nét cọ 緑青 TỰ VẼ nối năm nhà theo năm tháng (2019 → 2026 —), tắt ở đầu lối đi Open Field ("Where it ends, nothing
// stands"); tên nhà hiện theo đầu cọ. Rê / bấm một nhà (điện thoại: chạm, hoặc vuốt ngang trên thẻ) → THẺ HÌNH VẼ KỸ THUẬT:
// không khung, không tấm nền — nét hình vẽ là NÉT CỌ vẽ ở lượt riêng SAU lớp tối sau chữ (post hudPass — soát p9a A2), số đo là
// chữ HTML thật; để yên thì thẻ tự đổi MỘT vòng, mỗi thẻ 8 s (người xem đã tự chọn thì thôi). Lớp tối rất mềm sau thẻ nằm TRONG
// ảnh cảnh (post/chuyen.js KhungEffect, uCard).
// Bản thử đã duyệt: prototypes/kozo-dem/viec-a.html (+ ảnh chi tiết scratchpad/kozo-look/chuong-viec/_chi-tiet.png).
//
// Máy quay (τ đã qua sine.inOut — app.js tính): τ 0 NHÌN THẲNG XUỐNG (đúng tư thế của bản vẽ quy hoạch lúc giấy tan) → τ 0,5
// nghiêng về góc bản đồ của ảnh chi tiết, rồi đứng. Nét cọ vẽ τ 0,2 → 0,9 (mỗi chặng giữa hai nhà một nét: cọ chấm mực lại ở
// mỗi nhà). Ánh nét hắt lên đất: một ảnh nhìn từ trên xuống nướng MỘT lần (kênh đỏ = độ sáng, kênh lục = vị trí dọc đường cọ)
// — mặt đất tự sáng tới đúng chỗ đầu cọ đã đi qua, không dải hình học nào, không đèn thật.
// Màu: bảng màu đêm (sắc ~160°), màu bão hoà duy nhất là 緑青; đèn cửa ấm nhẹ → lớp nắn màu đặt về ngà (uKeepPaper, như 皮).
import * as THREE from 'three';
import { RAMP } from '../page/accent.js';
import { decode, prepare } from '../page/decode.js';

const lerp = (a, b, k) => a + (b - a) * k;
const cl01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sstep = (a, b, x) => { const t = cl01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const col = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k);

// ── chữ: ô s6 (docs/content/kozo-copy.md) ─────────────────────────────────────────────────────────
export const WORKS = [
  { id: 'w1', name: 'Mulberry House', year: '2019', type: 'Village museum', line: 'Damp ruins paper. The collection is sealed away; only the gallery sees the sky.' },
  { id: 'w2', name: 'Pine Room', year: '2021', type: 'Restoration', line: 'The crawl door is 66 × 63 cm. We kept it, so everyone still kneels.' },
  { id: 'w3', name: 'Dry Store', year: '2023', type: 'Shrine archive', line: 'The ground is wet all year, so the floor sits 1 200 mm above it.' },
  { id: 'w4', name: 'Snow Hall', year: '2024', type: 'Village theatre', line: 'Three metres of snow a winter. The roof is pitched 60° to shed it.' },
  { id: 'w5', name: 'Open Field', year: '2026 —', type: 'Memorial', line: 'One path across the site. Where it ends, nothing stands.' },
];
export const S6 = { head: 'Finished, and in progress', body: 'Small buildings, mostly outside the cities. Each one had a constraint we could not design around, so we started there.' };

// ── nhiễu (JS) ────────────────────────────────────────────────────────────────────────────────────
function hash2(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vn2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm2(x, y, o = 5) { let s = 0, a = 0.5, n = 0; for (let i = 0; i < o; i++) { s += a * vn2(x, y); n += a; x = x * 2.03 + 17.1; y = y * 2.03 + 5.3; a *= 0.5; } return s / n; }

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// HÌNH VẼ KỸ THUẬT — toạ độ mét, y lên (khớp khối nhà). L: nét chính · T: nét mảnh · D: nét đứt · dims: đường đo (mút gạch 45°)
// arcs: cung góc · txt: nhãn · box: khung hình. Thứ tự vẽ = thứ tự nét.
const S4 = 2.73, TW = 0.12;
export const DRAW = {
  w1: { box: [-2.2, -2.6, 19.2, 9.2],
    L: [[[-1.8, 0], [18.8, 0]], [[0, 0], [0, 5.5]], [[9, 0], [9, 5.5]], [[-0.7, 5.14], [4.5, 7.8], [9.7, 5.14]],
      [[17, 0], [17, 4.3]], [[9, 4.3], [12, 4.3]], [[14.2, 4.3], [17.6, 4.3]], [[12, 4.3], [12, 5.0], [14.2, 5.0], [14.2, 4.3]]],
    T: [[[0.45, 0], [0.45, 5.05], [8.55, 5.05], [8.55, 0]]],
    D: [[[13.6, 7.2], [11.4, 0.9]], [[14.4, 7.2], [12.2, 0.9]], [[15.2, 7.2], [13.0, 0.9]]],
    dims: [{ a: [12, 5.0], b: [14.2, 5.0], off: 1.3, t: '2 200' }, { a: [0, 0], b: [9, 0], off: -1.2, t: '9 000' }],
    txt: [{ p: [4.5, 2.6], t: 'SEALED' }, { p: [15, 1.9], t: 'SKY' }] },
  w2: { box: [-1.15, -1.3, 3.8, 3.55],
    L: [[[-TW, -TW], [0.9, -TW]], [[1.56, -TW], [S4 + TW, -TW], [S4 + TW, S4 + TW], [-TW, S4 + TW], [-TW, -TW]],
      [[0, 0], [0.9, 0]], [[1.56, 0], [S4, 0], [S4, S4], [0, S4], [0, 0]], [[0.9, -TW], [0.9, 0]], [[1.56, -TW], [1.56, 0]]],
    T: [[[0, 0.91], [1.82, 0.91]], [[1.82, 0], [1.82, 1.82]], [[0.91, 1.82], [S4, 1.82]], [[0.91, 0.91], [0.91, S4]],
      [[1.155, 1.155], [1.575, 1.155], [1.575, 1.575], [1.155, 1.575], [1.155, 1.155]]],
    D: [[[0.9, -0.02], [1.23, -0.55], [1.56, -0.02]]],
    dims: [{ a: [0.9, -TW], b: [1.56, -TW], off: -0.62, t: '660 × 630' }, { a: [0, S4 + TW], b: [S4, S4 + TW], off: 0.42, t: '2 730' },
      { a: [-TW, 0], b: [-TW, S4], off: 0.45, t: '2 730' }] },
  w3: { box: [-2.7, -1.2, 9.4, 6.9],
    L: [[[-1.6, 0], [8.6, 0]], [[0.3, 0], [0.3, 1.2]], [[3.5, 0], [3.5, 1.2]], [[6.7, 0], [6.7, 1.2]],
      [[0, 1.2], [7, 1.2]], [[0, 1.45], [7, 1.45]], [[0.2, 1.45], [0.2, 4.3]], [[6.8, 1.45], [6.8, 4.3]], [[-0.6, 4.02], [3.5, 6.2], [7.6, 4.02]]],
    T: [[[-1.2, -0.25], [-0.5, -0.25]], [[0.9, -0.25], [2.2, -0.25]], [[4.0, -0.25], [5.6, -0.25]], [[7.1, -0.25], [8.2, -0.25]],
      [[-0.4, -0.5], [0.8, -0.5]], [[2.4, -0.5], [3.8, -0.5]], [[5.6, -0.5], [6.9, -0.5]]],
    D: [[[0.8, 0.6], [6.2, 0.6]]],
    dims: [{ a: [0, 0], b: [0, 1.2], off: 1.3, t: '1 200' }],
    txt: [{ p: [8.1, 1.33], t: 'FL', a: 'start' }, { p: [8.1, 0.3], t: 'GL', a: 'start' }] },
  w4: { box: [-4.6, -2.3, 18.6, 17.0],
    L: [[[-3.6, 0], [17.6, 0]], [[0, 0], [0, 3.5]], [[14, 0], [14, 3.5]], [[-0.8, 2.11], [7, 15.62], [14.8, 2.11]], [[2.2, 0.9], [11.8, 0.9]]],
    T: [[[0, 3.5], [3.2, 3.5]]],
    D: [[[-3.4, 3.0], [-0.9, 3.0]], [[14.9, 3.0], [17.4, 3.0]]],
    dims: [{ a: [-1.6, 0], b: [-1.6, 3.0], off: 1.2, t: '3 000' }, { a: [0, 0], b: [14, 0], off: -1.3, t: '14 000' }],
    arcs: [{ c: [0, 3.5], r: 2.6, a0: 0, a1: 60, t: '60°' }],
    txt: [{ p: [7, 2.3], t: 'STAGE' }] },
  w5: { box: [-2, -3.6, 42, 25],
    L: [[[2, 10.4], [28, 10.4]], [[2, 11.6], [28, 11.6]]],
    T: [[[29, 8], [35, 8], [35, 14], [29, 14], [29, 8]], [[29, 8], [35, 14]], [[29, 14], [35, 8]]],
    D: [[[0, 0], [40, 0], [40, 22], [0, 22], [0, 0]]],
    dims: [{ a: [2, 11.6], b: [28, 11.6], off: 2.4, t: '26 000' }] },
};
// trải thành nét (điểm, bậc 1 chính / 0,5 mảnh) + chữ (điểm, góc, neo, hiện sau nét thứ mấy)
export function flatten(d) {
  const [bx0, by0, bx1, by1] = d.box, k = Math.max(bx1 - bx0, by1 - by0) / 60;
  const polys = [], texts = [];
  const over = (p, q, e) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L; return [[p[0] - ux * e, p[1] - uy * e], [q[0] + ux * e, q[1] + uy * e]]; };
  for (const pl of d.L || []) polys.push({ pts: pl.length === 2 ? over(pl[0], pl[1], k * 0.55) : pl, w: 1 });
  for (const pl of d.T || []) polys.push({ pts: pl, w: 0.5 });
  for (const pl of d.D || []) {
    for (let i = 0; i < pl.length - 1; i++) {
      const [a, b] = [pl[i], pl[i + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      for (let s = 0; s < L; s += k * 2.1) { const e = Math.min(L, s + k * 1.2); polys.push({ pts: [[a[0] + ux * s, a[1] + uy * s], [a[0] + ux * e, a[1] + uy * e]], w: 0.5 }); }
    }
  }
  for (const m of d.dims || []) {
    const { a, b, off, t } = m, L = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], n = [-u[1], u[0]], sg = Math.sign(off) || 1;
    const A = [a[0] + n[0] * off, a[1] + n[1] * off], B = [b[0] + n[0] * off, b[1] + n[1] * off];
    for (const [p, P] of [[a, A], [b, B]]) polys.push({ pts: [[p[0] + n[0] * sg * k * 0.5, p[1] + n[1] * sg * k * 0.5], [P[0] + n[0] * sg * k * 0.8, P[1] + n[1] * sg * k * 0.8]], w: 0.5 });
    polys.push({ pts: [[A[0] - u[0] * k * 0.9, A[1] - u[1] * k * 0.9], [B[0] + u[0] * k * 0.9, B[1] + u[1] * k * 0.9]], w: 0.5 });
    for (const P of [A, B]) polys.push({ pts: [[P[0] - (u[0] + n[0]) * k * 0.6, P[1] - (u[1] + n[1]) * k * 0.6], [P[0] + (u[0] + n[0]) * k * 0.6, P[1] + (u[1] + n[1]) * k * 0.6]], w: 1 });
    let ang = Math.atan2(u[1], u[0]); if (ang > Math.PI / 2 + 0.01) ang -= Math.PI; if (ang < -Math.PI / 2 + 0.01) ang += Math.PI;
    const tn = Math.abs(ang) > 1 ? [-Math.sin(ang), Math.cos(ang)] : n;
    const sgT = (tn[0] * n[0] + tn[1] * n[1]) >= 0 ? sg : -sg, tk = 2.9;
    texts.push({ p: [(A[0] + B[0]) / 2 + tn[0] * sgT * k * tk, (A[1] + B[1]) / 2 + tn[1] * sgT * k * tk], t, ang, a: 'middle', after: polys.length,
      base: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], dir: [tn[0] * sgT, tn[1] * sgT], off: k * tk });
  }
  for (const c of d.arcs || []) {
    const pts = []; for (let i = 0; i <= 24; i++) { const g = (c.a0 + (c.a1 - c.a0) * i / 24) * Math.PI / 180; pts.push([c.c[0] + Math.cos(g) * c.r, c.c[1] + Math.sin(g) * c.r]); }
    polys.push({ pts, w: 0.5 });
    const gm = (c.a0 + c.a1) / 2 * Math.PI / 180; texts.push({ p: [c.c[0] + Math.cos(gm) * (c.r + k * 3.4), c.c[1] + Math.sin(gm) * (c.r + k * 3.4)], t: c.t, ang: 0, a: 'middle', after: polys.length });
  }
  for (const x of d.txt || []) texts.push({ p: x.p, t: x.t, ang: 0, a: x.a || 'middle', after: polys.length });
  return { polys, texts, k };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════
const NZ = /* glsl */`
float vH(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vN(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(vH(i), vH(i + vec2(1.0, 0.0)), u.x), mix(vH(i + vec2(0.0, 1.0)), vH(i + vec2(1.0, 1.0)), u.x), u.y); }
`;
// NÉT CỌ 緑青 (giải phẫu như ngọn cọ màn đầu, castle.js INK_FN): 起筆 đầu ấn vát chéo, hơi phình · 送筆 thân dày mỏng theo lực ·
// 払い đuôi vuốt nhọn · 掠れ sợi lông cọ tách, khô dần theo quãng và ở quãng cọ lướt nhanh · 滲み loang mảnh ngoài mép khi còn
// ướt · 濃淡 đầu đậm, cạn dần thì nhạt. Đang vẽ: đầu cọ ướt bóng sáng hơn. uP = số nét đã vẽ (có phần lẻ).
function brushMat({ body = RAMP[400], core = RAMP[200], k = 1.4, fog = true, depthTest = true, dry = 1, name = 'viec-co', ko = false } = {}) {
  const m = new THREE.ShaderMaterial({
    name, transparent: true, depthWrite: false, depthTest, fog, defines: ko ? { KO: 1 } : {},
    polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uBody: { value: col(body) }, uCore: { value: col(core) }, uK: { value: k }, uP: { value: 0 }, uDry: { value: dry }, uA: { value: 1 },
      // (soát p10a A1) nét ra khỏi bản đồ: uTip 1 = đầu cọ đang đi là NGÒI TRÒN thon dần (không cắt vuông), uGlow ≈ 0 = không lõi
      // trắng ở đầu cọ ướt. Nét năm tháng / nét thẻ giữ 0 / 1 — cùng chương trình, không đổi một điểm ảnh
      uTip: { value: 0 }, uGlow: { value: 1 }, uCoreK: { value: 0.85 }, uDepl: { value: 0 },
      uKo: { value: Array.from({ length: 6 }, () => new THREE.Vector4(-1e4, -1e4, 0, 0)) }, uVP: { value: new THREE.Vector2(1, 1) },
    }]),
    vertexShader: `attribute float aT, aS, aV, aI, aW, aL, aSeed; varying float vT, vS, vV, vI, vW, vL, vSeed;
#include <fog_pars_vertex>
void main(){ vT = aT; vS = aS; vV = aV; vI = aI; vW = aW; vL = aL; vSeed = aSeed; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform vec3 uBody, uCore; uniform float uK, uP, uDry, uA, uTip, uGlow, uCoreK, uDepl; varying float vT, vS, vV, vI, vW, vL, vSeed;
#ifdef KO
uniform vec4 uKo[6]; uniform vec2 uVP;
#endif
#include <fog_pars_fragment>
${NZ}
void main(){
  float shown = clamp(uP - vI, 0.0, 1.0);
  if (shown <= 0.0 || vT > shown) discard;
  bool drawing = shown < 0.999;
  float sA = vS / vW;
  float lead = (shown - vT) * vL / vW;
  float tailT = drawing ? 1.0 : 1.0 - smoothstep(0.84, 1.0, vT);
  float press = (1.0 + 0.22 * (1.0 - smoothstep(0.0, 2.5, sA))) * (0.6 + 0.58 * vN(vec2(sA * 0.12, vSeed * 13.0)) + 0.16 * vN(vec2(sA * 0.45, vSeed * 5.0)));
  // (soát p9a A10) đầu nét tròn như ngòi cọ vừa ấn xuống — không cắt vuông
  float head = sqrt(clamp(sA / 0.9, 0.0, 1.0));
  float hw = press * head * mix(0.08, 1.0, pow(tailT, 0.75));
  hw *= mix(1.0, sqrt(clamp(lead / 1.3, 0.0, 1.0)), uTip);
  float x = abs(vV);
  float startCut = smoothstep(0.0, 0.18, sA - 0.4 * (vV * 0.5 + 0.5));
  float edgeN = vN(vec2(sA * 1.7, vSeed * 7.0 + vV * 0.5));
  float body = 1.0 - smoothstep(hw * (0.84 + 0.12 * edgeN), hw * 1.02, x);
  float fib = vN(vec2(vV * 9.0 + vSeed * 3.1, sA * 0.42)) * 0.62 + vN(vec2(vV * 21.0 + vSeed, sA * 1.4)) * 0.38;
  float depl = smoothstep(0.05, 1.0, vT);
  // nét rất dài (nét ra khỏi bản đồ, uDepl = quãng cạn mực, m): cọ cạn dần trong quãng đầu rồi lúc đậm lúc khô theo lực — không
  // thành một ống đều màu suốt 400 m
  if (uDepl > 0.0) depl = 0.1 + 0.32 * smoothstep(0.0, uDepl, vS) + 0.3 * (vN(vec2(vS / (uDepl * 0.9), vSeed * 3.0)) - 0.5);
  float skip = smoothstep(0.58, 0.82, vN(vec2(sA * 0.035 + vSeed * 9.0, 2.0)));
  float D = clamp((0.1 + 0.5 * depl * depl + 0.4 * (1.0 - tailT) + 0.34 * skip) * uDry, 0.0, 0.86);
  float Dl = D * (1.0 + 0.55 * x * x);
  float bristle = smoothstep(Dl - 0.09, Dl + 0.09, fib);
  float bleed = (1.0 - smoothstep(hw, hw * 1.28, x)) * smoothstep(hw * 0.9, hw, x) * (1.0 - D) * (0.35 + 0.4 * edgeN);
  float cov = max(body * bristle, bleed * 0.55) * startCut * uA;
#ifdef KO
  // nét ngắt quanh chữ số đo (như bản vẽ kỹ thuật): ô chữ (tâm, nửa cỡ — px CSS) thì nét chừa một khe
  { vec2 fp = vec2(gl_FragCoord.x, uVP.y - gl_FragCoord.y) / uVP.x;
    for (int i = 0; i < 6; i++) { vec2 d = abs(fp - uKo[i].xy) - uKo[i].zw; cov *= smoothstep(-1.0, 1.5, max(d.x, d.y)); } }
#endif
  if (cov < 0.02) discard;
  float dens = (0.86 + 0.14 * (1.0 - smoothstep(0.0, 3.0, sA))) * (1.0 - 0.42 * depl) * (0.82 + 0.18 * vN(vec2(sA * 2.3, vV * 6.0 + vSeed)));
  float core = pow(max(0.0, 1.0 - abs(vV - 0.3 * (vN(vec2(sA * 0.07, vSeed)) - 0.5)) / max(hw, 0.01)), 1.8);
  vec3 c = mix(uBody, uCore, core * uCoreK) * dens;
  if (drawing) c += uCore * exp(-lead * 0.22) * 1.3 * uGlow;
  gl_FragColor = vec4(c * uK, cov);
#include <fog_fragment>
}`,
  });
  return m;
}
// strokes: [{ pts: [Vector3], w, i, seed }]; nrm: pháp tuyến mặt nét nằm trên
function ribbonGeo(strokes, nrm) {
  const P = [], A = { aT: [], aS: [], aV: [], aI: [], aW: [], aL: [], aSeed: [] }, idx = [];
  const tg = new THREE.Vector3(), sd = new THREE.Vector3();
  strokes.forEach((s, si) => {
    const pts = s.pts, n = pts.length, cum = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const L = cum[n - 1] || 1, base = P.length / 3;
    for (let i = 0; i < n; i++) {
      tg.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      sd.crossVectors(tg, nrm).normalize().multiplyScalar(s.w * 0.5 * 1.3);
      for (const g of [-1, 1]) {
        P.push(pts[i].x + sd.x * g, pts[i].y + sd.y * g, pts[i].z + sd.z * g);
        A.aT.push(cum[i] / L); A.aS.push(cum[i]); A.aV.push(g * 1.3); A.aI.push(s.i ?? si); A.aW.push(s.w); A.aL.push(L); A.aSeed.push(s.seed ?? si * 0.137);
      }
      if (i < n - 1) { const q = base + i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  for (const [nm, arr] of Object.entries(A)) g.setAttribute(nm, new THREE.Float32BufferAttribute(arr, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
function densify(pts2, step) {
  const out = [];
  for (let i = 0; i < pts2.length - 1; i++) {
    const [a, b] = [pts2[i], pts2[i + 1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / step));
    for (let j = 0; j < n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
  }
  out.push(pts2[pts2.length - 1]);
  return out;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THUNG LŨNG: đáy ruộng (thửa lệch tông, bờ ruộng bắt trăng), sườn rừng tuyết tùng mọc cụm, dãy núi xa, sương đọng trong thung
const SITES = {   // x, z (m); ry xoay; sc: cỡ mô hình trên bản đồ (phóng để đọc ra dáng nhà)
  w1: { x: -64, z: -18, ry: 0.28, sc: 1.15 },
  w2: { x: -24, z: -62, ry: -0.3, sc: 4.0 },
  w3: { x: 34, z: -50, ry: 0.22, sc: 1.75 },
  w4: { x: 70, z: 6, ry: -0.5, sc: 0.9 },
  w5: { x: 4, z: 46, ry: 0, sc: 1.4 },
};
{ const dx = SITES.w4.x - SITES.w5.x, dz = SITES.w4.z - SITES.w5.z, L = Math.hypot(dx, dz); SITES.w5.ry = Math.atan2(dz / L, -dx / L); }
function H0(x, z) {
  const r = Math.hypot(x / 108, (z + 8) / 94);
  let h = 1.4 * (fbm2(x * 0.03, z * 0.03) - 0.5);
  const open = sstep(40, 150, z) * (1 - sstep(70, 190, Math.abs(x)));      // phía máy quay thung mở ra: đồi chỉ còn hai cánh
  const rim = sstep(0.8, 1.5, r) * (1 - 0.92 * open);
  const rg = 1 - Math.abs(2 * fbm2(x * 0.012 + 5.2, z * 0.012 - 3.1, 4) - 1);
  h += rim * (26 + 62 * fbm2(x * 0.006 + 3.3, z * 0.006 - 1.7) + 40 * rg * rg);
  h += sstep(-150, -430, z) * (70 + 140 * fbm2(x * 0.004 + 9, z * 0.004 + 2));
  return h;
}
const PADS = Object.entries(SITES).map(([id, s]) => ({ id, ...s, h: H0(s.x, s.z) + (id === 'w4' ? 1.5 : 0) }));
for (const p of PADS) { const k = Math.min(2.4, p.sc ** 0.5); p.r0 = 14 * k; p.r1 = 34 * k; p.q0 = 8 * k; p.q1 = 18 * k; p.t = 30 * k; p.t2 = 28 * k; }
// (vòng lặp chỉ số, không for…of: hàm này chạy vài trăm nghìn lần lúc dựng — mỗi for…of tạo một đối tượng lặp, sinh rác, dọn rác giữa chừng làm khựng khung)
function H(x, z) {
  let h = H0(x, z);
  for (let i = 0; i < PADS.length; i++) { const p = PADS[i], dx = x - p.x, dz = z - p.z; if (dx * dx + dz * dz < 3600) h += (p.h - h) * (1 - sstep(p.r0, p.r1, Math.sqrt(dx * dx + dz * dz))); }
  return h;
}
function nearPad(x, z, key) { for (let i = 0; i < PADS.length; i++) { const p = PADS[i], dx = x - p.x, dz = z - p.z; if (dx * dx + dz * dz < p[key] * p[key]) return true; } return false; }
const slopeAt = (x, z) => Math.hypot(H(x + 2, z) - H(x - 2, z), H(x, z + 2) - H(x, z - 2)) / 4;
const PATHW = 3.3;
// vùng ảnh nhìn từ trên xuống của ánh hắt (m): x, z, rộng, sâu
const SPILL_BOX = new THREE.Vector4(-170, -150, 340, 300);

export function createViec(renderer) {
  const PORT0 = innerHeight > innerWidth;          // khổ dọc lúc dựng: mô hình nhà to thêm (bản đồ nhỏ hơn trên màn dọc)
  const scene = new THREE.Scene();
  scene.name = 'viec';
  scene.fog = new THREE.FogExp2(0x344440, 0.0019);
  scene.background = new THREE.Color(0x344440);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 4000);
  scene.add(camera);
  const st = { at: '', built: false, verts: 0, trees: 0, buildMs: 0, meshes: 0 };
  let seed = 20260929;
  const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const rr = (a, b) => a + (b - a) * R();

  // ── VẬT LIỆU (tạo ngay, để app.js dịch + vẽ đầu ngầm bằng hình giả) ────────────────────────────────
  const std = (hex, o = {}) => new THREE.MeshStandardMaterial({ name: o.name || 'viec-std', color: hex, roughness: o.rough ?? 0.9, metalness: 0, flatShading: !!o.flat });
  const spillU = { uSpill: { value: null }, uSpillBox: { value: SPILL_BOX }, uSpillC: { value: col(RAMP[500], 0.3) }, uSpillP: { value: 0 }, uSnow: { value: new THREE.Vector3(SITES.w4.x, SITES.w4.z, PORT0 ? 8 : 0) } };
  const ground = new THREE.MeshStandardMaterial({ name: 'viec-dat', vertexColors: true, roughness: 0.95 });
  ground.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, spillU);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aK; varying vec4 vK; varying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvK = aK; vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vK; varying vec3 vWP;\nuniform sampler2D uSpill; uniform vec4 uSpillBox; uniform vec3 uSpillC; uniform float uSpillP; uniform vec3 uSnow;\n' + NZ)
      .replace('#include <color_fragment>', `#include <color_fragment>
float gWet = 0.0;
{
  // ruộng: thửa méo theo địa hình, hàng so le; bờ ruộng sáng mảnh bắt trăng; vài thửa nước sẫm, bóng
  vec2 q = vec2(0.94 * vWP.x + 0.34 * vWP.z, -0.34 * vWP.x + 0.94 * vWP.z);
  q += (vec2(vN(vWP.xz * 0.035), vN(vWP.xz * 0.035 + 7.0)) - 0.5) * 9.0;
  vec2 cs = vec2(10.0, 6.5);
  float row = floor(q.y / cs.y); q.x += vH(vec2(row, 3.0)) * cs.x;
  vec2 ci = floor(q / cs), cf = fract(q / cs);
  float id = vH(ci);
  float dB = min(min(cf.x, 1.0 - cf.x) * cs.x, min(cf.y, 1.0 - cf.y) * cs.y);
  float bund = 1.0 - smoothstep(0.12, 0.38, dB);
  float water = step(id, 0.3);
  vec3 vd = normalize(vWP - cameraPosition); float fres = pow(1.0 - abs(vd.y), 3.0);
  vec3 wC = diffuseColor.rgb * (0.7 + 0.25 * fres) * (0.92 + 0.12 * vN(vWP.xz * 0.12 + id * 7.0));
  vec3 dC = diffuseColor.rgb * (0.94 + 0.08 * sin(q.x * 2.6 + id * 6.0)) * (0.93 + 0.1 * id);
  vec3 fC = mix(dC, wC, water);
  fC = mix(fC, diffuseColor.rgb * 1.32, bund * 0.75);
  diffuseColor.rgb = mix(diffuseColor.rgb, fC, vK.x);
  gWet = water * (1.0 - bund) * vK.x;
  diffuseColor.rgb *= 0.86 + 0.28 * vN(vWP.xz * 0.2) * (1.0 - vK.x);
  // tuyết quanh Snow Hall (loang) — tính theo TỪNG ĐIỂM ẢNH (soát p9a A5: tính theo đỉnh lưới 6 m thì mép quầng thành bậc thang)
  { float dS = length(vWP.xz - uSnow.xy) + 18.0 * (0.62 * vN(vWP.xz * 0.06) + 0.38 * vN(vWP.xz * 0.14 + 3.7) - 0.5) + uSnow.z;
    float sn = (1.0 - smoothstep(10.0, 24.0, dS)) * 0.9;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3, 0.34, 0.33) * (0.88 + 0.22 * vN(vWP.xz * 0.25)), sn); }
  // đất ướt quanh Dry Store: sẫm, vũng nước nhỏ SẪM hơn đất (nước đêm soi trời tối — bản cũ sáng hơn nên thành đốm trắng tròn)
  float pud = vK.z * smoothstep(0.6, 0.7, vN(vWP.xz * 0.28 + 3.0));
  diffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - 0.4 * vK.z), vec3(0.055, 0.068, 0.066), pud * 0.8);
  gWet = max(gWet, pud);
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.93, gWet);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ vec2 su = (vWP.xz - uSpillBox.xy) / uSpillBox.zw;
  if (su.x > 0.0 && su.x < 1.0 && su.y > 0.0 && su.y < 1.0) {
    vec4 sp = texture2D(uSpill, su); float t = sp.g / max(sp.r, 0.004);
    totalEmissiveRadiance += uSpillC * sp.r * (1.0 - smoothstep(uSpillP - 0.004, uSpillP + 0.004, t)) * (1.0 + 1.3 * exp(-abs(t - uSpillP) * 90.0) * step(uSpillP, 0.999));
  } }`);
  };
  ground.customProgramCacheKey = () => 'viec-dat-2';
  const treeMat = std(0x16201d, { flat: true, rough: 0.95, name: 'viec-cay' });
  const M = {
    plaster: std(0xa2ada9), plasterDk: std(0x56615e), wood: std(0x2f3734, { rough: 0.8 }), woodLt: std(0x4b5551, { rough: 0.85 }), woodMd: std(0x57625e, { rough: 0.85 }),
    roof: std(0x252d2b, { rough: 0.6 }), bark: std(0x3a433f, { rough: 1 }), thatch: std(0x444e4a, { rough: 1 }),
    stone: std(0x6f7874), snow: std(0xa9b4b0), leaf: std(0x1a2521, { flat: true, name: 'viec-cay' }), shrub: std(0x222d2a, { flat: true, name: 'viec-cay' }),
    grass: std(0x2c3833, { flat: true, name: 'viec-cay' }),
  };
  // sỏi Open Field: vân sỏi vẽ bằng canvas (không phẳng) + mép cỏ
  const gravelTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#8c9692'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { const v = Math.round(rr(95, 185)); x.fillStyle = `rgb(${v},${v + 6},${v + 3})`; x.beginPath(); x.ellipse(rr(0, 256), rr(0, 256), rr(0.8, 2.6), rr(0.6, 2.0), rr(0, 3.1), 0, 6.3); x.fill(); }
    for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(30,38,35,${rr(0.2, 0.5)})`; x.fillRect(rr(0, 256), rr(0, 256), rr(0.6, 1.6), rr(0.6, 1.6)); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = 4; return t;
  })();
  M.gravel = new THREE.MeshStandardMaterial({ name: 'viec-soi', map: gravelTex, color: 0xb9c2be, roughness: 0.95 });
  const WIN = new THREE.MeshBasicMaterial({ name: 'viec-den', color: col(0xf2e7d4, 1.3) });   // ngà ấm nhẹ (grade giữ ngà — keepPaper)
  const WIN2 = new THREE.MeshBasicMaterial({ name: 'viec-den', color: col(0xf2e7d4, 0.62) });
  const GLASS = new THREE.MeshBasicMaterial({ name: 'viec-den', color: col(0xf2e7d4, 0.38) });
  const pathMat = brushMat({ k: 1.6, name: 'viec-duong-co' });
  // (phần 9, 30/9) chuyển cảnh 6: nét năm tháng dừng ở "2026 —" CHẤM MỰC LẠI và kẻ tiếp ra khỏi bản đồ — cùng shader nét năm tháng
  // (cùng chương trình, không dịch thêm), vật liệu riêng để đếm nét riêng. uP = 0 suốt chương 仕事: không một điểm ảnh nào đổi
  const exitMat = brushMat({ k: 1.6, name: 'viec-duong-ra' });
  exitMat.uniforms.uTip.value = 1; exitMat.uniforms.uGlow.value = 0.08; exitMat.uniforms.uCoreK.value = 0.55; exitMat.uniforms.uDepl.value = 70;
  // nét hình vẽ của thẻ: vẽ ở LƯỢT RIÊNG SAU lớp tối sau chữ (post hudPass — soát p9a A2: vẽ trong cảnh thì lớp tối + kẹp sáng sau
  // thẻ dập nét xuống 1,14:1 trên điện thoại). Nét là chữ của thẻ nên đứng trên lớp tối như chữ; màu ra thẳng (không qua nắn màu)
  // → độ đậm uK đặt theo màu ra màn: thân 緑青 400, lõi 200
  const hudMat = brushMat({ k: 1.2, fog: false, depthTest: false, body: RAMP[400], core: RAMP[200], dry: 0.45, name: 'viec-the-net', ko: true });
  const hudScene = new THREE.Scene(), hudRig = new THREE.Group();
  hudRig.matrixAutoUpdate = false; hudScene.add(hudRig);
  // quầng đèn ngà (rất nhẹ): hơi ẩm đêm bắt sáng quanh cửa
  const haloTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const haloMat = new THREE.SpriteMaterial({ name: 'viec-quang', map: haloTex, color: col(0xf2e7d4, 0.3), blending: THREE.AdditiveBlending, depthWrite: false });
  // sương: lớp ngang mỏng dần về phía đất (bản đồ độ cao), vân sương lấy từ ảnh nhiễu (rẻ hơn tính nhiễu nhiều tầng)
  // (soát p9a A5: ảnh nhiễu cũ KHÔNG lặp liền — lớp sương lặp ảnh mỗi 1/uSc mét nên có hai đường thẳng tắp ngang dọc đáy thung.
  //  Giờ nhiễu tuần hoàn: lưới ô chia hết cỡ ảnh ở mọi tầng)
  const vnP = (x, y, P) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const m = (a) => ((a % P) + P) % P;
    const a = hash2(m(xi), m(yi)), b = hash2(m(xi + 1), m(yi)), c = hash2(m(xi), m(yi + 1)), d = hash2(m(xi + 1), m(yi + 1));
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  const noiseTex = (() => {
    const N = 128, d = new Uint8Array(N * N * 4);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      let f = 0, amp = 0.5, nrm = 0; for (let o = 0; o < 4; o++) { const P = 8 << o; f += amp * vnP(i / N * P, j / N * P, P); nrm += amp; amp *= 0.5; }
      const v = Math.round(255 * ((f / nrm) * 0.7 + vnP(i / 8, j / 8, 16) * 0.3)); const k = (j * N + i) * 4; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
    }
    const t = new THREE.DataTexture(d, N, N); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
  })();
  const HM = { tex: null, box: new THREE.Vector4(-500, -600, 1000, 850) };
  const mistMat = new THREE.ShaderMaterial({
    name: 'viec-suong', transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uHM: { value: null }, uNoise: { value: noiseTex }, uY: { value: 0 }, uA: { value: 0 }, uSc: { value: 0.01 }, uC: { value: col(0x56675f) }, uAv: { value: new THREE.Vector3(SITES.w4.x, SITES.w4.z, 55) }, uBox: { value: HM.box }, uLow: { value: 1 } }]),
    vertexShader: `varying vec3 vWP;
#include <fog_pars_vertex>
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
    fragmentShader: `uniform sampler2D uHM, uNoise; uniform float uY, uA, uSc, uLow; uniform vec3 uC, uAv; uniform vec4 uBox; varying vec3 vWP;
#include <fog_pars_fragment>
void main(){
  vec2 uv = (vWP.xz - uBox.xy) / uBox.zw;
  float h = texture2D(uHM, clamp(uv, 0.0, 1.0)).r;
  float dh = uY - h;
  // lớp thấp nằm trong đáy thung; lớp cao chỉ vắt ngang lưng đồi (sát sườn)
  float a = uA * smoothstep(0.0, 7.0, dh) * (1.0 - smoothstep(uLow > 0.5 ? 40.0 : 10.0, uLow > 0.5 ? 90.0 : 34.0, dh));
  float n = texture2D(uNoise, vWP.xz * uSc).r * 0.7 + texture2D(uNoise, vWP.xz * uSc * 3.1 + 0.37).r * 0.3;
  a *= smoothstep(uLow > 0.5 ? 0.26 : 0.4, uLow > 0.5 ? 0.72 : 0.8, n);
  a *= smoothstep(uAv.z * 0.45, uAv.z, length(vWP.xz - uAv.xy));
  if (a < 0.004) discard;
  gl_FragColor = vec4(uC * (0.85 + 0.3 * n), a);
#include <fog_fragment>
}`,
  });
  // bản vẽ QUY HOẠCH cho chuyển cảnh 5 (soát p9a A3: bản cũ là đường đồng mức 1 px xám đều + nhà tô phẳng — "bản đồ vector"):
  // vẽ bằng NÉT CỌ MỰC thật — đường đồng mức, viền + gạch chéo từng nhà, đường đi — mỗi nét có 起筆 đầu ấn tròn, thân dày mỏng theo
  // lực tay, 払い đuôi vuốt, 掠れ khô dần. Vẽ MỘT lần vào khung đệm (kênh: đỏ = độ phủ mực, lục = 1 − thứ tự vẽ (hiện dần theo
  // thời gian), lam = độ đậm), hoà bằng MAX (nét chồng: phủ lấy chỗ đậm, thứ tự lấy nét vẽ trước). Bề ngang nét tính theo điểm ảnh
  // màn (uWs = mét trên một điểm ảnh CSS, đặt lúc vẽ) → khổ ngang / dọc cùng độ dày nét.
  const planBrush = new THREE.ShaderMaterial({
    name: 'viec-qh-co', depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendEquationAlpha: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    uniforms: { uWs: { value: 0.25 } },
    vertexShader: `attribute vec3 aSd; attribute float aT, aS, aV, aW, aL, aSeed, aO, aD; uniform float uWs;
varying float vT, vS, vV, vW, vL, vSeed, vO, vD;
void main(){ vT = aT; vS = aS; vV = aV; vW = aW * uWs; vL = aL; vSeed = aSeed; vO = aO; vD = aD;
  vec3 p = position + aSd * (aW * uWs * 0.68);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `varying float vT, vS, vV, vW, vL, vSeed, vO, vD;
${NZ}
void main(){
  float sA = vS / vW, sE = (vL - vS) / vW, x = abs(vV);
  // 起筆: bầu tròn ở đầu (bút ấn xuống) · 送筆: thân dày mỏng · 払い: đuôi vuốt nhọn dần trong ~7 bề ngang cuối
  float head = sqrt(clamp(sA / 0.8, 0.0, 1.0)) * (1.0 + 0.28 * exp(-sA * 0.7));
  float press = 0.6 + 0.55 * vN(vec2(sA * 0.06, vSeed * 13.0)) + 0.18 * vN(vec2(sA * 0.35, vSeed * 5.0));
  float tail = pow(clamp(sE / 7.0, 0.0, 1.0), 0.75);
  float hw = head * press * mix(0.08, 1.0, tail);
  float edgeN = vN(vec2(sA * 1.7, vSeed * 7.0 + vV * 0.5));
  float body = 1.0 - smoothstep(hw * (0.8 + 0.14 * edgeN), hw * 1.02, x);
  float fib = vN(vec2(vV * 9.0 + vSeed * 3.1, sA * 0.42)) * 0.62 + vN(vec2(vV * 21.0 + vSeed, sA * 1.4)) * 0.38;
  float dry = clamp(0.04 + 0.42 * smoothstep(0.5, 1.0, vT) + 0.3 * (1.0 - tail), 0.0, 0.8) * (1.0 + 0.5 * x * x);
  float cov = body * smoothstep(dry - 0.1, dry + 0.1, fib);
  if (cov < 0.03) discard;
  float dens = (0.92 - 0.28 * smoothstep(0.45, 1.0, vT)) * (0.84 + 0.16 * vN(vec2(sA * 2.3, vV * 6.0 + vSeed)));
  gl_FragColor = vec4(cov, 1.0 - clamp(vO + vD * vT, 0.0, 1.0), dens, 1.0);
}`,
  });
  const planScene = new THREE.Scene();
  let planMesh = null;
  // nét → dải hình (tâm + hướng ngang; bề ngang nhân trong shader)
  function* planGeo(strokes, due) {
    const P = [], SD = [], A = { aT: [], aS: [], aV: [], aW: [], aL: [], aSeed: [], aO: [], aD: [] }, idx = [];
    for (const s of strokes) {
      if (due()) yield;
      const pts = s.pts, n = pts.length; if (n < 2) continue;
      const cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
      const L = cum[n - 1] || 1, base = P.length / 3;
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        let tx = b[0] - a[0], tz = b[2] - a[2]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        for (const g of [-1, 1]) {
          P.push(pts[i][0], pts[i][1], pts[i][2]); SD.push(-tz * g, 0, tx * g);
          A.aT.push(cum[i] / L); A.aS.push(cum[i]); A.aV.push(g * 1.3); A.aW.push(s.w); A.aL.push(L); A.aSeed.push(s.seed); A.aO.push(s.o); A.aD.push(s.d);
        }
        if (i < n - 1) { const q = base + i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aSd', new THREE.Float32BufferAttribute(SD, 3));
    yield;
    for (const [nm, arr] of Object.entries(A)) { g.setAttribute(nm, new THREE.Float32BufferAttribute(arr, 1)); if (due()) yield; }
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
    return g;
  }

  // ── ĐÈN (tạo ngay: số đèn là một phần của chương trình shader — dịch ngầm với đúng số đèn) ─────────────
  const moon = new THREE.DirectionalLight(0xc3d4cd, 2.6); moon.position.set(-120, 330, -250); moon.target.position.set(0, 0, 0); scene.add(moon, moon.target);
  scene.add(new THREE.HemisphereLight(0x4d605a, 0x0b100f, 1.35));
  const SCALE = (id) => SITES[id].sc * (PORT0 ? (id === 'w4' ? 1.2 : 1.45) : 1);
  const ROOT = {};
  for (const [id, s] of Object.entries(SITES)) {
    const g = new THREE.Group(); g.name = 'nha-' + id;
    g.position.set(s.x, PADS.find((p) => p.id === id).h, s.z); g.rotation.y = s.ry; g.scale.setScalar(SCALE(id));
    scene.add(g); g.updateMatrixWorld(true); ROOT[id] = g;
  }
  const lampAt = (g, x, y, z, I, dist = 40) => { const L = new THREE.PointLight(0xf1e6d3, I, dist, 2); L.position.set(x, y, z); g.add(L); return L; };
  const S2 = 2.97;
  lampAt(ROOT.w1, 9.2, 2.2, 8.5, 90, 35);
  lampAt(ROOT.w2, 1.25, 0.9, S2 / 2 + 1.8, 28, 22);
  lampAt(ROOT.w3, 1.2, 3.3, 3.6, 120, 40);
  lampAt(ROOT.w4, 0, 2.2, 12.5, 10, 20);
  lampAt(ROOT.w5, -17, 0.8, 1.1, 60, 30);

  // ── lớp chữ HTML: nhãn năm nhà, thẻ, số đo, đường dẫn (page/viec.css) ───────────────────────────────
  const UI = buildUI();

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // DỰNG (app.js gọi từng bước trong phần thời gian thừa của khung — mỗi mẩu vài ms)
  const BLD = {};
  let terr = null, trees = null, pathMesh = null, PATH = null, exitMesh = null, EXIT = null;
  const mists = [], halos = [];
  function* build() {
    const t0 = performance.now();
    // nhường khung THEO THỜI GIAN: mỗi mẩu ≤ ~2 ms (app.js gọi tiếp trong phần thời gian thừa của khung)
    let tY = performance.now();
    const due = () => { if (performance.now() - tY > 2) { tY = performance.now(); return true; } return false; };
    // mặt đất: chia hàng, mỗi mẩu vài chục hàng
    st.at = 'dat';
    // lưới đất tự dựng (không PlaneGeometry + computeVertexNormals — hai việc ấy mỗi việc ~17–20 ms, không chia nhỏ được):
    // toạ độ, pháp tuyến (sai phân của hàm độ cao), màu, thuộc tính — đều tính trong vòng lặp có nhường khung
    const W = 1500, D = 1300, NX = 250, NZ_ = 210, n = (NX + 1) * (NZ_ + 1);
    const posA = new Float32Array(n * 3), nrmA = new Float32Array(n * 3), cols = new Float32Array(n * 3), ak = new Float32Array(n * 4);
    const cFloor = new THREE.Color(0x303c38), cSlope = new THREE.Color(0x1e2825), cRidge = new THREE.Color(0x34403d), c = new THREE.Color();
    for (let j = 0, i = 0; j <= NZ_; j++) for (let k = 0; k <= NX; k++, i++) {
      const x = -W / 2 + (W * k) / NX, z = -D / 2 + (D * j) / NZ_ - 150, h = H(x, z);
      posA[i * 3] = x; posA[i * 3 + 1] = h; posA[i * 3 + 2] = z;
      const hx = H(x + 2, z) - H(x - 2, z), hz = H(x, z + 2) - H(x, z - 2), inv = 1 / Math.hypot(hx / 4, 1, hz / 4);
      nrmA[i * 3] = (-hx / 4) * inv; nrmA[i * 3 + 1] = inv; nrmA[i * 3 + 2] = (-hz / 4) * inv;
      const r = Math.hypot(x / 108, (z + 8) / 94), sl = Math.hypot(hx, hz) / 4;
      c.copy(cFloor).lerp(cSlope, sstep(0.82, 1.1, r)).lerp(cRidge, sstep(60, 150, h) * 0.6);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
      let pad = 0; for (let q = 0; q < PADS.length; q++) { const p = PADS[q]; pad = Math.max(pad, 1 - sstep(p.q0, p.q1, Math.hypot(x - p.x, z - p.z))); }
      const field = (1 - sstep(0.72, 0.86, r)) * (1 - sstep(0.04, 0.1, sl)) * (1 - pad);
      const dS = Math.hypot(x - SITES.w4.x, z - SITES.w4.z) + 18 * (fbm2(x * 0.06, z * 0.06) - 0.5) + (PORT0 ? 8 : 0);
      const dW = Math.hypot(x - SITES.w3.x, z - SITES.w3.z) + 10 * (fbm2(x * 0.09 + 4, z * 0.09) - 0.5);
      ak[i * 4] = field * sstep(14, 30, dS); ak[i * 4 + 1] = (1 - sstep(10, 24, dS)) * 0.9; ak[i * 4 + 2] = 1 - sstep(9, 22, dW);
      if ((i & 31) === 31 && due()) yield;
    }
    const idx = new Uint32Array(NX * NZ_ * 6);
    for (let j = 0, q = 0; j < NZ_; j++) {
      for (let k = 0; k < NX; k++) { const a = j * (NX + 1) + k, b = a + NX + 1; idx[q++] = a; idx[q++] = b; idx[q++] = a + 1; idx[q++] = b; idx[q++] = b + 1; idx[q++] = a + 1; }
      if (due()) yield;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(posA, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrmA, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.setAttribute('aK', new THREE.BufferAttribute(ak, 4));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    yield; tY = performance.now();
    terr = new THREE.Mesh(g, ground); terr.name = 'viec-dat'; terr.frustumCulled = false; scene.add(terr);
    st.verts = n;
    yield; tY = performance.now();
    // rừng tuyết tùng: thân nón nhiều tầng cành, mọc cụm trên sườn; xếp GẦN TRƯỚC (nấc 2–4 bớt cây xa bằng số cây vẽ)
    st.at = 'cay';
    const prof = [[0, 0], [0.07, 0], [0.07, 0.08], [0.5, 0.1], [0.24, 0.32], [0.42, 0.33], [0.16, 0.56], [0.3, 0.57], [0.08, 0.8], [0, 1]].map(([rx, y]) => new THREE.Vector2(rx, y));
    const cg = new THREE.LatheGeometry(prof, 6);
    yield; tY = performance.now(); st.at = 'cay-tim';
    // cây ứng viên: mảng số liền (không tạo mảng con cho từng cây — đỡ dọn rác giữa chừng); xếp GẦN TRƯỚC bằng xếp theo ô khoảng cách
    // (đếm ô, không so sánh từng đôi — lệnh sort 9 000 phần tử mất ~8 ms trong một khung)
    const CAP = 9200, L5 = new Float32Array(CAP * 5);
    let nT = 0;
    const cx = 20, cz = -10;
    for (let i = 0; i < 52000 && nT < 9000; i++) {
      if ((i & 63) === 63 && due()) yield;
      const x = rr(-620, 620), z = rr(-640, 260), h = H(x, z), r = Math.hypot(x / 108, (z + 8) / 94);
      if (r < 0.9 || h < 4 || z > 95) continue;
      const cl = vn2(x * 0.018 + 3, z * 0.018) * 0.7 + vn2(x * 0.06, z * 0.06) * 0.3;
      if (cl < 0.42) continue;
      if (nearPad(x, z, 't')) continue;
      const q = nT * 5; L5[q] = x; L5[q + 1] = h - 0.6; L5[q + 2] = z; L5[q + 3] = rr(9, 17) * (0.8 + 0.4 * cl); L5[q + 4] = Math.hypot(x - cx, z - cz); nT++;
    }
    yield; tY = performance.now();
    for (let k = 0; k < 5; k++) {
      const x0 = rr(-90, 90), z0 = rr(-80, 60), a = rr(0, 3.14), nn = 8 + Math.floor(rr(0, 10));
      for (let j = 0; j < nn && nT < CAP; j++) {
        const x = x0 + Math.cos(a) * j * 5.5, z = z0 + Math.sin(a) * j * 5.5;
        if (!nearPad(x, z, 't2')) { const q = nT * 5; L5[q] = x; L5[q + 1] = H(x, z) - 0.4; L5[q + 2] = z; L5[q + 3] = rr(8, 12); L5[q + 4] = Math.hypot(x - cx, z - cz); nT++; }
      }
    }
    yield; tY = performance.now(); st.at = 'cay-xep';
    const NB = 96, cnt = new Uint32Array(NB + 1), order = new Uint32Array(nT);
    let dMax = 1; for (let i = 0; i < nT; i++) dMax = Math.max(dMax, L5[i * 5 + 4]);
    const bin = (i) => Math.min(NB - 1, Math.floor((L5[i * 5 + 4] / dMax) * NB));
    for (let i = 0; i < nT; i++) cnt[bin(i) + 1]++;
    for (let b = 0; b < NB; b++) cnt[b + 1] += cnt[b];
    for (let i = 0; i < nT; i++) order[cnt[bin(i)]++] = i;
    yield; tY = performance.now(); st.at = 'cay-tao';
    trees = new THREE.InstancedMesh(cg, treeMat, nT);
    yield; tY = performance.now(); st.at = 'cay-dat';
    const o = new THREE.Object3D();
    for (let i = 0; i < nT; i++) { const q = order[i] * 5, sc = L5[q + 3]; o.position.set(L5[q], L5[q + 1], L5[q + 2]); o.scale.set(sc * 0.34, sc, sc * 0.34); o.rotation.set(rr(-0.04, 0.04), rr(0, 6.28), rr(-0.04, 0.04)); o.updateMatrix(); trees.setMatrixAt(i, o.matrix); if ((i & 255) === 255 && due()) yield; }
    trees.instanceMatrix.needsUpdate = true;
    trees.name = 'viec-cay'; trees.frustumCulled = false;
    trees.userData.nFull = nT;
    scene.add(trees);
    st.trees = nT;
    yield; tY = performance.now();
    // sương: bản đồ độ cao cho lớp sương (mỗi mẩu vài hàng)
    st.at = 'suong';
    {
      const N = 192, data = new Float32Array(N * N), [bx, bz, bw, bh] = HM.box.toArray();
      for (let j = 0; j < N; j++) { for (let i = 0; i < N; i++) { data[j * N + i] = H(bx + bw * i / (N - 1), bz + bh * j / (N - 1)); if ((i & 63) === 63 && due()) yield; } }
      const hm = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.FloatType); hm.magFilter = hm.minFilter = THREE.LinearFilter; hm.needsUpdate = true;
      HM.tex = hm;
      for (const [y, a, sc, low] of [[3.5, 0.3, 0.011, 1], [9, 0.24, 0.007, 1], [34, 0.4, 0.006, 0], [70, 0.55, 0.004, 0], [115, 0.55, 0.003, 0]]) {
        const m = mistMat.clone(); m.uniforms = THREE.UniformsUtils.clone(mistMat.uniforms);
        Object.assign(m.uniforms.uHM, { value: hm }); m.uniforms.uNoise.value = noiseTex; m.uniforms.uY.value = y; m.uniforms.uA.value = a; m.uniforms.uSc.value = sc; m.uniforms.uLow.value = low; m.uniforms.uBox.value = HM.box;
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), m); pl.rotation.x = -Math.PI / 2; pl.position.set(bx + bw / 2, y, bz + bh / 2); pl.renderOrder = 2 + mists.length; pl.name = 'viec-suong'; pl.frustumCulled = false;
        scene.add(pl); mists.push(pl);
      }
    }
    yield; tY = performance.now();
    // năm công trình
    st.at = 'nha';
    const glowAt = (g, x, y, z, s) => { const sp = new THREE.Sprite(haloMat); sp.position.set(x, y, z); sp.scale.setScalar(s * 2.2); sp.name = 'viec-quang'; g.add(sp); halos.push(sp); };
    const box = (w, h, d, mat, x, y, z, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
    const cyl = (r0, r1, h, seg, mat, x, y, z, parent) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.position.set(x, y, z); parent.add(m); return m; };
    function gableRoof(w, d, eaveY, ridgeY, oh, roofMat, wallMat, parent) {
      const grp = new THREE.Group(); parent.add(grp);
      if (wallMat) {
        const t = new THREE.Shape(); t.moveTo(-w / 2, eaveY); t.lineTo(0, ridgeY - 0.25); t.lineTo(w / 2, eaveY); t.closePath();
        const tg = new THREE.ExtrudeGeometry(t, { depth: d, bevelEnabled: false }); tg.translate(0, 0, -d / 2); grp.add(new THREE.Mesh(tg, wallMat));
      }
      const sl = (ridgeY - eaveY) / (w / 2), th = 0.28 + w * 0.012, sh = new THREE.Shape();
      sh.moveTo(-w / 2 - oh, eaveY - oh * sl); sh.lineTo(0, ridgeY + 0.05); sh.lineTo(w / 2 + oh, eaveY - oh * sl);
      sh.lineTo(w / 2 + oh - th * 0.6, eaveY - oh * sl - th); sh.lineTo(0, ridgeY - th * 1.3); sh.lineTo(-w / 2 - oh + th * 0.6, eaveY - oh * sl - th); sh.closePath();
      const gg = new THREE.ExtrudeGeometry(sh, { depth: d + oh * 2, bevelEnabled: false }); gg.translate(0, 0, -(d + oh * 2) / 2);
      grp.add(new THREE.Mesh(gg, roofMat));
      return grp;
    }
    const done = (id, top, door) => { const g = ROOT[id]; g.updateMatrixWorld(true); BLD[id] = { g, top: g.localToWorld(new THREE.Vector3(0, top, 0)), door: g.localToWorld(new THREE.Vector3(...door)), foot: g.localToWorld(new THREE.Vector3(0, 0, 0)) }; };
    // w1 Mulberry House — kho kín 蔵 + phòng trưng bày thấp có dải mái kính nhìn trời
    st.at = 'nha-w1';
    {
      const g = ROOT.w1;
      box(10, 6, 12, M.plaster, -6, 3, 0, g); box(10.12, 1.3, 12.12, M.plasterDk, -6, 0.65, 0, g);
      gableRoof(10, 12, 6, 8.7, 0.9, M.roof, M.plaster, g).position.x = -6;
      box(0.55, 0.4, 13.9, M.roof, -6, 8.75, 0, g);
      box(1.3, 1.6, 0.12, M.wood, -6, 3.6, 6.05, g);
      box(12, 4.2, 9, M.plaster, 5.2, 2.1, 1.2, g); box(12.1, 0.9, 9.1, M.plasterDk, 5.2, 0.45, 1.2, g);
      box(12.6, 0.35, 9.6, M.roof, 5.2, 4.35, 1.2, g);
      box(9.6, 0.85, 1.8, WIN, 5.2, 4.95, 1.2, g); glowAt(g, 5.2, 5.4, 1.2, 9);
      box(1.6, 2.5, 0.1, WIN, 9.2, 1.25, 5.72, g); glowAt(g, 9.2, 1.4, 6.2, 5);
      yield; tY = performance.now();
      for (let i = 0; i < 16; i++) { const a = rr(0, 6.28), d = rr(10, 16); const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rr(0.8, 1.4), 0), M.shrub); m.scale.y = 0.7; m.position.set(Math.cos(a) * d, 0.5, Math.sin(a) * d * 0.8); g.add(m); }
      done('w1', 9.6, [9.2, 0, 9]);
    }
    yield; tY = performance.now();
    // w2 Pine Room — nhà trà 4½ chiếu: nền đá, mái bốn dốc; cửa chui 660 × 630 sáng; lối đá bước, đèn đá, cây thông, rào tre
    st.at = 'nha-w2';
    {
      const g = ROOT.w2, S = S2;
      box(S + 0.4, 0.28, S + 0.4, M.stone, 0, 0.14, 0, g);
      box(S - 0.1, 2.25, S - 0.1, M.plaster, 0, 1.4, 0, g);
      for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(0.13, 2.3, 0.13, M.wood, x * (S / 2 - 0.06), 1.4, z * (S / 2 - 0.06), g);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(S * 1.02, 1.55, 4, 1), M.thatch); roof.rotation.y = Math.PI / 4; roof.position.y = 2.52 + 0.77; g.add(roof);
      cyl(0.06, 0.1, 0.3, 6, M.roof, 0, 4.1, 0, g);
      box(0.66, 0.63, 0.05, WIN, -0.135, 0.28 + 0.34, S / 2 - 0.02, g); glowAt(g, -0.135, 0.62, S / 2 + 0.2, 1.3);
      box(0.05, 0.95, 1.3, WIN2, -S / 2 + 0.02, 1.5, 0.3, g);
      for (let i = 0; i < 6; i++) cyl(0.26, 0.29, 0.1, 9, M.stone, -0.135 + Math.sin(i * 1.3) * 0.25, 0.05, S / 2 + 0.55 + i * 0.62, g);
      const tx = 1.25, tz = S / 2 + 1.6;
      cyl(0.18, 0.22, 0.12, 6, M.stone, tx, 0.06, tz, g); cyl(0.06, 0.06, 0.55, 6, M.stone, tx, 0.38, tz, g);
      box(0.28, 0.24, 0.28, WIN, tx, 0.78, tz, g); glowAt(g, tx, 0.8, tz, 0.9);
      const lr = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.2, 6), M.stone); lr.position.set(tx, 1.0, tz); g.add(lr);
      const pine = new THREE.Group(); pine.position.set(-2.6, 0, -1.4); g.add(pine);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, 3.6, 7), M.wood); tr.position.set(0.35, 1.7, 0); tr.rotation.z = -0.22; pine.add(tr);
      // (soát p9a A8: bốn đĩa cầu dẹt trơn trông như chồng đĩa) — mỗi tầng lá là 3–4 cụm lá đa diện mặt phẳng, lệch nhau, dày mỏng khác nhau
      { const tuftG = new THREE.IcosahedronGeometry(1, 0);
        for (const [x, y, z, r] of [[0.9, 3.5, 0.1, 1.0], [0.2, 2.8, 0.5, 0.85], [1.25, 2.55, -0.4, 0.75], [0.55, 4.05, -0.2, 0.62]]) {
          const n = r > 0.8 ? 4 : 3;
          for (let q = 0; q < n; q++) {
            const a = q / n * 6.28 + rr(-0.4, 0.4), d = r * rr(0.3, 0.55);
            const cc = new THREE.Mesh(tuftG, M.leaf); const s_ = r * rr(0.48, 0.66);
            cc.scale.set(s_ * rr(1.1, 1.4), s_ * rr(0.45, 0.7), s_ * rr(0.9, 1.2)); cc.position.set(x + Math.cos(a) * d, y + rr(-0.1, 0.12), z + Math.sin(a) * d * 0.8); cc.rotation.set(rr(-0.3, 0.3), rr(0, 6.28), rr(-0.3, 0.3)); pine.add(cc);
          }
        } }
      for (let i = 0; i < 9; i++) box(0.05, 0.7, 0.05, M.woodLt, -2.6 + i * 0.65, 0.35, -2.4, g);
      box(5.4, 0.05, 0.05, M.woodLt, 0, 0.62, -2.4, g);
      done('w2', 4.25, [-0.135, 0, S / 2 + 4.4]);
    }
    yield; tY = performance.now();
    // w3 Dry Store — kho gỗ trên 9 cột 1 200 có đĩa chắn chuột, tường ván ghép ngang, mái vỏ bách vươn sâu, chigi và katsuogi;
    // cổng torii, lối đá, đèn treo dưới hiên; đất quanh ướt (shader đất)
    st.at = 'nha-w3';
    {
      const g = ROOT.w3;
      for (const x of [-3.1, 0, 3.1]) for (const z of [-2.3, 0, 2.3]) { box(0.3, 1.2, 0.3, M.wood, x, 0.6, z, g); cyl(0.38, 0.38, 0.05, 12, M.woodLt, x, 1.02, z, g); }
      box(7.2, 0.26, 5.8, M.wood, 0, 1.33, 0, g);
      for (let y = 1.46, k = 0; y < 4.15; y += 0.33, k++) box(6.7, 0.3, 5.2, k % 2 ? M.woodLt : M.woodMd, 0, y + 0.15, 0, g);
      gableRoof(6.7, 5.2, 4.25, 6.35, 1.05, M.bark, M.woodLt, g);
      box(0.5, 0.45, 7.3, M.bark, 0, 6.4, 0, g);
      for (const z of [-3.2, -1.1, 1.1, 3.2]) { const kk = cyl(0.17, 0.17, 1.0, 8, M.woodLt, 0, 6.75, z, g); kk.rotation.z = Math.PI / 2; }
      for (const zz of [-3.75, 3.75]) for (const s of [-1, 1]) { const cc = box(0.12, 2.0, 0.08, M.wood, s * 0.45, 6.9, zz, g); cc.rotation.z = s * 0.55; }
      box(0.9, 1.6, 0.06, WIN, 0, 2.3, 2.64, g); glowAt(g, 0, 2.3, 3.0, 2.2);
      for (let i = 0; i < 5; i++) box(1.1, 0.08, 0.28, M.wood, 0, 0.25 + i * 0.26, 3.1 + (4 - i) * 0.3, g);
      const tor = new THREE.Group(); tor.position.set(0, 0, 10); g.add(tor);
      for (const x of [-1.9, 1.9]) cyl(0.17, 0.2, 4.3, 10, M.wood, x, 2.15, 0, tor);
      box(5.6, 0.34, 0.42, M.roof, 0, 4.4, 0, tor); box(4.6, 0.22, 0.26, M.wood, 0, 3.7, 0, tor);
      for (let i = 0; i < 7; i++) box(1.1, 0.06, 0.8, M.stone, rr(-0.1, 0.1), 0.03, 4 + i * 1.0, g);
      box(0.3, 0.42, 0.3, WIN, 1.2, 3.55, 3.2, g); glowAt(g, 1.2, 3.55, 3.2, 1.4);
      done('w3', 7.3, [0, 0, 12.5]);
    }
    yield; tY = performance.now();
    // w4 Snow Hall — nhà hát làng mái 60°, đầu hồi lắp kính sáng dịu; tuyết dồn thành đống dọc hai mép mái
    st.at = 'nha-w4';
    {
      const g = ROOT.w4;
      box(14, 3.5, 18, M.woodLt, 0, 1.75, 0, g);
      gableRoof(14, 18, 3.5, 15.62, 0.9, M.roof, M.plaster, g);
      const t = new THREE.Shape(); t.moveTo(-6.6, 0.2); t.lineTo(6.6, 0.2); t.lineTo(6.6, 3.5); t.lineTo(0, 14.9); t.lineTo(-6.6, 3.5); t.closePath();
      const gl = new THREE.Mesh(new THREE.ShapeGeometry(t), GLASS); gl.position.z = 9.02; g.add(gl);
      for (let x = -6; x <= 6; x += 1.5) { const hgt = Math.min(3.5 + (6.6 - Math.abs(x)) * Math.tan(Math.PI / 3), 14.8); box(0.14, hgt, 0.2, M.wood, x, hgt / 2, 9.08, g); }
      for (const y of [3.5, 7.5]) { const w = y <= 3.5 ? 13.2 : 13.2 - (y - 3.5) / Math.tan(Math.PI / 3) * 2; box(w, 0.16, 0.2, M.wood, 0, y, 9.08, g); }
      glowAt(g, 0, 3.6, 10, 1.8);
      yield; tY = performance.now();
      // tuyết trượt khỏi mái dồn dưới hai chân mái: một dải gò thấp, to nhỏ không đều (soát p9a A8: một khối dài trơn như viên thuốc)
      { const lump = new THREE.IcosahedronGeometry(1, 2);
        for (const x of [-9.3, 9.3]) for (let k = 0; k < 10; k++) {
          const z = -8.8 + k * 1.95 + rr(-0.4, 0.4), sc = rr(1.3, 2.1);
          const sn = new THREE.Mesh(lump, M.snow); sn.scale.set(sc * rr(0.9, 1.3), sc * rr(0.42, 0.62), sc * rr(1.1, 1.6)); sn.position.set(x + rr(-0.35, 0.35) + Math.sign(x) * 0.2, -0.15, z); sn.rotation.y = rr(-0.4, 0.4); g.add(sn);
        } }
      done('w4', 16.2, [0, 0, 14]);
    }
    yield; tY = performance.now();
    // w5 Open Field — lối đá thẳng 26 m, tới cuối là khoảng trống 6 × 6 rải sỏi (vân sỏi), mép cỏ; không dựng gì; đèn thấp đầu lối
    st.at = 'nha-w5';
    {
      const g = ROOT.w5;
      for (let x = -16; x < 10; x += 1.05) box(0.9, 0.1, 1.2, M.stone, x + 0.45, 0.05, rr(-0.04, 0.04), g);
      const sq = new THREE.Mesh(new THREE.BoxGeometry(6, 0.06, 6), M.gravel); sq.position.set(14, 0.03, 0); g.add(sq);
      for (const [w, d, x, z] of [[6.3, 0.18, 14, -3.1], [6.3, 0.18, 14, 3.1], [0.18, 6.3, 10.9, 0], [0.18, 6.3, 17.1, 0]]) box(w, 0.2, d, M.stone, x, 0.1, z, g);
      yield; tY = performance.now();
      // mép cỏ quanh ô sỏi và dọc lối đi
      const tuft = new THREE.ConeGeometry(0.14, 0.5, 4); tuft.translate(0, 0.25, 0);
      const tl = [];
      for (let i = 0; i < 260; i++) {
        const a = rr(0, 6.28), side = R();
        let x, z;
        if (side < 0.6) { const k = rr(-3.6, 3.6); const e = R() < 0.5 ? -1 : 1; if (R() < 0.5) { x = 14 + k; z = e * rr(3.3, 4.2); } else { x = 14 + e * rr(3.3, 4.2); z = k; } }
        else { x = rr(-16, 10); z = (R() < 0.5 ? -1 : 1) * rr(0.8, 1.6); }
        tl.push([x, z, rr(0.6, 1.3), a]);
      }
      const im = new THREE.InstancedMesh(tuft, M.grass, tl.length), oo = new THREE.Object3D();
      tl.forEach(([x, z, s, a], i) => { oo.position.set(x, 0, z); oo.scale.set(s, s * rr(0.8, 1.4), s); oo.rotation.set(rr(-0.2, 0.2), a, rr(-0.2, 0.2)); oo.updateMatrix(); im.setMatrixAt(i, oo.matrix); });
      im.instanceMatrix.needsUpdate = true; im.name = 'viec-co-mep'; g.add(im);
      box(0.3, 0.35, 0.3, WIN, -17, 0.18, 1.1, g); glowAt(g, -17, 0.3, 1.1, 1.6);
      done('w5', 1.4, [-17.5, 0, 0]);
    }
    yield; tY = performance.now();
    // ĐƯỜNG CỌ: mỗi chặng giữa hai nhà một nét; điểm đặt theo đất
    st.at = 'duong-co';
    {
      const ids = ['w1', 'w2', 'w3', 'w4', 'w5'], strokes = [];
      for (let s = 0; s < 4; s++) {
        const a = BLD[ids[s]].door, b = BLD[ids[s + 1]].door, d = b.clone().sub(a), L = d.length(), nrm = new THREE.Vector3(-d.z, 0, d.x).normalize();
        const ctrl = [a.clone()];
        if (s === 1) {
          // (Sếp 29/9 sau p9b) chặng Pine Room → Dry Store vốn gần như thẳng tắp: lượn một chữ S rất nhẹ, mỗi điểm uốn còn né về phía đất
          // thấp hơn (lối mòn đi vòng quanh gò / bậc ruộng, không leo thẳng qua)
          for (const [f, o] of [[0.3, 0.085], [0.7, -0.065]]) {
            const q = a.clone().addScaledVector(d, f).addScaledVector(nrm, o * L);
            const lo = H(q.x + nrm.x * 5, q.z + nrm.z * 5) - H(q.x - nrm.x * 5, q.z - nrm.z * 5);
            ctrl.push(q.addScaledVector(nrm, -Math.sign(lo) * Math.min(3, Math.abs(lo) * 2)));
          }
        } else for (const f of [0.28, 0.55, 0.8]) ctrl.push(a.clone().addScaledVector(d, f).addScaledVector(nrm, (vn2(s * 3.1 + f * 4, 1.7) - 0.5) * L * 0.34));
        ctrl.push(b.clone());
        const cv = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal', 0.5);
        const pts = cv.getSpacedPoints(Math.ceil(L / 0.8)).map((p) => { const j = (vn2(p.x * 0.1, p.z * 0.1) - 0.5) * 1.6; return new THREE.Vector3(p.x + nrm.x * j, 0, p.z + nrm.z * j); });
        pts.forEach((p) => { p.y = H(p.x, p.z) + 0.35; });
        strokes.push({ pts, w: PORT0 ? 3.8 : PATHW, i: s, seed: s * 0.37 + 0.2 });
      }
      pathMesh = new THREE.Mesh(ribbonGeo(strokes, new THREE.Vector3(0, 1, 0)), pathMat); pathMesh.renderOrder = 8; pathMesh.name = 'viec-duong-co'; pathMesh.frustumCulled = false;
      scene.add(pathMesh);
      PATH = { strokes };
      yield;
      // (phần 9) NÉT RA KHỎI BẢN ĐỒ: từ đúng chỗ nét năm tháng dừng (chấm "2026 —" ở đầu lối Open Field) kẻ TIẾP theo đúng hướng chặng
      // Snow Hall → Open Field — dọc lối đá của đài tưởng niệm ("One path across the site. Where it ends, nothing stands.") — qua hết
      // lối, lượn dần sang tây, leo sườn thung phía tây rồi vượt ra khỏi bản đồ (soát p10a A1: nét cũ kẻ ngược lên bắc, cắt chặng
      // Pine Room → Dry Store thành dấu "+"). Không cắt chặng nào. Máy bay theo đầu cọ. Không vào ánh hắt, không vào bản vẽ quy hoạch,
      // không vào chỗ tránh của nhãn: chương 仕事 giữ nguyên từng điểm ảnh
      {
        const lastS = strokes[3].pts, D0 = lastS[lastS.length - 1].clone(); D0.y = 0;
        const ax = new THREE.Vector3(SITES.w5.x - SITES.w4.x, 0, SITES.w5.z - SITES.w4.z).normalize();
        const at = (k) => D0.clone().addScaledVector(ax, k);
        // (nét lượn như lối mòn — không kẻ thẳng một đường; khổ ngang và khổ dọc cùng một nét, chỉ máy khác)
        // (soát p11a A1) máy giờ TIẾN THẲNG (một cú máy), không bay theo đầu cọ → nét phải tự đi tới chỗ nét 道 của 連絡 sẽ mọc: đi tiếp
        // một đoạn theo hướng chặng cũ rồi lượn dần về phía NAM — về phía máy — nên trên màn nó chạy xuống GIỮA ĐÁY khung rồi ra sau lưng
        // máy; vùng đất mới loang ra từ chính đoạn nét ấy (từ đáy lên), đúng chỗ nét 道 đi từ đáy màn vào bãi
        // khổ dọc: máy nhìn về TÂY (đáy màn là phía ĐÔNG) → nét chấm mực lại rồi đi về phía đông, phía nam chặng Snow Hall → Open Field
        // (không cắt chặng nào), xuống đáy màn gần giữa
        // (đọc khổ màn ĐÚNG LÚC DỰNG nét — PORT0 lấy từ lúc tạo cảnh, trên điện thoại giả lập có lúc còn là khổ mặc định của trình duyệt)
        const C = innerHeight > innerWidth
          ? [D0, D0.clone().add(new THREE.Vector3(7, 0, 2)), [34, 40], [62, 25], [92, 9], [130, -4], [180, -10], [250, -10], [330, -8]]
          : [D0, at(8), at(14).add(new THREE.Vector3(6, 0, 8)), [24, 78], [52, 98], [78, 124], [92, 166], [98, 228], [101, 298], [102, 370]];
        yield; tY = performance.now();
        const ctrl = C.map((q) => (q.isVector3 ? q.clone() : new THREE.Vector3(q[0], 0, q[1])));
        const cv = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal', 0.5);
        const L = cv.getLength();
        const pts = cv.getSpacedPoints(Math.ceil(L / 1.1)).map((p, i) => { const j = i < 40 ? 0 : (vn2(p.x * 0.08, p.z * 0.08) - 0.5) * 2.2 * Math.min(1, (i - 40) / 30); return new THREE.Vector3(p.x, 0, p.z + j); });
        yield; tY = performance.now();
        for (let i = 0; i < pts.length; i++) { pts[i].y = H(pts[i].x, pts[i].z) + 0.5; if ((i & 63) === 63 && due()) yield; }
        const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
        yield; tY = performance.now();
        exitMesh = new THREE.Mesh(ribbonGeo([{ pts, w: PORT0 ? 4.6 : 4.2, i: 0, seed: 0.83 }], new THREE.Vector3(0, 1, 0)), exitMat);
        exitMesh.renderOrder = 8; exitMesh.name = 'viec-duong-ra'; exitMesh.frustumCulled = false; exitMesh.visible = false;
        scene.add(exitMesh);
        EXIT = { pts, cum, L: cum[cum.length - 1] };
      }
      yield;
      // ánh hắt: ảnh nhìn từ trên xuống — đỏ = độ sáng (mờ nhoè quanh nét), lục = vị trí dọc đường (0…1) × độ sáng.
      // (soát p9a B5: bản cũ vẽ bằng canvas 2D có bộ lọc blur — mỗi nét một lượt nhoè cả tấm, card đồ hoạ phải làm hết lúc nạp ảnh
      //  lên lần vẽ đầu → khựng 67–133 ms giữa chương 皮. Giờ tính bằng số: in đĩa theo nét, nhoè hộp ba lượt, từng mẩu có nhường
      //  khung, rồi nạp thẳng mảng số lên card)
      const N = 512, [bx, bz, bw, bh] = SPILL_BOX.toArray();
      const Rr = new Float32Array(N * N), Gg = new Float32Array(N * N);
      for (let i = 0; i < strokes.length; i++) {
        const s_ = strokes[i], rad = Math.max(2, (s_.w * 3.2 / bw * N) / 2);
        for (let j = 0; j < s_.pts.length; j++) {
          const T = (i + j / (s_.pts.length - 1)) / 4, cx = (s_.pts[j].x - bx) / bw * N, cy = (s_.pts[j].z - bz) / bh * N;
          for (let y = Math.max(0, Math.floor(cy - rad)); y <= Math.min(N - 1, Math.ceil(cy + rad)); y++) {
            for (let x = Math.max(0, Math.floor(cx - rad)); x <= Math.min(N - 1, Math.ceil(cx + rad)); x++) {
              const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy; if (d2 > rad * rad) continue; const d = Math.sqrt(d2);
              const q = y * N + x, a = 0.6 * Math.min(1, rad - d + 0.5);
              Rr[q] = Rr[q] + (1 - Rr[q]) * a; Gg[q] = Gg[q] + (T - Gg[q]) * a;
            }
          }
          if ((j & 3) === 3 && due()) yield;
        }
      }
      // nhoè hộp bán kính 3, ba lượt ngang + dọc (≈ nhoè Gauss 5 px của bản cũ)
      const tmp = new Float32Array(N * N);
      const boxH = (A) => { for (let y = 0; y < N; y++) { let acc = 0; const o = y * N; for (let x = -3; x <= 3; x++) acc += A[o + Math.min(N - 1, Math.max(0, x))]; for (let x = 0; x < N; x++) { tmp[o + x] = acc / 7; acc += A[o + Math.min(N - 1, x + 4)] - A[o + Math.max(0, x - 3)]; } } A.set(tmp); };
      const boxV = (A) => { for (let x = 0; x < N; x++) { let acc = 0; for (let y = -3; y <= 3; y++) acc += A[Math.min(N - 1, Math.max(0, y)) * N + x]; for (let y = 0; y < N; y++) { tmp[y * N + x] = acc / 7; acc += A[Math.min(N - 1, y + 4) * N + x] - A[Math.max(0, y - 3) * N + x]; } } A.set(tmp); };
      for (let it = 0; it < 3; it++) for (const A of [Rr, Gg]) { boxH(A); if (due()) yield; boxV(A); if (due()) yield; }
      const px = new Uint8Array(N * N * 4);
      for (let y = 0; y < N; y++) { for (let x = 0, q = y * N; x < N; x++, q++) { px[q * 4] = Math.round(Math.min(1, Rr[q]) * 255); px[q * 4 + 1] = Math.round(Math.min(1, Gg[q]) * 255); px[q * 4 + 3] = 255; } if ((y & 63) === 63 && due()) yield; }
      const t = new THREE.DataTexture(px, N, N, THREE.RGBAFormat); t.colorSpace = THREE.NoColorSpace; t.flipY = false; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
      spillU.uSpill.value = t;
    }
    yield; tY = performance.now();
    // BẢN VẼ QUY HOẠCH bằng nét cọ (soát p9a A3): đường đồng mức 4 m (20 m nét đậm) · nhà: viền + gạch chéo · đường đi dự kiến
    st.at = 'ban-ve';
    {
      const strokes = [];
      const X0 = -260, X1 = 300, Z0 = -176, Z1 = 152, S = 4, NXp = Math.round((X1 - X0) / S), NZp = Math.round((Z1 - Z0) / S);
      const hg = new Float32Array((NXp + 1) * (NZp + 1));
      for (let j = 0, i = 0; j <= NZp; j++) { for (let k = 0; k <= NXp; k++, i++) hg[i] = H(X0 + k * S, Z0 + j * S); if (due()) yield; }
      let hmin = 1e9, hmax = -1e9; for (let i = 0; i < hg.length; i++) { if (hg[i] < hmin) hmin = hg[i]; if (hg[i] > hmax) hmax = hg[i]; }
      const val = (k, j) => hg[j * (NXp + 1) + k];
      const CX = 27, CZ = -12;
      // (mảng số thay cho Map: mỗi mức chỉ ghi lại các cạnh có đường cắt — dấu 'lần' để khỏi xoá mảng; nhường khung theo hàng ô)
      const NE = (NXp + 1) * (NZp + 1) * 2, ptX = new Float32Array(NE), ptZ = new Float32Array(NE), nbA = new Int32Array(NE * 2), mark = new Int32Array(NE), used = new Int32Array(NE);
      const touched = new Int32Array(NE); let nT = 0, pass = 0;
      const eH = (k, j) => (j * NXp + k) * 2, eV = (k, j) => (j * (NXp + 1) + k) * 2 + 1;
      for (let lv = Math.ceil((hmin + 1.5) / 4) * 4; lv < hmax; lv += 4) {
        pass++; nT = 0;
        const cross = (id, ax, az, va, bx, bz, vb) => { if (mark[id] !== pass) { mark[id] = pass; nbA[id * 2] = nbA[id * 2 + 1] = -1; touched[nT++] = id; const t = (lv - va) / (vb - va); ptX[id] = ax + (bx - ax) * t; ptZ[id] = az + (bz - az) * t; } };
        const link = (a, b) => { if (nbA[a * 2] < 0) nbA[a * 2] = b; else nbA[a * 2 + 1] = b; if (nbA[b * 2] < 0) nbA[b * 2] = a; else nbA[b * 2 + 1] = a; };
        for (let j = 0; j < NZp; j++) {
          for (let k = 0; k < NXp; k++) {
            const v0 = val(k, j), v1 = val(k + 1, j), v2 = val(k + 1, j + 1), v3 = val(k, j + 1);
            const c = (v0 > lv ? 1 : 0) | (v1 > lv ? 2 : 0) | (v2 > lv ? 4 : 0) | (v3 > lv ? 8 : 0);
            if (c === 0 || c === 15) continue;
            const x0 = X0 + k * S, z0 = Z0 + j * S, x1 = x0 + S, z1 = z0 + S;
            const eB = eH(k, j), eR = eV(k + 1, j), eT = eH(k, j + 1), eL = eV(k, j);
            let e0 = -1, e1 = -1, e2 = -1, e3 = -1, nE = 0;
            const put = (e) => { if (nE === 0) e0 = e; else if (nE === 1) e1 = e; else if (nE === 2) e2 = e; else e3 = e; nE++; };
            if ((v0 > lv) !== (v1 > lv)) { cross(eB, x0, z0, v0, x1, z0, v1); put(eB); }
            if ((v1 > lv) !== (v2 > lv)) { cross(eR, x1, z0, v1, x1, z1, v2); put(eR); }
            if ((v3 > lv) !== (v2 > lv)) { cross(eT, x0, z1, v3, x1, z1, v2); put(eT); }
            if ((v0 > lv) !== (v3 > lv)) { cross(eL, x0, z0, v0, x0, z1, v3); put(eL); }
            if (nE === 2) link(e0, e1);
            else if (nE === 4) { const ctr = (v0 + v1 + v2 + v3) / 4 > lv; if ((c === 5) === ctr) { link(eB, eR); link(eT, eL); } else { link(eB, eL); link(eR, eT); } }
            void e2; void e3;
          }
          if ((j & 7) === 7 && due()) yield;
        }
        // nối thành đường: đầu hở trước, rồi các vòng kín
        const lines = [];
        const walk = (s0) => {
          const L = [s0]; used[s0] = pass; let prev = -1, cur = s0;
          for (;;) {
            const a = nbA[cur * 2], b = nbA[cur * 2 + 1];
            let nx = -1; if (a >= 0 && a !== prev && used[a] !== pass) nx = a; else if (b >= 0 && b !== prev && used[b] !== pass) nx = b;
            if (nx < 0) { if ((a === s0 || b === s0) && L.length > 2) L.push(s0); break; }
            used[nx] = pass; L.push(nx); prev = cur; cur = nx;
          }
          return L;
        };
        for (let t = 0; t < nT; t++) { const id = touched[t]; if (used[id] !== pass && (nbA[id * 2] < 0 || nbA[id * 2 + 1] < 0)) lines.push(walk(id)); }
        for (let t = 0; t < nT; t++) { const id = touched[t]; if (used[id] !== pass) lines.push(walk(id)); }
        const major = lv % 20 === 0;
        for (const ln of lines) {
          let q = ln.map((id) => [ptX[id], ptZ[id]]);
          // làm trơn (Chaikin ×2), bỏ vòng nhỏ
          for (let it = 0; it < 2; it++) { const o = [q[0]]; for (let i = 0; i < q.length - 1; i++) { const a = q[i], b = q[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(q[q.length - 1]); q = o; }
          const cum = [0]; for (let i = 1; i < q.length; i++) cum.push(cum[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
          const Lt = cum[cum.length - 1]; if (Lt < 14) continue;
          // chia thành nhiều nét tay: mỗi nét 26–70 m, nét sau đè đầu nét trước 1,5 m (chỗ cọ nhấc lên chấm mực lại)
          let a = 0;
          while (a < Lt - 4) {
            const len = Math.min(Lt - a, 26 + 44 * R()), b = a + len;
            const seg = []; for (let i = 0; i < q.length; i++) if (cum[i] >= a && cum[i] <= b) seg.push([q[i][0], lv + 0.3, q[i][1]]);
            if (seg.length >= 3) {
              const mx = seg[seg.length >> 1], r = Math.hypot((mx[0] - CX) / 230, (mx[2] - CZ) / 150);
              strokes.push({ pts: seg, w: major ? 5.2 : 2.9, seed: R() * 40, r, o: 0, d: 0.1 + 0.05 * R() });
            }
            a = b - 1.5;
          }
          if (due()) yield;
        }
        if (due()) yield;
      }
      // thứ tự vẽ đồng mức: từ đường trong cùng ra ngoài (mực có ngay từ lúc bắt đầu — soát p9a A1: quãng giấy trống phải thật ngắn)
      { let r0 = 1e9, r1 = -1e9; for (const t of strokes) { r0 = Math.min(r0, t.r); r1 = Math.max(r1, t.r); }
        for (const t of strokes) t.o = 0.005 + 0.42 * (t.r - r0) / Math.max(1e-3, r1 - r0) + 0.05 * R(); }
      // nhà: viền (bốn nét, vượt góc như tay kiến trúc sư) + gạch chéo trong khối — khu đất của từng công trình
      const ids = ['w1', 'w2', 'w3', 'w4', 'w5'], bb = new THREE.Box3(), tb = new THREE.Box3();
      ids.forEach((id, si) => {
        const g = ROOT[id], ry = g.rotation.y; g.rotation.y = 0; g.updateMatrixWorld(true);
        bb.makeEmpty();
        g.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.geometry && o.visible) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); bb.union(tb); } });
        g.rotation.y = ry; g.updateMatrixWorld(true);
        if (bb.isEmpty()) return;
        const px = g.position.x, pz = g.position.z, y = g.position.y + 0.4, c = Math.cos(ry), sn = Math.sin(ry);
        const lx0 = bb.min.x - px - 0.6, lx1 = bb.max.x - px + 0.6, lz0 = bb.min.z - pz - 0.6, lz1 = bb.max.z - pz + 0.6;
        const W = (lx, lz) => [px + lx * c + lz * sn, y, pz - lx * sn + lz * c];
        const line = (a, b, n = 8) => { const o = []; for (let i = 0; i <= n; i++) o.push(W(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)); return o; };
        const ov = 1.4, o0 = 0.4 + si * 0.05;
        const E4 = [[[lx0 - ov, lz0], [lx1 + ov, lz0]], [[lx1, lz0 - ov], [lx1, lz1 + ov]], [[lx1 + ov, lz1], [lx0 - ov, lz1]], [[lx0, lz1 + ov], [lx0, lz0 - ov]]];
        E4.forEach(([a, b], e) => strokes.push({ pts: line(a, b), w: 4.4, seed: R() * 40, o: o0 + e * 0.009, d: 0.02 }));
        // gạch chéo 45°: mỗi 2,4 m (khối nhỏ thì dày hơn), cắt theo khung
        const sp = Math.max(1.3, Math.min(lx1 - lx0, lz1 - lz0) / 5);
        let h = 0;
        for (let cc = lx0 + lz0 + sp; cc < lx1 + lz1 - sp * 0.5; cc += sp) {
          const A = [Math.max(lx0, cc - lz1), 0]; A[1] = cc - A[0];
          const B = [Math.min(lx1, cc - lz0), 0]; B[1] = cc - B[0];
          if (Math.hypot(B[0] - A[0], B[1] - A[1]) < 1.2) continue;
          strokes.push({ pts: line(A, B, 4), w: 2.1, seed: R() * 40, o: o0 + 0.036 + h * 0.004, d: 0.014 }); h++;
        }
      });
      yield; tY = performance.now();
      // đường đi dự kiến: theo đúng đường cọ của chương (năm tháng), nét đậm nhất
      PATH.strokes.forEach((st_, si) => strokes.push({ pts: st_.pts.map((v) => [v.x, v.y, v.z]), w: 6.2, seed: st_.seed * 11 + 3, o: 0.66 + si * 0.075, d: 0.075 }));
      yield; tY = performance.now();
      const pg = planGeo(strokes, due);
      let r_; while (!(r_ = pg.next()).done) yield;
      planMesh = new THREE.Mesh(r_.value, planBrush); planMesh.name = 'viec-ban-ve'; planMesh.frustumCulled = false;
      planScene.add(planMesh);
      st.planStrokes = strokes.length;
    }
    yield; tY = performance.now();
    // nhãn: chọn phía không đè lên đường cọ / nhà (tính một lần ở tư thế bản đồ)
    st.at = 'nhan';
    layoutLabels();
    UI.cardsReady();
    scene.traverse((m) => { if (m.isMesh || m.isInstancedMesh) st.meshes++; });
    // mọi lưới đều có tên (soát p9a B5: nhật ký vẽ đầu ghi 'Mesh' không tên thì không biết lưới nào làm card nghẽn)
    { let q = 0; scene.traverse((o) => { if ((o.isMesh || o.isInstancedMesh || o.isSprite) && !o.name) o.name = (o.parent && o.parent.name ? o.parent.name : 'viec') + '/' + ((o.material && o.material.name) || o.type) + '#' + (q++); }); }
    st.built = true; st.buildMs = Math.round(performance.now() - t0); st.at = 'xong';
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // MÁY QUAY: τ 0 nhìn thẳng xuống (bản vẽ quy hoạch) → τ 0,5 góc bản đồ; khổ dọc: bản đồ xoay dọc (máy nhìn theo trục x)
  const POSE = {
    land: { A: { p: [27, 340, -10], t: [27, 0, -12], up: [0, 0, -1], fov: 36, off: 0 }, B: { p: [42, 162, 242], t: [27, -6, -14], up: [0, 1, 0], fov: 36, off: 0 } },
    port: { A: { p: [4, 430, -6], t: [4, 0, -6.4], up: [-1, 0, 0], fov: 54, off: 150 }, B: { p: [236, 214, -6], t: [4, 0, -6], up: [0, 1, 0], fov: 54, off: 150 } },
  };
  let portrait = false, W_ = innerWidth, H_ = innerHeight, offY = 0;
  // (vòng kiểm cuối 30/9) khổ ngang HẸP (máy tính bảng ngang 4:3…): góc nhìn dọc cố định → bản đồ bị cắt hai bên, nhà Mulberry nằm
  // dưới cột chương, thẻ hình vẽ đè đường cọ. Giữ bề ngang nhìn thấy ít nhất như khổ 1,6 (1440×900); khổ ≥ 1,6 và khổ dọc không đổi.
  const fovFit = (f) => { const a = W_ / Math.max(1, H_); return portrait || a >= 1.6 ? f : 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(THREE.MathUtils.degToRad(f) / 2) * 1.6 / a)); };
  const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), m4 = new THREE.Matrix4(), vA = new THREE.Vector3(), vB = new THREE.Vector3(), vU = new THREE.Vector3();
  function poseQ(P, out) { m4.lookAt(vA.fromArray(P.p), vB.fromArray(P.t), vU.fromArray(P.up)); return out.setFromRotationMatrix(m4); }
  // (phần 9) CÚ BAY RA KHỎI BẢN ĐỒ theo đầu cọ — ex 0 → 1 (app.js: từ đầu chuyển cảnh 6 tới hết quãng hoà cảnh). ex = 0: không đổi gì.
  // Đầu cọ: 0 → 0,12 chấm mực lại (một chấm đầu nét tròn ở chỗ nét năm tháng dừng), rồi kẻ tiếp nhanh dần. Máy: rời tư thế bản đồ
  // (vận tốc 0), bay lên phía sau đầu cọ, luôn cao hơn nét, nhìn theo đầu cọ.
  const exitDraw = (ex) => (ex <= 0 ? 0 : 0.02 * sstep(0, 0.14, ex) + 0.98 * sstep(0.12, 0.94, ex));
  const EXV = { tip: new THREE.Vector3(), lag: new THREE.Vector3(), p: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4(), up: new THREE.Vector3(0, 1, 0) };
  function exitAt(d, out) {
    const c = EXIT.cum, P = EXIT.pts;
    if (d <= 0) return out.copy(P[0]);
    if (d >= EXIT.L) return out.copy(P[P.length - 1]);
    let lo = 0, hi = c.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= d) lo = m; else hi = m; }
    return out.copy(P[lo]).lerp(P[hi], (d - c[lo]) / Math.max(1e-6, c[hi] - c[lo]));
  }
  // máy (Mike 30/9: "hai cú máy" — đo chuyển cảnh 6: máy 仕事 bay LÊN và quay theo đầu cọ tới 109°/s, rồi máy 連絡 lướt TỚI — hai
  // hướng, xoay gắt giữa chừng) → MỘT CÚ TIẾN: giữ nguyên hướng nhìn của tư thế đang có (rời chương giữa chừng: đúng tư thế đang trôi),
  // tiến thẳng theo hướng nhìn, nhanh dần (ex^1,6) — tới quãng hoà cảnh thì tốc độ tương đối (quãng tiến / khoảng cách tới mặt bản đồ)
  // ≈ tốc độ lướt tới của máy 連絡 lúc bắt đầu, nên hai cảnh cùng một cú tiến, cảnh 連絡 hãm dần tới chỗ nghỉ. Đầu cọ vẫn kẻ tiếp ra
  // khỏi bản đồ (có thể ra khỏi khung) — vùng đất mới thấm ra từ phần nét còn trên màn.
  function exitCam(ex) {
    if (!EXIT || ex <= 0) return;
    const f = EXV.p.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const D = camera.position.y / Math.max(0.25, -f.y);   // quãng tới mặt bản đồ theo hướng nhìn
    camera.position.addScaledVector(f, 0.45 * D * Math.pow(ex, 1.6));
  }
  function placeCam(tau, dt, ex = 0) {
    const S = portrait ? POSE.port : POSE.land;
    const k = sstep(0.0, 0.5, tau), ke = k * k * (3 - 2 * k);
    poseQ(S.A, qA); poseQ(S.B, qB);
    camera.quaternion.slerpQuaternions(qA, qB, ke);
    // đường đi: vòng cung (không đi thẳng — máy hạ dần về phía nam rồi nghiêng)
    const pa = vA.fromArray(S.A.p), pb = vB.fromArray(S.B.p);
    camera.position.set(lerp(pa.x, pb.x, ke), lerp(pa.y, pb.y, Math.pow(ke, 0.8)), lerp(pa.z, pb.z, ke));
    if (ex > 0) exitCam(ex);
    const fov = fovFit(lerp(S.A.fov, S.B.fov, ke));
    if (Math.abs(camera.fov - fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix(); }
    // (30/9, Mike: "tilt màn hình chỉ ở trang home thôi, còn ở các section thì bỏ tilt hết") — BỎ máy lượn theo chuột ở chương này;
    // máy chỉ đi theo đường của chương, nhịp thở lúc nghỉ vẫn do app.js cộng vào.
    camera.updateMatrixWorld();
  }
  function setOffset(v) {
    offY = v;
    if (v) camera.setViewOffset(W_, H_, 0, v, W_, H_); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // NHỊP CHƯƠNG: đường cọ τ 0,2 → 0,9; tên nhà hiện theo đầu cọ; hết đường thì thẻ đầu tiên mở, rồi tự đổi một vòng (mỗi thẻ 8 s)
  const PATH_T = [0.2, 0.9];
  let pathP = 0, time = 0, uiK = 0, uiOn = false;
  // (soát p9a B6/B9) tự đổi thẻ: mỗi thẻ đứng ≥ 8 s, chỉ MỘT vòng (1 → 5 rồi về 1 và dừng); người xem đã tự chọn (rê, bấm, chạm,
  // bàn phím — kể cả chỉ Tab tới nhãn) thì thôi hẳn. (B7) đổi thẻ: thẻ cũ tắt nhanh, thẻ mới đợi WAIT rồi mới hiện + giải mã
  const CARD = { sel: -1, t: 0, prog: 0, lastInput: -1e9, doneAt: -1, hud: null, n: 0, dirty: true, user: false, autoN: 0, wait: 0 };
  const HOLD = 8, AUTO_MAX = 5, WAIT = 0.16;
  const userPick = (i) => { CARD.user = true; CARD.lastInput = performance.now(); select(i); };
  const scr = (v, out = [0, 0]) => { vA.copy(v).project(camera); out[0] = (vA.x * 0.5 + 0.5) * W_; out[1] = (-vA.y * 0.5 + 0.5) * H_; return out; };
  // tauPath (tuỳ chọn): nhịp riêng cho đường cọ — lúc lùi khỏi chương (app.js tua máy về đầu chương) máy và đường cọ tua theo hai nhịp
  let exNow = 0;
  // keep (soát p10a A1): chỉ số nhãn còn giữ sáng khi lớp chữ đã tắt — đầu chuyển cảnh 6 giữ "Open Field · 2026 —" thêm chừng 0,6 s
  // để mắt thấy nét mới đi ra từ chính công trình đang dở
  function update(dt, tau, ui = 1, tauPath = tau, ex = 0, keep = -1) {
    time += dt;
    exNow = ex > 0 && EXIT ? ex : 0;
    placeCam(tau, dt, exNow);
    if (exitMesh) { const d = exitDraw(exNow); exitMat.uniforms.uP.value = d; exitMesh.visible = d > 0; }
    pathP = 4 * cl01((tauPath - PATH_T[0]) / (PATH_T[1] - PATH_T[0]));
    pathMat.uniforms.uP.value = pathP;
    spillU.uSpillP.value = pathP / 4;
    // lớp chữ: chỉ khi đang đứng hẳn trong chương (app.js đưa ui)
    uiK = ui;
    if (ui > 0.5 !== uiOn) { uiOn = ui > 0.5; UI.show(uiOn); if (!uiOn) closeCard(true); }
    UI.keep(uiOn ? -1 : keep);
    if (uiOn) {
      const now = performance.now();
      if (pathP >= 4 && CARD.doneAt < 0) CARD.doneAt = now;
      if (pathP < 4) CARD.doneAt = -1;
      // rê chuột: nhà gần con trỏ nhất (≤ 70 px), đứng 100 ms thì mở
      if (PTR.on && now - PTR.t > 100) { const i = pickAt(PTR.x, PTR.y, 70); if (i >= 0 && i !== CARD.sel && labelShown(i)) userPick(i); }
      if (CARD.sel < 0 && CARD.doneAt > 0 && now - CARD.doneAt > 800) select(0);
      else if (CARD.sel >= 0 && !CARD.user && CARD.autoN < AUTO_MAX && CARD.t > HOLD && pathP >= 4) { CARD.autoN++; select((CARD.sel + 1) % 5); }
      if (CARD.sel >= 0) {
        CARD.t += dt;
        if (CARD.wait > 0) CARD.wait = Math.max(0, CARD.wait - dt);
        else CARD.prog = Math.min(CARD.n + 1, CARD.prog + dt * (CARD.n / 1.5));
        hudMat.uniforms.uP.value = CARD.prog;
      }
    }
    UI.frame();
  }
  // nhà nào đang ở gần điểm (x, y) trên màn — đoạn thẳng từ chân tới nóc (px)
  function pickAt(x, y, rad) {
    let best = -1, bd = rad;
    const a = [0, 0], b = [0, 0];
    WORKS.forEach((w, i) => {
      const B = BLD[w.id]; if (!B) return;
      scr(B.top, a); scr(B.foot, b);
      const ux = b[0] - a[0], uy = b[1] - a[1], L2 = ux * ux + uy * uy || 1, t = cl01(((x - a[0]) * ux + (y - a[1]) * uy) / L2);
      const d = Math.hypot(x - (a[0] + ux * t), y - (a[1] + uy * t));
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  const labelShown = (i) => pathP >= (i === 0 ? 0.001 : i);
  const PTR = { on: false, x: 0, y: 0, t: 0 };
  function setPointer(x, y) { if (Math.abs(x - PTR.x) + Math.abs(y - PTR.y) > 2) PTR.t = performance.now(); PTR.on = true; PTR.x = x; PTR.y = y; }
  function clearPointer() { PTR.on = false; }

  // ── THẺ: mở một nhà — nét hình vẽ vẽ dần bằng cọ (1,5 s), chữ giải mã ─────────────────────────────
  function select(i) {
    if (i === CARD.sel || !st.built) return;
    const swap = CARD.sel >= 0;
    closeCard(false);
    CARD.sel = i; CARD.t = 0; CARD.prog = 0; CARD.wait = swap ? WAIT : 0;
    if (CARD.dirty) layoutCards();
    const hd = UI.hud[i];
    if (!hd) return;
    CARD.hud = hd.mesh; CARD.n = hd.n;
    hudRig.add(hd.mesh);
    hudMat.uniforms.uP.value = 0;
    UI.open(i, swap ? WAIT : 0);
    // khe chữ: ô của từng số đo (đo trên chính phần tử chữ, kể cả chữ xoay)
    const KO = hudMat.uniforms.uKo.value, rs = UI.numRects(i);
    KO.forEach((v, k) => { const r = rs[k]; if (r) v.set(r.left + r.width / 2, r.top + r.height / 2, r.width / 2 + 3, r.height / 2 + 1); else v.set(-1e4, -1e4, 0, 0); });
  }
  function closeCard(hard) {
    if (CARD.hud) { hudRig.remove(CARD.hud); CARD.hud = null; }
    if (CARD.sel >= 0) UI.close(CARD.sel);
    CARD.sel = -1;
    if (hard) { CARD.doneAt = -1; CARD.autoN = 0; }
  }
  // điểm ảnh → toạ độ trên mặt phẳng cách máy quay 1 đv (toạ độ máy quay), có tính độ lệch ống kính (khổ dọc)
  function pxToCam(x, y) {
    const hh = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), k = 2 * hh / H_;
    return new THREE.Vector3((x - W_ / 2) * k, -((y + offY) - H_ / 2) * k, -1);
  }
  function hudFor(d, rect) {
    const F = flatten(d), [bx0, by0, bx1, by1] = d.box;
    const s = Math.min(rect.width / (bx1 - bx0), rect.height / (by1 - by0));
    const ox = rect.left + (rect.width - (bx1 - bx0) * s) / 2, oy = rect.top + (rect.height - (by1 - by0) * s) / 2;
    const X = (x) => ox + (x - bx0) * s, Y = (y) => oy + (by1 - by0) * s - (y - by0) * s;
    const pxK = 2 * Math.tan(THREE.MathUtils.degToRad(fovFit(POSE[portrait ? 'port' : 'land'].B.fov)) / 2) / H_;
    const strokes = F.polys.map((p, i) => ({ pts: densify(p.pts.map(([x, y]) => [X(x), Y(y)]), 6).map(([x, y]) => pxToCam(x, y)), w: (p.w === 1 ? 3.4 : 1.9) * pxK, i, seed: i * 0.173 + 0.5 }));
    const mesh = new THREE.Mesh(ribbonGeo(strokes, new THREE.Vector3(0, 0, 1)), hudMat); mesh.renderOrder = 20; mesh.frustumCulled = false; mesh.name = 'viec-the-net';
    // số đo cách đường kích thước ít nhất 11 px (thẻ điện thoại vẽ nhỏ: cách theo tỉ lệ bản vẽ thì chữ đè lên nét — soát p9a)
    const nums = F.texts.map((t) => {
      if (!t.dir) return { x: X(t.p[0]), y: Y(t.p[1]), t: t.t, ang: t.ang, a: t.a, after: t.after };
      const o = Math.max(t.off * s, 11);
      return { x: X(t.base[0]) + t.dir[0] * o, y: Y(t.base[1]) - t.dir[1] * o, t: t.t, ang: t.ang, a: t.a, after: t.after };
    });
    return { mesh, n: F.polys.length, nums };
  }
  function layoutCards() {
    // (thẻ đo theo tư thế bản đồ: pxToCam dùng góc nhìn cuối, máy đã đứng ở đó khi thẻ mở)
    const S = portrait ? POSE.port : POSE.land, fov0 = camera.fov;
    camera.fov = fovFit(S.B.fov); camera.updateProjectionMatrix();
    UI.layout();
    WORKS.forEach((w, i) => {
      if (UI.hud[i]) { UI.hud[i].mesh.geometry.dispose(); }
      UI.hud[i] = hudFor(DRAW[w.id], UI.veRect(i));
      UI.setNums(i, UI.hud[i].nums);
    });
    camera.fov = fov0; camera.updateProjectionMatrix();
    CARD.dirty = false;
  }

  // ── nhãn: phía không đè lên đường cọ, nhà hay thẻ (tính ở tư thế bản đồ, không chuột) ───────────────
  function layoutLabels() {
    if (!PATH) return;
    placeCam(1, 0);
    UI.layout();
    // vùng bận là những ĐĨA TRÒN (tâm, bán kính px): đường cọ tính cả bề dày nét + quầng sáng loang (soát p9a A7: nhãn 'Snow Hall'
    // trên điện thoại nằm giữa hai nét sáng — lấy mẫu từng điểm thưa thì lọt khe), nhà tính cả mái + chân
    const busy = [], q0 = new THREE.Vector3();
    PATH.strokes.forEach((s) => {
      const pts = s.pts;
      for (let j = 0; j < pts.length; j++) {
        const a = scr(pts[j]); q0.copy(pts[j]); q0.x += s.w * 0.5; const e = scr(q0);
        const hw = Math.max(3, Math.hypot(e[0] - a[0], e[1] - a[1]));
        busy.push([a[0], a[1], hw * 1.25 + 7, 1]);
        if (j + 1 < pts.length) { const c = scr(pts[j + 1]); const d = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.ceil(d / 6); for (let k = 1; k < n; k++) busy.push([a[0] + (c[0] - a[0]) * k / n, a[1] + (c[1] - a[1]) * k / n, hw * 1.25 + 7, 1]); }
      }
    });
    Object.values(BLD).forEach((b) => { const t = scr(b.top), d = scr(b.door), f = scr(b.foot); busy.push([t[0], t[1], 8, 1], [d[0], d[1], 8, 1]); const R_ = b === BLD.w4 ? [10, 22, 36, 50] : [10, 22]; for (let a = 0; a < 6.28; a += 0.5) for (const r of R_) busy.push([f[0] + Math.cos(a) * r, f[1] + Math.sin(a) * r * 0.7, 3, 1]); });
    const card = UI.cardZone();
    const taken = [];
    const hit = (x, y, w, h, [cx, cy, r]) => { const dx = Math.max(x - cx, 0, cx - (x + w)), dy = Math.max(y - cy, 0, cy - (y + h)); return dx * dx + dy * dy < r * r; };
    WORKS.forEach((w, i) => {
      const [sx, sy] = scr(BLD[w.id].top), r = UI.labelSize(i), gx = 20, pad = portrait ? 4 : 6;
      // gần (sát nóc) trước; xa hơn (có vạch dẫn) chỉ khi chỗ gần đều bận
      const cand = { t: [sx - r.w / 2, sy - 16 - r.h], r: [sx + gx, sy - 11], l: [sx - gx - r.w, sy - 11], b: [sx - r.w / 2, sy + 26], tr: [sx + 10, sy - 14 - r.h], tl: [sx - 10 - r.w, sy - 14 - r.h],
        t2: [sx - r.w / 2, sy - 44 - r.h], tr2: [sx + 26, sy - 36 - r.h], tl2: [sx - 26 - r.w, sy - 36 - r.h], r2: [sx + 44, sy - 11], l2: [sx - 44 - r.w, sy - 11] };
      const far = { t2: 3, tr2: 3, tl2: 3, r2: 3, l2: 3 };
      const score = (k) => {
        const [x, y] = cand[k];
        if (x < (portrait ? 16 : 230) || x + r.w > W_ - (portrait ? 16 : 60) || y < (portrait ? 64 : 60)) return 1e9;
        let n = far[k] || 0; for (const c of busy) if (hit(x - pad, y - pad, r.w + 2 * pad, r.h + 2 * pad, c)) n += c[3];
        for (const t of taken) if (!(x > t[2] || x + r.w < t[0] || y > t[3] || y + r.h < t[1])) n += 50;
        if (card && !(x > card.right + 10 || x + r.w < card.left - 10 || y > card.bottom || y + r.h < card.top)) n += 100;
        return n;
      };
      let best = 't', bs = 1e10; for (const k of ['t', 'r', 'l', 'tr', 'tl', 'b', 't2', 'tr2', 'tl2', 'r2', 'l2']) { const v = score(k); if (v < bs) { bs = v; best = k; } }
      const [lx, ly] = cand[best];
      UI.setLabel(i, best, lx - sx, ly - sy);
      taken.push([lx, ly, lx + r.w, ly + r.h]);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // LỚP CHỮ HTML
  function buildUI() {
    const main = document.getElementById('main') || document.body;
    const root = document.createElement('div');
    root.id = 'viec-ui'; root.className = 'viec-ui';
    root.innerHTML = '<svg class="viec-noi" aria-hidden="true"></svg>';
    main.appendChild(root);
    const svg = root.querySelector('svg');
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); ring.setAttribute('r', '9'); ring.setAttribute('class', 'vong');
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); dot.setAttribute('r', '2'); dot.setAttribute('class', 'cham');
    const lead = document.createElementNS('http://www.w3.org/2000/svg', 'path'); lead.setAttribute('class', 'dan');
    svg.append(ring, dot, lead);
    const ticks = WORKS.map(() => { const l = document.createElementNS('http://www.w3.org/2000/svg', 'line'); svg.appendChild(l); return l; });
    const labels = WORKS.map((w, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'viec-nhan'; b.tabIndex = -1; b.dataset.i = i;
      b.innerHTML = `<b>${w.name}</b><i>${w.year}</i>`;
      b.setAttribute('aria-label', `${w.name}, ${w.type}, ${w.year}`);
      b.addEventListener('click', (e) => { e.preventDefault(); if (e.detail > 0) b.blur(); if (labelShown(i) && uiOn) userPick(i); });
      b.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch' && labelShown(i) && uiOn) userPick(i); });
      b.addEventListener('focus', () => { CARD.user = true; });   // bàn phím đang ở nhãn: thẻ không tự đổi khỏi nhãn ấy (B9)
      root.appendChild(b);
      return { el: b, side: 't', dx: 0, dy: 0, w: 0, h: 0 };
    });
    const cards = WORKS.map((w, i) => {
      const a = document.createElement('article');
      a.className = 'viec-the'; a.setAttribute('aria-labelledby', `viec-the-${i}`);
      a.innerHTML = `<div class="so">${String(i + 1).padStart(2, '0')} / 05</div><h3 id="viec-the-${i}">${w.name}</h3><p class="meta">${w.type} · ${w.year}</p><div class="ve" aria-hidden="true"></div><p class="dong">${w.line}</p>`;
      root.appendChild(a);
      const h3 = a.querySelector('h3'), meta = a.querySelector('.meta'), dong = a.querySelector('.dong'), so = a.querySelector('.so');
      for (const e of [h3, meta, dong, so]) prepare(e);
      return { el: a, h3, meta, dong, so, ve: a.querySelector('.ve'), nums: [] };
    });
    const numLayer = document.createElement('div'); numLayer.className = 'viec-so-lop'; numLayer.setAttribute('aria-hidden', 'true'); root.appendChild(numLayer);
    const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let open = -1, giu = -1, moOn = false;
    const U = {
      hud: [],
      keep(i) { if (i === giu) return; giu = i; root.classList.toggle('mo', moOn || giu >= 0); },
      show(on) {
        moOn = on;
        root.classList.toggle('mo', on || giu >= 0);
        labels.forEach((l) => { l.el.tabIndex = on ? 0 : -1; });
        if (!on) document.documentElement.classList.remove('viec-mothe');
      },
      layout() {
        // thẻ: cột phải (máy tính) · trên khối tiêu đề (điện thoại). Đo xong mới đặt nét hình vẽ theo ô .ve
        const mob = portrait;
        const head = document.getElementById('ch-viec-h');
        cards.forEach((c) => {
          c.el.style.width = mob ? `${W_ - 50}px` : '344px';
          c.el.style.left = mob ? '25px' : `${W_ - 64 - 344}px`;
          c.ve.style.height = mob ? '118px' : (c === cards[3] ? '214px' : '196px');
          c.el.style.top = mob ? '0px' : '118px';
        });
        if (mob) {
          document.documentElement.classList.add('viec-mothe-do');
          const ht = head ? head.getBoundingClientRect().top : H_ - 120;
          cards.forEach((c) => { const h = c.el.getBoundingClientRect().height; c.el.style.top = `${Math.round(ht - h - 22)}px`; });
          document.documentElement.classList.remove('viec-mothe-do');
        }
        labels.forEach((l) => { const r = l.el.getBoundingClientRect(); l.w = r.width; l.h = r.height; });
      },
      veRect(i) { return cards[i].ve.getBoundingClientRect(); },
      labelSize(i) { return { w: labels[i].w, h: labels[i].h }; },
      cardZone() { const r = cards[3].el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; },
      setLabel(i, side, dx, dy) { const l = labels[i]; l.side = side; l.dx = dx; l.dy = dy; l.el.dataset.phia = side; },
      setNums(i, nums) {
        const c = cards[i];
        for (const n of c.nums) n.el.remove();
        c.nums = nums.map((n) => {
          const e = document.createElement('span');
          e.className = 'viec-so' + (n.a === 'start' ? ' dau' : ''); e.textContent = n.t;
          e.style.left = `${n.x}px`; e.style.top = `${n.y}px`;
          if (Math.abs(n.ang) > 0.01) e.style.transform = `translate(${n.a === 'start' ? '0' : '-50%'}, -50%) rotate(${(-n.ang * 180 / Math.PI).toFixed(1)}deg)`;
          numLayer.appendChild(e);
          return { el: e, after: n.after, on: false };
        });
      },
      cardsReady() { CARD.dirty = true; },
      open(i, wait = 0) {
        open = i;
        const c = cards[i];
        // (B7) đổi thẻ: thẻ mới chờ thẻ cũ tắt hẳn (CSS .viec-the tắt 0,12 s) rồi mới hiện — chữ cũ và mới không đè nhau
        c.el.style.transitionDelay = wait ? `${wait}s` : '';
        c.el.classList.add('mo');
        document.documentElement.classList.add('viec-mothe');
        labels.forEach((l, k) => l.el.classList.toggle('on', k === i));
        const o = { noScramble: REDUCED };
        decode(c.so, { delay: wait, show: 0.35, scramble: 0.5, ...o });
        decode(c.h3, { delay: wait + 0.05, show: 0.5, scramble: 0.8, ...o });
        decode(c.meta, { delay: wait + 0.15, show: 0.5, scramble: 0.8, ...o });
        decode(c.dong, { delay: wait + 0.35, show: 0.7, scramble: 1.0, ...o });
      },
      close(i) {
        const c = cards[i];
        c.el.style.transitionDelay = '';
        c.el.classList.remove('mo');
        for (const n of c.nums) { n.on = false; n.el.classList.remove('mo'); }
        labels.forEach((l) => l.el.classList.remove('on'));
        open = -1;
      },
      // mỗi khung: đặt nhãn theo máy quay, đường dẫn, số đo theo tiến độ nét
      frame() {
        const on = uiOn;
        const p = [0, 0];
        labels.forEach((l, i) => {
          const vis = ((on && labelShown(i)) || i === giu) && BLD[WORKS[i].id];
          const fresh = vis && i > 0 && pathP - i < 0.7;
          if (l.vis !== vis) { l.vis = vis; l.el.classList.toggle('hien', !!vis); }
          if (l.fresh !== fresh) { l.fresh = fresh; l.el.classList.toggle('moi', !!fresh); }
          if (!vis) { if (ticks[i].style.display !== 'none') ticks[i].style.display = 'none'; return; }
          scr(BLD[WORKS[i].id].top, p);
          const x = Math.round((p[0] + l.dx) * 2) / 2, y = Math.round((p[1] + l.dy) * 2) / 2;
          l.pos = [x, y];
          const tr = `translate(${x}px, ${y}px)`;
          if (l.tr !== tr) { l.tr = tr; l.el.style.transform = tr; }
          const t = ticks[i]; t.style.display = '';
          const s = l.side;
          if (s === 't') { t.setAttribute('x1', p[0]); t.setAttribute('y1', p[1] - 4); t.setAttribute('x2', p[0]); t.setAttribute('y2', p[1] - 13); }
          else if (s === 'b') { t.setAttribute('x1', p[0]); t.setAttribute('y1', p[1] + 6); t.setAttribute('x2', p[0]); t.setAttribute('y2', p[1] + 22); }
          else if (s === 'r' || s === 'l') { const g = s === 'r' ? 1 : -1; t.setAttribute('x1', p[0] + 4 * g); t.setAttribute('y1', p[1]); t.setAttribute('x2', p[0] + 15 * g); t.setAttribute('y2', p[1]); }
          else if (s === 'tr' || s === 'tl') { t.setAttribute('x1', p[0]); t.setAttribute('y1', p[1] - 4); t.setAttribute('x2', x + (s === 'tr' ? 2 : l.w - 2)); t.setAttribute('y2', y + l.h - 2); }
          else {
            // nhãn đặt xa (chỗ gần bận): vạch dẫn từ nóc tới điểm gần nhất của ô nhãn
            const qx = Math.max(x, Math.min(p[0], x + l.w)), qy = Math.max(y, Math.min(p[1], y + l.h)), L = Math.hypot(qx - p[0], qy - p[1]) || 1;
            t.setAttribute('x1', p[0] + (qx - p[0]) * 4 / L); t.setAttribute('y1', p[1] + (qy - p[1]) * 4 / L); t.setAttribute('x2', qx - (qx - p[0]) * 3 / L); t.setAttribute('y2', qy - (qy - p[1]) * 3 / L);
          }
        });
        if (on && open >= 0 && BLD[WORKS[open].id]) {
          scr(BLD[WORKS[open].id].top, p);
          ring.setAttribute('cx', p[0]); ring.setAttribute('cy', p[1]); dot.setAttribute('cx', p[0]); dot.setAttribute('cy', p[1]);
          const c = cards[open], h3 = c.h3.getBoundingClientRect();
          // (soát p9a A6/B8) đường dẫn không được gạch ngang tên nhà khác: thử vài lối, lấy lối đầu tiên không cắt ô nhãn nào
          const boxes = [];
          labels.forEach((l, k) => { if (k !== open && l.vis && l.pos) boxes.push([l.pos[0] - 5, l.pos[1] - 4, l.pos[0] + l.w + 5, l.pos[1] + l.h + 4]); });
          const segHit = (ax, ay, bx, by) => boxes.some(([x0, y0, x1, y1]) => {
            // Liang–Barsky: đoạn thẳng có đi qua ô chữ nhật không
            let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay;
            for (const [pp, qq] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
              if (pp === 0) { if (qq < 0) return false; } else { const r = qq / pp; if (pp < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } }
            }
            return true;
          });
          const routeHit = (P) => { for (let k = 0; k + 1 < P.length; k++) if (segHit(P[k][0], P[k][1], P[k + 1][0], P[k + 1][1])) return true; return false; };
          let route;
          if (portrait) {
            const top = c.el.getBoundingClientRect().top - 8, x0 = p[0];
            route = [[x0, p[1] + 9], [x0, top]];
            const bx = boxes.filter(([a, b0, c1, d]) => x0 >= a && x0 <= c1 && d > p[1] && b0 < top);
            if (bx.length) {
              const yj = Math.min(...bx.map((q) => q[1])) - 6;
              for (const xs of [Math.min(...bx.map((q) => q[0])) - 4, Math.max(...bx.map((q) => q[2])) + 4]) {
                const R = [[x0, p[1] + 9], [x0, yj], [xs, yj], [xs, top]];
                if (!routeHit(R) && xs > 12 && xs < W_ - 12) { route = R; break; }
              }
            }
          } else {
            const ex = h3.left - 14, ey = h3.top + h3.height / 2, sx0 = p[0] + 7.9, sy0 = p[1] - 4.3;
            const tries = [[[sx0, sy0], [ex - 36, ey], [ex, ey]], [[p[0], p[1] - 9], [p[0], ey], [ex, ey]], [[p[0] + 9, p[1]], [ex - 36, p[1]], [ex - 36, ey], [ex, ey]]];
            // thêm các lối vòng qua trên / dưới ô nhãn đang chắn
            for (const q of boxes) tries.push([[sx0, sy0], [sx0, q[1] - 6], [ex - 36, q[1] - 6], [ex - 36, ey], [ex, ey]], [[sx0, sy0], [sx0, q[3] + 6], [ex - 36, q[3] + 6], [ex - 36, ey], [ex, ey]]);
            route = tries.find((R) => !routeHit(R)) || tries[0];
          }
          lead.setAttribute('d', 'M ' + route.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L '));
          svg.classList.add('mo');
          for (const n of c.nums) { const v = CARD.prog >= n.after; if (v !== n.on) { n.on = v; n.el.classList.toggle('mo', v); } }
        } else svg.classList.remove('mo');
      },
      cardRect() { if (open < 0) return null; return cards[open].el.getBoundingClientRect(); },
      numRects(i) { return cards[i].nums.map((n) => n.el.getBoundingClientRect()); },
      cardEl() { return open >= 0 ? cards[open].el : null; },
    };
    // điện thoại: chạm một nhà / một nhãn → mở; vuốt ngang trên thẻ → nhà kế (vuốt dọc vẫn là đổi chương — page/buoc.js)
    let t0 = null;
    addEventListener('touchstart', (e) => { if (!uiOn || e.touches.length !== 1) { t0 = null; return; } const t = e.touches[0]; t0 = { x: t.clientX, y: t.clientY, at: performance.now() }; }, { passive: true });
    addEventListener('touchend', (e) => {
      if (!t0 || !uiOn) return;
      const t = e.changedTouches[0], dx = t.clientX - t0.x, dy = t.clientY - t0.y, s0 = t0; t0 = null;
      const ce = U.cardEl(), r = ce ? ce.getBoundingClientRect() : null;
      const onCard = r && s0.x >= r.left - 10 && s0.x <= r.right + 10 && s0.y >= r.top - 10 && s0.y <= r.bottom + 10;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2 && performance.now() - s0.at < 1200 && onCard) {
        const k = CARD.sel < 0 ? 0 : (CARD.sel + (dx < 0 ? 1 : 4)) % 5;
        if (labelShown(k)) userPick(k);
        return;
      }
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        const i = pickAt(t.clientX, t.clientY, 44);
        if (i >= 0 && labelShown(i)) userPick(i);
      }
    }, { passive: true });
    // chuột: bấm vào một nhà
    addEventListener('click', (e) => {
      if (!uiOn || e.pointerType === 'touch') return;
      const i = pickAt(e.clientX, e.clientY, 60);
      if (i >= 0 && labelShown(i)) userPick(i);
    });
    return U;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════
  // HÌNH GIẢ cùng kiểu dữ liệu đỉnh của từng vật liệu: dịch shader VÀ vẽ đầu trước khi cần (mỗi khung một cái — app.js)
  function warmMeshes() {
    const plain = (attrs) => { const g = new THREE.BufferGeometry(); for (const [k, n] of attrs) g.setAttribute(k, new THREE.Float32BufferAttribute(new Float32Array(3 * n), n)); return g; };
    const list = [
      [plain([['position', 3], ['normal', 3], ['color', 3], ['aK', 4]]), ground],
      [plain([['position', 3], ['normal', 3]]), treeMat, true],
      [plain([['position', 3], ['normal', 3], ['uv', 2]]), M.plaster],
      [plain([['position', 3], ['normal', 3], ['uv', 2]]), M.leaf],
      [plain([['position', 3], ['normal', 3], ['uv', 2]]), M.gravel],
      [plain([['position', 3], ['normal', 3], ['uv', 2]]), M.grass, true],
      [plain([['position', 3], ['normal', 3], ['uv', 2]]), WIN],
      [plain([['position', 3], ['aT', 1], ['aS', 1], ['aV', 1], ['aI', 1], ['aW', 1], ['aL', 1], ['aSeed', 1]]), pathMat],
      [plain([['position', 3], ['aT', 1], ['aS', 1], ['aV', 1], ['aI', 1], ['aW', 1], ['aL', 1], ['aSeed', 1]]), hudMat],
      [plain([['position', 3], ['normal', 3], ['uv', 2]]), mistMat],
      [plain([['position', 3], ['aSd', 3], ['aT', 1], ['aS', 1], ['aV', 1], ['aW', 1], ['aL', 1], ['aSeed', 1], ['aO', 1], ['aD', 1]]), planBrush],
    ];
    const out = list.map(([g, m, inst], i) => {
      let o;
      if (inst) { o = new THREE.InstancedMesh(g, m, 1); o.setMatrixAt(0, new THREE.Matrix4()); } else o = new THREE.Mesh(g, m);
      o.frustumCulled = false; o.name = 'gia-viec-' + i; return o;
    });
    const sp = new THREE.Sprite(haloMat); sp.name = 'gia-viec-quang'; out.push(sp);
    return out;
  }

  // ── BẢN VẼ QUY HOẠCH (chuyển cảnh 5): vẽ từ tư thế τ = 0, không chuột; đổi vật liệu tạm từng vật ─────────────────
  function renderPlan(rt) {
    if (!st.built || !planMesh) return;
    placeCam(0, 0);
    camera.updateMatrixWorld();
    // mét trên một điểm ảnh CSS ở mặt đất thung (máy nhìn thẳng xuống): bề ngang nét giữ đúng số điểm ảnh ở mọi khổ
    const dist = Math.max(50, camera.position.y - 2);
    planBrush.uniforms.uWs.value = (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / Math.max(1, H_);
    const cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(rt); renderer.clear(true, true, true); renderer.render(planScene, camera); renderer.setRenderTarget(null);
    renderer.setClearColor(cc, ca);
  }

  // ── nấc chất lượng (scene/nac.js): nấc 2–4 bớt cây xa (cây đã xếp gần trước) và hai lớp sương cao ─────────────
  let nacTrees = 1, nacMist = 1;
  function applyNac(treesK, mistK) {
    nacTrees = treesK; nacMist = mistK;
    if (trees) trees.count = Math.max(1, Math.round(trees.userData.nFull * treesK));
    mists.forEach((m, i) => { m.visible = i < 3 || mistK >= 1; });
  }

  return {
    scene, camera, materials: [ground, treeMat, pathMat, hudMat, mistMat, planBrush, WIN, M.gravel], st, build, warmMeshes, renderPlan, applyNac,
    update,
    get drawn() { return pathP + (CARD.sel >= 0 ? CARD.prog * 0.01 : 0) + exitDraw(exNow); },
    // (phần 9) đường nét ra khỏi bản đồ trên màn, từ đầu cọ lùi về 340 m (chỉ điểm trước ống kính), toạ độ 0…1 (y lên) — lớp hoà cảnh
    // của chuyển cảnh 6 (post/chuyen.js DuongEffect) loang cảnh mới ra từ chính nét này. Trả về số điểm (≤ 16) đã ghi vào out.
    // (Mike 30/9) máy không còn bay theo đầu cọ → đầu cọ ra khỏi khung: lấy PHẦN NÉT CÒN TRÊN MÀN (từ chấm mực lại tới mép khung, dò
    // 48 điểm dọc cả nét, giữ điểm trong khung nới 15%, rồi thưa còn ≤ 16) — cảnh mới thấm ra từ đúng phần nét người xem đang thấy
    // (soát p11a A1) thứ tự ĐẢO: điểm đầu là phía đáy màn (gần máy), điểm cuối là chấm mực lại — lớp hoà cảnh thấm từ đáy lên theo nét
    exitScreen(out) {
      if (!EXIT || exNow <= 0) return 0;
      const dTip = EXIT.L * exitDraw(exNow);
      camera.updateMatrixWorld();
      const P = [];
      for (let k = 0; k < 48; k++) {
        exitAt(dTip * (k / 47), EXV.p);
        vA.copy(EXV.p).applyMatrix4(camera.matrixWorldInverse);
        if (vA.z > -1) continue;
        EXV.p.project(camera);
        const x = EXV.p.x * 0.5 + 0.5, y = EXV.p.y * 0.5 + 0.5;
        if (x < -0.15 || x > 1.15 || y < -0.15 || y > 1.15) continue;
        P.push(x, y);
      }
      const m = P.length / 2, n = Math.min(16, m);
      for (let i = 0; i < n; i++) { const j = n > 1 ? m - 1 - Math.round(i * (m - 1) / (n - 1)) : 0; out[i * 2] = P[j * 2]; out[i * 2 + 1] = P[j * 2 + 1]; }
      return n;
    },
    get built() { return st.built; },
    setMouse() { /* 30/9: chương không còn nghiêng theo chuột — giữ hàm để app.js gọi không lỗi */ },
    setPointer, clearPointer,
    cardRect: () => (uiOn ? UI.cardRect() : null),
    // lượt nét thẻ (post hudPass): cảnh riêng chỉ có nét hình vẽ, bám đúng máy quay (gọi SAU mọi chỉnh máy của khung — thở, nghiêng)
    hudScene,
    get hudOn() { return !!CARD.hud && uiOn; },
    syncHud() {
      camera.updateMatrixWorld(); hudRig.matrix.copy(camera.matrixWorld); hudRig.matrixWorldNeedsUpdate = true;
      const pr = renderer.getPixelRatio(); hudMat.uniforms.uVP.value.set(pr, renderer.domElement.height);
    },
    select, closeCard,
    // tắt lớp chữ ngay (nhảy xa có màn đầu: cảnh chương là ảnh chụp, không qua update)
    hideUI() { UI.keep(-1); if (uiOn) { uiOn = false; UI.show(false); closeCard(true); } },
    resize(w, h) {
      W_ = w; H_ = h;
      const was = portrait;
      portrait = h > w;
      camera.aspect = w / h;
      setOffset(portrait ? POSE.port.B.off : 0);
      camera.updateProjectionMatrix();
      CARD.dirty = true;
      if (st.built) {
        const s = CARD.sel;
        closeCard(false);
        layoutLabels();
        if (s >= 0) select(s);
      }
      void was;
    },
    info() {
      const p = camera.position;
      return { cam: [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)], path: +pathP.toFixed(3), sel: CARD.sel, prog: +CARD.prog.toFixed(2), ui: uiOn, trees: trees ? trees.count : 0, nac: [nacTrees, nacMist], verts: st.verts, meshes: st.meshes, buildMs: st.buildMs, at: st.at };
    },
    // bài kiểm / chụp: toạ độ trên màn của năm nhà (nóc)
    screenOf() { return WORKS.map((w) => (BLD[w.id] ? scr(BLD[w.id].top).map(Math.round) : null)); },
    camAt(tau) { const S = portrait ? POSE.port : POSE.land, k = sstep(0, 0.5, tau), ke = k * k * (3 - 2 * k); return [lerp(S.A.p[0], S.B.p[0], ke), lerp(S.A.p[1], S.B.p[1], Math.pow(ke, 0.8)), lerp(S.A.p[2], S.B.p[2], ke)]; },
  };
}
