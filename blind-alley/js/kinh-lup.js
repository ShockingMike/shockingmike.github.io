import * as THREE from 'three';
import { C, HEX } from './npr.js';
import { CHU } from './chu.js';

const QUAD_V = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const GBUF_V = `
varying vec3 vN; varying float vZ; varying vec3 vW;
void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; vec4 vp = modelViewMatrix * vec4(position, 1.0); vZ = -vp.z; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * vp; }`;
const GBUF_F = `
varying vec3 vN; varying float vZ; varying vec3 vW; uniform float uId, uDa; uniform vec3 uDauC, uDauU;
void main() { vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 rel = vW - uDauC;
  float tay = (uDa > 0.5 && (length(rel) > 0.15 || dot(rel, uDauU) < -0.11)) ? 0.25 : 0.0;
  gl_FragColor = vec4(n.xy * 0.5 + 0.5, vZ, uId + tay); }`;

const VUNG_GB = `
uniform vec4 uPud[4]; uniform int uNPud;
float hashV(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float n2V(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hashV(vec3(i, 1.0)), b = hashV(vec3(i + vec2(1, 0), 1.0)), c = hashV(vec3(i + vec2(0, 1), 1.0)), d = hashV(vec3(i + vec2(1, 1), 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
float vungV(vec2 p) { float m = -1.0;
  for (int i = 0; i < 4; i++) { if (i >= uNPud) break; vec4 q = uPud[i]; vec2 d = (p - q.xy) / q.zw;
    m = max(m, 1.0 - length(d) + (n2V(p * 1.6 + float(i) * 7.0) - 0.5) * 0.36 + (n2V(p * 5.0 + 3.0) - 0.5) * 0.1); }
  return m; }
bool ngoaiVung(vec3 w) { vec3 rd = w - cameraPosition; if (rd.y > -1e-5) return false; vec2 g = cameraPosition.xz + rd.xz * (-cameraPosition.y / rd.y); return vungV(g) < 0.0; }`;
const GBUF_F_VUNG = GBUF_F.replace('void main() {', VUNG_GB + '\nvoid main() { if (ngoaiVung(vW)) discard;');
export const VUNG_GB_GLSL = VUNG_GB;

const CHI_F = `
varying vec2 vUv;
uniform sampler2D uG; uniform vec2 uPx;
uniform vec2 uC, uRes; uniform float uR, uMag, uDpr, uIdDau, uIdMu;
uniform float uAo[5];
float laAo(float w) { float r = 0.0; for (int i = 0; i < 5; i++) r = max(r, step(abs(w - uAo[i]), 0.3)); return r; }
uniform vec3 cGiay, cDo, cHong, cDem, cSang, cMuc, uLv;
float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
vec4 G(vec2 uv) { return texture2D(uG, uv); }
vec3 nOf(vec4 g) { vec3 n = vec3(g.xy * 2.0 - 1.0, 0.0); n.z = sqrt(max(0.0, 1.0 - dot(n.xy, n.xy))); return n; }
vec3 canh(vec2 uv, float k) {
  vec4 c = G(uv); vec3 n1 = nOf(c);
  vec3 e = vec3(0.0);
  float tayC = step(0.1, fract(c.w + 0.01));
  vec2 nguong = mix(vec2(0.03, 0.06), vec2(0.12, 0.22), tayC);
  vec2 o[4]; o[0] = vec2(k, 0.0); o[1] = vec2(-k, 0.0); o[2] = vec2(0.0, k); o[3] = vec2(0.0, -k);
  for (int i = 0; i < 4; i++) {
    vec4 s = G(uv + o[i] * uPx);
    float dz = abs(s.z - c.z) / max(min(s.z, c.z), 0.05);
    float tayS = max(tayC, step(0.1, fract(s.w + 0.01)));
    float sau = step(9.5, max(s.w, c.w));
    tayS = max(tayS, laAo(c.w) * laAo(s.w) * step(0.5, abs(s.w - c.w)));
    e.x = max(e.x, max(smoothstep(nguong.x, nguong.y, dz), step(0.5, abs(s.w - c.w))) * mix(1.0, 0.45, tayS * (1.0 - sau) * (1.0 - step(abs(s.w - 9.0), 0.5)) * (1.0 - step(abs(c.w - 9.0), 0.5))));
    float d = dot(n1, nOf(s));
    e.y = max(e.y, smoothstep(0.7, 0.5, d));
    e.z = max(e.z, smoothstep(0.95, 0.88, d) * step(abs(c.w - uIdDau), 0.2) * step(abs(s.w - uIdDau), 0.2));
  }
  float tay = step(0.1, fract(c.w + 0.01)) + step(abs(c.w - 9.0), 0.5);
  e.y *= 1.0 - min(tay, 1.0);
  e.y *= step(abs(c.w - uIdMu), 0.5);
  e.z *= 1.0 - min(tay, 1.0);
  return e;
}
void main() {
  vec2 P = uC + vec2(vUv.x - 0.5, 0.5 - vUv.y) * 2.0 * uR / uMag;
  float px = uDpr;
  float tooth = h21(floor(P)), fib = vn(vec2(P.x * 0.03, P.y * 0.9));
  vec3 col = cDem + (tooth - 0.5) * (8.0 / 255.0) - smoothstep(0.62, 0.9, fib) * (7.0 / 255.0);
  vec4 g = G(vUv);
  bool co = g.w > 0.5;
  if (co) {
    float lam = dot(nOf(g), uLv);
    float id = g.w;
    float doi = (abs(id - 10.0) < 0.5 || abs(id - 20.0) < 0.5 || abs(id - 21.0) < 0.5 || id > 39.5) ? 0.0 : 1.0;
    float hongV = (abs(id - 22.0) < 0.5 || abs(id - 11.0) < 0.5) ? 1.0 : 0.0;
    float sang = doi * (1.0 - hongV) * smoothstep(0.2, 0.55, lam);
    float toi = doi * (1.0 - hongV) * (1.0 - smoothstep(-0.15, 0.2, lam));
    float cs = 64.0;
    float rowC = floor(P.y / cs);
    vec2 cc = floor(vec2(P.x / cs + h21(vec2(rowC, 9.0)), rowC));
    float ra = h21(cc), rb = h21(cc + 17.0), rc = h21(cc + 31.0);
    float a = 0.95 + (ra - 0.5) * 0.55;
    vec2 dir = vec2(cos(a), sin(a)), per = vec2(-dir.y, dir.x);
    float sp = 5.0 + 3.0 * rb;
    float s = dot(P, per) / sp;
    float row = floor(s), hl = abs(fract(s) - 0.5);
    float along = dot(P, dir) + h21(vec2(row, cc.x)) * 40.0;
    float doan = step(0.3 + 0.2 * rc, fract(along / (26.0 + 30.0 * h21(vec2(row, cc.y + 4.0)))));
    float w = 0.08 + 0.08 * vn(vec2(along * 0.06, row * 1.3));
    float hatch = step(hl, w) * doan;
    float giay = step(0.7, h21(vec2(row, cc.x + 3.0))) * smoothstep(0.55, 0.75, lam);
    col = mix(col, mix(cSang, cGiay, giay), hatch * step(0.5, sang * (0.7 + 0.6 * tooth)));
    col = mix(col, cHong, hatch * step(0.5, hongV) * step(0.55, rc));
    float a2 = a + 1.2 + (rc - 0.5) * 0.4;
    vec2 dir2 = vec2(cos(a2), sin(a2)), per2 = vec2(-dir2.y, dir2.x);
    float s2 = dot(P, per2) / (sp * 1.35);
    float hl2 = abs(fract(s2) - 0.5);
    float doan2 = step(0.35, fract((dot(P, dir2) + h21(vec2(floor(s2), cc.y)) * 30.0) / (22.0 + 26.0 * rb)));
    col = mix(col, cMuc, step(hl2, 0.13) * doan2 * step(0.5, toi));
  }
  // nét chì đỏ phác: ba lượt lệch theo ba trường nhiễu, có chỗ nhấc bút
  vec2 d1 = (vec2(vn(P * 0.045), vn(P * 0.045 + 17.3)) - 0.5) * 5.0 * px;
  vec2 d2 = (vec2(vn(P * 0.03 + 41.0), vn(P * 0.03 + 7.7)) - 0.5) * 7.0 * px;
  vec2 d3 = (vec2(vn(P * 0.06 + 3.3), vn(P * 0.06 + 61.0)) - 0.5) * 4.0 * px;
  float lift = smoothstep(0.25, 0.45, vn(P * 0.02 + 9.0));
  vec3 e1 = canh(vUv + d1 * uPx, 1.4 * px), e2 = canh(vUv + d2 * uPx, 1.6 * px), e3 = canh(vUv + d3 * uPx, 1.2 * px);
  float moiTr = (abs(g.w - 10.0) < 0.5 || abs(g.w - 20.0) < 0.5 || abs(g.w - 21.0) < 0.5 || abs(g.w - 22.0) < 0.5 || g.w > 39.5 || g.w < 0.5) ? 1.0 : 0.0;
  float red = max(e1.x, e2.x * 0.7) * lift * moiTr;
  col = mix(col, cDo, red * (0.5 + 0.4 * tooth));
  float luc = vn(P * 0.025 + 31.0);
  float k = (0.9 + 1.3 * luc) * px;
  vec3 e = canh(vUv, k), eT = canh(vUv, 1.2 * px);
  float ink = max(e.x * smoothstep(0.12, 0.35, luc + 0.25), max(eT.y * 0.85, eT.z * 0.95));
  vec3 eM = canh(vUv, 2.4 * px);
  ink = max(ink, eM.x * step(abs(g.w - uIdMu), 0.5));
  col = mix(col, cGiay, ink * 0.92);
  gl_FragColor = vec4(col, 1.0);
}`;

