// Chớm world, season Thu: the lake side of Nguyễn Du (Thiền Quang lake) and the street furniture.
//   lakeWater (a painted water surface: the night sky, the far shore mirrored, the lamps drawn down it in broken dabs),
//   embankment (stone edge, a low iron fence), streetLamps (concrete posts, arms over the road, sodium heads),
//   powerPoles (concrete poles with the knot of cables every Hanoi pole carries), farShore (lights and trees across the water).
import * as THREE from 'three';
import { V3, mat } from '../../core/build.js';
import { COMMON_GLSL } from '../../core/paint.js';

export const WATER_Y = -0.62;
export const EDGE_X = -5.08;     // the stone edge of the lake (the pavement ends here)

// ---------------------------------------------------------------- the lake surface
// far lights on the other shore: [x, y, z, warm(0) / cold(1)]
export function farLights(R, n = 16) {
  const L = [];
  for (let i = 0; i < n; i++) L.push(new THREE.Vector4(-64 - R() * 6, 1.2 + R() * 5, 12 - i * 9.5 - R() * 5, R() < 0.75 ? 0 : 1));
  return L;
}
export function lakeWater(U, lights, { x0 = EDGE_X - 0.05, x1 = -130, z0 = 24, z1 = -150 } = {}) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: true,
    uniforms: {
      ...U, uFar: { value: lights }, uWaterY: { value: WATER_Y },
      cDeep: { value: new THREE.Color('#0c1224') }, cMid: { value: new THREE.Color('#18223c') },
      cSky: { value: new THREE.Color('#2a3656') }, cSky2: { value: new THREE.Color('#44507a') },
      cWarm: { value: new THREE.Color('#e8a860') }, cCool: { value: new THREE.Color('#b8c4dc') },
    },
    vertexShader: /* glsl */`varying vec3 vWP; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      ${COMMON_GLSL()}
      uniform vec4 uFar[${lights.length}];
      uniform vec3 cDeep, cMid, cSky, cSky2, cWarm, cCool; uniform float uWaterY;
      varying vec3 vWP;
      // a light drawn down the water toward the eye: a column of broken dabs
      float column(vec3 L, float w0, float reach, float bk, out float dy){
        vec3 mpt = vec3(L.x, 2.0 * uWaterY - L.y, L.z);
        vec3 a = normalize(mpt - cameraPosition), f = normalize(vWP - cameraPosition);
        float dx = abs(atan(a.z, a.x) - atan(f.z, f.x));
        dy = asin(f.y) - asin(a.y);
        float w = w0 * (0.55 + 0.9 * bk) * (1.0 + max(dy, 0.0) * 4.0);
        return (1.0 - smoothstep(w * 0.35, w, dx)) * exp(-abs(dy) * reach);
      }
      void main(){
        vec3 V = normalize(cameraPosition - vWP);
        // ripples: long flat strokes along the shore, drifting very slowly with the night breeze
        vec2 uv = vec2(vWP.z * 0.09 + uTime * 0.004, vWP.x * 0.55);
        vec4 b = texture2D(tBrush, uv);
        vec4 b2 = texture2D(tBrush, uv * vec2(0.37, 0.41) + 0.5);
        vec4 b3 = texture2D(tBrush, uv * vec2(0.13, 0.19) + 0.23);
        float d = length(cameraPosition - vWP);
        float far = smoothstep(10.0, 60.0, d);
        vec4 bb = mix(b, b3, far);
        float fres = pow(1.0 - max(V.y, 0.0), 4.0);
        vec3 col = mix(cDeep, cMid, band(bb.b + (b2.b - 0.5) * 0.3, 0.55));
        col = mix(col, cSky, band(fres + (b2.b - 0.5) * 0.35, 0.5) * 0.8);
        col = mix(col, cSky2, band(fres + (bb.a - 0.5) * 0.3, 0.82) * 0.55);
        float dy;
        // the street lamps along the shore (the six lights every shader knows)
        for (int i = 0; i < ${6}; i++) {
          float k = max(uBulbCol[i].r, max(uBulbCol[i].g, uBulbCol[i].b));
          if (k <= 0.0 || uBulb[i].y < 3.0) continue;
          float g = column(uBulb[i].xyz, 0.018, 1.6, bb.a, dy);
          vec3 hue = uBulbCol[i] / k;
          col = mix(col, hue * 1.1, band(g * (0.5 + 0.9 * bb.a) * (0.6 + 0.6 * b2.a), 0.4) * 0.85);
          col = mix(col, vec3(1.0, 0.9, 0.72) * 1.3, band(g * bb.a * b2.a, 0.42));
        }
        for (int i = 0; i < ${lights.length}; i++) {
          float g = column(uFar[i].xyz, 0.005, 7.0, bb.a, dy);
          col = mix(col, mix(cWarm, cCool, uFar[i].w), band(g * (0.45 + bb.a) * (0.5 + b2.a), 0.5) * 0.9);
        }
        float air = airAt(vWP);
        col = mix(col, airCol(vWP), air * 0.85);
        // the water lets the mirrored far shore show through near the glancing angle
        float a = mix(1.0, 0.62, band(fres + (bb.b - 0.5) * 0.2, 0.7) * (1.0 - band(bb.a, 0.78)));
        gl_FragColor = vec4(col, a);
      }`,
  });
  const g = new THREE.PlaneGeometry(Math.abs(x1 - x0), Math.abs(z1 - z0)).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set((x0 + x1) / 2, WATER_Y, (z0 + z1) / 2);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  mesh.userData.castShadow = false;
  return mesh;
}

