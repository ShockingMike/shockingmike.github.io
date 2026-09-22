// Chớm world, season Đông: the Old Quarter at night. Tube houses built along the street (palette knife, core/paint.js),
// with the things a winter evening shows: most shutters shut, a few windows warm, old painted signs over the shops,
// "tiger cage" grilles on the balconies, tin sheds and water tanks on the roofs, closed roller shutters at street level.
// The rows are laid straight in world space: the near row's fronts face -x (x = xWall), the far row's face +x.
// Everything here is background tier (hazed), the main things live in brazier.js / altar.js.
import * as THREE from 'three';
import { V3, mat } from '../../core/build.js';

// old quarter colours: faded ochre, damp grey-green, tired lime wash (the night light darkens them in the shader)
const WALLS = [['#7a6440', '#8c7650'], ['#6a6a58', '#7a7866'], ['#765c48', '#866a54'], ['#5e6258', '#6c7064'], ['#806a46', '#927a54'], ['#665a4c', '#76685a'], ['#706e52', '#807c5e']];
const SHUT = [['#34503e', '#5e826a'], ['#4e3426', '#7e5a40'], ['#324650', '#5a7284'], ['#445234', '#6c7c52']];
const ROOF = [['#4a3028', '#7e5040'], ['#40302a', '#6e4a3a'], ['#52382e', '#86584a']];
const WARM = ['#d08a48', '#d89a58', '#c87a3a'];

// signs over the shops: plain Vietnamese words, no names, no brands (drawn with Be Vietnam Pro, marks checked by eye)
export const SIGN_TEXT = ['TẠP HOÁ', 'SỬA ĐỒNG HỒ', 'BÁNH CUỐN', 'CẮT TÓC', 'HÀNG MÃ', 'CHÈ – BÁNH', 'GIẶT LÀ', 'ĐỒ THỜ', 'PHỞ GÀ', 'KHOÁ – CHÌA', 'SỬA XE', 'IN ẤN', 'BÁNH GAI', 'CHĂN GA', 'HƯƠNG NẾN', 'THUỐC BẮC', 'MŨ NÓN', 'GIÀY DÉP', 'ĐỒ ĐỒNG', 'NỒI NIÊU'];
const SIGN_COL = [['#7a1c16', '#e8c060'], ['#1c3a6a', '#f0e8d0'], ['#e0c040', '#7a1c16'], ['#f0e8d8', '#1c3a6a'], ['#2a5a3a', '#f0e8d0'], ['#8a2a1e', '#f4ecd8']];