function chiPho(src) {
  const r = (a, b) => { if (!src.includes(a)) throw new Error('CHI_F đổi — sửa chiPho: ' + a.slice(0, 40)); src = src.replace(a, b); };
  r('vec4 G(vec2 uv) { return texture2D(uG, uv); }', `vec4 G(vec2 uv) { return texture2D(uG, uv); }
uniform vec4 uSach[8];
uniform vec4 uNuoc, uChan; uniform float uTq;
float khoD(float w) { return max(step(abs(w - 20.0), 0.5), step(abs(w - 34.0), 0.5)); }
float laBo(float a, float b) { return min(1.0, khoD(a) * max(step(abs(b - 21.0), 0.5), step(39.5, b)) + khoD(b) * max(step(abs(a - 21.0), 0.5), step(39.5, a))); }
float laVan(float a, float b) { return max(max(step(32.5, a) * step(a, 35.5), step(32.5, b) * step(b, 35.5)), laBo(a, b)); }
float nuocW(float w) { return max(step(39.5, w), step(abs(w - 21.0), 0.5)); }
float laBong(float a, float b) { return nuocW(a) * nuocW(b); }
uniform float uIdNho[3];
float laNho(float w) { float r = 0.0; for (int i = 0; i < 3; i++) r = max(r, step(abs(w - uIdNho[i]), 0.5)); return r; }
float laNguoi(float w) { return (w > 0.5 && w < 8.5) || (w > 11.5 && w < 19.5) || (w > 23.5 && w < 29.5) ? 1.0 : 0.0; }
uniform float uIdGot;
float laGot(float w) { return step(abs(w - uIdGot), 0.5); }
float laGang(float w) { return step(abs(w - uIdNho[2]), 0.5); }
float lopBong(float w) { return w < 39.5 ? 0.0 : (w < 59.5 ? 1.0 : (w < 60.5 ? 2.0 : (w < 61.5 ? 3.0 : 4.0))); }`);
  r('max(smoothstep(nguong.x, nguong.y, dz), step(0.5, abs(s.w - c.w)))', 'max(smoothstep(nguong.x, nguong.y, dz), step(0.5, abs(s.w - c.w)) * (1.0 - laVan(s.w, c.w)) * (1.0 - laNho(s.w) * laNho(c.w))) * (1.0 - laBong(s.w, c.w)) * (1.0 - max(laGot(s.w), laGot(c.w))) * (1.0 - laBo(s.w, c.w))');
  r('  float k = (0.9 + 1.3 * luc) * px;', '  float k = (0.9 + 1.3 * luc * (1.0 - laNho(g.w))) * px;');
  r('|| abs(g.w - 22.0) < 0.5 || g.w > 39.5 || g.w < 0.5) ? 1.0 : 0.0;', '|| abs(g.w - 22.0) < 0.5 || g.w < 0.5) ? 1.0 : 0.0;');
  r('|| abs(g.w - 20.0) < 0.5 || abs(g.w - 21.0) < 0.5 || abs(g.w - 22.0) < 0.5 || g.w < 0.5) ? 1.0 : 0.0;', '|| abs(g.w - 20.0) < 0.5 || abs(g.w - 22.0) < 0.5 || g.w < 0.5) ? 1.0 : 0.0;');
  r('  e.y *= step(abs(c.w - uIdMu), 0.5);', '  e.y *= max(step(abs(c.w - uIdMu), 0.5), laGang(c.w) * laGang(G(uv + vec2(k, 0.0) * uPx).w) * laGang(G(uv - vec2(k, 0.0) * uPx).w));');
  r('float doi = (abs(id - 10.0) < 0.5 || abs(id - 20.0) < 0.5 || abs(id - 21.0) < 0.5 || id > 39.5) ? 0.0 : 1.0;',
    'float doi = (abs(id - 10.0) < 0.5 || abs(id - 20.0) < 0.5 || abs(id - 21.0) < 0.5 || id > 39.5 || (id > 32.5 && id < 35.5) || laNho(id) > 0.5 || laGot(id) > 0.5) ? 0.0 : 1.0;');
  r('  // nét chì đỏ phác: ba lượt lệch theo ba trường nhiễu', `  float van = 0.0;
  { vec2 o4[4]; o4[0] = vec2(px, 0.0); o4[1] = vec2(-px, 0.0); o4[2] = vec2(0.0, px); o4[3] = vec2(0.0, -px);
    for (int i = 0; i < 4; i++) { vec4 s = G(vUv + o4[i] * uPx); van = max(van, laVan(s.w, g.w) * step(0.5, abs(s.w - g.w))); } }
  van *= step(0.3, vn(P * 0.05 + 23.0)) * (0.55 + 0.45 * tooth);
  col = mix(col, cSang, van * 0.9);
  { vec2 dm = normalize(vec2(-0.34, 1.0)), pm = vec2(dm.y, -dm.x);
    float cot = floor(dot(P, pm) / 9.0), rnd = h21(vec2(cot, 5.0));
    float doc = dot(P, dm) + rnd * 300.0, dai = 18.0 + 22.0 * h21(vec2(cot, 9.0));
    float net = step(0.8, rnd) * step(fract(doc / (dai * 3.2)), 0.31) * step(abs(fract(dot(P, pm) / 9.0) - 0.5), 0.07 + 0.04 * h21(vec2(cot, 2.0)));
    col = mix(col, cSang, net * 0.75 * (1.0 - step(0.5, float(co) * max(1.0 - step(9.5, g.w), laNguoi(g.w)))));
  }
  // nét chì đỏ phác: ba lượt lệch theo ba trường nhiễu`);
  r('  col = mix(col, cGiay, ink * 0.92);\n  gl_FragColor = vec4(col, 1.0);', `  col = mix(col, cGiay, ink * 0.92);
  col = mix(col, cGiay, laGot(g.w) * 0.92);
  float trongNuoc = max(step(20.5, g.w) * step(g.w, 21.5), step(39.5, g.w));
  if (trongNuoc > 0.5) {
    vec2 kG = vec2(uMag / (2.0 * uR), -uMag / (2.0 * uR));
    #define LOP(q) lopBong(G(vec2(0.5) + ((q) - uC) * kG).w)
    float RH = 3.6, ri = floor(P.y / RH), hr = h21(vec2(ri, 3.0)), d4 = floor(ri / 4.0);
    float song = sin(ri * 0.55 + uTq * 0.8) * 1.5 + (h21(vec2(d4, 7.0)) - 0.5) * 5.0 + (hr - 0.5) * 1.6;
    float xs = P.x + song, yr = (ri + 0.5) * RH;
    float lc = LOP(vec2(xs, yr));
    float chuKy = 16.0 + 40.0 * h21(vec2(ri, 21.0));
    float sx = (xs + 97.0 * h21(vec2(ri, 22.0))) / chuKy, ce = floor(sx), fx = fract(sx);
    float dai = 0.42 + 0.5 * h21(vec2(ce, ri + 23.0));
    float coNet = step(fx, dai);
    float laNg = step(0.5, lc) * step(lc, 1.5), laCua = step(1.5, lc) * step(lc, 2.5);
    float bienN = 0.0;
    if (laNg > 0.5) { float w0 = G(vec2(0.5) + (vec2(xs, yr) - uC) * kG).w;
      for (int k = -1; k <= 1; k += 2) { float w1 = G(vec2(0.5) + (vec2(xs, yr + float(k) * RH) - uC) * kG).w; bienN = max(bienN, step(0.5, abs(w1 - w0))); } }
    coNet = max(coNet, bienN * step(0.12, fract(xs / 47.0 + hr)));
    float thon = mix(smoothstep(0.0, 0.18, fx) * smoothstep(dai, dai - 0.18, fx), 1.0, bienN);
    float yc = yr + sin(P.x * 0.07 + hr * 6.28) * 0.5;
    float net = coNet * (1.0 - smoothstep(0.2 + 0.45 * thon, 0.75 + 0.45 * thon, abs(P.y - yc)));
    float dE = 99.0, phanE = 0.0;
    if (laNg > 0.5) {
      float w0 = G(vec2(0.5) + (vec2(xs, yr) - uC) * kG).w;
      for (int k = 1; k <= 5; k++) { float o = float(k) * 1.5;
        for (int s = -1; s <= 1; s += 2) { float w1 = G(vec2(0.5) + (vec2(xs + float(s) * o, yr) - uC) * kG).w;
          if (abs(w1 - w0) > 0.5 && dE > 90.0) { dE = o; phanE = step(40.5, w1) * step(w1, 59.5); } } }
    }
    float EB = 4.5 + 3.0 * h21(vec2(ri, 51.0));
    float ycN = yr + sin(P.x * 0.07 + hr * 6.28) * 0.5;
    float dayM = mix(1.05, 0.5, clamp(dE / EB, 0.0, 1.0));
    float netM = step(dE, EB) * step(0.1, h21(vec2(ri, 52.0))) * (1.0 - smoothstep(dayM, dayM + 0.45, abs(P.y - ycN)));
    float netN = bienN * step(0.1, fract(xs / 47.0 + hr)) * (1.0 - smoothstep(0.85, 1.3, abs(P.y - ycN)));
    float daiL = 0.3 + 0.35 * h21(vec2(ce, ri + 23.0)), thonL = smoothstep(0.0, 0.18, fx) * smoothstep(daiL, daiL - 0.18, fx);
    float netL = step(mod(ri, 3.0), 0.5) * step(fx, daiL) * (1.0 - smoothstep(0.25 + 0.35 * thonL, 0.7 + 0.35 * thonL, abs(P.y - ycN)));
    col = mix(col, mix(cSang, cGiay, 0.15), laNg * netL * 0.7);
    col = mix(col, mix(cSang, cGiay, 0.55), laNg * netN * 0.92);
    col = mix(col, mix(mix(cSang, cGiay, 0.62), mix(cSang, cGiay, 0.4), phanE), laNg * netM * 0.95);
    col = mix(col, mix(cDem, cHong, 0.5), laCua * step(2.5, mod(ri, 3.0)) * step(0.35, h21(vec2(ri, 13.0))) * net * 0.75);
    float hangN = step(0.7, h21(vec2(ri, 11.0)));
    col = mix(col, cSang, (1.0 - step(0.5, lc)) * hangN * step(fract((xs + 53.0 * hr) / (40.0 + 50.0 * hr)), 0.62) * (1.0 - smoothstep(0.3, 0.9, abs(P.y - yc))) * 0.7);
    { float dB = floor(P.y / 7.0), xb = P.x + (h21(vec2(dB, 31.0)) - 0.5) * 4.0 + sin(dB * 1.7 + uTq * 0.6) * 0.8;
      float lb = LOP(vec2(xb, P.y)), khe = step(fract(P.y / 7.0), 0.13);
      col = mix(col, mix(cDem, cHong, 0.72), step(3.5, lb) * (1.0 - khe) * 0.85);
      float mepB = 0.0; for (int k = -1; k <= 1; k += 2) { float l2 = LOP(vec2(xb + float(k) * 1.2, P.y)), l3 = LOP(vec2(xb, P.y + float(k) * 1.2));
        mepB = max(mepB, step(2.5, max(lb, max(l2, l3))) * max(step(0.5, abs(l2 - lb)), step(0.5, abs(l3 - lb))) * (1.0 - step(3.5, max(lb, max(l2, l3))))); }
      col = mix(col, cSang, mepB * (1.0 - khe) * 0.8); }
    { vec2 oG = floor(P / vec2(110.0, 70.0)); float hg = h21(oG + 41.0);
      if (hg > 0.5) {
        vec2 cG = (oG + vec2(0.2 + 0.6 * h21(oG + 42.0), 0.3 + 0.4 * h21(oG + 43.0))) * vec2(110.0, 70.0);
        float ph = fract(uTq * 0.22 + h21(oG + 44.0)), rx = 10.0 + 26.0 * ph;
        vec2 dG = (P - cG) / vec2(rx, rx * 0.32); float rG = length(dG);
        float vongE = (1.0 - smoothstep(0.6, 1.25, abs(rG - 1.0) * rx * 0.32)) * step(0.3, fract(atan(dG.y, dG.x) * 1.3 + hg * 5.0));
        col = mix(col, mix(cSang, cGiay, 0.25), vongE * (1.0 - ph) * 0.9 * (1.0 - laNg));
      } }
  }
  {
    vec2 A = uNuoc.xy, Bv = uNuoc.zw, ab = Bv - A;
    float dN = abs((P.x - A.x) * ab.y - (P.y - A.y) * ab.x) / max(length(ab), 1.0);
    float run = (vn(P * 0.04 + 5.0) - 0.5) * 1.2;
    float moiTr2 = (abs(g.w - 10.0) < 0.5 || abs(g.w - 20.0) < 0.5 || abs(g.w - 21.0) < 0.5 || abs(g.w - 22.0) < 0.5 || (g.w > 32.5 && g.w < 35.5) || g.w > 39.5) ? 1.0 : 0.0;
    float nN = (1.0 - smoothstep(0.7, 1.3, abs(dN - run))) * moiTr2 * step(0.18, vn(P * 0.03 + 2.0));
    float nC = 0.0;
    if (uChan.w > 0.5 && abs(P.y - uChan.z) < 9.0) {
      vec2 kG2 = vec2(uMag / (2.0 * uR), -uMag / (2.0 * uR));
      for (int k = -2; k <= 2; k++) {
        vec2 q = P + vec2(float(k) * 3.5, 0.0);
        float tr = laNguoi(G(vec2(0.5) + (q - vec2(0.0, 1.4) - uC) * kG2).w), wd = G(vec2(0.5) + (q + vec2(0.0, 1.4) - uC) * kG2).w, du = step(40.5, wd) * step(wd, 59.5);
        nC = max(nC, tr * du);
      }
    }
    col = mix(col, cGiay, max(nN, nC) * 0.9);
  }
  float sach = 0.0;
  for (int i = 0; i < 8; i++) { vec4 q = uSach[i]; vec2 dd = max(vec2(q.x - 8.0, q.y - 8.0) - P, P - vec2(q.z + 8.0, q.w + 8.0)); sach = max(sach, 1.0 - smoothstep(0.0, 6.0, max(dd.x, dd.y))); }
  col = mix(col, cDem + (tooth - 0.5) * (8.0 / 255.0) - smoothstep(0.62, 0.9, fib) * (7.0 / 255.0), sach);
  gl_FragColor = vec4(col, 1.0);`);
  return src;
}
const CHI_F_PHO = chiPho(CHI_F);
function chiHam(src) {
  const r = (a, b) => { if (!src.includes(a)) throw new Error('CHI_F đổi — sửa chiHam: ' + a.slice(0, 40)); src = src.replace(a, b); };
  r('vec4 G(vec2 uv) { return texture2D(uG, uv); }', `vec4 G(vec2 uv) { return texture2D(uG, uv); }
uniform vec4 uSach[8];
uniform vec2 uNgoi;
float sdSegH(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float muaUv(vec2 uv, vec2 n, vec2 d, float L, vec2 lo, vec2 hi, float seed) {
  float w = 1.4 * max(length(fwidth(uv)), 1e-4);
  vec2 q = uv * n; float hang = floor(q.y); q.x += 0.5 * mod(hang, 2.0); vec2 o = floor(q);
  float m = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    vec2 c = o + vec2(float(i), float(j));
    vec2 jt = vec2(h21(c + seed), h21(c + seed + 7.3)) - 0.5;
    vec2 a = (c + 0.5 + jt * 0.5) / n; a.x -= 0.5 * mod(c.y, 2.0) / n.x;
    if (a.x < lo.x || a.y < lo.y || a.x > hi.x || a.y > hi.y || h21(c + seed + 3.1) < 0.12) continue;
    m = max(m, 1.0 - smoothstep(w * 0.5, w, sdSegH(uv, a, a + d * L)));
  }
  return m;
}`);
  r(`    float doi = (abs(id - 10.0) < 0.5 || abs(id - 20.0) < 0.5 || abs(id - 21.0) < 0.5 || id > 39.5) ? 0.0 : 1.0;
    float hongV = (abs(id - 22.0) < 0.5 || abs(id - 11.0) < 0.5) ? 1.0 : 0.0;
    float sang = doi * (1.0 - hongV) * smoothstep(0.2, 0.55, lam);
    float toi = doi * (1.0 - hongV) * (1.0 - smoothstep(-0.15, 0.2, lam));`, `    float doi = (id > 39.5 || abs(id - 9.0) < 0.5) ? 0.0 : 1.0;
    float hongV = 0.0;
    float sang = 0.0;
    float toi = doi * (1.0 - smoothstep(-0.5, -0.25, lam));`);
  r(`    col = mix(col, cMuc, step(hl2, 0.13) * doan2 * step(0.5, toi));`, `    float s2b = dot(P, per2) / (sp * 2.6), hl2b = abs(fract(s2b) - 0.5);
    vec2 per3 = vec2(-per2.y, per2.x); float s3 = dot(P, per3) / (sp * 2.6), hl3 = abs(fract(s3) - 0.5);
    float doan3 = step(0.3, fract((dot(P, per2) + h21(vec2(floor(s3), cc.x)) * 30.0) / (26.0 + 22.0 * rc)));
    col = mix(col, cMuc, max(step(hl2b, 0.1) * doan2, step(hl3, 0.1) * doan3) * step(0.5, toi));`);
  r(`  // nét chì đỏ phác: ba lượt lệch theo ba trường nhiễu, có chỗ nhấc bút`, `  if (abs(g.w - 48.0) < 0.5) {
    vec2 d = normalize(vec2(0.163, 0.987));
    float m = muaUv(g.xy, vec2(9.0, 7.0), d, 0.075, vec2(0.03, 0.06), vec2(uNgoi.x - 0.04, 0.9), 5.0);
    m = max(m, 1.0 - smoothstep(0.5, 1.0, sdSegH(g.xy, uNgoi - d * 0.06, uNgoi) / (1.6 * max(length(fwidth(g.xy)), 1e-4))));
    col = mix(col, cGiay, m * 0.92);
  }
  if (g.w > 49.5 && g.w < 52.5) col = mix(col, cGiay, muaUv(g.xy, vec2(5.0, 4.0), normalize(vec2(-0.172, -1.0)), 0.16, vec2(0.04), vec2(0.96), g.w) * 0.85);
  // nét chì đỏ phác: ba lượt lệch theo ba trường nhiễu, có chỗ nhấc bút`);
  return src;
}
const CHI_F_HAM = chiHam(CHI_F);

