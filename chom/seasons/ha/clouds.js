// Chớm world, season Hạ: the dusk clouds over West Lake. The core's sky gives the gradient and the sun; this band of painted
// clouds sits just inside it: long thin streaks low over the far shore, a looser bank higher up, lilac bodies with their
// undersides lit gold near the sun and rose away from it. Painted in the sky's own way (strokes laid in azimuth / elevation,
// like the core sky), so they never slide against it. Drawn once, behind everything.
import * as THREE from 'three';
import { U, COMMON_GLSL } from '../../core/paint.js';

const lin = (h) => new THREE.Color(h);

export function cloudBand({ eye, radius = 470, azFrom = -140, azTo = 60, elTop = 38, colors = {} }) {
  const k = { body: '#8c7cae', body2: '#b294b8', gold: '#ffd2a0', rose: '#f0a4a8', edge: '#e8c0c4', ...colors };
  const NA = 96, NE = 16;
  const P = [], I = [];
  const d2r = Math.PI / 180;
  for (let j = 0; j <= NE; j++) {
    const el = (0.5 + (elTop - 0.5) * (j / NE)) * d2r;
    for (let i = 0; i <= NA; i++) {
      const az = (azFrom + (azTo - azFrom) * (i / NA)) * d2r;
      P.push(eye.x + Math.sin(az) * Math.cos(el) * radius, eye.y + Math.sin(el) * radius, eye.z - Math.cos(az) * Math.cos(el) * radius);
    }
  }
  for (let j = 0; j < NE; j++) for (let i = 0; i < NA; i++) {
    const a = j * (NA + 1) + i, b = a + NA + 1;
    I.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setIndex(I);
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: {
      ...U, uEye: { value: eye.clone() },
      cBody: { value: lin(k.body) }, cBody2: { value: lin(k.body2) }, cGold: { value: lin(k.gold) }, cRose: { value: lin(k.rose) }, cEdge: { value: lin(k.edge) },
    },
    vertexShader: `uniform vec3 uEye; varying vec3 vDir; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vDir = w.xyz - uEye; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      ${COMMON_GLSL()}
      uniform vec3 cBody, cBody2, cGold, cRose, cEdge;
      varying vec3 vDir;
      float cloudAt(float az, float el, vec4 b, vec4 b2){
        // low streaks: long in azimuth, thin in elevation, crowded just above the far shore
        float lowW = smoothstep(0.025, 0.05, el) * (1.0 - smoothstep(0.13, 0.22, el));
        float s1 = fbm(vec2(az * 1.8, el * 34.0) + vec2(3.1, 0.0));
        float lo = band(s1 + (b.a - 0.5) * 0.25 + (b2.b - 0.5) * 0.1, 0.5) * lowW;
        // the higher bank: broader shapes, broken edges
        float hiW = smoothstep(0.14, 0.22, el) * (1.0 - smoothstep(0.5, 0.64, el));
        float s2 = fbm(vec2(az * 1.3, el * 8.5) + vec2(7.7, 2.0));
        float hi = band(s2 + (b2.a - 0.5) * 0.25, 0.6) * hiW;
        return max(lo, hi);
      }
      void main(){
        vec3 d = normalize(vDir);
        float el = asin(clamp(d.y, -1.0, 1.0)), az = atan(d.x, -d.z);
        vec2 uv = vec2(az * 0.9, el * 3.2);
        vec4 b = texture2D(tBrush, uv * vec2(1.0, 1.6) + 0.13);
        vec4 b2 = texture2D(tBrush, uv * vec2(0.45, 0.7) + 0.57);
        float c = cloudAt(az, el, b, b2);
        if (c < 0.02) discard;
        // is there cloud just below? if not, this is the underside the low sun lights
        float below = cloudAt(az, el - 0.012, b, b2);
        float under = 1.0 - below;
        float cs = dot(d, uKeyDir);
        float sunK = smoothstep(0.55, 0.98, cs);
        vec3 body = mix(cBody, cBody2, band(b.b + (b2.b - 0.5) * 0.3, 0.5));
        body = mix(body, cRose, 0.35 * smoothstep(0.2, 0.9, cs));
        vec3 lit = mix(cRose, cGold, sunK);
        // the low streaks stay lilac-rose even near the sun (only their undersides take the gold), so they read on the gold sky
        float lowK = 1.0 - smoothstep(0.12, 0.2, el);
        vec3 col = mix(body, lit, max(under * (0.55 + 0.45 * band(b.a, 0.4)) * mix(1.0, 0.7, lowK), sunK * 0.55 * (1.0 - lowK * 0.7)));
        // near the sun the whole cloud glows
        col = mix(col, cEdge * 1.1, sunK * sunK * 0.35 * (1.0 - lowK * 0.6));
        // sinks a little into the warm haze toward the horizon
        col = mix(col, mix(uAir, uAirSun, sunK), (1.0 - smoothstep(0.02, 0.1, el)) * 0.3);
        gl_FragColor = vec4(col, c * (1.0 - sunK * sunK * 0.2));
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = -9;
  mesh.userData.castShadow = false;
  return mesh;
}
