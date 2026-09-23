/* order.js — packages, money, the preliminary estimate and the e-mail. No DOM, no drawing.
   Words: copy.js (pricing.*, from docs/content/pricing-serious*.md). Money: VND on the Vietnamese page,
   USD on the English page (ranges from docs/superpowers/specs/2026-09-21-work-with-mike-design.md, section 3). */

import { COPY } from './copy.js';

export const PLAN_ORDER = ['standard', 'advanced', 'custom'];
export const PACKAGES = {
  standard: { id: 'standard', vnd: [12e6, 20e6], usd: [1500, 2500], exampleUrl: 'https://shockingmike.github.io/kern-society/', theme: { bg: '#e8e4da', fg: '#161616' } },
  advanced: { id: 'advanced', vnd: [40e6, null], usd: [5000, null], exampleUrl: 'https://shockingmike.github.io/rhumb-line/', theme: { bg: '#1e2a35', fg: '#ecdcbc' } },
  custom: { id: 'custom', vnd: [80e6, null], usd: [10000, null], exampleUrl: 'https://shockingmike.github.io/chom/', theme: { bg: '#e6d3c8', fg: '#3a2030' } },
  care: { id: 'care', vnd: [2e6, 4e6], usd: [300, 600], max: 12, theme: { bg: '#b6ade0', fg: '#29213f' } }
};
export const EMAIL = 'shockingmikedesign@gmail.com';

const P = (lang) => (COPY[lang] || COPY.en).pricing;

/* ---------- money: "12.000.000–20.000.000 đ" · "$1,500–$2,500" ---------- */
function money(lang, n) {
  if (lang === 'vi') return n.toLocaleString('de-DE');           // dots between thousands
  return `$${n.toLocaleString('en-US')}`;
}
export function rangeText(lang, lo, hi) {
  const E = P(lang).estimate;
  const unit = lang === 'vi' ? ' đ' : '';
  if (hi == null) return `${E.totalFrom} ${money(lang, lo)}${unit}`;
  return `${money(lang, lo)}–${money(lang, hi)}${unit}`;
}
const band = (lang, pk) => (lang === 'vi' ? pk.vnd : pk.usd);
export function careAmount(lang, months) {
  const [lo, hi] = band(lang, PACKAGES.care);
  return rangeText(lang, lo * months, hi * months);
}
/** Whole request as a range: low ends added, high ends added; "From" if any part has no ceiling. */
export function total(lang, state) {
  const r = state.plan ? PACKAGES[state.plan] : null;
  if (!r) return null;
  const m = state.months;
  const [clo, chi] = band(lang, PACKAGES.care);
  const [rlo, rhi] = band(lang, r);
  const lo = rlo + clo * m;
  const hi = rhi == null ? null : rhi + chi * m;
  return { lo, hi, text: rangeText(lang, lo, hi) };
}

/* ---------- the request ---------- */
export function createOrder() {
  const state = { plan: null, months: 0, copy: false, fields: { brand: '', site: '', deadline: '', budget: '' }, estimate: null };
  return {
    state,
    setPlan(id) { state.plan = PLAN_ORDER.includes(id) ? id : null; },
    setMonths(n) { state.months = Math.max(0, Math.min(PACKAGES.care.max, n)); },
    setCopy(on) { state.copy = !!on; },
    setField(key, v) { if (key in state.fields) state.fields[key] = String(v).slice(0, 80); },
    /** returns null when the estimate can be made, or which field is missing */
    missing() { if (!state.plan) return 'plan'; if (!state.fields.brand.trim()) return 'brand'; return null; },
    make(lang, now = new Date()) {
      if (this.missing()) return null;
      state.estimate = buildEstimate(lang, state, now);
      return state.estimate;
    }
  };
}

