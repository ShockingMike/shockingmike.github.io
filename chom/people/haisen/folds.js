// Chớm, mùa Hạ (from people/dong): the acting lines (folds) of the picker, drawn by the graphics card.
// Every point of a line is a copy of a cloth vertex (same bones, same weights) and carries the direction to the next point
// as a skinned normal, so the line rides the cloth by itself. On each new drawing the page only writes one width per line
// (uFoldW), from how the body is bent in that drawing (actor.M).
//   buildFolds(actors, paintGeo, { THREE, RIG }) -> { mesh, update(actor), flush(), count }
import * as THREE from 'three';

export const NFOLD = 96;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const foldVert = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
attribute vec3 aDirB; attribute vec3 aInfo; attribute float aChar;
uniform float uFoldW[${NFOLD}];
uniform vec2 uRes; uniform float uPxScale, uSolo;
varying float vT, vW; varying vec2 vSeed;
void main(){
  #include <skinbase_vertex>
  #include <begin_vertex>
  vec3 objectNormal = aDirB;
  #include <skinnormal_vertex>
  #include <skinning_vertex>
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  vec3 dir = normalize(mat3(modelMatrix) * objectNormal);
  // a little toward the eye, so the cloth never swallows the line
  wp.xyz += normalize(cameraPosition - wp.xyz) * 0.005;
  vec4 c = projectionMatrix * viewMatrix * wp;
  vec4 c2 = projectionMatrix * viewMatrix * vec4(wp.xyz + dir * 0.01, 1.0);
  vec2 asp = vec2(uRes.x / uRes.y, 1.0);
  vec2 s = (c2.xy / c2.w - c.xy / c.w) * asp;
  vec2 nrm = normalize(vec2(-s.y, s.x) + 1e-6) / asp;
  float t = aInfo.y;
  float taper = pow(max(sin(3.14159 * t), 0.0), 0.55) * (1.15 - 0.45 * t);
  float w0 = uFoldW[int(aInfo.z + 0.5)];
  float w = w0 * taper;
  c.xy += nrm * aInfo.x * w * uPxScale * 2.0 / uRes.y * c.w;
  vT = t; vW = w0; vSeed = position.xy * 13.0 + aInfo.z;
  if (uSolo > -0.5 && abs(aChar - uSolo) > 0.5) c = vec4(2.0, 2.0, 2.0, 1.0);
  gl_Position = c;
}`;
const foldFrag = /* glsl */`
uniform vec3 uColor; uniform float uProbe;
varying float vT, vW; varying vec2 vSeed;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnf(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), f.x), f.y); }
void main(){
  if (uProbe > 0.5 || vW < 0.05) discard;
  float g = vnf(vec2(vT * 22.0, vSeed.x));
  if (g < 0.22 * smoothstep(0.55, 1.0, vT) + 0.08) discard;     // the brush runs dry toward the end
  gl_FragColor = vec4(uColor, 1.0);
}`;

// ---------------------------------------------------------------- where lines go, per person (character space, rest pose)
// a def: { look, bones (vertex filter by main bone name regexp), pts: [V3...] (targets), width, weight(M, st) }
function arcAround(c, axis, ref, r, a0, a1, n = 6, lift = 0) {
  const side = new THREE.Vector3().crossVectors(axis, ref).normalize();
  const out = [];
  for (let k = 0; k <= n; k++) {
    const a = a0 + (a1 - a0) * k / n;
    out.push(c.clone().addScaledVector(ref, Math.cos(a) * r).addScaledVector(side, Math.sin(a) * r).addScaledVector(axis, lift * Math.sin(Math.PI * k / n)));
  }
  return out;
}
function defaultDefs(a) {
  const P = a.P;
  const defs = [];
  const seated = a.meta.seated;
  for (const s of ['l', 'r']) {
    const U = P(`upperarm_${s}`), E = P(`lowerarm_${s}`), H = P(`hand_${s}`);
    const ua = U.clone().sub(E).normalize(), la = H.clone().sub(E).normalize();
    const inner = ua.clone().add(la).normalize();
    const axis = ua.clone().sub(la).normalize();
    const armBones = new RegExp(`^(upperarm|lowerarm)_${s}$`);
    // the crook of the elbow: three short arcs where the thick sleeve bunches
    [[-0.022, 0.9, 1.0], [0.0, 1.2, 1.25], [0.024, 0.85, 0.9]].forEach(([off, span, k]) => {
      defs.push({ look: 'jacket', bones: armBones, pts: arcAround(E.clone().addScaledVector(axis, off), axis, inner, 0.07, -span / 2, span / 2), width: 2.3 * k, weight: (M) => sm(0.5, 1.4, M.bend[s]) * 0.95 + 0.05 });
    });
    // the sleeve's own weight: a long line down the outside of the upper arm
    const outS = V3(s === 'l' ? 1 : -1, 0, 0);
    defs.push({ look: 'jacket', bones: armBones, pts: [0.15, 0.35, 0.55, 0.75].map((u) => U.clone().lerp(E, u).addScaledVector(outS, 0.08)), width: 1.6, weight: (M) => 0.6 + 0.4 * sm(0.8, 1.6, M.raise[s]) });
    // reaching forward: the back pulls from the shoulder blade toward the other hip
    const sx = s === 'l' ? 1 : -1;
    defs.push({ look: 'jacket', bones: /^(spine_0[123]|clavicle_.|pelvis)$/, back: true, pts: [[0.12, -0.04], [0.09, -0.1], [0.05, -0.17], [0.01, -0.24], [-0.03, -0.3]].map(([x, y]) => U.clone().add(V3(sx * x - U.x + sx * 0.0, y, -0.2))), width: 2.2, weight: (M) => sm(0.25, 0.7, M.reach[s]) });
  }
  // the belly: the coat folds across the front as the back bends
  const pel = P('pelvis'), neck = P('neck_01');
  for (const [dy, w] of [[0.1, 2.4], [0.16, 2.0], [0.22, 1.5]]) {
    const y = pel.y + dy;
    defs.push({ look: 'jacket', bones: /^(spine_0[123]|pelvis)$/, front: true, pts: [-0.09, -0.045, 0, 0.045, 0.09].map((x) => V3(x, y + 0.012 * Math.cos(x * 30), 0.4)), width: w, weight: (M) => sm(0.2, 0.7, M.fwd) });
  }
  // the lap (seated): where the trousers fold at the top of each thigh; the knee
  if (seated) for (const s of ['l', 'r']) {
    const T = P(`thigh_${s}`), K = P(`calf_${s}`);
    const ta = K.clone().sub(T).normalize();
    defs.push({ look: 'pants', bones: new RegExp(`^thigh_${s}$`), top: true, pts: [0.18, 0.24, 0.3].map((u, k) => T.clone().lerp(K, u).add(V3((s === 'l' ? 1 : -1) * (0.03 - 0.03 * k), 0.12, 0))), width: 2.0, weight: () => 0.8 });
    defs.push({ look: 'pants', bones: new RegExp(`^thigh_${s}$`), top: true, pts: [0.45, 0.52, 0.58].map((u, k) => T.clone().lerp(K, u).add(V3((s === 'l' ? 1 : -1) * (-0.035 + 0.035 * k), 0.12, 0))), width: 1.6, weight: () => 0.6 });
    defs.push({ look: 'pants', bones: new RegExp(`^(thigh|calf)_${s}$`), pts: arcAround(K.clone().addScaledVector(ta, -0.03), ta, V3(0, 1, 0).addScaledVector(ta, -ta.y).normalize(), 0.09, -0.9, 0.9, 5), width: 1.8, weight: () => 0.7 });
  }
  return defs;
}

export async function buildFolds(actors, paintGeo, Y = async () => {}) {
  const pos = paintGeo.attributes.position, nrm = paintGeo.attributes.normal;
  const si = paintGeo.attributes.skinIndex, sw = paintGeo.attributes.skinWeight;
  const aChar = paintGeo.attributes.aChar, aMat = paintGeo.attributes.aMat;
  const lines = [];
  const p = V3(0, 0, 0);
  for (const a of actors) {
    const ci = a.index;
    const defs = [...defaultDefs(a), ...(a.spec.folds?.(a) ?? [])];
    // this person's vertices by look, with their main bone
    const byLook = {};
    const rowToLook = Object.fromEntries(Object.entries(a.rows).map(([k, r]) => [r, k]));
    for (let i = 0; i < pos.count; i++) {
      if (Math.round(aChar.getX(i)) !== ci) continue;
      const lk = rowToLook[Math.round(aMat.getX(i))];
      if (!lk) continue;
      let best = 0, bw = -1;
      for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
      (byLook[lk] ??= []).push([i, a.bones[best - a.boneBase]?.name ?? '']);
    }
    for (const d of defs) {
      await Y('folds');
      const cand = (byLook[d.look] ?? []).filter(([, bn]) => d.bones.test(bn));
      if (cand.length < 10) continue;
      const idx = [];
      for (const t of d.pts) {
        let best = -1;
        if (d.front || d.back || d.top) {
          // a ray from outside: the outermost vertex within 1.4 cm of the target, seen along the line's side
          let bv = -1e9;
          for (const r of [0.014, 0.022, 0.032]) {
            for (const [i] of cand) {
              p.fromBufferAttribute(pos, i);
              let a1, a2, depth, nOk;
              if (d.top) { a1 = p.x - t.x; a2 = p.z - t.z; depth = p.y; nOk = nrm.getY(i) > 0.3; }
              else if (d.front) { a1 = p.x - t.x; a2 = p.y - t.y; depth = p.z; nOk = nrm.getZ(i) > 0.2; }
              else { a1 = p.x - t.x; a2 = p.y - t.y; depth = -p.z; nOk = nrm.getZ(i) < -0.2; }
              if (!nOk || Math.abs(a1) > r || Math.abs(a2) > r) continue;
              if (depth > bv) { bv = depth; best = i; }
            }
            if (best >= 0) break;
          }
        } else {
          let bd = 1e9;
          for (const [i] of cand) {
            p.fromBufferAttribute(pos, i);
            const dd = p.distanceToSquared(t);
            if (dd < bd) { bd = dd; best = i; }
          }
        }
        if (best >= 0 && best !== idx[idx.length - 1]) idx.push(best);
      }
      if (idx.length >= 2 && lines.length < NFOLD) lines.push({ a, d, idx, fi: lines.length });
    }
  }
  // geometry: two vertices per point
  let n = 0;
  for (const L of lines) n += L.idx.length;
  const P = new Float32Array(n * 6), D = new Float32Array(n * 6), I = new Float32Array(n * 6), C = new Float32Array(n * 2);
  const SI = new Uint16Array(n * 8), SW = new Float32Array(n * 8);
  const index = [];
  let v = 0;
  const q = V3(0, 0, 0), r = V3(0, 0, 0);
  for (const L of lines) {
    const m = L.idx.length;
    for (let k = 0; k < m; k++) {
      const i = L.idx[k];
      q.fromBufferAttribute(pos, L.idx[Math.max(0, k - 1)]);
      r.fromBufferAttribute(pos, L.idx[Math.min(m - 1, k + 1)]);
      r.sub(q).normalize();
      for (const side of [-1, 1]) {
        P[v * 3] = pos.getX(i); P[v * 3 + 1] = pos.getY(i); P[v * 3 + 2] = pos.getZ(i);
        D[v * 3] = r.x; D[v * 3 + 1] = r.y; D[v * 3 + 2] = r.z;
        I[v * 3] = side; I[v * 3 + 1] = k / (m - 1); I[v * 3 + 2] = L.fi;
        C[v] = L.a.index;
        for (let c = 0; c < 4; c++) { SI[v * 4 + c] = si.getComponent(i, c); SW[v * 4 + c] = sw.getComponent(i, c); }
        v++;
      }
      if (k < m - 1) { const b = v - 2; index.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P.subarray(0, v * 3), 3));
  geo.setAttribute('aDirB', new THREE.BufferAttribute(D.subarray(0, v * 3), 3));
  geo.setAttribute('aInfo', new THREE.BufferAttribute(I.subarray(0, v * 3), 3));
  geo.setAttribute('aChar', new THREE.BufferAttribute(C.subarray(0, v), 1));
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(SI.subarray(0, v * 4), 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(SW.subarray(0, v * 4), 4));
  geo.setIndex(index);
  const widths = new Float32Array(NFOLD);
  const mat = (PU) => new THREE.ShaderMaterial({
    uniforms: { uFoldW: { value: widths }, uRes: PU.uRes, uPxScale: PU.uPxScale, uSolo: PU.uSolo, uProbe: PU.uProbe, uColor: PU.uInk },
    vertexShader: foldVert, fragmentShader: foldFrag, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
  });
  return {
    geo, mat, count: lines.length, points: v / 2,
    update(a) {
      for (const L of lines) if (L.a === a) widths[L.fi] = L.d.width * Math.max(0, Math.min(1.3, L.d.weight(a.M, a)));
    },
    flush() {},
  };
}
