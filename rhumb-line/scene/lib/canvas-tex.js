/* Canvas-drawn textures: the harbour chart, the compass card and lid, sample tags, labels, the crew-list slip, the log
   page, the envelope and its card, the brass plate, soft contact shadows. Every printed word comes from ../copy.js
   (approved copy). */
import * as THREE from 'three';
import { rng, TAU } from './util.js';
import { COPY, splitFirst } from '../copy.js';

export const NAVY = '#1B2A3A', MARKER = '#A63A24', PAPER = '#F1E8D4', ROAST = '#5C3B26';

export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function toTexture(c, renderer, { srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  t.needsUpdate = true;
  return t;
}
function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); }
export function spacing(g, px) { if ('letterSpacing' in g) g.letterSpacing = px + 'px'; }
// Shrinks the font until the text fits maxW. `font` has a {s} placeholder for the size.
export function fitText(g, text, font, size, maxW) {
  let s = size;
  g.font = font.replace('{s}', s);
  while (s > 8 && g.measureText(text).width > maxW) { s -= 1; g.font = font.replace('{s}', s); }
  return s;
}

/* Paper: base colour, foxing, speckle. Units are the sheet's (the caller has scaled the context). */
export function paperBase(g, W, H, seed) {
  const R = rng(seed);
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) {
    const x = R() * W, y = R() * H, r = 20 + R() * 140, a = 0.012 + R() * 0.03;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(150,110,58,${a})`); grd.addColorStop(1, 'rgba(150,110,58,0)');
    g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 3200; i++) { g.fillStyle = `rgba(90,68,40,${0.03 + R() * 0.07})`; g.fillRect(R() * W, R() * H, 0.6 + R() * 1.6, 0.6 + R() * 1.6); }
}
export function neatline(g, W, H, M, M2) {
  g.strokeStyle = NAVY; g.lineWidth = 3; g.strokeRect(M, M, W - 2 * M, H - 2 * M);
  g.lineWidth = 1.2; g.strokeRect(M2, M2, W - 2 * M2, H - 2 * M2);
  g.fillStyle = NAVY;
  for (let bx = M; bx < W - M; bx += 36) if (((bx - M) / 36) % 2 < 1) { const bw = Math.min(36, W - M - bx); g.fillRect(bx, M, bw, M2 - M); g.fillRect(bx, H - M2, bw, M2 - M); }
  for (let by = M2; by < H - M2; by += 36) if (((by - M2) / 36) % 2 < 1) { const bh = Math.min(36, H - M2 - by); g.fillRect(M, by, M2 - M, bh); g.fillRect(W - M2, by, M2 - M, bh); }
}
export function ageing(g, W, H) {
  g.strokeStyle = 'rgba(120,96,60,.16)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
  const age = g.createRadialGradient(W / 2, H * 0.48, W * 0.3, W / 2, H * 0.48, W * 0.78);
  age.addColorStop(0, 'rgba(184,154,106,0)'); age.addColorStop(1, 'rgba(160,122,70,.30)');
  g.fillStyle = age; g.fillRect(0, 0, W, H);
  const wear = g.createRadialGradient(W * 0.93, H * 0.95, 0, W * 0.93, H * 0.95, 220);
  wear.addColorStop(0, 'rgba(120,90,50,.2)'); wear.addColorStop(1, 'rgba(120,90,50,0)');
  g.fillStyle = wear; g.fillRect(0, 0, W, H);
}
export function compassRose(g, r) {
  g.save(); g.translate(r.x, r.y); g.strokeStyle = NAVY;
  g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r.r, 0, TAU); g.stroke();
  g.lineWidth = 1; g.beginPath(); g.arc(0, 0, r.r - 14, 0, TAU); g.stroke();
  g.lineWidth = 1.4;
  for (let a = 0; a < 360; a += 10) { const q = (a * Math.PI) / 180, k = a % 90 === 0 ? 22 : 10; g.beginPath(); g.moveTo(Math.sin(q) * r.r, -Math.cos(q) * r.r); g.lineTo(Math.sin(q) * (r.r - k), -Math.cos(q) * (r.r - k)); g.stroke(); }
  g.fillStyle = 'rgba(27,42,58,.85)';
  g.beginPath(); g.moveTo(0, -r.r + 18); g.lineTo(12, -12); g.lineTo(r.r - 18, 0); g.lineTo(12, 12); g.lineTo(0, r.r - 18); g.lineTo(-12, 12); g.lineTo(-r.r + 18, 0); g.lineTo(-12, -12); g.closePath(); g.fill();
  g.fillStyle = MARKER; g.beginPath(); g.moveTo(0, -r.r + 18); g.lineTo(12, -12); g.lineTo(0, 0); g.closePath(); g.fill();
  g.restore();
}

/* ---------- The harbour chart: the loader's artwork, plus paper, wear. The course is drawn live on top (bearing line). */
export function chartTexture(C, renderer, px) {
  const s = px / C.W, c = makeCanvas(px, Math.round(C.H * s)), g = c.getContext('2d');
  g.scale(s, s);
  paperBase(g, C.W, C.H, 1907);
  g.save();
  g.beginPath(); g.rect(C.M2, C.M2, C.W - 2 * C.M2, C.H - 2 * C.M2); g.clip();
  poly(g, C.land); g.closePath(); g.fillStyle = '#E4D3AC'; g.fill();
  poly(g, C.coast); g.strokeStyle = 'rgba(201,220,216,.9)'; g.lineWidth = 30; g.lineJoin = 'round'; g.stroke();
  g.strokeStyle = 'rgba(27,42,58,.16)'; g.lineWidth = 1.2;
  for (let x = C.M; x < C.W; x += 218) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, C.H); g.stroke(); }
  for (let y = C.M; y < C.H; y += 182) { g.beginPath(); g.moveTo(0, y); g.lineTo(C.W, y); g.stroke(); }
  C.contours.forEach((k) => { poly(g, k.pts); g.setLineDash(k.dash); g.strokeStyle = 'rgba(27,42,58,.55)'; g.lineWidth = k.w; g.stroke(); });
  g.setLineDash([]);
  poly(g, C.coast); g.strokeStyle = NAVY; g.lineWidth = 3; g.stroke();
  g.fillStyle = 'rgba(27,42,58,.75)'; g.textAlign = 'center';
  g.font = 'italic 500 30px "EB Garamond", Georgia, serif';
  C.soundings.forEach((p) => g.fillText(String(p.n), p.x, p.y));
  compassRose(g, C.rose);
  // the town
  g.fillStyle = PAPER; g.strokeStyle = MARKER; g.lineWidth = 4;
  g.beginPath(); g.arc(C.town.x, C.town.y, 11, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = MARKER; g.beginPath(); g.arc(C.town.x, C.town.y, 3.5, 0, TAU); g.fill();
  g.fillStyle = NAVY; g.textAlign = 'right'; g.font = '600 30px "Barlow Condensed", "Arial Narrow", sans-serif';
  spacing(g, 5);
  g.fillText(COPY['port.name'].toUpperCase(), C.town.x - 26, C.town.y - 26);
  spacing(g, 0);
  // title cartouche: hero.chartTitle and hero.chartNote, as on the loader
  const t = C.title;
  g.fillStyle = 'rgba(241,232,212,.72)'; g.fillRect(t.x, t.y, t.w, t.h);
  g.strokeStyle = NAVY; g.lineWidth = 2; g.strokeRect(t.x, t.y, t.w, t.h);
  g.lineWidth = 1; g.strokeRect(t.x + 8, t.y + 8, t.w - 16, t.h - 16);
  g.fillStyle = NAVY; g.textAlign = 'center';
  fitText(g, COPY['hero.chartTitle'], 'italic 500 {s}px "EB Garamond", Georgia, serif', 44, t.w - 36);
  g.fillText(COPY['hero.chartTitle'], t.x + t.w / 2, t.y + 62);
  g.globalAlpha = 0.82;
  fitText(g, COPY['hero.chartNote'], '500 {s}px "EB Garamond", Georgia, serif', 22, t.w - 36);
  g.fillText(COPY['hero.chartNote'], t.x + t.w / 2, t.y + 98);
  g.globalAlpha = 1;
  // scale bar
  const sc = C.scale;
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? PAPER : NAVY; g.fillRect(sc.x + (i * sc.w) / 5, sc.y, sc.w / 5, 9); g.strokeStyle = NAVY; g.lineWidth = 1.5; g.strokeRect(sc.x + (i * sc.w) / 5, sc.y, sc.w / 5, 9); }
  g.fillStyle = NAVY; g.font = '500 17px "IBM Plex Mono", monospace';
  g.textAlign = 'center'; g.fillText('0', sc.x, sc.y - 10); g.fillText('1', sc.x + sc.w, sc.y - 10);
  spacing(g, 3); g.fillText(COPY['hero.distanceUnit'], sc.x + sc.w / 2, sc.y - 10); spacing(g, 0);
  g.restore();
  neatline(g, C.W, C.H, C.M, C.M2);
  ageing(g, C.W, C.H);
  return toTexture(c, renderer);
}

/* ---------- Compass card ---------- */
export function compassCardTexture(renderer, px = 1024) {
  const c = makeCanvas(px, px), g = c.getContext('2d'), r = px / 2;
  g.translate(r, r);
  const bg = g.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  bg.addColorStop(0, '#F4ECD9'); bg.addColorStop(1, '#E2D5B8');
  g.fillStyle = bg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.strokeStyle = NAVY;
  g.lineWidth = r * 0.012; g.beginPath(); g.arc(0, 0, r * 0.955, 0, TAU); g.stroke();
  g.lineWidth = r * 0.006; g.beginPath(); g.arc(0, 0, r * 0.80, 0, TAU); g.stroke();
  g.beginPath(); g.arc(0, 0, r * 0.52, 0, TAU); g.stroke();
  for (let d = 0; d < 360; d++) {
    const a = (d * Math.PI) / 180, len = d % 10 === 0 ? 0.075 : d % 5 === 0 ? 0.05 : 0.028;
    g.lineWidth = d % 10 === 0 ? r * 0.007 : r * 0.0035;
    g.beginPath(); g.moveTo(Math.sin(a) * r * 0.955, -Math.cos(a) * r * 0.955); g.lineTo(Math.sin(a) * r * (0.955 - len), -Math.cos(a) * r * (0.955 - len)); g.stroke();
  }
  g.fillStyle = NAVY; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `500 ${Math.round(r * 0.055)}px "IBM Plex Mono", monospace`;
  for (let d = 30; d < 360; d += 30) { if (d % 90 === 0) continue; g.save(); g.rotate((d * Math.PI) / 180); g.fillText(String(d).padStart(3, '0'), 0, -r * 0.83); g.restore(); }
  const star = (len, w, rot, dark, light) => {
    g.save(); g.rotate(rot);
    g.fillStyle = dark; g.beginPath(); g.moveTo(0, -len); g.lineTo(w, 0); g.lineTo(0, 0); g.closePath(); g.fill();
    g.fillStyle = light; g.beginPath(); g.moveTo(0, -len); g.lineTo(-w, 0); g.lineTo(0, 0); g.closePath(); g.fill();
    g.restore();
  };
  for (let i = 0; i < 8; i++) star(r * 0.46, r * 0.045, (i * Math.PI) / 4 + Math.PI / 8, '#9c8a67', '#c9b894');
  for (let i = 0; i < 4; i++) star(r * 0.62, r * 0.085, (i * Math.PI) / 2 + Math.PI / 4, '#2c3d4f', '#6b7c8c');
  for (let i = 0; i < 4; i++) star(r * 0.76, r * 0.11, (i * Math.PI) / 2, i === 0 ? MARKER : NAVY, i === 0 ? '#d67c63' : '#50637a');
  g.font = `600 ${Math.round(r * 0.15)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  ['N', 'E', 'S', 'W'].forEach((L, i) => { g.save(); g.rotate((i * Math.PI) / 2); g.fillStyle = i === 0 ? MARKER : NAVY; g.fillText(L, 0, -r * 0.88); g.restore(); });
  g.fillStyle = '#b8914f'; g.beginPath(); g.arc(0, 0, r * 0.05, 0, TAU); g.fill();
  g.fillStyle = '#6d5128'; g.beginPath(); g.arc(0, 0, r * 0.018, 0, TAU); g.fill();
  return toTexture(c, renderer);
}

/* ---------- Sample tags: "Leg n of 6" and the origin's name (alpha cut-out card with an eyelet) ---------- */
export function tagTexture(renderer, legN, originId) {
  const w = 640, h = 320, c = makeCanvas(w, h), g = c.getContext('2d'), R = rng(legN * 97 + 13);
  const cut = 58;
  g.beginPath();
  g.moveTo(cut, 8); g.lineTo(w - 14, 8); g.quadraticCurveTo(w - 6, 8, w - 6, 16); g.lineTo(w - 6, h - 16); g.quadraticCurveTo(w - 6, h - 8, w - 14, h - 8); g.lineTo(cut, h - 8); g.lineTo(8, h - cut); g.lineTo(8, cut); g.closePath();
  g.fillStyle = '#EDE2C8'; g.fill();
  g.save(); g.clip();
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,92,52,${0.03 + R() * 0.06})`; g.fillRect(R() * w, R() * h, 1 + R() * 6, 1); }
  const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, 'rgba(170,130,70,.0)'); grd.addColorStop(1, 'rgba(170,130,70,.18)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = MARKER; g.fillRect(120, 48, w - 170, 6);
  const [region, country] = splitFirst(COPY.origins[originId].name);
  g.fillStyle = NAVY; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  fitText(g, COPY['voyage.legLabel'].replace('{n}', legN), '500 {s}px "IBM Plex Mono", monospace', 62, w - 150);
  g.fillText(COPY['voyage.legLabel'].replace('{n}', legN), 120, 122);
  g.fillStyle = ROAST;
  fitText(g, region, 'italic 500 {s}px "EB Garamond", Georgia, serif', 76, w - 150);
  g.fillText(region, 122, 212);
  g.fillStyle = NAVY; g.globalAlpha = 0.8;
  fitText(g, country.toUpperCase(), '600 {s}px "Barlow Condensed", "Arial Narrow", sans-serif', 40, w - 150);
  spacing(g, 6); g.fillText(country.toUpperCase(), 124, 270); spacing(g, 0);
  g.globalAlpha = 1;
  g.restore();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.arc(62, h / 2, 16, 0, TAU); g.fill();
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = '#a8834f'; g.lineWidth = 12; g.beginPath(); g.arc(62, h / 2, 22, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(80,58,30,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(62, h / 2, 28, 0, TAU); g.stroke();
  return toTexture(c, renderer);
}

/* ---------- Paper label for the logbook cover ---------- */
export function labelTexture(renderer, title, sub) {
  const w = 740, h = 300, c = makeCanvas(w, h), g = c.getContext('2d'), R = rng(77);
  g.fillStyle = '#E9DEC5'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(120,92,52,${0.03 + R() * 0.05})`; g.fillRect(R() * w, R() * h, 1 + R() * 5, 1); }
  g.strokeStyle = NAVY; g.lineWidth = 5; g.strokeRect(16, 16, w - 32, h - 32);
  g.lineWidth = 2; g.strokeRect(30, 30, w - 60, h - 60);
  g.fillStyle = NAVY; g.textAlign = 'center';
  spacing(g, 12);
  fitText(g, title, '600 {s}px "Barlow Condensed", "Arial Narrow", sans-serif', 92, w - 110);
  g.fillText(title, w / 2 + 6, 150);
  spacing(g, 0);
  g.fillStyle = MARKER; g.fillRect(w / 2 - 90, 176, 180, 4);
  g.fillStyle = ROAST; g.font = 'italic 500 54px "EB Garamond", Georgia, serif';
  g.fillText(sub, w / 2, 246);
  return toTexture(c, renderer);
}

