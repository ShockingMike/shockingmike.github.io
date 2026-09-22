// Chớm world, season Thu: the house row of Nguyễn Du at night (palette knife, core Batch 'knife').
// Old French villas in faded yellow with white trim and tired green louvred shutters, and tube houses between them
// (water tanks on the roofs, iron grilles, balconies). Half the windows are shut against the milk-flower smell;
// the rest glow warm. Ground floors: a few shops still lit, rolled-down shutters, villa gates.
// Built along local x (= world z), fronts facing local +z (= world -x); core.houseRow's turn (Batch.pre) puts it on the street.
import * as THREE from 'three';
import { V3, mat } from '../../core/build.js';

const WALL = [['#c09a52', '#d6b474'], ['#bc9a68', '#d2b48a'], ['#b0a08a', '#c6b8a0'], ['#c2a262', '#d8bc84'], ['#a89e94', '#bcb2a8'], ['#b8925e', '#ceac80']];
const VILLA = [['#c89c4c', '#dcb46a'], ['#c29548', '#d8b068']];
const SHUT = [['#335e50', '#5e8c78'], ['#3c6454', '#6a927e'], ['#2f5a58', '#5a8884']];
const ROOF = ['#6e3e32', '#7a4638', '#643a30'];
// the white trim of the villas, a tone down: under the lamps a bright white cornice would out-shine everything else
const TRIM = '#c2b9a6';
// lit window paint: warm inside, a curtain or a lampshade suggested by a second tone
const LIT = [['#b8783c', '#ffcf8a'], ['#c08048', '#ffd9a0'], ['#a86a3a', '#f4c07a']];

