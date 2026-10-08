import { KHUNG } from './khung.js';
import { CHU } from './chu.js';
export const CANH = [
  { k: 0, a: 1, b: Math.max(420, KHUNG + 2), dung: Math.min(400, KHUNG - 18), ...CHU.dai.canh[0] },
  { k: 1, a: Math.max(421, KHUNG + 3), b: 600, dung: 598, ...CHU.dai.canh[1] }, { k: 2, a: 601, b: 760, dung: 758, ...CHU.dai.canh[2] }, { k: 3, a: 761, b: 960, dung: 958, ...CHU.dai.canh[3] }, { k: 4, a: 961, b: 1150, dung: 1078, ...CHU.dai.canh[4] }, { k: 5, a: 1151, b: 1340, dung: 1300, ...CHU.dai.canh[5] },
];
const TONG = 1340, LO = KHUNG;

export function makeDaiPhim(root, { built, onGo }) {
  root.innerHTML = '';
  root.setAttribute('aria-label', CHU.dai.nhan);
  const ol = document.createElement('ol'); ol.className = 'cuon';
  const btns = [];
  for (const c of CANH) {
    const li = document.createElement('li');
    li.style.flex = String(c.b - c.a + 1);
    if (c.k <= built) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'doan';
      b.setAttribute('aria-label', `${c.doc}, frame ${String(c.dung).padStart(4, '0')}`);
      b.innerHTML = `<span class="so" aria-hidden="true">${String(c.a).padStart(4, '0')}</span><span class="ten" aria-hidden="true">${c.ten}</span><span class="ngan" aria-hidden="true">${c.ngan || c.ten}</span>`;
      li.classList.add('co');
      b.addEventListener('click', (e) => { onGo(c.k); if (e.detail > 0) b.blur(); });
      li.appendChild(b); btns.push(b);
      if (c.k > 0) { li.classList.add('chua', 'cho'); b.hidden = true; li.setAttribute('aria-hidden', 'true'); }
    } else {
      li.className = 'chua';
      li.setAttribute('aria-hidden', 'true');
    }
    ol.appendChild(li);
  }
  root.appendChild(ol);
  const lo = document.createElement('div'); lo.className = 'lo'; lo.setAttribute('aria-hidden', 'true');
  lo.style.left = `${((LO - 1) / TONG) * 100}%`;
  root.appendChild(lo);
  const gy = document.createElement('div'); gy.className = 'goi-y'; gy.setAttribute('aria-hidden', 'true');
  gy.style.left = `${((LO - 1) / TONG) * 100}%`;
  gy.innerHTML = `<span class="chu">${CHU.studio.goiY}</span><svg class="mui" width="40" height="10" viewBox="0 0 40 10"><path d="M0 0 L8 5 L0 10Z M14 0 L22 5 L14 10Z M28 0 L36 5 L28 10Z"/></svg>`;
  root.appendChild(gy);
  const dau = document.createElement('div'); dau.className = 'dau'; dau.setAttribute('aria-hidden', 'true');
  dau.innerHTML = '<span class="dem">0001</span>';
  root.appendChild(dau);
  const dem = dau.querySelector('.dem');
  let lastF = -1, lastK = -1;
  let geo = null;
  function doGeo() {
    const R = root.getBoundingClientRect(); if (!R.width) { geo = null; return; }
    const nhan = [];
    for (const b of btns) { if (b.hidden) continue; let x0 = 1e9, x1 = -1e9;
      for (const sp of b.children) { const r = sp.getBoundingClientRect(); if (r.width > 0.5) { x0 = Math.min(x0, r.left - R.left); x1 = Math.max(x1, r.right - R.left); } }
      if (x1 > x0) nhan.push([x0, x1]); }
    const chu = nhan.slice();
    { const r = lo.getBoundingClientRect(); if (r.width > 0.5) nhan.push([r.left - R.left - 3, r.right - R.left + 3]); }
    if (gy.classList.contains('hien')) { let x0 = 1e9, x1 = -1e9; for (const c of gy.children) { const r = c.getBoundingClientRect(); if (r.width > 0.5) { x0 = Math.min(x0, r.left - R.left); x1 = Math.max(x1, r.right - R.left); } } if (x1 > x0) nhan.push([x0 - 4, x1 + 4]); }
    const dw = dem.getBoundingClientRect().width || (geo && geo.dw) || 36;
    geo = { W: R.width, dw, nhan, chu, t: performance.now() };
  }
  function datSo(x, k) {
    if (!geo || k !== lastK || performance.now() - geo.t > 700) { dem.style.display = ''; doGeo(); }
    let tf = x < 0.06 || k >= 1 ? 'translate(8px, -50%)' : 'translate(calc(-100% - 8px), -50%)', an = false;
    if (geo) {
      const px = x * geo.W, phai = [px + 6, px + 10 + geo.dw], trai = [px - 10 - geo.dw, px - 6];
      const de = (q) => geo.nhan.some(([a, b]) => q[0] < b && q[1] > a) || q[0] < 0 || q[1] > geo.W;
      const uuTien = x < 0.06 || k >= 1 ? [['translate(8px, -50%)', phai], ['translate(calc(-100% - 8px), -50%)', trai]] : [['translate(calc(-100% - 8px), -50%)', trai], ['translate(8px, -50%)', phai]];
      const ok = uuTien.find(([, q]) => !de(q));
      if (ok) tf = ok[0]; else an = true;
    }
    dem.style.transform = tf; dem.style.display = an ? 'none' : '';
    dau.classList.toggle('ne', !!geo && geo.chu.some(([a, b]) => x * geo.W > a - 3 && x * geo.W < b + 3));
  }
  function update(frame, k) {
    const f = Math.round(frame);
    if (f !== lastF || k !== lastK) {
      const x = (f - 1) / TONG;
      dau.style.left = `${x * 100}%`;
      datSo(x, k);
      dem.textContent = String(f).padStart(4, '0');
      lastF = f;
    }
    if (k !== lastK) { btns.forEach((b, i) => b.classList.toggle('dang', i === k)); btns.forEach((b, i) => (i === k ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'))); lastK = k; }
  }
  const DANG = [['co-so'], ['co-so', 'gon'], ['co-so', 'ngan-so'], ['ngan-chi'], ['ngan-chi', 'khit']];
  function vua() {
    for (let i = 1; i < btns.length; i++) {
      const b = btns[i]; if (b.hidden) continue;
      for (const d of DANG) { b.classList.remove('co-so', 'gon', 'ngan-so', 'ngan-chi', 'khit'); b.classList.add(...d); if (b.scrollWidth <= b.clientWidth + 0.5) break; }
    }
  }
  let henVua = 0;
  addEventListener('resize', () => { cancelAnimationFrame(henVua); henVua = requestAnimationFrame(() => { vua(); geo = null; lastF = -1; }); });
  function moKhoa(k) {
    const b = btns[k]; if (!b || !b.hidden) return;
    const li = b.parentElement; li.classList.remove('chua', 'cho'); li.removeAttribute('aria-hidden'); b.hidden = false;
    vua(); geo = null; lastF = -1;
  }
  function lap(b = true) { lo.classList.toggle('lap', !!b); }
  return { update, goiY: (b) => { if (gy.classList.contains('hien') !== !!b) { gy.classList.toggle('hien', !!b); geo = null; lastF = -1; } }, moKhoa, lap };
}
