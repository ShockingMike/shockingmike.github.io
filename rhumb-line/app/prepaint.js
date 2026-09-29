/* Rhumb Line · app/prepaint.js
   The page's views drawn once behind the still-opaque loader (scene/boot.js, prepaint), one after another, so Chrome
   builds its own drawing programs for them before the reader arrives: paper grain, card shadows, tag masks, rotated
   prints, scaled photos, the dial turned, the dialogs. Without this, the first time each of them appeared the desk froze
   for 50-350 ms on a first visit (Chrome on Windows, 2026-09-29). Motion and layout are not touched: every view only
   toggles classes and attributes and puts each one back.
   No photograph is downloaded: while html.is-prepaint is on, the prints' own lazy <img> stay out of layout
   (index.html) and a plain picture of the same size, made here, stands in for them.
   prepaintViews() returns [{ name, show(), hide() }]; show() may return a Promise (a picture to decode first). */
import { $, $$ } from './dom.js';

// Stand-in pictures as large as the prints (so they are drawn scaled down like them), WebP like the photos (the browser
// decodes and draws each image format its own way). One is tagged Adobe RGB (1998), like guatemala-1.webp: a tagged
// picture is drawn with a colour conversion of its own. The profile below is that photo's own ICC profile.
const ADOBE_RGB = 'AAACMEFEQkUCEAAAbW50clJHQiBYWVogB88ABgADAAAAAAAAYWNzcEFQUEwAAAAAbm9uZQAAAAAAAAAAAAAAAAAAAAAAAPbWAAEAAAAA0y1BREJFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKY3BydAAAAPwAAAAyZGVzYwAAATAAAABrd3RwdAAAAZwAAAAUYmtwdAAAAbAAAAAUclRSQwAAAcQAAAAOZ1RSQwAAAdQAAAAOYlRSQwAAAeQAAAAOclhZWgAAAfQAAAAUZ1hZWgAAAggAAAAUYlhZWgAAAhwAAAAUdGV4dAAAAABDb3B5cmlnaHQgMTk5OSBBZG9iZSBTeXN0ZW1zIEluY29ycG9yYXRlZAAAAGRlc2MAAAAAAAAAEUFkb2JlIFJHQiAoMTk5OCkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAADzUQABAAAAARbMWFlaIAAAAAAAAAAAAAAAAAAAAABjdXJ2AAAAAAAAAAECMwAAY3VydgAAAAAAAAABAjMAAGN1cnYAAAAAAAAAAQIzAABYWVogAAAAAAAAnBgAAE+lAAAE/FhZWiAAAAAAAAA0jQAAoCwAAA+VWFlaIAAAAAAAACYxAAAQLwAAvpw=';
let pictures = null;
// a lossy WebP from the canvas, and the same picture rewrapped (VP8X + ICCP + VP8) with the profile
async function withProfile(blob, W, H) {
  const src = new Uint8Array(await blob.arrayBuffer());
  const dv = new DataView(src.buffer);
  let vp8 = null;
  for (let o = 12; o + 8 <= src.length;) {
    const id = String.fromCharCode(src[o], src[o + 1], src[o + 2], src[o + 3]), size = dv.getUint32(o + 4, true);
    if (id === 'VP8 ') { vp8 = src.subarray(o, o + 8 + size + (size & 1)); break; }
    o += 8 + size + (size & 1);
  }
  if (!vp8) return null;
  const icc = Uint8Array.from(atob(ADOBE_RGB), (c) => c.charCodeAt(0));
  const iccChunk = 8 + icc.length + (icc.length & 1), total = 4 + 18 + iccChunk + vp8.length;
  const out = new Uint8Array(8 + total), o = new DataView(out.buffer);
  const tag = (at, t) => { for (let i = 0; i < 4; i++) out[at + i] = t.charCodeAt(i); };
  tag(0, 'RIFF'); o.setUint32(4, total, true); tag(8, 'WEBP');
  tag(12, 'VP8X'); o.setUint32(16, 10, true); out[20] = 0x20; // ICC flag
  const w = W - 1, h = H - 1;
  out[24] = w & 255; out[25] = (w >> 8) & 255; out[26] = (w >> 16) & 255; out[27] = h & 255; out[28] = (h >> 8) & 255; out[29] = (h >> 16) & 255;
  tag(30, 'ICCP'); o.setUint32(34, icc.length, true); out.set(icc, 38);
  out.set(vp8, 38 + (iccChunk - 8));
  return new Blob([out], { type: 'image/webp' });
}
function standIns() {
  if (pictures) return pictures;
  pictures = (async () => {
    try {
      const W = 1400, H = 933, c = document.createElement('canvas');
      c.width = W; c.height = H;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#6d5a41'); g.addColorStop(1, '#2f3b2a');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      const plain = await new Promise((r) => c.toBlob(r, 'image/webp', 0.6));
      if (!plain) return null;
      const tagged = await withProfile(plain, W, H).catch(() => null);
      return { plain: URL.createObjectURL(plain), adobe: tagged ? URL.createObjectURL(tagged) : null };
    } catch (e) { return null; }
  })();
  return pictures;
}

