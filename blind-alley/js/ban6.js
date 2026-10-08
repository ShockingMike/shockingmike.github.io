import * as THREE from 'three';
import { makeShared } from './npr.js';
import { makeKhoi } from './khoi.js';

export const BAN6 = { BAN: 0.76 };
const BAN = BAN6.BAN;
const MAU = { muc: '#17131A', dem: '#232A62', sang: '#34399A', do: '#FF1F4F', hong: '#FF3A86', giay: '#F3DCD6', dochim: '#602443' };
const VS = `varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const PAL = `
const vec3 P0 = vec3(23.,19.,26.)/255., P1 = vec3(35.,42.,98.)/255., P2 = vec3(52.,57.,154.)/255., P3 = vec3(255.,31.,79.)/255.,
  P4 = vec3(255.,58.,134.)/255., P5 = vec3(243.,220.,214.)/255., P6 = vec3(96.,36.,67.)/255.;
float h13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
uniform float uCell, uHatPhim;
vec3 hatCuoi(vec3 col, vec3 P) { vec3 cel = floor(P / (uCell * max(length(P - cameraPosition), 0.3)));
  return col + (h13(cel + 41.7) + h13(cel + 73.1) - 1.0) * (uHatPhim / 255.0) * (0.8 + 0.4 * col); }
