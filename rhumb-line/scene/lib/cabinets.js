/* Rhumb Line · scene/lib/cabinets.js
   Two tall coffee sample cabinets, one each side of the desk, standing on the deck against the hull wall (a merchant's
   sample room on a ship). Not pickable; they roll with the hull (they sit on the ship group).
   From the top: a cornice; three open shelves of glass jars of beans (green, medium roast, dark roast) with paper labels
   (the six countries and their leg, approved copy), brass or cork lids and a brass fiddle rail across each shelf so
   nothing falls in a sea; a counter ledge; a bank of nine small sample drawers with brass bin pulls and label holders
   (the six growing regions); and an open bay at the foot with a printed burlap sack and coffee tins.
   Cheap by design: the parts are merged into one mesh per material per cabinet, all materials are the cabin's own or
   share its shader programs (the jar glass is a plain transparent standard material, no transmission), beans are
   instanced (one mesh per roast per cabinet, only the layer that faces the room), and one texture atlas holds every
   label and print. A weak warm light in front of each cabinet keeps it readable, darker than the table. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { lathe, boxUV, rng, TAU, clamp } from './util.js';
import { LAYOUT } from './layout.js';
import { makeCanvas, toTexture, fitText, spacing, NAVY, MARKER, ROAST } from './canvas-tex.js';
import { COPY, splitFirst } from '../copy.js';

const rbox = (w, h, d, r, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, r);
const ORIGIN_IDS = Object.keys(COPY.origins);

/* ---------- Dimensions (metres, cabinet space: floor at y = 0, back at z = 0, front at z = D, x across) ---------- */
const W = 0.46, D = 0.3, T = 0.022, IW = W - 2 * T;
const Y = { plinth: 0.07, bayTop: 0.48, drawers: [0.5, 0.86], ledge: 0.875, shelves: [0.89, 1.21, 1.53], top: 1.83, cornice: 1.96 };
const ROW_H = 0.3;

