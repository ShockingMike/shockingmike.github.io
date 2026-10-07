// Lớp trang của bản thử không khí: màn chờ, lắp chữ, con trỏ. Chỉ màn đầu — không có cuộn.
import { COPY } from './copy.js';
import { ACCENTS, accentId, sealSVG } from './accent.js';
import { decode } from './decode.js';
import { createChuong } from './chuong.js';
import { taoAmThanh, choHoan } from './am-thanh.js';

// ── 0. MÀU NHẤN: dấu 構 trước tên studio + biểu tượng tab là chính cái dấu ấy ────────
const AC = accentId();
if (AC) {
  const col = ACCENTS.rokusho.line;
  const seal = document.getElementById('seal');
  if (seal) seal.innerHTML = sealSVG(col, 28);
  const ic = document.querySelector('link[rel="icon"]');
  if (ic) ic.href = 'data:image/svg+xml,' + encodeURIComponent(sealSVG(col, 16));
}

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ── 1. MÀN CHỜ: nền đá tự xếp theo phần trăm tải THẬT ────────────────────────
const load = $('#load');
const wall = $('#load-wall');
const numEl = $('#load-n');
const labEl = $('#load-lab');
let target = 0, shown = 0, label = 'starting', done = false;
// chọn tiếng (mục 6): TẢI XONG MỚI HỎI (Mike 29/9 lần 3). 'on' | 'off' | null (chưa bấm). Màn tải (hàng đá + %) hiện trước;
// tới 100% thì màn tải tan, màn chọn hiện (lớp .cho); bấm là vào thẳng màn mở.
// Trình duyệt tự động (bài kiểm) không bấm thì tự vào im lặng khi tải xong, để các công cụ kiểm cũ chạy như trước;
// &chon=1 bắt nó đứng chờ bấm như người thật.
let chon = null;
const TU_DONG = !!navigator.webdriver && new URLSearchParams(location.search).get('chon') !== '1';

const stoneBox = [];
(function buildWall() {
  let seed = 20260923;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const rows = [22, 20, 18, 16, 14, 10];
  const H = 104, W = 240, rowH = 15;
  let i = 0, out = '';
  rows.forEach((cnt, r) => {
    const yTop = H - (r + 1) * rowH - 4;
    const inset = 16 + r * 9;
    const span = W - inset * 2;
    let x = inset;
    for (let c = 0; c < cnt; c++) {
      const w = span / cnt;
      const jx = (rnd() - 0.5) * 1.6, jy = (rnd() - 0.5) * 1.4;
      const x0 = x + 0.7 + jx, x1 = x + w - 0.7 + jx;
      const y0 = yTop + 0.8 + jy, y1 = yTop + rowH - 0.9 + jy;
      const k = 0.9 + rnd() * 0.8;
      stoneBox.push([x0, y0, x1, y1]);
      out += `<path class="st" data-i="${i}" d="M${x0 + k} ${y0}H${x1 - k}L${x1} ${y0 + k}`
        + `V${y1 - k}L${x1 - k} ${y1}H${x0 + k}L${x0} ${y1 - k}V${y0 + k}Z"/>`;
      x += w; i++;
    }
  });
  wall.innerHTML = out;
})();
const stones = $$('.st', wall);
// TẢNG ĐANG ĐẶT (29/9 sau p9b): tảng kế tiếp thở mờ nhẹ — CSS chỉ đổi độ đục trên một lớp riêng nên chạy ở luồng vẽ của trình
// duyệt, không phụ thuộc luồng chính: lúc trang bận dịch mã (nạp three.js ~0,3 s) màn tải vẫn có một thứ đang chuyển động, không
// đứng hình. Là phần tử HTML (không phải hình SVG — hình SVG đổi độ đục thì trình duyệt vẽ lại trên luồng chính).
const ghost = (() => {
  const wrap = document.createElement('div'); wrap.className = 'load-wall-w';
  wall.parentNode.insertBefore(wrap, wall); wrap.appendChild(wall);
  const g = document.createElement('span'); g.className = 'load-dat'; g.setAttribute('aria-hidden', 'true');
  wrap.appendChild(g);
  return g;
})();
let ghostAt = -1;
function placeGhost(i) {
  if (i === ghostAt) return;
  ghostAt = i;
  const b = stoneBox[i];
  if (!b) { ghost.style.display = 'none'; return; }
  ghost.style.left = (b[0] / 240 * 100).toFixed(3) + '%'; ghost.style.top = (b[1] / 104 * 100).toFixed(3) + '%';
  ghost.style.width = ((b[2] - b[0]) / 240 * 100).toFixed(3) + '%'; ghost.style.height = ((b[3] - b[1]) / 104 * 100).toFixed(3) + '%';
}
placeGhost(0);