/* ---------- The crew-list slip on the table (quiz.label), ruled like a ship's articles ---------- */
export function slipTexture(renderer) {
  const w = 700, h = 988, c = makeCanvas(w, h), g = c.getContext('2d'), R = rng(311);
  g.fillStyle = '#EFE5CF'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(110,84,48,${0.02 + R() * 0.05})`; g.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 2); }
  g.strokeStyle = NAVY; g.lineWidth = 4; g.strokeRect(28, 28, w - 56, h - 56);
  g.lineWidth = 1.5; g.strokeRect(40, 40, w - 80, h - 80);
  g.fillStyle = NAVY; g.textAlign = 'center';
  spacing(g, 10);
  fitText(g, COPY['quiz.label'].toUpperCase(), '600 {s}px "Barlow Condensed", "Arial Narrow", sans-serif', 64, w - 140);
  g.fillText(COPY['quiz.label'].toUpperCase(), w / 2 + 5, 132);
  spacing(g, 0);
  g.fillStyle = MARKER; g.fillRect(w / 2 - 110, 158, 220, 4);
  g.fillStyle = ROAST; g.font = 'italic 500 40px "EB Garamond", Georgia, serif';
  g.fillText(COPY['port.name'], w / 2, 222);
  g.strokeStyle = 'rgba(27,42,58,.55)'; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = 318 + i * 68;
    g.beginPath(); g.moveTo(84, y); g.lineTo(w - 84, y); g.stroke();
    g.beginPath(); g.moveTo(150, y - 44); g.lineTo(150, y); g.stroke();
    g.fillStyle = 'rgba(27,42,58,.7)'; g.font = '500 24px "IBM Plex Mono", monospace'; g.textAlign = 'left';
    g.fillText(String(i + 1).padStart(2, '0'), 94, y - 14);
  }
  // pencilled names are just loose strokes, not words
  g.strokeStyle = 'rgba(40,40,46,.55)'; g.lineWidth = 3; g.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const y = 318 + i * 68 - 18;
    g.beginPath(); g.moveTo(176, y);
    for (let x = 176; x < 176 + 180 + R() * 200; x += 12) g.lineTo(x, y + Math.sin(x * 0.21 + i) * 6 + (R() - 0.5) * 5);
    g.stroke();
  }
  const age = g.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, h * 0.7);
  age.addColorStop(0, 'rgba(170,130,70,0)'); age.addColorStop(1, 'rgba(150,110,60,.22)');
  g.fillStyle = age; g.fillRect(0, 0, w, h);
  return toTexture(c, renderer);
}

/* ---------- The log's ruled page: faint rules, a red margin, pencilled entries as loose strokes (no words) ---------- */
export function logPageTexture(renderer) {
  const w = 768, h = 1024, c = makeCanvas(w, h), g = c.getContext('2d'), R = rng(911);
  g.fillStyle = '#EFE6D0'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(110,84,48,${0.02 + R() * 0.05})`; g.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 2); }
  g.strokeStyle = 'rgba(70,96,120,.35)'; g.lineWidth = 2;
  for (let y = 120; y < h - 40; y += 44) { g.beginPath(); g.moveTo(40, y); g.lineTo(w - 40, y); g.stroke(); }
  g.strokeStyle = 'rgba(166,58,36,.55)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(132, 40); g.lineTo(132, h - 40); g.stroke();
  g.strokeStyle = 'rgba(40,40,46,.6)'; g.lineWidth = 3.2; g.lineCap = 'round';
  for (let row = 0; row < 18; row++) {
    const y = 120 + row * 44 - 12;
    if (R() < 0.12) continue;
    // a short figure-like mark in the margin, then a written line
    g.beginPath(); g.moveTo(58, y); for (let x = 58; x < 112; x += 7) g.lineTo(x, y + Math.sin(x * 0.6 + row) * 6); g.stroke();
    const end = 180 + (w - 260) * (0.45 + R() * 0.5);
    g.beginPath(); g.moveTo(160, y);
    for (let x = 160; x < end; x += 9) g.lineTo(x, y + Math.sin(x * 0.23 + row * 1.7) * 5 + (R() - 0.5) * 5);
    g.stroke();
  }
  const age = g.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, h * 0.75);
  age.addColorStop(0, 'rgba(170,130,70,0)'); age.addColorStop(1, 'rgba(150,110,60,.2)');
  g.fillStyle = age; g.fillRect(0, 0, w, h);
  return toTexture(c, renderer);
}

