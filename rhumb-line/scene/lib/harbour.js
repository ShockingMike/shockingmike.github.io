/* The harbour chart's artwork geometry, shared with the loader's SVG chart ("Plotting a course") so the paper on the
   loader and the paper on the table line up at the hand-off. Units: a 1400 x 1000 sheet; land top-left, sea to the
   bottom-right. If the page defines window.RLChart (the loader's own copy), that object is used as is. */
export function harbourChart() {
  if (window.RLChart && window.RLChart.coast && window.RLChart.W) return window.RLChart;
  const W = 1400, H = 1000, M = 44, M2 = 58;
  const A = [M, 742], B = [1030, M];
  let tx = B[0] - A[0], ty = B[1] - A[1];
  const L = Math.hypot(tx, ty); tx /= L; ty /= L;
  const nx = -ty, ny = tx;
  const wig = (s) => 36 * Math.sin(5.3 * s + 1.1) + 16 * Math.sin(13.9 * s + 0.3) + 7 * Math.sin(31.7 * s + 2.6) + 3 * Math.sin(71 * s + 0.9);
  const at = (s, o) => [A[0] + tx * L * s + nx * o, A[1] + ty * L * s + ny * o];
  const line = (off, k, amp) => {
    const pts = [];
    for (let i = 0; i <= 200; i++) {
      const s = -0.1 + (i / 200) * 1.2;
      const o = off + wig(s) * (1 - off / 440) + (amp ? amp * Math.sin(9.1 * s + k * 3) + amp * 0.5 * Math.sin(23 * s + k) : 0);
      pts.push(at(s, o));
    }
    return pts;
  };
  const seaDist = (x, y) => { const s = ((x - A[0]) * tx + (y - A[1]) * ty) / L; return (x - A[0]) * nx + (y - A[1]) * ny - wig(s); };
  const coast = line(0, 0, 0);
  const s0 = 0.34, town = at(s0, wig(s0));
  const course = { x1: town[0], y1: town[1], x2: 1196, y2: 866 };
  const rose = { x: 268, y: 846, r: 92 };
  const soundings = [], nums = [4, 7, 9, 11, 12, 14, 16, 19, 22, 26, 31, 38, 44, 52];
  const cand = [[520, 640], [640, 520], [760, 420], [900, 330], [1040, 240], [1180, 160], [560, 900], [700, 780], [860, 660], [980, 560], [1120, 470], [1290, 380], [820, 930], [980, 820], [1300, 640], [1300, 900], [1150, 720], [700, 640], [430, 760], [1260, 250]];
  const dCourse = (x, y) => {
    const dx = course.x2 - course.x1, dy = course.y2 - course.y1;
    const t = Math.max(0, Math.min(1, ((x - course.x1) * dx + (y - course.y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - course.x1 - dx * t, y - course.y1 - dy * t);
  };
  cand.forEach((p) => {
    const sd = seaDist(p[0], p[1]);
    if (sd < 34 || dCourse(p[0], p[1]) < 40 || Math.hypot(p[0] - rose.x, p[1] - rose.y) < rose.r + 40) return;
    soundings.push({ x: p[0], y: p[1], n: nums[Math.min(nums.length - 1, Math.floor(sd / 38))] });
  });
  return {
    W, H, M, M2, coast,
    contours: [
      { pts: line(34, 1, 5), dash: [3, 8], w: 1.8 },
      { pts: line(94, 2, 9), dash: [16, 8], w: 1.6 },
      { pts: line(178, 3, 14), dash: [28, 10, 4, 10], w: 1.5 },
      { pts: line(304, 4, 18), dash: [44, 14], w: 1.4 }
    ],
    land: coast.concat([[-60, -60]]),
    town: { x: town[0], y: town[1] }, course, rose, soundings,
    title: { x: 96, y: 92, w: 470, h: 124 }, scale: { x: 1000, y: 918, w: 300 }
  };
}
