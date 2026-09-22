// Chớm paint test B: the 4-channel brush-stroke sheet, baked once from real scanned strokes (bake/bake-brush.mjs).
//   R,G  surface direction of the real paint (height taken from palette-knife and impasto photos) + each stroke's lean
//   B    tone per stroke (with the bristle streaks of the scan inside it)
//   A    detail mask: a value per stroke, frayed where the brush ran dry
// The sheet ships as two small PNGs; at load they are joined into one RGBA texture on the GPU (a few ms).
import * as THREE from 'three';

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// (as THREE.TextureLoader does, but the picture is decoded off the page's thread before it is used: img.decode())
// A picture that does not arrive the first time is asked for once more (a busy test server refuses a connection now and
// then): a season must not die of one refused request. If it still does not come, the words say which file it was.
// bitmap: the picture is also turned, off the page's thread, into the exact pixels the GPU takes (an ImageBitmap: turned
// upside down, alpha not multiplied in, no colour conversion — what WebGL does to an <img> for a texture with
// NoColorSpace and flipY). Sending an <img> makes the page's own thread do that turning at upload time: measured 22/9,
// one 1024 x 1024 brush sheet held the page 45 ms in a single texSubImage2D (loadstutter --why, Hạ starting to build right
// after Xuân was ready, while the viewer watched the opening). Only for pictures read as data (NoColorSpace): the
// texture comes back with flipY = false, since the bitmap is already the right way up.
export const load = async (url, tries = 2, { bitmap = false } = {}) => {
  for (let k = 1; ; k++) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = k > 1 ? `${url}${url.includes('?') ? '&' : '?'}again=${k}` : url;
    try {
      await img.decode();
    } catch (e) {
      if (k >= tries) throw new Error(`the picture ${url} could not be loaded after ${k} tries (${(e && e.name) || e})`);
      console.warn(`[chom-world] the picture ${url} did not arrive (${(e && e.name) || e}); asking again`);
      await new Promise((r) => setTimeout(r, 200 * k));
      continue;
    }
    if (bitmap && typeof createImageBitmap === 'function') {
      try {
        const bm = await createImageBitmap(img, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
        const tb = new THREE.Texture(bm);
        tb.flipY = false;
        tb.needsUpdate = true;
        return tb;
      } catch (e) { /* no bitmap: the <img> below does the same, only on the page's thread */ }
    }
    const t = new THREE.Texture(img);
    t.needsUpdate = true;
    return t;
  }
};

// slice(): resolves when the next piece of start-up work may run (so a season loading in the background never stalls the page)
export async function loadTextures(renderer, { base = './tex/', maxAniso = 8, onProgress = () => {}, slice = async () => {} } = {}) {
  let done = 0;
  const tick = (t) => { onProgress(++done / 5); return t; };
  const [nt, d, strokes, wash, linen] = await Promise.all(['brush-nt.png', 'brush-d.png', 'strokes.png', 'wash.png', 'linen.jpg'].map((f) => load(base + f, 2, { bitmap: true }).then(tick)));
  for (const t of [nt, d, strokes, wash, linen]) t.colorSpace = THREE.NoColorSpace;

  // join the two halves of the brush sheet
  const size = nt.image.width;
  for (const t of [nt, d]) { t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  const out = new THREE.WebGLRenderTarget(size, size, {
    type: THREE.UnsignedByteType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, depthBuffer: false,
  });
  out.texture.anisotropy = maxAniso;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tNT: { value: nt }, tD: { value: d } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
    fragmentShader: `uniform sampler2D tNT, tD; varying vec2 vUv;
      void main(){ vec3 a = texture2D(tNT, vUv).rgb; gl_FragColor = vec4(a, max(texture2D(tD, vUv).r, 0.004)); }`,
    depthTest: false, depthWrite: false,
  });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  q.frustumCulled = false;
  const sc = new THREE.Scene();
  sc.add(q);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const prev = renderer.getRenderTarget();
  // the join shader is compiled off the thread, the two halves sent up one at a time, then the join is drawn
  renderer.setRenderTarget(out);
  await renderer.compileAsync(sc, cam);
  renderer.setRenderTarget(prev);
  await slice(); renderer.initTexture(nt);
  await slice(); renderer.initTexture(d);
  await slice(); renderer.initRenderTarget(out);
  await slice();
  renderer.setRenderTarget(out);
  renderer.render(sc, cam);
  renderer.setRenderTarget(prev);
  mat.dispose(); q.geometry.dispose(); nt.dispose(); d.dispose();

  strokes.anisotropy = maxAniso;
  strokes.minFilter = THREE.LinearMipmapLinearFilter;
  wash.wrapS = wash.wrapT = THREE.RepeatWrapping;
  wash.minFilter = THREE.LinearMipmapLinearFilter;
  linen.wrapS = linen.wrapT = THREE.RepeatWrapping;
  linen.generateMipmaps = false;
  linen.minFilter = THREE.LinearFilter;
  return { brush: out.texture, strokes, wash, linen };
}