// returns { glows: [V3 local], windows: [{ at: V3 local, lit }] }; o.balconies collects balconies (local), o.solids the fronts' things
export async function villaRow(kb, mass, fine, R, { x0, x1, haze = 0.08, balconies = null, lanes = [], plan = null, slice = null } = {}) {
  const H0 = { haze };
  const out = { glows: [], tanks: [] };
  const pick = (a) => a[Math.floor(R() * a.length)];
  let x = x0, i = 0;
  // the plan, near end first (local x runs from far to near: world z = local x). plan: list of [kind, width] from x0.
  const steps = plan || [];
  let si = 0;
  while (x < x1 - 0.5) {
    let kind, w;
    const planned = si < steps.length;
    if (planned) [kind, w] = steps[si++];
    else { kind = R() < 0.28 ? 'villa' : R() < 0.12 ? 'lane' : 'tube'; w = kind === 'villa' ? 9 + R() * 3 : kind === 'lane' ? 2.2 : 3.4 + R() * 1.5; }
    // a planned piece keeps its width (the lanes are where the season says); a random last house ends at the row's end
    if (planned) w = Math.min(w, x1 - x);
    else if (x1 - (x + w) < 2.6) w = x1 - x;
    if (kind === 'lane') lane(x, w);
    else if (kind === 'villa' || kind === 'villaShut') villa(x, w, kind === 'villaShut');
    else tube(x, w, kind === 'shop', kind === 'shut');
    x += w;
    i++;
    if (slice) await slice('house');
  }
  return out;

  // ---------------------------------------------------------------- a lane (ngõ): a gap, a dark mouth with a far bulb
  function lane(x, w) {
    const cx = x + w / 2;
    mass.box(w, 3.2, 0.3, V3(cx, 1.6, -9), { col: '#4a4450', col2: '#6a6068', scale: 0.35, drip: 0.5, seed: R(), ...H0 });
    // the side walls of the lane (the neighbours' bare flanks)
    for (const s of [0, 1]) mass.box(0.2, 7 + R() * 3, 9, V3(s ? x + w - 0.1 : x + 0.1, 4, -4.5), { col: '#8a8078', col2: '#aca098', scale: 0.35, drip: 0.8, seed: R(), ...H0 });
    kb.box(0.5, 0.5, 0.05, V3(cx, 2.6, -8.8), { col: '#d09050', col2: '#ffd49a', emit: 1.2, scale: 1, seed: R(), flat: 1, ...H0 });
    out.glows.push(V3(cx, 2.6, -8.6));
  }

  // ---------------------------------------------------------------- a tube house
  function tube(x, w, shop, shut = false) {
    const floors = 3 + (R() < 0.45 ? 1 : 0) + (R() < 0.2 ? 1 : 0);
    const fh = 3.3, H = floors * fh;
    const cx = x + w / 2;
    const [wc, wc2] = pick(WALL);
    const wall = { col: wc, col2: wc2, scale: 0.35, drip: 0.42, seed: R(), ...H0 };
    mass.box(w - 0.03, H, 12, V3(cx, H / 2, -6), wall);
    // ground floor: a lit shop, or a rolled-down shutter (most shops close early on this street)
    const ow = w - 0.8;
    const lit = shop || (!shut && R() < 0.3);
    if (lit) {
      // a narrow lit doorway in a half-rolled shutter: warm inside, shelves and a counter as dark dabs
      const dw = Math.min(ow, 1.9), dx = cx + (ow - dw) * 0.3;
      kb.box(ow, 2.6, 0.05, V3(cx, 1.35, -0.02), { col: '#4e545c', col2: '#7a8088', scale: 1.2, drip: 0.3, seed: R(), ...H0 });
      kb.box(dw, 2.1, 0.05, V3(dx, 1.08, 0.03), { col: '#7a4a2a', col2: '#e0a060', emit: 0.5, scale: 0.8, seed: R(), flat: 1, ...H0 });
      for (const sy of [0.9, 1.45]) kb.box(dw * 0.9, 0.05, 0.05, V3(dx, sy, 0.06), { col: '#3a2820', col2: '#7a5438', scale: 2, seed: R(), flat: 1, ...H0 });
      for (let k = 0; k < 6; k++) kb.box(0.1 + R() * 0.14, 0.12 + R() * 0.14, 0.04, V3(dx - dw * 0.4 + R() * dw * 0.8, [0.98, 1.53][k % 2] + 0.06, 0.08), { col: pick(['#5a3226', '#34404e', '#6a5a32', '#4a3240']), col2: '#b08050', scale: 2, seed: R(), flat: 1, ...H0 });
      kb.box(dw * 0.55, 0.75, 0.12, V3(dx + dw * 0.18, 0.38, 0.12), { col: '#2e221c', col2: '#6a4a36', scale: 1.5, seed: R(), ...H0 });
      // the rolled shutter over the door
      kb.box(ow, 0.5, 0.12, V3(cx, 2.4, 0.08), { col: '#4a5058', col2: '#737a82', scale: 1.4, seed: R(), ...H0 });
      out.glows.push(V3(dx, 1.2, 0.5));
    } else {
      // a rolling shutter: grey steel, strokes across
      kb.box(ow, 2.6, 0.05, V3(cx, 1.35, 0.02), { col: '#50565e', col2: '#666c74', scale: 1.0, drip: 0, seed: R(), ...H0 });
      for (let k = 0; k < 12; k++) fine.box(ow, 0.018, 0.02, V3(cx, 0.2 + k * 0.21, 0.06), { col: '#3c4249', col2: '#555b62', scale: 3, seed: R(), ...H0 });
    }
    // a thin awning over the shop
    // an old awning: dark canvas or tin, so the lamps never turn it into the brightest thing on the street
    kb.box(w, 0.1, 0.9, V3(cx, 2.85, 0.45), { col: pick(['#332b26', '#2c3634', '#3c2420']), col2: '#6a5b50', scale: 0.8, seed: R(), ...H0 }, [0.12, 0, 0]);
    for (let f = 1; f < floors; f++) {
      const y0 = f * fh;
      kb.box(w, 0.2, 0.3, V3(cx, y0, 0.12), { col: wc2, col2: TRIM, scale: 0.6, seed: R(), ...H0 });
      const nOpen = w > 4.3 ? 2 : 1;
      for (let k = 0; k < nOpen; k++) {
        const ox = nOpen === 1 ? cx : x + (w * (k + 0.5)) / nOpen;
        const ww = nOpen === 1 ? 1.5 : 1.2, wh = 2.1;
        window_(ox, y0 + 0.4, ww, wh, R() < 0.45);
      }
      if (R() < 0.7) {
        if (balconies) balconies.push({ at: V3(cx, y0 + 0.34, 0.4), w: w - 0.5, y: y0 + 0.34 });
        kb.box(w - 0.5, 0.12, 0.8, V3(cx, y0 + 0.28, 0.4), { col: wc2, col2: TRIM, scale: 0.6, seed: R(), ...H0 });
        rail(x + 0.25, x + w - 0.25, y0 + 0.34, 0.78);
      } else {
        // an iron grille cage in front of the window instead
        for (let s = 0; s < 6; s++) fine.box(0.02, 2.2, 0.02, V3(cx - 0.75 + s * 0.3, y0 + 1.45, 0.35), { col: '#262a30', col2: '#4a5058', scale: 3, seed: R(), ...H0 });
        fine.box(1.7, 0.03, 0.35, V3(cx, y0 + 2.55, 0.18), { col: '#262a30', col2: '#4a5058', scale: 3, seed: R(), ...H0 });
      }
    }
    // the parapet and the stainless water tank on the roof (every Hanoi roof has one)
    mass.box(w, 0.9, 0.22, V3(cx, H + 0.45, 0.08), { col: wc, col2: wc2, scale: 0.35, drip: 0.5, seed: R(), ...H0 });
    if (R() < 0.8) {
      const tx = cx + (R() - 0.5) * (w - 1.6), tz = -1.8 - R() * 3;
      const horiz = R() < 0.5;
      kb.push(() => new THREE.CylinderGeometry(0.55, 0.55, 1.5, 16), true, { col: '#7a8490', col2: '#c8d0d8', scale: 1.2, seed: R(), ...H0 }, mat(V3(tx, H + 0.2 + (horiz ? 0.75 : 1.0), tz), horiz ? [0, 0, Math.PI / 2] : [0, 0, 0]));
      for (const s of [-0.4, 0.4]) kb.box(0.08, 0.6, 0.9, V3(tx + s, H + 0.3, tz), { col: '#4a4a50', col2: '#6a6a70', scale: 2, seed: R(), ...H0 });
      out.tanks.push(V3(tx, H + 1, tz));
    }
    // a roof shed or a laundry cage on some
    if (R() < 0.4) mass.box(2.2, 2.2, 3, V3(cx + (R() - 0.5), H + 1.1, -5), { col: '#8a8484', col2: '#aaa4a0', scale: 0.5, seed: R(), ...H0 });
  }

  // ---------------------------------------------------------------- a French villa: two tall floors, a hipped roof with a dormer
  function villa(x, w, shutBelow = false) {
    const fh = 4.1, floors = 2, H = floors * fh + 0.6;
    const cx = x + w / 2;
    const [wc, wc2] = pick(VILLA);
    const wall = { col: wc, col2: wc2, scale: 0.35, drip: 0.5, seed: R(), ...H0 };
    mass.box(w - 0.05, H, 12, V3(cx, H / 2, -6), wall);
    // plinth, string course, cornice (white trim)
    kb.box(w, 0.7, 0.18, V3(cx, 0.35, 0.09), { col: '#8a8078', col2: '#b0a698', scale: 0.8, drip: 0.4, seed: R(), ...H0 });
    kb.box(w, 0.22, 0.35, V3(cx, fh, 0.16), { col: '#a49c8c', col2: TRIM, scale: 0.6, seed: R(), ...H0 });
    kb.box(w + 0.3, 0.35, 0.6, V3(cx, H - 0.1, 0.25), { col: '#a49c8c', col2: TRIM, scale: 0.6, seed: R(), ...H0 });
    // pilasters at the corners
    for (const s of [-1, 1]) kb.box(0.45, H - 0.4, 0.14, V3(cx + s * (w / 2 - 0.3), (H - 0.4) / 2, 0.08), { col: '#a49c8c', col2: TRIM, scale: 0.5, drip: 0.5, seed: R(), ...H0 });
    // bays: tall arched openings with louvred shutters
    const nb = Math.max(3, Math.round((w - 1.2) / 2.3));
    for (let f = 0; f < floors; f++) {
      const y0 = f * fh + (f === 0 ? 0.75 : 0.35);
      for (let k = 0; k < nb; k++) {
        const ox = x + 0.6 + ((w - 1.2) * (k + 0.5)) / nb;
        const gate = f === 0 && k === Math.floor(nb / 2);
        if (gate) {
          // the villa's door: dark wood, a fanlight that glows
          kb.box(1.6, 3.0, 0.05, V3(ox, 1.5, -0.03), { col: '#3a2a22', col2: '#6a4a36', scale: 1.2, seed: R(), ...H0 });
          kb.push(() => new THREE.CircleGeometry(0.8, 16, 0, Math.PI), true, shutBelow ? { col: '#2e343c', col2: '#4a5058', scale: 1, seed: R(), flat: 1, ...H0 } : { col: '#b07a42', col2: '#ffd494', emit: 0.9, scale: 1, seed: R(), flat: 1, ...H0 }, mat(V3(ox, 3.0, 0.0)));
          if (!shutBelow) out.glows.push(V3(ox, 3.2, 0.5));
          continue;
        }
        window_(ox, y0, 1.25, 2.5, shutBelow ? false : f === 0 ? R() < 0.25 : R() < 0.5, true);
      }
      // the upper floor: a long balcony on consoles with a cast-iron rail
      if (f === 1) {
        if (balconies) balconies.push({ at: V3(cx, fh + 0.34, 0.4), w: w - 1.4, y: fh + 0.34 });
        kb.box(w - 1.2, 0.16, 0.85, V3(cx, fh + 0.26, 0.42), { col: '#a49c8c', col2: TRIM, scale: 0.6, seed: R(), ...H0 });
        for (let k = 0; k <= nb; k++) kb.box(0.14, 0.35, 0.6, V3(x + 0.6 + ((w - 1.2) * k) / nb, fh - 0.05, 0.32), { col: '#9a9282', col2: TRIM, scale: 0.8, seed: R(), ...H0 });
        rail(x + 0.65, x + w - 0.65, fh + 0.34, 0.82, true);
      }
    }
    // hipped roof: a truncated pyramid of dark tiles, a dormer on the street side, two chimneys
    mass.push(() => hipRoof(w + 0.5, 12.6, 3.4, 0.35), true, { col: pick(ROOF), col2: '#a0685a', scale: 0.55, drip: 0.3, seed: R(), ...H0 }, mat(V3(cx, H + 0.05, -6)));
    const dx = cx + (R() - 0.5) * 2;
    mass.box(1.4, 1.5, 1.4, V3(dx, H + 1.4, -1.6), { col: wc, col2: wc2, scale: 0.4, drip: 0.6, seed: R(), ...H0 });
    kb.box(0.8, 0.9, 0.05, V3(dx, H + 1.35, -0.88), !shutBelow && R() < 0.5 ? litPaint() : { col: '#2e343c', col2: '#4a5058', scale: 1, seed: R(), flat: 1, ...H0 });
    mass.push(() => hipRoof(1.7, 1.7, 0.8, 0.2), true, { col: pick(ROOF), col2: '#a0685a', scale: 0.6, seed: R(), ...H0 }, mat(V3(dx, H + 2.15, -1.6)));
    for (const s of [-1, 1]) mass.box(0.5, 2.2, 0.5, V3(cx + s * (w / 2 - 1.6), H + 2.0, -7), { col: '#9a8c80', col2: '#c0b0a0', scale: 0.5, drip: 0.6, seed: R(), ...H0 });
  }

  function litPaint() { const [c, c2] = pick(LIT); return { col: c, col2: c2, emit: 0.75 + R() * 0.35, scale: 1, seed: R(), flat: 1, ...H0 }; }

  // a window: lit (warm, a shutter leaf folded back) or shut (both louvred leaves closed)
  function window_(ox, y0, ww, wh, lit, arch = false) {
    const cy = y0 + wh / 2;
    const [sc, sc2] = pick(SHUT);
    kb.box(ww + 0.24, wh + 0.2, 0.06, V3(ox, cy, 0.03), { col: '#a49c8c', col2: TRIM, scale: 0.8, seed: R(), ...H0 });
    if (arch) kb.push(() => new THREE.CircleGeometry(ww / 2 + 0.12, 14, 0, Math.PI), true, { col: '#a49c8c', col2: TRIM, scale: 0.8, seed: R(), ...H0 }, mat(V3(ox, y0 + wh + 0.08, 0.035)));
    if (lit) {
      kb.box(ww, wh, 0.05, V3(ox, cy, 0.05), litPaint());
      if (arch) kb.push(() => new THREE.CircleGeometry(ww / 2 - 0.04, 12, 0, Math.PI), true, litPaint(), mat(V3(ox, y0 + wh + 0.02, 0.06)));
      // a curtain half drawn, the window bars
      kb.box(ww * 0.42, wh * 0.9, 0.03, V3(ox - ww * 0.28, cy + 0.05, 0.08), { col: pick(['#a86a48', '#b88a5a', '#9a5a4a', '#c8a070']), col2: '#f0c890', emit: 0.35, scale: 1.4, seed: R(), flat: 1, ...H0 });
      for (let s = 1; s < 4; s++) fine.box(0.02, wh, 0.02, V3(ox - ww / 2 + (s * ww) / 4, cy, 0.1), { col: '#2a2a30', col2: '#4a4a50', scale: 3, seed: R(), ...H0 });
      // one leaf folded back against the wall
      kb.box(ww * 0.5, wh, 0.05, V3(ox + ww * 0.25 + 0.35, cy, 0.3), { col: sc, col2: sc2, scale: 1.4, seed: R(), ...H0 }, [0, -1.2, 0]);
      out.glows.push(V3(ox, cy, 0.4));
    } else {
      kb.box(ww, wh, 0.05, V3(ox, cy, 0.05), { col: '#2a2e36', col2: '#40444c', scale: 1, seed: R(), flat: 1, ...H0 });
      for (const s of [-1, 1]) {
        kb.box(ww * 0.49, wh, 0.05, V3(ox + s * ww * 0.25, cy, 0.09), { col: sc, col2: sc2, scale: 1.4, seed: R(), ...H0 });
        // louvres: thin slats, strokes along them
        for (let k = 0; k < 9; k++) fine.box(ww * 0.44, 0.022, 0.025, V3(ox + s * ww * 0.25, y0 + 0.2 + (k * (wh - 0.4)) / 8, 0.125), { col: sc, col2: sc2, scale: 2.2, seed: R(), ...H0 });
      }
    }
  }

  // a balcony rail (cast iron: posts and two bars)
  function rail(a, b, y, d, fancy = false) {
    const col = { col: '#22262c', col2: '#4a525a', scale: 3, seed: R(), ...H0 };
    fine.box(b - a, 0.05, 0.05, V3((a + b) / 2, y + 0.92, d), col);
    fine.box(b - a, 0.03, 0.03, V3((a + b) / 2, y + 0.12, d), col);
    const step = fancy ? 0.14 : 0.18;
    for (let u = a + 0.05; u < b; u += step) fine.box(0.022, 0.8, 0.022, V3(u, y + 0.52, d), col);
    if (fancy) for (let u = a + 0.35; u < b - 0.2; u += 0.7) fine.push(() => new THREE.TorusGeometry(0.14, 0.012, 4, 14), true, col, mat(V3(u, y + 0.55, d)));
  }
}

