// Âm thanh cho Studio Kōzō — BẢN 2 (29/9), GẮN VÀO TRANG. Nguồn gốc: prototypes/kozo-dem/am-thanh.js (trang nghe thử); sửa ở
// đâu thì chép sang chỗ kia cho hai bản giống nhau.
//
// Mike (29/9, sau bản 1): "âm thanh đang chưa hay, các tiếng gió hơi khó chịu. Tôi muốn luôn có tiếng đàn, đi tới đâu
// sẽ có thêm âm thanh của chỗ đó thôi". Nên bản 2:
//  · Nhạc là lớp chính, chạy liền từ lúc bật tới hết trang: một bài duy nhất, không ngắt, không bắt đầu lại. Ba tiếng
//    đàn cùng một mô hình dây rung Karplus-Strong (hai mặt rung, dây trễ đọc phân số nên luyến được):
//      koto — móng ngà gảy gần ngựa đàn, hát câu chính (có luyến oshi/hiki, rung yuri);
//      hạc  — dây gảy bằng ngón, mềm và tròn, rải nốt đều bên dưới;
//      trầm — đàn koto trầm 17 dây, nốt gốc mỗi hợp âm.
//    Qua các chương chỉ đổi nốt gốc và độ dày; thay đổi rơi vào phách kế tiếp. Ngũ cung miyako-bushi gốc Rê.
//  · Tiếng nơi chốn chỉ là điểm xuyết, nhỏ và thưa: mỗi nơi 1–2 tiếng đặc trưng. Không còn lớp gió nào.
//  · Tiếng chuyển cảnh hoà vào nhạc: một nốt trầm ngân + một chuỗi nốt hạc rải lên, theo nốt gốc của chương mới.
//  · Tiếng vang: mạng trễ phản hồi 16 đường dựng bằng nút có sẵn + đáp ứng ngắn 0,22 s (không dùng đáp ứng dài:
//    gán đáp ứng 3 s cho ConvolverNode chặn luồng chính 9–20 ms, đo 29/9).
//  · Mọi tiếng dựng trước (OfflineAudioContext + tính mẫu bằng JS chia lát ≤ 3 ms, chỉ lúc trình duyệt rảnh).
//
// Nối vào trang:
//   import { taoAmThanh } from './am-thanh.js';
//   const am = taoAmThanh();
//   am.bat() / am.tat()            — bat() phải gọi trong một cú bấm (luật trình duyệt); mặc định tắt
//   window.dispatchEvent(new CustomEvent('kozo:chuong', { detail: { tu, toi, loai: 'bat-dau' | 'xong', kieu: 'chuyen' | 'mo' } }))  // chương 0..6
//   (phần 9, 30/9: chương 6 連絡 có đúng MỘT tiếng nơi chốn — vồ gỗ đóng cọc 遣り方 ở xa, thưa; chương 5 仕事 giữ y như cũ: nhạc và
//    tiếng của làng giấy)
//   window.dispatchEvent(new CustomEvent('kozo:net', { detail: { dang: true | false } }))   // nét cọ: mặc định không kêu

const TAU = Math.PI * 2;
const dB = (x) => Math.pow(10, x / 20);
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const kep = (x, a, b) => Math.min(b, Math.max(a, x));
const ngau = (a, b) => a + (b - a) * Math.random();

// ---------------------------------------------------------------- MỨC ÂM LƯỢNG (đo trên bản thu thật, xem nghe.html)
// dB. Nhạc là lớp to nhất; tiếng nơi chốn thấp hơn nhạc ~7–8 LU (≈ 70% / 30%).
const MUC = {
  nhac: 5.6,       // cả lớp nhạc
  nen: -6,         // tiếng nơi chốn
  chuyen: -1,      // cử chỉ chuyển cảnh (nốt đàn + chút mực / cửa lùa)
  net: -31,        // tiếng nét cọ — ĐÃ THỬ VÀ TẮT ở bản 1: nhỏ thì nền che, to thì thành tiếng "xì". am.netCo(true) để nghe.
};

// ---------------------------------------------------------------- SỐ NGẪU NHIÊN CÓ HẠT GIỐNG
function taoRnd(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- CHIA VIỆC NẶNG THÀNH LÁT NHỎ
// Mọi vòng lặp tính mẫu là generator, cứ vài nghìn mẫu lại "yield"; chay() nhường luồng chính khi một lát quá 2,5 ms.
// Chỉ làm trong lúc rảnh của trình duyệt (requestIdleCallback): khung hình của trang luôn được vẽ trước.
// (Không dùng scheduler.yield: nó chen trước cả việc khác và làm đói nhịp của trang — đo 29/9.)
const LAT_MS = 2.5;
const thongKe = { latMax: 0, soLat: 0, dai: [], dang: '' };
const coRanh = typeof requestIdleCallback === 'function';
const kenh = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null, hangKenh = [];
if (kenh) kenh.port1.onmessage = () => { const r = hangKenh.shift(); if (r) r(); };
let hanRanh = null;   // khoảng rảnh hiện tại: còn thời gian thì nhường một nhịp ngắn rồi làm tiếp, hết thì chờ khoảng rảnh sau
const nhuong = () => new Promise((r) => {
  if (kenh && hanRanh && hanRanh.timeRemaining() > LAT_MS + 1) { hangKenh.push(() => r(hanRanh)); kenh.port2.postMessage(0); return; }
  if (coRanh) requestIdleCallback((d) => { hanRanh = d.didTimeout ? null : d; r(d); }, { timeout: 300 }); else setTimeout(() => r(null), 0);
});
const nganSach = (d) => (d && typeof d.timeRemaining === 'function' && !d.didTimeout ? Math.max(1, Math.min(LAT_MS, d.timeRemaining())) : 2);
// trang có thể xin tạm ngưng dựng (vd. lúc đang chuyển cảnh nặng): hàm trả true thì đợi, 120 ms hỏi lại một lần.
// Hàm nhận tên thứ đang dựng ('hac', 'koto', 'chim'…) để trang chọn được "nhạc thì dựng, tiếng nơi chốn thì đợi".
let hoan = null;
export function choHoan(f) { hoan = typeof f === 'function' ? f : null; }
async function doiHoan() { while (hoan && hoan(thongKe.dang)) await new Promise((r) => setTimeout(r, 120)); }
async function chay(gen) {
  await doiHoan();
  let han = nganSach(await nhuong()), t0 = performance.now();
  for (;;) {
    const r = gen.next();
    const dt = performance.now() - t0;
    if (dt > 12 && thongKe.dai.length < 20) thongKe.dai.push([thongKe.dang, +dt.toFixed(0), +performance.now().toFixed(0)]);   // để đo: lát nào quá dài, đang dựng gì
    if (r.done) { thongKe.latMax = Math.max(thongKe.latMax, dt); await nhuong(); return r.value; }
    if (dt > han) { thongKe.latMax = Math.max(thongKe.latMax, dt); thongKe.soLat++; await doiHoan(); han = nganSach(await nhuong()); t0 = performance.now(); }
  }
}

// ---------------------------------------------------------------- KHỐI DỰNG CHUNG
// bộ lọc hai cực tính bằng JS (công thức RBJ): 'lp' thấp qua, 'hp' cao qua, 'bp' dải (đỉnh 0 dB), 'pk' nhô một dải
function bq(loai, f, Q, sr, db = 0) {
  const w = TAU * Math.min(f, sr * 0.45) / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * Q), A = Math.pow(10, db / 40);
  let b0, b1, b2, a0, a1, a2;
  if (loai === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else if (loai === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else if (loai === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else { b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
// đường cong ngẫu nhiên trơn trong [0,1]: nút ngẫu nhiên cách nhau `khoang` điểm, nội suy cosin
function duongMuot(rnd, n, khoang) {
  const nut = Array.from({ length: Math.ceil(n / khoang) + 2 }, rnd), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i / khoang, j = x | 0, u = (1 - Math.cos((x - j) * Math.PI)) / 2; out[i] = nut[j] * (1 - u) + nut[j + 1] * u; }
  return out;
}
const layMuot = (c, u) => c[Math.min(c.length - 1, Math.max(0, Math.round(u * (c.length - 1))))];
// đường gió giật (50 điểm/giây): ba tầng chậm–vừa–nhanh cộng lại, nâng mũ cho cơn giật nhọn
function duongGio(rnd, giay, { cham = 7, vua = 2.2, nhanh = 0.6, mu = 1.5 } = {}) {
  const n = Math.ceil(giay * 50) + 2;
  const a = duongMuot(rnd, n, cham * 50), b = duongMuot(rnd, n, vua * 50), c = duongMuot(rnd, n, nhanh * 50), out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.pow(0.55 * a[i] + 0.3 * b[i] + 0.15 * c[i], mu);
  return out;
}
const anh = (c, lo, hi) => c.map((v) => lo + (hi - lo) * v);

function* taoNhieu(a, loai, rnd) {
  if (loai === 'trang') { for (let i = 0; i < a.length; i++) { a[i] = rnd() * 2 - 1; if ((i & 8191) === 0) yield; } return; }
  if (loai === 'hong') {
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < a.length; i++) {
      const w = rnd() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.0990460; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913;
      a[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
      if ((i & 8191) === 0) yield;
    }
    return;
  }
  let last = 0;
  for (let i = 0; i < a.length; i++) { last = (last + 0.02 * (rnd() * 2 - 1)) / 1.02; a[i] = last * 3.5; if ((i & 8191) === 0) yield; }
}
// Lưu ý: với lowpass/highpass, Q của Web Audio tính bằng dB (Q = 0,5 là có đỉnh cộng hưởng!) — đổi từ hệ số thường sang dB ở đây.
const qdB = (q) => 20 * Math.log10(q);
function bqOff(off, type, f, Q) { const b = off.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = type === 'lowpass' || type === 'highpass' ? qdB(Q) : Q; return b; }
async function nhieuOff(off, giay, loai, rnd) {
  await nhuong();
  const b = off.createBuffer(1, Math.ceil(off.sampleRate * giay), off.sampleRate);
  await chay(taoNhieu(b.getChannelData(0), loai, rnd));
  const s = off.createBufferSource(); s.buffer = b; return s;
}
// dựng trước bằng OfflineAudioContext (trình duyệt tính trên luồng riêng)
async function veOff(sr, giay, kenh, dung) {
  await nhuong();
  const off = new OfflineAudioContext(kenh, Math.ceil(sr * giay), sr);
  await dung(off);
  await nhuong();
  return off.startRendering();
}
// nối vòng: tan chéo X giây cuối vào đầu (tại chỗ); vòng lặp chạy 0 → L
function* noiVong(buf, L, X) {
  const sr = buf.sampleRate, nL = Math.round(L * sr), nX = Math.round(X * sr);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const a = buf.getChannelData(c);
    for (let i = 0; i < nX; i++) { const u = (i / nX) * Math.PI / 2; a[i] = a[i] * Math.sin(u) + a[nL + i] * Math.cos(u); if ((i & 8191) === 0) yield; }
  }
}
function* chuanRms(buf, rms, L) {
  const n = Math.round((L || buf.duration) * buf.sampleRate); let s = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) { const a = buf.getChannelData(c); for (let i = 0; i < n; i++) { s += a[i] * a[i]; if ((i & 32767) === 0) yield; } }
  const k = rms / Math.sqrt(s / (n * buf.numberOfChannels) + 1e-20);
  for (let c = 0; c < buf.numberOfChannels; c++) { const a = buf.getChannelData(c); for (let i = 0; i < a.length; i++) { a[i] *= k; if ((i & 32767) === 0) yield; } }
}
function* chuanDinh(a, dinh) {
  let m = 0; for (let i = 0; i < a.length; i++) { const v = Math.abs(a[i]); if (v > m) m = v; if ((i & 32767) === 0) yield; }
  const k = dinh / (m + 1e-12); for (let i = 0; i < a.length; i++) { a[i] *= k; if ((i & 32767) === 0) yield; }
}
function* vien(a, sr, vao = 0.0015, ra = 0.02) {   // vuốt hai mép cho khỏi "tách"
  const nv = Math.floor(vao * sr), nr = Math.floor(ra * sr);
  for (let i = 0; i < nv; i++) a[i] *= i / nv;
  for (let i = 0; i < nr; i++) a[a.length - 1 - i] *= i / nr;
  yield;
}
// một tiếng dựng bằng generator → AudioBuffer một kênh, chuẩn đỉnh
async function motTieng(sr, giay, gen, dinh = 0.5) {
  await nhuong();
  const buf = new AudioBuffer({ length: Math.ceil(sr * giay), numberOfChannels: 1, sampleRate: sr });
  const a = buf.getChannelData(0);
  await chay(gen(a, sr));
  await chay(chuanDinh(a, dinh));
  await chay(vien(a, sr));
  return buf;
}
// cộng một sóng sine tắt dần (xoay pha, rẻ hơn gọi sin/exp mỗi mẫu)
function* themTat(a, sr, t0, f, amp, tau) {
  const n0 = Math.max(0, Math.floor(t0 * sr)), n = Math.min(a.length - n0, Math.ceil(tau * sr * 7));
  if (f >= sr * 0.48 || n <= 0) return;
  const w = TAU * f / sr, c = Math.cos(w), s = Math.sin(w), r = Math.exp(-1 / (tau * sr));
  let x = 0, y = amp;
  for (let i = 0; i < n; i++) { a[n0 + i] += x; const nx = (x * c + y * s) * r; y = (y * c - x * s) * r; x = nx; if ((i & 16383) === 0) yield; }
}
// bọt khí (mô hình Minnaert / van den Doel): sine tắt nhanh, giọng lên dần
function themBong(a, sr, t0, f0, amp, d, len) {
  const n0 = Math.floor(t0 * sr), n = Math.min(a.length - n0, Math.ceil(7 / d * sr)), k = Math.exp(-d / sr), mo = sr * 0.0015;
  let ph = 0, env = amp;
  for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * f0 * (1 + len * d * t) / sr; a[n0 + i] += Math.sin(ph) * env * Math.min(1, i / mo); env *= k; }
}
function* motCucLp(a, sr, fc) { let y = 0; const k = 1 - Math.exp(-TAU * fc / sr); for (let i = 0; i < a.length; i++) { y += k * (a[i] - y); a[i] = y; if ((i & 16383) === 0) yield; } }

// ================================================================ LỚP LIỀN (chỉ nước và "không gian")
// nước chảy róc rách: hàng nghìn bọt khí nhỏ + tiếng dòng chảy nền
function* bongBong(a, sr, rnd, { lam, rMin, rMax, bien, xi }) {
  const T = a.length / sr; let t = 0;
  for (;;) {
    t += -Math.log(1 - rnd()) / lam(t);
    if (t >= T - 0.05) break;
    const r = rMin * Math.pow(rMax / rMin, Math.pow(rnd(), 1.5));
    const f0 = 3000 / r, d = 0.13 * f0 + 0.0072 * Math.pow(f0, 1.5);
    themBong(a, sr, t, f0, bien * Math.pow(r / rMax, 0.7) * (0.3 + 0.7 * rnd()), d, xi);
    yield;
  }
}
function* dongChay(a, sr, rnd, muc, f, nhip) {
  const b = bq('bp', f, 0.6, sr); let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < a.length; i++) {
    const w = rnd() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.0990460; b1 = 0.96300 * b1 + w * 0.2965164; b2 = 0.57000 * b2 + w * 1.0526913;
    const p = (b0 + b1 + b2 + w * 0.1848) * 0.2, k = nhip[Math.min(nhip.length - 1, Math.floor(i / sr * 50))];
    a[i] += b(p) * muc * (0.5 + 0.8 * k);
    if ((i & 8191) === 0) yield;
  }
}
async function taoNuoc(seed, L, o) {
  const rnd = taoRnd(seed), sr = 24000, X = 3, T = L + X;
  await nhuong();
  const buf = new AudioBuffer({ length: Math.ceil(T * sr), numberOfChannels: 1, sampleRate: sr });
  const a = buf.getChannelData(0);
  const nhip = duongGio(rnd, T, { cham: 4, vua: 1.1, nhanh: 0.3, mu: 1.2 });
  await chay(bongBong(a, sr, rnd, { lam: (t) => o.lam * (0.3 + 1.4 * nhip[Math.min(nhip.length - 1, Math.round(t * 50))]), rMin: o.rMin, rMax: o.rMax, bien: 0.5, xi: o.xi || 0.1 }));
  await chay(dongChay(a, sr, rnd, o.nen, o.f, nhip));
  await chay(noiVong(buf, L, X)); await chay(chuanRms(buf, 0.1, L));
  return { buf, L };
}
// "không gian": một lớp rất trầm, rất nhỏ (nhiễu nâu lọc dưới ~420 Hz, không cơn giật, không dải cao) cho hẻm đá và rừng
async function taoKhong() {
  const rnd = taoRnd(19), sr = 8000, L = 23, X = 3, T = L + X;
  const troi = duongMuot(rnd, Math.ceil(T * 50) + 2, 250);
  const buf = await veOff(sr, T, 1, async (off) => {
    const s = await nhieuOff(off, T, 'nau', rnd);
    const h = bqOff(off, 'highpass', 55, 0.7), l1 = bqOff(off, 'lowpass', 420, 0.7), l2 = bqOff(off, 'lowpass', 420, 0.7);
    const g = off.createGain(); g.gain.setValueCurveAtTime(anh(troi, 0.6, 1), 0, T);
    s.connect(h).connect(l1).connect(l2).connect(g).connect(off.destination); s.start();
  });
  await chay(noiVong(buf, L, X)); await chay(chuanRms(buf, 0.1, L));
  return { buf, L };
}

