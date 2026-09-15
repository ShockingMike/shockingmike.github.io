/* Shared helpers: maths, easing, seeded random, filleted lathe profiles (every edge rounded), box-projected UVs,
   and the GLSL noise used by all procedural shaders. */
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
/* Let the page breathe during a long build without paying a whole frame per step (a throttled or emulated device may
   paint only ~10 frames a second while loading): a zero-delay task after ~25 ms of work, a real frame (so the loader
   repaints its percent) after ~80 ms. */
let lastTask = 0, lastPaint = 0, frameEma = 16;
export async function breathe() {
  const now = performance.now();
  // paint less often where a frame is expensive, but at least ~2.5 times a second
  const paintEvery = Math.min(400, Math.max(80, frameEma * 2.5));
  if (now - lastPaint > paintEvery) {
    await nextFrame();
    const t = performance.now();
    frameEma += (Math.min(500, t - now) - frameEma) * 0.3;
    lastPaint = lastTask = t;
  } else if (now - lastTask > 25) { await new Promise((r) => setTimeout(r, 0)); lastTask = performance.now(); }
}
/* Measured cost of one frame while loading (ms, smoothed). */
export const frameCost = () => frameEma;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1D value noise in [0, 1].
export function vnoise(x, seed = 0) {
  const h = (n) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}

/* A 2D profile [[x, y, filletRadius?], ...] with rounded corners, for lathes and extrusions. */
export function fillet(pts, seg = 5) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], rad = p[2] || 0;
    if (!rad || i === 0 || i === pts.length - 1) { out.push([Math.max(0, p[0]), p[1]]); continue; }
    const a = pts[i - 1], b = pts[i + 1];
    let ux = a[0] - p[0], uy = a[1] - p[1]; const la = Math.hypot(ux, uy); ux /= la; uy /= la;
    let vx = b[0] - p[0], vy = b[1] - p[1]; const lb = Math.hypot(vx, vy); vx /= lb; vy /= lb;
    const ang = Math.acos(clamp(ux * vx + uy * vy, -1, 1));
    if (ang < 1e-3 || Math.PI - ang < 1e-3) { out.push([p[0], p[1]]); continue; }
    let t = rad / Math.tan(ang / 2), r = rad;
    const tmax = Math.min(la, lb) * 0.5;
    if (t > tmax) { t = tmax; r = t * Math.tan(ang / 2); }
    const sx = p[0] + ux * t, sy = p[1] + uy * t, ex = p[0] + vx * t, ey = p[1] + vy * t;
    let bx = ux + vx, by = uy + vy; const bl = Math.hypot(bx, by); bx /= bl; by /= bl;
    const dc = r / Math.sin(ang / 2), cx = p[0] + bx * dc, cy = p[1] + by * dc;
    const a0 = Math.atan2(sy - cy, sx - cx), a1 = Math.atan2(ey - cy, ex - cx);
    let da = a1 - a0; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    for (let k = 0; k <= seg; k++) { const aa = a0 + (da * k) / seg; out.push([Math.max(0, cx + Math.cos(aa) * r), cy + Math.sin(aa) * r]); }
  }
  return out;
}

/* Lathe from a filleted profile. v runs along the profile by arc length so bands and textures do not stretch. */
export function lathe(pts, segments = 64, filletSeg = 5) {
  const prof = fillet(pts, filletSeg);
  const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), segments);
  const lens = [0];
  for (let i = 1; i < prof.length; i++) lens.push(lens[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
  const total = lens[lens.length - 1] || 1;
  const uv = g.attributes.uv, n = prof.length;
  for (let i = 0; i <= segments; i++) for (let j = 0; j < n; j++) uv.setY(i * n + j, lens[j] / total);
  g.userData.profileLength = total;
  return g;
}

/* Box-project object-space UVs so wood grain (texture u) runs along a chosen axis, in metres / size. */
export function boxUV(geo, { size = [1, 1], offset = [0, 0], axis = 'x' } = {}) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    let u, v;
    if (axis === 'x') { if (ax > ay && ax > az) { u = z; v = y; } else { u = x; v = ay > az ? z : y; } }
    else if (axis === 'y') { if (ay > ax && ay > az) { u = x; v = z; } else { u = y; v = ax > az ? z : x; } }
    else { if (az > ax && az > ay) { u = x; v = y; } else { u = z; v = ax > ay ? y : x; } }
    uv.setXY(i, (u + offset[0]) / size[0], (v + offset[1]) / size[1]);
  }
  uv.needsUpdate = true;
  return geo;
}

export const GLSL_NOISE = /* glsl */`
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = m * p; a *= 0.5; }
  return s;
}
float fbm3o(vec2 p) {
  float s = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = m * p; a *= 0.5; }
  return s;
}
// Periodic value noise and fbm, for textures that tile.
float pnoise(vec2 p, vec2 per) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 i0 = mod(i, per), i1 = mod(i + 1.0, per);
  return mix(mix(hash12(i0), hash12(vec2(i1.x, i0.y)), u.x), mix(hash12(vec2(i0.x, i1.y)), hash12(i1), u.x), u.y);
}
float pfbm(vec2 p, vec2 per) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * pnoise(p, per); p *= 2.0; per *= 2.0; a *= 0.5; }
  return s;
}
`;
