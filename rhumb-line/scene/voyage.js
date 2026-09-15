/* Rhumb Line · scene/voyage.js
   Geography of the voyage, no DOM and no three.js: Merrowick, the six ports in voyage order, the growing regions used
   for compass bearings, the sea lanes between them (each leg a chain of rhumb-line runs that keeps clear of land, home
   by Suez), rhumb-line maths and the Mercator window of the ocean chart that lies on the cabin table. */

export const RAD = Math.PI / 180;
export const NMI_PER_RADIAN = 3440.065;
export const wrapDeg = (d) => ((d % 360) + 360) % 360;
export const angleGap = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
export const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));

// Degrees and minutes as printed in the copy (e.g. 44°48′N 62°37′W) to decimal degrees.
const dm = (d, m, hemi) => (d + m / 60) * (hemi === 'S' || hemi === 'W' ? -1 : 1);

/* The roastery's harbour (port.coordinates). */
export const HOME = { id: 'merrowick', name: 'Merrowick', lat: dm(44, 48, 'N'), lon: dm(62, 37, 'W') };
/* The roastery as the flat page used it for bearings (rounded to the harbour). */
export const ROASTERY = { id: 'merrowick', lat: 44.80, lon: -62.62 };

/* Growing regions, decimal degrees tuned to the farms (from ORIGINS of the flat page). Bearings point here. */
export const ORIGINS = [
  { id: 'ethiopia', region: 'Yirgacheffe', lat: 6.16, lon: 38.20 },
  { id: 'kenya', region: 'Nyeri', lat: -0.42, lon: 36.95 },
  { id: 'colombia', region: 'Huila', lat: 1.85, lon: -76.05 },
  { id: 'guatemala', region: 'Huehuetenango', lat: 15.32, lon: -91.47 },
  { id: 'sumatra', region: 'Gayo', lat: 4.62, lon: 96.85 },
  { id: 'brazil', region: 'Mogiana', lat: -20.54, lon: -47.40 }
];
export const ORIGIN = Object.fromEntries(ORIGINS.map((o) => [o.id, o]));
export const DEFAULT_ORIGIN = 'ethiopia';

/* Ports in voyage order (origins.<id>.portCoords). */
export const PORTS = [
  { id: 'guatemala', name: 'Santo Tomás', lat: dm(15, 41, 'N'), lon: dm(88, 37, 'W') },
  { id: 'colombia', name: 'Cartagena', lat: dm(10, 24, 'N'), lon: dm(75, 32, 'W') },
  { id: 'brazil', name: 'Santos', lat: dm(23, 59, 'S'), lon: dm(46, 18, 'W') },
  { id: 'kenya', name: 'Mombasa', lat: dm(4, 3, 'S'), lon: dm(39, 39, 'E') },
  { id: 'ethiopia', name: 'Djibouti', lat: dm(11, 36, 'N'), lon: dm(43, 8, 'E') },
  { id: 'sumatra', name: 'Belawan', lat: dm(3, 47, 'N'), lon: dm(98, 41, 'E') }
];
export const VOYAGE_ORDER = PORTS.map((p) => p.id);

/* Sea lanes. Each leg runs from the previous port to the next through turning points [lat, lon]; between turning
   points the ship holds one compass course, so every run is a rhumb line and draws straight on the Mercator chart.
   A named turning point marks where an interlude sits on the route. */
export const LEGS = [
  { to: 'guatemala', via: [[33.5, -69.6], [23.4, -73.7], [20.1, -73.9], [17.2, -78.3], [16.9, -84.4], [16.1, -87.7]] },
  { to: 'colombia', via: [[16.2, -87.4], [16.5, -85.2], [14.8, -81.4], [12.2, -77.6]] },
  { to: 'brazil', via: [[12.9, -71.2], [12.7, -65.0], [11.7, -61.1], [7.9, -52.2], [2.2, -40.3], [-5.3, -33.9], [-13.4, -37.2], [-21.0, -39.3], [-24.3, -45.4]] },
  { to: 'kenya', via: [[-25.6, -43.6], [-33.6, -18.0], [-36.3, 19.6, 'cape'], [-34.5, 27.6], [-30.6, 32.4], [-25.6, 36.1], [-20.0, 38.2], [-15.0, 41.7], [-10.8, 41.3], [-6.2, 40.6], [-4.3, 40.1]] },
  { to: 'ethiopia', via: [[-3.2, 41.4], [2.0, 47.6], [8.0, 51.6], [12.2, 52.0], [12.0, 45.6], [11.75, 43.7]] },
  { to: 'sumatra', via: [[12.0, 45.6], [12.3, 52.0], [7.4, 70.0, 'night'], [5.3, 80.6], [6.2, 94.4], [5.7, 97.4], [4.3, 98.9]] },
  { to: 'merrowick', via: [[4.3, 98.9], [5.7, 97.4], [6.2, 94.4], [5.3, 80.6], [7.6, 70.0], [12.3, 52.0], [12.0, 45.4], [12.6, 43.4], [15.6, 41.8], [20.0, 38.6], [24.5, 35.8], [27.6, 34.1], [29.9, 32.6], [31.4, 32.3], [32.6, 28.0], [34.2, 24.5], [36.3, 17.2], [37.35, 11.8, 'homeward'], [37.5, 5.0], [36.2, -2.0], [35.95, -5.6], [36.1, -7.6], [37.0, -12.0]] }
];

