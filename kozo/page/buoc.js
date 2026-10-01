// ĐI TỪNG CHƯƠNG (29/9, Mike: "mỗi lần scroll là một tab này để viewer đỡ phải scroll nhiều lần") — thay cho cuộn liên tục (cuon.js).
// Các điểm dừng: màn đầu ban ngày (0) → 地 (1) → 石垣 (2) → 骨 (3) → 皮 (4). Một CỬ CHỈ = MỘT BƯỚC:
//   · một nấc lăn chuột, một cú vuốt bàn di (dù có hàng chục sự kiện lăn nhỏ + đuôi quán tính), một cú vuốt màn điện thoại,
//     một lần bấm ↓ / PageDown / Space → chương sau; ↑ / PageUp / Shift+Space và cuộn ngược → chương trước; Home / End → đầu / cuối.
//   · (30/9, Mike) chỉ ĐI TỚI chương kế mới chạy chuyển cảnh đủ; lùi, bấm tên chương, logo, Home / End là MỜ CHUYỂN (xem FADE_D).
//   · cử chỉ MỚI = sự kiện lăn tới sau ≥ 180 ms im lặng: cả chuỗi quán tính của một cú vẩy chỉ tính là một cử chỉ.
//   · KHOÁ trong lúc chuyển + 0,4 s sau khi tới; cú LĂN tới trong lúc khoá bị BỎ (không xếp hàng). Riêng cú BẤM tên chương /
//     Home / End trong lúc đang chuyển thì NHỚ cú cuối cùng và đi ngay khi tới nơi (soát p7a, B8).
// Mọi thứ chạy THEO THỜI GIAN trên "vị trí ảo" (đơn vị màn — đúng thước dòng thời gian cũ trong app.js, nên hình các chuyển cảnh
// đã duyệt giữ nguyên, chỉ đổi thứ điều khiển). Bản p7b (soát p7a: B1, B2, B7) — HAI ĐƯỜNG trong lúc chuyển:
//   · s  (đường chuyển cảnh): chạy từ mép chương đang đứng tới mép chương đến. Hiệu ứng chuyển cảnh + cảnh ĐẾN đọc theo s.
//   · sOut (đường của cảnh ĐANG RỜI): đi tiếp từ đúng tư thế đang có, với đà (vận tốc) đang có tắt dần, cộng phần trôi thiết kế
//     của chuyển cảnh — KHÔNG tua nhanh, không tua ngược cả chương (lăn lúc chương còn chạy: nét vẽ dở cứ để nguyên, lớp chuyển
//     cảnh che nó đi).
//   · VẬN TỐC LIỀN: chuyển cảnh đi tới bắt đầu từ đứng yên và kết thúc đúng bằng vận tốc đầu chương; đường trong chương bắt đầu từ
//     vận tốc ấy, chậm dần về 0 ở cuối (đường cong Hermite bậc ba, hai đầu khớp cả vị trí lẫn vận tốc) — hết "đứng rồi vọt".
//   · lùi: đường s chạy ngược (inOut3) về cuối chương trước (tới nơi là trạng thái cuối, vận tốc 0 — nghỉ luôn).
//   · nhảy xa (bấm tên chương cách ≥ 2 chương, hoặc logo về màn đầu): app.js vẽ mực thấm gọn; ở đây chỉ đưa tiến độ p
//     (1,6 s; có màn đầu thì 2,2 s); tới nơi thì chương chạy từ đứng yên.
//   · LĂN SỚM (B3): thung lũng chưa dựng xong thì vẫn đi ngay — phần chạng vạng trên toà thành chạy trước, chỉ dừng ở ngay trước
//     chỗ mực thấm cho tới khi thung lũng sẵn. Chương khác chưa sẵn: nhớ ý muốn (không hết hạn), sẵn là đi.
// Giảm chuyển động: mọi lần chuyển là tan nhẹ 0,4 s; tới chương hiện ngay trạng thái cuối; không có đà, không có máy thở.
// Sự kiện trên window (cho lớp âm thanh sau này): 'kozo:chuong' detail { tu, toi, loai: 'bat-dau' | 'xong' } — số chương 0..4.
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const inOut3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
// Hermite bậc ba trên [0,1]: vị trí 0 → 1, độ dốc đầu m0, độ dốc cuối m1 (đơn vị: quãng / thời lượng)
const herm = (u, m0, m1) => { const u2 = u * u, u3 = u2 * u; return (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) + (u3 - u2) * m1; };
const hermD = (u, m0, m1) => (3 * u * u - 4 * u + 1) * m0 + (-6 * u * u + 6 * u) + (3 * u * u - 2 * u) * m1;
const TAU = 0.6;   // đà của cảnh đang rời tắt dần (giây)

