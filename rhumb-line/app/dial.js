/* Rhumb Line · app/dial.js
   The cupping table's volvelle: a paper disc with eight flavour families, turned by drag, tap or arrow keys.
   The family under the red lubber mark (north) is selected; [data-qa="wheel-selected"] describes it and lists the
   voyage's origins that carry it. The list of families below is the text equivalent and can select too. */

import { $, $$, createTurnControl, originNames, svgEl } from './dom.js';
import { FLAVORS, ORIGINS, RAD, clamp, wrapDeg } from './data.js';

function buildVolvelle(svg, flavors, copy) {
  const COUNT = flavors.length;
  const STEP = 360 / COUNT;
  const f2 = (n) => n.toFixed(2);
  const pol = (deg, r) => [Math.sin(deg * RAD) * r, -Math.cos(deg * RAD) * r];
  const arc = (a0, a1, r) => {
    const [x0, y0] = pol(a0, r);
    const [x1, y1] = pol(a1, r);
    return `M${f2(x0)} ${f2(y0)}A${r} ${r} 0 0 1 ${f2(x1)} ${f2(y1)}`;
  };
  // The same arc drawn the other way round: text laid on it reads upright in the lower half of the disc.
  const arcBack = (a0, a1, r) => {
    const [x1, y1] = pol(a1, r);
    const [x0, y0] = pol(a0, r);
    return `M${f2(x1)} ${f2(y1)}A${r} ${r} 0 0 0 ${f2(x0)} ${f2(y0)}`;
  };
  const wedge = (a0, a1, r0, r1) => {
    const [x2, y2] = pol(a1, r0);
    const [x3, y3] = pol(a0, r0);
    return `${arc(a0, a1, r1)}L${f2(x2)} ${f2(y2)}A${r0} ${r0} 0 0 0 ${f2(x3)} ${f2(y3)}Z`;
  };
  svgEl('circle', { class: 'dial__face', r: '294' }, svg);
  let bezel = '';
  for (let a = 0; a < 360; a += 5) {
    const [x1, y1] = pol(a, 294);
    const [x2, y2] = pol(a, a % 45 === 0 ? 272 : 283);
    bezel += `M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}`;
  }
  svgEl('path', { class: 'dial__ticks', d: bezel }, svg);
  svgEl('circle', { class: 'dial__ring dial__ring--fine', r: '268' }, svg);
  const card = svgEl('g', { class: 'dial__card' }, svg);
  // Each label has two paths: the clockwise arc (read from outside, upper half) and the reversed arc (lower half).
  // On the reversed arc the letters hang inwards from the baseline, so it sits one letter-height further out; the
  // notes also swap order, so the first note stays on top as the reader sees it.
  const flips = [];
  const sectors = flavors.map((id, k) => {
    const a = k * STEP;
    const c = copy[id] || { name: id, detail: '' };
    const g = svgEl('g', { class: 'dial__sector', 'data-family': id }, card);
    const labels = [];
    svgEl('path', { class: 'dial__wedge', d: wedge(a - STEP / 2, a + STEP / 2, 100, 262) }, g);
    svgEl('path', { id: `dial-arc-${id}`, d: arc(a - STEP / 2 + 1, a + STEP / 2 - 1, 217), fill: 'none' }, g);
    svgEl('path', { id: `dial-arc-${id}-up`, d: arcBack(a - STEP / 2 + 1, a + STEP / 2 - 1, 234), fill: 'none' }, g);
    const name = svgEl('text', { class: 'dial__name' }, g);
    const nameTp = svgEl('textPath', { href: `#dial-arc-${id}`, startOffset: '50%', 'text-anchor': 'middle' }, name);
    nameTp.textContent = c.name;
    labels.push({ tp: nameTp, normal: `#dial-arc-${id}`, upright: `#dial-arc-${id}-up` });
    const notes = c.detail ? c.detail.split(' · ') : [];
    const radii = notes.length > 2 ? [170, 147, 124] : [162, 136];
    notes.forEach((note, j) => {
      const inner = radii[radii.length - 1 - j] || 124;
      svgEl('path', { id: `dial-note-${id}-${j}`, d: arc(a - STEP / 2 + 2, a + STEP / 2 - 2, radii[j] || 124), fill: 'none' }, g);
      svgEl('path', { id: `dial-note-${id}-${j}-up`, d: arcBack(a - STEP / 2 + 2, a + STEP / 2 - 2, inner + 10), fill: 'none' }, g);
      const t = svgEl('text', { class: 'dial__note' }, g);
      const tp = svgEl('textPath', { href: `#dial-note-${id}-${j}`, startOffset: '50%', 'text-anchor': 'middle' }, t);
      tp.textContent = note;
      labels.push({ tp, normal: `#dial-note-${id}-${j}`, upright: `#dial-note-${id}-${j}-up` });
    });
    flips.push({ labels, upright: null });
    const [s1x, s1y] = pol(a + STEP / 2, 100);
    const [s2x, s2y] = pol(a + STEP / 2, 262);
    svgEl('path', { class: 'dial__spoke', d: `M${f2(s1x)} ${f2(s1y)}L${f2(s2x)} ${f2(s2y)}` }, g);
    const [gx, gy] = pol(a, 249);
    svgEl('path', { class: 'dial__gem', d: 'M0 -6L4.5 0L0 6L-4.5 0Z', transform: `translate(${f2(gx)} ${f2(gy)}) rotate(${a})` }, g);
    return g;
  });
  svgEl('circle', { class: 'dial__ring', r: '262' }, card);
  svgEl('circle', { class: 'dial__ring dial__ring--fine', r: '192' }, card);
  svgEl('circle', { class: 'dial__ring', r: '100' }, card);
  svgEl('path', { class: 'dial__window', d: arc(-STEP / 2, STEP / 2, 265) }, svg);
  svgEl('path', { class: 'dial__lubber', d: 'M0 -266L-10 -292H10Z' }, svg);
  let lt = '';
  let dk = '';
  [[0, 84, 16], [90, 84, 16], [180, 84, 16], [270, 84, 16], [45, 52, 12], [135, 52, 12], [225, 52, 12], [315, 52, 12]].forEach(([a, tip, inner]) => {
    const [tx, ty] = pol(a, tip);
    const [lx, ly] = pol(a - 45, inner);
    const [rx, ry] = pol(a + 45, inner);
    dk += `M0 0L${f2(lx)} ${f2(ly)}L${f2(tx)} ${f2(ty)}Z`;
    lt += `M0 0L${f2(tx)} ${f2(ty)}L${f2(rx)} ${f2(ry)}Z`;
  });
  svgEl('path', { class: 'dial__star-lt', d: lt }, svg);
  svgEl('path', { class: 'dial__star-dk', d: dk }, svg);
  return {
    step: STEP,
    count: COUNT,
    render(angle) {
      card.setAttribute('transform', `rotate(${angle.toFixed(2)})`);
      // Labels whose centre is in the lower half (east excluded, west included) switch to their reversed arc.
      flips.forEach((flip, k) => {
        const at = (((k * STEP + angle) % 360) + 360) % 360;
        const upright = at > 90.5 && at <= 270.5;
        if (upright === flip.upright) return;
        flip.upright = upright;
        flip.labels.forEach((l) => l.tp.setAttribute('href', upright ? l.upright : l.normal));
        sectors[k].dataset.upright = String(upright);
      });
    },
    setNorth(i) { sectors.forEach((g, k) => g.classList.toggle('is-north', k === i)); },
  };
}

