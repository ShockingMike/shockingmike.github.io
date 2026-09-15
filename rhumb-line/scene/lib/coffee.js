/* Coffee surface and steam.
   The surface is a polar mesh displaced in the vertex shader: a tilted plane (the damped-spring slope, in cup space)
   plus up to three expanding ripple rings. The fragment shader rebuilds the exact normal per pixel, so the lamp's
   highlight slides as the liquid moves, and thickens the crema on the side the coffee piles up against. */
import * as THREE from 'three';
import { GLSL_NOISE } from './util.js';

const SURFACE_PARS = /* glsl */`
uniform vec2 uSlope;
uniform vec4 uRip[3];
uniform float uTime;
uniform float uR;
float coffeeH(vec2 p, out vec2 grad) {
  float h = dot(p, uSlope);
  grad = uSlope;
  float r = length(p);
  // bowl the surface slightly against the slope (first slosh mode is not a perfect plane)
  float bowl = dot(uSlope, uSlope) * 0.9;
  h += bowl * (r * r / uR - uR * 0.5);
  grad += bowl * 2.0 * p / uR;
  for (int i = 0; i < 3; i++) {
    vec4 R = uRip[i];
    if (R.x <= 0.0) continue;
    float age = uTime - R.y;
    if (age < 0.0 || age > 3.0) continue;
    vec2 d = p - R.zw;
    float rr = length(d) + 1e-5;
    float k = 520.0, om = 26.0;
    float front = smoothstep(age * 0.09 + 0.004, age * 0.09 - 0.004, rr);
    float env = R.x * exp(-age * 1.6) * front * exp(-rr * 18.0);
    float ph = k * rr - om * age;
    h += env * sin(ph);
    grad += env * k * cos(ph) * d / rr;
  }
  // the wall pins the edge: fade the ripples out at the rim
  return h;
}
`;

export function createCoffee(radius) {
  const geo = new THREE.CircleGeometry(radius, 96, 0, Math.PI * 2);
  // a polar grid gives the ripples enough vertices
  const rings = 28, segs = 96, pos = [], idx = [], uvs = [];
  for (let i = 0; i <= rings; i++) {
    const r = (i / rings) * radius;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      pos.push(Math.cos(a) * r, 0, -Math.sin(a) * r);
      uvs.push(0.5 + (Math.cos(a) * r) / (2 * radius), 0.5 + (Math.sin(a) * r) / (2 * radius));
    }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
    const a = i * (segs + 1) + j, b = a + segs + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  geo.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);

  const uniforms = {
    uSlope: { value: new THREE.Vector2() },
    uRip: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
    uTime: { value: 0 },
    uR: { value: radius }
  };
  const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0, clearcoat: 0.0, ior: 1.34, specularIntensity: 1, envMapIntensity: 1.1 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + SURFACE_PARS + '\nvarying vec2 vCup;\nvarying vec3 vAx;\nvarying vec3 vAy;\nvarying vec3 vAz;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec2 cg;
        vec2 cp = position.xz;
        float edge = 1.0 - smoothstep(uR * 0.94, uR, length(cp));
        transformed.y += coffeeH(cp, cg) * mix(1.0, 0.85, 1.0 - edge);
        vCup = cp;
        vAx = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
        vAy = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
        vAz = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + SURFACE_PARS + GLSL_NOISE + '\nvarying vec2 vCup;\nvarying vec3 vAx;\nvarying vec3 vAy;\nvarying vec3 vAz;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float r = length(vCup) / uR;
          vec2 dir = vCup / max(length(vCup), 1e-5);
          float sl = length(uSlope);
          float pile = sl > 1e-5 ? clamp(dot(dir, uSlope / sl), 0.0, 1.0) * clamp(sl / 0.12, 0.0, 1.0) : 0.0;
          float width = 0.17 + 0.30 * pile;
          float mott = fbm(vCup * 900.0 + vec2(uTime * 0.05, 0.0));
          float ring = smoothstep(1.0 - width - 0.07 + mott * 0.08, 1.0 - width + 0.05 + mott * 0.08, r);
          vec3 coffee = vec3(0.020, 0.009, 0.004);
          vec3 crema = mix(vec3(0.20, 0.10, 0.045), vec3(0.42, 0.24, 0.11), mott) * (0.8 + 0.3 * smoothstep(0.9, 1.0, r));
          float bubbles = smoothstep(0.72, 0.9, vnoise(vCup * 2400.0)) * ring;
          diffuseColor.rgb = mix(coffee, crema, ring * 0.92) * (1.0 - bubbles * 0.35);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(0.1, 0.42, smoothstep(0.6, 0.9, length(vCup) / uR));`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        {
          vec2 cg;
          float hh = coffeeH(vCup, cg);
          vec3 nl = normalize(vec3(-cg.x, 1.0, -cg.y));
          normal = normalize(vAx * nl.x + vAy * nl.y + vAz * nl.z);
          nonPerturbedNormal = normal;
        }`);
  };
  mat.customProgramCacheKey = () => 'coffee-surface';
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.name = 'coffee';
  return { mesh, uniforms };
}

