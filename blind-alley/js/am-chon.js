import { taoRanhTieng } from './nut-am.js';

const KEY = 'ba-am';
const doc = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
const ghi = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { } };
const LOA = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path class="vo" d="M3 7.6h3.1L10.4 4v12L6.1 12.4H3z"/>'
  + '<path class="song" d="M13.3 7.3a3.9 3.9 0 0 1 0 5.4M15.7 5.1a7 7 0 0 1 0 9.8"/><path class="cheo" d="M13.6 8.1l3.8 3.8M17.4 8.1l-3.8 3.8"/></svg>';

export function taoChonAm({ chu, am, layCanh, layPhimDung }) {
  const Q = new URLSearchParams(location.search);
  const tuDong = !!navigator.webdriver && Q.get('chon') !== '1';
  const man = document.createElement('div');
  man.id = 'chon-am'; man.hidden = true; man.setAttribute('role', 'group'); man.setAttribute('aria-label', chu.nhom);
  man.innerHTML = `<div class="chon-noi"><img class="chon-dau" src="./brand/bieu-tuong_mau-tren-muc.svg" alt="" width="256" height="256"><div class="chon-khung">
    <button type="button" class="chon-nut co" data-chon="on"><span class="o" aria-hidden="true"></span>${LOA}<span class="t">${chu.co}</span></button>
    <button type="button" class="chon-nut khong" data-chon="off">${LOA}<span class="t">${chu.khong}</span></button>
  </div></div>`;
  document.body.appendChild(man);
  const nut = document.createElement('button');
  nut.type = 'button'; nut.id = 'nut-am'; nut.hidden = true;
  nut.setAttribute('aria-label', chu.nut);
  const ranh = taoRanhTieng(nut, { am });
  const dai = document.getElementById('dai');
  if (dai) dai.parentNode.insertBefore(nut, dai); else document.body.appendChild(nut);

  let vao = null;
  let tro = [];
  const datTro = (bat) => {
    if (bat) { tro = [...document.body.children].filter((e) => e !== man && !e.inert && !/^(SCRIPT|STYLE|LINK)$/.test(e.tagName)); tro.forEach((e) => { e.inert = true; }); }
    else { tro.forEach((e) => { e.inert = false; }); tro = []; }
  };
  man.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const ds = [...man.querySelectorAll('button:not([disabled])')]; if (ds.length < 2) return;
    const i = ds.indexOf(document.activeElement), j = e.shiftKey ? (i <= 0 ? ds.length - 1 : i - 1) : (i < 0 || i >= ds.length - 1 ? 0 : i + 1);
    e.preventDefault(); ds[j].focus();
  });
  function veNut() {
    const bat = am.dangBat;
    nut.setAttribute('aria-pressed', String(bat));
    nut.classList.toggle('bat', bat);
    nut.querySelector('.tt').textContent = bat ? chu.bat : chu.tat;
    ranh.ve(bat);
  }
  function chon(v) {
    if (!vao) return;
    ghi(KEY, v);
    if (v === 'on') am.bat({ batDau: 1.05, len: 0.4 });
    datTro(false);
    man.classList.add('di');
    man.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    setTimeout(() => { man.hidden = true; }, 380);
    veNut();
    const f = vao; vao = null; f(v);
  }
  man.addEventListener('click', (e) => { const b = e.target.closest('[data-chon]'); if (b) chon(b.dataset.chon); });
  nut.addEventListener('click', () => {
    if (am.dangBat) am.tat();
    else { const moi = !am.daTao; am.bat({ batDau: 0.25, len: 1.0 }); if (moi) am.datCanh(layCanh(), { phimDung: layPhimDung() }); }
    ghi(KEY, am.dangBat ? 'on' : 'off');
    veNut();
  });

  const hieu = document.querySelector('.hieu');
  let khoaCu = '';
  function datCho() {
    if (nut.hidden || !hieu) return;
    const r = hieu.getBoundingClientRect(), trai = hieu.classList.contains('trai');
    const goc = document.documentElement.classList, gon = goc.contains('dt8') || goc.contains('dtn');
    const k = `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)},${trai},${innerWidth},${gon}`;
    if (k === khoaCu) return; khoaCu = k;
    if (gon) {
      ranh.datCo(60, false, true);
      const h = nut.offsetHeight || 44;
      nut.style.top = Math.max(4, Math.round(r.top + r.height / 2 - h / 2)) + 'px'; nut.style.right = '12px'; nut.style.left = 'auto';
      return;
    }
    ranh.datCo(trai ? 150 : innerWidth <= 640 ? Math.max(120, Math.min(150, r.left - 26)) : r.width, !trai && innerWidth > 640);
    const h = nut.offsetHeight || 44, giua = Math.max(8, Math.round(r.top + r.height / 2 - h / 2));
    if (trai) { nut.style.top = giua + 'px'; nut.style.left = Math.round(r.right + 14) + 'px'; nut.style.right = 'auto'; }
    else if (innerWidth <= 640) { nut.style.top = giua + 'px'; nut.style.right = Math.round(innerWidth - r.left + 14) + 'px'; nut.style.left = 'auto'; }
    else { nut.style.top = Math.round(r.bottom + 10) + 'px'; nut.style.right = Math.round(innerWidth - r.right) + 'px'; nut.style.left = 'auto'; }
  }
  addEventListener('resize', () => { khoaCu = ''; requestAnimationFrame(datCho); });
  setInterval(datCho, 500);

  return {
    hoi(f) {
      vao = f;
      if (tuDong) { chon(Q.get('am') === '1' ? 'on' : 'off'); return; }
      man.hidden = false; datTro(true);
      requestAnimationFrame(() => man.classList.add('hien'));
      const truoc = doc(KEY) === 'off' ? 'off' : 'on';
      const b = man.querySelector(`[data-chon="${truoc}"]`);
      if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => { try { b.focus({ preventScroll: true }); } catch (e) { } }, 60);
    },
    hienNut() { if (!nut.hidden) return; nut.hidden = false; veNut(); khoaCu = ''; datCho(); requestAnimationFrame(() => nut.classList.add('hien')); },
    datCho,
    nut, man,
  };
}
