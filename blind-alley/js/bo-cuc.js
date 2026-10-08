import { catDong, diemChu } from './chu-cat.js';
import { CHU } from './chu.js';

export const KIEU = {
  than: {
    font: 'Special Elite', tep: './fonts/special-elite.woff2',
    fs1920: 21, fsMin: 17, fsMax: 28, fsTile: 1 / 7.5,
    fsDt: 17, fsNgang: 16,
    lh: 1.55, lhDt: 1.55, lhNgang: 1.5,
    cotEm: 26.1,
    mau: '#F3DCD6',
    lechChan: 0.55, damNhat: [0.86, 1], hat: 7,
    bu: 0.05,
    goMoiGiay: 400,
    gach: { thut: 1.1, cach: 0.5, nghi: 0.12, dai: 0.8, day: 0.22, goc: 60 },
  },
  nhan: { tile: 15 / 21, min: 13, max: 20, fsDt: 13, fsNgang: 13, gian: 0.24, bu: 0.06 },
  goiY: { fs: 14, fsDt: 13, gian: 0.18, gianDt: 0.12, cach: 30, cachDt: 14 },
  dtKhe: 52,
  tieuDe: { cap1920: 158, gian: 0.06, seed: [11, 18, 25], daiE: 0.24, cheE: 0.07 },
};

const lerp = (a, b, t) => a + (b - a) * t, cl = (x, a, b) => Math.min(b, Math.max(a, x));

export const DT = {
  le: 20,
  tren: 72,
  khe: 20,
  day: 22,
  nhanKhe: 16,
  gian: 1.12,
};
export function khoiDt(o, txt, caps0, seeds, neo, y0, { nhan = 0, gian = DT.gian, co: coThem = 1 } = {}) {
  const k = cl(o.W / 390, 0.8, 1.9);
  const fs = Math.round(KIEU.than.fsDt * cl(k * 0.8, 1, 1.4)), lh = KIEU.than.lhDt;
  const kh = cl((o.H - 160) / (844 - 160), 0.72, 1);
  let caps = caps0.map((c) => c * k * kh * coThem);
  const rong = o.W - 2 * DT.le;
  let dd = txt.map((t, i) => doDong(o.font, t, caps[i], seeds[i]));
  const co = Math.min(1, ...dd.map((d) => rong / (d.inkPhai - d.inkTrai)));
  if (co < 1) { caps = caps.map((c) => c * co); dd = txt.map((t, i) => doDong(o.font, t, caps[i], seeds[i])); }
  const LE = DT.le, cot = Math.round(rong);
  const n = o.demDong(fs, cot, lh), thanH = n * fs * lh;
  const nfs = nhan ? Math.round(nhan * cl(k * 0.8, 1, 1.4)) : 0;
  let tdH = caps[0]; for (let i = 1; i < caps.length; i++) tdH += gian * caps[i];
  const cao = (nfs ? nfs * 1.2 + DT.nhanKhe : 0) + tdH + DT.khe + thanH;
  const top = neo === 'tren' ? y0 : y0 - cao;
  let y = top + (nfs ? nfs * 1.2 + DT.nhanKhe : 0) + caps[0];
  const dongs = txt.map((t, i) => { if (i) y += gian * caps[i]; return { text: t, x: LE - dd[i].inkTrai, y, cap: caps[i], seed: seeds[i] }; });
  const than = { x: LE - KIEU.than.bu * fs, y: y + DT.khe, fs, lh, cot, n };
  return { dongs, than, LE, top, bot: than.y + thanH, cap: Math.max(...caps), k, nhan: { x: LE - KIEU.nhan.bu * (nfs || 13), y: top, fs: nfs || 13 } };
}

export function doDong(font, text, cap, seed) {
  const cat = catDong(font, text.toUpperCase(), cap, seed, KIEU.tieuDe.gian);
  const ink = (c) => { let x0 = 1e9, x1 = -1e9; for (const v of c.vong) for (const p of v.pts) { const q = diemChu(c, 0, 0, p); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); } return [x0, x1]; };
  const ds = cat.chu.filter((c) => c.ch !== '.');
  return { w: cat.w, inkTrai: ink(cat.chu[0])[0], inkPhaiChu: ink(ds[ds.length - 1])[1], inkPhai: ink(cat.chu[cat.chu.length - 1])[1] };
}

