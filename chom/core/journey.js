// Chớm world, core: the four seasons, one after another, as the page scrolls (core/README.md, sections 10b and 12).
// index.html without ?season= runs this. Each season runs in its own frame (index.html?season=<id>&embed=1); this page maps
// the scroll onto them: a season's own push through its layers, then a hand-over (its layers come away from the far end toward
// the eye while its camera flies on, and the next season's camera arrives from behind its eye; the last layer left of one
// season is the foreground in front of the next). After the last season the page scrolls on into the page layer's tail.
//
// The page layer (page/page.js, owned by the page agent) is mounted here if it exists: mountPage(api), see README section 12.
import { notesFromCopy, loadCopy } from './notes.js';
const params = new URLSearchParams(location.search);
const DEV = params.get('dev') === '1';
const IDS = (params.get('seasons') || 'xuan,ha,thu,dong').split(',').filter(Boolean);
// what the page's address hands on to each season's frame (a setting being measured must reach the season, or the
// measurement is of the wrong thing)
const PASS = ['people', 't', 'quietms', 'linestyle', 'linew', 'sketchmove'].filter((k) => params.has(k)).map((k) => `&${k}=${encodeURIComponent(params.get(k))}`).join('');
const N = IDS.length;
// the scroll room: an opening stretch (the spring camera waits at its start), then one stretch per season:
//   HOLD_VH standing still where the season arrives (its bottle can be clicked), PUSH_VH pushing through its layers,
//   HAND_VH handing over to the next season (the last season has no hand-over: its push takes that room)
const INTRO_VH = params.has('intro') ? parseFloat(params.get('intro')) : 300;
// The resting stretch is ONE FULL SCREEN on every device: the viewer has to be able to stop on a season, look at the
// bottle and press it, and a stretch shorter than a screen is gone in one flick of the thumb. page/qa/page-check.mjs
// asserts it ("each step lasts at least one screen of scroll").
//
// (21/9: this was cut to 75vh on phones for most of the day, and that was my misreading. The page layer's note said the
// rest stretch "chỉ dài 75vh trên điện thoại" — "is ONLY 75vh on a phone", a complaint that it was too short — and I
// read it as a request to make it 75. The one page-check failure left on the phone was that cut. Put back to a screen.
// When a note names a number, check whether it is the number wanted or the number complained about.)
// Everything downstream reads these through __journey.layout and restG(), never by writing 100 down again somewhere.
const HOLD_VH = 100, PUSH_VH = 340, HAND_VH = 100;
const SEASON_VH = HOLD_VH + PUSH_VH + HAND_VH;
const HOLD = HOLD_VH / SEASON_VH, HAND = HAND_VH / SEASON_VH;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const sm = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const root = document.documentElement;
root.classList.add('journey');
root.style.setProperty('--seasons', N);
root.style.setProperty('--room', `${INTRO_VH + N * SEASON_VH}vh`);
const room = document.querySelector('.room');
const bar = document.getElementById('bar');
const stage = document.createElement('div');
stage.id = 'stage';
document.body.insertBefore(stage, document.body.firstChild);
const tail = document.createElement('div');
tail.id = 'page-tail';
room.after(tail);
const state = (window.__journey = {
  ready: false, seasons: IDS.map((id) => ({ id, ready: false, progress: 0 })), g: 0,
  // the scroll room's own numbers, so a check never has to guess them (README 13: read the real numbers)
  layout: { introVh: INTRO_VH, seasonVh: SEASON_VH, holdVh: HOLD_VH, pushVh: PUSH_VH, handVh: HAND_VH },
  // where a season stands still and its bottle can be clicked (the middle of its rest stretch), as a g value
  restG: (i) => (Math.max(0, Math.min(IDS.length - 1, i | 0)) + 0.5 * (HOLD_VH / SEASON_VH)) / IDS.length,
});