window.__kozoNap = (p, ten) => {
  target = Math.max(target, clamp(p, 0, 1));
  if (ten) label = ten;
};

// chữ bốn góc hiện kiểu giải mã, lệch nhịp nhau (số của igloo: trễ · gạt · xáo). clock: đồng hồ của màn mở
// (giây kể từ lúc chữ bắt đầu hiện) — không có thì chạy theo giờ thật như trước.
const REDUCED_UI = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
function decodeAll(clock) {
  document.documentElement.classList.add('ui');
  for (const el of $$('[data-decode]')) {
    const [dl, sh, sc, nos] = el.dataset.decode.split(',').map(Number);
    // giảm chuyển động: không xáo ký tự, chỉ hiện dần (p7a B10)
    decode(el, { delay: clock ? dl : dl + 0.35, show: sh, scramble: sc || 0.01, noScramble: !!nos || REDUCED_UI || document.documentElement.classList.contains('doc'), clock });
  }
}
window.__kozoUI = { decodeAll };

function tickLoad(dt) {
  if (done) return;
  shown = Math.min(target, shown + dt * 0.9);
  numEl.textContent = Math.floor(shown * 100);
  labEl.textContent = label;
  const want = Math.round(shown * stones.length);
  for (let i = 0; i < stones.length; i++) {
    const on = i < want;
    if (on !== stones[i].classList.contains('on')) stones[i].classList.toggle('on', on);
  }
  placeGhost(want);
  if (target >= 1 && shown >= 0.999) {
    // CHƯA BẤM THÌ KHÔNG VÀO CẢNH: màn tải tan, màn chọn hiện (.cho) và đứng chờ; bấm rồi thì vào ngay khung sau
    if (!chon) {
      if (!TU_DONG) { if (!load.classList.contains('cho')) load.classList.add('cho'); return; }
      chon = 'off';
    }
    done = true;
    document.documentElement.classList.add('ready');
    const api = window.__kozo;
    // MÀN MỞ (mặc định): cảnh tự lo việc tan màn chờ, lớp sương phẳng và giờ hiện chữ (scene/intro.js)
    if (api && api.introMode && !api.error && api.startIntro) { api.startIntro(); return; }
    // ?intro=0 · người dùng chọn giảm chuyển động · cảnh hỏng: tan nhẹ thẳng vào khung cuối như bản phần 1
    load.classList.add('done');
    const mist = document.getElementById('mist');
    if (mist) mist.style.display = 'none';
    setTimeout(() => { load.style.display = 'none'; }, 700);
    decodeAll(null);
  }
}

// ── 2. LẮP CHỮ ───────────────────────────────────────────────────────────────
for (const el of $$('[data-copy]')) {
  const v = COPY[el.dataset.copy];
  if (v === undefined) { console.error('[kozo] THIẾU Ô CHỮ:', el.dataset.copy); continue; }
  el.textContent = v;
}

// phần 3: lớp giao diện chương (cột chương, khung vát góc, chữ chương) — app.js gọi update mỗi khung theo vị trí cuộn
window.__kozoChuong = createChuong();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, Math.max(0, (now - (frame.last || now)) / 1000));
  frame.last = now;
  tickLoad(dt);
  tickSound();
}
requestAnimationFrame(frame);

// ── 3. CON TRỎ ───────────────────────────────────────────────────────────────
addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  const api = window.__kozo;
  if (api && api.setMouse) api.setMouse(e.clientX, e.clientY);
}, { passive: true });
addEventListener('pointerleave', () => { const api = window.__kozo; if (api && api.clearMouse) api.clearMouse(); });
let chamHen = 0;
addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  const api = window.__kozo;
  if (!api || !api.setMouse) return;
  api.setMouse(e.clientX, e.clientY);
  clearTimeout(chamHen);
  chamHen = setTimeout(() => { if (api.clearMouse) api.clearMouse(); }, 2600);
}, { passive: true });

