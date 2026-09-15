/* Rhumb Line · app/bearing.js
   The bearing readout on the ocean chart ([data-qa="bearing"]): before a port is picked, the scene draws a course from
   Merrowick under the pointer or finger and sends rhumbcabin:bearing { deg, originId, nmi }. Without the scene the
   readout keeps the default course (Yirgacheffe). */

import { $, originNames, setText } from './dom.js';
import { COURSES, DEFAULT_ORIGIN, fmtDeg, fmtNmi, nearestOrigin, wrapDeg } from './data.js';

export function initBearing() {
  const readout = $('[data-qa="bearing"]');
  if (!readout) return;
  const names = originNames();
  const degEl = $('[data-bearing-deg]', readout);
  const nameEl = $('[data-bearing-name]', readout);
  const nmiEl = $('[data-bearing-nmi]', readout);

  const show = (detail) => {
    const d = Number(detail && detail.deg);
    if (!Number.isFinite(d)) return;
    const deg = wrapDeg(d);
    const id = detail.originId && names[detail.originId] ? detail.originId : nearestOrigin(deg);
    const nmi = detail.nmi !== null && detail.nmi !== undefined && Number.isFinite(Number(detail.nmi)) ? Number(detail.nmi) : COURSES[id].nmi;
    setText(degEl, fmtDeg(deg));
    setText(nameEl, names[id] || '');
    setText(nmiEl, fmtNmi(nmi));
  };
  window.addEventListener('rhumbcabin:bearing', (e) => show(e.detail || {}));
  show({ deg: COURSES[DEFAULT_ORIGIN].bearing });
}
