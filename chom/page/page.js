// Chớm page layer (contract 2026-09-17, section 4b): waiting screen, language chooser, the words laid over the
// scene, the atelier, blend-your-own, the demo order form, the sampler, the footer, and the reading version when
// there is no WebGL. The core calls mountPage(api) once; see ADAPTER below for what the page expects from it.
//
// Rules this file keeps (CLAUDE.md, docs/content/chom-text-layout.md):
//   * words stand still: they only fade in and out where they are, on solid painted paper
//   * one scroll step = one screen; the previous step's words are gone before the next step's appear
//   * nothing is measured or written per frame; the DOM changes only when a step, a season or an input changes
//   * forms are demos: nothing is sent anywhere
import { COPY } from './copy.js';
// the painted wordmark and the four season words (brand/chom/logo, built into logo.js by tools/build-logo.mjs):
// the whole bar and every season title is drawn from these, so they are part of the page, not a later fetch
import { LOGO, LOGO_ORDER, LOGO_SMALL, LOGO_SMALL_ORDER } from './logo.js';
import { ownIds } from './own-ids.js';
import { SEASONS, PAINT, EQUAL, STEP, blendName, shares, isEqual } from './blend.js';
import { loadBrushes, installEdgeMasks, fitCanvas, drawBottle, drawBand, drawAtelierSteps, drawCrate, drawSampler, drawSwatch } from './paint.js';
import { createLoader } from './loader.js';

export { COPY };
if (typeof window !== 'undefined') window.CHOM_COPY = COPY;

const VI_WORDS = new Set(['nav.xuan', 'nav.ha', 'nav.thu', 'nav.dong', 'brand.wordmark',
  ...SEASONS.map((s) => `season.${s}.name`)]);
const EN_ALWAYS = new Set(['footer.byline']);
const RICH = /(Alstonia scholaris|Aquilaria)/;
const NIGHT = new Set(['thu', 'dong']);
const SEASON_CAPS = { xuan: 'XUÂN', ha: 'HẠ', thu: 'THU', dong: 'ĐÔNG' };
const SEASON_NAME = { xuan: 'Xuân', ha: 'Hạ', thu: 'Thu', dong: 'Đông' };
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap';

// ---------------------------------------------------------------------------
// ADAPTER. The core's exact names are not fixed yet; the page accepts any of these shapes.
//   api.onProgress(fn) | api.on('progress', fn)    fn(p 0..1), the real load, only rising
//   api.onReady(fn)                                 the first season can be shown
//   api.onError(fn)                                 no WebGL / load failed: the page becomes a reading document
//   api.onSeason(fn)                                fn({ index, id, u, intro }) index -1 (or intro) = the opening stretch
//   api.onFocus(fn)                                 fn(open, seasonId): a bottle's notes are open (scroll is locked)
//   api.onPointer(fn)                               optional: the visitor moved the wind over the scene
//   api.setLanguage(lang)                           the notes inside the scene switch language
//   api.tail                                        element after the scroll room; the page puts its end part there
//   api.scrollToSeason(i, { cut: true })            i = 0 … 3: a cut to the season's still stretch (a promise);
//                                                   the top is a cut to spring, then a scroll to 0 (the camera waits there)
//   api.enter()                                     optional: the visitor has stepped in
//   api.webgl === false                             optional: known up front that there is no 3D
// ---------------------------------------------------------------------------
function adapt(api) {
  const on = (name, fn) => {
    const cap = `on${name[0].toUpperCase()}${name.slice(1)}`;
    try {
      if (typeof api[cap] === 'function') return api[cap](fn);
      if (typeof api.on === 'function') return api.on(name, fn);
      if (api.events && typeof api.events.addEventListener === 'function') return api.events.addEventListener(name, (e) => fn(e.detail));
    } catch (e) { console.warn('[page] could not listen to', name, e); }
    return null;
  };
  const call = (name, ...args) => { try { return typeof api[name] === 'function' ? api[name](...args) : undefined; } catch (e) { console.warn('[page]', name, e); return undefined; } };
  return {
    on,
    setLanguage: (l) => call('setLanguage', l),
    scrollToSeason: typeof api.scrollToSeason === 'function' ? (i, opt) => call('scrollToSeason', i, opt) : null,
    enter: () => call('enter'),
    tail: api.tail || api.tailSlot || null,
    webgl: api.webgl !== false,
  };
}

// ---------------------------------------------------------------------------
// tiny DOM helper
// ---------------------------------------------------------------------------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(tag === 'svg' || tag === 'path' ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}

// (The handwritten notes on paper tags, each with a pen line to what it talked about, are gone: the four season
// asides and then the atelier's "tháng Sáu, dậy sớm theo sen" — Mike, 21/9, "bỏ luôn". With them went the tag and
// the pen line; nothing on the page is a margin note any more.)

