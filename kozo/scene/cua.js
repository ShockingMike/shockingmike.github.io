// CHUYỂN CẢNH 4 (rừng 骨 → làng giấy 皮) — CỬA GIẤY LÙA 障子 TRONG KHÔNG GIAN 3D (bản p7b, soát p7a lỗi A1: bản trước là hai
// tấm phẳng dán kín màn, "đúng lỗi mảng phẳng dán đè Mike đã chê").
// Một khung cửa thật đứng trong một căn phòng tối: tường đất sẫm, cột gỗ 柱, xà trên 鴨居 và ngưỡng dưới 敷居 có hai rãnh trượt,
// sàn ván chạy về phía cửa (phối cảnh). Hai cánh shoji (khung gỗ tối, bậu gỗ 腰板 dưới chân, lưới nan 組子 bằng gỗ thật đứng TRƯỚC
// giấy) trượt trong hai rãnh. Đèn ở PHÍA SAU giấy: giấy sáng, nan hiện thành nét tối, có một vùng sáng tụ; bóng vài thân cây rừng
// in mềm lên giấy (tính theo toạ độ thế giới — cánh trượt qua thì bóng đứng yên như bóng thật). Ánh giấy hắt vào sàn và mặt trong
// của cột. Máy quay tiến dần tới cửa rồi đi xuyên qua khung cửa vào ngõ làng.
// Vẽ riêng vào một khung đệm có kênh trong suốt (khử răng cưa 4 mẫu); post/chuyen.js ShojiEffect đặt lên ảnh cảnh TRƯỚC loá +
// nắn màu (lớp nắn màu nhận giấy ấm nhẹ → ngà như ván phơi giấy ở chương 皮).
// Thời gian x (0 → 1, đi tới; lùi thì chạy ngược đúng hình ấy) do app.js đưa vào:
//   0 → 0,24   bóng tối căn phòng khép dần từ mép màn vào tới khung cửa (tường, sàn, cột hiện ra), máy bắt đầu tiến
//   0,16 → 0,44 hai cánh trượt ra khỏi hốc tường, khép lại (đẩy nhanh, dừng êm) — qua giấy thấy bóng thân cây nhạt dần
//   0,44 → 0,58 khép kín: đổi cảnh ngay sau cửa (x = 0,5); đèn phía ngõ làng sáng lên sau giấy
//   0,58 → 0,84 hai cánh mở ra ngõ làng · 0,70 → 1 máy đi xuyên qua khung cửa (khung, tường nở ra ngoài màn rồi hết)
import * as THREE from 'three';

const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
// cửa lùa có quán tính: đẩy nhanh, trôi, dừng êm (không nảy)
const doorK = (u) => { const q = cl(u); return 1 - Math.pow(1 - q * q * (3 - 2 * q), 1.8); };

const NOISE = /* glsl */`
float dH(vec2 p) { p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float dN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(dH(i), dH(i + vec2(1.0, 0.0)), f.x), mix(dH(i + vec2(0.0, 1.0)), dH(i + vec2(1.0, 1.0)), f.x), f.y); }
uniform float uIris, uAspect;
uniform vec2 uRes;
// bóng tối căn phòng khép từ mép màn vào (độ đục theo khoảng cách tới giữa màn)
float iris() { vec2 q = (gl_FragCoord.xy / uRes - 0.5) * vec2(uAspect, 1.0); return smoothstep(uIris - 0.35, uIris, length(q)); }
`;
const VERT = /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv; gl_Position = projectionMatrix * viewMatrix * w; }`;

export function createCua() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.04, 40);   // góc rộng: thấy cả xà trên, ngưỡng có rãnh, một khoảng sàn
  const OW = 1.8, OH = 1.9;                     // lỗ cửa (m)
  const U = {
    uIris: { value: 2 }, uAspect: { value: 1 }, uRes: { value: new THREE.Vector2(1, 1) },
    uGlow: { value: 1 }, uSpill: { value: 0 }, uTrunk: { value: 1 }, uLant: { value: 0 }, uTime: { value: 0 },
    uPaper: { value: new THREE.Color(0.55, 0.51, 0.43) }, uWood: { value: new THREE.Color(0.030, 0.027, 0.023) },
    uSpot: { value: new THREE.Vector3(-0.35, 1.25, 0.55) },   // vùng sáng tụ phía rừng (x, y, bán kính)
    uLamp: { value: new THREE.Vector3(0.42, 0.7, 0.42) },     // đèn lồng phía ngõ làng
  };
  // ── vật liệu ──
  // gỗ: sẫm, thớ dọc; ánh giấy hắt vào các mặt quay về phía cửa (mặt trong cột, mặt trên ngưỡng, hông nan)
  const woodM = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, transparent: true, fragmentShader: NOISE + /* glsl */`