/* ---------- Label atlas (1024 px): jar labels, a tin label, drawer labels, two sack prints ---------- */
function atlasTexture(renderer) {
  const S = 1024, c = makeCanvas(S, S), g = c.getContext('2d'), R = rng(907);
  const cells = {};
  const cell = (name, x, y, w, h) => { cells[name] = { u0: x / S, u1: (x + w) / S, v0: 1 - (y + h) / S, v1: 1 - y / S }; };
  const paper = (x, y, w, h, tone) => {
    g.fillStyle = tone; g.fillRect(x, y, w, h);
    for (let i = 0; i < (w * h) / 220; i++) { g.fillStyle = `rgba(110,84,48,${0.03 + R() * 0.06})`; g.fillRect(x + R() * w, y + R() * h, 1 + R() * 2, 1 + R() * 2); }
    const age = g.createRadialGradient(x + w / 2, y + h / 2, h * 0.2, x + w / 2, y + h / 2, w * 0.7);
    age.addColorStop(0, 'rgba(160,120,70,0)'); age.addColorStop(1, 'rgba(150,110,60,.25)');
    g.fillStyle = age; g.fillRect(x, y, w, h);
  };
  g.textAlign = 'center'; g.textBaseline = 'middle';
  // jar labels: the country, a red rule, the leg
  ORIGIN_IDS.forEach((id, i) => {
    const x = (i % 4) * 256, y = Math.floor(i / 4) * 128, w = 256, h = 128;
    paper(x + 2, y + 2, w - 4, h - 4, '#EFE5CF');
    g.strokeStyle = NAVY; g.lineWidth = 3; g.strokeRect(x + 12, y + 12, w - 24, h - 24);
    g.lineWidth = 1; g.strokeRect(x + 18, y + 18, w - 36, h - 36);
    const country = splitFirst(COPY.origins[id].name)[1].toUpperCase();
    g.fillStyle = NAVY; spacing(g, 4);
    fitText(g, country, '600 {s}px "Barlow Condensed", "Arial Narrow", sans-serif', 52, w - 60);
    g.fillText(country, x + w / 2 + 2, y + 54); spacing(g, 0);
    g.fillStyle = MARKER; g.fillRect(x + w / 2 - 36, y + 80, 72, 3);
    g.fillStyle = ROAST; g.font = 'italic 500 22px "EB Garamond", Georgia, serif';
    g.fillText(COPY['voyage.legLabel'].replace('{n}', String(i + 1)), x + w / 2, y + 100);
    cell('jar' + i, x, y, w, h);
  });
  // tin label band: the wordmark and the line under it
  {
    const x = 512, y = 128, w = 512, h = 128;
    g.fillStyle = '#EFE3C8'; g.fillRect(x, y, w, h);
    g.fillStyle = MARKER; g.fillRect(x, y + 10, w, 6); g.fillRect(x, y + h - 16, w, 6);
    g.fillStyle = NAVY; spacing(g, 12);
    fitText(g, COPY['hero.wordmark'], '600 {s}px "Barlow Condensed", "Arial Narrow", sans-serif', 56, w - 80);
    g.fillText(COPY['hero.wordmark'], x + w / 2 + 6, y + 52); spacing(g, 0);
    g.fillStyle = ROAST; g.font = 'italic 500 26px "EB Garamond", Georgia, serif';
    g.fillText(COPY['hero.sub'], x + w / 2, y + 92);
    cell('tin', x, y, w, h);
  }
  // drawer labels: the six regions, then two pencilled cards
  for (let i = 0; i < 8; i++) {
    const x = (i % 4) * 256, y = 256 + Math.floor(i / 4) * 96, w = 256, h = 96;
    paper(x + 2, y + 2, w - 4, h - 4, '#E9DDC3');
    if (i < 6) {
      const region = splitFirst(COPY.origins[ORIGIN_IDS[i]].name)[0];
      g.fillStyle = NAVY;
      fitText(g, region, 'italic 500 {s}px "EB Garamond", Georgia, serif', 44, w - 36);
      g.fillText(region, x + w / 2, y + h / 2 + 2);
    } else {
      g.strokeStyle = 'rgba(40,40,46,.55)'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x + 40, y + 50);
      for (let k = x + 40; k < x + 200; k += 9) g.lineTo(k, y + 50 + Math.sin(k * 0.21 + i) * 7 + (R() - 0.5) * 5);
      g.stroke();
    }
    cell('drawer' + i, x, y, w, h);
  }
  // sack prints (transparent around the ink): a compass star, the country large, the region, the port
  [ORIGIN_IDS[0], ORIGIN_IDS[4]].forEach((id, i) => {
    const x = i * 512, y = 448, w = 512, h = 256;
    const [region, country] = splitFirst(COPY.origins[id].name);
    g.save();
    g.translate(x + w / 2, y + h / 2); g.rotate((R() - 0.5) * 0.04);
    g.fillStyle = 'rgba(30,26,24,.9)'; g.strokeStyle = 'rgba(30,26,24,.9)';
    g.lineWidth = 6; g.beginPath(); g.arc(0, -64, 30, 0, TAU); g.stroke();
    for (let k = 0; k < 4; k++) { g.save(); g.rotate((k * Math.PI) / 2); g.beginPath(); g.moveTo(0, -64 - 28); g.lineTo(7, -64); g.lineTo(-7, -64); g.closePath(); g.restore(); g.save(); g.translate(0, -64); g.rotate((k * Math.PI) / 2); g.beginPath(); g.moveTo(0, -28); g.lineTo(7, 0); g.lineTo(-7, 0); g.closePath(); g.fill(); g.restore(); }
    spacing(g, 10);
    fitText(g, country.toUpperCase(), '600 {s}px "Barlow Condensed", "Arial Narrow", sans-serif', 84, w - 60);
    g.fillText(country.toUpperCase(), 5, 20);
    spacing(g, 4);
    fitText(g, region.toUpperCase(), '600 {s}px "Barlow Condensed", "Arial Narrow", sans-serif', 34, w - 120);
    g.fillText(region.toUpperCase(), 2, 78);
    g.fillRect(-120, 100, 240, 4);
    fitText(g, COPY['port.name'].toUpperCase(), '600 {s}px "Barlow Condensed", "Arial Narrow", sans-serif', 26, w - 160);
    g.fillText(COPY['port.name'].toUpperCase(), 2, 122);
    spacing(g, 0);
    g.restore();
    cell('sack' + i, x, y, w, h);
  });
  // stamped ink is never solid
  g.save(); g.beginPath(); g.rect(0, 448, S, 256); g.clip();
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + R() * 0.7})`; g.fillRect(R() * S, 448 + R() * 256, 1 + R() * 4, 1 + R() * 3); }
  g.restore();
  return { texture: toTexture(c, renderer), cells };
}

/* ---------- Merging: one geometry per material per cabinet ---------- */
function merger() {
  const parts = {};
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  function add(key, geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
    e.set(rot[0], rot[1], rot[2]); q.setFromEuler(e);
    m4.compose(p.set(pos[0], pos[1], pos[2]), q, s.set(scale[0], scale[1], scale[2]));
    const c = geo.index ? geo.toNonIndexed() : geo.clone();
    c.applyMatrix4(m4);
    if (!c.attributes.normal) c.computeVertexNormals();
    if (!c.attributes.uv) c.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2));
    (parts[key] = parts[key] || []).push(c);
    if (geo !== c) geo.dispose();
  }
  function build(key) {
    const list = parts[key];
    if (!list) return null;
    let n = 0; list.forEach((c) => { n += c.attributes.position.count; });
    const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
    let o = 0;
    list.forEach((c) => { P.set(c.attributes.position.array, o * 3); N.set(c.attributes.normal.array, o * 3); U.set(c.attributes.uv.array, o * 2); o += c.attributes.position.count; c.dispose(); });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(P, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    out.computeBoundingSphere();
    return out;
  }
  return { add, build, keys: () => Object.keys(parts) };
}
const withUV = (geo, cell) => {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, cell.u0 + uv.getX(i) * (cell.u1 - cell.u0), cell.v0 + uv.getY(i) * (cell.v1 - cell.v0));
  return geo;
};

/* A small bean for the jars (a lower-poly cousin of the table's bean), flat creased side on -y. */
function jarBeanGeometry() {
  const g = new THREE.SphereGeometry(1, 9, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let Yv = y * 0.0033;
    if (y < 0) { Yv *= 0.42; Yv += 0.0011 * Math.exp(-Math.pow(z / 0.2, 2)) * (1 - x * x); }
    p.setXYZ(i, x * 0.0054, Yv + 0.0014, z * 0.0041);
  }
  g.computeVertexNormals();
  return g;
}

/* Beans filling a jar, as matrices: the layer against the glass on the room-facing side, and the top. */
function jarBeans(out, R, cx, by, cz, fill, facing) {
  const m4 = new THREE.Matrix4(), X = new THREE.Vector3(), Yv = new THREE.Vector3(), Z = new THREE.Vector3(), P = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), tan = new THREE.Vector3(), inw = new THREE.Vector3();
  const push = (px, py, pz, s) => { m4.makeBasis(X, Yv, Z); m4.scale(new THREE.Vector3(s, s, s)); m4.setPosition(P.set(px, py, pz)); out.push(m4.clone()); };
  const rr = 0.0292;
  for (let y = 0.011; y < fill - 0.003; y += 0.0071) {
    const off = (R() - 0.5) * 0.3;
    for (let a = -1.95 + off; a <= 1.95; a += 0.0102 / rr) {
      const ang = facing + a + (R() - 0.5) * 0.1;
      inw.set(-Math.sin(ang), 0, -Math.cos(ang));
      tan.set(Math.cos(ang), 0, -Math.sin(ang));
      const r = R() * TAU;
      X.copy(tan).multiplyScalar(Math.cos(r)).addScaledVector(up, Math.sin(r));
      Yv.copy(inw).add(new THREE.Vector3((R() - 0.5) * 0.5, (R() - 0.5) * 0.5, (R() - 0.5) * 0.5)).normalize();
      X.addScaledVector(Yv, -X.dot(Yv)).normalize();
      Z.crossVectors(X, Yv);
      push(cx - inw.x * rr, by + y + (R() - 0.5) * 0.003, cz - inw.z * rr, 0.85 + R() * 0.25);
    }
  }
  for (let dx = -0.024; dx <= 0.024; dx += 0.0092) for (let dz = -0.024; dz <= 0.024; dz += 0.0092) {
    if (dx * dx + dz * dz > 0.026 * 0.026) continue;
    const r = R() * TAU;
    Yv.set((R() - 0.5) * 0.8, 1, (R() - 0.5) * 0.8).normalize();
    X.set(Math.cos(r), 0, Math.sin(r)); X.addScaledVector(Yv, -X.dot(Yv)).normalize();
    Z.crossVectors(X, Yv);
    push(cx + dx + (R() - 0.5) * 0.004, by + fill - 0.001, cz + dz + (R() - 0.5) * 0.004, 0.85 + R() * 0.25);
  }
}

/* ---------- One cabinet ---------- */
function buildCabinet(M, mats, atlas, side, seed, withLight) {
  const R = rng(seed), mg = merger();
  const group = new THREE.Group(); group.name = 'cabinet' + (side < 0 ? 'Left' : 'Right');
  // the jars' labels, lids and beans face the seat at the desk: towards +x on the left cabinet, -x on the right
  const facing = side < 0 ? 0.6 : -0.55;
  const V = (w, h, d, r) => boxUV(rbox(w, h, d, r), { size: [0.7, 0.7], axis: 'y' });
  const Hh = (w, h, d, r) => boxUV(rbox(w, h, d, r), { size: [0.7, 0.7], axis: 'x' });

  /* carcass. ins: the table's side (+x for the left cabinet). Below the ledge the body is `tuck` narrower there. */
  const ins = side < 0 ? 1 : -1, tuck = (side < 0 ? LAYOUT.cabinets.left : LAYOUT.cabinets.right).tuck || 0;
  const WL = W - tuck, IWL = WL - 2 * T, cL = -ins * tuck / 2, low = Y.ledge - 0.015;
  mg.add('teak', V(T, Y.top, D, 0.004), [-ins * (W / 2 - T / 2), Y.top / 2, D / 2]);
  mg.add('teak', V(T, Y.top - low, D, 0.004), [ins * (W / 2 - T / 2), (Y.top + low) / 2, D / 2]);
  mg.add('teak', V(T, low, D, 0.004), [ins * (W / 2 - tuck - T / 2), low / 2, D / 2]);
  mg.add('teak', boxUV(new THREE.BoxGeometry(IW, Y.top, 0.012), { size: [0.7, 0.7], axis: 'y' }), [0, Y.top / 2, 0.006]);
  mg.add('teak', Hh(WL - 0.02, Y.plinth, D - 0.03, 0.004), [cL, Y.plinth / 2, D / 2 - 0.02]);
  [Y.plinth + 0.01, Y.bayTop + 0.01].forEach((y) => mg.add('teak', Hh(IWL, 0.02, D - 0.012, 0.003), [cL, y, D / 2 + 0.004]));
  [Y.shelves[1] - 0.01, Y.shelves[2] - 0.01].forEach((y) => mg.add('teak', Hh(IW, 0.02, D - 0.012, 0.003), [0, y, D / 2 + 0.004]));
  mg.add('teak', Hh(W, 0.03, D, 0.004), [0, Y.top + 0.015, D / 2]);
  mg.add('teak', Hh(W + 0.05, 0.05, D + 0.035, 0.008), [0, Y.top + 0.055, (D + 0.035) / 2]);
  mg.add('teak', Hh(W + 0.075, 0.028, D + 0.05, 0.007), [0, Y.top + 0.094, (D + 0.05) / 2]);
  mg.add('oak', Hh(W + 0.024, 0.03, D + 0.028, 0.005), [0, Y.ledge, (D + 0.028) / 2]);

  /* drawer bank: 3 x 3 small sample drawers */
  const [d0, d1] = Y.drawers, dh = (d1 - d0) / 3, dw = IWL / 3;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const i = r * 3 + c, cx = cL - IWL / 2 + dw * (c + 0.5), cy = d1 - dh * (r + 0.5), fz = D - 0.004;
    mg.add('oak', boxUV(rbox(dw - 0.008, dh - 0.008, 0.016, 0.003), { size: [0.4, 0.4], axis: 'x' }), [cx, cy, fz - 0.006]);
    // brass label holder with its card, a bin pull below
    mg.add('brass', new THREE.BoxGeometry(0.07, 0.034, 0.003), [cx, cy + 0.018, fz + 0.003]);
    const card = (seed + i * 3) % 8;
    mg.add('labels', withUV(new THREE.PlaneGeometry(0.062, 0.026), atlas.cells['drawer' + card]), [cx, cy + 0.018, fz + 0.0048]);
    mg.add('brassPolished', new THREE.TorusGeometry(0.016, 0.0028, 6, 18, Math.PI), [cx, cy - 0.022, fz + 0.004], [0, 0, Math.PI]);
    [-1, 1].forEach((k) => mg.add('brassPolished', new THREE.CylinderGeometry(0.0034, 0.0034, 0.005, 8), [cx + k * 0.016, cy - 0.022, fz + 0.002], [Math.PI / 2, 0, 0]));
  }
  // drawer bank frame rails
  [d0 + dh, d0 + 2 * dh].forEach((y) => mg.add('teak', new THREE.BoxGeometry(IWL, 0.006, 0.02), [cL, y, D - 0.012]));
  [-1, 1].forEach((k) => mg.add('teak', new THREE.BoxGeometry(0.006, d1 - d0, 0.02), [cL + k * dw / 2, (d0 + d1) / 2, D - 0.012]));

  /* open shelves: 4 jars a row, a brass fiddle rail */
  const jarGlass = lathe([[0, 0], [0.033, 0, 0.004], [0.035, 0.006, 0.004], [0.035, 0.13, 0.012], [0.027, 0.148, 0.006], [0.026, 0.16]], 24, 3);
  const brassLid = lathe([[0.029, 0.156], [0.0305, 0.16, 0.002], [0.0305, 0.176, 0.002], [0.027, 0.18, 0.002], [0, 0.181]], 20, 2);
  const beans = { green: [], medium: [], dark: [] }, cores = { green: [], medium: [], dark: [] };
  const roasts = ['green', 'medium', 'dark'];
  let jarN = 0;
  Y.shelves.forEach((sy, row) => {
    const base = sy + 0.001;
    for (let j = 0; j < 4; j++) {
      const cx = -0.162 + j * 0.108 + (R() - 0.5) * 0.006, cz = 0.15 + (R() - 0.5) * 0.02;
      const roast = roasts[(jarN + seed) % 3];
      const fill = 0.085 + R() * 0.045;
      mg.add('glass', jarGlass.clone(), [cx, base, cz]);
      if ((jarN + row) % 3 === 2) mg.add('cork', new THREE.CylinderGeometry(0.0262, 0.0232, 0.03, 14), [cx, base + 0.168, cz]);
      else mg.add('brass', brassLid.clone(), [cx, base, cz], [0, R() * TAU, 0]);
      const id = (jarN * 5 + seed) % 6;
      mg.add('labels', withUV(new THREE.CylinderGeometry(0.0357, 0.0357, 0.05, 10, 1, true, facing - 0.72, 1.44), atlas.cells['jar' + id]), [cx, base + 0.074, cz]);
      jarBeans(beans[roast], R, cx, base, cz, fill, facing);
      const core = new THREE.Matrix4().compose(new THREE.Vector3(cx, base + (fill - 0.004) / 2 + 0.002, cz), new THREE.Quaternion(), new THREE.Vector3(0.0265, fill - 0.004, 0.0265));
      cores[roast].push(core);
      jarN++;
    }
    // fiddle rail and its two posts
    mg.add('brassPolished', new THREE.CylinderGeometry(0.0042, 0.0042, IW, 12), [0, base + 0.062, D - 0.018], [0, 0, Math.PI / 2]);
    [-1, 1].forEach((k) => mg.add('brass', new THREE.CylinderGeometry(0.005, 0.006, 0.062, 10), [k * (IW / 2 - 0.012), base + 0.031, D - 0.018]));
  });

  /* the bay: a printed sack, three tins */
  // the sack towards the outer wall, the tins towards the table's side, both inside the (tucked) lower body
  const sx = -ins * 0.075, tx = ins, tinIn = Math.min(0.1, IWL / 2 + cL * ins - 0.05);
  {
    const prof = [[0, 0], [0.1, 0.003, 0.015], [0.126, 0.045, 0.035], [0.13, 0.15, 0.045], [0.104, 0.225, 0.035], [0.045, 0.262, 0.015], [0.034, 0.272]];
    const geo = lathe(prof, 40, 5);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z);
      const k = 1 + (0.05 * Math.sin(a * 3 + y * 24) + 0.03 * Math.sin(a * 7 - y * 37)) * clamp((y - 0.02) / 0.06, 0, 1);
      p.setXYZ(i, x * k, y, z * k);
    }
    geo.computeVertexNormals();
    // the print: the sack's own triangles around the room-facing side, lifted off the cloth
    const idx = geo.index.array, pos = geo.attributes.position, nor = geo.attributes.normal;
    const printP = [], printU = [], cellS = atlas.cells['sack' + (side < 0 ? 0 : 1)], half = 0.95, y0 = 0.05, y1 = 0.21;
    const angOf = (i) => { let a = Math.atan2(pos.getX(i), pos.getZ(i)) - facing; while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
    for (let t = 0; t < idx.length; t += 3) {
      const v = [idx[t], idx[t + 1], idx[t + 2]];
      if (!v.every((i) => Math.abs(angOf(i)) < half && pos.getY(i) > y0 && pos.getY(i) < y1)) continue;
      v.forEach((i) => {
        printP.push(pos.getX(i) + nor.getX(i) * 0.0025, pos.getY(i) + nor.getY(i) * 0.0025, pos.getZ(i) + nor.getZ(i) * 0.0025);
        const u = (angOf(i) + half) / (2 * half), vv = (pos.getY(i) - y0) / (y1 - y0);
        printU.push(cellS.u0 + u * (cellS.u1 - cellS.u0), cellS.v0 + vv * (cellS.v1 - cellS.v0));
      });
    }
    const print = new THREE.BufferGeometry();
    print.setAttribute('position', new THREE.Float32BufferAttribute(printP, 3));
    print.setAttribute('uv', new THREE.Float32BufferAttribute(printU, 2));
    print.computeVertexNormals();
    const top = lathe([[0.034, 0.268], [0.046, 0.292, 0.009], [0.022, 0.315, 0.008], [0.055, 0.34, 0.015], [0.015, 0.333], [0, 0.326]], 24, 3);
    const at = [sx, Y.plinth + 0.02, 0.15];
    mg.add('burlap', geo, at, [0, 0.2 * side, 0]);
    mg.add('burlap', top, at);
    mg.add('twine', new THREE.TorusGeometry(0.037, 0.005, 6, 20), [at[0], at[1] + 0.276, at[2]], [Math.PI / 2, 0, 0]);
    mg.add('labels', print, at, [0, 0.2 * side, 0]);
  }
  const tin = (x, y, z, key) => {
    const h = 0.11, r = 0.041;
    mg.add(key, new THREE.CylinderGeometry(r, r, h, 24), [x, y + h / 2, z]);
    mg.add('brassPolished', lathe([[r + 0.001, h - 0.012], [r + 0.0022, h - 0.011, 0.001], [r + 0.0022, h + 0.004, 0.001], [r - 0.003, h + 0.006, 0.002], [0, h + 0.006]], 24, 2), [x, y, z]);
    mg.add('brass', new THREE.TorusGeometry(r, 0.0022, 6, 24), [x, y + 0.002, z], [Math.PI / 2, 0, 0]);
    mg.add('labels', withUV(new THREE.CylinderGeometry(r + 0.0008, r + 0.0008, 0.05, 16, 1, true, facing - 1.2, 2.4), atlas.cells.tin), [x, y + h * 0.48, z]);
  };
  tin(tx * tinIn, Y.plinth + 0.02, 0.1, 'enamelNavy');
  tin(tx * tinIn, Y.plinth + 0.02 + 0.117, 0.1, 'enamelRed');
  tin(tx * (tinIn - 0.02), Y.plinth + 0.02, 0.215, 'enamelCream');

  /* meshes */
  const glassMeshes = [];
  mg.keys().forEach((key) => {
    const mesh = new THREE.Mesh(mg.build(key), mats[key]);
    mesh.name = key === 'glass' ? 'glass' : 'cabinet:' + key;
    mesh.castShadow = key === 'teak';
    mesh.receiveShadow = key !== 'glass';
    if (key === 'glass') { mesh.renderOrder = 4; glassMeshes.push(mesh); }
    group.add(mesh);
  });
  const beanGeo = jarBeanGeometry(), coreGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
  roasts.forEach((roast) => {
    const add = (geo, list, name) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, mats['bean_' + roast], list.length);
      list.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.castShadow = false; im.receiveShadow = true; im.name = name;
      group.add(im);
    };
    add(coreGeo, cores[roast], 'beanCore');
    add(beanGeo, beans[roast], 'jarBeans');
  });

  // a weak warm light in front of the shelves (optional: every extra light makes every lit shader heavier)
  let light = null;
  if (withLight) {
    light = new THREE.PointLight(new THREE.Color(1.0, 0.66, 0.38), 0.3, 1.5, 2);
    light.position.set(-side * 0.12, 1.3, D + 0.4);
    light.name = 'cabinetLight';
    group.add(light);
  }
  return { group, glass: glassMeshes, light, beanCount: roasts.reduce((n, r) => n + beans[r].length, 0) };
}

/* ---------- Both cabinets ---------- */
export function buildCabinets(M, renderer, { lights = true } = {}) {
  const atlas = atlasTexture(renderer);
  const beanOf = (r, g, b, rough) => { const m = M.bean.clone(); m.color.setRGB(r, g, b); m.roughness = rough; return m; };
  const mats = {
    teak: M.teak, oak: M.oak, brass: M.brass, brassPolished: M.brassPolished, burlap: M.burlap, twine: M.twine,
    enamelNavy: M.enamelNavy, enamelRed: M.enamelRed, enamelCream: M.enamelCream,
    // glass: a dark body that adds its reflections on top of what is behind (premultiplied), no transmission
    glass: new THREE.MeshStandardMaterial({ color: 0x0c100e, roughness: 0.06, metalness: 0, envMapIntensity: 2.6, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }),
    cork: new THREE.MeshStandardMaterial({ color: 0xa07a4c, roughness: 0.95 }),
    labels: new THREE.MeshStandardMaterial({ map: atlas.texture, alphaTest: 0.5, roughness: 0.9, side: THREE.DoubleSide }),
    bean_green: beanOf(0.26, 0.29, 0.14, 0.62),
    bean_medium: beanOf(0.2, 0.075, 0.025, 0.5),
    bean_dark: M.bean
  };
  mats.glass.name = 'jarGlass'; mats.cork.name = 'cork'; mats.labels.name = 'cabinetLabels';
  mats.bean_green.name = 'beanGreen'; mats.bean_medium.name = 'beanMedium';
  const C = LAYOUT.cabinets, root = new THREE.Group(); root.name = 'cabinets';
  const list = [[-1, C.left], [1, C.right]].map(([side, P], i) => {
    const cab = buildCabinet(M, mats, atlas, side, 31 + i * 17, lights);
    cab.group.position.set(P.x, C.floor, C.z);
    cab.group.rotation.y = P.yaw || 0;
    root.add(cab.group);
    return cab;
  });
  return {
    group: root,
    glass: list.flatMap((c) => c.glass),
    lights: list.map((c) => c.light).filter(Boolean),
    beanCount: list.reduce((n, c) => n + c.beanCount, 0),
    // W: the current weather (the lights follow the cabin's lamp and ambient)
    update(dt, t, W) {
      const k = W ? 0.18 + W.lampI * 0.55 + W.ambI * 0.08 : 0.3;
      list.forEach((c, i) => { if (c.light) c.light.intensity = k * (1 + 0.04 * Math.sin(t * 1.7 + i)); });
    }
  };
}
