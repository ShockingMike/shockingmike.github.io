/* lang.js — the English / Vietnamese choice, shared by the portfolio and the pricing page. */
import { COPY, LANGS } from './copy.js';

const KEY = 'smr-lang';

export function getLang() {
  // ?lang=vi|en in the address wins (handy for sharing a link in one language); then the saved choice
  const q = new URLSearchParams(location.search).get('lang');
  if (LANGS.includes(q)) { try { localStorage.setItem(KEY, q); } catch { /* storage blocked */ } return q; }
  let v = null;
  try { v = localStorage.getItem(KEY); } catch { v = null; }
  if (LANGS.includes(v)) return v;
  const nav = (navigator.language || '').toLowerCase();
  return nav.startsWith('vi') ? 'vi' : 'en';
}

export function setLang(l) {
  if (!LANGS.includes(l)) return;
  try { localStorage.setItem(KEY, l); } catch { /* private mode: the choice lasts this visit only */ }
  applyDocLang(l);
}

export function applyDocLang(l) {
  document.documentElement.lang = l;
}

export const T = (l) => COPY[l] || COPY.en;
export const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in map ? map[k] : `{${k}}`));
