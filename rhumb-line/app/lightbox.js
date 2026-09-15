/* Rhumb Line: enlarges the taped photo prints.
   Every [data-qa="photo"] print (in the chart legs and in the chest) becomes a button. Click, tap, Enter or Space opens
   the photo in a native <dialog>, which keeps focus inside and closes on Esc. The close button or a click on the dark
   backdrop also closes it, and focus goes back to the print. The desk's own Esc handler ignores keys while a dialog is open. */
import { $, $$ } from './dom.js';

export function initLightbox() {
  const box = $('[data-qa="lightbox"]');
  if (!box || typeof box.showModal !== 'function') return;
  const img = $('.lightbox__img', box);
  const caption = $('.lightbox__caption', box);
  const closeBtn = $('[data-qa="lightbox-close"]', box);
  const enlarge = box.dataset.enlarge || '';
  let opener = null;

  for (const print of $$('[data-qa="photo"]')) {
    const frame = $('.photo__frame', print);
    const pic = $('img', print);
    if (!frame || !pic) continue;
    const text = $('figcaption', print)?.textContent.trim() || pic.alt;
    frame.classList.add('photo__frame--zoom');
    frame.setAttribute('role', 'button');
    frame.tabIndex = 0;
    frame.setAttribute('aria-label', enlarge ? `${enlarge}: ${text}` : text);
    const open = (e) => {
      e.preventDefault();
      e.stopPropagation();
      show(print, frame, pic);
    };
    frame.addEventListener('click', open);
    frame.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') open(e);
    });
  }

  function show(print, frame, pic) {
    opener = frame;
    const text = $('figcaption', print)?.textContent.trim() || '';
    img.src = pic.currentSrc || pic.src;
    img.alt = pic.alt;
    for (const attr of ['width', 'height']) {
      if (pic.hasAttribute(attr)) img.setAttribute(attr, pic.getAttribute(attr));
    }
    caption.textContent = text;
    caption.hidden = !text;
    box.setAttribute('aria-label', text || pic.alt);
    box.showModal();
    closeBtn?.focus();
  }

  const hide = () => {
    if (box.open) box.close();
  };
  closeBtn?.addEventListener('click', hide);
  // A click on the ::backdrop is delivered to the dialog element itself.
  box.addEventListener('click', (e) => {
    if (e.target === box) hide();
  });
  box.addEventListener('close', () => {
    img.removeAttribute('src');
    opener?.focus({ preventScroll: true });
    opener = null;
  });
}