export function tinhBoCuc(o) {
  const T = KIEU.tieuDe, words = CHU.studio.tieuDe.split(' ');
  const timN = (f, dich, a = 0, b = 6.5) => { for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (f(m) < dich) a = m; else b = m; } return (a + b) / 2; };
  if (o.kieu === 'may') {
    const s = Math.min(o.W / 1920, o.H / 1080);
    const cap = T.cap1920 * s;
    const fs = Math.round(cl(cap * KIEU.than.fsTile, KIEU.than.fsMin, KIEU.than.fsMax));
    const nfs = Math.round(cl(fs * KIEU.nhan.tile, KIEU.nhan.min, KIEU.nhan.max));
    const lh = KIEU.than.lh, cot = Math.max(Math.round(fs * KIEU.than.cotEm), Math.ceil(o.rongGach(fs)) + 2);
    const nDong = o.demDong(fs, cot, lh), thanH = nDong * fs * lh;
    const gapB = 36 * s + 4;
    const D = o.cua(3) - o.mu(3).top;
    const b = cl(Math.min(0.72 * cap, D - 6 - gapB - thanH), 0.38 * cap, 0.8 * cap);
    const nhanTop = cl(lerp(0.11, 0.046, (s - 0.711) / 0.289), 0.046, 0.11) * o.H;
    const n = cl(timN((m) => o.mu(m).top, nhanTop + 378 * s - b), 0, 6.5);
    const mu = o.mu(n);
    const y2 = mu.top + b, y1 = y2 - 182 * s;
    const x1 = 70 * s;
    const d1 = doDong(o.font, words.slice(0, 2).join(' '), cap, T.seed[0]), d2 = doDong(o.font, words.slice(2).join(' '), cap, T.seed[1]);
    const x2 = cl(mu.trai(y2 - KIEU.tieuDe.daiE * cap, y2 + 0.02 * cap) + KIEU.tieuDe.cheE * cap - d2.inkPhaiChu, x1 + 0.12 * cap, x1 + 0.6 * cap);
    const LE = x1 + d1.inkTrai;
    return {
      kieu: 'may', n, s, cap, logo: 'phai',
      dongs: [{ text: words.slice(0, 2).join(' '), x: x1, y: y1, cap, seed: T.seed[0] }, { text: words.slice(2).join(' '), x: x2, y: y2, cap, seed: T.seed[1] }],
      nhan: { x: LE - KIEU.nhan.bu * nfs, y: y1 - cap - 38 * s, fs: nfs },
      than: { x: LE - KIEU.than.bu * fs, y: y2 + gapB, fs, lh, cot, n: nDong },
      LE,
    };
  }
  if (o.kieu === 'dt') {
    const txt = [words[0], words.slice(1, 3).join(' '), words.slice(3).join(' ')];
    const nMax = timN((m) => o.lua(m).y, o.H - o.dai - 40);
    let B = null, n = 0;
    for (const co of [1, 0.92, 0.85, 0.78, 0.72, 0.66]) {
      B = khoiDt(o, txt, [64, 46, 66], T.seed, 'tren', DT.tren, { nhan: KIEU.nhan.fsDt, co });
      n = cl(timN((m) => o.mu(m).top, B.bot + 28 * B.k), 0, 6.5);
      if (n <= nMax) break;
    }
    n = Math.min(n, nMax);
    return { kieu: 'dt', n, s: B.k, cap: B.cap, logo: 'phai', dongs: B.dongs, nhan: B.nhan, than: B.than, LE: B.LE };
  }
  const fs = KIEU.than.fsNgang, nfs = KIEU.nhan.fsNgang, lh = KIEU.than.lhNgang;
  const DN = !!o.dtNgang, nhanYN = 16 + 30 + 14, topTD = DN ? nhanYN + nfs * 1.2 + 12 : 16 + 32 + 14, thanY = 18 + nfs + 10;
  const thanDay0 = DN ? topTD : thanY + o.demDong(fs, Math.round(o.W * 0.39), lh) * fs * lh;
  let n = Math.max(5, cl(timN((m) => o.mu(m).top, thanDay0 + 12), 0, 6.5));
  n = Math.min(n, timN((m) => o.lua(m).y, o.H - o.dai - 30));
  const mu = o.mu(n);
  if (DN) {
    const full = words.join(' ');
    let capN = cl(o.H * 0.09, 26, 40), dN = doDong(o.font, full, capN, T.seed[0]);
    if (dN.w > 0.62 * o.W) { capN *= 0.62 * o.W / dN.w; dN = doDong(o.font, full, capN, T.seed[0]); }
    const xN = 16, yN = topTD + capN, LEN = xN + dN.inkTrai, cotN = Math.round(o.W * 0.53);
    return { kieu: 'ngang', n, s: capN / 158, cap: capN, logo: 'trai', dongs: [{ text: full, x: xN, y: yN, cap: capN, seed: T.seed[0] }],
      nhan: { x: LEN - KIEU.nhan.bu * nfs, y: nhanYN, fs: nfs }, than: { x: LEN - KIEU.than.bu * fs, y: Math.round(yN + 14), fs, lh, cot: cotN, n: o.demDong(fs, cotN, lh) }, LE: LEN };
  }
  let cap = cl(o.H * 0.13, 34, 60);
  const x1 = 16, top = topTD;
  let d1 = doDong(o.font, words.slice(0, 2).join(' '), cap, T.seed[0]), d2 = doDong(o.font, words.slice(2).join(' '), cap, T.seed[1]);
  const y2max = mu.top + 0.35 * cap;
  if (top + cap * 2.15 > y2max) cap = Math.max(30, (y2max - top) / 2.15);
  d1 = doDong(o.font, words.slice(0, 2).join(' '), cap, T.seed[0]); d2 = doDong(o.font, words.slice(2).join(' '), cap, T.seed[1]);
  const y1 = top + cap, y2 = y1 + 1.15 * cap;
  const x2 = cl(mu.trai(y2 - KIEU.tieuDe.daiE * cap, y2 + 0.02 * cap) + KIEU.tieuDe.cheE * cap - d2.inkPhaiChu, x1 + 0.12 * cap, x1 + 0.6 * cap);
  const LE = x1 + d1.inkTrai;
  const phai = Math.max(x1 + d1.w, x2 + d2.w) + 28;
  const cot = Math.round(o.W - 16 - phai);
  const nDong = o.demDong(fs, cot, lh);
  return {
    kieu: 'ngang', n, s: cap / 158, cap, logo: 'trai',
    dongs: [{ text: words.slice(0, 2).join(' '), x: x1, y: y1, cap, seed: T.seed[0] }, { text: words.slice(2).join(' '), x: x2, y: y2, cap, seed: T.seed[1] }],
    nhan: { x: phai - KIEU.nhan.bu * nfs, y: 18, fs: nfs },
    than: { x: phai - KIEU.than.bu * fs, y: thanY, fs, lh, cot, n: nDong },
    LE,
  };
}

