// Ba bản KHÔNG KHÍ cho màn đầu. Chọn bằng ?look=a|b|c. Mọi màu của cảnh đi qua bảng này:
// trời, sương, các lớp núi rừng, ánh sáng, vật liệu toà thành, và lớp nắn màu hậu kỳ.
//
//   A · 霧の杉  sương rừng tuyết tùng — xám mực trung tính, sáng, sương dày (Tōhaku, Yoshino sớm)
//   B · 藍      chạng vạng chàm — lam chàm sâu, đèn ấm trong ô cửa là nguồn ấm DUY NHẤT
//   C · 和紙    sớm mai giấy dó — sương ngà ấm, núi xa nhạt như tranh thuỷ mặc
//
// Không bản nào dùng dải sắc 215–225° bão hoà thấp nữa: đó là màu của BĂNG.
const q = new URLSearchParams(location.search);
export const LOOK_ID = ['a', 'b', 'c'].includes((q.get('look') || '').toLowerCase()) ? q.get('look').toLowerCase() : 'a';

// Các lớp núi rừng, gần → xa. D = khoảng cách tới máy quay (m); elev = góc ngẩng của sống núi (độ);
// relief = biên độ (m); tw/th = bề rộng / chiều cao tán (m); aerial = mức sương trời-xa;
// dip = lõm giữa khung (để toà thành in lên nền sương); wings = nâng hai cánh; valley/low = độ đọng
// sương ở chân lớp / ở độ cao thấp.
//   F  — ngọn cây TIỀN CẢNH (78 m): mảng rừng sẫm ở hai góc dưới, lõm xuống giữa để chừa chân thành.
//   H  — lưng đồi rừng ngay sau chân thành (190 m).
const LAYERS = [
  { D: 300, elev: -4.6, relief: 26, tw: 4.5, th: 15, aerial: 0.10, dip: 0.5, dipW: 0.16, wings: 0, valley: 1, low: 1 },
  { D: 470, elev: -1.6, relief: 44, tw: 4.8, th: 16, aerial: 0.24, dip: 0.5, dipW: 0.16, wings: 0, valley: 1, low: 1 },
  { D: 700, elev: 0.8, relief: 70, tw: 5.1, th: 17, aerial: 0.42, dip: 0.5, dipW: 0.16, wings: 0, valley: 1, low: 1 },
  { D: 1000, elev: 2.7, relief: 100, tw: 5.4, th: 18, aerial: 0.57, dip: 0, wings: 0.3, valley: 1, low: 1 },
  { D: 1400, elev: 4.4, relief: 150, tw: 6.0, th: 20, aerial: 0.70, dip: 0, wings: 0.3, valley: 1, low: 1 },
  { D: 1950, elev: 5.9, relief: 210, tw: 6.6, th: 22, aerial: 0.82, dip: 0, wings: 0.3, valley: 1, low: 1 },
];