`;
const FS = `${PAL}
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
uniform vec3 uL1; uniform float uPhang1, uPcf;
uniform sampler2D uSh; uniform mat4 uShVP; uniform float uShTx;
uniform mat4 uRemInv; uniform vec2 uRemSize; uniform float uRemSlats, uRemLa;
uniform vec3 uL3, uSpot3; uniform float uI3, uCos3, uCos3W; uniform vec4 uPool; uniform float uPoolW, uPoolIn, uPoolRing;
uniform vec4 uNguong;
uniform float uThu, uThuF; uniform vec4 uThuA, uThuB;
uniform sampler2D uMap; uniform float uKind, uA, uWmax, uCmax, uMat, uHasMap, uRim, uRamp3, uA3, uVan; uniform vec3 uMau;
float pcf(vec3 P) {
  vec4 q = uShVP * vec4(P, 1.0); vec3 s = q.xyz / q.w * 0.5 + 0.5;
  if (q.w <= 0.0 || s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
  if (uPcf < 0.5) return s.z - 0.0005 <= textureLod(uSh, s.xy, 0.0).r ? 1.0 : 0.0;
  float v = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) v += s.z - 0.0005 <= textureLod(uSh, s.xy + vec2(float(i), float(j)) * uShTx * 1.4, 0.0).r ? 1.0 : 0.0;
  return v / 9.0;
}
float rem(vec3 P) {
  vec3 L = normalize(uL1 - P);
  vec4 o = uRemInv * vec4(P, 1.0); vec3 d = mat3(uRemInv) * L;
  if (abs(d.z) < 1e-4) return 0.0;
  float t = -o.z / d.z; if (t < 0.0) return 0.0;
  vec2 q = o.xy + d.xy * t; vec2 uv = q / uRemSize + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  float f = fract(uv.y * uRemSlats);
  return smoothstep(uRemLa - 0.07, uRemLa + 0.07, f) * smoothstep(1.0, 0.92, f);
}
int bacN(float v, float n, vec4 t) {
  float j = 1.0 + (n - 0.5) * 0.42;
  return int(step(t.x * j, v) + step(t.y * j, v) + step(t.z * j, v) + step(t.w * j, v));
}
vec3 nong(int k) { return k == 1 ? P6 : k == 2 ? P3 : k == 3 ? P4 : P5; }
vec3 lanh(int k) { return k == 0 ? P0 : k == 1 ? P1 : k == 2 ? P2 : P5; }
float hatMan() { vec2 q = floor(gl_FragCoord.xy / 2.0); return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }
float ngoaiA(float h) { if (uThuA.z <= 0.0) return 1.0; vec2 d = max(abs(gl_FragCoord.xy - uThuA.xy) - uThuA.zw, 0.0); return smoothstep(0.0, uThuF, length(d) + (h - 0.5) * uThuF * 0.7); }
float ngoaiB(float h) { if (uThuB.z <= 0.0) return 1.0; float r = length((gl_FragCoord.xy - uThuB.xy) / uThuB.zw); return smoothstep(0.92, 1.08, r + (h - 0.5) * 0.12); }
float toiThu() { if (uThu <= 0.0) return 0.0; float h = hatMan(); return uThu * min(ngoaiA(h), ngoaiB(h)); }
vec3 toiMau(vec3 c) { float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); if (l > 0.6) return P6; if (c.r > c.b + 0.05 && l > 0.25) return P6; if (c.b > c.r + 0.1 && l > 0.21) return P1; return P0; }
vec3 tatMau(vec3 c, float d) { return d > 0.0 && fract(hatMan() * 7.13 + 0.37) < d ? toiMau(c) : c; }
const vec4 NG_LANH = vec4(0.22, 0.58, 2.0, 9.0);
void main() {
  vec4 tx = uHasMap > 0.5 ? texture2D(uMap, vUv) : vec4(1.0);
  if (tx.a < 0.5) discard;
  float n = h13(floor(vW / 0.0035) + uMat * 3.1);
  float dT = toiThu();
  if (uKind > 2.5 && uKind < 3.5) { gl_FragColor = vec4(hatCuoi(tatMau(uMau, dT), vW), 1.0); return; }
  if (uKind > 5.5) { gl_FragColor = vec4(hatCuoi(tatMau(tx.rgb, dT), vW), 1.0); return; }
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 L = normalize(uL1 - vW);
  float E = uPhang1 * pow(max(dot(N, L), 0.0), 0.15);
  if (E > 0.0) E *= pcf(vW + N * 0.01);
  if (E > 0.0) E *= rem(vW);
  float wN = uA * E * (1.0 - dT);
  float E3 = 0.0;
  if (uI3 > 0.0) { vec3 d3 = uL3 - vW; vec3 L3 = normalize(d3);
    E3 = uI3 * pow(max(dot(N, L3), 0.0), 0.08) * smoothstep(uCos3 - uCos3W, uCos3 + uCos3W, dot(-L3, normalize(uSpot3)));
    float rp = length((vW.xz - uPool.xy) / uPool.zw);
    E3 *= mix(uPoolRing, 1.0, 1.0 - smoothstep(uPoolIn - uPoolW, uPoolIn + uPoolW, rp)) * (1.0 - smoothstep(1.0 - uPoolW, 1.0 + uPoolW, rp)); }
  E3 *= 1.0 - 0.92 * dT;
  if (uVan > 0.0 && uHasMap > 0.5 && dot(tx.rgb, vec3(0.3, 0.59, 0.11)) < 0.45) E3 *= uVan;
  float wR = 0.0;
  if (uRim > 0.0) { vec3 V = normalize(cameraPosition - vW); float sg = 1.0 - abs(dot(N, V)); wR = uRim * step(0.62, sg) * step(0.05, dot(N, L)) * pcf(vW + N * 0.01); }
  wR *= 1.0 - dT;
  bool so = wN > 0.11 * (1.0 + (fract(n * 2.3 + 0.1) - 0.5) * 0.42);
  vec3 col;
  if (uRamp3 < 0.5) { int k3 = min(bacN(uA3 * E3 + wR, n, uNguong), int(uWmax)); if (so && k3 == 0) k3 = 1; col = k3 > 0 ? nong(k3) : P0; }
  else { int k3 = min(bacN(uA3 * E3, fract(n * 1.7 + 0.3), NG_LANH), int(uCmax));
    col = so ? (k3 == 0 ? P6 : lanh(min(k3 + 1, max(int(uCmax), 2)))) : lanh(k3);
    if (wR > 0.11 && k3 == 0) col = P6; }
  if (dT > 0.0) col = tatMau(col, dT);
  if (uKind > 0.5 && uKind < 1.5 && uVan <= 0.0 && dot(tx.rgb, vec3(0.3, 0.59, 0.11)) < 0.45) col = P0;
  gl_FragColor = vec4(hatCuoi(col, vW), 1.0);
}`;

function canvas(w, h, fn, nen = '#fff') { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); if (nen) { g.fillStyle = nen; g.fillRect(0, 0, w, h); } fn(g, w, h); return c; }
const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const texOf = (cv) => { const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace; return t; };
const vanGo = (s = 3) => canvas(1024, 512, (g, w, h) => { const r = rng(s); g.strokeStyle = '#000'; for (let i = 0; i < 22; i++) { g.lineWidth = 2 + r() * 2; g.setLineDash([60 + r() * 200, 30 + r() * 120]);
  g.beginPath(); const y0 = (i + r()) * h / 22; for (let x = 0; x <= w; x += 16) { const y = y0 + Math.sin(x * 0.01 + i) * 5; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } });
function nhanHop(d, dau, w = 1024, h = 300) {
  return canvas(w, h, (g) => {
    g.fillStyle = MAU.giay; g.fillRect(0, 0, w, h); g.fillStyle = MAU.muc; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
    g.font = `${Math.round(h * 0.4)}px "Special Elite", "Courier Prime", monospace`; g.textBaseline = 'alphabetic'; g.fillText(`CASE ${d.so}`, w * 0.05, h * 0.5);
    g.font = `${Math.round(h * 0.24)}px "Courier Prime", monospace`; g.fillText(`${d.loai.toUpperCase()} · ${d.nam}`, w * 0.05, h * 0.86);
    if (d.dong) { g.save(); g.translate(w * 0.78, h * 0.5); g.rotate(-0.16); g.strokeStyle = MAU.do; g.lineWidth = h * 0.045; g.strokeRect(-w * 0.17, -h * 0.2, w * 0.34, h * 0.4);
      g.fillStyle = MAU.do; g.font = `${Math.round(h * 0.26)}px "Courier Prime", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(dau, 0, h * 0.02); g.restore(); }
  });
}

