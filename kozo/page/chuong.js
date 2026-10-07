// Lớp giao diện CHƯƠNG (phần 3, 25/9) — theo cách hubtown bày chương (bản nghiên cứu hubtown,
// mục 3.3, 3.4, 7.3), bằng hệ chữ Kōzō:
//   · chữ bốn góc của màn đầu tắt nhẹ khi trời ngả chạng vạng (chữ vẫn là HTML thật — chỉ đổi độ đục);
//   · khi mực loang sang thung lũng: khung vát góc SVG, logo nhỏ, cột chương dọc bên trái (chương đang đứng có ô 緑青
//     nở ra — không nháy) hiện dần THEO CUỘN;
//   · tiêu đề + mô tả căn giữa sát đáy hiện THEO THỜI GIAN bằng kiểu giải mã của page/decode.js khi vừa vào chương;
//     cuộn lui khỏi chương thì mờ đi (1 lần, không trượt). Vào lại thì giải mã lại.
// app.js gọi update(Z) mỗi khung (Z: corner · ui · text = vị trí trên dòng thời gian, màn · ch = ngưỡng hiện / tắt chữ ·
// navCur = chương đích lúc nhảy xa, -1 nếu không).
// PHẦN 7 (29/9): tên chương trên cột là LIÊN KẾT thật — bấm (hoặc Tab tới rồi Enter) là đi thẳng tới chương ấy (page/buoc.js).
import { decode, prepare } from './decode.js';
import { sealSVG, ACCENTS } from './accent.js';
import { COPY } from './copy.js';


