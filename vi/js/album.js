/* album.js — the label's house sleeve, drawn with canvas. One frame for all six records (like ECM or Blue Note):
   a top band with the catalogue number and the label mark, a picture window, the title stamped below.
   Print techniques instead of screenshots: halftone screens (duotone or CMYK), foil (a mask the 3D material turns
   into metal with a thin-film colour shift), blind emboss (a bump map), paper fibre, ring wear and worn edges.
   Everything is drawn once at boot; nothing here runs during motion. */

import { PAL, paperBump, backPaper, soonLabel } from './covers.js';

const SANS = 'Archivo';
const MONO = '"JetBrains Mono"';
const SERIF = 'Newsreader';

export const FRAME = { mx: 0.07, winTop: 0.13, winBot: 0.725, titleY: 0.855, subY: 0.915 };

function make(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, ctx: c.getContext('2d') };
}
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function font(ctx, weight, px, family = SANS, stretch = 'normal', spacing = 0) {
  ctx.font = `${weight} ${px}px ${family}`;
  try { ctx.fontStretch = stretch; } catch { /* older engines */ }
  try { ctx.letterSpacing = `${spacing}px`; } catch { /* ignore */ }
}
function grain(ctx, w, h, amount, seed) {
  const r = rng(seed);
  const n = Math.floor(w * h * 0.02);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h;
    ctx.fillStyle = r() > 0.5 ? `rgba(255,255,255,${amount * r()})` : `rgba(0,0,0,${amount * r()})`;
    ctx.fillRect(x, y, 1 + r() * 1.8, 1);
  }
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/* ---------- print screens ---------- */

/** Average colour of the source over a grid; returns Float32 rgb in 0..1 per cell. */
function sampleGrid(img, cols, rows) {
  const { c, ctx } = make(cols, rows);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, cols, rows);
  return ctx.getImageData(0, 0, cols, rows).data;
}

/** One halftone screen: dots on a grid rotated by `angle`, radius from `value(r,g,b)` in 0..1 (1 = full dot). */
function screen(ctx, img, x0, y0, w, h, { cell, angle, color, value, gamma = 1, maxR = 0.62, op = 'source-over' }) {
  const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
  const data = sampleGrid(img, cols, rows);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  ctx.beginPath();
  ctx.globalCompositeOperation = op;
  ctx.fillStyle = color;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const cx = x0 + w / 2, cy = y0 + h / 2;
  const diag = Math.hypot(w, h);
  const n = Math.ceil(diag / cell) + 2;
  for (let j = -n; j <= n; j++) {
    for (let i = -n; i <= n; i++) {
      // grid point in rotated space -> canvas
      const gx = i * cell, gy = j * cell;
      const px = cx + gx * ca - gy * sa, py = cy + gx * sa + gy * ca;
      if (px < x0 - cell || px > x0 + w + cell || py < y0 - cell || py > y0 + h + cell) continue;
      const sx = Math.min(cols - 1, Math.max(0, Math.floor((px - x0) / w * cols)));
      const sy = Math.min(rows - 1, Math.max(0, Math.floor((py - y0) / h * rows)));
      const k = (sy * cols + sx) * 4;
      let v = value(data[k] / 255, data[k + 1] / 255, data[k + 2] / 255);
      if (v <= 0.02) continue;
      v = Math.pow(Math.min(1, v), gamma);
      const r = cell * maxR * Math.sqrt(v);
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
}

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Duotone: a dark ink at 45°, a lighter second ink at 15° carrying the mid-tones. */
export function duotone(ctx, img, x0, y0, w, h, { ink, ink2, cell = 5.2, lift = 0.72 }) {
  const L = (r, g, b) => Math.pow(lum(r, g, b), lift);
  screen(ctx, img, x0, y0, w, h, { cell, angle: 15 * Math.PI / 180, color: ink2, value: (r, g, b) => 0.9 - L(r, g, b) * 0.9, gamma: 0.85, maxR: 0.56 });
  screen(ctx, img, x0, y0, w, h, { cell, angle: 45 * Math.PI / 180, color: ink, value: (r, g, b) => Math.max(0, 0.95 - L(r, g, b) * 1.45), gamma: 1.05, maxR: 0.62 });
}

/** Four-colour process: C 15°, M 75°, Y 0°, K 45°, multiplied on the paper like offset print. */
export function cmyk(ctx, img, x0, y0, w, h, { cell = 4.8 } = {}) {
  const key = (r, g, b) => 1 - Math.max(r, g, b);
  const ch = (v) => (r, g, b) => { const k = key(r, g, b); return k >= 0.98 ? 0 : (1 - v(r, g, b) - k) / (1 - k); };
  const inks = [
    { angle: 15, color: 'rgb(0,160,227)', value: ch((r) => r) },
    { angle: 75, color: 'rgb(226,0,122)', value: ch((r, g) => g) },
    { angle: 0, color: 'rgb(255,222,0)', value: ch((r, g, b) => b) },
    { angle: 45, color: 'rgb(20,18,22)', value: key }
  ];
  for (const ink of inks) screen(ctx, img, x0, y0, w, h, { cell, angle: ink.angle * Math.PI / 180, color: ink.color, value: ink.value, gamma: 0.95, maxR: 0.58, op: 'multiply' });
}

/* ---------- the house frame ---------- */

/** Label mark: two rings and a dot (a record seen from above). */
function mark(ctx, x, y, r, color, lineW) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lineW;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Paper with the wear of a used sleeve: fibre, a ring worn by the disc inside, lighter rubbed edges and corners. */
function paperGround(ctx, S, paper, seed, { worn = true } = {}) {
  ctx.fillStyle = paper; ctx.fillRect(0, 0, S, S);
  grain(ctx, S, S, 0.055, seed);
  if (!worn) return;
  // ring wear: the disc's rim pressed through the board
  const cx = S * 0.5, cy = S * 0.5, R = S * 0.472;
  const g = ctx.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.03);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.13)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  const g2 = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 0.97);
  g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.05)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, S, S);
  // rubbed edges and corners
  const e = S * 0.03;
  for (const [x, y, w, h, dir] of [[0, 0, S, e, 'v'], [0, S - e, S, e, 'v-'], [0, 0, e, S, 'h'], [S - e, 0, e, S, 'h-']]) {
    const gr = dir[0] === 'v' ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0);
    const a0 = dir.endsWith('-') ? 0 : 0.09, a1 = dir.endsWith('-') ? 0.09 : 0;
    gr.addColorStop(0, `rgba(255,255,255,${a0})`); gr.addColorStop(1, `rgba(255,255,255,${a1})`);
    ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
  }
  const r = rng(seed + 5);
  for (let i = 0; i < 40; i++) { // a few scuffs near the edges
    const x = r() * S, y = r() < 0.5 ? r() * S * 0.06 : S - r() * S * 0.06;
    ctx.fillStyle = `rgba(255,255,255,${0.08 + r() * 0.1})`;
    ctx.fillRect(x, y, 2 + r() * 14, 1);
  }
}