// ---------------- the page layer's hooks ----------------
const hooks = { progress: [], ready: [], season: [], scroll: [], notes: [], error: [], enter: [], cut: [] };
let lastError = null, progressMax = 0;
const fail = (reason, detail = {}) => {
  if (lastError) return;
  lastError = { reason, ...detail };
  state.error = lastError;
  emit('error', lastError);
  // without a page layer nobody would be told: say it on the veil, where the viewer is already looking
  if (!pageMounted && reason === 'load-failed') {
    try {
      const veil = document.querySelector('.veil');
      if (veil && !veil.querySelector('.veil-said')) {
        const p = document.createElement('p');
        p.className = 'veil-said';
        p.setAttribute('role', 'alert');
        p.style.cssText = 'position:absolute;left:50%;top:58%;transform:translateX(-50%);max-width:30rem;margin:0;padding:0 1.5rem;text-align:center;font:400 0.95rem/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#5a4c48';
        p.textContent = `Chớm could not open. ${detail.message || reason}`;
        veil.appendChild(p);
      }
    } catch (e) { /* nothing left to say it with */ }
  }
};
const emit = (k, v) => { for (const f of hooks[k]) { try { f(v); } catch (e) { console.error(e); } } };
let lang = 'en';
const notesText = {};                 // [seasonId][lang] = notes, given by the page layer (setNotes), else built from window.CHOM_COPY
let scrollLocks = 0, notesOpen = false;
const lockClass = () => root.classList.toggle('is-focus', notesOpen || scrollLocks > 0);

// ---------------- the frames: made one after another (the first first, so the page opens as soon as it is ready) ----------------
const frames = IDS.map((id, i) => {
  const f = document.createElement('iframe');
  f.className = 'season is-off';
  f.title = `Chớm, ${id}`;
  f.style.zIndex = String(N - i);
  // only the season being looked at is in the keyboard order (its bottle button); apply() moves it along
  f.setAttribute('tabindex', '-1');
  f.inert = true;
  stage.appendChild(f);
  return f;
});
const api = (i) => { try { return frames[i].contentWindow.__chom; } catch (e) { return null; } };

