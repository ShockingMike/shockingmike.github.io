/* main.js — the portfolio: the stack of six records, the record page, the preview layer, English / Vietnamese. */

import { RECORDS, byId } from './records.js';
import { PLAN_ORDER } from './order.js';
import { COPY } from './copy.js';
import { getLang, setLang, applyDocLang, T, fill } from './lang.js';
import { createLoad } from './loader.js';
import { sealedSheet } from './album.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const live = (msg) => { const el = $('#live'); el.textContent = ''; requestAnimationFrame(() => { el.textContent = msg; }); };
const ARROW = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 9 9 3M4 3h5v5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
const get = (obj, path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);

let lang = getLang();
let stage = null;
let lastKey = false;
window.addEventListener('keydown', () => { lastKey = true; }, true);
window.addEventListener('pointerdown', () => { lastKey = false; }, true);

function setTheme(r) {
  const s = document.documentElement.style;
  s.setProperty('--rec-bg', r.theme.bg);
  s.setProperty('--rec-bg2', r.theme.bg2 || r.theme.bg);
  s.setProperty('--rec-fg', r.theme.fg);
}

/* ---------- words that sit in the HTML ---------- */
function applyStatic() {
  const t = T(lang);
  applyDocLang(lang);
  document.title = t.site.title;
  const md = $('meta[name="description"]'); if (md) md.content = t.site.description;
  $('#role').innerHTML = t.brand.role.map((x) => `<span>${esc(x)}</span>`).join('');
  document.documentElement.style.setProperty('--rec-bg2', 'var(--rec-bg)');
  $$('[data-t]').forEach((el) => { const v = get(t, el.dataset.t); if (v != null) el.textContent = v; });
  $$('[data-t-label]').forEach((el) => { const v = get(t, el.dataset.tLabel); if (v != null) el.setAttribute('aria-label', v); });
}

/* ---------- the record page ---------- */
function row({ label, price = '', attrs = '', tag = 'button', off = false }) {
  const inner = `<span class="row__label">${esc(label)}</span><span class="row__price">${esc(price)}</span><span class="row__arrow">${off ? '' : ARROW}</span>`;
  if (off) return `<li><span class="row row--off">${inner}</span></li>`;
  if (tag === 'a') return `<li><a class="row" ${attrs}>${inner}</a></li>`;
  return `<li><button class="row" type="button" ${attrs}>${inner}</button></li>`;
}

function pricingHref(rec) { return rec.pick ? `bang-gia/?pick=${rec.pick}` : 'bang-gia/'; }

function rowsFor(rec, t, { inPreview = false } = {}) {
  const c = t.records[rec.id];
  const out = [];
  if (rec.sealed) {
    out.push(row({ label: t.ui.comingSoon, off: true }));
  } else {
    out.push(rec.url
      ? row({ label: c.cta.visit, tag: 'a', attrs: `href="${rec.url}" target="_blank" rel="noopener"` })
      : row({ label: c.cta.visit, off: true }));
    // a clip only when there is one to play
    if (!inPreview && rec.video) out.push(row({ label: c.cta.preview, attrs: `data-preview="${rec.id}"` }));
  }
  out.push(row({ label: c.cta.pricing, price: t.ui.wantPrice, tag: 'a', attrs: `href="${pricingHref(rec)}"` }));
  return out.join('');
}

