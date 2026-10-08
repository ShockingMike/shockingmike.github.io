import * as THREE from 'three';
import { COMMON } from './npr.js';
import { KHUNG } from './khung.js';
import { makeNgo, PAL } from './ngo.js';

const SC = 0.01;
export const LAT = {
  TU: KHUNG - 19,
  LS: 21, R: 24, TMAX: THREE.MathUtils.degToRad(80),
  BUOC: 19,
  NHIP: [...new Array(12).fill(1 / 12), 0.10, 0.12, 0.15, 0.19, 0.25, 0.33, 0.5],
  DEN_TOI: 0.24,
};
LAT.TONG = LAT.NHIP.reduce((a, b) => a + b, 0);
const F0 = LAT.TU - 2, F1 = KHUNG + 2;

const DUONG = `
uniform float uLS, uR, uTMax;
vec3 duong(float s) {
  float a = abs(s), sg = s < 0.0 ? -1.0 : 1.0;
  if (a <= uLS) return vec3(s, 0.0, 0.0);
  float t = min((a - uLS) / uR, uTMax);
  float y = uLS + uR * sin(t), z = -uR * (1.0 - cos(t));
  float du = a - uLS - uR * t;
  if (du > 0.0) { y += du * cos(uTMax); z -= du * sin(uTMax); }
  return vec3(sg * y, z, t);
}`;
const VERT = `
${DUONG}
attribute vec2 aM;
uniform float uF, uS, uDx;
varying vec2 vM; varying float vSp; varying float vG; varying float vGl; varying float vZ;
void main() {
  float sp = aM.y - (uF - uS) * ${LAT.BUOC.toFixed(1)};
  vec3 d = duong(sp);
  vec3 p = vec3((aM.x + uDx) * ${SC}, d.x * ${SC}, d.y * ${SC});
  vM = aM; vSp = sp; vG = d.z; vGl = aM.y - (uF - ${KHUNG.toFixed(1)}) * ${LAT.BUOC.toFixed(1)};
  vec4 vp = modelViewMatrix * vec4(p, 1.0); vZ = -vp.z;
  gl_Position = projectionMatrix * vp;
}`;
const FRAG = `
${COMMON}
${PAL}
varying vec2 vM; varying float vSp; varying float vG; varying float vGl; varying float vZ;
uniform sampler2D uPic, uSo; uniform float uF, uCellMM, uGb, uLan, uLanXa, uMuBen, uLeLan, uDen;
float sdRR(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash13(vec3(i, 2.0)), hash13(vec3(i + vec2(1, 0), 2.0)), f.x), mix(hash13(vec3(i + vec2(0, 1), 2.0)), hash13(vec3(i + vec2(1, 1), 2.0)), f.x), f.y); }
void main() {
  vec2 m = vM; float au = abs(m.x);
  float pxm = max(fwidth(m.x), 1e-4);
  vec3 cu = vec3(floor(m / uCellMM), uF);
  float r1 = hash13(cu), r2 = hash13(cu + 17.3), r3 = hash13(cu + 41.7), r4 = hash13(cu + 73.1);
  vec2 lq = vec2(au - 14.09, mod(m.y + 9.5, 4.75) - 2.375);
  float dLo = sdRR(lq, vec2(1.4, 0.99), 0.5);
  if (uGb > 0.5 && dLo < 0.0) discard;
  float mep = 17.5 - au;
  if (uGb < 0.5 && dLo > 0.0 && mep < 0.3 && r2 < 0.4) discard;
  float t = 0.5;
  float st = abs(m.x + 11.4 + 0.35 * sin(m.y * 2.1 + uF) * sin(m.y * 0.7 + 1.0));
  t = mix(t, 0.08, step(st, 0.17 + 0.4 * pxm));
  vec2 iq = (m - vec2(1.0, 0.0)) / vec2(22.0, 16.0) + 0.5;
  bool hinh = iq.x > 0.0 && iq.x < 1.0 && iq.y > 0.0 && iq.y < 1.0;
  float ngoaiCua = smoothstep(9.6, 14.0, abs(vSp));
  if (hinh) t = pow(texture2D(uPic, iq).r, mix(1.05, uMuBen, ngoaiCua));
  else if (au < 12.4 && abs(m.y) > 8.0) t = 0.04;
  vec2 sq = vec2((m.x - 16.5) / 1.05 + 0.5, (m.y + 0.6) / 5.6 + 0.5);
  float so = 0.0; if (sq.x > 0.0 && sq.x < 1.0 && sq.y > 0.0 && sq.y < 1.0) so = texture2D(uSo, sq).r;
  t = mix(t, 0.07, so);
  float noi = step(abs(uF - ${KHUNG.toFixed(1)}), 1.5);
  float bang = 0.0, mepBang = 0.0, khe = 0.0;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float c = i == 0 ? 9.5 : -9.5, goc = i == 0 ? 0.024 : -0.017, lech = i == 0 ? 0.32 : -0.26;
    float u = vGl - c - lech - goc * m.x;
    float ue = 2.5 + 0.11 * abs(fract(m.x * 1.3 + fi * 0.41) - 0.5) * 2.0 + 0.06 * n2(vec2(m.x * 4.0, fi * 7.0));
    float trong = step(abs(u), ue) * step(au, 17.0 - 0.3 * fi);
    bang = max(bang, trong);
    mepBang = max(mepBang, trong * step(ue - abs(u), 0.06 + 0.9 * pxm));
    float bac = (i == 0 ? 0.11 : -0.09) * step(i == 0 ? 3.1 : -5.4, m.x);
    khe = max(khe, step(abs(vGl - c - bac), 0.03 + 0.5 * pxm) * step(0.15, n2(vec2(m.x * 2.0, fi * 3.0 + 1.0))));
  }
  bang *= noi; mepBang *= noi; khe *= noi;
  t = mix(t, mix(t, 0.6, 0.12 + 0.07 * n2(vec2(m.x * 0.6, vGl * 5.0))), bang);
  t = mix(t, t * 0.3, mepBang);
  t = mix(t, 0.03, khe);
  float vet = (1.0 - smoothstep(0.55, 1.0, length((m - vec2(-14.9, 3.2)) * vec2(1.25, 0.36)))) * step(0.38, n2(vec2(m.x * 9.0, m.y * 1.4))) * step(abs(uF - ${KHUNG.toFixed(1)}), 0.5);
  t = mix(t, t * 0.4, vet);
  if (uGb > 0.5) {
    float b = hinh ? texture2D(uPic, iq, 2.5).r : (so > 0.5 ? 2.0 : (vet > 0.5 ? 3.0 : 0.0));
    gl_FragColor = vec4(m / 20.0, b, 30.0 + uF - ${KHUNG.toFixed(1)});
    return;
  }
  float sa = abs(vSp);
  float cua = 1.0 - smoothstep(9.6, 10.8, sa);
  float lan = uLan * exp(-max(sa - 10.0, 0.0) / uLanXa);
  float lanLe = uLeLan * exp(-max(sa - 10.0, 0.0) / (uLanXa * 0.8));
  float uon = 1.0 - 0.9 * smoothstep(0.12, 0.85, vG);
  float L = max(cua, hinh ? lan : lanLe) * uon * uDen;
  float x = t * L * 4.0;
  float b = min(4.0, floor(x) + rutTham(fract(x), r1, 0.55));
  vec3 col = b < 0.5 ? K_MUC : b < 1.5 ? K_DOCHIM : b < 2.5 ? K_DO : b < 3.5 ? K_HONG : K_GIAY;
  if (dLo < 0.6 * pxm) {
    float Lh = max(cua, lanLe * 1.15) * uon * uDen;
    float pG = clamp((Lh - 0.13) * 5.0, 0.0, 1.0) * smoothstep(0.3, 0.75, uDen);
    vec3 sau = r3 < pG ? K_GIAY : (Lh > 0.15 ? K_DOCHIM : K_MUC);
    float bongLo = step(-0.14 - 0.5 * pxm, dLo) * step(0.25, lq.y);
    sau = mix(sau, Lh > 0.85 ? K_HONG : K_DOCHIM, bongLo * step(r4, 0.85));
    sau = mix(sau, K_HONG, bang * step(r4, 0.32) * step(0.5, Lh));
    sau = mix(sau, K_MUC, mepBang * step(r2, 0.85));
    float vao = clamp(0.5 - dLo / pxm, 0.0, 1.0);
    col = mix(col, sau, step(r2, vao));
  }
  col = mix(col, K_HONG, step(mep, 1.1 * pxm) * step(r2, 0.3) * step(0.22, L) * step(cua, 0.5));
  col = mix(col, K_HONG, mepBang * step(r2, 0.1) * step(0.3, L));
  float xien = 1.0 - smoothstep(0.0, 0.9, abs(vSp - 15.5 - 0.22 * m.x));
  col = mix(col, K_HONG, xien * step(12.2, au) * step(0.0, dLo) * step(r4, 0.35) * step(0.4, L));
  float pxG = max(fwidth(vG), 1e-5);
  float bong = 1.0 - smoothstep(0.6, 1.4, abs(vG - 0.3) / pxG);
  col = mix(col, K_HONG, bong * step(r4, 0.55) * step(mep, 16.5) * step(0.0, vSp));
  if (!gl_FrontFacing) col = mix(K_MUC, col, step(0.5, r4));
  col += (r3 + r4 - 1.0) * (12.0 / 255.0) * (0.8 + 0.4 * col);
  gl_FragColor = vec4(col, 1.0);
}`;

