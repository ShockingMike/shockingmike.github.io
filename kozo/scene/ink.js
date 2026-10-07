// NGỌN CỌ MỰC 緑青 trên công trình (Mike 24/9 — hướng hubtown.co.in, "thay vì là giải năng lượng thì là
// các vết cọ mực với màu nhấn"). Toà thành ĐỨNG YÊN; chuột là ngọn cọ của kiến trúc sư: rê qua tới đâu, một
// vết mực gỉ đồng bám lên mặt công trình tới đó, và trong lòng vết hiện ra nét kết cấu của đúng chỗ ấy.
//
//   · VỊ TRÍ CỌ đuổi theo con trỏ qua bộ lọc ONE EURO (trên màn): tay đứng / rê chậm thì lọc mạnh (chặn rung tay),
//     rê nhanh thì lọc nhẹ (đầu nét bám sát con trỏ, trễ ~20–40 ms thay vì ~150 ms của hai tầng làm mượt cũ).
//     Rồi bắn tia xuống mặt công trình — đỉnh vết luôn nằm trên mặt thật (tường, mái, nền đá), không trôi giữa không trung.
//   · ĐẦU NÉT SỐNG (Mike 25/9: "60 nhưng vẫn không mượt, đặc biệt là nét cọ"): đỉnh CỐ ĐỊNH của vệt vẫn thưa
//     (mỗi max(0,3 ; 0,5 × bề rộng) mét một đỉnh — đủ ngân sách 96 đỉnh), nhưng MỖI KHUNG có thêm một đỉnh TẠM
//     đặt đúng chỗ cọ đang đứng → đầu nét nhích theo từng khung, không đứng yên 3–4 khung rồi nhảy một cục.
//   · NÉT CONG MỀM: giữa hai đỉnh là đường cong Catmull-Rom (kiểu centripetal, không vọt lố), chia nhỏ theo độ
//     gắt của khúc quanh (ngay trên CPU lúc dồn số cho shader); bề rộng nội suy bậc ba, giờ vẽ nội suy thẳng.
//     Ngân sách 96 đỉnh chia từ ĐẦU NÉT về đuôi — đầu nét luôn đủ mịn.
//   · ĐỨT NÉT (mép mái → tường lùi phía sau, công trình → mặt phẳng sương): nét cũ kết thúc bằng ĐUÔI VUỐT 払い
//     (thon nhọn theo hướng tay, khô xơ, mọc ra trong 0,12 s), nét mới ẤN VÀO 起筆 (to dần từ 30% lên đủ trong
//     0,14 s) — không bật ra cả cục, không vắt mực qua không trung.
//   · BỀ RỘNG NÉT theo tốc độ tay, làm mượt: rê chậm → nét dày, ướt, mép loang; rê nhanh → nét mảnh, xơ khô 掠れ
//     (vẽ trong shader, xem INK_FN ở castle.js).
//   · KHÔ RỒI TAN: mỗi đỉnh mang giờ vẽ; 0–0,7 s còn ướt bóng, 1,5–2,8 s nhạt hết (mực khô, không nhấp nháy).
//     Rê rất nhanh, vệt dài hơn 96 đỉnh: phần ĐUÔI già nhanh hơn (tuổi chỉ tăng, không bao giờ hiện lại) để tan hết
//     trước khi rời ngân sách — đuôi tan dần, không rụng từng đoạn.
//   · NHÃN ĐO: vài con số THẬT dọc theo vết (bề rộng tảng đá, bề rộng gian, cao tầng, vươn hiên) — hiện rồi
//     tắt theo vết mực.
import * as THREE from 'three';
import { INK, INK_N } from './castle.js';

const damp = (k, dt) => 1 - Math.pow(1 - k, Math.max(0, Math.min(4, dt * 60)));
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const LIFE = 2.8;
// bộ lọc One Euro (Casiez 2012): tần số cắt = OE_MIN + OE_BETA × tốc độ (px/s). Đứng yên ~1,5 Hz (rung tay 8–12 Hz
// bị nén ~85%); rê 250 px/s ~7,8 Hz (trễ ~20 ms), 500 px/s ~14 Hz (~11 ms). Tốc độ tự nó lọc ở OE_D.
const OE_MIN = 1.5, OE_BETA = 0.025, OE_D = 1.0;
const oeA = (fc, dt) => { const r = 2 * Math.PI * fc * dt; return r / (r + 1); };
const PRESS_T = 0.14;   // 起筆: thời gian cọ ấn xuống (bề rộng 30% → 100%)
const HARAI_T = 0.12;   // 払い: thời gian đuôi vuốt mọc ra
const TURN = 0.17;      // mỗi khúc con của đường cong quay tối đa ~10° (gãy dưới 10° trên mép nét xơ thì mắt không thấy)
const SUB_MAX = 4;      // một đoạn giữa hai đỉnh cố định chia tối đa 4 khúc
const BRIDGE_PX = 14;   // khe hẹp hơn 14 px (mạch vữa, kẽ mái) thì nét bắc qua, không đứt
const SOFT = INK_N - 8;    // đuôi phải tan hết trước đỉnh thứ 88 (tính từ đầu nét); 8 đỉnh cuối là chỗ dự phòng
const pressK = (age) => 0.3 + 0.7 * easeOut(clamp01(age / PRESS_T));