function detailsMarkup(rec, t) {
  const d = t.records[rec.id].details;
  const L = t.label;
  const rows = [['role', d.role], ['tech', d.tech], ['year', d.year], ['status', d.status]].filter(([, v]) => v);
  return `<details class="more">
      <summary class="row"><span class="row__label">${esc(t.ui.details)}</span><span class="row__price"></span><span class="row__arrow"><i class="more__sign" aria-hidden="true"></i></span></summary>
      <dl class="page__tracks">${rows.map(([k, v]) => `<div><dt>${esc(L[k])}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    </details>`;
}

/* A record still in its wrap: where the write-up would be there is a sheet you can see is written on and
   cannot read. The sheet is a picture — bars of ink under blurred film, drawn on a canvas — so the words are
   not in the page at all, not in its source, and not on a screen reader's path. The line underneath is real,
   and is the only thing anyone is told. */
function sealedMarkup(t) {
  return `<div class="sealed" aria-hidden="true"><canvas class="sealed__sheet" width="1040" height="330"></canvas></div>
    <p class="page__lead page__lead--sealed">${esc(t.ui.sealed)}</p>`;
}

function pageMarkup(rec, t) {
  const c = t.records[rec.id];
  return `
    <p class="page__cat">${esc(rec.cat)}</p>
    <h2 class="page__title" id="title-${rec.id}" tabindex="-1">${esc(rec.name)}</h2>
    <p class="page__gloss">${esc(c.subtitle)}</p>
    <hr class="page__rule">
    ${rec.sealed ? sealedMarkup(t) : c.story.map((p) => `<p class="page__lead">${esc(p)}</p>`).join('')}
    <div class="page__acts">
      ${rec.sealed ? '' : detailsMarkup(rec, t)}
      <ul class="rows">${rowsFor(rec, t)}</ul>
    </div>
    <button class="sr-only" type="button" data-flip aria-label="${esc(fill(t.ui.flip, { title: rec.name }))}"></button>`;
}

function renderPages() {
  const t = T(lang);
  const on = $('#pageInner .page__rec.is-on');
  const onId = on ? on.dataset.id : null;
  $('#pageInner').innerHTML = RECORDS.map((r) => `<article class="page__rec${r.id === onId ? ' is-on' : ''}" data-id="${r.id}">${pageMarkup(r, t)}</article>`).join('');
  pageRecs = $$('#pageInner .page__rec');
  paintSealed();
  lastOs = null;
}

/** Draws that unreadable sheet on each sealed record's page, in the record's own two colours. */
function paintSealed() {
  $$('#pageInner .page__rec').forEach((el) => {
    const cv = $('.sealed__sheet', el);
    if (!cv || cv.dataset.done) return;
    const rec = byId(el.dataset.id);
    const art = sealedSheet(cv.width, cv.height, { bg: rec.theme.bg, ink: rec.theme.fg, seed: 5 + el.dataset.id.length });
    cv.getContext('2d').drawImage(art, 0, 0);
    cv.dataset.done = '1';
  });
}

/* ---------- ticks ---------- */
function renderTicks() {
  const t = T(lang);
  $('#ticks').innerHTML = RECORDS.map((r, i) => `<button type="button" data-tick="${i}"><span class="sr-only">${esc(fill(t.ui.record, { title: r.name }))}</span></button>`).join('')
    + `<button type="button" data-tick="flyer" class="tick--flyer"><span class="sr-only">${esc(t.ui.flyer.title)}</span></button>`;
}

/* ---------- the flyer: a short price list printed on the unfolded sheet ---------- */
function renderFlyer() {
  const t = T(lang);
  const P = t.pricing;
  const F = t.ui.flyer;
  $('#flyer').setAttribute('aria-label', F.open);
  // what a screen reader is told about the sheet in the crate: the packages and what they cost. The sentence
  // about who each one suits lives on the pricing page, one link away — read out here it put the phone screen
  // over the word budget, and it is a sales pitch rather than a description of what is on screen.
  $('#flyerSheet').innerHTML = `<span class="sr-only">${esc(F.title)}. ${PLAN_ORDER.map((id) => `${esc(P.plans[id].name)}: ${esc(P.plans[id].price)}.`).join(' ')} ${esc(P.care.name)}: ${esc(P.care.price)}. ${esc(F.more)}.</span>`;
}

let flyerShown = -1;
function placeFlyer(f, portrait) {
  const el = $('#flyer');
  const sheet = $('#flyerSheet');
  const on = f.p > 0.9 ? Math.min(1, (f.p - 0.9) / 0.1) : 0;
  if (on > 0) {
    const s = f.w / sheet.offsetWidth;
    el.style.transform = `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
  }
  if (on !== flyerShown) {
    flyerShown = on;
    el.style.opacity = on.toFixed(3);
    el.classList.toggle('is-on', on > 0.99);
    document.body.classList.toggle('in-flyer', f.p > 0.02);
  }
}

