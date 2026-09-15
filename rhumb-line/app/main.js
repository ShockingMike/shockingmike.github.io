/* Rhumb Line · app/main.js
   The page layer over the 3D cabin. scene/boot.js imports this file after preloading it and calls
   `await init({ scene, reduce })`, where scene is window.RhumbCabin or null (no WebGL, or the scene failed).
   init resolves once the page is ready: stylesheet applied, fonts loaded (or given up on), the desk wired.

   - With the scene: the exploration desk (desk contract v2). html.desk stays on; no page scroll.
   - Without it: html.desk comes off and the page is a plain scrolling document with every panel in object order.

   Modules (static relative imports only, contract v1 section 3a):
     data.js     numbers and rules: objects and routes, origins, flavours, plans, quiz scoring, rhumb lines, topography
     dom.js      DOM helpers, safe scene calls, the turn control
     desk.js     routing by hash, panels as dialogs, quest, porthole, lamp, object buttons, name tag, menu, object bar
     bearing.js  the course readout on the ocean chart
     label.js    canvas bag labels
     dial.js     the flavour volvelle
     quiz.js     "Join the crew"
     forms.js    demo dialog and newsletter */

import { $, LOG, guard } from './dom.js';
import { createDesk, initDocument } from './desk.js';
import { initBearing } from './bearing.js';
import { initLabels } from './label.js';
import { initDial } from './dial.js';
import { initQuiz } from './quiz.js';
import { initModals, initNewsletter } from './forms.js';
import { initLightbox } from './lightbox.js';

let started = null;

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);
}

// style.css is linked in <body> right after the loader; this only waits for it (or adds it if the link is missing).
function ensureStylesheet() {
  const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find((l) => /(^|\/)style\.css$/.test(l.getAttribute('href') || ''));
  if (existing && existing.sheet) return Promise.resolve();
  const link = existing || document.createElement('link');
  const loaded = new Promise((resolve) => {
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', () => {
      console.error(`${LOG}style.css could not load`);
      resolve();
    }, { once: true });
  });
  if (!existing) {
    link.rel = 'stylesheet';
    link.href = 'style.css';
    document.head.appendChild(link);
  }
  return withTimeout(loaded, 10000);
}

function fontsReady() {
  const fonts = document.fonts;
  if (!fonts || typeof fonts.load !== 'function') return Promise.resolve();
  const sheet = $('link[data-fonts]');
  const sheetReady = new Promise((resolve) => {
    if (!sheet || (sheet.sheet && sheet.media === 'all')) return resolve();
    sheet.addEventListener('load', resolve, { once: true });
    sheet.addEventListener('error', resolve, { once: true });
  });
  const faces = ['400 19px "EB Garamond"', 'italic 400 19px "EB Garamond"', '500 28px "EB Garamond"', '400 14px "IBM Plex Mono"', '600 14px "Barlow Condensed"'];
  return withTimeout(sheetReady.then(() => Promise.all(faces.map((f) => fonts.load(f).catch(() => null)))), 4500);
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

export async function init({ scene = null, reduce } = {}) {
  if (started) return started;
  started = (async () => {
    const html = document.documentElement;
    // Mike's decision (2026-09-15): motion always plays, whatever the OS reduced-motion setting says.
    const reduced = false;
    const cabin = scene || null;
    // Decided first, while the loader still covers the page, so the layout never jumps in view.
    html.classList.toggle('desk', Boolean(cabin));
    html.classList.toggle('has-scene', Boolean(cabin));
    if (!cabin) html.classList.add('no-webgl');
    html.classList.toggle('rm', reduced);

    await Promise.all([ensureStylesheet(), fontsReady()]);
    await nextFrame();

    guard('bag labels', () => initLabels());
    guard('flavour dial', () => initDial({ reduce: reduced }));
    guard('quiz', () => initQuiz({ reduce: reduced }));
    guard('newsletter', () => initNewsletter());
    guard('modals', () => initModals());
    guard('photo prints', () => initLightbox());
    guard('bearing', () => initBearing());
    const desk = cabin ? guard('desk', () => createDesk({ scene: cabin, reduce: reduced })) : guard('document', () => initDocument());
    await nextFrame();
    return { desk };
  })();
  return started;
}
