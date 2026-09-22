// Chớm people test: a posed surface as points with normals, and the signed distance to it.
// Used by the page (the bag strap lies on the cloth) and by the pass-through check.
//   snap(mesh, { filter, list, cloth, shrink, cell })   list: only these vertex indices (fast); filter: a test per vertex
// The grid is keyed by numbers, not strings (the page calls these a few hundred times per drawing).
import * as THREE from 'three';

const _v = new THREE.Vector3(), _v4 = new THREE.Vector4(), _off = new THREE.Vector3(), _nw = new THREE.Vector3();
const _nm = new THREE.Matrix3();
const key = (x, y, z) => ((x + 512) * 1048576) + ((y + 512) * 1024) + (z + 512);

export function snap(mesh, { filter = null, list = null, cloth = null, shrink = true, cell = 0.03 } = {}) {
  const g = mesh.geometry;
  const P = g.attributes.position, Nn = g.attributes.normal;
  const S = g.attributes.aShrink;
  const n = P.count;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), ok = new Uint8Array(n);
  mesh.updateMatrixWorld(true);
  _nm.getNormalMatrix(mesh.matrixWorld);
  const grid = new Map();
  const one = (i) => {
    ok[i] = 1;
    mesh.getVertexPosition(i, _v);
    _v4.set(Nn.getX(i), Nn.getY(i), Nn.getZ(i), 0);
    if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, _v4);
    const nx = _v4.x, ny = _v4.y, nz = _v4.z;
    const ln = Math.hypot(nx, ny, nz) || 1;
    if (shrink && S) { const k = S.getX(i) / ln; _v.x -= nx * k; _v.y -= ny * k; _v.z -= nz * k; }
    _v.applyMatrix4(mesh.matrixWorld);
    if (cloth) { cloth(mesh, i, _off, _v); _v.add(_off); }
    _nw.set(nx, ny, nz).applyMatrix3(_nm).normalize();
    pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z;
    nrm[i * 3] = _nw.x; nrm[i * 3 + 1] = _nw.y; nrm[i * 3 + 2] = _nw.z;
    const kk = key(Math.floor(_v.x / cell), Math.floor(_v.y / cell), Math.floor(_v.z / cell));
    let a = grid.get(kk);
    if (!a) grid.set(kk, (a = []));
    a.push(i);
  };
  if (list) { for (const i of list) one(i); }
  else for (let i = 0; i < n; i++) { if (filter && !filter(i)) continue; one(i); }
  return { pos, nrm, ok, grid, cell, name: mesh.name };
}

// nearest surface vertex within maxR: { d: signed distance along its normal, dist, i }
export function sdist(S, p, maxR = 0.06) {
  const c = S.cell, r = Math.ceil(maxR / c);
  const cx = Math.floor(p.x / c), cy = Math.floor(p.y / c), cz = Math.floor(p.z / c);
  let best = -1, bd = maxR * maxR;
  const pos = S.pos, grid = S.grid;
  for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) for (let z = cz - r; z <= cz + r; z++) {
    const a = grid.get(key(x, y, z));
    if (!a) continue;
    for (let q = 0; q < a.length; q++) {
      const i = a[q];
      const dx = pos[i * 3] - p.x, dy = pos[i * 3 + 1] - p.y, dz = pos[i * 3 + 2] - p.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bd) { bd = d2; best = i; }
    }
  }
  if (best < 0) return null;
  const i = best;
  const d = (p.x - pos[i * 3]) * S.nrm[i * 3] + (p.y - pos[i * 3 + 1]) * S.nrm[i * 3 + 1] + (p.z - pos[i * 3 + 2]) * S.nrm[i * 3 + 2];
  return { d, dist: Math.sqrt(bd), i };
}

// every surface vertex within r of p
export function forNear(S, p, r, fn) {
  const c = S.cell, k = Math.ceil(r / c);
  const cx = Math.floor(p.x / c), cy = Math.floor(p.y / c), cz = Math.floor(p.z / c);
  const r2 = r * r;
  const pos = S.pos, grid = S.grid;
  for (let x = cx - k; x <= cx + k; x++) for (let y = cy - k; y <= cy + k; y++) for (let z = cz - k; z <= cz + k; z++) {
    const a = grid.get(key(x, y, z));
    if (!a) continue;
    for (let q = 0; q < a.length; q++) {
      const i = a[q];
      const dx = pos[i * 3] - p.x, dy = pos[i * 3 + 1] - p.y, dz = pos[i * 3 + 2] - p.z;
      if (dx * dx + dy * dy + dz * dz < r2) fn(i);
    }
  }
}
