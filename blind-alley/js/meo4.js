import * as THREE from 'three';
import { nhapAt } from './ngo4.js';

export const MEO3 = { ND: 14, CHU: 2.6, LAG: 0.42, QUAT: 9.0, QUAT_D: 1.3 };
const K = 0.86;
const HOP = 0.27;

const SDF = `
float sdE(vec2 p, vec2 r) { float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-6); }
float sdCap(vec2 p, vec2 a, vec2 b, float r1, float r2) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - mix(r1, r2, h); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
vec2 dp(vec2 p, vec2 c, float a) { vec2 d = p - c; float co = cos(a), si = sin(a); return vec2(co * d.x + si * d.y, -si * d.x + co * d.y); }
float sdTri(vec2 p, vec2 a, vec2 b, vec2 c) {
  vec2 e0 = b - a, e1 = c - b, e2 = a - c, v0 = p - a, v1 = p - b, v2 = p - c;
  vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0), pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0), pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)), vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))), vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y); }
uniform vec3 uJ[15];
uniform vec2 uDuoiR;
uniform vec4 uC3;
const vec2 DAU3 = vec2(0.104, -0.006); const float HUONG3 = -2.3;
float cThan(vec2 p) {
  float th = 1.0 + 0.008 * uC3.x;
  float d = sdE(dp(p, vec2(-0.016, 0.006), 0.1), vec2(0.13, 0.098) * th);
  return smin(d, sdE(dp(p, vec2(0.05, 0.032), -0.5), vec2(0.07, 0.054) * th), 0.04);
}
float cDui(vec2 p) {
  float th = 1.0 + 0.006 * uC3.x;
  return sdE(dp(p, vec2(-0.064, -0.03), 0.35), vec2(0.07, 0.054) * th);
}
float cChan(vec2 p) {
  return smin(sdCap(p, vec2(0.075, -0.052), vec2(0.04, -0.064), 0.0145, 0.013), sdE(p - vec2(0.034, -0.066), vec2(0.016, 0.012)), 0.006);
}
float cDau(vec2 p, out float tai) {
  vec2 q = dp(p, DAU3, HUONG3);
  float so = sdE(q - vec2(-0.004, 0.0), vec2(0.044, 0.044));
  float ma = sdE(q - vec2(0.008, 0.0), vec2(0.032, 0.051));
  float d = smin(so, ma, 0.016);
  d = smin(d, sdE(q - vec2(0.036, 0.0), vec2(0.019, 0.02)), 0.012);
  vec2 qa = dp(q, vec2(-0.014, 0.0), -uC3.y * 0.35), qb = dp(q, vec2(-0.014, 0.0), uC3.z * 0.35);
  float ta = sdTri(qa, vec2(0.018, 0.036), vec2(-0.021, 0.019), vec2(-0.04, 0.085)) - 0.0016;
  float tb = sdTri(qb, vec2(0.018, -0.036), vec2(-0.021, -0.019), vec2(-0.04, -0.085)) - 0.0016;
  tai = min(ta, tb);
  return smin(d, tai, 0.005);
}
float cDuoi(vec2 p) {
  float d = 1e3;
  for (int i = 0; i < 14; i++) { float r0 = mix(uDuoiR.x, uDuoiR.y, float(i) / 14.0), r1 = mix(uDuoiR.x, uDuoiR.y, float(i + 1) / 14.0); d = min(d, sdCap(p, uJ[i].xy, uJ[i + 1].xy, r0, r1)); }
  return d;
}
const int NP = 5;
float hPhan(int i, vec2 p) {
  float d, t;
  if (i == 0) d = cThan(p);
  else if (i == 1) d = cDui(p);
  else if (i == 2) d = cChan(p);
  else if (i == 3) d = cDau(p, t);
  else d = cDuoi(p);
  return d;
}
float tatCa(vec2 p) { float d = 1e3; for (int i = 0; i < NP; i++) d = min(d, hPhan(i, p)); return d; }
float matHN(vec2 q, vec2 ab, float mo, float ngW) {
  float b = ab.y * mo; if (b < 0.0004) return 0.0;
  float a = ab.x, R = (a * a + b * b) / (2.0 * b), c = R - b;
  if (max(length(q - vec2(0.0, -c)) - R, length(q - vec2(0.0, c)) - R) > 0.0) return 0.0;
  float b2 = b * 1.02, R2 = (ngW * ngW + b2 * b2) / (2.0 * ngW), c2 = R2 - ngW;
  return max(length(q - vec2(-c2, 0.0)) - R2, length(q - vec2(c2, 0.0)) - R2) < 0.0 ? 2.0 : 1.0;
}
float hMat(vec2 p, float px) {
  vec2 q = dp(p, DAU3, HUONG3);
  float w = max(0.0009, px * 0.7);
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec2 qe = dp(q, vec2(0.014, 0.0175 * fs), -1.5708 + 0.42 * fs);
    float mo = s > 0 ? uC3.w : 0.0;
    float m = matHN(qe, vec2(0.0162, 0.006), mo, 0.0017);
    if (m > 1.5) return 0.0;
    if (m > 0.5) return 3.0;
    float ax = abs(qe.x) / 0.015;
    if (ax < 1.0 && abs(qe.y + 0.003 * (1.0 - ax * ax) - (s > 0 ? 0.0052 * uC3.w : 0.0)) < w) return 2.0;
  }
  if (sdE(q - vec2(0.049, 0.0), vec2(0.004, 0.0055)) < 0.0) return 1.0;
  return -1.0;
}
`;

