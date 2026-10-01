// Bản thử KHÔNG KHÍ cho màn đầu của Studio Kōzō — ?look=a|b|c.
// Giữ nguyên: hình khối toà thành, nền đá 石垣, phản ứng rê chuột, chuỗi hậu kỳ.
// Đổi: bầu trời, núi (núi rừng nhiều lớp thay cho nón tam giác trắng), sương, ánh sáng,
// chất liệu (đá granite, tường trát, ngói hun sẫm, ván gỗ đen) và lớp nắn màu.
import * as THREE from 'three';
import { L, LOOK_ID, DUSK, DEM } from './look.js';
import { buildSky, buildUnkai } from './sky.js';
import { buildRidgeLayers, buildMistSea, buildHill, buildHillForest, buildCornerMist } from './forest.js';
import { makeMaterials, buildIshigaki, buildOutcrop, buildTenshu, updateSunDir, IS, rng32, dress, slabGeo, getStructure, INK, INK_GLSL, inkPlaneMaterial, markCastleStencil } from './castle.js';
import { RAMP } from '../page/accent.js';
// Lớp nét kết cấu (scene/ketcau.js — agent khác dựng; bản tạm ketcau-tam.js còn giữ, cùng giao diện)
import { createKetCau } from './ketcau.js';
import { createHover } from './hover.js';
import { createTone } from './tone.js';
import { createInk } from './ink.js';
import { INTRO, INTRO_END, introState, addReveal, setRevealVariant } from './intro.js';
// PHẦN 3: cuộn thật kiểu hubtown · chạng vạng quanh toà thành · chuyển cảnh mực loang · chương 地 thung lũng ruộng bậc thang
import { createValley } from './valley.js';
// PHẦN 4: chương 石垣 — vách mỏ đá trong đêm (dựng ngầm sau thung lũng) + chuyển cảnh nét chổi quét ngang
import { createQuarry } from './quarry.js';
// PHẦN 5: chương 骨 — rừng tuyết tùng trong đêm (dựng NGẦM sau mỏ đá; shader dịch + vẽ đầu NGẦM sau màn mở, không vào màn chờ)
// + chuyển cảnh máy bay liền nối bằng sương dày
import { createRung } from './rung.js';
// PHẦN 6 (29/9): chương 皮 — làng làm giấy dó trong đêm (dựng NGẦM sau rừng; dịch shader + vẽ đầu NGẦM sau màn mở, không vào màn chờ)
// + chuyển cảnh 4 bằng CỬA GIẤY LÙA 障子 (29/9, thay mảng sáng vuông): hai cánh giấy khép trước rừng, mở ra ngõ làng
import { createLang } from './lang.js';
// PHẦN 7 (29/9): ĐI TỪNG CHƯƠNG — một cử chỉ = một chương, mọi thứ chạy theo thời gian (thay cho cuộn liên tục page/cuon.js)
import { createBuoc } from '../page/buoc.js';
// PHẦN 7b (29/9, soát p7a A1): cửa giấy lùa dựng 3D cho chuyển cảnh 4
import { createCua } from './cua.js';
// phần 8 (29/9): chương 仕事 — năm công trình trên bản đồ cả vùng (Mike chọn phương án A)
import { createViec } from './viec.js';
// phần 9 (30/9): chương 連絡 — toà thành trong đêm + bãi đất đã căng dây chờ xây (Mike duyệt ảnh chi tiết phương án C)
import { createLienhe } from './lienhe.js';
import { LANG } from './lang.js';
// B6 (29/9): nấc chất lượng cho máy yếu (laptop không card rời) — nấc 0 là bản Mike đã duyệt, không đổi một điểm ảnh
import { NAC, TOP, MIN_OF_SCREEN, gpuInfo, forcedNac, firstNac, makeGovernor } from './nac.js';
// ?ro=vo → bản vỡ khối kiểu igloo (vòng 2) để so; mặc định: ngọn cọ mực, toà thành đứng yên
const RO = new URLSearchParams(location.search).get('ro') === 'vo' ? 'vo' : 'muc';
// ?du=1 → bật lại lớp DỮ LIỆU (số đo dọc nét, nhãn 石垣 · BASE, lớp nét kết cấu trong lòng vết). Mike 24/9: "bỏ các
// data chạy theo đi, chúng ta không làm theo hướng đó nữa" — tắt ở chế độ mặc định, giữ mã để so.
const DU = new URLSearchParams(location.search).get('du') === '1';
// &co=sang → cả nét gỉ đồng sáng phát quang (so với mặc định: nền mực sẫm + kết cấu phát sáng)
const CO = new URLSearchParams(location.search).get('co') === 'sang' ? 1 : 0;

// MÀN MỞ (phần 2): mặc định chạy mỗi lần tải trang như igloo. ?intro=0 → vào thẳng khung cuối (để làm phần 1);
// ?t=3.2 → đứng hình ở giây 3,2 (để chụp); người dùng bật "giảm chuyển động" → tan nhẹ thẳng vào khung cuối.
const QS = new URLSearchParams(location.search);
// Mike 28/9: "tạm thời ẩn nét mực khi di chuột vào tòa nhà đi, tôi cảm thấy chỗ này làm chưa đủ tốt" → ngọn cọ rê chuột
// ở màn đầu TẮT mặc định (mã giữ nguyên); &muc=1 bật lại để so / để các bài đo ngọn cọ chạy.
const MUC = QS.get('muc') === '1';
// Mike 28/9: "giảm độ tilt khi di chuột nữa" → độ nghiêng máy quay theo chuột ở màn đầu còn một nửa.
const TILT_K = 0.5;
const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const INTRO_MODE = QS.get('intro') !== '0' && !REDUCED;
const T_FIX = QS.has('t') ? Math.max(0, parseFloat(QS.get('t')) || 0) : null;

const api = { ready: false, error: null, build: {}, look: LOOK_ID, ro: RO, introMode: INTRO_MODE, scrollUnlocked: !INTRO_MODE, introDone: !INTRO_MODE };
window.__kozo = api;
// đồng hồ màn mở: chạy từ lúc màn chờ bắt đầu tan (page.js gọi api.startIntro khi màn chờ đủ 100%)
const IN = { run: false, t: 0, fixed: false, finished: !INTRO_MODE, uiDone: false };
const introBusy = () => INTRO_MODE && !IN.finished;

const t0 = performance.now();
const buoc = (p, ten) => { if (window.__kozoNap) window.__kozoNap(p, ten); };
// nhường một khung cho màn chờ vẽ lại giữa các bước nạp nặng (mỗi bước < 100 ms thì màn chờ không đứng hình)
const nhuong = () => new Promise((r) => requestAnimationFrame(() => r()));
buoc(0.03, 'renderer');   // (vòng kiểm cuối) không ghi tên thư viện lên trang
let post = null, camera = null;
// chip vẽ bằng CPU (SwiftShader, llvmpipe…): không nấc nào vẽ nổi cảnh → dừng dựng, trang vào BẢN ĐỌC CHỮ (page.js)
const SOFT = new Error('kozo: chip vẽ bằng CPU');
// (vòng kiểm cuối) máy KHÔNG có WebGL2 (tắt trong trình duyệt, chính sách máy công ty…): thử trên một khung vẽ nháp rồi nhả ngay — không
// để three.js tạo renderer hỏng rồi in lỗi đỏ ra console; vào thẳng bản đọc chữ như chip vẽ bằng CPU
const NOGL = new Error('kozo: không có WebGL2');

