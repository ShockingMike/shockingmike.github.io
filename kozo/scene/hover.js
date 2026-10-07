// Phản ứng rê chuột + tháo-lắp theo cuộn của Studio Kōzō.
//
// ── RÊ CHUỘT MÀN ĐẦU: CÓ TRỌNG LƯỢNG (Mike 24/9: "cảm giác đang bị chơi vơi") ───────────────────────
// Luật (24/9, bản cuối):
//   1. KHÔNG GÌ NHẤC CẢ KHỐI. Thân tháp, các tầng, mặt đất, mỏm núi, vành đá chân: đứng yên tuyệt đối.
//      Bản trước cho mái nhấc lên rồi kéo cả chồng tầng lên theo — cả toà nhấp nhô như tháp bóng bay.
//   2. CHUYỂN ĐỘNG ĐI RA NGOÀI, KHÔNG ĐI LÊN — đúng công thức igloo: mỗi mô-đun giãn ra xa TRỤC ĐỨNG giữa
//      công trình theo phương ngang,  vị_trí = gốc + (gốc − trục)·s.  Giãn quanh một trục thì khoảng cách
//      giữa hai mô-đun nào cũng lớn ra, nên khe tự mở, lộ phần sáng bên trong.
//      Thành phần đi lên duy nhất có lý do vật lý: tường đá 石垣 dốc ngả vào, mặt đáy của mỗi tảng nghiêng
//      lên phía ngoài — tảng trượt ra thì phải TRƯỢT THEO MẶT ĐÁY (lên chừng 0,1–0,3 m), không thì nó
//      cắm vào hàng dưới. Phần lên này tính từ đúng độ dốc mặt đáy, không hơn.
//   3. Mái KHÔNG nhấc cả vành: vành hiên chia thành mảnh ~3 m theo chiều dài hiên, mảnh gần con trỏ bẻ
//      ra ngoài quanh bản lề ở mép trong như cánh hoa hé, lộ rui mè bên dưới. Phần đỉnh mái đứng yên.
//   4. Tường chia thành Ô theo lưới khung gỗ (gian ~1,8 m × xà ~1,37 m). Mỗi ô là một mô-đun; khe giữa
//      các ô mở ra thì lộ lưới cột kèo phát sáng phía sau. Hàng ô dưới vành hiên thõng chỉ ra trong chỗ
//      trống dưới vành (≤ 90%), không bao giờ nhấc mái lên để nhường chỗ.
//   5. Nặng thì chậm, nhẹ thì nhanh: đá và mảnh mái giãn vừa, làm mượt 0,045; ô tường đi nhiều hơn, 0,07.
//   6. Thở = phồng ra thu vào quanh trục. Nền đá thở rõ; phần lầu gỗ không thở.
//   7. Chuột đứng yên thì mọi thứ dừng: nhịp riêng của từng mô-đun trôi rất chậm (chu kỳ ~60 s).
//   Không xuyên vật: mỗi cặp mô-đun kề nhau có một ràng buộc tuyến tính trên mặt tiếp giáp (xem `cons`).
//   Tảng bên trong mà giãn nhiều hơn tảng bên ngoài thì tảng ngoài bị thúc — nó ĐI THEO (nâng mức giãn
//   vừa đủ), trừ khi nó bị khoá (vành đá chân) hoặc chạm trần (ô dưới vành hiên): khi ấy mới hạ tảng
//   trong. Hai mô-đun đã lệch nhau theo pháp tuyến quá bề dày (một cái đã ra hẳn phía trước cái kia) thì
//   ràng buộc nhả dần — khe tiếp giáp lúc ấy không còn đối diện nhau nữa.
//
// THÁO-LẮP theo cuộn (các màn sau): giữ như cũ — hình nổ trục đo, không dùng ở màn đầu.
import * as THREE from 'three';

const damp = (k, dt) => 1 - Math.pow(1 - k, Math.max(0, Math.min(4, dt * 60)));
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// ── hằng số của hình nổ trục đo (tháo theo cuộn) ─────────────────────────────
const NO = { SR: 1.07, SY: 1.06, DN: 1.0, TB: 1.4, D: 7.5, R: 3.2, SK1: 1.6, SK2: 1.3 };

// ── rê chuột ─────────────────────────────────────────────────────────────────
export const HV = {
  KS: 0.80, DS: 0.045,     // đá: một đơn vị đẩy giãn 50% khoảng cách tới trục · làm mượt chậm (nặng)
  KW: 0.50, DW: 0.07,      // ô tường: nhẹ, nhanh
  KR: 0.50, DR: 0.045,     // mảnh hiên: góc bẻ (rad) trên một đơn vị đẩy
  TILT: 0.5,               // igloo: nghiêng mỗi trục cos(đẩy·2 + rand·30)·đẩy·0,5 rad
  TILT_W: 0.22,            // ô tường nghiêng nhẹ hơn
  G: 0.004,                // (đá) mạch được phép khép lại tối đa 4 mm so với lúc nghỉ
  GR: 0.03,                // quỹ mạch lúc nghỉ dành cho nghiêng
  R1: 5.0, R2: 14.0,       // đủ lực trong 5 m, tắt ở 14 m (igloo: 1 và 3 đơn vị trên lều bán kính ~3)
  BREATH: 0.12,            // nền đá thở (thở mạnh hơn thì mạch góc tường há trắng từng nhịp)
};

