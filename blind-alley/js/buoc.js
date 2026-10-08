const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const inOut3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

const mqGiam = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const giamCD = () => !!(mqGiam && mqGiam.matches);
export function makeBuoc(o) {
  const N = o.n;
  const LOCK_MS = 400, GAP_MS = 180;
  const S = { cur: o.start || 0, mode: 'idle', t: 0, D: 1, from: 0, to: 0, lockUntil: 0, lastWheel: -1e9, armed: true, fadeD: 0.7, queue: null, cho: 0 };
  const now = () => performance.now();
  const moving = () => S.mode !== 'idle';
  const locked = () => moving() || now() < S.lockUntil;
  function startMove(to) {
    S.mode = 'move'; S.from = S.cur; S.to = to; S.t = 0; S.D = o.moveD(S.from, to);
    if (o.onStart) o.onStart(S.from, to, 'move');
  }
  function startFade(to) {
    S.mode = 'fade'; S.from = S.cur; S.to = to; S.t = 0; S.D = S.fadeD;
    if (o.onStart) o.onStart(S.from, to, 'fade');
  }
  function step(dir) {
    if (!o.canInput()) { S.cho = dir; return false; }
    if (locked()) { if (!moving() && o.khiKhoa) o.khiKhoa(S.cur + dir); return false; }
    if (o.ngoai && o.ngoai(S.cur, dir)) return true;
    const to = S.cur + dir;
    if (to < 0 && o.huy) o.huy();
    if (to < 0 || to >= N || !o.canGo(to)) return false;
    if (dir > 0 && to === S.cur + 1 && !giamCD()) startMove(to); else startFade(to);
    return true;
  }
  function go(k) {
    if (!o.canInput() || k < 0 || k >= N || !o.canGo(k, true)) return false;
    if (moving()) { S.queue = k === S.to ? null : k; return false; }
    if (k === S.cur) { S.queue = null; if (o.huy) o.huy(); return false; }
    if (locked()) { S.queue = k; return false; }
    startFade(k); return true;
  }
  function cuChi() { S.queue = null; if (o.cuChiMoi) o.cuChiMoi(); }
  function update(dt) {
    if (S.cho && o.canInput()) { const d = S.cho; S.cho = 0; step(d); }
    if (S.mode === 'idle') {
      if (S.queue !== null && now() >= S.lockUntil) { const q = S.queue; S.queue = null; if (q !== S.cur) startFade(q); }
      return;
    }
    S.t += dt;
    if (S.t >= S.D) {
      S.cur = S.to; S.mode = 'idle'; S.t = S.D; S.lockUntil = now() + LOCK_MS;
      if (o.onArrive) o.onArrive(S.cur);
    }
  }
  function pos() {
    if (S.mode === 'move') return S.from + (S.to - S.from) * inOut3(clamp(S.t / S.D, 0, 1));
    if (S.mode === 'fade') return S.to;
    return S.cur;
  }
  function fade() { return S.mode === 'fade' ? 1 - clamp(S.t / S.D, 0, 1) : 0; }

  const vungRieng = (t) => !!(t && t.closest && t.closest('[data-cuon]'));
  const cuonDuoc = (el, dx, dy) => {
    const cs = getComputedStyle(el), doc = Math.abs(dy) >= Math.abs(dx);
    if (doc) { if (!/(auto|scroll)/.test(cs.overflowY) || el.scrollHeight <= el.clientHeight + 4) return false; return dy < 0 ? el.scrollTop > 4 : el.scrollTop + el.clientHeight < el.scrollHeight - 4; }
    if (!/(auto|scroll)/.test(cs.overflowX) || el.scrollWidth <= el.clientWidth + 1) return false;
    return dx < 0 ? el.scrollLeft > 0.5 : el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  };
  const giuLan = (t, dx, dy) => {
    const v = t && t.closest && t.closest('[data-cuon]'); if (!v) return false;
    for (let el = t; el && el.nodeType === 1; el = el.parentElement) { if (cuonDuoc(el, dx, dy)) return true; if (el === v) break; }
    return false;
  };
  const oGo = (t) => !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)));
  addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;
    const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
    const t = now(), gap = t - S.lastWheel; S.lastWheel = t;
    if (gap > GAP_MS) S.armed = true;
    if (giuLan(e.target, e.deltaX * k, e.deltaY * k)) { S.armed = false; return; }
    e.preventDefault();
    const dy = e.deltaY * k;
    if (!S.armed || Math.abs(dy) < 2) return;
    S.armed = false;
    cuChi();
    step(dy > 0 ? 1 : -1);
  }, { passive: false });
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    const tg = e.target;
    if (oGo(tg) || (vungRieng(tg) && e.key !== 'Home' && e.key !== 'End')) return;
    let d = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') d = 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') d = -1;
    else if (e.key === ' ' || e.key === 'Spacebar') { if (tg && tg.tagName === 'BUTTON') return; d = e.shiftKey ? -1 : 1; }
    else if (e.key === 'Home') { e.preventDefault(); if (!e.repeat) cuChi(); go(0); return; }
    else if (e.key === 'End') { e.preventDefault(); if (!e.repeat) cuChi(); go(o.lastBuilt()); return; }
    if (!d) return;
    e.preventDefault();
    if (!e.repeat) { cuChi(); step(d); }
  });
  return { S, step, go, cuChi, update, pos, fade, cur: () => S.cur, moving };
}