// ---------------- the opening scene (README 14) ----------------
// A still life the page opens on, before the first season: one open bottle and the ribbon of scent climbing from it, with the
// spring waiting inside the scent. It is not a season: no card, no bottle button, never in the keyboard order. It has the
// opening stretch of the scroll room to itself. ?intro=0 (no opening stretch) or ?opening=0 leaves it out altogether.
const OPEN_ID = INTRO_VH > 0 && params.get('opening') !== '0' ? (params.get('opening') || 'mocua') : null;
// where the opening gives way: by then the picture it carries has taken the whole frame, so the season steps into its place
// without anything being seen to change (and the page draws one scene again, not two)
const OPEN_END = 0.97;
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let openFrame = null, openFailed = false;
state.opening = OPEN_ID ? { id: OPEN_ID, ready: false, progress: 0 } : null;
if (OPEN_ID) {
  openFrame = document.createElement('iframe');
  openFrame.className = 'season is-off';
  openFrame.title = `Chớm, ${OPEN_ID}`;
  openFrame.style.zIndex = String(N + 2);
  openFrame.setAttribute('tabindex', '-1');
  openFrame.setAttribute('aria-hidden', 'true');
  openFrame.inert = true;
  stage.appendChild(openFrame);
}
const openApi = () => { try { return openFrame && openFrame.contentWindow.__chom; } catch (e) { return null; } };
const openOn = () => !!(OPEN_ID && !openFailed && state.opening.ready);
// the opening could not be built (or never answered): the page goes straight to the seasons, as it does without one
function dropOpening(why) {
  if (!OPEN_ID || openFailed) return;
  openFailed = true;
  console.warn(`[chom] the opening scene (${OPEN_ID}) ${why}; the page goes straight to the seasons`);
  if (openFrame) openFrame.classList.add('is-off');
  if (!state.ready && state.seasons[0].ready) openPage();
  apply(true);
}
// The first season loads at once. Near the end of its loading the others are opened too, one after another (their drawing
// contexts and textures are made while the page is still loading: that costs a long moment each), but each builds only when
// the one before it is ready (window.__chomGo), in small slices (&bg=1), while the first one is already being looked at.
window.__chomGo = { [IDS[0]]: true };
if (OPEN_ID) {
  openFrame.src = `./index.html?season=${OPEN_ID}&embed=1&opening=1${PASS}${DEV ? '&dev=1' : ''}`;
  setTimeout(() => { if (!state.opening.ready) dropOpening('did not open in 25 s'); }, 25000);
}
// ---------------- the page's entrance is kept quiet ----------------
// When the page is shown, the page layer lets its waiting screen fade and flies the name "Chớm" home. Measured 21/9
// (core/qa/loadstutter.mjs, 10 runs out of 10): a 83–117 ms freeze landed in the middle of that flight every time.
// It was not the page's own thread — that sat idle. It was the GPU: the first season, still building behind the opening,
// drew its first new kinds of shape ("warm: buffers"), and each one made the GPU build a shader variant in one piece
// (72 and 114 ms batches from that season's context, traced back by the order the contexts were made). Around it: the
// three later seasons opening their frames (a new drawing context, the brush textures: 13–21 ms tasks each), and the
// first season's 41 shaders compiling on every core at once, which slowed the page's own painting to 81 ms.
// So from the moment the page can be shown until the name has landed (+200 ms), no season gives the GPU any work: a season
// that reaches its warm-up waits there (core/world.js entranceHold), the rest of its build goes on at a trickle (4 ms a
// frame), and no new season frame is opened. The scene on screen keeps drawing. The name's landing is the page layer's own mark pg:fly-end
// (the page layer is not changed for this); a page layer that never flies a name lets go ENTRANCE_NO_FLIGHT_MS after it
// steps in, and nothing is ever held longer than ENTRANCE_CAP_MS. ?entrancehold=0 turns it off (for measuring).
// state.entrance says when it was held, when and why it let go.
const ENTRANCE_AFTER_LAND_MS = 200, ENTRANCE_NO_FLIGHT_MS = 2500, ENTRANCE_CAP_MS = 4000;
const ENTRANCE_HOLD = params.get('entrancehold') !== '0';
window.__chomHold = false;
const heldLoads = [];
let entranceCap = 0;
function holdEntrance() {
  if (!ENTRANCE_HOLD || !pageMounted || state.entrance) return;
  window.__chomHold = true;
  state.entrance = { heldAt: Math.round(performance.now()) };
  entranceCap = setTimeout(() => releaseEntrance('cap'), ENTRANCE_CAP_MS);
}
function releaseEntrance(why) {
  if (!window.__chomHold) return;
  window.__chomHold = false;
  clearTimeout(entranceCap);
  state.entrance.releasedAt = Math.round(performance.now());
  state.entrance.why = why;
  for (const f of heldLoads.splice(0)) f();
}
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (e.name === 'pg:fly-end') setTimeout(() => releaseEntrance('landed'), ENTRANCE_AFTER_LAND_MS);
  }).observe({ type: 'mark', buffered: true });
} catch (e) { /* no observer: the other two ways out still hold */ }
hooks.enter.push(() => setTimeout(() => { if (!performance.getEntriesByName('pg:fly-start').length) releaseEntrance('no flight'); }, ENTRANCE_NO_FLIGHT_MS));

