/* pricing.js — the front page of a broadsheet. A masthead between heavy rules; the three packages side by side
   (cards, the full comparison table, care and copywriting in two small boxes); then one block per package that
   does the persuading: the sample page itself, running in a thin browser frame and taking more than half the
   width, beside the name, the price, Mike's own paragraph, a row of big figures and two buttons. The frames
   swap sides from one package to the next (s2-luat.txt). One second ink, used for the masthead rule, the price
   figures and the order button. Choosing one slides in the project form on a small receipt printer; "Create
   estimate" prints the preliminary estimate line by line. ?pick=standard|advanced|custom preselects. */

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
/* each sample page, recorded from the live site (media/): a still for the first look, 8 seconds of it running */
const SHOT = { standard: '../media/kern-society.jpg', advanced: '../media/rhumb-line.jpg', custom: '../media/chom.jpg' };
const FILM = { standard: '../media/kern-society.mp4', advanced: '../media/rhumb-line.mp4', custom: '../media/chom.mp4' };
const sectHead = (n, title) => `<div class="sect__head"><h2 class="k">${esc(n)} — ${esc(title)}</h2></div>`;
const cta = (pick, text) => `<button class="row" type="button" data-pick="${pick}"><span class="row__label">${esc(text)}</span><span class="row__arrow">${ARROW}</span></button>`;
const OUT = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';

/* the sample page in a thin browser frame: the address in the bar, the still under it. The moving version is
   laid over the still only when the frame comes near the screen (wireFilms), so opening the page loads no video. */
const frame = (id, name, alt) => {
  const url = PACKAGES[id].exampleUrl || '';
  return `<figure class="shot">
      <div class="browser">
        <div class="browser__bar" aria-hidden="true"><i></i><i></i><i></i><span class="browser__url">${esc(url.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</span></div>
        <div class="browser__view${id === 'custom' ? ' browser__view--trim' : ''}" data-film="${FILM[id]}"><img src="${SHOT[id]}" width="960" height="600" alt="${esc(alt)}" loading="lazy" decoding="async"></div>
      </div>
    </figure>`;
};

