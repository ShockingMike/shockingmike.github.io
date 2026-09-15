/* Picking and highlighting objects on the desk.
   - Pick proxies: invisible boxes or cylinders parented to each object (so they follow the lamp's swing, the hull's
     roll and the objects' own movement). Ray casts test only these, which is cheap and forgiving to aim at.
   - Highlight: a thin orange outline that follows the object's shape, never a tint over its surface.
     · solid things: an outline shell, the object's back faces pushed out along their normals by a fixed number of
       screen pixels (so it is equally thin near and far) in flat, unlit orange; the object's own front faces hide
       everything but the ring around its silhouette;
     · paper (flat meshes: sheets, the crew list, cards): an orange line of about 4 px just inside the sheet's outline.
     · hover / keyboard focus: the outline, steady; hint (setHint, the object to look at next): the very same outline,
       its strength pulsing between 35 % and 100 % about every 1.6 s. Hovering the hinted object shows it steady.
     All objects share one outline program and one paper-line program. */
import * as THREE from 'three';

const proxyMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, colorWrite: false, depthWrite: false });

export function addProxy(parent, id, shape, size, offset = [0, 0, 0], rotation = [0, 0, 0]) {
  const geo = shape === 'cylinder' ? new THREE.CylinderGeometry(size[0], size[0], size[1], 20) : new THREE.BoxGeometry(size[0], size[1], size[2]);
  const m = new THREE.Mesh(geo, proxyMat);
  m.position.set(offset[0], offset[1], offset[2]);
  m.rotation.set(rotation[0], rotation[1], rotation[2]);
  m.visible = false;
  m.userData = { pickId: id, pickProxy: true };
  m.name = 'pick:' + id;
  geo.computeBoundingBox();
  parent.add(m);
  return m;
}

const SKIP = new Set(['contactShadow', 'domeGlass', 'lampGlass', 'glass', 'glow', 'flame', 'steam', 'coffee']);
const HINT_PERIOD = 1.6, HINT_LOW = 0.35;
const ORANGE = new THREE.Color(0.95, 0.47, 0.13);

const OUTLINE_VERT = /* glsl */`
  uniform vec2 uRes; uniform float uPx;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    mv.xyz += normalize(-mv.xyz) * 0.0015;
    vec4 clip = projectionMatrix * mv;
    vec3 nV = normalize(normalMatrix * normal);
    vec2 s = (projectionMatrix * vec4(nV, 0.0)).xy * uRes;
    float l = length(s);
    vec2 dir = l > 1e-6 ? s / l : vec2(0.0);
    clip.xy += dir * (2.0 * uPx / uRes) * clip.w;
    gl_Position = clip;
  }`;
const OUTLINE_FRAG = /* glsl */`
  uniform float uK; uniform vec3 uColor;
  void main() { gl_FragColor = vec4(uColor * uK, uK); }`;

