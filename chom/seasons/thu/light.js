// Chớm world, season Thu: the night light, all in one place.
//   No sun (sun.on: false). Six lamps through core.lamp (core README 6b): the flower seller's little lamp over her basket (the
//   bottle's light), two sodium street lamps with their own shadow maps, the tea stall's bare bulb (with shadows), a third
//   street lamp and a shop mouth. The core has six light slots, so the street lamps further down get painted pools only.
import * as THREE from 'three';

// the sun is off (no sunlight, no sun shadows); its direction still orients the offset colour rims on the main things
export const NIGHT_SUN = { dir: [-0.55, 0.8, 0.25], color: '#2a3250', intensity: 0.2, on: false };
// the bottle's paper label is lit by the seller's lamp right above it
export const LABEL_LIGHT = { color: '#ffdcb0', k: 1.75 };

// the street lamps: concrete posts in the tree line by the lake (between the trunks), a curved arm reaching over the road,
// a sodium head
const LAMP_Z = [-2.2, -27.2, -44.0, -60.8, -77.6, -94.4];
export const LAMP_POST_X = -4.5;
export const LAMPS = LAMP_Z.map((z, i) => ({ post: [LAMP_POST_X, z], head: [-1.9, 7.0, z + 0.2], hero: i === 0 }));

const V = (a) => new THREE.Vector3(...a);
// the lights (core.lamp, slots 0-9; slot 0 is the core's hot cone on the main things: the seller's lamp).
// The core lights in three steps that reach a long way, so the lamps are kept soft.
// Light 0 (the lamp on the bicycle's handlebars) belongs to people/xehoa: it carries the lamp with its bike and sets the
// light itself (radius 2.9, dir [-0.4, -1, 0.06], 94 degrees, k 1.8). The season only sets it when no folder plays the
// seller, so the stand-in scene still has a lamp over the basket.
const STREET = (i, lamp, k, shadow = false) => ({ name: `street lamp ${lamp + 1}`, i, lamp, radius: 12.5, color: '#ffb06a', k, shadow, cone: { dir: [0.15, -1, 0], outer: 58, inner: 22 } });
export const LIGHTS = [
  // the seller's lamp: over the basket and the bottle, tipped a little toward the hands that pass the flowers (stand-in only)
  { name: 'bike lamp', i: 0, standIn: true, radius: 2.9, color: '#ffd092', k: 1.8, cone: { dir: [-0.4, -1, 0.06], outer: 94, inner: 36 } },
  STREET(1, 0, 0.95, true),
  STREET(2, 1, 0.9, true),
  // the bare bulb over the tea table: kept soft, so the stall reads as a warm pool at the end of the street and does not
  // pull the eye off the bottle on a narrow screen
  { name: 'tea bulb', i: 3, at: [1.8, 2.2, -12.2], radius: 5.0, color: '#ffc47a', k: 0.85, shadow: true },
  STREET(4, 2, 0.85),
  { name: 'shop mouth', i: 5, at: [4.6, 1.9, -21.6], radius: 3.6, color: '#f0a860', k: 0.7, cone: { dir: [-1, -0.45, 0], outer: 80, inner: 40 } },
  STREET(6, 3, 0.85),
  STREET(7, 4, 0.8),
  STREET(8, 5, 0.8),
  { name: 'lane bulb', i: 9, at: [7.2, 2.8, -13.65], radius: 3.4, color: '#ffc88a', k: 0.8 },
];

// bikeLamp: the lamp's world position (the seller's lamp is where her bike stops)
// sellerCast: a people folder plays the seller, so it owns light 0 (its own bike, its own lamp) and the season leaves it alone
export function setupLights(core, { bikeLamp, sellerCast = false }) {
  for (const L of LIGHTS) {
    if (L.standIn && sellerCast) continue;
    const pos = L.name === 'bike lamp' ? bikeLamp : L.lamp !== undefined ? V(LAMPS[L.lamp].head) : V(L.at);
    core.lamp(L.i, pos, { radius: L.radius, color: L.color, k: L.k, shadow: !!L.shadow, cone: L.cone });
  }
}