function renderPage() {
  const P = T(lang).pricing;
  $('.hero__title').textContent = P.hero.title;
  $('.hero__lead').textContent = P.hero.lead;
  // the dateline under the masthead: name, year, issue — the way a newspaper signs its front page
  $('#heroLabel').innerHTML = `<span>${LABEL}</span><span>2026</span><span>N&deg; 01</span>`;
  $('#heroNote').textContent = P.notes[0];

  // ---- the three packages side by side, before anything else ----
  renderCompare(P);

  // ---- one block per package: the sample page running beside Mike's own words (s2-luat.txt) ----
  $('#plansK').textContent = `01 — ${P.label.plans}`;
  const C = P.compare, F = P.stats;
  $('#plans').innerHTML = PLAN_ORDER.map((id, i) => {
    const c = P.plans[id], pk = PACKAGES[id];
    const n = String(i + 1).padStart(2, '0');
    const weeks = (c.timeline.match(/\d+(?:\s?[–-]\s?\d+)?/) || [''])[0];
    // the figures that close the block; Custom has no fixed number of sections, so it shows three
    const facts = [[weeks, F.weeks], [pk.sections, F.sections], [pk.rounds, F.rounds], [pk.fixDays, F.fix]]
      .filter(([v]) => v != null && v !== '')
      .map(([v, k]) => `<li><b>${esc(v)}</b><span>${esc(k)}</span></li>`).join('');
    const sample = pk.exampleUrl
      ? `<a class="row row--ink" href="${pk.exampleUrl}" target="_blank" rel="noopener"><span class="row__label">${esc(P.label.sample)}</span><span class="row__arrow">${OUT}</span></a>`
      : '';
    return `<li><article class="plan plan--pkg${i % 2 ? ' plan--flip' : ''}" id="plan-${id}" data-plan="${id}">
      <div class="plan__head">
        <span class="plan__n">${n}</span>
        <div class="plan__title"><h3 class="plan__name">${esc(c.name)}</h3>${id === PICK ? `<span class="card__tag">${esc(C.recommend)}</span>` : ''}</div>
        <p class="plan__price">${priceHTML(c.price)}</p>
      </div>
      ${frame(id, c.name, `${c.example} · ${P.label.example}`)}
      <div class="plan__body">
        <p class="k plan__kicker" data-entry>${esc(C.cards[id][0])}</p>
        <p class="plan__for">${esc(c.for)}${c.note ? ` <span class="plan__note">${esc(c.note)}</span>` : ''}</p>
        <ul class="facts">${facts}</ul>
        <div class="plan__acts">${cta(id, c.cta)}${sample}</div>
      </div>
    </article></li>`;
  }).join('');

  // ---- what no package covers: the small print under all three (what they all include is in the table above) ----
  const S = P.shared;
  $('#shared').innerHTML = `<h3 class="k shared__k">${esc(S.notTitle)}</h3>
    <ul class="shared__nots">${S.not.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="shared__fine">${esc(S.text)}</p>`;

  // ---- added on, not a fourth package: the same words and buttons, no picture, side by side ----
  $('#extrasK').textContent = `02 — ${P.care.name} · ${P.addon.name}`;
  const extra = (key, pick, x) => `<li><article class="plan plan--add" id="${key}">
      <h3 class="plan__name">${esc(x.name)}</h3>
      <p class="plan__price${/\d/.test(x.price) ? '' : ' plan__price--word'}">${priceHTML(x.price)}</p>
      <p class="plan__for">${esc(x.description)}</p>
      <div class="plan__acts">${cta(pick, x.cta)}</div>
    </article></li>`;
  $('#extras').innerHTML = extra('care', 'care', P.care) + extra('addon', 'copy', P.addon);
  wireFilms();

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

/* ---------- the three packages: cards first, the full comparison under them ----------
   Learnt from well-made pricing pages (s1b-luat.txt): three cards of one mould — name, the price as the biggest
   thing on the card, one sentence, four lines, a button at the foot — the recommended one told apart only by a
   small tag beside its name and a filled button. Under them, the whole comparison as a table whose head stays
   put while it scrolls past; a cell with nothing in it is left empty. Then care and copywriting, two small boxes. */
const TICK = '<svg viewBox="0 0 14 11" width="14" height="11" aria-hidden="true" focusable="false"><path d="M1.3 5.9 5 9.2 12.7 1.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
const PICK = 'advanced';

/* the figures of a price set big, the words round them (a currency word, "from") small and quiet */
const priceHTML = (s) => esc(s).replace(/([$]?\d[\d.,]*(?:\s?[–-]\s?[$]?\d[\d.,]*)?)/g, (m) => `<b>${m}</b>`);

/* one cell: ✓ becomes the drawn tick (anything after it a small note), — stays empty, @sample the sample page */
function cmpCell(C, P, id, v) {
  if (v === '@sample') {
    const pk = PACKAGES[id];
    const name = esc(P.plans[id].example);
    return pk.exampleUrl ? `<a href="${pk.exampleUrl}" target="_blank" rel="noopener">${name}</a>` : name;
  }
  if (v.startsWith('✓')) {
    const note = v.slice(1).trim();
    return `<span class="tick" role="img" aria-label="${esc(C.yes)}">${TICK}</span>${note ? `<span class="cmp__note">${esc(note)}</span>` : ''}`;
  }
  if (v === '—') return `<span class="sr-only">${esc(C.no)}</span>`;
  return `<span class="cmp__t">${esc(v)}</span>`;
}

function renderCompare(P) {
  const C = P.compare;
  const ids = PLAN_ORDER;
  const go = (id, text, solid) => `<a class="row${solid ? '' : ' row--line'}" href="#plan-${id}" data-go="plan-${id}"><span class="row__label">${esc(text)}</span><span class="row__arrow">${ARROW}</span></a>`;

  const cards = ids.map((id) => {
    const c = P.plans[id];
    const pick = id === PICK;
    const lines = C.cards[id].map((x, i) => `<li${i === 0 ? ' class="card__lead"' : ''}>${TICK}<span>${esc(x)}</span></li>`).join('');
    return `<article class="card${pick ? ' is-pick' : ''}" data-plan="${id}">
      <div class="card__head"><h3 class="card__name">${esc(c.name)}</h3>${pick ? `<span class="card__tag">${esc(C.recommend)}</span>` : ''}</div>
      <p class="card__price">${priceHTML(c.price)}</p>
      <p class="card__time">${esc(c.timeline)}</p>
      <p class="card__fit">${esc(c.fit)}</p>
      <ul class="card__list">${lines}</ul>
      <div class="card__foot">${go(id, C.details, pick)}</div>
    </article>`;
  }).join('');

  const cell = (id, inner, tag = 'td', attrs = '') => `<${tag} class="cmp__c" data-plan="${id}"${attrs}>${inner}</${tag}>`;
  const heads = ids.map((id) => {
    const c = P.plans[id];
    return cell(id, `<span class="cmp__name">${esc(c.name)}</span><span class="cmp__price">${esc(c.price)}</span>`
      + `<a class="cmp__go" href="#plan-${id}" data-go="plan-${id}">${esc(C.details)}<span aria-hidden="true"> →</span></a>`, 'th', ' scope="col"');
  }).join('');
  const groups = C.groups.map((g) => {
    const rows = g.all ? g.rows.map((label) => [label, '✓', '✓', '✓']) : g.rows;
    const top = `<tr class="cmp__group"><th scope="rowgroup" class="cmp__gname" colspan="4" data-entry><span class="cmp__t">${esc(g.name)}</span></th></tr>`;
    const body = rows.map(([label, ...v]) =>
      `<tr><th scope="row" class="cmp__label"><span class="cmp__t">${esc(label)}</span></th>${ids.map((id, i) => cell(id, cmpCell(C, P, id, v[i]))).join('')}</tr>`).join('');
    return `<tbody>${top}${body}</tbody>`;
  }).join('');
  const tabs = ids.map((id) =>
    `<button class="cmp__tab" type="button" data-show="${id}" aria-pressed="${id === PICK}">`
    + `<span class="cmp__tabname">${esc(P.plans[id].name)}</span><span class="cmp__tabprice">${esc(P.plans[id].price)}</span></button>`).join('');

  const box = (href, name, price, text, note) => `<article class="addon-box">
      <h3 class="addon-box__name">${esc(name)}</h3>
      <p class="addon-box__price">${esc(price)}</p>
      <p class="addon-box__text">${esc(text)}${note ? ` <span class="addon-box__note">${esc(note)}</span>` : ''}</p>
      <a class="addon-box__go" href="#${href}" data-go="${href}">${esc(C.details)}<span aria-hidden="true"> →</span></a>
    </article>`;

  $('#compare').innerHTML = `
    <h2 class="sr-only" id="cmpCap">${esc(C.caption)}</h2>
    <div class="cards">${cards}</div>
    <div class="cmpwrap">
      <h2 class="cmp__title" id="cmpTitle">${esc(C.title)}</h2>
      <div class="cmp__tabs" role="group" aria-label="${esc(C.title)}">${tabs}</div>
      <table class="cmp" data-show="${PICK}" aria-labelledby="cmpTitle">
        <colgroup><col class="cmp__labcol">${ids.map(() => '<col>').join('')}</colgroup>
        <thead><tr><td class="cmp__corner"></td>${heads}</tr></thead>
        ${groups}
      </table>
    </div>
    <div class="addons">
      ${box('care', P.care.name, P.care.price, P.care.description)}
      ${box('addon', P.addon.name, P.addon.price, P.addon.description, C.after.text)}
    </div>`;
}

/* ---------- the sample pages, running ----------
   Nothing is fetched while the page opens: each frame holds only its still. When a frame comes within half
   a screen of view, a muted, looping video is laid over the still. Only one sample page runs at a time: the
   frame most in view, once at least a third of it shows; the others stop. While the page is being scrolled
   the running one holds still, and carries on a moment after the scrolling rests: scrolling and playing at
   once cost frames on a weak machine (s2 check: one 50 ms frame per video at 1440 without this). A phone
   that asked to save data, a browser without IntersectionObserver, and a visit without JavaScript keep the
   still and never load a video. */
let filmWatch = [];
function wireFilms() {
  filmWatch.forEach((o) => o.disconnect());
  filmWatch = [];
  let save = false;
  try { save = !!(navigator.connection && navigator.connection.saveData); } catch { save = false; }
  if (save || !('IntersectionObserver' in window)) return;
  const views = $$('.browser__view[data-film]');
  const shown = new Map();   // how much of each frame is on screen, 0 to 1
  let moving = false, rest = 0;
  const choose = () => {
    let best = null, most = 0.34;
    shown.forEach((r, el) => { if (r > most) { most = r; best = el; } });
    views.forEach((el) => {
      const v = el.querySelector('video');
      if (!v) return;
      if (el === best && !moving) { if (v.paused) { const p = v.play(); if (p) p.catch(() => {}); } } else if (!v.paused) v.pause();
    });
  };
  const onScroll = () => {
    if (!moving) { moving = true; choose(); }
    clearTimeout(rest);
    rest = setTimeout(() => { moving = false; choose(); }, 160);
  };
  addEventListener('scroll', onScroll, { passive: true });
  const lay = (el) => {
    if (el.querySelector('video')) return;
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.preload = 'auto';
    v.poster = el.querySelector('img').getAttribute('src');
    v.addEventListener('playing', () => v.classList.add('is-live'), { once: true });
    v.src = el.dataset.film;
    el.appendChild(v);
    choose();
  };
  const near = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { lay(e.target); near.unobserve(e.target); }
  }), { rootMargin: '50% 0px' });
  const seen = new IntersectionObserver((es) => {
    es.forEach((e) => shown.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
    choose();
  }, { threshold: [0, 0.2, 0.35, 0.5, 0.65, 0.8, 1] });
  views.forEach((el) => { near.observe(el); seen.observe(el); });
  filmWatch = [near, seen, { disconnect: () => { removeEventListener('scroll', onScroll); clearTimeout(rest); } }];
}

/* on a phone the table shows one package at a time; the three buttons over it choose which */
document.addEventListener('click', (e) => {
  const b = e.target.closest('.cmp__tab');
  if (!b) return;
  const t = $('.cmp');
  if (!t) return;
  t.dataset.show = b.dataset.show;
  $$('.cmp__tab').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
});

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
