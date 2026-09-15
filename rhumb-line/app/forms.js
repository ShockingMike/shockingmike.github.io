/* Rhumb Line · app/forms.js
   The demo dialog and the newsletter form. Nothing is ever sent anywhere. */

import { $, $$ } from './dom.js';

const openers = new WeakMap();
let smooth = () => null;

export function openModal(id, opener) {
  const dialog = document.getElementById(id);
  if (!dialog || typeof dialog.showModal !== 'function' || dialog.open) return;
  openers.set(dialog, opener || document.activeElement);
  dialog.showModal();
  const lenis = smooth();
  if (lenis) lenis.stop();
}

export function initModals(getLenis) {
  if (typeof getLenis === 'function') smooth = getLenis;
  $$('dialog').forEach((dialog) => {
    $$('[data-close]', dialog).forEach((b) => b.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dialog.close();
    });
    dialog.addEventListener('close', () => {
      const lenis = smooth();
      if (lenis) lenis.start();
      const opener = openers.get(dialog);
      if (opener && opener.isConnected && opener.getClientRects().length) opener.focus({ preventScroll: true });
    });
  });
}

export function initNewsletter() {
  const input = $('[data-qa="nl-email"]');
  const form = input && input.form;
  const msg = $('[data-qa="nl-message"]');
  if (!form || !msg) return;
  const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;
  form.addEventListener('submit', (e) => {
    e.preventDefault(); // demo only: nothing is sent
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
