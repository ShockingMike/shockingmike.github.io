// 山 — núi Nhật là NÚI CÓ RỪNG. Thay cho mấy hình nón tam giác trắng (đọc ra núi băng).
//
// Mỗi lớp núi là một dải cong bao quanh máy quay ở một khoảng cách cố định. Sống núi tính sẵn
// bằng JS (đỉnh lưới đặt đúng theo sống núi, nên gần như không phải vẽ thừa phần trời). Tán cây
// vẽ từng cây một trong shader: mỗi cây tuyết tùng 杉 là một ngọn nhọn, cây lá rộng là một tán
// tròn; các hàng cây xếp dốc xuống sườn, cây thấp hơn đứng trước cây cao hơn. Không có ảnh nào.
// Sương 霧 đọng ở chân mỗi lớp: lớp gần in sắc lên nền sương của lớp xa — đúng ngữ pháp của
// 松林図屏風 (Hasegawa Tōhaku).
import * as THREE from 'three';
import { INTRO, RING_GLSL_PARS } from './intro.js';

function rngF(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// nhiễu giá trị một chiều, mượt bậc năm
function noise1(seed) {
  const r = rngF(seed), T = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) T[i] = r();
  return (x) => {
    const i = Math.floor(x), f = x - i;
    const u = f * f * f * (f * (f * 6 - 15) + 10);
    const a = T[((i % 1024) + 1024) % 1024], b = T[(((i + 1) % 1024) + 1024) % 1024];
    return a + (b - a) * u;
  };
}

const RIDGE_VERT = /* glsl */`
attribute float aS;
attribute float aR;
attribute float aDR;
varying vec3 vW;
varying float vS;
varying float vR;
varying float vDR;
void main() {
  vS = aS; vR = aR; vDR = aDR;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const RIDGE_FRAG = /* glsl */`
uniform vec3 uLit, uShade, uGap, uMist;
uniform float uAerial, uTreeW, uTreeH, uRowH, uSeed, uTime, uValley, uWisp, uRelief, uSunSide, uSunK, uConifer, uMistY, uLow;
uniform float uRidgeA;   // màn mở: núi xa hiện dần (1 = bình thường)
uniform float uRidgeLow; // màn mở: chân dải núi tan vào sương khi máy còn trên cao (0 = như cũ)
uniform vec3 uLeadC;     // màn mở: màu nền phía sau (sương phẳng → chân trời) — chân núi tan về đúng màu ấy
varying vec3 vW;
varying float vS;
varying float vR;
varying float vDR;

float h21(vec2 p) {
  p = fract(p * vec2(0.1031, 0.1030) + uSeed * 0.0137);
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.x * 1.37 + p.y * 0.71);
}
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = h21(i), b = h21(i + vec2(1.0, 0.0)), c = h21(i + vec2(0.0, 1.0)), d = h21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vn(p); p = p * 2.07 + 11.3; a *= 0.5; }
  return s;
}