// one builder for both rows. side = +1: near row (fronts at xWall facing -x); -1: far row (fronts facing +x)
export async function houseRow(R, kb, mass, fine, o) {
  const { side, xWall, zFrom, zTo, haze = 0.14, balconies = null, tops = null, signs = null, skip = [], lanes = [], shutters = null, warm = null } = o;
  // a fixed hash for the evening's warm details (not the row's random stream, so the houses keep their shapes)
  const hash = (x) => { const v = Math.sin(x * 12.9898 + xWall * 78.233) * 43758.5453; return v - Math.floor(v); };
  const out = -side;                              // +x for the far row, -x for the near row
  const H0 = { haze };
  const X = (d) => xWall + out * d;               // d: metres out from the front (negative: inside the house)
  // a box on the front: along = length along the street (z), d0/d1 = its depth span out from the front
  const fb = (b, along, h, dA, dB, zc, yc, opts, rot) => b.box(Math.abs(dB - dA), h, along, V3(X((dA + dB) / 2), yc + y0, zc), { ...H0, ...opts }, rot);
  const houses = [];
  let z = zFrom;
  let n = 0;
  while (z > zTo + 0.5) {
    if (o.slice) await o.slice('house');
    // a lane opening (ngõ): a gap in the row with a low wall at its far end
    const lane = lanes.find((l) => z <= l[0] + 0.01 && z > l[1]);
    if (lane) {
      const w = lane[0] - lane[1];
      if (tops) tops.push([lane[1], lane[0], 0]);
      mass.box(0.4, 7, w, V3(X(-9), 3.5, (lane[0] + lane[1]) / 2), { col: '#6a6a66', col2: '#8a8a82', scale: 0.35, drip: 0.6, seed: R(), ...H0, haze: haze + 0.1 });
      z = lane[1];
      continue;
    }
    let w = (o.force || [])[n]?.w ?? 3.0 + R() * 1.7;
    const stop = lanes.map((l) => l[0]).filter((lz) => lz < z - 0.01).sort((a, b) => b - a)[0] ?? zTo;
    if (z - w - stop < 2.4) w = z - stop;
    const za = z, zb = z - w, zc = (za + zb) / 2;
    const special = skip.find((s) => Math.abs(s.z - zc) < w / 2);
    if (special) {
      // a house the season builds itself (the altar house): only its mass and the roof line here
      houses.push({ za, zb, zc, w, special: special.name });
      if (tops) tops.push([zb, za, special.top ?? 8.6]);
      z = zb;
      n++;
      continue;
    }
    const force = (o.force || [])[n] || {};
    const type = R();
    const kind = force.kind ?? (type < 0.34 ? 'old' : type < 0.72 ? 'mid' : 'tall');
    const floors = kind === 'old' ? 2 : kind === 'mid' ? 3 : 4 + (R() < 0.4 ? 1 : 0);
    const gh = kind === 'old' ? 3.0 : 3.3;           // ground floor height
    const fh = kind === 'old' ? 2.7 : 3.1;
    const H = gh + (floors - 1) * fh;
    const [wc, wc2] = WALLS[(n * 3 + Math.floor(R() * 3)) % WALLS.length];
    const wall = { col: wc, col2: wc2, scale: 0.35, drip: 0.4, seed: R() };
    // the house mass (deep, so the rows read as blocks when the camera rises)
    fb(mass, w - 0.03, H, -12, 0, zc, H / 2, wall);
    // houses are not flush in the old quarter: a thin pier between neighbours
    fb(kb, 0.18, H, 0, 0.12, zb + 0.09, H / 2, { col: wc, col2: wc2, scale: 0.6, drip: 0.5, seed: R() });

    // ---- ground floor: a shop front, open and warm, or shut behind a roller shutter / folding gate
    const ow = w - 0.7;
    const open = force.open ?? (R() < 0.42);
    if (open) {
      fb(kb, ow, gh - 0.5, -0.02, 0.02, zc, (gh - 0.5) / 2, { col: '#5a3a28', col2: WARM[n % 3], emit: 0.3, scale: 0.8, seed: R(), flat: 1 });
      // goods and shelves inside, dark against the light
      for (let k = 0; k < 7; k++) fb(kb, 0.15 + R() * 0.35, 0.12 + R() * 0.4, 0.03, 0.06, zc + (R() - 0.5) * ow * 0.85, 0.25 + R() * 1.9, { col: ['#6a4a34', '#7a4a30', '#5a4438', '#8a6a44'][k % 4], col2: ['#b88a5a', '#c8905a', '#a88a70', '#d8b070'][k % 4], emit: 0.12, scale: 1.5, seed: R(), flat: 1 });
      // a bare bulb on its wire just inside
      fb(kb, 0.1, 0.12, 0.2, 0.3, zc + (R() - 0.5) * ow * 0.4, gh - 0.85, { col: '#e0a060', col2: '#f8d8a0', emit: 0.8, scale: 3, seed: R() });
    } else if (force.roller ?? (R() < 0.6)) {
      // roller shutter: grey corrugated steel, horizontal ribs
      fb(kb, ow, gh - 0.5, -0.02, 0.03, zc, (gh - 0.5) / 2, { col: '#4c5058', col2: '#7a8088', scale: 1.2, drip: 0.4, seed: R() });
      for (let k = 0; k < 9; k++) fb(fine, ow, 0.025, 0.03, 0.05, zc, 0.2 + k * 0.26, { col: '#3a3e46', col2: '#5a6068', scale: 3, seed: R() });
      fb(kb, ow + 0.1, 0.3, 0.0, 0.22, zc, gh - 0.4, { col: '#5a5e66', col2: '#7a8088', scale: 1.5, seed: R() });
    } else {
      // folding iron gate over a dark shop, a thin slit of light where it does not close
      fb(kb, ow, gh - 0.5, -0.04, -0.02, zc, (gh - 0.5) / 2, { col: '#2a2426', col2: '#4a3e3a', scale: 1, seed: R(), flat: 1 });
      const nb = Math.floor(ow / 0.13);
      for (let k = 0; k <= nb; k++) fb(fine, 0.02, gh - 0.55, 0.02, 0.04, zc - ow / 2 + k * (ow / nb), (gh - 0.5) / 2, { col: '#2e3236', col2: '#50565c', scale: 3, seed: R() });
      // a little warm light where the gate does not quite close
      if (R() < 0.6) fb(kb, 0.22, gh - 0.9, -0.035, -0.03, zc + ow * 0.3, (gh - 0.7) / 2, { col: '#6a3a20', col2: '#c07040', emit: 0.35, scale: 1, seed: R(), flat: 1 });
    }
    // lintel and an awning (tin or canvas), a painted sign above
    fb(kb, w, 0.36, 0, 0.16, zc, gh - 0.3, { col: wc2, col2: '#86806e', scale: 0.6, seed: R() });
    const awning = R() < 0.65;
    if (awning) fb(kb, w - 0.2, 0.05, 0.1, 0.9, zc, gh - 0.62, { col: ['#5a3a30', '#3a4a52', '#6a5a3a'][n % 3], col2: '#8a7a6a', scale: 1, seed: R() }, [0, 0, out * 0.18]);
    // tháng Chạp: a red lantern hung from the awning's edge (or the lintel) of some houses down the lane
    if (warm && kind !== 'old' && zc < -6 && hash(zc * 0.37 + 5.1) < 0.4) {
      const ld = side > 0 ? (awning ? 0.72 : 0.34) : 0.5;
      const topY = awning ? gh - 0.72 : gh - 0.48;
      const lz = zc + (hash(zc + 2.3) - 0.5) * (w - 1.2);
      const c = V3(X(ld), topY - 0.34, lz);
      const lc = { col: '#8a0e0a', col2: '#ff5a34', emit: 0.9, scale: 2, seed: hash(zc), haze };
      fb(kb, 0.012, 0.16, ld - 0.006, ld + 0.006, lz, topY - 0.08, { col: '#3a2a18', col2: '#6a5030', scale: 3, seed: 0.3, haze });
      kb.add(new THREE.SphereGeometry(0.16, 12, 9), lc, mat(c, [0, 0, 0], [1, 0.85, 1]));
      kb.add(new THREE.CylinderGeometry(0.07, 0.08, 0.04, 10), { col: '#6a4a14', col2: '#d8a840', emit: 0.2, scale: 3, seed: 0.5, haze }, mat(c.clone().add(V3(0, 0.15, 0))));
      kb.add(new THREE.CylinderGeometry(0.08, 0.07, 0.04, 10), { col: '#6a4a14', col2: '#d8a840', emit: 0.2, scale: 3, seed: 0.6, haze }, mat(c.clone().add(V3(0, -0.15, 0))));
      fb(kb, 0.03, 0.18, ld - 0.015, ld + 0.015, lz, c.y - 0.26, { col: '#8a0e0a', col2: '#e04a2a', emit: 0.4, scale: 3, seed: 0.7, haze });
      warm.push({ at: c, kind: 'lantern' });
    }
    if (signs && R() < 0.8) {
      // no two signs alike within 36 m along the lane, on either side (about one view): the same random draw as before,
      // then the next free trade; if every trade is taken nearby, this shop goes without a sign
      let ti = (n + Math.floor(R() * 4)) % SIGN_TEXT.length;
      const taken = (i) => signs.some((q) => q.text === SIGN_TEXT[i] && Math.abs(q.at.z - zc) < 36);
      let tries = 0;
      while (tries < SIGN_TEXT.length && taken(ti)) { ti = (ti + 1) % SIGN_TEXT.length; tries++; }
      if (!taken(ti)) signs.push({ at: V3(X(0.18), gh - 0.3, zc), w: Math.min(w - 0.5, 3.2), h: 0.46, facing: out, text: SIGN_TEXT[ti], col: SIGN_COL[(n * 5 + 1) % SIGN_COL.length], haze });
    }

    // ---- upper floors
    for (let f = 1; f < floors; f++) {
      const y0 = gh + (f - 1) * fh;
      fb(kb, w, 0.2, 0, 0.14, zc, y0 + 0.02, { col: wc2, col2: '#8a8272', scale: 0.6, seed: R() });
      const nOpen = w > 4.1 ? 2 : 1;
      const hasBal = kind !== 'old' && R() < 0.72;
      for (let k = 0; k < nOpen; k++) {
        const oz = nOpen === 1 ? zc : za - (w * (k + 0.5)) / nOpen;
        const ww = nOpen === 1 ? 1.45 : 1.1, wh = hasBal ? 2.2 : 1.6;
        const wy = y0 + (hasBal ? 0.25 : 0.75) + wh / 2;
        const lit = R() < 0.3;
        // the opening: dark, or warm behind a thin curtain
        fb(kb, ww, wh, -0.04, -0.02, oz, wy, lit ? { col: '#6a3a24', col2: WARM[(n + k) % 3], emit: 0.42, scale: 1, seed: R(), flat: 1 } : { col: '#1e1e26', col2: '#2e2c34', scale: 1, seed: R(), flat: 1 });
        if (lit) fb(kb, ww * 0.4, wh * 0.9, -0.01, 0.0, oz - ww * 0.26, wy, { col: '#a06a44', col2: '#e0b080', emit: 0.35, scale: 1.4, seed: R(), flat: 1 });
        const [sc, sc2] = SHUT[Math.floor(R() * SHUT.length)];
        const shut = !lit && R() < 0.6;
        // the family altar seen through an open window: a dim red room, the lamp glowing
        if (warm && !lit && !shut && hash(oz * 1.7 + f * 3.1 + k * 5.3) < 0.3) {
          fb(kb, ww * 0.9, wh * 0.85, -0.03, -0.026, oz, wy, { col: '#2a0806', col2: '#7a2016', emit: 0.28, scale: 1, seed: 0.4, flat: 1 });
          fb(kb, 0.1, 0.12, -0.026, -0.022, oz - ww * 0.2, wy - wh * 0.12, { col: '#c01a0e', col2: '#ff6a40', emit: 1.6, scale: 3, seed: 0.5, flat: 1 });
          warm.push({ at: V3(X(-0.02), wy - wh * 0.12, oz - ww * 0.2), kind: 'altar' });
        }
        if (shut) {
          fb(kb, ww * 0.5, wh, 0.0, 0.05, oz - ww * 0.25, wy, { col: sc, col2: sc2, scale: 1.4, seed: R() });
          fb(kb, ww * 0.5, wh, 0.0, 0.05, oz + ww * 0.25, wy, { col: sc, col2: sc2, scale: 1.4, seed: R() });
          for (let s = 0; s < 6; s++) fb(fine, ww * 0.94, 0.02, 0.05, 0.07, oz, wy - wh / 2 + 0.2 + s * (wh - 0.3) / 5, { col: sc, col2: sc2, scale: 2, seed: R() });
        } else {
          // shutters folded back against the wall
          for (const e of [-1, 1]) fb(kb, ww * 0.45, wh, 0.0, 0.05, oz + e * (ww * 0.5 + ww * 0.24), wy, { col: sc, col2: sc2, scale: 1.4, seed: R() });
        }
        fb(kb, ww + 0.3, 0.12, 0, 0.18, oz, wy + wh / 2 + 0.08, { col: wc2, col2: '#8a8272', scale: 0.6, seed: R() });
        if (!hasBal) fb(kb, ww + 0.2, 0.08, 0, 0.22, oz, wy - wh / 2 - 0.04, { col: wc2, col2: '#8a8272', scale: 0.6, seed: R() });
      }
      if (hasBal) {
        const bw = w - 0.45;
        if (balconies) balconies.push({ at: V3(X(0.4), y0 + 0.3, zc), along: V3(0, 0, side > 0 ? 1 : -1), out: V3(out, 0, 0), w: bw, y: y0 + 0.3, name: `balcony@${X(0.4).toFixed(1)},${(y0 + 0.3).toFixed(1)},${zc.toFixed(1)}` });
        fb(kb, bw, 0.12, 0, 0.82, zc, y0 + 0.24, { col: wc2, col2: '#86806e', scale: 0.6, seed: R() });
        const railC = { col: '#24282c', col2: '#4a5056', scale: 3, seed: R() };
        fb(fine, bw, 0.04, 0.76, 0.8, zc, y0 + 1.25, railC);
        fb(fine, bw, 0.03, 0.76, 0.8, zc, y0 + 0.45, railC);
        const ns = Math.floor(bw / 0.16);
        for (let s = 0; s <= ns; s++) fb(fine, 0.022, 0.8, 0.77, 0.79, zc - bw / 2 + s * (bw / ns), y0 + 0.85, railC);
        // "tiger cage": some families closed the balcony with a grille up to the floor above
        if (R() < 0.35 && f < floors - 1) {
          const cy = y0 + 1.25 + (fh - 1.3) / 2;
          for (let s = 0; s <= Math.floor(bw / 0.3); s++) fb(fine, 0.02, fh - 1.3, 0.8, 0.82, zc - bw / 2 + s * 0.3, cy, railC);
          fb(fine, bw, 0.03, 0.8, 0.82, zc, cy, railC);
          fb(fine, bw, 0.03, 0.8, 0.82, zc, y0 + fh - 0.05, railC);
        }
      }
    }
    // ---- roof: old houses keep a tiled roof sloping to the street; the others a parapet, a tin shed, a water tank
    if (kind === 'old') {
      const s = new THREE.Shape();
      s.moveTo(0, 0); s.lineTo(4.2, 0); s.lineTo(4.2, 1.6); s.lineTo(0, 0);
      const g = new THREE.ExtrudeGeometry(s, { depth: w + 0.1, bevelEnabled: false });
      g.translate(0, 0, -(w + 0.1) / 2);
      // local x runs into the house (away from the street), local z along the street
      const m = new THREE.Matrix4().makeBasis(V3(-out, 0, 0), V3(0, 1, 0), V3(0, 0, 1)).setPosition(X(0.55), H, zc);
      const [rc, rc2] = ROOF[Math.floor(R() * ROOF.length)];
      mass.add(g, { col: rc, col2: rc2, scale: 0.5, drip: 0.3, seed: R(), ...H0 }, m);
      fb(kb, w + 0.1, 0.12, 0.35, 0.65, zc, H + 0.02, { col: '#3a2a24', col2: '#6a4a3e', scale: 1, seed: R() });
      if (tops) tops.push([zb, za, H + 1.2]);
    } else {
      fb(mass, w, 0.8, -0.02, 0.2, zc, H + 0.4, { ...wall, drip: 0.5 });
      if (R() < 0.7) mass.box(1.8, 2.0, w * 0.8, V3(X(-2.6), H + 1.0, zc), { col: '#5a5e62', col2: '#8a8e90', scale: 0.6, seed: R(), ...H0 });
      if (R() < 0.5) {
        const tz = zc + (R() - 0.5) * w * 0.3;
        mass.box(1.0, 0.5, 0.9, V3(X(-1.2), H + 0.25, tz), { col: '#4a4a50', col2: '#6a6a70', scale: 1, seed: R(), ...H0 });
        mass.add(new THREE.CylinderGeometry(0.42, 0.42, 1.2, 14), { col: '#6a7078', col2: '#9aa0a8', scale: 1, seed: R(), ...H0 }, mat(V3(X(-1.2), H + 0.92, tz), [0, 0, Math.PI / 2]));
      }
      if (tops) tops.push([zb, za, H + 0.8]);
    }
    houses.push({ za, zb, zc, w, H, kind, open, gh, awning });
    if (warm && open) warm.push({ at: V3(X(0.3), gh - 1.0, zc), kind: 'shop' });
    z = zb;
    n++;
  }
  return houses;
}

