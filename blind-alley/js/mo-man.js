import * as THREE from 'three';
import { COMMON } from './npr.js';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const MO = {
  LECH: 7.1,
  NHEN: [0.3, 0.55],
  CUA: [1.05, 1.9],
  SANG: [1.4, 2.5],
  CHU: 2.5,
  KINH: 0.3,
  HET: 5.6,
};
export function moAt(s, chuHet = 2) {
  return {
    s,
    nhen: ss(MO.NHEN[0], MO.NHEN[1], s),
    duoiLoe: s < 0.95 ? 0 : 1 - ss(0.95, 2.3, s),
    sangCua: ss(MO.CUA[0], MO.CUA[1], s),
    sang: ss(MO.SANG[0], MO.SANG[1], s),
    chu: s - MO.CHU,
    kinh: ss(MO.CHU + chuHet + 0.3, MO.CHU + chuHet + 0.3 + MO.KINH, s),
    phim: 1,
  };
}

const V = 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }';
const F = `
${COMMON}
uniform vec2 uC; uniform float uR, uI, uCell;
const vec3 P_HONG = vec3(255.0, 58.0, 134.0) / 255.0, P_GIAY = vec3(243.0, 220.0, 214.0) / 255.0;
void main() {
  vec2 d = gl_FragCoord.xy - uC;
  float r = length(d) / uR;
  if (r > 2.6 || uI < 0.002) discard;
  vec2 cell = floor(gl_FragCoord.xy / uCell);
  float h1 = hash13(vec3(cell, 1.0)), h2 = hash13(vec3(cell, 2.0)), h3 = hash13(vec3(cell, 3.0)), h4 = hash13(vec3(cell, 4.0));
  float quang = rutTham((1.0 - smoothstep(0.7, 2.5, r)) * uI * 0.95, h1, 0.55);
  float vanh = rutTham((1.0 - smoothstep(0.7, 1.08, r)) * uI * 1.1, h2, 0.6);
  float loi = rutTham((1.0 - smoothstep(0.25, 0.62, r)) * uI * 1.15, h3, 0.6);
  float nong = rutTham((1.0 - smoothstep(0.0, 0.3, r)) * smoothstep(0.55, 1.0, uI), h4, 0.6);
  vec3 col = P_DOCHIM;
  col = mix(col, P_DO, vanh);
  col = mix(col, P_HONG, loi);
  col = mix(col, P_GIAY, nong);
  float a = max(max(quang, vanh), max(loi, nong));
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}`;
export function makeLoe() {
  const u = { uC: { value: new THREE.Vector2() }, uR: { value: 6 }, uI: { value: 0 }, uCell: { value: 2 } };
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: V, fragmentShader: F, transparent: true, depthTest: false, depthWrite: false });
  const sc = new THREE.Scene(); const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; sc.add(q);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    u,
    dat(x, y, i, dpr, hc) {
      u.uC.value.set(x * dpr, (hc - y) * dpr);
      u.uI.value = i;
      u.uR.value = (2.2 + 7.5 * i) * Math.max(0.8, hc / 920) * dpr;
      u.uCell.value = Math.max(1, Math.round(1.5 * dpr));
    },
    ve(renderer) {
      if (u.uI.value < 0.002) return;
      const ac = renderer.autoClear; renderer.autoClear = false; renderer.render(sc, cam); renderer.autoClear = ac;
    },
  };
}
