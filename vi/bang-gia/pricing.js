/* pricing.js — the front page of a broadsheet. A masthead between heavy rules, the whole price list as an
   index strip under it, then one story per package running the full width of the sheet: the name at
   headline size on the left, the price in the second ink at the right margin, a lead line under both, and
   newspaper columns below (the picture of the sample page, what is included, the timeline). One second
   ink, used in exactly three places: the masthead rule, the price figures, the order button. Monthly care
   and copywriting are the same story, smaller, under their own heading. Choosing one slides in the project
   form on a small receipt printer; "Create estimate" prints the preliminary estimate line by line.
   ?pick=standard|advanced|custom preselects. */

import { PACKAGES, PLAN_ORDER, createOrder, careAmount, total, mailtoHref, askHref, estimateText, rowsToLines, COLS } from '../js/order.js';
import { getLang, setLang, applyDocLang, T } from '../js/lang.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const get = (obj, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
const live = (msg) => { const el = $('#live'); el.textContent = ''; requestAnimationFrame(() => { el.textContent = msg; }); };
const phone = () => window.matchMedia('(max-width: 700px)').matches;
const ARROW = '<svg viewBox="0 0 14 12" width="14" height="12" aria-hidden="true"><path d="M1 6h11M8 1.5 12.5 6 8 10.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

/* Đường xé ở mép trên tờ báo giá. Dựng MỘT LẦN mỗi phiên bằng một bộ sinh số có hạt giống,
   nên mỗi lần mở trang vết xé một khác, nhưng trong suốt phiên thì nó đứng yên. */
