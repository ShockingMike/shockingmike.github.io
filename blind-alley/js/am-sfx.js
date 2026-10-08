
const dB = (x) => Math.pow(10, x / 20);
const THAY = { rit: 'rit', khung: 'khung', chot: 'chieu-tat', re: 're', xet: 'xet', keo: 'keo', chi: 'chi', phim: 'phim', cach: 'cach', chuong: 'dong', dau: 'dau', roi: 'roi' };
const MOT = new Set(['rit', 'chot', 're', 'keo', 'chuong', 'roi']);

export function taoSfx(am, { goc = './am/sfx/', nav = null, tat = false } = {}) {
  const KHONG = () => {};
  if (tat) return { chuyen: KHONG, khung: KHONG, su: KHONG, dan: KHONG, go: KHONG, trangThai: () => ({ tat: true }) };
  const mau = {}, nhom = {}, nhatKy = [];
  let nap0 = null, soTep = 0, rr = 1;
  const rnd = () => { rr = (rr * 16807) % 2147483647; return rr / 2147483647; };
  const ngau = (a, b) => a + (b - a) * rnd();
  const ctx = () => { const n = am._nut && am._nut(); return n ? n.ctx : null; };
  const song = () => am.dangBat && ctx() && ctx().state === 'running';

  function giai(c, ab) { return new Promise((ok, loi) => c.decodeAudioData(ab, ok, loi)); }
  async function napTep(c, ten, bu) {
    const buf = await giai(c, await (await fetch(goc + ten + '.mp3')).arrayBuffer());
    const d = buf.getChannelData(0); let pk = 0; for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
    const k = 0.5 / (pk + 1e-9) * dB(bu); for (let i = 0; i < d.length; i++) d[i] *= k;
    let bo = 0; const lim = 0.5 * dB(bu) * 0.01, n = Math.min(d.length, Math.floor(buf.sampleRate * 0.25));
    for (let i = 0; i < n; i++) if (Math.abs(d[i]) > lim) { bo = Math.max(0, i / buf.sampleRate - 0.002); break; }
    const v = { buf, bo };
    mau[ten] = v; soTep++;
    const g = ten.replace(/-\d+$/, ''); (nhom[g] = nhom[g] || []).push(v);
    return v;
  }
  function datThay(g) {
    for (const [cu, moi] of Object.entries(THAY)) if (moi === g && nhom[g]) am._datTieng(cu, MOT.has(cu) ? nhom[g][0] : nhom[g].slice());
  }
  function nap() {
    if (nap0) return nap0;
    const c = ctx(); if (!c || !am._datTieng) return null;
    nap0 = (async () => {
      const man = (await (await fetch(goc + 'sfx.json')).json()).tep;
      const truoc = man.filter(([t]) => t === 'rit'), sau = man.filter(([t]) => t !== 'rit');
      for (const [t, bu] of truoc) { await napTep(c, t, bu).catch(() => {}); datThay('rit'); }
      for (let i = 0; i < sau.length; i += 6) await Promise.all(sau.slice(i, i + 6).map(([t, bu]) => napTep(c, t, bu).catch(() => {})));
      for (const g of new Set(Object.values(THAY))) datThay(g);
    })().catch((e) => console.warn('[am-sfx] không tải được tiếng động', e));
    return nap0;
  }

  const cuoi = {};
  function chon(g) {
    const ds = nhom[g]; if (!ds || !ds.length) return null;
    if (ds.length === 1) return ds[0];
    let i = Math.floor(rnd() * ds.length); if (ds[i] === cuoi[g]) i = (i + 1) % ds.length;
    return (cuoi[g] = ds[i]);
  }
  function choi(g, t, o = {}) {
    const c = ctx(); if (!c || !song()) return null;
    let v = typeof g === 'string' ? chon(g) : g; if (!v) return null;
    if (o.bo) v = { buf: v.buf, bo: v.bo + o.bo };
    nhatKy.push([+(Math.max(t, c.currentTime)).toFixed(3), typeof g === 'string' ? g : '?']); if (nhatKy.length > 300) nhatKy.splice(0, 100);
    return am._phat(v, t, { g: 0, pan: 0, rate: 1, phong: 0.25, ngoaiT: 0, ...o });
  }
  const tre = () => { const c = ctx(); return c ? Math.max(0, Math.min(0.08, (c.outputLatency || 0) || (c.baseLatency || 0)) - 0.02) : 0; };

  let hen = [], hTo = -1;
  const TRUOC = 0.15;
  function datHen(to, ds) { hen = ds.map(([tm, f]) => ({ tm, f })); hTo = to; xuLy(); }
  function xuLy() {
    if (!nav || !hen.length) return;
    const S = nav.S;
    if (S.mode !== 'move' || S.to !== hTo) { hen = []; return; }
    const c = ctx(); if (!c) return;
    const lai = [];
    for (const h of hen) {
      if (h.tm - S.t <= TRUOC) h.f(c.currentTime + Math.max(0, h.tm - S.t - tre()));
      else lai.push(h);
    }
    hen = lai;
  }
  let may = null;
  function mayBat(t, vao, muc, dai) {
    if (may) return;
    const r = choi('chieu-chay', t, { g: -60, pan: 0.08, phong: 0.15 }); if (!r) return;
    const gg = r.g.gain; gg.cancelScheduledValues(0); gg.setValueAtTime(0, t); gg.linearRampToValueAtTime(dB(muc), t + vao);
    gg.setValueAtTime(dB(muc), t + dai - 0.4); gg.linearRampToValueAtTime(0, t + dai); r.s.stop(t + dai + 0.05);
    may = { r }; r.s.onended = () => { if (may && may.r === r) may = null; };
  }
  function mayTat(lang = 0.12) {
    if (!may) return; const c = ctx(); const g = may.r.g.gain, t = c.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + lang);
    try { may.r.s.stop(t + lang + 0.05); } catch (e) { }
    may = null;
  }
  function choiBao(g, t, { muc, vao = 0.3, ra = 0.3, dai, bo = 0, ...o }) {
    const r = choi(g, t, { g: -60, bo, ...o }); if (!r) return;
    const gg = r.g.gain; gg.cancelScheduledValues(0); gg.setValueAtTime(0, t); gg.linearRampToValueAtTime(dB(muc), t + vao);
    gg.setValueAtTime(dB(muc), t + dai - ra); gg.linearRampToValueAtTime(0, t + dai); r.s.stop(t + dai + 0.05);
  }
  let lanDai = -9;
  function chuyen(from, to, kieu, daNut = false) {
    if (!song()) return;
    const c = ctx(), now = c.currentTime;
    if (to !== 2) mayTat(0.25);
    if (kieu !== 'move') {
      if (now - lanDai > 0.4) choi('khung', now, { g: -15, pan: 0.05, rate: 0.92, phong: 0.15 });
      return;
    }
    const D = nav ? nav.S.D : 1;
    if (to === 1) datHen(1, [
      ...(daNut ? [] : [[0, (t) => choi('nut', t, { g: -12, pan: -0.1, phong: 0.3 })]]),
      [0.22 * D, (t) => choi('vo', t, { g: -7, pan: -0.25, phong: 0.35 })],
    ]);
    else if (to === 2) datHen(2, [
      [0.28 * D, (t) => choi('cong-tac', t, { g: -12, pan: 0.1, phong: 0.2 })],
      [0.30 * D, (t) => mayBat(t, 0.3, -21, 0.7 * D + 0.25)],
    ]);
    else if (to === 3) datHen(3, [
      [0.02 * D, (t) => choiBao('cuon-quay', t, { muc: -15, vao: 0.35, ra: 0.3, dai: 0.66 * D, pan: 0.05, phong: 0.15 })],
    ]);
    else if (to === 4) datHen(4, [
      [0.1 * D, (t) => choiBao('het-cuon', t, { muc: -11, vao: 0.15, ra: 0.5, dai: Math.min(2.3, D * 1.05), bo: 0.6, pan: -0.05, phong: 0.15 })],
    ]);
    else if (to === 5) datHen(5, [
      [Math.max(0, D - 0.94), (t) => choi('keo-khung', t, { g: -9, pan: 0.05, phong: 0.15 })],
    ]);
  }

  let baoG = 0, baoLan = -99;
  function khung(o = {}) {
    if (!song()) return;
    xuLy();
    if (o.canh === 3 && o.idle && o.t4 >= 0 && o.cham >= 1) {
      const tt = o.t4, g = 0.5 + 0.5 * Math.sin(tt * 1.6) * Math.sin(tt * 0.57 + 0.9);
      if (baoG < 0.86 && g >= 0.86 && tt - baoLan > 6) { baoLan = tt; choi('bao', ctx().currentTime, { g: -16 + ngau(-1.5, 0.5), pan: -0.2, rate: ngau(0.95, 1.04), phong: 0.1, ngoaiT: 0.4 }); }
      baoG = g;
    } else baoG = 1;
  }

  function dan(tCuoi = 0.5) {
    if (!song()) return;
    const t = ctx().currentTime;
    choi('dan', t, { g: -13.5, pan: -0.1, rate: ngau(0.97, 1.03), phong: 0.3 });
    choi('dan', t + Math.max(0.18, tCuoi * 0.7), { g: -18, pan: 0.05, rate: ngau(0.97, 1.03), phong: 0.3 });
  }
  function go(dai = 0.5, gach = []) {
    if (!song()) return;
    const t0 = ctx().currentTime;
    if (gach.length) { gach.forEach((g, i) => { choi('cat', t0 + g, { g: -13 - i, pan: -0.15, rate: ngau(0.96, 1.04), phong: 0.25 }); choi('phim', t0 + g + 0.07, { g: -13, pan: -0.05, rate: ngau(0.97, 1.03), phong: 0.25 }); }); return; }
    const n = Math.max(2, Math.min(5, Math.round(dai * 8)));
    for (let i = 0; i < n; i++) choi('phim', t0 + (i / n) * dai + ngau(0, 0.03), { g: -12 - i * 0.8 + ngau(-1, 0.5), pan: ngau(-0.1, 0.1), rate: ngau(0.97, 1.03), phong: 0.25 });
  }

  function su(ten) {
    if (!song()) return;
    const c = ctx(), t = c.currentTime;
    switch (ten) {
      case 'nut': choi('nut', t, { g: -13, pan: -0.1, phong: 0.3 }); break;
      case 'dai': lanDai = t; choi('cat', t, { g: -18, pan: 0, rate: 1.06, phong: 0.15 }); choi('dan', t + 0.05, { g: -16, rate: 1.05, phong: 0.15 }); break;
      case 'ho-mo': choi('ho-mo', t, { g: -10, pan: -0.1, rate: ngau(0.97, 1.03), phong: 0.3 }); break;
      case 'ho-dong': if (!nav || nav.S.mode === 'idle') choi('ho-dong', t, { g: -13, pan: -0.1, rate: ngau(0.97, 1.03), phong: 0.3 }); break;
      case 'to-mo': choi('to-mo', t, { g: -11, pan: 0.05, phong: 0.3 }); break;
      case 'to-dong': choi('to-dong', t, { g: -13, pan: 0.05, phong: 0.3 }); break;
      case 'to-moi': choi('to-moi', t, { g: -12, pan: 0.05, phong: 0.3 }); break;
      case 'den': break;
      default: break;
    }
  }

  const bat0 = am.bat, tat0 = am.tat, su0 = am.su;
  function congTac() {
    const n = am._nut && am._nut(); if (!n || !mau['cong-tac']) return;
    am._phat(mau['cong-tac'], n.ctx.currentTime, { g: -4, pan: 0.1, phong: 0, ngoaiT: 0, bus: n.ra });
  }
  am.bat = function (o) {
    const coTruoc = am.daTao, dang = am.dangBat;
    const r = bat0.call(am, o);
    if (am.daTao) nap();
    if (coTruoc && !dang && am.dangBat) congTac();
    return r;
  };
  am.tat = function (l) { if (am.dangBat) congTac(); return tat0.call(am, l); };
  am.su = function (ten, d) {
    if (ten === 'dung' && song()) mayTat(0.1);
    return su0.call(am, ten, d);
  };

  return { chuyen, khung, su, dan, go, trangThai: () => ({ soTep, nhom: Object.keys(nhom).length, nhatKy: nhatKy.slice() }) };
}
