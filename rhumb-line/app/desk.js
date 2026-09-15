/* Rhumb Line · app/desk.js
   The exploration desk (desk contract v2 section 4, v3 section 7). No page scroll: the reader sits at the desk
   ('desk' mode) and opens one object at a time ('focus' mode), whose panel sits beside it. While a panel is open the
   other objects stay clickable in the scene (and in the object dock or bar), and the camera flies straight across.

   Addresses: #log, #chart, #chart/<origin>, #chest, #compass, #crew-list, #letter, #cup; no hash is the desk.
   #leg-<origin> (the anchors used without JavaScript) is read as #chart/<origin>; #top shows the title card.
   Opening from the desk pushes one history entry, so the browser's Back closes the panel; moving between panels or
   legs replaces it.

   Guidance: the next object in HINT_ORDER not yet seen (sessionStorage rhumbline.seen) glows in the scene
   (scene.setHint), is named by the hint line and by each panel's "next" link.
   Chart: picking a port sails there first (scene.showLeg timelapse, skippable with scene.skipTravel); the leg's log
   and its sack in the chest appear on arrival.

   Scene calls go through callScene (the page works with scene === null) and wait for the loader to let go.
   Without a scene the page is a plain scrolling document: initDocument() only fills the chest. */

import { $, $$, LOG, callScene, mq, originNames, setText, whenEntered } from './dom.js';
import { HINT_ORDER, LEGS, MOMENTS, PANELS, ROUTES } from './data.js';

const FOUND_KEY = 'rhumbline.found';
const SEEN_KEY = 'rhumbline.seen';
const TITLE_MS = 5200;
const OBJECT_OF_ROUTE = {};
Object.keys(ROUTES).forEach((id) => { OBJECT_OF_ROUTE[ROUTES[id]] = id; });

function readList(key, allowed) {
  try {
    const list = JSON.parse(sessionStorage.getItem(key) || '[]');
    return Array.isArray(list) ? allowed.filter((o) => list.includes(o)) : [];
  } catch (err) {
    return [];
  }
}
function writeList(key, list) {
  try { sessionStorage.setItem(key, JSON.stringify(list)); } catch (err) { /* storage blocked: progress lasts this view */ }
}