/** Top band + title + small line; `foil` receives the same marks as pure white for the foil mask. */
function frameText(ctx, S, rec, c, foilCtx) {
  const m = FRAME.mx * S;
  ctx.textBaseline = 'alphabetic';
  // top band
  font(ctx, 500, S * 0.02, MONO, 'normal', S * 0.002);
  ctx.fillStyle = c.ink; ctx.textAlign = 'left';
  ctx.fillText(rec.cat, m, S * 0.078);
  font(ctx, 600, S * 0.017, SANS, 'semi-expanded', S * 0.005);
  ctx.textAlign = 'center';
  ctx.fillText('SHOCKING MIKE RECORDS', S / 2, S * 0.078);
  const mr = S * 0.022;
  mark(ctx, S - m - mr, S * 0.07, mr, c.ink, Math.max(1.2, S * 0.0022));
  // hairline under the band, and under the window
  ctx.fillStyle = c.ink; ctx.globalAlpha = 0.45;
  ctx.fillRect(m, S * 0.098, S - 2 * m, Math.max(1, S * 0.0012));
  ctx.globalAlpha = 1;
  // title: foil stamp (drawn in the colour map as a light neutral so the metal reads, and in the mask)
  const drawTitle = (x, weight, colour) => {
    x.fillStyle = colour; x.textAlign = 'left';
    x.font = `${weight} ${S * 0.088}px ${SERIF}`;
    try { x.letterSpacing = `${-S * 0.0025}px`; } catch { /* ignore */ }
    x.fillText(rec.name, m - S * 0.004, FRAME.titleY * S);
  };
  const darkBoard = lum(...hex(c.paper).map((v) => v / 255)) < 0.4;
  drawTitle(ctx, 600, darkBoard ? '#ded6c2' : '#211e1a');
  drawTitle(foilCtx, 600, '#fff');
  // small line: subtitle left, speed right
  ctx.fillStyle = c.ink;
  ctx.font = `italic 400 ${S * 0.03}px ${SERIF}`;
  ctx.textAlign = 'left';
  ctx.fillText(c.sub, m, FRAME.subY * S);
  font(ctx, 500, S * 0.018, MONO, 'normal', S * 0.002);
  ctx.textAlign = 'right';
  ctx.fillText('33⅓ RPM · STEREO', S - m, FRAME.subY * S);
}

/** The picture windows, one per record: every one a screened picture (duotone or CMYK) of the site itself; the
    sealed three a plain field with the smallest sign of what is coming. Foil is never here: only the title carries it. */
