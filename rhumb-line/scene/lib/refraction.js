/* Refractive glass without drawing the cabin twice.
   three.js draws a refractive (transmission) material by first rendering every opaque object a second time into a
   texture of its own (same size, 4x MSAA, half float, mipmapped), then drawing the glass on top, sampling that texture.
   That texture holds exactly what the scene target holds once its opaque objects are drawn, so here the scene is drawn
   in steps and the glass samples a copy of the scene target instead:
     1. opaque objects (layer 0) into the scene target, shadow maps updated;
     2. copy the resolved scene target into the refraction texture and build its mipmaps, as three does;
     3. only when a double-sided glass is in view: its back faces (layer 3, twins with side = BackSide) into the scene
        target, then copy again (three draws those back faces into its texture too, so the far side of a globe shows
        through the near side);
     4. glass (layer 1) and transparent objects (layer 2) on top, no clear.
   Same pixels as three's own path, without the second cabin (about 300 draw calls and a full-screen MSAA pass a
   frame). The glass materials keep all their settings; their transmission is switched on in the shader
   (USE_TRANSMISSION) rather than through material.transmission, which would make three start its own pass. */
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const LAYER = { opaque: 0, glass: 1, clear: 2, back: 3 };
export const MASK = { scene: 0b0111, opaque: 0b0001, back: 0b1000, over: 0b0110, all: 0b1111 };

export function createRefraction(renderer, glassMaterials) {
  const rt = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter,
    depthBuffer: false, colorSpace: THREE.ColorManagement.workingColorSpace
  });
  rt.texture.name = 'refraction';
  const samplerU = { value: rt.texture }, sizeU = { value: new THREE.Vector2(1, 1) };
  const copy = new FullScreenQuad(new THREE.ShaderMaterial({
    name: 'refractionCopy',
    uniforms: { tSrc: { value: null } },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tSrc; void main() { gl_FragColor = texelFetch(tSrc, ivec2(gl_FragCoord.xy), 0); }',
    blending: THREE.NoBlending, depthTest: false, depthWrite: false, toneMapped: false
  }));

  // the material's transmission moves into the shader; three sees an ordinary opaque physical material
  function convert(mat, transmission) {
    const before = Object.prototype.hasOwnProperty.call(mat, 'onBeforeCompile') ? mat.onBeforeCompile : null;
    const beforeKey = Object.prototype.hasOwnProperty.call(mat, 'customProgramCacheKey') ? mat.customProgramCacheKey : null;
    mat.transmission = 0;
    mat.userData.refraction = true;
    mat.onBeforeCompile = (sh, r) => {
      if (before) before.call(mat, sh, r);
      sh.vertexShader = '#define USE_TRANSMISSION\n' + sh.vertexShader;
      sh.fragmentShader = '#define USE_TRANSMISSION\n' + sh.fragmentShader;
      sh.uniforms.transmission.value = transmission;
      sh.uniforms.thickness.value = mat.thickness;
      sh.uniforms.attenuationDistance.value = mat.attenuationDistance;
      sh.uniforms.attenuationColor.value.copy(mat.attenuationColor);
      sh.uniforms.transmissionSamplerMap = samplerU;
      sh.uniforms.transmissionSamplerSize = sizeU;
    };
    mat.customProgramCacheKey = () => (beforeKey ? beforeKey.call(mat) : '') + '|shared-refraction';
    mat.needsUpdate = true;
  }
  const backOf = new Map();
  for (const mat of glassMaterials) {
    const t = mat.transmission;
    if (!(t > 0)) continue;
    if (mat.side === THREE.DoubleSide) {
      // made in the materials' own order, so the back faces sort the way three sorts them (by material id)
      const back = mat.clone();
      back.side = THREE.BackSide;
      back.name = (mat.name || 'glass') + 'Back';
      convert(back, t);
      backOf.set(mat, back);
    }
    convert(mat, t);
  }

  const glass = [], twins = [];
  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4();
  const shown = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
  return {
    target: rt,
    // after the scene is built: twins for the back faces, and every renderable on its layer
    attach(scene) {
      scene.traverse((o) => { if (o.isMesh && o.material && o.material.userData && o.material.userData.refraction && !o.userData.refractionTwin) glass.push(o); });
      glass.forEach((o) => {
        const back = backOf.get(o.material);
        if (!back) return;
        const t = new THREE.Mesh(o.geometry, back);
        t.name = o.name; t.userData.refractionTwin = true;
        t.castShadow = false; t.receiveShadow = o.receiveShadow; t.renderOrder = o.renderOrder; t.frustumCulled = o.frustumCulled;
        t.layers.set(LAYER.back);
        o.add(t);
        twins.push(t);
      });
      scene.traverse((o) => {
        if (o.isLight) { o.layers.enableAll(); return; }
        if (!(o.isMesh || o.isPoints || o.isLine || o.isSprite) || o.userData.refractionTwin) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const isGlass = mats.some((m) => m && m.userData && m.userData.refraction);
        const isClear = mats.some((m) => m && m.transparent);
        o.layers.set(isGlass ? LAYER.glass : isClear ? LAYER.clear : LAYER.opaque);
      });
      return { glass: glass.length, twins: twins.length };
    },
    twins,
    setSize(w, h) { rt.setSize(w, h); sizeU.value.set(w, h); },
    // what is in view this frame: any glass at all, any double-sided glass (three culls the same way)
    inView(camera) {
      pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(pv, THREE.WebGLCoordinateSystem, camera.reversedDepth);
      let any = false, back = false;
      for (const o of glass) {
        if (!shown(o) || (o.frustumCulled && !frustum.intersectsObject(o))) continue;
        any = true;
        if (backOf.has(o.material)) { back = true; break; }
      }
      return { any, back };
    },
    // resolved scene target -> refraction texture, mipmaps built by three after the draw
    copyFrom(src) {
      copy.material.uniforms.tSrc.value = src.texture;
      renderer.setRenderTarget(rt);
      copy.render(renderer);
    },
    dispose() { rt.dispose(); copy.dispose(); }
  };
}