export const KIEU2 = {
  tieuDe: { cap1920: 116, gian: 0.06, seed: [31, 44, 57] },
  may: { fov: 38, fy: 0.4, fx: [0.58, 0.8], cat: 1.47 },
  ngang: { fov: 34, fy: 0.44, fx: [0.6, 0.86], cat: 1.47, cot: 0.4 },
  dt: { fov: 56, fy: 0.26, fx: [0.45, 1.15], cot: 0.56, cotThan: 0.94, leDay: 12, khe: 12, lui: 0, cat: 1.47, camX: 0.45, td: 0.56 },
  le: 40,
};
export function tinhBoCuc2(o) {
  const T = KIEU2.tieuDe, cl2 = (x, a, b) => Math.min(b, Math.max(a, x));
  const words = o.tieuDe.split(' ');
  if (o.kieu === 'may') {
    const s = Math.min(o.W / 1920, o.H / 1080);
    const cap = T.cap1920 * s;
    const fs = Math.round(cl2(21 * s, KIEU.than.fsMin, KIEU.than.fsMax)), lh = KIEU.than.lh;
    const cot = Math.round(fs * KIEU.than.cotEm);
    const txt = [words.slice(0, 3).join(' '), words.slice(3).join(' ')];
    const x1 = 70 * s, y1 = 90 * s + cap, y2 = y1 + 1.16 * cap;
    const d = txt.map((t, i) => doDong(o.font, t, cap, T.seed[i]));
    const LE = x1 + d[0].inkTrai;
    const than = { x: LE - KIEU.than.bu * fs, y: y2 + 34 * s + 6, fs, lh, cot, n: o.demDong(fs, cot, lh) };
    const phai = Math.max(x1 + d[0].w, x1 + d[1].w, than.x + o.rongThan(fs, cot));
    return { kieu: 'may', s, cap, LE, dongs: txt.map((t, i) => ({ text: t, x: x1, y: i ? y2 : y1, cap, seed: T.seed[i] })), nhan: { x: LE, y: 0, fs: 13 }, than, phai, cam: KIEU2.may };
  }
  if (o.kieu === 'dt') {
    const txt = [words.slice(0, 3).join(' '), words.slice(3).join(' ')];
    const B = khoiDt(o, txt, [50, 50], T.seed, 'day', o.H - (o.dai || 46) - DT.day);
    return { kieu: 'dt', s: B.k, cap: B.cap, LE: B.LE, dongs: B.dongs, nhan: { x: B.LE, y: 0, fs: 13 }, than: B.than, top: B.top, phai: o.W * 0.2, cam: KIEU2.dt };
  }
  const fs = KIEU.than.fsNgang, lh = KIEU.than.lhNgang;
  const cap = cl2(o.H * 0.1, 28, 50);
  const txt = [words.slice(0, 3).join(' '), words.slice(3).join(' ')];
  const x1 = 16, y1 = 16 + 32 + 14 + cap, y2 = y1 + 1.12 * cap;
  const d = txt.map((t, i) => doDong(o.font, t, cap, T.seed[i]));
  const LE = x1 + d[0].inkTrai;
  const cot = Math.min(Math.round(o.W * KIEU2.ngang.cot), Math.round(fs * KIEU.than.cotEm));
  const than = { x: LE - KIEU.than.bu * fs, y: y2 + 14, fs, lh, cot, n: o.demDong(fs, cot, lh) };
  const phai = Math.max(x1 + d[0].w, x1 + d[1].w, than.x + o.rongThan(fs, cot));
  return { kieu: 'ngang', s: cap / 116, cap, LE, dongs: txt.map((t, i) => ({ text: t, x: x1, y: i ? y2 : y1, cap, seed: T.seed[i] })), nhan: { x: LE, y: 0, fs: 13 }, than, phai, cam: KIEU2.ngang };
}