void main() {
  float s = vS, y = vW.y;
  float R = vR;
  // SƯƠNG TÍNH TRƯỚC (bước 120 hình/giây, 25/9): dưới sống núi mà sương đã phủ kín (hệ số = 1) thì màu ra đúng bằng màu
  // sương, bất kể cây và địa hình bên dưới — trả luôn, khỏi tính rừng (lớp núi là khoản nặng nhất của cảnh). Cùng phép
  // tính, cùng kết quả: mix(x, sương, 1) = sương.
  float d = (R - y) / uRelief;
  float wisp = fbm(vec2(s * 0.010 + uTime * 0.012, y * 0.035 - uTime * 0.004));
  float valley = smoothstep(0.02, 0.95, d * uValley * 1.35 + (wisp - 0.5) * uWisp);
  float low = smoothstep(uMistY + 26.0, uMistY - 4.0, y + (wisp - 0.5) * 18.0);
  float mistK = clamp(max(valley, low * uLow), 0.0, 1.0);
  float lowFade = uRidgeLow * (1.0 - smoothstep(uMistY - 60.0, uMistY + 5.0, y));
  if (y <= R && mistK >= 1.0) { gl_FragColor = vec4(mix(uMist, uLeadC, lowFade), uRidgeA); return; }
  float cw = uTreeW;
  float ci = floor(s / cw);
  float bestY = 1.0e9, xin = 0.0, tt = 0.0, tone = 0.5, kind = 0.0, cov = 1.0;
  float aaw = max(fwidth(s), 1e-3) * 1.1;
  bool hit = false;
  for (int dx = -1; dx <= 1; dx++) {
    float c = ci + float(dx);
    float hc = h21(vec2(c, 7.0));
    float sc0 = (c + 0.15 + 0.70 * hc) * cw;
    float Rc = R + vDR * (sc0 - s);
    // ngọn nhô trên mặt tán chung một đoạn ngắn và KHÔNG ĐỀU: rừng tuyết tùng nhìn xa là một mặt
    // tán liền, lởm chởm những ngọn nhọn cao thấp — không phải một hàng tam giác cách đều
    float top = uTreeH * 0.50;
    float rf = (Rc + top + uTreeH * 0.45 - y) / uRowH;
    float r0 = floor(rf);
    for (int k = 0; k < 5; k++) {
      float r = r0 - float(k);
      if (r < 0.0) break;
      float h1 = h21(vec2(c, r));
      float h2 = h21(vec2(r, c) + 17.0);
      float h3 = h21(vec2(c + 3.0, r - 5.0));
      // rừng mọc thành CỤM: có quãng thưa, có quãng dày — không phải hàng rào cọc đều
      float clump = vn(vec2(c * 0.23 + r * 0.11, r * 0.19 + 3.0));
      if (r < 1.5 && clump < 0.34) continue;
      float sc = sc0 + (h2 - 0.5) * cw * 0.60 * step(0.5, r);
      float Rt = R + vDR * (sc - s);
      float con = step(h3, uConifer);
      float ht = uTreeH * mix(0.62, 1.0, con) * (0.62 + 0.80 * h1 * (0.6 + 0.6 * clump));
      float ya = Rt + top - r * uRowH - h2 * uRowH * 0.6 + (h1 - 0.5) * uTreeH * 0.30 * (1.0 - step(0.5, r));
      float t = (ya - y) / ht;
      if (t < 0.0 || t > 1.0) continue;
      float hw;
      if (con > 0.5) {
        // 杉: ngọn nhọn, tán THUÔN (rộng/cao ≈ 0,3), mép răng cưa theo từng tầng cành
        hw = cw * 0.62 * (0.80 + 0.45 * h2) * pow(t, 0.95);
        float tier = fract(t * (6.0 + 4.0 * h1) + h2);
        hw *= 0.78 + 0.40 * tier * smoothstep(0.03, 0.20, t);
      } else {
        // tán lá rộng: vòm tròn, mép gợn
        float tc = clamp(t * 1.3, 0.0, 1.0);
        hw = cw * 0.62 * (0.8 + 0.4 * h2) * sqrt(max(0.0, tc * (2.0 - tc)));
        hw *= 1.0 + 0.22 * (vn(vec2(y * 0.9 + h1 * 9.0, c * 2.3)) - 0.5);
      }
      // mép tán tơi: nhiễu mịn cỡ chùm lá kim, không có đường viền sắc kiểu hình vẽ phẳng
      hw *= 0.84 + 0.32 * vn(vec2(y * 3.1 + h1 * 13.0, s * 1.3));
      float dxs = s - sc;
      if (abs(dxs) < hw + aaw && ya < bestY) {
        bestY = ya; hit = true; xin = dxs / max(hw, 1e-3); tt = t; tone = h1; kind = con;
        cov = clamp((hw - abs(dxs)) / aaw + 0.5, 0.0, 1.0);
      }
    }
  }
  if (!hit && y > R) discard;
  // chỉ làm mềm ở viền trên cùng (sau lưng là trời hoặc lớp xa); bên dưới sống núi thì tán trước
  // đè tán sau, không được lộ xuyên
  float alpha = y > R ? cov : 1.0;
  if (alpha < 0.02) discard;

  // địa hình lớn: sống phụ và khe suối chạy dọc sườn, bắt nắng một bên
  vec2 tp = vec2(s / (uRelief * 1.1), y / (uRelief * 0.55));
  float e = 0.06;
  float spur = fbm(tp + vec2(e, 0.0)) - fbm(tp - vec2(e, 0.0));
  float mass = fbm(tp * 0.7 + 3.1);
  float terr = clamp(0.62 + spur * 3.2 * uSunSide + (mass - 0.5) * 0.55, 0.15, 1.2);

  vec3 col;
  if (hit) {
    float side = clamp(0.5 - 0.62 * xin * uSunSide, 0.0, 1.0);
    float lit = mix(0.5, side, uSunK);
    lit *= mix(1.0, 0.42, tt * tt);              // chân tán khuất bóng tán trên
    // tầng cành: dải sáng-tối ngang trong mỗi tán, cành trên che bóng cành dưới
    lit *= 0.82 + 0.26 * smoothstep(0.15, 0.9, fract(tt * (5.0 + 3.0 * tone) + 0.3));
    lit = clamp(lit * (0.78 + 0.44 * tone) * terr, 0.0, 1.25);
    // chùm lá kim: hai cỡ nhiễu, đặt theo mét thật nên lớp gần có hạt, lớp xa mịn thành mảng
    float nd = vn(vec2(s * 1.35, y * 1.8)) * 0.6 + vn(vec2(s * 4.1, y * 5.3) + 7.0) * 0.4;
    lit *= 0.70 + 0.55 * nd;
    col = mix(uShade, uLit, lit);
    // mép tán chồng lên tán sau: một đường sẫm mảnh — đây là thứ làm ra "rừng" chứ không phải "đồi"
    col = mix(col, uGap, smoothstep(0.80, 1.0, abs(xin)) * 0.55 * (1.0 - tt * 0.5));
  } else {
    col = mix(uGap, uShade, 0.35 + 0.4 * vn(vec2(s * 0.7, y * 0.9))) * (0.85 + 0.3 * terr);
  }

  // sương: trời xa (không đổi theo lớp) + sương đọng ở chân lớp, có vệt trôi rất chậm (đã tính ở đầu hàm)
  col = mix(col, uMist, uAerial);
  col = mix(col, uMist, mistK);
  // nhìn từ trên cao thấy cả chân dải núi (bình thường nằm khuất dưới biển mây): chân tan về MÀU NỀN phía sau (vẫn đục —
  // nhờ vậy lượt ghi độ sâu của núi bật lại sớm, đỡ ~1 ms lúc máy đang hạ), không để mép cứng
  gl_FragColor = vec4(mix(col, uLeadC, lowFade), alpha * uRidgeA);
}`;

// lớp núi rừng, gần → xa
export function buildRidgeLayers(scene, cam, look, opt) {
  const g = buildRidgeLayersSteps(scene, cam, look, opt);
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
}
// (phần 9, 30/9) cùng việc dựng, chia theo từng lớp núi (yield sau mỗi lớp) — chương 連絡 dựng ngầm từng mẩu nhỏ. Kết quả y hệt.
export function* buildRidgeLayersSteps(scene, cam, look, opt) {
  const group = new THREE.Group();
  group.name = 'nui-rung';
  const mats = [];
  const col = (hex) => new THREE.Color(hex);
  // chỉ ghi độ sâu (không tô màu); đẩy lùi một chút để lượt màu của cùng lớp núi vẫn qua phép so độ sâu
  const preMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide, fog: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 4 });
  const phiV = Math.atan2(-cam.x, -cam.z);          // hướng máy quay nhìn (góc phương vị)
  // ±54° — đủ cho mọi độ nghiêng theo chuột. (phần 9, 30/9: chương 連絡 bay tới từ một góc máy khác → opt.half rộng hơn cho
  // lớp núi phủ đủ mọi góc máy của chuyển cảnh; không đưa opt.half thì y như cũ)
  const HALF = opt.half ?? 0.95;
  const mistY = opt.mistY;
  for (let li = 0; li < look.layers.length; li++) {
    const Lr = look.layers[li];
    const { D, elev, relief, tw: treeW, th: treeH, aerial, dip, wings } = Lr;
    const dipW = Lr.dipW || 0.16;
    const baseY = cam.y + D * Math.tan((elev * Math.PI) / 180);
    const n1 = noise1(9100 + li * 131), n2 = noise1(9300 + li * 71), n3 = noise1(9500 + li * 17);
    const Ls = D * HALF * 2;
    const NC = Math.min(900, Math.max(260, Math.round(Ls / 1.2)));
    const R = new Float32Array(NC + 1);
    const S = new Float32Array(NC + 1);
    for (let k = 0; k <= NC; k++) {
      const u = k / NC;
      const s = (u - 0.5) * Ls;                    // mét dọc sống núi, dương = sang phải khung
      const f = s / (D * 0.30);
      // sống núi Nhật: nhiều gù tròn, sườn dốc; thêm một thành phần "gãy" cho sống sắc
      let h = 0;
      h += (n1(f * 1.0 + li * 3.7) - 0.5) * 1.00;
      h += (n1(f * 2.1 + 7.3) - 0.5) * 0.46;
      h += (n2(f * 4.3 + 1.1) - 0.5) * 0.22;
      h += (n3(f * 9.1 + 5.5) - 0.5) * 0.09;
      h += (1 - Math.abs(n2(f * 0.55 + 2.2) * 2 - 1)) * 0.55 - 0.3;
      // chỗ trũng sau lưng toà thành ở hai lớp gần: để thân lầu in lên nền sương chứ không lên nền rừng
      if (dip) h -= dip * Math.exp(-Math.pow(s / (D * dipW), 2));
      // lớp xa: đẩy đỉnh cao về hai bên khung, cho khung có hai "cánh gà" núi
      if (wings) h += wings * Math.min(1, Math.pow(Math.abs(s) / (D * 0.55), 2));
      R[k] = baseY + h * relief;
      S[k] = s;
    }
    const pos = [], aS = [], aR = [], aDR = [], idx = [];
    const bottom = mistY - 60;
    for (let k = 0; k <= NC; k++) {
      const phi = phiV - S[k] / D;
      const x = cam.x + Math.sin(phi) * D, z = cam.z + Math.cos(phi) * D;
      const k0 = Math.max(0, k - 1), k1 = Math.min(NC, k + 1);
      const dr = (R[k1] - R[k0]) / (S[k1] - S[k0]);
      pos.push(x, bottom, z, x, R[k] + treeH * 0.95, z);
      aS.push(S[k], S[k]); aR.push(R[k], R[k]); aDR.push(dr, dr);
    }
    for (let k = 0; k < NC; k++) {
      const a = k * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
    g.setAttribute('aR', new THREE.Float32BufferAttribute(aR, 1));
    g.setAttribute('aDR', new THREE.Float32BufferAttribute(aDR, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const m = new THREE.ShaderMaterial({
      extensions: { derivatives: true },
      vertexShader: RIDGE_VERT,
      fragmentShader: RIDGE_FRAG,
      side: THREE.DoubleSide,
      fog: false,
      transparent: true,
      depthWrite: true,
      uniforms: {
        uLit: { value: col(look.ridge.lit[li]) },
        uShade: { value: col(look.ridge.shade[li]) },
        uGap: { value: col(look.ridge.gap[li]) },
        uMist: { value: col(look.ridge.mist) },
        uAerial: { value: aerial },
        uTreeW: { value: treeW },
        uTreeH: { value: treeH },
        uRowH: { value: treeH * 0.40 },
        uSeed: { value: 11 + li * 7 },
        uTime: { value: 0 },
        uValley: { value: look.ridge.valley * Lr.valley },
        uLow: { value: Lr.low },
        uWisp: { value: look.ridge.wisp },
        uRelief: { value: relief },
        uSunSide: { value: opt.sunSide },
        uSunK: { value: opt.sunK },
        uConifer: { value: Lr.conifer ?? (li < 4 ? 0.9 : 0.7) },
        uMistY: { value: mistY },
        uRidgeA: INTRO.uRidgeA, uRidgeLow: INTRO.uRidgeLow, uLeadC: INTRO.uLeadC,
      },
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.name = 'lop-nui-' + li;
    mesh.frustumCulled = false;
    mesh.renderOrder = -50 - li;          // trong suốt: vẽ lớp XA trước, lớp gần sau
    group.add(mesh);
    mats.push(m);
    // LƯỢT GHI ĐỘ SÂU TRƯỚC (đo 24/9, săn khung giật lúc rê cọ): sáu lớp núi trong suốt vẽ chồng từ xa tới gần, mỗi
    // điểm ảnh sườn núi bị tô tới sáu lần bằng shader cây rất nặng (≈ 3,7 ms card đồ hoạ ở 1900×920 ×1,25).
    // Dưới sống núi (y ≤ R) shader luôn ra đục hẳn (alpha = 1), nên lớp gần che kín lớp xa ở đó: ghi trước độ sâu
    // của đúng phần đục ấy (hạ 0,5 m cho chắc, đẩy lùi một chút để lượt màu của chính lớp ấy vẫn qua) → card đồ hoạ
    // bỏ luôn các điểm ảnh lớp xa bị che, không tô rồi đè. Hình ra không đổi.
    const pp = [];
    for (let k = 0; k <= NC; k++) { pp.push(pos[k * 6], pos[k * 6 + 1], pos[k * 6 + 2], pos[k * 6 + 3], R[k] - 0.5, pos[k * 6 + 5]); }
    const gp = new THREE.BufferGeometry();
    gp.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    gp.setIndex(idx);
    const pre = new THREE.Mesh(gp, preMat);
    pre.name = 'lop-nui-sau-' + li;
    pre.frustumCulled = false;
    pre.renderOrder = -50 - li;
    group.add(pre);
    yield;
  }
  scene.add(group);
  return {
    group, mats,
    update(t) { for (const m of mats) m.uniforms.uTime.value = t; },
  };
}

// ───────── 雲海 biển sương: mặt sương có gợn, ôm lấy chân núi ─────────
const SEA_VERT = /* glsl */`
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const SEA_FRAG = /* glsl */`
uniform vec3 uLow, uHigh, uShade, uFog, uCam;
uniform float uTime, uDensity, uAlpha, uSunX, uSunZ, uSoft, uY, uNear;
varying vec3 vW;
${RING_GLSL_PARS}
float h21(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float vn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
void main() {
  // màn mở: ngoài hẳn vòng mực thì bỏ ngay, không tính nhiễu (mặt biển sương phủ gần kín khung khi máy ở trên cao)
  if (uIntroOn > 0.5 && length(vW.xz - uRingC) > uRingI + 12.0) discard;
  vec2 p = vW.xz * 0.012 + vec2(uTime * 0.010, uTime * 0.004);
  float b = fbm(p);
  float b2 = fbm(p * 2.7 + 5.0 + uTime * 0.006);
  // gợn cuộn: mặt sương có đỉnh bắt sáng và rãnh khuất về phía nắng
  float e = 0.35;
  float gx = fbm(p + vec2(e, 0.0)) - fbm(p - vec2(e, 0.0));
  float gz = fbm(p + vec2(0.0, e)) - fbm(p - vec2(0.0, e));
  float lit = clamp(0.55 + (gx * uSunX + gz * uSunZ) * 2.4, 0.0, 1.0);
  vec3 col = mix(uLow, uHigh, smoothstep(0.30, 0.78, b * 0.7 + b2 * 0.3));
  col = mix(col, uShade, (1.0 - lit) * 0.55);
  col = mix(col, uHigh, lit * lit * 0.30);
  float dist = length(vW.xz - uCam.xz);
  float f = 1.0 - exp(-pow(dist * uDensity, 2.0));
  col = mix(col, uFog, clamp(f, 0.0, 1.0));
  float a = uAlpha * smoothstep(0.40 - uSoft * 0.3, 0.40 + uSoft, b * 0.8 + b2 * 0.2);
  // mép sương gặp sườn đồi: tan dần theo độ dày lớp sương trên mặt đất, không cắt thành đường
  float rr = length(vec2(vW.x, vW.z * 1.08));
  float qh = max(rr - 17.0, 0.0);
  float hy = 0.9 - 32.0 * (1.0 - exp(-qh / 40.0)) - qh * 0.02;
  a *= smoothstep(0.0, 7.0, uY - hy);
  a *= mix(1.0, smoothstep(40.0, 95.0, rr), uNear);
  col *= mix(0.62, 1.0, smoothstep(34.0, 110.0, rr));
  // màn mở: vòng mực loang lan từ chân thành — trước vòng chưa có sương, trong vòng là mực 緑青 nhạt
  // gợn sóng trên biển mây: xám sương, nhạt, mép rất mềm; đỉnh gợn sáng lên một chút — không có màu nhấn.
  // Chỉ tính nhiễu trong dải quanh mép gợn (trong hẳn vòng thì là mặt sương thật) — mặt sương phủ gần kín khung từ trên cao
  float LW = 14.0 + 0.4 * uRingI;
  if (uIntroOn > 0.5 && length(vW.xz - uRingC) > uRingI - LW - 14.0) {
    float dR = length(vW.xz - uRingC) + (rvF(vec3(vW.xz * 0.035, 1.0)) - 0.5) * 22.0;
    float crest = exp(-pow((dR - (uRingI - 0.55 * LW)) / (0.16 * LW), 2.0));
    col *= 1.0 + 0.07 * crest;
    a *= 1.0 - smoothstep(uRingI - LW, uRingI, dR);
  }
  gl_FragColor = vec4(col, a);
}`;