export function initDial({ reduce }) {
  const wheel = $('[data-qa="wheel"]');
  const svg = wheel && $('[data-dial-svg]', wheel);
  const box = $('[data-qa="wheel-selected"]');
  const items = $$('li[data-family]');
  if (!wheel || !svg) return;

  const copy = {};
  items.forEach((li) => {
    const pick = (f) => {
      const el = $(`[data-f="${f}"]`, li);
      return el ? el.textContent.trim() : '';
    };
    copy[li.dataset.family] = { name: pick('name'), detail: pick('detail'), desc: pick('desc') };
  });
  const names = originNames();
  const disc = buildVolvelle(svg, FLAVORS, copy);
  const COUNT = disc.count;
  const STEP = disc.step;
  let angle = 0;
  let target = 0;
  let index = -1;
  let frame = 0;
  let last = 0;
  const wrap = (i) => ((i % COUNT) + COUNT) % COUNT;
  const indexOf = (ang) => wrap(Math.round(-ang / STEP));

  const tick = (now) => {
    const dt = clamp(now - last, 0, 64);
    last = now;
    const diff = target - angle;
    if (Math.abs(diff) < 0.05) {
      angle = target;
      disc.render(angle);
      frame = 0;
      return;
    }
    angle += diff * (1 - Math.exp(-dt / 110));
    disc.render(angle);
    frame = requestAnimationFrame(tick);
  };
  const animateTo = (t) => {
    target = t;
    if (reduce) {
      angle = t;
      disc.render(angle);
      return;
    }
    if (!frame) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };
  const turnTo = (i) => {
    const base = -wrap(i) * STEP;
    animateTo(base + 360 * Math.round((target - base) / 360)); // the short way round
  };

  function select(i) {
    const k = wrap(i);
    if (k === index) return;
    index = k;
    const id = FLAVORS[k];
    const c = copy[id] || {};
    wheel.setAttribute('aria-valuenow', String(k + 1));
    wheel.setAttribute('aria-valuetext', c.name || id);
    disc.setNorth(k);
    items.forEach((li) => {
      const b = $('[data-pick]', li);
      if (b) b.setAttribute('aria-pressed', String(li.dataset.family === id));
    });
    if (!box) return;
    box.dataset.flavor = id;
    const set = (key, text) => {
      const el = $(`[data-p="${key}"]`, box);
      if (el) el.textContent = text;
    };
    set('index', `${String(k + 1).padStart(2, '0')} / ${String(COUNT).padStart(2, '0')}`);
    set('name', c.name || '');
    set('detail', c.detail || '');
    set('desc', c.desc || '');
    const holder = $('[data-p="origins"]', box);
    if (holder) {
      holder.textContent = '';
      ORIGINS.filter((o) => o.flavors.includes(id)).forEach((o, n) => {
        if (n) {
          const sep = document.createElement('span');
          sep.className = 'sr-only';
          sep.textContent = '; ';
          holder.appendChild(sep);
        }
        const span = document.createElement('span');
        span.textContent = names[o.id] || o.id;
        holder.appendChild(span);
      });
    }
  }
  const choose = (i) => {
    turnTo(i);
    select(i);
  };

  wheel.addEventListener('keydown', (e) => {
    const steps = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const current = index < 0 ? 0 : index;
    if (e.key in steps) choose(current + steps[e.key]);
    else if (e.key === 'Home') choose(0);
    else if (e.key === 'End') choose(COUNT - 1);
    else return;
    e.preventDefault();
  });

  createTurnControl(wheel, {
    slop: 5,
    onStart() {
      cancelAnimationFrame(frame);
      frame = 0;
      target = angle;
    },
    onTurn(delta) {
      angle += delta;
      target = angle;
      disc.render(angle);
      select(indexOf(angle));
    },
    onEnd({ tap, angle: at, radius }) {
      const units = radius * 300; // the disc is 600 units across
      if (tap && units >= 100 && units <= 270) {
        choose(Math.round(wrapDeg(at - angle) / STEP));
        return;
      }
      choose(indexOf(angle));
    },
  });

  items.forEach((li) => {
    const b = $('[data-pick]', li);
    if (b) b.addEventListener('click', () => choose(FLAVORS.indexOf(b.dataset.pick)));
  });

  const list = $('details.flist');
  if (list) list.open = false;
  disc.render(angle);
  select(0);
}