/* ---------- Envelope paper: laid lines, fold shadows running to the centre, softened edges ---------- */
export function envelopeTexture(renderer) {
  const w = 1024, h = 680, c = makeCanvas(w, h), g = c.getContext('2d'), R = rng(419);
  g.fillStyle = '#ECE0C6'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(140,110,70,.06)'; g.lineWidth = 1;
  for (let y = 0; y < h; y += 6) { g.beginPath(); g.moveTo(0, y + R() * 2); g.lineTo(w, y + R() * 2); g.stroke(); }
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(110,84,48,${0.02 + R() * 0.06})`; g.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 2); }
  g.strokeStyle = 'rgba(120,92,58,.22)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, h); g.lineTo(w * 0.5, h * 0.44); g.lineTo(w, h); g.stroke();
  g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.36, h * 0.52); g.moveTo(w, 0); g.lineTo(w * 0.64, h * 0.52); g.stroke();
  const edge = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.62);
  edge.addColorStop(0, 'rgba(160,120,70,0)'); edge.addColorStop(1, 'rgba(150,110,60,.28)');
  g.fillStyle = edge; g.fillRect(0, 0, w, h);
  return toTexture(c, renderer);
}

/* ---------- The card inside the letter (footer.newsletterHeading, the harbour's name, ruled lines) ---------- */
export function letterCardTexture(renderer) {
  const w = 900, h = 580, c = makeCanvas(w, h), g = c.getContext('2d'), R = rng(733);
  g.fillStyle = '#F3EBD8'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(110,84,48,${0.02 + R() * 0.05})`; g.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 2); }
  g.strokeStyle = NAVY; g.lineWidth = 3; g.strokeRect(24, 24, w - 48, h - 48);
  g.fillStyle = NAVY; g.textAlign = 'center';
  fitText(g, COPY['footer.newsletterHeading'], 'italic 500 {s}px "EB Garamond", Georgia, serif', 64, w - 140);
  g.fillText(COPY['footer.newsletterHeading'], w / 2, 132);
  g.fillStyle = MARKER; g.fillRect(w / 2 - 110, 158, 220, 4);
  g.fillStyle = ROAST; spacing(g, 8); g.font = '600 30px "Barlow Condensed", "Arial Narrow", sans-serif';
  g.fillText(COPY['port.name'].toUpperCase(), w / 2 + 4, 214); spacing(g, 0);
  g.strokeStyle = 'rgba(27,42,58,.35)'; g.lineWidth = 2;
  for (let y = 290; y < h - 60; y += 52) { g.beginPath(); g.moveTo(90, y); g.lineTo(w - 90, y); g.stroke(); }
  g.strokeStyle = 'rgba(40,40,46,.5)'; g.lineWidth = 3; g.lineCap = 'round';
  for (let row = 0; row < 3; row++) {
    const y = 290 + row * 52 - 14, end = 160 + (w - 300) * (0.5 + R() * 0.45);
    g.beginPath(); g.moveTo(110, y);
    for (let x = 110; x < end; x += 10) g.lineTo(x, y + Math.sin(x * 0.2 + row * 2) * 5 + (R() - 0.5) * 4);
    g.stroke();
  }
  return toTexture(c, renderer);
}