export const LOOKS = {
  a: {
    name: '霧の杉',
    sky: { top: 0x9c9e9b, mid: 0xb9bab6, horizon: 0xcacac6, glow: 0xe6e5df, glowK: 0.30, cloudK: 0.12 },
    fog: { color: 0xc4c4bf, density: 0.00135 },
    sun: { color: 0xf3f1ea, intensity: 2.1, dir: [-0.46, 0.66, 0.60], shadow: 0.78, radius: 6 },
    hemi: { sky: 0xe4e4df, ground: 0x6f716d, intensity: 0.62 },
    amb: { color: 0xd8d8d3, intensity: 0.10 },
    glow: { color: 0xf4f3ee, opacity: 0.55 },
    layers: LAYERS,
    // màu lớp núi, gần → xa: tán cây phía nắng / phía khuất / khe tối giữa các tán
    ridge: {
      lit: [0x5d625e, 0x6c706c, 0x80837f, 0x999b97, 0xafb0ac, 0xc2c3bf],
      shade: [0x2b302e, 0x363b39, 0x4b4f4c, 0x6a6d6a, 0x8b8d8a, 0xa8a9a6],
      gap: [0x1f2322, 0x2a2e2c, 0x3d403e, 0x5c5f5c, 0x7f817e, 0x9fa09d],
      mist: 0xc6c6c1, valley: 0.62, wisp: 0.55,
    },
    sea: { low: 0xb0b1ac, high: 0xd4d4cf, shade: 0x92948f, alpha: 1.0 },
    near: { lit: 0x565b57, shade: 0x2a2e2c },
    corner: { color: 0xcacac5, spots: [[-1, 58, 34, -14, 70, 34, 0.92], [1, 58, 36, -15, 64, 30, 0.80], [-1, 70, 18, -19, 60, 22, 0.6]] },
    ground: { color: 0x7d7f79, moss: 0x3f443e },
    mat: {
      plaster: 0xd6d4ce, plasterDirt: 0xa9a69e,
      roof: 0x6a6e74, roofSheen: 0.12, ridge: 0x54575c,
      wood: 0x7a766f, board: 0x2f2e2d, itabari: 0x34332f,
      stone: 0x7d7b75, stoneDark: 0x4d4b47, stoneCore: 0x2f2f2d, rock: 0x6e6f6a,
      core: 0xe6f5ee, coreK: 1.9, coreRest: 0.24,
      paper: 0x3a3b3a, paperE: 0x000000, paperK: 0, sama: 0x2b2a28,
      rim: 0xf4f2ec, rimK: 0.35,
    },
    lamp: null,
    grade: { hue: 60 / 360, hueLock: 0.0, keepWarm: 0, keepInk: 1, satFloor: 0.0, satCeil: 0.05, lift: 0.315, outHigh: 0.955, contrast: 1.04, centerLift: 0.03, edgeFade: 0.05 },
    target: { v50: 0.62, s50: 0.028, gammaLo: 0.8, gammaHi: 1.35, hiPct: 1 },
    bloom: { threshold: 0.86, intensity: 0.45 },
    god: { weight: 0.22, exposure: 0.30 },
    css: 'a',
  },

  b: {
    name: '藍',
    sky: { top: 0x0c1334, mid: 0x1f2d5e, horizon: 0x3a4b82, glow: 0x5d71a8, glowK: 0.55, glowY: 0.10, glowW: 4.0, cloudK: 0.12 },
    fog: { color: 0x2c3a6c, density: 0.00120 },
    sun: { color: 0x9aabe4, intensity: 1.25, dir: [-0.40, 0.78, 0.48], shadow: 0.55, radius: 5 },
    hemi: { sky: 0x5669b4, ground: 0x161c38, intensity: 1.10 },
    amb: { color: 0x3a4a86, intensity: 0.10 },
    glow: { color: 0x6272ad, opacity: 0.0 },
    layers: LAYERS,
    ridge: {
      lit: [0x1a2548, 0x223058, 0x2e3d6c, 0x3b4c7e, 0x4a5c8e, 0x596b9c],
      shade: [0x0f1531, 0x141b3b, 0x1b2448, 0x243056, 0x2f3c66, 0x3b4975],
      gap: [0x0b1029, 0x101632, 0x161e40, 0x1f2a4f, 0x2a375f, 0x35436f],
      mist: 0x3d5088, valley: 0.60, wisp: 0.55,
    },
    sea: { low: 0x223060, high: 0x3b4b80, shade: 0x172148, alpha: 1.0 },
    near: { lit: 0x1d2850, shade: 0x0e1430 },
    corner: { color: 0x33447a, spots: [[-1, 58, 34, -14, 70, 34, 0.85], [1, 58, 36, -15, 64, 30, 0.75], [-1, 70, 18, -19, 60, 22, 0.55]] },
    ground: { color: 0x39426a, moss: 0x1a2142 },
    mat: {
      plaster: 0xc6cde6, plasterDirt: 0x8d97b8,
      roof: 0x353c52, roofSheen: 0.25, ridge: 0x282e40,
      wood: 0x1c1d25, board: 0x191a22, itabari: 0x1b1c24,
      stone: 0x929ab8, stoneDark: 0x4e5570, stoneCore: 0x14172a, rock: 0x2c3350,
      paper: 0xffb867, paperE: 0xff9a3c, paperK: 1.15, sama: 0x191a22,
      rim: 0x8c9ad0, rimK: 0.25,
    },
    // đèn ấm hắt từ các ô cửa: nguồn ấm duy nhất trong khung
    lamp: { color: 0xff9a45, intensity: 0, dist: 30 },
    grade: { hue: 230 / 360, hueLock: 0.82, keepWarm: 1, satFloor: 0.10, satCeil: 0.52, lift: 0.27, outHigh: 0.975, contrast: 1.03, centerLift: 0.05, edgeFade: 0.0 },
    target: { v50: 0.32, s50: 0.44, gammaLo: 0.8, gammaHi: 1.35, hiMul: 2.1 },
    bloom: { threshold: 0.62, intensity: 1.05 },
    god: { weight: 0.0, exposure: 0.0 },
    css: 'b',
  },

  c: {
    name: '和紙',
    sky: { top: 0xcdc1aa, mid: 0xe2d8c4, horizon: 0xeee5d4, glow: 0xffd89c, glowK: 0.80, glowY: 0.12, glowW: 3.0, glowDir: [-0.88, 0.2, -0.1], cloudK: 0.12 },
    fog: { color: 0xe6ddcc, density: 0.00125 },
    sun: { color: 0xffdcae, intensity: 3.0, dir: [-0.72, 0.34, 0.60], shadow: 0.75, radius: 4 },
    hemi: { sky: 0xf5ecdc, ground: 0x9a9181, intensity: 0.78 },
    amb: { color: 0xefe6d6, intensity: 0.08 },
    glow: { color: 0xfff4de, opacity: 0.9 },
    layers: LAYERS,
    ridge: {
      lit: [0x9a9486, 0xaaa496, 0xbdb7aa, 0xcdc7ba, 0xd9d3c6, 0xe3dcd0],
      shade: [0x6a655b, 0x7d776c, 0x979185, 0xafa99d, 0xc4bdb1, 0xd4cdc1],
      gap: [0x57524a, 0x6a655b, 0x847e73, 0x9f998d, 0xb7b0a4, 0xcac3b7],
      mist: 0xe8dfce, valley: 0.80, wisp: 0.6,
    },
    sea: { low: 0xd9cfbb, high: 0xf0e8d9, shade: 0xc0b6a3, alpha: 1.0 },
    near: { lit: 0x9a9384, shade: 0x625c51 },
    corner: { color: 0xe9e0cf, spots: [[-1, 58, 34, -14, 76, 36, 0.95], [1, 58, 36, -15, 70, 32, 0.9], [-1, 70, 18, -19, 64, 24, 0.7], [1, 66, 12, -21, 60, 22, 0.55]] },
    ground: { color: 0xa39a88, moss: 0x5f5a4c },
    mat: {
      plaster: 0xe2dbcd, plasterDirt: 0xb6ac99,
      roof: 0x6b6863, roofSheen: 0.12, ridge: 0x54514d,
      wood: 0x80776a, board: 0x37322c, itabari: 0x3a342d,
      stone: 0xbdb4a3, stoneDark: 0x7a7266, stoneCore: 0x35312b, rock: 0x7b7468,
      paper: 0x3d3831, paperE: 0x000000, paperK: 0, sama: 0x2f2b26,
      rim: 0xfff2dc, rimK: 0.45,
    },
    lamp: null,
    grade: { hue: 38 / 360, hueLock: 0.45, keepWarm: 0, satFloor: 0.03, satCeil: 0.20, lift: 0.41, outHigh: 0.975, contrast: 1.03, centerLift: 0.03, edgeFade: 0.04 },
    target: { v50: 0.80, s50: 0.085, gammaLo: 0.8, gammaHi: 1.35, hiPct: 1 },
    bloom: { threshold: 0.84, intensity: 0.55 },
    god: { weight: 0.30, exposure: 0.36 },
    css: 'c',
  },
};