export const KIEU3 = {
  tieuDe: { cap1920: 106, gian: 0.06, seed: [63, 72, 81] },
  nghieng: 9,
  le: 64,
};
export function tinhBoCuc3(o) {
  const T = KIEU3.tieuDe, cl3 = (x, a, b) => Math.min(b, Math.max(a, x));
  const words = o.tieuDe.split(' ');
  const tg = Math.tan(THREE_DEG(KIEU3.nghieng));
  const dai = o.dai || 46;
  const phaiDai = (gx, gy, pxmm, y0, y1) => gx + 17.5 * pxmm / Math.cos(THREE_DEG(KIEU3.nghieng)) + Math.max(Math.abs(y1 - gy), Math.abs(y0 - gy)) * tg;
  if (o.kieu === 'may') {
    const s = Math.min(o.W / 1920, o.H / 1080);
    const pxmm = Math.min(0.0219 * o.H, 0.0123 * o.W);
    const gx = Math.max(17.5 * pxmm + 0.5 * o.H * tg - 24 * s, 0.245 * o.W), gy = 0.47 * (o.H - dai);
    const fs = Math.round(cl3(21 * s, KIEU.than.fsMin, KIEU.than.fsMax)), lh = KIEU.than.lh;
    const txt = [words.slice(0, 2).join(' '), words.slice(2).join(' ')];
    const x0 = Math.max(0.53 * o.W, phaiDai(gx, gy, pxmm, 0.3 * o.H, o.H - dai) + KIEU3.le * s);
    const rongCot = o.W - 70 * s - x0;
    let cap = T.cap1920 * s;
    let d = txt.map((t, i) => doDong(o.font, t, cap, T.seed[i]));
    const wMax = Math.max(...d.map((dd) => dd.w));
    if (wMax > rongCot) { cap *= rongCot / wMax; d = txt.map((t, i) => doDong(o.font, t, cap, T.seed[i])); }
    const cot = Math.min(Math.round(fs * KIEU.than.cotEm), Math.round(rongCot));
    const n = o.demDong(fs, cot, lh), thanH = n * fs * lh;
    const gapB = 34 * s + 6, cao = cap + 1.16 * cap + gapB + thanH;
    const top = cl3(0.56 * (o.H - dai) - cao / 2, 0.24 * o.H, o.H - dai - 24 * s - cao);
    const y1 = top + cap, y2 = y1 + 1.16 * cap;
    const LE = x0 + d[0].inkTrai;
    const than = { x: LE - KIEU.than.bu * fs, y: y2 + gapB, fs, lh, cot, n };
    const phai = Math.max(x0 + d[0].w, x0 + d[1].w, than.x + o.rongThan(fs, cot));
    return { kieu: 'may', s, cap, LE, dongs: txt.map((t, i) => ({ text: t, x: x0, y: i ? y2 : y1, cap, seed: T.seed[i] })), nhan: { x: LE, y: 0, fs: 13 }, than, phai, dai: { gx, gy, pxmm, nghieng: KIEU3.nghieng } };
  }
  if (o.kieu === 'dt') {
    const txt = [words.slice(0, 2).join(' '), words.slice(2).join(' ')];
    const B = khoiDt(o, txt, [46, 46], T.seed, 'day', o.H - dai - DT.day);
    const topChu = B.top;
    const pxmm = Math.min(0.0245 * o.W, (topChu - 0.04 * o.H) / (21 + 31 + 2));
    const gx = 0.5 * o.W, gy = Math.min(0.29 * o.H + 10, topChu - 31 * pxmm);
    return { kieu: 'dt', s: B.k, cap: B.cap, LE: B.LE, dongs: B.dongs, nhan: { x: B.LE, y: 0, fs: 13 }, than: B.than, phai: o.W - DT.le, dai: { gx, gy, pxmm, nghieng: KIEU3.nghieng } };
  }
  const fs = KIEU.than.fsNgang, lh = KIEU.than.lhNgang;
  const Hd = o.H - dai;
  const pxmm = Math.min(Hd / (2 * 21 + 2), 0.0118 * o.W);
  const gx = Math.max(0.36 * o.W, 160 + 17.5 * pxmm + 0.5 * Hd * tg), gy = 0.5 * Hd;
  const x0 = Math.max(phaiDai(gx, gy, pxmm, 0, Hd) + 28, 0.56 * o.W);
  const txt = [words.slice(0, 2).join(' '), words.slice(2).join(' ')];
  let cap = cl3(o.H * 0.095, 26, 48);
  let d = txt.map((t, i) => doDong(o.font, t, cap, T.seed[i]));
  const rongCot = o.W - 16 - x0, wMax = Math.max(...d.map((dd) => dd.w));
  if (wMax > rongCot) { cap *= rongCot / wMax; d = txt.map((t, i) => doDong(o.font, t, cap, T.seed[i])); }
  const cot = Math.min(Math.round(rongCot), Math.round(fs * KIEU.than.cotEm));
  const n = o.demDong(fs, cot, lh), thanH = n * fs * lh;
  const cao = cap * 2.12 + 14 + thanH;
  const top = cl3((Hd - cao) / 2, 12, Hd - cao - 8);
  const y1 = top + cap, y2 = y1 + 1.12 * cap;
  const LE = x0 + d[0].inkTrai;
  const than = { x: LE - KIEU.than.bu * fs, y: y2 + 14, fs, lh, cot, n };
  const phai = Math.max(x0 + d[0].w, x0 + d[1].w, than.x + o.rongThan(fs, cot));
  return { kieu: 'ngang', s: cap / 106, cap, LE, dongs: txt.map((t, i) => ({ text: t, x: x0, y: i ? y2 : y1, cap, seed: T.seed[i] })), nhan: { x: LE, y: 0, fs: 13 }, than, phai, dai: { gx, gy, pxmm, nghieng: KIEU3.nghieng } };
}
function THREE_DEG(d) { return d * Math.PI / 180; }
export const KIEU5 = {
  tieuDe: { cap1920: 74, seed: [37, 44] },
  may: { p: [1.02, 2.5, 2.62], t: [-0.12, 0.72, -0.62], fov: 44, hfov: 71.4 },
  dt: { p: [0.75, 2.55, 2.1], t: [-0.05, 0.95, -0.3], fov: 78, lech: [-0.05, -0.15] },
};
export function tinhBoCuc5(o) {
  const T = KIEU5.tieuDe, cl5 = (x, a, b) => Math.min(b, Math.max(a, x));
  const words = o.tieuDe.split(' ');
  const txt = [words.slice(0, 3).join(' '), words.slice(3).join(' ')];
  const dai = o.dai || 46;
  const doTD = (cap) => txt.map((t, i) => doDong(o.font, t, cap, T.seed[i]));
  if (o.kieu === 'may') {
    const s = Math.min(o.W / 1920, o.H / 1080);
    const fs = Math.round(cl5(21 * s, KIEU.than.fsMin, KIEU.than.fsMax)), lh = KIEU.than.lh;
    const cot = Math.round(fs * KIEU.than.cotEm);
    const x0 = Math.min(0.672 * o.W, o.W - cot - 64 * s);
    let cap = T.cap1920 * s, d = doTD(cap);
    const wMax = Math.max(...d.map((q) => q.w)), rong = o.W - 40 * s - x0;
    if (wMax > rong) { cap *= rong / wMax; d = doTD(cap); }
    const n = o.demDong(fs, cot, lh), thanH = n * fs * lh;
    const day = o.H - dai - 66 * s;
    const thanY = day - thanH, gapB = 26 * s + 6;
    const y2 = thanY - gapB, y1 = y2 - 1.16 * cap;
    const LE = x0 + d[0].inkTrai;
    const than = { x: LE - KIEU.than.bu * fs, y: thanY, fs, lh, cot, n };
    const M = KIEU5.may, a = o.W / o.H;
    const fov = Math.max(M.fov, 2 * Math.atan(Math.tan((M.hfov * Math.PI) / 360) / a) * 180 / Math.PI);
    return { kieu: 'may', s, cap, LE, dongs: txt.map((t, i) => ({ text: t, x: x0, y: i ? y2 : y1, cap, seed: T.seed[i] })), nhan: { x: LE, y: 0, fs: 13 }, than,
      phai: Math.max(x0 + d[0].w, x0 + d[1].w, than.x + o.rongThan(fs, cot)), may: { p: M.p, t: M.t, fov, lech: [0, 0] } };
  }
  if (o.kieu === 'dt') {
    const B = khoiDt(o, txt, [44, 44], T.seed, 'day', o.H - dai - DT.day);
    const D = KIEU5.dt, topChu = B.top;
    const lech = [D.lech[0], cl5(D.lech[1] - (0.62 - topChu / o.H) * 0.55, -0.34, -0.1)];
    return { kieu: 'dt', s: B.k, cap: B.cap, LE: B.LE, dongs: B.dongs, nhan: { x: B.LE, y: 0, fs: 13 }, than: B.than, phai: o.W - DT.le,
      may: { p: D.p, t: D.t, fov: D.fov, lech } };
  }
  const fs = KIEU.than.fsNgang, lh = KIEU.than.lhNgang, Hd = o.H - dai;
  const x0 = Math.max(0.585 * o.W, o.W - 16 - Math.round(fs * KIEU.than.cotEm));
  let cap = cl5(o.H * 0.088, 24, 44), d = doTD(cap);
  const rong = o.W - 16 - x0, wMax = Math.max(...d.map((q) => q.w));
  if (wMax > rong) { cap *= rong / wMax; d = doTD(cap); }
  const cot = Math.min(Math.round(rong), Math.round(fs * KIEU.than.cotEm));
  const n = o.demDong(fs, cot, lh), thanH = n * fs * lh;
  const thanY = Hd - 12 - thanH, y2 = thanY - 12, y1 = y2 - 1.12 * cap;
  const LE = x0 + d[0].inkTrai;
  const than = { x: LE - KIEU.than.bu * fs, y: thanY, fs, lh, cot, n };
  const M = KIEU5.may;
  return { kieu: 'ngang', s: cap / 74, cap, LE, dongs: txt.map((t, i) => ({ text: t, x: x0, y: i ? y2 : y1, cap, seed: T.seed[i] })), nhan: { x: LE, y: 0, fs: 13 }, than,
    phai: Math.max(x0 + d[0].w, x0 + d[1].w, than.x + o.rongThan(fs, cot)), may: { p: M.p, t: M.t, fov: 46, lech: [-0.1, 0] } };
}
export const KIEU6 = { tieuDe: { cap1920: 76, seed: [52] }, cotEm: 36 };
export function tinhBoCuc6(o) {
  const T = KIEU6.tieuDe, cl6 = (x, a, b) => Math.min(b, Math.max(a, x));
  const txt = [o.tieuDe];
  const doTD = (cap) => txt.map((t, i) => doDong(o.font, t, cap, T.seed[i]));
  if (o.kieu === 'may') {
    const s = Math.min(o.W / 1920, o.H / 1080);
    const fs = Math.round(cl6(21 * s, KIEU.than.fsMin, KIEU.than.fsMax)), lh = KIEU.than.lh;
    let cap = T.cap1920 * s, d = doTD(cap);
    if (d[0].w > 0.62 * o.W) { cap *= 0.62 * o.W / d[0].w; d = doTD(cap); }
    const x0 = Math.round((o.W - d[0].w) / 2 - 60 * s);
    const y1 = Math.round(34 * s + cap);
    const LE = x0 + d[0].inkTrai;
    const cot = Math.round(fs * KIEU6.cotEm);
    const n = o.demDong(fs, cot, lh);
    const than = { x: LE - KIEU.than.bu * fs, y: Math.round(y1 + 0.42 * cap), fs, lh, cot, n };
    return { kieu: 'may', s, cap, LE, dongs: [{ text: txt[0], x: x0, y: y1, cap, seed: T.seed[0] }], nhan: { x: LE, y: 0, fs: 13 }, than, phai: Math.max(x0 + d[0].w, than.x + o.rongThan(fs, cot)) };
  }
  if (o.kieu === 'dt') {
    const w6 = o.tieuDe.split(' ');
    const B = khoiDt(o, [w6.slice(0, 2).join(' '), w6.slice(2).join(' ')], [40, 40], [T.seed[0], 61], 'tren', DT.tren);
    return { kieu: 'dt', s: B.k, cap: B.cap, LE: B.LE, dongs: B.dongs, nhan: { x: B.LE, y: 0, fs: 13 }, than: B.than, phai: o.W - DT.le };
  }
  const fs = KIEU.than.fsNgang, lh = KIEU.than.lhNgang;
  const xs = 16, rong = Math.min(Math.round(o.W * 0.42), Math.round(fs * KIEU.than.cotEm));
  let cap = cl6(o.H * 0.075, 20, 40), d = doTD(cap);
  if (d[0].w > rong) { cap *= rong / d[0].w; d = doTD(cap); }
  const LE = xs + d[0].inkTrai;
  const y1 = Math.round(Math.max(56, o.H * 0.12) + cap);
  const n = o.demDong(fs, rong, lh);
  const than = { x: LE - KIEU.than.bu * fs, y: Math.round(y1 + 0.5 * cap), fs, lh, cot: rong, n };
  return { kieu: 'ngang', s: cap / 76, cap, LE, dongs: [{ text: txt[0], x: xs, y: y1, cap, seed: T.seed[0] }], nhan: { x: LE, y: 0, fs: 13 }, than, phai: xs + rong };
}
