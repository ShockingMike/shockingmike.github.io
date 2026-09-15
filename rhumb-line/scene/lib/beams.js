/* Shafts of sunlight through the portholes, with drifting dust. They live in cabin space, but their direction is
   the world's light direction seen from the rolling cabin, so they swing with the hull exactly like the sun patch. */
import * as THREE from 'three';
import { GLSL_NOISE } from './util.js';
import { LAYOUT } from './layout.js';

export function createBeams(pixelRatio) {
  const group = new THREE.Group(); group.name = 'beams';
  const uniforms = { uI: { value: 0 }, uDust: { value: 0 }, uColor: { value: new THREE.Color(1, 0.9, 0.75) }, uTime: { value: 0 }, uLen: { value: 1 }, uPx: { value: pixelRatio } };
  const geo = new THREE.CylinderGeometry(0.094, 0.094, 1, 48, 16, true);
  geo.translate(0, -0.5, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      uniform float uLen;
      varying vec3 vN; varying vec3 vV; varying float vT; varying vec3 vP;
      void main() {
        vT = -position.y; vP = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uI, uTime, uLen; uniform vec3 uColor;
      varying vec3 vN; varying vec3 vV; varying float vT; varying vec3 vP;
      ${GLSL_NOISE}
      void main() {
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.4);
        float along = smoothstep(0.0, 0.1, vT) * (1.0 - smoothstep(0.55, 1.0, vT));
        float haze = 0.7 + 0.3 * fbm(vec2(atan(vP.z, vP.x) * 2.0 + uTime * 0.03, vT * 6.0 - uTime * 0.05));
        float a = edge * along * haze * uI * 0.035;
        gl_FragColor = vec4(uColor * a, 1.0);
      }`
  });
  // dust motes inside each shaft
  const N = 220, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = Math.sqrt(Math.random()) * 0.088, a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = -Math.random(); pos[i * 3 + 2] = Math.sin(a) * r;
    seed[i] = Math.random();
  }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dgeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const dmat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uTime, uPx, uDust; varying float vA;
      void main() {
        vec3 p = position;
        float s = aSeed * 6.2831;
        p.x += sin(uTime * 0.21 + s) * 0.012; p.z += cos(uTime * 0.17 + s * 1.3) * 0.012;
        p.y = -fract(-p.y + uTime * 0.012 * (0.4 + aSeed));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = (0.4 + 0.6 * pow(0.5 + 0.5 * sin(uTime * (0.8 + aSeed * 2.0) + s * 3.0), 3.0)) * smoothstep(0.0, 0.15, -p.y) * (1.0 - smoothstep(0.5, 0.95, -p.y));
        gl_PointSize = uPx * (1.0 + aSeed * 1.7) * (0.9 / max(0.3, -mv.z));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uI, uDust; varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = 1.0 - smoothstep(0.1, 0.5, length(c));
        gl_FragColor = vec4(uColor * d * vA * uI * uDust * 0.5, 1.0);
      }`
  });
  const shafts = LAYOUT.portholes.map((p) => {
    const holder = new THREE.Group();
    holder.position.set(p.x, p.y, LAYOUT.wallZ + 0.024);
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 6;
    const d = new THREE.Points(dgeo, dmat); d.frustumCulled = false; d.renderOrder = 7;
    holder.add(m, d);
    group.add(holder);
    return { holder, mesh: m, dust: d, y: p.y };
  });
  const down = new THREE.Vector3(0, -1, 0), dir = new THREE.Vector3();
  function update(lightDirWorld, shipQi, W, time) {
    dir.copy(lightDirWorld).applyQuaternion(shipQi).normalize();
    const len = dir.y < -0.05 ? shafts[0].y / -dir.y : 1.5;
    shafts.forEach((s) => {
      s.holder.quaternion.setFromUnitVectors(down, dir);
      s.holder.scale.set(1, len, 1);
      s.holder.visible = W.beam > 0.01;
    });
    uniforms.uI.value = W.beam * W.lightI / 3.3;
    uniforms.uDust.value = W.dust;
    uniforms.uColor.value.setRGB(W.lightColor[0], W.lightColor[1], W.lightColor[2]);
    uniforms.uTime.value = time;
    uniforms.uLen.value = len;
  }
  return { group, update, meshes: shafts.map((s) => s.mesh) };
}