/* ---------- Compass lid: spun brass, engraved (an atlas of two discs) ----------
   Left: the outside, a sixteen-point rose with engraver's hatching inside a degree ring (shapes only, no letters).
   Right: the inside, the harbour's name and position engraved (port.name, port.coordinates) over a small rose.
   Colour darkens in the grooves; the normal map carries the grooves and fine spinning rings. */
export function lidTextures(renderer) {
  const S = 384, w = S * 2, h = S, rad = S * 0.47;
  const mask = makeCanvas(w, h), m = mask.getContext('2d');
  m.fillStyle = '#000'; m.fillRect(0, 0, w, h);
  m.strokeStyle = '#fff'; m.fillStyle = '#fff'; m.lineCap = 'round'; m.lineJoin = 'round';
  const circle = (r, lw) => { m.lineWidth = lw; m.beginPath(); m.arc(0, 0, r, 0, TAU); m.stroke(); };
  const point = (len, half, rot, hatch, solidFill) => {
    m.save(); m.rotate(rot);
    const kite = () => { m.beginPath(); m.moveTo(0, -len); m.lineTo(half, -half); m.lineTo(0, 0); m.lineTo(-half, -half); m.closePath(); };
    m.lineWidth = 1.7; kite(); m.stroke();
    if (solidFill) { m.beginPath(); m.moveTo(0, -len); m.lineTo(half, -half); m.lineTo(0, 0); m.closePath(); m.fill(); }
    else if (hatch) {
      m.save(); m.beginPath(); m.moveTo(0, -len); m.lineTo(half, -half); m.lineTo(0, 0); m.closePath(); m.clip();
      m.lineWidth = 1.1; m.beginPath();
      for (let y = -len; y < half; y += 3.6) { m.moveTo(-2, y); m.lineTo(half * 1.4, y + half * 0.9); }
      m.stroke(); m.restore();
    }
    m.restore();
  };
  // outside
  m.save(); m.translate(S / 2, S / 2);
  circle(rad * 0.93, 2.6); circle(rad * 0.79, 1.7); circle(rad * 0.75, 1.1);
  m.beginPath();
  for (let d = 0; d < 360; d += 5) {
    const a = (d * Math.PI) / 180, r1 = rad * (d % 30 === 0 ? 0.92 : 0.855);
    m.moveTo(Math.sin(a) * rad * 0.79, -Math.cos(a) * rad * 0.79); m.lineTo(Math.sin(a) * r1, -Math.cos(a) * r1);
  }
  m.lineWidth = 1.5; m.stroke();
  for (let i = 0; i < 8; i++) point(rad * 0.3, rad * 0.05, (i * Math.PI) / 4 + Math.PI / 8, false, false);
  for (let i = 0; i < 8; i++) point(rad * (i % 2 ? 0.47 : 0.7), rad * (i % 2 ? 0.075 : 0.11), (i * Math.PI) / 4, true, i === 0);
  circle(rad * 0.1, 1.6); m.beginPath(); m.arc(0, 0, rad * 0.04, 0, TAU); m.fill();
  m.restore();
  // inside
  m.save(); m.translate(S * 1.5, S / 2);
  circle(rad * 0.93, 2.6); circle(rad * 0.87, 1.2);
  m.textAlign = 'center'; m.textBaseline = 'alphabetic';
  fitText(m, COPY['port.name'], 'italic 500 {s}px "EB Garamond", Georgia, serif', 62, rad * 1.34);
  m.fillText(COPY['port.name'], 0, -rad * 0.14);
  m.fillRect(-rad * 0.3, -rad * 0.03, rad * 0.6, 2.4);
  spacing(m, 2);
  fitText(m, COPY['port.coordinates'], '500 {s}px "IBM Plex Mono", monospace', 25, rad * 1.3);
  m.fillText(COPY['port.coordinates'], rad * 0.01, rad * 0.2);
  spacing(m, 0);
  m.translate(0, rad * 0.52);
  for (let i = 0; i < 8; i++) point(rad * (i % 2 ? 0.1 : 0.18), rad * 0.035, (i * Math.PI) / 4, false, i === 0);
  m.restore();

  // colour: warm brass, lighter towards the upper left, darkened patina in the grooves
  const c = makeCanvas(w, h), g = c.getContext('2d');
  [S / 2, S * 1.5].forEach((cx) => {
    const grd = g.createRadialGradient(cx - S * 0.14, S * 0.36, S * 0.04, cx, S / 2, S * 0.62);
    grd.addColorStop(0, '#e6c886'); grd.addColorStop(0.55, '#cda45f'); grd.addColorStop(1, '#a37b3c');
    g.fillStyle = grd; g.fillRect(cx - S / 2, 0, S, S);
  });
  const md = m.getImageData(0, 0, w, h).data, col = g.getImageData(0, 0, w, h), cd = col.data;
  const nc = makeCanvas(w, h), ng = nc.getContext('2d'), nd = ng.createImageData(w, h), H = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, o = i * 4, k = md[o] / 255;
    cd[o] = cd[o] * (1 - 0.7 * k) + 54 * 0.7 * k; cd[o + 1] = cd[o + 1] * (1 - 0.7 * k) + 37 * 0.7 * k; cd[o + 2] = cd[o + 2] * (1 - 0.7 * k) + 18 * 0.7 * k;
    const dx = x - (x < S ? S / 2 : S * 1.5), dy = y - S / 2;
    H[i] = -k + 0.03 * Math.sin(Math.sqrt(dx * dx + dy * dy) * 1.9);
  }
  g.putImageData(col, 0, 0);
  const at = (x, y) => H[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * 2.2, dy = (at(x, y - 1) - at(x, y + 1)) * 2.2;
    const l = Math.hypot(dx, dy, 1), o = (y * w + x) * 4;
    nd.data[o] = (-dx / l * 0.5 + 0.5) * 255; nd.data[o + 1] = (-dy / l * 0.5 + 0.5) * 255; nd.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; nd.data[o + 3] = 255;
  }
  ng.putImageData(nd, 0, 0);
  return { map: toTexture(c, renderer), normal: toTexture(nc, renderer, { srgb: false }) };
}

