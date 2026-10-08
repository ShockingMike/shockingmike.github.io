import * as THREE from 'three';
import { C, makeShared, makeMaterial } from './npr.js';

export const HAM5 = {
  ROOM: { x0: -2.4, x1: 2.4, z0: -2.4, z1: 2.9, cao: 2.6 },
  TOP: 0.915,
  LB: { cx: 0.02, cz: 0.6, hx: 0.31, hz: 0.2 },
  BULB: [0.32, 1.98, -0.42],
  GRATE: { x0: 0.6, x1: 1.15, z0: 2.25, z1: 2.7 },
  TO: { w: 0.3, h: 0.225, x: 0.03, z: 0.6 },
  NGOI: [-0.042, 0.585],
  CUA_Z: -1.25,
  LAC: { T: 5.0 },
};
const { ROOM, TOP, LB, GRATE, TO } = HAM5;
const DAY_PHOI = [
  { z: -1.05, y: 1.86, x0: -2.35, so: [414, 415, 416, 417, 0, 419, 420, 421, 422] },
  { z: -1.62, y: 1.96, x0: -2.35, so: [405, 406, 407, 408, 409, 410, 411, 412] },
];
const DAI_DAY = ROOM.cao - HAM5.BULB[1];

export function lacDen(t) {
  const w = (2 * Math.PI) / HAM5.LAC.T;
  const A = 0.145 + 0.016 * Math.sin((2 * Math.PI * t) / 37 + 0.6) + 0.009 * Math.sin((2 * Math.PI * t) / 23 + 2.1);
  return [A * Math.sin(w * t), 0.32 * A * Math.sin(w * t + 1.15)];
}

const VS = `varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }`;
const PAL = `
const vec3 P0 = vec3(23.,19.,26.)/255., P1 = vec3(35.,42.,98.)/255., P2 = vec3(52.,57.,154.)/255., P3 = vec3(255.,31.,79.)/255.,
  P4 = vec3(255.,58.,134.)/255., P5 = vec3(243.,220.,214.)/255., P6 = vec3(96.,36.,67.)/255.;
float h12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float h13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
uniform float uCell, uHatPhim;
vec3 hatCuoi(vec3 col, vec3 P) { vec3 cel = floor(P / (uCell * max(length(P - cameraPosition), 0.3)));
  return col + (h13(cel + 41.7) + h13(cel + 73.1) - 1.0) * (uHatPhim / 255.0) * (0.8 + 0.4 * col); }
`;
const SHN = 2048;
const FS = `${PAL}
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
uniform vec3 uBulb, uFillD; uniform float uBulbI, uGrateY, uTop, uPcf; uniform vec4 uGrate, uLB;
uniform sampler2D uShS, uShT; uniform mat4 uShSVP, uShTVP; uniform float uShTx;
uniform sampler2D uMap; uniform float uKind, uA, uAc, uWmax, uCmax, uMat, uHasMap; uniform vec3 uMau;
float pcf(sampler2D tx, mat4 vp, vec3 P, out float trong) {
  vec4 q = vp * vec4(P, 1.0); vec3 s = q.xyz / q.w * 0.5 + 0.5; trong = 0.0;
  if (q.w <= 0.0 || s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0 || s.z > 1.0) return 1.0;
  trong = 1.0;
  if (uPcf < 0.5) return s.z - 0.0004 <= textureLod(tx, s.xy, 0.0).r ? 1.0 : 0.0;
  float v = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) v += s.z - 0.0004 <= textureLod(tx, s.xy + vec2(float(i), float(j)) * uShTx * 1.5, 0.0).r ? 1.0 : 0.0;
  return v / 9.0;
}
float bongDen(vec3 P, vec3 N) {
  vec3 Pn = P + N * 0.012; float a, b; float s1 = pcf(uShS, uShSVP, Pn, a), s2 = pcf(uShT, uShTVP, Pn, b);
  return (a > 0.5 && b > 0.5) ? min(s1, s2) : a > 0.5 ? s1 : b > 0.5 ? s2 : 1.0;
}
float song(vec3 P) {
  if (uFillD.y <= 0.0) return 0.0;
  vec3 Q = P + uFillD * ((uGrateY - P.y) / uFillD.y);
  if (Q.x < uGrate.x || Q.x > uGrate.y || Q.z < uGrate.z || Q.z > uGrate.w) return 0.0;
  float u = (Q.x - uGrate.x) / (uGrate.y - uGrate.x) * 6.0;
  return smoothstep(0.0, 0.06, abs(fract(u) - 0.5) - 0.11);
}
int bacN(float v, float n, float t1, float t2, float t3, float t4) {
  float j = 1.0 + (n - 0.5) * 0.42;
  return int(step(t1 * j, v) + step(t2 * j, v) + step(t3 * j, v) + step(t4 * j, v));
}
vec3 nong(int k) { return k == 1 ? P6 : k == 2 ? P3 : k == 3 ? P4 : P5; }
vec3 lanh(int k) { return k == 0 ? P0 : k == 1 ? P1 : k == 2 ? P2 : P5; }
void main() {
  vec4 tx = uHasMap > 0.5 ? texture2D(uMap, vUv) : vec4(1.0);
  if (tx.a < 0.5) discard;
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  float n = h13(floor(vW / 0.0035) + uMat * 3.1);
  vec3 col;
  if (uKind > 1.5 && uKind < 2.5) {
    float L = dot(tx.rgb, vec3(0.3, 0.59, 0.11));
    bool doo = tx.r > 0.6 && tx.g < 0.4;
    col = doo ? P3 : L > 0.62 ? P5 : L > 0.3 ? P2 : P1;
    gl_FragColor = vec4(hatCuoi(col, vW), 1.0); return;
  }
  if (uKind > 2.5 && uKind < 3.5) { gl_FragColor = vec4(hatCuoi(uMau, vW), 1.0); return; }
  vec3 dB = uBulb - vW; float d = length(dB); vec3 L = dB / d;
  float E = uBulbI * max(dot(N, L), 0.0) / (d * d);
  if (E > 0.0) E *= bongDen(vW, N);
  float w = uA * E;
  float c = uAc * (0.9 * max(dot(N, uFillD), 0.0) * song(vW));
  vec2 dl = vec2(vW.x - uLB.x, vW.z - uLB.y);
  float trongLB = 1.0 - smoothstep(0.0, 0.22, length(max(abs(dl) - uLB.zw, 0.0)));
  c = max(c, uAc * 0.7 * trongLB * smoothstep(0.25, 0.0, vW.y - uTop) * step(uTop - 0.004, vW.y) * max(dot(N, vec3(0.0, 1.0, 0.0)), 0.25));
  int kw = min(bacN(w, n, 0.12, 0.32, 0.62, 1.2), int(uWmax));
  int kc = min(bacN(c, fract(n * 1.7 + 0.3), 0.22, 0.58, 2.0, 9.0), int(uCmax));
  col = kw > 0 ? nong(kw) : lanh(kc);
  if (uKind > 0.5 && uKind < 1.5) {
    float Lt = dot(tx.rgb, vec3(0.3, 0.59, 0.11));
    bool doo = tx.r > 0.6 && tx.g < 0.4;
    if (doo) col = kw >= 2 ? P3 : P6;
    else if (Lt < 0.45) col = kw >= 3 ? P6 : P0;
  }
  if (uKind > 3.5) {
    float Lt = dot(tx.rgb, vec3(0.3, 0.59, 0.11));
    col = Lt > 0.5 ? (kw >= 2 ? P4 : kw >= 1 ? P3 : P6) : (h13(floor(vW / 0.004)) < 0.06 ? P2 : P1);
  }
  gl_FragColor = vec4(hatCuoi(col, vW), 1.0);
}`;
const GB_V = `varying vec2 vUv; varying float vZ;
void main() { vUv = uv; vec4 vp = modelViewMatrix * vec4(position, 1.0); vZ = -vp.z; gl_Position = projectionMatrix * vp; }`;
const GB_F_UV = `varying vec2 vUv; varying float vZ; uniform float uId;
void main() { gl_FragColor = vec4(vUv, vZ, uId); }`;


