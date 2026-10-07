// Chữ hiện ra kiểu GIẢI MÃ như igloo (mục 1.4 của bản nghiên cứu igloo):
// hai lớp chạy cùng lúc — gạt độ đục từ trái sang (≈ 0,4 s) và xáo ký tự: mỗi ô chữ nhảy qua vài
// ký tự khác rồi dừng đúng chữ, chữ bên trái dừng trước (≈ 0,75 s). Đường cong sine.out.
//
// CHỮ THẬT KHÔNG ĐỔI: mỗi đoạn chữ được tách thành một bản cho máy đọc màn hình (ẩn khỏi mắt,
// giữ nguyên chữ đúng) và một bản cho mắt (aria-hidden) — chỉ bản cho mắt bị xáo.
const LAT = 'ABCDEFGHJKLMNPRSTUVXYZ0123456789';
const NUM = '0123456789';
const CJK = '構造石垣地骨皮工房依頼';
const sineOut = (x) => Math.sin((Math.min(1, Math.max(0, x)) * Math.PI) / 2);

function split(el) {
  const cells = [];
  const walk = (node) => {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 3) {
        const t = ch.textContent;
        if (!t.trim()) continue;
        const wrap = document.createElement('span');
        const sr = document.createElement('span');
        sr.className = 'dc-sr'; sr.textContent = t;
        const vis = document.createElement('span');
        vis.setAttribute('aria-hidden', 'true');
        for (const c of t) {
          const s = document.createElement('span');
          s.className = 'dc-c'; s.textContent = c;
          vis.appendChild(s);
          if (c.trim()) cells.push({ s, c });
        }
        wrap.appendChild(sr); wrap.appendChild(vis);
        node.replaceChild(wrap, ch);
      } else if (ch.nodeType === 1 && !ch.classList.contains('dc-sr')) walk(ch);
    }
  };
  walk(el);
  return cells;
}

function pool(c) {
  if (/[0-9]/.test(c)) return NUM;
  if (/[぀-鿿]/.test(c)) return CJK;
  return LAT;
}

// tách chữ thành ô SẴN (lúc nạp trang, khi chữ còn ẩn): lần giải mã đầu khỏi phải tạo vài trăm phần tử trong một khung
// (chữ chương 地 bắt đầu hiện đúng lúc chuyển cảnh 1 đang vẽ cả hai cảnh — khung nặng nhất trang; đo 28/9: 1 khung 33 ms)
export function prepare(el) {
  if (!el || el._dcCells) return;
  el._dcCells = split(el);
  for (const q of el._dcCells) q.s.style.opacity = '0';
}

// el: phần tử chữ; o = { delay, show, scramble, noScramble, clock }
// clock (tuỳ chọn): hàm trả về số giây — màn mở dùng đồng hồ của nó để ?t=… đứng hình được cả phần chữ
export function decode(el, o = {}) {
  const delay = o.delay || 0, show = o.show || 0.4, scr = o.scramble || 0.75;
  // gọi lại được (màn mở tua lại khi kiểm): tách chữ MỘT lần, lần sau dùng lại các ô đã tách
  const cells = el._dcCells || (el._dcCells = split(el));
  const run = (el._dcRun = (el._dcRun || 0) + 1);
  const n = Math.max(1, cells.length);
  cells.forEach((q, i) => { q.s.style.opacity = '0'; q.op = '0'; q.p = pool(q.c); q.k = i / n; q.last = -1; });
  const t0 = performance.now();
  function tick(now) {
    if (run !== el._dcRun) return;   // đã có lần chạy mới
    const tc = o.clock ? o.clock() : (now - t0) / 1000;
    const t = tc - delay;
    let done = true;
    for (const q of cells) {
      // gạt độ đục: mép gạt mềm rộng ~10% câu
      const op = sineOut((t / show - q.k) / 0.1 + 0.5);
      // chỉ ghi khi đổi (ghi lại cùng giá trị vẫn làm trình duyệt tính lại kiểu chữ mỗi khung — đo 25/9: chữ giải mã làm
      // chậm khung ở giây 4,5–5,5 của màn mở)
      const opS = op.toFixed(2);
      if (opS !== q.op) { q.op = opS; q.s.style.opacity = opS; }
      // xáo: ô bên trái dừng trước; trước khi dừng thì cứ ~55 ms đổi một ký tự
      const settle = scr * (0.25 + 0.75 * q.k);
      if (!o.noScramble && t < settle) {
        done = false;
        const step = Math.floor((tc * 1000) / 55);
        if (step !== q.last && op > 0) { q.last = step; q.s.textContent = q.p[(step * 7 + Math.floor(q.k * 97)) % q.p.length]; }
      } else if (q.s.textContent !== q.c) q.s.textContent = q.c;
      if (op < 1) done = false;
    }
    if (!done) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