export function buildMistSea(scene, look, cam, sunDir) {
  const group = new THREE.Group();
  group.name = 'bien-suong';
  const mk = (y, alpha, soft, size, order) => {
    const m = new THREE.ShaderMaterial({
      vertexShader: SEA_VERT, fragmentShader: SEA_FRAG,
      transparent: true, depthWrite: false, fog: false,
      uniforms: {
        uLow: { value: new THREE.Color(look.sea.low) },
        uHigh: { value: new THREE.Color(look.sea.high) },
        uShade: { value: new THREE.Color(look.sea.shade) },
        uFog: { value: new THREE.Color(look.ridge.mist) },
        uCam: { value: new THREE.Vector3(cam.x, cam.y, cam.z) },
        uTime: { value: 0 },
        uDensity: { value: look.fog.density },
        uAlpha: { value: alpha },
        uSoft: { value: soft },
        uSunX: { value: -sunDir.x },
        uSunZ: { value: -sunDir.z },
        uY: { value: y },
        uNear: { value: y > -6 ? 1 : 0 },
        uIntroOn: INTRO.uIntroOn, uRingT: INTRO.uRingT, uRingI: INTRO.uRingI, uRingC: INTRO.uRingC, uRvOct: INTRO.uRvOct,
      },
    });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), m);
    p.rotation.x = -Math.PI / 2;
    p.position.y = y;
    p.renderOrder = order;
    p.frustumCulled = false;
    group.add(p);
    return m;
  };
  const mats = [
    mk(-16, 1.0, 0.3, 6000, 4),       // tầng đáy đặc: che hết chân núi
    mk(-9.5, 0.85, 0.30, 5000, 5),    // tầng giữa, thủng lỗ chỗ — thấy ngọn cây nhô qua
    mk(-3.0, 0.55, 0.40, 3000, 6),    // làn mỏng trên cùng, vắt ngang lưng đồi
  ];
  scene.add(group);
  return {
    group, mats,
    update(t) { mats.forEach((m, i) => { m.uniforms.uTime.value = t * (1 + i * 0.35); }); },
  };
}

