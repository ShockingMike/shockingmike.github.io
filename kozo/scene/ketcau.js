// LỚP NÉT KẾT CẤU 構造 — bản vẽ bút kim của kiến trúc sư đặt KHÍT lên toà thành 3D (Kōzō, ngọn cọ mực 24/9).
//
// Hiệu ứng (mục 13 bản thiết kế): toà thành đứng yên, chuột là ngọn cọ mực 緑青; TRONG LÒNG VẾT CỌ hiện ra lớp này —
// như kiến trúc sư phác lại kết cấu ngay trên công trình thật. File này chỉ dựng LỚP NÉT; bộ máy vết cọ và bước ghép
// ảnh nằm ở ink.js / castle.js (hàm mực) / post/grade.js (KetCauGhepEffect).
//
// ── GIAO DIỆN (đã chốt) ─────────────────────────────────────────────────────────────────────────────────────
//   import { createKetCau } from './ketcau.js';
//   const kc = createKetCau(getStructure(ishigaki, tenshu), { layer: 2, ramp: RAMP, glow: 1 });
//   castle.add(kc.group);            // toạ độ = toạ độ TRONG nhóm toà thành (như getStructure)
//   kc.prepare(camera);              // MỘT lần lúc nạp, sau khi máy quay đã đặt chỗ (dò hình tảng + dựng đường bao tảng ≈ 60–150 ms)
//   kc.update(dt, camera);           // mỗi khung trước khi vẽ lớp nét (bề dày nét theo điểm ảnh màn hình)
//   renderer.render(kc.group, camera) với camera.layers.set(layer), vào một khung đệm CÓ độ sâu, xoá về (0,0,0,0)
//   kc.dispose();
// Thêm (không bắt buộc): kc.stats (đếm nét) · kc.setOpacity(a) · kc.setResolution(w, h) · kc.debug (cho bài đo).
// Đường bao tảng phụ thuộc hướng nhìn: tự dựng lại khi hướng nhìn đổi > 10° hoặc đổi ống kính / khổ màn (máy nghiêng
// theo chuột ≤ 6,3° thì KHÔNG dựng lại — lệch tối đa ~1 px ở mép hông tảng).
// opts: layer (2) · ramp (RAMP của page/accent.js, khoá 50…900; dùng nấc 50–400) · glow (1) · occluders (mảng Mesh của cảnh dùng làm vật che
//       CHỈ ghi độ sâu, vd. đồi 'doi') · scale (nhân bề dày mọi nét, 1).
//
// ── ĐẦU RA cho bước ghép (Mike 24/9: "nét cần to hơn … cần glow/sáng hơn") ─────────────────────────────────
//   · MÀU THẬT của nét: gỉ đồng SÁNG (nấc 50–300), lõi sáng + QUẦNG SÁNG tự phát quang quanh mỗi nét — ghép lên nền
//     mực gỉ đồng sẫm trong lòng vết cọ thì nét nổi hẳn. Màu xuất ở dạng TUYẾN TÍNH (không gian làm việc của chuỗi
//     hậu kỳ); kc.setGlow(g) nhân thẳng vào màu — g > 1 (vd 2–3) thì vượt ngưỡng loá sáng (bloom) NẾU khung đệm của
//     lớp nét là số thực (HalfFloatType); khung đệm 8 bit thì màu bị kẹp ở 1. kc.setOutputSRGB(true) chỉ để vẽ thẳng
//     ra màn (trang thử).
//   · KÊNH ALPHA = độ phủ (lõi + quầng), đã khử răng cưa theo điểm ảnh, đã tính thứ bậc nét.
//   · Mọi nét được kéo 0,25 m về phía máy quay dọc tia nhìn (không xê dịch trên màn) — quầng không cắm vào mặt kề bên.
//   · MỌI nét GHI độ sâu (đúng độ sâu của nét, cả phần quầng) ở một lượt riêng SAU lượt màu → bước ghép so với độ
//     sâu cảnh được; lượt màu không ghi độ sâu nên hai nét cắt nhau không xoá nhau.
//   · Nét tự tắt khi mặt của nó quay lưng lại máy quay (mỗi nét mang pháp tuyến của mặt nó nằm trên). Vật che
//     chỉ-ghi-độ-sâu: mặt mái lùi vào 0,35 m (che vách/lưới cột sau diềm mái), và nền đá THẬT (tảng, lõi, gờ đỉnh —
//     dùng chung hình với cảnh) để tảng bên cạnh / lõi che đúng như mắt thấy.
//   · Mọi vật trong lớp đặt layers.set(layer) — không hiện ở lớp chính.
//
// ── NỘI DUNG (toạ độ đọc từ hình học; KHÔNG có chữ số, KHÔNG có vạch đo — Mike bỏ 24/9) ───────────────────────
//   石垣 nền đá : đường bao từng tảng như mắt thấy, MỖI MẠCH HẸP GIỮA HAI TẢNG CHỈ MỘT NÉT (khe rộng thật mới hai nét),
//                 vành gờ đỉnh 武者返し, đường dốc 扇の勾配 (nét chấm gạch, bám trên mặt đá thật).
//   Lầu         : mép vỏ tầng · khung cột kèo SAU VÁCH (0,9 m sau mặt tường — trong cửa sổ độ sâu của bước ghép):
//                 cột 柱 theo từng gian, xà 貫 theo từng hàng, 土台 chân / 桁 đỉnh. (Cột cái trong lòng tầng —
//                 frames[].columns — KHÔNG vẽ: sát góc, chồng lên cạnh góc thành bó nét đứng rối.)
//   Mái         : đường hiên (mép trên diềm, mép trong lòng hiên = đường bao dưới mắt thấy, mép dưới diềm), 降棟 bốn
//                 sống góc, 大棟 nóc, hồi 破風 / 入母屋, rui 垂木 dọc mặt mái, mè / đòn tay, rui lộ dưới lòng hiên.
//
// ── THỨ BẬC NÉT (px màn hình · lõi / quầng) ───────────────────────────────────────────────────────────────
//   chính  (mạch đá, cột đầu mút, 土台/桁, mép vỏ, hiên, sống mái, hồi)  2,2 px · nấc 50 / quầng 300 σ 2,6 px
//   phụ    (cột giữa 管柱, rui dọc mái, mép dưới diềm, mép gờ dưới)      1,4 px · nấc 100 / quầng 300 σ 1,8 px
//   mảnh   (xà 貫, mè, rui dưới hiên)                                    1,0 px · nấc 200 / quầng 400 σ 1,4 px
//   dốc    (扇の勾配, chấm gạch; giữa mặt + cạnh góc)                    1,1 px · nấc 200 / quầng 400
//
// ── CÁI NÀO LÀ TẠM (thay khi getStructure() xuất thêm) ─────────────────────────────────────────────────────────
//   TẠM-1  Mạch đá: getStructure() chỉ có hộp + nhát bạt góc, không có dáng bo của từng biến thể tảng. Lúc gắn vào
//          nhóm toà thành, lớp này tự dò nhóm 'ishigaki' (da-xep-*), đọc ĐỈNH THẬT của hình từng tảng, rồi dựng đường
//          bao tảng theo máy quay (bao lồi các đỉnh đã chiếu) và gộp mỗi khe hẹp thành một nét. Chưa dò được thì vẽ
//          vành mặt trước theo dáng siêu elip trung bình. → nên xuất stones[i].verts (hoặc số hiệu biến thể tảng).
//   TẠM-2  Dáng mái: chép công thức evenAngles / roofRings của castle.js (N 176, 7 vành + 3 vành diềm, bản lề vành
//          2). castle.js đổi dáng mái thì phải đổi theo. → nên xuất roofs[i].rings.
//   TẠM-3  Hồi 破風 / 入母屋 và nóc 大棟: đọc TIERS của castle.js + công thức buildRoof/buildHafu.
//   TẠM-4  Vành gờ đỉnh nền đá: công thức capRings của buildIshigaki (siêu elip đỉnh + 0,05 / + 0,60).
import * as THREE from 'three';
import { TIERS } from './castle.js';

