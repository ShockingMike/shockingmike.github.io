// Chọn NẤC 緑青 cho từng chữ số, chấm, nét theo độ sáng THẬT của cảnh ngay sau nó.
//
// Vài lần mỗi giây (không phải mỗi khung): chép khung hình vừa vẽ — đúng cái người xem thấy, sau
// cả chuỗi hậu kỳ — xuống một ảnh nửa cỡ ngay trên card đồ hoạ, rồi đọc về BẤT ĐỒNG BỘ (không bắt
// card phải dừng chờ: đọc thẳng từng hộp nhỏ từng làm tụt 60 → 50 hình/giây). Từ ảnh ấy chọn nấc
// đạt ngưỡng (chữ ≥ 4,5:1, nét ≥ 3:1) theo luật trong page/accent.js. Nét đi qua nhiều nền (đường
// dẫn của nhãn đo đi từ mặt đá ra khoảng sương, nét nối vắt qua khe sáng giữa hai tảng) đổi nấc
// DỨT KHOÁT theo từng đoạn nền, kèm một quầng mảnh ngược tông để nét không đứt mắt ở chỗ đổi nền.
import { RAMP, pick, haloOf, Y as LUM } from '../page/accent.js';
const lumOf = (st) => LUM[st];

const NS = 'http://www.w3.org/2000/svg';
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const LUT = new Float32Array(256).map((_, i) => lin(i));
const MAXS = 48;          // số đoạn tối đa dọc một nét (mỗi đoạn một nấc)
const STEP_PX = 4;        // lấy mẫu mỗi 4 px dọc nét: mạch sáng giữa hai tảng chỉ rộng vài px