function duongXe() {
  let hat = (Math.random() * 4294967296) >>> 0;
  const r = () => { hat = (hat * 1664525 + 1013904223) >>> 0; return hat / 4294967296; };
  const W = 420, H = 15, day = 10.5;
  let d = `M0 ${H} L0 ${(day - r() * 4).toFixed(1)}`;
  let x = 0;
  while (x < W) {
    x = Math.min(W, x + 2.5 + r() * 8);
    // thỉnh thoảng một xơ giấy nhô cao hơn hẳn
    const y = day - r() * 6.5 - (r() < 0.1 ? 3.2 : 0);
    d += ` L${x.toFixed(1)} ${Math.max(0.5, y).toFixed(1)}`;
  }
  d += ` L${W} ${H} Z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d}" fill="#fff"/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

let lang = getLang();
const order = createOrder();
let printing = false;
let counterReturn = null;

function applyStatic() {
  const t = T(lang);
  applyDocLang(lang);
  document.title = t.pricing.meta.title;
  const md = $('meta[name="description"]'); if (md) md.content = t.pricing.meta.description;
  $$('[data-t]').forEach((el) => { const v = get(t, el.dataset.t); if (v != null) el.textContent = v; });
  $$('[data-t-label]').forEach((el) => { const v = get(t, el.dataset.tLabel); if (v != null) el.setAttribute('aria-label', v); });
}

/* ---------- the page ---------- */
const LABEL = 'Shocking Mike Records';
/* a real screenshot of each sample page, taken from the live site (media/) */
const SHOT = { standard: '../media/kern-society.jpg', advanced: '../media/rhumb-line.jpg', custom: '../media/chom.jpg' };
const sectHead = (n, title) => `<div class="sect__head"><h2 class="k">${esc(n)} — ${esc(title)}</h2></div>`;
const cta = (pick, text) => `<button class="row" type="button" data-pick="${pick}"><span class="row__label">${esc(text)}</span><span class="row__arrow">${ARROW}</span></button>`;

/* one line of the index strip at the head of the sheet */
const sumRow = (n, go, name, time, price, add) =>
  `<li><a class="sum${add ? ' sum--add' : ''}" href="#${go}" data-go="${go}">` +
  `<span class="sum__n">${n}</span><span class="sum__name">${esc(name)}</span>` +
  `<span class="sum__time">${esc(time)}</span><span class="sum__price">${esc(price)}</span></a></li>`;

/* one column of a story: a small tracked label with a rule under it, then the particulars */
const col = (k, body) => `<div class="col"><span class="k">${esc(k)}</span>${body}</div>`;

/* the head of a story: the name at headline size, the price in the second ink at the right margin */
const storyHead = (n, name, kPrice, price) =>
  `<div class="plan__head">
      <div><span class="plan__n">${n}</span><h3 class="plan__name">${esc(name)}</h3></div>
      <div><span class="k plan__kprice">${esc(kPrice)}</span><p class="plan__price">${esc(price)}</p></div>
    </div>`;

function renderPage() {
  const P = T(lang).pricing;
  $('.hero__title').textContent = P.hero.title;
  $('.hero__lead').textContent = P.hero.lead;
  // the dateline under the masthead: name, year, issue — the way a newspaper signs its front page
  $('#heroLabel').innerHTML = `<span>${LABEL}</span><span>2026</span><span>N&deg; 01</span>`;
  $('#heroNote').textContent = P.notes[0];

  // ---- the index strip: every price at a glance, before anything else ----
  $('#glanceK').textContent = P.label.price;
  $('#glanceAddK').textContent = `${P.care.name} · ${P.addon.name}`;
  $('#summary').innerHTML = PLAN_ORDER
    .map((id, i) => sumRow(String(i + 1).padStart(2, '0'), `plan-${id}`, P.plans[id].name, P.plans[id].timeline, P.plans[id].price))
    .join('');
  $('#summaryAdd').innerHTML =
    sumRow('04', 'care', P.care.name, '', P.care.price, true) +
    sumRow('05', 'addon', P.addon.name, '', P.addon.price, true);

  // ---- the three packages: one story each, running the whole width of the sheet ----
  $('#plansK').textContent = `01 — ${P.label.plans}`;
  $('#plans').innerHTML = PLAN_ORDER.map((id, i) => {
    const c = P.plans[id], pk = PACKAGES[id];
    const n = String(i + 1).padStart(2, '0');
    const name = pk.exampleUrl
      ? `<a href="${pk.exampleUrl}" target="_blank" rel="noopener">${esc(c.example)}</a>`
      : esc(c.example);
    const img = `<img src="${SHOT[id]}" width="960" height="600" alt="${esc(c.example)}"${i ? ' loading="lazy"' : ''}>`;
    return `<li><article class="plan" id="plan-${id}" data-plan="${id}">
      ${storyHead(n, c.name, P.label.price, c.price)}
      <p class="plan__for">${esc(c.for)}${c.note ? ` <span class="plan__note">${esc(c.note)}</span>` : ''}</p>
      <div class="plan__body">
        <figure class="shot">
          ${pk.exampleUrl ? `<a href="${pk.exampleUrl}" target="_blank" rel="noopener">${img}</a>` : img}
          <figcaption class="k shot__cap">${esc(P.label.example)} · ${name}</figcaption>
        </figure>
        ${col(P.label.includes, `<ul class="plan__list">${c.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`)}
        ${col(P.label.timeline, `<p>${esc(c.timeline)}</p>`)}
      </div>
      ${cta(id, c.cta)}
    </article></li>`;
  }).join('');

  // ---- added on, not a fourth package ----
  $('#extrasK').textContent = `02 — ${P.care.name} · ${P.addon.name}`;
  $('#extras').innerHTML = `
    <li><article class="plan plan--add" id="care">
      ${storyHead('04', P.care.name, P.label.price, P.care.price)}
      <p class="plan__for">${esc(P.care.description)}</p>
      <div class="plan__body">
        ${col(P.label.includes, `<ul class="plan__list">${P.care.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`)}
        ${col(P.label.price, `<p>${esc(P.care.priceNote)}</p>`)}
      </div>
      ${cta('care', P.care.cta)}
    </article></li>
    <li><article class="plan plan--add" id="addon">
      ${storyHead('05', P.addon.name, P.label.price, P.addon.price)}
      <p class="plan__for">${esc(P.addon.description)}</p>
      ${cta('copy', P.addon.cta)}
    </article></li>`;

  // ---- the back of the sheet: short items, two columns, hairlines ----
  $('#process').innerHTML = sectHead('03', P.process.title) +
    `<ol class="steps">${P.process.steps.map((s, i, all) => `<li><span class="steps__n"${i > 0 && i < all.length - 1 ? ' data-entry' : ''}>${String(i + 1).padStart(2, '0')}</span><p>${esc(s)}</p></li>`).join('')}</ol>`;
  $('#faq').innerHTML = sectHead('04', P.faq.title) +
    `<div class="faq">${P.faq.items.map(([q, a], i) => `<details class="qa"><summary><span class="qa__k">Q${i + 1}</span><span class="qa__q">${esc(q)}</span><i class="qa__sign" aria-hidden="true"></i></summary><p>${esc(a)}</p></details>`).join('')}</div>`;
  $('#terms').innerHTML = `<details class="qa qa--terms"><summary><h2 class="k">05 — ${esc(P.terms.title)}</h2><i class="qa__sign" aria-hidden="true"></i></summary>
    <ul class="terms">${P.terms.items.map((s) => `<li><span>${esc(s)}</span></li>`).join('')}</ul></details>`;
  $$('#faq details').forEach((d) => d.addEventListener('toggle', () => { if (d.open) $$('#faq details').forEach((o) => { if (o !== d) o.open = false; }); }));
  $('#contact').innerHTML = sectHead('06', P.contact.title) +
    `<div class="closing">
       <div>
         <p class="block__text">${esc(P.contact.text)}</p>
         <p class="block__mail"><a href="${askHref(lang)}">${esc(P.contact.email)}</a></p>
       </div>
     </div>`;
}

/* ---------- the project form ---------- */
function renderForm() {
  const P = T(lang).pricing;
  const F = P.form;
  const plans = PLAN_ORDER.map((id) => `<label><input type="radio" name="plan" value="${id}"><span class="slip__name">${esc(P.plans[id].name)}</span><span class="slip__price">${esc(P.plans[id].price)}</span></label>`).join('');
  $('#slip').innerHTML = `
    <p class="slip__head"><span>Shocking Mike Records</span><span class="mono">${esc(P.estimate.title)}</span></p>
    <h2 class="slip__title" id="formTitle">${esc(F.title)}</h2>
    <p class="slip__intro">${esc(F.intro)}</p>
    <fieldset class="slip__records">
      <legend class="slip__label">${esc(F.plan)} <span>${esc(F.required)}</span></legend>
      ${plans}
    </fieldset>
    <div class="slip__row">
      <span class="slip__label" id="careLabel">${esc(F.care)}</span>
      <div class="stepper" role="group" aria-labelledby="careLabel">
        <button type="button" id="careMinus" aria-label="−1">−</button>
        <output id="careN" aria-live="polite"></output>
        <button type="button" id="carePlus" aria-label="+1">+</button>
      </div>
      <span class="slip__price" id="carePrice"></span>
      <small class="slip__hint">${esc(P.care.priceNote)}</small>
    </div>
    <label class="slip__row slip__toggle">
      <span class="slip__label">${esc(F.copywriting)}</span>
      <input type="checkbox" id="copyToggle"><span class="switch" aria-hidden="true"></span>
      <span class="slip__price">${esc(F.copywritingNote)}</span>
    </label>
    <fieldset class="slip__notes">
      ${F.fields.map((n) => `<label><span>${esc(n.label)}${n.required ? ` <em>${esc(F.required)}</em>` : ''}</span><input name="${n.key}" maxlength="80" placeholder="${esc(n.hint)}"${n.required ? ' aria-required="true"' : ''}></label>`).join('')}
    </fieldset>
    <p class="slip__total"><span>${esc(P.estimate.total)}</span><b id="slipTotal">—</b></p>
    <p class="slip__msg" id="slipMsg" role="alert"></p>`;
  $$('input[name="plan"]').forEach((i) => i.addEventListener('change', () => { order.setPlan(i.value); syncForm(); }));
  $('#careMinus').addEventListener('click', () => { order.setMonths(order.state.months - 1); syncForm(); });
  $('#carePlus').addEventListener('click', () => { order.setMonths(order.state.months + 1); syncForm(); });
  $('#copyToggle').addEventListener('change', (e) => { order.setCopy(e.target.checked); syncForm(); });
  $$('#slip .slip__notes input').forEach((inp) => inp.addEventListener('input', () => { order.setField(inp.name, inp.value); if ($('#slipMsg').textContent) syncForm(); }));
  syncForm();
}

function syncForm() {
  const P = T(lang).pricing;
  const s = order.state;
  $$('input[name="plan"]').forEach((i) => { i.checked = i.value === s.plan; });
  $('#careN').textContent = s.months > 0 ? `${s.months} ${P.form.careUnit}` : P.form.careNone;
  $('#carePrice').textContent = s.months > 0 ? careAmount(lang, s.months) : P.care.price;
  $('#careMinus').disabled = s.months === 0;
  $('#carePlus').disabled = s.months >= PACKAGES.care.max;
  $('#copyToggle').checked = s.copy;
  for (const k of Object.keys(s.fields)) { const inp = $(`#slip input[name="${k}"]`); if (inp && inp.value !== s.fields[k]) inp.value = s.fields[k]; }
  const t = total(lang, s);
  $('#slipTotal').textContent = t ? t.text : '—';
  if ($('#slipMsg').textContent && !order.missing()) $('#slipMsg').textContent = '';
  $$('.plan').forEach((p) => p.classList.toggle('is-picked', p.dataset.plan === s.plan));
  const care = $('#care'); if (care) care.classList.toggle('is-picked', s.months > 0);
  if (!$('#counter').hidden) paint(s.plan || (s.months > 0 ? 'care' : null));
}

