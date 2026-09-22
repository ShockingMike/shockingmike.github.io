// Chớm page layer: hand-painted bits drawn from the real brush scans in ../tex/strokes.png
// (CC0, docs/content/chom-brush-sources.md). No other image is used.
//   loadBrushes()      cuts the scan into single strokes (alpha from brightness), makes the CSS edge masks
//   tint(stamp, col)   a stroke in one colour
//   drawBottle(...)    a labelled Chớm bottle in the same painted manner as the scene
//   drawBand(...)      the four season colours laid down side by side, bleeding into each other by amount
//   drawShelf(...)     the atelier still life
import { SEASONS, PAINT } from './blend.js';

const STROKES = new URL('../tex/strokes.png', import.meta.url).href;
// The label on every painted bottle is THE label: layout D at 90 mm, the file the 3D bottle wears
// (core/bottle.js labelUrl, brand/chom/nhan/png/, printed from brand/chom/logo-src/nhan.py with DUNG_TICH = '100 ml').
// There is no second label drawn here by hand any more. Until 21/9 the page painted its own: "Chớm" typed in a serif,
// the season in the accent colour, and three grey dashes standing for the small print, which its notes still gave
// the old volume. One thing kept in two places drifts; this reads the same file as the core, so it cannot.
// The core loads these four files for its own bottles, so the browser has them already.
const LABEL_URL = (s) => new URL(`../nhan/nhan-d90-${s}-mua.png`, import.meta.url).href;
// where the words sit on that label, in its own 1600 px (measured off the four files, 21/9; the same in all four):
// "Chớm" from y 405 to 767 and x 315 to 1269, the season's name down to y 1070
const LABEL_WORDS = { x0: 315 / 1600, x1: 1269 / 1600, y0: 405 / 1600, y1: 1070 / 1600 };

// strokes.png is a 4 × 4 sheet
const CELLS = {
  flat0: [0, 0], flat1: [1, 0], flat2: [2, 0], flat3: [3, 0],
  line: [0, 1], hatch: [1, 1], dry: [2, 1], dry2: [3, 1],
  dryWide: [0, 2], thin: [1, 2], mid: [2, 2], thin2: [3, 2],
  dab0: [0, 3], dab1: [1, 3], dab2: [2, 3], dab3: [3, 3],
};

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

let brushes = null;
let loading = null;

// Cut the sheet into strokes. Each stroke has two versions:
//   hard: white, alpha rises quickly with brightness (for CSS masks and solid edges)
//   soft: white, alpha = brightness (keeps the bristle texture, for painting)
export function loadBrushes() {
  if (brushes) return Promise.resolve(brushes);
  if (loading) return loading;
  loading = (async () => {
    const t0 = performance.now();
    const img = new Image();
    img.decoding = 'async';
    img.src = STROKES;
    await img.decode();
    const t1 = performance.now();
    const W = img.naturalWidth, H = img.naturalHeight, cell = W / 4;
    const src = canvas(W, H).getContext('2d', { willReadFrequently: true });
    src.drawImage(img, 0, 0);
    const all = src.getImageData(0, 0, W, H).data;
    const out = {};
    for (const [name, [cx, cy]] of Object.entries(CELLS)) {
      const x0 = cx * cell, y0 = cy * cell;
      let minX = cell, minY = cell, maxX = 0, maxY = 0;
      for (let y = 2; y < cell - 2; y++) for (let x = 2; x < cell - 2; x++) {
        if (all[((y0 + y) * W + x0 + x) * 4] > 40) {
          if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      const pad = 2;
      minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
      maxX = Math.min(cell - 1, maxX + pad); maxY = Math.min(cell - 1, maxY + pad);
      const w = maxX - minX + 1, h = maxY - minY + 1;
      const mk = (hard) => {
        const c = canvas(w, h), g = c.getContext('2d');
        const id = g.createImageData(w, h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const l = all[((y0 + minY + y) * W + x0 + minX + x) * 4];
          const o = (y * w + x) * 4;
          id.data[o] = id.data[o + 1] = id.data[o + 2] = 255;
          id.data[o + 3] = hard ? Math.max(0, Math.min(255, (l - 28) * 3.6)) : l;
        }
        g.putImageData(id, 0, 0);
        return c;
      };
      out[name] = { hard: mk(true), soft: mk(false), w, h };
    }
    // the four labels, each brought down once to 400 px so every painted bottle draws from a clean small copy
    // (a 1600 px picture squeezed straight into 60 px shimmers); a label that does not arrive leaves plain paper
    out.labels = {};
    await Promise.all(SEASONS.map(async (s) => {
      try {
        const im = new Image();
        im.decoding = 'async';
        im.src = LABEL_URL(s);
        await im.decode();
        let c = im, size = im.naturalWidth;
        while (size / 2 >= 400) {
          const next = canvas(size / 2, size / 2), ng = next.getContext('2d');
          ng.imageSmoothingQuality = 'high';
          ng.drawImage(c, 0, 0, size / 2, size / 2);
          c = next; size /= 2;
        }
        out.labels[s] = c;
      } catch { /* plain paper */ }
    }));
    brushes = out;
    performance.measure('pg:brush-fetch', { start: t0, end: t1 });
    performance.measure('pg:brush-cut', { start: t1, end: performance.now() });
    return out;
  })().catch((e) => { loading = null; throw e; });
  return loading;
}

const rotated = new WeakMap();
export function rotate(c, quarterTurns = 1, flip = false) {
  const key = `${quarterTurns}|${flip}`;
  let m = rotated.get(c);
  if (!m) { m = new Map(); rotated.set(c, m); }
  if (m.has(key)) return m.get(key);
  const r = rotateNow(c, quarterTurns, flip);
  m.set(key, r);
  return r;
}
function rotateNow(c, quarterTurns, flip) {
  const odd = quarterTurns % 2 === 1;
  const r = canvas(odd ? c.height : c.width, odd ? c.width : c.height);
  const g = r.getContext('2d');
  g.translate(r.width / 2, r.height / 2);
  g.rotate((quarterTurns * Math.PI) / 2);
  if (flip) g.scale(-1, 1);
  g.drawImage(c, -c.width / 2, -c.height / 2);
  return r;
}

const toURL = (c) => new Promise((res) => c.toBlob((b) => res(b ? URL.createObjectURL(b) : null), 'image/png'));

// The painted edges every solid panel and button uses (page.css: .pg-paint).
// An edge strip: the brush's ragged outer boundary, solid everywhere on the inner side of it (no light streaks can
// show through a panel). side: which way is "outside" ('t' top, 'b' bottom, 'l' left, 'r' right).
function edgeStrip(c, side) {
  const w = c.width, h = c.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  const id = g.getImageData(0, 0, w, h);
  const d = id.data;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const og = out.getContext('2d');
  const od = og.createImageData(w, h);
  const A = (x, y) => d[(y * w + x) * 4 + 3];
  const put = (x, y, a) => { const o = (y * w + x) * 4; od.data[o] = od.data[o + 1] = od.data[o + 2] = 255; od.data[o + 3] = a; };
  if (side === 't' || side === 'b') {
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let k = 0; k < h; k++) { const y = side === 't' ? k : h - 1 - k; m = Math.max(m, A(x, y)); put(x, y, m); }
    }
  } else {
    for (let y = 0; y < h; y++) {
      let m = 0;
      for (let k = 0; k < w; k++) { const x = side === 'l' ? k : w - 1 - k; m = Math.max(m, A(x, y)); put(x, y, m); }
    }
  }
  og.putImageData(od, 0, 0);
  return out;
}

