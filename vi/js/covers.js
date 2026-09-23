/* covers.js: every picture on the records, drawn with canvas. No images.
   One house style (Shocking Mike Records): a stone / teal / night / lilac family,
   Archivo for the sleeve type, JetBrains Mono for catalogue numbers. */

export const PAL = {
  bg: '#1c1b1f',
  stone: '#d5d0c3', stoneDeep: '#c4bfb1', ink: '#17161a',
  ultra: '#3a4dd0', ultraDeep: '#27358f',
  teal: '#0f5652', tealDeep: '#0b403d', sage: '#e3e8d8', mustard: '#e0b03e',
  night: '#141317', charcoal: '#212026', gold: '#caa760', goldHi: '#e8cf8f', paper: '#e2dccd',
  lilac: '#b9b0e3', lilacDeep: '#9d93cf', plum: '#2b2442'
};

const SANS = 'Archivo';
const MONO = '"JetBrains Mono"';
const SERIF = 'Newsreader';

function make(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  return { c, ctx };
}

/** Seeded random, so every load draws the same grain (no shimmer between reloads). */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function font(ctx, weight, px, family = SANS, stretch = 'normal', spacing = 0) {
  ctx.font = `${weight} ${px}px ${family}`;
  try { ctx.fontStretch = stretch; } catch { /* older engines */ }
  try { ctx.letterSpacing = `${spacing}px`; } catch { /* ignore */ }
}

/** Fine paper fibre: tiny light/dark specks, drawn once per sheet. */
function grain(ctx, w, h, amount, seed = 7) {
  const r = rng(seed);
  const n = Math.floor(w * h * 0.018);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h;
    const light = r() > 0.5;
    ctx.fillStyle = light ? `rgba(255,255,255,${amount * r()})` : `rgba(0,0,0,${amount * r()})`;
    ctx.fillRect(x, y, 1 + r() * 1.6, 1);
  }
}

function wrapText(ctx, text, maxW) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const cand = line ? `${line} ${w}` : w;
    if (ctx.measureText(cand).width > maxW && line) { lines.push(line); line = w; } else line = cand;
  }
  if (line) lines.push(line);
  return lines;
}

/** A small label stuck on the shrink-wrap (printed into the cover, with its own soft shadow). */
function wrapSticker(ctx, S, text, x, y, w, rot = 0.05) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  font(ctx, 600, S * 0.024, SANS, 'normal', S * 0.001);
  const lines = wrapText(ctx, text, w - S * 0.04);
  const lh = S * 0.03;
  const h = lines.length * lh + S * 0.03;
  ctx.shadowColor = 'rgba(0,0,0,0.22)'; ctx.shadowBlur = S * 0.012; ctx.shadowOffsetY = S * 0.004;
  ctx.fillStyle = '#f4f2ec';
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, S * 0.008); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#17161a';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  lines.forEach((l, i) => ctx.fillText(l, S * 0.02, S * 0.015 + lh * (i + 0.8)));
  ctx.restore();
}

/* ---------- shared data maps ---------- */