const VERT = `
varying vec3 vW;
void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;

const KHUNG = `
uniform mat4 uInv, uMdl; uniform float uS;
uniform vec2 uR2;
uniform float uLat;
void datKhung() {}
vec2 veTranh(vec2 c) { return vec2(dot(c, uR2) * uLat, dot(c, vec2(-uR2.y, uR2.x))); }
vec2 veMeo(vec2 t) { t.x *= uLat; return t.x * uR2 + t.y * vec2(-uR2.y, uR2.x); }
`;

const FRAG = (CHUNG) => `
${CHUNG}
${SDF}
${KHUNG}
varying vec3 vW;
uniform vec3 uCuaW;
uniform float uCuaSang;
uniform vec2 uGo;
uniform vec4 uTo;
uniform float uBongDen;
uniform float uKiem;
uniform float uMeoBau; uniform vec4 uBauR;
void main() {
  datKhung();
  vec2 pm = (uInv * vec4(vW, 1.0)).xy;
  vec2 p = veTranh(pm);
  float dist = length(vW - cameraPosition);
  float px = uCell * dist / uS;
  int top = -1;
  for (int i = NP - 1; i >= 0; i--) { if (hPhan(i, p) < 0.0) { top = i; break; } }
  vec3 Lc = (uInv * vec4(uDenB, 1.0)).xyz;
  vec3 Dc = (uInv * vec4(uCuaW, 1.0)).xyz;
  vec2 Lt = veTranh(Lc.xy), Dt = veTranh(Dc.xy);
  vec2 dL = normalize(Lt - p + vec2(1e-5)), dD = normalize(Dt - p + vec2(1e-5));
  vec3 celB = floor(vW / (uCell * max(dist, 0.5)));
  float kL = uTo.x, kH = max(uTo.y, 3.8 * px), kD = max(2.4 * px, 0.003);
  vec2 Q[6]; int nQ, nT;
  if (top < 0) {
    nQ = 2; nT = 2; Q[2] = p; Q[3] = p; Q[4] = p; Q[5] = p;
#ifdef CO_BAU
    if (uMeoBau > 0.5) { Q[0] = p + dD * uTo.z * 1.6; Q[1] = p + dD * 0.006; }
    else
#endif
    { float ngang = length(Lt - p), cao = max(Lc.z, 0.05); Q[0] = p + dL * uTo.z * ngang / cao; Q[1] = p + dL * 0.006; }
  } else {
    Q[0] = p; Q[1] = p + dL * 2.0 * px; Q[2] = p + dD * kD; Q[3] = p + dL * kL; Q[4] = p + dL * kH; Q[5] = p + dD * 0.03;
    nQ = 5; nT = 3;
#ifdef CO_BAU
    if (uMeoBau > 0.5) nQ = 6;
#endif
  }
  float T[6], S[6];
  for (int k = 0; k < nQ; k++) {
    float m = 1e3, sp = 0.0;
    if (k < nT) { for (int i = 0; i < NP; i++) { float h = hPhan(i, Q[k]); m = min(m, h); if (i == top) sp = h; } }
    else sp = hPhan(top, Q[k]);
    T[k] = m; S[k] = sp;
  }
  if (top < 0) {
    if (uBongDen > 0.5) discard;
#ifdef CO_BAU
    if (uMeoBau > 0.5) {
      if (vW.x < uBauR.x || vW.x > uBauR.y || vW.z < uBauR.z || vW.z > uBauR.w) discard;
      float mB = clamp(-T[0] / max(uTo.z * 0.5, 3.0 * px) + 0.5, 0.0, 1.0);
      float satB = clamp(-T[1] / (2.0 * px) + 0.6, 0.0, 1.0);
      float bongB = max(0.85 * mB, satB);
      if (bongB < 0.02) discard;
      vec2 bm = bauMat(vW);
      gl_FragColor = mau(bm.x, max(bm.y - 1.6 * bongB, 0.0), celB);
      return;
    }
#endif
    if (pm.y > uGo.y || pm.y < uGo.x) discard;
    float cG = denT(vW, vec3(0.0, 1.0, 0.0));
    if (cG < 0.45) discard;
    float m = clamp(-T[0] / max(uTo.z * 0.35, 3.0 * px) + 0.5, 0.0, 1.0);
    float sat = clamp(-T[1] / (2.0 * px) + 0.6, 0.0, 1.0);
    float bong = max(m, sat);
    if (bong < 0.02) discard;
    float cD = cG;
#ifdef CO_DA_KHO
    if (uHopTG.z > 0.0 && cD < 2.9 && daKho(vW.xz) < hash13(celB + 13.1)) cD -= 1.0;
#endif
    gl_FragColor = mau(max(cD - bong, 0.0), 0.0, celB);
    return;
  }
#ifdef CO_DA_KHO
  if (uKiem > 0.5 && uKiem < 1.5 && daKho(vW.xz) <= 0.0) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }
