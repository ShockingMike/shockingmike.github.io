/* Rhumb Line · scene/desk.js
   The explorable desk (desk contract v2): object ids, what weather belongs to each leg and sea moment, and the camera
   views. A view is an orientation (elevation, azimuth, vertical field of view) plus a set of points in cabin space; the
   camera distance and sideways shift are solved so those points land inside a rectangle of the viewport:
   - at the desk: every pickable object, clear of the title stamp (top left) and, on phones, of the object bar (bottom);
   - with an object open: the object in 45–86 % of the width (desktop, the panel takes the left), or in 8–42 % of the
     height (phone, the panel takes the lower half).
   Views are solved per window size, so any aspect ratio frames correctly. */
import * as THREE from 'three';
import { LAYOUT } from './lib/layout.js';

export const OBJECT_IDS = ['log', 'chart', 'chest', 'compass', 'crew', 'letter', 'porthole', 'lamp', 'cup'];
export const LEG_WEATHER = { guatemala: 'haze', colombia: 'sun', brazil: 'lowcloud', kenya: 'rain', ethiopia: 'dust', sumatra: 'dawnWet' };
export const SEA_WEATHER = { cape: 'storm', night: 'night', homeward: 'dusk' };
export const publicWeather = (key) => (key === 'dawnWet' ? 'dawn' : key);

/* Orientation per target: desk = landscape windows, phone = portrait. */
export const VIEWS = {
  // phone: a wide lens looking well down, so the table and the portholes fill the screen instead of the dark deckhead
  // (the camera rises to just under the deckhead; all nine objects stay in frame with ~25 px either side)
  desk: { desk: { el: 25, az: 0, fov: 44 }, phone: { el: 36, az: 0, fov: 78 } },
  log: { desk: { el: 58, az: -8, fov: 38 }, phone: { el: 62, az: -6, fov: 50 } },
  chart: { desk: { el: 62, az: 0, fov: 38 }, phone: { el: 66, az: 0, fov: 50 } },
  chest: { desk: { el: 58, az: -8, fov: 38 }, phone: { el: 64, az: -6, fov: 50 } },
  compass: { desk: { el: 40, az: 6, fov: 36 }, phone: { el: 44, az: 4, fov: 48 } },
  crew: { desk: { el: 30, az: -4, fov: 38 }, phone: { el: 34, az: -4, fov: 50 } },
  letter: { desk: { el: 52, az: 4, fov: 38 }, phone: { el: 58, az: 2, fov: 50 } },
  cup: { desk: { el: 40, az: 10, fov: 36 }, phone: { el: 46, az: 8, fov: 48 } },
  // phone: looking down a little more, so the glass shows the sea rather than a bright sky (the fit lowers the camera)
  porthole: { desk: { el: 4, az: -10, fov: 42 }, phone: { el: 22, az: -8, fov: 56 } }
};
/* Where the fitted points must land, as [left, top, right, bottom] fractions of the viewport. */
export const RECTS = {
  // phone: set low so the lamp and portholes fill the upper screen instead of empty table front below (bar: bottom 72 px)
  desk: { desk: [0.1, 0.13, 0.9, 0.9], phone: [0.1, 0.1, 0.9, 0.9] },
  // a little inside the safe zones (45-86 % / 8-42 %), so the hull's sway and the mouse lean never push an object out
  focus: { desk: [0.47, 0.12, 0.84, 0.88], phone: [0.07, 0.1, 0.93, 0.4] }
};

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _e = new THREE.Euler(), _v = new THREE.Vector3();
function placed(cx, cz, yaw, local, order = 'XYZ', tilt = 0, lift = [0, 0, 0]) {
  _e.set(tilt, yaw, 0, order === 'YXZ' ? 'YXZ' : 'XYZ');
  return local.map(([x, y, z]) => {
    _v.set(x, y, z);
    if (order === 'YXZ') _v.applyEuler(_e); else _v.applyAxisAngle(V(0, 1, 0), yaw);
    return V(cx + _v.x + lift[0], _v.y + lift[1], cz + _v.z + lift[2]);
  });
}
const rect = (x0, x1, z0, z1, ys) => ys.flatMap((y) => [[x0, y, z0], [x1, y, z0], [x0, y, z1], [x1, y, z1]]);
const ring = (r, y, n = 8) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r, y, Math.sin((i / n) * Math.PI * 2) * r]);
const wallRing = (p, r, dz = 0.02) => Array.from({ length: 8 }, (_, i) => V(p.x + Math.cos((i / 8) * Math.PI * 2) * r, p.y + Math.sin((i / 8) * Math.PI * 2) * r, LAYOUT.wallZ + dz));