// ---------------------------------------------------------------- painted light on the ground
// Each entry: { at: [x, z], r: [rx, rz], k, color }. A pool lifts the paint under it (dst * (1 + src)), with an edge cut by the
// real brush sheet; k < 0 makes a veil that pushes the paint back into the night outside the ellipse (dst * (1 - src)).
export function poolDecals(core, list) {
  const { THREE: T, U } = core;
  const lift = [], dark = [];
  for (const p of list) (p.k < 0 ? dark : lift).push(p);
  const meshes = [];
  for (const [set, darken] of [[lift, false], [dark, true]]) {
    if (!set.length) continue;
    const geos = set.map((p) => {
      const g = new T.PlaneGeometry(p.r[0] * 2, p.r[1] * 2, 1, 1).rotateX(-Math.PI / 2).toNonIndexed();
      g.translate(p.at[0], 0.012 + (darken ? 0.002 : 0), p.at[1]);
      const n = g.attributes.position.count, c = new T.Color(p.color ?? '#ffb060');
      const a = new Float32Array(n * 4), s = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { a.set([p.at[0], p.at[1], p.r[0], p.r[1]], i * 4); s.set([c.r, c.g, c.b, Math.abs(p.k)], i * 4); }
      g.setAttribute('aPool', new T.BufferAttribute(a, 4));
      g.setAttribute('aTint', new T.BufferAttribute(s, 4));
      g.deleteAttribute('normal'); g.deleteAttribute('uv');
      return g;
    });
    const m = new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      blending: T.CustomBlending, blendEquation: T.AddEquation,
      blendSrc: darken ? T.ZeroFactor : T.DstColorFactor, blendDst: darken ? T.OneMinusSrcColorFactor : T.OneFactor,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      uniforms: { tBrush: U.tBrush, tWash: U.tWash, uDark: { value: darken ? 1 : 0 } },
      vertexShader: /* glsl */`
        attribute vec4 aPool, aTint; varying vec3 vWP; varying vec4 vPool, vTint;
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; vPool = aPool; vTint = aTint; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`
        uniform sampler2D tBrush, tWash; uniform float uDark;
        varying vec3 vWP; varying vec4 vPool, vTint;
        float band(float x, float t){ float w = max(fwidth(x), 1e-4) * 0.75; return smoothstep(t - w, t + w, x); }
        void main(){
          vec2 q = (vWP.xz - vPool.xy) / vPool.zw;
          float r = length(q);
          vec4 b = texture2D(tBrush, vWP.xz * vec2(0.5, 0.16) + vec2(0.31, 0.77));
          vec4 b2 = texture2D(tBrush, vWP.zx * vec2(0.21, 0.6) + vec2(0.13, 0.41));
          vec4 w = texture2D(tWash, vWP.xz * 0.06 + 0.5);
          float e = r + (b.a - 0.5) * 0.35 + (b2.b - 0.5) * 0.2 + (w.r - 0.5) * 0.15;
          float a;
          if (uDark > 0.5) a = band(e, 0.72) * 0.75 + band(e, 0.95) * 0.25;
          else a = (1.0 - band(e, 0.9)) * 0.35 + (1.0 - band(e, 0.6)) * 0.35 + (1.0 - band(e, 0.3)) * 0.3;
          a *= vTint.a;
          if (a < 0.004) discard;
          vec3 c = uDark > 0.5 ? vec3(a) : vTint.rgb * a * (0.85 + 0.3 * b.b);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const mesh = new T.Mesh(merge(T, geos), m);
    mesh.frustumCulled = false;
    mesh.renderOrder = darken ? 2 : 1;
    mesh.userData.castShadow = false;
    meshes.push(mesh);
  }
  return meshes;
}

function merge(T, geos) {
  const names = Object.keys(geos[0].attributes);
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const out = new T.BufferGeometry();
  for (const k of names) {
    const size = geos[0].attributes[k].itemSize, arr = new Float32Array(n * size);
    let o = 0;
    for (const g of geos) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; }
    out.setAttribute(k, new T.BufferAttribute(arr, size));
  }
  return out;
}