export function createSteam(count = 30) {
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.attributes.position);
  geo.setAttribute('uv', base.attributes.uv);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = (i + 0.5) / count + Math.random() * 0.02;
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geo.instanceCount = count;
  // uSwirl 0..1: the steam curls round the cup's axis as it rises (the cup is open)
  const uniforms = { uTime: { value: 0 }, uStrength: { value: 0.6 }, uLean: { value: new THREE.Vector2() }, uSwirl: { value: 0 }, uTint: { value: new THREE.Color(0.9, 0.86, 0.8) } };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      attribute float aSeed;
      uniform float uTime; uniform vec2 uLean; uniform float uSwirl;
      varying vec2 vUv; varying float vAlpha; varying float vSeed;
      void main() {
        float life = 2.7;
        float age = fract(uTime / life + aSeed * 7.31);
        float h = age * 0.11;
        vec3 c = vec3(0.0);
        float s1 = aSeed * 43.1;
        c.x = sin(s1 + age * 3.0 + uTime * 0.6) * 0.004 * (0.3 + age) + (fract(s1) - 0.5) * 0.03;
        c.z = cos(s1 * 1.3 + age * 2.4 + uTime * 0.5) * 0.004 * (0.3 + age) + (fract(s1 * 3.7) - 0.5) * 0.03;
        c.x += uLean.x * h * h * 9.0 + sin(uTime * 1.3 + s1) * 0.02 * age * age;
        c.z += uLean.y * h * h * 9.0;
        float sw = uSwirl * (age * 5.5 + uTime * 1.1);
        c.xz = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * c.xz * (1.0 + uSwirl * age * 0.8);
        c.y = h;
        float size = mix(0.016, 0.07, sqrt(age));
        vec4 mv = modelViewMatrix * vec4(c, 1.0);
        mv.xy += position.xy * size;
        vUv = uv; vSeed = aSeed;
        vAlpha = smoothstep(0.0, 0.18, age) * (1.0 - smoothstep(0.45, 1.0, age));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform float uStrength; uniform vec3 uTint;
      varying vec2 vUv; varying float vAlpha; varying float vSeed;
      ${GLSL_NOISE}
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        float n = fbm(p * 3.2 + vec2(vSeed * 17.0, -uTime * 0.75 + vSeed * 5.0));
        float wisp = smoothstep(0.35, 0.8, n) * (1.0 - smoothstep(0.35, 1.0, r));
        float a = wisp * vAlpha * uStrength * 0.16;
        if (a < 0.002) discard;
        gl_FragColor = vec4(uTint * a, a);
      }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.name = 'steam';
  return { mesh, uniforms };
}