const LINE_VERT = /* glsl */`
  varying vec3 vP;
  void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const LINE_FRAG = /* glsl */`
  uniform float uK, uLine; uniform vec3 uColor, uMin, uMax, uMask;
  varying vec3 vP;
  void main() {
    vec3 dd = min(vP - uMin, uMax - vP) + (1.0 - uMask) * 1e3;
    float m = min(dd.x, min(dd.y, dd.z));
    float px = m / max(fwidth(m), 1e-7);
    // uLine: the line's width in device pixels
    float a = (smoothstep(0.5, 1.5, px) - smoothstep(uLine, uLine + 1.5, px)) * uK * 0.95;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor * a, a);
  }`;

// a mesh with no real thickness (a sheet, a card): it gets the paper line, an outline shell would have nothing to wrap
function isFlat(geo) {
  if (geo.type === 'PlaneGeometry') return true;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const s = geo.boundingBox.getSize(new THREE.Vector3());
  return Math.min(s.x, s.y, s.z) < 0.0025;
}
const blend = { transparent: true, depthWrite: false, depthTest: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };

export function createHighlights(groups) {
  const byId = {};
  const shells = [];
  const resU = { value: new THREE.Vector2(1, 1) }, colorU = { value: ORANGE };
  let pulse = 1, dpr = 1;
  const pxUniforms = [];
  for (const id in groups) {
    // px: outline width in CSS pixels; linePx: the paper line's width in CSS pixels
    const { roots, px = 2.5, linePx = 4.5 } = groups[id];
    const kU = { value: 0 }, pxU = { value: px }, lineU = { value: linePx };
    pxUniforms.push([pxU, px], [lineU, linePx]);
    const outline = new THREE.ShaderMaterial({ uniforms: { uK: kU, uColor: colorU, uRes: resU, uPx: pxU }, vertexShader: OUTLINE_VERT, fragmentShader: OUTLINE_FRAG, side: THREE.BackSide, ...blend });
    const paperLine = (geo) => {
      if (!geo.boundingBox) geo.computeBoundingBox();
      const bb = geo.boundingBox, s = bb.getSize(new THREE.Vector3()), mask = new THREE.Vector3(1, 1, 1);
      mask[s.x <= s.y && s.x <= s.z ? 'x' : s.y <= s.z ? 'y' : 'z'] = 0;
      return new THREE.ShaderMaterial({ uniforms: { uK: kU, uLine: lineU, uColor: colorU, uMin: { value: bb.min.clone() }, uMax: { value: bb.max.clone() }, uMask: { value: mask } }, vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...blend });
    };
    const list = [];
    roots.forEach((root) => root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.userData.pickProxy || o.userData.shell || SKIP.has(o.name)) return;
      if (Array.isArray(o.material) || (o.material && o.material.transparent) || !o.geometry.attributes.normal) return;
      list.push(o);
    }));
    const own = list.map((o) => {
      const flat = isFlat(o.geometry);
      const s = new THREE.Mesh(o.geometry, flat ? paperLine(o.geometry) : outline);
      s.userData.shell = true;
      s.name = 'highlight';
      s.renderOrder = 9;
      s.visible = false;
      s.frustumCulled = false;
      s.castShadow = s.receiveShadow = false;
      o.add(s);
      return s;
    });
    shells.push(...own);
    byId[id] = { kU, shells: own, k: 0, hk: 0 };
  }
  let target = null, hintId = null;
  function update(dt) {
    const kk = 1 - Math.exp(-dt * 10);
    const t = performance.now() / 1000;
    const b = 0.5 - 0.5 * Math.cos((t * Math.PI * 2) / HINT_PERIOD);
    pulse = HINT_LOW + (1 - HINT_LOW) * b * b * (3 - 2 * b);
    for (const id in byId) {
      const h = byId[id];
      const want = id === target ? 1 : 0, wantH = id === hintId ? 1 : 0;
      h.k += (want - h.k) * kk;
      if (Math.abs(want - h.k) < 0.003) h.k = want;
      h.hk += (wantH - h.hk) * kk;
      if (Math.abs(wantH - h.hk) < 0.003) h.hk = wantH;
      // the same outline: steady when hovered, pulsing when hinted
      const k = Math.max(h.k, h.hk * pulse);
      h.kU.value = k;
      const vis = k > 0.004;
      if (h.shells.length && h.shells[0].visible !== vis) h.shells.forEach((s) => { s.visible = vis; });
    }
  }
  return {
    shells,
    // the render size in device pixels and the pixel ratio (outline widths are given in CSS pixels)
    setViewport(w, h, pixelRatio) {
      resU.value.set(Math.max(1, w), Math.max(1, h));
      dpr = pixelRatio || 1;
      pxUniforms.forEach(([u, px]) => { u.value = px * dpr; });
    },
    setTarget(id) { target = byId[id] ? id : null; },
    setHint(id) { hintId = byId[id] ? id : null; },
    get target() { return target; },
    get hint() { return hintId; },
    update,
    level: (id) => (byId[id] ? byId[id].kU.value : 0),
    hintLevel: (id) => (byId[id] ? byId[id].hk : 0),
    pulse: () => pulse
  };
}