// ================================================================ TIẾNG LẺ (mỗi loại vài bản)
// diều hâu (tobi) "piii — hyororo" trên đồi
function* chimTobi(a, sr, rnd) {
  const k = 0.95 + 0.1 * rnd(); let ph = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / sr; let f = 2800 * k, amp = 0;
    if (t < 0.6) { f = k * (2900 - 160 * t / 0.6); amp = Math.min(1, t / 0.05) * Math.min(1, (0.6 - t) / 0.08); }
    else if (t >= 0.68) {
      const u = Math.min(1, (t - 0.68) / 1.45);
      f = k * (2700 - 760 * u + 270 * (1 - 0.6 * u) * Math.sin(TAU * 10.5 * (t - 0.68)));
      amp = Math.min(1, (t - 0.68) / 0.04) * Math.pow(1 - u, 1.3) * 0.85;
    }
    ph += TAU * f / sr;
    a[i] = amp * (Math.sin(ph) + 0.1 * Math.sin(2 * ph));
    if ((i & 4095) === 0) yield;
  }
}
// chim nhỏ: bạc má "tsu-pi tsu-pi" hoặc một tràng ríu rít
function notChim(a, sr, t0, dai, fcong, amp) {
  const n0 = Math.floor(t0 * sr), n = Math.floor(dai * sr); let ph = 0;
  for (let i = 0; i < n && n0 + i < a.length; i++) { const u = i / n; ph += TAU * fcong(u) / sr; a[n0 + i] += amp * Math.pow(Math.sin(Math.PI * u), 1.5) * Math.sin(ph); }
}
function* chimNho(a, sr, rnd, kieu) {
  const k = 0.92 + 0.16 * rnd();
  if (kieu === 0) {
    const lap = 3 + Math.floor(rnd() * 3);
    for (let r = 0; r < lap; r++) {
      const t0 = 0.05 + r * (0.22 + 0.03 * rnd());
      notChim(a, sr, t0, 0.06, (u) => k * (5600 - 900 * u), 0.7);
      notChim(a, sr, t0 + 0.095, 0.085, (u) => k * (3450 + 260 * u), 1);
      yield;
    }
  } else {
    const so = 5 + Math.floor(rnd() * 5); let t = 0.05;
    for (let r = 0; r < so; r++) {
      const f1 = k * (2900 + 1200 * rnd()), f2 = f1 * (1.25 + 0.4 * rnd()), d = 0.03 + 0.03 * rnd();
      notChim(a, sr, t, d, (u) => f1 + (f2 - f1) * u, 0.6 + 0.4 * rnd());
      t += d + 0.05 + 0.07 * rnd(); yield;
    }
  }
}
// chuông chùa 梵鐘 rất xa: các hoạ âm không điều hoà, mỗi hoạ âm là một cặp lệch nhau vài phần Hz (tiếng "ù… ù…" đập)
function* chuongChua(a, sr, rnd) {
  const f1 = 108;
  // hoạ âm trên (306, 586 Hz…) được đẩy lên để chuông vẫn nghe ra trên loa laptop, vốn không phát được âm gốc 108 Hz
  const P = [[1, 0.75, 34, 0.9], [1.52, 0.32, 20, 1.4], [2.83, 0.85, 15, 2.1], [3.35, 0.3, 11, 1.1], [5.43, 0.48, 7.5, 3.2], [6.2, 0.16, 5.5, 1.8], [8.87, 0.16, 3.8, 4], [11.3, 0.08, 2.4, 3]];
  for (const [r, am, t60, beat] of P) {
    const tau = t60 / 6.9;
    yield* themTat(a, sr, 0.05, f1 * r, am * 0.5, tau); yield* themTat(a, sr, 0.05, f1 * r + beat, am * 0.5, tau * 0.97);
  }
  // gỗ vồ (shumoku) chạm đồng: tiếng "bụp" trầm ngắn
  const lp = bq('lp', 420, 0.7, sr);
  for (let i = 0; i < sr * 0.25; i++) { const t = i / sr; a[i + Math.floor(0.05 * sr)] += lp((rnd() * 2 - 1) * Math.exp(-t / 0.05)) * 1.6; }
  yield* motCucLp(a, sr, 1800);   // xa: mất dải cao
  const nf = Math.floor(sr * 4);  // 4 giây cuối lặng dần
  for (let i = 0; i < nf; i++) a[a.length - nf + i] *= 1 - i / nf;
}
// ếch cây ruộng lúa: chuỗi nốt "ge-ge-ge", mỗi nốt là chuỗi xung qua hai hốc cộng hưởng
function* echCay(a, sr, rnd, k) {
  const r1 = bq('bp', 1250 * k, 6, sr), r2 = bq('bp', 2500 * k, 7, sr), pr = 135 / k;
  const soNot = 5 + Math.floor(rnd() * 7), nhip = 6.5 + rnd() * 2, dai = 0.055 + rnd() * 0.02;
  let ph = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / sr - 0.02, kk = Math.floor(t * nhip), u = t - kk / nhip;
    let e = 0;
    if (t >= 0 && kk < soNot && u < dai) {
      ph += pr * (1 + 0.15 * u / dai) / sr;
      if (ph >= 1) { ph -= 1; e = 1; }
      e = (e + (rnd() - 0.5) * 0.08) * Math.sin(Math.PI * u / dai) * (0.55 + 0.45 * Math.min(1, kk / 3));
    }
    a[i] = r1(e) + 0.6 * r2(e);
    if ((i & 4095) === 0) yield;
  }
}
// ếch thứ hai: một hồi "kororo" trầm, rung đều
function* echRung(a, sr, rnd, k) {
  const f = 780 * k, pr = 24 + 7 * rnd(), dai = 0.7 + 0.5 * rnd(), r = bq('bp', f * 2, 4, sr);
  let ph = 0, pp = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / sr; let x = 0;
    if (t < dai) {
      ph += TAU * f / sr; pp += pr / sr; if (pp >= 1) pp -= 1;
      const gate = pp < 0.45 ? Math.sin(Math.PI * pp / 0.45) : 0, env = Math.min(1, t / 0.08) * Math.min(1, (dai - t) / 0.15);
      x = (Math.sin(ph) + 0.35 * Math.sin(2 * ph) + 0.15 * Math.sin(3 * ph)) * gate * env;
    }
    a[i] = 0.7 * x + 0.5 * r(x);
    if ((i & 4095) === 0) yield;
  }
}
// giọt nước rơi xuống vũng trong hẻm: tiếng "tách" + bọt khí lên giọng nhanh ("plink")
function* giotNuoc(a, sr, rnd, f0) {
  const d = 45 + 30 * rnd(), len = 0.9 + 0.5 * rnd(), k = Math.exp(-d / sr);
  let ph = 0, env = 1;
  for (let i = 0; i < a.length; i++) {
    const t = i / sr, f = f0 * (1 + len * (1 - Math.exp(-t / 0.018)));
    ph += TAU * f / sr; env *= k;
    a[i] = Math.sin(ph) * env * Math.min(1, t / 0.0015) + (i < sr * 0.0008 ? (rnd() * 2 - 1) * 0.25 * (1 - i / (sr * 0.0008)) : 0);
    if ((i & 4095) === 0) yield;
  }
}
// búa gõ nêm thép vào đá: vành kim loại ngân ngắn + tiếng đá "cộc"
function* nemDa(a, sr, rnd, k) {
  const f0 = 1850 * k;
  for (const [r, am, tau] of [[1, 1, 0.22], [1.93, 0.55, 0.14], [2.74, 0.5, 0.09], [3.51, 0.3, 0.06], [5.02, 0.18, 0.035]]) yield* themTat(a, sr, 0, f0 * r, am * 0.5, tau);
  const bd = bq('bp', 480, 1.4, sr);
  for (let i = 0; i < a.length; i++) {
    const t = i / sr, n = t < 0.04 ? (rnd() * 2 - 1) * Math.exp(-t / 0.006) : 0;
    a[i] += bd(n) * 1.8 + Math.sin(TAU * 150 * t) * Math.exp(-t / 0.035) * 0.35 + (t < 0.0015 ? (rnd() * 2 - 1) * 0.4 : 0);
    if ((i & 4095) === 0) yield;
  }
}
// thân cây kẽo kẹt: ma sát dính–trượt = chuỗi xung thưa, nhịp trôi, qua các hốc cộng hưởng của gỗ
function* keoCay(a, sr, rnd, tram) {
  const R = tram ? [[190, 7, 1], [430, 9, 0.8], [980, 6, 0.45], [2100, 4, 0.2]] : [[620, 8, 1], [1320, 9, 0.7], [2650, 6, 0.35]];
  const rs = R.map(([f, q, g]) => [bq('bp', f * (0.9 + 0.2 * rnd()), q, sr), g]);
  const dai = tram ? 0.9 + 0.9 * rnd() : 0.35 + 0.35 * rnd(), r0 = tram ? 16 + 14 * rnd() : 55 + 50 * rnd(), cv = duongMuot(rnd, 60, 12);
  let ph = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / sr; let e = 0;
    if (t < dai) {
      const rate = r0 * (0.7 + 0.6 * layMuot(cv, t / dai));
      ph += rate / sr; if (ph >= 1) { ph -= 1; e = 0.6 + 0.8 * rnd(); }
      e *= Math.min(1, t / 0.12) * Math.min(1, (dai - t) / 0.2);
    }
    let y = 0; for (const [f, g] of rs) y += f(e) * g;
    a[i] = y;
    if ((i & 4095) === 0) yield;
  }
}
// cú mèo (fukurō) rất xa: "hoo … ho-hoo"
function* cuMeo(a, sr, rnd, k) {
  const H = [[0.05, 0.55, 1], [1.3, 0.22, 0.75], [1.6, 0.5, 0.95]], f0 = 390 * k, br = bq('bp', f0, 4, sr);
  let ph = 0;
  for (let i = 0; i < a.length; i++) {
    const t = i / sr; let env = 0, f = f0;
    for (const [t0, d, g] of H) if (t >= t0 && t < t0 + d) { const u = (t - t0) / d; env = g * Math.pow(Math.sin(Math.PI * u), 0.7); f = f0 * (1 + 0.06 * Math.sin(Math.PI * u) - 0.04 * u); }
    ph += TAU * f / sr;
    a[i] = env * (Math.sin(ph) + 0.12 * Math.sin(2 * ph) + br(rnd() * 2 - 1) * 0.35);
    if ((i & 4095) === 0) yield;
  }
  yield* motCucLp(a, sr, 1300);
}
// chuông gió thuỷ tinh 風鈴: hoạ âm cao, từng cặp lệch nhau cho tiếng "chiriin" lấp lánh; quả lắc chạm lại lần nữa
function* phongLinh(a, sr, rnd, k) {
  const f0 = 2350 * k, P = [[1, 1, 1.9], [1.0045, 0.7, 1.7], [2.62, 0.45, 0.8], [2.645, 0.3, 0.7], [4.9, 0.22, 0.3], [7.6, 0.1, 0.12]];
  const cham = [[0.005, 1], [0.05 + 0.06 * rnd(), 0.3 + 0.15 * rnd()]];
  for (const [t0, g] of cham) {
    for (const [r, am, tau] of P) yield* themTat(a, sr, t0, f0 * r * (1 + (rnd() - 0.5) * 0.002), am * g * 0.4, tau);
    const hp = bq('hp', 3000, 0.7, sr), n0 = Math.floor(t0 * sr);
    for (let i = 0; i < sr * 0.0012; i++) a[n0 + i] += hp((rnd() * 2 - 1)) * g * 0.5;
    yield;
  }
}
// dế 鈴虫 (suzumushi), bản 2: từng tiếng "ri-ri-rin" ngắn, rời thành xung nhịp cánh (~30–40 lần/giây), hơi ráp,
// không còn là một dải tiếng liền (bản 1 bị "rít"). Mỗi bản là một con: vài tiếng rồi nghỉ.
function* hatDe(a, sr, rnd, c) {
  let t = 0.03;
  for (let k = 0; k < c.so; k++) {
    const dai = c.dai * (0.8 + 0.4 * rnd()), n0 = Math.floor(t * sr), n = Math.floor(dai * sr);
    let ph = 0, pa = 0;
    for (let i = 0; i < n && n0 + i < a.length; i++) {
      const tt = i / sr, env = Math.min(1, tt / 0.02) * Math.min(1, (dai - tt) / 0.06);
      const f = c.f * (1 - 0.015 * tt / dai);
      ph += TAU * f / sr; pa += c.pr / sr; if (pa >= 1) pa -= 1;
      const xung = pa < 0.55 ? Math.pow(Math.sin(Math.PI * pa / 0.55), 2) : 0;
      a[n0 + i] += env * xung * (Math.sin(ph) + 0.12 * Math.sin(2 * ph) + (rnd() - 0.5) * 0.12);
      if ((i & 4095) === 0) yield;
    }
    t += dai + c.nghi * (0.7 + 0.6 * rnd());
  }
  yield* motCucLp(a, sr, 6000);
}
function motDe(rnd) {
  return { f: 3900 + 500 * rnd(), pr: 30 + 12 * rnd(), dai: 0.18 + 0.16 * rnd(), nghi: 0.4 + 0.5 * rnd(), so: 3 + Math.floor(rnd() * 4) };
}