/* the flyer leads to the pricing page: the page goes dark, then the next one opens on the same dark */
function toPricing(href = 'bang-gia/') {
  if (document.body.classList.contains('is-leaving')) return;
  document.body.classList.add('is-leaving');
  setTimeout(() => { location.href = href; }, 380);
}

/* ---------- fallback list (and screen readers) ---------- */
function renderShelf() {
  const t = T(lang);
  $('.shelf__title').innerHTML = `${esc(t.brand.name)} <span>${esc(t.brand.role.join(' · '))}</span>`;
  $('.shelf__note').textContent = t.brand.note;
  $('#shelfList').innerHTML = RECORDS.map((r) => {
    const c = t.records[r.id];
    const links = [];
    if (r.url) links.push(`<a href="${r.url}" target="_blank" rel="noopener">${esc(c.cta.visit)} ↗</a>`);
    links.push(`<a href="${pricingHref(r)}">${esc(c.cta.pricing)} ${esc(t.ui.wantPrice)} ↗</a>`);
    return `<li class="shelf__item"><p class="shelf__cat">${esc(r.cat)}</p><h2>${esc(r.name)} <span>${esc(c.subtitle)}</span></h2>
      ${r.sealed ? `<p class="shelf__meta">${esc(t.ui.comingSoon)}</p>` : `${c.story.map((p) => `<p>${esc(p)}</p>`).join('')}<p class="shelf__meta">${esc(c.details.status)}</p>`}<p class="shelf__links">${links.join(' ')}</p></li>`;
  }).join('');
  const P = t.pricing;
  $('#shelfPrices').innerHTML = `<h2>${esc(t.ui.flyer.title)}</h2>
    ${PLAN_ORDER.map((id) => `<p><b>${esc(P.plans[id].name)}</b> ${esc(P.plans[id].price)} · ${esc(P.plans[id].for)}</p>`).join('')}
    <p><b>${esc(P.care.name)}</b> ${esc(P.care.price)}</p>
    <p><a href="bang-gia/">${esc(t.ui.flyer.more)} ↗</a></p>`;
  $('.shelf__foot').innerHTML = `<a href="bang-gia/">${esc(t.ui.pricing)}</a> · <a href="mailto:${t.ui.email}">${esc(t.ui.email)}</a>`;
}

let lastTick = -1;
let lastOs = null;
let pageRecs = [];
function onFrame(info) {
  const f = info.mode === 'open' ? Math.round(info.os) : info.focus > RECORDS.length - 0.5 ? RECORDS.length : Math.round(info.focus);
  if (f !== lastTick) { lastTick = f; $$('#ticks button').forEach((b, i) => b.classList.toggle('is-on', i === f)); }
  placeFlyer(info.flyer, info.portrait);
  // the column slides with the sleeve: the record in hand at rest, the next one a screen below, the last a screen above
  if (info.mode === 'open') {
    if (info.os !== lastOs) {
      lastOs = info.os;
      const vh = window.innerHeight;
      pageRecs.forEach((el, i) => {
        const d = i - info.os;
        const on = Math.abs(d) < 1.25;
        el.classList.toggle('is-on', on);
        el.style.transform = on ? `translate3d(0, ${(d * vh * 0.9).toFixed(1)}px, 0)` : '';
        el.style.opacity = on ? Math.max(0, 1 - Math.abs(d) * 1.4).toFixed(3) : '';
      });
    }
  } else if (lastOs !== null) {
    lastOs = null;
    pageRecs.forEach((el) => { el.style.transform = ''; el.style.opacity = ''; });
  }
}