// ---------------------------------------------------------------- the lake edge: stone coping, the wall down to the water, a low fence
export function embankment(kb, fine, R, { z0 = 16, z1 = -130, haze = 0.06 } = {}) {
  const H0 = { haze };
  const L = z0 - z1, cz = (z0 + z1) / 2;
  kb.box(0.34, 0.12, L, V3(EDGE_X + 0.1, 0.05, cz), { col: '#6a6870', col2: '#9a96a0', scale: 0.8, drip: 0.3, seed: R(), ...H0 });
  kb.box(0.3, 0.72, L, V3(EDGE_X - 0.05, WATER_Y / 2 - 0.05, cz), { col: '#3a3c44', col2: '#5c5a64', scale: 0.6, drip: 0.9, seed: R(), ...H0 });
  const posts = [];
  for (let z = z0; z > z1; z -= 2.2) {
    fine.box(0.07, 0.62, 0.07, V3(EDGE_X + 0.12, 0.42, z), { col: '#22262e', col2: '#485060', scale: 3, seed: R(), ...H0 });
    posts.push(z);
  }
  for (const y of [0.34, 0.7]) fine.box(0.035, 0.035, L, V3(EDGE_X + 0.12, y, cz), { col: '#22262e', col2: '#485060', scale: 3, seed: R(), ...H0 });
  // the fence's little arches, one per span
  for (const z of posts) fine.push(() => new THREE.TorusGeometry(0.5, 0.012, 4, 14, Math.PI), true, { col: '#22262e', col2: '#485060', scale: 3, seed: R(), ...H0 }, mat(V3(EDGE_X + 0.12, 0.34, z - 1.1), [0, Math.PI / 2, 0], [1, 0.45, 1]));
  return posts;
}

// ---------------------------------------------------------------- street lamps (knife paint; the heads glow)
export function streetLamps(kb, lamps, R, { haze = 0.04 } = {}) {
  const H0 = { haze };
  const concrete = () => ({ col: '#6c6e76', col2: '#9ea0a6', scale: 1.2, drip: 0.35, seed: R(), ...H0 });
  const heads = [];
  for (const l of lamps) {
    const [px, pz] = l.post;
    const [hx, hy, hz] = l.head;
    kb.cyl(0.13, 0.19, 1.1, V3(px, 0.55, pz), concrete(), 8);
    kb.cyl(0.075, 0.12, 6.6, V3(px, 3.3, pz), concrete(), 8);
    // the arm: up, then a long curve out over the road
    const sg = Math.sign(hx - px);
    const pts = [V3(px, 6.3, pz), V3(px + 0.05 * sg, 7.0, pz + 0.02), V3((px + hx) / 2 - 0.3 * sg, 7.3, (pz + hz) / 2), V3(hx - 0.25 * sg, 7.05, hz)];
    kb.tube(pts, 0.045, concrete(), 20, 6);
    // the head: a dark housing, a hot lens under it
    kb.push(() => new THREE.SphereGeometry(0.3, 14, 8), true, { col: '#30343c', col2: '#5a606a', scale: 2, seed: R(), ...H0 }, mat(V3(hx, hy + 0.08, hz), [0, 0, -0.1 * sg], [1.45, 0.42, 0.85]));
    kb.push(() => new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), true, { col: '#ffb060', col2: '#fff0c8', emit: l.hero ? 2.4 : 2.0, scale: 2, seed: R(), flat: 1, ...H0 }, mat(V3(hx, hy + 0.04, hz), [0, 0, -0.1 * sg], [1.35, 0.6, 0.8]));
    heads.push(V3(hx, hy - 0.02, hz));
  }
  return heads;
}

