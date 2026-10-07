// MÀN MỞ 開幕 của Studio Kōzō (phần 2, 24/9) — mượn CÁCH igloo dựng màn mở (mục 1.3 igloo-toan-trang.md),
// không mượn đề tài: không tuyết, không hoa văn tam giác, không chữ số nhảy, không lồng lưới.
//
//   giây  dài   việc                                                        đường cong
//   0     1     màn chờ tan (chữ 250 ms, cả màn 750 ms); cảnh hiện qua lớp màu sương phẳng   cubicInOut / inOut3
//   0     2,5   NÉT KẾT CẤU 緑青 phát sáng vẽ dần từ đỉnh xuống chân (thay khung dây igloo)    power3.inOut
//   0,7   3     núi rừng xa hiện dần                                          power2.inOut
//   0,7   7,5   GỢN SÓNG 波紋: vòng mực loang lan từ chân thành ra xa trên đồi, rừng, biển mây;
//               sau vòng là cảnh thật                                          inOut1 (mực) / inOut3 (cảnh)
//   1,1   2,25  MẶT CÔNG TRÌNH hiện từ đỉnh xuống; mép hiện là quầng mực 緑青 loang, có xơ khô   power2.inOut
//   1,5   3     trời: màu phẳng → màu thật                                    power2.inOut
//   2     3     nét kết cấu tắt dần                                            inOut4
//   2     5,5   máy quay hạ từ trên cao xuống khung của phần 1 (trộn theo trọng số)   inOut1
//   2     5     độ nghiêng theo chuột mở dần                                   power2.inOut
//   2,5   2     độ loá 1,5 → 1                                                 sine.inOut
//   4,5         chữ bốn góc hiện kiểu giải mã; dấu 構 hiện sau 0,75 s
//   5           mở cọ mực (cọ to dần trong 0,8 s) + api.scrollUnlocked
//   8,2         xong — mọi nhánh màn mở TẮT HẲN (uniform uIntroOn = 0): hình trùng khít bản phần 1
import * as THREE from 'three';

export const INTRO_END = 8.2;

// ── đường cong (tên theo GSAP: powerN.inOut = mũ N+1; igloo gọi inOutN) ─────────────────────────
const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const inOut = (n) => (x) => { x = cl(x); return x < 0.5 ? 0.5 * Math.pow(2 * x, n + 1) : 1 - 0.5 * Math.pow(2 - 2 * x, n + 1); };
const cubicInOut = inOut(2), p1 = inOut(1), p2 = inOut(2), p3 = inOut(3), p4 = inOut(4);
const sineInOut = (x) => 0.5 - 0.5 * Math.cos(Math.PI * cl(x));
const p2out = (x) => 1 - Math.pow(1 - cl(x), 3);
const seg = (t, t0, d) => cl((t - t0) / d);

// trạng thái màn mở ở giây t (hàm thuần — ?t=3.2 đứng hình đúng một trạng thái)
export function introState(t) {
  return {
    t,
    loadText: 1 - cubicInOut(seg(t, 0, 0.25)),
    load: 1 - cubicInOut(seg(t, 0, 0.75)),
    mist: 1 - p3(seg(t, 0, 1.0)),
    // nét mọc NGAY từ đầu (25/9: igloo ở giây 0,47 đã có nét) rồi chậm dần tới chân — ra nhanh, vào chậm
    lineCut: p2out(seg(t, 0, 2.5)),          // 0 = chưa vẽ nét nào, 1 = đã vẽ tới chân
    lineA: 1 - p4(seg(t, 2, 3)),
    ridge: p2(seg(t, 0.7, 3)),
    ringI: p1(seg(t, 0.7, 7.5)),
    ringT: p3(seg(t, 0.7, 7.5)),
    rev: p2(seg(t, 1.1, 2.25)),
    flat: 1 - p2(seg(t, 1.5, 3)),
    cam: p1(seg(t, 2, 5.5)),
    // chân các lớp núi tan vào sương khi máy còn trên cao (nhìn từ trên thấy chân dải núi); từ giây 4,5 biển mây đã phủ
    // tới các lớp núi và che chân chúng → tắt, để lượt ghi độ sâu của núi bật lại sớm (đỡ ~2,5 ms card đồ hoạ)
    ridgeLow: 1 - p2(seg(t, 2, 3.5)),
    touch: p2(seg(t, 2, 5)),
    bloom: 1.5 - 0.5 * sineInOut(seg(t, 2.5, 2)),
    corner: p2(seg(t, 3.2, 3)),             // sương hai góc: chỉ hiện khi máy đã xuống gần khung cuối
    ui: t >= 4.5,
    seal: seg(t, 5.25, 0.5),
    brush: t >= 5,
    brushK: seg(t, 5, 0.8),
    done: t >= INTRO_END,
  };
}

