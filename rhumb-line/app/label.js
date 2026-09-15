/* Rhumb Line · app/label.js
   The bag labels, drawn on canvas. Each <canvas data-bag-label data-origin> keeps the label's words as fallback
   content (read by screen readers, shown without scripting); this file reads those words and paints the label:
   brand and net weight, the origin's seeded topography with the farm's altitude band, coordinates, name, farm,
   altitude, process, variety, tasting notes and the latest roast date. A punched hole takes the string. */

import { $, $$, LOG } from './dom.js';
import { ORIGIN, fmtLatLon, labelTopography, roastDate } from './data.js';

const LW = 340;
const LH = 470;
const INK = '#5C3B26';
const PAPER = '#F7F0E1';
const FONT = {
  serif: '"EB Garamond", "RL Garamond Fallback", Georgia, serif',
  mono: '"IBM Plex Mono", Menlo, Consolas, monospace',
  cond: '"Barlow Condensed", "Arial Narrow", sans-serif',
};

function spaced(ctx, text, x, y, spacing, align) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
  const keep = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = keep;
  return total;
}

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A label's words come from its own fallback content; a thumbnail (in the sample chest) borrows them from the leg.
function readCopy(canvas) {
  const main = $('[data-label-copy]');
  const source = $('[data-f="name"]', canvas)
    ? canvas
    : document.querySelector(`[data-qa="leg"][data-origin="${canvas.dataset.origin}"] canvas[data-bag-label]`) || canvas;
  const pick = (sel) => {
    const el = $(sel, source);
    return el ? el.textContent.trim() : '';
  };
  return {
    name: pick('[data-f="name"]'),
    farm: pick('[data-f="farm"]'),
    altitude: pick('[data-f="altitude"]'),
    process: pick('[data-f="process"]'),
    variety: pick('[data-f="variety"]'),
    notes: pick('[data-f="notes"]'),
    labels: {
      altitude: pick('[data-l="altitude"]'),
      process: pick('[data-l="process"]'),
      variety: pick('[data-l="variety"]'),
      notes: pick('[data-l="notes"]'),
    },
    brand: (main && main.dataset.brand) || '',
    sub: (main && main.dataset.sub) || '',
    net: (main && main.dataset.net) || '',
    roasted: (main && main.dataset.roasted) || '',
  };
}