// vồ gỗ 掛矢 đóng cọc 遣り方 ở xa (chương 連絡): tiếng "CỐC" gỗ khô — các mode cộng hưởng của thớ gỗ (sine tắt nhanh, 0,6–3 kHz,
// dải loa laptop / điện thoại phát được) + một chạm rất ngắn, rồi tiếng "thịch" trầm của cọc lún đất nhỏ hơn hẳn (p10a B8: bản
// cũ 98% năng lượng dưới 200 Hz — loa nhỏ gần như không phát). Xa nên mất dải cao trên ~3,6 kHz. Không tiếng gió, không "xì"
function* voCoc(a, sr, rnd, k) {
  const t0 = 0.004, n0 = Math.floor(t0 * sr);
  for (const [f, am, tau] of [[640, 0.5, 0.05], [1180, 1, 0.034], [1720, 0.72, 0.024], [2380, 0.4, 0.015], [2950, 0.18, 0.01]]) yield* themTat(a, sr, t0, f * k * (0.97 + 0.06 * rnd()), am, tau);
  const bp = bq('bp', 1800 * k, 1.1, sr), nc = Math.floor(0.0012 * sr);
  for (let i = 0; i < nc; i++) a[n0 + i] += bp(rnd() * 2 - 1) * 0.9 * (1 - i / nc);
  for (let i = n0; i < a.length; i++) { const tj = (i - n0) / sr; a[i] += Math.sin(TAU * 104 * k * tj) * Math.exp(-tj / 0.045) * 0.34 * Math.min(1, tj / 0.002); if ((i & 4095) === 0) yield; }
  yield* motCucLp(a, sr, 3600);
}

