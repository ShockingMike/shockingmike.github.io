/* The ocean chart: a paper chart of the whole voyage on the Mercator projection (every rhumb line is straight),
   in the same engraved style as the harbour chart. Coastlines come from ../coast.js (ATLAS units), mapped onto the
   sheet by one affine transform because both projections are Mercator. The route itself is not printed: it is inked
   live on top of the paper (sheet.js), leg by leg. */
import { rng, TAU } from './util.js';
import { makeCanvas, toTexture, paperBase, neatline, ageing, compassRose, spacing, fitText, NAVY, MARKER, PAPER } from './canvas-tex.js';
import { OCEAN, oceanXY, PORTS, HOME, RAD, mercY } from '../voyage.js';
import { COAST_ATLAS, COAST_PATH } from '../coast.js';
import { COPY, splitFirst } from '../copy.js';

/* Label placement per port: offset from the marker and alignment, chosen to sit on land and off the route. */
const LABELS = {
  merrowick: { dx: -16, dy: -30, align: 'right', size: 20 },
  guatemala: { at: [66, 296], align: 'left', split: true, size: 15.5, csize: 11.5, leader: [[104, 340], [120, 424]] },
  colombia: { dx: 22, dy: 46, align: 'left', size: 18, csize: 12 },
  brazil: { dx: -16, dy: -6, align: 'right' },
  kenya: { dx: -16, dy: 12, align: 'right' },
  ethiopia: { dx: -16, dy: -26, align: 'right' },
  sumatra: { dx: -16, dy: 44, align: 'right' }
};
// Two lines at the space nearest the middle: "SANTO TOMÁS DE CASTILLA" -> "SANTO TOMÁS" / "DE CASTILLA"
const splitMiddle = (s) => {
  let best = -1;
  for (let i = 0; i < s.length; i++) if (s[i] === ' ' && (best < 0 || Math.abs(i - s.length / 2) < Math.abs(best - s.length / 2))) best = i;
  return best < 0 ? [s] : [s.slice(0, best), s.slice(best + 1)];
};
export const OCEAN_LAYOUT = {
  cartouche: { x: 150, y: 782, w: 440, h: 128 },
  rose: { x: 1120, y: 740, r: 74 },
  scale: { x: 1030, y: 912, lat: 45 }
};