// ───────── 丘 đồi dưới chân thành: mặt đất THẬT có hạt, có đá, có rêu ─────────
// Bản cũ: một cột đá dựng đứng giữa biển mây, mép trên thành một đường ngang cứng. Ảnh gốc của
// igloo có một gò tuyết đầy chất liệu ở tiền cảnh — ở đây là lưng đồi thành, dốc xuống về phía
// máy quay rồi chìm vào sương.
export const hillY = (x, z) => {
  const r = Math.hypot(x, z * 1.08);
  // đỉnh đồi chỉ vừa chân nền đá; ra khỏi đó là dốc NGAY (dốc thành, ~35°) rồi thoải dần
  const q = Math.max(0, r - 17);
  let y = 0.9 - 32 * (1 - Math.exp(-q / 40)) - q * 0.02;
  const u = Math.min(1, Math.max(0, (r - 19) / 18));
  y += (Math.sin(x * 0.061 + 1.3) * Math.sin(z * 0.053 - 0.7) + 0.5 * Math.sin(x * 0.17 + z * 0.11)) * 1.6 * u;
  return y;
};

export function buildHill(scene, look, dress, slabGeo, rockMat) {
  const NR = 110, NA = 300, RMAX = 520;
  const pos = [], idx = [];
  for (let i = 0; i <= NR; i++) {
    const r = RMAX * Math.pow(i / NR, 1.9);
    for (let j = 0; j <= NA; j++) {
      const a = (j / NA) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, hillY(x, z), z);
    }
  }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) {
    const a = i * (NA + 1) + j, b = a + 1, c = a + NA + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);     // mặt hướng LÊN — quấn ngược thì nhìn từ trên xuống đồi bị bỏ, lộ trời qua kẽ cây
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const G = look.ground;
  const mat = dress(new THREE.MeshStandardMaterial({ color: G.color, roughness: 0.97, metalness: 0, envMapIntensity: 0.5 }), {
    grain: 0.55, scale: 0.9, fine: false, rough: 0.1,
    mottle: 0.75, mottleColor: G.moss, streak: 0.0,
    bump: 1.1, bumpScale: 0.42, rim: 0.12, rimColor: look.mat.rim,
    occ: [-26, 1, 0.55],
  });
  const hill = new THREE.Mesh(g, mat);
  hill.name = 'doi';
  hill.receiveShadow = true;
  scene.add(hill);

  // đá tảng vùi nửa trong đất trên sườn đồi — cho mặt đất có "hạt" và cho mắt một thước đo
  const r = rngF(7070);
  const list = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 0; i++) {
    const a = r() * Math.PI * 2;
    const rad = 22 + Math.pow(r(), 0.8) * 34;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad / 1.08;
    const s = 0.6 + Math.pow(r(), 2.4) * 2.6;
    e.set((r() - 0.5) * 0.5, r() * 6.28, (r() - 0.5) * 0.5);
    q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, hillY(x, z) - s * 0.30, z), q, new THREE.Vector3(s * (1.0 + r() * 0.5), s * (0.55 + r() * 0.3), s * (0.9 + r() * 0.4)));
    list.push(m4.clone());
  }
  if (!list.length) return { hill, rocks: 0 };
  const im = new THREE.InstancedMesh(slabGeo, rockMat, list.length);
  const tc = new THREE.Color();
  list.forEach((mm, i) => { im.setMatrixAt(i, mm); const v = 0.8 + r() * 0.4; im.setColorAt(i, tc.setRGB(v, v, v)); });
  im.instanceMatrix.needsUpdate = true;
  im.instanceColor.needsUpdate = true;
  im.castShadow = true; im.receiveShadow = true;
  im.name = 'da-tang';
  scene.add(im);
  return { hill, rocks: list.length };
}