export function createInk({ camera, pick, resolve, svg, plane, gaps = [] }) {
  const ray = new THREE.Raycaster();
  const hits = [];   // dùng lại một mảng cho mọi tia (bớt rác bộ nhớ mỗi khung)
  const ndc = new THREE.Vector2();
  let has = false, px = 0, py = 0, pw = 1, ph = 1;
  // vị trí cọ đã lọc (fx, fy) · con trỏ thô khung trước (lx, ly) · tốc độ đã lọc (dxh, dyh) · vị trí cọ khung trước
  let fOn = false, fx = 0, fy = 0, lx = 0, ly = 0, dxh = 0, dyh = 0, prevX = 0, prevY = 0;
  let vS = 0, wNow = 0.9, missT = 0, lastHitT = -1e9;
  let gate = 1;   // màn mở: cọ to dần lúc vừa mở (0 → 1 trong 0,8 s); 1 = như cũ
  const pts = [];
  // stroke: số hiệu nét (nhãn đo nối với nhau trong cùng nét — như cũ); piece: số hiệu KHÚC liền (đứt nét là khúc mới)
  let stroke = 0, piece = 0, nextLabelS = 1.0, labelK = 0, lastKey = '';
  // ĐỈNH TẠM ở đầu nét: cập nhật mỗi khung, không lưu vào vệt
  const tip = { on: false, p: new THREE.Vector3(), t: 0, w: 0, w0: 0, s: 0, sd: 0, sp: 0, cont: true, stroke: 0, piece: -1, st0: 0, xa: 0 };
  let acS = LIFE;   // tuổi của đỉnh thứ 88 tính từ đầu nét (làm mượt) — ngắn hơn LIFE thì đuôi già nhanh hơn
  // bắc qua khe: quãng (px) cọ đã đi trên mặt phẳng tạm · điểm chạm sâu đầu tiên (nét mới mở ở đó nếu hoá ra là mép thật)
  let bridgePx = 0, farFirst = null;
  // cọ đang đi qua mạch vữa (tia chạm lõi nền đá): ra khỏi mạch thì CHẤM LẠI MỰC (quãng khô tính lại từ 0) — xem placeCont
  let inGap = false;
  const camP = new THREE.Vector3(), camF = new THREE.Vector3(), vDir = new THREE.Vector3(), vTmp = new THREE.Vector3(), vPt = new THREE.Vector3();

  // ── nhãn đo dọc theo vết (chấm · số · nét nối nhãn trước với nhãn sau) ──────
  const NS = 'http://www.w3.org/2000/svg';
  const SLOTS = 5;
  const plexEls = [], labels = [];
  if (svg) {
    for (let i = 0; i < SLOTS; i++) {
      const g = document.createElementNS(NS, 'g');
      const halo = document.createElementNS(NS, 'circle'); halo.setAttribute('class', 'plex-halo'); halo.setAttribute('r', '6.5');
      const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', '2.6');
      const txt = document.createElementNS(NS, 'text'); txt.setAttribute('class', 'plex-num');
      g.appendChild(halo); g.appendChild(dot); g.appendChild(txt);
      g.style.opacity = '0';
      svg.appendChild(g);
      const ln = document.createElementNS(NS, 'line'); ln.setAttribute('class', 'plex-line'); ln.style.opacity = '0';
      svg.insertBefore(ln, svg.firstChild);
      const ln2 = document.createElementNS(NS, 'line'); ln2.setAttribute('class', 'plex-line'); ln2.style.opacity = '0';
      svg.insertBefore(ln2, svg.firstChild);
      plexEls.push({ g, dot, txt, halo, lines: [ln, ln2] });
    }
  }
  const proj = new THREE.Vector3();
  const project = (v) => { proj.copy(v).project(camera); return { x: ((proj.x + 1) / 2) * pw, y: ((1 - proj.y) / 2) * ph, z: proj.z }; };

  // ── DỒN SỐ CHO SHADER ────────────────────────────────────────────────────────
  // Đỉnh điều khiển = các đỉnh cố định + đỉnh tạm ở đầu nét. Đi từ ĐẦU NÉT lùi về đuôi, mỗi đoạn nối nhau chia thành
  // 1–4 khúc theo đường cong Catmull-Rom, tới khi đủ 96 đỉnh; rồi chép xuôi thứ tự thời gian vào uniform.
  const EC = INK_N + 8;   // bộ đệm thông số hiệu dụng của đỉnh điều khiển, đánh số lùi từ đầu nét
  const EX = new Float64Array(EC), EY = new Float64Array(EC), EZ = new Float64Array(EC), EW = new Float64Array(EC);
  const ET = new Float64Array(EC), ENT = new Float64Array(EC), ES = new Float64Array(EC), ESP = new Float64Array(EC);
  const ESX = new Float64Array(EC), ESY = new Float64Array(EC);   // vị trí trên màn (độ gắt khúc quanh đo trên màn — cái mắt thấy)
  const ER = new Int32Array(EC);   // đỉnh điều khiển nào đang nằm ở ô này (-1 = chưa tính)
  const sp3 = new THREE.Vector3();
  // các đỉnh đã phát (thứ tự lùi): x y z · giờ đã cộng tuổi thêm · giờ thật · bề rộng · quãng · tốc độ · nối với đỉnh cũ hơn
  const RX = new Float64Array(INK_N), RY = new Float64Array(INK_N), RZ = new Float64Array(INK_N), RT = new Float64Array(INK_N);
  const RNT = new Float64Array(INK_N), RW = new Float64Array(INK_N), RS = new Float64Array(INK_N), RSP = new Float64Array(INK_N), RC = new Uint8Array(INK_N);
  let tipLive = false;
  const nCtl = () => pts.length + (tipLive ? 1 : 0);
  const ctl = (k) => (k < pts.length ? pts[k] : tip);
  // đỉnh k nối với đỉnh k-1 (cùng khúc liền)
  const linked = (k) => k > 0 && k < nCtl() && ctl(k).cont && ctl(k - 1).piece === ctl(k).piece;

  function eff(k, t) {
    const r = nCtl() - 1 - k;
    if (ER[r] === k) return r;
    const q = ctl(k);
    let x = q.p.x, y = q.p.y, z = q.p.z, w = q.w;
    // 払い đang mọc: từ đỉnh cuối của nét cũ vươn dần ra tới chỗ đuôi nhọn
    if (q.harai && k > 0 && t - q.t < HARAI_T) {
      const E = ctl(k - 1), g = 0.15 + 0.85 * easeOut(clamp01((t - q.t) / HARAI_T));
      x = E.p.x + (x - E.p.x) * g; y = E.p.y + (y - E.p.y) * g; z = E.p.z + (z - E.p.z) * g;
      w = E.w + (w - E.w) * g;
    }
    EX[r] = x; EY[r] = y; EZ[r] = z;
    sp3.set(x, y, z).project(camera); ESX[r] = (sp3.x + 1) * 0.5 * pw; ESY[r] = (1 - sp3.y) * 0.5 * ph;
    EW[r] = w * pressK(t - q.st0);   // 起筆: khúc vừa mở thì cọ đang ấn xuống — cả khúc to dần
    ET[r] = q.t - q.xa; ENT[r] = q.t; ES[r] = q.sd; ESP[r] = q.sp;   // shader nhận QUÃNG KHÔ (cọ cạn dần, sợi xơ)
    ER[r] = k;
    return r;
  }
  let m = 0;
  function emit(x, y, z, pt, nt, w, s, sp, c) {
    RX[m] = x; RY[m] = y; RZ[m] = z; RT[m] = pt; RNT[m] = nt; RW[m] = w; RS[m] = s; RSP[m] = sp; RC[m] = c; m++;
  }
  // góc quay TRÊN MÀN giữa hai hướng (a→b) và (b→c). Đo trên màn chứ không đo 3D: vệt mực lượn lên xuống theo chiều
  // sâu khi qua ô cửa, gờ mái, mặt đá lồi lõm — trên màn không thấy gãy gì, chia nhỏ những chỗ ấy chỉ phí đỉnh.
  const turn = (ax, ay, bx, by, cx, cy) => {
    const ux = bx - ax, uy = by - ay, vx = cx - bx, vy = cy - by;
    const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
    if (lu < 1e-3 || lv < 1e-3) return 0;
    return Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / (lu * lv))));
  };

  function pack(t, dt) {
    const last = pts[pts.length - 1];
    tipLive = tip.on && !!last && tip.piece === last.piece && tip.p.distanceToSquared(last.p) > 0.0004;
    // tuổi thêm cho đuôi khi vệt dài quá ngân sách: đỉnh có tuổi thật a → tuổi hiệu dụng E(a), chạm 2,8 s (tan hết)
    // ở tuổi acS; giữ nguyên phần đầu ướt (a ≤ a0). Tuổi thêm CHỈ TĂNG — mực đã tan không hiện lại.
    const aEnd = acS;
    if (aEnd < LIFE) {
      const a0 = Math.min(0.6, 0.35 * aEnd);
      for (let k = pts.length - 1; k >= 0; k--) {
        const q = pts[k], a = t - q.t;
        if (a <= a0) continue;
        const E = a >= aEnd ? LIFE + 0.05 : a0 + ((a - a0) * (LIFE - a0)) / Math.max(1e-3, aEnd - a0);
        if (E - a > q.xa) q.xa = E - a;
      }
    }
    ER.fill(-1);
    m = 0;
    const N = nCtl();
    let cut = false;
    // ĐỈNH CỐ ĐỊNH ĐƯỢC ƯU TIÊN: đếm số đỉnh điều khiển còn hiện (từ đầu nét lùi tới đỉnh đã tan) — đường cong chỉ được
    // chia nhỏ bằng phần ngân sách CÒN DƯ (chia từ đầu nét về đuôi). Vệt vừa ngân sách thì tan sau 2,8 s như cũ; đường
    // cong không bao giờ làm đuôi phải tan sớm.
    let alive = 0;
    for (let k = N - 1; k >= 0 && alive < INK_N; k--) { const q = ctl(k); alive++; if (t - q.t + q.xa > LIFE + 0.02) break; }
    let spare = Math.max(0, SOFT - alive);
    for (let k = N - 1; k >= 0; k--) {
      if (m >= INK_N) { cut = true; break; }
      const r2 = eff(k, t);
      emit(EX[r2], EY[r2], EZ[r2], ET[r2], ENT[r2], EW[r2], ES[r2], ESP[r2], linked(k) ? 1 : 0);
      // đỉnh này đã tan hẳn → phần cũ hơn cũng đã tan: dừng (không phí ngân sách cho mực đã khô hết)
      if (t - ET[r2] > LIFE + 0.02) break;
      if (!linked(k)) continue;
      // đoạn (k-1 → k): P0 P1 P2 P3 của Catmull-Rom; đầu khúc / cuối khúc thì lấy đối xứng
      const r1 = eff(k - 1, t);
      const x1 = EX[r1], y1 = EY[r1], z1 = EZ[r1], x2 = EX[r2], y2 = EY[r2], z2 = EZ[r2];
      const u1 = ESX[r1], v1 = ESY[r1], u2 = ESX[r2], v2 = ESY[r2];
      let x0, y0, z0, w0, x3, y3, z3, w3, u0, v0, u3, v3;
      if (linked(k - 1)) { const r0 = eff(k - 2, t); x0 = EX[r0]; y0 = EY[r0]; z0 = EZ[r0]; w0 = EW[r0]; u0 = ESX[r0]; v0 = ESY[r0]; }
      else { x0 = 2 * x1 - x2; y0 = 2 * y1 - y2; z0 = 2 * z1 - z2; w0 = EW[r1]; u0 = 2 * u1 - u2; v0 = 2 * v1 - v2; }
      if (linked(k + 1)) { const r3 = eff(k + 1, t); x3 = EX[r3]; y3 = EY[r3]; z3 = EZ[r3]; w3 = EW[r3]; u3 = ESX[r3]; v3 = ESY[r3]; }
      else { x3 = 2 * x2 - x1; y3 = 2 * y2 - y1; z3 = 2 * z2 - z1; w3 = EW[r2]; u3 = 2 * u2 - u1; v3 = 2 * v2 - v1; }
      const L12 = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
      // đoạn ngắn hơn 6 px trên màn thì có gãy cũng không thấy; góc quá 50° là GÓC THẬT (tay đảo chiều, hoặc nét đi qua
      // hai mặt khác độ sâu nên lệch nhau trên màn khi máy quay nghiêng) — bo tròn nó không làm nét mềm hơn, chỉ phí đỉnh
      let th = Math.hypot(u2 - u1, v2 - v1) < 6 ? 0 : Math.max(turn(u0, v0, u1, v1, u2, v2), turn(u1, v1, u2, v2, u3, v3));
      if (th > 0.87) th = 0;
      const n = L12 < 0.05 || spare <= 0 ? 1 : Math.min(SUB_MAX, 1 + Math.floor(th / TURN), 1 + spare);
      if (n > 1) {
        spare -= n - 1;
        // centripetal: khoảng tham số = căn bậc hai độ dài dây cung (Barry–Goldman)
        const d01 = Math.max(Math.sqrt(Math.hypot(x1 - x0, y1 - y0, z1 - z0)), 1e-4);
        const d12 = Math.max(Math.sqrt(L12), 1e-4);
        const d23 = Math.max(Math.sqrt(Math.hypot(x3 - x2, y3 - y2, z3 - z2)), 1e-4);
        const t1 = d01, t2 = t1 + d12, t3 = t2 + d23;
        const w1 = EW[r1], w2 = EW[r2], wLo = Math.min(w1, w2), wHi = Math.max(w1, w2);
        for (let i = n - 1; i >= 1; i--) {
          if (m >= INK_N) { cut = true; break; }
          const u = i / n, tt = t1 + u * d12;
          const a1 = (t1 - tt) / t1, b1 = tt / t1;
          const a2 = (t2 - tt) / d12, b2 = (tt - t1) / d12;
          const a3 = (t3 - tt) / d23, b3 = (tt - t2) / d23;
          const A1x = a1 * x0 + b1 * x1, A1y = a1 * y0 + b1 * y1, A1z = a1 * z0 + b1 * z1;
          const A2x = a2 * x1 + b2 * x2, A2y = a2 * y1 + b2 * y2, A2z = a2 * z1 + b2 * z2;
          const A3x = a3 * x2 + b3 * x3, A3y = a3 * y2 + b3 * y3, A3z = a3 * z2 + b3 * z3;
          const c1 = (t2 - tt) / t2, e1 = tt / t2, c2 = (t3 - tt) / (t3 - t1), e2 = (tt - t1) / (t3 - t1);
          const B1x = c1 * A1x + e1 * A2x, B1y = c1 * A1y + e1 * A2y, B1z = c1 * A1z + e1 * A2z;
          const B2x = c2 * A2x + e2 * A3x, B2y = c2 * A2y + e2 * A3y, B2z = c2 * A2z + e2 * A3z;
          const X = a2 * B1x + b2 * B2x, Y = a2 * B1y + b2 * B2y, Z = a2 * B1z + b2 * B2z;
          // bề rộng: Catmull-Rom đều, kẹp trong khoảng hai đầu đoạn (không phình lố); giờ, quãng, tốc độ: nội suy thẳng
          const uu = u * u, uuu = uu * u;
          const wc = 0.5 * (2 * w1 + (w2 - w0) * u + (2 * w0 - 5 * w1 + 4 * w2 - w3) * uu + (3 * w1 - w0 - 3 * w2 + w3) * uuu);
          emit(X, Y, Z, ET[r1] + (ET[r2] - ET[r1]) * u, ENT[r1] + (ENT[r2] - ENT[r1]) * u, Math.min(wHi, Math.max(wLo, wc)),
            ES[r1] + (ES[r2] - ES[r1]) * u, ESP[r1] + (ESP[r2] - ESP[r1]) * u, 1);
        }
        if (cut) break;
      }
    }
    // tuổi của đỉnh thứ SOFT (88) tính từ đầu nét: đuôi tan hết ở đó, 8 đỉnh còn lại là chỗ dự phòng khi tay bỗng
    // nhanh lên (acS bám xuống trong vài khung — đỉnh chưa tan không bị cắt cụt ở mốc 96). Giảm thì bám nhanh, tăng thì
    // hồi chậm (đuôi không giật qua lại).
    const ageSoft = m >= SOFT ? Math.min(LIFE, t - RNT[SOFT - 1]) : LIFE;
    acS += (ageSoft - acS) * (ageSoft < acS ? damp(0.35, dt) : damp(0.02, dt));

    // chép xuôi thứ tự thời gian vào uniform
    const A = INK.uInkA.value, B = INK.uInkB.value;
    A.fill(0); B.fill(0);
    const lo = INK.uInkLo.value, hi = INK.uInkHi.value;
    lo.set(1e9, 1e9, 1e9); hi.set(-1e9, -1e9, -1e9);
    let wMax = 0;
    for (let j = 0; j < m; j++) {
      const s = m - 1 - j;
      A[j * 4] = RX[s]; A[j * 4 + 1] = RY[s]; A[j * 4 + 2] = RZ[s]; A[j * 4 + 3] = RT[s];
      B[j * 4] = RW[s]; B[j * 4 + 1] = RS[s]; B[j * 4 + 2] = RSP[s]; B[j * 4 + 3] = j > 0 ? RC[s] : 0;
      if (RX[s] < lo.x) lo.x = RX[s]; if (RY[s] < lo.y) lo.y = RY[s]; if (RZ[s] < lo.z) lo.z = RZ[s];
      if (RX[s] > hi.x) hi.x = RX[s]; if (RY[s] > hi.y) hi.y = RY[s]; if (RZ[s] > hi.z) hi.z = RZ[s];
      if (RW[s] > wMax) wMax = RW[s];
    }
    // hộp bao cho shader: nới đúng tầm với xa nhất của một đoạn (w·1,7 + 0,2 — phép loại trong kInk) + 0,1 cho chắc
    const pad = wMax * 1.7 + 0.3;
    lo.subScalar(pad); hi.addScalar(pad);
    INK.uInkNum.value = m;
    INK.uInkT.value = t;
    INK.uInkOn.value = m > 1 ? 1 : 0;
  }

  const mkPt = (p, t, w, s, sp, cont, st0, sd = s) => ({ p, t, w, w0: w, s, sd, sp, cont, stroke, piece, st0, xa: 0 });
  // chốt đỉnh tạm thành đỉnh cố định (cọ dừng, hoặc nét sắp đứt: đầu nét không bị rụt lại)
  function commitTip() {
    pts.push({ p: tip.p.clone(), t: tip.t, w: tip.w, w0: tip.w0, s: tip.s, sd: tip.sd, sp: tip.sp, cont: true, stroke: tip.stroke, piece: tip.piece, st0: tip.st0, xa: 0 });
    tip.on = false;
  }
  // kết thúc khúc đang vẽ: chốt đầu nét; tay đang đi thì thêm ĐUÔI VUỐT 払い theo hướng tay (thon về gần 0, khô xơ)
  function endPiece(t, harai) {
    const last = pts[pts.length - 1];
    if (!last || last.piece !== piece) { tip.on = false; return; }
    if (tip.on && tip.piece === piece && tip.p.distanceToSquared(last.p) > 0.0004) commitTip();
    tip.on = false;
    if (!harai) return;
    const E = pts[pts.length - 1];
    let P = null;
    for (let k = pts.length - 2; k >= 0 && pts[k].piece === E.piece; k--) { P = pts[k]; if (P.p.distanceToSquared(E.p) >= 0.09) break; }
    if (!P) return;
    const dir = E.p.clone().sub(P.p), len = dir.length();
    if (len < 1e-4) return;
    // dài hơn bề rộng nét thì mũi nhọn mới ló ra khỏi đầu tròn của nét
    const Lt = Math.min(3.0, Math.max(0.4, 1.5 * E.w));
    pts.push({ p: E.p.clone().addScaledVector(dir, Lt / len), t, w: E.w * 0.05, w0: E.w * 0.05, s: E.s + Lt, sd: E.sd + Lt, sp: Math.max(E.sp, 0.7), cont: true, stroke: E.stroke, piece: E.piece, st0: E.st0, xa: E.xa, harai: true });
  }

  return {
    get plexEls() { return plexEls; },
    get points() { return pts.length; },
    get gpuPoints() { return INK.uInkNum.value; },
    get strokeInfo() { return pts.slice(-6).map((q) => ({ w: +q.w.toFixed(2), sp: +q.sp.toFixed(2), s: +q.s.toFixed(2) })); },
    setPointer(x, y, w, h) { has = true; px = x; py = y; pw = w; ph = h; },
    reset() { pts.length = 0; labels.length = 0; fOn = false; tip.on = false; stroke++; piece++; acS = LIFE; bridgePx = 0; farFirst = null; inGap = false; },
    // bài kiểm "không đổi hình": chép ra / nạp lại đúng một vệt mực (giờ vẽ tính lùi từ tRef) để chụp trước/sau cùng tư thế.
    // Đỉnh tạm ở đầu nét cũng chép ra (đánh dấu tip) — chép đúng cái đang hiện trên màn.
    dump(tRef) {
      const o = (q) => ({ p: [q.p.x, q.p.y, q.p.z], dt: q.t - tRef, w: q.w, w0: q.w0, s: q.s, sd: q.sd, sp: q.sp, cont: q.cont, stroke: q.stroke, piece: q.piece, xa: q.xa, harai: !!q.harai });
      const out = pts.map(o);
      const last = pts[pts.length - 1];
      if (tip.on && last && tip.piece === last.piece && tip.p.distanceToSquared(last.p) > 0.0004) out.push({ ...o(tip), tip: true });
      return out;
    },
    load(arr, tRef) {
      pts.length = 0; labels.length = 0; fOn = false; tip.on = false;
      let mx = 0, pc = piece + 1, prev = null;
      for (const q of arr) {
        const t = tRef + q.dt;
        const cont = !!q.cont && !!prev && (q.piece === undefined ? prev.stroke === q.stroke : prev.pieceIn === q.piece);
        if (!cont) pc++;
        const p = { p: new THREE.Vector3().fromArray(q.p), t, w: q.w, w0: q.w0 ?? q.w, s: q.s, sd: q.sd ?? q.s, sp: q.sp, cont, stroke: q.stroke, piece: pc, pieceIn: q.piece, st0: cont ? prev.st0 : t, xa: q.xa || 0, harai: !!q.harai };
        pts.push(p); prev = p; mx = Math.max(mx, q.stroke);
      }
      stroke = mx + 1; piece = pc + 1;
    },
    clearPointer() { has = false; },
    setGate(k) { gate = k; },
    update(dt, t) {
      pw = window.innerWidth; ph = window.innerHeight;
      // ── vị trí cọ: bộ lọc One Euro trên màn ──
      if (has) {
        if (!fOn) { fOn = true; fx = lx = prevX = px; fy = ly = prevY = py; dxh = dyh = 0; }
        else if (dt > 1e-4) {
          const vx = (px - lx) / dt, vy = (py - ly) / dt;
          lx = px; ly = py;
          const ad = oeA(OE_D, dt);
          dxh += (vx - dxh) * ad; dyh += (vy - dyh) * ad;
          const a = oeA(OE_MIN + OE_BETA * Math.hypot(dxh, dyh), dt);
          fx += (px - fx) * a; fy += (py - fy) * a;
        }
      } else if (fOn) {
        // con trỏ rời trang: chốt đầu nét tại chỗ; đang đi nhanh thì vuốt đuôi
        fOn = false; endPiece(t, vS > 300); piece++;
      }
      if (fOn) {
        const sp = Math.hypot(fx - prevX, fy - prevY) / Math.max(dt, 1e-3);
        vS += (sp - vS) * damp(0.12, dt);
        const spN = smoothstep(180, 1600, vS);
        // lực ấn theo tốc độ tay: chậm → ấn sâu, nét dày; nhanh → gần nhấc cọ, nét mảnh (đuôi vuốt nhọn 払い tự ra)
        // Mike 24/9: "nét cần to hơn" — gấp ~2,8 lần: chậm ~3,5 m (một đến hai gian tường), nhanh ~0,6 m
        wNow += ((0.6 + (3.5 - 0.6) * Math.pow(1 - spN, 1.4)) * gate - wNow) * damp(0.14, dt);
        // Tay nhanh đi xa mỗi khung: bắn tia DÀY dọc đoạn cọ vừa đi (mỗi ~12 px), không thì đỉnh vết
        // nhảy từ mép mái này sang mép mái kia và nét vắt ngang không trung, tường ở giữa không dính mực
        const L = Math.hypot(fx - prevX, fy - prevY);
        const n = Math.max(1, Math.min(8, Math.ceil(L / 12)));
        let anyHit = false;
        for (let q = 1; q <= n; q++) {
          const f = q / n, sx = prevX + (fx - prevX) * f, sy = prevY + (fy - prevY) * f;
          ndc.set((sx / pw) * 2 - 1, -(sy / ph) * 2 + 1);
          ray.setFromCamera(ndc, camera);
          hits.length = 0;
          let h = ray.intersectObjects(pick, false, hits)[0];
          // ra khỏi công trình: vẽ tiếp lên mặt phẳng sương sau toà thành (nét không đứt giữa chừng)
          if (!h && plane) { hits.length = 0; h = ray.intersectObject(plane, false, hits)[0]; }
          if (!h) continue;
          anyHit = true;
          this.addPoint(h, t, spN, L / n);
        }
        prevX = fx; prevY = fy;
        if (anyHit) missT = 0;
        else if ((missT += dt) > 0.12) { const last = pts[pts.length - 1]; if (last && last.piece === piece) { endPiece(t, vS > 300); piece++; stroke++; } }
        // 止め: cọ dừng trên mặt → chốt đầu nét đúng chỗ dừng, mực đọng loang ra ở đó (tới 1,3 lần bề rộng lúc dừng)
        let lastP = pts[pts.length - 1];
        if (lastP && lastP.piece === piece) {
          const dTip = tip.on && tip.piece === piece ? tip.p.distanceTo(lastP.p) : 0;
          if (sp < 10 && dTip > 0.05) { commitTip(); lastP = pts[pts.length - 1]; }
          const near = !tip.on || tip.piece !== piece || tip.p.distanceTo(lastP.p) < 0.15;
          if (sp < 25 && near && t - lastP.t < 1.2) lastP.w = Math.min(lastP.w0 * 1.3, lastP.w + dt * 0.35);
        }
      }
      while (pts.length && t - pts[0].t + pts[0].xa > LIFE + 0.2) pts.shift();
      if (pts.length && pts[pts.length - 1].t > t + 0.1) { pts.length = 0; tip.on = false; }   // đồng hồ cảnh bị đặt lùi (bài kiểm)
      pack(t, dt);
      this.updateLabels(t);
    },
    addPoint(h, t, spN, stepPx) {
      const last = pts[pts.length - 1];
      // khúc đang vẽ, cọ vẫn chạm mặt liên tục (lần chạm trước cách < 0,4 s) — tính theo LẦN CHẠM, không theo đỉnh cố
      // định: rê rất chậm thì hai đỉnh cố định cách nhau lâu mà nét vẫn liền
      const live = !!last && last.piece === piece && t - lastHitT < 0.4;
      lastHitT = t;
      if (!live) {
        // mở nét mới (cọ vừa chạm lại mặt sau một quãng nhấc lên)
        if (last && last.piece === piece) endPiece(t, false);
        if (last && last.stroke === stroke) stroke++;
        piece++; bridgePx = 0; farFirst = null; inGap = false;
        this.startPiece(h.point, h, t, spN);
        return;
      }
      // gãy nét ở chỗ sâu nông nhảy vọt (mép mái → tường lùi phía sau): quãng 3D lớn hơn nhiều so với quãng
      // con trỏ đi trên màn thì không nối — mực không vắt qua không trung
      const perPx = (2 * h.distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / ph;
      // nét to (tới 3,5 m) phủ được cả chỗ mép mái → tường lùi phía sau: chỉ ngắt khi quãng nhảy lớn hơn bề rộng nét
      const thr = Math.max(3.0 * Math.max(stepPx, 2) * perPx + 0.25, 1.1 * wNow);
      if (last.p.distanceTo(h.point) <= thr) { bridgePx = 0; farFirst = null; this.placeCont(h.point, h, t, spN, inGap ? 2 : 0); inGap = false; return; }
      // Tia chạm một mặt SÂU hơn hẳn mặt cọ đang vẽ: có thể chỉ là KHE (mạch vữa giữa hai tảng đá — tia lọt qua, chạm mặt
      // trong của nền đá phía sau toà thành, sâu hơn ~20 m). Cọ đi tiếp trên mặt phẳng cùng độ sâu với đầu nét; quay về
      // được mặt cũ trong 14 px thì nét liền, không đứt. Quá 14 px vẫn ở mặt sâu thì là MÉP thật: đứt nét tại đó.
      const ref = tip.on && tip.piece === piece ? tip.p : last.p;
      camera.getWorldPosition(camP); camera.getWorldDirection(camF);
      vDir.copy(h.point).sub(camP).normalize();
      const tv = camF.dot(vTmp.copy(ref).sub(camP)) / Math.max(1e-4, camF.dot(vDir));
      const deeper = h.distance > tv + Math.max(0.4, 0.3 * wNow);
      if (deeper && gaps.length) {
        // tia lọt khe giữa các tảng đá: thử chạm LÕI nền đá (chỉ bắn thêm lúc này — không tốn thêm gì mỗi khung)
        hits.length = 0;
        const g = ray.intersectObjects(gaps, false, hits)[0];
        if (g && g.distance < h.distance - 0.1 && last.p.distanceTo(g.point) <= thr) { bridgePx = 0; farFirst = null; const first = !inGap; inGap = true; this.placeCont(g.point, null, t, spN, first ? 1 : 0); return; }
      }
      if (deeper && bridgePx + stepPx <= BRIDGE_PX) {
        bridgePx += stepPx;
        if (!farFirst) farFirst = h.point.clone();
        this.placeCont(vPt.copy(camP).addScaledVector(vDir, tv), null, t, spN);
        return;
      }
      // ĐỨT NÉT THẬT: nét cũ vuốt đuôi 払い (tay đang đi); nét mới mở ngay tại mép (điểm chạm sâu đầu tiên), ấn vào 起筆
      endPiece(t, vS > 60);
      piece++;
      const start = deeper ? farFirst : null;
      bridgePx = 0; farFirst = null; inGap = false;
      if (start) { this.startPiece(start, null, t, spN); this.placeCont(h.point, h, t, spN); }
      else this.startPiece(h.point, h, t, spN);
    },
    // đỉnh ĐẦU của một khúc mới
    startPiece(P, h, t, spN) {
      // giờ ấn cọ (起筆) để trống: chỉ tính từ lúc khúc thật sự HIỆN ra (cọ rời điểm đặt) — cọ đặt yên lâu rồi mới đi
      // thì nét vẫn ấn vào mềm, không bật ra cả cục
      pts.push(mkPt(P.clone(), t, wNow, 0, spN, false, Infinity));
      tip.on = false;
      nextLabelS = Math.min(nextLabelS, 1.2);
    },
    // điểm chạm nối tiếp khúc đang vẽ: chưa đủ xa thì chỉ dời ĐỈNH TẠM ở đầu nét; đủ xa thì thêm một đỉnh cố định.
    // pin = 1: vừa vào mạch vữa — ghim một đỉnh ngay mép vào (chỗ chuyển mực gọn trong bề rộng mạch).
    // pin = 2: vừa ra khỏi mạch vữa — CHẤM LẠI MỰC: ghim một đỉnh ngay mép tảng đá, quãng khô tính lại từ 0. Nét liền
    // qua mạch (không đứt, không bật cục) mà mỗi tảng vẫn là ô mực tươi đậm như bản đã duyệt (bản cũ đứt nét ở mọi
    // mạch vữa nên cọ không bao giờ cạn trên nền đá). Chỗ chuyển nằm đúng trên mạch — lõi sáng không nhận mực, không lộ nối.
    placeCont(P, h, t, spN, pin = 0) {
      const last = pts[pts.length - 1];
      const d = last.p.distanceTo(P), s = last.s + d, sd = pin === 2 ? 0 : last.sd + d;
      if (last.st0 === Infinity && d > 0.02) last.st0 = t;
      if ((!pin || d < 0.02) && d < Math.max(0.3, 0.5 * wNow) && pin !== 2) {
        tip.on = true; tip.p.copy(P); tip.t = t; tip.w = tip.w0 = wNow; tip.s = s; tip.sd = sd; tip.sp = spN;
        tip.stroke = last.stroke; tip.piece = last.piece; tip.st0 = last.st0; tip.xa = 0;
        return;
      }
      pts.push(mkPt(P.clone(), t, wNow, s, spN, true, last.st0, sd));
      tip.on = false;
      if (svg && h && s >= nextLabelS) {
        const r = h.object === plane ? null : resolve(h, labelK);
        // không lặp lại cùng một mô-đun, không đặt sát nhãn đang còn trên màn (≥ 70 px)
        const key = h.object.id + ':' + (h.instanceId ?? -1);
        const sp0 = project(h.point);
        const crowded = labels.some((L) => t - L.t < LIFE && Math.hypot(project(L.p).x - sp0.x, project(L.p).y - sp0.y) < 70);
        if (r && key !== lastKey && !crowded) {
          lastKey = key;
          const nn = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3();
          labels.push({ p: h.point.clone().addScaledVector(nn, 0.05), t, text: r, stroke, slot: labelK % SLOTS });
          labelK++;
          if (labels.length > SLOTS) labels.shift();
        }
        nextLabelS = s + 4.2;
      }
    },
    updateLabels(t) {
      if (!svg) return;
      const at = new Array(SLOTS).fill(null), op = new Array(SLOTS).fill(0);
      for (const L of labels) {
        const age = t - L.t;
        const pe = plexEls[L.slot];
        const o = age < 0 ? 0 : smoothstep(0, 0.18, age) * (1 - smoothstep(1.5, LIFE, age));
        if (o <= 0.01) continue;
        const p = project(L.p);
        at[L.slot] = p; op[L.slot] = o;
        pe.at = p;
        pe.g.style.opacity = o.toFixed(3);
        pe.dot.setAttribute('cx', p.x.toFixed(1)); pe.dot.setAttribute('cy', p.y.toFixed(1));
        pe.halo.setAttribute('cx', p.x.toFixed(1)); pe.halo.setAttribute('cy', p.y.toFixed(1));
        const off = pe.off || [6, -4];
        pe.txt.setAttribute('x', (p.x + off[0]).toFixed(1)); pe.txt.setAttribute('y', (p.y + off[1]).toFixed(1));
        pe.box = { x: p.x + off[0] - 1, y: p.y + off[1] - 11, w: 20, h: 13 };
        pe.txt.textContent = L.text;
      }
      for (let i = 0; i < SLOTS; i++) if (!at[i]) { plexEls[i].g.style.opacity = '0'; plexEls[i].at = null; }
      // nét nối nhãn với nhãn kế tiếp của CÙNG một nét cọ — như đường ghi kích thước
      for (const pe of plexEls) for (const ln of pe.lines) ln.style.opacity = '0';
      for (let i = 0; i + 1 < labels.length; i++) {
        const A = labels[i], B = labels[i + 1];
        if (A.stroke !== B.stroke || !at[A.slot] || !at[B.slot]) continue;
        const ln = plexEls[A.slot].lines[0];
        const a = at[A.slot], b = at[B.slot];
        ln.setAttribute('x1', a.x.toFixed(1)); ln.setAttribute('y1', a.y.toFixed(1));
        ln.setAttribute('x2', b.x.toFixed(1)); ln.setAttribute('y2', b.y.toFixed(1));
        ln.style.opacity = Math.min(op[A.slot], op[B.slot]).toFixed(3);
      }
    },
  };
}