export const L = LOOKS[LOOK_ID];
document.documentElement.dataset.look = LOOK_ID;

// ── PHẦN 3 (25/9): ngày → CHẠNG VẠNG → ĐÊM theo cuộn (Mike 25/9: "lúc đầu vẫn đang ban ngày như bình thường, scroll
// xuống thì trời mới đổi tối và từ đó là ban đêm luôn"). Màu lấy từ ảnh phác Mike đã duyệt hướng
// (prototypes/kozo-dem/dem.js ảnh a1 = chạng vạng quanh toà thành, v3.js = thung lũng đêm).
//
// ĐÊM của toà thành (dùng để trộn ra chạng vạng): mực đen ánh lục xám, sương sẫm, trăng rất yếu.
const NIGHT_CASTLE = {
  sky: { top: 0x0a100e, mid: 0x1c2825, horizon: 0x364642, glow: 0x4a5d58, glowK: 0.3, cloudK: 0.12 },
  fog: { color: 0x1b2624, density: 0.0017 },
  sun: { color: 0x9fb7b0, intensity: 0.9 },
  hemi: { sky: 0x3a4d48, ground: 0x040605, intensity: 0.6 },
  amb: { color: 0x1a2321, intensity: 0.05 },
  ridge: {
    lit: [0x121a18, 0x151e1c, 0x182220, 0x1b2624, 0x1e2a27, 0x212d2a],
    shade: [0x080c0b, 0x0b100f, 0x0e1412, 0x121917, 0x151e1c, 0x19221f],
    gap: [0x040605, 0x070a09, 0x0a0f0e, 0x0e1412, 0x121917, 0x151e1c],
    mist: 0x1a2522,
  },
  sea: { low: 0x121b19, high: 0x1c2825, shade: 0x0c1211 },
  near: { lit: 0x1a2220, shade: 0x070a09 },
  corner: { color: 0x17211f },
  ground: { color: 0x2c312f, moss: 0x121815 },
  mat: {
    plaster: 0x6a6e6b, plasterDirt: 0x3a3e3b, roof: 0x2a2d30, ridge: 0x222427,
    wood: 0x2a2927, board: 0x131312, itabari: 0x161615,
    stone: 0x4c4c48, stoneDark: 0x252523, rock: 0x2c2e2b,
    paper: 0x0b0d0c, sama: 0x090a09, rim: 0x62B198,
  },
};
// trộn hai bảng màu: màu trộn trong không gian tuyến tính (THREE.Color), số trộn thẳng
function mixTable(a, b, t) {
  if (Array.isArray(a)) return a.map((v, i) => mixTable(v, b[i], t));
  if (a && typeof a === 'object') { const o = {}; for (const k in a) o[k] = k in b ? mixTable(a[k], b[k], t) : a[k]; return o; }
  return a + (b - a) * t;
}
// CHẠNG VẠNG = 80% đường từ ngày sang đêm (ảnh a1). Màu để nguyên dạng số hex của ngày / đêm: app.js tự trộn tuyến tính.
export const DUSK = {
  night: NIGHT_CASTLE, k: 0.8,
  // mạch đá lõi 栗石 sáng màu 緑青 (ảnh a1: core 0x62B198 × 2,4)
  core: 0x62B198, coreK: 2.4,
  grade: { hue: 160 / 360, hueLock: 0.5, keepWarm: 0, keepInk: 1, satFloor: 0.03, satCeil: 0.10, lift: 0.035, outHigh: 0.98, contrast: 1.04, centerLift: 0.0, edgeFade: 0.0, inLow: 0, inHigh: 1, gamma: 1 },
  bloom: { threshold: 0.42, intensity: 0.9 },
};
export { mixTable };