function draw(canvas, copy, origin) {
  const cssWidth = canvas.clientWidth;
  if (!cssWidth) return false;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const scale = (cssWidth / LW) * dpr;
  const w = Math.round(LW * scale);
  const h = Math.round(LH * scale);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, LW, LH);
  ctx.textBaseline = 'alphabetic';

  // Paper, age at the edges, a little grain.
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, LW, LH, 4);
  else ctx.rect(0, 0, LW, LH);
  ctx.fill();
  const age = ctx.createRadialGradient(LW / 2, LH / 2, LH * 0.3, LW / 2, LH / 2, LH * 0.72);
  age.addColorStop(0, 'rgba(140, 100, 50, 0)');
  age.addColorStop(1, 'rgba(140, 100, 50, .16)');
  ctx.fillStyle = age;
  ctx.fill();
  const rand = mulberry(Math.round((origin.lat + 90) * 997));
  ctx.fillStyle = 'rgba(92, 59, 38, .07)';
  for (let i = 0; i < 700; i++) ctx.fillRect(rand() * LW, rand() * LH, 0.5 + rand() * 0.9, 0.5 + rand() * 0.9);

  // Double rule.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(11, 11, LW - 22, LH - 22);
  ctx.lineWidth = 0.7;
  ctx.strokeRect(16, 16, LW - 32, LH - 32);

  // Punched hole with a reinforcing ring.
  ctx.beginPath();
  ctx.arc(LW / 2, 34, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#E8D8B8';
  ctx.fill();
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(LW / 2, 34, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const left = 28;
  const right = LW - 28;
  const inner = right - left;
  ctx.fillStyle = INK;

  // Brand and net weight.
  ctx.font = `500 15px ${FONT.serif}`;
  spaced(ctx, copy.brand, left, 64, 3.4, 'left');
  ctx.font = `400 12px ${FONT.mono}`;
  ctx.textAlign = 'right';
  ctx.fillText(copy.net, right, 64);
  ctx.textAlign = 'left';

  // Topography.
  const ax = left;
  const ay = 74;
  const aw = inner;
  const ah = 138;
  const topo = labelTopography(origin);
  const k = aw / 320;
  ctx.save();
  ctx.beginPath();
  ctx.rect(ax, ay, aw, ah);
  ctx.clip();
  ctx.translate(ax, ay - (180 * k - ah) / 2);
  ctx.scale(k, k);
  if (typeof Path2D === 'function') {
    ctx.fillStyle = 'rgba(92, 59, 38, .14)';
    ctx.fill(new Path2D(topo.band), 'evenodd');
    ctx.strokeStyle = INK;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 0.6 / k;
    ctx.stroke(new Path2D(topo.minor));
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.05 / k;
    ctx.stroke(new Path2D(topo.index));
    ctx.lineWidth = 1.6 / k;
    ctx.stroke(new Path2D(topo.edge));
    const { x, y } = topo.summit;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 4.5, y + 3);
    ctx.lineTo(x - 4.5, y + 3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ax, ay + 0.5);
  ctx.lineTo(ax + aw, ay + 0.5);
  ctx.moveTo(ax, ay + ah - 0.5);
  ctx.lineTo(ax + aw, ay + ah - 0.5);
  ctx.stroke();
  const coords = fmtLatLon(origin.lat, origin.lon);
  ctx.font = `400 11px ${FONT.mono}`;
  const cw = ctx.measureText(coords).width + 8;
  ctx.fillStyle = PAPER;
  ctx.fillRect(ax, ay + ah - 19, cw, 18);
  ctx.fillStyle = INK;
  ctx.fillText(coords, ax, ay + ah - 6);

  // Name, fitted to one line.
  let y = ay + ah + 36;
  let size = 28;
  ctx.font = `500 ${size}px ${FONT.serif}`;
  while (ctx.measureText(copy.name).width > inner && size > 20) {
    size -= 1;
    ctx.font = `500 ${size}px ${FONT.serif}`;
  }
  ctx.fillText(copy.name, left, y);
  y += 23;
  ctx.font = `italic 400 17px ${FONT.serif}`;
  ctx.fillText(copy.farm, left, y);

  // Specs.
  y += 13;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, y + 0.5);
  ctx.lineTo(right, y + 0.5);
  ctx.stroke();
  const labelFont = `600 11px ${FONT.cond}`;
  const valueFont = `400 16.5px ${FONT.serif}`;
  const col = inner / 2 + 6;
  const spec = (label, value, x, top, width) => {
    ctx.font = labelFont;
    spaced(ctx, label.toUpperCase(), x, top, 1.9, 'left');
    ctx.font = valueFont;
    const lines = wrapLines(ctx, value, width);
    lines.forEach((line, i) => ctx.fillText(line, x, top + 19 + i * 18));
    return top + 19 + (lines.length - 1) * 18;
  };
  y += 19;
  const rowEnd = Math.max(
    spec(copy.labels.altitude, copy.altitude, left, y, col - 12),
    spec(copy.labels.process, copy.process, left + col, y, inner - col),
  );
  y = spec(copy.labels.variety, copy.variety, left, rowEnd + 25, inner);
  y = spec(copy.labels.notes, copy.notes, left, y + 25, inner);

  // Foot: roast date and the wordmark's second line.
  const footY = LH - 44;
  ctx.beginPath();
  ctx.moveTo(left, footY + 0.5);
  ctx.lineTo(right, footY + 0.5);
  ctx.stroke();
  ctx.font = `400 11px ${FONT.mono}`;
  ctx.fillText(`${copy.roasted} ${roastDate(origin.roastDay)}`, left, footY + 18);
  ctx.font = `500 10.5px ${FONT.cond}`;
  spaced(ctx, copy.sub.toUpperCase(), right, footY + 18, 2.6, 'right');
  return y < footY - 4;
}

export function initLabels() {
  const canvases = $$('canvas[data-bag-label]');
  const jobs = canvases.map((canvas) => {
    const origin = ORIGIN[canvas.dataset.origin];
    if (!origin) return null;
    const copy = readCopy(canvas);
    let lastWidth = 0;
    const paint = (force) => {
      const width = canvas.clientWidth;
      if (!force && width === lastWidth) return;
      lastWidth = width;
      try {
        if (draw(canvas, copy, origin) === false && width) console.warn(`${LOG}bag label for ${origin.id} runs past its foot`);
      } catch (err) {
        console.error(`${LOG}bag label ${origin.id} failed:`, err);
      }
    };
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => paint(false)).observe(canvas);
    else window.addEventListener('resize', () => paint(false));
    return paint;
  }).filter(Boolean);
  const repaint = () => jobs.forEach((paint) => paint(true));
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', repaint);
  repaint();
  return { repaint };
}