try {
  { const c = document.createElement('canvas'), g = window.WebGL2RenderingContext ? c.getContext('webgl2') : null; if (!g) throw NOGL; const lc = g.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext(); }
  const canvas = document.getElementById('scene');
  // antialias tắt: chuỗi hậu kỳ đã khử răng cưa (SMAA); tắt đi thì khung đệm màn hình là ảnh đơn
  // mẫu, chép thu nhỏ được ngay trên card để lớp chọn màu đọc về không phải chờ (scene/tone.js)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  // B6: tên chip → nấc đầu (chip tích hợp / điện thoại vào thẳng nấc 2); chip vẽ bằng CPU → bản đọc chữ (&q= ép dựng để thử)
  const GPUI = gpuInfo(renderer.getContext());
  api.gpu = () => GPUI;
  const NAC_FORCED = forcedNac(QS);
  if (GPUI.soft && NAC_FORCED === null) throw SOFT;
  // ĐỘ NÉT (săn khung giật 24/9): trần 1,15 như igloo — ở màn ×1,25 của Mike, vẽ đủ ×1,25 tốn thêm ~18% điểm ảnh
  // mà mắt gần như không phân biệt; tụt dưới ~50 hình/giây thì tự hạ dần tới 0,6 (xem "độ nét thích ứng" ở vòng vẽ)
  // NGÂN SÁCH 120 HÌNH/GIÂY (Sếp 25/9, mỗi khung ≤ 8,3 ms): cảnh vẽ ở 0,85 độ nét của trần rồi phóng lên — như igloo
  // (cả khung đầy hạt, sương, nhoè nên mắt gần như không thấy khác; ảnh so ở scratchpad/kozo-look/fps/so-ti-le-ve.png).
  // ?rs=1 → vẽ đủ như trước để so.
  // Mike 28/9: "tôi cảm thấy web đang không được nét lắm" → bỏ vẽ 85%: MẶC ĐỊNH VẼ ĐỦ (màn tỉ lệ 1 vẽ đúng 1 điểm ảnh / điểm
  // ảnh; màn tỉ lệ cao vẫn trần 1,15). &rs=0.85 → bản cũ để so. Thêm lượt làm nét CAS nhẹ ở cuối chuỗi (&cas=0 tắt).
  // &net=0 → trả MỌI thông số độ nét về bản trước 28/9 (vẽ 85%, không làm nét, khoảng nét 0,22 m, nhiễu sắc cũ) để so
  const NET0 = QS.get('net') === '0';
  const RS = QS.has('rs') ? Math.min(1, Math.max(0.5, parseFloat(QS.get('rs')) || 1)) : NET0 ? 0.85 : 1;
  const CAS = QS.has('cas') ? Math.min(1, Math.max(0, parseFloat(QS.get('cas')) || 0)) : NET0 ? 0 : 0.4;
  // (vòng kiểm cuối 30/9) ĐIỆN THOẠI / MÁY TÍNH BẢNG: trần 1,5 thay 1,15 — màn ×3 vẽ ở 1,15 chỉ còn 38% điểm ảnh thật, song cửa sổ,
  // mép mái, dây 水糸 thành răng cưa rõ (so 1,15 / 1,35 / 1,5 ở nấc 2: 1,5 đọc ra song cửa, mép mái mịn; tốn thêm ~45% điểm ảnh).
  // Máy chậm thì bộ tự hạ vẫn hạ: nấc 3 = 0,85, nấc 4 = 0,75 của trần (1,5 → 1,13, ≈ mức cũ). Máy tính giữ 1,15 như Mike đã duyệt.
  // &prc=… (bài kiểm) ép trần; &cas2=… (bài kiểm) bật làm nét ở nấc 2 với độ mạnh ấy (so thử: gần như không khác — không bật).
  const PR_TOP = QS.has('prc') ? Math.min(3, Math.max(0.5, parseFloat(QS.get('prc')) || 1.15)) : GPUI.mobile ? 1.5 : 1.15;
  const prCap = () => Math.round(Math.min(window.devicePixelRatio || 1, PR_TOP) * RS * 100) / 100;
  let PR_TRAN = prCap();
  renderer.setPixelRatio(PR_TRAN);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;   // r186 đã bỏ PCFSoft (báo cảnh cáo ra console)
  renderer.toneMapping = THREE.NoToneMapping;       // lớp hậu kỳ lo ACESFilmic

  const scene = new THREE.Scene();
  const sunDir = new THREE.Vector3().fromArray(L.sun.dir).normalize();
  scene.fog = new THREE.FogExp2(new THREE.Color(L.fog.color), L.fog.density);

  const tSky = performance.now();
  await buildSky(renderer, scene, sunDir, L);
  api.skyMs = { tong: Math.round(performance.now() - tSky), env: buildSky.envMs, chang: buildSky.T };
  scene.background = null;
  buoc(0.06, 'sky'); await nhuong();

  // ── ánh sáng ────────────────────────────────────────────────────────────────
  const sun = new THREE.DirectionalLight(new THREE.Color(L.sun.color), L.sun.intensity);
  sun.position.copy(sunDir).multiplyScalar(200);
  sun.castShadow = true;
  sun.shadow.mapSize.set(3072, 3072);
  sun.shadow.camera.left = -95; sun.shadow.camera.right = 95;
  sun.shadow.camera.top = 95; sun.shadow.camera.bottom = -95;
  sun.shadow.camera.near = 40; sun.shadow.camera.far = 400;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.12;
  sun.shadow.intensity = L.sun.shadow;
  sun.shadow.radius = L.sun.radius;
  sun.target.position.set(0, 6, 0);
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(new THREE.Color(L.hemi.sky), new THREE.Color(L.hemi.ground), L.hemi.intensity));
  scene.add(new THREE.AmbientLight(new THREE.Color(L.amb.color), L.amb.intensity));

  // nguồn của tia sáng thể tích — lớp hậu kỳ tự tìm mesh tên này
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(26, 20, 14),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(L.glow.color), fog: false, transparent: true, opacity: L.glow.opacity })
  );
  glow.name = 'godray-source';
  glow.position.copy(sunDir).multiplyScalar(1900);
  glow.scale.setScalar(3);
  glow.visible = L.glow.opacity > 0;
  scene.add(glow);

  // ── công trình ──────────────────────────────────────────────────────────────
  const M = makeMaterials(L);
  const rng = rng32(20260923);
  const castle = new THREE.Group();
  // góc 3/4 như cái lều igloo (máy nhìn chếch ~30° vào mặt trước): tảng đá, ô tường đi RA NGOÀI thì
  // thấy được cả quãng dịch lẫn hông khối — nhìn thẳng mặt tường thì quãng dịch chỉ là đi về phía máy
  castle.rotation.y = 0.08;
  scene.add(castle);

  // Cột đá cũ vẫn DỰNG (để dòng số ngẫu nhiên của nền đá giữ nguyên — xếp đá y như bản gốc),
  // nhưng không hiện: chỗ của nó giờ là lưng đồi thật (buildHill).
  const outcrop = buildOutcrop(scene, rng, M);
  outcrop.group.visible = false;
  // không bao giờ hiện → gỡ khỏi cảnh luôn: khỏi phải dịch 2 chương trình shader của nó lúc mở trang (bước B 25/9)
  scene.remove(outcrop.group);
  const hill = buildHill(scene, L, dress, slabGeo(), M.rock);
  buoc(0.09, 'hill'); await nhuong();
  const ishigaki = buildIshigaki(castle, rng, M);
  buoc(0.13, 'ishigaki'); await nhuong();
  const tenshu = buildTenshu(castle, rng, M);
  buoc(0.16, 'tenshu'); await nhuong();

  // B · 藍: đèn trong lòng từng tầng lầu. Ánh sáng lọt qua ô cửa hắt lên mặt dưới hiên mái và
  // xuống mái tầng dưới — nguồn ấm DUY NHẤT trong khung.
  const lamps = [];
  if (L.lamp && L.lamp.intensity > 0) {
    tenshu.frames.forEach((f, i) => {
      const lp = new THREE.PointLight(new THREE.Color(L.lamp.color), L.lamp.intensity * (i === 0 ? 1.2 : 1), L.lamp.dist, 1.6);
      const y0 = [5.8, 14.2, 21.2][i] || 6;
      lp.position.set(0, y0, 0);
      f.group.parent.add(lp);
      lamps.push(lp);
    });
  }

  // ── máy quay: đứng yên, hơi thấp, nhìn lên — toà thành ở GIỮA khung như igloo ─────────────
  camera = new THREE.PerspectiveCamera(34, 1, 0.5, 6000);
  // Máy quay đứng cao hơn đỉnh nền đá một chút, nhìn hơi xuống — góc "thành trên mây" (Takeda,
  // Bitchū-Matsuyama) và cũng là góc của ảnh gốc igloo: thấy mái ngói từ trên, rừng núi lấp kín khung.
  // Mike 24/9: "tôi chọn zoom lại" — toà thành chiếm ~40% bề ngang khung như cái lều igloo. Máy gần hơn,
  // thấp hơn (ngang đỉnh nền đá), nhìn hơi chếch lên; toà thành lệch trái một chút (不均斉), chừa khoảng
  // sương bên phải cho nhãn đo.
  const CAM = { dist: 96, camY: 13, ty: 21.5, shift: 0.045, distP: 130, fovP: 50 };
  const TARGET = new THREE.Vector3(0, CAM.ty, 0);
  let dist = CAM.dist, camY = CAM.camY, azim = 0.60, shiftFrac = CAM.shift;
  const camBase = { x: Math.sin(azim) * dist, y: camY, z: Math.cos(azim) * dist };

  // ── bối cảnh: núi rừng nhiều lớp + biển sương + rừng tuyết tùng thật quanh chân mỏm đá ────
  const right0 = new THREE.Vector3(-(-camBase.z), 0, -camBase.x).normalize();   // phải của hướng nhìn
  const sunSide = THREE.MathUtils.clamp(-(sunDir.x * right0.x + sunDir.z * right0.z) * 2.2, -1, 1);
  const ridges = buildRidgeLayers(scene, camBase, L, { mistY: -16, sunSide, sunK: LOOK_ID === 'c' ? 0.85 : LOOK_ID === 'a' ? 0.5 : 0.35 });
  buoc(0.18, 'ridges'); await nhuong();
  const sea = buildMistSea(scene, L, camBase, sunDir);
  const hillForest = buildHillForest(scene, L, dress, camBase);
  buildCornerMist(scene, L, camBase, TARGET);
  const unkai = buildUnkai(scene, rng, { x: camBase.x, y: camBase.y, z: camBase.z, r: 70 }, L);
  buoc(0.20, 'forest'); await nhuong();

  api.build = {
    stones: ishigaki.stoneCount, courses: ishigaki.courses, kagami: ishigaki.kagami,
    panes: tenshu.panes, sama: tenshu.sama, hillTrees: hillForest.count, ridgeLayers: L.layers.length,
    ishigakiH: IS.H, topY: +tenshu.topY.toFixed(2),
  };

  const right = new THREE.Vector3(), fwd = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  let tiltYaw = 0, tiltPitch = 0, portrait = false, camLock = false;

  const hover = createHover({
    camera, castle, target: TARGET, mods: ishigaki.mods, roofs: tenshu.roofs, coreMesh: ishigaki.core, cap: ishigaki.cap,
    // bắn tia vào các hình ĐỨNG YÊN (lõi nền đá, vỏ tầng, mái nguyên vẹn vô hình): mô-đun dịch đi thì
    // điểm chạm không nhảy theo — không có vòng lặp "ô bật ra → tia trượt → ô thu về"
    hitMeshes: [ishigaki.core, ...tenshu.hits],
    materials: [M.stone, M.stoneCore, M.rock], core: M.stoneCore,
    cells: tenshu.cells, frames: tenshu.frames, tower: tenshu.group,
    // các hình NHÌN THẤY để kiểm chấm dữ liệu có bị che không
    pickMeshes: [...ishigaki.meshes, ...Object.values(tenshu.IM), ...tenshu.roofs.flatMap((r) => [r.crown, r.tileIM, ...r.segs.map((sg) => sg.mesh)])],
    svg: RO === 'vo' ? document.getElementById('plex') : null,
    motion: RO === 'vo',
    radius: (IS.baseA + IS.baseB) / 2,
    push: 1.0, apartPush: 9.6, roofLift: 3.0, frameLift: 9.5, skinOut: 5.2, gate: [1.2, 6.5],
  });

  // ── NGỌN CỌ MỰC 緑青 (mặc định) ─────────────────────────────────────────
  let ink = null;
  if (RO === 'muc') {
    const mmTxt = (m) => String(Math.round(m * 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const stoneOf = new Map(), cellOf = new Map();
    for (const m of ishigaki.mods) { if (!stoneOf.has(m.mesh)) stoneOf.set(m.mesh, new Map()); stoneOf.get(m.mesh).set(m.idx, m); }
    for (const k of tenshu.cells) {
      for (const [im, idx] of [[k.im, k.idx], ...k.att.map((q) => [q.im, q.idx])]) { if (!cellOf.has(im)) cellOf.set(im, new Map()); cellOf.get(im).set(idx, k); }
    }
    const TH = [9.6, 8.2, 6.8], EV = [2.35, 2.10, 1.95];
    // con số THẬT của mô-đun dưới ngọn cọ: bề rộng tảng · bề rộng gian / cao tầng · vươn hiên
    const resolve = (h, k) => {
      const st = stoneOf.get(h.object); if (st && st.has(h.instanceId)) return mmTxt(st.get(h.instanceId).width);
      const ce = cellOf.get(h.object); if (ce && ce.has(h.instanceId)) { const c = ce.get(h.instanceId); return k % 2 ? mmTxt(TH[c.tier]) : mmTxt(c.scl.x); }
      let o = h.object; while (o && !/^mai-tang-/.test(o.name)) o = o.parent;
      if (o) return mmTxt(EV[+o.name.slice(-1)] || 2);
      return null;
    };
    const frameMeshes = [];
    for (const f of tenshu.frames) f.group.traverse((o) => { if (o.isMesh && !/^loi-tang|^luoi-khung/.test(o.name)) frameMeshes.push(o); });
    const pick = [...ishigaki.meshes, ...ishigaki.cap.children, ...Object.values(tenshu.IM), ...tenshu.roofs.flatMap((r) => [r.crown, r.tileIM, ...r.segs.map((sg) => sg.mesh)]), ...frameMeshes];
    INK.uInkMode.value = CO;
    // mặt phẳng sương qua trục toà thành, quay về phía máy quay: nét ra khỏi công trình vẽ tiếp lên đây
    const inkPlane = new THREE.Mesh(new THREE.PlaneGeometry(420, 260), inkPlaneMaterial());
    inkPlane.position.set(TARGET.x, TARGET.y, TARGET.z);
    inkPlane.lookAt(camBase.x, TARGET.y, camBase.z);
    inkPlane.renderOrder = 999;   // sau sương góc: nét trên nền sương không bị sương góc che mất
    inkPlane.name = 'mat-suong-muc';
    scene.add(inkPlane);
    markCastleStencil(castle);
    // Mike 28/9 (ảnh có mũi tên): "tòa lại bị các vết xanh khi chưa scroll xuống" — lòng tầng và lưới cột kèo phát sáng
    // (chỉ để lộ ra khi tường tách ô ở kiểu cũ ?ro=vo) lọt qua khe góc tường thành các vạch xanh. Kiểu mặc định không
    // tách tường nên giấu hẳn chúng.
    castle.traverse((o) => { if (/^loi-tang|^luoi-khung/.test(o.name)) o.visible = false; });
    // gaps: LÕI nền đá lộ ra ở khe giữa các tảng — tia lọt khe thì chạm lõi (đúng thứ mắt thấy), nét không đứt ở mạch vữa
    ink = createInk({ camera, pick, resolve, svg: DU ? document.getElementById('plex') : null, plane: inkPlane, gaps: [ishigaki.core] });
  }
  api.ink = () => (ink ? { points: ink.points, stroke: ink.strokeInfo } : null);
  api.inkReset = () => { if (ink) ink.reset(); };
  api.inkDump = () => (ink ? ink.dump(clock) : null);
  api.inkLoad = (a) => { if (ink) ink.load(a, clock); };
  api.lockCam = (v) => { camLock = !!v; };   // bài kiểm độ phủ: máy quay không nghiêng theo chuột
  // PHẦN 3: thung lũng (dựng ngầm sau màn mở) + khung đệm riêng của nó lúc chuyển cảnh; scrollBusy: đã cuộn khỏi màn đầu
  let valley = null, valleyRT = null, scrollBusy = false, quarry = null, rung = null, lang = null;
  let viec = null, planRT = null;   // phần 8: chương 仕事 + bản vẽ quy hoạch của chuyển cảnh 5 (vẽ một lần sau khi dựng)
  let lienhe = null;                // phần 9: chương 連絡
  let jSnap = -1;   // phần 7: số cú nhảy đã chụp cảnh vào khung đệm (-1 = phải chụp lại, vd. khung đệm vừa đổi cỡ)
  let cua = null;   // phần 7b: cảnh cửa giấy lùa (chuyển cảnh 4)
  // ── LỚP NÉT KẾT CẤU: vẽ riêng (lớp 2, cùng máy quay) rồi ghép vào ảnh cảnh CHỈ trong vùng vết mực ──
  let kc = null, lineRT = null;
  const clearC = new THREE.Color();
  if (RO === 'muc') {
    const castleApi = getStructure(ishigaki, tenshu);
    api.structure = () => castleApi;
    kc = createKetCau(castleApi, { layer: 2, ramp: RAMP, occluders: [scene.getObjectByName('doi')].filter(Boolean) });
    castle.add(kc.group);
    kc.setGlow(2.2);   // > 1 để lớp loá sáng bắt vào nét
    // số thực nửa độ chính xác: màu nét > 1 để lớp loá sáng bắt vào (khung 8 bit kẹp ở 1 → sáng mà không loá)
    lineRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(1, 1) });
  }
  // màn mở: nét kết cấu phát sáng vẽ từ đỉnh xuống (lineA: độ đục, lineCutY: độ cao thế giới của ngọn bút)
  let lineA = 0, lineCutY = 1e4;
  // PHẦN 3 chạng vạng: nét kết cấu 緑青 mọc từ chân nền đá (duskL: độ sáng, duskY: ngọn nét — m, thế giới)
  let duskL = 0, duskY = -10;
  function drawLines(dt) {
    const on = kc && INK.uInkOn.value > 0.5;
    const introL = !!kc && lineA > 0.001 && !api.introNoLines;   // api.introNoLines: bài kiểm xem riêng mép mực
    const dL = duskL > 0.001;   // (p7b) chạng vạng = ánh hắt lên mặt nền đá, không cần lớp nét
    if (!post || !post.ghep) return;
    const U = post.ghep.uniforms;
    U.get('uOn').value = on ? 1 : 0;
    U.get('uInkOn').value = INK.uInkOn.value;
    U.get('uInkT').value = INK.uInkT.value;
    U.get('uInkMode').value = INK.uInkMode.value;
    U.get('uInkNum').value = INK.uInkNum.value;   // số: bộ uniform của lớp ghép giữ BẢN SAO, phải chép mỗi khung (Vector3 thì dùng chung)
    U.get('uIntroL').value = introL ? lineA : 0;
    U.get('uLineCut').value = lineCutY;
    U.get('uDuskL').value = dL ? duskL : 0;
    U.get('uDuskY').value = duskY;
    // không có vết cọ, không có nét màn mở: lượt ghép chỉ chép nguyên ảnh → tắt hẳn lượt ấy (đỡ ~0,3 ms, hình y hệt)
    if (post.ghepPass) post.ghepPass.enabled = on || introL || dL;
    if (!on && !introL && !dL) return;
    camera.updateMatrixWorld();
    U.get('uInvProj').value.copy(camera.projectionMatrixInverse);
    U.get('uCamWorld').value.copy(camera.matrixWorld);
    if (dL) U.get('uCastleInv').value.copy(castle.matrixWorld).invert();
    if (!on && !introL) return;
    renderLines(dt);
    U.get('tLines').value = lineRT.texture;
    U.get('tLineDepth').value = lineRT.depthTexture;
  }
  // vẽ lớp nét kết cấu vào khung đệm riêng (cũng gọi MỘT lần lúc nạp để dịch sẵn shader nét: lần rê cọ đầu từng
  // gánh một khung 230–250 ms vì dịch shader giữa chừng — đo 24/9)
  function renderLines(dt) {
    // trong màn mở máy quay đổi hướng nhìn nhiều: KHÔNG dựng lại đường bao tảng theo máy (mỗi lần 60–150 ms) —
    // giữ bản dựng lúc nạp (đúng tư thế khung cuối), hết màn mở máy về đúng tư thế ấy nên không phải dựng lại
    kc.update(dt, introBusy() || scrollBusy ? null : camera);
    const a0 = renderer.getClearAlpha();
    renderer.getClearColor(clearC);
    renderer.setRenderTarget(lineRT);
    renderer.setClearColor(0x000000, 0);
    // lớp hậu kỳ đặt renderer.autoClear = false → phải tự xoá, không thì nét của các khung trước cộng dồn thành mảng trắng
    renderer.clear(true, true, true);
    camera.layers.set(2);
    renderer.render(kc.group, camera);
    camera.layers.set(0);
    renderer.setRenderTarget(null);
    renderer.setClearColor(clearC, a0);
  }
  const PLX = ink || hover;

  // ── MÀN MỞ: gắn nhánh hiện dần vào vật liệu (nhánh chỉ chạy khi uIntroOn = 1; hết màn mở thì tắt hẳn) ──
  // toà thành: hiện TỪ ĐỈNH XUỐNG, mép là quầng mực 緑青 loang. Chỉ các vật ở lớp chính (lớp nét kết cấu có màn riêng).
  castle.traverse((o) => { if (o.isMesh && (o.layers.mask & 1)) for (const m of [].concat(o.material)) if (m) addReveal(m, 'top'); });
  // đồi và rừng dưới chân thành: hiện theo VÒNG MỰC lan từ chân thành
  addReveal(hill.hill.material, 'ring');
  addReveal(hillForest.mat, 'ring');
  // sương vờn sườn (sprite): mỗi làn một vật liệu riêng để vòng mực quét qua từng làn (hình cuối không đổi)
  const unkaiSp = unkai.group.children.map((sp) => { sp.material = sp.material.clone(); return { sp, o: sp.material.opacity, c: sp.material.color.clone(), r: Math.hypot(sp.position.x, sp.position.z) }; });
  const cornerSp = (scene.getObjectByName('suong-goc') || { children: [] }).children.map((sp) => ({ sp, o: sp.material.opacity }));
  const ridgePre = [];
  ridges.group.traverse((o) => { if (/^lop-nui-sau-/.test(o.name)) ridgePre.push(o); });
  const glowO = glow.material.opacity;
  const skyHor = new THREE.Color(L.sky.horizon);
  // biến thể màn mở bật từ đầu (dịch trước), tắt đúng lúc màn mở xong
  let introVariant = INTRO_MODE;
  setRevealVariant(introVariant);

  // ── nhãn đo mẫu trên nền đá (chỉ khi có màu nhấn) ─────────────────────────
  // Kiểu nhãn TEMP của igloo: một chấm neo trên mặt đá, đường dẫn gãy khúc ra khoảng sương bên
  // phải, rồi ba dòng nhãn. Số là số dựng hình THẬT (IS), không gõ tay.
  const tagEl = document.getElementById('tag');
  const accentOn = !!document.documentElement.dataset.accent;
  let tagA = null, tagB = null, tagDot = null, tagRing = null;
  const TAG_ANCHOR = new THREE.Vector3(13.2, 7.6, 4.0);     // toạ độ trong nhóm toà thành: mặt bên phải (góc 3/4), gần góc — đường dẫn ra sương ngắn
  // máy quay gần (24/9): nhãn nhấc lên trên ngọn tuyết tùng, vào dải sương sáng — nằm trên nền lẫn ngọn cây
  // tối thì không nấc nào đọc được
  const TAG = { up: 104, run: 46, len: 236, gap: 12 };   // nhãn rơi đúng vào khoảng sương sáng bên phải (đo: p2 độ sáng 0,82)
  const svgEl = document.getElementById('plex');
  const tone = createTone(renderer, svgEl);
  if (tagEl && accentOn && (RO === 'vo' || DU)) {
    tagEl.hidden = false;
    const mm = (m) => String(Math.round(m * 1000)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
    document.getElementById('tag-size').textContent = mm(IS.baseA * 2) + ' × ' + mm(IS.baseB * 2) + ' mm';
    const batter = (Math.atan(((IS.baseA - IS.topA) * IS.p) / IS.H) * 180) / Math.PI;
    document.getElementById('tag-batter').textContent = 'Batter ' + Math.round(batter) + '°';
    const NS = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'tag-g');
    g.style.opacity = '1';
    svgEl.appendChild(g);
    // đường dẫn = hai đoạn (xiên trên mặt đá, ngang ra khoảng sương), mỗi đoạn đổi nấc dọc theo nền
    const la = document.createElementNS(NS, 'line'), lb = document.createElementNS(NS, 'line');
    la.setAttribute('class', 'tag-lead'); lb.setAttribute('class', 'tag-lead');
    g.appendChild(la); g.appendChild(lb);
    tagA = tone.stroke(la, 1.6); tagB = tone.stroke(lb, 1.6);
    tagRing = document.createElementNS(NS, 'circle'); tagRing.setAttribute('class', 'tag-ring'); tagRing.setAttribute('r', '6.5');
    tagDot = document.createElementNS(NS, 'circle'); tagDot.setAttribute('class', 'tag-dot'); tagDot.setAttribute('r', '2.8');
    g.appendChild(tagRing); g.appendChild(tagDot);
  }
  const tagV = new THREE.Vector3(), tagTmp = new THREE.Vector3();
  const tagStone = hover.stoneNear(TAG_ANCHOR);
  let tagAt = { x: 0, y: 0 };
  function placeTag() {
    if (!tagA) return;
    castle.updateMatrixWorld();
    tagV.copy(TAG_ANCHOR).add(hover.posOf(tagStone, tagTmp)).sub(tagStone.c0).applyMatrix4(castle.matrixWorld).project(camera);
    const w = window.innerWidth, h = window.innerHeight;
    const x = ((tagV.x + 1) / 2) * w, y = ((1 - tagV.y) / 2) * h;
    const x1 = x + TAG.run, y1 = y - TAG.up, x2 = x1 + TAG.len;
    tone.place(tagA, x, y, x1, y1);
    tone.place(tagB, x1, y1, x2, y1);
    tagDot.setAttribute('cx', x.toFixed(1)); tagDot.setAttribute('cy', y.toFixed(1));
    tagRing.setAttribute('cx', x.toFixed(1)); tagRing.setAttribute('cy', y.toFixed(1));
    tagAt = { x, y };
    tagEl.style.transform = `translate(${(x2 + TAG.gap).toFixed(1)}px, ${(y1 - 11).toFixed(1)}px)`;
  }
  // nét của lớp chấm-nét-số: bọc từng nét để có quầng + dải chuyển nấc
  const plexStrokes = [];
  for (const pe of PLX.plexEls) for (const ln of pe.lines) plexStrokes.push(tone.stroke(ln, 1.6));
  function syncPlex() {
    for (const S of plexStrokes) {
      const e = S.el, op = +(e.style.opacity || 0);
      tone.place(S, +(e.getAttribute('x1') || 0), +(e.getAttribute('y1') || 0), +(e.getAttribute('x2') || 0), +(e.getAttribute('y2') || 0));
      S.halo.style.opacity = String(op * 0.34);
    }
  }
  // Vài lần mỗi giây: đọc điểm ảnh khung vừa vẽ ngay sau từng chữ / chấm / nét, chọn nấc
  let toneT = 0, toneAge = 0, toneOn = RO === 'vo' || DU;   // ngọn cọ mặc định: không có số/nhãn nào cần chọn nấc theo nền
  api.toneAge = () => toneAge;                 // số khung kể từ lần chép khung gần nhất (săn nháy đen)
  api.setTone = (v) => { toneOn = !!v; };
  function toneAll() {
    const taken = [];
    for (const pe of PLX.plexEls) if (pe.at && +(pe.g.style.opacity || 0) >= 0.05) taken.push({ x: pe.at.x - 5, y: pe.at.y - 5, w: 10, h: 10 });
    for (const pe of PLX.plexEls) {
      if (!pe.at || +(pe.g.style.opacity || 0) < 0.05) continue;
      tone.placeNumber(pe, taken);
      const bw = pe.txt.textContent.length * 7.9 + 2;
      taken.push({ x: pe.at.x + pe.off[0] - 1, y: pe.at.y + pe.off[1] - 11, w: bw, h: 13 });
      if (pe.box) tone.toneText(pe.txt, { x: pe.at.x + pe.off[0] - 3, y: pe.at.y + pe.off[1] - 13, w: bw + 4, h: 17 });
      tone.toneDot(pe.dot, pe.halo, pe.at.x, pe.at.y);
    }
    for (const S of plexStrokes) if (+(S.el.style.opacity || 0) > 0.05) tone.toneStroke(S);
    if (tagA) {
      tone.toneStroke(tagA); tone.toneStroke(tagB);
      tone.toneDot(tagDot, tagRing, tagAt.x, tagAt.y);
      tagRing.style.fill = 'none'; tagRing.style.stroke = tagDot.style.fill;
      tone.toneHTML(document.getElementById('tag-size'));
      tone.toneHTML(document.getElementById('tag-batter'));
    }
  }
  api.toneNow = () => { toneAll(); return true; };

  // MÀN MỞ: máy quay treo cao nhìn chếch xuống rồi hạ về khung của phần 1 — trộn theo trọng số introW (kiểu
  // introWeight của igloo): phần sau (cuộn) chỉ việc đổi đích cuối, cuộn sớm không làm hình giật.
  let introW = 1, touchK = 1;
  const HI = { daz: 0.42, dist: 1.22, y: 74, ty: 12 };
  const tgtI = new THREE.Vector3(), tgtC = new THREE.Vector3();
  // PHẦN 3 — cuộn ở màn đầu: máy quay LÙI và HẠ theo keyframe (hubtown mục 2.3: cả quãng qua sine.inOut, từng đoạn bezier
  // (0,5, 0 · 0,5, 1), không làm mượt thêm). CK = độ lệch so với khung màn đầu (τ = 0 → lệch 0: về đúng khung cũ).
  const CK = { dist: 1, y: 0, ty: 0, az: 0 };
  // (Mike 30/9, luật "một cú máy": trong quãng mực thấm, thung lũng bên trong giọt mực bay TỚI — toà thành mà LÙI ra thì hai cảnh đi
  // ngược chiều nhau) → toà thành cũng TIẾN vào (quãng 1 → 0,84), hạ thấp và chúi dần như cũ: cả chuyển cảnh là một cú lao tới vào mực
  const CKEY = { dist: [[0, 1], [0.55, 0.91], [1, 0.84]], y: [[0, 0], [0.55, -2.6], [1, -5.2]], ty: [[0, 0], [0.55, -5.5], [1, -8.8]], az: [[0, 0], [1, 0.075]] };
  // (Mike 30/9: "hai cú máy" — đo chuyển cảnh 1: kf() nắn TỪNG ĐOẠN bằng ease vào–ra nên ở mốc 0,55 cả lùi / hạ / chúi cùng DỪNG rồi chạy
  // lại — tốc độ máy hai đỉnh 35 → 11 → 32 đv/s) → nội suy lập phương ĐƠN ĐIỆU qua các mốc (Fritsch–Carlson, không dừng ở mốc giữa);
  // nhịp ease duy nhất là Z.ct = sineIO của cả quãng
  const kfm = (keys, t) => {
    const n = keys.length;
    if (t <= keys[0][0]) return keys[0][1];
    if (t >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 1; while (t > keys[i][0]) i++;
    const sl = (k) => (keys[k + 1][1] - keys[k][1]) / (keys[k + 1][0] - keys[k][0]);
    const tan = (k) => { if (k === 0) return sl(0); if (k === n - 1) return sl(n - 2); const a = sl(k - 1), b = sl(k); return a * b <= 0 ? 0 : (2 * a * b) / (a + b); };
    const [t0, v0] = keys[i - 1], [t1, v1] = keys[i], h = t1 - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * tan(i - 1) * h + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * tan(i) * h;
  };
  function place(t) {
    if (introW < 1) { placeIntro(t); return; }
    const br = Math.sin(t * 0.34) * 0.009;
    const az = azim + CK.az + br * 0.5 + tiltYaw;
    const dd = dist * CK.dist;
    camera.position.set(Math.sin(az) * dd, camY + CK.y + br * 6 + tiltPitch * dd, Math.cos(az) * dd);
    tgtC.set(TARGET.x, TARGET.y + CK.ty, TARGET.z);
    fwd.subVectors(tgtC, camera.position).normalize();
    right.crossVectors(fwd, UP).normalize();
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const shift = shiftFrac * 2 * tanH * dd;
    camera.position.addScaledVector(right, shift);
    camera.lookAt(tgtC.addScaledVector(right, shift));
  }

  function placeIntro(t) {
    const w = introW, lerp = (a, b) => a + (b - a) * w;
    const br = Math.sin(t * 0.34) * 0.009;
    const az = lerp(azim + HI.daz, azim + CK.az + br * 0.5 + tiltYaw);
    const d = lerp(dist * HI.dist, dist * CK.dist);
    const cy = lerp(HI.y, camY + CK.y + br * 6 + tiltPitch * dist * CK.dist);
    tgtI.set(TARGET.x, lerp(HI.ty, TARGET.y + CK.ty), TARGET.z);
    camera.position.set(Math.sin(az) * d, cy, Math.cos(az) * d);
    fwd.subVectors(tgtI, camera.position).normalize();
    right.crossVectors(fwd, UP).normalize();
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const shift = shiftFrac * 2 * tanH * d;
    camera.position.addScaledVector(right, shift);
    camera.lookAt(tgtI.addScaledVector(right, shift));
  }

  function fit() {
    const w = window.innerWidth, h = window.innerHeight;
    portrait = h > w;
    camera.fov = portrait ? CAM.fovP : 34;
    dist = portrait ? CAM.distP : CAM.dist;
    shiftFrac = portrait ? 0 : CAM.shift;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (lineRT) { const s = renderer.getDrawingBufferSize(new THREE.Vector2()); lineRT.setSize(s.x, s.y); }
    if (valley) { valley.resize(w, h); if (valleyRT) { const s = renderer.getDrawingBufferSize(new THREE.Vector2()); valleyRT.setSize(s.x, s.y); jSnap = -1; } }
    if (quarry) quarry.resize(w, h);
    if (rung) rung.resize(w, h);
    if (lang) lang.resize(w, h);
    if (viec) { viec.resize(w, h); if (planRT) { const s = renderer.getDrawingBufferSize(new THREE.Vector2()); planRT.setSize(s.x, s.y); if (viec.built) viec.renderPlan(planRT); } }
    if (cua) { const s = renderer.getDrawingBufferSize(new THREE.Vector2()); cua.resize(w, h, s.x, s.y); }
    if (lienhe) lienhe.resize(w, h);
    if (post) post.resize();
    place(0);
  }

  // ── lớp hậu kỳ (giữ nguyên chuỗi), chỉ đổi thông số nắn màu theo bản không khí ─────────────
  const mod = await import('../post/index.js').catch((e) => {
    console.error('[kozo] KHÔNG NẠP ĐƯỢC LỚP HẬU KỲ ../post/index.js', e);
    throw e;
  });
  const S = mod.MODES.scene;
  S.dof.bokehScale = 0.85;
  // KHOẢNG NÉT tính bằng MÉT THẬT (postprocessing ≥ 6.36 đổi sang đơn vị thế giới): 0,22 cũ = chỉ một lát 22 cm quanh điểm
  // lấy nét là nét → cả toà thành (sâu ~30 m) bị nhoè nhẹ (đo 28/9: độ gắt mép toà thành 6,2 → 9,6 khi đặt 45 m; núi xa
  // vẫn mờ như cũ). Nhiễu sắc ở mép giảm một nửa (cũng làm mềm mép ngói).
  S.dof.focusRange = NET0 ? 0.22 : 45;
  if (!NET0) S.chroma = 0.0006;
  Object.assign(S.grade, L.grade);
  S.target = Object.assign({}, S.target, L.target);
  S.bloom.threshold = L.bloom.threshold;
  S.bloom.intensity = L.bloom.intensity;
  S.godRays.weight = L.god.weight;
  S.godRays.exposure = L.god.exposure;
  post = mod.createPost(renderer, scene, camera, { mode: 'scene', ink: RO === 'muc' ? { glsl: INK_GLSL(), uniforms: { ...INK } } : null, chuyen: true, cas: CAS });
  buoc(0.22, 'post'); await nhuong();

  fit();
  window.addEventListener('resize', fit);
  if (kc) kc.prepare(camera);   // dò hình tảng + đường bao một lần lúc nạp, ở đúng tư thế khung cuối (không dồn vào lần rê cọ đầu)

  // ── LÀM NÓNG trong lúc màn chờ còn hiện (như igloo mục 1.1): dịch SẴN mọi shader SONG SONG (KHR_parallel_shader_compile:
  // luồng chính không phải chờ → màn chờ vẫn chạy đều), phần trăm của màn chờ = số chương trình shader đã dịch xong.
  // Sau đó mới vẽ thử (đo phơi sáng) — lúc ấy mọi shader đã sẵn, không còn cú đứng hình dài.
  const warm = { t0: performance.now() };
  api.warm = warm;
  // tam giác phủ màn đúng kiểu của chuỗi hậu kỳ: CHỈ có vị trí + toạ độ ảnh (có thêm pháp tuyến là khoá chương trình
  // khác đi → 24 chương trình hậu kỳ bị dịch lần hai lúc vẽ thử — đo 25/9)
  function fullTri() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    return g;
  }
  function postMaterials() {
    const seen = new Set(), mats = new Set();
    const visit = (o, d) => {
      if (!o || typeof o !== 'object' || seen.has(o) || d > 6) return;
      seen.add(o);
      if (o.isMaterial) { mats.add(o); return; }
      if (o === renderer || o === scene || o === camera || o.isTexture || o.isWebGLRenderTarget || o.isBufferGeometry || o.isCamera || ArrayBuffer.isView(o)) return;
      if (o.isObject3D) { if (o.material) visit(o.material, d + 1); for (const c of o.children) visit(c, d + 1); return; }
      if (o instanceof Map) { o.forEach((v) => visit(v, d + 1)); return; }
      if (Array.isArray(o)) { for (const v of o) visit(v, d + 1); return; }
      for (const k in o) { if (k === 'renderer' || k === '_listeners') continue; const v = o[k]; if (v && typeof v === 'object') visit(v, d + 1); }
    };
    // lượt sương bay (chuyển cảnh 3) KHÔNG dịch ở màn chờ: dịch ngầm sau màn mở cùng shader rừng (giữ nguyên thời gian mở trang)
    // (lượt cửa giấy của chuyển cảnh 4 cũng vậy: dịch ngầm cùng shader làng giấy)
    // (phần 9: lượt hoà cảnh của chuyển cảnh 6 cũng dịch ngầm, cùng lúc dựng chương 連絡)
    for (const ps of post.composer.passes) if (ps !== post.bayPass && ps !== post.shojiPass && ps !== post.duongPass) visit(ps, 0);
    const scr = post.composer.passes.filter((ps) => ps.enabled && ps.renderToScreen && ps.fullscreenMaterial).map((ps) => ps.fullscreenMaterial);
    // (soát p9a B1) nấc 2 tắt lượt làm nét → lượt khử răng cưa thành lượt ra màn (post.syncScreen): dịch sẵn cả biến thể ra màn
    // của nó ở màn chờ — máy tự vào nấc 2 (chip tích hợp, điện thoại) không phải dịch lúc khung đầu tiên hiện ra
    if (post.casPass && post.smaaPass && post.smaaPass.fullscreenMaterial && !scr.includes(post.smaaPass.fullscreenMaterial)) scr.push(post.smaaPass.fullscreenMaterial);
    return { all: [...mats], scr };
  }
  function compileAll() {
    const RT = post.composer.inputBuffer;
    const prev = renderer.getRenderTarget();
    // cảnh chính (vẽ vào khung đệm của chuỗi hậu kỳ). Lớp nét kết cấu vẽ riêng (gốc là kc.group, không có đèn) →
    // dịch riêng đúng kiểu ấy, không thì lần vẽ nét đầu tiên phải dịch lại
    if (kc) castle.remove(kc.group);
    renderer.setRenderTarget(RT);
    renderer.compile(scene, camera);
    // có màn mở: vật liệu có HAI biến thể (đang hiện dần / khung cuối) — dịch sẵn cả hai, lúc đổi không phải dịch lại
    if (INTRO_MODE) { setRevealVariant(!introVariant); renderer.compile(scene, camera); setRevealVariant(introVariant); }
    if (kc) { castle.add(kc.group); renderer.setRenderTarget(lineRT); renderer.compile(kc.group, camera); }
    // chuỗi hậu kỳ: mọi vật liệu của các lượt (kể cả lượt con bên trong từng hiệu ứng), dịch trên một tam giác phủ màn
    const pm = postMaterials();
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = fullTri();
    const dA = new THREE.Scene(), dB = new THREE.Scene();
    for (const m of pm.all) dA.add(new THREE.Mesh(quad, m));
    for (const m of pm.scr) dB.add(new THREE.Mesh(quad, m));
    renderer.setRenderTarget(RT);
    renderer.compile(dA, ortho);
    renderer.setRenderTarget(null);
    renderer.compile(dB, ortho);
    renderer.setRenderTarget(prev);
    warm.postMats = pm.all.length;
  }
  // ?dodich=1 — BÀI ĐO (không dùng trên trang): dịch TỪNG vật một, chờ dịch xong mới sang vật sau, ghi mỗi chương trình
  // shader mất bao lâu (trình duyệt mới tinh: chưa nhớ shader nào) → biết chương trình nào nặng nhất
  if (QS.get('dodich') === '1') {
    const gl = renderer.getContext(), P = renderer.info.programs, out = [];
    const RT = post.composer.inputBuffer, prev = renderer.getRenderTarget();
    const one = (root, cam, target, rt, label) => {
      const n0 = P.length;
      renderer.setRenderTarget(rt);
      const t0c = performance.now();
      renderer.compile(root, cam, target);
      const tJs = performance.now() - t0c;
      for (let i = n0; i < P.length; i++) {
        const t1 = performance.now();
        gl.getProgramParameter(P[i].program, gl.LINK_STATUS);   // chặn tới khi dịch + nối xong
        const src = {};
        if (QS.get('nguon') === '1') for (const sh of gl.getAttachedShaders(P[i].program)) src[gl.getShaderParameter(sh, gl.SHADER_TYPE) === gl.VERTEX_SHADER ? 'vs' : 'fs'] = gl.getShaderSource(sh);
        out.push({ ms: Math.round(performance.now() - t1), js: Math.round(tJs), ten: P[i].name, vat: label, khoa: P[i].cacheKey, src });
      }
    };
    if (kc) castle.remove(kc.group);
    const objs = [];
    scene.traverse((o) => { if (o.material && (o.isMesh || o.isSprite || o.isPoints || o.isLine)) objs.push(o); });
    for (const variant of INTRO_MODE ? [true, false] : [false]) {
      setRevealVariant(variant);
      for (const o of objs) one(o, camera, scene, RT, (o.name || o.parent && o.parent.name || o.type) + (variant ? ' [màn mở]' : ''));
    }
    setRevealVariant(introVariant);
    if (kc) { castle.add(kc.group); kc.group.traverse((o) => { if (o.material && o.isMesh) one(o, camera, kc.group, lineRT, 'nét kết cấu · ' + o.name); }); }
    const pm = postMaterials();
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = fullTri();
    for (const m of pm.all) { const d = new THREE.Scene(); d.add(new THREE.Mesh(quad, m)); one(d, ortho, d, RT, 'hậu kỳ · ' + (m.name || m.type)); }
    for (const m of pm.scr) { const d = new THREE.Scene(); d.add(new THREE.Mesh(quad, m)); one(d, ortho, d, null, 'hậu kỳ ra màn · ' + (m.name || m.type)); }
    // lần VẼ đầu của từng vật (chỉ vật ấy hiện, cảnh đủ đèn) — trên Windows lần vẽ đầu có thể còn phải dịch thêm
    if (QS.get('dove') === '1') {
      renderer.setRenderTarget(RT);
      const vis = objs.map((o) => o.visible);
      for (const o of objs) o.visible = false;
      for (let k = 0; k < objs.length; k++) {
        const o = objs[k];
        if (!vis[k]) continue;
        o.visible = true;
        const t2 = performance.now();
        renderer.render(scene, camera);
        gl.finish();
        out.push({ ms: Math.round(performance.now() - t2), js: 0, ten: 've', vat: 'VẼ ĐẦU · ' + (o.name || o.parent && o.parent.name || o.type), khoa: '' });
        o.visible = false;
      }
      objs.forEach((o, k) => { o.visible = vis[k]; });
      renderer.setRenderTarget(prev);
    }
    api.dodich = out;
  }
  // DỊCH DẦN (bước B 25/9): mỗi lúc chỉ để K chương trình đang dịch, mỗi khung chỉ hỏi "xong chưa" với chúng — trên Windows
  // lần hỏi trúng chương trình vừa dịch xong phải làm nốt phần cuối ngay trên luồng đồ hoạ, hỏi cả 56 cái một lúc thì
  // màn chờ đứng hình cả giây. Rồi VẼ ĐẦU từng vật một (mỗi khung một ít): lần vẽ đầu cũng còn phải dựng thêm.
  async function warmProgressive(onCompiled) {
    const RT = post.composer.inputBuffer, P = renderer.info.programs;
    const K = Math.max(1, +(QS.get('k') || 10));   // 10 chương trình cùng lúc: đo 25/9 — 3 thì chậm (9 s), 6 thì đứng hình từng giây, 10 thì 4,8–5 s không đứng hình
    const units = [];
    if (kc) castle.remove(kc.group);
    const objs = [];
    scene.traverse((o) => { if (o.material && (o.isMesh || o.isSprite || o.isPoints || o.isLine)) objs.push(o); });
    for (const o of objs) units.push({ root: o, cam: camera, target: scene, rt: RT, obj: o });
    const kcObjs = [];
    if (kc) kc.group.traverse((o) => { if (o.material && o.isMesh) { kcObjs.push(o); units.push({ root: o, cam: camera, target: kc.group, rt: lineRT, kc: o }); } });
    const pm = postMaterials();
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = fullTri();
    for (const m of pm.all) { const d = new THREE.Scene(); d.add(new THREE.Mesh(quad, m)); units.push({ root: d, cam: ortho, target: d, rt: RT }); }
    for (const m of pm.scr) { const d = new THREE.Scene(); d.add(new THREE.Mesh(quad, m)); units.push({ root: d, cam: ortho, target: d, rt: null }); }
    const inflight = [], firstDraw = [];
    let ui = 0;
    while (ui < units.length || inflight.length) {
      const tf = performance.now();
      // mỗi khung gửi đi dịch nhiều nhất GUI đơn vị (?gui=, mặc định 10): khâu dịch sang HLSL của Windows chạy ngay trên
      // luồng đồ hoạ — gửi dồn 10 cái một khung thì màn chờ đứng 1,5–2,5 s (đo 25/9, 3 trên 5 lần)
      const GUI = Math.max(1, +(QS.get('gui') || 10));
      let sent = 0;
      while (ui < units.length && inflight.length < K && sent < GUI && performance.now() - tf < 40) {
        sent++;
        const u = units[ui++], n0 = P.length;
        renderer.setRenderTarget(u.rt);
        renderer.compile(u.root, u.cam, u.target);
        for (let i = n0; i < P.length; i++) inflight.push(P[i]);
        if (P.length > n0 && (u.obj || u.kc)) firstDraw.push(u);
      }
      for (let i = inflight.length - 1; i >= 0; i--) if (inflight[i].isReady()) inflight.splice(i, 1);
      buoc(0.25 + 0.55 * ((ui - inflight.length) / units.length), 'shaders ' + P.length);
      await nhuong();
    }
    warm.programs = P.length;
    warm.readyMs = Math.round(performance.now() - warm.t0);
    if (onCompiled) onCompiled();
    // vẽ đầu: chỉ vật đại diện cho mỗi chương trình mới, mỗi khung vẽ tới khi hết ~40 ms
    renderer.setRenderTarget(RT);
    const vis = objs.map((o) => o.visible);
    for (const o of objs) o.visible = false;
    const kcVis = kcObjs.map((o) => o.visible);
    for (const o of kcObjs) o.visible = false;
    let fi = 0;
    while (fi < firstDraw.length) {
      const tf = performance.now();
      while (fi < firstDraw.length && performance.now() - tf < 40) {
        const u = firstDraw[fi++];
        const td = performance.now();
        if (u.obj) { const k = objs.indexOf(u.obj); if (!vis[k]) continue; u.obj.visible = true; renderer.setRenderTarget(RT); renderer.render(scene, camera); u.obj.visible = false; }
        else { u.kc.visible = true; renderer.setRenderTarget(lineRT); camera.layers.set(2); renderer.render(kc.group, camera); camera.layers.set(0); u.kc.visible = false; }
        (warm.fd = warm.fd || []).push([Math.round(performance.now() - td), (u.obj || u.kc).name || (u.obj || u.kc).type]);
      }
      buoc(0.80 + 0.1 * (fi / firstDraw.length), 'first draw ' + fi + '/' + firstDraw.length);
      await nhuong();
    }
    objs.forEach((o, k) => { o.visible = vis[k]; });
    kcObjs.forEach((o, k) => { o.visible = kcVis[k]; });
    renderer.setRenderTarget(null);
    if (kc) castle.add(kc.group);
    warm.drawMs = Math.round(performance.now() - warm.t0) - warm.readyMs;
    warm.firstDraws = firstDraw.length;
  }
  // PHẦN 3 + 4 — thung lũng + mỏ đá: tạo vật liệu + khung đệm, và GỬI ĐI DỊCH ngay khi toà thành DỊCH XONG — trong lúc toà thành
  // còn VẼ ĐẦU (việc không cần trình dịch) thì hai chương trình mới dịch song song.
  //   · gửi SAU CẢ lượt vẽ đầu (bản phần 3): hai lượt nối đuôi, mở trang lần đầu 7,1 s (đo 28/9, shader mỏ đá lúc ấy dịch ~1 s);
  //   · gửi NGAY TỪ ĐẦU: nhanh (4,5 s) nhưng màn chờ đứng hình 0,45–0,72 s — trình dịch của Windows chạy từng việc một, luồng
  //     chính chốt chương trình toà thành phải chờ shader mỏ đá dịch xong.
  const tW0 = performance.now();
  valley = createValley(renderer);
  api.valley = valley;
  valley.resize(window.innerWidth, window.innerHeight);
  quarry = createQuarry(renderer);
  api.quarry = quarry;
  quarry.resize(window.innerWidth, window.innerHeight);
  // rừng: chỉ tạo vật liệu + cảnh rỗng (không dịch gì ở màn chờ)
  rung = createRung(renderer);
  api.rung = rung;
  rung.resize(window.innerWidth, window.innerHeight);
  // làng giấy: cũng chỉ tạo vật liệu + cảnh rỗng
  lang = createLang(renderer);
  api.lang = lang;
  lang.resize(window.innerWidth, window.innerHeight);
  // 仕事: cũng chỉ tạo vật liệu + cảnh rỗng + lớp chữ HTML (ẩn) — dịch và dựng ngầm sau làng giấy (vbStep)
  viec = createViec(renderer);
  api.viec = viec;
  viec.resize(window.innerWidth, window.innerHeight);
  cua = createCua();
  api.cua = cua;
  { const s = renderer.getDrawingBufferSize(new THREE.Vector2()); cua.resize(window.innerWidth, window.innerHeight, s.x, s.y); }
  // mỏ đá (28/9, hướng A chương 骨): KHÔNG dịch / vẽ đầu ở màn chờ nữa — mở trang lần đầu tụt quá trần 5,5 s. Dịch ngầm SAU màn
  // mở ở bước dựng mỏ đá (qbStep: mỗi khung một lưới, KHR_parallel_shader_compile — luồng chính không chờ), rồi vẽ đầu từng lưới.
  let freshVQ = [];
  const submitVQ = () => {
    const s0 = renderer.getDrawingBufferSize(new THREE.Vector2());
    // một khung đệm cho "cảnh đến" của CẢ HAI lần chuyển (không bao giờ chạy cùng lúc)
    valleyRT = new THREE.WebGLRenderTarget(s0.x, s0.y, { type: THREE.HalfFloatType, depthBuffer: true });
    // (p7b, soát p7a B5: shader thung lũng không dịch ở màn chờ nữa — dịch ngầm lúc màn mở, xem bgStep)
    freshVQ = [];
    warm.valleySubmitAt = Math.round(performance.now() - warm.t0);
  };
  warm.valleyMakeMs = Math.round(performance.now() - tW0);
  await warmProgressive(submitVQ);
  // …rồi chờ (thường đã xong), VẼ ĐẦU hai chương trình mới bằng hình giả, và vẽ đầu các lượt hậu kỳ mới (chuyển cảnh, khung).
  // Lưới thật vẫn dựng NGẦM sau màn mở (từng mẩu nhỏ mỗi khung).
  {
    const tW = performance.now();
    const fresh = freshVQ;
    while (fresh.some((pg) => !pg.isReady())) { buoc(0.905, 'valley shaders'); await nhuong(); }
    const small = new THREE.WebGLRenderTarget(64, 32, { type: THREE.HalfFloatType, depthBuffer: true });
    // ba lượt hậu kỳ mới (mực thấm · nét chổi quét · lớp khung)
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), sc0 = new THREE.Scene(), tri = fullTri();
    for (const ps of [post.chuyenPass, post.quetPass, post.suongPass, post.khungPass]) { const m = new THREE.Mesh(tri, ps.fullscreenMaterial); m.frustumCulled = false; sc0.add(m); }
    renderer.setRenderTarget(small); renderer.render(sc0, ortho);
    // khung đệm thung lũng: cấp bộ nhớ ngay (xoá một lần)
    renderer.setRenderTarget(valleyRT); renderer.clear(true, true, true);
    renderer.setRenderTarget(null);
    small.dispose(); tri.dispose();
    warm.valleyMs = Math.round(performance.now() - tW);
    buoc(0.92, 'valley ready'); await nhuong();
  }
  const progs0 = renderer.info.programs.length;
  if (kc) renderLines(0);
  post.focusTarget.set(0, 16, 0);
  post.focusNow.set(0, 16, 0);
  // Đo phơi sáng cho CẢNH, không cho đèn: lõi sáng và viền vát là thứ phát sáng của toà thành — để chúng
  // vào phép đo thì cả bầu trời, núi, sương tối đi (không khí đã duyệt đổi theo). Tắt tạm lúc đo.
  const coreRest0 = M.stoneCore.userData.hot.uRest.value, bevel0 = M.stone.userData.u.uBevel.value;
  M.stoneCore.userData.hot.uRest.value = 0.15; M.stone.userData.u.uBevel.value = 0;
  if (INTRO_MODE) setRevealVariant(false);   // đo phơi sáng trên KHUNG CUỐI (biến thể cuối) — cũng là lần vẽ thử của biến thể ấy
  // vẽ thử bằng biến thể CUỐI (đúng hình phần 1 để đo phơi sáng, và để card đồ hoạ dựng sẵn bản chạy của chương trình
  // ấy — lần vẽ đầu của một chương trình trên Windows còn phải dịch thêm, đo 24/9: khựng 155–188 ms lúc đổi biến thể)
  if (INTRO_MODE) setRevealVariant(false);
  api.calib = await post.calibrateAsync(nhuong);
  if (INTRO_MODE) setRevealVariant(true);
  M.stoneCore.userData.hot.uRest.value = coreRest0; M.stone.userData.u.uBevel.value = bevel0;
  warm.calibMs = Math.round(performance.now() - warm.t0) - warm.readyMs - (warm.drawMs || 0);
  warm.lateProgs = renderer.info.programs.length - progs0;   // chương trình phải dịch NGAY lúc vẽ thử (chưa dịch sẵn được)
  warm.late = renderer.info.programs.slice(progs0).map((pg) => pg.name + ' · ' + (QS.get('dodich') === '1' ? pg.cacheKey : pg.cacheKey.slice(0, 90)));
  buoc(0.94, 'calibrate');
  if (window.innerWidth < 900) post.setQuality(0.6);
  // nhoè hậu cảnh vẽ ở 0,45 thay vì 0,6 độ phân giải (lớp này vốn là vùng mờ) — ?dofr=0.6 để so
  post.dof.resolution.scale = QS.has('dofr') ? parseFloat(QS.get('dofr')) : 0.45;
  const bloomBase = post.bloom.intensity;
  const dofBase = post.dof.bokehScale;

  // ── MÀN MỞ: bộ điều khiển — mọi thứ đọc từ introState(t) (scene/intro.js), nên ?t=… đứng hình đúng một trạng thái ──
  const loadEl = document.getElementById('load'), loadIn = loadEl && loadEl.querySelector('.load-in');
  const mistEl = document.getElementById('mist'), sealEl = document.getElementById('seal');
  const TOPY = api.build.topY || 40;
  const REV_TOP = TOPY + 3, REV_BOT = -4, LINE_TOP = TOPY + 2, LINE_BOT = -3;
  // vòng mực: từ chân thành (12 m) ra tới chân trời biển mây (3,2 km) — bình phương tiến độ để quãng gần chân thành
  // (đồi, rừng) đi chậm, đủ cho mắt thấy vòng lan
  const R0 = 12, RMAX = 3200;
  const ringR = (u) => R0 + (RMAX - R0) * Math.pow(u, 2.2);
  const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  let brushOn = !INTRO_MODE, lastPtr = null;
  let introBloomK = 1, gateIntro = 1, gateScroll = 1;   // phần 3: cọ yếu dần theo chạng vạng (gateScroll)
  let mistRise = INTRO_MODE ? 0 : 1;   // sương thung lũng sau chữ màn đầu (khổ dọc): dâng lên cùng lúc chữ hiện
  function applyIntro(S) {
    const on = !S.done;
    mistRise = on ? sm(4.0, 5.4, IN.t) : 1;
    INTRO.uIntroOn.value = on ? 1 : 0;
    INTRO.uRevY.value = S.rev >= 1 ? -1e4 : REV_TOP + (REV_BOT - REV_TOP) * S.rev;   // hiện xong: mọi điểm ảnh bỏ qua nhánh
    // mép vòng mực đi trước (inOut1), cảnh thật theo sau (inOut3) nhưng không tụt quá một dải mép (loang, không phải
    // một vùng mực rộng); trước giây 0,7 chưa có gì
    let rI = ringR(S.ringI), rT = ringR(S.ringT);
    rT = Math.max(rT, rI - (9 + 0.2 * rI));
    if (S.ringI <= 0) { rI = -50; rT = -60; }
    INTRO.uRingT.value = rT; INTRO.uRingI.value = rI;
    INTRO.uFlat.value = on ? S.flat : 0;
    INTRO.uRidgeA.value = on ? S.ridge : 1;
    INTRO.uRidgeLow.value = on ? S.ridgeLow : 0;
    // lượt ghi độ sâu của núi chỉ bật khi núi đã đục hẳn và chân núi hết tan (không thì lõi lớp gần "cắt" lớp xa thành mép cứng)
    for (const o of ridgePre) o.visible = !on || S.ridge >= 1;   // chân núi giờ tan về màu nền mà vẫn đục → bật lại ngay khi núi đục hẳn
    // màu nền phía trước vòng gợn: sương phẳng lúc đầu → chân trời thật khi trời chuyển màu
    INTRO.uLeadC.value.copy(skyHor).lerp(INTRO.uMistC.value, on ? S.flat : 0);
    // lượt ghi độ sâu của núi để BẬT cả lúc núi đang hiện dần (đỡ 1,7 ms): lớp xa khuất sau lõi lớp gần thì không vẽ —
    // lúc mờ dần chỉ khác ở chỗ ấy, mắt không thấy
    lineA = on ? S.lineA : 0;
    lineCutY = LINE_TOP + (LINE_BOT - LINE_TOP) * S.lineCut;
    introW = on ? S.cam : 1;
    touchK = on ? S.touch : 1;
    introBloomK = on ? S.bloom : 1;
    post.bloom.intensity = bloomBase * introBloomK;
    // chiều sâu trường ảnh: máy trên cao nhìn xuống thì cảnh nét hết (như igloo); nhoè hậu cảnh trở lại theo máy hạ xuống.
    // (máy cao + mép vòng mực làm lớp nhoè vẽ một đường sáng gãy khúc trên đồi — đo 24/9)
    post.dof.bokehScale = on ? dofBase * S.cam : dofBase;
    for (const u of unkaiSp) {
      if (on) { u.sp.material.opacity = u.o * (1 - sm(rI - 70, rI + 10, u.r)); u.sp.material.color.copy(u.c); }
      else { u.sp.material.opacity = u.o; u.sp.material.color.copy(u.c); }
      u.sp.visible = u.sp.material.opacity > 0;   // trong suốt hẳn thì không vẽ (làn sương to, chồng nhiều lớp)
    }
    for (const c of cornerSp) { c.sp.material.opacity = on ? c.o * S.corner : c.o; c.sp.visible = c.sp.material.opacity > 0; }
    ridges.group.visible = !on || S.ridge > 0;
    // xong phần hiện dần của nhóm nào thì nhóm ấy về NGAY chương trình shader cuối (không còn discard → card đồ hoạ loại
    // điểm ảnh bị che sớm; rừng tuyết tùng chồng nhiều lớp nên đỡ nhiều nhất). Hai biến thể đã dịch sẵn lúc nạp.
    if (introVariant) {
      setRevealVariant(on && S.rev < 1, 'top');
      setRevealVariant(on && rT < 560, 'ring');   // đồi rộng 520 m, mép vòng lệch ≤ 12,5 m
    }
    glow.material.opacity = on ? glowO * (1 - S.flat) : glowO;
    // lớp trang: màn chờ tan (chữ 250 ms, cả màn 750 ms), lớp sương phẳng tan trong 1 s, dấu 構, chữ giải mã
    if (loadEl) {
      if (S.load <= 0.001) loadEl.style.display = 'none';
      else { loadEl.style.display = ''; loadEl.style.transition = 'none'; loadEl.style.opacity = S.load.toFixed(3); if (loadIn) loadIn.style.opacity = S.loadText.toFixed(3); }
    }
    if (mistEl) { if (S.mist <= 0.001) mistEl.style.display = 'none'; else { mistEl.style.display = ''; mistEl.style.opacity = S.mist.toFixed(3); } }
    if (sealEl) sealEl.style.opacity = on ? S.seal.toFixed(3) : '';
    if (S.ui && !IN.uiDone) { IN.uiDone = true; if (window.__kozoUI) window.__kozoUI.decodeAll(() => IN.t - 4.5); }
    if (!S.ui && IN.uiDone) { IN.uiDone = false; document.documentElement.classList.remove('ui'); }
    // mở cọ mực ở giây 5 (và cờ cho phần 3: cuộn được từ lúc này); cọ to dần trong 0,8 s
    if (S.brush !== brushOn) {
      brushOn = S.brush; api.scrollUnlocked = S.brush;
      if (ink) { if (MUC && brushOn && lastPtr) ink.setPointer(lastPtr[0], lastPtr[1], window.innerWidth, window.innerHeight); if (!brushOn) { ink.clearPointer(); ink.reset(); } }
    }
    gateIntro = on ? 0.35 + 0.65 * S.brushK : 1;
    if (ink) ink.setGate(gateIntro * gateScroll);
  }
  function tickIntro(dt) {
    if (!IN.run || IN.finished || api.introPause) return;   // api.introPause: bài kiểm giữ nguyên trạng thái để tách từng khoản
    if (!IN.fixed) IN.t += dt;   // dt đã kẹp ≤ 0,1 s: khung chậm thì màn mở chậm lại chứ không nhảy cóc
    const S = introState(IN.t);
    applyIntro(S);
    if (S.done) { IN.finished = true; api.introDone = true; api.introEndMs = Math.round(performance.now() - t0); introVariant = false; setRevealVariant(false); }
  }
  api.startIntro = () => {
    if (IN.run || !INTRO_MODE) return;
    IN.run = true; IN.t = T_FIX === null ? 0 : T_FIX; IN.fixed = T_FIX !== null;
    api.introStartMs = Math.round(performance.now() - t0);
    api.introStartAt = performance.now();   // tính từ lúc mở trang
  };
  // bài kiểm: tua tới giây t (đứng hình, hoặc chạy tiếp nếu play)
  api.introSeek = (t, play) => { IN.run = true; IN.finished = false; IN.t = t; IN.fixed = !play; api.introDone = false; introVariant = true; setRevealVariant(true); tickIntro(0); };
  api.introT = () => IN.t;
  // sau lần vẽ thử: dựng trạng thái giây 0 phía sau màn chờ (không có khung nào lộ toà thành chưa hiện)
  if (INTRO_MODE) {
    setRevealVariant(true);
    applyIntro(introState(0));
    // VẼ THỬ biến thể màn mở một lần (màn chờ vẫn phủ): trên Windows, lần VẼ đầu tiên của một chương trình shader mới
    // còn phải dựng thêm phần cho card đồ hoạ (~150 ms) — đo được hai khung đứng hình giữa màn mở khi bỏ bước này
    if (kc) { lineA = 1; lineCutY = -1e4; drawLines(0); }
    post.render(0);
    applyIntro(introState(0));
  }
  warm.totalMs = Math.round(performance.now() - warm.t0);

  // ════════════════════════════ PHẦN 3: CUỘN · CHẠNG VẠNG · CHUYỂN CẢNH MỰC LOANG · CHƯƠNG 地 ════════════════════════════
  // Quãng cuộn (đơn vị MÀN = một chiều cao cửa sổ). Mike 28/9: "scroll phải ít hơn" → rút còn một nửa (≈ 29 nấc lăn
  // tới hết chương thay vì 59): CO CẢ TRUYỆN theo tỉ lệ (trang ngắn lại, mỗi nấc lăn vẫn 100 px như mọi trang web) chứ
  // không nhân quãng đi của một nấc — nhân nấc thì ngón tay, thanh cuộn, phím vẫn phải đi cả quãng dài cũ.
  //   0 → 0,6     chạng vạng quanh toà thành (máy lùi và hạ, trời/sương/nắng ngả tối, nét kết cấu 緑青 mọc từ chân
  //               nền đá, chữ bốn góc tắt nhẹ, ngọn cọ yếu dần rồi tắt)
  //   0,62 → 1,22 CHUYỂN CẢNH bằng mực thấm (0,6 màn) — cũng là vùng TỰ TRÔI
  //   1,22 → 3,2  chương 地: thung lũng ruộng bậc thang trong đêm (~2 màn); hết thì dừng
  // PHẦN 4 (28/9) — thêm sau chương 地:
  //   3,0 → 3,6   CHUYỂN CẢNH bằng nét chổi quét ngang (0,6 màn) — vùng TỰ TRÔI thứ hai. Máy thung lũng vẫn đang trôi nốt
  //               (quãng thung lũng kéo tới hết quãng chuyển, 3,6 — máy dừng êm đúng lúc nét quét phủ kín, không đứng hình
  //               giữa chừng) và máy mỏ đá đã bắt đầu đi (quãng mỏ đá từ 3,0) — hai cảnh GỐI nhau như
  //               hubtown mục 2.3: khi nét quét mở ra, cảnh mới đã đang chuyển động
  //   3,6 → 5,5   chương 石垣: vách mỏ đá trong đêm (~1,9 màn); hết thì dừng (chương rừng làm sau)
  // PHẦN 5 (28/9) — thêm sau chương 石垣:
  //   5,25 → 5,85 MÁY BAY RA KHỎI MỎ: cộng dần vào tư thế cuối chương một cú bay ngửa lên dọc nét cọ, về phía mép vách có hàng
  //               tuyết tùng (bắt đầu êm từ 5,25 — chương mỏ đá tới 5,5 gần như y cũ)
  //   5,5 → 6,1   CHUYỂN CẢNH 3 bằng SƯƠNG DÀY (0,6 màn) — vùng TỰ TRÔI thứ ba. Sương dày dần theo độ sâu, phủ kín ở giữa quãng
  //               (5,785) → đổi cảnh ngay trong đám sương → sương tan, máy đang bay trong rừng, ngửa nhìn thân cây cao rồi hạ dần
  //               (quãng cảnh rừng bắt đầu từ 5,2 — cảnh mới đã đang chuyển động khi sương tan, như hubtown mục 2.3)
  //   6,1 → 8,1   chương 骨: rừng tuyết tùng trong đêm (~2 màn)
  // PHẦN 7 (29/9) — KHÔNG CUỘN NỮA: dòng thời gian này giữ nguyên thước, nhưng vị trí s do page/buoc.js chạy theo thời gian
  //   (một cử chỉ = một chương; chuyển cảnh 4 đổi sang cửa giấy lùa — xem applyPost). Ghi chú cũ bên dưới giữ để đối chiếu.
  // PHẦN 6 (29/9) — thêm sau chương 骨:
  //   8,1 → 8,7   CHUYỂN CẢNH 4 bằng ÁNH SÁNG (0,6 màn) — vùng TỰ TRÔI thứ tư. Máy tiến sát mặt cắt khúc gỗ, ô vuông 井 sáng lên như giấy
  //               có đèn sau lưng, nở phủ kín màn (đổi cảnh ngay dưới mảng sáng, 8,385) rồi co lại đúng tấm giấy ở cuối ngõ làng
  //               (máy làng đã đang tiến từ 8,3 — cảnh mới đã chuyển động khi mảng sáng co, như hubtown mục 2.3)
  //   8,7 → 10,7  chương 皮: làng làm giấy dó (~2 màn): đầu ngõ → giữa ngõ → gần cửa; lưới nan vẽ theo cuộn; hết thì dừng
  const T0 = 0.62, T1 = 1.22, T2 = 3.0, T3 = 3.6, VEND = T3, QEND = 5.5, T4 = 5.5, T5 = 6.1, END3 = 8.1, T6 = 8.1, T7 = 8.7, END = 10.7;
  const LSTART = 8.3;
  // PHẦN 8 (29/9) — chương 仕事: 10,7 → 11,3 CHUYỂN CẢNH 5 (tờ giấy thành bản vẽ quy hoạch — chạy theo thời gian như cửa giấy, xem GIAY);
  //   11,3 → 13,3 chương 仕事 (máy từ nhìn thẳng xuống nghiêng về góc bản đồ, nét cọ nối năm nhà theo năm tháng)
  const T8 = END, T9 = END + 0.6, END5 = T9 + 2.0, V5START = T9 - 0.08, TP5 = T9 - 0.03;
  const GSW = 0.965;   // chuyển cảnh 5: từ đây chuỗi hậu kỳ vẽ thẳng thung lũng (giấy đã tan hết ở 0,95)
  // PHẦN 9 (30/9) — chương 連絡: END5 → T11 CHUYỂN CẢNH 6 (máy 仕事 bay theo nét cọ ra khỏi bản đồ; phần W0 → W1 của quãng: hai cảnh hoà
  //   theo chính nét — post/chuyen.js DuongEffect; rồi máy 連絡 hạ dần xuống bãi) · T11 → END6 chương đứng (bốn cạnh 地縄, toà thành sáng
  //   dần từ chân lên, form hiện sau cùng — scene/lienhe.js đọc thẳng vị trí ảo)
  const T10 = END5, T11 = T10 + 0.6, END6 = T11 + 0.6, TP6 = T11 - 0.03;
  const W0 = 0.36, W1 = 0.62;                  // quãng hoà hai cảnh (phần của p6)
  const MIST0 = 0.14;                          // (soát p11a A1) bản đồ 仕事 bắt đầu chìm vào sương từ đây (phần của p6)
  const SB6 = T10 + W1 * (TP6 - T10);         // hết cú bay của máy 仕事 (cảnh 仕事 thôi vẽ)
  const QX0 = 5.25, QX1 = 5.85, FSTART = 5.2;
  api.moc = { T0, T1, END, VEND, T2, T3, T4, T5, QEND, END3, T6, T7, T8, T9, END5, T10, T11, END6, TP6, W0, W1 };
  // ngưỡng hiện / tắt chữ từng chương (màn): in · out (lui dưới thì tắt) · leave (đi quá thì tắt) · back (lui về thì hiện lại)
  // chuyển cảnh XONG TRỌN sớm hơn chỗ trang tự trôi dừng 0,03 màn (TP1, TP2): chữ chương bắt đầu giải mã (mỗi khung đổi vài trăm
  // ô chữ) SAU khi chỉ còn vẽ một cảnh — hai việc trùng nhau làm khung cuối chuyển cảnh dài 27–45 ms (đo 28/9, không giới hạn khung)
  const TP1 = T1 - 0.03, TP2 = T3 - 0.03, TP3 = T5 - 0.03, TP4 = T7 - 0.03;
  const SW = T4 + 0.5 * (TP3 - T4);   // đỉnh sương: chỗ đổi cảnh
  const CHS = [
    { in: T1 - 0.02, out: T1 - 0.2, leave: T2 + 0.05, back: T2 + 0.01 },
    { in: T3 - 0.02, out: T3 - 0.2, leave: T4 + 0.05, back: T4 - 0.03 },
    { in: T5 - 0.02, out: T5 - 0.2, leave: T6 + 0.05, back: T6 + 0.01 },
    { in: T7 - 0.02, out: T7 - 0.2, leave: T8 + 0.05, back: T8 + 0.01 },
    { in: T9 - 0.02, out: T9 - 0.2, leave: T10 + 0.05, back: T10 + 0.01 },
    { in: T11 - 0.02, out: T11 - 0.2, leave: Infinity, back: Infinity },
  ];
  const cl01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const sineIO = (x) => 0.5 - 0.5 * Math.cos(Math.PI * cl01(x));
  const ZS = {};   // dùng lại một đối tượng mỗi khung (không sinh rác cho bộ dọn bộ nhớ)
  function zones(sc, Z = ZS) {
    const p = cl01((sc - T0) / (TP1 - T0));
    Z.sc = sc; Z.p = p;
    Z.duskK = sm(0.03, 0.6, sc);                  // ngày → chạng vạng
    Z.corner = 1 - sm(0.015, 0.15, sc);           // chữ bốn góc tắt nhẹ
    Z.gate = 1 - sm(0.04, 0.4, sc);               // ngọn cọ yếu dần rồi tắt
    Z.ct = sineIO(sc / T1);                       // nhịp máy quay toà thành: cả quãng 0 → hết chuyển cảnh, qua sine.inOut
    Z.lineL = sm(0.1, 0.32, sc);                  // nét kết cấu chạng vạng: độ sáng
    Z.lineY = -1.5 + 17.5 * sm(0.13, 0.62, sc);   //   ngọn nét (m) — mọc từ chân lên đỉnh nền đá (15 m)
    Z.tau = sineIO((sc - T0) / (VEND - T0));      // nhịp thung lũng: cả quãng của cảnh, qua sine.inOut
    Z.p2 = cl01((sc - T2) / (TP2 - T2));          // chuyển cảnh 2 (nét chổi quét)
    Z.tau2 = sineIO((sc - T2) / (QEND - T2));     // nhịp mỏ đá: cả quãng chương (gối vào quãng chuyển 2), qua sine.inOut — y như phần 4
    Z.ex = cl01((sc - QX0) / (QX1 - QX0));        // cú bay ra khỏi mỏ (cộng thêm vào tư thế chương)
    Z.p3 = cl01((sc - T4) / (TP3 - T4));          // chuyển cảnh 3 (sương dày) — đổi cảnh ở p3 = 0,5
    Z.tau3 = sineIO((sc - FSTART) / (END3 - FSTART));   // nhịp rừng: từ 5,2 (trước đỉnh sương) tới hết chương 骨, qua sine.inOut
    Z.p4 = cl01((sc - T6) / (TP4 - T6));          // chuyển cảnh 4 (ánh sáng) — đổi cảnh ở p4 = 0,5
    Z.tau4 = sineIO((sc - LSTART) / (END - LSTART));   // nhịp làng giấy: từ 8,3 (trước chỗ đổi cảnh) tới hết trang, qua sine.inOut
    Z.p5 = cl01((sc - T8) / (TP5 - T8));          // chuyển cảnh 5 (tờ giấy → bản vẽ → thung lũng) — trong lúc chuyển đi theo GIAY.x
    Z.tau5 = sineIO((sc - V5START) / (END5 - V5START));   // nhịp 仕事
    Z.tau5p = undefined;                                  // (nhịp riêng của đường cọ — chỉ đặt lúc lùi khỏi 仕事)
    Z.p6 = cl01((sc - T10) / (TP6 - T10));        // chuyển cảnh 6 (仕事 → 連絡) — hai cảnh hoà theo nét ở W0 → W1
    Z.ex6 = cl01((sc - T10) / (SB6 - T10));       // cú bay ra khỏi bản đồ của máy 仕事
    Z.s6 = sc;                                     // chương 連絡 đọc thẳng vị trí ảo (scene/lienhe.js)
    Z.form6 = cl01((sc - T11) / (END6 - T11));    // chữ + form 連絡 (page/chuong.js): form hiện sau cùng
    Z.ui = sm(0.3, 0.85, p);                      // khung vát góc + cột chương + logo nhỏ
    Z.text = sc;                                  // chữ chương: ngưỡng từng chương ở CHS (trễ hai chiều)
    Z.ch = CHS;
    Z.navCur = -1;                                 // nhảy xa: ô 緑青 trên cột chương sang chương đích ngay (app.js đặt)
    return Z;
  }

  // ── ảnh chụp trạng thái BAN NGÀY (sau hiệu chỉnh) — cuộn về 0 là trả đúng từng số này ──
  const GU = post.grade.uniforms;
  const GK = ['uInLow', 'uInHigh', 'uLift', 'uOutHigh', 'uGamma', 'uContrast', 'uHueLock', 'uSatFloor', 'uSatCeil', 'uKeepWarm', 'uKeepInk'];
  const snapG = () => { const o = {}; for (const k of GK) o[k] = GU.get(k).value; o.cfx = GU.get('uCenterFade').value.x; o.cfy = GU.get('uCenterFade').value.y; o.hue = GU.get('uHue').value; return o; };
  const toG = (g) => ({ uInLow: g.inLow, uInHigh: g.inHigh, uLift: g.lift, uOutHigh: g.outHigh, uGamma: g.gamma, uContrast: g.contrast, uHueLock: g.hueLock, uSatFloor: g.satFloor, uSatCeil: g.satCeil, uKeepWarm: g.keepWarm, uKeepInk: g.keepInk, cfx: g.centerLift, cfy: g.edgeFade, hue: g.hue });
  let DAYG = snapG();
  const DUSKG = toG(DUSK.grade), NIGHTG = toG(DEM.grade);
  const DAYB = { thr: post.bloom.luminanceMaterial.threshold };
  const DAYGOD = post.godRays ? { w: post.godRays.godRaysMaterial.weight, e: post.godRays.godRaysMaterial.exposure } : null;
  let wantDof = post.dofPass.enabled, wantGod = post.godPass ? post.godPass.enabled : false;   // (B6: nấc 1 tắt tia sáng, nấc 2 tắt nhoè hậu cảnh)
  const NAC0 = { god: wantGod, dof: wantDof, dofRes: post.dof.resolution.scale, bloom: post.bloom.mipmapBlurPass.levels, shadow: sun.shadow.mapSize.x };
  let nacSharp = CAS;   // độ làm nét của lượt cuối theo nấc (nấc 3–4 làm nét khi phóng cảnh nhỏ lên)
  const BLOOM_R0 = post.bloom.mipmapBlurPass.radius;
  api.recalibDay = () => { DAYG = snapG(); };

  // ── bảng màu CHẠNG VẠNG của toà thành: mỗi mục [màu đích, màu ngày, màu chạng vạng] (tuyến tính) ──
  const NC = DUSK.night, DKk = DUSK.k;
  const DK = [];
  const addC = (c, nightHex) => { if (c && c.isColor) DK.push([c, c.clone(), c.clone().lerp(new THREE.Color(nightHex), DKk)]); };
  addC(scene.fog.color, NC.fog.color);
  const fogD0 = scene.fog.density, fogD1 = fogD0 + (NC.fog.density - fogD0) * DKk;
  let skyU = null;
  scene.traverse((o) => { if (!skyU && o.material && o.material.uniforms && o.material.uniforms.uTop && o.material.uniforms.uHorizon) skyU = o.material.uniforms; });
  const skyGlowK0 = skyU ? skyU.uGlowK.value : 0;
  if (skyU) { addC(skyU.uTop.value, NC.sky.top); addC(skyU.uMid.value, NC.sky.mid); addC(skyU.uHorizon.value, NC.sky.horizon); addC(skyU.uGlow.value, NC.sky.glow); }
  const hemiL = scene.children.find((o) => o.isHemisphereLight), ambL = scene.children.find((o) => o.isAmbientLight);
  addC(sun.color, NC.sun.color);
  if (hemiL) { addC(hemiL.color, NC.hemi.sky); addC(hemiL.groundColor, NC.hemi.ground); }
  if (ambL) addC(ambL.color, NC.amb.color);
  const LI = [[sun, sun.intensity, NC.sun.intensity], [hemiL, hemiL ? hemiL.intensity : 0, NC.hemi.intensity], [ambL, ambL ? ambL.intensity : 0, NC.amb.intensity]].filter((a) => a[0]).map(([o, a, b]) => [o, a, a + (b - a) * DKk]);
  ridges.mats.forEach((m, i) => { addC(m.uniforms.uLit.value, NC.ridge.lit[i]); addC(m.uniforms.uShade.value, NC.ridge.shade[i]); addC(m.uniforms.uGap.value, NC.ridge.gap[i]); addC(m.uniforms.uMist.value, NC.ridge.mist); });
  sea.mats.forEach((m) => { addC(m.uniforms.uLow.value, NC.sea.low); addC(m.uniforms.uHigh.value, NC.sea.high); addC(m.uniforms.uShade.value, NC.sea.shade); addC(m.uniforms.uFog.value, NC.ridge.mist); });
  const matMap = [['stone', 'stone'], ['plaster', 'plaster'], ['roof', 'roof'], ['ridgeMat', 'ridge'], ['wood', 'wood'], ['board', 'board'], ['itabari', 'itabari'], ['paper', 'paper'], ['sama', 'sama'], ['rock', 'rock'], ['rafter', 'wood']];
  for (const [mk, nk] of matMap) if (M[mk] && M[mk].color) addC(M[mk].color, NC.mat[nk]);
  addC(hill.hill.material.color, NC.ground.color);
  // rừng dưới chân thành: màu nằm trong từng cây (sáng/tối) → nhân cả vật liệu theo tỉ lệ đêm / ngày
  { const r = new THREE.Color(NC.near.lit), d = new THREE.Color(L.near.lit); DK.push([hillForest.mat.color, hillForest.mat.color.clone(), new THREE.Color(1, 1, 1).lerp(new THREE.Color(r.r / d.r, r.g / d.g, r.b / d.b), DKk)]); }
  // lõi 栗石 sáng qua mạch đá: trắng ngà → 緑青 (ảnh a1)
  // (p7b, soát p7a A2: viền sáng quanh từng tảng là kiểu đèn neon) → lõi giữa mạch chỉ ngả 緑青 thật tối, không phát sáng
  DK.push([M.stoneCore.color, M.stoneCore.color.clone(), M.stoneCore.color.clone().multiplyScalar(0.3)]);
  DK.push([M.stoneCoreDim.color, M.stoneCoreDim.color.clone(), M.stoneCoreDim.color.clone().multiplyScalar(0.3)]);
  if (post.ghep) { const U = post.ghep.uniforms; U.get('uBaseA').value.set(IS.H, IS.p, IS.topA, IS.baseA); U.get('uBaseB').value.set(IS.topB, IS.baseB); }
  const unkaiDusk = unkaiSp.map((u) => u.c.clone().lerp(new THREE.Color(NC.sea.high), DKk));
  const cornerC0 = cornerSp.map((c) => c.sp.material.color.clone()), cornerC1 = cornerC0.map((c) => c.clone().lerp(new THREE.Color(NC.corner.color), DKk));
  const envI0 = scene.environmentIntensity ?? 1;
  let lastDusk = 0;
  function applyDusk(k) {
    if (k <= 0 && lastDusk <= 0) return;
    lastDusk = k;
    for (const [c, a, b] of DK) c.copy(a).lerp(b, k);
    scene.fog.density = fogD0 + (fogD1 - fogD0) * k;
    for (const [o, a, b] of LI) o.intensity = a + (b - a) * k;
    if (skyU) skyU.uGlowK.value = skyGlowK0 + (NC.sky.glowK - skyGlowK0) * DKk * k;
    scene.environmentIntensity = envI0 * (1 - 0.75 * k);
    unkaiSp.forEach((u, i) => { u.sp.material.color.copy(u.c).lerp(unkaiDusk[i], k); });
    cornerSp.forEach((c, i) => { c.sp.material.color.copy(cornerC0[i]).lerp(cornerC1[i], k); });
    if (!introBusy()) glow.material.opacity = glowO;
    glow.material.opacity *= 1 - k;
    glow.visible = glow.material.opacity > 0.002 && L.glow.opacity > 0;
  }

  // ── nội suy HẬU KỲ: ngày → chạng vạng (theo độ tối) → đêm thung lũng (theo tiến độ chuyển cảnh) ──
  const khungU = post.khungFx.uniforms, chuyenU = post.chuyenFx.uniforms, quetU = post.quetFx.uniforms, suongU = post.suongFx.uniforms, bayU = post.bayFx.uniforms, shojiU = post.shojiFx.uniforms;
  cua.U.uPaper.value.copy(lang.paperC(0.72));   // giấy cửa = đúng màu giấy dó của làng (lớp nắn màu đưa về ngà như ván phơi)
  shojiU.get('tCua').value = cua.rt.texture;
  const DOOR = { on: false, x: 0 };   // chuyển cảnh 4 đang chạy: thời gian x của cửa (0 → 1 đi tới; lùi thì chạy ngược)
  const JX = { on: false, day: false, swap: 0, k: 0, from: 0, to: 0, w: 0 };   // phần 7: trạng thái cú nhảy xa của khung này
  const sideOf = (k) => (k >= 3 ? 0.85 : 0.55), capOf = (k) => (k === 4 && !portrait ? 1 : 0), chrOf = (k) => (k >= 4 ? 0.5 : k === 1 ? 0 : 1);
  const GIAY = { on: false, x: 0, back: false, tau0: 1 };
  const GIAY_RW = 1.6 / 5.0;   // phần quãng lùi dành cho tua máy 仕事 về đầu chương (1,6 s của 5 s)   // chuyển cảnh 5 đang chạy: thời gian x (0 → 1 đi tới; lùi thì chạy ngược)
  let cardK = 0;                      // lớp tối mềm sau thẻ 仕事 (nở / tắt êm)
  // (phần 9) chuyển cảnh 6 đang chạy (hai chiều) · lùi 6 → 5: máy 連絡 tua về tư thế tới nơi trong HOI6_RW đầu quãng (cả màn vẫn là
  // 連絡), rồi chuyển cảnh chạy ngược đúng hình (như lùi 5 → 4)
  const TR6 = { on: false };
  const HOI6 = { back: false, s0: 0, v: 0, v0: 0, sPrev: -1 };
  const TRANS6_BACK = 5.8;              // (thời lượng lùi 6 → 5, giây — trùng trans[5].back bên dưới)
  const HOI6_RW = 1.3 / TRANS6_BACK;
  api.renderer = () => renderer;   // bài kiểm: đọc nhật ký dịch của từng chương trình (tìm cảnh báo X4122)
  // (Mike 30/9: chuyển cảnh 3 "thành 2 camera movement, chóng mặt" — đo: máy mỏ đá bay TỚI + LÊN, ngửa dần; qua đỉnh sương máy rừng
  // HẠ XUỐNG và chúi 17 → 68°/s: hai cú máy ngược chiều) → MỘT CÚ BAY DUY NHẤT qua sương: suốt quãng QX0 → T5 cả hai máy cùng TIẾN
  // THẲNG theo hướng nhìn của chính nó (hơi chúi 6°), cùng một nhịp E = sineIO(u) của vị trí ảo — không đổi hướng, không quay máy.
  //   · mỏ đá: tư thế cuối chương + tiến Lq·E (bỏ cú bay ngửa lên của quarry.js: ex = 0 — quarry.js không đổi);
  //   · rừng: tư thế LÚC TỚI (góc A rộng, nối dài tuyến tính theo đúng vận tốc của chương ở mốc tới nơi) lùi lại Lf·(1 − E) — tới
  //     nơi đúng lúc E = 1 (vận tốc cú bay về 0, chương chạy tiếp từ đúng tư thế ấy); mốc τ < 0,215 của rừng (ngửa nhìn tán rồi hạ
  //     xuống) không còn dùng khi đi tới;
  //   · đổi cảnh ở đỉnh sương (u ≈ 0,63); lọn sương trôi theo QUÃNG TIẾN CHUNG (hàm của u, không theo toạ độ thế giới của từng cảnh)
  //     → sương chuyển động liền mạch qua chỗ đổi.
  // Lq / Lf chọn theo cỡ cảnh: trước máy mỏ đá trống ~50 m (tới vách sau), sau máy rừng trống ~32 m trong khoảng trống.
  const flowNow = new THREE.Vector3();
  const TR3 = { Lq: 30, Lf: 16, F: 18, dir: new THREE.Vector3(0, -0.1, -1).normalize(), arr: null, v: new THREE.Vector3() };
  const u3 = (s) => cl01((s - QX0) / (T5 - QX0));
  function dolly3(cam, dist) { cam.position.addScaledVector(TR3.v.copy(TR3.dir).applyQuaternion(cam.quaternion), dist); cam.updateMatrixWorld(); }
  function arr3() {
    if (TR3.arr) return TR3.arr;
    const tau = (s) => sineIO((s - FSTART) / (END3 - FSTART)), h = 0.01;
    rung.update(0, tau(T5 + h)); const pB = rung.camera.position.clone(), qB = rung.camera.quaternion.clone();
    rung.update(0, tau(T5)); const pA = rung.camera.position.clone(), qA = rung.camera.quaternion.clone();
    // (soát p11a B7) vận tốc XOAY của đường trong chương ở mốc tới nơi (trục + rad / đơn vị vị trí ảo): cuối quãng bay máy xoay dần
    // từ 0 lên đúng tốc độ ấy, tới nơi là đã đang xoay đúng như chương — không còn 0 → 2,3°/s trong một khung
    const dq = qB.clone().multiply(qA.clone().invert()); if (dq.w < 0) { dq.x = -dq.x; dq.y = -dq.y; dq.z = -dq.z; dq.w = -dq.w; }
    const ang = 2 * Math.acos(Math.min(1, dq.w)), sn = Math.sqrt(Math.max(1e-12, 1 - dq.w * dq.w));
    TR3.arr = { pA, qA, v: pB.sub(pA).divideScalar(h), fov: rung.camera.fov, ax: new THREE.Vector3(dq.x / sn, dq.y / sn, dq.z / sn), w: ang / h, q: new THREE.Quaternion() };
    return TR3.arr;
  }
  const LK = [NaN, NaN, NaN, NaN];
  function applyPost(Z) {
    const kD = Z.duskK, p = Z.p;
    const changed = kD !== LK[0] || p !== LK[1] || Z.ui !== LK[2] || introBloomK !== LK[3];
    LK[0] = kD; LK[1] = p; LK[2] = Z.ui; LK[3] = introBloomK;
    if (changed && (kD > 0 || p > 0)) {
      for (const k of GK) { const a = DAYG[k] + (DUSKG[k] - DAYG[k]) * kD; GU.get(k).value = a + (NIGHTG[k] - a) * p; }
      const cf = GU.get('uCenterFade').value;
      const cx = DAYG.cfx + (DUSKG.cfx - DAYG.cfx) * kD, cy = DAYG.cfy + (DUSKG.cfy - DAYG.cfy) * kD;
      cf.set(cx + (NIGHTG.cfx - cx) * p, cy + (NIGHTG.cfy - cy) * p);
      GU.get('uHue').value = DUSKG.hue;   // ban ngày khoá sắc = 0 (sắc đích không tác dụng); vào chạng vạng dùng sắc 160°
      const b0 = bloomBase * introBloomK;
      const thr = DAYB.thr + (DUSK.bloom.threshold - DAYB.thr) * kD, bi = b0 + (DUSK.bloom.intensity - b0) * kD;
      post.bloom.luminanceMaterial.threshold = thr + (DEM.bloom.threshold - thr) * p;
      post.bloom.intensity = bi + (DEM.bloom.intensity - bi) * p;
      if (DAYGOD) { post.godRays.godRaysMaterial.weight = DAYGOD.w * (1 - kD); post.godRays.godRaysMaterial.exposure = DAYGOD.e * (1 - kD); }
    } else if (changed) {
      // đúng 0: trả nguyên số ban ngày (hình màn đầu không đổi một điểm ảnh)
      for (const k of GK) GU.get(k).value = DAYG[k];
      GU.get('uCenterFade').value.set(DAYG.cfx, DAYG.cfy);
      GU.get('uHue').value = DAYG.hue;
      post.bloom.luminanceMaterial.threshold = DAYB.thr;
      post.bloom.intensity = bloomBase * introBloomK;
      if (DAYGOD) { post.godRays.godRaysMaterial.weight = DAYGOD.w; post.godRays.godRaysMaterial.exposure = DAYGOD.e; }
    }
    if (post.godPass) post.godPass.enabled = wantGod && p < 1 && (!DAYGOD || DAYGOD.w * (1 - kD) > 0.002);
    // nhoè hậu cảnh: ban đêm gần như không thấy (nền tối, sương sẫm) → nhạt dần theo chạng vạng rồi tắt hẳn (đỡ card đồ hoạ
    // lúc phải vẽ hai cảnh); màn đầu giữ nguyên số cũ
    const dofK = 1 - sm(0.35, 0.9, kD);
    post.dof.bokehScale = (introBusy() ? post.dof.bokehScale : dofBase) * dofK;
    post.dofPass.enabled = wantDof && p < 1 && dofK > 0.001;
    // quầng loá toả rộng hơn ở thung lũng (nét cọ phát sáng)
    post.bloom.mipmapBlurPass.radius = BLOOM_R0 + (0.9 - BLOOM_R0) * p;
    // lõi nét gần trắng ánh lục vẫn được nhận là mực → giữ sắc 緑青, không bị rút thành xám
    GU.get('uInkSat').value.set(0.12 - 0.09 * p, 0.30 - 0.22 * p);
    // lớp khung: lớp tối sau chữ + màn mờ sau cột chương (theo giao diện chương), viền tối (theo độ tối)
    const vig = 0.40 * kD + (0.56 - 0.40 * kD) * p;
    // KHỔ DỌC (điện thoại, Mike 28/9): khối chữ chương cao hơn và rộng hết bề ngang → lớp tối cao tới 34% màn (tan tới 60%),
    // đều cả bề ngang; thêm dải tối mảnh ở mép trên cho logo nhỏ. Khổ ngang giữ nguyên số cũ.
    if (portrait) {
      khungU.get('uFrame').value.set(0.34, 0.60, 0.92 * Z.ui);
      khungU.get('uTextW').value.set(0.5, 0.7);
      khungU.get('uTopK').value = Z.ui;
    } else {
      // (vòng kiểm cuối 30/9) khổ ngang THẤP (máy xách tay 1366×768, máy tính bảng ngang…): chữ chương cao cố định theo điểm ảnh, dải
      // tối tính theo phần bề cao → dưới 900 px dải tối kéo cao thêm cho phủ đúng số điểm ảnh như ở 900 (≥ 900 px: không đổi)
      LOWK = Math.min(1.35, Math.max(1, 900 / Math.max(1, window.innerHeight)));
      khungU.get('uFrame').value.set(0.13 * LOWK, 0.47 * LOWK, 0.88 * Z.ui);
      khungU.get('uTextW').value.set(0.22, 0.5);
      khungU.get('uTopK').value = 0;
    }
    // SƯƠNG THUNG LŨNG sau chữ màn đầu (khổ dọc): mạnh theo độ đục của chữ bốn góc, dâng lên cùng lúc chữ hiện
    const mk = portrait ? Z.corner * mistRise : 0;
    post.suongPass.enabled = mk > 0.001;
    if (mk > 0.001) {
      suongU.get('uK').value = 0.86 * mk;
      suongU.get('uTop').value = 0.08 + 0.26 * mistRise;
      suongU.get('uMistC').value.copy(scene.fog.color).multiplyScalar(1.02);
    }
    // chương 骨: đầu nét xà (bên trái) có thể nằm sau cột chương ở khổ 1440 → màn mờ sau cột chương đậm hơn (chỉ ở chương rừng)
    khungU.get('uSide').value = JX.on ? (sideOf(JX.from) + (sideOf(JX.to) - sideOf(JX.from)) * JX.w) * Z.ui : (0.55 + 0.3 * sm(0.5, 1.0, Z.p3)) * Z.ui;
    // (p7b, soát p7a A1: trong quãng cửa giấy tắt lớp tối sau cột chương — cột chữ nằm trên tường tối của căn phòng)
    if (DOOR.on) khungU.get('uSide').value *= 1 - sm(0.02, 0.2, Math.min(DOOR.x, 1 - DOOR.x) * 2);
    khungU.get('uCap').value = Z.ui;
    // (Mike 30/9) vùng loang sau cột chương đặt theo khung cột chương thật trên màn (đo lại khi đổi cỡ, và ~1,5 s một lần — chữ tải xong
    // có thể đổi bề ngang cột); độ loang rộng hơn cột nhiều → mép tan hẳn, không đọc thành ô
    if (SIDE.w !== window.innerWidth || SIDE.h !== window.innerHeight || ++SIDE.n % 90 === 0) {
      SIDE.w = window.innerWidth; SIDE.h = window.innerHeight;
      const ce = document.getElementById('chap'), cr0 = ce ? ce.getBoundingClientRect() : null;
      SIDE.on = !!(cr0 && cr0.width > 4);
      if (SIDE.on) khungU.get('uSideR').value.set((cr0.left + cr0.width * 0.45) / SIDE.w, 1 - (cr0.top + cr0.height / 2) / SIDE.h, (cr0.width * 0.8 + 70) / SIDE.w, (cr0.height * 0.5 + 80) / SIDE.h);
    }
    // (khổ hẹp không có cột chương → không có lớp tối nào ở mép trái)
    if (!SIDE.on) khungU.get('uSide').value = 0;
    // chương 皮: ván phơi giấy sáng sát máy nằm sau cột chương (khổ 1440 đo 3,3:1) → kẹp điểm sáng sau cột; chương khác không đổi
    // (lúc cửa giấy đang mở: bật dần khi cánh trái đã trượt qua khỏi cột chữ — kẹp đè lên giấy sẽ thành một tấm lót tối lộ ra)
    // (cửa giấy: bật lại khi máy đã đi qua khung cửa, cảnh ngõ phủ kín màn)
    const cap4 = DOOR.on ? sm(0.86, 1.0, DOOR.x) : GIAY.on ? 1 - sm(0.1, 0.3, GIAY.x) : Z.p5 >= 1 ? 0 : Z.p4 >= 1 ? 1 : 0;
    khungU.get('uSideCap').value = portrait ? 0 : JX.on ? (capOf(JX.from) + (capOf(JX.to) - capOf(JX.from)) * JX.w) * Z.ui : Z.ui * cap4;
    khungU.get('uVig').value = vig;
    post.khungPass.enabled = vig > 0.0005 || Z.ui > 0.0005;
    // chuyển cảnh: chỉ bật trong quãng chuyển; xong thì cảnh mới vẽ thẳng vào chuỗi hậu kỳ, cảnh cũ tắt hẳn
    // (phần 7, nhảy xa: cùng hiệu ứng mực thấm, tiến độ = phần cảnh đến đã hiện JX.w; về màn đầu thì đảo vai hai cảnh)
    const cp = JX.on ? JX.w : p;
    // (về màn đầu: lúc cp = 0 vẫn phải bật — chuỗi đang vẽ toà thành, ảnh chụp chương vừa rời mới là cái đang hiện)
    const mix = JX.on && JX.swap ? cp < 1 : cp > 0 && cp < 1;
    post.chuyenPass.enabled = mix;
    if (mix) {
      post.chuyenFx.setProgress(cp, camera.aspect);
      chuyenU.get('tValley').value = valleyRT.texture;
      chuyenU.get('uMode').value = REDUCED ? 1 : 0;
      chuyenU.get('uSwap').value = JX.on ? JX.swap : 0;
      chuyenU.get('uSoft').value = JX.on ? 1 : 0;   // nhảy xa: mép loang mềm kiểu mây (soát p7a A3); chuyển cảnh 1 giữ mực tua đã duyệt
    }
    // chuyển cảnh 2 (ruộng → mỏ đá): nét chổi quét ngang; mỏ đá vẽ vào khung đệm "cảnh đến", thung lũng vẽ thẳng vào chuỗi
    const mix2 = Z.p2 > 0 && Z.p2 < 1;
    post.quetPass.enabled = mix2;
    if (mix2) {
      post.quetFx.setProgress(Z.p2);
      quetU.get('tNew').value = valleyRT.texture;
      quetU.get('uMode').value = REDUCED ? 1 : 0;
    }
    // chuyển cảnh 3 (mỏ đá → rừng): KHÔNG vẽ hai cảnh — trước đỉnh sương vẽ mỏ đá, sau đỉnh sương vẽ rừng, lượt sương phủ lên
    const mix3 = Z.p3 > 0 && Z.p3 < 1;
    post.bayPass.enabled = mix3;
    if (mix3) {
      // sương lên chậm lúc đầu (còn thấy máy bay dọc nét, tới hàng cây trên mép vách), đặc nhanh gần đỉnh; tan theo kiểu đối xứng
      const k3 = Z.p3 < 0.5 ? Math.pow(sm(0.06, 0.5, Z.p3), 1.6) : Math.pow(1 - sm(0.5, 0.97, Z.p3), 1.6);
      bayU.get('uK').value = k3;
      bayU.get('uWind').value = clock * 0.012;
      bayU.get('uFlow').value.set(flowNow.y, flowNow.z);
    }
    // chuyển cảnh 4 (rừng → làng giấy) — CỬA GIẤY LÙA 障子 DỰNG 3D (p7b, soát p7a A1; scene/cua.js ghi rõ nhịp từng đoạn). Đổi cảnh
    // đúng lúc cửa khép kín (x = 0,5). Lớp nắn màu nhận "giấy" (ấm nhẹ → ngà) suốt quãng chuyển và cả chương 皮.
    // (p7b) cửa giấy lùa dựng 3D: cảnh cửa vẽ riêng (frame) rồi đặt lên ảnh cảnh ở đây
    post.shojiPass.enabled = DOOR.on && !JX.on;
    // không có chữ chương trong quãng cửa — lớp tối TAN DẦN theo x ở hai mép quãng (soát p9a B4: đặt thẳng 0 thì nửa dưới màn chớp
    // sáng một khung lúc bắt đầu và chớp tối lúc tới)
    const edgeK = (x) => 1 - sm(0, 0.12, x) * (1 - sm(0.88, 1, x));
    if (DOOR.on) khungU.get('uFrame').value.z *= edgeK(DOOR.x);
    // chuyển cảnh 5 (làng giấy → 仕事): máy trong làng đã tiến sát một ô giấy (x ≤ 0,34, xem langPush); mực vẽ bản quy hoạch lên tờ
    // giấy (0,3 → 0,68), rồi giấy tan thành thung lũng (0,62 → 0,95) — thung lũng vẽ vào khung đệm "cảnh đến" trong quãng tan
    // (soát p9a A1/A3/A4) máy dừng ở khung còn thấy nan (giaFrame); mọi thứ trên giấy tính trong toạ độ tờ giấy (phép chiếu uH);
    // mực bắt đầu vẽ sớm (0,12 — máy còn đang tiến), vẽ đều tới 0,6; mực loang 0,48 → 0,8 (đều); thung lũng hiện 0,62 → 0,95 (ngay sau mép loang)
    const gOn = GIAY.on && !JX.on && GIAY.x > 0.004 && GIAY.x < GSW && !!planRT;
    post.giayPass.enabled = gOn;
    if (gOn) {
      const G = post.giayFx.uniforms, x = GIAY.x, lin = (a, b) => cl01((x - a) / (b - a));
      G.get('tPlan').value = planRT.texture; G.get('tNew').value = valleyRT.texture;
      G.get('uLamp').value = sm(0.02, 0.3, x);
      G.get('uInk').value = lin(0.12, 0.6) * 1.02;
      G.get('uWash').value = lin(0.48, 0.8);
      G.get('uDis').value = sm(0.62, 0.95, x);
      giayMap(G.get('uH').value, G.get('uSheet').value);
      G.get('uPAsp').value = lang.camera.aspect;
      if (api.giayDbg) api.giayDbg(G, x);   // bài kiểm / chỉnh số (không dùng trên trang)
    }
    // (phần 9) chuyển cảnh 6: hai cảnh hoà theo chính nét cọ — cảnh 仕事 (máy đang bay theo nét) vẽ vào khung đệm "cảnh cũ", cảnh 連絡 là
    // chuỗi đang vẽ; vùng đất mới thấm ra từ nét trên màn
    // (soát p11a A1) TRƯỚC quãng hoà (p6 MIST0 → W0): bản đồ 仕事 chìm dần vào sương đêm, chỉ nét cọ còn sáng — lúc cảnh mới loang ra từ
    // nét thì quanh nó chỉ là sương, không còn nhà cửa của bản đồ chồng lên cảnh mới
    const pre6 = !JX.on && lienheReady && viecReady && Z.p6 > MIST0 && Z.p6 <= W0;
    const d6 = !JX.on && lienheReady && viecReady && Z.p6 > W0 && Z.p6 < W1;
    post.duongPass.enabled = d6 || pre6;
    if (d6 || pre6) {
      const DU = post.duongFx.uniforms, pts = DU.get('uPts').value;
      DU.get('tOld').value = valleyRT.texture;
      DU.get('uPre').value = pre6 ? 1 : 0;
      DU.get('uFog').value = sm(MIST0, W0 - 0.02, Z.p6);
      DU.get('uP').value = pre6 ? 0 : (Z.p6 - W0) / (W1 - W0);
      const n = viec.exitScreen(PTS6);
      for (let i = 0; i < 16; i++) pts[i].set(PTS6[i * 2] || 0, PTS6[i * 2 + 1] || 0);
      DU.get('uN').value = n;
    }
    if (GIAY.on) khungU.get('uFrame').value.z *= edgeK(GIAY.x);   // không có chữ chương trong quãng giấy (tan dần — B4)
    // (phần 9) chương 連絡: dải tối từ đáy THẤP hơn (form là "đường mặt đất" sát đáy khung — khổ dọc: tiêu đề + form ở nửa dưới), elip rất
    // mềm sau tiêu đề góc trên phải; pha dần từ số của 仕事 sang số của 連絡 theo tiến độ (lùi thì ngược lại, cùng hàm của s)
    const w6 = JX.on ? (JX.to === 6 ? JX.w : JX.from === 6 ? 1 - JX.w : 0) : lienheReady ? sm(0.55, 1.0, Z.p6) : 0;
    if (w6 > 0) {
      const F = khungU.get('uFrame').value;
      // (soát p10a B2) đang gõ: dải tối lên tới trên mép form (form đứng cao lên khi bàn phím mở)
      const LD = portrait && window.__kozoChuong && window.__kozoChuong.lhDo ? window.__kozoChuong.lhDo() : null;
      const top6 = LD && LD.typing ? Math.max(0.55, Math.min(0.92, 1 - LD.formTop / window.innerHeight + 0.16)) : 0.55;
      TOP6 += (top6 - TOP6) * 0.15; if (Math.abs(top6 - TOP6) < 0.002) TOP6 = top6;
      if (portrait) F.set(F.x * (1 - w6), F.y + (TOP6 - F.y) * w6, F.z + (0.92 * Z.ui - F.z) * w6);
      else F.set(F.x * (1 - w6), F.y + (0.24 * LOWK - F.y) * w6, F.z + (0.8 * Z.ui - F.z) * w6);
      if (portrait) { khungU.get('uSide').value *= 1 - w6; khungU.get('uTopK').value = Z.ui; }
    }
    // chuyển cảnh 6 (không có chữ chương trong quãng bay): lớp tối tan dần ở hai mép quãng, không đặt thẳng 0 (soát p9a B4)
    if (TR6.on) khungU.get('uFrame').value.z *= edgeK(Z.p6);
    // chương 仕事: lớp tối rất mềm sau thẻ hình vẽ (thẻ không khung, không tấm nền)
    const cr = !JX.on && Z.p5 >= 1 && viec ? viec.cardRect() : null;
    if (cr) khungU.get('uCard').value.set((cr.left + cr.width / 2) / window.innerWidth, 1 - (cr.top + cr.height / 2) / window.innerHeight, (cr.width * 0.72 + 40) / window.innerWidth, (cr.height * 0.62 + 40) / window.innerHeight);
    khungU.get('uCardK').value = cardK * (portrait ? 0.62 : 0.6);
    // (phần 9) sau tiêu đề 連絡 góc trên phải (khổ ngang): elip tối rất mềm, hiện cùng chữ (theo tiến độ, không bật tắt)
    if (w6 > 0 && !portrait && !cr) {
      const hr = lhHeadRect(), k6 = w6 * (JX.on ? 1 : sm(T11 - 0.08, T11 + 0.06, Z.s6));
      if (hr && k6 > 0) {
        khungU.get('uCard').value.set((hr.left + hr.width / 2) / window.innerWidth, 1 - (hr.top + hr.height / 2) / window.innerHeight, (hr.width / window.innerWidth) * 1.25, (hr.height / window.innerHeight) * 1.5);
        khungU.get('uCardK').value = Math.max(khungU.get('uCardK').value, 0.45 * k6);
      }
    }
    // (giấy / đèn ngà: làng giấy và 仕事 đều giữ ngà — nhảy giữa hai chương này thì giữ nguyên)
    // (Mike 30/9 "ánh sáng ở tòa tháp chỗ contact hơi kì") 連絡: cửa sổ toà thành là ĐÈN ẤM DỊU (hổ phách, giữ sắc bằng uKeepWarm) — không
    // ép về ngà trắng như giấy 皮 (trên nền 緑青 ngà trắng đọc ra hồng trắng loá) → tắt giữ-giấy theo quãng hoà cảnh của chuyển cảnh 6
    GU.get('uKeepPaper').value = JX.on ? (JX.from >= 4 && JX.to >= 4 ? 1 : JX.from >= 4 ? 1 - sm(0.6, 1, JX.w) : JX.to >= 4 ? sm(0, 0.4, JX.w) : 0) : Z.p4 > 0 ? 1 - w6 : 0;
    // (29/9: lượt làm nét kẹp chống chấm đen bật cho CẢ TRANG — post/chuyen.js CasEffect, mặc định uClampK = 1)
    // chương 皮: song cửa sổ mảnh ở mép khung bị nhiễu sắc viền hồng → nhiễu sắc còn một nửa (chỉ khi đang ở làng)
    if (post.chroma) {
      // (trong quãng cửa: tắt hẳn tách màu — viền đỏ xanh ở mép cánh, soát p7a A1)
      // (A10, soát p7a: chương 地 — mép bậc ruộng nhìn sượt chỉ còn 1–2 điểm ảnh, tách màu biến nó thành dải hạt viền đỏ xanh →
      //  ở ruộng TẮT tách màu, làm nét còn một nửa; tan dần theo mực thấm / nét chổi quét)
      const vw = sm(0.5, 1.0, p) * (1 - sm(0.0, 0.5, Z.p2));
      // (Mike 30/9 "ánh sáng ở tòa tháp chỗ contact hơi kì") 連絡: song cửa sổ toà thành xa chỉ 1–2 điểm ảnh — tách màu nhuộm nó viền hồng
      // tím (cửa sổ đọc ra hồng trắng); dây 水糸 một điểm ảnh cũng thành viền đỏ xanh → ở 連絡 TẮT tách màu, tan theo quãng hoà cảnh
      const ck = JX.on ? chrOf(JX.from) + (chrOf(JX.to) - chrOf(JX.from)) * JX.w : DOOR.on ? 0.5 * sm(0.86, 1.0, DOOR.x) : Z.p4 >= 0.5 ? 0.5 * (1 - w6) : 1 - vw;
      if (post.casFx) { const vj = JX.on ? (JX.from === 1 ? 1 - JX.w : JX.to === 1 ? JX.w : 0) : vw; post.casFx.uniforms.get('uSharp').value = nacSharp * (1 - 0.5 * vj); }
      const off = S.chroma * ck;
      if (Math.abs(post.chroma.offset.x - off) > 1e-7) post.chroma.offset.set(off, off * 0.6);
    }
    const rp = post.renderPass;
    if (JX.on && JX.day) {
      // nhảy có màn đầu: về màn đầu → toà thành sống từ lúc mực bắt đầu mở ra nó (cảnh chương vừa rời là ảnh chụp); đi từ màn đầu → hết mực thấm thì
      // cảnh chương đích sống
      const K = chScene(JX.k);
      if (Z.p < 1) { rp.scene = scene; rp.camera = camera; } else if (JX.swap) { rp.scene = EMPTY; rp.camera = camera; } else { rp.scene = K.scene; rp.camera = K.camera; }
    }
    else if (Z.p6 >= W0 && lienheReady) { rp.scene = lienhe.scene; rp.camera = lienhe.camera; }
    else if (Z.p5 >= GSW && viecReady) { rp.scene = viec.scene; rp.camera = viec.camera; }
    else if (Z.p4 >= 0.5) { rp.scene = lang.scene; rp.camera = lang.camera; }
    else if (Z.p3 >= 0.5) { rp.scene = rung.scene; rp.camera = rung.camera; }
    else if (Z.p2 >= 1) { rp.scene = quarry.scene; rp.camera = quarry.camera; }
    else if (p >= 1) { rp.scene = valley.scene; rp.camera = valley.camera; } else { rp.scene = scene; rp.camera = camera; }
  }
  const chScene = (k) => (k === 1 ? valley : k === 2 ? quarry : k === 3 ? rung : k === 4 ? lang : k === 5 ? viec : lienhe);
  const PTS6 = new Float32Array(32);   // đường nét 仕事 trên màn (chuyển cảnh 6)
  let LIFT6 = 0, TOP6 = 0.55, PENDK = 0, LOWK = 1;
  const SIDE = { w: 0, h: 0, n: 0, on: false };
  const TIL = { live: true, yaw: 0, pitch: 0 };   // độ nghiêng theo chuột của màn đầu (giữ nguyên lúc rời — xem chỗ đặt máy toà thành)
  let moTex = null;                    // (30/9) ảnh đứng của mờ chuyển (chép từ khung vẽ ra màn)
  const MO = { id: -1 }, MOV2 = new THREE.Vector2();
  // đường cong của mờ chuyển (ảnh + giao diện dùng chung). (soát p11a A5) mờ VỀ MÀN ĐẦU ban ngày (đêm → ngày): buoc.js cho dài 1,15 s,
  // đường cong êm bậc năm rồi mũ 1,6 — nửa đầu ảnh đêm tan chậm (trộn tuyến tính một chút sáng ngày đã làm màn bừng lên), không "bật đèn"
  const moE = (MF) => { const x = MF.p; if (MF.to === 0 && MF.from > 0) return Math.pow(x * x * x * (x * (6 * x - 15) + 10), 1.6); return x * x * (3 - 2 * x); };
  const FZ = { id: -1, corner: 0, ui: 0, pend: 0 }, MO_TXT = 0.24;          // (soát p10a B2) khung cảnh 連絡 dời lên khi đang gõ trên điện thoại (điểm ảnh CSS)
  // tiêu đề 連絡 góc trên phải: hộp đo một lần (đặt cố định bằng CSS), đo lại khi đổi cỡ cửa sổ
  let lhRect = null;
  const lhHeadRect = () => { if (!lhRect) { const e = document.getElementById('lh-dau'); if (e) { const r = e.getBoundingClientRect(); if (r.width > 0) lhRect = r; } } return lhRect; };
  addEventListener('resize', () => { lhRect = null; });
  // đo sẵn một lần khi chữ đã có font (không đo lần đầu giữa vòng vẽ — một lần đo bắt trình duyệt dàn trang ngay trong khung)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { lhHeadRect(); });
  const EMPTY = new THREE.Scene();   // về màn đầu, trước khi mực mở ra toà thành: chuỗi không cần vẽ gì (ảnh chụp phủ kín)

  // ── DỰNG THUNG LŨNG NGẦM: sau màn mở (hoặc ngay khi người xem bắt đầu cuộn), mỗi khung ≤ ~3 ms; rồi dịch shader SONG SONG
  // (một chương trình một lần, chờ card đồ hoạ báo xong), rồi VẼ ĐẦU từng thứ một vào khung đệm của nó (lần vẽ đầu trên
  // Windows còn phải dựng thêm) — để lần đầu cuộn tới thung lũng không có khung nào đứng hình ──
  const BG = { phase: 0, gen: null, t0: 0, inflight: [], units: [], fd: [], log: [], ms: 0, readyAt: 0, frames: [] };
  api.bgFrames = () => BG.frames.filter((f) => f[1] > 0);
  let valleyReady = false, quarryReady = false, forestReady = false, langReady = false, viecReady = false, lienheReady = false;
  // ── PHẦN 7 (29/9): ĐI TỪNG CHƯƠNG (page/buoc.js). Điểm dừng trên dòng thời gian cũ: đầu chương A (chuyển cảnh tới đây là hết) ·
  // cuối chương B = đúng chỗ chuyển cảnh kế bắt đầu (máy đi hết đường, nét vẽ xong). B của 石垣 = 5,25: cú bay ra khỏi mỏ là phần
  // mở đầu của chuyển cảnh 3 (trước kia người xem tự cuộn qua) chứ không phải của chương. Thời lượng chuyển cảnh = nhịp đã duyệt.
  const NAV_CH = [{ A: 0, B: 0, dur: 0 }, { A: T1, B: T2, dur: 6 }, { A: T3, B: QX0, dur: 6 }, { A: T5, B: END3, dur: 6.5 }, { A: T7, B: END, dur: 6.5 }, { A: T9, B: END5, dur: 7 }, { A: T11, B: END6, dur: 5 }];
  const nav = createBuoc({
    chapters: NAV_CH,
    // chuyển cảnh 5 lùi (仕事 → 皮) dài hơn: 1,6 s đầu máy 仕事 tua về đầu chương (nhìn thẳng xuống), rồi mới chạy ngược đúng hình
    // chuyển cảnh đi (3,4 s) — soát p9a B3/A9: máy đứng ở tư thế nghiêng thì bản đồ nghiêng chồng lệch lên bản vẽ nhìn thẳng
    // (phần 9) chuyển cảnh 6: 4,6 s — máy 仕事 bay theo nét ra khỏi bản đồ, hai cảnh hoà theo nét, máy 連絡 hạ xuống bãi; lùi 5,8 s (1,3 s
    // đầu máy 連絡 tua về tư thế tới nơi rồi mới chạy ngược đúng hình)
    trans: [{ dur: 3.2 }, { dur: 2.4 }, { dur: 2.8 }, { dur: 2.8 }, { dur: 3.8, back: 5.0 }, { dur: 4.6, back: TRANS6_BACK }],
    canGo: (k) => [true, valleyReady, quarryReady, forestReady, langReady, viecReady, lienheReady][k],
    canInput: () => api.scrollUnlocked,
    gate: { chapter: 1, s: T0 - 0.03 },   // lăn sớm: chạng vạng chạy trước, chờ ngay trước mực thấm nếu thung lũng chưa xong
  });
  api.nav = nav;
  api.navCh = NAV_CH;
  api.chuong = () => nav.info.cur;   // chương đang đứng (0 = màn đầu … 4 = 皮, 5 = 仕事, 6 = 連絡) — cho lớp âm thanh
  window.__kozoNav = nav;
  // phần 9: chương 連絡 — tạo (vật liệu + cảnh rỗng) ở bước đầu của việc dựng ngầm (lhStep), KHÔNG ở màn chờ: thời gian mở trang lần đầu
  // không đổi. Toà thành không dựng lại: nhân bản cây đối tượng của toà thành màn đầu, rừng dùng lại ba hình cây của rừng màn đầu
  const makeLienhe = () => {
    lienhe = createLienhe(renderer, {
      ishigaki, tenshu, M, env: scene.environment, structure: getStructure(ishigaki, tenshu),
      // (chỉ các tảng đá và gờ đỉnh — lõi 栗石 nhiều tam giác làm mỗi tia tốn ~5 ms; nét bám mặt ngoài cùng nên không cần lõi)
      stoneHit: [...ishigaki.meshes, ...ishigaki.cap.children].filter(Boolean),
      forestGeos: hillForest.group.children.filter((o) => o.isInstancedMesh).map((o) => o.geometry),
      moc: { T10, TP6, T11, END6, W0, W1 },
    });
    api.lienhe = lienhe;
    lienhe.resize(window.innerWidth, window.innerHeight);
  };
  api.p3 = () => ({ sc: +nav.info.s.toFixed(4), nav: nav.state(), bg: BG.phase, bgMs: BG.ms, bgLog: BG.log, valleyReady, valley: valley ? valley.info() : null, quarryReady, quarry: quarry ? quarry.info() : null, qbg: QB.log, qbgMs: QB.ms, qPieces: QB.pieces, forestReady, forest: rung ? rung.info() : null, fbg: FB.log, fbgMs: FB.ms, fPieces: FB.pieces, fProg: FB.prog, langReady, lang: lang ? lang.info() : null, lbg: LB.log, lbgMs: LB.ms, lPieces: LB.pieces, viecReady, viec: viec ? viec.info() : null, vbg: VB.log, vbgMs: VB.ms, vPieces: VB.pieces, lienheReady, lienhe: lienhe ? lienhe.info() : null, lhbg: LH.log, lhbgMs: LH.ms, lhPieces: LH.pieces });
  function bgStep(budget) {
    if (BG.phase === 0) {
      if (!api.ready || !(api.scrollUnlocked || QS.has('chuong'))) return;
      BG.phase = 1; BG.t0 = performance.now();
      BG.gen = valley.build();   // (p7b) shader thung lũng dịch ở bước 2 bên dưới (không còn ở màn chờ)
      return;
    }
    const tEnd = performance.now() + budget;
    if (BG.phase === 1) {
      while (performance.now() < tEnd) { const r = BG.gen.next(); if (r.done) { BG.phase = 2; BG.log.push(['dung', Math.round(performance.now() - BG.t0)]); break; } }
      if (BG.phase !== 2) return;
      valley.update(0, 0);
      // đơn vị dịch: đất, cây (chương trình mới) — trời và núi xa dùng lại chương trình của màn đầu
      BG.units = [];
      valley.scene.traverse((o) => { if (o.material && (o.isMesh || o.isInstancedMesh)) BG.units.push(o); });
      return;
    }
    const P = renderer.info.programs;
    if (BG.phase === 2) {
      // một vật mỗi khung; chỉ hỏi "xong chưa" với các chương trình đang dịch
      if (BG.units.length && BG.inflight.length < 2) {
        const o = BG.units.shift(), n0 = P.length;
        renderer.setRenderTarget(valleyRT);
        renderer.compile(o, valley.camera, valley.scene);
        renderer.setRenderTarget(null);
        for (let i = n0; i < P.length; i++) { BG.inflight.push(P[i]); (BG.objs || (BG.objs = [])).push(P[i]); }
      }
      for (let i = BG.inflight.length - 1; i >= 0; i--) if (BG.inflight[i].isReady()) BG.inflight.splice(i, 1);
      if (!BG.units.length && !BG.inflight.length) {
        // "dùng đầu" từng chương trình một (lấy bảng biến — trên Windows mỗi cái có thể tốn vài chục ms, nên mỗi khung một cái)
        const pg = (BG.objs || []).shift();
        if (pg) { const tu = performance.now(); pg.getUniforms(); pg.getAttributes(); BG.log.push(['dung-dau ' + pg.name, +(performance.now() - tu).toFixed(1)]); return; }
        BG.phase = 3; BG.log.push(['dich', Math.round(performance.now() - BG.t0)]);
        BG.fd = [];
        valley.scene.traverse((o) => { if (o.material && (o.isMesh || o.isInstancedMesh)) BG.fd.push(o); });
      }
      return;
    }
    if (BG.phase === 3) {
      // VẼ ĐẦU: một vật một khung vào khung đệm thung lũng (cỡ thật) — tải hình lên card, dựng nốt chương trình
      // (vào một ảnh NHỎ cùng kiểu số thực + độ sâu: tải hình lên card và dựng nốt chương trình như nhau, nhưng không tốn
      // thời gian tô cả khung 1900×920 — lần đo không giới hạn khung từng thấy một khung 60 ms ở đây)
      const o = BG.fd.shift();
      if (!BG.small) BG.small = new THREE.WebGLRenderTarget(64, 32, { type: THREE.HalfFloatType, depthBuffer: true });
      if (o) {
        const all = [];
        valley.scene.traverse((c) => { if (c.material) all.push([c, c.visible]); });
        for (const [c] of all) c.visible = c === o;
        const tv = performance.now();
        renderer.setRenderTarget(BG.small);
        renderer.clear(true, true, true);
        renderer.render(valley.scene, valley.camera);
        renderer.setRenderTarget(null);
        for (const [c, v] of all) c.visible = v;
        BG.log.push(['ve-dau ' + (o.name || o.type), Math.round(performance.now() - tv)]);
        return;
      }
      BG.small.dispose();
      BG.phase = 4; BG.ms = Math.round(performance.now() - BG.t0); BG.log.push(['xong', BG.ms]);
      valleyReady = true; BG.readyAt = performance.now();
    }
  }
  // ── DỰNG MỎ ĐÁ NGẦM (phần 4): ngay sau thung lũng, cùng cách — từng mẩu nhỏ, rồi dịch, rồi vẽ đầu từng lưới một ──
  const QB = { phase: 0, gen: null, t0: 0, units: [], inflight: [], fd: [], log: [], ms: 0, pieces: [], small: null };
  function qbStep(budget) {
    if (QB.phase === 0) { QB.phase = 1; QB.t0 = performance.now(); QB.gen = quarry.build(); return; }
    const tEnd = performance.now() + budget;
    if (QB.phase === 1) {
      while (performance.now() < tEnd) {
        const tp = performance.now();
        const r = QB.gen.next();
        QB.pieces.push(+(performance.now() - tp).toFixed(2));
        if (r.done) { QB.phase = 2; QB.log.push(['dung', Math.round(performance.now() - QB.t0)]); break; }
      }
      if (QB.phase !== 2) return;
      quarry.update(0, 0);
      QB.units = [];
      quarry.scene.traverse((o) => { if (o.material && o.isMesh) QB.units.push(o); });
      return;
    }
    const P = renderer.info.programs;
    if (QB.phase === 2) {
      // chương trình đã dịch lúc màn chờ: thường không có gì mới — vẫn hỏi cho chắc (vd. máy bỏ bộ nhớ shader)
      if (QB.units.length && QB.inflight.length < 2) {
        const o = QB.units.shift(), n0 = P.length;
        renderer.setRenderTarget(valleyRT);
        renderer.compile(o, quarry.camera, quarry.scene);
        renderer.setRenderTarget(null);
        for (let i = n0; i < P.length; i++) QB.inflight.push(P[i]);
      }
      for (let i = QB.inflight.length - 1; i >= 0; i--) if (QB.inflight[i].isReady()) QB.inflight.splice(i, 1);
      if (!QB.units.length && !QB.inflight.length) {
        QB.phase = 3; QB.log.push(['dich', Math.round(performance.now() - QB.t0)]);
        quarry.scene.traverse((o) => { if (o.material && o.isMesh) QB.fd.push(o); });
      }
      return;
    }
    if (QB.phase === 3) {
      // VẼ ĐẦU: một lưới một khung (tải hình lên card) vào ảnh nhỏ cùng kiểu
      const o = QB.fd.shift();
      if (!QB.small) QB.small = new THREE.WebGLRenderTarget(64, 32, { type: THREE.HalfFloatType, depthBuffer: true });
      if (o) {
        const all = [];
        quarry.scene.traverse((c) => { if (c.material) all.push([c, c.visible]); });
        for (const [c] of all) c.visible = c === o;
        const tv = performance.now();
        renderer.setRenderTarget(QB.small);
        renderer.clear(true, true, true);
        renderer.render(quarry.scene, quarry.camera);
        renderer.setRenderTarget(null);
        for (const [c, v] of all) c.visible = v;
        QB.log.push(['ve-dau ' + (o.name || o.type), Math.round(performance.now() - tv)]);
        return;
      }
      QB.small.dispose();
      QB.phase = 4; QB.ms = Math.round(performance.now() - QB.t0); QB.log.push(['xong', QB.ms]);
      quarryReady = true;
    }
  }
  // ── RỪNG (phần 5): KHÔNG dịch ở màn chờ (giữ nguyên thời gian mở trang lần đầu). Sau mỏ đá, ngầm, không chặn khung nào:
  //   0 gửi DỊCH chương trình shader của rừng + lượt sương bay (KHR_parallel_shader_compile: card đồ hoạ dịch ở luồng riêng),
  //     rồi mỗi khung chỉ hỏi "xong chưa" · 2 VẼ ĐẦU bằng hình giả vào ảnh đệm 1×1 (lần vẽ đầu trên Windows còn phải dựng thêm),
  //     mỗi khung một chương trình · 3 DỰNG hình từng mẩu nhỏ · 4 VẼ ĐẦU từng lưới thật vào ảnh 1×1 (tải hình lên card) · 5 xong
  const FB = { phase: 0, gen: null, t0: 0, inflight: [], fd: [], log: [], ms: 0, pieces: [], rt: null, warm: null, prog: [], fdDone: 0 };
  function fbStep(budget) {
    const P = renderer.info.programs;
    if (FB.phase === 0) {
      FB.t0 = performance.now();
      FB.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: true });
      FB.warm = rung.warmMeshes();
      for (const m of FB.warm) { m.visible = false; rung.scene.add(m); }
      // lượt sương bay: dịch trên một tam giác phủ màn đúng kiểu của chuỗi hậu kỳ
      FB.bayScene = new THREE.Scene();
      FB.bayCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      FB.bayTri = fullTri();
      const bm = new THREE.Mesh(FB.bayTri, post.bayPass.fullscreenMaterial); bm.frustumCulled = false;
      FB.bayScene.add(bm);
      // GỬI DỊCH TỪNG CHƯƠNG TRÌNH MỘT, mỗi khung một cái, tối đa 2 cái đang dịch (như mỏ đá): khâu dịch sang HLSL của Windows
      // chạy ngay trên luồng đồ hoạ — gửi cả 11 chương trình của rừng một lúc thì một khung đứng 190–300 ms (đo 28/9, lần đầu)
      FB.queue = [...FB.warm.map((m) => [m, rung.camera, rung.scene]), [FB.bayScene, FB.bayCam, FB.bayScene]];
      FB.objs = [];
      FB.phase = 1; FB.log.push(['gui-dich', Math.round(performance.now() - FB.t0), FB.queue.length]);
      return;
    }
    if (FB.phase === 1) {
      for (let i = FB.inflight.length - 1; i >= 0; i--) if (FB.inflight[i].isReady()) FB.inflight.splice(i, 1);
      if (FB.queue.length && FB.inflight.length < 2) {
        const [o, cam, sc] = FB.queue.shift(), n0 = P.length;
        const vis = o.visible; o.visible = true;
        renderer.setRenderTarget(FB.rt);
        renderer.compile(o, cam, sc);
        renderer.setRenderTarget(null);
        o.visible = vis;
        for (let i = n0; i < P.length; i++) { FB.inflight.push(P[i]); FB.objs.push(P[i]); FB.prog.push(P[i].name); }
        return;
      }
      if (FB.inflight.length || FB.queue.length) return;
      FB.log.push(['dich-xong', Math.round(performance.now() - FB.t0)]);
      FB.phase = 1.5; FB.ui = 0;
      return;
    }
    if (FB.phase === 1.5) {
      // lần DÙNG ĐẦU của chương trình (đọc nhật ký dịch, vị trí uniform / thuộc tính) — mỗi khung một chương trình, tách khỏi lần vẽ đầu
      const pg = FB.objs[FB.ui++];
      if (pg) { const tu = performance.now(); pg.getUniforms(); pg.getAttributes(); FB.log.push(['dung-dau ' + pg.name, +(performance.now() - tu).toFixed(1)]); return; }
      FB.phase = 2;
      return;
    }
    if (FB.phase === 2) {
      // vẽ đầu hai chương trình mới (mỗi khung một cái) vào ảnh 1×1
      // rừng hướng A có nhiều chương trình (thân, lá kim, cành, dương xỉ, đất, gỗ, giá kê, tia trăng, trời, dây mực): vẽ đầu
      // MỖI KHUNG MỘT hình giả (chỉ nó hiện), rồi tới lượt sương bay
      const tv = performance.now(), nW = FB.warm.length;
      renderer.setRenderTarget(FB.rt);
      if (FB.fdDone < nW) { for (let i = 0; i < nW; i++) FB.warm[i].visible = i === FB.fdDone; renderer.clear(true, true, true); renderer.render(rung.scene, rung.camera); }
      else renderer.render(FB.bayScene, FB.bayCam);
      renderer.setRenderTarget(null);
      FB.log.push(['ve-dau-' + (FB.fdDone < nW ? FB.warm[FB.fdDone].name : 'suong'), +(performance.now() - tv).toFixed(1)]);
      if (++FB.fdDone < nW + 1) return;
      for (const m of FB.warm) { rung.scene.remove(m); m.geometry.dispose(); }
      FB.bayTri.dispose();
      FB.phase = 3; FB.gen = rung.build(); FB.tb = performance.now();
      return;
    }
    const tEnd = performance.now() + budget;
    if (FB.phase === 3) {
      while (performance.now() < tEnd) {
        const tp = performance.now();
        const r = FB.gen.next();
        const dp = performance.now() - tp;
        FB.pieces.push(+dp.toFixed(2));
        if (dp > 3) FB.log.push(['manh-dai ' + rung.st.at, +dp.toFixed(1)]);
        if (r.done) { FB.phase = 4; FB.log.push(['dung', Math.round(performance.now() - FB.tb)]); break; }
      }
      if (FB.phase !== 4) return;
      rung.update(0, 0);
      FB.fd = [];
      rung.scene.traverse((o) => { if (o.material && o.isMesh) FB.fd.push(o); });
      return;
    }
    if (FB.phase === 4) {
      // VẼ ĐẦU từng lưới thật (tải hình lên card) — mỗi khung một lưới, vào ảnh 1×1
      const o = FB.fd.shift();
      if (o) {
        const n0 = P.length;
        const all = [];
        rung.scene.traverse((c) => { if (c.material) all.push([c, c.visible]); });
        for (const [c] of all) c.visible = c === o;
        const tv = performance.now();
        renderer.setRenderTarget(FB.rt);
        renderer.clear(true, true, true);
        renderer.render(rung.scene, rung.camera);
        renderer.setRenderTarget(null);
        for (const [c, v] of all) c.visible = v;
        FB.log.push(['ve-dau ' + (o.name || o.type), +(performance.now() - tv).toFixed(1), P.length - n0]);
        return;
      }
      FB.rt.dispose();
      FB.phase = 5; FB.ms = Math.round(performance.now() - FB.t0); FB.log.push(['xong', FB.ms]);
      forestReady = true;
      applyCards(NAC[nacNow].cards);
    }
  }

  // ── LÀNG GIẤY (phần 6): như rừng — KHÔNG dịch ở màn chờ. Sau rừng, ngầm, không chặn khung nào:
  //   0 gửi DỊCH (mỗi khung một chương trình, tối đa 2 đang dịch) · 1,5 dùng đầu · 2 VẼ ĐẦU hình giả vào ảnh đệm 1×1 (mỗi khung một cái,
  //   rồi lượt ánh sáng) · 3 DỰNG hình từng mẩu nhỏ · 4 VẼ ĐẦU từng lưới thật · 5 xong
  const LB = { phase: 0, gen: null, t0: 0, inflight: [], fd: [], log: [], ms: 0, pieces: [], rt: null, warm: null, objs: [], fdDone: 0 };
  function lbStep(budget) {
    const P = renderer.info.programs;
    if (LB.phase === 0) {
      LB.t0 = performance.now();
      LB.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: true });
      LB.warm = lang.warmMeshes();
      for (const m of LB.warm) { m.visible = false; lang.scene.add(m); }
      LB.sScene = new THREE.Scene(); LB.sCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); LB.sTri = fullTri();
      // (lượt đặt cửa giấy lên ảnh + cả cảnh cửa giấy 3D — dịch cùng lúc)
      { const sm0 = new THREE.Mesh(LB.sTri, post.shojiPass.fullscreenMaterial); sm0.frustumCulled = false; LB.sScene.add(sm0); }
      cua.update(0.5);
      LB.queue = [...LB.warm.map((m) => [m, lang.camera, lang.scene]), [LB.sScene, LB.sCam, LB.sScene], [cua.scene, cua.camera, cua.scene]];
      LB.phase = 1; LB.log.push(['gui-dich', Math.round(performance.now() - LB.t0), LB.queue.length]);
      return;
    }
    if (LB.phase === 1) {
      for (let i = LB.inflight.length - 1; i >= 0; i--) if (LB.inflight[i].isReady()) LB.inflight.splice(i, 1);
      if (LB.queue.length && LB.inflight.length < 2) {
        const [o, cam, sc] = LB.queue.shift(), n0 = P.length;
        const vis = o.visible; o.visible = true;
        renderer.setRenderTarget(LB.rt); renderer.compile(o, cam, sc); renderer.setRenderTarget(null);
        o.visible = vis;
        for (let i = n0; i < P.length; i++) { LB.inflight.push(P[i]); LB.objs.push(P[i]); }
        return;
      }
      if (LB.inflight.length || LB.queue.length) return;
      LB.log.push(['dich-xong', Math.round(performance.now() - LB.t0)]);
      LB.phase = 1.5; LB.ui = 0;
      return;
    }
    if (LB.phase === 1.5) {
      const pg = LB.objs[LB.ui++];
      if (pg) { const tu = performance.now(); pg.getUniforms(); pg.getAttributes(); LB.log.push(['dung-dau ' + pg.name, +(performance.now() - tu).toFixed(1)]); return; }
      LB.phase = 2;
      return;
    }
    if (LB.phase === 2) {
      const tv = performance.now(), nW = LB.warm.length;
      renderer.setRenderTarget(LB.rt);
      if (LB.fdDone < nW) { for (let i = 0; i < nW; i++) LB.warm[i].visible = i === LB.fdDone; renderer.clear(true, true, true); renderer.render(lang.scene, lang.camera); }
      else if (LB.fdDone === nW) renderer.render(LB.sScene, LB.sCam);
      else { renderer.setRenderTarget(null); cua.update(0.5); cua.render(renderer); }
      renderer.setRenderTarget(null);
      LB.log.push(['ve-dau-' + (LB.fdDone < nW ? LB.warm[LB.fdDone].name : LB.fdDone === nW ? 'dat-cua' : 'cua-giay'), +(performance.now() - tv).toFixed(1)]);
      if (++LB.fdDone < nW + 2) return;
      for (const m of LB.warm) { lang.scene.remove(m); m.geometry.dispose(); }
      LB.sTri.dispose();
      LB.phase = 3; LB.gen = lang.build(); LB.tb = performance.now();
      return;
    }
    const tEnd = performance.now() + budget;
    if (LB.phase === 3) {
      while (performance.now() < tEnd) {
        const tp = performance.now();
        const r = LB.gen.next();
        const dp = performance.now() - tp;
        LB.pieces.push(+dp.toFixed(2));
        if (dp > 3) LB.log.push(['manh-dai ' + lang.st.at, +dp.toFixed(1)]);
        if (r.done) { LB.phase = 4; LB.log.push(['dung', Math.round(performance.now() - LB.tb)]); break; }
      }
      if (LB.phase !== 4) return;
      lang.update(0, 0);
      LB.fd = [];
      lang.scene.traverse((o) => { if (o.material && o.isMesh) LB.fd.push(o); });
      return;
    }
    if (LB.phase === 4) {
      const o = LB.fd.shift();
      if (o) {
        const n0 = P.length, all = [];
        lang.scene.traverse((c) => { if (c.material) all.push([c, c.visible]); });
        for (const [c] of all) c.visible = c === o;
        const tv = performance.now();
        renderer.setRenderTarget(LB.rt); renderer.clear(true, true, true); renderer.render(lang.scene, lang.camera); renderer.setRenderTarget(null);
        for (const [c, v] of all) c.visible = v;
        LB.log.push(['ve-dau ' + (o.name || o.type), +(performance.now() - tv).toFixed(1), P.length - n0]);
        return;
      }
      LB.rt.dispose();
      LB.phase = 5; LB.ms = Math.round(performance.now() - LB.t0); LB.log.push(['xong', LB.ms]);
      langReady = true;
    }
  }

  // ── 仕事 (phần 8): như làng giấy — KHÔNG dịch ở màn chờ. Sau làng giấy, ngầm, không chặn khung nào:
  //   0 gửi DỊCH (mỗi khung một chương trình, tối đa 2 đang dịch — gồm cả lượt tờ giấy → bản vẽ của chuyển cảnh 5) · 1,5 dùng đầu ·
  //   2 VẼ ĐẦU hình giả · 3 DỰNG hình từng mẩu nhỏ · 4 VẼ ĐẦU từng lưới thật · 5 vẽ bản vẽ quy hoạch (một lần), xong
  const VBFIN = QS.has('vbfin');
  const VB = { phase: 0, gen: null, t0: 0, inflight: [], fd: [], log: [], ms: 0, pieces: [], rt: null, warm: null, objs: [], fdDone: 0 };
  function vbStep(budget) {
    const P = renderer.info.programs;
    if (VB.phase === 0) {
      VB.t0 = performance.now();
      VB.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: true });
      VB.warm = viec.warmMeshes();
      for (const m of VB.warm) { m.visible = false; viec.scene.add(m); }
      VB.sScene = new THREE.Scene(); VB.sCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); VB.sTri = fullTri();
      { const sm0 = new THREE.Mesh(VB.sTri, post.giayPass.fullscreenMaterial); sm0.frustumCulled = false; VB.sScene.add(sm0); }
      VB.queue = [...VB.warm.map((m) => [m, viec.camera, viec.scene]), [VB.sScene, VB.sCam, VB.sScene]];
      VB.phase = 1; VB.log.push(['gui-dich', Math.round(performance.now() - VB.t0), VB.queue.length]);
      return;
    }
    if (VB.phase === 1) {
      for (let i = VB.inflight.length - 1; i >= 0; i--) if (VB.inflight[i].isReady()) VB.inflight.splice(i, 1);
      if (VB.queue.length && VB.inflight.length < 2) {
        const [o, cam, sc] = VB.queue.shift(), n0 = P.length;
        const vis = o.visible; o.visible = true;
        renderer.setRenderTarget(VB.rt); renderer.compile(o, cam, sc); renderer.setRenderTarget(null);
        o.visible = vis;
        for (let i = n0; i < P.length; i++) { VB.inflight.push(P[i]); VB.objs.push(P[i]); }
        return;
      }
      if (VB.inflight.length || VB.queue.length) return;
      VB.log.push(['dich-xong', Math.round(performance.now() - VB.t0)]);
      VB.phase = 1.5; VB.ui = 0;
      return;
    }
    if (VB.phase === 1.5) {
      const pg = VB.objs[VB.ui++];
      if (pg) { const tu = performance.now(); pg.getUniforms(); pg.getAttributes(); VB.log.push(['dung-dau ' + pg.name, +(performance.now() - tu).toFixed(1)]); return; }
      VB.phase = 2;
      return;
    }
    if (VB.phase === 2) {
      const tv = performance.now(), nW = VB.warm.length;
      renderer.setRenderTarget(VB.rt);
      if (VB.fdDone < nW) { for (let i = 0; i < nW; i++) VB.warm[i].visible = i === VB.fdDone; renderer.clear(true, true, true); renderer.render(viec.scene, viec.camera); }
      else renderer.render(VB.sScene, VB.sCam);
      renderer.setRenderTarget(null);
      VB.log.push(['ve-dau-' + (VB.fdDone < nW ? VB.warm[VB.fdDone].name : 'giay'), +(performance.now() - tv).toFixed(1)]);
      if (++VB.fdDone < nW + 1) return;
      for (const m of VB.warm) { viec.scene.remove(m); if (m.geometry) m.geometry.dispose(); }
      VB.sTri.dispose();
      VB.phase = 3; VB.gen = viec.build(); VB.tb = performance.now();
      return;
    }
    const tEnd = performance.now() + budget;
    if (VB.phase === 3) {
      while (performance.now() < tEnd) {
        const tp = performance.now(), at0 = viec.st.at;
        const r = VB.gen.next();
        const dp = performance.now() - tp;
        VB.pieces.push(+dp.toFixed(2));
        if (dp > 3) VB.log.push(['manh-dai ' + at0 + '>' + viec.st.at, +dp.toFixed(1)]);
        if (r.done) { VB.phase = 4; VB.log.push(['dung', Math.round(performance.now() - VB.tb)]); break; }
      }
      if (VB.phase !== 4) return;
      viec.update(0, 0, 0);
      VB.fd = [];
      viec.scene.traverse((o) => { if (o.material && (o.isMesh || o.isInstancedMesh || o.isSprite)) VB.fd.push(o); });
      return;
    }
    if (VB.phase === 4) {
      const o = VB.fd.shift();
      if (o) {
        const n0 = P.length, all = [];
        viec.scene.traverse((c) => { if (c.material) all.push([c, c.visible]); });
        for (const [c] of all) c.visible = c === o;
        const tv = performance.now();
        renderer.setRenderTarget(VB.rt); renderer.clear(true, true, true); renderer.render(viec.scene, viec.camera); renderer.setRenderTarget(null);
        for (const [c, v] of all) c.visible = v;
        const tFin = VBFIN ? (renderer.getContext().finish(), +(performance.now() - tv).toFixed(1)) : undefined;   // ?vbfin=1: đo cả phần card
        VB.log.push(['ve-dau ' + (o.name || o.type), +(performance.now() - tv).toFixed(1), P.length - n0, tFin]);
        VB.last = o.name || o.type;
        return;
      }
      VB.rt.dispose();
      // bản vẽ quy hoạch cho chuyển cảnh 5: một khung đệm cỡ màn, vẽ MỘT lần từ tư thế đầu chương (vẽ lại khi đổi cỡ cửa sổ)
      const s0 = renderer.getDrawingBufferSize(new THREE.Vector2());
      planRT = new THREE.WebGLRenderTarget(s0.x, s0.y, { depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
      const tp = performance.now();
      viec.renderPlan(planRT);
      if (VBFIN) renderer.getContext().finish();
      VB.log.push(['ban-ve', +(performance.now() - tp).toFixed(1)]);
      VB.phase = 5; VB.ms = Math.round(performance.now() - VB.t0); VB.log.push(['xong', VB.ms]);
      viecReady = true;
      viec.applyNac(NAC[nacNow].viecCay ?? 1, NAC[nacNow].viecSuong ?? 1);
    }
  }
  api.planRT = () => planRT;

  // ── (soát p10a B4) 連絡: DỊCH SẴN shader NGAY KHI VÀO TRANG (như 仕事 ở p9b) — không đợi 仕事 dựng xong. Hình giả (lienhe.warmMeshes:
  //   mỗi vật liệu × kiểu vẽ một lưới tí hon) · gửi dịch KHÔNG CHẶN (tối đa 3 chương trình đang dịch, mỗi khung gửi một) · dùng đầu ·
  //   vẽ đầu hình giả mỗi khung một cái. Tới lúc dựng 連絡 thì bước dịch của nó gần như chỉ còn tra bộ nhớ chương trình.
  const LW = { phase: 0, list: null, queue: [], inflight: [], objs: [], ui: 0, fd: 0, rt: null, log: [], t0: 0 };
  function lwStep() {
    const P = renderer.info.programs;
    if (LW.phase === 0) { LW.t0 = performance.now(); if (!lienhe) makeLienhe(); LW.phase = 0.5; LW.log.push(['tao', Math.round(performance.now() - LW.t0)]); return; }
    if (LW.phase === 0.5) {
      const tv = performance.now();
      LW.list = lienhe.warmMeshes();
      for (const m of LW.list) lienhe.scene.add(m);
      LW.queue = LW.list.slice();
      LW.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: true });
      LW.phase = 1; LW.log.push(['hinh-gia', LW.list.length, +(performance.now() - tv).toFixed(1)]);
      return;
    }
    if (LW.phase === 1) {
      for (let i = LW.inflight.length - 1; i >= 0; i--) if (LW.inflight[i].isReady()) LW.inflight.splice(i, 1);
      if (LW.queue.length && LW.inflight.length < 3) {
        const o = LW.queue.shift(), n0 = P.length;
        o.visible = true;
        renderer.setRenderTarget(LW.rt); renderer.compile(o, lienhe.camera, lienhe.scene); renderer.setRenderTarget(null);
        o.visible = false;
        for (let i = n0; i < P.length; i++) { LW.inflight.push(P[i]); LW.objs.push(P[i]); }
        return;
      }
      if (LW.inflight.length || LW.queue.length) return;
      LW.phase = 1.5; LW.ui = 0; LW.log.push(['dich-xong', Math.round(performance.now() - LW.t0), LW.objs.length]);
      return;
    }
    if (LW.phase === 1.5) {
      const pg = LW.objs[LW.ui++];
      if (pg) { pg.getUniforms(); pg.getAttributes(); return; }
      LW.phase = 2; LW.fd = 0;
      return;
    }
    if (LW.phase === 2) {
      // vẽ đầu từng hình giả vào ảnh 1×1 (Windows dựng nốt chương trình ở lần vẽ đầu)
      const o = LW.list[LW.fd];
      if (o) {
        o.visible = true;
        const all = [];
        lienhe.scene.traverse((c) => { if (c.material && c !== o) { all.push([c, c.visible]); c.visible = false; } });
        renderer.setRenderTarget(LW.rt); renderer.clear(true, true, true); renderer.render(lienhe.scene, lienhe.camera); renderer.setRenderTarget(null);
        for (const [c, v] of all) c.visible = v;
        o.visible = false; LW.fd++;
        return;
      }
      lwDone();
    }
  }
  // xong (hoặc 連絡 bắt đầu bước dịch của nó — phần còn dở của hình giả nhập vào đó): gỡ hình giả khỏi cảnh
  function lwDone() {
    if (LW.phase >= 3) return;
    if (LW.list) for (const m of LW.list) { lienhe.scene.remove(m); if (m.geometry && m.geometry.userData.gia) m.geometry.dispose(); }
    if (LW.rt) LW.rt.dispose();
    LW.phase = 3; LW.log.push(['xong', Math.round(performance.now() - LW.t0)]);
  }
  api.lw = () => ({ phase: LW.phase, log: LW.log, q: LW.queue.length, inflight: LW.inflight.length });

  // ── 連絡 (phần 9): như thung lũng — KHÔNG dịch ở màn chờ. Sau 仕事, ngầm, không chặn khung nào:
  //   1 DỰNG hình từng mẩu nhỏ (≤ ~2,5 ms mỗi mẩu) · 2 gửi DỊCH mỗi khung MỘT chương trình (một vật đại diện cho mỗi vật liệu × kiểu
  //   vẽ; tối đa 2 đang dịch — KHR_parallel_shader_compile, luồng chính không chờ; gồm cả lượt hoà cảnh của chuyển cảnh 6) ·
  //   2,5 dùng đầu mỗi khung một chương trình · 3 VẼ ĐẦU từng lưới vào ảnh 1×1 (tải hình lên card), trong ngân sách của khung · 5 xong
  const LH = { phase: 0, gen: null, t0: 0, tb: 0, inflight: [], queue: [], objs: [], fd: [], log: [], ms: 0, pieces: [], rt: null, ui: 0 };
  function lhStep(budget) {
    const P = renderer.info.programs;
    if (LH.phase === 0) { LH.t0 = LH.tb = performance.now(); if (!lienhe) makeLienhe(); LH.gen = lienhe.build(); LH.phase = 1; return; }
    const tEnd = performance.now() + budget;
    if (LH.phase === 1) {
      while (performance.now() < tEnd) {
        const tp = performance.now(), at0 = lienhe.st.at;
        const r = LH.gen.next();
        const dp = performance.now() - tp;
        LH.pieces.push(+dp.toFixed(2));
        if (dp > 3) LH.log.push(['manh-dai ' + at0 + '>' + lienhe.st.at, +dp.toFixed(1)]);
        if (r.done) { LH.phase = 2; LH.log.push(['dung', Math.round(performance.now() - LH.tb)]); break; }
      }
      if (LH.phase !== 2) return;
      lienhe.update(0, END6);   // trạng thái cuối: mọi lớp nét đều hiện (dịch + vẽ đầu đủ)
      LH.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: true });
      // một vật đại diện cho mỗi (vật liệu × kiểu vẽ): hàng trăm lưới của toà thành chỉ dùng ~15 vật liệu
      const seen = new Set();
      LH.queue = [];
      lienhe.scene.traverse((o) => {
        if (!o.material || !(o.isMesh || o.isSprite || o.isPoints || o.isLine) || !o.visible) return;
        const k = [].concat(o.material).map((m) => m.uuid).join(',') + (o.isInstancedMesh ? '|i' + (o.instanceColor ? 'c' : '') : o.isSprite ? '|s' : '|m');
        if (seen.has(k)) return;
        seen.add(k); LH.queue.push([o, lienhe.camera, lienhe.scene]);
      });
      LH.dScene = new THREE.Scene(); LH.dCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); LH.dTri = fullTri();
      { const dm = new THREE.Mesh(LH.dTri, post.duongPass.fullscreenMaterial); dm.frustumCulled = false; LH.dScene.add(dm); }
      LH.queue.push([LH.dScene, LH.dCam, LH.dScene]);
      LH.log.push(['gui-dich', Math.round(performance.now() - LH.t0), LH.queue.length]);
      return;
    }
    if (LH.phase === 2) {
      // (B4) hình giả còn đang dịch dở: nhận các chương trình ấy vào đây (đợi xong mới dùng đầu / vẽ đầu), gỡ hình giả
      if (LW.phase > 0 && LW.phase < 3) { for (const pg of LW.inflight) { LH.inflight.push(pg); LH.objs.push(pg); } LW.inflight.length = 0; lwDone(); }
      for (let i = LH.inflight.length - 1; i >= 0; i--) if (LH.inflight[i].isReady()) LH.inflight.splice(i, 1);
      if (LH.queue.length && LH.inflight.length < 3) {
        const [o, cam, sc] = LH.queue.shift(), n0 = P.length;
        renderer.setRenderTarget(LH.rt); renderer.compile(o, cam, sc); renderer.setRenderTarget(null);
        for (let i = n0; i < P.length; i++) { LH.inflight.push(P[i]); LH.objs.push(P[i]); }
        return;
      }
      if (LH.inflight.length || LH.queue.length) return;
      LH.log.push(['dich-xong', Math.round(performance.now() - LH.t0), LH.objs.length]);
      LH.phase = 2.5; LH.ui = 0;
      return;
    }
    if (LH.phase === 2.5) {
      const pg = LH.objs[LH.ui++];
      if (pg) { const tu = performance.now(); pg.getUniforms(); pg.getAttributes(); LH.log.push(['dung-dau ' + pg.name, +(performance.now() - tu).toFixed(1)]); return; }
      LH.phase = 3;
      LH.fd = [];
      lienhe.scene.traverse((o) => { if (o.material && (o.isMesh || o.isSprite) && o.visible) LH.fd.push(o); });
      LH.fd.push(null);   // lượt hoà cảnh (tam giác phủ màn)
      return;
    }
    if (LH.phase === 3) {
      // VẼ ĐẦU vào ảnh 1×1: tải hình lên card; nhiều lưới một khung trong ngân sách (chương trình đều đã dịch + dùng đầu ở trên)
      const all = [];
      lienhe.scene.traverse((c) => { if (c.material) all.push([c, c.visible]); });
      let n = 0;
      renderer.setRenderTarget(LH.rt);
      while (LH.fd.length && (n === 0 || performance.now() < tEnd)) {
        const o = LH.fd.shift(), tv = performance.now();
        if (o === null) renderer.render(LH.dScene, LH.dCam);
        else {
          for (const [c] of all) c.visible = c === o;
          renderer.clear(true, true, true); renderer.render(lienhe.scene, lienhe.camera);
        }
        const dv = performance.now() - tv;
        if (dv > 3) LH.log.push(['ve-dau ' + (o ? o.name || o.type : 'hoa-canh'), +dv.toFixed(1)]);
        n++;
      }
      renderer.setRenderTarget(null);
      for (const [c, v] of all) c.visible = v;
      LH.last = 've-dau';
      if (LH.fd.length) return;
      LH.rt.dispose(); LH.dTri.dispose();
      LH.phase = 5; LH.ms = Math.round(performance.now() - LH.t0); LH.log.push(['xong', LH.ms]);
      lienheReady = true;
      lienhe.applyNac(NAC[nacNow].lhCay ?? 1, NAC[nacNow].lhSuong ?? 1, NAC[nacNow].lhCo ?? 1);
    }
  }

  // ── chuyển cảnh 5: máy trong làng tiến sát MỘT Ô GIẤY THẬT của cánh shoji (giữa nan đứng 0,035…0,345 và hai nan ngang quanh tâm
  // tờ giấy) — tới 0,34 thì giấy phủ kín màn, lưới nan đã trượt ra ngoài khung. Cộng SAU khi lang.update đặt máy theo τ.
  const PUSH = { q: new THREE.Quaternion(), p: new THREE.Vector3(), m: new THREE.Matrix4(), t: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) };
  // khung cuối của máy trên tờ giấy (m): tâm một ô giấy, cao GIAY_HV (khổ dọc cao hơn để bề ngang vẫn đủ hai ô) — còn thấy nan
  // đứng / nan ngang quanh ô (soát p9a A1: không bao giờ một mặt giấy trơn phủ kín màn)
  const giayFrame = (asp) => { const hv = Math.max(0.46, 0.6 / asp); return { cx: 0.19, cy: LANG.SY0 + LANG.SHH / 2, z: LANG.DZ - 0.02, hv, hw: hv * asp }; };
  function langPush(k) {
    if (k <= 0) return;
    const cam = lang.camera, F = giayFrame(cam.aspect), cx = F.cx, cy = F.cy, z = F.z;
    const fovT = 24, hv = F.hv, d = hv / (2 * Math.tan((fovT * Math.PI) / 360));
    PUSH.p.set(cx, cy, z + d); PUSH.t.set(cx, cy, z);
    PUSH.m.lookAt(PUSH.p, PUSH.t, PUSH.up); PUSH.q.setFromRotationMatrix(PUSH.m);
    cam.position.lerp(PUSH.p, k);
    cam.quaternion.slerp(PUSH.q, k);
    cam.fov += (fovT - cam.fov) * k; cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }
  // phép chiếu phẳng: điểm ảnh màn (0…1) → toạ độ khung cuối trên tờ giấy (0…1), từ bốn góc khung cuối chiếu qua máy làng hiện tại;
  // uSheet: tờ giấy chính trong cùng toạ độ ấy
  const GH = { v: new THREE.Vector3(), A: [], B: [] };
  function homog(src, dst) {
    // giải 8 ẩn (DLT) — dst ~ H · src
    const M = [], r = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      M.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); r.push(u);
      M.push([0, 0, 0, x, y, 1, -v * x, -v * y]); r.push(v);
    }
    for (let c = 0; c < 8; c++) {
      let piv = c; for (let i = c + 1; i < 8; i++) if (Math.abs(M[i][c]) > Math.abs(M[piv][c])) piv = i;
      [M[c], M[piv]] = [M[piv], M[c]]; [r[c], r[piv]] = [r[piv], r[c]];
      const d = M[c][c] || 1e-9;
      for (let i = 0; i < 8; i++) { if (i === c) continue; const f = M[i][c] / d; if (!f) continue; for (let j = c; j < 8; j++) M[i][j] -= f * M[c][j]; r[i] -= f * r[c]; }
    }
    return r.map((v, i) => v / M[i][i]);
  }
  function giayMap(m3, sheet) {
    const cam = lang.camera, F = giayFrame(cam.aspect);
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]], scr = [];
    for (const [u, v] of corners) {
      GH.v.set(F.cx + (u - 0.5) * F.hw, F.cy + (v - 0.5) * F.hv, F.z).project(cam);
      scr.push([GH.v.x * 0.5 + 0.5, GH.v.y * 0.5 + 0.5]);
    }
    const h = homog(scr, corners);
    m3.set(h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1);
    sheet.set((-LANG.SW / 2 - (F.cx - F.hw / 2)) / F.hw, (LANG.SY0 - (F.cy - F.hv / 2)) / F.hv, (LANG.SW / 2 - (F.cx - F.hw / 2)) / F.hw, (LANG.SY0 + LANG.SHH - (F.cy - F.hv / 2)) / F.hv);
  }

  // ── vòng vẽ ────────────────────────────────────────────────────────────────
  let clock = 0, last = performance.now(), frozen = false, froze = 0;
  const sunView = new THREE.Vector3();
  // ── ĐO TỪNG VIỆC TRONG KHUNG (bài săn khung giật lúc rê cọ): thời gian CPU của từng khâu, và thời gian CARD ĐỒ HOẠ
  // của lớp nét + chuỗi hậu kỳ nếu trình duyệt có bộ đếm giờ GPU. Chỉ chạy khi bài kiểm bật (api.prof(true)).
  const PROF = { on: false, rows: [], q: [], pend: [] };
  const glx = renderer.getContext(), tq = glx.getExtension('EXT_disjoint_timer_query_webgl2');
  const gq = () => (PROF.q.pop() || glx.createQuery());
  function gpuBegin() { if (!PROF.on || !tq) return null; const q = gq(); glx.beginQuery(tq.TIME_ELAPSED_EXT, q); return q; }
  function gpuEnd(q) { if (q) glx.endQuery(tq.TIME_ELAPSED_EXT); }
  function gpuPoll() {
    for (let i = PROF.pend.length - 1; i >= 0; i--) {
      const it = PROF.pend[i];
      if (!glx.getQueryParameter(it.q, glx.QUERY_RESULT_AVAILABLE)) continue;
      if (!glx.getParameter(tq.GPU_DISJOINT_EXT)) it.row[it.k] = glx.getQueryParameter(it.q, glx.QUERY_RESULT) / 1e6;
      PROF.q.push(it.q); PROF.pend.splice(i, 1);
    }
  }
  api.prof = (on) => { PROF.on = !!on; if (on) PROF.rows = []; return { gpu: !!tq }; };
  api.profRows = () => PROF.rows;
  // ── NẤC CHẤT LƯỢNG (B6, scene/nac.js) — thay cho "độ nét thích ứng" cũ (chỉ hạ tỉ lệ điểm ảnh, xuống tới 0,6 màn hình).
  // Nấc 0 = p7b. Mỗi nấc sau bỏ thứ đắt trước (tia sáng → nhoè hậu cảnh → tầng loá, làm nét, tách màu → bóng nắng → bớt lá kim
  // rừng), cỡ cảnh sau cùng (0,85 rồi 0,75, không dưới 0,7 màn hình, làm nét khi phóng lên). Đổi nấc: MỖI KHUNG MỘT VIỆC (việc
  // nặng nhất là đổi cỡ cảnh — dựng lại khung đệm — đứng riêng một khung), không đổi giữa lúc chuyển cảnh.
  let prNow = PR_TRAN;
  api.prLog = [];
  function setPR(v) {
    api.prLog.push({ t: Math.round(performance.now()), tu: prNow, toi: Math.round(v * 100) / 100, it: +IN.t.toFixed(2) });
    prNow = Math.round(v * 100) / 100;
    renderer.setPixelRatio(prNow);
    fit();
  }
  let nacNow = 0, nacScale = 1;
  const CAS2 = QS.has('cas2') ? Math.min(1, Math.max(0, parseFloat(QS.get('cas2')) || 0)) : 0;
  const nacQueue = [];
  // lá kim rừng: tấm lá đã xếp GẦN TRƯỚC (rung.js) → chỉ vẽ phần gần nhất (bớt tấm ở xa)
  function applyCards(k) {
    if (!rung) return;
    const o = rung.scene.getObjectByName('chum-la-kim');
    if (!o || !o.geometry || !o.geometry.isInstancedBufferGeometry) return;
    const g = o.geometry;
    if (g.userData.nFull === undefined) g.userData.nFull = g.instanceCount;
    g.instanceCount = Math.max(1, Math.round(g.userData.nFull * k));
  }
  // (soát p10a B6) cỡ cảnh tính trên TRẦN, sàn cũng tính trên trần: trước đây sàn "0,7 × tỉ lệ màn" — màn ×3 (điện thoại) thành 2,1,
  // đè lên trần 1,15 ở mọi nấc (vẽ 3,3 lần số điểm ảnh, nấc 3–4 không hạ được gì). Màn ×1 thì y như cũ (0,85 / 0,75, sàn 0,7).
  const prFor = (scale) => Math.round(PR_TRAN * Math.max(MIN_OF_SCREEN, scale) * 100) / 100;
  function nacActions(n) {
    const T = NAC[n];
    return [
      () => { wantGod = NAC0.god && !!T.god; },
      () => { wantDof = NAC0.dof && !!T.dof; },
      () => { const r = T.dofRes === null ? NAC0.dofRes : Math.min(NAC0.dofRes, T.dofRes); if (post.dof.resolution.scale !== r) post.dof.resolution.scale = r; },
      () => { const lv = T.bloom === null ? NAC0.bloom : Math.min(NAC0.bloom, T.bloom); if (post.bloom.mipmapBlurPass.levels !== lv) post.bloom.mipmapBlurPass.levels = lv; },
      () => { if (post.chromaPass) post.chromaPass.enabled = !!T.chroma && post.quality >= 0.25; },
      () => { const c2 = n === 2 && CAS2 > 0; if (post.casPass) post.casPass.enabled = !!T.cas || c2; nacSharp = c2 ? CAS2 : T.sharp === null ? CAS : T.sharp; },
      () => { const sz = Math.min(NAC0.shadow, T.shadow); if (sun.shadow.mapSize.x !== sz) { sun.shadow.mapSize.set(sz, sz); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } renderer.shadowMap.needsUpdate = true; } },
      () => applyCards(T.cards),
      () => { if (viec && viecReady) viec.applyNac(T.viecCay ?? 1, T.viecSuong ?? 1); },
      () => { if (lienhe && lienheReady) lienhe.applyNac(T.lhCay ?? 1, T.lhSuong ?? 1, T.lhCo ?? 1); },
      () => { nacScale = T.scale; const pr = prFor(T.scale); if (Math.abs(pr - prNow) > 0.005) setPR(pr); },
    ];
  }
  function setNac(n, now = false) {
    nacNow = n;
    nacQueue.length = 0;
    const acts = nacActions(n);
    if (now) for (const a of acts) a(); else nacQueue.push(...acts);
  }
  const NAC_START = NAC_FORCED ?? firstNac(GPUI);
  const gov = makeGovernor({ start: NAC_START, forced: NAC_FORCED, onChange: (n) => setNac(n) });
  setNac(NAC_START, true);
  api.nac = () => nacNow;
  api.nacLog = () => gov.log.slice();
  api.nacGov = gov;
  api.setNac = (n) => { gov.set(n, 'bài kiểm'); };
  api.nacApply = (n) => setNac(n);   // bài kiểm: đổi nấc thẳng (bỏ qua bộ tự hạ) — đo khung lúc đổi
  api.pr = () => prNow;
  // thu phóng trình duyệt (125%…) đổi tỉ lệ điểm ảnh: tính lại trần; đang ở trần cũ thì lên trần mới (soát p7a B10)
  const recap = () => {
    const cap = prCap();
    if (cap === PR_TRAN) return;
    PR_TRAN = cap;
    const want = prFor(nacScale);
    if (Math.abs(want - prNow) > 0.005) setPR(want);
  };
  addEventListener('resize', recap);
  // (tỉ lệ điểm ảnh đổi mà cỡ cửa sổ không đổi — kéo cửa sổ sang màn khác: nghe thay đổi độ phân giải)
  (function watchDpr() {
    if (!window.matchMedia) return;
    const mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    mq.addEventListener('change', () => { recap(); watchDpr(); }, { once: true });
  })();
  // bóng đổ: toà thành đứng yên (ngọn cọ không xê dịch gì), nắng không đổi → vẽ bản đồ bóng MỘT lần rồi thôi
  // (bản vỡ khối ?ro=vo thì đá chuyển động → vẽ lại mỗi khung như cũ)
  let shadowN = 0, progsSeen = 0;
  api.progLog = [];
  // nhật ký máy quay theo từng khung (bài đo "độ đều khi cuộn"): [mốc rAF, vị trí cuộn (màn), máy toà thành xyz, máy thung lũng xyz]
  let camLogOn = false;
  api.camLog = [];
  api.logCam = (on) => { camLogOn = !!on; if (on) api.camLog = []; return api.camLog; };
  let lastGate = 1, chuongFixed = false;
  let STOP = false;
  api.stopScene = (v) => { STOP = !!v; };
  // ── PHẦN 7: NHẢY XA — cảnh đến được VẼ MỘT LẦN (đứng yên ở tư thế tới nơi) vào khung đệm "cảnh đến" lúc bắt đầu nhảy; cảnh đang
  // đứng vẫn sống trong chuỗi hậu kỳ; mực thấm (chuyển cảnh 1) phủ dần. Có màn đầu ban ngày: đi đúng đường chuyển cảnh 1 (chạng
  // vạng + mực thấm) nén lại; về màn đầu: toà thành sống, cảnh chương vừa rời là ảnh chụp, mực thấm mở ra toà thành (bình minh).
  // Mỗi khung chỉ vẽ MỘT cảnh sống (+ một lần chụp lúc bắt đầu) — không nặng hơn chuyển cảnh thường, máy yếu vẫn chạy.
  const ZJ = {}, ZOo = {};
  // A6 (soát p7a): khổ dọc, chương 地 — nét sáng nằm lệch phải khung ngang nên khung dọc hẹp để lọt mất; máy dọc quay dần về
  // phía nét theo nhịp chương (0 lúc đầu chương → ~17° sang phải, ~13° cúi lúc cuối), liền mạch, không giật
  function valleyAim(tau) {
    if (!portrait) return;
    const k = sm(0.3, 0.92, tau);
    valley.camera.rotateY(-(api.valleyYaw ?? 0.3) * k);
    valley.camera.rotateX(-(api.valleyPitch ?? 0.22) * k);   // cúi xuống một chút: dải nét sáng lên trên khối chữ
    valley.camera.updateMatrixWorld();
  }
  function chUpdate(k, dt, z) {
    if (STOP) dt = 0;
    if (k === 1) { valley.update(dt, z.tau); valleyAim(z.tau); }
    else if (k === 2) quarry.update(dt, z.tau2, z.ex);
    else if (k === 3) rung.update(dt, z.tau3);
    else if (k === 4) lang.update(dt, z.tau4);
    else if (k === 5) viec.update(dt, z.tau5, 0);
    else lienhe.update(dt, z.s6);
    if (k === breathCh) breathe(chScene(k).camera);
  }
  function snapTo(K) { renderer.setRenderTarget(valleyRT); renderer.clear(true, true, true); renderer.render(K.scene, K.camera); renderer.setRenderTarget(null); }
  // ── NGHỈ TRONG CHƯƠNG: chương chạy xong thì máy "thở" rất khẽ (xoay ≤ 0,2°, tiến lùi vài cm theo cỡ cảnh), nở dần trong 1,5 s,
  // tắt dần khi rời. Cộng SAU khi máy của chương đã đặt theo τ (mỗi khung đặt lại từ đầu → không cộng dồn).
  let breathK = 0, breathCh = 0;
  const BR_M = [0, 0.5, 0.08, 0.05, 0.035, 0.2, 0.12];   // (連絡: máy đứng xa 130 m — thở tiến lùi 0,12 m)   // (仕事: cảnh rộng nhưng máy thở tiến lùi 0,2 m là đủ — thở chủ yếu bằng xoay)
  function breathe(cam) {
    if (breathK <= 0) return;
    const t = clock, k = breathK, m = BR_M[breathCh];
    cam.translateZ(m * k * Math.sin(t * 0.78));
    cam.translateY(0.45 * m * k * Math.sin(t * 0.51 + 1.1));
    cam.rotateY(0.0034 * k * Math.sin(t * 0.33 + 0.4));
    cam.rotateX(0.0021 * k * Math.sin(t * 0.43 + 2.3));
    cam.updateMatrixWorld();
  }
  // ── sự kiện cho lớp âm thanh (chưa phát tiếng gì): 'kozo:net' detail { dang } — nét cọ / dây mực / lưới nan BẮT ĐẦU vẽ (true) và
  // DỪNG vẽ (false). "Đang vẽ" = lượng nét đã vẽ của các cảnh đang TĂNG (tua lại không tính), chổi quét của chuyển cảnh 2 đang quét
  // tới, hoặc ngọn cọ rê chuột ở màn đầu đang thêm điểm (khi bật &muc=1). Tắt sau 180 ms không tăng.
  const NET = { sig: NaN, p2: 0, pts: 0, last: -1e9, on: false, skip: false };
  const emitW = (name, detail) => { try { dispatchEvent(new CustomEvent(name, { detail })); } catch (e) { /* trình duyệt quá cũ */ } };
  function netSig() {
    let v = 0;
    if (valleyReady) for (const u of valley.SU.uSA.value) v += u.w * 0.05;
    if (quarryReady) { v += quarry.U.uS.value.w * 0.05; for (const u of quarry.U.uD.value) v += u.w; }
    if (forestReady) v += rung.drawn;
    if (langReady) v += lang.drawn;
    if (viecReady) v += viec.drawn;
    if (lienheReady) v += lienhe.drawn;
    return v;
  }
  function netTick(now, Z) {
    const v = netSig();
    let grow = !NET.skip && v > NET.sig + 1e-5;
    NET.skip = false; NET.sig = v;
    if (Z.p2 > 0 && Z.p2 < 1 && Z.p2 > NET.p2 + 1e-6) grow = true;
    NET.p2 = Z.p2;
    if (ink && MUC) { const n = ink.points; if (n > NET.pts) grow = true; NET.pts = n; }
    if (grow) NET.last = now;
    const on = now - NET.last < 180;
    if (on !== NET.on) { NET.on = on; emitW('kozo:net', { dang: on }); }
  }
  api.netOn = () => NET.on;
  function frame(now) {
    requestAnimationFrame(frame);
    const P0 = performance.now();
    // bộ tự hạ nấc: tính cả màn mở; không đo, không đổi giữa lúc chuyển cảnh / nhảy
    const navBusy = nav.info.mode === 'trans' || nav.info.mode === 'jump';
    if (api.ready && !api.prLock) gov.tick(now - last, { busy: navBusy });
    if (nacQueue.length && !navBusy) nacQueue.shift()();
    if (RO === 'muc' && ++shadowN === 30) { renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; }
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    const dts = STOP ? 0 : dt;   // đồng hồ các cảnh chương (bài kiểm dừng được)
    last = now;
    clock += dt;
    // PHẦN 7: &chuong=0..4 → mở thẳng chương ấy (chạy từ đầu chương) khi cảnh của nó đã dựng xong
    if (!chuongFixed && QS.has('chuong') && api.scrollUnlocked) {
      const k = Math.max(0, Math.min(6, Math.round(+QS.get('chuong') || 0)));
      if (k === 0) chuongFixed = true;
      else if ([valleyReady, quarryReady, forestReady, langReady, viecReady, lienheReady][k - 1]) { chuongFixed = true; nav.set(k, 'start'); }
    }
    // vị trí ảo s chạy theo thời gian TRƯỚC TIÊN, cùng mốc rAF với lúc vẽ → trạng thái cảnh của khung này
    const nv = nav.update(dt);
    const J = nv.jump;
    let Z;
    JX.on = !!J;
    if (J) {
      JX.from = J.from; JX.to = J.to;
      JX.day = J.from === 0 || J.to === 0;
      JX.k = JX.day ? (J.from === 0 ? J.to : J.from) : J.to;
      if (JX.day) {
        Z = zones(T1 * (J.from === 0 ? J.p : 1 - J.p));   // đường chuyển cảnh 1 (chạng vạng + mực thấm), đi xuôi hay đi ngược
        JX.swap = J.from === 0 ? 0 : 1;
        JX.w = J.from === 0 ? Z.p : 1 - Z.p;               // phần cảnh ĐẾN đã hiện
      } else {
        Z = zones(J.sOut);                                   // cảnh đang đứng: giữ nguyên chỗ đã dừng
        JX.swap = 0; JX.w = J.p;
      }
      if (J.id !== jSnap) {
        // chụp cảnh MỘT lần: cảnh đến ở tư thế tới nơi (hoặc — về màn đầu — cảnh chương vừa rời, đúng như đang hiện)
        jSnap = J.id;
        if (J.to > 0) chUpdate(J.to, 0, zones(J.sIn, ZJ));
        snapTo(chScene(JX.k));
        NET.skip = true;
      }
      Z.text = Math.min(Z.text, 0.9);   // chữ chương cũ tắt ngay; chữ chương đến giải mã khi tới nơi
      Z.navCur = J.to;
    } else {
      Z = api.forceZ ? api.forceZ(nv.s) : zones(nv.s);
      if (nv.mode === 'trans') {
        // đang chuyển chương: chữ chương vừa rời mờ đi NGAY khi người xem ra hiệu đi; chữ chương đến giải mã khi tới nơi
        Z.text = 0.9;
        // (p7b, soát p7a B2/B7) cảnh ĐANG RỜI đọc theo sOut: đi tiếp từ đúng tư thế + đà đang có (không tua nhanh / tua ngược
        // chương); hiệu ứng chuyển cảnh + cảnh ĐẾN đọc theo s
        if (nv.from > 0) {
          const ZO = zones(nv.sOut, ZOo);
          if (nv.from === 1) Z.tau = ZO.tau; else if (nv.from === 2) Z.tau2 = ZO.tau2; else if (nv.from === 3) Z.tau3 = ZO.tau3; else if (nv.from === 4) Z.tau4 = ZO.tau4;
          else if (nv.from === 5) { Z.tau5 = ZO.tau5; Z.ex6 = ZO.ex6; } else Z.s6 = ZO.s6;
        }
      }
    }
    // chuyển cảnh 4 (cửa giấy 3D): đồng hồ riêng của cửa x = thời gian của chuyển cảnh (lùi thì chạy ngược đúng hình ấy);
    // đổi cảnh đúng lúc cửa khép kín (x = 0,5) — p4 đi theo x trong quãng này
    DOOR.on = !J && nv.mode === 'trans' && ((nv.from === 3 && nv.to === 4) || (nv.from === 4 && nv.to === 3));
    if (DOOR.on) { DOOR.x = nv.dir > 0 ? nv.u : 1 - nv.u; Z.p4 = DOOR.x; Z.ui *= 1 - 0.75 * sm(0.3, 0.44, DOOR.x) * (1 - sm(0.82, 0.96, DOOR.x)); }   // giao diện mờ khi cửa khép, về lại khi đã qua khung cửa
    // chuyển cảnh 5 (tờ giấy → bản vẽ → thung lũng): đồng hồ riêng x = thời gian của chuyển cảnh (lùi thì chạy ngược đúng hình ấy);
    // giao diện mờ khi giấy phủ kín màn, về lại khi thung lũng đã hiện
    GIAY.on = !J && nv.mode === 'trans' && ((nv.from === 4 && nv.to === 5) || (nv.from === 5 && nv.to === 4));
    if (GIAY.on) {
      if (nv.dir > 0) { GIAY.x = nv.u; GIAY.back = false; }
      else {
        // LÙI: tua máy 仕事 (và đường cọ) về τ = 0 trong GIAY_RW đầu quãng — cả màn vẫn là 仕事 — rồi chuyển cảnh chạy ngược
        if (!GIAY.back) { GIAY.back = true; GIAY.tau0 = Z.tau5; }
        // máy: tư thế đi đều suốt quãng tua (chậm dần ở hai đầu); đường cọ: xoá ngược đều theo thời gian
        const k = cl01(nv.u / GIAY_RW), ke = k * k * (3 - 2 * k);
        Z.tau5 = Math.min(GIAY.tau0, 0.5) * (1 - ke);
        Z.tau5p = GIAY.tau0 * (1 - k);
        GIAY.x = nv.u < GIAY_RW ? 1 : 1 - (nv.u - GIAY_RW) / (1 - GIAY_RW);
      }
      Z.p5 = GIAY.x; Z.ui *= 1 - 0.8 * sm(0.12, 0.3, GIAY.x) * (1 - sm(0.9, 1.0, GIAY.x));
    } else GIAY.back = false;
    // (phần 9) chuyển cảnh 6 (仕事 ↔ 連絡): mọi thứ là hàm của vị trí ảo → đi tới đọc thẳng s. LÙI: máy 連絡 (và các lớp nét) tua về tư
    // thế tới nơi trong HOI6_RW đầu quãng — cả màn vẫn là 連絡 — rồi chuyển cảnh chạy ngược đúng hình từ tư thế tới nơi về 仕事
    TR6.on = !J && nv.mode === 'trans' && ((nv.from === 5 && nv.to === 6) || (nv.from === 6 && nv.to === 5));
    // (soát p10a B3) vận tốc của 連絡 ngay trước khi lùi (vị trí ảo / giây) — quãng tua bắt đầu bằng ĐÚNG vận tốc ấy
    if (nv.mode !== 'trans') { HOI6.v = nv.cur === 6 && nv.mode === 'play' ? nv.v || 0 : 0; HOI6.sPrev = nv.cur === 6 ? Z.s6 : -1; }
    if (TR6.on && nv.dir < 0) {
      // (đầu quãng = đúng tư thế của KHUNG TRƯỚC — sOut của khung này đã trôi thêm một bước đà, cộng thêm bước của quãng tua thì máy đi
      //  gấp đôi trong một khung)
      if (!HOI6.back) { HOI6.back = true; HOI6.s0 = Math.max(T11, HOI6.sPrev > 0 ? HOI6.sPrev : Z.s6); HOI6.v0 = HOI6.v; }
      const u = nv.u;
      let sE;
      // tua 連絡 về tư thế tới nơi: Hermite — đầu quãng đúng vị trí + vận tốc đang có (đang tiến thì trôi tiếp một đoạn ngắn theo đà,
      // chậm lại, quay đầu), cuối quãng vận tốc 0 (nối êm vào đường lùi inOut3). Bản cũ smoothstep: vận tốc đầu 0 → máy 13,3 m/s tụt
      // còn 0,95 m/s trong một khung
      if (u < HOI6_RW) {
        // hai khúc: (a) TRÔI THEO ĐÀ ~0,3 s — vận tốc giảm êm (1 − t/Ta)² về 0 (không có khung nào tụt đột ngột); (b) từ chỗ dừng tua về
        // tư thế tới nơi, êm cả hai đầu (smoothstep). Chỗ nối vận tốc = 0, gia tốc liền — máy dừng hẳn một thoáng rồi mới quay đầu
        const Trw = HOI6_RW * TRANS6_BACK, t = u * TRANS6_BACK, v0 = Math.max(0, HOI6.v0), Ta = v0 > 1e-4 ? 0.3 : 0;
        const sStop = HOI6.s0 + (v0 * Ta) / 3;
        if (t < Ta) { const r = 1 - t / Ta; sE = HOI6.s0 + (v0 * Ta / 3) * (1 - r * r * r); }
        else if (Ta > 0) { const k = cl01((t - Ta) / (Trw - Ta)), ke = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; sE = sStop + (T11 - sStop) * ke; }   // (quay đầu từ chỗ dừng: khởi động rất êm)
        else { const k = cl01(t / Trw), ke = k * k * (3 - 2 * k); sE = T11 + (HOI6.s0 - T11) * (1 - ke); }                                // (lùi từ nghỉ: y như trước)
      }
      else { const k = cl01((u - HOI6_RW) / (1 - HOI6_RW)); sE = T11 - (T11 - T10) * (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2); }
      const txt = Z.text, nc = Z.navCur;
      Z = zones(sE); Z.text = txt; Z.navCur = nc;
    } else HOI6.back = false;
    // giảm chuyển động: máy toà thành đứng yên, không nét mọc — chỉ tan hình (soát p7a B10)
    if (nav.reduced) { Z.ct = 0; Z.lineL = 0; }
    // máy "thở" khi nghỉ: chỉ ở chương đang đứng, nở dần theo idleK, tắt dần khi rời (không giật)
    if (nv.mode === 'idle' && nv.cur > 0 && breathK < 0.001) breathCh = nv.cur;
    const bT = nv.mode === 'idle' && nv.cur === breathCh ? nv.idleK * nv.idleK * (3 - 2 * nv.idleK) : 0;
    breathK += (bT - breathK) * Math.min(1, dt * 2.5);
    if (bT === 0 && breathK < 1e-4) breathK = 0;
    // (soát p10a A8) thung lũng chưa dựng xong: chỉ GIỮ chuyển cảnh 1 ở đầu khi đang ở GIỮA chuyển cảnh ấy. Đã đứng ở chương ≥ 2 (mở
    // thẳng &chuong=6 lúc thung lũng còn dựng ngầm) thì Z.p = 1 như thường — trước đây ép 0 làm cả toà thành ban ngày chạy lại mỗi khung
    // và lượt ghép nét chạng vạng đọc ảnh độ sâu của 連絡 bằng máy màn đầu → một mảng sáng phẳng hình thang dưới bãi đất 1–2 s
    if (Z.p > 0 && Z.p < 1 && !valleyReady) Z.p = 0;
    if (Z.p2 > 0 && !quarryReady) Z.p2 = 0;
    if (Z.p3 > 0 && !forestReady) { Z.p3 = 0; Z.ex = 0; }
    if (Z.p4 > 0 && !langReady) Z.p4 = 0;
    if (Z.p5 > 0 && !viecReady) Z.p5 = 0;
    if (Z.p6 > 0 && !lienheReady) { Z.p6 = 0; Z.ex6 = 0; }
    scrollBusy = nv.s > 0.002 || JX.on;
    tickIntro(dt);
    // nhật ký: chương trình shader nào phải dịch GIỮA CHỪNG (sau lúc sẵn sàng) — mỗi lần là một khung đứng hình
    if (api.ready && renderer.info.programs.length !== progsSeen) { api.progLog.push({ t: Math.round(performance.now()), it: +IN.t.toFixed(2), sc: +nv.s.toFixed(3), tu: progsSeen, toi: renderer.info.programs.length, ten: renderer.info.programs.slice(progsSeen).map((pg) => pg.name).join(',') }); progsSeen = renderer.info.programs.length; }
    const castleOn = Z.p < 1;   // (về màn đầu: toà thành bắt đầu vẽ khi mực bắt đầu mở ra nó — khung đầu chỉ chụp cảnh cũ, không dồn việc)
    let P1 = performance.now(), P2 = P1, P3 = P1, P4 = P1;
    if (castleOn) {
      // máy quay toà thành: lùi và hạ theo keyframe (nhịp ct đã qua sine.inOut); màu ngày → chạng vạng
      CK.dist = kfm(CKEY.dist, Z.ct); CK.y = kfm(CKEY.y, Z.ct); CK.ty = kfm(CKEY.ty, Z.ct); CK.az = kfm(CKEY.az, Z.ct);
      applyDusk(Z.duskK);
      duskL = Z.lineL; duskY = Z.lineY;
      // ngọn cọ yếu dần rồi tắt khi trời tối; cuộn ngược về thì bật lại
      gateScroll = Z.gate;
      if (ink) { ink.setGate(gateIntro * gateScroll); if (gateScroll <= 0.02 && lastGate > 0.02) ink.clearPointer(); }
      lastGate = gateScroll;
      updateSunDir(camera, sunDir, sunView);
      unkai.update(clock);
      ridges.update(clock);
      sea.update(clock);
      P1 = performance.now();
      const tl = hover.update(dt, frozen ? froze : clock);
      P2 = performance.now();
      if (ink) ink.update(dt, frozen ? froze : clock);
      P3 = performance.now();
      // (30/9, Mike: "tilt chỉ ở trang home") rời màn đầu: độ nghiêng đang có về 0. (soát p11a B4: trước đây tắt gọn trong 0,4 s đầu
      // mực thấm — con trỏ ở mép phải máy QUAY NGƯỢC −8°/s, mép trái vọt 13,6°/s: hai cú máy) → GIỮ NGUYÊN độ nghiêng lúc vừa rời
      // (đồng hồ chuột thôi tác dụng) và trả về 0 theo ĐÚNG nhịp Z.ct của cú máy chính: góc = nghiêng·(1 − ct) + đường chính(ct) — cả hai
      // là hàm tuyến tính của cùng một ct nên tổng là MỘT chuyển động, một chiều, một nhịp (không đổi chiều dù con trỏ ở đâu)
      if (Z.sc <= 1e-5) { TIL.live = true; TIL.yaw = tl.yaw * touchK * TILT_K; TIL.pitch = tl.pitch * touchK * TILT_K; }
      else if (TIL.live) TIL.live = false;
      const tk1 = TIL.live ? 1 : 1 - Z.ct;
      tiltYaw = camLock ? 0 : TIL.yaw * tk1; tiltPitch = camLock ? 0 : TIL.pitch * tk1;   // màn mở: độ ăn chuột mở dần
      place(clock);
      placeTag();
      syncPlex();
      P4 = performance.now();
    }
    const gL = gpuBegin();
    if (castleOn) drawLines(dt); else if (post.ghepPass) post.ghepPass.enabled = false;
    // (nhảy có màn đầu: cảnh chương là ảnh chụp hoặc do khối "nhảy xa" bên dưới vẽ — bỏ qua các khối thường)
    const normal = !(JX.on && JX.day);
    // thung lũng: chỉ vẽ khi đang chuyển cảnh (vào khung đệm riêng) hoặc đã vào hẳn chương (vẽ thẳng vào chuỗi hậu kỳ);
    // sang hẳn mỏ đá thì thôi vẽ
    if (normal && valleyReady && Z.p > 0 && Z.p2 < 1) {
      valley.update(dts, Z.tau);
      valleyAim(Z.tau);
      if (breathCh === 1) breathe(valley.camera);
      if (Z.p < 1) {
        renderer.setRenderTarget(valleyRT);
        renderer.clear(true, true, true);
        renderer.render(valley.scene, valley.camera);
        renderer.setRenderTarget(null);
      }
    }
    // mỏ đá: đang chuyển cảnh 2 → vẽ vào khung đệm "cảnh đến"; đã vào chương → vẽ thẳng vào chuỗi hậu kỳ; qua đỉnh sương
    // của chuyển cảnh 3 thì thôi vẽ
    if (normal && quarryReady && Z.p2 > 0 && Z.p3 < 0.5) {
      quarry.update(dts, Z.tau2, 0);
      // chuyển cảnh 3: một cú bay thẳng (xem TR3)
      { const uq = forestReady ? u3(Z.sc) : 0; if (uq > 0) dolly3(quarry.camera, TR3.Lq * sineIO(uq)); }
      if (breathCh === 2) breathe(quarry.camera);
      { const E = sineIO(u3(Z.sc)); flowNow.set(0, TR3.F * TR3.dir.y * E, -TR3.F * TR3.dir.z * E); }
      if (Z.p2 < 1) {
        renderer.setRenderTarget(valleyRT);
        renderer.clear(true, true, true);
        renderer.render(quarry.scene, quarry.camera);
        renderer.setRenderTarget(null);
      }
    }
    // rừng: từ lúc bắt đầu chuyển cảnh 3 (máy đã đang bay dù chưa hiện) — vẽ thẳng vào chuỗi hậu kỳ sau đỉnh sương
    if (normal && forestReady && Z.p3 > 0 && Z.p4 < 0.5) {
      const uf = u3(Z.sc), dol3 = uf < 1 && !(nv.mode === 'trans' && nv.from === 3);
      if (dol3) arr3();
      rung.update(dts, Z.tau3);
      if (dol3) {
        // chuyển cảnh 3: tư thế lúc tới (nối dài theo vận tốc của chương) lùi lại phần cú bay còn lại
        const A = TR3.arr, rc = rung.camera;
        rc.position.copy(A.pA).addScaledVector(A.v, Z.sc - T5);
        { const L = 0.15 * (T5 - QX0), v = (T5 - Z.sc) / L, H = v >= 1 ? 0.5 * L : L * (v - v * v * v + 0.5 * v * v * v * v);
          rc.quaternion.copy(A.q.setFromAxisAngle(A.ax, -A.w * H)).multiply(A.qA); }
        if (rc.fov !== A.fov) { rc.fov = A.fov; rc.updateProjectionMatrix(); }
        dolly3(rc, -TR3.Lf * (1 - sineIO(uf)));
        const E = sineIO(uf); flowNow.set(0, TR3.F * TR3.dir.y * E, -TR3.F * TR3.dir.z * E);
      }
      // chuyển cảnh 4: máy trôi khẽ về phía trước sau cánh cửa giấy đang khép (cảnh sau giấy vẫn sống)
      if (Z.p4 > 0) { rung.camera.translateZ(-0.35 * sineIO(Z.p4 / 0.5)); rung.camera.updateMatrixWorld(); }
      if (breathCh === 3) breathe(rung.camera);
    }
    // làng giấy: máy đã đi từ 8,3 (trước chỗ đổi cảnh, sau cửa giấy); vẽ thẳng vào chuỗi hậu kỳ sau chỗ đổi
    if (normal && langReady && Z.p4 > 0 && Z.p5 < GSW) { lang.update(dts, Z.tau4); if (breathCh === 4) breathe(lang.camera); if (GIAY.on) langPush(sm(0, 0.34, GIAY.x)); }
    // 仕事: từ lúc giấy bắt đầu tan (thung lũng vào khung đệm "cảnh đến") → sau khi tan hết vẽ thẳng vào chuỗi hậu kỳ. Lớp chữ HTML
    // (nhãn, thẻ) chỉ hiện khi đang đứng hẳn trong chương
    if (normal && viecReady && Z.p5 > 0.55 && Z.p6 < W1) {
      const uiK = !JX.on && nv.cur === 5 && (nv.mode === 'play' || nv.mode === 'idle') ? 1 : 0;
      // (soát p10a A1) đầu chuyển cảnh 6 (đi tới): nhãn "Open Field · 2026 —" còn sáng thêm ~0,6 s — nét mới đi ra từ chính chấm ấy
      const keep = !JX.on && nv.mode === 'trans' && nv.from === 5 && nv.to === 6 && Z.p6 < 0.17 ? 4 : -1;
      viec.update(dts, Z.tau5, uiK, Z.tau5p ?? Z.tau5, Z.ex6, keep);
      if (breathCh === 5) breathe(viec.camera);
      if (GIAY.on && Z.p5 < GSW) { renderer.setRenderTarget(valleyRT); renderer.clear(true, true, true); renderer.render(viec.scene, viec.camera); renderer.setRenderTarget(null); }
      // (phần 9) quãng hoà cảnh của chuyển cảnh 6: 仕事 là "cảnh cũ" trong khung đệm, chuỗi hậu kỳ vẽ 連絡
      if (lienheReady && Z.p6 > W0) { renderer.setRenderTarget(valleyRT); renderer.clear(true, true, true); renderer.render(viec.scene, viec.camera); renderer.setRenderTarget(null); }
    } else if (viecReady && !JX.on) viec.update(0, Z.tau5, 0, Z.tau5p ?? Z.tau5);
    // 連絡: từ ngay trước quãng hoà cảnh (máy đã đang hạ khi vùng đất mới thấm ra) → vẽ thẳng vào chuỗi hậu kỳ
    if (normal && lienheReady && Z.p6 > W0 - 0.03) {
      // (soát p10a B2) điện thoại đang gõ: dời khung cảnh lên đủ để cả bãi đất (nét 地縄, dây, cọc) nằm TRÊN mép form — sau chữ form là
      // phần sườn tối như lúc nghỉ, ở mọi kiểu bàn phím ảo (khung nhìn chồng lên trang / khung trang co lại / trang cuộn lên). Dời êm
      // (~0,15 s), gõ xong thì về
      const LD = window.__kozoChuong && window.__kozoChuong.lhDo ? window.__kozoChuong.lhDo() : null;
      const liftT = LD && LD.typing && nv.cur === 6 && !JX.on ? Math.max(0, lienhe.padBottom() + 22 - LD.formTop) : 0;
      LIFT6 += (liftT - LIFT6) * Math.min(1, dt * 7);
      if (Math.abs(liftT - LIFT6) < 0.3) LIFT6 = liftT;
      lienhe.setLift(LIFT6);
      lienhe.update(dts, Z.s6);
      if (breathCh === 6) breathe(lienhe.camera);
    }
    if (viecReady && JX.on) viec.hideUI();
    { const want = viec && viec.cardRect() ? 1 : 0; cardK += (want - cardK) * Math.min(1, dt * 6); if (cardK < 1e-3 && !want) cardK = 0; }
    // nhảy từ màn đầu: hết mực thấm thì cảnh chương đích sống (đứng ở đầu chương tới khi tới nơi)
    if (JX.on && JX.day && !JX.swap && Z.p >= 1) chUpdate(JX.k, dt, zones(J.sIn, ZJ));
    // cửa giấy 3D: dựng tư thế + vẽ vào khung đệm riêng (lượt ShojiEffect đặt lên ảnh cảnh)
    if (DOOR.on) { cua.update(DOOR.x, dts); cua.render(renderer); }
    // dấu 緑青 trên cột chương: sang chương đích ngay khi trang nhận cú cuộn và GIỮ ở đó suốt chuyển cảnh (Mike 1/10: trước đây nó sang
    // chương mới lúc nhận cú cuộn, rồi nhảy về chương cũ khi chuyển cảnh bắt đầu, tới giữa chuyển cảnh mới sang lại)
    if (nv.mode === 'trans' && nv.to >= 1) Z.navCur = nv.to;
    // (soát p9a B2) bấm tên chương mà chương ấy còn đang dựng: ô 緑青 sang chương đích NGAY lúc bấm — trang đã nhận cú bấm
    if (nv.pend >= 1 && (nv.mode === 'idle' || nv.mode === 'play')) Z.navCur = nv.pend;
    // (soát p10a B4) ở MÀN ĐẦU cột chương chưa hiện: có cú bấm đang chờ (End, Contact…) thì cột chương hiện lên ngay với ô 緑青 ở chương
    // đích — dấu hiệu nhẹ "trang đã nhận", trong lúc chương ấy dựng nốt
    PENDK += ((nv.pend >= 1 && nv.cur === 0 && !nav.reduced ? 1 : 0) - PENDK) * Math.min(1, dt * 6);
    if (PENDK < 1e-3) PENDK = 0;
    Z.pendUi = PENDK;
    // (30/9, Mike) MỜ CHUYỂN: ô 緑青 ở chương đích ngay từ khung chụp; ảnh đứng của khung cũ tan dần trên cảnh mới (post.moPass)
    const MF = nv.fade;
    if (MF) Z.navCur = MF.to;
    // (soát p11a A2 / B3) chữ + giao diện đi THEO NHỊP MỜ: chữ bốn góc, khung vát, logo, cột chương nội suy từ số ở khung chụp sang
    // số của chương đích theo đúng đường cong của ảnh (không bật / tắt cụt trong một khung); chữ chương cũ tắt gọn (0,18 s — chuong.js),
    // chữ chương đích chỉ bắt đầu giải mã sau MO_TXT giây, lúc chữ cũ đã tắt hẳn
    Z.textFast = !!(MF && !MF.capture);
    if (MF && MF.capture) { FZ.id = MF.id; FZ.corner = Z.corner; FZ.ui = Z.ui; FZ.pend = Z.pendUi; }
    else if (MF && FZ.id === MF.id) {
      const e = moE(MF);
      Z.corner = FZ.corner + (Z.corner - FZ.corner) * e;
      Z.ui = FZ.ui + (Z.ui - FZ.ui) * e;
      Z.pendUi = Math.max(Z.pendUi, FZ.pend * (1 - e));
      if (MF.p * (MF.D || 0.7) < MO_TXT) Z.text = -1;
    }
    gpuEnd(gL);
    applyPost(Z);
    if (post.moPass) {
      const moOn = !!(MF && !MF.capture && moTex && MO.id === MF.id);
      post.moPass.enabled = moOn;
      if (moOn) { post.moFx.uniforms.get('uK').value = 1 - moE(MF); post.moFx.uniforms.get('tOld').value = moTex; }
    }
    // nét hình vẽ của thẻ 仕事: lượt riêng sau lớp tối sau chữ (soát p9a A2)
    if (post.hudPass) {
      const hOn = !!(viec && viecReady && !JX.on && Z.p5 >= 1 && viec.hudOn);
      post.hudPass.enabled = hOn;
      if (hOn) { viec.syncHud(); post.hudPass.mainScene = viec.hudScene; post.hudPass.mainCamera = viec.camera; }
    }
    const P5 = performance.now();
    const gP = gpuBegin();
    post.render(dt);
    // khung chụp của mờ chuyển: chép ngay khung vừa vẽ ra màn (đã qua mọi lớp hậu kỳ, đúng thứ người xem đang thấy) làm ảnh đứng
    if (MF && MF.capture && post.moPass) {
      const sz = renderer.getDrawingBufferSize(MOV2);
      if (!moTex || moTex.image.width !== sz.x || moTex.image.height !== sz.y) { if (moTex) moTex.dispose(); moTex = new THREE.FramebufferTexture(sz.x, sz.y); }
      renderer.setRenderTarget(null);
      renderer.copyFramebufferToTexture(moTex);
      MO.id = MF.id;
    }
    gpuEnd(gP);
    const P6 = performance.now();
    if (window.__kozoChuong) window.__kozoChuong.update(Z);
    netTick(now, Z);
    if (camLogOn) { const lhc = lienhe && lienheReady ? lienhe.camera.position : null; const vcc = viec && viecReady ? viec.camera.position : null; const c = camera.position, v = valley ? valley.camera.position : null, qc = quarry ? quarry.camera.position : null, fc = rung ? rung.camera.position : null, lc = lang ? lang.camera.position : null; api.camLog.push([now, nv.s, c.x, c.y, c.z, v ? v.x : 0, v ? v.y : 0, v ? v.z : 0, Z.p, qc ? qc.x : 0, qc ? qc.y : 0, qc ? qc.z : 0, Z.p2, fc ? fc.x : 0, fc ? fc.y : 0, fc ? fc.z : 0, Z.p3, lc ? lc.x : 0, lc ? lc.y : 0, lc ? lc.z : 0, Z.p4, DOOR.on ? cua.camera.position.x : 0, DOOR.on ? cua.camera.position.y : 0, DOOR.on ? cua.camera.position.z : 0, DOOR.on ? DOOR.x : -1, vcc ? vcc.x : 0, vcc ? vcc.y : 0, vcc ? vcc.z : 0, viecReady ? Z.p5 : 0, lhc ? lhc.x : 0, lhc ? lhc.y : 0, lhc ? lhc.z : 0, lienheReady ? Z.p6 : 0]); }
    if (PROF.on) {
      const row = { t: now, canh: P1 - P0, hover: P2 - P1, co: P3 - P2, khac: P4 - P3, net: P5 - P4, hauky: P6 - P5, js: P6 - P0, gNet: null, gHauky: null, heap: performance.memory ? performance.memory.usedJSHeapSize : 0, diem: ink ? ink.points : 0 };
      PROF.rows.push(row);
      if (gL) PROF.pend.push({ q: gL, row, k: 'gNet' });
      if (gP) PROF.pend.push({ q: gP, row, k: 'gHauky' });
      if (PROF.rows.length > 20000) PROF.rows.shift();
    }
    if (tq && PROF.pend.length) gpuPoll();
    // chọn nấc màu: chép khung vừa vẽ ~5 lần mỗi giây, ảnh về (bất đồng bộ) thì chọn lại nấc
    toneT += dt; toneAge++;
    if (toneOn && toneT > 0.2 && tone.capture()) { toneT = 0; toneAge = 0; }
    if (tone.poll()) toneAll();
    if (frozen) clock = froze;
    if (!api.ready) {
      api.ready = true;
      try { sessionStorage.removeItem('kozo-retry'); } catch (e) { /* không có bộ nhớ phiên */ }
      api.readyMs = Math.round(performance.now() - t0);
      document.documentElement.classList.add('ready');
    }
    // dựng thung lũng ngầm: phần thời gian còn lại của khung (≤ 3 ms)
    {
      const st = nav.state(), ready = [true, valleyReady, quarryReady, forestReady, langReady, viecReady, lienheReady];
      // ưu tiên: chương người xem ĐANG CHỜ (cú lăn / cú bấm nhớ lại) → chương kế tiếp → (bài kiểm) dựng hết theo thứ tự
      let need = 0;
      const want = (k) => { if (!need && k > 0 && k <= 6 && !ready[k]) need = k; };
      const busy = nv.mode === 'trans' || nv.mode === 'jump';
      // (soát p9a B2) có người ĐANG CHỜ (đã bấm tên chương / lăn tới mà chương chưa dựng xong, hoặc đứng ở cổng chờ) → mỗi khung
      // dành ~7 ms cho việc dựng thay vì 1,5–3 ms
      const hurry = st.pend !== null || st.queue !== null || !!nv.waiting;
      // (lăn sớm: thung lũng đang được chờ ở cổng chạng vạng) · (Sếp 29/9 sau p9b: cuộn rất nhanh phải chờ rừng dựng) đang chuyển tới
      // một chương ĐÃ SẴN thì dựng luôn chương SAU nó, ngân sách nhỏ như lúc nghỉ — người lăn liên tục không phải đứng chờ ở chương kế
      if (busy) { want(nv.to); if (nv.mode === 'trans' && nv.dir > 0) want(nv.to + 1); }
      else {
        if (st.pend !== null) want(st.pend);
        if (st.queue !== null) want(st.queue);
        if (QS.has('chuong')) want(Math.round(+QS.get('chuong') || 0));
        want(nv.cur + 1);
        // (soát p9a B2) đã vào trang (qua màn đầu) thì dựng ngầm LẦN LƯỢT mọi chương còn thiếu — không chờ người xem tới chương
        // đứng trước nó: bấm "Work" từ chương nào cũng đã sẵn (hoặc gần sẵn)
        // (Sếp 29/9 sau p9b, lỗi cũ p7b "cuộn rất nhanh phải chờ rừng dựng") bắt đầu ngay khi màn mở xong và thung lũng đã sẵn — lúc
        // người xem còn đứng ở màn đầu — không chờ tới 地
        if (nv.cur >= 1 || api.dungHet || (api.introDone && valleyReady)) for (let k = 1; k <= 6; k++) want(k);
      }
      // (soát p11a B5 — mở trang lần đầu: 地 giật 25 khung, dài nhất 517 ms, trùng lúc dịch shader rừng + dịch sẵn 仕事 / 連絡) việc NẶNG
      // của card đồ hoạ — gửi dịch chương trình (trên Windows khâu dịch GLSL → HLSL chạy ngay trên luồng đồ hoạ), dùng đầu, vẽ đầu —
      // CHỈ làm khi chương đang NGHỈ (không lúc chương đang chạy nét, không lúc chuyển cảnh / mờ chuyển), trừ khi có người đang chờ
      // chương ấy; và MỖI KHUNG TỐI ĐA MỘT việc nặng (của mọi chương cộng lại). Việc của luồng chính (dựng hình từng mẩu) vẫn chạy mọi lúc.
      const quiet = !busy && !nv.fade && nv.mode === 'idle';
      const gpuOK = quiet || hurry || !!api.dungHet;
      const heavyOf = (k) => (k === 1 ? BG.phase >= 2 : k === 2 ? QB.phase >= 2 : k === 3 ? FB.phase >= 1 && FB.phase !== 3 : k === 4 ? LB.phase >= 1 && LB.phase !== 3 : k === 5 ? VB.phase >= 1 && VB.phase !== 3 : k === 6 ? LH.phase >= 2 : false);
      if (need > 0 && heavyOf(need) && !gpuOK) need = -1;
      let heavyDone = need > 0 && heavyOf(need);
      const tb = performance.now();
      let ph = -1;
      if (need === 1 && BG.phase < 4) { ph = BG.phase; bgStep(hurry ? 7 : 3); }
      else if (need === 2 && QB.phase < 4) { ph = 10 + QB.phase; qbStep(hurry ? 7 : 3); }
      else if (need === 3 && FB.phase < 5) { ph = 20 + FB.phase; fbStep(hurry ? 7 : 1.5); }
      else if (need === 4 && LB.phase < 5) { ph = 30 + LB.phase; lbStep(hurry ? 7 : 1.5); }
      else if (need === 5 && VB.phase < 5) {
        ph = 40 + VB.phase; VB.hurry = hurry;
        // đang có người chờ: làm nhiều bước một khung (vẽ đầu từng lưới vốn mỗi khung một cái) tới khi hết ~7 ms
        const tE = tb + (hurry ? 7 : 1.5);
        let guard = 0;
        // (chỉ ở bước dựng hình và vẽ đầu lưới thật — dịch shader / vẽ đầu chương trình mới vẫn mỗi khung một cái: dồn nhiều vào một khung
        //  thì card đồ hoạ nghẽn 50–80 ms, đo 29/9)
        do { vbStep(hurry ? Math.max(0.5, tE - performance.now()) : 1.5); if (!hurry || VB.phase >= 5 || VB.phase < 3) break; } while (performance.now() < tE && ++guard < 200);
      }
      else if (need === 6 && LH.phase < 5) { ph = 50 + LH.phase; lhStep(hurry ? 7 : 2.5); }
      // (Sếp 29/9 sau p9b) DỊCH SẴN shader 仕事 NGAY KHI VÀO TRANG (sau màn mở), song song với việc dựng các chương khác: gửi dịch
      // KHÔNG CHẶN (KHR_parallel_shader_compile — mỗi khung gửi một chương trình, tối đa hai cái đang dịch, chỉ hỏi "xong chưa"),
      // dùng đầu, rồi vẽ đầu hình giả mỗi khung một cái. Tới lúc người xem bấm Work thì chỉ còn dựng hình (việc của luồng chính,
      // chia mẩu) — không còn khung nào phải đợi card dịch shader.
      // (không cùng khung với bước dịch / vẽ đầu của chương khác — hai việc của card dồn một khung thì khung ấy dài)
      let early = false;
      if (need !== 5 && (ph < 0 || ph % 10 >= 3) && viec && VB.phase < 3 && !busy && api.ready && (!INTRO_MODE || api.introDone) && (VB.phase < 1 || (gpuOK && !heavyDone))) { const p0 = VB.phase; vbStep(1.5); if (ph < 0) ph = 40 + p0; early = true; if (p0 >= 1) heavyDone = true; }
      // (soát p10a B4) dịch sẵn shader 連絡 ngay khi vào trang, xen kẽ với 仕事 (không cùng khung với một bước dịch / vẽ đầu khác; cùng
      // khung với bước DỰNG hình của 連絡 thì được — việc ấy chỉ của luồng chính). Người xem đang CHỜ 連絡 (bấm End / Contact từ màn
      // đầu) thì chạy luôn, kể cả khi màn mở chưa xong
      const want6 = st.pend === 6 || st.queue === 6 || (busy && nv.to === 6);
      if (!early && LW.phase < 3 && !lienheReady && LH.phase < 2 && api.ready && (want6 || (!busy && (!INTRO_MODE || api.introDone)))) {
        // tạo cảnh + hình giả (0, 0.5), gửi dịch / hỏi xong chưa (1), dùng đầu (1.5): việc rất nhẹ của luồng chính (card dịch ở luồng
        // riêng) → mọi khung không chuyển cảnh, kể cả khi chương khác đang dựng ngầm cùng khung. Vẽ đầu hình giả (2): chỉ khung không có
        // việc ngầm nào khác (hoặc người xem đang chờ 連絡)
        // (soát p11a B5) chỉ tạo cảnh + hình giả (0, 0.5) là việc nhẹ; gửi dịch / dùng đầu / vẽ đầu là việc NẶNG của card — như mọi
        // chương: chỉ lúc nghỉ (hoặc có người chờ 連絡) và không cùng khung với việc nặng khác
        const light = LW.phase <= 0.5;   // (tạo cảnh + hình giả đo được ≤ 1 ms)
        if (light || (!heavyDone && (want6 || gpuOK))) { const p0 = LW.phase; lwStep(); if (ph < 0) ph = 60 + Math.floor(p0 * 2); }
      }
      if (ph >= 0) BG.frames.push([Math.round(now), ph, +(performance.now() - tb).toFixed(1), ph >= 50 ? LH.last || lienhe.st.at : ph >= 40 ? VB.last || viec.st.at : '']);
      LH.last = '';
      VB.last = '';
    }
  }
  requestAnimationFrame(frame);

  // ── móc kiểm tra ───────────────────────────────────────────────────────────
  api.setStage = () => 0;
  api.stage = () => 0;
  api.measure = () => (post.measure ? post.measure() : null);
  api.camera = () => ({ dist, camY, azim, shiftFrac, fov: camera.fov });
  api.setCamera = (o) => {
    if (o.dist !== undefined) dist = o.dist;
    if (o.camY !== undefined) camY = o.camY;
    if (o.azim !== undefined) azim = o.azim;
    if (o.shiftFrac !== undefined) shiftFrac = o.shiftFrac;
    if (o.targetY !== undefined) TARGET.y = o.targetY;
    place(clock);
  };
  api.screenBox = () => {
    castle.updateMatrixWorld(true);
    const w = window.innerWidth, h = window.innerHeight;
    const box = new THREE.Box3().setFromObject(castle), v = new THREE.Vector3();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      v.set(x, y, z).project(camera);
      const px = ((v.x + 1) / 2) * w, py = ((1 - v.y) / 2) * h;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    return { x0, y0, x1, y1, w, h };
  };
  api.info = () => renderer.info.render;
  // cọ mực chỉ nhận con trỏ sau khi màn mở mở cọ (giây 5)
  api.setMouse = (x, y) => {
    hover.setPointer(x, y, window.innerWidth, window.innerHeight); lastPtr = [x, y];
    if (ink && MUC && brushOn && gateScroll > 0.02) ink.setPointer(x, y, window.innerWidth, window.innerHeight);
    // (30/9, Mike: "tilt màn hình chỉ ở trang home thôi") chương 1–6 không còn nghiêng máy theo chuột — chỉ màn đầu (hover ở trên);
    // 仕事 vẫn cần toạ độ con trỏ để chọn nhà trên bản đồ
    if (viec) viec.setPointer(x, y);
  };
  api.clearMouse = () => { hover.clearPointer(); lastPtr = null; if (ink) ink.clearPointer(); if (viec) viec.clearPointer(); };
  api.hoverState = () => hover.state();
  api.dbgCons = () => hover.dbgCons();
  api.freeze = (on) => { frozen = !!on; froze = clock; };
  api.setTime = (v) => { clock = v; frozen = true; froze = v; };
  api.hide = (n, v) => { scene.traverse((o) => { if (o.name === n) o.visible = !v; }); };
  api.bench = (seconds) => new Promise((res) => {
    const t = []; let l = performance.now(); const end = l + (seconds || 4) * 1000;
    function tick(now) { t.push(now - l); l = now; if (now < end) requestAnimationFrame(tick); else res(t.slice(2)); }
    requestAnimationFrame(tick);
  });
  api.probe = (px, py) => {
    const r = new THREE.Raycaster();
    r.setFromCamera(new THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1), camera);
    return r.intersectObjects(scene.children, true).slice(0, 4).map((h) => ({
      name: h.object.name || h.object.type, parent: h.object.parent && h.object.parent.name, d: +h.distance.toFixed(1),
    }));
  };
  api.lamps = lamps.length;
  api.stoneHulls = () => {
    castle.updateMatrixWorld(true);
    const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
    return ishigaki.mods.map((md) => {
      md.mesh.getMatrixAt(md.idx, m4); m4.premultiply(castle.matrixWorld);
      const g = md.mesh.geometry.attributes.position, out = [];
      for (let k = 0; k < g.count; k += 2) { v.fromBufferAttribute(g, k).applyMatrix4(m4); out.push(+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)); }
      return out;
    });
  };
  // đỉnh thật của từng tảng ở tư thế NGUYÊN VẸN (chưa đẩy, chưa thở) — mốc để so "cắn sâu hơn lúc nghỉ"
  api.stoneHullsRest = () => {
    castle.updateMatrixWorld(true);
    const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
    return ishigaki.mods.map((md) => {
      m4.compose(md.c0, md.quat, md.scl); m4.premultiply(castle.matrixWorld);
      const g = md.mesh.geometry.attributes.position, out = [];
      for (let k = 0; k < g.count; k += 2) { v.fromBufferAttribute(g, k).applyMatrix4(m4); out.push(+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)); }
      return out;
    });
  };
  api.stoneOBBRest = () => {
    castle.updateMatrixWorld(true);
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), qq = new THREE.Quaternion(), sc = new THREE.Vector3();
    return ishigaki.mods.map((md, i) => { m4.compose(md.c0, md.quat, md.scl); m4.premultiply(castle.matrixWorld); m4.decompose(p, qq, sc); return { i, c: p.toArray(), q: qq.toArray() }; });
  };
  api.pushes = () => ishigaki.mods.map((m) => +m.cur.toFixed(3));
  api.stoneOBB = () => {
    castle.updateMatrixWorld(true);
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), qq = new THREE.Quaternion(), sc = new THREE.Vector3();
    return ishigaki.mods.map((md, i) => { md.mesh.getMatrixAt(md.idx, m4); m4.premultiply(castle.matrixWorld); m4.decompose(p, qq, sc); return { i, c: p.toArray(), q: qq.toArray() }; });
  };
  api.plexCheck = () => {
    const r = new THREE.Raycaster(), out = [];
    const all = [];
    scene.traverse((o) => { if (o.isMesh && o.visible) all.push(o); });
    for (const pe of hover.plexEls) {
      if (!pe.at || pe.g.style.opacity === '0') continue;
      const pk = hover.plexPick[hover.plexEls.indexOf(pe)];
      if (!pk) continue;
      r.setFromCamera(new THREE.Vector2((pe.at.x / window.innerWidth) * 2 - 1, -(pe.at.y / window.innerHeight) * 2 + 1), camera);
      const h = r.intersectObjects(all, false).find((q) => !(q.object.material && q.object.material.transparent));
      let own = false;
      if (h && pk.kind === 'da') { const md = ishigaki.mods[pk.i]; own = h.object === md.mesh && h.instanceId === md.idx; }
      if (h && pk.kind === 'o') { const k = tenshu.cells[pk.i]; own = (h.object === k.im && h.instanceId === k.idx) || k.att.some((a) => h.object === a.im && h.instanceId === a.idx); }
      if (h && pk.kind === 'mai') { let o = h.object; const g = hover.segs[pk.i].group; while (o && o !== g) o = o.parent; own = !!o; }
      out.push({ kind: pk.kind, i: pk.i, hit: !!h, onOwn: own, x: +pe.at.x.toFixed(1), y: +pe.at.y.toFixed(1) });
    }
    return out;
  };
  api.towerState = () => {
    const st = hover.state();
    const moved = st.cells.filter((k) => k.out > 0.05);
    return { cells: tenshu.cells.length, segs: hover.segs.length, moved: moved.length, outMax: Math.max(0, ...st.cells.map((k) => k.out)),
      phiMax: Math.max(0, ...st.segs.map((q) => q.phi)), segsMoved: st.segs.filter((q) => q.phi > 0.05).length, cap: hover.capScale, cons: hover.cons,
      towerY: tenshu.group.position.y, frames: tenshu.frames.map((f) => f.group.position.y), roofsY: tenshu.roofs.map((r) => r.group.position.y) };
  };
  // hộp THẬT của từng ô tường (lúc này, hoặc lúc nguyên vẹn) — cho phép tách trục
  api.cellOBB = (rest) => {
    castle.updateMatrixWorld(true);
    const m4 = new THREE.Matrix4(), p = new THREE.Vector3(), qq = new THREE.Quaternion(), sc = new THREE.Vector3();
    return tenshu.cells.map((k) => {
      if (rest) m4.compose(k.cRest, k.quat, k.scl); else k.im.getMatrixAt(k.idx, m4);
      m4.premultiply(tenshu.group.matrixWorld);
      m4.decompose(p, qq, sc);
      const R = new THREE.Matrix4().makeRotationFromQuaternion(qq).elements;
      return { c: p.toArray(), ax: [[R[0], R[1], R[2]], [R[4], R[5], R[6]], [R[8], R[9], R[10]]], h: [sc.x / 2, sc.y / 2, sc.z / 2], t: k.tier, f: k.face };
    });
  };
  // đỉnh của các mảnh hiên (lúc này / lúc nguyên vẹn), toạ độ thế giới — kiểm mảnh hiên với ô tường
  api.segVerts = (rest) => {
    castle.updateMatrixWorld(true);
    const v = new THREE.Vector3(), out = [];
    for (const sg of hover.segs) {
      const g = sg.mesh.geometry.attributes.position, arr = [];
      const M4 = rest ? sg.roof.group.matrixWorld : sg.group.matrixWorld;
      for (let k = 0; k < g.count; k += 3) { v.fromBufferAttribute(g, k).applyMatrix4(M4); arr.push(+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)); }
      out.push(arr);
    }
    return out;
  };
  // hàng đá trên cùng với gờ đỉnh 武者返し: đỉnh tảng lọt dưới gờ, gờ giãn theo. Đo trong hệ của gờ (bỏ
  // phép giãn của gờ đi), tìm đỉnh tảng nào lọt vào khối gờ: ở vành 0,05–0,60 m ngoài mép tường và cao
  // hơn mặt dưới gờ. So với lúc nguyên vẹn.
  api.capCheck = () => {
    // hàng đá trên cùng với các mảnh gờ đỉnh 武者返し: đỉnh tảng lọt dưới gờ. Đưa từng đỉnh về hệ của
    // mảnh gờ phía trên nó (bỏ phần mảnh đã dịch), rồi xem đỉnh ấy có lọt vào khối gờ không: ở vành
    // 0,05–0,60 m ngoài mép tường và cao hơn mặt dưới gờ. So với lúc nguyên vẹn.
    const top = Math.max(...ishigaki.mods.map((m) => m.course));
    const e1 = [12.5, 10.5], H = IS.H, sq = 0.22;
    const offOf = (x, z) => {
      let lo = -4, hi = 4;
      for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2, A = e1[0] + m, B = e1[1] + m;
        const f = Math.pow(Math.abs(x / A), 2 / sq) + Math.pow(Math.abs(z / B), 2 / sq); if (f > 1) lo = m; else hi = m; }
      return (lo + hi) / 2;
    };
    const under = (d) => H - 0.55 + ((d - 0.05) / 0.55) * 0.65;
    const pieces = ishigaki.cap.children;
    const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), w = new THREE.Vector3();
    let now = 0, rest = 0, nNow = 0;
    for (const md of ishigaki.mods) {
      if (md.course !== top) continue;
      for (const which of ['now', 'rest']) {
        if (which === 'now') md.mesh.getMatrixAt(md.idx, m4); else m4.compose(md.c0, md.quat, md.scl);
        const g = md.mesh.geometry.attributes.position; let worst = 0;
        for (let k = 0; k < g.count; k++) {
          v.fromBufferAttribute(g, k).applyMatrix4(m4);
          for (const pc of pieces) {
            const u = pc.userData.cap;
            w.copy(v); if (which === 'now') w.sub(pc.position);
            let da = Math.atan2(w.z, w.x) - u.mid; da = Math.atan2(Math.sin(da), Math.cos(da));
            if (Math.abs(da) > u.half) continue;
            const d = offOf(w.x, w.z);
            if (d < 0.05 || d > 0.6 || w.y > H + 0.44) continue;
            worst = Math.max(worst, w.y - under(d));
          }
        }
        if (which === 'now') { now = Math.max(now, worst); if (worst > 0.005) nNow++; } else rest = Math.max(rest, worst);
      }
    }
    return { sauNhat: +now.toFixed(3), sauNhatLucNghi: +rest.toFixed(3), soTang: nNow };
  };
  api.tag = () => (tagA ? { a: [tagA.x1, tagA.y1, tagA.x2, tagA.y2], b: [tagB.x1, tagB.y1, tagB.x2, tagB.y2], at: tagAt, label: tagEl.getBoundingClientRect().toJSON() } : null);
  api.plexState = () => hover.plexEls.map((pe, k) => ({ k, at: pe.at || null, box: pe.box || null, op: +(pe.g.style.opacity || 0), num: pe.txt.textContent, fill: pe.txt.style.fill, step: pe.txt._step, dot: pe.dot._step }));
  api.dbg = { scene, THREE, post, camera, INTRO, setRevealVariant };   // móc dò lỗi cho bài kiểm (không dùng trên trang)
  api.outcrop = outcrop.boulders;
  api.rocks = hill.rocks;
} catch (e) {
  if (e === SOFT) {
    api.textOnly = true;
    api.error = 'software renderer: ' + (api.gpu ? api.gpu().name : '');
    console.info('[kozo] chip vẽ bằng CPU — trang vào bản đọc chữ, không dựng cảnh 3D:', api.gpu ? api.gpu().name : '');
  } else if (e === NOGL) {
    api.noGL = true;
    api.error = 'no WebGL2';
    console.info('[kozo] máy không có WebGL2 — trang vào bản đọc chữ, không dựng cảnh 3D');
  } else {
    api.error = String((e && e.stack) || e);
    console.error('[kozo-look] DỰNG CẢNH HỎNG:', e);
  }
}
