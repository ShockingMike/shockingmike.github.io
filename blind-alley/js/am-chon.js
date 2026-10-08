import { taoRanhTieng } from './nut-am.js';

const KEY = 'ba-am';
const doc = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
const ghi = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { } };
const NHAN = { co: { w: 7898, d: 'M504 625L289 623L287 457L346 320L473 325L430 455L506 457ZM771 631L559 629L558 462L617 323L743 330L702 457L772 463ZM1222 1303L972 1316L824 337L1026 328L1105 949L1142 325L1332 318L1411 937L1440 315L1641 305L1572 1292L1326 1299L1257 829ZM1982 1340L1796 1347L1762 354L1944 345ZM2419 1350L2228 1346L2239 535L2128 532L2131 337L2548 347L2543 541L2431 533ZM2867 1312L2676 1318L2639 308L2835 306L2844 662L2937 660L2922 301L3116 295L3150 1301L2955 1309L2941 851L2854 857ZM3899 1347L3709 1291L3629 1088L3626 951L3836 954L3847 1134L3933 1125L3914 978L3685 743L3626 597L3672 389L3842 303L4064 361L4137 570L4136 606L3924 602L3913 499L3831 519L3859 615L4097 858L4144 1006L4087 1264L4015 1325ZM4507 1318L4321 1251L4255 1045L4260 468L4338 361L4489 318L4672 384L4737 570L4731 1156L4654 1277ZM4502 1139L4545 1053L4540 554L4495 499L4446 574L4452 1073ZM5134 1332L4990 1290L4913 1175L4908 305L5096 305L5091 1071L5134 1148L5182 1071L5195 304L5385 306L5357 1179L5284 1294ZM5716 1346L5515 1349L5513 344L5724 340L5826 822L5824 340L6026 343L6026 1349L5820 1346L5715 847ZM6441 1308L6175 1315L6144 310L6494 303L6623 431L6645 1129L6586 1260ZM6349 478L6369 1128L6401 1128L6458 1089L6439 545L6426 486ZM7014 1322L6801 1322L6802 1150L7014 1149ZM7264 645L7152 650L7181 516L7116 521L7103 348L7309 344L7315 506ZM7526 638L7411 640L7438 503L7372 509L7362 339L7569 333L7574 495Z' }, khong: { w: 7153, d: 'M489 674L272 670L271 515L328 378L450 377L410 509L486 507ZM756 670L542 668L541 511L595 376L718 372L684 505L755 501ZM1085 1341L899 1340L902 325L1090 328ZM1436 1345L1242 1339L1272 355L1472 362L1550 837L1561 360L1750 370L1722 1352L1533 1349L1448 852ZM2468 1346L2279 1300L2191 1105L2187 972L2394 964L2408 1146L2493 1127L2471 983L2243 765L2182 625L2218 417L2380 329L2595 374L2681 577L2682 612L2469 621L2453 522L2376 537L2407 632L2652 864L2699 1004L2651 1257L2585 1319ZM3023 1312L2824 1305L2867 314L3061 324ZM3591 1318L3157 1322L3150 342L3360 343L3372 1155L3585 1148ZM4111 1330L3707 1344L3664 316L4053 301L4061 500L3871 510L3880 712L4063 702L4072 894L3887 905L3897 1137L4100 1132ZM4448 1326L4251 1324L4269 327L4478 330L4559 809L4572 335L4765 337L4743 1336L4549 1332L4459 831ZM5136 1345L4991 1306L4907 1195L4907 635L4978 419L5168 345L5298 377L5386 457L5406 755L5208 747L5207 555L5126 540L5100 1134L5136 1166L5188 1139L5202 915L5405 923L5399 1109L5325 1297ZM5943 1314L5520 1317L5505 322L5915 319L5919 509L5716 515L5720 705L5909 701L5912 889L5722 895L5726 1119L5936 1115ZM6263 1339L6057 1338L6054 1168L6265 1169ZM6516 666L6401 669L6431 537L6361 539L6354 369L6563 364L6570 527ZM6786 654L6666 658L6698 522L6626 528L6622 360L6830 350L6840 511Z' } };
const nhanSvg = (k) => `<svg class="chu" viewBox="0 0 ${NHAN[k].w} 1700" style="aspect-ratio:${NHAN[k].w}/1700" aria-hidden="true" focusable="false"><path d="${NHAN[k].d}"/></svg>`;
const TAY = '<svg class="tay" viewBox="0 0 64 32" aria-hidden="true" focusable="false"><path d="M0 7H9V25H0Z"/><path d="M11 6L30 5L36 10H61L64 13.5L61 17H38L36 20L33 27H11Z"/></svg>';

export function taoChonAm({ chu, am, layCanh, layPhimDung }) {
  const Q = new URLSearchParams(location.search);
  const tuDong = !!navigator.webdriver && Q.get('chon') !== '1';
  const man = document.createElement('div');
  man.id = 'chon-am'; man.hidden = true; man.setAttribute('role', 'group'); man.setAttribute('aria-label', chu.nhom);
  man.innerHTML = `<div class="chon-noi"><div class="the"><svg class="goc" aria-hidden="true" focusable="false"></svg>
    <img class="chon-dau" src="./brand/bieu-tuong_mau-tren-muc.svg" alt="" width="256" height="256"><div class="chon-khung">
    <button type="button" class="chon-nut co" data-chon="on"><span class="an">${chu.co}</span>${TAY}${nhanSvg('co')}</button>
    <button type="button" class="chon-nut khong" data-chon="off"><span class="an">${chu.khong}</span>${TAY}${nhanSvg('khong')}</button>
  </div></div></div>`;
  document.body.appendChild(man);
  const the = man.querySelector('.the'), goc = man.querySelector('svg.goc');
  function veGoc() {
    const W = the.offsetWidth, H = the.offsetHeight; if (!W) return;
    goc.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const manh = (x, y, sx, sy, cls) => `<path class="${cls}" transform="translate(${x} ${y}) scale(${sx} ${sy})" d="M-2 -2L58 -2L30 9L12 30L-2 58Z"/>`;
    const chop = `<path class="mg" d="M${W * 0.62} ${H - 26}L${W * 0.70} ${H - 34}L${W * 0.69} ${H - 27}L${W * 0.80} ${H - 37}L${W * 0.74} ${H - 24}L${W * 0.75} ${H - 30}Z"/>`;
    goc.innerHTML = `<rect class="v1" x="4" y="4" width="${W - 8}" height="${H - 8}"/><rect class="v2" x="12" y="12" width="${W - 24}" height="${H - 24}"/>`
      + manh(0, 0, 1, 1, 'md') + manh(W, H, -1, -1, 'mg') + chop;
  }
  addEventListener('resize', () => { if (!man.hidden) veGoc(); });
  const nhin = (v) => { man.dataset.nhin = v || ''; };
  man.addEventListener('pointerover', (e) => { const b = e.target.closest('[data-chon]'); if (b) nhin(b.dataset.chon); });
  man.addEventListener('pointerout', (e) => { const b = e.target.closest('[data-chon]'); if (b && !b.contains(e.relatedTarget)) { const a = document.activeElement; nhin(a && man.contains(a) ? a.dataset.chon : ''); } });
  man.addEventListener('focusin', (e) => { const b = e.target.closest('[data-chon]'); if (b) nhin(b.dataset.chon); });
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
    setTimeout(() => { man.hidden = true; }, 480);
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
      man.hidden = false; datTro(true); veGoc();
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
