// Chớm page layer: the blend rules (docs/content/chom-copy.md, "Bảng tên pha mùi").
// Pure functions, no DOM.

export const SEASONS = ['xuan', 'ha', 'thu', 'dong'];   // year order: scroll order and tie-break order
export const STEP = 5;                                   // arrow keys change a slider by 5
export const EQUAL = { xuan: 25, ha: 25, thu: 25, dong: 25 };

// The season colours used by every painted blend picture (loader swatch, blend table, order card, sampler).
// Pink peach blossom, lotus-leaf green, night blue of Nguyễn Du, coal ember.
export const PAINT = {
  xuan: '#d86f8e',
  ha: '#6f8d4b',
  thu: '#34406e',
  dong: '#cf5a26',
};

// Which name the blend gets.
//   dominant = highest amount; a tie goes to the season earlier in the year (Xuân → Hạ → Thu → Đông)
//   second   = highest of the other three; a tie goes to the season that comes next after the dominant one,
//              going round the year (after Đông comes Xuân): "chớm", the season on its way
//   exactly one season above 0 → solo; all four at 0 → empty
export function blendName(v) {
  const on = SEASONS.filter((s) => v[s] > 0);
  if (on.length === 0) return { kind: 'empty' };
  if (on.length === 1) return { kind: 'solo', season: on[0] };
  let d = SEASONS[0];
  for (const s of SEASONS) if (v[s] > v[d]) d = s;
  const di = SEASONS.indexOf(d);
  const round = [1, 2, 3].map((k) => SEASONS[(di + k) % 4]);
  let second = round[0];
  for (const s of round) if (v[s] > v[second]) second = s;
  return { kind: 'pair', dominant: d, second };
}

// Each season's share of the blend in whole per cent, summing to exactly 100 (largest remainder).
export function shares(v) {
  const total = SEASONS.reduce((a, s) => a + Math.max(0, v[s]), 0);
  if (!total) return { xuan: 0, ha: 0, thu: 0, dong: 0 };
  const raw = SEASONS.map((s) => (Math.max(0, v[s]) * 100) / total);
  const out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) { if (left <= 0) break; out[i] += 1; left -= 1; }
  return Object.fromEntries(SEASONS.map((s, i) => [s, out[i]]));
}

export const isEqual = (v) => SEASONS.every((s) => v[s] === EQUAL[s]);

// Mix the season colours by amount, for the painted "mixed" swatch.
export function mixColour(v) {
  const total = SEASONS.reduce((a, s) => a + Math.max(0, v[s]), 0);
  if (!total) return null;
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const enc = (c) => Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055));
  const acc = [0, 0, 0];
  for (const s of SEASONS) {
    const w = Math.max(0, v[s]) / total;
    const hex = PAINT[s];
    for (let k = 0; k < 3; k++) acc[k] += w * lin(parseInt(hex.slice(1 + 2 * k, 3 + 2 * k), 16));
  }
  return `rgb(${acc.map(enc).join(',')})`;
}