// ── 4. CẢNH HỎNG THÌ VẪN PHẢI ĐỌC ĐƯỢC TRANG ────────────────────────────────
// bản đọc chữ (B6): lớp html.doc (style.css) bày mọi chữ thành một trang cuộn thường; chữ các chương hiện ngay, không xáo
function banDoc(note) {
  const html = document.documentElement;
  if (html.classList.contains('doc')) return;
  html.classList.add('doc', 'ui');
  const main = document.getElementById('main');
  if (main && note) { const p = document.createElement('p'); p.className = 'doc-note'; p.textContent = note; main.insertBefore(p, main.firstChild); }
  for (const el of document.querySelectorAll('.ch')) { el.style.opacity = '1'; el.style.visibility = 'visible'; }
  // (phần 9) form 連絡 ở bản đọc chữ: đọc được, gõ được, Tab tới được (bấm Send vẫn chỉ hiện câu demo — page/chuong.js)
  for (const el of document.querySelectorAll('[inert]')) el.inert = false;
  for (const el of document.querySelectorAll('.ch .nhan, .ch .pick-t')) decode(el, { show: 0.01, noScramble: true });
  for (const el of document.querySelectorAll('.ch-head, .ch-body')) decode(el, { show: 0.01, noScramble: true });
}
setTimeout(function canh() {
  const api = window.__kozo;
  if (api && api.error) {
    // B6: chip vẽ bằng CPU (SwiftShader…) → cố ý không dựng cảnh; cảnh hỏng thật → cũng vậy. Cả hai vào BẢN ĐỌC CHỮ: trang cuộn
    // thường, đủ chữ các chương, không có cảnh 3D
    if (!api.textOnly && !api.noGL) console.error('[kozo] cảnh 3D hỏng, trang chạy tiếp ở dạng trang chữ:', api.error);
    banDoc(api.textOnly ? 'This device draws 3D without a graphics chip, so the page is shown as text.' : 'The 3D scene could not start on this device, so the page is shown as text.');
    window.__kozoNap(1, 'text only');
    return;
  }
  if (!done) setTimeout(canh, 400);
}, 1200);
(function doiXong() {
  const api = window.__kozo;
  if (api && api.ready) { window.__kozoNap(1, 'ready'); return; }
  requestAnimationFrame(doiXong);
})();

// ── 6. ÂM THANH (page/am-thanh.js, bản 2, hướng đã duyệt 29/9): chọn tiếng ngay trên màn chờ ──────────────────
// Không bấm "with sound" thì không tạo AudioContext nào. Có tiếng: đàn chạy từ màn mở; đổi chương thì am-thanh.js tự nghe
// sự kiện 'kozo:chuong' / 'kozo:net' của trang. Chữ "Sound: On/Off" ở góc là nút bật tắt thật (lặng dần 0,5 s).
const am = taoAmThanh();
window.__kozoAm = am;
// dựng tiếng chỉ lúc trình duyệt rảnh (am-thanh.js tự lo) và KHÔNG trong lúc chuyển cảnh; khi cảnh còn đang dựng
// (màn chờ chưa xong) thì chỉ dựng nhạc — tiếng nơi chốn đợi màn chờ xong
const DUNG_SOM = new Set(['', 'hac', 'tram', 'koto']);
choHoan((ten) => {
  const K = window.__kozo, s = K && K.nav && K.nav.state ? K.nav.state() : null;
  if (s && (s.mode === 'trans' || s.mode === 'jump')) return true;
  return !done && !DUNG_SOM.has(ten || '');
});
const KEY = 'kozo-am';
const luu = (v) => { try { sessionStorage.setItem(KEY, v); } catch (e) { /* không có bộ nhớ phiên */ } };
const nutOn = $('#pick-on'), nutOff = $('#pick-off'), nutSound = $$('.sound-btn');
function veSound() {
  const bat = am.dangBat;
  for (const b of nutSound) {
    b.setAttribute('aria-pressed', String(bat));
    const tt = b.querySelector('[data-tt]');
    if (tt && tt.textContent !== (bat ? 'On' : 'Off')) tt.textContent = bat ? 'On' : 'Off';
  }
}
// gọi từ cú bấm trên màn chọn (hiện khi đã tải xong), hoặc từ đoạn mã nhỏ trong index.html phòng khi bấm trước lúc mã này
// sẵn — khi ấy AudioContext đã được mở sẵn trong chính cú bấm ấy, truyền vào đây
window.__kozoPick = (v, ac) => {
  chon = v === 'on' ? 'on' : 'off';
  luu(chon);
  if (chon === 'on') am.bat({ ctx: ac });
  else if (am.dangBat) am.tat();
  if (nutOn) nutOn.setAttribute('aria-pressed', String(chon === 'on'));
  if (nutOff) nutOff.setAttribute('aria-pressed', String(chon === 'off'));
  load.classList.add('da-chon');
  veSound();
};
if (window.__kozoChon) window.__kozoPick(window.__kozoChon, window.__kozoAC);
for (const b of nutSound) {
  b.addEventListener('click', () => {
    if (am.dangBat) am.tat(); else am.bat();
    luu(am.dangBat ? 'on' : 'off');
    veSound();
  });
}
// hai chữ Sound nằm trên lớp chữ không nhận chuột: chỉ cho bấm / Tab tới khi chữ đang hiện
const soundS1 = $('.s1 .sound .sound-btn'), soundCh = $('#ch-sound .sound-btn');
const cornerBl = $('.s1 .c-bl'), chSound = $('#ch-sound');
const soundLast = [null, null];
function capSound(i, b, hien) {
  if (!b || soundLast[i] === hien) return;
  soundLast[i] = hien;
  b.style.pointerEvents = hien ? 'auto' : 'none';
  b.tabIndex = hien ? 0 : -1;
}
function tickSound() {
  const ui = document.documentElement.classList.contains('ui');
  capSound(0, soundS1, ui && parseFloat((cornerBl && cornerBl.style.opacity) || '1') > 0.5);
  capSound(1, soundCh, parseFloat((chSound && chSound.style.opacity) || '0') > 0.5);
  // mở thẳng một chương (&chuong=) không qua sự kiện chuyển: báo cho bộ âm thanh chương đang đứng
  const K = window.__kozo, st = K && K.nav && K.nav.state ? K.nav.state() : null;
  if (st && st.mode !== 'trans' && st.mode !== 'jump' && st.cur !== tickSound.cur) { tickSound.cur = st.cur; if (am.trangThai().chuongNhac !== st.cur) am.datChuong(st.cur); }
}
tickSound.cur = 0;