// ───────── 杉 rừng tuyết tùng thật (3D) phủ lưng đồi thành ─────────
// Lớp núi vẽ bằng shader không có thị sai và không nhìn được từ trên xuống; lưng đồi ngay dưới
// chân thành thì máy quay nhìn XUỐNG, nên phải là cây thật: ngọn nhọn, tầng cành xoè, có bóng.
// Cây phía trước nền đá bị giới hạn chiều cao theo đúng đường ngắm tới chân tường — tường đá là
// nhân vật chính, cây không được che.
function cedarGeo(seed, tiers) {
  const r = rngF(seed);
  const g = new THREE.ConeGeometry(1, 1, 11, tiers * 4, false);
  g.translate(0, 0.5, 0);                       // gốc ở đáy
  const p = g.attributes.position, v = new THREE.Vector3();
  const ph = r() * 6.28;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const y = v.y;
    const ang = Math.atan2(v.z, v.x);
    // tầng cành: mép dưới mỗi tầng xoè ra rồi rủ xuống, mép trên thu vào sát thân
    const f = (y * tiers + ph) % 1;
    const saw = 0.72 + 0.50 * Math.pow(f, 1.6);
    // cành không đều quanh thân: tán lệch, có chỗ khuyết
    const wob = 1 + 0.16 * Math.sin(ang * 3 + y * 11 + ph) + 0.10 * Math.sin(ang * 7 - y * 5 + ph * 2);
    const k = y > 0.985 ? 0 : saw * wob;
    p.setXYZ(i, v.x * k, y - 0.03 * f, v.z * k);
  }
  g.computeVertexNormals();
  // Đỉnh nón: three bỏ các tam giác suy biến ở chóp, nên vài đỉnh có pháp tuyến DÀI BẰNG 0.
  // Lên card đồ hoạ normalize(0) = NaN, rồi nở sáng thổi nó thành đốm trắng giữa rừng.
  const nrm = g.attributes.normal;
  for (let i = 0; i < nrm.count; i++) {
    if (Math.hypot(nrm.getX(i), nrm.getY(i), nrm.getZ(i)) < 1e-4) nrm.setXYZ(i, 0, 1, 0);
  }
  return g;
}