// ĐÊM của thung lũng ruộng bậc thang (chương 地) — bảng màu của ảnh phác v3.
export const DEM = {
  sky: { top: 0x0b100f, mid: 0x1d2926, horizon: 0x3a4b47, glow: 0x55675f, glowK: 0.34, glowY: 0.02, glowW: 6.0, cloudK: 0.14, glowDir: [-0.35, 0.12, -0.94] },
  fog: { color: 0x1e2927, density: 0.0016 },
  layers: LAYERS,
  ridge: {
    lit: [0x141c1a, 0x19221f, 0x1f2926, 0x26302d, 0x2d3835, 0x35413d],
    shade: [0x0b100e, 0x0f1513, 0x141b19, 0x1a2320, 0x212b28, 0x293430],
    gap: [0x060908, 0x0a0e0d, 0x0e1412, 0x141b19, 0x1b2421, 0x232d2a],
    mist: 0x2a3633, valley: 0.66, wisp: 0.6,
  },
  // khoá sắc 0,5 → 0,9 (29/9): với 0,5 điểm XÁM không sắc bị kéo về ~80° (ô-liu); ruộng / mỏ đá / rừng đã nhuộm ~160° trước nắn màu
  // nên được giữ sắc (keepInk) — đo cùng mốc cuộn 0,8 · 1,0 · 2,2 · 4,6 · 7,1: độ lệch dưới mức lệch tự nhiên giữa hai lần chụp giống nhau
  grade: { hue: 160 / 360, hueLock: 0.9, keepWarm: 1, keepInk: 1, satFloor: 0.03, satCeil: 0.14, lift: 0.022, outHigh: 0.98, contrast: 1.03, centerLift: 0.0, edgeFade: 0.0, inLow: 0, inHigh: 1, gamma: 1 },
  // loá: ngưỡng cao hơn (chỉ nét cọ loá, nước bạc không loá), mạnh hơn → quầng mềm rộng quanh nét
  bloom: { threshold: 0.5, intensity: 1.65 },
};