/* ---------- the printed estimate ---------- */
export const COLS = 32;
const pad2 = (n) => String(n).padStart(2, '0');
function dateText(lang, d) {
  if (lang === 'vi') return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function buildEstimate(lang, state, date) {
  const X = P(lang);
  const E = X.estimate;
  const f = state.fields;
  const v = (s) => (s && s.trim()) || E.empty;
  const rows = [];
  rows.push({ t: 'center', s: 'SHOCKING MIKE', cls: 'r-shop' });
  rows.push({ t: 'ctext', s: E.from, cls: 'r-sub' });
  rows.push({ t: 'gap' });
  rows.push({ t: 'center', s: E.title, cls: 'r-title' });
  rows.push({ t: 'rule', ch: '-' });
  rows.push({ t: 'text', s: `${E.date}: ${dateText(lang, date)}`, cls: 'r-meta' });
  rows.push({ t: 'text', s: `${E.client}: ${v(f.brand)}`, cls: 'r-meta' });
  rows.push({ t: 'text', s: `${E.site}: ${v(f.site)}`, cls: 'r-meta' });
  rows.push({ t: 'text', s: `${E.deadline}: ${v(f.deadline)}`, cls: 'r-meta' });
  rows.push({ t: 'text', s: `${E.budget}: ${v(f.budget)}`, cls: 'r-meta' });
  rows.push({ t: 'rule', ch: '-' });
  const pk = PACKAGES[state.plan];
  rows.push({ t: 'text', s: E.item[state.plan], cls: 'r-item' });
  rows.push({ t: 'lr', l: `  ${X.plans[state.plan].timeline}`, r: rangeText(lang, ...band(lang, pk)), cls: 'r-amount' });
  if (state.months > 0) {
    rows.push({ t: 'text', s: E.item.care.replace('{n}', state.months), cls: 'r-item' });
    rows.push({ t: 'lr', l: `  ${state.months} ${X.form.careUnit}`, r: careAmount(lang, state.months), cls: 'r-amount' });
  }
  if (state.copy) {
    rows.push({ t: 'text', s: E.item.copywriting, cls: 'r-item' });
    rows.push({ t: 'lr', l: '', r: E.item.copywritingAmount, cls: 'r-amount' });
  }
  rows.push({ t: 'rule', ch: '=' });
  rows.push({ t: 'text', s: E.total, cls: 'r-total' });
  rows.push({ t: 'right', s: total(lang, state).text, cls: 'r-total' });
  if (state.copy) rows.push({ t: 'text', s: E.excludes, cls: 'r-meta' });
  rows.push({ t: 'rule', ch: '=' });
  rows.push({ t: 'text', s: E.note, cls: 'r-note' });
  rows.push({ t: 'rule', ch: '-' });
  rows.push({ t: 'text', s: E.termsTitle, cls: 'r-thead' });
  for (const s of E.terms) rows.push({ t: 'text', s: `· ${s}`, cls: 'r-terms' });
  rows.push({ t: 'rule', ch: '-', cls: 'r-rule' });
  rows.push({ t: 'text', s: `${E.contactLabel}: ${E.contact}`, cls: 'r-meta' });
  return {
    lang, rows,
    lines: rowsToLines(rows, COLS),
    planName: X.plans[state.plan].name,
    brand: f.brand.trim(),
    total: total(lang, state).text
  };
}

function wrap(s, cols) {
  const lead = (s.match(/^\s*/) || [''])[0];
  const hang = s.startsWith('· ') ? '  ' : lead;
  const words = s.trim().split(/\s+/);
  const out = [];
  let line = lead;
  for (const w of words) {
    const cand = line.trim() ? `${line} ${w}` : `${line}${w}`;
    if (cand.length > cols && line.trim()) { out.push(line); line = `${hang}${w}`; } else line = cand;
  }
  if (line.trim()) out.push(line);
  return out;
}
const centre = (s, cols) => (s.length >= cols ? s : s.padStart(Math.floor((cols + s.length) / 2))).replace(/\s+$/, '');

export function rowsToLines(rows, cols) {
  const out = [];
  for (const r of rows) {
    if (r.t === 'center') out.push({ s: centre(r.s, cols), cls: r.cls });
    else if (r.t === 'ctext') for (const s of wrap(r.s, cols)) out.push({ s: centre(s, cols), cls: r.cls });
    else if (r.t === 'right') out.push({ s: r.s.padStart(cols), cls: r.cls });
    else if (r.t === 'lr') {
      const gap = cols - r.l.length - r.r.length;
      if (gap >= 2) out.push({ s: r.l + ' '.repeat(gap) + r.r, cls: r.cls });
      else { if (r.l.trim()) out.push({ s: r.l, cls: r.cls }); out.push({ s: r.r.padStart(cols), cls: r.cls }); }
    } else if (r.t === 'text') for (const s of wrap(r.s, cols)) out.push({ s, cls: r.cls });
    else if (r.t === 'rule') out.push({ s: r.ch.repeat(cols), cls: 'r-rule' });
    else if (r.t === 'gap') out.push({ s: '', cls: 'r-gap' });
  }
  return out;
}

export function estimateText(e) { return e.lines.map((l) => l.s).join('\r\n'); }

/** The e-mail, from the copy template (mail.*). Line breaks become %0D%0A. */
export function mailtoHref(e) {
  const M = P(e.lang).mail;
  const subject = M.subject.replace('{plan}', e.planName).replace('{brand}', e.brand);
  const body = M.body.map((line) => line.replace('{estimate}', estimateText(e)).replace('{brand}', e.brand)).join('\r\n');
  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
export function askHref(lang) {
  const C = P(lang).contact;
  return `mailto:${EMAIL}?subject=${encodeURIComponent(C.mailSubject)}&body=${encodeURIComponent(C.mailBody.join('\r\n'))}`;
}
