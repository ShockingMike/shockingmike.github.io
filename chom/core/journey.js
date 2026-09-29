// Chớm world, core: the four seasons, one after another, as the page scrolls (core/README.md, sections 10b and 12).
// index.html without ?season= runs this. Each season runs in its own frame (index.html?season=<id>&embed=1); this page maps
// the scroll onto them: a season's own push through its layers, then a hand-over (its layers come away from the far end toward
// the eye while its camera flies on, and the next season's camera arrives from behind its eye; the last layer left of one
// season is the foreground in front of the next). After the last season the page scrolls on into the page layer's tail.
//
// The page layer (page/page.js, owned by the page agent) is mounted here if it exists: mountPage(api), see README section 12.
import { notesFromCopy, loadCopy } from './notes.js';
import { gpuInfo, forcedTier, firstTier, makeGovernor } from './quality.js';
const params = new URLSearchParams(location.search);
const DEV = params.get('dev') === '1';
const IDS = (params.get('seasons') || 'xuan,ha,thu,dong').split(',').filter(Boolean);
// what the page's address hands on to each season's frame (a setting being measured must reach the season, or the
// measurement is of the wrong thing)
const PASS = ['people', 't', 'quietms', 'linestyle', 'linew', 'sketchmove', 'q', 'qscale', 'qmsaa', 'qsun', 'qlamp', 'qsteps', 'qdiv', 'qsharp'].filter((k) => params.has(k)).map((k) => `&${k}=${encodeURIComponent(params.get(k))}`).join('');