export async function installEdgeMasks(root = document.documentElement) {
  const b = await loadBrushes();
  const t0 = performance.now();
  // the strip's far end fades a little at both ends of the stroke: keep the middle 86% so corners stay covered
  const crop = (c, horizontal) => {
    const o = document.createElement('canvas');
    if (horizontal) { o.width = Math.round(c.width * 0.86); o.height = c.height; o.getContext('2d').drawImage(c, -Math.round(c.width * 0.07), 0); }
    else { o.width = c.width; o.height = Math.round(c.height * 0.86); o.getContext('2d').drawImage(c, 0, -Math.round(c.height * 0.07)); }
    return o;
  };
  const pairs = [
    ['--pg-edge-t', edgeStrip(crop(b.flat1.hard, true), 't')],
    ['--pg-edge-b', edgeStrip(crop(rotate(b.flat2.hard, 2), true), 'b')],
    ['--pg-edge-l', edgeStrip(crop(rotate(b.flat3.hard, 1), false), 'l')],
    ['--pg-edge-r', edgeStrip(crop(rotate(b.flat0.hard, 1, true), false), 'r')],
    ['--pg-stroke', b.flat0.hard],
    ['--pg-stroke-2', b.mid.hard],
    ['--pg-rule', b.dryWide.hard],
    ['--pg-dab', b.dab0.hard],
  ];
  performance.measure('pg:edge-strips', { start: t0, end: performance.now() });
  const urls = await Promise.all(pairs.map(([, c]) => toURL(c)));
  pairs.forEach(([k], i) => { if (urls[i]) root.style.setProperty(k, `url("${urls[i]}")`); });
  root.classList.add('pg-brush-ready');
}

const tintCache = new Map();
export function tint(stamp, colour, key) {
  const k = key && `${key}|${colour}`;
  if (k && tintCache.has(k)) return tintCache.get(k);
  const c = canvas(stamp.width, stamp.height), g = c.getContext('2d');
  g.drawImage(stamp, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = colour;
  g.fillRect(0, 0, c.width, c.height);
  if (k) tintCache.set(k, c);
  return c;
}

// Set a canvas's backing size from its CSS box. Called on mount and on resize only (never per frame).
export function fitCanvas(c, maxDpr = 2, known = null) {
  const r = known || c.getBoundingClientRect();
  const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w: r.width, h: r.height, dpr };
}