// ---------------------------------------------------------------- the signs: one canvas sheet, one draw call
// sign: { at: V3 (centre, on the front), w, h, facing: +1 (+x) / -1 (-x), text, col: [board, letters], haze }
export async function signSheet(signs, U, slice = null) {
  const cols = 4, rows = Math.ceil(signs.length / cols);
  const CWd = 512, CHt = 96;
  const c = document.createElement('canvas');
  c.width = cols * CWd; c.height = rows * CHt;
  const g = c.getContext('2d');
  for (const [i, s] of signs.entries()) {
    if (slice) await slice('sign');
    const x0 = (i % cols) * CWd, y0 = Math.floor(i / cols) * CHt;
    g.fillStyle = s.col[0]; g.fillRect(x0, y0, CWd, CHt);
    g.strokeStyle = s.col[1]; g.lineWidth = 5; g.strokeRect(x0 + 8, y0 + 8, CWd - 16, CHt - 16);
    g.fillStyle = s.col[1]; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    let fs = 54;
    g.font = `800 ${fs}px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif`;
    const tw = g.measureText(s.text).width;
    const maxW = CWd * 0.84 * Math.min(1, (s.w / s.h) / (CWd / CHt));
    const sx = Math.min(1, maxW / tw);
    g.save(); g.translate(x0 + CWd / 2, y0 + CHt / 2 + fs * 0.36); g.scale(sx, 1); g.fillText(s.text, 0, 0); g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const P = [], UV = [], HZ = [], I = [];
  signs.forEach((s, i) => {
    const u0 = (i % cols) / cols, u1 = u0 + 1 / cols;
    const v1 = 1 - Math.floor(i / cols) / rows, v0 = v1 - 1 / rows;
    // the board's along-street direction as the viewer on the street sees it (left to right)
    const along = V3(0, 0, s.facing > 0 ? -1 : 1);
    const b = P.length / 3;
    for (const [a, h, uu, vv] of [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, 1, u0, v1]]) {
      const p = s.at.clone().addScaledVector(along, (a * s.w) / 2).add(V3(0, (h * s.h) / 2, 0));
      P.push(p.x, p.y, p.z); UV.push(uu, vv); HZ.push(s.haze ?? 0.14);
    }
    I.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  geo.setAttribute('aHaze', new THREE.Float32BufferAttribute(HZ, 1));
  geo.setIndex(I);
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...U, tText: { value: tex } },
    vertexShader: `attribute float aHaze; varying vec2 vUv; varying vec3 vWP; varying float vHz; void main(){ vUv = uv; vHz = aHaze; vec4 w = modelMatrix * vec4(position, 1.); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tBrush, tText, tWash; uniform vec3 uAir, uKShade, uKLit; uniform float uAirNear, uAirFar, uAirMax;
      varying vec2 vUv; varying vec3 vWP; varying float vHz;
      float band(float x, float t){ float w = max(fwidth(x), 1e-4) * 0.75; return smoothstep(t - w, t + w, x); }
      void main(){
        vec4 b = texture2D(tBrush, vWP.zy * vec2(0.9, 2.4) + vWP.x * 0.3);
        vec4 b2 = texture2D(tBrush, vWP.yz * vec2(1.6, 0.5) + 0.37);
        vec3 c = texture2D(tText, vUv + (b.rg - 0.5) * 0.002).rgb;
        // old painted boards: the paint laid in horizontal strokes, chalky and flaked
        c *= 0.86 + 0.24 * b.b;
        float flake = band(texture2D(tWash, vWP.zy * vec2(0.3, 0.6)).r + (b2.a - 0.5) * 0.3, 0.66);
        c = mix(c, c * 0.6 + 0.05, flake * 0.5);
        // at night: only the shop light below reaches them, a dim warm step at the bottom edge
        c *= mix(uKShade * 0.8, vec3(0.5, 0.36, 0.26), 0.3);
        float d = length(cameraPosition - vWP);
        float air = max(vHz * smoothstep(8.0, 40.0, d), uAirMax * pow(smoothstep(uAirNear, uAirFar, d), 1.35));
        c = mix(c, uAir, air);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.frustumCulled = false;
  return mesh;
}

// power lines: sagging runs between poles and across the street, a tangle near the poles
export function wireTangle(poles, R, { xA, xB }) {
  const lines = [];
  const sag = (a, b, s, n = 24) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push(a.clone().lerp(b, t).add(V3(0, -Math.sin(t * Math.PI) * s, 0))); } return pts; };
  for (let k = 0; k < 8; k++) {
    const dy = k * 0.18 + R() * 0.1, dx = (R() - 0.5) * 0.4;
    const pts = [];
    for (let p = 0; p < poles.length - 1; p++) pts.push(...sag(poles[p].clone().add(V3(dx, dy, 0)), poles[p + 1].clone().add(V3(dx, dy + (R() - 0.5) * 0.2, 0)), 0.3 + R() * 0.5).slice(0, -1));
    pts.push(poles[poles.length - 1].clone().add(V3(dx, dy, 0)));
    lines.push({ pts, width: k < 3 ? 1.7 : 1.1, alpha: 0.85 });
  }
  // across the street, into the near fronts, and a few loose coils hanging off the poles
  for (const p of poles) {
    for (let k = 0; k < 3; k++) {
      const a = p.clone().add(V3(0, 0.15 * k, (R() - 0.5) * 0.3)), b = V3(xB - 0.05, 5.4 + R() * 1.6, p.z - 1 - R() * 3);
      lines.push({ pts: sag(a, b, 0.4 + R() * 0.5), width: 1.1, alpha: 0.75 });
    }
    for (let k = 0; k < 2; k++) {
      const a = p.clone().add(V3(0.05, -0.2 - 0.2 * k, 0)), b = V3(xA + 0.05, 4.6 + R() * 1.4, p.z + (R() - 0.5) * 3);
      lines.push({ pts: sag(a, b, 0.25), width: 1.0, alpha: 0.7 });
    }
    const pts = [];
    for (let i = 0; i <= 18; i++) { const t = i / 18; pts.push(p.clone().add(V3(0.12 + 0.12 * Math.cos(t * 12), -0.3 - t * 0.9 + 0.1 * Math.sin(t * 12), 0.12 * Math.sin(t * 12)))); }
    lines.push({ pts, width: 1.2, alpha: 0.8 });
  }
  return lines;
}

// ---------------------------------------------------------------- the riverside: a row of low houses under one long eave
// One storey, a tiled roof sloping to the road, a wide eave over the pavement on two wooden posts, double wooden doors and
// a barred window. Some are open, warm inside; a few carry a painted sign or a red lantern for the last month of the year.
// Returns the houses and fills `porch` with the places where the things and the people of the porch can go.
export async function lowRow(R, kb, mass, fine, o) {
  const { side = 1, xWall, zFrom, zTo, haze = 0.12, signs = null, warm = null, porch = null, slice = null, walls: WL = WALLS, signFrom = 1e9, openZ = null, y0 = 0, messy = false } = o;
  const out = -side;
  const H0 = { haze };
  const X = (d) => xWall + out * d;
  const fb = (b, along, h, dA, dB, zc, yc, opts, rot) => b.box(Math.abs(dB - dA), h, along, V3(X((dA + dB) / 2), yc, zc), { ...H0, ...opts }, rot);
  const hash = (x) => { const v = Math.sin(x * 12.9898 + xWall * 78.233) * 43758.5453; return v - Math.floor(v); };
  const houses = [];
  let z = zFrom, n = 0;
  while (z > zTo + 0.5) {
    if (slice) await slice('low house');
    // the width comes from the house's number, not from the run of random numbers: whatever detail is added inside the
    // loop later, the posts and the bays between them stay where the season placed its stall and its brazier
    let w = 4.2 + hash(n * 7.13 + 0.61) * 2.2;
    if (z - w - zTo < 3) w = z - zTo;
    const za = z, zb = z - w, zc = (za + zb) / 2;
    const gh = messy ? 2.35 + hash(n * 3.31 + 1.7) * 1.7 : 2.65 + R() * 0.35;   // the eaves
    const [wc, wc2] = WL[(n * 3 + Math.floor(R() * 3)) % WL.length];
    const near = zc > -9;
    const wall = { col: wc, col2: wc2, scale: near ? 1.15 : 0.4, drip: near ? 0.18 : 0.35, seed: R() };
    // the house block behind the front, and the low plinth it stands on
    fb(mass, w - 0.04, gh, -9, 0, zc, gh / 2, wall);
    fb(kb, w, 0.14, -0.1, 1.15, zc, 0.07, { col: '#6a6560', col2: '#918c84', scale: 0.8, drip: 0.3, seed: R(), ...H0 });
    // the roof: one long slope from the ridge behind down over the pavement, old tiles
    const rise = 1.5, eave = 1.3;
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.lineTo(6.6, rise + 0.1); sh.lineTo(6.6, rise + 0.32); sh.lineTo(0, 0.22);
    const rg = new THREE.ExtrudeGeometry(sh, { depth: w + 0.12, bevelEnabled: false });
    rg.translate(0, 0, -(w + 0.12) / 2);
    const tin = messy && hash(n * 5.9 + 0.3) < 0.5;
    const [rc, rc2] = tin ? ['#33383c', '#5e6a70'] : ROOF[Math.floor(R() * ROOF.length)];
    mass.add(rg, { col: rc, col2: rc2, scale: tin ? 2.4 : 0.6, drip: 0.3, seed: R(), ...H0 }, new THREE.Matrix4().makeBasis(V3(-out, 0, 0), V3(0, 1, 0), V3(0, 0, 1)).setPosition(X(eave), gh - 0.35 + y0, zc));
    if (tin) {
      // the ribs of the sheet, and the bricks they weigh it down with
      for (let k = 0; k < 7; k++) fb(kb, 0.06, 0.05, -0.1 + k * 0.9, -0.04 + k * 0.9, zc, gh - 0.3 + (k * 0.9 + 0.5) * 0.24, { col: '#3e444a', col2: '#78848c', scale: 3, seed: R(), ...H0 }, [0, 0, 0.23]);
      for (let k = 0; k < 3; k++) {
        const bz2 = zc + (hash(zc + k * 2.7) - 0.5) * (w - 1.2);
        fb(kb, 0.3, 0.12, 0.6 + k * 1.4, 0.9 + k * 1.4, bz2, gh - 0.24 + (0.75 + k * 1.4) * 0.24, { col: '#4a3428', col2: '#7a5a44', scale: 2, seed: R(), ...H0 }, [0, 0, 0.23]);
      }
    }
    // a room added on top of some of them, its window looking over the river
    if (messy && hash(n * 2.13 + 4.9) < 0.4) {
      const uh = 1.5 + hash(zc * 0.7) * 0.9, uw = w - 0.6 - hash(zc) * 1.2;
      fb(mass, uw, uh, -8, -0.1, zc + (hash(zc + 3) - 0.5) * 0.6, gh + 0.35 + uh / 2, { col: wc2, col2: '#8a8070', scale: 1.4, drip: 0.3, seed: R(), ...H0 });
      fb(kb, uw + 0.2, 0.16, -0.2, 0.18, zc, gh + 0.45 + uh, { col: '#33383c', col2: '#5e6a70', scale: 2.4, seed: R(), ...H0 });
      const wz2 = zc + (hash(zc + 7.1) - 0.5) * (uw - 0.9);
      fb(kb, 0.62, 0.62, -0.14, -0.11, wz2, gh + 0.6 + uh * 0.5, hash(zc * 1.9) < 0.55
        ? { col: '#8a5a22', col2: '#ffd090', emit: 0.55, scale: 3, seed: R(), flat: 1 }
        : { col: '#1a1a20', col2: '#2a2a32', scale: 1, seed: R(), flat: 1 });
    }
    fb(kb, w + 0.12, 0.1, eave - 0.06, eave + 0.06, zc, gh - 0.3, { col: '#3a2c26', col2: '#6a5044', scale: 1.2, seed: R(), ...H0 });
    // the two posts that carry the eave
    const posts = [zc - (w / 2 - 0.55), zc + (w / 2 - 0.55)];
    for (const pz of posts) fb(kb, 0.13, gh - 0.34, eave - 0.14, eave - 0.01, pz, (gh - 0.34) / 2, { col: '#4a3a28', col2: '#8a6a44', scale: 1.4, seed: R(), ...H0 });
    // the bamboo blind rolled up under the eave; on the houses the eye stands next to, one is let halfway down
    // against the river wind, and its slats break up what would be a bare wall in the corner of the frame
    const bam = { col: '#3a2c16', col2: '#7a6034', scale: 5, seed: R(), ...H0 };
    fb(kb, w - 0.34, 0.15, eave - 0.24, eave - 0.06, zc, gh - 0.46, bam);
    if (zc < -2 && zc > -26 && hash(zc * 1.3 + 0.9) < 0.6) {
      const drop = 0.7 + hash(zc + 2.2) * 0.35;
      for (let k = 0; k < 11; k++) {
        const sy = gh - 0.56 - k * (drop / 11);
        fb(fine, w - 0.4, drop / 11 * 0.72, eave - 0.19, eave - 0.155, zc, sy, { col: '#33260f', col2: '#6e5628', scale: 6, seed: R(), ...H0 });
      }
      fb(kb, w - 0.4, 0.05, eave - 0.2, eave - 0.15, zc, gh - 0.58 - drop, { col: '#3a2a14', col2: '#8a7038', scale: 6, seed: R(), ...H0 });
    }
    // the front: double wooden doors, a barred window, and sometimes the warm room behind an open leaf
    // the house across from the tea stall keeps its door open: the warm room behind it lights the dark side of the frame
    const open = (openZ && zc <= openZ[0] && zc >= openZ[1]) || R() < 0.4;
    const dW = 1.25, dz = zc + (hash(zc + 1.7) - 0.5) * (w - dW - 1.4);
    fb(kb, dW, 2.05, -0.05, -0.02, dz, 1.03, open ? { col: '#7a4422', col2: '#e8a058', emit: 0.42, scale: 0.9, seed: R(), flat: 1 } : { col: '#1e1a1c', col2: '#2e2628', scale: 1, seed: R(), flat: 1 });
    const leaf = { col: '#3e2c1c', col2: '#7a5636', scale: 1.5, seed: R(), ...H0 };
    fb(kb, dW * (open ? 0.45 : 0.5), 2.05, 0.0, 0.05, dz - dW * 0.25, 1.03, leaf);
    fb(kb, dW * 0.5, 2.05, open ? 0.06 : 0.0, open ? 0.11 : 0.05, dz + dW * (open ? 0.42 : 0.25), 1.03, leaf, open ? [0, 0, 0] : undefined);
    fb(kb, dW + 0.2, 0.12, -0.02, 0.1, dz, 2.15, { col: wc2, col2: '#c8bca4', scale: 0.8, seed: R(), ...H0 });
    if (open) { fb(kb, 0.1, 0.12, -0.04, -0.02, dz + 0.3, 1.9, { col: '#e0a060', col2: '#f8d8a0', emit: 0.8, scale: 3, seed: R(), flat: 1 }); if (warm) warm.push({ at: V3(X(0.1), 1.3 + y0, dz), kind: 'door' }); }
    const wz = dz + (hash(zc + 5.3) < 0.5 ? -1 : 1) * (dW / 2 + 0.75);
    if (Math.abs(wz - zc) < w / 2 - 0.5) {
      fb(kb, 0.95, 0.9, -0.05, -0.02, wz, 1.5, { col: '#1a1a20', col2: '#2a2a32', scale: 1, seed: R(), flat: 1 });
      for (let k = 0; k < 5; k++) fb(fine, 0.02, 0.88, -0.02, 0.0, wz - 0.4 + k * 0.2, 1.5, { col: '#2e2a26', col2: '#5a5048', scale: 3, seed: R(), ...H0 });
      fb(kb, 1.1, 0.1, -0.02, 0.08, wz, 1.99, { col: wc2, col2: '#c8bca4', scale: 0.8, seed: R(), ...H0 });
    }
    if (messy && hash(n * 1.77 + 2.4) < 0.33) {
      const nb = Math.max(4, Math.round(w / 0.36));
      for (let k = 0; k < nb; k++) {
        const bw = w / nb;
        fb(kb, bw * 0.92, gh - 0.5, -0.065, -0.05, zc - w / 2 + (k + 0.5) * bw, (gh - 0.5) / 2 + 0.12, { col: '#3a3026', col2: '#6e5c44', scale: 2.6, drip: 0.5, seed: R(), ...H0 });
      }
    }
    // what age does to a riverside wall: plaster fallen away in patches (the brick warmer underneath), a damp line
    // along the plinth where the river's wet climbs, and a small enamel plate by the door
    const np = 2 + Math.floor(hash(zc * 1.7) * 3);
    for (let k = 0; k < np; k++) {
      const hz = hash(zc + k * 3.7), hy = hash(zc * 2.3 + k * 1.9), hw = hash(zc * 0.7 + k * 5.1);
      const pw = 0.3 + hw * 0.9, ph = 0.25 + hy * 0.7;
      const pz = zc + (hz - 0.5) * (w - pw - 0.3), py = 0.35 + hy * (gh - ph - 0.7);
      if (Math.abs(pz - dz) < (dW + pw) / 2 && py < 2.2) continue;             // not over the doors
      fb(kb, pw, ph, -0.055, -0.045, pz, py, { col: '#4a3226', col2: '#7a5a42', scale: 1.6, drip: 0.5, seed: R(), ...H0 });
    }
    fb(kb, w - 0.1, 0.34, -0.052, -0.045, zc, 0.3, { col: '#2e3236', col2: '#4a4e50', scale: 1.1, drip: 0.8, seed: R(), ...H0 });
    if (hash(zc * 0.9 + 4.4) < 0.45) {
      const nz = dz + dW / 2 + 0.22;
      fb(kb, 0.17, 0.13, -0.06, -0.05, nz, 2.02, { col: '#1e3a6a', col2: '#c8d4e0', scale: 4, seed: R(), flat: 1 });
    }
    // a painted sign under the eave, a red lantern at its edge
    if (signs && zc < signFrom && R() < 0.5) {
      let ti = (n + Math.floor(R() * 4)) % SIGN_TEXT.length;
      const taken = (i) => signs.some((q) => q.text === SIGN_TEXT[i] && Math.abs(q.at.z - zc) < 36);
      let tries = 0;
      while (tries < SIGN_TEXT.length && taken(ti)) { ti = (ti + 1) % SIGN_TEXT.length; tries++; }
      if (!taken(ti)) signs.push({ at: V3(X(0.12), gh - 0.62 + y0, zc), w: Math.min(w - 1.6, 2.2), h: 0.4, facing: out, text: SIGN_TEXT[ti], col: SIGN_COL[(n * 5 + 1) % SIGN_COL.length], haze });
    }
    if (warm && hash(zc * 0.41 + 2.7) < 0.3) {
      const lz = zc + (hash(zc + 9.1) - 0.5) * (w - 1.6);
      const c = V3(X(eave - 0.18), gh - 0.85 + y0, lz);
      const lc = { col: '#8a0e0a', col2: '#ff5a34', emit: 0.9, scale: 2, seed: hash(zc), haze };
      fb(kb, 0.012, 0.2, eave - 0.19, eave - 0.17, lz, gh - 0.55, { col: '#3a2a18', col2: '#6a5030', scale: 3, seed: 0.3, haze });
      kb.add(new THREE.SphereGeometry(0.15, 12, 9), lc, mat(c, [0, 0, 0], [1, 0.85, 1]));
      kb.add(new THREE.CylinderGeometry(0.07, 0.075, 0.035, 10), { col: '#6a4a14', col2: '#d8a840', emit: 0.2, scale: 3, seed: 0.5, haze }, mat(c.clone().add(V3(0, 0.14, 0))));
      fb(kb, 0.03, 0.16, eave - 0.19, eave - 0.16, lz, c.y - 0.24, { col: '#8a0e0a', col2: '#e04a2a', emit: 0.4, scale: 3, seed: 0.7, haze });
      warm.push({ at: c, kind: 'lantern' });
    }
    // where the porch things and the porch people can sit: by the wall, between the posts
    if (porch) {
      porch.push({ at: V3(X(0.62), y0, zc - w / 2 + 0.75), kind: 'A', zc, w, gh, posts, open });
      porch.push({ at: V3(X(0.62), y0, zc + w / 2 - 0.75), kind: 'B', zc, w, gh, posts, open });
    }
    houses.push({ za, zb, zc, w, gh, open, posts });
    z = zb;
    n++;
  }
  return houses;
}