// tán lá rộng (楢, 椎…): vòm tròn nhiều cụm, không phải quả cầu
function broadGeo(seed) {
  const r = rngF(seed);
  const g = new THREE.IcosahedronGeometry(0.5, 3);
  const p = g.attributes.position, v = new THREE.Vector3();
  const lobes = [];
  for (let k = 0; k < 7; k++) lobes.push(new THREE.Vector3(r() - 0.5, r() * 0.6 - 0.1, r() - 0.5).normalize());
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    let bump = 0;
    for (const L of lobes) bump = Math.max(bump, Math.pow(Math.max(0, n.dot(L)), 3));
    const k = 0.78 + 0.34 * bump + 0.05 * Math.sin(n.x * 17 + n.z * 13);
    p.setXYZ(i, v.x * k, (v.y * k) * 0.8 + 0.42, v.z * k);
  }
  g.computeVertexNormals();
  return g;
}

export function buildHillForest(scene, look, dress, cam) {
  const group = new THREE.Group();
  group.name = 'rung-doi';
  const r = rngF(4242);
  const mat = dress(new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.96, metalness: 0, envMapIntensity: 0.45,
  }), { grain: 0.75, scale: 2.4, fine: false, rim: 0.16, rimColor: look.mat.rim, bump: 0.8, bumpScale: 1.6 });
  const geos = [cedarGeo(11, 6), cedarGeo(12, 8), cedarGeo(13, 7)];
  const lists = geos.map(() => []);
  const tones = geos.map(() => []);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const cLit = new THREE.Color(look.near.lit), cSh = new THREE.Color(look.near.shade), tc = new THREE.Color();
  // đường ngắm từ máy quay tới chân nền đá (y = 0): cây phía trước không được vượt qua nó
  const dBase = Math.hypot(cam.x, cam.z) - 14;
  const slope = (cam.y - 0.5) / dBase;
  let n = 0;
  for (let i = 0; i < 3400; i++) {
    const a = r() * Math.PI * 2;
    const rad = 19.5 + Math.pow(r(), 0.85) * 150;
    const x = Math.cos(a) * rad, z = Math.sin(a) * rad / 1.08;
    const ground = hillY(x, z);
    const dCam = Math.hypot(x - cam.x, z - cam.z);
    if (dCam < 38) continue;
    let h = 7 + Math.pow(r(), 0.7) * 11;
    // chiều cao tối đa để ngọn cây nằm dưới đường ngắm tới chân tường (chỉ áp cho cây ĐỨNG TRƯỚC tường)
    const toCam = (x * cam.x + z * cam.z) / Math.hypot(cam.x, cam.z);
    if (toCam > 0) {
      const lateral = Math.sqrt(Math.max(0, rad * rad - toCam * toCam));
      if (lateral < 24) {
        const maxTop = cam.y - slope * dCam - 1.2;
        if (ground + h > maxTop) h = maxTop - ground;
        if (h < 1.6) continue;
      }
    }
    const gi = i % 3;
    const w = gi === 3 ? h * (0.62 + r() * 0.2) : h * (0.26 + r() * 0.08);
    if (gi === 3) h *= 0.72;
    e.set((r() - 0.5) * 0.08, r() * 6.28, (r() - 0.5) * 0.08);
    q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, ground - 0.6, z), q, new THREE.Vector3(w, h, w));
    lists[gi].push(m4.clone());
    tones[gi].push(tc.copy(cSh).lerp(cLit, Math.pow(r(), 0.8)).clone());
    n++;
  }
  lists.forEach((list, gi) => {
    const im = new THREE.InstancedMesh(geos[gi], mat, list.length);
    list.forEach((mm, j) => { im.setMatrixAt(j, mm); im.setColorAt(j, tones[gi][j]); });
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true;
    im.name = 'sugi-' + gi;
    group.add(im);
  });
  scene.add(group);
  return { group, count: n, mat };
}