uniform vec3 uWood, uPaper; uniform float uSpill, uGlow;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main() {
  float g = dN(vec2(vW.x * 6.0 + vW.z * 6.0, vW.y * 70.0)) * 0.6 + dN(vec2(vW.x * 30.0, vW.y * 9.0)) * 0.4;
  vec3 c = uWood * (0.75 + 0.5 * g);
  vec3 L = vec3(0.0, 0.95, -0.35) - vW; float d = length(L); L /= d;
  float lit = max(dot(normalize(vN), L), 0.0) * exp(-d * 0.9);
  c += uPaper * uGlow * uSpill * 0.55 * lit;
  gl_FragColor = vec4(c, iris());
}` });
  // tường đất sẫm (loang, hạt rơm) + ánh giấy loang ra quanh khung cửa
  const wallM = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, transparent: true, fragmentShader: NOISE + /* glsl */`
uniform vec3 uPaper; uniform float uSpill, uGlow;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main() {
  // đất trát: loang lớn + hạt mịn (không vệt xiên — vệt xiên trông như mưa)
  float n = dN(vW.xy * 1.3) * 0.55 + dN(vW.xy * 4.5 + 7.0) * 0.3 + dN(vW.xy * 60.0) * 0.15;
  vec3 c = vec3(0.011, 0.0105, 0.0095) * (0.7 + 0.6 * n);
  vec2 q = vec2(vW.x / 1.5, (vW.y - 0.95) / 1.7);
  c += uPaper * uGlow * uSpill * 0.07 * exp(-dot(q, q) * 1.4);
  gl_FragColor = vec4(c, iris());
}` });
  // sàn ván chạy về phía cửa + vũng sáng giấy hắt trên sàn
  const floorM = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, transparent: true, fragmentShader: NOISE + /* glsl */`
uniform vec3 uPaper, uWood; uniform float uSpill, uGlow;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main() {
  float b = fract(vW.x / 0.24 + 0.5);
  float seam = smoothstep(0.0, 0.03, b) * smoothstep(1.0, 0.97, b);
  float g = dN(vec2(floor(vW.x / 0.24) * 7.1, vW.z * 3.0)) * 0.5 + dN(vec2(vW.x * 40.0, vW.z * 2.0)) * 0.5;
  vec3 c = uWood * (0.55 + 0.45 * g) * (0.45 + 0.55 * seam);
  vec2 q = vec2(vW.x / 0.95, vW.z / 1.25);
  float pool = exp(-dot(q, q)) * smoothstep(-0.05, 0.25, vW.z);
  c += uPaper * uGlow * uSpill * 0.22 * pool * (0.8 + 0.2 * seam);
  gl_FragColor = vec4(c, iris());
}` });
  // giấy dó có đèn phía sau: mây giấy, sợi, sáng tụ một vùng, bóng thân cây mềm (toạ độ thế giới → đứng yên khi cánh trượt)
  const paperM = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: NOISE + /* glsl */`