const SQ = 0.22;                       // số mũ siêu elip mặt bằng (castle.js superRect)
const MSQ = 1 / SQ;
const ROOF_N = 176, ROOF_K = 7, ROOF_KSTAR = 2;   // TẠM-2

// ───────── dáng học chép từ castle.js (TẠM-2, TẠM-4) ─────────
function evenAngles(EA, EB, N) {
  const M2 = 4096, cum = [0];
  let px = EA, pz = 0;
  for (let j = 1; j <= M2; j++) {
    const ang = (j / M2) * Math.PI * 2, cx = Math.cos(ang), cz = Math.sin(ang);
    const x = EA * Math.sign(cx) * Math.pow(Math.abs(cx), SQ), z = EB * Math.sign(cz) * Math.pow(Math.abs(cz), SQ);
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
  const N = angs.length, ra = EA * 0.30, rings = [];
  for (let k = 0; k <= K; k++) {
    const t = k / K;
    const a = EA + (ra - EA) * t;
    const b = EB * (1 - t) + 0.05;
    const yBase = H * Math.pow(t, 1.85);
    const ring = [];
    for (let i = 0; i < N; i++) {
      const cx = Math.cos(angs[i]), cz = Math.sin(angs[i]);
      const fx = Math.pow(Math.abs(cx), SQ), fz = Math.pow(Math.abs(cz), SQ);
      const x = a * Math.sign(cx) * fx, z = b * Math.sign(cz) * fz;
      const cn = Math.min(1, Math.min(fx, fz) / 0.9254);
      const c3 = Math.pow(cn, 3.0), fall = Math.pow(1 - t, 2.2);
      const lift = H * 0.42 * c3 * fall;
      const push = 1 + 0.095 * c3 * fall;
      ring.push(new THREE.Vector3(x * push, yBase + lift, z * push));
    }
    rings.push(ring);
  }
  const lipOut = rings[0].map((p) => new THREE.Vector3(p.x * 1.016, p.y - 0.34, p.z * 1.016));
  const lipLow = rings[0].map((p) => new THREE.Vector3(p.x * 1.008, p.y - 1.75, p.z * 1.008));
  const soffit = rings[0].map((p) => new THREE.Vector3(p.x * 0.88, p.y - 1.95, p.z * 0.88));
  return [soffit, lipLow, lipOut].concat(rings);
}
// điểm trên siêu elip mặt bằng theo góc tham số
const sePt = (A, B, ang) => {
  const c = Math.cos(ang), s = Math.sin(ang);
  return [A * Math.sign(c) * Math.pow(Math.abs(c), SQ), B * Math.sign(s) * Math.pow(Math.abs(s), SQ)];
};
// pháp tuyến ngang (ra ngoài) của siêu elip |x/A|^m + |z/B|^m = 1 tại (x, z)
const seNrm = (A, B, x, z) => {
  const gx = Math.sign(x) * Math.pow(Math.abs(x / A), MSQ - 1) / A, gz = Math.sign(z) * Math.pow(Math.abs(z / B), MSQ - 1) / B;
  const l = Math.hypot(gx, gz) || 1;
  return [gx / l, 0, gz / l];
};

// ───────── vector nhỏ (mảng [x, y, z]) ─────────
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const nrmz = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const V = (v) => [v.x, v.y, v.z];

// ───────── bộ gom đoạn thẳng của một bậc nét ─────────
class Segs {
  constructor() { this.A = []; this.B = []; this.N = []; this.D = []; this.W = []; this.tag = []; this.n = 0; }
  // a, b: đầu mút · nr: pháp tuyến mặt nét nằm trên (0 = không xét quay lưng) · w: nhân bề dày · d0: quãng dài
  // tích luỹ ở đầu a (cho nét chấm gạch) · tag: nhãn cho bài đo
  seg(a, b, nr, w = 1, d0 = 0, tag = 0) {
    this.A.push(a[0], a[1], a[2]); this.B.push(b[0], b[1], b[2]);
    const n = nr || [0, 0, 0];
    this.N.push(n[0], n[1], n[2]);
    this.D.push(d0, d0 + len(sub(b, a)));
    this.W.push(w); this.tag.push(tag); this.n++;
    return d0 + len(sub(b, a));
  }
  // đường gấp khúc; nr là mảng pháp tuyến theo đỉnh, một pháp tuyến chung, hoặc hàm (i) → pháp tuyến
  poly(pts, nr, closed = false, w = 1, tag = 0) {
    let d = 0;
    const m = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < m; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const n = typeof nr === 'function' ? nr(i) : Array.isArray(nr) && Array.isArray(nr[0]) ? nrmz(add(nr[i], nr[(i + 1) % nr.length])) : nr;
      d = this.seg(a, b, n, w, d, tag);
    }
  }
}

// ───────── vật liệu nét: dải tứ giác theo điểm ảnh màn hình — LÕI SÁNG + QUẦNG SÁNG ─────────
// Mỗi đoạn là một dải tứ giác nở ra quanh nét đúng bấy nhiêu điểm ảnh màn hình (không mảnh đi khi ở xa). Trong
// dải: lõi nét khử răng cưa theo bề ngang (mút tròn → chỗ nối gấp khúc liền), ngoài lõi là quầng sáng tắt dần
// theo hàm mũ — nét tự PHÁT QUANG, không phụ thuộc hậu kỳ. uGlow nhân thẳng vào màu (tuyến tính): > 1 thì vượt
// ngưỡng lớp loá sáng (bloom) nếu khung đệm là số thực (HalfFloat).
const LINE_VS = /* glsl */`
attribute vec3 aA;
attribute vec3 aB;
attribute vec3 aN;
attribute vec2 aD;
attribute float aW;
uniform vec2 uRes;
uniform float uWidth, uHaloR, uPull;
uniform vec2 uFace;
varying vec3 vLW;
varying float vHalf, vLen, vDist, vFace;
void main() {
  // kéo nét về phía máy quay dọc TIA NHÌN (không xê dịch trên màn): quầng sáng rộng không cắm vào mặt đá/mái kề bên
  // (cắm vào thì mép quầng răng cưa theo lưới tam giác của vật che)
  vec4 wA = modelMatrix * vec4(aA, 1.0), wB = modelMatrix * vec4(aB, 1.0);
  wA.xyz += normalize(cameraPosition - wA.xyz) * uPull;
  wB.xyz += normalize(cameraPosition - wB.xyz) * uPull;
  vec4 cA = projectionMatrix * viewMatrix * wA;
  vec4 cB = projectionMatrix * viewMatrix * wB;
  vec2 hr = 0.5 * uRes;
  vec2 sA = cA.xy / cA.w * hr, sB = cB.xy / cB.w * hr;
  vec2 d = sB - sA;
  float L = length(d);
  vec2 dir = L > 1e-4 ? d / L : vec2(1.0, 0.0);
  vec2 nr = vec2(-dir.y, dir.x);
  float hw = 0.5 * uWidth * aW;
  float ext = hw + 3.0 * uHaloR + 1.0;           // lõi + quầng (3σ) + 1 px khử răng cưa
  float isB = position.y;
  vec4 c = mix(cA, cB, isB);
  c.xy += (nr * position.x * ext + dir * mix(-ext, ext, isB)) / hr * c.w;
  gl_Position = c;
  // nội suy TUYẾN TÍNH THEO MÀN (không phối cảnh): gửi giá trị × w cùng w rồi chia lại ở mảnh
  vLW = vec3(position.x * ext * c.w, mix(-ext, L + ext, isB) * c.w, c.w);
  vHalf = hw; vLen = L;
  vDist = mix(aD.x, aD.y, isB);
  float nl = length(aN);
  vec3 mid = (modelMatrix * vec4(0.5 * (aA + aB), 1.0)).xyz;
  vec3 nW = normalize(mat3(modelMatrix) * (nl > 1e-3 ? aN : vec3(0.0, 1.0, 0.0)));
  vFace = nl > 1e-3 ? smoothstep(uFace.x, uFace.y, dot(nW, normalize(cameraPosition - mid))) : 1.0;
}`;
const LINE_FS = /* glsl */`
uniform vec3 uColor, uHalo;
uniform float uAlpha, uHaloR, uHaloA, uGlow, uSRGB;
uniform vec4 uDash;
varying vec3 vLW;
varying float vHalf, vLen, vDist, vFace;
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
  float across = vLW.x / vLW.z, along = vLW.y / vLW.z;
  // khoảng cách (px) tới đoạn thẳng — mút tròn
  float da = max(max(-along, along - vLen), 0.0);
  float dist = length(vec2(da, across));
  float core = clamp(vHalf + 0.5 - dist, 0.0, 1.0);
  float o = max(dist - vHalf, 0.0);
  float halo = uHaloR > 0.0 ? exp(-0.5 * o * o / (uHaloR * uHaloR)) : 0.0;
  float on = 1.0;
  if (uDash.x > 0.0) {
    float P = uDash.x + uDash.y + uDash.z + uDash.w;
    float t = mod(vDist, P), fw = max(fwidth(vDist), 1e-4) * 0.5;
    float on1 = smoothstep(-fw, fw, t) * (1.0 - smoothstep(uDash.x - fw, uDash.x + fw, t));
    float s2 = uDash.x + uDash.y;
    float on2 = uDash.z > 0.0 ? smoothstep(s2 - fw, s2 + fw, t) * (1.0 - smoothstep(s2 + uDash.z - fw, s2 + uDash.z + fw, t)) : 0.0;
    on = max(on1, on2);
  }
  float k = uAlpha * vFace * on;
  float aC = core * k;
  float aH = halo * uHaloA * k * (1.0 - aC);
  float a = aC + aH;
  if (a < 0.004) discard;
  vec3 col = (uColor * aC + uHalo * aH) / a * uGlow;
  gl_FragColor = vec4(uSRGB > 0.5 ? toSRGB(col) : col, a);
}`;