export function mountPage(rawApi = {}) {
  if (window.__chomPage) return window.__chomPage;
  const api = adapt(rawApi);
  const root = document.documentElement;
  root.classList.add('pg', 'is-loading');

  // fonts (both draw Vietnamese marks correctly; Cormorant is not used)
  if (!document.querySelector('link[data-pg-fonts]')) {
    for (const href of ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']) {
      document.head.append(h('link', { rel: 'preconnect', href, crossorigin: href.includes('gstatic') ? '' : null }));
    }
    document.head.append(h('link', { rel: 'stylesheet', href: FONT_CSS, 'data-pg-fonts': '' }));
  }

  // How the bar sits on the scene. Mike chose "bare" (2026-09-18): the whole bar straight on the scene over a very
  // light wash. The other two are kept for trying things out: ?nav=paper (every part on painted paper) or ?nav=logo
  // (only the name on the scene).
  const NAV_MODES = ['paper', 'logo', 'bare'];
  let navMode = 'bare';
  try {
    const q = new URLSearchParams(location.search).get('nav');
    if (NAV_MODES.includes(q)) navMode = q;
  } catch { /* ignore */ }
  // Two shapes for the big titles, while Mike chooses (?head=left | center):
  //   left    the word at the left of the sheet, a short brush rule under it
  //   center  the word in the middle of the sheet, the rule drawn right across
  const HEAD_MODES = ['left', 'center'];
  let headMode = 'left';
  try {
    const q = new URLSearchParams(location.search).get('head');
    if (HEAD_MODES.includes(q)) headMode = q;
  } catch { /* ignore */ }
  root.dataset.nav = navMode;
  root.dataset.head = headMode;

  // ---- what the page knows about itself -----------------------------------
  // The page is in Vietnamese only (Mike, 2026-09-18). The English copy is kept in the repository as a spare.
  const state = {
    lang: 'vi',
    values: { ...EQUAL },
    touched: false,
    entered: false,
    built: false,
    no3d: !api.webgl,
    season: { index: -1, u: 0 },
    step: null,
    focusOpen: false,
    tailIn: false,
    menuOpen: false,
    touch: !matchMedia('(hover: hover) and (pointer: fine)').matches,
  };

  const bound = [];   // [el, key, how, vars?]
  // A key with no words is a fault, never a quiet empty element. Winter's second step carried a sheet of paper with
  // nothing on it for a day, because its words had been cut from the copy and this lookup handed back '' without a
  // sound; the empty blend paragraph lived the same way. So a missing key is reported, loud, once: page-check and
  // every other check under page/qa fail on a console error. Where words are optional on purpose, ask has() first.
  const has = (key) => typeof COPY.vi[key] === 'string' && COPY.vi[key] !== '';
  const missing = new Set();
  const t = (key, vars) => {
    if (!has(key) && !missing.has(key)) {
      missing.add(key);
      console.error(`[chom page] no words for "${key}" in copy.js: this element would be built empty`);
    }
    let s = COPY.vi[key] ?? '';
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    return s;
  };
  const put = (el, key, how) => {
    if (how === 'text') {
      const s = t(key);
      if (RICH.test(s)) {
        el.textContent = '';
        for (const part of s.split(RICH)) el.append(RICH.test(part) ? h('i', {}, part) : part);
      } else el.textContent = s;
      if (VI_WORDS.has(key)) el.lang = 'vi';
      else if (EN_ALWAYS.has(key)) el.lang = 'en';
    } else el.setAttribute(how, t(key));
  };
  const T = (el, key, how = 'text') => { bound.push([el, key, how]); put(el, key, how); return el; };
  const tx = (tag, key, attrs = {}) => T(h(tag, attrs), key);

  // ---- loader -----------------------------------------------------------------
  const loader = createLoader({
    copy: COPY.vi,
    onEnter: () => enter(),
    beforeEnter: () => build(),
    // Where the waiting screen's name is going, and what colour the ink is when it gets there. The opening room's
    // own name is held invisible until then — its space is kept, so nothing in the layout moves (Mike's three
    // groups stay exactly where he approved them).
    nameTarget: () => {
      const art = over.querySelector('.pg-lead .pg-logo__art');
      if (!art) return null;
      const rect = art.getBoundingClientRect();
      if (!(rect.width > 8)) return null;
      const cs = getComputedStyle(art);
      // Colours go across as the strings CSS itself uses. They used to go as [r, g, b] arrays, which turn into
      // "255,243,220" when written back into a custom property — not a colour, so the browser dropped it and the
      // ink never turned. The name travelled dark the whole way and only went ivory at the swap, which is the very
      // pop this move exists to remove. It did not show up in any number; it showed up in the pictures.
      const ink = (n, d) => ((cs.getPropertyValue(n) || '').trim() || d);
      art.style.visibility = 'hidden';
      // The opening words wait for the name to go by. Its way home lies across them: on a phone the waiting screen's
      // name stands right on the first paragraph, and on a computer it crosses it on the way up (page/qa/fly-ink.mjs:
      // letters on the words in 26 frames on a computer, 76 on a phone). So they come in once it has landed.
      const lead = art.closest('.pg-lead');
      if (lead) lead.classList.add('pg-lead--wait');
      // the small name in the bar waits too, so that while one name is crossing the screen it is the only one
      const barMark = nav.querySelector('.pg-brand');
      if (barMark) barMark.style.opacity = '0';
      return {
        rect, ink: [ink('--pg-logo-ink', '#211A17'), ink('--pg-logo-accent', '#C2185B')],
        show: () => {
          art.style.visibility = '';
          if (lead) lead.classList.remove('pg-lead--wait');
          if (barMark) { barMark.style.transition = 'opacity .5s ease'; barMark.style.opacity = ''; }
        },
      };
    },
  });
  document.body.prepend(loader.el);
  loader.mounted();

  // ---- the epigraph: two lines of a real poem, who wrote it, and (in English) what it says -----------------------
  // Seven places carry one: the opening room, the four season cards, the blending, and the foot of the page. The two
  // lines break where the poem breaks, never where the window happens to end, so each line is kept on one line and
  // the type is stepped down until it fits. No frame: the poem is told apart by its rhythm and the air round it.
  const EPI_SPLIT = /\s*(?:\s\/\s|\|)\s*/;
  // stand-in verses, only for trying the shape out with ?epi=demo before the real ones arrive. Spring and autumn
  // are one line, as Mike chose, so both shapes get looked at.
  const EPI_DEMO = {
    'season.xuan': ['Hoa \u0111\u00e0o n\u0103m ngo\u00e1i c\u00f2n c\u01b0\u1eddi gi\u00f3 \u0111\u00f4ng', '\u2014 Nguy\u1ec5n Du \u00b7 Truy\u1ec7n Ki\u1ec1u', 'Last year\u2019s peach blossom still laughs at the east wind.'],
    'season.thu': ['Ng\u00f5 t\u1ed1i \u0111\u00eam s\u00e2u \u0111\u00f3m l\u1eadp lo\u00e8', '\u2014 Nguy\u1ec5n Khuy\u1ebfn', 'In the dark lane, deep in the night, fireflies blink.'],
    _: ['C\u1ecf non xanh t\u1eadn ch\u00e2n tr\u1eddi | C\u00e0nh l\u00ea tr\u1eafng \u0111i\u1ec3m m\u1ed9t v\u00e0i b\u00f4ng hoa', '\u2014 Nguy\u1ec5n Du \u00b7 Truy\u1ec7n Ki\u1ec1u', 'Young grass green to the sky\u2019s edge; a pear branch pricked with a few white flowers.'],
  };
  let epiDemo = false;
  try { epiDemo = new URLSearchParams(location.search).get('epi') === 'demo'; } catch { /* ignore */ }
  const EPI_PART = { epigraph: 0, epigraphBy: 1, epigraphGloss: 2 };
  const epiText = (key) => {
    if (has(key) || !epiDemo) return t(key);
    const bits = key.split('.');
    const part = EPI_PART[bits.pop()] ?? 0;
    return (EPI_DEMO[bits.join('.')] || EPI_DEMO._)[part] || '';
  };
  const epigraphs = [];
  const epigraph = (block, extra = '') => {
    const el = h('div', { class: `pg-epi ${extra}`.trim() });
    const lines = h('p', { class: 'pg-epi__lines', lang: 'vi' });
    const by = h('p', { class: 'pg-epi__by' });
    const gloss = h('p', { class: 'pg-epi__gloss', lang: 'en' });
    el.append(lines, by, gloss);
    const fill = () => {
      const poem = epiText(`${block}.epigraph`);
      const who = epiText(`${block}.epigraphBy`);
      const gl = '';   // the plain-English line belongs to the English page, which is gone
      el.hidden = !poem;
      lines.replaceChildren(...poem.split(EPI_SPLIT).filter(Boolean).map((line) => h('span', { class: 'pg-epi__line' }, line)));
      by.textContent = who;
      by.hidden = !who;
      gloss.textContent = gl;
      gloss.hidden = !gl;
      el.style.removeProperty('--epi-fit');
    };
    epigraphs.push({ el, lines, fill });
    fill();
    bound.push([el, `${block}.epigraph`, { epigraph: fill }]);
    return el;
  };
  // Each line of verse wants to stay one line. The width is worked out with the type itself (measureText), not by
  // putting the line on the page and seeing how far it sticks out: a line that sticks out makes a phone lay the
  // whole page out wider than its screen, and then every measurement after it is wrong. So the lines wrap until the
  // size is settled, and only then are they told to stay on one line.
  const ruler = document.createElement('canvas').getContext('2d');
  const fitEpigraphs = () => {
    for (const e of epigraphs) {
      if (e.el.hidden) continue;
      e.lines.classList.remove('is-fit');
      e.el.style.setProperty('--epi-fit', '1');
      // the screen's own width is the one measurement a phone cannot inflate: if a line has already made the page
      // lay out wider than the screen, innerWidth is wrong, and only screen.width still tells the truth
      const hard = (window.screen && window.screen.width) || window.innerWidth;
      // the block's own width is the room the verse has (it wraps until it is fitted, so this is the true width);
      // the screen's width is the backstop in case something has already pushed the layout wider
      const room = Math.min(
        e.lines.clientWidth || e.el.clientWidth || 9999,
        window.innerWidth - 24,
        hard - 24,
      );
      const cs = getComputedStyle(e.lines);
      const size = parseFloat(cs.fontSize) || 20;
      ruler.font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
      const widest = Math.max(1, ...[...e.lines.children].map((c) => ruler.measureText(c.textContent).width));
      if (!room || room < 40) continue;
      let fit = Math.max(0.55, Math.min(1, (room / widest) * 0.94));
      e.el.style.setProperty('--epi-fit', fit.toFixed(3));
      e.lines.classList.add('is-fit');
      // the ruler works from the type's own metrics, which is close but not exact (the web font may not be in the
      // canvas yet): now that the line is on the page at a size that nearly fits, step it down until it really does
      for (let i = 0; i < 12; i++) {
        const drawn = Math.max(0, ...[...e.lines.children].map((c) => c.scrollWidth));
        if (drawn <= room || fit <= 0.55) break;
        fit = Math.max(0.55, fit - 0.04);
        e.el.style.setProperty('--epi-fit', fit.toFixed(3));
      }
      // it only keeps to one line if it really fits; otherwise it wraps, which is a pity but honest
      if (Math.max(0, ...[...e.lines.children].map((c) => c.scrollWidth)) > room) e.lines.classList.remove('is-fit');
    }
  };
  // the web fonts land after the first measure: measure again once they are in
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitEpigraphs()).catch(() => { /* ignore */ });

  // ---- skip link + nav ------------------------------------------------------------
  const skip = tx('a', 'a11y.skip', { class: 'pg-skip', href: '#blend' });
  // the painted name and the four painted season words (brand/chom/logo, built into logo.js). They are written into
  // the page rather than linked, because their two colours come from CSS and an <img> would not let them through.
  // Every copy gets ids of its own (own-ids.js): the same drawing stands in several places at once.
  const art = (markup, fallback) => {
    if (!markup) return document.createTextNode(fallback || '');
    const t = document.createElement('template');
    t.innerHTML = markup;
    return ownIds(t.content.firstElementChild);
  };
  // The bar uses the set drawn for small sizes (LOGO_SMALL: the name's strokes hold up at 26 px; the season words are
  // the same drawings). Its ink edge is the same as the large set's, so the margins measured for it still hold.
  const brandMark = h('span', { class: 'pg-brand__mark', 'data-logo-slot': '' }, art(LOGO_SMALL.wordmark, t('brand.wordmark')));
  // one thread of scent rising from the tone mark, where the drawing says it starts (data-wisp). It is three hairs
  // of colour on their own layer: nothing else on the page moves for it.
  const wisp = h('span', { class: 'pg-wisp', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  brandMark.append(wisp, h('span', { class: 'pg-sr' }, t('brand.wordmark')));
  const placeWisp = () => {
    const svg = brandMark.querySelector('svg');
    if (!svg) { wisp.hidden = true; return; }
    const vb = (svg.getAttribute('viewBox') || '0 0 450 178').split(/\s+/).map(Number);
    const at = (svg.getAttribute('data-wisp') || '').split(',').map(Number);
    if (!(at.length === 2) || !Number.isFinite(at[0]) || !vb[2]) { wisp.hidden = true; return; }
    wisp.style.left = `${((at[0] - vb[0]) / vb[2]) * 100}%`;
    wisp.style.top = `${((at[1] - vb[1]) / vb[3]) * 100}%`;
  };
  // the name stands alone: no small line beside it anywhere (Mike, 2026-09-18). The atelier and the opening words
  // say what Chớm is.
  // the season the scene is standing in, beside the name: "Chớm Xuân". It belongs to the picture, not to the
  // reading: the link keeps its own label, so a screen reader hears "Chớm" once and scrolling never repeats a word.
  const brandSeason = h('span', { class: 'pg-brand__season', 'aria-hidden': 'true', 'data-logo-slot': 'season' });
  // all four are drawn once and kept: changing season only shows another one, so nothing is parsed while scrolling
  const brandWords = {};
  for (const s2 of SEASONS) {
    const el = art(LOGO_SMALL[s2], SEASON_NAME[s2]);
    if (el.classList) el.classList.add('pg-brand__word', 'is-off');
    brandSeason.append(el);
    brandWords[s2] = el;
  }
  const brand = h('a', { class: 'pg-brand pg-tag pg-paint', href: '#pg-top' }, brandMark, brandSeason);
  T(brand, 'nav.logoAria', 'aria-label');

  const seasonLinks = SEASONS.map((s, i) => {
    const a = h('a', { class: 'pg-nav__season', href: `#pg-s-${s}`, 'data-season': s, 'data-i': String(i) },
      tx('span', `nav.${s}`, { class: 'pg-nav__name' }),
      tx('span', `nav.${s}Sub`, { class: 'pg-nav__sub' }));
    T(a, `nav.${s}Aria`, 'aria-label');
    return a;
  });
  const atelierLink = tx('a', 'nav.atelier', { class: 'pg-nav__link', href: '#atelier' });
  const blendLink = h('a', { class: 'pg-btn pg-btn--small pg-paint pg-nav__blend', href: '#blend' }, tx('span', 'nav.blend'));
  const menuBtn = h('button', { type: 'button', class: 'pg-nav__menu', 'aria-expanded': 'false', 'aria-controls': 'pg-menu' });
  T(menuBtn, 'nav.menuOpen');

  const nav = h('nav', { class: 'pg-nav', id: 'pg-nav' },
    brand,
    h('ul', { class: 'pg-nav__seasons pg-tag pg-paint', role: 'list' }, seasonLinks.map((a) => h('li', {}, a))),
    h('div', { class: 'pg-nav__end pg-tag pg-paint' }, atelierLink, blendLink, menuBtn));
  T(nav, 'nav.label', 'aria-label');

  // phone menu
  const menuClose = h('button', { type: 'button', class: 'pg-menu__close' });
  T(menuClose, 'nav.menuClose');
  const menuSeasons = SEASONS.map((s, i) => {
    const a = h('a', { class: 'pg-menu__season', href: `#pg-s-${s}`, 'data-season': s, 'data-i': String(i) },
      tx('span', `nav.${s}`, { class: 'pg-menu__name' }), tx('span', `nav.${s}Sub`, { class: 'pg-menu__sub' }));
    return a;
  });
  const menuMark = h('span', { class: 'pg-menu__mark', 'aria-hidden': 'true' });
  T(menuMark, 'brand.wordmark');
  const menu = h('div', { class: 'pg-menu', id: 'pg-menu', role: 'dialog', 'aria-modal': 'true', hidden: true },
    h('div', { class: 'pg-menu__top' }, menuMark, menuClose),
    h('ul', { class: 'pg-menu__list', role: 'list' },
      menuSeasons.map((a) => h('li', {}, a)),
      h('li', {}, tx('a', 'nav.atelier', { class: 'pg-menu__link', href: '#atelier' })),
      h('li', {}, tx('a', 'nav.blend', { class: 'pg-menu__link pg-menu__link--blend', href: '#blend' }))));
  T(menu, 'nav.label', 'aria-label');

  document.body.prepend(skip);
  loader.el.after(nav, menu);

  // ---- words over the scene ------------------------------------------------------------
  // docs/content/chom-text-layout.md: hero, open and xuan-1 sit on spring at rest; each later season opens with a
  // step at rest (its card), then a step while the camera pushes in (place + memory), then a short label before
  // the painting peels away. No words while it peels.
  const over = h('div', { class: 'pg-over', id: 'pg-over' });
  const steps = new Map();
  const step = (id, tone, ...kids) => {
    const base = id.replace(/-\d$/, '');
    const el = h('section', { class: `pg-step pg-step--${base} pg-step--${id}`, 'data-step': id, 'data-tone': tone }, kids);
    steps.set(id, el);
    over.append(el);
    return el;
  };
  // the words printed on the bottle in the scene ("Chớm" + the season in capitals): kept in the page, at the bottle,
  // without colour, so they are counted where they are seen (layout rule 12)
  const engraved = (s) => h('p', { class: `pg-engraved pg-3d-only pg-engraved--${s}`, lang: 'vi', 'data-season': s },
    h('span', { 'data-engraved-3d': '1' }, 'Chớm'), ' ', h('span', { 'data-engraved-3d': '1' }, SEASON_CAPS[s]));

  // the scene, for screen readers: one image whose description follows the season on screen
  const scene = h('div', { class: 'pg-scene pg-3d-only', role: 'img' });
  const seasonLive = h('p', { class: 'pg-sr', 'aria-live': 'polite', 'data-decor': '' });
  over.append(scene, seasonLive);
  const sceneLabel = () => {
    const id = state.tailIn ? 'atelier' : (SEASONS[Math.max(0, state.season.index)] || 'xuan');
    scene.setAttribute('aria-label', `${t('a11y.sceneRegion')}. ${t(`a11y.scene.${id}`)}`);
    scene.setAttribute('aria-description', t('a11y.peel'));
  };

  // hero
  // The opening room carries two things and nothing else (Mike, 2026-09-21): the name, and one short piece of
  // writing that says what Chớm is. Everything that used to stand between them is gone from this screen — the
  // headline, the line about where the scents come from, and the couplet before it. Four blocks at nearly one
  // weight had no order to them; two tiers do, and the empty wall between them is there to let the writing
  // breathe, not to be filled.
  // The paragraph's words are `hero.intro` (up to 60 syllables on a computer, 45 on a phone). Until they land, the
  // page's own description stands in: it is the same voice and already says what the shop is.
  // the invitation's words sit in a span of their own, so they can wait for their paper like every other sheet's
  const cueWords = h('span', {});
  const cue = h('p', { class: 'pg-cue pg-paint pg-3d-only' }, cueWords);
  // one piece of writing, or two short ones if it runs long: `hero.intro` and, when there is one, `hero.intro2`
  const heroIntro = h('p', { class: 'pg-hero__intro' });
  T(heroIntro, has('hero.intro') ? 'hero.intro' : 'meta.description');
  const heroIntro2 = has('hero.intro2') ? tx('p', 'hero.intro2', { class: 'pg-hero__intro pg-hero__intro--2' }) : null;
  const heroMark = art(LOGO.wordmark, '');
  if (heroMark.setAttribute) heroMark.setAttribute('aria-hidden', 'true');
  step('hero', 'day',
    tx('p', 'fallback.notice', { class: 'pg-notice pg-paint pg-no3d-only' }),
    h('div', { class: 'pg-panel pg-paint pg-lead' },
      // The name is the screen's heading and its picture at once. Its letters are a painting, so the heading has no
      // words of its own to be read on screen — data-entry says that the eye does stop here, the way it says so for
      // the painting coming apart at the end of each season (tools/qa/check-reading.mjs). The letters stay in the
      // page for a screen reader and for the jump back to the top.
      h('h1', { class: 'pg-hero__logo', id: 'pg-top', tabindex: '-1', 'data-entry': '' },
        h('span', { class: 'pg-sr', lang: 'vi' }, t('brand.wordmark')), heroMark),
      heroIntro, heroIntro2),
    // the invitation to scroll stands on its own at the foot of the room, on the middle line of the screen
    // (Mike, 2026-09-21). It is the third thing on the screen, not part of either block of writing.
    cue,
    engraved('xuan'));

  // seasons: three steps each
  // the season's name is the heading's own text (a Vietnamese word in both languages); the street sits beside it
  // The big word is the painted one. The name stays in the page for a screen reader, and the street below carries
  // the screen's eye entry point now that the heading has no letters of its own.
  const cardHeading = (s) => h('h2', { class: 'pg-card__h', id: `pg-s-${s}`, tabindex: '-1' },
    h('span', { class: 'pg-sr', lang: 'vi' }, SEASON_NAME[s]), art(LOGO[s], SEASON_NAME[s]));
  // the street and the two small words go together under the brush rule, as one block of small print
  const cardMeta = (s) => {
    const street = h('span', { class: 'pg-card__street', 'data-entry': '' });
    bound.push([street, `season.${s}.street`, { street: true }]);
    return h('p', { class: 'pg-card__sub' }, street,
      tx('span', `season.${s}.english`),
      tx('span', `season.${s}.when`, { class: 'pg-card__when' }));
  };
  for (const s of SEASONS) {
    const tone = NIGHT.has(s) ? 'night' : 'day';
    step(`${s}-1`, tone,
      // One painted sheet, and only one: the head and the body are plain boxes inside it, not sheets that could be
      // painted and pulled apart (summer on a phone and winter were, until 21/9 — see page.css, the season sheet).
      h('div', { class: `pg-card pg-paint pg-card--${s}` },
        h('div', { class: 'pg-card__head' }, cardHeading(s), cardMeta(s)),
        h('div', { class: 'pg-card__body' },
          epigraph(`season.${s}`, 'pg-epi--card'),
          tx('p', `season.${s}.opener`, { class: 'pg-body' }))),
      engraved(s));
    const noteRow = (k) => h('div', { class: `pg-notes__row is-${k}` },
      tx('dt', `notes.${k}`), tx('dd', `season.${s}.${k}`, { 'data-entry': k === 'heart' ? '' : null }));
    step(`${s}-2`, tone,
      h('div', { class: `pg-stack pg-stack--${s}` },
        h('dl', { class: 'pg-notes pg-paint pg-no3d-only' }, noteRow('top'), noteRow('heart'), noteRow('base')),
        h('div', { class: 'pg-panel pg-paint pg-memory' },
          tx('h3', `season.${s}.place`),
          tx('p', `season.${s}.memory`, { class: 'pg-body' }))));
    // The last step of a season carries no words at all (Mike, 2026-09-18). The line that used to stand here said
    // which season lay underneath, and telling that ahead of time gave away the one surprise the page has. The step
    // stays — it is the page's quiet stretch, where the painting speaks for itself. The eye does stop here: it stops
    // on the painting coming apart, and data-entry says so, so the reading tool counts a stop it cannot see.
    const peelStop = h('div', { class: 'pg-peelstop pg-3d-only', 'data-entry': '' });
    T(peelStop, 'a11y.peel', 'aria-label');
    peelStop.setAttribute('role', 'img');
    step(`${s}-3`, tone, peelStop);
  }

  // ---- the bottle's notes: the page's card, not the core's ----------------------------------------------------
  // This is the one screen where a visitor reads about a bottle, and it was the worst-looking thing on the page
  // (Mike, 2026-09-18: "các ô text khi bấm vào chai đang rất xấu"). It used to be the core's own panel inside the
  // season: a white rounded box, a rule above and below the three notes, and a round × in the corner. The words on
  // it are the page's anyway, so the card is the page's now — painted paper over the scene, no frame anywhere.
  // The core keeps what is the core's: the camera moving in on the bottle, the scroll lock, and closing on Esc or a
  // click on the scene. Its own panel is hidden from inside each season frame; nothing in core/ is touched.
  // The card is a blotter off a perfume counter (Mike chose it, 2026-09-21): a narrow strip of paper, the three
  // notes running down it as the scent opens out, and the foot of the strip stained where it was dipped.

  // a cross drawn with two strokes of the brush, not a printed ×
  const brushX = () => h('svg', { class: 'pg-fcard__xmark', viewBox: '0 0 32 32', 'aria-hidden': 'true', focusable: 'false' },
    h('path', { d: 'M7.5 6.5 C 13 12, 19.5 20, 25 25.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.1', 'stroke-linecap': 'round' }),
    h('path', { d: 'M25 7 C 19 13, 12.5 19.5, 6.8 25', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.9', 'stroke-linecap': 'round' }));

  const fcMark = h('span', { class: 'pg-fcard__mark', 'aria-hidden': 'true' });
  const fcName = h('span', { class: 'pg-sr', lang: 'vi' });
  const fcHead = h('h2', { class: 'pg-fcard__h', id: 'pg-fcard-h', tabindex: '-1' }, fcName, fcMark);
  const fcSub = h('p', { class: 'pg-fcard__sub' });
  const fcOpener = h('p', { class: 'pg-fcard__opener pg-body' });
  // No paragraph of memory on the card. Measured on the finished page (2026-09-21): a visitor who only scrolls
  // meets each season's memory exactly once, at step 2 — the card is never reached without pressing the bottle.
  // So the copy on the card was the second one, and it came back-to-back: press the bottle, read the memory,
  // close, scroll one screen, read the same 34–40 syllables again. The card keeps what only it has — the three
  // notes and the bottle up close — and the memory stays where everyone meets it.
  // the three notes are the spine of the card: never a row of items read across, always one under the other, with
  // the middle one the loudest (it is the note the bottle is remembered by)
  const fcRows = ['top', 'heart', 'base'].map((k) => {
    const dt = tx('dt', `notes.${k}`, { class: 'pg-fcard__lab' });
    const dd = h('dd', { class: 'pg-fcard__val', 'data-entry': k === 'heart' ? '' : null });
    return { k, dd, el: h('div', { class: `pg-fcard__row is-${k}` }, dt, dd) };
  });
  const fcNotes = h('dl', { class: 'pg-fcard__notes' }, ...fcRows.map((r) => r.el));
  const fcCloseWord = h('span', { class: 'pg-sr' });
  const fcClose = h('button', { type: 'button', class: 'pg-fcard__x', onclick: () => closeFocus() }, fcCloseWord, brushX());
  T(fcCloseWord, 'a11y.close');
  T(fcClose, 'a11y.close', 'aria-label');
  const focusCard = h('div', {
    class: 'pg-fcard pg-paint pg-3d-only', role: 'dialog', 'aria-modal': 'false',
    'aria-labelledby': 'pg-fcard-h', hidden: true,
  }, fcClose, fcHead, fcSub, fcOpener, fcNotes);
  over.append(focusCard);

  const fillFocusCard = (sn) => {
    if (!sn) return;
    focusCard.dataset.season = sn;
    fcName.textContent = SEASON_NAME[sn];
    fcMark.replaceChildren(art(LOGO[sn], ''));
    fcSub.textContent = t(`season.${sn}.english`);
    fcOpener.textContent = t(`season.${sn}.opener`);
    for (const r of fcRows) r.dd.textContent = t(`season.${sn}.${r.k}`);
  };
  let fcHideTimer = 0;
  const showFocusCard = (sn) => {
    fillFocusCard(sn);
    clearTimeout(fcHideTimer);
    focusCard.hidden = false;
    requestAnimationFrame(() => focusCard.classList.add('is-on'));
  };
  const hideFocusCard = () => {
    focusCard.classList.remove('is-on');
    clearTimeout(fcHideTimer);
    fcHideTimer = setTimeout(() => { if (!state.focusOpen) focusCard.hidden = true; }, 460);
  };
  const closeFocus = () => { try { rawApi.closeNotes?.(); } catch { /* ignore */ } };
  // the core's own panel lives inside each season frame; it is hidden from here, so no file of the core is touched
  const hideCoreNotes = () => {
    for (const f of document.querySelectorAll('#stage iframe')) {
      try {
        const d = f.contentDocument;
        if (!d || d.getElementById('pg-hide-notes')) continue;
        const st = d.createElement('style');
        st.id = 'pg-hide-notes';
        st.textContent = '#notes{display:none!important}';
        (d.head || d.documentElement).append(st);
      } catch { /* a season still loading: it is tried again the next time round */ }
    }
  };

  // ---- the end of the page ------------------------------------------------------------
  const tail = h('div', { class: 'pg-tail', id: 'pg-tail' });

  // "Chớm" on each painted label: kept in the document where it is drawn (layout rule 12); the picture is one image
  const labelWords = () => SEASONS.map((s) => h('span', { class: 'pg-labelword', lang: 'vi', hidden: true },
    h('span', { class: 'pg-labelword__mark', 'data-engraved-3d': '1' }, 'Chớm'),
    h('span', { class: 'pg-labelword__caps', 'data-engraved-3d': '1' }, SEASON_CAPS[s])));

  // atelier
  const atelierArt = h('canvas', { class: 'pg-atelier__art', 'aria-hidden': 'true' });
  const atelierWords = labelWords();
  const atelierPic = h('div', { class: 'pg-atelier__pic', role: 'img' }, atelierArt, atelierWords);
  T(atelierPic, 'a11y.scene.atelier', 'aria-label');
  const atelier = h('section', { class: 'pg-sec pg-atelier', id: 'atelier', 'aria-labelledby': 'pg-at-h', 'data-unit': 'atelier' },
    h('div', { class: 'pg-atelier__text pg-card-paper pg-paint' },
      tx('h2', 'atelier.heading', { id: 'pg-at-h' }),
      tx('p', 'atelier.body', { class: 'pg-body' }),
      h('ul', { class: 'pg-facts', role: 'list' },
        tx('li', 'atelier.fact.method', { 'data-entry': '' }),
        tx('li', 'atelier.fact.batch'),
        tx('li', 'atelier.fact.source'))),
    h('div', { class: 'pg-atelier__figure' }, atelierPic));

  // blend
  const blendArt = h('canvas', { class: 'pg-blend__art', 'aria-hidden': 'true' });
  const blendWords = labelWords();
  const blendStage = h('div', { class: 'pg-blend__stage', role: 'img' }, blendArt, blendWords);
  T(blendStage, 'a11y.blendRegion', 'aria-label');
  const resultLine = h('p', { class: 'pg-blend__line', 'data-entry': '' });
  const resultDesc = h('p', { class: 'pg-blend__desc pg-body' });
  const blendLive = h('p', { class: 'pg-sr', 'aria-live': 'polite', id: 'pg-blend-live', 'data-decor': '' });
  const blendHelp = tx('p', 'a11y.blendHelp', { id: 'pg-blend-help', hidden: true });
  const blendHint = h('p', { class: 'pg-hint pg-blend__hint' });
  const sliders = SEASONS.map((s) => {
    const input = h('input', { type: 'range', id: `pg-r-${s}`, min: '0', max: '100', step: String(STEP), value: String(EQUAL[s]), 'aria-describedby': 'pg-blend-help' });
    const out = h('output', { class: 'pg-slider__val', for: `pg-r-${s}`, 'aria-hidden': 'true' });
    // the groove is a brush stroke and the paint in it is the season's colour: the browser's own track is cleared away
    const wrap = h('div', { class: 'pg-slider', 'data-season': s, style: `--c:${PAINT[s]}` },
      h('div', { class: 'pg-slider__top' }, tx('label', `blend.slider.${s}`, { for: `pg-r-${s}`, 'data-entry': s === 'xuan' ? '' : null }), out),
      h('div', { class: 'pg-track' }, input));
    return { s, input, out, wrap };
  });
  const cta = h('button', { type: 'button', class: 'pg-btn pg-paint pg-blend__cta', 'data-entry': '' });
  T(cta, 'blend.cta');
  const reset = h('button', { type: 'button', class: 'pg-btn pg-btn--quiet pg-paint pg-blend__reset' });
  T(reset, 'blend.reset');
  const blend = h('section', { class: 'pg-sec pg-blend', id: 'blend', 'aria-labelledby': 'pg-blend-h', 'data-unit': 'blend' },
    h('div', { class: 'pg-blend__a', 'data-unit': 'blend-a', 'data-sub': '' },
      h('div', { class: 'pg-blend__head' },
        tx('h2', 'blend.heading', { id: 'pg-blend-h' }),
        epigraph('blend'),
        blendHint),
      blendStage),
    h('div', { class: 'pg-blend__b', 'data-unit': 'blend-b', 'data-sub': '' },
      h('div', { class: 'pg-blend__result pg-card-paper pg-paint' }, resultLine, resultDesc),
      h('div', { class: 'pg-blend__sliders pg-card-paper pg-paint', role: 'group', 'aria-labelledby': 'pg-blend-h' }, sliders.map((x) => x.wrap)),
      h('div', { class: 'pg-blend__actions' }, cta, reset)),
    blendHelp, blendLive);

  // order
  // Every field is written on a brush line, not inside a box (Mike, 2026-09-18). The line is drawn by the wrapper,
  // and each one uses a different stroke from the scan so no two look printed from the same die.
  let inkN = 0;
  const inkLine = (input) => h('span', { class: `pg-ink pg-ink--${'abc'[inkN++ % 3]}` }, input);
  const field = (id, labelKey, input, extra = []) => {
    const err = h('p', { class: 'pg-field__err', id: `${id}-err`, hidden: true });
    input.id = id;
    input.setAttribute('aria-describedby', [...extra.map((e) => e.id), `${id}-err`].join(' '));
    return { wrap: h('div', { class: 'pg-field' }, tx('label', labelKey, { for: id }), inkLine(input), ...extra, err), input, err };
  };
  const fName = field('pg-o-name', 'order.nameLabel', h('input', { type: 'text', autocomplete: 'name', required: true, spellcheck: 'false' }));
  const fEmail = field('pg-o-email', 'order.emailLabel', h('input', { type: 'email', autocomplete: 'email', required: true, inputmode: 'email', spellcheck: 'false' }));
  const engraveHint = tx('p', 'order.engraveHint', { class: 'pg-field__hint', id: 'pg-o-engrave-hint' });
  const engraveInput = h('input', { type: 'text', maxlength: '12', autocomplete: 'off', spellcheck: 'false' });
  T(engraveInput, 'order.engravePlaceholder', 'placeholder');
  const fEngrave = field('pg-o-engrave', 'order.engraveLabel', engraveInput, [engraveHint]);
  const sizeLegend = tx('legend', 'order.sizeLabel');
  const size = (v, key, checked) => h('label', { class: 'pg-size' },
    h('input', { type: 'radio', name: 'pg-size', value: v, checked: checked || null }),
    h('span', { class: 'pg-size__box pg-paint' }, tx('span', key)));
  const submit = h('button', { type: 'submit', class: 'pg-btn pg-paint pg-order__submit', 'data-entry': '' });
  T(submit, 'order.submit');
  const demoNote = tx('p', 'order.demoNote', { class: 'pg-demo' });
  const orderOk = h('p', { class: 'pg-ok', role: 'status' });
  const cardName = h('p', { class: 'pg-sum__name', 'data-entry': '' });
  const cardArt = h('canvas', { class: 'pg-sum__art', role: 'img' });
  const orderForm = h('form', { class: 'pg-order__form pg-card-paper pg-paint', novalidate: true, 'aria-labelledby': 'pg-order-h', action: '#order' },
    h('div', { class: 'pg-order__a', 'data-unit': 'order-a', 'data-sub': '' },
      tx('h2', 'order.heading', { id: 'pg-order-h' }),
      tx('p', 'order.intro', { class: 'pg-body pg-order__intro' }),
      h('div', { class: 'pg-sum pg-paint' },
        tx('p', 'order.blendLabel', { class: 'pg-sum__label' }),
        cardName, cardArt)),
    h('div', { class: 'pg-order__f1', 'data-unit': 'order-a', 'data-sub': '' }, fName.wrap, fEmail.wrap),
    h('div', { class: 'pg-order__f2', 'data-unit': 'order-b', 'data-sub': '' },
      h('fieldset', { class: 'pg-field pg-sizes' }, sizeLegend,
        h('div', { class: 'pg-sizes__row' }, size('15', 'order.size.small', true), size('100', 'order.size.large'))),
      fEngrave.wrap,
      h('div', { class: 'pg-order__send' }, submit, demoNote, orderOk)));
  const order = h('section', { class: 'pg-sec pg-order', id: 'order', 'data-unit': 'order' }, orderForm);

  // sampler + delivery
  const vials = h('canvas', { class: 'pg-samp__art', 'aria-hidden': 'true' });
  const crate = h('canvas', { class: 'pg-deliv__art', 'aria-hidden': 'true' });
  const sampBtn = h('button', { type: 'button', class: 'pg-btn pg-btn--quiet pg-paint pg-samp__cta', 'data-entry': '' });
  T(sampBtn, 'order.samplerCta');
  const sampOk = h('p', { class: 'pg-ok', role: 'status' });
  const sampler = h('section', { class: 'pg-sec pg-sampler', id: 'sampler', 'aria-label': '', 'data-unit': 'sampler' },
    h('div', { class: 'pg-deliv pg-card-paper pg-paint' },
      crate,
      tx('h3', 'order.deliveryHeading'),
      tx('p', 'order.delivery', { class: 'pg-body' })),
    h('div', { class: 'pg-samp pg-paint' },
      vials,
      tx('h3', 'order.samplerHeading'),
      tx('p', 'order.samplerBody', { class: 'pg-body' }),
      sampBtn, sampOk));
  T(sampler, 'order.samplerHeading', 'aria-label');

  // footer
  const newsInput = h('input', { type: 'email', id: 'pg-news-email', autocomplete: 'email', inputmode: 'email', spellcheck: 'false', 'aria-describedby': 'pg-news-msg' });
  T(newsInput, 'footer.emailPlaceholder', 'placeholder'); T(newsInput, 'footer.emailAria', 'aria-label');
  const newsBtn = h('button', { type: 'submit', class: 'pg-btn pg-paint', 'data-entry': '' });
  T(newsBtn, 'footer.signup');
  const newsMsg = h('p', { class: 'pg-news__msg', id: 'pg-news-msg', role: 'status' });
  const newsForm = h('form', { class: 'pg-news', novalidate: true, action: '#letters' },
    h('div', { class: 'pg-news__row' }, inkLine(newsInput), newsBtn), newsMsg);
  const toTop = tx('a', 'footer.top', { class: 'pg-foot__top', href: '#pg-top' });
  const swatch = h('canvas', { class: 'pg-foot__art', 'aria-hidden': 'true' });
  const footer = h('footer', { class: 'pg-sec pg-foot', id: 'letters', 'data-unit': 'footer' },
    h('div', { class: 'pg-foot__in pg-card-paper pg-paint' },
      swatch,
      tx('h2', 'footer.newsletterHeading'),
      epigraph('footer'),
      tx('p', 'footer.newsletterBody', { class: 'pg-body' }),
      newsForm),
    h('div', { class: 'pg-foot__base' }, toTop, tx('p', 'footer.byline', { class: 'pg-byline' })));

  tail.append(atelier, blend, order, sampler, footer);

  // where it all goes: the scene words come before the scene in the page (a jump puts focus on a season's heading, and
  // the next Tab reaches that season's bottle); the end part goes in the core's slot after the scroll room
  menu.after(over);
  const slot = api.tail || (() => { const d = h('div', { class: 'pg-slot' }); document.body.append(d); return d; })();
  slot.append(tail);

  // while the waiting screen is up, nothing behind it can take focus
  const behind = [skip, nav, menu, over, tail];
  for (const el of behind) el.inert = true;

  // ---- text binding with variables (peel cue) --------------------------------------------
  const applyBound = () => {
    for (const [el, key, how] of bound) {
      if (typeof how === 'string') put(el, key, how);
      else if (how.compose) el.setAttribute('aria-label', `${t(how.compose)} ${t(key)}`);
      else if (how.epigraph) how.epigraph();
      else if (how.street) { el.textContent = t(key); el.lang = state.lang; }
      else if (how.vars) el.textContent = t(key, how.vars());
    }
  };
  applyBound();

  // ---- steps ------------------------------------------------------------------------------
  // The core tells where the scroll is. Preferred: { phase: 'intro' | 'rest' | 'push' | 'peel' | 'end', p }.
  // Without a phase (older core): intro = index -1 with u 0..1; a season's u = 80% push, then 20% peel.
  const INTRO = ['hero', 'xuan-1'];
  const springRests = Number(rawApi.holdVh) > 0;
  const PUSH_SPLIT = 0.5;            // first half of the push: place + memory; second half: the label before the peel
  const stepFor = (s) => {
    const id = SEASONS[s.index];
    if (s.phase) {
      // the core gives spring its own still stretch after the opening: the opening holds two steps, the card is in the rest
      if (s.phase === 'intro') return 'hero';       // one screen of words before the first street
      if (!id) return null;
      if (s.phase === 'rest') return `${id}-1`;
      if (s.phase === 'push') return (s.p ?? 0) < PUSH_SPLIT ? `${id}-2` : `${id}-3`;
      if (s.phase === 'end') return `${id}-3`;
      return null;
    }
    if (s.intro || s.index < 0) return INTRO[Math.min(1, Math.floor((s.u ?? 0) * 2))];
    if (!id) return null;
    const last = s.index === SEASONS.length - 1;
    if (!last && s.u >= 0.8) return null;
    const push = last ? s.u : s.u / 0.8;
    if (s.index > 0 && push < 0.05) return `${id}-1`;
    return push < PUSH_SPLIT ? `${id}-2` : `${id}-3`;
  };
  let shownStep = null;
  const seen = new Set();
  // the words of a step come in once its paper is solid: watch the step's own fade, frame by frame, while it runs
  const settleStep = (el) => {
    cancelAnimationFrame(el._settle || 0);
    const tick = () => {
      if (!el.classList.contains('is-on')) return;
      if (+getComputedStyle(el).opacity >= 0.99) { el.classList.add('is-set'); return; }
      el._settle = requestAnimationFrame(tick);
    };
    el._settle = requestAnimationFrame(tick);
  };
  const setStep = () => {
    let want = state.built && !state.focusOpen && !state.tailIn && !state.menuOpen ? stepFor(state.season) : null;
    if (state.no3d) want = null;
    if (want === shownStep) return;
    const prev = shownStep && steps.get(shownStep);
    const next = want && steps.get(want);
    // Paper first, then the words; the words go first, then the paper (21/9 night). A step used to fade as one
    // piece, so for half a second the words stood on half a sheet: on the night streets the navy paper barely shows
    // against the dark scene while ivory letters do, and the words read as written on the painting ("chữ trên nền
    // hoạ tiết phải có tấm lót đặc"). Now the step's own fade is the paper's; its words carry `is-set`, given only
    // once the paper is solid and taken away before the paper starts to go (page.css, the steps; page-check counts it
    // frame by frame through every change of step, both ways).
    if (prev) { prev.classList.remove('is-on', 'is-first', 'is-set'); cancelAnimationFrame(prev._settle || 0); }
    if (next) { next.classList.add('is-on'); next.classList.toggle('is-first', !prev); settleStep(next); }

    shownStep = want;
    root.dataset.step = want || '';
    // The big painted name on the opening room is the one in the words themselves. The bar's own name is large only
    // while the page is still coming up, and shrinks into the bar as the room settles ("hiện to rồi thu vào thanh
    // điều hướng", docs/content/chom-text-layout.md): two names of different sizes on one screen read as a mistake.
    brand.classList.toggle('is-hero', !state.built && !state.no3d);
    // arriving in a season: say so, once per arrival
    if (want && /-1$/.test(want) && !seen.has(want)) {
      seen.add(want);
      const id = want.slice(0, -2);
      announceSeason(id);
    }
    if (want && /-1$/.test(want)) placeEngraved();
    updateHints();
    brandEntry();
  };
  // When the bar is the only writing on screen (the painting is peeling, or the end part is still coming up), the
  // eye lands on the scene and the name: the name is marked as that screen's entry point.
  // On a screen that carries nothing but the bar, the eye lands on the painted name first — but a drawing cannot be
  // counted as a word, so the marker goes on the words right beside it: the season the bar is showing, or, on a
  // phone where the seasons live in the menu, the one button.
  const barEntries = [...seasonLinks.map((a) => a.querySelector('.pg-nav__name')), blendLink.firstElementChild];
  function brandEntry() {
    const bare = state.entered && !shownStep && !(state.tailIn && tailLit) && !state.focusOpen && !state.menuOpen;
    const cur = seasonLinks.find((a) => a.hasAttribute('aria-current'));
    const name = cur && cur.offsetParent !== null ? cur.querySelector('.pg-nav__name') : null;
    const mark = name || blendLink.firstElementChild;
    for (const el of barEntries) el.toggleAttribute('data-entry', bare && el === mark);
  }
  let liveClear = 0;
  const announceSeason = (id) => {
    seasonLive.textContent = t('a11y.seasonLive', { season: t(`blend.slider.${id}`), street: t(`season.${id}.street`) });
    clearTimeout(liveClear);
    liveClear = setTimeout(() => { seasonLive.textContent = ''; }, 5000);
  };

  // where the bottle is (the core can tell; otherwise the measured boxes from the layout doc)
  const BOTTLE = {
    desk: { xuan: [33, 61, 7, 19], ha: [37, 60, 5, 15], thu: [72, 53, 6, 14], dong: [65, 15, 4, 12] },
    phone: { xuan: [21, 61, 23, 18], ha: [37, 60, 19, 15], thu: [69, 53, 19, 14], dong: [55, 15, 10, 13] },
  };
  const bottleBox = (sn, phone) => {
    let r = null;
    try { r = rawApi.bottleRect ? rawApi.bottleRect(SEASONS.indexOf(sn)) : null; } catch { r = null; }
    if (r && r.w > 0) return { x: r.x, y: r.y, w: r.w, h: r.h, real: true };
    const [x, y, w, hh] = (phone ? BOTTLE.phone : BOTTLE.desk)[sn];
    const vw = innerWidth, vh = innerHeight;
    return { x: (x / 100) * vw, y: (y / 100) * vh, w: (w / 100) * vw, h: (hh / 100) * vh, real: false };
  };
  // THE BAR IS A NO-GO BOX. Four sheets were sitting under it — Hạ and Thu on a wide screen, and three of the four
  // on a phone — with "Xưởng" and "Mùi của riêng bạn" printed across the paper (Mike, 21/9). It lived that long
  // because every `top` was a number somebody typed, and nobody measured the bar. So: the bar says how tall it
  // really is, every season's sheet starts below it, and page/qa/page-check.mjs fails if any sheet touches it.
  // Re-measured on resize, so changing the bar's type cannot break this again.
  const measureNav = () => {
    let bottom = 0;
    for (const el of nav.querySelectorAll('a, button, .pg-brand, .pg-nav__seasons')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.height) bottom = Math.max(bottom, r.bottom);
    }
    if (!bottom) { const r = nav.getBoundingClientRect(); bottom = r.bottom || 0; }
    const v = `${Math.round(bottom)}px`;
    if (root.style.getPropertyValue('--pg-nav-bottom') !== v) root.style.setProperty('--pg-nav-bottom', v);
  };
  // The bar is measured when its size changes, not every time a season arrives: a ResizeObserver is told after the
  // browser has laid the page out anyway, so reading the bar costs no extra layout. Called from placeEngraved it
  // forced one (21/9: 51-60 ms on the frame the page is built, under the waiting screen), and it ran again on every
  // season's first step, on the very frame of the change.
  if (window.ResizeObserver) {
    const navRO = new ResizeObserver(() => measureNav());
    navRO.observe(nav);
    for (const el of nav.querySelectorAll('a, button, .pg-brand, .pg-nav__seasons')) navRO.observe(el);
  } else window.addEventListener('resize', measureNav);
  const placeEngraved = () => {
    const phone = matchMedia('(max-width: 760px), (max-aspect-ratio: 95/100)').matches;
    for (const el of over.querySelectorAll('.pg-engraved')) {
      const s = el.dataset.season;
      const r = bottleBox(s, phone);
      el.style.left = `${r.x}px`; el.style.top = `${r.y + r.h * 0.42}px`; el.style.width = `${r.w}px`;
    }
  };


  // "Chớm Xuân" to "Chớm Hạ": the season word fades where it stands, carried by the scroll — in with the street as
  // it settles, out with the layers as they peel. In the opening and at the end of the page the name stands alone.
  let brandSeasonId = null;
  const setBrandSeason = () => {
    const s = state.season;
    const id = SEASONS[s.index];
    const inScene = !state.tailIn && !state.no3d;
    let o = 0, word = id;
    // the opening screen carries the name alone (Mike, 2026-09-18): no season word before the first street
    if (inScene && s.phase === 'intro') { word = null; o = 0; }
    else if (inScene && id) {
      if (s.phase === 'peel') o = Math.max(0, 1 - (s.p ?? 0) * 1.8);
      else if (s.phase === 'rest') o = Math.min(1, (s.p ?? 1) / 0.12);
      else if (!s.intro) o = 1;
    }
    o = Math.min(1, Math.max(0, o));
    if (word && word !== brandSeasonId) {
      brandSeasonId = word;
      // The word changes two frames after the season does (about 33 ms, too short to see). The frame the viewer
      // scrolls into a season already has the season's sheet and the bar's colours to draw; the word drawn on the
      // same frame made it miss its turn (22/9, page/qa/spring-in.mjs). A later change of season within those two
      // frames wins: the earlier one sees brandSeasonId has moved on and does nothing.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (brandSeasonId !== word) return;
        for (const [k, el] of Object.entries(brandWords)) el.classList.toggle('is-off', k !== word);
        writeWord(brandWords[word]);
      }));
    }
    const shown = o.toFixed(3);
    if (brandSeason.style.opacity !== shown) {
      brandSeason.style.opacity = shown;
      // going out with the layers it belongs to: the word lifts as it thins, the way the scent does
      brandSeason.style.transform = o > 0.999 ? '' : `translateY(${(-(1 - o) * 7).toFixed(2)}px)`;
    }
  };

  // The hand writes the word: each stroke comes in along its own centre line, in the order a hand would make them
  // (the drawing carries both). A machine set to less motion gets the finished word at once.
  let writeTimer = 0;
  const lessMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function writeWord(el) {
    if (!el || !el.classList || (lessMotion && lessMotion.matches)) return;
    const turns = (LOGO_SMALL_ORDER[brandSeasonId] || LOGO_ORDER[brandSeasonId] || {}).last || 8;
    // The word being written was hidden (display: none) until this very change, and a hidden element's animations
    // start again from nothing when it is shown, so there is no need to force a layout here to restart them (it
    // used to: a whole-page layout in the middle of the frame the viewer scrolls into a season).
    el.classList.add('is-writing');
    clearTimeout(writeTimer);
    writeTimer = setTimeout(() => el.classList.remove('is-writing'), turns * 42 + 400);
  }

  // The first season word the bar writes cost the graphics card ~10 ms more than any word after it (22/9,
  // page/qa/spring-in.mjs, first walks: 12-14 ms of drawing for that one word, 2-3 ms once one had been written
  // before): the soft copy under the ink is a blur, and the browser gets its blur ready only the first time it draws
  // one. That first time fell on the first scroll into spring. So one word is written once behind the waiting
  // screen, from the frame the room is built there anyway: the bar's own drawing at the bar's own size, at 2% on the
  // waiting screen's paper (nothing to see). It has to be *written* (the strokes and the spreading ink running): the
  // finished word drawn still, then taken away, did not do it (measured, 22/9: 10-14 ms again). The screen starts to
  // leave ~180 ms after that frame, so the word goes with it; it is taken out once the screen has gone.
  const warmWord = () => {
    if (state.no3d || !loader.el || !loader.el.isConnected) return;
    const el = art(LOGO_SMALL[SEASONS[0]], '');
    if (!el.classList) return;
    if (!(lessMotion && lessMotion.matches)) el.classList.add('is-writing');
    const box = h('span', { class: 'pg-warm', 'aria-hidden': 'true' }, el);
    loader.el.append(box);
    const off = () => {
      if (loader.el.hidden || !loader.el.classList.contains('is-leaving')) box.remove();
      else setTimeout(off, 500);
    };
    setTimeout(off, 1500);
  };

  // tone of the nav follows the light of the scene
  const setTone = () => {
    const id = SEASONS[state.season.index];
    const night = !state.tailIn && !state.no3d && id && NIGHT.has(id);
    root.dataset.tone = night ? 'night' : 'day';
    root.dataset.season = state.tailIn || !id ? 'xuan' : id;
    // the painted name takes the light of the street it stands in; off the streets it goes back to its own two colours.
    // The colours hang on the bar, not on the page's root (page.css: changing them on the root made the browser look
    // at every element again on the first scroll into spring).
    nav.dataset.season = root.dataset.season;
    const onStreet = !state.tailIn && !state.no3d && !!id && !state.season.intro;
    if (onStreet) nav.dataset.logo = id; else nav.removeAttribute('data-logo');
    for (const a of [...seasonLinks, ...menuSeasons]) {
      const cur = !state.tailIn && a.dataset.season === id && state.season.index >= 0;
      if (cur) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    }
    sceneLabel();
    setBrandSeason();
    brandEntry();
  };

  // the pointer over the bottle: the arrow says it can be pressed (the white line round the bottle is the core's)
  let hotSeason = null;
  const bottleHover = (e) => {
    if (state.touch || !state.entered || state.focusOpen) return;
    const sn = SEASONS[state.season.index];
    if (!sn || !shownStep || !shownStep.startsWith(sn)) { if (hotSeason) { root.classList.remove('pg-hot'); hotSeason = null; } return; }
    const r = bottleBox(sn, matchMedia('(max-width: 760px), (max-aspect-ratio: 95/100)').matches);
    const pad = Math.max(8, r.w * 0.18);
    const inside = e.clientX > r.x - pad && e.clientX < r.x + r.w + pad && e.clientY > r.y - pad && e.clientY < r.y + r.h + pad;
    const want = inside ? sn : null;
    if (want === hotSeason) return;
    hotSeason = want;
    root.classList.toggle('pg-hot', !!hotSeason);
  };
  window.addEventListener('pointermove', bottleHover, { passive: true });

  // ---- hints (shown once, gone after the first touch) -------------------------------------
  const hintsDone = { blend: false };
  const updateHints = () => {
    put(cueWords, state.touch ? 'hero.cueTouch' : 'hero.cueDesktop', 'text');
    put(blendHint, state.touch ? 'blend.hintTouch' : 'blend.hintPointer', 'text');
    blendHint.classList.toggle('is-done', hintsDone.blend);
  };
  const touchQuery = matchMedia('(hover: hover) and (pointer: fine)');
  touchQuery.addEventListener?.('change', () => { state.touch = !touchQuery.matches; updateHints(); });

  // ---- blend -----------------------------------------------------------------------------
  let brushes = null;
  let blendRaf = 0;
  const liveTimer = { id: 0, last: '' };
  const renderBlend = (announce = false) => {
    const v = state.values;
    const sh = shares(v);
    const r = blendName(v);
    for (const x of sliders) {
      x.input.value = String(v[x.s]);
      x.out.textContent = `${sh[x.s]}${t('blend.unit')}`;
      x.wrap.style.setProperty('--v', `${v[x.s]}%`);
      x.input.setAttribute('aria-valuetext', t('a11y.sliderValue', { season: t(`nav.${x.s}`), n: sh[x.s] }));
    }
    resultLine.textContent = '';
    resultDesc.textContent = '';
    let name = '', desc = '';
    if (r.kind === 'empty') {
      resultLine.textContent = t('blend.empty');
    } else if (r.kind === 'solo') {
      name = t(`nav.${r.season}`);
      desc = t(`season.${r.season}.english`);
      const [a, b] = t('blend.solo').split('{season}');
      resultLine.append(a, h('em', { class: 'pg-blend__name', lang: 'vi' }, name), b ?? '');
      resultDesc.textContent = desc;
    } else {
      name = t(`blend.name.${r.dominant}.${r.second}`);
      desc = t(`blend.desc.${r.dominant}.${r.second}`);
      const [a, b] = t('blend.result').split('{name}');
      resultLine.append(a, h('em', { class: 'pg-blend__name' }, name), b ?? '');
      resultDesc.textContent = desc;
    }
    blend.dataset.kind = r.kind;
    blend.dataset.dom = r.dominant || r.season || '';
    cta.setAttribute('aria-disabled', r.kind === 'empty' ? 'true' : 'false');
    reset.hidden = !state.touched;
    renderCard();
    drawBlendSoon();
    if (announce) {
      clearTimeout(liveTimer.id);
      liveTimer.id = setTimeout(() => {
        const msg = r.kind === 'empty' ? t('blend.empty') : t('a11y.blendLive', { name, desc });
        if (msg !== liveTimer.last) { blendLive.textContent = msg; liveTimer.last = msg; }
      }, 650);
    }
  };
  const drawBlendSoon = () => { if (!blendRaf) blendRaf = requestAnimationFrame(drawBlend); };
  let blendGeo = null;
  const drawBlend = () => {
    blendRaf = 0;
    if (!brushes || !blendGeo) { restartPicture(blendArt); return; }
    const { g, w, h: H } = blendGeo;
    g.clearRect(0, 0, w, H);
    const xs = SEASONS.map((_, i) => w * (0.125 + i * 0.25));
    const bw = Math.min(w * 0.12, H * 0.43);
    const base = H * 0.9;
    drawBand(g, brushes, w, H, xs, state.values, H * 0.8);
    const labels = SEASONS.map((s, i) => drawBottle(g, brushes, xs[i], base, bw, PAINT[s], state.values[s] / 100, 21 + i, { letters: true, season: s }));
    placeWords(blendWords, labels);
    drawCardArt();
  };
  // put each kept word exactly over its painted label (only when the label was lettered)
  const placeWords = (words, labels) => {
    labels.forEach((l, i) => {
      const el = words[i];
      if (!el) return;
      el.hidden = !l.letters;
      if (!l.letters) return;
      el.style.left = `${l.x}px`; el.style.top = `${l.y}px`; el.style.width = `${l.w}px`; el.style.height = `${l.h}px`;
      el.firstChild.style.fontSize = `${l.fontPx}px`;
      el.lastChild.style.fontSize = `${l.capsPx}px`;
    });
  };
  let cardGeo = null;
  const cardValues = () => (state.touched && blendName(state.values).kind !== 'empty' ? state.values : EQUAL);
  const drawCardArt = () => {
    if (!brushes || !cardGeo) return;
    const { g, w, h: H } = cardGeo;
    g.clearRect(0, 0, w, H);
    const sh = shares(cardValues());
    const bw = Math.min(w * 0.14, H * 0.5);
    SEASONS.forEach((s, i) => drawBottle(g, brushes, w * (0.14 + i * 0.24), H * 0.94, bw, PAINT[s], sh[s] / 100, 31 + i, { noShadow: false, season: s }));
  };
  const renderCard = () => {
    const v = cardValues();
    const useNone = v === EQUAL;
    const r = blendName(v);
    cardName.textContent = useNone ? t('order.blendNone')
      : r.kind === 'solo' ? t(`nav.${r.season}`)
      : t(`blend.name.${r.dominant}.${r.second}`);
    cardName.classList.toggle('is-none', useNone);
    cardName.lang = !useNone && r.kind === 'solo' ? 'vi' : '';
    const sh = shares(v);
    cardArt.setAttribute('aria-label', t('a11y.blendBars', sh));
    drawCardArt();
  };
  for (const x of sliders) {
    x.input.addEventListener('input', () => {
      state.values[x.s] = Math.round(Number(x.input.value) / STEP) * STEP;
      state.touched = !isEqual(state.values) || state.touched;
      if (!hintsDone.blend) { hintsDone.blend = true; updateHints(); }
      renderBlend(true);
    });
  }
  reset.addEventListener('click', () => {
    state.values = { ...EQUAL };
    state.touched = false;
    renderBlend(true);
    sliders[0].input.focus();
  });
  const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  let jumping = false;   // the order button is already scrolling to the form: focusing its first field must not scroll again
  cta.addEventListener('click', () => {
    if (cta.getAttribute('aria-disabled') === 'true') return;
    state.touched = true;
    renderCard();
    order.scrollIntoView({ behavior: smooth(), block: 'start' });
    jumping = true;
    fName.input.focus({ preventScroll: true });
    jumping = false;
  });

  // ---- order form (demo: nothing is sent) --------------------------------------------------
  const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
  const setErr = (f, key) => {
    if (key) { f.err.textContent = t(key); f.err.hidden = false; f.input.setAttribute('aria-invalid', 'true'); }
    else { f.err.hidden = true; f.err.textContent = ''; f.input.removeAttribute('aria-invalid'); }
    f.errKey = key || null;
  };
  const checks = [
    [fName, () => (fName.input.value.trim() ? null : 'order.errorName')],
    [fEmail, () => (EMAIL.test(fEmail.input.value.trim()) ? null : 'order.errorEmail')],
    [fEngrave, () => ([...fEngrave.input.value].length <= 12 ? null : 'order.errorEngrave')],
  ];
  for (const [f, check] of checks) f.input.addEventListener('input', () => { if (f.errKey && !check()) setErr(f, null); });
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let first = null;
    for (const [f, check] of checks) {
      const k = check();
      setErr(f, k);
      if (k && !first) first = f.input;
    }
    if (first) { orderOk.hidden = true; demoNote.hidden = false; first.focus(); return; }
    demoNote.hidden = true;
    orderOk.hidden = false;
    orderOk.textContent = t('order.success');
    orderOk.dataset.key = 'order.success';
  });
  orderOk.hidden = true;
  sampBtn.addEventListener('click', () => {
    sampOk.hidden = false;
    sampOk.textContent = t('order.samplerSuccess');
    sampOk.dataset.key = 'order.samplerSuccess';
  });
  sampOk.hidden = true;
  newsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = EMAIL.test(newsInput.value.trim());
    newsMsg.dataset.key = ok ? 'footer.success' : 'footer.error';
    newsMsg.textContent = t(newsMsg.dataset.key);
    newsMsg.classList.toggle('is-error', !ok);
    if (ok) newsInput.removeAttribute('aria-invalid'); else { newsInput.setAttribute('aria-invalid', 'true'); newsInput.focus(); }
  });
  const refreshMessages = () => {
    for (const el of [orderOk, sampOk, newsMsg]) if (el.dataset.key && el.textContent) el.textContent = t(el.dataset.key);
    for (const [f] of checks) if (f.errKey) f.err.textContent = t(f.errKey);
  };

  // ---- navigation ----------------------------------------------------------------------------
  // The nav jumps, it does not fly: the core cuts the scene straight to the season (a short paper veil, no race through
  // the seasons between), closes a bottle's notes first and waits for a season still loading. Jumps run one after
  // another. Keyboard focus lands on the season's card heading once the cut is done.
  let jumpId = 0;
  const goSeason = async (i) => {
    const id = ++jumpId;
    const focusEl = i < 0 ? document.getElementById('pg-top') : document.getElementById(`pg-s-${SEASONS[i]}`);
    if (state.no3d || !api.scrollToSeason) {
      const target = i < 0 ? steps.get('hero') : steps.get(`${SEASONS[i]}-1`);
      if (state.no3d && target) target.scrollIntoView({ block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
      try {
        // the opening lies before spring's still stretch and the camera does not move between them
        if (i >= 0 || state.season.index > 0 || state.tailIn) await api.scrollToSeason(Math.max(0, i), { cut: true });
        if (i < 0) window.scrollTo({ top: 0, behavior: 'instant' });
      } catch (err) {
        console.warn('[page] jump failed', err);
        return;
      }
    }
    if (id !== jumpId) return;      // a later jump is on its way; it moves the focus
    if (focusEl) focusEl.focus({ preventScroll: true });
  };
  const onNavClick = (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (a.dataset.i !== undefined) { e.preventDefault(); closeMenu(false); goSeason(Number(a.dataset.i)); return; }
    if (href === '#pg-top') { e.preventDefault(); closeMenu(false); goSeason(-1); return; }
    if (href.startsWith('#')) {
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      e.preventDefault();
      closeMenu(false);
      target.scrollIntoView({ block: 'start' });
      const focusable = target.querySelector('h2') || target;
      if (!focusable.hasAttribute('tabindex')) focusable.setAttribute('tabindex', '-1');
      focusable.focus({ preventScroll: true });
    }
  };
  nav.addEventListener('click', onNavClick);
  menu.addEventListener('click', onNavClick);
  skip.addEventListener('click', onNavClick);
  toTop.addEventListener('click', onNavClick);

  // phone menu
  let menuReturn = null;
  const openMenu = () => {
    state.menuOpen = true;
    menuReturn = document.activeElement;
    menu.hidden = false;
    root.classList.add('pg-menu-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => { menu.classList.add('is-on'); menuClose.focus(); });
    setStep();
  };
  function closeMenu(restore = true) {
    if (!state.menuOpen) return;
    state.menuOpen = false;
    menu.classList.remove('is-on');
    menu.hidden = true;
    root.classList.remove('pg-menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    if (restore && menuReturn) menuReturn.focus();
    setStep();
  }
  menuBtn.addEventListener('click', openMenu);
  menuClose.addEventListener('click', () => closeMenu());
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
    if (e.key !== 'Tab') return;
    const f = [...menu.querySelectorAll('a,button')].filter((x) => !x.hidden);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  matchMedia('(max-width: 1080px)').addEventListener?.('change', (m) => { if (!m.matches) closeMenu(false); });

  // ---- language switch ----------------------------------------------------------------------

  // ---- entering the page -----------------------------------------------------------------------
  function enter() {
    setTimeout(fitEpigraphs, 60);
    setTimeout(fitEpigraphs, 900);
    if (state.entered) return;
    state.entered = true;
    root.classList.remove('is-loading');
    root.classList.add('pg-entered');
    for (const el of behind) el.inert = false;
    api.enter();
    window.dispatchEvent(new CustomEvent('chom:enter', { detail: { lang: state.lang } }));
    // focus is left where it was: the next Tab moves on from the waiting screen to the bar, then the scene's bottle
    setStep();
    brandEntry();
  }

  // ---- no WebGL: the reading version ---------------------------------------------------------------
  function goNo3d() {
    if (state.no3d && root.classList.contains('pg-no3d')) return;
    state.no3d = true;
    root.classList.add('pg-no3d');
    setStep();
    setTone();
    for (const el of steps.values()) el.classList.add('is-on', 'is-set');
    brand.classList.remove('is-hero');
    watchUnits();
    // which season is being read: watch the first step of each
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const id = en.target.dataset.step;
        const i = SEASONS.indexOf(id.split('-')[0]);
        state.season = { index: i, u: 0 };
        setTone();
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    for (const el of steps.values()) io.observe(el);
  }

  // ---- the end part coming over the scene --------------------------------------------------------
  const tailIO = new IntersectionObserver((entries) => {
    for (const en of entries) {
      state.tailIn = en.isIntersecting;
      setStep();
      setTone();
    }
  });
  tailIO.observe(tail);

  // ---- the end part (and the reading version): one screen of words at a time ------------------------
  // Only the part filling the middle of the screen shows its words; the others are faded right out, so two
  // screens never add up (docs/content/chom-text-layout.md rule 1). The paper itself never moves or fades.
  // the blend and the order form are one screen each on a computer, two each when they stack (phones, portrait tablets)
  const stacked = matchMedia('(max-width: 900px)');
  const unitList = () => [...tail.querySelectorAll(stacked.matches ? '[data-unit]' : '[data-unit]:not([data-sub])'), ...(state.no3d ? steps.values() : [])];
  // A part is lit when it covers the whole middle band of the screen (35% to 65% of its height): two thin lines
  // are watched, and a part must cross both. Half-way between two parts, neither is lit.
  const onA = new Set(), onB = new Set();
  let tailLit = false;
  let forced = null;
  const relight = () => {
    const list = unitList();
    const hits = list.filter((u) => onA.has(u) && onB.has(u));
    // the deepest part is the current one
    const current = forced && list.includes(forced) ? forced : hits.find((u) => !hits.some((o) => o !== u && u.contains(o))) || null;
    const lit = new Set();
    if (current) {
      const group = current.dataset.unit ? list.filter((u) => u.dataset.unit === current.dataset.unit) : [current];
      for (const g of group) for (const u of list) if (u === g || u.contains(g) || g.contains(u)) lit.add(u);
    }
    for (const u of list) u.classList.toggle('pg-dim', !lit.has(u));
    tailLit = [...lit].some((u) => tail.contains(u));
    brandEntry();
  };
  const lineWatch = (set, margin) => new IntersectionObserver((entries) => {
    for (const en of entries) { if (en.isIntersecting && en.boundingClientRect.height > 0) set.add(en.target); else set.delete(en.target); }
    forced = null;
    relight();
  }, { rootMargin: margin });
  const lineA = lineWatch(onA, '-35% 0px -64.8% 0px');
  const lineB = lineWatch(onB, '-64.8% 0px -35% 0px');
  const watchUnits = () => {
    lineA.disconnect(); lineB.disconnect();
    onA.clear(); onB.clear();
    for (const u of tail.querySelectorAll('[data-sub]')) u.classList.remove('pg-dim');
    for (const u of unitList()) { lineA.observe(u); lineB.observe(u); }
    relight();
  };
  // when the form is split over two screens, its second screen starts with the size and the engraving: they become
  // that screen's entry points (on a computer the form is one screen and they are plain labels)
  const markStacked = () => {
    for (const el of [sizeLegend, fEngrave.wrap.querySelector('label')]) el.toggleAttribute('data-entry', stacked.matches);
  };
  markStacked();
  watchUnits();
  stacked.addEventListener?.('change', () => { markStacked(); watchUnits(); });
  // a field reached with Tab must never sit in a faded part: bring its part to the middle and light it
  tail.addEventListener('focusin', (e) => {
    const u = e.target.closest('[data-unit]');
    if (!u || !u.classList.contains('pg-dim')) return;
    forced = u;
    relight();
    if (jumping) return;
    u.scrollIntoView({ block: u.offsetHeight <= window.innerHeight ? 'center' : 'start' });
  });

  // ---- canvases: each painted only when it is about to come on screen, a little per frame ----------------------
  // Sizes come from the IntersectionObserver entry (no extra layout). A picture is painted in small steps on a hidden
  // canvas (about 4 ms of work per frame), then copied onto the page in one go; it is painted again only after its
  // size changes. The blend picture is repainted at once when a slider moves (it is on screen then).
  const pictures = new Map();          // canvas -> { steps(g, w, h), done(geo, result), dirty, near, rect, job }
  const paintQueue = [];
  let paintRaf = 0;
  const BUDGET = 4;
  const paintNext = () => {
    paintRaf = 0;
    if (window.__pgNoPaint) return;     // measuring aid: leave the pictures unpainted
    const start = performance.now();
    while (paintQueue.length && performance.now() - start < BUDGET) {
      const c = paintQueue[0];
      const pic = pictures.get(c);
      if (!pic || !pic.near || !brushes || !state.built) {
        paintQueue.shift();
        if (pic && pic.job) { pic.job = null; pic.dirty = true; }   // left unfinished: paint again next time it comes near
        continue;
      }
      if (!pic.job) {
        if (!pic.dirty) { paintQueue.shift(); continue; }
        pic.dirty = false;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const off = document.createElement('canvas');
        off.width = Math.max(1, Math.round(pic.rect.width * dpr));
        off.height = Math.max(1, Math.round(pic.rect.height * dpr));
        const og = off.getContext('2d');
        og.setTransform(dpr, 0, 0, dpr, 0, 0);
        pic.job = { off, it: pic.steps(og, pic.rect.width, pic.rect.height), t: 0 };
      }
      const t0 = performance.now();
      const r = pic.job.it.next();
      pic.job.t += performance.now() - t0;
      if (r.done) {
        const geo = fitCanvas(c, 2, pic.rect);
        geo.g.save();
        geo.g.setTransform(1, 0, 0, 1, 0, 0);
        geo.g.clearRect(0, 0, c.width, c.height);
        geo.g.drawImage(pic.job.off, 0, 0);
        geo.g.restore();
        performance.measure(`pg:paint-${c.className.split(' ')[0].replace('pg-', '')}`, { start: t0 - pic.job.t, duration: pic.job.t });
        if (pic.done) pic.done(geo, r.value);
        pic.job = null;
        paintQueue.shift();
        if (pic.dirty) paintQueue.push(c);          // resized while painting
      }
    }
    if (paintQueue.length) paintRaf = requestAnimationFrame(paintNext);
  };
  const queuePaint = (c) => {
    if (!paintQueue.includes(c)) paintQueue.push(c);
    if (!paintRaf) paintRaf = requestAnimationFrame(paintNext);
  };
  const pictureIO = new IntersectionObserver((entries) => {
    for (const en of entries) {
      const pic = pictures.get(en.target);
      if (!pic) continue;
      pic.near = en.isIntersecting;
      const r = en.boundingClientRect;
      if (r.width && r.height && (!pic.rect || Math.round(r.width) !== Math.round(pic.rect.width) || Math.round(r.height) !== Math.round(pic.rect.height))) {
        pic.rect = { width: r.width, height: r.height };
        pic.dirty = true;
        pic.job = null;
      }
      if (pic.near && pic.dirty) queuePaint(en.target);
    }
  }, { rootMargin: '75% 0px 75% 0px' });
  const picture = (c, steps, done) => { pictures.set(c, { steps, done, dirty: true, near: false, rect: null, job: null }); pictureIO.observe(c); };
  const once = (fn) => function* (g, w, h) { fn(g, w, h); };
  // the blend: the four colours, then one bottle per step
  function* blendSteps(g, w, H) {
    const xs = SEASONS.map((_, i) => w * (0.125 + i * 0.25));
    const bw = Math.min(w * 0.12, H * 0.43);
    drawBand(g, brushes, w, H, xs, state.values, H * 0.8);
    const labels = [];
    for (let i = 0; i < SEASONS.length; i++) {
      yield;
      const s = SEASONS[i];
      labels.push(drawBottle(g, brushes, xs[i], H * 0.9, bw, PAINT[s], state.values[s] / 100, 21 + i, { letters: true, season: s }));
    }
    return labels;
  }
  picture(blendArt, blendSteps, (geo, labels) => { blendGeo = geo; placeWords(blendWords, labels); });
  picture(cardArt, once((g, w, h) => { cardGeo = { g, w, h }; drawCardArt(); }), (geo) => { cardGeo = geo; });
  picture(vials, once((g, w, h) => drawSampler(g, brushes, w, h)));
  picture(crate, once((g, w, h) => drawCrate(g, brushes, w, h)));
  picture(swatch, once((g, w, h) => drawSwatch(g, brushes, w, h)));
  picture(atelierArt, (g, w, h) => drawAtelierSteps(g, brushes, w, h, { letters: true }), (geo, labels) => placeWords(atelierWords, labels));
  // the observer reports a new size only when visibility changes: after a resize, look again
  const remeasure = () => { for (const c of pictures.keys()) { pictureIO.unobserve(c); pictureIO.observe(c); } };
  // the blend changed before its first paint finished: start that paint again with the new amounts
  function restartPicture(c) {
    const pic = pictures.get(c);
    if (!pic || !pic.job) return;
    pic.job = null;
    pic.dirty = true;
    if (pic.near) queuePaint(c);
  }
  function paintSoon() { for (const [c, pic] of pictures) if (pic.near && pic.dirty) queuePaint(c); }
  let resizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { remeasure(); placeEngraved(); fitEpigraphs(); }, 160); });
  installEdgeMasks().catch(() => {});
  loadBrushes().then((b) => {
    brushes = b;
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(() => paintSoon());
  }).catch((e) => console.warn('[page] brush scan did not load', e));

  // ---- built before the visitor steps in ---------------------------------------------------------------
  // As soon as the first season is ready (the waiting screen still covers everything), the bar, the scene words and
  // the end part are laid out and the first words are drawn, so stepping in costs nothing but the fade.
  let builtResolve;
  const builtOnce = new Promise((r) => { builtResolve = r; });
  function build() {
    if (state.built) return builtOnce;
    state.built = true;
    root.classList.add('pg-built');
    // Everything here runs in one go, on the frame the waiting screen reaches 100%. Each part is timed, because a
    // long frame right there is what a visitor feels as the jolt into the opening room (21/9). Names: pg:b-*.
    const T = (name, fn) => { const t0 = performance.now(); fn(); performance.measure(`pg:b-${name}`, { start: t0, end: performance.now() }); };
    T('step', setStep);
    T('tone', setTone);
    T('place', placeEngraved);
    T('paint', paintSoon);
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const frames = new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    // the new layout and its fonts settle behind the waiting screen (fonts are not waited for more than 0.6 s)
    Promise.all([frames, Promise.race([fontsReady, new Promise((r) => setTimeout(r, 600))])])
      .then(() => { performance.mark('pg:fonts'); return new Promise((r) => requestAnimationFrame(() => r())); })
      .then(() => { performance.mark('pg:built'); builtResolve(); });
    return builtOnce;
  }

  // ---- events from the core -------------------------------------------------------------------------
  api.on('progress', (p) => loader.progress(p));
  // the bar is told to finish only when the room behind it is settled, not the moment the core is ready
  api.on('ready', () => { const settled = build(); warmWord(); hideCoreNotes(); loader.ready(settled); });
  api.on('error', (why) => { console.info('[page] reading version:', why); goNo3d(); build(); loader.fail(); });
  api.on('season', (s) => {
    if (!s) return;
    const index = s.intro ? -1 : Number.isFinite(s.index) ? s.index : SEASONS.indexOf(s.id);
    const u = Number.isFinite(s.u) ? s.u : 0;
    const changedSeason = index !== state.season.index;
    state.season = { index, u, intro: !!s.intro, phase: s.phase || null, p: Number.isFinite(s.p) ? s.p : null };
    if (changedSeason) { setTone(); hideCoreNotes(); }
    setBrandSeason();
    setStep();
  });
  api.on('focus', (open) => {
    state.focusOpen = !!(open && (open.open ?? open));
    root.classList.toggle('pg-focus', state.focusOpen);
    if (state.focusOpen) {
      const sn = (open && open.id) || SEASONS[state.season.index];
      hideCoreNotes();
      showFocusCard(sn);
    } else hideFocusCard();
    setStep();
  });
  // Esc works inside the season frame already; it has to work here too, because once the card's close button has the
  // keyboard the key press never reaches the frame
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !state.focusOpen) return;
    e.preventDefault();
    closeFocus();
  });

  // ---- first paint -------------------------------------------------------------------------------------
  root.lang = state.lang;
  document.title = t('meta.title');
  // the painted tab icon (brand/chom/logo/favicon.svg, copied into page/kit by tools/build-logo.mjs)
  if (!document.querySelector('link[rel="icon"][href*="chom"]')) {
    document.head.append(h('link', { rel: 'icon', type: 'image/svg+xml', href: new URL('./kit/favicon.svg', import.meta.url).href }));
  }
  renderBlend(false);
  updateHints();
  setTone();
  setStep();
  placeWisp();
  placeEngraved();
  fitEpigraphs();
  api.setLanguage(state.lang);
  if (state.no3d) { goNo3d(); build(); loader.fail(); }

  const page = {
    // while Mike is choosing how the bar sits on the scene
    setNav(mode) { if (!NAV_MODES.includes(mode)) return; navMode = mode; root.dataset.nav = mode; },
    setHead(mode) { if (!HEAD_MODES.includes(mode)) return; headMode = mode; root.dataset.head = mode; },
    get head() { return headMode; },
    get nav() { return navMode; },
    get state() { return { ...state, values: { ...state.values }, step: shownStep }; },
    setValues(v) { Object.assign(state.values, v); state.touched = true; renderBlend(true); },
    goNo3d,
    copy: COPY,
    bottleRect: (i) => { try { return rawApi.bottleRect ? rawApi.bottleRect(i) : null; } catch { return null; } },
  };
  window.__chomPage = page;
  return page;
}

export default mountPage;