#endif
  if (uBongDen > 0.5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  if (uKiem > 1.5 && uMeoBau < 0.5 && (pm.y > uGo.y || pm.y < uGo.x)) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }
  if (uKiem > 1.5 && uMeoBau > 0.5 && (vW.x < uBauR.x || vW.x > uBauR.y || vW.z < uBauR.z || vW.z > uBauR.w)) { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); return; }
  vec3 cel = floor(vW / (uCell * 0.75 * max(dist, 0.5)));
  float gan = clamp(denT(vW, vec3(0.0, 1.0, 0.0)) * 0.9, 0.0, 1.0);
  float sL = S[3], sH = S[4];
  float c = clamp(sL / max(kL * 0.3, 3.0 * px) + 0.5, 0.0, 1.0) * gan;
  c += clamp(sH / (1.1 * px) + 0.5, 0.0, 1.0) * step(0.5, gan);
  if (T[0] > -1.1 * px && T[1] > 0.0) c = 0.0;
  float sD = S[2];
  float w = 0.0;
  if (sD > 0.0) {
    float ngoai = T[2] > 0.0 ? 1.0 : 0.0;
    w = mix(1.2, 3.0 * uNhap * uCuaSang, ngoai) * clamp(sD / px + 0.5, 0.0, 1.0);
  }
#ifdef CO_BAU
  if (uMeoBau > 0.5) {
    float kW = 0.03, sW = S[5];
    float am = clamp(amHam(vW) / 1.6, 0.0, 1.0);
    float wc = clamp(sW / max(kW * 0.3, 3.0 * px) + 0.5, 0.0, 1.0) * (0.55 + 0.9 * am);
    w = max(w, wc * 1.5);
  }