const VERT_P = `varying vec2 vP; varying float vZ; uniform vec2 uKt;
void main() { vP = (uv - 0.5) * uKt; vec4 vp = modelViewMatrix * vec4(position, 1.0); vZ = -vp.z; gl_Position = projectionMatrix * vp; }`;
const FRAG_TAM = `
${COMMON}
${PAL}
varying vec2 vP; varying float vZ; uniform float uCellMM, uGb, uDen;
void main() {
  if (uGb > 0.5) { gl_FragColor = vec4(vP / 20.0, 0.0, 1.0); return; }
  vec2 p = vP; float au = abs(p.x);
  vec3 cu = vec3(floor(p / uCellMM), 5.0);
  float r1 = hash13(cu), r3 = hash13(cu + 41.7), r4 = hash13(cu + 73.1);
  float o = (1.0 - smoothstep(9.8, 10.9, abs(p.y))) * (1.0 - smoothstep(17.55, 18.15, au));
  float x = 0.2 + o * 3.35 * uDen * (1.0 - 0.5 * smoothstep(17.5, 18.1, au));
  float b = min(4.0, floor(x) + rutTham(fract(x), r1, 0.55));
  vec3 col = b < 0.5 ? K_MUC : b < 1.5 ? K_DOCHIM : b < 2.5 ? K_DO : b < 3.5 ? K_HONG : K_GIAY;
  if (o < 0.02) { float sp = 0.45 * (1.0 - smoothstep(0.0, 4.0, max(au - 17.8, abs(p.y) - 10.5))); col = mix(K_MUC, K_DEM, step(r1, sp)); }
  float pxm = max(fwidth(p.x), 1e-4);
  col += (r3 + r4 - 1.0) * (10.0 / 255.0) * (0.8 + 0.4 * col);
  gl_FragColor = vec4(col, 1.0);
}`;
const FRAG_NEN = `
${COMMON}
${PAL}
varying vec2 vP; varying float vZ; uniform float uCellMM, uGb, uRho; uniform vec2 uOff;
void main() {
  if (uGb > 0.5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); return; }
  vec2 sP = uRho * vP + uOff; float au = abs(sP.x); vec2 p = vP;
  vec3 cu = vec3(floor(p / uCellMM), 9.0);
  float r1 = hash13(cu), r3 = hash13(cu + 41.7), r4 = hash13(cu + 73.1);
  float tat = 1.0 - smoothstep(30.0, 46.0, abs(sP.y));
  float gl = step(17.5, au) * exp(-max(au - 17.5, 0.0) / 3.0) * (0.45 + 0.55 * exp(-abs(sP.y) / 40.0)) * tat;
  float hat = step(17.5, sP.x) * exp(-max(sP.x - 17.5, 0.0) / 46.0) * exp(-sP.y * sP.y / (2.0 * 24.0 * 24.0));
  float x = max(gl * 1.6, hat * 0.42);
  float b = floor(x) + rutTham(fract(x), r1, 0.5);
  vec3 col = b < 0.5 ? K_MUC : b < 1.5 ? K_DEM : K_SANG;
  col += (r3 + r4 - 1.0) * (10.0 / 255.0) * (0.8 + 0.4 * col);
  gl_FragColor = vec4(col, 1.0);
}`;
const FRAG_TRUC = `
${COMMON}
${PAL}
varying vec3 vN; varying vec3 vW; uniform float uGb;
void main() {
  if (uGb > 0.5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 2.0); return; }
  vec3 n = normalize(vN);
  float r = hash13(vec3(floor(gl_FragCoord.xy / 1.5), 3.0));
  vec3 col = mix(K_MUC, K_DEM, step(0.75, n.z) * step(r, 0.12));
  gl_FragColor = vec4(col, 1.0);
}`;