function veKhung(n) {
  const W = 384, H = 300, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  let s = n * 7919 + 13; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#000'; g.strokeStyle = '#000';
  const cx0 = 188, dx0 = 150, dx1 = 228, dy0 = 64, dy1 = 176;
  g.lineWidth = 7; g.strokeRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
  g.lineWidth = 7;
  for (const [a, b] of [[[14, 14], [dx0, dy0]], [[14, 286], [dx0, dy1]], [[370, 14], [dx1, dy0]], [[370, 286], [dx1, dy1]]]) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  g.lineWidth = 10; g.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const cx2 = i % 5, cy2 = Math.floor(i / 5), x = 34 + cx2 * 72 + (cy2 % 2) * 34 + (rnd() - 0.5) * 22, y = 26 + cy2 * 92 + (rnd() - 0.5) * 26, L = 50 + rnd() * 30;
    if (Math.abs(x - cx0) < 46 && y > 60) continue;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - 0.22 * L, y + L); g.stroke();
  }
  g.lineCap = 'butt';
  const u = Math.min(1, Math.max(0, (n - 405) / 17)), h = 196 - 92 * u, yb = 286 - 104 * u, cx = cx0 + 5 * Math.sin(n * 1.3) * (1 - u);
  const ph = ((n % 8) + 8) % 8, phi = (2 * Math.PI * ph) / 8;
  const F = (pts) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) g.lineTo(q[0], q[1]); g.closePath(); g.fill(); };
  const nhun = -0.024 * h * Math.abs(Math.sin(phi));
  const chan = [-1, 1].map((sd) => { const pl = phi + (sd > 0 ? 0 : Math.PI); return { sd, f: Math.cos(pl), nhac: Math.max(0, -Math.sin(pl)) }; });
  const tru = chan.reduce((a2, c2) => (c2.nhac < a2.nhac ? c2 : a2));
  const lx = cx + 0.022 * h * tru.sd, hipY = yb - 0.24 * h + nhun;
  for (const c2 of chan) {
    const ax = lx + c2.sd * 0.03 * h - c2.sd * 0.012 * h * c2.nhac, ay = yb - 0.05 * h * (c2.f + 1) / 2 - 0.085 * h * c2.nhac;
    const hx = lx + c2.sd * 0.038 * h, gx = (hx + ax) / 2 + c2.sd * 0.014 * h * c2.nhac, gy = (hipY + ay) / 2 - 0.01 * h * c2.nhac;
    F([[hx - 0.03 * h, hipY], [hx + 0.03 * h, hipY], [gx + 0.022 * h, gy], [gx - 0.022 * h, gy]]);
    F([[gx - 0.022 * h, gy], [gx + 0.022 * h, gy], [ax + 0.013 * h, ay - 0.03 * h], [ax - 0.013 * h, ay - 0.03 * h]]);
    if (c2.nhac > 0.2 || c2.f < -0.4) F([[ax - 0.018 * h, ay - 0.034 * h], [ax + 0.018 * h, ay - 0.034 * h], [ax + 0.014 * h, ay + 0.012 * h], [ax - 0.014 * h, ay + 0.012 * h]]);
    else { F([[ax - 0.018 * h, ay - 0.036 * h], [ax + 0.018 * h, ay - 0.036 * h], [ax + 0.015 * h, ay - 0.004 * h], [ax - 0.015 * h, ay - 0.004 * h]]); F([[ax - 0.004 * h, ay - 0.008 * h], [ax + 0.004 * h, ay - 0.008 * h], [ax + 0.002 * h, ay + 0.022 * h], [ax - 0.002 * h, ay + 0.022 * h]]); }
  }
  const sw = 0.035 * h * Math.cos(phi), ng = 0.012 * h * tru.sd, ya = yb - 0.25 * h + nhun, top = yb - 0.75 * h + nhun;
  F([[cx - 0.118 * h + ng, top], [cx + 0.118 * h + ng, top], [cx + 0.078 * h + ng * 0.6, yb - 0.55 * h + nhun], [cx + 0.14 * h + sw, ya], [cx - 0.14 * h + sw, ya], [cx - 0.078 * h + ng * 0.6, yb - 0.55 * h + nhun]]);
  for (const c2 of chan) {
    const a2 = -c2.f, L = 0.33 * h * (1 - 0.2 * Math.max(0, a2)), sx = cx + ng + c2.sd * 0.11 * h, sy = top + 0.02 * h;
    const vx = sx + c2.sd * (0.05 * h * Math.max(0, -a2) - 0.025 * h * Math.max(0, a2));
    F([[sx - 0.02 * h, sy], [sx + 0.02 * h, sy], [vx + 0.014 * h, sy + L], [vx - 0.014 * h, sy + L]]);
    g.beginPath(); g.ellipse(vx, sy + L + 0.012 * h, 0.017 * h, 0.022 * h, 0, 0, Math.PI * 2); g.fill();
  }
  F([[cx + ng - 0.05 * h, top - 0.045 * h], [cx + ng + 0.05 * h, top - 0.045 * h], [cx + ng + 0.07 * h, top + 0.01 * h], [cx + ng - 0.07 * h, top + 0.01 * h]]);
  g.beginPath(); g.ellipse(cx + ng, top - 0.065 * h, 0.052 * h, 0.06 * h, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx + ng, top - 0.115 * h, 0.155 * h, 0.03 * h, 0.06 * tru.sd, 0, Math.PI * 2); g.fill();
  F([[cx + ng - 0.085 * h, top - 0.12 * h], [cx + ng + 0.085 * h, top - 0.12 * h], [cx + ng + 0.07 * h, top - 0.22 * h], [cx + ng - 0.07 * h, top - 0.22 * h]]);
  g.font = 'bold 30px "Courier Prime", monospace'; g.fillText(String(n).padStart(4, '0'), 20, 280);
  g.lineWidth = 6; g.strokeRect(6, 6, W - 12, H - 12);
  return cv;
}