const opened = new Set(), openedNext = new Set(), toldGo = new Set([0]);
function load(i, hold = false) {
  if (i >= N || opened.has(i)) return;
  // (a season frame asked for during the entrance is opened when it is over)
  if (i > 0 && window.__chomHold) { heldLoads.push(() => load(i, hold)); return; }
  opened.add(i);
  frames[i].src = `./index.html?season=${IDS[i]}&embed=1${i > 0 ? '&bg=1' : ''}${hold ? '&hold=1' : ''}${PASS}${DEV ? '&dev=1' : ''}`;
  // a season that never answers (a file that will not load, a very slow machine) must not hold up the ones behind it
  setTimeout(() => openNext(i, 'no answer in 20 s'), 20000);
  setTimeout(() => goNext(i, 'not ready in 120 s'), 120000);
}
// open the next frame (its drawing context), and later let it build
function openNext(i, why) {
  if (i + 1 >= N || openedNext.has(i)) return;
  openedNext.add(i);
  if (why) console.warn(`[chom] ${IDS[i]}: ${why}; opening ${IDS[i + 1]} anyway`);
  load(i + 1, true);
}
function goNext(i, why) {
  if (i + 1 >= N || toldGo.has(i + 1)) return;
  toldGo.add(i + 1);
  if (why) console.warn(`[chom] ${IDS[i]}: ${why}; letting ${IDS[i + 1]} build anyway`);
  window.__chomGo[IDS[i + 1]] = true;
  load(i + 1);
}
function openRest() { openNext(0); }
let coreCopy = null;
function pushLanguage(i) {
  const a = api(i);
  if (!a || !a.setLanguage) return;
  // words: the page layer's own (setNotes), else the shared copy (window.CHOM_COPY, else page/copy.js), else the season's
  const C = window.CHOM_COPY || coreCopy;
  const t = notesText[IDS[i]]?.[lang] ?? notesFromCopy(C && C[lang], IDS[i], lang);
  if (t) a.setNotes(lang, t);
  a.setLanguage(lang);
  try { frames[i].contentDocument.documentElement.lang = lang; } catch (e) { /* not ready */ }
}
const loadProgress = () => state.seasons[0].progress;
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || !e.data.chom) return;
  if (OPEN_ID && e.data.chom === OPEN_ID) {
    const d = e.data;
    if (d.error) { dropOpening('could not be built'); return; }
    if (d.progress !== undefined) {
      state.opening.progress = Math.max(state.opening.progress, d.progress);
      if (!state.ready) reportProgress(state.opening.progress * 0.9);
    }
    if (d.ready) {
      state.opening.ready = true;
      state.opening.readyMs = d.readyMs;
      openApi().journey({ push: 0, run: true, active: false });
      openPage();
      apply(true);
    }
    return;
  }
  const i = IDS.indexOf(e.data.chom);
  if (i < 0) return;
  const d = e.data;
  if (d.error) {
    fail(i === 0 ? 'load-failed' : 'season-failed', { id: IDS[i], message: d.error });
    openNext(i, 'it could not be built');
    goNext(i, 'it could not be built');
    return;
  }
  // a season opened early has its context and textures: open the next one
  if (d.held) openNext(i);
  if (d.progress !== undefined) {
    state.seasons[i].progress = Math.max(state.seasons[i].progress, d.progress);
    if (i === 0 && d.progress >= 0.8) openRest();
    if (!state.ready) reportProgress(loadProgress());
  }
  if (d.ready) {
    state.seasons[i].ready = true;
    state.seasons[i].progress = 1;
    state.seasons[i].readyMs = d.readyMs;
    api(i).journey({ run: false });
    pushLanguage(i);
    if (i === 0) {
      reportProgress(1);
      openPage();
    }
    goNext(i);
    apply(true);
  }
  if (d.focus !== undefined) {
    notesOpen = d.focus;
    lockClass();
    emit('notes', { open: d.focus, id: IDS[i], index: i });
  }
});
// the page can be looked at now: the opening is up, or (without one) the first season is
function openPage() {
  if (state.ready) return;
  reportProgress(openOn() ? Math.max(progressMax, 0.95) : 1);
  // without a page layer the core opens the page itself; with one, the page does (after its language choice)
  if (!pageMounted) root.classList.remove('is-loading');
  state.ready = true;
  state.readyMs = Math.round(performance.now());
  holdEntrance();
  emit('ready', { readyMs: state.readyMs });
}
function reportProgress(v) {
  progressMax = Math.max(progressMax, v);
  bar.style.transform = `scaleX(${progressMax})`;
  emit('progress', progressMax);
}
bar.style.transform = 'scaleX(0.05)';