uniform vec3 uPaper, uSpot, uLamp; uniform float uGlow, uTrunk, uLant;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
float trunk(float x0, float w, float lean, float soft) {
  float x = vW.x - x0 - lean * (vW.y - 0.9) + 0.012 * (dN(vec2(vW.y * 3.0, x0 * 9.0)) - 0.5);
  float ww = w * (1.0 - 0.18 * vW.y / 1.9);
  return 1.0 - smoothstep(ww * (1.0 - soft), ww * (1.0 + soft), abs(x));
}
void main() {
  vec2 p = vW.xy;
  float cloud = dN(p * 7.0) * 0.5 + dN(p * 19.0 + 3.0) * 0.3 + dN(p * 55.0) * 0.2;
  float fib = smoothstep(0.78, 0.96, dN(vec2(p.x * 9.0 + p.y * 4.0, p.y * 150.0 - p.x * 25.0)));
  // ánh sáng sau giấy: nền đều + vùng sáng tụ (phía rừng: trăng loang rộng; phía làng: đèn lồng gần, tụ hơn)
  vec2 ds = (p - uSpot.xy) / uSpot.z, dl = (p - uLamp.xy) / uLamp.z;
  float spot = exp(-dot(ds, ds)) * (1.0 - uLant) + exp(-dot(dl, dl) * 1.3) * uLant * 1.25;
  float base = 0.62 + 0.18 * smoothstep(0.0, 1.2, p.y) + 0.55 * spot;
  // bóng vài thân cây rừng in lên giấy (mềm, đứng, hơi nghiêng; cây xa thì nhạt và nhoè hơn)
  float sh = 0.0;
  sh = max(sh, trunk(-0.62, 0.075, 0.03, 0.4) * 0.72);
  sh = max(sh, trunk(-0.21, 0.045, -0.02, 0.65) * 0.45);
  sh = max(sh, trunk(0.33, 0.11, 0.015, 0.3) * 0.8);
  sh = max(sh, trunk(0.71, 0.05, -0.035, 0.75) * 0.4);
  float lit = base * (1.0 - sh * uTrunk);
  vec3 c = uPaper * uGlow * lit * (0.9 + 0.16 * cloud) * (1.0 - 0.05 * fib);
  gl_FragColor = vec4(c, 1.0);
}` });
  // gỗ của cánh cửa (khung cánh, nan, bậu): như gỗ nhưng không mờ theo bóng tối căn phòng (cánh chỉ ra khi phòng đã hiện)
  const panelWoodM = woodM.clone(); panelWoodM.uniforms = U; panelWoodM.transparent = false;
  panelWoodM.fragmentShader = panelWoodM.fragmentShader.replace('gl_FragColor = vec4(c, iris());', 'gl_FragColor = vec4(c, 1.0);');

  const cuaExtra = [];
  const box = (w, h, d, x, y, z, m) => { const g = new THREE.BoxGeometry(w, h, d); const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
  // ── căn phòng: tường (bốn mảnh quanh lỗ cửa), sàn, trần ──
  const room = new THREE.Group(); scene.add(room);
  const WZ = 0.03;   // mặt tường phía máy
  const plane = (w, h, x, y, z, m, rx = 0) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(x, y, z); o.rotation.x = rx; return o; };
  // (Sếp 29/9 sau p9b: tường phải còn trống) — bên phải cửa là HỐC TƯỜNG 床の間: cột hốc 床柱 (gỗ tròn cạnh), xà trên hốc 落掛,
  // bậc gỗ 床框 + ván sàn hốc 床板 cao hơn sàn phòng, lòng hốc lùi sâu 0,5 m, trên vách lòng hốc treo một bức 掛軸 tranh mực núi xa.
  // Tường phải chia quanh miệng hốc (x 1,42 → 2,42, y 0,16 → 1,86)
  const NX0 = OW / 2 + 0.52, NX1 = NX0 + 1.0, NY0 = 0.16, NY1 = 1.86, ND = 0.5, RX0 = OW / 2 + 0.12;
  room.add(plane(8, 5, -(OW / 2 + 0.12) - 4, 2.3, WZ, wallM));
  room.add(plane(NX0 - RX0, 5, (RX0 + NX0) / 2, 2.3, WZ, wallM));                  // giữa cột cửa và miệng hốc
  room.add(plane(RX0 + 8 - NX1, 5, (NX1 + RX0 + 8) / 2, 2.3, WZ, wallM));           // phải miệng hốc
  room.add(plane(NX1 - NX0, 4.8 - NY1, (NX0 + NX1) / 2, (NY1 + 4.8) / 2, WZ, wallM)); // trên miệng hốc (vách 小壁)
  {
    // lòng hốc khuất ánh cửa hơn mặt tường: cùng đất trát, tối hơn (đọc ra chiều sâu của hốc)
    const nicheM = wallM.clone(); nicheM.uniforms = U;
    nicheM.fragmentShader = wallM.fragmentShader.replace('gl_FragColor = vec4(c, iris());', 'gl_FragColor = vec4(c * 0.55, iris());');
    cuaExtra.push(nicheM);
    const nb = plane(NX1 - NX0, NY1 - NY0 + 0.1, (NX0 + NX1) / 2, (NY0 + NY1) / 2, WZ - ND, nicheM);   // lòng hốc
    const sL = plane(ND, NY1 - NY0 + 0.1, NX0, (NY0 + NY1) / 2, WZ - ND / 2, nicheM); sL.rotation.y = Math.PI / 2;
    const sR = plane(ND, NY1 - NY0 + 0.1, NX1, (NY0 + NY1) / 2, WZ - ND / 2, nicheM); sR.rotation.y = -Math.PI / 2;
    const tp = plane(NX1 - NX0, ND, (NX0 + NX1) / 2, NY1, WZ - ND / 2, nicheM, Math.PI / 2);
    room.add(nb, sL, sR, tp);
    room.add(box(NX1 - NX0 + 0.04, NY0, 0.09, (NX0 + NX1) / 2, NY0 / 2, WZ - 0.02, woodM));          // 床框 bậc gỗ trước hốc
    room.add(box(NX1 - NX0, 0.03, ND, (NX0 + NX1) / 2, NY0 - 0.015, WZ - ND / 2, woodM));            // 床板 ván sàn hốc
    room.add(box(NX1 - NX0 + 0.04, 0.07, 0.07, (NX0 + NX1) / 2, NY1 + 0.035, WZ - 0.01, woodM));      // 落掛 xà trên hốc
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 2.75, 10), woodM); post.position.set(NX1 + 0.06, 1.375, WZ - 0.02); room.add(post);   // 床柱
    // 掛軸: giấy ngà tối (phòng không đèn — chỉ ánh giấy cửa hắt tới) viền lụa sẫm, tranh mực núi xa vẽ ngay trong shader
    const scrollM = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, transparent: true, fragmentShader: NOISE + /* glsl */`
