const SVGNS = 'http://www.w3.org/2000/svg';
const tao = (tag, cls, cha, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (cha) cha.appendChild(e); return e; };
const thoat = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function makeHoSo6(o) {
  const C = o.C, F = C.form;
  const root = tao('section', 'c6 tat', document.body); root.id = 'c6'; root.setAttribute('aria-label', 'Case files');
  const lop = tao('div', 'c6-tap', root);
  const vien = document.createElementNS(SVGNS, 'svg'); vien.setAttribute('class', 'c6-vien'); vien.setAttribute('aria-hidden', 'true'); root.appendChild(vien);
  const vienP = document.createElementNS(SVGNS, 'polygon'); vien.appendChild(vienP);
  const NUT = C.hoSo.map((d, i) => {
    const b = tao('button', 'c6-nut', lop); b.type = 'button';
    b.setAttribute('aria-label', `${C.mo}: Case ${d.so}, ${d.loai}, ${d.nam}${d.ten ? ', ' + d.ten : ''}`);
    b.addEventListener('pointerenter', () => { reI = i; o.onNhich(i, 1); });
    b.addEventListener('pointerleave', () => { if (reI === i) reI = -1; if (moI !== i) o.onNhich(i, 0); });
    b.addEventListener('focus', () => { if (b.matches(':focus-visible')) { o.onNhich(i, 1); hienVien(i); } });
    b.addEventListener('blur', () => { if (moI !== i) o.onNhich(i, 0); vien.classList.remove('hien'); });
    b.addEventListener('click', (e) => { moThe(i, e.currentTarget); });
    return b;
  });
  let QUAD = NUT.map(() => null), reI = -1, reMang = false;
  function hienVien(i) { const q = QUAD[i]; if (!q) return; vienP.setAttribute('points', q.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')); vien.classList.add('hien'); }
  const mang = tao('button', 'c6-mang', root, `<span class="cham" aria-hidden="true"></span>${thoat(F.nutMo)} <span aria-hidden="true">→</span>`); mang.type = 'button';
  mang.addEventListener('click', () => o.onForm());
  mang.addEventListener('pointerenter', () => { reMang = true; }); mang.addEventListener('pointerleave', () => { reMang = false; });
  const daiO = tao('div', 'c6-dai-o', root);
  const dai = tao('div', 'c6-dai', daiO); dai.dataset.cuon = '';
  const goi = tao('p', 'c6-goi', daiO, `${thoat(C.vuot)} <span aria-hidden="true">→</span>`); goi.setAttribute('aria-hidden', 'true');
  dai.setAttribute('role', 'list');
  const BIA = C.hoSo.map((d, i) => {
    const li = tao('div', 'c6-bia-o', dai); li.setAttribute('role', 'listitem');
    const b = tao('button', 'c6-bia', li, `<img ${o.phac ? '' : `src="${d.anh}" `}alt="" width="640" height="480" decoding="async"><span class="s1">CASE ${d.so}</span><span class="s2">${thoat(d.loai.toUpperCase())} · ${d.nam}</span>${d.dong ? `<span class="dau" aria-hidden="true">${thoat(C.dau)}</span>` : ''}`);
    b.type = 'button'; b.setAttribute('aria-label', `${C.mo}: Case ${d.so}, ${d.loai}, ${d.nam}${d.ten ? ', ' + d.ten : ''}`);
    b.addEventListener('click', (e) => moThe(i, e.currentTarget));
    return b;
  });
  { const li = tao('div', 'c6-bia-o', dai); li.setAttribute('role', 'listitem');
    const b = tao('button', 'c6-bia moi', li, `<span class="s1">CASE 107</span> <span class="s3">${thoat(F.nutMo)} <span aria-hidden="true">→</span></span>`); b.type = 'button';
    b.addEventListener('click', () => o.onForm()); }
  dai.querySelectorAll('.c6-bia').forEach((b) => b.addEventListener('focus', () => { if (b.matches(':focus-visible')) b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }));
  const the = tao('div', 'c6-the', root); the.setAttribute('role', 'dialog'); the.setAttribute('aria-modal', 'true'); the.tabIndex = -1; the.hidden = true; the.dataset.cuon = '';
  the.setAttribute('aria-labelledby', 'c6-the-so');
  let moI = -1, nutMo = null;
  const nhanMo = tao('p', 'c6-mo', root); nhanMo.setAttribute('aria-hidden', 'true');
  const cham = (R, q) => { const P = [[R[0], R[1]], [R[2], R[1]], [R[2], R[3]], [R[0], R[3]]], Q = q.map((p) => [p.x, p.y]);
    const truc = [[1, 0], [0, 1], ...Q.map((p, j) => { const n = Q[(j + 1) % Q.length]; return [p[1] - n[1], n[0] - p[0]]; })];
    return truc.every(([ax, ay]) => { const a = P.map(([x, y]) => x * ax + y * ay), b = Q.map(([x, y]) => x * ax + y * ay); return Math.max(...a) >= Math.min(...b) && Math.max(...b) >= Math.min(...a); }); };
  function neNhan() {
    nhanMo.style.letterSpacing = '';
    if (!nhanMo.classList.contains('hien') || !QUAD) return;
    for (const ls of ['', '.1em', '.06em']) {
      nhanMo.style.letterSpacing = ls;
      const r = nhanMo.getBoundingClientRect(); if (!r.width) return;
      if (!QUAD.some((q) => q && q.length > 2 && cham([r.left - 6, r.top - 6, r.right + 6, r.bottom + 6], q))) return;
    }
  }
  const theHtml = (i) => { const d = C.hoSo[i], N = C.nhanO; return `<p class="so" id="c6-the-so">CASE ${d.so} · ${thoat(d.loai.toUpperCase())} · ${d.nam}${d.dong ? `<span class="an"> · ${thoat(C.dau)}</span>` : ''}</p>${d.ten ? `<p class="ten">${thoat(d.ten)}</p>` : ''}
      <dl><dt>${thoat(N.khach)}</dt><dd>${thoat(d.khach)}</dd><dt>${thoat(N.dai)}</dt><dd>${thoat(d.dai)}</dd><dt>${thoat(N.cach)}</dt><dd>${thoat(d.cach)}</dd><dt>${thoat(N.vu)}</dt><dd>${thoat(d.vu)}</dd><dt>${thoat(N.ketQua)}</dt><dd>${thoat(d.ketQua)}</dd></dl>
      ${d.dong ? `<span class="dau" aria-hidden="true">${thoat(C.dau)}</span>` : ''}<button type="button" class="dong" aria-label="Close case file"><span aria-hidden="true">✕</span> ${thoat(C.dong)}</button>`; };
  function moThe(i, nut) {
    if (moI >= 0 && moI !== i) o.onNhich(moI, 0);
    moI = i; nutMo = nut || NUT[i];
    the.innerHTML = theHtml(i);
    nhanMo.textContent = `CASE ${C.hoSo[i].so} · ${C.moRa.toUpperCase()} ↓`; nhanMo.classList.add('hien'); neNhan();
    the.querySelector('.dong').addEventListener('click', () => dongThe(true));
    the.hidden = false; requestAnimationFrame(() => the.classList.add('hien'));
    o.onNhich(i, 1); o.onChon(i);
    the.focus({ preventScroll: true });
  }
  the.addEventListener('keydown', (e) => { if (e.key !== 'Tab') return; e.preventDefault(); const d = the.querySelector('.dong'); (document.activeElement === d ? the : d).focus(); });
  document.addEventListener('pointerdown', (e) => {
    if (moI < 0 || !hien) return; const t = e.target;
    if (t && t.closest && (t.closest('.c6-the') === the || t.closest('.c6-nut') || t.closest('.c6-bia'))) return;
    dongThe(false);
  }, true);
  function dongThe(traFocus = false) {
    if (moI < 0) return false;
    const i = moI; moI = -1; the.classList.remove('hien'); the.hidden = true; nhanMo.classList.remove('hien');
    o.onNhich(i, 0); o.onChon(-1);
    if (traFocus && nutMo && !nutMo.closest('[hidden]')) nutMo.focus({ preventScroll: true });
    return true;
  }
  const form = tao('form', 'c6-form', root); form.noValidate = true; form.hidden = true; form.dataset.cuon = ''; form.setAttribute('aria-labelledby', 'c6-f-tieu');
  const o1 = (id, x, kieu = 'text', ac = '', tuy = false) => `<div class="o-hang"><label for="c6-${id}">${thoat(x.nhan)}${tuy ? ` <small>${thoat(F.tuyChon)}</small>` : ''}</label>
    <input class="o" id="c6-${id}" name="${id}" type="${kieu}" placeholder="${thoat(x.goiY)}" ${ac ? `autocomplete="${ac}"` : ''} ${tuy ? '' : 'required aria-required="true"'} aria-describedby="c6-${id}-loi">
    <p class="loi" id="c6-${id}-loi" hidden></p></div>`;
  form.innerHTML = `<button type="button" class="dong" aria-label="Close the form"><span aria-hidden="true">✕</span> ${thoat(C.dong)}</button>
    <div class="nhap">
    <h2 id="c6-f-tieu" tabindex="-1">${thoat(F.tieuDe.toUpperCase())}</h2><p class="mo"><span class="dai">${thoat(F.mo.toUpperCase())}</span><span class="ngan">${thoat(F.moNgan.toUpperCase())}</span></p>
    <p class="loi-chung" role="alert" hidden></p>
    <div class="hai hai-ten">${o1('ten', F.ten, 'text', 'name')}${o1('email', F.email, 'email', 'email')}</div>
    <fieldset class="chon" aria-describedby="c6-loai-loi"><legend>${thoat(F.loai.nhan)}</legend><div class="chon-ds">${F.loai.chon.map((t, i) => `<label><input type="radio" name="loai" value="${i}"${i === 0 ? ' required' : ''}><span>${thoat(t)}</span></label>`).join('')}</div>
      <p class="loi" id="c6-loai-loi" hidden></p></fieldset>
    <div class="hai">${o1('ngan-sach', F.nganSach, 'text', 'off', true)}${o1('han', F.han, 'text', 'off', true)}</div>
    <div class="o-hang"><label for="c6-mo-ta">${thoat(F.moTa.nhan)}</label><textarea class="o mota" id="c6-mo-ta" name="mo-ta" rows="3" placeholder="${thoat(F.moTa.goiY)}" required aria-required="true" aria-describedby="c6-mo-ta-loi"></textarea>
      <p class="loi" id="c6-mo-ta-loi" hidden></p></div>
    <button type="submit" class="gui">${thoat(F.nut)} <span aria-hidden="true">→</span></button><p class="demo">${thoat(F.demo)}</p>
    </div>
    <div class="xong" hidden><h2 tabindex="-1">${thoat(F.camOnTieuDe.toUpperCase())}</h2><p>${thoat(F.camOn)}</p><span class="dau" aria-hidden="true">${thoat(F.dauGui)}</span>
      <button type="button" class="moi">${thoat(F.moiNua)} <span aria-hidden="true">→</span></button></div>
    <p class="an bao" role="status" aria-live="polite"></p>
    <p class="chan-f">${thoat(C.chan)}</p>`;
  const $ = (s) => form.querySelector(s);
  $('.dong').addEventListener('click', () => o.onDongForm());
  const moTa = $('#c6-mo-ta');
  const caoMoTa = () => {
    moTa.style.height = '';
    const cs = getComputedStyle(moTa), vien = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const toiDa = 4 * parseFloat(cs.lineHeight) + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + vien;
    if (moTa.scrollHeight + vien > moTa.offsetHeight + 0.5) moTa.style.height = Math.min(toiDa, moTa.scrollHeight + vien) + 'px';
  };
  moTa.addEventListener('input', caoMoTa);
  $('.xong .moi').addEventListener('click', () => {
    form.reset(); moTa.style.height = ''; form.querySelectorAll('.loi, .loi-chung').forEach((x) => { x.hidden = true; x.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid')); $('.bao').textContent = '';
    form.classList.remove('da-gui'); $('.xong').hidden = true; $('.nhap').hidden = false; datHop(hopCuoi); form.scrollTop = 0;
    if (o.onMoLai) o.onMoLai();
    $('#c6-f-tieu').focus({ preventScroll: true });
  });
  const loi = (id, t) => { const p = form.querySelector(`#c6-${id}-loi`), inp = form.querySelector(`#c6-${id}`) || form.querySelector('fieldset.chon');
    if (t) { p.textContent = t; p.hidden = false; inp.setAttribute('aria-invalid', 'true'); } else { p.hidden = true; p.textContent = ''; inp.removeAttribute('aria-invalid'); } };
  const kiem = () => {
    const ten = $('#c6-ten').value.trim(), em = $('#c6-email').value.trim(), loai = form.querySelector('input[name=loai]:checked'), mt = $('#c6-mo-ta').value.trim();
    const sai = [];
    loi('ten', ten ? '' : F.loiTen); if (!ten) sai.push('#c6-ten');
    const emOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em);
    loi('email', !em ? F.loiEmail : emOk ? '' : F.loiEmailSai); if (!em || !emOk) sai.push('#c6-email');
    loi('loai', loai ? '' : F.loiLoai); if (!loai) sai.push('input[name=loai]');
    loi('mo-ta', mt ? '' : F.loiMoTa); if (!mt) sai.push('#c6-mo-ta');
    return sai;
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const sai = kiem(), lc = $('.loi-chung');
    if (sai.length) { lc.textContent = F.loiChung; lc.hidden = false; const f = form.querySelector(sai[0]); if (f) f.focus(); return; }
    lc.hidden = true;
    $('.nhap').hidden = true; const x = $('.xong'); x.hidden = false;
    form.classList.add('da-gui'); datHop(hopCuoi); if (o.onGui) o.onGui();
    $('.bao').textContent = `${F.camOnTieuDe} ${F.camOn}`;
    x.querySelector('h2').focus({ preventScroll: true });
  });
  form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target; if (!t || t.tagName !== 'INPUT') return;
    e.preventDefault();
    const loai = form.querySelector('.nhap input[name=loai]:checked') || form.querySelector('.nhap input[name=loai]');
    const ds = [$('#c6-ten'), $('#c6-email'), loai, $('#c6-ngan-sach'), $('#c6-han'), $('#c6-mo-ta'), $('.nhap .gui')];
    const i = t.name === 'loai' ? 2 : ds.indexOf(t);
    if (i >= 0 && ds[i + 1]) ds[i + 1].focus();
  });
  form.addEventListener('input', (e) => {
    const t = e.target; if (!t || !t.closest('[aria-invalid="true"]') && t.getAttribute('aria-invalid') !== 'true') return;
    const id = t.name === 'loai' ? 'loai' : t.id.replace('c6-', '');
    if (id === 'ten' && t.value.trim()) loi('ten', '');
    if (id === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.value.trim())) loi('email', '');
    if (id === 'loai') loi('loai', '');
    if (id === 'mo-ta' && t.value.trim()) loi('mo-ta', '');
  });
  let hopCuoi = null;
  function datHop(rect) {
    if (!rect || kieuDat === 'dt') { Object.assign(form.style, { left: '', top: '', width: '', height: '', maxHeight: '' }); return; }
    const [x0, y0, x1, y1] = rect;
    if (form.classList.contains('da-gui')) {
      const k = parseFloat(root.style.getPropertyValue('--k')) || 1, w = Math.min(x1 - x0, Math.round(470 * k));
      Object.assign(form.style, { left: Math.round((x0 + x1 - w) / 2) + 'px', top: Math.round(y0 + (y1 - y0) * 0.12) + 'px', width: w + 'px', height: '', maxHeight: '' });
    } else Object.assign(form.style, { left: x0 + 'px', top: y0 + 'px', width: (x1 - x0) + 'px', height: '', maxHeight: (y1 - y0) + 'px' });
  }
  const chan = tao('p', 'c6-chan', root, thoat(C.chan));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !hien) return;
    if (!form.hidden) { e.preventDefault(); o.onDongForm(); return; }
    if (moI >= 0) { e.preventDefault(); dongThe(true); }
  });
  let kieuDat = 'may', hien = false, mangO = null, henFocus = false;
  return {
    root,
    datHien(b) { if (b === hien) return; hien = b; root.classList.toggle('tat', !b); if (!b) { dongThe(); vien.classList.remove('hien'); reI = -1; reMang = false; henFocus = false; } },
    dangChi: () => hien && (reI >= 0 || reMang),
    datKieu(k) { kieuDat = k; root.dataset.kieu = k; if (k === 'dt') Object.assign(form.style, { left: '', top: '', width: '', height: '', maxHeight: '' }); },
    datCo(k) { root.style.setProperty('--k', k.toFixed(3)); },
    datTap(quads) {
      QUAD = quads;
      quads.forEach((q, i) => {
        const b = NUT[i]; if (!q) { b.hidden = true; return; } b.hidden = false;
        const x0 = Math.min(...q.map((p) => p.x)), y0 = Math.min(...q.map((p) => p.y)), x1 = Math.max(...q.map((p) => p.x)), y1 = Math.max(...q.map((p) => p.y));
        Object.assign(b.style, { left: x0 + 'px', top: y0 + 'px', width: (x1 - x0) + 'px', height: (y1 - y0) + 'px', clipPath: `polygon(${q.map((p) => `${(p.x - x0).toFixed(1)}px ${(p.y - y0).toFixed(1)}px`).join(',')})` });
      });
      const f = document.activeElement; const i = NUT.indexOf(f); if (i >= 0 && f.matches(':focus-visible')) hienVien(i);
    },
    datDai(top) { daiO.style.top = top == null ? '' : top + 'px'; },
    datMang(x, y, xoay = -2) { mangO = [x, y]; Object.assign(mang.style, { left: x + 'px', top: y + 'px', transform: `rotate(${xoay}deg)` }); },
    hopMang() { const r = mang.getBoundingClientRect(); if (r.width) return [r.left, r.top, r.right, r.bottom];
      const k = parseFloat(root.style.getPropertyValue('--k')) || 1, nho = kieuDat === 'may' && innerHeight <= 860 ? 15 / 16 : 1, w = 236 * k * nho;
      return mangO ? [mangO[0], mangO[1], mangO[0] + w, mangO[1] + 50 * k] : [0, 0, 0, 0]; },
    datThe(css) {
      Object.assign(the.style, css);
      const k = parseFloat(root.style.getPropertyValue('--k')) || 1;
      if (css.left && css.top) Object.assign(nhanMo.style, { left: css.left, top: `calc(${css.top} - ${Math.round(24 * k)}px)` });
      neNhan();
    },
    moThe, dongThe, theMo: () => moI,
    moForm(rect) {
      dongThe();
      hopCuoi = rect; datHop(rect);
      form.hidden = false; requestAnimationFrame(() => form.classList.add('hien'));
      (form.classList.contains('da-gui') ? $('.xong h2') : $('#c6-f-tieu')).focus({ preventScroll: true });
    },
    datForm(rect) { hopCuoi = rect; if (!form.hidden) datHop(rect); },
    daGui: () => form.classList.contains('da-gui'),
    hopForm(rect) {
      if (!form.hidden) return form.getBoundingClientRect();
      datHop(rect); form.style.visibility = 'hidden'; form.hidden = false; const r = form.getBoundingClientRect(); form.hidden = true; form.style.visibility = ''; return r;
    },
    hopThe: () => (the.hidden ? null : the.getBoundingClientRect()),
    dongForm() { const coFocus = form.contains(document.activeElement); form.classList.remove('hien'); form.hidden = true; henFocus = coFocus; },
    traFocus() { if (!henFocus || !hien || root.classList.contains('dang-form')) return; henFocus = false;
      const a = document.activeElement; if (a && a !== document.body && a !== document.documentElement) return;
      const dich = kieuDat === 'dt' ? dai.querySelector('.c6-bia.moi') : mang; if (dich) dich.focus({ preventScroll: true }); },
    formMo: () => !form.hidden,
    datChan(b) { chan.classList.toggle('hien', !!b); },
    datChanO(v) { root.classList.toggle('chan-trong', v === 'trong'); chan.style.left = v && v.left != null ? Math.round(v.left) + 'px' : ''; },
    rongChan() { const r = chan.getBoundingClientRect(); if (r.width) return r.width; const k = parseFloat(root.style.getPropertyValue('--k')) || 1; return C.chan.length * 13 * 0.66 * k; },
    viecLamNong() {
      const khoi = [...form.querySelectorAll('.nhap > *'), form.querySelector('.xong')], nhom = [];
      for (let i = 0; i < khoi.length; i++) nhom.push([khoi[i]]);
      const dung = (fill) => () => {
        const box = document.createElement('div'); box.className = 'c6'; box.dataset.kieu = kieuDat; box.setAttribute('aria-hidden', 'true');
        Object.assign(box.style, { left: '-6000px', width: '760px', visibility: 'hidden' });
        fill(box); box.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
        document.body.appendChild(box); box.getBoundingClientRect(); box.remove();
      };
      return [...nhom.map((ns) => dung((box) => { const f = document.createElement('div'); f.className = 'c6-form hien'; f.style.width = '700px'; ns.forEach((n) => { const c = n.cloneNode(true); c.hidden = false; f.appendChild(c); }); box.appendChild(f); })),
        ...C.hoSo.map((_, i) => dung((box) => { const t = document.createElement('div'); t.className = 'c6-the hien'; t.style.width = '400px'; t.innerHTML = theHtml(i); box.appendChild(t); }))];
    },
    nut: NUT, bia: BIA, mang, the, form,
  };
}
export function vePhacHoSo6(C, kieu = 'may') {
  const u = makeHoSo6({ C, phac: true, onNhich() {}, onChon() {}, onForm() {}, onDongForm() {} });
  const r = u.root; r.removeAttribute('id'); r.setAttribute('aria-hidden', 'true'); r.inert = true; r.classList.remove('tat'); u.datKieu(kieu);
  u.datThe({ left: '40px', top: '120px', width: '380px' }); u.moThe(4);
  u.moForm([480, 60, 1180, 860]);
  const F = u.form; F.classList.add('hien');
  F.querySelectorAll('.loi, .loi-chung').forEach((e) => { e.hidden = false; e.textContent = C.form.loiChung; });
  F.querySelectorAll('.o').forEach((e) => e.setAttribute('aria-invalid', 'true'));
  const phieu = F.cloneNode(true); phieu.classList.add('da-gui'); Object.assign(phieu.style, { left: '1220px', top: '80px', width: '470px', height: '' });
  phieu.querySelector('.nhap').hidden = true; phieu.querySelector('.xong').hidden = false; r.appendChild(phieu);
  u.datMang(1220, 700, -2); u.datChan(true);
  return () => { r.remove(); };
}