// ================================================================ ĐIỂM XUYẾT LÚC CHUYỂN CẢNH (rất nhỏ, đi cùng nốt đàn)
// mực thấm: một hơi "phù" ướt, trầm (nhiễu nâu qua lọc mở rồi khép, cắt dưới 85 Hz) và vài bọt lớn "blọp" — bỏ tiếng "sss"
function* mucTham(a, sr, rnd) {
  let last = 0, l1 = 0, l2 = 0;
  const h1 = bq('hp', 85, 0.7, sr), h2 = bq('hp', 85, 0.7, sr);
  for (let i = 0; i < a.length; i++) {
    const t = i / sr; last = (last + 0.02 * (rnd() * 2 - 1)) / 1.02;
    const env = Math.pow(Math.min(1, t / 0.3), 2) * Math.exp(-Math.max(0, t - 0.3) / 0.6);
    const fc = 240 + 700 * Math.exp(-Math.pow((t - 0.42) / 0.3, 2)), k = 1 - Math.exp(-TAU * fc / sr);
    l1 += k * (last * 3.5 - l1); l2 += k * (l1 - l2);
    a[i] = h2(h1(l2 * env * 1.6));
    if ((i & 4095) === 0) yield;
  }
  for (const [t0, f0, amp, d] of [[0.1, 205, 0.1, 30], [0.27, 290, 0.07, 36], [0.44, 245, 0.06, 32], [0.66, 330, 0.04, 40]]) themBong(a, sr, t0, f0, amp, d, 0.12);
}
// cửa giấy lùa: gỗ trượt trong rãnh (chỉ dải trầm–vừa, không "xì") rồi chạm khung "cốc"; tiếng cốc rơi đúng lúc nốt đàn
const CUA_COC = 0.835;
function* cuaLua(a, sr, rnd) {
  const b1 = bq('bp', 650, 1.2, sr), ln = bq('lp', 1600, 0.7, sr);
  const tr = [[bq('bp', 380, 9, sr), 5], [bq('bp', 830, 11, sr), 3.6], [bq('bp', 1650, 8, sr), 1.4]], hc = bq('hp', 150, 0.7, sr);
  const DAI = 0.82, tho = duongMuot(rnd, Math.ceil(DAI * 32) + 2, 1);
  for (let i = 0; i < a.length; i++) {
    const t = i / sr; let x = 0;
    if (t < DAI) {
      const u = t / DAI, v = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 0.7), n = ln(rnd() * 2 - 1);
      x = b1(n) * 0.6 * v * (0.55 + 0.45 * layMuot(tho, u));
    }
    const tk = t - (DAI + 0.015), k = tk >= 0 && tk < 0.004 ? (rnd() * 2 - 1) * (1 - tk / 0.004) : 0;
    let y = x; for (const [f, g] of tr) y += f(k) * g;
    a[i] = hc(y);
    if ((i & 4095) === 0) yield;
  }
}

// nét cọ trên giấy (vòng lặp 6 s): cọ lông mềm kéo trên giấy dó — nhanh chậm theo tay (độ to và độ sáng đi cùng tốc độ),
// sần theo thớ giấy (điều biên ngẫu nhiên ~40 Hz), thỉnh thoảng sợi giấy vướng lông cọ ("sột")
async function taoNet() {
  const rnd = taoRnd(71), sr = 32000, L = 6, X = 1, T = L + X;
  await nhuong();
  const buf = new AudioBuffer({ length: Math.ceil(T * sr), numberOfChannels: 1, sampleRate: sr });
  const a = buf.getChannelData(0), toc = duongMuot(rnd, Math.ceil(T * 4) + 2, 1);
  await chay((function* () {
    const hp = bq('hp', 900, 0.7, sr), lp = bq('lp', 7000, 0.7, sr), keo = bq('bp', 700, 1.2, sr), vuong = bq('bp', 4800, 3, sr);
    let tho = 0, bp = bq('bp', 3000, 0.6, sr);
    for (let i = 0; i < a.length; i++) {
      const v = 0.25 + 0.75 * Math.pow(layMuot(toc, i / a.length), 1.5);
      if ((i & 511) === 0) bp = bq('bp', 2000 + 2600 * v, 0.6, sr);
      tho += 0.008 * ((rnd() * 2 - 1) - tho);
      const w = rnd() * 2 - 1, sot = rnd() < 22 * v / sr ? (rnd() * 2 - 1) * 5 : 0;
      a[i] = (lp(hp(bp(w))) * (0.55 + 6 * tho) + keo(w) * 0.12) * v + vuong(sot) * 0.5;
      if ((i & 4095) === 0) yield;
    }
  })());
  await chay(noiVong(buf, L, X)); await chay(chuanRms(buf, 0.1, L));
  return { buf, L };
}

// ================================================================ NHẠC — một bài liền, luôn chạy
// Ba tiếng đàn, cùng một mô hình dây rung. sang = độ sáng lúc gảy, beta = chỗ gảy (gần ngựa đàn → mũi, sáng),
// S = độ tối dần của dây, t60 = thời gian ngân (giây, ở nốt Rê4), tsume = tiếng "tách" của móng gảy ở đầu nốt.
const DAN = {
  koto: { sr: 32000, t60: 5.4, mu: 0.5, sang: 0.8, beta: 0.11, S: 0.3, tsume: 1,
    than: [['pk', 190, 1.1, 3], ['pk', 520, 1.4, 2], ['pk', 2600, 1.2, 3.5], ['lp', 9000, 0.7]], dai: (m) => (m < 60 ? 7 : 6) },
  hac: { sr: 24000, t60: 4.6, mu: 0.45, sang: 0.28, beta: 0.32, S: 0.45, tsume: 0,
    than: [['pk', 230, 1, 2], ['lp', 4300, 0.7]], dai: () => 5.5 },
  tram: { sr: 24000, t60: 8, mu: 0.3, sang: 0.5, beta: 0.17, S: 0.4, tsume: 0.35,
    than: [['pk', 105, 1, 4], ['pk', 360, 1.3, 2], ['lp', 3200, 0.7]], dai: () => 8 },
};
// cao độ luyến theo thời gian (nửa cung): oshi = bấm dây sau khi gảy cho cao lên, hiki = kéo dây cho trùng xuống,
// yuri = rung; "bat" = dây vừa bị móng gảy thì căng hơn một chút, cao lên vài cent rồi về trong ~50 ms
function caoDo(t, orn, bat) {
  const sig = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const rung = (t0, sau) => t < t0 ? 0 : Math.min(1, (t - t0) / 0.7) * sau * (1 - Math.cos(TAU * 5.2 * (t - t0))) / 2;
  const cang = bat * 0.1 * Math.exp(-t / 0.05);
  switch (orn) {
    case 'yuri': return cang + rung(0.45, 0.32);
    case 'oshi2': return cang + 2 * sig((t - 0.3) / 0.2) + rung(0.9, 0.2);
    case 'oshiHanashi': return cang + sig((t - 0.22) / 0.16) - sig((t - 0.72) / 0.18);
    case 'hiki': return cang - 0.55 * sig((t - 0.35) / 0.3);
    default: return cang;
  }
}
// Karplus-Strong hai mặt rung, dây trễ đọc phân số (Lagrange bậc 3) nên luyến được mượt
function* dayDan(a, sr, midi, orn, rnd, D) {
  const f0 = hz(midi), P0 = sr / f0;
  let size = 1; while (size < P0 * 1.3 + 8) size <<= 1;
  const mask = size - 1, d1 = new Float32Array(size), d2 = new Float32Array(size);
  const pLen = Math.round(P0), exc = new Float32Array(pLen);
  let lp = 0, tb = 0, pk = 0;
  for (let i = 0; i < pLen; i++) { lp += D.sang * ((rnd() * 2 - 1) - lp); exc[i] = lp; }
  const beta = Math.max(1, Math.round(pLen * D.beta));
  for (let i = pLen - 1; i >= beta; i--) exc[i] -= exc[i - beta];
  for (let i = 0; i < pLen; i++) tb += exc[i]; tb /= pLen;
  for (let i = 0; i < pLen; i++) { exc[i] -= tb; pk = Math.max(pk, Math.abs(exc[i])); }
  for (let i = 0; i < pLen; i++) exc[i] /= pk + 1e-9;
  // bù phần âm gốc bị bộ lọc trong vòng dây ăn mất mỗi chu kỳ → âm gốc ngân đúng t60 ở mọi cao độ (bản 2: đuôi dài hơn)
  // (nốt cao: bộ lọc ăn nhiều hơn mức cho phép → giảm độ lọc S vừa đủ, nếu không nốt La5 tắt trong ~1 s thay vì ~3 s)
  const T60 = D.t60 * Math.pow(293 / f0, D.mu), g = Math.pow(10, -3 / (T60 * f0)), w0 = TAU * f0 / sr;
  const c = (1 - g * g) / (2 * (1 - Math.cos(w0))) * 0.95, S = Math.min(D.S, c >= 0.25 ? 0.5 : (1 - Math.sqrt(1 - 4 * c)) / 2);
  const H0 = Math.hypot((1 - S) + S * Math.cos(w0), S * Math.sin(w0)), rho = Math.min(0.99999, g / H0);
  const doc = (d, w, Dl) => {
    const p = w - Dl, j = Math.floor(p), x = p - j;
    const xm = d[(j - 1) & mask], x0 = d[j & mask], x1 = d[(j + 1) & mask], x2 = d[(j + 2) & mask];
    return -x * (x - 1) * (x - 2) / 6 * xm + (x + 1) * (x - 1) * (x - 2) / 2 * x0 - (x + 1) * x * (x - 2) / 2 * x1 + (x + 1) * x * (x - 1) / 6 * x2;
  };
  let w = 0, za = 0, zb = 0;
  for (let i = 0; i < a.length; i++) {
    const P = sr / (f0 * Math.pow(2, caoDo(i / sr, orn, D.tsume) / 12));
    const ya = doc(d1, w, P - S), yb = doc(d2, w, P * 1.0009 - S);
    const fa = (1 - S) * ya + S * za, fb = (1 - S) * yb + S * zb; za = ya; zb = yb;
    const e = i < pLen ? exc[i] : 0;
    const oa = e + rho * fa, ob = 0.6 * e + rho * 0.9992 * fb;
    d1[w & mask] = oa; d2[w & mask] = ob; w++;
    a[i] = 0.75 * oa + 0.25 * ob;
    if ((i & 2047) === 0) yield;
  }
  // thân đàn + tiếng móng gảy: một nhát "tách" rất ngắn (dải 3,4 kHz tắt trong ~4 ms, kèm một cú chạm ~1 ms)
  const loc = D.than.map(([l, f, q, g]) => (l === 'lp' ? bq('lp', f, q, sr) : bq('pk', f, q, sr, g)));
  const bpT = bq('bp', 3400, 1.3, sr), hpT = bq('hp', 5000, 0.7, sr), nT = Math.floor(sr * 0.015), n1 = Math.floor(sr * 0.0008);
  for (let i = 0; i < a.length; i++) {
    let x = a[i]; for (const f of loc) x = f(x);
    if (D.tsume && i < nT) x += D.tsume * (bpT(rnd() * 2 - 1) * 0.55 * Math.exp(-i / sr / 0.0035) + (i < n1 ? hpT(rnd() * 2 - 1) * 0.6 : 0));
    a[i] = x;
    if ((i & 4095) === 0) yield;
  }
  const nf = Math.floor(sr * 0.5); for (let i = 0; i < nf; i++) a[a.length - 1 - i] *= i / nf;
}
// Bài: vòng 8 hợp âm × 2 ô nhịp × 4 phách (≈ 66 s một vòng ở nhịp 58). tram = nốt đàn trầm; ost = 8 nốt hạc rải
// (tính theo số MIDI, Rê4 = 62). Rê – Rê – Si♭ – Sol – Rê – La – Si♭ – La (màu tối có Mi♭) rồi về Rê.
const NHIP = 58, PHACH = 60 / NHIP;
const VONG = [
  { tram: 50, ost: [62, 69, 70, 69, 74, 69, 70, 69] },
  { tram: 50, ost: [62, 69, 74, 69, 75, 74, 69, 67] },
  { tram: 46, ost: [58, 62, 69, 62, 70, 62, 69, 62] },
  { tram: 43, ost: [55, 62, 67, 70, 67, 62, 70, 67] },
  { tram: 50, ost: [62, 69, 70, 69, 74, 69, 70, 69] },
  { tram: 45, ost: [57, 62, 67, 69, 67, 62, 69, 67] },
  { tram: 46, ost: [58, 62, 69, 62, 70, 69, 62, 58] },
  { tram: 45, ost: [57, 63, 67, 69, 67, 63, 62, 57] },
];
const HOP_CHUYEN = [62, 69, 74, 81];   // chuỗi nốt hạc rải lên khi sang chương mới
// câu koto: mỗi 4 ô nhịp một câu (A trên Rê, B trên Si♭–Sol, C trên Rê–La, D trên Si♭–La). [phách, nốt từ Rê4, độ mạnh, luyến]
const BAI = [
  [[0, 12, 0.55], [1, 8, 0.5], [1.5, 7, 0.6, 'yuri'], [4, 5, 0.5, 'oshi2'], [5.5, 0, 0.6, 'yuri']],
  [[0, 13, 0.5], [0.5, 12, 0.45], [1.5, 8, 0.55, 'oshiHanashi'], [3, 7, 0.5], [3.5, 5, 0.45], [4.5, 7, 0.55, 'yuri']],
  [[0, -12, 0.32], [0.03, 0, 0.45], [2, 5, 0.45], [2.5, 7, 0.5], [3, 8, 0.55, 'hiki'], [4.5, 7, 0.5, 'yuri'], [6.5, 1, 0.45], [7, 0, 0.55, 'yuri']],
  [[0, -5, 0.45], [0.5, -4, 0.42], [1.5, -7, 0.42, 'yuri'], [3.5, -12, 0.34]],   // nốt koto thấp nhẹ tay: trùng nốt đàn trầm thì dễ vọt đỉnh
];
// mỗi chương đổi rất nhẹ: goc = nốt gốc (nửa cung), ost = độ dày nốt hạc (1 mọi phách, 0,75, 0,5 = phách 1 và 3),
// them = hay chen nốt móc, giai = khả năng câu koto vang lên, tram = độ to đàn trầm
const NHAC = [
  { goc: 0, ost: 1, ostV: 0.3, tram: 0.5, giai: 1, them: 0.2 },          // ban ngày
  { goc: 0, ost: 0.5, ostV: 0.34, tram: 0.5, giai: 0.8, them: 0.08 },    // ruộng đêm: thưa hơn
  { goc: -2, ost: 0.5, ostV: 0.29, tram: 0.5, giai: 0.75, them: 0 },      // mỏ đá: hạ một cung, trầm, thưa
  { goc: 2, ost: 0.75, ostV: 0.31, tram: 0.46, giai: 0.85, them: 0.12 }, // rừng: lên một cung
  { goc: 0, ost: 1, ostV: 0.3, tram: 0.5, giai: 1, them: 0.25 },         // làng giấy: về Rê, đầy lại
  { goc: 0, ost: 1, ostV: 0.3, tram: 0.5, giai: 1, them: 0.25 },         // 仕事: như làng giấy (y như trước phần 9)
  { goc: 0, ost: 0.75, ostV: 0.3, tram: 0.5, giai: 0.9, them: 0.1 },     // 連絡: về lại toà thành — Rê, thưa bớt, lặng hơn
];
async function taoBo(loai, ds, seed) {
  const D = DAN[loai], rnd = taoRnd(seed), out = new Map();
  for (const [m, orn] of ds) out.set(m + '|' + (orn || ''), await motTieng(D.sr, D.dai(m), (a, sr) => dayDan(a, sr, m, orn, rnd, D), 0.5));
  return out;
}
const dsKoto = () => { const s = new Map(); for (const c of BAI) for (const [, n, , orn] of c) s.set(62 + n + '|' + (orn || ''), [62 + n, orn]); return [...s.values()]; };
const dsHac = () => { const s = new Set(HOP_CHUYEN); for (const v of VONG) for (const m of v.ost) s.add(m); return [...s].sort((x, y) => x - y).map((m) => [m]); };
const dsTram = () => [...new Set(VONG.map((v) => v.tram))].map((m) => [m]);