// ───────── sương tiền cảnh ở hai góc dưới ─────────
// Hai làn sương mềm ngay trước ống kính, ở hai góc dưới khung: khung ảnh "thở" vào sương như ảnh
// gốc igloo, mắt dồn về toà thành — và chữ ở góc dưới trái đặt lên nền sương yên, không lên ngọn cây.
function softTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d', { willReadFrequently: true });   // vẽ bằng CPU: trên GPU, lần vẽ đầu phải dịch shader vẽ canvas (~7 s trên Windows, đo 25/9)
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0.75)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function buildCornerMist(scene, look, cam, target) {
  const tex = softTexture();
  const eye = new THREE.Vector3(cam.x, cam.y, cam.z);
  const fwd = new THREE.Vector3().subVectors(target, eye).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  const group = new THREE.Group();
  group.name = 'suong-goc';
  const C = look.corner;
  C.spots.forEach(([side, dist, dx, dy, w, h, o]) => {
    const m = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(C.color), transparent: true, opacity: o, depthWrite: false, depthTest: true, fog: false });
    const sp = new THREE.Sprite(m);
    sp.position.copy(eye).addScaledVector(fwd, dist).addScaledVector(right, side * dx).addScaledVector(up, dy);
    sp.scale.set(w, h, 1);
    sp.renderOrder = 20;
    group.add(sp);
  });
  scene.add(group);
  return group;
}