/* the ground behind the sheet takes the colour of the entry in hand while the form is open */
function paint(id) {
  const root = document.documentElement.style;
  const th = id && PACKAGES[id] ? PACKAGES[id].theme : null;
  if (th) root.setProperty('--page-bg', `color-mix(in srgb, ${th.bg} 22%, #1c1b1f)`);
  else root.removeProperty('--page-bg');
}

function openCounter(pick) {
  if (pick === 'care') { if (order.state.months === 0) order.setMonths(3); }
  else if (pick === 'copy') order.setCopy(true);
  else if (PACKAGES[pick]) order.setPlan(pick);
  resetPaper();
  const C = $('#counter');
  counterReturn = document.activeElement;
  C.hidden = false;
  document.body.classList.add('has-counter');
  syncForm();
  requestAnimationFrame(() => requestAnimationFrame(() => C.classList.add('is-in')));
  setTimeout(() => { const f = order.state.plan ? $('#slip input[name="brand"]') : $('input[name="plan"]'); if (f) f.focus({ preventScroll: true }); }, 80);
  live(T(lang).pricing.form.title);
}
function closeCounter(after) {
  const C = $('#counter');
  if (C.hidden) { if (after) after(); return; }
  C.classList.remove('is-in');
  paint(null);
  const done = () => { C.hidden = true; document.body.classList.remove('has-counter'); if (after) after(); };
  setTimeout(done, 560);
  if (!after && counterReturn && document.contains(counterReturn)) counterReturn.focus({ preventScroll: true });
}