// ---------------- scroll -> where we are ----------------
// the journey spans the scroll room only; below it the page layer's tail scrolls on over the last season
// (the room's place and size are kept, and read again only when something changes size: reading them on every scroll
// event would make the browser lay the page out again whenever the page layer has just changed something)
const geo = { top: 0, height: 0, vh: 0, dirty: true };
const measure = () => { if (!geo.dirty) return geo; geo.top = room.offsetTop; geo.height = room.offsetHeight; geo.vh = window.innerHeight; geo.dirty = false; return geo; };
const stale = () => { geo.dirty = true; };
window.addEventListener('resize', stale);
if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(stale); ro.observe(room); ro.observe(document.body); }
const introPx = () => (INTRO_VH / 100) * measure().vh;
const seasonsPx = () => Math.max(1, measure().height - measure().vh - introPx());
// the intro's progress (0..1) and g (0..1 across the seasons), from the scroll position; g is 0 through the intro
const scrollTarget = () => {
  const y = window.scrollY - measure().top;
  introT = clamp01(y / Math.max(1, introPx()));
  // (where the viewer really is in the opening, before the stop below: a first season still building reads it and, once
  // the viewer is on the way in, stops pacing itself — core/world.js viewerComing)
  state.introRaw = introT;
  // the walk into the scent stops just short of the way in until the first season is ready to be walked into
  if (openOn() && !state.seasons[0].ready) introT = Math.min(introT, 0.86);
  return clamp01((y - introPx()) / seasonsPx());
};
const FIXED = params.has('g') ? clamp01(parseFloat(params.get('g')) || 0) : null;
let introT = 0;
let target = FIXED ?? 0, g = target;
// (seasons building in the background take less time per frame while the viewer scrolls)
window.__chomScrollAt = 0;
window.addEventListener('scroll', () => { window.__chomScrollAt = Date.now(); if (FIXED === null) target = scrollTarget(); }, { passive: true });
state.setG = (v) => { target = g = clamp01(v); introT = 1; apply(true); return true; };
const scrollYFor = (gv) => measure().top + introPx() + gv * seasonsPx();
state.scrollYFor = scrollYFor;

// what each season is doing at g
function plan(gv) {
  const out = IDS.map(() => ({ run: false, active: false, push: 0, through: 0, peel: 0, arrive: 1, show: false }));
  const x = gv * N;
  const i = Math.min(N - 1, Math.floor(x));
  let u = x - i;
  // the next season must be ready before the hand-over can start
  const last = i === N - 1;
  const nextReady = !last && state.seasons[i + 1].ready;
  const handStart = 1 - HAND;
  if (!last && !nextReady) u = Math.min(u, handStart);
  const s = out[i];
  s.run = s.show = s.active = true;
  s.push = clamp01((u - HOLD) / ((last ? 1 : handStart) - HOLD));
  out.index = i; out.local = s.push; out.handover = 0;
  if (!last && u > handStart) {
    const h = (u - handStart) / HAND;          // 0 .. 1 through the hand-over
    out.handover = h;
    s.through = sm(0, 1, h);
    s.peel = sm(0.02, 0.95, h);
    s.active = h < 0.5;
    const n = out[i + 1];
    n.run = n.show = true;
    n.arrive = sm(0.1, 1, h);
    n.active = h >= 0.5;
    if (h >= 0.5) out.index = i + 1;
    if (h >= 0.999) { s.show = s.run = false; }
  }
  return out;
}