/* ---------- open / close choreography ---------- */
let pendingOpen = null;
function onState(s, id) {
  const body = document.body;
  const t = T(lang);
  if (s === 'opening') {
    const r = byId(id);
    setTheme(r);
    $$('#pageInner .page__rec').forEach((a) => a.classList.toggle('is-on', a.dataset.id === id));
    const page = $('#page');
    page.classList.add('is-live');
    page.scrollTop = 0;
    body.classList.add('is-open');
    const i = RECORDS.findIndex((x) => x.id === id);
    lastTick = i; $$('#ticks button').forEach((b, k) => b.classList.toggle('is-on', k === i));
    live(fill(t.ui.record, { title: r.name }));
  }
  if (s === 'open' && lastKey) { const h = $(`#title-${id}`); if (h) h.focus({ preventScroll: true }); }
  if (s === 'switch') {
    // scrolled to the next record while open: new colours, new words, the tick moves
    const r = byId(id);
    setTheme(r);
    $('#page').scrollTop = 0;
    live(fill(t.ui.record, { title: r.name }));
  }
  if (s === 'closing') $('#page').classList.remove('is-in');
  if (s === 'stack') {
    body.classList.remove('is-open', 'is-bg');
    $('#page').classList.remove('is-live');
    $$('#pageInner .page__rec').forEach((a) => a.classList.remove('is-on'));
    if (pendingOpen) {
      const p = pendingOpen; pendingOpen = null;
      stage.setFocus(RECORDS.findIndex((x) => x.id === p));
      setTimeout(() => stage.open(p), 60);
    } else live(t.ui.back);
  }
}
function onCue(name) {
  if (name === 'bg-in') document.body.classList.add('is-bg');
  if (name === 'text-in') $('#page').classList.add('is-in');
  if (name === 'bg-out') document.body.classList.remove('is-bg');
}

/* ---------- "Watch preview" ---------- */
let previewReturn = null;
function openPreview(id) {
  const r = byId(id);
  if (!r) return;
  const t = T(lang);
  setTheme(r);
  previewReturn = document.activeElement;
  $('#listenTitle').textContent = r.name;
  $('#listenFor').textContent = t.records[r.id].subtitle;
  $('#listenBody').textContent = t.records[r.id].story[0];
  $('#listenDemo').innerHTML = `<div class="screen"><video muted loop playsinline autoplay preload="auto" poster="${r.poster}" src="${r.video}" aria-label="${esc(r.name)}"></video></div>`;
  $('#listenRows').innerHTML = rowsFor(r, t, { inPreview: true });
  const L = $('#listen');
  L.hidden = false;
  document.body.classList.add('has-layer');
  requestAnimationFrame(() => requestAnimationFrame(() => L.classList.add('is-in')));
  setTimeout(() => $('#listenBack').focus({ preventScroll: true }), 60);
}
function closePreview() {
  const L = $('#listen');
  if (L.hidden) return;
  L.classList.remove('is-in');
  const v = $('video', L);
  const done = () => { L.hidden = true; if (v) v.pause(); $('#listenDemo').innerHTML = ''; document.body.classList.remove('has-layer'); };
  setTimeout(done, 420);
  if (previewReturn && document.contains(previewReturn)) previewReturn.focus({ preventScroll: true });
}

/* ---------- language ---------- */
async function switchLang() {
  lang = lang === 'en' ? 'vi' : 'en';
  setLang(lang);
  applyStatic();
  renderShelf();
  if (stage) { renderPages(); await warmPages(); }
  renderTicks();
  if (stage) { renderFlyer(); stage.setFlyerLang(lang); }
  if (!$('#listen').hidden) closePreview();
}

/* Show each record page once, almost transparent, before anyone clicks:
   the browser lays out and rasterises the text now, not in the middle of an opening. */
async function warmPages() {
  const page = $('#page');
  if (page.classList.contains('is-live')) return;
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  page.classList.add('is-live', 'is-warm');
  for (const r of RECORDS) {
    setTheme(r);
    $$('#pageInner .page__rec').forEach((a) => a.classList.toggle('is-on', a.dataset.id === r.id));
    await frame(); await frame();
  }
  page.classList.remove('is-live', 'is-warm');
  $$('#pageInner .page__rec').forEach((a) => a.classList.remove('is-on'));
}

