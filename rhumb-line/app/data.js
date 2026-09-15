/* Rhumb Line · app/data.js
   Numbers and rules only, no words: the approved copy lives in index.html and is read from the DOM.
   Copied from the round-two main.js (blocks 1 and 2): origins, flavours, plans, quiz scoring, rhumb-line maths,
   formats and the bag label's topography; plus the desk's objects and routes. Pure functions, no DOM. */

export const RAD = Math.PI / 180;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// The roastery's harbour town (fictional). Printed as port.coordinates: 44°48′N 62°37′W.
export const ROASTERY = { id: 'merrowick', lat: 44.8, lon: -62.6167 };

// Things on the desk (desk contract v2, section 2). The first six open a panel; the porthole and the lamp act in place.
export const OBJECTS = ['log', 'chart', 'chest', 'compass', 'crew', 'letter', 'cup', 'porthole', 'lamp'];
export const PANELS = ['log', 'chart', 'chest', 'compass', 'crew', 'letter', 'cup'];
// The order the desk suggests (design 4E); the cup stands outside it.
export const HINT_ORDER = ['log', 'chart', 'chest', 'compass', 'crew', 'letter'];
// Address of each panel (#crew-list for the crew list); #chart/<origin> opens a leg.
export const ROUTES = { log: 'log', chart: 'chart', chest: 'chest', compass: 'compass', crew: 'crew-list', letter: 'letter', cup: 'cup' };
// Sea moments behind the porthole, in turn; null is back to the current weather.
export const MOMENTS = ['cape', 'night', 'homeward', null];

// Voyage order of the six legs.
export const LEGS = ['guatemala', 'colombia', 'brazil', 'kenya', 'ethiopia', 'sumatra'];

// Six real growing regions (decimal degrees of the farm area).
// - altitude: metres, shapes the label's topography (the farm's band).
// - flavors: FLAVORS keys. roastDay: weekday the origin goes into the drum (0 = Sunday).
export const ORIGINS = [
  { id: 'ethiopia', lat: 6.16, lon: 38.2, altitude: [1900, 2200], flavors: ['floral', 'citrus', 'fruity'], roastDay: 1 },
  { id: 'kenya', lat: -0.42, lon: 36.95, altitude: [1700, 1900], flavors: ['fruity', 'citrus', 'sweet'], roastDay: 2 },
  { id: 'colombia', lat: 1.85, lon: -76.05, altitude: [1600, 1850], flavors: ['fruity', 'sweet', 'chocolate'], roastDay: 3 },
  { id: 'guatemala', lat: 15.32, lon: -91.47, altitude: [1700, 2000], flavors: ['chocolate', 'citrus', 'nutty'], roastDay: 4 },
  { id: 'sumatra', lat: 4.62, lon: 96.85, altitude: [1300, 1600], flavors: ['spice', 'roasty', 'sweet'], roastDay: 5 },
  { id: 'brazil', lat: -20.54, lon: -47.4, altitude: [950, 1150], flavors: ['nutty', 'chocolate', 'sweet'], roastDay: 6 },
];
export const ORIGIN = {};
ORIGINS.forEach((o) => { ORIGIN[o.id] = o; });
export const DEFAULT_ORIGIN = 'ethiopia';

// Flavour families, clockwise from north on the dial.
export const FLAVORS = ['floral', 'fruity', 'citrus', 'sweet', 'chocolate', 'nutty', 'spice', 'roasty'];

// USD per delivery. Names, contents and pitches are copy in index.html.
export const PLANS = { harbour: { price: 16 }, passage: { price: 29 }, expedition: { price: 44 } };

/* Quiz scoring: one fixed table, so the same answers always give the same result.
   Every answer adds the points listed under its question; the highest total wins.
   - Plan (Q3 cups a week, Q4 stay or rotate):
       few → Harbour 5 · steady → Passage 3 · crew → Passage 3, Expedition 2
       stay → Harbour 1, Passage 1 · rotate → Expedition 4
     A few cups always gives Harbour (5 beats 4). Steady or crew gives Passage, unless the reader wants a new origin
     every delivery: then Expedition wins (4 or 6 beats 3). No combination ties; planOrder would settle one.
   - Origin (Q2 taste, Q1 brew method): the taste gives 3 points to its pair (bright: Ethiopia, Kenya · balanced:
     Colombia, Guatemala · deep: Sumatra, Brazil). The brew method gives 1 point to exactly one origin of each pair.
   - Grind comes straight from Q1 (data-grind in index.html). Price comes from PLANS.
   Examples for QA: filter, bright, few, stay → Harbour · espresso, deep, steady, rotate → Expedition ·
   press, balanced, crew, stay → Passage. */
