// Chớm world, season Hạ: tree crowns as big flat clusters of brush strokes (the way B and the core's kumquat trees read):
// each crown is a loose heap of flat cards turned to the fixed eye, every card a clump of leaves cut out by the real brush sheet,
// so the crown's edge is ragged stroke by stroke. Dark bodies, a warm rim where the low sun catches the clumps on its side,
// a cooler lift on top from the sky; the leaves stir in the breeze (the core's wind groups, the cursor's gusts). One draw call.
import * as THREE from 'three';
import { U, COMMON_GLSL } from '../../core/paint.js';
import { REF } from '../../core/build.js';

const lin = (h) => new THREE.Color(h);

// clumps: [{ at: V3, r, crown: V3 (the crown's middle), tree (wind group), haze, sway }]
export function foliageCards(clumps, R, { cardsPer = 2, colors = {} } = {}) {
  const k = { dark: '#16261e', mid: '#3e5a40', light: '#7e9a64', rim: '#e8b070', ...colors };
  const P = [], UV = [], CEN = [], SEED = [], TREE = [], SW = [], I = [];
  const up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3(), right = new THREE.Vector3(), u2 = new THREE.Vector3(), c = new THREE.Vector3();
  let v = 0;
  for (const cl of clumps) {
    for (let j = 0; j < cardsPer; j++) {
      c.copy(cl.at).add(new THREE.Vector3((R() - 0.5) * cl.r, (R() - 0.5) * cl.r * 0.6, (R() - 0.5) * cl.r));
      const s = cl.r * (1.5 + R() * 0.7);
      n.copy(REF.eye).sub(c).normalize();
      right.crossVectors(up, n).normalize();
      u2.crossVectors(n, right).normalize();
      // a small turn about the view axis, so no two clumps sit square
      const a = (R() - 0.5) * 0.8;
      const rx = right.clone().multiplyScalar(Math.cos(a)).addScaledVector(u2, Math.sin(a));
      const uy = u2.clone().multiplyScalar(Math.cos(a)).addScaledVector(right, -Math.sin(a));
      const seed = R();
      for (const [px, py] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const p = c.clone().addScaledVector(rx, px * s * 0.5).addScaledVector(uy, py * s * 0.4);
        P.push(p.x, p.y, p.z);
        UV.push(px * 0.5 + 0.5, py * 0.5 + 0.5);
        CEN.push(cl.crown.x, cl.crown.y, cl.crown.z, cl.haze ?? 0);
        SEED.push(seed);
        TREE.push(cl.tree ?? 3);
        SW.push((cl.sway ?? 0.05) * Math.max(0, p.y - cl.crown.y * 0.5));
      }
      I.push(v, v + 1, v + 2, v, v + 2, v + 3);
      v += 4;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('aCen', new THREE.Float32BufferAttribute(CEN, 4));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(SEED, 1));
  g.setAttribute('aTree', new THREE.Float32BufferAttribute(TREE, 1));
  g.setAttribute('aSway', new THREE.Float32BufferAttribute(SW, 1));
  g.setIndex(I);
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...U, cDark: { value: lin(k.dark) }, cMid: { value: lin(k.mid) }, cLight: { value: lin(k.light) }, cRim: { value: lin(k.rim) } },
    vertexShader: /* glsl */`
      attribute vec4 aCen; attribute float aSeed, aTree, aSway;
      uniform vec3 uSway[6]; uniform float uTime;
      varying vec2 vUv; varying vec3 vWP; varying vec4 vCen; varying float vSeed;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float ph = wp.x * 1.3 + wp.y * 0.9 + aTree * 2.1 + aSeed * 6.0;
        vec3 breeze = vec3(sin(uTime * 1.1 + ph), 0.2 * sin(uTime * 1.7 + ph * 1.3), cos(uTime * 0.83 + ph * 1.3)) * 0.02;
        wp.xyz += (breeze + uSway[int(aTree + 0.5)]) * aSway;
        vUv = uv; vWP = wp.xyz; vCen = aCen; vSeed = aSeed;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      ${COMMON_GLSL()}
      uniform vec3 cDark, cMid, cLight, cRim;
      varying vec2 vUv; varying vec3 vWP; varying vec4 vCen; varying float vSeed;
      void main(){
        vec2 q = vUv - 0.5;
        vec4 b = texture2D(tBrush, vUv * vec2(0.55, 0.42) + vSeed * 7.1);
        vec4 b2 = texture2D(tBrush, vUv.yx * vec2(0.9, 0.7) + vSeed * 3.3);
        vec4 b3 = texture2D(tBrush, vUv * vec2(1.6, 1.3) + vSeed * 1.9);
        // a clump of leaves: a rough round mass, its edge eaten by the strokes (small leafy bites on the rim)
        float r = length(q * vec2(1.0, 1.15)) * 2.0;
        float m = 1.0 - r + (b.a - 0.5) * 0.7 + (b3.a - 0.5) * 0.35 + (b2.b - 0.5) * 0.2;
        if (m < 0.18) discard;
        // where on its crown this clump sits: the side toward the sun takes a warm rim, the top a cooler sky light
        vec3 d = vWP - vCen.xyz;
        vec3 dn = normalize(d + vec3(0.0, 0.001, 0.0));
        vec2 sunH = normalize(uKeyDir.xz);
        float toward = dot(normalize(d.xz + 1e-3), sunH);
        float top = dn.y;
        float tone = b.b + (b3.b - 0.5) * 0.4;
        vec3 col = mix(cDark, cMid, band(tone + top * 0.35 + (q.y) * 0.4, 0.55));
        col = mix(col, cLight, band(tone * 0.6 + top * 0.6 + q.y * 0.5, 0.78) * 0.8);
        // the rim: the clump's edge on the sun side (and its outer rings) catches the low gold light
        float edge = band(r + (b.a - 0.5) * 0.3, 0.6);
        float sunV = sunMask(vWP, (b.a - 0.5) * 0.4);
        col = mix(col, cRim * uKeyCol, band(toward * 0.8 + edge * 0.5 + (b2.a - 0.5) * 0.4, 0.95) * sunV * 0.85);
        col *= mix(uKShade * 1.25, vec3(1.0), 0.45);
        // air: its own tier, then the distance
        float hz = vCen.w * smoothstep(8.0, 40.0, length(cameraPosition - vWP));
        float air = clamp(hz + airAt(vWP) * (1.0 - hz), 0.0, 1.0);
        float gq = dot(col, vec3(0.3, 0.55, 0.15));
        col = mix(col, mix(vec3(gq), col, 0.6), air * 0.5);
        col = mix(col, airCol(vWP), air);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.userData.castShadow = false;
  return mesh;
}