/* ---------- clicks + keys ---------- */
document.addEventListener('click', (e) => {
  const pv = e.target.closest('[data-preview]');
  if (pv) { e.preventDefault(); openPreview(pv.dataset.preview); return; }
  if (e.target.closest('[data-flip]') && stage) { stage.flip(); return; }
  if (e.target.closest('#lang')) { switchLang(); return; }
  const help = $('#help'), about = $('#about');
  if (e.target.closest('#help')) { const open = about.hidden; about.hidden = !open; help.setAttribute('aria-expanded', String(open)); }
  else if (!about.hidden && !e.target.closest('#about')) { about.hidden = true; help.setAttribute('aria-expanded', 'false'); }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!$('#about').hidden) { $('#about').hidden = true; $('#help').setAttribute('aria-expanded', 'false'); return; }
    if (!$('#listen').hidden) { closePreview(); return; }
    if (stage && (stage.mode === 'open' || stage.mode === 'opening')) { stage.close(); return; }
  }
  if (!stage || document.body.classList.contains('has-layer')) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;
  if (stage.mode === 'open') {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); stage.nudgeOpen(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); stage.nudgeOpen(-1); }
  }
  if (stage.mode === 'stack') {
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); stage.nudge(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); stage.nudge(-1); }
    else if ((e.key === 'Enter' || e.key === ' ') && (e.target === document.body || e.target.closest('#ticks'))) {
      e.preventDefault(); stage.open(stage.items[stage.focus]);
    }
  }
});
$('#listenBack').addEventListener('click', closePreview);

/* ---------- boot ---------- */
async function fontsReady() {
  const want = ['800 40px Archivo', '600 40px Archivo', '500 40px Archivo', '700 40px Archivo',
    '500 40px "JetBrains Mono"', '400 40px Newsreader', '600 40px Newsreader', 'italic 400 40px Newsreader'];
  // a sample with every shape the page will set: the record names, this site's words, figures and the speed
  const sample = `${RECORDS.map((r) => r.name).join(' ')} ${T(lang).ui.comingSoon.toUpperCase()} SMR 001 33⅓`;
  const all = Promise.all(want.map((f) => document.fonts.load(f, sample))).catch(() => {});
  await Promise.race([all, new Promise((r) => setTimeout(r, 3500))]);
}
function loadImage(src) {
  return new Promise((res) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => (img.decode ? img.decode().catch(() => {}).then(() => res(img)) : res(img));
    img.onerror = () => res(null);
    img.src = src;
  });
}

