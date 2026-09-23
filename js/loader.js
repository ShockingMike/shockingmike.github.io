/* loader.js — the wait, turned into a record coming up to speed.

   The label on screen is a platter: it starts barely turning and reaches exactly 33⅓ turns a minute when the shop
   is built. The number under it is not a guess — every piece of work (the fonts, each cover photo, the 3D code,
   each printed sleeve, the room, the warm-up passes, the pages) reports in as it finishes, and the percentage is
   the share of that work which is genuinely done. It can only go up. When it reaches 100 the platter flies into
   the corner and becomes the label's mark, so the wait and the page are one continuous thing.

   The platter turns with the Web Animations API on a transform alone, which the browser runs off the main thread:
   even while a sleeve is being printed and everything else is frozen, the record keeps turning. */

import { T, getLang, fill } from './lang.js';

const RPM = 100 / 3;                 // 33⅓ turns a minute
const TURN_MS = 60000 / RPM;         // one turn at full speed: 1800 ms
const IDLE = 0.12;                   // the platter is already creeping when the screen appears
const hold = (ms) => new Promise((r) => setTimeout(r, ms));
// a real paint, not just a frame: the number on screen has to change before the next lump of work starts
const painted = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

/** @param {[string, number][]} plan every piece of work that has to be done, and how heavy it is. */
export function createLoad(plan) {
  const el = document.querySelector('#load');
  const marks = [];                  // when each step landed, for the measuring tools
  const t0 = performance.now();
  if (!el || !el.animate) return { step: async () => {}, fail() {}, finish: async () => {}, marks };

  const flight = el.querySelector('.load__flight');
  const discEl = el.querySelector('#loadDisc');
  const pctEl = el.querySelector('#loadPct');
  const rpmEl = el.querySelector('#loadRpm');
  const topEl = el.querySelector('#loadTop');
  const liveEl = el.querySelector('#loadLive');
  const lang = getLang();
  const t = T(lang);
  const num = (n) => (lang === 'vi' ? n.replace('.', ',') : n);
  if (topEl) topEl.textContent = num(RPM.toFixed(1));   // 33.3 in digits: the ⅓ sign is missing from some fonts
  const root = document.documentElement;
  root.classList.add('is-loading');

  const todo = plan.map(([name, w]) => ({ name, w, done: false }));
  const total = todo.reduce((s, x) => s + x.w, 0) || 1;
  let done = 0, shown = 0, said = -1, over = false, raf = 0, last = performance.now();

  const spin = discEl.animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
    { duration: TURN_MS, iterations: Infinity, easing: 'linear' }
  );
  spin.playbackRate = IDLE;

  const rate = (p) => IDLE + (1 - IDLE) * (p / 100);
  function paint(p) {
    rpmEl.textContent = num((RPM * rate(p)).toFixed(1));
    pctEl.textContent = `${Math.round(p)}%`;
    spin.playbackRate = rate(p);
    const milestone = Math.floor(p / 25) * 25;
    if (milestone > said && milestone < 100) { said = milestone; liveEl.textContent = fill(t.ui.loadingPct, { p: milestone }); }
  }
  function tick(now) {
    const dt = Math.min(60, now - last); last = now;
    const target = 100 * done / total;
    // the number walks up to the truth instead of snapping to it, and never climbs past what is really finished
    if (shown < target) shown = Math.min(target, shown + dt * 0.075);
    paint(shown);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  paint(0);

  function close() {
    if (over) return;
    over = true;
    cancelAnimationFrame(raf);
    try { spin.cancel(); } catch { /* nothing turning any more */ }
    el.hidden = true;
    root.classList.remove('is-loading');
  }

  return {
    marks,
    /** one piece of work is finished: move the number, then let the browser draw before the next lump starts. */
    async step(name) {
      const x = todo.find((s) => !s.done && s.name === name);
      if (x) { x.done = true; done += x.w; marks.push([name, Math.round(performance.now() - t0), Math.round(100 * done / total)]); }
      if (over) return;
      await painted();
    },
    /** no 3D, or something broke: never leave anyone staring at a record that will not start. */
    fail() { close(); },
    /** everything is ready: up to speed, then the platter becomes the mark in the corner. */
    async finish() {
      if (over) return;
      done = total; shown = 100; paint(100);
      liveEl.textContent = t.ui.loadingDone;
      await hold(320);                        // one glance at a record turning at its proper speed
      const mark = document.querySelector('#home .rail__disc');
      const a = discEl.getBoundingClientRect();
      if (mark && flight) {
        const b = mark.getBoundingClientRect();
        const s = b.width / a.width;
        flight.style.transition = 'transform 620ms cubic-bezier(0.5, 0, 0.15, 1)';
        flight.style.transform =
          `translate(${(b.left + b.width / 2) - (a.left + a.width / 2)}px, ${(b.top + b.height / 2) - (a.top + a.height / 2)}px) scale(${s})`;
      }
      el.classList.add('is-going');            // the words go, the dark backing clears, the platter sets off
      await hold(540);
      root.classList.remove('is-loading');     // the mark in the corner comes up under the platter
      await hold(120);
      el.classList.add('is-gone');             // and the platter itself dissolves into it
      await hold(240);
      close();
    }
  };
}