#endif
  if (top == 3) { float mt = hMat(p, px); if (mt > -0.5) { c = mt; w = 0.0; } }
  gl_FragColor = hatCuoi(mauB(c, w, cel, 0.9), cel);
}`;

const FRAG_GB = (CHUNG) => `
${CHUNG}
${SDF}
${KHUNG}
varying vec3 vW;
uniform float uId;
void main() {
  datKhung();
  vec2 p = veTranh((uInv * vec4(vW, 1.0)).xy);
  int top = -1; float dT = 1.0;
  for (int i = NP - 1; i >= 0; i--) { float d = hPhan(i, p); if (d < 0.0) { top = i; dT = d; break; } }
  if (top < 0) discard;
  float px = uCell * length(vW - cameraPosition) / uS;
  vec2 g = vec2(hPhan(top, p + vec2(0.002, 0.0)) - dT, hPhan(top, p + vec2(0.0, 0.002)) - dT) / 0.002;
  float h = clamp(-dT / 0.03, 0.0, 1.0);
  vec2 gm = veMeo(g);
  vec3 n = normalize(vec3(-gm * (1.0 - h), 0.6 + h));
  vec3 nv = normalize((viewMatrix * vec4(normalize(mat3(uMdl) * n), 0.0)).xyz);
  vec4 vp = viewMatrix * vec4(vW, 1.0);
  float id = top == 0 ? 31.0 : top == 1 ? 37.0 : top == 2 ? 30.0 : top == 3 ? 38.0 : 29.0;
  if (top == 0) { vec3 Lc = (uInv * vec4(uDenB, 1.0)).xyz; vec2 dL = normalize(veTranh(Lc.xy) - p); if (hPhan(0, p + dL * 0.024) > 0.0) id = 36.0; }
  if (top == 3) { float t; cDau(p, t); if (t < 0.0) id = 39.0; if (hMat(p, px * 1.6) > -0.5 && hMat(p, px * 1.6) != 1.0) id = 28.0; }
  gl_FragColor = vec4(nv.xy * 0.5 + 0.5, -vp.z, id + (uId - 31.0));
}`;

const TAU = Math.PI * 2;
function buou(t) {
  const { QUAT, QUAT_D } = MEO3; const n = Math.floor(t / QUAT), k = t - n * QUAT;
  const b = k < QUAT_D ? Math.sin(Math.PI * k / QUAT_D) ** 2 : 0;
  const tichK = k < QUAT_D ? k / 2 - QUAT_D / (4 * Math.PI) * Math.sin(2 * Math.PI * k / QUAT_D) : QUAT_D / 2;
  return { b, B: n * QUAT_D / 2 + tichK };
}
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ELIP = (() => {
  const cx = -0.014, cy = 0.004, a = 0.147, b = 0.107, t0 = 3.35, t1 = 5.45;
  const diem = (th) => [cx + a * Math.cos(th), cy + b * Math.sin(th)];
  let L = 0; for (let i = 0; i < 200; i++) { const p0 = diem(t0 + (t1 - t0) * i / 200), p1 = diem(t0 + (t1 - t0) * (i + 1) / 200); L += Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); }
  const ang = (u) => { const th = t0 + (t1 - t0) * u; return Math.atan2(b * Math.cos(th), -a * Math.sin(th)) + 1.25 * sm(0.66, 1, u); };
  return { goc: diem(t0), ang, DL: L / 14 };
})();
export function duoiAt(t, out) {
  const { ND, CHU, LAG } = MEO3;
  const w0 = TAU / CHU * 0.8, { b, B } = buou(t + 3.0);
  const phi = w0 * t + w0 * 0.9 * B;
  out = out || Array.from({ length: ND + 1 }, () => new THREE.Vector3());
  let x = ELIP.goc[0], y = ELIP.goc[1];
  out[0].set(x, y, 0);
  for (let i = 0; i < ND; i++) {
    const u = i / (ND - 1);
    const wi = Math.max(0, u - 0.45) / 0.55;
    let a = ELIP.ang(u) + 0.11 * wi * wi * Math.sin(phi - LAG * i) * (1 + 0.6 * b);
    if (i >= ND - 4) a += 0.42 * b * ((i - (ND - 5)) / 4);
    x += ELIP.DL * Math.cos(a); y += ELIP.DL * Math.sin(a);
    out[i + 1].set(x, y, 0);
  }
  return out;
}
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function giat(t, T, lech) { const n = Math.floor((t + lech) / T), k = (t + lech) - n * T - hash(n + lech) * (T - 0.6); return k > 0 && k < 0.5 ? Math.sin(Math.PI * k / 0.5) * (k < 0.16 ? 1 : 0.6) : 0; }

export function taoMeo3({ CHUNG, shared, low }) {
  const J = Array.from({ length: 15 }, () => new THREE.Vector3());
  const u = {
    uJ: { value: J }, uDuoiR: { value: new THREE.Vector2(0.0195, 0.0085) }, uC3: { value: new THREE.Vector4() },
    uInv: { value: new THREE.Matrix4() }, uMdl: { value: new THREE.Matrix4() }, uS: { value: 1 },
    uCuaW: { value: new THREE.Vector3(0.66, 1.1, -15) }, uCuaSang: { value: 1 }, uGo: { value: new THREE.Vector2(-0.2, 0.1) }, uBongDen: { value: 0 },
    uTo: { value: new THREE.Vector4(0.026, 0.004, 0.04, 0) }, uR2: { value: new THREE.Vector2(1, 0) },
    uKiem: { value: 0 },
    uMeoBau: { value: 0 }, uBauR: { value: new THREE.Vector4() }, uLat: { value: 1 },
    uBuoc: { value: low ? 60 : 88 },
  };
  const geo = new THREE.PlaneGeometry(2 * HOP, 2 * HOP); geo.translate(0, 0, 0.002);
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG(CHUNG), uniforms: { ...shared, ...u }, side: THREE.DoubleSide, depthTest: false, depthWrite: false });
  mat.extensions = { derivatives: true };
  const mesh = new THREE.Mesh(geo, mat); mesh.name = 'meo'; mesh.renderOrder = 2; mesh.frustumCulled = false;
  const matGB = (id) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG_GB(CHUNG), uniforms: { ...shared, ...u, uId: { value: id } }, side: THREE.DoubleSide, depthTest: false, depthWrite: false });

  const _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4();
  let datCu = null, xoay = [1, 0];
  let bau = null;
  function apBau() {
    const { goc, k } = bau;
    _bx.set(0, 0, -1); _by.set(-1, 0, 0);
    _m.makeBasis(_bx, _by, _bz).scale(new THREE.Vector3(k, k, k)).setPosition(goc[0], goc[1], goc[2]);
    mesh.matrixAutoUpdate = false; mesh.matrix.copy(_m); mesh.matrixWorldNeedsUpdate = true; mesh.updateMatrixWorld(true);
    u.uMdl.value.copy(mesh.matrixWorld); u.uInv.value.copy(mesh.matrixWorld).invert(); u.uS.value = k;
    u.uGo.value.set(-9, 9);
  }
  function datBau(goc, k, r, nguon, lat = 1) {
    bau = { goc, k }; datCu = null; u.uLat.value = lat < 0 ? -1 : 1;
    u.uMeoBau.value = 1; u.uBauR.value.set(r[0], r[1], r[2], r[3]);
    if (nguon) u.uCuaW.value.copy(nguon);
    apBau();
  }
  function apDung() {
    if (bau) { apBau(); return; }
    if (!datCu) return;
    const [goc, dau, lung, s, yT] = datCu;
    const y0 = yT[0] - 0.03 / s, y1 = yT[1];
    _bx.set(...dau).normalize(); _by.set(...lung).normalize();
    const g = new THREE.Vector3(...goc).addScaledVector(_by, (y0 + y1) / 2 * s);
    const rong = (y1 - y0) * s;
    g.addScaledVector(_by, self.lech || 0);
    const ngang = Math.abs(xoay[1]) * 0.38 + Math.abs(xoay[0]) * 0.25;
    const k = Math.min(s * K, (rong - 0.025) / ngang);
    _m.makeBasis(_bx, _by, _bz).scale(new THREE.Vector3(k, k, k)).setPosition(g);
    mesh.matrixAutoUpdate = false; mesh.matrix.copy(_m); mesh.matrixWorldNeedsUpdate = true; mesh.updateMatrixWorld(true);
    u.uMdl.value.copy(mesh.matrixWorld); u.uInv.value.copy(mesh.matrixWorld).invert(); u.uS.value = k;
    const nua = rong / 2 / k, l = (self.lech || 0) / k; u.uGo.value.set(-nua - l, nua - l);
  }
  function dat(goc, dau, lung, s, cuaW, yT) {
    datCu = [goc, dau, lung, s, yT]; bau = null; u.uMeoBau.value = 0; u.uLat.value = 1;
    if (cuaW) u.uCuaW.value.copy(cuaW);
    apDung();
  }
  const _r = new THREE.Vector3(), _q = new THREE.Vector3();
  const _mInv = new THREE.Matrix4();
  let coMay = false;
  function datMay(cam) { coMay = true; theoMay(cam); }
  function theoMay(cam) {
    cam.updateMatrixWorld();
    _mInv.copy(u.uInv.value).setPosition(0, 0, 0);
    _r.setFromMatrixColumn(cam.matrixWorld, 0).applyMatrix4(_mInv);
    const l = Math.hypot(_r.x, _r.y) || 1, nx = _r.x / l, ny = _r.y / l;
    if (Math.abs(nx - xoay[0]) + Math.abs(ny - xoay[1]) > 1e-3) { xoay = [nx, ny]; u.uR2.value.set(nx, ny); apDung(); }
  }
  mesh.onBeforeRender = (r, sc, cam) => { if (!coMay && cam.isPerspectiveCamera && !cam.isArrayCamera) theoMay(cam); };

  const self = {
    mesh, u, dat, datBau, datMay, matGB,
    sangCua: nhapAt,
    lacThu: false,
  };
  const cuaGoc = new THREE.Vector3();
  function capNhat(t0, cham = 1) {
    const t = t0 * cham;
    if (self.lacThu) {
      if (!cuaGoc.lengthSq()) cuaGoc.set(u.uCuaW.value.x, u.uCuaW.value.y, u.uCuaW.value.z);
      const bd = 0.22 + 0.1 * Math.sin(t * 0.37);
      u.uCuaW.value.set(cuaGoc.x + bd * Math.sin(t * TAU / 3.4), cuaGoc.y, cuaGoc.z + 0.5 * bd * Math.sin(t * TAU / 3.4 + 0.6));
    }
    let mo = 0;
    if (cham >= 1) for (let dt = 0; dt <= 3.4; dt += 0.04) if (self.sangCua(t - dt) < 0.95) mo = Math.max(mo, sm(0.3, 0.9, dt) * (1 - sm(2.5, 3.1, dt)));
    u.uC3.value.set(Math.sin(t * TAU / 4.4), giat(t, 8.6, 0.7), giat(t, 12.3, 5.1), mo);
    duoiAt(t, J);
  }
  capNhat(0);
  const _v = new THREE.Vector3();
  function diem(x, y, z) { const [c, s] = xoay; x *= u.uLat.value; return _v.set(x * c - y * s, x * s + y * c, z).applyMatrix4(mesh.matrixWorld).clone(); }
  function hop() { const ds = []; for (const x of [-0.165, 0.19]) for (const y of [-0.135, 0.11]) ds.push(diem(x, y, 0.06)); return ds; }
  const dau = () => diem(0.104, -0.006, 0.08);
  return Object.assign(self, { capNhat, diem, hop, dau });
}