export function createTone(renderer, svg) {
  const gl = renderer.getContext();
  const defs = document.createElementNS(NS, 'defs');
  svg.insertBefore(defs, svg.firstChild);
  let gid = 0;

  // ── ảnh nửa cỡ đọc bất đồng bộ ─────────────────────────────────────────────
  const SCALE = 1.0;   // đủ độ phân giải: nét 1,6 px vắt qua mép tường trắng / mái sẫm cần đúng điểm ảnh
  let fb = null, rb = null, pbo = null, fw = 0, fh = 0, fence = null, data = null, frame = null;
  function ensure() {
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const w = Math.max(1, Math.floor(W * SCALE)), h = Math.max(1, Math.floor(H * SCALE));
    if (fb && w === fw && h === fh) return;
    if (fb) { gl.deleteFramebuffer(fb); gl.deleteRenderbuffer(rb); gl.deleteBuffer(pbo); }
    fw = w; fh = h;
    rb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, w, h);
    fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);
    pbo = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, w * h * 4, gl.STREAM_READ);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    data = new Uint8Array(w * h * 4);
  }
  // gọi NGAY SAU khi khung được vẽ ra màn
  function capture() {
    if (fence) return false;
    ensure();
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, fw, fh, gl.COLOR_BUFFER_BIT, gl.LINEAR);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
    gl.readPixels(0, 0, fw, fh, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    renderer.state.reset();          // báo three.js: trạng thái khung đệm đã bị đổi ngoài nó
    return true;
  }
  // gọi mỗi khung: ảnh đã về chưa?
  function poll() {
    if (!fence) return false;
    const st = gl.clientWaitSync(fence, 0, 0);
    if (st === gl.TIMEOUT_EXPIRED) return false;
    gl.deleteSync(fence); fence = null;
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, data);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    frame = { w: fw, h: fh, dpr: renderer.getPixelRatio() };
    return true;
  }

  // độ sáng (tuyến tính, như công thức tương phản) của một hộp trên màn, px CSS
  const tmp = new Float32Array(4096);
  function sampleRect(x, y, w, h) {
    if (!frame) return null;
    const k = frame.dpr * SCALE;
    const x0 = Math.max(0, Math.floor(x * k)), x1 = Math.min(frame.w - 1, Math.ceil((x + w) * k));
    const y0 = Math.max(0, Math.floor(y * k)), y1 = Math.min(frame.h - 1, Math.ceil((y + h) * k));
    let n = 0;
    for (let yy = y0; yy <= y1; yy++) {
      const row = frame.h - 1 - yy;           // ảnh đọc về lật dọc
      for (let xx = x0; xx <= x1 && n < 4096; xx++) {
        const i = (row * frame.w + xx) * 4;
        tmp[n++] = 0.2126 * LUT[data[i]] + 0.7152 * LUT[data[i + 1]] + 0.0722 * LUT[data[i + 2]];
      }
    }
    if (!n) return null;
    const v = tmp.subarray(0, n).slice().sort();
    return { lo: v[Math.floor(n * 0.05)], hi: v[Math.min(n - 1, Math.floor(n * 0.95))], mid: v[Math.floor(n / 2)] };
  }

  function gradient() {
    const g = document.createElementNS(NS, 'linearGradient');
    g.setAttribute('id', 'tg' + gid++);
    g.setAttribute('gradientUnits', 'userSpaceOnUse');
    const stops = [];
    for (let i = 0; i < MAXS * 2; i++) {
      const st = document.createElementNS(NS, 'stop');
      g.appendChild(st); stops.push(st);
    }
    defs.appendChild(g);
    return { g, stops };
  }

  // một NÉT có quầng: nét chính + nét quầng nằm dưới, cả hai tô bằng dải màu dọc theo nét
  function stroke(el, width) {
    const halo = document.createElementNS(NS, el.tagName);
    halo.setAttribute('class', 'tone-halo');
    el.parentNode.insertBefore(halo, el);
    const gm = gradient(), gh = gradient();
    el.style.stroke = `url(#${gm.g.id})`;
    halo.style.stroke = `url(#${gh.g.id})`;
    el.style.fill = 'none'; halo.style.fill = 'none';
    el.style.strokeWidth = String(width || 1.6);
    halo.style.strokeWidth = String((width || 1.6) + 2.2);
    return { el, halo, gm, gh, steps: new Array(MAXS).fill(0), x1: 0, y1: 0, x2: 0, y2: 0 };
  }
  function place(S, x1, y1, x2, y2) {
    S.x1 = x1; S.y1 = y1; S.x2 = x2; S.y2 = y2;
    for (const e of [S.el, S.halo]) {
      e.setAttribute('x1', x1.toFixed(1)); e.setAttribute('y1', y1.toFixed(1));
      e.setAttribute('x2', x2.toFixed(1)); e.setAttribute('y2', y2.toFixed(1));
    }
    for (const G of [S.gm, S.gh]) {
      G.g.setAttribute('x1', x1.toFixed(1)); G.g.setAttribute('y1', y1.toFixed(1));
      G.g.setAttribute('x2', x2.toFixed(1)); G.g.setAttribute('y2', y2.toFixed(1));
    }
  }
  // Lấy mẫu dọc nét mỗi ~4 px (hộp 3×3 px), mỗi đoạn một nấc; đổi nấc DỨT KHOÁT ở ranh hai đoạn
  // (hai nút màu trùng vị trí) — dải chuyển mềm sẽ đi qua vùng xám giữa, nơi không nấc nào đọc được.
  function toneStroke(S) {
    const len = Math.hypot(S.x2 - S.x1, S.y2 - S.y1);
    const n = Math.max(2, Math.min(MAXS, Math.round(len / STEP_PX)));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      // nét chỉ rộng 1,6 px: nền của nó là ĐÚNG điểm ảnh ngay dưới nó (trung vị ô 2×2), không phải
      // cả ô rộng — ô rộng trùm cả đá tối lẫn khe sáng nên không nấc nào "đạt" và chọn nhầm
      const bg = sampleRect(S.x1 + (S.x2 - S.x1) * t - 1, S.y1 + (S.y2 - S.y1) * t - 1, 2, 2);
      if (bg) S.steps[i] = pick({ lo: bg.mid, hi: bg.mid }, 'line', S.steps[i]);
    }
    for (const [G, main] of [[S.gm, true], [S.gh, false]]) {
      for (let i = 0; i < MAXS; i++) {
        const a = G.stops[i * 2], b = G.stops[i * 2 + 1];
        const j = Math.min(i, n - 1);
        const c = S.steps[j] ? (main ? RAMP[S.steps[j]] : haloOf(S.steps[j])) : (main ? RAMP[100] : RAMP[900]);
        a.setAttribute('offset', String(Math.min(1, j / n)));
        b.setAttribute('offset', String(Math.min(1, (j + 1) / n)));
        a.style.stopColor = c; b.style.stopColor = c;
      }
    }
  }
  // chữ số của lớp chấm: thử bốn góc quanh chấm, lấy góc đầu tiên có nền cho phép một nấc đạt 4,5:1
  // máy quay gần: nền quanh chấm lẫn tường trắng / mái đen / ô cửa — thêm vòng vị trí xa hơn để tìm mảng nền yên
  const OFFS = [[6, -4], [6, 15], [-27, -4], [-27, 15], [10, -14], [10, 24], [-31, -14], [-31, 24],
    [16, -26], [16, 36], [-37, -26], [-37, 36], [24, 5], [-45, 5], [-9, -24], [-9, 34]];
  // chọn vị trí cho tương phản CAO NHẤT (không phải vị trí đạt đầu tiên): chấm hay nằm ở ô cửa sẫm
  // giữa tường trắng, nền quanh nó lẫn sáng-tối
  // `taken`: hộp của các chấm và các số đã đặt — số không được đè lên chúng (hai số trên lầu từng đè nhau)
  function placeNumber(pe, taken) {
    if (!pe.at) return;
    let best = null, bv = -1e9;
    // con số dài (nhãn đo 1 800, 9 600…) rộng hơn hai chữ số: vị trí bên trái lùi thêm cho vừa
    const bw = Math.max(20, (pe.txt.textContent || '').length * 7.9 + 2);
    for (const o0 of OFFS) {
      const o = o0[0] < 0 ? [o0[0] - (bw - 20), o0[1]] : o0;
      const bx = pe.at.x + o[0] - 1, by = pe.at.y + o[1] - 11;
      const bg = sampleRect(bx - 3, by - 3, bw + 6, 19);   // nới 3 px mỗi bên: nền dưới chữ phải yên cả quanh viền chữ
      if (!bg) continue;
      const st = pick(bg, 'text');
      let v = contrastOf(st, bg);
      if (taken) for (const t of taken) {
        const ox = Math.min(bx + bw + 2, t.x + t.w) - Math.max(bx - 2, t.x), oy = Math.min(by + 13 + 2, t.y + t.h) - Math.max(by - 2, t.y);
        if (ox > 0 && oy > 0) v -= 100 + ox * oy;
      }
      const same = pe.off && o[0] === pe.off[0] && o[1] === pe.off[1];
      if (v > bv + (same ? -0.3 : 0)) { bv = v; best = o; }   // ưu tiên giữ chỗ cũ, chống nhảy
    }
    if (best) pe.off = best;
  }
  function contrastOf(st, bg) {
    const y = lumOf(st);
    return y > 0.3 ? (Math.max(y, bg.hi) + 0.05) / (Math.min(y, bg.hi) + 0.05) : (Math.max(y, bg.lo) + 0.05) / (Math.min(y, bg.lo) + 0.05);
  }
  function passes(st, bg, kind) {
    const need = kind === 'text' ? 4.5 : 3.0;
    const y = lumOf(st);
    return (y > 0.3 ? (Math.max(y, bg.hi) + 0.05) / (Math.min(y, bg.hi) + 0.05) : (Math.max(y, bg.lo) + 0.05) / (Math.min(y, bg.lo) + 0.05)) >= need;
  }
  // chữ (SVG text): tô nấc chữ, quầng mảnh ngược tông chỉ để đẹp
  function toneText(el, box) {
    const bg = sampleRect(box.x, box.y, box.w, box.h);
    if (!bg) return el._step;
    el._step = pick(bg, 'text', el._step);
    el.style.fill = RAMP[el._step];
    el.style.stroke = haloOf(el._step);
    return el._step;
  }
  function toneDot(dot, halo, x, y) {
    const bg = sampleRect(x - 4, y - 4, 8, 8);
    if (!bg) return;
    dot._step = pick(bg, 'line', dot._step);
    dot.style.fill = RAMP[dot._step];
    if (halo) halo.style.fill = RAMP[dot._step];
  }
  // chữ HTML (nhãn đo)
  function toneHTML(el) {
    const r = el.getBoundingClientRect();
    const bg = sampleRect(r.x, r.y, r.width, r.height);
    if (!bg) return el._step;
    el._step = pick(bg, 'text', el._step);
    el.style.color = RAMP[el._step];
    return el._step;
  }
  return { capture, poll, sampleRect, stroke, place, toneStroke, toneText, toneDot, toneHTML, placeNumber };
}
