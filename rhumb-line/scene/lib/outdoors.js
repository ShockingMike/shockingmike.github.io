/* Sky, sea and falling rain, fixed to the world (the cabin rolls, they do not). All are pure shaders:
   sky gradient, sun or moon, procedural clouds, stars, lightning glow; Gerstner swell with per-pixel normals,
   Fresnel sky reflection, sun or moon glitter, crest foam and distance haze. No image files. */
import * as THREE from 'three';
import { GLSL_NOISE } from './util.js';
import { LAYOUT } from './layout.js';

const SKY_PARS = /* glsl */`
uniform float uTime, uSkyGain, uSunDisc, uSunGlow, uSunSize, uClouds, uCloudDark, uStars, uMoon, uHaze, uFlash, uOutGain;
uniform vec3 uZenith, uHorizon, uSunDir, uSunColor, uHazeColor, uFlashDir;
vec3 skyBase(vec3 d) {
  float up = max(d.y, 0.0);
  vec3 col = mix(uHorizon, uZenith, pow(up, 0.5));
  float mu = max(dot(d, uSunDir), 0.0);
  col += uSunColor * uSunGlow * (0.16 * pow(mu, 5.0) + 0.55 * pow(mu, 60.0));
  col = mix(col, uHazeColor, uHaze * exp(-up * 10.0));
  col += vec3(0.7, 0.78, 1.0) * uFlash * (0.25 + 1.2 * pow(max(dot(d, uFlashDir), 0.0), 4.0));
  return col * uSkyGain;
}
`;

