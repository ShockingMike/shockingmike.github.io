// NẤC CHẤT LƯỢNG của Kōzō (B6, 29/9 — bạn Mike mở các trang trên laptop không card rời thì giật). Cùng cách các trang khác
// trong kho đã làm ngày 28/9 (home/js/quality.js, rhumb-line/scene/lib/quality.js, chom-world/core/quality.js):
//   · NẤC 0 là trang Mike đã duyệt (p7b), KHÔNG ĐỔI MỘT ĐIỂM ẢNH;
//   · mỗi nấc sau bỏ THỨ ĐẮT TRƯỚC, cỡ cảnh SAU CÙNG; cảnh không bao giờ vẽ dưới 0,7 lần điểm ảnh thật của màn hình;
//   · CHUYỂN ĐỘNG KHÔNG BAO GIỜ DỪNG (máy quay, nét mực, sương, nước, chuyển cảnh chạy y như nhau ở mọi nấc).
//
//   nấc  tia sáng  nhoè hậu cảnh   tầng loá  làm nét / tách màu   bóng nắng  lá kim rừng   cỡ cảnh
//   0    có        0,45 độ nét     8         có / có              3072       đủ            1
//   1    —         0,25 độ nét     8         có / có              3072       đủ            1
//   2    —         —               5         — / —                1536       60% gần nhất  1
//   3    —         —               5         làm nét 0,5 / —      1536       60%           0,85 (làm nét khi phóng lên)
//   4    —         —               4         làm nét 0,6 / —      1536       60%           0,75 (không dưới 0,7 màn hình)
//   (phần 8, chương 仕事: nấc 2–4 chỉ vẽ 55% cây gần nhất và bỏ hai lớp sương cao — bố cục không đổi: viecCay / viecSuong)
//   (phần 9, chương 連絡: nấc 2–3 vẽ 60% cây gần nhất, nấc 4 50%; bỏ làn sương lấm tấm sát đất; cỏ còn 50% / 40% — lhCay / lhSuong / lhCo)
//
// Chọn nấc: đoán nấc đầu theo TÊN CHIP (WEBGL_debug_renderer_info): chip tích hợp (Intel UHD/Iris, AMD "Radeon Graphics"
// tích hợp) và điện thoại vào thẳng nấc 2; Apple M (chip tích hợp khá mạnh) nấc 1. Chip VẼ BẰNG CPU (SwiftShader, llvmpipe,
// Microsoft Basic Render…) không nấc nào cứu được → trang vào BẢN ĐỌC CHỮ, không dựng cảnh. &q=0..4 ép nấc (để kiểm).
// Rồi bộ tự hạ đo khung thật (makeGovernor bên dưới).

export const NAC = [
  { god: 1, dof: 1, dofRes: null, bloom: null, cas: 1, sharp: null, chroma: 1, shadow: 3072, cards: 1, scale: 1, viecCay: 1, viecSuong: 1, lhCay: 1, lhSuong: 1, lhCo: 1 },
  { god: 0, dof: 1, dofRes: 0.25, bloom: null, cas: 1, sharp: null, chroma: 1, shadow: 3072, cards: 1, scale: 1, viecCay: 1, viecSuong: 1, lhCay: 1, lhSuong: 1, lhCo: 1 },
  { god: 0, dof: 0, dofRes: 0.25, bloom: 5, cas: 0, sharp: 0, chroma: 0, shadow: 1536, cards: 0.6, scale: 1, viecCay: 0.55, viecSuong: 0, lhCay: 0.6, lhSuong: 0, lhCo: 0.5 },
  { god: 0, dof: 0, dofRes: 0.25, bloom: 5, cas: 1, sharp: 0.5, chroma: 0, shadow: 1536, cards: 0.6, scale: 0.85, viecCay: 0.55, viecSuong: 0, lhCay: 0.6, lhSuong: 0, lhCo: 0.5 },
  { god: 0, dof: 0, dofRes: 0.25, bloom: 4, cas: 1, sharp: 0.6, chroma: 0, shadow: 1536, cards: 0.6, scale: 0.75, viecCay: 0.55, viecSuong: 0, lhCay: 0.5, lhSuong: 0, lhCo: 0.4 },
];
export const TOP = NAC.length - 1;
// sàn cỡ cảnh: 0,7 lần TRẦN (trần = min(tỉ lệ màn, 1,15)) — màn ×1 đúng bằng 0,7 màn hình; điện thoại không vượt trần (soát p10a B6)
export const MIN_OF_SCREEN = 0.7;

// tên chip từ chính ngữ cảnh vẽ của trang (không tạo ngữ cảnh mới)
export function gpuInfo(gl) {
  let name = '';
  try {
    name = String(gl.getParameter(gl.RENDERER) || '');
    if (/^(webkit webgl|mozilla)$/i.test(name) || !name) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) name = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    }
  } catch (e) { /* không đọc được: coi như chip thường */ }
  const soft = /SwiftShader|llvmpipe|softpipe|Basic Render|Microsoft Basic|Software Rasterizer|software/i.test(name);
  const mobile = typeof navigator !== 'undefined' && !!((navigator.userAgentData && navigator.userAgentData.mobile) || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
  const apple = /Apple M\d|Apple GPU/i.test(name);
  // chip tích hợp: Intel HD/UHD/Iris, AMD APU ("Radeon(TM) Graphics", "Radeon Graphics", "Vega 8 Graphics"), chip điện thoại
  const integrated = !apple && /Intel|UHD|Iris|HD Graphics|Radeon\(TM\) Graphics|Radeon Graphics|Vega \d+ Graphics|Mali|Adreno|PowerVR/i.test(name);
  return { name, soft, mobile, apple, integrated };
}

