// Chớm, mùa Đông: loose white sketch loops round each winter person, as core's sketchAround draws them round a hero
// (same material, width, dryness and fade), but for a person that moves: the loop is laid round the silhouette of every
// drawing once, at load (from the page's fixed reference eye), and swapped in with the drawing.
//   const sk = buildSketch(actors, paintGeo, core, opts)  -> { mesh, show(actor) }
import * as THREE from 'three';

function hull2(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
function resample(poly, n) {
  const L = [0];
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; L.push(L[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const total = L[L.length - 1];
  const out = [];
  let k = 0;
  for (let j = 0; j < n; j++) {
    const s = (j / n) * total;
    while (L[k + 1] < s) k++;
    const a = poly[k], b = poly[(k + 1) % poly.length];
    const t = (s - L[k]) / Math.max(1e-9, L[k + 1] - L[k]);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  for (let it = 0; it < 2; it++) {
    const c = out.map((p) => p.slice());
    for (let j = 0; j < n; j++) { const a = c[(j + n - 1) % n], b = c[(j + 1) % n]; out[j][0] = c[j][0] * 0.5 + (a[0] + b[0]) * 0.25; out[j][1] = c[j][1] * 0.5 + (a[1] + b[1]) * 0.25; }
  }
  return out;
}

const RING = 96;

export async function buildSketch(actors, paintGeo, core, per = {}, Y = async () => {}) {
  const { REF, ribbons, SKETCH_MATS } = core.build;
  const pos = paintGeo.attributes.position, si = paintGeo.attributes.skinIndex, sw = paintGeo.attributes.skinWeight, aChar = paintGeo.attributes.aChar;
  // the plan of each person's loops: fixed for the whole loop, so a loop keeps its place on the outline from drawing to drawing
  const plans = actors.map((a) => {
    const o = { seed: 3 + a.index * 4, loops: 1, off: [3, 9], wob: 4, width: 1.3, alpha: 0.85, ...(per[a.name] ?? {}) };
    let s = o.seed * 9301 + 49297;
    const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const loops = [];
    for (let l = 0; l < o.loops; l++) {
      loops.push({
        start: R() * RING, span: Math.round(40 + R() * 44), o0: o.off[0] + R() * (o.off[1] - o.off[0]),
        f1: 1 + Math.floor(R() * 3), p1: R() * 6.28, f2: 3 + Math.floor(R() * 3), p2: R() * 6.28,
        width: o.width * (0.8 + 0.4 * R()), alpha: o.alpha * (0.75 + 0.25 * R()),
      });
    }
    // a subset of the person's own vertices
    const idx = [];
    for (let i = 0; i < pos.count; i++) if (Math.round(aChar.getX(i)) === a.index && (i % 7) === 0) idx.push(i);
    return { a, o, loops, idx };
  });
  const mats = new Map();
  const skinVert = (i, out) => {
    // world position of vertex i with the bones as they are now
    out.set(0, 0, 0);
    const p = _p.fromBufferAttribute(pos, i);
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(i, k);
      if (w === 0) continue;
      const m = mats.get(si.getComponent(i, k));
      out.addScaledVector(_q.copy(p).applyMatrix4(m), w);
    }
    return out;
  };
  const _p = new THREE.Vector3(), _q = new THREE.Vector3(), _w = new THREE.Vector3();
  // lines of one person for the drawing now on its bones
  function linesNow(plan) {
    const { a, loops, idx } = plan;
    mats.clear();
    a.bones.forEach((b, j) => mats.set(a.boneBase + j, new THREE.Matrix4().multiplyMatrices(b.matrixWorld, a.boneInverses[j])));
    const pts = [];
    let zc = 0;
    for (const i of idx) {
      skinVert(i, _w).sub(REF.eye);
      const z = _w.dot(REF.fwd);
      if (z < 0.2) continue;
      pts.push([_w.dot(REF.right) / z, _w.dot(REF.up) / z]);
      zc += z;
    }
    zc /= Math.max(1, pts.length);
    const ring = resample(hull2(pts), RING);
    let cx = 0, cy = 0;
    for (const p of ring) { cx += p[0]; cy += p[1]; }
    cx /= RING; cy /= RING;
    const pxA = REF.px;
    return loops.map((L) => {
      const line = [];
      for (let k = 0; k <= L.span; k++) {
        const u = L.start + k;
        const i0 = Math.floor(u) % RING, i1 = (i0 + 1) % RING, f = u - Math.floor(u);
        const x = ring[i0][0] * (1 - f) + ring[i1][0] * f, y = ring[i0][1] * (1 - f) + ring[i1][1] * f;
        let dx = x - cx, dy = y - cy;
        const dl = Math.hypot(dx, dy) || 1;
        dx /= dl; dy /= dl;
        const ang = (u / RING) * 6.2832;
        const o = (L.o0 + plan.o.wob * (0.6 * Math.sin(ang * L.f1 + L.p1) + 0.4 * Math.sin(ang * L.f2 + L.p2))) * pxA;
        const lift = Math.pow(Math.abs(k / L.span - 0.5) * 2, 3) * 6 * pxA;
        const X = x + dx * (o + lift), Y = y + dy * (o + lift);
        line.push(REF.eye.clone().addScaledVector(REF.fwd, zc).addScaledVector(REF.right, X * zc).addScaledVector(REF.up, Y * zc));
      }
      return { pts: line, width: L.width, alpha: L.alpha };
    });
  }
  // every drawing of every person, baked: positions, tangents and lengths of its ribbon vertices
  const baked = [];
  let geo = null;
  const first = [];
  for (const plan of plans) {
    const a = plan.a;
    const frames = [];
    for (let d = 0; d < a.cache.n; d++) {
      await Y('sketch');
      a.cur = -1;
      a.showDrawing(d, true);
      const g = ribbons(linesNow(plan));
      frames.push({ P: g.attributes.position.array, T: g.attributes.aTan.array, L: g.attributes.aLen.array });
      if (d === 0) first.push(g);
      else g.dispose();
    }
    baked.push(frames);
  }
  // one geometry for everyone: the drawing-0 ribbons of each person, one after another
  const offsets = [];
  {
    let nv = 0, ni = 0;
    for (const g of first) { offsets.push(nv); nv += g.attributes.position.count; ni += g.index.count; }
    const P = new Float32Array(nv * 3), T = new Float32Array(nv * 3), RB = new Float32Array(nv * 4), LN = new Float32Array(nv), I = new Uint32Array(ni);
    let io = 0;
    first.forEach((g, k) => {
      const o = offsets[k];
      P.set(g.attributes.position.array, o * 3);
      T.set(g.attributes.aTan.array, o * 3);
      RB.set(g.attributes.aRib.array, o * 4);
      LN.set(g.attributes.aLen.array, o);
      const src = g.index.array;
      for (let i = 0; i < src.length; i++) I[io + i] = src[i] + o;
      io += src.length;
      g.dispose();
    });
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('aTan', new THREE.BufferAttribute(T, 3));
    geo.setAttribute('aRib', new THREE.BufferAttribute(RB, 4));
    geo.setAttribute('aLen', new THREE.BufferAttribute(LN, 1));
    geo.setIndex(new THREE.BufferAttribute(I, 1));
    for (const n of ['position', 'aTan', 'aLen']) geo.attributes[n].setUsage(THREE.DynamicDrawUsage);
  }
  const mat = core.paint.sketchMaterial({});
  SKETCH_MATS.push(mat);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mesh.userData.castShadow = false;
  mesh.geometry.boundingBox = new THREE.Box3();
  const bytes = baked.reduce((s, fr) => s + fr.length * (fr[0].P.length * 2 + fr[0].L.length) * 4, 0);
  return {
    mesh, bytes,
    show(a) {
      const k = actors.indexOf(a);
      const fr = baked[k][a.cur];
      const o = offsets[k];
      const gp = geo.attributes.position, gt = geo.attributes.aTan, gl = geo.attributes.aLen;
      gp.array.set(fr.P, o * 3); gt.array.set(fr.T, o * 3); gl.array.set(fr.L, o);
      gp.addUpdateRange(o * 3, fr.P.length); gt.addUpdateRange(o * 3, fr.T.length); gl.addUpdateRange(o, fr.L.length);
      gp.needsUpdate = gt.needsUpdate = gl.needsUpdate = true;
    },
  };
}