/* Points (cabin space) that must be in frame for each target. */
export function viewPoints(target, portrait) {
  const L = LAYOUT, B = L.box, s = B.scale;
  const closed = {
    log: () => placed(L.logbook.x, L.logbook.z, L.logbook.yaw, rect(-0.075, 0.075, -0.1025, 0.1025, [0, 0.024])),
    chart: () => placed(L.chart.x, L.chart.z, L.chart.yaw, rect(-L.chart.w / 2, L.chart.w / 2, -L.chart.h / 2, L.chart.h / 2, [0.003])),
    // chest and porthole: the same volume as their pick boxes in cabin.js, so a fitted view keeps getAnchor inside the zone
    chest: () => placed(B.x, B.z, B.yaw, rect(-0.155 * s, 0.155 * s, -0.105 * s, 0.105 * s, [0, 0.098 * s])),
    compass: () => placed(L.compass.x, L.compass.z, 0, [...ring(0.066, 0), ...ring(0.066, 0.051)]),
    crew: () => placed(L.slip.x, L.slip.z, L.slip.yaw, rect(-0.0525, 0.0525, -0.074, 0.074, [0.001])),
    letter: () => placed(L.letter.x, L.letter.z, L.letter.yaw, rect(-0.085, 0.085, -0.055, 0.055, [0, 0.006])),
    porthole: () => [...wallRing(L.portholes[1], 0.19, -0.01), ...wallRing(L.portholes[1], 0.19, 0.05)],
    lamp: () => { const [x, , z] = L.lampPivot; return [V(x - 0.066, 0.36, z), V(x + 0.066, 0.36, z), V(x, 0.62, z - 0.066), V(x, 0.62, z + 0.066)]; },
    // the pick cylinder's radius (0.078) plus a margin, so the fitted view keeps getAnchor('cup') inside the zone
    cup: () => placed(L.cup.x, L.cup.z, 0, [...ring(0.084, 0), ...ring(0.084, 0.098)])
  };
  if (target === 'desk') {
    const pts = OBJECT_IDS.flatMap((id) => closed[id]());
    // desktop: both portholes; phone: the coffee cup too, so the frame has even margins from the compass (left) to the
    // cup and the porthole (right) instead of the compass touching the edge
    if (!portrait) pts.push(...wallRing(L.portholes[0], 0.19));
    else pts.push(...placed(L.cup.x, L.cup.z, 0, [...ring(0.08, 0), ...ring(0.05, 0.09)]));
    return pts;
  }
  switch (target) {
    case 'log': return placed(L.logbook.x, L.logbook.z, L.logbook.yaw, rect(-0.235, 0.075, -0.1025, 0.1025, [0, 0.024]));
    case 'chart': return placed(L.ocean.x, L.ocean.z, L.ocean.yaw, rect(-L.ocean.w / 2, L.ocean.w / 2, -L.ocean.h / 2, L.ocean.h / 2, [0.002]));
    case 'chest': return closed.chest();
    case 'compass': return [...closed.compass(), ...placed(L.compass.x, L.compass.z, 0, [[0, 0.15, -0.104], [0.06, 0.094, -0.082], [-0.06, 0.094, -0.082]])];
    case 'crew': return placed(L.slip.x, L.slip.z, L.slip.yaw, rect(-0.0525, 0.0525, -0.074, 0.074, [0.001]), 'YXZ', 0.95, [0, 0.11, 0.05]);
    case 'letter': return placed(L.letter.x, L.letter.z, L.letter.yaw, rect(-0.085, 0.085, -0.13, 0.075, [0, 0.05]));
    case 'porthole': return closed.porthole();
    // the cup, saucer and the steam above it
    case 'cup': return [...closed.cup(), ...placed(L.cup.x, L.cup.z, 0, ring(0.03, 0.19, 6))];
    default: return closed.chest();
  }
}