export function createOutdoors() {
  const uniforms = {
    uTime: { value: 0 }, uSkyGain: { value: 1 }, uSunDisc: { value: 0 }, uSunGlow: { value: 1 }, uSunSize: { value: 0.012 },
    uClouds: { value: 0 }, uCloudDark: { value: 0 }, uStars: { value: 0 }, uMoon: { value: 0 }, uHaze: { value: 0 }, uFlash: { value: 0 },
    uZenith: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color() }, uHazeColor: { value: new THREE.Color() }, uFlashDir: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
    uSeaDeep: { value: new THREE.Color() }, uSeaScatter: { value: new THREE.Color() }, uWaveAmp: { value: 0.4 }, uChop: { value: 0.5 },
    uFoam: { value: 0 }, uGlitter: { value: 1 }, uFog: { value: 0.0001 }, uRainOut: { value: 0 }, uOutGain: { value: 1 }
  };

  const sky = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      ${SKY_PARS}
      ${GLSL_NOISE}
      void main() {
        vec3 d = normalize(vDir);
        float up = max(d.y, 0.0);
        vec3 col = skyBase(d);
        float mu = dot(d, uSunDir);
        float disc = smoothstep(cos(uSunSize * 1.25), cos(uSunSize), mu);
        if (uMoon > 0.5) {
          vec3 t1 = normalize(cross(uSunDir, vec3(0.0, 1.0, 0.0)));
          vec3 t2 = cross(t1, uSunDir);
          vec2 mp = vec2(dot(d, t1), dot(d, t2)) / uSunSize;
          disc *= 0.72 + 0.28 * smoothstep(0.35, 0.7, fbm(mp * 2.2 + 3.0));
        }
        col += uSunColor * disc * uSunDisc;
        if (uStars > 0.01) {
          vec3 sp = d * 160.0;
          vec3 cell = floor(sp);
          float hs = hash13(cell);
          if (hs > 0.984) {
            vec3 jit = hash33(cell) - 0.5;
            float dd = length(fract(sp) - 0.5 - jit * 0.55);
            float tw = 0.65 + 0.35 * sin(uTime * (1.5 + hs * 6.0) + hs * 80.0);
            col += vec3(0.85, 0.92, 1.0) * smoothstep(0.16, 0.0, dd) * tw * uStars * smoothstep(0.0, 0.12, up) * (hs - 0.984) * 180.0;
          }
        }
        if (uClouds > 0.01) {
          vec2 uv = d.xz / (up + 0.14) * 1.3 + vec2(uTime * 0.022, uTime * 0.007) * (1.0 + uCloudDark * 2.0);
          float n = fbm(uv * 1.5);
          float n2 = fbm(uv * 4.1 + 7.1);
          float th = mix(0.78, 0.20, uClouds);
          float dens = smoothstep(th, th + 0.26, n * 0.8 + n2 * 0.32) * smoothstep(-0.03, 0.06, d.y);
          float lit = 0.55 + 0.45 * pow(max(dot(d, uSunDir), 0.0), 3.0);
          vec3 cloud = mix(uHorizon * 0.55 + uSunColor * 0.55 * uSunGlow + 0.08, uHazeColor * 0.55, uCloudDark) * lit;
          cloud *= 1.0 - 0.5 * n2 * uCloudDark;
          cloud += vec3(0.75, 0.82, 1.0) * uFlash * (0.4 + 1.6 * n2) * (0.3 + pow(max(dot(d, uFlashDir), 0.0), 2.0) * 2.0);
          col = mix(col, cloud * uSkyGain, dens * min(1.0, uClouds * 1.4));
        }
        col = mix(col, uHazeColor * uSkyGain, uHaze * 0.85 * exp(-up * 16.0));
        gl_FragColor = vec4(col * uOutGain, 1.0);
      }`
  }));
  sky.frustumCulled = false;
  sky.renderOrder = 20;
  sky.name = 'sky';

  // polar grid, dense near the ship
  const rings = 110, segs = 220, pos = [], idx = [];
  for (let i = 0; i <= rings; i++) {
    const r = i === 0 ? 0 : 4 * (Math.pow(1.04, i) - 1) / 0.04;
    for (let j = 0; j <= segs; j++) { const a = (j / segs) * Math.PI * 2; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) { const a = i * (segs + 1) + j, b = a + segs + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const seaGeo = new THREE.BufferGeometry();
  seaGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  seaGeo.setIndex(idx);
  const WAVES = /* glsl */`
    const vec4 W0 = vec4(0.35, 72.0, 0.46, 0.0);
    const vec4 W1 = vec4(-0.55, 39.0, 0.30, 1.7);
    const vec4 W2 = vec4(1.05, 19.0, 0.16, 4.1);
    const vec4 W3 = vec4(-1.25, 9.3, 0.085, 2.3);
    const vec4 W4 = vec4(0.75, 4.7, 0.045, 5.2);
    const vec4 W5 = vec4(-0.15, 2.4, 0.026, 0.9);
    vec4 waveAt(int i) { return i == 0 ? W0 : i == 1 ? W1 : i == 2 ? W2 : i == 3 ? W3 : i == 4 ? W4 : W5; }
  `;
  const sea = new THREE.Mesh(seaGeo, new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      uniform float uTime, uWaveAmp, uChop;
      varying vec3 vWorld; varying float vCrest;
      ${WAVES}
      void main() {
        vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
        float dist = length(p.xz - cameraPosition.xz);
        vec3 disp = vec3(0.0);
        for (int i = 0; i < 6; i++) {
          vec4 w = waveAt(i);
          float k = 6.2831853 / w.y, om = sqrt(9.81 * k);
          vec2 D = vec2(cos(w.x), sin(w.x));
          float A = w.z * uWaveAmp * (1.0 - smoothstep(w.y * 25.0, w.y * 110.0, dist));
          float th = k * dot(D, p.xz) - om * uTime + w.w;
          disp.xz += uChop * 0.7 * A * D * cos(th);
          disp.y += A * sin(th);
        }
        vCrest = disp.y / max(uWaveAmp, 0.05);
        p += disp;
        vWorld = p;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSeaDeep, uSeaScatter;
      uniform float uWaveAmp, uChop, uFoam, uGlitter, uFog;
      varying vec3 vWorld; varying float vCrest;
      ${SKY_PARS}
      ${GLSL_NOISE}
      ${WAVES}
      void main() {
        vec3 toCam = cameraPosition - vWorld;
        float dist = length(toCam.xz);
        vec3 V = normalize(toCam);
        vec3 N = vec3(0.0, 1.0, 0.0);
        for (int i = 0; i < 6; i++) {
          vec4 w = waveAt(i);
          float k = 6.2831853 / w.y, om = sqrt(9.81 * k);
          vec2 D = vec2(cos(w.x), sin(w.x));
          float A = w.z * uWaveAmp * (1.0 - smoothstep(w.y * 25.0, w.y * 110.0, dist));
          float th = k * dot(D, vWorld.xz) - om * uTime + w.w;
          float c = cos(th), s = sin(th);
          N.x -= D.x * k * A * c;
          N.z -= D.y * k * A * c;
          N.y -= uChop * 0.7 * k * A * s;
        }
        float fd = 1.0 - smoothstep(40.0, 420.0, dist);
        vec2 dp = vWorld.xz * 0.8 + vec2(uTime * 0.55, uTime * 0.32);
        float e = 0.1, h0 = fbm3o(dp);
        N.xz -= vec2(fbm3o(dp + vec2(e, 0.0)) - h0, fbm3o(dp + vec2(0.0, e)) - h0) / e * 0.28 * fd * (0.35 + uChop);
        N = normalize(N);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N); R.y = abs(R.y) + 0.002;
        vec3 refl = skyBase(normalize(R)) * (1.0 - 0.45 * uClouds * uCloudDark) * mix(0.7, 1.0, uHaze);
        vec3 body = uSeaDeep * uSkyGain * 1.2;
        float crest = clamp(vCrest * 0.5 + 0.5, 0.0, 1.0);
        body += uSeaScatter * uSkyGain * pow(crest, 2.0) * (0.35 + 0.65 * pow(max(dot(V, -uSunDir) * 0.5 + 0.5, 0.0), 3.0));
        vec3 col = mix(body, refl, fres);
        float rs = max(dot(R, uSunDir), 0.0);
        float sharp = mix(1400.0, 1000.0, uMoon);
        col += uSunColor * uGlitter * uSkyGain * (pow(rs, sharp) * mix(50.0, 20.0, uMoon) + pow(rs, 90.0) * mix(1.2, 0.05, uMoon));
        float foamN = fbm(vWorld.xz * 0.22 + vec2(uTime * 0.08, uTime * 0.03));
        float foam = smoothstep(0.62, 0.92, crest * 0.85 + foamN * 0.45) * uFoam;
        col = mix(col, (uHorizon * 0.9 + 0.06) * uSkyGain * 1.6, foam * 0.85);
        float fog = 1.0 - exp(-dist * uFog);
        fog = max(fog, smoothstep(2600.0, 6500.0, dist));
        vec3 hz = skyBase(normalize(vec3(-V.x, 0.01, -V.z)));
        vec3 fogCol = mix(hz, uHazeColor * uSkyGain, uHaze * 0.85) * mix(0.62, 1.0, clamp(uHaze * 1.2, 0.0, 1.0));
        col = mix(col, fogCol, fog);
        gl_FragColor = vec4(col * uOutGain, 1.0);
      }`
  }));
  sea.position.y = LAYOUT.seaY;
  sea.frustumCulled = false;
  sea.renderOrder = 19;
  sea.name = 'sea';


  // rain: two open cylinders of falling streaks around the viewer, slanted by the wind, gusting in sheets.
  // Only the portholes look out, so the walls hide the rest.
  const rainMat = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, transparent: true, depthWrite: false,
    vertexShader: /* glsl */`
      varying vec2 vUv; varying vec3 vWorld;
      void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uRainOut, uSkyGain, uFlash, uHaze;
      uniform vec3 uHazeColor, uHorizon;
      varying vec2 vUv; varying vec3 vWorld;
      float h11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
      float layer(vec2 uv, float cols, float speed, float len, float seed) {
        float x = uv.x * cols + uv.y * 2.2;
        float col = floor(x), fx = fract(x) - 0.5;
        float r = h11(col + seed);
        float y = fract(uv.y * (0.55 + r * 0.35) + uTime * speed * (0.8 + r * 0.5) + r * 17.0);
        float streak = smoothstep(0.0, 0.02, y) * (1.0 - smoothstep(0.02, 0.02 + len, y));
        float w = smoothstep(0.16, 0.0, abs(fx + (r - 0.5) * 0.5));
        return streak * w * step(0.35, h11(col * 1.7 + seed + floor(uTime * 0.7 + r * 5.0)));
      }
      void main() {
        if (uRainOut < 0.005) discard;
        vec2 uv = vec2(vUv.x, vUv.y * 5.0);
        float gust = 0.55 + 0.45 * sin(vUv.x * 40.0 + uTime * 1.7) * sin(vUv.x * 13.0 - uTime * 0.6);
        float a = (layer(uv, 520.0, 1.9, 0.08, 1.0) * 0.8 + layer(uv * vec2(1.0, 1.4), 900.0, 2.6, 0.06, 7.0) * 0.6) * gust;
        vec3 col = (uHazeColor * 2.2 + uHorizon * 0.8 + 0.03) * uSkyGain + vec3(0.8, 0.88, 1.0) * uFlash * 1.5;
        gl_FragColor = vec4(col * a * uRainOut * 0.55, a * uRainOut * 0.4);
      }`,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor
  });
  const rain = new THREE.Group(); rain.name = 'rain';
  [3.2, 7.5].forEach((r, i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 16, 96, 1, true), rainMat);
    m.frustumCulled = false; m.renderOrder = 21 + i; m.name = 'rainSheet';
    rain.add(m);
  });

  function apply(W, flash) {
    uniforms.uSkyGain.value = W.skyGain; uniforms.uSunDisc.value = W.sunDisc; uniforms.uSunGlow.value = W.sunGlow; uniforms.uSunSize.value = W.sunSize;
    uniforms.uClouds.value = W.clouds; uniforms.uCloudDark.value = W.cloudDark; uniforms.uStars.value = W.stars; uniforms.uMoon.value = W.moon;
    uniforms.uHaze.value = W.haze; uniforms.uFlash.value = flash;
    uniforms.uZenith.value.setRGB(W.zenith[0], W.zenith[1], W.zenith[2]);
    uniforms.uHorizon.value.setRGB(W.horizon[0], W.horizon[1], W.horizon[2]);
    uniforms.uSunDir.value.set(W.sunDir[0], W.sunDir[1], W.sunDir[2]).normalize();
    uniforms.uSunColor.value.setRGB(W.sunColor[0], W.sunColor[1], W.sunColor[2]);
    uniforms.uHazeColor.value.setRGB(W.hazeColor[0], W.hazeColor[1], W.hazeColor[2]);
    uniforms.uSeaDeep.value.setRGB(W.seaDeep[0], W.seaDeep[1], W.seaDeep[2]);
    uniforms.uSeaScatter.value.setRGB(W.seaScatter[0], W.seaScatter[1], W.seaScatter[2]);
    uniforms.uWaveAmp.value = W.waveAmp; uniforms.uChop.value = W.chop; uniforms.uFoam.value = W.foam; uniforms.uGlitter.value = W.glitter; uniforms.uFog.value = W.fog;
    uniforms.uRainOut.value = W.rainOut;
    rain.visible = W.rainOut > 0.005;
  }
  return { sky, sea, rain, uniforms, apply };
}