let lastPlan = null, lastIndex = -1, lastEmit = '';
// how far into the scent the viewer has walked (0 = the still life, 1 = through the way in and into the season)
// Behind it the first season is already on the page (so nothing has to be made when the two swap): it stands still at first,
// draws for itself while the picture inside the scent is taken from it, and at the very end only draws those pictures.
const introK = () => (openOn() ? introT : 1);
function openingApply(force) {
  if (!OPEN_ID || !openFrame) return;
  const t = introK();
  const on = openOn() && t < OPEN_END;
  if (openFrame.classList.contains('is-off') === on) openFrame.classList.toggle('is-off', !on);
  openFrame.style.pointerEvents = 'none';
  // motion turned down: no walk into the scent, the opening just gives way to the season behind it
  if (REDUCED) {
    openFrame.style.transition = 'opacity .3s linear';
    openFrame.style.opacity = String(1 - clamp01((t - 0.84) / 0.1));
  }
  const a = openApi();
  if (a && state.opening.ready && (force || on || lastOpenT !== t)) {
    lastOpenT = t;
    a.journey({ push: Math.min(t, 1), run: on, active: false, arrive: 1, intro: t });
  }
}
let lastOpenT = -1, picAt = 0, picBusy = false;
function apply(force = false) {
  const p = plan(g);
  // the opening covers the first season until the walk into the scent is over
  const inOpening = openOn() && introT < OPEN_END;
  if (inOpening) {
    for (let i = 1; i < N; i++) { p[i].show = false; p[i].run = false; p[i].active = false; }
    p[0].show = true;
    p[0].active = false;
    // it does not draw for itself while the opening is in front: the pictures asked of it are its frames (carryPicture),
    // so the page draws the season once per frame, not twice. With motion turned down there are no pictures: the season
    // simply runs behind, and the opening dissolves into it
    p[0].run = REDUCED;
  }
  p.forEach((s, i) => {
    const ok = state.seasons[i].ready;
    const f = frames[i];
    const show = s.show && ok;
    if (f.classList.contains('is-off') === show) f.classList.toggle('is-off', !show);
    const live = s.active && ok;
    if (f.inert === live) f.inert = !live;
    const ti = live ? '0' : '-1';
    if (f.getAttribute('tabindex') !== ti) f.setAttribute('tabindex', ti);
    f.style.pointerEvents = live ? 'auto' : 'none';
    if (!ok) return;
    const prev = lastPlan && lastPlan[i];
    if (force || !prev || prev.push !== s.push || prev.through !== s.through || prev.peel !== s.peel || prev.arrive !== s.arrive || prev.run !== s.run || prev.active !== s.active) {
      api(i).journey({ push: s.push, through: s.through, peel: s.peel, arrive: s.arrive, run: s.run && show, active: s.active });
    }
  });
  lastPlan = p;
  state.g = g;
  state.plan = p;
  state.introT = introT;
  openingApply(force);
  // onSeason: the stretch of scroll we are in (index -1 = the opening stretch), u = 0..1 through it (a season's includes its
  // hand-over), g = the smoothed value the scene uses; called whenever one of them changes
  const intro = g <= 0 && introT < 1;
  const x = g * N;
  const si = intro ? -1 : Math.min(N - 1, Math.floor(x));
  const su = intro ? introT : (g >= 1 ? 1 : x - si);
  // phase: 'intro' (p through the opening stretch), 'rest' (p through a season's still stretch; the bottle can be clicked),
  // 'push' (p = the push through its layers), 'peel' (p through the hand-over), 'end' (past the last season)
  let phase, pp;
  if (intro) { phase = 'intro'; pp = introT; }
  else if (g >= 1) { phase = 'end'; pp = 1; }
  else if (su < HOLD) { phase = 'rest'; pp = su / HOLD; }
  else if (si < N - 1 && su > 1 - HAND) { phase = 'peel'; pp = (su - (1 - HAND)) / HAND; }
  else { phase = 'push'; pp = p[si].push; }
  const key = `${si}|${su.toFixed(4)}|${g.toFixed(5)}|${phase}`;
  if (key !== lastEmit) {
    lastEmit = key;
    emit('season', { index: si, id: si >= 0 ? IDS[si] : null, u: su, g, intro, phase, p: pp });
    emit('scroll', { g, index: p.index, id: IDS[p.index], local: p.local, handover: p.handover, intro, introT, phase, p: pp, stretch: si });
  }
  lastIndex = si;
}

// ---------------- a cut straight to a season (the page's season links) ----------------
// A short veil over the stage, the jump (the scene is set at once: no flight through the seasons between), one drawn frame of
// the season, the veil lifts. A season that has not loaded yet is waited for (onCut says so, with its progress).
const cutVeil = document.createElement('div');
cutVeil.className = 'cut-veil';
cutVeil.setAttribute('aria-hidden', 'true');
stage.appendChild(cutVeil);
const waitMs = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFrames = (n) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
let cutting = null;
function scrollToSeason(i, opt = 'smooth') {
  const o = typeof opt === 'string' ? { behavior: opt } : (opt || {});
  const k = Math.max(0, Math.min(N - 1, i | 0));
  const gT = (k + HOLD * 0.5) / N;
  if (!o.cut) { window.scrollTo({ top: scrollYFor(gT), behavior: o.behavior ?? 'smooth' }); return Promise.resolve({ index: k, id: IDS[k], cut: false }); }
  const run = async () => {
    const t0 = performance.now();
    if (notesOpen) { pageApi.closeNotes(); await waitMs(400); }
    while (!state.seasons[k].ready) {
      if (lastError) throw new Error(`season ${IDS[k]} failed to load`);
      emit('cut', { index: k, id: IDS[k], phase: 'waiting', progress: state.seasons[k].progress });
      await waitMs(120);
    }
    const waited = Math.round(performance.now() - t0);
    const quick = matchMedia('(prefers-reduced-motion: reduce)').matches;
    emit('cut', { index: k, id: IDS[k], phase: 'cutting', waitedMs: waited });
    if (!quick) { cutVeil.classList.add('is-on'); await waitMs(220); }
    window.scrollTo({ top: scrollYFor(gT), behavior: 'instant' });
    target = g = scrollTarget();
    apply(true);
    await waitFrames(3);
    if (!quick) { cutVeil.classList.remove('is-on'); await waitMs(380); }
    const res = { index: k, id: IDS[k], cut: true, waitedMs: waited };
    emit('cut', { ...res, phase: 'done' });
    return res;
  };
  cutting = (cutting || Promise.resolve()).catch(() => {}).then(run);
  return cutting;
}