const ART = {
  kern(ctx, S, x0, y0, w, h, c, foilCtx, img) {
    // the foundry's own headline, caught mid-variation on the live page, screened in black and blue
    ctx.fillStyle = '#efebe3';
    ctx.fillRect(x0, y0, w, h);
    duotone(ctx, img, x0, y0, w, h, { ink: c.ink, ink2: c.accent, cell: S * 0.0052, lift: 1 });
  },
  rhumb(ctx, S, x0, y0, w, h, c, foilCtx, img) {
    // the cabin: portholes and the oil lamp, a duotone screen in navy and brass
    ctx.fillStyle = c.paper2 || '#e6d9bd';
    ctx.fillRect(x0, y0, w, h);
    duotone(ctx, img, x0, y0, w, h, { ink: c.ink, ink2: c.accent, cell: S * 0.0052 });
  },
  chom(ctx, S, x0, y0, w, h, c, foilCtx, img) {
    // the painted street with its lanterns, a four-colour screen on warm paper
    ctx.fillStyle = '#f2ebe0';
    ctx.fillRect(x0, y0, w, h);
    cmyk(ctx, img, x0, y0, w, h, { cell: S * 0.0056 });
  },
  kozo(ctx, S, x0, y0, w, h, c) {
    // an architect's plan, light ink on a dark field
    ctx.fillStyle = c.field; ctx.fillRect(x0, y0, w, h);
    ctx.save(); ctx.strokeStyle = '#cfcabf'; ctx.fillStyle = '#cfcabf'; ctx.lineWidth = Math.max(1.5, S * 0.004);
    const u = w / 20, ox = x0 + 3 * u, oy = y0 + h * 0.2;
    ctx.strokeRect(ox, oy, 14 * u, h * 0.6);
    ctx.beginPath();
    ctx.moveTo(ox + 6 * u, oy); ctx.lineTo(ox + 6 * u, oy + h * 0.32);
    ctx.moveTo(ox + 6 * u, oy + h * 0.42); ctx.lineTo(ox + 14 * u, oy + h * 0.42);
    ctx.moveTo(ox, oy + h * 0.28); ctx.lineTo(ox + 3.5 * u, oy + h * 0.28);
    ctx.moveTo(ox + 10 * u, oy + h * 0.42); ctx.lineTo(ox + 10 * u, oy + h * 0.6);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(ox + 6 * u, oy + h * 0.42, 1.9 * u, -Math.PI / 2, 0); ctx.stroke();
    ctx.globalAlpha = 0.28; ctx.lineWidth = 1;
    for (let i = 1; i < 20; i++) { const px = x0 + i * u; ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y0 + h); ctx.stroke(); }
    for (let j = 1; j < 14; j++) { const py = y0 + j * (h / 14); ctx.beginPath(); ctx.moveTo(x0, py); ctx.lineTo(x0 + w, py); ctx.stroke(); }
    ctx.restore();
  },
  hadal(ctx, S, x0, y0, w, h) {
    // depth lines going down into the dark; the creatures' own light
    const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
    g.addColorStop(0, '#1b4a5a'); g.addColorStop(0.45, '#0c2530'); g.addColorStop(1, '#04090c');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
    ctx.save();
    ctx.strokeStyle = 'rgba(159,221,227,0.28)'; ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(159,221,227,0.7)'; ctx.textAlign = 'right';
    font(ctx, 500, S * 0.015, MONO);
    ['0 m', '200 m', '1 000 m', '4 000 m', '6 000 m', '10 994 m'].forEach((t, i) => {
      const y = y0 + h * (0.12 + i * 0.16);
      ctx.beginPath(); ctx.moveTo(x0 + w * 0.04, y); ctx.lineTo(x0 + w * 0.8, y); ctx.stroke();
      ctx.fillText(t, x0 + w * 0.96, y + S * 0.005);
    });
    ctx.restore();
    const r = rng(77);
    for (let i = 0; i < 40; i++) {
      const x = x0 + w * (0.08 + r() * 0.7), y = y0 + h * (0.5 + r() * 0.44), rr = S * (0.0025 + r() * 0.006);
      const gl = ctx.createRadialGradient(x, y, 0, x, y, rr * 6);
      gl.addColorStop(0, 'rgba(190,255,245,0.95)'); gl.addColorStop(0.25, 'rgba(120,230,230,0.35)'); gl.addColorStop(1, 'rgba(120,230,230,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, rr * 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e6fffb'; ctx.beginPath(); ctx.arc(x, y, rr * 1.6, 0, Math.PI * 2); ctx.fill();
    }
  },
  perihelion(ctx, S, x0, y0, w, h) {
    // one long orbit, the sun at its near point
    ctx.fillStyle = '#100f14'; ctx.fillRect(x0, y0, w, h);
    const r = rng(131);
    for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(255,248,230,${0.15 + r() * 0.55})`; ctx.fillRect(x0 + r() * w, y0 + r() * h, 1.4, 1.4); }
    ctx.save();
    ctx.strokeStyle = '#e8dcbd'; ctx.fillStyle = '#e8dcbd'; ctx.lineWidth = Math.max(1.5, S * 0.003);
    ctx.beginPath(); ctx.ellipse(x0 + w * 0.52, y0 + h * 0.55, w * 0.4, h * 0.3, -0.3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x0 + w * 0.17, y0 + h * 0.74, S * 0.036, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x0 + w * 0.87, y0 + h * 0.34, S * 0.011, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
};

/**
 * Front of the sleeve. Returns { color, mask, bump }:
 * color — the print; mask — R: foil (iridescence), G: roughness, B: metalness; bump — paper fibre + blind emboss.
 */
export function sleeveFront(S, rec, c, img, opts) {
  const col = make(S), msk = make(S), bmp = make(S);
  const ctx = col.ctx, fctx = msk.ctx;
  paperGround(ctx, S, c.paper, 200 + rec.cat.length + rec.name.length, { worn: !rec.sealed });
  // mask ground: paper = no foil, rough
  fctx.fillStyle = 'rgb(0,215,0)'; fctx.fillRect(0, 0, S, S);
  const m = FRAME.mx * S, x0 = m, y0 = FRAME.winTop * S, w = S - 2 * m, h = (FRAME.winBot - FRAME.winTop) * S;
  // foil marks are drawn white into a temporary layer, then encoded into the mask channels
  const foil = make(S);
  foil.ctx.fillStyle = '#000'; foil.ctx.fillRect(0, 0, S, S);
  ART[rec.id](ctx, S, x0, y0, w, h, c, foil.ctx, img);
  // window edge: a hairline, and a soft inner shadow like a tipped-in print
  ctx.strokeStyle = c.ink; ctx.globalAlpha = 0.4; ctx.lineWidth = Math.max(1, S * 0.0012);
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
  ctx.globalAlpha = 1;
  frameText(ctx, S, rec, c, foil.ctx);
  const fd = foil.ctx.getImageData(0, 0, S, S).data;
  holoFoil(ctx, S, fd, lum(...hex(c.paper).map((v) => v / 255)) < 0.4);
  // a sealed sleeve is seen through frosted film: what is printed here is blurred away to colour and shape
  if (rec.sealed && !(opts && opts.frost === false)) {
    const frosted = frostPrint(col.c, S);
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(frosted, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
  // encode the mask: R = foil (thin-film shift), G = roughness (foil smooth), B = metalness (foil ~0.75)
  const md = fctx.getImageData(0, 0, S, S);
  for (let i = 0; i < fd.length; i += 4) {
    const f = fd[i] / 255;
    md.data[i] = Math.round(f * 255);
    md.data[i + 1] = Math.round(215 - f * 170);
    md.data[i + 2] = Math.round(f * 190);
    md.data[i + 3] = 255;
  }
  fctx.putImageData(md, 0, 0);
  // bump: fibre, plus the title raised (blind emboss) and the window plate very slightly sunk
  const fibre = paperBump(512);
  bmp.ctx.fillStyle = '#767676'; bmp.ctx.fillRect(0, 0, S, S);
  bmp.ctx.globalAlpha = 0.9;
  for (let y = 0; y < S; y += 512) for (let x = 0; x < S; x += 512) bmp.ctx.drawImage(fibre, x, y);
  bmp.ctx.globalAlpha = 1;
  bmp.ctx.fillStyle = 'rgba(0,0,0,0.1)'; bmp.ctx.fillRect(x0, y0, w, h);
  bmp.ctx.fillStyle = 'rgba(255,255,255,0.4)';
  bmp.ctx.textAlign = 'left'; bmp.ctx.textBaseline = 'alphabetic';
  bmp.ctx.font = `600 ${S * 0.088}px ${SERIF}`;
  bmp.ctx.fillText(rec.name, m - S * 0.004, FRAME.titleY * S);
  /* The print is not the only place the words live: the foil stamp is a shine and the title is a relief, each
     read from its own map. On a sealed sleeve those are softened as well — otherwise the name comes back through
     the light, sharp as ever, on a record that is supposed to be sealed. Done last, once both maps are finished. */
  if (rec.sealed && !(opts && opts.frost === false)) {
    blurInto(msk.ctx, msk.c, S, S * 0.022);
    blurInto(bmp.ctx, bmp.c, S, S * 0.022);
  }
  return { color: col.c, mask: msk.c, bump: bmp.c };
}

/** Holographic foil: a pastel diffraction gradient with fine ruled lines, laid only where the foil mask is white.
    The 3D material makes it metal with a thin-film shift; the print underneath keeps it bright from every angle. */
function holoFoil(ctx, S, fd, dark) {
  const holo = make(S);
  const h = holo.ctx;
  // the stamp itself: a dark metal, much darker than the board, so the name reads even with no light on it
  h.fillStyle = dark ? '#ded6c2' : '#211e1a';
  h.fillRect(0, 0, S, S);
  // one narrow sweep of diffracted light across the stamp, and a second, fainter one
  const sweep = (x0, x1, cols) => {
    const g = h.createLinearGradient(x0, S, x1, 0);
    cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c));
    h.fillStyle = g; h.fillRect(0, 0, S, S);
  };
  h.globalCompositeOperation = 'lighter';
  sweep(-S * 0.15, S * 0.75, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(214,176,120,0.4)', 'rgba(255,244,222,0.72)', 'rgba(158,190,224,0.36)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)']);
  sweep(S * 0.4, S * 1.5, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(140,190,170,0.2)', 'rgba(0,0,0,0)']);
  h.globalCompositeOperation = 'source-over';
  // the fine ruling of a foil press, barely there
  h.strokeStyle = 'rgba(255,255,255,0.08)'; h.lineWidth = 1;
  for (let d = -S; d < 2 * S; d += 5) { h.beginPath(); h.moveTo(d, 0); h.lineTo(d + S, S); h.stroke(); }
  const hd = h.getImageData(0, 0, S, S);
  for (let i = 0; i < fd.length; i += 4) hd.data[i + 3] = fd[i];
  h.putImageData(hd, 0, 0);
  ctx.drawImage(holo.c, 0, 0);
}

/** The sealed ones: a round hype sticker on the corner of the window, in this site's own words. */
/** Blurs a canvas into itself. */
function blurInto(ctx, cv, S, px) {
  const tmp = make(S);
  tmp.ctx.drawImage(cv, 0, 0);
  try {
    ctx.save();
    ctx.globalCompositeOperation = 'copy';
    ctx.filter = `blur(${px.toFixed(1)}px)`;
    ctx.drawImage(tmp.c, 0, 0);
    ctx.restore();
    ctx.filter = 'none';
  } catch {
    const small = make(Math.max(8, Math.round(S / 26)));
    small.ctx.drawImage(tmp.c, 0, 0, small.c.width, small.c.height);
    ctx.save();
    ctx.globalCompositeOperation = 'copy';
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small.c, 0, 0, S, S);
    ctx.restore();
  }
}

/** Seen through frosted film: the print is blurred for real, then milked over. The colours and the big shapes
    still read; no word on the sleeve does. The one thing that stays sharp is the sticker, and that is stuck on
    the film itself, not printed here. */
function frostPrint(cover, S) {
  const { c, ctx } = make(S);
  // two passes of a wide blur: one pass alone still leaves letter shapes legible
  try {
    ctx.filter = `blur(${(S * 0.018).toFixed(1)}px)`;
    ctx.drawImage(cover, 0, 0);
    ctx.filter = `blur(${(S * 0.012).toFixed(1)}px)`;
    ctx.drawImage(c, 0, 0);
    ctx.filter = 'none';
  } catch {
    // an engine without canvas filters: spread the picture by drawing it small and back up, twice
    const small = make(Math.round(S / 26));
    small.ctx.drawImage(cover, 0, 0, small.c.width, small.c.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small.c, 0, 0, S, S);
  }
  /* What is left of the print is pulled toward its own average: the shapes stay, the last of the fine contrast
     goes. Pulling toward the print's own average (and not toward a light grey) keeps the sleeve's colour, which
     is the whole point — a hint of colour through the plastic. The milkiness itself comes from the film in the
     scene, not from painting white over the artwork. */
  const d = ctx.getImageData(0, 0, S, S);
  const px = d.data;
  let mr = 0, mg = 0, mb = 0, n = 0;
  for (let i = 0; i < px.length; i += 16) { mr += px[i]; mg += px[i + 1]; mb += px[i + 2]; n += 1; }
  mr /= n; mg /= n; mb /= n;
  const mid = [mr, mg, mb];
  for (let i = 0; i < px.length; i += 4) {
    const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    for (let k = 0; k < 3; k++) {
      let v = px[i + k];
      v = v + (g - v) * 0.1;                   // a little of the colour drains away
      v = mid[k] + (v - mid[k]) * 0.78;        // and much of the contrast, about the print's own average
      px[i + k] = v;
    }
  }
  ctx.putImageData(d, 0, 0);
  // the faint grain of the film itself, so the blur does not read as a smudge
  grain(ctx, S, S, 0.045, 61);
  return c;
}

/** The hype sticker, alone on a clear ground: it is stuck on the film, not printed on the sleeve. */
export function wrapSticker(S, rec) {
  const { c, ctx } = make(S);
  sticker(ctx, S, rec);
  return c;
}

function sticker(ctx, S, rec) {
  const cx = S * 0.5, cy = S * 0.5, r = S * 0.44;
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-8 * Math.PI / 180);
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = S * 0.006; ctx.shadowOffsetY = S * 0.002;
  ctx.fillStyle = '#f4c945';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(20,20,22,0.9)'; ctx.lineWidth = Math.max(1, S * 0.0015);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#141416'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // the hype sticker speaks the language of the site it is printed for; two lines, split at the first space
  const label = soonLabel(rec).toUpperCase();
  const sp = label.indexOf(' ');
  const two = sp > 0 ? [label.slice(0, sp), label.slice(sp + 1)] : [label, ''];
  let size = r * 0.34;
  font(ctx, 800, size, SANS, 'semi-expanded', size * 0.06);
  const wide = Math.max(...two.map((l) => ctx.measureText(l).width));
  if (wide > r * 1.5) {                                   // a longer word is set smaller, never over the edge
    size *= (r * 1.5) / wide;
    font(ctx, 800, size, SANS, 'semi-expanded', size * 0.06);
  }
  ctx.fillText(two[0], 0, -r * 0.2);
  ctx.fillText(two[1], 0, r * 0.2);
  font(ctx, 500, r * 0.17, MONO, 'normal', r * 0.01);
  ctx.fillText(rec.cat, 0, r * 0.56);
  ctx.restore();
}

/** Spine of the sleeve: the title only, set small, read from the side. */
export function sleeveSpine(W, H, rec, c) {
  const { c: cv, ctx } = make(W, H);
  ctx.fillStyle = c.paper; ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.07, 31 + rec.cat.length);
  ctx.fillStyle = c.ink; ctx.textBaseline = 'middle';
  const px = Math.min(H * 0.5, 40);
  font(ctx, 600, px * 0.72, SANS, 'semi-expanded', px * 0.05);
  ctx.textAlign = 'left'; ctx.fillText(rec.name.toUpperCase(), W * 0.04, H * 0.54);
  font(ctx, 500, px * 0.6, MONO);
  ctx.textAlign = 'right'; ctx.fillText(rec.cat, W * 0.965, H * 0.54);
  return cv;
}

/** Plain board edge, lightened and roughened at the corners like a sleeve that has been handled. */
export function sleeveEdge(W, H, paper, seed) {
  const { c, ctx } = make(W, H);
  ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.1, seed);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(0.08, 'rgba(255,255,255,0)'); g.addColorStop(0.92, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.18)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  return c;
}

/** Back: credits printed small, the same paper. */
export function sleeveBack(S, rec, c, en) {
  const cv = backPaper(S, c.paper, c.ink, { seed: 21 + rec.cat.length });
  const ctx = cv.getContext('2d');
  const L = S * 0.085, R = S * 0.915;
  ctx.fillStyle = c.ink; ctx.textBaseline = 'alphabetic';
  font(ctx, 600, S * 0.017, SANS, 'semi-expanded', S * 0.005);
  ctx.textAlign = 'left'; ctx.fillText('SHOCKING MIKE RECORDS', L, S * 0.1);
  font(ctx, 500, S * 0.02, MONO); ctx.textAlign = 'right'; ctx.fillText(rec.cat, R, S * 0.1);
  ctx.textAlign = 'left';
  ctx.font = `600 ${S * 0.08}px ${SERIF}`;
  ctx.fillText(rec.name, L, S * 0.21);
  ctx.font = `italic 400 ${S * 0.036}px ${SERIF}`;
  ctx.fillText(en.sub, L, S * 0.265);
  ctx.font = `400 ${S * 0.03}px ${SERIF}`;
  const words = en.story.split(/\s+/); const lines = []; let line = '';
  for (const wd of words) { const cand = line ? `${line} ${wd}` : wd; if (ctx.measureText(cand).width > (R - L) * 0.86 && line) { lines.push(line); line = wd; } else line = cand; }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, L, S * 0.34 + i * S * 0.042));
  const rows = [['ROLE', en.role], ['BUILT WITH', en.tech], ['YEAR', en.year], ['STATUS', en.status]].filter(([, v]) => v);
  rows.forEach(([k, v], i) => {
    const y = S * (0.64 + i * 0.05);
    ctx.globalAlpha = 0.35; ctx.fillRect(L, y - S * 0.032, R - L, 1); ctx.globalAlpha = 1;
    font(ctx, 700, S * 0.018, SANS, 'semi-expanded', S * 0.004);
    ctx.fillText(k, L, y);
    ctx.font = `400 ${S * 0.026}px ${SERIF}`;
    ctx.fillText(v, L + S * 0.2, y);
  });
  mark(ctx, S * 0.13, S * 0.905, S * 0.024, c.ink, Math.max(1, S * 0.002));
  font(ctx, 500, S * 0.02, SANS, 'normal', S * 0.001);
  ctx.fillText('Designed & built by Shocking Mike', L + S * 0.1, S * 0.912);
  return cv;
}

/** The record's own label, one formula for all six: a ring of small caps around the top, the name across the
    middle, the catalogue number and the speed below. Painted over a disc map that was drawn with a blank label. */
export function houseLabel(disc, { labelR = 0.34, label, labelInk, name, cat }) {
  const ctx = disc.getContext('2d');
  const S = disc.width, cx = S / 2, R = S / 2, lr = labelR * R;
  ctx.save();
  ctx.fillStyle = label;
  ctx.beginPath(); ctx.arc(cx, cx, lr, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cx, lr, 0, Math.PI * 2); ctx.clip();
  grain(ctx, S, S, 0.05, 3);
  ctx.restore();
  ctx.save();
  ctx.fillStyle = labelInk;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  // the ring of small caps, set around the top of the label
  const ring = 'SHOCKING MIKE RECORDS';
  const rr = lr * 0.84;
  font(ctx, 600, lr * 0.115, SANS, 'semi-expanded', 0);
  const per = (lr * 0.115) * 0.92 / rr; // radians per character, roughly
  const start = -Math.PI / 2 - (ring.length - 1) * per / 2;
  ring.split('').forEach((ch, i) => {
    const a = start + i * per;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  // the name, across the middle; long names step down a size so they never touch the rim
  let px = lr * 0.30;
  ctx.font = `600 ${px}px ${SERIF}`;
  while (ctx.measureText(name).width > lr * 1.5 && px > lr * 0.16) { px -= lr * 0.012; ctx.font = `600 ${px}px ${SERIF}`; }
  ctx.fillText(name, cx, cx + px * 0.34);
  // a hairline, then the catalogue number and the speed
  ctx.globalAlpha = 0.45;
  ctx.fillRect(cx - lr * 0.42, cx + lr * 0.42, lr * 0.84, Math.max(1, S * 0.0012));
  ctx.globalAlpha = 1;
  font(ctx, 500, lr * 0.115, MONO, 'normal', lr * 0.01);
  ctx.fillText(cat, cx, cx + lr * 0.62);
  font(ctx, 600, lr * 0.1, SANS, 'semi-expanded', lr * 0.012);
  ctx.fillText('33⅓ RPM · SIDE A', cx, cx - lr * 0.5);
  ctx.restore();
  // the spindle hole, last, so nothing prints over it
  ctx.fillStyle = '#060607';
  ctx.beginPath(); ctx.arc(cx, cx, R * 0.024, 0, Math.PI * 2); ctx.fill();
  return disc;
}

/* ---------- the crate ---------- */

/** Wood: planks with grain, warm and low-key. */
export function wood(W, H, seed = 9) {
  const { c, ctx } = make(W, H);
  ctx.fillStyle = '#4a3a2c'; ctx.fillRect(0, 0, W, H);
  const r = rng(seed);
  // grain lines
  for (let i = 0; i < W * 0.6; i++) {
    const y = r() * H, len = 40 + r() * W * 0.6, x = r() * W;
    ctx.strokeStyle = r() > 0.5 ? `rgba(0,0,0,${0.06 + r() * 0.12})` : `rgba(255,230,190,${0.03 + r() * 0.06})`;
    ctx.lineWidth = 0.6 + r() * 1.6;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 1; k <= 6; k++) ctx.lineTo(x + (len / 6) * k, y + (r() - 0.5) * 3);
    ctx.stroke();
  }
  // plank seams
  const planks = 5;
  for (let p = 1; p < planks; p++) {
    const y = (H / planks) * p;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, y - 1, W, 2);
    ctx.fillStyle = 'rgba(255,230,190,0.08)'; ctx.fillRect(0, y + 1, W, 1);
  }
  return c;
}

/** Shrink-wrap relief: long soft ridges where the film puckers, as a bump map. */
export function wrapBump(S = 512) {
  const { c, ctx } = make(S);
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, S, S);
  const r = rng(29);
  for (let i = 0; i < 18; i++) {
    const y = r() * S, wdt = 6 + r() * 16;
    const g = ctx.createLinearGradient(0, y - wdt, 0, y + wdt);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, `rgba(255,255,255,${0.25 + r() * 0.35})`);
    g.addColorStop(0.65, `rgba(0,0,0,${0.2 + r() * 0.3})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.save(); ctx.translate(S / 2, y); ctx.rotate((r() - 0.5) * 0.9); ctx.fillRect(-S * 1.2, -wdt, S * 2.4, wdt * 2); ctx.restore();
  }
  return c;
}