// a hipped roof: base w x d, height h, ridge inset k (fraction of the shorter side) -> geometry sitting on y = 0
function hipRoof(w, d, h, k) {
  const r = Math.min(w, d) * k;
  const hw = w / 2, hd = d / 2;
  const P = [
    [-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd],
    [-hw + r, h, -hd + r], [hw - r, h, -hd + r], [hw - r, h, hd - r], [-hw + r, h, hd - r],
  ];
  const F = [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7]];
  const pos = [];
  for (const [a, b, c, e] of F) for (const t of [a, c, b, a, e, c]) pos.push(...P[t]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- the street plate "PHỐ NGUYỄN DU": blue enamel, white letters (Be Vietnam Pro draws the marks right)
export function nameplate(U, { top = 'PHỐ', name = 'NGUYỄN DU' } = {}) {
  // drawn at twice the size, with tall letters and generous marks so the tilde and hat on Ễ still read far away
  const c = document.createElement('canvas');
  c.width = 1280; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 1280, 512);
  g.strokeStyle = '#fff'; g.lineWidth = 16; g.strokeRect(28, 28, 1224, 456);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  // The two lines are placed by their INK, measured, not by typed baselines. (21/9: the lower line was set at a fixed
  // baseline, and at 236 px the hat and the tilde stacked on Ễ reached up past the foot of the upper line - the tilde
  // sat on the Ố of PHỐ, on the texture itself.) Inside the frame (its inner edge at 36..476): a margin, the upper
  // line's ink, a gap of at least a tenth of the lower size, the lower line's ink - and the lower line gets smaller only
  // if both cannot otherwise fit.
  const FONT = (px) => `800 ${px}px "Be Vietnam Pro", "Segoe UI", Arial, sans-serif`;
  const ink = (text, px) => { g.font = FONT(px); const m = g.measureText(text); return { up: m.actualBoundingBoxAscent, down: m.actualBoundingBoxDescent, w: m.width }; };
  const IN0 = 36 + 22, IN1 = 476 - 22;
  const topPx = 104;
  const a = ink(top, topPx);
  let namePx = 236, b = ink(name, namePx);
  const need = (bb, px) => a.up + a.down + Math.max(24, px * 0.1) + bb.up + bb.down;
  while (namePx > 120 && need(b, namePx) > IN1 - IN0) { namePx -= 4; b = ink(name, namePx); }
  const y0 = IN0 + ((IN1 - IN0) - need(b, namePx)) / 2;         // centred in the frame
  const base1 = y0 + a.up;
  const base2 = base1 + a.down + Math.max(24, namePx * 0.1) + b.up;
  g.font = FONT(topPx);
  g.fillText(top, 640, base1);
  g.font = FONT(namePx);
  g.save(); g.translate(640, base2); g.scale(Math.min(1, 1140 / b.w), 1); g.fillText(name, 0, 0); g.restore();
  c.userData = { topPx, namePx, base1: Math.round(base1), base2: Math.round(base2), gap: Math.round(base2 - b.up - (base1 + a.down)) };
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  const m = new THREE.ShaderMaterial({
    uniforms: { ...U, tText: { value: tex } },
    vertexShader: `varying vec2 vUv; varying vec3 vWP; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vWP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tBrush, tText, tWash; uniform vec3 uAir, uKShade, uKLit, uBulbCol[6]; uniform vec4 uBulb[6];
      uniform float uAirNear, uAirFar, uAirMax;
      varying vec2 vUv; varying vec3 vWP;
      float band(float x, float t){ float w = max(fwidth(x), 1e-4) * 0.75; return smoothstep(t - w, t + w, x); }
      void main(){
        vec4 b = texture2D(tBrush, vUv * vec2(1.3, 0.5) + 0.43);
        vec4 b2 = texture2D(tBrush, vUv.yx * vec2(0.8, 2.2) + 0.17);
        float ink = texture2D(tText, vUv).r;
        vec3 enamel = mix(vec3(0.05, 0.16, 0.38), vec3(0.12, 0.3, 0.54), band(b.b + (b2.a - 0.5) * 0.3, 0.5));
        float fade = band(texture2D(tWash, vUv * vec2(0.35, 0.15) + 0.62).r + (b.a - 0.5) * 0.3, 0.62);
        enamel = mix(enamel, vec3(0.28, 0.4, 0.56), fade * 0.5);
        vec3 paint = mix(vec3(0.88, 0.88, 0.84), vec3(0.98, 0.97, 0.93), band(b2.b, 0.5));
        vec3 col = mix(enamel, paint, ink);
        float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        if (edge + (b.a - 0.5) * 0.02 < 0.0) discard;
        // at night: the nearby lamp and the shop light pick it out of the dark
        float e = 0.0;
        for (int i = 0; i < 6; i++) { float d = length(uBulb[i].xyz - vWP); float a = clamp(1.0 - d / uBulb[i].w, 0.0, 1.0); e += a * a * max(uBulbCol[i].r, 0.0); }
        col *= mix(uKShade * 1.6 + 0.05, uKLit * 0.8, clamp(e * 2.5, 0.0, 1.0));
        float air = smoothstep(uAirNear, uAirFar, length(cameraPosition - vWP)) * uAirMax;
        col = mix(col, uAir, air * 0.55);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.52), m);
}