// ---------------- the spring inside the scent ----------------
// The first season draws a picture of itself; the opening shows that picture inside its ribbons of scent, bent and broken by
// the scent itself (core/paint.js). The further the walk goes, the more of the picture shows, the less the scent bends it, and
// the larger the picture is drawn — every step of that happens while the scent still covers the frame, so nothing is seen to
// change. At the end the picture fills the frame and the real season takes its place.
function carryPicture(dt) {
  if (!openOn() || introT >= OPEN_END) return;
  const a = openApi();
  if (!a || !a.showPicture) return;
  const t = introT;
  if (REDUCED) { a.showPicture(null, { k: 0 }); return; }
  const k = sm(0, 1, clamp01((t - 0.26) / 0.64));
  const warp = 1.5 * (1 - sm(0.45, 0.97, t));
  const shard = 1 - sm(0.42, 0.93, t);
  a.showPicture(null, { k, warp, shard });
  if (k <= 0 || !state.seasons[0].ready || picBusy) return;
  // how large a picture, and how often: bigger and more often as the scent fills the frame. While the other seasons are
  // still being built behind the page, the pictures are asked for rarely and small: drawing a season twice as often as it
  // needs would take the very moments the building needs (the scent bends the picture anyway, so it is not seen)
  const busy = !state.seasons.every((x) => x.ready);
  const w0 = t < 0.5 ? 420 : t < 0.72 ? 720 : t < 0.88 ? 1024 : Math.min(1600, Math.round(innerWidth));
  const w = busy ? Math.min(w0, 640) : w0;
  const every0 = t < 0.5 ? 110 : t < 0.72 ? 70 : t < 0.96 ? 33 : 0;
  const every = busy ? Math.max(every0, 300) : every0;
  const now2 = performance.now();
  if (now2 - picAt < every) return;
  picBusy = true;
  const A0 = api(0);
  const h = Math.max(2, Math.round((w * innerHeight) / Math.max(1, innerWidth)));
  // past 0.90 the season no longer draws for itself: these pictures are its frames, so its own clock moves with them
  Promise.resolve(A0 && A0.picture ? A0.picture({ w, h, dt: Math.min(0.05, (now2 - (picAt || now2)) / 1000) }) : null)
    .then((bm) => {
      picAt = performance.now();
      picBusy = false;
      const b = openApi();
      if (bm && b && b.showPicture) b.showPicture(bm, { k, warp, shard });
      else if (bm && bm.close) bm.close();
    })
    .catch(() => { picBusy = false; });
}

let lastT = performance.now(), fAcc = 0, fN = 0;
let devEl = null;
function tick(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  fAcc += dt; fN++;
  if (fAcc > 0.5) { state.fps = +(fN / fAcc).toFixed(1); fAcc = 0; fN = 0; }
  const k = FIXED !== null ? 1 : 1 - Math.exp(-dt * 5.5);
  g += (target - g) * k;
  if (Math.abs(target - g) < 1e-5) g = target;
  if (state.ready) apply();
  if (state.ready) { try { carryPicture(dt); } catch (e) { dropOpening('could not show the season inside its scent'); console.error(e); } }
  if (DEV) {
    devEl = devEl || document.getElementById('dev');
    devEl.hidden = false;
    devEl.textContent = `g ${g.toFixed(3)} · ${state.fps ?? ''} fps · ` + IDS.map((id, i) => { const s = state.plan?.[i]; return `${id}${state.seasons[i].ready ? '' : '…'} ${s?.run ? `p${s.push.toFixed(2)} t${s.through.toFixed(2)} pe${s.peel.toFixed(2)} a${s.arrive.toFixed(2)}` : '-'}`; }).join(' | ');
  }
  requestAnimationFrame(tick);
}