export const QUIZ = {
  planOrder: ['expedition', 'passage', 'harbour'],
  originOrder: ORIGINS.map((o) => o.id),
  points: {
    1: {
      espresso: { kenya: 1, colombia: 1, brazil: 1 },
      filter: { ethiopia: 1, guatemala: 1, brazil: 1 },
      press: { kenya: 1, colombia: 1, sumatra: 1 },
      moka: { kenya: 1, guatemala: 1, sumatra: 1 },
    },
    2: {
      bright: { ethiopia: 3, kenya: 3 },
      balanced: { colombia: 3, guatemala: 3 },
      deep: { sumatra: 3, brazil: 3 },
    },
    3: {
      few: { harbour: 5 },
      steady: { passage: 3 },
      crew: { passage: 3, expedition: 2 },
    },
    4: {
      stay: { harbour: 1, passage: 1 },
      rotate: { expedition: 4 },
    },
  },
};

// answers: { 1: 'filter', 2: 'bright', 3: 'few', 4: 'stay' } → { plan, origin, grindKey, price, totals }
export function scoreQuiz(answers) {
  const totals = {};
  Object.keys(QUIZ.points).forEach((q) => {
    const add = QUIZ.points[q][answers[q]] || {};
    Object.keys(add).forEach((k) => { totals[k] = (totals[k] || 0) + add[k]; });
  });
  const best = (order) => order.reduce((win, id) => ((totals[id] || 0) > (totals[win] || 0) ? id : win), order[0]);
  const plan = best(QUIZ.planOrder);
  return { plan, origin: best(QUIZ.originOrder), grindKey: answers[1] || null, price: PLANS[plan].price, totals };
}

/* ---------- Rhumb lines ---------- */

// Rhumb line (a course that keeps one compass bearing) from a to b. Δψ is the stretched latitude difference of the
// Mercator projection; q falls back to cos φ1 on east–west courses.
const NMI_PER_RADIAN = 3440.065;
export function rhumb(a, b) {
  const f1 = a.lat * RAD;
  const f2 = b.lat * RAD;
  const df = f2 - f1;
  let dl = (b.lon - a.lon) * RAD;
  if (Math.abs(dl) > Math.PI) dl = dl > 0 ? dl - 2 * Math.PI : dl + 2 * Math.PI;
  const dpsi = Math.log(Math.tan(Math.PI / 4 + f2 / 2) / Math.tan(Math.PI / 4 + f1 / 2));
  const q = Math.abs(dpsi) > 1e-12 ? df / dpsi : Math.cos(f1);
  return {
    bearing: (Math.atan2(dl, dpsi) / RAD + 360) % 360,
    nmi: Math.sqrt(df * df + q * q * dl * dl) * NMI_PER_RADIAN,
  };
}

export const COURSES = {};
ORIGINS.forEach((o) => { COURSES[o.id] = rhumb(ROASTERY, o); });

export const angleGap = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
export const wrapDeg = (deg) => ((deg % 360) + 360) % 360;

// The origin whose course from Merrowick is closest to a compass bearing.
export function nearestOrigin(bearing) {
  let best = ORIGINS[0].id;
  let gap = 361;
  ORIGINS.forEach((o) => {
    const d = angleGap(COURSES[o.id].bearing, bearing);
    if (d < gap) { gap = d; best = o.id; }
  });
  return best;
}