export { veKhung as _veKhung };
export function makeHam5(o) { const g = makeHam5G(o); let r; do { r = g.next(); } while (!r.done); return r.value; }
export function* makeHam5G(o) {
  const { renderer } = o;
  const sc = new THREE.Scene();
  const MAU = { muc: '#17131A', dem: '#232A62', sang: '#34399A', do: '#FF1F4F', hong: '#FF3A86', giay: '#F3DCD6', dochim: '#602443' };
  const B0 = new THREE.Vector3(...HAM5.BULB), PIV = new THREE.Vector3(B0.x, ROOM.cao, B0.z), bulbW = B0.clone();
  const FILL = new THREE.Vector3(0.79, 1, 0.69).normalize();
  const camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.05, 30);
  camera.position.set(1.02, 2.5, 2.62); camera.lookAt(-0.12, 0.72, -0.62);
  let W = 2, H = 2;
  const shN = o.low ? 1024 : SHN;
  const mayBong = (nhin, fov) => {
    const rt = new THREE.WebGLRenderTarget(shN, shN, { depthTexture: new THREE.DepthTexture(shN, shN), depthBuffer: true, format: THREE.RedFormat });
    const cam = new THREE.PerspectiveCamera(fov, 1, 0.05, 8);
    return { rt, cam, nhin: new THREE.Vector3(...nhin), vp: new THREE.Matrix4() };
  };
  const SHS = mayBong([-0.3, 0.5, -2.4], 125), SHT = mayBong([0.1, 0.0, 1.0], 130);
  const datMayBong = (sh) => { sh.cam.position.copy(bulbW); sh.cam.lookAt(sh.nhin); sh.cam.updateProjectionMatrix(); sh.cam.updateMatrixWorld(); sh.vp.multiplyMatrices(sh.cam.projectionMatrix, sh.cam.matrixWorldInverse); };
  datMayBong(SHS); datMayBong(SHT);
  const shU = {
    uBulb: { value: bulbW }, uBulbI: { value: 1.35 }, uFillD: { value: FILL }, uCell: { value: 0.0005 }, uHatPhim: { value: 14 }, uPcf: { value: 1 },
    uGrate: { value: new THREE.Vector4(GRATE.x0, GRATE.x1, GRATE.z0, GRATE.z1) }, uGrateY: { value: ROOM.cao },
    uLB: { value: new THREE.Vector4(LB.cx, LB.cz, LB.hx, LB.hz) }, uTop: { value: TOP }, uShTx: { value: 1 / shN },
    uShS: { value: SHS.rt.depthTexture }, uShSVP: { value: SHS.vp.clone() }, uShT: { value: SHT.rt.depthTexture }, uShTVP: { value: SHT.vp.clone() },
  };
  let nMat = 0;
  const texOf = (cv) => { const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace; return t; };
  const son = (p = {}) => { const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, side: p.side ?? THREE.DoubleSide,
    uniforms: { ...shU, uMap: { value: p.map || null }, uHasMap: { value: p.map ? 1 : 0 }, uKind: { value: p.kind ?? 0 }, uA: { value: p.a ?? 0.6 }, uAc: { value: p.ac ?? (p.a ?? 0.6) },
      uWmax: { value: p.wmax ?? 3 }, uCmax: { value: p.cmax ?? 2 }, uMat: { value: ++nMat }, uMau: { value: new THREE.Color(p.mau || MAU.giay) } } });
    m.extensions = { derivatives: true }; return m; };
  const ENV = [];
  const mk = (geo, p, pos, rot, ten, id = 20, cha = sc) => { const m = new THREE.Mesh(geo, son(p)); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); m.name = ten || ''; m.userData.idK = id; cha.add(m); ENV.push(m); return m; };
  const hop = (w, h, d, p, pos, rot, ten, id) => mk(new THREE.BoxGeometry(w, h, d), p, pos, rot, ten, id);
  const tam = (w, h, p, pos, rot, ten, id) => mk(new THREE.PlaneGeometry(w, h), p, pos, rot, ten, id);
  const canvas = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); fn(g, w, h); return c; };
  const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const gach = canvas(1024, 512, (g, w, h) => { const r = rng(5); g.fillStyle = '#000'; const bh = 512 / 14, bw = 1024 / 9;
    for (let i = 0; i <= 14; i++) { g.fillRect(0, i * bh - 1.5, w, 3); for (let j = 0; j <= 10; j++) { const x = j * bw + (i % 2) * bw / 2 + (r() - 0.5) * 4; g.fillRect(x - 1.5, i * bh, 3, bh); } }
    for (let k = 0; k < 220; k++) { g.globalAlpha = 0.7; g.fillRect(r() * w, r() * h, 1.5 + r() * 5, 1); } g.globalAlpha = 1; });
  const datDa = canvas(1024, 1024, (g, w, h) => { const r = rng(9); g.fillStyle = '#000'; const s = 1024 / 7;
    for (let i = 0; i <= 7; i++) { g.fillRect(0, i * s + (r() - 0.5) * 10, w, 2.5); g.fillRect(i * s + (r() - 0.5) * 10, 0, 2.5, h); }
    for (let k = 0; k < 160; k++) { g.globalAlpha = 0.6; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 2, 0, 7); g.fill(); } g.globalAlpha = 1; });
  const vanGo = canvas(1024, 512, (g, w, h) => { const r = rng(3); g.strokeStyle = '#000'; for (let i = 0; i < 22; i++) { g.lineWidth = 2 + r() * 2; g.setLineDash([60 + r() * 200, 30 + r() * 120]);
    g.beginPath(); const y0 = (i + r()) * h / 22; for (let x = 0; x <= w; x += 16) { const y = y0 + Math.sin(x * 0.01 + i) * 5; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } });
  const tGach = texOf(gach); tGach.wrapS = tGach.wrapT = THREE.RepeatWrapping;
  const RW = ROOM.x1 - ROOM.x0, RD = ROOM.z1 - ROOM.z0;
  tam(RW, RD, { map: texOf(datDa), kind: 1, a: 0.3, ac: 0.7 }, [0, 0, (ROOM.z0 + ROOM.z1) / 2], [-Math.PI / 2, 0, 0], 'san', 40);
  tam(RW, ROOM.cao, { map: tGach, kind: 1, a: 0.4 }, [0, ROOM.cao / 2, ROOM.z0], null, 'tuongSau', 41);
  tam(RD, ROOM.cao, { map: tGach, kind: 1, a: 0.4 }, [ROOM.x0, ROOM.cao / 2, (ROOM.z0 + ROOM.z1) / 2], [0, Math.PI / 2, 0], 'tuongTrai', 42);
  tam(RD, ROOM.cao, { map: tGach, kind: 1, a: 0.4 }, [ROOM.x1, ROOM.cao / 2, (ROOM.z0 + ROOM.z1) / 2], [0, -Math.PI / 2, 0], 'tuongPhai', 43);
  tam(RW, RD, { a: 0.3 }, [0, ROOM.cao, (ROOM.z0 + ROOM.z1) / 2], [Math.PI / 2, 0, 0], 'tran', 44);
  { const go = { map: texOf(vanGo), kind: 1, a: 0.5 };
    const BX = [-0.58, 0.62], BZ = [0.33, 1.06], cx = (BX[0] + BX[1]) / 2;
    const t = 0.035, yt = TOP - t / 2;
    hop(BX[1] - BX[0], t, LB.cz - LB.hz - BZ[0], go, [cx, yt, (BZ[0] + LB.cz - LB.hz) / 2], null, 'ban', 45);
    hop(BX[1] - BX[0], t, BZ[1] - (LB.cz + LB.hz), go, [cx, yt, (BZ[1] + LB.cz + LB.hz) / 2], null, 'ban', 45);
    hop(LB.cx - LB.hx - BX[0], t, 2 * LB.hz, go, [(BX[0] + LB.cx - LB.hx) / 2, yt, LB.cz], null, 'ban', 45);
    hop(BX[1] - (LB.cx + LB.hx), t, 2 * LB.hz, go, [(BX[1] + LB.cx + LB.hx) / 2, yt, LB.cz], null, 'ban', 45);
    tam(2 * LB.hx, 2 * LB.hz, { kind: 3, mau: MAU.giay }, [LB.cx, TOP - 0.004, LB.cz], [-Math.PI / 2, 0, 0], 'kinhDen', 47);
    for (const z of [BZ[0] + 0.04, BZ[1] - 0.04]) hop(BX[1] - BX[0] - 0.1, 0.03, 0.03, { a: 0.45 }, [cx, 0.12, z], null, 'giang', 46);
    for (const x of [BX[0] + 0.03, BX[1] - 0.03]) for (const z of [BZ[0] + 0.03, BZ[1] - 0.03]) hop(0.05, TOP - t, 0.05, { a: 0.45 }, [x, (TOP - t) / 2, z], null, 'chan', 46);
  }
  const NGOI = new THREE.Vector3(HAM5.NGOI[0], TOP + 0.0006, HAM5.NGOI[1]);
  const cvTo = document.createElement('canvas'); cvTo.width = 1200; cvTo.height = 900;
  { const g = cvTo.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1200, 900);
    g.save(); g.translate(1200, 900); g.rotate(Math.PI); if (o.anh0418) g.drawImage(o.anh0418, 0, 0, 1200, 900); g.restore();
    const toPX = (x, z) => [(x - (TO.x - TO.w / 2)) / TO.w * 1200, (z - (TO.z - TO.h / 2)) / TO.h * 900];
    g.strokeStyle = '#222'; g.lineCap = 'round'; g.lineWidth = 10;
    const r = rng(21);
    const x0 = TO.x - TO.w / 2 + 0.014, x1 = NGOI.x - 0.006, z0 = TO.z - TO.h / 2 + 0.016, z1 = TO.z + TO.h / 2 - 0.02;
    for (let hz = 0; hz < 6; hz++) for (let cx = 0; cx < 7; cx++) {
      const x = x0 + (cx + 0.5 * (hz % 2) + (r() - 0.5) * 0.5) * (x1 - x0) / 7, z = z0 + (hz + 0.2 + (r() - 0.5) * 0.4) * (z1 - z0) / 6, L = 0.016 + r() * 0.006;
      if (x > x1 || Math.hypot(x - NGOI.x, z - NGOI.z) < 0.02 || r() < 0.15) continue;
      const [a0, b0] = toPX(x, z), [a1, b1] = toPX(x + 0.22 * L, z - L); g.beginPath(); g.moveTo(a0, b0); g.lineTo(a1, b1); g.stroke(); }
    { const L = 0.024 * 0.6, [a0, b0] = toPX(NGOI.x - 0.22 * L, NGOI.z + L), [a1, b1] = toPX(NGOI.x, NGOI.z); g.lineWidth = 11; g.beginPath(); g.moveTo(a0, b0); g.lineTo(a1, b1); g.stroke(); }
    g.save(); g.translate(1200, 900); g.rotate(Math.PI); g.fillStyle = '#f01040'; g.font = 'bold 56px "Courier Prime", monospace'; g.fillText('0418', 40, 860); g.restore(); }
  tam(TO.w, TO.h, { map: texOf(cvTo), kind: 2 }, [TO.x, TOP + 0.0006, TO.z], [-Math.PI / 2, 0, 0], 'to0418', 48).userData.giayUv = true;
  { const c = canvas(500, 400, (g) => { g.fillStyle = '#ff1f4f'; g.fillRect(0, 0, 500, 400); g.fillStyle = '#000';
      for (let k = 0; k < 4; k++) { g.fillRect(30 + k * 120, 18, 60, 44); g.fillRect(30 + k * 120, 338, 60, 44); } g.fillRect(70, 92, 360, 216);
      g.fillStyle = '#fff'; g.fillRect(205, 120, 90, 170); g.fillStyle = '#000'; g.fillRect(232, 175, 36, 100); });
    tam(0.07, 0.056, { map: texOf(c), kind: 2 }, [0.25, TOP + 0.0008, 0.69], [-Math.PI / 2, 0, 0.35], 'phim0418', 49); }
  yield;
  const butBan = new THREE.Group();
  { const keo = canvas(400, 600, (g) => { g.fillStyle = '#000'; g.translate(200, 360);
      for (const s2 of [-1, 1]) { g.save(); g.rotate(s2 * 0.12); g.beginPath(); g.moveTo(0, 0); g.lineTo(s2 * 16, -30); g.lineTo(s2 * 5, -330); g.lineTo(-s2 * 4, -320); g.closePath(); g.fill();
        g.lineWidth = 22; g.beginPath(); g.ellipse(s2 * 60, 110, 52, 70, s2 * 0.5, 0, 7); g.stroke(); g.restore(); } });
    const tk = texOf(keo); tk.premultiplyAlpha = false;
    tam(0.1, 0.15, { map: tk, kind: 1, a: 0.6 }, [0.43, TOP + 0.001, 0.47], [-Math.PI / 2, 0, -0.5], 'keo', 14);
    hop(0.13, 0.012, 0.022, { a: 0.4 }, [-0.42, TOP + 0.006, 0.88], [0, 0.6, 0], 'dao', 15);
    hop(0.035, 0.012, 0.006, { a: 0.8, wmax: 4 }, [-0.38, TOP + 0.006, 0.84], [0, 0.6, 0], 'luoiDao', 16);
    const m1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.07, 6), son({ a: 0.55 })); m1.rotation.z = Math.PI / 2; butBan.add(m1);
    const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0047, 0.0047, 0.012, 6), son({ kind: 3, mau: MAU.do })); m2.rotation.z = Math.PI / 2; m2.position.x = -0.04; butBan.add(m2);
    const m3 = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.018, 6), son({ a: 0.8 })); m3.rotation.z = -Math.PI / 2; m3.position.x = 0.044; butBan.add(m3);
    butBan.position.set(0.47, TOP + 0.005, 0.8); butBan.rotation.y = 0.7; sc.add(butBan); butBan.traverse((m) => { if (m.isMesh) { m.userData.idK = 17; ENV.push(m); } });
    for (let i = 0; i < 4; i++) tam(0.24, 0.18, { a: 0.95, wmax: 4 }, [-0.42 + i * 0.004, TOP + 0.001 + i * 0.002, 0.58 - i * 0.003], [-Math.PI / 2, 0, 0.05 * i - 0.08], 'xap', 18);
  }
  const treo = new THREE.Group(); treo.position.copy(PIV); sc.add(treo);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 16), son({ kind: 3, mau: MAU.giay })); bulb.position.set(0, -DAI_DAY, 0); treo.add(bulb);
  const de = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.05, 16), son({ kind: 3, mau: MAU.muc })); de.position.set(0, -DAI_DAY + 0.045, 0); treo.add(de);
  const day = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, DAI_DAY - 0.07, 6), son({ kind: 3, mau: MAU.muc })); day.position.set(0, -(DAI_DAY - 0.07) / 2, 0); treo.add(day);
  for (const m of [bulb, de, day]) m.userData.idK = 9;
  const quang = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.ShaderMaterial({ vertexShader: VS, transparent: true, depthWrite: false, uniforms: { ...shU },
    fragmentShader: `${PAL}\nvarying vec3 vW; varying vec3 vN; varying vec2 vUv;\nvoid main(){ float r = length(vUv - 0.5) * 2.0; float n = h13(floor(vW / 0.0042));
      float k = r + (n - 0.5) * 0.18; vec3 c; if (k < 0.32) c = P4; else if (k < 0.58) c = P3; else if (k < 0.92) c = P6; else discard; if (r < 0.17) discard; gl_FragColor = vec4(hatCuoi(c, vW), 1.0); }` }));
  quang.renderOrder = 20; sc.add(quang);
  const KHUNG = [];
  let kepTrong = null;
  for (const [li, d] of DAY_PHOI.entries()) {
    const x0 = d.x0, x1 = 1.85;
    const dp = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, x1 - x0, 6), son({ a: 0.7 })); dp.rotation.z = Math.PI / 2; dp.position.set((x0 + x1) / 2, d.y, d.z); dp.userData.idK = 56; sc.add(dp); ENV.push(dp);
    for (const [i, so] of d.so.entries()) {
      const x = x0 + 0.3 + i * 0.36 + li * 0.12;
      const g = new THREE.Group(); g.position.set(x, d.y, d.z); sc.add(g);
      const kep = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.05, 0.012), son({ a: 0.6 })); kep.position.y = -0.012; kep.userData.idK = 53; g.add(kep); ENV.push(kep);
      if (so) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.1875), son({ map: texOf(veKhung(so)), kind: 1, a: 1.0, wmax: 3 })); m.position.y = -0.03 - 0.094; m.userData.idK = 50 + (KHUNG.length % 3); m.userData.giayUv = true; g.add(m); ENV.push(m);
      } else {
        kepTrong = g; kep.visible = false; ENV.splice(ENV.indexOf(kep), 1);
        for (const sd of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.05, 0.012), son({ a: 0.75 })); c.position.set(sd * 0.006, -0.014, 0); c.rotation.z = sd * 0.16; c.userData.idK = 54; g.add(c); ENV.push(c); }
        const sh = new THREE.Shape(); sh.moveTo(0.0, 0.0); sh.lineTo(0.022, -0.002); sh.lineTo(0.017, -0.009); sh.lineTo(0.021, -0.014); sh.lineTo(0.012, -0.018);
        sh.lineTo(0.009, -0.026); sh.lineTo(0.002, -0.021); sh.closePath();
        const vun = new THREE.Mesh(new THREE.ShapeGeometry(sh), son({ a: 1.0, wmax: 3 })); vun.position.set(0.001, -0.03, 0.007); vun.userData.idK = 55; g.add(vun); ENV.push(vun);
      }
      KHUNG.push(g);
    }
    yield;
  }
  { for (const y of [0.55, 1.15]) hop(1.7, 0.03, 0.34, { a: 0.45 }, [0.95, y, ROOM.z0 + 0.17], null, 'ke', 57);
    const nhan = ['0001–0130', '0131–0260', '0261–0400', '0401–0420', '0421–0560', '0561–0700', '0701–0760', '0761–0900'];
    let k = 0;
    for (const y of [0.55, 1.15]) for (let i = 0; i < 4; i++) {
      const x = 0.26 + i * 0.42, hh = 0.26 + (i % 2) * 0.03;
      hop(0.38, hh, 0.3, { a: 0.42 }, [x, y + 0.015 + hh / 2, ROOM.z0 + 0.17], null, 'hopKe', 58 + (k % 2));
      const c = canvas(512, 256, (g) => { g.fillStyle = '#000'; g.font = '64px "Courier Prime", monospace'; g.fillText('BOX ' + (31 + k), 40, 100); g.fillText(nhan[k], 40, 190); g.lineWidth = 8; g.strokeRect(10, 10, 492, 236); });
      tam(0.2, 0.1, { map: texOf(c), kind: 1, a: 0.85, wmax: 3 }, [x, y + 0.015 + hh / 2, ROOM.z0 + 0.321], null, 'nhanHop', 60); k++;
    }
    const quat = canvas(512, 512, (g) => { g.strokeStyle = '#000'; g.lineWidth = 7; for (const r of [240, 170, 100]) { g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); }
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.cos(a) * 240, 256 + Math.sin(a) * 240); g.stroke(); }
      g.fillStyle = '#000'; g.beginPath(); g.arc(256, 256, 40, 0, 7); g.fill(); });
    tam(0.36, 0.36, { map: texOf(quat), kind: 1, a: 0.75 }, [1.55, 1.72, ROOM.z0 + 0.3], [0, -0.25, 0], 'quat', 61);
    hop(0.1, 0.32, 0.08, { a: 0.4 }, [1.58, 1.44, ROOM.z0 + 0.2], null, 'chanQuat', 62);
    const CZ = HAM5.CUA_Z, XW = ROOM.x0;
    hop(0.05, 2.05, 0.86, { a: 0.35 }, [XW + 0.03, 1.025, CZ], null, 'cua', 63);
    for (const [z, y, dd, h] of [[CZ - 0.45, 1.06, 0.06, 2.12], [CZ + 0.45, 1.06, 0.06, 2.12], [CZ, 2.1, 0.96, 0.06]]) hop(0.08, h, dd, { a: 0.4 }, [XW + 0.04, y, z], null, 'khungCua', 64);
    hop(0.03, 0.12, 0.04, { a: 0.9, wmax: 4 }, [XW + 0.07, 1.0, CZ + 0.33], null, 'nam', 65);
    const chu = canvas(1400, 900, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 1400, 900); g.save(); g.translate(1400, 0); g.scale(-1, 1);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `170px "${o.phongAnton || 'Anton'}", Impact, sans-serif`; g.fillText('BLIND ALLEY', 700, 380); g.font = `86px "${o.phongAnton || 'Anton'}", Impact, sans-serif`; g.fillText('P I C T U R E S', 700, 520);
      g.fillRect(260, 580, 880, 10); g.font = '52px "Courier Prime", monospace'; g.fillText('ANIMATION · BY APPOINTMENT', 700, 680); g.restore(); });
    tam(0.62, 0.4, { map: texOf(chu), kind: 4, a: 1.2 }, [XW + 0.058, 1.5, CZ], [0, Math.PI / 2, 0], 'kinhCua', 66);
  }
  { const nh = ['0001–0130', '0131–0260', '0261–0400'];
    [[0.0, 0.08], [0.03, -0.06], [-0.02, 0.15]].forEach(([dx, rot], i) => {
      const y = 0.14 + i * 0.28; hop(0.46, 0.27, 0.34, { a: 0.85 }, [-1.75 + dx, y, -0.15], [0, rot, 0], 'hopSan', 67 + (i % 2));
      const c = canvas(512, 256, (g) => { g.fillStyle = '#000'; g.font = '64px "Courier Prime", monospace'; g.fillText('BOX ' + (28 + i), 40, 100); g.fillText(nh[i], 40, 190); g.lineWidth = 8; g.strokeRect(10, 10, 492, 236); });
      tam(0.22, 0.11, { map: texOf(c), kind: 1, a: 0.85, wmax: 3 }, [-1.75 + dx + Math.sin(rot) * 0.171, y, -0.15 + Math.cos(rot) * 0.171], [0, rot, 0], 'nhanHopSan', 69); });
    hop(0.34, 0.035, 0.34, { a: 0.5 }, [-0.95, 0.62, 0.25], [0, 0.4, 0], 'ghe', 70);
    for (const [dx, dz] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) hop(0.035, 0.6, 0.035, { a: 0.45 }, [-0.95 + dx * Math.cos(0.4) + dz * Math.sin(0.4), 0.3, 0.25 - dx * Math.sin(0.4) + dz * Math.cos(0.4)], null, 'chanGhe', 70);
  }
  yield;
  const nshared = makeShared();
  const MATS = {
    Nguoi: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.5, gw1: 12, high2: 0, rimThr: 0.06, speck: 0.01 },
    Ao: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.45, gw1: 16, th2: 0.93, high2: 1, rimThr: 0.07, speck: 0.03 },
    VatAo: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.45, gw1: 16, th2: 0.93, high2: 1, rimThr: 0.025, speck: 0.03, side: THREE.DoubleSide },
    Dai: { dark: C.muc, mid: C.muc, high: C.chamDem, th1: 0.6, high2: 0, rimThr: 0.05, speck: 0.0 },
    CoAo: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.35, gw1: 14, th2: 0.9, high2: 1, rimThr: 0.05, speck: 0.03, side: THREE.DoubleSide },
    Tui: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.4, high2: 0, rimThr: 0.03, speck: 0.02, side: THREE.DoubleSide },
    Mu: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.3, gw1: 14, th2: 0.86, high2: 1, rimThr: 0.05, speck: 0.03, side: THREE.DoubleSide },
    BangMu: { dark: C.muc, mid: C.muc, high: C.chamDem, th1: 0.95, high2: 0, speck: 0.0 },
    Toc: { dark: C.muc, mid: C.muc, high: C.chamDem, th1: 0.6, high2: 0, rimThr: 0.04 },
    Giay: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.5, th2: 0.9, high2: 1, rimThr: 0.03, speck: 0.0 },
    Gang: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.55, gw1: 10, th2: 0.9, high2: 1, rimThr: 0.03, speck: 0.0 },
    GangPhai: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.55, gw1: 10, th2: 0.9, high2: 1, rimThr: 0.06, speck: 0.0 },
    Got: { dark: C.muc, mid: C.chamDem, high: C.chamSang, th1: 0.5, th2: 0.9, high2: 1, rimThr: 0.03, speck: 0.0 },
  };
  const nmats = {};
  for (const [k, p] of Object.entries(MATS)) { nmats[k] = makeMaterial(nshared, { headOn: 0, rim: C.do, ...p, th1: Math.max(p.th1 ?? 0.2, k === 'Gang' || k === 'GangPhai' ? 0.45 : 0.72), high2: k === 'Gang' || k === 'GangPhai' ? (p.high2 ?? 1) : 0 }); nmats[k].uniforms.kRed.value = 0; nmats[k].uniforms.kFace.value = 0; }
  { const m = nmats.GangPhai, cu = m.fragmentShader;
    m.fragmentShader = cu.replace(/float sRr = face > 0\.0 \? shadowCov\([^;]*;/, 'float sRr = face > 0.0 ? 1.0 : 0.0;')
      .replace(/float sR = shadowCov\([^;]*;/, 'float sR = 1.0;');
    m.uniforms.kRed.value = 1;
    if (m.fragmentShader === cu) console.warn('ham5: không thay được viền găng phải'); m.needsUpdate = true; }
  const nu = o.nguoi; sc.add(nu); nu.updateMatrixWorld(true);
  const NGUOI = [], BUT = []; let gang = null;
  nu.traverse((m) => {
    if (!m.isMesh) return;
    if (m.name.startsWith('But')) { BUT.push(m); return; }
    const key = Object.keys(MATS).find((k) => m.name === k || m.name.startsWith(k + '_') || m.name.startsWith(k + '.')) || 'Ao';
    m.material = nmats[key]; m.userData.key = key; m.layers.enable(1); m.frustumCulled = false; NGUOI.push(m);
    if (key === 'Gang') gang = m;
  });
  const PT_GANG = [];
  if (gang) {
    const g0 = gang.geometry.index ? gang.geometry.toNonIndexed() : gang.geometry.clone();
    g0.applyMatrix4(gang.matrixWorld);
    const p = g0.attributes.position, nr = g0.attributes.normal, A = [[], []], An = [[], []];
    for (let i = 0; i < p.count; i += 3) { const ph = p.getX(i) < 0 && p.getX(i + 1) < 0 && p.getX(i + 2) < 0 ? 1 : 0;
      for (let k = 0; k < 3; k++) { A[ph].push(p.getX(i + k), p.getY(i + k), p.getZ(i + k)); An[ph].push(nr.getX(i + k), nr.getY(i + k), nr.getZ(i + k)); }
      if (ph && i % 24 === 0) PT_GANG.push(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i))); }
    [['GangTrai', 'Gang'], ['GangPhai', 'GangPhai']].forEach(([ten, k], ph) => {
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(A[ph], 3)); gg.setAttribute('normal', new THREE.Float32BufferAttribute(An[ph], 3));
      const mm = new THREE.Mesh(gg, nmats[k]); mm.name = ten; mm.userData.key = k; mm.layers.enable(1); mm.frustumCulled = false; sc.add(mm); NGUOI.push(mm);
    });
    gang.visible = false; gang.layers.disable(1); NGUOI.splice(NGUOI.indexOf(gang), 1);
  }
  const uBut = { uCam: { value: camera.position }, uCell: shU.uCell, uHatPhim: shU.uHatPhim, uLoai: { value: 0 } };
  const butMat = (loai) => new THREE.ShaderMaterial({ uniforms: { ...uBut, uLoai: { value: loai } }, vertexShader: VS,
    fragmentShader: `${PAL}
varying vec3 vW; varying vec3 vN; varying vec2 vUv; uniform vec3 uCam; uniform float uLoai;
    void main() { vec3 N = normalize(vN); float d = dot(N, normalize(uCam - vW)); vec3 col;
      if (uLoai < 0.5) col = d > 0.8 ? P2 : d > 0.25 ? P1 : P0; else if (uLoai < 1.5) col = d > 0.55 ? P6 : P0; else if (uLoai < 2.5) col = P3; else col = P0;
      gl_FragColor = vec4(hatCuoi(col, vW), 1.0); }` });
  for (const m of BUT) {
    const k = m.name.replace(/[._].*$/, '');
    m.material = butMat(k === 'ButThan' ? 0 : k === 'ButGot' ? 1 : k === 'ButSon' ? 2 : 3);
    m.userData.idK = 17; m.frustumCulled = false; ENV.push(m);
  }
  const box = new THREE.Box3(); for (const m of NGUOI) box.expandByObject(m);
  const figC = box.getCenter(new THREE.Vector3()), figR = box.getSize(new THREE.Vector3()).length() / 2;
  const Lf = new THREE.Vector3(0, -0.55, 0.84).normalize(), Lr = B0.clone().sub(figC).normalize();
  nshared.uLfill.value.copy(Lf); nshared.uLred.value.copy(Lr); nshared.uLface.value.set(0, 0, 1);
  nshared.uHeadI.value = 0; nshared.uSang.value = 1; nshared.uSangCua.value = 1; nshared.uNhen.value = 1; nshared.uEmberI.value = 0;
  const SN = o.low ? 1024 : 2048, depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
  const lamBong = () => { const rt = new THREE.WebGLRenderTarget(SN, SN, { depthTexture: new THREE.DepthTexture(SN, SN), depthBuffer: true, format: THREE.RedFormat }); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 8); cam.layers.set(1); return { rt, cam }; };
  const shF = lamBong(), shR = lamBong();
  const fit = (sh, Ld) => { sh.cam.position.copy(figC).addScaledVector(Ld, 3); sh.cam.lookAt(figC); const r = figR * 1.02; Object.assign(sh.cam, { left: -r, right: r, top: r, bottom: -r, near: 3 - figR * 1.2, far: 3 + figR * 1.2 });
    sh.cam.updateProjectionMatrix(); sh.cam.updateMatrixWorld(); return new THREE.Matrix4().multiplyMatrices(sh.cam.projectionMatrix, sh.cam.matrixWorldInverse); };
  nshared.uFillVP.value.copy(fit(shF, Lf)); nshared.uFillDepth.value = shF.rt.depthTexture;
  nshared.uRedVP.value.copy(fit(shR, Lr)); nshared.uRedDepth.value = shR.rt.depthTexture;
  nshared.uFillTexel.value = 1 / SN; nshared.uHeadTexel.value = 1 / SN;
  nshared.uLensR.value = 0;
  if (o.low) nshared.uTaps.value = 4;
  const camDepth = camera.clone(); camDepth.layers.set(1);
  let camRT = null;
  yield;
  const CO_TAY = new THREE.Vector3(...o.J.tay.r.co);
  const BJ = o.J.but || { tip: [NGOI.x, NGOI.y, NGOI.z], truc: [-0.4, 0.6, 0.6], L: 0.15 };
  const BUT_NGOI = new THREE.Vector3(...BJ.tip), BUT_DUOI = BUT_NGOI.clone().addScaledVector(new THREE.Vector3(...BJ.truc).normalize(), BJ.L);
  const BUT_GIUA = BUT_NGOI.clone().addScaledVector(new THREE.Vector3(...BJ.truc).normalize(), 0.05);
  { const mcp = new THREE.Vector3(...o.J.tay.r.ngon.middle[0]); PT_GANG.push(CO_TAY.clone(), CO_TAY.clone().addScaledVector(CO_TAY.clone().sub(mcp).normalize(), 0.06)); }
  const NBUI = 150;
  const uBui = { uT: { value: 0 }, uBulb: shU.uBulb, uDpr: { value: 1 }, uCell: shU.uCell, uHatPhim: shU.uHatPhim, uN: { value: NBUI } };
  const bui = (() => { const a = new Float32Array(NBUI * 3), id = new Float32Array(NBUI), r = rng(7);
    for (let i = 0; i < NBUI; i++) { a[i * 3] = B0.x + (r() - 0.5) * 1.3; a[i * 3 + 1] = 1.25 + r() * 1.2; a[i * 3 + 2] = B0.z + (r() - 0.5) * 1.1; id[i] = i; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setAttribute('aId', new THREE.BufferAttribute(id, 1));
    const m = new THREE.ShaderMaterial({ depthWrite: false, uniforms: uBui,
      vertexShader: `uniform float uT, uDpr, uN; uniform vec3 uBulb; attribute float aId; varying float vD; varying vec3 vW;
        void main(){ vec3 p = position + vec3(sin(uT * 0.17 + position.y * 4.0) * 0.06, mod(uT * 0.02 + position.x * 3.0, 0.3) - 0.15, cos(uT * 0.13 + position.x * 5.0) * 0.05);
        vD = aId < uN ? distance(p, uBulb) : 9.0; vW = p; vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = max(1.5, 4.0 / -mv.z) * uDpr; }`,
      fragmentShader: `${PAL}\nvarying float vD; varying vec3 vW; void main(){ if (length(gl_PointCoord - 0.5) > 0.5 || vD > 0.46) discard; gl_FragColor = vec4(hatCuoi(vD < 0.26 ? P4 : P3, vW), 1.0); }` });
    const p = new THREE.Points(g, m); p.renderOrder = 25; p.frustumCulled = false; sc.add(p); return p; })();
  const AN_BONG = [treo, quang, bui];

  let mayDat = null;
  function datMay(m, w, h) {
    W = w; H = h; mayDat = m;
    camera.aspect = W / H; camera.fov = m.fov; camera.near = 0.05; camera.far = 30;
    camera.position.set(...m.p); camera.up.set(0, 1, 0); camera.lookAt(...m.t);
    if (m.lech && (m.lech[0] || m.lech[1])) camera.setViewOffset(W, H, -m.lech[0] * W, -m.lech[1] * H, W, H); else camera.clearViewOffset();
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const tg = Math.tan(THREE.MathUtils.degToRad(m.fov / 2));
    shU.uCell.value = (2 * tg / H) * 0.95;
    const dFig = camera.position.distanceTo(figC);
    nshared.uCell.value = (2 * dFig * tg / H) * 0.8; nshared.uRes.value.set(W, H); nshared.uNear.value = camera.near; nshared.uFar.value = camera.far;
    rimW0 = Math.max(2.2, 3.2 * (H / 1080) * (W / H >= 1 ? 1 : 1.2)); datRimW();
    quang.lookAt(camera.position);
    datVienDir();
    tinh = false;
  }
  const _a = new THREE.Vector3();
  function manPx(p) { _a.copy(p).project(camera); return [(_a.x * 0.5 + 0.5) * W, (0.5 - _a.y * 0.5) * H]; }
  let rimW0 = 3;
  function datRimW() { const k = Math.max(-1, Math.min(1, (bulbW.x - B0.x) / 0.1)); nshared.uRimW.value = rimW0 * (1 + 0.6 * k); }
  function datVienDir() {
    const cr = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), cu = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    nshared.uRimDir.value.set(Lr.dot(cr), Lr.dot(cu)).normalize(); nshared.uRimDirH.value.copy(nshared.uRimDir.value);
  }
  let tinh = false, bongCu = 2;
  function veTinh() {
    const ac = renderer.autoClear; renderer.autoClear = true;
    sc.overrideMaterial = depthOnly;
    renderer.setRenderTarget(shF.rt); renderer.clear(); renderer.render(sc, shF.cam);
    if (!camRT || camRT.width !== W || camRT.height !== H) { if (camRT) { camRT.depthTexture.dispose(); camRT.dispose(); } camRT = new THREE.WebGLRenderTarget(W, H, { depthTexture: new THREE.DepthTexture(W, H), depthBuffer: true, format: THREE.RedFormat }); nshared.uCamDepth.value = camRT.depthTexture; }
    camDepth.copy(camera); camDepth.layers.set(1);
    renderer.setRenderTarget(camRT); renderer.clear(); renderer.render(sc, camDepth);
    sc.overrideMaterial = null;
    renderer.setRenderTarget(null); renderer.autoClear = ac;
    tinh = true; bongCu = 2;
  }
  const anCu = [];
  function veBongDen(mot = -1) {
    const ac = renderer.autoClear; renderer.autoClear = true;
    anCu.length = 0; for (const x of AN_BONG) { anCu.push(x.visible); x.visible = false; }
    sc.overrideMaterial = depthOnly;
    [SHS, SHT].forEach((sh, i) => { if (mot >= 0 && mot !== i) return; datMayBong(sh); shU[i ? 'uShTVP' : 'uShSVP'].value.copy(sh.vp); renderer.setRenderTarget(sh.rt); renderer.clear(); renderer.render(sc, sh.cam); });
    renderer.setRenderTarget(shR.rt); renderer.clear(); renderer.render(sc, shR.cam);
    sc.overrideMaterial = null;
    AN_BONG.forEach((x, i) => { x.visible = anCu[i]; });
    renderer.setRenderTarget(null); renderer.autoClear = ac;
  }
  const qTreo = new THREE.Quaternion(), _d = new THREE.Vector3(), XUONG = new THREE.Vector3(0, -1, 0);
  let gocCu = [9, 9], nac = 0, khungLe = 0;
  let bongDung = false;
  function capNhat(t, cham = 1) {
    const [ax, az] = cham < 1 ? [0, 0] : lacDen(t);
    uBui.uT.value = t * (cham < 1 ? 0 : 1);
    if (Math.abs(ax - gocCu[0]) < 1e-6 && Math.abs(az - gocCu[1]) < 1e-6) return;
    gocCu = [ax, az];
    _d.set(Math.tan(ax), -1, Math.tan(az)).normalize();
    qTreo.setFromUnitVectors(XUONG, _d); treo.quaternion.copy(qTreo); treo.updateMatrixWorld(true);
    bulbW.copy(PIV).addScaledVector(_d, DAI_DAY);
    quang.position.copy(bulbW); quang.lookAt(camera.position);
    Lr.copy(bulbW).sub(figC).normalize(); nshared.uLred.value.copy(Lr);
    if (!bongDung) nshared.uRedVP.value.copy(fit(shR, Lr));
    datVienDir();
    datRimW();
    if (!bongDung) bongCu = 2;
  }
  function ve(dich, khongBong = false) {
    if (!tinh) veTinh();
    if (khongBong) bongCu = 0;
    if (bongCu > 0) { veBongDen(khungLe++ & 1); bongCu--; }
    renderer.setRenderTarget(dich ?? null);
    renderer.clear(); renderer.render(sc, camera);
  }
  const _v = new THREE.Vector3();
  function hopTay(Wc, Hc, x0 = 250) {
    const ds = [...PT_GANG, BUT_NGOI, x0 >= 390 ? BUT_GIUA : BUT_DUOI];
    let a0 = 1e9, b0 = 1e9, a1 = -1e9, b1 = -1e9;
    for (const p of ds) { _v.copy(p).project(camera); const x = (_v.x * 0.5 + 0.5) * Wc, y = (0.5 - _v.y * 0.5) * Hc; a0 = Math.min(a0, x); b0 = Math.min(b0, y); a1 = Math.max(a1, x); b1 = Math.max(b1, y); }
    return [a0, b0, a1, b1].map(Math.round);
  }
  function diemTay(cx, cy, Wc, Hc) { const h = hopTay(Wc, Hc, 400); return { x: h[0], y: h[1] + 0.6 * (h[3] - h[1]) }; }
  function man(p, Wc, Hc) { _v.set(p[0], p[1], p[2]).project(camera); return { x: (_v.x * 0.5 + 0.5) * Wc, y: (0.5 - _v.y * 0.5) * Hc, z: _v.z }; }
  function dangKyKinh(lens) {
    for (const m of ENV) {
      if (m.userData.giayUv) lens.gbufMat(m, new THREE.ShaderMaterial({ vertexShader: GB_V, fragmentShader: GB_F_UV, side: THREE.DoubleSide, uniforms: { uId: { value: m.userData.idK } } }));
      else lens.gbufFor(m, m.userData.idK ?? 20);
    }
    if (lens.chiMat.uniforms.uNgoi) lens.chiMat.uniforms.uNgoi.value.set((NGOI.x - (TO.x - TO.w / 2)) / TO.w, 1 - (NGOI.z - (TO.z - TO.h / 2)) / TO.h);
    let id = 1;
    for (const m of NGUOI) { if (m.userData.key === 'Mu') lens.chiMat.uniforms.uIdMu.value = id; lens.gbufFor(m, id); id = Math.min(8, id + 1); }
    lens.chiMat.uniforms.uIdDau.value = -5;
    for (const m of [bulb, de, day]) lens.gbufFor(m, 9);
    lens.anDi(quang); lens.anDi(bui);
  }
  async function lamNongAsync() {
    if (renderer.extensions.has('KHR_parallel_shader_compile')) {
      await renderer.compileAsync(sc, camera).catch(() => {});
      sc.overrideMaterial = depthOnly; await renderer.compileAsync(sc, SHS.cam).catch(() => {}); sc.overrideMaterial = null;
    } else renderer.compile(sc, camera);
  }
  function datNac(n, phanMem = false) {
    nac = n; bongDung = n >= 3 || phanMem;
    shU.uHatPhim.value = n >= 2 ? 10 : 14;
    shU.uPcf.value = n >= 2 ? 0 : 1;
    uBui.uN.value = n >= 2 ? Math.round(NBUI * 0.5) : NBUI;
    nshared.uTaps.value = n >= 1 || o.low ? 4 : 12;
  }
  function datDpr(d) { uBui.uDpr.value = d; }
  function huy() {
    for (const r of [shF.rt, shR.rt, SHS.rt, SHT.rt]) { r.depthTexture.dispose(); r.dispose(); }
    if (camRT) { camRT.depthTexture.dispose(); camRT.dispose(); }
  }
  const diem = {
    ngoi: NGOI.clone(), coTay: CO_TAY.clone(), to: new THREE.Vector3(TO.x, TOP, TO.z), butBan: butBan.position.clone(),
    kepTrong: kepTrong ? kepTrong.position.clone() : new THREE.Vector3(0.11, 1.86, -1.05),
    tayTrai: [o.J.tay.l.co, ...Object.values(o.J.tay.l.ngon).map((f) => f[3])],
    phim: [[0.21, TOP, 0.66], [0.29, TOP, 0.66], [0.29, TOP, 0.72], [0.21, TOP, 0.72]],
    nguoi: [[-0.24, 1.72, -0.2], [0.26, 1.72, -0.2], [-0.24, 1.72, 0.32], [0.26, 1.72, 0.32], [-0.3, 1.0, 0.1], [0.3, 1.0, 0.1], [-0.3, 1.0, 0.42], [0.3, 1.0, 0.42]],
    kinhCua: new THREE.Vector3(ROOM.x0 + 0.06, 1.5, HAM5.CUA_Z), den: B0.clone(), dau: new THREE.Vector3(...o.J.hatTop), hopDen: [[LB.cx - LB.hx, TOP, LB.cz - LB.hz], [LB.cx + LB.hx, TOP, LB.cz - LB.hz], [LB.cx + LB.hx, TOP, LB.cz + LB.hz], [LB.cx - LB.hx, TOP, LB.cz + LB.hz]],
  };
  function nongTay() {
    const ds = [sc.getObjectByName('GangPhai'), ...BUT].filter(Boolean);
    return ds.map((m) => () => {
      const rt = new THREE.WebGLRenderTarget(16, 16, { depthBuffer: true }), cu = renderer.getRenderTarget(), cha = m.parent;
      const tam = new THREE.Scene(); tam.add(m); renderer.setRenderTarget(rt); renderer.render(tam, camera); cha.add(m);
      renderer.setRenderTarget(cu); rt.dispose();
    });
  }
  capNhat(0, 1);
  return { scene: sc, camera, ve, veTinh, veBongDen, capNhat, datMay, man, manPx, hopTay, diemTay, dangKyKinh, lamNongAsync, nongTay, datNac, datDpr, huy, diem, shared: shU, nshared, AN_BONG, treo, bulbW, figC,
    ganTinh: () => { tinh = false; }, mayDat: () => mayDat, butNgoi: BUT_NGOI, butDuoi: BUT_DUOI };
}
