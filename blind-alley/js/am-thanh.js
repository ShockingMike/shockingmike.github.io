
import { CANH, VONG_CUA_CANH, VONG_SAU_DUNG, KET } from './am-nhac.js';
import * as T from './am-tieng.js';

const dB = (x) => Math.pow(10, x / 20);
const kep = (x, a, b) => Math.min(b, Math.max(a, x));

const MUC = { nhac: 7.9, noi: 9 };
const MUC_CU = { bass: 0, vibes: 1.5, choi: -9 };
const BPM = 72, PH = 60 / BPM, SWING = 0.6, LECH = 0.008;
const VANG = { t60: 1.5, som: 0.016, lp: 6000, rong: 0.9 }, GUI = 0.3;
const DYN = [0.92, 0.86, 1.0, 0.72, 0.86, 0.95];
const NOI_VANG = [
  { phong: 0.45, ngoai: 0 }, { phong: 0.2, ngoai: 0.5 }, { phong: 0.42, ngoai: 0 },
  { phong: 0.18, ngoai: 0.55 }, { phong: 0.6, ngoai: 0 }, { phong: 0.42, ngoai: 0 },
];
const TRUOC = 1.0;

const coRanh = typeof requestIdleCallback === 'function';
const ranh = () => new Promise((r) => (coRanh ? requestIdleCallback(r, { timeout: 400 }) : setTimeout(r, 16)));
async function chay(gen) {
  let d = await ranh(), t0 = performance.now();
  for (;;) {
    const x = gen.next();
    if (x.done) return;
    const han = d && typeof d.timeRemaining === 'function' && !d.didTimeout ? Math.max(1, Math.min(4, d.timeRemaining())) : 3;
    if (performance.now() - t0 > han) { d = await ranh(); t0 = performance.now(); }
  }
}

