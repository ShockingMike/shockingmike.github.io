/* Rhumb Line · app/quiz.js
   "Join the crew": four radio questions shown one at a time (Next, Back), then the scored berth with a stamp and the
   demo checkout. Scoring is the fixed table in data.js (scoreQuiz). */

import { $, $$, canAnimate, originNames } from './dom.js';
import { scoreQuiz } from './data.js';
import { openModal } from './forms.js';

export function initQuiz({ reduce }) {
  const next = $('[data-qa="quiz-next"]');
  const form = next && next.form;
  if (!form) return;
  const steps = $$('[data-step]', form);
  const progress = $('[data-quiz-progress]', form);
  const marks = $$('.quiz__scale i', form);
  const back = $('[data-quiz-back]', form);
  const result = $('[data-qa="quiz-result"]', form);
  const restart = $('[data-restart]', form);
  const subscribe = $('[data-qa="quiz-subscribe"]', form);
  const stamp = $('[data-r-stamp]', form);
  if (!steps.length || !result) return;

  const plans = {};
  $$('li.plan[data-plan]').forEach((li) => {
    const pick = (f) => {
      const el = $(`[data-f="${f}"]`, li);
      return el ? el.textContent.trim() : '';
    };
    plans[li.dataset.plan] = { name: pick('name'), summary: pick('summary'), price: pick('price'), pitch: pick('pitch') };
  });
  const grind = {};
  $$('[data-qa="quiz-option"][data-question="1"]', form).forEach((el) => { grind[el.value] = el.dataset.grind || ''; });
  const names = originNames();

  const template = progress ? progress.dataset.template || progress.textContent : '';
  const answers = {};
  let step = 1;
  const enter = (el) => {
    if (!el || reduce || !canAnimate()) return;
    el.animate([{ opacity: 0, transform: 'translateX(18px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2, .7, .1, 1)' });
  };
  const show = (n, focus) => {
    step = n;
    steps.forEach((s) => {
      const on = Number(s.dataset.step) === n;
      s.hidden = !on;
      s.classList.toggle('is-current', on);
    });
    if (progress) progress.textContent = template.replace('{n}', String(n));
    marks.forEach((el, k) => {
      el.classList.toggle('is-done', k < n - 1);
      el.classList.toggle('is-current', k === n - 1);
    });
    if (back) back.hidden = n === 1;
    next.disabled = !answers[n];
    const current = steps[n - 1];
    if (focus && current) {
      current.focus({ preventScroll: true });
      enter(current);
    }
  };
  const setR = (key, text) => {
    const el = $(`[data-r="${key}"]`, result);
    if (el) el.textContent = text;
  };
  const finish = () => {
    const r = scoreQuiz(answers);
    const plan = plans[r.plan] || {};
    setR('name', plan.name || '');
    setR('summary', plan.summary || '');
    setR('pitch', plan.pitch || '');
    setR('origin', names[r.origin] || '');
    setR('grind', grind[r.grindKey] || '');
    setR('price', plan.price || `$${r.price}`);
    if (stamp) stamp.textContent = plan.name || '';
    result.dataset.plan = r.plan;
    steps.forEach((s) => { s.hidden = true; });
    form.classList.add('is-done');
    result.hidden = false;
    result.focus({ preventScroll: true });
    enter(result);
    if (stamp && !reduce && canAnimate()) {
      stamp.parentElement.animate(
        [{ opacity: 0, transform: 'rotate(-4deg) scale(1.7)' }, { opacity: 0.85, transform: 'rotate(-12deg) scale(1)' }],
        { duration: 420, delay: 250, easing: 'cubic-bezier(.3, 1.4, .5, 1)', fill: 'backwards' },
      );
    }
  };

  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('change', (e) => {
    const input = e.target;
    if (!input || input.type !== 'radio') return;
    const q = Number(input.name.replace(/\D/g, ''));
    answers[q] = input.value;
    if (q === step) next.disabled = false;
  });
  next.addEventListener('click', () => {
    if (!answers[step]) return;
    if (step < steps.length) show(step + 1, true);
    else finish();
  });
  if (back) back.addEventListener('click', () => { if (step > 1) show(step - 1, true); });
  if (restart) {
    restart.addEventListener('click', () => {
      Object.keys(answers).forEach((k) => { delete answers[k]; });
      $$('input[type="radio"]', form).forEach((i) => { i.checked = false; });
      result.hidden = true;
      result.dataset.plan = '';
      form.classList.remove('is-done');
      show(1, true);
    });
  }
  if (subscribe) subscribe.addEventListener('click', () => openModal('modal-subscribe', subscribe));
  show(1, false);
}
