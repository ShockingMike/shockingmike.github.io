/* Chart sheets on the table and the ink drawn on them.
   - Two sheets: the ocean chart lies flat; the harbour chart lies on top and rolls up to the left into a loose scroll
     (a spiral page curl computed on the vertices, so shadows and ray casts follow it), uncovering the ocean chart.
   - Ribbons: thin inked strips that follow the paper's surface. The route ribbon is built once for the whole voyage;
     a uniform decides how far it is drawn (homeward in dashes). The bearing ribbon is rebuilt when the bearing moves.
   - The ship pin: a small enamel ship on a steel pin that stands at the head of the route.
   Sheet units are the artwork's 1400 x 1000; u = x / 1400 runs right, v = y / 1000 runs towards the viewer. */
import * as THREE from 'three';
import { smooth, TAU, clamp } from './util.js';
import { solid } from './cabin.js';

/* Harbour sheet surface: sits on the ocean sheet, soft folds, a curled near corner, a lifted far edge. */
export const HARBOUR_BASE = 0.0029;
export function harbourHeight(u, v) {
  let y = HARBOUR_BASE;
  y += 0.0045 * Math.pow(smooth(0.86, 1.0, v), 2);
  const cr = (u + v - 1.70) / 0.30; if (cr > 0) y += 0.024 * cr * cr;
  const cl = ((1 - u) + (1 - v) - 1.82) / 0.18; if (cl > 0) y += 0.008 * cl * cl;
  y += 0.0006 * Math.sin(u * 9.0 + 1.3) * Math.sin(v * 6.0 + 0.4);
  y += 0.0005 * Math.max(0, 1 - Math.abs(u - 0.5) * 30) + 0.0004 * Math.max(0, 1 - Math.abs(v - 0.5) * 30);
  return y;
}
const harbourCurl = (u, v) => Math.max(0, harbourHeight(u, v) - HARBOUR_BASE - 0.0031);
/* Ocean sheet surface: pressed flat under the other chart, only faint folds (always below the harbour sheet). */
export function oceanHeight(u, v) {
  return 0.0008 + 0.00022 * Math.sin(u * 7.0 + 0.4) * Math.sin(v * 5.0 + 1.9) + 0.00025 * Math.max(0, 1 - Math.abs(u - 0.5) * 30) + 0.0002 * Math.max(0, 1 - Math.abs(v - 0.5) * 30) + 0.0006 * Math.pow(smooth(0.9, 1.0, v), 2);
}

export function buildSheet(S, heightFn, curlFn, frontMat, backMat, name) {
  const segX = 150, segZ = 108;
  const geo = new THREE.PlaneGeometry(S.w, S.h, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, n = pos.count;
  const X0 = new Float32Array(n), Z0 = new Float32Array(n), FX = new Float32Array(n), FY = new Float32Array(n), FZ = new Float32Array(n), V = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), z = pos.getZ(i), u = x / S.w + 0.5, v = z / S.h + 0.5;
    const y = heightFn(u, v), lift = curlFn ? curlFn(u, v) : 0;
    X0[i] = x; Z0[i] = z; V[i] = v;
    FX[i] = x - Math.sign(x) * lift * 0.35; FY[i] = y; FZ[i] = z - Math.sign(z) * lift * 0.35;
    pos.setXYZ(i, FX[i], FY[i], FZ[i]);
  }
  geo.computeVertexNormals();
  const group = new THREE.Group(); group.name = name;
  const front = solid(new THREE.Mesh(geo, frontMat));
  const back = solid(new THREE.Mesh(geo, backMat), false, true);
  front.frustumCulled = back.frustumCulled = false;
  front.name = name + 'Front';
  group.add(front, back);
  group.position.set(S.x, 0, S.z);
  group.rotation.y = S.yaw;

  const R0 = 0.0145, PITCH = 0.0011;
  let roll = 0;
  function setRoll(r) {
    r = clamp(r, 0, 1);
    if (Math.abs(r - roll) < 1e-5) return false;
    roll = r;
    const Xr = S.w / 2 - r * S.w, uR = Xr / S.w + 0.5;
    for (let i = 0; i < n; i++) {
      const s = X0[i] - Xr;
      if (r <= 0 || s <= 0) { pos.setXYZ(i, FX[i], FY[i], FZ[i]); continue; }
      const th = s / R0, rr = Math.max(0.0055, R0 - (PITCH * th) / TAU);
      pos.setXYZ(i, Xr + rr * Math.sin(th), heightFn(uR, V[i]) + R0 - rr * Math.cos(th), Z0[i]);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    geo.boundingBox = null;
    return true;
  }
  // local position of a sheet-unit point on the flat sheet
  const local = (px, py, lift = 0, out = new THREE.Vector3()) => {
    const u = px / 1400, v = py / 1000;
    return out.set((u - 0.5) * S.w, heightFn(u, v) + lift, (v - 0.5) * S.h);
  };
  return { group, front, back, geo, S, heightFn, setRoll, local, get roll() { return roll; } };
}