const XEP = {
  may: { VI: [[-0.68, -0.36, 0.2], [-0.3, -0.44, 0.07], [0.1, -0.46, -0.04], [0.5, -0.42, -0.15], [0.9, -0.32, -0.28]], T7: [0.32, 0.06], T7q: 0.06, MC: [0.92, 0.1], GT: [-0.3, 0.02], TTP: [-0.62, -0.5, 0.42],
    DEN: [-0.99, 1.15, -0.74], spot3: [1.07, -0.42, 0.58], pool: [0.14, -0.2, 0.98, 0.58] },
  dt: { VI: [[-0.2, -0.62, 0.18], [0.24, -0.6, -0.1], [-0.18, -0.25, -0.16], [0.26, -0.22, 0.12], [0.02, 0.1, -0.05]], T7: [0.05, 0.0], T7q: 0, MC: [0.32, 0.42], GT: [-0.32, 0.2], TTP: [-0.25, -0.45, 0.95],
    DEN: [-0.62, 1.12, -0.05], spot3: [1.0, -0.5, -0.22], pool: [0.0, -0.22, 0.62, 0.6] },
};
export const MAY6 = {
  may: { p: [0.15, 2.55, 0.62], t: [0.15, BAN, -0.35], fov: 38, hfov: 63.0 },
  dt: { p: [0.05, 2.05, 1.05], t: [0.03, BAN, -0.12], fov: 62 },
};