export function taoAmThanh({ goc = './am/', seed = 7 } = {}) {
  const rnd = T.taoRnd(seed), ngau = (a, b) => a + (b - a) * rnd();
  let ctx = null, on = false, nhacSan = false, timer = 0, henTat = 0;
  let tong, han, sauHan, busNhac, busNoi, vangNhac, vangNoi, guiPhong, guiNgoai, rungVibes;
  const mau = { bass: [], vibes: [] }, tieng = {};
  const nhatKy = [];

  function irPhong({ t60, som, lp, rong }) {
    const sr = ctx.sampleRate, n = Math.floor(sr * (t60 * 1.1 + som + 0.05)), b = ctx.createBuffer(2, n, sr), r = T.taoRnd(91);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let k = 0; k < 12; k++) { const i = Math.floor(sr * (som * 0.3 + 0.005 + 0.04 * r())); d[i] += (r() < 0.5 ? -1 : 1) * 0.55 * Math.pow(1 - k / 12, 1.5); }
      const f1 = T.bq('lp', lp, 0.7, sr), f2 = T.bq('lp', lp * 0.35, 0.7, sr);
      for (let i = Math.floor(sr * som); i < n; i++) {
        const t = (i / sr) - som, x = (r() * 2 - 1) * (c === 0 ? 1 : rong) + (r() * 2 - 1) * (c === 0 ? 0 : 1 - rong);
        d[i] += f1(x) * Math.exp(-6.9 * t / (t60 * 0.45)) * 0.5 + f2(x) * Math.exp(-6.9 * t / t60) * 0.9;
      }
    }
    let e = 0; for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) e += d[i] * d[i]; }
    const k = 1 / Math.sqrt(e / 2); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] *= k; }
    return b;
  }
  function dung() {
    tong = ctx.createGain(); tong.gain.value = 0;
    han = ctx.createDynamicsCompressor(); han.threshold.value = -3; han.knee.value = 0; han.ratio.value = 20; han.attack.value = 0.002; han.release.value = 0.2;
    sauHan = ctx.createGain();
    busNhac = ctx.createGain(); busNhac.gain.value = dB(MUC.nhac);
    busNoi = ctx.createGain(); busNoi.gain.value = dB(MUC.noi);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 30;
    busNhac.connect(hp); busNoi.connect(hp);
    hp.connect(tong).connect(han).connect(sauHan).connect(ctx.destination);
    vangNhac = ctx.createConvolver(); vangNhac.normalize = false; vangNhac.buffer = irPhong(VANG); vangNhac.connect(busNhac);
    vangNoi = ctx.createConvolver(); vangNoi.normalize = false; vangNoi.buffer = irPhong({ t60: 0.9, som: 0.008, lp: 4500, rong: 0.85 });
    guiPhong = ctx.createGain(); guiPhong.gain.value = NOI_VANG[canhTrang].phong; guiPhong.connect(vangNoi); vangNoi.connect(busNoi);
    const ngoai = ctx.createGain(); guiNgoai = ctx.createGain(); guiNgoai.gain.value = NOI_VANG[canhTrang].ngoai; guiNgoai.connect(ngoai);
    for (const [t, fb, lp, pan] of [[0.19, 0.3, 2600, -0.5], [0.31, 0.24, 2000, 0.45]]) {
      const d = ctx.createDelay(1), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
      d.delayTime.value = t; f.type = 'lowpass'; f.frequency.value = lp; g.gain.value = fb; p.pan.value = pan;
      ngoai.connect(d); d.connect(f); f.connect(g); g.connect(d); f.connect(p).connect(busNoi);
      const v = ctx.createGain(); v.gain.value = 0.3; f.connect(v).connect(vangNoi);
    }
    rungVibes = ctx.createGain(); rungVibes.gain.value = 0.86;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 4.8; g.gain.value = 0.14; o.connect(g).connect(rungVibes.gain); o.start();
    rungVibes.connect(busNhac);
    const gv = ctx.createGain(); gv.gain.value = GUI; rungVibes.connect(gv).connect(vangNhac);
  }
  async function doBu() {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return 0;
    const sr = 8000, off = new OAC(1, sr / 2, sr), o = off.createOscillator(), g = off.createGain(), c = off.createDynamicsCompressor();
    o.frequency.value = 200; g.gain.value = 0.01; c.threshold.value = -3; c.knee.value = 0; c.ratio.value = 20; c.attack.value = 0.002; c.release.value = 0.2;
    o.connect(g).connect(c).connect(off.destination); o.start();
    const d = (await off.startRendering()).getChannelData(0);
    let q = 0; for (let i = d.length / 2; i < d.length; i++) q += d[i] * d[i];
    const rms = Math.sqrt(q / (d.length / 2));
    return rms > 0 ? 20 * Math.log10(rms / (0.01 / Math.SQRT2)) : 0;
  }

  function diemDau(buf) {
    const d = buf.getChannelData(0), n = Math.min(d.length, Math.floor(buf.sampleRate * 0.2));
    let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
    for (let i = 0; i < n; i++) if (Math.abs(d[i]) > pk * 0.03) return Math.max(0, i / buf.sampleRate - 0.003);
    return 0;
  }
  async function napMau() {
    const man = await (await fetch(goc + 'mau.json')).json();
    const giai = (tep) => fetch(goc + tep).then((r) => r.arrayBuffer()).then((ab) => new Promise((ok, loi) => ctx.decodeAudioData(ab, ok, loi)));
    await Promise.all(man.noi.map((e) => giai(e.tep).then((b) => {
      const v = { buf: b, bo: diemDau(b) };
      if (e.ten === 'meo') tieng.meo = v; else (tieng.got = tieng.got || []).push(v);
    }).catch(() => {})));
    await Promise.all(['bass', 'vibes'].flatMap((cu) => man[cu].map((e) => giai(e.tep).then((b) => { mau[cu].push({ m: e.m, lop: e.lop, g: e.g, buf: b, bo: diemDau(b) }); }))));
    nhacSan = true;
  }
  function chonMau(cu, m, lop) {
    let best = null, d0 = 1e9;
    for (const e of mau[cu]) { const d = Math.abs(e.m - m) + (e.lop === lop ? 0 : 2.6) + (e.m > m ? 0.01 : 0); if (d < d0) { d0 = d; best = e; } }
    return best;
  }

  const dangChoi = [];
  function not(cu, m, t, dur, vel, o = {}) {
    t = Math.max(ctx.currentTime, t);
    const e = chonMau(cu, m, o.lop); if (!e) return null;
    const s = ctx.createBufferSource(); s.buffer = e.buf;
    const rate = Math.pow(2, (m - e.m) / 12); s.playbackRate.value = rate;
    const g = ctx.createGain(); s.connect(g);
    const muc = e.g * Math.pow(vel, 1.5) * dB(MUC_CU[cu] || 0);
    g.gain.setValueAtTime(muc, t);
    const tha = o.tha == null ? 0.12 : o.tha, het = t + dur;
    g.gain.setTargetAtTime(0, het, tha);
    const p = ctx.createStereoPanner(); p.pan.value = kep(o.pan || 0, -1, 1); g.connect(p);
    p.connect(o.bus || busNhac);
    if (o.gui !== 0) { const v = ctx.createGain(); v.gain.value = o.gui == null ? GUI : o.gui; p.connect(v).connect(vangNhac); }
    s.start(t, e.bo);
    s.stop(Math.min(t + (e.buf.duration - e.bo) / rate, het + tha * 7));
    const v = { s, g, t, het, nhom: o.nhom || '' };
    dangChoi.push(v); if (dangChoi.length > 300) dangChoi.splice(0, 150);
    return v;
  }
  function dungNhom(nhom, tu) {
    for (const v of dangChoi) {
      if (v.nhom !== nhom) continue;
      if (v.t >= tu) { try { v.s.stop(tu); } catch (e) { } } else if (v.het > tu) { v.g.gain.cancelScheduledValues(tu); v.g.gain.setTargetAtTime(0, tu, 0.05); }
    }
  }

  function taoBuf(a, sr, dinh = 0.5) {
    let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
    const k = dinh / (m + 1e-12); for (let i = 0; i < a.length; i++) a[i] *= k;
    const nv = Math.floor(sr * 0.01); for (let i = 0; i < nv; i++) a[a.length - 1 - i] *= i / nv;
    const b = ctx.createBuffer(1, a.length, sr); b.copyToChannel ? b.copyToChannel(a, 0) : b.getChannelData(0).set(a); return { buf: b, bo: 0 };
  }
  const r0 = T.taoRnd(311);
  const CONG = [
    ['rit', 1, 1.6, (a, sr) => T.ritThuoc(a, sr, r0, { dinh: 0.62 })],
    ['tich', 1, 0.09, (a, sr) => T.tichTac(a, sr, r0, 1)], ['tac', 1, 0.09, (a, sr) => T.tichTac(a, sr, r0, 0.84)],
    ['choi', 4, 0.25, (a, sr) => choiCham(a, sr, r0)], ['queo', 2, 0.6, (a, sr) => choiQuet(a, sr, r0)],
    ['giot', 10, 0.25, (a, sr, i) => T.giotMua(a, sr, r0, i % 5 < 2)], ['roi', 1, 0.7, (a, sr) => T.phimRoi(a, sr, r0)],
    ['khung', 5, 0.12, (a, sr) => T.keoKhung(a, sr, r0)], ['chot', 1, 0.45, (a, sr) => T.chotKhung(a, sr, r0)],
    ['re', 1, 1.2, (a, sr) => T.reLien(a, sr, r0)], ['xet', 3, 0.05, (a, sr) => T.xetDien(a, sr, r0)],
    ['chi', 6, 0, (a, sr, i) => T.netChi(a, sr, r0, 0.14 + 0.05 * i)], ['keo', 3, 0.6, (a, sr) => T.keoDay(a, sr, r0)],
    ['phim', 6, 0.12, (a, sr) => T.phimMayChu(a, sr, r0, 'phim')], ['cach', 2, 0.12, (a, sr) => T.phimMayChu(a, sr, r0, 'cach')],
    ['chuong', 1, 1.2, (a, sr) => T.chuongMayChu(a, sr, r0)], ['dau', 1, 0.5, (a, sr) => T.dongDau(a, sr, r0)],
  ];
  let dangDung = null;
  async function dungTiengNoi() {
    for (const [ten, so, giay, gen] of CONG) {
      if (tieng[ten]) continue;
      const ds = [];
      for (let i = 0; i < so; i++) {
        const sr = ctx.sampleRate, a = new Float32Array(Math.ceil(sr * (giay || (0.16 + 0.05 * i))));
        await chay(gen(a, sr, i));
        ds.push(taoBuf(a, sr));
      }
      tieng[ten] = so > 1 ? ds : ds[0];
    }
  }
  function lay(ten) {
    if (tieng[ten]) return tieng[ten];
    const c = CONG.find((x) => x[0] === ten); if (!c) return null;
    const [, so, giay, gen] = c, ds = [];
    for (let i = 0; i < so; i++) { const sr = ctx.sampleRate, a = new Float32Array(Math.ceil(sr * (giay || (0.16 + 0.05 * i)))); for (const _ of gen(a, sr, i)) { } ds.push(taoBuf(a, sr)); }
    return (tieng[ten] = so > 1 ? ds : ds[0]);
  }
  function phat(v, t, { g = 0, pan = 0, rate = 1, phong = 1, ngoaiT = 1, lp = 0, bus = null, nhom = '' } = {}) {
    if (!v) return null;
    if (Array.isArray(v)) v = v[Math.floor(rnd() * v.length)];
    t = Math.max(ctx.currentTime, t);
    const s = ctx.createBufferSource(); s.buffer = v.buf; s.playbackRate.value = rate;
    let n = s;
    if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; n.connect(f); n = f; }
    const ga = ctx.createGain(); ga.gain.value = dB(g); n.connect(ga);
    const p = ctx.createStereoPanner(); p.pan.value = kep(pan, -1, 1); ga.connect(p); p.connect(bus || busNoi);
    if (phong) { const x = ctx.createGain(); x.gain.value = phong; p.connect(x).connect(guiPhong); }
    if (ngoaiT) { const x = ctx.createGain(); x.gain.value = ngoaiT; p.connect(x).connect(guiNgoai); }
    s.start(t, v.bo || 0);
    if (nhom) dangChoi.push({ s, g: ga, t, het: t + v.buf.duration, nhom });
    return { s, g: ga };
  }

  let canhTrang = 0, vongNhac = VONG_CUA_CANH[0], vongCho = null, oTrong = -1;
  let phimChay = false, phimDung = false, ketCho = false, ketO = false;
  let phachSo = 0, phachToi = 0, phachHen = 0, hopO = null, giaiO = [], tram = 38, buoc = null, ostToi = 0, lanDongHo = 0;
  const nhipLech = () => ngau(-LECH, LECH);
  const viTri = (b) => { const nguyen = Math.floor(b), le = b - nguyen; return nguyen + (Math.abs(le - 0.5) < 1e-6 ? SWING : le); };

  function buocTram(hop, sau) {
    const lop = (m) => { while (m < 31) m += 12; while (m > 50) m -= 12; return m; };
    const goc0 = lop(hop.goc + (Math.abs(hop.goc + 12 - tram) < Math.abs(hop.goc - tram) ? 12 : 0));
    const pc = new Set([hop.goc % 12, ...hop.tay.map((m) => m % 12)]);
    const gan = (tu, huong) => { for (let d = 1; d < 7; d++) { const m = tu + huong * d; if (pc.has(((m % 12) + 12) % 12)) return m; } return tu + huong * 2; };
    const gocSau = sau ? lop(sau.goc) : goc0, huong = gocSau >= goc0 ? 1 : -1;
    const n2 = lop(gan(goc0, huong)), n3 = lop(gan(n2, huong));
    const dan = rnd() < 0.6 ? gocSau + (n3 > gocSau ? 1 : -1) : gocSau + 7 - (gocSau + 7 > 50 ? 12 : 0);
    tram = goc0;
    return [goc0, n2, n3, lop(dan)];
  }
  function choiPhach(k, t) {
    const p = k % 4;
    if (p === 0) {
      if (ketO) { ketO = false; oTrong = -1; }
      if (vongCho !== null) { vongNhac = vongCho; vongCho = null; oTrong = -1; }
      oTrong++;
      if (ketCho) { ketCho = false; ketO = true; oTrong = -1; hopO = KET.o; giaiO = KET.giai; }
      else {
        const V = CANH[vongNhac], vong = Math.floor(oTrong / 4);
        hopO = V.o[oTrong % 4];
        giaiO = V.giai[vong % V.giai.length].filter((x) => x.o === oTrong % 4);
      }
      const V = ketO ? null : CANH[vongNhac];
      buoc = buocTram(hopO, V ? V.o[(oTrong + 1) % 4] : null);
      if (canhTrang === 2 && phimChay && !phimDung) buoc = [33, 45, 33, 45];
    }
    const hop = hopO.sau && p >= hopO.sau.t ? hopO.sau : hopO, dyn = DYN[canhTrang];
    const ketThucO = t + (4 - p) * PH, haiPhach = canhTrang === 0 || canhTrang === 3;
    if (buoc) {
      const m = haiPhach ? (p === 0 ? buoc[0] : p === 2 ? (hop.goc % 12 === buoc[0] % 12 ? buoc[0] + 7 : hop.goc) : null) : buoc[p];
      if (m != null) not('bass', m > 50 ? m - 12 : m, t + nhipLech(), haiPhach ? PH * 1.9 : PH * 0.92, (p % 2 ? 0.6 : 0.7) * dyn * ngau(0.92, 1.05), { lop: 'v1', pan: -0.12, tha: 0.07, gui: 0.18, nhom: canhTrang === 2 ? 'ost' : '' });
    }
    if ((p === 1 || p === 3) && !(canhTrang === 3 && p === 1)) phat(tieng.choi, t + nhipLech(), { bus: busNhac, g: MUC_CU.choi - 7 + ngau(-1.5, 1) + 20 * Math.log10(dyn), pan: 0.22, phong: 0, ngoaiT: 0, lp: 6500 });
    if (p === 0 && oTrong % 2 === 0 && canhTrang !== 3) phat(tieng.queo, t - 0.12, { bus: busNhac, g: MUC_CU.choi - 15 + 20 * Math.log10(dyn), pan: 0.22, phong: 0, ngoaiT: 0, lp: 4500 });
    if (p === 1 && canhTrang !== 3 && rnd() < 0.55) {
      const tt = t + PH * SWING + nhipLech();
      hop.tay.slice(-3).forEach((m, i) => not('vibes', m < 53 ? m + 12 : m, tt + i * 0.01, ketThucO - tt, 0.3 * dyn, { lop: 'v1', pan: 0.18, tha: 0.15, bus: rungVibes, gui: 0 }));
    }
    for (const x of giaiO.filter((y) => y.b >= p && y.b < p + 1)) {
      const tt = t + (viTri(x.b) - Math.floor(x.b)) * PH + nhipLech(), het = Math.max(tt + x.d * PH, Math.min(ketThucO, tt + x.d * PH + PH));
      not('vibes', x.m, tt, het - tt, (x.b === 0 ? 0.62 : 0.55) * dyn * ngau(0.92, 1.05), { lop: 'v2', pan: 0.18, tha: 0.18, bus: rungVibes, gui: 0 });
    }
    if (canhTrang === 2 && phimChay && !phimDung && t >= ostToi - 1e-6) { ostinato(t, 0); ostToi = t + PH; }
    if (canhTrang === 0 && tieng.tich) { lanDongHo++; phat(lanDongHo % 2 ? tieng.tich : tieng.tac, t, { g: -22 + ngau(-1, 1), pan: 0.45, phong: 0.6, ngoaiT: 0 }); }
  }
  function ostinato(t, tu) {
    for (let h = tu; h < 2; h++) phat(tieng.choi, t + h * PH * 0.5, { bus: busNhac, g: MUC_CU.choi - 13 - (h ? 3 : 0), pan: 0.22, phong: 0, ngoaiT: 0, lp: 5000, nhom: 'ost' });
  }

  const hen = {};
  function lichNoi(now) {
    const k = canhTrang;
    if (k === 1 && tieng.giot) {
      if (hen.mua == null) hen.mua = now + 0.3;
      while (hen.mua < now + 1) { phat(tieng.giot, hen.mua, { g: ngau(-29, -21), pan: ngau(-0.8, 0.8), rate: ngau(0.9, 1.12), phong: 0.2, ngoaiT: 0.2, lp: 4200 }); hen.mua += -Math.log(1 - rnd()) / 4; }
    } else hen.mua = null;
    if (k === 4 && tieng.chi) {
      if (hen.chi == null) hen.chi = now + 1.2;
      while (hen.chi < now + 1) {
        const so = 2 + Math.floor(rnd() * 4), pan = ngau(-0.15, 0.25); let tt = hen.chi;
        for (let i = 0; i < so; i++) { phat(tieng.chi, tt, { g: ngau(-23, -18), pan, rate: ngau(0.92, 1.1), phong: 0.35, ngoaiT: 0 }); tt += ngau(0.2, 0.34); }
        hen.chi = tt + ngau(3, 7);
      }
    } else hen.chi = null;
  }

  let daMeo = false, lanPhim = -9, dayPhim = 0, lanChuong = -9;
  function canh(toi) {
    toi = kep(toi | 0, 0, 5);
    if (toi === canhTrang) return;
    canhTrang = toi;
    if (toi !== 2) phimChay = false;
    vongCho = toi === 2 && phimDung ? VONG_SAU_DUNG : VONG_CUA_CANH[toi];
    if (ctx) { const nv = NOI_VANG[toi]; guiPhong.gain.setTargetAtTime(nv.phong, ctx.currentTime, 0.4); guiNgoai.gain.setTargetAtTime(nv.ngoai, ctx.currentTime, 0.4); }
    hen.mua = null; hen.chi = null;
    nhatKy.push([ctx ? +ctx.currentTime.toFixed(2) : 0, 'canh', toi]);
  }
  function su(ten, d = {}) {
    if (!ctx || !on || ctx.state !== 'running') { if (ten === 'dung') phimDung = true; if (ten === 'chay') { phimChay = true; phimDung = false; } return; }
    const now = ctx.currentTime, t = now + (d.tre || 0);
    nhatKy.push([+t.toFixed(2), ten]); if (nhatKy.length > 400) nhatKy.splice(0, 100);
    switch (ten) {
      case 'rit': {
        const dinh = d.dinh == null ? 0.62 : d.dinh;
        phat(lay('rit'), now + dinh - 0.62, { g: d.nho ? -13 : -8, pan: 0.05, phong: 0.5, ngoaiT: 0 }); break;
      }
      case 'roi': {
        phat(lay('roi'), t, { g: -11, pan: -0.25, phong: 0.15, ngoaiT: 0.5 });
        if (tieng.got) { let tt = t + 1.4; for (let i = 0; i < 4; i++) { phat(tieng.got[i % tieng.got.length], tt, { g: -17 - i * 2.5, pan: -0.2 - i * 0.1, rate: ngau(0.98, 1.02), phong: 0.25, ngoaiT: 0.75 + i * 0.1, lp: 4600 - i * 600 }); tt += ngau(0.6, 0.68); } }
        break;
      }
      case 'chay': {
        phimChay = true; phimDung = false;
        if (canhTrang !== 2 || !phachToi) break;
        const moc = PH / 2, goc0 = phachToi - Math.ceil((phachToi - t) / PH) * PH;
        let tt = goc0; while (tt < t + 0.03) tt += moc;
        for (const het = tt + 4.0; tt < het && tt < phachToi; tt += moc) { const p0 = Math.round((tt - goc0) / moc) % 2; ostinato(tt - p0 * moc, p0 === 0 ? 0 : 1); if (p0 === 0) tt += moc; }
        ostToi = Math.max(ostToi, phachToi);
        break;
      }
      case 'khung': phat(lay('khung'), t, { g: -14 + ngau(-1, 1), pan: 0.1, rate: ngau(0.98, 1.03), phong: 0.35, ngoaiT: 0 }); break;
      case 'dung': {
        phat(lay('chot'), t, { g: -9, pan: 0.1, phong: 0.4, ngoaiT: 0 });
        phimChay = false; phimDung = true; dungNhom('ost', t + 0.05);
        if (canhTrang === 2) vongCho = VONG_SAU_DUNG;
        break;
      }
      case 'chap': {
        const re = lay('re'), nhip = d.nhip || [[0, 0.8]];
        const s = ctx.createBufferSource(); s.buffer = re.buf;
        const g = ctx.createGain(); g.gain.setValueAtTime(0, t);
        for (const [o, sau] of nhip) {
          const a = t + o, muc = dB(-21) * kep(sau, 0.3, 1);
          g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(muc, a + 0.04); g.gain.setValueAtTime(muc, a + 0.11); g.gain.linearRampToValueAtTime(0, a + 0.2);
          phat(lay('xet'), a + 0.01, { g: -24, pan: 0.3, phong: 0.1, ngoaiT: 0.35 });
        }
        const p = ctx.createStereoPanner(); p.pan.value = 0.3; s.connect(g).connect(p); p.connect(busNoi);
        const v = ctx.createGain(); v.gain.value = 0.35; p.connect(v).connect(guiNgoai);
        const het = Math.max(...nhip.map((x) => x[0])) + 0.25, bo = rnd() * Math.max(0, re.buf.duration - het - 0.05);
        s.start(t, bo); s.stop(t + het);
        if (!daMeo && tieng.meo) { daMeo = true; phat(tieng.meo, t + het + 0.5, { g: -22, pan: 0.55, phong: 0.35, ngoaiT: 0.55, lp: 5500 }); }
        break;
      }
      case 'keo': phat(lay('keo'), t, { g: ngau(-25, -20), pan: 0.35, rate: ngau(0.94, 1.06), phong: 0.6, ngoaiT: 0 }); break;
      case 'phim': case 'cach': {
        if (now - lanPhim < 0.055) break;
        dayPhim = now - lanPhim < 1.2 ? dayPhim + 1 : 0; lanPhim = now;
        const giam = Math.min(5, dayPhim * 0.2);
        if (ten === 'phim') phat(lay('phim'), now, { g: -13 - giam + ngau(-1.5, 1), pan: ngau(-0.05, 0.12), rate: ngau(0.97, 1.03), phong: 0.3, ngoaiT: 0 });
        else phat(lay('cach'), now, { g: -14 - giam, pan: 0.05, phong: 0.3, ngoaiT: 0 });
        break;
      }
      case 'dong': if (now - lanChuong > 3) { lanChuong = now; phat(lay('chuong'), now, { g: -17, pan: 0.25, phong: 0.4, ngoaiT: 0 }); } break;
      case 'dau': {
        phat(lay('dau'), t, { g: -7, pan: 0, phong: 0.3, ngoaiT: 0 });
        ketCho = true; break;
      }
      default: break;
    }
  }

  function tick() {
    if (!ctx || !on || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (nhacSan && tieng.choi) {
      if (!phachToi) phachToi = Math.max(now + 0.15, phachHen);
      if (phachToi < now - 0.1) { const bo = Math.ceil((now - phachToi) / PH); phachToi += bo * PH; phachSo += bo; }
      while (phachToi < now + TRUOC) { choiPhach(phachSo, phachToi); phachSo++; phachToi += PH; }
    }
    lichNoi(now);
  }
  function lenTieng(tg) { const t = ctx.currentTime; tong.gain.cancelScheduledValues(t); tong.gain.setValueAtTime(tong.gain.value, t); tong.gain.linearRampToValueAtTime(1, t + tg); }
  function langTieng(tg) { const t = ctx.currentTime; tong.gain.cancelScheduledValues(t); tong.gain.setValueAtTime(tong.gain.value, t); tong.gain.linearRampToValueAtTime(0, t + tg); }
  function khiAn() {
    if (!ctx) return;
    if (document.hidden) { if (ctx.state === 'running') langTieng(0.5); clearTimeout(henTat); henTat = setTimeout(() => { if (document.hidden) ctx.suspend(); }, 560); }
    else if (on) { clearTimeout(henTat); ctx.resume().then(() => lenTieng(0.8)); }
  }

  let phan = null;
  return {
    get dangBat() { return on; },
    get daTao() { return !!ctx; },
    bat({ batDau = 0.15, len = 1.0 } = {}) {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
        ctx = new AC({ latencyHint: 'playback' });
        dung();
        phachHen = ctx.currentTime + batDau;
        lay('rit');
        doBu().then((bu) => { sauHan.gain.value = dB(-bu); }).catch(() => {});
        napMau().catch((e) => console.warn('[am-thanh] không tải được mẫu nhạc cụ', e));
        dungTiengNoi();
        document.addEventListener('visibilitychange', khiAn);
      }
      on = true;
      const p = ctx.resume();
      lenTieng(len);
      clearTimeout(henTat); clearInterval(timer); timer = setInterval(tick, 100); tick();
      return p;
    },
    tat(lang = 0.5) {
      on = false;
      if (!ctx) return;
      langTieng(lang);
      clearTimeout(henTat); henTat = setTimeout(() => { if (!on) { ctx.suspend(); clearInterval(timer); } }, lang * 1000 + 60);
    },
    canh,
    datCanh(k, o = {}) { if (o.phimDung) phimDung = true; canhTrang = -1; canh(k); },
    su,
    _lop(ten, bat) { if (!ctx) return; const n = ten === 'nhac' ? busNhac : busNoi; n.gain.value = bat ? dB(MUC[ten]) : 0; },
    _nut: () => (ctx ? { ctx, ra: sauHan } : null),
    _datTieng(ten, v) { tieng[ten] = v; },
    _phat: (v, t, o) => (ctx ? phat(v, t, o) : null),
    phanTich() { if (!ctx) return null; if (!phan) { phan = ctx.createAnalyser(); phan.fftSize = 1024; phan.smoothingTimeConstant = 0; sauHan.connect(phan); } return phan; },
    trangThai:() => ({ ctx: ctx ? ctx.state : 'chưa tạo', on, nhacSan, canhTrang, vongNhac, phachSo, soMau: mau.bass.length + mau.vibes.length, tieng: Object.keys(tieng).length, nhatKy: nhatKy.slice() }),
  };
}

function* choiCham(a, sr, r) {
  const lp = T.bq('lp', 5200, 0.7, sr), hp = T.bq('hp', 350, 0.7, sr), bp = T.bq('bp', 1700, 0.6, sr), n = a.length;
  for (let i = 0; i < n; i++) { const t = i / sr, e = Math.min(1, t / 0.004) * Math.exp(-t / 0.045); a[i] = lp(hp(bp(r() * 2 - 1))) * e; }
  const tat = (f, amp, tau) => { const w = 2 * Math.PI * f / sr; for (let i = 0; i < n; i++) a[i] += Math.sin(w * i) * amp * Math.exp(-i / sr / tau) * Math.min(1, i / (sr * 0.002)); };
  tat(195 * (0.97 + 0.06 * r()), 0.25, 0.03); tat(330, 0.12, 0.02);
  yield;
}
function* choiQuet(a, sr, r) {
  const n = a.length, lp = T.bq('lp', 3800, 0.7, sr), hp = T.bq('hp', 500, 0.7, sr);
  for (let i = 0; i < n; i++) { const u = i / n, e = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.25)), 1.5); a[i] = lp(hp(r() * 2 - 1)) * e; }
  yield;
}