// ---------------------------------------------------------------- concrete power poles on the house side, and their knots of cable
export function powerPoles(kb, fine, zs, R, { x = 1.36, haze = 0.05 } = {}) {
  const H0 = { haze };
  const tops = [];
  for (const z of zs) {
    kb.box(0.26, 9.4, 0.26, V3(x, 4.7, z), { col: '#72747a', col2: '#a2a4a8', scale: 0.9, drip: 0.5, seed: R(), ...H0 });
    kb.box(0.12, 0.12, 1.9, V3(x, 8.6, z), { col: '#5a5c62', col2: '#8a8c92', scale: 2, seed: R(), ...H0 });
    kb.box(1.4, 0.1, 0.1, V3(x + 0.35, 8.0, z), { col: '#5a5c62', col2: '#8a8c92', scale: 2, seed: R(), ...H0 });
    const nc = 3 + Math.floor(R() * 3);
    for (let i = 0; i < nc; i++) {
      const tr = 0.26 + R() * 0.18;
      fine.push(() => new THREE.TorusGeometry(tr, 0.03, 5, 18), true, { col: '#16181e', col2: '#34363e', scale: 3, seed: R(), ...H0 },
        mat(V3(x + (R() - 0.5) * 0.25, 4.8 + i * 0.5 + R() * 0.2, z + 0.2 + (R() - 0.5) * 0.2), [0.3 + R() * 0.5, R() * 3, 0.2 + R() * 0.3]), 0.02, 3);
    }
    kb.box(0.3, 0.46, 0.22, V3(x + 0.05, 3.1, z + 0.18), { col: '#8a8e96', col2: '#b0b4ba', scale: 1.6, drip: 0.4, seed: R(), ...H0 });
    tops.push(V3(x, 8.7, z));
  }
  return tops;
}

// power lines: sagging runs between the poles, drops into the houses, and loose loops (ink ribbons)
export function wireRuns(poles, R, wallX) {
  const lines = [];
  const cat = (a, b, sag, n = 24) => { const p = []; for (let i = 0; i <= n; i++) { const t = i / n; p.push(a.clone().lerp(b, t).add(V3(0, -Math.sin(t * Math.PI) * sag, 0))); } return p; };
  for (let k = 0; k < 7; k++) {
    const pts = [];
    const dy = k * 0.2 + R() * 0.1, dx = (k % 3 - 1) * 0.25;
    for (let p = 0; p < poles.length - 1; p++) {
      const a = poles[p].clone().add(V3(dx, -dy, 0)), b = poles[p + 1].clone().add(V3(dx, -dy + (R() - 0.5) * 0.2, 0));
      pts.push(...cat(a, b, 0.4 + R() * 0.5).slice(p ? 1 : 0));
    }
    lines.push({ pts, width: k < 2 ? 1.7 : 1.15, alpha: 0.85 });
  }
  // drops into the houses, several per pole, and a bundle hanging low
  for (const p of poles) {
    for (let k = 0; k < 4; k++) {
      const a = p.clone().add(V3(0, -0.3 - k * 0.3, 0));
      const b = V3(wallX, 5.6 + R() * 2.2, p.z + (R() - 0.5) * 9);
      lines.push({ pts: cat(a, b, 0.5 + R() * 0.6, 20), width: 1.05, alpha: 0.75 });
    }
    const a = p.clone().add(V3(0.05, -2.2, 0.2));
    lines.push({ pts: cat(a, a.clone().add(V3(0.3, 0.6, 1.2)), 0.7, 12), width: 1.6, alpha: 0.8 });
  }
  return lines;
}

// ---------------------------------------------------------------- the far shore: a band of dark trees along the water (knife, far tier)
export function farTrees(kb, R, { x = -62, z0 = 20, z1 = -150, haze = 0.55 } = {}) {
  for (let z = z0; z > z1; z -= 3 + R() * 3) {
    const r = 2 + R() * 2.4;
    kb.push(() => new THREE.IcosahedronGeometry(r, 1), true, { col: '#141c26', col2: '#22303a', scale: 0.4, seed: R(), haze }, mat(V3(x + (R() - 0.5) * 6, WATER_Y + r * 0.7 + R() * 2.5, z), [0, R() * 3, 0], [1, 0.75, 1]));
  }
}