export function makeLat(o) {
  const { renderer } = o;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 6);
  const nhom = new THREE.Group(); scene.add(nhom);
  const U = { uLS: { value: LAT.LS }, uR: { value: LAT.R }, uTMax: { value: LAT.TMAX }, uS: { value: LAT.TU }, uCellMM: { value: 0.06 }, uLan: { value: 0.6 }, uLanXa: { value: 20 }, uMuBen: { value: 2.0 }, uLeLan: { value: 0.32 }, uDen: { value: 1 } };
  let AW = o.anhRong || 768, AH = Math.round(AW * 16 / 22);
  const anh = new Map();
  const thuTu = []; for (let k = 0; k <= F1 - F0; k++) for (const f of [KHUNG - k, KHUNG + k]) if (f >= F0 && f <= F1 && !thuTu.includes(f)) thuTu.push(f);
  let ngo = null;
  const taoRT = () => { const rt = new THREE.WebGLRenderTarget(AW, AH, { format: THREE.RedFormat, depthBuffer: false });
    rt.texture.generateMipmaps = true; rt.texture.minFilter = THREE.LinearMipmapLinearFilter; rt.texture.magFilter = THREE.LinearFilter; return rt; };
  let rtMau = null;
  const chep = (() => {
    const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: null } }, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D uT; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(uT, vUv).r, 0.0, 0.0, 1.0); }' });
    const sc = new THREE.Scene(), q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; sc.add(q);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return (tu, toi) => { m.uniforms.uT.value = tu.texture; renderer.setRenderTarget(toi); renderer.render(sc, cam); renderer.setRenderTarget(null); m.uniforms.uT.value = null; };
  })();
  function veAnh(f) {
    if (!rtMau || rtMau.width !== AW || rtMau.height !== AH) { if (rtMau) rtMau.dispose(); rtMau = new THREE.WebGLRenderTarget(AW, AH, { format: THREE.RedFormat, depthBuffer: true, samples: o.mau ?? 4 }); }
    ngo.buocChinh(f, rtMau);
    const rt = taoRT(); chep(rtMau, rt); anh.set(f, rt);
    if (sanSang()) { rtMau.dispose(); rtMau = null; ngo.huy(); ngo = null; }
  }
  const anhCua = (f) => anh.get(Math.min(F1, Math.max(F0, f)));
  const bien = new Map(); let KH_MUA = [], N_BIEN = 1;
  function viecBienMua(ds, n) {
    KH_MUA = ds; N_BIEN = n; const out = [];
    for (const f of ds) for (let v = 1; v < n; v++) {
      const key = f + ':' + v;
      out.push(() => { if (bien.has(key)) return; if (!ngo) ngo = makeNgo(renderer, { nguoi: o.nguoi, w: AW, h: AH }); ngo.buocBong(f, v); });
      out.push(() => { if (!bien.has(key) && ngo) ngo.buocPhan(f, v); });
      out.push(() => {
        if (bien.has(key) || !ngo) return;
        if (!rtMau || rtMau.width !== AW || rtMau.height !== AH) { if (rtMau) rtMau.dispose(); rtMau = new THREE.WebGLRenderTarget(AW, AH, { format: THREE.RedFormat, depthBuffer: true, samples: o.mau ?? 4 }); }
        ngo.buocChinh(f, rtMau); const rt = taoRT(); chep(rtMau, rt); bien.set(key, rt);
        if (bien.size === ds.length * (n - 1)) { rtMau.dispose(); rtMau = null; ngo.huy(); ngo = null; }
      });
    }
    return out;
  }
  function muaSong(t, chay) {
    if (N_BIEN < 2 || CH.chay || CH.cho) return;
    const v = chay ? Math.floor(t * 12) % N_BIEN : 0;
    for (const m of kh) {
      const f = m.userData.f; if (!m.visible || !KH_MUA.includes(f)) continue;
      const tx = v === 0 ? (anhCua(f) || {}).texture : (bien.get(f + ':' + v) || {}).texture;
      if (tx) m.material.uniforms.uPic.value = tx;
    }
  }
  function soMep(f) {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 320;
    const g = cv.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 64, 320);
    g.save(); g.translate(32, 160); g.rotate(-Math.PI / 2);
    g.fillStyle = '#fff'; g.font = '700 44px "Courier Prime", "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(f).padStart(4, '0'), 6, 2);
    g.beginPath(); g.arc(-124, 2, 7, 0, Math.PI * 2); g.fill();
    g.restore();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
  }
  const NS = 36, NA = 10;
  const luoi = (() => {
    const g = new THREE.BufferGeometry(); const pos = [], aM = [], idx = [];
    for (let j = 0; j <= NS; j++) { const ly = 9.5 - (19 * j) / NS; for (let i = 0; i <= NA; i++) { const xx = -17.5 + (35 * i) / NA; pos.push(xx * SC, ly * SC, 0); aM.push(xx, ly); } }
    for (let j = 0; j < NS; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aM', new THREE.Float32BufferAttribute(aM, 2)); g.setIndex(idx);
    return g;
  })();
  const kh = [];
  const datTrang = new THREE.DataTexture(new Uint8Array([40, 40, 40, 255]), 1, 1); datTrang.needsUpdate = true;
  const datDen = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); datDen.needsUpdate = true;
  for (let f = F0 - 1; f <= F1 + 1; f++) {
    const u = { ...U, uF: { value: f }, uPic: { value: datTrang }, uSo: { value: datDen }, uGb: { value: 0 }, uDx: { value: f === KHUNG ? 0.22 : 0 } };
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, side: THREE.DoubleSide });
    const gb = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { ...u, uGb: { value: 1 } }, side: THREE.DoubleSide });
    const me = new THREE.Mesh(luoi, mat); me.frustumCulled = false; me.userData = { f, gb };
    nhom.add(me); kh.push(me);
  }
  const mkTam = (w, h, frag, z, extra = {}) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * SC, h * SC), new THREE.ShaderMaterial({ vertexShader: VERT_P, fragmentShader: frag,
      uniforms: { uKt: { value: new THREE.Vector2(w, h) }, uCellMM: U.uCellMM, uGb: { value: 0 }, ...extra } }));
    m.position.z = z * SC; m.frustumCulled = false; nhom.add(m);
    const gb = m.material.clone(); gb.uniforms = { ...m.material.uniforms, uGb: { value: 1 } }; m.userData.gb = gb;
    return m;
  };
  const tam = mkTam(44, 24, FRAG_TAM, -1.5, { uDen: U.uDen });
  const nen = mkTam(300, 400, FRAG_NEN, -62, { uRho: { value: 1 }, uOff: { value: new THREE.Vector2() } });
  const truc = [];
  for (const sg of [1, -1]) {
    const g = new THREE.CylinderGeometry((LAT.R - 0.4) * SC, (LAT.R - 0.4) * SC, 42 * SC, 40, 1, false); g.rotateZ(Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uGb: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vW; void main() { vN = normalize(normalMatrix * normal); vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: FRAG_TRUC }));
    m.position.set(0, sg * LAT.LS * SC, -LAT.R * SC); nhom.add(m); truc.push(m);
    m.userData.gb = m.material.clone(); m.userData.gb.uniforms = { uGb: { value: 1 } };
  }
  const CH = { t: 0, chay: false, cho: false, toc: 1, tocDich: 1, s: LAT.TU };
  function sAt(t) {
    let t0 = 0;
    for (let i = 0; i < LAT.NHIP.length; i++) {
      const P = LAT.NHIP[i], cuoi = i === LAT.NHIP.length - 1, d = cuoi ? 0.44 : Math.min(0.42 * P, 0.12);
      if (t < t0 + P) {
        const u = (t - (t0 + P - d)) / d;
        if (u <= 0) return LAT.TU + i;
        const e = cuoi ? 1 - Math.pow(1 - Math.min(1, u), 3) : (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
        return LAT.TU + i + Math.min(1, e);
      }
      t0 += P;
    }
    return KHUNG;
  }
  function tua() { if (CH.chay) CH.tocDich = 7; }
  function denTheoS(s) { const u = Math.min(1, Math.max(0, (s - (KHUNG - 1)) / 0.92)); return LAT.DEN_TOI + (1 - LAT.DEN_TOI) * u * u * (3 - 2 * u); }
  function batDau(tu = 0) { CH.t = tu; CH.chay = true; CH.cho = false; CH.toc = 1; CH.tocDich = 1; CH.s = sAt(tu); }
  function dungNgay() { CH.t = LAT.TONG; CH.chay = false; CH.cho = false; CH.s = KHUNG; }
  function cho() { CH.t = 0; CH.chay = false; CH.cho = true; CH.s = LAT.TU; }
  function datS(sv) { CH.chay = false; CH.cho = true; CH.s = sv; }
  function capNhat(dt) {
    if (CH.chay) {
      CH.toc += (CH.tocDich - CH.toc) * Math.min(1, dt * 10);
      CH.t += dt * CH.toc;
      if (CH.t >= LAT.TONG) { CH.t = LAT.TONG; CH.chay = false; }
      CH.s = sAt(CH.t);
    } else if (!CH.cho) CH.s = KHUNG;
    U.uS.value = CH.s;
    U.uDen.value = CH.chay || CH.cho ? denTheoS(CH.s) : 1;
    const s = U.uS.value;
    for (const m of kh) { const f = m.userData.f; m.visible = Math.abs(f - s) <= 3.6; if (m.visible) m.material.uniforms.uPic.value = (anhCua(f) || {}).texture || datTrang; }
    return s;
  }
  const BC = { gx: 0, gy: 0, pxmm: 20, nghieng: 9, Wc: 1, Hc: 1, D: 1 };
  function datBoCuc(gx, gy, pxmm, nghieng, Wc, Hc) {
    Object.assign(BC, { gx, gy, pxmm, nghieng, Wc, Hc });
    camera.aspect = Wc / Hc; camera.fov = 28;
    const visH = (Hc / pxmm) * SC;
    BC.D = visH / 2 / Math.tan(THREE.MathUtils.degToRad(14));
    camera.position.set(0, 0, BC.D); camera.lookAt(0, 0, 0); camera.near = BC.D * 0.05; camera.far = BC.D + 1.5;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    nhom.position.set(((gx - Wc / 2) / pxmm) * SC, ((Hc / 2 - gy) / pxmm) * SC, 0);
    nhom.rotation.set(0, 0, THREE.MathUtils.degToRad(nghieng));
    nhom.updateMatrixWorld(true);
    U.uCellMM.value = 1.25 / pxmm;
    const rho = BC.D / (BC.D + 62 * SC), a = THREE.MathUtils.degToRad(nghieng);
    const tx = nhom.position.x / SC, ty = nhom.position.y / SC;
    nen.material.uniforms.uRho.value = rho;
    nen.material.uniforms.uOff.value.set((rho - 1) * (Math.cos(a) * tx + Math.sin(a) * ty), (rho - 1) * (-Math.sin(a) * tx + Math.cos(a) * ty));
  }
  const _v = new THREE.Vector3();
  function duongJS(s) {
    const a = Math.abs(s), sg = s < 0 ? -1 : 1;
    if (a <= LAT.LS) return [s, 0];
    const t = Math.min((a - LAT.LS) / LAT.R, LAT.TMAX);
    let y = LAT.LS + LAT.R * Math.sin(t), z = -LAT.R * (1 - Math.cos(t));
    const du = a - LAT.LS - LAT.R * t; if (du > 0) { y += du * Math.cos(LAT.TMAX); z -= du * Math.sin(LAT.TMAX); }
    return [sg * y, z];
  }
  function manMm(x, s) { const [y, z] = duongJS(s); _v.set(x * SC, y * SC, z * SC).applyMatrix4(nhom.matrixWorld).project(camera); return { x: (_v.x * 0.5 + 0.5) * BC.Wc, y: (0.5 - _v.y * 0.5) * BC.Hc }; }
  const manKhung = (f, x, y, s = KHUNG) => manMm(x + (f === KHUNG ? 0.22 : 0), y - (f - s) * LAT.BUOC);
  const hopHinh = (f, s = KHUNG) => [[-10, 8], [12, 8], [12, -8], [-10, -8]].map(([x, y]) => manKhung(f, x, y, s));
  const hopCua = () => [[-17.5, 9.5], [17.5, 9.5], [17.5, -9.5], [-17.5, -9.5]].map(([x, y]) => manMm(x, y));
  async function taoNgo() { if (!ngo) ngo = makeNgo(renderer, { nguoi: o.nguoi, w: AW, h: AH }); await ngo.lamNongAsync(); }
  function viecVe() {
    const out = [];
    for (const f of thuTu.filter((f2) => !anh.has(f2))) {
      out.push(() => { if (anh.has(f)) return; if (!ngo) ngo = makeNgo(renderer, { nguoi: o.nguoi, w: AW, h: AH }); ngo.buocBong(f); });
      out.push(() => { if (!anh.has(f) && ngo) ngo.buocPhan(f); });
      out.push(() => { if (!anh.has(f) && ngo) veAnh(f); });
    }
    return out;
  }
  function viecSo() {
    const ds = kh.slice().sort((a2, b2) => Math.abs(a2.userData.f - KHUNG) - Math.abs(b2.userData.f - KHUNG)), out = [];
    for (let i = 0; i < ds.length; i += 6) out.push(() => { for (const m of ds.slice(i, i + 6)) if (m.material.uniforms.uSo.value === datDen) m.material.uniforms.uSo.value = soMep(m.userData.f); });
    return out;
  }
  const sanSang = () => thuTu.every((f) => anh.has(f));
  function datCoAnh(w, mau) {
    if (w === AW && (mau ?? 4) === (o.mau ?? 4)) return false;
    AW = w; AH = Math.round(AW * 16 / 22); o.mau = mau;
    for (const rt of anh.values()) rt.dispose(); anh.clear();
    if (ngo) ngo.datCo(AW, AH);
    return true;
  }
  function ve(dich) { renderer.setRenderTarget(dich); renderer.clear(); renderer.render(scene, camera); }
  function dangKyKinh(lens) {
    for (const m of kh) lens.gbufMat(m, m.userData.gb);
    lens.gbufMat(tam, tam.userData.gb); lens.gbufMat(nen, nen.userData.gb);
    for (const m of truc) lens.gbufMat(m, m.userData.gb);
  }
  const pitchPx = () => LAT.BUOC * BC.pxmm;
  function trucDai() { const a = manMm(0, 0), b = manMm(0, 10); const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l }; }
  return {
    scene, camera, nhom, U, CH, LAT, BC, kh, tam, nen, truc,
    datBoCuc, capNhat, batDau, dungNgay, cho, datS, tua, ve, viecVe, viecSo, taoNgo, sanSang, datCoAnh, dangKyKinh,
    manMm, manKhung, hopHinh, hopCua, trucDai, sAt, viecBienMua, muaSong, soBien: () => bien.size,
    anhKhung: (f) => (anhCua(f) || {}).texture || null, cam: () => ngo && ngo.anh, ngoAnh: (p) => (ngo ? ngo.anh(p) : [0.5, 0.5]),
    ngoObj: () => ngo, dangChay: () => CH.chay || CH.cho, daDung: () => !CH.chay && !CH.cho, pitchPx,
  };
}