// ================================================================ NƠI CHỐN (điểm xuyết, nhỏ và thưa)
// chuan: bù độ to của cả nơi (dB, áp cho cả lớp liền lẫn tiếng lẻ) để nơi nào cũng thấp hơn nhạc ~7–8 LU — đo 29/9; lop: lớp liền (chỉ nước và "không gian" rất trầm)
// → [dB, lọc thấp]; su: tiếng lẻ → khoảng cách trung bình (giây); vang: tiếng vang của nơi đó
const CANH = {
  ngay:     { chuan: -1, lop: {}, su: { chim: 8, tobi: 24 }, vang: { t60: 2.2, lp: 4200 }, vong: 0 },
  hoanghon: { chuan: -1.7, lop: {}, su: { deGan: 7 }, vang: { t60: 2.8, lp: 4200 }, vong: 0 },
  ruong:    { chuan: -3.2, lop: { nuocA: [-6, 3200] }, su: { ech: 10, deGan: 16 }, vang: { t60: 2.6, lp: 5000 }, vong: 0 },
  da:       { chuan: 7.6, lop: { khong: [-19, 450] }, su: { giot: 0, nem: 14 }, vang: { t60: 5.0, lp: 3400 }, vong: 1 },
  rung:     { chuan: 5.8, lop: { khong: [-22, 420] }, su: { cu: 12, keo: 14 }, vang: { t60: 2.4, lp: 5000 }, vong: 0 },
  lang:     { chuan: -1.6, lop: { muong: [-7, 3000] }, su: { furin: 9 }, vang: { t60: 1.5, lp: 5000 }, vong: 0 },
  // 連絡: ĐÚNG MỘT tiếng nơi chốn — vồ gỗ đóng cọc ở xa, một loạt 2–4 nhát, trung bình 14 s một loạt; đồi dội lại nhẹ
  lienhe:   { chuan: 14, lop: {}, su: { vo: 14 }, vang: { t60: 2.6, lp: 4400 }, vong: 0.55 },
};
// (chương 5 仕事 dùng lại nơi chốn làng giấy — y như trước phần 9)
const TEN_CANH = ['ngay', 'ruong', 'da', 'rung', 'lang', 'lang', 'lienhe'];
const CUOI = TEN_CANH.length - 1;
const LOP = { // rong = độ rộng hai kênh, pan = lệch trái/phải, hp = cắt trầm (Hz)
  nuocA: { rong: 0.35, pan: -0.3, hp: 170 }, muong: { rong: 0.45, pan: -0.25, hp: 130 }, khong: { rong: 1, pan: 0, hp: 50 },
};
const CHUYEN = [null, 'muc', null, null, 'cua', null, null];   // điểm xuyết đi kèm nốt đàn khi sang chương 1..6

const CONG = {
  hac: () => taoBo('hac', dsHac(), 83), tram: () => taoBo('tram', dsTram(), 87), koto: () => taoBo('koto', dsKoto(), 89),
  nuocA: () => taoNuoc(41, 17, { lam: 100, rMin: 1.4, rMax: 7, nen: 0.04, f: 1000 }),
  muong: () => taoNuoc(47, 18, { lam: 34, rMin: 2.5, rMax: 10, nen: 0.12, f: 520, xi: 0.08 }),
  khong: taoKhong,
  tobi: async () => { const r = taoRnd(101); return [await motTieng(32000, 2.3, (a, sr) => chimTobi(a, sr, r)), await motTieng(32000, 2.3, (a, sr) => chimTobi(a, sr, r))]; },
  chim: async () => { const r = taoRnd(103), o = []; for (const k of [0, 0, 1, 1]) o.push(await motTieng(32000, 1.4, (a, sr) => chimNho(a, sr, r, k))); return o; },
  chuong: () => { const r = taoRnd(107); return motTieng(24000, 20, (a, sr) => chuongChua(a, sr, r)); },
  deGan: async () => { const r = taoRnd(109), o = []; for (let v = 0; v < 4; v++) { const c = motDe(r); o.push(await motTieng(24000, 4.5, (a, sr) => hatDe(a, sr, r, c))); } return o; },
  ech: async () => {
    const r = taoRnd(113), o = [];
    for (const k of [0.9, 1, 1.12]) o.push(await motTieng(24000, 2.2, (a, sr) => echCay(a, sr, r, k)));
    for (const k of [0.92, 1.08]) o.push(await motTieng(24000, 1.4, (a, sr) => echRung(a, sr, r, k)));
    return o;
  },
  giot: async () => { const r = taoRnd(127), o = []; for (const f of [1150, 1400, 1700, 2100]) o.push(await motTieng(32000, 0.3, (a, sr) => giotNuoc(a, sr, r, f))); return o; },
  nem: async () => { const r = taoRnd(131), o = []; for (const k of [1, 1.02, 1.045, 1.07]) o.push(await motTieng(32000, 0.7, (a, sr) => nemDa(a, sr, r, k))); return o; },
  keo: async () => { const r = taoRnd(137), o = []; for (const t of [1, 1, 1, 0]) o.push(await motTieng(24000, t ? 2 : 0.8, (a, sr) => keoCay(a, sr, r, t))); return o; },
  cu: async () => { const r = taoRnd(139); return [await motTieng(24000, 2.4, (a, sr) => cuMeo(a, sr, r, 0.96)), await motTieng(24000, 2.4, (a, sr) => cuMeo(a, sr, r, 1.04))]; },
  furin: async () => { const r = taoRnd(149), o = []; for (const k of [1, 1.06, 0.95, 1.12]) o.push(await motTieng(32000, 2.6, (a, sr) => phongLinh(a, sr, r, k))); return o; },
  muc: () => { const r = taoRnd(151); return motTieng(24000, 3.2, (a, sr) => mucTham(a, sr, r)); },
  cua: () => { const r = taoRnd(163); return motTieng(32000, 1.3, (a, sr) => cuaLua(a, sr, r)); },
  vo: async () => { const r = taoRnd(167), o = []; for (const k of [1, 1.025, 1.05, 1.08]) o.push(await motTieng(32000, 0.6, (a, sr) => voCoc(a, sr, r, k))); return o; },
  net: taoNet,
};
const CAN_CANH = {
  ngay: ['tobi', 'chim'], hoanghon: ['chuong', 'deGan'], ruong: ['nuocA', 'ech', 'deGan'],
  da: ['khong', 'giot', 'nem'], rung: ['khong', 'cu', 'keo'], lang: ['muong', 'furin'], lienhe: ['vo'],
};