export function forcedNac(params = new URLSearchParams(location.search)) {
  if (!params.has('q')) return null;
  const q = Math.round(+params.get('q'));
  return Number.isFinite(q) ? Math.max(0, Math.min(TOP, q)) : null;
}

export function firstNac(info) {
  if (info.soft) return TOP;
  if (info.integrated || info.mobile) return 2;
  if (info.apple) return 1;
  return 0;
}

// BỘ TỰ HẠ. tick(ms, { busy }) mỗi khung (busy: đang chuyển cảnh / nhảy — không đo, không đổi nấc).
//   · đo theo mẻ 30 khung. Khung > 250 ms CŨNG TÍNH LÀ CHẬM (máy yếu thật có khung như thế) — trừ lúc tab bị ẩn;
//   · CHẬM: trung bình > 22 ms, hoặc ¼ số khung > 30 ms (và trung bình > 18) — HAI MẺ LIỀN mới xuống một nấc (một cú khựng
//     của chương trình khác không lấy mất hình của máy mạnh); RẤT CHẬM (trung bình và trung vị > 40 ms) thì xuống hai nấc ngay;
//   · NHANH: 12 mẻ liền (~6 s) giữ trọn nhịp (trung bình < 17,5 ms, không khung nào > 25 ms) thì thử lên một nấc — không lên
//     trong 20 s sau lần xuống gần nhất;
//   · KHÔNG CHẬP CHỜN: đổi chiều (xuống ↔ lên) quá 2 lần thì khoá nấc hiện tại;
//   · sau mỗi lần đổi (hoặc lúc bắt đầu): bỏ 45 khung đầu (dựng lại khung đệm, dịch shader).
const UP_OK = false;
export function makeGovernor({ start = 0, forced = null, onChange } = {}) {
  let nac = forced ?? start;
  const win = [];
  let settle = 45, slowRuns = 0, goodRuns = 0, lastDir = 0, turns = 0, locked = forced !== null, lastDown = -1e9;
  const log = [];
  const set = (n, why) => {
    n = Math.max(0, Math.min(TOP, n));
    if (n === nac || locked) return;
    const dir = n > nac ? 1 : -1;                       // 1 = xuống (nấc cao hơn = nhẹ hơn), -1 = lên
    if (lastDir && dir !== lastDir) { turns++; if (turns > 2) { locked = true; log.push({ at: Math.round(performance.now()), khoa: nac }); return; } }
    lastDir = dir;
    log.push({ at: Math.round(performance.now()), tu: nac, toi: n, vi: why });
    nac = n; win.length = 0; settle = 45; slowRuns = 0; goodRuns = 0;
    if (dir > 0) lastDown = performance.now();
    try { onChange && onChange(nac); } catch (e) { console.error(e); }
  };
  return {
    get nac() { return nac; },
    get locked() { return locked; },
    get forced() { return forced !== null; },
    log,
    set,
    reset() { win.length = 0; settle = Math.max(settle, 20); },
    tick(ms, { busy = false } = {}) {
      if (locked) return;
      if (typeof document !== 'undefined' && document.hidden) { win.length = 0; return; }
      if (busy) { win.length = 0; return; }
      if (settle > 0) { settle--; return; }
      if (!(ms > 0)) return;
      win.push(Math.min(ms, 1000));
      if (win.length < 30) return;
      const s = win.slice().sort((a, b) => a - b), med = s[15], p75 = s[22], max = s[29];
      const mean = s.reduce((a, b) => a + b, 0) / s.length;
      win.length = 0;
      if (mean > 40 && med > 40 && nac < TOP) { set(nac + 2, `trung bình ${mean.toFixed(0)} ms`); return; }
      const slow = mean > 22 || (p75 > 30 && mean > 18);
      slowRuns = slow ? slowRuns + 1 : 0;
      if (slowRuns >= 2 && nac < TOP) { set(nac + 1, `hai mẻ chậm, trung bình ${mean.toFixed(1)} ms`); return; }
      const good = mean < 17.5 && max < 25;
      goodRuns = good ? goodRuns + 1 : 0;
      // Sếp 29/9: KHÔNG tự nâng nấc. Đo ở 3840×2160: nâng 4→3 đứng hình 1 883 ms, 2→1 đứng 783 ms (dựng lại khung đệm, dịch
      // shader) — một cú đứng như thế tệ hơn nhiều so với ở lại nấc nhẹ. Hạ thì êm (≤ 67 ms). Muốn nâng lại: tải lại trang.
      if (UP_OK && goodRuns >= 12 && nac > 0 && performance.now() - lastDown > 20000) set(nac - 1, '6 s giữ trọn nhịp');
    },
  };
}