// ── 5. ĐỒNG HỒ KHUNG HÌNH cho Mike tự xem trên Chrome của mình: chỉ có khi thêm &fps=1 vào link ────────────────
// Hình/giây hiện tại · hình/giây của 1% khung chậm nhất (10 s gần nhất) · số khung lỡ nhịp (> 20 ms) trong 10 s gần
// nhất · đồ thị thời gian từng khung (vạch ngang = 16,7 ms, tức 60 hình/giây). Không bật thì không tạo gì, không tốn gì.
if (new URLSearchParams(location.search).get('fps') === '1') {
  const box = document.createElement('div');
  box.className = 'fps-meter';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '<p class="fps-a"></p><p class="fps-b"></p><canvas width="168" height="40"></canvas>';
  document.body.appendChild(box);
  const a = box.querySelector('.fps-a'), bEl = box.querySelector('.fps-b'), cv = box.querySelector('canvas'), g = cv.getContext('2d');
  const ft = [];   // [mốc rAF, khoảng cách tới khung trước] trong 10 s gần nhất
  let last = null, nextText = 0;
  function meter(now) {
    requestAnimationFrame(meter);
    if (last !== null) ft.push([now, now - last]);
    last = now;
    while (ft.length && now - ft[0][0] > 10000) ft.shift();
    // đồ thị: 84 khung gần nhất, mỗi khung một vạch 2 px; cao 40 px = 33 ms
    g.clearRect(0, 0, 168, 40);
    const n = Math.min(84, ft.length);
    for (let i = 0; i < n; i++) {
      const d = ft[ft.length - n + i][1];
      const h = Math.min(40, (d / 33.3) * 40);
      g.fillStyle = d > 20 ? '#b4442f' : 'rgba(37,34,31,0.45)';
      g.fillRect(i * 2, 40 - h, 1, h);
    }
    g.fillStyle = '#3E9A80';   // vạch 60 hình/giây (16,7 ms) — màu 緑青 của trang
    g.fillRect(0, 40 - (16.7 / 33.3) * 40, 168, 1);
    if (now < nextText || ft.length < 2) return;
    nextText = now + 250;
    const last1 = ft.filter(([t]) => now - t <= 1000).length;
    const s = ft.map(([, d]) => d).sort((x, y) => x - y);
    const p99 = s[Math.min(s.length - 1, Math.floor(s.length * 0.99))];
    const miss = ft.filter(([, d]) => d > 20).length;
    a.textContent = `${last1} fps · 1% low ${Math.round(1000 / p99)} fps`;
    bEl.textContent = `missed (>20 ms, 10 s): ${miss}`;
  }
  requestAnimationFrame(meter);
}
