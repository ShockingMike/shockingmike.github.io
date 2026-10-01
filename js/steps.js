/* steps.js — one gesture, one record (Mike, 1/10/2026: the scroll slipped too easily; make it step the way Studio Kōzō does).

   This is how Studio Kōzō takes its input (prototypes/kozo-look/page/buoc.js), copied here so the page stands on its own.
   ONE GESTURE = ONE STEP:
     · one wheel notch, one swipe on a trackpad — however hard, with its dozens of shrinking wheel events and its inertia
       tail —, one swipe on a phone, one press of ↓ / PageDown (Space, with a record open) → the next record;
       ↑ / PageUp / Shift+Space and the wheel the other way → the one before; Home / End → the first / the last stop.
     · a NEW gesture is a wheel event that comes after ≥ 180 ms of quiet: a flick's whole inertia tail counts as one.
     · while a record is moving, and for a moment after it lands, a new wheel gesture is DROPPED, never queued (the stage
       decides that in step(); the one exception is a gesture the other way, which turns the move back).
     · a click — a record, a tick on the rail, the mark, Home / End — is never dropped: the stage either runs it at once
       or remembers the last one and runs it as soon as the move it cannot interrupt is over.
   This file only reads the hands. What a step does, and when the stage is locked, lives in stage.js.

   o: { canInput(), step(dir) → bool, go('first' | 'last'), ownWheel(e, dy) → bool, ownTouch(el, dir) → bool, spaceSteps() } */

export function createSteps(o) {
  const GAP_MS = 180;   // quiet that makes the next wheel event a new gesture
  const SWIPE = 40;     // px a finger has to travel, mostly up or down, to count as a swipe
  const S = { lastWheel: -1e9, armed: true };
  const now = () => performance.now();
  const px = (e) => e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);

  // listened for on the way down (capture), so the wheel works over the words and over the rows of buttons too
  addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;            // pinch / Ctrl + wheel: the browser zooms
    if (!o.canInput()) return;        // the preview layer scrolls itself
    const t = now(), gap = t - S.lastWheel;
    S.lastWheel = t;
    if (gap > GAP_MS) S.armed = true;
    const dy = px(e);
    // a record's words taller than the screen scroll themselves first; the rest of that gesture does not turn the record
    if (o.ownWheel(e, dy)) { S.armed = false; return; }
    e.preventDefault();
    if (!S.armed || Math.abs(dy) < 2) return;
    // one step for the whole gesture: taken, or dropped if the stage is still moving — either way the gesture is spent
    S.armed = false;
    o.step(dy > 0 ? 1 : -1);
  }, { passive: false, capture: true });

  // the keys. Space opens the record in view in the crate (main.js); with a record open it turns to the next one.
  const FIELD = /^(INPUT|TEXTAREA|SELECT)$/;
  const typing = (el) => !!el && (el.isContentEditable || FIELD.test(el.tagName));
  const ownsSpace = (el) => !!el && !!el.closest && !!el.closest('button, summary, [role="button"]');
  addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.isComposing || e.keyCode === 229) return;
    if (!o.canInput() || typing(e.target) || typing(document.activeElement)) return;
    let d = 0;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') d = 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') d = -1;
    else if (e.key === ' ' || e.key === 'Spacebar') { if (!o.spaceSteps() || ownsSpace(e.target)) return; d = e.shiftKey ? -1 : 1; }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); if (!e.repeat) o.go(e.key === 'Home' ? 'first' : 'last'); return; }
    if (!d) return;
    e.preventDefault();
    if (!e.repeat) o.step(d);         // holding a key down is still one press
  });

  // a phone: one swipe up or down = one record, taken the moment the finger has gone far enough; the page never scrolls.
  // A swipe that starts on a record's words which can still scroll that way is theirs, like the wheel.
  let T = null;
  addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || !o.canInput()) { T = null; return; }
    const p = e.touches[0];
    const el = e.target;
    T = { x: p.clientX, y: p.clientY, el, own: o.ownTouch(el, 1) || o.ownTouch(el, -1) ? null : false, done: false };
  }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (!T) return;
    if (e.touches.length !== 1) { T = null; return; }
    const p = e.touches[0], dy = T.y - p.clientY, dx = T.x - p.clientX;   // dy > 0: the finger goes up = on
    if (T.own === null) {
      if (Math.abs(dy) < 4) return;   // which way is not clear yet; the browser has not started to scroll either
      T.own = o.ownTouch(T.el, dy > 0 ? 1 : -1);
    }
    if (T.own) return;
    if (e.cancelable) e.preventDefault();
    if (!T.done && Math.abs(dy) > SWIPE && Math.abs(dy) > Math.abs(dx) * 1.2) { T.done = true; o.step(dy > 0 ? 1 : -1); }
  }, { passive: false });
  const end = () => { T = null; };
  addEventListener('touchend', end, { passive: true });
  addEventListener('touchcancel', end, { passive: true });

  return { state: () => ({ armed: S.armed, lastWheel: S.lastWheel }) };
}