// ---------------- can this machine draw the seasons, and at which quality step (core/quality.js, README 16) ----------------
// Asked once, before any season frame is made: each frame reads window.__tier as it starts. The context asked is let go
// straight away (it would otherwise stay alive next to the five the page draws with).
const probe = document.createElement('canvas');
const probeGl = probe.getContext('webgl2', { powerPreference: 'high-performance' }) || probe.getContext('webgl', { powerPreference: 'high-performance' });
const GPU = gpuInfo(probeGl);
try { probeGl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch (e) { /* gone already */ }
const Q_FORCED = forcedTier(params);
// A software renderer (no graphics chip: SwiftShader, llvmpipe, Windows' Basic Render Driver) draws one frame of the
// lightest scene in about 1.4 s, and a season's build moves a slice per frame, so the first season never finishes and the
// whole tab stops answering — measured 28/9. No step can bring that to a page anyone can look at, so it gets the reading
// version, the same as a machine without WebGL. (?q= forces the scenes anyway, for testing.)
const NO_3D = !probeGl ? 'no WebGL' : GPU.soft && Q_FORCED === null ? `software renderer (${GPU.name})` : null;
window.__tier = Q_FORCED ?? firstTier(GPU);
window.__gpu = GPU.name;
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
// (a NaN comes out as 0, not as NaN: `x < 0` and `x > 1` are both false for it)
const clamp01 = (x) => (x > 0 ? (x < 1 ? x : 1) : 0);
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
const hooks = { progress: [], ready: [], season: [], scroll: [], notes: [], error: [], enter: [], cut: [], wait: [] };
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
const OPEN_ID = !NO_3D && INTRO_VH > 0 && params.get('opening') !== '0' ? (params.get('opening') || 'mocua') : null;
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
  if (!state.ready) reportProgress(loadNow());
  maybeOpen();
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

// ---------------- the first seconds after the page opens are left alone (29/9) ----------------
// Spring is ready when the page opens now, so the first two scrolls never wait. What could still make those first
// seconds stutter is the next seasons being opened and built behind the page — measured 29/9: frames of 67–117 ms in
// the 5 s after stepping in, while the viewer walked into the scent. So for QUIET_MS after the viewer steps in, no season
// frame is opened and no season starts to build; then they go on as before, one after another. (A viewer who gets to
// summer before it is ready waits there, told so: "waiting for a season".)
const QUIET_MS = +(params.get('quietafter') ?? 5000);
let quietUntil = Infinity;              // until the viewer steps in, the waiting screen is up: work away
const afterQuiet = [];
const quietNow = () => performance.now() < quietUntil;
window.__chomQuiet = false;             // (a season frame still getting ready works as during the entrance meanwhile)
hooks.enter.push(() => {
  quietUntil = performance.now() + QUIET_MS;
  window.__chomQuiet = QUIET_MS > 0;
  setTimeout(() => { window.__chomQuiet = false; for (const f of afterQuiet.splice(0)) f(); }, QUIET_MS + 20);
});
const opened = new Set(), openedNext = new Set(), toldGo = new Set([0]);
function load(i, hold = false) {
  if (i >= N || opened.has(i)) return;
  // (a season frame asked for during the entrance, or in the quiet after it, is opened when that is over)
  if (i > 0 && window.__chomHold) { heldLoads.push(() => load(i, hold)); return; }
  if (i > 0 && state.entered && quietNow()) { afterQuiet.push(() => load(i, hold)); return; }
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
  // (the next season builds only once the viewer is in and the quiet after it is over: building it under the waiting
  // screen would only make spring's own wait longer)
  if (!state.entered || quietNow()) { afterQuiet.push(() => goNext(i, why)); return; }
  toldGo.add(i + 1);
  if (why) console.warn(`[chom] ${IDS[i]}: ${why}; letting ${IDS[i + 1]} build anyway`);
  window.__chomGo[IDS[i + 1]] = true;
  load(i + 1);
}
function openRest() { openNext(0); }
// spring starts at once, together with the opening scene (29/9: it used to wait for the page layer to be fetched and
// mounted and the words to be loaded first — a second or more on a slow line, for nothing)
if (!NO_3D) load(0);
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
// ---------------- the waiting screen tells the truth (Mike, 29/9) ----------------
// "Dù ghi đã load 100% nhưng trang vẫn chưa thực sự load 100%, lúc đầu vào vẫn phải chờ." Until 29/9 the page opened
// the moment the opening scene was ready, and spring only really got going after that: measured on the live page,
// 100% at 8.8 s and spring ready at 16.9 s, and a viewer who scrolled in the meantime stood at the way into the scent.
// Now the waiting screen counts everything the first two scrolls need — the opening scene AND spring, each fetched,
// built, its shaders compiled and warmed up — and the page opens only when both are ready. The share is each one's real
// weight in the load: measured 29/9 on their own pages, the opening 1.6 s of 7.3 locally and 6.8 s of 24 at 10 Mbps
// (5.5 MB and 9.2 MB), so a quarter and three quarters. It only ever rises (reportProgress keeps the highest).
// Summer, autumn and winter go on loading behind the page while spring is looked at (a step into one that is not ready
// yet waits, with the page layer saying so: "waiting for a season", below).
const LOAD_W_OPEN = 0.25;
const loadNow = () => (OPEN_ID && !openFailed
  ? LOAD_W_OPEN * state.opening.progress + (1 - LOAD_W_OPEN) * state.seasons[0].progress
  : state.seasons[0].progress);
let mountDone = false;
// the page opens when everything the first two scrolls need is ready (and the page layer, if any, is mounted)
function maybeOpen() {
  if (state.ready || !mountDone) return;
  if (!state.seasons[0].ready) return;
  if (OPEN_ID && !openFailed && !state.opening.ready) return;
  openPage();
}
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || !e.data.chom) return;
  if (OPEN_ID && e.data.chom === OPEN_ID) {
    const d = e.data;
    if (d.error) { dropOpening('could not be built'); return; }
    if (d.progress !== undefined) {
      state.opening.progress = Math.max(state.opening.progress, d.progress);
      if (!state.ready) reportProgress(loadNow());
    }
    if (d.ready) {
      state.opening.ready = true;
      state.opening.readyMs = d.readyMs;
      pushTier(-1);
      openApi().journey({ push: 0, run: true, active: false });
      if (!state.ready) reportProgress(loadNow());
      maybeOpen();
      apply(true);
    }
    return;
  }
  const i = IDS.indexOf(e.data.chom);
  if (i < 0) return;
  const d = e.data;
  if (d.error) {
    failed.add(i);
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
    if (!state.ready && i === 0) reportProgress(loadNow());
  }
  if (d.ready) {
    state.seasons[i].ready = true;
    state.seasons[i].progress = 1;
    state.seasons[i].readyMs = d.readyMs;
    pushTier(i);
    api(i).journey({ run: false });
    pushLanguage(i);
    if (i === 0) {
      if (!state.ready) reportProgress(loadNow());
      maybeOpen();
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
  reportProgress(1);
  // without a page layer the core opens the page itself; with one, the page does (after its language choice)
  if (!pageMounted) root.classList.remove('is-loading');
  state.ready = true;
  // (without a page layer nobody steps in for the viewer: the page is entered as it opens)
  if (!pageMounted) setTimeout(() => pageApi.enter(), 0);
  state.readyMs = Math.round(performance.now());
  // (the name every page of the portfolio uses for "the page can be looked at", for the shared measuring scripts)
  window.__ready = true;
  holdEntrance();
  emit('ready', { readyMs: state.readyMs });
}
let progressAt = performance.now();
function reportProgress(v) {
  if (v > progressMax + 1e-4) progressAt = performance.now();
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
const measure = () => { if (!geo.dirty) return geo; geo.top = room.offsetTop; geo.height = room.offsetHeight; geo.vh = window.innerHeight; geo.ch = document.documentElement.clientHeight; geo.dirty = false; return geo; };
const stale = () => { geo.dirty = true; tailReachPx = null; };
window.addEventListener('resize', stale);
if (typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(stale); ro.observe(room); ro.observe(document.body); }
const introPx = () => (INTRO_VH / 100) * measure().vh;
const seasonsPx = () => Math.max(1, measure().height - measure().vh - introPx());
// the intro's progress (0..1) and g (0..1 across the seasons), from the scroll position; g is 0 through the intro
// (whether the page's end part covers the whole screen, kept here: read in the frame loop it forced the browser to lay the
// page out again on the frame the name flies home — a 67–83 ms frame, measured 29/9 with core/qa/loadstutter.mjs)
let coveredNow = false;
const scrollTarget = () => {
  const y = window.scrollY - measure().top;
  coveredNow = y >= measure().height;
  // (where the viewer really is in the opening, before the stop below: a first season still building reads it and, once
  // the viewer is on the way in, stops pacing itself — core/world.js viewerComing)
  state.introRaw = clamp01(y / Math.max(1, introPx()));
  return clamp01((y - introPx()) / seasonsPx());
};
// where the walk into the scent is headed: where the scroll is, except that it stops just short of the way in until the
// first season is ready to be walked into (asked every frame, so the walk goes on by itself once the season is ready)
const introAim = () => (openOn() && !state.seasons[0].ready ? Math.min(state.introRaw, 0.86) : state.introRaw);
const FIXED = params.has('g') ? clamp01(parseFloat(params.get('g')) || 0) : null;
state.introRaw = 0;
let introT = 0;
let target = FIXED ?? 0, g = target;
// (seasons building in the background take less time per frame while the viewer scrolls)
window.__chomScrollAt = 0;
window.addEventListener('scroll', () => { window.__chomScrollAt = Date.now(); if (FIXED === null) target = scrollTarget(); }, { passive: true });
state.setG = (v) => { target = g = clamp01(v); introT = state.introRaw = 1; apply(true); return true; };

// ---------------- the pace of the scroll (README 10b) ----------------
// However hard the scroll is flung (a laptop's touchpad throws thousands of pixels a second), what the scroll drives —
// the walk into the scent, each season's push through its layers, each hand-over — goes forward no faster than a pace
// the eye can follow, and then catches up with the scroll by itself. Mike's friends said of another page that a hard
// touchpad scroll made everything go by "vèo vèo, không kịp nhìn". Only the top speed is held: a scroll slower than
// this is followed exactly as before (the walk into the scent step for step, the seasons with their usual easing).
// Going back is not held (it may be quicker). In vh of scroll per second, so it is the same on every screen:
//   the walk into the scent (300vh)  at most 120 vh/s: 2.5 s at the least
//   a season's push (340vh)          at most 160 vh/s: 2.1 s
//   a hand-over (100vh)              at most  80 vh/s: 1.25 s
// ?pace=0 turns it off (for comparing); ?pace=<k> multiplies every pace by k.
const PACE_K = params.has('pace') ? Math.max(0, +params.get('pace') || 0) : 1;
const PACE_INTRO_VH = 120, PACE_PUSH_VH = 160, PACE_HAND_VH = 80;
state.pace = { on: PACE_K > 0, k: PACE_K, introVhS: PACE_INTRO_VH, pushVhS: PACE_PUSH_VH, handVhS: PACE_HAND_VH, held: 0 };
// how far g may go forward in a second, from where g is now
const gPace = (gv) => {
  const x = gv * N, i = Math.min(N - 1, Math.floor(x)), u = x - i;
  const vh = i < N - 1 && u > 1 - HAND ? PACE_HAND_VH : PACE_PUSH_VH;
  return (vh * PACE_K) / (N * SEASON_VH);
};
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
    a.journey({ push: clamp01(t), run: on, active: false, arrive: 1, intro: t });
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
    cutBusy = true;
    try { return await run0(); } finally { cutBusy = false; waitFor(-1); }
  };
  const run0 = async () => {
    const t0 = performance.now();
    if (notesOpen) { pageApi.closeNotes(); await waitMs(400); }
    while (!state.seasons[k].ready) {
      if (lastError) throw new Error(`season ${IDS[k]} failed to load`);
      emit('cut', { index: k, id: IDS[k], phase: 'waiting', progress: state.seasons[k].progress });
      waitFor(k);
      await waitMs(120);
    }
    waitFor(-1);
    const waited = Math.round(performance.now() - t0);
    const quick = matchMedia('(prefers-reduced-motion: reduce)').matches;
    emit('cut', { index: k, id: IDS[k], phase: 'cutting', waitedMs: waited });
    if (!quick) { cutVeil.classList.add('is-on'); await waitMs(220); }
    window.scrollTo({ top: scrollYFor(gT), behavior: 'instant' });
    target = g = scrollTarget();
    introT = introAim();
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

// ---------------- waiting for a season still being made (Sếp, 29/9) ----------------
// A viewer who reaches a season that is not built yet (a slow machine, or a jump from the bar) is never left standing
// without knowing why: the page layer shows "Đang pha mùa Hạ… 60%" (onWait) with the season's real progress, and the
// scene goes on by itself once it is ready. waitFor(-1) = nothing is being waited for.
let waitingFor = -1, waitPct = -1;
function waitFor(i) {
  const pct = i >= 0 ? Math.floor((state.seasons[i]?.progress ?? 0) * 100) : -1;
  if (i === waitingFor && pct === waitPct) return;
  waitingFor = i; waitPct = pct;
  state.waiting = i >= 0 ? { index: i, id: IDS[i], progress: pct / 100 } : null;
  emit('wait', i >= 0 ? { waiting: true, index: i, id: IDS[i], progress: pct / 100 } : { waiting: false });
}

// ---------------- one gesture, one step (README 10b; Mike, 29/9) ----------------
// "Mỗi scroll sẽ là nửa mùa, scroll lần 1 ra mùa xuân, lần 2 ra note đằng sau." Through the four seasons the page moves
// in steps: one flick of the wheel, one swipe on a touchpad, one swipe of a finger or one key goes to the next stop, and
// the scene plays its way there at the pace above ("the pace of the scroll"). The stops:
//   0  the opening (the open bottle by the oil lamp)
//   1  spring standing still (its sheet, xuan-1): the whole walk into the scent is played between 0 and 1
//   2  spring's memory (xuan-2): MEM_P of the way into its push — the memory sheet up and the camera well into the street
//   3  summer standing still (ha-1): the rest of spring's push (xuan-3, no words) and the hand-over are played on the way
//   ... the same for summer, autumn and winter, then one last stop at the very end of winter (phase 'end').
// Below the last stop the page's end part (atelier, blend, order) scrolls as it always did; scrolling back up out of it
// stops at the last stop, and the steps take over again.
// Going back is a straight cut to the stop before: nothing is ever seen playing backwards (Mike approved this on the
// Katherine Anne demo). A step asked for while the scene is still playing is queued: the scene plays on through, at its
// pace, never skipping. Where the viewer is, is read off the scroll position every time (never kept), so a cut from
// the bar or the scroll bar dragged by hand is simply followed. No step while something holds the page (a bottle's notes,
// the phone menu, the page's scroll lock, a cut under way, the waiting screen). ?steps=0 = the plain scroll of before.
const STEPS = FIXED === null && params.get('steps') !== '0';
// where the memory stop stands in a season's push: the middle of the memory step's stretch, the point page/qa/page-check
// photographs and measures the sheets against (at 0.45 spring's camera is already up against a lantern)
const MEM_P = 0.25;
let cutBusy = false;
// How far above its own top the page's end part draws: its torn paper edge (the page layer's .pg-tail::before rides
// 22 px up), a shadow, a child pushed up. Measured on the elements themselves, never assumed from the layout: at the
// last stop the end part must not show at all, and on 29/9 Mike saw exactly that edge — "mùa đông bị nhô lên vệt trắng
// ở dưới web", a strip of cream 15–20 px along the foot of the screen — because the last stop put the screen's foot on
// the end part's own top, and the edge drawn above it showed. Kept until the page changes size.
let tailReachPx = null;
function tailReach() {
  if (tailReachPx !== null) return tailReachPx;
  let reach = 0;
  try {
    const base = tail.getBoundingClientRect().top;
    const els = [tail, ...tail.children, ...[...tail.children].flatMap((c) => [...c.children])];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) reach = Math.max(reach, base - r.top);
      const shadow = getComputedStyle(el).boxShadow;
      if (shadow && shadow !== 'none') {
        // (a shadow's reach upward: its blur plus spread minus its downward offset, at most)
        const n = (shadow.match(/-?[\d.]+px/g) || []).map(parseFloat);
        if (n.length >= 3) reach = Math.max(reach, base - r.top + (n[2] || 0) + (n[3] || 0) - (n[1] || 0));
      }
      for (const ps of ['::before', '::after']) {
        const cs = getComputedStyle(el, ps);
        if (cs.content === 'none' || cs.display === 'none' || cs.position !== 'absolute') continue;
        const t = parseFloat(cs.top);
        if (Number.isFinite(t) && t < 0) reach = Math.max(reach, base - (r.top + t));
      }
    }
  } catch (e) { reach = 32; }
  tailReachPx = Math.min(400, Math.max(0, reach));
  return tailReachPx;
}
function stopYs() {
  const ys = [0];
  for (let i = 0; i < N; i++) {
    const end = i < N - 1 ? 1 - HAND : 1;
    ys.push(scrollYFor((i + 0.5 * HOLD) / N), scrollYFor((i + HOLD + MEM_P * (end - HOLD)) / N));
  }
  // the last stop: the end of winter, with the screen's foot a little ABOVE everything the end part draws (2 px spare
  // for the rounding of a zoomed page), so not one pixel of it shows; one plain scroll further brings it up
  const view = Math.max(measure().vh, measure().ch || 0);
  ys.push(Math.min(scrollYFor(1), measure().top + measure().height - view - tailReach() - 2));
  const out = [];
  for (const y of ys.map((v) => Math.round(v))) if (!out.length || y > out[out.length - 1] + 2) out.push(y);
  return out;
}
// the g of each stop (for the hold below and for checks)
const stopGs = () => {
  const gs = [0];
  for (let i = 0; i < N; i++) { const end = i < N - 1 ? 1 - HAND : 1; gs.push((i + 0.5 * HOLD) / N, (i + HOLD + MEM_P * (end - HOLD)) / N); }
  // (the last one where the last stop really is: just short of 1, see stopYs)
  const ys = stopYs();
  gs.push(clamp01((ys[ys.length - 1] - measure().top - introPx()) / seasonsPx()));
  return gs;
};
const lockedNow = () => !state.ready || (pageMounted && !state.entered) || root.classList.contains('is-loading') || root.classList.contains('is-focus')
  || root.classList.contains('pg-menu-open') || root.classList.contains('pg-focus') || root.classList.contains('pg-no3d') || !!lastError;