// ================================================================ TIẾNG VANG
// đáp ứng ngắn 0,22 s (nhiễu tắt dần, hai kênh khác nhau) — làm dày phần đầu, gán chỉ tốn ~1 ms
function irSom(ctx, giay) {
  const sr = ctx.sampleRate, n = Math.floor(sr * giay), b = ctx.createBuffer(2, n, sr), rnd = taoRnd(99);
  let e = 0;
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = 0; i < n; i++) { const t = i / sr; lp += 0.5 * ((rnd() * 2 - 1) - lp); d[i] = t < 0.006 ? 0 : lp * Math.exp(-t / (giay / 4.5)); e += d[i] * d[i]; }
  }
  const k = 1 / Math.sqrt(e / 2);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] *= k; }
  return b;
}
// mạng trễ phản hồi 16 đường, ma trận Householder, lọc thấp trong vòng (đuôi tối dần), hai đường được lắc nhẹ cho khỏi "kim loại"
function taoVang(ctx, { t60 = 2.5, lp = 5000, co = 1, som = 0.6, duoi = 0.5 } = {}) {
  const vao = ctx.createGain(), ra = ctx.createGain();
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 170; hp.Q.value = qdB(0.6);
  const cv = ctx.createConvolver(); cv.normalize = false; cv.buffer = irSom(ctx, 0.22);
  vao.connect(hp).connect(cv);
  const gs = ctx.createGain(); gs.gain.value = som; cv.connect(gs).connect(ra);
  const tach = ctx.createChannelSplitter(2); cv.connect(tach);
  const MS = [0.0313, 0.0359, 0.0397, 0.0431, 0.0473, 0.0511, 0.0557, 0.0593, 0.0631, 0.0679, 0.0713, 0.0757, 0.0799, 0.0841, 0.0893, 0.0971];
  const S = ctx.createGain(); S.gain.value = -2 / MS.length;
  const tron = ctx.createChannelMerger(2);
  const dong = MS.map((m, i) => {
    const vd = ctx.createGain(), d = ctx.createDelay(0.3), f = ctx.createBiquadFilter(), g = ctx.createGain();
    d.delayTime.value = m * co; f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = qdB(0.5);   // không có đỉnh: vòng phản hồi không bao giờ > 1
    g.gain.value = Math.min(0.98, Math.pow(10, -3 * m * co / t60));
    vd.connect(d); d.connect(f); f.connect(g); g.connect(vd); g.connect(S); S.connect(vd);
    const vin = ctx.createGain(); vin.gain.value = 0.36; tach.connect(vin, i % 2); vin.connect(vd);
    const dau = ctx.createGain(); dau.gain.value = (i & 2) ? -1 : 1; g.connect(dau).connect(tron, 0, i % 2);
    return { d, f, g, m: m * co };
  });
  for (const [hzL, idx, sau] of [[0.31, [1, 4, 9, 14], 0.0005], [0.47, [2, 6, 11, 13], -0.0004]]) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = hzL; g.gain.value = sau;
    o.connect(g); for (const i of idx) g.connect(dong[i].d.delayTime); o.start();
  }
  const gd = ctx.createGain(); gd.gain.value = duoi * 0.7; tron.connect(gd).connect(ra);
  return {
    vao, ra,
    dat({ t60: T, lp: L }, tau = 0.8) {
      const now = ctx.currentTime;
      for (const x of dong) { x.g.gain.setTargetAtTime(Math.min(0.98, Math.pow(10, -3 * x.m / T)), now, tau); x.f.frequency.setTargetAtTime(L, now, tau); }
    },
  };
}
// tiếng vọng hẻm đá: hai lần dội từ hai vách (0,43 s trái, 0,71 s phải), mỗi lần tối và nhỏ đi
function taoVong(ctx) {
  const vao = ctx.createGain(), ra = ctx.createGain();
  for (const [t, fb, lp, pan] of [[0.43, 0.34, 2400, -0.55], [0.71, 0.28, 1900, 0.5]]) {
    const d = ctx.createDelay(1.5), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
    d.delayTime.value = t; f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = qdB(0.5); g.gain.value = fb; p.pan.value = pan;
    vao.connect(d); d.connect(f); f.connect(g); g.connect(d); f.connect(p).connect(ra);
  }
  return { vao, ra };
}

// mức "bù độ to" mà bộ nén của trình duyệt tự cộng vào: dựng thử 0,5 s một tiếng rất nhỏ qua bộ nén cùng thông số rồi đo
const NGUONG = -5;
async function doBu() {
  const sr = 8000, off = new OfflineAudioContext(1, sr / 2, sr), o = off.createOscillator(), g = off.createGain(), c = off.createDynamicsCompressor();
  o.frequency.value = 200; g.gain.value = 0.01; c.threshold.value = NGUONG; c.knee.value = 0; c.ratio.value = 20; c.attack.value = 0.001; c.release.value = 0.15;
  o.connect(g).connect(c).connect(off.destination); o.start();
  const d = (await off.startRendering()).getChannelData(0);
  let q = 0; for (let i = d.length / 2; i < d.length; i++) q += d[i] * d[i];
  const rms = Math.sqrt(q / (d.length / 2));
  return rms > 0 ? 20 * Math.log10(rms / (0.01 / Math.SQRT2)) : null;
}
// chỉ để thử: đo đáp ứng xung của tiếng vang, cao độ dây đàn
export const _thu = { taoVang, taoVong, dayDan, DAN, hz, taoRnd, doBu };