/* ---------- Wall instruments: the ship's clock and the barometer (tick marks and bands only, no words) ---------- */
function dialBase(g, r) {
  const bg = g.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  bg.addColorStop(0, '#F3EBD8'); bg.addColorStop(1, '#D9C9A8');
  g.fillStyle = bg; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.strokeStyle = NAVY; g.lineWidth = r * 0.02; g.beginPath(); g.arc(0, 0, r * 0.93, 0, TAU); g.stroke();
}
export function clockFaceTexture(renderer) {
  const S = 512, r = S / 2, c = makeCanvas(S, S), g = c.getContext('2d');
  g.translate(r, r);
  dialBase(g, r);
  g.strokeStyle = NAVY; g.lineCap = 'butt';
  g.lineWidth = r * 0.008; g.beginPath(); g.arc(0, 0, r * 0.76, 0, TAU); g.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU, big = i % 5 === 0, r0 = big ? r * 0.74 : r * 0.84;
    g.lineWidth = big ? r * (i % 15 === 0 ? 0.05 : 0.032) : r * 0.012;
    g.beginPath(); g.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0); g.lineTo(Math.sin(a) * r * 0.91, -Math.cos(a) * r * 0.91); g.stroke();
  }
  // a small compass star in the middle, north in the marker red
  const star = (len, w, rot, col) => { g.save(); g.rotate(rot); g.fillStyle = col; g.beginPath(); g.moveTo(0, -len); g.lineTo(w, 0); g.lineTo(0, len * 0.18); g.lineTo(-w, 0); g.closePath(); g.fill(); g.restore(); };
  for (let i = 0; i < 4; i++) star(r * 0.34, r * 0.05, (i * Math.PI) / 2, i === 0 ? MARKER : 'rgba(27,42,58,.55)');
  return toTexture(c, renderer);
}
export function barometerFaceTexture(renderer) {
  const S = 512, r = S / 2, c = makeCanvas(S, S), g = c.getContext('2d');
  g.translate(r, r);
  dialBase(g, r);
  const a0 = -Math.PI * 0.75, a1 = Math.PI * 0.75;
  // weather bands along the scale: fair (navy), change (ochre), foul (marker red), from the left
  [[a0, -0.25, '#1B2A3A'], [-0.25, 0.25, '#B08A4E'], [0.25, a1, MARKER]].forEach(([s, e, col]) => {
    g.strokeStyle = col; g.lineWidth = r * 0.06; g.beginPath(); g.arc(0, 0, r * 0.66, s - Math.PI / 2, e - Math.PI / 2); g.stroke();
  });
  g.strokeStyle = NAVY;
  for (let i = 0; i <= 60; i++) {
    const a = a0 + ((a1 - a0) * i) / 60, big = i % 5 === 0, r0 = big ? r * 0.72 : r * 0.78;
    g.lineWidth = big ? r * 0.02 : r * 0.008;
    g.beginPath(); g.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0); g.lineTo(Math.sin(a) * r * 0.88, -Math.cos(a) * r * 0.88); g.stroke();
  }
  g.fillStyle = '#b8914f'; g.beginPath(); g.arc(0, 0, r * 0.07, 0, TAU); g.fill();
  return toTexture(c, renderer);
}