uniform vec3 uPaper; uniform float uSpill, uGlow;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main() {
  vec2 u = vUv;
  float mount = step(u.x, 0.09) + step(0.91, u.x) + step(u.y, 0.1) + step(0.86, u.y);
  vec3 silk = vec3(0.012, 0.012, 0.011) * (0.8 + 0.4 * dN(vW.xy * 40.0));
  vec3 paper = vec3(0.05, 0.047, 0.042) * (0.85 + 0.15 * dN(vW.xy * 90.0));
  // núi xa hai lớp + một vệt sương: mực nhạt loang (cao độ đường sống núi theo nhiễu)
  float x = (u.x - 0.09) / 0.82, y = (u.y - 0.1) / 0.76;
  float r1 = 0.52 + 0.14 * dN(vec2(x * 3.0, 1.0)) + 0.1 * dN(vec2(x * 7.0, 3.0));
  float r2 = 0.36 + 0.1 * dN(vec2(x * 4.0 + 5.0, 2.0));
  float ink = (1.0 - smoothstep(r1 - 0.01, r1 + 0.02, y)) * (0.35 + 0.25 * smoothstep(r1 - 0.3, r1, y));
  ink = max(ink, (1.0 - smoothstep(r2 - 0.01, r2 + 0.02, y)) * 0.6);
  ink *= 1.0 - 0.7 * exp(-pow((y - 0.3) / 0.06, 2.0));
  paper *= 1.0 - 0.75 * ink;
  vec3 c = mix(paper, silk, clamp(mount, 0.0, 1.0));
  vec2 q = vec2(vW.x / 1.5, (vW.y - 0.95) / 1.7);
  c += uPaper * uGlow * uSpill * 0.035 * exp(-dot(q, q) * 1.4) * (1.0 - clamp(mount, 0.0, 1.0));
  gl_FragColor = vec4(c, iris());
}` });
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 1.12), scrollM); sc.position.set((NX0 + NX1) / 2, 1.12, WZ - ND + 0.012); room.add(sc);
    cuaExtra.push(scrollM);
  }
  room.add(plane(OW + 0.24, 3, 0, OH + 0.12 + 1.5, WZ, wallM));
  room.add(plane(20, 12, 0, 0, 6.03, floorM, -Math.PI / 2));   // sàn y = 0, từ tường về phía máy
  const ceil = plane(20, 12, 0, 2.75, 6.03, wallM, Math.PI / 2); room.add(ceil);
  // cột 柱, xà trên 鴨居, ngưỡng 敷居 (hai rãnh trượt là hai vệt lõm tối)
  room.add(box(0.12, 2.12, 0.18, -(OW / 2 + 0.06), 1.06, -0.05, woodM), box(0.12, 2.12, 0.18, OW / 2 + 0.06, 1.06, -0.05, woodM));
  room.add(box(OW + 0.36, 0.13, 0.18, 0, OH + 0.065, -0.05, woodM));
  room.add(box(OW + 0.36, 0.035, 0.2, 0, 0.0175, -0.05, woodM));
  room.add(box(16, 0.11, 0.06, 0, 2.22, 0.06, woodM));                    // xà ngang 長押 chạy suốt tường
  room.add(box(7.1, 0.07, 0.03, -(OW / 2 + 0.12) - 3.55, 0.035, 0.045, woodM), box(7.1, 0.07, 0.03, OW / 2 + 0.12 + 3.55, 0.035, 0.045, woodM));   // chân tường
  const grooveM = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, transparent: true, fragmentShader: NOISE + 'void main() { gl_FragColor = vec4(vec3(0.004), iris()); }' });
  for (const gz of [-0.03, -0.085]) room.add(box(OW + 0.3, 0.004, 0.02, 0, 0.036, gz, grooveM));
  room.traverse((o) => { if (o.isMesh) o.renderOrder = 0; });

  // ── hai cánh cửa ──
  const PW = OW / 2 + 0.02, PH = OH - 0.02, ST = 0.038, RT = 0.045, KOSHI = 0.16;
  function makePanel(side) {
    const g = new THREE.Group();
    const z0 = side < 0 ? -0.03 : -0.085;
    g.position.z = z0;
    // giấy (mặt sau khung — đèn ở phía sau giấy)
    const paperH = PH - KOSHI - RT;
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(PW - 2 * ST, paperH), paperM);
    paper.position.set(0, KOSHI + paperH / 2 + 0.01, -0.012); g.add(paper);
    // khung cánh + bậu gỗ dưới chân
    g.add(box(ST, PH, 0.03, -PW / 2 + ST / 2, PH / 2 + 0.01, 0, panelWoodM), box(ST, PH, 0.03, PW / 2 - ST / 2, PH / 2 + 0.01, 0, panelWoodM));
    g.add(box(PW, RT, 0.03, 0, PH - RT / 2 + 0.01, 0, panelWoodM), box(PW, KOSHI, 0.028, 0, KOSHI / 2 + 0.01, 0, panelWoodM));
    // lưới nan 組子: 3 nan đứng × 6 nan ngang, gỗ thật đứng trước giấy (bóng nan in trên giấy sáng thành nét tối)
    const iw = PW - 2 * ST, y0 = KOSHI + 0.01, ih = paperH;
    for (let k = 1; k <= 3; k++) g.add(box(0.011, ih, 0.018, -iw / 2 + (iw * k) / 4, y0 + ih / 2, -0.003, panelWoodM));
    for (let k = 1; k <= 6; k++) g.add(box(iw, 0.011, 0.018, 0, y0 + (ih * k) / 7, -0.003, panelWoodM));
    g.traverse((o) => { if (o.isMesh) o.renderOrder = 1; });
    scene.add(g);
    return g;
  }
  const left = makePanel(-1), right = makePanel(1);
  const PC = OW / 4 + 0.005, PO = OW / 2 + PW / 2 + 0.02;   // tâm cánh khi khép · khi mở (nằm trong hốc tường)

  let portrait = false, z0 = 2.6;
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, depthBuffer: true });
  rt.texture.name = 'Cua.RT';
  const st = { x: 0, close: 0, zc: 0, iris: 0 };
  function update(x, dt = 0) {
    st.x = x;
    U.uTime.value += dt;
    // bóng tối căn phòng khép từ mép màn vào (0 → 0,24)
    U.uIris.value = 1.7 - 2.2 * sm(0.0, 0.24, x) - 0.6 * sm(0.24, 0.3, x);
    // hai cánh: khép 0,16 → 0,44 · kín tới 0,58 · mở 0,58 → 0,84
    const c = x < 0.5 ? doorK((x - 0.16) / 0.28) : 1 - doorK((x - 0.58) / 0.26);
    st.close = c;
    left.position.x = -(PC + (PO - PC) * (1 - c));
    right.position.x = PC + (PO - PC) * (1 - c);
    left.visible = right.visible = c > 0.001 || (x > 0.155 && x < 0.86);   // trong hốc tường thì tường đã kín hẳn chỗ ấy
    // đèn sau giấy: sáng dần khi cửa khép; phía làng có đèn lồng; bóng thân cây nhạt dần trước chỗ đổi cảnh
    U.uGlow.value = 0.8 + 0.25 * sm(0.18, 0.44, x);
    U.uTrunk.value = 1 - sm(0.34, 0.49, x);
    U.uLant.value = sm(0.5, 0.64, x);
    U.uSpill.value = c;
    // máy quay: tiến dần tới cửa, rồi đi xuyên qua khung cửa (0,70 → 1)
    // (một đường trơn: bắt đầu từ đứng yên, nhanh dần đều, qua mặt cửa ở x ≈ 0,86 — không có chỗ nối gãy vận tốc; chạy ngược thì
    //  dừng êm ở x = 0)
    const xc = cl(x);
    st.zc = z0 - (z0 + 0.6) * xc * xc * (1.6 - 0.6 * xc);
    const off = (portrait ? 0.08 : 0.18) * (1 - sm(0.1, 0.72, x));   // lệch phải lúc đầu → thấy mặt trong cột, bề dày cánh
    camera.position.set(off, portrait ? 1.0 : 1.05, st.zc);
    camera.lookAt(off * 0.25, portrait ? 0.95 : 0.89, st.zc - 6);   // hơi cúi: thấy cả xà trên lẫn ngưỡng có rãnh
    camera.updateMatrixWorld();
    st.iris = U.uIris.value;
  }
  function resize(w, h, bw, bh) {
    portrait = h > w;
    z0 = portrait ? 4.3 : 3.2;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    U.uAspect.value = w / h;
    U.uRes.value.set(bw, bh);
    rt.setSize(bw, bh);
  }
  // vẽ vào khung đệm có kênh trong suốt
  const c0 = new THREE.Color();
  function render(renderer) {
    const a0 = renderer.getClearAlpha(); renderer.getClearColor(c0);
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.setClearColor(c0, a0);
  }
  return { scene, camera, rt, U, update, resize, render, info: () => ({ x: +st.x.toFixed(3), close: +st.close.toFixed(3), zc: +st.zc.toFixed(2), iris: +st.iris.toFixed(2) }), materials: [woodM, wallM, floorM, paperM, panelWoodM, grooveM, ...cuaExtra] };
}
