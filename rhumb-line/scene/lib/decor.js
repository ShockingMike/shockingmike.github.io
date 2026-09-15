/* Things that dress the cabin; none of them can be picked. All sit on the ship group, so they roll with the hull.
   On the table: a sextant lying on its legs, brass binoculars, an hourglass (the sand runs), an inkwell with a quill,
   a hand coffee grinder, a magnifying glass. On the hull wall: the ship's clock (the hands keep the viewer's time), a
   barometer (the needle follows the weather) and a small shelf of sample jars. On the deck in front of the table: a
   coffee sack, a coiled rope and a crate stamped with the six growing countries.
   Materials are the cabin's own (brass, teak, oak, burlap, twine, glass, enamel, beans), plus two dial faces, the
   crate stamp and a rope normal map, so the extra shader programs stay few. Nothing here stands where a pickable
   object is or moves into its space. Positions: LAYOUT.decor. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { lathe, boxUV, smooth, TAU, clamp } from './util.js';
import { LAYOUT } from './layout.js';
import { solid } from './cabin.js';

const rbox = (w, h, d, r, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, r);
const DEG = Math.PI / 180;
const FLOOR = -0.76;

export function buildDecor(M) {
  const root = new THREE.Group(); root.name = 'decor';
  const D = LAYOUT.decor, wz = LAYOUT.wallZ;
  const place = (name, p, y = 0) => {
    const g = new THREE.Group(); g.name = name;
    g.position.set(p.x, y, p.z); if (p.yaw) g.rotation.y = p.yaw;
    root.add(g);
    return g;
  };
  const glass = (geo) => { const m = new THREE.Mesh(geo, M.domeGlass); m.name = 'domeGlass'; return m; };
  const mesh = (geo, mat, cast = true, receive = true) => solid(new THREE.Mesh(geo, mat), cast, receive);

  /* ---------- Sextant, lying on its three legs ---------- */
  {
    const g = place('sextant', D.sextant);
    const R = 0.15, span = 70 * DEG, a0 = -Math.PI / 2 - span / 2;
    const frame = new THREE.Group(); frame.rotation.x = -Math.PI / 2; frame.position.set(0, 0.017, -0.07); g.add(frame);
    const arc = mesh(new THREE.TorusGeometry(R, 0.0045, 8, 56, span), M.brass); arc.rotation.z = a0; frame.add(arc);
    const limb = mesh(new THREE.RingGeometry(R - 0.016, R + 0.003, 56, 1, a0, span), M.brassPolished, false, true); limb.position.z = 0.0046; frame.add(limb);
    const brace = mesh(new THREE.TorusGeometry(0.085, 0.003, 6, 32, span), M.brass); brace.rotation.z = a0; frame.add(brace);
    const bar = (ang, len, w, mat, z = 0) => {
      const b = mesh(new THREE.BoxGeometry(w, len, 0.004), mat);
      b.position.set((Math.cos(ang) * len) / 2, (Math.sin(ang) * len) / 2, z); b.rotation.z = ang - Math.PI / 2; frame.add(b);
    };
    bar(a0, R, 0.007, M.brass); bar(a0 + span, R, 0.007, M.brass); bar(-Math.PI / 2, R, 0.006, M.brass);
    const ia = a0 + span * 0.42;
    bar(ia, R + 0.014, 0.009, M.brassPolished, 0.006);
    const vernier = mesh(new THREE.BoxGeometry(0.026, 0.014, 0.004), M.brass); vernier.position.set(Math.cos(ia) * (R + 0.006), Math.sin(ia) * (R + 0.006), 0.008); vernier.rotation.z = ia - Math.PI / 2; frame.add(vernier);
    const mirror = mesh(new THREE.BoxGeometry(0.024, 0.004, 0.03), M.steel); mirror.position.set(0, 0, 0.019); mirror.rotation.z = ia; frame.add(mirror);
    const hz = a0 + span; const horizon = mesh(new THREE.BoxGeometry(0.018, 0.003, 0.022), M.steel); horizon.position.set(Math.cos(hz) * 0.06, Math.sin(hz) * 0.06, 0.015); horizon.rotation.z = hz; frame.add(horizon);
    const tele = mesh(new THREE.CylinderGeometry(0.0072, 0.0092, 0.08, 20), M.brassPolished); tele.position.set(0.028, -0.07, 0.022); frame.add(tele);
    const handle = mesh(rbox(0.018, 0.062, 0.016, 0.005), M.teak); handle.position.set(-0.03, -0.075, -0.011); frame.add(handle);
    [[0, 0], [Math.cos(a0) * R * 0.96, Math.sin(a0) * R * 0.96], [Math.cos(a0 + span) * R * 0.96, Math.sin(a0 + span) * R * 0.96]].forEach(([x, y]) => {
      const leg = mesh(new THREE.CylinderGeometry(0.0028, 0.0034, 0.015, 10), M.brassDark); leg.rotation.x = Math.PI / 2; leg.position.set(x, y, -0.0095); frame.add(leg);
    });
  }

  /* ---------- Brass binoculars ---------- */
  {
    const g = place('binoculars', D.binoculars);
    const barrel = lathe([[0.0125, -0.058], [0.015, -0.05, 0.002], [0.0155, -0.012], [0.0205, 0.018, 0.004], [0.0215, 0.06, 0.002], [0.019, 0.062]], 36, 3);
    [-1, 1].forEach((s) => {
      const b = new THREE.Group(); b.position.set(s * 0.026, 0.0215, 0); b.rotation.x = Math.PI / 2; g.add(b);
      b.add(mesh(barrel, M.brassPolished));
      const sleeve = mesh(new THREE.CylinderGeometry(0.0224, 0.0214, 0.036, 36), M.leather); sleeve.position.y = 0.036; b.add(sleeve);
      const objective = mesh(new THREE.CylinderGeometry(0.0186, 0.0186, 0.002, 28), M.steel, false, true); objective.position.y = 0.0605; b.add(objective);
      const eye = mesh(new THREE.CylinderGeometry(0.0118, 0.0118, 0.004, 24), M.rubber, false, true); eye.position.y = -0.057; b.add(eye);
    });
    const bridge = mesh(rbox(0.03, 0.012, 0.05, 0.003), M.brassDark); bridge.position.set(0, 0.03, -0.012); g.add(bridge);
    const hinge = mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.1, 20), M.brass); hinge.rotation.x = Math.PI / 2; hinge.position.set(0, 0.033, 0); g.add(hinge);
    const wheel = mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.012, 32), M.brassKnurl); wheel.rotation.z = Math.PI / 2; wheel.position.set(0, 0.04, -0.03); g.add(wheel);
  }

  /* ---------- Magnifying glass ---------- */
  {
    const g = place('magnifier', D.magnifier);
    const ring = mesh(new THREE.TorusGeometry(0.043, 0.0042, 10, 64), M.brassPolished); ring.rotation.x = Math.PI / 2; ring.position.y = 0.0066; g.add(ring);
    const lens = glass(new THREE.CylinderGeometry(0.041, 0.041, 0.004, 48)); lens.position.y = 0.0066; g.add(lens);
    const ferrule = mesh(new THREE.CylinderGeometry(0.006, 0.0078, 0.02, 20), M.brass); ferrule.rotation.z = Math.PI / 2; ferrule.position.set(0.056, 0.0072, 0); g.add(ferrule);
    const handle = mesh(lathe([[0, 0], [0.0078, 0.002, 0.002], [0.0088, 0.03, 0.01], [0.007, 0.085, 0.01], [0.0056, 0.095, 0.003], [0, 0.097]], 24, 3), M.teak);
    handle.rotation.z = -Math.PI / 2; handle.position.set(0.066, 0.0086, 0); g.add(handle);
  }

  /* ---------- Hourglass: the sand runs down over 50 s, then starts again ---------- */
  const hourglass = (() => {
    const g = place('hourglass', D.hourglass);
    const H = 0.14, neck = 0.07;
    [0.006, H - 0.006].forEach((y) => { const cap = mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.012, 40), M.teak); cap.position.y = y; g.add(cap); });
    const post = lathe([[0, 0], [0.0045, 0], [0.0034, 0.02, 0.004], [0.0056, 0.058, 0.01], [0.0034, 0.096, 0.004], [0.0045, 0.116], [0, 0.116]], 12, 3);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.3; const p = mesh(post, M.teak); p.position.set(Math.cos(a) * 0.035, 0.012, Math.sin(a) * 0.035); g.add(p); }
    g.add(glass(lathe([[0.012, 0.012], [0.028, 0.03, 0.012], [0.027, 0.055, 0.012], [0.0048, 0.07, 0.004], [0.027, 0.085, 0.012], [0.028, 0.11, 0.012], [0.012, 0.128]], 40, 6)));
    const top = new THREE.Group(); top.position.y = neck; g.add(top);
    top.add(mesh(lathe([[0, 0.001], [0.004, 0.002], [0.018, 0.013, 0.004], [0.024, 0.027], [0, 0.03]], 32, 3), M.sand, false, true));
    const bottom = new THREE.Group(); bottom.position.y = 0.0125; g.add(bottom);
    bottom.add(mesh(lathe([[0, 0], [0.025, 0], [0.021, 0.012, 0.004], [0.006, 0.028], [0, 0.03]], 32, 3), M.sand, false, true));
    const stream = mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 1, 6), M.sand, false, false); g.add(stream);
    return (t) => {
      const p = ((t + 17) % 50) / 50, s = smooth(0, 1, p);
      top.scale.set(0.55 + 0.45 * (1 - s), Math.max(0.02, 1 - s), 0.55 + 0.45 * (1 - s));
      bottom.scale.set(0.6 + 0.4 * s, Math.max(0.05, s), 0.6 + 0.4 * s);
      const y0 = 0.0125 + 0.03 * Math.max(0.05, s), y1 = neck;
      stream.visible = p < 0.985 && p > 0.004;
      stream.position.y = (y0 + y1) / 2; stream.scale.y = Math.max(0.001, y1 - y0);
    };
  })();

  /* ---------- Inkwell with a quill ---------- */
  {
    const g = place('inkwell', D.inkwell);
    g.add(mesh(lathe([[0, 0], [0.03, 0], [0.034, 0.004, 0.003], [0.034, 0.03, 0.006], [0.02, 0.042, 0.006], [0.013, 0.046, 0.002], [0.013, 0.052], [0.0095, 0.052], [0.0095, 0.047], [0, 0.046]], 48, 4), M.enamelNavy));
    const collar = mesh(new THREE.TorusGeometry(0.0125, 0.0022, 8, 32), M.brassPolished); collar.rotation.x = Math.PI / 2; collar.position.y = 0.051; g.add(collar);
    const quill = new THREE.Group(); quill.position.set(0, 0.03, 0); quill.rotation.set(0.12, 0.8, -0.6); g.add(quill);
    const shaft = mesh(new THREE.CylinderGeometry(0.0011, 0.0022, 0.21, 10), M.pages); shaft.position.y = 0.105; quill.add(shaft);
    const vane = new THREE.Shape();
    vane.moveTo(0, 0.07); vane.bezierCurveTo(0.017, 0.105, 0.021, 0.16, 0.004, 0.214); vane.lineTo(-0.002, 0.214); vane.bezierCurveTo(-0.012, 0.17, -0.014, 0.115, 0, 0.07);
    const vg = new THREE.ExtrudeGeometry(vane, { depth: 0.0008, bevelEnabled: false, curveSegments: 16 }); vg.translate(0, 0, -0.0004);
    quill.add(mesh(vg, M.pages));
  }

  /* ---------- Hand coffee grinder ---------- */
  {
    const g = place('grinder', D.grinder);
    const body = mesh(boxUV(rbox(0.1, 0.1, 0.1, 0.004), { size: [0.4, 0.4], axis: 'y' }), M.oak); body.position.y = 0.05; g.add(body);
    const drawer = mesh(rbox(0.07, 0.03, 0.006, 0.002), M.teak); drawer.position.set(0, 0.03, 0.05); g.add(drawer);
    const knob = mesh(new THREE.SphereGeometry(0.0055, 16, 10), M.brassPolished); knob.position.set(0, 0.03, 0.057); g.add(knob);
    const plate = mesh(rbox(0.106, 0.008, 0.106, 0.003), M.teak); plate.position.y = 0.103; g.add(plate);
    g.add(mesh(lathe([[0.012, 0.106], [0.045, 0.112, 0.004], [0.046, 0.132, 0.002], [0.042, 0.1335, 0.001], [0.041, 0.115, 0.004], [0.01, 0.1095], [0, 0.1095]], 48, 4), M.brass));
    const shaft = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.056, 12), M.steel); shaft.position.y = 0.14; g.add(shaft);
    const crank = new THREE.Group(); crank.position.y = 0.166; crank.rotation.y = 0.9; g.add(crank);
    const arm = mesh(rbox(0.078, 0.006, 0.012, 0.002), M.brassDark); arm.position.x = 0.036; crank.add(arm);
    const nut = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.008, 16), M.brassDark); crank.add(nut);
    const handle = mesh(lathe([[0, 0], [0.0075, 0.003, 0.003], [0.0088, 0.02, 0.006], [0, 0.027]], 20, 3), M.teak); handle.position.set(0.071, 0.003, 0); crank.add(handle);
  }

  /* ---------- Wall instruments: brass case, dial, glass; clock hands and the barometer's needles ---------- */
  function instrument(name, p, faceMat) {
    const g = new THREE.Group(); g.name = name; g.position.set(p.x, p.y, wz); if (p.s) g.scale.setScalar(p.s); root.add(g);
    const mount = mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.012, 48), M.oak); mount.rotation.x = Math.PI / 2; mount.position.z = 0.006; g.add(mount);
    const shell = new THREE.Group(); shell.rotation.x = Math.PI / 2; shell.position.z = 0.012; g.add(shell);
    shell.add(mesh(lathe([[0.07, 0.0], [0.086, 0.0, 0.003], [0.089, 0.012, 0.004], [0.086, 0.03, 0.004], [0.078, 0.036, 0.002], [0.072, 0.034]], 64, 4), M.brass));
    const face = mesh(new THREE.CircleGeometry(0.072, 64), faceMat, false, true); face.position.z = 0.034; g.add(face);
    const bezel = mesh(new THREE.TorusGeometry(0.075, 0.0042, 10, 72), M.brassPolished); bezel.position.z = 0.048; g.add(bezel);
    const cover = glass(new THREE.CylinderGeometry(0.073, 0.073, 0.003, 48)); cover.rotation.x = Math.PI / 2; cover.position.z = 0.047; g.add(cover);
    const hand = (len, w, mat, z, tail = 0.012) => {
      const geo = new THREE.BoxGeometry(w, len + tail, 0.0016); geo.translate(0, (len - tail) / 2, 0);
      const h = mesh(geo, mat, false, true); h.position.z = z; g.add(h); return h;
    };
    const cap = mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 16), M.brassPolished, false, true); cap.rotation.x = Math.PI / 2; cap.position.z = 0.041; g.add(cap);
    return { g, hand };
  }
  const clock = instrument('clock', D.clock, M.clockFace);
  const hourHand = clock.hand(0.038, 0.0055, M.brassDark, 0.036);
  const minuteHand = clock.hand(0.057, 0.0038, M.brassDark, 0.0375);
  const secondHand = clock.hand(0.061, 0.0014, M.marker, 0.039, 0.018);
  const baro = instrument('barometer', D.barometer, M.baroFace);
  const needle = baro.hand(0.058, 0.0028, M.brassDark, 0.037, 0.016);
  const setHand = baro.hand(0.05, 0.002, M.marker, 0.0385, 0.008);
  setHand.rotation.z = -12 * DEG;
  let needleAngle = 0;

  /* ---------- Shelf with three sample jars ---------- */
  {
    const S = D.shelf, g = new THREE.Group(); g.name = 'shelf'; g.position.set(S.x, S.y, wz); root.add(g);
    const board = mesh(boxUV(rbox(0.26, 0.018, 0.09, 0.004), { size: [0.7, 0.7], axis: 'x' }), M.teak); board.position.set(0, 0, 0.045); g.add(board);
    [-0.1, 0.1].forEach((x) => { const br = mesh(rbox(0.012, 0.062, 0.06, 0.003), M.teak); br.position.set(x, -0.037, 0.03); g.add(br); });
    const jar = lathe([[0.0, 0.0], [0.026, 0.0, 0.003], [0.028, 0.008, 0.004], [0.028, 0.07, 0.004], [0.02, 0.08, 0.004], [0.019, 0.088], [0, 0.088]], 32, 4);
    const fill = lathe([[0, 0], [0.025, 0], [0.025, 0.05, 0.004], [0, 0.056]], 28, 3);
    [[-0.078, 0.8, M.brass], [0, 1.08, M.oak], [0.078, 0.62, M.brass]].forEach(([x, level, lidMat], i) => {
      const beans = new THREE.InstancedMesh(fill, M.bean, 1); beans.position.set(x, 0.0105, 0.045); beans.scale.set(1, level, 1); beans.castShadow = false; beans.receiveShadow = true; g.add(beans);
      const jg = glass(jar); jg.position.set(x, 0.009, 0.045); g.add(jg);
      const lid = mesh(new THREE.CylinderGeometry(0.0215, 0.0215, 0.012, 28), lidMat); lid.position.set(x, 0.101, 0.045); g.add(lid);
      const label = mesh(new THREE.CylinderGeometry(0.0284, 0.0284, 0.022, 32, 1, true, -1.2 + i * 0.2, 2.4), M.pages, false, true); label.position.set(x, 0.042, 0.045); g.add(label);
    });
  }

  /* ---------- On the deck: a coffee sack, a coiled rope, a stamped crate ---------- */
  {
    const g = place('sack', D.sack, FLOOR);
    const geo = lathe([[0, 0], [0.13, 0.004, 0.02], [0.17, 0.06, 0.05], [0.176, 0.2, 0.06], [0.14, 0.3, 0.05], [0.06, 0.345, 0.02], [0.045, 0.36]], 48, 6);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x);
      const k = 1 + 0.06 * Math.sin(a * 3 + y * 20) * smooth(0.02, 0.1, y) + 0.035 * Math.sin(a * 7 - y * 31) * smooth(0.02, 0.1, y);
      p.setXYZ(i, x * k, y, z * k);
    }
    geo.computeVertexNormals();
    g.add(mesh(geo, M.burlap));
    g.add(mesh(lathe([[0.045, 0.355], [0.062, 0.385, 0.012], [0.03, 0.42, 0.01], [0.075, 0.455, 0.02], [0.02, 0.445], [0, 0.435]], 36, 4), M.burlap));
    const tie = mesh(new THREE.TorusGeometry(0.048, 0.0065, 8, 32), M.twine); tie.rotation.x = Math.PI / 2; tie.position.y = 0.372; g.add(tie);
  }
  {
    const g = place('rope', D.rope, FLOOR);
    const pts = [], turns = 3.4, n = 240, r0 = 0.15, r1 = 0.055;
    for (let i = 0; i <= n; i++) { const t = i / n, a = t * turns * TAU, r = r0 + (r1 - r0) * t; pts.push(new THREE.Vector3(Math.cos(a) * r, 0.013 + 0.022 * smooth(0.75, 1, t), Math.sin(a) * r)); }
    const tail = [new THREE.Vector3(0.16, 0.013, 0.02), new THREE.Vector3(0.22, 0.013, 0.07), new THREE.Vector3(0.3, 0.013, 0.06)];
    const curve = new THREE.CatmullRomCurve3([...tail.reverse(), ...pts]);
    g.add(mesh(new THREE.TubeGeometry(curve, 600, 0.0132, 10, false), M.rope));
  }
  {
    const g = place('crate', D.crate, FLOOR);
    const W = 0.44, H = 0.3, Dp = 0.32;
    const body = mesh(boxUV(rbox(W, H, Dp, 0.006), { size: [0.5, 0.5], axis: 'x' }), M.oak); body.position.y = H / 2; g.add(body);
    [0.1, 0.2].forEach((y) => { const gr = mesh(new THREE.BoxGeometry(W + 0.002, 0.004, Dp + 0.002), M.teak, false, true); gr.position.y = y; g.add(gr); });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const b = mesh(rbox(0.028, H + 0.004, 0.028, 0.004), M.teak); b.position.set((sx * (W - 0.02)) / 2, H / 2, (sz * (Dp - 0.02)) / 2); g.add(b); });
    [-0.1, 0.1].forEach((z) => { const s = mesh(rbox(W - 0.02, 0.012, 0.05, 0.003), M.teak); s.position.set(0, H + 0.004, z); g.add(s); });
    const stamp = (w, h, v0) => {
      const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, v0 + uv.getY(i) * 0.5);
      return mesh(geo, M.stamp, false, true);
    };
    const front = stamp(0.36, 0.1, 0.5); front.position.set(0, 0.16, Dp / 2 + 0.0035); g.add(front);
    const side = stamp(0.27, 0.075, 0); side.rotation.y = Math.PI / 2; side.position.set(W / 2 + 0.0035, 0.16, 0); g.add(side);
  }

  return {
    group: root,
    // t: the scene clock (s); W: the current weather (the barometer falls as the weather worsens)
    update(dt, t, W) {
      hourglass(t);
      const now = new Date(), s = now.getSeconds() + now.getMilliseconds() / 1000, m = now.getMinutes() + s / 60, h = (now.getHours() % 12) + m / 60;
      secondHand.rotation.z = -Math.floor(s) * 6 * DEG;
      minuteHand.rotation.z = -m * 6 * DEG;
      hourHand.rotation.z = -h * 30 * DEG;
      const foul = clamp((W ? W.rain * 0.6 + W.lightning * 0.4 + W.clouds * 0.3 : 0), 0, 1);
      needleAngle += ((70 - 150 * foul) * DEG - needleAngle) * (1 - Math.exp(-dt * 0.8));
      needle.rotation.z = needleAngle;
    }
  };
}