// ---------------------------------------------------------------------------------------------------------
// The painted glass: the same language as the scene's bottle (core/build.js buildBottle + core/paint.js):
//   three values laid with real brush strokes, an oily highlight on the lit side, the vermilion band leaning to the
//   light and the mint band to the shade, loose white sketch lines, an ink outline that swells on the shadow side.
// The light comes from the upper left, as on the page's other painted things.
// ---------------------------------------------------------------------------------------------------------
const INK = '#1d1815';
const RIM_LIT = '#e3542d';
const RIM_SHADE = '#7cd4be';
const SKETCH = '#fffcf2';
// the scene's glass: very dark teal with an oily sheen (core/build.js: col #081a1e, col2 #2e6a66)
const GLASS = { base: '#1b4543', shade: '#081a1e', light: '#2e6a66' };
const SHEEN = '#fff4dc';
// the scene's cap: brown-gold lacquer (col #3a2410, col2 #f0b850)
const GOLD = { base: '#9c6a2a', shade: '#3a2410', light: '#f0b850' };
const LABEL = { base: '#efe3c8', shade: '#cdb68f', light: '#fff9ea' };
const WOOD = { base: '#7a5236', shade: '#3b2618', light: '#b98a5c' };

const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export function mixHex(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
export const valuesOf = (hex) => ({ base: hex, shade: mixHex(hex, '#10161e', 0.48), light: mixHex(hex, '#fff6e2', 0.42) });
// the blend seen through the dark glass
const throughGlass = (hex) => ({ base: mixHex(hex, GLASS.base, 0.22), shade: mixHex(hex, GLASS.shade, 0.58), light: mixHex(hex, '#fff2dc', 0.28) });

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

// A rounded box as a closed list of points with outward normals (clockwise from the top-left corner).
function rrPoints(x, y, w, h, r, per = 8) {
  const pts = [];
  const arc = (cx, cy, a0) => { for (let k = 0; k <= per; k++) { const a = a0 + (k / per) * (Math.PI / 2); pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) }); } };
  const side = (x0, y0, x1, y1, nx, ny) => { const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / Math.max(4, r))); for (let k = 1; k < n; k++) pts.push({ x: x0 + ((x1 - x0) * k) / n, y: y0 + ((y1 - y0) * k) / n, nx, ny }); };
  arc(x + r, y + r, Math.PI);
  side(x + r, y, x + w - r, y, 0, -1);
  arc(x + w - r, y + r, -Math.PI / 2);
  side(x + w, y + r, x + w, y + h - r, 1, 0);
  arc(x + w - r, y + h - r, 0);
  side(x + w - r, y + h, x + r, y + h, 0, 1);
  arc(x + r, y + h - r, Math.PI / 2);
  side(x, y + h - r, x, y + r, -1, 0);
  return pts;
}
const pathOf = (g, pts, dx = 0, dy = 0) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x + dx, p.y + dy) : g.moveTo(p.x + dx, p.y + dy))); g.closePath(); };

// ink that swells where the shape turns away from the light (lower right), thin where it faces it
function inkOutline(g, pts, width, seed, alpha = 0.9) {
  const R = rng(seed);
  g.save();
  g.strokeStyle = INK;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const face = Math.max(0, (a.nx + b.nx) * 0.35 + (a.ny + b.ny) * 0.35);
    g.globalAlpha = alpha * (R() < 0.06 ? 0.45 : 1);
    g.lineWidth = width * (0.45 + 1.25 * face) * (0.85 + 0.3 * R());
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
  g.restore();
}

