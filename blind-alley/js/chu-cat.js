export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function dpSimplify(pts, eps) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = 1; keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const A = pts[a], B = pts[b], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - A[0]) * dy - (pts[i][1] - A[1]) * dx) / L; if (d > md) { md = d; mi = i; } }
    if (md > eps && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function glyphPolys(font, ch, cap) {
  const scale = cap / (font.tables.os2.sCapHeight || font.unitsPerEm * 0.7);
  const gl = font.charToGlyph(ch);
  const p = gl.getPath(0, 0, font.unitsPerEm * scale);
  const rings = []; let cur = null, x0 = 0, y0 = 0;
  const N = 8;
  for (const c of p.commands) {
    if (c.type === 'M') { if (cur && cur.length > 2) rings.push(cur); cur = [[c.x, c.y]]; x0 = c.x; y0 = c.y; }
    else if (c.type === 'L') { cur.push([c.x, c.y]); x0 = c.x; y0 = c.y; }
    else if (c.type === 'Q') { for (let i = 1; i <= N; i++) { const t = i / N, u = 1 - t; cur.push([u * u * x0 + 2 * u * t * c.x1 + t * t * c.x, u * u * y0 + 2 * u * t * c.y1 + t * t * c.y]); } x0 = c.x; y0 = c.y; }
    else if (c.type === 'C') { for (let i = 1; i <= N; i++) { const t = i / N, u = 1 - t; cur.push([u * u * u * x0 + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x, u * u * u * y0 + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y]); } x0 = c.x; y0 = c.y; }
    else if (c.type === 'Z') { if (cur && cur.length > 2) rings.push(cur); cur = null; }
  }
  if (cur && cur.length > 2) rings.push(cur);
  for (const r of rings) { while (r.length > 3 && Math.hypot(r[0][0] - r[r.length - 1][0], r[0][1] - r[r.length - 1][1]) < cap * 1e-3) r.pop(); }
  return { rings, adv: gl.advanceWidth * scale };
}
function catVong(ring, eps) {
  let mi = 0, md = 0;
  ring.forEach((q, i) => { const d = Math.hypot(q[0] - ring[0][0], q[1] - ring[0][1]); if (d > md) { md = d; mi = i; } });
  const s1 = dpSimplify(ring.slice(0, mi + 1), eps), s2 = dpSimplify(ring.slice(mi).concat([ring[0]]), eps);
  return s1.concat(s2.slice(1, -1));
}
export function catDong(font, text, cap, seed, track = 0.05) {
  const R = rng(seed);
  const out = []; let cx = 0;
  for (const ch of text) {
    const { rings, adv } = glyphPolys(font, ch, cap);
    if (ch !== ' ') {
      const path = new Path2D(), vong = [];
      for (const ring of rings) {
        const s = catVong(ring, cap * 0.026);
        let ar = 0; for (let i = 0; i < s.length; i++) { const p = s[i], q = s[(i + 1) % s.length]; ar += p[0] * q[1] - q[0] * p[1]; }
        if (Math.abs(ar) / 2 < (cap * 0.03) ** 2) continue;
        const pts = [];
        s.forEach((q, i) => { const jx = (R() - 0.5) * cap * 0.006, jy = (R() - 0.5) * cap * 0.006; pts.push([q[0] + jx, q[1] + jy]); if (i === 0) path.moveTo(q[0] + jx, q[1] + jy); else path.lineTo(q[0] + jx, q[1] + jy); });
        path.closePath();
        vong.push({ pts, ar: ar / 2 });
      }
      const lon = vong.reduce((m, v) => (Math.abs(v.ar) > Math.abs(m.ar) ? v : m), vong[0] || { ar: 1 });
      for (const v of vong) v.long = Math.sign(v.ar) !== Math.sign(lon.ar);
      out.push({ ch, path, vong, x: cx, rot: (R() - 0.5) * 0.09, dy: (R() - 0.5) * cap * 0.06, sx: 0.95 + R() * 0.12, sy: 0.97 + R() * 0.06, adv, vien: cap * 0.006 });
    }
    cx += adv + cap * track;
  }
  return { chu: out, w: cx - cap * track };
}
export function diemChu(c, x, y, p) {
  const ox = x + c.x + c.adv / 2, oy = y + c.dy;
  const px = (p[0] - c.adv / 2) * c.sx, py = p[1] * c.sy;
  const co = Math.cos(c.rot), si = Math.sin(c.rot);
  return [ox + px * co - py * si, oy + px * si + py * co];
}
export function veDong(g, dong, x, y, dx = 0, dy = 0) {
  for (const c of dong.chu) {
    g.save();
    g.translate(x + c.x + c.adv / 2 + dx, y + c.dy + dy); g.rotate(c.rot); g.scale(c.sx, c.sy); g.translate(-c.adv / 2, 0);
    g.fill(c.path, 'nonzero');
    g.lineJoin = 'miter'; g.lineWidth = Math.max(1, c.vien || 0); g.strokeStyle = g.fillStyle; g.stroke(c.path);
    g.restore();
  }
}