export function makeBan6(o) { const g = makeBan6G(o); let r; do { r = g.next(); } while (!r.done); return r.value; }
export function* makeBan6G(o) {
  const { renderer } = o;
  const sc = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.03, 40);
  let W = 2, H = 2;
  const SHN = o.low ? 1024 : 2048;
  const shRT = new THREE.WebGLRenderTarget(SHN, SHN, { depthTexture: new THREE.DepthTexture(SHN, SHN), depthBuffer: true, format: THREE.RedFormat });
  const shCam = new THREE.PerspectiveCamera(60, 1, 0.05, 20);
  const NEON = [0.95, 2.15, -3.2];
  const U = {
    uL1: { value: new THREE.Vector3(...NEON) }, uPhang1: { value: 0.85 }, uPcf: { value: 1 },
    uSh: { value: shRT.depthTexture }, uShVP: { value: new THREE.Matrix4() }, uShTx: { value: 1 / SHN },
    uRemInv: { value: new THREE.Matrix4() }, uRemSize: { value: new THREE.Vector2(1.05, 1.1) }, uRemSlats: { value: 30 }, uRemLa: { value: 0.66 },
    uL3: { value: new THREE.Vector3() }, uSpot3: { value: new THREE.Vector3(0, -1, 0) }, uI3: { value: 1.0 }, uCos3: { value: 0.8 }, uCos3W: { value: 0.02 },
    uPool: { value: new THREE.Vector4(0, 0, 1, 1) }, uPoolW: { value: 0.045 }, uPoolIn: { value: 0.62 }, uPoolRing: { value: 0.35 },
    uNguong: { value: new THREE.Vector4(0.11, 0.42, 0.9, 1.6) },
    uThu: { value: 0 }, uThuF: { value: 28 }, uThuA: { value: new THREE.Vector4(0, 0, 0, 0) }, uThuB: { value: new THREE.Vector4(0, 0, 0, 0) },
    uCell: { value: 0.0005 }, uHatPhim: { value: 14 },
  };
  let nMat = 0;
  const son = (p = {}) => {
    const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, side: p.side ?? THREE.DoubleSide,
      uniforms: { ...U, uMap: { value: p.map || null }, uHasMap: { value: p.map ? 1 : 0 }, uKind: { value: p.kind ?? 0 }, uA: { value: p.a ?? 0.3 },
        uWmax: { value: p.wmax ?? 1 }, uCmax: { value: p.cmax ?? 2 }, uMat: { value: ++nMat }, uMau: { value: new THREE.Color().setStyle(p.mau || MAU.giay, THREE.LinearSRGBColorSpace) },
        uRim: { value: p.rim ?? 0 }, uRamp3: { value: p.ramp3 ?? 0 }, uA3: { value: p.a3 ?? 0.3 }, uVan: { value: p.van ?? 0 } } });
    return m;
  };
  const ENV = [];
  const mk = (geo, p, pos, rot, cha = sc, id = 30) => { const m = new THREE.Mesh(geo, son(p)); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); if (p.khongBong) m.userData.khongBong = 1; m.userData.idK = id; cha.add(m); ENV.push(m); return m; };
  const hop = (w, h, d, p, pos, rot, cha, id) => mk(new THREE.BoxGeometry(w, h, d), p, pos, rot, cha, id);
  const tam = (w, h, p, pos, rot, cha, id) => mk(new THREE.PlaneGeometry(w, h), p, pos, rot, cha, id);
  const tru = (r0, r1, h, p, pos, rot, seg = 24, cha, id) => mk(new THREE.CylinderGeometry(r0, r1, h, seg), p, pos, rot, cha, id);
  tam(8, 8, { a: 0.3, a3: 0 }, [0, 0, 0], [-Math.PI / 2, 0, 0], sc, 40);
  tam(3.0, 2.8, { a: 0.4, a3: 0, khongBong: 1 }, [-1.3, 1.4, 0], [0, Math.PI / 2, 0], sc, 41);
  tam(8, 2.8, { a: 0.4, a3: 0, khongBong: 1 }, [0, 1.4, -1.45], null, sc, 41);
  const CUA = new THREE.Object3D(); CUA.position.set(0.42, 1.7, -1.38); CUA.rotation.y = -0.379; sc.add(CUA); CUA.updateMatrixWorld(true);
  U.uRemInv.value.copy(CUA.matrixWorld).invert();
  const tv = texOf(vanGo(5)); tv.wrapS = tv.wrapT = THREE.RepeatWrapping; tv.repeat.set(2, 1);
  hop(2.3, 0.05, 1.15, { map: tv, kind: 1, a: 0.3, a3: 0.22, van: 0.0001, wmax: 1 }, [0.15, BAN - 0.025, -0.35], null, sc, 42);
  hop(2.3, 0.7, 0.04, { a: 0.3, a3: 0.05, wmax: 1 }, [0.15, BAN - 0.38, 0.2], null, sc, 42);
  yield;
  const anh = o.anh.map((im) => { const t = new THREE.Texture(im); t.needsUpdate = true; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8; return t; });
  const folder = (tab) => canvas(840, 1100, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#fff'; g.fillRect(0, 60, w, h - 60); g.fillRect(tab, 0, 260, 70); g.fillStyle = '#000';
    g.fillRect(0, 60, w, 4); g.fillRect(tab, 0, 260, 4); g.fillRect(tab, 0, 4, 64); g.fillRect(tab + 256, 0, 4, 64); }, null);
  const TAP = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group(); sc.add(g);
    const bia = tam(0.36, 0.47, { map: texOf(folder(60 + i * 110)), kind: 1, a: 0.3, ramp3: 1, a3: 0.9, wmax: 1, cmax: 2 }, [0, 0, 0], [-Math.PI / 2, 0, 0], g, 21 + i);
    tam(0.27, 0.2025, { kind: 3, mau: MAU.giay }, [0.0, 0.0012, -0.07], [-Math.PI / 2, 0, 0.03], g, 12);
    const anhM = tam(0.25, 0.1875, { map: anh[i], kind: 6 }, [0.0, 0.0016, -0.07], [-Math.PI / 2, 0, 0.03], g, 12);
    tam(0.26, 0.075, { map: texOf(nhanHop(o.hoSo[i], o.dau)), kind: 6 }, [-0.02, 0.0016, 0.135], [-Math.PI / 2, 0, 0], g, 13);
    hop(0.012, 0.004, 0.06, { kind: 3, mau: MAU.sang }, [0.09, 0.003, -0.175], null, g, 14);
    TAP.push({ g, bia, anhM, nhich: 0, dich: 0, goc: new THREE.Vector3(), q: 0 });
    yield;
  }
  const T7G = new THREE.Group(); sc.add(T7G);
  tam(0.36, 0.47, { a: 0.3, ramp3: 1, a3: 0.9, wmax: 1, cmax: 2 }, [-0.185, 0, 0], [-Math.PI / 2, 0, 0], T7G, 26);
  tam(0.36, 0.47, { a: 0.3, ramp3: 1, a3: 0.9, wmax: 1, cmax: 2 }, [0.185, 0, 0], [-Math.PI / 2, 0, 0], T7G, 26);
  const PH = { w: 0.31, h: 0.4 };
  const phieu = canvas(680, 880, (gg, w) => { gg.fillStyle = MAU.giay; gg.fillRect(0, 0, w, 880); gg.fillStyle = MAU.muc; gg.font = '64px "Special Elite", monospace'; gg.fillText('CASE 107', 44, 96);
    gg.font = '24px "Courier Prime", monospace'; gg.fillText('INTAKE · BLIND ALLEY PICTURES', 46, 140); gg.fillRect(44, 160, w - 88, 4);
    for (let i = 0; i < 6; i++) gg.fillRect(46, 270 + i * 104, w - 92, 2); }, null);
  const phieuTron = canvas(680, 880, (gg, w) => { gg.fillStyle = MAU.giay; gg.fillRect(0, 0, w, 880); }, null);
  const texPhieu = texOf(phieu), texTron = texOf(phieuTron);
  const phieuM = tam(PH.w, PH.h, { map: texPhieu, kind: 6 }, [0.185, 0.002, 0], [-Math.PI / 2, 0, 0], T7G, 15);
  if (o.renderer && o.renderer.initTexture) o.renderer.initTexture(texTron);
  const tab = canvas(512, 160, (gg, w, h) => { gg.fillStyle = MAU.giay; gg.fillRect(0, 0, w, h); gg.fillStyle = MAU.muc; gg.font = '84px "Special Elite", monospace'; gg.fillText('CASE 107', 24, 104); }, null);
  tam(0.15, 0.047, { map: texOf(tab), kind: 6 }, [-0.25, 0.002, -0.2], [-Math.PI / 2, 0, 0], T7G, 13);
  const MCG = new THREE.Group(); MCG.rotation.y = -0.35; sc.add(MCG);
  hop(0.34, 0.1, 0.3, { a: 0.3, ramp3: 1, a3: 0.5, wmax: 1, cmax: 1 }, [0, 0.05, 0], null, MCG, 16); hop(0.36, 0.06, 0.12, { a: 0.3, ramp3: 1, a3: 0.5, wmax: 1, cmax: 1 }, [0, 0.1, -0.12], [-0.4, 0, 0], MCG, 16);
  tru(0.025, 0.025, 0.44, { a: 0.5, ramp3: 1, a3: 0.9, wmax: 1, cmax: 2 }, [0, 0.16, -0.16], [0, 0, Math.PI / 2], 16, MCG, 16);
  tam(0.24, 0.18, { a: 0.3, ramp3: 1, a3: 2.0, wmax: 1, cmax: 2 }, [0, 0.24, -0.19], [-0.15, 0, 0], MCG, 17);
  for (let r2 = 0; r2 < 3; r2++) for (let c = 0; c < 9; c++) tru(0.011, 0.011, 0.012, { a: 0.3, ramp3: 1, a3: c % 4 ? 1.6 : 0.9, wmax: 1, cmax: 2 }, [-0.12 + c * 0.03 + r2 * 0.008, 0.1 + r2 * 0.012, 0.06 - r2 * 0.035], null, 10, MCG, 18);
  yield;
  const GTG = new THREE.Group(); sc.add(GTG);
  { const pr = [[0.0, 0.0], [0.066, 0.0], [0.072, 0.004], [0.074, 0.022], [0.07, 0.027], [0.06, 0.027], [0.054, 0.02], [0.046, 0.009], [0.0, 0.009]].map(([x, y]) => new THREE.Vector2(x, y));
    mk(new THREE.LatheGeometry(pr, 48), { a: 0.3, ramp3: 1, a3: 1.3, wmax: 1, cmax: 2 }, [0, 0, 0], null, GTG, 19);
    mk(new THREE.CircleGeometry(0.047, 40), { kind: 3, mau: MAU.muc }, [0, 0.0095, 0], [-Math.PI / 2, 0, 0], GTG, 19);
    const tan = canvas(256, 256, (g) => { g.clearRect(0, 0, 256, 256); const r = rng(44); for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.6 ? MAU.sang : MAU.giay; g.beginPath(); g.ellipse(128 + (r() - 0.5) * 150, 128 + (r() - 0.5) * 120, 3 + r() * 9, 2 + r() * 5, r() * 3, 0, 7); g.fill(); } }, null);
    tam(0.09, 0.09, { map: texOf(tan), kind: 6 }, [-0.005, 0.0098, 0.003], [-Math.PI / 2, 0, 0], GTG, 19);
    hop(0.022, 0.009, 0.009, { kind: 3, mau: MAU.giay }, [-0.02, 0.014, 0.012], [0, 0.9, 0], GTG, 19);
    hop(0.08, 0.01, 0.01, { kind: 3, mau: MAU.giay }, [0.05, 0.03, 0], [0, 0.3, 0.12], GTG, 9);
    mk(new THREE.SphereGeometry(0.007, 8, 6), { kind: 3, mau: MAU.do, khongBong: 1 }, [0.088, 0.036, -0.012], null, GTG, 9);
    const c = canvas(500, 400, (g) => { g.fillStyle = MAU.do; g.fillRect(0, 0, 500, 400); g.fillStyle = MAU.muc; for (let k = 0; k < 4; k++) { g.fillRect(30 + k * 120, 18, 60, 44); g.fillRect(30 + k * 120, 338, 60, 44); } g.fillRect(70, 92, 360, 216); g.fillStyle = MAU.giay; g.font = 'bold 44px "Courier Prime", monospace'; g.fillText('0418', 360, 395); }, null);
    tam(0.07, 0.056, { map: texOf(c), kind: 6 }, [0.13, 0.002, 0.12], [-Math.PI / 2, 0, 0.5], GTG, 11); }
  const NGUOI = [];
  const tt = o.thamTu; sc.add(tt);
  tt.traverse((m) => { if (!m.isMesh) return; m.material = son({ a: 0.3, rim: 0.28, wmax: 1, cmax: 1, ramp3: 1, a3: 0.45 }); m.frustumCulled = false; NGUOI.push(m); });
  tt.rotation.y = Math.PI + 0.25;
  yield;
  const ks = makeShared();
  ks.uCuaInv.value.copy(U.uRemInv.value); ks.uCuaSize.value.copy(U.uRemSize.value); ks.uSlats.value = 30; ks.uLa.value = 0.66;
  ks.uSang.value = 1; ks.uEmberI.value = 0; ks.uHeadI.value = 0;
  const khoi = makeKhoi(ks);
  khoi.u.uNeon.value.set(...NEON);
  khoi.u.uVTat.value = 0.24;
  khoi.u.uDrift.value.set(0.06, 0.05, 0.01, 0);
  khoi.mesh.userData.khongBong = 1; sc.add(khoi.mesh);
  const EMB = new THREE.Vector3();
  let kieuDat = '';
  const DIEM = {};
  function datKieu(kieu) {
    const k = kieu === 'dt' ? 'dt' : 'may'; if (k === kieuDat) return; kieuDat = k;
    const X = XEP[k];
    X.VI.forEach(([x, z, q], i) => { const t = TAP[i]; t.goc.set(x, BAN + 0.002 + i * 0.003, z); t.q = q; t.g.position.copy(t.goc); t.g.rotation.set(0, q, 0); t.nhich = t.dich = 0; });
    T7G.position.set(X.T7[0], BAN + 0.004, X.T7[1]); T7G.rotation.set(0, X.T7q, 0);
    MCG.position.set(X.MC[0], BAN, X.MC[1]);
    GTG.position.set(X.GT[0], BAN, X.GT[1]);
    tt.position.set(...X.TTP);
    U.uL3.value.set(...X.DEN); U.uSpot3.value.set(...X.spot3).normalize(); U.uPool.value.set(...X.pool);
    sc.updateMatrixWorld(true);
    EMB.set(0.088, 0.036, -0.012).add(GTG.position);
    const w = (g, v) => g.localToWorld(new THREE.Vector3(...v));
    DIEM.anh = TAP.map((t) => w(t.g, [0, 0.0016, -0.07]));
    DIEM.nhan = TAP.map((t) => w(t.g, [-0.02, 0.0016, 0.135]));
    DIEM.phim = w(GTG, [0.13, 0.002, 0.12]); DIEM.gatTan = GTG.position.clone(); DIEM.mu = tt.position.clone().add(new THREE.Vector3(0, 1.87, 0));
    DIEM.phieu = w(T7G, [0.185, 0.002, 0]); DIEM.t7 = T7G.position.clone();
    bongBan = 2; tinhKhoi = true;
  }
  let bongBan = 2;
  const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  shCam.position.set(...NEON); shCam.fov = 60; shCam.lookAt(0.1, BAN, -0.2); shCam.updateProjectionMatrix(); shCam.updateMatrixWorld();
  U.uShVP.value.multiplyMatrices(shCam.projectionMatrix, shCam.matrixWorldInverse);
  const anB = [];
  function veBong() {
    anB.length = 0; sc.traverse((x) => { if ((x.isMesh || x.isPoints) && (x.userData.khongBong || (x.material && x.material.transparent))) { anB.push([x, x.visible]); x.visible = false; } });
    const ac = renderer.autoClear; renderer.autoClear = true;
    sc.overrideMaterial = depthOnly; renderer.setRenderTarget(shRT); renderer.clear(); renderer.render(sc, shCam); sc.overrideMaterial = null;
    renderer.autoClear = ac; renderer.setRenderTarget(null);
    for (const [x, v] of anB) x.visible = v;
  }
  let mayDat = null, tinhKhoi = true;
  const _v = new THREE.Vector3();
  function datMay(m, w, h) {
    W = w; H = h; mayDat = m;
    camera.aspect = W / H; camera.fov = m.fov; camera.near = 0.03; camera.far = 40;
    camera.position.set(...m.p); camera.up.set(0, 1, 0); camera.lookAt(...m.t);
    if (m.lech && (m.lech[0] || m.lech[1])) camera.setViewOffset(W, H, -m.lech[0] * W, -m.lech[1] * H, W, H); else camera.clearViewOffset();
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const tg = Math.tan(THREE.MathUtils.degToRad(m.fov / 2));
    U.uCell.value = (2 * tg / H) * 0.95;
    tinhKhoi = true;
  }
  function datKhoiCell(Hc) {
    const d = EMB.distanceTo(camera.position), tg = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const perCss = (2 * d * tg) / Hc, picPx = Math.max(1, Math.min(Hc * (W / H), Hc * 2.1) / 1200);
    khoi.setCell(perCss * picPx, picPx * (H / Hc));
  }
  function man(p, Wc, Hc) { _v.set(p[0] ?? p.x, p[1] ?? p.y, p[2] ?? p.z).project(camera); return { x: (_v.x * 0.5 + 0.5) * Wc, y: (0.5 - _v.y * 0.5) * Hc, z: _v.z }; }
  function gocTap(i, Wc, Hc) { const t = TAP[i]; return [[-0.18, -0.235], [0.18, -0.235], [0.18, 0.235], [-0.18, 0.235]].map(([x, z]) => man(t.g.localToWorld(new THREE.Vector3(x, 0, z)), Wc, Hc)); }
  function gocPhieu(Wc, Hc) { return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => man(T7G.localToWorld(new THREE.Vector3(0.185 + a * PH.w / 2, 0.002, b * PH.h / 2)), Wc, Hc)); }
  function hopPhieu(Wc, Hc) { const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => man(T7G.localToWorld(new THREE.Vector3(0.185 + a * PH.w / 2, 0.002, b * PH.h / 2)), Wc, Hc));
    return [Math.min(...q.map((v) => v.x)), Math.min(...q.map((v) => v.y)), Math.max(...q.map((v) => v.x)), Math.max(...q.map((v) => v.y))]; }
  function mayForm(mFiles, kieu) {
    const P = new THREE.Vector3(...mFiles.p), T = new THREE.Vector3(...mFiles.t), dir = T.clone().sub(P).normalize();
    const c = T7G.localToWorld(new THREE.Vector3(0.185 + (kieu === 'dt' ? 0 : 0.05), 0, kieu === 'dt' ? 0 : 0.02)); c.y = BAN;
    const d = kieu === 'dt' ? 0.62 : 0.66;
    return { p: c.clone().addScaledVector(dir, -d).toArray(), t: c.toArray(), fov: mFiles.fov, lech: mFiles.lech };
  }
  const NHAY = { T: 9.0 };
  function neonAt(t) {
    const chu = Math.floor(t / NHAY.T), pha = t - chu * NHAY.T - (2.6 + 2.2 * ((chu * 0.618) % 1));
    if (pha < 0 || pha > 0.7) return 1;
    const b = (c, r) => Math.exp(-((pha - c) * (pha - c)) / (r * r));
    return 1 - 0.55 * b(0.12, 0.05) - 0.4 * b(0.33, 0.06) - 0.6 * b(0.55, 0.05);
  }
  function capNhat(t, dt = 0.016, cham = 1) {
    U.uPhang1.value = 0.85 * (cham < 1 ? 1 : neonAt(t));
    khoi.update(t * (cham < 1 ? 0.25 : 1));
    let dong = false;
    for (const tp of TAP) {
      const a = 1 - Math.exp(-dt / 0.09); const cu = tp.nhich; tp.nhich += (tp.dich - tp.nhich) * a;
      if (Math.abs(tp.nhich - tp.dich) < 0.002) tp.nhich = tp.dich;
      if (tp.nhich !== cu) { dong = true; tp.g.position.copy(tp.goc).add(new THREE.Vector3(0, 0.012 * tp.nhich, -0.03 * tp.nhich)); tp.g.updateMatrixWorld(true); }
    }
    if (dong) bongBan = Math.max(bongBan, 1);
  }
  function nhich(i, v) { if (TAP[i]) TAP[i].dich = v; }
  function datThu(k, a, b, f = 28) { U.uThu.value = k; U.uThuF.value = f; if (a) U.uThuA.value.set(...a); else U.uThuA.value.set(0, 0, 0, 0); if (b) U.uThuB.value.set(...b); else U.uThuB.value.set(0, 0, 0, 0); khoi.u.uSang.value = 1 - 0.8 * k; }
  function datPhieuTron(b) { phieuM.material.uniforms.uMap.value = b ? texTron : texPhieu; }
  function ve(dich, Wc, Hc) {
    if (tinhKhoi) { khoi.dat(EMB, camera); if (Hc) datKhoiCell(Hc); tinhKhoi = false; }
    if (bongBan > 0) { veBong(); bongBan = 0; }
    renderer.setRenderTarget(dich ?? null);
    renderer.clear(); renderer.render(sc, camera);
  }
  function dangKyKinh(lens) {
    for (const m of ENV) lens.gbufFor(m, m.userData.idK ?? 30);
    let id = 1; for (const m of NGUOI) { if (m.name === 'Mu') lens.chiMat.uniforms.uIdMu.value = id; lens.gbufFor(m, id); id = Math.min(8, id + 1); }
    lens.chiMat.uniforms.uIdDau.value = -5;
    lens.anDi(khoi.mesh);
  }
  async function lamNongAsync(rtMau = null) {
    if (renderer.extensions.has('KHR_parallel_shader_compile')) {
      const giu = renderer.getRenderTarget();
      renderer.setRenderTarget(null); await renderer.compileAsync(sc, camera).catch(() => {});
      if (rtMau) { renderer.setRenderTarget(rtMau); await renderer.compileAsync(sc, camera).catch(() => {}); }
      renderer.setRenderTarget(shRT); sc.overrideMaterial = depthOnly; await renderer.compileAsync(sc, shCam).catch(() => {}); sc.overrideMaterial = null;
      renderer.setRenderTarget(giu);
    } else renderer.compile(sc, camera);
  }
  function datNac(n) { U.uHatPhim.value = n >= 2 ? 10 : 14; U.uPcf.value = n >= 2 ? 0 : 1; khoi.u.uDuoi.value.set(n < 2 ? 2.6 : n < 3 ? 1.5 : 1.0, n < 2 ? 3.0 : n < 3 ? 1.6 : 1.0); bongBan = 2; }
  function huy() { shRT.depthTexture.dispose(); shRT.dispose(); }
  datKieu('may');
  return { scene: sc, camera, U, khoi, ve, veBong, capNhat, datKieu, datMay, datKhoiCell, man, gocTap, hopPhieu, mayForm, nhich, datThu, datPhieuTron, gocPhieu, dangKyKinh, lamNongAsync, datNac, huy, diem: DIEM, TAP, NGUOI,
    mayDat: () => mayDat, kieu: () => kieuDat, ganBong: () => { bongBan = 2; } };
}