// nấc màu → tuyến tính (không gian làm việc của chuỗi hậu kỳ); trang thử đổi sang sRGB bằng setOutputSRGB(true)
const linColor = (hex) => new THREE.Color(hex);
const DEF_RAMP = { 50: '#EDF9F4', 100: '#D7EEE5', 200: '#B2DDCD', 300: '#8BC8B3', 400: '#62B198' };

function lineMesh(S, st, layer, uRes, out) {
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0], 3));
  g.setIndex([0, 1, 2, 2, 1, 3]);
  g.setAttribute('aA', new THREE.InstancedBufferAttribute(new Float32Array(S.A), 3));
  g.setAttribute('aB', new THREE.InstancedBufferAttribute(new Float32Array(S.B), 3));
  g.setAttribute('aN', new THREE.InstancedBufferAttribute(new Float32Array(S.N), 3));
  g.setAttribute('aD', new THREE.InstancedBufferAttribute(new Float32Array(S.D), 2));
  g.setAttribute('aW', new THREE.InstancedBufferAttribute(new Float32Array(S.W), 1));
  g.instanceCount = S.n;
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uRes, uWidth: { value: st.width }, uColor: { value: linColor(st.color) }, uHalo: { value: linColor(st.halo) },
      uAlpha: { value: st.alpha }, uHaloR: { value: st.haloR }, uHaloA: { value: st.haloA }, uPull: { value: 0.25 },
      uGlow: out.glow, uSRGB: out.srgb,
      uDash: { value: new THREE.Vector4(...(st.dash || [0, 0, 0, 0])) }, uFace: { value: new THREE.Vector2(-0.02, 0.14) },
    },
    vertexShader: LINE_VS, fragmentShader: LINE_FS,
    // màu KHÔNG ghi độ sâu: quầng của nét này không được xoá mất nét kia chỗ hai nét cắt nhau (lỗi "nét đứt khúc")
    transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide,
  });
  m.userData.baseAlpha = st.alpha;
  const mesh = new THREE.Mesh(g, m);
  mesh.name = 'ket-cau-' + st.name;
  mesh.frustumCulled = false;
  mesh.renderOrder = st.order;
  mesh.layers.set(layer);
  // lượt SAU CÙNG: cùng hình, chỉ ghi độ sâu của nét (lõi + quầng) — bước ghép cần độ sâu thật của nét ở mọi điểm
  // ảnh có nét; vẫn thử độ sâu với vật che nên nét bị che không ghi
  const dm = m.clone();
  dm.uniforms = m.uniforms;          // dùng chung uniform (bề dày, độ mờ, phát sáng đổi một chỗ)
  dm.colorWrite = false; dm.depthWrite = true; dm.transparent = true;
  const depth = new THREE.Mesh(g, dm);
  depth.name = mesh.name + '-sau';
  depth.frustumCulled = false;
  depth.renderOrder = 50 + st.order;
  depth.layers.set(layer);
  mesh.add(depth);
  mesh.userData.depth = depth;
  return mesh;
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
export function createKetCau(api, opts = {}) {
  if (api && typeof api.getStructure === 'function') api = api.getStructure();
  const layer = opts.layer ?? 2;
  const ramp = opts.ramp || DEF_RAMP;
  const scale = opts.scale || 1;
  const group = new THREE.Group();
  group.name = 'ket-cau';
  const uRes = { value: new THREE.Vector2(window.innerWidth || 1440, window.innerHeight || 900) };

  // THỨ BẬC: khung chính sáng nhất + dày nhất + quầng rộng; phụ mảnh và dịu hơn; mảnh là nét gợi (xà, mè)
  const STYLE = {
    main: { name: 'chinh', width: 2.2 * scale, alpha: 1.0, color: ramp[50], halo: ramp[300], haloR: 2.6 * scale, haloA: 0.55, order: 3 },
    stone: { name: 'da', width: 2.2 * scale, alpha: 1.0, color: ramp[50], halo: ramp[300], haloR: 2.6 * scale, haloA: 0.55, order: 3 },
    sub: { name: 'phu', width: 1.4 * scale, alpha: 0.9, color: ramp[100], halo: ramp[300], haloR: 1.8 * scale, haloA: 0.40, order: 2 },
    fine: { name: 'manh', width: 1.0 * scale, alpha: 0.7, color: ramp[200], halo: ramp[400], haloR: 1.4 * scale, haloA: 0.30, order: 1 },
    batter: { name: 'doc', width: 1.1 * scale, alpha: 0.75, color: ramp[200], halo: ramp[400], haloR: 1.4 * scale, haloA: 0.30, order: 1, dash: [1.6, 0.4, 0.2, 0.4] },
  };
  // đầu ra dùng chung mọi vật liệu: độ phát sáng (nhân vào màu tuyến tính) + đổi sang sRGB (chỉ trang thử vẽ thẳng ra màn)
  const OUT = { glow: { value: opts.glow ?? 1 }, srgb: { value: 0 } };

  let shapes = null;    // Map chỉ-số-tảng → { verts: đỉnh THẬT của hình tảng (hệ đơn vị), front: vành mặt trước } (TẠM-1)
  let camSnap = null;   // máy quay lúc dựng đường bao tảng (đường bao phụ thuộc hướng nhìn)
  let built = null, stoneMesh = null, opacity = 1, manualRes = false;
  const invG = new THREE.Matrix4();
  const stoneM = [], stoneInv = [], stonePoly = [];
  const occ = new THREE.Group();
  occ.name = 'ket-cau-che';
  group.add(occ);
  // vật che chỉ ghi độ sâu, lùi nhẹ về sau (polygonOffset) để nét nằm TRÊN mặt vật không bị chính vật ấy che
  const occMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 4 });

  // ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  function build() {
    const S = { main: new Segs(), sub: new Segs(), fine: new Segs(), batter: new Segs() };
    const B = api.base;
    const extAt = (t) => { const k = Math.pow(1 - Math.min(1, Math.max(0, t)), B.p); return [B.top[0] + (B.bottom[0] - B.top[0]) * k, B.top[1] + (B.bottom[1] - B.top[1]) * k]; };

    // ── 石垣: ma trận từng tảng + vành mặt trước (để chiếu nét lên mặt đá); nét MẠCH ĐÁ dựng riêng ở stoneSegs() ──
    const qq = new THREE.Quaternion(), vv = new THREE.Vector3(), ss = new THREE.Vector3();
    stoneM.length = 0; stoneInv.length = 0; stonePoly.length = 0;
    api.stones.forEach((st, si) => {
      qq.set(st.q[0], st.q[1], st.q[2], st.q[3]);
      const M = new THREE.Matrix4().compose(vv.fromArray(st.c), qq, ss.fromArray(st.s));
      stoneM.push(M); stoneInv.push(M.clone().invert());
      stonePoly.push(((shapes && shapes.get(si)) || fallbackOutline(st.cuts)).front);
    });
    // chiếu một điểm (theo hướng d) lên mặt trước của tảng đá nằm ngoài cùng; không trúng tảng nào → null
    const onStone = (P0, d) => {
      let best = null, bs = -1e9;
      for (let i = 0; i < stoneM.length; i++) {
        vv.fromArray(P0).applyMatrix4(stoneInv[i]);
        // hướng d (thế giới) sang hệ tảng KHÔNG chuẩn hoá lại → s tính được là quãng THẾ GIỚI dọc d
        const e = stoneInv[i].elements;
        const dz = e[2] * d[0] + e[6] * d[1] + e[10] * d[2];
        if (Math.abs(dz) < 1e-6) continue;
        const zF = 0.49;   // mặt phẳng trước của tảng
        const s = (zF - vv.z) / dz;
        const hx = vv.x + (e[0] * d[0] + e[4] * d[1] + e[8] * d[2]) * s, hy = vv.y + (e[1] * d[0] + e[5] * d[1] + e[9] * d[2]) * s;
        if (Math.abs(hx) > 0.49 || Math.abs(hy) > 0.49 || s < -3 || s > 3) continue;
        if (!inPoly(stonePoly[i], hx, hy)) continue;
        if (s > bs) { bs = s; best = { i, s }; }
      }
      if (!best) return null;
      return add(add(P0, mul(d, best.s)), mul(api.stones[best.i].nrm, 0.03));
    };

    // ── 石垣: vành gờ đỉnh 武者返し (TẠM-4) ───────────────────────────────────────────────────
    {
      const e1 = extAt(1), H = B.H, NC = 224;
      const ringAt = (dA, y) => { const out = []; for (let i = 0; i < NC; i++) { const p = sePt(e1[0] + dA, e1[1] + dA, (i / NC) * Math.PI * 2); out.push([p[0], y, p[1]]); } return out; };
      const rOut = ringAt(0.60 + 0.02, H + 0.10), rLow = ringAt(0.05 + 0.02, H - 0.55);
      const nOf = (r) => r.map((p) => { const n = seNrm(e1[0], e1[1], p[0], p[2]); return n; });
      S.main.poly(rOut, nOf(rOut), true, 1, 2);
      S.sub.poly(rLow, nOf(rLow).map((n) => nrmz([n[0], -0.6, n[2]])), true, 1, 3);
    }

    // ── 石垣: đường dốc 扇の勾配 — bám trên mặt đá thật, nét chấm gạch ────────────────
    {
      const lines = [];
      for (const face of [0, 1, 2, 3]) lines.push({ face, f: 0 });   // giữa mỗi mặt + bốn cạnh góc — vài đường, không thành lưới
      for (const q of [0, 1, 2, 3]) lines.push({ arris: q });
      for (const L of lines) {
        const pts = [], nrs = [];
        for (let y = -0.4; y <= B.H - 0.3 + 1e-6; y += 0.25) {
          const t = y / B.H, [A, Bb] = extAt(t);
          let x, z;
          if (L.arris !== undefined) { const p = sePt(A, Bb, Math.PI / 4 + L.arris * Math.PI / 2); x = p[0]; z = p[1]; }
          else if (L.face % 2 === 0) { x = L.f * A; z = (L.face === 0 ? 1 : -1) * Bb * Math.pow(1 - Math.pow(Math.abs(L.f), MSQ), SQ); }
          else { z = L.f * Bb; x = (L.face === 1 ? 1 : -1) * A * Math.pow(1 - Math.pow(Math.abs(L.f), MSQ), SQ); }
          const n = seNrm(A, Bb, x, z);
          const P = onStone([x - n[0] * 0.6, y, z - n[2] * 0.6], n) || [x + n[0] * 0.08, y, z + n[2] * 0.08];
          pts.push(P); nrs.push(n);
        }
        S.batter.poly(pts, nrs, false, 1, 4);
      }
    }

    // ── 天守: vỏ tầng, khung cột kèo sau vách ─────────────────────────────────────────
    const tierBox = [];
    for (const F of api.frames) {
      const a = F.a, b = F.b, y0 = F.y0, y1 = F.y0 + F.h;
      tierBox.push({ a, b, y0, y1 });
      // mép vỏ: bốn cạnh đứng ở góc + chân, đỉnh từng mặt
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) S.main.seg([sx * a, y0, sz * b], [sx * a, y1, sz * b], nrmz([sx, 0, sz]), 1, 0, 10);
      const corners = [[a, b], [a, -b], [-a, -b], [-a, b]];
      for (let i = 0; i < 4; i++) {
        const p = corners[i], q = corners[(i + 1) % 4];
        const n = Math.abs(p[0] - q[0]) < 1e-6 ? [Math.sign(p[0]), 0, 0] : [0, 0, Math.sign(p[1])];
        for (const y of [y0 + 0.02, y1]) S.main.seg([p[0], y, p[1]], [q[0], y, q[1]], n, 1, 0, 11);
      }
    }
    // lưới cột 柱 / xà 貫 ngay sau mặt trong vách (mỗi tầng mỗi mặt), 土台 chân + 桁 đỉnh là nét chính
    for (const L of api.lattice) {
      const n = L.nrm, t = L.tan;
      const at = (u, y) => [n[0] * L.dIn + t[0] * u, y, n[2] * L.dIn + t[2] * u];
      // thứ bậc (tránh "mã vạch" — hàng cột đều nhau cùng một nét): cột đầu mút + 土台 / 桁 là KHUNG (nét chính),
      // cột giữa 管柱 nét phụ, xà 貫 nét mảnh
      for (let c = 0; c <= L.nCols; c++) {
        const u = -L.span / 2 + c * L.colW, end = c === 0 || c === L.nCols;
        (end ? S.main : S.sub).seg(at(u, L.y0), at(u, L.y0 + L.h), n, 1, 0, end ? 20 : 22);
      }
      for (let r = 0; r <= L.nRows; r++) {
        const y = L.y0 + r * L.rowH, edge = r === 0 || r === L.nRows;
        (edge ? S.main : S.fine).seg(at(-L.span / 2, y), at(L.span / 2, y), n, 1, 0, 21);
      }
    }
    // ── 屋根 mái ────────────────────────────────────────────────────────────────────────────────
    const roofData = [];
    for (const R of api.roofs) {
      const angs = evenAngles(R.EA, R.EB, ROOF_N);
      const rings = (R.rings || roofRings(R.EA, R.EB, R.H, ROOF_K, angs)).map((ring) => ring.map((p) => [p.x ?? p[0], (p.y ?? p[1]) + (R.rings ? 0 : R.y0), p.z ?? p[2]]));
      const K = rings.length, N = rings[0].length, KH = 3 + ROOF_KSTAR;
      roofData.push({ R, rings });
      // pháp tuyến mặt mái tại (k, i): từ hai hướng lưới
      const nAt = (k, i) => {
        const k0 = Math.max(0, k - 1), k1 = Math.min(K - 1, k + 1);
        const du = sub(rings[k][(i + 1) % N], rings[k][(i - 1 + N) % N]), dv = sub(rings[k1][i], rings[k0][i]);
        let n = nrmz(cross(dv, du));
        // quay ra NGOÀI: ở vành đỉnh (k ≥ 3) pháp tuyến phải hướng lên
        const up = nrmz(cross(sub(rings[8][i], rings[6][i]), sub(rings[7][(i + 1) % N], rings[7][(i - 1 + N) % N])));
        if (up[1] < 0) n = mul(n, -1);
        return n;
      };
      const outH = (p) => { const n = seNrm(R.EA, R.EB, p[0], p[2]); return n; };
      const ringLine = (k, S2, down, tag) => {
        const pts = rings[k].map((p) => { const h = outH(p); return [p[0] + h[0] * 0.03, p[1] + (down ? -0.03 : 0.02), p[2] + h[2] * 0.03]; });
        S2.poly(pts, (i) => { const h = outH(rings[k][i]); return nrmz([h[0], down ? -0.7 : 0.25, h[2]]); }, true, 1, tag);
      };
      ringLine(3, S.main, false, 40);    // mép hiên (mép trên diềm)
      ringLine(1, S.sub, true, 41);      // mép dưới diềm — nếp gãy diềm / lòng hiên, nhìn từ dưới ít tương phản
      ringLine(0, S.main, true, 42);     // mép trong lòng hiên — ĐƯỜNG BAO DƯỚI của mái mắt thấy (máy quay ở dưới)
      // 降棟 bốn sống góc (tâm ống sống, nổi trên mặt mái)
      for (const target of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
        let ci = 0, bd = 9;
        angs.forEach((a, i) => { const d = Math.abs(a - target); if (d < bd) { bd = d; ci = i; } });
        const pts = [], nrs = [];
        for (let k = 1; k < K; k++) { const n = nAt(Math.max(3, k), ci); pts.push(add(mul(rings[k][ci], 1.004), mul(n, 0.22))); nrs.push(n); }
        S.main.poly(pts, nrs, false, 1, 43);
      }
      // 垂木 rui dọc mặt mái (từ mép hiên lên nóc), mỗi 4 cột lưới ≈ 1,5 m
      for (let i = 0; i < N; i += 4) {
        const pts = [], nrs = [];
        for (let k = 3; k < K; k++) { const n = nAt(k, i); pts.push(add(rings[k][i], mul(n, 0.04))); nrs.push(n); }
        S.sub.poly(pts, nrs, false, 1, 44);
      }
      // mè / đòn tay ngang mặt mái
      for (const k of [5, 7, 9]) {
        const pts = rings[k].map((p, i) => add(p, mul(nAt(k, i), 0.04)));
        S.fine.poly(pts, (i) => nAt(k, i), true, 1, 45);
      }
      // rui lộ dưới lòng hiên: từ mép trong lòng hiên ra mép dưới diềm, theo bước rui thật
      {
        const per = 2 * Math.PI * Math.sqrt((R.EA * R.EA + R.EB * R.EB) / 2) * 0.92;
        const nTile = Math.max(12, Math.round(per / 0.58)), stepT = Math.max(1, Math.round(N / nTile));
        for (let i = 0; i < N; i += stepT) {
          const a = add(rings[0][i], [0, -0.03, 0]), b = add(rings[1][i], [0, -0.03, 0]);
          S.fine.seg(a, b, nrmz([0, -1, 0]), 1, 0, 46);   // mảnh: một hàng vạch ngắn dày đặc dưới hiên, để đậm là thành mã vạch
        }
      }
      // 大棟 nóc chính (TẠM-3: hộp ra × 2 + 0,5 · 0,66 · 0,8 tại H + 0,18)
      {
        const ra = R.EA * 0.30 * 0.93, hx = ra + 0.25, yc = R.y0 + R.H + 0.18, hy = 0.33 + 0.02, hz = 0.40 + 0.02;
        const P = (sx, sy, sz) => [sx * hx, yc + sy * hy, sz * hz];
        const E = [
          [[-1, -1, 1], [1, -1, 1], [0, -1, 1]], [[-1, 1, 1], [1, 1, 1], [0, 1, 1]], [[-1, -1, -1], [1, -1, -1], [0, -1, -1]], [[-1, 1, -1], [1, 1, -1], [0, 1, -1]],
          [[1, -1, 1], [1, 1, 1], [1, 0, 1]], [[1, -1, -1], [1, 1, -1], [1, 0, -1]], [[-1, -1, 1], [-1, 1, 1], [-1, 0, 1]], [[-1, -1, -1], [-1, 1, -1], [-1, 0, -1]],
          [[1, 1, -1], [1, 1, 1], [1, 1, 0]], [[1, -1, -1], [1, -1, 1], [1, -1, 0]], [[-1, 1, -1], [-1, 1, 1], [-1, 1, 0]], [[-1, -1, -1], [-1, -1, 1], [-1, -1, 0]],
        ];
        for (const [p, q, n] of E) S.main.seg(P(...p), P(...q), nrmz(n), 1, 0, 47);
      }
      // 破風 / 入母屋 hồi tam giác (TẠM-3)
      const T = TIERS[R.tier];
      if (T && T.hafu) {
        const w = T.hafu, h = T.hafu * 0.86, y = R.y0 + 0.35, z = R.EB * 0.46 + 0.6 + 0.04;
        S.main.poly([[-w, y, z], [w, y, z], [0, y + h, z]], [0, 0, 1], true, 1, 48);
      }
      if (R.tier === TIERS.length - 1) {
        const ra = R.EA * 0.30, w = R.EB * 0.80, h = R.H * 0.50, yb = R.y0 + R.H - h * 0.66;
        for (const sx of [1, -1]) {
          const x = sx > 0 ? ra * 1.02 + 0.24 + 0.04 : -ra * 1.02 - 0.04;
          S.main.poly([[x, yb, -w], [x, yb, w], [x, yb + h, 0]], [sx, 0, 0], true, 1, 48);
        }
      }
    }

    // ── dựng lưới ─────────────────────────────────────────────────────────────────────────────────
    const meshes = [];
    for (const key of Object.keys(S)) if (S[key].n) meshes.push(lineMesh(S[key], STYLE[key], layer, uRes, OUT));
    return { meshes, S, roofData, tierBox };
  }

  // ── vật che chỉ-ghi-độ-sâu: mặt mái lùi vào trong 0,35 m (che vách sau diềm, không che nét trên mặt mái) ──
  function buildOccluders(roofData) {
    for (const { rings } of roofData) {
      const K = rings.length, N = rings[0].length, NV = N + 1;
      const pos = [], idx = [];
      for (let k = 0; k < K; k++) for (let i = 0; i < NV; i++) pos.push(...rings[k][i % N]);
      for (let k = 0; k < K - 1; k++) for (let i = 0; i < N; i++) { const a = k * NV + i, b = a + 1, c = (k + 1) * NV + i + 1, d = (k + 1) * NV + i; idx.push(a, b, c, a, c, d); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      // pháp tuyến ra NGOÀI: ở vành đỉnh phải hướng lên
      const nA = g.attributes.normal, pA = g.attributes.position;
      const j = 8 * NV + Math.round(N / 4);
      const sgn = nA.getY(j) >= 0 ? 1 : -1;
      for (let v = 0; v < pA.count; v++) pA.setXYZ(v, pA.getX(v) - nA.getX(v) * 0.35 * sgn, pA.getY(v) - nA.getY(v) * 0.35 * sgn, pA.getZ(v) - nA.getZ(v) * 0.35 * sgn);
      const m = new THREE.Mesh(g, occMat);
      m.name = 'che-mai';
      m.renderOrder = -10;
      m.frustumCulled = false;
      m.layers.set(layer);
      occ.add(m);
    }
    for (const src of opts.occluders || []) occFrom(src);
  }
  // một vật che dùng CHUNG hình (và ma trận từng tảng) với vật thật của cảnh — không chép dữ liệu
  function occFrom(src) {
    const m = src.isInstancedMesh ? new THREE.InstancedMesh(src.geometry, occMat, src.count) : new THREE.Mesh(src.geometry, occMat);
    if (src.isInstancedMesh) m.instanceMatrix = src.instanceMatrix;
    m.userData.src = src;   // ma trận thế giới đồng bộ theo vật gốc mỗi khung (update)
    m.matrixAutoUpdate = false;
    m.renderOrder = -10;
    m.frustumCulled = false;
    m.layers.set(layer);
    m.name = 'che-' + (src.name || 'them');
    occ.add(m);
    return m;
  }

  const drop = (m) => { group.remove(m); m.geometry.dispose(); m.material.dispose(); if (m.userData.depth) m.userData.depth.material.dispose(); };
  function mount() {
    if (built) for (const m of built.meshes) drop(m);
    built = build();
    for (const m of built.meshes) { m.material.uniforms.uAlpha.value = m.material.userData.baseAlpha * opacity; group.add(m); }
    mountStones();
  }
  function mountStones() {
    if (stoneMesh) { drop(stoneMesh); stoneMesh = null; }
    const S = stoneSegs();
    built.S.stone = S;
    if (S.n) { stoneMesh = lineMesh(S, STYLE.stone, layer, uRes, OUT); stoneMesh.material.uniforms.uAlpha.value = STYLE.stone.alpha * opacity; group.add(stoneMesh); }
  }

  // ── MẠCH ĐÁ: đường bao THẬT của từng tảng như máy quay thấy, rồi GỘP mạch giữa hai tảng thành MỘT nét ──────
  // Tảng đá là khối lồi → đường bao nó trên màn = bao lồi của các đỉnh đã chiếu (chính xác, không đoán). Phía hông
  // quay về máy quay, bao lồi chạy tới mép sau của hông; phần hông lặn sau lõi 栗石 được cắt về đúng chỗ lặn (lõi
  // lùi ~0,78 m sau mặt đá). Hai tảng kề nhau có hai đường bao cách nhau ≤ 4,5 px (khe hẹp) → chỉ vẽ MỘT nét ở
  // giữa khe; khe rộng thật (mạch góc lộ lõi sáng) thì còn hai nét — đúng hai cạnh mắt thấy. Mọi điểm lùi 5 cm VỀ
  // PHÍA MÁY QUAY dọc tia nhìn (không xê dịch trên màn) để khỏi bị chính tảng đá (vật che) che mất.
  function stoneSegs() {
    const S = new Segs();
    const vv = new THREE.Vector3(), v4 = new THREE.Vector4();
    if (!shapes || !camSnap) {
      // chưa có máy quay / hình thật: vành mặt trước của từng tảng (bản tạm)
      api.stones.forEach((st, si) => {
        const pts = stonePoly[si].map((p) => { vv.set(p[0], p[1], p[2]).applyMatrix4(stoneM[si]); return add(V(vv), mul(st.nrm, 0.02)); });
        S.poly(pts, st.nrm, true, 1, 1000 + si);
      });
      return S;
    }
    const { VP, camL, W, H } = camSnap;
    const toScr = (P) => { v4.set(P[0], P[1], P[2], 1).applyMatrix4(VP); return [((v4.x / v4.w) * 0.5 + 0.5) * W, (1 - ((v4.y / v4.w) * 0.5 + 0.5)) * H]; };
    const polys = [];
    const mS = new THREE.Matrix4();
    api.stones.forEach((st, si) => {
      const sh = shapes.get(si), M = stoneM[si];
      if (!sh || !sh.verts) { polys.push(null); return; }
      mS.multiplyMatrices(VP, M);
      const e = mS.elements, vs = sh.verts, n = vs.length / 3;
      const sx = new Float32Array(n), sy = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        const x = vs[3 * k], y = vs[3 * k + 1], z = vs[3 * k + 2];
        const w = e[3] * x + e[7] * y + e[11] * z + e[15];
        sx[k] = (((e[0] * x + e[4] * y + e[8] * z + e[12]) / w) * 0.5 + 0.5) * W;
        sy[k] = (1 - (((e[1] * x + e[5] * y + e[9] * z + e[13]) / w) * 0.5 + 0.5)) * H;
      }
      const idx = hullIdx(sx, sy);
      const zc = Math.max(-0.45, Math.min(0.25, 0.5 - 0.78 / st.s[2]));
      const P3 = [], P2 = [];
      for (const k of idx) {
        vv.set(vs[3 * k], vs[3 * k + 1], Math.max(zc, vs[3 * k + 2])).applyMatrix4(M);
        const P = V(vv);
        P3.push(P); P2.push(toScr(P));
      }
      polys.push({ P3, P2, si });
    });
    // lấy mẫu dày dọc từng đường bao (mỗi 1,5 px) + lưới ô 6 px để tìm mẫu của tảng KHÁC gần nhất
    const PX = 1.5, R = 4.5, CELL = 6;
    const smp = [];
    const grid = new Map();
    const cam = new THREE.Vector3(...camL);
    polys.forEach((pl, pi) => {
      if (!pl) return;
      // hộp bao + chiều của đa giác trên màn (để thử "điểm nằm TRONG tảng khác")
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, ar = 0;
      const m = pl.P2.length;
      for (let i = 0; i < m; i++) {
        const a = pl.P2[i], b = pl.P2[(i + 1) % m];
        x0 = Math.min(x0, a[0]); y0 = Math.min(y0, a[1]); x1 = Math.max(x1, a[0]); y1 = Math.max(y1, a[1]);
        ar += a[0] * b[1] - b[0] * a[1];
      }
      pl.box = [x0, y0, x1, y1]; pl.sgn = ar >= 0 ? 1 : -1;
      pl.start = smp.length;
      for (let i = 0; i < m; i++) {
        const a = pl.P2[i], b = pl.P2[(i + 1) % m], A = pl.P3[i], Bq = pl.P3[(i + 1) % m];
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
        const ns = Math.max(1, Math.ceil(l / PX));
        for (let j = 0; j < ns; j++) {
          const t = j / ns;
          const P = lerp3(A, Bq, t);
          const o = { x: a[0] + dx * t, y: a[1] + dy * t, tx: l > 1e-6 ? dx / l : 1, ty: l > 1e-6 ? dy / l : 0, P, si: pl.si, pi, dep: vv.fromArray(P).distanceTo(cam) };
          smp.push(o);
        }
      }
      pl.end = smp.length;
    });
    // KHUẤT: mẫu nằm lọt trong đường bao của một tảng khác (sâu ≥ 0,75 px) mà mặt trước tảng ấy gần máy hơn → tảng
    // ấy che nó (vd. dải hông tảng bị tảng bên cạnh che). Mẫu khuất không vẽ, không dùng để gộp mạch.
    const insideBy = (pl, x, y) => {
      let md = Infinity;
      const m = pl.P2.length;
      for (let i = 0; i < m; i++) {
        const a = pl.P2[i], b = pl.P2[(i + 1) % m];
        const ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey) || 1e-9;
        const d = (pl.sgn * ((x - a[0]) * ey - (y - a[1]) * ex)) / l;   // > 0: phía trong
        if (-d < md) md = -d;
      }
      return -md;   // khoảng cách vào trong (âm = ở ngoài)
    };
    // lưới thô 32 px: mỗi ô biết những tảng nào có hộp bao chạm vào nó
    const BIG = 32, bgrid = new Map();
    for (const pl of polys) {
      if (!pl) continue;
      for (let gx = Math.floor(pl.box[0] / BIG); gx <= Math.floor(pl.box[2] / BIG); gx++) {
        for (let gy = Math.floor(pl.box[1] / BIG); gy <= Math.floor(pl.box[3] / BIG); gy++) {
          const k = gx + ',' + gy;
          if (!bgrid.has(k)) bgrid.set(k, []);
          bgrid.get(k).push(pl);
        }
      }
    }
    for (const o of smp) {
      o.hid = false;
      const d = nrmz(sub(o.P, camL));
      for (const pl of bgrid.get(Math.floor(o.x / BIG) + ',' + Math.floor(o.y / BIG)) || []) {
        if (pl.si === o.si) continue;
        const bx = pl.box;
        if (o.x < bx[0] || o.x > bx[2] || o.y < bx[1] || o.y > bx[3]) continue;
        if (insideBy(pl, o.x, o.y) < 0.75) continue;
        const st = api.stones[pl.si], n = st.nrm, dn = d[0] * n[0] + d[1] * n[1] + d[2] * n[2];
        if (Math.abs(dn) < 1e-3) continue;
        const tB = ((st.front[0] - camL[0]) * n[0] + (st.front[1] - camL[1]) * n[1] + (st.front[2] - camL[2]) * n[2]) / dn;
        if (tB > 0 && tB < o.dep - 0.02) { o.hid = true; break; }
      }
      if (o.hid) continue;
      const key = Math.floor(o.x / CELL) + ',' + Math.floor(o.y / CELL);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(o);
    }
    for (const o of smp) {
      if (o.hid) { o.st = 2; continue; }
      const cx = Math.floor(o.x / CELL), cy = Math.floor(o.y / CELL);
      let best = null, bd = R;
      for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const list = grid.get(gx + ',' + gy);
        if (!list) continue;
        for (const q of list) {
          if (q.si === o.si) continue;
          const d = Math.hypot(q.x - o.x, q.y - o.y);
          // hai mép của MỘT khe chạy song song (ngược chiều nhau): bỏ chỗ hai đường bao chỉ chạm nhau ở góc
          if (d < bd && Math.abs(q.tx * o.tx + q.ty * o.ty) > 0.6) { bd = d; best = q; }
        }
      }
      // khe hẹp: tảng có số hiệu nhỏ hơn vẽ nét GIỮA KHE (trên màn), tảng kia bỏ đoạn ấy
      o.st = best ? (o.si < best.si ? 1 : 2) : 0;
      o.mx = best ? (o.x + best.x) / 2 : o.x; o.my = best ? (o.y + best.y) / 2 : o.y;
      o.dm = best ? Math.min(o.dep, best.dep) : o.dep;
    }
    // điểm nét: đúng chỗ trên màn (giữa khe, hoặc chính mép tảng), độ sâu = mép GẦN máy hơn trong hai mép, lùi 5 cm về
    // phía máy dọc tia nhìn (không xê dịch trên màn) để khỏi bị chính tảng đá (vật che) nuốt
    const invVP = VP.clone().invert(), far = new THREE.Vector4();
    const place = (o) => {
      far.set((o.mx / W) * 2 - 1, 1 - (o.my / H) * 2, 1, 1).applyMatrix4(invVP);
      const d = nrmz([far.x / far.w - camL[0], far.y / far.w - camL[1], far.z / far.w - camL[2]]);
      return add(camL, mul(d, o.dm - 0.05));
    };
    // gom các mẫu liên tiếp được vẽ thành đường gấp khúc, rút gọn (Douglas–Peucker 0,35 px trên màn)
    for (const pl of polys) {
      if (!pl) continue;
      const st = api.stones[pl.si];
      const n = pl.end - pl.start;
      if (!n) continue;
      let k0 = 0;
      while (k0 < n && smp[pl.start + k0].st !== 2) k0++;
      const closed = k0 === n;
      if (closed) k0 = 0;
      let run = [];
      const flush = () => {
        if (run.length >= 2) {
          const keep = dpIdx(run.map((o) => [o.mx, o.my]), 0.35);
          S.poly(keep.map((i) => place(run[i])), st.nrm, false, 1, 1000 + pl.si);
        }
        run = [];
      };
      for (let c = 0; c < n; c++) {
        const o = smp[pl.start + ((k0 + c) % n)];
        if (o.st === 2) { flush(); continue; }
        run.push(o);
      }
      if (closed && run.length) run.push(run[0]);
      flush();
    }
    return S;
  }

  mount();
  buildOccluders(built.roofData);

  // ── TẠM-1: viền tảng THẬT từ hình tảng trong cảnh (khi lớp đã gắn vào nhóm toà thành) ────────────────
  let refineTried = false;
  function tryRefine() {
    refineTried = true;
    let root = group.parent, ish = null;
    while (root && !ish) { ish = root.getObjectByName('ishigaki'); root = root.parent; }
    if (!ish) return false;
    const cache = new Map(), byPos = new Map();
    const key = (x, y, z) => Math.round(x * 200) + '_' + Math.round(y * 200) + '_' + Math.round(z * 200);
    const m4b = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    ish.updateMatrixWorld(true);
    // nhóm 'ishigaki' nằm thẳng trong nhóm toà thành (ma trận đơn vị) — toạ độ ma trận tảng = toạ độ lớp này
    for (const im of ish.children) {
      if (!im.isInstancedMesh || !/^da-xep-/.test(im.name)) continue;
      if (!cache.has(im.geometry.uuid)) cache.set(im.geometry.uuid, shapeFromGeometry(im.geometry));
      const list = im.userData.matrices;
      for (let j = 0; j < im.count; j++) {
        if (list && list[j]) m4b.copy(list[j]); else im.getMatrixAt(j, m4b);
        m4b.decompose(p, q, s);
        byPos.set(key(p.x, p.y, p.z), cache.get(im.geometry.uuid));
      }
    }
    const map = new Map();
    api.stones.forEach((st, i) => { const o = byPos.get(key(st.c[0], st.c[1], st.c[2])); if (o) map.set(i, o); });
    if (!map.size) return false;
    shapes = map;
    mount();
    // nền đá thật (tảng, lõi 栗石, gờ đỉnh) làm vật che: nét hông tảng / nét mặt sau bị tảng bên cạnh, lõi che đúng như mắt thấy
    ish.traverse((o) => { if (o.isMesh && o.visible) occFrom(o); });
    return true;
  }

  // chụp máy quay để dựng đường bao tảng; chỉ dựng lại khi hướng nhìn đổi > 10° (nghiêng theo chuột tối đa 6,3° →
  // không dựng lại giữa lúc rê cọ) hoặc đổi ống kính / khổ màn (xoay dọc điện thoại)
  function snap(camera, force) {
    if (!shapes) return;
    camera.updateMatrixWorld();
    group.updateWorldMatrix(true, false);
    const inv = group.matrixWorld.clone().invert();
    const cp = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inv);
    const dir = cp.clone().sub(new THREE.Vector3(0, 20, 0)).normalize();
    const W = uRes.value.x, H = uRes.value.y;
    if (!force && camSnap) {
      const ang = Math.acos(Math.min(1, dir.dot(camSnap.dir)));
      if (ang < (10 * Math.PI) / 180 && Math.abs(camera.fov - camSnap.fov) < 0.2 && Math.abs(camera.aspect - camSnap.aspect) < 0.01 && W === camSnap.W && H === camSnap.H) return;
    }
    const VP = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(group.matrixWorld);
    camSnap = { VP, camL: [cp.x, cp.y, cp.z], W, H, dir, fov: camera.fov, aspect: camera.aspect };
    const t0 = performance.now();
    mountStones();
    kc.lastStoneMs = performance.now() - t0;
  }

  const kc = {
    group,
    get stats() {
      const out = {};
      for (const m of [...built.meshes, stoneMesh].filter(Boolean)) out[m.name] = m.geometry.instanceCount ?? (m.geometry.index ? m.geometry.index.count / 6 : 0);
      out.stoneOutline = shapes ? 'hinh-that (' + shapes.size + ' tảng)' + (camSnap ? ' · đường bao theo máy quay' : ' · vành mặt trước') : 'sieu-elip-tam';
      return out;
    },
    get debug() { return { S: built.S, api }; },
    // độ phát sáng (nhân vào màu tuyến tính; > 1 để lớp loá sáng bắt được khi khung đệm là số thực)
    setGlow(g) { OUT.glow.value = g; },
    // true: xuất màu sRGB (vẽ thẳng ra màn như trang thử); mặc định false: màu tuyến tính cho chuỗi hậu kỳ
    setOutputSRGB(on) { OUT.srgb.value = on ? 1 : 0; },
    // bề dày nét tính theo khổ này (điểm ảnh CSS); không gọi thì lấy theo cửa sổ mỗi khung
    setResolution(w, h) { manualRes = true; uRes.value.set(w, h); },
    setOpacity(a) { opacity = a; for (const m of [...built.meshes, stoneMesh].filter(Boolean)) m.material.uniforms.uAlpha.value = m.material.userData.baseAlpha * a; },
    refine: tryRefine,
    // gọi MỘT lần lúc nạp trang (sau khi máy quay đã đặt chỗ): dò hình tảng thật + dựng đường bao theo máy quay —
    // để lần rê cọ đầu tiên không phải gánh việc này (≈ 60–150 ms, đo trên máy Mike)
    prepare(camera) { if (!refineTried && group.parent) tryRefine(); if (camera) snap(camera, true); },
    update(dt, camera) {
      if (!refineTried && group.parent) tryRefine();
      if (!manualRes) uRes.value.set(window.innerWidth || uRes.value.x, window.innerHeight || uRes.value.y);
      if (camera) snap(camera, false);
      // vật che bên ngoài (vd. đồi): chép ma trận thế giới của vật gốc về hệ toạ độ của lớp này
      group.updateWorldMatrix(true, false);
      invG.copy(group.matrixWorld).invert();
      for (const m of occ.children) {
        const src = m.userData.src;
        if (!src) continue;
        m.matrix.multiplyMatrices(invG, src.matrixWorld);
        m.matrixWorldNeedsUpdate = true;
      }
      void dt; void camera;
    },
    dispose() {
      for (const m of [...built.meshes, stoneMesh].filter(Boolean)) drop(m);
      for (const m of occ.children) if (!m.userData.src) m.geometry.dispose();
      occMat.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
  return kc;
}

// ───────── viền mặt trước của một hình tảng đá (hệ đơn vị ±0,5) ─────────
// Lấy các đỉnh THẬT của hình ở nửa trước (z > 0,33): bao lồi của chúng trên mặt xy là vành mặt trước — nơi mặt
// phẳng rộng của tảng bắt đầu bo sang hông; đó là đường mép mắt thấy (khe giữa hai tảng chỉ vài cm, hông tảng bị
// tảng bên cạnh che). Mỗi đỉnh bao giữ đúng z của nó → nét nằm trên mặt tảng.
function shapeFromGeometry(g) {
  const p = g.attributes.position, pts = [];
  // đỉnh trùng nhau (đường nối của lưới) chỉ giữ một
  const seen = new Set(), vs = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const key = Math.round(x * 1e4) + '_' + Math.round(y * 1e4) + '_' + Math.round(z * 1e4);
    if (seen.has(key)) continue;
    seen.add(key); vs.push(x, y, z);
    if (z > 0.33) pts.push([x, y, z]);
  }
  return { verts: new Float32Array(vs), front: simplify(hull2(pts)) };
}
// bao lồi 2D trên màn: trả chỉ số đỉnh
function hullIdx(sx, sy) {
  const n = sx.length, ord = Array.from({ length: n }, (_, i) => i).sort((a, b) => sx[a] - sx[b] || sy[a] - sy[b]);
  const cr = (o, a, b) => (sx[a] - sx[o]) * (sy[b] - sy[o]) - (sy[a] - sy[o]) * (sx[b] - sx[o]);
  const lo = [], up = [];
  for (const i of ord) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], i) <= 1e-9) lo.pop(); lo.push(i); }
  for (let j = ord.length - 1; j >= 0; j--) { const i = ord[j]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], i) <= 1e-9) up.pop(); up.push(i); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