const CHI_F_LAT = `
varying vec2 vUv;
uniform sampler2D uG; uniform vec2 uPx;
uniform vec2 uC, uRes; uniform float uR, uMag, uDpr, uTq;
uniform vec3 cGiay, cDo, cHong, cDem, cSang, cMuc;
uniform vec4 uSach[8];
float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
vec4 G(vec2 uv) { return texture2D(uG, uv); }
bool laPhim(float w) { return w > 8.5 && w < 35.5; }
float tAt(vec2 uv) { vec4 s = G(uv); return laPhim(s.w) && s.z < 1.5 ? s.z : -1.0; }
void main() {
  vec2 P = uC + vec2(vUv.x - 0.5, 0.5 - vUv.y) * 2.0 * uR / uMag;
  float px = uDpr;
  float tooth = h21(floor(P)), fib = vn(vec2(P.x * 0.03, P.y * 0.9));
  vec3 giay = cDem + (tooth - 0.5) * (8.0 / 255.0) - smoothstep(0.62, 0.9, fib) * (7.0 / 255.0);
  vec3 col = giay;
  vec4 g = G(vUv);
  float id = g.w;
  bool phim = laPhim(id);
  vec2 m = g.xy * 20.0;
  vec4 gA = G(vUv + vec2(uPx.x, 0.0)), gB = G(vUv + vec2(0.0, uPx.y));
  float mmPx = max(length(gA.xy - g.xy), length(gB.xy - g.xy)) * 20.0;
  if (abs(gA.w - id) > 0.5 || abs(gB.w - id) > 0.5 || mmPx < 1e-5) mmPx = 0.03;
  float luc = vn(P * 0.025 + 31.0), kk = (1.0 + 1.1 * luc) * px;
  float e = 0.0;
  { vec2 o4[4]; o4[0] = vec2(kk, 0.0); o4[1] = vec2(-kk, 0.0); o4[2] = vec2(0.0, kk); o4[3] = vec2(0.0, -kk);
    for (int i = 0; i < 4; i++) { vec4 s = G(vUv + o4[i] * uPx); float a = s.w;
      bool haiKhung = laPhim(a) && phim;
      if (abs(a - id) > 0.5 && !haiKhung && !(a < 0.5 && id < 0.5)) e = 1.0; } }
  col = mix(col, cGiay, e * 0.9 * smoothstep(0.1, 0.3, luc + 0.25));
  if (phim) {
    float k = id - 30.0;
    float au = abs(m.x);
    float dR = min(11.0 - abs(m.x - 1.0), 8.0 - abs(m.y));
    bool hinh = dR > 0.0;
    col = mix(col, cGiay, step(abs(dR), 0.8 * px * mmPx) * 0.85);
    if (hinh) {
      float t = g.z;
      float o = 1.6 * px;
      float tx1 = tAt(vUv + vec2(o, 0.0) * uPx), tx0 = tAt(vUv - vec2(o, 0.0) * uPx), ty1 = tAt(vUv + vec2(0.0, o) * uPx), ty0 = tAt(vUv - vec2(0.0, o) * uPx);
      float gr = (tx1 < 0.0 || tx0 < 0.0 || ty1 < 0.0 || ty0 < 0.0) ? 0.0 : length(vec2(tx1 - tx0, ty1 - ty0));
      float lift = smoothstep(0.2, 0.4, vn(P * 0.03 + 9.0));
      col = mix(col, cSang, smoothstep(0.05, 0.1, gr) * 0.8 * lift);
      col = mix(col, cGiay, smoothstep(0.13, 0.22, gr) * 0.92);
      float cs = 52.0, rowC = floor(P.y / cs);
      vec2 cc = floor(vec2(P.x / cs + h21(vec2(rowC, 9.0)), rowC));
      float ra = h21(cc), rb = h21(cc + 17.0), rc = h21(cc + 31.0);
      float a = 0.95 + (ra - 0.5) * 0.55; vec2 dir = vec2(cos(a), sin(a)), per = vec2(-dir.y, dir.x);
      float sp = 5.0 + 3.0 * rb, s1 = dot(P, per) / sp, hl = abs(fract(s1) - 0.5);
      float along = dot(P, dir) + h21(vec2(floor(s1), cc.x)) * 40.0;
      float doan = step(0.3 + 0.2 * rc, fract(along / (26.0 + 30.0 * h21(vec2(floor(s1), cc.y + 4.0)))));
      float hatch = step(hl, 0.09 + 0.07 * vn(vec2(along * 0.06, floor(s1) * 1.3))) * doan;
      col = mix(col, cSang, hatch * step(0.3, t) * step(t, 0.62) * step(0.45, rc) * 0.8);
      float a2 = a + 1.2; vec2 dir2 = vec2(cos(a2), sin(a2)), per2 = vec2(-dir2.y, dir2.x);
      float s2 = dot(P, per2) / (sp * 1.3), hl2 = abs(fract(s2) - 0.5);
      float doan2 = step(0.35, fract((dot(P, dir2) + h21(vec2(floor(s2), cc.y)) * 30.0) / (22.0 + 26.0 * rb)));
      col = mix(col, cMuc, step(hl2, 0.13) * doan2 * step(t, 0.22));
      if (abs(k) > 0.5) {
        vec2 dm = normalize(vec2(-0.3, 1.0)), pm = vec2(dm.y, -dm.x);
        float cot = floor(dot(P, pm) / 7.0), rnd = h21(vec2(cot, 5.0 + k * 3.1));
        float doc = dot(P, dm) + rnd * 300.0, dai = 14.0 + 20.0 * h21(vec2(cot, 9.0 + k));
        float net = step(0.62, rnd) * step(fract(doc / (dai * 2.6)), 0.34) * step(abs(fract(dot(P, pm) / 7.0) - 0.5), 0.08 + 0.04 * h21(vec2(cot, 2.0)));
        col = mix(col, mix(cSang, cGiay, 0.35), net * 0.85);
      }
    } else {
      { vec2 dh = vec2(0.6, 0.8); float sH = dot(P, vec2(-dh.y, dh.x)) / 6.5, hH = abs(fract(sH) - 0.5);
        float doanH = step(0.35, fract((dot(P, dh) + h21(vec2(floor(sH), 3.0)) * 50.0) / (30.0 + 24.0 * h21(vec2(floor(sH), 7.0)))));
        float vach = step(abs(m.x - 1.0), 11.0) * step(8.0, abs(m.y));
        col = mix(col, cSang, step(hH, 0.08) * doanH * (0.45 + 0.35 * vach));
        float sV = dot(P, vec2(dh.x, dh.y) * vec2(1.0, -1.0)) / 4.5, hV = abs(fract(sV) - 0.5);
        col = mix(col, cMuc, step(hV, 0.12) * vach * 0.85); }
      float amp = 0.3 + 0.7 * abs(sin(m.y * 1.7 + (k + 418.0) * 2.3) * 0.6 + sin(m.y * 4.3 + (k + 418.0) * 5.1) * 0.4);
      float dT = abs(abs(m.x + 10.85) - 0.9 * amp);
      col = mix(col, cSang, step(dT, 0.9 * px * mmPx) * step(abs(m.y), 9.5) * step(m.x, -9.5) * 0.85);
      col = mix(col, cGiay, step(1.5, g.z) * step(g.z, 2.5) * 0.95);
      float vet = step(2.5, g.z);
      float ch = step(abs(fract((P.x * 0.7 + P.y) / 3.2) - 0.5), 0.2) * step(0.3, vn(P * 0.2));
      col = mix(col, mix(cMuc, cSang, step(0.72, h21(floor(P / 2.0)))), vet * max(ch, 0.75) * 0.95);
      if (abs(k) < 0.5) {
        vec2 rad = vec2(1.0, 3.45), dq = (m - vec2(16.45, -0.6)) / rad;
        float ang = atan(dq.y, dq.x), ln = max(length(dq), 1e-4);
        float rr = 1.0 + 0.05 * sin(ang * 3.0 + 1.0) + 0.04 * (vn(vec2(ang * 2.0 + 7.0, 4.0)) - 0.5);
        float dMm = abs(ln - rr) / max(length(dq / ln / rad), 1e-4);
        float ho = step(0.09, fract(ang / 6.2832 + 0.3));
        col = mix(col, cDo, step(dMm / max(mmPx, 1e-4), 1.5 * px) * ho * (0.85 + 0.15 * tooth));
      }
    }
    float gl = m.y - k * 19.0;
    float noi = step(abs(k), 1.5);
    for (int i = 0; i < 2; i++) {
      float c = i == 0 ? 9.5 : -9.5, goc = i == 0 ? 0.024 : -0.017, lech = i == 0 ? 0.32 : -0.26;
      float u = gl - c - lech - goc * m.x;
      float mepB = step(abs(abs(u) - 2.55), 0.9 * px * mmPx) * step(au, 17.2) * step(0.35, fract(P.x / 9.0 + P.y / 13.0));
      col = mix(col, cSang, mepB * noi * 0.9);
      col = mix(col, mix(cDem, cSang, 0.6), step(abs(u), 2.6) * step(au, 17.2) * noi * step(0.86, h21(floor(P / 2.0) + 7.0)));
      for (int j = 0; j < 3; j++) {
        float lj = (vn(P * (0.05 + 0.02 * float(j)) + float(j) * 13.0) - 0.5) * (1.6 + float(j)) * px;
        float dC = abs(gl - c) / max(mmPx, 1e-4) - lj;
        float nhac = smoothstep(0.1, 0.28, vn(P * 0.03 + float(j) * 5.0 + 3.0));
        col = mix(col, cDo, step(abs(dC), (1.7 - 0.45 * float(j)) * px) * noi * nhac * (0.8 + 0.2 * tooth));
      }
    }
  } else if (abs(id - 1.0) < 0.5) {
    float dW = abs(max(abs(m.x) - 18.0, abs(m.y) - 10.6));
    col = mix(col, cSang, step(dW, 0.9 * px * mmPx) * 0.8);
  }
  float sach = 0.0;
  for (int i = 0; i < 8; i++) { vec4 q = uSach[i]; vec2 dd = max(vec2(q.x - 8.0, q.y - 8.0) - P, P - vec2(q.z + 8.0, q.w + 8.0)); sach = max(sach, 1.0 - smoothstep(0.0, 6.0, max(dd.x, dd.y))); }
  col = mix(col, giay, sach);
  gl_FragColor = vec4(col, 1.0);
}`;

const VONG_F = `
varying vec2 vUv;
uniform sampler2D uL; uniform float uR, uOn, uRw;
uniform vec2 uC, uRes; uniform vec3 cMuc, cDem, cSang, cDo;
float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
void main() {
  vec2 P = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  vec2 d = P - uC; float r = length(d);
  vec2 dirH = normalize(vec2(1.0, 1.0));
  vec2 h0 = uC + dirH * (uR + uRw * 0.6), h1 = uC + dirH * (uR + uRw + uR * 0.62);
  float hw = uRw * 0.6;
  float sh = sdSeg(P, h0, h1) - hw;
  float inL = clamp((uR - r) + 0.5, 0.0, 1.0);
  float inRim = clamp((uR + uRw - r) + 0.5, 0.0, 1.0) - inL;
  float inH = clamp(-sh + 0.5, 0.0, 1.0);
  float a = max(max(inL, inRim), inH) * uOn;
  if (a < 0.003) discard;
  vec3 col = cMuc;
  if (inL > 0.0) {
    vec2 uv = d / (2.0 * uR) * vec2(1.0, -1.0) + 0.5;
    vec3 L = texture2D(uL, uv).rgb;
    float edge = smoothstep(uR * 0.9, uR * 1.0, r);
    L = mix(L, cMuc, step(h21(floor(P)), edge * edge) * 0.9);
    col = mix(col, L, inL);
  }
  vec2 nd = normalize(d + 1e-4);
  float vr = (r - uR) / uRw;
  float ringOut = inRim * step(0.72, vr);
  col = mix(col, cDem, ringOut);
  float cung = smoothstep(0.35, 0.9, dot(nd, normalize(vec2(-0.6, -1.0)))) * inRim * step(0.2, vr) * step(vr, 0.55);
  col = mix(col, cSang, cung);
  float doNeon = smoothstep(0.55, 0.95, dot(nd, vec2(-1.0, 0.15))) * inRim * step(0.62, vr);
  col = mix(col, cDo, doNeon);
  if (inH > 0.0 && inL < 0.5) {
    float song = 1.0 - smoothstep(0.0, 1.4, abs(sdSeg(P, h0, h1) - hw * 0.15));
    vec3 hc = mix(cMuc, cSang, song * 0.9);
    float mep = smoothstep(-1.6, -0.2, sh) * step(0.0, -dot(P - h0, vec2(-dirH.y, dirH.x)));
    hc = mix(hc, cDo, mep * 0.9);
    col = mix(col, hc, inH * (1.0 - inRim));
  }
  gl_FragColor = vec4(col, a);
}`;