export function parseHash(hash) {
  let h = '';
  try { h = decodeURIComponent(String(hash || '').replace(/^#/, '')); } catch (err) { h = ''; }
  if (h === 'top') return { object: null, leg: null, title: true };
  const legAnchor = h.match(/^leg-([a-z]+)$/);
  if (legAnchor && LEGS.includes(legAnchor[1])) return { object: 'chart', leg: legAnchor[1] };
  const [route, sub] = h.split('/');
  const object = OBJECT_OF_ROUTE[route] || null;
  if (object === 'chart' && LEGS.includes(sub)) return { object, leg: sub };
  return { object, leg: null };
}

export const hashOf = (object, leg) => (object ? `#${ROUTES[object]}${object === 'chart' && leg ? `/${leg}` : ''}` : '');

// The sample chest's sacks and counters, shared by the desk and the plain document.
function questView() {
  const names = originNames();
  const count = $('[data-qa="bean-count"]');
  const template = (count && count.dataset.template) || 'Beans found {n}/6';
  const sackList = $('[data-sacks]');
  const tpl = {
    found: (sackList && sackList.dataset.foundTemplate) || '{origin}',
    empty: (sackList && sackList.dataset.emptyTemplate) || '{origin}',
  };
  return (found) => {
    const text = template.replace('{n}', String(found.length));
    $$('[data-bean-text], [data-chest-progress]').forEach((el) => setText(el, text));
    $$('[data-sack-dot]').forEach((dot) => dot.classList.toggle('is-found', found.includes(dot.dataset.sackDot)));
    $$('[data-qa="chest-sack"]').forEach((sack) => {
      const o = sack.dataset.origin;
      const isFound = found.includes(o);
      sack.dataset.found = String(isFound);
      const go = $('[data-sack-go]', sack);
      if (go) setText(go, (isFound ? tpl.found : tpl.empty).replace('{origin}', names[o] || o));
    });
    $$('[data-qa="chart-port"]').forEach((port) => port.classList.toggle('is-found', found.includes(port.dataset.origin)));
  };
}

export function initDocument() {
  questView()(LEGS.slice());
}

export function createDesk({ scene, reduce }) {
  const html = document.documentElement;
  const root = $('[data-qa="scene"]');
  const wide = mq('(min-width: 900px)');
  const touch = mq('(hover: none) and (pointer: coarse)');
  const panels = {};
  $$('[data-qa="panel"][data-object]').forEach((p) => {
    panels[p.dataset.object] = p;
    p.setAttribute('role', 'dialog');
    // Not modal any more: the scene's objects, the dock and the bar stay reachable while a panel is open.
    p.setAttribute('aria-modal', 'false');
  });
  const renderQuest = questView();
  const names = originNames();
  const state = { object: null, leg: null };
  let entered = !html.classList.contains('is-loading');
  let found = readList(FOUND_KEY, LEGS);
  let seen = readList(SEEN_KEY, HINT_ORDER);
  let pushedFromDesk = false;
  let opener = null;
  let momentIndex = -1;
  let hoverId = null;
  let focusId = null;
  let landfallOpen = false;
  let landfallDue = false;
  let interludeTimer = 0;

  /* ---------- Object names and hints (from the desk menu) ---------- */
  const menu = $('[data-qa="desk-menu"]');
  const copyOf = (id) => {
    const item = menu && $(`[data-object="${id}"]`, menu);
    return {
      name: item ? ($('.deskmenu__name', item) || item).textContent.trim() : id,
      hint: item && $('.deskmenu__hint', item) ? $('.deskmenu__hint', item).textContent.trim() : '',
    };
  };

  /* ---------- Title card and stamp ---------- */
  // The title card never covers a thing on the desk: once the camera has settled it is placed in the clearest spot
  // nearest the top left (anchors from scene.getAnchor; on phones the left porthole mirrors the right one).
  let titleTimer = 0;
  let titleToken = 0;
  let titleWatch = 0;
  const titleCard = $('[data-qa="titlecard"]');
  const TABLE = ['log', 'chart', 'chest', 'compass', 'crew', 'letter', 'cup'];
  const WALL = ['porthole', 'lamp'];
  const setTitle = (open, { focus } = {}) => {
    clearTimeout(titleTimer);
    if (!open) {
      titleToken += 1; // also cancels a card still waiting for the camera
      clearInterval(titleWatch);
      titleWatch = 0;
    }
    html.classList.toggle('title-open', open);
    if (open && focus) {
      const h = $('#hero-title');
      requestAnimationFrame(() => { if (h) h.focus({ preventScroll: true }); });
    }
  };
  function objectBoxes() {
    const boxes = [];
    TABLE.concat(WALL).forEach((id) => {
      const a = callScene(scene, 'getAnchor', id);
      if (a && a.visible && a.w > 0 && a.h > 0) boxes.push({ id, wall: WALL.includes(id), x: a.x, y: a.y, w: a.w, h: a.h });
    });
    const lamp = boxes.find((b) => b.id === 'lamp');
    const port = boxes.find((b) => b.id === 'porthole');
    if (lamp && port && !wide.matches) boxes.push({ id: 'porthole-left', wall: true, x: 2 * (lamp.x + lamp.w / 2) - (port.x + port.w), y: port.y, w: port.w, h: port.h });
    return boxes;
  }
  const tableCount = (boxes) => boxes.filter((b) => !b.wall).length;
  function placeTitle(boxes) {
    if (!titleCard) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const w = titleCard.offsetWidth;
    const h = titleCard.offsetHeight;
    const bar = $('[data-qa="object-bar"]');
    const barTop = bar && bar.getClientRects().length ? bar.getBoundingClientRect().top : H;
    const top = 66;
    const bottom = Math.min(H - 60, barTop - 50);
    const wallWeight = wide.matches ? 15 : 100; // phones keep the porthole and lamp clear too
    const table = boxes.filter((b) => !b.wall);
    const tableTop = table.length ? Math.min(...table.map((b) => b.y)) - 40 : H; // the table's back rail sits above its objects
    let best = null;
    for (let y = top; ; y += 8) {
      for (let x = 12; ; x += 16) {
        let cost = y * 0.5 + x * 0.25 + Math.max(0, y + h - tableTop) * w * 0.5;
        boxes.forEach((b) => {
          const ox = Math.max(0, Math.min(x + w, b.x + b.w) - Math.max(x, b.x));
          const oy = Math.max(0, Math.min(y + h, b.y + b.h) - Math.max(y, b.y));
          cost += ox * oy * (b.wall ? wallWeight : 100);
        });
        if (!best || cost < best.cost) best = { x, y, cost };
        if (x + 16 + w > W - 12) break;
      }
      if (y + 8 + h > bottom) break;
    }
    titleCard.style.setProperty('--tc-x', best.x + 'px');
    titleCard.style.setProperty('--tc-y', best.y + 'px');
    titleCard.dataset.placed = best.x + ',' + best.y;
  }
  function titleCovers(boxes) {
    if (!titleCard || !titleCard.dataset.placed) return false;
    const [x, y] = titleCard.dataset.placed.split(',').map(Number);
    const w = titleCard.offsetWidth;
    const h = titleCard.offsetHeight;
    return boxes.some((b) => (!b.wall || !wide.matches)
      && Math.min(x + w, b.x + b.w) - Math.max(x, b.x) > 0
      && Math.min(y + h, b.y + b.h) - Math.max(y, b.y) > 0);
  }
  function openTitle({ focus = false, auto = false } = {}) {
    clearTimeout(titleTimer);
    const token = titleToken;
    const started = performance.now();
    let last = '';
    let still = 0;
    // The camera is still flying in while anchors move: wait until they hold still for about 12 frames.
    const attempt = () => {
      if (token !== titleToken || state.object) return;
      const boxes = scene ? objectBoxes() : [];
      const signature = boxes.map((b) => [b.id, Math.round(b.x / 4), Math.round(b.y / 4), Math.round(b.w / 4), Math.round(b.h / 4)].join(':')).join('|');
      still = signature === last ? still + 1 : 0;
      last = signature;
      const settled = tableCount(boxes) >= TABLE.length - 1 && still >= 12;
      if (!settled && performance.now() - started < 6000) {
        requestAnimationFrame(attempt);
        return;
      }
      placeTitle(boxes);
      setTitle(true, { focus });
      if (auto) titleTimer = setTimeout(() => setTitle(false), reduce ? TITLE_MS + 1500 : TITLE_MS);
      if (scene) {
        clearInterval(titleWatch);
        titleWatch = setInterval(() => {
          if (!html.classList.contains('title-open')) return;
          const now = objectBoxes();
          if (tableCount(now) >= TABLE.length - 1 && titleCovers(now)) placeTitle(now);
        }, 300);
      }
    };
    attempt();
  }

  /* ---------- Hint lines: how to open things, and what to open next ---------- */
  const deskHint = $('[data-qa="desk-hint"]');
  const deskHintText = { mouse: deskHint ? deskHint.textContent.trim() : '', touch: deskHint ? deskHint.dataset.touch || '' : '' };
  const syncDeskHint = () => { if (deskHint) setText(deskHint, touch.matches && deskHintText.touch ? deskHintText.touch : deskHintText.mouse); };
  touch.addEventListener('change', syncDeskHint);
  syncDeskHint();

  // Mike (2026-09-15): the hint lines stay in one place, bottom centre, instead of moving clear of the objects.
  function placeHints() {}

  const nextHint = $('[data-qa="hint"]');
  const nextUnseen = () => HINT_ORDER.find((id) => !seen.includes(id)) || null;
  let cupOpened = false;
  const hintTarget = () => nextUnseen() || (cupOpened ? null : 'cup');
  function renderHint() {
    const id = nextUnseen();
    if (nextHint) {
      nextHint.dataset.object = id || '';
      setText(nextHint, id ? (nextHint.dataset.template || '{object}').replace('{object}', copyOf(id).name) : nextHint.dataset.done || '');
    }
    if (entered) {
      callScene(scene, 'setHint', hintTarget());
      requestAnimationFrame(() => placeHints({ force: true })); // new words, new width
    }
  }
  function markSeen(object) {
    if (!HINT_ORDER.includes(object) || seen.includes(object)) return;
    seen = HINT_ORDER.filter((id) => id === object || seen.includes(id));
    writeList(SEEN_KEY, seen);
    renderHint();
  }
  // After `from`, the next object in the suggested order, preferring one not seen yet.
  function nextObjectFrom(from) {
    const i = HINT_ORDER.indexOf(from);
    const ring = i < 0 ? HINT_ORDER.slice() : HINT_ORDER.slice(i + 1).concat(HINT_ORDER.slice(0, i));
    return ring.find((id) => !seen.includes(id)) || ring[0] || HINT_ORDER[0];
  }
  function renderNext() {
    if (!state.object) return;
    const link = $('[data-qa="panel-next"]', panels[state.object]);
    if (!link) return;
    const id = nextObjectFrom(state.object);
    link.setAttribute('href', `#${ROUTES[id]}`);
    link.dataset.next = id;
    setText(link, (link.dataset.template || '{object}').replace('{object}', copyOf(id).name));
  }

  /* ---------- Desk menu ---------- */
  const menuToggle = $('[data-menu-toggle]');
  const menuLabel = menuToggle && $('[data-menu-label]', menuToggle);
  let menuOpen = false;
  const syncMenuLabel = () => {
    if (!menuToggle || !menuLabel) return;
    const d = menuToggle.dataset;
    setText(menuLabel, menuOpen ? d.labelClose : (wide.matches ? d.labelOpen : d.labelShort || d.labelOpen));
  };
  const setMenu = (open, returnFocus) => {
    if (!menuToggle || menuOpen === open) return;
    menuOpen = open;
    html.classList.toggle('menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    syncMenuLabel();
    if (open) {
      setTitle(false);
      const first = menu && $('a, button', menu);
      if (first) requestAnimationFrame(() => first.focus({ preventScroll: true }));
    } else if (returnFocus) {
      menuToggle.focus({ preventScroll: true });
    }
  };
  if (menuToggle) menuToggle.addEventListener('click', () => setMenu(!menuOpen, false));
  wide.addEventListener('change', syncMenuLabel);
  syncMenuLabel();
  document.addEventListener('pointerdown', (e) => {
    if (menuOpen && menu && !menu.contains(e.target) && !menuToggle.contains(e.target)) setMenu(false, false);
  });
  if (menu) {
    $$('[data-object]', menu).forEach((item) => {
      const id = item.dataset.object;
      item.addEventListener('pointerenter', () => { if (!state.object) callScene(scene, 'setHighlight', id); });
      item.addEventListener('pointerleave', () => { if (!state.object) callScene(scene, 'setHighlight', null); });
      item.addEventListener('focus', () => { if (!state.object) callScene(scene, 'setHighlight', id); });
      item.addEventListener('blur', () => { if (!state.object) callScene(scene, 'setHighlight', null); });
      if (item.tagName === 'BUTTON') item.addEventListener('click', () => { setMenu(false, true); act(id, menuToggle); });
    });
  }

  /* ---------- Object dock (desktop, while a panel is open): the phone bar's icons ---------- */
  const dock = $('[data-qa="object-dock"]');
  const barList = $('[data-qa="object-bar"] .objectbar__list');
  if (dock && barList && !dock.children.length) dock.appendChild(barList.cloneNode(true));

  /* ---------- Quest ---------- */
  const landfall = $('[data-qa="landfall"]');
  const setLandfall = (open) => {
    if (!landfall) return;
    landfallOpen = open;
    html.classList.toggle('landfall-open', open);
    if (open) {
      const h = $('#landfall-heading');
      requestAnimationFrame(() => { if (h) h.focus({ preventScroll: true }); });
    }
  };
  const closeLandfall = $('[data-landfall-close]');
  if (closeLandfall) {
    closeLandfall.addEventListener('click', () => {
      setLandfall(false);
      const panel = state.object && panels[state.object];
      const back = panel && (panel.querySelector('.leg.is-current [tabindex="-1"]') || document.getElementById(panel.getAttribute('aria-labelledby')));
      if (back) back.focus({ preventScroll: true });
    });
  }
  function addFound(origin) {
    if (!LEGS.includes(origin) || found.includes(origin)) return;
    found = LEGS.filter((o) => o === origin || found.includes(o));
    writeList(FOUND_KEY, found);
    renderQuest(found);
    const complete = found.length === LEGS.length;
    if (!entered) {
      landfallDue = complete; // shown once the loader lets go
      return;
    }
    callScene(scene, 'setFound', found.slice(), { drop: origin });
    if (complete) {
      callScene(scene, 'landfall');
      setLandfall(true);
    }
  }

  /* ---------- Chart: ports, the voyage there, legs, previous and next ---------- */
  const chart = panels.chart;
  const legs = {};
  $$('[data-qa="leg"][data-origin]').forEach((leg) => { legs[leg.dataset.origin] = leg; });
  const ports = $$('[data-qa="chart-port"]');
  const prev = $('[data-chart-prev]');
  const next = $('[data-chart-next]');
  const sailingBox = $('[data-qa="chart-sailing"]');
  const sailingLine = sailingBox && $('[data-sailing-line]', sailingBox);
  const skip = $('[data-qa="chart-skip"]');
  let shownLeg = null; // the leg whose log the page shows
  let sceneLeg; // what the scene's chart shows (undefined: not told yet)
  let lastLeg = null; // the last port reached; the next voyage starts there
  let sailing = null; // { leg, token, arrive }
  let sailToken = 0;
  const portName = (origin) => {
    const h = legs[origin] && $('[tabindex="-1"]', legs[origin]);
    return h ? h.textContent.trim() : names[origin] || origin;
  };
  const setLink = (a, origin) => {
    if (!a) return;
    a.setAttribute('href', `#leg-${origin}`);
    a.dataset.route = `chart/${origin}`;
  };
  function renderChart() {
    if (!chart) return;
    chart.classList.toggle('has-leg', Boolean(state.leg));
    const underway = Boolean(state.leg && sailing && sailing.leg === state.leg);
    chart.classList.toggle('is-sailing', underway);
    if (sailingBox) sailingBox.hidden = !underway;
    Object.keys(legs).forEach((o) => legs[o].classList.toggle('is-current', o === state.leg && o === shownLeg && !underway));
    ports.forEach((p) => {
      if (p.dataset.origin === state.leg) p.setAttribute('aria-current', 'location');
      else p.removeAttribute('aria-current');
    });
    if (state.leg) {
      const i = LEGS.indexOf(state.leg);
      setLink(prev, LEGS[(i + LEGS.length - 1) % LEGS.length]);
      setLink(next, LEGS[(i + 1) % LEGS.length]);
    }
  }
  function reveal(leg) {
    sailing = null;
    shownLeg = leg;
    lastLeg = leg;
    renderChart();
    addFound(leg);
    requestAnimationFrame(syncAllMore);
    if (state.object === 'chart' && state.leg === leg) {
      const active = document.activeElement;
      if (!active || active === document.body || (chart && chart.contains(active))) focusHeading();
    }
  }
  function sail(leg) {
    const token = ++sailToken;
    let arrived = false;
    const arrive = () => {
      if (arrived || token !== sailToken) return;
      arrived = true;
      clearTimeout(guard);
      reveal(leg);
    };
    const guard = setTimeout(arrive, 15000); // never strand the reader if the scene does not answer
    sailing = { leg, token, arrive };
    if (sailingLine) setText(sailingLine, (sailingLine.dataset.template || '{port}').replace('{port}', portName(leg)));
    renderChart();
    sceneLeg = leg;
    const trip = callScene(scene, 'showLeg', leg, { from: lastLeg || null });
    if (trip && typeof trip.then === 'function') trip.then(arrive, arrive);
    else arrive();
  }
  function cancelSail() {
    if (!sailing) return;
    sailToken += 1;
    sailing = null;
    callScene(scene, 'skipTravel');
    renderChart();
  }
  if (skip) {
    skip.addEventListener('click', () => {
      if (!sailing) return;
      const { arrive } = sailing;
      if (scene && typeof scene.skipTravel === 'function') {
        callScene(scene, 'skipTravel'); // the scene settles showLeg's promise at once
        setTimeout(arrive, 1200); // and if it does not, the leg still comes
      } else {
        arrive();
      }
    });
  }
  const chartScene = () => {
    if (state.object !== 'chart') return;
    callScene(scene, 'setBearingPointer', !state.leg);
    if (!state.leg) {
      if (sceneLeg !== null) {
        callScene(scene, 'showLeg', null);
        sceneLeg = null;
      }
      return;
    }
    if (sceneLeg === state.leg) return;
    if (shownLeg === state.leg) {
      // Already on the page (an address opened before the scene was ready): no voyage, just be there.
      callScene(scene, 'showLeg', state.leg, { from: null, duration: 0 });
      sceneLeg = state.leg;
      return;
    }
    sail(state.leg);
  };

  /* ---------- Porthole and lamp ---------- */
  const interlude = $('[data-qa="interlude"]');
  const interludeText = interlude && $('[data-interlude-text]', interlude);
  const hideInterlude = () => {
    clearTimeout(interludeTimer);
    if (!interlude || interlude.hidden) return;
    interlude.hidden = true;
    interlude.dataset.moment = '';
  };
  function nextMoment() {
    momentIndex = (momentIndex + 1) % MOMENTS.length;
    const key = MOMENTS[momentIndex];
    callScene(scene, 'seaMoment', key);
    if (!interlude) return;
    if (!key) {
      hideInterlude();
      return;
    }
    // The porthole only turns the sea (no flight, no address, no panel); its slip reads for about six seconds.
    const source = $(`[data-moment-source="${key}"]`);
    clearTimeout(interludeTimer);
    interlude.hidden = false;
    interlude.dataset.moment = key;
    setText(interludeText, source ? source.textContent.trim() : '');
    interludeTimer = setTimeout(hideInterlude, 6000);
  }
  function act(id, from) {
    setTitle(false);
    if (PANELS.includes(id)) {
      if (!state.object) remember(from);
      navigate({ object: id, leg: null });
    } else if (id === 'porthole') {
      nextMoment();
    } else if (id === 'lamp') {
      callScene(scene, 'flickerLamp');
      const toggle = $('[data-qa="sound-toggle"]');
      if (toggle) toggle.click();
    }
  }

  /* ---------- Long panels: say when there is more below ---------- */
  const syncMore = (body) => {
    const panel = body.closest('[data-qa="panel"]');
    if (!panel) return;
    const more = body.scrollHeight - body.scrollTop - body.clientHeight > 8;
    if (panel.dataset.more !== String(more)) panel.dataset.more = String(more);
  };
  const bodies = $$('[data-qa="panel"] .panel__body');
  const syncAllMore = () => bodies.forEach(syncMore);
  bodies.forEach((body) => {
    body.addEventListener('scroll', () => syncMore(body), { passive: true });
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => syncMore(body));
      ro.observe(body);
      Array.from(body.children).forEach((child) => ro.observe(child));
    }
  });
  window.addEventListener('resize', syncAllMore);

  /* ---------- Opening, switching and closing ---------- */
  const barItems = $$('[data-qa="object-bar"] [data-object], [data-qa="object-dock"] [data-object]');
  const remember = (el) => {
    const active = document.activeElement;
    opener = el && el !== document.body ? el : active && active !== document.body ? active : null;
  };
  const headingOf = (object) => {
    const panel = panels[object];
    if (!panel) return null;
    if (object === 'chart' && state.leg && state.leg === shownLeg && !sailing && legs[state.leg]) return $('[tabindex="-1"]', legs[state.leg]);
    return document.getElementById(panel.getAttribute('aria-labelledby'));
  };
  // Focus moves to the panel's heading at once. A panel starts at its top; a leg on a phone starts at the leg.
  function focusHeading() {
    const h = state.object && headingOf(state.object);
    if (!h) return;
    const body = h.closest('.panel__body');
    if (body) {
      const leg = state.object === 'chart' && state.leg === shownLeg && !sailing ? legs[state.leg] : null;
      body.scrollTop = leg && !wide.matches ? Math.max(0, leg.offsetTop - 6) : 0;
    }
    h.focus({ preventScroll: true });
  }
  // Back at the desk, focus returns to what opened the first panel as soon as it is on screen again, within three
  // seconds; otherwise to "On the desk".
  const usable = (node) => Boolean(node && node.isConnected && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden');
  const restoreFocus = () => {
    const el = opener;
    opener = null;
    const started = performance.now();
    const tryFocus = () => {
      if (state.object) return;
      const active = document.activeElement;
      if (active && active !== document.body && !active.closest('[data-qa="panel"]')) return; // the reader moved on
      if (usable(el)) { el.focus({ preventScroll: true }); return; }
      if (performance.now() - started > 3000) { if (usable(menuToggle)) menuToggle.focus({ preventScroll: true }); return; }
      requestAnimationFrame(tryFocus);
    };
    requestAnimationFrame(tryFocus);
  };

  function apply(target) {
    const before = { object: state.object, leg: state.leg };
    state.object = target.object && panels[target.object] ? target.object : null;
    state.leg = state.object === 'chart' ? target.leg || null : null;
    const changedObject = state.object !== before.object;
    const changedLeg = state.leg !== before.leg;
    if (before.object === 'chart' && (changedObject || changedLeg)) cancelSail();
    if (before.object === 'chart' && changedObject) sceneLeg = undefined;
    if (root) {
      root.dataset.mode = state.object ? 'focus' : 'desk';
      if (state.object) root.dataset.focus = state.object;
      else delete root.dataset.focus;
    }
    html.classList.toggle('panel-open', Boolean(state.object));
    Object.keys(panels).forEach((id) => panels[id].classList.toggle('is-open', id === state.object));
    barItems.forEach((b) => {
      if (b.dataset.object === state.object) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    // Without a scene voyage (before the loader lets go, or no showLeg) a leg is simply there.
    const canSail = entered && scene && typeof scene.showLeg === 'function';
    if (state.leg && state.leg !== shownLeg && !canSail) {
      shownLeg = state.leg;
      lastLeg = state.leg;
      addFound(state.leg);
    }
    renderChart();
    if (state.object) {
      setMenu(false, false);
      setTitle(false);
      hideInterlude();
      if (!landfallOpen || changedObject) setLandfall(false);
      markSeen(state.object);
      renderNext();
    }

    if (state.object && (changedObject || changedLeg)) focusHeading();
    if (state.object) requestAnimationFrame(syncAllMore);
    if (!entered) return;

    if (state.object) {
      callScene(scene, 'setHighlight', null);
      if (changedObject) {
        if (before.object === 'chart') callScene(scene, 'setBearingPointer', false);
        const flight = callScene(scene, 'focus', state.object);
        if (flight && typeof flight.then === 'function') flight.then(chartScene, chartScene);
        else chartScene();
      } else if (changedLeg) {
        chartScene();
      }
    } else if (before.object) {
      callScene(scene, 'setBearingPointer', false);
      callScene(scene, 'home');
      callScene(scene, 'setPickable', true);
      restoreFocus();
    }
    if (target.title) openTitle({ focus: true });
  }

  function navigate(target, { replace } = {}) {
    const hash = hashOf(target.object, target.leg);
    const url = hash || `${location.pathname}${location.search}`;
    const fromDesk = !state.object;
    const useReplace = replace !== undefined ? replace : !fromDesk || !target.object;
    try {
      if (useReplace) history.replaceState({ rhumbDesk: true }, '', url);
      else history.pushState({ rhumbDesk: true }, '', url);
    } catch (err) {
      console.warn(`${LOG}history is not available:`, err);
    }
    if (fromDesk && target.object && !useReplace) pushedFromDesk = true;
    if (!target.object) pushedFromDesk = false;
    apply(target);
  }

  function close() {
    if (!state.object) return;
    if (pushedFromDesk) {
      pushedFromDesk = false;
      history.back(); // popstate brings the desk back
      return;
    }
    navigate({ object: null, leg: null }, { replace: true });
  }

  window.addEventListener('popstate', () => {
    const target = parseHash(location.hash);
    if (!target.object) pushedFromDesk = false;
    apply(target);
  });
  window.addEventListener('hashchange', () => {
    const target = parseHash(location.hash);
    if (target.object !== state.object || target.leg !== state.leg) apply(target);
  });

  $$('[data-qa="panel-close"]').forEach((b) => b.addEventListener('click', close));

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"], a[data-route]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = parseHash(a.dataset.route ? `#${a.dataset.route}` : a.getAttribute('href'));
    if (!target.object && !target.title) return;
    e.preventDefault();
    setMenu(false, false);
    if (target.title) {
      if (state.object) close();
      setLandfall(false);
      hideInterlude();
      openTitle({ focus: true });
      return;
    }
    if (!state.object) remember(a);
    navigate(target);
  });

  // A click on an object in the scene opens it, from the desk or straight from another open object.
  window.addEventListener('rhumbcabin:select', (e) => {
    const id = e.detail && e.detail.id;
    if (!id || !entered || id === state.object) return;
    setMenu(false, false);
    act(id, null);
  });

  /* ---------- Keyboard: Esc, and Tab kept among the panel, its landfall card and the object dock or bar ---------- */
  const focusables = (scope) => $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])', scope)
    .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;
    if (e.key === 'Escape') {
      if (menuOpen) { e.preventDefault(); setMenu(false, true); return; }
      if (landfallOpen && !state.object) { e.preventDefault(); setLandfall(false); return; }
      if (state.object) { e.preventDefault(); close(); return; }
      const titleWasOpen = html.classList.contains('title-open');
      setTitle(false);
      if (titleWasOpen) return;
      hideInterlude();
      return;
    }
    if (e.key !== 'Tab' || !state.object) return;
    const scopes = [panels[state.object], landfallOpen ? landfall : null, dock, $('[data-qa="object-bar"]')].filter(Boolean);
    const items = scopes.flatMap(focusables);
    if (!items.length) return;
    const active = document.activeElement;
    const first = items[0];
    const last = items[items.length - 1];
    if (!scopes.some((s) => s.contains(active))) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ---------- Object buttons and the name tag, laid over the scene's objects ---------- */
  const buttons = {};
  $$('[data-qa="object-button"]').forEach((b) => {
    const id = b.dataset.object;
    buttons[id] = b;
    b.addEventListener('click', () => act(id, b));
    b.addEventListener('focus', () => { focusId = id; callScene(scene, 'setHighlight', id); startPlacing(); });
    b.addEventListener('blur', () => { if (focusId === id) focusId = null; callScene(scene, 'setHighlight', null); });
  });
  const tag = $('[data-objtag]');
  const tagName = tag && $('[data-objtag-name]', tag);
  const tagHint = tag && $('[data-objtag-hint]', tag);
  let tagFor = null;
  let frame = 0;
  const placed = {};
  function place() {
    frame = 0;
    if (!scene || !entered) return;
    const anchors = {};
    Object.keys(buttons).forEach((id) => {
      const a = callScene(scene, 'getAnchor', id);
      const ok = Boolean(a && a.visible && a.w > 0 && a.h > 0);
      const b = buttons[id];
      // While the camera moves (or glances at the porthole) the scene reports no anchors: buttons keep their place.
      if (!ok) return;
      const cx = Number.isFinite(a.cx) ? a.cx : a.x + a.w / 2;
      const cy = Number.isFinite(a.cy) ? a.cy : a.y + a.h / 2;
      anchors[id] = { ...a, cx, cy };
      const key = `${cx.toFixed(1)}|${cy.toFixed(1)}`;
      if (placed[id] !== key) {
        b.style.setProperty('--ox', `${cx.toFixed(1)}px`);
        b.style.setProperty('--oy', `${cy.toFixed(1)}px`);
        b.classList.add('is-placed');
        placed[id] = key;
      }
    });
    // The name tag follows the pointer's object at the desk and while a panel is open (not the open object itself).
    const show = (!state.object && focusId) || (hoverId !== state.object ? hoverId : null);
    if (tag) {
      const a = show && anchors[show];
      if (a) {
        if (tagFor !== show) {
          const c = copyOf(show);
          setText(tagName, c.name);
          setText(tagHint, c.hint);
          tagFor = show;
        }
        const below = a.y < 70;
        tag.classList.toggle('is-below', below);
        tag.style.setProperty('--tx', `${(a.x + a.w / 2).toFixed(1)}px`);
        tag.style.setProperty('--ty', `${(below ? a.y + a.h : a.y).toFixed(1)}px`);
        tag.classList.add('is-shown');
      } else {
        tag.classList.remove('is-shown');
      }
    }
    // After the six objects the scene hints the cup until it has been opened.
    if (state.object === 'cup' && !cupOpened) { cupOpened = true; renderHint(); }
    frame = requestAnimationFrame(place);
  }
  function startPlacing() { if (!frame && scene && entered) frame = requestAnimationFrame(place); }
  window.addEventListener('rhumbcabin:hover', (e) => {
    hoverId = (e.detail && e.detail.id) || null;
    if (hoverId) setTitle(false);
    startPlacing();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) startPlacing(); });
  window.addEventListener('resize', () => {
    Object.keys(buttons).forEach((id) => { buttons[id].classList.remove('is-placed'); delete placed[id]; });
    startPlacing();
    if (html.classList.contains('title-open')) placeTitle(scene ? objectBoxes() : []);
  });

  /* ---------- Start ---------- */
  renderQuest(found);
  renderHint();
  const initial = parseHash(location.hash);
  if (initial.object || initial.title) {
    try { history.replaceState({ rhumbDesk: true }, '', hashOf(initial.object, initial.leg) || `${location.pathname}${location.search}`); } catch (err) { /* keep the address */ }
  }
  apply({ object: initial.object, leg: initial.leg });

  whenEntered(() => {
    entered = true;
    callScene(scene, 'setPickable', true);
    callScene(scene, 'setFound', found.slice());
    if (found.length === LEGS.length) callScene(scene, 'landfall');
    if (landfallDue) {
      landfallDue = false;
      setLandfall(true);
    }
    renderHint();
    // While the camera settles (and after every flight home) keep the hint lines off the objects.
    if (state.object) {
      const flight = callScene(scene, 'focus', state.object);
      if (flight && typeof flight.then === 'function') flight.then(chartScene, chartScene);
      else chartScene();
      focusHeading();
    } else {
      openTitle({ auto: true });
    }
    startPlacing();
  });

  return {
    get state() { return { ...state, found: found.slice(), seen: seen.slice(), sailing: Boolean(sailing) }; },
    open: (object, leg) => navigate({ object, leg: leg || null }),
    close,
  };
}