export const fmtDeg = (deg) => String(wrapDeg(Math.round(deg))).padStart(3, '0') + '°';
export const fmtNmi = (nmi) => Math.round(nmi).toLocaleString('en-US');
function fmtAngle(value, pos, neg) {
  const a = Math.abs(value);
  let deg = Math.floor(a);
  let min = Math.round((a - deg) * 60);
  if (min === 60) { deg += 1; min = 0; }
  return `${deg}°${String(min).padStart(2, '0')}′${value >= 0 ? pos : neg}`;
}
export const fmtLatLon = (lat, lon) => `${fmtAngle(lat, 'N', 'S')} ${fmtAngle(lon, 'E', 'W')}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function roastDate(weekday, today = new Date()) {
  const d = new Date(today.getTime());
  d.setDate(d.getDate() - ((d.getDay() - weekday + 7) % 7)); // the latest roast day, today included
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/* ---------- Noise and contours (the bag label's topography) ---------- */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seeded 2D gradient noise, about -0.7..0.7.
function makeNoise(seed) {
  const rand = mulberry32(seed);
  const base = [];
  for (let i = 0; i < 256; i++) base.push(i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = base[i]; base[i] = base[j]; base[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
  const GX = [1, -1, 1, -1, 1, -1, 0, 0];
  const GY = [1, 1, -1, -1, 0, 0, 1, -1];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, dx, dy) => GX[h & 7] * dx + GY[h & 7] * dy;
  return function (x, y) {
    const X = Math.floor(x);
    const Y = Math.floor(y);
    const xf = x - X;
    const yf = y - Y;
    const xi = X & 255;
    const yi = Y & 255;
    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];
    const u = fade(xf);
    const v = fade(yf);
    return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u), lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v);
  };
}

function fbm(noise, x, y, octaves) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq + i * 17.3, y * freq - i * 9.1);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/* Marching squares over (nx + 1) × (ny + 1) samples stored row by row. Returns polylines in grid units; a closed
   line repeats its first point (same array). Saddle cells are resolved with the mean of their corners. */
function isolines(values, nx, ny, level) {
  const cols = nx + 1;
  const hCount = (ny + 1) * nx;
  const points = new Map();
  const links = new Map();
  const pointOf = (id) => {
    let p = points.get(id);
    if (p) return p;
    if (id < hCount) {
      const j = Math.floor(id / nx);
      const i = id - j * nx;
      const a = values[j * cols + i];
      const b = values[j * cols + i + 1];
      p = [i + (level - a) / (b - a), j];
    } else {
      const k = id - hCount;
      const j = Math.floor(k / cols);
      const i = k - j * cols;
      const a = values[j * cols + i];
      const b = values[(j + 1) * cols + i];
      p = [i, j + (level - a) / (b - a)];
    }
    points.set(id, p);
    return p;
  };
  const link = (e1, e2) => {
    let l1 = links.get(e1);
    if (!l1) { l1 = []; links.set(e1, l1); }
    l1.push(e2);
    let l2 = links.get(e2);
    if (!l2) { l2 = []; links.set(e2, l2); }
    l2.push(e1);
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const tl = values[j * cols + i];
      const tr = values[j * cols + i + 1];
      const br = values[(j + 1) * cols + i + 1];
      const bl = values[(j + 1) * cols + i];
      const c = (tl >= level ? 8 : 0) | (tr >= level ? 4 : 0) | (br >= level ? 2 : 0) | (bl >= level ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const T = j * nx + i;
      const B = (j + 1) * nx + i;
      const L = hCount + j * cols + i;
      const R = L + 1;
      switch (c) {
        case 1: case 14: link(L, B); break;
        case 2: case 13: link(B, R); break;
        case 3: case 12: link(L, R); break;
        case 4: case 11: link(T, R); break;
        case 6: case 9: link(T, B); break;
        case 7: case 8: link(L, T); break;
        case 5:
          if ((tl + tr + br + bl) / 4 >= level) { link(L, T); link(B, R); } else { link(T, R); link(L, B); }
          break;
        case 10:
          if ((tl + tr + br + bl) / 4 >= level) { link(T, R); link(L, B); } else { link(L, T); link(B, R); }
          break;
        default: break;
      }
    }
  }
  const used = new Set();
  const lines = [];
  const walk = (start) => {
    const line = [pointOf(start)];
    used.add(start);
    let cur = start;
    for (;;) {
      const next = (links.get(cur) || []).find((e) => !used.has(e));
      if (next === undefined) {
        if (line.length > 2 && (links.get(cur) || []).includes(start)) line.push(line[0]);
        break;
      }
      used.add(next);
      line.push(pointOf(next));
      cur = next;
    }
    return line;
  };
  links.forEach((list, id) => { if (list.length === 1 && !used.has(id)) lines.push(walk(id)); });
  links.forEach((list, id) => { if (!used.has(id)) lines.push(walk(id)); });
  return lines;
}

const isClosed = (line) => line.length > 3 && line[0] === line[line.length - 1];

// Smooth SVG path data through polylines (quadratic curves through segment midpoints). Canvas reads it via Path2D.
function toPath(lines, scale, offsetX, offsetY, minPoints) {
  const f = (n) => Math.round(n * 10) / 10;
  let d = '';
  for (const line of lines) {
    if (line.length < (minPoints || 3)) continue;
    const closed = isClosed(line);
    const pts = line.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY]);
    if (closed) {
      pts.pop();
      const n = pts.length;
      d += `M${f((pts[n - 1][0] + pts[0][0]) / 2)} ${f((pts[n - 1][1] + pts[0][1]) / 2)}`;
      for (let k = 0; k < n; k++) {
        const p = pts[k];
        const q = pts[(k + 1) % n];
        d += `Q${f(p[0])} ${f(p[1])} ${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`;
      }
      d += 'Z';
    } else {
      d += `M${f(pts[0][0])} ${f(pts[0][1])}`;
      for (let k = 1; k < pts.length - 1; k++) {
        const p = pts[k];
        const q = pts[k + 1];
        d += `Q${f(p[0])} ${f(p[1])} ${f((p[0] + q[0]) / 2)} ${f((p[1] + q[1]) / 2)}`;
      }
      const last = pts[pts.length - 1];
      d += `L${f(last[0])} ${f(last[1])}`;
    }
  }
  return d;
}

// Samples field(x, y) every `step` units, with one padding ring far below every level so all isolines close.
function sampleGrid(width, height, step, field) {
  const nx = Math.ceil(width / step) + 2;
  const ny = Math.ceil(height / step) + 2;
  const cols = nx + 1;
  const values = new Float32Array(cols * (ny + 1));
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const edge = i === 0 || j === 0 || i === nx || j === ny;
      values[j * cols + i] = edge ? -1e5 : field((i - 1) * step, (j - 1) * step);
    }
  }
  return { path: (level, minPoints) => toPath(isolines(values, nx, ny, level), step, -step, -step, minPoints) };
}

/* The bag label's art: a small topographic sheet seeded from the origin's coordinates, so one origin always gets
   the same hills; the band between the farm's lowest and highest altitude is outlined and tinted. */
const topoCache = new Map();
export function labelTopography(origin, width = 320, height = 180) {
  const key = `${origin.id}:${width}x${height}`;
  if (topoCache.has(key)) return topoCache.get(key);
  const seed = Math.round((origin.lat + 90) * 100) * 36001 + Math.round((origin.lon + 180) * 100);
  const rand = mulberry32(seed);
  const noise = makeNoise(seed);
  const [lo, hi] = origin.altitude;
  const peakX = width * (0.3 + rand() * 0.4);
  const peakY = height * (0.36 + rand() * 0.28);
  const angle = rand() * Math.PI;
  const stretch = 1.3 + rand() * 0.6;
  const spread = 60 + rand() * 28;
  const summit = hi + 480 + rand() * 320;
  const floor = lo - 680 - rand() * 240;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  let top = { e: -Infinity, x: peakX, y: peakY };
  const elev = (x, y) => {
    const dx = x - peakX;
    const dy = y - peakY;
    const u = (dx * cosA + dy * sinA) / stretch;
    const v = -dx * sinA + dy * cosA;
    const d = Math.hypot(u, v) / spread;
    const warp = fbm(noise, x / 70, y / 70, 3);
    const e = floor + (summit - floor) * Math.exp(-d * d * (0.9 + warp * 0.5)) + warp * 170;
    if (e > top.e) top = { e, x, y };
    return e;
  };
  const grid = sampleGrid(width, height, 4, elev);
  let minor = '';
  let index = '';
  for (let e = Math.ceil(floor / 100) * 100; e < summit; e += 100) {
    if (e === lo || e === hi) continue;
    if (e % 500 === 0) index += grid.path(e, 4); else minor += grid.path(e, 4);
  }
  const edge = grid.path(lo, 4) + grid.path(hi, 4);
  const topo = { band: edge, minor, index, edge, summit: { x: top.x, y: top.y } };
  topoCache.set(key, topo);
  return topo;
}
