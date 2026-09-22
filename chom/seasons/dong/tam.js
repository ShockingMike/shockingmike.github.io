// Chớm world, season Đông: former stopgaps, no longer used by season.js (core now has lamps with cube shadows,
// core.fx.sparks and core.fx.ribbonSmoke). Kept only as a reference; safe to delete once the core versions are signed off.
//   firePool({ at, size, normal, light, radius, color, gain, caps, lightR, seed })
//     a painted pool of light laid on a wall or the ground, in stepped value bands broken by real brush strokes,
//     added over the surface. caps: occluders (capsules [a, b, r]) whose shadows it cuts out of the pool, with a soft
//     edge that widens away from them (the coals are a small area light). Moving occluders: pool.setCaps(list) each frame.
//   embers({ at, n, spread, rise, twelve })
//     sparks off the coals: they jump, drift in the warm air and go out. twelve: on twos.
import * as THREE from 'three';
import { U } from '../../core/paint.js';

export const MAXCAPS = 24;

const poolVert = /* glsl */`
varying vec3 vWP;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const poolFrag = /* glsl */`
uniform sampler2D tBrush, tWash;
uniform vec4 uLight; uniform vec3 uCol, uN, uAxisU, uAxisV; uniform float uGain, uLightR, uSeed, uBreath;
uniform vec4 uCapA[${MAXCAPS}]; uniform vec4 uCapB[${MAXCAPS}];
uniform vec3 uAir; uniform float uAirNear, uAirFar, uAirMax;
varying vec3 vWP;
float band(float x, float t){ float w = max(fwidth(x), 1e-4) * 0.75; return smoothstep(t - w, t + w, x); }
// closest distance between segment p1-q1 (the ray to the light) and segment p2-q2 (an occluder); s = where on the ray
float segSeg(vec3 p1, vec3 q1, vec3 p2, vec3 q2, out float s){
  vec3 d1 = q1 - p1, d2 = q2 - p2, r = p1 - p2;
  float a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r), c = dot(d1, r), b = dot(d1, d2);
  float t;
  if (e < 1e-6) { s = clamp(-c / a, 0.0, 1.0); t = 0.0; }
  else {
    float den = a * e - b * b;
    s = den > 1e-6 ? clamp((b * f - c * e) / den, 0.0, 1.0) : 0.0;
    t = (b * s + f) / e;
    if (t < 0.0) { t = 0.0; s = clamp(-c / a, 0.0, 1.0); }
    else if (t > 1.0) { t = 1.0; s = clamp((b - c) / a, 0.0, 1.0); }
  }
  return length(p1 + d1 * s - (p2 + d2 * t));
}
void main(){
  vec2 q = vec2(dot(vWP, uAxisU), dot(vWP, uAxisV));
  vec4 b = texture2D(tBrush, q * vec2(0.55, 1.4) + uSeed);
  vec4 b2 = texture2D(tBrush, q.yx * vec2(0.8, 0.3) + uSeed * 1.7);
  vec4 w = texture2D(tWash, q * 0.12 + uSeed);
  vec3 L = uLight.xyz - vWP;
  float d = length(L);
  float att = clamp(1.0 - d / (uLight.w * (0.92 + 0.16 * uBreath)), 0.0, 1.0);
  float ndl = max(dot(uN, L / d), 0.0);
  float e = att * att * (0.3 + 0.7 * ndl);
  float j = (b.b - 0.5) * 0.12 + (b2.a - 0.5) * 0.06 + (w.r - 0.5) * 0.05;
  // a painter's value plan: three steps, the edges bent by the strokes
  float k = 0.34 * band(e + j, 0.035) + 0.33 * band(e + j, 0.14) + 0.33 * band(e + j * 1.4, 0.34);
  if (k <= 0.0) discard;
  // shadows of the occluders, from a small round light: the edge softens with distance from the thing
  float occ = 0.0;
  for (int i = 0; i < ${MAXCAPS}; i++) {
    if (uCapA[i].w <= 0.0) continue;
    float s;
    float dist = segSeg(vWP, uLight.xyz, uCapA[i].xyz, uCapB[i].xyz, s);
    float pen = uLightR * s + 0.01;
    occ = max(occ, 1.0 - smoothstep(uCapA[i].w - pen, uCapA[i].w + pen, dist));
  }
  // cut into a hard painted edge with a brushed wobble, a little light still bounces into the shade
  float sh = band(occ + (b.a - 0.5) * 0.35 + (b2.b - 0.5) * 0.15, 0.5);
  vec3 col = uCol * k * (1.0 - 0.88 * sh) * (0.86 + 0.28 * b.b) * uGain * (0.94 + 0.12 * uBreath);
  float air = uAirMax * pow(smoothstep(uAirNear, uAirFar, length(cameraPosition - vWP)), 1.35);
  gl_FragColor = vec4(col * (1.0 - air), 1.0);
}`;

export function firePool({ at, size = [4, 4], normal = [0, 1, 0], axisU, light, radius = 3, color = '#ff8a40', gain = 1, caps = [], lightR = 0.14, seed = 0.3, offset = 0.012 }) {
  const N = new THREE.Vector3(...normal).normalize();
  const Au = new THREE.Vector3(...(axisU || (Math.abs(N.y) > 0.9 ? [1, 0, 0] : [0, 1, 0]))).normalize();
  const Av = new THREE.Vector3().crossVectors(N, Au).normalize();
  const capA = Array.from({ length: MAXCAPS }, () => new THREE.Vector4());
  const capB = Array.from({ length: MAXCAPS }, () => new THREE.Vector4());
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: {
      tBrush: U.tBrush, tWash: U.tWash, uAir: U.uAir, uAirNear: U.uAirNear, uAirFar: U.uAirFar, uAirMax: U.uAirMax,
      uLight: { value: new THREE.Vector4(...light, radius) }, uCol: { value: new THREE.Color(color) }, uN: { value: N },
      uAxisU: { value: Au }, uAxisV: { value: Av }, uGain: { value: gain }, uLightR: { value: lightR }, uSeed: { value: seed },
      uBreath: { value: 0 }, uCapA: { value: capA }, uCapB: { value: capB },
    },
    vertexShader: poolVert, fragmentShader: poolFrag,
  });
  const g = new THREE.PlaneGeometry(size[0], size[1]);
  // plane: local x -> Au, local y -> Av, local z -> N
  const basis = new THREE.Matrix4().makeBasis(Au, Av, N);
  g.applyMatrix4(basis);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(...at).addScaledVector(N, offset);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.userData.castShadow = false;
  const setCaps = (list) => {
    for (let i = 0; i < MAXCAPS; i++) {
      const c = list[i];
      if (!c) { capA[i].w = 0; continue; }
      capA[i].set(c[0].x, c[0].y, c[0].z, c[2]);
      capB[i].set(c[1].x, c[1].y, c[1].z, 0);
    }
  };
  setCaps(caps);
  return { mesh, setCaps, material: m };
}

// ---------------------------------------------------------------- sparks off the coals
export function embers({ at, n = 36, spread = 0.18, rise = 0.9, life = 1.6, twelve = true, color = '#ffb050' }) {
  const base = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', base.attributes.position);
  g.setAttribute('uv', base.attributes.uv);
  const A = new Float32Array(n * 4);
  let s = 5;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) A.set([r(), r(), r(), r()], i * 4);
  g.setAttribute('aS', new THREE.InstancedBufferAttribute(A, 4));
  g.instanceCount = n;
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: U.uTime, uWind: U.uWind, uRefRight: U.uRefRight, uRefUp: U.uRefUp, uPx: U.uPx, uRefEye: U.uRefEye, uTwelve: { value: twelve ? 1 : 0 }, uAt: { value: new THREE.Vector3(...at) }, uSpread: { value: spread }, uRise: { value: rise }, uLife: { value: life }, uCol: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */`
      attribute vec4 aS;
      uniform float uTime, uTwelve, uSpread, uRise, uLife, uPx; uniform vec3 uAt, uRefRight, uRefUp, uRefEye; uniform vec2 uWind;
      varying vec2 vUv; varying float vA;
      void main(){
        float t = uTwelve > 0.5 ? floor(uTime * 12.0) / 12.0 : uTime;
        // each spark has its own long cycle: most of the time it is not there; now and then it jumps off the coals
        float per = uLife * (2.5 + 3.0 * aS.w);
        float c = mod(t + aS.z * per, per);
        float u = c / uLife;
        float alive = step(u, 1.0);
        vec3 p = uAt + vec3((aS.x - 0.5) * uSpread, 0.0, (aS.y - 0.5) * uSpread);
        // up fast, slowing, wandering in the heat, pushed by the breeze
        float up = uRise * (1.0 - (1.0 - u) * (1.0 - u)) * (0.6 + 0.6 * aS.w);
        p.y += up;
        p.x += sin(u * 7.0 + aS.x * 30.0) * 0.05 * u + (uWind.x - 0.06) * u * 0.6;
        p.z += cos(u * 5.0 + aS.y * 30.0) * 0.05 * u;
        float d = length(uRefEye - p);
        float sz = uPx * d * (2.2 + 1.4 * aS.x) * (1.0 - 0.5 * u);
        vec3 wp = p + (uRefRight * position.x + uRefUp * position.y * 1.6) * sz;
        vUv = uv;
        vA = alive * smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.45, 1.0, u)) * (0.7 + 0.3 * aS.y);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCol; varying vec2 vUv; varying float vA;
      void main(){
        float r = length((vUv - 0.5) * 2.0);
        float a = (1.0 - smoothstep(0.55, 1.0, r)) * vA;
        if (a < 0.02) discard;
        gl_FragColor = vec4(mix(uCol, vec3(1.0, 0.95, 0.8), 1.0 - smoothstep(0.0, 0.5, r)) * a * 1.4, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  mesh.userData.castShadow = false;
  return { mesh, material: m };
}