state.stepLog = [];
// straight to a stop, with nothing played on the way (going back)
function cutTo(y) {
  window.scrollTo({ top: y, behavior: 'instant' });
  target = g = scrollTarget();
  introT = introAim();
  apply(true);
}
function stepBy(dir) {
  // (a step is the viewer's own move: whatever the end part's glide was doing a moment ago is over)
  W.tailAt = 0; TOUCH.tailAt = 0;
  const ys = stopYs(), y = window.scrollY;
  if (dir > 0) {
    const next = ys.find((v) => v > y + 2);
    if (next === undefined) return false;
    window.scrollTo({ top: next, behavior: 'instant' });
    target = scrollTarget();
    state.stepLog.push([Math.round(performance.now()), ys.indexOf(next), 'on']);
    return true;
  }
  let prev;
  for (const v of ys) if (v < y - 2) prev = v;
  if (prev === undefined) return false;
  cutTo(prev);
  state.stepLog.push([Math.round(performance.now()), ys.indexOf(prev), 'back']);
  return true;
}
// what counts as one gesture: events closer than 200 ms apart belong to the same one (a quick spin of the wheel, or a
// touchpad swipe with its glide); it steps once, when it has moved 24 px (the Katherine Anne demo's numbers, Mike approved)
const W = { at: 0, acc: 0, spent: false, native: false, tailAt: 0 };
// when the event happened, not when the page got round to it: on a busy page the events of one swipe can be handled in
// a clump 300 ms late, and timed by their handling they would count as two gestures (measured 29/9 on a throttled load:
// one swipe went two stops). Events handed up from a season's frame carry their own time (core/world.js).
const evAt = (e) => e.__chomAt ?? (performance.timeOrigin + e.timeStamp);
const TOUCH = { y0: null, spent: false, native: false, tailAt: 0 };
// true = the page takes the event (the caller prevents the browser's own scroll)
function onWheel(e) {
  if (!STEPS || e.ctrlKey) return false;
  const dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? innerHeight : 1);
  if (Math.abs(e.deltaX || 0) > Math.abs(dy)) return false;
  const now = performance.now(), at = evAt(e), gap = at - W.at;
  W.at = at;
  if (gap > 200) { W.acc = 0; W.spent = false; W.native = false; }
  if (cutBusy) return true;
  if (lockedNow()) return false;
  const ys = stopYs(), last = ys[ys.length - 1], y = window.scrollY;
  if (y > last + 2) {
    // the end part scrolls as it always did — but a movement up out of it stops at the journey's last stop
    W.tailAt = now; W.native = true;
    if (dy < 0 && y + dy <= last) { cutTo(last); W.spent = true; return true; }
    return false;
  }
  if (W.native) {
    // a movement that began in the end part (or went on into it from the last stop) never turns into a step
    if (dy > 0 && y >= last - 2) return false;
    W.spent = true;
    return true;
  }
  if (W.spent) return true;
  // at the last stop, going on down: into the end part, as a plain scroll
  if (y >= last - 2 && dy > 0) { W.native = true; return false; }
  W.acc += dy;
  if (Math.abs(W.acc) >= 24) { stepBy(Math.sign(W.acc)); W.spent = true; }
  return true;
}
function onTouch(kind, e) {
  if (!STEPS) return false;
  const now = performance.now();
  if (kind === 'touchstart') {
    TOUCH.y0 = e.touches.length === 1 ? e.touches[0].clientY : null;
    TOUCH.spent = false;
    const ys = stopYs();
    TOUCH.native = window.scrollY > ys[ys.length - 1] + 2;
    if (TOUCH.native) TOUCH.tailAt = now;
    return false;
  }
  if (kind === 'touchend') { if (TOUCH.native) TOUCH.tailAt = now; TOUCH.y0 = null; return false; }
  if (TOUCH.y0 === null || e.touches.length !== 1) return false;
  if (cutBusy) return true;
  if (lockedNow()) return false;
  const ys = stopYs(), last = ys[ys.length - 1], y = window.scrollY;
  if (TOUCH.native || y > last + 2) { TOUCH.native = true; TOUCH.tailAt = now; return false; }
  const dy = TOUCH.y0 - e.touches[0].clientY;          // > 0: the finger goes up, the page goes on
  if (!TOUCH.spent && y >= last - 2 && dy > 0) { TOUCH.native = true; return false; }
  if (!TOUCH.spent && Math.abs(dy) > 40) { stepBy(Math.sign(dy)); TOUCH.spent = true; }
  return true;
}
function onKey(e) {
  if (!STEPS || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return false;
  const t = e.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return false;
  const k = e.key;
  const fwd = k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey);
  const back = k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey);
  if (!fwd && !back && k !== 'Home') return false;
  // (Space on a button presses the button)
  if (k === ' ' && t && (t.tagName === 'BUTTON' || t.tagName === 'SUMMARY' || (t.getAttribute && t.getAttribute('role') === 'button'))) return false;
  if (cutBusy) return true;
  if (lockedNow()) return false;
  W.tailAt = 0; TOUCH.tailAt = 0;
  if (k === 'Home') { if (window.scrollY > 0) { cutTo(0); state.stepLog.push([Math.round(performance.now()), 0, 'home']); } return true; }
  const ys = stopYs(), last = ys[ys.length - 1], y = window.scrollY;
  if (y > last + 2) return false;                         // the end part keeps its own keys
  if (fwd && y >= last - 2) return false;                 // at the last stop: on down into the end part
  if (e.repeat) return true;                              // a key held down is one step
  stepBy(fwd ? 1 : -1);
  return true;
}
// the seasons' frames cover the screen and get the wheel, the finger and the keys when they are under them: they hand
// them on here (core/world.js), and prevent the event when this says so
window.__chomInput = (kind, e) => {
  try {
    if (kind === 'wheel') return onWheel(e);
    if (kind === 'keydown') return onKey(e);
    return onTouch(kind, e);
  } catch (err) { console.error(err); return false; }
};
if (STEPS) {
  window.addEventListener('wheel', (e) => { if (onWheel(e)) e.preventDefault(); }, { passive: false });
  window.addEventListener('touchstart', (e) => onTouch('touchstart', e), { passive: true });
  window.addEventListener('touchmove', (e) => { if (onTouch('touchmove', e) && e.cancelable) e.preventDefault(); }, { passive: false });
  window.addEventListener('touchend', (e) => onTouch('touchend', e), { passive: true });
  window.addEventListener('keydown', (e) => { if (onKey(e)) e.preventDefault(); });
  // a click or a key anywhere (a link of the bar, the scroll bar) is the viewer's own move: nothing is held back
  window.addEventListener('pointerdown', () => { W.tailAt = 0; TOUCH.tailAt = 0; }, { capture: true, passive: true });
  // The end part's own scrolling (a touch fling, the wheel's smooth glide) can carry on past the last stop after the
  // event that could have been stopped: straight back to the last stop, if it came up out of the end part just now
  window.addEventListener('scroll', () => {
    const now = performance.now();
    if (now - W.tailAt > 700 && now - TOUCH.tailAt > 1500) return;
    if (cutBusy || lockedNow()) return;
    const ys = stopYs(), last = ys[ys.length - 1];
    if (window.scrollY < last - 2) { cutTo(last); W.spent = true; W.tailAt = 0; TOUCH.tailAt = 0; }
  }, { passive: true });
}
state.stepMode = STEPS;
state.stops = () => stopYs();
state.stopGs = stopGs;
state.memP = MEM_P;
state.stepBy = (d) => stepBy(d);

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