function resetPaper() {
  printing = false;
  $('#slip').hidden = false;
  $('#slip').classList.remove('is-away');
  $('#paper').hidden = true;
  $('#roll').innerHTML = '';
  $('#actions').hidden = true;
  $('#sendFallback').hidden = true;
  $('#printBtn').disabled = false;
  const m = $('#slipMsg'); if (m) m.textContent = '';
  $('#counter').classList.remove('is-printed');
}

function doPrint() {
  if (printing) return;
  const F = T(lang).pricing.form;
  const miss = order.missing();
  if (miss) {
    $('#slipMsg').textContent = miss === 'plan' ? F.errorPlan : F.errorBrand;
    (miss === 'plan' ? $('input[name="plan"]') : $('#slip input[name="brand"]')).focus();
    return;
  }
  const est = order.make(lang, new Date());
  // dòng ngay dưới "SHOCKING MIKE" vốn mở đầu bằng chính cái tên ấy — bỏ phần lặp đi.
  // Sửa ở cả rows lẫn lines nên bản in, bản chép và thư gửi đi đều giống nhau.
  est.rows = est.rows.map((r) => (r.cls === 'r-sub' ? { ...r, s: r.s.replace(/^\s*Shocking Mike\s*·\s*/i, '') } : r));
  est.lines = rowsToLines(est.rows, COLS);
  printing = true;
  $('#printBtn').disabled = true;
  $('#slip').classList.add('is-away');
  const roll = $('#roll');
  const area = $('#counterArea');
  roll.innerHTML = '';
  const start = () => {
    $('#slip').hidden = true;
    $('#paper').hidden = false;
    const lines = est.lines;
    let i = 0;
    let box = roll;
    const step = 60;
    const feed = () => {
      // the head prints one line, the paper steps up by one line
      const ln = lines[i];
      if (ln.cls === 'r-thead') {
        // "Terms in brief": folded on a phone screen, open on a computer; the e-mail and the printout keep all of it
        const d = document.createElement('details');
        d.className = 'rterms';
        if (!phone()) d.open = true;
        const sm = document.createElement('summary');
        sm.className = 'rl r-thead';
        sm.textContent = ln.s;
        d.appendChild(sm);
        roll.appendChild(d);
        box = d;
      } else {
        if (box !== roll && ln.cls !== 'r-terms') box = roll;
        const div = document.createElement('div');
        div.className = `rl ${ln.cls || ''}`;
        div.textContent = ln.s || ' ';
        box.appendChild(div);
      }
      area.scrollTop = area.scrollHeight;
      i += 1;
      if (i < lines.length) setTimeout(feed, ln.cls === 'r-rule' ? step * 0.6 : step);
      else finish();
    };
    feed();
  };
  const finish = () => {
    printing = false;
    $('#send').href = mailtoHref(est);
    $('#actions').hidden = false;
    $('#counter').classList.add('is-printed');
    requestAnimationFrame(() => { area.scrollTop = area.scrollHeight; setTimeout(() => { area.scrollTop = area.scrollHeight; }, 450); });
    live(est.total);
    setTimeout(() => $('#send').focus({ preventScroll: true }), 40);
  };
  setTimeout(start, 380);
}

