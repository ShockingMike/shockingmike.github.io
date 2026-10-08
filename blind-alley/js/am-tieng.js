
const TAU = Math.PI * 2;
export function taoRnd(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ngau = (r, a, b) => a + (b - a) * r();
export function bq(loai, f, Q, sr) {
  const w = TAU * Math.min(f, sr * 0.45) / sr, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * Q);
  let b0, b1, b2, a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
  if (loai === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; }
  else if (loai === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
  else { b0 = al; b1 = 0; b2 = -al; }
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
function tat(a, sr, t0, f, amp, tau, pha = 0) {
  const n0 = Math.max(0, Math.floor(t0 * sr)), n = Math.min(a.length - n0, Math.ceil(tau * sr * 7));
  if (f >= sr * 0.47 || n <= 0) return;
  const w = TAU * f / sr, c = Math.cos(w), s = Math.sin(w), r = Math.exp(-1 / (tau * sr));
  let x = amp * Math.sin(pha), y = amp * Math.cos(pha);
  const mo = Math.max(1, Math.round(sr * 0.0004));
  for (let i = 0; i < n; i++) { a[n0 + i] += x * Math.min(1, i / mo); const nx = (x * c + y * s) * r; y = (y * c - x * s) * r; x = nx; }
}
function nhat(a, sr, t0, d, amp, rnd, loc, mu = 1) {
  const n0 = Math.floor(t0 * sr), n = Math.min(a.length - n0, Math.ceil(d * sr));
  const fs = loc.map(([l, f, q]) => bq(l, f, q, sr));
  for (let i = 0; i < n; i++) {
    let x = rnd() * 2 - 1; for (const f of fs) x = f(x);
    const u = i / n; a[n0 + i] += x * amp * Math.pow(1 - u, mu) * Math.min(1, i / (sr * 0.0005));
  }
}
function bong(a, sr, t0, f0, amp, d, len) {
  const n0 = Math.floor(t0 * sr), n = Math.min(a.length - n0, Math.ceil(7 / d * sr)), k = Math.exp(-d / sr), mo = sr * 0.0012;
  let ph = 0, env = amp;
  for (let i = 0; i < n; i++) { const t = i / sr; ph += TAU * f0 * (1 + len * d * t) / sr; a[n0 + i] += Math.sin(ph) * env * Math.min(1, i / mo); env *= k; }
}
function* loc(a, sr, l, f, q) { const g = bq(l, f, q, sr); for (let i = 0; i < a.length; i++) { a[i] = g(a[i]); if ((i & 16383) === 0) yield; } }

export function* ritThuoc(a, sr, rnd, { dinh = 0.62 } = {}) {
  const T = a.length / sr;
  const env = (t) => (t < dinh ? Math.pow(t / dinh, 1.6) : Math.exp(-(t - dinh) / 0.28));
  let t = 0.05;
  while (t < T - 0.05) {
    const e = env(t);
    t += 1 / (8 + 70 * e) * (0.3 - Math.log(1 - rnd()) * 0.7);
    if (t >= T - 0.05) break;
    const amp = e * (0.25 + 0.75 * Math.pow(rnd(), 2.2));
    const f = ngau(rnd, 1000, 3200);
    nhat(a, sr, t, ngau(rnd, 0.0008, 0.0024), amp, rnd, [['bp', f, 1.4], ['lp', 4800, 0.7]], 1.5);
    if (rnd() < 0.18) tat(a, sr, t, ngau(rnd, 2600, 3800), amp * 0.12, 0.003);
    if ((Math.floor(t * 50) & 3) === 0) yield;
  }
  const bp = bq('bp', 520, 0.7, sr), lp = bq('lp', 900, 0.7, sr);
  for (let i = 0; i < a.length; i++) { a[i] += lp(bp(rnd() * 2 - 1)) * 0.13 * env(i / sr); if ((i & 16383) === 0) yield; }
}
export function* tichTac(a, sr, rnd, k = 1) {
  nhat(a, sr, 0.0005, 0.0012, 0.5, rnd, [['hp', 1500, 0.7]], 2);
  for (const [f, g, tau] of [[2350, 0.5, 0.006], [3720, 0.32, 0.004], [5150, 0.18, 0.0025], [1180, 0.3, 0.009]]) tat(a, sr, 0.0005, f * k * ngau(rnd, 0.99, 1.01), g, tau, rnd() * TAU);
  tat(a, sr, 0.0008, 610 * k, 0.35, 0.014);
  yield* loc(a, sr, 'lp', 7000, 0.7);
}

export function* giotMua(a, sr, rnd, vung) {
  if (vung) {
    nhat(a, sr, 0.001, 0.0015, 0.25, rnd, [['lp', 3500, 0.7]], 2);
    bong(a, sr, 0.002, ngau(rnd, 1300, 2600), 0.5, ngau(rnd, 55, 95), ngau(rnd, 0.06, 0.14));
  } else {
    nhat(a, sr, 0.001, ngau(rnd, 0.002, 0.004), 0.6, rnd, [['bp', ngau(rnd, 900, 2200), 0.9], ['lp', 4000, 0.7]], 2);
    tat(a, sr, 0.001, ngau(rnd, 220, 380), 0.25, 0.012);
  }
  yield* loc(a, sr, 'lp', 4800, 0.7);
}
export function* phimRoi(a, sr, rnd) {
  nhat(a, sr, 0.002, 0.016, 0.42, rnd, [['lp', 2600, 0.7], ['hp', 140, 0.7]], 2.2);
  tat(a, sr, 0.002, 165, 0.35, 0.03);
  bong(a, sr, 0.006, 340, 0.5, 26, 0.25);
  bong(a, sr, 0.012, 760, 0.35, 30, 0.12);
  bong(a, sr, 0.04, 1480, 0.16, 50, 0.1);
  for (const t of [0.17, 0.24, 0.31]) bong(a, sr, t + ngau(rnd, -0.01, 0.01), ngau(rnd, 1600, 2600), 0.07, 90, 0.1);
  yield* loc(a, sr, 'lp', 4200, 0.7);
}
export function* keoKhung(a, sr, rnd) {
  const k = ngau(rnd, 0.97, 1.04);
  nhat(a, sr, 0.001, 0.001, 0.6, rnd, [['hp', 1200, 0.7]], 2);
  for (const [f, g, tau] of [[1310, 0.45, 0.009], [2780, 0.35, 0.006], [4550, 0.15, 0.003]]) tat(a, sr, 0.001, f * k, g, tau, rnd() * TAU);
  tat(a, sr, 0.0015, 178 * k, 0.5, 0.022);
  nhat(a, sr, 0.004, 0.009, 0.1, rnd, [['bp', 2100, 1.2]], 1.2);
  yield* loc(a, sr, 'lp', 7000, 0.7);
}
export function* chotKhung(a, sr, rnd) {
  for (const [t0, g] of [[0.002, 0.8], [0.027, 1]]) {
    nhat(a, sr, t0, 0.0015, 0.7 * g, rnd, [['hp', 700, 0.7]], 2);
    for (const [f, gg, tau] of [[920, 0.5, 0.02], [2140, 0.35, 0.012], [3350, 0.12, 0.08]]) tat(a, sr, t0, f, gg * g, tau, rnd() * TAU);
    tat(a, sr, t0 + 0.001, 122, 0.6 * g, 0.045);
  }
  yield* loc(a, sr, 'lp', 6500, 0.7);
}

export function* reLien(a, sr, rnd) {
  let ph = 0, troi = 0;
  const lp = bq('lp', 2300, 0.7, sr), hp = bq('hp', 90, 0.7, sr), lpR = bq('lp', 180, 0.7, sr), lpT = bq('lp', 12, 0.7, sr);
  for (let i = 0; i < a.length; i++) {
    troi = lpT(rnd() * 2 - 1) * 25;
    ph += 100 * (1 + 0.015 * Math.tanh(troi)) / sr; if (ph >= 1) ph -= 1;
    let s = 0; for (let h = 1; h <= 14; h++) s += Math.sin(TAU * h * ph) / Math.pow(h, 1.35);
    const run = lpR(rnd() * 2 - 1) * 6;
    a[i] = hp(lp(s * (0.55 + 0.45 * Math.tanh(run))));
    if ((i & 4095) === 0) yield;
  }
}
export function* xetDien(a, sr, rnd) {
  nhat(a, sr, 0.001, ngau(rnd, 0.0015, 0.003), 0.8, rnd, [['bp', ngau(rnd, 1500, 3200), 1.2]], 2);
  nhat(a, sr, 0.012, 0.002, 0.4, rnd, [['bp', ngau(rnd, 1500, 3200), 1.2]], 2);
  yield* loc(a, sr, 'lp', 4500, 0.7);
}

export function* netChi(a, sr, rnd, dai) {
  const n = Math.min(a.length, Math.floor(dai * sr));
  const bp = bq('bp', ngau(rnd, 1700, 2400), 0.9, sr), hp = bq('hp', 700, 0.7, sr), lp = bq('lp', 4200, 0.7, sr);
  let toi = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n, v = Math.pow(Math.sin(Math.PI * u), 0.6), env = Math.min(1, u / 0.08) * Math.min(1, (1 - u) / 0.15);
    let x = (rnd() * 2 - 1) * 0.1;
    if (i >= toi) { x += (rnd() < 0.5 ? -1 : 1) * (0.4 + 0.6 * rnd()); toi = i + Math.max(1, Math.floor(sr / ((250 + 900 * v) * (0.5 + rnd())))); }
    a[i] = lp(hp(bp(x))) * env;
    if ((i & 8191) === 0) yield;
  }
}
export function* keoDay(a, sr, rnd) {
  const T = a.length / sr, D = Math.min(T - 0.05, ngau(rnd, 0.35, 0.5));
  let t = 0.01;
  const R = [[430, 0.02], [960, 0.012], [1720, 0.007], [2650, 0.004]].map(([f, tau]) => [f * ngau(rnd, 0.97, 1.03), tau]);
  while (t < D) {
    const u = t / D, nhip = 38 + 55 * Math.sin(Math.PI * u), amp = Math.sin(Math.PI * u) * ngau(rnd, 0.6, 1);
    for (const [f, tau] of R) tat(a, sr, t, f * (1 + 0.04 * u), amp * 0.3, tau, rnd() * TAU);
    t += 1 / nhip * ngau(rnd, 0.85, 1.15);
    yield;
  }
  yield* loc(a, sr, 'lp', 4200, 0.7);
}

export function* phimMayChu(a, sr, rnd, kieu = 'phim') {
  const k = ngau(rnd, 0.96, 1.05), kim = kieu === 'cach' ? 0.25 : 1;
  nhat(a, sr, 0.001, 0.0012, 0.7, rnd, [['hp', 900, 0.7]], 2);
  for (const [f, g, tau] of [[2280, 0.5, 0.005], [3870, 0.32, 0.0035], [5550, 0.15, 0.002]]) tat(a, sr, 0.001, f * k, g * kim, tau, rnd() * TAU);
  tat(a, sr, 0.0012, 255 * k, 0.55, 0.02);
  tat(a, sr, 0.0012, 640 * k, 0.25, 0.01);
  nhat(a, sr, 0.003, 0.012, 0.12, rnd, [['bp', 1500, 1.0]], 1.5);
  tat(a, sr, 0.026, 4100 * k, 0.1, 0.002);
  nhat(a, sr, 0.026, 0.002, 0.12, rnd, [['hp', 2500, 0.7]], 2);
  yield* loc(a, sr, 'lp', 7500, 0.7);
}
export function* chuongMayChu(a, sr, rnd) {
  for (const [f, g, tau] of [[1850, 0.32, 0.7], [1853, 0.26, 0.65], [1850 * 2.02, 0.09, 0.35], [1850 * 2.76, 0.08, 0.22], [1850 * 4.07, 0.03, 0.1], [1850 * 5.4, 0.015, 0.06]]) tat(a, sr, 0.002, f, g, tau, rnd() * TAU);
  nhat(a, sr, 0.001, 0.001, 0.12, rnd, [['hp', 1500, 0.7]], 2);
  yield* loc(a, sr, 'lp', 6000, 0.7);
}
export function* dongDau(a, sr, rnd) {
  nhat(a, sr, 0.003, 0.007, 0.55, rnd, [['lp', 2400, 0.7], ['hp', 120, 0.7]], 1.5);
  tat(a, sr, 0.003, 104, 0.9, 0.065);
  tat(a, sr, 0.0035, 232, 0.55, 0.035);
  tat(a, sr, 0.004, 655, 0.28, 0.018);
  tat(a, sr, 0.004, 1430, 0.12, 0.008);
  nhat(a, sr, 0.012, 0.06, 0.05, rnd, [['bp', 2000, 0.8], ['lp', 3500, 0.7]], 1.2);
  nhat(a, sr, 0.29, 0.012, 0.12, rnd, [['bp', 1700, 1.2]], 1.5);
  tat(a, sr, 0.29, 820, 0.05, 0.01);
  yield* loc(a, sr, 'lp', 6000, 0.7);
}