export function createBuoc(o) {
  const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const CH = o.chapters, TR = o.trans, N = CH.length;
  const GATE = o.gate;   // { chapter: 1, s: vị trí dừng chờ (ngay trước mực thấm) }
  const LOCK_MS = 400, GAP_MS = 180, M_PLAY = 1.0;   // độ dốc đầu chương (1 = đúng vận tốc trung bình của chương)
  const S = { s: 0, sOut: 0, v: 0, cur: 0, mode: 'idle', t: 0, D: 1, from: 0, to: 0, s0: 0, s1: 0, m0: 0, m1: 0, o0: 0, ov: 0, dir: 1,
    gate: null, lockUntil: 0, lastWheel: -1e9, armed: true, idleAt: 0, paused: false, log: [], pend: null, queue: null, jid: 0,
    pA: 0, pB: 0, pD: 1, pm: 0, fade: null, tStart: 0 };
  const info = { s: 0, sOut: 0, cur: 0, mode: 'idle', jump: null, fade: null, idleK: 0, target: 0, from: 0, to: 0, u: 0, dir: 0 };
  const now = () => performance.now();
  const can = () => o.canInput();
  const moving = () => S.mode === 'trans' || S.mode === 'jump' || !!S.fade;
  const locked = () => moving() || now() < S.lockUntil;
  const logE = (e) => { S.log.push([Math.round(now()), e, S.cur, +S.s.toFixed(3)]); if (S.log.length > 400) S.log.shift(); };
  // kieu: 'chuyen' (chuyển cảnh đủ) | 'mo' (mờ chuyển — lớp âm thanh chơi nhẹ hơn)
  const emit = (loai, tu, toi, kieu = 'chuyen') => { try { dispatchEvent(new CustomEvent('kozo:chuong', { detail: { tu, toi, loai, kieu } })); } catch (e) { /* trình duyệt quá cũ */ } };
  // MỜ CHUYỂN (Mike 30/9: "khi scroll lên hoặc bấm vào các tab ở nav thì chỉ fade in out thôi không cần full animation chuyển cảnh"):
  // lùi (lăn / vuốt / phím LÊN), bấm tên chương (mọi hướng, mọi khoảng cách), bấm logo, Home / End → KHÔNG chạy chuyển cảnh. Trang chụp
  // khung đang hiện làm ảnh đứng (khung kế tiếp, app.js), đổi sang ĐẦU chương đích (chương chạy nội dung như thường), rồi ảnh cũ tan dần
  // trên cảnh mới đang sống trong FADE_D giây — không qua màn đen, không chớp. Chỉ ĐI TỚI chương kế bằng lăn / vuốt / phím XUỐNG mới chạy
  // chuyển cảnh đủ. Khoá nhập suốt lúc mờ + 0,4 s. Chương đích chưa dựng xong: nhớ ý muốn (cột chương sáng ngay), sẵn là mờ sang.
  const FADE_D = REDUCED ? 0.4 : 0.7;
  // vận tốc đầu chương k khi đi tới (đơn vị màn / giây)
  const vPlay = (k) => (CH[k].B > CH[k].A ? (M_PLAY * (CH[k].B - CH[k].A)) / CH[k].dur : 0);

  // tới chương k: 'start' (đi tới) chạy đường trong chương từ vận tốc v; 'end' (lùi) nghỉ luôn ở trạng thái cuối
  function arrive(k, where, v = 0) {
    S.cur = k; S.t = 0; S.lockUntil = now() + LOCK_MS; S.gate = null;
    const c = CH[k];
    if (where === 'start' && c.B > c.A && !REDUCED) {
      S.mode = 'play'; S.s = c.A; S.pA = c.A; S.pB = c.B; S.pD = c.dur; S.pm = (v * c.dur) / (c.B - c.A); S.v = v;
    } else { S.mode = 'idle'; S.s = where === 'start' && !REDUCED ? c.A : c.B; S.v = 0; S.idleAt = now(); }
    S.sOut = S.s;
    logE('toi-' + where);
    if (o.onArrive) o.onArrive(k);
  }
  // (soát p11a B1) cú bấm tên chương / Home / End / logo đã NHỚ (rơi vào lúc đang chuyển hay đang mờ): chạy SAU khi đã báo "xong" lần
  // vừa rồi — báo "xong" đúng chương vừa tới, rồi mới bắt đầu lần mờ mới. Trả về true nếu đã đi tiếp.
  function runQueue() {
    if (S.queue === null) return false;
    const q = S.queue; S.queue = null;
    return q !== S.cur ? startTrans(q, 'go') : false;
  }
  // how: 'buoc' (lăn / vuốt / phím một bước) · 'go' (bấm tên chương, logo, Home / End)
  function startTrans(to, how = 'buoc') {
    const from = S.cur;
    if (to < 0 || to >= N || to === from) return false;
    const fade = REDUCED || how === 'go' || to < from || Math.abs(to - from) > 1;
    const gated = !fade && GATE && from === 0 && to === GATE.chapter && !o.canGo(to);
    if (!o.canGo(to) && !gated) { S.pend = { to, t: now(), how }; logE('cho-' + to); return false; }
    S.pend = null;
    if (fade) return startFade(to);
    const c = CH[from];
    // cảnh đang rời: đi tiếp từ tư thế + đà đang có (đọc TRƯỚC khi đổi chế độ)
    S.o0 = S.s; S.ov = S.mode === 'play' ? S.v : 0;
    S.mode = 'trans'; S.from = from; S.to = to; S.t = 0; S.dir = to > from ? 1 : -1; S.tStart = now();
    if (S.dir > 0) {
      const T = TR[from];
      S.s0 = c.B; S.s1 = CH[to].A; S.D = T.dur;
      S.m0 = 0; S.m1 = (vPlay(to) * S.D) / Math.max(1e-6, S.s1 - S.s0);
      S.gate = gated ? { s: GATE.s, a: S.s0, D: S.D, phase: 0 } : null;
    } else {
      S.s0 = c.A; S.s1 = CH[to].B; S.D = TR[to].back ?? TR[to].dur;   // (back: lùi có quãng riêng dài hơn — chuyển cảnh 5, soát p9a B3)
    }
    // (đường chuyển cảnh bắt đầu ở mép chương — khi đang ở giữa chương thì chỉ cảnh ĐẾN và hiệu ứng đọc theo đường này,
    //  cảnh đang rời đọc theo sOut nên không nhảy tư thế)
    S.s = S.s0;
    logE('chuyen-' + from + '-' + to + (gated ? '-cho' : ''));
    emit('bat-dau', from, to);
    return true;
  }
  // mờ chuyển: khung đầu (stage 0) trang vẫn vẽ trạng thái cũ và CHỤP nó; khung sau (stage 1) đổi sang đầu chương đích; rồi mờ
  // (soát p11a A5) mờ VỀ MÀN ĐẦU ban ngày (đêm → ngày, sáng lên rất nhiều): dài hơn, app.js nắn đường cong chậm ở nửa đầu
  const fadeDur = (from, to) => (REDUCED ? 0.4 : to === 0 && from > 0 ? 1.15 : FADE_D);
  function startFade(to, from = S.cur) {
    S.fade = { from, to, stage: 0, t: 0, id: ++S.jid, D: fadeDur(from, to) };
    S.gate = null; S.from = from; S.to = to; S.dir = to > from ? 1 : -1;
    logE('mo-' + from + '-' + to);
    emit('bat-dau', from, to, 'mo');
    return true;
  }
  // (soát p11a B6) LÙI GIỮA LÚC ĐANG CHUYỂN CẢNH ĐI TỚI: cú lăn lên / ↑ / PageUp / vuốt xuống tới sau ≥ 0,2 s kể từ lúc bắt đầu chuyển
  // (chống đuôi quán tính của chính cú lăn xuống) được nhận NGAY: bỏ chuyển cảnh, MỜ về chương vừa rời (đầu chương, như mọi lần lùi)
  const BACK_MS = 200;
  const canBackOut = () => S.mode === 'trans' && S.dir > 0 && !S.fade && now() - S.tStart >= BACK_MS;
  // (khung chụp của lần mờ này vẫn phải là ĐÚNG khung chuyển cảnh đang hiện: giữ nguyên chế độ 'trans', from / to, và đứng yên đường
  // chuyển cảnh trong khung ấy — đổi sang chương cũ ở khung sau, như mọi lần mờ)
  function backOut() {
    const fwd = S.to, back = S.from;
    S.queue = null;
    S.fade = { from: fwd, to: back, stage: 0, t: 0, id: ++S.jid, D: fadeDur(fwd, back) };
    logE('lui-giua-' + fwd + '-' + back);
    emit('bat-dau', fwd, back, 'mo');
    return true;
  }
  function startJump(to) {
    S.mode = 'jump'; S.from = S.cur; S.to = to; S.t = 0; S.s0 = S.s; S.jid++; S.gate = null; S.dir = to > S.from ? 1 : -1;
    S.D = REDUCED ? 0.4 : S.from === 0 || to === 0 ? 2.2 : 1.6;
    logE('nhay-' + S.from + '-' + to);
    emit('bat-dau', S.from, to);
    return true;
  }
  function step(dir) {
    if (!can()) return false;
    if (dir < 0 && canBackOut()) return backOut();
    if (locked()) return false;
    return startTrans(S.cur + dir, 'buoc');
  }
  // bấm tên chương / Home / End: đang chuyển thì nhớ cú cuối (đi ngay khi tới nơi); chỉ đang khoá 0,4 s sau khi tới thì cũng nhớ
  function go(k) {
    if (!can()) return false;
    if (locked()) { if (k !== (moving() ? S.to : S.cur)) S.queue = k; else S.queue = null; return false; }
    if (k === S.cur) return false;
    return startTrans(k, 'go');
  }

  // ── nhận cử chỉ ─────────────────────────────────────────────────────────────────────────────
  addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;   // chụm hai ngón / Ctrl + lăn: để trình duyệt phóng to
    e.preventDefault();
    const t = now(), gap = t - S.lastWheel;
    S.lastWheel = t;
    if (gap > GAP_MS) S.armed = true;
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (!S.armed || Math.abs(dy) < 2) return;
    // tới trong lúc khoá: bỏ cả cử chỉ ấy (không xếp hàng) — trừ cú LÙI giữa lúc chuyển cảnh đi tới (B6: mờ về ngay)
    if (!can() || (locked() && !(dy < 0 && canBackOut()))) { S.armed = false; return; }
    S.armed = false;
    step(dy > 0 ? 1 : -1);
  }, { passive: false });
  // (phần 9, chương 連絡) đang GÕ trong Ô NHẬP chữ: mũi tên, PageUp / PageDown, Space, Home / End là của ô nhập, KHÔNG đổi chương.
  // Chỉ tính ô nhập chữ thật (input chữ, textarea, select, ô sửa chữ) — KHÔNG tính nút (Send…): soát p10a B1, trước đây mọi thứ trong
  // form đều bị coi là "đang gõ" nên bấm Send xong thì ↑ / PageUp / vuốt đều chết. Lúc đang ghép chữ bằng bộ gõ cũng không đổi chương.
  const KHONG_CHU = /^(button|submit|reset|checkbox|radio|range|color|file|image|hidden)$/i;
  const oNhap = (el) => !!el && (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !KHONG_CHU.test(el.type || 'text')));
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.isComposing || e.keyCode === 229) return;
    const tg = e.target;
    if (oNhap(tg) || oNhap(document.activeElement)) return;
    let d = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') d = 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') d = -1;
    else if (e.key === ' ' || e.key === 'Spacebar') { if (tg && tg.tagName === 'BUTTON') return; d = e.shiftKey ? -1 : 1; }
    else if (e.key === 'Home') { e.preventDefault(); go(0); return; }
    else if (e.key === 'End') { e.preventDefault(); go(N - 1); return; }
    if (!d) return;
    e.preventDefault();
    if (!e.repeat) step(d);
  });
  // điện thoại: vuốt lên / xuống một lần = một chương; trang không cuộn thật
  let ty0 = null, tx0 = 0, tt0 = 0;
  // (phần 9, soát p10a B1) chỉ cú vuốt BẮT ĐẦU TRÊN Ô NHẬP là của ô (đặt con trỏ, chọn chữ): không đổi chương. Vuốt bắt đầu ở chỗ khác
  // — kể cả khi con trỏ còn nằm trong ô (đóng bàn phím bằng nút Back của Android thì ô vẫn giữ con trỏ) — thì nhả ô rồi đổi chương.
  addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || oNhap(e.target)) { ty0 = null; return; }
    ty0 = e.touches[0].clientY; tx0 = e.touches[0].clientX; tt0 = now();
  }, { passive: true });
  addEventListener('touchmove', (e) => { if (ty0 !== null && e.cancelable) e.preventDefault(); }, { passive: false });
  addEventListener('touchend', (e) => {
    if (ty0 === null) return;
    const t = e.changedTouches[0], dy = ty0 - t.clientY, dx = tx0 - t.clientX;
    ty0 = null;
    if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx) * 1.2 && now() - tt0 < 1200) {
      const a = document.activeElement;
      if (a && a !== document.body && (oNhap(a) || (a.closest && a.closest('form')))) a.blur();
      step(dy > 0 ? 1 : -1);
    }
  }, { passive: true });

  // ── mỗi khung (trước khi đặt máy quay) ──────────────────────────────────────────────────────
  function update(dt) {
    dt = clamp(dt, 0, 0.1);
    if (!S.paused) S.t += dt;
    info.jump = null; info.fade = null;
    if (S.pend && (S.mode === 'idle' || S.mode === 'play') && !locked() && o.canGo(S.pend.to)) startTrans(S.pend.to, S.pend.how);
    // cú bấm tên chương rơi vào 0,4 s khoá ngay sau khi tới: hết khoá thì đi
    if (S.queue !== null && (S.mode === 'idle' || S.mode === 'play') && !locked()) { const q = S.queue; S.queue = null; if (q !== S.cur) startTrans(q, 'go'); }
    if (S.fade) {
      const F = S.fade;
      if (F.stage === 0) {
        // khung này vẫn là trạng thái cũ — app.js vẽ xong thì chụp làm ảnh đứng
        F.stage = 1;
        info.fade = { p: 0, capture: true, from: F.from, to: F.to, id: F.id };
      } else {
        if (F.stage === 1) {
          // đổi sang ĐẦU chương đích (chương chạy như thường); cú bấm trong lúc mờ ở lại S.queue (go() ghi — cú CUỐI thắng) tới khi mờ xong
          F.stage = 2; F.t = 0;
          S.gate = null; S.from = F.from; S.to = F.to; S.dir = F.to > F.from ? 1 : -1;
          arrive(F.to, 'start', 0);
        } else if (!S.paused) F.t += dt;
        const x = clamp(F.t / F.D, 0, 1);
        info.fade = { p: x, capture: false, from: F.from, to: F.to, id: F.id, D: F.D };
        if (x >= 1) {
          S.fade = null;
          logE('mo-xong');
          emit('xong', F.from, F.to, 'mo');
          // (soát p11a B1) cú bấm nhớ trong lúc mờ: đi NGAY (mờ tiếp), không đợi khoá 0,4 s; không có thì khoá như thường
          if (!runQueue()) S.lockUntil = now() + LOCK_MS;
        }
      }
    }
    if (S.mode === 'trans' && !S.fade) {
      let u = 0;
      if (S.dir > 0) {
        if (S.gate) {
          // lăn sớm: chạng vạng chạy trước tới ngay trước mực thấm (dừng êm), chờ thung lũng, rồi mới đi nốt. Thung lũng sẵn giữa
          // chừng thì nối thẳng từ vị trí + vận tốc đang có (không dừng)
          const G = S.gate, DG = S.D * 0.6;
          if (G.phase === 0) {
            const x = clamp(S.t / DG, 0, 1);
            S.s = G.a + (G.s - G.a) * herm(x, 0, 0);
            S.v = ((G.s - G.a) * hermD(x, 0, 0)) / DG;
            if (x >= 1) G.phase = 1;
          }
          if (o.canGo(S.to)) {
            const rest = (S.s1 - S.s) / Math.max(1e-6, S.s1 - G.a);
            S.s0 = S.s; S.t = 0; S.D = Math.max(0.8, G.D * rest);
            S.m0 = (S.v * S.D) / Math.max(1e-6, S.s1 - S.s0); S.m1 = (vPlay(S.to) * S.D) / Math.max(1e-6, S.s1 - S.s0);
            S.gate = null; logE('het-cho');
          } else if (G.phase === 1) S.v = 0;
        }
        if (!S.gate) {
          const x = clamp(S.t / S.D, 0, 1);
          u = x;
          S.s = S.s0 + (S.s1 - S.s0) * herm(x, S.m0, S.m1);
          S.v = ((S.s1 - S.s0) * hermD(x, S.m0, S.m1)) / S.D;
          // tới nơi: phần thời gian dư của khung này chạy tiếp luôn trên đường trong chương (không có khung nào đứng yên ở mốc tới)
          if (x >= 1) { const v = S.v, over = S.t - S.D, fr = S.from, to = S.to; arrive(to, 'start', v); S.t = Math.max(0, over); emit('xong', fr, to); runQueue(); }
        }
        // cảnh đang rời: tư thế lúc rời + đà tắt dần + phần trôi thiết kế của chuyển cảnh (s đã đi được bao nhiêu từ mép chương)
        if (S.mode === 'trans') S.sOut = S.o0 + S.ov * TAU * (1 - Math.exp(-S.t / TAU)) + (S.s - CH[S.from].B);
      } else {
        const x = clamp(S.t / S.D, 0, 1);
        u = x;
        S.s = S.s0 + (S.s1 - S.s0) * inOut3(x);
        S.sOut = S.o0 + S.ov * TAU * (1 - Math.exp(-S.t / TAU)) - (S.s0 - S.s);
        S.v = 0;
        if (x >= 1) { const fr = S.from, to = S.to; arrive(to, 'end'); emit('xong', fr, to); runQueue(); }
      }
      info.u = u;
    } else if (S.mode === 'jump') {
      const x = clamp(S.t / S.D, 0, 1);
      // sIn: tư thế cảnh đến lúc tới nơi (đầu chương; giảm chuyển động thì trạng thái cuối) · id: mỗi cú nhảy một số (app.js chụp cảnh một lần)
      info.jump = { from: S.from, to: S.to, p: REDUCED ? x : inOut3(x), sOut: S.s0, sIn: REDUCED ? CH[S.to].B : CH[S.to].A, id: S.jid };
      if (x >= 1) { const fr = S.from, to = S.to; info.jump = null; arrive(to, 'start', 0); emit('xong', fr, to); runQueue(); }
    }
    if (S.mode === 'play') {
      const x = clamp(S.t / S.pD, 0, 1);
      S.s = S.pA + (S.pB - S.pA) * herm(x, S.pm, 0);
      S.v = ((S.pB - S.pA) * hermD(x, S.pm, 0)) / S.pD;
      S.sOut = S.s;
      if (x >= 1) { S.mode = 'idle'; S.v = 0; S.idleAt = now(); logE('nghi'); }
    }
    if (S.mode === 'idle') S.sOut = S.s;
    info.s = S.s; info.v = S.v; info.sOut = S.sOut; info.cur = S.cur; info.mode = S.mode; info.from = S.from; info.to = S.to; info.dir = S.mode === 'trans' ? S.dir : 0;
    info.target = moving() ? S.to : S.cur;
    info.waiting = S.mode === 'trans' && !!S.gate && S.gate.phase === 1;
    info.pend = S.pend ? S.pend.to : S.queue !== null ? S.queue : -1;   // chương người xem đã bấm / lăn tới mà chưa đi được (app.js: sáng ngay trên cột chương)
    info.idleK = S.mode === 'idle' && S.cur > 0 && !REDUCED ? clamp((now() - S.idleAt) / 1500, 0, 1) : 0;
    return info;
  }
  return {
    info, update, step, go,
    state() { return { s: S.s, sOut: S.sOut, v: +S.v.toFixed(4), cur: S.cur, mode: S.mode, to: S.to, locked: locked(), t: +S.t.toFixed(3), D: +S.D.toFixed(3), pend: S.pend ? S.pend.to : null, queue: S.queue, gate: S.gate ? S.gate.phase : null, fade: S.fade ? { to: S.fade.to, stage: S.fade.stage, t: +S.fade.t.toFixed(3) } : null, log: S.log.slice(-40) }; },
    fullLog() { return S.log.slice(); },
    // bài kiểm / chụp: đặt thẳng một chương (đầu, cuối, hay một phần của đường trong chương); dừng / chạy đồng hồ; tua một chuyển cảnh
    set(k, where = 'start') {
      S.cur = k; S.lockUntil = 0; S.gate = null; S.pend = null; S.queue = null; S.fade = null;
      const c = CH[k];
      if (typeof where === 'number') { S.mode = 'idle'; S.s = S.sOut = c.A + (c.B - c.A) * herm(clamp(where, 0, 1), M_PLAY, 0); S.v = 0; S.idleAt = now(); }
      else arrive(k, where, 0);
    },
    pause(v) { S.paused = !!v; },
    seekTrans(from, to, x) {
      S.fade = null;
      S.cur = from; S.s = S.sOut = to > from ? CH[from].B : CH[from].A; S.v = 0; S.lockUntil = 0; S.mode = 'idle'; S.gate = null; startTrans(to);
      S.t = clamp(x, 0, 1) * S.D; S.paused = true; update(0);
    },
    get reduced() { return REDUCED; },
  };
}
