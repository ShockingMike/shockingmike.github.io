/* Rhumb Line · app/dom.js
   Small DOM helpers shared by the page modules. */

import { RAD } from './data.js';

export const LOG = '[Rhumb Line] ';
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const mq = (q) => window.matchMedia(q);
export const canAnimate = () => typeof Element.prototype.animate === 'function';
const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
  if (parent) parent.appendChild(el);
  return el;
}

export function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

// Runs fn and reports a failure without stopping the rest of the page.
export function guard(name, fn) {
  try {
    return fn();
  } catch (err) {
    console.error(`${LOG}${name} failed:`, err);
    return null;
  }
}

// Calls a scene method only when the scene exists and has it (the page must work with scene === null).
export function callScene(scene, method, ...args) {
  if (!scene || typeof scene[method] !== 'function') return undefined;
  try {
    return scene[method](...args);
  } catch (err) {
    console.error(`${LOG}scene.${method} failed:`, err);
    return undefined;
  }
}

// fn runs once the loader has let go (html.is-loading removed, or rhumbcabin:ready).
export function whenEntered(fn) {
  const html = document.documentElement;
  if (!html.classList.contains('is-loading')) {
    fn();
    return;
  }
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    observer.disconnect();
    fn();
  };
  const observer = new MutationObserver(() => { if (!html.classList.contains('is-loading')) go(); });
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('rhumbcabin:ready', go, { once: true });
}

// Origin names as printed in the log (origins.*.name), read from each leg's bag label copy.
let names = null;
export function originNames() {
  if (names) return names;
  names = {};
  $$('[data-qa="leg"][data-origin]').forEach((leg) => {
    const el = $('[data-f="name"]', leg);
    if (el) names[leg.dataset.origin] = el.textContent.trim();
  });
  return names;
}

/* Turn control: drag an element round its centre (mouse, pen or finger). Reports the change in bearing on every
   move; on release reports whether it was a tap, and where (angle, and radius as a share of the half-width). */
export function createTurnControl(el, handlers) {
  const SLOP = handlers.slop || 4;
  let drag = null;
  const centre = () => {
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, half: r.width / 2 || 1 };
  };
  const angleOf = (e, c) => Math.atan2(e.clientX - c.cx, -(e.clientY - c.cy)) / RAD;
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const c = centre();
    drag = { id: e.pointerId, c, last: angleOf(e, c), x: e.clientX, y: e.clientY, moved: 0 };
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
    if (handlers.onStart) handlers.onStart();
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const a = angleOf(e, drag.c);
    const delta = ((((a - drag.last) % 360) + 540) % 360) - 180;
    drag.last = a;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
    if (drag.moved < SLOP) return;
    el.classList.add('is-dragging');
    handlers.onTurn(delta);
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { c } = drag;
    const tap = drag.moved < SLOP && e.type === 'pointerup';
    drag = null;
    el.classList.remove('is-dragging');
    if (handlers.onEnd) {
      handlers.onEnd({ tap, angle: angleOf(e, c), radius: Math.hypot(e.clientX - c.cx, e.clientY - c.cy) / c.half });
    }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  return { dragging: () => Boolean(drag) };
}
