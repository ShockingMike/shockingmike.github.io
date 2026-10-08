
const LUOI = { bt: 220.48 / 807.31, chu: 277.16 / 807.31 };
const MAU = { muc: '#17131a', dem: '#232a62', do: '#ff1f4f', giay: '#f3dcd6', giay70: '#b1a09e' };
const TOC = 30;
let LO = 5, BUOC = 10, LE = 3;
const N = 4096;

export function taoRanhTieng(nut, { am }) {
  nut.innerHTML = '<span class="phim" aria-hidden="true"><canvas></canvas></span>'
    + '<span class="nhan" aria-hidden="true"><span>Sound</span><span class="tt"></span></span>'
    + '<span class="loa" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path class="vo" d="M3 7.6h3.1L10.4 4v12L6.1 12.4H3z"/>'
    + '<path class="song" d="M13.3 7.3a3.9 3.9 0 0 1 0 5.4M15.7 5.1a7 7 0 0 1 0 9.8"/><path class="cheo" d="M13.6 8.1l3.8 3.8M17.4 8.1l-3.8 3.8"/></svg></span>';
  const cv = nut.querySelector('canvas'), g = cv.getContext('2d');
  const mqGiam = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const giam = () => !!(mqGiam && mqGiam.matches);
  const hist = new Float32Array(N);
  let bat = false, cot1 = 56, khe = 14, Wc = 0, Hc = 0, dpr = 1;
  let pos = 0, v = 0, van = 0, raf = 0, tVe = 0, buf = null, lat = 0;
  const do_ = { n: 0, tong: 0, max: 0, ghi: null };

  function docSong() {
    const a = am.daTao && am.phanTich ? am.phanTich() : null;
    if (!a) return false;
    if (!buf || buf.length !== a.fftSize) buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(buf); return true;
  }
  function muc(coSong) {
    if (!coSong) return 0;
    const n = 32, i0 = (lat = (lat + 97) % (buf.length - n));
    let p = 0; for (let i = i0; i < i0 + n; i++) { const x = buf[i] < 0 ? -buf[i] : buf[i]; if (x > p) p = x; }
    return Math.min(1, Math.max(0, (20 * Math.log10(p + 1e-6) + 32) / 28));
  }
  const SONG_TINH = (() => { const a = new Float32Array(N); let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < N; i++) a[i] = Math.min(1, Math.max(0.12, (0.62 + 0.22 * Math.sin(i * 0.083) + 0.14 * Math.sin(i * 0.021 + 1.3)) * (0.55 + 0.45 * r()))); return a; })();

  function co() {
    dpr = Math.min(3, window.devicePixelRatio || 1);
    const r = cv.getBoundingClientRect(); Wc = r.width; Hc = r.height;
    const w = Math.max(1, Math.round(Wc * dpr)), h = Math.max(1, Math.round(Hc * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }
  function ve() {
    const t0 = performance.now();
    if (!Wc || !Hc) co();
    if (!Wc || !Hc) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, Wc, Hc);
    const tinh = giam();
    g.fillStyle = MAU.muc; g.beginPath();
    const lech = tinh ? 0 : pos % BUOC, bo = g.roundRect ? (x, y) => g.roundRect(x, y, LO, LO, 1.5) : (x, y) => g.rect(x, y, LO, LO);
    for (let x = -BUOC - lech + 2; x < Wc + BUOC; x += BUOC) { const xx = Math.round(x * dpr) / dpr; bo(xx, LE); bo(xx, Hc - LE - LO); }
    const ty = LE + LO + (LO < 5 ? 2 : 3), th = Hc - 2 * ty, cy = ty + th / 2, xa = cot1 + khe, xb = Wc - 6, dau = xb - 7;
    g.rect(xa, ty, xb - xa, th); g.fill();
    const lang = !bat && van <= 0;
    g.fillStyle = lang ? MAU.giay70 : MAU.giay; g.beginPath();
    const k = bat ? 1 : van, nua = th / 2 - 1.5;
    for (let x = Math.floor(xa) + 1; x < dau; x++) {
      let a;
      if (tinh) a = bat ? SONG_TINH[x] : 0;
      else { const i = Math.floor(pos) - (dau - x); a = hist[((i % N) + N) % N] * k; }
      const h = Math.max(0.5, a * nua);
      g.rect(x, cy - h, 1, h * 2);
    }
    g.rect(dau, cy - 0.5, xb - dau, 1);
    g.fill();
    g.fillStyle = bat ? MAU.do : MAU.dem; g.fillRect(dau - 1, ty - 2, 3, th + 4);
    const d = performance.now() - t0; do_.n++; do_.tong += d; if (d > do_.max) do_.max = d; if (do_.ghi) do_.ghi.push(+d.toFixed(2));
  }
  function buoc(now) {
    raf = 0;
    if (document.hidden || giam()) return;
    if (now - tVe < 31.5) { raf = requestAnimationFrame(buoc); return; }
    const d = tVe ? Math.min(0.1, (now - tVe) / 1000) : 1 / 30; tVe = now;
    v += ((bat ? 1 : 0) - v) * (1 - Math.exp(-d / 0.16));
    if (!bat && v < 0.002) v = 0;
    if (!bat && van > 0) { van = Math.max(0, van - d / 0.45); if (van === 0) hist.fill(0); }
    const coSong = bat && docSong();
    const p1 = pos + TOC * v * d;
    for (let i = Math.floor(pos) + 1; i <= Math.floor(p1); i++) hist[i % N] = bat ? muc(coSong) : 0;
    pos = p1 % (N * BUOC);
    ve();
    if (bat || v > 0 || van > 0) raf = requestAnimationFrame(buoc);
  }
  function chay() {
    if (giam() || document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; ve(); return; }
    if (!raf) { tVe = 0; raf = requestAnimationFrame(buoc); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; } else chay(); });
  if (mqGiam && mqGiam.addEventListener) mqGiam.addEventListener('change', chay);
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { co(); ve(); }).observe(cv);

  const api = {
    ve(b) {
      b = !!b;
      if (b === bat && (raf || !b)) { if (!raf) ve(); return; }
      if (!b && bat) van = 1;
      if (b && van > 0) { for (let i = 0; i < N; i++) hist[i] *= van; van = 0; }
      bat = b; chay();
    },
    datCo(rong, theoLogo, gon = false) {
      const w = Math.round(rong);
      nut.classList.toggle('gon', !!gon);
      if (gon) { LO = 4; BUOC = 8; LE = 2; } else { LO = 5; BUOC = 10; LE = 3; }
      cot1 = gon ? 0 : theoLogo ? Math.round(rong * LUOI.bt) : 56;
      khe = gon ? 4 : theoLogo ? Math.round(rong * (LUOI.chu - LUOI.bt)) : 14;
      nut.style.setProperty('--nut-w', w + 'px'); nut.style.setProperty('--nut-c1', cot1 + 'px'); nut.style.setProperty('--nut-khe', khe + 'px');
      nut.classList.toggle('hep', !gon && cot1 < 56);
      co(); ve();
    },
    do: do_,
  };
  nut.__ranh = api;
  return api;
}