// ---------------- the quality step, watched (core/quality.js, README 16) ----------------
// One step for the whole page: the page's own frames are what the viewer sees, whichever seasons are drawing them.
// While seasons are still being built behind the page the governor only believes frames that are slow beyond doubt
// (each frame also carries a slice of that building). A season that finishes building is told the step then (it made its
// targets with the step it started with).
const failed = new Set();
const building = () => (OPEN_ID && !openFailed && !state.opening.ready) || state.seasons.some((x, i) => !x.ready && !failed.has(i));
const pushTier = (i) => { const a = i < 0 ? openApi() : api(i); try { if (a && a.setQuality) a.setQuality(window.__tier); } catch (e) { /* not ready */ } };
state.tierLog = [[Math.round(performance.now()), window.__tier]];
const GOV = makeGovernor({
  start: window.__tier, forced: Q_FORCED,
  onChange: (t) => {
    window.__tier = t;
    state.tierLog.push([Math.round(performance.now()), t]);
    if (OPEN_ID) pushTier(-1);
    for (let i = 0; i < N; i++) pushTier(i);
  },
});
// (for measuring: put the whole page on step t now; the governor carries on from there)
state.setTier = (t) => { GOV.set(Math.round(+t)); return GOV.tier; };
state.quality = () => ({
  tier: GOV.tier, forced: GOV.forced, gpu: GPU.name, soft: GPU.soft, integrated: GPU.integrated, log: state.tierLog.slice(),
  frames: [openApi(), ...IDS.map((_, i) => api(i))].map((a) => { try { return a && a.quality ? { tier: a.quality.tier, px: a.quality.px, ofScreen: a.quality.ofScreen } : null; } catch (e) { return null; } }),
});