async function copyEstimate() {
  const e = order.state.estimate;
  if (!e) return;
  const B = T(lang).pricing.button;
  const text = estimateText(e).replace(/\r\n/g, '\n');
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
  }
  const b = $('#copyBtn');
  b.textContent = ok ? B.copied : B.copy;
  setTimeout(() => { b.textContent = B.copy; }, 2200);
}

/* ---------- language ---------- */
function switchLang() {
  lang = lang === 'en' ? 'vi' : 'en';
  setLang(lang);
  applyStatic();
  renderPage();
  const printed = !$('#paper').hidden;
  renderForm();
  if (printed) resetPaper();
}

/* ---------- wiring ---------- */
document.addEventListener('click', (e) => {
  if (e.target.closest('#lang')) { switchLang(); return; }
  const pick = e.target.closest('[data-pick]');
  if (pick) { e.preventDefault(); openCounter(pick.dataset.pick); return; }
  const go = e.target.closest('[data-go]');
  if (go) {
    e.preventDefault();
    const el = document.getElementById(go.dataset.go);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#counter').hidden) closeCounter(); });
$('#printBtn').addEventListener('click', doPrint);
$('#copyBtn').addEventListener('click', copyEstimate);
// "Email app didn't open?" appears only after the send button has been pressed
$('#send').addEventListener('click', () => { setTimeout(() => { $('#sendFallback').hidden = false; }, 1200); });
$('#printPdf').addEventListener('click', () => window.print());
window.addEventListener('beforeprint', () => $$('.rterms').forEach((d) => { d.open = true; }));
$('#counterClose').addEventListener('click', () => closeCounter());
$('#again').addEventListener('click', () => { resetPaper(); syncForm(); setTimeout(() => $('#slip input[name="brand"]').focus({ preventScroll: true }), 50); });

document.documentElement.style.setProperty('--xe-hinh', duongXe());
applyStatic();
renderPage();
renderForm();
const pick = new URLSearchParams(location.search).get('pick');
if (pick && PACKAGES[pick]) {
  const row = $(`#plan-${pick}`);
  if (row) row.scrollIntoView({ block: 'center' });
  setTimeout(() => openCounter(pick), 250);
}
window.__pricing = { order, openCounter, doPrint, switchLang, lang: () => lang };
