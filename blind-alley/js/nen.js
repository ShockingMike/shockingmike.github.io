import * as THREE from 'three';
import { COMMON, C } from './npr.js';

const VERT = `
varying vec2 vUv;
varying vec3 vWorld;
void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;

const FRAG_TUONG = `
${COMMON}
varying vec2 vUv;
varying vec3 vWorld;
uniform vec2 uSize; uniform float uCell; uniform vec3 cMuc, cDem; uniform vec2 uHalo; uniform float uMask;
uniform vec4 uHat;
uniform vec3 uLhead, uStripeAx, uStripe, uBeamAx, uBeam, uNw; uniform float uHeadI, uHeadTexel; uniform mat4 uHeadVP; uniform sampler2D uHeadDepth;
uniform float uGbuf, uSang; uniform vec3 cDoChim; uniform vec4 uSocA, uSocB;
const vec2 PD[8] = vec2[8](vec2(-0.326,-0.406), vec2(-0.840,-0.074), vec2(-0.696, 0.457), vec2(-0.203, 0.621), vec2( 0.962,-0.195), vec2( 0.473,-0.480), vec2( 0.519, 0.767), vec2( 0.185,-0.893));
float boHead(vec3 wp) {
  vec4 lp = uHeadVP * vec4(wp, 1.0);
  vec3 p = lp.xyz / lp.w * 0.5 + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return 1.0;
  float lit = 0.0;
  for (int i = 0; i < 8; i++) lit += (p.z - 0.002 <= textureLod(uHeadDepth, p.xy + PD[i] * uHeadTexel * 3.0, 0.0).r) ? 1.0 : 0.0;
  return lit / 8.0;
}
void main() {
  if (uMask > 0.5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec2 p = vUv * uSize;
  vec2 cell = floor(p / uCell);
  float r3 = hash13(vec3(cell, 3.0)), r4 = hash13(vec3(cell, 9.0));
  float h = 1.0 - smoothstep(0.0, 1.0, length((vUv - uHalo) * vec2(1.0, 1.3)) / 0.9);
  vec3 col = cMuc + vec3(0.012, 0.004, 0.04) * h;
  vec2 dq = (vUv - uHat.xy) * uSize / uHat.zw;
  float hat = clamp((1.0 - length(dq)) / 0.35, 0.0, 1.0);
  col = mix(col, cDem, rutTham(hat, hash13(vec3(cell, 7.0)), 0.6));
  if (uHeadI > 0.001) {
    float r1 = hash13(vec3(cell, 5.0)), r2 = hash13(vec3(cell, 6.0));
    float lam = clamp(dot(uNw, uLhead) * 1.5, 0.0, 1.0);
    float t = denXe(vWorld, uStripeAx, uStripe, uBeamAx, uBeam) * lam * uHeadI;
    t = rutTham(t, r1, 0.6) * rutTham(boHead(vWorld), r2, 0.6);
    col = mix(col, cDem, t);
  }
  if (uSocB.w > 0.0) {
    vec2 A = uSocA.xy, d = uSocA.zw - uSocA.xy; float len = length(d); vec2 u = d / len, v = vec2(-u.y, u.x);
    vec2 q = p - A; float a = dot(q, u) / len, b = dot(q, v) / (uSocB.x * 0.5);
    float vao = smoothstep(-0.02, 0.08, a) * (1.0 - smoothstep(0.7, 1.0, a));
    float ngang = 1.0 - smoothstep(0.5, 1.0, abs(b + 0.12 * (a - 0.5)));
    float f = fract(a * len / uSocB.y);
    float vach = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(uSocB.z - 0.1, uSocB.z, f));
    float k = vach * vao * ngang * (1.0 - 0.55 * a) * uSocB.w;
    col = mix(col, cDoChim, rutTham(k, hash13(vec3(cell, 15.0)), 0.6));
  }
  col = mix(cMuc, col, rutTham(uSang, hash13(vec3(cell, 14.0)), 0.62));
  col += (r3 + r4 - 1.0) * (14.0 / 255.0) * (0.8 + 0.4 * col);
  if (uGbuf > 0.5) { gl_FragColor = vec4(0.5, 0.5, -(viewMatrix * vec4(vWorld, 1.0)).z, 10.0); return; }
  gl_FragColor = vec4(col, 1.0);
}`;

const FRAG_CUA = `
${COMMON}
varying vec2 vUv;
uniform vec2 uSize; uniform float uCell; uniform float uMask;
uniform vec3 cMuc, cDem, cSang, cDo, cHong, cGiay;
uniform float uHeadI, uHeadX, uSlats, uLa, uGbuf, uSangCua;
varying vec3 vWorld;
float box(float d) { return clamp(d / max(fwidth(d), 1e-5) + 0.5, 0.0, 1.0); }
void main() {
  if (uMask > 0.5) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec2 p = vUv * uSize;
  vec2 cell = floor(p / uCell);
  float r1 = hash13(vec3(cell, 1.0)), r2 = hash13(vec3(cell, 2.0)), r3 = hash13(vec3(cell, 3.0)), r4 = hash13(vec3(cell, 4.0));
  vec3 ngoai = cDo;
  vec2 qn = (vUv - vec2(0.47, 0.66)) * vec2(1.0, 1.55);
  float quang = clamp(1.0 - length(qn) / 0.3, 0.0, 1.0);
  ngoai = mix(ngoai, cHong, rutTham(clamp(quang * 1.6, 0.0, 1.0), r4, 0.55));
  float dx = abs(vUv.x - uHeadX);
  float xe = clamp((0.15 - dx) / 0.12, 0.0, 1.0) * uHeadI;
  ngoai = mix(ngoai, cGiay, rutTham(xe, r3, 0.55));
  float s = vUv.y * uSlats;
  float f = fract(s);
  float laRem = box(uLa - f);
  float gan = clamp((f - uLa - 0.01) / 0.13, 0.0, 1.0);
  vec3 col = mix(cMuc, ngoai, rutTham(gan, r1, 0.6));
  float mepLa = box(uLa - f) * box(f - uLa + 0.03);
  col = mix(col, cSang, mepLa * 0.0);
  col = mix(col, cMuc, laRem);
  float bx = min(min(vUv.x, 1.0 - vUv.x) * uSize.x, min(vUv.y, 1.0 - vUv.y) * uSize.y);
  col = mix(col, cDem, box(0.045 - bx));
  col = mix(col, cMuc, box(0.020 - bx));
  col = mix(cMuc, col, rutTham(uSangCua, fract(r1 + r3 * 0.61), 0.62));
  col += (r2 + r4 - 1.0) * (14.0 / 255.0) * (0.8 + 0.4 * col);
  if (uGbuf > 0.5) {
    float id = bx < 0.045 ? 20.0 : (f < uLa ? 21.0 : 22.0);
    gl_FragColor = vec4(0.5, 0.5, -(viewMatrix * vec4(vWorld, 1.0)).z, id); return;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export function makeNen(shared) {
  const tuongSize = new THREE.Vector2(9, 5);
  const tuong = new THREE.Mesh(new THREE.PlaneGeometry(tuongSize.x, tuongSize.y), new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG_TUONG,
    uniforms: {
      uSize: { value: tuongSize }, uCell: { value: 0.003 }, cMuc: { value: C.muc }, cDem: { value: C.chamDem }, uHalo: { value: new THREE.Vector2(0.4, 0.55) }, uMask: { value: 0 },
      uHat: { value: new THREE.Vector4(0.3, 0.4, 1.4, 0.9) },
      uNw: { value: new THREE.Vector3(0, 0, 1) },
      uLhead: shared.uLhead, uStripeAx: shared.uStripeAx, uStripe: shared.uStripe, uBeamAx: shared.uBeamAx, uBeam: shared.uBeam,
      uHeadI: { value: 0 }, uHeadTexel: shared.uHeadTexel, uHeadVP: shared.uHeadVP, uHeadDepth: shared.uHeadDepth,
      uGbuf: { value: 0 }, uSang: shared.uSang, cDoChim: { value: C.doChim }, uSocA: { value: new THREE.Vector4() }, uSocB: { value: new THREE.Vector4(0.4, 0.085, 0.45, 0) },
    },
  }));
  tuong.material.extensions = { derivatives: true };
  const cuaSize = new THREE.Vector2(1.75, 1.1);
  const cua = new THREE.Mesh(new THREE.PlaneGeometry(cuaSize.x, cuaSize.y), new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG_CUA,
    uniforms: {
      uSize: { value: cuaSize }, uCell: { value: 0.003 }, uMask: { value: 0 },
      cMuc: { value: C.muc }, cDem: { value: C.chamDem }, cSang: { value: C.chamSang }, cDo: { value: C.do }, cHong: { value: C.hong }, cGiay: { value: C.giay },
      uHeadI: { value: 0 }, uHeadX: { value: 0.5 }, uSlats: shared.uSlats, uLa: shared.uLa, uGbuf: { value: 0 }, uSangCua: shared.uSangCua,
    },
  }));
  cua.material.extensions = { derivatives: true };
  const gb = (m) => { const g = m.clone(); g.uniforms = { ...m.uniforms, uGbuf: { value: 1 } }; g.extensions = { derivatives: true }; return g; };
  return { tuong, cua, gTuong: gb(tuong.material), gCua: gb(cua.material),
    setCell(cTuong, cCua) { tuong.material.uniforms.uCell.value = cTuong; cua.material.uniforms.uCell.value = cCua; } };
}