export function oceanChartTexture(renderer, px, route) {
  const O = OCEAN, W = O.W, H = O.H, s = px / W;
  const c = makeCanvas(px, Math.round(H * s)), g = c.getContext('2d');
  const R = rng(2203);
  g.scale(s, s);
  paperBase(g, W, H, 2203);

  // coast path (ATLAS units) -> sheet units: x' = a x + e, y' = a y + f
  const KA = COAST_ATLAS.W / ((COAST_ATLAS.lonMax - COAST_ATLAS.lonMin) * RAD);
  const a = O.k / KA;
  const e = O.M2 - (O.lonW - COAST_ATLAS.lonMin) * RAD * O.k;
  const f = O.M2 + (O.psiN - mercY(COAST_ATLAS.latTop)) * O.k;
  const land = new Path2D(COAST_PATH);

  g.save();
  g.beginPath(); g.rect(O.M2, O.M2, W - 2 * O.M2, H - 2 * O.M2); g.clip();

  // depth contours: rings at fixed offsets from the coast (stroke wide, punch out the inside), on a layer
  const layer = makeCanvas(c.width, c.height), lg = layer.getContext('2d');
  lg.setTransform(s * a, 0, 0, s * a, s * e, s * f);
  lg.lineJoin = 'round'; lg.lineCap = 'round';
  [[34, 1.4], [20, 1.4], [10, 1.6]].forEach(([d, lw]) => {
    lg.globalCompositeOperation = 'source-over'; lg.strokeStyle = '#1B2A3A'; lg.lineWidth = (2 * d + lw) / a; lg.stroke(land);
    lg.globalCompositeOperation = 'destination-out'; lg.lineWidth = (2 * d) / a; lg.stroke(land);
  });
  lg.globalCompositeOperation = 'source-over';
  // shallow water band
  g.save(); g.transform(a, 0, 0, a, e, f);
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(201,220,216,.95)'; g.lineWidth = 17 / a; g.stroke(land);
  g.restore();
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 0.34; g.drawImage(layer, 0, 0); g.restore();

  // graticule, tropics, equator
  g.strokeStyle = 'rgba(27,42,58,.18)'; g.lineWidth = 1.2;
  for (let lon = -80; lon <= O.lonE; lon += 20) { const [x] = oceanXY(0, lon); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let lat = -40; lat <= 60; lat += 20) { const [, y] = oceanXY(lat, 0); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.setLineDash([14, 9]); g.strokeStyle = 'rgba(27,42,58,.3)';
  [23.44, -23.44].forEach((lat) => { const [, y] = oceanXY(lat, 0); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); });
  g.setLineDash([]);
  { const [, y] = oceanXY(0, 0); g.strokeStyle = 'rgba(27,42,58,.42)'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

  // faint rhumb lines radiating from the rose
  const rose = OCEAN_LAYOUT.rose;
  g.strokeStyle = 'rgba(27,42,58,.07)'; g.lineWidth = 1;
  for (let i = 0; i < 32; i++) { const q = (i / 32) * TAU; g.beginPath(); g.moveTo(rose.x, rose.y); g.lineTo(rose.x + Math.sin(q) * 1800, rose.y - Math.cos(q) * 1800); g.stroke(); }

  // land and coastline
  g.save(); g.transform(a, 0, 0, a, e, f);
  g.fillStyle = '#E4D3AC'; g.fill(land);
  g.strokeStyle = NAVY; g.lineWidth = 2.1 / a; g.lineJoin = 'round'; g.stroke(land);
  g.restore();
  // stipple on land
  g.save(); g.setTransform(s * a, 0, 0, s * a, s * e, s * f); g.clip(land); g.setTransform(s, 0, 0, s, 0, 0);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(92,59,38,${0.05 + R() * 0.08})`; g.fillRect(R() * W, R() * H, 1.4, 1.4); }
  g.restore();

  // soundings in open water, clear of land, route, labels and furniture
  const onLand = (x, y) => { g.save(); g.setTransform(s * a, 0, 0, s * a, s * e, s * f); const r = g.isPointInPath(land, x * s, y * s); g.restore(); return r; };
  const nearLand = (x, y) => onLand(x, y) || onLand(x + 26, y) || onLand(x - 26, y) || onLand(x, y + 22) || onLand(x, y - 22);
  const routeDist = (x, y) => {
    let best = 1e9;
    const P = route ? route.pts : [];
    for (let i = 1; i < P.length; i++) {
      const ax = P[i - 1].x, ay = P[i - 1].y, bx = P[i].x, by = P[i].y, dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
    }
    return best;
  };
  const keepOut = [];
  const ct = OCEAN_LAYOUT.cartouche;
  keepOut.push([ct.x - 20, ct.y - 20, ct.w + 40, ct.h + 40], [rose.x - rose.r - 30, rose.y - rose.r - 30, 2 * rose.r + 60, 2 * rose.r + 60], [OCEAN_LAYOUT.scale.x - 30, OCEAN_LAYOUT.scale.y - 40, 330, 70]);
  // the graticule labels along the left and top neatlines
  keepOut.push([O.M2, O.M2, 120, H], [O.M2, O.M2, W, 44]);
  const places = [HOME, ...PORTS];
  places.forEach((p) => { const [x, y] = oceanXY(p.lat, p.lon); keepOut.push([x - 230, y - 80, 460, 160]); });
  const blocked = (x, y) => keepOut.some(([bx, by, bw, bh]) => x > bx && x < bx + bw && y > by && y < by + bh);
  g.fillStyle = 'rgba(27,42,58,.62)'; g.textAlign = 'center';
  g.font = 'italic 500 19px "EB Garamond", Georgia, serif';
  const placed = [];
  for (let tries = 0; tries < 1400 && placed.length < 56; tries++) {
    const x = O.M2 + 30 + R() * (W - 2 * O.M2 - 60), y = O.M2 + 30 + R() * (H - 2 * O.M2 - 60);
    if (blocked(x, y) || placed.some(([px, py]) => Math.abs(px - x) < 78 && Math.abs(py - y) < 40)) continue;
    if (nearLand(x, y) || routeDist(x, y) < 26) continue;
    g.fillText(String(1200 + Math.round(R() * 440) * 10), x, y);
    placed.push([x, y]);
  }

  // graticule labels inside the neatline
  g.fillStyle = 'rgba(27,42,58,.75)'; g.font = '500 15px "IBM Plex Mono", monospace';
  for (let lon = -80; lon <= O.lonE; lon += 20) { const [x] = oceanXY(0, lon); g.textAlign = 'left'; g.fillText(`${Math.abs(lon)}°${lon < 0 ? 'W' : lon > 0 ? 'E' : ''}`, x + 5, O.M2 + 20); }
  for (let lat = -40; lat <= 60; lat += 20) { const [, y] = oceanXY(lat, 0); g.textAlign = 'left'; g.fillText(`${Math.abs(lat)}°${lat < 0 ? 'S' : lat > 0 ? 'N' : ''}`, O.M2 + 6, y - 6); }

  compassRose(g, rose);

  // ports: ring markers, names and coordinates from the approved copy
  const mark = (x, y) => {
    g.fillStyle = PAPER; g.strokeStyle = MARKER; g.lineWidth = 3.4;
    g.beginPath(); g.arc(x, y, 8.5, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = MARKER; g.beginPath(); g.arc(x, y, 2.8, 0, TAU); g.fill();
  };
  const label = (id, x, y, name, coords) => {
    const L = LABELS[id];
    const lx = L.at ? L.at[0] : x + L.dx, ly = L.at ? L.at[1] : y + L.dy;
    if (L.leader) { g.strokeStyle = 'rgba(27,42,58,.55)'; g.lineWidth = 1.2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(L.leader[0][0], L.leader[0][1]); g.lineTo(L.leader[1][0], L.leader[1][1]); g.stroke(); g.setLineDash([]); }
    g.textAlign = L.align;
    g.fillStyle = NAVY;
    spacing(g, 2.5);
    const lines = L.split ? splitMiddle(name.toUpperCase()) : [name.toUpperCase()];
    const size = L.size || 22, step = Math.round(size * 0.95);
    let yy = ly - step;
    lines.forEach((line) => { yy += step; fitText(g, line, '600 {s}px "Barlow Condensed", "Arial Narrow", sans-serif', size, 260); g.fillText(line, lx, yy); });
    spacing(g, 0);
    const cs = L.csize || 13.5;
    yy += Math.round(cs * 1.3); g.fillStyle = 'rgba(27,42,58,.72)'; g.font = `500 ${cs}px "IBM Plex Mono", monospace`; g.fillText(coords, lx, yy);
  };
  {
    const [x, y] = oceanXY(HOME.lat, HOME.lon);
    mark(x, y);
    label('merrowick', x, y, COPY['port.name'], COPY['port.coordinates']);
  }
  PORTS.forEach((p) => {
    const [x, y] = oceanXY(p.lat, p.lon);
    mark(x, y);
    const C = COPY.origins[p.id];
    label(p.id, x, y, splitFirst(C.port)[0], C.portCoords);
  });

  // title cartouche (voyage.chartTitle)
  g.fillStyle = 'rgba(241,232,212,.9)'; g.fillRect(ct.x, ct.y, ct.w, ct.h);
  g.strokeStyle = NAVY; g.lineWidth = 2; g.strokeRect(ct.x, ct.y, ct.w, ct.h);
  g.lineWidth = 1; g.strokeRect(ct.x + 8, ct.y + 8, ct.w - 16, ct.h - 16);
  g.fillStyle = NAVY; g.textAlign = 'center';
  fitText(g, COPY['voyage.chartTitle'], 'italic 500 {s}px "EB Garamond", Georgia, serif', 46, ct.w - 44);
  g.fillText(COPY['voyage.chartTitle'], ct.x + ct.w / 2, ct.y + 66);
  g.fillStyle = MARKER; g.fillRect(ct.x + ct.w / 2 - 70, ct.y + 84, 140, 3);
  g.fillStyle = 'rgba(27,42,58,.8)'; g.font = '500 16px "IBM Plex Mono", monospace';
  spacing(g, 2);
  g.fillText(`${COPY['port.name'].toUpperCase()} · ${COPY['port.coordinates']}`, ct.x + ct.w / 2, ct.y + 110);
  spacing(g, 0);

  // scale bar: 2,000 nmi at 45°, in five spans
  const sc = OCEAN_LAYOUT.scale;
  const unitsPerNmi = (O.k * RAD) / 60 / Math.cos(sc.lat * RAD);
  const span = (400 * unitsPerNmi);
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? PAPER : NAVY; g.fillRect(sc.x + i * span, sc.y, span, 8); g.strokeStyle = NAVY; g.lineWidth = 1.4; g.strokeRect(sc.x + i * span, sc.y, span, 8); }
  g.fillStyle = NAVY; g.font = '500 14px "IBM Plex Mono", monospace'; g.textAlign = 'center';
  g.fillText('0', sc.x, sc.y - 8); g.fillText('1000', sc.x + span * 2.5, sc.y - 8); g.fillText('2000', sc.x + span * 5, sc.y - 8);
  g.textAlign = 'left'; g.fillText(`${COPY['hero.distanceUnit']} · ${sc.lat}°`, sc.x + span * 5 + 14, sc.y + 8);

  g.restore();
  neatline(g, W, H, O.M, O.M2);
  ageing(g, W, H);
  return toTexture(c, renderer);
}