/* ---------- Ink ribbons ---------- */
export function inkMaterial(color = 0xa63a24) {
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.62, metalness: 0, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4
  });
  // uLegStart: ink before this distance (earlier legs) is drawn at uCoreOld of the ribbon's width and uFaint strength;
  // the edges are antialiased across the ribbon (vSide runs -1..1)
  const uniforms = { uHead: { value: 1e9 }, uHomeStart: { value: 1e9 }, uDash: { value: 16 }, uLegStart: { value: -1e9 }, uFaint: { value: 0.72 }, uCoreOld: { value: 0.55 } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aDist;\nattribute float aSide;\nvarying float vDist;\nvarying float vSide;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDist = aDist;\nvSide = aSide;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uHead;\nuniform float uHomeStart;\nuniform float uDash;\nuniform float uLegStart;\nuniform float uFaint;\nuniform float uCoreOld;\nvarying float vDist;\nvarying float vSide;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vDist > uHead) discard;\nif (vDist > uHomeStart && fract((vDist - uHomeStart) / uDash) > 0.58) discard;')
      .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\n{ float old = 1.0 - step(uLegStart, vDist); float core = mix(1.0, uCoreOld, old); float aa = fwidth(vSide) * 1.5;\n  diffuseColor.a *= (1.0 - smoothstep(core - aa, core, abs(vSide))) * mix(1.0, uFaint, old); }');
  };
  mat.customProgramCacheKey = () => 'ink-ribbon';
  mat.userData.uniforms = uniforms;
  return mat;
}

export function createRibbon(maxPts, material, name) {
  const geo = new THREE.BufferGeometry();
  const P = new Float32Array(maxPts * 2 * 3), N = new Float32Array(maxPts * 2 * 3), D = new Float32Array(maxPts * 2), SIDE = new Float32Array(maxPts * 2);
  const idx = new Uint32Array((maxPts - 1) * 6);
  // counter-clockwise seen from above (the paper's normal), so the strip is front-facing
  for (let i = 0; i < maxPts - 1; i++) { const a = i * 2; idx.set([a, a + 2, a + 1, a + 1, a + 2, a + 3], i * 6); }
  for (let i = 0; i < maxPts * 2; i++) { N[i * 3 + 1] = 1; SIDE[i] = i % 2 ? -1 : 1; }
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  geo.setAttribute('aDist', new THREE.BufferAttribute(D, 1));
  geo.setAttribute('aSide', new THREE.BufferAttribute(SIDE, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.setDrawRange(0, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.renderOrder = 2;
  const tmp = new THREE.Vector3();
  /* pts: [[x, y], ...] in sheet units; halfW in metres; step in sheet units. */
  function update(sheet, pts, halfW, lift = 0.0004, step = 5) {
    const dense = [];
    let dist = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) { dense.push([pts[0][0], pts[0][1], 0]); continue; }
      const a = pts[i - 1], b = pts[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(len / step));
      for (let j = 1; j <= k; j++) {
        if (dense.length >= maxPts) break;
        dense.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k, dist + (len * j) / k]);
      }
      dist += len;
    }
    const m = dense.length;
    for (let i = 0; i < m; i++) {
      const p = dense[i], pa = dense[Math.max(0, i - 1)], pb = dense[Math.min(m - 1, i + 1)];
      let dx = pb[0] - pa[0], dy = pb[1] - pa[1];
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      sheet.local(p[0], p[1], lift, tmp);
      // sheet units map to metres uniformly (w / 1400); the normal in the paper plane is (-dy, dx)
      const ox = -dy * halfW, oz = dx * halfW;
      P.set([tmp.x + ox, tmp.y, tmp.z + oz, tmp.x - ox, tmp.y, tmp.z - oz], i * 6);
      D[i * 2] = D[i * 2 + 1] = p[2];
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aDist.needsUpdate = true;
    geo.setDrawRange(0, Math.max(0, (m - 1) * 6));
    return dist;
  }
  return { mesh, update };
}