/* Solve a camera for an orientation so the points fill `rect`. out: { pos, quat, fov, focus } (cabin space). */
const _dir = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _f = new THREE.Vector3(), _m = new THREE.Matrix4(), _c = new THREE.Vector3(), _p = new THREE.Vector3(), _d = new THREE.Vector3();
export function fitPose(points, spec, rectFr, w, h, out) {
  const DEG = Math.PI / 180, aspect = w / Math.max(1, h);
  const tanV = Math.tan((spec.fov * DEG) / 2), tanH = tanV * aspect;
  const el = spec.el * DEG, az = spec.az * DEG;
  _dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  _m.lookAt(_dir, V(0, 0, 0), V(0, 1, 0));
  out.quat.setFromRotationMatrix(_m);
  _r.set(1, 0, 0).applyQuaternion(out.quat); _u.set(0, 1, 0).applyQuaternion(out.quat); _f.copy(_dir).negate();
  _c.set(0, 0, 0); points.forEach((p) => _c.add(p)); _c.divideScalar(points.length);
  let radius = 0; points.forEach((p) => { radius = Math.max(radius, p.distanceTo(_c)); });
  const tx0 = 2 * rectFr[0] - 1, tx1 = 2 * rectFr[2] - 1, ty0 = 1 - 2 * rectFr[3], ty1 = 1 - 2 * rectFr[1];
  const tcx = (tx0 + tx1) / 2, tcy = (ty0 + ty1) / 2, tw = tx1 - tx0, th = ty1 - ty0;
  let d = radius / Math.min(tanV, tanH) + 0.2, sx = 0, sy = 0;
  for (let it = 0; it < 60; it++) {
    _p.copy(_c).addScaledVector(_dir, d).addScaledVector(_r, sx).addScaledVector(_u, sy);
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, zs = 0, bad = false;
    for (const q of points) {
      _d.subVectors(q, _p);
      const z = _d.dot(_f);
      if (z < 0.05) { bad = true; break; }
      const x = _d.dot(_r) / (z * tanH), y = _d.dot(_u) / (z * tanV);
      minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); zs += z;
    }
    if (bad) { d *= 1.3; continue; }
    const zm = zs / points.length;
    const scale = Math.max((maxx - minx) / tw, (maxy - miny) / th);
    const bcx = (minx + maxx) / 2, bcy = (miny + maxy) / 2;
    sx += (bcx - tcx) * zm * tanH * 0.85;
    sy += (bcy - tcy) * zm * tanV * 0.85;
    d += zm * (scale - 1) * 0.75;
    if (Math.abs(scale - 1) < 0.003 && Math.abs(bcx - tcx) < 0.003 && Math.abs(bcy - tcy) < 0.003) break;
  }
  out.pos.copy(_c).addScaledVector(_dir, d).addScaledVector(_r, sx).addScaledVector(_u, sy);
  // stay inside the cabin (ceiling at 1.44, back of the room at 2.98); `clamped` tells QA the framing could not be met
  _p.copy(out.pos);
  out.pos.x = Math.min(1.75, Math.max(-1.6, out.pos.x));
  out.pos.y = Math.min(1.38, Math.max(-0.25, out.pos.y));
  out.pos.z = Math.min(2.9, Math.max(LAYOUT.wallZ + 0.08, out.pos.z));
  out.clamped = _p.distanceTo(out.pos) > 1e-4;
  out.fov = spec.fov;
  out.focus.copy(_c);
  return out;
}

export function newPose() { return { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 50, focus: new THREE.Vector3() }; }
export function copyPose(out, p) { out.pos.copy(p.pos); out.quat.copy(p.quat); out.fov = p.fov; out.focus.copy(p.focus); return out; }