/* ---------- The crate's stamp: the six growing countries (the second part of each origin's approved name) ---------- */
export function crateStampTexture(renderer) {
  const w = 1024, h = 512, c = makeCanvas(w, h), g = c.getContext('2d'), R = rng(57);
  const ids = Object.keys(COPY.origins);
  [ids.slice(0, 3), ids.slice(3, 6)].forEach((row, ri) => {
    g.save();
    g.translate(w / 2, h * (1 - (ri + 0.5) / 2));
    g.rotate((R() - 0.5) * 0.03);
    g.strokeStyle = 'rgba(27,42,58,.9)'; g.lineWidth = 8; g.strokeRect(-w * 0.46, -h * 0.19, w * 0.92, h * 0.38);
    const text = row.map((id) => splitFirst(COPY.origins[id].name)[1].toUpperCase()).join('  ·  ');
    g.fillStyle = 'rgba(27,42,58,.92)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    spacing(g, 10);
    fitText(g, text, '600 {s}px "Barlow Condensed", "Arial Narrow", sans-serif', 100, w * 0.84);
    g.fillText(text, 5, 6);
    spacing(g, 0);
    g.restore();
  });
  // stamped ink is never solid
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + R() * 0.7})`; g.fillRect(R() * w, R() * h, 1 + R() * 4, 1 + R() * 3); }
  g.globalCompositeOperation = 'source-over';
  return toTexture(c, renderer);
}

/* ---------- Rope: three strands twisting along the tube (normal map, repeats along the length) ---------- */
export function ropeNormalTexture(renderer) {
  const w = 64, h = 32, c = makeCanvas(w, h), g = c.getContext('2d'), d = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ph = ((x / w) * 3 + y / h) * TAU;
    const nx = -Math.sin(ph) * 0.75, l = Math.hypot(nx, 1), o = (y * w + x) * 4;
    d.data[o] = (nx / l * 0.5 + 0.5) * 255; d.data[o + 1] = 128; d.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; d.data[o + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  const t = toTexture(c, renderer, { srgb: false });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(260, 1);
  return t;
}

/* ---------- Engraved brass plate: colour and a normal map from the letter depth ---------- */
export function plateTextures(renderer, text) {
  const w = 1024, h = 220, c = makeCanvas(w, h), g = c.getContext('2d');
  const mask = makeCanvas(w, h), mg = mask.getContext('2d');
  mg.fillStyle = '#000'; mg.fillRect(0, 0, w, h);
  mg.fillStyle = '#fff'; mg.textAlign = 'center'; mg.textBaseline = 'middle';
  spacing(mg, 18);
  fitText(mg, text, '600 {s}px "Barlow Condensed", "Arial Narrow", sans-serif', 108, w - 110);
  mg.fillText(text, w / 2 + 9, h / 2 + 6);
  mg.lineWidth = 5; mg.strokeStyle = '#fff'; mg.strokeRect(22, 22, w - 44, h - 44);
  const md = mg.getImageData(0, 0, w, h).data;
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#d8b477'); grd.addColorStop(0.5, '#c29a5a'); grd.addColorStop(1, '#a8834f');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const R = rng(5);
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(255,240,200,${R() * 0.06})`; g.fillRect(R() * w, R() * h, 20 + R() * 120, 1); }
  const col = g.getImageData(0, 0, w, h), cd = col.data;
  for (let i = 0; i < md.length; i += 4) { const m = md[i] / 255; cd[i] = cd[i] * (1 - m * 0.85) + 26 * m; cd[i + 1] = cd[i + 1] * (1 - m * 0.85) + 20 * m; cd[i + 2] = cd[i + 2] * (1 - m * 0.85) + 14 * m; }
  g.putImageData(col, 0, 0);
  const nc = makeCanvas(w, h), ng = nc.getContext('2d'), nd = ng.createImageData(w, h), H = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) H[i] = -md[i * 4] / 255;
  const at = (x, y) => H[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * 2.5, dy = (at(x, y - 1) - at(x, y + 1)) * 2.5;
    const l = Math.hypot(dx, dy, 1), o = (y * w + x) * 4;
    nd.data[o] = (-dx / l * 0.5 + 0.5) * 255; nd.data[o + 1] = (-dy / l * 0.5 + 0.5) * 255; nd.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; nd.data[o + 3] = 255;
  }
  ng.putImageData(nd, 0, 0);
  return { map: toTexture(c, renderer), normal: toTexture(nc, renderer, { srgb: false }) };
}

