/* Kern Society · main.js
   Plain JavaScript. GSAP, ScrollTrigger, SplitText and Lenis only enhance the page:
   navigation, licensing, modals, tester, glyph inspector and newsletter work without them. */
(function () {
  'use strict';

  /* ================================================================ Data */

  const FONTS = {
    elastik: {
      name: 'KS Elastik',
      source: 'Roboto Flex',
      foundry: 'Font Bureau',
      url: 'https://fonts.google.com/specimen/Roboto+Flex',
      description: 'A sans on a rubber band, from ultra-condensed to ultra-wide.',
      year: 2019,
      canvas: '"Roboto Flex", "Arial Narrow", Arial, sans-serif',
      axes: [
        { label: 'Weight', tag: 'wght', min: 100, max: 1000, def: 700, step: 1 },
        { label: 'Width', tag: 'wdth', min: 25, max: 151, def: 100, step: 1 },
        { label: 'Optical size', tag: 'opsz', min: 8, max: 144, def: 144, step: 1 },
        { label: 'Slant', tag: 'slnt', min: -10, max: 0, def: 0, step: 1 },
        { label: 'Grade', tag: 'GRAD', min: -200, max: 150, def: 0, step: 1 },
      ],
      specimen: { wght: 800, wdth: 100, opsz: 144, slnt: 0, GRAD: 0 },
      presets: {
        poster: { size: 220, axes: { wght: 1000, wdth: 151, opsz: 144, slnt: 0, GRAD: 150 } },
        editorial: { size: 84, axes: { wght: 360, wdth: 68, opsz: 60, slnt: 0, GRAD: 0 } },
        whisper: { size: 40, axes: { wght: 120, wdth: 25, opsz: 8, slnt: -10, GRAD: -200 } },
      },
    },
    morrow: {
      name: 'KS Morrow',
      source: 'Fraunces',
      foundry: 'Undercase Type',
      url: 'https://fonts.google.com/specimen/Fraunces',
      description: 'A soft serif, a little wonky. Entirely on purpose.',
      year: 2021,
      canvas: '"Fraunces", Georgia, "Times New Roman", serif',
      axes: [
        { label: 'Weight', tag: 'wght', min: 100, max: 900, def: 400, step: 1 },
        { label: 'Optical size', tag: 'opsz', min: 9, max: 144, def: 144, step: 1 },
        { label: 'Softness', tag: 'SOFT', min: 0, max: 100, def: 0, step: 1 },
        { label: 'Wonk', tag: 'WONK', min: 0, max: 1, def: 0, step: 1 },
      ],
      specimen: { wght: 600, opsz: 144, SOFT: 100, WONK: 1 },
      presets: {
        poster: { size: 210, axes: { wght: 900, opsz: 144, SOFT: 0, WONK: 1 } },
        editorial: { size: 80, axes: { wght: 330, opsz: 36, SOFT: 40, WONK: 0 } },
        whisper: { size: 44, axes: { wght: 100, opsz: 9, SOFT: 100, WONK: 1 } },
      },
    },
    relay: {
      name: 'KS Relay',
      source: 'Recursive',
      foundry: 'Arrow Type',
      url: 'https://fonts.google.com/specimen/Recursive',
      description: 'Strict monospace by day, casual handwriting after hours.',
      year: 2024,
      canvas: '"Recursive", ui-monospace, Consolas, monospace',
      axes: [
        { label: 'Weight', tag: 'wght', min: 300, max: 1000, def: 400, step: 1 },
        { label: 'Slant', tag: 'slnt', min: -15, max: 0, def: 0, step: 1 },
        { label: 'Casual', tag: 'CASL', min: 0, max: 1, def: 0, step: 0.01 },
        { label: 'Cursive', tag: 'CRSV', min: 0, max: 1, def: 0.5, step: 0.5 },
        { label: 'Mono', tag: 'MONO', min: 0, max: 1, def: 0, step: 0.01 },
      ],
      specimen: { wght: 800, slnt: 0, CASL: 1, CRSV: 0.5, MONO: 0 },
      presets: {
        poster: { size: 190, axes: { wght: 1000, slnt: 0, CASL: 1, CRSV: 0, MONO: 0 } },
        editorial: { size: 72, axes: { wght: 420, slnt: 0, CASL: 0, CRSV: 0, MONO: 1 } },
        whisper: { size: 38, axes: { wght: 300, slnt: -15, CASL: 1, CRSV: 1, MONO: 0.5 } },
      },
    },
  };

  const PRICING = {
    currency: 'USD',
    types: { desktop: 60, web: 90, app: 240 },
    team: { '1-2': 1, '3-10': 2.5, '11-50': 5, '51+': 10 },
    bundlePercentOff: 30, // applies when every family is selected
  };

  function priceFor(fonts, types, size) {
    if (!fonts.length || !types.length) return 0;
    const base = types.reduce((sum, t) => sum + (PRICING.types[t] || 0), 0);
    const factor = PRICING.team[size] || 1;
    const percent = fonts.length === Object.keys(FONTS).length ? 100 - PRICING.bundlePercentOff : 100;
    return Math.round((fonts.length * base * factor * percent) / 100);
  }

  /* =========================================================== Utilities */

  const html = document.documentElement;
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const mq = (q) => window.matchMedia(q);
  const mqReduce = mq('(prefers-reduced-motion: reduce)');
  const mqMobile = mq('(max-width: 767.98px)');

  // Read at boot: this file runs before the deferred CDN scripts, so the loader can start as early as possible.
  let hasGSAP = false;
  let hasST = false;
  let hasSplit = false;
  let hasLenis = false;
  const detectLibraries = () => {
    hasGSAP = typeof window.gsap !== 'undefined';
    hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
    hasSplit = hasGSAP && typeof window.SplitText !== 'undefined';
    hasLenis = typeof window.Lenis === 'function';
  };

  const Motion = { lenis: null };

  /* Plain equivalent of gsap.matchMedia for modules that must run without GSAP:
     setup(conditions) runs now and again whenever a query flips; its return value cleans up. */
  function watchMedia(queries, setup) {
    const lists = Object.keys(queries).map((key) => [key, mq(queries[key])]);
    let cleanup = null;
    const run = () => {
      if (typeof cleanup === 'function') cleanup();
      const conditions = {};
      lists.forEach(([key, list]) => { conditions[key] = list.matches; });
      cleanup = setup(conditions);
    };
    lists.forEach(([, list]) => list.addEventListener('change', run));
    run();
  }

  function onResize(el, fn) {
    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fn); };
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(schedule);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', schedule);
    return () => window.removeEventListener('resize', schedule);
  }

  /* Font gate.
     document.fonts.load() only starts the downloads. WebKit registers a stylesheet's @font-face rules in
     document.fonts lazily (size is 0 when this script runs) and resolves load() with an empty array, so
     neither an empty result nor a momentarily missing family can mean failure. The decision comes from
     each family's face status (Google registers several unicode-range subsets; one "loaded" face is enough):
     true as soon as every family has a loaded face; after a grace period, false only for a family that is
     still missing or failed, and true if it is merely slow. Later loads call onFontsUpdate(). */
  const FONT_GRACE_MS = 4000;
  const FAMILIES = [
    ['Roboto Flex', '600 100px "Roboto Flex"', 'KERN SOCIETY'],
    ['Fraunces', '400 100px "Fraunces"', 'Honey'],
    ['Recursive', '400 100px "Recursive"', 'Off duty'],
  ];
  const fontListeners = [];
  const onFontsUpdate = (fn) => { fontListeners.push(fn); };

  function familyStatus(name) {
    const statuses = [];
    document.fonts.forEach((face) => {
      if (face.family.replace(/^["']|["']$/g, '') === name) statuses.push(face.status);
    });
    if (!statuses.length) return 'missing';
    if (statuses.includes('loaded')) return 'loaded';
    if (statuses.includes('loading')) return 'loading';
    if (statuses.includes('error')) return 'error';
    return 'unloaded';
  }

  const fontsReady = (function () {
    const fonts = document.fonts;
    if (!fonts || typeof fonts.load !== 'function' || typeof fonts.forEach !== 'function') {
      html.classList.add('fonts-failed');
      return Promise.resolve(false);
    }
    // The Google Fonts stylesheet loads without blocking render; its inline onerror marks a failed request.
    const sheet = document.querySelector('link[data-fonts]');
    return new Promise((resolve) => {
      const started = performance.now();
      let settled = false;
      let timer = 0;
      const evaluate = () => {
        if (settled) return;
        const states = FAMILIES.map(([name]) => familyStatus(name));
        const elapsed = performance.now() - started;
        let result = null;
        if (sheet && sheet.hasAttribute('data-failed')) result = false;
        else if (states.every((s) => s === 'loaded')) result = true;
        else if (elapsed > FONT_GRACE_MS) result = !states.some((s) => s === 'missing' || s === 'error');
        if (result === null) return;
        settled = true;
        clearInterval(timer);
        if (!result) html.classList.add('fonts-failed');
        resolve(result);
      };
      FAMILIES.forEach(([, font, text]) => { fonts.load(font, text).then(evaluate, evaluate); });
      fonts.load('italic 420 100px "Fraunces"', 'move').catch(() => {});
      fonts.addEventListener('loadingdone', () => {
        if (!settled) { evaluate(); return; }
        if (FAMILIES.every(([name]) => familyStatus(name) === 'loaded')) html.classList.remove('fonts-failed');
        fontListeners.forEach((fn) => {
          try { fn(); } catch (err) { console.error('[Kern Society] font update failed:', err); }
        });
      });
      fonts.addEventListener('loadingerror', evaluate);
      if (sheet) sheet.addEventListener('error', () => setTimeout(evaluate, 0));
      timer = setInterval(evaluate, 150);
      evaluate();
    });
  })();

  /* Does the width axis really render?
     - System fallback fonts (Google Fonts blocked or failed) have no width axis: fonts-failed, or an advance of
       "KERN" that does not grow by close to its designed 2.9x between wdth 25 and 151, means static fitting.
     - Only where canvas supports fontStretch (Chromium 99+, Firefox 117+) is the drawn ink measured as well,
       which catches an engine that moves advances without redrawing outlines. Safari has no canvas
       fontStretch, so Safari on macOS and every iPhone browser rely on the DOM test alone; real Safari has
       rendered wdth outlines correctly since Safari 11. Canvas is never asked to prove the axis where it
       cannot express it, so those readers keep the stretch effect.
     - Known testing limitation: Playwright's WebKit build for Windows also lacks canvas fontStretch, yet it does
       not redraw wdth outlines. It passes the DOM test, stays in live mode and draws overlapping letters. That
       is a defect of the Windows test port, not of Safari, and is accepted rather than worked around.
     A failed check sets html.no-axes (the fonts' default instance everywhere) and the big wordmarks fit statically. */
  let axisCache = null;
  function widthAxisRenders() {
    if (html.classList.contains('fonts-failed')) return false;
    if (axisCache !== null) return axisCache;
    const advanceOf = (wdth) => {
      const s = document.createElement('span');
      s.setAttribute('data-axis-probe', '');
      s.setAttribute('aria-hidden', 'true');
      s.textContent = 'KERN';
      s.style.cssText = `position:absolute;left:0;top:0;visibility:hidden;white-space:pre;font-family:var(--f-elastik);font-size:100px;font-variation-settings:"wght" 600, "wdth" ${wdth}, "opsz" 144`;
      document.body.appendChild(s);
      const w = s.getBoundingClientRect().width;
      s.remove();
      return w;
    };
    const narrow = advanceOf(25);
    let ok = narrow > 0 && advanceOf(151) / narrow > 2.4;
    const canvasStretch = typeof CanvasRenderingContext2D !== 'undefined' && 'fontStretch' in CanvasRenderingContext2D.prototype;
    if (ok && canvasStretch) {
      try {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = '600 100px "Roboto Flex"'; // set once: assigning font resets fontStretch to normal
        const ink = (stretch) => {
          ctx.fontStretch = stretch;
          const m = ctx.measureText('KERN');
          return m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
        };
        const condensed = ink('ultra-condensed');
        if (condensed > 0) ok = ink('ultra-expanded') / condensed > 1.3; // Chromium and Firefox measure about 2.1x
      } catch (err) { /* canvas text metrics unavailable: the DOM test stands */ }
    }
    axisCache = ok;
    return ok;
  }
  const updateAxisClass = () => {
    axisCache = null;
    html.classList.toggle('no-axes', !html.classList.contains('fonts-failed') && !widthAxisRenders());
  };
  fontsReady.then(updateAxisClass);
  onFontsUpdate(updateAxisClass);
  // Text that reflows with the web fonts (the manifesto) stays invisible until they have really settled, i.e.
  // loaded or failed. A slow network that merely passed the grace period waits for the load; see style.css.
  // The Fraunces italic face counts too: the manifesto's emphasised words use it and would reflow on arrival.
  const italicLoaded = () => {
    let loaded = false;
    document.fonts.forEach((face) => {
      if (face.family.replace(/^["']|["']$/g, '') === 'Fraunces' && face.style === 'italic' && face.status === 'loaded') loaded = true;
    });
    return loaded;
  };
  const markSettled = () => {
    if (html.classList.contains('fonts-failed') || (FAMILIES.every(([name]) => familyStatus(name) === 'loaded') && italicLoaded())) {
      html.classList.add('fonts-settled');
    }
  };
  fontsReady.then(markSettled);
  onFontsUpdate(markSettled);

  /* =============================================================== Loader */

  /* First view of a session only. The inline head script decides (JavaScript on, not seen in this session, no reduced
     motion), sets html.is-loading before the first paint, and clears it after 3s in case this file never runs.
     - The counter follows real loading: it eases towards 90 while the font stylesheet and the three families arrive,
       and reaches 100 only once the fonts have settled and ~900ms have passed, or at 2.5s regardless. The S slides
       into the K in step with it and lands on the logo exactly at 100.
     - Then the mark flies to the navigation logo (FLIP) and hands over to it, the Ink curtain withdraws from the top,
       and the page parts come in one after another. Only transform, opacity and clip-path move: nothing shifts.
     - is-loading is cleared as soon as the curtain has gone; the entrance never blocks clicks or scrolling.
     - A click, tap or key fast-forwards everything (about 300ms). */
  const Intro = { pending: html.classList.contains('is-loading'), resolve: null };
  Intro.done = new Promise((resolve) => { Intro.resolve = resolve; });
  const endIntro = () => {
    Intro.pending = false;
    Intro.resolve();
  };

  function initLoader() {
    const loader = $('.loader');
    const curtain = loader && $('.loader__curtain', loader);
    const count = loader && $('.loader__count', loader);
    const marks = loader ? $$('.loader__mark', loader) : [];
    if (!Intro.pending || !curtain || !count || !marks.length) {
      endIntro();
      return;
    }
    clearTimeout(window.__ksLoaderFailsafe); // from here this file owns the loader

    const EASE = 'cubic-bezier(.2, .7, .1, 1)'; // --ease in style.css
    const MIN_MS = 900;
    const MAX_MS = 2500;
    const FINISH_MS = 320;
    const BEAT_MS = 80;
    const FLIGHT_MS = 600;
    const CURTAIN_DELAY = 140; // the mark sets off first and is clear of the tagline by the time the curtain uncovers it
    const CURTAIN_MS = 560; // ends after the flight (140 + 560 > 600), so the mark always lands on Paper
    const STEP = 65; // stagger between page parts
    const LOGO_GAP = 17.2; // % of the navigation logo's width: the KS part ends at 15.1, the wordmark starts at 19.4
    const FAST = 6; // playback rate after a click, tap or key: what is left then takes about 300ms
    const VIEW_H = 132.7; // viewBox height shared by the navigation logo and the loader mark
    const LOGO_W = 1476.7; // navigation logo viewBox width; its KS part starts at x = 0
    const MARK_Y = 13.8; // the loader mark's viewBox starts 13.8 units higher, which centres the glyphs
    const canAnimate = typeof Element.prototype.animate === 'function';
    const sheet = document.querySelector('link[data-fonts]');
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const skipEvents = ['pointerdown', 'keydown', 'touchstart'];
    const animations = [];
    let fontsDone = false;
    let phase = 'wait';
    let rate = 1;
    let value = 0;
    let phaseStart = 0;
    let phaseFrom = 0;
    let last = performance.now();
    fontsReady.then(() => { fontsDone = true; });

    // Share of real loading done: this script runs, the font stylesheet applies, each family loads.
    const loadedShare = () => {
      let share = 0.2;
      if (sheet && sheet.media === 'all') share += 0.2;
      if (document.fonts && typeof document.fonts.forEach === 'function') {
        FAMILIES.forEach(([name]) => { if (familyStatus(name) === 'loaded') share += 0.2; });
      }
      return Math.min(1, share);
    };

    const show = (v) => {
      value = v;
      const text = String(Math.floor(v + 1e-6)).padStart(3, '0'); // rounds down: 100 appears only as the S lands
      if (count.textContent !== text) count.textContent = text;
      const x = clamp(v / 100, 0, 1);
      loader.style.setProperty('--u', (1 - x * x).toFixed(4)); // 1 = a letter apart, 0 = kerned into the logo
    };

    const play = (el, keyframes, duration, delay = 0, easing = EASE) => {
      if (!el || !canAnimate) return null;
      const animation = el.animate(keyframes, { duration, delay, easing, fill: 'both' });
      animation.playbackRate = rate;
      animations.push(animation);
      return animation;
    };

    const skip = () => {
      if (rate === FAST) return;
      rate = FAST;
      animations.forEach((a) => { a.playbackRate = FAST; });
      if (phase === 'wait') {
        phase = 'finish';
        phaseStart = performance.now();
        phaseFrom = value;
      }
    };

    // The page parts in order, on a clock that starts with the curtain. Returns every animation, the letters' apart
    // (the desktop pulse waits for them) and the logo wordmark's (cancelled at the hand-over).
    const enterPage = () => {
      const list = [];
      const add = (a) => { if (a) list.push(a); return a; };
      const phone = mqMobile.matches;
      const at = (ms) => CURTAIN_DELAY + ms;
      const lift = (y) => [{ opacity: 0, translate: `0 ${y}px` }, { opacity: 1, translate: '0 0' }];
      // 1. Navigation: the logo's wordmark unrolls to the right before the KS part lands, then links and button.
      const wordmark = add(play($('.nav__logo .logo'), [
        { clipPath: `inset(-25% ${100 - LOGO_GAP}% -25% ${LOGO_GAP}%)` },
        { clipPath: `inset(-25% -2% -25% ${LOGO_GAP}%)` },
      ], 440, at(-40)));
      const navItems = phone ? [$('.nav__toggle')] : $$('.nav__links a').concat($('.nav__cta'));
      navItems.forEach((el, i) => add(play(el, lift(-10), 520, at(i * 35))));
      // 2. Meta row.
      add(play($('.hero__meta'), lift(10), 560, at(STEP)));
      // 3. Tagline: the LCP element, so it only moves and is never hidden.
      add(play($('.hero__tagline'), [{ translate: '0 28px' }, { translate: '0 0' }], 700, at(STEP * 2)));
      // 4. CTA and scroll hint.
      [$('.hero__cta'), $('.hero__scroll')].forEach((el, i) => add(play(el, lift(12), 560, at(STEP * 3 + i * 40))));
      // 5. The ruler draws from left to right.
      add(play($('.hero__ruler'), [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], 620, at(STEP * 4)));
      // 6. The letters rise from below their baseline one after another, masked at the foot of their line
      //    (desktop: the title box, whose foot is the line's; phones: each of the two lines).
      const wm = $('.wm');
      const risen = [];
      let lettersEnd = at(STEP * 5);
      if (wm) {
        const hosts = (phone ? $$('.wm__line', wm) : [$('.hero__title')]).filter(Boolean);
        const open = 'inset(-40% -10% 0% -10%)';
        hosts.forEach((h) => { h.style.clipPath = open; });
        const letters = wm.classList.contains('is-live') ? $$('.wm__l', wm).filter((l) => l.textContent.trim()) : [];
        if (letters.length) {
          letters.forEach((l, i) => risen.push(play(l, [{ translate: '0 115%' }, { translate: '0 0' }], 500, at(STEP * 5 + i * 22))));
          lettersEnd = at(STEP * 5 + (letters.length - 1) * 22 + 500);
        } else {
          // Static fitting sets the letters inline (transforms do not apply), so each line is uncovered from its foot.
          hosts.forEach((h, i) => risen.push(play(h, [{ clipPath: 'inset(100% -10% 0% -10%)' }, { clipPath: open }], 620, at(STEP * 5 + i * 70))));
          lettersEnd = at(STEP * 5 + Math.max(0, hosts.length - 1) * 70 + 620);
        }
      }
      risen.forEach(add);
      // 7. Finally the Signal band slides in.
      const ticker = $('.ticker');
      const bandAt = Math.max(at(STEP * 6), lettersEnd - 400); // after the last letter has set off
      add(play(ticker, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], 600, bandAt));
      add(play(ticker && $('.ticker__track', ticker), [{ translate: '12% 0' }, { translate: '0 0' }], 620, bandAt));
      return { all: list, letters: risen.filter(Boolean), wordmark };
    };

    const listen = (on) => {
      skipEvents.forEach((type) => window[on ? 'addEventListener' : 'removeEventListener'](type, skip, { capture: true, passive: true }));
    };
    // Scrolling is held by blocking its inputs (touch: touch-action on the loader), not by overflow, so the scrollbar
    // and the layout never change when the page is released.
    const SCROLL_KEYS = [' ', 'Spacebar', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'];
    const hold = (e) => {
      if (e.type === 'keydown' && !SCROLL_KEYS.includes(e.key)) return;
      if (e.cancelable) e.preventDefault();
    };
    const lock = (on) => {
      ['wheel', 'keydown'].forEach((type) => window[on ? 'addEventListener' : 'removeEventListener'](type, hold, { capture: true, passive: false }));
    };
    const settle = (list) => Promise.all(list.map((a) => a.finished.catch(() => null)));
    const clearMasks = () => { $$('.hero__title, .wm__line').forEach((el) => { el.style.clipPath = ''; }); };

    const finish = () => {
      listen(false);
      animations.forEach((a) => a.cancel()); // every part already sits at its resting CSS state
      clearMasks();
      html.classList.remove('logo-landed');
      if (Intro.pending) endIntro();
    };

    const leave = () => {
      const logo = $('.nav__logo .logo');
      const box = marks[0].getBoundingClientRect();
      const to = logo ? logo.getBoundingClientRect() : null;
      let flight = null;
      if (to && to.width > 0 && to.height > 0 && box.height > 0) {
        // FLIP onto the KS part of the navigation logo: same glyphs and viewBox height (the logo may be letterboxed).
        const unit = Math.min(to.width / LOGO_W, to.height / VIEW_H);
        const originX = to.left + (to.width - LOGO_W * unit) / 2;
        const originY = to.top + (to.height - VIEW_H * unit) / 2;
        const scale = unit / (box.height / VIEW_H);
        const dx = originX - box.left;
        const dy = originY - MARK_Y * unit - box.top;
        const keyframes = [{ transform: 'translate(0px, 0px) scale(1)' }, { transform: `translate(${dx}px, ${dy}px) scale(${scale})` }];
        marks.forEach((m) => { flight = play(m, keyframes, FLIGHT_MS); });
      }
      play(count, [{ opacity: 1 }, { opacity: 0 }], 240, 0, 'linear');
      const withdraw = play(curtain, [{ clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(100% 0% 0% 0%)' }], CURTAIN_MS, CURTAIN_DELAY);
      const entered = enterPage();
      // Hand-over: the flying mark is hidden in the same task that uncovers the logo's KS part, so no frame has both.
      const land = () => {
        marks.forEach((m) => { m.style.visibility = 'hidden'; });
        if (entered.wordmark) entered.wordmark.cancel(); // done by now; its clip would otherwise keep the KS covered
        html.classList.add('logo-landed');
      };
      // The curtain has gone: clicks and scrolling work again, even while the entrance is still running.
      const release = () => {
        land();
        lock(false);
        html.classList.remove('is-loading');
        if (Motion.lenis) Motion.lenis.start();
      };
      if (flight) flight.finished.then(land, land);
      else land();
      if (withdraw) withdraw.finished.then(release, release);
      else release();
      settle(entered.letters).then(() => { if (Intro.pending) endIntro(); }); // the desktop pulse follows the letters
      settle(entered.all).then(finish);
    };

    // Anything unexpected releases the page at once rather than leaving the curtain up.
    const bail = (err) => {
      console.error('[Kern Society] loader failed:', err);
      listen(false);
      lock(false);
      animations.forEach((a) => a.cancel());
      clearMasks();
      marks.forEach((m) => { m.style.visibility = 'hidden'; });
      html.classList.remove('is-loading', 'logo-landed');
      if (Motion.lenis) Motion.lenis.start();
      if (Intro.pending) endIntro();
    };

    const tick = (now) => {
      try {
        const dt = clamp(now - last, 0, 64);
        last = now;
        if (phase === 'wait') {
          const target = Math.min(90, 90 * Math.max(1 - Math.exp(-now / 800), loadedShare()));
          show(value + (target - value) * (1 - Math.exp(-dt / 160)));
          if ((fontsDone && now >= MIN_MS - FINISH_MS) || now >= MAX_MS - FINISH_MS) {
            phase = 'finish';
            phaseStart = now;
            phaseFrom = value;
          }
        }
        if (phase === 'finish') {
          const p = clamp(((now - phaseStart) * rate) / FINISH_MS, 0, 1);
          show(lerp(phaseFrom, 100, easeOut(p)));
          if (p >= 1) {
            phase = 'beat';
            phaseStart = now;
          }
        } else if (phase === 'beat' && (now - phaseStart) * rate >= BEAT_MS) {
          phase = 'out';
          leave();
          return;
        }
        requestAnimationFrame(tick);
      } catch (err) {
        bail(err);
      }
    };

    listen(true);
    lock(true);
    show(0);
    requestAnimationFrame(tick);
  }

  /* Scroll velocity in px/s, shared by the ticker and the footer wordmark. Decays when idle. */
  const Velocity = (function () {
    let v = 0;
    let lastY = window.scrollY;
    let lastT = performance.now();
    window.addEventListener('scroll', () => {
      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) v = lerp(v, ((window.scrollY - lastY) / dt) * 1000, 0.3);
      lastY = window.scrollY;
      lastT = now;
    }, { passive: true });
    return {
      get() {
        const idle = performance.now() - lastT;
        return idle > 80 ? v * Math.exp(-(idle - 80) / 140) : v;
      },
    };
  })();

  function navHeight() {
    const nav = $('.nav');
    return nav ? nav.offsetHeight : 0;
  }

  function scrollToTarget(target) {
    const top = target === document.body;
    if (Motion.lenis) {
      Motion.lenis.scrollTo(top ? 0 : target, { offset: top ? 0 : -navHeight(), duration: 1.3 });
      return;
    }
    const y = top ? 0 : target.getBoundingClientRect().top + window.scrollY - navHeight();
    window.scrollTo({ top: y, behavior: mqReduce.matches ? 'auto' : 'smooth' });
  }

  /* =============================================================== Modals */

  const openers = new WeakMap();

  function openModal(id, opener) {
    const dialog = document.getElementById(id);
    if (!dialog || typeof dialog.showModal !== 'function' || dialog.open) return;
    openers.set(dialog, opener || document.activeElement);
    dialog.showModal();
    if (Motion.lenis) Motion.lenis.stop();
  }

  function initModals() {
    $$('[data-open]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.closest('#nav-panel') && Nav.isOpen()) Nav.close(false);
        openModal(btn.dataset.open, btn);
      });
    });
    $$('dialog.modal').forEach((dialog) => {
      $$('[data-close]', dialog).forEach((b) => b.addEventListener('click', () => dialog.close()));
      dialog.addEventListener('click', (e) => {
        if (e.target !== dialog) return;
        const r = dialog.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) dialog.close();
      });
      dialog.addEventListener('close', () => {
        if (Motion.lenis) Motion.lenis.start();
        let opener = openers.get(dialog);
        if (!opener || !opener.isConnected || opener.getClientRects().length === 0) opener = $('.nav__toggle');
        if (opener && opener.getClientRects().length) opener.focus();
      });
    });
  }

  /* ================================================================== Nav */

  const Nav = { isOpen: () => false, close: () => {} };

  function initNav() {
    const toggle = $('.nav__toggle');
    const panel = $('#nav-panel');
    const blocked = [$('#main'), $('.footer')].filter(Boolean);
    let open = false;

    const setOpen = (value, returnFocus) => {
      open = value;
      toggle.setAttribute('aria-expanded', String(value));
      toggle.textContent = value ? toggle.dataset.labelClose : toggle.dataset.labelOpen;
      panel.classList.toggle('is-open', value);
      html.classList.toggle('menu-open', value);
      blocked.forEach((el) => { el.inert = value; });
      if (value) {
        if (Motion.lenis) Motion.lenis.stop();
        const first = $('a', panel);
        if (first) first.focus();
      } else {
        if (Motion.lenis) Motion.lenis.start();
        if (returnFocus) toggle.focus();
      }
    };

    Nav.isOpen = () => open;
    Nav.close = (returnFocus) => { if (open) setOpen(false, returnFocus); };

    toggle.addEventListener('click', () => setOpen(!open, true));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false, true);
      }
    });
    mqMobile.addEventListener('change', (e) => { if (!e.matches) Nav.close(false); });

    $$('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const hash = link.getAttribute('href');
        const target = hash === '#top' ? document.body : document.getElementById(hash.slice(1));
        if (!target) return;
        e.preventDefault();
        Nav.close(false);
        scrollToTarget(target);
        if (target !== document.body && target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
      });
    });
  }

  /* ================================================================= Logo */

  // Hovering the logo kerns the S out to a standard gap and snaps it back into the K (CSS keyframes).
  function initLogo() {
    const link = $('.nav__logo');
    const svg = link && $('svg', link);
    if (!svg) return;
    let lastPlay = 0;
    let timer = 0;
    const play = () => {
      const now = Date.now();
      if (mqReduce.matches || now - lastPlay < 400) return; // a tap fires pointerenter and click together
      lastPlay = now;
      svg.classList.remove('is-playing');
      void svg.getBoundingClientRect(); // restart the keyframes
      svg.classList.add('is-playing');
      clearTimeout(timer);
      timer = setTimeout(() => svg.classList.remove('is-playing'), 1150);
    };
    link.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') play(); });
    link.addEventListener('click', play);
  }

  /* ============================================================ Licensing */

  function initLicensing() {
    const form = $('.lic');
    if (!form) return;
    const fontInputs = $$('[data-qa="lic-font"]', form);
    const typeInputs = $$('[data-qa="lic-type"]', form);
    const sizeInputs = $$('[data-qa="lic-size"]', form);
    const totalEl = $('[data-qa="lic-total"]', form);
    const live = $('[data-total-live]', form);
    const buy = $('[data-qa="lic-buy"]', form);
    const hint = $('[data-hint]', form);
    const bundle = $('[data-bundle]', form);
    const fmt = (n) => '$' + n.toLocaleString('en-US');
    let shown = Number(totalEl.dataset.value) || 0;
    let frame = 0;

    const countTo = (target, animate) => {
      cancelAnimationFrame(frame);
      if (!animate || shown === target) {
        shown = target;
        totalEl.textContent = fmt(target);
        return;
      }
      const from = shown;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / 560);
        shown = Math.round(lerp(from, target, 1 - Math.pow(1 - p, 3)));
        totalEl.textContent = fmt(shown);
        if (p < 1) frame = requestAnimationFrame(step);
        else { shown = target; totalEl.textContent = fmt(target); }
      };
      frame = requestAnimationFrame(step);
    };

    const update = (animate) => {
      const fonts = fontInputs.filter((i) => i.checked).map((i) => i.value);
      const types = typeInputs.filter((i) => i.checked).map((i) => i.value);
      const sizeInput = sizeInputs.find((i) => i.checked) || sizeInputs[0];
      const total = priceFor(fonts, types, sizeInput.value);
      const valid = fonts.length > 0 && types.length > 0;
      // Final value first, synchronously; the visible count-up follows.
      totalEl.dataset.value = String(total);
      live.textContent = fmt(total);
      buy.disabled = !valid;
      hint.hidden = valid;
      if (valid) buy.removeAttribute('aria-describedby');
      else buy.setAttribute('aria-describedby', hint.id);
      bundle.classList.toggle('is-on', fonts.length === Object.keys(FONTS).length);
      countTo(total, animate && !mqReduce.matches);
    };

    form.addEventListener('change', () => update(true));
    form.addEventListener('submit', (e) => e.preventDefault());
    buy.addEventListener('click', () => { if (!buy.disabled) openModal('modal-buy', buy); });
    update(false);
  }

  /* =========================================================== Newsletter */

  function initNewsletter() {
    const form = $('.nl');
    if (!form) return;
    const input = $('[data-qa="nl-email"]', form);
    const msg = $('[data-qa="nl-message"]', form);
    const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

    form.addEventListener('submit', (e) => {
      e.preventDefault(); // nothing is ever sent
      if (EMAIL.test(input.value.trim())) {
        input.removeAttribute('aria-invalid');
        msg.textContent = form.dataset.msgSuccess;
        input.value = '';
      } else {
        input.setAttribute('aria-invalid', 'true');
        msg.textContent = form.dataset.msgError;
        input.focus();
      }
    });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') {
        input.removeAttribute('aria-invalid');
        msg.textContent = '';
      }
    });
  }

  /* =============================================================== Tester */

  function initTester() {
    const stage = $('.tester__stage');
    const input = $('[data-qa="tester-input"]');
    const controls = $('#tester-controls');
    if (!stage || !input || !controls) return;
    const size = $('#t-size', controls);
    const sizeOut = $('#t-size-out', controls);
    const axesWrap = $('[data-axes]', controls);
    const fontButtons = $$('.ctl--fonts [data-font]', controls);
    const presetButtons = $$('[data-preset]', controls);
    const reset = $('[data-reset]', controls);
    const toggle = $('.tester__toggle');

    const maxSize = () => (mqMobile.matches ? 120 : 240);
    const defaultSize = () => (mqMobile.matches ? 60 : 120);
    const defaults = (key) => {
      const out = {};
      FONTS[key].axes.forEach((ax) => { out[ax.tag] = ax.def; });
      return out;
    };
    const format = (ax, v) => (ax.step < 1 ? Number(v).toFixed(2) : String(Math.round(v)));
    const state = { font: 'elastik', size: defaultSize(), axes: defaults('elastik'), preset: null };
    let sliders = {};

    const autosize = () => {
      input.style.height = 'auto';
      input.style.height = input.scrollHeight + 'px';
    };

    const buildAxes = () => {
      axesWrap.textContent = '';
      sliders = {};
      FONTS[state.font].axes.forEach((ax) => {
        const id = 't-axis-' + ax.tag;
        const wrap = document.createElement('div');
        wrap.className = 'slider';
        const row = document.createElement('div');
        row.className = 'slider__row';
        const label = document.createElement('label');
        label.className = 'label';
        label.htmlFor = id;
        label.textContent = ax.label;
        const out = document.createElement('output');
        out.className = 'mono slider__val';
        out.htmlFor = id;
        const range = document.createElement('input');
        range.type = 'range';
        range.id = id;
        range.min = ax.min;
        range.max = ax.max;
        range.step = ax.step;
        range.addEventListener('input', () => {
          state.axes[ax.tag] = Number(range.value);
          state.preset = null;
          apply();
        });
        row.append(label, out);
        wrap.append(row, range);
        axesWrap.appendChild(wrap);
        sliders[ax.tag] = { range, out, ax };
      });
    };

    const apply = () => {
      const font = FONTS[state.font];
      stage.dataset.font = state.font;
      input.style.fontVariationSettings = font.axes.map((ax) => `"${ax.tag}" ${state.axes[ax.tag]}`).join(', ');
      input.style.fontSize = state.size + 'px';
      size.max = maxSize();
      size.value = state.size;
      sizeOut.textContent = String(state.size);
      Object.keys(sliders).forEach((tag) => {
        const s = sliders[tag];
        s.range.value = state.axes[tag];
        s.out.textContent = format(s.ax, state.axes[tag]);
      });
      fontButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.font === state.font)));
      presetButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === state.preset)));
      autosize();
    };

    fontButtons.forEach((b) => b.addEventListener('click', () => {
      if (state.font === b.dataset.font) return;
      state.font = b.dataset.font;
      state.axes = defaults(state.font);
      state.preset = null;
      buildAxes();
      apply();
    }));
    presetButtons.forEach((b) => b.addEventListener('click', () => {
      const preset = FONTS[state.font].presets[b.dataset.preset];
      state.axes = Object.assign(defaults(state.font), preset.axes);
      state.size = Math.min(preset.size, maxSize());
      state.preset = b.dataset.preset;
      apply();
    }));
    reset.addEventListener('click', () => {
      input.value = input.defaultValue;
      state.axes = defaults(state.font);
      state.size = defaultSize();
      state.preset = null;
      apply();
    });
    size.addEventListener('input', () => {
      state.size = Number(size.value);
      state.preset = null;
      apply();
    });
    input.addEventListener('input', autosize);
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.textContent = expanded ? toggle.dataset.labelHide : toggle.dataset.labelShow;
      controls.classList.toggle('is-open', expanded);
    });
    mqMobile.addEventListener('change', () => {
      state.size = Math.min(state.size, maxSize());
      apply();
    });
    onResize(stage, autosize);

    buildAxes();
    apply();
    fontsReady.then(autosize);
    onFontsUpdate(autosize);
  }

  /* ====================================================== Typefaces cards */

  function specimenAnimator(card) {
    const font = FONTS[card.dataset.font];
    const el = $('.card__specimen', card);
    const tags = $$('.card__axes li', card);
    const SEGMENT = 1150; // ms per axis sweep
    const RETURN = 560; // ms to ease back to the resting specimen
    const BLEND = 320; // ms to blend into a new sweep if one starts mid-return
    const base = font.specimen;
    let frame = 0;
    let start = 0;
    let cycles = Infinity;
    let mode = 'idle'; // idle | play | return
    let current = Object.assign({}, base);
    let from = null;
    let blendFrom = null;

    const write = (vals) => {
      el.style.fontVariationSettings = font.axes.map((a) => `"${a.tag}" ${Math.round(vals[a.tag] * 100) / 100}`).join(', ');
    };

    const sweepAt = (elapsed) => {
      const i = Math.floor(elapsed / SEGMENT) % font.axes.length;
      const p = (elapsed % SEGMENT) / SEGMENT;
      const ax = font.axes[i];
      const b = base[ax.tag];
      let v;
      if (p < 1 / 3) v = lerp(b, ax.min, easeInOut(p * 3));
      else if (p < 2 / 3) v = lerp(ax.min, ax.max, easeInOut((p - 1 / 3) * 3));
      else v = lerp(ax.max, b, easeInOut((p - 2 / 3) * 3));
      const vals = Object.assign({}, base);
      vals[ax.tag] = v;
      return { vals, tag: ax.tag };
    };

    const settle = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      mode = 'idle';
      current = Object.assign({}, base);
      el.style.fontVariationSettings = '';
      tags.forEach((t) => t.classList.remove('is-active'));
    };

    const frameFn = (now) => {
      const elapsed = Math.max(0, now - start); // rAF timestamps can precede performance.now()
      if (mode === 'play') {
        if (elapsed >= cycles * font.axes.length * SEGMENT) { settle(); return; }
        const s = sweepAt(elapsed);
        if (blendFrom && elapsed < BLEND) {
          const e = 1 - Math.pow(1 - elapsed / BLEND, 3);
          font.axes.forEach((a) => { s.vals[a.tag] = lerp(blendFrom[a.tag], s.vals[a.tag], e); });
        }
        current = s.vals;
        write(current);
        tags.forEach((t) => t.classList.toggle('is-active', t.dataset.tag === s.tag));
      } else if (mode === 'return') {
        const p = Math.min(1, elapsed / RETURN);
        const e = 1 - Math.pow(1 - p, 3);
        font.axes.forEach((a) => { current[a.tag] = lerp(from[a.tag], base[a.tag], e); });
        write(current);
        if (p >= 1) { settle(); return; }
      }
      frame = requestAnimationFrame(frameFn);
    };

    function play(times) {
      if (mqReduce.matches || mode === 'play') return;
      blendFrom = mode === 'return' ? Object.assign({}, current) : null;
      cancelAnimationFrame(frame);
      mode = 'play';
      cycles = times || Infinity;
      start = performance.now();
      frame = requestAnimationFrame(frameFn);
    }
    function stop() {
      if (mode !== 'play') return;
      tags.forEach((t) => t.classList.remove('is-active'));
      from = Object.assign({}, current);
      mode = 'return';
      start = performance.now();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(frameFn);
    }
    return { play, stop };
  }

  function initTypefaces() {
    const cards = $$('.card');
    const inspector = $('.inspector');
    if (!cards.length || !inspector) return;

    // Card details come from FONTS so a family is edited in one place.
    cards.forEach((card) => {
      const font = FONTS[card.dataset.font];
      const year = $('.card__year', card);
      const list = $('.card__axes', card);
      if (year) year.textContent = String(font.year);
      if (list) {
        list.textContent = '';
        font.axes.forEach((ax) => {
          const li = document.createElement('li');
          li.dataset.tag = ax.tag;
          li.textContent = ax.tag;
          list.appendChild(li);
        });
      }
    });

    const canvas = $('.inspector__canvas', inspector);
    const ctx = canvas.getContext('2d');
    const metricList = $('.metrics', inspector);
    const metricEls = {};
    $$('[data-metric]', metricList).forEach((li) => { metricEls[li.dataset.metric] = li; });
    const grid = $('.glyphs', inspector);
    const glyphs = $$('.glyph', grid);
    let current = 'elastik';
    let glyph = 'A';
    let fontsOk = true;
    let loaded = false;

    // Label placement keeps near-identical lines (ascender vs cap height) readable.
    const PLACE = {
      ascender: { right: true, below: false },
      cap: { right: false, below: true },
      xheight: { right: true, below: false },
      baseline: { right: false, below: false },
      descender: { right: true, below: true },
    };
    Object.keys(PLACE).forEach((k) => {
      if (!metricEls[k]) return;
      metricEls[k].classList.toggle('is-right', PLACE[k].right);
      metricEls[k].classList.toggle('is-below', PLACE[k].below);
    });

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const font = FONTS[current];
      const size = Math.round(Math.min(h * 0.64, w * 0.62));
      ctx.font = `400 ${size}px ${font.canvas}`;
      const asc = ctx.measureText('d').actualBoundingBoxAscent;
      const cap = ctx.measureText('H').actualBoundingBoxAscent;
      const xh = ctx.measureText('x').actualBoundingBoxAscent;
      const desc = ctx.measureText('p').actualBoundingBoxDescent;
      const g = ctx.measureText(glyph);
      const baseline = Math.round((h - (asc + desc)) / 2 + asc);
      const lines = { ascender: baseline - asc, cap: baseline - cap, xheight: baseline - xh, baseline, descender: baseline + desc };

      if (fontsOk) {
        ctx.lineWidth = 1;
        Object.keys(lines).forEach((k) => {
          const y = Math.round(lines[k]) + 0.5;
          ctx.strokeStyle = k === 'baseline' ? '#FF3B1A' : '#0E0E0E';
          ctx.lineWidth = k === 'baseline' ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        });
      }
      const x = Math.round((w - g.width) / 2);
      if (fontsOk) {
        ctx.strokeStyle = '#0E0E0E';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        [x, x + g.width].forEach((vx) => {
          const px = Math.round(vx) + 0.5;
          ctx.beginPath();
          ctx.moveTo(px, 0);
          ctx.lineTo(px, h);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }
      ctx.fillStyle = '#0E0E0E';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(glyph, x, baseline);

      Object.keys(lines).forEach((k) => {
        if (metricEls[k]) metricEls[k].style.top = Math.round(lines[k]) + 'px';
      });
      metricList.classList.toggle('is-ready', loaded && fontsOk);
    };

    const select = (key) => {
      current = key;
      cards.forEach((card) => {
        const on = card.dataset.font === key;
        card.classList.toggle('is-selected', on);
        $('.card__btn', card).setAttribute('aria-pressed', String(on));
      });
      inspector.dataset.font = key;
      draw();
    };

    cards.forEach((card) => {
      const btn = $('.card__btn', card);
      const anim = specimenAnimator(card);
      let lastPointer = 'mouse';
      card.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; });
      btn.addEventListener('click', () => {
        select(card.dataset.font);
        if (lastPointer === 'touch') { anim.stop(); anim.play(1); }
        lastPointer = 'mouse';
      });
      card.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') anim.play(); });
      card.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') anim.stop(); });
      btn.addEventListener('focus', () => { if (btn.matches(':focus-visible')) anim.play(); });
      btn.addEventListener('blur', () => anim.stop());
    });

    const setGlyph = (btn) => {
      glyph = btn.textContent;
      glyphs.forEach((b) => b.classList.toggle('is-active', b === btn));
      draw();
    };
    glyphs.forEach((btn) => {
      btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') setGlyph(btn); });
      btn.addEventListener('focus', () => setGlyph(btn));
      btn.addEventListener('click', () => setGlyph(btn));
    });
    grid.addEventListener('keydown', (e) => {
      const i = glyphs.indexOf(document.activeElement);
      if (i < 0) return;
      const cols = Math.max(1, Math.round(grid.clientWidth / glyphs[0].offsetWidth));
      const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
      let j;
      if (e.key in moves) j = clamp(i + moves[e.key], 0, glyphs.length - 1);
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = glyphs.length - 1;
      else return;
      e.preventDefault();
      glyphs[j].focus();
    });

    glyphs[0].classList.add('is-active');
    onResize(canvas, draw);
    fontsReady.then((ok) => {
      fontsOk = ok !== false;
      loaded = true;
      draw();
    });
    onFontsUpdate(() => {
      fontsOk = !html.classList.contains('fonts-failed');
      loaded = true;
      draw();
    });
  }

  /* ================================================================= Hero */

  function initHero() {
    const hero = $('.hero');
    const wm = hero && $('.wm', hero);
    if (!wm) return;
    const lineEls = $$('.wm__line', wm);
    const readout = $('.hero__readout', hero);
    const marker = $('.hero__marker', hero);
    html.classList.add('hero-js'); // JS owns the reveal from here (the CSS failsafe is for a failed script)

    /* Live mode. Each letter has a state s in [0, 1] on a two-segment axis path through rest at s = 0.5:
         s = 0    hairline, fully condensed   wght 150,  wdth 25
         s = 0.5  rest                         wght 600,  wdth = the line's resting width
         s = 1    black, fully extended        wght 1000, wdth 151
       Letters keep their natural advances and sit edge to edge: nothing is ever added between them.
       Each letter gets an emphasis e in [-1, 1]: on desktop from the pointer, on phones from the red marker on
       the ruler, which follows scroll progress through the hero. Every frame one shared offset is solved so the
       advances sum exactly to the column width: near letters widen, far letters condense, and the line never
       overflows or opens a gap. Nothing moves on its own: the loop stops as soon as everything has settled.
       Static mode, used when the width axis does not really render (see widthAxisRenders): the whole line sits
       in normal flow and is sized from its real measured width; on phones the marker still follows scroll. */
    const REST_WGHT = 600;
    const LO = { wght: 150, wdth: 25 };
    const HI = { wght: 1000, wdth: 151 };
    const WGHTS = [100, 200, 400, 600, 800, 1000];
    const WDTHS = [25, 40, 60, 80, 100, 125, 151];
    const FILL = 0.998; // guard against sub-pixel rounding
    const CAP_LIMIT = 0.45; // desktop cap height stays within 45% of the viewport height
    const CAP_RATIO = 0.719; // Roboto Flex cap height / em, the same constant the CSS reservation uses
    const INTRO_MS = 1400;
    const REVEAL_MS = 520; // covers the opacity transition on .wm; letters hold their resting shapes meanwhile
    const SCROLL_EASE = 10; // light smoothing of the phone marker (per second)

    const axesAt = (s, restW) => {
      if (s <= 0.5) {
        const u = s / 0.5;
        return { wght: lerp(LO.wght, REST_WGHT, u), wdth: lerp(LO.wdth, restW, u) };
      }
      const u = (s - 0.5) / 0.5;
      return { wght: lerp(REST_WGHT, HI.wght, u), wdth: lerp(restW, HI.wdth, u) };
    };
    const fvs = (a) => `"wght" ${a.wght.toFixed(1)}, "wdth" ${a.wdth.toFixed(2)}, "opsz" 144`;
    const cell = (arr, v) => {
      let i = 0;
      while (i < arr.length - 2 && v > arr[i + 1]) i++;
      return i;
    };
    // Bilinear lookup of a letter's advance (em) in its measured wght x wdth grid.
    const advance = (grid, wght, wdth) => {
      const i = cell(WGHTS, wght);
      const j = cell(WDTHS, wdth);
      const u = clamp((wght - WGHTS[i]) / (WGHTS[i + 1] - WGHTS[i]), 0, 1);
      const v = clamp((wdth - WDTHS[j]) / (WDTHS[j + 1] - WDTHS[j]), 0, 1);
      const n = WDTHS.length;
      return lerp(
        lerp(grid[i * n + j], grid[i * n + j + 1], v),
        lerp(grid[(i + 1) * n + j], grid[(i + 1) * n + j + 1], v),
        u,
      );
    };

    // Measured per font load: each distinct letter at every grid point, at a fixed optical size.
    let table = null;
    let signature = 0;
    const measure = () => {
      const chars = Array.from(new Set($$('.wm__l', wm).map((l) => l.textContent)));
      const box = document.createElement('div');
      box.setAttribute('aria-hidden', 'true');
      box.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;white-space:pre;font-family:var(--f-elastik);font-size:200px;line-height:1;';
      const spans = [];
      chars.forEach((ch) => {
        WGHTS.forEach((wg) => {
          WDTHS.forEach((wd) => {
            const sp = document.createElement('span');
            sp.textContent = ch;
            sp.style.cssText = `display:block;width:max-content;font-variation-settings:"wght" ${wg}, "wdth" ${wd}, "opsz" 144`;
            box.appendChild(sp);
            spans.push(sp);
          });
        });
      });
      document.body.appendChild(box);
      const grid = {};
      let k = 0;
      let sum = 0;
      chars.forEach((ch) => {
        const g = new Float64Array(WGHTS.length * WDTHS.length);
        for (let p = 0; p < g.length; p++) {
          g[p] = spans[k++].getBoundingClientRect().width / 200;
          sum += g[p];
        }
        grid[ch] = g;
      });
      box.remove();
      return { grid, sum: Math.round(sum * 1000) };
    };

    let mode = 'none'; // none | live | static
    let lines = [];
    let rects = [];
    let mobile = false;
    let running = false;
    let visible = true;
    let frame = 0;
    let last = 0;
    let lastW = 0;
    let lastH = 0;
    let introAt = 0;
    let introDone = false;
    let holdUntil = 0;
    const pointer = { x: 0, y: 0, active: false };
    // Phones: p = 0 at the top of the page, 1 once scrolled by the hero's own height.
    const scroll = { target: 0, p: 0, heroH: 1 };
    // Until the reader scrolls for the first time the letters rest (the page opens calm; the marker still shows p).
    let scrolledOnce = false;
    const readScroll = () => { scroll.target = clamp(window.scrollY / scroll.heroH, 0, 1); };
    const syncScroll = () => {
      scroll.heroH = Math.max(1, hero.offsetHeight);
      readScroll();
      scroll.p = scroll.target;
    };

    const readRects = () => { rects = lines.map((L) => L.el.getBoundingClientRect()); };
    const restEm = (letters, wdth) => letters.reduce((sum, l) => sum + advance(l.grid, REST_WGHT, wdth), 0);

    const clearLetters = () => {
      wm.classList.remove('is-live', 'is-static', 'uses-fallback');
      wm.style.fontSize = '';
      lineEls.forEach((l) => { l.style.fontSize = ''; });
      $$('.wm__l', wm).forEach((l) => { l.style.transform = ''; l.style.fontVariationSettings = ''; });
    };

    // Solve the shared offset so the line's advances fill the column, then place letters edge to edge.
    const layout = (force) => {
      lines.forEach((L) => {
        const target = (L.W * FILL) / L.fontSize;
        const total = (offset) => {
          let sum = 0;
          L.letters.forEach((l) => {
            const a = axesAt(clamp(offset + l.e * 0.5, 0, 1), L.restW);
            sum += advance(l.grid, a.wght, a.wdth);
          });
          return sum;
        };
        let lo = -0.5; // every letter at s = 0: always narrower than the column
        let hi = 1.5; // every letter at s = 1: always wider
        for (let k = 0; k < 22; k++) {
          const mid = (lo + hi) / 2;
          if (total(mid) > target) hi = mid;
          else lo = mid;
        }
        let x = 0;
        L.letters.forEach((l) => {
          l.s = clamp(lo + l.e * 0.5, 0, 1);
          l.axes = axesAt(l.s, L.restW);
          const w = advance(l.grid, l.axes.wght, l.axes.wdth) * L.fontSize;
          const f = fvs(l.axes);
          if (force || f !== l.shownF) { l.el.style.fontVariationSettings = f; l.shownF = f; }
          const px = Math.round(x * 4) / 4;
          if (force || px !== l.shownX) { l.el.style.transform = `translate3d(${px}px,0,0)`; l.shownX = px; }
          l.cx = x + w / 2;
          x += w;
        });
      });
    };

    // Pure model (no DOM): letter spans on line L for an array of emphasis values.
    const spansFor = (L, es) => {
      const target = (L.W * FILL) / L.fontSize;
      const n = L.letters.length;
      const total = (offset) => {
        let sum = 0;
        for (let i = 0; i < n; i++) {
          const a = axesAt(clamp(offset + es[i] * 0.5, 0, 1), L.restW);
          sum += advance(L.letters[i].grid, a.wght, a.wdth);
        }
        return sum;
      };
      let lo = -0.5;
      let hi = 1.5;
      for (let k = 0; k < 22; k++) {
        const mid = (lo + hi) / 2;
        if (total(mid) > target) hi = mid;
        else lo = mid;
      }
      const left = [];
      const right = [];
      let x = 0;
      for (let i = 0; i < n; i++) {
        const a = axesAt(clamp(lo + es[i] * 0.5, 0, 1), L.restW);
        const w = advance(L.letters[i].grid, a.wght, a.wdth) * L.fontSize;
        left.push(x);
        right.push(x + w);
        x += w;
      }
      return { left, right };
    };
    // Phone targets for one marker position: damped fixed-point passes that start from the resting layout and then
    // measure against the layout those emphases produce. Finally the letter that really sits under the marker is
    // made the leader: emphasising it further only widens its span (its neighbours give up the width), so it keeps
    // the marker. The result depends on the marker alone, so the letters ease to it and stop.
    const markerTargets = (L, markerX, radius) => {
      const kernel = (c) => {
        const dx = markerX - c;
        return 2 * Math.exp(-(dx * dx) / (radius * radius)) - 1;
      };
      let es = L.letters.map((l) => kernel(l.restCx));
      for (let pass = 0; pass < 5; pass++) {
        const { left, right } = spansFor(L, es);
        es = es.map((e, i) => lerp(e, kernel((left[i] + right[i]) / 2), 0.6));
      }
      const { left, right } = spansFor(L, es);
      let lead = left.findIndex((l, i) => markerX >= l && markerX <= right[i]);
      if (lead < 0) lead = markerX <= 0 ? 0 : es.length - 1;
      const MARGIN = 0.06;
      const others = Math.max(...es.filter((_, i) => i !== lead));
      if (es[lead] < others + MARGIN) {
        es[lead] = Math.min(1, others + MARGIN);
        es = es.map((e, i) => (i === lead ? e : Math.min(e, es[lead] - MARGIN)));
      }
      return es;
    };

    const buildLive = (intro) => {
      if (!table) return;
      mode = 'live';
      clearLetters();
      mobile = mqMobile.matches;
      wm.classList.add('is-live');
      const W = wm.getBoundingClientRect().width;
      lastW = W;
      lastH = window.innerHeight;
      syncScroll();
      const groups = mobile ? lineEls.map((l) => $$('.wm__l', l)) : [$$('.wm__l', wm)];
      lines = groups.map((els, index) => {
        const letters = els.map((el, i) => ({
          el, i, ch: el.textContent, grid: table[el.textContent],
          e: 0, s: 0.5, axes: null, shownF: '', shownX: NaN, cx: 0,
        }));
        // Largest size that fits at the narrowest resting width; on desktop also capped by viewport height.
        let fontSize = (W * FILL) / restEm(letters, LO.wdth);
        if (!mobile) fontSize = Math.min(fontSize, (CAP_LIMIT * window.innerHeight) / CAP_RATIO);
        // Resting width that fills the column exactly at that size.
        const target = (W * FILL) / fontSize;
        let lo = LO.wdth;
        let hi = HI.wdth;
        if (restEm(letters, hi) <= target) lo = hi;
        else {
          for (let k = 0; k < 24; k++) {
            const mid = (lo + hi) / 2;
            if (restEm(letters, mid) > target) hi = mid;
            else lo = mid;
          }
        }
        return { index, el: mobile ? lineEls[index] : wm, W, fontSize, restW: lo, letters };
      });
      if (mobile) lines.forEach((L) => { L.el.style.fontSize = L.fontSize.toFixed(3) + 'px'; });
      else wm.style.fontSize = lines[0].fontSize.toFixed(3) + 'px';
      // Desktop load pulse: after the fade-in, or (Infinity = waiting) once the first-visit entrance has finished.
      introAt = intro ? (Intro.pending ? Infinity : performance.now() + REVEAL_MS + 150) : 0;
      layout(true);
      lines.forEach((L) => L.letters.forEach((l) => { l.restCx = l.cx; })); // fixed reference for the phone marker
      readRects();
    };

    // Static: letters in normal flow (their own advances, so glyphs cannot collide), line fitted to the column.
    const contentWidth = (el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect().width;
    };
    const buildStatic = () => {
      mode = 'static';
      lines = [];
      rects = [];
      cancelAnimationFrame(frame);
      frame = 0;
      clearLetters();
      wm.classList.add('is-static');
      // Until Roboto Flex has loaded, set the static line in the system fallback on purpose: the web font
      // arriving later then cannot reflow visible letters (the switch to live mode crossfades instead).
      wm.classList.toggle('uses-fallback', html.classList.contains('fonts-failed') || familyStatus('Roboto Flex') !== 'loaded');
      mobile = mqMobile.matches;
      const W = wm.getBoundingClientRect().width;
      lastW = W;
      lastH = window.innerHeight;
      syncScroll();
      const targets = mobile ? lineEls : [wm];
      targets.forEach((el) => {
        el.style.fontSize = '100px';
        const w = contentWidth(el);
        let size = w > 0 ? (W * 0.99 * 100) / w : 100;
        if (!mobile) size = Math.min(size, (CAP_LIMIT * window.innerHeight) / CAP_RATIO);
        el.style.fontSize = size.toFixed(2) + 'px';
      });
      if (readout) readout.textContent = '';
      if (marker) marker.classList.remove('is-on');
    };

    // Reveal: opacity only. While it fades in, every letter holds its resting shape, so what first becomes
    // visible is the calm fitted line rather than a letter caught mid-swell.
    const reveal = () => {
      holdUntil = performance.now() + (mqReduce.matches ? 0 : REVEAL_MS);
      wm.classList.add('is-ready');
    };

    const build = (intro) => {
      if (widthAxisRenders()) {
        if (!table) {
          const m = measure();
          table = m.grid;
          signature = m.sum;
        }
        buildLive(intro);
      } else {
        buildStatic();
      }
      last = performance.now();
      kick();
    };

    // The first reveal is opacity only. A later change (fonts arrived after a static fit) fades the line out,
    // rebuilds it while hidden, so the new size is never a visible shift, and fades it back in.
    let swapTimer = 0;
    let swapFrame = 0;
    const applyMode = (intro) => {
      if (!wm.classList.contains('is-ready')) {
        build(intro);
        reveal();
        return;
      }
      clearTimeout(swapTimer);
      cancelAnimationFrame(swapFrame);
      wm.classList.remove('is-ready');
      swapTimer = setTimeout(() => {
        wm.style.visibility = 'hidden';
        build(false);
        // Two frames: the hidden state gets painted first, so the new geometry appears instead of shifting.
        swapFrame = requestAnimationFrame(() => {
          swapFrame = requestAnimationFrame(() => {
            wm.style.visibility = '';
            reveal();
          });
        });
      }, mqReduce.matches ? 0 : 420);
    };

    const kick = () => {
      if (!running || !visible || frame) return;
      if (mode === 'live' ? lines.length > 0 : mode === 'static' && mobile) frame = requestAnimationFrame(tick);
    };

    const tick = (now) => {
      frame = 0;
      const dt = clamp((now - last) / 1000, 0.001, 0.064);
      last = now;
      let moving = false;

      // Phones: the marker eases towards the scroll progress, in live and static mode alike.
      let markerX = 0;
      if (mobile) {
        const dp = scroll.target - scroll.p;
        if (Math.abs(dp) > 0.0004) { scroll.p += dp * (1 - Math.exp(-dt * SCROLL_EASE)); moving = true; } else { scroll.p = scroll.target; }
        markerX = scroll.p * lastW;
        if (marker) {
          marker.style.transform = `translate3d(${markerX.toFixed(1)}px,0,0)`;
          marker.classList.add('is-on');
        }
      }
      if (mode !== 'live') {
        if (moving) kick();
        return;
      }

      const ease = 1 - Math.exp(-dt * (mobile ? 12 : 7.5)); // phones settle quickly once scrolling stops
      const vh = window.innerHeight;
      const introWaiting = introAt === Infinity;
      const intro = introAt && !introWaiting ? (now - introAt) / INTRO_MS : 1;
      if (introAt && !introWaiting && intro >= 1) introAt = 0;
      const holding = now < holdUntil;
      if (intro < 1 || holding) moving = true;
      let best = null;

      lines.forEach((L) => {
        const r = rects[L.index];
        if (!r) return;
        const radius = 2.4 * (L.W / L.letters.length);
        const lineH = L.fontSize * 0.74;
        // Phones: targets are recomputed only when the marker has moved, then held while the letters ease to them.
        if (mobile && scrolledOnce && !holding && L.markerFor !== markerX) {
          L.targets = markerTargets(L, markerX, radius);
          L.markerFor = markerX;
        }
        L.letters.forEach((l) => {
          let target = 0;
          if (holding) {
            target = 0;
          } else if (mobile) {
            // Letters under the marker swell, on both lines, once the reader has started scrolling.
            target = scrolledOnce && L.targets ? L.targets[l.i] : 0;
          } else if (intro > 0 && intro < 1) {
            // Desktop page-load moment: a single pulse travels through the line.
            const px = lerp(-radius, L.W + radius, easeInOut(intro));
            const dx = px - l.cx;
            target = 2 * Math.exp(-(dx * dx) / (radius * radius)) - 1;
          } else if (pointer.active) {
            const dx = pointer.x - r.left - l.cx;
            const py = pointer.y - r.top;
            const dy = py < 0 ? -py : py > lineH ? py - lineH : 0;
            const near = Math.exp(-(dx * dx) / (radius * radius));
            target = clamp(1 - dy / (vh * 0.5), 0, 1) * (2 * near - 1);
          }
          const d = target - l.e;
          if (Math.abs(d) > 0.001) { l.e += d * ease; moving = true; } else { l.e = target; }
          if (l.ch !== ' ' && (!best || l.s > best.s)) best = l;
        });
      });

      layout(false);

      if (best && best.axes) {
        const text = `${best.ch}  wght ${Math.round(best.axes.wght)}  wdth ${Math.round(best.axes.wdth)}`;
        if (readout && readout.textContent !== text) readout.textContent = text;
        if (marker && !mobile) {
          const mx = !pointer.active || !rects[0] ? best.cx : clamp(pointer.x - rects[0].left, 0, lines[0].W);
          marker.style.transform = `translate3d(${mx.toFixed(1)}px,0,0)`;
          marker.classList.toggle('is-on', pointer.active);
        }
      }
      if (moving) kick();
    };

    const onMove = (e) => {
      if (e.pointerType === 'touch' || mobile) return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
      readRects();
      kick();
    };
    const onLeave = (e) => {
      if (e.pointerType === 'touch') return;
      pointer.active = false;
      kick();
    };
    const onScroll = () => {
      if (mode === 'none') return;
      if (mobile) {
        scrolledOnce = true;
        readScroll();
        kick();
      } else if (lines.length) {
        readRects();
        if (pointer.active) kick();
      }
    };
    const onViewport = () => {
      if (mode === 'none') return;
      const w = wm.getBoundingClientRect().width;
      const heightChanged = !mqMobile.matches && Math.abs(window.innerHeight - lastH) > 1;
      if (Math.abs(w - lastW) <= 0.5 && !heightChanged) return;
      if (mode === 'live') buildLive(false);
      else buildStatic();
      kick();
    };

    // With the first-visit entrance, the desktop load pulse starts once the letters have risen into place.
    Intro.done.then(() => {
      if (introAt !== Infinity) return;
      introAt = performance.now() + 120;
      last = performance.now();
      kick();
    });

    // A later font load re-decides the mode (the axis may render now) and re-measures the letters.
    onFontsUpdate(() => {
      if (mode === 'none') return;
      if (widthAxisRenders()) {
        const m = measure();
        if (mode !== 'live' || m.sum !== signature) {
          table = m.grid;
          signature = m.sum;
          applyMode(false);
        }
      } else {
        applyMode(false);
      }
    });

    watchMedia({ reduce: '(prefers-reduced-motion: reduce)', mobile: '(max-width: 767.98px)' }, (c) => {
      html.classList.toggle('rm', c.reduce);
      running = !c.reduce; // reduced motion: the fitted resting line and the marker stay still
      let cancelled = false;
      let resizeFrame = 0;
      const onWindowResize = () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(onViewport); };
      const offResize = onResize(wm, onViewport);
      window.addEventListener('resize', onWindowResize);
      const io = !c.reduce && 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; kick(); })
        : null;
      if (io) io.observe(hero);
      if (!c.reduce) {
        hero.addEventListener('pointermove', onMove, { passive: true });
        hero.addEventListener('pointerleave', onLeave, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });
      }

      fontsReady.then(() => {
        if (cancelled) return;
        applyMode(!introDone && !c.reduce && !c.mobile); // the load pulse is desktop only
        introDone = true;
      });

      return () => {
        cancelled = true;
        clearTimeout(swapTimer);
        cancelAnimationFrame(swapFrame);
        wm.style.visibility = '';
        running = false;
        cancelAnimationFrame(frame);
        cancelAnimationFrame(resizeFrame);
        frame = 0;
        offResize();
        window.removeEventListener('resize', onWindowResize);
        if (io) io.disconnect();
        hero.removeEventListener('pointermove', onMove);
        hero.removeEventListener('pointerleave', onLeave);
        window.removeEventListener('scroll', onScroll);
        clearLetters();
        mode = 'none';
        if (readout) readout.textContent = '';
        if (marker) marker.classList.remove('is-on');
        pointer.active = false;
        visible = true;
        lines = [];
        rects = [];
      };
    });
  }

  /* =============================================================== Ticker */

  function initTicker() {
    const ticker = $('.ticker');
    const track = ticker && $('.ticker__track', ticker);
    if (!track) return;
    const item = $('.ticker__item', track);
    const WIDTH_GAIN = 0.394; // measured: the line is 39.4% longer at wdth 151 than at 100
    let refresh = null;
    onFontsUpdate(() => { if (refresh) refresh(); });

    watchMedia({ reduce: '(prefers-reduced-motion: reduce)' }, (c) => {
      refresh = null;
      if (c.reduce) return null; // static strip
      let frame = 0;
      let last = performance.now();
      let progress = 0;
      let wdth = 100;
      let shown = 100;
      let visible = false;
      let baseWidth = item.offsetWidth || 1200;
      const remeasure = () => { baseWidth = (item.offsetWidth || baseWidth) / (1 + ((shown - 100) / 51) * WIDTH_GAIN); };

      const tick = (now) => {
        frame = 0;
        if (!visible) return;
        const dt = clamp((now - last) / 1000, 0.001, 0.064);
        last = now;
        const speed = Math.abs(Velocity.get());
        const target = 100 + clamp(speed / 2400, 0, 1) * 51;
        wdth += (target - wdth) * (1 - Math.exp(-dt * (target > wdth ? 8 : 2.6)));
        const itemWidth = baseWidth * (1 + ((wdth - 100) / 51) * WIDTH_GAIN);
        progress = (progress + ((60 + speed * 0.45) * dt) / itemWidth) % 1;
        // Two identical items: -50% of the track is exactly one item, at any width.
        track.style.transform = `translate3d(${(-progress * 50).toFixed(3)}%,0,0)`;
        const w = Math.round(wdth * 10) / 10;
        if (w !== shown) { track.style.fontVariationSettings = `"wght" 820, "wdth" ${w}`; shown = w; }
        frame = requestAnimationFrame(tick);
      };

      const io = 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => {
          visible = entries[0].isIntersecting;
          if (visible && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
        })
        : null;
      if (io) io.observe(ticker);
      else { visible = true; frame = requestAnimationFrame(tick); }
      const offResize = onResize(ticker, remeasure);
      fontsReady.then(remeasure);
      refresh = remeasure;

      return () => {
        if (io) io.disconnect();
        offResize();
        cancelAnimationFrame(frame);
        track.style.transform = '';
        track.style.fontVariationSettings = '';
      };
    });
  }

  /* ========================================================= Footer mark */

  function initFooterMark() {
    const mark = $('.footer__ks');
    if (!mark) return;
    const REST_W = 120; // matches --ks-w on .footer__ks in CSS
    const MAX_W = 151;

    // Without a rendering width axis the CSS size (which assumes wdth 120) is wrong: fit "KS" to the
    // column from its real measured width, in normal flow, and drop the velocity stretch.
    let staticMode = false;
    let fittedFor = 0;
    const fitStatic = () => {
      if (!staticMode) return;
      const avail = mark.getBoundingClientRect().width;
      if (Math.abs(avail - fittedFor) < 0.5) return;
      fittedFor = avail;
      mark.style.fontSize = '';
      const size = parseFloat(getComputedStyle(mark).fontSize);
      const range = document.createRange();
      range.selectNodeContents(mark);
      const width = range.getBoundingClientRect().width;
      if (width > 0) mark.style.fontSize = ((size * avail * 0.99) / width).toFixed(2) + 'px';
    };
    const setMarkMode = () => {
      staticMode = !widthAxisRenders();
      mark.classList.toggle('is-static', staticMode);
      fittedFor = 0;
      if (staticMode) {
        mark.style.removeProperty('--ks-w');
        fitStatic();
      } else {
        mark.style.fontSize = '';
      }
    };
    fontsReady.then(setMarkMode);
    onFontsUpdate(setMarkMode);
    onResize(mark, fitStatic);

    watchMedia({ reduce: '(prefers-reduced-motion: reduce)' }, (c) => {
      if (c.reduce) return null;
      let frame = 0;
      let last = performance.now();
      let w = REST_W;
      let shown = REST_W;
      let visible = false;

      const tick = (now) => {
        frame = 0;
        const dt = clamp((now - last) / 1000, 0.001, 0.064);
        last = now;
        const speed = Math.abs(Velocity.get());
        if (staticMode) return;
        const target = REST_W + clamp(speed / 2000, 0, 1) * (MAX_W - REST_W);
        w += (target - w) * (1 - Math.exp(-dt * (target > w ? 10 : 3)));
        const r = Math.round(w * 10) / 10;
        if (r !== shown) { mark.style.setProperty('--ks-w', String(r)); shown = r; }
        if (visible && (Math.abs(target - w) > 0.05 || speed > 2)) frame = requestAnimationFrame(tick);
      };
      const kick = () => {
        if (visible && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
      };
      const io = 'IntersectionObserver' in window
        ? new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; kick(); })
        : null;
      if (io) io.observe(mark);
      else visible = true;
      window.addEventListener('scroll', kick, { passive: true });

      return () => {
        if (io) io.disconnect();
        window.removeEventListener('scroll', kick);
        cancelAnimationFrame(frame);
        mark.style.removeProperty('--ks-w');
      };
    });
  }

  /* ======================================================= Smooth scroll */

  function initSmoothScroll() {
    if (!hasLenis) return;
    watchMedia({ reduce: '(prefers-reduced-motion: reduce)' }, (c) => {
      if (c.reduce) return null; // no Lenis when reduced motion is requested
      const lenis = new window.Lenis({ autoRaf: !hasGSAP, lerp: 0.11, smoothWheel: true });
      Motion.lenis = lenis;
      if (html.classList.contains('is-loading')) lenis.stop(); // the loader locks scrolling until it releases the page
      let tickFn = null;
      if (hasGSAP) {
        tickFn = (time) => lenis.raf(time * 1000);
        window.gsap.ticker.add(tickFn);
        window.gsap.ticker.lagSmoothing(0);
      }
      if (hasST) lenis.on('scroll', window.ScrollTrigger.update);
      return () => {
        if (tickFn) {
          window.gsap.ticker.remove(tickFn);
          window.gsap.ticker.lagSmoothing(500, 33);
        }
        lenis.destroy();
        Motion.lenis = null;
      };
    });
  }

  /* ======================================================= Scroll effects */

  function manifestoReveal() {
    const body = $('.manifesto__body');
    if (!body || !hasSplit) return null;
    const { gsap, SplitText } = window;
    // Inline spans (CSS forces display:inline) so splitting never changes how the paragraph wraps.
    const split = SplitText.create(body, { type: 'words', wordsClass: 'mw', tag: 'span', aria: 'none' });
    const DIM = 'rgba(239, 235, 227, 0.4)';
    const tl = gsap.timeline({
      scrollTrigger: { trigger: body, start: 'top 82%', end: 'bottom 52%', scrub: 0.4 },
    });
    split.words.forEach((word, i) => {
      const keyword = !!word.closest('.kw');
      const from = { color: DIM };
      const to = { color: keyword ? '#FF3B1A' : '#EFEBE3', duration: 1, ease: 'none' };
      if (!keyword) {
        from.fontVariationSettings = '"GRAD" -200';
        to.fontVariationSettings = '"GRAD" 0';
      }
      tl.fromTo(word, from, to, i * 0.28);
    });
    return () => {
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
      split.revert();
    };
  }

  function pinInUse() {
    const section = $('.inuse');
    const viewport = section && $('.inuse__viewport', section);
    const track = viewport && $('.inuse__track', viewport);
    if (!track) return null;
    const { gsap, ScrollTrigger } = window;
    section.classList.add('is-pinned');
    viewport.removeAttribute('tabindex');

    const setHeight = () => {
      const caps = $$('.mock__cap', track);
      const capH = caps.reduce((m, cap) => Math.max(m, cap.offsetHeight), 0);
      const avail = viewport.clientHeight - capH - 14;
      section.style.setProperty('--mock-h', Math.max(240, Math.floor(avail)) + 'px');
    };
    const distance = () => {
      const pad = parseFloat(getComputedStyle(viewport).paddingLeft) || 0;
      return Math.max(0, track.offsetWidth - (viewport.clientWidth - pad * 2));
    };

    setHeight();
    ScrollTrigger.addEventListener('refreshInit', setHeight);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: () => 'top ' + navHeight() + 'px',
        end: () => '+=' + distance(),
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    return () => {
      ScrollTrigger.removeEventListener('refreshInit', setHeight);
      if (tween.scrollTrigger) tween.scrollTrigger.kill(true);
      tween.kill();
      gsap.set(track, { clearProps: 'transform' });
      section.classList.remove('is-pinned');
      section.style.removeProperty('--mock-h');
      viewport.setAttribute('tabindex', '0');
    };
  }

  function initScrollEffects() {
    if (!hasST) return;
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    if (hasSplit) gsap.registerPlugin(window.SplitText);
    const mm = gsap.matchMedia();
    mm.add({
      desktop: '(min-width: 768px)',
      mobile: '(max-width: 767.98px)',
      reduce: '(prefers-reduced-motion: reduce)',
    }, (context) => {
      const { desktop, reduce } = context.conditions;
      // Reduced motion: manifesto is fully legible from the start, In use scrolls natively.
      if (reduce) return undefined;
      const undo = [manifestoReveal()];
      // Mobile keeps native swipe with scroll-snap; desktop pins and scrubs horizontally.
      if (desktop) undo.push(pinInUse());
      return () => undo.forEach((fn) => { if (fn) fn(); });
    });
    fontsReady.then(() => ScrollTrigger.refresh());
    onFontsUpdate(() => ScrollTrigger.refresh());
  }

  /* ================================================================= Boot */

  function boot() {
    detectLibraries();
    const run = (name, fn) => {
      try { fn(); } catch (err) { console.error('[Kern Society] ' + name + ' failed:', err); }
    };
    html.classList.toggle('rm', mqReduce.matches);
    // Scroll effects come first: the manifesto is split while it is still hidden (before the fonts settle).
    const steps = [
      ['smooth scroll', initSmoothScroll],
      ['scroll effects', initScrollEffects],
      ['nav', initNav],
      ['logo', initLogo],
      ['modals', initModals],
      ['hero', initHero],
      ['licensing', initLicensing],
      ['newsletter', initNewsletter],
      ['ticker', initTicker],
      ['tester', initTester],
      ['typefaces', initTypefaces],
      ['footer mark', initFooterMark],
    ];
    // Initialise in short tasks (about 40ms each) so loading never blocks the main thread for long.
    const next = () => {
      const started = performance.now();
      while (steps.length && performance.now() - started < 40) {
        const [name, fn] = steps.shift();
        run(name, fn);
      }
      if (steps.length) setTimeout(next, 0);
      else if (hasST) window.ScrollTrigger.refresh(); // the modules above changed the page height
    };
    next();
  }

  // The loader starts now; the rest boots on DOMContentLoaded, after the deferred GSAP and Lenis scripts have run.
  try {
    initLoader();
  } catch (err) {
    console.error('[Kern Society] loader failed:', err);
    html.classList.remove('is-loading');
    endIntro();
  }
  if (document.readyState === 'complete') boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