/* ---------- shrink-wrap ----------
   Real factory film is pulled tight over the board: the middle is almost flat, and all the slack gathers at the
   corners and along the edges, where it creases. One welded seam runs down a side, a little cloudier than the rest.
   Two maps are drawn once: a normal map for the creases (so the light streak moves when the sleeve tilts) and a
   haze map for how much the film whitens what is under it. */

/** The height field of the creases. Real film creases are broad, soft ridges of light, never pencil lines: every
    ridge here is a wide stroke, blurred well past its own width, so the normal map turns it into a gentle roll of
    light rather than a scratch. There are few of them, and each one runs the way the plastic was pulled: along the
    nearest edge, or gathering into a corner. */
function wrapHeight(S, seed, glints = false) {
  const { c, ctx } = make(S);
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, S, S);
  const r = rng(seed);
  const edgeW = (x, y) => {
    const d = Math.min(x, y, S - x, S - y) / (S * 0.5);   // 0 at the rim, 1 in the middle
    return Math.pow(1 - Math.min(1, d), 2.6);
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // the fold around the rim: the film turns over the edge of the board there, so it always catches the light.
  // It is a soft roll — a broad bright band falling away to nothing, with only a whisper of shade behind it.
  const rimW = S * 0.05;
  try { ctx.filter = `blur(${(S * 0.0035).toFixed(1)}px)`; } catch { /* older engines draw it sharper */ }
  for (const [x, y, w2, h2, dir] of [[0, 0, S, rimW, 'h'], [0, S - rimW, S, rimW, 'h-'], [0, 0, rimW, S, 'v'], [S - rimW, 0, rimW, S, 'v-']]) {
    const gg = dir[0] === 'h'
      ? ctx.createLinearGradient(0, dir.endsWith('-') ? y + h2 : y, 0, dir.endsWith('-') ? y : y + h2)
      : ctx.createLinearGradient(dir.endsWith('-') ? x + w2 : x, 0, dir.endsWith('-') ? x : x + w2, 0);
    // a taut roll: bright right at the fold, then away to nothing, with only a whisper of shade behind it
    gg.addColorStop(0, 'rgba(255,255,255,1)');
    gg.addColorStop(0.26, 'rgba(255,255,255,0.62)');
    gg.addColorStop(0.58, 'rgba(255,255,255,0.14)');
    gg.addColorStop(1, 'rgba(255,255,255,0)');        // and away to nothing: no ink anywhere on this map
    ctx.fillStyle = gg; ctx.fillRect(x, y, w2, h2);
  }
  // few, wide, soft ridges: long ones lying along the nearest edge, short fans gathering into the corners
  const draw = (x, y, a, len, wide, lift, blur) => {
    try { ctx.filter = `blur(${blur.toFixed(1)}px)`; } catch { /* ignore */ }
    const mx = x + Math.cos(a) * len * 0.5 + (r() - 0.5) * len * 0.12;
    const my = y + Math.sin(a) * len * 0.5 + (r() - 0.5) * len * 0.12;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    // the ridge is built up from the outside in: a wide, near-invisible swell, then the bright crown on top
    for (const [wMul, aMul] of [[1, 0.28], [0.55, 0.5], [0.28, 1]]) {
      ctx.strokeStyle = `rgba(255,255,255,${(lift * aMul).toFixed(3)})`;
      ctx.lineWidth = Math.max(2, wide * wMul);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    }
    // the apex of the fold, where the light actually sits: still soft, never a ruled line
    try { ctx.filter = `blur(${(blur * 0.5).toFixed(1)}px)`; } catch { /* ignore */ }
    ctx.strokeStyle = `rgba(255,255,255,${(lift * 0.7).toFixed(3)})`;
    ctx.lineWidth = Math.max(2, wide * 0.16);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
  };
  const N = 72;
  for (let i = 0; i < N; i++) {
    const x = r() * S, y = r() * S;
    const w = edgeW(x, y);
    if (r() > w * 0.95) continue;                      // the middle stays almost flat
    const corner = Math.min(Math.hypot(x, y), Math.hypot(S - x, y), Math.hypot(x, S - y), Math.hypot(S - x, S - y)) / S;
    const toCorner = corner < 0.34;
    let a;
    if (toCorner) a = Math.atan2((y < S / 2 ? 0 : S) - y, (x < S / 2 ? 0 : S) - x) + (r() - 0.5) * 0.35;
    else a = (Math.min(x, S - x) < Math.min(y, S - y) ? Math.PI / 2 : 0) + (r() - 0.5) * 0.3;
    const len = S * (toCorner ? 0.12 + r() * 0.2 : 0.22 + r() * 0.36);
    const wide = S * (0.026 + r() * 0.036);            // three to six times the old width
    const lift = (0.45 + r() * 0.55) * w;
    draw(x, y, a, len, wide, 1.0 * lift, S * (0.011 + r() * 0.007));
  }
  // The glints: the quick thin flashes real film makes where a fold is pulled tight. Their shape is here, in
  // the height map that only the varnish on top is given; their shine is in wrapShine(), on the very same lines.
  if (glints) {
    for (const g of glintPaths(S, seed)) {
      glintLine(ctx, g, g.lift * 0.42, g.w * 9, S * 0.014);     // the swell the crest stands on
      glintLine(ctx, g, g.lift, g.w, S * 0.0022);               // the crest itself: thin, and bright
    }
  }

  // the welded seam: one soft ridge down the right-hand side, wide enough to read as a fold, not as a ruled line
  const sx = S * 0.9;
  try { ctx.filter = `blur(${(S * 0.007).toFixed(1)}px)`; } catch { /* ignore */ }
  const g = ctx.createLinearGradient(sx - S * 0.03, 0, sx + S * 0.03, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.28, 'rgba(255,255,255,0.12)');
  g.addColorStop(0.44, 'rgba(255,255,255,0.7)'); g.addColorStop(0.56, 'rgba(255,255,255,0.7)');
  g.addColorStop(0.72, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(sx - S * 0.03, 0, S * 0.06, S);
  ctx.filter = 'none';
  return c;
}

/** A normal map made from a height field: the slopes that catch the light and let go of it as the sleeve turns. */
function toNormal(h, S, strength) {
  const src = h.getContext('2d').getImageData(0, 0, S, S).data;
  const { c, ctx } = make(S);
  const out = ctx.createImageData(S, S);
  const at = (x, y) => src[((Math.min(S - 1, Math.max(0, y)) * S) + Math.min(S - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * S + x) * 4;
      out.data[i] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      out.data[i + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      out.data[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

/** What the film's body is shaped like: the soft ridges only, on gentle slopes — a roll of light, never an edge. */
export function wrapNormal(S = 1024, seed = 17) {
  return toNormal(wrapHeight(S, seed, false), S, 5.5);
}

/** What the film's shine is shaped like: the same ridges plus the thin glints, and steeper, because this map is
    only given to the clear varnish on top. A varnish can only ADD light — where its bumps point away from a lamp
    it simply reflects less, it cannot darken the print underneath — which is how the film gets its quick thin
    flashes back without a single dark line being drawn anywhere. */
export function wrapGloss(S = 1024, seed = 17) {
  return toNormal(wrapHeight(S, seed, true), S, 9);
}

/** Where the film is pulled tight enough to flash: along the sides just inside the rim, out of the corners,
    and a few long pulls across the face. The same handful of lines feeds the varnish's bumps and the shine map,
    so a glint and the crease it belongs to are never in two different places. */
function glintPaths(S, seed) {
  const r = rng(seed + 91);
  const out = [];
  for (let i = 0; i < 28; i++) {
    // three along the rim, one out of a corner, one short one further in: film gathers at the edges
    const kind = i % 5;
    const w = S * (0.005 + r() * 0.004);
    let x, y, a, len, lift;
    if (kind < 3) {
      const side = (i * 7 + Math.floor(r() * 4)) % 4;
      const off = S * (0.03 + r() * 0.1);
      const along = S * (0.08 + r() * 0.8);
      if (side === 0) { x = along; y = off; a = 0; }
      else if (side === 1) { x = along; y = S - off; a = 0; }
      else if (side === 2) { x = off; y = along; a = Math.PI / 2; }
      else { x = S - off; y = along; a = Math.PI / 2; }
      a += (r() - 0.5) * 0.2;
      len = S * (0.1 + r() * 0.22) * (r() < 0.5 ? -1 : 1);
      lift = 0.75 + r() * 0.25;
    } else if (kind === 3) {
      const cx = r() < 0.5 ? 0 : S, cy = r() < 0.5 ? 0 : S;
      x = cx + (cx ? -1 : 1) * S * (0.04 + r() * 0.12);
      y = cy + (cy ? -1 : 1) * S * (0.04 + r() * 0.12);
      a = Math.atan2(S / 2 - y, S / 2 - x) + (r() - 0.5) * 0.6;
      len = S * (0.08 + r() * 0.16);
      lift = 0.7 + r() * 0.3;
    } else {                                           // short, faint ones further in: the film is flatter there
      x = S * (0.12 + r() * 0.64); y = S * (0.12 + r() * 0.72);
      a = r() * Math.PI;
      len = S * (0.08 + r() * 0.14);
      lift = 0.35 + r() * 0.2;
    }
    const bow = (r() - 0.5) * len * 0.22;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    out.push({ x, y, a, len, w, lift, bow,
      mx: x + Math.cos(a) * len * 0.5 - Math.sin(a) * bow,
      my: y + Math.sin(a) * len * 0.5 + Math.cos(a) * bow,
      ex, ey, head: 0.12 + r() * 0.18, tail: 0.66 + r() * 0.2 });
  }
  return out;
}

/** One pass of a glint: a curved line that fades in and out along its length, so it reads as light landing on a
    fold rather than as a line someone drew. */
function glintLine(ctx, g, alpha, width, blur) {
  const grad = ctx.createLinearGradient(g.x, g.y, g.ex, g.ey);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(g.head, `rgba(255,255,255,${alpha.toFixed(3)})`);
  grad.addColorStop(g.tail, `rgba(255,255,255,${(alpha * 0.85).toFixed(3)})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  try { ctx.filter = `blur(${blur.toFixed(1)}px)`; } catch { /* ignore */ }
  ctx.strokeStyle = grad;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.quadraticCurveTo(g.mx, g.my, g.ex, g.ey); ctx.stroke();
}

/** How glossy the film is, point by point. Plastic that has been pulled tight is smoother than the rest, so it
    throws the room back harder along those lines. This map only ever RAISES the shine — it cannot take light
    away from the print underneath — so the glints come back as flashes with no dark twin beside them.
    Read through the alpha channel, which is what three.js multiplies the material's specular strength by. */
export function wrapShine(S = 1024, seed = 17) {
  const { c, ctx } = make(S);
  ctx.fillStyle = 'rgba(255,255,255,0.34)';            // the film at rest; the material carries the other third
  ctx.fillRect(0, 0, S, S);
  for (const g of glintPaths(S, seed)) {
    glintLine(ctx, g, 0.34 + 0.3 * g.lift, g.w * 3.4, S * 0.006);   // the halo the flash starts from
    glintLine(ctx, g, 0.55 + 0.45 * g.lift, g.w, S * 0.0016);       // and the tight line itself
  }
  ctx.filter = 'none';
  return c;
}

/** How much the film whitens what is under it: almost clear in the middle, cloudier at the rim and on the seam,
    and whitest along the folds — plastic pulled into a fold lies double there, so it really is more opaque. */
export function wrapHaze(S = 1024, seed = 17) {
  const { c, ctx } = make(S);
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.18, S / 2, S / 2, S * 0.72);
  g.addColorStop(0, '#2b2b2b'); g.addColorStop(0.7, '#5a5a5a'); g.addColorStop(0.92, '#cfcfcf'); g.addColorStop(1, '#f2f2f2');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  const r = rng(seed + 3);
  // the same few creases hold a little more cloud: wide, soft smudges lying the way the film was pulled
  for (let i = 0; i < 40; i++) {
    const x = r() * S, y = r() * S;
    const d = Math.min(x, y, S - x, S - y) / (S * 0.5);
    if (r() > Math.pow(1 - Math.min(1, d), 2)) continue;
    const corner = Math.min(Math.hypot(x, y), Math.hypot(S - x, y), Math.hypot(x, S - y), Math.hypot(S - x, S - y)) / S;
    const a = corner < 0.34
      ? Math.atan2((y < S / 2 ? 0 : S) - y, (x < S / 2 ? 0 : S) - x) + (r() - 0.5) * 0.35
      : (Math.min(x, S - x) < Math.min(y, S - y) ? Math.PI / 2 : 0) + (r() - 0.5) * 0.3;
    const len = S * (0.12 + r() * 0.26);
    try { ctx.filter = `blur(${(S * (0.014 + r() * 0.008)).toFixed(1)}px)`; } catch { /* ignore */ }
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(255,255,255,${(0.2 + r() * 0.26).toFixed(3)})`;
    ctx.lineWidth = S * (0.02 + r() * 0.03);
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + (r() - 0.5) * len * 0.12, y + Math.sin(a) * len * 0.5 + (r() - 0.5) * len * 0.12,
      x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  // the folds themselves, drawn thin: this is what makes the plastic read as plastic on a dark board, and the
  // moving flash comes from the varnish's bumps sitting on exactly these lines
  for (const gl of glintPaths(S, seed)) {
    glintLine(ctx, gl, 0.1 + 0.13 * gl.lift, gl.w * 7, S * 0.013);      // a wide, gentle lift, so the film beside
    glintLine(ctx, gl, 0.34 + 0.4 * gl.lift, gl.w * 1.15, S * 0.0022);  // a fold never looks like a dark gap
  }
  try { ctx.filter = `blur(${(S * 0.008).toFixed(1)}px)`; } catch { /* ignore */ }
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fillRect(S * 0.882, 0, S * 0.036, S);   // the seam
  ctx.filter = 'none';
  return c;
}

/** The write-up of a record that is still sealed, as the eye meets it: a paragraph that is genuinely there on
    the sheet — but drawn, not written. No sentence exists anywhere in this: the lines are bars of ink with the
    ragged word-lengths of real prose, blurred far past reading, with the same film over them as on the sleeve —
    haze, a fold of light across the page, a bright rim where the plastic turns. Nothing here can be read by
    eye, by a screen reader, or by anyone opening the page's source, because there is nothing to read. */
export function sealedSheet(W, H, { bg = '#cdc7b8', ink = '#1d2766', seed = 5 } = {}) {
  const { c, ctx } = make(W, H);
  const r = rng(seed);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // the paragraph: five lines of "words", the last one short, the way a paragraph really ends
  const top = H * 0.13, pitch = H * 0.185, bar = H * 0.088;
  ctx.fillStyle = ink;
  for (let line = 0; line < 5; line++) {
    const full = line === 4 ? 0.52 + r() * 0.12 : 0.9 + r() * 0.08;
    let x = W * 0.06;
    const end = W * 0.06 + (W * 0.88) * full;
    while (x < end) {
      const w = Math.min(end - x, W * (0.028 + r() * 0.085));
      if (w < W * 0.012) break;
      ctx.globalAlpha = 0.66 + r() * 0.3;
      const y = top + line * pitch;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, bar, bar * 0.28); else ctx.rect(x, y, w, bar);
      ctx.fill();
      x += w + W * (0.012 + r() * 0.012);
    }
  }
  ctx.globalAlpha = 1;
  // blurred past reading: the blur is wider than the height of a line, so no letter shape could survive it
  blurInto(ctx, c, Math.max(W, H), H * 0.05);
  // and now the film, the same one as on the sleeves
  const veil = ctx.createLinearGradient(0, 0, 0, H);
  veil.addColorStop(0, 'rgba(255,255,255,0.26)');
  veil.addColorStop(0.35, 'rgba(255,255,255,0.09)');
  veil.addColorStop(1, 'rgba(255,255,255,0.17)');
  ctx.fillStyle = veil; ctx.fillRect(0, 0, W, H);
  const flash = (x0, y0, x1, y1, w, a, blur) => {
    const gg = ctx.createLinearGradient(x0, y0, x1, y1);
    gg.addColorStop(0, 'rgba(255,255,255,0)');
    gg.addColorStop(0.22, `rgba(255,255,255,${a})`);
    gg.addColorStop(0.74, `rgba(255,255,255,${(a * 0.8).toFixed(3)})`);
    gg.addColorStop(1, 'rgba(255,255,255,0)');
    try { ctx.filter = `blur(${blur.toFixed(1)}px)`; } catch { /* ignore */ }
    ctx.strokeStyle = gg; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - H * 0.06, x1, y1);
    ctx.stroke();
  };
  flash(W * 0.04, H * 0.78, W * 0.62, H * 0.3, H * 0.055, 0.5, H * 0.018);
  flash(W * 0.42, H * 0.95, W * 0.99, H * 0.52, H * 0.03, 0.34, H * 0.012);
  flash(W * 0.2, H * 0.1, W * 0.78, H * 0.03, H * 0.022, 0.28, H * 0.01);
  // the fold where the plastic turns over the top and bottom of the block
  ctx.filter = 'none';
  for (const [y0, y1, a] of [[0, H * 0.055, 0.62], [H, H * 0.94, 0.4]]) {
    const gg = ctx.createLinearGradient(0, y0, 0, y1);
    gg.addColorStop(0, `rgba(255,255,255,${a})`);
    gg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gg; ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
  }
  grain(ctx, W, H, 0.05, seed + 11);
  return c;
}

/** Soft contact shadow: a radial fall-off in alpha. */
export function contactShadow(S = 512) {
  const { c, ctx } = make(S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(0.55, 'rgba(0,0,0,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  return c;
}

/* ---------- the price flyer, printed ---------- */

const FLY = { ground: '#ebe6da', ink: '#1c1b1f', accent: '#3a4dd0' };

function wrapLines(ctx, text, maxW) {
  const words = text.split(/\s+/); const lines = []; let line = '';
  for (const wd of words) { const cand = line ? `${line} ${wd}` : wd; if (ctx.measureText(cand).width > maxW && line) { lines.push(line); line = wd; } else line = cand; }
  if (line) lines.push(line);
  // no word left alone on the last line: the one before it comes down to keep it company
  const n = lines.length;
  if (n >= 2 && !/\s/.test(lines[n - 1]) && /\s/.test(lines[n - 2])) {
    const cut = lines[n - 2].lastIndexOf(' ');
    const moved = `${lines[n - 2].slice(cut + 1)} ${lines[n - 1]}`;
    if (ctx.measureText(moved).width <= maxW) { lines[n - 1] = moved; lines[n - 2] = lines[n - 2].slice(0, cut); }
  }
  return lines;
}

/**
 * One panel of the flyer, a real printed piece: panel 0 is the outer cover (label, title, the six sleeves as a
 * two-colour halftone); panels 1–3 one package each on a strict grid (number, name, price, who it is for, timeline,
 * sample); the last panel the care plan and the way to the full price list. Laid out in 480 css-px units (u = W/480).
 */
export function flyerPanelPrinted(W, H, k, n, print) {
  const { c, ctx } = make(W, H);
  const P = FLY;
  const u = W / 480, Hu = H / u;
  ctx.fillStyle = P.ground; ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.05, 140 + k);
  // creases: the fold takes a little light on one side and loses it on the other
  const crease = (y, dir) => {
    const g = ctx.createLinearGradient(0, y, 0, y + dir * H * 0.16);
    g.addColorStop(0, 'rgba(0,0,0,0.11)'); g.addColorStop(0.35, 'rgba(0,0,0,0.03)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, Math.min(y, y + dir * H * 0.16), W, H * 0.16);
  };
  if (k > 0) crease(0, 1);
  if (k < n - 1) crease(H, -1);
  ctx.save();
  ctx.scale(u, u);
  const L = 30, R = 450;
  ctx.fillStyle = P.ink; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const rule = (y, a = 0.32) => { ctx.globalAlpha = a; ctx.fillRect(L, y, R - L, 1); ctx.globalAlpha = 1; };
  if (k === 0) {
    // the outer cover
    font(ctx, 600, 11, SANS, 'semi-expanded', 1.7);
    ctx.fillText('SHOCKING MIKE RECORDS', L, 32);
    ctx.font = `600 ${Hu > 150 ? 64 : 54}px ${SERIF}`;
    try { ctx.letterSpacing = '-1.2px'; } catch { /* ignore */ }
    ctx.fillText(print.title, L - 2, Hu - 24);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
    font(ctx, 500, 10.5, MONO, 'normal', 0.6);
    ctx.fillText(print.year, L + 1, Hu - 8);
    // the label's mark, large and quiet, on the right: nothing else, so the cover stays a cover
    ctx.globalAlpha = 0.5; ctx.fillRect(L, 40, R - 120 - L, 1); ctx.globalAlpha = 1;
    const mr = Math.min(46, (Hu - 70) / 2);
    mark(ctx, R - mr - 4, Hu / 2 + 6, mr, P.ink, 1.4);
    ctx.textAlign = 'right';
    font(ctx, 600, 10.5, SANS, 'semi-expanded', 1.5);
    ctx.fillText('SMR 001–006', R, 32);
    ctx.textAlign = 'left';
  } else {
    const row = k <= 3 ? print.rows[k - 1] : print.care;
    let yName = Hu > 150 ? 74 : 58;
    // the grid: number top-left, name and price on one baseline, who it is for under, the facts along the bottom
    font(ctx, 500, 11, MONO, 'normal', 0.8);
    ctx.fillText(String(k).padStart(2, '0'), L, 30);
    font(ctx, 600, 10.5, SANS, 'semi-expanded', 1.6);
    ctx.fillText((k <= 3 ? print.labels.plan : print.labels.care).toUpperCase(), L + 26, 30);
    rule(37, 0.5);
    /* Vietnamese runs about a quarter longer than English, so the name and the price are fitted, never assumed:
       both step down a size until they fit side by side with a real gap; if even the smallest sizes will not fit,
       the price drops to its own line under the name. Nothing is ever shortened to make it fit. */
    const GAP = 18;
    const nameMax = Hu > 150 ? 34 : 29, priceMax = Hu > 150 ? 26 : 22;
    const nameMin = nameMax * 0.62, priceMin = priceMax * 0.72;
    const widthOf = (text, px, weight = 600) => { ctx.font = `${weight} ${px}px ${SERIF}`; return ctx.measureText(text).width; };
    let namePx = nameMax, pricePx = priceMax, stacked = false;
    for (let i = 0; i < 40; i++) {
      if (widthOf(row.name, namePx) + widthOf(row.price, pricePx) + GAP <= R - L) break;
      if (pricePx > priceMin) pricePx -= 0.5;
      else if (namePx > nameMin) namePx -= 0.5;
      else { stacked = true; break; }
    }
    ctx.font = `600 ${namePx}px ${SERIF}`;
    try { ctx.letterSpacing = '-0.4px'; } catch { /* ignore */ }
    ctx.fillText(row.name, L - 1, yName);
    try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
    ctx.font = `600 ${pricePx}px ${SERIF}`;
    if (stacked) {
      yName += pricePx + 6;
      ctx.fillText(row.price, L, yName);
    } else {
      ctx.textAlign = 'right';
      ctx.fillText(row.price, R, yName);
      ctx.textAlign = 'left';
    }
    // the one line under the name — what the package is: it is never cut off. It wraps, and if the wrap does not
    // fit the space left on the panel, the type steps down until every word is on the sheet.
    const room = (Hu - 34) - (yName + 20);
    let fp = Hu > 150 ? 17 : 15;
    let lines2 = [];
    for (; fp >= 11; fp -= 0.5) {
      ctx.font = `italic 400 ${fp}px ${SERIF}`;
      lines2 = wrapLines(ctx, row.for, R - L);
      if (lines2.length * (fp * 1.32) <= room) break;
    }
    ctx.font = `italic 400 ${fp}px ${SERIF}`;
    lines2.forEach((l, i) => ctx.fillText(l, L, yName + 20 + fp + i * fp * 1.32));
    if (k <= 3) {
      rule(Hu - 30, 0.32);
      const y = Hu - 14;
      const t1 = print.labels.timeline.toUpperCase(), t2 = print.labels.example.toUpperCase();
      const lab = (px) => font(ctx, 600, px, SANS, 'semi-expanded', 1.4);
      const val = (px) => { ctx.font = `500 ${px}px ${SERIF}`; };
      // fit both pairs (label + value) on one line; if the language is too long for that, drop the sample pair
      let lp = 9.5, vp = 12, showSample = true;
      const measure = () => {
        lab(lp); const a = ctx.measureText(t1).width, c = ctx.measureText(t2).width;
        val(vp); const b = ctx.measureText(row.timeline).width, d = ctx.measureText(row.example).width;
        return { a, b, c, d, total: a + 6 + b + 26 + c + 6 + d };
      };
      let m = measure();
      while (m.total > R - L && vp > 9.5) { vp -= 0.5; lp = Math.max(8.5, lp - 0.25); m = measure(); }
      if (m.total > R - L) showSample = false;
      lab(lp); ctx.fillText(t1, L, y);
      val(vp); ctx.fillText(row.timeline, L + m.a + 6, y);
      if (showSample) {
        val(vp); const dw = ctx.measureText(row.example).width;
        lab(lp); const cw = ctx.measureText(t2).width;
        ctx.fillText(t2, R - dw - 6 - cw, y);
        val(vp); ctx.textAlign = 'right'; ctx.fillText(row.example, R, y); ctx.textAlign = 'left';
      }
    } else {
      rule(Hu - 30, 0.32);
      ctx.font = `600 15px ${SERIF}`;
      const more = `${print.more} ↗`;
      ctx.fillText(more, L, Hu - 12);
      ctx.fillRect(L, Hu - 8, ctx.measureText(more).width, 1);
      mark(ctx, R - 12, Hu - 17, 11, P.ink, 1.1);
    }
  }
  ctx.restore();
  return c;
}
