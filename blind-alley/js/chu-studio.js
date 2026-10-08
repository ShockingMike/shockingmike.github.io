import * as THREE from 'three';
import { CHU, thanChu } from './chu.js';
import { HEX } from './npr.js';
import { KIEU } from './bo-cuc.js';

const V = `
uniform vec4 uRect; varying vec2 vUv;
void main() { vUv = uv; vec2 p = uRect.xy + (position.xy * 0.5 + 0.5) * uRect.zw; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
const F = `
uniform sampler2D uT, uM; uniform float uGo, uNhanA, uA; varying vec2 vUv;
void main() {
  vec4 c = texture2D(uT, vUv); if (c.a < 0.01) discard;
  vec4 m = texture2D(uM, vUv);
  if (m.r > 0.5) c.a *= uNhanA;
  else { float k = floor(m.g * 255.0 + 0.5) * 256.0 + floor(m.b * 255.0 + 0.5); if (k > 0.5 && k > uGo) discard; }
  c.a *= uA;
  if (c.a < 0.01) discard;
  gl_FragColor = c;
}`;

const rngSo = (seed) => { let a = seed >>> 0; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); };

export function makeChuStudio(nguon = CHU.studio, { dom = true } = {}) {
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  const cvM = document.createElement('canvas'), gM = cvM.getContext('2d');
  const texM = new THREE.CanvasTexture(cvM);
  texM.colorSpace = THREE.NoColorSpace; texM.generateMipmaps = false; texM.minFilter = THREE.NearestFilter; texM.magFilter = THREE.NearestFilter;
  const mat = new THREE.ShaderMaterial({ uniforms: { uT: { value: tex }, uM: { value: texM }, uGo: { value: 0 }, uNhanA: { value: 0 }, uA: { value: 1 }, uRect: { value: new THREE.Vector4() } }, vertexShader: V, fragmentShader: F, transparent: true, depthTest: false, depthWrite: false });
  const sc = new THREE.Scene(); const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); q.frustumCulled = false; sc.add(q);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const L = { box: { x: 0, y: 0, w: 1, h: 1 }, dong: [], nhan: null, than: null, dpr: 1, ve: -2, het: 1, tThan: 0, nChu: 0 };
  const nghe = {};

  const fontThan = (fs) => `${fs}px "${KIEU.than.font}", "Courier Prime", monospace`;
  const LIEN = nguon.kieuThan === 'dong' || nguon.kieuThan === 'doan';
  const GT = LIEN ? { ...KIEU.than.gach, thut: 0, cach: 0, nghi: 0.3 } : KIEU.than.gach;
  const DOAN = nguon.kieuThan === 'doan';
  function ngat(fs, cot) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.font = fontThan(fs);
    const rong = cot - GT.thut * fs, out = [];
    if (DOAN) {
      nguon.than.forEach((txt, gi) => {
        const w = thanChu(txt).split(' '), N = w.length, sp = g.measureText(' ').width, ww = w.map((t) => g.measureText(t).width);
        const dai = (i, j) => { let x = 0; for (let k = i; k < j; k++) x += ww[k] + (k > i ? sp : 0); return x; };
        let n = 1, x = 0; for (let k = 0; k < N; k++) { const t = x ? x + sp + ww[k] : ww[k]; if (t > rong && x) { n++; x = ww[k]; } else x = t; }
        const tb = dai(0, N) / n;
        const f = Array.from({ length: n + 1 }, () => new Array(N + 1).fill(Infinity)), tu = Array.from({ length: n + 1 }, () => new Array(N + 1).fill(0));
        f[0][0] = 0;
        for (let a = 1; a <= n; a++) for (let j = a; j <= N; j++) for (let i = a - 1; i < j; i++) {
          const d = dai(i, j); if (d > rong && j - i > 1) continue;
          const v = f[a - 1][i] + (d - tb) * (d - tb); if (v < f[a][j]) { f[a][j] = v; tu[a][j] = i; }
        }
        const ds = []; let j = N; for (let a = n; a >= 1; a--) { const i = tu[a][j]; ds.unshift(w.slice(i, j).join(' ')); j = i; }
        ds.forEach((t, i) => out.push({ text: t, gach: gi, dau: i === 0 }));
      });
      return out;
    }
    nguon.than.forEach((txt, gi) => {
      const ca = thanChu(txt);
      const dong = [];
      if (g.measureText(ca).width <= rong) dong.push(ca);
      else {
        let cur = '';
        for (const cum of txt.split(' | ')) {
          const t = cur ? cur + ' ' + cum : cum;
          if (g.measureText(t).width <= rong) { cur = t; continue; }
          if (cur) dong.push(cur);
          cur = '';
          for (const w of cum.split(' ')) { const t2 = cur ? cur + ' ' + w : w; if (g.measureText(t2).width > rong && cur) { dong.push(cur); cur = w; } else cur = t2; }
        }
        if (cur) dong.push(cur);
      }
      dong.forEach((t, i) => out.push({ text: t, gach: gi, dau: i === 0 }));
    });
    return out;
  }
  function demDong(fs, cot, lh = KIEU.than.lh) { const d = ngat(fs, cot); return d.length + (nguon.than.length - 1) * GT.cach / lh; }
  function rongGach(fs) { g.setTransform(1, 0, 0, 1, 0, 0); g.font = fontThan(fs); return GT.thut * fs + Math.max(...nguon.than.map((t) => g.measureText(thanChu(t)).width)); }
  function rongThan(fs, cot) { const ds = ngat(fs, cot); g.setTransform(1, 0, 0, 1, 0, 0); g.font = fontThan(fs); return GT.thut * fs + Math.max(...ds.map((d) => g.measureText(d.text).width)); }

  function dung(bc, W, H, dpr, tCuoi) {
    const N = bc.nhan, T = bc.than;
    const dongs = ngat(T.fs, T.cot);
    const R = rngSo(KIEU.than.hat);
    g.font = fontThan(T.fs);
    const sp = g.measureText(' ').width, thut = GT.thut * T.fs;
    let yy = 0;
    L.dong = dongs.map((l, i) => {
      if (i > 0 && l.dau) yy += GT.cach * T.fs;
      let x = thut; const tu = [];
      for (const w of l.text.split(' ')) { const dy = (R() - 0.5) * 2 * KIEU.than.lechChan, op = KIEU.than.damNhat[0] + R() * (KIEU.than.damNhat[1] - KIEU.than.damNhat[0]); tu.push({ w, x, dy, op }); x += g.measureText(w).width + sp; }
      const d = { tu, y: T.y + yy + T.fs * (0.5 + T.lh / 2) - T.fs * 0.18, rong: x - sp, gach: l.gach, dau: l.dau };
      yy += T.fs * T.lh;
      return d;
    });
    L.thanH = yy;
    const nhanTxt = nguon.nhan ? nguon.nhan.toUpperCase() : '';
    g.font = fontThan(N.fs);
    const kt = []; let nx = 0;
    for (const ch of nhanTxt) { kt.push({ ch, x: nx }); nx += g.measureText(ch).width + KIEU.nhan.gian * N.fs; }
    L.nhan = { ...N, kt, rong: Math.max(0, nx - KIEU.nhan.gian * N.fs) };
    L.than = T;
    const thanW = Math.max(...L.dong.map((d) => d.rong)), thanH = L.thanH;
    const coNhan = kt.length > 0;
    const x0 = Math.floor((coNhan ? Math.min(N.x, T.x) : T.x) - 6), y0 = Math.floor((coNhan ? Math.min(N.y, T.y) : T.y) - 6);
    const x1 = Math.ceil((coNhan ? Math.max(N.x + L.nhan.rong, T.x + thanW) : T.x + thanW) + 6), y1 = Math.ceil((coNhan ? Math.max(N.y + N.fs * 1.4, T.y + thanH) : T.y + thanH) + 6);
    L.box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    L.boxThan = [T.x, T.y, T.x + thanW, T.y + thanH];
    L.boxNhan = [N.x, N.y, N.x + L.nhan.rong, N.y + N.fs * 1.2];
    L.dpr = dpr;
    const nw = Math.ceil(L.box.w * dpr), nh = Math.ceil(L.box.h * dpr);
    if (cv.width !== nw || cv.height !== nh) { tex.dispose(); texM.dispose(); cv.width = nw; cv.height = nh; cvM.width = nw; cvM.height = nh; }
    datKhung(W, H);
    L.tThan = tCuoi + 0.05;
    L.ve = -2;
    veSan();
    L.het = L.tThan + L.nChu / KIEU.than.goMoiGiay + 0.05;
    const set = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
    if (typeof dom === 'function' ? dom() : dom) { set('tieu-de', nguon.tieuDe); set('nhan-studio', nguon.nhan || ''); }
  }
  function moc() { return { than: L.boxThan, nhan: L.boxNhan }; }
  function datKhung(W, H) { mat.uniforms.uRect.value.set(L.box.x / W, 1 - (L.box.y + L.box.h) / H, L.box.w / W, L.box.h / H); }
  function veSan() {
    const d = L.dpr, ox = L.box.x, oy = L.box.y;
    for (const gg of [g, gM]) { gg.setTransform(1, 0, 0, 1, 0, 0); gg.clearRect(0, 0, cv.width, cv.height); gg.setTransform(d, 0, 0, d, -ox * d, -oy * d); gg.textBaseline = 'alphabetic'; }
    g.fillStyle = KIEU.than.mau;
    g.font = fontThan(L.nhan.fs); gM.font = g.font;
    for (const c of L.nhan.kt) g.fillText(c.ch, L.nhan.x + c.x, L.nhan.y + L.nhan.fs);
    if (L.nhan.kt.length) { gM.fillStyle = 'rgb(255,0,0)'; gM.fillRect(L.nhan.x - 4, L.nhan.y - 4, L.nhan.rong + 8, L.nhan.fs * 1.5 + 8); }
    g.font = fontThan(L.than.fs); gM.font = g.font;
    let k = 0; L.gachK = [];
    const fs = L.than.fs, nghi = Math.round(GT.nghi * KIEU.than.goMoiGiay);
    for (const dg of L.dong) {
      if (dg.dau) {
        if (dg.gach > 0) k += nghi;
        if (!LIEN) L.gachK.push(k);
        if (!LIEN) {
          veDauCat(g, L.than.x, dg.y, fs);
          gM.fillStyle = `rgb(0,${((k + 1) >> 8) & 255},${(k + 1) & 255})`;
          gM.fillRect(L.than.x - 2, dg.y - fs * 1.05, GT.thut * fs - 2, fs * 1.45);
        }
      }
      for (const t of dg.tu) {
        g.globalAlpha = t.op; g.fillText(t.w, L.than.x + t.x, dg.y + t.dy); g.globalAlpha = 1;
        let x = L.than.x + t.x;
        for (let i = 0; i < t.w.length; i++) {
          const w = g.measureText(t.w.slice(0, i + 1)).width - g.measureText(t.w.slice(0, i)).width;
          k++; gM.fillStyle = `rgb(0,${(k >> 8) & 255},${k & 255})`;
          gM.fillRect(Math.floor((x - 1) * d) / d, dg.y + t.dy - L.than.fs * 1.05, Math.ceil((w + 2) * d) / d, L.than.fs * 1.45);
          x += w;
        }
        k++;
      }
    }
    L.nChu = k;
    tex.needsUpdate = true; texM.needsUpdate = true;
  }
  function veDauCat(gg, x, yChan, fs) {
    const dai = GT.dai * fs, day = GT.day * fs, a = GT.goc * Math.PI / 180;
    const cx = x + dai * Math.cos(a) / 2, cy = yChan - fs * 0.34;
    const ux = Math.cos(a), uy = -Math.sin(a), nx = -uy, ny = ux;
    const A = [cx - ux * dai / 2, cy - uy * dai / 2], B = [cx + ux * dai / 2, cy + uy * dai / 2];
    gg.save(); gg.globalAlpha = 1; gg.fillStyle = HEX.do; gg.beginPath();
    gg.moveTo(A[0], A[1]);
    gg.quadraticCurveTo(cx + nx * day, cy + ny * day, B[0], B[1]);
    gg.quadraticCurveTo(cx - nx * day * 0.35, cy - ny * day * 0.35, A[0], A[1]);
    gg.fill(); gg.restore();
  }
  function ve(s) {
    const k = Math.min(s, L.het);
    if (Math.abs(k - L.ve) < 1e-4) return;
    if (nghe.go && L.ve < L.tThan && k >= L.tThan && k < L.tThan + 0.25) nghe.go(L.het - L.tThan, (L.gachK || []).map((c) => c / KIEU.than.goMoiGiay));
    L.ve = k < 0 ? -1 : k;
    mat.uniforms.uNhanA.value = Math.min(1, Math.max(0, (k - 0.05) / 0.3));
    mat.uniforms.uGo.value = k >= L.het ? 1e6 : Math.max(0, Math.floor((k - L.tThan) * KIEU.than.goMoiGiay));
  }
  function render(renderer) {
    if (L.ve < 0) return;
    const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(sc, cam); renderer.autoClear = ac;
  }
  return { dung, ve, render, moc, demDong, rongGach, rongThan, datKhung, datA: (a) => { mat.uniforms.uA.value = a; }, L, xong: () => L.ve >= L.het, lien: LIEN, nghe };
}