export function createChuong() {
  const $ = (s) => document.querySelector(s);
  const corners = [...document.querySelectorAll('.s1 .c-tl, .s1 .c-tr, .s1 .c-bl, .s1 .c-br')];
  const logoLink = $('.s1 .logo-link');
  const khung = $('#khung'), path = $('#khung-path');
  const logo = $('#ch-logo'), chap = $('#chap'), sound = $('#ch-sound');
  // phần 4–9: mỗi chương một khối chữ (地 ruộng · 石垣 mỏ đá · 骨 rừng · 皮 làng giấy · 仕事 năm công trình · 連絡 liên hệ); app.js đưa ngưỡng
  // hiện / tắt của từng chương trong Z.ch
  const CH = ['dat', 'da', 'rung', 'lang', 'viec', 'lienhe'].map((id) => ({ el: $('#ch-' + id), head: $('#ch-' + id + '-h'), body: $('#ch-' + id + '-p'), shown: false }));
  for (const c of CH) { prepare(c.head); prepare(c.body); }
  const items = chap ? [...chap.querySelectorAll('li')] : [];
  const seal = $('#ch-seal');
  if (seal) seal.innerHTML = sealSVG(ACCENTS.rokusho.line, 18);

  // (vòng kiểm cuối) bố cục điện thoại: khổ hẹp HOẶC màn dọc — đúng điều kiện của style.css (máy tính bảng dọc dùng bố cục điện thoại)
  const HEP = window.matchMedia ? window.matchMedia('(max-width: 760px), (orientation: portrait)') : null;
  const hep = () => (HEP ? HEP.matches : window.innerWidth <= 760);
  // khung vát góc: cách mép 40 px, vát 30 px, hai đầu mỗi góc vát bo nhẹ (0,87 / 0,8 / 0,067 — hubtown mục 7.3)
  function drawFrame() {
    if (!path) return;
    const W = window.innerWidth, H = window.innerHeight, n = hep(), m = n ? 10 : 40, b = n ? 16 : 30;
    const x0 = m, y0 = m, x1 = W - m, y1 = H - m;
    path.setAttribute('d', [
      `M ${x0 + b} ${y0}`, `L ${x1 - b} ${y0}`, `Q ${x1 - b * 0.87} ${y0} ${x1 - b * 0.8} ${y0 + b * 0.067}`,
      `L ${x1 - b * 0.067} ${y0 + b * 0.8}`, `Q ${x1} ${y0 + b * 0.87} ${x1} ${y0 + b}`,
      `L ${x1} ${y1 - b}`, `Q ${x1} ${y1 - b * 0.87} ${x1 - b * 0.067} ${y1 - b * 0.8}`,
      `L ${x1 - b * 0.8} ${y1 - b * 0.067}`, `Q ${x1 - b * 0.87} ${y1} ${x1 - b} ${y1}`,
      `L ${x0 + b} ${y1}`, `Q ${x0 + b * 0.87} ${y1} ${x0 + b * 0.8} ${y1 - b * 0.067}`,
      `L ${x0 + b * 0.067} ${y1 - b * 0.8}`, `Q ${x0} ${y1 - b * 0.87} ${x0} ${y1 - b}`,
      `L ${x0} ${y0 + b}`, `Q ${x0} ${y0 + b * 0.87} ${x0 + b * 0.067} ${y0 + b * 0.8}`,
      `L ${x0 + b * 0.8} ${y0 + b * 0.067}`, `Q ${x0 + b * 0.87} ${y0} ${x0 + b} ${y0}`, 'Z'].join(' '));
  }
  drawFrame();
  addEventListener('resize', drawFrame);

  // logo nhỏ: về màn đầu (một chuyển cảnh gọn, không nhảy cụt). Bấm bằng CHUỘT thì bỏ viền focus ngay (p7a B9: viền đọng
  // lại ở tên chương cũ trong khi dấu chương đã sang chỗ khác); bấm bằng phím Enter thì giữ focus như thường
  const unfocus = (e, el) => { if (e.detail > 0) el.blur(); };
  if (logo) logo.addEventListener('click', (e) => { e.preventDefault(); unfocus(e, logo); const n = window.__kozoNav; if (n) n.go(0); });
  // tên chương: đi thẳng tới chương ấy
  const links = items.map((li) => li.querySelector('a[data-chuong]'));
  links.forEach((a) => { if (a) a.addEventListener('click', (e) => { e.preventDefault(); unfocus(e, a); const n = window.__kozoNav; if (n) n.go(+a.dataset.chuong); }); });
  // báo đổi chương cho máy đọc màn hình (vùng ẩn, lịch sự — không cắt ngang)
  const live = $('#ch-live');
  const NAMES = links.map((a) => (a ? (a.querySelector('[data-copy]') || a).textContent.trim() : ''));
  addEventListener('kozo:chuong', (e) => {
    if (!live || e.detail.loai !== 'xong') return;
    const k = e.detail.toi;
    live.textContent = k === 0 ? 'Studio Kōzō, opening view' : `Chapter ${k} of ${links.filter(Boolean).length}: ${NAMES[k - 1] || ''}`;
  });
  const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);


  const last = { corner: -1, ui: -1, uc: -1 };
  let cur = 0;   // chương đang đứng trên cột (đổi đúng lúc chữ chương mới bắt đầu hiện — hubtown mục 3.4)
  function setCur(i) {
    if (i === cur) return;
    cur = i;
    items.forEach((li, k) => { li.classList.toggle('on', k === i); const t = links[k] || li; if (k === i) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current'); });
  }
  const op = (v) => (v >= 0.999 ? '' : v.toFixed(3));
  function update(Z) {
    // chữ bốn góc
    const c = Math.round(Z.corner * 1000) / 1000;
    if (c !== last.corner) {
      last.corner = c;
      for (const el of corners) el.style.opacity = op(c);
      if (logoLink) { logoLink.style.pointerEvents = c < 0.5 ? 'none' : ''; logoLink.tabIndex = c < 0.5 ? -1 : 0; }   // chữ đang ẩn: Tab không dừng ở đó
    }
    // khung + logo nhỏ + cột chương + "Sound" — theo cuộn
    const u = Math.round(Z.ui * 1000) / 1000;
    if (u !== last.ui) {
      last.ui = u;
      const v = u <= 0 ? '0' : u >= 1 ? '1' : u.toFixed(3);
      if (khung) khung.style.opacity = v;
      if (logo) { logo.style.opacity = v; logo.style.pointerEvents = u > 0.5 ? 'auto' : 'none'; logo.tabIndex = u > 0.5 ? 0 : -1; }
      if (sound) sound.style.opacity = v;
    }
    // cột chương: như trên — (p10a B4) và hiện cả khi có cú bấm đang chờ ở màn đầu (Z.pendUi: ô 緑青 ở chương đích = trang đã nhận)
    const uc = Math.round(Math.max(Z.ui, Z.pendUi || 0) * 1000) / 1000;
    if (uc !== last.uc && chap) {
      last.uc = uc;
      chap.style.opacity = uc <= 0 ? '0' : uc >= 1 ? '1' : uc.toFixed(3);
      // từng dòng trượt vào 10 px, lệch nhau (hubtown mục 1.3: x +10 px → 0, lệch 0,05)
      items.forEach((li, i) => { const k = Math.min(1, Math.max(0, uc * 1.4 - i * 0.08)); li.style.setProperty('--in', (1 - Math.pow(1 - k, 3)).toFixed(3)); });
      chap.style.setProperty('--mk', uc > 0.6 ? '1' : '0');
      // bấm được / Tab tới được chỉ khi cột chương đã hiện
      chap.classList.toggle('mo', uc > 0.5);
      links.forEach((a) => { if (a) a.tabIndex = uc > 0.5 ? 0 : -1; });
    }
    // tiêu đề + mô tả của từng chương: hiện THEO THỜI GIAN (giải mã) khi vào chương, mờ đi (1 lần, không trượt) khi rời.
    // g = { in: hiện khi cuộn tới, out: tắt khi lui dưới, leave: tắt khi đi quá (sang chuyển cảnh kế), back: lui về tới đây
    // thì hiện lại } — hai chiều đều có khoảng trễ, không bật tắt liên hồi ở mép
    const sc = Z.text;
    let show = -1;
    CH.forEach((c, i) => {
      const g = Z.ch[i];
      if (!c.el || !g) return;
      if (!c.shown && sc >= g.in && sc <= g.back) {
        c.shown = true;
        c.el.style.transition = '';
        c.el.style.opacity = '1';
        c.el.style.visibility = '';
        // giảm chuyển động: không xáo ký tự, chỉ hiện dần (p7a B10)
        if (c.head) decode(c.head, { delay: 0.05, show: 0.5, scramble: 0.9, noScramble: REDUCED });
        if (c.body) decode(c.body, { delay: 0.3, show: 0.7, scramble: 1.1, noScramble: REDUCED });
      } else if (c.shown && (sc < g.out || sc > g.leave)) {
        c.shown = false;
        // (p11a A2 / B3) MỜ CHUYỂN: chữ chương cũ tắt gọn trong 0,18 s (app.js giữ chữ chương mới tới khi chữ cũ đã tắt hẳn —
        // không bao giờ hai tiêu đề chồng nhau); rời chương bằng chuyển cảnh thì tan 0,8 s như cũ
        c.el.style.transition = Z.textFast ? 'opacity 0.18s linear' : '';
        c.el.style.opacity = '0';
      }
      if (c.shown) show = i;
    });
    // ô 緑青: đổi đúng lúc chữ chương mới bắt đầu hiện; nhảy xa (bấm tên chương) thì sang chương đích ngay khi bấm
    const want = Z.navCur >= 1 ? Z.navCur - 1 : show;
    if (want >= 0) setCur(want);
    lh.update(CH[5].shown, Z.form6 ?? 0);
  }

  // ── PHẦN 9: chương 連絡 — form "đường mặt đất" ────────────────────────────────────────────────────────────────────────────────
  // Vừa tới: chỉ có đường mặt đất đang kẻ (--ve theo tiến độ chương); rồi nhãn, ô, nút hiện sau cùng (.hien) — trước lúc ấy form trơ
  // (inert: Tab không dừng ở ô chưa thấy). Rời chương: con trỏ đang ở trong ô thì nhả ra (bàn phím ảo đóng, phím lại đổi chương được).
  // Bấm Send (hoặc Enter trong ô): CHỈ hiện câu s8.demo — không gửi gì đi đâu, không lưu gì.
  // Điện thoại: tiêu đề + dẫn đặt ngay trên form; bàn phím ảo bật lên (khung nhìn co lại) thì form đứng ngay trên bàn phím và tiêu đề
  // nhường chỗ (lớp .chat) — ô đang gõ không bị che, bố cục không vỡ.
  const lh = (() => {
    const sec = $('#ch-lienhe'), form = $('#lh-form'), dau = $('#lh-dau'), demo = $('#lh-demo'), gui = $('#lh-gui');
    if (!sec || !form) return { update() {} };
    let on = false, hien = false, ve = -1, hideT = 0;
    const DEMO = COPY['s8.demo'];
    // tách chữ nhãn / nút thành ô SẴN lúc nạp (lần giải mã đầu khỏi phải tạo cả trăm phần tử trong một khung — cùng cách chữ chương)
    const decs = [...form.querySelectorAll('.nhan, .pick-t')];
    for (const e of decs) prepare(e);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      form.classList.add('sent');
      // (bấm lại lần nữa: đặt lại chữ để máy đọc màn hình đọc lại câu demo)
      demo.textContent = '';
      requestAnimationFrame(() => { demo.textContent = DEMO; });
      // (p10a B1) gửi xong: con trỏ rời nút / ô, sang câu demo (đứng đúng chỗ trong thứ tự Tab) — bàn phím ảo đóng, phím và vuốt
      // lại đổi chương được
      if (form.contains(document.activeElement)) demo.focus({ preventScroll: true });
    });
    // (p10a B7) Enter / phím "Next" trong ô: sang ô sau (ô cuối mới gửi — như form thật); Esc: nhả ô
    const oNhap = [...form.querySelectorAll('input, textarea')];
    form.addEventListener('keydown', (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      const i = oNhap.indexOf(e.target);
      if (e.key === 'Escape' || e.key === 'Esc') { if (i >= 0 || e.target === gui) { e.preventDefault(); e.target.blur(); } return; }
      if (e.key === 'Enter' && i >= 0 && i < oNhap.length - 1 && e.target.tagName === 'INPUT') { e.preventDefault(); oNhap[i + 1].focus(); }
    });
    // viền nút vát góc (SVG): vẽ theo cỡ thật của nút
    function vien() {
      if (!gui) return;
      const r = gui.getBoundingClientRect(), sv = gui.querySelector('svg.pk-vien');
      if (!sv || r.width < 2) return;
      const c = 13, w = r.width - 0.5, h = r.height - 0.5;
      sv.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
      sv.querySelector('path').setAttribute('d', `M 0.5 0.5 L ${w - c} 0.5 L ${w} ${c} L ${w} ${h} L ${c} ${h} L 0.5 ${h - c} Z`);
    }
    // điện thoại: tiêu đề ngay trên form; bàn phím ảo → form lên trên bàn phím, tiêu đề nhường chỗ
    const vv = window.visualViewport;
    // (p10a B2) trạng thái cho lớp cảnh (app.js): đang gõ trên điện thoại + mép trên của form (toạ độ khung trang = toạ độ khung
    // vẽ) — cảnh dời lên để sau form luôn là đúng phần tối như lúc nghỉ, không phải bãi đất có nét sáng
    const DO = { typing: false, formTop: 0 };
    function place() {
      if (!on) { DO.typing = false; return; }
      const mob = hep();
      let kb = 0;
      if (mob && vv) kb = Math.max(0, Math.round(innerHeight - (vv.height + vv.offsetTop)));
      const typing = form.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
      sec.style.setProperty('--kb', (mob && typing && kb > 60 ? kb : 0) + 'px');
      if (!mob) { dau.style.bottom = ''; sec.classList.remove('chat'); DO.typing = false; return; }
      const ft = form.getBoundingClientRect().top;
      const hb = innerHeight - ft + 26;
      dau.style.bottom = hb + 'px';
      const dh = dau.getBoundingClientRect().height;
      // chỗ trên form không đủ cho tiêu đề + dẫn (dưới logo ~70 px), hoặc ĐANG GÕ (bàn phím ảo mở — kiểu nào cũng vậy: khung nhìn chồng
      // lên trang, khung trang co lại, hay trang cuộn lên): tiêu đề + dẫn nhường chỗ (p10a B2: ngưỡng 70 px để lọt khung 508 px)
      sec.classList.toggle('chat', innerHeight - hb - dh < 70 || typing);
      DO.typing = typing; DO.formTop = form.getBoundingClientRect().top;
    }
    addEventListener('resize', () => { place(); vien(); });
    if (vv) { vv.addEventListener('resize', place); vv.addEventListener('scroll', place); }
    form.addEventListener('focusin', () => requestAnimationFrame(place));
    form.addEventListener('focusout', () => setTimeout(place, 120));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { place(); vien(); });
    return {
      state: () => DO,
      update(show, k) {
        if (show !== on) {
          on = show;
          clearTimeout(hideT);
          if (on) { sec.style.visibility = 'visible'; sec.inert = false; place(); vien(); }
          else {
            // rời chương: nhả con trỏ khỏi ô (bàn phím ảo đóng), form trơ ngay; ẩn hẳn sau khi chữ đã mờ đi
            if (sec.contains(document.activeElement)) document.activeElement.blur();
            sec.inert = true; form.inert = true;
            hideT = setTimeout(() => { if (!on) sec.style.visibility = 'hidden'; }, 850);
          }
        }
        const v = on ? Math.round(Math.min(1, Math.max(0, (k - 0.04) / 0.4)) * 1000) / 1000 : 0;
        if (v !== ve) { ve = v; form.style.setProperty('--ve', String(v)); }
        const h = on && k >= 0.5;
        if (h !== hien) {
          hien = h;
          form.classList.toggle('hien', h);
          form.inert = !h;
          if (h) { vien(); for (const e of decs) decode(e, { delay: 0.1, show: 0.5, scramble: 0.7, noScramble: REDUCED }); }
          if (!h) { form.classList.remove('sent'); demo.textContent = ''; }
        }
      },
    };
  })();
  return { update, drawFrame, state: () => ({ textIn: CH.map((c) => c.shown), cur }), lhDo: lh.state || (() => null) };
}
