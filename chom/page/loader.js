// Chớm page layer: the waiting screen.
// The name writes itself. Each brush stroke of "Chớm" is let in along the line the hand drew, in the order a hand
// makes them, and how far the writing has got IS the real load — the last stroke, the tone mark that turns into
// smoke, closes exactly at a true 100%. Then the smoke goes on rising while the screen gives way, and the scent
// over the bottle in the opening room takes it up, so the two read as one movement.
// It never runs ahead of the load: there is no clock here, only the number the core reports.
// The page is in Vietnamese only (Mike, 2026-09-18): there is no language chooser any more.
import { LOGO } from './logo.js';
import { ownIds } from './own-ids.js';

const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids) if (kid != null) el.append(kid);
  return el;
};

export function createLoader({ copy, onEnter, beforeEnter, nameTarget }) {
  const vi = copy;
  // the line under the name on the waiting screen says who this is, not which season it is (Mike, 2026-09-18)
  const label = vi['brand.descriptor'] || vi['loader.label'];

  const swatch = h('div', { class: 'pg-loader__swatch', 'aria-hidden': 'true' });
  const wisp = h('span', { class: 'pg-loader__wisp', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  const pctN = h('span', { class: 'pg-loader__n', text: '0' });
  const meter = h('div', { class: 'pg-loader__meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', 'aria-label': label },
    h('p', { class: 'pg-loader__label' }, h('span', { lang: 'vi', text: label })),
    h('p', { class: 'pg-loader__pct', 'aria-hidden': 'true' }, pctN, h('span', { class: 'pg-loader__unit', text: vi['loader.unit'] })));
  const error = h('div', { class: 'pg-loader__error', role: 'alert', hidden: true },
    h('p', { lang: 'vi', text: vi['loader.error'] }));

  const el = h('div', { class: 'pg-loader', id: 'pg-loader' },
    h('div', { class: 'pg-loader__in' }, swatch, meter, error));

  // ---- the name, written by the load ---------------------------------------
  // The drawing carries one mask path per brush stroke, with the order of the hand (--i) and the length of the
  // centre line (--l). Painting to a given point simply means letting each stroke in as far as the load has come.
  let nets = [];
  let turns = 1;
  const setupName = () => {
    const tpl = document.createElement('template');
    tpl.innerHTML = LOGO.wordmark || '';
    // ids of its own: the opening room holds the same drawing, and url(#…) finds the first copy in the document
    const svg = ownIds(tpl.content.firstElementChild);
    if (!svg) return;
    swatch.replaceChildren(svg, wisp);
    nets = [...svg.querySelectorAll('.pg-net')].map((el) => ({
      el,
      len: parseFloat(el.style.getPropertyValue('--l')) || 100,
      order: parseFloat(el.style.getPropertyValue('--i')) || 1,
    }));
    turns = Math.max(1, ...nets.map((n) => n.order));
    // the smoke leaves from the point the drawing names, in its own coordinates
    const vb = (svg.getAttribute('viewBox') || '0 0 450 178').split(/\s+/).map(Number);
    const at = (svg.getAttribute('data-wisp') || '334,8').split(',').map(Number);
    if (vb[2] && Number.isFinite(at[0])) {
      wisp.style.left = `${((at[0] - vb[0]) / vb[2]) * 100}%`;
      wisp.style.top = `${((at[1] - vb[1]) / vb[3]) * 100}%`;
    }
    draw();
  };
  let lastDrawn = -1;
  const draw = () => {
    if (!nets.length) return;
    const k = Math.round(shown * 1000);
    if (k === lastDrawn) return;
    lastDrawn = k;
    // the strokes share the load between them: stroke 1 is written over the first slice of it, and so on
    for (const n of nets) {
      const f = Math.max(0, Math.min(1, shown * turns - (n.order - 1)));
      n.el.style.strokeDasharray = String(n.len);
      n.el.style.strokeDashoffset = String(n.len * (1 - f));
    }
  };

  // ---- progress (display never runs ahead of the real value) -----------------
  let target = 0, shown = 0, raf = 0, last = 0, finished = false, failed = false, entered = false, lastAria = -1;
  const tick = (now) => {
    raf = 0;
    // real time between frames: while the core builds the next seasons, frames can be far apart, and the number
    // must still catch up with the real load
    const dt = Math.min(0.3, last ? (now - last) / 1000 : 0.016);
    last = now;
    const gap = target - shown;
    if (gap > 0) {
      // once the real load is complete, finish in about a fifth of a second
      const speed = target >= 1 ? Math.max(3, gap * 5) : Math.max(0.3, gap * 3.2);
      shown += Math.min(gap, dt * speed);
      if (target - shown < 0.0015) shown = target;
    }
    const pct = Math.floor(shown * 100 + 1e-6);
    pctN.textContent = String(pct);
    const aria = Math.floor(pct / 10) * 10;
    if (aria !== lastAria) { meter.setAttribute('aria-valuenow', String(aria)); lastAria = aria; }
    const td = performance.now();
    draw();
    if (shown >= 1) performance.measure('pg:l-draw-last', { start: td, end: performance.now() });
    if (shown >= 1 && !finished) {
      finished = true;
      performance.mark('pg:loader-full');
      const tc = performance.now();
      complete();
      performance.measure('pg:l-complete', { start: tc, end: performance.now() });
      return;
    }
    if (shown < target) raf = requestAnimationFrame(tick);
    else last = 0;
  };
  const kick = () => { if (!raf && !finished) raf = requestAnimationFrame(tick); };

  const complete = () => {
    if (failed) return;
    // a true 100%: the page behind is laid out first, then the waiting screen gives way to the opening room
    Promise.resolve(beforeEnter ? beforeEnter() : null).then(() => enter());
  };
  // ---- the name goes to its place -------------------------------------------------------------------------
  // There is only ever ONE "Chớm" on the screen. The waiting screen's name does not fade out while the opening
  // room's name fades in — that read as a jump even though no frame was dropped (Mike, 21/9). Instead the drawing
  // itself is lifted out of the waiting screen, laid over everything at exactly the size and place it already had,
  // and moved to where the opening room keeps its name. The room's own name is held invisible (its space kept, so
  // nothing in the layout moves) until the travelling one arrives, and then the two are swapped in one go — the
  // same frame, so there is never a frame with two.
  // The move is a transform only: the browser can do it on the compositor, and nothing is laid out again.
  // The ink changes colour along the way because the ground does: the waiting screen is cream with dark ink, the
  // room is dark with ivory. The two custom properties are stepped every frame; it is one small drawing.
  // Two beats, and only one of them moves.
  //   1. the ground goes and the ink turns, while the name stands still (0 - 300 ms).
  //   2. the name travels to its place (300 - 860 ms). Nothing but a transform, so the browser moves the layer it
  //      has already drawn and never paints the drawing again. Measured: this is what keeps the frames even.
  //
  // WHEN THE INK TURNS (21/9 night). Dark ink reads on the cream, ivory ink on the room, and while the one gives way
  // to the other there is a stretch where neither reads: the ink has to turn inside it. page/qa/fly-ink.mjs measured
  // the name against its ground in every frame, six runs: the turn is safe while the waiting screen is between about
  // 0.57 and 0.65 opaque in every run (the room behind the name moves — the scent drifts across it — so each run's own
  // window sits somewhere in 0.46 - 0.81), and best near 0.6, at 3.9:1 both ways.
  // It used to be a 240 ms timer. By then the cream was 90% gone: the name stood dark on dark, 1.4:1, for about
  // 150 ms, and when the page was busy the timer ran later still (up to 400 ms). A timer on the page cannot hit a
  // window that narrow while the ground fades on its own clock.
  // So the ink does not turn on the page's clock any more. The name is drawn twice, dark and ivory, one over the
  // other, both ready before the step in; the turn is a change of which one shows (opacity, nothing repainted), and
  // it is an animation started at the same instant as the ground's fade, on the same clock, with the step placed
  // where the ground is TURN_AT opaque. The browser runs both off the page, so a busy page cannot put them apart.
  // And the ground now fades evenly. It used to go fast at first (two thirds gone in the first 100 ms), which put the
  // whole safe stretch into two frames, so the frame that shows the step could land anywhere in it. Even, it still
  // ends where it did (a tenth left at 300 ms, when the name sets off) and the frame that shows the step can only be
  // one frame's worth, 0.05, past the mark.
  const GROUND_MS = 330;
  const TURN_AT = 0.55;      // how opaque the waiting screen still is when the ink turns (measured, see above)
  const HOLD_MS = 300;       // it sets off as the room arrives — the room arriving is why it goes home.
                             // Measured: the cream is gone 300 ms after the step in. Holding longer than that left
                             // the name standing in the middle of a room that was already there.
  const FLY_MS = 560;
  const readInk = (node) => {
    const cs = getComputedStyle(node);
    const p = (n, d) => (cs.getPropertyValue(n) || '').trim() || d;
    return [p('--pg-logo-ink', '#211A17'), p('--pg-logo-accent', '#C2185B')];
  };
  let flyEl = null;
  const flyName = (onLanded, fade, groundMs) => {
    const from = swatch.getBoundingClientRect();
    const target = typeof nameTarget === 'function' ? nameTarget() : null;
    // nothing to fly to (no 3D, the drawing missing): the room simply takes its own name back
    if (!target || !(from.width > 8) || !(target.rect && target.rect.width > 8)) {
      if (target && target.show) target.show();
      onLanded(false);
      return;
    }
    const to = target.rect;
    // The smoke stays where it was born. It left the tone mark on its way to the scent over the bottle, and smoke
    // does not follow the letters it came from: carrying it to the top left corner would take it away from the one
    // thing it was drawn to meet.
    const wr = wisp.getBoundingClientRect();
    wisp.style.position = 'fixed';
    wisp.style.left = `${wr.left}px`;
    wisp.style.top = `${wr.top}px`;
    document.body.appendChild(wisp);
    flyEl = document.createElement('div');
    flyEl.className = 'pg-flyname';
    flyEl.setAttribute('aria-hidden', 'true');
    Object.assign(flyEl.style, {
      position: 'fixed', left: `${from.left}px`, top: `${from.top}px`,
      width: `${from.width}px`, height: `${from.height}px`,
      transformOrigin: '0 0', willChange: 'transform', zIndex: '61', pointerEvents: 'none',
      transform: 'translate(0px, 0px) scale(1)',
    });
    // the name twice, one over the other: the waiting screen's own drawing in its dark ink, and a copy (ids of its own)
    // in the room's ivory. Each is its own layer, drawn before anything moves.
    const ink0 = readInk(el);
    const ink1 = target.ink || ink0;
    const darkSvg = swatch.querySelector('svg');
    const layer = (svg, ink, on) => {
      const d = document.createElement('div');
      Object.assign(d.style, { position: 'absolute', inset: '0', willChange: 'opacity', opacity: on ? '1' : '0' });
      d.style.setProperty('--pg-logo-ink', ink[0]);
      d.style.setProperty('--pg-logo-accent', ink[1]);
      d.append(svg);
      return d;
    };
    const ivorySvg = ownIds(darkSvg.cloneNode(true));
    const dark = layer(darkSvg, ink0, true);
    const ivory = layer(ivorySvg, ink1, false);
    flyEl.append(dark, ivory);
    document.body.appendChild(flyEl);
    // the turn: a step, on the ground's own clock, where the ground is TURN_AT opaque
    const at = 1 - TURN_AT;      // the ground fades evenly, so this is where along the fade it is TURN_AT opaque
    const step = (from, to) => [{ opacity: from, offset: 0, easing: 'steps(1, end)' }, { opacity: to, offset: at }, { opacity: to, offset: 1 }];
    const turns = [dark.animate(step(1, 0), { duration: groundMs, fill: 'both' }), ivory.animate(step(0, 1), { duration: groundMs, fill: 'both' })];
    const t0 = document.timeline.currentTime;
    for (const a of [fade, ...turns]) if (a) a.startTime = t0;
    turns[1].ready.then(() => performance.mark('pg:fly-turn-set')).catch(() => {});

    const dx = to.left - from.left, dy = to.top - from.top, k = to.width / from.width;
    let landed = false;
    const land = () => {
      if (landed) return;
      landed = true;
      // the swap, in one go: the room's own name is shown and the travelling one taken away before the browser
      // draws again, so no frame can hold both
      if (target.show) target.show();
      if (flyEl) { flyEl.remove(); flyEl = null; }
      onLanded(true);
    };
    // beat 2: it goes back to its place. One ease out, no bounce and no spin — it is going home, not performing.
    setTimeout(() => {
      if (landed || !flyEl) return;
      performance.mark('pg:fly-go');
      flyEl.style.transition = `transform ${FLY_MS}ms cubic-bezier(.22,.61,.36,1)`;
      flyEl.style.transform = `translate(${dx}px, ${dy}px) scale(${k})`;
      flyEl.addEventListener('transitionend', (e) => { if (e.propertyName === 'transform') land(); }, { once: true });
    }, HOLD_MS);
    setTimeout(land, HOLD_MS + FLY_MS + 400);      // never leave the room without its name
  };

  const enter = () => {
    if (entered) return;
    entered = true;
    performance.mark('pg:enter');
    el.classList.add('is-smoking');
    const done = () => { el.hidden = true; };
    setTimeout(done, 2100);
    const to = performance.now();
    onEnter && onEnter();
    performance.measure('pg:l-onEnter', { start: to, end: performance.now() });
    // the ground goes, on an animation the name's ink can be put on the same clock with (see TURN_AT)
    const less = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const groundMs = less ? 300 : GROUND_MS;
    let fade = null;
    try {
      fade = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: groundMs, easing: 'linear', fill: 'forwards' });
      fade.finished.then(done).catch(() => {});
    } catch { el.style.opacity = '0'; }
    el.classList.add('is-leaving');
    performance.mark('pg:fly-start');
    flyName(() => performance.mark('pg:fly-end'), fade, groundMs);
  };

  const api = {
    el,
    mounted() {
      setupName();
    },
    progress(p) {
      if (failed || !Number.isFinite(p)) return;
      const v = Math.max(0, Math.min(1, p));
      if (v > target) { target = v; kick(); }
    },
    // The core says the first street is ready. The bar only reaches 100% once the page behind is really settled —
    // pass the promise that says so. Measured on 21/9: reaching 100% first meant the bar sat full for 104-299 ms
    // while the web fonts came in, and the visitor felt that wait, and then the font swap itself, as the jolt into
    // the opening room. Waiting here instead keeps the percentage honest (the page is not ready yet) and puts the
    // repaint behind the waiting screen, where nobody sees it.
    ready(settled) {
      performance.mark('pg:core-ready');
      if (settled && typeof settled.then === 'function') {
        // never let a promise that does not keep its word hold the visitor at the door
        Promise.race([settled, new Promise((r) => setTimeout(r, 3000))]).then(() => api.progress(1));
      } else api.progress(1);
    },
    fail() {
      if (failed || entered) return;
      failed = true;
      el.classList.add('is-failed');
      error.hidden = false;
      setTimeout(() => Promise.resolve(beforeEnter ? beforeEnter() : null).then(() => enter()), 3200);
    },
    get entered() { return entered; },
    enter,
  };
  return api;
}
