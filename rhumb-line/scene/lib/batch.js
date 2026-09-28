/* Static batching. The cabin is built from several hundred small meshes, and every pass draws each one separately: the
   sun's shadow, the lamp's six shadow faces, the scene and GTAO's normals. Most of the main thread's time per frame went
   into those draw calls. Meshes that never move relative to their group and share a material (and shadow flags) are
   merged here into one mesh, their geometry moved into the group's space once. Same triangles, same materials, same
   shadows; far fewer draw calls. Anything that moves or changes (tagged userData.live, or holding children) stays as
   it is. */
import * as THREE from 'three';

const SKIP_NAMES = new Set(['contactShadow', 'glow', 'domeGlass', 'lampGlass', 'glass', 'flame', 'steam', 'coffee', 'highlight']);

function mergeable(o) {
  if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isBatchedMesh || o.children.length) return false;
  if (o.userData.pickProxy || o.userData.shell || o.userData.live || SKIP_NAMES.has(o.name)) return false;
  const m = o.material, g = o.geometry;
  if (!m || Array.isArray(m) || m.transparent || m.transmission > 0 || (m.userData && m.userData.refraction)) return false;
  // (geometry groups only matter with an array of materials, skipped above: one material draws the whole geometry)
  if (!g || !g.attributes.position || !g.attributes.normal || g.attributes.tangent) return false;
  if (Object.keys(g.morphAttributes).length || g.drawRange.start !== 0 || g.drawRange.count !== Infinity) return false;
  if (o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return false;
  return true;
}
function attrKey(g) {
  return Object.keys(g.attributes).sort().map((k) => { const a = g.attributes[k]; return `${k}:${a.itemSize}:${a.normalized ? 1 : 0}:${a.array.constructor.name}:${a.isInterleavedBufferAttribute ? 'i' : ''}`; }).join(',') + (g.index ? '|idx' : '|flat');
}

function mergeGroup(items) {
  const g0 = items[0].geometry;
  const names = Object.keys(g0.attributes);
  let vCount = 0, iCount = 0;
  for (const it of items) { vCount += it.geometry.attributes.position.count; iCount += it.geometry.index ? it.geometry.index.count : it.geometry.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  const arrays = {};
  for (const n of names) { const a = g0.attributes[n]; arrays[n] = new a.array.constructor(vCount * a.itemSize); }
  const index = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  let vo = 0, io = 0;
  for (const it of items) {
    const g = it.geometry, m = it.matrix, count = g.attributes.position.count;
    nm.getNormalMatrix(m);
    const flip = m.determinant() < 0;
    for (const n of names) {
      const a = g.attributes[n], dst = arrays[n], s = a.itemSize;
      if (n === 'position') {
        for (let i = 0; i < count; i++) { v.fromBufferAttribute(a, i).applyMatrix4(m); dst[(vo + i) * 3] = v.x; dst[(vo + i) * 3 + 1] = v.y; dst[(vo + i) * 3 + 2] = v.z; }
      } else if (n === 'normal') {
        for (let i = 0; i < count; i++) { v.fromBufferAttribute(a, i).applyMatrix3(nm).normalize(); dst[(vo + i) * 3] = v.x; dst[(vo + i) * 3 + 1] = v.y; dst[(vo + i) * 3 + 2] = v.z; }
      } else {
        for (let i = 0; i < count; i++) for (let c = 0; c < s; c++) dst[(vo + i) * s + c] = a.getComponent(i, c);
      }
    }
    const idx = g.index;
    const tri = idx ? idx.count : count;
    for (let t = 0; t < tri; t += 3) {
      const a = idx ? idx.getX(t) : t, b = idx ? idx.getX(t + 1) : t + 1, c = idx ? idx.getX(t + 2) : t + 2;
      // a mirrored placement turns the winding around; keep the faces facing the same way
      index[io++] = vo + a; index[io++] = vo + (flip ? c : b); index[io++] = vo + (flip ? b : c);
    }
    vo += count;
  }
  for (const n of names) { const a = g0.attributes[n]; out.setAttribute(n, new THREE.BufferAttribute(arrays[n], a.itemSize, a.normalized)); }
  out.setIndex(new THREE.BufferAttribute(index, 1));
  return out;
}

/* Merge the static meshes under each root into one mesh per material and shadow setting, parented to the root.
   Returns { before, after } mesh counts. */
export function batchStatic(roots) {
  let before = 0, after = 0;
  const inv = new THREE.Matrix4();
  for (const root of roots) {
    root.updateMatrixWorld(true);
    inv.copy(root.matrixWorld).invert();
    const groups = new Map();
    const walk = (o) => {
      if (o.userData.live || !o.visible) return;
      if (mergeable(o)) {
        const key = [o.material.uuid, o.castShadow, o.receiveShadow, o.renderOrder, o.frustumCulled, o.layers.mask, attrKey(o.geometry)].join('#');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ mesh: o, geometry: o.geometry, matrix: new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld) });
      }
      for (const c of o.children) walk(c);
    };
    for (const c of root.children) walk(c);
    for (const items of groups.values()) {
      before += items.length;
      if (items.length < 2) { after += 1; continue; }
      const src = items[0].mesh;
      const mesh = new THREE.Mesh(mergeGroup(items), src.material);
      mesh.name = 'batch:' + (src.material.name || src.name || 'mesh');
      mesh.castShadow = src.castShadow; mesh.receiveShadow = src.receiveShadow;
      mesh.renderOrder = src.renderOrder; mesh.frustumCulled = src.frustumCulled; mesh.layers.mask = src.layers.mask;
      mesh.matrixAutoUpdate = false;
      root.add(mesh);
      items.forEach((it) => it.mesh.removeFromParent());
      after += 1;
    }
  }
  return { before, after };
}