// loose white sketch loops just outside the shape: a few partial runs, never the whole way round
function sketchLoops(g, pts, off, seed, alpha = 0.85) {
  const R = rng(seed + 101);
  g.save();
  g.strokeStyle = SKETCH;
  g.lineCap = 'round';
  g.globalAlpha = alpha;
  g.lineWidth = Math.max(0.9, off * 0.28);
  const n = pts.length;
  for (let run = 0; run < 3; run++) {
    const start = Math.floor(R() * n), len = Math.floor(n * (0.12 + R() * 0.16));
    const o = off * (0.8 + R() * 0.9);
    g.beginPath();
    for (let k = 0; k <= len; k++) {
      const p = pts[(start + k) % n];
      const wob = Math.sin(k * 0.7 + run * 2) * off * 0.3;
      const x = p.x + p.nx * (o + wob), y = p.y + p.ny * (o + wob);
      if (k) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.stroke();
  }
  g.restore();
}

// the offset colour bands behind the shape: vermilion toward the light, mint toward the shade, broken by the brush
function rims(g, b, pts, box, off, seed) {
  const R = rng(seed + 7);
  for (const [col, dx, dy, key] of [[RIM_LIT, -off, -off * 0.55, 'rimL'], [RIM_SHADE, off, off * 0.55, 'rimS']]) {
    g.save();
    pathOf(g, pts, dx, dy);
    g.clip();
    const st = b[R() < 0.5 ? 'dryWide' : 'flat2'];
    g.globalAlpha = 0.95;
    g.drawImage(tint(rotate(st.hard, 1), col, `${key}v`), box.x + dx - box.w * 0.1, box.y + dy - box.h * 0.05, box.w * 1.2, box.h * 1.1);
    g.drawImage(tint(st.hard, col, `${key}h`), box.x + dx - box.w * 0.1, box.y + dy + box.h * 0.1, box.w * 1.2, box.h * 0.8);
    g.restore();
  }
}

// three values of one colour laid with brush strokes inside a clip: base, the shaded right side, the lit left side
function threeValues(g, b, box, v, seed, opts = {}) {
  const R = rng(seed + 31);
  const { x, y, w, h } = box;
  g.fillStyle = v.base;
  g.fillRect(x - 2, y - 2, w + 4, h + 4);
  // body texture: horizontal strokes a shade either side of the base
  g.globalAlpha = 0.35;
  g.drawImage(tint(b.flat0.soft, mixHex(v.base, v.light, 0.35), 'bA'), x - w * 0.2, y + h * R() * 0.2, w * 1.4, h * 0.6);
  g.globalAlpha = 0.3;
  g.drawImage(tint(b.mid.soft, mixHex(v.base, v.shade, 0.35), 'bM'), x - w * 0.1, y + h * (0.45 + R() * 0.2), w * 1.3, h * 0.5);
  // shade: the right third, vertical strokes, darker toward the edge
  const vs = rotate(b.dryWide.soft, 1);
  g.globalAlpha = 0.8;
  g.drawImage(tint(vs, v.shade, 'shV'), x + w * (0.62 + R() * 0.05), y - h * 0.05, w * 0.5, h * 1.1);
  g.globalAlpha = 0.55;
  g.drawImage(tint(rotate(b.flat1.soft, 1), v.shade, 'shV2'), x + w * 0.45, y + h * 0.1, w * 0.45, h * 0.95);
  // light: the left fifth
  g.globalAlpha = 0.6;
  g.drawImage(tint(rotate(b.flat3.soft, 1), v.light, 'liV'), x - w * 0.05, y, w * 0.32, h);
  // the bottom turns away from the light
  if (!opts.noFloor) {
    g.globalAlpha = 0.5;
    g.drawImage(tint(b.flat0.soft, v.shade, 'shB'), x - w * 0.1, y + h * 0.84, w * 1.2, h * 0.24);
  }
  g.globalAlpha = 1;
}

// the oily highlight: a cream vertical stroke on the lit side (as the scene's bottle has)
function highlight(g, b, x, y, w, h, alpha = 0.92) {
  g.save();
  g.globalAlpha = alpha;
  g.drawImage(tint(rotate(b.line.hard, 1), SHEEN, 'hiV'), x, y, w, h);
  g.globalAlpha = alpha * 0.55;
  g.drawImage(tint(rotate(b.thin.soft, 1), '#ffffff', 'hiV2'), x + w * 0.9, y + h * 0.1, w * 0.45, h * 0.55);
  g.restore();
}

const shadowUnder = (g, b, cx, by, w) => {
  g.save();
  g.globalAlpha = 0.28;
  g.drawImage(tint(b.flat1.soft, '#3a2a20', 'shadowP'), cx - w * 0.55, by - w * 0.06, w * 1.55, w * 0.2);
  g.restore();
};

// A Chớm bottle standing on (cx, by), w wide. level 0..1 is how full it is. opts.season picks its label.
// opts.letters: the label is large enough to read, so the page keeps its words ("Chớm" and the season) in the
// document at that place (see page.js placeWords); the returned box says where.
// The Chớm flacon, painted: the same bottle the scene holds, 100 ml, 147 mm tall (Mike, 19/9). The numbers below are
// the glassworks drawing the core builds from (core/bottle.js FL): body 98 wide × 126 tall, a 24-unit slab of glass
// for the base (wider than the body, so the bottom edge catches the light), 38 of sloping shoulder, a 20 neck with a
// collar, a ground-glass stopper 64 across of which 44 shows above the neck — 228 in all — and the core stands the
// whole of it at 0.6434 of that (core/bottle.js LIFE), which is what makes it 147 mm and 100 ml. Only the proportions
// matter on paper: everything below is that drawing scaled by k = w / 98, with w the width of the body.
export function drawBottle(g, b, cx, by, w, colour, level, seed = 1, opts = {}) {
  const k = w / 98;
  const U = (mm) => mm * k;
  const bodyH = U(126), footH = U(24), footW = U(106);
  const shoulderH = U(38), neckH = U(20), neckW = U(34), collarW = U(42), collarH = U(7);
  const stopH = U(44), stopW = U(64);
  const bodyY = by - bodyH;                       // top of the body = where the shoulder starts
  const neckTop = bodyY - shoulderH - neckH;      // top of the neck, where the stopper sits
  const x = cx - w / 2;

  // --- the silhouette of the glass: foot, body, shoulder, neck --------------------------------------------------
  // every point carries the way its edge faces, so the ink line thickens where the light leaves the glass
  const P = (px, py, nx, ny) => ({ x: px, y: py, nx, ny });
  const side = (s) => {                            // s = -1 left, +1 right
    const p = [];
    const dense = (x0, y0, x1, y1, nx, ny, n) => { for (let i = 1; i < n; i++) p.push(P(x0 + (x1 - x0) * (i / n), y0 + (y1 - y0) * (i / n), nx, ny)); };
    p.push(P(cx + s * (footW / 2), by, s, 1));
    dense(cx + s * (footW / 2), by, cx + s * (footW / 2), by - footH * 0.78, s, 0.2, 3);
    p.push(P(cx + s * (footW / 2), by - footH * 0.78, s, 0));
    p.push(P(cx + s * (w / 2), by - footH, s, 0));
    dense(cx + s * (w / 2), by - footH, cx + s * (w / 2), bodyY, s, 0, 9);
    p.push(P(cx + s * (w / 2), bodyY, s, 0));
    for (let i = 1; i <= 5; i++) {                 // the shoulder: a soft curve from the body to the neck
      const t = i / 6;
      const ease = t * t * (3 - 2 * t);
      p.push(P(cx + s * (w / 2 + (neckW / 2 - w / 2) * ease), bodyY - shoulderH * t, s * 0.8, -0.6));
    }
    p.push(P(cx + s * (neckW / 2), bodyY - shoulderH, s * 0.7, -0.5));
    dense(cx + s * (neckW / 2), bodyY - shoulderH, cx + s * (neckW / 2), neckTop, s, 0, 3);
    p.push(P(cx + s * (neckW / 2), neckTop, s, -0.4));
    return p;
  };
  const glass = [...side(-1), ...side(1).reverse()];

  // --- the stopper: a ground-glass drop ------------------------------------------------------------------------
  const stopper = [];
  const halfAt = (t) => U(11) + (stopW / 2 - U(11)) * Math.sin(Math.PI * Math.min(1, 0.18 + t * 0.92));
  for (let i = 0; i <= 13; i++) {
    const t = i / 13;
    stopper.push(P(cx - halfAt(t), neckTop - stopH * t, -1, t > 0.75 ? -0.8 : 0.1));
  }
  for (let i = 13; i >= 0; i--) {
    const t = i / 13;
    stopper.push(P(cx + halfAt(t), neckTop - stopH * t, 1, t > 0.75 ? -0.8 : 0.1));
  }

  const off = Math.max(1.6, 3.4 * k * 1.07);
  if (!opts.noShadow) shadowUnder(g, b, cx, by, footW);
  rims(g, b, glass, { x: cx - footW / 2, y: neckTop, w: footW, h: by - neckTop }, off, seed);
  rims(g, b, stopper, { x: cx - stopW / 2, y: neckTop - stopH, w: stopW, h: stopH }, off * 0.8, seed + 3);

  // --- the glass ------------------------------------------------------------------------------------------------
  g.save();
  pathOf(g, glass); g.clip();
  threeValues(g, b, { x: cx - footW / 2, y: neckTop, w: footW, h: by - neckTop }, GLASS, seed, { noFloor: true });

  // the scent inside: it stands below the shoulder, and rises with the blend
  const inset = U(7);
  const floor = by - footH + inset * 0.4;                 // the glass slab at the bottom is solid
  const ceiling = bodyY - U(8);                           // never up into the shoulder
  const lh = Math.max(0, Math.min(1, level)) * (floor - ceiling);
  if (lh > 0.8) {
    const ly = floor - lh;
    g.save();
    g.beginPath(); g.rect(x - w, ly, w * 3, floor - ly); g.clip();
    threeValues(g, b, { x, y: ly, w, h: floor - ly }, throughGlass(colour), seed + 5);
    g.restore();
    g.globalAlpha = 0.85;                                  // the surface of the scent, painted in one stroke
    g.drawImage(tint(b.thin2.hard, mixHex(colour, '#fff6e2', 0.6), 'men'), x - w * 0.05, ly - U(3), w * 1.1, U(6));
    g.globalAlpha = 1;
  }

  // the slab of glass at the bottom: lighter where it is thick, with a lit edge along the very bottom
  g.globalAlpha = 0.5;
  g.drawImage(tint(b.flat1.soft, GLASS.light, 'foot'), cx - footW / 2, by - footH, footW, footH * 0.9);
  g.globalAlpha = 0.9;
  g.drawImage(tint(b.thin.hard, mixHex(GLASS.light, '#fff6e2', 0.5), 'footlit'), cx - footW / 2, by - U(6), footW, U(5));
  // thick glass reads darker down the shaded side
  g.globalAlpha = 0.55;
  g.drawImage(tint(rotate(b.thin.hard, 1), '#03090b', 'edgeV'), x + w - U(12), bodyY, U(12), bodyH - footH);
  g.globalAlpha = 1;
  g.restore();

  // --- the label: layout D, the square, the season's own (see LABEL_URL) -------------------------------------------
  // 90 on a body 98 across, so 4 of glass shows each side, and centred on the straight part of the body between the
  // base and the shoulder, 6 clear above and below — placed exactly as the core places it on the 3D bottle.
  const lw = U(90), lhgt = U(90);
  const lx = cx - lw / 2, lyy = by - footH - U(6) - lhgt;
  const art = opts.season && b.labels ? b.labels[opts.season] : null;
  {
    // the label itself, then the scene's paint laid lightly over it (the same three values the glass has), cut to
    // the torn edge of the paper, so it sits in the picture instead of on top of it
    const c = canvas(Math.ceil(lw), Math.ceil(lhgt)), cg = c.getContext('2d');
    cg.imageSmoothingQuality = 'high';
    if (art) cg.drawImage(art, 0, 0, c.width, c.height);
    else threeValues(cg, b, { x: 0, y: 0, w: c.width, h: c.height }, LABEL, seed + 9, { noFloor: true });
    cg.globalCompositeOperation = 'multiply';
    cg.globalAlpha = 0.3;
    threeValues(cg, b, { x: 0, y: 0, w: c.width, h: c.height }, LABEL, seed + 9, { noFloor: true });
    cg.globalAlpha = 0.22;                                 // the side away from the light
    cg.drawImage(tint(rotate(b.thin.hard, 1), '#6b5a44', 'lshade'), c.width * 0.72, 0, c.width * 0.3, c.height);
    if (art) { cg.globalCompositeOperation = 'destination-in'; cg.globalAlpha = 1; cg.drawImage(art, 0, 0, c.width, c.height); }
    g.drawImage(c, lx, lyy);
  }
  // The words the page keeps over it (layout rule 12), only when the season's name printed on it is at least as
  // large as the reading rules allow a label to be (13 px). Smaller than that it is a detail of the picture, like the
  // label on a bottle across the street, and there is nothing to read. The name's capitals stand 0.054 of the label
  // tall (measured on the files), which is a font of about 0.08 of it.
  const fontPx = lhgt * 0.26, capsPx = lhgt * 0.08;
  const lettered = !!(opts.letters && art && capsPx >= 13);

  // --- light down the glass --------------------------------------------------------------------------------------
  highlight(g, b, x + U(4), bodyY + U(6), U(12), bodyH - U(30));
  highlight(g, b, x + w - U(26), bodyY + U(16), U(6), U(34), 0.45);

  // --- the collar at the top of the neck -------------------------------------------------------------------------
  const collar = rrPoints(cx - collarW / 2, neckTop, collarW, collarH, U(2), 2);
  g.save();
  pathOf(g, collar); g.clip();
  threeValues(g, b, { x: cx - collarW / 2, y: neckTop, w: collarW, h: collarH }, GLASS, seed + 13, { noFloor: true });
  g.restore();
  inkOutline(g, collar, Math.max(0.7, 1.3 * k), seed + 17, 0.8);

  // --- the stopper -----------------------------------------------------------------------------------------------
  g.save();
  pathOf(g, stopper); g.clip();
  threeValues(g, b, { x: cx - stopW / 2, y: neckTop - stopH, w: stopW, h: stopH }, GLASS, seed + 19, { noFloor: true });
  highlight(g, b, cx - U(18), neckTop - stopH + U(6), U(9), stopH * 0.6, 0.9);
  g.restore();
  inkOutline(g, stopper, Math.max(1, 2.2 * k), seed + 23);
  inkOutline(g, glass, Math.max(1, 2.6 * k), seed + 29);
  if (!opts.noSketch) {
    sketchLoops(g, glass, off * 1.6, seed);
    sketchLoops(g, stopper, off * 1.2, seed + 1, 0.7);
  }
  return {
    x: lx + lw * LABEL_WORDS.x0, y: lyy + lhgt * LABEL_WORDS.y0,
    w: lw * (LABEL_WORDS.x1 - LABEL_WORDS.x0), h: lhgt * (LABEL_WORDS.y1 - LABEL_WORDS.y0),
    fontPx, capsPx, letters: lettered,
  };
}

// (No arrow is drawn here any more: the word beside the bottle and the arrow that pointed at it came off the page
// on 21/9 — Mike kept the white line round the bottle, which is the core's, and asked for a bigger bottle instead.)

// A 2 ml vial with a cork, painted the same way.
export function drawVial(g, b, cx, by, w, colour, level, seed = 1) {
  const h = w * 3.1, bodyH = h * 0.78, x = cx - w / 2, bodyY = by - bodyH, rad = w * 0.45;
  const body = rrPoints(x, bodyY, w, bodyH, rad, 6);
  const off = Math.max(1.4, w * 0.07);
  shadowUnder(g, b, cx, by, w * 1.3);
  rims(g, b, body, { x, y: bodyY, w, h: bodyH }, off, seed);
  g.save();
  pathOf(g, body); g.clip();
  threeValues(g, b, { x, y: bodyY, w, h: bodyH }, GLASS, seed, { noFloor: true });
  const lh = level * (bodyH - 4);
  g.save();
  g.beginPath(); g.rect(x, by - 2 - lh, w, lh + 4); g.clip();
  threeValues(g, b, { x, y: by - 2 - lh, w, h: lh + 2 }, throughGlass(colour), seed + 5);
  g.restore();
  g.restore();
  highlight(g, b, x + w * 0.16, bodyY + bodyH * 0.1, w * 0.22, bodyH * 0.7);
  inkOutline(g, body, Math.max(1, w * 0.07), seed + 3);
  // lacquered cap, as the bottle's
  const cw = w * 0.9, ch = h * 0.16, cy = bodyY - ch * 0.8;
  const capP = rrPoints(cx - cw / 2, cy, cw, ch, cw * 0.14, 3);
  rims(g, b, capP, { x: cx - cw / 2, y: cy, w: cw, h: ch }, off * 0.8, seed + 5);
  g.save();
  pathOf(g, capP); g.clip();
  threeValues(g, b, { x: cx - cw / 2, y: cy, w: cw, h: ch }, GOLD, seed + 7);
  highlight(g, b, cx - cw * 0.3, cy + ch * 0.15, cw * 0.18, ch * 0.6, 0.8);
  g.restore();
  inkOutline(g, capP, Math.max(0.9, w * 0.06), seed + 9);
  sketchLoops(g, body, off * 1.5, seed, 0.7);
}

// A resting jar on the atelier shelf.
function drawJar(g, b, cx, by, w, h, fill, seed) {
  const x = cx - w / 2, y = by - h;
  const body = rrPoints(x, y, w, h, w * 0.2, 5);
  const off = Math.max(1.4, w * 0.04);
  shadowUnder(g, b, cx, by, w);
  rims(g, b, body, { x, y, w, h }, off, seed);
  g.save();
  pathOf(g, body); g.clip();
  threeValues(g, b, { x, y, w, h }, GLASS, seed, { noFloor: true });
  const ly = y + h * fill;
  g.save(); g.beginPath(); g.rect(x, ly, w, by - ly); g.clip();
  threeValues(g, b, { x, y: ly, w, h: by - ly }, throughGlass('#c7955e'), seed + 3);
  g.restore();
  g.restore();
  highlight(g, b, x + w * 0.14, y + h * 0.12, w * 0.12, h * 0.7, 0.85);
  inkOutline(g, body, Math.max(1, w * 0.03), seed + 5);
  // lid: a strip of waxed paper tied round
  const lw = w * 1.1, lh = h * 0.15, lx = cx - lw / 2, lyy = y - lh * 0.55;
  const lid = rrPoints(lx, lyy, lw, lh, lh * 0.3, 2);
  g.save(); pathOf(g, lid); g.clip();
  threeValues(g, b, { x: lx, y: lyy, w: lw, h: lh }, LABEL, seed + 7, { noFloor: true });
  g.restore();
  inkOutline(g, lid, Math.max(0.8, w * 0.025), seed + 9);
  // the batch number, as hand dots on a paper tag
  const tw = w * 0.5, th = h * 0.22, tx = cx - tw / 2, ty = y + h * 0.42;
  const tag = rrPoints(tx, ty, tw, th, 1, 1);
  g.save(); pathOf(g, tag); g.clip();
  threeValues(g, b, { x: tx, y: ty, w: tw, h: th }, LABEL, seed + 11, { noFloor: true });
  g.restore();
  g.fillStyle = INK;
  for (let d = 0; d <= seed % 3; d++) { g.beginPath(); g.arc(cx - tw * 0.2 + d * tw * 0.2, ty + th * 0.5, Math.max(1.2, w * 0.025), 0, 7); g.fill(); }
  sketchLoops(g, body, off * 1.6, seed, 0.6);
}

// A painted plank (shelf, workbench): three values of wood, ink under the front edge.
function drawPlank(g, b, x, y, w, h, seed) {
  const box = rrPoints(x, y, w, h, Math.min(4, h * 0.2), 2);
  rims(g, b, box, { x, y, w, h }, Math.max(1.5, h * 0.08), seed);
  g.save();
  pathOf(g, box); g.clip();
  threeValues(g, b, { x, y, w, h }, WOOD, seed);
  g.globalAlpha = 0.45;
  g.drawImage(tint(b.dry.soft, WOOD.light, 'woodL'), x, y, w, h * 0.45);
  g.drawImage(tint(b.hatch.soft, WOOD.shade, 'woodS'), x + w * 0.1, y + h * 0.4, w * 0.8, h * 0.6);
  g.restore();
  inkOutline(g, box, Math.max(1, h * 0.06), seed + 3);
  sketchLoops(g, box, 4, seed, 0.55);
}

// The four season colours laid side by side under their bottles, bleeding into each other by amount.
// Positions are fixed per stroke (seeded), so moving a slider only changes how much paint there is, never jitters.
export function drawBand(g, b, W, H, xs, values, yMid) {
  const R = rng(20260917);
  const plan = SEASONS.map(() => Array.from({ length: 7 }, () => [R(), R(), R(), R()]));
  const names = ['flat0', 'flat1', 'flat2', 'dryWide', 'mid', 'flat3', 'dry'];
  g.save();
  g.globalCompositeOperation = 'multiply';
  SEASONS.forEach((s, i) => {
    const v = Math.max(0, Math.min(100, values[s])) / 100;
    if (v <= 0) return;
    const col = PAINT[s];
    plan[i].forEach(([a, c, d, e], k) => {
      const st = b[names[k]];
      const spread = (0.05 + 0.16 * v) * W;
      const cx = xs[i] + (a - 0.5) * 2 * spread;
      const w = (0.14 + 0.2 * v) * W * (0.7 + 0.5 * c);
      const hh = (14 + 46 * v) * (0.7 + 0.6 * d) * (H / 360);
      const cy = yMid + (e - 0.5) * (18 + 40 * v) * (H / 360);
      g.globalAlpha = (0.16 + 0.5 * v) * (k < 3 ? 1 : 0.7);
      g.drawImage(tint(st.soft, col, `${names[k]}`), cx - w / 2, cy - hh / 2, w, hh);
    });
  });
  g.restore();
}

// The atelier still life: a shelf of resting jars over a workbench with the four bottles.
// Returns the four bottles' label boxes (the page keeps "Chớm" in the document there when it is drawn).
// The same picture in small steps (a generator): the page paints a few steps per frame so no frame gets heavy.
// Its return value is the four bottles' label boxes.
export function* drawAtelierSteps(g, b, W, H, opts = {}) {
  const R = rng(99);
  g.clearRect(0, 0, W, H);
  // window light on the wall
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.globalAlpha = 0.3;
  g.drawImage(tint(b.dryWide.soft, '#e2c49a', 'wallA'), W * 0.02, 0, W * 0.96, H * 0.55);
  g.globalAlpha = 0.22;
  g.drawImage(tint(b.flat2.soft, '#d4b38c', 'wallB'), W * 0.08, H * 0.3, W * 0.9, H * 0.35);
  g.restore();
  yield;
  const shelfY = H * 0.38;
  drawPlank(g, b, W * 0.03, shelfY, W * 0.94, Math.max(10, H * 0.045), 5);
  yield;
  const jw = Math.min(W * 0.085, H * 0.2);
  for (let i = 0; i < 6; i++) {
    const w = jw * (0.9 + R() * 0.25);
    drawJar(g, b, W * (0.12 + i * 0.152), shelfY, w, w * (1.1 + R() * 0.3), 0.25 + R() * 0.25, 40 + i);
    yield;
  }
  const benchY = H * 0.86;
  drawPlank(g, b, -W * 0.02, benchY, W * 1.04, H * 0.12, 9);
  yield;
  const bw = Math.min(W * 0.13, H * 0.28);
  const labels = [];
  for (let i = 0; i < SEASONS.length; i++) {
    const s = SEASONS[i];
    labels.push(drawBottle(g, b, W * (0.2 + i * 0.2), benchY + 2, bw, PAINT[s], 0.8, 11 + i, { letters: opts.letters, season: s }));
    if (i < SEASONS.length - 1) yield;
  }
  return labels;
}

// All at once.
export function drawAtelier(g, b, W, H, opts = {}) {
  const it = drawAtelierSteps(g, b, W, H, opts);
  for (;;) { const r = it.next(); if (r.done) return r.value; }
}

// A bottle resting in its shipping crate: three weeks of rest, then Hanoi to the world.
export function drawCrate(g, b, W, H) {
  g.clearRect(0, 0, W, H);
  const cw = Math.min(W * 0.78, H * 1.5), ch = cw * 0.42;
  const cx = W / 2, by = H * 0.95;
  const x = cx - cw / 2, top = by - ch;
  shadowUnder(g, b, cx, by, cw * 0.9);
  // back wall of the crate
  drawPlank(g, b, x + cw * 0.04, top - ch * 0.28, cw * 0.92, ch * 0.5, 71);
  // straw
  g.save();
  g.globalAlpha = 0.9;
  for (let i = 0; i < 5; i++) g.drawImage(tint(b.hatch.hard, i % 2 ? '#d9b56a' : '#b8913f', `straw${i % 2}`), x + cw * (0.02 + i * 0.18), top - ch * 0.12, cw * 0.3, ch * 0.4);
  g.restore();
  // the bottle, and a sampler vial beside it
  const bw = Math.min(cw * 0.26, H * 0.34);
  drawBottle(g, b, cx - cw * 0.08, top + ch * 0.5, bw, PAINT.xuan, 0.78, 81, { noShadow: true, season: 'xuan' });
  drawVial(g, b, cx + cw * 0.22, top + ch * 0.45, bw * 0.28, PAINT.dong, 0.8, 83);
  // front of the crate, with a paper shipping tag
  drawPlank(g, b, x, top + ch * 0.18, cw, ch * 0.42, 73);
  drawPlank(g, b, x, top + ch * 0.58, cw, ch * 0.42, 75);
  const tw = cw * 0.2, th = ch * 0.3, tx = x + cw * 0.72, ty = top + ch * 0.4;
  const tag = rrPoints(tx, ty, tw, th, 2, 1);
  g.save(); pathOf(g, tag); g.clip();
  threeValues(g, b, { x: tx, y: ty, w: tw, h: th }, LABEL, 77, { noFloor: true });
  g.restore();
  g.save();
  g.globalAlpha = 0.8;
  g.drawImage(tint(b.thin.hard, INK, 'markI'), tx + tw * 0.15, ty + th * 0.22, tw * 0.7, th * 0.22);
  g.drawImage(tint(b.thin2.hard, INK, 'markI2'), tx + tw * 0.15, ty + th * 0.58, tw * 0.5, th * 0.16);
  g.restore();
  inkOutline(g, tag, 1.1, 79, 0.7);
}

// The sampler: four vials on a small stand.
export function drawSampler(g, b, W, H) {
  g.clearRect(0, 0, W, H);
  const vw = Math.min(W * 0.085, H * 0.26);
  const standY = H * 0.9;
  drawPlank(g, b, W * 0.1, standY, W * 0.8, Math.max(8, H * 0.07), 61);
  SEASONS.forEach((s, i) => drawVial(g, b, W * (0.23 + i * 0.18), standY + 1, vw, PAINT[s], 0.8, 51 + i));
}

// The four season strokes, as the waiting screen painted them: the page ends where it began.
export function drawSwatch(g, b, W, H) {
  g.clearRect(0, 0, W, H);
  const names = ['flat0', 'flat2', 'flat1', 'flat3'];
  const bandH = (H / 4) * 1.45;
  SEASONS.forEach((s, i) => {
    const st = b[names[i]];
    const y = (i * (H - bandH)) / 3;
    g.globalAlpha = 1;
    g.drawImage(tint(st.soft, PAINT[s], `load-${names[i]}`), 0, y, W, bandH);
    g.globalAlpha = 0.55;
    g.drawImage(tint(st.hard, PAINT[s], `loadh-${names[i]}`), 0, y, W, bandH);
  });
  g.globalAlpha = 1;
}