const portById = Object.fromEntries(PORTS.map((p) => [p.id, p]));
portById.merrowick = HOME;

/* Rhumb line (constant compass course) from a to b: initial = final bearing in degrees true, distance in nautical miles.
   Δψ is the stretched latitude difference of Mercator; q falls back to cos φ on east-west courses. */
export function rhumb(a, b) {
  const f1 = a.lat * RAD, f2 = b.lat * RAD, df = f2 - f1;
  let dl = (b.lon - a.lon) * RAD;
  if (Math.abs(dl) > Math.PI) dl = dl > 0 ? dl - 2 * Math.PI : dl + 2 * Math.PI;
  const dpsi = Math.log(Math.tan(Math.PI / 4 + f2 / 2) / Math.tan(Math.PI / 4 + f1 / 2));
  const q = Math.abs(dpsi) > 1e-12 ? df / dpsi : Math.cos(f1);
  return { bearing: wrapDeg(Math.atan2(dl, dpsi) / RAD), nmi: Math.sqrt(df * df + q * q * dl * dl) * NMI_PER_RADIAN };
}

export const COURSES = Object.fromEntries(ORIGINS.map((o) => [o.id, rhumb(ROASTERY, o)]));

/* The growing region whose course from Merrowick is closest to a compass bearing. */
export function nearestOrigin(bearing) {
  let best = ORIGINS[0].id, gap = 361;
  for (const o of ORIGINS) { const d = angleGap(COURSES[o.id].bearing, bearing); if (d < gap) { gap = d; best = o.id; } }
  return best;
}

/* A bearing reading as the page shows it: whole degrees, the nearest region, and the distance to it. */
export function bearingReading(deg) {
  const d = Math.round(wrapDeg(deg)) % 360;
  const originId = nearestOrigin(d);
  return { deg: d, originId, nmi: Math.round(COURSES[originId].nmi) };
}

/* ---------- The ocean chart: a Mercator window on a 1400 x 1000 sheet (same units as the harbour chart) ---------- */
export const OCEAN = { W: 1400, H: 1000, M: 44, M2: 58, lonW: -100, lonE: 124, latN: 63 };
{
  const O = OCEAN;
  O.mapW = O.W - 2 * O.M2; O.mapH = O.H - 2 * O.M2;
  O.k = O.mapW / ((O.lonE - O.lonW) * RAD); // sheet units per radian of longitude (and of stretched latitude)
  O.psiN = mercY(O.latN);
  O.psiS = O.psiN - O.mapH / O.k;
  O.latS = (2 * Math.atan(Math.exp(O.psiS)) - Math.PI / 2) / RAD;
}
export function oceanXY(lat, lon) {
  return [OCEAN.M2 + (lon - OCEAN.lonW) * RAD * OCEAN.k, OCEAN.M2 + (OCEAN.psiN - mercY(lat)) * OCEAN.k];
}

/* The whole voyage as one polyline in ocean-sheet units, with the route parameter: p = leg index + fraction of that
   leg's drawn length (0 = Merrowick, 1 = Santo Tomás ... 6 = Belawan, 7 = home). */
export function buildRoute() {
  const pts = [], legStart = [], legLen = [], marks = {};
  let prev = HOME, dist = 0;
  const push = (lat, lon) => {
    const [x, y] = oceanXY(lat, lon);
    if (pts.length) { const q = pts[pts.length - 1]; dist += Math.hypot(x - q.x, y - q.y); }
    pts.push({ x, y, d: dist, lat, lon });
  };
  push(HOME.lat, HOME.lon);
  LEGS.forEach((leg, i) => {
    legStart.push(dist);
    const named = [];
    leg.via.forEach(([lat, lon, name]) => { push(lat, lon); if (name) named.push([name, dist]); });
    const end = portById[leg.to];
    push(end.lat, end.lon);
    legLen.push(dist - legStart[i]);
    named.forEach(([name, d]) => { marks[name] = i + (d - legStart[i]) / legLen[i]; });
    prev = end;
  });
  const total = dist;
  const distAt = (p) => {
    const i = Math.max(0, Math.min(LEGS.length - 1, Math.floor(p)));
    const f = Math.max(0, Math.min(1, p - i));
    return p <= 0 ? 0 : p >= LEGS.length ? total : legStart[i] + legLen[i] * f;
  };
  // position and heading (radians, sheet space: 0 = east/right, y down) at a distance along the route
  const at = (d) => {
    d = Math.max(0, Math.min(total, d));
    let k = 1;
    while (k < pts.length - 1 && pts[k].d < d) k++;
    const a = pts[k - 1], b = pts[k], seg = Math.max(1e-6, b.d - a.d), f = Math.max(0, Math.min(1, (d - a.d) / seg));
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, heading: Math.atan2(b.y - a.y, b.x - a.x) };
  };
  return { pts, total, legStart, legLen, marks, distAt, at, homeStart: legStart[LEGS.length - 1] };
}

export const PORT = portById;
