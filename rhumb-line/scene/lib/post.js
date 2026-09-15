/* Post pipeline: HDR scene (MSAA + depth) -> GTAO -> depth of field -> bloom -> ACES output -> grade (saturation, tint,
   vignette, grain, fade to dark) -> SMAA. */
import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const QUAD_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

export function createPost(renderer, scene, camera, Q) {
  const depthTexture = new THREE.DepthTexture(1, 1);
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: Q.msaa, depthTexture });
  const hdr = { type: THREE.HalfFloatType, depthBuffer: false };
  const aoRT = new THREE.WebGLRenderTarget(1, 1, hdr);
  const dofRT = new THREE.WebGLRenderTarget(1, 1, hdr);
  const ldrRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const gradeRT = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });

  let gtao = null;
  const hideForAO = [];
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.28, 2.2);
  const output = new OutputPass();
  const smaa = new SMAAPass();
  smaa.renderToScreen = true;

  const dofMat = new THREE.ShaderMaterial({
    defines: { TAPS: Q.dofTaps || 48 },
    uniforms: {
      tColor: { value: null }, tDepth: { value: depthTexture }, uTexel: { value: new THREE.Vector2() },
      uNear: { value: 0.02 }, uFar: { value: 100 }, uFocus: { value: 1 }, uRange: { value: 0.16 },
      uFarK: { value: 1.25 }, uNearK: { value: 1.0 }, uMaxCoc: { value: 8 }, uOn: { value: 1 }
    },
    vertexShader: QUAD_VERT,
    fragmentShader: /* glsl */`
      uniform sampler2D tColor, tDepth; uniform vec2 uTexel;
      uniform float uNear, uFar, uFocus, uRange, uFarK, uNearK, uMaxCoc, uOn;
      varying vec2 vUv;
      float viewZ(float d) { float z = d * 2.0 - 1.0; return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
      float coc(float z) {
        float dz = z - uFocus;
        float c = dz > 0.0 ? max(0.0, dz - uRange) / z * uFarK : max(0.0, -dz - uRange * 0.7) / z * uNearK;
        return clamp(c, 0.0, 1.0) * uMaxCoc;
      }
      vec3 fetch(vec2 uv) {
        vec3 c = texture2D(tColor, uv).rgb;
        if (!(c.r == c.r) || !(c.g == c.g) || !(c.b == c.b)) c = vec3(0.0);
        float m = max(c.r, max(c.g, c.b));
        return m > 10.0 ? c * (10.0 / m) : c;
      }
      void main() {
        vec3 base = fetch(vUv);
        if (uOn < 0.5) { gl_FragColor = vec4(base, 1.0); return; }
        float z0 = viewZ(texture2D(tDepth, vUv).x);
        float c0 = coc(z0);
        vec3 acc = base; float wsum = 1.0;
        for (int i = 1; i < TAPS; i++) {
          float fi = float(i);
          float r = sqrt(fi / float(TAPS)) * uMaxCoc;
          float a = fi * 2.39996323;
          vec2 uv = vUv + vec2(cos(a), sin(a)) * r * uTexel;
          float zs = viewZ(texture2D(tDepth, uv).x);
          float cs = coc(zs);
          float cUse = zs > z0 ? min(cs, c0) : cs;
          float w = smoothstep(r - 1.0, r + 0.5, cUse);
          acc += fetch(uv) * w; wsum += w;
        }
        gl_FragColor = vec4(acc / wsum, 1.0);
      }`
  });
  const dofQuad = new FullScreenQuad(dofMat);

  const gradeMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uAspect: { value: 1 }, uVig: { value: 0.3 }, uGrain: { value: 0.035 }, uTime: { value: 0 }, uSat: { value: 1 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uFade: { value: 1 } },
    vertexShader: QUAD_VERT,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uAspect, uVig, uGrain, uTime, uSat, uFade; uniform vec3 uTint; varying vec2 vUv;
      float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = max(mix(vec3(luma), c, uSat) * uTint, 0.0);
        vec2 q = vUv - 0.5; q.x *= uAspect;
        float v = smoothstep(1.05, 0.2, length(q) * 1.15);
        c *= mix(1.0 - uVig, 1.0, v);
        float g = h12(gl_FragCoord.xy + fract(uTime * 13.7) * 211.0) + h12(gl_FragCoord.xy * 1.37 + fract(uTime * 7.3) * 97.0) - 1.0;
        c += g * uGrain * (0.35 + 0.65 * (1.0 - dot(c, vec3(0.3333))));
        gl_FragColor = vec4(c * uFade, 1.0);
      }`
  });
  const gradeQuad = new FullScreenQuad(gradeMat);

  function setAO(on) {
    Q.ao = on;
    if (on && !gtao) {
      gtao = new GTAOPass(scene, camera, Math.max(1, sceneRT.width), Math.max(1, sceneRT.height));
      gtao.output = GTAOPass.OUTPUT.Default;
      gtao.blendIntensity = 0.85;
      gtao.updateGtaoMaterial({ radius: 0.07, distanceExponent: 1.3, thickness: 0.02, scale: 1.3, samples: 16, distanceFallOff: 1.0, screenSpaceRadius: false });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    }
  }
  setAO(Q.ao);

  function setSize(w, h) {
    sceneRT.setSize(w, h); aoRT.setSize(w, h); dofRT.setSize(w, h); ldrRT.setSize(w, h); gradeRT.setSize(w, h);
    if (gtao) gtao.setSize(w, h);
    bloom.setSize(w, h);
    smaa.setSize(w, h);
    dofMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    dofMat.uniforms.uMaxCoc.value = Math.max(3, h * 0.0075);
    gradeMat.uniforms.uAspect.value = w / h;
  }

  // upto: 0 nothing (state only), 1 scene (and shadows), 2 + AO, 3 + depth of field, 4 + bloom, 5+ everything
  function render(dt, P, upto = 9) {
    if (upto <= 0) return;
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);
    if (upto <= 1) return;
    let src = sceneRT;
    if (Q.ao && gtao) {
      for (let i = 0; i < hideForAO.length; i++) hideForAO[i].userData._v = hideForAO[i].visible, hideForAO[i].visible = false;
      gtao.render(renderer, aoRT, sceneRT);
      for (let i = 0; i < hideForAO.length; i++) hideForAO[i].visible = hideForAO[i].userData._v;
      src = aoRT;
    }
    if (upto <= 2) return;
    const u = dofMat.uniforms;
    u.tColor.value = src.texture; u.uNear.value = camera.near; u.uFar.value = camera.far;
    u.uFocus.value = P.focus; u.uOn.value = Q.dof ? 1 : 0;
    renderer.setRenderTarget(dofRT);
    dofQuad.render(renderer);
    if (upto <= 3) return;
    bloom.strength = P.bloom;
    bloom.render(renderer, null, dofRT, dt, false);
    if (upto <= 4) return;
    output.render(renderer, ldrRT, dofRT);
    gradeMat.uniforms.tDiffuse.value = ldrRT.texture;
    gradeMat.uniforms.uVig.value = P.vignette;
    gradeMat.uniforms.uTime.value = P.time;
    gradeMat.uniforms.uSat.value = P.sat;
    gradeMat.uniforms.uTint.value.set(P.tint[0], P.tint[1], P.tint[2]);
    gradeMat.uniforms.uFade.value = P.fade;
    renderer.setRenderTarget(gradeRT);
    gradeQuad.render(renderer);
    smaa.render(renderer, null, gradeRT);
  }

  return { render, setSize, setAO, hideForAO, sceneRT, bloom };
}
