import * as THREE from 'three';
import { C, COMMON } from './npr.js';
import { catDong, diemChu } from './chu-cat.js';

const MAT_V = `
attribute float aHien; attribute float aEp; attribute vec4 aO;
varying vec2 vUv; varying float vHien; varying float vEp; varying vec4 vO;
void main() { vUv = uv; vHien = aHien; vEp = aEp; vO = aO; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const MAT_F = `
uniform sampler2D uA; uniform vec2 uLech; uniform float uCell, uTan; uniform vec3 cGiay, cSang, cDem;
varying vec2 vUv; varying float vHien;
float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  if (vHien < 0.5) discard;
  if (h21(floor(gl_FragCoord.xy / max(1.0, uCell * 1.5)) + 9.1) < uTan) discard;
  float mat = texture2D(uA, vUv).r;
  float m1 = texture2D(uA, vUv - uLech).r, m2 = texture2D(uA, vUv - uLech * 2.0).r, m3 = texture2D(uA, vUv - uLech * 3.0).r;
  float canh = max(m1, max(m2, m3));
  float phu = max(mat, canh);
  if (phu < 0.02) discard;
  vec2 cell = floor(gl_FragCoord.xy / uCell);
  vec3 c = cGiay + (h21(cell) + h21(cell + 7.3) - 1.0) * (12.0 / 255.0);
  vec3 e = (max(m1, m2) > 0.5) ? cSang : cDem;
  vec3 col = mat > 0.5 ? c : e;
  gl_FragColor = vec4(col, mat > 0.5 ? mat : canh);
}`;

const BONG_F = `
${COMMON}
uniform sampler2D uA; uniform vec2 uOff; uniform float uCell, uDam, uTan;
uniform sampler2D uSdfT; uniform vec4 uSdfRT; uniform float uCheChu, uCssK, uHdev;
varying vec2 vUv; varying float vHien; varying float vEp; varying vec4 vO;
void main() {
  if (vHien < 0.5) discard;
  if (hash13(vec3(floor(gl_FragCoord.xy / max(1.0, uCell * 1.5)), 9.1)) < uTan) discard;
  if (uCheChu > 0.5) {
    vec2 sp = vec2(gl_FragCoord.x, uHdev - gl_FragCoord.y) * uCssK;
    vec2 tq = (sp - uSdfRT.xy) / uSdfRT.zw;
    if (tq.x > 0.0 && tq.y > 0.0 && tq.x < 1.0 && tq.y < 1.0 && (texture2D(uSdfT, tq).r - 0.5) * 128.0 < 1.0) discard;
  }
  vec2 q = vUv - uOff * vEp;
  if (q.x < vO.x || q.y < vO.y || q.x > vO.z || q.y > vO.w) discard;
  float b = texture2D(uA, q).b * uDam;
  vec2 cell = floor(gl_FragCoord.xy / uCell);
  float a = rutTham(b, hash13(vec3(cell, 5.0)), 0.55);
  if (a < 0.02) discard;
  gl_FragColor = vec4(vec3(8.0, 6.0, 10.0) / 255.0, a);
}`;

const LONG_F = `
${COMMON}
uniform sampler2D uA; uniform float uCell, uT, uTan; uniform vec3 cSang;
varying vec2 vUv; varying float vHien; varying float vEp; varying vec4 vO;
float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
void main() {
  float fill = vEp;
  if (fill < 0.01) discard;
  if (h21(floor(gl_FragCoord.xy / max(1.0, uCell * 1.5)) + 9.1) < uTan) discard;
  float m = texture2D(uA, vUv).g;
  if (m < 0.5) discard;
  vec2 sp = gl_FragCoord.xy / uCell;
  float ph = uT * 0.6283185;
  float n = vn(sp * 0.09 + vec2(cos(ph), sin(ph)) * 1.7 + vec2(0.0, -uT * 0.25));
  float n2 = vn(sp * 0.21 + vec2(sin(ph), cos(ph)) * 2.3);
  float hinh = smoothstep(0.3, 0.75, n * 0.7 + n2 * 0.45);
  float a = fill * 0.6 * mix(rutTham(hinh, h21(floor(sp)), 0.75), hinh, step(0.6, hinh));
  if (a < 0.02) discard;
  gl_FragColor = vec4(cSang + (h21(floor(sp) + 3.1) - 0.5) * (10.0 / 255.0), a);
}`;

const GB_F = `
uniform sampler2D uA; uniform float uId; varying vec2 vUv; varying float vHien; varying float vZ;
void main() { if (vHien < 0.5 || texture2D(uA, vUv).r < 0.5) discard; gl_FragColor = vec4(0.5, 0.5, vZ, uId); }`;
const GB_V = `
attribute float aHien; varying vec2 vUv; varying float vHien; varying float vZ;
void main() { vUv = uv; vHien = aHien; vec4 vp = modelViewMatrix * vec4(position, 1.0); vZ = -vp.z; gl_Position = projectionMatrix * vp; }`;

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function xuoi(d, w, h) {
  const b = 1.4142;
  for (let y = 0; y < h; y++) {
    const r = y * w;
    for (let x = 0; x < w; x++) {
      const i = r + x; let v = d[i], t;
      if (x > 0 && (t = d[i - 1] + 1) < v) v = t;
      if (y > 0) { if ((t = d[i - w] + 1) < v) v = t; if (x > 0 && (t = d[i - w - 1] + b) < v) v = t; if (x < w - 1 && (t = d[i - w + 1] + b) < v) v = t; }
      d[i] = v;
    }
  }
}
function nguoc(d, w, h) {
  const b = 1.4142;
  for (let y = h - 1; y >= 0; y--) {
    const r = y * w;
    for (let x = w - 1; x >= 0; x--) {
      const i = r + x; let v = d[i], t;
      if (x < w - 1 && (t = d[i + 1] + 1) < v) v = t;
      if (y < h - 1) { if ((t = d[i + w] + 1) < v) v = t; if (x < w - 1 && (t = d[i + w + 1] + b) < v) v = t; if (x > 0 && (t = d[i + w - 1] + b) < v) v = t; }
      d[i] = v;
    }
  }
}

export function makeTieuDe(font) {
  const group = new THREE.Group(); group.name = 'TieuDe';
  const cv = document.createElement('canvas');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.premultiplyAlpha = false;
  const U = {
    uA: { value: tex }, uLech: { value: new THREE.Vector2() }, uCell: { value: 2 }, uOff: { value: new THREE.Vector2() }, uDam: { value: 0.92 }, uT: { value: 0 }, uTan: { value: 0 },
    cGiay: { value: C.giay }, cSang: { value: C.chamSang }, cDem: { value: C.chamDem },
  };
  const matMat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: MAT_V, fragmentShader: MAT_F, alphaToCoverage: true, side: THREE.DoubleSide });
  const UB = { uSdfT: { value: null }, uSdfRT: { value: new THREE.Vector4(0, 0, 1, 1) }, uCssK: { value: 1 }, uHdev: { value: 1 } };
  const matBong = new THREE.ShaderMaterial({ uniforms: { ...U, ...UB, uCheChu: { value: 0 } }, vertexShader: MAT_V, fragmentShader: BONG_F, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const matBongT = new THREE.ShaderMaterial({ uniforms: { ...U, ...UB, uCheChu: { value: 1 } }, vertexShader: MAT_V, fragmentShader: BONG_F, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const matLong = new THREE.ShaderMaterial({ uniforms: U, vertexShader: MAT_V, fragmentShader: LONG_F, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const matNa = new THREE.ShaderMaterial({ uniforms: U, vertexShader: MAT_V, fragmentShader: 'uniform sampler2D uA; varying vec2 vUv; varying float vHien; void main() { if (vHien < 0.5 || texture2D(uA, vUv).r < 0.5) discard; gl_FragColor = vec4(1.0); }', side: THREE.DoubleSide });
  const gbMat = new THREE.ShaderMaterial({ uniforms: { uA: U.uA, uId: { value: 40 } }, vertexShader: GB_V, fragmentShader: GB_F, side: THREE.DoubleSide });
  const mkMesh = (m, ro) => { const me = new THREE.Mesh(new THREE.BufferGeometry(), m); me.frustumCulled = false; me.renderOrder = ro; group.add(me); return me; };
  const meshMat = mkMesh(matMat, 0), meshBong = mkMesh(matBong, 2), meshLong = mkMesh(matLong, 4), meshBongT = mkMesh(matBongT, 6);
  const sdf = { tex: new THREE.DataTexture(new Uint8Array(4), 1, 1), rect: new THREE.Vector4(0, 0, 1, 1), px: new THREE.Vector2(1, 1) };
  const L = { chu: [], long: [], dongs: [], cap: 100, box: [0, 0, 1, 1], zT: 2.6, het: 1.5, tCuoi: 1.2, inkTrai: 0, ve: -9, ok: false };
  const nghe = {};

  function xongSdf(pha = 0) { dungSdf(L.Wc, L.Hc, pha); if (pha !== 1) { UB.uSdfT.value = sdf.tex; UB.uSdfRT.value.copy(sdf.rect); } }
  const sdfBuoc = () => [() => dungSdf(L.Wc, L.Hc, 1), () => SD.xuoi(SD.dO), () => SD.nguoc(SD.dO), () => { SD.xuoi(SD.dI); SD.nguoc(SD.dI); }, () => dungSdf2(1), () => { dungSdf2(2); UB.uSdfT.value = sdf.tex; UB.uSdfRT.value.copy(sdf.rect); }];
  function dung(dongs, cam, Wc, Hc, dpr, zT, dprMan = 1, hoan = false) {
    L.dongs = dongs; L.zT = zT; L.cap = Math.max(...dongs.map((d) => d.cap));
    const chu = []; let i = 0;
    dongs.forEach((d, li) => {
      const cat = catDong(font, d.text.toUpperCase(), d.cap, d.seed, 0.06);
      d.cat = cat;
      cat.chu.forEach((c) => {
        const vong = c.vong.map((v) => ({ long: v.long, pts: v.pts.map((p) => diemChu(c, d.x, d.y, p)) }));
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const v of vong) for (const p of v.pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
        chu.push({ ch: c.ch, li, c, ox: d.x, oy: d.y, cap: d.cap, vong, bb: [x0, y0, x1, y1], lop: (i + li) % 2, i: i++ });
      });
    });
    L.chu = chu;
    L.box = [Math.min(...chu.map((c) => c.bb[0])), Math.min(...chu.map((c) => c.bb[1])), Math.max(...chu.map((c) => c.bb[2])), Math.max(...chu.map((c) => c.bb[3]))];
    L.inkTrai = chu[0].bb[0];
    const s = L.cap / 158;
    const K = Math.max(1, 2.6 * s);
    const off = [10 * s, 14 * s], blur = Math.max(3, 10 * s);
    const mB = Math.ceil(blur * 1.6 + 2), mF = Math.ceil(K * 3 + 2);
    let area = 0; for (const c of chu) area += (c.bb[2] - c.bb[0] + 2 * mB) * (c.bb[3] - c.bb[1] + 2 * mB);
    const k = Math.min(dpr, 2, Math.sqrt(5.5e6 / Math.max(1, area)));
    const AW = Math.min(4096, Math.max(256, Math.ceil(Math.sqrt(area * k * k) * 1.25)));
    let px = 2, py = 2, hang = 0;
    for (const c of chu) {
      const w = Math.ceil((c.bb[2] - c.bb[0] + 2 * mB) * k), h = Math.ceil((c.bb[3] - c.bb[1] + 2 * mB) * k);
      if (px + w + 2 > AW) { px = 2; py += hang + 2; hang = 0; }
      c.o = [px, py, w, h, c.bb[0] - mB, c.bb[1] - mB];
      px += w + 2; hang = Math.max(hang, h);
    }
    const AH = py + hang + 2;
    if (cv.width !== AW || cv.height !== AH) { tex.dispose(); cv.width = AW; cv.height = AH; }
    const g = cv.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, AW, AH);
    g.globalCompositeOperation = 'lighter';
    const veChu = (c, mau, ax, ay) => {
      g.save(); g.setTransform(k, 0, 0, k, ax, ay);
      g.translate(c.ox + c.c.x + c.c.adv / 2, c.oy + c.c.dy); g.rotate(c.c.rot); g.scale(c.c.sx, c.c.sy); g.translate(-c.c.adv / 2, 0);
      g.fillStyle = mau; g.fill(c.c.path, 'nonzero');
      g.lineJoin = 'miter'; g.lineWidth = Math.max(1, c.c.vien || 0); g.strokeStyle = mau; g.stroke(c.c.path);
      g.restore();
    };
    for (const c of chu) {
      const [ox, oy, , , sx, sy] = c.o;
      const ax = ox - sx * k, ay = oy - sy * k;
      g.save(); g.beginPath(); g.rect(c.o[0], c.o[1], c.o[2], c.o[3]); g.clip();
      veChu(c, '#ff0000', ax, ay);
      g.fillStyle = '#00ff00';
      for (const v of c.vong) if (v.long) { g.beginPath(); v.pts.forEach((p, j) => (j ? g.lineTo(ax + p[0] * k, ay + p[1] * k) : g.moveTo(ax + p[0] * k, ay + p[1] * k))); g.closePath(); g.fill(); }
      g.shadowColor = '#0000ff'; g.shadowBlur = blur * k; g.shadowOffsetX = 20000; g.shadowOffsetY = 0;
      veChu(c, '#0000ff', ax - 20000, ay);
      g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetX = 0;
      g.restore();
    }
    tex.needsUpdate = true;
    U.uLech.value.set(K / 3 * k / AW, -K / 3 * k / AH);
    U.uOff.value.set(off[0] * k / AW, -off[1] * k / AH);
    U.uCell.value = Math.max(1, Math.round(1.2 * dpr));
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    const tia = (x, y, z) => { const p = new THREE.Vector3(x / Wc * 2 - 1, 1 - y / Hc * 2, 0.5).unproject(cam); const d = p.sub(cam.position).normalize(); return cam.position.clone().addScaledVector(d, z / d.dot(fwd)); };
    const uvOf = (c, x, y) => [(c.o[0] + (x - c.o[4]) * k) / AW, 1 - (c.o[1] + (y - c.o[5]) * k) / AH];
    const quad = (arr, c, r, z, ext) => {
      const [x0, y0, x1, y1] = r;
      const P = [[x0, y1], [x1, y1], [x1, y0], [x0, y0]];
      const base = arr.pos.length / 3;
      for (const [x, y] of P) { const w = tia(x, y, z); arr.pos.push(w.x, w.y, w.z); arr.uv.push(...uvOf(c, x, y)); arr.hien.push(0); arr.ep.push(1); arr.o.push(ext[0], ext[1], ext[2], ext[3]); arr.ci.push(c.i); }
      arr.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const mk = () => ({ pos: [], uv: [], hien: [], ep: [], o: [], ci: [], idx: [] });
    const A = mk(), B = mk(), BT = mk(), Lg = mk();
    const zLop = (c) => zT + (c.lop ? 0.035 : -0.035);
    L.long = [];
    for (const c of chu) {
      const cell = [c.o[0] / AW, 1 - (c.o[1] + c.o[3]) / AH, (c.o[0] + c.o[2]) / AW, 1 - c.o[1] / AH];
      quad(A, c, [c.bb[0] - 1, c.bb[1] - 1, c.bb[2] + mF, c.bb[3] + mF], zLop(c), cell);
      if (c.lop) quad(B, c, [c.bb[0] - mB, c.bb[1] - mB, c.bb[2] + mB + off[0] * 1.8, c.bb[3] + mB + off[1] * 1.8], zT + 0.08, cell);
      else quad(BT, c, [c.bb[0] - mB, c.bb[1] - mB, c.bb[2] + mB + off[0] * 1.8, c.bb[3] + mB + off[1] * 1.8], zT - 0.015, cell);
      for (const v of c.vong) {
        if (!v.long) continue;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ar = 0;
        v.pts.forEach((p, j) => { const q = v.pts[(j + 1) % v.pts.length]; ar += p[0] * q[1] - q[0] * p[1]; x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
        const r = Math.sqrt(Math.abs(ar) / 2 / Math.PI);
        if (r < 3) continue;
        const n = L.long.length;
        quad(Lg, c, [x0 - 1, y0 - 1, x1 + 1, y1 + 1], zT, cell);
        L.long.push({ ci: c.i, x: (x0 + x1) / 2, y: (y0 + y1) / 2, r, fill: 0, v0: n * 4 });
      }
    }
    const setGeo = (mesh, a) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(a.uv, 2));
      geo.setAttribute('aHien', new THREE.Float32BufferAttribute(a.hien, 1));
      geo.setAttribute('aEp', new THREE.Float32BufferAttribute(a.ep, 1));
      geo.setAttribute('aO', new THREE.Float32BufferAttribute(a.o, 4));
      geo.setIndex(a.idx); geo.userData.ci = a.ci;
      mesh.geometry.dispose(); mesh.geometry = geo;
    };
    Lg.hien.fill(1); Lg.ep.fill(0);
    setGeo(meshMat, A); setGeo(meshBong, B); setGeo(meshBongT, BT); setGeo(meshLong, Lg);
    UB.uCssK.value = 1 / dprMan; UB.uHdev.value = Hc * dprMan;
    L.Wc = Wc; L.Hc = Hc;
    if (!hoan) xongSdf();
    for (const c of chu) c.t = 0.04 * c.i;
    L.tCuoi = 0.04 * (chu.length - 1) + 0.14;
    L.het = L.tCuoi + 0.1;
    L.ve = -9; L.ok = true;
  }

  let SD = null;
  function dungSdf(Wc, Hc, pha = 0) {
    if (pha === 2) return dungSdf2();
    const pad = 72, k = 0.5;
    const X0 = Math.max(0, Math.floor(L.box[0] - pad)), Y0 = Math.max(0, Math.floor(L.box[1] - pad));
    const X1 = Math.min(Wc, Math.ceil(L.box[2] + pad)), Y1 = Math.min(Hc, Math.ceil(L.box[3] + pad));
    const w = Math.max(4, Math.ceil((X1 - X0) * k)), h = Math.max(4, Math.ceil((Y1 - Y0) * k));
    const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
    const g = c2.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
    for (const c of L.chu) {
      g.save(); g.setTransform(k, 0, 0, k, -X0 * k, -Y0 * k);
      g.translate(c.ox + c.c.x + c.c.adv / 2, c.oy + c.c.dy); g.rotate(c.c.rot); g.scale(c.c.sx, c.c.sy); g.translate(-c.c.adv / 2, 0);
      g.fill(c.c.path, 'nonzero'); g.restore();
    }
    const im = g.getImageData(0, 0, w, h).data;
    const N = w * h, cov = new Float32Array(N), dO = new Float32Array(N), dI = new Float32Array(N);
    const BIG = 1e6;
    for (let i = 0; i < N; i++) { cov[i] = im[i * 4] / 255; const ins = cov[i] > 0.5; dO[i] = ins ? 0 : BIG; dI[i] = ins ? BIG : 0; }
    const chamfer = (d) => { xuoi(d, w, h); nguoc(d, w, h); };
    SD = { w, h, N, k, X0, Y0, cov, dO, dI, chamfer, xuoi: (d) => xuoi(d, w, h), nguoc: (d) => nguoc(d, w, h) };
    if (pha === 0) { chamfer(dO); chamfer(dI); dungSdf2(); }
  }
  function dungSdf2(pha = 0) {
    const { w, h, N, k, X0, Y0, cov, dO, dI } = SD;
    if (pha === 2) return goiSdf();
    const B = new Float32Array(N);
    const sg = Math.max(2, L.cap * 0.1 * k), RK = Math.ceil(sg * 2.5);
    const KR = new Float32Array((2 * RK + 1) * (2 * RK + 1));
    for (let yy = -RK; yy <= RK; yy++) for (let xx = -RK; xx <= RK; xx++) KR[(yy + RK) * (2 * RK + 1) + xx + RK] = Math.exp(-(xx * xx + yy * yy) / (sg * sg));
    for (const c of L.chu) for (const v of c.vong) {
      const P = v.pts, n = P.length;
      for (let j = 0; j < n; j++) {
        const a = P[(j - 1 + n) % n], p = P[j], q = P[(j + 1) % n];
        const ux = p[0] - a[0], uy = p[1] - a[1], vx = q[0] - p[0], vy = q[1] - p[1];
        const la = Math.hypot(ux, uy), lb = Math.hypot(vx, vy);
        if (la < L.cap * 0.04 || lb < L.cap * 0.04) continue;
        const cs = (ux * vx + uy * vy) / (la * lb);
        if (cs > Math.cos(50 * Math.PI / 180)) continue;
        const gx = Math.round((p[0] - X0) * k), gy = Math.round((p[1] - Y0) * k);
        for (let yy = Math.max(0, gy - RK); yy <= Math.min(h - 1, gy + RK); yy++) {
          const kr = (yy - gy + RK) * (2 * RK + 1) + RK - gx, ri = yy * w;
          for (let xx = Math.max(0, gx - RK); xx <= Math.min(w - 1, gx + RK); xx++) { const e = KR[kr + xx]; if (e > B[ri + xx]) B[ri + xx] = e; }
        }
      }
    }
    SD.B = B;
    if (pha === 0) goiSdf();
  }
  function goiSdf() {
    const { w, h, N, k, X0, Y0, cov, dO, dI, B } = SD;
    const out = new Uint8Array(N * 4), c8 = new Uint8ClampedArray(3);
    const s0 = 255 / (128 * k);
    for (let i = 0, j = 0; i < N; i++, j += 4) {
      c8[0] = (dO[i] - dI[i]) * s0 + 128; c8[1] = cov[i] * 255; c8[2] = B[i] * 255;
      out[j] = c8[0]; out[j + 1] = c8[1]; out[j + 2] = c8[2]; out[j + 3] = 255;
    }
    sdf.tex.dispose();
    sdf.tex = new THREE.DataTexture(out, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
    sdf.tex.flipY = false; sdf.tex.magFilter = THREE.LinearFilter; sdf.tex.minFilter = THREE.LinearFilter; sdf.tex.colorSpace = THREE.NoColorSpace; sdf.tex.needsUpdate = true;
    sdf.rect.set(X0, Y0, (w / k), (h / k));
    sdf.px.set(w, h);
  }

  function ve(s) {
    if (!L.ok) return 0;
    if (nghe.dan && L.ve < 0 && L.ve > -9 && s >= 0 && s < 0.25) nghe.dan(L.tCuoi);
    const hA = meshMat.geometry.attributes.aHien;
    if (Math.abs(s - L.ve) < 1e-4) return ss(L.tCuoi, L.tCuoi + 0.9, s);
    const ciA = meshMat.geometry.userData.ci;
    for (let j = 0; j < ciA.length; j++) hA.array[j] = s >= L.chu[ciA[j]].t ? 1 : 0;
    hA.needsUpdate = true;
    for (const mb of [meshBong, meshBongT]) {
      const hB = mb.geometry.attributes.aHien, eB = mb.geometry.attributes.aEp, ciB = mb.geometry.userData.ci;
      for (let j = 0; j < ciB.length; j++) {
        const c = L.chu[ciB[j]];
        hB.array[j] = s >= c.t ? 1 : 0;
        eB.array[j] = 1 + 0.8 * (1 - ss(c.t, c.t + 0.14, s));
      }
      hB.needsUpdate = true; eB.needsUpdate = true;
    }
    L.ve = s;
    return ss(L.tCuoi, L.tCuoi + 0.9, s);
  }

  function capNhat(dt, t, hang, td) {
    U.uT.value = t;
    if (!L.ok || !L.long.length) return;
    const eL = meshLong.geometry.attributes.aEp; let doi = false;
    for (const q of L.long) {
      let gan = 0;
      if (td > 0 && hang) for (const r of hang) {
        if (r.a <= 0.02) continue;
        const d = Math.hypot(r.x - q.x, r.y - q.y);
        gan = Math.max(gan, r.a * (1 - ss(q.r * 0.8, q.r + L.cap * 0.6, d)));
      }
      gan *= td;
      q.fill = gan > q.fill ? q.fill + (gan - q.fill) * Math.min(1, dt / 0.35) : q.fill * Math.exp(-dt / 2.4);
      if (q.fill < 0.004) q.fill = 0;
      if (Math.abs(eL.array[q.v0] - q.fill) > 0.003 || (q.fill === 0 && eL.array[q.v0] !== 0)) { for (let j = 0; j < 4; j++) eL.array[q.v0 + j] = q.fill; doi = true; }
    }
    if (doi) eL.needsUpdate = true;
  }

  const datDpr = (dprMan, Hc) => { UB.uCssK.value = 1 / dprMan; UB.uHdev.value = Hc * dprMan; };
  return { group, meshMat, meshBong, meshBongT, meshLong, gbMat, matNa, sdf, L, dung, xongSdf, sdfBuoc, ve, capNhat, datDpr, U, nghe };
}