/* ---------- Porcelain band: navy rim band and a marker hairline, placed by profile fraction ---------- */
export function bandTexture(renderer, bands) {
  const c = makeCanvas(4, 1024), g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 4, 1024);
  bands.forEach(([v0, v1, color]) => { g.fillStyle = color; g.fillRect(0, (1 - v1) * 1024, 4, Math.max(1, (v1 - v0) * 1024)); });
  const t = toTexture(c, renderer);
  t.anisotropy = 1;
  return t;
}

/* ---------- Knurling for the compass bezel (normal map, tiles around the ring) ---------- */
export function knurlTexture(renderer) {
  const w = 1024, h = 16, c = makeCanvas(w, h), g = c.getContext('2d'), d = g.createImageData(w, h);
  for (let x = 0; x < w; x++) {
    const s = Math.sin((x / w) * TAU * 180);
    const nx = s * 0.55, l = Math.hypot(nx, 1);
    for (let y = 0; y < h; y++) { const o = (y * w + x) * 4; d.data[o] = (nx / l * 0.5 + 0.5) * 255; d.data[o + 1] = 128; d.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; d.data[o + 3] = 255; }
  }
  g.putImageData(d, 0, 0);
  const t = toTexture(c, renderer, { srgb: false });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---------- Soft contact shadows (alpha in green) ---------- */
export function blobTexture(renderer) {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,.75)'); grd.addColorStop(0.75, 'rgba(255,255,255,.22)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return toTexture(c, renderer, { srgb: false });
}
export function rectShadowTexture(renderer) {
  const c = makeCanvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  g.shadowColor = '#fff'; g.shadowBlur = 34; g.shadowOffsetX = 1000;
  g.fillStyle = '#fff'; g.fillRect(40 - 1000, 40, 176, 176);
  return toTexture(c, renderer, { srgb: false });
}
export function glowTexture(renderer) {
  const c = makeCanvas(128, 128), g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.2, 'rgba(255,255,255,.45)'); grd.addColorStop(0.5, 'rgba(255,255,255,.1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return toTexture(c, renderer, { srgb: false });
}