// ── uniform dùng chung cho mọi vật liệu có nhánh màn mở ───────────────────────────────────────
export const INTRO = {
  uIntroOn: { value: 0 },
  uRevY: { value: 1e4 },                      // mặt công trình: chỉ hiện phần CAO hơn mức này (m, thế giới)
  uRingT: { value: 1e6 },                     // bán kính phần cảnh THẬT
  uRingI: { value: 1e6 },                     // bán kính mép vòng mực (đi trước)
  uRingC: { value: new THREE.Vector2(0, 0) }, // tâm vòng: chân thành
  uMistC: { value: new THREE.Color(0xa9aba6) }, // màu sương phẳng
  uWashC: { value: new THREE.Color('#3E9A80') }, // mực 緑青 loang trong vòng (nấc 500)
  uEdgeA: { value: new THREE.Color('#1D483C') }, // lòng quầng mực (nấc 800)
  uEdgeB: { value: new THREE.Color('#8BC8B3') }, // mép ướt bắt sáng (nấc 300)
  uFlat: { value: 0 },                        // trời: 1 = màu phẳng
  uRidgeA: { value: 1 },
  uRvOct: { value: 4 },                      // độ đục các lớp núi xa
  uRidgeLow: { value: 0 },                    // chân lớp núi tan vào sương (0 = như cũ)
  uLeadC: { value: new THREE.Color(0xa9aba6) }, // màu nền phía trước vòng gợn (sương phẳng → chân trời thật)
};

// nhiễu riêng của màn mở — KHÔNG có vòng lặp (trình dịch shader của Windows trải phẳng vòng lặp → nạp lần đầu lâu)
const RV_NOISE = `
float rvH(vec3 p) { p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float rvN(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(rvH(i), rvH(i + vec3(1.0, 0.0, 0.0)), f.x), mix(rvH(i + vec3(0.0, 1.0, 0.0)), rvH(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(rvH(i + vec3(0.0, 0.0, 1.0)), rvH(i + vec3(1.0, 0.0, 1.0)), f.x), mix(rvH(i + vec3(0.0, 1.0, 1.0)), rvH(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
uniform int uRvOct;
// cùng phép cộng như bản trải tay (x·1 + 0 ở tầng đầu), nhưng vòng lặp có cận là biến → trình dịch không trải phẳng
float rvF(vec3 x) { vec4 f = vec4(1.0, 2.03, 4.07, 8.1), o = vec4(0.0, 1.7, 3.1, 5.3); float s = 0.0, a = 0.5; for (int i = 0; i < uRvOct; i++) { s += rvN(x * f[i] + o[i]) * a; a *= 0.5; } return s; }
`;
const RV_PARS = `
uniform float uIntroOn, uRevY, uRingT, uRingI;
uniform vec2 uRingC;
uniform vec3 uMistC, uWashC, uEdgeA, uEdgeB, uLeadC;
varying vec3 vRvP;
float gRvBand = 0.0, gRvLip = 0.0, gRvWash = 0.0, gRvLead = 0.0;
` + RV_NOISE;

// mặt công trình hiện TỪ ĐỈNH XUỐNG: mép răng cưa mềm (dày mỏng không đều), ngay trên mép là quầng mực loang
// có sợi xơ khô chạy dọc (hướng ngọn cọ đi), sát mép là môi mực ướt bắt sáng
const TOP_MAIN = `
if (uIntroOn > 0.5) {
  vec3 rp = vRvP;
  // nhanh: xa hẳn dưới mép thì bỏ luôn, xa hẳn trên quầng mực thì thôi (răng cưa ≤ ±1,9 m, quầng ≤ 6,6 m) — nhiễu chỉ
  // tính trong dải quanh mép đang chạy
  float e0 = rp.y - uRevY;
  if (e0 < -2.5) discard;
  if (e0 < 9.0) {
  float jag = (rvF(rp * vec3(0.30, 0.10, 0.30)) - 0.5) * 2.6 + (rvN(vec3(rp.x * 5.0, rp.y * 0.22, rp.z * 5.0)) - 0.5) * 1.1;
  float e = e0 + jag;
  if (e < 0.0) discard;
  float W = 2.4 + 4.2 * rvN(rp * 0.13 + 3.0);             // quầng dày mỏng không đều: 2,4–6,6 m
  float band = 1.0 - smoothstep(0.0, W, e);
  float fib = rvN(vec3(rp.x * 8.0, rp.y * 0.35, rp.z * 8.0)) * 0.7 + rvN(vec3(rp.x * 21.0, rp.y * 0.8, rp.z * 21.0)) * 0.3;
  // xơ khô 掠れ: càng xa mép (mực đã loang lên) càng nhiều khe sợi trống
  gRvBand = band * mix(1.0, smoothstep(0.30, 0.70, fib + band * 0.55), 0.85);
  gRvLip = pow(band, 8.0);
  }
}
`;
// cảnh quanh chân thành hiện theo VÒNG MỰC lan ra: trước vòng là sương phẳng, trong vòng là mực 緑青 loang,
// sau vòng là cảnh thật
const RING_MAIN = `
if (uIntroOn > 0.5) {
  vec3 rp = vRvP;
  // nhanh: mép vòng lệch tối đa ±12,5 m quanh bán kính — trong hẳn vòng thì là cảnh thật, ngoài hẳn thì bỏ, không tính nhiễu
  // GỢN SÓNG như nước, không phải vết mực: cảnh hiện ra TỪ SƯƠNG qua một dải mềm rộng (dải rộng dần theo bán kính),
  // đỉnh gợn chỉ sáng lên một chút. Không có màu nhấn (25/9: "nhạt và mềm như nước").
  float d0 = length(rp.xz - uRingC);
  if (d0 > uRingI + 13.0) discard;
  float LW = 14.0 + 0.4 * uRingI;
  if (d0 > uRingI - LW - 14.0) {
  float d = d0 + (rvF(vec3(rp.xz * 0.035, 1.0)) - 0.5) * 22.0 + (rvN(vec3(rp.xz * 0.4, 2.0)) - 0.5) * 3.0;
  if (d > uRingI) discard;
  gRvLead = smoothstep(uRingI - LW, uRingI, d);
  gRvWash = exp(-pow((d - (uRingI - 0.55 * LW)) / (0.16 * LW), 2.0));   // đỉnh gợn
  }
}
`;