export function prepaintViews() {
  const html = document.documentElement;
  const undo = [];
  const later = (fn) => undo.push(fn);
  const cls = (el, name, on = true) => {
    if (!el || el.classList.contains(name) === on) return;
    el.classList.toggle(name, on);
    later(() => el.classList.toggle(name, !on));
  };
  const attr = (el, name, value) => {
    if (!el) return;
    const had = el.hasAttribute(name), before = el.getAttribute(name);
    if (value === null) el.removeAttribute(name); else el.setAttribute(name, value);
    later(() => { if (had) el.setAttribute(name, before); else el.removeAttribute(name); });
  };
  const text = (el, value) => {
    if (!el) return;
    const before = el.textContent;
    el.textContent = value;
    later(() => { el.textContent = before; });
  };
  const restore = () => { while (undo.length) undo.pop()(); };
  const panel = (id) => $(`.panel[data-object="${id}"]`);
  const openPanel = (id) => { cls(html, 'panel-open'); cls(panel(id), 'is-open'); attr(panel(id), 'data-more', 'true'); };
  // group: views that show the same boxes in another state (boot.js leaves a frame between two of them)
  const view = (name, show, group = null) => ({ name, show, hide: restore, group });
  // a panel's body scrolled (0..1 of its height): what lies below the fold is drawn only once it is scrolled to
  const scrolled = (id, k) => {
    const body = panel(id) && $('.panel__body', panel(id));
    if (!body) return;
    const before = body.scrollTop;
    body.scrollTop = Math.round((body.scrollHeight - body.clientHeight) * k);
    later(() => { body.scrollTop = before; });
  };
  // how many screens of the panel's body there are (1 = it all fits)
  const screens = (id) => { const body = panel(id) && $('.panel__body', panel(id)); return body && body.clientHeight ? body.scrollHeight / body.clientHeight : 1; };
  // a dialog opened for real (top layer, backdrop), nearly transparent while it is drawn (html.prepaint-modal)
  const modal = (dlg, animating) => {
    if (!dlg || typeof dlg.showModal !== 'function' || dlg.open) return;
    const active = document.activeElement;
    cls(html, 'prepaint-modal');
    if (animating) cls(html, 'prepaint-modal-anim');
    attr(dlg, 'inert', ''); // no focus moves into it, nothing is announced
    dlg.showModal();
    later(() => { if (dlg.open) dlg.close(); if (active && active !== document.body && active.focus) active.focus({ preventScroll: true }); });
  };
  // hover looks (index.html copies them for .prepaint-hover); `moving`: as during their transition (own layer)
  const hover = (moving, ...els) => els.forEach((el) => { cls(el, 'prepaint-hover'); if (moving) cls(el, 'prepaint-moving'); });
  // keyboard focus rings (index.html draws .prepaint-focus like :focus-visible)
  const ring = (...els) => els.forEach((el) => cls(el, 'prepaint-focus'));

  // stand-in pictures in every print frame (their own images stay unloaded, see above)
  const swatches = [];
  let urls = null;
  const addSwatches = async () => {
    urls = await standIns();
    if (!urls) return;
    for (const frame of $$('[data-qa="photo"] .photo__frame')) {
      const own = $('img', frame);
      const s = new Image();
      s.className = 'prepaint-swatch';
      s.alt = '';
      if (own) { s.width = own.width || 1400; s.height = own.height || 933; }
      // the frames of photos tagged with a colour profile get the tagged stand-in
      s.src = (frame.closest('[data-photo="guatemala-1"]') && urls.adobe) || urls.plain;
      frame.appendChild(s);
      swatches.push(s);
    }
    await Promise.all(swatches.map((s) => (s.decode ? s.decode().catch(() => {}) : null)));
  };

  const legs = $$('[data-qa="leg"]');
  const chart = panel('chart');
  const sacks = $$('[data-qa="chest-sack"]');
  const dial = $('[data-dial-svg]');
  const quizResult = $('[data-qa="quiz-result"]');
  const interlude = $('[data-qa="interlude"]');
  const lightbox = $('[data-qa="lightbox"]');
  const modalBox = $('[data-qa="modal-subscribe"]');
  const tagName = $('[data-objtag-name]'), tagHint = $('[data-objtag-hint]');
  // phones: no pointer to hover, fewer views (each costs a few frames of loading on a slower device)
  const phone = matchMedia('(pointer: coarse)').matches;

  // in a panel: the first thing of each kind hovered, the second as during its hover transition, the third focused
  const extras = (id) => {
    if (phone) return;
    const p = panel(id);
    for (const sel of ['[data-qa="photo"]', '.tag', '.stampbtn', '.opt', '.port', '.sack__go']) {
      const all = $$(sel, p);
      if (all[0]) hover(false, all[0]);
      if (all[1]) hover(true, all[1]);
    }
    ring($('.photo__frame', p), $('[data-qa="panel-close"]', p), $('.tag', p), $('.stampbtn', p), $('[data-qa="quiz-option"]', p));
  };
  // a panel at the top, half-way and at the end of its body, as far as it runs past one screen
  const panelViews = (name, id, setup, stops = phone ? [0] : [0, 0.5, 1]) => stops.map((k) => view(name + (k ? `, scrolled ${k * 100}%` : ''), () => {
    setup(); extras(id);
    const n = screens(id);
    if ((k === 1 && n < 1.15) || (k === 0.5 && n < 2.1)) return 'skip';
    if (k) scrolled(id, k);
  }, id));
  const leg = () => { openPanel('chart'); cls(chart, 'has-leg'); if (legs[0]) cls(legs[0], 'is-current'); };
  const berth = () => { openPanel('crew'); attr(quizResult, 'hidden', null); };
  const enlarge = (kind, animating) => view(`photo enlarged (${kind})${animating ? ', opening' : ''}`, () => {
    leg();
    const img = lightbox && $('.lightbox__img', lightbox);
    const url = urls && (urls[kind] || urls.plain);
    if (img && url) { attr(img, 'src', url); attr(img, 'width', '1400'); attr(img, 'height', '933'); }
    text(lightbox && $('.lightbox__caption', lightbox), 'Huehuetenango, Guatemala');
    if (!phone) ring(lightbox && $('[data-qa="lightbox-close"]', lightbox));
    modal(lightbox, animating);
  }, 'lightbox');
  // the four looks of a sea moment at once: the moment itself and three copies (removed again)
  const seaMoments = view('sea moments', () => {
    if (!interlude) return;
    attr(interlude, 'hidden', null); attr(interlude, 'data-moment', '');
    text($('[data-interlude-text]', interlude), 'The glass is falling. Green water over the porthole.');
    ['night', 'homeward', 'cape'].forEach((m, i) => {
      const c = interlude.cloneNode(true);
      c.removeAttribute('id'); c.dataset.moment = m; c.setAttribute('aria-hidden', 'true');
      c.style.top = `${8 + i * 22}%`;
      interlude.after(c);
      later(() => c.remove());
    });
  });

  return [
    { name: 'pictures', quick: true, show: addSwatches, hide() {} },
    ...(phone ? [] : [view('desk, hovered', () => {
      cls(html, 'is-prepaint-title');
      hover(false, $('.titlecard .tag')); hover(true, $('.stamp')); ring($('.objbtn'), $('.sound__toggle'));
    })]),
    view(phone ? 'desk menu' : 'desk menu, name tag', () => { cls(html, 'menu-open'); if (!phone) { cls($('[data-objtag]'), 'is-shown'); text(tagName, 'Ship’s log'); text(tagHint, 'Why we sail'); } }),
    ...panelViews('log', 'log', () => openPanel('log'), phone ? [0] : [0, 1]),
    ...panelViews('chart', 'chart', () => openPanel('chart'), [0]),
    ...panelViews('chart, a leg', 'chart', leg, phone ? [0, 0.5] : [0, 0.5, 1]),
    view('chart, sailing', () => {
      openPanel('chart'); cls(chart, 'has-leg'); cls(chart, 'is-sailing');
      attr($('[data-qa="chart-sailing"]'), 'hidden', null);
      text($('[data-sailing-line]'), 'Under way, bound for Santo Tomás de Castilla');
    }, 'chart'),
    ...panelViews('chest', 'chest', () => { openPanel('chest'); sacks.slice(0, 3).forEach((s) => attr(s, 'data-found', 'true')); }, phone ? [0, 0.5] : [0, 1]),
    ...panelViews('compass, dial turned', 'compass', () => { openPanel('compass'); if (dial) attr(dial, 'style', `${dial.getAttribute('style') || ''};transform:rotate(17deg)`); }, phone ? [0] : [0, 1]),
    ...panelViews('crew list, berth', 'crew', berth, phone ? [0] : [0, 1]),
    ...panelViews('letter', 'letter', () => openPanel('letter'), phone ? [0] : [0, 1]),
    ...panelViews('cup', 'cup', () => openPanel('cup'), phone ? [0] : [0, 1]),
    // the enlarged photo: the tagged picture drawn still, the plain one while the dialog fades in (its own layer)
    enlarge('adobe', false),
    enlarge('plain', true),
    view('subscribe dialog', () => { berth(); modal(modalBox, false); }, 'subscribe'),
    ...(phone ? [] : [view('subscribe dialog, opening', () => { berth(); modal(modalBox, true); }, 'subscribe')]),
    seaMoments,
    view('landfall', () => { cls(html, 'landfall-open'); }),
    { name: 'pictures away', quick: true, show() {}, hide() {
      swatches.splice(0).forEach((s) => s.remove());
      if (urls) Object.values(urls).forEach((u) => { if (u) URL.revokeObjectURL(u); });
      urls = null; pictures = null;
    } }
  ];
}