/** Grey noise for bumpMap: paper tooth. */
export function paperBump(size = 512) {
  const { c, ctx } = make(size);
  const img = ctx.createImageData(size, size);
  const r = rng(11);
  for (let i = 0; i < size * size; i++) {
    const v = 118 + (r() + r() + r() - 1.5) * 60;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Shrink-wrap: long soft wrinkles in the roughness channel (green). */
export function wrapRough(size = 512) {
  const { c, ctx } = make(size);
  ctx.fillStyle = 'rgb(0,40,0)';
  ctx.fillRect(0, 0, size, size);
  const r = rng(23);
  for (let i = 0; i < 26; i++) {
    const y = r() * size;
    const g = ctx.createLinearGradient(0, y - 18, 0, y + 18);
    const v = Math.floor(60 + r() * 120);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, `rgba(0,${v},0,0.55)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(size / 2, y);
    ctx.rotate((r() - 0.5) * 0.5);
    ctx.fillRect(-size, -18, size * 2, 36);
    ctx.restore();
  }
  return c;
}

/** Vinyl grooves as roughness (green): music bands slightly rough, the gaps between tracks glassy. */
export function grooveRough(size, labelR, tracks = 5) {
  const { c, ctx } = make(size);
  const cx = size / 2, R = size / 2;
  ctx.fillStyle = 'rgb(0,90,0)';
  ctx.fillRect(0, 0, size, size);
  const inner = labelR * R + R * 0.035, outer = R * 0.975;
  const band = (outer - inner) / tracks;
  for (let r = outer; r > inner; r -= 1.25) {
    const k = Math.floor((outer - r) / band);
    const inBand = (outer - r) - k * band;
    const gap = inBand < R * 0.012;
    const v = gap ? 22 : 58 + ((r * 7.3) % 1) * 34;
    ctx.strokeStyle = `rgb(0,${Math.floor(v)},0)`;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(cx, cx, r, 0, Math.PI * 2); ctx.stroke();
  }
  // run-out groove area: glassy; the paper label: matt
  ctx.fillStyle = 'rgb(0,30,0)';
  ctx.beginPath(); ctx.arc(cx, cx, inner, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgb(0,225,0)';
  ctx.beginPath(); ctx.arc(cx, cx, labelR * R, 0, Math.PI * 2); ctx.fill();
  return c;
}

/** Groove direction for anisotropic light: RG = the groove's tangent (runs round the disc),
    B = strength (full on the music, half on the gaps, none on the label). */
export function grooveDirection(size, labelR, tracks = 5) {
  const { c, ctx } = make(size);
  const img = ctx.createImageData(size, size);
  const R = size / 2;
  const inner = labelR + 0.035, outer = 0.975;
  const band = (outer - inner) / tracks;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const du = (x + 0.5) / size - 0.5, dv = 0.5 - (y + 0.5) / size;
      const r = Math.hypot(du, dv) / 0.5;
      let tx = -dv, ty = du;
      const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      let b = 0;
      if (r > inner && r < 1) {
        const k = (outer - r) / band;
        const gap = (k - Math.floor(k)) * band < 0.012;
        b = gap ? 110 : 255;
      }
      const i = (y * size + x) * 4;
      img.data[i] = Math.round((tx * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round((ty * 0.5 + 0.5) * 255);
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Disc colour map: vinyl, faint ring shading, the centre label. */
export function discMap(size, { vinyl, ringLight, labelR, label, labelInk, name, cat, sub, tracks = 5, clear = false }) {
  const { c, ctx } = make(size);
  const cx = size / 2, R = size / 2;
  ctx.fillStyle = vinyl;
  ctx.fillRect(0, 0, size, size);
  const inner = labelR * R + R * 0.035, outer = R * 0.975;
  const band = (outer - inner) / tracks;
  for (let r = outer; r > inner; r -= 2.2) {
    const k = Math.floor((outer - r) / band);
    const gap = (outer - r) - k * band < R * 0.012;
    ctx.strokeStyle = gap ? ringLight.replace('A', clear ? '0.06' : '0.02') : ringLight.replace('A', (0.06 + ((r * 3.1) % 1) * 0.08).toFixed(3));
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(cx, cx, r, 0, Math.PI * 2); ctx.stroke();
  }
  // lip at the rim
  ctx.strokeStyle = ringLight.replace('A', '0.18');
  ctx.lineWidth = R * 0.02;
  ctx.beginPath(); ctx.arc(cx, cx, R * 0.99, 0, Math.PI * 2); ctx.stroke();
  // label
  const lr = labelR * R;
  ctx.fillStyle = label;
  ctx.beginPath(); ctx.arc(cx, cx, lr, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cx, lr, 0, Math.PI * 2); ctx.clip();
  grain(ctx, size, size, 0.05, 3);
  ctx.restore();
  ctx.fillStyle = labelInk;
  ctx.textAlign = 'center';
  font(ctx, 800, lr * 0.26, SANS, 'expanded', lr * 0.01);
  ctx.fillText(name.toUpperCase(), cx, cx - lr * 0.34);
  font(ctx, 500, lr * 0.1, MONO, 'normal', lr * 0.008);
  ctx.fillText(cat, cx, cx + lr * 0.4);
  if (sub) { font(ctx, 500, lr * 0.09, SANS, 'normal', lr * 0.01); ctx.fillText(sub, cx, cx + lr * 0.58); }
  ctx.fillText('MẶT A', cx, cx - lr * 0.7);
  // spindle hole
  ctx.fillStyle = '#060607';
  ctx.beginPath(); ctx.arc(cx, cx, R * 0.024, 0, Math.PI * 2); ctx.fill();
  return c;
}

/* ---------- sleeve fronts (top face in the stack) ---------- */

function smallCaps(ctx, S, color, left, right, y = 0.075) {
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  font(ctx, 600, S * 0.022, SANS, 'semi-expanded', S * 0.004);
  ctx.textAlign = 'left';
  ctx.fillText(left, S * 0.07, S * y);
  font(ctx, 500, S * 0.022, MONO, 'normal', S * 0.002);
  ctx.textAlign = 'right';
  ctx.fillText(right, S * 0.93, S * y);
}

export function singleCover(S = 1024, sticker = '') {
  const { c, ctx } = make(S);
  ctx.fillStyle = PAL.stone; ctx.fillRect(0, 0, S, S);
  grain(ctx, S, S, 0.06, 5);
  // one big hit
  ctx.fillStyle = PAL.ultra;
  ctx.beginPath(); ctx.arc(S * 0.6, S * 0.43, S * 0.29, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PAL.stone;
  ctx.beginPath(); ctx.arc(S * 0.6, S * 0.43, S * 0.012, 0, Math.PI * 2); ctx.fill();
  // one thin line under it
  ctx.fillStyle = PAL.ink; ctx.fillRect(S * 0.07, S * 0.8, S * 0.86, S * 0.0035);
  smallCaps(ctx, S, PAL.ink, 'SHOCKING MIKE RECORDS', 'SMR 001');
  ctx.fillStyle = PAL.ink;
  ctx.textAlign = 'left';
  ctx.font = `italic 400 ${S * 0.052}px ${SERIF}`;
  ctx.fillText('Mở hàng', S * 0.07, S * 0.775);
  font(ctx, 800, S * 0.105, SANS, 'expanded', -S * 0.002);
  ctx.fillText('SINGLE', S * 0.064, S * 0.925);
  font(ctx, 500, S * 0.024, MONO);
  ctx.textAlign = 'right';
  ctx.fillText('33⅓', S * 0.93, S * 0.925);
  if (sticker) wrapSticker(ctx, S, sticker, S * 0.66, S * 0.1, S * 0.27, 0.04);
  return c;
}

export function albumCover(S = 1024, sticker = '') {
  const { c, ctx } = make(S);
  ctx.fillStyle = PAL.teal; ctx.fillRect(0, 0, S, S);
  grain(ctx, S, S, 0.07, 9);
  // side A rising: grooves as a half sun
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, S, S); ctx.clip();
  const cx = S * 0.64, cy = S * 1.0;
  for (let i = 0; i < 17; i++) {
    const r = S * (0.1 + i * 0.034);
    ctx.strokeStyle = PAL.mustard;
    ctx.globalAlpha = i % 4 === 3 ? 0.35 : 1;
    ctx.lineWidth = S * (i % 4 === 3 ? 0.003 : 0.009);
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAL.mustard;
  ctx.beginPath(); ctx.arc(cx, cy, S * 0.07, Math.PI, Math.PI * 2); ctx.fill();
  ctx.restore();
  smallCaps(ctx, S, PAL.sage, 'SHOCKING MIKE RECORDS', 'SMR 002');
  // the name runs up the left edge
  ctx.save();
  ctx.translate(S * 0.2, S * 0.93);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = PAL.sage;
  ctx.textAlign = 'left';
  font(ctx, 900, S * 0.19, SANS, 'condensed', -S * 0.002);
  ctx.fillText('ALBUM', 0, 0);
  ctx.restore();
  ctx.fillStyle = PAL.sage;
  font(ctx, 500, S * 0.022, SANS, 'semi-expanded', S * 0.004);
  ctx.textAlign = 'right';
  ctx.fillText('MẶT A  ·  MẶT B', S * 0.93, S * 0.14);
  ctx.font = `italic 400 ${S * 0.056}px ${SERIF}`;
  ctx.fillText('Bài ẩn', S * 0.93, S * 0.215);
  if (sticker) wrapSticker(ctx, S, sticker, S * 0.3, S * 0.3, S * 0.25, -0.05);
  return c;
}

/** Box lid: colour map + foil mask (G = roughness, B = metalness, as three.js reads them). */
export function boxLid(S = 1024, sticker = '') {
  const col = make(S), msk = make(S);
  const a = col.ctx, m = msk.ctx;
  a.fillStyle = PAL.night; a.fillRect(0, 0, S, S);
  grain(a, S, S, 0.05, 13);
  m.fillStyle = 'rgb(0,200,0)'; m.fillRect(0, 0, S, S);
  const foil = (fn) => {
    a.fillStyle = PAL.gold; a.strokeStyle = PAL.gold; fn(a);
    m.fillStyle = 'rgb(0,70,255)'; m.strokeStyle = 'rgb(0,70,255)'; fn(m);
  };
  // border
  foil((x) => { x.lineWidth = S * 0.003; x.strokeRect(S * 0.045, S * 0.045, S * 0.91, S * 0.91); });
  // a whole world: 5 × 5 circles, one of them solid
  const n = 5, g0 = S * 0.16, step = S * 0.135, rr = S * 0.05;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = g0 + j * step, y = g0 + i * step;
    const solid = i === 1 && j === 3;
    foil((ctx) => {
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2);
      if (solid) ctx.fill(); else { ctx.lineWidth = S * 0.0035; ctx.stroke(); }
    });
  }
  foil((x) => {
    x.textBaseline = 'alphabetic';
    x.textAlign = 'left';
    font(x, 800, S * 0.078, SANS, 'expanded', S * 0.002);
    x.fillText('BOX SET', S * 0.1, S * 0.9);
    x.textAlign = 'right';
    font(x, 500, S * 0.03, MONO);
    x.fillText('Nº 07 / 30', S * 0.9, S * 0.9);
    x.textAlign = 'left';
    x.font = `italic 400 ${S * 0.05}px ${SERIF}`;
    x.fillText('Toàn tập', S * 0.1, S * 0.815);
    font(x, 600, S * 0.02, SANS, 'semi-expanded', S * 0.004);
    x.textAlign = 'right';
    x.fillText('SHOCKING MIKE RECORDS', S * 0.9, S * 0.815);
  });
  if (sticker) wrapSticker(a, S, sticker, S * 0.7, S * 0.07, S * 0.22, 0.05);
  return { color: col.c, mask: msk.c };
}

/** 7-inch sleeve with a die-cut hole (transparent pixels). */
export function sevenCover(S = 1024, sticker = '') {
  const { c, ctx } = make(S);
  ctx.fillStyle = PAL.lilac; ctx.fillRect(0, 0, S, S);
  grain(ctx, S, S, 0.07, 17);
  const cx = S / 2, cy = S / 2;
  // twelve months around the hole
  ctx.strokeStyle = PAL.plum;
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
    const r0 = S * (i === 0 ? 0.25 : 0.265), r1 = S * 0.305;
    ctx.lineWidth = S * (i === 0 ? 0.012 : 0.005);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.fillStyle = PAL.plum;
  ctx.textAlign = 'left';
  font(ctx, 900, S * 0.13, SANS, 'expanded', -S * 0.002);
  ctx.fillText('CLUB', S * 0.07, S * 0.19);
  ctx.font = `italic 400 ${S * 0.05}px ${SERIF}`;
  ctx.fillText('Hội viên', S * 0.075, S * 0.26);
  font(ctx, 500, S * 0.034, MONO);
  ctx.textAlign = 'right';
  ctx.fillText('SMR 7-00', S * 0.93, S * 0.93);
  // die cut
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(cx, cy, S * 0.19, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  if (sticker) wrapSticker(ctx, S, sticker, S * 0.62, S * 0.08, S * 0.3, 0.05);
  return c;
}

/* ---------- backs and spines ---------- */

/** Back of a sleeve: paper, a hairline frame. The words are live HTML laid on top. */
export function backPaper(S, ground, line, { hole = 0, seed = 21 } = {}) {
  const { c, ctx } = make(S);
  ctx.fillStyle = ground; ctx.fillRect(0, 0, S, S);
  grain(ctx, S, S, 0.06, seed);
  ctx.strokeStyle = line; ctx.globalAlpha = 0.5; ctx.lineWidth = S * 0.002;
  ctx.strokeRect(S * 0.035, S * 0.035, S * 0.93, S * 0.93);
  ctx.globalAlpha = 1;
  if (hole) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S * hole, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  return c;
}

/** Back of a sleeve with its tracklist printed: what the client gets, and how long it takes.
    r = a record from order.js; label = LABEL from order.js. */
export function backPrinted(S, r, label, { ground, ink, accent, hole = 0, seed = 21 }) {
  const c = backPaper(S, ground, ink, { hole, seed });
  const ctx = c.getContext('2d');
  const L = S * 0.085, R = S * 0.915, W = R - L;
  ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic';
  font(ctx, 600, S * 0.02, SANS, 'semi-expanded', S * 0.004);
  ctx.textAlign = 'left'; ctx.fillText('SHOCKING MIKE RECORDS', L, S * 0.1);
  font(ctx, 500, S * 0.02, MONO); ctx.textAlign = 'right'; ctx.fillText(r.cat, R, S * 0.1);
  ctx.textAlign = 'left';
  let y = S * 0.19;
  ctx.fillStyle = accent;
  ctx.font = `500 ${S * 0.075}px ${SERIF}`;
  ctx.fillText(r.name, L, y);
  const nw = ctx.measureText(r.name).width;
  ctx.font = `italic 400 ${S * 0.04}px ${SERIF}`;
  ctx.fillText(r.gloss, L + nw + S * 0.02, y);
  ctx.fillStyle = ink;
  if (hole) {
    // 7-inch: words above and below the die-cut
    ctx.font = `italic 400 ${S * 0.03}px ${SERIF}`;
    wrapText(ctx, `“${r.tagline}”`, W).forEach((l, i) => ctx.fillText(l, L, S * 0.245 + i * S * 0.038));
    y = S * 0.76;
    font(ctx, 700, S * 0.02, SANS, 'semi-expanded', S * 0.005);
    ctx.fillText(r.listLabel.toUpperCase(), L, y);
    ctx.font = `400 ${S * 0.032}px ${SERIF}`;
    r.perks.forEach((p, i) => ctx.fillText(`—  ${p}`, L, y + S * 0.05 + i * S * 0.044));
    return c;
  }
  ctx.font = `italic 400 ${S * 0.032}px ${SERIF}`;
  const tl = wrapText(ctx, `“${r.tagline}”`, W * 0.9);
  tl.forEach((l, i) => ctx.fillText(l, L, S * 0.25 + i * S * 0.042));
  y = S * 0.25 + tl.length * S * 0.042 + S * 0.05;
  const side = (title, prefix, lines) => {
    font(ctx, 700, S * 0.02, SANS, 'semi-expanded', S * 0.005);
    ctx.fillStyle = ink;
    ctx.fillText(title.toUpperCase(), L, y);
    y += S * 0.05;
    lines.forEach((t, i) => {
      font(ctx, 500, S * 0.022, MONO);
      ctx.fillStyle = accent; ctx.fillText(`${prefix}${i + 1}`, L, y);
      ctx.fillStyle = ink; ctx.font = `400 ${S * 0.034}px ${SERIF}`;
      ctx.fillText(t, L + S * 0.07, y);
      y += S * 0.05;
    });
    y += S * 0.025;
  };
  side(label.sideA, 'A', r.sideA);
  side(label.sideB, 'B', r.sideB);
  ctx.fillStyle = ink; ctx.fillRect(L, S * 0.8, W * 0.62, Math.max(1, S * 0.0018));
  font(ctx, 700, S * 0.02, SANS, 'semi-expanded', S * 0.005);
  ctx.fillText(label.runtime.toUpperCase(), L, S * 0.845);
  ctx.font = `600 ${S * 0.034}px ${SERIF}`;
  ctx.fillText(r.runtime, L + S * 0.2, S * 0.845);
  // barcode + the line printed on every sleeve
  const bx = L, by = S * 0.875;
  const rr = rng(97);
  for (let x = 0; x < S * 0.12;) {
    const w = (1 + Math.floor(rr() * 3)) * (S / 1024);
    if (rr() > 0.4) ctx.fillRect(bx + x, by, w, S * 0.04);
    x += w + (S / 1024) * (1 + Math.floor(rr() * 2));
  }
  font(ctx, 500, S * 0.02, SANS, 'normal', S * 0.001);
  ctx.fillText(label.spec, L + S * 0.15, S * 0.9);
  return c;
}

/** Inside of the box lid: the set's contents printed on paper. */
export function lidInside(S, r, label) {
  return backPrinted(S, { ...r, name: r.coverTitle, gloss: `${r.name} · ${r.gloss}` }, label,
    { ground: PAL.paper, ink: PAL.ink, accent: PAL.ultraDeep, seed: 71 });
}

/** Spine strip, read from the front of the stack. */
export function spine(W, H, { ground, ink, name, gloss, cat, foil = false, crease = false }) {
  const { c, ctx } = make(W, H);
  ctx.fillStyle = ground; ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.08, 31);
  if (crease) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.fillStyle = foil ? PAL.gold : ink;
  ctx.textBaseline = 'middle';
  const y = H * 0.54;
  const px = Math.min(H * 0.5, 40);
  font(ctx, 500, px * 0.8, SANS, 'normal', px * 0.04);
  ctx.textAlign = 'left';
  ctx.fillText(gloss, W * 0.035, y);
  font(ctx, 800, px, SANS, 'expanded', px * 0.02);
  ctx.textAlign = 'center';
  ctx.fillText(name.toUpperCase(), W * 0.5, y);
  font(ctx, 500, px * 0.75, MONO);
  ctx.textAlign = 'right';
  ctx.fillText(cat, W * 0.965, y);
  return c;
}

/** Plain edge of board or paper. */
export function edge(W, H, ground, seed = 41) {
  const { c, ctx } = make(W, H);
  ctx.fillStyle = ground; ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.08, seed);
  return c;
}

/** Photo book inside the box: stone linen with an ink stamp and one ultramarine dot. */
export function bookCover(S = 512) {
  const { c, ctx } = make(S);
  ctx.fillStyle = PAL.stone; ctx.fillRect(0, 0, S, S);
  const r = rng(51);
  for (let i = 0; i < S; i += 2) { // linen weave
    ctx.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.04})`; ctx.fillRect(0, i, S, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.03})`; ctx.fillRect(i, 0, 1, S);
  }
  ctx.fillStyle = PAL.ultra;
  ctx.beginPath(); ctx.arc(S * 0.5, S * 0.36, S * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PAL.ink;
  ctx.textAlign = 'center';
  font(ctx, 800, S * 0.06, SANS, 'expanded', S * 0.004);
  ctx.fillText('SÁCH ẢNH', S / 2, S * 0.6);
  font(ctx, 500, S * 0.032, MONO);
  ctx.fillText('SMR 003 · Nº 07', S / 2, S * 0.67);
  return c;
}

/** Numbered card tucked in the box. */
export function numberCard(W = 512, H = 720) {
  const { c, ctx } = make(W, H);
  ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.05, 61);
  ctx.fillStyle = PAL.ink;
  ctx.textAlign = 'center';
  font(ctx, 500, W * 0.05, SANS, 'semi-expanded', W * 0.006);
  ctx.fillText('ẤN BẢN GIỚI HẠN', W / 2, H * 0.22);
  font(ctx, 800, W * 0.3, SANS, 'expanded');
  ctx.fillText('07', W / 2, H * 0.55);
  font(ctx, 500, W * 0.06, MONO);
  ctx.fillText('/ 30', W / 2, H * 0.66);
  ctx.fillRect(W * 0.3, H * 0.8, W * 0.4, 2);
  return c;
}

/* ======================= portfolio records (r4) ======================= */

const HOUSE = { band: '#17161a', ink: '#ece6d8', mute: '#a8a191' };

/** The label's house band along the bottom of every cover: number, name, label. */
function houseBand(ctx, S, rec) {
  const h = S * 0.082, y = S - h;
  ctx.fillStyle = HOUSE.band;
  ctx.fillRect(0, y, S, h);
  ctx.fillStyle = HOUSE.ink;
  ctx.textBaseline = 'middle';
  font(ctx, 500, S * 0.022, MONO, 'normal', S * 0.002);
  ctx.textAlign = 'left';
  ctx.fillText(rec.cat, S * 0.035, y + h / 2);
  font(ctx, 800, S * 0.028, SANS, 'expanded', S * 0.003);
  ctx.textAlign = 'left';
  ctx.fillText(rec.name.toUpperCase(), S * 0.155, y + h / 2);
  font(ctx, 600, S * 0.016, SANS, 'semi-expanded', S * 0.004);
  ctx.fillStyle = HOUSE.mute;
  ctx.textAlign = 'right';
  ctx.fillText('SHOCKING MIKE RECORDS', S * 0.965, y + h / 2);
  ctx.textBaseline = 'alphabetic';
}

/* The words on a sealed record's sticker come from the page (rec.soon). This is only the net underneath, for
   a tool that paints a cover without the page's words; each published copy keeps just its own line. */
const SOON = {
  
   vi: 'Sắp phát hành', 
};
export const soonLabel = (rec) => String((rec && rec.soon) || Object.values(SOON)[0] || '');

/** The two lines on that sticker, in the language of this copy of the site. */
function soonLines(rec) {
  const label = soonLabel(rec);
  const sp = label.indexOf(' ');
  return sp > 0 ? [label.slice(0, sp).toUpperCase(), label.slice(sp + 1)] : [label.toUpperCase(), ''];
}

/** A round sticker on the shrink-wrap of a sealed record. */
function sealSticker(ctx, S, x, y, r, lines, ground = '#e8c95a', ink = '#17161a') {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = S * 0.012; ctx.shadowOffsetY = S * 0.004;
  ctx.fillStyle = ground;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = ink; ctx.globalAlpha = 0.5; ctx.lineWidth = S * 0.0022;
  ctx.beginPath(); ctx.arc(x, y, r * 0.88, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  font(ctx, 800, r * 0.2, SANS, 'normal', r * 0.004);
  ctx.fillText(lines[0], x, y - r * 0.14);
  font(ctx, 500, r * 0.17, SANS, 'normal', 0);
  ctx.fillText(lines[1], x, y + r * 0.2);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

/** Cover made from a screenshot of the real site's first screen, plus the house band. */
export function photoCover(S, img, rec) {
  const { c, ctx } = make(S);
  ctx.drawImage(img, 0, 0, S, S);
  grain(ctx, S, S, 0.035, 101); // a breath of paper, so the print sits on board, not on a screen
  houseBand(ctx, S, rec);
  return c;
}

export function sealedCover(S, rec) {
  const { c, ctx } = make(S);
  const r = rng(rec.cat.length * 131 + rec.name.length);
  if (rec.id === 'kozo') {
    ctx.fillStyle = '#e2dfd7'; ctx.fillRect(0, 0, S, S);
    grain(ctx, S, S, 0.05, 111);
    ctx.strokeStyle = 'rgba(29,39,66,0.16)'; ctx.lineWidth = 1;
    for (let i = 1; i < 24; i++) {
      const p = (S / 24) * i;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, S * 0.918); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(S, p); ctx.stroke();
    }
    ctx.strokeStyle = '#1d2742'; ctx.lineWidth = S * 0.006;
    const u = S / 24, ox = 4 * u, oy = 6 * u;
    ctx.strokeRect(ox, oy, 16 * u, 11 * u);
    ctx.lineWidth = S * 0.003;
    ctx.beginPath();
    ctx.moveTo(ox + 7 * u, oy); ctx.lineTo(ox + 7 * u, oy + 5 * u);
    ctx.moveTo(ox + 7 * u, oy + 7 * u); ctx.lineTo(ox + 16 * u, oy + 7 * u);
    ctx.moveTo(ox, oy + 5 * u); ctx.lineTo(ox + 4 * u, oy + 5 * u);
    ctx.moveTo(ox + 11 * u, oy + 7 * u); ctx.lineTo(ox + 11 * u, oy + 11 * u);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(ox + 7 * u, oy + 7 * u, 2 * u, -Math.PI / 2, 0); ctx.stroke();
    ctx.fillStyle = '#1d2742'; ctx.textAlign = 'left';
    font(ctx, 800, S * 0.07, SANS, 'expanded', S * 0.004);
    ctx.fillText('STUDIO KŌZŌ', S * 0.07, S * 0.14);
    font(ctx, 500, S * 0.02, MONO);
    ctx.fillText('PLAN  1:100', S * 0.07, S * 0.185);
  } else if (rec.id === 'hadal') {
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, '#1d4a5c'); g.addColorStop(0.35, '#0e2733'); g.addColorStop(1, '#04090c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    grain(ctx, S, S, 0.04, 121);
    ctx.strokeStyle = 'rgba(159,221,227,0.25)'; ctx.lineWidth = 1;
    font(ctx, 500, S * 0.016, MONO);
    ['0 m', '200 m', '1 000 m', '4 000 m', '6 000 m', '10 994 m'].forEach((t, i) => {
      const y = S * (0.24 + i * 0.125);
      ctx.beginPath(); ctx.moveTo(S * 0.07, y); ctx.lineTo(S * 0.8, y); ctx.stroke();
      ctx.fillStyle = 'rgba(159,221,227,0.6)'; ctx.textAlign = 'right';
      ctx.fillText(t, S * 0.93, y + S * 0.006);
    });
    for (let i = 0; i < 26; i++) {
      const x = S * (0.1 + r() * 0.66), y = S * (0.5 + r() * 0.36), rr = S * (0.002 + r() * 0.006);
      const gl = ctx.createRadialGradient(x, y, 0, x, y, rr * 7);
      gl.addColorStop(0, 'rgba(170,255,240,0.9)'); gl.addColorStop(0.2, 'rgba(120,230,230,0.35)'); gl.addColorStop(1, 'rgba(120,230,230,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, rr * 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#c3e6ea'; ctx.textAlign = 'left';
    font(ctx, 800, S * 0.11, SANS, 'expanded', S * 0.01);
    ctx.fillText('HADAL', S * 0.07, S * 0.16);
  } else {
    ctx.fillStyle = '#121117'; ctx.fillRect(0, 0, S, S);
    grain(ctx, S, S, 0.04, 131);
    for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(255,248,230,${0.15 + r() * 0.5})`; ctx.fillRect(r() * S, r() * S * 0.9, 1.4, 1.4); }
    ctx.strokeStyle = '#e6d7b3'; ctx.lineWidth = S * 0.0025;
    ctx.beginPath(); ctx.ellipse(S * 0.52, S * 0.56, S * 0.36, S * 0.17, -0.35, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e8b85a';
    ctx.beginPath(); ctx.arc(S * 0.2, S * 0.68, S * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e6d7b3';
    ctx.beginPath(); ctx.arc(S * 0.84, S * 0.44, S * 0.012, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'left';
    font(ctx, 800, S * 0.08, SANS, 'expanded', S * 0.006);
    ctx.fillText('PERIHELION', S * 0.07, S * 0.16);
  }
  houseBand(ctx, S, rec);
  sealSticker(ctx, S, S * 0.8, S * 0.3, S * 0.1, soonLines(rec));
  return c;
}

/** Back of a sleeve: credits, printed small, like the back of a real record. */
export function backCredits(S, rec, en, { ground, ink, accent }) {
  const c = backPaper(S, ground, ink, { seed: 21 + rec.cat.length });
  const ctx = c.getContext('2d');
  const L = S * 0.085, R = S * 0.915;
  ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic';
  font(ctx, 600, S * 0.02, SANS, 'semi-expanded', S * 0.004);
  ctx.textAlign = 'left'; ctx.fillText('SHOCKING MIKE RECORDS', L, S * 0.1);
  font(ctx, 500, S * 0.02, MONO); ctx.textAlign = 'right'; ctx.fillText(rec.cat, R, S * 0.1);
  ctx.textAlign = 'left';
  ctx.fillStyle = accent;
  ctx.font = `600 ${S * 0.08}px ${SERIF}`;
  ctx.fillText(rec.name, L, S * 0.21);
  ctx.fillStyle = ink;
  ctx.font = `italic 400 ${S * 0.036}px ${SERIF}`;
  ctx.fillText(en.sub, L, S * 0.265);
  ctx.font = `400 ${S * 0.03}px ${SERIF}`;
  wrapText(ctx, en.story, (R - L) * 0.86).forEach((l, i) => ctx.fillText(l, L, S * 0.34 + i * S * 0.042));
  const rows = [['ROLE', en.role], ['BUILT WITH', en.tech], ['YEAR', en.year], ['STATUS', en.status]];
  rows.forEach(([k, v], i) => {
    const y = S * (0.64 + i * 0.05);
    ctx.globalAlpha = 0.35; ctx.fillRect(L, y - S * 0.032, R - L, 1); ctx.globalAlpha = 1;
    font(ctx, 700, S * 0.018, SANS, 'semi-expanded', S * 0.004);
    ctx.fillText(k, L, y);
    ctx.font = `400 ${S * 0.026}px ${SERIF}`;
    ctx.fillText(v, L + S * 0.2, y);
  });
  const rr = rng(97);
  for (let x = 0; x < S * 0.12;) {
    const w = (1 + Math.floor(rr() * 3)) * (S / 1024);
    if (rr() > 0.4) ctx.fillRect(L + x, S * 0.875, w, S * 0.04);
    x += w + (S / 1024) * (1 + Math.floor(rr() * 2));
  }
  font(ctx, 500, S * 0.02, SANS, 'normal', S * 0.001);
  ctx.fillText('Designed & built by Shocking Mike', L + S * 0.15, S * 0.9);
  return c;
}

/* ======================= the folded price flyer (r4) ======================= */
export const FLYER_PAPER = { ground: '#e6e8e3', ink: '#1c1b1f', accent: '#3a4dd0' };

/** One panel of the flyer: paper, a hairline frame, crease shading at the folds, a faint numeral.
    The words themselves are live HTML laid on top once the sheet is open. */
export function flyerPanel(W, H, k, n) {
  const { c, ctx } = make(W, H);
  const P = FLYER_PAPER;
  ctx.fillStyle = P.ground; ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.05, 140 + k);
  // crease: a soft band of shade and light on each fold line
  const band = (y, dir) => {
    const g = ctx.createLinearGradient(0, y, 0, y + dir * H * 0.12);
    g.addColorStop(0, 'rgba(0,0,0,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, Math.min(y, y + dir * H * 0.12), W, H * 0.12);
  };
  if (k > 0) band(0, 1);
  if (k < n - 1) band(H, -1);
  // hairline frame, broken at the folds like print on a folded sheet
  ctx.strokeStyle = 'rgba(28,27,31,0.35)'; ctx.lineWidth = Math.max(1, W / 900);
  const m = W * 0.045;
  ctx.beginPath();
  ctx.moveTo(m, k === 0 ? m : 0); ctx.lineTo(m, k === n - 1 ? H - m : H);
  ctx.moveTo(W - m, k === 0 ? m : 0); ctx.lineTo(W - m, k === n - 1 ? H - m : H);
  if (k === 0) { ctx.moveTo(m, m); ctx.lineTo(W - m, m); }
  if (k === n - 1) { ctx.moveTo(m, H - m); ctx.lineTo(W - m, H - m); }
  ctx.stroke();
  if (k > 0 && k < n - 1) {
    // a big pale numeral on each package panel
    ctx.fillStyle = 'rgba(58,77,208,0.10)';
    ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    font(ctx, 800, H * 0.4, SANS, 'expanded', 0);
    ctx.fillText(String(k).padStart(2, '0'), W - m * 1.6, H * 0.86);
  }
  if (k === 0) {
    // the label's disc, top right
    const r = H * 0.16, cx = W - m * 2.2, cy = m * 2.2 + r * 0.2;
    ctx.strokeStyle = P.ink; ctx.lineWidth = Math.max(1.5, W / 520);
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.6, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.6, r * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = P.ink; ctx.beginPath(); ctx.arc(cx, cy + r * 0.6, r * 0.1, 0, Math.PI * 2); ctx.fill();
  }
  return c;
}

/** Back of the flyer: plain paper with a little print showing through. */
export function flyerBack(W, H, seed) {
  const { c, ctx } = make(W, H);
  ctx.fillStyle = '#dfe1dc'; ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.05, seed);
  return c;
}