// ---------------- the page layer (page/page.js), if there is one ----------------
let pageMounted = false;
const pageApi = {
  seasons: IDS.slice(),
  seasonCount: N,
  room,                                            // the scroll room (intro + seasons); g is measured on it alone
  introVh: INTRO_VH, seasonVh: SEASON_VH, holdVh: HOLD_VH, pushVh: PUSH_VH, handVh: HAND_VH,
  tail,                                            // put the blend / order / footer sections in here (after the last season)
  onProgress: (f) => { hooks.progress.push(f); if (progressMax > 0) f(progressMax); },   // f(0..1), the first season's real load; only rises
  onReady: (f) => { hooks.ready.push(f); if (state.ready) f({ readyMs: state.readyMs }); },
  onError: (f) => { hooks.error.push(f); if (lastError) f(lastError); },                  // f({ reason: 'no-webgl' | 'load-failed' | 'season-failed' | 'timeout', ... })
  onSeason: (f) => { hooks.season.push(f); },      // f({ index (-1 = intro), id, u, g, intro }) whenever it changes
  onScroll: (f) => { hooks.scroll.push(f); },      // f({ g, index (the season on screen), id, local, handover, intro, introT })
  onFocus: (f) => { hooks.notes.push((n) => f(n.open, n.id)); },   // f(open, seasonId): a bottle's notes open or close (the scroll is locked)
  onNotes: (f) => { hooks.notes.push(f); },        // same, as f({ open, id, index })
  enter: () => { if (!state.entered) { state.entered = true; emit('enter', {}); } },
  onEnter: (f) => { hooks.enter.push(f); if (state.entered) f({}); },
  isNotesOpen: () => notesOpen,
  setScrollLock: (on) => { scrollLocks = Math.max(0, scrollLocks + (on ? 1 : -1)); lockClass(); },
  setLanguage: (l) => { lang = l; for (let i = 0; i < N; i++) if (state.seasons[i].ready) pushLanguage(i); },
  setNotes: (id, l, notes) => { (notesText[id] = notesText[id] || {})[l] = notes; const i = IDS.indexOf(id); if (i >= 0 && state.seasons[i].ready) pushLanguage(i); },
  // to where season i has just arrived (the middle of its still stretch: the bottle can be clicked)
  // scrollToSeason(i): scroll there ('smooth' or 'instant'); scrollToSeason(i, { cut: true }): cut straight there (a promise)
  scrollToSeason,
  onCut: (f) => { hooks.cut.push(f); },           // f({ index, id, phase: 'waiting' (progress) | 'cutting' | 'done', waitedMs })
  scrollToTail: (behavior = 'smooth') => window.scrollTo({ top: tail.offsetTop, behavior }),
  openNotes: () => { const i = lastPlan?.index ?? 0; api(i)?.open(); },
  // where season i's bottle is on the page (css px) when its camera stands still at its arrival; null until it has loaded
  bottleRect: (i) => (state.seasons[i]?.ready ? api(i)?.bottleRestRect?.() ?? null : null),
  closeNotes: () => { for (let i = 0; i < N; i++) if (state.seasons[i].ready) api(i).close(); },
  state,
};
window.addEventListener('chom:enter', () => pageApi.enter());
let page = null;
try {
  const res = await fetch('./page/page.js', { method: 'HEAD' });
  if (res.ok) page = await import('../page/page.js');
} catch (e) { page = null; }
if (page && page.mountPage) {
  root.classList.add('has-page');                  // the core's own veil gives way to the page's loader
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = './page/page.css';
  document.head.appendChild(css);
  pageMounted = true;
  try { await page.mountPage(pageApi); } catch (e) { console.error('[chom-world] page/page.js failed to mount', e); }
}
state.page = !!page;
state.api = pageApi;
coreCopy = await loadCopy();
// WebGL is needed for the seasons; without it the page layer shows its fallback
const probe = document.createElement('canvas');
if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) fail('no-webgl');
else {
  load(0);
  setTimeout(() => { if (!state.ready) fail('timeout'); }, 60000);
}
requestAnimationFrame(tick);