// gắn nhánh màn mở vào một vật liệu three chuẩn (MeshStandard / MeshBasic), nối tiếp onBeforeCompile sẵn có
export function addReveal(mat, mode) {
  if (mat.userData.rv) return;
  mat.userData.rv = mode;
  const prev = mat.onBeforeCompile;
  const prevKey = Object.prototype.hasOwnProperty.call(mat, 'customProgramCacheKey') ? mat.customProgramCacheKey : null;
  const baseKey = prevKey ? () => prevKey.call(mat) : () => prev.toString();
  mat.onBeforeCompile = function (sh, r) {
    if (prev) prev.call(this, sh, r);
    Object.assign(sh.uniforms, INTRO);
    // mọi thứ của màn mở nằm trong #ifdef KOZO_INTRO: hết màn mở thì bỏ cờ → vật liệu về ĐÚNG chương trình shader của
    // phần 1 (không còn lệnh discard nào — discard làm card đồ hoạ bỏ phép loại điểm ảnh sớm theo độ sâu)
    // (bước B 25/9) MỘT chương trình cho cả màn mở lẫn khung cuối — nhánh màn mở chỉ chạy khi uIntroOn = 1. Trước đây mỗi
    // vật liệu có hai bản shader riêng (#ifdef): gấp đôi số chương trình phải dịch lúc mở trang lần đầu.
    const W = (code) => '\n' + code + '\n';
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', W('varying vec3 vRvP;') + 'void main() {')
      .replace('#include <project_vertex>', '#include <project_vertex>' + W([
        '#ifdef USE_INSTANCING',
        '  vRvP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;',
        '#else',
        '  vRvP = (modelMatrix * vec4(transformed, 1.0)).xyz;',
        '#endif',
      ].join('\n')));
    let f = sh.fragmentShader.replace('void main() {', W(RV_PARS) + 'void main() {' + W(mode === 'top' ? TOP_MAIN : RING_MAIN));
    if (mode === 'top') {
      f = f.replace('#include <color_fragment>', '#include <color_fragment>' + W('if (uIntroOn > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, mix(uEdgeB, uEdgeA, smoothstep(0.0, 0.7, gRvBand)), gRvBand * 0.92);'));
      f = f.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>' + W('if (uIntroOn > 0.5) totalEmissiveRadiance += uEdgeB * gRvLip * 0.55;'));
    } else {
      f = f.replace('#include <color_fragment>', '#include <color_fragment>' + W(''));
      f = f.replace('#include <fog_fragment>', '#include <fog_fragment>' + W('if (uIntroOn > 0.5) gl_FragColor.rgb = mix(gl_FragColor.rgb, uLeadC * (1.0 + 0.06 * gRvWash), max(gRvLead, 0.35 * gRvWash));'));
    }
    sh.fragmentShader = f;
  };
  mat.customProgramCacheKey = () => baseKey() + '|rv-' + mode;
  mat.needsUpdate = true;
  REVEAL_MATS.push(mat);
}
export const REVEAL_MATS = [];
const SPLIT_VARIANTS = false;
// bật / tắt biến thể màn mở của mọi vật liệu đã gắn nhánh hiện dần (mỗi biến thể một chương trình shader — dịch sẵn cả hai)
export function setRevealVariant(on, mode) {
  if (!SPLIT_VARIANTS) return;   // đã gộp: không còn biến thể riêng
  for (const m of REVEAL_MATS) {
    if (mode && m.userData.rv !== mode) continue;
    const has = !!(m.defines && 'KOZO_INTRO' in m.defines);
    if (has === on) continue;
    if (on) m.defines = Object.assign({}, m.defines, { KOZO_INTRO: '' });
    else { const d = Object.assign({}, m.defines); delete d.KOZO_INTRO; m.defines = d; }
    m.needsUpdate = true;
  }
}

// mã GLSL cho các shader tự viết (biển sương): cùng vòng mực, dùng biến vị trí thế giới có sẵn
export const RING_GLSL_PARS = `
uniform float uIntroOn, uRingT, uRingI;
uniform vec2 uRingC;
` + RV_NOISE;