function ngatDong(text, toiDa = 24) {
  const out = [];
  for (const cau of text.split(/(?<=\.)\s+/)) {
    const w = cau.split(' '), n = Math.max(1, Math.ceil(cau.length / toiDa));
    const dai = (i, j) => w.slice(i, j).join(' ').length;
    const N = w.length, k = Math.min(n, N);
    const tot = Array.from({ length: k + 1 }, () => new Array(N + 1).fill(Infinity)), tu = Array.from({ length: k + 1 }, () => new Array(N + 1).fill(0));
    tot[0][0] = 0;
    for (let a = 1; a <= k; a++) for (let j = 1; j <= N; j++) for (let i = a - 1; i < j; i++) {
      const v = Math.max(tot[a - 1][i], dai(i, j));
      if (v < tot[a][j]) { tot[a][j] = v; tu[a][j] = i; }
    }
    const dong = []; let j = N;
    for (let a = k; a >= 1; a--) { const i = tu[a][j]; dong.unshift(w.slice(i, j).join(' ')); j = i; }
    out.push(...dong);
  }
  return out;
}
const OPT_CHINH3 = { fs: 64, color: HEX.do, nen: null, vien: HEX.muc, mui: 'xuong' };
const TEN_LAT = ['ngo', 'so', 'vet', 'mep', 'mua', 'duoi'];
function noteTex(text, opt = {}) {
  const { fs = 64, color = HEX.giay, gach = null, khoanh = false, chat = false, nen = HEX.chamDem, vien = null, mui = null } = opt;
  const lines = Array.isArray(text) ? text : ngatDong(text);
  const m = document.createElement('canvas').getContext('2d');
  m.font = `500 ${fs}px "Caveat", cursive`;
  const tw = Math.ceil(Math.max(...lines.map((l) => m.measureText(l).width)));
  const lh = fs * 1.08, padX = Math.round(fs * (chat ? 0.32 : 0.45)), padY = Math.round(fs * (chat ? 0.24 : 0.4));
  const doc = mui === 'xuong' || mui === 'len', muiH = mui && doc ? Math.round(fs * 0.95) : 0, muiW = mui && !doc ? Math.round(fs * 1.15) : 0;
  const oX = mui === 'trai' ? muiW : 0, oY = mui === 'len' ? muiH : 0;
  const c = document.createElement('canvas'); c.width = tw + padX * 2 + muiW; c.height = Math.round(lh * lines.length + fs * (chat ? 0.18 : 0.3)) + padY * 2 + muiH;
  const g = c.getContext('2d');
  if (nen) {
    g.save(); g.filter = `blur(${Math.round(fs * 0.12)}px)`; g.fillStyle = nen;
    for (let k = 0; k < 2; k++) { g.beginPath(); g.roundRect(oX + padX * 0.25, oY + padY * 0.25, c.width - padX * 0.5 - muiW, c.height - padY * 0.5 - muiH, fs * 0.35); g.fill(); }
    g.restore();
  }
  g.font = m.font; g.textBaseline = 'middle';
  if (vien) { g.lineJoin = 'round'; g.strokeStyle = vien; g.lineWidth = fs * 0.17; lines.forEach((l, i) => g.strokeText(l, oX + padX, oY + padY + lh * (i + 0.5) + fs * 0.1)); }
  g.fillStyle = color;
  lines.forEach((l, i) => g.fillText(l, oX + padX, oY + padY + lh * (i + 0.5) + fs * 0.1));
  if (mui) {
    const tx = oX + padX + tw / 2, ty = oY + padY + lh * lines.length / 2;
    let x0, y0, x1, y1, cx, cy;
    if (mui === 'xuong') { x0 = tx + fs * 0.35; y0 = padY + lh * lines.length + fs * 0.12; x1 = tx; y1 = c.height - fs * 0.12; cx = x0 + fs * 0.05; cy = (y0 + y1) / 2; }
    else if (mui === 'len') { x0 = tx + fs * 0.35; y0 = muiH - fs * 0.05; x1 = tx; y1 = fs * 0.12; cx = x0 + fs * 0.05; cy = (y0 + y1) / 2; }
    else if (mui === 'phai') { x0 = padX + tw + fs * 0.15; y0 = ty + fs * 0.3; x1 = c.width - fs * 0.12; y1 = ty; cx = (x0 + x1) / 2; cy = y0 + fs * 0.05; }
    else { x0 = muiW + padX * 0.6 - fs * 0.15; y0 = ty + fs * 0.3; x1 = fs * 0.12; y1 = ty; cx = (x0 + x1) / 2; cy = y0 + fs * 0.05; }
    const dx = x1 - cx, dy = y1 - cy, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
    const net = (col, w) => { g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = w;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
      g.beginPath(); g.moveTo(x1 - ux * fs * 0.32 - uy * fs * 0.22, y1 - uy * fs * 0.32 + ux * fs * 0.22); g.lineTo(x1, y1);
      g.lineTo(x1 - ux * fs * 0.32 + uy * fs * 0.25, y1 - uy * fs * 0.32 - ux * fs * 0.25); g.stroke(); };
    if (vien) net(vien, fs * 0.075 + fs * 0.12);
    net(color, fs * 0.075);
  }
  g.lineCap = 'round'; g.strokeStyle = gach || color;
  if (gach) {
    const y0 = padY + lh * (lines.length - 0.5) + fs * 0.1;
    for (const [dy, lw] of [[fs * 0.5, fs * 0.075], [fs * 0.58, fs * 0.045]]) { g.lineWidth = lw; g.beginPath(); g.moveTo(padX * 0.7, y0 + dy); g.quadraticCurveTo(c.width / 2, y0 + dy + fs * 0.06, c.width - padX * 0.5, y0 + dy - fs * 0.04); g.stroke(); }
  }
  if (khoanh) khoanhTay(g, c.width / 2, c.height / 2, c.width * 0.47, c.height * 0.44, fs * 0.07, gach || color);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.userData = { k: c.width / c.height, h: c.height, fs, dong: lines.length, src: typeof text === 'string' ? { text, opt } : null };
  return t;
}
function khoanhTay(g, cx, cy, rx, ry, lw, col) {
  g.strokeStyle = col; g.lineCap = 'round';
  for (const [k, a0] of [[1.0, 0.3], [1.07, 0.65]]) {
    let px = 0, py = 0;
    for (let i = 0; i <= 64; i++) {
      const a = a0 + (i / 64) * Math.PI * 2.12;
      const x = cx + Math.cos(a) * rx * k + Math.sin(a * 3.0) * lw * 0.6, y = cy + Math.sin(a) * ry * k + Math.cos(a * 2.0) * lw * 0.6;
      if (i) { g.lineWidth = lw * (1.1 - 0.7 * (i / 64)); g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke(); }
      px = x; py = y;
    }
  }
}
function chi(g, x0, y0, x1, y1, lw, col, R) {
  g.strokeStyle = col; g.lineCap = 'round';
  const n = 6; let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t + (R() - 0.5) * lw * 0.8, y = y0 + (y1 - y0) * t + (R() - 0.5) * lw * 0.8;
    g.lineWidth = lw * (1.15 - 0.6 * t); g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke(); px = x; py = y;
  }
}
const rngK = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
function texOf(c) {
  const c2 = document.createElement('canvas'); c2.width = c.width; c2.height = c.height;
  const g = c2.getContext('2d');
  g.save(); g.filter = 'blur(10px)'; g.fillStyle = HEX.chamDem; g.beginPath(); g.roundRect(12, 12, c.width - 24, c.height - 24, 24); g.fill(); g.restore();
  g.drawImage(c, 0, 0);
  const t = new THREE.CanvasTexture(c2); t.colorSpace = THREE.NoColorSpace; t.userData = { k: c.width / c.height, h: c.height, fs: 0, dong: 0 }; return t;
}
function veDaiSo(dai) {
  const W = 760, H = 230, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rngK(41), L = HEX.giay, D = HEX.do;
  const fw = 112, x0 = 30, y0 = 34, fh = 92;
  dai.forEach((f, i) => {
    const x = x0 + i * fw;
    if (!f.mat) {
      chi(g, x, y0, x + fw, y0, 3, L, R); chi(g, x, y0 + fh + 30, x + fw, y0 + fh + 30, 3, L, R);
      chi(g, x + 10, y0 + 16, x + fw - 10, y0 + 16, 2, L, R); chi(g, x + fw - 10, y0 + 16, x + fw - 10, y0 + fh + 14, 2, L, R);
      chi(g, x + fw - 10, y0 + fh + 14, x + 10, y0 + fh + 14, 2, L, R); chi(g, x + 10, y0 + fh + 14, x + 10, y0 + 16, 2, L, R);
      for (let k = 0; k < 4; k++) { g.lineWidth = 2; g.strokeStyle = L; g.strokeRect(x + 8 + k * 26, y0 + 4, 12, 8); g.strokeRect(x + 8 + k * 26, y0 + fh + 18, 12, 8); }
    } else {
      for (const ex of [x + 2, x + fw - 2]) { let py = y0; for (let k = 1; k <= 7; k++) { const ny = y0 + (fh + 30) * k / 7; chi(g, ex + (R() - 0.5) * 8, py, ex + (R() - 0.5) * 8, ny, 3, D, R); py = ny; } }
    }
    g.font = '500 40px "Caveat", cursive'; g.fillStyle = f.mat ? HEX.hong : L; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(f.so, x + fw / 2, y0 + fh + 64);
    if (f.mat) khoanhTay(g, x + fw / 2, y0 + fh + 64, 58, 26, 4.5, D);
  });
  return texOf(c);
}
function veVetCat() {
  const W = 520, H = 240, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rngK(7), L = HEX.giay, D = HEX.do;
  chi(g, 40, 40, 300, 40, 3, L, R); chi(g, 40, 130, 300, 130, 3, L, R);
  for (let k = 0; k < 6; k++) { g.lineWidth = 2; g.strokeStyle = L; g.strokeRect(52 + k * 42, 48, 14, 10); g.strokeRect(52 + k * 42, 112, 14, 10); }
  chi(g, 300, 30, 304, 140, 4, D, R); chi(g, 304, 32, 300, 138, 2.5, D, R);
  chi(g, 30, 168, 470, 168, 3, L, R);
  for (let mm = 0; mm <= 44; mm++) { const x = 30 + mm * 10; const h = mm % 10 === 0 ? 22 : mm % 5 === 0 ? 15 : 9; g.lineWidth = 1.6; g.strokeStyle = L; g.beginPath(); g.moveTo(x, 168); g.lineTo(x, 168 + h); g.stroke(); }
  g.font = '500 30px "Caveat", cursive'; g.fillStyle = L; g.textAlign = 'center';
  for (const mm of [0, 10, 20, 30, 40]) g.fillText(String(mm), 30 + mm * 10, 218);
  chi(g, 380, 70, 316, 84, 3, HEX.hong, R); chi(g, 316, 84, 330, 72, 3, HEX.hong, R); chi(g, 316, 84, 332, 92, 3, HEX.hong, R);
  return texOf(c);
}
function veGatTan() {
  const W = 360, H = 220, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rngK(23), L = HEX.giay;
  g.strokeStyle = L; g.lineWidth = 3;
  g.beginPath(); g.ellipse(170, 130, 130, 46, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.ellipse(170, 122, 96, 30, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  g.beginPath(); g.moveTo(40, 132); g.quadraticCurveTo(170, 196, 300, 132); g.stroke();
  chi(g, 120, 118, 200, 104, 10, L, R);
  chi(g, 190, 140, 270, 126, 10, L, R); chi(g, 252, 130, 270, 126, 11, HEX.do, R);
  khoanhTay(g, 262, 128, 34, 26, 3.5, HEX.do);
  return texOf(c);
}
function veVanTay() {
  const W = 300, H = 260, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rngK(5), L = HEX.giay;
  g.lineCap = 'round';
  for (const [cx, cy, rot, s] of [[96, 92, -0.22, 1], [198, 80, 0.18, 0.92]]) {
    g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(s, s);
    const rx = 30, ry = 44;
    for (let k = 1; k <= 9; k++) {
      const a = k / 9, ex = rx * a, ey = ry * a;
      let doan = 0;
      g.strokeStyle = L; g.lineWidth = 2.4;
      g.beginPath(); let len = false;
      for (let i = 0; i <= 60; i++) {
        const t = Math.PI * (0.9 + 1.2 * i / 60);
        const x = Math.cos(t) * ex + (R() - 0.5) * 0.8, y = Math.sin(t) * ey * (k < 4 ? 0.8 : 1) + (k < 4 ? 6 : 0);
        const dut = (i === 18 + k * 2 || i === 41 - k) && R() < 0.8;
        if (dut) { g.stroke(); g.beginPath(); len = false; doan++; continue; }
        if (!len) { g.moveTo(x, y); len = true; } else g.lineTo(x, y);
      }
      g.stroke();
      g.beginPath(); g.moveTo(-ex * 0.95, 6 + k * 3.2); g.quadraticCurveTo(0, 10 + k * 3.6, ex * 0.95, 4 + k * 3.2); g.stroke();
    }
    g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, 4, rx + 6, ry + 8, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
    for (const dx of [-12, 10]) {
      const x0 = cx + dx * s, y0 = cy + 50 * s, len = 70 + R() * 50;
      chi(g, x0, y0, x0 + (R() - 0.5) * 6, y0 + len, 3, L, R);
      g.fillStyle = L; g.beginPath(); g.ellipse(x0 + (R() - 0.5) * 4, y0 + len + 6, 5, 7, 0, 0, Math.PI * 2); g.fill();
    }
  }
  return texOf(c);
}

function veDongHo() {
  const W = 220, H = 220, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rngK(19), L = HEX.giay;
  khoanhTay(g, 110, 110, 86, 86, 3.2, L);
  for (let h = 0; h < 12; h++) { const a = h / 12 * Math.PI * 2; const r1 = h % 3 ? 76 : 80; chi(g, 110 + Math.sin(a) * 70, 110 - Math.cos(a) * 70, 110 + Math.sin(a) * r1, 110 - Math.cos(a) * r1, h % 3 ? 2 : 3.5, L, R); }
  const aH = (2.25 / 12) * Math.PI * 2, aM = (15 / 60) * Math.PI * 2;
  chi(g, 110, 110, 110 + Math.sin(aH) * 44, 110 - Math.cos(aH) * 44, 5, L, R);
  chi(g, 110, 110, 110 + Math.sin(aM) * 66, 110 - Math.cos(aM) * 66, 3.5, HEX.do, R);
  return texOf(c);
}
function veDauGiay() {
  const W = 360, H = 200, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rngK(13), L = HEX.giay;
  for (const [x, y, rot] of [[90, 120, -0.35], [200, 82, -0.35]]) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.strokeStyle = L; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -18, 17, 28, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.ellipse(0, 34, 6, 6, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
  }
  chi(g, 250, 70, 330, 40, 3, HEX.hong, R); chi(g, 330, 40, 312, 36, 3, HEX.hong, R); chi(g, 330, 40, 318, 54, 3, HEX.hong, R);
  return texOf(c);
}

function veBanTay() {
  const W = 320, H = 210, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rngK(29), L = HEX.giay, S = HEX.chamSang;
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = L;
  const net = (w, f) => { g.lineWidth = w; g.beginPath(); f(); g.stroke(); };
  net(2.6, () => { g.moveTo(110, 16); g.lineTo(118, 58); g.moveTo(178, 20); g.lineTo(170, 60); g.moveTo(110, 16); g.quadraticCurveTo(144, 24, 178, 20); });
  net(2.0, () => { g.moveTo(118, 58); g.quadraticCurveTo(144, 64, 170, 60); });
  net(1.6, () => { g.moveTo(171, 38); g.lineTo(170, 56); });
  g.fillStyle = L; g.beginPath(); g.arc(165, 45, 2.6, 0, Math.PI * 2); g.fill();
  net(2.8, () => { g.moveTo(118, 60); g.bezierCurveTo(114, 74, 111, 88, 112, 102); g.moveTo(170, 62); g.bezierCurveTo(174, 76, 176, 88, 175, 100); });
  const NGON = [[111, 124, 112, 168, -3], [124, 140, 128, 192, -2], [140, 155, 148, 186, 0], [155, 175, 168, 166, 3]];
  for (const [a, b, tx, ty, k] of NGON) {
    const y0 = 100 + (a - 111) * 0.05, cx = (a + b) / 2;
    net(2.4, () => {
      g.moveTo(a, y0); g.bezierCurveTo(a + k - 1, y0 + (ty - y0) * 0.45, tx - 5 + k, ty - 12, tx - 3, ty - 2);
      g.quadraticCurveTo(tx, ty + 3, tx + 3, ty - 2);
      g.bezierCurveTo(tx + 5 + k, ty - 12, b + k + 1, y0 + (ty - y0) * 0.45, b, y0);
    });
    net(1.3, () => { const yk = y0 + (ty - y0) * 0.52; g.moveTo(cx - 5 + k * 0.5, yk); g.quadraticCurveTo(cx + k * 0.5, yk + 2.5, cx + 5 + k * 0.5, yk); });
  }
  net(2.4, () => { g.moveTo(113, 72); g.bezierCurveTo(100, 86, 97, 108, 103, 126); g.quadraticCurveTo(107, 131, 110, 124); g.lineTo(111, 104); });
  g.setLineDash([3, 4]); net(1.3, () => { for (const [x0, x1] of [[130, 127], [144, 143], [158, 160]]) { g.moveTo(x0, 66); g.lineTo(x1, 98); } }); g.setLineDash([]);
  for (let i = -3; i <= 3; i++) chi(g, 128 + i * 7, 172 + Math.abs(i) * -2, 136 + i * 7, 186 + Math.abs(i) * -2, 2.0, S, R);
  chi(g, 262, 150, 196, 176, 3, HEX.hong, R); chi(g, 196, 176, 212, 164, 3, HEX.hong, R); chi(g, 196, 176, 214, 184, 3, HEX.hong, R);
  return texOf(c);
}
function veTuiAo() {
  const W = 320, H = 210, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), R = rngK(37), L = HEX.giay, S = HEX.chamSang;
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = L; g.lineWidth = 3;
  g.beginPath(); g.moveTo(52, 70); g.lineTo(238, 56); g.stroke();
  g.beginPath(); g.moveTo(52, 84); g.quadraticCurveTo(146, 126, 238, 70); g.stroke();
  g.beginPath(); g.moveTo(52, 92); g.quadraticCurveTo(146, 138, 238, 78); g.lineWidth = 1.8; g.stroke(); g.lineWidth = 3;
  for (const x of [52, 238]) { g.beginPath(); g.moveTo(x, x < 100 ? 64 : 50); g.lineTo(x, x < 100 ? 96 : 84); g.stroke(); }
  for (let i = 0; i < 7; i++) chi(g, 74 + i * 24, 72 - i * 1.6, 82 + i * 24, 84 + 10 * Math.sin(Math.PI * (i + 0.5) / 7) - i * 1.6, 2, S, R);
  g.lineWidth = 1.6; g.beginPath(); g.moveTo(30, 30); g.quadraticCurveTo(26, 120, 36, 196); g.stroke();
  g.setLineDash([6, 7]); g.strokeStyle = S; g.lineWidth = 2.5; g.strokeRect(200, 108, 30, 92); g.setLineDash([]);
  chi(g, 262, 100, 262, 186, 3, HEX.hong, R); chi(g, 262, 186, 254, 172, 3, HEX.hong, R); chi(g, 262, 186, 270, 172, 3, HEX.hong, R);
  return texOf(c);
}

export function makeKinhLup(renderer, opt = {}) {
  const lensScene = new THREE.Scene();
  const lensCam = new THREE.PerspectiveCamera();
  const H = { R: 120, mag: 1.35, px: 2, rt: null, gRt: null, on: 0, x: -999, y: -999, lop: 1 };
  const gMats = [];
  const quad = new THREE.PlaneGeometry(2, 2);
  const chiMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_V, fragmentShader: opt.ham ? CHI_F_HAM : opt.lat ? CHI_F_LAT : opt.pho ? CHI_F_PHO : CHI_F, depthTest: false, depthWrite: false,
    uniforms: { uG: { value: null }, uPx: { value: new THREE.Vector2() }, uC: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2(1, 1) },
      uR: { value: 120 }, uMag: { value: 1.35 }, uDpr: { value: 1 }, uIdDau: { value: 1 }, uIdMu: { value: -5 }, uAo: { value: [-9, -9, -9, -9, -9] },
      cGiay: { value: C.giay }, cDo: { value: C.do }, cHong: { value: C.hong }, cDem: { value: C.chamDem }, cSang: { value: C.chamSang }, cMuc: { value: C.muc }, uLv: { value: new THREE.Vector3(0, 1, 0) },
      ...(opt.lat ? { uSach: { value: [0, 1, 2, 3, 4, 5, 6, 7].map(() => new THREE.Vector4(0, 0, -1, -1)) }, uTq: { value: 0 } } : {}),
      ...(opt.ngo ? { uSach: { value: [0, 1, 2, 3, 4, 5, 6, 7].map(() => new THREE.Vector4(0, 0, -1, -1)) } } : {}),
      ...(opt.ham ? { uNgoi: { value: new THREE.Vector2(0.26, 0.57) } } : {}),
      ...(opt.pho ? { uSach: { value: [0, 1, 2, 3, 4, 5, 6, 7].map(() => new THREE.Vector4(0, 0, -1, -1)) }, uNuoc: { value: new THREE.Vector4(0, -99, 1, -99) }, uIdNho: { value: [-9, -9, -9] }, uIdGot: { value: -9 }, uChan: { value: new THREE.Vector4() }, uTq: { value: 0 } } : {}) },
  });
  const chiScene = new THREE.Scene(); chiScene.add(new THREE.Mesh(quad, chiMat));
  const vongMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_V, fragmentShader: VONG_F, transparent: true, depthTest: false, depthWrite: false,
    uniforms: { uL: { value: null }, uR: { value: 120 }, uOn: { value: 0 }, uRw: { value: 9 }, uC: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2(1, 1) },
      cMuc: { value: C.muc }, cDem: { value: C.chamDem }, cSang: { value: C.chamSang }, cDo: { value: C.do } },
  });
  const vongScene = new THREE.Scene(); vongScene.add(new THREE.Mesh(quad, vongMat));
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function gbufFor(mesh, id, da = null, opt = {}) {
    const g = new THREE.ShaderMaterial({ vertexShader: GBUF_V, fragmentShader: opt.vung ? GBUF_F_VUNG : GBUF_F, side: THREE.DoubleSide, depthTest: !opt.xuyen, depthWrite: !opt.xuyen,
      uniforms: { uId: { value: id }, uDa: { value: da ? 1 : 0 }, uDauC: { value: da ? da.c : new THREE.Vector3() }, uDauU: { value: da ? da.u : new THREE.Vector3(0, 1, 0) }, ...(opt.vung ? { uPud: opt.vung.uPud, uNPud: opt.vung.uNPud } : {}) } });
    if (opt.xuyen) mesh.renderOrder = 20;
    if (opt.sau) mesh.renderOrder = opt.sau;
    gMats.push({ mesh, g });
  }
  function gbufMat(mesh, g) { gMats.push({ mesh, g }); }
  function datRes(cssW, cssH) { chiMat.uniforms.uRes.value.set(cssW, cssH); vongMat.uniforms.uRes.value.set(cssW, cssH); }

  function resize(cssW, cssH, dpr, phone, ngang = false, rDt = 100, rNgang = 76, rMax = 140, rMin = 84) {
    H.R = ngang ? rNgang : phone ? rDt : Math.round(Math.min(rMax, Math.max(rMin, cssH * 0.14)));
    H.px = dpr;
    const n = Math.round(H.R * 2 * dpr);
    if (H.rt) { H.rt.dispose(); H.gRt.dispose(); }
    H.gRt = new THREE.WebGLRenderTarget(n, n, { type: THREE.HalfFloatType, depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    H.rt = new THREE.WebGLRenderTarget(n, n, { depthBuffer: false });
    chiMat.uniforms.uG.value = H.gRt.texture;
    chiMat.uniforms.uPx.value.set(1 / n, 1 / n);
    chiMat.uniforms.uRes.value.set(cssW, cssH);
    vongMat.uniforms.uL.value = H.rt.texture;
    vongMat.uniforms.uRes.value.set(cssW, cssH);
    vongMat.uniforms.uRw.value = phone ? 7 : 9;
  }

  const old = new Map();
  const an = [], anOld = [];
  const anDi = (m, f = null) => an.push({ m, f });
  const hienK = [];
  const hienKhiSoi = (m) => { m.visible = false; hienK.push(m); };
  const thatK = []; const camThat = new THREE.PerspectiveCamera(); camThat.layers.set(5);
  const giuMauThat = (m) => { m.layers.enable(5); thatK.push(m); };
  function render(scene, cam, cssW, cssH, lv, dich = null) {
    if (H.on < 0.003) return;
    const R = H.R, m = H.mag, s = 2 * R / m;
    lensCam.copy(cam);
    const v = cam.view;
    if (v && v.enabled) lensCam.setViewOffset(cssW * v.fullWidth / v.width, cssH * v.fullHeight / v.height, v.offsetX / v.width * cssW + H.x - s / 2, v.offsetY / v.height * cssH + H.y - s / 2, s, s);
    else lensCam.setViewOffset(cssW, cssH, H.x - s / 2, H.y - s / 2, s, s);
    lensCam.updateProjectionMatrix();
    for (let i = gMats.length - 1; i >= 0; i--) if (!gMats[i].mesh.parent) gMats.splice(i, 1);
    for (const { mesh, g } of gMats) { old.set(mesh, mesh.material); mesh.material = g; }
    for (const { m, f } of an) { anOld.push(m.visible); if (!f || f()) m.visible = false; }
    for (const m of hienK) m.visible = true;
    const prevC = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
    renderer.setRenderTarget(H.gRt);
    renderer.setClearColor(0x8080ff, 0); renderer.clear();
    renderer.render(scene, lensCam);
    for (const [mesh, mat] of old) mesh.material = mat;
    old.clear();
    an.forEach(({ m }, i) => { m.visible = anOld[i]; }); anOld.length = 0;
    for (const m of hienK) m.visible = false;
    chiMat.uniforms.uC.value.set(H.x, H.y); chiMat.uniforms.uR.value = R; chiMat.uniforms.uMag.value = m; chiMat.uniforms.uDpr.value = H.px;
    chiMat.uniforms.uLv.value.copy(lv);
    renderer.setRenderTarget(H.rt);
    renderer.render(chiScene, ortho);
    const ac = renderer.autoClear; renderer.autoClear = false;
    if (thatK.some((m) => m.visible)) { camThat.copy(lensCam); camThat.layers.set(5); renderer.render(scene, camThat); }
    if (CUMK.length) {
      const nh = H.R / H.mag - 2;
      for (const q of CUMK) { const r = q.r; let vao = 0;
        for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const x = r[0] + (r[2] - r[0]) * i / 4, y = r[1] + (r[3] - r[1]) * j / 2; if (Math.hypot(x - H.x, y - H.y) <= nh) vao++; }
        const t = Math.min(1, Math.max(0, (vao / 15 - 0.55) / 0.4)), k = t * t * (3 - 2 * t);
        for (const m of q.ms) m.material.opacity = (m.userData.op ?? 1) * H.lop * k; }
    }
    if (H.lop > 0.003) renderer.render(lensScene, lensCam);
    renderer.setRenderTarget(dich);
    renderer.setClearColor(prevC, prevA);
    vongMat.uniforms.uC.value.set(H.x, H.y); vongMat.uniforms.uR.value = R; vongMat.uniforms.uOn.value = H.on;
    renderer.render(vongScene, ortho);
    renderer.autoClear = ac;
  }
  function lamNong(scene, cam) {
    for (const { mesh, g } of gMats) { old.set(mesh, mesh.material); mesh.material = g; }
    for (const { m, f } of an) { anOld.push(m.visible); if (!f || f()) m.visible = false; }
    renderer.compile(scene, cam);
    for (const [mesh, mat] of old) mesh.material = mat;
    old.clear();
    an.forEach(({ m }, i) => { m.visible = anOld[i]; }); anOld.length = 0;
    renderer.compile(lensScene, cam);
  }
  async function lamNongAsync(scene, cam, dich = null) {
    for (const { mesh, g } of gMats) { old.set(mesh, mesh.material); mesh.material = g; }
    for (const { m, f } of an) { anOld.push(m.visible); if (!f || f()) m.visible = false; }
    for (const m of hienK) m.visible = true;
    try { if (dich) await dich(scene, cam); else await renderer.compileAsync(scene, cam); } finally {
      for (const [mesh, mat] of old) mesh.material = mat;
      old.clear();
      an.forEach(({ m }, i) => { m.visible = anOld[i]; }); anOld.length = 0;
      for (const m of hienK) m.visible = false;
    }
    await renderer.compileAsync(lensScene, cam).catch(() => {});
    await renderer.compileAsync(chiScene, ortho).catch(() => {});
    await renderer.compileAsync(vongScene, ortho).catch(() => {});
  }
  function datLop(k) {
    H.lop = k;
    lensScene.traverse((o) => { if (o.material) o.material.opacity = (o.userData.op ?? 1) * k; });
  }

  function net(pts, w, col, op, camPos, seed = 1) {
    const n = pts.length; if (n < 2) return null;
    const pos = new Float32Array(n * 2 * 3); const idx = [];
    const v = new THREE.Vector3(), t = new THREE.Vector3(), s = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      t.subVectors(b, a).normalize();
      v.subVectors(camPos, pts[i]).normalize();
      s.crossVectors(t, v).normalize();
      const u = i / (n - 1);
      const taper = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.55);
      const luc = 0.7 + 0.6 * (0.5 + 0.5 * Math.sin(u * 9.0 + seed * 2.3) * Math.sin(u * 3.7 + seed));
      const ww = w * Math.max(0.12, taper) * luc;
      const p = pts[i];
      pos.set([p.x + s.x * ww, p.y + s.y * ww, p.z + s.z * ww, p.x - s.x * ww, p.y - s.y * ww, p.z - s.z * ww], i * 6);
      if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(col.x, col.y, col.z, THREE.LinearSRGBColorSpace), transparent: true, opacity: op, depthTest: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m); mesh.userData.op = op; mesh.frustumCulled = false;
    lensScene.add(mesh); return mesh;
  }
  const vong = (c, a, b, r, n, wob, seed, arc = Math.PI * 2.06) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * arc + seed;
      const rr = r + Math.sin(t * 3 + seed) * wob + Math.sin(t * 7 + seed * 2) * wob * 0.4;
      pts.push(c.clone().addScaledVector(a, Math.cos(t) * rr).addScaledVector(b, Math.sin(t) * rr));
    }
    return pts;
  };
  const doan = (a, b, n = 12, wob = 0.0, seed = 1, up = null) => {
    const pts = [];
    for (let i = 0; i <= n; i++) { const p = a.clone().lerp(b, i / n); if (up && wob) p.addScaledVector(up, Math.sin((i / n) * Math.PI * 2 + seed) * wob); pts.push(p); }
    return pts;
  };

  function xoaLopGiu() { while (lensScene.children.length) { const o = lensScene.children.pop(); o.geometry && o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } } }
  function xoaLop() { while (lensScene.children.length) { const o = lensScene.children.pop(); o.geometry && o.geometry.dispose(); if (o.material) { o.material.map && o.material.map.dispose(); o.material.dispose(); } } }

  function dungLop(o) {
    xoaLop();
    const { cam } = o;
    const cp = cam.position;
    const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(o.wall.n, o.wall.pt);
    const { n, right } = o.wall;
    const hz = cp.clone().addScaledVector(n, -cp.clone().sub(o.wall.pt).dot(n));
    net(doan(hz.clone().addScaledVector(right, -2.6), hz.clone().addScaledVector(right, 2.6), 24), 0.0022, C.chamSang, 1, cp, 7);
    let sd = 8;
    for (const [x, y] of [[-0.55, 0.32], [-0.75, -0.3], [0.6, 0.36], [0.85, -0.28], [-0.25, 0.55], [0.35, -0.5], [-0.95, 0.04], [0.95, 0.1], [0.2, 0.62], [-0.45, -0.58]]) {
      const onWall = hz.clone().addScaledVector(right, x).addScaledVector(UPV, y);
      net(doan(onWall, onWall.clone().addScaledVector(n, 0.9), 14), 0.0022, C.chamSang, 1, cp, sd++);
    }

    const W = o.W || 1900, Hh = o.H || 920, dt = !!o.dt, day = o.day || 46;
    const tuongPx = (x, y) => { const q = new THREE.Vector3(x / W * 2 - 1, 1 - y / Hh * 2, 0.5).unproject(cam); return new THREE.Ray(cp, q.sub(cp).normalize()).intersectPlane(pl, new THREE.Vector3()); };
    const mPx = (() => { const a1 = tuongPx(W / 2, Hh / 2), a2 = tuongPx(W / 2, Hh / 2 + 100); return a1 && a2 ? a1.distanceTo(a2) / 100 : 0.0012; })();
    const tam = 2 * H.R / H.mag, vua = tam * 0.86, vuaChung = vua;
    const coChu = dt || Hh < 560 ? 13.5 : 17;
    const K = CHU.kinh, m = o.chu;
    LOPCO.length = 0; LOPTEN.length = 0; LOPBO.length = 0;
    const mon = (tex, cao, hinh = false, vuaMon = 0) => {
      const vua = vuaMon || vuaChung;
      const kich = (t) => { const h0 = hinh ? cao : cao * (t.userData.h / t.userData.fs); return [h0 * t.userData.k, h0]; };
      let [w, h] = kich(tex);
      if (!hinh && w > vua && tex.userData.src) {
        for (let td = 21; td >= 9; td -= 2) {
          const t2 = noteTex(ngatDong(tex.userData.src.text, td), tex.userData.src.opt), [w2, h2] = kich(t2);
          if (w2 <= vua || td <= 10) { t2.userData.src = tex.userData.src; tex.dispose(); tex = t2; w = w2; h = h2; break; }
          t2.dispose();
        }
      }
      let k = 1;
      if (w > vua) { k = vua / w; w *= k; h *= k; }
      if (!hinh) LOPCO.push(+(cao * k * H.mag).toFixed(1));
      return { tex, w, h };
    };
    const cum = (ds) => ({ ds, w: Math.max(...ds.map((d) => d.w)), h: ds.reduce((s2, d) => s2 + d.h, 0), ten: (ds.find((d) => d.tex.userData.src) || ds[0]).tex.userData.src?.text?.slice(0, 18) || 'hinh' });
    const tranh = (o.tranh || []).map((r) => [r[0] - 24, r[1] - 24, r[2] + 24, r[3] + 24]);
    const daDat = [];
    const giao = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    const hop = (c, x, y) => [x - c.w / 2, y - c.h / 2, x + c.w / 2, y + c.h / 2];
    const nhinK = H.R / H.mag, bienK = H.R + 12 - nhinK + 6;
    const VUNG = [Math.max(11.5, bienK), Math.max(11.5, bienK), W - Math.max(11.5, bienK), Hh - day - Math.max(11.5, bienK)];
    const hopLe = (r) => r[0] >= VUNG[0] && r[2] <= VUNG[2] && r[1] >= VUNG[1] && r[3] <= VUNG[3] && !tranh.some((t) => giao(r, t)) && !daDat.some((t) => giao(r, t));
    const datCum = (c, x0, y0, tamKinh = false) => {
      const nhin = H.R / H.mag;
      const bx = tamKinh ? Math.max(12 + c.w / 2, H.R + 12 - Math.max(0, nhin - c.w / 2 - 6)) : 12 + c.w / 2;
      const by = tamKinh ? Math.max(12 + c.h / 2, H.R + 12 - Math.max(0, nhin - c.h / 2 - 6)) : 12 + c.h / 2;
      const buoc = [];
      for (let r = 0; r <= 14; r++) for (const [sx, sy] of [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]]) buoc.push([sx * r * 28, sy * r * 22]);
      for (const [dx, dy] of buoc) {
        const bx2 = Math.max(bx, VUNG[0] + c.w / 2), by2 = Math.max(by, VUNG[1] + c.h / 2), by3 = Math.max(by, Hh - VUNG[3] + c.h / 2);
        const x = THREE.MathUtils.clamp(x0 + dx, bx2, W - bx2), y = THREE.MathUtils.clamp(y0 + dy, by2, Hh - by3);
        const r = hop(c, x, y);
        if (hopLe(r)) { daDat.push([r[0] - 10, r[1] - 10, r[2] + 10, r[3] + 10]); LOPTEN.push(c.ten); veCum(c, x, y); return { x, y, r }; }
      }
      LOPBO.push(c.ten);
      return null;
    };
    const veCum = (c, x, y) => {
      let yy = y - c.h / 2;
      for (const d of c.ds) {
        const p2 = tuongPx(x, yy + d.h / 2);
        if (p2) {
          const mm = new THREE.Mesh(new THREE.PlaneGeometry(d.w * mPx, d.h * mPx), new THREE.MeshBasicMaterial({ map: d.tex, transparent: true, depthTest: false }));
          mm.position.copy(p2); mm.quaternion.copy(cam.quaternion); mm.renderOrder = 5; lensScene.add(mm);
        }
        yy += d.h;
      }
    };
    const cChinh = cum([mon(noteTex(K.chinh, { fs: 64, color: HEX.giay, gach: HEX.do }), coChu * 1.12, false, m.kieu === 'dt' ? Math.min(vua, 92) : vua)]);
    const d0 = o.dauBox || [W * 0.5, Hh * 0.4, W, Hh * 0.7];
    let xChinh0, yChinh0;
    const yC0 = o.cuaTren || Hh * 0.4;
    if (m.kieu === 'dt') {
      xChinh0 = 12 + cChinh.w / 2; yChinh0 = yC0 + cChinh.h / 2 + 14;
    } else if (m.kieu === 'ngang') {
      xChinh0 = m.x + H.R; yChinh0 = Hh - day - H.R - 12;
    } else {
      yChinh0 = m.yHet + H.R + 10;
      xChinh0 = Math.max(m.x + cChinh.w / 2, Math.min(m.phai - cChinh.w / 2, m.x + 260));
      if (yChinh0 > Hh - day - H.R - 12) {
        xChinh0 = m.phai + H.R + 24;
        yChinh0 = Math.min(Hh - day - H.R - 12, Math.max(m.tieuDe[3] + H.R + 14, (m.yThan + m.yHet) / 2));
      }
    }
    const pChinh = datCum(cChinh, xChinh0, yChinh0, true) || { x: xChinh0, y: yChinh0 };
    datCum(cum([mon(noteTex(K.duoi, { fs: 64 }), coChu)]), m.kieu === 'may' ? W * 0.5 : m.x + 10 + Math.min(vua, 200) / 2, m.yTieuCuoi + (m.kieu === 'may' ? 34 : 22));
    const vatLuu = [];
    const them = (tex, x, y, hinhCao = 0) => { const c = hinhCao ? cum([mon(tex, hinhCao, true)]) : cum([mon(tex, coChu)]); vatLuu.push([c, x, y]); };
    const themCum = (ds, x, y) => vatLuu.push([cum(ds), x, y]);
    const dau = o.dauBox || [W * 0.6, Hh * 0.2, W * 0.75, Hh * 0.6];
    const yC = yC0;
    const tren = (ds, x) => { const c = cum(ds); const hc = ds[ds.length - 1].h; vatLuu.push([c, x, yC - c.h / 2 + hc * 0.2]); };
    const gatTan = () => tren([mon(noteTex(K.son, { fs: 64 }), coChu), mon(veGatTan(), m.kieu === 'may' ? 68 : 46, true)], m.kieu === 'dt' ? 12 + 64 : W * (m.kieu === 'ngang' ? 0.2 : 0.2));
    const daiSo = (x, y) => themCum([mon(veDaiSo(K.daiSo), m.kieu === 'may' ? 64 : 46, true), mon(noteTex(K.haiBen, { fs: 64 }), coChu)], x, y);
    if (m.kieu === 'may') {
      gatTan();
      daiSo(W * 0.3, Hh * 0.72);
      themCum([mon(veVetCat(), 56, true), mon(noteTex(K.vetCat, { fs: 64 }), coChu)], m.x + 90, m.yTieuCuoi + 84);
      them(noteTex(K.gio, { fs: 64 }), W * 0.8, Math.max(VUNG[1] + 40, (o.logoDay || 80) + 46));
      them(noteTex(K.tui, { fs: 64 }), W * 0.78, Math.max(VUNG[1] + 100, (o.logoDay || 80) + 112));
      them(noteTex(K.hoi, { fs: 64 }), dau[2] - 40, dau[1] - 40);
      tren([mon(noteTex(K.bau, { fs: 64 }), coChu), mon(veVanTay(), 62, true)], W * 0.36);
      them(noteTex(K.cua, { fs: 64 }), 12 + 90, Hh * 0.8);
    } else if (m.kieu === 'dt') {
      gatTan();
      them(noteTex(K.gio, { fs: 64 }), W * 0.3, (o.thanDay || Hh * 0.3) + 30);
      daiSo(W * 0.3, (o.thanDay || Hh * 0.3) - 70);
      them(noteTex(K.tui, { fs: 64 }), W * 0.72, (o.thanDay || Hh * 0.3) - 110);
    } else {
      gatTan();
      daiSo(W * 0.38, Hh * 0.7);
      them(noteTex(K.gio, { fs: 64 }), W * 0.75, (o.logoDay || 50) + 30);
      them(noteTex(K.hoi, { fs: 64 }), dau[2] - 40, dau[1] - 30);
    }
    for (const [c, x, y] of vatLuu) datCum(c, x, y);
    datLop(H.lop);
    LOPDAT.length = 0; LOPDAT.push(...daDat);
    return { x: pChinh.x, y: pChinh.y };
  }

  function dungLopPho(o) {
    xoaLop();
    const { cam, K } = o;
    const cp = cam.position;
    for (const [a, b] of o.datDuong || []) net(doan(a, b, 18), 0.0022, C.chamSang, 1, cp, 3);
    (o.netTay || []).forEach((pts, i) => { const m = net(pts, 0.0013, C.giay, 0.85, cp, 11 + i); if (m) m.renderOrder = 4; });
    const W = o.W, Hh = o.H, day = o.day || 46, dt = o.kieu === 'dt';
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(fwd.clone().negate(), cp.clone().addScaledVector(fwd, 5));
    const matPx = (x, y) => { const q = new THREE.Vector3(x / W * 2 - 1, 1 - y / Hh * 2, 0.5).unproject(cam); return new THREE.Ray(cp, q.sub(cp).normalize()).intersectPlane(pl, new THREE.Vector3()); };
    const mPx = (() => { const a1 = matPx(W / 2, Hh / 2), a2 = matPx(W / 2, Hh / 2 + 100); return a1 && a2 ? a1.distanceTo(a2) / 100 : 0.0012; })();
    const tam = 2 * H.R / H.mag, vua = tam * 0.86;
    const coChu = dt || Hh < 560 ? 13.5 : 17;
    LOPCO.length = 0; LOPTEN.length = 0; LOPBO.length = 0;
    const mon = (tex, cao, hinh = false) => {
      const kich = (t) => { const h0 = hinh ? cao : cao * (t.userData.h / t.userData.fs); return [h0 * t.userData.k, h0]; };
      let [w, h] = kich(tex);
      if (!hinh && w > vua && tex.userData.src) {
        for (let td = 21; td >= 9; td -= 2) {
          const t2 = noteTex(ngatDong(tex.userData.src.text, td), tex.userData.src.opt), [w2, h2] = kich(t2);
          if (w2 <= vua || td <= 10) { t2.userData.src = tex.userData.src; tex.dispose(); tex = t2; w = w2; h = h2; break; }
          t2.dispose();
        }
      }
      let k = 1;
      if (w > vua) { k = vua / w; w *= k; h *= k; }
      if (!hinh) LOPCO.push(+(cao * k * H.mag).toFixed(1));
      return { tex, w, h };
    };
    const cum = (ds) => ({ ds, w: Math.max(...ds.map((d) => d.w)), h: ds.reduce((s2, d) => s2 + d.h, 0), ten: (ds.find((d) => d.tex.userData.src) || ds[0]).tex.userData.src?.text?.slice(0, 18) || 'hinh' });
    const tranh = (o.tranh || []).map((r) => [r[0] - 24, r[1] - 24, r[2] + 24, r[3] + 24]);
    const daDat = [];
    const giao = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    const hop = (c, x, y) => [x - c.w / 2, y - c.h / 2, x + c.w / 2, y + c.h / 2];
    const nhinK = H.R / H.mag, bienK = H.R + 12 - nhinK + 6;
    const VUNG = [Math.max(11.5, bienK), Math.max(11.5, bienK), W - Math.max(11.5, bienK), Hh - day - Math.max(11.5, bienK)];
    const tamDat = [], nhinG = dt ? H.R / H.mag * 0.6 : H.R / H.mag - 4;
    const kcHop = (x, y, t) => Math.hypot(x - Math.max(t[0], Math.min(x, t[2])), y - Math.max(t[1], Math.min(y, t[3])));
    const gian = (r) => { const x = (r[0] + r[2]) / 2, y = (r[1] + r[3]) / 2; return tamDat.every((q) => kcHop(x, y, q.r) >= nhinG && kcHop(q.c[0], q.c[1], r) >= nhinG); };
    const duoiLogo = (r) => { if (dt) return false; const x = (r[0] + r[2]) / 2, y = (r[1] + r[3]) / 2; return (o.kinhTranh || []).some((t) => kcHop(x, y, t) < H.R + 10); };
    let kinh0 = null;
    const ngoaiKinh0 = (r) => !kinh0 || kcHop(kinh0.x, kinh0.y, r) >= kinh0.r;
    const hopLe = (r) => r[0] >= VUNG[0] && r[2] <= VUNG[2] && r[1] >= VUNG[1] && r[3] <= VUNG[3] && !tranh.some((t) => giao(r, t)) && !daDat.some((t) => giao(r, t)) && gian(r) && !duoiLogo(r) && ngoaiKinh0(r);
    const satVat = (r, vat) => {
      if (!vat || !vat.length) return true;
      const nh = H.R / H.mag, kx = (x) => Math.min(W - H.R - 12, Math.max(H.R + 12, x)), ky = (y) => Math.min(Hh - day - H.R - 12, Math.max(H.R + 12, y));
      const goc = [[r[0], r[1]], [r[2], r[1]], [r[0], r[3]], [r[2], r[3]]], bx = (r[0] + r[2]) / 2, by = (r[1] + r[3]) / 2;
      for (const q of vat) for (let t = 0; t <= 1.0001; t += 0.1) {
        const cx = kx(bx + (q.x - bx) * t), cy = ky(by + (q.y - by) * t);
        if (goc.every(([x, y]) => Math.hypot(x - cx, y - cy) <= nh - 3) && Math.hypot(q.x - cx, q.y - cy) <= nh - 6) return true;
      }
      return false;
    };
    CUMK.length = 0;
    const veCum = (c, x, y) => {
      let yy = y - c.h / 2; const ms = [];
      for (const d of c.ds) {
        const p2 = matPx(x, yy + d.h / 2);
        if (p2) { const mm = new THREE.Mesh(new THREE.PlaneGeometry(d.w * mPx, d.h * mPx), new THREE.MeshBasicMaterial({ map: d.tex, transparent: true, depthTest: false })); mm.position.copy(p2); mm.quaternion.copy(cam.quaternion); mm.renderOrder = 5; lensScene.add(mm); ms.push(mm); }
        yy += d.h;
      }
      if (dt) CUMK.push({ ms, r: [x - c.w / 2 + c.w * 0.1, y - c.h / 2 + c.h * 0.14, x + c.w / 2 - c.w * 0.1, y + c.h / 2 - c.h * 0.14] });
    };
    const datO = (c, p) => { const r = p.r; daDat.push([r[0] - 10, r[1] - 10, r[2] + 10, r[3] + 10]); tamDat.push({ c: [p.x, p.y], r }); LOPTEN.push(c.ten); veCum(c, p.x, p.y); };
    const datCum = (c, x0, y0, tamKinh = false) => { const p = timCho(c, x0, y0, tamKinh); if (p) { datO(c, p); return p; } LOPBO.push(c.ten); return null; };
    const timCho = (c, x0, y0, tamKinh = false, vat = null) => {
      const nhin = H.R / H.mag;
      const bx = tamKinh ? Math.max(12 + c.w / 2, H.R + 12 - Math.max(0, nhin - c.w / 2 - 6)) : 12 + c.w / 2;
      const by = tamKinh ? Math.max(12 + c.h / 2, H.R + 12 - Math.max(0, nhin - c.h / 2 - 6)) : 12 + c.h / 2;
      const buoc = [];
      const bk = o.kieu === 'dt' ? 0.5 : 1, nr = Math.round((o.xa || 14) / bk);
      for (let r = 0; r <= nr; r++) for (const [sx, sy] of [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]]) buoc.push([sx * r * 28 * bk, sy * r * 22 * bk]);
      for (const [dx, dy] of buoc) {
        const bx2 = Math.max(bx, VUNG[0] + c.w / 2), by2 = Math.max(by, VUNG[1] + c.h / 2), by3 = Math.max(by, Hh - VUNG[3] + c.h / 2);
        const x = THREE.MathUtils.clamp(x0 + dx, bx2, W - bx2), y = THREE.MathUtils.clamp(y0 + dy, by2, Hh - by3);
        const r = hop(c, x, y);
        const cheChu = tamKinh && (o.chuNoiChu || o.chuNoi || []).some((t) => { const nx = Math.max(t[0], Math.min(x, t[2])), ny = Math.max(t[1], Math.min(y, t[3])); return Math.hypot(x - nx, y - ny) < H.R + 14; });
        if (hopLe(r) && !cheChu && satVat(r, vat)) return { x, y, r };
      }
      return null;
    };
    const nt = (k, hep = false) => { const t = noteTex(hep ? ngatDong(K[k], 16) : K[k], { fs: 64 }); if (hep) t.userData.src = { text: K[k], opt: { fs: 64 } }; return mon(t, coChu); };
    const n = o.neo;
    const cPhim = cum([mon(noteTex(K.phim, { fs: 64, color: HEX.giay, gach: HEX.do }), coChu * 1.12)]);
    let pPhim = null;
    const hp = o.phimHop;
    const DBG = LOPDBG; for (const k of ['mep', 'nhin', 'chu', 'nhin2', 'hop']) DBG[k] = 0;
    DBG.tranh = tranh.map((r) => r.map(Math.round)); DBG.vung = VUNG.map(Math.round);
    if (hp) {
      const nhin = H.R / H.mag, cx = (hp[0] + hp[2]) / 2, cy = (hp[1] + hp[3]) / 2;
      const trongNhin = (r, lx, ly, le) => [[r[0], r[1]], [r[2], r[1]], [r[0], r[3]], [r[2], r[3]]].every(([x, y]) => Math.hypot(x - lx, y - ly) <= nhin - le);
      const kepX = H.R + 12, cachChu = (lx, ly) => (o.chuNoiChu || o.chuNoi || []).every((t) => { const nx = Math.max(t[0], Math.min(lx, t[2])), ny = Math.max(t[1], Math.min(ly, t[3])); return Math.hypot(lx - nx, ly - ny) >= H.R + 14; });
      const thu = [];
      for (let r = 0; r <= 16; r++) for (let a = 0; a < (r ? 12 : 1); a++) thu.push([Math.cos(a / 12 * Math.PI * 2) * r * 9, Math.sin(a / 12 * Math.PI * 2) * r * 9]);
      const coThu = [1.12, 1.0, 0.92].slice(o.coTu || 0).map((k) => Math.max(k * coChu, 18.2 / H.mag)).filter((v, i, arr) => arr.indexOf(v) === i);
      const ve0 = [];
      for (const co of coThu) {
        const cP = cum([mon(noteTex(K.phim, { fs: 64, color: HEX.giay, gach: HEX.do }), co)]);
        for (const viTri of ['duoi', 'tren', 'trai', 'phai']) {
          for (const [dx, dy0] of thu) {
            const lx = cx + dx + (viTri === 'trai' ? -cP.w / 2 - 4 : viTri === 'phai' ? cP.w / 2 + 4 : 0), ly = cy + dy0 + (viTri === 'duoi' ? cP.h / 2 + 4 : viTri === 'tren' ? -cP.h / 2 - 4 : 0);
            if (lx < kepX || lx > W - kepX || ly < kepX || ly > Hh - day - kepX) { DBG.mep++; continue; }
            if (!trongNhin(hp, lx, ly, 3)) { DBG.nhin++; continue; }
            if (!cachChu(lx, ly)) { DBG.chu++; continue; }
            const nx = viTri === 'trai' ? hp[0] - 8 - cP.w / 2 : viTri === 'phai' ? hp[2] + 8 + cP.w / 2 : lx;
            const ny = viTri === 'duoi' ? hp[3] + 8 + cP.h / 2 : viTri === 'tren' ? hp[1] - 8 - cP.h / 2 : cy;
            const rc = hop(cP, nx, ny);
            if (!trongNhin(rc, lx, ly, 2)) { DBG.nhin2++; continue; }
            if (!hopLe(rc)) { DBG.hop++; continue; }
            daDat.push([rc[0] - 10, rc[1] - 10, rc[2] + 10, rc[3] + 10]); LOPTEN.push(cP.ten); veCum(cP, nx, ny);
            pPhim = { x: lx, y: ly, r: rc };
            break;
          }
          if (pPhim) break;
        }
        if (pPhim) break;
        ve0.push(cP);
      }
      if (!pPhim) for (const cP of ve0) cP.ds.forEach((d) => d.tex.dispose());
    }
    if (!pPhim) pPhim = datCum(cPhim, n.phim.x, n.phim.y, true) || { x: n.phim.x, y: n.phim.y };
    const nh2 = H.R / H.mag + 10, oKinh = [pPhim.x - nh2, pPhim.y - nh2, pPhim.x + nh2, pPhim.y + nh2];
    if (dt) kinh0 = { x: pPhim.x, y: pPhim.y, r: H.R / H.mag - 4 }; else daDat.push(oKinh);
    const conLai = [
      ['duoi', () => [cum([nt('duoi')]), n.duoi.x, n.duoi.y]],
      ['tay', () => [cum(dt ? [nt('tay', true)] : [mon(veBanTay(), 50, true), nt('tay', true)]), n.tay.x, n.tay.y]],
      ['tui', () => [cum(dt ? [nt('tui', true)] : [mon(veTuiAo(), 50, true), nt('tui', true)]), n.tui.x, n.tui.y]],
      ['son', () => [cum([nt('son', true)]), n.son.x, n.son.y]],
      ['vet', () => [cum(dt ? [nt('vet', true)] : [mon(veDauGiay(), 44, true), nt('vet')]), n.vet.x, n.vet.y]],
      ['den', () => [cum(dt ? [nt('den', true)] : [mon(veDongHo(), 58, true), nt('den')]), n.den.x, n.den.y]],
    ];
    const thuTu = dt ? ['tay', 'tui', 'son', 'vet', 'den', 'duoi'] : ['duoi', 'tay', 'tui', 'son', 'vet', 'den'];
    if (dt) {
      const bienThe = (k) => { const out = [], da = new Set();
        for (const td of [22, 16, 12]) { const ls = ngatDong(K[k], td), key = ls.join('|'); if (da.has(key)) continue; da.add(key);
          const t = noteTex(ls, { fs: 64, chat: true }); t.userData.src = { text: K[k], opt: { fs: 64, chat: true } }; out.push(cum([mon(t, coChu)])); }
        return out; };
      const ds = thuTu.filter((ten) => n[ten]).map((ten) => ({ ten, bt: bienThe(ten), x: n[ten].x, y: n[ten].y, vat: (o.vat || {})[ten] || null }));
      const thu = [ds];
      for (let k = 1; k < ds.length * 2; k++) { const a = k < ds.length ? ds : ds.slice().reverse(), j = k % ds.length; thu.push([...a.slice(j), ...a.slice(0, j)]); }
      let tot = null;
      for (const ord of thu) {
        const nD = daDat.length, nT = tamDat.length, kq = []; let xa = 0;
        for (const it of ord) {
          let best = null;
          for (const c of it.bt) { const p = timCho(c, it.x, it.y, false, it.vat); if (p) { const d = Math.hypot(p.x - it.x, p.y - it.y); if (!best || d < best.d) best = { c, p, d }; } }
          if (best) { const r = best.p.r; daDat.push([r[0] - 10, r[1] - 10, r[2] + 10, r[3] + 10]); tamDat.push({ c: [best.p.x, best.p.y], r }); kq.push([it, best.c, best.p]); xa += best.d; }
        }
        daDat.length = nD; tamDat.length = nT;
        const diem = kq.length * 1e5 - xa;
        if (!tot || diem > tot.diem) tot = { diem, kq };
        if (kq.length === ds.length) break;
      }
      const dung = new Set(tot.kq.map(([, c]) => c));
      for (const [, c, p] of tot.kq) datO(c, p);
      for (const it of ds) { if (!tot.kq.some(([j]) => j === it)) LOPBO.push(it.ten); for (const c of it.bt) if (!dung.has(c)) for (const d of c.ds) d.tex.dispose(); }
      for (const ten of thuTu) if (!n[ten]) LOPBO.push(ten + ' (ngoài khung)');
    } else {
      const ds = thuTu.map((ten) => { const [c, x, y] = conLai.find((q) => q[0] === ten)[1](); return { ten, c, x, y }; });
      const thu = [ds];
      if (dt) for (let k = 1; k < ds.length * 2; k++) { const a = k < ds.length ? ds : ds.slice().reverse(), j = k % ds.length; thu.push([...a.slice(j), ...a.slice(0, j)]); }
      let tot = null;
      for (const ord of thu) {
        const nD = daDat.length, nT = tamDat.length, kq = []; let xa = 0;
        for (const it of ord) { const p = timCho(it.c, it.x, it.y); if (p) { daDat.push([p.r[0] - 10, p.r[1] - 10, p.r[2] + 10, p.r[3] + 10]); tamDat.push({ c: [p.x, p.y], r: p.r }); kq.push([it, p]); xa += Math.hypot(p.x - it.x, p.y - it.y); } }
        daDat.length = nD; tamDat.length = nT;
        const diem = kq.length * 1e5 - xa;
        if (!tot || diem > tot.diem) tot = { diem, kq };
        if (kq.length === ds.length) break;
      }
      for (const [it, p] of tot.kq) datO(it.c, p);
      for (const it of ds) if (!tot.kq.some(([j]) => j === it)) { LOPBO.push(it.c.ten); for (const d of it.c.ds) d.tex.dispose(); }
    }
    datLop(H.lop);
    LOPDAT.length = 0; LOPDAT.push(...daDat.filter((r) => r !== oKinh));
    if (chiMat.uniforms.uSach) { const u = chiMat.uniforms.uSach.value; const hs = LOPDAT.map((r) => [r[0] + 10, r[1] + 10, r[2] - 10, r[3] - 10]); for (let i = 0; i < 8; i++) { const h = hs[i]; if (h) u[i].set(h[0], h[1], h[2], h[3]); else u[i].set(0, 0, -1, -1); } }
    return { x: pPhim.x, y: pPhim.y };
  }
  const NHO = new Map();
  const ntC = (text, opt) => { const key = (Array.isArray(text) ? text.join('|') : text) + JSON.stringify(opt); let t = NHO.get(key); if (!t) { t = noteTex(text, opt); NHO.set(key, t); } return t; };
  function ghiTruoc(K, dt, tenCum = TEN_LAT, optChinh = OPT_CHINH3) {
    const ds = [[K.chinh, optChinh]];
    for (const k of tenCum) { if (!K[k]) continue; const da = new Set(); for (const td of [22, 16, 12]) { const ls = ngatDong(K[k], td), key = ls.join('|'); if (da.has(key)) continue; da.add(key); ds.push([ls, { fs: 64, chat: dt }]); } }
    const viec = []; for (let i = 0; i < ds.length; i += 2) viec.push(() => { for (const [t, op] of ds.slice(i, i + 2)) ntC(t, op); });
    return viec;
  }
  function* dungLopLatG(o) {
    xoaLopGiu();
    const { cam, K } = o;
    const cp = cam.position;
    const W = o.W, Hh = o.H, day = o.day || 46, dt = o.kieu === 'dt';
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    const pl = new THREE.Plane().setFromNormalAndCoplanarPoint(fwd.clone().negate(), cp.clone().addScaledVector(fwd, o.dMat || 1));
    const matPx = (x, y) => { const q = new THREE.Vector3(x / W * 2 - 1, 1 - y / Hh * 2, 0.5).unproject(cam); return new THREE.Ray(cp, q.sub(cp).normalize()).intersectPlane(pl, new THREE.Vector3()); };
    const mPx = (() => { const a1 = matPx(W / 2, Hh / 2), a2 = matPx(W / 2, Hh / 2 + 100); return a1 && a2 ? a1.distanceTo(a2) / 100 : 0.0012; })();
    const tam = 2 * H.R / H.mag, vua = tam * 0.86;
    const coChu = dt || Hh < 560 ? 13.5 : 17;
    LOPCO.length = 0; LOPTEN.length = 0; LOPBO.length = 0; CUMK.length = 0;
    const mon = (tex, cao) => {
      const kich = (t) => { const h0 = cao * (t.userData.h / t.userData.fs); return [h0 * t.userData.k, h0]; };
      let [w, h] = kich(tex);
      if (w > vua && tex.userData.src) {
        for (let td = 21; td >= 9; td -= 2) {
          const t2 = ntC(ngatDong(tex.userData.src.text, td), tex.userData.src.opt), [w2, h2] = kich(t2);
          if (w2 <= vua || td <= 10) { if (!t2.userData.src) t2.userData.src = tex.userData.src; tex = t2; w = w2; h = h2; break; }
        }
      }
      let k = 1;
      if (w > vua) { k = vua / w; w *= k; h *= k; }
      LOPCO.push(+(cao * k * H.mag).toFixed(1));
      return { tex, w, h };
    };
    const cum = (ds) => ({ ds, w: Math.max(...ds.map((d) => d.w)), h: ds.reduce((s2, d) => s2 + d.h, 0), ten: (ds.find((d) => d.tex.userData.src) || ds[0]).tex.userData.src?.text?.slice(0, 18) || 'hinh' });
    const tranh = (o.tranh || []).map((r) => [r[0] - 24, r[1] - 24, r[2] + 24, r[3] + 24]);
    const daDat = [], tamDat = [];
    const giao = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    const hop = (c, x, y) => [x - c.w / 2, y - c.h / 2, x + c.w / 2, y + c.h / 2];
    const kcHop = (x, y, t) => Math.hypot(x - Math.max(t[0], Math.min(x, t[2])), y - Math.max(t[1], Math.min(y, t[3])));
    const nhinK = H.R / H.mag, bienK = H.R + 12 - nhinK + 6;
    const VUNG = [Math.max(11.5, bienK), Math.max(11.5, bienK), W - Math.max(11.5, bienK), Hh - day - Math.max(11.5, bienK)];
    const nhinG = dt || o.kieu === 'ngang' ? nhinK * 0.6 : nhinK - 4;
    const gian = (r) => { const x = (r[0] + r[2]) / 2, y = (r[1] + r[3]) / 2; return tamDat.every((q) => kcHop(x, y, q.r) >= nhinG && kcHop(q.c[0], q.c[1], r) >= nhinG); };
    let kinh0 = null;
    const ngoaiKinh0 = (r) => !kinh0 || kcHop(kinh0.x, kinh0.y, r) >= kinh0.r;
    const trongDa = (r, da) => {
      if (!da) return true;
      const inP = ([x, y]) => { let sg = 0; for (let i = 0; i < da.length; i++) { const a = da[i], b = da[(i + 1) % da.length]; const c = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x); if (Math.abs(c) < 1e-9) continue; const d = Math.sign(c); if (!sg) sg = d; else if (d !== sg) return false; } return true; };
      return [[r[0], r[1]], [r[2], r[1]], [r[0], r[3]], [r[2], r[3]]].every(inP);
    };
    const camSat = (o.camSat || []).map((r) => [r[0] - 4, r[1] - 4, r[2] + 4, r[3] + 4]);
    const hopLe = (r, da) => r[0] >= VUNG[0] && r[2] <= VUNG[2] && r[1] >= VUNG[1] && r[3] <= VUNG[3] && !tranh.some((t) => giao(r, t)) && !camSat.some((t) => giao(r, t)) && !daDat.some((t) => giao(r, t)) && gian(r) && ngoaiKinh0(r) && trongDa(r, da);
    const kcDa = (x, y, da) => {
      let inn = true, sg = 0, d = 1e9;
      for (let i = 0; i < da.length; i++) {
        const a = da[i], b = da[(i + 1) % da.length], ex = b.x - a.x, ey = b.y - a.y, l2 = ex * ex + ey * ey || 1;
        const c2 = ex * (y - a.y) - ey * (x - a.x); const sgn = Math.sign(c2); if (sgn) { if (!sg) sg = sgn; else if (sgn !== sg) inn = false; }
        const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (y - a.y) * ey) / l2)); d = Math.min(d, Math.hypot(x - a.x - ex * t, y - a.y - ey * t));
      }
      return inn ? 0 : d;
    };
    const satVat = (r, vat) => {
      if (!vat || !vat.length) return true;
      const nh = H.R / H.mag, kx = (x) => Math.min(W - H.R - 12, Math.max(H.R + 12, x)), ky = (y) => Math.min(Hh - day - H.R - 12, Math.max(H.R + 12, y));
      const goc = [[r[0], r[1]], [r[2], r[1]], [r[0], r[3]], [r[2], r[3]]], bx = (r[0] + r[2]) / 2, by = (r[1] + r[3]) / 2;
      const tM = (vat.tMax ?? o.vatGan ?? 1) + 0.0001;
      for (const q of vat) for (let t = 0; t <= tM; t += 0.1) {
        const cx = kx(bx + (q.x - bx) * t), cy = ky(by + (q.y - by) * t);
        if (goc.every(([x, y]) => Math.hypot(x - cx, y - cy) <= nh - 3) && Math.hypot(q.x - cx, q.y - cy) <= nh - 6) return true;
      }
      return false;
    };
    const veCum = (c, x, y) => {
      let yy = y - c.h / 2; const ms = [];
      for (const d of c.ds) {
        const p2 = matPx(x, yy + d.h / 2);
        if (p2) { const mm = new THREE.Mesh(new THREE.PlaneGeometry(d.w * mPx, d.h * mPx), new THREE.MeshBasicMaterial({ map: d.tex, transparent: true, depthTest: false })); mm.position.copy(p2); mm.quaternion.copy(cam.quaternion); mm.renderOrder = 5; lensScene.add(mm); ms.push(mm); }
        yy += d.h;
      }
      CUMK.push({ ms, r: [x - c.w / 2 + c.w * 0.1, y - c.h / 2 + c.h * 0.14, x + c.w / 2 - c.w * 0.1, y + c.h / 2 - c.h * 0.14] });
    };
    const datO = (c, p) => { const r = p.r; daDat.push([r[0] - 10, r[1] - 10, r[2] + 10, r[3] + 10]); tamDat.push({ c: [p.x, p.y], r }); LOPTEN.push(c.ten); veCum(c, p.x, p.y); };
    const timCho = (c, x0, y0, tamKinh = false, da = null, vat = null, dk = null) => {
      const nhin = H.R / H.mag;
      const giua = tamKinh && o.kinhGiua;
      const bx = tamKinh ? Math.max(12 + c.w / 2, H.R + 12 - (giua ? 0 : Math.max(0, nhin - c.w / 2 - 6))) : 12 + c.w / 2;
      const by = tamKinh ? Math.max(12 + c.h / 2, H.R + 12 - (giua ? 0 : Math.max(0, nhin - c.h / 2 - 6))) : 12 + c.h / 2;
      const bk = dt ? 0.5 : 1, nr = Math.round(16 / bk), buoc = [];
      for (let r = 0; r <= nr; r++) for (const [sx, sy] of [[1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]]) buoc.push([sx * r * 24 * bk, sy * r * 18 * bk]);
      for (const [dx, dy] of buoc) {
        const bx2 = Math.max(bx, VUNG[0] + c.w / 2), by2 = Math.max(by, VUNG[1] + c.h / 2), by3 = Math.max(by, Hh - VUNG[3] + c.h / 2, giua ? day + H.R + 12 : 0);
        const x = THREE.MathUtils.clamp(x0 + dx, bx2, W - bx2), y = THREE.MathUtils.clamp(y0 + dy, by2, Hh - by3);
        const r = hop(c, x, y);
        const cheChu = tamKinh && (o.chuNoi || []).some((t) => kcHop(x, y, t) < H.R + 14);
        const cheCan = tamKinh && o.canKinh && (o.chuNoi || []).some((t) => { for (let q = 0; q <= 6; q++) { const dd = H.R + 4 + (q / 6) * (H.R * 0.62 + 8); if (kcHop(x + dd * 0.7071, y + dd * 0.7071, t) < 10) return true; } return false; });
        const deLoi = tamKinh && ((o.loi && kcDa(x, y, o.loi) < H.R - 2) || (o.loiThem || []).some((L) => kcDa(x, y, L) < H.R - 2));
        if (hopLe(r, da) && !cheChu && !cheCan && !deLoi && satVat(r, vat) && (!dk || dk(x, y))) return { x, y, r };
      }
      return null;
    };
    const n = o.neo || {}, trong = o.trong || {}, vatO = o.vat || {};
    let pChinh = null;
    for (const k of [1.3, 1.18, 1.06, 0.96]) {
      const c = cum([mon(ntC(K.chinh, o.optChinh || OPT_CHINH3), Math.max(coChu * k, 18.4 / H.mag))]);
      const p = n.chinh && timCho(c, n.chinh.x, n.chinh.y, true, trong.chinh);
      if (p) { datO(c, p); pChinh = p; break; }
      yield;
    }
    if (!pChinh && n.chinh) {
      const L = o.loi, tam = L ? { x: L.reduce((a, q) => a + q.x, 0) / 4, y: L.reduce((a, q) => a + q.y, 0) / 4 } : null;
      const tr = o.truc || { x: 0, y: -1 }, ng = { x: -tr.y, y: tr.x };
      const huong = (x, y) => { if (!tam) return 'xuong'; const vx = x - tam.x, vy = y - tam.y, doc2 = vx * tr.x + vy * tr.y, ngang = vx * ng.x + vy * ng.y;
        return Math.abs(ngang) > Math.abs(doc2) * 0.8 ? (ngang < 0 ? 'phai' : 'trai') : (doc2 > 0 ? 'xuong' : 'len'); };
      for (const h of ['phai', 'trai', 'len', 'xuong']) {
        const c = cum([mon(ntC(K.chinh, { ...(o.optChinh || OPT_CHINH3), mui: h }), coChu * 1.06)]);
        const p = timCho(c, n.chinh.x, n.chinh.y, true, null, null, (x, y) => huong(x, y) === h);
        if (p) { datO(c, p); pChinh = p; break; }
        yield;
      }
      if (!pChinh) LOPBO.push('No rain in this on');
    }
    if (!pChinh) pChinh = { x: n.chinh ? n.chinh.x : W / 2, y: n.chinh ? n.chinh.y : Hh / 2 };
    kinh0 = { x: pChinh.x, y: pChinh.y, r: nhinK - 2 };
    const ten = (o.tenCum || TEN_LAT).filter((t) => n[t] && K[t]);
    const bienThe = (k) => { const out = [], da = new Set();
      for (const td of [22, 16, 12]) { const ls = ngatDong(K[k], td), key = ls.join('|'); if (da.has(key)) continue; da.add(key);
        const t = ntC(ls, { fs: 64, chat: dt }); t.userData.src = { text: K[k], opt: { fs: 64, chat: dt } }; out.push(cum([mon(t, coChu)])); }
      return out; };
    const ds = ten.map((t) => ({ ten: t, bt: bienThe(t), x: n[t].x, y: n[t].y, da: trong[t] || null, vat: vatO[t] || null }));
    const thu = [ds];
    for (let k = 1; k < ds.length * 2; k++) { const a = k < ds.length ? ds : ds.slice().reverse(), j = k % ds.length; thu.push([...a.slice(j), ...a.slice(0, j)]); }
    let tot = null;
    for (const ord of thu.slice(0, dt ? 6 : thu.length)) {
      yield;
      const nD = daDat.length, nT = tamDat.length, kq = []; let xa = 0;
      for (const it of ord) {
        let best = null;
        for (const c of it.bt) { const p = timCho(c, it.x, it.y, false, it.da, it.vat); if (p) { const d = Math.hypot(p.x - it.x, p.y - it.y); if (!best || d < best.d) best = { c, p, d }; } }
        if (best) { const r = best.p.r; daDat.push([r[0] - 10, r[1] - 10, r[2] + 10, r[3] + 10]); tamDat.push({ c: [best.p.x, best.p.y], r }); kq.push([it, best.c, best.p]); xa += best.d; }
      }
      daDat.length = nD; tamDat.length = nT;
      const diem = kq.reduce((a2, [it]) => a2 + ((o.trongSo && o.trongSo[it.ten]) || 1), 0) * 1e5 - xa;
      if (!tot || diem > tot.diem) tot = { diem, kq };
      if (kq.length === ds.length) break;
    }
    const dung = new Set(tot.kq.map(([, c]) => c));
    for (const [, c, p] of tot.kq) datO(c, p);
    for (const it of ds) { if (!tot.kq.some(([j]) => j === it)) LOPBO.push(it.ten); }
    datLop(H.lop);
    LOPDAT.length = 0; LOPDAT.push(...daDat);
    const u = chiMat.uniforms.uSach.value; const hs = LOPDAT.map((r) => [r[0] + 10, r[1] + 10, r[2] - 10, r[3] - 10]);
    for (let i = 0; i < 8; i++) { const h = hs[i]; if (h) u[i].set(h[0], h[1], h[2], h[3]); else u[i].set(0, 0, -1, -1); }
    return { x: pChinh.x, y: pChinh.y };
  }
  function dungLopLat(o) { const g = dungLopLatG(o); let r; do { r = g.next(); } while (!r.done); return r.value; }
  function dungLopLatBuoc(o) { const g = dungLopLatG(o); return () => { const r = g.next(); return r.done ? { xong: true, kq: r.value } : { xong: false }; }; }
  const LOPCO = [];
  const LOPTEN = [], LOPBO = [];
  const LOPDAT = [];
  const LOPDBG = {};
  const CUMK = [];
  const UPV = new THREE.Vector3(0, 1, 0);

  return { H, lensScene, gbufFor, gbufMat, anDi, hienKhiSoi, giuMauThat, resize, datRes, render, dungLop, dungLopPho, dungLopLat, dungLopLatBuoc, ghiTruoc, datLop, lamNong, lamNongAsync, chiMat, LOPDAT, LOPCO, LOPTEN, LOPBO, LOPDBG };
}
