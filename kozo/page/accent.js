// Màu nhấn của Studio Kōzō = 緑青 rokushō, gỉ đồng xanh — MÀU CỦA PHÉP ĐO. Mike chọn 24/9.
// Mái đồng của thành Nagoya, thành Osaka ngả màu này sau nhiều chục năm: màu chỉ thời gian mới
// làm ra được — khớp câu "made to outlast everyone who worked on them".
//
// KHÔNG PHẢI MỘT MÀU mà một DẢI 10 NẤC (Mike 24/9: "làm màu nhấn sẽ cần nhiều sắc thái hơn").
// Dựng trong không gian OKLCH quanh gốc #3E9A80 (nấc 500): độ sáng cảm nhận bước đều, sắc độ
// đỉnh ở nấc gốc rồi thu dần về hai đầu, nấc sâu ngả lam một chút như đồng gỉ lâu năm.
//
// LUẬT DÙNG THEO NỀN — chọn nấc bằng cách ĐO độ sáng của chính các điểm ảnh sau chữ / sau nét:
//   nền sẫm (mặt đá, hàng cây): chữ 200 → 100 → 50 · nét 300 → 200 → 100, quầng tối mảnh
//   nền sáng (sương)          : chữ 700 → 800 → 900 · nét 600 → 700 → 800, quầng sáng mảnh
//   lấy nấc ĐẦU TIÊN trong dãy đạt ngưỡng (chữ ≥ 4,5:1, nét ≥ 3:1) với điểm ảnh BẤT LỢI NHẤT
//   (chữ sáng: điểm nền sáng nhất; chữ tối: điểm nền tối nhất). Quầng chỉ để đẹp, không tính điểm.
export const RAMP = {
  50: '#EDF9F4', 100: '#D7EEE5', 200: '#B2DDCD', 300: '#8BC8B3', 400: '#62B198',
  500: '#3E9A80', 600: '#2C7B66', 700: '#236050', 800: '#1D483C', 900: '#19342C',
};
export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
export const ACCENTS = { rokusho: { ja: '緑青', en: 'rokushō', gloss: 'copper patina', line: RAMP[500], ink: RAMP[700] } };
export const PAPER = '#ebeae5';   // màu chữ khắc trong dấu (白文印: chữ trắng trên nền màu)

const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
export const lumHex = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
export const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
export const Y = Object.fromEntries(STEPS.map((s) => [s, lumHex(RAMP[s])]));

// bg = { lo, hi }: độ sáng tối nhất / sáng nhất (phân vị 5 / 95) của điểm ảnh cảnh sau vật
export function pick(bg, kind, prev) {
  // chọn với biên an toàn: nét mảnh bị khử răng cưa pha với nền, chữ nhỏ cũng vậy — trên ảnh thật
  // độ tương phản đo được thấp hơn màu tô. Đích thật vẫn là 4,5:1 (chữ) và 3:1 (nét).
  const need = kind === 'text' ? 5.2 : 3.9;
  const light = kind === 'text' ? [200, 100, 50] : [300, 200, 100];
  const dark = kind === 'text' ? [700, 800, 900] : [600, 700, 800];
  const ok = (s) => (Y[s] > 0.3 ? ratio(Y[s], bg.hi) : ratio(Y[s], bg.lo)) >= need;
  // giữ nấc cũ nếu nó vẫn đạt — không đổi màu vô cớ (chống nhấp nháy)
  if (prev && ok(prev)) return prev;
  const darkBg = (bg.lo + bg.hi) / 2 < 0.3;
  const order = darkBg ? [...light, ...dark] : [...dark, ...light];
  for (const s of order) if (ok(s)) return s;
  // không nấc nào đạt: nấc cho tương phản cao nhất
  let best = order[0], bv = 0;
  for (const s of STEPS) { const v = Y[s] > 0.3 ? ratio(Y[s], bg.hi) : ratio(Y[s], bg.lo); if (v > bv) { bv = v; best = s; } }
  return best;
}
export const haloOf = (s) => (Y[s] > 0.3 ? RAMP[900] : RAMP[50]);   // quầng ngược tông

export function accentId() {
  const q = new URLSearchParams(location.search);
  const a = (q.get('accent') || 'rokusho').toLowerCase();
  return a === 'none' ? null : 'rokusho';
}

// Dấu vuông 白文印: khối vuông màu nhấn (nấc 500), chữ 構 khắc chìm màu giấy. Cỡ ≥ 24 px có thêm
// đường viền trong mảnh; cỡ nhỏ (favicon) bỏ viền trong, mép vuông đặt đúng lưới điểm ảnh.
export function sealSVG(color, px, title) {
  const big = px >= 24;
  const t = title ? `<title>${title}</title>` : '';
  const font = `'Shippori Mincho','Yu Mincho','Hiragino Mincho ProN','Noto Serif CJK JP','Songti SC',serif`;
  if (!big) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 16 16" shape-rendering="crispEdges">${t}`
      + `<rect x="0" y="0" width="16" height="16" fill="${color}"/>`
      + `<text x="8" y="8.6" font-family="${font}" font-weight="700" font-size="13" text-anchor="middle" dominant-baseline="central" fill="${PAPER}" shape-rendering="auto">構</text></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 32 32">${t}`
    + `<rect x="0" y="0" width="32" height="32" rx="1.6" fill="${color}"/>`
    + `<rect x="2.6" y="2.6" width="26.8" height="26.8" rx="0.8" fill="none" stroke="${PAPER}" stroke-width="1.1"/>`
    + `<text x="16" y="16.9" font-family="${font}" font-weight="600" font-size="21" text-anchor="middle" dominant-baseline="central" fill="${PAPER}">構</text></svg>`;
}