export function createHover(opt) {
  const { camera, castle, target, mods, roofs, materials, svg, core } = opt;
  const cells = opt.cells || [];
  const frames = opt.frames || [];
  const tower = opt.tower || null;
  const cap = opt.cap || null;
  const towerY0 = tower ? tower.position.y : 0;
  const coreE0 = core ? core.emissiveIntensity : 0;
  const coreC0 = core ? core.color.clone() : null;
  const coreDark = new THREE.Color(0x8a93a3);
  const RAD = opt.radius || 14;
  const PUSH_M = opt.push || 1.0;
  const GATE = opt.gate || [1.2, 6.5];
  const hitList = opt.hitMeshes || [];
  // motion: false → toà thành ĐỨNG YÊN hoàn toàn (hướng ngọn cọ mực, 24/9). Bộ máy vỡ khối kiểu igloo vẫn giữ
  // nguyên ở đây, bật lại bằng ?ro=vo để so.
  const MOTION = opt.motion !== false;
  let fastN = 0;

  // MỘT bộ máy cho mọi mô-đun: khoảng cách tới điểm con trỏ trên mặt công trình → mức đẩy, max(thở,
  // chuột), hai tầng làm mượt với hệ số theo trọng lượng. Nhịp riêng `c` trôi rất chậm.
  function drive(m, d, y, amp, gate, dt, t, k, R1 = HV.R1, R2 = HV.R2, var_ = 0.3) {
    const s = smoothstep(R1, R2, d);
    // mỗi mô-đun một biên độ riêng CỐ ĐỊNH (c0) + một phần trôi rất nhỏ, rất chậm (chu kỳ ~80 s): chuột đứng
    // yên thì mọi thứ dừng — bản trước để c chạy theo sin(t) nên ô tường cứ trôi ~0,1 m/s mãi không thôi
    const c0 = (m.rand * 2 - 1) * (0.4 + 0.6 * m.rand);
    const c = c0 * 0.85 + 0.15 * Math.sin(t * 0.08 + m.rand * 12.342);
    const h = (1 - s) * (0.5 + var_ * c);
    const br = amp * 0.4 * (Math.sin(-2 * t + y * 0.15) * 0.5 + 0.5) * (Math.cos(-t) * 0.5 + 0.5) * (0.5 + 1.5 * m.rand) * 0.5;
    const tg = MOTION ? Math.max(br, h) * gate : 0;
    m.tmp += (tg - m.tmp) * damp(k, dt);
    m.cur += (m.tmp - m.cur) * damp(k, dt);
    if (!(m.cur >= 0)) { m.cur = 0; m.tmp = 0; }
    return 1 - s;
  }
  const plane = new THREE.Plane();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const camDir = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const mouse3D = new THREE.Vector3(0, 1e6, 0);
  const mouseLocal = new THREE.Vector3(0, 1e6, 0);
  let hasPointer = false, px = 0, py = 0, pw = 1, ph = 1;
  let tiltTX = 0, tiltTY = 0, tiltX = 0, tiltY = 0;
  let bTmp = 0, bCur = 0;

  const UP = new THREE.Vector3(0, 1, 0);
  const uA = new THREE.Vector3(), uB = new THREE.Vector3();

  // ── mô-đun chung ───────────────────────────────────────────────────────────
  // rel = (gốc − trục) nằm ngang; nrm = pháp tuyến mặt ngoài; D = bề dày theo pháp tuyến
  function initMod(m, c0, nrm, D, kind) {
    m.tmp = 0; m.cur = 0; m.dTmp = 0; m.dCur = 0; m.s = 0; m.v = 0; m.tk = 0; m.sMax = 1; m.lock = false;
    m.c0 = c0; m.kind = kind;
    m.rel = new THREE.Vector3(c0.x, 0, c0.z);
    m.nrmH = new THREE.Vector3(nrm.x, 0, nrm.z).normalize();
    m.D = D;
    m.cons = [];
  }
  // ràng buộc: a nằm phía +u của b.  mạch đổi = s_a·Pa − s_b·Pb   (≥ −G, trừ khi đã lệch nhau quá bề dày)
  // G: mạch được phép khép lại bao nhiêu · GR: mạch lúc nghỉ (quỹ cho nghiêng) — theo từng loại mô-đun:
  // tảng đá có mạch 2,5–8 cm; ô tường khít (2 mm) nên gần như không được khép chút nào
  function makeCon(list, a, b, u, G = 0.004, GR = 0.012) {
    const Pa = a.rel.dot(u), Pb = b.rel.dot(u);
    if (Pa - Pb < 0.05) return null;
    uB.copy(a.nrmH).add(b.nrmH).normalize();
    const c = { a, b, Pa, Pb, Na: a.rel.dot(uB), Nb: b.rel.dot(uB), free: Pa >= 0 && Pb <= 0, uy: u.y, vert: Math.abs(u.y) > 0.5, G, GR };
    list.push(c); a.cons.push(c); b.cons.push(c);
    return c;
  }
  // nhả dần khi một mô-đun đã ra hẳn phía trước mô-đun kia (lệch theo pháp tuyến quá bề dày của nó)
  const release = (c) => {
    const gn = c.a.s * c.Na - c.b.s * c.Nb;
    const need = gn > 0 ? c.a.D : c.b.D;
    return Math.max(0, Math.abs(gn) - need - 0.03) * 30;
  };
  function solve(list) {
    for (let pass = 0; pass < 14; pass++) {
      let doi = false;
      for (const c of list) {
        if (c.free) continue;
        const T = release(c);
        if (c.a.s * c.Pa - c.b.s * c.Pb + c.G + T >= -1e-7) continue;
        if (c.Pb > 0) {                       // a xa trục hơn → a đi theo
          const want = (c.b.s * c.Pb - c.G - T) / c.Pa;
          if (!c.a.lock && want <= c.a.sMax) c.a.s = want;
          else { if (!c.a.lock) c.a.s = Math.max(c.a.s, c.a.sMax); c.b.s = Math.max(0, (c.a.s * c.Pa + c.G + T) / c.Pb); }
        } else {                              // cả hai âm: b xa trục hơn → b đi theo
          const want = (c.a.s * c.Pa + c.G + T) / c.Pb;
          if (!c.b.lock && want <= c.b.sMax) c.b.s = want;
          else { if (!c.b.lock) c.b.s = Math.max(c.b.s, c.b.sMax); c.a.s = Math.max(0, (c.b.s * c.Pb - c.G - T) / c.Pa); }
        }
        doi = true;
      }
      if (!doi) break;
    }
    // Pha 2: chỉ HẠ tảng/ô phía trong cho tới khi mọi mạch đạt. Pha 1 có thể nâng một ô ngoài rồi ô ấy lại bị
    // ô kế tiếp (đang chạm trần, ví dụ ô dưới vành hiên ở góc tường) kéo xuống — chỉ hạ thì chắc chắn hội tụ.
    for (let pass = 0; pass < 40; pass++) {
      let doi = false;
      for (const c of list) {
        if (c.free) continue;
        const T = release(c);
        if (c.a.s * c.Pa - c.b.s * c.Pb + c.G + T >= -1e-7) continue;
        if (c.Pb > 0) c.b.s = Math.max(0, (c.a.s * c.Pa + c.G + T) / c.Pb);
        else c.a.s = Math.max(0, (c.b.s * c.Pb - c.G - T) / c.Pa);
        doi = true;
      }
      if (!doi) break;
    }
  }
  // nghiêng kiểu igloo, mỗi trục một pha
  const eV = new THREE.Vector3();
  function tiltRaw(m, a, amp, out) {
    return out.set(
      Math.cos(a * 2 + m.rand * 30) * a * amp,
      Math.cos(a * 2 + m.rand * 30 + 2.1) * a * amp,
      Math.cos(a * 2 + m.rand * 30 + 4.2) * a * amp * (m.kind === 'da' ? 0 : 0.25),   // lăn trong mặt phẳng tường: tảng đá dài 4–10 m thì góc quét quá rộng — không lăn; ô tường lăn ít
    );
  }
  // quỹ nghiêng: 45% khe hẹp nhất quanh mô-đun (theo mặt tiếp giáp, hoặc theo pháp tuyến nếu đã ra hẳn trước)
  // Quỹ nghiêng tách HAI phần: xoay quanh trục đứng (yaw) chỉ lấn SANG BÊN; ngả (pitch) và lăn (roll) lấn LÊN
  // XUỐNG. Mỗi mặt tiếp giáp cho một giới hạn: 45% khe của nó (hai bên cùng nghiêng thì mỗi bên một nửa),
  // hoặc — nếu hai mô-đun đã lệch nhau theo pháp tuyến quá bề dày — 45% quãng lệch ấy.
  function tiltBudget(list, amp, extra) {
    for (const m of list) {
      if (m.s < 1e-4) { m.tk = 0; m.kY = 0; m.kP = 0; if (m.tilt) m.tilt.set(0, 0, 0); continue; }
      tiltRaw(m, m.a, amp, eV);
      if (m.top) { eV.x = -Math.abs(eV.x) * 0.2; eV.y *= 0.15; eV.z = 0; }
      const sx = Math.abs(Math.sin(eV.x)), sy = Math.abs(Math.sin(eV.y)), sz = Math.abs(Math.sin(eV.z));
      const W = m.scl.x, H = m.scl.y, D = m.scl.z, e = 1e-6;
      const iN = (W / 2) * sy + (H / 2) * sx + e;
      let kY = 1, kP = 1;
      for (const c of m.cons) {
        const openU = c.a.s * c.Pa - c.b.s * c.Pb + (c.budgetOnly ? c.gap : c.GR) + (c.vOnly ? (c.a.v - c.b.v) * c.uy : 0);
        const o = c.a === m ? c.b : c.a;
        const ext = (q) => (q.tilt ? (q.scl.x / 2) * Math.abs(Math.sin(q.tilt.y)) + (q.scl.y / 2) * Math.abs(Math.sin(q.tilt.x)) : 0);
        const gn = Math.abs(c.a.s * c.Na - c.b.s * c.Nb) - (c.a.s * c.Na > c.b.s * c.Nb ? c.a.D : c.b.D) - ext(o) - 0.01;
        const rel = 0.45 * gn / iN;
        if (c.vert) {
          kP = Math.min(kP, Math.max(0.45 * openU / ((D / 2) * sx + (W / 2) * sz + e), rel));
        } else {
          kY = Math.min(kY, Math.max(0.45 * openU / ((D / 2) * sy + e), rel));
          kP = Math.min(kP, Math.max(0.45 * openU / ((H / 2) * sz + e), rel));
        }
      }
      if (extra) {
        // trước/sau (vành hiên, lưới cột kèo): mỗi phần được một nửa chỗ trống
        const av = extra(m);
        kY = Math.min(kY, (0.5 * av) / ((W / 2) * sy + e));
        kP = Math.min(kP, (0.5 * av) / ((H / 2) * sx + e));
      }
      kY = Math.max(0, Math.min(1, kY)); kP = Math.max(0, Math.min(1, kP));
      m.kY = Math.min(kY, (m.kY || 0) + (kY - (m.kY || 0)) * 0.2);
      m.kP = Math.min(kP, (m.kP || 0) + (kP - (m.kP || 0)) * 0.2);
      m.tk = Math.min(m.kY, m.kP);
      m.tilt = m.tilt || new THREE.Vector3();
      m.tilt.set(eV.x * m.kP, eV.y * m.kY, eV.z * m.kP);
    }
  }

  // ── ĐÁ ─────────────────────────────────────────────────────────────────────
  const topCourse = mods.reduce((a, m) => Math.max(a, m.course), 0);
  for (const m of mods) {
    const c0 = m.c0 ? m.c0 : m.pos.clone();
    initMod(m, c0, m.nrm, m.scl.z, 'da');
    m.zAx = new THREE.Vector3(0, 0, 1).applyQuaternion(m.quat);
    m.top = m.course === topCourse;
  }
  const rad3 = (m) => Math.hypot(m.scl.x, m.scl.y, m.scl.z) / 2;
  for (const m of mods) {
    m.nb = [];
    for (const o of mods) if (o !== m && m.c0.distanceTo(o.c0) < rad3(m) + rad3(o) + 0.4) m.nb.push(o);
  }
  const consS = [], consV = [];
  const ix = new Map(mods.map((m, i) => [m, i]));
  for (const m of mods) for (const o of m.nb) {
    if (ix.get(o) < ix.get(m)) continue;
    if (o.course !== m.course) {
      const lo = o.course < m.course ? o : m, hi = lo === o ? m : o;
      for (const q of [lo.quat, hi.quat]) {
        uA.set(0, 1, 0).applyQuaternion(q);
        const c = makeCon(consS, hi, lo, uA);
        // mặt đáy nghiêng: ràng buộc này cũng dùng cho lượt "trượt theo mặt đáy"
        if (c) { c.u = uA.clone(); consV.push(c); }
      }
    } else {
      for (const [p, q2] of [[m, o], [o, m]]) {
        uA.set(1, 0, 0).applyQuaternion(q2.quat);
        if (uA.dot(uB.subVectors(p.c0, q2.c0)) < 0) uA.negate();
        uA.y = 0; if (uA.lengthSq() > 1e-6) { uA.normalize(); makeCon(consS, p, q2, uA); }
      }
      uA.subVectors(m.c0, o.c0); uA.y = 0;
      if (uA.lengthSq() > 1e-6) makeCon(consS, m, o, uA.normalize());
    }
  }
  // các ràng buộc giữa hai hàng đá (mặt đáy nghiêng) chỉ vào pha "giãn ngang" qua phần nằm ngang của nó;
  // phần đứng do lượt trượt-mặt-đáy lo. Để pha giãn ngang không đòi tảng dưới giãn theo tảng trên
  // (cả cột đá tụt về 0 vì chân bị khoá), đánh dấu chúng: pha ngang bỏ qua.
  for (const c of consV) c.vOnly = true;
  const consH = consS.filter((c) => !c.vOnly);
  // lượt trượt theo mặt đáy: từ dưới lên, tảng trên nhận độ nâng tối thiểu để không cắm vào tảng dưới
  const byCourse = [...mods].sort((a, b) => a.course - b.course);
  function bedPass() {
    for (const m of byCourse) {
      if (m.lock) { m.v = 0; continue; }
      let v = 0;
      for (const c of m.cons) {
        if (!c.vOnly || c.a !== m) continue;
        const lo = c.b, u = c.u;
        // độ đổi mạch theo u do phần nằm ngang: (rel_a s_a − rel_b s_b)·u_ngang
        const dh = (m.rel.x * m.s - lo.rel.x * lo.s) * u.x + (m.rel.z * m.s - lo.rel.z * lo.s) * u.z;
        // quá bề dày tảng dưới (đã ra hẳn trước) thì thôi trượt tiếp: kẹp phần ngang
        const dOut = m.s * m.rel.dot(m.nrmH) - lo.s * lo.rel.dot(m.nrmH);
        const kCap = dOut > lo.D + 0.1 ? (lo.D + 0.1) / dOut : 1;
        const need = lo.v - (dh * kCap + 0.001) / Math.max(0.3, u.y);   // mặt đáy: gần như không được khép
        if (need > v) v = need;
      }
      m.v = Math.max(0, Math.min(1.0, v));
    }
  }
  let capS = 0, capV = 0;
  const topStones = mods.filter((m) => m.top);
  for (const m of topStones) m.ang = Math.atan2(m.c0.z, m.c0.x);
  if (cap) for (const pc of cap.children) {
    const u = pc.userData.cap;
    let d = u.a1 - u.a0; d = Math.atan2(Math.sin(d), Math.cos(d));
    u.mid = u.a0 + d / 2; u.half = Math.abs(d) / 2;
  }

  // ── Ô TƯỜNG ───────────────────────────────────────────────────────────────
  for (const k of cells) {
    k.cTower = k.cTower || k.c0.clone();   // toạ độ gốc trong nhóm tháp (trước khi đổi sang toạ độ cả toà)
    initMod(k, new THREE.Vector3(k.c0.x, k.c0.y + towerY0, k.c0.z), k.nrm, k.scl.z, 'o');
    k.cRest = k.c0.clone();   // toạ độ cả toà
  }
  const consW = [];
  {
    const key = (k) => k.tier + '|' + k.face + '|' + k.col + '|' + k.row;
    const map = new Map(cells.map((k) => [key(k), k]));
    for (const k of cells) {
      // cùng hàng, ô bên cạnh trên cùng mặt
      const nb = map.get(k.tier + '|' + k.face + '|' + (k.col + 1) + '|' + k.row);
      if (nb) { uA.copy(nb.tan); if (uA.dot(uB.subVectors(nb.c0, k.c0)) < 0) uA.negate(); makeCon(consW, nb, k, uA, 0.0005, 0.0015); }
    }
    for (const k of cells) {
      const up = map.get(k.tier + '|' + k.face + '|' + k.col + '|' + (k.row + 1));
      if (!up) continue;
      uB.copy(k.nrmH);
      const c = { a: up, b: k, Pa: 0, Pb: 0, Na: up.rel.dot(uB), Nb: k.rel.dot(uB), vert: true, budgetOnly: true, gap: 0.002, uy: 1 };
      up.cons.push(c); k.cons.push(c);
    }
    // ô ở góc: ô đầu hàng mặt trước/sau chạm mặt trong của ô cuối hàng mặt bên
    for (const k of cells) {
      if (k.face % 2 !== 0) continue;
      if (k.col !== 0 && k.col !== k.nCols - 1) continue;
      for (const o of cells) {
        if (o.tier !== k.tier || o.row !== k.row || o.face % 2 !== 1) continue;
        if (o.col !== 0 && o.col !== o.nCols - 1) continue;
        if (Math.sign(o.c0.x) !== Math.sign(k.c0.x) || Math.sign(o.c0.z) !== Math.sign(k.c0.z)) continue;
        uA.set(Math.sign(o.c0.x), 0, 0);
        makeCon(consW, o, k, uA, 0.0005, 0.0015);
      }
    }
  }

  // ── MẢNH HIÊN ─────────────────────────────────────────────────────────────
  const segs = [];
  for (const r of roofs) for (const sg of r.segs || []) {
    sg.roof = r; sg.tmp = 0; sg.cur = 0; sg.phi = 0; sg.rand = sg.rand ?? ((segs.length * 0.6180339) % 1);
    sg.eaveW = new THREE.Vector3(sg.eave.x, sg.eave.y + r.y0 + towerY0, sg.eave.z);
    sg.M = new THREE.Matrix4();
    segs.push(sg);
  }
  const segM = new THREE.Matrix4(), qR = new THREE.Quaternion(), tmpV = new THREE.Vector3();
  function segMatrix(sg, phi, out) {
    qR.setFromAxisAngle(sg.A, phi);
    out.makeRotationFromQuaternion(qR);
    tmpV.copy(sg.H).applyQuaternion(qR);
    out.setPosition(sg.H.x - tmpV.x, sg.H.y - tmpV.y, sg.H.z - tmpV.z);
    return out;
  }

  // ── vị trí / hướng ─────────────────────────────────────────────────────────
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), qx = new THREE.Quaternion();
  const eTilt = new THREE.Euler(), zNow = new THREE.Vector3(), fc = new THREE.Vector3(), camLocal = new THREE.Vector3();
  const pos = new THREE.Vector3(), frameM = new THREE.Matrix4(), attM = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
  const tierCur = [0, 0, 0], tierTmp = [0, 0, 0], skinCur = [0, 0, 0], skinTmp = [0, 0, 0];

  function posOf(m, out) {
    if (m.kind === 'o') {
      // ô tường: toạ độ cả toà
      out.copy(m.c0).addScaledVector(m.rel, m.s);
      out.addScaledVector(m.nrmH, skinCur[m.tier] || 0);
      out.y += (tierCur[m.tier] || 0) * m.tier * NO.D;
      return out;
    }
    const d = m.dCur;
    const sr = 1 + (NO.SR - 1) * d, sy = 1 + (NO.SY - 1) * d;
    out.set(m.c0.x * sr, m.c0.y * sy, m.c0.z * sr);
    out.addScaledVector(m.nrm, d * NO.DN);
    out.addScaledVector(m.rel, m.s);
    out.y += m.v;
    return out;
  }
  function quatOf(m, out) {
    if (!m.tilt) return out.copy(m.quat);
    eTilt.set(m.tilt.x, m.tilt.y, m.tilt.z);
    qx.setFromEuler(eTilt);
    return out.copy(m.quat).multiply(qx);
  }
  function faceOf(m, out) {
    posOf(m, out);
    quatOf(m, q);
    zNow.set(0, 0, 1).applyQuaternion(q);
    return out.addScaledVector(zNow, m.scl.z / 2 + 0.03);
  }
  function stoneNear(p) {
    let best = null, bd = Infinity;
    for (const m of mods) {
      eV.copy(m.c0).addScaledVector(m.zAx, m.scl.z / 2);
      const d = eV.distanceTo(p);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }
  const dirty = new Set();

  // ── lớp chấm – nét – số bám con trỏ (plexus) ──────────────────────────────
  const PLEX = 5;
  const plexEls = [];
  if (svg) {
    for (let i = 0; i < PLEX; i++) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '2.6');
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('class', 'plex-num');
      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo.setAttribute('class', 'plex-halo');
      halo.setAttribute('r', '6.5');
      g.appendChild(halo); g.appendChild(dot); g.appendChild(txt);
      svg.appendChild(g);
      plexEls.push({ g, dot, txt, halo, lines: [] });
    }
    for (const pe of plexEls) {
      for (let k = 0; k < 2; k++) {
        const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        ln.setAttribute('class', 'plex-line');
        svg.insertBefore(ln, svg.firstChild);
        pe.lines.push(ln);
      }
    }
  }
  let plexPick = [], plexAt = new THREE.Vector3(1e6, 1e6, 1e6), plexFade = 0;
  const proj = new THREE.Vector3();
  function project(v) {
    proj.copy(v).applyMatrix4(castle.matrixWorld).project(camera);
    return { x: ((proj.x + 1) / 2) * pw, y: ((1 - proj.y) / 2) * ph, z: proj.z };
  }
  // điểm đặt chấm của một mô-đun LÚC NÀY (toạ độ cả toà) + quãng nó đã rời chỗ (m)
  function plexPoint(pk, out) {
    if (pk.kind === 'da' || pk.kind === 'o') {
      const m = pk.kind === 'da' ? mods[pk.i] : cells[pk.i];
      faceOf(m, out);
      return posOf(m, pos).distanceTo(m.c0);
    }
    const sg = segs[pk.i];
    out.copy(sg.lip).applyMatrix4(sg.M);
    tmpV.copy(sg.lip);
    out.y += sg.roof.y0 + towerY0;
    const moved = out.distanceTo(tmpV.set(sg.lip.x, sg.lip.y + sg.roof.y0 + towerY0, sg.lip.z));
    return moved;
  }

  // ── đường đo lúc tháo (màn sau) ───────────────────────────────────────────
  const DIM = 2;
  const dimEls = [];
  if (svg) {
    for (let i = 0; i < DIM; i++) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'dim');
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('class', 'dim-line');
      const t1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      t1.setAttribute('class', 'dim-tick');
      const t2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      t2.setAttribute('class', 'dim-tick');
      const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tx.setAttribute('class', 'dim-num');
      g.appendChild(ln); g.appendChild(t1); g.appendChild(t2); g.appendChild(tx);
      svg.appendChild(g);
      dimEls.push({ g, ln, t1, t2, tx });
    }
  }
  const kagamiList = mods.filter((m) => m.kagami);
  const doTang = (kagamiList.length ? kagamiList : mods).reduce((a, m) => (m.scl.x > a.scl.x ? m : a));
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpP = new THREE.Vector3();
  const axX = new THREE.Vector3(), axY = new THREE.Vector3();

  // ── thứ tự tháo ────────────────────────────────────────────────────────────
  const STEP = 0.55;
  const stagger = (amt, slot) => (amt <= 0 ? 0 : ease(cl((amt * (1 + STEP) - slot) / STEP)));
  const nCourse = topCourse + 1;
  const stoneOrder = [];
  for (let c = nCourse - 1; c >= 0; c--) for (const m of mods) if (m.course === c) stoneOrder.push(m);
  stoneOrder.forEach((m, i) => { m.slot = i / Math.max(1, stoneOrder.length - 1); });
  const nTier = Math.max(1, frames.length);
  const tierSlot = (ti) => (nTier > 1 ? 1 - ti / (nTier - 1) : 0);
  const NMOD = mods.length + cells.length + segs.length;
  let apartT = 0, apartLabel = '組まれた — assembled';
  let LV = { stone: 0, frame: 0, skin: 0 };
  function nhanLop() {
    if (LV.skin > 0.03) return '皮 — skin ' + Math.round(LV.skin * 100) + '%';
    if (LV.frame > 0.03) return '骨 — frame ' + Math.round(LV.frame * 100) + '%';
    if (LV.stone > 0.03) return '石垣 — bearing ' + Math.round(LV.stone * 100) + '%';
    return NMOD + ' 部材 — ' + NMOD + ' parts, assembled';
  }
  let towerTmp = 0, towerCur = 0;

  return {
    mouse3D, mouseLocal, NO,
    get apart() { return apartT; },
    get pushM() { return PUSH_M; },
    get parts() { return NMOD; },
    get levels() { return LV; },
    get measured() { return doTang; },
    setLevels(v) { LV = { stone: cl(v.stone || 0), frame: cl(v.frame || 0), skin: cl(v.skin || 0) }; apartLabel = nhanLop(); },
    get apartLabel() { return apartLabel; },
    get tilt() { return { yaw: tiltX, pitch: tiltY }; },
    get plexEls() { return plexEls; },
    get plexPick() { return plexPick; },
    faceOf, quatOf, posOf, stoneNear, segMatrix,
    get capScale() { return capS; },
    get segs() { return segs; },
    get cells() { return cells; },
    get cons() { return consH.length + consV.length + consW.length; },
    get bounce() { return bCur; },
    freeze() {},
    setPointer(x, y, w, h) { hasPointer = true; px = x; py = y; pw = w; ph = h; },
    clearPointer() { hasPointer = false; },
    state() {
      return {
        bounce: +bCur.toFixed(4),
        mouse: mouse3D.toArray().map((v) => +v.toFixed(3)),
        mods: mods.map((m, i) => ({ i, cur: +m.cur.toFixed(4), s: +m.s.toFixed(4), v: +m.v.toFixed(3), tk: +m.tk.toFixed(3), top: m.top, course: m.course })),
        cells: cells.map((k, i) => ({ i, cur: +k.cur.toFixed(4), s: +k.s.toFixed(4), tk: +k.tk.toFixed(3), out: +(k.s * k.rel.dot(k.nrmH)).toFixed(3), sMax: +k.sMax.toFixed(4), kY: +(k.kY || 0).toFixed(3), kP: +(k.kP || 0).toFixed(3), tilt: k.tilt ? k.tilt.toArray().map((v) => +v.toFixed(3)) : null, f: k.face, t: k.tier, c: k.col, r: k.row })),
        segs: segs.map((sg, i) => ({ i, cur: +sg.cur.toFixed(4), phi: +sg.phi.toFixed(4) })),
        push: mods.map((m) => m.cur),
        plex: plexPick.map((pk) => ({ kind: pk.kind, i: pk.i, mm: Math.round(plexPoint(pk, tmpP) * 1000) })),
      };
    },

    update(dt, t) {
      pw = window.innerWidth; ph = window.innerHeight;
      // ĐƯỜNG TẮT khi toà thành đứng yên (ngọn cọ mực, MOTION = false): mọi lực đẩy bằng 0, quầng sáng và nhịp thở nhân 0 —
      // thứ duy nhất nhìn thấy được là độ nghiêng máy quay theo chuột. Bỏ phần bắn tia + vòng ~500 tảng/ô mỗi khung
      // (0,7–1,8 ms, đo 25/9). Hai khung đầu vẫn chạy đủ để dựng xong trạng thái nghỉ.
      if (!MOTION && fastN >= 2) {
        if (hasPointer) {
          tiltTX = ((px / pw) * 2 - 1) * 0.07 * (Math.PI / 2);
          tiltTY = (-(py / ph) * 2 + 1) * 0.025 * (Math.PI / 2);
        } else { tiltTX = 0; tiltTY = 0; }
        tiltX += (tiltTX - tiltX) * damp(0.035, dt);
        tiltY += (tiltTY - tiltY) * damp(0.035, dt);
        return { yaw: tiltX, pitch: tiltY };
      }
      fastN++;

      // ── con trỏ → điểm 3D trên mặt công trình (bắn tia vào các hình ĐỨNG YÊN), rồi đuổi theo sau ──
      if (hasPointer) {
        ndc.set((px / pw) * 2 - 1, -(py / ph) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        camera.getWorldDirection(camDir);
        plane.setFromNormalAndCoplanarPoint(camDir, target);
        let got = false;
        if (hitList.length) {
          const hs = ray.intersectObjects(hitList, false);
          if (hs.length) { hit.copy(hs[0].point); got = true; }
        }
        if (got || ray.ray.intersectPlane(plane, hit)) {
          if (mouse3D.y > 1e5) mouse3D.copy(hit);
          else mouse3D.lerp(hit, damp(0.05, dt));
        }
      } else if (mouse3D.y < 1e5) {
        mouse3D.y += (1e6 - mouse3D.y) * damp(0.02, dt);
      }
      mouseLocal.copy(mouse3D);
      castle.worldToLocal(mouseLocal);

      dirty.clear();
      apartT = LV.stone;
      if (core) {
        core.emissiveIntensity = coreE0 * (1 - 0.5 * apartT);
        core.color.copy(coreC0).lerp(coreDark, 0.6 * apartT);
      }

      // ── ĐÁ: đẩy → giãn ngang quanh trục → ràng buộc mạch → trượt theo mặt đáy → quỹ nghiêng ──
      let bTarget = 0;
      for (const m of mods) {
        const dis = stagger(LV.stone, m.slot);
        m.dTmp += (dis - m.dTmp) * damp(0.06, dt);
        m.dCur += (m.dTmp - m.dCur) * damp(0.06, dt);
        if (!(m.dCur >= 0)) { m.dCur = 0; m.dTmp = 0; }
        const gate = smoothstep(GATE[0], GATE[1], m.pos.y);
        // đá: vùng đủ lực RỘNG (7 m ≈ hơn một tảng) và biên độ riêng từng tảng nhỏ — tảng trong vùng giãn ĐỀU
        // nhau nên khe giữa chúng mở rộng (giãn đều quanh trục thì khe nào cũng lớn ra); lệch nhiều thì tảng
        // ngoài bị thúc phải đi theo và khe lại khép
        const near = drive(m, m.pos.distanceTo(mouseLocal), m.pos.y, HV.BREATH, gate * (1 - m.dCur), dt, t, HV.DS, 7.0, 16.0, 0.12);
        if (near > bTarget) bTarget = near;
        m.lock = gate < 0.05 || m.dCur > 0.001;
        m.a = m.cur;
        // sàn mượt: mức giãn đã được nâng (vì bị thúc) chỉ thả về dần, không sụt một phát
        const want = HV.KS * m.cur;
        m.s = m.lock ? 0 : Math.max(want, (m.sPrev || 0) * (1 - damp(HV.DS, dt)));
      }
      solve(consH);
      bedPass();
      tiltBudget(mods, HV.TILT, null);
      let sCap = 0, vCap = 0;
      for (const m of mods) {
        m.sPrev = m.s;
        if (m.top) { if (m.s > sCap) sCap = m.s; if (m.v > vCap) vCap = m.v; }
        if (m.s > 2e-4 || m.dCur > 0.0005 || m.wasMoved) {
          posOf(m, pos);
          quatOf(m, q);
          mtx.compose(pos, q, m.scl);
          m.mesh.setMatrixAt(m.idx, mtx);
          const ap = m.mesh.geometry.getAttribute('aPush');
          if (ap) { ap.setX(m.idx, Math.min(1, m.cur * 1.25)); ap.needsUpdate = true; }
          dirty.add(m.mesh);
          m.wasMoved = m.s > 2e-4 || m.dCur > 0.0005;
        }
      }
      // gờ đỉnh 武者返し: giãn ngang quanh trục theo tảng giãn nhiều nhất của hàng trên cùng (hàng ấy nằm
      // lọt dưới gờ, gờ phải đi trước nó), và nhận đúng phần trượt-mặt-đáy lớn nhất của hàng ấy
      capS = sCap; capV = vCap;
      if (cap) {
        for (const pc of cap.children) {
          const u = pc.userData.cap;
          let s = 0, v = 0;
          for (const m of topStones) {
            // tảng nằm dưới mảnh (theo góc quanh trục, nới rộng nửa mảnh mỗi bên)
            let d = m.ang - u.mid; d = Math.atan2(Math.sin(d), Math.cos(d));
            if (Math.abs(d) <= u.half + 0.45) { if (m.s > s) s = m.s; if (m.v > v) v = m.v; }
          }
          pc.position.set(u.rel.x * s, v + (s > 1e-3 ? 0.06 : 0) * Math.min(1, s * 20), u.rel.z * s);
          u.s = s;
        }
      }

      // ── THÂN THÁP: tháo theo cuộn (màn sau) ──────────────────────────────
      towerTmp += (LV.stone - towerTmp) * damp(0.06, dt);
      towerCur += (towerTmp - towerCur) * damp(0.06, dt);
      if (tower) tower.position.y = towerY0 + ease(cl(towerCur)) * NO.TB;
      for (let ti = 0; ti < nTier; ti++) {
        const x = stagger(LV.frame, tierSlot(ti));
        tierTmp[ti] += (x - tierTmp[ti]) * damp(0.06, dt);
        tierCur[ti] += (tierTmp[ti] - tierCur[ti]) * damp(0.06, dt);
        const k = cl((tierCur[ti] - 0.75) / 0.25) * NO.SK1 + stagger(LV.skin, tierSlot(ti) * 0.5) * NO.SK2;
        skinTmp[ti] += (k - skinTmp[ti]) * damp(0.06, dt);
        skinCur[ti] += (skinTmp[ti] - skinCur[ti]) * damp(0.06, dt);
      }
      for (const f of frames) f.group.position.y = tierCur[f.ti] * f.ti * NO.D;

      // ── Ô TƯỜNG: cùng bộ máy, nhẹ hơn nên đi nhiều hơn và nhanh hơn; tầng lầu không thở ──
      const tGate = 1 - cl(LV.stone * 4);
      for (const k of cells) {
        const near = drive(k, k.c0.distanceTo(mouseLocal), k.c0.y, 0, tGate, dt, t, HV.DW);
        if (near > bTarget) bTarget = near;
        k.a = k.cur;
        const N = k.rel.dot(k.nrmH);
        // trần của ô: hàng dưới vành hiên chỉ ra trong 90% chỗ trống dưới vành; hàng chân tầng dưới cùng
        // không được ra quá mép trong gờ đỉnh nền đá (gờ cũng đang giãn ra)
        let smax = 1;
        if (k.underLip) smax = Math.min(smax, (0.9 * k.lip) / N);
        if (k.tier === 0 && k.bottom) smax = Math.min(smax, ((k.face % 2 === 0 ? 10.55 : 12.55) * (1 + capS) - 0.12 - k.dist) / N);
        // hàng chân của tầng trên cắm trong hông mái tầng dưới (mặt mái cao hơn đỉnh ô): đứng yên
        if (k.tier > 0 && k.bottom) smax = 0;
        k.sMax = Math.max(0, smax);
        k.s = Math.min(k.sMax, Math.max(HV.KW * k.cur, (k.sPrev || 0) * (1 - damp(HV.DW, dt))));
      }
      solve(consW);
      tiltBudget(cells, HV.TILT_W, (k) => {
        // mép trên ô dưới vành hiên không được chạm vành; mặt sau không được lùi vào cột góc / lưới cột kèo
        const N = k.rel.dot(k.nrmH), out = k.s * N;
        let av = 0.06 + out;
        if (k.underLip) av = Math.min(av, 0.9 * k.lip - out);
        return Math.max(0, av);
      });
      const IMs = new Set();
      for (const k of cells) {
        k.sPrev = k.s;
        const moving = k.s > 2e-4 || skinCur[k.tier] > 1e-4 || tierCur[k.tier] > 1e-4;
        if (!moving && !k.wasMoved) continue;
        posOf(k, pos);
        pos.y -= towerY0;
        quatOf(k, q);
        mtx.compose(pos, q, k.scl);
        k.im.setMatrixAt(k.idx, mtx);
        IMs.add(k.im);
        if (k.att.length) {
          frameM.compose(pos, q, one);
          for (const a of k.att) { attM.multiplyMatrices(frameM, a.local); a.im.setMatrixAt(a.idx, attM); IMs.add(a.im); }
        }
        k.wasMoved = moving;
      }
      for (const im of IMs) im.instanceMatrix.needsUpdate = true;

      // ── MẢNH HIÊN: bẻ ra ngoài quanh bản lề (không thở) ──────────────────
      const tileDirty = new Set();
      for (const sg of segs) {
        const near = drive(sg, sg.eaveW.distanceTo(mouseLocal), sg.eaveW.y, 0, tGate, dt, t, HV.DR);
        if (near > bTarget) bTarget = near;
        const phi = HV.KR * sg.cur;
        if (Math.abs(phi - sg.phi) < 1e-5 && !sg.wasMoved) continue;
        sg.phi = phi;
        segMatrix(sg, phi, sg.M);
        sg.group.matrix.copy(sg.M);
        sg.group.matrixWorldNeedsUpdate = true;
        sg.wasMoved = phi > 1e-4;
        tileDirty.add(sg.roof);
      }
      for (const r of tileDirty) {
        r.tiles.forEach((tt, i) => { const sg = r.segs[tt.seg]; attM.multiplyMatrices(sg.M, tt.m); r.tileIM.setMatrixAt(i, attM); });
        r.tileIM.instanceMatrix.needsUpdate = true;
      }
      for (const r of roofs) r.group.position.y = r.y0 + tierCur[r.ti] * (r.ti * NO.D + NO.R);

      // ── kênh hửng sáng: lõi sáng quanh con trỏ ───────────────────────────
      bTmp += (bTarget - bTmp) * damp(0.05, dt);
      bCur += (bTmp - bCur) * damp(0.05, dt);
      if (core && core.userData.hot) { core.userData.hot.uMouseL.value.copy(mouseLocal); core.userData.hot.uHot.value = MOTION ? bCur * (1 - apartT) : 0; core.userData.hot.uT.value = t; core.userData.hot.uBreathK.value = MOTION ? 1 : 0; }
      for (const mat of materials) {
        if (!mat.userData.u) continue;
        mat.userData.u.uBounce.value = MOTION ? bCur * (1 - apartT) : 0;
        mat.userData.u.uMouse.value.copy(mouse3D);
      }

      // ── máy quay nghiêng theo chuột: ±6,3° / ±2,25° như igloo ─────────────
      if (hasPointer) {
        tiltTX = ((px / pw) * 2 - 1) * 0.07 * (Math.PI / 2);
        tiltTY = (-(py / ph) * 2 + 1) * 0.025 * (Math.PI / 2);
      } else { tiltTX = 0; tiltTY = 0; }
      tiltX += (tiltTX - tiltX) * damp(0.035, dt);
      tiltY += (tiltTY - tiltY) * damp(0.035, dt);

      if (svg) { this.updatePlex(dt); this.updateDim(); }
      return { yaw: tiltX, pitch: tiltY };
    },

    updateDim() {
      const m = doTang;
      const vis = cl((LV.stone - 0.35) / 0.3) * (1 - cl(LV.frame / 0.08));
      if (vis <= 0.01) { for (const d of dimEls) d.g.style.opacity = '0'; return; }
      posOf(m, pos);
      axX.set(1, 0, 0).applyQuaternion(m.quat);
      axY.set(0, 1, 0).applyQuaternion(m.quat);
      const W = m.scl.x, H = m.scl.y;
      tmpA.copy(pos).addScaledVector(axX, -W / 2).addScaledVector(axY, H / 2 + 0.5);
      tmpB.copy(pos).addScaledVector(axX, W / 2).addScaledVector(axY, H / 2 + 0.5);
      this.veDo(dimEls[0], project(tmpA), project(tmpB), Math.round(W * 1000) + ' mm', vis, true);
      const a = project(m.c0), b = project(pos);
      this.veDo(dimEls[1], a, b, Math.round(pos.distanceTo(m.c0) * 1000) + ' mm', vis, false);
    },
    veDo(d, a, c, nhan, vis, tren) {
      const dx = c.x - a.x, dy = c.y - a.y;
      const Lh = Math.hypot(dx, dy) || 1;
      const nx = (-dy / Lh) * 4, ny = (dx / Lh) * 4;
      d.g.style.opacity = String(vis * 0.9);
      d.ln.setAttribute('x1', a.x.toFixed(1)); d.ln.setAttribute('y1', a.y.toFixed(1));
      d.ln.setAttribute('x2', c.x.toFixed(1)); d.ln.setAttribute('y2', c.y.toFixed(1));
      d.t1.setAttribute('x1', (a.x - nx).toFixed(1)); d.t1.setAttribute('y1', (a.y - ny).toFixed(1));
      d.t1.setAttribute('x2', (a.x + nx).toFixed(1)); d.t1.setAttribute('y2', (a.y + ny).toFixed(1));
      d.t2.setAttribute('x1', (c.x - nx).toFixed(1)); d.t2.setAttribute('y1', (c.y - ny).toFixed(1));
      d.t2.setAttribute('x2', (c.x + nx).toFixed(1)); d.t2.setAttribute('y2', (c.y + ny).toFixed(1));
      d.tx.setAttribute('x', ((a.x + c.x) / 2 + (tren ? 0 : 8)).toFixed(1));
      d.tx.setAttribute('y', ((a.y + c.y) / 2 - (tren ? 7 : 3)).toFixed(1));
      d.tx.setAttribute('text-anchor', tren ? 'middle' : 'start');
      d.tx.textContent = nhan;
    },

    // Chấm – nét – số của RÊ CHUỘT: tâm các mô-đun ĐANG bị đẩy (tảng đá, ô tường, mảnh hiên)
    updatePlex(dt) {
      const song = LV.stone < 0.02;
      const moved = plexAt.distanceTo(mouseLocal) > RAD * 0.05 || plexPick.length < PLEX;
      if (moved && hasPointer && song) {
        plexAt.copy(mouseLocal);
        const cand = [];
        camLocal.copy(camera.position);
        castle.worldToLocal(camLocal);
        const facing = (p, n) => {
          const vx = camLocal.x - p.x, vy = camLocal.y - p.y, vz = camLocal.z - p.z;
          return (n.x * vx + n.y * vy + n.z * vz) / Math.hypot(vx, vy, vz) >= 0.35;
        };
        mods.forEach((m, i) => { if (m.cur > 0.1 && m.s > 0.01) { faceOf(m, fc); if (facing(fc, m.zAx)) cand.push([m.pos.distanceTo(mouseLocal), { kind: 'da', i }]); } });
        cells.forEach((k, i) => { if (k.cur > 0.1 && k.s > 0.01) { faceOf(k, fc); if (facing(fc, k.nrm)) cand.push([k.c0.distanceTo(mouseLocal), { kind: 'o', i }]); } });
        segs.forEach((sg, i) => { if (sg.cur > 0.1) { tmpV.set(sg.lip.x, 0, sg.lip.z).normalize(); if (facing(sg.eaveW, tmpV)) cand.push([sg.eaveW.distanceTo(mouseLocal), { kind: 'mai', i }]); } });
        cand.sort((a, b) => a[0] - b[0]);
        // chấm chỉ đặt lên mô-đun NHÌN THẤY: bắn tia từ máy quay tới tâm mặt, vật đầu tiên phải là chính nó
        const pickList = opt.pickMeshes || [];
        const own = (pk, h) => {
          if (!h) return false;
          if (pk.kind === 'da') { const m = mods[pk.i]; return h.object === m.mesh && h.instanceId === m.idx; }
          if (pk.kind === 'o') { const k = cells[pk.i]; return (h.object === k.im && h.instanceId === k.idx) || k.att.some((q) => h.object === q.im && h.instanceId === q.idx); }
          let o = h.object; while (o && o !== segs[pk.i].group) o = o.parent; return !!o;
        };
        const seenBy = (pk) => {
          if (!pickList.length) return true;
          plexPoint(pk, fc);
          fc.applyMatrix4(castle.matrixWorld);
          const dir = tmpA.copy(fc).sub(camera.position), L = dir.length();
          ray.set(camera.position, dir.divideScalar(L));
          ray.far = L + 0.5;
          const hs = ray.intersectObjects(pickList, false);
          ray.far = Infinity;
          return own(pk, hs[0]);
        };
        plexPick = [];
        const seen = [];
        for (const c of cand) {
          plexPoint(c[1], fc);
          const pp = project(fc);
          if (seen.some((o) => Math.hypot(o.x - pp.x, o.y - pp.y) < 26)) continue;
          if (!seenBy(c[1])) continue;
          seen.push(pp);
          plexPick.push(c[1]);
          if (plexPick.length >= PLEX) break;
        }
      }
      if (!song) plexPick = [];
      const want = hasPointer && song && plexPick.length ? 1 : 0;
      const rate = want ? dt / 0.10 : -dt / 0.06;
      plexFade = Math.min(1, Math.max(0, plexFade + rate));
      const pts = [];
      for (let i = 0; i < PLEX; i++) {
        const pe = plexEls[i];
        const mi = plexPick[i];
        if (mi === undefined || plexFade <= 0.001) {
          pe.g.style.opacity = '0';
          pe.lines.forEach((l) => { l.style.opacity = '0'; });
          continue;
        }
        const movedM = plexPoint(mi, fc);
        const p = project(fc);
        pts.push(p);
        pe.at = p;
        pe.g.style.opacity = String(plexFade);
        pe.dot.setAttribute('cx', p.x.toFixed(1));
        pe.dot.setAttribute('cy', p.y.toFixed(1));
        pe.halo.setAttribute('cx', p.x.toFixed(1));
        pe.halo.setAttribute('cy', p.y.toFixed(1));
        const off = pe.off || [6, -4];
        pe.txt.setAttribute('x', (p.x + off[0]).toFixed(1));
        pe.txt.setAttribute('y', (p.y + off[1]).toFixed(1));
        pe.box = { x: p.x + off[0] - 1, y: p.y + off[1] - 11, w: 20, h: 13 };
        pe.txt.textContent = String(Math.round(movedM * 1000) % 100).padStart(2, '0');
      }
      for (let i = 0; i < PLEX; i++) {
        const pe = plexEls[i];
        for (let k = 0; k < 2; k++) {
          const a = pts[i], b = pts[i + k + 1];
          const ln = pe.lines[k];
          if (!a || !b) { ln.style.opacity = '0'; continue; }
          ln.setAttribute('x1', a.x.toFixed(1)); ln.setAttribute('y1', a.y.toFixed(1));
          ln.setAttribute('x2', b.x.toFixed(1)); ln.setAttribute('y2', b.y.toFixed(1));
          ln.style.opacity = String(plexFade);
        }
      }
    },
  };
}