// ================================================================ BỘ ÂM THANH
export function taoAmThanh() {
  let ctx = null, on = false, sanSang = false, giaiSan = null;
  const huaSan = new Promise((r) => { giaiSan = r; });
  let tong, han, sauHan, busNen, busNhac, busChuyen, tatNen, tatNhac, tatChuyen, vangNen, vangNhac, vongDa, guiVong;
  let chuong = 0, canh = 'ngay', daDoi = false, timer = 0, henLat = 0;
  const taiSan = {}, hang = [], lop = {}, nhatKy = [];
  let hen = {}, giot = [], lanChuong = -1e9;
  const nhatKySu = [];   // để kiểm: [giờ âm thanh, nơi, tiếng lẻ] — tối đa 300 dòng
  // nhạc: đếm phách từ lúc bật; bài chạy liền, không bao giờ bắt đầu lại
  // (xếp lịch trước 1 s: trang 3D có lúc đứng hình vài trăm ms, nhạc vẫn không hụt nhịp; phachBo đếm số phách bị bỏ để kiểm)
  let phachSo = 0, phachToi = 0, chuongNhac = 0, cau = null, cauBd = 0, phachBo = 0;
  // nét cọ (mặc định tắt, xem MUC.net)
  let net = null, netBat = false, netThem = 0;

  // ---------- hàng dựng: nhạc trước, rồi tiếng của nơi đang đứng, phần còn lại dựng dần ----------
  function can(ten, uu = 0) {
    let a = taiSan[ten];
    if (!a) {
      a = taiSan[ten] = { ten, uu, xong: false, gia: null };
      a.hua = new Promise((r) => { a.giai = r; });
      hang.push(a); bomHang();
    } else if (uu > a.uu) a.uu = uu;
    return a.hua;
  }
  let dangBom = false;
  async function bomHang() {
    if (dangBom) return; dangBom = true;
    while (hang.length) {
      hang.sort((x, y) => y.uu - x.uu);
      const a = hang.shift();
      const t0 = performance.now(); thongKe.dang = a.ten;
      try { a.gia = await CONG[a.ten](); } catch (e) { console.warn('[am-thanh] không dựng được', a.ten, e); }
      nhatKy.push([a.ten, +t0.toFixed(0), +(performance.now() - t0).toFixed(0)]);
      a.xong = true; a.giai(a.gia);
    }
    dangBom = false;
  }
  const co = (ten) => taiSan[ten] && taiSan[ten].xong && taiSan[ten].gia;
  const chon = (ten) => { const g = co(ten); return Array.isArray(g) ? g[(Math.random() * g.length) | 0] : g; };

  // ---------- đồ thị ----------
  function dung(san) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = san || new AC({ latencyHint: 'playback' });   // san: AudioContext trang đã mở sẵn trong cú bấm (trước khi mã này tải xong)
    tong = ctx.createGain(); tong.gain.value = 0;
    // giữ đỉnh dưới ~−4 dB: bộ nén (ngưỡng −5 dB, 20:1, nhìn trước 6 ms). Bộ nén của trình duyệt tự cộng thêm một mức "bù độ to"
    // cho mọi thứ; sauHan trừ đúng mức ấy (đo một lần lúc khởi động) → dưới ngưỡng thì không đổi gì cả
    han = ctx.createDynamicsCompressor(); han.threshold.value = NGUONG; han.knee.value = 0; han.ratio.value = 20; han.attack.value = 0.001; han.release.value = 0.15;
    sauHan = ctx.createGain(); sauHan.gain.value = dB(-(-NGUONG + NGUONG / 20) * 0.6);
    doBu().then((bu) => { if (bu !== null) sauHan.gain.value = dB(-bu); }).catch(() => {});
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 28; hp.Q.value = qdB(0.6);
    busNen = ctx.createGain(); busNen.gain.value = dB(MUC.nen);
    busNhac = ctx.createGain(); busNhac.gain.value = dB(MUC.nhac);
    busChuyen = ctx.createGain(); busChuyen.gain.value = dB(MUC.chuyen);
    tatNen = ctx.createGain(); tatNhac = ctx.createGain(); tatChuyen = ctx.createGain();
    busNen.connect(tatNen).connect(hp); busNhac.connect(tatNhac).connect(hp); busChuyen.connect(tatChuyen).connect(hp);
    hp.connect(tong).connect(han).connect(sauHan).connect(ctx.destination);
    document.addEventListener('visibilitychange', khiAn);
  }
  async function dungVang() {
    await nhuong();
    vangNen = taoVang(ctx, { t60: 2.4, lp: 4500, som: 0.55, duoi: 0.45 }); vangNen.ra.connect(busNen);
    await nhuong();
    vangNhac = taoVang(ctx, { t60: 4.3, lp: 5200, co: 1.25, som: 0.5, duoi: 0.55 }); vangNhac.ra.connect(busNhac);
    await nhuong();
    vongDa = taoVong(ctx); guiVong = ctx.createGain(); guiVong.gain.value = 0;
    guiVong.connect(vongDa.vao); vongDa.ra.connect(busNen); const vv = ctx.createGain(); vv.gain.value = 0.35; vongDa.ra.connect(vv).connect(vangNen.vao);
  }

  // ---------- lớp liền (nước, "không gian") ----------
  function lopNode(ten) {
    if (lop[ten]) return lop[ten];
    const L = { g: ctx.createGain(), lp: ctx.createBiquadFilter(), hp: ctx.createBiquadFilter(), troi: ctx.createGain(), ben: [], dang: false, hen: 0 };
    L.g.gain.value = 0; L.lp.type = 'lowpass'; L.lp.frequency.value = 12000; L.lp.Q.value = qdB(0.6);
    L.hp.type = 'highpass'; L.hp.frequency.value = LOP[ten].hp; L.hp.Q.value = qdB(0.7);
    L.lp.connect(L.hp).connect(L.troi).connect(L.g).connect(busNen);
    return (lop[ten] = L);
  }
  // Mỗi bên (trái/phải) của một lớp là một "giọng" đọc đoạn lặp; cứ 7–14 s nhảy sang một chỗ ngẫu nhiên khác của
  // đoạn lặp, tan chéo 3 s, mỗi bên một tốc độ hơi khác (±1,5%) → thứ tự không bao giờ lặp lại (đo ở bản 1).
  const VAO = new Float32Array(33).map((_, i) => Math.sin(i / 32 * Math.PI / 2)), RA = VAO.slice().reverse();
  function giongMoi(ben, a, xf) {
    const now = ctx.currentTime, s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = a.buf; s.loop = true; s.loopStart = 0; s.loopEnd = a.L; s.playbackRate.value = ngau(0.985, 1.015);
    s.connect(g).connect(ben.p);
    if (xf > 0) g.gain.setValueCurveAtTime(VAO, now, xf); else g.gain.value = 1;
    s.start(now, Math.random() * a.L);
    const cu = ben.v;
    if (cu && xf > 0) { cu.g.gain.setValueCurveAtTime(RA, now, xf); cu.s.stop(now + xf + 0.05); }
    ben.v = { s, g }; ben.hen = now + xf + ngau(7, 14);
  }
  function batLop(ten) {
    const L = lopNode(ten); if (L.dang) return;
    const a = co(ten); if (!a) return;
    const cfg = LOP[ten], pans = cfg.rong > 0 ? [cfg.pan - cfg.rong, cfg.pan + cfg.rong] : [cfg.pan];
    L.ben = pans.map((pan) => { const p = ctx.createStereoPanner(); p.pan.value = kep(pan, -1, 1); p.connect(L.lp); const ben = { p, v: null, hen: 0 }; giongMoi(ben, a, 0); return ben; });
    L.dang = true;
  }
  function tatLop(ten) {
    const L = lop[ten]; if (!L || !L.dang) return;
    for (const ben of L.ben) { try { ben.v.s.stop(); } catch (e) { /* đã dừng */ } ben.p.disconnect(); }
    L.ben = []; L.dang = false;
  }
  function apLop(ten, tg) {
    const C = CANH[canh], muc = C.lop[ten], L = lopNode(ten), t = ctx.currentTime;
    L.hen++;
    const v0 = L.g.gain.value, P = L.g.gain;
    P.cancelScheduledValues(t); P.setValueAtTime(v0, t);
    // lên chậm lúc đầu (gần bình phương, ghép ba đoạn thẳng) để tiếng "hiện dần"; xuống thì đều
    const toi = (v1) => { if (v1 > v0) { P.linearRampToValueAtTime(v0 + (v1 - v0) * 0.2, t + tg * 0.45); P.linearRampToValueAtTime(v0 + (v1 - v0) * 0.56, t + tg * 0.75); } P.linearRampToValueAtTime(v1, t + tg); };
    if (muc && co(ten)) {
      batLop(ten);
      toi(dB(muc[0] + C.chuan));
      L.lp.frequency.setTargetAtTime(muc[1], t, tg / 3);
    } else {
      toi(0);
      const h = L.hen; setTimeout(() => { if (L.hen === h) tatLop(ten); }, (tg + 0.4) * 1000);
    }
  }
  function doiCanh(ten, tg) {
    const cu = canh; canh = ten; daDoi = true;
    for (const k of CAN_CANH[ten]) can(k, 4);
    for (const k of Object.keys(LOP)) {
      if (CANH[ten].lop[k]) can(k, 4).then(() => { if (CANH[canh].lop[k]) apLop(k, Math.max(0.8, tg)); });
      else if (lop[k] && lop[k].dang) apLop(k, tg);
    }
    if (vangNen) vangNen.dat(CANH[ten].vang, tg / 3);
    if (guiVong) guiVong.gain.setTargetAtTime(CANH[ten].vong, ctx.currentTime, tg / 3);
    if (cu !== ten) { hen = {}; giot = []; }
    if (ten === 'hoanghon' && ctx.currentTime - lanChuong > 40) {
      lanChuong = ctx.currentTime;
      can('chuong', 5).then(() => { if (on) { suChuong(ctx.currentTime + 1.4); nhatKySu.push([+(ctx.currentTime + 1.4).toFixed(2), canh, 'chuong']); } });
    }
  }

  // ---------- phát một tiếng đã dựng ----------
  function phat(buf, t, { g = 1, pan = 0, rate = 1, vang = 0.2, vong = 0, kho = 1, bus = busNen, lp = 0, panToi = null, vangBus = null } = {}) {
    if (!buf) return null;
    if (bus === busNen) g *= dB(CANH[canh].chuan);
    const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    let n = s;
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = qdB(0.7); n.connect(f); n = f; }
    const ga = ctx.createGain(); ga.gain.value = g; n.connect(ga);
    const p = ctx.createStereoPanner(); p.pan.value = pan; ga.connect(p);
    if (panToi !== null) { p.pan.setValueAtTime(pan, t); p.pan.linearRampToValueAtTime(panToi, t + buf.duration / rate); }
    if (kho) { if (kho === 1) p.connect(bus); else { const k = ctx.createGain(); k.gain.value = kho; p.connect(k).connect(bus); } }
    const vb = vangBus || vangNen;
    if (vang && vb) { const v = ctx.createGain(); v.gain.value = vang; p.connect(v).connect(vb.vao); }
    if (vong && guiVong) { const v = ctx.createGain(); v.gain.value = vong; p.connect(v).connect(guiVong); }
    s.start(t);
    return s;
  }

  // ---------- tiếng nơi chốn: nhỏ, thưa ----------
  function suChuong(t) { phat(co('chuong'), t, { g: dB(-2), pan: 0.3, vang: 1.1, kho: 0.45 }); }
  const SU = {
    tobi: (t) => phat(chon('tobi'), t, { g: dB(ngau(-15, -10)), pan: ngau(-0.7, 0.7), rate: ngau(0.97, 1.03), vang: 0.8, kho: 0.45, lp: 3600 }),
    chim: (t) => phat(chon('chim'), t, { g: dB(ngau(-18, -12)), pan: ngau(-0.85, 0.85), rate: ngau(0.95, 1.05), vang: 0.55, kho: 0.55, lp: 6500 }),
    deGan: (t) => phat(chon('deGan'), t, { g: dB(ngau(-22, -15)), pan: ngau(-0.9, 0.9), rate: ngau(0.985, 1.015), vang: 0.35, lp: 5200 }),
    ech: (t) => phat(chon('ech'), t, { g: dB(ngau(-14, -7)), pan: ngau(-0.85, 0.85), rate: ngau(0.95, 1.05), vang: 0.35, lp: ngau(3500, 7000) }),
    nem: (t) => {
      const b = co('nem'); if (!b) return;
      const so = 2 + ((Math.random() * 2) | 0), pan = ngau(-0.2, 0.5), g = ngau(-15, -10);
      let tt = t; for (let i = 0; i < so; i++) { phat(b[Math.min(b.length - 1, i)], tt, { g: dB(g - i * 0.5), pan, vang: 0.55, vong: 0.9, kho: 0.4, lp: 5200 }); tt += ngau(0.82, 1.1); }
    },
    keo: (t) => phat(chon('keo'), t, { g: dB(ngau(-17, -11)), pan: ngau(-0.8, 0.8), rate: ngau(0.9, 1.1), vang: 0.45, kho: 0.7, lp: 1900 }),   // lọc bớt dải cao: nghe như gỗ rên xa, không thành tiếng "lạch cạch"
    cu: (t) => phat(chon('cu'), t, { g: dB(ngau(-12, -8)), pan: ngau(-0.6, 0.6), vang: 1.0, kho: 0.35 }),
    // một người đóng cọc: 2–4 nhát cách nhau ~1 s (nhấc vồ, nện), cọc lún dần nên tiếng cao dần; tiếng dội từ đồi bên (vong)
    vo: (t) => {
      const b = co('vo'); if (!b) return;
      const so = 2 + ((Math.random() * 3) | 0), pan = ngau(-0.55, 0.15), g = ngau(-13, -9);
      let tt = t; for (let i = 0; i < so; i++) { phat(b[Math.min(b.length - 1, i)], tt, { g: dB(g - i * 0.4), pan, rate: ngau(0.985, 1.015), vang: 0.6, vong: 0.7, kho: 0.5, lp: 3600 }); tt += ngau(0.92, 1.18); }
    },
    furin: (t) => {
      const b = co('furin'); if (!b) return;
      const nha = Math.random() < 0.7 ? 0 : 1, pan = nha ? 0.45 : -0.35, so = 1 + ((Math.random() * 3) | 0);
      let tt = t; for (let i = 0; i < so; i++) { phat(b[nha * 2 + ((Math.random() * 2) | 0)], tt, { g: dB(ngau(-17, -11) - i * 2), pan, rate: ngau(0.995, 1.005), vang: 0.4 }); tt += ngau(0.25, 0.9); }
    },
  };
  function lichSu(now) {
    const C = CANH[canh];
    for (const k of Object.keys(C.su)) {
      if (k === 'giot' || !co(k)) continue;
      const moi = C.su[k];
      if (hen[k] == null) hen[k] = now + ngau(1.5, Math.min(7, moi * 0.6));
      while (hen[k] < now + 1.0) {
        if (hen[k] > now - 0.2) { SU[k](Math.max(hen[k], now + 0.02)); if (nhatKySu.length < 300) nhatKySu.push([+hen[k].toFixed(2), canh, k]); }
        hen[k] += Math.max(moi * 0.4, moi * (0.45 - Math.log(1 - Math.random()) * 0.55));
      }
    }
    // giọt nước trong hẻm: hai chỗ nhỏ giọt, mỗi chỗ một nhịp gần đều và một cao độ riêng, vọng lại từ vách
    if ('giot' in C.su && co('giot')) {
      if (!giot.length) giot = [{ ky: 3.1, pan: -0.45, k: 0, t: now + 0.8 }, { ky: 4.7, pan: 0.45, k: 2, t: now + 2.3 }];
      const b = co('giot');
      for (const s of giot) while (s.t < now + 1.0) {
        if (s.t > now - 0.2 && nhatKySu.length < 300) nhatKySu.push([+s.t.toFixed(2), canh, 'giot']);
        if (s.t > now - 0.2) phat(b[Math.min(3, s.k + (Math.random() < 0.25 ? 1 : 0))], Math.max(s.t, now + 0.02), { g: dB(ngau(-16, -11)), pan: s.pan, rate: ngau(0.97, 1.03), vang: 0.5, vong: 0.8, kho: 0.8 });
        s.t += s.ky * ngau(0.85, 1.15);
      }
    }
  }

  // ---------- nhạc: một bài liền ----------
  function notNhac(bo, midi, orn, t, g, rate, pan, gui, bus = busNhac) {
    const buf = bo && bo.get(midi + '|' + (orn || ''));
    if (buf) phat(buf, t, { g, pan, rate, vang: gui, bus, vangBus: vangNhac });
  }
  function choiPhach(k, t) {
    const cfg = NHAC[chuongNhac], rate = Math.pow(2, cfg.goc / 12);
    const o = Math.floor(k / 4), p = k % 4, v = VONG[Math.floor(o / 2) % VONG.length], idx = (o % 2) * 4 + p;
    const hac = co('hac'), tram = co('tram'), koto = co('koto'), lech = () => ngau(-0.012, 0.012);
    // đàn trầm: nốt gốc đầu mỗi hợp âm, ngân qua hai ô nhịp
    if (p === 0 && o % 2 === 0) notNhac(tram, v.tram, '', t, cfg.tram * ngau(0.92, 1.04), rate, 0, 0.3);
    // hạc: nốt rải đều; chương thưa thì chỉ phách 1 và 3
    const choi = cfg.ost >= 1 || (cfg.ost >= 0.75 ? p !== 3 || Math.random() < 0.35 : p % 2 === 0);
    if (choi) notNhac(hac, v.ost[idx], '', t + lech(), cfg.ostV * (p === 0 ? 1 : 0.78) * ngau(0.88, 1.06), rate, idx % 2 ? 0.25 : -0.25, 0.5);
    if (Math.random() < cfg.them) notNhac(hac, v.ost[(idx + 1) % 8], '', t + PHACH / 2 + lech(), cfg.ostV * 0.55, rate, 0.05, 0.5);
    // koto: mỗi 4 ô nhịp một câu (có chương bỏ bớt câu cho thưa)
    if (p === 0 && o % 4 === 0) { cau = koto && Math.random() < cfg.giai ? BAI[(o / 4) % BAI.length] : null; cauBd = k; }
    if (cau && koto) for (const [b, n, vv, orn] of cau) {
      const r = b - (k - cauBd);
      if (r >= 0 && r < 1) notNhac(koto, 62 + n, orn || '', t + r * PHACH + lech(), vv * ngau(0.9, 1.05), rate, 0.15, 0.45);
    }
  }
  function lichNhac(now) {
    if (!co('hac') || !co('tram')) return;
    if (!phachToi) phachToi = now + 0.25;
    if (phachToi < now - 0.1) { const bo = Math.ceil((now - phachToi) / PHACH); phachToi += bo * PHACH; phachSo += bo; phachBo += bo; }   // máy đứng quá lâu: bỏ qua, không dồn nốt
    while (phachToi < now + 1.0) { choiPhach(phachSo, phachToi); phachSo++; phachToi += PHACH; }
  }
  // chuyển cảnh = cử chỉ nhạc: nốt trầm ngân + bốn nốt hạc rải lên (đi lùi thì rải xuống), theo nốt gốc của chương mới,
  // rơi vào nửa phách kế tiếp; sang ruộng có thêm hơi mực thấm, sang làng có tiếng cửa lùa chạm khung đúng lúc nốt đàn
  const lanChuyen = {};
  function phatChuyen(i, toi = i, nguoc = false) {
    if (!ctx || !on) return;
    const bay = performance.now(); if (bay - (lanChuyen[i] || -1e9) < 1500) return; lanChuyen[i] = bay;
    const hac = co('hac'), tram = co('tram'); if (!hac || !tram) return;
    const ten = CHUYEN[i], diem = ten && co(ten), now = ctx.currentTime, rate = Math.pow(2, NHAC[kep(toi, 0, CUOI)].goc / 12);
    const som = diem && ten === 'cua' ? CUA_COC + 0.02 : 0.06;
    let t = phachToi ? phachToi - PHACH : now; while (t < now + som) t += PHACH / 2;
    notNhac(tram, 50, '', t, 0.55, rate, 0, 0.45, busChuyen);
    const hop = nguoc ? HOP_CHUYEN.slice().reverse() : HOP_CHUYEN;
    hop.forEach((m, j) => notNhac(hac, m, '', t + 0.1 * j, 0.34 - 0.04 * j, rate, -0.35 + 0.23 * j, 0.8, busChuyen));
    if (diem) phat(diem, ten === 'cua' ? t - CUA_COC : t - 0.04, { bus: busChuyen, g: dB(ten === 'cua' ? -9 : -6), pan: ten === 'cua' ? (nguoc ? 0.3 : -0.3) : 0, vang: 0.3 });
  }

  // mờ chuyển: một nốt trầm ngân nhẹ (không rải hạc, không tiếng nơi chốn đi kèm), rơi vào nửa phách kế tiếp
  let lanMo = -1e9;
  function phatMo(toi) {
    if (!ctx || !on) return;
    const bay = performance.now(); if (bay - lanMo < 900) return; lanMo = bay;
    const tram = co('tram'); if (!tram) return;
    const now = ctx.currentTime, rate = Math.pow(2, NHAC[kep(toi, 0, CUOI)].goc / 12);
    // (p11a B8) nốt nhẹ phải kêu NGAY lúc bắt đầu mờ (≤ 0,1 s): nửa phách kế còn xa hơn 0,1 s thì phát luôn (nốt trầm ngân,
    // lệch phách nhỏ khó nghe ra) — bản cũ đợi tới nửa phách kế, trễ tới 0,96 s, có lần kêu khi hình đã mờ xong
    let t = phachToi ? phachToi - PHACH : now; while (t < now + 0.03) t += PHACH / 2;
    if (t > now + 0.1) t = now + 0.03;
    notNhac(tram, 50, '', t, 0.3, rate, 0, 0.45, busChuyen);
  }

  // ---------- nhịp đồng hồ ----------
  function tick() {
    if (!ctx || ctx.state !== 'running' || !on) return;
    const now = ctx.currentTime;
    lichNhac(now);
    lichSu(now);
    for (const k of Object.keys(lop)) { const L = lop[k]; if (!L.dang) continue; const a = co(k); for (const ben of L.ben) if (now > ben.hen) giongMoi(ben, a, 3); }
    if (now > henLat) {
      henLat = now + 3;
      for (const k of Object.keys(lop)) if (lop[k].dang) lop[k].troi.gain.setTargetAtTime(dB(ngau(-2, 2)), now, ngau(1.5, 3.5));
    }
  }

  // ---------- sự kiện của trang ----------
  function khiChuong(e) {
    const d = e.detail || {}, toi = kep((d.toi | 0), 0, CUOI), tu = kep((d.tu | 0), 0, CUOI);
    if (d.loai === 'bat-dau') {
      chuongNhac = toi;
      if (!ctx || !on) { chuong = toi; return; }
      // (30/9) MỜ CHUYỂN (lùi, bấm tên chương, logo, Home / End): không cử chỉ chuyển cảnh — chỉ MỘT nốt trầm ngân rất nhẹ theo gốc
      // của chương đến; tiếng nơi chốn đổi nhanh hơn một chút (cảnh đổi trong 0,7 s)
      if (d.kieu === 'mo') { if (tu !== toi) phatMo(toi); doiCanh(TEN_CANH[toi], 2.2); return; }
      // (4 ↔ 5 không có cử chỉ chuyển cảnh — y như trước phần 9, lúc chương 5 còn bị gộp vào 4)
      if (tu !== toi && !(Math.min(tu, toi) === 4 && Math.max(tu, toi) === 5)) phatChuyen(toi > tu ? toi : tu, toi, toi < tu);
      doiCanh(tu === 0 && toi === 1 ? 'hoanghon' : TEN_CANH[toi], tu === 0 && toi === 1 ? 5 : 3.5);
    } else {
      chuong = toi; chuongNhac = toi;
      if (!ctx || !on) return;
      if (canh !== TEN_CANH[toi]) doiCanh(TEN_CANH[toi], canh === 'hoanghon' ? 5 : 2.5);
    }
  }
  function khiNet(e) {
    const dang = !!(e.detail && e.detail.dang);
    if (!ctx || !on || (!netBat && !net)) return;
    const a = co('net'), now = ctx.currentTime;
    if (dang) {
      if (!a) { can('net', 3); return; }
      if (net) return;
      const s = ctx.createBufferSource(); s.buffer = a.buf; s.loop = true; s.loopEnd = a.L; s.playbackRate.value = ngau(0.9, 1.12);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(dB(MUC.net - MUC.chuyen + netThem), now + 0.08);
      const p = ctx.createStereoPanner(); p.pan.value = ngau(-0.2, 0.2);
      s.connect(g).connect(p).connect(busChuyen); s.start(now, Math.random() * a.L);
      net = { s, g };
    } else if (net) {
      const n = net; net = null;
      n.g.gain.cancelScheduledValues(now); n.g.gain.setValueAtTime(n.g.gain.value, now); n.g.gain.linearRampToValueAtTime(0, now + 0.25);
      n.s.stop(now + 0.3);
    }
  }
  window.addEventListener('kozo:chuong', khiChuong);
  window.addEventListener('kozo:net', khiNet);

  // ---------- bật / tắt / ẩn tab ----------
  function lenTieng(tg) { const t = ctx.currentTime; tong.gain.cancelScheduledValues(t); tong.gain.setValueAtTime(tong.gain.value, t); tong.gain.linearRampToValueAtTime(1, t + tg); }
  function langTieng(tg) { const t = ctx.currentTime; tong.gain.cancelScheduledValues(t); tong.gain.setValueAtTime(tong.gain.value, t); tong.gain.linearRampToValueAtTime(0, t + tg); }
  let henTat = 0;
  function khiAn() {
    if (!ctx) return;
    if (document.hidden) { langTieng(0.5); clearTimeout(henTat); henTat = setTimeout(() => { if (document.hidden) ctx.suspend(); }, 560); }
    else if (on) { clearTimeout(henTat); ctx.resume().then(() => { if (sanSang) lenTieng(0.8); }); }
  }
  async function khoiDong() {
    await dungVang();
    if (!daDoi) canh = TEN_CANH[chuong];
    chuongNhac = chuong;
    // nhạc là lớp chính: dựng hạc + đàn trầm trước, có là bắt đầu; koto vào ở câu kế tiếp khi dựng xong
    await Promise.all([can('hac', 6), can('tram', 6)]);
    sanSang = true; giaiSan();
    if (on) lenTieng(1.2);
    can('koto', 5);
    doiCanh(canh, 1.5);
    can('muc', 2); can('cua', 2);
    for (const ten of Object.keys(CAN_CANH)) for (const k of CAN_CANH[ten]) can(k, 0);
  }

  return {
    get dangBat() { return on; },
    /** phải gọi trong một cú bấm / chạm / phím; o.ctx: AudioContext đã mở sẵn trong cú bấm (nếu có) */
    bat(o = {}) {
      on = true;
      if (!ctx) { dung(o.ctx); khoiDong(); }
      if (ctx.state !== 'running') ctx.resume();
      clearInterval(timer); timer = setInterval(tick, 100);
      if (sanSang) lenTieng(1.0);
    },
    tat() {
      if (net) khiNet({ detail: { dang: false } });
      on = false;
      if (!ctx) return;
      langTieng(0.5);
      clearTimeout(henTat); henTat = setTimeout(() => { if (!on) { ctx.suspend(); clearInterval(timer); } }, 560);
    },
    /** đặt thẳng chương đang đứng (0..6) — khi trang mở thẳng một chương mà không qua sự kiện chuyển */
    datChuong(k) {
      k = kep(k | 0, 0, CUOI); chuong = k; chuongNhac = k;
      if (ctx && on && sanSang && canh !== TEN_CANH[k]) doiCanh(TEN_CANH[k], 2);
    },
    /** chờ tới khi nhạc đã dựng xong và bắt đầu phát */
    sanSang: () => huaSan,
    /** chỉ để thử: tắt/bật riêng từng lớp 'nen' (nơi chốn) | 'nhac' | 'chuyen' */
    lop(ten, bat) {
      if (!ctx) return;
      const n = { nen: tatNen, nhac: tatNhac, chuyen: tatChuyen }[ten];
      if (n) n.gain.setTargetAtTime(bat ? 1 : 0, ctx.currentTime, 0.1);
    },
    /** tiếng nét cọ: mặc định tắt; them = dB cộng thêm (chỉ để nghe thử) */
    netCo(bat, them = 0) { netBat = !!bat; netThem = them; },
    /** chỉ để thử: phát riêng cử chỉ chuyển cảnh sang chương i (1..6) */
    phatChuyen,
    /** chỉ để thử / đo: các điểm nối để thu lại bản trộn và từng lớp */
    _nut: () => (ctx ? { ctx, tong: sauHan, nen: tatNen, nhac: tatNhac, chuyen: tatChuyen } : null),
    trangThai() {
      const ds = Object.values(taiSan);
      return { canh, chuong, dangBat: on, ctx: ctx ? ctx.state : 'chưa tạo', daDung: ds.filter((a) => a.xong).length, tongSo: Object.keys(CONG).length - (taiSan.net ? 0 : 1), latMaxMs: +thongKe.latMax.toFixed(2), soLat: thongKe.soLat, nhatKy, latDai: thongKe.dai, phachBo, chuongNhac, nhatKySu };
    },
  };
}
