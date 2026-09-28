/* Keeps the cabin smooth on ordinary laptops (no graphics card) and phones. Adapted from pitch-demos/quality.js.
   It guesses a starting step from the GPU's name, then watches real frame times and steps down whenever frames get
   slow. Steps: 0 full · 1 lighter · 2 light · 3 lightest (what each step turns off: tierSettings in cabin.js). It never
   steps back up, so the picture can't flicker between two looks; it never stops the motion either.
   ?q=0..3 in the address forces a step (testing). window.__tier is the current step, window.__gpu the GPU's name. */

export function gpuClass(name) {
  const soft = /SwiftShader|llvmpipe|softpipe|Basic Render|Microsoft Basic/i.test(name);
  const mobile = (navigator.userAgentData && navigator.userAgentData.mobile) || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  // integrated graphics: Intel HD/UHD/Iris, AMD APUs ("Radeon(TM) Graphics", "Vega 8 Graphics"), phone GPUs, Apple
  const integrated = /Intel|UHD|Iris|HD Graphics|Radeon\(TM\) Graphics|Radeon Graphics|Vega \d+ Graphics|Mali|Adreno|PowerVR|Apple GPU|Apple M\d/i.test(name);
  return { soft, mobile: !!mobile, integrated };
}

export function makeGovernor({ name = '', onChange, start } = {}) {
  const q = new URLSearchParams(location.search);
  const forced = q.has('q') && /^[0-3]$/.test(q.get('q')) ? +q.get('q') : null;
  const info = { name, ...gpuClass(name) };
  let tier = forced !== null ? forced : start !== undefined ? start : info.soft ? 3 : info.integrated || info.mobile ? 1 : 0;
  const win = [];
  let settle = 30;                 // frames to ignore after entering or after a change (shader warm-up, new targets)
  let log = [];
  window.__tier = tier; window.__gpu = name;
  const set = (t, why) => {
    t = Math.min(3, t);
    if (t === tier) return;
    log.push({ at: Math.round(performance.now()), from: tier, to: t, why });
    tier = t; window.__tier = tier; win.length = 0; settle = 30;
    if (onChange) onChange(tier);
  };
  return {
    info,
    forced: forced !== null,
    get tier() { return tier; },
    get log() { return log.slice(); },
    // call once per animation frame with the time since the last one, in milliseconds
    tick(ms) {
      if (forced !== null || tier >= 3 || document.hidden) return;
      if (settle > 0) { settle--; return; }
      if (ms > 250) return;         // a tab switch or a debugger pause, not a slow frame
      win.push(ms);
      if (win.length < 30) return;
      const s = [...win].sort((a, b) => a - b), med = s[15], p75 = s[22];
      win.length = 0;
      // below ~25 fps most of the time: two steps lighter; below ~45 fps, or a quarter of frames dropped: one step
      if (med > 40) set(tier + 2, `median ${med.toFixed(1)} ms`);
      else if (med > 22 || p75 > 30) set(tier + 1, `median ${med.toFixed(1)} ms, p75 ${p75.toFixed(1)} ms`);
    },
  };
}