// Douglas–Peucker trên đường gấp khúc 2D: trả chỉ số điểm giữ lại
function dpIdx(P, eps) {
  const keep = new Uint8Array(P.length); keep[0] = 1; keep[P.length - 1] = 1;
  const st = [[0, P.length - 1]];
  while (st.length) {
    const [a, b] = st.pop();
    let md = 0, mi = -1;
    const ax = P[a][0], ay = P[a][1], dx = P[b][0] - ax, dy = P[b][1] - ay, l = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((P[i][0] - ax) * dy - (P[i][1] - ay) * dx) / l; if (d > md) { md = d; mi = i; } }
    if (md > eps && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  const out = []; for (let i = 0; i < P.length; i++) if (keep[i]) out.push(i);
  return out;
}
// dáng tạm khi chưa dò được hình thật: siêu elip trung bình (e ≈ 0,16) cắt theo các nhát bạt góc
function fallbackOutline(cuts) {
  const n = 2 / 0.16, pts = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    pts.push([0.5 * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), 0.5 * Math.sign(s) * Math.pow(Math.abs(s), 2 / n), 0.40]);
  }
  let poly = pts;
  for (const [cx, cy, d] of cuts || []) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], Bq = poly[(i + 1) % poly.length];
      const fa = A[0] * cx + A[1] * cy - d, fb = Bq[0] * cx + Bq[1] * cy - d;
      if (fa <= 0) out.push(A);
      if ((fa < 0) !== (fb < 0)) { const t = fa / (fa - fb); out.push([A[0] + (Bq[0] - A[0]) * t, A[1] + (Bq[1] - A[1]) * t, 0.40]); }
    }
    poly = out;
  }
  return { front: simplify(poly), verts: null };
}
// bao lồi 2D (chuỗi đơn điệu) trên xy, giữ z
function hull2(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 1e-9) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 1e-9) up.pop(); up.push(p); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
// bỏ đỉnh gần thẳng hàng (góc gãy < 1,2°) và đỉnh quá sát nhau — viền gọn, không đổi dáng
function simplify(poly) {
  let out = poly.slice();
  for (let pass = 0; pass < 3; pass++) {
    const keep = [];
    for (let i = 0; i < out.length; i++) {
      const a = out[(i - 1 + out.length) % out.length], b = out[i], c = out[(i + 1) % out.length];
      const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
      const lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]);
      if (lu < 1e-4) continue;
      const ang = Math.abs(Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]));
      if (ang < 0.021 && lu + lv < 0.9) continue;
      keep.push(b);
    }
    out = keep;
  }
  return out;
}
function inPoly(poly, x, y) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