async function boot() {
  applyStatic();
  renderShelf();
  // what the wait screen is waiting for, and roughly how heavy each piece is (measured, see q8-loader-report.txt)
  const art = RECORDS.filter((r) => r.art);
  // Weights are the measured share of the real work on this machine (see q8-loader-report.txt), so the number
  // walks at roughly the speed the work does. Nothing is invented: each piece reports in when it is truly done.
  const SLEEVE = [11, 4.5, 4, 4, 2, 2];
  const load = createLoad([
    ['fonts', 1.5], ...art.map(() => ['art', 0.5]), ['module', 3],
    ...RECORDS.map((r, i) => ['sleeve', SLEEVE[i] ?? 3]), ['room', 2],
    ['warm', 1], ['warm', 9], ['warm', 7], ['warm', 6],                             // prints uploaded, shaders built
    ['warm', 1], ['warm', 9], ['warm', 9], ['warm', 1], ['warm', 9], ['warm', 12],  // the shop drawn in six passes
    ['warm', 0.5], ['warm', 0.5], ['warm', 1], ['warm', 1], ['warm', 1], ['warm', 1],
    ['pages', 4]
  ]);
  window.__load = load;
  // a browser with no 3D never sees the record start: the readable list is the page, straight away
  let ok = false;
  try { const p = document.createElement('canvas'); ok = !!(p.getContext('webgl2') || p.getContext('webgl')); } catch { ok = false; }
  if (!ok) { load.fail(); return; }
  // if something never answers, nobody is left staring at a record that will not spin
  const guard = setTimeout(() => load.fail(), 25000);
  const [mod, imgs] = await Promise.all([
    import('./stage.js').then((m) => { load.step('module'); return m; }).catch((e) => { console.warn('3D could not load', e); return null; }),
    Promise.all(RECORDS.filter((r) => r.art).map(async (r) => { const im = await loadImage(r.art); await load.step('art'); return [r.id, im]; })),
    fontsReady().then(() => load.step('fonts'))
  ]);
  if (!mod) { clearTimeout(guard); load.fail(); return; }
  const images = Object.fromEntries(imgs);
  // a picture that failed to load: the sleeve is drawn like a sealed one, so the crate never has a hole
  // the hype sticker is printed in this site's language, like everything else on the sleeve
  const soon = T(lang).ui.comingSoon;
  const records = RECORDS.map((r) => ({ ...r, soon, ...(r.art && !images[r.id] ? { sealed: true } : {}) }));
  renderTicks();
  renderPages();
  // the back of each sleeve is printed once, in this site's language, like the credits on a real record
  const credits = Object.fromEntries(RECORDS.map((r) => {
    const c = COPY[lang].records[r.id];
    // a record still in its shrink-wrap keeps its words to itself until the site is out
    if (r.sealed) return [r.id, { sub: c.subtitle, story: '', role: '', tech: '', year: '', status: '' }];
    return [r.id, { sub: c.subtitle, story: c.story[0], role: c.details.role, tech: c.details.tech, year: c.details.year || '—', status: c.details.status }];
  }));
  renderFlyer();
  // the flyer's print, in both languages, so a language switch only swaps a texture
  const flyerPrint = Object.fromEntries(Object.keys(COPY).map((l) => {
    const t = COPY[l];
    const P = t.pricing;
    return [l, { eyebrow: t.ui.flyer.eyebrow, title: t.ui.flyer.title, more: t.ui.flyer.more, year: '2026',
      labels: { plan: P.label.plan, care: P.care.name, timeline: P.label.timeline, example: P.label.example },
      // a flyer has room for one line a package: the first thing each one includes is what it is, in a few words
      rows: PLAN_ORDER.map((id) => ({ name: P.plans[id].name, for: P.plans[id].includes[0], price: P.plans[id].price, timeline: P.plans[id].timeline, example: P.plans[id].example })),
      // and one line for care too: the first sentence of its description, what the care is (the second is how
      // the scope gets agreed, which belongs on the pricing page, not squeezed under a price)
      care: { name: P.care.name, price: P.care.price, for: P.care.description.split(/(?<=\.)\s/)[0] } }];
  }));
  stage = await mod.createStage({ canvas: $('#gl'), records, images, credits, flyerPrint, onFrame, onState, onCue, onFlyer: () => toPricing(), onStep: (n) => load.step(n) });
  clearTimeout(guard);
  if (!stage) { load.fail(); return; }
  stage.setFlyerLang(lang);
  document.documentElement.classList.add('has-3d');
  await warmPages();
  await load.step('pages');
  $('#ticks').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tick]');
    if (!b) return;
    if (b.dataset.tick === 'flyer') { if (stage.mode === 'stack') stage.setFocus(stage.flyerFocus); else stage.close(); return; }
    const i = Number(b.dataset.tick);
    const id = stage.items[i];
    if (stage.mode === 'stack') { if (stage.focus === i) stage.open(id); else stage.setFocus(i); }
    else if (stage.mode === 'open' && stage.active !== id) stage.goTo(i);
  });
  $('#back').addEventListener('click', () => stage.close());
  // the label's mark: a record in hand goes back in the crate, the price sheet folds away, the crate returns to the first record
  $('#home').addEventListener('click', () => {
    if (stage.mode === 'open' || stage.mode === 'opening') stage.close(0);
    else stage.setFocus(0);
  });
  // ?open=kern opens that record straight away; ?at=flyer starts at the open price flyer
  const qs = new URLSearchParams(location.search);
  const want = qs.get('open');
  const wi = RECORDS.findIndex((r) => r.id === want);
  if (wi >= 0) { stage.setFocus(wi); setTimeout(() => stage.open(want), 700); }
  else if (qs.get('at') === 'flyer') stage.setFocus(stage.flyerFocus);
  $('#flyer').addEventListener('click', (e) => { e.preventDefault(); toPricing(); });
  // up to speed, then the platter flies into the corner and becomes the mark: the wait and the shop are one shot
  await load.finish();
  window.__disc = {
    stage,
    open: (id) => stage.open(id), close: () => stage.close(), focus: (i) => stage.setFocus(i), flip: () => stage.flip(),
    preview: openPreview, lang: () => lang, switchLang,
    get settled() { return stage.settled; }
  };
}

boot();
