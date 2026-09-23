/* lang.js — this copy of the site speaks Vietnamese and nothing else.
   Written by build.mjs; the two-language version lives in the source folder. */
import { COPY } from './copy.js';

export const LANG = 'vi';
export function getLang() { return LANG; }
export function setLang() { /* there is nothing to switch to */ }
export function applyDocLang() { document.documentElement.lang = LANG; }
export const T = () => COPY[LANG];
export const fill = (s, map) => String(s).replace(/\{(\w+)\}/g, (_, k) => (k in map ? map[k] : "{" + k + "}"));
