/* Rhumb Line · scene/sound.js
   Sea sound synthesised with Web Audio, no files. It binds itself to the page's controls:
     [data-qa="sound-toggle"]  button, aria-pressed, a [data-sound-state] span showing data-on / data-off
     [data-qa="sound-hint"]    shown (hidden attribute removed) only after the page is entered, until sound starts
   Layers: swell (brown noise breathing with the hull's roll), surf wash, wind, rain, dry sand hiss (dust), wood creaks
   at the ends of a roll, a distant bell buoy (in port), thunder after lightning.
   Rules: the AudioContext is created only inside the first pointerdown / keydown (unless the reader chose Off before),
   it fades up over 4 s to a quiet bed, a hidden tab fades it out, the choice is kept in localStorage['rhumbline.sound'].
   Works without the 3D scene: if nobody drives tick(), a slow built-in swell takes over. */

const KEY = 'rhumbline.sound';
const LEVEL = 0.3;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
function vnoise(x, seed = 0) {
  const h = (n) => { const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}

/* Mix per weather. wave/hiss/wind/rain/grit are layer gains, cut the swell's lowpass, bell the buoy (0/1). */
export const SOUND_MIX = {
  dawn: { wave: 0.42, hiss: 0.10, wind: 0.04, rain: 0, grit: 0, cut: 330, bell: 1 },
  haze: { wave: 0.50, hiss: 0.13, wind: 0.05, rain: 0, grit: 0, cut: 380, bell: 0 },
  sun: { wave: 0.70, hiss: 0.22, wind: 0.06, rain: 0, grit: 0, cut: 460, bell: 0 },
  lowcloud: { wave: 0.64, hiss: 0.18, wind: 0.16, rain: 0, grit: 0, cut: 400, bell: 0 },
  storm: { wave: 1.00, hiss: 0.52, wind: 0.62, rain: 0.50, grit: 0, cut: 660, bell: 0 },
  rain: { wave: 0.72, hiss: 0.24, wind: 0.16, rain: 0.44, grit: 0, cut: 470, bell: 0 },
  dust: { wave: 0.56, hiss: 0.20, wind: 0.46, rain: 0, grit: 0.30, cut: 500, bell: 0 },
  night: { wave: 0.32, hiss: 0.06, wind: 0.03, rain: 0, grit: 0, cut: 250, bell: 0 },
  dusk: { wave: 0.38, hiss: 0.08, wind: 0.04, rain: 0, grit: 0, cut: 310, bell: 1 }
};

export function createSound(opts = {}) {
  const toggle = opts.toggle || document.querySelector('[data-qa="sound-toggle"]');
  const hint = opts.hint || document.querySelector('[data-qa="sound-hint"]');
  const stateEl = toggle && toggle.querySelector('[data-sound-state]');
  let ctx = null, master = null, L = null, on = false, armed = false, suspendT = 0, acc = 0;
  let weather = 'dawn', lastCreak = 0, nextBell = 0, white = null, brown = null, lastTick = 0, ownT = 0, ownRaf = 0;
  const mixNow = Object.assign({}, SOUND_MIX.dawn);
  const pref = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const setPref = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* storage blocked: the choice lasts this visit */ } };
  // Mike (2026-09-15): the sea sound is On by default. Browsers still need a first click, tap or key before audio can play,
  // so `want` is what the button shows and `on` is whether the sound is actually playing.
  let want = pref() !== 'off';

  function buffer(kind) {
    const len = Math.round(ctx.sampleRate * 3), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }
  const node = (type, props) => { const n = ctx[type](); for (const k in props) { if (n[k] instanceof AudioParam) n[k].value = props[k]; else n[k] = props[k]; } return n; };
  const chain = (...nodes) => { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; };
  function loopSrc(buf) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 2.5); return s; }

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { ctx = null; return false; }
    white = buffer('white'); brown = buffer('brown');
    master = node('createGain', { gain: 0 });
    chain(master, node('createDynamicsCompressor', { threshold: -18, ratio: 3 }), ctx.destination);
    L = {
      waveF: node('createBiquadFilter', { type: 'lowpass', frequency: 400, Q: 0.4 }), waveG: node('createGain', { gain: 0 }),
      hissF: node('createBiquadFilter', { type: 'bandpass', frequency: 1400, Q: 0.6 }), hissG: node('createGain', { gain: 0 }),
      windF: node('createBiquadFilter', { type: 'bandpass', frequency: 520, Q: 3 }), windG: node('createGain', { gain: 0 }),
      rainF: node('createBiquadFilter', { type: 'highpass', frequency: 2600, Q: 0.5 }), rainG: node('createGain', { gain: 0 }),
      gritF: node('createBiquadFilter', { type: 'bandpass', frequency: 5200, Q: 0.9 }), gritG: node('createGain', { gain: 0 })
    };
    chain(loopSrc(brown), L.waveF, L.waveG, master);
    chain(loopSrc(white), L.hissF, L.hissG, master);
    chain(loopSrc(white), L.windF, L.windG, master);
    chain(loopSrc(white), L.rainF, L.rainG, master);
    chain(loopSrc(white), L.gritF, L.gritG, master);
    return true;
  }

  function ui() {
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(want));
      if (stateEl) stateEl.textContent = want ? (toggle.dataset.on || 'On') : (toggle.dataset.off || 'Off');
    }
    if (hint) {
      const show = armed && want && !on;
      hint.hidden = !show;
      hint.setAttribute('aria-hidden', String(!show));
    }
  }
  function ramp(to, sec) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(to, now + sec);
  }
  function start(fade = 4) {
    want = true;
    if (!ctx && !build()) { ui(); return; }
    clearTimeout(suspendT);
    on = true;
    const go = () => ramp(document.hidden ? 0 : LEVEL, fade);
    if (ctx.state !== 'running') ctx.resume().then(go, go); else go();
    ensureOwnSwell();
    ui();
  }
  function stop() {
    want = false;
    on = false;
    ui();
    if (!ctx) return;
    ramp(0, 0.5);
    clearTimeout(suspendT);
    suspendT = setTimeout(() => { if (!on) { master.gain.cancelScheduledValues(0); master.gain.value = 0; ctx.suspend(); } }, 800);
  }

  function gesture(e) {
    if (on || !want) return;
    if (ctx && ctx.state === 'running') return;
    if (toggle && e.target && e.target.closest && e.target.closest('[data-qa="sound-toggle"]')) return;
    start(4);
  }
  window.addEventListener('pointerdown', gesture, true);
  window.addEventListener('keydown', gesture, true);
  if (toggle) toggle.addEventListener('click', () => { if (want) { setPref('off'); stop(); } else { setPref('on'); start(2.5); } });
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !on) return;
    if (document.hidden) { ramp(0, 0.6); clearTimeout(suspendT); suspendT = setTimeout(() => { if (document.hidden) ctx.suspend(); }, 700); }
    else { clearTimeout(suspendT); ctx.resume().then(() => ramp(LEVEL, 1.5)); }
  });

  function creak(intensity) {
    if (!on || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime, rough = weather === 'storm' || weather === 'rain';
    if (now - lastCreak < (rough ? 3.2 : 7) || Math.random() > (rough ? 0.8 : 0.45)) return;
    lastCreak = now;
    const dur = 0.45 + Math.random() * 0.8, lvl = 0.05 + 0.12 * clamp(intensity + 0.3, 0, 1);
    const o = node('createOscillator', { type: 'sawtooth' });
    o.frequency.setValueAtTime(14 + Math.random() * 10, now);
    o.frequency.linearRampToValueAtTime(30 + Math.random() * 26, now + dur);
    const g = node('createGain', { gain: 0 });
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(lvl, now + 0.09); g.gain.setValueAtTime(lvl, now + dur * 0.7); g.gain.linearRampToValueAtTime(0, now + dur);
    chain(o, node('createBiquadFilter', { type: 'bandpass', frequency: 500 + Math.random() * 700, Q: 7 }), g, master);
    o.start(now); o.stop(now + dur + 0.05);
  }
  function bell(at) {
    const f0 = 560 * (0.98 + Math.random() * 0.04);
    const out = node('createBiquadFilter', { type: 'lowpass', frequency: 2400 });
    chain(out, node('createGain', { gain: 0.05 }), master);
    [[1, 1, 3.6], [2, 0.45, 2.4], [2.76, 0.32, 1.7], [5.4, 0.12, 0.9], [8.9, 0.05, 0.5]].forEach(([r, a, dec]) => {
      const o = node('createOscillator', { type: 'sine', frequency: f0 * r });
      const g = node('createGain', { gain: 0 });
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(a, at + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, at + dec);
      o.connect(g); g.connect(out);
      o.start(at); o.stop(at + dec + 0.1);
    });
  }
  function thunder(delay, strength = 1) {
    if (!on || !ctx || ctx.state !== 'running') return;
    const at = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = brown; s.loop = true;
    const g = node('createGain', { gain: 0 });
    g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.55 * strength, at + 0.3); g.gain.exponentialRampToValueAtTime(0.001, at + 3.8);
    chain(s, node('createBiquadFilter', { type: 'lowpass', frequency: 170, Q: 0.7 }), g, master);
    s.start(at, Math.random() * 2); s.stop(at + 4);
    const c = ctx.createBufferSource(); c.buffer = white;
    const cg = node('createGain', { gain: 0 });
    cg.gain.setValueAtTime(0, at); cg.gain.linearRampToValueAtTime(0.08 * strength, at + 0.02); cg.gain.exponentialRampToValueAtTime(0.001, at + 0.7);
    chain(c, node('createBiquadFilter', { type: 'lowpass', frequency: 900 }), cg, master);
    c.start(at); c.stop(at + 0.8);
  }

  // Called by the scene every frame; `swell` (0..1) follows the hull's roll so the wash rises as the side dips.
  function tick(dt, swell, time, fromScene = true) {
    if (fromScene) lastTick = performance.now();
    if (!ctx || !on || ctx.state !== 'running') return;
    acc += dt;
    if (acc < 0.1) return;
    const k = 1 - Math.exp(-acc / 0.45);
    acc = 0;
    const target = SOUND_MIX[weather] || SOUND_MIX.dawn;
    for (const key in mixNow) mixNow[key] = lerp(mixNow[key], target[key], k);
    const now = ctx.currentTime, m = mixNow;
    L.waveG.gain.setTargetAtTime(m.wave * (0.3 + 0.7 * swell * swell) * 0.9, now, 0.15);
    L.waveF.frequency.setTargetAtTime(m.cut * (0.75 + 0.5 * swell), now, 0.2);
    L.hissG.gain.setTargetAtTime(m.hiss * Math.pow(swell, 3) * 0.6, now, 0.12);
    L.windG.gain.setTargetAtTime(m.wind * (0.55 + 0.45 * vnoise(time * 0.3, 1)) * 0.5, now, 0.3);
    L.windF.frequency.setTargetAtTime(380 + 620 * vnoise(time * 0.22, 4), now, 0.3);
    L.rainG.gain.setTargetAtTime(m.rain * (0.85 + 0.15 * vnoise(time * 1.4, 9)) * 0.35, now, 0.3);
    L.gritG.gain.setTargetAtTime(m.grit * Math.pow(vnoise(time * 0.7, 13), 2) * 0.28, now, 0.25);
    if (m.bell > 0.5 && now > nextBell) {
      if (nextBell) { bell(now + 0.05); if (Math.random() < 0.6) bell(now + 0.9 + Math.random() * 0.5); }
      nextBell = now + 6 + Math.random() * 6;
    }
  }
  // Without the 3D scene (or while it is paused) the sound keeps its own slow swell.
  function ensureOwnSwell() {
    if (ownRaf) return;
    let last = performance.now();
    const loop = (now) => {
      ownRaf = on ? requestAnimationFrame(loop) : 0;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (now - lastTick < 400) return;
      ownT += dt;
      tick(dt, 0.5 + 0.5 * Math.sin((ownT * Math.PI * 2) / 7.5), ownT, false);
    };
    ownRaf = requestAnimationFrame(loop);
  }

  ui();
  return {
    tick, creak, thunder,
    arm() { armed = true; ui(); },
    setWeather(k) {
      if (!SOUND_MIX[k] || k === weather) return;
      weather = k;
      if ((k === 'dawn' || k === 'dusk') && ctx) nextBell = ctx.currentTime + 1.5;
    },
    state: () => ({ context: ctx ? ctx.state : 'none', gain: master ? master.gain.value : 0, on, weather, pressed: toggle ? toggle.getAttribute('aria-pressed') : null, hintHidden: hint ? hint.hidden : null })
  };
}