/* ---------- The ship pin: an enamel ship badge lying on the chart, pinned through the hull ----------
   Drawn in side view (bow +x, mast +y) and laid flat, so from above it reads as a ship. The caller turns the group to
   the course and mirrors the token (scale.z < 0) on westerly courses so the mast always points north. */
export function buildShipPin(M, blobTex) {
  const g = new THREE.Group(); g.name = 'shipPin';
  const token = new THREE.Group(); g.add(token);
  const flat = new THREE.Group(); flat.rotation.x = -Math.PI / 2; flat.position.y = 0.0013; token.add(flat);
  const ex = (shape, depth) => { const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.0003, bevelSize: 0.00028, bevelSegments: 2, curveSegments: 10 }); geo.translate(0, 0, -depth / 2); return geo; };
  const hull = new THREE.Shape();
  hull.moveTo(-0.0118, 0.0062); hull.lineTo(0.0142, 0.0062); hull.quadraticCurveTo(0.0108, 0.0022, 0.0080, 0.0012); hull.lineTo(-0.0088, 0.0012); hull.quadraticCurveTo(-0.0111, 0.003, -0.0118, 0.0062);
  const main = new THREE.Shape(); main.moveTo(-0.0014, 0.0074); main.lineTo(-0.0014, 0.0228); main.quadraticCurveTo(-0.0064, 0.0146, -0.0104, 0.0076); main.lineTo(-0.0014, 0.0074);
  const fore = new THREE.Shape(); fore.moveTo(0.0009, 0.0074); fore.lineTo(0.0009, 0.0194); fore.lineTo(0.0108, 0.0075); fore.lineTo(0.0009, 0.0074);
  flat.add(solid(new THREE.Mesh(ex(hull, 0.0016), M.enamelRed)));
  flat.add(solid(new THREE.Mesh(ex(main, 0.0010), M.enamelCream)));
  flat.add(solid(new THREE.Mesh(ex(fore, 0.0010), M.enamelCream)));
  const mast = solid(new THREE.Mesh(new THREE.BoxGeometry(0.0009, 0.0172, 0.0012), M.brassPolished)); mast.position.set(-0.0002, 0.0150, 0); flat.add(mast);
  const flag = solid(new THREE.Mesh(new THREE.BoxGeometry(0.0046, 0.0024, 0.0012), M.enamelNavy)); flag.position.set(0.0021, 0.0226, 0); flat.add(flag);
  const head = solid(new THREE.Mesh(new THREE.SphereGeometry(0.0019, 18, 12), M.brassPolished), true, false); head.position.set(0.001, 0.0034, -0.0037); token.add(head);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.03), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: blobTex, transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0.001, 0.0002, -0.011); shadow.name = 'contactShadow'; shadow.renderOrder = 3;
  token.add(shadow);
  return { group: g, token, shadow };
}
