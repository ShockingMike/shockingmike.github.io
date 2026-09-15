/* Hanging hurricane lamp: chain of instanced links, brass cap and font, glass globe, guard wires, a flame that
   blooms, and a real shadow-casting point light. The group's origin is the hook in the deckhead (the pendulum pivot). */
import * as THREE from 'three';
import { lathe } from './util.js';
import { solid } from './cabin.js';

export function buildLamp(M, Q, glowTex) {
  const pivot = new THREE.Group(); pivot.name = 'lamp';

  const linkGeo = new THREE.TorusGeometry(0.0062, 0.00165, 8, 22);
  linkGeo.scale(1, 1.6, 1);
  const n = 26, pitch = 0.0152;
  const chain = solid(new THREE.InstancedMesh(linkGeo, M.brassDark, n), true, false);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) { p.set(0, -0.008 - i * pitch, 0); q.setFromAxisAngle(up, i % 2 ? Math.PI / 2 : 0.15); m4.compose(p, q, one); chain.setMatrixAt(i, m4); }
  pivot.add(chain);

  const bail = solid(new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0024, 10, 40), M.brass));
  bail.position.y = -0.414;
  pivot.add(bail);
  const cap = solid(new THREE.Mesh(lathe([
    [0, -0.476], [0.041, -0.476], [0.043, -0.470, 0.003], [0.031, -0.452, 0.008], [0.014, -0.438, 0.005], [0.012, -0.431, 0.002], [0, -0.430]
  ], 64, 5), M.brass));
  pivot.add(cap);
  const vent = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.006, 32, 1, true), M.brassDark));
  vent.position.y = -0.444;
  pivot.add(vent);

  const globe = new THREE.Mesh(lathe([
    [0.029, -0.585], [0.044, -0.574, 0.01], [0.055, -0.540, 0.02], [0.051, -0.500, 0.02], [0.034, -0.479, 0.008], [0.030, -0.474]
  ], 72, 8), M.lampGlass);
  globe.name = 'lampGlass';
  pivot.add(globe);

  const rodGeo = new THREE.CylinderGeometry(0.0021, 0.0021, 0.118, 8);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const rod = solid(new THREE.Mesh(rodGeo, M.brassLamp), false, false);
    rod.position.set(Math.cos(a) * 0.063, -0.531, Math.sin(a) * 0.063);
    pivot.add(rod);
  }
  const hoop = solid(new THREE.Mesh(new THREE.TorusGeometry(0.063, 0.0021, 8, 64), M.brassDark), false, false);
  hoop.rotation.x = Math.PI / 2; hoop.position.y = -0.54;
  pivot.add(hoop);

  const gallery = solid(new THREE.Mesh(lathe([
    [0, -0.600], [0.043, -0.600], [0.045, -0.594, 0.002], [0.040, -0.586, 0.002], [0.031, -0.584], [0, -0.584]
  ], 64, 3), M.brassLamp), false, true);
  pivot.add(gallery);
  const font = solid(new THREE.Mesh(lathe([
    [0, -0.668], [0.032, -0.668], [0.060, -0.652, 0.012], [0.066, -0.630, 0.01], [0.058, -0.609, 0.01], [0.041, -0.600, 0.004], [0, -0.600]
  ], 72, 6), M.brassLamp), false, true);
  pivot.add(font);
  const knob = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.03, 10), M.brassDark), false, true);
  knob.rotation.z = Math.PI / 2; knob.position.set(0.05, -0.592, 0);
  pivot.add(knob);
  const knobWheel = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.003, 24), M.brassPolished), false, true);
  knobWheel.rotation.z = Math.PI / 2; knobWheel.position.set(0.066, -0.592, 0);
  pivot.add(knobWheel);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.008, 12), M.wick);
  wick.position.y = -0.582;
  pivot.add(wick);

  const flameMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uI: { value: 1 } },
    vertexShader: /* glsl */`
      uniform float uTime; varying float vH; varying vec3 vN; varying vec3 vV;
      void main() {
        vH = clamp((position.y + 0.578) / 0.040, 0.0, 1.0);
        vec3 p = position;
        p.x += (sin(uTime * 7.3) * 0.0007 + sin(uTime * 13.1 + 1.0) * 0.0003) * vH * vH;
        p.z += (sin(uTime * 5.9 + 2.0) * 0.0005) * vH * vH;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal); vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uI; varying float vH; varying vec3 vN; varying vec3 vV;
      void main() {
        vec3 base = vec3(0.25, 0.4, 1.0) * 1.5;
        vec3 core = vec3(1.0, 0.80, 0.46) * 16.0;
        vec3 tip = vec3(1.0, 0.42, 0.10) * 7.0;
        vec3 c = mix(base, core, smoothstep(0.0, 0.22, vH));
        c = mix(c, tip, smoothstep(0.55, 1.0, vH));
        float rim = abs(dot(normalize(vN), normalize(vV)));
        c *= mix(0.35, 1.0, pow(rim, 0.7));
        gl_FragColor = vec4(c * uI, 1.0);
      }`
  });
  const flame = new THREE.Mesh(lathe([[0, -0.578], [0.0046, -0.571, 0.002], [0.0056, -0.562, 0.003], [0.0035, -0.548, 0.004], [0, -0.536]], 24, 5), flameMat);
  flame.name = 'flame';
  pivot.add(flame);

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.4, 1.3, 0.55), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(0.11, 0.11, 1);
  glow.position.y = -0.556;
  glow.name = 'glow';
  pivot.add(glow);

  const light = new THREE.PointLight(new THREE.Color(1.0, 0.64, 0.34), 0.4, 0, 2);
  light.position.y = -0.546;
  light.castShadow = true;
  light.shadow.mapSize.set(Q.pointShadow || 512, Q.pointShadow || 512);
  light.shadow.camera.near = 0.02;
  light.shadow.camera.far = 6;
  light.shadow.bias = -0.0025;
  light.shadow.normalBias = 0.004;
  light.shadow.radius = 6;
  pivot.add(light);

  return { group: pivot, light, flame, flameMat, glow, globe, length: 0.54 };
}