let lastT = performance.now(), fAcc = 0, fN = 0;
let devEl = null;
// A safety net (29/9), as in world.js: an error inside one tick used to skip the line that asks for the next one, and the
// page's scene would stop following the scroll for good. The next tick is now asked for whatever happens; the error is
// still written to the console (once per kind).
const tickFaults = new Set();
function tick(now) {
  try { tickOnce(now); } catch (e) {
    const key = String(e && e.message);
    if (!tickFaults.has(key)) { tickFaults.add(key); console.error(e); }
  }
  requestAnimationFrame(tick);
}
function tickOnce(now) {
  const rawMs = Math.max(0, now - lastT);
  const dt = Math.min(0.05, rawMs / 1000);
  lastT = now;
  fAcc += dt; fN++;
  if (fAcc > 0.5) { state.fps = +(fN / fAcc).toFixed(1); fAcc = 0; fN = 0; }
  if (state.ready && !lastError) GOV.tick(rawMs, { building: building() });
  // (once the page's end part covers the whole screen nothing of the scene can be seen: no pace to keep, it is simply
  // where the scroll is — the winter street waits under the end part, as before)
  const covered = FIXED === null && coveredNow;
  if (FIXED !== null || covered) { g = target; introT = introAim(); }
  else {
    // the walk into the scent: straight after the scroll, as before, but forward no faster than its pace
    const aim = introAim();
    if (aim <= introT || PACE_K <= 0) introT = aim;
    else introT = Math.min(aim, introT + ((PACE_INTRO_VH * PACE_K) / INTRO_VH) * dt);
    // the seasons wait while the walk into the scent is still catching up (so a fling from the top does not use up the
    // spring behind the scent before anyone can see it)
    let tg = introT < 1 && target > g ? g : target;
    // A season not built yet is never walked into: the scene waits at the stop it is at (or where it stands, if that is
    // further on, but never inside the hand-over into it), the page layer says what it is waiting for and how far that
    // has got, and the scene goes on by itself the moment the season is ready. (Before 29/9 only the hand-over's picture
    // waited; the scroll went on under it, and when the season came the hand-over was skipped in one frame.)
    let waitI = -1;
    if (tg > g) {
      for (let i = 1; i < N; i++) {
        if (state.seasons[i].ready || failed.has(i)) continue;
        const hs = (i - HAND) / N;                     // where the hand-over into season i starts
        if (tg > hs) {
          let at = 0;
          for (const sg of stopGs()) if (sg <= hs + 1e-9) at = sg;
          const hold = Math.max(Math.min(g, hs), at);
          if (hold < tg) { tg = Math.max(g, hold); waitI = i; }
        }
        break;
      }
    }
    if (STEPS || waitI >= 0 || waitingFor >= 0) { if (!cutBusy) waitFor(waitI); }
    let step = (tg - g) * (1 - Math.exp(-dt * 5.5));
    if (step > 0 && PACE_K > 0) {
      const cap = gPace(g) * dt;
      if (step > cap) { step = cap; state.pace.held++; }
    }
    g += step;
    if (Math.abs(tg - g) < 1e-5) g = tg;
  }
  // (true while the scene is still on its way to where the scroll is: a check waits for this, not for a guessed time)
  state.catching = FIXED === null && (g !== target || introT !== introAim());
  if (state.ready) apply();
  if (state.ready) { try { carryPicture(dt); } catch (e) { dropOpening('could not show the season inside its scent'); console.error(e); } }
  if (DEV) {
    devEl = devEl || document.getElementById('dev');
    devEl.hidden = false;
    devEl.textContent = `g ${g.toFixed(3)} · ${state.fps ?? ''} fps · ` + IDS.map((id, i) => { const s = state.plan?.[i]; return `${id}${state.seasons[i].ready ? '' : '…'} ${s?.run ? `p${s.push.toFixed(2)} t${s.through.toFixed(2)} pe${s.peel.toFixed(2)} a${s.arrive.toFixed(2)}` : '-'}`; }).join(' | ');
  }
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
  // f({ waiting: true, index, id, progress 0..1 }) while the viewer waits for a season still being made (a step or a cut
  // into it), f({ waiting: false }) when that is over (README 12)
  onWait: (f) => { hooks.wait.push(f); if (state.waiting) f({ waiting: true, ...state.waiting }); },
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
mountDone = true;
maybeOpen();
coreCopy = await loadCopy();
// WebGL is needed for the seasons (and a real graphics chip, above); without it the page layer shows its fallback
if (NO_3D) { console.info(`[chom] the reading version: ${NO_3D}`); window.__no3d = NO_3D; fail('no-webgl', { message: NO_3D, gpu: GPU.name, software: GPU.soft }); window.__ready = true; }
else {
  // Given up only when nothing has moved for 45 s — never on a clock: on a slow line the honest load can take longer
  // than a minute and still be getting somewhere (until 29/9: 60 s from the start, whatever was happening)
  const stall = setInterval(() => {
    if (state.ready || lastError) { clearInterval(stall); return; }
    if (performance.now() - progressAt > 45000) { clearInterval(stall); fail('timeout'); }
  }, 3000);
}
requestAnimationFrame(tick);
